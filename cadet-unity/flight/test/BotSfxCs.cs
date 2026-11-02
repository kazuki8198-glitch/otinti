// Stage 11 harness: drives CadetSfx against the RecordingBackend with the
// same call script and seeded rng as tools/golden-sfx.mjs, then compares
// the canonical graph/automation log entry by entry.
using System;
using System.Collections.Generic;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotSfxCs
{
    static uint seed = 123456789;
    static double Rnd()
    {
        unchecked
        {
            seed += 0x6D2B79F5u;
            uint t = seed;
            t = (uint)((int)(t ^ (t >> 15)) * (int)(t | 1));
            t ^= t + (uint)((int)(t ^ (t >> 7)) * (int)(t | 61));
            return ((t ^ (t >> 14)) >> 0) / 4294967296.0;
        }
    }
    static bool Eq(object a, object b, string path, ref string firstDiff)
    {
        if (a == null && b == null) return true;
        if (a == null || b == null) { firstDiff = path + ": null mismatch"; return false; }
        if (a is double da && b is double db) { if (Math.Abs(da - db) > 1e-4) { firstDiff = path + $": {da} vs {db}"; return false; } return true; }
        if (a is string || b is string || a is bool || b is bool) { if (!a.Equals(b)) { firstDiff = path + $": '{a}' vs '{b}'"; return false; } return true; }
        if (a is Lst la && b is Lst lb)
        {
            if (la.Count != lb.Count) { firstDiff = path + $": len {la.Count} vs {lb.Count}"; return false; }
            for (int i = 0; i < la.Count; i++) if (!Eq(la[i], lb[i], path + "[" + i + "]", ref firstDiff)) return false;
            return true;
        }
        firstDiff = path + ": type mismatch"; return false;
    }
    public static int Main(string[] args)
    {
        string root = args.Length > 0 ? args[0] : "/home/hatch/workspace/cadet-unity";
        var golden = (Lst)MiniJson.Parse(File.ReadAllText(root + "/flight/test/golden-sfx.json"));
        var be = new RecordingBackend();
        var A = new CadetSfx(be, Rnd);
        var log = be.Log;
        A.Footstep("concrete"); A.Door("swing_open"); A.Engine(new CadetSfx.EngObs { Rpm = 700, Thr = 0 }); A.Click();
        log.Add(new Lst { "marker", "pre-unlock-empty", (double)log.Count });
        A.Unlock();
        A.SetAmbience(0.6, 0.5, null, 0);
        A.Footstep("concrete"); A.Footstep("grass"); A.Footstep("metal");
        A.Door("swing_open"); A.Door("swing_close"); A.Door("slide_open"); A.Door("locked");
        A.Ui("click"); A.Ui("open"); A.Click(); A.Knob(); A.Chime();
        A.Update(7); A.Update(1);
        A.Engine(new CadetSfx.EngObs { Rpm = 0, Thr = 0, Ias = 0, OnGround = true, Running = false });
        A.Engine(new CadetSfx.EngObs { Rpm = 700, Thr = 0.02, Ias = 0, OnGround = true });
        A.Engine(new CadetSfx.EngObs { Rpm = 1500, Thr = 0.35, Ias = 20, OnGround = true });
        A.Engine(new CadetSfx.EngObs { Rpm = 2400, Thr = 1, Ias = 105, OnGround = false });
        A.Engine(new CadetSfx.EngObs { Rpm = 2400, Thr = 1, Ias = 105, OnGround = false, Stall = true });
        A.Engine(new CadetSfx.EngObs { Rpm = 2350, Thr = 0.8, Ias = 90, OnGround = false, Stall = false, GearMoving = true, FlapMoving = true, Rain = 0.7 });
        A.Engine(new CadetSfx.EngObs { Thr = 0.7, Ias = 80, OnGround = false, Engines = new List<CadetSfx.EngObs> { new CadetSfx.EngObs { Rpm = 2300, Running = true }, new CadetSfx.EngObs { Rpm = 900, Running = false } } });
        A.Engine(null);
        A.Starter(); A.Crank(true); A.Crank(false); A.Fire(); A.Fire(-1);
        A.Squelch(); A.Radio(3); A.Radio(0);
        A.Touchdown(200); A.Touchdown(800);
        A.ApDisc(); double identLen = A.Ident("HND");
        log.Add(new Lst { "marker", "identLen", Js.Round(identLen * 1e5) / 1e5 });
        A.Thunder(0.5, 0.8);
        A.Traffic(new Dict { { "gain", 0.5 }, { "pan", 0.3 }, { "f", 90.0 } });
        A.Traffic(new Dict { { "gain", 0.5 }, { "pan", 0.3 }, { "f", 90.0 } });
        A.Traffic(null);
        A.SetVolume(0.5); A.SetVolumes(0.7, 0.9, 0.4);
        A.SetAmbience(0, 0.9, true, 0.3);
        log.Add(new Lst { "marker", "end", (double)log.Count });
        string diff = null;
        bool ok = Eq(log, golden, "log", ref diff);
        Console.WriteLine(ok ? $"BotSfxCs: {golden.Count}/{golden.Count} log entries matched" : "BotSfxCs FAIL: " + diff);
        if (!ok)
        {
            // show context around the first differing entry
            var parts = diff.Split(':')[0];
            Console.WriteLine("cs entries: " + log.Count + ", golden: " + golden.Count);
        }
        return ok ? 0 : 1;
    }
}
