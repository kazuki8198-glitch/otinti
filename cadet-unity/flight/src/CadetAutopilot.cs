// CADET — CadetAutopilot.cs : cadet/src/flight/autopilot.js ported — the
// GFC700-class two-axis autopilot + flight director laws. In the JS the laws
// run on the CADET flight wrapper (flight.s / flight.av / flight.L); here the
// FL LessonState carries all three, so the wrapper collapses into it.
// drawApStrip (canvas) belongs to the Stage 3 UI layer and is not ported here.
using System;
using System.Collections.Generic;

namespace Cadet
{
    public class ApState
    {
        public bool On, Hdg, Alt, Nav, Apr, Vs, Lvl, LvlChg, GsCap;
        public double Flash;
    }
    public class FdState { public bool On; public double Bank, Pitch; }
    public class AtState { public bool Arm, On; public double Spd = 250; }   // the 737's autothrottle (av.at)

    public class Autopilot
    {
        public const double AP_MIN_ENGAGE_FT = 800;
        public const double AP_MIN_USE_FT = 200;
        static readonly string[] OVR_KEYS = { "KeyW", "KeyS", "KeyA", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight" };

        public bool On, Hdg, Alt, Nav, Apr, Vs, Lvl, Fd, GsCap, DiscTone;
        // (wave-2 / the 737's MCP) LVL CHG and the autothrottle — armed on the
        // panel, holding the selected speed with the thrust lever once airborne
        public bool LvlChg, AtArm, AtOn;
        public double AtSpd = 250, AtI;
        public double VsSel, FdBank, FdPitch, Flash, EngagePitch, Ovr;
        public double? PBase;
        public double LastVs;
        public LessonState L;
        public readonly ApState Display = new ApState();

        static double Clamp(double v, double a, double b) { return PhysMath.Clamp(v, a, b); }
        string LatName() { return Apr ? "APR" : Nav ? "NAV" : Hdg ? "HDG" : ""; }
        string VertName() { return Vs ? "VS" : Alt ? "ALT" : ""; }
        string Modes()
        {
            var parts = new List<string>();
            if (LatName() != "") parts.Add(LatName());
            if (VertName() != "") parts.Add(VertName());
            return parts.Count > 0 ? string.Join("・", parts) : (Lvl ? "LVL（翼水平）" : "ピッチ・ロール保持");
        }
        NavSolution NavNow(LessonState fL) { return AvionicsControl.NavSolve(fL.Av, School.Ne(fL.S), fL.S.Out, FlightPhysics.MAGVAR_W, FlightPhysics.LAB_RWY); }
        static double VsNow(LessonState fL) { return fL.Last != null ? fL.Last.Vs : fL.S.Out.Vsi; }

        public string Engage(LessonState fL, string what)
        {
            var s = fL?.S;
            if (fL == null || fL.Done || s == null) return "飛行が始まっていません";
            if (s.Crashed) return "";
            if (s.OnGround) return "オートパイロットは空中で接続します";
            if (s.Out.Agl < AP_MIN_ENGAGE_FT) return $"高度が足りません：オートパイロットの接続は対地 {School.Num0(AP_MIN_ENGAGE_FT)} ft 以上で";
            if (what == "AP_APR") { var n = NavNow(fL); if (n == null || n.Src != "LOC1" || (n.Flag != null && n.Flag != "")) return "APR：ローカライザーの信号がありません（CDI を NAV1 に）"; }
            On = true; L = fL; Flash = 0; Ovr = 0; Lvl = false; GsCap = false; LvlChg = false;
            Nav = what == "AP_NAV" || what == "AP_APR"; Apr = what == "AP_APR";
            Hdg = what == "AP" || what == "AP_HDG";
            Alt = what == "AP" || what == "AP_ALT" || what == "AP_VS";
            Vs = what == "AP_VS"; if (Vs) VsSel = Clamp(Js.Round(VsNow(fL) / 100) * 100, -1500, 1500);
            EngagePitch = s.Out.Pitch; PBase = null;
            return $"オートパイロット接続：{Modes()}（バグは PFD のノブで）";
        }

        public void Disconnect(bool flash)
        {
            On = false; Hdg = false; Alt = false; Nav = false; Apr = false; Vs = false; Lvl = false; GsCap = false; LvlChg = false; PBase = null; Ovr = 0;
            if (flash) { Flash = 2.5; DiscTone = true; }
            if (L != null && L.S != null && !L.S.OnGround) { L.S.KeyHold = true; L.S.PTgt = L.S.Out.Pitch; L.S.PRate = 0; }
        }

        public string Control(LessonState fL, string what) { return Control(fL, what, 1, false); }

        public string Control(LessonState fL, string what, double dir, bool big)
        {
            if (fL == null || fL.Av == null) return "";
            // the 737 MCP's own whats (dir / big come from the knob that was turned)
            if (what == "MCP_ALT") { var av = fL.Av; av.AltSel = Clamp(Js.Round((av.AltSel + (big ? 1000 : 100) * dir) / 100) * 100, 0, 41000); return ""; }
            if (what == "AT_SPD") { AtSpd = Clamp(AtSpd + (big ? 10 : 1) * dir, 100, 340); return ""; }
            if (what == "AT_ARM") { AtArm = !AtArm; if (!AtArm) { AtOn = false; AtI = 0; } return AtArm ? "A/T アーム：離陸後、選択速度を A/T が持ちます" : "A/T アーム解除"; }
            if (what == "AP_DISC") { if (On) { Disconnect(true); return "オートパイロット解除"; } return ""; }
            if (what == "AP_VS_ADJ")
            {
                if (!On) { string r = Engage(fL, "AP_VS"); if (!On) return r; }
                else if (!Vs) { Vs = true; LvlChg = false; PBase = null; if (fL.S != null) VsSel = Clamp(Js.Round(VsNow(fL) / 100) * 100, -1500, 1500); }
                double lim = fL.S != null && fL.S.A != null && fL.S.A.Jet ? 6000 : 1500;
                VsSel = Clamp(VsSel + (big ? 500 : 100) * dir, -lim, lim);
                return "";
            }
            if (what == "AP_LVLCHG")
            {
                if (!On) { string r = Engage(fL, "AP"); if (!On) return r; }
                LvlChg = !LvlChg;
                if (LvlChg) { Vs = false; Alt = true; PBase = null; }
                return LvlChg ? "LVL CHG：選択高度へ、速度なりの昇降率で" : "LVL CHG オフ";
            }
            if (what == "FD") { Fd = !Fd; if (fL != null) L = fL; if (Fd && fL.S != null) EngagePitch = fL.S.Out.Pitch; return Fd ? "FD オン：フライトディレクター表示" : "FD オフ"; }
            if (what == "AP") { if (On) { Disconnect(true); return "オートパイロット解除"; } return Engage(fL, "AP"); }
            if (what == "AP_LVL")
            {
                if (!On) { string r = Engage(fL, "AP"); if (!On) return r; }
                Hdg = Nav = Apr = Vs = Alt = false; Lvl = true; GsCap = false;
                if (fL.S != null) EngagePitch = fL.S.Out.Pitch;
                return "LVL：翼を水平に、いまのピッチを保ちます";
            }
            if (!On) return Engage(fL, what);
            if (what == "AP_HDG") { Hdg = !Hdg; if (Hdg) { Nav = Apr = false; Lvl = false; } return Hdg ? "HDG オン：方位バグへ" : "HDG オフ：翼は水平に保ちます"; }
            if (what == "AP_NAV") { Nav = !Nav; if (Nav) { Hdg = false; Lvl = false; } else Apr = false; return Nav ? "NAV オン：CDI ソースを追います" : "NAV オフ"; }
            if (what == "AP_APR")
            {
                if (!Apr) { var n = NavNow(fL); if (n == null || n.Src != "LOC1" || (n.Flag != null && n.Flag != "")) return "APR：ローカライザーの信号がありません（CDI を NAV1 に）"; }
                Apr = !Apr; if (Apr) { Nav = true; Hdg = false; Lvl = false; GsCap = false; }
                return Apr ? "APR オン：ローカライザーとグライドスロープへ" : "APR オフ（NAV は継続）";
            }
            if (what == "AP_VS")
            {
                Vs = !Vs;
                if (Vs && fL.S != null) VsSel = Clamp(Js.Round(VsNow(fL) / 100) * 100, -1500, 1500);
                if (Vs) { PBase = null; LvlChg = false; }
                return Vs ? $"VS オン：{(VsSel > 0 ? "+" : "")}{School.Num0(VsSel)} fpm（ALT は選択高度で待機）" : "VS オフ";
            }
            if (what == "AP_ALT")
            {
                Alt = !Alt;
                if (Alt) { PBase = null; Vs = false; LvlChg = false; }
                else if (fL.S != null) EngagePitch = fL.S.Out.Pitch;
                return Alt ? "ALT オン：選択高度へ" : "ALT オフ：いまのピッチを保ちます";
            }
            return "";
        }

        public void Pilot(LessonState pL, double dt)
        {
            // the autothrottle runs on its own arm, AP or no AP: a PI on the speed
            // error, writing the thrust lever the hands use (jet only)
            var sA = pL?.S;
            if (sA != null && sA.A != null && sA.A.Jet)
            {
                AtOn = AtArm && !sA.OnGround && !sA.Crashed;
                if (AtOn)
                {
                    double err = AtSpd - sA.Out.Ias;
                    AtI = Clamp(AtI + err * dt, -40, 40);
                    double rate = Clamp(0.006 * err + 0.0012 * AtI, -0.22, 0.22);
                    sA.Thr = Clamp(sA.Thr + rate * dt, 0, 1);
                }
                else AtI = 0;
            }
            if ((!On && !Fd) || pL != L) return;
            var s = pL.S; var av = pL.Av; var c = pL.Last; var o = s.Out;
            if (c == null || s.OnGround || s.Crashed) return;
            double bankT = 0;
            if (Nav || Apr)
            {
                var nav = AvionicsControl.NavSolve(av, School.Ne(s), o, FlightPhysics.MAGVAR_W, FlightPhysics.LAB_RWY);
                if (nav != null && (nav.Flag == null || nav.Flag == ""))
                {
                    double dots = nav.Dots;
                    double hdgCmd = nav.Src == "GPS"
                        ? (nav.Dtk ?? 0) + Clamp(dots * (Math.Abs(dots) >= 2 ? 16 : 10), -40, 40)
                        : nav.Crs + Clamp(dots * (nav.Src == "LOC1" ? 13 : 9), -30, 30);
                    if (!double.IsNaN(hdgCmd)) bankT = Clamp(Avionics.Wrap180(hdgCmd - c.Hdg) * 1.5, -25, 25);
                }
            }
            else if (Hdg) bankT = Clamp(Avionics.Wrap180(av.HdgBug - c.Hdg) * 1.5, -25, 25);
            double? vsT = null;
            if (Apr)
            {
                var nav = AvionicsControl.NavSolve(av, School.Ne(s), o, FlightPhysics.MAGVAR_W, FlightPhysics.LAB_RWY);
                if (nav != null && nav.GsDots != null && Math.Abs(nav.GsDots.Value) <= 1) GsCap = true;
                if (GsCap && nav != null && nav.GsDots != null) vsT = Clamp(-o.Gs * 5.31 + nav.GsDots.Value * 120, -1200, 300);
            }
            if (vsT == null && LvlChg)
            {
                // LVL CHG: towards the selected altitude at a speed-of-the-moment rate
                double dAlt = av.AltSel - c.Alt;
                if (Math.Abs(dAlt) <= 100) { LvlChg = false; Alt = true; PBase = null; }
                else vsT = Clamp(dAlt * 1.5, -2500, 2500);
            }
            if (vsT == null && Vs)
            {
                if (Math.Abs(av.AltSel - c.Alt) <= 100) { Vs = false; Alt = true; PBase = null; }
                else vsT = VsSel;
            }
            if (vsT == null && Alt) vsT = Clamp((av.AltSel - c.Alt) * 3, -700, 700);
            double pitchT;
            if (vsT != null)
            {
                if (PBase == null) { PBase = c.Pitch; LastVs = c.Vs; }
                PBase = Clamp(PBase.Value + (vsT.Value - c.Vs) * 0.0012 * dt, -10, 15);
                double dvs = Clamp((c.Vs - LastVs) / Math.Max(dt, 1e-4), -600, 600); LastVs = c.Vs;
                pitchT = Clamp(PBase.Value + (vsT.Value - c.Vs) * 0.004 - 0.004 * dvs, -20, 22);
            }
            else pitchT = Clamp(EngagePitch, -20, 22);
            FdBank = bankT; FdPitch = pitchT;
            if (!On) return;
            double p = -s.W[2] / PhysMath.DEG;
            s.RIn = Clamp(0.045 * (bankT - o.Bank) - 0.012 * p, -1, 1);
            s.KeyHold = true; s.PTgt = pitchT; s.PRate = 0;
            double d = Clamp(Sim.TrimLevel(s) - s.Trim, -0.06 * dt, 0.06 * dt);
            if (d != 0) { s.Trim += d; s.TrimTgt = null; }
        }

        public string Update(double dt, LessonState fL, Func<string, bool> inputDown)
        {
            if (Flash > 0) Flash = Math.Max(0, Flash - dt);
            if (!On) return "";
            var s = fL?.S;
            if (fL == null || fL != L || fL.Done || s == null || s.Crashed) { Disconnect(false); return ""; }
            if (s.OnGround) { Disconnect(false); return ""; }
            if (s.Out.Agl < AP_MIN_USE_FT) { Disconnect(true); return $"オートパイロット解除：対地 {School.Num0(AP_MIN_USE_FT)} ft 以下では使えません"; }
            if (s.Out.StallWarn) { Disconnect(true); return "オートパイロット解除：失速警報"; }
            bool manual = false;
            if (inputDown != null) foreach (var k in OVR_KEYS) if (inputDown(k)) { manual = true; break; }
            if (Math.Abs(s.PKey) > 0.35 || Math.Abs(s.RKey) > 0.35) manual = true;
            Ovr = manual ? Ovr + dt : 0;
            if (Ovr >= 0.3) { Disconnect(true); return "オートパイロット解除：操縦入力"; }
            return "";
        }

        public void Sync(AvionicsState av)
        {
            if (av == null) return;
            var d = av.Ap ?? (av.Ap = new ApState());
            d.On = On; d.Hdg = Hdg; d.Alt = Alt; d.Nav = Nav; d.Apr = Apr; d.Vs = Vs; d.Lvl = Lvl; d.Flash = Flash; d.LvlChg = LvlChg; d.GsCap = GsCap;
            Display.On = On; Display.Hdg = Hdg; Display.Alt = Alt; Display.Nav = Nav; Display.Apr = Apr; Display.Vs = Vs; Display.Lvl = Lvl; Display.Flash = Flash;
            var f = av.Fd ?? (av.Fd = new FdState());
            f.On = Fd || On; f.Bank = FdBank; f.Pitch = FdPitch;
            var at = av.At ?? (av.At = new AtState());
            at.Arm = AtArm; at.On = AtOn; at.Spd = AtSpd;
        }

        public void Reset()
        {
            On = false; Hdg = false; Alt = false; Nav = false; Apr = false; Vs = false; Lvl = false; Fd = false; GsCap = false; LvlChg = false; AtArm = false; AtOn = false; AtI = 0; Flash = 0; PBase = null; Ovr = 0; L = null;
        }
        public bool TakeDiscTone() { bool t = DiscTone; DiscTone = false; return t; }
    }
}
