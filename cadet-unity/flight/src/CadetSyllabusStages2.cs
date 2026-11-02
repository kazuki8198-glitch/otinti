// CADET — CadetSyllabusStages2.cs : stages s2–s7, the CFI trainee pilots,
// the n2 diversion estimate, PHASES, and the lesson registry.
using System;
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;

namespace Cadet
{
    public static partial class Syllabus
    {
        static void BuildStages2(List<SyllabusStage> stages)
        {
            // ============================================================ s2
            var s2 = new SyllabusStage { Id = "s2", Title = "第 2 段階　航法・横風・目的地変更", Phase = "p3" };
            var x1 = new List<Step>(); x1.AddRange(LandingSteps(AV(AR, "appr"), new LandingOpt { Xwind = true }));
            s2.Lessons.Add(LD("x1", "横風着陸", "横風の中で、機体をまっすぐ滑走路に接地させる", "pa28", SU("final", km: 5, wind: (60, 12, 1.3)), x1));
            var x2 = new List<Step>(); x2.AddRange(LandingSteps(AV(AR, "apprShort"), new LandingOpt { Short = true }));
            s2.Lessons.Add(LD("x2", "短距離着陸", "目標点に正確に接地し、短い距離で止まる", "pa28", SU("final", km: 4.5, flaps: 3, kt: AV(AR, "apprShort")), x2));
            s2.Lessons.Add(LD("x3", "短距離離陸", "最短の距離で浮揚し、Vx で障害物を越える", "pa28", SU("runway"),
                new List<Step>
                {
                    new Step { Name = "ブレーキを踏んでフルパワー", Keys = K("brake", "thr"), Say = "B を押したまま R でフルパワー。回転が上がりきったら B を離す", G = "目安：B（ブレーキ）を押したまま R を長押し。エンジンの回転が安定したら B を離して滑走開始", Until = (c, L, st) => c.Thr > 0.95 && c.GsK > 5, Max = 40 },
                    TakeoffRoll(AV(AR, "rotate")),
                    new Step { Name = "Vx で上昇", G = G(kt: AV(AR, "x"), pwr: "full", how: "climbFull"), Keys = K("pitch", "rud"), Say = $"{School.Num0(AV(AR, "x"))} kt（Vx）で地上 300 ft まで上昇（障害物を越える）", Tgt = TG(("spd", T(AV(AR, "x"), 5)), ("rhdg", T(0, 10))), GradeWhen = (c, L, st) => c.AglR > 50 && c.AglR < 300, Until = (c, L, st) => c.AglR > 300, Max = 90, Grade = true },
                    new Step { Name = "Vy へ", G = G(kt: AV(AR, "y"), pwr: "full", how: "climbFull"), Keys = K("pitch", "trim"), Say = $"機首を少し下げて {School.Num0(AV(AR, "y"))} kt（Vy）、地上 1,000 ft まで", Tgt = TG(("spd", School.T_SPD(AV(AR, "y")))), GradeWhen = (c, L, st) => st.T > 8, Until = (c, L, st) => c.AglR > 1000, Max = 150, Grade = true },
                }));
            s2.Lessons.Add(LD("n1", "VOR の追跡", "VOR 局に向かうコースに乗り、局通過まで追跡する", "pa28",
                SU("away", brg: 220, km: 22, altFt: 3000, toward: true, offset: 25, kt: 100, nav: "VOR", obsOff: -40, wind: (80, 12, 0.6)),
                new List<Step>
                {
                    new Step { Name = "コースの設定と会合", G = G(kt: 100, how: "level"), Keys = "PFD の CDI キー（NAV1）と CRS、A / D で針路", Say = "NAV1 は LAB VOR（113.50）。CRS を局への方位 {brgV}° 付近に合わせ（CRS）、針が中央へ来るように会合する", Until = (c, L, st) => Math.Abs(c.Cdi) < 1 && L.Av.Cdi == "NAV1" && Math.Abs(W180(L.Av.Crs - c.BrgV)) < 12, Max = 300 },
                    new Step { Name = "VOR 追跡", G = G(kt: 100, how: "level"), Keys = K("roll", "pitch", "trim"), Say = "針を中央に保って VOR 局へ（局上空で TO→FROM）。針が止まる針路を探す", Tgt = TG(("cdi", T(0, 1)), ("alt", TF((L, c) => L.Alt0, 150))), Hold = 60, Until = (c, L, st) => c.DmeV < 0.5, Max = 720, Grade = true, GradeWhen = (c, L, st) => c.DmeV > 1 },
                }));
            s2.Lessons.Add(LD("n2", "推測航法と目的地変更", "針路と時間で目標へ飛び、途中の目的地変更で新しい針路・距離・時間を見積もる", "pa28",
                SU("away", from: "rwy", brg: 10, km: 2, altFt: 3000, hdg: 50, kt: 105, fpl: new List<string> { "LABRW", "LABEA" }, wind: (270, 12, 0.6)),
                new List<Step>
                {
                    new Step { Name = "巡航点検", Checklist = "cruise" },
                    new Step { Name = "LAB-A へ", G = G(kt: 105, how: "level"), Keys = K("roll", "pitch", "thr", "trim"), Say = "LAB-A（架空の訓練点）へ向かう。MFD の地図と GPS の DTK を見て、風上へ修正", Tgt = TG(("alt", TF((L, c) => L.Alt0, 200))), Until = (c, L, st) => DistNm(L, "LABEA") < 1.0 * L.Level.K, Max = 900, Grade = true },
                    new Step { Name = "目的地変更：見積もり", Estimate = "LABEF", Keys = "下の入力欄に針路・距離・時間 → 「見積もりを確定」", Say = "目的地変更！ LAB-F へ。針路（磁）・距離（NM）・所要時間（分）を見積もって入力し、すぐに旋回", Until = (c, L, st) => L.Extra.ContainsKey("estimate"), Max = 150, Result = (L, st) => EstimateRows(L) },
                    new Step { Name = "管制へ連絡", Atc = "divert" },
                    new Step { Name = "LAB-F へ", G = G(kt: 105, how: "level"), Keys = K("roll", "pitch", "thr"), Say = "LAB-F へ向かう（MFD の D→ を使ってもよい）。到着を確認", Tgt = TG(("alt", TF((L, c) => L.Alt0, 200))), Until = (c, L, st) => DistNm(L, "LABEF") < 1.0 * L.Level.K, Max = 900, Grade = true },
                }));
            s2.Lessons.Add(LD("n3", "現在地を見失ったとき（GPS 故障）", "GPS が使えない中、VOR と DME で位置を確かめて飛行場へ戻る", "pa28",
                SU("away", brg: 30, km: 20, altFt: 3000, hdg: 120, kt: 100),
                new List<Step>
                {
                    new Step { Name = "GPS 故障", Say = "GPS 信号を失いました（MFD の地図が使えません）。落ち着いて、まず高度と姿勢を保つ", G = G(kt: 100, how: "level"), Keys = K("pitch", "thr"), Fail = "gps", Dur = 8 },
                    new Step { Name = "管制へ", Atc = "lost" },
                    new Step { Name = "VOR で位置を確かめる", G = G(kt: 100, how: "level"), Keys = "PFD の CDI キー → NAV1、CRS（局への方位を探す）", Say = "CDI を NAV1 に。CRS を回して針が中央・TO になる方位を探し、その方位へ旋回", Until = (c, L, st) => L.Av.Cdi == "NAV1" && Math.Abs(c.Cdi) < 1.5 && Math.Abs(W180(c.Hdg - c.BrgV)) < 25, Max = 300 },
                    new Step { Name = "VOR 局へ", G = G(kt: 100, how: "level"), Keys = K("roll", "pitch"), Say = "針を中央に保って局へ。DME（距離）が減ることを確かめる", Tgt = TG(("alt", TF((L, c) => L.Alt0, 300))), Until = (c, L, st) => c.DmeV < 1.0, Max = 900, Grade = true },
                    new Step { Name = "LAB RWY へ", G = G(kt: 100, how: "level"), Keys = K("roll", "pitch"), Say = "LAB VOR から LAB RWY へ（局から方位 約 250°・5.6 NM）。滑走路が見えたら報告のつもりで", Tgt = TG(("alt", TF((L, c) => L.Alt0, 300))), Until = (c, L, st) => RwyNm(L) < 2, Max = 600, Grade = true },
                }));
            stages.Add(s2);

            // ============================================================ s3
            var s3 = new SyllabusStage { Id = "s3", Title = "第 3 段階　計器飛行の導入", Phase = "p4" };
            s3.Lessons.Add(LD("i1", "基本計器飛行", "計器だけで水平・標準旋回・上昇降下", "pa28",
                SU("area", kt: 100, hdg: 90, hood: true),
                new List<Step>
                {
                    School.StepSL("計器による水平飛行", 100, 30, s => s.Keys = K("pitch", "roll", "thr", "trim")),
                    new Step { Name = "標準旋回（左 90°）", G = G(kt: 100, bank: 17, how: "turn"), Keys = K("roll", "pitch"), Say = "標準旋回率で左へ 90° 旋回し {hdgL}° で止める", Tgt = TG(("alt", School.T_ALT()), ("arate", T(3, 1))), GradeWhen = (c, L, st) => Math.Abs(st.Turned) > 15 && Math.Abs(st.Turned) < 75, Until = (c, L, st) => Math.Abs(st.Turned) > 80 && Math.Abs(c.Bank) < 5, Max = 80, Grade = true,
                        Result = (L, st) => { double d = Math.Abs(W180(L.Last.Hdg - (L.Hdg0 - 90))), tol = Js.Round(10 * L.Level.K); return new List<Row> { R("ロールアウト", $"{Js.Round(d)}° ずれ", $"±{School.Num0(tol)}°", d <= tol) }; } },
                    new Step { Name = "上昇 500 fpm", G = G(kt: 85, fpm: 500, how: "rate"), Keys = K("thr", "pitch"), Say = "500 fpm で {alt1} ft まで上昇（85 kt 前後）", Tgt = TG(("vs", T(500, 150))), GradeWhen = (c, L, st) => c.Alt < L.Alt0 + 900 && EstablishedVs(500, 150, 4)(c, L, st), Until = (c, L, st) => c.Alt > L.Alt0 + 950, Max = 200, Grade = true },
                    new Step { Name = "降下 500 fpm", G = G(kt: 100, fpm: -500, how: "rate"), Keys = K("thr", "pitch"), Say = "100 kt・500 fpm で {alt0} ft まで降下して水平に", Tgt = TG(("vs", T(-500, 150))), GradeWhen = (c, L, st) => c.Alt > L.Alt0 + 100 && EstablishedVs(-500, 150, 4)(c, L, st), Until = (c, L, st) => c.Alt < L.Alt0 + 50, Max = 200, Grade = true },
                }));
            s3.Lessons.Add(LD("i2", "異常姿勢からの回復", "計器だけで、機首上げ・機首下げの異常姿勢から回復する", "pa28",
                SU("area", kt: 100, hdg: 90, hood: true),
                new List<Step>
                {
                    new Step { Name = "異常姿勢 1（機首上げ）", Keys = K("thr", "pitch", "roll"), G = "目安：①全開（R）②W で機首を水平線へ ③A / D で翼を水平。速度が 75 kt を超えたら水平飛行の姿勢（ほぼ 0°）へ", Say = "操縦を渡します。回復して水平に！", Upset = "high", Until = (c, L, st) => Math.Abs(c.Pitch) < 5 && Math.Abs(c.Bank) < 10 && c.Kias > 75, Max = 30, Grade = true,
                        Check = (c, L, st) => { if (c.Stall) st.Set("stall", true); return true; },
                        Result = (L, st) => new List<Row> { R("回復時間", $"{st.T.ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} 秒", "12 秒以内", st.T <= 12), R("失速", st.GetB("stall") ? "あり" : "なし", "なし", !st.GetB("stall")) } },
                    new Step { Name = "水平飛行", G = G(kt: 100, how: "level"), Keys = K("pitch", "thr"), Say = "いったん水平飛行（10 秒）", Dur = 10 },
                    new Step { Name = "異常姿勢 2（機首下げ・スパイラル）", Keys = K("thr", "roll", "pitch"), G = "目安：①アイドル（F）②先に A / D で翼を水平（バンク 0）③それから S で機首をゆっくり水平線まで（荷重 3.8 G 以内、速度が赤線に近ければ特にゆっくり）", Say = "操縦を渡します。回復して水平に！", Upset = "low", Until = (c, L, st) => Math.Abs(c.Pitch) < 5 && Math.Abs(c.Bank) < 10 && c.Vs > -300, Max = 30, Grade = true,
                        Check = (c, L, st) => { st.Set("maxK", Math.Max(st.GetD("maxK"), c.Kias)); st.Set("maxG", Math.Max(st.GetD("maxG"), c.G)); if (st.GetO("order") == null && c.Pitch > -3) st.Set("order", Math.Abs(c.Bank) < 20); if (st.GetO("idle") == null && c.Thr < 0.25) st.Set("idle", st.T); return true; },
                        Result = (L, st) => new List<Row>
                        {
                            R("回復時間", $"{st.T.ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} 秒", "12 秒以内", st.T <= 12),
                            R("最大速度", $"{Js.Round(st.GetD("maxK"))} kt", $"{School.Num0(AV(AR, "ne"))} kt 未満", st.GetD("maxK") < AV(AR, "ne")),
                            R("最大荷重", $"{st.GetD("maxG").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} G", "3.8 G 以下", st.GetD("maxG") <= 3.8),
                            R("手順（翼を先に水平）", st.GetB("order") ? "できた" : "できていない", "機首上げの前に翼水平", st.GetB("order")),
                            R("パワー アイドル", st.GetO("idle") != null ? $"{st.GetD("idle").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} 秒" : "なし", "3 秒以内", st.GetO("idle") != null && st.GetD("idle") <= 3),
                        } },
                }));
            s3.Lessons.Add(LD("i3", "部分パネル（AHRS 故障）", "主の姿勢・方位表示が故障した中で、予備計器で飛ぶ", "pa28",
                SU("area", kt: 95, hdg: 90, hood: true),
                new List<Step>
                {
                    new Step { Name = "故障の発生", Fail = "ahrs", Keys = K("pitch", "roll"), Say = "AHRS 故障！ PFD の姿勢・方位が使えません。右下の予備計器に目を移す", G = G(kt: 95, how: "level", pp: true), Dur = 8 },
                    new Step { Name = "予備計器で水平飛行", G = G(kt: 95, how: "level", pp: true), Keys = K("pitch", "roll", "thr"), Say = "予備の姿勢指示器・高度・昇降率で {alt0} ft、航跡 {hdg0}° を保つ", Tgt = TG(("alt", School.T_ALT(150)), ("trk", TF((L, c) => L.Hdg0, 15))), Hold = 40, Max = 180, Grade = true, GradeWhen = (c, L, st) => st.T > 6 },
                    new Step { Name = "浅い旋回で右 90°", G = G(kt: 95, bank: 12, how: "turn", pp: true), Keys = K("roll", "pitch"), Say = "予備の姿勢指示器でバンク 10〜15°。航跡が {hdgR}° に近づいたら戻す", Tgt = TG(("alt", School.T_ALT(150))), Until = (c, L, st) => Math.Abs(W180(c.Trk - (L.Hdg0 + 90))) < 8 && Math.Abs(c.Bank) < 6, Max = 120, Grade = true,
                        Result = (L, st) => { double d = Math.Abs(W180(L.Last.Trk - (L.Hdg0 + 90))), tol = Js.Round(15 * L.Level.K); return new List<Row> { R("ロールアウト（航跡）", $"{Js.Round(d)}° ずれ", $"±{School.Num0(tol)}°", d <= tol) }; } },
                }));
            s3.Lessons.Add(LD("i8", "部分パネル実践（コンパス旋回・計時旋回）", "AHRS と GPS が落ちた中で、磁気コンパスと時計で旋回して針路を変える", "pa28",
                SU("area", kt: 95, hdg: 90, hood: true),
                new List<Step>
                {
                    new Step { Name = "故障の発生", Fail = "ahrs", Keys = K("pitch", "roll"), Say = "AHRS 故障、GPS も失いました。予備計器と磁気コンパスと時計だけが残っています", G = G(kt: 95, how: "level", pp: true), Dur = 8, OnStart = (L, c, st) => School.FailNow(L, "gps") },
                    new Step { Name = "予備計器で水平飛行", G = G(kt: 95, how: "level", pp: true), Keys = K("pitch", "roll", "thr"), Say = "予備の姿勢指示器・高度・昇降率で {alt0} ft、航跡 {hdg0}° を保つ", Tgt = TG(("alt", School.T_ALT(150)), ("trk", TF((L, c) => L.Hdg0, 15))), Hold = 40, Max = 180, Grade = true, GradeWhen = (c, L, st) => st.T > 6 },
                    new Step { Name = "計時旋回（右 90°・時計で 30 秒）", G = G(kt: 95, bank: 15, how: "turn", pp: true), Keys = K("roll", "pitch"), Say = "標準旋回率（バンク約 15°）で右へ。時計で 30 秒数えたら戻す——コンパスは見ない", Tgt = TG(("alt", School.T_ALT(150))), Until = (c, L, st) => Math.Abs(st.Turned) > 80 && Math.Abs(c.Bank) < 5, Max = 100, Grade = true,
                        Result = (L, st) => { double d = Math.Abs(W180(L.Last.Trk - (L.Hdg0 + 90))), tol = Js.Round(15 * L.Level.K), tt = Js.Round(12 * L.Level.K);
                            return new List<Row> { R("旋回時間（計時）", $"{st.T.ToString("F0", System.Globalization.CultureInfo.InvariantCulture)} 秒", $"30 ±{School.Num0(tt)} 秒", Math.Abs(st.T - 30) <= tt), R("ロールアウト（航跡）", $"{Js.Round(d)}° ずれ", $"±{School.Num0(tol)}°", d <= tol) }; } },
                    new Step { Name = "コンパス旋回（右 90°・西 270° へ）", G = G(kt: 95, bank: 12, how: "turn", pp: true), Keys = K("roll", "pitch"), Say = "磁気コンパスで西（270°）へ。コンパスの進み・遅れを見越して、約 15° 手前で戻し始める", Tgt = TG(("alt", School.T_ALT(150))), Until = (c, L, st) => Math.Abs(st.Turned) > 80 && Math.Abs(c.Bank) < 5, Max = 120, Grade = true,
                        Result = (L, st) => { double d = Math.Abs(W180(L.Last.Trk - 270)), tol = Js.Round(15 * L.Level.K); return new List<Row> { R("ロールアウト（航跡）", $"{Js.Round(d)}° ずれ", $"±{School.Num0(tol)}°", d <= tol) }; } },
                    new Step { Name = "コンパス旋回（右 90°・北 360° へ）", G = G(kt: 95, bank: 12, how: "turn", pp: true), Keys = K("roll", "pitch"), Say = "北（360°）へ。北の近くではコンパスが遅れる——戻し始めは早めに", Tgt = TG(("alt", School.T_ALT(150))), Until = (c, L, st) => Math.Abs(st.Turned) > 80 && Math.Abs(c.Bank) < 5, Max = 120, Grade = true,
                        Result = (L, st) => { double d = Math.Abs(W180(L.Last.Trk - 360)), tol = Js.Round(15 * L.Level.K); return new List<Row> { R("ロールアウト（航跡）", $"{Js.Round(d)}° ずれ", $"±{School.Num0(tol)}°", d <= tol) }; } },
                    new Step { Name = "予備計器で水平飛行（仕上げ）", G = G(kt: 95, how: "level", pp: true), Keys = K("pitch", "roll", "thr"), Say = "北向きで水平に戻し、{alt0} ft を保つ。部分パネルのまま飛び続けられる状態です", Tgt = TG(("alt", School.T_ALT(150)), ("hdg", T(360, 15)), ("trk", T(360, 15))), Hold = 20, Max = 120, Grade = true, GradeWhen = (c, L, st) => st.T > 4 },
                }));
            s3.Lessons.Add(LD("i4", "待機経路（ホールディング）", "VOR を基準に、1 分の直線と標準旋回でレーストラックを飛ぶ", "pa28",
                SU("away", brg: 270, km: 9, altFt: 3000, hdg: 90, kt: 100, nav: "VOR", obs: 90),
                new List<Step>
                {
                    new Step { Name = "進入方式の判定", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（ホールドへの進入）あなたは針路 090° で LAB VOR へ向かっています。インバウンドコース 090°・右旋回のホールドへの進入方式は？", Opts = new List<string> { "Direct entry（そのままコースに乗ってホールドに入る）", "Parallel entry（フィックスを過ぎて平行に飛び、左旋回で戻る）", "Teardrop entry（保持側へ 30° 開いて飛び、右旋回で戻る）" }, Ok = 0, Why = "針路（フィックスへ向かう方向）がインバウンドコースの ±70° 以内なら Direct entry です。保持側から大きく外れた進入は Teardrop、非保持側からは Parallel（AIM 5-3-8）。" }) },
                    new Step { Name = "風修正とタイミング", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（風の修正）風 010°・5 kt、TAS 100 kt、インバウンドコース 090°。アウトバウンドの針路と時間の組み合わせは？", Opts = new List<string> { "針路 約 278°（修正はインバウンドの 3 倍）・約 59 秒", "針路 270°（修正なし）・60 秒", "針路 約 262°（逆向きに 3 倍）・約 61 秒" }, Ok = 0, Why = "インバウンドの風修正角は約 −3°（風に押される分だけ風上へ：針路 087°）。アウトバウンドではその 3 倍を反対向きに取り（270 + 8 ≒ 278°）、時間はインバウンドが 1 分になるよう対地速度の比で調整します（約 59 秒）。" }) },
                    new Step { Name = "局へ向かう", G = G(kt: 100, how: "level"), Keys = K("roll", "pitch"), Say = "インバウンドコース 090° で LAB VOR へ", Tgt = TG(("cdi", T(0, 1.5)), ("alt", TF((L, c) => L.Alt0, 100))), Until = (c, L, st) => c.DmeV < 0.3, Max = 420, Grade = true, GradeWhen = (c, L, st) => c.DmeV > 1 },
                    new Step { Name = "アウトバウンドへ旋回", G = G(kt: 100, bank: 17, how: "turn"), Keys = K("roll", "pitch"), Say = "局通過。右へ標準旋回でアウトバウンド 270° へ", Tgt = TG(("arate", T(3, 1)), ("alt", TF((L, c) => L.Alt0, 100))), GradeWhen = (c, L, st) => st.T > 4 && Math.Abs(W180(c.Hdg - 270)) > 20, Until = (c, L, st) => Math.Abs(W180(c.Hdg - 270)) < 8 && Math.Abs(c.Bank) < 8, Max = 100, Grade = true },
                    new Step { Name = "アウトバウンド 1 分", G = G(kt: 100, how: "level"), Keys = K("pitch", "roll"), Say = "アウトバウンド。1 分数えて、右旋回を始める", Tgt = TG(("alt", TF((L, c) => L.Alt0, 100))), Until = (c, L, st) => st.T > 20 && Math.Abs(c.Bank) > 12, Max = 120, Grade = true,
                        Result = (L, st) => new List<Row> { R("アウトバウンド時間", $"{Js.Round(st.T)} 秒", "60 ±15 秒", Math.Abs(st.T - 60) <= 15) } },
                    new Step { Name = "インバウンドへ", G = G(kt: 100, bank: 17, how: "turn"), Keys = K("roll", "pitch"), Say = "右へ標準旋回してインバウンドコース 090° に乗り、局へ", Tgt = TG(("alt", TF((L, c) => L.Alt0, 100))), Until = (c, L, st) => Math.Abs(c.Cdi) < 1 && Math.Abs(W180(c.Hdg - 90)) < 15, Max = 200, Grade = true },
                }));
            s3.Lessons.Add(LD("i5", "ILS 進入", "ローカライザーとグライドスロープに乗って、決心高度まで計器で進入する", "pa28",
                SU("ils", km: 14, altFt: 2000, hood: true, nav: "ILS"),
                new List<Step>
                {
                    new Step { Name = "進入許可の復唱", Atc = "ils" },
                    new Step { Name = "ローカライザー会合", G = G(kt: 90, how: "level"), Keys = K("roll", "pitch", "thr"), Say = "針路 330° で会合。CDI の針が中央に近づいたら滑走路方位 360° へ", Until = (c, L, st) => Math.Abs(c.Loc) < 1 && Math.Abs(W180(c.Hdg - 360)) < 15, Max = 420 },
                    new Step { Name = "ILS 追跡", G = G(kt: 80, fpm: -430, flaps: 1, how: "ils"), Keys = K("thr", "pitch", "roll", "flaps"), Say = "グライドスロープに乗って降下。両方の針を中央に（決心高度 地上 200 ft）", Tgt = TG(("loc", T(0, 1)), ("gs", T(0, 1))), GradeWhen = (c, L, st) => c.AglR < 1000 && c.AglR > 200, Until = (c, L, st) => c.AglR < 200, Max = 600, Grade = true },
                    new Step { Name = "決心高度：滑走路視認・着陸", Keys = K("thr", "pitch", "brake"), G = "目安：滑走路の端を越えたらアイドル。地上 10〜15 ft から S で少しずつ機首を上げ、最後は機首上げ 約 5°", Say = "決心高度。滑走路が見えました。着陸", HoodOff = true, Until = (c, L, st) => c.OnGround && c.GsK < 3, Max = 150,
                        Check = (c, L, st) => { var td = L.S.Td; if (td != null && st.GetO("td") == null) st.Set("td", td); return true; },
                        Result = (L, st) => { var td = st.GetO("td") as TdRecord; return new List<Row> { R("着陸", td != null && td.OnRunway ? $"滑走路（{School.Num0(td.Fpm)} fpm）" : "滑走路外", "滑走路に安全に（600 fpm 未満）", td != null && td.OnRunway && td.Fpm < 600) }; } },
                }));
            s3.Lessons.Add(LD("i6", "RNAV（GPS）進入", "GPS のファイナルコースと LPV の垂直ガイダンスで、決心高度まで進入して着陸する", "pa28",
                SU("ils", km: 14, altFt: 2000, hood: true, nav: "RNAV"),
                new List<Step>
                {
                    new Step { Name = "進入許可の復唱", Atc = "rnav" },
                    new Step { Name = "ファイナルコース会合", G = G(kt: 90, how: "level"), Keys = K("roll", "pitch", "thr"), Say = "針路 330° で会合。CDI の針が中央に近づいたら滑走路方位 360° へ", Until = (c, L, st) => Math.Abs(c.Loc) < 1 && Math.Abs(W180(c.Hdg - 360)) < 15, Max = 420 },
                    new Step { Name = "RNAV 追跡", G = G(kt: 80, fpm: -430, flaps: 1, how: "ils"), Keys = K("thr", "pitch", "roll", "flaps"), Say = "LPV のパスに乗って降下。針と菱形を中央に（決心高度 305 ft MSL）", Tgt = TG(("loc", T(0, 1)), ("gs", T(0, 1))), GradeWhen = (c, L, st) => c.AglR < 1000 && c.AglR > 200, Until = (c, L, st) => c.Alt <= 310, Max = 600, Grade = true },
                    new Step { Name = "決心高度：滑走路視認・着陸", Keys = K("thr", "pitch", "brake"), G = "目安：滑走路の端を越えたらアイドル。地上 10〜15 ft から S で少しずつ機首を上げ、最後は機首上げ 約 5°", Say = "決心高度（DA 305 ft）。滑走路が見えました。着陸", HoodOff = true, Until = (c, L, st) => c.OnGround && c.GsK < 3, Max = 150,
                        Check = (c, L, st) => { var td = L.S.Td; if (td != null && st.GetO("td") == null) st.Set("td", td); return true; },
                        Result = (L, st) => { var td = st.GetO("td") as TdRecord; return new List<Row> { R("着陸", td != null && td.OnRunway ? $"滑走路（{School.Num0(td.Fpm)} fpm）" : "滑走路外", "滑走路に安全に（600 fpm 未満）", td != null && td.OnRunway && td.Fpm < 600) }; } },
                }));
            s3.Lessons.Add(LD("i7", "実 IMC：ミニマでの判断とミストアプローチ", "低い視程の中で RNAV 進入をミニマまで飛び、滑走路が見えなければ進入復行する", "pa28",
                SU("ils", km: 14, altFt: 2000, hood: true, nav: "RNAV"),
                new List<Step>
                {
                    new Step { Name = "進入許可の復唱", Atc = "rnav" },
                    new Step { Name = "ファイナルコース会合", G = G(kt: 90, how: "level"), Keys = K("roll", "pitch", "thr"), Say = "針路 330° で会合。CDI の針が中央に近づいたら滑走路方位 360° へ", Until = (c, L, st) => Math.Abs(c.Loc) < 1 && Math.Abs(W180(c.Hdg - 360)) < 15, Max = 420 },
                    new Step { Name = "RNAV 追跡（IMC）", G = G(kt: 80, fpm: -430, flaps: 1, how: "ils"), Keys = K("thr", "pitch", "roll", "flaps"), Say = "雲の中。コースと LPV パスを中央に保って DA 305 ft まで降下", Tgt = TG(("loc", T(0, 1)), ("gs", T(0, 1))), GradeWhen = (c, L, st) => c.AglR < 1000 && c.AglR > 200, Until = (c, L, st) => c.Alt <= 310, Max = 600, Grade = true },
                    new Step { Name = "決心高度での判断", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（DA 305 ft MSL に達しました。霧で視程 1/2 SM、前方に滑走路環境は見えません）どうしますか？", Opts = new List<string> { "ミストアプローチ：フルパワーで上昇し、LAB-D へ直行・3,000 ft へ", "滑走路が見えるまで、このまま降下を続ける", "DA のまま水平飛行して、滑走路を探す" }, Ok = 0, Why = "DA で滑走路環境（進入灯・滑走路端・センターライン等）が見えなければ、着陸はできません。降下の継続も、DA での水平飛行（そのままでは障害物との余裕がありません）も不可。直ちに進入復行手順へ。" }) },
                    new Step { Name = "ミストアプローチ", G = G(kt: 90, pwr: "full", how: "climbFull"), Keys = K("thr", "pitch", "flaps"), Say = "ミストアプローチ！ フルパワー・上昇姿勢・フラップは段階的に。3,000 ft へ上昇", Until = (c, L, st) => c.Alt >= 2900, Max = 420, Grade = true, Tgt = TG(("spd", School.T_SPD(90))), GradeWhen = (c, L, st) => st.T > 8,
                        OnStart = (L, c, st) => st.Set("min", c.Alt),
                        Check = (c, L, st) => { st.Set("min", Math.Min(st.GetD("min", c.Alt), c.Alt)); if (c.Flaps > 1) st.Set("flapLate", true); return true; },
                        Result = (L, st) => new List<Row> { R("進入復行中の最低高度", $"{Js.Round(st.GetO("min") != null ? st.GetD("min") : 305)} ft MSL", "DA 305 ft から 100 ft 以内", (st.GetO("min") != null ? st.GetD("min") : 305) >= 205) } },
                }));
            stages.Add(s3);
            BuildStages3(stages);
        }
    }
}
