// CADET — CadetSyllabusStages3.cs : stages s4–s7, the CFI trainee pilots,
// the diversion estimate, PHASES and the lesson registry.
using System;
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;

namespace Cadet
{
    public static partial class Syllabus
    {
        // ------------------------------------------------------------ CFI trainee
        public static readonly string[] CFI_MISTAKES = { "計器の一点に目が留まり、機首が少しずつ下がっていた", "スロットルが少しずつ戻り、速度が落ちていた", "外を見ていて、針路が少しずつずれていた" };
        public static readonly string[] CFI_FLARE = { "フレアが早く、バルーンのあと沈み込んだ（ドロップイン）", "速度が速すぎ、長く浮いて着陸が伸びた" };
        public static readonly string[] CFI_SL_MISTAKES = { "外と計器の往復が遅れ、高度が波打っていた", "小さなバンクに気づかず、針路が流れていた", "姿勢を保つだけで、速度が少しずつ落ちていた" };

        static void TraineeFly(LessonState L, Ctx c, StepState st)
        {
            var s = L.S; int kind = Math.Abs(s.Seed) % 3;
            st.Set("kind", (double)kind);
            bool inWindow = st.T > 14 && st.T < 34;
            double pitchT = 2 + (L.Alt0 - c.Alt) * 0.008, thrT = 0.62, bankOff = 0;
            if (inWindow && kind == 0) pitchT -= 3.2;
            if (inWindow && kind == 1) thrT = 0.44;
            if (inWindow && kind == 2) bankOff = 9;
            double bankT = ClampF(W180(L.Hdg0 + bankOff - c.Hdg) * 0.8, -12, 12);
            s.Ovr = new OvrState { Elev = ClampF((pitchT - c.Pitch) * 0.14, -0.5, 0.5), Ail = ClampF((bankT - c.Bank) * 0.05, -0.5, 0.5), Rud = 0 };
            s.Thr += ClampF(thrT - s.Thr, -0.008, 0.008);
            st.Set("maxDev", Math.Max(st.GetD("maxDev"), Math.Abs(c.Alt - L.Alt0)));
            if (inWindow) st.Set("sawMistake", true);
        }

