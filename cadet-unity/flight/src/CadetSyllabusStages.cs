// CADET — CadetSyllabusStages.cs : the STAGES table (s0–s2 here; s3–s7 in
// CadetSyllabusStages2.cs). Prose fields (why/brief/std/desc) are carried in
// data/syllabus.json; the functional fields (setup/steps) are exact ports.
using System;
using System.Collections.Generic;

namespace Cadet
{
    public static partial class Syllabus
    {
        static LessonDef LD(string id, string title, string goal, string aircraft, SetupDef setup, List<Step> steps)
        {
            return new LessonDef { Id = id, Title = title, Goal = goal, Aircraft = aircraft, Setup = setup, Steps = steps };
        }
        static SetupDef SU(string at, double? kt = null, double? hdg = null, double? altFt = null, double? flaps = null, double? thr = null,
            double? km = null, double? cross = null, string nav = null, string from = null, double? brg = null, bool? toward = null,
            double? offset = null, (double rel, double kt, double gust)? wind = null, bool? gear = null, bool? hood = null, int? obs = null,
            double? obsOff = null, List<string> fpl = null, Action<LessonState> onStart = null, bool? calm = null)
        {
            return new SetupDef
            {
                At = at, Kt = kt, Hdg = hdg, AltFt = altFt, Flaps = flaps, Thr = thr, Km = km, Cross = cross, Nav = nav, From = from,
                Brg = brg, Toward = toward, Offset = offset, Wind = wind, Gear = gear, Hood = hood, Obs = obs, ObsOff = obsOff,
                Fpl = fpl, OnStart = onStart, Calm = calm,
            };
        }

