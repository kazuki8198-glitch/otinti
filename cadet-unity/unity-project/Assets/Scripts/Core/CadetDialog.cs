// CadetDialog.cs — the conversation engine, ported line for line from
// dialog/engine.js. The data is the game's dialog graph as MiniJson values
// (Dictionary<string,object> / List<object> / double / string / bool / null);
// the state — flags, trust, items, nodes seen — is kept in the same shape the
// save keeps. A node whose `if` is false is skipped (its `else`, or else its
// `next`, is followed); a chain of skips is capped so bad data cannot hang.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;

namespace Cadet
{
    using Dict = Dictionary<string, object>;
    using Lst = List<object>;

    public interface IDialogHooks { void OnHook(string name, object arg); }

    public class DialogState
    {
        public double V = DialogEngine.SAVE_VERSION;
        public Dict Flags = new Dict();
        public Dictionary<string, double> Trust = new Dictionary<string, double>();
        public List<string> Items = new List<string>();
        public Dictionary<string, bool> Seen = new Dictionary<string, bool>();

        public Dict ToJson()
        {
            var trust = new Dict();
            foreach (var kv in Trust) trust[kv.Key] = kv.Value;
            var seen = new Dict();
            foreach (var kv in Seen) seen[kv.Key] = kv.Value;
            var items = new Lst();
            foreach (var it in Items) items.Add(it);
            return new Dict { ["v"] = V, ["flags"] = new Dict(Flags), ["trust"] = trust, ["items"] = items, ["seen"] = seen };
        }
    }

    public class DialogView
    {
        public string Dialog, Node, Speaker, Name, Color, Text, En, Tag;
        public List<(int I, string Text)> Choices = new List<(int, string)>();
        public List<(string Key, string Text)> Keys;   // null when the node has no keys field
        public bool Ends;
    }

    public static class DialogEngine
    {
        public const double SAVE_VERSION = 1;
        public const double TRUST_START = 50;
        public const int MAX_HOPS = 64;
        public const string END = "end";
        public const int CHOICES_MAX = 12;

        static bool IsObj(object o) { return o is Dict; }
        static bool Own(Dict o, string k) { return o != null && o.ContainsKey(k); }
        static double ClampTrust(double t) { return Math.Min(100, Math.Max(0, t)); }
        public static bool IsFlagValue(object v) { return v is bool || v is string || (v is double && !double.IsNaN((double)v) && !double.IsInfinity((double)v)); }

        // the value at a dotted path ('lesson.title', 'lesson.brief.0'); null when a step is missing
        public static object GetPath(object obj, string path)
        {
            object v = obj;
            foreach (var k in (path ?? "").Split('.'))
            {
                if (v is Dict d)
                {
                    if (!d.TryGetValue(k, out v)) return null;
                }
                else if (v is Lst l)
                {
                    int idx;
                    if (!int.TryParse(k, NumberStyles.None, CultureInfo.InvariantCulture, out idx) || idx < 0 || idx >= l.Count) return null;
                    v = l[idx];
                }
                else return null;
            }
            return v;
        }

        static readonly Regex Placeholder = new Regex(@"\{([A-Za-z_$][\w$]*(?:\.[\w$]+)*)\}", RegexOptions.Compiled | RegexOptions.ECMAScript);

        public static string JsString(object v)
        {
            if (v is string s) return s;
            if (v is bool b) return b ? "true" : "false";
            if (v is double n)
            {
                if (n == Math.Floor(n) && Math.Abs(n) < 1e15) return ((long)n).ToString(CultureInfo.InvariantCulture);
                return n.ToString("R", CultureInfo.InvariantCulture);
            }
            return "";
        }

        // '{lesson.title}' → the string, number or boolean at that path in ctx; anything else → '' and onMissing(path)
        public static string Fill(object text, object ctx, Action<string> onMissing = null)
        {
            string t = text as string ?? "";
            return Placeholder.Replace(t, m =>
            {
                string path = m.Groups[1].Value;
                var v = GetPath(ctx, path);
                if (v is string || v is double || v is bool) return JsString(v);
                if (onMissing != null) onMissing(path);
                return "";
            });
        }

