// CadetCockpit.cs — the cockpit's control logic, ported from cockpit.js: act()
// (a press or a wheel turn on a control → an intent) and Apply() (the intent →
// the systems, mirroring fly-mode.js's applyAct). The 3D meshes live in the
// Unity layer (CockpitMain), generated from data/cockpit-controls.json; this
// file is the behaviour, equivalence-tested against the JS original headlessly
// (BotCockpitCs vs golden-cockpit.jsonl, from the real controls-functional rig).
//
// The control sets: pa28 = 144, pa44 = 150, b737 = 96 — the current HTML's
// counts (individual circuit breakers, the dimmers, the audio panel's VOL /
// DISPLAY BACKUP included).
using System;
using System.Collections.Generic;

namespace Cadet
{
    // an act() intent: fly-mode.js's shapes, one field per kind
    public class CtlIntent
    {
        public string Type;        // flight | av | switch | select | prime | gearEmerg | exit | info | view
        public string Id;          // switch / select: the switches field
        public bool On;            // switch
        public object Value;       // select: string | double
        public string Name;        // flight: the action name
        public object Arg;         // flight: the action argument (double | null)
        public string What;        // av: the control word
        public object Dir;         // av: double | string | null
        public bool Big;           // av: the coarse step
        public string Text;        // info
        public string Focus;       // view
    }

    public class Cockpit
    {
        public readonly SwState Sw = new SwState();
        public State CurS;                       // cur.s — the live flight state (may be null off-flight)
        public AvionicsState CurAv;              // cur.av
        public BoeingState Boeing = new BoeingState();
        public string Type = "pa28";

        static readonly HashSet<string> ApWhats = new HashSet<string>
            { "AP", "AP_HDG", "AP_ALT", "AP_NAV", "AP_APR", "AP_VS", "AP_LVL", "FD", "MCP_ALT", "AT_ARM", "AT_SPD", "AP_VS_ADJ", "AP_LVLCHG", "AP_DISC" };

        static readonly string[] MagCycle = { "OFF", "R", "L", "BOTH", "START" };   // systems.js's MAG order (R before L)
        static readonly string[] FuelCycle = { "L", "R", "OFF" };

        // CB_TABLE: the breaker keys and their Japanese names, in panel order
        public static readonly string[] CbKeys =
            { "PFD", "MFD", "AHRS", "ADC", "GPS1", "GPS2", "AUDIO", "COM1", "COM2", "XPDR", "ENG", "FUEL PUMP", "PITOT", "TURN", "NAVLT", "STROBE", "LDGLT", "TAXILT", "BEACON", "ALTFLD", "MASTER" };
        public static readonly string[] CbNames =
            { "PFD コンピューター表示", "MFD コンピューター表示", "AHRS 姿勢方位", "ADC エアデータ", "GPS1", "GPS2", "AUDIO パネル", "COM1 無線", "COM2 無線", "XPDR トランスポンダ", "ENG 計器", "FUEL PUMP ポンプ", "PITOT ピトー ヒート", "TURN スタンバイ姿勢儀", "NAVLT 航法灯", "STROBE ストロボ", "LDGLT 着陸灯", "TAXILT タキシー灯", "BEACON ビーコン", "ALTFLD オルタネーター", "MASTER マスター電源" };

        public Cockpit()
        {
            // cockpit.js's initial switches
            Sw.Master = true; Sw.Bat = true; Sw.Alt = true; Sw.Avionics = true; Sw.FuelPump = true;
            Sw.Beacon = true; Sw.Nav = true; Sw.Strobe = true; Sw.Landing = false; Sw.Taxi = false; Sw.Pitot = false;
            Sw.Mag = "BOTH"; Sw.FuelSel = "L"; Sw.FuelSelL = "ON"; Sw.FuelSelR = "ON"; Sw.Xfeed = false;
            Sw.Mixture = 1; Sw.CarbHeat = false; Sw.PropCycleT = 0;
        }

        // ------------------------------------------------------------ switches field access
        public bool GetBool(string id)
        {
            switch (id)
            {
                case "master": return Sw.Master; case "bat": return Sw.Bat ?? false; case "alt": return Sw.Alt ?? false;
                case "avionics": return Sw.Avionics; case "fuelPump": return Sw.FuelPump; case "beacon": return Sw.Beacon;
                case "nav": return Sw.Nav; case "strobe": return Sw.Strobe; case "landing": return Sw.Landing;
                case "taxi": return Sw.Taxi; case "pitot": return Sw.Pitot; case "carbHeat": return Sw.CarbHeat;
                case "xfeed": return Sw.Xfeed ?? false;
                default:
                    if (id.StartsWith("cb") && id.Length > 2) return Sw.CbGet(id.Substring(2));
                    return false;
            }
        }

