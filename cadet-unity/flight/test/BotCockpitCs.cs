// BotCockpitCs.cs — the C# replay of golden-cockpit.jsonl (tools/golden-cockpit.mjs).
// For every recorded press, act() must return the same intent the JS cockpit
// returned, and the 737's boeing state digest must match after the same apply
// chain and the same 0.05 s of rig stepping (frame at 1/60 with the AP pilot
// hook, systems, AP sync — the generator's own composition).
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;

public static class BotCockpitCs
{
    static readonly HashSet<string> ApWhats = new HashSet<string>
        { "AP", "AP_HDG", "AP_ALT", "AP_NAV", "AP_APR", "AP_VS", "AP_LVL", "FD", "MCP_ALT", "AT_ARM", "AT_SPD", "AP_VS_ADJ", "AP_LVLCHG", "AP_DISC" };

    static bool Eq(object a, object b)
    {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        if (a is double da && b is double db) return Math.Abs(da - db) <= 1e-9;
        if (a is bool ba && b is bool bb) return ba == bb;
        if (a is string sa && b is string sb) return sa == sb;
        var da2 = a as Dict; var db2 = b as Dict;
        if (da2 != null && db2 != null)
        {
            if (da2.Count != db2.Count) return false;
            foreach (var kv in da2) { object bv; if (!db2.TryGetValue(kv.Key, out bv) || !Eq(kv.Value, bv)) return false; }
            return true;
        }
        return false;
    }

    static Dict IntentDict(CtlIntent d)
    {
        if (d == null) return null;
        var o = new Dict { { "type", d.Type } };
        switch (d.Type)
        {
            case "flight": o["name"] = d.Name; if (d.Arg != null) o["arg"] = d.Arg; break;
            case "av": o["what"] = d.What; o["dir"] = d.Dir; o["big"] = d.Big; break;
            case "switch": o["id"] = d.Id; o["on"] = d.On; break;
            case "select": o["id"] = d.Id; o["value"] = d.Value; break;
            case "info": o["text"] = d.Text; break;
            case "view": o["focus"] = d.Focus; break;
        }
        return o;
    }

    static string JE(string s)
    {
        if (s == null) return "null";
        return "\"" + s.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
    }

    // the generator's stable() rendering of cp.boeing.state
    static string BgString(BoeingState b)
    {
        var c = b.Cdu;
        string cdu = "{\"active\":" + (c.Active ? "true" : "false") + ",\"dirty\":" + (c.Dirty ? "true" : "false") + ",\"edited\":" + (c.Edited ? "true" : "false")
            + ",\"from\":" + JE(c.From) + ",\"msg\":" + JE(c.Msg) + ",\"page\":" + JE(c.Page) + ",\"pendingExec\":" + (c.PendingExec ? "true" : "false")
            + ",\"posSet\":" + (c.PosSet ? "true" : "false") + ",\"ref\":" + JE(c.Ref) + ",\"scratch\":" + JE(c.Scratch) + ",\"to\":" + JE(c.To) + "}";
        string du = "{\"inb\":" + JE(b.DuInb) + ",\"low\":" + JE(b.DuLow) + ",\"out\":" + JE(b.DuOut) + "}";
        string efis = "{\"ndMode\":" + JE(b.NdMode) + ",\"ndRange\":" + b.NdRange.ToString(CultureInfo.InvariantCulture) + "}";
        return "{\"cdu\":" + cdu + ",\"du\":" + du + ",\"efis\":" + efis + ",\"route\":null}";
    }

    class Rig
    {
        public Cockpit Cp; public Systems Sys; public Autopilot Ap; public Controls Ctl; public LessonState Fl; public State S; public AvionicsState Av;
        double acc;

        public void Frame()
        {
            Ctl.Update(S, 1.0 / 60, NoKeys, true);
            acc += 1.0 / 60;
            double H = 1.0 / 120;
            int n = 0;
            while (acc >= H && n < 30) { Ap.Pilot(Fl, H); Sim.Step(S, H); acc -= H; n++; }
            Sys.Update(1.0 / 60, S);
            Ap.Sync(Av);
        }
        public void Step(double sec) { for (double t = 0; t < sec - 1e-9; t += 1.0 / 60) Frame(); }

