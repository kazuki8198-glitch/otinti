// CadetFreeMode — a verbatim C# port of cadet/src/content/free-mode.js
// (Stage 10). The free mode's single source: what the setup screen offers
// and what a session starts from, so the two can never drift apart. The
// sandbox contract: a free session never reads or writes career state.
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public static class CadetFreeMode
    {
        public static readonly (string Id, string Label)[] FREE_AIRCRAFT =
        {
            ("pa28", "Archer（単発）"), ("pa44", "Seminole（双発）"), ("pa28r", "Arrow（単発・引込脚）"), ("b737", "737 級ジェット（双発）"),
        };
        public static readonly (string Id, string Label)[] FREE_STARTS =
        {
            ("ramp", "駐機（コールド＆ダーク：エンジンは自分で始動）"), ("rwy", "滑走路（離陸準備完了・エンジン運転中）"),
            ("area", "空中（巡航：訓練空域 3,000 ft）"), ("pattern", "ダウンウインド 1,000 ft"),
            ("final", "最終進入 5 km"), ("ils", "ILS 開始点 2,000 ft"),
        };
        public static readonly (double Hour, string Label)[] FREE_HOURS =
        {
            (6, "朝 6 時"), (9, "午前 9 時"), (12, "正午"), (15, "午後 3 時"), (18, "夕方 6 時"), (21, "夜 9 時"), (0, "深夜 0 時"),
        };
        public static readonly (string Id, string Label)[] FREE_WIND_OPTS =
        {
            ("calm", "無風"), ("light", "軽い風（滑走路方向 5 kt）"), ("cross", "横風 10 kt"), ("strong", "強い風 16 kt・ガスト"), ("custom", "カスタム"),
        };
        public class WindDef { public double Rel, Kt, Gust; }
        public static readonly Dictionary<string, WindDef> FREE_WIND_MAP = new Dictionary<string, WindDef>
        {
            ["calm"] = new WindDef { Rel = 0, Kt = 0, Gust = 0 },
            ["light"] = new WindDef { Rel = 10, Kt = 5, Gust = 0.5 },
            ["cross"] = new WindDef { Rel = 80, Kt = 10, Gust = 0.5 },
            ["strong"] = new WindDef { Rel = 30, Kt = 16, Gust = 1 },
        };
        public static readonly (string Id, string Label)[] FREE_LOAD_OPTS =
        {
            ("std", "標準（前席 2 名）"), ("light", "軽い（前席 1 名）"), ("heavy", "重い（4 名＋荷物）"),
        };
        public class LoadDef { public string Fuel; public double Front, Rear, BagKg; }
        public static readonly Dictionary<string, LoadDef> FREE_LOAD_MAP = new Dictionary<string, LoadDef>
        {
            ["std"] = new LoadDef { Fuel = "std", Front = 2, Rear = 0, BagKg = 0 },
            ["light"] = new LoadDef { Fuel = "std", Front = 1, Rear = 0, BagKg = 0 },
            ["heavy"] = new LoadDef { Fuel = "std", Front = 2, Rear = 2, BagKg = 25 },
        };
        public static readonly (string Id, string Label)[] FREE_FAIL_OPTS =
        {
            ("none", "ランダム（シード付き：約2割の飛行で1つ）"), ("mag", "マグネトー不良（ランナップで分かる）"),
            ("carb", "キャブレター着氷（湿度の高い日）"), ("elec", "オルタネーター故障（電圧低下）"),
            ("pitot", "ピトー閉塞（着氷の経路）"), ("static", "静圧閉塞（高度計の凍結）"),
            ("gear", "脚の故障（双発）"), ("pump", "燃料ポンプ故障"), ("engine", "エンジン停止（飛行中）"),
            ("engL", "左エンジン停止（双発）"), ("engR", "右エンジン停止（双発）"),
            ("ahrs", "AHRS 故障（姿勢表示）"), ("gps", "GPS 故障"), ("ppanel", "部分パネル（AHRS＋GPS 故障）"),
        };

        static double NumOf(object v)
        {
            if (v == null) return 0;
            if (v is double d) return d;
            if (v is string s) return double.TryParse(s, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var x) ? x : 0;
            return System.Convert.ToDouble(v);
        }
        static string StrOf(object v, string dflt = null) { return v == null ? dflt : v.ToString(); }

        /// <summary>buildFreeCfg: the setup screen's raw selections → the session cfg.
        /// JS reads the seed from Date.now(); here the caller passes "now" (ms).</summary>
        public static Dict BuildFreeCfg(Dict f, double nowMs)
        {
            string wind = StrOf(f.TryGetValue("wind", out var wv) ? wv : null);
            WindDef windDef;
            if (wind == "custom")
                windDef = new WindDef { Rel = NumOf(f.TryGetValue("windRel", out var wr) ? wr : null), Kt = NumOf(f.TryGetValue("windKt", out var wk) ? wk : null), Gust = 0.5 };
            else if (wind != null && FREE_WIND_MAP.TryGetValue(wind, out var wd)) windDef = wd;
            else windDef = FREE_WIND_MAP["light"];
            string loading = StrOf(f.TryGetValue("loading", out var lv) ? lv : null);
            var loadDef = loading != null && FREE_LOAD_MAP.TryGetValue(loading, out var ld) ? ld : FREE_LOAD_MAP["std"];
            string fail = StrOf(f.TryGetValue("fail", out var fv) ? fv : null);
            string failWhen = StrOf(f.TryGetValue("failWhen", out var fw) ? fw : null);
            var failAt = new Dict();
            if (failWhen == "time") failAt["atMin"] = System.Math.Max(0, NumOf(f.TryGetValue("failMin", out var fm) ? fm : null));
            else if (failWhen == "alt") failAt["atAltFt"] = System.Math.Max(0, NumOf(f.TryGetValue("failAlt", out var fa) ? fa : null));
            return new Dict
            {
                { "start", StrOf(f.TryGetValue("start", out var sv) ? sv : null) },
                { "aircraft", StrOf(f.TryGetValue("aircraft", out var av) ? av : null) },
                { "hour", NumOf(f.TryGetValue("hour", out var hv) ? hv : null) },
                { "wind", new Dict { { "rel", windDef.Rel }, { "kt", windDef.Kt }, { "gust", windDef.Gust } } },
                { "loading", new Dict { { "fuel", loadDef.Fuel }, { "front", loadDef.Front }, { "rear", loadDef.Rear }, { "bagKg", loadDef.BagKg } } },
                { "fail", fail == "none" ? null : fail },
                { "failAt", failAt },
                { "seed", nowMs % 2147483647 },
            };
        }

        /// <summary>simDeviceCfg: the training device's free-practice session preset.</summary>
        public static Dict SimDeviceCfg(Dict sel = null)
        {
            sel = sel ?? new Dict();
            var light = FREE_WIND_MAP["light"]; var std = FREE_LOAD_MAP["std"];
            string OrDef(object v, string dflt) { var s = v == null ? null : v.ToString(); return string.IsNullOrEmpty(s) ? dflt : s; }
            return new Dict
            {
                { "start", OrDef(sel.TryGetValue("start", out var sv) ? sv : null, "rwy") },
                { "aircraft", OrDef(sel.TryGetValue("aircraft", out var av) ? av : null, "pa28") },
                { "wind", new Dict { { "rel", light.Rel }, { "kt", light.Kt }, { "gust", light.Gust } } },
                { "loading", new Dict { { "fuel", std.Fuel }, { "front", std.Front }, { "rear", std.Rear }, { "bagKg", std.BagKg } } },
                { "fail", null },
            };
        }
    }
}