        // ---- state ----
        public static bool IsDialogState(object o)
        {
            var d = o as Dict;
            return d != null && Own(d, "v") && d["v"] is double && (double)d["v"] == SAVE_VERSION
                && (!Own(d, "flags") || IsObj(d["flags"])) && (!Own(d, "trust") || IsObj(d["trust"]))
                && (!Own(d, "items") || d["items"] is Lst) && (!Own(d, "seen") || IsObj(d["seen"]));
        }

        public static DialogState CreateDialogState(object saved = null)
        {
            var s = new DialogState();
            if (!IsDialogState(saved)) return s;
            var d = (Dict)saved;
            if (Own(d, "flags")) foreach (var kv in (Dict)d["flags"])
                { if (kv.Key != "__proto__" && IsFlagValue(kv.Value)) s.Flags[kv.Key] = kv.Value; }
            if (Own(d, "trust")) foreach (var kv in (Dict)d["trust"])
                { if (kv.Key != "__proto__" && kv.Value is double && !double.IsNaN((double)kv.Value) && !double.IsInfinity((double)kv.Value)) s.Trust[kv.Key] = ClampTrust((double)kv.Value); }
            if (Own(d, "items")) foreach (var it in (Lst)d["items"])
                { if (it is string str && !s.Items.Contains(str)) s.Items.Add(str); }
            if (Own(d, "seen")) foreach (var kv in (Dict)d["seen"])
                { if (kv.Key != "__proto__" && Truthy(kv.Value)) s.Seen[kv.Key] = true; }
            return s;
        }

        public static bool Truthy(object v)
        {
            if (v == null) return false;
            if (v is bool b) return b;
            if (v is double n) return n != 0 && !double.IsNaN(n);
            if (v is string s) return s.Length > 0;
            return true;
        }

        public static double TrustOf(DialogState state, string who)
        {
            double t;
            return state != null && who != null && state.Trust.TryGetValue(who, out t) ? t : TRUST_START;
        }

        // ---- conditions and effects ----
        static readonly string[] COND_KINDS = { "all", "any", "not", "flag", "trust", "seen", "ctx" };
        static readonly string[] EFFECT_KINDS = { "set", "trust", "give", "hook" };
        public static string CondKind(object c)
        {
            var d = c as Dict; if (d == null) return null;
            string found = null; int n = 0;
            foreach (var k in COND_KINDS) if (d.ContainsKey(k)) { found = k; n++; }
            return n == 1 ? found : null;
        }
        public static string EffectKind(object e)
        {
            var d = e as Dict; if (d == null) return null;
            string found = null; int n = 0;
            foreach (var k in EFFECT_KINDS) if (d.ContainsKey(k)) { found = k; n++; }
            return n == 1 ? found : null;
        }

        static bool StrictEq(object a, object b)
        {
            if (a == null || b == null) return a == b;
            if (a is double && b is double) return (double)a == (double)b;
            if (a is bool && b is bool) return (bool)a == (bool)b;
            if (a is string && b is string) return (string)a == (string)b;
            return false;
        }

        public static bool EvalCond(object cond, DialogState state, object ctx)
        {
            if (cond == null) return true;
            var c = cond as Dict;
            switch (CondKind(cond))
            {
                case "all": if (c["all"] is Lst all) { foreach (var x in all) if (!EvalCond(x, state, ctx)) return false; return true; } break;
                case "any": if (c["any"] is Lst any) { foreach (var x in any) if (EvalCond(x, state, ctx)) return true; return false; } break;
                case "not": if (c.ContainsKey("not")) return !EvalCond(c["not"], state, ctx); break;
                case "flag":
                    {
                        object v = null; bool has = false;
                        if (state != null && c["flag"] is string fn && state.Flags.TryGetValue(fn, out v)) has = true;
                        if (c.ContainsKey("is")) return StrictEq(has ? v : false, c["is"]);
                        return has && Truthy(v);
                    }
                case "trust":
                    {
                        if (!c.ContainsKey("gte") && !c.ContainsKey("lt")) break;
                        double t = TrustOf(state, c["trust"] as string);
                        return (!c.ContainsKey("gte") || t >= (double)c["gte"]) && (!c.ContainsKey("lt") || t < (double)c["lt"]);
                    }
                case "seen":
                    {
                        bool sv;
                        return state != null && c["seen"] is string sn && state.Seen.TryGetValue(sn, out sv) && sv;
                    }
                case "ctx":
                    {
                        var v = GetPath(ctx, c["ctx"] as string);
                        if (c.ContainsKey("exists")) return (v != null) == Truthy(c["exists"]);
                        if (c.ContainsKey("is")) return StrictEq(v, c["is"]);
                        break;
                    }
            }
            throw new Exception($"dialog: unknown condition {MiniJson.Stringify(cond)}");
        }

