// CADET — CadetSchoolData.cs : school.js's HOW guide texts, the teaching
// checklists (with their state tests) and the ATC read-back questions.
using System;
using System.Collections.Generic;

namespace Cadet
{
    public class ChecklistItem
    {
        public string Name, Text;
        public Func<State, string> TextFn;
        public Func<State, bool> Test;
        public ChecklistItem(string name, string text, Func<State, bool> test = null) { Name = name; Text = text; Test = test; }
        public ChecklistItem(string name, Func<State, string> textFn, Func<State, bool> test = null) { Name = name; TextFn = textFn; Test = test; }
    }
    public class ChecklistDef { public string Title; public List<ChecklistItem> Items; }

    public static partial class School
    {
        public static readonly Dictionary<string, string> HOW = new Dictionary<string, string>
        {
            { "climbFull", "速度が速ければ機首を 1〜2° 上げ、遅ければ下げる。出力は全開のまま（上昇中の速度は機首で合わせる）" },
            { "level", "高度が 50 ft ずれたら機首を 1〜2° 動かして戻す。速度のずれはスロットル（R / F）で直し、落ち着いたらトリム（T）" },
            { "rate", "昇降率のずれは出力で、速度のずれは機首で直す。目標高度の 10% 手前からレベルオフ" },
            { "glide", "速度が速ければ機首を上げ、遅ければ下げる。出力で直せないので速度は機首だけで保つ" },
            { "turn", "高度が下がり始めたら機首を少し上げる。沈みが止まらなければバンクを少し浅くしてから引く" },
            { "approach", "進入角が深い（PAPI の白が多い）ならパワーを少し絞り、浅い（赤が多い）なら足す。速度のずれは機首で直す" },
            { "slow", "低速では速度は機首、高度はパワー。高度が下がればパワーを足し、速度が落ちれば機首を下げる" },
            { "pattern", "このままでは低くなりそうならパワーを足し、高くなりそうなら絞る。速度のずれは機首で直す" },
            { "ils", "GS の菱形が下（自分が高い）ならパワーを少し絞り、上（低い）なら足す。CDI の針の方へ 2〜5° ずつ針路を直す。速度のずれは機首で" },
            { "oei", "速度は機首で（青線 Vyse を割らない）。生きているエンジン側へ 2〜5° バンクし、ボールは生きている側へ半分。止まった側の足は踏まない（Dead foot, dead engine）" },
        };

        // the lever / selector a checklist reads (school.js's mixNow / selNow / fullerSide)
        public static double MixNow(State s, EngState e) { return s.MixCmd != s.Mix ? s.Mix : e.Mix; }
        public static string SelNow(State s, EngState e) { return s.SelCmd != s.FuelSel ? s.FuelSel : (e.Sel ?? "L"); }
        static bool FullerSide(State s)
        {
            string sel = SelNow(s, s.Eng[0]);
            return sel != "OFF" && s.Fuel[sel == "R" ? 1 : 0] >= s.Fuel[sel == "R" ? 0 : 1] - 0.25;
        }
        static string WbText(State s)
        {
            var w = s.Wb; if (w == null) return "標準の搭載";
            string head = $"総重量 {Num0(Js.Round(w.Lb))} lb・重心 {w.CgIn.ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} in";
            if (w.Ok) return $"{head}（範囲内）";
            var whys = new List<string>();
            foreach (var k in w.Problems) whys.Add(k == "over" ? $"最大離陸重量 {Num0(w.MtowLb)} lb を超過" : k == "nose" ? $"重心が前限界 {w.FwdIn} in より前" : $"重心が後限界 {w.AftIn} in より後");
            return $"{head}：{string.Join("・", whys)}。搭載を直してから出発（課目を終了し、ブリーフィングで搭載を選び直す）";
        }
        static bool WbOk(State s) { return s.Wb == null || s.Wb.Ok; }
        static bool AllEng(State s, Func<State, EngState, bool> f) { foreach (var e in s.Eng) if (!f(s, e)) return false; return true; }

        public static readonly Dictionary<string, ChecklistDef> CHECKLISTS = BuildChecklists();

