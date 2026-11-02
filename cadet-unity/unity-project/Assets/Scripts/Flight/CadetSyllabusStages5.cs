// CADET — CadetSyllabusStages5.cs : stage s7 (the 737 type course), PHASES,
// and the lesson registry that replaces the Syllabus stub.
using System;
using System.Collections.Generic;

namespace Cadet
{
    public static partial class Syllabus
    {
        static void BuildStages5(List<SyllabusStage> stages)
        {
            var s7 = new SyllabusStage { Id = "s7", Title = "第 7 段階　型式移行（737 級ジェット）", Phase = "p6" };
            s7.Lessons.Add(LD("j1", "離陸とフラップスケジュール", "フラップ 5 で離陸し、正の上昇で脚を上げ、速度に応じてフラップを退避して 3,000 ft へ加速上昇する", "b737", SU("runway"),
                new List<Step>
                {
                    new Step { Name = "離陸前点検", Checklist = "before_takeoff_jet" },
                    new Step { Name = "離陸許可の復唱", Atc = "takeoff" },
                    TakeoffRoll(AV(JT, "rotate")),
                    JetGearUp(),
                    new Step { Name = "上昇（加速高度まで）", G = G(kt: AV(JT, "y"), pwr: "full", how: "climbFull"), Keys = K("pitch", "trim"), Say = $"{School.Num0(AV(JT, "y"))} kt で加速高度 1,500 ft まで上昇。フラップは 5 のまま（退避は速度で決める）", Tgt = TG(("spd", School.T_SPD(AV(JT, "y"))), ("rhdg", T(0, 10))), GradeWhen = (c, L, st) => c.AglR > 300, Until = (c, L, st) => c.AglR >= 1500, Max = 240, Grade = true },
                    JetAccel(),
                    new Step { Name = "3,000 ft へ上昇", G = G(kt: 250, pwr: "full", how: "climbFull"), Keys = K("pitch", "trim"), Say = "250 kt で地上 3,000 ft まで上昇", Tgt = TG(("spd", School.T_SPD(250)), ("rhdg", T(0, 10))), GradeWhen = (c, L, st) => c.AglR > 1800, Until = (c, L, st) => c.AglR >= 3000, Max = 240, Grade = true },
                }));
            s7.Lessons.Add(LD("j2", "高速域と降下計画", "250 → 300 kt の加速と保持、スポイラーを使った降下、3：1 の降下計画と減速のスケジュールを学ぶ", "b737",
                SU("area", altFt: 6000, kt: 250, hdg: 90),
                new List<Step>
                {
                    new Step { Name = "巡航：エンジン計器を読む", G = G(kt: 250, how: "level"), Keys = K("pitch", "thr", "trim", "n1"), Say = "MFD のエンジン表示を読む：N1（推力の目安・%）・EGT（排気温度・℃）・FF（燃料流量）。ジェットは N1 で出力を管理する", Dur = 12 },
                    new Step { Name = "加速（250 → 300 kt）", G = G(kt: 300, how: "level"), Keys = K("thr", "pitch", "trim"), Say = "300 kt へ加速。推力の立ち上がりは遅い（スプール）ので先回りする。高度 {alt0} ft を保つ", Tgt = TG(("alt", School.T_ALT()), ("spd", School.T_SPD(300))), Hold = 15, Max = 180, Grade = true, GradeWhen = Established(300, 10, 4, 45) },
                    new Step { Name = "降下計画（3：1 の目安）", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（降下計画：いま高度 6,000 ft、空港の標高はほぼ 0 ft。このまま巡航すると、降下を始める目安は空港の何 NM 手前ですか）", Opts = new List<string> { "約 18 NM 手前（落とす高度 6,000 ft × 3 ÷ 1,000）", "約 6 NM 手前（1,000 ft に 1 NM）", "空港の真上まで行ってから急降下する" }, Ok = 0, Why = "目安は「落とす高度 1,000 ft につき 3 NM」。6,000 ft なら約 18 NM です。ジェットは抗力が小さく、降下と減速を同時にこなすのが難しいので、計画が早いほど楽になります。減速の分も見込んで、余裕を持って早めに降ろし始めるのが実務の感覚です。" }), Keys = "1〜3 キーで選ぶ", Say = "降下開始点（TOD）を計算する" },
                    new Step { Name = "スポイラー降下", G = G(kt: 250, fpm: -1800, how: "rate"), Keys = K("thr", "pitch", "spoiler"), Say = "スポイラーを出して、250 kt のまま降下率を増やす（約 1,800 fpm）。高度 {alt0} ft から 4,000 ft 付近まで", Tgt = TG(("spd", School.T_SPD(250)), ("vs", T(-1800, 400))), GradeWhen = (c, L, st) => st.T > 6 && EstablishedVs(-1800, 400, 4)(c, L, st), Until = (c, L, st) => c.Alt <= L.Alt0 - 1950, Max = 240, Grade = true, OnEnd = (L, c, st) => { L.Alt0 = Js.Round(c.Alt / 100) * 100; } },
                    new Step { Name = "減速とレベルオフ", G = G(kt: 200, how: "level"), Keys = K("thr", "pitch", "trim", "spoiler"), Say = "スポイラーをしまい、200 kt まで減速して水平に保つ。200 kt はフラップ 15 の制限速度の目安——これより速いままでは F15 は出せない", Tgt = TG(("alt", School.T_ALT(150)), ("spd", School.T_SPD(200))), Hold = 12, Max = 180, Grade = true, GradeWhen = (c, L, st) => st.T > 5 },
                }));
            s7.Lessons.Add(LD("j3", "エンジン異常と片肺運航", "片方のエンジンが止まっても方向と速度を保ち、ドリフトダウンの考え方で運航を続ける", "b737",
                SU("area", altFt: 6000, kt: 220, hdg: 90),
                new List<Step>
                {
                    new Step { Name = "巡航", G = G(kt: 220, how: "level"), Keys = K("pitch", "thr"), Say = "巡航中。まもなく右エンジンに異常が出ます", Dur = 8 },
                    new Step { Name = "エンジン異常：片肺で飛ぶ", Fail = "engR", G = G(kt: 200, pwr: "dead", how: "oei"), Keys = K("rud", "thr", "pitch", "n1"), Say = "右エンジン異常！ 方向を保つ → 生きている左の N1・EGT が正常か確認 → 200 kt を守り、高度はできるだけ保つ", Tgt = TG(("spd", T(200, 10)), ("alt", School.T_ALT(400)), ("hdg", School.T_HDG(15))), Hold = 20, Max = 150, Grade = true, GradeWhen = (c, L, st) => st.T > 6 },
                    new Step { Name = "ドリフトダウンの判断", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（片肺では推力が半分です。この重さでは、いまの高度を保つだけの余剰推力がありません。どうしますか）", Opts = new List<string> { "高度を守るため機首を上げ続け、速度が落ちても高度を保つ", "速度を守り、ゆっくり降りる（ドリフトダウン）を受け入れて、最寄りの空港へ向かう", "止まったエンジンの再始動を、何度も繰り返す" }, Ok = 1, Why = "片肺の輸送機は、重いと巡航高度を保てません。速度を犠牲にして高度を守れば失速に近づきます。正解は、片肺の速度を保ったまま緩やかに降りるドリフトダウンで、水平飛行を保てる高さまで下りて最寄りへ向かうこと。再始動は、手順と時間の余裕があるときだけ試みます。" }), Keys = "1〜3 キーで選ぶ", Say = "片肺での運航を判断する" },
                    new Step { Name = "ドリフトダウン", G = G(kt: 200, fpm: -400, how: "rate"), Keys = K("pitch", "thr"), Say = "200 kt を守って緩やかに降下（ドリフトダウン）。約 1,000 ft 下へ", Tgt = TG(("spd", T(200, 10)), ("vs", T(-400, 250))), GradeWhen = (c, L, st) => st.T > 6, Until = (c, L, st) => c.Alt <= L.Alt0 - 950, Max = 240, Grade = true, OnEnd = (L, c, st) => { L.Alt0 = Js.Round(c.Alt / 100) * 100; } },
                    new Step { Name = "片肺で水平飛行", G = G(kt: 200, how: "level"), Keys = K("pitch", "thr", "trim", "rud"), Say = "この高度なら水平を保てる。200 kt・針路 {hdg0}° を保つ（ここから先は最寄りの空港へ向かう想定）", Tgt = TG(("alt", School.T_ALT(150)), ("spd", T(200, 10)), ("hdg", School.T_HDG(15))), Hold = 15, Max = 150, Grade = true, GradeWhen = (c, L, st) => st.T > 5 },
                }));
            var j4steps = new List<Step>
            {
                new Step { Name = "着陸前点検", Checklist = "before_landing_jet" },
                new Step { Name = "進入（フラップ 15）", G = G(kt: AV(JT, "appr") + 15, fpm: -800, flaps: 2, how: "approach"), Keys = K("thr", "pitch", "roll"), Say = $"フラップ 15 で進入。速度は Vref+20 前後（{School.Num0(AV(JT, "appr") + 15)} kt）。ジェットは減速が遅いので、形態も速度も早めに作る", Tgt = TG(("spd", School.T_SPD(AV(JT, "appr") + 15, 8)), ("cl", T(0, 40))), GradeWhen = (c, L, st) => c.AglR < 1600, Until = (c, L, st) => c.AglR <= 1250, Max = 240, Grade = true },
                new Step { Name = "フラップ 40・Vref+5 へ", G = G(kt: AV(JT, "appr"), fpm: -Js.Round(AV(JT, "appr") * 5.3), flaps: 3, how: "approach"), Keys = K("flaps", "thr", "pitch"), Say = $"フラップ 40（V）。{School.Num0(AV(JT, "appr"))} kt（Vref+5）まで減速して安定させる。500 ft で安定していなければゴーアラウンド", Tgt = TG(("spd", School.T_SPD(AV(JT, "appr"), 5)), ("cl", T(0, 30)), ("gp", T(3, 0.9))), GradeWhen = (c, L, st) => c.AglR < 1200 && c.AglR > 480, Until = (c, L, st) => c.AglR <= 520, Max = 240, Grade = true },
                new Step { Name = "ゴーアラウンド（TOGA）", G = G(kt: AV(JT, "appr") + 10, pwr: "full", flaps: 2, how: "climbFull"), Keys = K("thr", "pitch", "flaps", "gear"), Say = "ゴーアラウンド！ 全開——ただし推力が出るまで数秒かかる（スプール遅れ）。沈んでも慌てず姿勢を保つ → フラップ 15 へ → 正の上昇で脚 UP", Until = (c, L, st) => c.AglR > 1100, Max = 180, Grade = true, Tgt = TG(("spd", T(AV(JT, "appr") + 14, 14))), GradeWhen = (c, L, st) => st.T > 10,
                    OnStart = (L, c, st) => { st.Set("a0", c.AglR); st.Set("min", c.AglR); },
                    Check = (c, L, st) => { st.Set("min", Math.Min(st.GetD("min", c.AglR), c.AglR)); if (st.GetO("pwr") == null && c.Thr > 0.95) st.Set("pwr", st.T); if (c.OnGround) st.Set("touched", true); return true; },
                    Result = (L, st) => new List<Row>
                    {
                        R("フルパワーまで", st.GetO("pwr") == null ? "—" : $"{st.GetD("pwr").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} 秒", "3 秒以内", st.GetO("pwr") != null && st.GetD("pwr") <= 3),
                        R("高度損失", $"{Js.Round(st.GetD("a0") - st.GetD("min"))} ft", "120 ft 以内（スプール遅れの分を含む）", st.GetD("a0") - st.GetD("min") <= 120 * L.Level.K && !st.GetB("touched")),
                        R("脚", L.S.GearDown ? "DOWN のまま" : "UP", "正の上昇で UP", !L.S.GearDown),
                    } },
                new Step { Name = "再進入（ファイナルへ）", G = G(kt: AV(JT, "appr"), how: "approach", flaps: 3), Keys = K("pitch", "thr"), Say = "管制の誘導でファイナルに戻ります（教材では位置を戻します）。今度は着陸します", Dur = 4, OnStart = (L, c, st) => PlaceFinal(L, 6, 3, AV(JT, "appr")) },
            };
            j4steps.AddRange(LandingSteps(AV(JT, "appr"), new LandingOpt { TdSpdTol = 20 }));
            s7.Lessons.Add(LD("j4", "進入・着陸とゴーアラウンド", "フラップ 15 → 40 と Vref+5 の保持、500 ft でゴーアラウンド、2 回目で着陸する", "b737",
                SU("final", km: 6, flaps: 2, kt: AV(JT, "appr") + 22, gear: true), j4steps));
            var j5steps = new List<Step>
            {
                new Step { Name = "離陸前点検", Checklist = "before_takeoff_jet" },
                new Step { Name = "離陸許可の復唱", Atc = "takeoff" },
                TakeoffRoll(AV(JT, "rotate")),
                JetGearUp("正の上昇。脚 UP"),
                new Step { Name = "上昇", G = G(kt: AV(JT, "y"), pwr: "full", how: "climbFull"), Keys = K("pitch"), Say = $"{School.Num0(AV(JT, "y"))} kt・1,500 ft まで", Tgt = TG(("spd", School.T_SPD(AV(JT, "y"))), ("rhdg", T(0, 10))), GradeWhen = (c, L, st) => c.AglR > 300, Until = (c, L, st) => c.AglR >= 1500, Max = 240, Grade = true },
                JetAccel(new JetAccelOpt { Say = "加速。170 kt 過ぎでフラップ UP、そのまま 3,000 ft へ", ToAlt = 2900, OnEnd = (L, c, st) => { L.Alt0 = Js.Round(c.Alt / 100) * 100; } }),
                new Step { Name = "高速域", G = G(kt: 280, how: "level"), Keys = K("thr", "pitch", "trim"), Say = "3,000 ft・280 kt を保つ", Tgt = TG(("alt", School.T_ALT()), ("spd", School.T_SPD(280))), Hold = 12, Max = 150, Grade = true, GradeWhen = (c, L, st) => st.T > 5 },
                new Step { Name = "エンジン異常（片肺）", Fail = "engR", G = G(kt: 210, pwr: "dead", how: "oei"), Keys = K("rud", "thr", "pitch"), Say = "右エンジン故障。方向・速度・生きている側の確認", Tgt = TG(("spd", T(210, 10)), ("hdg", School.T_HDG(15))), Hold = 15, Max = 150, Grade = true, GradeWhen = (c, L, st) => st.T > 6 },
                new Step { Name = "復旧（両エンジン）", G = G(kt: 230, how: "level"), Keys = K("thr", "pitch"), Say = "右エンジンは復旧した（審査の想定）。両エンジンで安定させる", Dur = 8, OnStart = (L, c, st) => { foreach (var e in L.S.Eng) { e.Failed = false; e.Feather = false; } } },
                new Step { Name = "進入へ", G = G(kt: AV(JT, "appr"), how: "approach", flaps: 3), Keys = K("pitch", "thr"), Say = "降下してファイナルへ（教材では位置を進めます）", Dur = 4, OnStart = (L, c, st) => PlaceFinal(L, 6, 3, AV(JT, "appr")) },
                new Step { Name = "着陸前点検", Checklist = "before_landing_jet" },
            };
            j5steps.AddRange(LandingSteps(AV(JT, "appr"), new LandingOpt { TdSpdTol = 20 }));
            s7.Lessons.Add(LD("j5", "型式限定チェック", "離陸 → 上昇 → 高速域 → 片肺 → 進入 → 着陸の通しプロファイルを、審査の形で飛ぶ", "b737", SU("runway"), j5steps));
            stages.Add(s7);
        }

        // ------------------------------------------------------------ registry
        public static readonly List<SyllabusPhase> PHASES = new List<SyllabusPhase>
        {
            new SyllabusPhase { Id = "p1", No = 1, Title = "London：英語によるグラウンドスクール", Fact = "ANA の公開情報：座学は現在ロンドンで行い、授業はすべて英語。航空管制通信のシミュレーションも行う。" },
            new SyllabusPhase { Id = "p2", No = 2, Title = "Sanford：Piper Archer による基礎操縦", Fact = "ANA の公開情報：フライトはフロリダ州 Sanford 空港に隣接する訓練所で単発機 Piper Archer を使用。90〜120 分のレッスン 12 回と審査（Check Flight）を経てソロへ。現地取材記事では平均 11 回目でファーストソロ。" },
            new SyllabusPhase { Id = "p3", No = 3, Title = "目視航法・横風・目的地変更", Fact = "ANA の公開情報：地図に線を引き上空の風から針路を計算して目的地へ飛ぶ Navigation 訓練。目的地変更に伴う再計算、エンジン停止の想定、現在地を見失った場合の対処も並行して訓練。" },
            new SyllabusPhase { Id = "p4", No = 4, Title = "計器飛行の導入", Fact = "ANA の公開情報：計器のみを頼りに飛ぶ計器飛行の訓練を行う。" },
            new SyllabusPhase { Id = "p5", No = 5, Title = "Piper Seminole への移行", Fact = "ANA の公開情報：双発機 Piper Seminole で片発停止や機材故障の対応を訓練し、最後の Check Flight を経てライセンスを取得。" },
            new SyllabusPhase { Id = "p6", No = 6, Title = "CRM・TEM・ジェット機・自動化への準備", Fact = "公開情報：基礎訓練の後は副操縦士任用訓練でエアラインの大型機の免許を目指す。この段階の内容は本教材の一般的な準備学習で、ANA の訓練内容の再現ではない。" },
        };

        static List<SyllabusStage> _stages;
        static Dictionary<string, LessonDef> _byId;
        static Dictionary<string, string> _stageOf;
        public static List<SyllabusStage> STAGES { get { Ensure(); return _stages; } }
        static void Ensure()
        {
            if (_stages != null) return;
            _stages = BuildStages();
            _byId = new Dictionary<string, LessonDef>();
            _stageOf = new Dictionary<string, string>();
            LessonOrder = new List<string>();
            foreach (var st in _stages) foreach (var l in st.Lessons) { _byId[l.Id] = l; _stageOf[l.Id] = st.Id; LessonOrder.Add(l.Id); }
        }
        public static LessonDef Lesson(string id) { Ensure(); LessonDef d; return _byId.TryGetValue(id, out d) ? d : null; }
        public static List<string> LessonOrder;
        public static string StageOf(string id) { Ensure(); string s; return _stageOf.TryGetValue(id, out s) ? s : ""; }
    }
}