        public void SetField(string id, object value)
        {
            if (value is bool b)
            {
                switch (id)
                {
                    case "master": Sw.Master = b; return; case "bat": Sw.Bat = b; return; case "alt": Sw.Alt = b; return;
                    case "avionics": Sw.Avionics = b; return; case "fuelPump": Sw.FuelPump = b; return; case "beacon": Sw.Beacon = b; return;
                    case "nav": Sw.Nav = b; return; case "strobe": Sw.Strobe = b; return; case "landing": Sw.Landing = b; return;
                    case "taxi": Sw.Taxi = b; return; case "pitot": Sw.Pitot = b; return; case "carbHeat": Sw.CarbHeat = b; return;
                    case "xfeed": Sw.Xfeed = b; return;
                    default:
                        if (id.StartsWith("cb") && id.Length > 2) { Sw.Cb[id.Substring(2)] = b; return; }
                        return;
                }
            }
            if (value is string s)
            {
                switch (id)
                {
                    case "mag": Sw.Mag = s; return; case "fuelSel": Sw.FuelSel = s; return;
                    case "fuelSelL": Sw.FuelSelL = s; return; case "fuelSelR": Sw.FuelSelR = s; return;
                }
                return;
            }
            if (value is double n)
            {
                switch (id)
                {
                    case "mixture": Sw.Mixture = n; return; case "propCycleT": Sw.PropCycleT = n; return;
                    case "panelDim": Sw.PanelDim = n; return; case "switchDim": Sw.SwitchDim = n; return;
                }
            }
        }

        // ------------------------------------------------------------ intent constructors
        // avc(what) defaults dir to 1 in JS; avc(what, null) keeps the null (the
        // DIRECT cycle's end) — so the two shapes stay distinct here
        static CtlIntent Av(string what) { return new CtlIntent { Type = "av", What = what, Dir = 1.0, Big = false }; }
        static CtlIntent Av(string what, object dir, bool big = false)
        { return new CtlIntent { Type = "av", What = what, Dir = dir, Big = big }; }
        static CtlIntent Info(string text) { return new CtlIntent { Type = "info", Text = text }; }
        static CtlIntent SwitchI(string id, bool on) { return new CtlIntent { Type = "switch", Id = id, On = on }; }
        static CtlIntent SelectI(string id, object value) { return new CtlIntent { Type = "select", Id = id, Value = value }; }
        static CtlIntent FlightI(string name, object arg = null) { return new CtlIntent { Type = "flight", Name = name, Arg = arg }; }
        static CtlIntent ViewI(string focus) { return new CtlIntent { Type = "view", Focus = focus }; }

        // a rocker (and carb heat / crossfeed): a click toggles; the wheel sets —
        // up is on, down is off, and turning it the way it already points is nothing
        CtlIntent Rocker(string id, double dir, bool wheel)
        {
            bool cur = GetBool(id);
            bool on = wheel ? dir > 0 : !cur;
            return on == cur && wheel ? null : SwitchI(id, on);
        }

        // the mixture lever: the wheel leans a tenth at a time; a click goes to
        // full rich, or to idle cut-off when already rich (≥ 0.95)
        CtlIntent MixLever(double dir, bool wheel)
        {
            if (wheel)
            {
                double v = PhysMath.Clamp(Js.Round((Sw.Mixture + (dir > 0 ? 0.1 : -0.1)) * 10) / 10, 0, 1);
                return v == Sw.Mixture ? null : SelectI("mixture", v);
            }
            return SelectI("mixture", Sw.Mixture < 0.95 ? 1.0 : 0.0);
        }

        CtlIntent Dimmer(string id, double dir, bool wheel)
        {
            double cur = (id == "panelDim" ? Sw.PanelDim : Sw.SwitchDim) ?? 1;
            double v = wheel
                ? Js.Round(PhysMath.Clamp(cur + (dir > 0 ? 0.1 : -0.1), 0, 1) * 10) / 10
                : (cur >= 1 ? 0 : Math.Min(1, Js.Round((cur + 0.25) * 100) / 100));
            return v == cur ? null : SelectI(id, v);
        }

