// CADET — CadetWalkaround.cs : cadet/src/aircraft/walkaround.js ported —
// the walk-around inspection: seeded anomalies, inspect / act / pending /
// settle / summary / consequences / props. Content (POINTS etc.) comes from
// the Stage-1 converted data (walkaround-archer.json / -seminole.json).
using System;
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public class WalkKit
    {
        public Lst Points;
        public List<string> Anomalies = new List<string>();
        public Dict TaskMissed;
        public static WalkKit FromJson(Dict root)
        {
            var k = new WalkKit { Points = Js.Arr(Js.Get(root, "POINTS")), TaskMissed = Js.Obj(Js.Get(root, "TASK_MISSED")) };
            var an = Js.Arr(Js.Get(root, "ANOMALIES"));
            if (an != null) foreach (var a in an) k.Anomalies.Add(a as string);
            return k;
        }
    }

    public class Walkaround
    {
        readonly WalkKit _kit;
        readonly HashSet<string> _bad;
        readonly Dictionary<string, PSt> _st = new Dictionary<string, PSt>();
        readonly List<Dict> _log = new List<Dict>();

        class PSt { public bool Looked, Task, TaskByIns, FalseReport, SelfFixed, Missed; public string Verdict, Bad; public bool BadByIns; }

        public Walkaround(WalkKit kit, List<string> planted)
        {
            _kit = kit;
            _bad = new HashSet<string>(planted);
            foreach (var p0 in kit.Points)
            {
                var p = Js.Obj(p0);
                string id = Js.Str(p, "id");
                _st[id] = new PSt { Task = Js.Obj(Js.Get(p, "task")) == null, Bad = _bad.Contains(id) ? "open" : null };
            }
        }

        public static List<string> Plant(WalkKit kit, uint seed, List<string> anomaliesOverride = null)
        {
            if (anomaliesOverride != null)
            {
                var outF = new List<string>();
                foreach (var id in anomaliesOverride)
                    foreach (var p0 in kit.Points) { var p = Js.Obj(p0); if (Js.Str(p, "id") == id && Js.Obj(Js.Get(p, "bad")) != null) { outF.Add(id); break; } }
                return outF;
            }
            var R = Failures.Rng(seed);
            double roll = R();
            int n = roll < 0.2 ? 0 : roll < 0.7 ? 1 : 2;
            var can = new List<string>();
            foreach (var p0 in kit.Points)
            {
                var p = Js.Obj(p0); var bad = Js.Obj(Js.Get(p, "bad"));
                if (bad != null && kit.Anomalies.Contains(Js.Str(bad, "id"))) can.Add(Js.Str(p, "id"));
            }
            var outL = new List<string>();
            while (outL.Count < n && can.Count > 0) { int k = (int)Math.Floor(R() * can.Count); outL.Add(can[k]); can.RemoveAt(k); }
            return outL;
        }

        Dict Point(string id) { foreach (var p0 in _kit.Points) { var p = Js.Obj(p0); if (Js.Str(p, "id") == id) return p; } return null; }
        public List<string> Planted { get { return new List<string>(_bad); } }
        public Lst Points { get { return _kit.Points; } }
        public List<Dict> Log { get { return new List<Dict>(_log); } }

        bool IsDone(string id)
        {
            var s = _st[id];
            return s.Task && (s.Verdict != null || s.Bad == "found" || s.Bad == "fixed") && s.Bad != "found";
        }

        public Dict Inspect(string id)
        {
            var p = Point(id); if (p == null) return null;
            var s = _st[id];
            s.Looked = true;
            var badO = Js.Obj(Js.Get(p, "bad"));
            bool isBad = s.Bad == "open" || s.Bad == "found";
            string seen;
            if (s.Bad == "fixed") seen = Js.Str(badO, "fix") == "self" ? Js.Str(badO, "done") : (Js.Str(badO, "mx") ?? "") + Js.Str(p, "ok");
            else if (isBad) seen = Js.Str(badO, "see");
            else seen = Js.Str(p, "ok");
            var choices = new Lst();
            var task = Js.Obj(Js.Get(p, "task"));
            if (task != null && !s.Task) choices.Add(new Dict { { "act", "task" }, { "text", Js.Str(task, "verb") } });
            if (s.Bad == "found" && badO != null && Js.Str(badO, "fix") == "self") choices.Add(new Dict { { "act", "fix" }, { "text", Js.Str(badO, "verb") } });
            if (s.Verdict == null || s.Bad == "open")
            {
                choices.Add(new Dict { { "act", "ok" }, { "text", "異常なし" } });
                choices.Add(new Dict { { "act", "report" }, { "text", "異常あり：報告する" } });
            }
            choices.Add(new Dict { { "act", "close" }, { "text", "あとで" } });
            string seenOut = task != null && s.Task && !isBad ? seen + "\n（" + Js.Str(task, "done") + "）" : seen;
            return new Dict { { "id", id }, { "title", Js.Str(p, "name") }, { "check", Js.Str(p, "check") }, { "seen", seenOut }, { "choices", choices }, { "done", IsDone(id) } };
        }

        public Dict Act(string id, string what)
        {
            var p = Point(id); if (p == null) return null;
            var s = _st[id];
            var badO = Js.Obj(Js.Get(p, "bad"));
            var task = Js.Obj(Js.Get(p, "task"));
            string text = "", mx = "", say = "";
            if (what == "task" && task != null && !s.Task) { s.Task = true; text = Js.Str(task, "done"); }
            else if (what == "fix" && s.Bad == "found" && badO != null && Js.Str(badO, "fix") == "self") { s.Bad = "fixed"; s.SelfFixed = true; text = Js.Str(badO, "done"); }
            else if (what == "ok")
            {
                s.Verdict = "ok";
                if (s.Bad == "open") { s.Missed = true; text = "異常なしとしました。"; }
                else text = "異常なし。";
            }
            else if (what == "report")
            {
                s.Verdict = "report";
                if (s.Bad == "open")
                {
                    s.Bad = "found";
                    if (badO != null && Js.Str(badO, "fix") == "mx") { mx = Js.Str(badO, "mx"); s.Bad = "fixed"; text = "整備に連絡しました。"; }
                    else text = "これは自分で直せます。";
                }
                else if (s.Bad == null) { s.FalseReport = true; say = "見せてください。……これは大丈夫です。でも、迷ったら聞くのは正しいことです。"; text = "教官に確かめてもらいました。"; }
                else text = "報告済みです。";
            }
            else return new Dict { { "text", "" } };
            _log.Add(new Dict { { "id", id }, { "what", what } });
            return new Dict { { "text", text }, { "mx", mx }, { "say", say } };
        }

        public Lst Pending()
        {
            var outL = new Lst();
            foreach (var p0 in _kit.Points)
            {
                var p = Js.Obj(p0); var s = _st[Js.Str(p, "id")];
                var task = Js.Obj(Js.Get(p, "task"));
                if (task != null && !s.Task) outL.Add(new Dict { { "id", Js.Str(p, "id") }, { "task", Js.Str(task, "id") }, { "say", Js.Str(_kit.TaskMissed, Js.Str(task, "id")) } });
                var badO = Js.Obj(Js.Get(p, "bad"));
                if (badO != null && (s.Bad == "open" || s.Bad == "found"))
                {
                    string nm = Js.Str(p, "name") ?? "";
                    int ix = nm.IndexOf('：');
                    string shortNm = ix >= 0 ? nm.Substring(ix + 1) : nm;   // JS: name.replace(/^.*?：/, '')
                    outL.Add(new Dict { { "id", Js.Str(p, "id") }, { "anomaly", Js.Str(badO, "id") }, { "say", shortNm + "：" + Js.Str(badO, "see") } });
                }
            }
            return outL;
        }

        public void Settle()
        {
            foreach (var p0 in _kit.Points)
            {
                var p = Js.Obj(p0); var s = _st[Js.Str(p, "id")];
                var task = Js.Obj(Js.Get(p, "task"));
                if (task != null && !s.Task) { s.Task = true; s.TaskByIns = true; }
                if (s.Bad == "open" || s.Bad == "found") { s.BadByIns = s.Bad == "open"; s.Bad = "fixed"; }
            }
        }

        public Dict Summary()
        {
            var rows = new Lst();
            foreach (var p0 in _kit.Points)
            {
                var p = Js.Obj(p0); string id = Js.Str(p, "id"); var s = _st[id];
                bool a = _bad.Contains(id);
                var badO = Js.Obj(Js.Get(p, "bad"));
                rows.Add(new Dict
                {
                    { "id", id }, { "name", Js.Str(p, "name") }, { "looked", s.Looked }, { "done", IsDone(id) },
                    { "anomaly", a ? Js.Str(badO, "id") : null }, { "found", a && !s.Missed && !s.BadByIns },
                    { "missed", a && (s.Missed || s.BadByIns) }, { "falseReport", s.FalseReport }, { "taskLeft", s.TaskByIns },
                });
            }
            int looked = 0, done = 0, anomalies = 0, found = 0, falseReports = 0;
            var missed = new Lst(); var tasksLeft = new Lst();
            foreach (var r0 in rows)
            {
                var r = Js.Obj(r0);
                if (Js.Bool(r, "looked")) looked++;
                if (Js.Bool(r, "done")) done++;
                if (Js.Get(r, "anomaly") != null) anomalies++;
                if (Js.Bool(r, "found")) found++;
                if (Js.Bool(r, "missed")) missed.Add(r);
                if (Js.Bool(r, "falseReport")) falseReports++;
            }
            foreach (var p0 in _kit.Points)
            {
                var p = Js.Obj(p0); var task = Js.Obj(Js.Get(p, "task"));
                if (task != null && _st[Js.Str(p, "id")].TaskByIns) tasksLeft.Add(Js.Str(task, "id"));
            }
            return new Dict
            {
                { "total", (double)_kit.Points.Count }, { "looked", (double)looked }, { "done", (double)done },
                { "anomalies", (double)anomalies }, { "found", (double)found }, { "missed", missed },
                { "falseReports", (double)falseReports }, { "tasksLeft", tasksLeft }, { "rows", rows },
            };
        }

        public Lst Consequences()
        {
            var outL = new Lst();
            foreach (var p0 in _kit.Points)
            {
                var p = Js.Obj(p0); string id = Js.Str(p, "id"); var s = _st[id];
                var task = Js.Obj(Js.Get(p, "task"));
                if (task != null && !s.Task)
                {
                    var h = Failures.PreflightHookFor("task", Js.Str(task, "id"));
                    var d = new Dict { { "source", "task" }, { "point", id }, { "item", Js.Str(task, "id") }, { "hook", h.Hook }, { "via", h.Via } };
                    if (h.FailKind != null) d["failKind"] = h.FailKind;
                    if (h.OilQ != null) d["oilQ"] = h.OilQ.Value;
                    outL.Add(d);
                }
                var badO = Js.Obj(Js.Get(p, "bad"));
                if (badO != null && (s.Bad == "open" || s.Bad == "found"))
                {
                    var h = Failures.PreflightHookFor("defect", Js.Str(badO, "id"));
                    var d = new Dict { { "source", "defect" }, { "point", id }, { "item", Js.Str(badO, "id") }, { "hook", h.Hook }, { "via", h.Via } };
                    if (h.FailKind != null) d["failKind"] = h.FailKind;
                    if (h.OilQ != null) d["oilQ"] = h.OilQ.Value;
                    outL.Add(d);
                }
            }
            return outL;
        }

        public Dict Props()
        {
            Func<string, bool> taskLeft = tid =>
            {
                foreach (var p0 in _kit.Points) { var p = Js.Obj(p0); var t = Js.Obj(Js.Get(p, "task")); if (t != null && Js.Str(t, "id") == tid) return !_st[Js.Str(p, "id")].Task; }
                return false;
            };
            Func<string, bool> open = id => _st.TryGetValue(id, out var g) && (g.Bad == "open" || g.Bad == "found");
            return new Dict
            {
                { "lock", taskLeft("lock") }, { "tieR", taskLeft("tieR") }, { "tieL", taskLeft("tieL") }, { "tieT", taskLeft("tieT") },
                { "chocks", taskLeft("chocks") }, { "pitot", taskLeft("pitot") },
                { "capOpen", open("r_cap") }, { "tireLow", open("r_main") }, { "brakeLeak", open("l_main") },
            };
        }
    }
}
