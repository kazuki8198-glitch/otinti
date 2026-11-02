// Avionics equivalence (C#): mirrors bot-av-js.mjs.
using System;
using System.Collections.Generic;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotAvCs
{
    static readonly List<string> Out = new List<string>();
    static void Emit(Dict o) { Out.Add(MiniJson.Stringify(o)); }
    static Lst L(params object[] xs) { return new Lst(xs); }

    static Dict Radio(RadioPair r) { return new Dict { { "act", (double)r.Act }, { "stby", (double)r.Stby } }; }
    static Dict AvJson(AvionicsState av)
    {
        var mon = new Dict();
        foreach (var kv in av.Monitor) mon[kv.Key] = kv.Value;
        var d = new Dict
        {
            { "com1", Radio(av.Com1) }, { "com2", Radio(av.Com2) }, { "nav1", Radio(av.Nav1) }, { "nav2", Radio(av.Nav2) },
            { "audio", new Dict { { "mic", av.AudioMic }, { "monitor", mon } } },
            { "comSel", av.ComSel }, { "navSel", av.NavSel },
            { "hdgBug", av.HdgBug }, { "altSel", av.AltSel }, { "baro", av.Baro }, { "baroUnit", av.BaroUnit }, { "crs", av.Crs },
            { "cdi", av.Cdi }, { "obs", av.Obs }, { "brg1", av.Brg1 }, { "brg2", av.Brg2 }, { "xpdrIdent", av.XpdrIdent },
            { "fplEdit", av.FplEdit }, { "fplCursor", (double)av.FplCursor }, { "fplPick", (double)av.FplPick }, { "nrstSel", (double)av.NrstSel },
            { "xpdr", new Dict { { "code", (double)av.Xpdr.Code }, { "mode", av.Xpdr.Mode }, { "entry", av.Xpdr.Entry } } },
            { "pfdMenu", av.PfdMenu }, { "wind", av.Wind }, { "mfdPage", av.MfdPage }, { "mfdRangeIdx", (double)av.MfdRangeIdx }, { "mapNorthUp", av.MapNorthUp },
            { "direct", av.Direct }, { "timer", av.Timer },
        };
        if (av.Proc == null) d["proc"] = null;
        else
        {
            var p = new Dict { { "name", av.Proc.Name }, { "type", av.Proc.Type }, { "missed", av.Proc.Missed } };
            if (av.Proc.DaFt.HasValue) p["daFt"] = av.Proc.DaFt.Value;
            if (av.Proc.MdaFt.HasValue) p["mdaFt"] = av.Proc.MdaFt.Value;
            d["proc"] = p;
        }
        var wps = new Lst(); foreach (var w in av.Fpl.Wps) wps.Add(w);
        d["fpl"] = new Dict { { "wps", wps }, { "active", (double)av.Fpl.Active } };
        d["directFrom"] = av.DirectFrom == null ? null : (object)new Dict { { "n", av.DirectFrom.N }, { "e", av.DirectFrom.E }, { "id", av.DirectFromId } };
        var ack = new Dict(); foreach (var kv in av.Ack) ack[kv.Key] = kv.Value;
        d["_ack"] = ack;
        return d;
    }

    static Dict NavJson(NavSolution n)
    {
        var d = new Dict { { "src", n.Src }, { "dots", n.Dots }, { "toFrom", n.ToFrom }, { "dtk", n.Dtk }, { "dis", n.Dis }, { "ete", n.Ete },
            { "xtk", n.Xtk }, { "gsDots", n.GsDots }, { "brg", n.Brg }, { "from", n.From }, { "to", n.To }, { "flag", n.Flag }, { "crs", n.Crs }, { "cdiScale", n.CdiScale } };
        if (n.Radial.HasValue) d["radial"] = n.Radial.Value;
        if (n.Dme.HasValue) d["dme"] = n.Dme.Value;
        if (n.Obs) d["obs"] = true;
        return d;
    }

    public static void Main()
    {
        foreach (var kind in new[] { "COM", "NAV" })
        foreach (var start in new[] { 118000, 121700, 136975, 108000, 113500, 117950 })
        foreach (var part in new[] { "MHz", "kHz" })
        foreach (var dir in new[] { -1, 1 })
            Emit(new Dict { { "tag", "tune" }, { "kind", kind }, { "start", (double)start }, { "part", part }, { "dir", (double)dir }, { "r", (double)Avionics.Tune(start, part, dir, kind) } });

        {
            var av = Avionics.CreateAvionics();
            var script = new (string w, object d, bool big)[]
            {
                ("HDG", 1.0, false), ("HDG", -1.0, true), ("ALT", 1.0, false), ("ALT", -1.0, true), ("BARO", 1.0, false), ("BARO", -30.0, false), ("STD_BARO", null, false), ("CRS", 5.0, false), ("CRS", -370.0, false),
                ("COM_MHZ", 1.0, false), ("COM_KHZ", -1.0, false), ("COM_SWAP", null, false), ("COM_SEL", null, false), ("COM_KHZ", 3.0, false), ("NAV_MHZ", -1.0, false), ("NAV_KHZ", 1.0, false), ("NAV_SWAP", null, false), ("NAV_SEL", null, false),
                ("CDI", null, false), ("CDI", null, false), ("CDI", null, false), ("MIC", null, false), ("MON", "COM2", false), ("MFD_PAGE", null, false), ("MFD_PAGE", null, false), ("NRST_SEL", 1.0, false), ("KEY_ENT", null, false),
                ("PROC", null, false), ("PROC", null, false), ("PROC", null, false), ("PROC_RNAV", null, false), ("PROC_RNAV", null, false), ("PROC_RNAV", null, false),
                ("XPDR", null, false), ("XPDR_DIGIT", 4.0, false), ("XPDR_DIGIT", 5.0, false), ("XPDR_DIGIT", 2.0, false), ("XPDR_DIGIT", 7.0, false), ("XPDR_MODE", null, false), ("XPDR_IDENT", null, false), ("XPDR_BKSP", null, false),
                ("OBS", null, false), ("BRG1", null, false), ("BRG1", null, false), ("BRG2", null, false), ("RANGE", 1.0, false), ("RANGE", -9.0, false), ("NORTH_UP", null, false), ("WIND", null, false), ("ALERTS", null, false), ("ALERTS", null, false),
                ("MFD_FPL", null, false), ("KEY_ENT", null, false), ("FPL_PICK", 2.0, false), ("FPL_INSERT", null, false), ("FPL_NEXT", 1.0, false), ("FPL_INSERT", null, false), ("KEY_CLR", null, false), ("KEY_CLR", null, false),
                ("FPL_NEXT", 1.0, false), ("DIRECT", "LABEC", false), ("KEY_CLR", null, false), ("ALT_UNIT", null, false), ("HDG_SYNC", 123.0, false),
            };
            var rets = new Lst();
            foreach (var (w, d, big) in script) rets.Add(AvionicsControl.Control(av, w, d, big));
            Emit(new Dict { { "tag", "control" }, { "rets", rets }, { "av", AvJson(av) } });
        }

        {
            var positions = new[]
            {
                new NePos(0, -40000), new NePos(9000, -34000), new NePos(5000, -30000), new NePos(4000, -30000),
                new NePos(-10000, -39000), new NePos(20000, -25000), new NePos(-4600, -40000), new NePos(30000, -10000),
            };
            var setups = new Action<AvionicsState>[]
            {
                av => {},
                av => { av.Direct = "LABED"; },
                av => { av.Obs = true; av.Crs = 90; },
                av => { av.Cdi = "NAV1"; av.Nav1.Act = 113500; av.Crs = 270; },
                av => { av.Cdi = "NAV1"; av.Nav1.Act = 109900; },
                av => { av.Cdi = "NAV2"; av.Nav2.Act = 110300; },
                av => { AvionicsControl.Control(av, "PROC_RNAV"); },
                av => { av.Fail = new Dictionary<string, bool> { { "gps", true } }; },
                av => { av.Fpl.Active = 2; },
            };
            foreach (var setup in setups)
            foreach (var pos in positions)
            foreach (var altTrue in new[] { 255.0, 2000, 4500 })
            {
                var av = Avionics.CreateAvionics(); setup(av);
                var o = new OutRecord { Gs = 95, AltTrue = altTrue };
                var nav = AvionicsControl.NavSolve(av, pos, o, FlightPhysics.MAGVAR_W, FlightPhysics.LAB_RWY);
                var nrts = new Lst(); foreach (var id in av.Nrts) nrts.Add(id);
                Emit(new Dict { { "tag", "nav" }, { "nav", NavJson(nav) }, { "nrts", nrts } });
            }
        }

        {
            var cases = new (OutRecord o, List<EngState> engs)[]
            {
                (new OutRecord { Volts = 11.9, Amps = -2, Rpm = 2000, OilP = new[] { 60.0 }, Fuel = new[] { 10.0, 10.0 }, FuelPress = 1 }, new List<EngState> { new EngState { Run = true } }),
                (new OutRecord { Volts = 14, Amps = 5, Rpm = 2000, OilP = new[] { 10.0, 60.0 }, Fuel = new[] { 2.0, 10.0 }, FuelPress = 0.3 }, new List<EngState> { new EngState { Run = true }, new EngState { Run = true } }),
                (new OutRecord { Volts = 14, Amps = 5, Rpm = 0, OilP = new[] { 0.0 }, Fuel = new[] { 1.0, 1.0 } }, new List<EngState> { new EngState { Run = false } }),
                (new OutRecord { Alerts = new List<object> { "CUSTOM", new AlertItem { Id = "X1", Level = "warn", Text = "X one" }, new AlertItem { Text = "no id" } } }, new List<EngState>()),
                (new OutRecord { Volts = 12.6, Amps = 0, Rpm = 0, OilP = new double[0], Fuel = new[] { 20.0, 20.0 }, FuelPress = 0 }, new List<EngState> { new EngState { Run = false } }),
            };
            foreach (var (o, engs) in cases)
            {
                var r = new Lst();
                foreach (var a in AvionicsControl.CollectAlerts(null, o, engs)) r.Add(new Dict { { "id", a.Id }, { "tier", a.Tier }, { "text", a.Text } });
                Emit(new Dict { { "tag", "alerts" }, { "r", r } });
            }
        }

        {
            var av0 = Avionics.CreateAvionics();
            var fpl = new Lst(); foreach (var id in Avionics.FplCatalog()) fpl.Add(id);
            var hf = new Lst(); foreach (var x in new[] { 0.0, 1, 359.6, 360, 720 }) hf.Add(Avionics.HdgFmt(x));
            var ete = new Lst(); foreach (var x in new double?[] { null, 0, 65, 3661 }) ete.Add(Avionics.EteFmt(x));
            Emit(new Dict { { "tag", "misc" }, { "xpdrGnd", Avionics.XpdrEffMode(av0, true) }, { "xpdrAir", Avionics.XpdrEffMode(av0, false) }, { "fpl", fpl }, { "hdgFmt", hf }, { "ete", ete } });
        }

        File.WriteAllLines("digest-av-cs.jsonl", Out);
        Console.WriteLine("av cs digest lines: " + Out.Count);
    }
}
