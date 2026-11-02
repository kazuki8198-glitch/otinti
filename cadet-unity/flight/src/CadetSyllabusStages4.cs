// CADET — CadetSyllabusStages4.cs : stages s5–s7, PHASES, and the registry.
using System;
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;

namespace Cadet
{
    public static partial class Syllabus
    {
        static void BuildStages4(List<SyllabusStage> stages)
        {
            // ============================================================ s5
            var s5 = new SyllabusStage { Id = "s5", Title = "第 5 段階　CRM・TEM（考え方の練習）", Phase = "p6" };
            var r1steps = new List<Step>
            {
                new Step { Name = "ブリーフィング：最大の脅威", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = $"（今日の LAB：風 {L.WindStr}、突風あり。場周には訓練機がほかに 2 機。あなたは寝不足気味。）最も対策が必要な脅威と対策の組み合わせは？", Opts = new List<string> { "突風を伴う横風 → 進入速度に突風分の半分を足し、安定しなければ早めにゴーアラウンド", "他機 → 無線を切って集中する", "寝不足 → コーヒーを飲めば問題ない" }, Ok = 0, Why = "突風を伴う横風は着陸の大きな脅威。突風成分の半分を進入速度に足すのは広く教えられている目安（POH・教官の指示が優先）。寝不足も脅威で、IMSAFE で自分を点検する（重ければ飛ばない判断も）。" }) },
                new Step { Name = "着陸許可の復唱", Atc = "landing" },
                new Step { Name = "ダウンウインド", G = G(kt: 90, how: "level"), Keys = K("pitch", "roll", "thr"), Say = "ダウンウインド：地上 1,000 ft・90 kt・方位 180°", Tgt = TG(("aglR", T(1000, 100)), ("spd", School.T_SPD(90)), ("dwhdg", T(0, 10))), Until = (c, L, st) => c.Along < 300, Max = 150, Grade = true },
                new Step { Name = "食い違いに気づく", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = $"LAB Tower: \"{L.Call}, extend downwind, number two, follow the Cessna on a two-mile final, cleared to land runway 18.\"", Opts = new List<string> { $"Say again the runway for {L.CallShort}?（使用中は 36 のはず：確認する）", $"Cleared to land runway 18, {L.CallShort}.", "（無線は返さず、そのまま 36 へ）" }, Ok = 0, Why = "先ほどの許可は 36。食い違いは「Say again」で確認する。聞き間違い・言い間違いはどちらにも起きる（エラー）。確認すればエラーは管理できる。" }) },
                new Step { Name = "ベースへ", G = G(kt: 75, fpm: -500, flaps: 2, how: "pattern"), Keys = K("thr", "flaps", "roll"), Say = "「Runway 36, cleared to land」と再確認できた想定。アビームからパワー・フラップ、ベース・ファイナルへ", Until = (c, L, st) => Math.Abs(c.Cross) < 150 && Math.Abs(W180(c.Hdg - 360)) < 40 && c.Along < -400, Max = 300 },
            };
            r1steps.AddRange(LandingSteps(AV(AR, "appr") + 4, new LandingOpt { Xwind = true }));
            s5.Lessons.Add(LD("r1", "TEM：脅威を予測して管理する", "出発前に脅威を挙げ、飛行中の変化に早めに気づいて対処する", "pa28", SU("downwind", wind: (70, 10, 1.6)), r1steps));
            stages.Add(s5);

            // ============================================================ s6
            var s6 = new SyllabusStage { Id = "s6", Title = "第 6 段階　複雑機エンドースメント＋教官飛行（試作）", Phase = "p6" };
            s6.Lessons.Add(LD("cx1", "複雑機への移行：離陸・脚上げ・プロペラ設定", "Arrow で離陸し、脚を上げ、巡航ではプロペラレバーで回転数を設定する", "pa28r", SU("runway"),
                new List<Step>
                {
                    new Step { Name = "離陸前点検（複雑機）", Checklist = "cx_before_takeoff" },
                    new Step { Name = "離陸許可の復唱", Atc = "takeoff" },
                    TakeoffRoll(AV(AW, "rotate")),
                    new Step { Name = "正の上昇・脚上げ", G = G(kt: AV(AW, "y"), pwr: "full", how: "climbFull"), Keys = K("gear", "pitch"), Say = "正の上昇を確認して脚 UP（G）", Until = (c, L, st) => !c.GearDown || c.AglR > 600, Max = 60,
                        Result = (L, st) => new List<Row> { R("脚上げ", !L.S.GearDown ? $"地上 {Js.Round(L.Last.AglR)} ft で UP" : "上げていない", "地上 500 ft まで", !L.S.GearDown && L.Last.AglR <= 600) } },
                    new Step { Name = "上昇", G = G(kt: AV(AW, "y"), pwr: "full", how: "climbFull"), Keys = K("pitch", "trim"), Say = $"{School.Num0(AV(AW, "y"))} kt で地上 1,500 ft まで上昇", Tgt = TG(("spd", School.T_SPD(AV(AW, "y"))), ("rhdg", T(0, 10))), GradeWhen = (c, L, st) => c.AglR > 300, Until = (c, L, st) => c.AglR > 1500, Max = 200, Grade = true },
                    new Step { Name = "レベルオフ", G = G(kt: 110, how: "level"), Keys = K("pitch", "thr", "trim"), Say = "水平に戻して 110 kt へ。トリムを取る", Tgt = TG(("spd", School.T_SPD(110))), Hold = 12, Max = 90, Grade = true, GradeWhen = (c, L, st) => st.T > 5, OnEnd = (L, c, st) => { L.Alt0 = Js.Round(c.Alt / 100) * 100; } },
                    new Step { Name = "巡航で安定", G = G(kt: 110, how: "level"), Keys = K("thr", "trim"), Say = "110 kt の巡航で安定させる（スロットルが落ち着くまで）", Dur = 10 },
                    new Step { Name = "プロペラを巡航設定へ（2,400 rpm）", PropTo = 0.625, G = G(kt: 110, how: "level"), Keys = K("prop", "manin"), Say = "プロペラレバーを引いて 2,400 rpm 設定へ（, キー）。RPM が下がり、MAN IN が少し上がるのを確かめる",
                        Check = (c, L, st) => { if (c.Prop > 0.9) { st.Set("rpm0", c.Rpm); st.Set("man0", c.ManIn); } else if (c.Prop <= 0.66) { st.Set("rpmSet", c.Rpm); st.Set("manSet", c.ManIn); st.Set("kSet", c.PropK); } return true; },
                        Until = (c, L, st) => c.Prop <= 0.66 && st.T > 12, Max = 90, Grade = true, Tgt = TG(("spd", School.T_SPD(110)), ("alt", School.T_ALT(150))),
                        Result = (L, st) => new List<Row>
                        {
                            R("プロペラ設定", $"{Js.Round(1900 + 800 * L.S.Prop)} rpm 設定", "2,400 ±150 rpm", Math.Abs(1900 + 800 * L.S.Prop - 2400) <= 150),
                            R("回転数の低下", st.GetO("rpmSet") != null ? $"{Js.Round(st.GetD("rpm0"))} → {Js.Round(st.GetD("rpmSet"))} rpm" : "—", "150 rpm 以上下がる", st.GetO("rpmSet") != null && st.GetD("rpm0") - st.GetD("rpmSet") >= 150),
                            R("出力係数（回転数の分）", st.GetO("kSet") != null ? st.GetD("kSet").ToString("F2", System.Globalization.CultureInfo.InvariantCulture) : "—", "0.90〜0.97（下がる）", st.GetO("kSet") != null && st.GetD("kSet") <= 0.97 && st.GetD("kSet") >= 0.88),
                            R("MAN IN の上昇", st.GetO("manSet") != null ? $"{st.GetD("man0").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} → {st.GetD("manSet").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} inHg" : "—", "同じスロットルで少し上がる", st.GetO("manSet") != null && st.GetD("manSet") >= st.GetD("man0") + 0.2),
                        } },
                    new Step { Name = "プロペラを前へ戻す", PropTo = 1, G = G(kt: 110, how: "level"), Keys = K("prop"), Say = "プロペラを FULL FORWARD へ戻す（. キー）。着陸・ゴーアラウンドの形", Until = (c, L, st) => c.Prop >= 0.98, Max = 60,
                        Result = (L, st) => new List<Row> { R("プロペラ", L.S.Prop >= 0.98 ? "FULL FORWARD" : "戻っていない", "FULL FORWARD", L.S.Prop >= 0.98) } },
                }));
            var cx2steps = new List<Step> { new Step { Name = "着陸前点検（GUMPS）", Checklist = "cx_before_landing" } };
            cx2steps.AddRange(LandingSteps(AV(AW, "appr"), new LandingOpt { TdSpdTol = 20 }));
            s6.Lessons.Add(LD("cx2", "複雑機の進入と着陸（GUMPS）", "脚とプロペラの確認（GUMPS）をして、Arrow で安定した進入から着陸する", "pa28r", SU("final", km: 5), cx2steps));
            s6.Lessons.Add(LD("cx3", "複雑機のゴーアラウンド（手順の順序）", "フルパワー・プロペラ前へ・フラップ段階・脚上げを、正しい順序で素早く", "pa28r",
                SU("final", km: 4, onStart: L => { L.S.Prop = 0.625; }),
                new List<Step>
                {
                    new Step { Name = "進入", G = G(kt: AV(AW, "appr"), fpm: -370, flaps: 3, how: "approach"), Keys = K("thr", "pitch"), Say = $"{School.Num0(AV(AW, "appr"))} kt・3° で進入を続ける（プロペラは巡航設定のまま）", Tgt = TG(("spd", School.T_SPD(AV(AW, "appr"), 8)), ("cl", T(0, 40))), Until = (c, L, st) => c.AglR < 300, Max = 180, Grade = true, GradeWhen = (c, L, st) => c.AglR < 900 },
                    new Step { Name = "ゴーアラウンド（複雑機の手順）", PropTo = 1, G = G(kt: AV(AW, "x"), pwr: "full", flaps: 2, how: "climbFull"), Keys = K("thr", "prop", "flaps", "gear"), Say = "ゴーアラウンド！ フルパワー → プロペラ前へ → フラップ段階 → 正の上昇で脚 UP", Until = (c, L, st) => c.AglR > 800, Max = 150, Grade = true, Tgt = TG(("spd", T(AV(AW, "x") + 4, 12))), GradeWhen = (c, L, st) => st.T > 8,
                        OnStart = (L, c, st) => { st.Set("a0", c.AglR); st.Set("min", c.AglR); },
                        Check = (c, L, st) => { st.Set("min", Math.Min(st.GetD("min", c.AglR), c.AglR)); if (st.GetO("pwr") == null && c.Thr > 0.95) st.Set("pwr", st.T); if (st.GetO("propT") == null && c.Prop >= 0.98) st.Set("propT", st.T); if (c.OnGround) st.Set("touched", true); return true; },
                        Result = (L, st) => new List<Row>
                        {
                            R("フルパワーまで", st.GetO("pwr") == null ? "—" : $"{st.GetD("pwr").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} 秒", "3 秒以内", st.GetO("pwr") != null && st.GetD("pwr") <= 3),
                            R("プロペラ前へ", st.GetO("propT") == null ? "—" : $"{st.GetD("propT").ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} 秒", "5 秒以内", st.GetO("propT") != null && st.GetD("propT") <= 5),
                            R("脚", L.S.GearDown ? "DOWN のまま" : "UP", "地上 800 ft までに UP", !L.S.GearDown),
                            R("高度損失", $"{Js.Round(st.GetD("a0") - st.GetD("min"))} ft", "50 ft 以内", st.GetD("a0") - st.GetD("min") <= 50 * L.Level.K && !st.GetB("touched")),
                        } },
                }));
            s6.Lessons.Add(LD("cf1", "CFI 試作：訓練生に同乗する（指摘と介入）", "右席の教官として、訓練生の飛行を見て、ずれに気づいて指摘し、最後は自分で立て直す", "pa28", SU("area", kt: 95, hdg: 90),
                new List<Step>
                {
                    new Step { Name = "ブリーフィング：今日の注意点", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（訓練生の前回の記録：上昇・降下のあと、高度を戻すのが遅れがち。今日の水平飛行で、教官として最初に見るべきものは？）", Opts = new List<string> { "高度と昇降率：レベルオフの遅れが出る場所だから", "無線の言い方だけ", "訓練生の手の動きだけ（計器は見ない）" }, Ok = 0, Why = "教官の観察は「前回の弱点が出る場所」から始める。記録に基づくブリーフィングが、飛行中の気づきを速くする。" }) },
                    new Step { Name = "訓練生の飛行（同乗・観察）", Keys = "操作しない（観察：高度・速度・針路のずれの種類と大きさを見る）", Say = "訓練生が飛びます。手は出さず、ずれが育つか、どの種類かを見ていてください", Dur = 42,
                        OnStart = (L, c, st) => { L.S.Opts.AutoRud = true; st.Set("maxDev", 0.0); },
                        Check = (c, L, st) => { TraineeFly(L, c, st); return true; },
                        OnEnd = (L, c, st) => { L.S.Ovr = null; L.Extra["cfiDev"] = (double)Js.Round(st.GetD("maxDev")); L.Extra["cfiKind"] = st.GetD("kind"); },
                        Result = (L, st) => new List<Row> { R("訓練生のずれ（再現）", $"最大 {Js.Round(st.GetD("maxDev"))} ft（{CFI_MISTAKES[(int)st.GetD("kind")]})", "シードのミスが再現される", st.GetD("maxDev") >= 40) } },
                    new Step { Name = "指摘：何が起きているか", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = $"（訓練生の飛行：{CFI_MISTAKES[(int)LDbl(L, "cfiKind")]}。高度は最大で約 {School.Num0(LDbl(L, "cfiDev"))} ft ずれました。指摘として正しいものは？）", Opts = new List<string> { $"「高度が {School.Num0(Js.Round(LDbl(L, "cfiDev") / 50) * 50)} ft ずれている。まず昇降率を見て、機首で戻そう」（ずれの種類と大きさと、直し方を言う）", "「ちゃんとやって」（具体的に言わない）", "（何も言わず、黙って自分の操縦に替える）" }, Ok = 0, Why = "指摘は「何が・どれだけ・どう直すか」を短く。いきなり替わるのは最後の手段で、まず言葉で直させるのが教官の基本（ただし安全の限界を超えそうなら即交代）。" }) },
                    new Step { Name = "介入：自分で立て直す", G = G(kt: 95, how: "level"), Keys = K("pitch", "roll", "thr", "trim"), Say = "「I have control」。高度 {alt0} ft・針路 {hdg0}°・95 kt に戻して保つ", Tgt = TG(("alt", School.T_ALT()), ("hdg", School.T_HDG()), ("spd", School.T_SPD(95))), Hold = 15, Max = 120, Grade = true, GradeWhen = (c, L, st) => st.T > 4 },
                    new Step { Name = "講評：訓練生への言い方", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（着陸後の講評。訓練生に最初に言うべきことは？）", Opts = new List<string> { "「レベルオフのあと高度がずれたね。昇降率を先に見る癖をつけよう。次はそこだけ練習しよう」（具体的な事実＋次の練習）", "「全体的にダメだった」（総評だけ）", "「センスがないのかも」（人格に触れる）" }, Ok = 0, Why = "講評は具体的な事実から、次の練習につなげる。人格ではなく行動を扱うのが、教官の講評の原則。" }) },
                }));
            var cf2steps = new List<Step>
            {
                new Step { Name = "ブリーフィング：今日の訓練生", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（訓練生タカハシの記録：着陸のフレアに癖が残っている。今日の進入で、教官として接地の前に見るべきものは？）", Opts = new List<string> { "狙点・速度・沈下率：進入の安定とフレアの開始が、接地を決めるから", "無線の言い方だけ", "訓練生の手の動きだけ（計器と外の数字は見ない）" }, Ok = 0, Why = "教官の目は「狙点に合っているか・速度は・沈下は」に置く。接地の質は、接地の瞬間ではなく進入とフレアの開始で決まっている。" }) },
                new Step { Name = "訓練生の進入と着陸（同乗・観察）", Observe = true, Keys = "操作しない（観察：フレアをいつ始めるか、接地の浮き／沈下の数字を見る）", Say = "訓練生が着陸します。手は出さず、フレアの開始と接地がどうなるかを見ていてください", Until = (c, L, st) => c.OnGround && c.GsK < 3, Max = 260,
                    OnStart = (L, c, st) => { L.S.Opts.AutoRud = true; st.Set("tdAfter", L.S.T); },
                    Check = (c, L, st) => { TraineeLand(L, c, st, "error"); return true; },
                    OnEnd = (L, c, st) => { L.S.Ovr = null; if (st.GetO("floatM") != null) L.Extra["cfiFloat"] = st.GetD("floatM"); if (st.GetO("sink") != null) L.Extra["cfiSink"] = st.GetD("sink"); if (st.GetO("along") != null) L.Extra["cfiAlong"] = st.GetD("along"); L.Extra["cfiKind"] = st.GetD("kind"); },
                    Result = (L, st) => new List<Row> { R("訓練生の接地（再現）", $"フロート {(st.GetO("floatM") != null && !double.IsNaN(st.GetD("floatM")) ? st.GetD("floatM") + " m" : "—")}・沈下 {(st.GetO("sink") != null ? st.GetD("sink") + " fpm" : "—")}・接地位置 {(st.GetO("along") != null ? st.GetD("along") + " m" : "—")}（{CFI_FLARE[(int)st.GetD("kind")]})", "シードの癖が実測に出る", (int)st.GetD("kind") == 0 ? st.GetD("sink") >= 500 : st.GetD("floatM") >= 460) } },
                new Step { Name = "診断と指導：何をどう直すか", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = $"（訓練生の着陸：{CFI_FLARE[(int)LDbl(L, "cfiKind")]}。実測はフロート {(L.Extra.ContainsKey("cfiFloat") ? LDbl(L, "cfiFloat") + " m" : "—")}・沈下 {(L.Extra.ContainsKey("cfiSink") ? LDbl(L, "cfiSink") + " fpm" : "—")} でした。次の進入の前に言うべきことは？）", Opts = new List<string> { (int)LDbl(L, "cfiKind") == 0 ? "「フレアが早すぎる。滑走路の端を過ぎるまでパワーを残し、地上 25 ft くらいから一段目、13 ft から深く。浮いたら引くのを止めて待つ」（癖と直し方を数字で言う）" : "「速度が 10 kt 速い。狙点と速度を見て、70 kt に合わせてからフレア。速いままでは浮いて伸びる」（癖と直し方を数字で言う）", "「もっと丁寧にやろう」（具体的に言わない）", "（何も言わず、次の進入から自分が替わる）" }, Ok = 0, Why = "指導は「何が・どれだけ・どう直すか」を数字で短く。癖を名指しできた指導だけが、次の着陸を変える。" }) },
                new Step { Name = "訓練生の再着陸：指導は届いたか", Observe = true, Keys = "操作しない（観察：同じ数字がどう変わるかを見る）", Say = "訓練生がもう一度着陸します。指導が届いたかは、接地の数字で分かります", Until = (c, L, st) => c.OnGround && c.GsK < 3, Max = 260,
                    OnStart = (L, c, st) => { ToFinal(L, 4); L.S.Opts.AutoRud = true; st.Set("tdAfter", L.S.T); },
                    Check = (c, L, st) => { TraineeLand(L, c, st, L.AtcResult != null && (double)L.AtcResult["i"] == 0 ? "fixed" : "mild"); return true; },
                    OnEnd = (L, c, st) => { L.S.Ovr = null; if (st.GetO("floatM") != null) L.Extra["cfi2Float"] = st.GetD("floatM"); if (st.GetO("sink") != null) L.Extra["cfi2Sink"] = st.GetD("sink"); if (st.GetO("along") != null) L.Extra["cfi2Along"] = st.GetD("along"); },
                    Result = (L, st) => new List<Row> { R("再着陸の接地", $"フロート {(st.GetO("floatM") != null && !double.IsNaN(st.GetD("floatM")) ? st.GetD("floatM") + " m" : "—")}・沈下 {(st.GetO("sink") != null ? st.GetD("sink") + " fpm" : "—")}（前回 フロート {(L.Extra.ContainsKey("cfiFloat") ? LDbl(L, "cfiFloat") + " m" : "—")}・沈下 {(L.Extra.ContainsKey("cfiSink") ? LDbl(L, "cfiSink") + " fpm" : "—")}）", (int)LDbl(L, "cfiKind") == 0 ? "沈下 320 fpm 以下" : "フロート 380 m 以内", (int)LDbl(L, "cfiKind") == 0 ? (st.GetO("sink") != null ? st.GetD("sink") : 999) <= 320 : (st.GetO("floatM") != null ? st.GetD("floatM") : 9999) <= 380) } },
            };
            cf2steps.AddRange(DemoSteps());
            cf2steps.Add(new Step { Name = "講評：訓練生への言い方", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（着陸後の講評。訓練生に最初に言うべきことは？）", Opts = new List<string> { "「フレアの開始が変わると、接地の数字がこう変わったね。次はその開始のタイミングだけを練習しよう」（実測の事実＋次の練習）", "「全体的にダメだった」（総評だけ）", "「センスがないのかも」（人格に触れる）" }, Ok = 0, Why = "講評は実測の事実から、次の練習につなげる。数字で見せると、訓練生は自分の変化を信じられる。" }) });
            s6.Lessons.Add(LD("cf2", "CFI：着陸のフレアを指導する", "訓練生の進入に同乗し、フレアの誤りを実測で見抜いて言葉で直させ、最後に自分で見せる", "pa28", SU("final", km: 5), cf2steps));
            s6.Lessons.Add(LD("cf3", "CFI：水平直線の保持を指導する", "訓練生の保持ミスを測り、「気づかせる」指導で直させる——介入は自分の腕の確認", "pa28", SU("area", kt: 95, hdg: 90),
                new List<Step>
                {
                    new Step { Name = "ブリーフィング：観察の順序", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（訓練生タカハシの記録：水平直線の保持に課題が残る。今日の飛行で、教官の目の順序は？）", Opts = new List<string> { "姿勢→高度→姿勢→針路→姿勢→速度のクロスチェック：ずれの種類を切り分けるため", "高度計だけを見続ける", "訓練生の手の動きだけ（計器は見ない）" }, Ok = 0, Why = "ずれの「種類」は、1 つの計器では分からない。姿勢を中心に目を回すクロスチェックが、診断の速さを決める。" }) },
                    new Step { Name = "訓練生の飛行 ①（同乗・観察）", Observe = true, Keys = "操作しない（観察：高度・針路・速度のずれの種類と大きさを見る）", Say = "訓練生が水平直線を飛びます。手は出さず、ずれの種類と大きさを掴んでください", Dur = 38,
                        OnStart = (L, c, st) => { L.S.Opts.AutoRud = true; },
                        Check = (c, L, st) => { TraineeSL(L, c, st, "first"); return true; },
                        OnEnd = (L, c, st) => { L.S.Ovr = null; L.Extra["cfiScore1"] = CfiScore(st); L.Extra["cfiDev"] = (double)Js.Round(st.GetD("maxDev")); L.Extra["cfiHdg"] = (double)Js.Round(st.GetD("maxHdg")); L.Extra["cfiKind"] = st.GetD("kind"); },
                        Result = (L, st) => new List<Row> { R("訓練生のずれ（再現）", $"高度 最大 {Js.Round(st.GetD("maxDev"))} ft・針路 最大 {Js.Round(st.GetD("maxHdg"))}°・最低速度 {(st.GetO("minSpd") != null ? Js.Round(st.GetD("minSpd")) + " kt" : "—")}（{CFI_SL_MISTAKES[(int)st.GetD("kind")]})", "シードの癖が実測に出る", CfiScore(st) >= 45) } },
                    new Step { Name = "指導：どう声をかけるか", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = $"（訓練生の飛行：{CFI_SL_MISTAKES[(int)LDbl(L, "cfiKind")]}。ずれの大きさは高度 {School.Num0(LDbl(L, "cfiDev"))} ft・針路 {School.Num0(LDbl(L, "cfiHdg"))}° でした。ここでの声かけは？）", Opts = new List<string> { "「昇降率と姿勢と、どっちが先に動いたと思う？」（気づかせる質問：自分で見つけさせる）", "「ずれたら機首で直して。次は見ているから」（直接の指示）", "（何も言わず、黙って自分の操縦に替える）" }, Ok = 0, Why = "直し方を言うより「何が起きたか」に気づかせる質問が定着する。直接の指示はその場は直っても戻りやすく、黙って替わると訓練生には何も残らない——次の区間がそれを証明します。" }) },
                    new Step { Name = "訓練生の飛行 ②：指導の効果", Observe = true, Keys = "操作しない（観察：第 1 区間と数字を比べる）", Say = "訓練生がもう一度飛びます。指導が届いたかは、ずれの数字で分かります", Dur = 34,
                        OnStart = (L, c, st) => { L.S.Opts.AutoRud = true; },
                        Check = (c, L, st) => { TraineeSL(L, c, st, L.AtcResult != null && (double)L.AtcResult["i"] == 0 ? "learn" : L.AtcResult != null && (double)L.AtcResult["i"] == 1 ? "direct" : "none"); return true; },
                        OnEnd = (L, c, st) => { L.S.Ovr = null; L.Extra["cfiScore2"] = CfiScore(st); },
                        Result = (L, st) => new List<Row> { R("指導の効果（第 2 区間）", $"ずれのスコア {School.Num0(CfiScore(st))}（第 1 区間 {(L.Extra.ContainsKey("cfiScore1") ? School.Num0(LDbl(L, "cfiScore1")) : "—")}）", "第 1 区間の 85% 以下", L.Extra.ContainsKey("cfiScore1") && CfiScore(st) <= LDbl(L, "cfiScore1") * 0.85) } },
                    new Step { Name = "介入：自分で立て直す", G = G(kt: 95, how: "level"), Keys = K("pitch", "roll", "thr", "trim"), Say = "「I have control」。高度 {alt0} ft・針路 {hdg0}°・95 kt に戻して保つ", Tgt = TG(("alt", School.T_ALT()), ("hdg", School.T_HDG()), ("spd", School.T_SPD(95))), Hold = 15, Max = 120, Grade = true, GradeWhen = (c, L, st) => st.T > 4 },
                    new Step { Name = "講評：訓練生への言い方", Atc = (Func<LessonState, AtcQ>)(L => new AtcQ { Msg = "（飛行後の講評。訓練生に最初に言うべきことは？）", Opts = new List<string> { "「今日のずれは自分で見つけられたね。見つけた瞬間に何を見ていたか、覚えておこう」（気づきの事実＋次へのつなぎ）", "「全体的にダメだった」（総評だけ）", "「センスがないのかも」（人格に触れる）" }, Ok = 0, Why = "講評は「自分で気づけた」という事実を残すこと。教官の仕事は、訓練生が 1 人で気づける目を作ることにある。" }) },
                }));
            stages.Add(s6);
            BuildStages5(stages);
        }

        static double LDbl(LessonState L, string k) { object v; return L.Extra.TryGetValue(k, out v) && v is double ? (double)v : 0; }
    }
}
