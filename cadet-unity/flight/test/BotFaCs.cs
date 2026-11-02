// C# mirror of bot-fa.mjs — failures + analysis + recorder equivalence.
// Reads samples-fa.json (produced by the JS driver) and emits
// digest-fa-cs.jsonl with the same shapes.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotFaCs
{
    static readonly List<string> Lines = new List<string>();
    static string S(object o) { return MiniJson.Stringify(o); }
    static void Emit(Dict d) { Lines.Add(S(d)); }
    static Dict D(params object[] kv) { var d = new Dict(); for (int i = 0; i < kv.Length; i += 2) d[(string)kv[i]] = kv[i + 1]; return d; }

    static Dict RfObj(Failures.RandomFailure rf)
    {
        if (rf == null) return null;
        var tr = new Dict { { "type", rf.Trigger.Type } };
        if (rf.Trigger.AfterMin != null) tr["afterMin"] = rf.Trigger.AfterMin.Value;
        if (rf.Trigger.AtAltFt != null) tr["atAltFt"] = rf.Trigger.AtAltFt.Value;
        return D("kind", rf.Kind, "prob", rf.Prob, "trigger", tr);
    }
    static Dict SchedObj(Failures.Schedule sc)
    {
        if (sc == null) return null;
        return D("kind", sc.Kind, "atMin", sc.AtMin != null ? (object)sc.AtMin.Value : null, "atAltFt", sc.AtAltFt != null ? (object)sc.AtAltFt.Value : null);
    }
    static Dict HookObj(Failures.PreflightHook h)
    {
        var d = D("hook", h.Hook, "via", h.Via);
        if (h.FailKind != null) d["failKind"] = h.FailKind;
        if (h.OilQ != null) d["oilQ"] = h.OilQ.Value;
        return d;
    }

    public static int Main()
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        // ---- failures ----
        foreach (var mode in new[] { "career", "free" }) foreach (var ac in new[] { "pa28", "pa44", "b737" }) foreach (var lesson in new[] { "", "a1", "i5", "t2" })
            for (int seed = 1; seed <= 12; seed++) foreach (var day in new[] { 1, 3, 8, 15, 22, 40 })
                Emit(D("tag", "rf", "seed", (double)seed, "day", (double)day, "mode", mode, "ac", ac, "lesson", lesson,
                    "rf", RfObj(Failures.RandomFailureFor(seed, day, "flight", false, false, false, ac, lesson, mode))));
        Emit(D("tag", "rf2", "x", RfObj(Failures.RandomFailureFor(3, 5, "ground", mode: "career"))));
        Emit(D("tag", "rf3", "x", RfObj(Failures.RandomFailureFor(3, 5, "flight", exam: true))));
        Emit(D("tag", "rf4", "x", RfObj(Failures.RandomFailureFor(3, 5, "flight", firstLesson: true))));
        Emit(D("tag", "rf5", "x", RfObj(Failures.RandomFailureFor(3, 5, "flight", mode: "weird"))));
        foreach (var n in new[] { 0.0, 1, 2, 3, 7, -2, 1.5 }) Emit(D("tag", "pjb", "n", n, "v", Failures.PreflightJudgeBase(n)));
        foreach (var pair in new[] { new[] { "task", "pitot" }, new[] { "task", "lock" }, new[] { "task", "zzz" }, new[] { "defect", "pitotBlock" }, new[] { "defect", "static" }, new[] { "defect", "oil" }, new[] { "defect", "cap" }, new[] { "x", "y" } })
            Emit(D("tag", "hook", "src", pair[0], "item", pair[1], "h", HookObj(Failures.PreflightHookFor(pair[0], pair[1]))));
        {
            var dList = new Lst { Failures.FailureDue(new Failures.Schedule { Kind = "mag", AtMin = 5 }, 4.9, 0), Failures.FailureDue(new Failures.Schedule { Kind = "mag", AtMin = 5 }, 5, 0), Failures.FailureDue(new Failures.Schedule { Kind = "gear", AtAltFt = 800 }, 0, 900), Failures.FailureDue(new Failures.Schedule { Kind = "gear" }, 0, 0) };
            var eList = new Lst(); foreach (var sc in Failures.DueSchedule(new List<Failures.Schedule> { new Failures.Schedule { Kind = "mag", AtMin = 5 }, new Failures.Schedule { Kind = "gear", AtAltFt = 800 }, new Failures.Schedule { Kind = "pump" } }, 3, 900)) eList.Add(sc.Kind);
            Emit(D("tag", "sched", "a", SchedObj(Failures.MakeSchedule("mag", 5)), "b", SchedObj(Failures.MakeSchedule("zzz", 5)), "c", SchedObj(Failures.MakeSchedule("gear")), "d", dList, "e", eList));
        }
        Emit(D("tag", "schedOf",
            "a", SchedObj(Failures.ScheduleOf(new Failures.RandomFailure { Kind = "engine", Trigger = new Failures.FailTrigger { Type = "atAltFt", AtAltFt = 2000 } })),
            "b", SchedObj(Failures.ScheduleOf(new Failures.RandomFailure { Kind = "mag", Trigger = new Failures.FailTrigger { Type = "runup" } })),
            "c", SchedObj(Failures.ScheduleOf(new Failures.RandomFailure { Kind = "carb", Trigger = new Failures.FailTrigger { Type = "afterMin", AfterMin = 12 } })),
            "d", SchedObj(Failures.ScheduleOf(null))));

        // ---- analysis on the shared samples ----
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        string samplesPath = File.Exists("samples-fa.json") ? "samples-fa.json" : Path.Combine(dir, "samples-fa.json");
        var recObj = MiniJson.Parse(File.ReadAllText(samplesPath)) as Dict;
        var rec = new Recording();
        rec.Meta = Js.Obj(Js.Get(recObj, "meta")) ?? new Dict();
        foreach (var s0 in Js.Arr(Js.Get(recObj, "samples")))
        {
            var sd = Js.Obj(s0);
            var q = Js.Arr(Js.Get(sd, "q"));
            rec.Samples.Add(new RecSample
            {
                T = Js.Num(sd, "t"), N = Js.Num(sd, "n"), E = Js.Num(sd, "e"), H = Js.Num(sd, "h"),
                Q = new[] { (double)q[0], (double)q[1], (double)q[2], (double)q[3] },
                Ias = Js.Num(sd, "ias"), Gs = Js.Num(sd, "gs"), Vs = Js.Num(sd, "vs"), Alt = Js.Num(sd, "alt"),
                PIn = Js.Num(sd, "pIn"), RIn = Js.Num(sd, "rIn"), Rud = Js.Num(sd, "rud"), Thr = Js.Num(sd, "thr"),
                Gear = Js.Num(sd, "gear"), Flap = Js.Num(sd, "flap"), OnGround = Js.Bool(sd, "onGround"), Rpm = Js.Num(sd, "rpm"), Failed = Js.Bool(sd, "failed"),
            });
        }
        var opts = new Analysis.GateOpts { Vref = 70, FlapMinDeg = 25, GearRequired = true };
        var a = Analysis.AnalyzeRecording(rec, opts);
        Emit(D("tag", "ana", "a", AnaObj(a)));
        Emit(D("tag", "rows", "rows", RowsObj(Analysis.AnalysisRows(a))));
        Emit(D("tag", "compact", "c", Analysis.CompactAnalysis(a)));
        Emit(D("tag", "clean", "c", Analysis.CleanAnalysis(D(
            "td", D("along", 350.24, "cross", -3.33, "sink", 180.9, "float", 120.4, "zone", 1.0),
            "gate", D("stable", 1.0, "ias", 71.26, "gp", 3.14, "vs", -512.8),
            "man", new Lst { D("name", "直線水平（保持）", "score", 0.876), D("name", "", "score", 0.5) }))));
        Emit(D("tag", "clean2", "c", Analysis.CleanAnalysis(null), "d", Analysis.CleanAnalysis(D("td", new Dict(), "gate", null, "man", new Lst()))));
        var compact = Analysis.CompactAnalysis(a);
        var entries = new List<Dict> { D("date", "2026-11-01", "lessons", new Lst {
            D("id", "t2", "ana", compact), D("id", "a1"),
            D("id", "t3", "ana", D("td", D("along", 900.0, "cross", 8.0, "sink", 350.0, "float", 300.0, "zone", false), "gate", D("stable", false))) }) };
        var hist = Analysis.LandingHistory(entries);
        Emit(D("tag", "hist", "h", HistObj(hist), "s", StatsObj(Analysis.LandingStats(hist))));
        Emit(D("tag", "spark", "a", Analysis.Sparkline(new List<double> { 1, 2, 3, 4, 5 }), "b", Analysis.Sparkline(new List<double> { 5, 4, 3, 2, 1 }, true), "c", Analysis.Sparkline(new List<double>())));
        var ser = Analysis.SeriesOf(rec, 60);
        Emit(D("tag", "series", "s", ser == null ? null : D("t", LstOf(ser.T), "alt", LstOf(ser.Alt), "ias", LstOf(ser.Ias), "dur", ser.Dur)));
        var td = Analysis.TouchdownOf(rec, a);
        Emit(D("tag", "tdprof", "p", td == null ? null : D("dt", LstOf(td.Dt), "agl", LstOf(td.Agl), "ias", LstOf(td.Ias), "tdAt", td.TdAt, "gateDt", td.GateDt != null ? (object)td.GateDt.Value : null, "sinkFpm", (double)td.SinkFpm, "along", (double)td.Along, "floatM", td.FloatM != null ? (object)td.FloatM.Value : null)));
        var sc2 = Analysis.ScaleLine(new List<double> { 0, 5, 10 }, 100, 50);
        var pts = new Lst(); foreach (var p in sc2.Pts) pts.Add(new Lst { p.x, p.y });
        Emit(D("tag", "scale", "s", D("pts", pts, "min", sc2.Min, "max", sc2.Max)));
        string csv = Recorder.ToCSV(rec);
        Emit(D("tag", "csv", "csv", csv.Length > 400 ? csv.Substring(0, 400) : csv));
        string gpx = Recorder.ToGPX(rec, ne => new[] { 35 + ne[0] / 111320, 139 + ne[1] / 92000 });
        Emit(D("tag", "gpx", "gpx", gpx.Length > 500 ? gpx.Substring(0, 500) : gpx));
        Emit(D("tag", "dur", "d", Recorder.Duration(rec)));
        var sa = Recorder.SampleAt(rec, 123.45);
        Emit(D("tag", "sampleAt", "s", SampleObj(sa)));

        File.WriteAllLines("digest-fa-cs.jsonl", Lines);
        Console.WriteLine("fa cs lines: " + Lines.Count);
        return 0;
    }

    static Lst LstOf(List<double> xs) { var l = new Lst(); foreach (var x in xs) l.Add(x); return l; }
    static Dict SampleObj(RecSample x)
    {
        if (x == null) return null;
        return D("t", x.T, "n", x.N, "e", x.E, "h", x.H, "q", new Lst { x.Q[0], x.Q[1], x.Q[2], x.Q[3] },
            "ias", x.Ias, "gs", x.Gs, "vs", x.Vs, "alt", x.Alt, "pIn", x.PIn, "rIn", x.RIn, "rud", x.Rud, "thr", x.Thr,
            "gear", x.Gear, "flap", x.Flap, "onGround", x.OnGround, "rpm", x.Rpm, "failed", x.Failed);
    }
    static Dict GateObj(Analysis.Gate g)
    {
        if (g == null) return null;
        return D("t", g.T, "agl", g.Agl, "along", g.Along,
            "spd", D("v", g.Spd.V, "dev", g.Spd.Dev, "pass", g.Spd.Pass),
            "gp", D("v", g.Gp.V, "dev", g.Gp.Dev, "pass", g.Gp.Pass),
            "vs", D("v", g.Vs.V, "pass", g.Vs.Pass),
            "flap", D("v", g.Flap.V, "pass", g.Flap.Pass),
            "gear", D("v", g.Gear.V, "pass", g.Gear.Pass),
            "cross", D("v", g.Cross.V), "stable", g.Stable);
    }
    static Dict LandObj(Analysis.Landing l)
    {
        return D("t", l.T, "i", (double)l.I, "along", (double)l.Along, "cross", l.Cross, "sinkFpm", (double)l.SinkFpm, "ias", l.Ias, "gs", l.Gs,
            "floatM", l.FloatM, "devAim", l.DevAim, "inZone", l.InZone, "onRunway", l.OnRunway, "bounces", (double)l.Bounces, "gate", GateObj(l.Gate));
    }
    static Dict AnaObj(Analysis.AnalysisResult a)
    {
        if (a == null) return null;
        var mans = new Lst();
        foreach (var m in a.Maneuvers)
        {
            var rows = new Lst();
            foreach (var r in m.Rows) rows.Add(D("key", r.Key, "name", r.Name, "val", r.Val, "std", r.Std, "pass", r.Pass, "score", r.Score, "pct", r.Pct, "max", r.Max, "tol", r.Tol));
            mans.Add(D("name", m.Name, "t0", m.T0, "t1", m.T1, "score", m.Score, "pass", m.Pass, "rows", rows));
        }
        var lands = new Lst(); foreach (var l in a.Landings) lands.Add(LandObj(l));
        return D("v", (double)a.V, "samples", (double)a.Samples, "dur", a.Dur, "maneuvers", mans, "landings", lands, "gate", GateObj(a.Gate));
    }
    static Lst RowsObj(List<Analysis.RowGroup> groups)
    {
        var gl = new Lst();
        foreach (var g in groups)
        {
            var rows = new Lst();
            foreach (var r in g.Rows) { var rd = D("name", r.Name, "val", r.Val, "std", r.Std, "pass", r.Pass); if (r.Score != null) rd["score"] = r.Score.Value; if (r.Key != null) { rd["key"] = r.Key; rd["pct"] = r.Pct; rd["max"] = r.Max; rd["tol"] = r.Tol; } rows.Add(rd); }
            gl.Add(D("step", g.Step, "rows", rows));
        }
        return gl;
    }
    static Lst HistObj(List<Analysis.HistEntry> hs)
    {
        var l = new Lst();
        foreach (var h in hs) l.Add(D("date", h.Date, "lesson", h.Lesson, "along", h.Along, "cross", h.Cross, "sink", h.Sink, "float", h.Float, "zone", h.Zone, "gate", h.Gate));
        return l;
    }
    static Dict StatsObj(Analysis.LandStats s)
    {
        if (s == null) return null;
        return D("n", (double)s.N, "alongMean", (double)s.AlongMean, "alongSd", (double)s.AlongSd, "sinkMean", (double)s.SinkMean, "sinkMax", (double)s.SinkMax, "crossAbsMean", s.CrossAbsMean, "floatMean", (double)s.FloatMean, "inZonePct", (double)s.InZonePct, "gateStablePct", s.GateStablePct != null ? (object)(double)s.GateStablePct.Value : null);
    }
}