        // ================================================================ act()
        public CtlIntent Act(string id, double dir, bool wheel)
        {
            // ---- the 737's CDU keys: straight into the FMC's state machine
            if (id.StartsWith("cdu.")) { BoeingCdu.Key(Boeing, id.Substring(4)); return null; }
            // ---- the EFIS / DU selectors change the boeing glass's own state
            if (id == "efis.ndMode") { Boeing.NdMode = Boeing.NdMode == "MAP" ? "ROSE" : "MAP"; return null; }
            if (id == "efis.ndRange") { int[] steps = { 10, 20, 40, 80, 160 }; int ri = Array.IndexOf(steps, Boeing.NdRange); Boeing.NdRange = steps[(ri + 1) % steps.Length]; return null; }
            if (id == "du.out") { Boeing.DuOut = Boeing.DuOut == "PFD" ? "ND" : "PFD"; return null; }
            if (id == "du.inb") { Boeing.DuInb = Boeing.DuInb == "ND" ? "EICAS" : "ND"; return null; }
            if (id == "du.low") { Boeing.DuLow = Boeing.DuLow == "EICAS" ? "ND" : "EICAS"; return null; }

            // ---- views (the click-zoom / I-key focus targets)
            switch (id)
            {
                case "view.pfd": return ViewI("pfd");
                case "view.mfd": return ViewI("mfd");
                case "view.b737pfd": return ViewI("b737pfd");
                case "view.b737nd": return ViewI("b737nd");
                case "view.b737eicasu": case "view.b737eicasl": return ViewI("b737eicas");
                case "view.b737cdu": return ViewI("b737cdu");
            }

            // ---- softkeys (a key with no function says so)
            if ((id.StartsWith("pfd.sk") || id.StartsWith("mfd.sk")) && int.TryParse(id.Substring(6), out int ski))
            {
                string which = id.Substring(0, 3);
                var row = G1000Keys.SoftkeysOf(which, CurAv);
                var k = ski >= 1 && ski <= row.Count ? row[ski - 1] : null;
                var w = k != null && k.ActFn != null ? k.ActFn(CurAv) : null;
                return w != null ? Av((string)w[0], w[1]) : Info("このキーはこの飛行では使いません");
            }

            // ---- display knobs and keys (pfd.* / mfd.*)
            if (id.StartsWith("pfd.") || id.StartsWith("mfd."))
            {
                string rest = id.Substring(4);
                return DisplayControl(rest, dir, wheel);
            }

            // ---- the audio panel
            if (id.StartsWith("audio."))
            {
                string name = id.Substring(6);
                if (name == "VOL") return Info("音量はこの飛行では変えません");
                if (name == "DISPLAYBACKUP") return Info("表示のバックアップ切り替えはこの飛行では使いません（両画面とも生きています）");
                if (name == "COM1MIC") return CurAv != null && CurAv.AudioMic == "COM1" ? Info("送信はすでに COM1 です") : Av("MIC");
                if (name == "COM2MIC") return CurAv != null && CurAv.AudioMic == "COM2" ? Info("送信はすでに COM2 です") : Av("MIC");
                if (name == "COM1" || name == "COM2" || name == "NAV1" || name == "NAV2") return Av("MON", name);
                return Info("このボタンはこの飛行では使いません");
            }

            // ---- the standby dials are read, not operated
            if (id == "stby.asi") return Info("予備の速度計：PFD が使えないときの速度（ノット）");
            if (id == "stby.att") return Info("予備の姿勢指示器：PFD が使えないときの姿勢");
            if (id == "stby.alt") return Info("予備の高度計：PFD と同じ気圧設定で読みます");

            // ---- the MCP: knobs and buttons alike pass (dir, wheel) through avc
            if (id.StartsWith("mcp."))
            {
                switch (id.Substring(4))
                {
                    case "spd": return Av("AT_SPD", dir, wheel);
                    case "atArm": return Av("AT_ARM", dir, wheel);
                    case "fd": return Av("FD", dir, wheel);
                    case "ap": return Av("AP", dir, wheel);
                    case "disc": return Av("AP_DISC", dir, wheel);
                    case "hdg": return Av("HDG", dir, wheel);
                    case "hdgSel": return Av("AP_HDG", dir, wheel);
                    case "lvl": return Av("AP_LVLCHG", dir, wheel);
                    case "alt": return Av("MCP_ALT", dir, wheel);
                    case "altHold": return Av("AP_ALT", dir, wheel);
                    case "vs": return Av("AP_VS_ADJ", dir, wheel);
                    case "vsBtn": return Av("AP_VS", dir, wheel);
                    case "app": return Av("AP_APR", dir, wheel);
                    case "nav": return Av("AP_NAV", dir, wheel);
                }
            }
            if (id == "efis.baro") return wheel ? Av("BARO", dir) : Av("STD_BARO");
            if (id == "efis.baroUnit") return Av("ALT_UNIT");

            // ---- the circuit breakers
            if (id == "cb")
            {
                var outs = new List<string>();
                for (int ci = 0; ci < CbKeys.Length; ci++) if (Sw.CbGet(CbKeys[ci])) outs.Add(CbNames[ci]);
                return Info(outs.Count > 0
                    ? $"サーキット ブレーカー：{string.Join("・", outs)} が飛び出しています（その回路は切れています。押せば戻ります）"
                    : "サーキット ブレーカー：すべて押し込まれています");
            }
            if (id.StartsWith("cb.")) { string key = id.Substring(3); return SwitchI("cb" + key, !Sw.CbGet(key)); }

            // ---- the dimmers
            if (id == "dimmer.panel") return Dimmer("panelDim", dir, wheel);
            if (id == "dimmer.switch") return Dimmer("switchDim", dir, wheel);

            // ---- the rocker row (ids carry the sw. prefix; the intent's id does not)
            if (id.StartsWith("sw.")) return Rocker(id.Substring(3), dir, wheel);

            // ---- everything else, by id
            switch (id)
            {
                case "carbHeat": case "xfeed":
                    return Rocker(id, dir, wheel);
                case "mag":
                    {
                        int i = Array.IndexOf(MagCycle, Sw.Mag);
                        int j = (int)PhysMath.Clamp(i + (wheel ? dir : 1), 0, MagCycle.Length - 1);
                        return j == i ? null : SelectI("mag", MagCycle[j]);
                    }
                case "primer": return new CtlIntent { Type = "prime" };
                case "throttle": return FlightI("thrStep", dir >= 0 ? 1.0 : -1.0);
                case "speedbrake": return FlightI("spoiler");
                case "mixture": return MixLever(dir, wheel);
                case "prop":
                    {
                        if (CurS == null || !CurS.OnGround) return Info("プロペラのレバーは、前（高回転）のままにします");
                        bool anyCut = false; foreach (var e in CurS.Eng) if (e.Cut) anyCut = true;
                        if (anyCut) return Info("プロペラのサイクルは、両方のエンジンが回っているときに（ランナップで）");
                        return Sw.PropCycleT > 0 ? null : SelectI("propCycleT", 2.6);
                    }
                case "gear": return FlightI("gear");
                case "gearEmerg": return CurS != null && CurS.GearEmerg ? null : new CtlIntent { Type = "gearEmerg" };
                case "fuelSel":
                    {
                        int i = Array.IndexOf(FuelCycle, Sw.FuelSel);
                        string v = wheel
                            ? FuelCycle[(int)PhysMath.Clamp(i + (dir > 0 ? 1 : -1), 0, FuelCycle.Length - 1)]
                            : (Sw.FuelSel == "L" ? "R" : "L");
                        return v == Sw.FuelSel ? null : SelectI("fuelSel", v);
                    }
                case "fuelSelL": return SelectI("fuelSelL", Sw.FuelSelL == "ON" ? "OFF" : "ON");
                case "fuelSelR": return SelectI("fuelSelR", Sw.FuelSelR == "ON" ? "OFF" : "ON");
                case "flaps":
                    {
                        if (Type == "b737") return FlightI("flaps", dir);
                        var s = CurS; int n = s != null ? s.A.FlapLabels.Length : 4, i2 = s != null ? s.FlapIdx : 0;
                        if (dir > 0) return i2 < n - 1 ? FlightI("flaps") : Info("フラップはいちばん下（40°）です");
                        return i2 > 0 ? FlightI("flapsUp") : Info("フラップは上がっています（UP）");
                    }
                case "trim": return FlightI("trimStep", dir >= 0 ? -1.0 : 1.0);
                case "parkBrake": return FlightI("parkBrake");
                case "door": return new CtlIntent { Type = "exit" };
                case "compass": return Info("磁気コンパス：機首の磁方位（PFD が使えないときの予備）");
                case "yokeL": case "yokeR": return Info("操縦輪：W / S（↑ / ↓）で機首の上げ下げ、A / D（← / →）で傾き");
                case "pedals": return Info("ラダー ペダル：Q / E で踏みます。つま先のブレーキは B / Space");
            }
            return null;
        }

