// CadetLinePilot.cs — the PF line sector flown for real in the 737 physics
// (Stage 13): a compact pilot law (the BotFly gains — pitch attitude-hold via
// PTgt, BankTo/HeadTo, SpeedThr with an integral term) flies the duty's route
// from the origin runway to the destination runway, feeding CadetLineDuty
// real observations (position / altitude / speeds / ground state), so phase
// changes, the in-flight event, and the touchdown score all come from the
// actual flight. Cruise is position-compressed (the state advances along its
// track while far out); the duty's own Compress() is not used.
using System;

namespace Cadet
{
    public class LinePilot
    {
        public State S;
        public readonly CadetLineDuty Duty;
        public double T;
        public bool Done;
        public string Note = "";
        public string Note2 = "";
        double pBase, iThr; bool pBaseSet;
        bool rejoin;
        RwyDef destRwy;
        const double DEG = Math.PI / 180;
        static double Clamp(double v, double a, double b) { return v < a ? a : v > b ? b : v; }
        static double W180(double a) { return ((a % 360) + 540) % 360 - 180; }

        // the duty may divert (a weather event answered with a divert): follow it
        void SyncDest()
        {
            var dest = Duty.Destination;
            if (destRwy == null || destRwy.Id != dest.Id)
                destRwy = new RwyDef { Id = dest.Id, N = dest.N, E = dest.E, TrueHdg = dest.TrueHdg, Len = dest.Len, Wid = dest.Wid, ElevFt = dest.ElevFt };
        }

        public LinePilot(CadetLineDuty duty, double seed)
        {
            Duty = duty;
            var orig = duty.Origin;
            S = Sim.NewState((int)(seed * 977 + 13), "b737");
            var rwy = new RwyDef { Id = orig.Id, N = orig.N, E = orig.E, TrueHdg = orig.TrueHdg, Len = orig.Len, Wid = orig.Wid, ElevFt = orig.ElevFt };
            Sim.PlaceOnRunway(S, rwy, 60);
            SyncDest();
            S.FlapIdx = 1;
            Note = "実飛行：出発滑走路に配置（フラップ 5）";
        }

        public double DistDest() { double dn = destRwy.N - (-S.Pos[2]), de = destRwy.E - S.Pos[0]; return Math.Sqrt(dn * dn + de * de); }
        double BrgDest() { double dn = destRwy.N - (-S.Pos[2]), de = destRwy.E - S.Pos[0]; return Math.Atan2(de, dn) / DEG; }

        void PitchTo(double deg) { S.KeyHold = true; S.PTgt = Clamp(deg, -20, 22); S.PRate = 0; }
        void BankTo(double bankT) { var o = S.Out; double p = -S.W[2] / DEG; S.RIn = Clamp(0.045 * (bankT - o.Bank) - 0.012 * p, -1, 1); }
        void HeadTo(double hdgT, double maxBank = 25) { BankTo(Clamp(W180(hdgT - S.Out.HdgTrue) * 1.5, -maxBank, maxBank)); }
        void VsPitch(double vsT, double dt)
        {
            var o = S.Out;
            if (!pBaseSet) { pBase = o.Pitch; pBaseSet = true; }
            pBase = Clamp(pBase + (vsT - o.Vsi) * 0.0012 * dt, -10, 15);
            PitchTo(pBase + (vsT - o.Vsi) * 0.004);
        }
        void SpeedThr(double kt, double dt)
        {
            double e = kt - S.Out.Ias;
            iThr = Clamp(iThr + e * 0.004 * dt, -0.4, 0.4);
            S.Thr = Clamp(S.Thr + (e * 0.02 + iThr * 0.5) * dt * 2, 0, 1);
        }
        static double AltVs(double alt, double cur, double cap) { return Clamp((alt - cur) * 3, -cap, cap); }