        static void CallHook(IDialogHooks hooks, string name, object arg)
        {
            if (hooks == null) return;
            try { hooks.OnHook(name, arg); } catch { /* a broken gesture must not stop the talk */ }
        }

        public static DialogState ApplyEffects(object effects, DialogState state, IDialogHooks hooks = null)
        {
            if (effects == null) return state;
            var list = effects as Lst ?? new Lst { effects };
            foreach (var e in list)
            {
                var d = e as Dict;
                switch (EffectKind(e))
                {
                    case "set":
                        {
                            var to = d.ContainsKey("to") ? d["to"] : (object)true;
                            if (!(d["set"] is string) || (string)d["set"] == "" || (string)d["set"] == "__proto__" || !IsFlagValue(to))
                                throw new Exception($"dialog: bad set effect: {MiniJson.Stringify(e)}");
                            state.Flags[(string)d["set"]] = to;
                            break;
                        }
                    case "trust":
                        if (!(d["add"] is double) || double.IsNaN((double)d["add"]) || double.IsInfinity((double)d["add"]))
                            throw new Exception($"dialog: trust effect without a number: {MiniJson.Stringify(e)}");
                        state.Trust[(string)d["trust"]] = ClampTrust(TrustOf(state, (string)d["trust"]) + (double)d["add"]);
                        break;
                    case "give":
                        if (!(d["give"] is string) || (string)d["give"] == "")
                            throw new Exception($"dialog: give without an item name: {MiniJson.Stringify(e)}");
                        if (!state.Items.Contains((string)d["give"])) state.Items.Add((string)d["give"]);
                        break;
                    case "hook": CallHook(hooks, d["hook"] as string, d.ContainsKey("arg") ? d["arg"] : null); break;
                    default: throw new Exception($"dialog: unknown effect {MiniJson.Stringify(e)}");
                }
            }
            return state;
        }

        // ---- targets ----
        // END, a node of the same dialog, or another dialog's node as 'dialog:node' → "END" | (dialog, node) | null
        public static (string Dialog, string Node)? ResolveTarget(Dict data, string dialogId, object target)
        {
            if (target is string ts && ts == END) return (END, null);
            if (!(target is string) || (string)target == "" || data == null || !IsObj(Get(data, "dialogs"))) return null;
            var dialogs = (Dict)data["dialogs"];
            Dict d = dialogs.TryGetValue(dialogId, out var dv) ? dv as Dict : null;
            if (d != null && IsObj(Get(d, "nodes")) && ((Dict)d["nodes"]).ContainsKey((string)target)) return (dialogId, (string)target);
            string t = (string)target;
            int i = t.IndexOf(':');
            if (i > 0)
            {
                string dd = t.Substring(0, i), n = t.Substring(i + 1);
                Dict o = dialogs.TryGetValue(dd, out var ov) ? ov as Dict : null;
                if (o != null && IsObj(Get(o, "nodes")) && ((Dict)o["nodes"]).ContainsKey(n)) return (dd, n);
            }
            return null;
        }
        public static bool IsEnd((string Dialog, string Node)? p) { return p.HasValue && p.Value.Dialog == END; }
        public static object Get(Dict d, string k) { object v; return d != null && d.TryGetValue(k, out v) ? v : null; }
    }

    // ---- the runner ----
    public class DialogRunner
    {
        readonly Dict data;
        readonly DialogState st;
        readonly Func<Dict> getCtx;
        readonly IDialogHooks hooks;
        readonly HashSet<Action<DialogView>> fns = new HashSet<Action<DialogView>>();
        (string Dialog, string Node)? cur;
        bool quiet = true;

        public DialogRunner(Dict data, DialogState state = null, Func<Dict> ctx = null, IDialogHooks hooks = null)
        {
            if (data == null || !(DialogEngine.Get(data, "dialogs") is Dict)) throw new Exception("dialog: createRunner needs data with dialogs");
            this.data = data;
            st = state ?? DialogEngine.CreateDialogState();
            getCtx = ctx ?? (() => new Dict());
            this.hooks = hooks;
        }

