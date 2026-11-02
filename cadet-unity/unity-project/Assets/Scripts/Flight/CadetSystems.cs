// CADET — CadetSystems.cs : cadet/src/aircraft/systems.js ported — the
// engine and electrics behind the cockpit's switches: the fuller start
// (primer / flooding / catch timing / starter duty), the stops, the run-up
// gauge drops, the two-stage electrical bus with load shedding, oil, alerts.
// The switch object is shared with the cockpit layer, exactly as in the JS.
using System;
using System.Collections.Generic;

namespace Cadet
{
    public class SwState
    {
        public bool Master, Avionics, FuelPump, Beacon, Nav, Strobe, Landing, Taxi, Pitot;
        public string Mag = "OFF";
        public string FuelSel = "L";
        public double Mixture;
        public bool CarbHeat;
        public double PropCycleT;
        public bool PropCycled;
        public bool? Bat, Alt;                 // null = the split switches are not fitted (legacy master speaks)
        public string FuelSelL, FuelSelR;      // null = not fitted (twin selectors)
        public bool? Xfeed;                    // null = not fitted
        // (wave-2 / cockpit correctness) the circuit breakers, by CB_TABLE key
        // ('PFD', 'ALTFLD', 'MASTER', ...): present-and-true = pulled (its circuit
        // dead); absent = in, exactly as a JS switches object without the fields.
        public readonly Dictionary<string, bool> Cb = new Dictionary<string, bool>();
        public bool CbGet(string key) { bool v; return Cb.TryGetValue(key, out v) && v; }
        public double? PanelDim, SwitchDim;    // the dimmer knobs (null = full, as in JS)
    }

    public class SysEvent { public string Type, Why = ""; }
    public class AlertRec { public string Id, Level, Text; }

    public class SysSt
    {
        public string Eng = "off";
        public bool Dead, Warm, StarterTried, CrankLock;
        public double CrankT, CatchAt = double.PositiveInfinity, Primes, Rpm, LineT = 6, Oil, CrankHeat, CrankHeld, OilQ = 7;
        public double? OilT;
        public string Reason = "";
    }
    public class TwinEng
    {
        public string Eng = "off";
        public double CrankT, CatchAt = double.PositiveInfinity, Rpm, Oil, CrankHeat, CrankHeld, OilQ = 8;
        public double? OilT;
        public bool CrankLock;
    }
    public class BusState
    {
        public double Batt = 1, Standby = 1, Volts = 12.6, Amps, Gen, Load;
        public bool AltFail, Flat, BatOn, AltOn, PfdOn, MfdOn, StandbyOn = true;
        public bool CbAhrs, CbGps;             // (the glass reads these: a tripped AHRS / GPS breaker fails the PFD / the map)
        public int Shed;
    }

    public class Systems
    {
        public static readonly string[] MAG = { "OFF", "R", "L", "BOTH", "START" };
        public static class RUNUP { public const double Rpm = 2000, MaxDrop = 175, MaxDiff = 50, DropL = 120, DropR = 95, Carb = 70; }
        const double CRANK_RPM = 150, CATCH_RPM = 520, STARTER_MAX = 8, LINE_FUEL_S = 6;
        static double Clamp(double x, double a, double b) { return Math.Min(b, Math.Max(a, x)); }

        public static readonly Dictionary<string, string> NOCATCH = new Dictionary<string, string>
        {
            { "fuel", "燃料が来ていません。燃料セレクターをタンクに。" },
            { "mixture", "ミクスチャーをフル リッチにしてからかけます。" },
            { "prime", "エンジンが冷えているので、プライマーを 2〜3 回押してからかけます。" },
            { "flooded", "プライマーの押しすぎで、燃料が多すぎます。スロットルを半分ほど開けて、もう一度かけます（かかったらすぐに戻す）。" },
            { "starter", "スターターは長く回し続けないようにします。少し待ってから、もう一度。" },
            { "hot", "スターターを回しすぎて、熱で回らなくなりました。1分ほど冷ましてから、もう一度。" },
        };

