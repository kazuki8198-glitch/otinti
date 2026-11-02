// Equivalence bot #3 (C#): mirrors bot3-js.mjs.
using System;
using System.Collections.Generic;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class Bot3Cs
{
    static readonly List<string> Out = new List<string>();
    static void Emit(Dict o) { Out.Add(MiniJson.Stringify(o)); }
    static Lst Items(List<Dict> xs) { var l = new Lst(); foreach (var x in xs) l.Add(x); return l; }
    static Lst Strs(List<string> xs) { var l = new Lst(); foreach (var x in xs) l.Add(x); return l; }

    const string DirtyJson = @"{ ""v"": 2, ""seed"": -3, ""day"": 99999, ""slot"": ""xxx"", ""chapter"": ""zzz"", ""fatigue"": -5, ""started"": ""yes"",
    ""abilities"": { ""hand"": 999, ""know"": -2, ""comm"": ""x"", ""judge"": 55.5, ""extra"": 10 }, ""firstTry"": { ""pass"": 9, ""total"": 4 },
    ""exams"": { ""written1"": { ""tries"": 2.7, ""best"": 130, ""pass"": 1 }, ""bogus"": { ""tries"": 1 }, ""nav"": ""junk"" },
    ""miss"": { ""day"": 3, ""key"": ""alt"", ""label"": ""高度"" }, ""fo"": { ""hired"": 1, ""sectors"": 30.9, ""blockMin"": -4, ""evalSum"": 40, ""evalN"": 8, ""lineCheck"": { ""day"": 5, ""pass"": true }, ""done"": 0, ""failSectors"": 12 },
    ""attempts"": { ""ftd:k1"": 3, ""bad key"": 2 }, ""drills"": { ""day"": 2, ""n"": 9 }, ""examDay"": { ""written1"": 4 }, ""aloft"": { ""day"": 2, ""from"": 360, ""kt"": 8, ""at3000"": { ""from"": 30, ""kt"": 16 } },
    ""solo"": { ""day"": 40 }, ""checks"": { ""xc"": { ""tries"": 1, ""pass"": true, ""day"": 30 }, ""ir"": { ""tries"": ""x"" } }, ""graduated"": { ""day"": 60, ""rank"": ""優等"" }, ""done"": { ""flight:a1"": 3, ""junk"": ""x"" } }";

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

    static Dict Fo(double sectors, double blockMin, bool? lcPass = null, double? failSectors = null)
    {
        var fo = new Dict { { "hired", true }, { "sectors", sectors }, { "blockMin", blockMin }, { "evalSum", 0.0 }, { "evalN", 0.0 }, { "done", false } };
        if (lcPass.HasValue) fo["lineCheck"] = new Dict { { "day", 99.0 }, { "pass", lcPass.Value } };
        else fo["lineCheck"] = null;
        fo["failSectors"] = failSectors.HasValue ? (object)failSectors.Value : null;
        return fo;
    }

    static Dict Craft(uint seed, double day, string chapter, double fatigue, Dict fo)
    {
        var d = new Dict { { "v", 2.0 }, { "seed", (double)seed }, { "day", day }, { "chapter", chapter }, { "started", true } };
        if (fatigue >= 0) d["fatigue"] = fatigue;
        if (fo != null) d["fo"] = fo;
        return d;
    }

    public static void Main()
    {
        var C = new Career(new MemoryStore(), 5);
        Emit(new Dict { { "tag", "B2-clean" }, { "okLoad", C.Load(BuildDirty()) }, { "state", C.State } });
        foreach (var probe in new[] { ("ch4", 100), ("ch4", 300), ("ch3", 1), ("fo1", 50), ("ch2", 200) })
        {
            C.Load(Craft(777, probe.Item2, probe.Item1, -1, null));
            Emit(new Dict { { "tag", "B2-probe" }, { "chapter", probe.Item1 }, { "day", (double)probe.Item2 }, { "wx", C.Weather(null) }, { "sch", Items(C.Schedule(null, 62)) }, { "gate", Strs(C.Gate(null, 62)) } });
        }
        C.Load(Craft(42, 100, "fo2", 70, Fo(3, 200)));
        Emit(new Dict { { "tag", "B2-rest" }, { "sch", Items(C.Schedule(null, 62)) }, { "state", C.State } });
        C.Load(Craft(42, 100, "fo2", 64, Fo(12, 950)));
        Emit(new Dict { { "tag", "B2-linecheck" }, { "sch", Items(C.Schedule(null, 62)) } });
        C.Load(Craft(42, 101, "fo2", 10, Fo(12, 950, false, 12)));
        Emit(new Dict { { "tag", "B2-afterfail" }, { "sch", Items(C.Schedule(null, 62)) } });
        C.Load(Craft(42, 101, "fo2", 10, Fo(16, 1200, false, 12)));
        Emit(new Dict { { "tag", "B2-afterfail16" }, { "sch", Items(C.Schedule(null, 62)) } });
        Emit(new Dict { { "tag", "B2-v1" }, { "okLoad", C.Load(new Dict { { "v", 1.0 }, { "seed", 9.0 }, { "day", 30.0 }, { "chapter", "ch2" }, { "started", true } }) }, { "state", C.State } });
        File.WriteAllLines("digest3-cs.jsonl", Out);
        Console.WriteLine("cs3 digest lines: " + Out.Count);
    }
}
