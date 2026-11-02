// C# mirror of bot-sys-js.mjs — systems.js equivalence.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotSysCs
{
    static readonly List<string> Lines = new List<string>();
    static Dict D(params object[] kv) { var d = new Dict(); for (int i = 0; i < kv.Length; i += 2) d[(string)kv[i]] = kv[i + 1]; return d; }
    static double R2(double v, int d = 2) { return Math.Round(v, d, MidpointRounding.AwayFromZero); }

    static void Run(string tag, string aircraft, Action<double, SwState, Systems, State> script, double seconds)
    {
        var s = Sim.NewState(7, aircraft);
        Sim.ApplyLoading(s, new Loading());
        Sim.PlaceOnRunway(s, FlightPhysics.LAB_RWY, 30);
        var sw = new SwState();
        var sys = new Systems(sw);
        sys.SetCold(s);
        double dt = 1.0 / 30;
        var evAcc = new Lst();
        int total = (int)Math.Round(seconds / dt);
        for (int i = 0; i <= total; i++)
        {
            double t = i * dt;
            script(t, sw, sys, s);
            var evs = sys.Update(dt, s);
            foreach (var e in evs) evAcc.Add(e.Type + (e.Why != "" ? ":" + e.Why : ""));
            Sim.Step(s, dt);
            if (i % 30 == 0)
            {
                Lines.Add(MiniJson.Stringify(D("tag", tag, "t", R2(t, 1), "eng", sys.St.Eng, "rpm", R2(sys.Rpm, 1), "volts", R2(sys.Elec.Volts), "amps", sys.Elec.Amps, "batt", R2(sys.Elec.Batt, 4), "shed", (double)sys.Elec.Shed, "pfd", sys.Elec.PfdOn, "mfd", sys.Elec.MfdOn, "oil", R2(sys.Oil, 1), "oilT", sys.OilT != null ? (object)R2(sys.OilT.Value, 1) : null, "primes", sys.Primes, "twin", sys.Twin[0].Eng + "/" + sys.Twin[1].Eng, "ev", evAcc)));
                evAcc = new Lst();
            }
        }
    }
    static Action<double, SwState, Systems, State> StartSeq(int primes, double thrV)
    {
        return (t, sw, sys, s) =>
        {
            if (t >= 0.5 && t < 0.6) { sw.Master = true; sw.Mixture = 1; s.Thr = thrV; for (int i = 0; i < primes; i++) sys.Prime(); }
            if (t >= 1 && t < 11) sw.Mag = "START"; else if (t >= 11) sw.Mag = "BOTH";
        };
    }

    public static int Main()
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        Run("A", "pa28", (t, sw, sys, s) => { StartSeq(3, 0.25)(t, sw, sys, s); if (t >= 20) s.Thr = 0.62; if (t >= 30 && t < 40) sw.Mag = "L"; if (t >= 40 && t < 50) sw.Mag = "R"; if (t >= 50 && t < 60) { sw.Mag = "BOTH"; sw.CarbHeat = true; } if (t >= 60) sw.CarbHeat = false; if (t >= 70) sw.Mag = "OFF"; }, 80);
        Run("B", "pa28", StartSeq(0, 0.25), 14);
        Run("C", "pa28", (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) { sw.Master = true; sw.Mixture = 1; s.Thr = 0.2; for (int i = 0; i < 7; i++) sys.Prime(); } if (t >= 1 && t < 11) sw.Mag = "START"; if (t >= 12) s.Thr = 0.5; if (t >= 13 && t < 23) sw.Mag = "START"; else if (t >= 23) sw.Mag = "BOTH"; }, 30);
        Run("D", "pa28", (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) sys.SetRunning(s); if (t >= 5) sw.FuelSel = "OFF"; }, 16);
        Run("E", "pa28", (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) { sys.SetRunning(s); sys.SetElecFault(true); sys.Elec.Batt = 0.5; sw.Landing = true; sw.Pitot = true; s.Thr = 0.62; } }, 60);
        Run("F", "pa44", (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) { sw.Master = true; sw.Mixture = 1; s.Thr = 0.25; for (int i = 0; i < 3; i++) sys.Prime(); } if (t >= 1 && t < 6) sw.Mag = "START"; if (t >= 8 && t < 13) sw.Mag = "START"; else if (t >= 13) sw.Mag = "BOTH"; if (t >= 20) sw.Mixture = 0; }, 30);
        Run("G", "pa28", (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) { sys.SetRunning(s); sys.SetFault(210); s.Thr = 0.62; } if (t >= 10 && t < 20) sw.Mag = "L"; if (t >= 20) sw.Mag = "BOTH"; }, 30);
        Run("H", "pa28", (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) { sw.Master = true; sw.Mixture = 0; s.Thr = 0.25; for (int i = 0; i < 3; i++) sys.Prime(); } bool cyc = Math.Floor(t / 10) % 2 == 0; sw.Mag = t >= 1 && cyc ? "START" : "BOTH"; }, 90);
        Run("I", "pa28", (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) { sys.SetRunning(s); sw.Bat = true; sw.Alt = true; s.Thr = 0.62; } if (t >= 10) sw.Alt = false; if (t >= 30) { sw.Alt = true; sw.Bat = false; } }, 45);
        File.WriteAllLines("digest-sys-cs.jsonl", Lines);
        Console.WriteLine("sys cs lines: " + Lines.Count);
        return 0;
    }
}