        // one G1000 display's knobs and keys (the part after "pfd." / "mfd.")
        CtlIntent DisplayControl(string rest, double dir, bool wheel)
        {
            // keys
            switch (rest)
            {
                case "navSwap": return Av("NAV_SWAP");
                case "comSwap": return Av("COM_SWAP");
                case "fpl": return Av("MFD_PAGE");
                case "proc": return Av("PROC");
                case "ent": return Av("KEY_ENT");
                case "clr": return Av("KEY_CLR");
                case "menu": return Info("このキーはこの飛行では使いません");
                case "direct":
                    {
                        if (CurAv != null && CurAv.FplEdit) return Av("FPL_PICK");
                        var wps = new List<string>();
                        foreach (var p in Avionics.WAYPOINTS) if (p.Kind != "ref") wps.Add(p.Id);
                        int i = CurAv != null ? wps.IndexOf(CurAv.Direct) : -1;
                        return Av("DIRECT", i + 1 < wps.Count ? (object)wps[i + 1] : null);
                    }
            }
            // knobs
            if (rest == "navVol" || rest == "comVol") return Info("音量はこの飛行では変えません");
            if (rest == "hdg") return wheel ? Av("HDG", dir) : (CurS != null ? Av("HDG_SYNC", Js.Round(Avionics.TrueToMag(CurS.Out.HdgTrue, FlightPhysics.MAGVAR_W))) : Av("HDG_SYNC", 360.0));
            if (rest == "range") return Av("RANGE", dir < 0 ? -1.0 : 1.0);
            // dual concentric knobs
            string knob = rest, part = null;
            int dot = rest.IndexOf('.');
            if (dot >= 0) { knob = rest.Substring(0, dot); part = rest.Substring(dot + 1); }
            double d = wheel ? dir : 1;
            switch (knob)
            {
                case "nav":
                    if (part == "outer") return Av("NAV_MHZ", d);
                    if (!wheel) return Av("NAV_SEL");
                    return Av("NAV_KHZ", d);
                case "com":
                    if (part == "outer") return Av("COM_MHZ", d);
                    if (!wheel) return Av("COM_SEL");
                    return Av("COM_KHZ", d);
                case "alt":
                    return part == "outer" ? Av("ALT", d, true) : Av("ALT", d);
                case "crs":
                    return part == "outer" ? Av("BARO", d) : Av("CRS", d);
                case "fms":
                    return Av("FPL_NEXT", d);
            }
            return null;
        }