        static readonly Dictionary<string, double[]> CFI_LAW = new Dictionary<string, double[]>
        {
            { "fixed", new[] { 28.0, 4.5, 13, 0.55, 28 } },
            { "error0", new[] { 50.0, 5.0, 24, 0.55, 50 } }, { "mild0", new[] { 40.0, 4.8, 20, 0.55, 40 } },
            { "error1", new[] { 28.0, 4.5, 13, 0.55, 28 } }, { "mild1", new[] { 28.0, 4.5, 13, 0.55, 28 } },
        };
        static void ToFinal(LessonState L, double km = 4)
        {
            var s = L.S; var R = FlightPhysics.LAB_RWY; double D = km * 1000, along = 300 - D;
            var ne = FlightPhysics.RwyToNE(R, along, 0);
            double altFt = R.ElevFt + Math.Tan(3 * Math.PI / 180) * D * PhysMath.FT;
            Sim.PlaceInAir(s, ne[0], ne[1], altFt, R.TrueHdg, AV(AR, "appr"), -3, (int)AV(AR, "apprFlaps"), null);
            L.Hdg0 = 360; s.Ovr = null; s.Brake = 0;
        }
        static void TraineeLand(LessonState L, Ctx c, StepState st, string mode)
        {
            var s = L.S; int kind = Math.Abs(s.Seed) % 2;
            st.Set("kind", (double)kind);
            var law = CFI_LAW[mode == "fixed" ? "fixed" : mode + kind];
            double fH = law[0], stage1 = law[1], knee = law[2], ramp = law[3], pOff = law[4];
            double hdgT = 360 + ClampF(-c.Cross * 0.12, -12, 12);
            double bankT = ClampF(W180(hdgT - c.Hdg) * 1.2, -16, 16);
            double pitchT, thrT;
            double spdT = kind == 1 && mode != "fixed" ? AV(AR, "appr") + (mode == "mild" ? 6 : 10) : AV(AR, "appr");
            if (c.AglR > fH && !st.GetB("flaring"))
            {
                double pathFt = Math.Max(0, 300 - c.Along) * 0.0524 * 3.28084;
                pitchT = -1 - ClampF((c.AglR - pathFt) * 0.05, -5, 3) + ClampF((-c.GsK * 5.31 - c.Vs) * 0.006, -3, 3);
                thrT = ClampF(0.30 + (spdT - c.Kias) * 0.06, 0, 0.8);
            }
            else
            {
                st.Set("flaring", true);
                pitchT = c.AglR > knee ? stage1 : Math.Min(9.5, stage1 + (knee - c.AglR) * ramp);
                if (c.Vs > -60 && c.AglR > 6) pitchT = Math.Min(pitchT, 1.5);
                if (kind == 0 && mode != "fixed" && c.Kias < 62) pitchT = Math.Min(pitchT, 4.5);
                thrT = c.AglR > pOff ? Math.Min(0.32, ClampF(0.30 + (AV(AR, "appr") - c.Kias) * 0.06, 0, 0.8)) : 0;
            }
            if (c.OnGround) { pitchT = 0; thrT = 0; s.Brake = Math.Min(1, s.Brake + c.Dt * 2); }
            s.Ovr = new OvrState { Elev = ClampF((pitchT - c.Pitch) * 0.16, -0.6, 0.6), Ail = ClampF((bankT - c.Bank) * 0.06, -0.5, 0.5), Rud = 0 };
            s.Thr += ClampF(thrT - s.Thr, -0.012, 0.012);
            if (!c.OnGround && c.AglR <= 50 && st.GetO("along50") == null) st.Set("along50", c.Along);
            var td = s.Td;
            if (td != null && st.GetO("td") == null && td.T > st.GetD("tdAfter"))
            {
                st.Set("td", td); st.Set("sink", (double)Js.Round(td.Fpm)); st.Set("tdPitch", td.Pitch); st.Set("along", (double)Js.Round(c.Along));
                st.Set("floatM", st.GetO("along50") != null ? (double)Js.Round(Math.Max(0, c.Along - st.GetD("along50"))) : double.NaN);
            }
        }
        public static double CfiScore(StepState st)
        {
            double minSpd = st.GetO("minSpd") != null ? st.GetD("minSpd") : 95;
            return Js.Round(st.GetD("maxDev") + st.GetD("maxHdg") * 3 + Math.Max(0, 95 - minSpd) * 4);
        }
        static void TraineeSL(LessonState L, Ctx c, StepState st, string mode = "first")
        {
            var s = L.S; int kind = Math.Abs(s.Seed) % 3;
            st.Set("kind", (double)kind);
            bool inWindow = st.T > 12 && st.T < 32;
            double k = inWindow ? 1 : 0;
            if (mode == "learn") k = inWindow ? (st.T < 20 ? 1 : 0.25) : 0;
            else if (mode == "direct") k = inWindow ? (st.T < 20 ? 0.3 : 1) : 0;
            double pitchT = 2 + (L.Alt0 - c.Alt) * 0.008, thrT = 0.62; double? ail = null;
            if (kind == 0 && k != 0) { double ph8 = st.T % 8; pitchT = 2 + (L.Alt0 - c.Alt) * 0.008 + (ph8 < 5 ? -3.2 : 2.6) * k; }
            if (kind == 1 && k != 0) ail = ClampF((-5 * k - c.Bank) * 0.05, -0.5, 0.5);
            if (kind == 2 && k != 0) { thrT = 0.62 - 0.13 * k; pitchT = 2; }
            double bankT = ClampF(W180(L.Hdg0 - c.Hdg) * 0.8, -12, 12);
            s.Ovr = new OvrState { Elev = ClampF((pitchT - c.Pitch) * 0.14, -0.5, 0.5), Ail = ail ?? ClampF((bankT - c.Bank) * 0.05, -0.5, 0.5), Rud = 0 };
            s.Thr += ClampF(thrT - s.Thr, -0.008, 0.008);
            if (st.T >= 6 && st.GetO("base") == null) { st.Set("baseDev", Math.Abs(c.Alt - L.Alt0)); st.Set("baseHdg", Math.Abs(W180(c.Hdg - L.Hdg0))); st.Set("base", true); st.Set("maxDev", 0.0); st.Set("maxHdg", 0.0); st.Set("minSpd", 999.0); }
            if (st.GetB("base"))
            {
                st.Set("maxDev", Math.Max(st.GetD("maxDev"), Math.Abs(c.Alt - L.Alt0) - st.GetD("baseDev")));
                st.Set("maxHdg", Math.Max(st.GetD("maxHdg"), Math.Abs(W180(c.Hdg - L.Hdg0)) - st.GetD("baseHdg")));
                st.Set("minSpd", Math.Min(st.GetO("minSpd") != null ? st.GetD("minSpd") : 999, c.Kias));
            }
            if (inWindow) st.Set("sawMistake", true);
        }
        static List<Step> DemoSteps()
        {
            var ss = LandingSteps(AV(AR, "appr"));
            ss[0].OnStart = (L, c, st) => ToFinal(L, 4);
            return ss;
        }

