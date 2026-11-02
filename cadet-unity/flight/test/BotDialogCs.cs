// BotDialogCs.cs — Stage 8 equivalence harness: replays golden-dialog.jsonl
// (produced by the real dialog/engine.js + dialog/validate.js over every
// assembled conversation dataset) through the C# ports and compares the
// validator's error/warning lists and the deterministic walk digests
// (views, hooks, final state) exactly.
using System;
using System.Collections.Generic;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotDialogCs
{
    static string Esc(string s) { return (s ?? "").Replace("\n", "␊"); }

    class HookRec : IDialogHooks
    {
        public readonly List<string> Log = new List<string>();
        public void OnHook(string name, object arg) { Log.Add(name + "=" + MiniJson.Stringify(arg)); }
    }

    static string WalkSet(Dict data, Dict ctx, out List<Dict> walksOut, out List<string> hooksOut, out string stateDigest)
    {
        var hooks = new HookRec();
        var state = DialogEngine.CreateDialogState();
        var runner = new DialogRunner(data, state, () => ctx, hooks);
        var walks = new List<Dict>();
        var dialogs = (Dict)data["dialogs"];
        foreach (var dkv in dialogs)
        {
            string did = dkv.Key;
            var lines = new List<string>();
            var visits = new Dictionary<string, int>();
            try
            {
                if (!runner.Start(did)) lines.Add("(start→end)");
                else
                {
                    for (int step = 0; step < 1000; step++)
                    {
                        var v = runner.View();
                        if (v == null) { lines.Add("(closed)"); break; }
                        string key = v.Dialog + ":" + v.Node;
                        int seen = visits.TryGetValue(key, out var sv) ? sv + 1 : 1;
                        visits[key] = seen;
                        var parts = new List<string> { key, v.Speaker ?? "", Esc(v.Text), "ch=" + string.Join("/", v.Choices.ConvertAll(c => Esc(c.Text))), "ends=" + (v.Ends ? "1" : "0") };
                        if (v.Keys != null) parts.Add("keys=" + string.Join("", v.Keys.ConvertAll(k => k.Key)));
                        if (v.En != null) parts.Add("en=" + Esc(v.En));
                        lines.Add(string.Join("|", parts));
                        if (v.Choices.Count > 0) { if (!runner.Choose((seen - 1) % v.Choices.Count)) { lines.Add("(choose-false)"); break; } }
                        else if (v.Keys != null && v.Keys.Count > 0) { if (!runner.Press(v.Keys[(seen - 1) % v.Keys.Count].Key)) { lines.Add("(press-false)"); break; } }
                        else if (!runner.Next()) { lines.Add("(next-false)"); break; }
                    }
                }
            }
            catch (Exception e) { lines.Add("EXC " + e.Message); }
            var w = new Dict { ["dialog"] = did };
            var ll = new Lst(); foreach (var l in lines) ll.Add(l);
            w["lines"] = ll;
            walks.Add(w);
        }
        walksOut = walks; hooksOut = hooks.Log;
        var flagParts = new List<string>();
        var fk = new List<string>(state.Flags.Keys); fk.Sort();
        foreach (var k in fk) flagParts.Add(k + "=" + MiniJson.Stringify(state.Flags[k]));
        var trustParts = new List<string>();
        var tk = new List<string>(state.Trust.Keys); tk.Sort();
        foreach (var k in tk) trustParts.Add(k + "=" + DialogEngine.JsString(state.Trust[k]));
        stateDigest = string.Join(",", flagParts) + "¦" + string.Join(",", trustParts) + "¦" + string.Join(",", state.Items) + "¦" + state.Seen.Count;
        return null;
    }

    static int Main(string[] args)
    {
        string dataDir = args.Length > 0 ? args[0] : "/home/hatch/workspace/cadet-unity/data";
        string goldenPath = args.Length > 1 ? args[1] : "/home/hatch/workspace/cadet-unity/flight/test/golden-dialog.jsonl";
        var trees = (Dict)MiniJson.Parse(File.ReadAllText(Path.Combine(dataDir, "dialog-trees.json")));
        var extra = (Dict)MiniJson.Parse(File.ReadAllText(Path.Combine(dataDir, "dialog-extra.json")));
        var peopleMod = (Dict)MiniJson.Parse(File.ReadAllText(Path.Combine(dataDir, "dialog-people.json")));
        var sections = new HashSet<string>(); foreach (var s in (Lst)extra["sections"]) sections.Add((string)s);
        var lessons = new HashSet<string>(); foreach (var s in (Lst)extra["lessons"]) lessons.Add((string)s);
        var sampleCtx = (Dict)extra["sampleCtx"];
        var peopleCtx = peopleMod.TryGetValue("SAMPLE_CTX", out var sc) ? (Dict)sc : new Dict();

        var sets = new List<(string Name, Dict Data, Dict Ctx, bool Full)>();
        foreach (var kv in trees)
        {
            if (!(kv.Value is Dict d) || !(d.TryGetValue("dialogs", out var dg) && dg is Dict)) continue;
            sets.Add(("trees/" + kv.Key, d, kv.Key == "people" ? peopleCtx : new Dict(), false));
        }
        foreach (var kv in (Dict)extra["instructor"]) sets.Add(("instructor/" + kv.Key, (Dict)kv.Value, sampleCtx, true));
        foreach (var kv in (Dict)extra["instructorMerged"]) sets.Add(("merged/" + kv.Key, (Dict)kv.Value, sampleCtx, true));

        var golden = new Dictionary<string, Dict>();
        foreach (var line in File.ReadAllLines(goldenPath))
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            var r = (Dict)MiniJson.Parse(line);
            golden[(string)r["set"]] = r;
        }

        int badSets = 0, shown = 0;
        long totalLines = 0;
        foreach (var s in sets)
        {
            if (!golden.TryGetValue(s.Name, out var g)) { Console.WriteLine("MISSING GOLDEN " + s.Name); badSets++; continue; }
            var opts = new DialogValidateOpts { SampleCtx = s.Ctx };
            if (s.Full) { opts.SectionExists = id => sections.Contains(id); opts.LessonExists = id => lessons.Contains(id); }
            var (errors, warnings) = DialogValidate.ValidateDialogs(s.Data, opts);
            WalkSet(s.Data, s.Ctx, out var walks, out var hooks, out var stateDigest);
            var problems = new List<string>();
            CompareList("errors", errors, (Lst)g["errors"], problems);
            CompareList("warnings", warnings, (Lst)g["warnings"], problems);
            // walks
            var gw = (Lst)g["walks"];
            if (gw.Count != walks.Count) problems.Add($"walks count {walks.Count} vs golden {gw.Count}");
            else
            {
                for (int wi = 0; wi < gw.Count; wi++)
                {
                    var gwd = (Dict)gw[wi]; var cwd = walks[wi];
                    var gl = (Lst)gwd["lines"]; var cl = (Lst)cwd["lines"];
                    totalLines += gl.Count;
                    if (gl.Count != cl.Count) { problems.Add($"walk {gwd["dialog"]}: {cl.Count} lines vs golden {gl.Count}"); continue; }
                    for (int li = 0; li < gl.Count; li++)
                        if ((string)gl[li] != (string)cl[li]) { problems.Add($"walk {gwd["dialog"]} line {li}: cs [{cl[li]}] vs js [{gl[li]}]"); break; }
                }
            }
            CompareList("hooks", hooks, (Lst)g["hooks"], problems);
            var gs = (Dict)g["state"];
            string gState = (string)gs["flags"] + "¦" + (string)gs["trust"] + "¦" + (string)gs["items"] + "¦" + ((double)gs["seen"]).ToString("0");
            if (gState != stateDigest) problems.Add($"state: cs [{stateDigest}] vs js [{gState}]");
            if (problems.Count > 0)
            {
                badSets++;
                if (shown < 10) { shown++; Console.WriteLine("SET " + s.Name + ":"); foreach (var p in problems.GetRange(0, Math.Min(3, problems.Count))) Console.WriteLine("  " + p); }
            }
        }
        Console.WriteLine($"dialog cs: {sets.Count - badSets}/{sets.Count} sets match ({totalLines} walk lines)");
        return badSets == 0 ? 0 : 1;
    }

    static void CompareList(string what, List<string> cs, Lst js, List<string> problems)
    {
        if (cs.Count != js.Count) { problems.Add($"{what} count {cs.Count} vs js {js.Count}"); return; }
        for (int i = 0; i < cs.Count; i++)
            if (cs[i] != (string)js[i]) { problems.Add($"{what}[{i}]: cs [{cs[i]}] vs js [{js[i]}]"); return; }
    }
}