        public void Apply(CtlIntent d)
        {
            if (d == null) return;
            try
            {
                switch (d.Type)
                {
                    case "switch": Cp.SetField(d.Id, d.On); break;
                    case "select": Cp.SetField(d.Id, d.Value); break;
                    case "prime": Sys.Prime(); break;
                    case "gearEmerg": if (S != null && !S.GearEmerg) S.GearEmerg = true; break;
                    case "flight": Ctl.Action(S, d.Name, d.Arg as double?, true); break;
                    case "av":
                        if (ApWhats.Contains(d.What)) { double dn = d.Dir is double x ? x : 1; Ap.Control(Fl, d.What, dn, d.Big); }
                        else AvionicsControl.Control(Av, d.What, d.Dir, d.Big);
                        break;
                }
            }
            catch { /* application errors do not change the recorded intent (the generator's rule) */ }
        }
    }

    static readonly VirtualKeySet NoKeys = new VirtualKeySet();

    static Rig MakeRig(string type, string ctx)
    {
        var s = Sim.NewState(7, type);
        Sim.ApplyLoading(s, new Loading());
        // startOnGround at the LAB stand: rwyToNE(LAB_RWY, 715, 208), heading 264, the light wind
        Sim.ResetState(s);
        var ne = FlightPhysics.RwyToNE(FlightPhysics.LAB_RWY, 715, 208);
        s.Q = PhysMath.QFromHPB(264, 0, 0);
        s.Pos = new[] { ne[1], FlightPhysics.GROUND_M - s.WheelBottom + 0.02, -ne[0] };
        s.FlapIdx = 0; s.FlapDeg = 0; s.Thr = 0; s.Trim = 0; s.Brake = 0; s.GearDown = true; s.GearPos = 1;
        s.OnGround = true; s.AirTime = 0; s.WasOnRunway = true; s.LastRwyT = s.T;
        s.Contacts = new bool[s.Wheels.Count]; for (int i = 0; i < s.Contacts.Length; i++) s.Contacts[i] = true;
        s.Rpm = Aero.RpmFor(s.A, 0, 0);
        foreach (var en in s.Eng) en.Rpm = s.Rpm;
        s.Wind = new WindState { FromDeg = 4, Kt = 5, Gust = 0.5 };
        Sim.Derive(s);

        var cp = new Cockpit(); cp.Type = type;
        var av = Avionics.CreateAvionics();
        cp.CurS = s; cp.CurAv = av;
        var sys = new Systems(cp.Sw);
        if (ctx == "cold") sys.SetCold(s);
        else if (ctx == "run") sys.SetRunning(s);
        var ctl = new Controls();
        var fl = new LessonState { S = s, Av = av, Free = true };
        var rig = new Rig { Cp = cp, Sys = sys, Ap = new Autopilot(), Ctl = ctl, Fl = fl, S = s, Av = av };
        ctl.Action(s, "parkBrake", null, true);   // a flight starts parked, as flight.js does
        return rig;
    }

    public static int Main(string[] args)
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        string path = args.Length > 0 ? args[0] : "golden-cockpit.jsonl";
        var lines = File.ReadAllLines(path);
        int total = 0, bad = 0, shown = 0;
        Rig rig = null; string curKey = "";
        foreach (var line in lines)
        {
            if (line.Length == 0) continue;
            var rec = (Dict)MiniJson.Parse(line);
            string type = (string)rec["type"], ctx = (string)rec["ctx"], id = (string)rec["id"];
            double dir = (double)rec["dir"]; bool wheel = (bool)rec["wheel"];
            string key = type + "/" + ctx;
            if (key != curKey)
            {
                curKey = key;
                rig = MakeRig(type, ctx);
                rig.Step(ctx == "run" ? 1 : 0.5);
            }
            total++;
            CtlIntent got = null; string err = "";
            try { got = rig.Cp.Act(id, dir, wheel); } catch (Exception e) { err = e.Message; }
            var want = rec["intent"] as Dict;
            bool ok = Eq(IntentDict(got), want) && err == (string)rec["err"];
            if (ok && rec.ContainsKey("bg")) ok = BgString(rig.Cp.Boeing) == (string)rec["bg"];
            if (!ok)
            {
                bad++;
                if (shown < 4000)
                {
                    shown++;
                    Console.WriteLine($"MISMATCH {type}/{ctx} {id} dir={dir} wheel={wheel}");
                    Console.WriteLine("  cs:   " + MiniJson.Stringify(IntentDict(got)) + (err != "" ? " ERR " + err : ""));
                    Console.WriteLine("  js:   " + MiniJson.Stringify(want));
                    if (rec.ContainsKey("bg")) { Console.WriteLine("  csbg: " + BgString(rig.Cp.Boeing)); Console.WriteLine("  jsbg: " + (string)rec["bg"]); }
                }
            }
            if (got != null) rig.Apply(got);
            rig.Step(0.05);
        }
        Console.WriteLine($"cockpit cs: {total - bad}/{total} intents match");
        return bad == 0 ? 0 : 1;
    }
}