        public bool Running { get { return cur.HasValue; } }
        public DialogState State { get { return st; } }

        Dict NodeOf((string Dialog, string Node) p)
        {
            return (Dict)((Dict)((Dict)data["dialogs"])[p.Dialog])["nodes"];
        }
        Dict NodeAt((string Dialog, string Node) p) { return (Dict)NodeOf(p)[p.Node]; }

        Lst Visible(Dict n)
        {
            var outp = new Lst();
            if (n.TryGetValue("choices", out var ch) && ch is Lst l)
                foreach (var c in l) { var cd = c as Dict; if (DialogEngine.EvalCond(cd != null && cd.TryGetValue("if", out var iff) ? iff : null, st, getCtx())) outp.Add(c); }
            return outp;
        }
        Lst KeysOf(Dict n)
        {
            var outp = new Lst();
            if (n.TryGetValue("keys", out var ch) && ch is Lst l)
                foreach (var c in l) { var cd = c as Dict; if (DialogEngine.EvalCond(cd != null && cd.TryGetValue("if", out var iff) ? iff : null, st, getCtx())) outp.Add(c); }
            return outp;
        }

        (string Dialog, string Node)? Settle(string from, object target, string why)
        {
            var p = DialogEngine.ResolveTarget(data, from, target);
            for (int hops = 0; ; )
            {
                if (DialogEngine.IsEnd(p)) return p;
                if (!p.HasValue) throw new Exception($"dialog: {why} leads to \"{target}\", which does not exist");
                var n = NodeAt(p.Value);
                if (DialogEngine.EvalCond(n.TryGetValue("if", out var iff) ? iff : null, st, getCtx())) return p;
                if (++hops > DialogEngine.MAX_HOPS) throw new Exception($"dialog: more than {DialogEngine.MAX_HOPS} skipped nodes in a row near {p.Value.Dialog}:{p.Value.Node} (a loop of if → next?)");
                object t = n.TryGetValue("else", out var els) ? els : (n.TryGetValue("next", out var nxt) ? nxt : null);
                if (!n.ContainsKey("else") && !n.ContainsKey("next")) throw new Exception($"dialog: {p.Value.Dialog}:{p.Value.Node} is skipped but has neither else nor next");
                why = $"{p.Value.Dialog}:{p.Value.Node}"; target = t; p = DialogEngine.ResolveTarget(data, p.Value.Dialog, t);
            }
        }

        void Emit()
        {
            var v = View();
            if (v == null && quiet) return;
            quiet = v == null;
            foreach (var f in new List<Action<DialogView>>(fns)) { try { f(v); } catch { } }
        }
        void Show((string Dialog, string Node) p)
        {
            cur = p;
            var n = NodeAt(p);
            st.Seen[$"{p.Dialog}:{p.Node}"] = true;
            DialogEngine.ApplyEffects(n.TryGetValue("effects", out var eff) ? eff : null, st, hooks);
            if (n.TryGetValue("hook", out var hk) && hk is Dict hd)
                DialogHooksCall(hd);
        }
        void DialogHooksCall(Dict hd)
        {
            if (hooks == null) return;
            try { hooks.OnHook(hd.TryGetValue("name", out var nm) ? nm as string : null, hd.TryGetValue("arg", out var ag) ? ag : null); } catch { }
        }
        void Finish() { cur = null; Emit(); }
        void Step(Action fn)
        {
            try { fn(); Emit(); } catch { cur = null; Emit(); throw; }
        }
        void Go(string from, object target, string why)
        {
            var p = Settle(from, target, why);
            if (DialogEngine.IsEnd(p)) cur = null; else Show(p.Value);
        }

