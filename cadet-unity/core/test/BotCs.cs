// Equivalence bot (C#): performs the identical op script as bot-js.mjs against
// the CadetCareer port and emits the same digest lines. Compare with
// diff-digests.py (numeric tolerance 1e-9, strings exact).
using System;
using System.Collections.Generic;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotCs
{
    static readonly List<string> Out = new List<string>();
    static void Emit(Dict o) { Out.Add(MiniJson.Stringify(o)); }
    static Lst L(params object[] xs) { return new Lst(xs); }
    static Lst Strs(List<string> xs) { var l = new Lst(); foreach (var x in xs) l.Add(x); return l; }
    static Lst Items(List<Dict> xs) { var l = new Lst(); foreach (var x in xs) l.Add(x); return l; }

    static readonly Dictionary<string, double> VAL = new Dictionary<string, double> { { "S", 95 }, { "A", 85 }, { "B", 72 }, { "C", 55 } };
    static readonly Dictionary<string, int> ORD = new Dictionary<string, int> { { "", 0 }, { "C", 1 }, { "B", 2 }, { "A", 3 }, { "S", 4 } };
    static readonly string[] GRADES = { "S", "A", "B", "A", "C", "A" };
    static readonly string[] MISSKEYS = { "alt", "hdg", "spd", "proc", "wx", "radio", "fuel", "checklist", "judge", "fatigue" };

    static Dict ProgJson(Prog prog)
    {
        var lessons = new Dict();
        foreach (var kv in prog.Lessons)
        {
            var r = kv.Value;
            var lv = new Lst(); foreach (var s in r.Levels) lv.Add(s);
            var rec = new Dict { { "tries", (double)r.Tries }, { "best", r.Best }, { "pass", r.Pass }, { "levels", lv } };
            if (r.HasScore) rec["score"] = r.Score;
            lessons[kv.Key] = rec;
        }
        return new Dict { { "lessons", lessons } };
    }

    static bool FlyRecord(Prog prog, string id, string grade, string level)
    {
        Prog.Rec r;
        if (!prog.Lessons.TryGetValue(id, out r)) { r = new Prog.Rec(); prog.Lessons[id] = r; }
        bool first = r.Tries == 0;
        r.Tries++;
        double val = VAL[grade];
        if (val >= 60) { r.Pass = true; if (!r.Levels.Contains(level)) r.Levels.Add(level); }
        r.Score = val; r.HasScore = true;
        if (ORD[grade] > ORD[r.Best ?? ""]) r.Best = grade;
        return first;
    }

    static void RunCareer(uint seed)
    {
        var C = new Career(new MemoryStore(), seed);
        var prog = new Prog();
        int doneDay = -1;
        Emit(new Dict { { "tag", "init" }, { "seed", (double)seed }, { "state", C.State } });
        for (int day = 1; day <= 420; day++)
        {
            if (day % 11 == 5) { string k = MISSKEYS[day % 10]; C.NoteMiss(k, "レッスン " + k); }
            if (day % 13 == 7) C.Decision(day % 2 == 1 ? "go" : "cancel", C.Weather(prog));
            var sch = C.Schedule(prog, 62);
            Emit(new Dict { { "tag", "D0" }, { "day", (double)day }, { "state", C.State }, { "sch", Items(sch) },
                { "gate62", Strs(C.Gate(prog, 62)) }, { "gate40", Strs(C.Gate(prog, 40)) }, { "wx", C.Weather(prog) },
                { "fly", C.FlyingWeather(prog) }, { "aloft", C.Aloft(prog) }, { "miss", CareerLogic.MissAsk(C.State) }, { "prog", ProgJson(prog) } });
            for (int idx = 0; idx < sch.Count; idx++)
            {
                var it = sch[idx];
                string kind = Js.Str(it, "kind"), id = Js.Str(it, "id");
                string grade = GRADES[(day + idx) % 6];
                switch (kind)
                {
                    case "ceremony": C.Done("ceremony", "welcome"); break;
                    case "tour": C.Done("tour", "tour"); break;
                    case "brief": C.Done("brief", "meet"); C.FinishPrologue(); break;
                    case "class": {
                        string pace = new[] { "need", "full", "quick" }[(day + idx) % 3];
                        C.SetPace(pace); C.Tire(6);
                        foreach (var g in CareerLogic.ClassGrowth(pace)) C.Grow(g.Axis, g.V, "class:" + id);
                        C.HeardSection("sec" + id + "a", (day + idx) % 2 == 1 ? "f" : "q");
                        C.Done("class", id); break;
                    }
                    case "ftd": {
                        double pct = new[] { 100.0, 95.0, 80.0 }[(day + idx) % 3];
                        Prog.Rec old; prog.Lessons.TryGetValue(id, out old);
                        var res = CareerLogic.NoteGround(old, pct >= 60, pct);
                        prog.Lessons[id] = res.rec;
                        if (res.first) C.FirstTry(res.rec.Pass);
                        foreach (var g in CareerLogic.FtdGrowth(id)) C.Grow(g.Axis, g.V, "ftd:" + id);
                        C.Done("ftd", id); break;
                    }
                    case "flight": case "solo": case "checkride": case "xc": case "night": {
                        string level = day % 17 == 0 ? "intro" : ("inxe".IndexOf(id[0]) >= 0 ? "precision" : "basic");
                        bool first = FlyRecord(prog, id, grade, level);
                        if (first) C.FirstTry(VAL[grade] >= 60);
                        foreach (var g in CareerLogic.LessonGrowth(grade, level, id, C.Tired())) C.Grow(g.Axis, g.V, "lesson:" + id);
                        C.Tire(14);
                        C.Done(kind, id);
                        if (kind == "solo") C.SoloDone();
                        if ((kind == "checkride" || kind == "xc") && CareerData.CHECKS.ContainsKey(id)) C.Check(id, grade != "C");
                        break;
                    }
                    case "exam": C.Exam(id, new[] { 88.0, 93.0, 76.0, 97.0, 84.0 }[(day + idx) % 5]); C.Done("exam", id); break;
                    case "ground": C.Decision(day % 2 == 1 ? Js.Str(C.Weather(prog), "decision") : "go", C.Weather(prog)); C.Done("ground", "weather"); break;
                    case "weather": C.Decision(day % 2 == 1 ? "go" : Js.Str(C.Weather(prog), "decision"), C.Weather(prog)); C.Done("weather", id); break;
                    case "study":
                        if (id == "weather") { C.Decision("go", C.Weather(prog)); C.Done("study", "weather"); }
                        else if (id == "remedial") { C.Drill(); C.Done("study", "remedial"); }
                        else C.Done("study", id ?? "std");
                        break;
                    case "navlog": C.Done("navlog", "xc"); break;
                    case "line": {
                        double sc = new[] { 82.0, 90.0, 77.0 }[day % 3];
                        C.RecordLeg(Js.Str(it, "route"), Js.Str(it, "role"), Js.Num(it, "blockMin"), sc, sc, day % 29 == 0);
                        C.Done("line", "line"); break;
                    }
                    case "linecheck": C.RecordLineCheck(day % 2 == 0); break;
                    case "graduation": C.Done("graduation", "grad"); break;
                    case "off": case "rest": break;
                    default: if (id != null) C.Done(kind, id); break;
                }
                C.Advance();
            }
            string ch = C.Chapter;
            if (C.Gate(prog, 62).Count == 0)
            {
                if (ch == "ch6") { C.Graduate(prog); C.BeginEndorsement(); }
                else if (ch == "ch7") C.BeginFirstOfficer();
                else if (ch != "fo2") C.AdvanceChapter(prog, 62);
            }
            C.Sleep(day % 5 == 3);
            Emit(new Dict { { "tag", "D1" }, { "day", (double)day }, { "state", C.State } });
            var fo = Js.Obj(Js.Get(C.State, "fo"));
            if (fo != null && Js.Get(fo, "done") is bool && (bool)Js.Get(fo, "done") && doneDay < 0) doneDay = day;
            if (doneDay > 0 && day >= doneDay + 5) break;
        }
        Emit(new Dict { { "tag", "final" }, { "seed", (double)seed }, { "state", C.State }, { "rank", CareerLogic.GraduationRank(C.State, prog) }, { "prog", ProgJson(prog) } });
    }

    const string DirtyJson = @"{ ""v"": 99, ""seed"": -3, ""day"": 99999, ""slot"": ""xxx"", ""chapter"": ""zzz"", ""fatigue"": -5, ""started"": ""yes"",
    ""abilities"": { ""hand"": 999, ""know"": -2, ""comm"": ""x"", ""judge"": 55.5, ""extra"": 10 }, ""firstTry"": { ""pass"": 9, ""total"": 4 },
    ""exams"": { ""written1"": { ""tries"": 2.7, ""best"": 130, ""pass"": 1 }, ""bogus"": { ""tries"": 1 }, ""nav"": ""junk"" },
    ""miss"": { ""day"": 3, ""key"": ""alt"", ""label"": ""高度"" }, ""fo"": { ""hired"": 1, ""sectors"": 30.9, ""blockMin"": -4, ""evalSum"": 40, ""evalN"": 8, ""lineCheck"": { ""day"": 5, ""pass"": true }, ""done"": 0, ""failSectors"": 12 },
    ""attempts"": { ""ftd:k1"": 3, ""bad key"": 2 }, ""drills"": { ""day"": 2, ""n"": 9 }, ""examDay"": { ""written1"": 4 }, ""aloft"": { ""day"": 2, ""from"": 360, ""kt"": 8, ""at3000"": { ""from"": 30, ""kt"": 16 } },
    ""solo"": { ""day"": 40 }, ""checks"": { ""xc"": { ""tries"": 1, ""pass"": true, ""day"": 30 }, ""ir"": { ""tries"": ""x"" } }, ""graduated"": { ""day"": 60, ""rank"": ""優等"" }, ""done"": { ""flight:a1"": 3, ""junk"": ""x"" } }";

    static void ScenarioB()
    {
        var C = new Career(new MemoryStore(), 5);
        var dirty = BuildDirty();
        bool okLoad = C.Load(dirty);
        Emit(new Dict { { "tag", "B-clean" }, { "okLoad", okLoad }, { "state", C.State } });
        foreach (var probe in new[] { ("ch4", 100), ("ch4", 300), ("ch3", 1), ("fo1", 50), ("ch2", 200) })
        {
            C.Load(new Dict { { "v", 3.0 }, { "seed", 777.0 }, { "day", (double)probe.Item2 }, { "chapter", probe.Item1 }, { "started", true } });
            Emit(new Dict { { "tag", "B-probe" }, { "chapter", probe.Item1 }, { "day", (double)probe.Item2 }, { "wx", C.Weather(null) }, { "sch", Items(C.Schedule(null, 62)) }, { "gate", Strs(C.Gate(null, 62)) } });
        }
        var bands = new Lst();
        foreach (var t in new[] { 0.0, 7, 20, 33, 50, 59, 60, 80, 100 }) bands.Add(CareerLogic.TrustBand(t));
        Emit(new Dict { { "tag", "B-trust" }, { "bands", bands } });
    }

    static Dict BuildDirty()
    {
        var d = (Dict)MiniJson.Parse(DirtyJson);
        var decisions = new Lst();
        for (int i = 0; i < 250; i++) decisions.Add(new Dict { { "day", (double)(i + 1) }, { "choice", "go" }, { "right", i % 2 == 0 } });
        d["decisions"] = decisions;
        var growth = new Dict();
        for (int i = 0; i < 250; i++) growth["k" + i] = (double)i;
        d["growth"] = growth;
        var answers = new Dict();
        for (int i = 0; i < 500; i++) answers["q" + i] = i % 2 == 0;
        d["answers"] = answers;
        d["heard"] = new Dict { { "good1", "f" }, { "BAD ID!", "f" }, { "ok2", "x" }, { "ok3", "q" } };
        d["walked"] = new Lst { "room-1", "room-1", "BAD!", "tower" };
        return d;
    }

    public static void Main()
    {
        RunCareer(12345);
        RunCareer(777);
        ScenarioB();
        File.WriteAllLines("digest-cs.jsonl", Out);
        Console.WriteLine("cs digest lines: " + Out.Count);
    }
}
