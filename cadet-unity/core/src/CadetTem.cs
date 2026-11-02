// CADET — CadetTem.cs : port of cadet/src/career/tem.js (TEM: threat and error
// management). Pure logic, no UnityEngine. THREATS data also exists in
// data/tem.json (converted); the When predicates are logic and live here.
using System;
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public class TemOpts
    {
        public string Weather;      // WEATHER kind ('pmStorm', 'lowCloud', ...)
        public double Fatigue;
        public string Chapter;
        public string Aircraft;     // 'pa28' | 'pa44'
        public bool Check, Xc, Cb;
        public int Day;
        public double Traffic;      // the day's pattern traffic count (0 = empty)
    }

    public class Threat
    {
        public string Id, Ja, Why, Plan, Not;
        public Func<TemOpts, bool> When;
        public Threat(string id, string ja, Func<TemOpts, bool> when, string why, string plan, string not)
        { Id = id; Ja = ja; When = when; Why = why; Plan = plan; Not = not; }
    }

    public static class CadetTem
    {
        public static readonly List<Threat> THREATS = new List<Threat>
        {
            new Threat("storm", "午後の雷雨", o => o.Weather == "pmStorm", "TAF に午後の雷雨（TEMPO TSRA）が出ています",
                "午前のうちに飛んで、13 時までに戻る。積乱雲が育ち始めたら、課目の途中でも帰ります", "今日の TAF に雷雨はありません"),
            new Threat("cloud", "低い雲（計器気象状態）", o => o.Weather == "lowCloud", "雲の底が 800 ft。進入では、最低高度まで滑走路が見えないかもしれません",
                "決心高度で滑走路が見えなければ、迷わず進入復行。計器のスキャンを止めない", "今日は雲が高く、有視界で飛べます"),
            new Threat("wind", "強い横風", o => o.Weather == "crosswind", "横風が強く、突風もあります",
                "横風の限界を確かめる。着陸はエルロンを風上に、ラダーで機首を滑走路に。無理ならゴーアラウンド", "今日の風は、ほぼ滑走路の向きです"),
            new Threat("pmwind", "午後の強い横風", o => o.Weather == "pmWind", "TAF では 15 時から横風が強まります",
                "午前のうちに飛んで、早めに戻る。戻りの着陸で風が強まっていたら、横風の限界を思い出す", "午後も風は弱い予報です"),
            new Threat("ceiling", "朝の低い雲", o => o.Weather == "amLowCloud", "朝は雲の底が 600 ft です",
                "雲が上がるのを待つ。場周の高度（1,000 ft）より低い雲の下では飛ばない", "今朝は雲が高いです"),
            new Threat("fog", "朝の霧", o => o.Weather == "amFog", "朝は霧で視程が 1/2 SM です",
                "視程が上がるまで待つ。予報どおりに上がらなければ、その日は飛ばない", "今朝は霧が出ていません"),
            new Threat("bust", "予報外れの前線", o => o.Weather == "forecastBust", "TAF は終日 VFR ですが、西の空が暗く、前線が予報より早く近づいています",
                "午前のうちに飛んで、空が変わる前に戻る。飛んでいる間に空が変わり始めたら、課目の途中でも帰る", "今日は予報どおりの空です"),
            new Threat("tired", "自分の疲れ", o => o.Fatigue >= 45, "疲れが残っています。判断も手も、いつもより遅れます",
                "手順をいつもより声に出して確かめる。迷ったら早めに、安全なほうを選ぶ", "今日はよく休めています"),
            new Threat("check", "審査の緊張", o => o.Check, "今日は審査です。緊張すると、いつもの手順が抜けます",
                "毎日の手順のとおりに。チェックリストを飛ばさず、ひとつずつ声に出す", "今日は審査の日ではありません"),
            new Threat("nav", "一人での航法（迷うこと）", o => o.Xc, "今日は一人で、知らない場所まで飛びます",
                "最後に確かだった場所から考える。VOR と DME も使う。燃料と時間に余裕を持つ", "今日は場周と訓練空域の中だけです"),
            new Threat("twin", "慣れない双発機（片発）", o => o.Aircraft == "pa44", "Seminole は速くて重く、片方のエンジンが止まると強く片側へ引かれます",
                "片発になったら「パワー、ピッチ、足」。Vmc より速く、ブルーラインの速度を保つ", "今日は Archer です"),
            new Threat("sd", "空間識失調（体の感覚）", o => o.Chapter == "ch4", "フードの中では、体の感覚が計器と食い違います",
                "体の感覚ではなく計器を信じる。姿勢指示器に目を戻しながら、スキャンを続ける", "今日は外を見て飛ぶ課目です"),
            new Threat("traffic", "場周の混雑（ほかの訓練機）", o => ((int)o.Traffic) > 0, "ほかの訓練機が場周を飛んでいます。同じ高度、同じ経路です",
                "交信をよく聞いて、ほかの機体の位置を頭に描く。見張りを続ける", "今日はほかの訓練機は飛んでいません"),
            new Threat("calm", "静かな日の油断", o => true, "天気も体調も問題なく、目立つ脅威がありません。そういう日ほど、注意は静かに落ちていきます",
                "チェックリストはいつもどおり声に出す。見張りは「何も見えない」ことも言葉にして、確認したことにする", "今日は目立つ脅威があります。それが今日の脅威です"),
        };

        // THREATS_EN: id -> {ja, why, plan, not}
        public static readonly Dictionary<string, string[]> THREATS_EN = new Dictionary<string, string[]>
        {
            { "storm", new[] { "afternoon thunderstorms", "The TAF has thunderstorms this afternoon (TEMPO TSRA)", "fly in the morning and be back by 13:00; if the cumulonimbus starts to build, we come back, even mid-lesson", "There are no thunderstorms in today's TAF" } },
            { "cloud", new[] { "low cloud (IMC)", "The cloud base is 800 ft; on the approach you may not see the runway until the minimums", "no runway at decision altitude, go around without hesitating; never stop the instrument scan", "Today the cloud is high; we can fly VFR" } },
            { "wind", new[] { "a strong crosswind", "The crosswind is strong, and gusting", "know the crosswind limit; land with aileron into the wind and rudder to keep the nose on the runway; go around if it's too much", "Today's wind is almost straight down the runway" } },
            { "pmwind", new[] { "a strong afternoon crosswind", "The TAF has the crosswind picking up from 15:00", "fly in the morning and come back early; if it has picked up for the landing, remember the crosswind limit", "The afternoon wind is forecast light" } },
            { "ceiling", new[] { "low morning cloud", "This morning the cloud base is 600 ft", "wait for the cloud to lift; no flying under cloud lower than the pattern altitude (1,000 ft)", "This morning the cloud is high" } },
            { "fog", new[] { "morning fog", "This morning the fog has the visibility at 1/2 SM", "wait for the visibility to improve; if it doesn't lift as forecast, no flying today", "There's no fog this morning" } },
            { "bust", new[] { "a front ahead of its forecast", "The TAF says VFR all day, but the western sky is darkening — a front may arrive ahead of its forecast", "fly in the morning and be back before the sky changes; if it starts to change while we fly, we come back, even mid-lesson", "Today the sky is doing what the forecast said" } },
            { "tired", new[] { "your own fatigue", "You're still tired; your judgement and your hands will lag", "say the steps out loud more than usual; when in doubt, choose the safe way early", "You're well rested today" } },
            { "check", new[] { "check-ride nerves", "Today is a check; nerves make you skip the usual steps", "do it the everyday way; never skip the checklist, say each item out loud", "Today isn't a check day" } },
            { "nav", new[] { "navigating alone (getting lost)", "Today you fly alone to places you don't know", "start from the last place you were sure of; use the VOR and DME; keep a margin of fuel and time", "Today we stay in the pattern and the practice area" } },
            { "twin", new[] { "an unfamiliar twin (one engine out)", "The Seminole is fast and heavy, and pulls hard to one side when an engine stops", "one engine out: power, pitch, feet; stay faster than Vmc, hold blue-line speed", "Today it's the Archer" } },
            { "sd", new[] { "spatial disorientation", "Under the hood your body's sense disagrees with the instruments", "trust the instruments, not your body; keep scanning, back to the attitude indicator", "Today's lesson is flown looking outside" } },
            { "traffic", new[] { "a busy pattern (other trainers)", "Other trainers are flying the pattern today, at the same altitude on the same circuit", "listen to the radio and keep a picture of where the others are; keep looking out", "No other trainers are flying today" } },
            { "calm", new[] { "complacency on a quiet day", "The weather is fine, you are rested, and nothing stands out — those are the days attention quietly fades", "use the checklist out loud as always; call the scan: \"nothing seen\" is a check made, not skipped", "Today something does stand out; that is today's threat" } },
        };

        public static Threat ThreatOf(string id)
        {
            foreach (var t in THREATS) if (t.Id == id) return t;
            return null;
        }

        public static Dict TemFor(TemOpts o)
        {
            Threat today = null;
            foreach (var t in THREATS) if (t.When(o)) { today = t; break; }
            string why = today.Why, plan = today.Plan;
            string cbWhy = null, cbPlan = null;
            if (o.Cb && today.Id == "storm")
            {
                why = "TAF に午後の雷雨（TEMPO TSRA）。西の空には、もう積乱雲がひとつ育っています";
                plan = "午前のうちに飛んで、13 時までに戻る。西の積乱雲には近づかない（大きく離れる）。育ち始めたら、課目の途中でも帰ります";
                cbWhy = "The TAF has thunderstorms this afternoon (TEMPO TSRA) — and one cumulonimbus is already standing in the west";
                cbPlan = "fly in the morning and be back by 13:00; give the cell in the west a wide berth, and come back even mid-lesson if it builds";
            }
            var others = new List<Threat>();
            foreach (var t in THREATS) if (t.Id != today.Id && t.Id != "traffic" && !t.When(o)) others.Add(t);
            int k = Math.Abs(o.Day * 7 + 3) % Math.Max(1, others.Count);
            var two = new List<Threat>();
            foreach (var cand in new[] { others.Count > 0 ? others[k] : null, others.Count > 0 ? others[(k + 3) % others.Count] : null })
                if (cand != null && !two.Contains(cand)) two.Add(cand);
            while (two.Count < 2)
            {
                Threat nxt = null;
                foreach (var t in others) if (!two.Contains(t)) { nxt = t; break; }
                if (nxt == null) break;
                two.Add(nxt);
            }
            int right = Math.Abs(o.Day * 5 + 1) % 3;
            var opts = new List<Threat>(two);
            opts.Insert(Math.Min(right, opts.Count), today);
            var options = new Lst(); var othersTxt = new Lst(); var othersEn = new Lst();
            foreach (var t in opts)
            {
                options.Add(t.Ja);
                othersTxt.Add(t == today ? "" : t.Not);
                othersEn.Add(t == today ? "" : THREATS_EN[t.Id][3]);
            }
            var en = THREATS_EN[today.Id];
            var threat = new Dict { { "id", today.Id }, { "ja", today.Ja }, { "why", why }, { "plan", plan },
                { "en", new Dict { { "threat", en[0] }, { "why", cbWhy ?? en[1] }, { "plan", cbPlan ?? en[2] } } } };
            return new Dict { { "threat", threat }, { "options", options }, { "right", (double)right }, { "others", othersTxt }, { "othersEn", othersEn } };
        }

        static List<Dict> LessonsOf(Dict sum)
        {
            var outL = new List<Dict>();
            var xs = Js.Arr(Js.Get(sum, "lessons"));
            if (xs != null) foreach (var x in xs) { var d = Js.Obj(x); if (d != null) outL.Add(d); }
            return outL;
        }

        public static Lst ErrorsOf(Dict sum)
        {
            var outL = new Lst();
            if (CareerLogic.Truthy(Js.Get(sum, "incursion"))) outL.Add("許可の前に停止線を越えたこと");
            var radio = Js.Obj(Js.Get(sum, "radio"));
            if (radio != null && CareerLogic.Truthy(Js.Get(radio, "wrong"))) outL.Add($"無線の復唱の言い直し（{(long)Js.Num(radio, "wrong")} 回）");
            if (Js.Num(sum, "autoItems") > 6) outL.Add("チェックリストを教官に任せたこと");
            var walk = Js.Obj(Js.Get(sum, "walk"));
            var missed = walk == null ? null : Js.Arr(Js.Get(walk, "missed"));
            if (walk != null && missed != null && missed.Count > 0) outL.Add("外部点検の見落とし");
            foreach (var l in LessonsOf(sum))
            {
                if (!CareerLogic.Truthy(Js.Get(l, "done"))) continue;
                Dict badRow = null;
                var rows = Js.Arr(Js.Get(l, "rows"));
                if (rows != null) foreach (var rx in rows) { var r = Js.Obj(rx); if (r != null && !CareerLogic.Truthy(Js.Get(r, "pass"))) { badRow = r; break; } }
                if (badRow != null) { outL.Add($"{Js.Str(l, "title")}の{Js.Str(badRow, "name")}"); break; }
            }
            return outL;
        }

        public static Lst ErrorsOfEn(Dict sum)
        {
            var outL = new Lst();
            if (CareerLogic.Truthy(Js.Get(sum, "incursion"))) outL.Add("crossing the hold line before the clearance");
            var radio = Js.Obj(Js.Get(sum, "radio"));
            if (radio != null && CareerLogic.Truthy(Js.Get(radio, "wrong"))) outL.Add($"read-backs said again ({(long)Js.Num(radio, "wrong")})");
            if (Js.Num(sum, "autoItems") > 6) outL.Add("leaving the checklist to the instructor");
            var walk = Js.Obj(Js.Get(sum, "walk"));
            var missed = walk == null ? null : Js.Arr(Js.Get(walk, "missed"));
            if (walk != null && missed != null && missed.Count > 0) outL.Add("items missed on the walk-around");
            foreach (var l in LessonsOf(sum))
            {
                if (!CareerLogic.Truthy(Js.Get(l, "done"))) continue;
                Dict badRow = null;
                var rows = Js.Arr(Js.Get(l, "rows"));
                if (rows != null) foreach (var rx in rows) { var r = Js.Obj(rx); if (r != null && !CareerLogic.Truthy(Js.Get(r, "pass"))) { badRow = r; break; } }
                if (badRow != null) { outL.Add($"“{Js.Str(badRow, "name")}” in “{Js.Str(l, "title")}”"); break; }
            }
            return outL;
        }
    }
}