        public readonly SwState Sw;
        public readonly SysSt St = new SysSt();
        public readonly BusState Elec = new BusState();
        public readonly TwinEng[] Twin = { new TwinEng(), new TwinEng() };
        double _hobbs = 471.2;
        public double Hobbs { get { return _hobbs; } }
        double? _faultDropL;
        string _lastSel;
        readonly List<SysEvent> _events = new List<SysEvent>();
        List<AlertRec> _alerts = new List<AlertRec>();
        public List<AlertRec> Alerts { get { return _alerts; } }

        public Systems(SwState sw) { Sw = sw; }

        public void SetFault(double? dropL) { _faultDropL = dropL != null && dropL.Value > 0 ? dropL : null; }
        public double? Fault { get { return _faultDropL; } }
        public void SetElecFault(bool on) { Elec.AltFail = on; }
        public bool ElecFault { get { return Elec.AltFail; } }
        public bool Running { get { return St.Eng == "run"; } }
        public bool Cranking { get { return St.Eng == "crank"; } }
        public double Rpm { get { return St.Rpm; } }
        public double Oil { get { return St.Oil; } }
        public double Primes { get { return St.Primes; } }
        public double? OilT { get { return St.OilT; } }
        public double OilQ { get { return St.OilQ; } }
        public bool RunningL { get { return Twin[0].Eng == "run"; } }
        public bool StarterHot { get { return St.CrankLock || Twin[0].CrankLock || Twin[1].CrankLock; } }
        public bool CbOut(string key) { return Sw.Cb.TryGetValue(key, out var v) && v; }
        public bool Powered { get { return (BatOnF() || AltOnF()) && !CbOut("MASTER"); } }
        public bool AvionicsOn { get { return (BatOnF() || AltOnF()) && !CbOut("MASTER") && Sw.Avionics; } }

        bool BatOnF() { return Sw.Bat != null ? Sw.Bat.Value : Sw.Master; }
        bool AltOnF() { return Sw.Alt != null ? Sw.Alt.Value : Sw.Master; }

        static void ApplyCold(SwState sw)
        {
            sw.Master = false; sw.Avionics = false; sw.FuelPump = false; sw.Beacon = false; sw.Nav = false; sw.Strobe = false; sw.Landing = false; sw.Taxi = false; sw.Pitot = false;
            sw.Mag = "OFF"; sw.FuelSel = "L"; sw.Mixture = 0; sw.CarbHeat = false; sw.PropCycleT = 0; sw.PropCycled = false;
        }
        static void ApplyRunning(SwState sw)
        {
            sw.Master = true; sw.Avionics = true; sw.FuelPump = true; sw.Beacon = true; sw.Nav = true; sw.Strobe = true; sw.Landing = false; sw.Taxi = false; sw.Pitot = false;
            sw.Mag = "BOTH"; sw.FuelSel = "L"; sw.Mixture = 1; sw.CarbHeat = false; sw.PropCycleT = 0;
        }

        void Cut(State s, bool on, int k = -1)
        {
            if (k < 0) { foreach (var e in s.Eng) { if (e == null) continue; e.Cut = on; if (!on) e.On = true; } }
            else { var e = s.Eng[k]; if (e != null) { e.Cut = on; if (!on) e.On = true; } }
            s.EngStopNoted = on;
        }
        void Sync(State s)
        {
            if (s == null || s.Eng == null) return;
            foreach (var e in s.Eng) { e.Mag = Sw.Mag; e.Mix = Sw.Mixture; }
            if (s.Eng.Count > 1 && Sw.FuelSelL != null && Sw.FuelSelR != null) { s.Eng[0].Sel = Sw.FuelSelL; s.Eng[1].Sel = Sw.FuelSelR; }
            if (Sw.Xfeed != null) s.Xfeed = Sw.Xfeed.Value;
        }

