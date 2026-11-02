// Equivalence bot #2 (C#): tem + guide sweeps, mirroring bot2-js.mjs.
using System;
using System.Collections.Generic;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class Bot2Cs
{
    static readonly List<string> Out = new List<string>();
    static void Emit(Dict o) { Out.Add(MiniJson.Stringify(o)); }

    public static void Main()
    {
        var weathers = new[] { "good", "pmStorm", "lowCloud", "crosswind", "pmWind", "amLowCloud", "amFog", "forecastBust", "southFlow", null };
        foreach (var weather in weathers)
        foreach (var fatigue in new[] { 0.0, 44, 45, 90 })
        foreach (var check in new[] { false, true })
        foreach (var xc in new[] { false, true })
        foreach (var aircraft in new[] { "pa28", "pa44" })
        foreach (var chapter in new[] { "ch3", "ch4", "ch5" })
        foreach (var traffic in new[] { 0.0, 3 })
        foreach (var cb in new[] { false, true })
        foreach (var day in new[] { 1, 2, 7, 30 })
            Emit(new Dict { { "tag", "tem" }, { "r", CadetTem.TemFor(new TemOpts { Weather = weather, Fatigue = fatigue, Check = check, Xc = xc, Aircraft = aircraft, Chapter = chapter, Traffic = traffic, Cb = cb, Day = day }) } });
        var ids = new Lst(); var got = new Lst();
        foreach (var t in CadetTem.THREATS) { ids.Add(t.Id); var x = CadetTem.ThreatOf(t.Id); got.Add(x == null ? null : x.Ja); }
        Emit(new Dict { { "tag", "threatOf" }, { "ids", ids }, { "got", got }, { "none", CadetTem.ThreatOf("zzz") } });

        var sc = (Dict)MiniJson.Parse(File.ReadAllText("scenarios.json"));
        foreach (var sumObj in Js.Arr(sc["sums"]))
            Emit(new Dict { { "tag", "errors" }, { "ja", CadetTem.ErrorsOf(Js.Obj(sumObj)) }, { "en", CadetTem.ErrorsOfEn(Js.Obj(sumObj)) } });
        foreach (var sObj in Js.Arr(sc["guide"]))
            Emit(new Dict { { "tag", "guide" }, { "r", CadetGuide.NextStep(Js.Obj(sObj)) } });

        var spec = (Dict)MiniJson.Parse(File.ReadAllText("../../data/academy-spec.json"));
        var router = new AcademyRouter(spec);
        var roomIds = new List<string>();
        foreach (var rObj in Js.Arr(spec["rooms"])) roomIds.Add(Js.Str(Js.Obj(rObj), "id"));
        var pairs = new Lst();
        foreach (var a in roomIds) foreach (var b in roomIds)
        {
            var p = new Lst { a, b, router.Next(a, b) };
            pairs.Add(p);
        }
        var centres = new Lst();
        foreach (var id in roomIds) centres.Add(router.Centre(id));
        Emit(new Dict { { "tag", "router" }, { "pairs", pairs }, { "centres", centres }, { "missing", router.Next("zzz", roomIds[0]) }, { "same", router.Next(roomIds[0], roomIds[0]) } });

        File.WriteAllLines("digest2-cs.jsonl", Out);
        Console.WriteLine("cs2 digest lines: " + Out.Count);
    }
}