        void PilotStep(double dt)
        {
            SyncDest();
            var o = S.Out;
            string ph = Duty.Phase;
            bool eventHold = Duty.Event != null && Duty.EventAnswer == null && ph == "descent";
            if (ph == "depart" || ph == "dispatch")
            {
                S.Thr = 1; S.Brake = 0;
                S.Rud = Clamp(-0.08 * W180(o.HdgTrue - Duty.Origin.TrueHdg), -1, 1);
                PitchTo(o.Ias > 148 ? 12 : 0);
            }
            else if (ph == "climb")
            {
                if (S.GearDown && o.Agl > 100) S.GearDown = false;
                if (o.Ias > 210 && S.FlapIdx > 0) S.FlapIdx = 0;
                HeadTo(o.AltTrue < 3000 ? Duty.Origin.TrueHdg : BrgDest());
                VsPitch(AltVs(Duty.Route.CruiseAltFt, o.AltTrue, 2500), dt);
                SpeedThr(280, dt);
            }
            else if (ph == "cruise")
            {
                HeadTo(BrgDest());
                VsPitch(AltVs(Duty.Route.CruiseAltFt, o.AltTrue, 1200), dt);
                SpeedThr(295, dt);
            }
            else if (ph == "descent" || ph == "approach")
            {
                // final-approach geometry: steer to a 13 km FAF on the extended
                // centreline first, then fly the runway heading with a cross-track
                // correction (aiming directly at the touchdown point from close
                // range just orbits it — the turn radius is ~2 km at 145 kt)
                double n = -S.Pos[2], e = S.Pos[0];
                var (along, cross) = FlightPhysics.RwyCoords(destRwy, n, e);
                double aimAlong = -destRwy.Len / 2 + 400;
                double dnA = along - aimAlong;
                double distAim = Math.Sqrt(dnA * dnA + cross * cross);
                // 68 ft is the contact altitude (55 ft ground + gear): the profile runs
                // on the along-track distance to the aim point. Until established
                // (|cross| < 1,800 m on the approach side) the flight holds 2,600 ft —
                // the flat 55 ft world touches down anywhere, so it must not come
                // down abeam the field.
                double altTgt = 68 + Math.Max(0, -dnA) * 0.056 * 3.28084;
                bool established = Math.Abs(cross) < 1800 && along < 2000;
                if (!established) altTgt = Math.Max(altTgt, 2600);
                if (eventHold) altTgt = Math.Max(S.Out.AltTrue, 3000);
                double vsCap = S.Out.Agl < 400 ? 1100 : 1800;
                double vsT = Clamp((altTgt - S.Out.AltTrue) * 6, -vsCap, vsCap);
                if (S.Out.Agl < 120) vsT = Math.Max(vsT, -320);
                else if (S.Out.Agl < 50) vsT = Math.Max(vsT, -200);
                VsPitch(vsT, dt);
                if (established)
                {
                    HeadTo(destRwy.TrueHdg - Clamp(cross * 0.012, -14, 14), 12);
                    Note2 = $"final along={along:F0} cross={cross:F0} altTgt={altTgt:F0}";
                }
                else
                {
                    // from the wrong side (a return to the departure field): aim at a
                    // far gate on the centreline extension first, then the FAF
                    double gateAlong = along > -8000 ? -26000 : -13000;
                    var gate = FlightPhysics.RwyToNE(destRwy, gateAlong, 0);
                    double dnF = gate[0] - n, deF = gate[1] - e;
                    HeadTo(Math.Atan2(deF, dnF) / DEG, 20);
                    Note2 = $"gate along={along:F0} cross={cross:F0} altTgt={altTgt:F0}";
                }
                double spd = distAim > 60000 ? 280 : distAim > 25000 ? 230 : distAim > 15000 ? 195 : distAim > 9000 ? 170 : distAim > 5000 ? 152 : 143;
                if (eventHold) spd = 250;
                SpeedThr(spd, dt);
                if (!eventHold)
                {
                    // the 737's four flap positions in this physics: 0 UP / 1 (5°) / 2 (15°) / 3 (40°)
                    if (distAim < 20000 && S.FlapIdx < 1) S.FlapIdx = 1;
                    if (distAim < 12000 && S.FlapIdx < 2) S.FlapIdx = 2;
                    if (distAim < 9500 && !S.GearDown) S.GearDown = true;
                    if (distAim < 9000 && S.FlapIdx < 3) S.FlapIdx = 3;
                }
                // a divert far away: clean up again and re-route
                if (distAim > 30000)
                {
                    if (S.Out.Ias > 210 && S.FlapIdx > 0) S.FlapIdx = 0;
                    if (S.GearDown && S.Out.Agl > 100) S.GearDown = false;
                }
                if (S.OnGround) { S.Thr = 0; S.Spoiler = 1; if (S.Out.Gs > 60) S.Rev = 0.7; S.Brake = S.Out.Gs > 40 ? 0.4 : 1; }
            }
            else if (ph == "landed")
            {
                S.Thr = 0; S.Rev = o.Gs > 60 ? 0.7 : 0;
                S.Brake = o.Gs > 40 ? 0.4 : 1;
            }
        }

        void FeedObs()
        {
            var o = S.Out;
            Duty.Update(new CadetLineDuty.Obs
            {
                T = T, AltFt = o.AltTrue, Ias = o.Ias, Mach = o.Mach, VsFpm = o.Vsi,
                HeadingDeg = Avionics.TrueToMag(o.HdgTrue, FlightPhysics.MAGVAR_W),
                DistDestM = DistDest(), N = -S.Pos[2], E = S.Pos[0],
                OnGround = S.OnGround, Stopped = S.OnGround && o.Gs < 0.5,
            });
        }

        /// <summary>Advance the flight by dtSim seconds of sim time.</summary>
        public void Step(double dtSim)
        {
            double h = 1.0 / 120; int steps = (int)Math.Round(dtSim / h); double feedAcc = 0;
            double compBudget = dtSim * 2500;   // cruise compression: at most 2.5 km of extra track per sim second, and only while tracking toward the destination
            for (int i = 0; i < steps; i++)
            {
                PilotStep(h);
                Sim.Step(S, h);
                T += h; feedAcc += h;
                if (compBudget > 0 && (Duty.Phase == "cruise" || Duty.Phase == "descent") && DistDest() > 62000
                    && Math.Abs(W180(S.Out.Trk - BrgDest())) < 30)
                {
                    double adv = Math.Min(25, compBudget);
                    double th = S.Out.Trk * DEG;
                    S.Pos[0] += Math.Sin(th) * adv; S.Pos[2] -= Math.Cos(th) * adv;
                    compBudget -= adv;
                    Sim.Derive(S);
                }
                if (feedAcc >= 0.25) { FeedObs(); feedAcc = 0; }
                if (Duty.Phase == "debrief") break;
            }
            FeedObs();
            Done = Duty.Phase == "debrief" || S.Dead;
            var o = S.Out;
            Note = $"実飛行 {Duty.Phase}：高度 {o.AltTrue:F0} ft／IAS {o.Ias:F0} kt／目的地まで {DistDest() / 1000:F1} km" + (S.Dead ? "（機体損傷：" + S.CrashReason + "）" : "");
        }
    }
}
