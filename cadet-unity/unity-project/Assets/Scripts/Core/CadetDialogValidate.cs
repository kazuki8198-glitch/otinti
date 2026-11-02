// CadetDialogValidate.cs — the dialogue-data validator, ported line for line
// from dialog/validate.js. Errors are what would break or confuse a
// conversation in the game (a dead end, a missing node, an undeclared flag, a
// textbook section that does not exist, a placeholder the context cannot
// fill); warnings are probably-unintended data. It never throws.
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace Cadet
{
    using Dict = Dictionary<string, object>;
    using Lst = List<object>;

    public class DialogValidateOpts
    {
        public Func<string, bool> SectionExists = _ => true;
        public Func<string, bool> LessonExists = _ => true;
        public Dict SampleCtx = new Dict();
    }

    public static class DialogValidate
    {
        static readonly object Undefined = new object();
        static bool IsObj(object o) { return o is Dict; }
        static bool Own(Dict o, string k) { return o != null && o.ContainsKey(k); }
        static object Get(Dict o, string k) { return o != null && o.TryGetValue(k, out var v) ? v : Undefined; }
        static bool IsFlagValue(object v) { return DialogEngine.IsFlagValue(v); }

        static string Short(object v)
        {
            string s;
            if (ReferenceEquals(v, Undefined)) s = "undefined";
            else if (v is string str) s = str;
            else if (v == null) s = "null";
            else s = MiniJson.Stringify(v);
            return s.Length > 80 ? s.Substring(0, 77) + "…" : s;
        }

        static readonly HashSet<string> NODE_KEYS = new HashSet<string> { "speaker", "text", "if", "else", "effects", "hook", "next", "choices", "end", "en", "tag", "keys" };
        static readonly HashSet<string> KEY_KEYS = new HashSet<string> { "key", "text", "next", "if", "effects" };
        static readonly HashSet<string> CHOICE_KEYS = new HashSet<string> { "text", "next", "if", "effects" };
        static readonly Regex LESSON_PATH = new Regex(@"(^|\.)(lesson\.id|lessonId)$", RegexOptions.ECMAScript);
        static readonly Regex BRACE = new Regex(@"[{}]");
        static readonly Regex KEY_LETTER = new Regex(@"^[A-Z]$", RegexOptions.ECMAScript);

        public static (List<string> Errors, List<string> Warnings) ValidateDialogs(object dataObj, DialogValidateOpts opts = null)
        {
            var errors = new List<string>(); var warnings = new List<string>();
            void Err(string m) { errors.Add(m); }
            void Warn(string m) { warnings.Add(m); }
            if (opts == null) opts = new DialogValidateOpts();
            var sectionExists = opts.SectionExists; var lessonExists = opts.LessonExists; var sampleCtx = opts.SampleCtx ?? new Dict();
            bool Ask(Func<string, bool> fn, string arg) { try { return fn(arg); } catch { return false; } }

            if (!IsObj(dataObj)) { Err("data: not an object"); return (errors, warnings); }
            var data = (Dict)dataObj;
            Dict GetObj(string key, string errMsg)
            {
                if (Get(data, key) is Dict dd) return dd;
                Err(errMsg); return new Dict();
            }
            Lst GetList(string key, string errMsg)
            {
                if (Get(data, key) is Lst ll) return ll;
                Err(errMsg); return new Lst();
            }
            var speakers = GetObj("speakers", "data.speakers: missing");
            var flagList = GetList("flags", "data.flags: missing (declare every flag)");
            var hookList = GetList("hooks", "data.hooks: missing (declare every hook)");
            var dialogs = GetObj("dialogs", "data.dialogs: missing");

            HashSet<string> Names(Lst list)
            {
                var s = new HashSet<string>();
                foreach (var x in list) if (x is string xs && xs != "") s.Add(xs);
                return s;
            }
            var flags = Names(flagList); var hooks = Names(hookList); var read = new HashSet<string>();
            foreach (var (what, list) in new[] { ("flag", flagList), ("hook", hookList) })
            {
                var s = new HashSet<string>();
                foreach (var x in list)
                {
                    if (!(x is string) || (string)x == "") Err($"data.{what}s: \"{Short(x)}\" is not a name");
                    else if ((string)x == "__proto__") Err($"data.{what}s: \"__proto__\" is reserved (a save cannot keep it)");
                    else if (s.Contains((string)x)) Warn($"data.{what}s: \"{x}\" declared twice");
                    if (x is string xs) s.Add(xs);
                }
            }
            foreach (var kv in speakers) if (!(kv.Value is Dict) || !(Get((Dict)kv.Value, "name_ja") is string)) Warn($"speaker {kv.Key}: no name_ja");

            // ---- the parts of a node ----
            void Text(object t, string at)
            {
                if (!(t is string) || ((string)t).Trim() == "") { Err($"{at}: empty text"); return; }
                DialogEngine.Fill(t, sampleCtx, p => Err($"{at}: placeholder {{{p}}} does not resolve in the sample context"));
                if (BRACE.IsMatch(DialogEngine.Fill(t, null))) Warn($"{at}: a brace that is not a {{dotted.name}} placeholder is shown as it is: \"{Short(t)}\"");
            }
            void FlagName(object f, string at, string how)
            {
                if (!(f is string) || (string)f == "") { Err($"{at}: flag {how} without a name"); return; }
                if (!flags.Contains((string)f)) Err($"{at}: flag \"{f}\" is {how} but not declared");
            }
            void Cond(object c, string at)
            {
                if (c == null || ReferenceEquals(c, Undefined)) return;
                var k = DialogEngine.CondKind(c);
                if (k == null) { Err($"{at}: unknown condition {Short(c)}"); return; }
                var cd = (Dict)c;
                switch (k)
                {
                    case "all": case "any":
                        if (!(Get(cd, k) is Lst)) Err($"{at}: {k} needs a list");
                        else { var l = (Lst)cd[k]; for (int i = 0; i < l.Count; i++) Cond(l[i], $"{at} {k}[{i}]"); }
                        break;
                    case "not": if (!Own(cd, "not")) Err($"{at}: not needs a condition"); else Cond(cd["not"], $"{at} not"); break;
                    case "flag":
                        if (Get(cd, "flag") is string fs) read.Add(fs);
                        FlagName(Get(cd, "flag"), at, "read");
                        if (Own(cd, "is") && !IsFlagValue(cd["is"])) Err($"{at}: flag \"{Short(Get(cd, "flag"))}\" is compared with {Short(cd["is"])} (only true/false, a string or a number can match)");
                        break;
                    case "trust":
                        {
                            if (!(Get(cd, "trust") is string) || (string)cd["trust"] == "") Err($"{at}: trust condition without a who");
                            else if (!Own(speakers, (string)cd["trust"])) Warn($"{at}: trust in \"{cd["trust"]}\", who is not a speaker");
                            var n = new List<string>(); foreach (var x in new[] { "gte", "lt" }) if (Own(cd, x)) n.Add(x);
                            bool bad = n.Count == 0; foreach (var x in n) if (!(cd[x] is double) || double.IsNaN((double)cd[x]) || double.IsInfinity((double)cd[x])) bad = true;
                            if (bad) Err($"{at}: trust condition needs gte or lt as a number");
                            break;
                        }
                    case "seen":
                        {
                            string s = Get(cd, "seen") is string ss ? ss : "";
                            int i = s.IndexOf(':');
                            Dict d = null;
                            if (i > 0 && dialogs.TryGetValue(s.Substring(0, i), out var dv)) d = dv as Dict;
                            bool ok = d != null && Get(d, "nodes") is Dict nd && i >= 0 && nd.ContainsKey(s.Substring(i + 1));
                            if (!ok) Err($"{at}: seen \"{Short(Get(cd, "seen"))}\" is not a 'dialog:node' that exists");
                            break;
                        }
                    case "ctx":
                        if (!(Get(cd, "ctx") is string) || (string)cd["ctx"] == "") { Err($"{at}: ctx condition without a path"); break; }
                        if (!Own(cd, "is") && !Own(cd, "exists")) Err($"{at}: ctx condition needs is or exists");
                        if (Own(cd, "is") && cd["is"] != null && (cd["is"] is Dict || cd["is"] is Lst)) Err($"{at}: ctx \"{cd["ctx"]}\" is compared with an object (never equal)");
                        if (Own(cd, "is") && LESSON_PATH.IsMatch((string)cd["ctx"]) && !Ask(lessonExists, DialogEngine.JsString(cd["is"]))) Err($"{at}: lesson \"{Short(cd["is"])}\" does not exist");
                        break;
                }
            }
            void Hook(object name, object arg, string at)
            {
                if (!(name is string) || (string)name == "") { Err($"{at}: hook without a name"); return; }
                if (!hooks.Contains((string)name)) Err($"{at}: hook \"{name}\" is used but not declared");
                if (((string)name == "book" || (string)name == "board") && !(arg is string && Ask(sectionExists, (string)arg)))
                    Err($"{at}: {name} hook: \"{Short(arg)}\" is not a textbook section");
            }
            void Effects(object list, string at)
            {
                if (list == null || ReferenceEquals(list, Undefined)) return;
                if (!(list is Lst)) { Err($"{at}: effects must be a list"); return; }
                var l = (Lst)list;
                for (int idx = 0; idx < l.Count; idx++)
                {
                    var e = l[idx];
                    string w = $"{at} effect {idx + 1}";
                    var ed = e as Dict;
                    switch (DialogEngine.EffectKind(e))
                    {
                        case "set":
                            FlagName(Get(ed, "set"), w, "set");
                            if (Own(ed, "to") && !IsFlagValue(ed["to"])) Err($"{w}: set \"{Short(Get(ed, "set"))}\" to {Short(ed["to"])} (true/false, a string or a number: what a save keeps)");
                            break;
                        case "trust":
                            if (!(Get(ed, "trust") is string) || (string)ed["trust"] == "") Err($"{w}: trust effect without a who");
                            else if (!Own(speakers, (string)ed["trust"])) Warn($"{w}: trust in \"{ed["trust"]}\", who is not a speaker");
                            if (!(Get(ed, "add") is double) || double.IsNaN((double)ed["add"]) || double.IsInfinity((double)ed["add"])) Err($"{w}: trust effect needs add as a number");
                            break;
                        case "give": if (!(Get(ed, "give") is string) || (string)ed["give"] == "") Err($"{w}: give without an item"); break;
                        case "hook": Hook(Get(ed, "hook"), Get(ed, "arg"), w); break;
                        default: Err($"{w}: unknown effect {Short(e)}"); break;
                    }
                }
            }
            void Target(string did, object t, string at, string what)
            {
                if (DialogEngine.ResolveTarget(data, did, ReferenceEquals(t, Undefined) ? null : t) == null)
                    Err($"{at}: {what} \"{Short(t)}\" does not exist (a node of {did}, 'dialog:node' or 'end')");
            }

            // ---- every node ----
            foreach (var dkv in dialogs)
            {
                string did = dkv.Key;
                var d = dkv.Value as Dict;
                if (did.Contains(":")) Err($"dialog \"{did}\": ids must not contain ':' (it separates dialog and node)");
                if (d == null || !(Get(d, "nodes") is Dict)) { Err($"dialog {did}: no nodes"); continue; }
                var nodes = (Dict)d["nodes"];
                var sres = DialogEngine.ResolveTarget(data, did, Get(d, "start"));
                if (sres == null || DialogEngine.IsEnd(sres)) Err($"dialog {did}: start \"{Short(Get(d, "start"))}\" is not a node");
                foreach (var nkv in nodes)
                {
                    string nid = nkv.Key;
                    var n = nkv.Value as Dict;
                    string at = $"{did}:{nid}";
                    try
                    {
                        if (nid == DialogEngine.END) Err($"{at}: \"end\" is reserved and cannot be a node id");
                        if (n == null) { Err($"{at}: not an object"); continue; }
                        foreach (var kk in n.Keys) if (!NODE_KEYS.Contains(kk)) Warn($"{at}: unknown field \"{kk}\"");
                        var spk = Get(n, "speaker");
                        if (!(spk is string sps && sps == "narrator") && !(spk is string && speakers.ContainsKey((string)spk))) Err($"{at}: unknown speaker \"{Short(spk)}\"");
                        Text(Get(n, "text"), at);
                        if (Own(n, "en")) Text(n["en"], $"{at} en");
                        if (Own(n, "tag") && (!(n["tag"] is string) || (string)n["tag"] == "")) Err($"{at}: tag is not a name");
                        Cond(Get(n, "if"), $"{at} if");
                        Effects(Get(n, "effects"), at);
                        if (Own(n, "hook")) { if (n["hook"] is Dict hd) Hook(Get(hd, "name"), Get(hd, "arg"), $"{at} hook"); else Err($"{at}: hook must be {{ name, arg }}"); }
                        if (Own(n, "end") && !(n["end"] is bool && (bool)n["end"])) Err($"{at}: end must be true (or left out)");
                        int ways = (Own(n, "next") ? 1 : 0) + (Own(n, "choices") ? 1 : 0) + ((Get(n, "end") is bool eb && eb) ? 1 : 0);
                        if (ways == 0) Err($"{at}: no way on (needs next, choices or end)");
                        if (ways > 1) Err($"{at}: more than one way on (next, choices and end are exclusive)");
                        if (Own(n, "next")) Target(did, n["next"], at, "next");
                        if (Own(n, "else")) { Target(did, n["else"], at, "else"); if (!Own(n, "if")) Warn($"{at}: else without if is never used"); }
                        if (Own(n, "if") && !Own(n, "else") && !Own(n, "next")) Err($"{at}: an if node needs else or next (where to go when it is skipped)");
                        if (Own(n, "keys"))
                        {
                            if (!(n["keys"] is Lst) || ((Lst)n["keys"]).Count == 0) Err($"{at}: keys must be a list");
                            else
                            {
                                if (!Own(n, "next")) Err($"{at}: keys need a next (the line goes on as well)");
                                var seenK = new HashSet<string>();
                                var kl = (Lst)n["keys"];
                                for (int i = 0; i < kl.Count; i++)
                                {
                                    var kk2 = kl[i] as Dict;
                                    string w = $"{at} key {i + 1}";
                                    if (kk2 == null) { Err($"{w}: not an object"); continue; }
                                    foreach (var fk in kk2.Keys) if (!KEY_KEYS.Contains(fk)) Warn($"{w}: unknown field \"{fk}\"");
                                    var keyv = Get(kk2, "key");
                                    if (!(keyv is string) || !KEY_LETTER.IsMatch((string)keyv) || "EWASD".Contains((string)keyv)) Err($"{w}: key must be a letter A–Z the talk does not use (not E, W, A, S, D)");
                                    else if (seenK.Contains((string)keyv)) Err($"{at}: key {keyv} twice");
                                    else seenK.Add((string)keyv);
                                    Text(Get(kk2, "text"), w); Cond(Get(kk2, "if"), $"{w} if"); Effects(Get(kk2, "effects"), w);
                                    if (!Own(kk2, "next")) Err($"{w}: no next"); else Target(did, kk2["next"], w, "next");
                                }
                            }
                        }
                        if (Own(n, "choices"))
                        {
                            if (!(n["choices"] is Lst)) { Err($"{at}: choices must be a list"); continue; }
                            var cl = (Lst)n["choices"];
                            if (cl.Count == 0 || cl.Count > DialogEngine.CHOICES_MAX) Err($"{at}: {cl.Count} choices (1–{DialogEngine.CHOICES_MAX} can be shown)");
                            var texts = new HashSet<string>();
                            for (int i = 0; i < cl.Count; i++)
                            {
                                var ch = cl[i] as Dict;
                                string w = $"{at} choice {i + 1}";
                                if (ch == null) { Err($"{w}: not an object"); continue; }
                                foreach (var fk in ch.Keys) if (!CHOICE_KEYS.Contains(fk)) Warn($"{w}: unknown field \"{fk}\"");
                                Text(Get(ch, "text"), w);
                                if (Get(ch, "text") is string cts) { if (texts.Contains(cts)) Err($"{at}: duplicate choice text \"{cts}\""); texts.Add(cts); }
                                Cond(Get(ch, "if"), $"{w} if");
                                Effects(Get(ch, "effects"), w);
                                if (!Own(ch, "next")) Err($"{w}: no next"); else Target(did, ch["next"], w, "next");
                            }
                        }
                    }
                    catch (Exception e) { Err($"{at}: could not be checked ({e.Message})"); }
                }
            }

            // ---- reachability ----
            string Key((string Dialog, string Node) p) { return $"{p.Dialog}:{p.Node}"; }
            Dict NodeAt((string Dialog, string Node) p) { return (Dict)((Dict)((Dict)dialogs[p.Dialog])["nodes"])[p.Node]; }
            (List<(string, string)> To, bool Ends) Outs((string Dialog, string Node) p)
            {
                var n = NodeAt(p);
                var ts = new List<object>();
                if (n != null)
                {
                    if (Own(n, "next")) ts.Add(n["next"]);
                    if (Own(n, "else")) ts.Add(n["else"]);
                    if (Get(n, "choices") is Lst cl2) foreach (var ch in cl2) { if (ch is Dict chd && Own(chd, "next")) ts.Add(chd["next"]); }
                    if (Get(n, "keys") is Lst kl2) foreach (var kk in kl2) { if (kk is Dict kkd && Own(kkd, "next")) ts.Add(kkd["next"]); }
                }
                var to = new List<(string, string)>(); bool ends = n != null && Get(n, "end") is bool eb2 && eb2;
                foreach (var t in ts)
                {
                    var r = DialogEngine.ResolveTarget(data, p.Dialog, t);
                    if (r == null) continue;
                    if (DialogEngine.IsEnd(r)) ends = true; else to.Add(r.Value);
                }
                return (to, ends);
            }
            (HashSet<string> Seen, bool Ends) Walk(List<(string Dialog, string Node)> starts)
            {
                var seen = new HashSet<string>(); var queue = new List<(string Dialog, string Node)>(starts);
                foreach (var p in starts) seen.Add(Key(p));
                bool ends = false;
                int qi = 0;
                while (qi < queue.Count)
                {
                    var o = Outs(queue[qi++]);
                    ends = ends || o.Ends;
                    foreach (var q in o.To) if (!seen.Contains(Key(q))) { seen.Add(Key(q)); queue.Add(q); }
                }
                return (seen, ends);
            }
            var starts = new Dictionary<string, (string, string)>();
            foreach (var dkv in dialogs)
            {
                var d = dkv.Value as Dict;
                if (d == null || !(Get(d, "nodes") is Dict)) continue;
                var s = DialogEngine.ResolveTarget(data, dkv.Key, Get(d, "start"));
                if (s != null && !DialogEngine.IsEnd(s)) starts[dkv.Key] = s.Value;
            }
            var all = Walk(new List<(string, string)>(starts.Values));
            foreach (var dkv in dialogs)
            {
                var d = dkv.Value as Dict;
                if (d == null || !(Get(d, "nodes") is Dict)) continue;
                foreach (var nid in ((Dict)d["nodes"]).Keys)
                    if (!all.Seen.Contains($"{dkv.Key}:{nid}")) Err($"{dkv.Key}:{nid}: cannot be reached from any dialog's start");
                if (starts.TryGetValue(dkv.Key, out var st1) && !Walk(new List<(string, string)> { st1 }).Ends)
                    Warn($"dialog {dkv.Key}: no end can be reached (every path loops forever)");
            }
            // skip rings
            (string, string)? SkipTo((string Dialog, string Node) p)
            {
                var n = NodeAt(p);
                if (n == null || !Own(n, "if")) return null;
                var q = DialogEngine.ResolveTarget(data, p.Dialog, Own(n, "else") ? n["else"] : (Own(n, "next") ? n["next"] : null));
                return q != null && !DialogEngine.IsEnd(q) ? q : null;
            }
            var done = new HashSet<string>();
            foreach (var dkv in dialogs)
            {
                var d = dkv.Value as Dict;
                if (d == null || !(Get(d, "nodes") is Dict)) continue;
                foreach (var nid in ((Dict)d["nodes"]).Keys)
                {
                    var path = new List<string>(); var on = new Dictionary<string, int>();
                    (string, string)? q = (dkv.Key, nid);
                    while (q.HasValue && !done.Contains(Key(q.Value)))
                    {
                        string qk = Key(q.Value);
                        if (on.TryGetValue(qk, out int oi))
                        {
                            var ring = string.Join(" → ", path.GetRange(oi, path.Count - oi));
                            Warn($"{qk}: if-nodes skip to each other in a ring ({ring}): all false at once stops the talk after {DialogEngine.MAX_HOPS} skips");
                            break;
                        }
                        on[qk] = path.Count; path.Add(qk);
                        q = SkipTo(q.Value);
                    }
                    foreach (var k2 in path) done.Add(k2);
                }
            }
            foreach (var f in flags) if (!read.Contains(f)) Warn($"flag \"{f}\" is declared but never read");
            return (errors, warnings);
        }
    }
}