        static Dictionary<string, ChecklistDef> BuildChecklists()
        {
            var d = new Dictionary<string, ChecklistDef>();
            d["before_takeoff"] = new ChecklistDef { Title = "離陸前点検（BEFORE TAKEOFF・教材の簡略版）", Items = new List<ChecklistItem>
            {
                new ChecklistItem("ドア・シートベルト", "閉・着用"),
                new ChecklistItem("操縦舵面", "自由・正しい向きに動く（W / S / A / D / Q / E で確認）"),
                new ChecklistItem("計器（G1000 型）", "PFD・MFD 異常なし、高度計規正（BARO）"),
                new ChecklistItem("重量と重心", (Func<State, string>)WbText, (Func<State, bool>)WbOk),
                new ChecklistItem("燃料セレクター", "燃料の多い側", s => FullerSide(s)),
                new ChecklistItem("フラップ", "UP（通常離陸）", s => s.FlapIdx == 0),
                new ChecklistItem("トリム", "離陸位置（Shift+T でリセット）", s => Math.Abs(s.Trim) < 0.05),
                new ChecklistItem("スロットル", "アイドル", s => s.Thr < 0.1),
                new ChecklistItem("離陸の計画", s => $"Vr {s.A.VGet("rotate")}・Vy {s.A.VGet("y")}。浮揚前の異常は止まる、浮揚後のエンジン故障は正面へ"),
            } };
            d["before_landing"] = new ChecklistDef { Title = "着陸前点検（BEFORE LANDING・教材の簡略版）", Items = new List<ChecklistItem>
            {
                new ChecklistItem("燃料セレクター", "燃料の多い側", s => FullerSide(s)),
                new ChecklistItem("ミクスチャー", "RICH（降下前に戻す）", s => AllEng(s, (ss, e) => MixNow(ss, e) >= 0.95)),
                new ChecklistItem("フラップ", "進入に合わせて下げる（V キー）", s => s.FlapIdx >= 1),
                new ChecklistItem("進入速度", s => $"{s.A.VGet("appr")} kt（短距離 {(s.A.V.ContainsKey("apprShort") ? s.A.VGet("apprShort") : s.A.VGet("appr") - 5)} kt）"),
                new ChecklistItem("着陸許可", "受領・復唱"),
            } };
            d["cruise"] = new ChecklistDef { Title = "巡航点検（CRUISE・教材の簡略版）", Items = new List<ChecklistItem>
            {
                new ChecklistItem("ミクスチャー", s => $"リーン：密度高度 {Js.Round(s.Out.DensAlt)} ft。操縦席のミクスチャーをホイールで少しずつ引き、MFD の EGT が上がってピークに近づいたら少し戻す（絞りすぎは粗さと出力低下）", s => MixNow(s, s.Eng[0]) <= 0.97),
            } };
            d["ms_before_takeoff"] = new ChecklistDef { Title = "離陸前点検・双発（BEFORE TAKEOFF・教材の簡略版）", Items = new List<ChecklistItem>
            {
                new ChecklistItem("ドア・シートベルト", "閉・着用"),
                new ChecklistItem("操縦舵面", "自由・正しい向きに動く"),
                new ChecklistItem("重量と重心", (Func<State, string>)WbText, (Func<State, bool>)WbOk),
                new ChecklistItem("フラップ", "UP", s => s.FlapIdx == 0),
                new ChecklistItem("トリム", "離陸位置（Shift+T）", s => Math.Abs(s.Trim) < 0.05),
                new ChecklistItem("燃料・ミクスチャー・プロペラ", "タンクに・リッチ・前（プロペラは教材では自動）", s => AllEng(s, (ss, e) => SelNow(ss, e) != "OFF" && MixNow(ss, e) >= 0.95)),
                new ChecklistItem("スロットル", "アイドル", s => s.Thr < 0.1),
                new ChecklistItem("離陸ブリーフィング", s => $"Vr {s.A.VGet("rotate")}・Vyse {s.A.VGet("yse")}（青線）・Vmc {s.A.VGet("mc")}（赤線）。浮揚前の故障は止まる。浮揚後は Vyse・脚 UP・Identify → Verify → Feather"),
            } };
            d["ms_before_landing"] = new ChecklistDef { Title = "着陸前点検・双発（GUMPS）", Items = new List<ChecklistItem>
            {
                new ChecklistItem("G：Gas（燃料）", "両方 ON", s => AllEng(s, (ss, e) => SelNow(ss, e) != "OFF")),
                new ChecklistItem("U：Undercarriage（脚）", "DOWN・緑 3 つ（G キー）", s => s.GearDown && s.GearPos > 0.98),
                new ChecklistItem("M：Mixture", "RICH", s => AllEng(s, (ss, e) => MixNow(ss, e) >= 0.95)),
                new ChecklistItem("P：Props", "前（教材では自動）"),
                new ChecklistItem("S：Switches / Seatbelts", "着陸灯 ON・ベルト着用"),
            } };
            d["cx_before_takeoff"] = new ChecklistDef { Title = "離陸前点検・複雑機（BEFORE TAKEOFF・教材の簡略版）", Items = new List<ChecklistItem>
            {
                new ChecklistItem("ドア・シートベルト", "閉・着用"),
                new ChecklistItem("操縦舵面", "自由・正しい向きに動く（W / S / A / D / Q / E で確認）"),
                new ChecklistItem("計器（G1000 型）", "PFD・MFD 異常なし、高度計規正（BARO）"),
                new ChecklistItem("重量と重心", (Func<State, string>)WbText, (Func<State, bool>)WbOk),
                new ChecklistItem("燃料セレクター", "燃料の多い側", s => FullerSide(s)),
                new ChecklistItem("ミクスチャー", "RICH", s => AllEng(s, (ss, e) => MixNow(ss, e) >= 0.95)),
                new ChecklistItem("プロペラ", "FULL FORWARD（一番前：離陸は最大回転で）", s => s.Prop >= 0.98),
                new ChecklistItem("フラップ", "UP（通常離陸）", s => s.FlapIdx == 0),
                new ChecklistItem("トリム", "離陸位置（Shift+T でリセット）", s => Math.Abs(s.Trim) < 0.05),
                new ChecklistItem("脚", "DOWN・緑 3 つ", s => s.GearDown && s.GearPos > 0.98),
                new ChecklistItem("スロットル", "アイドル", s => s.Thr < 0.1),
                new ChecklistItem("離陸の計画", s => $"Vr {s.A.VGet("rotate")}・Vy {s.A.VGet("y")}・脚上げは正の上昇を確認してから。浮揚前の異常は止まる、浮揚後のエンジン故障は正面へ"),
            } };
            d["cx_before_landing"] = new ChecklistDef { Title = "着陸前点検・複雑機（GUMPS＋プロペラ）", Items = new List<ChecklistItem>
            {
                new ChecklistItem("G：Gas（燃料）", "燃料の多い側", s => FullerSide(s)),
                new ChecklistItem("U：Undercarriage（脚）", "DOWN・緑 3 つ（G キー）", s => s.GearDown && s.GearPos > 0.98),
                new ChecklistItem("M：Mixture", "RICH（降下前に戻す）", s => AllEng(s, (ss, e) => MixNow(ss, e) >= 0.95)),
                new ChecklistItem("P：Propeller", "FULL FORWARD（, / . キー：一番前。ゴーアラウンドに備える）", s => s.Prop >= 0.98),
                new ChecklistItem("S：Switches / Seatbelts", "着陸灯 ON・ベルト着用"),
                new ChecklistItem("進入速度", s => $"{s.A.VGet("appr")} kt"),
            } };
            d["before_takeoff_jet"] = new ChecklistDef { Title = "離陸前点検・ジェット（BEFORE TAKEOFF・教材の簡略版）", Items = new List<ChecklistItem>
            {
                new ChecklistItem("ドア・シートベルト", "閉・着用"),
                new ChecklistItem("操縦舵面", "自由・正しい向きに動く（W / S / A / D / Q / E で確認）"),
                new ChecklistItem("計器（エンジン表示）", "PFD・MFD 異常なし、N1・EGT・燃料流量が正常範囲、高度計規正（BARO）"),
                new ChecklistItem("重量と重心", (Func<State, string>)WbText, (Func<State, bool>)WbOk),
                new ChecklistItem("燃料ポンプ", "ON（タンクのポンプで供給。セレクターはポンプの読み替え）", s => AllEng(s, (ss, e) => (e.Sel ?? "L") != "OFF")),
                new ChecklistItem("フラップ", s => $"離陸フラップ {s.A.FlapLabels[(int)VOr(s.A, "toFlaps", 1)]}（V キーでセットしてから確認）", s => s.FlapIdx == (int)VOr(s.A, "toFlaps", 1)),
                new ChecklistItem("トリム（スタブトリム）", "離陸位置（Shift+T でリセット）", s => Math.Abs(s.Trim) < 0.05),
                new ChecklistItem("速度バグ", s => $"Vr {s.A.VGet("rotate")}・V2（Vr＋約 10）をセット"),
                new ChecklistItem("スポイラー", "格納（速度ブレーキは出ていない）", s => !(s.Spoiler > 0)),
                new ChecklistItem("スロットル", "アイドル", s => s.Thr < 0.1),
                new ChecklistItem("離陸の計画", s => $"Vr {s.A.VGet("rotate")}。V1 の前の異常は止まる。浮揚後のエンジン異常は V2 で飛び続ける（ドリフトダウンの考え方は j3）"),
            } };
            d["before_landing_jet"] = new ChecklistDef { Title = "着陸前点検・ジェット（BEFORE LANDING・教材の簡略版）", Items = new List<ChecklistItem>
            {
                new ChecklistItem("燃料ポンプ", "ON", s => AllEng(s, (ss, e) => (e.Sel ?? "L") != "OFF")),
                new ChecklistItem("脚", "DOWN・緑 3 つ（G キー）", s => s.GearDown && s.GearPos > 0.98),
                new ChecklistItem("フラップ", s => $"着陸フラップ {s.A.FlapLabels[(int)VOr(s.A, "apprFlaps", 3)]} へ段階的に（V キー）。現在 {s.A.FlapLabels[s.FlapIdx]}", s => s.FlapIdx >= 1),
                new ChecklistItem("スポイラー", "ARM（接地で自動的に展開）"),
                new ChecklistItem("オートブレーキ", "セット（着陸用：滑走路の長さと路面で選ぶ）"),
                new ChecklistItem("進入速度", s => $"Vref＋5 ＝ {s.A.VGet("appr")} kt（速度バグをセット）"),
                new ChecklistItem("着陸許可", "受領・復唱"),
            } };
            d["ms_engine_failure"] = new ChecklistDef { Title = "片発停止の記憶操作（教材の簡略版・機体の POH が優先）", Items = new List<ChecklistItem>
            {
                new ChecklistItem("ピッチ", s => $"機首を下げて Vyse {s.A.VGet("yse")} kt（青線）を保つ"),
                new ChecklistItem("出力", "ミクスチャー・プロペラ・スロットル 前（全開）"),
                new ChecklistItem("外形", "フラップ UP・脚 UP（G）", s => s.FlapIdx == 0 && !s.GearDown),
                new ChecklistItem("Identify（特定）", "踏んでいない足の側＝止まったエンジン（Dead foot, dead engine）"),
                new ChecklistItem("Verify（確認）", "止まったと思う側のスロットルを絞っても何も変わらないこと"),
                new ChecklistItem("Feather（フェザー）", "止まった側のプロペラをフェザー（[ ＝ 左・] ＝ 右）", s => s.Eng.Exists(e => e.Failed && e.Feather)),
            } };
            return d;
        }