        public static List<SyllabusStage> BuildStages()
        {
            var stages = new List<SyllabusStage>();
            // ============================================================ s0
            stages.Add(new SyllabusStage
            {
                Id = "s0", Title = "第 0 段階　地上学科（ロンドン相当・英語の座学）", Phase = "p1",
                Lessons = new List<LessonDef>
                {
                    new LessonDef { Id = "k1", Tutor = "g1000", Title = "G1000 型 PFD の読み方（チュートリアル）", Goal = "速度・姿勢・高度・昇降率・方位・CDI の位置と読み方を、実際の表示で 1 つずつ" },
                    new LessonDef { Id = "k2", Read = true, Title = "PFD の読み取り練習", Goal = "ランダムな PFD の表示を読み取る 10 問・80% で合格" },
                    new LessonDef { Id = "k3", Radio = "drill", Title = "英語交信①：アルファベットと数字の言い方", Goal = "高度・針路・周波数・コードなどの言い方 10 問・80% で合格" },
                    new LessonDef { Id = "k4", Radio = "flight", Title = "英語交信②：1 回の飛行の交信を通して聞く", Goal = "ATIS から駐機場まで全部の交信を、意味と理由つきで最後まで" },
                    new LessonDef { Id = "k5", Radio = "scenes", Title = "英語交信③：復唱と応答", Goal = "ランダムな 10 場面・80% で合格" },
                    new LessonDef { Id = "k6", Radio = "listen", Title = "英語交信④：聞き取り（音声）", Goal = "英語の指示を音声で聞いて内容を選ぶ 10 問・80% で合格" },
                }
            });
            // ============================================================ s1
            var s1 = new SyllabusStage { Id = "s1", Title = "第 1 段階　Piper Archer の基礎操縦（ソロまで）", Phase = "p2" };
            s1.Lessons.Add(LD("a1", "姿勢・出力・トリム", "トリムを使い、操縦から手を離しても水平飛行が続く状態を作る", "pa28",
                SU("area", kt: 100, hdg: 90),
                new List<Step>
                {
                    new Step { Name = "姿勢と計器の確認", Say = "何も操作せず、PFD の姿勢表示・速度・高度・昇降率がどう動くか 10 秒観察", Keys = "操作しない（観察）", Dur = 10 },
                    new Step { Name = "トリムで手放し水平飛行", G = G(kt: 100, how: "level"), Keys = K("pitch", "thr", "trim"), Say = "W / S で高度 {alt0} ft を保ち、昇降率が 0 付近になったら T。手を離して保つ", Tgt = TG(("alt", School.T_ALT(100))), Hold = 20, Max = 120, Grade = true, GradeWhen = (c, L, st) => st.T > 8 },
                }));
            s1.Lessons.Add(LD("a2", "直線水平飛行", "高度・針路・速度を同時に保つ", "pa28",
                SU("area", kt: 100, hdg: 90),
                new List<Step> { School.StepSL("直線水平飛行", 100, 20, s => s.Keys = K("pitch", "roll", "thr", "trim")) }));
            s1.Lessons.Add(LD("a3", "上昇・降下・レベルオフ", "一定の速度で上昇・降下し、目標高度で水平に戻す", "pa28",
                SU("area", kt: 100, hdg: 90),
                new List<Step>
                {
                    new Step { Name = "上昇（Vy）", G = G(kt: AV(AR, "y"), pwr: "full", how: "climbFull"), Keys = K("thr", "pitch", "rud"), Say = $"フルパワー（R）で {School.Num0(AV(AR, "y"))} kt を保って {{alt1}} ft まで上昇。ボールがずれたら E（右ラダー）", Tgt = TG(("spd", School.T_SPD(AV(AR, "y")))), GradeWhen = (c, L, st) => st.T > 10 && c.Alt < L.Alt0 + 900, Until = (c, L, st) => c.Alt >= L.Alt0 + 950, Max = 240, Grade = true },
                    new Step { Name = "レベルオフ", G = G(kt: 100, how: "level"), Keys = K("pitch", "thr", "trim"), Say = "{alt1} ft で水平に戻し、速度が付いたらパワーを巡航へ。トリムを取って保つ", Tgt = TG(("alt", TF((L, c) => L.Alt0 + 1000, 100))), Hold = 15, Max = 90, Grade = true, GradeWhen = (c, L, st) => st.T > 6 },
                    new Step { Name = "降下", G = G(kt: 90, fpm: -500, how: "rate"), Keys = K("thr", "pitch", "trim"), Say = "パワーを絞って 90 kt・約 500 fpm で {alt0} ft まで降下", Tgt = TG(("spd", School.T_SPD(90)), ("vs", T(-500, 200))), GradeWhen = (c, L, st) => c.Alt > L.Alt0 + 150 && EstablishedVs(-500, 200, 4)(c, L, st), Until = (c, L, st) => c.Alt <= L.Alt0 + 60, Max = 240, Grade = true },
                    new Step { Name = "レベルオフ（降下から）", G = G(kt: 100, how: "level"), Keys = K("pitch", "thr", "trim"), Say = "{alt0} ft で水平に戻し、パワーを巡航へ。保つ", Tgt = TG(("alt", School.T_ALT(100))), Hold = 15, Max = 90, Grade = true, GradeWhen = (c, L, st) => st.T > 6 },
                }));
            var a4 = new List<Step>(); a4.AddRange(School.StepTurn(-1, 30, "左 360° 旋回")); a4.AddRange(School.StepTurn(1, 30, "右 360° 旋回"));
            s1.Lessons.Add(LD("a4", "中程度の旋回（30°）", "バンク 30° で高度を保って 360° 旋回し、元の針路で止める", "pa28", SU("area", kt: 100, hdg: 90), a4));
            var a5tgt = TG(("spd", School.T_SPD(95)));
            var a5 = new List<Step>(); a5.AddRange(School.StepTurn(-1, 45, "左急旋回", 95, a5tgt)); a5.AddRange(School.StepTurn(1, 45, "右急旋回", 95, a5tgt));
            s1.Lessons.Add(LD("a5", "急旋回（45°）", "実地試験の定番。バンク 45° で高度と速度を保つ", "pa28", SU("area", kt: 95, hdg: 90), a5));
            s1.Lessons.Add(LD("a6", "低速飛行", "失速警報を鳴らさずに、失速に近い速度で操縦する", "pa28",
                SU("area", kt: 90, hdg: 90),
                new List<Step>
                {
                    new Step { Name = "減速と外形変更", Keys = K("thr", "pitch", "flaps"), G = "目安：スロットルを約 1,700 rpm まで絞り（F）、速度が落ちるにつれて S で機首を少しずつ上げて高度を保つ。白い帯の中でフラップ 25°（V を 2 回）。機首が上がろうとするので押さえる", Say = "パワーを絞って減速。白い帯に入ったらフラップ 25°。高度 {alt0} ft を保ちながら 58 kt まで", Tgt = TG(("alt", School.T_ALT(150))), Until = (c, L, st) => c.Kias < 62 && c.Flaps >= 2, Max = 120, Grade = true },
                    new Step { Name = "低速飛行", G = G(kt: 61, flaps: 2, how: "slow"), Keys = K("pitch", "thr", "rud"), Say = "58〜68 kt（58 kt より遅くしない）・高度 {alt0} ft・針路 {hdg0}° を保つ。失速警報を鳴らさない", Tgt = TG(("alt", School.T_ALT()), ("hdg", School.T_HDG()), ("spd", T(63, 5))), Hold = 20, Max = 120, Grade = true, GradeWhen = (c, L, st) => st.T > 6,
                        Check = (c, L, st) => { if (c.Stall) st.Set("stallT", st.GetD("stallT") + c.Dt); return true; },
                        Result = (L, st) => new List<Row> { R("失速警報", st.GetO("stallT") != null ? $"{st.GetD("stallT").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} 秒" : "なし", "なし", st.GetO("stallT") == null || st.GetD("stallT") < 1) } },
                }));
            s1.Lessons.Add(LD("a7", "パワーオフ失速と回復", "着陸形態での失速を体験し、高度の損失を少なく回復する", "pa28",
                SU("area", kt: 75, hdg: 90, flaps: 2, thr: 0.2),
                new List<Step>
                {
                    new Step { Name = "失速への進入", Keys = K("thr", "pitch"), G = "目安：スロットル アイドル（F）。高度を保つように、1 秒に 1° くらいのペースで S を短く押して機首を上げ続ける。失速警報 → 振動（バフェット）→ 機首や片翼が落ちる、の順に来る", Say = "アイドルにし、高度を保つように機首をゆっくり上げ続けて失速させる", Until = (c, L, st) => c.Stall && c.Kias < 52, Max = 100 },
                    StallRecovery(AV(AR, "x") - 4),
                }));
            s1.Lessons.Add(LD("a8", "パワーオン失速と回復", "離陸・上昇中の失速を体験し回復する", "pa28",
                SU("area", kt: 75, hdg: 90, thr: 1),
                new List<Step>
                {
                    new Step { Name = "失速への進入", Keys = K("pitch", "rud"), G = "目安：全開のまま、機首上げ 約 15〜20°（PFD の目盛り「10」と「20」の間）で保つ。ボールが右に寄ったら E（右ラダー）", Say = "フルパワーのまま機首を 15〜20° に上げ、失速するまで保つ", Until = (c, L, st) => c.Stall && c.Kias < 55, Max = 100 },
                    StallRecovery(AV(AR, "x")),
                }));
            s1.Lessons.Add(LD("t1", "通常離陸と上昇", "センターラインを保って加速し、Vr で浮揚、Vy で上昇", "pa28",
                SU("runway"),
                new List<Step>
                {
                    new Step { Name = "離陸前点検", Checklist = "before_takeoff" },
                    new Step { Name = "離陸許可の復唱", Atc = "takeoff" },
                    TakeoffRoll(AV(AR, "rotate")),
                    new Step { Name = "初期上昇", G = G(kt: AV(AR, "y"), pwr: "full", how: "climbFull"), Keys = K("pitch", "rud", "trim"), Say = $"{School.Num0(AV(AR, "y"))} kt で上昇、滑走路の方位 360° を保つ。地上 1,000 ft まで", Tgt = TG(("spd", School.T_SPD(AV(AR, "y"))), ("rhdg", T(0, 10))), GradeWhen = (c, L, st) => c.AglR > 150, Until = (c, L, st) => c.AglR >= 1000, Max = 200, Grade = true },
                }));
            var t2steps = new List<Step>
            {
                new Step { Name = "着陸許可の復唱", Atc = "landing" },
                new Step { Name = "ダウンウインド", G = G(kt: 90, how: "level"), Keys = K("pitch", "roll", "thr", "trim"), Say = "ダウンウインド：地上 1,000 ft・90 kt・滑走路と平行（方位 180°）。着陸前点検を思い出す", Tgt = TG(("aglR", T(1000, 100)), ("spd", School.T_SPD(90)), ("dwhdg", T(0, 10))), Until = (c, L, st) => c.Along < 0, Max = 150, Grade = true },
                new Step { Name = "降下開始（アビーム）", G = G(kt: 80, fpm: -500, flaps: 1, how: "pattern"), Keys = K("thr", "flaps", "pitch"), Say = "進入端の真横。パワーを絞り（F）、フラップ 10°（V）。80 kt で降下開始", Until = (c, L, st) => c.Along < -800, Max = 100,
                    Check = (c, L, st) => { if (c.Flaps >= 1) st.Set("flap", true); return true; },
                    Result = (L, st) => new List<Row> { R("フラップ 10°", st.GetB("flap") ? "操作した" : "していない", "アビームで", st.GetB("flap")) } },
                new Step { Name = "ベース", G = G(kt: 75, fpm: -500, flaps: 2, how: "pattern"), Keys = K("roll", "flaps", "thr"), Say = "左旋回してベース（方位 090°）。フラップ 25°、75 kt で降下。センターラインの延長に近づいたら左旋回してファイナルへ", Until = (c, L, st) => Math.Abs(c.Cross) < 150 && Math.Abs(W180(c.Hdg - 360)) < 40 && c.Along < -400, Max = 180, Tgt = TG(("spd", School.T_SPD(75, 12))), Grade = true, GradeWhen = (c, L, st) => st.T > 10 },
            };
            t2steps.AddRange(LandingSteps(AV(AR, "appr")));
            s1.Lessons.Add(LD("t2", "場周経路（トラフィックパターン）", "ダウンウインドから左場周を飛んで着陸する", "pa28", SU("downwind"), t2steps));
            var t3steps = new List<Step> { new Step { Name = "着陸前点検", Checklist = "before_landing" } };
            t3steps.AddRange(LandingSteps(AV(AR, "appr")));
            s1.Lessons.Add(LD("t3", "通常着陸", "安定した進入から、接地帯にやさしく接地する", "pa28", SU("final", km: 5), t3steps));
            s1.Lessons.Add(LD("t4", "着陸復行（ゴーアラウンド）", "進入を中止して安全に上昇へ移る", "pa28",
                SU("final", km: 4),
                new List<Step>
                {
                    new Step { Name = "進入", G = G(kt: AV(AR, "appr"), fpm: -370, flaps: 3, how: "approach"), Keys = K("thr", "pitch"), Say = $"{School.Num0(AV(AR, "appr"))} kt・3° で進入を続ける", Tgt = TG(("spd", School.T_SPD(AV(AR, "appr"), 8)), ("cl", T(0, 40))), Until = (c, L, st) => c.AglR < 300, Max = 180, Grade = true, GradeWhen = (c, L, st) => c.AglR < 900 },
                    new Step { Name = "ゴーアラウンド", G = G(kt: AV(AR, "x"), pwr: "full", flaps: 2, how: "climbFull"), Keys = K("thr", "pitch", "flaps"), Say = "ゴーアラウンド！ フルパワー・機首上げ・フラップは段階的に", Until = (c, L, st) => c.AglR > 800, Max = 150, Grade = true, Tgt = TG(("spd", T(AV(AR, "x") + 4, 12))), GradeWhen = (c, L, st) => st.T > 8,
                        OnStart = (L, c, st) => { st.Set("a0", c.AglR); st.Set("min", c.AglR); },
                        Check = (c, L, st) => { st.Set("min", Math.Min(st.GetD("min", c.AglR), c.AglR)); if (st.GetO("pwr") == null && c.Thr > 0.95) st.Set("pwr", st.T); if (c.OnGround) st.Set("touched", true); return true; },
                        Result = (L, st) => new List<Row>
                        {
                            R("フルパワーまで", st.GetO("pwr") == null ? "—" : $"{st.GetD("pwr").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} 秒", "3 秒以内", st.GetO("pwr") != null && st.GetD("pwr") <= 3),
                            R("高度損失", $"{Js.Round(st.GetD("a0") - st.GetD("min"))} ft", "50 ft 以内", st.GetD("a0") - st.GetD("min") <= 50 * L.Level.K && !st.GetB("touched")),
                        } },
                }));
            s1.Lessons.Add(LD("e1", "離陸中止", "離陸滑走中の異常で、安全に止まる", "pa28",
                SU("runway"),
                new List<Step>
                {
                    new Step { Name = "離陸滑走", Keys = K("thr", "rud"), G = "目安：スロットル全開。異常の指示が来たら迷わず止める", Say = "フルパワーで離陸滑走を始める", Until = (c, L, st) => c.Kias > 40, Max = 60 },
                    new Step { Name = "離陸中止", Keys = K("thr", "brake", "rud"), G = "目安：スロットルを一気にアイドル（Shift+F）→ ブレーキ（B）。前輪を接地させたまま、ラダー（Q / E）でまっすぐ", Say = "離陸中止！ スロットル アイドル・ブレーキ・センターライン", Until = (c, L, st) => c.OnGround && c.GsK < 3, Max = 60, Grade = true, Tgt = TG(("cl", T(0, 8))),
                        OnStart = (L, c, st) => { },
                        Check = (c, L, st) => { if (st.GetO("idle") == null && c.Thr < 0.05) st.Set("idle", st.T); if (!c.Paved && c.OnGround) st.Set("off", true); return true; },
                        Result = (L, st) => new List<Row>
                        {
                            R("アイドルまで", st.GetO("idle") == null ? "—" : $"{st.GetD("idle").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} 秒", "2 秒以内", st.GetO("idle") != null && st.GetD("idle") <= 2),
                            R("停止位置", st.GetB("off") ? "滑走路外" : "滑走路内", "滑走路内", !st.GetB("off")),
                        } },
                }));
            s1.Lessons.Add(LD("e2", "離陸直後のエンジン故障", "低高度のエンジン故障で、滑空速度を保ってほぼ正面に降りる", "pa28",
                SU("runway"),
                new List<Step>
                {
                    TakeoffRoll(AV(AR, "rotate")),
                    new Step { Name = "上昇", G = G(kt: AV(AR, "y"), pwr: "full", how: "climbFull"), Keys = K("pitch", "rud"), Say = $"{School.Num0(AV(AR, "y"))} kt で上昇", Until = (c, L, st) => c.AglR > 400, Max = 150 },
                    new Step { Name = "エンジン故障：滑空", G = G(kt: AV(AR, "glide"), pwr: "dead", how: "glide"), Keys = K("pitch", "roll", "flaps"), Say = $"エンジン停止！ 機首を下げて {School.Num0(AV(AR, "glide"))} kt。ほぼ正面の安全な場所へ", Fail = "engine", Until = (c, L, st) => c.OnGround && c.GsK < 3, Max = 200, Grade = true, Tgt = TG(("spd", T(AV(AR, "glide"), 10)), ("rhdg", T(0, 30))), GradeWhen = (c, L, st) => st.T > 5 && c.AglR > 30,
                        Check = (c, L, st) => { if (st.GetO("capT") == null && c.Pitch < 2 && c.Kias < AV(AR, "glide") + 8) st.Set("capT", st.T); return true; },
                        Result = (L, st) => new List<Row> { R("滑空姿勢まで", st.GetO("capT") == null ? "—" : $"{st.GetD("capT").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} 秒", "5 秒以内", st.GetO("capT") != null && st.GetD("capT") <= 5) } },
                }));
            s1.Lessons.Add(LD("e3", "上空でのエンジン故障（滑走路へ滑空）", "最良滑空速度で LAB RWY 36 まで戻り着陸する", "pa28",
                SU("away", from: "rwy", brg: 70, km: 4, altFt: 3000, toward: false, hdg: 70, kt: 100),
                new List<Step>
                {
                    new Step { Name = "巡航", G = G(kt: 100, how: "level"), Keys = K("pitch", "thr"), Say = "空港から離れる方向へ水平飛行。まもなくエンジンが止まります", Dur = 6 },
                    new Step { Name = "エンジン故障：滑空開始", G = G(kt: AV(AR, "glide"), pwr: "dead", how: "glide"), Keys = K("pitch", "roll"), Say = $"エンジン停止！ 機首を下げて {School.Num0(AV(AR, "glide"))} kt。LAB RWY 36 へ向けて旋回", Fail = "engine", Tgt = TG(("spd", T(AV(AR, "glide"), 8))), Grade = true, GradeWhen = (c, L, st) => st.T > 8, Until = (c, L, st) => st.T > 25, Max = 30 },
                    new Step { Name = "遭難通報", Atc = "mayday" },
                    new Step { Name = "滑走路へ", G = G(kt: AV(AR, "glide"), pwr: "dead", how: "glide"), Keys = K("pitch", "roll", "flaps"), Say = $"{School.Num0(AV(AR, "glide"))} kt で LAB RWY 36 へ滑空し着陸。届くと確信できてからフラップ", Tgt = TG(("spd", T(AV(AR, "glide"), 8))), Until = (c, L, st) => c.OnGround && c.GsK < 3, Max = 420, Grade = true, GradeWhen = (c, L, st) => c.AglR > 300,
                        Check = (c, L, st) => { if (c.OnGround && st.GetO("tdF") == null) { st.Set("tdF", true); st.Set("paved", c.Paved); } return true; },
                        Result = (L, st) => new List<Row> { R("着陸場所", st.GetB("paved") ? "滑走路" : "滑走路外", "滑走路", st.GetB("paved")) } },
                }));
            s1.Lessons.Add(LD("e4", "強制着陸（場外地への不時着）", "高度のあるエンジン故障で、届く場外地を選び、滑空を管理して実際に降ろす", "pa28",
                SU("away", from: "rwy", brg: 165, km: 9.31, altFt: 3900, toward: false, hdg: 360, kt: 100),
                new List<Step>
                {
                    new Step { Name = "巡航", G = G(kt: 100, how: "level"), Keys = K("pitch", "thr"), Say = "LAB の南東へ巡航中。まもなくエンジンが止まります", Dur = 6 },
                    new Step { Name = "エンジン故障：滑空開始", G = G(kt: AV(AR, "glide"), pwr: "dead", how: "glide"), Keys = K("pitch", "roll"), Say = $"エンジン停止！ 機首を下げて {School.Num0(AV(AR, "glide"))} kt。滑走路は後方で届かない。南東の草地へ", Fail = "engine", Field = FIELD, Tgt = TG(("spd", T(AV(AR, "glide"), 8))), Grade = true, GradeWhen = (c, L, st) => st.T > 8, Until = (c, L, st) => st.T > 25, Max = 30 },
                    new Step { Name = "場外地の選定", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（どこへ降りますか。現在 約 3,700 ft。滑走路は後方 9 km、前方 約 6 km に平らな草地、近くに湖と森があります）", Opts = new List<string> { "湖のほとりの平地へ降りる", "前方の平らな草地へ。北向き（風上）に進入して降りる", "滑走路へ引き返す（後方 9 km）" }, Ok = 1, Why = "滑走路は滑空距離の外です（この高度・距離では届かない）。湖は接地で転覆・水没の危険、森は障害物だらけ。平らで長く、風上に向かって降りられる草地が正解です。選ぶのが先、通報はそのあと（Aviate → Navigate → Communicate）。" }), Keys = "1〜3 キーで選ぶ", Say = "降りる場所を選ぶ" },
                    new Step { Name = "遭難通報", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（草地を決めました。通報します）", Opts = new List<string> { $"Mayday, Mayday, Mayday, LAB Tower, {L.CallShort}, engine failure, landing in a field southeast of LAB, {School.Num0(Js.Round((L.Last != null ? L.Last.Alt : 3000) / 100) * 100)} feet.", $"LAB Tower, {L.CallShort}, request landing runway 36.", $"Pan-pan, {L.CallShort}, low fuel." }, Ok = 0, Why = "遭難（すぐに助けが必要）なら MAYDAY を 3 回、相手・コールサイン・状況・位置・意図の順。着陸先は滑走路ではなく、選んだ場外地です。" }), Keys = "1〜3 キーで選ぶ", Say = "MAYDAY を通報する" },
                    new Step { Name = "草地への滑空と不時着", G = G(kt: AV(AR, "glide"), pwr: "dead", how: "glide"), Keys = K("pitch", "roll", "flaps"), Say = $"草地へ。{School.Num0(AV(AR, "glide"))} kt を守り、高すぎれば S ターンで高度を捨てる。草地が確実になったらフラップ全開、{School.Num0(AV(AR, "glideLand"))} kt まで落として北向きに接地", Field = FIELD, Tgt = TG(("spd", T(AV(AR, "glide"), 8))), Until = (c, L, st) => c.OnGround && c.GsK < 3, Max = 420, Grade = true, GradeWhen = (c, L, st) => c.AglR > 300,
                        Check = (c, L, st) => { var td = L.S.Td; if (td != null && st.GetO("td") == null) { st.Set("td", td); st.Set("distF", DistField(L)); st.Set("hdgTd", c.Hdg); } return true; },
                        Result = (L, st) =>
                        {
                            var td = st.GetO("td") as TdRecord;
                            if (td == null) return new List<Row> { R("接地", "していない", "草地に接地", false) };
                            double kk = L.Level.K, sink = Js.Round(500 * kk), dh = Math.Abs(W180(st.GetD("hdgTd") - 360));
                            return new List<Row>
                            {
                                R("接地点（選定した草地）", $"草地の中心から {Js.Round(st.GetD("distF"))} m", "700 m 以内", st.GetD("distF") <= 700 && !td.OnRunway),
                                R("接地の降下率", $"{School.Num0(td.Fpm)} fpm", $"{School.Num0(sink)} fpm 以下", td.Fpm <= sink),
                                R("接地の方向（風上）", $"{Js.Round(st.GetD("hdgTd"))}°", "北向き ±30°", dh <= 30),
                            };
                        } },
                }));
            var c1steps = new List<Step>
            {
                new Step { Name = "離陸前点検", Checklist = "before_takeoff" },
                new Step { Name = "離陸許可の復唱", Atc = "takeoff" },
                TakeoffRoll(AV(AR, "rotate")),
                new Step { Name = "上昇", G = G(kt: AV(AR, "y"), pwr: "full", how: "climbFull"), Keys = K("pitch", "rud", "trim"), Say = $"{School.Num0(AV(AR, "y"))} kt で地上 2,500 ft まで上昇（右旋回して東の訓練空域へ）", Tgt = TG(("spd", School.T_SPD(AV(AR, "y")))), GradeWhen = (c, L, st) => c.AglR > 200, Until = (c, L, st) => c.AglR >= 2500, Max = 330, Grade = true, OnEnd = (L, c, st) => { L.Alt0 = Js.Round(c.Alt / 100) * 100; } },
                new Step { Name = "水平へ", G = G(kt: 100, how: "level"), Keys = K("pitch", "thr", "trim"), Say = "水平飛行に移り 100 kt へ。トリムを取る", Until = (c, L, st) => st.T > 25, Max = 30, OnEnd = (L, c, st) => { L.Alt0 = Js.Round(c.Alt / 50) * 50; double h = Js.Round(c.Hdg); L.Hdg0 = h == 0 ? 360 : h; } },
                School.StepSL("直線水平飛行", 100, 20, s => s.Keys = K("pitch", "roll", "thr", "trim")),
            };
            c1steps.AddRange(School.StepTurn(-1, 45, "左急旋回", 95, a5tgt));
            c1steps.Add(new Step { Name = "失速の準備", Keys = K("thr", "flaps", "pitch"), G = "目安：スロットル アイドル・フラップ 25°。高度を保つように機首を上げ続ける", Say = "フラップ 25°・パワーアイドル。高度を保ちながら失速させる", Until = (c, L, st) => c.Stall && c.Kias < 52, Max = 150 });
            c1steps.Add(StallRecovery(AV(AR, "x") - 4));
            c1steps.Add(new Step { Name = "模擬エンジン故障", G = G(kt: AV(AR, "glide"), pwr: "dead", how: "glide"), Keys = K("pitch", "roll", "flaps"), Say = $"エンジン故障！ {School.Num0(AV(AR, "glide"))} kt で滑走路へ滑空し着陸", Fail = "engine", Until = (c, L, st) => c.OnGround && c.GsK < 3, Max = 700, Grade = true, Tgt = TG(("spd", T(AV(AR, "glide"), 8))), GradeWhen = (c, L, st) => c.AglR > 300,
                Check = (c, L, st) => { if (c.OnGround && st.GetO("tdF") == null) { st.Set("tdF", true); st.Set("paved", c.Paved); } return true; },
                Result = (L, st) => new List<Row> { R("着陸", st.GetB("paved") ? "滑走路" : "滑走路外", "滑走路（または安全な不時着）", st.GetB("paved")) } });
            s1.Lessons.Add(LD("c1", "ソロ前の審査（模擬 Check Flight）", "離陸・空中操作・失速・緊急・着陸を通しで審査", "pa28", SU("runway"), c1steps));
            stages.Add(s1);
            BuildStages2(stages);
            return stages;
        }
    }
}