        public void SetCold(State s)
        {
            ApplyCold(Sw);
            if (Sw.Bat != null || Sw.Alt != null) { Sw.Bat = false; Sw.Alt = false; }
            St.Eng = "off"; St.Dead = false; St.CrankT = 0; St.Primes = 0; St.Warm = false; St.Rpm = 0; St.LineT = LINE_FUEL_S; St.Oil = 0; St.OilT = null; St.Reason = "";
            Elec.Batt = 1; Elec.Volts = 12.6; Elec.Amps = 0; Elec.Flat = false; Elec.Standby = 1; St.OilQ = 7; St.CrankHeat = 0; St.CrankLock = false;
            foreach (var t in Twin) { t.OilQ = 8; t.CrankHeat = 0; t.CrankLock = false; }
            if (s != null) { Cut(s, true); Sync(s); foreach (var e in s.Eng) e.Rpm = 0; s.Rpm = 0; }
            foreach (var t in Twin) { t.Eng = "off"; t.CrankT = 0; t.CatchAt = double.PositiveInfinity; t.Rpm = 0; t.Oil = 0; t.OilT = null; }
        }
        public void SetRunning(State s)
        {
            ApplyRunning(Sw);
            St.Eng = "run"; St.Dead = false; St.CrankT = 0; St.Warm = true; St.LineT = LINE_FUEL_S; St.Reason = "";
            if (s != null) { bool anyCut = false; foreach (var e in s.Eng) if (e.Cut) anyCut = true; if (anyCut) Cut(s, false); Sync(s); St.Rpm = s.Eng.Count > 0 ? s.Eng[0].Rpm : 0; }
            foreach (var t in Twin) { t.Eng = "run"; t.CrankT = 0; t.CatchAt = double.PositiveInfinity; t.Oil = 65; t.OilT = 190; t.OilQ = 8; }
            St.Oil = 70; St.OilT = 190; St.OilQ = 7; Elec.AltFail = false;
        }
        public void Adopt(State s)
        {
            if (St.Eng != "run" || s == null) { SetRunning(s); return; }
            bool anyCut = false; foreach (var e in s.Eng) if (e.Cut) anyCut = true;
            if (anyCut) Cut(s, false);
            Sync(s);
            St.Rpm = s.Eng.Count > 0 ? s.Eng[0].Rpm : 0; St.Dead = false;
        }
        public double Prime() { if (Sw.FuelSel != "OFF") St.Primes = Math.Min(St.Primes + 1, 9); return St.Primes; }
        double TankFuel(State s) { return Sw.FuelSel == "L" ? s.Fuel[0] : Sw.FuelSel == "R" ? s.Fuel[1] : 0; }
        public double CatchTime(State s)
        {
            if (Sw.FuelSel == "OFF" || TankFuel(s) < 0.2) { St.Reason = "fuel"; return double.PositiveInfinity; }
            if (Sw.Mixture < 0.7) { St.Reason = "mixture"; return double.PositiveInfinity; }
            if (St.Primes >= 6) { if (s.Thr >= 0.45) { St.Reason = ""; return 3.2; } St.Reason = "flooded"; return double.PositiveInfinity; }
            if (St.Warm) { St.Reason = ""; return 0.9; }
            if (St.Primes == 0) { St.Reason = "prime"; return double.PositiveInfinity; }
            St.Reason = "";
            return (St.Primes == 1 ? 2.6 : 1.2) + (Sw.FuelPump ? 0 : 0.4);
        }

        void Emit(string type, string why = "") { _events.Add(new SysEvent { Type = type, Why = why }); }