        public static readonly Dictionary<string, Func<LessonState, AtcQ>> ATC_Q = BuildAtc();

        static AtcQ Q(string msg, int ok, string why, params string[] opts)
        { return new AtcQ { Msg = msg, Ok = ok, Why = why, Opts = new List<string>(opts) }; }

        static Dictionary<string, Func<LessonState, AtcQ>> BuildAtc()
        {
            var d = new Dictionary<string, Func<LessonState, AtcQ>>();
            d["takeoff"] = L => Q($"LAB Tower: \"{L.Call}, wind {L.WindStr}, runway 36, cleared for takeoff.\"", 0,
                "離陸許可は「滑走路番号＋cleared for takeoff＋コールサイン」を復唱します（AIM 4-4-7 など）。Roger だけでは不十分です。",
                $"Runway 36, cleared for takeoff, {L.CallShort}.", $"Roger, {L.CallShort}.", "Cleared for takeoff.");
            d["landing"] = L => Q($"LAB Tower: \"{L.Call}, runway 36, wind {L.WindStr}, cleared to land.\"", 1,
                "着陸許可も滑走路番号を含めて復唱します。滑走路番号の取り違えは重大な誤り（滑走路誤進入の原因）です。",
                "Wilco.", $"Runway 36, cleared to land, {L.CallShort}.", $"Landing runway 18, {L.CallShort}.");
            d["pattern"] = L => Q($"LAB Tower: \"{L.Call}, enter left downwind runway 36, report midfield.\"", 0,
                "場周経路の入り方（左・右、どの辺）と、報告の地点を復唱します。左右の取り違えは他機との接近の原因です。",
                $"Left downwind 36, report midfield, {L.CallShort}.", $"Right downwind 36, {L.CallShort}.", $"Roger, will report, {L.CallShort}.");
            d["climb"] = L => Q($"LAB Approach: \"{L.Call}, climb and maintain {Num0(L.Alt0 + 1000)}.\"", 0,
                "高度の指示は必ず数字で復唱します（AIM 4-4-7：高度・針路・速度の指示は復唱）。「Climbing」だけでは管制官が聞き違いに気づけません。",
                $"Climb and maintain {Num0(L.Alt0 + 1000)}, {L.CallShort}.", $"Climbing, {L.CallShort}.", $"Maintain {Num0(L.Alt0)}, {L.CallShort}.");
            d["ils"] = L => Q($"LAB Approach: \"{L.Call}, turn left heading 330, maintain 2,000 until established on the localizer, cleared ILS runway 36 approach.\"", 0,
                "進入許可は「針路・ローカライザーに乗るまでの高度・進入の種類と滑走路」をすべて復唱します。旋回方向（left / right）も大切です。",
                $"Left 330, maintain 2,000 until established, cleared ILS runway 36, {L.CallShort}.", $"Cleared ILS, {L.CallShort}.", $"Right 330, cleared ILS runway 36, {L.CallShort}.");
            d["rnav"] = L => Q($"LAB Approach: \"{L.Call}, turn left heading 330, maintain 2,000 until established on the final approach course, cleared RNAV runway 36 approach.\"", 0,
                "進入許可は「針路・ファイナルコースに乗るまでの高度・進入の種類（RNAV）と滑走路」をすべて復唱します。ILS との取り違え、旋回方向の取り違えは重大です。",
                $"Left 330, maintain 2,000 until established, cleared RNAV runway 36, {L.CallShort}.", $"Cleared RNAV, {L.CallShort}.", $"Right 330, cleared ILS runway 36, {L.CallShort}.");
            d["divert"] = L => Q($"LAB Approach: \"{L.Call}, roger, proceed direct LAB-F, maintain {Num0(L.Alt0)}.\"", 0,
                "目的地変更の指示は「どこへ（直行先）・高度」を復唱します。",
                $"Direct LAB-F, maintain {Num0(L.Alt0)}, {L.CallShort}.", $"Roger, {L.CallShort}.", $"Direct LAB-A, {L.CallShort}.");
            d["mayday"] = L => Q("（エンジンが止まりました。最初に送る無線として正しいものは？）", 0,
                "遭難（すぐに助けが必要）なら MAYDAY を 3 回、相手・コールサイン・状況・位置・高度・意図の順（AIM 6-3-1 の考え方）。ただし最優先は操縦（Aviate → Navigate → Communicate）。",
                $"Mayday, Mayday, Mayday, LAB Tower, {L.CallShort}, engine failure, {(L.PosStr ?? "5 miles north")}, {Num0(L.Alt0)} feet, landing LAB runway 36.",
                $"LAB Tower, {L.CallShort}, request landing.", $"Pan-pan, {L.CallShort}, low fuel.");
            d["lost"] = L => Q("（現在地がわからなくなりました。管制に助けを求める無線は？）", 0,
                "迷ったら早めに正直に伝える（Confess）。燃料や天候に余裕がなければ緊急の宣言もためらわない。AIM 6-2 の考え方（5C：Climb, Communicate, Confess, Comply, Conserve）。",
                $"LAB Approach, {L.CallShort}, unsure of position, {Num0(L.Alt0)} feet, request assistance.",
                $"LAB Approach, {L.CallShort}, request flight following.", $"Mayday, Mayday, Mayday, {L.CallShort}, lost.");
            d["oei"] = L => Q("（片発停止。管制へ伝える内容は？）", 0,
                "状況（片発停止・どちらのエンジン）と意図（戻って着陸）を短く伝えます。双発の片発停止は多くの場合「緊急（Mayday / Pan-pan）」として扱われ、優先して着陸させてもらえます。",
                $"LAB Tower, {L.CallShort}, engine failure, left engine feathered, returning for landing runway 36.",
                $"LAB Tower, {L.CallShort}, request touch and go.", $"{L.CallShort}, all normal.");
            return d;
        }
    }
}
