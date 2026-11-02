using System;
using System.Collections.Generic;
using Cadet;

public static class CsDriver
{
    public static void Main()
    {
        var s = Sim.NewState(1, "pa28");
        Sim.PlaceOnRunway(s, FlightPhysics.LAB_RWY, 30);
        var ctl = new Controls();
        ctl.Reset();
        ctl.Action(s, "parkBrake", 1, true);
        var keys = new VirtualKeySet();
        bool released = false, rotated = false;
        var rows = new List<double[]>();
        const double DT = 1.0 / 120;
        const int STEPS = 120 * 60;
        for (int i = 0; i < STEPS; i++)
        {
            double t = s.T;
            if (!released && t >= 1.0) { ctl.Action(s, "parkBrake", 0, true); released = true; }
            keys.Down.Clear();
            if (t >= 2.0 && s.Thr < 0.999) keys.Down.Add("KeyR");
            if (!rotated && s.Out.Ias >= 55) keys.Down.Add("KeyS");
            if (rotated && s.Out.Pitch < 11) keys.Down.Add("KeyS");
            if (s.Out.Ias >= 55 && s.Out.Pitch >= 11) rotated = true;
            ctl.Update(s, DT, keys, true);
            Sim.Step(s, DT);
            double lt = Math.Round(s.T * 2) / 2;
            if (Math.Abs(s.T - lt) < 1e-9 && lt >= 0 && (rows.Count == 0 || rows[rows.Count - 1][0] != lt))
                rows.Add(new[] { lt, s.Out.Ias, s.Out.AltTrue, s.Out.RwyAlong, s.Out.Pitch, s.Thr, s.OnGround ? 1.0 : 0.0 });
        }
        Console.WriteLine("t,ias,alt,along,pitch,thr,ground");
        foreach (var r in rows)
            Console.WriteLine(string.Join(",", Array.ConvertAll(r, v => v.ToString("F4", System.Globalization.CultureInfo.InvariantCulture))));
        var types = new List<string>();
        foreach (var e in s.Events) types.Add(e.Type);
        Console.Error.WriteLine("EVENTS [" + string.Join(",", types) + "]");
        Console.Error.WriteLine("CRASHED " + s.Crashed + " " + (s.CrashReason ?? ""));
    }
}