        void ElecUpdate(double dt, double rpmNow, bool cranking)
        {
            // the breakers sit between the switches and the bus: the MASTER breaker
            // out leaves the whole bus dead however the switches stand, the ALT FLD
            // breaker takes the alternator off the line, and each load's own breaker
            // unloads it. A switches object without the cb fields reads as all in.
            bool rawBat = BatOnF(), rawAlt = AltOnF();
            if (Sw.Bat != null && Sw.Alt != null) Sw.Master = rawBat || rawAlt;
            bool batOn = rawBat && !CbOut("MASTER"), altOn = rawAlt && !CbOut("MASTER") && !CbOut("ALTFLD");
            double gen = altOn && !Elec.AltFail ? Clamp((rpmNow - 500) / 500, 0, 1) * 55 : 0;
            bool onBat = gen <= 1 && batOn;
            int shed = onBat && Elec.Batt < 0.45 ? 1 : 0;
            double load = 0;
            if (Sw.Avionics) load += shed == 1 ? 4 : 9;
            if (Sw.Beacon && !CbOut("BEACON")) load += 2; if (Sw.Nav && !CbOut("NAVLT")) load += 2.5; if (Sw.Strobe && !CbOut("STROBE")) load += 1.5;
            if (shed == 0) { if (Sw.Landing && !CbOut("LDGLT")) load += 9; if (Sw.Taxi && !CbOut("TAXILT")) load += 6; if (Sw.Pitot && !CbOut("PITOT")) load += 4; }
            if (Sw.FuelPump && !CbOut("FUELPUMP")) load += 2.5;
            if (cranking) load += 65;
            if (!batOn && !altOn) load = 0;
            double net = gen - load;
            if (!batOn) net = 0;
            if (net > 0 && Elec.Batt >= 1) net *= 0.06;
            Elec.Batt = Clamp(Elec.Batt + net * dt / (17 * 3600), 0, 1);
            bool dead = Elec.Batt <= 0.001 && gen <= 1;
            Elec.Volts = dead ? 0 : gen > 1 ? 13.9 + 0.3 * (gen / 55) : batOn ? 11.3 + 1.5 * Elec.Batt : 0;
            Elec.Amps = dead || !batOn ? 0 : Js.Round(net);
            Elec.Flat = Elec.Batt <= 0.02;
            Elec.Gen = Js.Round(gen); Elec.Load = Js.Round(load); Elec.BatOn = batOn; Elec.AltOn = altOn; Elec.Shed = shed;
            bool busLive = gen > 1 || (batOn && !dead);
            Elec.PfdOn = busLive && !CbOut("PFD");
            Elec.MfdOn = busLive && shed == 0 && !CbOut("MFD");
            Elec.CbAhrs = CbOut("AHRS"); Elec.CbGps = CbOut("GPS1");
            if (gen > 1) Elec.Standby = Math.Min(1, Elec.Standby + dt / 3600);
            else if (!busLive) Elec.Standby = Math.Max(0, Elec.Standby - dt / (2.5 * 3600));
            Elec.StandbyOn = Elec.Standby > 0.02;
        }
        void OilTemp(SysSt holder, double dt, State s, bool running, double power)
        {
            double oatF = (s.Out != null ? s.Out.Oat : 15) * 9 / 5 + 32;
            if (holder.OilT == null) holder.OilT = oatF;
            double tgt = running ? 130 + 70 * Clamp(power, 0, 1) : oatF;
            holder.OilT += (tgt - holder.OilT.Value) * dt / (running ? 240 : 600);
        }
        void OilTemp(TwinEng holder, double dt, State s, bool running, double power)
        {
            double oatF = (s.Out != null ? s.Out.Oat : 15) * 9 / 5 + 32;
            if (holder.OilT == null) holder.OilT = oatF;
            double tgt = running ? 130 + 70 * Clamp(power, 0, 1) : oatF;
            holder.OilT += (tgt - holder.OilT.Value) * dt / (running ? 240 : 600);
        }

