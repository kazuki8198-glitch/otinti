// CADET — CadetLogbook.cs : career/logbook.js ported — the cadet's logbook
// (航空日誌): one entry per day flown from the day summary, tenths-of-an-hour
// logging, the instructor's signature, cleaning of read-back entries, totals.
// Storage is an ILogStore (the browser's localStorage in the original; the
// Unity layer supplies its own, e.g. PlayerPrefs or a file).
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public interface ILogStore
    {
        string GetItem(string k);
        void SetItem(string k, string v);
        void RemoveItem(string k);
    }
    public class MemLogStore : ILogStore
    {
        readonly Dictionary<string, string> _m = new Dictionary<string, string>();
        public string GetItem(string k) { return _m.TryGetValue(k, out var v) ? v : null; }
        public void SetItem(string k, string v) { _m[k] = v; }
        public void RemoveItem(string k) { _m.Remove(k); }
    }

    public static class LogbookLib
    {
        public const string KEY = "cadet.logbook";
        public const int V = 1;
        public static readonly Dict INSTRUCTOR_SIG = new Dict { { "name", "早瀬 航" }, { "cert", "CFI-0412（架空）" } };
        public const int INTRO_SKIPPED_S = 1500;
        static readonly HashSet<string> HOOD = new HashSet<string> { "i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8" };

        public static double Tenths(double sec) { return Js.Round(Math.Max(0, sec) / 360) / 10; }

        public class EntryOpts
        {
            public string Date;
            public string Remarks = "";
            public int DayN = 1;
            public double SkippedSec = 0;
            public bool Xc = false;
            public Dict Sig = null;
            public string Endorsement = "";
        }

        public static Dict EntryFrom(Dict sum, EntryOpts o)
        {
            o = o ?? new EntryOpts();
            var lessons = new Lst();
            foreach (var lv in (Lst)sum["lessons"])
            {
                var l = (Dict)lv;
                if (!Js.Bool(l, "done")) continue;
                var e = new Dict { { "id", Js.Str(l, "id") }, { "title", Js.Str(l, "title") }, { "grade", Js.Str(l, "grade") }, { "passed", Js.Bool(l, "passed") } };
                var ana = Js.Get(l, "ana") as Dict;
                var clean = ana != null ? Analysis.CleanAnalysis(ana) : null;
                if (clean != null) e["ana"] = clean;
                lessons.Add(e);
            }
            double block = Js.Num(sum, "blockT") + o.SkippedSec;
            bool solo = Js.Bool(sum, "solo");
            double h = Tenths(block);
            var plan = Js.Get(sum, "plan") as Dict;
            bool twin = plan != null && Js.Str(plan, "aircraft") == "pa44";
            int hood = 0; foreach (var lv in lessons) if (HOOD.Contains(Js.Str((Dict)lv, "id"))) hood++;
            double landings;
            if (sum.ContainsKey("landings") && Js.Get(sum, "landings") is double ld && ld == Math.Floor(ld)) landings = ld;
            else
            {
                landings = 0;
                foreach (var lv in (Lst)sum["lessons"]) { var l = (Dict)lv; if (Js.Str(l, "id") == "t3" && Js.Bool(l, "done") && !Js.Bool(l, "crashed")) landings = 1; }
            }
            var ent = new Dict
            {
                { "day", (double)o.DayN }, { "date", o.Date ?? DateTime.UtcNow.ToString("yyyy-MM-dd") },
                { "aircraft", twin ? "PA-44-180" : "PA-28-181" }, { "reg", twin ? "N452SY" : "N738SY" },
                { "from", "LAB" }, { "to", "LAB" },
                { "total", h }, { "dual", solo ? 0.0 : h }, { "solo", solo ? h : 0.0 }, { "landings", landings },
                { "xc", o.Xc ? h : 0.0 },
                { "inst", hood > 0 ? Js.Round(h * Math.Min(1, hood / (double)Math.Max(1, lessons.Count) * 1.4) * 10) / 10 : 0.0 },
                { "me", twin ? h : 0.0 },
                { "lessons", lessons }, { "remarks", o.Remarks },
                { "skipped", o.SkippedSec > 0 ? Js.Round(o.SkippedSec / 60) : 0.0 },
                { "trust", Js.Num(sum, "trust") },
                { "sig", o.Sig != null ? new Dict(o.Sig) : new Dict(INSTRUCTOR_SIG) }, { "signed", true },
            };
            if (!string.IsNullOrEmpty(o.Endorsement)) ent["endorsement"] = o.Endorsement;
            else if (solo && !o.Xc) ent["endorsement"] = "単独飛行（ファーストソロ）を認める。LAB 飛行場の場周経路、昼間・有視界";
            else if (o.Xc) ent["endorsement"] = "単独の野外飛行を認める。LAB 訓練空域、昼間・有視界";
            return ent;
        }

        public static Dict IntroEntry(string date, int dayN = 1, double airSec = 0, bool cut = false, bool watched = false, string level = null, string turn = null, int takes = 0, double trust = 0)
        {
            var flown = new List<string> { "操縦の受け渡し" };
            if (level != null) flown.Add("直線水平飛行");
            if (turn != null && turn != "none") flown.Add("右旋回");
            string remarks = cut ? "体験飛行（途中で切り上げ、早瀬 教官が LAB へ）。"
                : watched ? "体験飛行（操縦は早瀬 教官、同乗して見学）。訓練空域 3,000 ft で、直線水平飛行と右旋回。"
                : $"体験飛行（離着陸と往復は早瀬 教官）。訓練空域 3,000 ft で、{string.Join("、", flown)}。{(takes > 0 ? $"教官が操縦を引き継ぎ {takes} 回。" : "")}";
            var sum = new Dict { { "lessons", new Lst() }, { "blockT", airSec }, { "landings", 0.0 }, { "trust", trust }, { "solo", false }, { "plan", null } };
            return EntryFrom(sum, new EntryOpts { Date = date, DayN = dayN, Remarks = remarks, SkippedSec = INTRO_SKIPPED_S });
        }

        static string Str(object x, int n) { return x is string s ? (s.Length > n ? s.Substring(0, n) : s) : ""; }
        static double Num(object x) { return x is double d && !double.IsNaN(d) && !double.IsInfinity(d) ? Math.Max(0, Js.Round(d * 10) / 10) : 0; }
        static readonly Regex ID_RE = new Regex("^[a-z0-9]{1,6}$");

        public static Dict CleanEntry(Dict e)
        {
            if (e == null || !(Js.Get(e, "total") is double)) return null;
            var outp = new Dict
            {
                { "day", Js.Get(e, "day") is double dv && dv == Math.Floor(dv) ? dv : 0.0 },
                { "date", Str(Js.Get(e, "date"), 10) },
                { "aircraft", Str(Js.Get(e, "aircraft"), 16) is string ac && ac != "" ? ac : "PA-28-181" },
                { "reg", Str(Js.Get(e, "reg"), 8) is string rg && rg != "" ? rg : "N738SY" },
                { "from", Str(Js.Get(e, "from"), 4) is string fr && fr != "" ? fr : "LAB" },
                { "to", Str(Js.Get(e, "to"), 4) is string to && to != "" ? to : "LAB" },
                { "total", Num(Js.Get(e, "total")) }, { "dual", Num(Js.Get(e, "dual")) }, { "solo", Num(Js.Get(e, "solo")) },
                { "xc", Num(Js.Get(e, "xc")) }, { "inst", Num(Js.Get(e, "inst")) }, { "me", Num(Js.Get(e, "me")) },
                { "landings", Js.Get(e, "landings") is double ln && ln == Math.Floor(ln) ? Math.Max(0, Math.Min(20, ln)) : 0.0 },
                { "lessons", new Lst() },
                { "remarks", Str(Js.Get(e, "remarks"), 200) },
                { "skipped", Js.Get(e, "skipped") is double sk && sk == Math.Floor(sk) ? sk : 0.0 },
                { "trust", Js.Get(e, "trust") is double ? Js.Num(e, "trust") : 0.0 },
            };
            if (Js.Get(e, "lessons") is Lst ls)
            {
                int n = 0;
                foreach (var lv in ls)
                {
                    if (n >= 12) break;
                    var l = lv as Dict; if (l == null) continue;
                    string id = Js.Str(l, "id");
                    if (id == null || !ID_RE.IsMatch(id)) continue;
                    var le = new Dict { { "id", id }, { "title", Str(Js.Get(l, "title"), 40) }, { "grade", Str(Js.Get(l, "grade"), 2) }, { "passed", Js.Bool(l, "passed") } };
                    var ana = Js.Get(l, "ana") as Dict;
                    var clean = ana != null ? Analysis.CleanAnalysis(ana) : null;
                    if (clean != null) le["ana"] = clean;
                    ((Lst)outp["lessons"]).Add(le); n++;
                }
            }
            var sig = Js.Get(e, "sig") as Dict;
            outp["sig"] = new Dict
            {
                { "name", Str(sig != null ? Js.Get(sig, "name") : null, 20) is string sn && sn != "" ? sn : (string)INSTRUCTOR_SIG["name"] },
                { "cert", Str(sig != null ? Js.Get(sig, "cert") : null, 30) is string sc && sc != "" ? sc : (string)INSTRUCTOR_SIG["cert"] },
            };
            outp["signed"] = !(Js.Get(e, "signed") is bool sb) || sb;
            if (Js.Get(e, "endorsement") != null) outp["endorsement"] = Str(Js.Get(e, "endorsement"), 120);
            return outp;
        }
    }

    public class Logbook
    {
        Dict _data = new Dict { { "v", (double)LogbookLib.V }, { "entries", new Lst() } };
        readonly ILogStore _store;
        public Logbook(ILogStore store)
        {
            _store = store;
            try
            {
                string raw = store != null ? store.GetItem(LogbookLib.KEY) : null;
                if (raw != null)
                {
                    var j = MiniJson.Parse(raw) as Dict;
                    if (j != null && Js.Num(j, "v") == LogbookLib.V && Js.Get(j, "entries") is Lst es)
                    {
                        var cleaned = new Lst();
                        foreach (var ev in es) { var c = LogbookLib.CleanEntry(ev as Dict); if (c != null) cleaned.Add(c); }
                        _data = new Dict { { "v", (double)LogbookLib.V }, { "entries", cleaned } };
                    }
                }
            }
            catch { /* a broken or unreadable book: start a new one */ }
        }
        void Save() { try { _store?.SetItem(LogbookLib.KEY, MiniJson.Stringify(_data)); } catch { } }
        public Dict Add(Dict entry) { ((Lst)_data["entries"]).Add(entry); Save(); return entry; }
        public List<Dict> Entries { get { var l = new List<Dict>(); foreach (var e in (Lst)_data["entries"]) l.Add((Dict)e); return l; } }
        public Dict Totals()
        {
            var t = new Dict { { "total", 0.0 }, { "dual", 0.0 }, { "solo", 0.0 }, { "xc", 0.0 }, { "inst", 0.0 }, { "me", 0.0 }, { "landings", 0.0 }, { "days", (double)((Lst)_data["entries"]).Count } };
            foreach (var ev in (Lst)_data["entries"])
            {
                var e = (Dict)ev;
                foreach (var k in new[] { "total", "dual", "solo", "xc", "inst", "me", "landings" }) t[k] = Js.Num(t, k) + Js.Num(e, k);
            }
            foreach (var k in new[] { "total", "dual", "solo", "xc", "inst", "me" }) t[k] = Js.Round(Js.Num(t, k) * 10) / 10;
            return t;
        }
        public void Clear() { _data = new Dict { { "v", (double)LogbookLib.V }, { "entries", new Lst() } }; try { _store?.RemoveItem(LogbookLib.KEY); } catch { } }
        public void Replace(Lst entries)
        {
            var cleaned = new Lst();
            if (entries != null) foreach (var ev in entries) { var c = LogbookLib.CleanEntry(ev as Dict); if (c != null) cleaned.Add(c); }
            _data = new Dict { { "v", (double)LogbookLib.V }, { "entries", cleaned } };
            Save();
        }
    }
}