        // ================================================================ Apply — fly-mode.js's applyAct
        // returns the toast text ("" for none). 'view' and 'exit' are returned for
        // the caller to act on: view → "view:<focus>", exit → "exit".
        public string Apply(CtlIntent d, Systems sys, Controls ctl, Autopilot ap, LessonState fl, bool freeFlight)
        {
            if (d == null) return "";
            var s = fl?.S;
            switch (d.Type)
            {
                case "flight":
                    if (d.Name == "parkBrake" && !freeFlight) return "課目の中ではパーキングブレーキは使いません";
                    return s != null ? ctl.Action(s, d.Name, d.Arg as double?, freeFlight) ?? "" : "";
                case "av":
                    if (ApWhats.Contains(d.What))
                    {
                        double dirN = d.Dir is double dn ? dn : 1;
                        return ap.Control(fl, d.What, dirN, d.Big) ?? "";
                    }
                    return CurAv != null ? AvionicsControl.Control(CurAv, d.What, d.Dir, d.Big) ?? "" : "";
                case "switch": SetField(d.Id, d.On); return "";
                case "select": SetField(d.Id, d.Value); return "";
                case "gearEmerg": if (s != null && !s.GearEmerg) { s.GearEmerg = true; return "非常ギア ハンドル：非常降ろし（ポンプ／フリー フォール）"; } return "";
                case "prime": { double n = sys.Prime(); return $"プライマー {School.Num0(n)} 回"; }
                case "view": return "view:" + d.Focus;
                case "exit": return "exit";
                case "info": return d.Text;
            }
            return "";
        }

        // the label a control shows now (cockpit.js's cp.label): the dynamic rows —
        // softkeys and the cb aggregate count. Static labels live in the data file.
        public string Label(string id, string baseLabel)
        {
            if ((id.StartsWith("pfd.sk") || id.StartsWith("mfd.sk")) && int.TryParse(id.Substring(6), out int ski))
            {
                string which = id.Substring(0, 3);
                var row = G1000Keys.SoftkeysOf(which, CurAv);
                var k = ski >= 1 && ski <= row.Count ? row[ski - 1] : null;
                string l = k != null ? k.ResolveLabel(CurAv) : "";
                return l != "" && k != null && k.ActFn != null ? $"{baseLabel}（{l}）" : baseLabel;
            }
            return baseLabel;
        }
    }
}