        public List<SysEvent> Update(double dt, State s)
        {
            _events.Clear();
            if (s == null) return _events;
            dt = Clamp(dt, 0, 0.25);
            Sync(s);
            if (_lastSel != null && s.FuelSel != _lastSel && (s.FuelSel == "L" || s.FuelSel == "R" || s.FuelSel == "OFF" || s.FuelSel == "BOTH")) Sw.FuelSel = s.FuelSel;
            s.Mix = Sw.Mixture; s.CarbHeat = Sw.CarbHeat;
            if (s.Eng.Count > 1 && Sw.FuelSelL != null && Sw.FuelSelR != null) _lastSel = s.FuelSel;
            else { s.FuelSel = Sw.FuelSel; _lastSel = s.FuelSel; }
            bool busLive = (Elec.Gen) > 1 || (Elec.BatOn && !Elec.Flat);
            s.BoostPump = Sw.FuelPump && busLive && !CbOut("FUELPUMP");
            s.PitotHeat = Sw.Pitot && busLive && Elec.Shed == 0 && !CbOut("PITOT");
            if (s.Eng.Count > 1) return TwinUpdate(dt, s);
            var e = s.Eng[0];
            bool master = BatOnF();
            if (St.Eng == "off" || St.Eng == "stopping")
            {
                if (Sw.Mag == "START")
                {
                    if (!master) { if (!St.StarterTried) { St.StarterTried = true; Emit("nostarter", "マスター スイッチが OFF なので、スターターが回りません。"); } }
                    else if (Elec.Batt <= 0.02) { if (!St.StarterTried) { St.StarterTried = true; Emit("nostarter", "バッテリーが上がっています。外部電源か整備を呼んでください。"); } }
                    else if (St.CrankLock) { if (!St.StarterTried) { St.StarterTried = true; Emit("nostarter", "スターターが熱を持っています。1分ほど冷ましてから、もう一度。"); } }
                    else { St.Eng = "crank"; St.CrankT = 0; St.CatchAt = CatchTime(s); Emit("crank"); }
                }
                else St.StarterTried = false;
                double wind = s.OnGround ? 0 : e != null ? e.Rpm : 0;
                St.Rpm = Math.Max(wind, St.Rpm - (St.Rpm * 1.6 + 140) * dt);
                if (St.Rpm <= 0.5 && St.Eng == "stopping") St.Eng = "off";
                St.Oil = Math.Max(0, St.Oil - 60 * dt);
            }
            if (St.CrankHeat < 0.4) St.CrankLock = false;
            if (St.Eng != "crank") { St.CrankHeld = 0; St.CrankHeat = Math.Max(0, St.CrankHeat - dt / 45); }
            if (St.Eng == "crank")
            {
                St.CrankT += dt; St.CrankHeld += dt; St.CrankHeat = Math.Min(1.2, St.CrankHeat + dt / 30);
                St.Rpm = CRANK_RPM * (0.8 + 0.2 * Math.Sin(St.CrankT * 2 * Math.PI * 4));
                if (St.CrankHeat >= 1 && !St.CrankLock) { St.CrankLock = true; Sw.Mag = "BOTH"; St.Eng = "off"; Emit("nocatch", NOCATCH["hot"]); }
                else if (Sw.Mag != "START" || !master) { St.Eng = "off"; }
                else if (St.CrankT >= St.CatchAt)
                {
                    St.Eng = "run"; St.Warm = true; St.Primes = 0; St.LineT = LINE_FUEL_S;
                    Cut(s, false); if (e != null) e.Rpm = CATCH_RPM; St.Rpm = CATCH_RPM;
                    Sw.Mag = "BOTH";
                    Emit("catch");
                    if (s.Thr > 0.35) Emit("surge", "スロットルが開きすぎています。かかった瞬間に回転が上がりすぎました。");
                }
                else if (St.CrankT >= STARTER_MAX)
                {
                    Sw.Mag = "BOTH"; St.Eng = "off";
                    Emit("nocatch", NOCATCH.TryGetValue(St.Reason, out var nc) ? nc : NOCATCH["starter"]);
                }
            }
            if (St.Eng == "run")
            {
                St.LineT = Sw.FuelSel == "OFF" ? St.LineT - dt : LINE_FUEL_S;
                string why = "";
                if (Sw.Mixture < 0.15) why = "ミクスチャー アイドル カットオフ";
                else if (Sw.Mag == "OFF") why = "マグネトー OFF";
                else if (St.LineT <= 0) why = "燃料セレクター OFF";
                if (why != "") { St.Eng = "stopping"; Cut(s, true); Emit("stop", why); }
                else if (e != null && (e.Failed || !e.FeedOk))
                {
                    // stopped by the physics itself (a lesson's failure, or starved:
                    // the selected tank dry once the lines are gone)
                    if (!St.Dead) { St.Dead = true; Emit("stop", e.Failed ? "故障" : "燃料切れ"); }
                    St.Rpm = e.Rpm; St.Oil = Math.Max(0, St.Oil - 30 * dt);
                }
                else
                {
                    St.Dead = false;
                    if (Sw.Mag == "START") Sw.Mag = "BOTH";
                    double r = e != null ? e.Rpm : 0, k = Clamp((r - 700) / 1300, 0, 1.25);
                    double drop = (Sw.Mag == "L" ? (_faultDropL ?? RUNUP.DropL) : Sw.Mag == "R" ? RUNUP.DropR : 0) * k + (Sw.CarbHeat ? RUNUP.Carb * k : 0);
                    St.Rpm = Math.Max(0, r - drop);
                    St.OilQ = Math.Max(0, St.OilQ - 0.08 * dt / 3600 * (0.5 + Clamp((St.Rpm - 650) / 2000, 0, 1)));
                    double oTgt = Clamp(55 + r * 0.012, 0, 85);
                    if (St.OilQ < 2.5) oTgt *= Clamp(0.3 + 0.7 * (St.OilQ / 2.5), 0.3, 1) * (r > 2000 ? 0.8 : 1);
                    St.Oil += (oTgt - St.Oil) * Math.Min(1, dt * 1.5);
                }
            }
            OilTemp(St, dt, s, St.Eng == "run", (St.Rpm - 650) / 2000);
            ElecUpdate(dt, St.Rpm, St.Eng == "crank");
            if (St.Eng == "run") _hobbs += dt / 3600;
            CollectAlerts(s);
            return _events;
        }

