// Stage 10 harness: replays golden-line.json's scenarios against
// CadetLineDuty and the golden-freemode.json combinations against
// CadetFreeMode, deep-comparing every stream entry and summary.
using System;
using System.Collections.Generic;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotLineCs
{
    static int checks, fails;
    static bool DeepEq(object a, object b, string path)
    {
        if (a == null && b == null) return true;
        if (a == null || b == null) { Console.WriteLine($"  MISMATCH {path}: {(a == null ? "null" : a)} vs {(b == null ? "null" : b)}"); return false; }
        if (a is double da && b is double db) { if (Math.Abs(da - db) > 1e-9 * Math.Max(1, Math.Abs(da))) { Console.WriteLine($"  MISMATCH {path}: {da} vs {db}"); return false; } return true; }
        if (a is string || b is string || a is bool || b is bool)
        {
            if (!a.Equals(b)) { Console.WriteLine($"  MISMATCH {path}: '{a}' vs '{b}'"); return false; }
            return true;
        }
        if (a is Lst la && b is Lst lb)
        {
            if (la.Count != lb.Count) { Console.WriteLine($"  MISMATCH {path}: list len {la.Count} vs {lb.Count}"); return false; }
            bool ok = true; for (int i = 0; i < la.Count; i++) ok &= DeepEq(la[i], lb[i], path + "[" + i + "]");
            return ok;
        }
        if (a is Dict ga && b is Dict gb)
        {
            bool ok = true;
            foreach (var k in ga.Keys) if (!gb.ContainsKey(k)) { Console.WriteLine($"  MISMATCH {path}: missing key {k}"); ok = false; }
            foreach (var k in gb.Keys) if (!ga.ContainsKey(k)) { Console.WriteLine($"  MISMATCH {path}: extra key {k}"); ok = false; }
            foreach (var k in ga.Keys) if (gb.ContainsKey(k)) ok &= DeepEq(ga[k], gb[k], path + "." + k);
            return ok;
        }
        Console.WriteLine($"  MISMATCH {path}: types {a.GetType().Name} vs {b.GetType().Name}"); return false;
    }
    static void Eq(object cs, object js, string what)
    {
        checks++;
        if (!DeepEq(cs, js, what)) { fails++; Console.WriteLine($"FAIL {what}"); }
    }

    static Dict CanonEv(Dict e)
    {
        string type = (string)e["type"];
        if (type == "event")
        {
            var v = (LineEvent)e["event"];
            return new Dict { { "type", "event" }, { "event", new Dict { { "id", v.Id }, { "kind", v.Kind }, { "title", v.Title }, { "situation", v.Situation }, { "choices", v.Choices.ConvertAll(c => (object)c) }, { "correctIndex", (double)v.CorrectIndex }, { "scores", v.Scores.ConvertAll(s => (object)s) }, { "data", v.Data }, { "targetAltFt", v.TargetAltFt.HasValue ? (object)v.TargetAltFt.Value : null }, { "reason", v.Reason } } } };
        }
        if (type == "task")
        {
            var t = (PmTask)e["task"];
            return new Dict { { "type", "task" }, { "task", new Dict { { "id", t.Id }, { "templateId", t.TemplateId }, { "title", t.Title }, { "prompt", t.Prompt }, { "choices", t.Choices.ConvertAll(c => (object)c) }, { "correctIndex", (double)t.CorrectIndex } } } };
        }
        return e;
    }
    static Lst CanonEvs(List<Dict> evs) { var l = new Lst(); foreach (var e in evs) l.Add(CanonEv(e)); return l; }
    static int WrongIndex(IList<string> choices, int correct) { return (correct + 1) % choices.Count; }

    static void FlyPF(Lst stream, Dict cfg)
    {
        double seed = MiniJson.Num(cfg, "seed");
        object captain = cfg.TryGetValue("captain", out var cv) ? cv : null;
        string route = MiniJson.Str(cfg, "route", "HND-KMQ");
        string dispatchAnswer = MiniJson.Str(cfg, "dispatchAnswer", "correct");
        string eventAnswer = MiniJson.Str(cfg, "eventAnswer", "correct");
        string touchdownPos = MiniJson.Str(cfg, "touchdownPos", "direct");
        bool compressFirst = MiniJson.Bool(cfg, "compressFirst");
        var duty = new CadetLineDuty(route, "PF", captain, seed);
        double t = 0;
        void U(Dict obs) { obs["t"] = (t += 10); var evs = duty.Update(obs); stream.Add(new Dict { { "call", "update" }, { "events", CanonEvs(evs) } }); }
        stream.Add(new Dict { { "call", "advance" }, { "r", duty.Advance() } });
        stream.Add(new Dict { { "call", "dispatchCase" }, { "id", duty.DispatchCase.Id } });
        var r = duty.AnswerDispatch(dispatchAnswer == "correct" ? (object)(double)duty.DispatchCase.CorrectIndex : (double)WrongIndex(duty.DispatchCase.Choices, duty.DispatchCase.CorrectIndex));
        stream.Add(new Dict { { "call", "answerDispatch" }, { "r", r } });
        if (r != null && MiniJson.Bool(r, "noGo")) { stream.Add(new Dict { { "call", "summary" }, { "summary", duty.Summary() } }); return; }
        U(new Dict { { "onGround", true }, { "stopped", true }, { "altFt", 36.0 }, { "distDestM", 290000.0 } });
        U(new Dict { { "onGround", false }, { "altFt", 600.0 }, { "ias", 165.0 }, { "vsFpm", 2200.0 }, { "distDestM", 280000.0 } });
        U(new Dict { { "onGround", false }, { "altFt", 12000.0 }, { "ias", 250.0 }, { "vsFpm", 1800.0 }, { "distDestM", 240000.0 } });
        U(new Dict { { "onGround", false }, { "altFt", 24000.0 }, { "ias", 280.0 }, { "mach", 0.74 }, { "vsFpm", 0.0 }, { "distDestM", 200000.0 } });
        if (compressFirst) stream.Add(new Dict { { "call", "compressEarly" }, { "r", duty.Compress() } });
        if (duty.Event != null && duty.EventAnswer == null) stream.Add(new Dict { { "call", "answerEvent" }, { "r", duty.AnswerEvent(eventAnswer == "correct" ? (object)(double)duty.Event.CorrectIndex : (double)WrongIndex(duty.Event.Choices, duty.Event.CorrectIndex)) } });
        U(new Dict { { "onGround", false }, { "altFt", 24000.0 }, { "ias", 280.0 }, { "mach", 0.74 }, { "vsFpm", 0.0 }, { "distDestM", 190000.0 } });
        stream.Add(new Dict { { "call", "compress" }, { "r", duty.Compress() } });
        if (duty.Event != null && duty.EventAnswer == null) stream.Add(new Dict { { "call", "answerEvent" }, { "r", duty.AnswerEvent(eventAnswer == "correct" ? (object)(double)duty.Event.CorrectIndex : (double)WrongIndex(duty.Event.Choices, duty.Event.CorrectIndex)) } });
        U(new Dict { { "onGround", false }, { "altFt", 9000.0 }, { "ias", 250.0 }, { "vsFpm", -1800.0 }, { "distDestM", 90000.0 } });
        U(new Dict { { "onGround", false }, { "altFt", 2000.0 }, { "ias", 150.0 }, { "vsFpm", -750.0 }, { "distDestM", 8000.0 } });
        U(new Dict { { "onGround", false }, { "altFt", 400.0 }, { "ias", 138.0 }, { "vsFpm", -650.0 }, { "distDestM", 1500.0 } });
        var tdObs = new Dict { { "onGround", true }, { "stopped", false } };
        if (touchdownPos == "frame")
        {
            var f = duty.Destination; double h = f.TrueHdg * Math.PI / 180, ac = 350 - f.Len / 2, C = 4;
            tdObs["n"] = f.N + ac * Math.Cos(h) - C * Math.Sin(h); tdObs["e"] = f.E + ac * Math.Sin(h) + C * Math.Cos(h);
        }
        else { tdObs["tdAlongM"] = 350.0; tdObs["tdCrossM"] = 3.0; }
        U(tdObs);
        U(new Dict { { "onGround", true }, { "stopped", true } });
        stream.Add(new Dict { { "call", "summary" }, { "summary", duty.Summary() } });
    }

    static void RidePM(Lst stream, Dict cfg)
    {
        double seed = MiniJson.Num(cfg, "seed");
        object captain = cfg.TryGetValue("captain", out var cv) ? cv : null;
        var duty = new CadetLineDuty("HND-KMQ", "PM", captain, seed);
        double t = 0;
        stream.Add(new Dict { { "call", "advance" }, { "r", duty.Advance() } });
        stream.Add(new Dict { { "call", "dispatchCase" }, { "id", duty.DispatchCase.Id } });
        var r = duty.AnswerDispatch((double)duty.DispatchCase.CorrectIndex);
        stream.Add(new Dict { { "call", "answerDispatch" }, { "r", r } });
        if (r != null && MiniJson.Bool(r, "noGo")) { stream.Add(new Dict { { "call", "summary" }, { "summary", duty.Summary() } }); return; }
        var pattern = new[] { "correct", "wrong", "correct", "correct", "wrong" };
        int guard = 0;
        while (guard++ < 40)
        {
            var obs = new Dict { { "t", (t += 20) }, { "altFt", 24000.0 }, { "ias", 270.0 }, { "mach", 0.74 }, { "headingDeg", 90.0 }, { "vsFpm", 0.0 }, { "distDestM", 150000.0 } };
            var evs = duty.Update(obs);
            stream.Add(new Dict { { "call", "update" }, { "events", CanonEvs(evs) } });
            if (duty.Event != null && duty.EventAnswer == null) stream.Add(new Dict { { "call", "answerEvent" }, { "r", duty.AnswerEvent((double)duty.Event.CorrectIndex) } });
            var task = duty.CurrentTask();
            if (task != null)
            {
                string want = duty.TasksIssued - 1 < pattern.Length ? pattern[duty.TasksIssued - 1] : "correct";
                int idx = want == "correct" ? task.CorrectIndex : WrongIndex(task.Choices, task.CorrectIndex);
                stream.Add(new Dict { { "call", "answerTask" }, { "id", task.Id }, { "r", duty.Answer(task.Id, (double)idx) } });
            }
            if (duty.TasksIssued >= 5 && duty.CurrentTask() == null) break;
        }
        var evs2 = duty.Update(new Dict { { "t", (t += 20) }, { "arrived", true } });
        stream.Add(new Dict { { "call", "update" }, { "events", CanonEvs(evs2) } });
        stream.Add(new Dict { { "call", "summary" }, { "summary", duty.Summary() } });
    }

    public static int Main(string[] args)
    {
        string root = args.Length > 0 ? args[0] : "/home/hatch/workspace/cadet-unity";
        CadetLineData.Load(File.ReadAllText(root + "/data/line.json"), File.ReadAllText(root + "/data/airfields.json"));
        var golden = (Dict)MiniJson.Parse(File.ReadAllText(root + "/flight/test/golden-line.json"));
        foreach (var so in (Lst)golden["scenarios"])
        {
            var sc = (Dict)so; string name = (string)sc["name"]; var cfg = (Dict)sc["cfg"];
            var stream = new Lst();
            if (name.StartsWith("pm-")) RidePM(stream, cfg); else FlyPF(stream, cfg);
            Eq(stream, sc["stream"], "scenario " + name);
        }
        var briefsCs = new Lst();
        foreach (var rid in new[] { "HND-KMQ", "HND-CTS", "HND-FUK", "HND-OKA" }) briefsCs.Add(CadetLineDuty.LineBrief(rid));
        Eq(briefsCs, golden["briefs"], "lineBriefs");

        // ---- free mode ----
        var fg = (Dict)MiniJson.Parse(File.ReadAllText(root + "/flight/test/golden-freemode.json"));
        foreach (var co in (Lst)fg["combos"])
        {
            var combo = (Dict)co; var sel = (Dict)combo["sel"];
            Dict got;
            if (sel.ContainsKey("sim")) got = CadetFreeMode.SimDeviceCfg((Dict)sel["sim"]);
            else got = CadetFreeMode.BuildFreeCfg(sel, 1700000000000);
            Eq(got, combo["cfg"], "freemode combo");
        }
        Console.WriteLine($"BotLineCs: {checks - fails}/{checks} deep comparisons passed");
        return fails == 0 ? 0 : 1;
    }
}
