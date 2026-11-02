// CADET Unity port — CadetCareer.cs: a faithful C# port of cadet/src/career/career.js
// (the calendar, the weather, the chapters, the gates, the growth system, the exams,
// the first-officer record, and the save's cleaning). Pure logic: no UnityEngine.
// The state is kept as a MiniJson object graph (Dictionary<string,object> with
// insertion-ordered keys), exactly the shape the JS keeps, so saves round-trip and
// the equivalence driver can digest both sides identically.
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace Cadet
{
    using Dict = Dictionary<string, object>;
    using Lst = List<object>;

    public static class Js
    {
        public static double Clamp(double x, double a, double b) { return Math.Min(b, Math.Max(a, x)); }
        // JS Math.round: half goes towards +Infinity
        public static double Round(double x) { return Math.Floor(x + 0.5); }
        public static string Pad2(double n) { return Pad2((long)n); }
        public static string Pad2(long n) { var s = n.ToString(System.Globalization.CultureInfo.InvariantCulture); return s.Length >= 2 ? s : s.PadLeft(2, '0'); }
        public static bool IsObj(object o) { return o is Dict; }
        public static uint ToUint32(double d)
        {
            if (double.IsNaN(d) || double.IsInfinity(d)) return 0;
            double m = Math.Floor(Math.Abs(d)) % 4294967296.0;
            long v = (long)(d < 0 ? -m : m);
            return unchecked((uint)v);
        }
        // +v || 0 in JS (non-numbers and NaN become 0)
        public static double NumOr0(object v) { return v is double ? (double.IsNaN((double)v) ? 0 : (double)v) : 0; }
        public static Dict Obj(object o) { return o as Dict; }
        public static Lst Arr(object o) { return o as Lst; }
        public static object Get(Dict d, string k) { object v; return d != null && d.TryGetValue(k, out v) ? v : null; }
        public static double Num(Dict d, string k, double def = 0) { var v = Get(d, k); return v is double ? (double)v : def; }
        public static string Str(Dict d, string k, string def = null) { var v = Get(d, k); return v is string ? (string)v : def; }
        public static bool Bool(Dict d, string k, bool def = false) { var v = Get(d, k); return v is bool ? (bool)v : def; }
        // the seeded rng of career.js (mulberry-style, imul-exact)
        public static Func<double> Rng(uint seed)
        {
            uint s = seed;
            return () =>
            {
                unchecked
                {
                    s += 0x6D2B79F5;
                    uint t = s;
                    t = (t ^ (t >> 15)) * (t | 1);
                    t ^= t + ((t ^ (t >> 7)) * (t | 61));
                    return ((t ^ (t >> 14))) / 4294967296.0;
                }
            };
        }
    }

    // FLIGHT LAB's progress record (school.saveProgress's shape), as the career reads it
    public class Prog
    {
        public class Rec
        {
            public bool Pass; public string Best = ""; public int Tries;
            public List<string> Levels = new List<string>();
            public double Score; public bool HasScore;
        }
        public Dictionary<string, Rec> Lessons = new Dictionary<string, Rec>();
        public Rec Get(string id) { Rec r; return Lessons.TryGetValue(id, out r) ? r : null; }
    }

    public static class CareerData
    {
        public const string CAREER_KEY = "cadet.career";
        public const int CAREER_VERSION = 2;
        public static readonly string[] ABILITIES = { "hand", "know", "comm", "judge" };
        public static readonly Dictionary<string, string> ABILITY_NAMES = new Dictionary<string, string> { { "hand", "操縦" }, { "know", "知識" }, { "comm", "交信" }, { "judge", "判断" } };
        public static readonly Dictionary<string, double> ABILITY_START = new Dictionary<string, double> { { "hand", 10 }, { "know", 5 }, { "comm", 5 }, { "judge", 10 } };
        public const double SOLO_JUDGE = 30;
        public const double SOLO_TRUST = 60;
        public const string START_DATE = "2027-04-01";
        public static readonly string[] SLOTS = { "morning", "am", "pm", "evening" };
        public static readonly Dictionary<string, string> SLOT_NAMES = new Dictionary<string, string> { { "morning", "朝" }, { "am", "午前" }, { "pm", "午後" }, { "evening", "夜" } };
        public static readonly Dictionary<string, double> SLOT_HOURS = new Dictionary<string, double> { { "morning", 7.7 }, { "am", 9.6 }, { "pm", 14.0 }, { "evening", 18.6 } };
        public static readonly string[] WD = { "日", "月", "火", "水", "木", "金", "土" };
        public const int NAV_ALT_FT = 3000;

        public class ChapterDef { public int N; public string Title, Short, Sub; }
        public static readonly Dictionary<string, ChapterDef> CHAPTERS = new Dictionary<string, ChapterDef>
        {
            { "prologue", new ChapterDef { N = 0, Title = "序章　入社", Short = "序章" } },
            { "ch1", new ChapterDef { N = 1, Title = "第 1 章　座学", Short = "第 1 章" } },
            { "ch2", new ChapterDef { N = 2, Title = "第 2 章　ソロまで", Short = "第 2 章" } },
            { "ch3", new ChapterDef { N = 3, Title = "第 3 章　航法", Short = "第 3 章", Sub = "横風・短い滑走路・VOR・推測航法、そして単独の野外飛行" } },
            { "ch4", new ChapterDef { N = 4, Title = "第 4 章　計器", Short = "第 4 章", Sub = "フードをかぶって、計器だけで飛ぶ。最後は雲の中の ILS 進入" } },
            { "ch5", new ChapterDef { N = 5, Title = "第 5 章　双発", Short = "第 5 章", Sub = "Piper Seminole。エンジンが 2 つ、止まるのも片方" } },
            { "ch6", new ChapterDef { N = 6, Title = "第 6 章　最終審査", Short = "第 6 章", Sub = "TEM、そして審査官の同乗する Check Flight" } },
            { "ch7", new ChapterDef { N = 7, Title = "第 7 章　複雑機エンドースメント（卒業後）", Short = "複雑機", Sub = "引込脚と定速プロペラの Arrow、そして教える側（CFI）" } },
            { "fo1", new ChapterDef { N = 8, Title = "型式移行", Short = "型式移行", Sub = "翔洋航空に入社し、737 級の型式限定を取る" } },
            { "fo2", new ChapterDef { N = 9, Title = "路線運航", Short = "路線運航", Sub = "羽田を拠点に、機長の隣の右席で路線を飛ぶ" } },
        };
        public static readonly string[] LATER = { "ch3", "ch4", "ch5", "ch6" };
        public class StageDef { public string[] Lessons; public string Exam, Check, Aircraft; public string[] Ftd; }
        public static readonly Dictionary<string, StageDef> STAGE = new Dictionary<string, StageDef>
        {
            { "ch3", new StageDef { Lessons = new[] { "x3", "x1", "x2", "n1", "n2", "n3" }, Exam = "nav", Check = "xc", Aircraft = "pa28" } },
            { "ch4", new StageDef { Lessons = new[] { "i1", "i2", "i3", "i8", "i4", "i5", "i6", "i7" }, Exam = "instr", Check = "ir", Aircraft = "pa28" } },
            { "ch5", new StageDef { Lessons = new[] { "m1", "m2", "m3", "m4", "e6", "m5" }, Exam = "multi", Check = "me", Aircraft = "pa44" } },
            { "ch6", new StageDef { Lessons = new[] { "r1" }, Exam = "final", Check = "final", Aircraft = "pa28" } },
            { "ch7", new StageDef { Lessons = new[] { "cx1", "cx2", "cx3", "cf1", "cf2", "cf3" }, Exam = "complex", Check = "cx", Aircraft = "pa28r" } },
            { "fo1", new StageDef { Lessons = new[] { "j1", "j2", "j3", "j4" }, Ftd = new string[0], Exam = "type", Check = "typerate", Aircraft = "b737" } },
        };
        public class CheckDef { public string Kind, Title, Short, Who, Ch; public string[] Lessons; public string Id, Name; }
        public static readonly Dictionary<string, CheckDef> CHECKS = new Dictionary<string, CheckDef>
        {
            { "xc", new CheckDef { Kind = "xc", Title = "単独の野外飛行", Short = "ソロ クロスカントリー", Lessons = new[] { "t1", "n2", "t3" }, Who = null, Ch = "ch3" } },
            { "ir", new CheckDef { Kind = "checkride", Title = "計器飛行の審査", Short = "計器の審査", Lessons = new[] { "t1", "i3", "i5", "t3" }, Who = "chief", Ch = "ch4" } },
            { "me", new CheckDef { Kind = "checkride", Title = "双発の審査", Short = "双発の審査", Lessons = new[] { "m4", "m2", "m5" }, Who = "chief", Ch = "ch5" } },
            { "final", new CheckDef { Kind = "checkride", Title = "最終審査（Check Flight）", Short = "最終審査", Lessons = new[] { "m1", "m2", "m5" }, Who = "examiner", Ch = "ch6" } },
            { "cx", new CheckDef { Kind = "checkride", Title = "複雑機エンドースメント審査", Short = "複雑機の審査", Lessons = new[] { "cx1", "cx3", "cx2" }, Who = "chief", Ch = "ch7" } },
            { "typerate", new CheckDef { Id = "typerate", Name = "型式限定チェック", Kind = "checkride", Title = "型式限定チェック", Short = "型式チェック", Lessons = new[] { "j5" }, Who = "examiner", Ch = "fo1" } },
        };
        public class RouteDef { public string Id, From, To, NameJa; public double BlockMin, DistKm, CruiseFt; }
        public static readonly RouteDef[] FO_ROUTES =
        {
            new RouteDef { Id = "HND-KMQ", From = "HND", To = "KMQ", NameJa = "羽田―小松", BlockMin = 65, DistKm = 290, CruiseFt = 24000 },
            new RouteDef { Id = "HND-CTS", From = "HND", To = "CTS", NameJa = "羽田―新千歳", BlockMin = 95, DistKm = 820, CruiseFt = 37000 },
            new RouteDef { Id = "HND-FUK", From = "HND", To = "FUK", NameJa = "羽田―福岡", BlockMin = 115, DistKm = 880, CruiseFt = 38000 },
            new RouteDef { Id = "HND-OKA", From = "HND", To = "OKA", NameJa = "羽田―那覇", BlockMin = 155, DistKm = 1550, CruiseFt = 39000 },
        };
        public class CaptainDef { public string Id, NameJa; }
        public static readonly CaptainDef[] FO_CAPTAINS =
        {
            new CaptainDef { Id = "kashiwagi", NameJa = "柏木 機長" },
            new CaptainDef { Id = "sakurai", NameJa = "桜井 機長" },
            new CaptainDef { Id = "ono", NameJa = "小野 機長" },
        };
        public static readonly string[] GROUND = { "k1", "k2", "k3", "k4", "k5", "k6" };
        public static readonly string[] CH2 = { "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "t2", "t4", "e1", "e2", "e3", "e4", "t1", "t3" };
        public static readonly string[][] CLASSES = { new[] { "aero" }, new[] { "sys", "perf" }, new[] { "radio1", "radio2" }, new[] { "radio3", "radio4" }, new[] { "wx", "radio5" }, new[] { "law", "hf" } };
        static readonly string[][] CLASSES_BEFORE = { new[] { "aero" }, new[] { "sys", "perf" }, new[] { "wx" }, new[] { "law", "hf" }, new[] { "radio1", "radio2" }, new[] { "radio3", "radio4", "radio5" } };
        public static readonly string[] CLASS_FTD = { "k1", "k2", "k3", "k4", "k5", "k6" };
        public static readonly Dictionary<string, string> FTD_TITLES = new Dictionary<string, string>
        {
            { "k1", "G1000 型 PFD の読み方" }, { "k2", "PFD の読み取り（10 問）" }, { "k3", "数字とアルファベットの言い方（10 問）" },
            { "k4", "交信のチェアフライト" }, { "k5", "復唱と応答（10 問）" }, { "k6", "聞き取り（10 問）" },
        };
        public static readonly Dictionary<string, string> CHAPTER_SHORT = new Dictionary<string, string>
        {
            { "aero", "飛行の原理" }, { "sys", "機体と装備" }, { "perf", "性能と重量・重心" }, { "radio1", "交信のしくみ" }, { "radio2", "言葉の決まり" },
            { "radio3", "交信の型" }, { "radio4", "1 回の飛行の交信" }, { "wx", "航空気象" }, { "radio5", "管制塔のない空港と緊急" }, { "law", "規則と空域" }, { "hf", "人間の能力と判断" },
        };
        static readonly Dictionary<string, int> CHAPTER_N = new Dictionary<string, int>
        {
            { "aero", 1 }, { "sys", 2 }, { "perf", 3 }, { "wx", 4 }, { "law", 5 }, { "radio1", 6 }, { "radio2", 7 }, { "radio3", 8 }, { "radio4", 9 }, { "radio5", 10 }, { "hf", 11 },
        };
        public static string ClassShort(int i)
        {
            if (i < 0 || i >= CLASSES.Length) return "";
            var parts = new List<string>();
            foreach (var id in CLASSES[i]) parts.Add($"第 {CHAPTER_N[id]} 章 {CHAPTER_SHORT[id]}");
            return string.Join("・", parts);
        }
        public class Ch1Event { public string Id, Who, Where, Title; public int Cls; public bool Optional; }
        public static readonly Ch1Event[] CH1_EVENTS =
        {
            new Ch1Event { Id = "forces", Cls = 0, Who = "mechanic", Where = "outside", Title = "駐機場の大城さんと、実機で 4 つの力を見る" },
            new Ch1Event { Id = "pitot", Cls = 1, Who = "mechanic", Where = "outside", Title = "駐機場の大城さんと、Archer のピトー管と燃料のサンプを見る" },
            new Ch1Event { Id = "spell", Cls = 2, Who = "dispatcher", Where = "dispatch", Title = "運航管理の佐伯さんと、登録記号と周波数を声に出す" },
            new Ch1Event { Id = "readback", Cls = 3, Who = "kiryu", Where = "lounge", Title = "ラウンジで、桐生の管制官役に復唱する" },
            new Ch1Event { Id = "metar", Cls = 4, Who = "dispatcher", Where = "dispatch", Title = "運航管理の佐伯さんと、今朝の METAR を読んで、今日の判断を聞く" },
            new Ch1Event { Id = "imsafe", Cls = 5, Who = "chief", Where = "instructors", Title = "教官室の真壁 主任教官と、IMSAFE を確かめる" },
            new Ch1Event { Id = "week", Cls = -1, Who = "asahi", Where = "lounge", Title = "ラウンジの朝日と、今週の復習（しなくてもよい）", Optional = true },
        };
        public class ExamDef { public string Title, Short, Ok, Room; public string[] Banks; public int N, Pass; }
        public static readonly Dictionary<string, ExamDef> EXAMS = new Dictionary<string, ExamDef>
        {
            { "written1", new ExamDef { Title = "学科試験（第 1 章）", Banks = new[] { "q_aero", "q_sys", "q_perf", "q_wx", "q_law", "q_comm", "q_hf" }, N = 30, Pass = 80, Room = "planning" } },
            { "presolo", new ExamDef { Title = "ソロ前の筆記試験", Banks = new[] { "q_ops", "q_emg", "q_law" }, N = 30, Pass = 80, Room = "planning" } },
            { "nav", new ExamDef { Title = "航法の筆記試験", Banks = new[] { "q_nav", "q_wx" }, N = 30, Pass = 80, Room = "planning", Ok = "合格です。航法ログを作って、ひとりで遠くまで飛ぶ準備ができました。" } },
            { "instr", new ExamDef { Title = "計器飛行の筆記試験", Banks = new[] { "q_ifr", "q_hf" }, N = 30, Pass = 80, Room = "planning", Ok = "合格です。計器の審査に進めます。" } },
            { "multi", new ExamDef { Title = "双発の筆記試験", Banks = new[] { "q_me", "q_emg" }, N = 30, Pass = 80, Room = "planning", Ok = "合格です。双発の審査に進めます。" } },
            { "final", new ExamDef { Title = "最終の筆記試験", Banks = new[] { "q_crm", "q_law", "q_ops", "q_radio" }, N = 30, Pass = 80, Room = "planning", Ok = "合格です。残るは、最終審査の Check Flight だけです。" } },
            { "complex", new ExamDef { Title = "複雑機エンドースメントの筆記試験", Banks = new[] { "q_ops", "q_me", "q_sys" }, N = 30, Pass = 80, Room = "planning", Ok = "合格です。複雑機の審査に進めます。" } },
            { "type", new ExamDef { Title = "型式限定学科（737 級）", Short = "型式学科", Banks = new[] { "q_jet", "q_jperf", "q_jsys" }, N = 30, Pass = 80, Room = "planning", Ok = "合格です。型式の課目（j1 から）に進めます。" } },
        };
        public static readonly string[] MISS_LABELS =
        {
            "停止線の手前で止まること", "ランナップで制限を超えたときの判断", "タキシーの速さと周りを見ること", "外部点検の外し忘れ", "無線の復唱",
            "高度を基準に保つこと", "速度を基準に保つこと", "着陸のフレア", "場周経路の形", "外部点検で見落とした異常",
        };
        public static readonly Regex MISS_KEY = new Regex("^[a-z][a-z0-9:_-]{0,31}$");
        public static readonly Regex SEC_ID = new Regex("^[a-z0-9]{1,12}\\.[a-z0-9]{1,16}$");
        public static readonly Regex Q_ID = new Regex("^[a-z0-9_]{1,12}[#:][a-z0-9_.]{1,24}$");
        public static readonly Regex ATTEMPT_ID = new Regex("^[a-z0-9]{1,12}:[a-z0-9_]{1,16}$");
        public static readonly string[] PACE_IDS = { "need", "full", "quick" };
        static readonly string[] COUNTS = { "basic", "precision" };
        public static string[] CountsLevels { get { return COUNTS; } }
        internal static string[][] ClassesBefore { get { return CLASSES_BEFORE; } }

        public class WeatherDef { public string Ja, Decision, Why; public bool FlyAm, FlyPm; public WeatherDef Ifr; public string Debrief; }
        public static readonly Dictionary<string, WeatherDef> WEATHER = new Dictionary<string, WeatherDef>
        {
            { "good", new WeatherDef { Ja = "晴れ", FlyAm = true, FlyPm = true, Decision = "go", Why = "視程・雲・風とも基準内です。" } },
            { "amFog", new WeatherDef { Ja = "朝霧（昼前に晴れる）", FlyAm = false, FlyPm = true, Decision = "wait", Why = "朝は霧で視程 1/2 SM。予報（TAF）では 11 時ごろから視程が回復します。午後に回すのが正解です。" } },
            { "pmStorm", new WeatherDef { Ja = "午後に雷雨", FlyAm = true, FlyPm = false, Decision = "early", Why = "TAF に午後の雷雨（TEMPO TSRA）。午前のうちに飛んで、13 時までに戻ります。" } },
            { "crosswind", new WeatherDef { Ja = "強い横風", FlyAm = false, FlyPm = false, Decision = "cancel", Why = "横風が 16 kt、突風 24 kt。ソロ前の訓練生の基準（横風 10 kt 以下）を超えています。今日は飛びません。" } },
            { "storm", new WeatherDef { Ja = "雷雨", FlyAm = false, FlyPm = false, Decision = "cancel", Why = "一日中、雷雨の予報です。飛びません。" } },
            { "amLowCloud", new WeatherDef { Ja = "朝の低い雲（昼前に上がる）", FlyAm = false, FlyPm = true, Decision = "wait", Why = "朝は雲の底が 600 ft。予報（TAF）では 11 時ごろに 3,500 ft まで上がります。午後に回すのが正解です。" } },
            { "pmWind", new WeatherDef { Ja = "午後に強い横風", FlyAm = true, FlyPm = false, Decision = "early", Why = "TAF では 15 時から横風が 18 kt、突風 26 kt に強まります。午前のうちに飛んで、早めに戻ります。" } },
            { "lowCloud", new WeatherDef { Ja = "低い雲（計器気象状態）", FlyAm = false, FlyPm = false, Decision = "cancel", Why = "雲の底が 800 ft、視程 3 SM。有視界では飛べない天気です。",
                Ifr = new WeatherDef { FlyAm = true, FlyPm = true, Decision = "go", Why = "雲の底は 800 ft ですが、計器飛行方式の飛行計画で、教官と一緒なら飛べます。雲の中の ILS は、今日しか練習できない本物です。" } } },
            { "southFlow", new WeatherDef { Ja = "南風（滑走路 18 を使用）", FlyAm = true, FlyPm = true, Decision = "go", Why = "南風 190°・8 kt です。滑走路 36 のままだと追い風 8 kt で、訓練生の制限（追い風は不可）を超えます。今日の使用滑走路は 18。18 なら向かい風 8 kt で、基準内です。場周は 18 の左場周になります。" } },
            { "forecastBust", new WeatherDef { Ja = "予報外れ（午後に前線が来る）", FlyAm = true, FlyPm = false, Decision = "early", Why = "TAF は終日、有視界の予報です。ただ、西の空が暗くなってきています。前線が予報より早く近づいているかもしれません。午前のうちに飛んで、空が変わる前に戻りましょう。",
                Debrief = "予報外れでした。TAF は終日 VFR と言っていましたが、前線が半日早く来ました。天気は予報どおりにはならないことがある。その前提で、午前の早めの判断が正解でした。" } },
        };
    }

    public static class CareerLogic
    {
        // ---- the calendar
        public static (string iso, int y, int m, int d, int wd) DateOf(int day)
        {
            var t = new DateTime(2027, 4, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(day - 1);
            return ($"{t.Year}-{Js.Pad2(t.Month)}-{Js.Pad2(t.Day)}", t.Year, t.Month, t.Day, (int)t.DayOfWeek);
        }
        public static string DateText(int day) { var t = DateOf(day); return $"{t.y} 年 {t.m} 月 {t.d} 日（{CareerData.WD[t.wd]}）"; }
        public static int DayOfYear(int day)
        {
            var t = DateOf(day);
            return (new DateTime(t.y, t.m, t.d, 0, 0, 0, DateTimeKind.Utc) - new DateTime(t.y, 1, 1, 0, 0, 0, DateTimeKind.Utc)).Days + 1;
        }
        public static bool IsOff(int day) { return day > 1 && DateOf(day).wd == 0; }

        static bool IsInt(double v) { return !double.IsNaN(v) && !double.IsInfinity(v) && v == Math.Floor(v); }
        static bool IsFin(object v) { return v is double && !double.IsNaN((double)v) && !double.IsInfinity((double)v); }
        public static bool Truthy(object v)
        {
            if (v == null) return false;
            if (v is bool) return (bool)v;
            if (v is double) return (double)v != 0 && !double.IsNaN((double)v);
            if (v is string) return ((string)v).Length > 0;
            return true;
        }

        // ---- the weather
        public static Dict WeatherFor(uint seed, int day, bool ifr = false, bool bustOk = false, string force = null)
        {
            var r = Js.Rng(unchecked(seed * 7919u + (uint)day * 104729u));
            var r2 = Js.Rng(unchecked(seed * 131u + (uint)day * 7u));
            double x = r();
            string kind = x < 0.47 ? "good" : x < 0.54 ? "southFlow" : x < 0.6 ? "amLowCloud" : x < 0.71 ? "amFog" : x < 0.82 ? "pmStorm" : x < 0.87 ? "pmWind" : x < 0.95 ? "crosswind" : "storm";
            if (ifr && kind == "good" && r2() < 0.22) kind = "lowCloud";
            if (bustOk && kind == "good" && Js.Rng(unchecked(seed * 31u + (uint)day * 17u))() < 0.18) kind = "forecastBust";
            if (force != null) kind = force;
            var W = CareerData.WEATHER[kind];
            double tempC = 17 + Math.Floor(r() * 9);
            double qnh = Js.Round((29.55 + r() * 0.7) * 100) / 100;
            double dewC = tempC - 4 - Math.Floor(r() * 6);
            bool icing = false;
            if (kind == "lowCloud" && DayOfYear(day) >= 295 && Js.Rng(unchecked(seed * 57u + (uint)day * 91u))() < 0.6)
            {
                icing = true;
                tempC = -1 + Math.Floor(Js.Rng(unchecked(seed * 57u + (uint)day * 91u + 5u))() * 4);
                dewC = tempC - 1;
            }
            string Td(double t, double d) { return $"{Js.Pad2(t)}/{Js.Pad2(Math.Min(d, t))}"; }
            string Z(double h) { return $"{Js.Pad2(h)}53Z"; }
            string q = "A" + ((long)Js.Round(qnh * 100)).ToString();
            string wind = kind == "crosswind" ? "09016G24KT" : kind == "lowCloud" ? "03006KT" : kind == "southFlow" ? "19008KT" : "36005KT";
            int dd = DateOf(day).d;
            Dict M(string am, string pm) { return new Dict { { "am", am }, { "pm", pm } }; }
            Dict metar;
            switch (kind)
            {
                case "good": metar = M($"KLAB {Js.Pad2(dd)}{Z(13)} {wind} 10SM FEW035 {Td(tempC - 3, dewC)} {q}", $"KLAB {Js.Pad2(dd)}{Z(18)} {wind} 10SM SCT045 {Td(tempC, dewC)} {q}"); break;
                case "amFog": metar = M($"KLAB {Js.Pad2(dd)}{Z(13)} 00000KT 1/2SM FG VV002 {Td(tempC - 5, tempC - 5)} {q}", $"KLAB {Js.Pad2(dd)}{Z(18)} {wind} 10SM FEW030 {Td(tempC, dewC)} {q}"); break;
                case "pmStorm": metar = M($"KLAB {Js.Pad2(dd)}{Z(13)} {wind} 10SM FEW040 {Td(tempC - 2, dewC + 3)} {q}", $"KLAB {Js.Pad2(dd)}{Z(18)} 22018G30KT 3SM +TSRA BKN025CB {Td(tempC - 4, dewC + 2)} {q}"); break;
                case "crosswind": metar = M($"KLAB {Js.Pad2(dd)}{Z(13)} {wind} 10SM SCT035 {Td(tempC, dewC)} {q}", $"KLAB {Js.Pad2(dd)}{Z(18)} {wind} 10SM SCT040 {Td(tempC + 1, dewC)} {q}"); break;
                case "lowCloud": metar = M($"KLAB {Js.Pad2(dd)}{Z(13)} {wind} 3SM BR BKN008 OVC015 {Td(tempC - 4, tempC - 5)} {q}", $"KLAB {Js.Pad2(dd)}{Z(18)} {wind} 4SM BR OVC009 {Td(tempC - 3, tempC - 4)} {q}"); break;
                case "amLowCloud": metar = M($"KLAB {Js.Pad2(dd)}{Z(13)} 00000KT 5SM BR OVC006 {Td(tempC - 4, tempC - 5)} {q}", $"KLAB {Js.Pad2(dd)}{Z(18)} {wind} 10SM SCT035 {Td(tempC, dewC)} {q}"); break;
                case "pmWind": metar = M($"KLAB {Js.Pad2(dd)}{Z(13)} {wind} 10SM FEW040 {Td(tempC - 2, dewC)} {q}", $"KLAB {Js.Pad2(dd)}{Z(18)} 09018G26KT 10SM SCT040 {Td(tempC + 1, dewC)} {q}"); break;
                case "storm": metar = M($"KLAB {Js.Pad2(dd)}{Z(13)} 18012G22KT 2SM TSRA BKN015CB {Td(tempC - 4, tempC - 5)} {q}", $"KLAB {Js.Pad2(dd)}{Z(18)} 20015G28KT 1 1/2SM +TSRA OVC012CB {Td(tempC - 5, tempC - 6)} {q}"); break;
                case "southFlow": metar = M($"KLAB {Js.Pad2(dd)}{Z(13)} {wind} 10SM FEW035 {Td(tempC - 3, dewC)} {q}", $"KLAB {Js.Pad2(dd)}{Z(18)} {wind} 10SM SCT040 {Td(tempC, dewC)} {q}"); break;
                default: metar = M($"KLAB {Js.Pad2(dd)}{Z(13)} 36005KT 10SM FEW035 {Td(tempC - 3, dewC)} {q}", $"KLAB {Js.Pad2(dd)}{Z(18)} 24018G30KT 3SM TSRA BKN020CB {Td(tempC - 4, dewC + 2)} {q}"); break; // forecastBust
            }
            var taf = new Dictionary<string, string>
            {
                { "good", "TAF KLAB … 01005KT P6SM FEW035 FM1800 03008KT P6SM SCT045" },
                { "amFog", "TAF KLAB … 00000KT 1/2SM FG VV002 TEMPO 1215 1SM BR FM1500 01005KT P6SM FEW030" },
                { "pmStorm", "TAF KLAB … 01005KT P6SM FEW040 FM1700 22015G25KT 3SM TSRA BKN030CB" },
                { "crosswind", "TAF KLAB … 09015G24KT P6SM SCT035 FM2000 09012G20KT P6SM SCT040" },
                { "storm", "TAF KLAB … 18012G22KT 2SM TSRA BKN015CB TEMPO 1622 1SM +TSRA OVC010CB" },
                { "lowCloud", "TAF KLAB … 03006KT 3SM BR BKN008 OVC015 FM2000 03008KT 5SM BR OVC012" },
                { "amLowCloud", "TAF KLAB … 00000KT 5SM BR OVC006 FM1500 01005KT P6SM SCT035" },
                { "pmWind", "TAF KLAB … 01005KT P6SM FEW040 FM1900 09018G26KT P6SM SCT040" },
                { "southFlow", "TAF KLAB … 19008KT P6SM FEW035" },
                { "forecastBust", "TAF KLAB … 01005KT P6SM FEW035 FM1800 03008KT P6SM SCT045" },
            }[kind];
            var outW = new Dict
            {
                { "kind", kind }, { "ja", W.Ja },
                { "fly", new Dict { { "am", W.FlyAm }, { "pm", W.FlyPm } } },
                { "decision", W.Decision },
                { "why", icing ? W.Why + " 今日は雲の中が着氷する温度です（気温氷点近く）。計器飛行では、氷の付着に注意してください。" : W.Why },
                { "metar", metar }, { "taf", taf }, { "tempC", tempC }, { "dewC", dewC }, { "qnh", qnh },
            };
            if (W.Ifr != null) outW["ifr"] = new Dict { { "fly", new Dict { { "am", W.Ifr.FlyAm }, { "pm", W.Ifr.FlyPm } } }, { "decision", W.Ifr.Decision }, { "why", W.Ifr.Why } };
            if (W.Debrief != null) outW["debrief"] = W.Debrief;
            if (icing) outW["icing"] = true;
            return outW;
        }

        public static Dict WeatherFor2(Dict W, string chapter, string kind)
        {
            var ifr = Js.Obj(Js.Get(W, "ifr"));
            if (ifr != null && chapter == "ch4" && kind != "xc")
            {
                var copy = new Dict();
                foreach (var kv in W) copy[kv.Key] = kv.Value;
                copy["fly"] = Js.Get(ifr, "fly");
                copy["decision"] = Js.Get(ifr, "decision");
                copy["why"] = Js.Get(ifr, "why");
                return copy;
            }
            return W;
        }

        public static Dict WeatherAt(Dict W, double hours)
        {
            double Lerp(double a, double b, double f) { return a + (b - a) * Js.Clamp(f, 0, 1); }
            string kind = W == null ? null : Js.Str(W, "kind");
            switch (kind)
            {
                case "amFog": { double f = Js.Clamp((11.5 - hours) / 3.8, 0, 1); return new Dict { { "fog", 0.85 * f }, { "ceilingFt", null }, { "visSM", Lerp(10, 0.5, f) } }; }
                case "amLowCloud": { double c = hours <= 8 ? 600 : hours >= 12 ? 3500 : 600 + (hours - 8) / 4 * 2900; return new Dict { { "fog", c < 1000 ? 0.55 : c < 2000 ? 0.25 : 0.0 }, { "ceilingFt", Js.Round(c) }, { "visSM", c < 1000 ? 5.0 : 10.0 } }; }
                case "lowCloud": return new Dict { { "fog", 0.55 }, { "ceilingFt", 800.0 }, { "visSM", 3.0 } };
                case "forecastBust": return hours < 12.5 ? new Dict { { "fog", 0.0 }, { "ceilingFt", null }, { "visSM", 10.0 } } : new Dict { { "fog", 0.3 }, { "ceilingFt", 2000.0 }, { "visSM", 3.0 } };
                default: return new Dict { { "fog", 0.0 }, { "ceilingFt", null }, { "visSM", 10.0 } };
            }
        }

        static readonly Regex WIND_RE = new Regex(@"(\d{3})(\d{2,3})(?:G\d{2,3})?KT");
        public static (int from, int kt) SurfaceWindOf(string metar)
        {
            var m = WIND_RE.Match(metar ?? "");
            if (!m.Success) return (360, 0);
            int from = int.Parse(m.Groups[1].Value); if (from == 0) from = 360;
            return (from, int.Parse(m.Groups[2].Value));
        }
        public static Dict WindsAloftFor(Dict W)
        {
            var metar = W == null ? null : Js.Obj(Js.Get(W, "metar"));
            var surf = SurfaceWindOf(metar == null ? null : Js.Str(metar, "pm"));
            int from = (surf.from + 30) % 360; if (from == 0) from = 360;
            return new Dict { { "surfFrom", (double)surf.from }, { "surfKt", (double)surf.kt }, { "from", (double)from }, { "kt", surf.kt >= 1 ? surf.kt * 2.0 : 10.0 }, { "altFt", (double)CareerData.NAV_ALT_FT } };
        }
        public static string ActiveRunway(Dict W)
        {
            var metar = W == null ? null : Js.Obj(Js.Get(W, "metar"));
            var s = SurfaceWindOf(metar == null ? null : Js.Str(metar, "pm"));
            return s.kt >= 4 && s.from >= 140 && s.from <= 230 ? "18" : "36";
        }

        // ---- growth tables
        public class GPair { public string Axis; public double V; public GPair(string a, double v) { Axis = a; V = v; } }
        public static List<GPair> LessonGrowth(string grade, string levelId, string lessonId, bool tired = false)
        {
            double b = grade == "S" ? 5.0 : grade == "A" ? 4.0 : grade == "B" ? 3.0 : grade == "C" ? 1.5 : 0;
            var outL = new List<GPair>();
            if (b == 0) return outL;
            if (lessonId == "j5") return outL;
            var fixedJ = new Dictionary<string, GPair> { { "j1", new GPair("hand", 2.4) }, { "j2", new GPair("know", 2.4) }, { "j3", new GPair("judge", 2.4) }, { "j4", new GPair("hand", 2.4) } };
            GPair fj;
            if (lessonId != null && fixedJ.TryGetValue(lessonId, out fj))
            {
                var g = new List<GPair> { new GPair(fj.Axis, fj.V) };
                if (!tired) return g;
                var f2 = new List<GPair>();
                foreach (var p in g) if (p.Axis != "judge") f2.Add(new GPair(p.Axis, p.V * 0.5));
                return f2;
            }
            double w = b * (levelId == "precision" ? 1.3 : levelId == "intro" ? 0.5 : 1.0);
            char kind0 = !string.IsNullOrEmpty(lessonId) ? lessonId[0] : '\0';
            string sub = kind0 == 'i' ? "know" : (kind0 == 'n' || kind0 == 'x' || kind0 == 'e') ? "judge" : "hand";
            outL.Add(new GPair("hand", w));
            outL.Add(new GPair("comm", 0.6));
            if (sub == "hand") outL[0].V += w * 0.35; else outL.Add(new GPair(sub, w * 0.35));
            if (!tired) return outL;
            var f3 = new List<GPair>();
            foreach (var p in outL) if (p.Axis != "judge") f3.Add(new GPair(p.Axis, p.V * 0.5));
            return f3;
        }
        public static List<GPair> FtdGrowth(string id)
        {
            if (id == "k3" || id == "k4" || id == "k5" || id == "k6") return new List<GPair> { new GPair("comm", 2.4), new GPair("hand", 0.6) };
            return new List<GPair> { new GPair("know", 1.6), new GPair("hand", 0.6) };
        }
        public static List<GPair> ClassGrowth(string pace)
        {
            return new List<GPair> { new GPair("know", 6.0 * (pace == "need" ? 0.7 : pace == "quick" ? 0.45 : 1.0)) };
        }
        public static string TrustBand(double v) { return v >= 80 ? "深い信頼" : v >= 60 ? "信頼されている" : v >= 40 ? "通常" : "まだ距離がある"; }
        public static double JudgeOf(Dict state)
        {
            var ab = state == null ? null : Js.Obj(Js.Get(state, "abilities"));
            var j = ab == null ? null : Js.Get(ab, "judge");
            return j is double && IsFin(j) ? (double)j : CareerData.ABILITY_START["judge"];
        }
        public static Dict GraduationRank(Dict state, Prog prog)
        {
            var a = state == null ? null : Js.Obj(Js.Get(state, "abilities"));
            double Get(string k) { return a != null && Js.Get(a, k) is double ? (double)Js.Get(a, k) : CareerData.ABILITY_START[k]; }
            double total = Get("hand") * 0.35 + Get("know") * 0.25 + Get("comm") * 0.15 + Get("judge") * 0.25;
            var ft = state == null ? null : Js.Obj(Js.Get(state, "firstTry"));
            double ftPass = ft == null ? 0 : Js.Num(ft, "pass"), ftTotal = ft == null ? 0 : Js.Num(ft, "total");
            double rate = ftTotal != 0 ? ftPass / ftTotal : 0;
            double examTries = 0;
            var exams = state == null ? null : Js.Obj(Js.Get(state, "exams"));
            if (exams != null) foreach (var kv in exams) { var e = Js.Obj(kv.Value); if (e != null) examTries += Js.Num(e, "tries"); }
            var scores = new List<double>();
            if (prog != null) foreach (var kv in prog.Lessons) { var r = kv.Value; if (r != null && r.HasScore && r.Score > 0) scores.Add(r.Score); }
            double avgScore = 0;
            if (scores.Count > 0) { double sum = 0; foreach (var s in scores) sum += s; avgScore = Js.Round(sum / scores.Count); }
            string rank = total >= 68 && rate >= 0.88 && examTries <= 6 ? "優等" : total >= 62 && rate >= 0.6 ? "優秀" : "通常";
            return new Dict { { "rank", rank }, { "total", Js.Round(total * 10) / 10 }, { "firstRate", Js.Round(rate * 100) }, { "examTries", examTries }, { "avgScore", avgScore } };
        }
        public static Dict MissAsk(Dict state)
        {
            var m = state == null ? null : Js.Obj(Js.Get(state, "miss"));
            if (m == null) return null;
            var label = Js.Str(m, "label"); if (string.IsNullOrEmpty(label)) return null;
            var pool = new List<string>(); foreach (var x in CareerData.MISS_LABELS) if (x != label) pool.Add(x);
            double day = Js.Num(m, "day"); string key = Js.Str(m, "key", "");
            int i = (int)(((long)(day * 7 + label.Length)) % pool.Count + pool.Count) % pool.Count;
            var options = new List<string> { pool[i], pool[(i + 4) % pool.Count] };
            int right = (int)(((long)(day + key.Length)) % 3 + 3) % 3;
            options.Insert(right, label);
            var arr = new List<object>(); foreach (var o in options) arr.Add(o);
            return new Dict { { "label", label }, { "options", arr }, { "right", (double)right } };
        }

        // ---- the state
        public static Dict FoDefault()
        {
            return new Dict { { "hired", false }, { "sectors", 0.0 }, { "blockMin", 0.0 }, { "evalSum", 0.0 }, { "evalN", 0.0 }, { "lineCheck", null }, { "done", false }, { "failSectors", null } };
        }
        static uint SeedFrom(object o)
        {
            if (o is double) { uint u = Js.ToUint32((double)o); return u == 0 ? 1u : u; }
            return 1;
        }
        public static Dict NewCareer(uint seed)
        {
            if (seed == 0) seed = 1;
            var abilities = new Dict(); foreach (var kv in CareerData.ABILITY_START) abilities[kv.Key] = kv.Value;
            return new Dict
            {
                { "v", (double)CareerData.CAREER_VERSION }, { "seed", (double)seed }, { "day", 1.0 }, { "slot", "morning" }, { "chapter", "prologue" },
                { "fatigue", 20.0 }, { "exams", new Dict() }, { "ground", new Dict() }, { "decisions", new List<object>() }, { "done", new Dict() },
                { "solo", null }, { "checks", new Dict() }, { "graduated", null }, { "started", true },
                { "abilities", abilities }, { "firstTry", new Dict { { "pass", 0.0 }, { "total", 0.0 } } }, { "growth", new Dict() },
                { "examDay", new Dict() }, { "aloft", null }, { "drills", new Dict { { "day", 0.0 }, { "n", 0.0 } } }, { "miss", null },
                { "fo", FoDefault() }, { "heard", new Dict() }, { "lastPace", null }, { "attempts", new Dict() }, { "answers", new Dict() }, { "walked", new List<object>() },
            };
        }
        static bool IsIntV(object v) { return v is double && IsInt((double)v); }
        public static Dict CleanCareer(object oIn)
        {
            var o = Js.Obj(oIn);
            if (o == null) return null;
            double v = Js.Num(o, "v", double.NaN);
            if (v != CareerData.CAREER_VERSION && v != 1) return null;
            var s = NewCareer(SeedFrom(Js.Get(o, "seed")));
            var oAb = Js.Obj(Js.Get(o, "abilities"));
            if (oAb != null) { var ab = Js.Obj(Js.Get(s, "abilities")); foreach (var a in CareerData.ABILITIES) { var val = Js.Get(oAb, a); if (IsFin(val)) ab[a] = Js.Clamp((double)val, 0, 100); } }
            var oFt = Js.Obj(Js.Get(o, "firstTry"));
            if (oFt != null)
            {
                var ft = Js.Obj(Js.Get(s, "firstTry"));
                var p = Js.Get(oFt, "pass"); if (IsIntV(p) && (double)p >= 0) ft["pass"] = Math.Min((double)p, 9999);
                var t = Js.Get(oFt, "total"); if (IsIntV(t) && (double)t >= 0) ft["total"] = Math.Min((double)t, 9999);
                if (Js.Num(ft, "pass") > Js.Num(ft, "total")) ft["pass"] = ft["total"];
            }
            var oGr = Js.Obj(Js.Get(o, "growth"));
            if (oGr != null) { var gr = Js.Obj(Js.Get(s, "growth")); int n = 0; foreach (var kv in oGr) { if (n++ >= 200) break; if (CareerData.ATTEMPT_ID.IsMatch(kv.Key) && IsIntV(kv.Value) && (double)kv.Value >= 0) gr[kv.Key] = Math.Min((double)kv.Value, 999); } }
            var oEd = Js.Obj(Js.Get(o, "examDay"));
            if (oEd != null) { var ed = Js.Obj(Js.Get(s, "examDay")); foreach (var kv in oEd) if (CareerData.EXAMS.ContainsKey(kv.Key) && IsIntV(kv.Value) && (double)kv.Value >= 1 && (double)kv.Value < 10000) ed[kv.Key] = kv.Value; }
            var oDr = Js.Obj(Js.Get(o, "drills"));
            if (oDr != null && IsIntV(Js.Get(oDr, "day")) && IsIntV(Js.Get(oDr, "n"))) s["drills"] = new Dict { { "day", Js.Clamp(Js.Num(oDr, "day"), 0, 9999) }, { "n", Js.Clamp(Js.Num(oDr, "n"), 0, 99) } };
            var oAl = Js.Obj(Js.Get(o, "aloft"));
            if (oAl != null && IsIntV(Js.Get(oAl, "day")) && Js.Num(oAl, "day") >= 1 && Js.Num(oAl, "day") < 10000
                && IsFin(Js.Get(oAl, "surfFrom")) && IsFin(Js.Get(oAl, "surfKt")) && IsFin(Js.Get(oAl, "from")) && IsFin(Js.Get(oAl, "kt")))
                s["aloft"] = new Dict { { "day", Js.Num(oAl, "day") }, { "surfFrom", Js.Clamp(Js.Num(oAl, "surfFrom"), 0, 360) }, { "surfKt", Js.Clamp(Js.Num(oAl, "surfKt"), 0, 99) }, { "from", Js.Clamp(Js.Num(oAl, "from"), 0, 360) }, { "kt", Js.Clamp(Js.Num(oAl, "kt"), 0, 99) }, { "altFt", (double)CareerData.NAV_ALT_FT } };
            var oMiss = Js.Obj(Js.Get(o, "miss"));
            if (oMiss != null && Js.Get(oMiss, "key") is string && CareerData.MISS_KEY.IsMatch(Js.Str(oMiss, "key")) && Js.Get(oMiss, "label") is string
                && Js.Str(oMiss, "label").Length >= 1 && Js.Str(oMiss, "label").Length <= 80 && IsIntV(Js.Get(oMiss, "day")) && Js.Num(oMiss, "day") >= 1 && Js.Num(oMiss, "day") < 10000)
                s["miss"] = new Dict { { "day", Js.Num(oMiss, "day") }, { "key", Js.Str(oMiss, "key") }, { "label", Js.Str(oMiss, "label") } };
            if (IsIntV(Js.Get(o, "day")) && Js.Num(o, "day") >= 1 && Js.Num(o, "day") < 10000) s["day"] = Js.Num(o, "day");
            var slot = Js.Str(o, "slot"); if (slot != null && Array.IndexOf(CareerData.SLOTS, slot) >= 0) s["slot"] = slot;
            var chap = Js.Str(o, "chapter"); if (chap != null && CareerData.CHAPTERS.ContainsKey(chap)) s["chapter"] = chap;
            if (IsFin(Js.Get(o, "fatigue"))) s["fatigue"] = Js.Clamp(Js.Round(Js.Num(o, "fatigue")), 0, 100);
            foreach (var kk in new[] { "exams", "ground" })
            {
                var src = Js.Obj(Js.Get(o, kk)); if (src == null) continue;
                var dst = Js.Obj(Js.Get(s, kk));
                foreach (var kv in src)
                {
                    var val = Js.Obj(kv.Value);
                    if (!Regex.IsMatch(kv.Key, "^[a-z0-9_]{1,16}$") || val == null) continue;
                    dst[kv.Key] = new Dict { { "tries", Js.Clamp(Js.Round(Js.NumOr0(Js.Get(val, "tries"))), 0, 9999) }, { "best", Js.Clamp(Js.Round(Js.NumOr0(Js.Get(val, "best"))), 0, 100) }, { "pass", Truthy(Js.Get(val, "pass")) } };
                }
            }
            var oDec = Js.Get(o, "decisions") as List<object>;
            if (oDec != null)
            {
                var kept = new List<object>();
                foreach (var d0 in oDec)
                {
                    var d = Js.Obj(d0);
                    if (d != null && IsIntV(Js.Get(d, "day")) && Js.Get(d, "choice") is string && Js.Get(d, "right") is bool)
                        kept.Add(new Dict { { "day", Js.Num(d, "day") }, { "choice", Js.Str(d, "choice").Length > 12 ? Js.Str(d, "choice").Substring(0, 12) : Js.Str(d, "choice") }, { "right", Js.Bool(d, "right") } });
                }
                if (kept.Count > 200) kept.RemoveRange(0, kept.Count - 200);
                s["decisions"] = kept;
            }
            var oDone = Js.Obj(Js.Get(o, "done"));
            if (oDone != null) { var dn = Js.Obj(Js.Get(s, "done")); foreach (var kv in oDone) if (Regex.IsMatch(kv.Key, "^[a-z0-9_:]{1,24}$") && IsIntV(kv.Value)) dn[kv.Key] = kv.Value; }
            var oSolo = Js.Obj(Js.Get(o, "solo"));
            if (oSolo != null && IsIntV(Js.Get(oSolo, "day"))) s["solo"] = new Dict { { "day", Js.Num(oSolo, "day") } };
            var oCk = Js.Obj(Js.Get(o, "checks"));
            if (oCk != null) { var ck = Js.Obj(Js.Get(s, "checks")); foreach (var kv in oCk) { var val = Js.Obj(kv.Value); if (CareerData.CHECKS.ContainsKey(kv.Key) && val != null) ck[kv.Key] = new Dict { { "tries", Js.Clamp(Js.Round(Js.NumOr0(Js.Get(val, "tries"))), 0, 999) }, { "pass", Truthy(Js.Get(val, "pass")) }, { "day", IsIntV(Js.Get(val, "day")) ? Js.Num(val, "day") : 0.0 } }; } }
            var oGrad = Js.Obj(Js.Get(o, "graduated"));
            if (oGrad != null && IsIntV(Js.Get(oGrad, "day")))
            {
                var g = new Dict { { "day", Js.Num(oGrad, "day") } };
                var rank = Js.Str(oGrad, "rank");
                if (rank == "優等" || rank == "優秀" || rank == "通常")
                {
                    g["rank"] = rank;
                    foreach (var k in new[] { "total", "firstRate", "examTries", "avgScore" }) if (IsFin(Js.Get(oGrad, k))) g[k] = Js.Clamp(Js.Num(oGrad, k), 0, 9999);
                }
                s["graduated"] = g;
            }
            var oFo = Js.Obj(Js.Get(o, "fo"));
            if (oFo != null)
            {
                var fo = new Dict
                {
                    { "hired", Truthy(Js.Get(oFo, "hired")) },
                    { "sectors", IsIntV(Js.Get(oFo, "sectors")) && Js.Num(oFo, "sectors") >= 0 ? Math.Min(Js.Num(oFo, "sectors"), 9999) : 0.0 },
                    { "blockMin", IsFin(Js.Get(oFo, "blockMin")) && Js.Num(oFo, "blockMin") >= 0 ? Math.Min(Js.Round(Js.Num(oFo, "blockMin")), 999999) : 0.0 },
                    { "evalSum", IsFin(Js.Get(oFo, "evalSum")) ? Js.Clamp(Js.Num(oFo, "evalSum"), 0, 999999) : 0.0 },
                    { "evalN", IsIntV(Js.Get(oFo, "evalN")) && Js.Num(oFo, "evalN") >= 0 ? Math.Min(Js.Num(oFo, "evalN"), 9999) : 0.0 },
                    { "lineCheck", Js.Str(oFo, "lineCheck") == "pass" || Js.Str(oFo, "lineCheck") == "fail" ? (object)Js.Str(oFo, "lineCheck") : null },
                    { "done", Truthy(Js.Get(oFo, "done")) },
                    { "failSectors", IsIntV(Js.Get(oFo, "failSectors")) && Js.Num(oFo, "failSectors") >= 0 ? (object)Math.Min(Js.Num(oFo, "failSectors"), 9999) : null },
                };
                if (Js.Bool(fo, "done")) fo["lineCheck"] = "pass";
                s["fo"] = fo;
            }
            var oHeard = Js.Obj(Js.Get(o, "heard"));
            if (oHeard != null)
            {
                var hd = Js.Obj(Js.Get(s, "heard"));
                foreach (var kv in oHeard) if (CareerData.SEC_ID.IsMatch(kv.Key) && (kv.Value as string == "f" || kv.Value as string == "q")) hd[kv.Key] = kv.Value;
            }
            else
            {
                var sDone = Js.Obj(Js.Get(s, "done"));
                var before = new List<string>();
                foreach (var k in sDone.Keys) if (Regex.IsMatch(k, "^(class|lecture):\\d+$")) before.Add(k);
                var chapters = new Dictionary<string, double>();
                var cb = CareerData.ClassesBefore;
                for (int i = 0; i < cb.Length; i++)
                {
                    object d; if (sDone.TryGetValue("class:" + i, out d) && d != null) foreach (var id in cb[i]) chapters[id] = (double)d;
                }
                foreach (var k in before) sDone.Remove(k);
                for (int i = 0; i < CareerData.CLASSES.Length; i++)
                {
                    var ids = CareerData.CLASSES[i]; bool all = true; double max = 0;
                    foreach (var id in ids) { double dv; if (!chapters.TryGetValue(id, out dv)) { all = false; break; } if (dv > max) max = dv; }
                    if (all) sDone["class:" + i] = max;
                }
                bool AnyToday() { foreach (var dv in chapters.Values) if (dv == Js.Num(s, "day")) return true; return false; }
                bool ClassToday() { for (int i = 0; i < CareerData.CLASSES.Length; i++) { object d; if (sDone.TryGetValue("class:" + i, out d) && d is double && (double)d == Js.Num(s, "day")) return true; } return false; }
                if (Js.Str(s, "chapter") == "ch1" && AnyToday() && !ClassToday()) s["slot"] = "morning";
            }
            var pace = Js.Str(o, "lastPace"); if (pace != null && Array.IndexOf(CareerData.PACE_IDS, pace) >= 0) s["lastPace"] = pace;
            var oAtt = Js.Obj(Js.Get(o, "attempts"));
            if (oAtt != null) { var at = Js.Obj(Js.Get(s, "attempts")); foreach (var kv in oAtt) if (CareerData.ATTEMPT_ID.IsMatch(kv.Key) && IsIntV(kv.Value) && (double)kv.Value >= 0) at[kv.Key] = Math.Min((double)kv.Value, 9999); }
            var oAns = Js.Obj(Js.Get(o, "answers"));
            if (oAns != null)
            {
                var an = Js.Obj(Js.Get(s, "answers")); int n = 0;
                foreach (var kv in oAns)
                {
                    if (n++ >= 400) break;
                    var arr = kv.Value as List<object>;
                    if (!CareerData.Q_ID.IsMatch(kv.Key) || arr == null || arr.Count != 4) continue;
                    bool allInt = true; foreach (var e in arr) if (!IsIntV(e)) allInt = false;
                    if (!allInt) continue;
                    an[kv.Key] = new List<object> { Js.Clamp((double)arr[0], 0, 9999), Js.Clamp((double)arr[1], 0, 9999), Truthy(arr[2]) ? 1.0 : 0.0, Js.Clamp((double)arr[3], 0, 9999) };
                }
            }
            var oWalk = Js.Get(o, "walked") as List<object>;
            if (oWalk != null)
            {
                var wk = new List<object>(); var seen = new HashSet<string>();
                foreach (var x0 in oWalk) { var xs = x0 as string; if (xs != null && Regex.IsMatch(xs, "^[a-z0-9-]{1,16}$") && seen.Add(xs)) wk.Add(xs); }
                if (wk.Count > 40) wk.RemoveRange(40, wk.Count - 40);
                s["walked"] = wk;
            }
            return s;
        }

        // ---- what counts
        public static Prog.Rec LessonRec(Prog prog, string id) { return prog == null ? null : prog.Get(id); }
        public static bool PassedAt(Prog prog, string id, string[] levels = null)
        {
            if (levels == null) levels = CareerData.CountsLevels;
            var r = LessonRec(prog, id);
            if (r == null || !r.Pass) return false;
            foreach (var l in r.Levels) if (Array.IndexOf(levels, l) >= 0) return true;
            return false;
        }
        public static bool GroundPassed(Prog prog, string id) { var r = LessonRec(prog, id); return r != null && r.Pass; }
        public static (Prog.Rec rec, bool first) NoteGround(Prog.Rec rec, bool pass, double pct = 100)
        {
            var r = rec ?? new Prog.Rec();
            bool first = r.Tries == 0;
            r.Tries++;
            if (pass)
            {
                r.Pass = true;
                string g = pct >= 100 ? "S" : pct >= 90 ? "A" : "B";
                if (r.Best == "" || "SAB".IndexOf(g) < "SAB".IndexOf(r.Best)) r.Best = g;
            }
            return (r, first);
        }
        public static string NextLesson(Prog prog)
        {
            foreach (var id in CareerData.CH2) if (!PassedAt(prog, id)) return id;
            return null;
        }
        public static string NextIn(Prog prog, string[] list)
        {
            foreach (var id in list) if (!PassedAt(prog, id)) return id;
            return null;
        }
        public static List<string> Gate(Dict state, Prog prog, double trust = 50)
        {
            string chapter = Js.Str(state, "chapter");
            var miss = new List<string>();
            if (chapter == "fo2") return miss;
            var done = Js.Obj(Js.Get(state, "done"));
            var exams = Js.Obj(Js.Get(state, "exams"));
            var checks = Js.Obj(Js.Get(state, "checks"));
            if (chapter == "prologue") { if (!done.ContainsKey("prologue")) miss.Add("入社の 1 日"); return miss; }
            if (chapter == "ch1")
            {
                foreach (var id in CareerData.GROUND) if (!GroundPassed(prog, id)) miss.Add($"訓練装置 {id}");
                var w = Js.Obj(Js.Get(exams, "written1"));
                if (!(w != null && Js.Bool(w, "pass"))) miss.Add(CareerData.EXAMS["written1"].Title);
                return miss;
            }
            CareerData.StageDef S;
            if (chapter != null && CareerData.STAGE.TryGetValue(chapter, out S))
            {
                foreach (var id in S.Lessons) if (!PassedAt(prog, id)) miss.Add($"課目 {id}");
                var e = Js.Obj(Js.Get(exams, S.Exam));
                if (!(e != null && Js.Bool(e, "pass"))) miss.Add(CareerData.EXAMS[S.Exam].Title);
                var c = Js.Obj(Js.Get(checks, S.Check));
                if (!(c != null && Js.Bool(c, "pass"))) miss.Add(CareerData.CHECKS[S.Check].Title);
                return miss;
            }
            if (Js.Get(state, "solo") != null) return miss;
            foreach (var id in CareerData.CH2) if (!PassedAt(prog, id)) miss.Add($"課目 {id}");
            var pe = Js.Obj(Js.Get(exams, "presolo"));
            if (!(pe != null && Js.Bool(pe, "pass"))) miss.Add(CareerData.EXAMS["presolo"].Title);
            if (!PassedAt(prog, "c1")) miss.Add("ソロ前の審査（c1）");
            if (trust < CareerData.SOLO_TRUST) miss.Add($"担当教官の信頼（{(int)CareerData.SOLO_TRUST} 以上）");
            if (JudgeOf(state) < CareerData.SOLO_JUDGE) miss.Add($"判断（{(int)CareerData.SOLO_JUDGE} 以上）");
            return miss;
        }
        public static Dictionary<string, bool> PrologueFlags(Dict state)
        {
            bool past = Js.Str(state, "chapter") != "prologue" || Js.Obj(Js.Get(state, "done")).ContainsKey("prologue");
            var done = Js.Obj(Js.Get(state, "done"));
            return new Dictionary<string, bool>
            {
                { "welcome_done", past || done.ContainsKey("ceremony:welcome") },
                { "tour_done", past || done.ContainsKey("tour:tour") },
                { "met_instructor", past || done.ContainsKey("brief:meet") },
            };
        }

        // ---- first-officer roster
        public static bool FoLineCheckReady(Dict fo)
        {
            if (fo == null || Js.Bool(fo, "done")) return false;
            if (!(Js.Num(fo, "sectors") >= 12 && Js.Num(fo, "blockMin") >= 900)) return false;
            if (Js.Str(fo, "lineCheck") == "fail" && IsIntV(Js.Get(fo, "failSectors"))) return Js.Num(fo, "sectors") >= Js.Num(fo, "failSectors") + 4;
            return true;
        }
        const int FO_CYCLE = 6, FO_DUTY_IN_CYCLE = 4;
        public static bool FoPatternDuty(uint seed, int day)
        {
            if (IsOff(day)) return false;
            long pos = (((day + (long)(seed % FO_CYCLE)) % FO_CYCLE) + FO_CYCLE) % FO_CYCLE;
            return pos < FO_DUTY_IN_CYCLE;
        }
        public static int FoDutyIndex(uint seed, int day) { int n = 0; for (int d = 1; d < day; d++) if (FoPatternDuty(seed, d)) n++; return n; }
        public static Dict FoRosterItem(Dict state, int day)
        {
            uint seed = (uint)Js.Num(state, "seed");
            if (!FoPatternDuty(seed, day))
                return new Dict { { "slot", "am" }, { "kind", "off" }, { "id", "roster" }, { "title", "休日（ロスター）" }, { "where", null }, { "who", null }, { "reason", "roster" } };
            var route = CareerData.FO_ROUTES[(int)Math.Floor(Js.Rng(unchecked(seed * 104729u + (uint)day * 7919u))() * CareerData.FO_ROUTES.Length)];
            var cap = CareerData.FO_CAPTAINS[(int)Math.Floor(Js.Rng(unchecked(seed * 31u + (uint)day * 131u))() * CareerData.FO_CAPTAINS.Length)];
            var fo = Js.Obj(Js.Get(state, "fo"));
            double flown = fo != null && IsIntV(Js.Get(fo, "sectors")) ? Js.Num(fo, "sectors") : 0;
            string role = ((long)flown) % 2 == 0 ? "PF" : "PM";
            return new Dict { { "slot", "am" }, { "kind", "line" }, { "id", "line" }, { "route", route.Id }, { "blockMin", route.BlockMin }, { "role", role }, { "captain", cap.Id },
                { "title", $"路線運航：{route.NameJa}（{role}）" }, { "where", "haneda" }, { "who", cap.Id } };
        }
        static List<Dict> Fo2Schedule(Dict state)
        {
            if (Js.Num(state, "fatigue") >= 65)
                return new List<Dict> { new Dict { { "slot", "am" }, { "kind", "off" }, { "id", "rest" }, { "title", "疲労のため乗務できません（休息）" }, { "where", null }, { "who", null }, { "reason", "rest" } } };
            var fo = Js.Obj(Js.Get(state, "fo"));
            if (FoLineCheckReady(fo))
                return new List<Dict> { new Dict { { "slot", "am" }, { "kind", "linecheck" }, { "id", "linecheck" }, { "route", "HND-KMQ" }, { "blockMin", 65.0 }, { "role", "PF" }, { "captain", "examiner" },
                    { "title", "ラインチェック（定期審査）：羽田―小松（PF）" }, { "where", "haneda" }, { "who", "examiner" } } };
            return new List<Dict> { FoRosterItem(state, (int)Js.Num(state, "day")) };
        }

        // ---- heard sections
        public static List<List<string>> ClassSections = CareerData.CLASSES.Length == 0 ? null : InitSections();
        static List<List<string>> InitSections() { var l = new List<List<string>>(); for (int i = 0; i < CareerData.CLASSES.Length; i++) l.Add(new List<string>()); return l; }
        public static HashSet<string> HeardSet(Dict st, List<List<string>> chapters = null)
        {
            if (chapters == null) chapters = ClassSections;
            var outS = new HashSet<string>();
            var heard = Js.Obj(Js.Get(st, "heard"));
            if (heard != null) foreach (var k in heard.Keys) outS.Add(k);
            var done = Js.Obj(Js.Get(st, "done"));
            for (int i = 0; i < CareerData.CLASSES.Length; i++)
                if (done != null && done.ContainsKey("class:" + i) && i < chapters.Count)
                    foreach (var id in chapters[i]) outS.Add(id);
            return outS;
        }
    }

    public static partial class CareerSchedule
    {
        static Dict Item(string slot, string kind, string id, string title, string where, string who)
        {
            var d = new Dict { { "slot", slot }, { "kind", kind } };
            if (id != null) d["id"] = id;
            d["title"] = title; d["where"] = where; d["who"] = who;
            return d;
        }
        static (string force, bool ifr) ForcedWeather(Dict state, Prog prog)
        {
            string chapter = Js.Str(state, "chapter");
            if (chapter == "prologue") return ("good", false);
            CareerData.StageDef S;
            if (chapter != null && CareerData.STAGE.TryGetValue(chapter, out S))
            {
                if (prog == null || !CareerLogic.PassedAt(prog, S.Lessons[0])) return ("good", false);
                bool lessonsDone = CareerLogic.NextIn(prog, S.Lessons) == null;
                var exams = Js.Obj(Js.Get(state, "exams"));
                var e = Js.Obj(Js.Get(exams, S.Exam));
                bool exOk = e != null && Js.Bool(e, "pass");
                if (lessonsDone && exOk && S.Check == "xc") return ("good", false);
                if (lessonsDone && exOk && S.Check == "ir") return ("lowCloud", false);
                if (lessonsDone && exOk) return ("good", false);
                return (null, chapter == "ch4");
            }
            if (chapter == "ch2" && !CareerLogic.PassedAt(prog, "a1")) return ("good", false);
            if (chapter == "ch2" && CareerLogic.PassedAt(prog, "c1") && Js.Get(state, "solo") == null) return ("good", false);
            return (null, false);
        }
        public static (string force, bool ifr, bool bustOk) DayOpts(Dict state, Prog prog)
        {
            var f = ForcedWeather(state, prog);
            string chapter = Js.Str(state, "chapter");
            bool bustOk = chapter != null && CareerData.STAGE.ContainsKey(chapter) && chapter != "ch3" && chapter != "ch4" && chapter != "fo1";
            return (f.force, f.ifr, bustOk);
        }
        public static Dict ForcedOnly(Dict state, Prog prog) { var f = ForcedWeather(state, prog); return null == f.force && !f.ifr ? new Dict() : null; }

        public static List<Dict> Schedule(Dict state, Prog prog, double trust = 50, Dict weather = null)
        {
            int day = (int)Js.Num(state, "day");
            uint seed = (uint)Js.Num(state, "seed");
            string chapter = Js.Str(state, "chapter");
            var done = Js.Obj(Js.Get(state, "done"));
            var exams = Js.Obj(Js.Get(state, "exams"));
            var examDay = Js.Obj(Js.Get(state, "examDay"));
            bool Today(string key) { object v; return done.TryGetValue(key, out v) && v is double && (double)v == day; }
            var opts = DayOpts(state, prog);
            var W = weather ?? CareerLogic.WeatherFor(seed, day, opts.ifr, opts.bustOk, opts.force);
            var fly = Js.Obj(Js.Get(W, "fly"));
            var outL = new List<Dict>();
            if (CareerLogic.IsOff(day))
            {
                var off = new List<Dict> { Item("am", "off", null, "休日", null, null) };
                bool anyClass = false; foreach (var k in done.Keys) if (k.StartsWith("class:")) anyClass = true;
                var w = CareerData.CH1_EVENTS[6];
                if (chapter == "ch1" && anyClass && (!done.ContainsKey("event:week") || Today("event:week")))
                {
                    var ev = Item("am", "event", w.Id, w.Title, w.Where, w.Who); ev["optional"] = true; off.Add(ev);
                }
                return off;
            }
            if (chapter == "prologue")
            {
                outL.Add(Item("morning", "ceremony", "welcome", "入社の式（ロビー）", "lobby", "chief"));
                outL.Add(Item("am", "tour", "tour", "訓練所の案内", "dispatch", "dispatcher"));
                outL.Add(Item("pm", "brief", "meet", "担当教官との顔合わせ（ブリーフィング室 1）", "brief-1", "instructor"));
                return outL;
            }
            if (chapter == "ch1")
            {
                int cls = -1;
                for (int i = 0; i < CareerData.CLASSES.Length; i++) if (!done.ContainsKey("class:" + i) || Today("class:" + i)) { cls = i; break; }
                string k0 = null;
                foreach (var gid in CareerData.GROUND) if (!CareerLogic.GroundPassed(prog, gid) || Today("ftd:" + gid)) { k0 = gid; break; }
                int ci = k0 == null ? -1 : Array.IndexOf(CareerData.CLASS_FTD, k0);
                string k = k0 != null && (ci < 0 || done.ContainsKey("class:" + ci) || ci == cls) ? k0 : null;
                if (cls >= 0) outL.Add(Item("am", "class", cls.ToString(), $"座学 {cls + 1} / {CareerData.CLASSES.Length}（{CareerData.ClassShort(cls)}）", "brief-2", "lecturer"));
                if (k != null) outL.Add(Item(cls >= 0 ? "pm" : "am", "ftd", k, $"訓練装置 {k}・{CareerData.FTD_TITLES[k]}", "sim", "lecturer"));
                CareerData.Ch1Event ev = null;
                if (cls >= 0 && (Today("class:" + cls) || Array.IndexOf(CareerData.SLOTS, Js.Str(state, "slot")) <= Array.IndexOf(CareerData.SLOTS, "am")))
                    foreach (var e in CareerData.CH1_EVENTS) if (e.Cls == cls) { ev = e; break; }
                if (ev != null && (!done.ContainsKey("event:" + ev.Id) || Today("event:" + ev.Id)))
                    outL.Add(Item("evening", "event", ev.Id, ev.Title, ev.Where, ev.Who));
                var ex = Js.Obj(Js.Get(exams, "written1"));
                bool exPass = ex != null && Js.Bool(ex, "pass");
                object edw; double edWritten = examDay != null && examDay.TryGetValue("written1", out edw) && edw is double ? (double)edw : -1;
                if (cls < 0 && k == null && ((!exPass && edWritten != day) || (exPass && Today("exam:written1"))))
                    outL.Add(Item(outL.Count > 0 ? "pm" : "am", "exam", "written1", CareerData.EXAMS["written1"].Title, "planning", "lecturer"));
                return outL;
            }
            if ((chapter != null && CareerData.STAGE.ContainsKey(chapter)) || chapter == "fo2")
            {
                var l = LaterSchedule(state, prog, W, outL, Today);
                l.Sort((a, b) => Array.IndexOf(CareerData.SLOTS, Js.Str(a, "slot")).CompareTo(Array.IndexOf(CareerData.SLOTS, Js.Str(b, "slot"))));
                return l;
            }
            // chapter 2
            string flownKey = null;
            foreach (var kv in done)
            {
                if (kv.Value is double && (double)kv.Value == day && Regex.IsMatch(kv.Key, "^(flight|checkride|solo):")) { flownKey = kv.Key; break; }
            }
            string id = flownKey != null && flownKey.StartsWith("flight:") ? flownKey.Substring(7) : CareerLogic.NextLesson(prog);
            var ex2 = Js.Obj(Js.Get(exams, "presolo"));
            bool ex2Pass = ex2 != null && Js.Bool(ex2, "pass");
            string flySlot = Js.Bool(fly, "am") ? "am" : Js.Bool(fly, "pm") ? "pm" : null;
            void Ground(string slot)
            {
                object edv; double ed = examDay != null && examDay.TryGetValue("presolo", out edv) && edv is double ? (double)edv : -1;
                if (!ex2Pass && ed != day && id != null && Array.IndexOf(CareerData.CH2, id) >= 9)
                    outL.Add(Item(slot, "exam", "presolo", CareerData.EXAMS["presolo"].Title, "planning", "instructor"));
            }
            if (Js.Get(state, "solo") != null && flownKey != "solo:solo")
                return new List<Dict> { Item("am", "study", "after", "自習（次の段階の予習）", "planning", null) };
            if (flownKey == "checkride:c1")
                return new List<Dict> { Item(Js.Bool(fly, "am") ? "am" : "pm", "checkride", "c1", "ソロ前の審査（c1・主任教官）", "apron", "chief") };
            if (flownKey == "solo:solo")
                return new List<Dict> { Item(Js.Bool(fly, "am") ? "am" : "pm", "solo", "solo", "ファーストソロ", "apron", "instructor") };
            if (flySlot == null)
            {
                outL.Add(Item("am", "study", "weather", "天気で飛べない日：地上で復習", "brief-1", "instructor"));
                Ground("pm");
                return outL;
            }
            if (id != null) outL.Add(Item(flySlot, "flight", id, $"飛行：{id}", "apron", "instructor"));
            else
            {
                object edv; double ed = examDay != null && examDay.TryGetValue("presolo", out edv) && edv is double ? (double)edv : -1;
                if ((!ex2Pass && ed != day) || (ex2Pass && Today("exam:presolo")))
                    outL.Add(Item(flySlot, "exam", "presolo", CareerData.EXAMS["presolo"].Title, "planning", "instructor"));
                else if (!ex2Pass)
                    outL.Add(Item(flySlot, "flight", "t2", "飛行：場周経路の仕上げ（t2）", "apron", "instructor"));
                else if (!CareerLogic.PassedAt(prog, "c1"))
                    outL.Add(Item(flySlot, "checkride", "c1", "ソロ前の審査（c1・主任教官）", "apron", "chief"));
                else if (trust >= CareerData.SOLO_TRUST && CareerLogic.JudgeOf(state) >= CareerData.SOLO_JUDGE)
                    outL.Add(Item(flySlot, "solo", "solo", "ファーストソロ", "apron", "instructor"));
                else
                    outL.Add(Item(flySlot, "flight", "t2", "飛行：場周経路の仕上げ（t2）", "apron", "instructor"));
            }
            if (id != null) Ground(flySlot == "am" ? "pm" : "am");
            return outL;
        }

        static List<Dict> CheckItems(Dict state, CareerData.CheckDef C, string id, Dict W, List<Dict> outL, bool flown)
        {
            if (C.Kind == "xc")
            {
                outL.Add(Item("am", "navlog", "xc", "航法ログを作る（ブリーフィング室 1）", "brief-1", "instructor"));
                outL.Add(Item("pm", "xc", id, C.Title, "apron", null));
                return outL;
            }
            var fly = Js.Obj(Js.Get(W, "fly"));
            outL.Add(Item(Js.Bool(fly, "am") || flown ? "am" : "pm", "checkride", id, C.Title, "apron", C.Who));
            return outL;
        }

        static List<Dict> LaterSchedule(Dict state, Prog prog, Dict W, List<Dict> outL, Func<string, bool> Today)
        {
            string chapter = Js.Str(state, "chapter");
            int day = (int)Js.Num(state, "day");
            if (chapter == "fo2") { outL.AddRange(Fo2Of(state)); return outL; }
            var S = CareerData.STAGE[chapter];
            var C = CareerData.CHECKS[S.Check];
            var exams = Js.Obj(Js.Get(state, "exams"));
            var examDay = Js.Obj(Js.Get(state, "examDay"));
            var done = Js.Obj(Js.Get(state, "done"));
            var ex = Js.Obj(Js.Get(exams, S.Exam));
            bool exPass = ex != null && Js.Bool(ex, "pass");
            double ExamDayOf(string id) { object v; return examDay != null && examDay.TryGetValue(id, out v) && v is double ? (double)v : -1; }
            if (Js.Get(state, "graduated") != null && chapter != "ch7" && chapter != "fo1")
            {
                outL.Add(Item("am", "off", "grad", "修了（訓練はすべて終わりました）", null, null));
                return outL;
            }
            var checks = Js.Obj(Js.Get(state, "checks"));
            var ck = Js.Obj(Js.Get(checks, S.Check));
            bool checkPassed = ck != null && Js.Bool(ck, "pass");
            if (chapter == "ch6" && checkPassed)
            {
                outL.Add(Item("morning", "graduation", "grad", "修了式（ロビー）", "lobby", "chief"));
                return outL;
            }
            string flownKey = null;
            foreach (var kv in done)
                if (kv.Value is double && (double)kv.Value == day && Regex.IsMatch(kv.Key, "^(flight|checkride|xc):")) { flownKey = kv.Key; break; }
            var W2 = CareerLogic.WeatherFor2(W, chapter, flownKey != null && flownKey.StartsWith("xc:") ? "xc" : "flight");
            var fly2 = Js.Obj(Js.Get(W2, "fly"));
            string flySlot = Js.Bool(fly2, "am") ? "am" : Js.Bool(fly2, "pm") ? "pm" : null;
            string id = flownKey != null && flownKey.StartsWith("flight:") ? flownKey.Substring(7) : CareerLogic.NextIn(prog, S.Lessons);
            if (flownKey != null && !flownKey.StartsWith("flight:")) id = null;
            void Written(string slot)
            {
                if (!exPass && ExamDayOf(S.Exam) != day && id != null && Array.IndexOf(S.Lessons, id) >= S.Lessons.Length / 2)
                    outL.Add(Item(slot, "exam", S.Exam, CareerData.EXAMS[S.Exam].Title, "planning", "instructor"));
            }
            string checkKey = C.Kind + ":" + S.Check;
            if (chapter == "fo1")
            {
                if (flownKey != null && flownKey == checkKey) return CheckItems(state, C, S.Check, W, outL, true);
                if (!exPass)
                {
                    if (ExamDayOf(S.Exam) != day) outL.Add(Item("am", "exam", S.Exam, CareerData.EXAMS[S.Exam].Title, "planning", "instructor"));
                    return outL;
                }
                if (Today("exam:" + S.Exam) && flownKey == null) { outL.Add(Item("am", "exam", S.Exam, CareerData.EXAMS[S.Exam].Title, "planning", "instructor")); return outL; }
                if (flySlot == null) { outL.Add(Item("am", "study", "weather", "天気で飛べない日：地上で復習", "brief-1", "instructor")); return outL; }
                if (id != null) { outL.Add(Item(flySlot, "flight", id, $"飛行：{id}", "apron", "instructor")); return outL; }
                return CheckItems(state, C, S.Check, W2, outL, false);
            }
            if (flownKey != null && flownKey == checkKey) return CheckItems(state, C, S.Check, W, outL, true);
            if (flySlot == null)
            {
                outL.Add(Item("am", "study", "weather", "天気で飛べない日：地上で復習", "brief-1", "instructor"));
                if (!exPass && ExamDayOf(S.Exam) != day && (id == null || Array.IndexOf(S.Lessons, id) >= S.Lessons.Length / 2))
                    outL.Add(Item("pm", "exam", S.Exam, CareerData.EXAMS[S.Exam].Title, "planning", "instructor"));
                return outL;
            }
            if (id != null)
            {
                var item = Item(flySlot, "flight", id, $"飛行：{id}", "apron", "instructor");
                if (Js.Str(W, "kind") == "forecastBust")
                    item["divert"] = new Dict { { "to", "LABEF" }, { "rwy", "09" }, { "freq", "122.9" }, { "ctaf", true } };
                outL.Add(item);
                Written(flySlot == "am" ? "pm" : "am");
                return outL;
            }
            if ((!exPass && ExamDayOf(S.Exam) != day) || (exPass && Today("exam:" + S.Exam)))
            {
                outL.Add(Item(flySlot, "exam", S.Exam, CareerData.EXAMS[S.Exam].Title, "planning", "instructor"));
                return outL;
            }
            if (!exPass) return outL;
            if (chapter == "ch6" && !done.ContainsKey("night:t2"))
            {
                outL.Add(Item("evening", "night", "t2", "夜間飛行：場周経路（t2）", "apron", "instructor"));
                return outL;
            }
            return CheckItems(state, C, S.Check, W2, outL, false);
        }

        static List<Dict> Fo2Of(Dict state)
        {
            // mirrors CareerLogic's fo2Schedule (kept private there); re-implemented via public pieces
            if (Js.Num(state, "fatigue") >= 65)
            {
                var rest = Item("am", "off", "rest", "疲労のため乗務できません（休息）", null, null);
                rest["reason"] = "rest";
                return new List<Dict> { rest };
            }
            var fo = Js.Obj(Js.Get(state, "fo"));
            if (CareerLogic.FoLineCheckReady(fo))
            {
                var it = new Dict { { "slot", "am" }, { "kind", "linecheck" }, { "id", "linecheck" }, { "route", "HND-KMQ" }, { "blockMin", 65.0 }, { "role", "PF" }, { "captain", "examiner" }, { "title", "ラインチェック（定期審査）：羽田―小松（PF）" }, { "where", "haneda" }, { "who", "examiner" } };
                return new List<Dict> { it };
            }
            var item = CareerLogic.FoRosterItem(state, (int)Js.Num(state, "day"));
            return new List<Dict> { item };
        }
    }

    // the store the game keeps the save in (localStorage's shape)
    public interface ICareerStore { string GetItem(string key); void SetItem(string key, string value); }
    public class MemoryStore : ICareerStore
    {
        public readonly Dictionary<string, string> Map = new Dictionary<string, string>();
        public string GetItem(string key) { string v; return Map.TryGetValue(key, out v) ? v : null; }
        public void SetItem(string key, string value) { Map[key] = value; }
    }

    // createCareer's port: the career with its save
    public class Career
    {
        Dict st;
        readonly ICareerStore store;
        public Career(ICareerStore store = null, uint? seed = null)
        {
            this.store = store;
            st = Read() ?? CareerLogic.NewCareer(seed ?? (uint)new Random().Next(0, int.MaxValue));
        }
        Dict Read()
        {
            try
            {
                var raw = store == null ? null : store.GetItem(CareerData.CAREER_KEY);
                return raw == null ? null : CareerLogic.CleanCareer(MiniJson.Parse(raw));
            }
            catch { return null; }
        }
        public bool Save()
        {
            if (store == null) return false;
            store.SetItem(CareerData.CAREER_KEY, MiniJson.Stringify(st));
            return true;
        }
        public Dict State { get { return st; } }
        public int Day { get { return (int)Js.Num(st, "day"); } }
        public string Slot { get { return Js.Str(st, "slot"); } }
        public string Chapter { get { return Js.Str(st, "chapter"); } }
        public double Hours { get { return CareerData.SLOT_HOURS[Slot]; } }
        public string Date() { return CareerLogic.DateText(Day); }
        public Dict AbilitiesCopy()
        {
            var a = Js.Obj(Js.Get(st, "abilities")); var c = new Dict();
            foreach (var kv in a) c[kv.Key] = kv.Value;
            return c;
        }
        double ApplyGrow(string axis, double b, string key)
        {
            var ab = Js.Obj(Js.Get(st, "abilities"));
            if (Array.IndexOf(CareerData.ABILITIES, axis) < 0 || !(b > 0)) return Js.Num(ab, axis);
            var growth = Js.Obj(Js.Get(st, "growth"));
            double rep = 0;
            bool keyed = key != null && CareerData.ATTEMPT_ID.IsMatch(key);
            if (keyed) rep = Js.Num(growth, key);
            double f = rep == 0 ? 1 : rep == 1 ? 0.5 : 0.25;
            ab[axis] = Js.Clamp(Js.Num(ab, axis) + b * (1 - Js.Num(ab, axis) / 130) * f, 0, 100);
            if (keyed) growth[key] = rep + 1;
            return Js.Num(ab, axis);
        }
        public double Grow(string axis, double b, string key = null) { double v = ApplyGrow(axis, b, key); Save(); return v; }
        public Dict FirstTry(bool pass)
        {
            var ft = Js.Obj(Js.Get(st, "firstTry"));
            ft["total"] = Js.Num(ft, "total") + 1;
            if (pass) ft["pass"] = Js.Num(ft, "pass") + 1;
            Save();
            return new Dict { { "pass", Js.Num(ft, "pass") }, { "total", Js.Num(ft, "total") } };
        }
        public Dict Weather(Prog prog = null)
        {
            var o = CareerSchedule.DayOpts(st, prog);
            return CareerLogic.WeatherFor2(CareerLogic.WeatherFor((uint)Js.Num(st, "seed"), Day, o.ifr, o.bustOk, o.force), Chapter, "flight");
        }
        public Dict FlyingWeather(Prog prog = null, string kind = "flight")
        {
            // forcedWeather only (dayOpts without the bust rule)
            var f = ForcedOf(prog);
            return CareerLogic.WeatherFor2(CareerLogic.WeatherFor((uint)Js.Num(st, "seed"), Day, f.ifr, false, f.force), Chapter, kind);
        }
        (string force, bool ifr) ForcedOf(Prog prog)
        {
            // DayOpts minus bustOk: recompute forcedWeather through a tiny shim — ch4 ifr and forces
            // are exactly DayOpts' force/ifr fields.
            var o = CareerSchedule.DayOpts(st, prog);
            return (o.force, o.ifr);
        }
        public List<Dict> Schedule(Prog prog = null, double trust = 50, Dict weather = null)
        {
            return CareerSchedule.Schedule(st, prog, trust, weather ?? Weather(prog));
        }
        public List<string> Gate(Prog prog = null, double trust = 50) { return CareerLogic.Gate(st, prog, trust); }
        public void Done(string kind, string id) { Js.Obj(Js.Get(st, "done"))[$"{kind}:{id}"] = (double)Day; Save(); }
        public bool IsDone(string kind, string id) { return Js.Obj(Js.Get(st, "done")).ContainsKey($"{kind}:{id}"); }
        public bool DoneToday(string kind, string id) { object v; return Js.Obj(Js.Get(st, "done")).TryGetValue($"{kind}:{id}", out v) && v is double && (double)v == Day; }
        public Dict Exam(string id, double pct, bool? passed = null)
        {
            CareerData.ExamDef E;
            if (!CareerData.EXAMS.TryGetValue(id, out E)) return null;
            bool ok = passed.HasValue ? passed.Value : pct >= E.Pass;
            var exams = Js.Obj(Js.Get(st, "exams"));
            var r = Js.Obj(Js.Get(exams, id)) ?? new Dict { { "tries", 0.0 }, { "best", 0.0 }, { "pass", false } };
            r["tries"] = Js.Num(r, "tries") + 1;
            r["best"] = Math.Max(Js.Num(r, "best"), Js.Round(pct));
            if (ok) r["pass"] = true;
            exams[id] = r;
            Js.Obj(Js.Get(st, "done"))[$"exam:{id}"] = (double)Day;
            Js.Obj(Js.Get(st, "examDay"))[id] = (double)Day;
            st["fatigue"] = Js.Clamp(Js.Num(st, "fatigue") + 8, 0, 100);
            ApplyGrow("know", ok ? 4.0 : 1.2, $"exam:{id}");
            Save();
            return r;
        }
        public bool ExamReady(string id)
        {
            if (!CareerData.EXAMS.ContainsKey(id)) return false;
            object v; var ed = Js.Obj(Js.Get(st, "examDay"));
            return !(ed.TryGetValue(id, out v) && v is double && (double)v == Day);
        }
        public bool Drill()
        {
            var dr = Js.Obj(Js.Get(st, "drills"));
            if (Js.Num(dr, "day") != Day) st["drills"] = dr = new Dict { { "day", (double)Day }, { "n", 0.0 } };
            if (Js.Num(dr, "n") >= 2) { Save(); return false; }
            dr["n"] = Js.Num(dr, "n") + 1;
            ApplyGrow("judge", 1.0, $"drill:{Day}:{(long)Js.Num(dr, "n")}");
            Save();
            return true;
        }
        public int DrillsLeft()
        {
            var dr = Js.Obj(Js.Get(st, "drills"));
            return Js.Num(dr, "day") == Day ? Math.Max(0, 2 - (int)Js.Num(dr, "n")) : 2;
        }
        public void NoteMiss(string key, string label)
        {
            if (key != null && CareerData.MISS_KEY.IsMatch(key) && label != null && label.Length >= 1 && label.Length <= 80)
            { st["miss"] = new Dict { { "day", (double)Day }, { "key", key }, { "label", label } }; Save(); }
        }
        public void ClearMiss() { if (Js.Get(st, "miss") != null) { st["miss"] = null; Save(); } }
        public bool Decision(string choice, Dict weather)
        {
            bool right = choice == Js.Str(weather, "decision");
            var dec = (List<object>)Js.Get(st, "decisions");
            dec.Add(new Dict { { "day", (double)Day }, { "choice", choice }, { "right", right } });
            ApplyGrow("judge", right ? 1.8 : 0.5, $"decision:{Day}");
            Save();
            return right;
        }
        public Dict DecidedToday()
        {
            foreach (var d0 in (List<object>)Js.Get(st, "decisions")) { var d = Js.Obj(d0); if (d != null && Js.Num(d, "day") == Day) return d; }
            return null;
        }
        public bool AdvanceChapter(Prog prog = null, double trust = 50)
        {
            if (CareerLogic.Gate(st, prog, trust).Count > 0) return false;
            string ch = Chapter;
            if (ch == "prologue") st["chapter"] = "ch1";
            else if (ch == "ch1") st["chapter"] = "ch2";
            else if (ch == "ch2") { if (Js.Get(st, "solo") == null) return false; st["chapter"] = "ch3"; }
            else if (Array.IndexOf(CareerData.LATER, ch) >= 0 && ch != "ch6") st["chapter"] = CareerData.LATER[Array.IndexOf(CareerData.LATER, ch) + 1];
            else return false;
            Save();
            return true;
        }
        public void FinishPrologue() { Js.Obj(Js.Get(st, "done"))["prologue"] = (double)Day; Save(); }
        public void HeardSection(string id, string how)
        {
            if (id == null || !CareerData.SEC_ID.IsMatch(id) || (how != "f" && how != "q")) return;
            var heard = Js.Obj(Js.Get(st, "heard"));
            if (Js.Str(heard, id) != "f") heard[id] = how;
            Save();
        }
        public HashSet<string> HeardSet() { return CareerLogic.HeardSet(st); }
        public void SetPace(string p) { if (Array.IndexOf(CareerData.PACE_IDS, p) >= 0) { st["lastPace"] = p; Save(); } }
        public void WalkedInto(string room)
        {
            var wk = (List<object>)Js.Get(st, "walked");
            if (room != null && Regex.IsMatch(room, "^[a-z0-9-]{1,16}$") && !wk.Contains(room) && wk.Count < 40) { wk.Add(room); Save(); }
        }
        public int Attempt(string key)
        {
            if (key == null || !CareerData.ATTEMPT_ID.IsMatch(key)) return 0;
            var at = Js.Obj(Js.Get(st, "attempts"));
            int n = (int)Js.Num(at, key);
            at[key] = (double)(n + 1);
            Save();
            return n;
        }
        public int Tries(string key) { return (int)Js.Num(Js.Obj(Js.Get(st, "attempts")), key); }
        public void Answered(string id, bool right)
        {
            if (id == null || !CareerData.Q_ID.IsMatch(id)) return;
            var ans = Js.Obj(Js.Get(st, "answers"));
            object rv; List<object> r;
            if (ans.TryGetValue(id, out rv) && rv is List<object>) r = (List<object>)rv;
            else { r = new List<object> { 0.0, 0.0, 0.0, 0.0 }; ans[id] = r; }
            if (right) r[0] = (double)r[0] + 1; else r[1] = (double)r[1] + 1;
            r[2] = right ? 1.0 : 0.0;
            r[3] = (double)Day;
            if (ans.Count > 400) { string first = null; foreach (var k in ans.Keys) { first = k; break; } if (first != null) ans.Remove(first); }
            Save();
        }
        public void SoloDone() { st["solo"] = new Dict { { "day", (double)Day } }; Save(); }
        public Dict Check(string id, bool pass)
        {
            var checks = Js.Obj(Js.Get(st, "checks"));
            var r = Js.Obj(Js.Get(checks, id)) ?? new Dict { { "tries", 0.0 }, { "pass", false }, { "day", 0.0 } };
            r["tries"] = Js.Num(r, "tries") + 1;
            if (pass) { r["pass"] = true; r["day"] = (double)Day; }
            checks[id] = r;
            Js.Obj(Js.Get(st, "done"))[$"{CareerData.CHECKS[id].Kind}:{id}"] = (double)Day;
            if (id == "typerate" && pass && Chapter == "fo1") st["chapter"] = "fo2";
            Save();
            return r;
        }
        public void Graduate(Prog prog)
        {
            var g = CareerLogic.GraduationRank(st, prog);
            var grad = new Dict { { "day", (double)Day } };
            foreach (var kv in g) grad[kv.Key] = kv.Value;
            st["graduated"] = grad;
            Js.Obj(Js.Get(st, "done"))["graduation:grad"] = (double)Day;
            Save();
        }
        public bool BeginEndorsement()
        {
            if (Js.Get(st, "graduated") == null || Chapter != "ch6") return false;
            st["chapter"] = "ch7"; Save(); return true;
        }
        public bool BeginFirstOfficer()
        {
            var fo0 = Js.Obj(Js.Get(st, "fo"));
            if (Js.Get(st, "graduated") == null || !(Chapter == "ch6" || Chapter == "ch7")) return false;
            if (fo0 != null && Js.Bool(fo0, "hired")) return false;
            st["chapter"] = "fo1";
            var fo = CareerLogic.FoDefault(); fo["hired"] = true;
            st["fo"] = fo;
            Save();
            return true;
        }
        public bool LineCheckReady() { return CareerLogic.FoLineCheckReady(Js.Obj(Js.Get(st, "fo"))); }
        public Dict RecordLeg(string route = null, string role = "PF", double? blockMin = null, double? score = null, double? captainEval = null, bool diverted = false)
        {
            var fo = Js.Obj(Js.Get(st, "fo"));
            if (fo == null) { fo = CareerLogic.FoDefault(); st["fo"] = fo; }
            CareerData.RouteDef R = null;
            foreach (var r in CareerData.FO_ROUTES) if (r.Id == route) R = r;
            fo["sectors"] = Js.Num(fo, "sectors") + 1;
            fo["blockMin"] = Js.Num(fo, "blockMin") + (blockMin.HasValue && blockMin.Value >= 0 ? Js.Round(blockMin.Value) : R != null ? R.BlockMin : 0);
            double? ev = captainEval.HasValue ? captainEval : score;
            if (ev.HasValue) { fo["evalSum"] = Js.Num(fo, "evalSum") + ev.Value; fo["evalN"] = Js.Num(fo, "evalN") + 1; }
            st["fatigue"] = Js.Clamp(Js.Num(st, "fatigue") + 26, 0, 100);
            double n = Js.Num(fo, "sectors");
            if (role == "PM") { ApplyGrow("comm", 1.6, $"line:comm{(long)n}"); ApplyGrow("know", 0.8, $"line:know{(long)n}"); }
            else { ApplyGrow("hand", 1.2, $"line:hand{(long)n}"); ApplyGrow("judge", 1.2, $"line:judge{(long)n}"); }
            Save();
            return new Dict
            {
                { "sectors", Js.Num(fo, "sectors") }, { "blockMin", Js.Num(fo, "blockMin") },
                { "evalAvg", Js.Num(fo, "evalN") != 0 ? (object)(Js.Round(Js.Num(fo, "evalSum") / Js.Num(fo, "evalN") * 10) / 10) : null },
                { "evalN", Js.Num(fo, "evalN") }, { "diverted", diverted }, { "fatigue", Js.Num(st, "fatigue") },
                { "lineCheckReady", CareerLogic.FoLineCheckReady(fo) }, { "done", Js.Bool(fo, "done") },
            };
        }
        public Dict RecordLineCheck(bool pass)
        {
            var fo = Js.Obj(Js.Get(st, "fo"));
            if (fo == null) { fo = CareerLogic.FoDefault(); st["fo"] = fo; }
            fo["lineCheck"] = pass ? "pass" : "fail";
            if (pass) { fo["done"] = true; fo["failSectors"] = null; }
            else fo["failSectors"] = Js.Num(fo, "sectors");
            Save();
            return new Dict { { "pass", pass }, { "done", Js.Bool(fo, "done") }, { "lineCheck", Js.Str(fo, "lineCheck") }, { "sectors", Js.Num(fo, "sectors") }, { "blockMin", Js.Num(fo, "blockMin") }, { "lineCheckReady", CareerLogic.FoLineCheckReady(fo) } };
        }
        public Dict Aloft(Prog prog = null)
        {
            var al = Js.Obj(Js.Get(st, "aloft"));
            if (al == null || Js.Num(al, "day") != Day)
            {
                var w = CareerLogic.WindsAloftFor(Weather(prog));
                var na = new Dict { { "day", (double)Day } };
                foreach (var kv in w) na[kv.Key] = kv.Value;
                st["aloft"] = na; al = na; Save();
            }
            var copy = new Dict(); foreach (var kv in al) copy[kv.Key] = kv.Value;
            return copy;
        }
        public bool Advance(string to = null)
        {
            var slots = CareerData.SLOTS;
            int i = Array.IndexOf(slots, Slot);
            int j = to != null ? Array.IndexOf(slots, to) : i + 1;
            if (j > i && j < slots.Length) { st["slot"] = slots[j]; Save(); return true; }
            return false;
        }
        public void Tire(double n) { st["fatigue"] = Js.Clamp(Js.Num(st, "fatigue") + n, 0, 100); Save(); }
        public Dict Sleep(bool late = false)
        {
            st["fatigue"] = Js.Clamp(Js.Num(st, "fatigue") - (late ? 15 : 50) + (late ? 10 : 0), 0, 100);
            st["day"] = (double)(Day + 1);
            st["slot"] = "morning";
            Save();
            return new Dict { { "day", (double)Day }, { "date", Date() }, { "off", CareerLogic.IsOff(Day) } };
        }
        public bool Tired() { return Js.Num(st, "fatigue") >= 65; }
        public Dict Reset(uint? seed = null)
        {
            st = CareerLogic.NewCareer(seed ?? (uint)new Random().Next(0, int.MaxValue));
            Save();
            return st;
        }
        public bool Load(object o)
        {
            var c = CareerLogic.CleanCareer(o);
            if (c == null) return false;
            st = c; Save(); return true;
        }
    }
}