        // ------------------------------------------------------------ estimate (n2)
        public static (double brg, double dist, double eteMin) EstimateTruth(LessonState L, string id = "LABEF")
        {
            var wd = Avionics.Wpt(id);
            var w = new NePos(wd.N, wd.E);
            var pos = School.Ne(L.S);
            double dist = Avionics.NeDistNm(pos, w);
            double brg = Avionics.TrueToMag(Avionics.NeBearing(pos, w), FlightPhysics.MAGVAR_W);
            double gs = Math.Max(60, L.S.Out.Gs);
            return (Js.Round(brg), Js.Round(dist * 10) / 10, Js.Round(dist / gs * 60 * 10) / 10);
        }
        public static Dict SubmitEstimate(LessonState L, Dict input)
        {
            var truth = EstimateTruth(L);
            Func<object, double> num = v =>
            {
                if (v is double) return (double)v;
                string sv = v as string;
                double d;
                return sv != null && sv.Trim() != "" && double.TryParse(sv.Trim(), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out d) ? d : double.NaN;
            };
            var est = new Dict
            {
                { "hdg", num(input != null && input.ContainsKey("hdg") ? input["hdg"] : null) },
                { "dist", num(input != null && input.ContainsKey("dist") ? input["dist"] : null) },
                { "eteMin", num(input != null && input.ContainsKey("eteMin") ? input["eteMin"] : null) },
                { "truth", new Dict { { "brg", truth.brg }, { "dist", truth.dist }, { "eteMin", truth.eteMin } } },
            };
            L.Extra["estimate"] = est;
            return est;
        }
        public static List<Row> EstimateRows(LessonState L)
        {
            var e = L.Extra.ContainsKey("estimate") ? L.Extra["estimate"] as Dict : null;
            double kk = L.Level.K;
            if (e == null) return new List<Row> { R("見積もり", "未入力", "針路・距離・時間を入力", false) };
            var truth = (Dict)e["truth"];
            double tBrg = (double)truth["brg"], tDist = (double)truth["dist"], tEte = (double)truth["eteMin"];
            double hdg = (double)e["hdg"], dist = (double)e["dist"], ete = (double)e["eteMin"];
            double dh = !double.IsNaN(hdg) ? Math.Abs(W180(hdg - tBrg)) : 999;
            double dd = !double.IsNaN(dist) ? Math.Abs(dist - tDist) / Math.Max(0.1, tDist) * 100 : 999;
            double de = !double.IsNaN(ete) ? Math.Abs(ete - tEte) / Math.Max(0.1, tEte) * 100 : 999;
            return new List<Row>
            {
                R("針路（磁方位）", $"{(!double.IsNaN(hdg) ? Js.Round(hdg).ToString() : "—")}°（正解 {School.Num0(tBrg)}°）", $"±{Js.Round(15 * kk)}°", dh <= 15 * kk),
                R("距離", $"{(!double.IsNaN(dist) ? dist.ToString() : "—")} NM（正解 {tDist}）", $"±{Js.Round(20 * kk)}%", dd <= 20 * kk),
                R("所要時間", $"{(!double.IsNaN(ete) ? ete.ToString() : "—")} 分（正解 {tEte}）", $"±{Js.Round(20 * kk)}%", de <= 20 * kk),
            };
        }

