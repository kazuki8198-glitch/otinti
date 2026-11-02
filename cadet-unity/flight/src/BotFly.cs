// CADET — BotFly.cs : flight-lab/test/bot.mjs ported 1:1 — the scripted test
// pilot. It drives the same inputs a keyboard pilot has and reads the current
// step's guide/targets, exactly like the JS original.
using System;
using System.Collections.Generic;

namespace Cadet
{
    public class BotFly
    {
        const double DEG = Math.PI / 180;
        static double Clamp(double v, double a, double b) { return PhysMath.Clamp(v, a, b); }
        static double W180(double a) { return School.W180(a); }

        public double? PBase; public double IThr; public double? LastIas; public int LastStep = -1;
        public bool Flare; public double? Base; public double? OeiP; public bool FlareF;
        public bool Sp, SpDone; public double SpTurn; public double? SpPrev;
        public double P0, P0F;

        public void Reset()
        {
            PBase = null; IThr = 0; LastIas = null; Flare = false; Base = null; OeiP = null; FlareF = false; Sp = false; SpDone = false; SpTurn = 0; SpPrev = null;
        }

        static void PitchTo(State s, double deg) { s.KeyHold = true; s.PTgt = Clamp(deg, -20, 22); s.PRate = 0; }
        static void BankTo(State s, double bankT) { var o = s.Out; double p = -s.W[2] / DEG; s.RIn = Clamp(0.045 * (bankT - o.Bank) - 0.012 * p, -1, 1); }
        static void HeadTo(State s, Ctx c, double hdgT, double maxBank = 25) { BankTo(s, Clamp(W180(hdgT - c.Hdg) * 1.5, -maxBank, maxBank)); }
        void SpeedThr(State s, Ctx c, double kt, double dt) { double e = kt - c.Kias; IThr = Clamp(IThr + e * 0.004 * dt, -0.4, 0.4); s.Thr = Clamp(s.Thr + (e * 0.02 + IThr * 0.5) * dt * 2, 0, 1); }
        void SpeedPitch(State s, Ctx c, double kt, double dt)
        {
            double dv = LastIas == null ? 0 : (c.Kias - LastIas.Value) / dt;
            if (PBase == null) PBase = c.Pitch;
            PBase = Clamp(PBase.Value + (c.Kias - kt) * 0.05 * dt, -15, 18);
            PitchTo(s, PBase.Value + 0.35 * (c.Kias - kt) + 1.5 * dv);
        }
        void VsPitch(State s, Ctx c, double vsT, double dt)
        {
            if (PBase == null) PBase = c.Pitch;
            PBase = Clamp(PBase.Value + (vsT - c.Vs) * 0.0012 * dt, -10, 15);
            PitchTo(s, PBase.Value + (vsT - c.Vs) * 0.004);
        }
        static double AltVs(Ctx c, double alt) { return Clamp((alt - c.Alt) * 3, -700, 700); }
        static void Rudder(State s, Ctx c)
        {
            if (s.A.Twin && s.Eng.Exists(e => !e.Run || e.Failed)) { s.Rud = Clamp(s.RudNeed + 0.04 * c.Beta, -1, 1); return; }
            s.Opts.AutoRud = true;
        }
        static double BrgTo(LessonState L, string id)
        {
            var w = Avionics.Wpt(id);
            return Avionics.TrueToMag(Avionics.NeBearing(School.Ne(L.S), new NePos(w.N, w.E)), FlightPhysics.MAGVAR_W);
        }