        string TwinState()
        {
            bool allRun = true, someCrank = false, someRun = false, someStop = false;
            foreach (var t in Twin) { if (t.Eng != "run") allRun = false; if (t.Eng == "crank") someCrank = true; if (t.Eng == "run") someRun = true; if (t.Eng == "stopping") someStop = true; }
            return allRun ? "run" : someCrank ? "crank" : someRun ? "half" : someStop ? "stopping" : "off";
        }

        List<SysEvent> TwinUpdate(double dt, State s)
        {
            bool master = BatOnF();
            double cyc = 0;
            if (Sw.PropCycleT > 0)
            {
                Sw.PropCycleT = Math.Max(0, Sw.PropCycleT - dt);
                cyc = Math.Sin(Math.PI * Clamp(1 - Sw.PropCycleT / 2.6, 0, 1));
                if (Sw.PropCycleT == 0 && s.OnGround) Sw.PropCycled = true;
            }
            if (Sw.Mag == "START")
            {
                int k = -1; for (int i = 0; i < Twin.Length; i++) if (Twin[i].Eng != "run") { k = i; break; }
                if (k < 0) Sw.Mag = "BOTH";
                else if (!master) { if (!St.StarterTried) { St.StarterTried = true; Emit("nostarter", "マスター スイッチが OFF なので、スターターが回りません。"); } }
                else if (Elec.Batt <= 0.02) { if (!St.StarterTried) { St.StarterTried = true; Emit("nostarter", "バッテリーが上がっています。外部電源か整備を呼んでください。"); } }
                else if (Twin[k].CrankLock) { if (!St.StarterTried) { St.StarterTried = true; Emit("nostarter", "スターターが熱を持っています。1分ほど冷ましてから、もう一度。"); } }
                else if (Twin[k].Eng != "crank") { Twin[k].Eng = "crank"; Twin[k].CrankT = 0; Twin[k].CatchAt = CatchTime(s); Emit("crank", k == 1 ? "右エンジン" : "左エンジン"); }
            }
            else St.StarterTried = false;
            for (int k = 0; k < Twin.Length; k++)
            {
                var t = Twin[k];
                var e = s.Eng[k];
                if (t.CrankHeat < 0.4) t.CrankLock = false;
                if (t.Eng != "crank") { t.CrankHeld = 0; t.CrankHeat = Math.Max(0, t.CrankHeat - dt / 45); }
                if (t.Eng == "crank")
                {
                    t.CrankT += dt; t.CrankHeld += dt; t.CrankHeat = Math.Min(1.2, t.CrankHeat + dt / 30); t.Rpm = CRANK_RPM * (0.8 + 0.2 * Math.Sin(t.CrankT * 2 * Math.PI * 4));
                    if (t.CrankHeat >= 1 && !t.CrankLock) { t.CrankLock = true; Sw.Mag = "BOTH"; t.Eng = "off"; Emit("nocatch", NOCATCH["hot"]); }
                    else if (Sw.Mag != "START" || !master) t.Eng = "off";
                    else if (t.CrankT >= t.CatchAt)
                    {
                        t.Eng = "run"; St.Warm = true; St.Primes = 0; St.LineT = LINE_FUEL_S;
                        Cut(s, false, k); if (e != null) e.Rpm = CATCH_RPM; t.Rpm = CATCH_RPM;
                        Sw.Mag = "BOTH"; Emit("catch", k == 1 ? "右エンジン" : "左エンジン");
                    }
                    else if (t.CrankT >= STARTER_MAX) { Sw.Mag = "BOTH"; t.Eng = "off"; Emit("nocatch", NOCATCH.TryGetValue(St.Reason, out var nc) ? nc : NOCATCH["starter"]); }
                }
                else if (t.Eng == "off" || t.Eng == "stopping")
                {
                    if (e != null && !e.Cut && t.Eng == "off") Cut(s, true, k);
                    double wind = s.OnGround ? 0 : e != null ? e.Rpm : 0;
                    t.Rpm = Math.Max(wind, t.Rpm - (t.Rpm * 1.6 + 140) * dt);
                    if (t.Rpm <= 0.5 && t.Eng == "stopping") t.Eng = "off";
                }
                else if (t.Eng == "run")
                {
                    if (e != null && (e.Failed || e.Feather)) { t.Rpm = e.Rpm; continue; }
                    // this engine's own valve shut, or its tank (and the crossfeed's)
                    // dry: the physics starves it once the lines are empty
                    if (e != null && !e.FeedOk) { t.Eng = "stopping"; Cut(s, true, k); Emit("stop", e.Sel == "OFF" ? "燃料セレクター OFF" : "燃料切れ"); continue; }
                    double lever = s.Thr < 0.045 ? 650 + s.Thr / 0.045 * 350 : 1000 + (s.Thr - 0.045) / 0.625 * 1000;
                    double r = Math.Min(e != null ? e.Rpm : 0, lever), kk = Clamp((r - 700) / 1300, 0, 1.25);
                    double drop = (Sw.Mag == "L" ? RUNUP.DropL : Sw.Mag == "R" ? RUNUP.DropR : 0) * kk + (Sw.CarbHeat ? RUNUP.Carb * kk : 0) + 400 * cyc * kk;
                    t.Rpm = Math.Max(0, r - drop);
                }
            }
            bool anyRun = Twin[0].Eng == "run" || Twin[1].Eng == "run";
            if (anyRun)
            {
                St.LineT = Sw.FuelSel == "OFF" ? St.LineT - dt : LINE_FUEL_S;
                string why = "";
                if (Sw.Mixture < 0.15) why = "ミクスチャー アイドル カットオフ";
                else if (Sw.Mag == "OFF") why = "マグネトー OFF";
                else if (St.LineT <= 0) why = "燃料セレクター OFF";
                if (why != "")
                {
                    for (int k = 0; k < Twin.Length; k++) if (Twin[k].Eng == "run") { Twin[k].Eng = "stopping"; Cut(s, true, k); }
                    Emit("stop", why);
                }
            }
            string was = St.Eng; St.Eng = TwinState();
            bool anyFailed = false; foreach (var e in s.Eng) if (e.Failed) anyFailed = true;
            bool hasStop = false; foreach (var ev in _events) if (ev.Type == "stop") hasStop = true;
            if (was == "run" && St.Eng != "run" && !hasStop && anyFailed) Emit("stop", "故障");
            Func<int, bool> live = k => (Twin[k].Eng == "run" || Twin[k].Eng == "crank") && !(s.Eng[k] != null && (s.Eng[k].Failed || s.Eng[k].Feather));
            St.Rpm = live(0) ? Twin[0].Rpm : live(1) ? Twin[1].Rpm : Math.Max(Twin[0].Rpm, Twin[1].Rpm);
            int on = 0; foreach (var t in Twin) if (t.Eng == "run") on++;
            St.Oil += ((on > 0 ? Clamp(55 + St.Rpm * 0.012, 0, 85) : 0) - St.Oil) * Math.Min(1, dt * 1.5);
            foreach (var t in Twin)
            {
                if (t.Eng == "run")
                {
                    t.OilQ = Math.Max(0, t.OilQ - 0.08 * dt / 3600 * (0.5 + Clamp((t.Rpm - 650) / 2000, 0, 1)));
                    double oTgt = Clamp(55 + t.Rpm * 0.012, 0, 85);
                    if (t.OilQ < 2.5) oTgt *= Clamp(0.3 + 0.7 * (t.OilQ / 2.5), 0.3, 1) * (t.Rpm > 2000 ? 0.8 : 1);
                    t.Oil += (oTgt - t.Oil) * Math.Min(1, dt * 1.5);
                }
                else t.Oil = Math.Max(0, t.Oil - 60 * dt);
                OilTemp(t, dt, s, t.Eng == "run", (t.Rpm - 650) / 2000);
            }
            ElecUpdate(dt, Math.Max(Twin[0].Rpm, Twin[1].Rpm), Twin[0].Eng == "crank" || Twin[1].Eng == "crank");
            if (on > 0) _hobbs += dt / 3600;
            CollectAlerts(s);
            return _events;
        }