        static void BuildStages3(List<SyllabusStage> stages)
        {
            // ============================================================ s4
            var s4 = new SyllabusStage { Id = "s4", Title = "第 4 段階　Piper Seminole（双発）", Phase = "p5" };
            s4.Lessons.Add(LD("m1", "双発の離陸と上昇", "引き込み脚の双発機で離陸し、脚を上げて Vy で上昇", "pa44", SU("runway"),
                new List<Step>
                {
                    new Step { Name = "離陸前点検", Checklist = "ms_before_takeoff" },
                    new Step { Name = "離陸許可の復唱", Atc = "takeoff" },
                    TakeoffRoll(AV(SM, "rotate"), true),
                    new Step { Name = "正の上昇・脚上げ", G = G(kt: AV(SM, "y"), pwr: "full", how: "climbFull"), Keys = K("gear", "pitch"), Say = "正の上昇を確認して脚 UP（G）", Until = (c, L, st) => !c.GearDown || c.AglR > 600, Max = 60,
                        Result = (L, st) => new List<Row> { R("脚上げ", !L.S.GearDown ? $"地上 {Js.Round(L.Last.AglR)} ft で UP" : "上げていない", "地上 500 ft まで", !L.S.GearDown && L.Last.AglR <= 600) } },
                    new Step { Name = "上昇", G = G(kt: AV(SM, "y"), pwr: "full", how: "climbFull"), Keys = K("pitch", "trim"), Say = $"{School.Num0(AV(SM, "y"))} kt で地上 1,500 ft まで上昇", Tgt = TG(("spd", School.T_SPD(AV(SM, "y"))), ("rhdg", T(0, 10))), GradeWhen = (c, L, st) => c.AglR > 300, Until = (c, L, st) => c.AglR > 1500, Max = 200, Grade = true },
                }));
            s4.Lessons.Add(LD("m2", "上空での片発停止（Identify・Verify・Feather）", "片方のエンジンが止まったとき、方向を保ち、止まった側を特定してフェザーする", "pa44",
                SU("area", kt: 120, hdg: 90, altFt: 4000, gear: false),
                new List<Step>
                {
                    new Step { Name = "巡航", G = G(kt: 120, how: "level"), Keys = K("pitch", "thr"), Say = "巡航中。まもなく片方のエンジンが止まります。フルパワー（R）で備える", Dur = 10, OnEnd = (L, c, st) => { L.S.Opts.AutoRud = false; } },
                    new Step { Name = "片発停止：方向を保つ・特定・フェザー", G = G(kt: AV(SM, "yse"), pwr: "dead", how: "oei"), Keys = K("rud", "thr", "feather", "rtrim"), Say = "エンジン故障！ 方向を保つ（ラダー）→ 全開 → Vyse → Dead foot, dead engine → 止まった側をフェザー",
                        OnStart = (L, c, st) => { School.FailNow(L, (L.S.Seed % 2 != 0) ? "engL" : "engR"); st.Set("h0", c.Hdg); }, Tgt = TG(("hdg", TF((L, c) => L.Hdg0, 20))), Grade = true, Until = (c, L, st) => L.S.Eng.Exists(e => e.Feather), Max = 60,
                        Check = (c, L, st) => { st.Set("dev", Math.Max(st.GetD("dev"), Math.Abs(W180(c.Hdg - st.GetD("h0"))))); return true; },
                        Result = (L, st) => { bool good = L.S.Eng.TrueForAll(e => !e.Feather || e.Failed); bool any = L.S.Eng.Exists(e => e.Feather); double when = st.T;
                            return new List<Row> { R("フェザーした側", any ? (good ? $"止まった{DeadName(L)}エンジン" : "生きているエンジン（重大な誤り）") : "フェザーしていない", "止まったエンジン", good && any), R("フェザーまで", $"{Js.Round(when)} 秒", "30 秒以内", when <= 30) }; },
                        StopOnFail = "片発停止の処置が基準外でした" },
                    new Step { Name = "片発で飛ぶ（Vyse）", G = G(kt: AV(SM, "yse"), pwr: "dead", how: "oei"), Keys = K("pitch", "rud", "roll", "rtrim"), Say = $"Vyse {School.Num0(AV(SM, "yse"))} kt、生きているエンジン側へ 2〜5° バンク、針路 {{hdg0}}° を保つ", Tgt = TG(("spd", T(AV(SM, "yse"), 5)), ("hdg", School.T_HDG(10)), ("bank", TF((L, c) => 3 * LiveSide(L), 3))), Hold = 30, Max = 150, Grade = true, GradeWhen = Established(AV(SM, "yse"), 5, 4) },
                    new Step { Name = "管制へ連絡", Atc = "oei" },
                }));
            // bank target must be 'fixed' tolerance (JS [fn, 3, 'fixed']) — patch the spec
            var m2fly = s4.Lessons[s4.Lessons.Count - 1].Steps[2];
            m2fly.Tgt["bank"] = new TgtSpec((L, c) => 3 * LiveSide(L), 3, true);
            s4.Lessons.Add(LD("m3", "Vmc デモンストレーション", "片発で速度を下げると方向が保てなくなる速度（Vmc）を知り、正しく回復する", "pa44",
                SU("area", kt: 100, hdg: 90, altFt: 5000, gear: false, thr: 0.8),
                new List<Step>
                {
                    new Step { Name = "準備（左を模擬停止）", G = G(kt: AV(SM, "sse") + 8, how: "level"), Keys = K("thr", "rud", "rtrim"), Say = "左エンジンをアイドル（模擬停止）にします。右は全開（R）。ラダーで方向を保って Vsse 82 kt へ",
                        OnStart = (L, c, st) => { L.S.Opts.AutoRud = false; L.S.Eng[0].Thr = 0; }, Until = (c, L, st) => st.T > 8 && c.Thr > 0.95 && c.Kias < AV(SM, "sse") + 12, Max = 60 },
                    new Step { Name = "減速（Vmc に近づく）", G = "目安：S で機首を少しずつ上げ、1 秒に 1 kt くらいで減速。E（右ラダー）を増やして方向を保つ。ラダーがいっぱいになっても機首が左へ回り始めたら、それが Vmc", Keys = K("pitch", "rud"), Say = "ゆっくり減速。方向が保てなくなる・失速警報、のどれかで回復へ",
                        OnStart = (L, c, st) => st.Set("h0", c.Hdg), Until = (c, L, st) => c.Stall || Math.Abs(W180(c.Hdg - st.GetD("h0"))) > 15 || c.Kias < AV(SM, "mc") - 4, Max = 120,
                        OnEnd = (L, c, st) => L.Extra["vmcAt"] = (double)Js.Round(c.Kias) },
                    new Step { Name = "回復", G = G(kt: AV(SM, "sse"), how: "level"), Keys = K("thr", "pitch", "rud"), Say = "回復！ 右エンジンの出力を絞る（F）→ 機首を下げる → Vsse 以上へ加速 → 方向を戻す",
                        OnStart = (L, c, st) => { st.Set("start", c.Alt); st.Set("min", c.Alt); },
                        Check = (c, L, st) => { st.Set("min", Math.Min(st.GetD("min", c.Alt), c.Alt)); if (st.GetO("cut") == null && c.Thr < 0.7) st.Set("cut", st.T); if (st.T > 3 && c.Stall) st.Set("stall", true); return true; },
                        Until = (c, L, st) => c.Kias > AV(SM, "sse") && st.T > 3, Max = 45, Grade = true,
                        Result = (L, st) => new List<Row>
                        {
                            R("方向を失った速度", $"{(L.Extra.ContainsKey("vmcAt") ? ((double)L.Extra["vmcAt"]).ToString() : "—")} kt", $"参考：赤線 {School.Num0(AV(SM, "mc"))} kt（条件で変わる）", true),
                            R("出力を減らすまで", st.GetO("cut") == null ? "—" : $"{st.GetD("cut").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} 秒", "3 秒以内", st.GetO("cut") != null && st.GetD("cut") <= 3),
                            R("回復で失った高度", $"{Js.Round(st.GetD("start") - st.GetD("min"))} ft", $"{Js.Round(300 * L.Level.K)} ft 以内", st.GetD("start") - st.GetD("min") <= 300 * L.Level.K),
                            R("失速", st.GetB("stall") ? "あり" : "なし", "なし", !st.GetB("stall")),
                        } },
                    new Step { Name = "両エンジンへ", G = G(kt: AV(SM, "y") + 10, how: "level"), Keys = K("thr"), Say = "左エンジンの出力を戻します。巡航へ", OnStart = (L, c, st) => { L.S.Eng[0].Thr = null; }, Dur = 8 },
                }));
            s4.Lessons.Add(LD("m4", "離陸直後の片発停止", "浮揚直後に片方のエンジンが止まっても、Vyse で上昇を続ける", "pa44", SU("runway"),
                new List<Step>
                {
                    new Step { Name = "離陸許可の復唱", Atc = "takeoff" },
                    TakeoffRoll(AV(SM, "rotate"), true),
                    new Step { Name = "脚上げ", G = G(kt: AV(SM, "y"), pwr: "full", how: "climbFull"), Keys = K("gear", "pitch"), Say = "正の上昇で脚 UP（G）", Until = (c, L, st) => c.AglR > 250, Max = 60 },
                    new Step { Name = "片発停止！", G = G(kt: AV(SM, "yse"), pwr: "dead", how: "oei"), Keys = K("rud", "pitch", "gear", "feather", "rtrim"), Say = "エンジン故障！ 方向 → Vyse → 脚 UP → 止まった側をフェザー",
                        OnStart = (L, c, st) => { School.FailNow(L, (L.S.Seed % 2 != 0) ? "engR" : "engL"); L.S.Opts.AutoRud = false; st.Set("h0", c.Hdg); }, Tgt = TG(("spd", T(AV(SM, "yse"), 5)), ("rhdg", T(0, 20))), Grade = true, GradeWhen = (c, L, st) => st.T > 6,
                        Until = (c, L, st) => L.S.Eng.Exists(e => e.Feather) && st.T > 8, Max = 60,
                        Result = (L, st) => { bool good = L.S.Eng.TrueForAll(e => !e.Feather || e.Failed) && L.S.Eng.Exists(e => e.Feather);
                            return new List<Row> { R("フェザー", good ? $"止まった{DeadName(L)}エンジン（{Js.Round(st.T)} 秒）" : L.S.Eng.Exists(e => e.Feather) ? "生きているエンジン（重大な誤り）" : "していない", "30 秒以内・止まった側", good && st.T <= 30), R("脚", L.S.GearDown ? "DOWN のまま" : "UP", "UP", !L.S.GearDown) }; },
                        StopOnFail = "片発停止の処置が基準外でした" },
                    new Step { Name = "片発で上昇", G = G(kt: AV(SM, "yse"), pwr: "dead", how: "oei"), Keys = K("pitch", "rud", "roll"), Say = $"Vyse {School.Num0(AV(SM, "yse"))} kt で地上 1,000 ft まで上昇", Tgt = TG(("spd", T(AV(SM, "yse"), 5)), ("rhdg", T(0, 15))), Until = (c, L, st) => c.AglR > 1000, Max = 300, Grade = true, GradeWhen = Established(AV(SM, "yse"), 5, 3) },
                }));
            s4.Lessons.Add(LD("e6", "離陸判断ドリル（中断／継続）", "Vr 前の異常は止まり、浮揚後の片発停止は止まらずに飛び続ける", "pa44", SU("runway"),
                new List<Step>
                {
                    new Step { Name = "離陸前点検", Checklist = "ms_before_takeoff" },
                    new Step { Name = "離陸許可の復唱", Atc = "takeoff" },
                    new Step { Name = "離陸滑走（1 回目）", Keys = K("thr", "rud"), G = "目安：スロットル全開。異常の合図が来たら、Vr の前か後かで判断が分かれます", Say = $"フルパワーで離陸滑走。Vr は {School.Num0(AV(SM, "rotate"))} kt", Until = (c, L, st) => c.Kias > 45, Max = 60 },
                    new Step { Name = "離陸中止（Vr 前の異常）", Keys = K("thr", "brake", "rud"), G = "目安：スロットルを一気にアイドル（Shift+F）→ ブレーキ（B）。ラダーでセンターラインを保つ", Say = "エンジンの振動と回転のばらつき！ まだ Vr の前です。離陸中止！", Until = (c, L, st) => c.OnGround && c.GsK < 3, Max = 60, Grade = true, Tgt = TG(("cl", T(0, 8))),
                        Check = (c, L, st) => { if (st.GetO("idle") == null && c.Thr < 0.05) st.Set("idle", st.T); if (!c.Paved && c.OnGround) st.Set("off", true); if (c.OnGround && c.GsK >= 3) st.Set("stopAlong", c.Along); return true; },
                        Result = (L, st) => new List<Row>
                        {
                            R("アイドルまで", st.GetO("idle") == null ? "—" : $"{st.GetD("idle").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} 秒", "2 秒以内", st.GetO("idle") != null && st.GetD("idle") <= 2),
                            R("停止位置", st.GetB("off") ? "滑走路外" : "滑走路内", "滑走路内", !st.GetB("off")),
                            R("滑走路の残量", $"約 {Math.Max(0, Js.Round(1200 - st.GetD("stopAlong")))} m", "止まった位置から滑走路の終わりまで", true),
                        } },
                    new Step { Name = "滑走路残量の見積もり", Atc = (Func<LessonState, AtcQ>)(L => { double rem = Math.Max(0, Js.Round((1200 - L.Last.Along) / 50) * 50);
                        return new AtcQ { Msg = "（止まりました。いま止まっている位置から、滑走路の終わりまであと何 m ありますか。LAB RWY は全長 1,200 m）", Opts = new List<string> { $"約 {School.Num0(rem + 400)} m", $"約 {School.Num0(rem)} m", $"約 {School.Num0(Math.Max(0, rem - 400))} m" }, Ok = 1, Why = $"止まった位置は滑走路の始端から約 {Js.Round(L.Last.Along)} m。残量は全長 1,200 m から引いた約 {School.Num0(rem)} m です。残量が分かれば「もう一度離陸できるか／できないか」が判断できます。" }; }),
                        Keys = "1〜3 キーで選ぶ", Say = "滑走路の残量を見積もる" },
                    TakeoffRoll(AV(SM, "rotate"), true),
                    new Step { Name = "脚上げ", G = G(kt: AV(SM, "y"), pwr: "full", how: "climbFull"), Keys = K("gear", "pitch"), Say = "正の上昇で脚 UP（G）。速度と高度がついてからが、本当の「止まれない」場面です", Until = (c, L, st) => c.AglR > 250, Max = 60 },
                    new Step { Name = "片発停止！（浮揚後）", G = G(kt: AV(SM, "yse"), pwr: "dead", how: "oei"), Keys = K("rud", "pitch", "gear", "feather", "rtrim"), Say = "浮揚後にエンジン故障！ 今度は止まれない。方向 → Vyse → 脚 UP → 止まった側をフェザー",
                        OnStart = (L, c, st) => { School.FailNow(L, (L.S.Seed % 2 != 0) ? "engR" : "engL"); L.S.Opts.AutoRud = false; st.Set("h0", c.Hdg); }, Tgt = TG(("spd", T(AV(SM, "yse"), 5)), ("rhdg", T(0, 20))), Grade = true, GradeWhen = (c, L, st) => st.T > 6,
                        Until = (c, L, st) => L.S.Eng.Exists(e => e.Feather) && st.T > 8 && !L.S.GearDown, Max = 60,
                        Check = (c, L, st) => { if (c.OnGround && st.T > 2) st.Set("touched", true); return true; },
                        Result = (L, st) => { bool good = L.S.Eng.TrueForAll(e => !e.Feather || e.Failed) && L.S.Eng.Exists(e => e.Feather);
                            return new List<Row> { R("フェザー", good ? $"止まった{DeadName(L)}エンジン（{Js.Round(st.T)} 秒）" : L.S.Eng.Exists(e => e.Feather) ? "生きているエンジン（重大な誤り）" : "していない", "30 秒以内・止まった側", good && st.T <= 30), R("脚", L.S.GearDown ? "DOWN のまま" : "UP", "UP", !L.S.GearDown), R("継続の判断", st.GetB("touched") ? "接地してしまった" : "止まらずに飛び続けた", "浮揚後は継続", !st.GetB("touched")) }; },
                        StopOnFail = "片発停止の処置が基準外でした" },
                    new Step { Name = "片発で上昇（継続）", G = G(kt: AV(SM, "yse"), pwr: "dead", how: "oei"), Keys = K("pitch", "rud", "roll"), Say = $"Vyse {School.Num0(AV(SM, "yse"))} kt で地上 800 ft まで上昇。判断どおり、飛び続けます", Tgt = TG(("spd", T(AV(SM, "yse"), 5)), ("rhdg", T(0, 15))), Until = (c, L, st) => c.AglR > 800, Max = 300, Grade = true, GradeWhen = Established(AV(SM, "yse"), 5, 3) },
                }));
            var m5steps = new List<Step> { new Step { Name = "着陸前点検（GUMPS）", Checklist = "ms_before_landing" } };
            m5steps.AddRange(LandingSteps(AV(SM, "yse") - 4, new LandingOpt { Twin = true, Flaps = 1 }));
            s4.Lessons.Add(LD("m5", "片発の進入と着陸", "片発のまま安定した進入をして着陸する", "pa44",
                SU("final", km: 5, kt: AV(SM, "yse"), flaps: 0, gear: false, onStart: L => { L.S.Eng[0].Failed = true; L.S.Eng[0].Feather = true; L.Fail["engL"] = 0; L.S.Opts.AutoRud = false; }),
                m5steps));
            stages.Add(s4);
            BuildStages4(stages);
        }
    }
}
