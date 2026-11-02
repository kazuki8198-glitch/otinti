// CADET — CadetSchoolEngine.cs : school.js's lesson runtime (ctx, placement,
// startLesson, the step machine, grading, checklists, ATC, free flight,
// progress sanitising). Part of the School partial class.
using System;
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public static partial class School
    {
        public static NePos Ne(State s) { return new NePos(-s.Pos[2], s.Pos[0]); }   // JS ph.ne(s): n = -pos[2], e = pos[0]
        static double VOr(Aircraft A, string key, double def) { double v; return A.V.TryGetValue(key, out v) ? v : def; }

        // ---------------------------------------------------------------- ctx
        public static Ctx CtxOf(LessonState L, double dt = 1.0 / 60)
        {
            var s = L.S; var o = s.Out; var av = L.Av;
            var R = FlightPhysics.LAB_RWY; double varW = FlightPhysics.MAGVAR_W;
            var pos = Ne(s);
            var nav = AvionicsControl.NavSolve(av, pos, o, varW, R);
            var rc = FlightPhysics.RwyCoords(R, pos.N, pos.E);
            double hdg = Avionics.TrueToMag(o.HdgTrue, varW);
            double prev = L.PrevHdg ?? hdg; L.PrevHdg = hdg;
            double rate = W180(hdg - prev) / Math.Max(dt, 1e-3);
            L.RateF = L.RateF + (rate - L.RateF) * Math.Min(1, dt * 3);   // JS: rateF starts at 0, always the smoothing branch
            double aglR = o.Agl, aim = 300;
            double gp = rc.along < aim - 50 ? Math.Atan2(Math.Max(aglR / PhysMath.FT, 0), aim - rc.along) / DEG : 3;
            double h = R.TrueHdg * DEG, latV = s.Vel[0] * Math.Cos(h) + s.Vel[2] * Math.Sin(h);
            var vor = Avionics.NAVAIDS.Find(x => x.Type == "VOR");
            double dmeV = Avionics.NeDistNm(new NePos(vor.N, vor.E), pos);
            double brgV = Avionics.TrueToMag(Avionics.NeBearing(pos, new NePos(vor.N, vor.E)), varW);
            int engRun = 0; foreach (var e in s.Eng) if (e.Run) engRun++;
            return new Ctx
            {
                Dt = dt, T = L.T, Alt = Avionics.IndicatedAlt(o.AltTrue, s.Qnh, av.Baro), AltTrue = o.AltTrue, Agl = o.Agl, AglR = aglR,
                Kias = o.Ias, Tas = o.Tas, GsK = o.Gs, Hdg = hdg, Trk = Avionics.TrueToMag(o.Trk, varW), Pitch = o.Pitch, Bank = o.Bank,
                Vs = o.Vsi, Rate = L.RateF, Along = rc.along, Cross = rc.cross, RwyHdg = 360,
                Thr = s.Thr, Prop = s.Prop, Rpm = o.Rpm, ManIn = o.ManIn, PropK = o.PropK, Flaps = s.FlapIdx, GearDown = s.GearDown,
                GearPos = s.GearPos, OnGround = s.OnGround, Paved = o.OnRunway, Stall = o.StallWarn, G = o.G, Beta = o.Beta,
                LatV = latV, Gp = gp, Cl = rc.cross, Cdi = nav.Flag != "" && nav.Flag != null ? 2.5 : nav.Dots, Loc = nav.Flag != "" && nav.Flag != null ? 2.5 : nav.Dots,
                Gsd = nav.Flag != "" && nav.Flag != null || nav.GsDots == null ? 2.5 : nav.GsDots.Value, NavFlag = nav.Flag != "" && nav.Flag != null,
                DmeV = dmeV, BrgV = brgV, Dis = nav.Dis, Xtk = nav.Xtk, EngRun = engRun, Crashed = s.Crashed, Td = s.Td,
            };
        }

        static double TgtDev(string k, Ctx c, double tv)
        {
            switch (k)
            {
                case "hdg": return W180(c.Hdg - tv);
                case "rhdg": return W180(c.Hdg - c.RwyHdg);
                case "dwhdg": return W180(c.Hdg - 180);
                case "trk": return W180(c.Trk - tv);
                case "alt": return c.Alt - tv;
                case "spd": return c.Kias - tv;
                case "vs": return c.Vs - tv;
                case "aglR": return c.AglR - tv;
                case "gp": return c.Gp - tv;
                case "cl": return c.Cl - tv;
                case "abank": return Math.Abs(c.Bank) - tv;
                case "bank": return c.Bank - tv;
                case "arate": return Math.Abs(c.Rate) - tv;
                case "cdi": return c.Cdi - tv;
                case "loc": return c.Loc - tv;
                case "gs": return c.Gsd - tv;
                case "xtk": return Fin(c.Xtk ?? 0) - tv;
                default: return 0;
            }
        }

        public static readonly Dictionary<string, (string label, string unit)> TGT_LABEL = new Dictionary<string, (string, string)>
        {
            { "alt", ("高度", "ft") }, { "hdg", ("針路", "°") }, { "rhdg", ("針路", "°") }, { "dwhdg", ("針路", "°") }, { "trk", ("航跡", "°") },
            { "spd", ("速度", "kt") }, { "vs", ("昇降率", "fpm") }, { "aglR", ("対地高度", "ft") }, { "abank", ("バンク", "°") }, { "bank", ("バンク", "°") },
            { "arate", ("旋回率", "°/秒") }, { "gp", ("進入角", "°") }, { "cl", ("センターライン", "m") }, { "cdi", ("CDI", "ドット") },
            { "loc", ("LOC", "ドット") }, { "gs", ("GS", "ドット") }, { "xtk", ("航路外れ", "NM") },
        };
        public static readonly Dictionary<string, int> DP = new Dictionary<string, int>
            { { "cdi", 1 }, { "loc", 1 }, { "gs", 1 }, { "gp", 1 }, { "arate", 1 }, { "xtk", 2 } };
        static int DpOf(string k) { int v; return DP.TryGetValue(k, out v) ? v : 0; }
        static string FmtD(double d, string k) { return d.ToString("F" + DpOf(k), System.Globalization.CultureInfo.InvariantCulture); }

        public static string FillText(string str, LessonState L)
        {
            if (str == null) return "";
            return System.Text.RegularExpressions.Regex.Replace(str, @"\{(\w+)\}", m =>
            {
                string k = m.Groups[1].Value;
                var c = L.Last;
                object v = null; bool has = true;
                switch (k)
                {
                    case "alt0": v = L.Alt0; break;
                    case "alt1": v = L.Alt0 + 1000; break;
                    case "hdg0": v = L.Hdg0; break;
                    case "hdgL": v = W360(L.Hdg0 - 90); if ((double)v == 0) v = 360.0; break;
                    case "hdgR": v = W360(L.Hdg0 + 90); if ((double)v == 0) v = 360.0; break;
                    case "rwyHdg": v = 360.0; break;
                    case "dwHdg": v = 180.0; break;
                    case "brgV": v = c != null ? c.BrgV : 0.0; break;
                    case "obs": v = L.Av.Crs; break;
                    case "obsOut": v = W360(L.Av.Crs + 180); if ((double)v == 0) v = 360.0; break;
                    case "vr": has = L.A.V.TryGetValue("rotate", out var vr); v = vr; break;
                    case "vy": has = L.A.V.TryGetValue("y", out var vy); v = vy; break;
                    case "vx": has = L.A.V.TryGetValue("x", out var vx); v = vx; break;
                    case "glide": has = L.A.V.TryGetValue("glide", out var gl); v = gl; break;
                    case "appr": has = L.A.V.TryGetValue("appr", out var ap); v = ap; break;
                    case "yse": has = L.A.V.TryGetValue("yse", out var ys); v = ys; break;
                    case "mc": has = L.A.V.TryGetValue("mc", out var mc); v = mc; break;
                    case "intHdg": v = L.IntHdg ?? 0; break;
                    case "call": v = L.CallShort; break;
                    case "dest": v = L.Dest ?? ""; break;
                    default: has = false; break;
                }
                if (!has || v == null) return m.Value;
                if (v is string) return (string)v;
                double num = (double)v;
                if (k.StartsWith("alt")) return Num0(Js.Round(num));
                if (System.Text.RegularExpressions.Regex.IsMatch(k, "hdg|Hdg|brg|obs")) return Js.Round(num).ToString("0").PadLeft(3, '0');
                return Js.Round(num).ToString("0");
            });
        }

        // ---------------------------------------------------------------- placement
        static void Place(LessonState L, SetupDef su)
        {
            var s = L.S; var R = FlightPhysics.LAB_RWY; double varW = FlightPhysics.MAGVAR_W; var V = L.A.V;
            Func<double, double> magToTrue = m => Avionics.MagToTrue(m, varW);
            if (su.At == "runway")
            {
                Sim.PlaceOnRunway(s, R, su.Along ?? 30); L.Hdg0 = 360; L.Alt0 = Js.Round(R.ElevFt + 1000);
            }
            else if (su.At == "area")
            {
                double hdg = su.Hdg ?? 90, n = su.N ?? 7000, e = su.E ?? -37500;
                L.Alt0 = su.AltFt ?? 3000;
                Sim.PlaceInAir(s, n, e, L.Alt0, magToTrue(hdg), su.Kt ?? VOr(L.A, "cruise", 0), su.Gamma ?? 0, (int)(su.Flaps ?? 0), su.Thr);
                L.Hdg0 = hdg;
            }
            else if (su.At == "downwind")
            {
                var ne = FlightPhysics.RwyToNE(R, R.Len + 200, -1600); double altFt = R.ElevFt + 1000;
                Sim.PlaceInAir(s, ne[0], ne[1], altFt, magToTrue(180), su.Kt ?? 90, 0, 0, null);
                L.Hdg0 = 180; L.Alt0 = altFt;
            }
            else if (su.At == "final")
            {
                double D = (su.Km ?? 5) * 1000, along = 300 - D;
                var ne = FlightPhysics.RwyToNE(R, along, su.Cross ?? 0);
                double altFt = R.ElevFt + Math.Tan(3 * DEG) * D * PhysMath.FT;
                int fl = (int)(su.Flaps ?? VOr(L.A, "apprFlaps", 2));
                double kt = su.Kt ?? VOr(L.A, "appr", 0);
                Sim.PlaceInAir(s, ne[0], ne[1], altFt, R.TrueHdg, kt, -3, fl, null);
                L.Hdg0 = 360; L.Alt0 = Js.Round(altFt);
            }
            else if (su.At == "ils")
            {
                double D = (su.Km ?? 14) * 1000;
                var ne = FlightPhysics.RwyToNE(R, 300 - D, su.Cross ?? 3200);
                L.IntHdg = su.IntHdg ?? 330; L.Alt0 = su.AltFt ?? 2000;
                Sim.PlaceInAir(s, ne[0], ne[1], L.Alt0, magToTrue(L.IntHdg.Value), su.Kt ?? 90, 0, 0, null);
                L.Hdg0 = L.IntHdg.Value;
            }
            else if (su.At == "away")
            {
                NePos refP;
                if (su.From == "rwy") refP = new NePos(R.N, R.E);
                else { var vor = Avionics.NAVAIDS.Find(x => x.Type == "VOR"); refP = new NePos(vor.N, vor.E); }
                double b = magToTrue(su.Brg ?? 90) * DEG, D = (su.Km ?? 10) * 1000;
                double n = refP.N + Math.Cos(b) * D, e = refP.E + Math.Sin(b) * D;
                L.Alt0 = su.AltFt ?? 3000;
                double hdg = su.Hdg ?? (su.Toward == true ? W360(Avionics.TrueToMag(Avionics.NeBearing(new NePos(n, e), refP), varW) + (su.Offset ?? 0)) : su.Brg ?? 90);
                Sim.PlaceInAir(s, n, e, L.Alt0, magToTrue(hdg), su.Kt ?? VOr(L.A, "cruise", 0), 0, 0, null);
                L.Hdg0 = Js.Round(hdg); if (L.Hdg0 == 0) L.Hdg0 = 360;
            }
            if (su.Thr != null && su.At != "runway") s.Thr = su.Thr.Value;
            if (su.Gear != null && !s.A.Gear.Fixed && su.At != "runway") { s.GearDown = su.Gear.Value; s.GearPos = su.Gear.Value ? 1 : 0; }
            L.Av.Baro = s.Qnh; L.Av.HdgBug = L.Hdg0 != 0 ? L.Hdg0 : 360; L.Av.AltSel = Js.Round(L.Alt0 / 100) * 100;
            if (su.Nav == "VOR")
            {
                L.Av.Cdi = "NAV1"; L.Av.Nav1.Act = 113500;
                double obs = su.Obs ?? Js.Round(Avionics.TrueToMag(Avionics.NeBearing(Ne(s), new NePos(Avionics.NAVAIDS[0].N, Avionics.NAVAIDS[0].E)), varW) / 5) * 5;
                double crs = W360(obs + (su.ObsOff ?? 0)); L.Av.Crs = crs == 0 ? 360 : crs;
            }
            else if (su.Nav == "ILS") { L.Av.Cdi = "NAV1"; L.Av.Nav1.Act = 109900; L.Av.Crs = 360; }
            else if (su.Nav == "RNAV") { AvionicsControl.Control(L.Av, "PROC_RNAV"); }
            if (su.Fpl != null) { L.Av.Fpl.Wps = new List<string>(su.Fpl); L.Av.Fpl.Active = 1; L.Av.Cdi = "GPS"; }
            Sim.Derive(s);
        }

        // ---------------------------------------------------------------- lessons
        public static (string spoken, string short_) CallOf(Aircraft A) { return ($"{A.Short} Seven Lima Alpha", $"{A.Short} 7LA"); }

        public static LessonState StartLesson(string id, string levelId = "intro", StartOpt opt = null)
        {
            opt = opt ?? new StartOpt();
            var def = Syllabus.Lesson(id);
            if (def == null || def.Steps == null) throw new Exception("unknown flight lesson " + id);
            var su = def.Setup ?? new SetupDef();
            var s = Sim.NewState(opt.Seed != 0 ? opt.Seed : 7, def.Aircraft ?? su.Aircraft ?? "pa28");   // JS: opt.seed || 7
            s.OatDev = opt.OatDev ?? 0;
            s.Opts.GainCap = opt.GainCap ?? 1.7;
            s.Opts.Sens = opt.Sens ?? "low";
            s.Opts.AutoRud = opt.AutoRud ?? def.AutoRud;
            var R = FlightPhysics.LAB_RWY;
            if (su.Wind != null) { double from = W360(R.TrueHdg + su.Wind.Value.rel); s.Wind = new WindState { FromDeg = from, Kt = su.Wind.Value.kt, Gust = su.Wind.Value.gust }; }
            else s.Wind = new WindState { FromDeg = R.TrueHdg + 10, Kt = su.Calm == true ? 0 : 5, Gust = 0.5 };
            if (opt.Wind != null)
            {
                s.Wind = new WindState { FromDeg = W360(opt.Wind.FromDeg), Kt = opt.Wind.Kt, Gust = opt.Wind.Gust ?? s.Wind.Gust };
                if (opt.Wind.TopKt != null) { s.Wind.TopFrom = W360(opt.Wind.TopFrom ?? 0); s.Wind.TopKt = opt.Wind.TopKt; s.Wind.TopFt = opt.Wind.TopFt ?? 3000; }
            }
            s.Qnh = su.Qnh ?? 29.92;
            var av = Avionics.CreateAvionics();
            var call = CallOf(s.A);
            var L = new LessonState
            {
                Id = id, Def = def, Level = Level(levelId), S = s, Av = av,
                Call = call.spoken, CallShort = call.short_, Hood = su.Hood ?? false,
            };
            double windMag = Js.Round(Avionics.TrueToMag(s.Wind.FromDeg, FlightPhysics.MAGVAR_W) / 10) * 10; if (windMag == 0) windMag = 360;
            L.WindStr = s.Wind.Kt < 3 ? "calm" : $"{windMag:0}".PadLeft(3, '0') + $" at {Js.Round(s.Wind.Kt)}";
            Sim.ApplyLoading(s, opt.Loading ?? new Loading());
            Place(L, su);
            if (su.OnStart != null) su.OnStart(L);
            L.Last = CtxOf(L);
            NextStep(L, L.Last);
            return L;
        }

        public static void NextStep(LessonState L, Ctx c)
        {
            L.StepIdx++;
            var S = L.StepIdx < L.Def.Steps.Count ? L.Def.Steps[L.StepIdx] : null;
            if (S == null) { EndLesson(L, true); return; }
            L.St = new StepState();
            var s = L.S;
            if (S.OnStart != null) S.OnStart(L, c, L.St);
            if (S.Fail != null) FailNow(L, S.Fail);
            if (S.HoodOff) L.Hood = false;
            if (S.HoodOn) L.Hood = true;
            if (S.Upset != null) SetUpset(L, S.Upset);
            if (S.Checklist != null) L.Check = new CheckState { Id = S.Checklist, I = 0 };
            if (S.Atc != null) L.Atc = S.Atc is string ? ATC_Q[(string)S.Atc](L) : ((Func<LessonState, AtcQ>)S.Atc)(L);
            L.GuideText = StepGuide(S, L);
            L.SayText = S.Say != null ? FillText(S.Say, L) : S.Checklist != null ? CHECKLISTS[S.Checklist].Title + "（Enter で 1 項目ずつ確認）" : S.Atc != null ? "管制の指示に正しく応答する（1〜3 キー）" : "";
            L.KeysText = S.Keys != null ? FillText(S.Keys, L) : "";
            L.Hint = "";
            L.Chime++;
            s.Ovr = null;
        }

        public static void FailNow(LessonState L, string kind)
        {
            var s = L.S;
            L.Fail[kind] = L.T;
            if (kind == "engine") s.Eng[0].Failed = true;
            else if (kind == "engL") s.Eng[0].Failed = true;
            else if (kind == "engR") s.Eng[s.Eng.Count - 1].Failed = true;
            else if (kind == "ahrs") { if (L.Av.Fail == null) L.Av.Fail = new Dictionary<string, bool>(); L.Av.Fail["ahrs"] = true; }
            else if (kind == "gps") { if (L.Av.Fail == null) L.Av.Fail = new Dictionary<string, bool>(); L.Av.Fail["gps"] = true; if (L.Av.Cdi == "GPS") L.Av.Direct = null; }
            else if (kind == "pitot") s.PitotRisk = 3;
            else if (kind == "static") s.StaticBlocked = true;
            else if (kind == "pump") s.Eng[0].PumpFail = true;
            else if (kind == "gear") s.GearFault = true;
        }

        public static void SetUpset(LessonState L, string kind)
        {
            var s = L.S; var a = Sim.Attitude(s); double h = a.Hdg * DEG;
            if (kind == "high") { s.Q = PhysMath.QFromHPB(a.Hdg, 25, -35); s.Vel = PhysMath.VScale(new[] { Math.Sin(h), 0.32, -Math.Cos(h) }, 34); s.Thr = 0.45; }
            else { s.Q = PhysMath.QFromHPB(a.Hdg, -20, 50); s.Vel = PhysMath.VScale(new[] { Math.Sin(h), -0.34, -Math.Cos(h) }, 62); s.Thr = 0.85; }
            s.W = new double[] { 0, 0, 0 }; s.PTgt = Sim.Attitude(s).Pitch;
        }

        public static void Update(LessonState L, double dt)
        {
            if (L == null || L.Done) return;
            var c = CtxOf(L, dt); L.Last = c;
            L.T += dt;
            if (L.T >= L.NextSample) { L.NextSample = L.T + 2; if (L.HistAlt.Count < 1800) { L.HistAlt.Add(Js.Round(c.Alt)); L.HistIas.Add(Js.Round(c.Kias)); } }
            var S = L.StepIdx < L.Def.Steps.Count ? L.Def.Steps[L.StepIdx] : null;
            if (S == null) return;
            if (L.S.A.Twin && L.S.Eng.Exists(e => e.Failed)) L.S.Opts.AutoRud = false;
            var st = L.St; st.T += dt;
            st.Turned += st.LastHdg == null ? 0 : W180(c.Hdg - st.LastHdg.Value); st.LastHdg = c.Hdg;
            if (L.S.Crashed) { Crashed(L, L.S.CrashReason); return; }
            if (S.Checklist != null || S.Atc != null) { if (st.Done) NextStep(L, c); return; }
            if (S.Check != null) S.Check(c, L, st);
            bool allIn = true;
            var lv = L.Level; double k = lv.K;
            if (S.Tgt != null) foreach (var kv in S.Tgt)
            {
                var spec = kv.Value;
                double tv = spec.Eval(L, c);
                double tol = Js.Round(spec.Tol * (spec.Fixed ? 1 : k) * Math.Pow(10, DpOf(kv.Key))) / Math.Pow(10, DpOf(kv.Key));
                if (tol == 0) tol = spec.Tol * k;
                double d = TgtDev(kv.Key, c, tv);
                bool inside = Math.Abs(d) <= tol;
                if (!inside) allIn = false;
                bool gradeNow = S.Grade && (S.GradeWhen == null || S.GradeWhen(c, L, st));
                TgtStat q;
                if (!st.Stats.TryGetValue(kv.Key, out q)) { q = new TgtStat { Tol = tol, Tv = tv }; st.Stats[kv.Key] = q; }
                q.Tv = tv; q.D = d; q.Tol = tol; q.Inside = inside;
                if (gradeNow) { q.N += dt; if (inside) q.InT += dt; q.Max = Math.Max(q.Max, Math.Abs(d)); }
            }
            bool holding = allIn && (S.GradeWhen == null || S.GradeWhen(c, L, st));
            st.HoldT = holding ? st.HoldT + dt : 0;
            st.HoldBest = Math.Max(st.HoldBest, st.HoldT);
            L.HintT -= dt;
            if (L.HintT <= 0) { L.HintT = 1.2; L.Hint = lv.Hints ? InstructorHint(L, S, st, c) : ""; }
            bool done = false, timeout = false;
            double need = S.Hold != null ? Js.Round(S.Hold.Value * lv.HoldK) : 0; st.Need = need;
            if (S.Dur != null && st.T >= S.Dur.Value) done = true;
            if (need != 0 && st.HoldT >= need) done = true;
            if (S.Until != null && S.Until(c, L, st)) done = true;
            if (S.Max != null && st.T >= S.Max.Value && !done) { done = true; timeout = true; }
            if (done) FinishStep(L, S, st, c, timeout);
        }
    }
}