        void CollectAlerts(State s)
        {
            var A = new List<AlertRec>();
            var running = new List<bool>();
            if (s != null && s.Eng != null) foreach (var e in s.Eng) running.Add(e != null && e.Run);
            var oils = new List<double>();
            if (s != null && s.Eng != null && s.Eng.Count > 1) { oils.Add(Twin[0].Oil); oils.Add(Twin[1].Oil); } else oils.Add(St.Oil);
            for (int i = 0; i < running.Count; i++) if (running[i] && (i < oils.Count ? oils[i] : 0) < 30) { A.Add(new AlertRec { Id = "OIL PRESS", Level = "warn", Text = "OIL PRESS LOW" }); break; }
            if (s != null && s.Fuel != null)
            {
                if (s.Fuel[0] < 3) A.Add(new AlertRec { Id = "FUEL L", Level = "caution", Text = "FUEL L LOW" });
                if (s.Fuel[1] < 3) A.Add(new AlertRec { Id = "FUEL R", Level = "caution", Text = "FUEL R LOW" });
            }
            if (St.CrankHeld > 10 || Twin[0].CrankHeld > 10 || Twin[1].CrankHeld > 10) A.Add(new AlertRec { Id = "STARTER", Level = "caution", Text = "STARTER ENGAGED" });
            if (St.CrankLock || Twin[0].CrankLock || Twin[1].CrankLock) A.Add(new AlertRec { Id = "STARTER HOT", Level = "caution", Text = "STARTER HOT" });
            bool anyRun = false; foreach (var r in running) if (r) anyRun = true;
            if (Elec.AltFail && anyRun) A.Add(new AlertRec { Id = "ALTERNATOR", Level = "caution", Text = "ALTERNATOR FAIL" });
            if (Elec.Volts > 0 && Elec.Volts < 12 && Elec.BatOn && (anyRun || (s != null && !s.OnGround))) A.Add(new AlertRec { Id = "LOW VOLTS", Level = "caution", Text = "LOW VOLTS" });
            if (s != null && s.Eng != null) foreach (var e in s.Eng) if (e != null && e.Run && e.FuelPress < 0.5) { A.Add(new AlertRec { Id = "FUEL PRESS", Level = "caution", Text = "FUEL PRESS LOW" }); break; }
            if (s != null && !s.OnGround && s.Out != null && s.Out.Agl < 2000 && s.A != null && s.A.Gear != null && !s.A.Gear.Fixed && s.GearPos < 0.999) A.Add(new AlertRec { Id = "GEAR", Level = "warn", Text = "GEAR UNSAFE" });
            A.Sort((a, b) =>
            {
                int la = a.Level == "warn" ? 0 : 1, lb = b.Level == "warn" ? 0 : 1;
                if (la != lb) return la - lb;
                return string.CompareOrdinal(a.Id, b.Id);
            });
            _alerts = A;
            if (s != null && s.Out != null) { var ol = new System.Collections.Generic.List<object>(); foreach (var a in A) ol.Add(a); s.Out.Alerts = ol; }   // s.out.alerts is shared with the physics' own list
        }
    }
}
