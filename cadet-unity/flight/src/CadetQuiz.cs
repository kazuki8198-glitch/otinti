// CadetQuiz.cs — the written-test / training-device question machinery,
// ported from content/school.js (examDialogs' draw, examScoreOf, ftdDialogs'
// k2/k3/k5/k6 generators, classDrill) and flight-lab/src/radio.js (the SAY
// helpers and DRILLS/LISTEN generators). Pure logic: data in, questions out.
// The draw uses the career's mulberry (Js.Rng) with the original seeds, so a
// given career seed + day + attempt draws the same paper as the HTML game.
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public class QuizQ
    {
        public string Id, Q, Why, Say;
        public string WhyFix;   // listen generators: the right option's text, before de-duplication
        public List<string> Opts = new List<string>();
        public int Ok;
    }

    public static class QuizData
    {
        public class Bank { public string Id, Title; public List<Lst> Qs = new List<Lst>(); }
        public static readonly List<Bank> Banks = new List<Bank>();
        public static readonly Dictionary<string, Bank> BankById = new Dictionary<string, Bank>();
        // bank -> per-question answer sections (null entry = no map / no sections)
        public static readonly Dictionary<string, List<List<string>>> BankAnswers = new Dictionary<string, List<List<string>>>();
        public static readonly Dictionary<string, List<string>> DrillAnswers = new Dictionary<string, List<string>>();
        public static readonly Dictionary<string, List<string>> ListenAnswers = new Dictionary<string, List<string>>();
        public static readonly Dictionary<string, List<string>> SceneAnswers = new Dictionary<string, List<string>>();
        public static readonly List<Dict> Scenes = new List<Dict>();
        public static readonly Dictionary<string, string> ChapterN = new Dictionary<string, string>();   // chapter id -> its number ("第 n 章")
        public static readonly Dictionary<string, string> SecChapter = new Dictionary<string, string>(); // section id -> chapter id
        public static bool Loaded;

        static List<string> SecList(object a)
        {
            if (!(a is Lst)) return null;
            var outL = new List<string>();
            foreach (var p in (Lst)a) if (p is Lst && ((Lst)p).Count > 0 && ((Lst)p)[0] is string) outL.Add((string)((Lst)p)[0]);
            return outL;
        }

        public static void Load(string quizJson, string answerMapJson, string sceneAnswersJson, string radioJson, string gamebookJson)
        {
            if (Loaded) return;
            var quiz = (Dict)MiniJson.Parse(quizJson);
            foreach (var bo in (Lst)quiz["BANKS"])
            {
                var bd = (Dict)bo;
                var b = new Bank { Id = Js.Str(bd, "id"), Title = Js.Str(bd, "title") };
                foreach (var q in (Lst)bd["qs"]) b.Qs.Add((Lst)q);
                Banks.Add(b); BankById[b.Id] = b;
            }
            var am = (Dict)MiniJson.Parse(answerMapJson);
            foreach (var kv in (Dict)am["BANK_ANSWERS"])
            {
                var list = new List<List<string>>();
                foreach (var e in (Lst)kv.Value) list.Add(e is Dict ? SecList(Js.Get((Dict)e, "a")) : null);
                BankAnswers[kv.Key] = list;
            }
            foreach (var kv in (Dict)am["DRILL_ANSWERS"]) DrillAnswers[kv.Key] = SecList(kv.Value) ?? new List<string>();
            foreach (var kv in (Dict)am["LISTEN_ANSWERS"]) ListenAnswers[kv.Key] = SecList(kv.Value) ?? new List<string>();
            var sa = (Dict)MiniJson.Parse(sceneAnswersJson);
            foreach (var kv in (Dict)sa["SCENE_ANSWERS"]) if (kv.Value != null) SceneAnswers[kv.Key] = SecList(kv.Value) ?? new List<string>();
            foreach (var kv in (Dict)sa["LISTEN_ANSWERS"]) if (!ListenAnswers.ContainsKey(kv.Key)) ListenAnswers[kv.Key] = SecList(kv.Value) ?? new List<string>();
            var radio = (Dict)MiniJson.Parse(radioJson);
            foreach (var so in (Lst)radio["SCENES"]) Scenes.Add((Dict)so);
            var gb = (Dict)MiniJson.Parse(gamebookJson);
            foreach (var co in (Lst)gb["chapters"])
            {
                var cd = (Dict)co;
                string cid = Js.Str(cd, "id");
                ChapterN[cid] = Js.Str(cd, "n");
                foreach (var so in (Lst)cd["sections"]) SecChapter[Js.Str((Dict)so, "id")] = cid;
            }
            Loaded = true;
        }

        public static bool AllHeard(List<string> answer, HashSet<string> known)
        {
            if (answer == null) return false;
            foreach (var s in answer) if (s != "k1" && (known == null || !known.Contains(s))) return false;
            return true;
        }
    }

    /// <summary>flight-lab radio.js's number-saying helpers, verbatim ports.</summary>
    public static class Say
    {
        static readonly string[] DIGW = { "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "niner" };
        static readonly string[] ONES = { "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen" };
        static readonly string[] TENS = { "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety" };
        public struct AlphaEnt { public string L, W, P; public AlphaEnt(string l, string w, string p) { L = l; W = w; P = p; } }
        public static readonly AlphaEnt[] ALPHA =
        {
            new AlphaEnt("A","Alfa","AL-FAH"),new AlphaEnt("B","Bravo","BRAH-VOH"),new AlphaEnt("C","Charlie","CHAR-LEE"),new AlphaEnt("D","Delta","DELL-TAH"),new AlphaEnt("E","Echo","ECK-OH"),new AlphaEnt("F","Foxtrot","FOKS-TROT"),new AlphaEnt("G","Golf","GOLF"),new AlphaEnt("H","Hotel","HOH-TEL"),new AlphaEnt("I","India","IN-DEE-AH"),new AlphaEnt("J","Juliett","JEW-LEE-ETT"),new AlphaEnt("K","Kilo","KEY-LOH"),new AlphaEnt("L","Lima","LEE-MAH"),new AlphaEnt("M","Mike","MIKE"),new AlphaEnt("N","November","NO-VEM-BER"),new AlphaEnt("O","Oscar","OSS-CAH"),new AlphaEnt("P","Papa","PAH-PAH"),new AlphaEnt("Q","Quebec","KEH-BECK"),new AlphaEnt("R","Romeo","ROW-ME-OH"),new AlphaEnt("S","Sierra","SEE-AIR-RAH"),new AlphaEnt("T","Tango","TANG-GO"),new AlphaEnt("U","Uniform","YOU-NEE-FORM"),new AlphaEnt("V","Victor","VIK-TAH"),new AlphaEnt("W","Whiskey","WISS-KEY"),new AlphaEnt("X","Xray","ECKS-RAY"),new AlphaEnt("Y","Yankee","YANG-KEY"),new AlphaEnt("Z","Zulu","ZOO-LOO"),
        };
        public const string CS = "Archer Seven Lima Alpha";
        public const string CSS = "Archer 7LA";

        public static string Pad(object v, int n)
        {
            string s = v is double ? ((long)Math.Round((double)v)).ToString() : Convert.ToString(v, System.Globalization.CultureInfo.InvariantCulture);
            return s.PadLeft(n, '0');
        }
        public static string Digits(object s)
        {
            var parts = new List<string>();
            foreach (char c in Convert.ToString(s, System.Globalization.CultureInfo.InvariantCulture))
            {
                if (c >= '0' && c <= '9') parts.Add(DIGW[c - '0']);
                else if (c == '.') parts.Add("point");
            }
            return string.Join(" ", parts);
        }
        public static string Words(double nv)
        {
            long n = (long)Math.Round(nv);
            if (n < 20) return ONES[n];
            if (n < 100) return TENS[n / 10] + (n % 10 != 0 ? "-" + ONES[n % 10] : "");
            if (n < 1000) return ONES[n / 100] + " hundred" + (n % 100 != 0 ? " " + Words(n % 100) : "");
            return Words(n / 1000) + " thousand" + (n % 1000 != 0 ? " " + Words(n % 1000) : "");
        }
        public static string Altitude(double ft)
        {
            ft = Math.Round(ft / 100) * 100;
            if (ft >= 18000) return "flight level " + Digits(Pad(ft / 100, 3));
            double th = Math.Floor(ft / 1000), hu = Math.Round((ft % 1000) / 100);
            var outL = new List<string>();
            if (th != 0) outL.Add(Digits(th) + " thousand");
            if (hu != 0) outL.Add(DIGW[(int)hu] + " hundred");
            return outL.Count > 0 ? string.Join(" ", outL) : "zero";
        }
        public static string Heading(double d)
        {
            double m = ((Math.Round(d) % 360) + 360) % 360; if (m == 0) m = 360;
            return "heading " + Digits(Pad(m, 3));
        }
        public static string Speed(double kt) { return Digits(Math.Round(kt)) + " knots"; }
        public static string Freq(object f) { return Digits(f); }
        public static string Altimeter(object s) { return "altimeter " + Digits(Convert.ToString(s, System.Globalization.CultureInfo.InvariantCulture).Replace(".", "")); }
        public static string Squawk(object c) { return "squawk " + Digits(Pad(c, 4)); }
        public static string Runway(string r)
        {
            var m = Regex.Match((r ?? "").ToUpperInvariant(), @"^0?(\d{1,2})([LRC]?)$");
            if (!m.Success) return "runway " + r;
            string suf = m.Groups[2].Value == "L" ? " left" : m.Groups[2].Value == "R" ? " right" : m.Groups[2].Value == "C" ? " center" : "";
            return "runway " + Digits(m.Groups[1].Value) + suf;
        }
        public static string Wind(double dir, double kt) { return kt < 3 ? "wind calm" : $"wind {Digits(Pad(dir, 3))} at {Digits(Math.Round(kt))}"; }
        public static string TimeSay(object hhmm) { return Digits(Pad(hhmm, 4)) + " Zulu"; }
        public static string Spell(string s)
        {
            var parts = new List<string>();
            foreach (char c in (s ?? "").ToUpperInvariant())
            {
                if (c >= '0' && c <= '9') parts.Add(DIGW[c - '0']);
                else { string w = null; foreach (var a in ALPHA) if (a.L == c.ToString()) { w = a.W; break; } parts.Add(w ?? c.ToString()); }
            }
            return string.Join(" ", parts);
        }
        public static string Cap(string s) { return string.IsNullOrEmpty(s) ? s : char.ToUpperInvariant(s[0]) + s.Substring(1); }
        public static T Pick<T>(Func<double> r, IList<T> a) { return a[(int)Math.Floor(r() * a.Count) % a.Count]; }
        public static int Ri(Func<double> r, int a, int b) { return a + (int)Math.Floor(r() * (b - a + 1)); }
        public static List<T> Shuffled<T>(IList<T> a, Func<double> r)
        {
            var b = new List<T>(a);
            for (int i = b.Count - 1; i > 0; i--) { int j = (int)Math.Floor(r() * (i + 1)); (b[i], b[j]) = (b[j], b[i]); }
            return b;
        }
        public static List<string> Four(Func<double> r, string ok, List<string> wrong, List<string> spare = null)
        {
            var outL = new List<string> { ok };
            var all = new List<string>(); if (wrong != null) all.AddRange(wrong); if (spare != null) all.AddRange(spare);
            foreach (var w in all) { if (outL.Count >= 4) break; if (!string.IsNullOrEmpty(w) && !outL.Contains(w)) outL.Add(w); }
            return Shuffled(outL, r);
        }
        // dialog/atc.js ourCall: FLIGHT LAB's call sign -> today's aircraft (pa28 default)
        public static string OurCall(string s)
        {
            if (s == null) return s;
            return s.Replace("Archer Seven Lima Alpha", "Archer Seven Three Eight Sierra Yankee")
                    .Replace("Seminole Seven Lima Alpha", "Seminole Seven Three Eight Sierra Yankee")
                    .Replace("Archer 7LA", "Archer 8SY").Replace("Seminole 7LA", "Seminole 8SY")
                    .Replace("…Seven Lima…", "…Eight Sierra…");
        }
        public static string RefsIn(string t)
        {
            if (t == null) return t;
            return Regex.Replace(t, @"\{ch:([a-z0-9]+)\}", m => QuizData.ChapterN.TryGetValue(m.Groups[1].Value, out var n) ? $"第 {n} 章" : "教科書");
        }
        public static string Fx(string t) { return OurCall(RefsIn(t)); }
    }

    public static class ExamDraw
    {
        static QuizQ FromBank(Lst raw, Func<double> r, string id)
        {
            string text = (string)raw[0];
            var optsRaw = (Lst)raw[1];
            int okIdx = (int)(double)raw[2];
            string why = raw.Count > 3 ? (string)raw[3] : "";
            var mapped = new List<(string T, bool Ok)>();
            for (int j = 0; j < optsRaw.Count; j++) mapped.Add((Say.Fx((string)optsRaw[j]), j == okIdx));
            var sh = Say.Shuffled(mapped, r);
            var q = new QuizQ { Id = id, Q = Say.Fx(text), Why = Say.Fx(why) };
            foreach (var o in sh) q.Opts.Add(o.T);
            q.Ok = sh.FindIndex(x => x.Ok);
            return q;
        }

        static List<T> PickN<T>(List<T> a, int n, Func<double> r) { var s = Say.Shuffled(a, r); return s.GetRange(0, Math.Min(n, s.Count)); }

        /// <summary>school.js examDialogs' draw (the warm-up is the caller's
        /// documented omission). seed = careerSeed + day; heard only for written1.</summary>
        public static List<QuizQ> Draw(string examId, double seed, int attempt, HashSet<string> heard)
        {
            var E = CareerData.EXAMS[examId];
            var r = Js.Rng((uint)(seed * 17 + examId.Length + attempt * 7919));
            HashSet<string> taught = null;
            if (examId == "written1" || heard != null)
            {
                taught = heard ?? new HashSet<string>();
                if (heard == null) foreach (var cls in CareerLogic.ClassSections) foreach (var s in cls) taught.Add(s);
            }
            bool Usable(string b, int k)
            {
                if (taught == null) return true;
                if (!QuizData.BankAnswers.TryGetValue(b, out var m)) return heard == null;
                if (k >= m.Count) return false;
                var a = m[k];
                return a != null && QuizData.AllHeard(a, taught);
            }
            int per = (int)Math.Ceiling((double)E.N / E.Banks.Length);
            var pool = new List<(Lst Raw, string Id)>();
            foreach (var b in E.Banks)
            {
                if (!QuizData.BankById.TryGetValue(b, out var bank)) continue;
                var all = new List<(Lst Raw, string Id)>();
                for (int k = 0; k < bank.Qs.Count; k++) if (Usable(b, k)) all.Add((bank.Qs[k], $"{b}#{k}"));
                pool.AddRange(PickN(all, per, r));
            }
            var picked = PickN(pool, E.N, r);
            var outL = new List<QuizQ>();
            foreach (var p in picked) outL.Add(FromBank(p.Raw, r, p.Id));
            return outL;
        }

        /// <summary>school.js examScoreOf: overall pct, per-bank pct, the 60%
        /// bank floor, pass = pct >= the exam's line and no weak bank.</summary>
        public static (int Pct, bool Pass, Dictionary<string, (int Right, int N, int Pct)> Banks, List<string> Weak) Score(string examId, List<QuizQ> qs, List<bool> rights)
        {
            var per = new Dictionary<string, (int Right, int N)>();
            int right = 0;
            for (int k = 0; k < qs.Count; k++)
            {
                string b = (qs[k].Id ?? "?").Split('#')[0];
                if (!per.TryGetValue(b, out var e)) e = (0, 0);
                e.N++; if (k < rights.Count && rights[k]) { e.Right++; right++; }
                per[b] = e;
            }
            var banks = new Dictionary<string, (int, int, int)>();
            var weak = new List<string>();
            foreach (var kv in per)
            {
                int pct = kv.Value.N > 0 ? (int)Math.Round(100.0 * kv.Value.Right / kv.Value.N) : 0;
                banks[kv.Key] = (kv.Value.Right, kv.Value.N, pct);
                if (pct < 60) weak.Add(kv.Key);
            }
            int total = qs.Count > 0 ? (int)Math.Round(100.0 * right / qs.Count) : 0;
            bool pass = total >= CareerData.EXAMS[examId].Pass && weak.Count == 0;
            return (total, pass, banks, weak);
        }

        /// <summary>school.js classDrill: 5 questions from the pool whose home
        /// chapter is one of the class's chapters and whose answer sections are
        /// all known (heard + this class's own sections). NOTE questions are not
        /// in the pool here (the port's pool is the bank questions only).</summary>
        public static List<QuizQ> ClassDrill(int classIdx, HashSet<string> heard, double seed, int attempt)
        {
            var rr = Js.Rng((uint)(seed * 37 + classIdx + attempt * 7919));
            var known = new HashSet<string>(heard ?? new HashSet<string>());
            foreach (var s in CareerLogic.ClassSections[classIdx]) known.Add(s);
            var chs = new HashSet<string>(CareerData.CLASSES[classIdx]);
            var fits = new List<(Lst Raw, string Id)>();
            foreach (var kv in QuizData.BankAnswers)
            {
                if (!QuizData.BankById.TryGetValue(kv.Key, out var bank)) continue;
                for (int k = 0; k < kv.Value.Count; k++)
                {
                    var a = kv.Value[k];
                    if (a == null || a.Count == 0 || k >= bank.Qs.Count) continue;
                    string home = a[0];
                    string ch = QuizData.SecChapter.TryGetValue(home, out var c) ? c : null;
                    if (ch == null || !chs.Contains(ch)) continue;
                    if (!QuizData.AllHeard(a, known)) continue;
                    fits.Add((bank.Qs[k], $"{kv.Key}#{k}"));
                }
            }
            var drawn = Say.Shuffled(fits, rr);
            var outL = new List<QuizQ>();
            for (int i = 0; i < Math.Min(5, drawn.Count); i++) outL.Add(FromBank(drawn[i].Raw, rr, drawn[i].Id));
            return outL;
        }
    }

    /// <summary>ftdDialogs' question generators for k2/k3/k5/k6.</summary>
    public static class FtdGen
    {
        public class Pic { public double Ias, Alt, Hdg, Vs, Bank; }

        // school.js pfdPictures(seed, 10): r = rng(seed*7+2)
        public static List<Pic> PfdPictures(double seed, int n = 10)
        {
            var r = Js.Rng((uint)(seed * 7 + 2));
            var outL = new List<Pic>();
            for (int i = 0; i < n; i++)
                outL.Add(new Pic { Ias = 70 + Math.Round(r() * 12) * 5, Alt = 1500 + Math.Round(r() * 25) * 100, Hdg = Math.Round(r() * 35) * 10 + 10, Vs = (Math.Round(r() * 8) - 4) * 250, Bank = (Math.Round(r() * 4) - 2) * 10 });
            return outL;
        }

        static readonly string[] DIRS = { "北", "北東", "東", "南東", "南", "南西", "西", "北西" };
        // school.js readQuestion(p, k, r)
        public static QuizQ ReadQuestion(Pic p, int k, Func<double> r)
        {
            string kind = new[] { "ias", "alt", "hdg", "vs", "bank" }[k % 5];
            double v = kind == "ias" ? p.Ias : kind == "alt" ? p.Alt : kind == "hdg" ? p.Hdg : kind == "vs" ? p.Vs : p.Bank;
            string Fmt(double x)
            {
                switch (kind)
                {
                    case "ias": return $"{x} kt";
                    case "alt": return $"{x:#,0} ft";
                    case "hdg": return $"{Say.Pad(x, 3)}°";
                    case "vs": return x == 0 ? "0 fpm（水平）" : $"{(x > 0 ? "+" : "")}{x} fpm";
                    default: return x == 0 ? "水平（0°）" : $"{(x < 0 ? "左" : "右")}に {Math.Abs(x)}°";
                }
            }
            double step = kind == "ias" ? 5 : kind == "alt" ? 100 : kind == "hdg" ? 10 : kind == "vs" ? 250 : 10;
            double Norm(double x) { return kind == "hdg" ? (((x % 360) + 360) % 360 == 0 ? 360 : ((x % 360) + 360) % 360) : x; }
            var seen = new HashSet<double> { v };
            var wrong = new List<double>();
            double[] ds = kind == "hdg" ? new[] { 180.0, 1, -1, 2, -2 } : kind == "bank" ? new[] { -2 * Math.Sign(v != 0 ? v : 1) * Math.Abs(v != 0 ? v : 10) / 10, 1, -1, 2, -2 } : new[] { 1.0, -1, 10, 2, -2 };
            foreach (var d in ds)
            {
                double x = kind == "bank" && d == -2 * Math.Sign(v != 0 ? v : 1) * Math.Abs(v != 0 ? v : 10) / 10 ? (-v == 0 ? step : -v) : Norm(v + d * step);
                if (!seen.Contains(x) && (kind != "ias" || x > 40)) { seen.Add(x); wrong.Add(x); }
                if (wrong.Count == 3) break;
            }
            var mapped = new List<(string T, bool Ok)> { (Fmt(v), true) };
            foreach (var w in wrong) mapped.Add((Fmt(w), false));
            var sh = Say.Shuffled(mapped, r);
            var q = new QuizQ
            {
                Id = $"pfd:{kind}",
                Q = kind == "ias" ? "速度（左のテープ）は？" : kind == "alt" ? "高度（右のテープ）は？" : kind == "hdg" ? "機首の方位（下の HSI の上端）は？" : kind == "vs" ? "昇降率（右端の目盛り）は？" : "傾き（上の弧の三角）は？",
                Why = kind == "ias" ? "左の速度テープ、中央の黒い窓の数字を読みます。" : kind == "alt" ? "右の高度テープ、中央の窓の数字です。" : kind == "hdg" ? $"HSI の上端の窓の数字です（{DIRS[(int)Math.Round(v / 45) % 8]}向き）。" : kind == "vs" ? "高度テープの右の目盛りの針と数字。上は上昇、下は降下です。" : "姿勢表示の上の弧の目盛りと、白い三角のずれで読みます。",
            };
            foreach (var o in sh) q.Opts.Add(o.T);
            q.Ok = sh.FindIndex(x => x.Ok);
            return q;
        }

        static List<string> KindsCycle(Dictionary<string, List<string>> map, HashSet<string> heard, Func<double> r)
        {
            var ks = new List<string>();
            foreach (var kv in map) if (heard == null || QuizData.AllHeard(kv.Value, heard)) ks.Add(kv.Key);
            ks = Say.Shuffled(ks, r);
            var outL = new List<string>();
            if (ks.Count == 0) return outL;
            for (int i = 0; i < 10; i++) outL.Add(ks[i % ks.Count]);
            return outL;
        }

        // ftdDialogs' r = rng(seed*13 + k + attempt*7919), seed = careerSeed + day
        public static Func<double> FtdRng(double seed, int kNum, int attempt) { return Js.Rng((uint)(seed * 13 + kNum + attempt * 7919)); }

        public static List<QuizQ> K2(double seed, int attempt)
        {
            var r = FtdRng(seed, 2, attempt);
            var pics = PfdPictures(seed + attempt * 101);
            var outL = new List<QuizQ>();
            for (int i = 0; i < pics.Count; i++) outL.Add(ReadQuestion(pics[i], i, r));
            return outL;
        }

        public static List<QuizQ> K3(double seed, int attempt, HashSet<string> heard)
        {
            var r = FtdRng(seed, 3, attempt);
            var kinds = KindsCycle(QuizData.DrillAnswers, heard, r);
            var qs = new List<QuizQ>();
            foreach (var kind in kinds) qs.Add(Drills.Make(kind, r));
            qs = Say.Shuffled(qs, r);
            foreach (var q in qs) { q.Q = Say.Fx(q.Q); q.Why = Say.Fx(q.Why); if (q.Say != null) q.Say = Say.Fx(q.Say); for (int i = 0; i < q.Opts.Count; i++) q.Opts[i] = Say.Fx(q.Opts[i]); }
            return qs;
        }

        public static List<QuizQ> K5(double seed, int attempt, HashSet<string> heard)
        {
            var r = FtdRng(seed, 5, attempt);
            var fits = new List<Dict>();
            foreach (var sc in QuizData.Scenes)
            {
                string id = Js.Str(sc, "id");
                if (!QuizData.SceneAnswers.TryGetValue(id, out var a)) continue;
                if (heard != null && !QuizData.AllHeard(a, heard)) continue;
                fits.Add(sc);
            }
            var picked = Say.Shuffled(fits, r);
            if (picked.Count > 10) picked = picked.GetRange(0, 10);
            var outL = new List<QuizQ>();
            foreach (var sc in picked)
            {
                var optsRaw = (Lst)sc["options"];
                int ans = (int)(double)sc["answer"];
                var mapped = new List<(string T, bool Ok)>();
                for (int j = 0; j < optsRaw.Count; j++) mapped.Add((Say.Fx((string)optsRaw[j]), j == ans));
                var sh = Say.Shuffled(mapped, r);
                string atc = Js.Str(sc, "atc");
                var q = new QuizQ
                {
                    Id = $"scene:{Js.Str(sc, "id")}",
                    Q = $"{Js.Str(sc, "title")}：{Say.Fx(Js.Str(sc, "situation"))}{(string.IsNullOrEmpty(atc) ? "" : $"　聞こえた：“{Say.Fx(atc)}”")}　{Say.Fx(Js.Str(sc, "q"))}",
                    Why = Say.Fx(Js.Str(sc, "why")),
                    Say = string.IsNullOrEmpty(atc) ? null : Say.Fx(atc),
                };
                foreach (var o in sh) q.Opts.Add(o.T);
                q.Ok = sh.FindIndex(x => x.Ok);
                outL.Add(q);
            }
            return outL;
        }

        public static List<QuizQ> K6(double seed, int attempt, HashSet<string> heard)
        {
            var r = FtdRng(seed, 6, attempt);
            var kinds = KindsCycle(QuizData.ListenAnswers, heard, r);
            var qs = new List<QuizQ>();
            foreach (var kind in kinds)
            {
                var q = Listen.Make(kind, r);
                q.Opts = Say.Shuffled(new List<string>(new HashSet<string>(q.Opts)), r);
                q.Ok = q.Opts.IndexOf(q.WhyFix);
                qs.Add(q);
            }
            qs = Say.Shuffled(qs, r);
            foreach (var q in qs)
            {
                q.Id = $"listen:{q.Id}"; q.Q = $"（英語を聞いて）{Say.Fx(q.Q)}"; q.Why = Say.Fx(q.Why);
                for (int i = 0; i < q.Opts.Count; i++) q.Opts[i] = Say.Fx(q.Opts[i]);
                q.Say = q.Say != null ? Say.Fx(q.Say) : null;
            }
            return qs;
        }
    }

    /// <summary>radio.js DRILLS[kind].make(rng), ported kind by kind.</summary>
    public static class Drills
    {
        static QuizQ Q(string q, string ok, List<string> opts, string why, string say = null)
        {
            var qq = new QuizQ { Q = q, Why = why, Say = say ?? ok };
            qq.Opts.AddRange(opts); qq.Ok = opts.IndexOf(ok);
            return qq;
        }
        public static QuizQ Make(string kind, Func<double> r)
        {
            switch (kind)
            {
                case "alt":
                    {
                        double ft = Say.Pick(r, new[] { 500.0, 1200, 2500, 3500, 4500, 5500, 6500, 7000, 8500, 9500, 10000, 10500, 11500, 12000, 13500, 15500, 17500 });
                        string ok = Say.Altitude(ft);
                        double th = Math.Floor(ft / 1000), hu = (ft % 1000) / 100;
                        var opts = Say.Four(r, ok, new List<string> { Say.Digits(ft), th >= 10 ? $"{Say.Words(th)} thousand{(hu != 0 ? " " + Say.Words(hu) + " hundred" : "")}" : (hu != 0 ? $"{Say.Words(th * 10 + hu)} hundred" : $"{Say.Words(th)} zero zero zero"), $"flight level {Say.Digits(Say.Pad(ft / 100, 3))}" }, new List<string> { $"{Say.Digits(th)} thousand {Say.Digits(hu)}" });
                        return Q($"高度 {ft:#,0} ft の言い方は？", ok, opts, "18,000 ft 未満は、千の位までを 1 桁ずつ＋thousand、百の位＋hundred（AIM 4-2-8・4-2-9）。10,000 は one zero thousand。“forty-five hundred” のような言い方はしない。");
                    }
                case "fl":
                    {
                        double fl = Say.Pick(r, new[] { 180.0, 190, 230, 250, 270, 310, 350 });
                        string ok = Say.Altitude(fl * 100);
                        var opts = Say.Four(r, ok, new List<string> { $"{Say.Digits(fl / 10)} thousand", $"flight level {Say.Words(fl)}", $"{Say.Altitude(fl * 100).Replace("flight level ", "")} feet" });
                        return Q($"FL{fl} の言い方は？", ok, opts, "米国では 18,000 ft（FL180）以上は “flight level” ＋ 3 桁を 1 桁ずつ（AIM 4-2-9）。高度計は 29.92 に合わせて飛ぶ。");
                    }
                case "hdg":
                    {
                        double d = Say.Pick(r, new[] { 5.0, 20, 45, 90, 120, 155, 180, 210, 240, 270, 305, 330, 360 });
                        string ok = Say.Heading(d);
                        var opts = Say.Four(r, ok, new List<string> { $"heading {Say.Words(d)}", $"heading {Say.Digits(d)}", $"heading {ReverseWords(Say.Digits(Say.Pad(d, 3)))}" }, new List<string> { $"heading {Say.Digits(Say.Pad((d + 180) % 360 == 0 ? 360 : (d + 180) % 360, 3))}" });
                        return Q($"針路 {Say.Pad(d, 3)}° の言い方は？", ok, opts, "針路・方位・風向は必ず 3 桁を 1 桁ずつ（AIM 4-2-10）。090 を “ninety”、“niner zero” と言わない。北は 360（000 ではない）。");
                    }
                case "spd":
                    {
                        double kt = Say.Pick(r, new[] { 65.0, 76, 90, 100, 110, 120, 135, 150, 190, 250 });
                        string ok = Say.Speed(kt);
                        var opts = Say.Four(r, ok, new List<string> { $"{Say.Words(kt)} knots", kt >= 100 ? $"{Say.Words(Math.Floor(kt / 10))} {DigitWord((int)kt % 10)} knots" : $"{Say.Digits(kt)} miles per hour", $"{Say.Digits(kt)} kilometers" });
                        return Q($"速度 {kt} kt の言い方は？", ok, opts, "速度は 1 桁ずつ＋knots（AIM 4-2-11）。");
                    }
                case "frq":
                    {
                        string f = Say.Pick(r, new[] { "118.3", "119.75", "121.7", "122.9", "124.35", "126.7", "127.25", "133.45", "135.275" });
                        string ok = Say.Freq(f);
                        var ab = f.Split('.');
                        var opts = Say.Four(r, ok, new List<string> { $"{Say.Digits(ab[0])} {Say.Digits(ab[1])}", $"{Say.Words(double.Parse(ab[0]))} point {Say.Digits(ab[1])}", $"{Say.Digits(ab[0])} point {Say.Words(double.Parse(ab[1]))}" }, new List<string> { $"{Say.Digits((double.Parse(ab[0]) + 1).ToString())} point {Say.Digits(ab[1])}" });
                        return Q($"周波数 {f} の言い方は？", ok, opts, "1 桁ずつ。小数点は “point”（AIM 4-2-8。ICAO・英国では “decimal”）。");
                    }
                case "alts":
                    {
                        string v = Say.Pick(r, new[] { "29.92", "30.01", "29.87", "30.12", "29.78", "30.00" });
                        string ok = Say.Altimeter(v);
                        var ab = v.Split('.');
                        var opts = Say.Four(r, ok, new List<string> { $"altimeter {Say.Words(double.Parse(ab[0]))} point {Say.Words(double.Parse(ab[1]))}", $"altimeter {Say.Digits(ab[0])} point {Say.Digits(ab[1])}", $"altimeter {Say.Digits(v.Replace(".", "").Substring(0, 3))}" });
                        return Q($"高度計 {v} inHg の言い方は？", ok, opts, "“altimeter” ＋ 4 桁を 1 桁ずつ。小数点は言わない（JO 7110.65 の “altimeter (setting)”）。");
                    }
                case "sqk":
                    {
                        string c = Say.Pad(Say.Ri(r, 0, 7) * 1000 + Say.Ri(r, 0, 7) * 100 + Say.Ri(r, 0, 7) * 10 + Say.Ri(r, 0, 7), 4);
                        string ok = Say.Squawk(c);
                        var opts = Say.Four(r, ok, new List<string> { $"squawk {Say.Words(double.Parse(c.Substring(0, 2)))} {Say.Words(double.Parse(c.Substring(2)))}", $"squawk {Say.Digits(Reverse(c))}", $"squawk {Say.Digits(double.Parse(c).ToString())} zero" }, new List<string> { $"squawk {Say.Digits(c.Substring(1))}", c == "7700" ? "squawk one two zero zero" : "squawk seven seven zero zero" });
                        return Q($"コード {c} の言い方は？", ok, opts, "コードは 4 桁を 1 桁ずつ。トランスポンダーのコードは 0〜7 の数字だけ（8 と 9 はない）。");
                    }
                case "rwy":
                    {
                        string rw = Say.Pick(r, new[] { "36", "9R", "27C", "18", "9L", "27L", "22R", "13", "31" });
                        string ok = Say.Runway(rw);
                        var m = Regex.Match(rw, @"^(\d+)([LRC]?)$");
                        string num = m.Groups[1].Value, sufL = m.Groups[2].Value;
                        string suf = sufL == "L" ? " left" : sufL == "R" ? " right" : sufL == "C" ? " center" : "";
                        string recip = Say.Digits(((double.Parse(num) + 17) % 36 + 1).ToString());
                        var wrong = new List<string>();
                        if (double.Parse(num) >= 10) wrong.Add($"runway {Say.Words(double.Parse(num))}{suf}");
                        if (sufL.Length > 0) { wrong.Add($"runway {Say.Digits(num)} {(sufL == "L" ? "right" : sufL == "R" ? "left" : "left")}"); wrong.Add($"runway {Say.Digits(num)}"); }
                        else { wrong.Add($"runway {Say.Digits(num)} center"); wrong.Add($"runway {recip}"); }
                        var opts = Say.Four(r, ok, wrong, new List<string> { $"runway {recip}{suf}" });
                        return Q($"滑走路 {rw} の言い方は？", ok, opts, "滑走路番号は 1 桁ずつ＋left / right / center（AIM 4-2-8：数字は 1 桁ずつ）。平行滑走路の L・R・C は必ず言う・聞く。");
                    }
                case "wnd":
                    {
                        double dir = Say.Pick(r, new[] { 20.0, 90, 140, 180, 220, 270, 300, 340, 360 });
                        double kt = Say.Pick(r, new[] { 2.0, 5, 8, 10, 12, 15, 18 });
                        string ok = Say.Wind(dir, kt);
                        var opts = Say.Four(r, ok, new List<string> { $"wind {Say.Words(dir)} at {Say.Words(kt)}", $"wind {Say.Digits(Math.Max(kt, 3))} at {Say.Digits(Say.Pad(dir, 3))}", kt < 3 ? $"wind {Say.Digits(Say.Pad(dir, 3))} at {Say.Digits(kt)}" : "wind calm" }, new List<string> { $"wind {Say.Digits(Say.Pad(dir, 3))}" });
                        return Q($"風 {Say.Pad(dir, 3)}° {kt} kt（管制塔の言い方）は？", ok, opts, "“wind (風向 3 桁) at (風速)”、3 kt 未満は “wind calm”（JO 7110.65）。風向・風速の数字も 1 桁ずつ。");
                    }
                case "utc":
                    {
                        int h = Say.Ri(r, 6, 19);
                        double mm = Say.Pick(r, new[] { 0.0, 15, 30, 45, 5, 50 });
                        bool dst = r() < 0.6;
                        int z = (h + (dst ? 4 : 5)) % 24;
                        string hhmm = Say.Pad(z, 2) + Say.Pad(mm, 2);
                        string ok = Say.TimeSay(hhmm);
                        string Alt(int dz) { return Say.TimeSay(Say.Pad((z + dz + 24) % 24, 2) + Say.Pad(mm, 2)); }
                        var opts = Say.Four(r, ok, new List<string> { Alt(dst ? 1 : -1), Alt(-(dst ? 8 : 10)), Alt(dst ? -1 : 1) });
                        return Q($"フロリダの{(dst ? "夏時間（EDT）" : "標準時（EST）")} {h}:{Say.Pad(mm, 2)} は、UTC で何と言う？", ok, opts, $"FAA は UTC を使う（AIM 4-2-12）。東部標準時（EST）は +5 時間、夏時間は 1 時間少なく +4 時間。{h}:{Say.Pad(mm, 2)} → {hhmm}。4 桁を 1 桁ずつ、“Zulu” を付けてよい。");
                    }
                case "call":
                    {
                        const string L = "ABCDEFGHJKLMNPRSTUVWXYZ";
                        string id = "N" + Say.Ri(r, 1, 9) + Say.Ri(r, 0, 9) + Say.Pick(r, L.ToCharArray()) + Say.Pick(r, L.ToCharArray());
                        string ok = Say.Cap(Say.Spell(id));
                        var ws = ok.Split(' ');
                        var opts = Say.Four(r, ok, new List<string> { $"November {Say.Cap(Say.Words(double.Parse(id.Substring(1, 2))))} {string.Join(" ", ws, 3, ws.Length - 3)}", string.Join(" ", new[] { ws[0], ws[1], ws[2], ws[4], ws[3] }), string.Join(" ", ws, 1, ws.Length - 1) }, new List<string> { string.Join(" ", ws, 0, 4) });
                        return Q($"登録記号 {id} のフォネティックは？", ok, opts, "文字はフォネティック、数字は 1 桁ずつ（AIM 4-2-4・4-2-7）。機種名を言うときは N を省く（例：Archer Seven Lima Alpha）。");
                    }
                case "letter":
                    {
                        var a = Say.Pick(r, Say.ALPHA);
                        bool rev = r() < 0.5;
                        var others = Say.Shuffled(new List<Say.AlphaEnt>(Array.FindAll(Say.ALPHA, x => x.L != a.L)), r).GetRange(0, 3);
                        if (rev)
                        {
                            var opts = new List<string> { a.L }; foreach (var o in others) opts.Add(o.L);
                            var qq = new QuizQ { Q = $"“{a.W}” はどの文字？", Why = $"{a.L} ＝ {a.W}（発音 {a.P}、AIM 4-2-7）。", Say = a.W };
                            qq.Opts.AddRange(Say.Shuffled(opts, r)); qq.Ok = qq.Opts.IndexOf(a.L); qq.Id = "drill:letter";
                            return qq;
                        }
                        var opts2 = new List<string> { a.W }; foreach (var o in others) opts2.Add(o.W);
                        var q2 = new QuizQ { Q = $"文字「{a.L}」のフォネティックは？", Why = $"{a.L} ＝ {a.W}（発音 {a.P}、AIM 4-2-7）。", Say = a.W };
                        q2.Opts.AddRange(Say.Shuffled(opts2, r)); q2.Ok = q2.Opts.IndexOf(a.W); q2.Id = "drill:letter";
                        return q2;
                    }
            }
            return null;
        }
        static string Reverse(string s) { var ch = s.ToCharArray(); Array.Reverse(ch); return new string(ch); }
        static string ReverseWords(string s) { var p = s.Split(' '); Array.Reverse(p); return string.Join(" ", p); }
        static string DigitWord(int d) { return new[] { "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "niner" }[d]; }
    }

    /// <summary>radio.js LISTEN[kind](rng), ported kind by kind. WhyFix holds
    /// the right option text until K6 re-finds its index after de-duplication.</summary>
    public static class Listen
    {
        public static QuizQ Make(string kind, Func<double> r)
        {
            var q = new QuizQ { Id = kind };
            switch (kind)
            {
                case "vector":
                    {
                        double d = Say.Pick(r, new[] { 30.0, 60, 120, 150, 210, 240, 300, 330 });
                        bool left = r() < 0.5;
                        string lr = left ? "left" : "right", jl = left ? "左" : "右";
                        double ft = Say.Pick(r, new[] { 3000.0, 3500, 4000, 4500, 5500 });
                        q.Say = $"{Say.CS}, turn {lr} {Say.Heading(d)}, climb and maintain {Say.Altitude(ft)}.";
                        q.Q = "指示された旋回の方向・針路・高度は？（計器飛行の練習の場面）";
                        string ok = $"{jl}・{Say.Pad(d, 3)}°・{ft:#,0} ft";
                        q.Opts.AddRange(new[] { ok, $"{(left ? "右" : "左")}・{Say.Pad(d, 3)}°・{ft:#,0} ft", $"{jl}・{Say.Pad((d + 180) % 360, 3)}°・{ft:#,0} ft", $"{jl}・{Say.Pad(d, 3)}°・{ft + 1000:#,0} ft" });
                        q.Why = "旋回方向・針路・高度の 3 点セットで書き取る。針路は 3 桁、高度は thousand／hundred。";
                        q.WhyFix = ok; q.Ok = 0;
                        break;
                    }
                case "contact":
                    {
                        string f = Say.Pick(r, new[] { "119.75", "124.35", "125.8", "126.45", "132.65" });
                        string c = Say.Pad(Say.Ri(r, 1, 7) * 1000 + Say.Ri(r, 0, 7) * 100 + Say.Ri(r, 0, 7) * 10 + Say.Ri(r, 0, 7), 4);
                        var ab = f.Split('.');
                        string swapF = $"{ab[0]}.{(ab[1].Length > 1 ? "" + ab[1][1] + ab[1][0] : ab[1])}";
                        string swapC = c.Substring(0, 2) + c[3] + c[2];
                        q.Say = $"{Say.CS}, contact LAB Departure {Say.Freq(f)}, squawk {Say.Digits(c)}.";
                        q.Q = "周波数とコードは？";
                        string ok = $"{f}・{c}";
                        string o2 = $"{(swapF == f ? (double.Parse(ab[0]) + 1) + "." + ab[1] : swapF)}・{c}";
                        string o3 = $"{f}・{(swapC == c ? c.Substring(0, 3) + ((int.Parse(c[3].ToString()) + 1) % 8) : swapC)}";
                        string o4 = $"{double.Parse(ab[0]) - 1}.{ab[1]}・{c}";
                        q.Opts.AddRange(new[] { ok, o2, o3, o4 });
                        q.Why = "周波数は “point” の前後で区切る。コードは 4 桁。書き取ってから復唱する。";
                        q.WhyFix = ok; q.Ok = 0;
                        break;
                    }
                case "takeoff":
                    {
                        string rw = Say.Pick(r, new[] { "27L", "9R", "36", "18", "27R" });
                        double dir = Say.Pick(r, new[] { 250.0, 270, 290, 340, 360, 180 });
                        double kt = Say.Pick(r, new[] { 6.0, 8, 12, 14 });
                        bool luaw = r() < 0.4;
                        string opp = rw.Contains("L") ? rw.Replace("L", "R") : rw.Contains("R") ? rw.Replace("R", "L") : rw;
                        string alt = opp == rw ? (rw == "36" ? "18" : "36") : opp;
                        string what = luaw ? "入って待て（LUAW）" : "離陸許可";
                        q.Say = $"{Say.CS}, {Say.Runway(rw)}{(luaw ? ", line up and wait" : $", {Say.Wind(dir, kt)}, cleared for takeoff")}.";
                        q.Q = "滑走路と指示は？";
                        string ok = $"滑走路 {rw}・{what}";
                        q.Opts.AddRange(new[] { ok, $"滑走路 {alt}・{what}", $"滑走路 {rw}・{(luaw ? "離陸許可" : "入って待て（LUAW）")}", $"滑走路 {rw}・手前で待て（hold short）" });
                        q.Why = "LUAW は離陸許可ではない。平たく言うと「滑走路に入って待て」。離陸許可は “cleared for takeoff” の言葉そのもの。";
                        q.WhyFix = ok; q.Ok = 0;
                        break;
                    }
                case "traffic":
                    {
                        int o = Say.Ri(r, 1, 12), mi = Say.Ri(r, 2, 8);
                        var dir = Say.Pick(r, new[] { ("northbound", "北向き"), ("southbound", "南向き"), ("eastbound", "東向き"), ("westbound", "西向き") });
                        double ft = Say.Pick(r, new[] { 1500.0, 2000, 2500, 3500, 4500 });
                        string ok = $"{o} 時・{mi} マイル・{dir.Item2}・{ft:#,0} ft";
                        q.Say = $"{Say.CS}, traffic, {Say.Words(o)} o'clock, {Say.Words(mi)} miles, {dir.Item1}, a Cessna, {Say.Altitude(ft)}.";
                        q.Q = "交通情報の内容は？";
                        q.Opts.AddRange(new[] { ok, $"{(o + 5) % 12 + 1} 時・{mi} マイル・{dir.Item2}・{ft:#,0} ft", $"{o} 時・{mi + 2} マイル・{dir.Item2}・{ft:#,0} ft", $"{o} 時・{mi} マイル・{dir.Item2}・{ft + 1000:#,0} ft" });
                        q.Why = "時計の方位は機首が 12 時。距離と高度まで書き取る。";
                        q.WhyFix = ok; q.Ok = 0;
                        break;
                    }
                case "notme":
                    {
                        var other = Say.Pick(r, new[] { ("Cessna Four Kilo Papa", "Cessna 4KP"), ("Archer Seven Lima Echo", "Archer 7LE"), ("Cherokee Two Lima Alpha", "Cherokee 2LA") });
                        string rw = Say.Pick(r, new[] { "36", "9R", "27L" });
                        q.Say = $"{other.Item1}, {Say.Runway(rw)}, cleared to land.";
                        q.Q = $"この送信は誰宛て？（あなたは {Say.CSS}）";
                        string ok = $"{other.Item2} 宛て（自分ではない）";
                        q.Opts.AddRange(new[] { ok, $"{Say.CSS}（自分）宛て", "全機宛て", "管制塔の独り言" });
                        q.Why = "似たコールサインに注意。自分宛てと確信できなければ確かめる（Verify）。";
                        q.WhyFix = ok; q.Ok = 0;
                        break;
                    }
                case "altim":
                    {
                        string v = Say.Pick(r, new[] { "29.87", "30.02", "29.95", "30.14", "29.79" });
                        string sw = v.Substring(0, 3) + v[4] + v[3];
                        q.Say = $"{Say.CS}, LAB altimeter {Say.Digits(v.Replace(".", ""))}.";
                        q.Q = "高度計規正値は？";
                        string ok = $"{v} inHg";
                        var cand = new List<string>();
                        foreach (var x in new[] { sw, (double.Parse(v) - 0.1).ToString("F2"), "29.92", (double.Parse(v) + 0.1).ToString("F2"), (double.Parse(v) + 0.01).ToString("F2") })
                            if (x != v && !cand.Contains(x)) cand.Add(x);
                        q.Opts.Add(ok);
                        for (int i = 0; i < Math.Min(3, cand.Count); i++) q.Opts.Add(cand[i] + " inHg");
                        q.Why = "4 桁を書き取り、2 桁目のあとに小数点を入れる。";
                        q.WhyFix = ok; q.Ok = 0;
                        break;
                    }
            }
            return q;
        }
    }

    /// <summary>school.js navlogNumbers + navlogDialogs' five questions
    /// (NAVLOG defaults; the day's winds aloft override the wind).</summary>
    public static class NavlogQ
    {
        public static List<QuizQ> Build(double? windFrom = null, double? windKt = null, Func<double> r = null)
        {
            double tas = 105, varW = 6, gph = 10, reserveMin = 30;
            double wf = windFrom ?? 330, wk = windKt ?? 15;
            var a = Avionics.Wpt("LABRW"); var b = Avionics.Wpt("LABEB");
            const double DEG = Math.PI / 180;
            double tc = ((Math.Atan2(b.E - a.E, b.N - a.N) / DEG) + 360) % 360;
            double dist = Math.Sqrt((b.E - a.E) * (b.E - a.E) + (b.N - a.N) * (b.N - a.N)) / 1852;
            double mc = (tc + varW) % 360, rel = (wf - mc) * DEG;
            double wca = Math.Asin(wk * Math.Sin(rel) / tas) / DEG, mh = (mc + wca + 360) % 360;
            double gs = tas * Math.Cos(wca * DEG) - wk * Math.Cos(rel), ete = dist / gs * 60, fuel = (ete + reserveMin) / 60 * gph;
            r = r ?? Js.Rng(41 * 1 + 7);
            string D3(double v) { double m = Math.Round((v + 360) % 360); if (m == 0) m = 360; return Say.Pad(m, 3); }
            (List<string> Opts, int Ok) Opts(string right, params string[] wrong)
            {
                var all = new List<string> { right };
                foreach (var w in wrong) if (w != right && !all.Contains(w)) all.Add(w);
                all = all.GetRange(0, Math.Min(4, all.Count));
                var sh = Say.Shuffled(all, r);
                return (sh, sh.IndexOf(right));
            }
            var outL = new List<QuizQ>();
            {
                var o = Opts($"{D3(mc)}°", $"{D3(tc)}°", $"{D3(tc - varW)}°", $"{D3(mc + 180)}°");
                outL.Add(new QuizQ { Q = $"地図に引いた線（{a.Name.Replace("（架空）", "")} → {b.Name.Replace("（架空）", "")}）は、真方位 {D3(tc)}°・{dist:F1} NM。偏差は 6° W です。磁方位のコース（MC）は？", Opts = o.Opts, Ok = o.Ok, Why = $"西偏差は足します（\"West is best\"）。{D3(tc)} ＋ 6 ＝ {D3(mc)}°。" });
            }
            {
                int wcaR = (int)Math.Round(wca);
                var o = Opts($"{D3(mh)}°", $"{D3(mc - wca)}°", $"{D3(mc)}°", $"{D3(mh + 10)}°");
                outL.Add(new QuizQ { Q = $"上空の風は {D3(wf)}° から {wk} kt、真対気速度（TAS）は {tas} kt。コースを保つための磁針路（MH）は？", Opts = o.Opts, Ok = o.Ok, Why = $"風は{(wcaR < 0 ? "左" : "右")}から吹いているので、機首を風上（{(wcaR < 0 ? "左" : "右")}）へ {Math.Abs(wcaR)}° 向けます（偏流修正角）。{D3(mc)} {(wcaR >= 0 ? "＋" : "−")} {Math.Abs(wcaR)} ＝ {D3(mh)}°。" });
            }
            {
                int gsR = (int)Math.Round(gs);
                var o = Opts($"{gsR} kt", $"{tas} kt", $"{Math.Round(tas + (tas - gs))} kt", $"{tas - wk} kt");
                outL.Add(new QuizQ { Q = "そのときの対地速度（GS）は？", Opts = o.Opts, Ok = o.Ok, Why = $"{(gs < tas ? "向かい風" : "追い風")}の成分の分だけ{(gs < tas ? "遅く" : "速く")}なり、機首を風上に向けた分は少し遅くなります。約 {gsR} kt。" });
            }
            {
                int eteR = (int)Math.Round(ete), gsR = (int)Math.Round(gs);
                double alt1 = Math.Round(dist / tas * 60);
                var o = Opts($"{eteR} 分", $"{(alt1 == eteR ? eteR + 2 : alt1)} 分", $"{eteR * 2} 分", $"{Math.Max(1, eteR - 4)} 分");
                outL.Add(new QuizQ { Q = $"{dist:F1} NM を対地速度 {gsR} kt で。所要時間（ETE）は？", Opts = o.Opts, Ok = o.Ok, Why = $"時間＝距離 ÷ 対地速度。{dist:F1} ÷ {gsR} × 60 ≒ {eteR} 分（対気速度で割ると、風の分を忘れます）。" });
            }
            {
                string fR = fuel.ToString("F1");
                int eteR = (int)Math.Round(ete);
                var o = Opts($"{fR} gal", $"{(ete / 60 * gph):F1} gal", $"{((ete + 45) / 60 * gph):F1} gal", $"{gph:F1} gal");
                outL.Add(new QuizQ { Q = $"燃料の消費は 1 時間に {gph} gal。昼間の有視界飛行の予備（30 分）を含めて、この区間に最低いるのは？（タキシーと上昇の分は別に足します）", Opts = o.Opts, Ok = o.Ok, Why = $"（{eteR} 分 ＋ 予備 30 分）÷ 60 × {gph} ≒ {fR} gal。予備は昼 30 分・夜 45 分。" });
            }
            return outL;
        }
    }
}