        public void Fly(LessonState L, double dt)
        {
            var s = L.S; var c = L.Last;
            var S = L.StepIdx >= 0 && L.StepIdx < L.Def.Steps.Count ? L.Def.Steps[L.StepIdx] : null;
            if (S == null || L.Done) return;
            if (L.StepIdx != LastStep) { LastStep = L.StepIdx; Reset(); }
            if (S.Checklist != null && L.Check != null)
            {
                if (S.Checklist.Contains("landing")) { s.FlapIdx = Math.Max(s.FlapIdx, s.A.Twin ? 1 : 3); if (!s.A.Gear.Fixed) s.GearDown = true; s.Mix = 1; s.FuelSel = s.Fuel[1] > s.Fuel[0] ? "R" : "L"; }
                if (S.Checklist.Contains("takeoff")) { s.FlapIdx = 0; s.Trim = 0; s.Thr = 0; s.FuelSel = s.Fuel[1] > s.Fuel[0] ? "R" : "L"; }
                if (S.Checklist.Contains("cruise")) { s.Mix = 0.85; }
                if (S.Checklist.Contains("engine_failure")) { s.FlapIdx = 0; s.GearDown = false; }
                School.ChecklistNext(L); return;
            }
            if (S.Atc != null && L.Atc != null) { School.AnswerAtc(L, L.Atc.Ok); return; }
            if (S.Observe) return;
            if (S.PropTo != null) { double cur = s.Prop; s.Prop = Clamp(cur + Clamp(S.PropTo.Value - cur, -dt * 0.8, dt * 0.8), 0, 1); }
            if (S.Estimate != null && !L.Extra.ContainsKey("estimate"))
            {
                var t = Syllabus.EstimateTruth(L, S.Estimate);
                Syllabus.SubmitEstimate(L, new Dictionary<string, object> { { "hdg", t.brg }, { "dist", t.dist }, { "eteMin", t.eteMin } });
                return;
            }
            Rudder(s, c);
            var g = S.G as GuideSpec ?? new GuideSpec();
            string name = S.Name ?? "";
            Func<string, double?> tv = k =>
            {
                TgtSpec sp;
                return S.Tgt != null && S.Tgt.TryGetValue(k, out sp) ? sp.Eval(L, c) : (double?)null;
            };
            double alt = tv("alt") ?? L.Alt0, hdg = tv("hdg") ?? L.Hdg0;
            if (name.Contains("離陸中止")) { s.Thr = 0; s.Brake = 1; s.Rud = Clamp(-0.06 * W180(c.Hdg - 360) - 0.02 * c.Cross, -1, 1); return; }
            if (c.OnGround && (name.Contains("離陸") || name.Contains("ローテーション") || name.Contains("滑走") || name.Contains("フルパワー")))
            {
                s.Brake = 0; s.Thr = 1; s.Opts.AutoRud = false;
                s.Rud = Clamp(-0.06 * W180(c.Hdg - 360) - 0.02 * c.Cross, -1, 1);
                s.PIn = c.Kias > s.A.VGet("rotate") - 1 ? 0.65 : 0; s.RIn = 0; return;
            }
            if (name.Contains("接地") || name.EndsWith("着陸") || name.Contains("滑走路視認"))
            {
                if (c.OnGround) { s.Thr = 0; s.Brake = c.GsK < 60 ? 1 : 0; s.PIn = 0; s.Opts.AutoRud = false; s.Rud = Clamp(-0.06 * W180(c.Hdg - 360) - 0.02 * c.Cross, -1, 1); return; }
                double crab0 = W180(c.Hdg - c.Trk);
                HeadTo(s, c, 360 - Clamp(c.Cross * 0.5, -8, 8) - Clamp(c.LatV * 2, -6, 6) + (c.AglR > 12 ? crab0 : 0), 8);
                if (c.AglR < 16 || Flare)
                {
                    if (!Flare) { Flare = true; P0 = c.Pitch; }
                    s.Thr = 0; PitchTo(s, Clamp(P0 + (16 - c.AglR) / 16 * 8 + Clamp((-c.Vs - 150) * 0.01, 0, 3), -2, 8));
                }
                else
                {
                    double vsT = -(c.GsK * 5.3) - Clamp((c.Gp - 3) * 250, -300, 300);
                    VsPitch(s, c, vsT, dt); SpeedThr(s, c, (S.G as GuideSpec)?.Kt ?? s.A.VGet("appr") - 2, dt);
                }
                return;
            }
            if (name.Contains("失速への進入")) { s.Thr = (L.SayText.Contains("パワーオン") || L.SayText.Contains("全開")) ? 1 : 0; PitchTo(s, Math.Min(c.Pitch + 1.0, 18)); HeadTo(s, c, hdg); return; }
            if (name.Contains("失速からの回復")) { s.Thr = 1; if (c.Kias < s.A.VGet("x")) PitchTo(s, 0); else PitchTo(s, 8); BankTo(s, 0); return; }
            if (S.Fail == "engine" || g.Pwr == "dead")
            {
                if (s.A.Twin)
                {
                    int dead = s.Eng.FindIndex(e => e.Failed);
                    double failT = L.Fail.ContainsKey("engL") ? L.Fail["engL"] : L.Fail.ContainsKey("engR") ? L.Fail["engR"] : L.T;
                    if (dead >= 0 && !s.Eng[dead].Feather && L.T - failT > 3) { s.Eng[dead].Feather = true; s.Eng[dead].Cut = true; }
                    s.Thr = 1; if (s.GearDown && c.AglR > 50) s.GearDown = false;
                    double kt2 = g.Kt ?? s.A.VGet("yse");
                    if (OeiP == null) OeiP = 5;
                    OeiP = Clamp(OeiP.Value + (c.Kias - kt2) * 0.04 * dt, -2, 9);
                    PitchTo(s, Clamp(OeiP.Value + 0.4 * (c.Kias - kt2), -4, 10));
                    int live = s.Eng[0].Failed ? 1 : -1;
                    double hdgArg = tv("hdg") != null ? hdg : ((c.RwyHdg != 0 && name.Contains("上昇")) ? 360 : hdg);
                    BankTo(s, 3 * live + Clamp(W180(hdgArg - c.Hdg) * 0.5, -5, 5));
                    return;
                }
                s.Thr = 0;
                SpeedPitch(s, c, S.Field != null && c.AglR < 300 ? (s.A.V.ContainsKey("glideLand") ? s.A.VGet("glideLand") : 66) : (g.Kt ?? s.A.VGet("glide")), dt);
                var pos = School.Ne(s); var R = FlightPhysics.LAB_RWY;
                if (S.Field != null)
                {
                    var F = S.Field;
                    double dF = Math.Sqrt(Math.Pow(pos.N - F.N, 2) + Math.Pow(pos.E - F.E, 2));
                    double uh = R.TrueHdg * DEG;
                    var gate = new NePos(F.N - 900 * Math.Cos(uh), F.E - 900 * Math.Sin(uh));
                    var aimF = c.AglR > 500 ? gate : new NePos(F.N, F.E);
                    double brgF = Avionics.TrueToMag(Avionics.NeBearing(pos, aimF), FlightPhysics.MAGVAR_W);
                    double brgToF = Avionics.TrueToMag(Avionics.NeBearing(pos, new NePos(F.N, F.E)), FlightPhysics.MAGVAR_W);
                    double needFt = dF * 3.28084 / 7.2;
                    double hT = brgF;
                    if (!SpDone && c.AglR - needFt > 800 && dF > 3000 && c.AglR > 900) Sp = true;
                    if (Sp)
                    {
                        hT = c.Hdg + 100;
                        SpTurn += Math.Abs(W180(c.Hdg - (SpPrev ?? c.Hdg))); SpPrev = c.Hdg;
                        if (c.AglR - needFt <= 150 || SpTurn > 340) { Sp = false; SpDone = true; }
                    }
                    else if (c.AglR > needFt + 250 && dF > 900 && c.AglR > 400) hT = brgF + (Math.Floor(L.T / 7) % 2 != 0 ? 55 : -55);
                    else if (dF < 1600) { double h = F.Hdg * DEG, dn = pos.N - F.N, de = pos.E - F.E, crossF = -dn * Math.Sin(h) + de * Math.Cos(h); hT = Math.Abs(crossF) > 150 ? brgToF : F.Hdg - Clamp(crossF * 0.3, -20, 20); }
                    HeadTo(s, c, hT, 30);
                    if (c.AglR < 40 || FlareF)
                    {
                        if (!FlareF) { FlareF = true; P0F = c.Pitch; }
                        s.Thr = 0; PitchTo(s, Clamp(P0F + (40 - c.AglR) / 40 * 9 + Clamp((-c.Vs - 150) * 0.012, 0, 4), -2, 10));
                    }
                    else if (c.AglR < 300 && dF < 1600) s.FlapIdx = 3;
                    return;
                }
                var aim = FlightPhysics.RwyToNE(R, c.AglR > 600 ? -1500 : 200, 0);
                double brg = Avionics.TrueToMag(Avionics.NeBearing(pos, new NePos(aim[0], aim[1])), FlightPhysics.MAGVAR_W);
                HeadTo(s, c, c.Along > -1700 && c.AglR < 700 && Math.Abs(c.Cross) < 600 ? 360 - Clamp(c.Cross * 0.3, -20, 20) : brg, 30);
                if (c.AglR < 350 && c.Along > -1500) s.FlapIdx = 2;
                if (c.AglR < 18) { s.Thr = 0; PitchTo(s, 5); }
                return;
            }
            string how = g.How ?? "level";
            if (g.Flaps != null && s.FlapIdx != g.Flaps.Value && !name.Contains("接地")) s.FlapIdx = g.Flaps.Value;
            if (!s.A.Gear.Fixed && !c.OnGround && c.AglR > 150 && c.Vs > 100 && s.GearDown && how == "climbFull") s.GearDown = false;
            if (how == "climbFull") { s.Thr = 1; SpeedPitch(s, c, g.Kt ?? 0, dt); HeadTo(s, c, S.Tgt != null && S.Tgt.ContainsKey("rhdg") ? 360 : hdg); }
            else if (name.Contains("減速と外形変更")) { s.Thr = c.Kias > 66 ? 0.25 : 0.5; VsPitch(s, c, AltVs(c, alt), dt); HeadTo(s, c, hdg, 10); if (c.Kias < s.A.VGet("fe") - 4 && s.FlapIdx < 2) s.FlapIdx++; }
            else if (name.Contains("アウトバウンド 1 分")) { SpeedThr(s, c, g.Kt ?? 100, dt); VsPitch(s, c, AltVs(c, alt), dt); if (L.St.T < 60) HeadTo(s, c, W180(L.Hdg0 + 180) + 360); else BankTo(s, 17); }
            else if (how == "turn" && name.Contains("インバウンドへ") && Math.Abs(L.St.Turned) > 150) { SpeedThr(s, c, g.Kt ?? 0, dt); VsPitch(s, c, AltVs(c, alt), dt); HeadTo(s, c, (L.Av.Crs != 0 ? L.Av.Crs : 360) + Clamp(c.Cdi * 37.5, -30, 30)); }
            else if (how == "turn")
            {
                double dir = name.Contains("左") ? -1 : 1;
                SpeedThr(s, c, g.Kt ?? 0, dt); VsPitch(s, c, AltVs(c, alt), dt);
                TgtSpec ab;
                BankTo(s, dir * (S.Tgt != null && S.Tgt.TryGetValue("abank", out ab) ? ab.Eval(L, c) : g.Bank ?? 30));
                if (S.Tgt != null && S.Tgt.ContainsKey("arate")) BankTo(s, Math.Abs(L.St.Turned) > ((name.Contains("アウトバウンド") || name.Contains("インバウンド")) ? 172 : 80) ? 0 : dir * (g.Bank ?? 17));
                if (name.Contains("90°") && Math.Abs(L.St.Turned) > 84) BankTo(s, 0);
            }
            else if (how == "rate")
            {
                if (Base == null) { Base = Clamp(Sim.SteadyState(s, g.Kt ?? 0, g.Fpm ?? 0, new SteadyOpts { AltFt = c.Alt }).Thr, 0, 1); s.Thr = Base.Value; }
                VsPitch(s, c, g.Fpm ?? 0, dt);
                double e = (g.Kt ?? 0) - c.Kias; IThr = Clamp(IThr + e * 0.004 * dt, -0.3, 0.3); s.Thr = Clamp(Base.Value + e * 0.02 + IThr, 0, 1); HeadTo(s, c, hdg);
            }
            else if (how == "approach" || how == "ils" || how == "pattern")
            {
                double vsT = how == "ils" ? -(c.GsK * 5.3) + Clamp(c.Gsd * 2.5, -2, 2) * 200 : how == "pattern" ? (g.Fpm ?? -500) : -(c.GsK * 5.3) - Clamp((c.Gp - 3) * 250, -300, 300);
                VsPitch(s, c, vsT, dt); SpeedThr(s, c, g.Kt ?? 0, dt);
                double crab = c.GsK > 30 ? W180(c.Hdg - c.Trk) : 0;
                double lat = (how == "ils" ? 360 + Clamp(c.Loc * 30, -30, 30) : 360 - Clamp(c.Cross * 0.12, -30, 30)) + crab;
                HeadTo(s, c, lat, 20);
            }
            else if (how == "oei")
            {
                s.Thr = 1;
                if (OeiP == null) OeiP = 5;
                OeiP = Clamp(OeiP.Value + (c.Kias - (g.Kt ?? 0)) * 0.04 * dt, -2, 9);
                PitchTo(s, Clamp(OeiP.Value + 0.4 * (c.Kias - (g.Kt ?? 0)), -4, 10));
                int live = s.Eng[0].Failed ? 1 : -1;
                BankTo(s, 3 * live + Clamp(W180(hdg - c.Hdg) * 0.4, -4, 4));
            }
            else if (how == "slow")
            {
                SpeedPitch(s, c, g.Kt ?? 0, dt);
                double e = alt - c.Alt; IThr = Clamp(IThr + e * 0.0004 * dt, -0.3, 0.3); s.Thr = Clamp(0.55 + e * 0.004 + IThr, 0, 1); HeadTo(s, c, hdg, 10);
            }
            else
            {
                SpeedThr(s, c, g.Kt ?? 100, dt);
                VsPitch(s, c, AltVs(c, alt), dt);
                double h = hdg;
                if (S.Tgt != null && (S.Tgt.ContainsKey("cdi") || S.Tgt.ContainsKey("loc"))) h = (L.Av.Crs != 0 ? L.Av.Crs : 360) + Clamp(c.Cdi * 37.5, -30, 30);
                if (name.Contains("ローカライザー") || name.Contains("ファイナルコース会合")) h = c.NavFlag || Math.Abs(c.Loc) > 0.64 ? (L.IntHdg ?? 330) : 360 + Clamp(c.Loc * 30, -30, 30);
                if (name.Contains("VOR 局へ") && !double.IsNaN(c.BrgV)) h = c.BrgV;
                if (name.Contains("コースの設定と会合") && !double.IsNaN(c.BrgV)) { L.Av.Cdi = "NAV1"; if (L.St.T < 1) { double cr = Js.Round(c.BrgV); L.Av.Crs = cr == 0 ? 360 : cr; } h = (L.Av.Crs != 0 ? L.Av.Crs : 360) + Clamp(c.Cdi * 37.5, -30, 30); }
                if (name.Contains("LAB RWY へ")) { var R = FlightPhysics.LAB_RWY; var p = School.Ne(L.S); h = Avionics.TrueToMag(Math.Atan2(R.E - p.E, R.N + 600 - p.N) / DEG, FlightPhysics.MAGVAR_W); }
                if (name.Contains("LAB-A")) h = BrgTo(L, "LABEA");
                if (name.Contains("LAB-F")) h = BrgTo(L, "LABEF");
                if (S.Tgt != null && S.Tgt.ContainsKey("trk")) h = hdg + (hdg - c.Trk);
                HeadTo(s, c, h);
            }
            LastIas = c.Kias;
        }

        public static LessonState RunLesson(string id, string levelId = "intro", double maxSec = 900)
        {
            double dt = 1.0 / 120;
            var bot = new BotFly();
            var L = School.StartLesson(id, levelId);
            for (int i = 0; i < maxSec * 120 && !L.Done; i++)
            {
                bot.Fly(L, dt);
                Sim.Step(L.S, dt);
                School.Update(L, dt);
            }
            return L;
        }
    }
}