        public DialogView View()
        {
            if (!cur.HasValue) return null;
            var n = NodeAt(cur.Value);
            var c = getCtx();
            Dict sp = null;
            if (data.TryGetValue("speakers", out var sps) && sps is Dict spd && n.TryGetValue("speaker", out var spk) && spk is string spks && spd.TryGetValue(spks, out var spv)) sp = spv as Dict;
            var choices = new List<(int, string)>();
            var vis = Visible(n);
            for (int i = 0; i < vis.Count; i++) choices.Add((i, DialogEngine.Fill(((Dict)vis[i]).TryGetValue("text", out var txx) ? txx : null, c)));
            bool ends = true;
            if (n.ContainsKey("choices") && n["choices"] is Lst) ends = choices.Count == 0;
            else if (!(n.TryGetValue("end", out var ev) && ev is bool eb && eb) && n.ContainsKey("next"))
            { try { ends = DialogEngine.IsEnd(Settle(cur.Value.Dialog, n["next"], "")); } catch { ends = false; } }
            var view = new DialogView
            {
                Dialog = cur.Value.Dialog,
                Node = cur.Value.Node,
                Speaker = n.TryGetValue("speaker", out var sp2) ? sp2 as string : null,
                Name = sp != null && sp.TryGetValue("name_ja", out var nm) ? nm as string ?? "" : "",
                Color = sp != null && sp.TryGetValue("color", out var cl) ? cl as string : null,
                Text = DialogEngine.Fill(n.TryGetValue("text", out var tx) ? tx : null, c),
                Choices = choices,
                Ends = ends,
            };
            if (n.ContainsKey("keys") && n["keys"] is Lst)
            {
                view.Keys = new List<(string, string)>();
                foreach (var k in KeysOf(n)) { var kd = (Dict)k; view.Keys.Add((kd.TryGetValue("key", out var kk) ? kk as string : null, DialogEngine.Fill(kd.TryGetValue("text", out var kt) ? kt : null, c))); }
            }
            if (n.ContainsKey("en")) view.En = DialogEngine.Fill(n["en"], c);
            if (n.ContainsKey("tag")) view.Tag = n["tag"] as string;
            return view;
        }

        public bool Start(string dialogId, string nodeId = null)
        {
            var dialogs = (Dict)data["dialogs"];
            if (!dialogs.ContainsKey(dialogId)) throw new Exception($"dialog: unknown dialog \"{dialogId}\"");
            (string Dialog, string Node)? p;
            try
            {
                var d = (Dict)dialogs[dialogId];
                object startT = nodeId ?? (d.TryGetValue("start", out var sv) ? sv : null);
                p = Settle(dialogId, startT, $"the start of {dialogId}");
            }
            catch { Finish(); throw; }
            if (DialogEngine.IsEnd(p)) { Finish(); return false; }
            Step(() => Show(p.Value));
            return cur.HasValue;
        }

        public bool Next()
        {
            if (!cur.HasValue) return false;
            var n = NodeAt(cur.Value);
            string at = $"{cur.Value.Dialog}:{cur.Value.Node}";
            if (Visible(n).Count > 0) return false;
            if ((n.TryGetValue("end", out var ev) && ev is bool eb && eb) || !n.ContainsKey("next")) { Finish(); return true; }
            var from = cur.Value.Dialog; var target = n["next"];
            Step(() => Go(from, target, at));
            return true;
        }

        public bool Choose(int i)
        {
            if (!cur.HasValue) return false;
            var vis = Visible(NodeAt(cur.Value));
            if (i < 0 || i >= vis.Count) return false;
            var ch = (Dict)vis[i];
            string from = cur.Value.Dialog, at = $"{cur.Value.Dialog}:{cur.Value.Node} (choice {i + 1})";
            Step(() =>
            {
                DialogEngine.ApplyEffects(ch.TryGetValue("effects", out var eff) ? eff : null, st, hooks);
                Go(from, ch.TryGetValue("next", out var nx) ? nx : null, at);
            });
            return true;
        }

        public bool Press(string key)
        {
            if (!cur.HasValue) return false;
            var n = NodeAt(cur.Value);
            Dict found = null;
            foreach (var k in KeysOf(n)) { var kd = (Dict)k; if (kd.TryGetValue("key", out var kk) && kk as string == key) { found = kd; break; } }
            if (found == null || Visible(n).Count > 0) return false;
            string from = cur.Value.Dialog, at = $"{cur.Value.Dialog}:{cur.Value.Node} (key {key})";
            Step(() =>
            {
                DialogEngine.ApplyEffects(found.TryGetValue("effects", out var eff) ? eff : null, st, hooks);
                Go(from, found.TryGetValue("next", out var nx) ? nx : null, at);
            });
            return true;
        }

        public void Stop() { Finish(); }
        public Action OnChange(Action<DialogView> fn) { fns.Add(fn); return () => fns.Remove(fn); }
    }
}
