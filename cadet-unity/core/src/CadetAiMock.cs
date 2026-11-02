// CadetAiMock — the AI instructors' offline mock (Stage 11): the HTML
// build's AI-instructor feature answers free questions per instructor
// specialty through an API; here the wiring is completed with a local,
// deterministic mock provider (keyword-matched canned answers in each
// instructor's specialty and voice). Swapping in the real API later only
// replaces IAiInstructor's implementation — the key belongs to the user's
// Secure Vault and is never handled by this code.
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public interface IAiInstructor
    {
        Dict Ask(string instructorId, string question, Dict ctx = null);
    }

    public class CadetAiMock : IAiInstructor
    {
        class Topic { public string[] Keys; public string Answer; }
        class Prof { public string Name, Specialty, Fallback; public Topic[] Topics; }
        static readonly Dictionary<string, Prof> PROFS = new Dictionary<string, Prof>
        {
            { "makabe", new Prof { Name = "真壁 主任教官", Specialty = "操縦全般・訓練の進め方", Fallback = "いい質問だ。操縦の話なら答えられるが、その件は担当の教官にも確認しておけ。基本はチェックリストと手順書が正だ。", Topics = new[] {
                new Topic { Keys = new[] { "離陸", "テイクオフ" }, Answer = "離陸は Vr で静かに引き起こすのが基本だ。急な引き起こしは失速の元になる。まず速度を見て、姿勢は 10 度を目安に保て。" },
                new Topic { Keys = new[] { "失速", "ストール" }, Answer = "失速は迎え角の問題だ。速度ではない。回復は機首下げと出力。訓練では高度に余裕のあるところで反復する。" },
                new Topic { Keys = new[] { "着陸", "フレア", "ランディング" }, Answer = "着陸は接地ではなく「接地までの過程」が全てだ。アプローチが安定していれば、フレアは自然についてくる。速度管理を徹底しろ。" },
            } } },
            { "kuroda", new Prof { Name = "黒田 学科教官", Specialty = "航空法規・学科試験", Fallback = "学科の質問として受け取った。条文と数値は正確に覚えること。試験では定義そのものが問われる。", Topics = new[] {
                new Topic { Keys = new[] { "VFR", "有視界" }, Answer = "VFR の気象条件は飛行場と空域で異なる。管制圏内では視程 5 km・雲との距離が要点だ。数値は表で整理して覚えよ。" },
                new Topic { Keys = new[] { "優先順位", "緊急" }, Answer = "緊急時の優先は Aviate, Navigate, Communicate の順だ。法規以前に、まず飛ばすことが全ての前提になる。" },
            } } },
            { "miller", new Prof { Name = "ミラー教官", Specialty = "航空英語・無線交信", Fallback = "Good question. For radio work, keep it short and standard. Say it in plain phraseology first, then we polish it together.", Topics = new[] {
                new Topic { Keys = new[] { "リードバック", "復唱", "readback" }, Answer = "Read back the numbers, not the whole sentence. Example: \"Climb to flight level 350, Shoyo 212.\" Numbers are what the controller needs to verify." },
                new Topic { Keys = new[] { "英語", "フレーズ" }, Answer = "Use standard phrases before plain English. \"Request descent\" is enough — long sentences hide mistakes. Practice one phrase at a time." },
            } } },
            { "saeki", new Prof { Name = "佐伯（運航管理）", Specialty = "運航・ディスパッチ・気象判断", Fallback = "運航の観点で答えるわ。判断は「行けるか」ではなく「帰って来られるか」で考えるのが基本よ。", Topics = new[] {
                new Topic { Keys = new[] { "燃料", "フューエル" }, Answer = "燃料は目的地までの分だけじゃ足りないの。代替地分とホールディング分を積んで、初めて計画が閉じるわ。" },
                new Topic { Keys = new[] { "ダイバート", "代替" }, Answer = "ダイバートの判断は早いほど楽になるわ。代替地の天気が良いうちに決めること。迷っている間の燃料は戻らないの。" },
            } } },
            { "oshiro", new Prof { Name = "大城（整備）", Specialty = "機体・エンジン・整備", Fallback = "整備の立場で答えよう。機体のことは、音と振動と計器が先に教えてくれる。気づいたら必ず報告だ。", Topics = new[] {
                new Topic { Keys = new[] { "マグネトー", "点検" }, Answer = "ランナップのマグチェックは左右で回転数の落ち方が違うのが普通だ。片側だけ大きく落ちるなら、その系統を疑う。" },
                new Topic { Keys = new[] { "オイル", "油圧" }, Answer = "油圧と油温はエンジンの体調そのものだ。始動直後の油圧の立ち上がりと、巡航中の安定をセットで見てくれ。" },
            } } },
            { "takamine", new Prof { Name = "高嶺（気象）", Specialty = "航空気象", Fallback = "気象の話なら任せて。天気は「今」より「どう変わるか」を読む学問だ。", Topics = new[] {
                new Topic { Keys = new[] { "霧", "視程" }, Answer = "霧は放射冷却と移流ででき方が違う。朝の霧は日射で晴れるが、海風で入る霧は長居する。傾向を見て判断するんだ。" },
                new Topic { Keys = new[] { "乱気流", "揺れ" }, Answer = "乱気流は前線・山岳波・対流のどれが原因かで回避の仕方が変わる。高度変更は、滑らかな側のレポートがある方向へ。" },
            } } },
        };
        public static string[] InstructorIds { get { return new List<string>(PROFS.Keys).ToArray(); } }
        public static string SpecialtyOf(string id) { return PROFS.TryGetValue(id ?? "", out var p) ? p.Specialty : null; }

        public Dict Ask(string instructorId, string question, Dict ctx = null)
        {
            if (!PROFS.TryGetValue(instructorId ?? "", out var p))
                return new Dict { { "ok", false }, { "error", "unknown-instructor" }, { "instructor", instructorId } };
            string q = question ?? "";
            foreach (var t in p.Topics)
                foreach (var k in t.Keys)
                    if (q.Contains(k)) return new Dict { { "ok", true }, { "mock", true }, { "instructor", instructorId }, { "name", p.Name }, { "topic", k }, { "answer", t.Answer } };
            return new Dict { { "ok", true }, { "mock", true }, { "instructor", instructorId }, { "name", p.Name }, { "topic", null }, { "answer", p.Fallback } };
        }
    }
}
