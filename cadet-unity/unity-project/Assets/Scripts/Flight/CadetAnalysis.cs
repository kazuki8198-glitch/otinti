// CADET — CadetAnalysis.cs : cadet/src/flight/analysis.js + profile.js
// ported — the standards analysis layer over recorder samples (maneuver
// scoring, the 500 ft stabilised-approach gate, landing analysis, logbook
// compact form + history/stats, sparklines) and the debrief profile series.
// Display data only: it never touches a grade, exactly as in the JS.
using System;
using System.Collections.Generic;
using System.Linq;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public static class Analysis
    {
        public const double FT = 3.28084;
        public const double FIELD_ELEV_FT = 55;
        public static readonly (double n, double e, double trueHdg, double len, double wid) RWY = (0, -40000, 354, 1200, 30);
        public const double MAGVAR_W = 6;
        public const double AIM_ALONG = 300;
        public static readonly (double from, double to) TD_ZONE = (200, 700);
        public const double GATE_AGL_FT = 500;
        public static readonly Dictionary<string, double> TOL = new Dictionary<string, double>
            { { "spd", 10 }, { "alt", 100 }, { "hdg", 10 }, { "bank", 5 }, { "gp", 0.9 }, { "cl", 30 } };

        const double DEG = Math.PI / 180;
        static double Clamp(double v, double a, double b) { return v < a ? a : v > b ? b : v; }
        static double W360(double a) { return ((a % 360) + 360) % 360; }
        static double W180(double a) { return ((a % 360) + 540) % 360 - 180; }
        static double R1(double v) { return Js.Round(v * 10) / 10; }

        public static (double along, double cross) RwyCoords(double n, double e)
        {
            double h = RWY.trueHdg * DEG, dn = n - RWY.n, de = e - RWY.e;
            return (dn * Math.Cos(h) + de * Math.Sin(h), -dn * Math.Sin(h) + de * Math.Cos(h));
        }
        static double[] QRot(double[] q, double[] v)
        {
            double x = q[0], y = q[1], z = q[2], w = q[3];
            double vx = v[0], vy = v[1], vz = v[2];
            double tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
            return new[] { vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx) };
        }
        public class Att { public double HdgT, Hdg, Pitch, Bank; }
        public static Att AttOf(RecSample x)
        {
            var q = x != null && x.Q != null && x.Q.Length >= 4 ? x.Q : new double[] { 0, 0, 0, 1 };
            var f = QRot(q, new[] { 0.0, 0, -1 }); var r = QRot(q, new[] { 1.0, 0, 0 }); var up = QRot(q, new[] { 0.0, 1, 0 });
            double hdgT = W360(Math.Atan2(f[0], -f[2]) / DEG);
            return new Att { HdgT = hdgT, Hdg = W360(hdgT + MAGVAR_W), Pitch = Math.Asin(Clamp(f[1], -1, 1)) / DEG, Bank = Math.Atan2(-r[1], up[1]) / DEG };
        }
        public static double AltFtOf(RecSample x) { return x != null && x.Alt > 0 ? x.Alt : (x != null ? x.H : 0) * FT; }
        public static double AglFtOf(RecSample x) { return AltFtOf(x) - FIELD_ELEV_FT; }
        public static double VsAt(List<RecSample> xs, int i)
        {
            var x = xs[i]; if (x == null) return 0;
            int a = i, b = i;
            while (a > 0 && x.T - xs[a].T < 0.5) a--;
            while (b < xs.Count - 1 && xs[b].T - x.T < 0.5) b++;
            double dt = xs[b].T - xs[a].T;
            if (dt > 0.05 && b > a) return (AltFtOf(xs[b]) - AltFtOf(xs[a])) / dt * 60;
            return x.Vs;
        }
        public static double GpOf(RecSample x)
        {
            var rc = RwyCoords(x.N, x.E);
            return rc.along < AIM_ALONG - 50 ? Math.Atan2(Math.Max(AglFtOf(x) / FT, 0), AIM_ALONG - rc.along) / DEG : 3;
        }

        // ------------------------------------------------------------ scoring
        public class ARow
        {
            public string Key, Name, Val, Std;
            public bool Pass;
            public double? Score;
            public double? Pct, Max, Tol;
        }
        class TgtQ { public double Tv, Tol, PctRaw, Max; public bool Pass; public double Score; }
        static TgtQ ScoreTarget(List<RecSample> xs, List<int> idx, Func<RecSample, int, double> get, double tv, double tol)
        {
            int n = 0, inT = 0; double max = 0;
            foreach (var i in idx)
            {
                double d = get(xs[i], i);
                if (double.IsNaN(d) || double.IsInfinity(d)) continue;
                n++; if (Math.Abs(d) <= tol) inT++; max = Math.Max(max, Math.Abs(d));
            }
            if (n == 0) return null;
            double pct = (double)inT / n;
            return new TgtQ { Tv = tv, Tol = tol, PctRaw = pct, Max = R1(max), Pass = pct >= 0.85 && max <= tol * 1.6, Score = pct };
        }
        static readonly Dictionary<string, (string lab, string unit)> LABEL = new Dictionary<string, (string, string)>
        {
            { "spd", ("速度", "kt") }, { "alt", ("高度", "ft") }, { "hdg", ("針路", "°") }, { "abank", ("バンク", "°") }, { "gp", ("進入角", "°") }, { "cl", ("センターライン", "m") },
        };
        public class TgtIn { public object V; public double? Tol; }   // V: double | Func<int, double>
        public class Window
        {
            public string Name; public double T0, T1, Score; public bool Pass;
            public List<ARow> Rows = new List<ARow>();
        }
        public static Window ScoreWindow(List<RecSample> xs, string name, double t0, double t1, Dictionary<string, TgtIn> targets)
        {
            var idx = new List<int>();
            for (int i = 0; i < xs.Count; i++) if (xs[i].T >= t0 && xs[i].T <= t1) idx.Add(i);
            if (idx.Count < 5) return null;
            Func<TgtIn, int, double> val = (spec, i) => spec.V is Func<int, double> ? ((Func<int, double>)spec.V)(i) : (double)spec.V;
            var dev = new Dictionary<string, Func<TgtIn, Func<RecSample, int, double>>>
            {
                { "spd", spec => (x, i) => x.Ias - val(spec, i) },
                { "alt", spec => (x, i) => AltFtOf(x) - val(spec, i) },
                { "hdg", spec => (x, i) => W180(AttOf(x).Hdg - val(spec, i)) },
                { "abank", spec => (x, i) => Math.Abs(AttOf(x).Bank) - val(spec, i) },
                { "gp", spec => (x, i) => GpOf(x) - val(spec, i) },
                { "cl", spec => (x, i) => RwyCoords(x.N, x.E).cross - val(spec, i) },
            };
            var rows = new List<ARow>();
            foreach (var kv in targets)
            {
                var spec = kv.Value; if (spec == null) continue;
                double tol = spec.Tol ?? TOL[kv.Key];
                var q = ScoreTarget(xs, idx, dev[kv.Key](spec), spec.V is Func<int, double> ? 0 : (double)spec.V, tol);
                if (q == null) continue;
                var lab = LABEL.ContainsKey(kv.Key) ? LABEL[kv.Key] : (kv.Key, "");
                rows.Add(new ARow { Key = kv.Key, Name = lab.Item1, Val = $"{Js.Round(q.PctRaw * 100)}% が基準内（最大のずれ {q.Max} {lab.Item2}）", Std = $"±{tol} {lab.Item2}", Pass = q.Pass, Score = q.Score, Pct = Js.Round(q.PctRaw * 100), Max = q.Max, Tol = tol });
            }
            if (rows.Count == 0) return null;
            double score = rows.Average(r => r.Score.Value);
            return new Window { Name = name, T0 = xs[idx[0]].T, T1 = xs[idx[idx.Count - 1]].T, Rows = rows, Score = Js.Round(score * 100) / 100, Pass = rows.TrueForAll(r => r.Pass) };
        }
        static double Median(List<double> v) { var a = v.OrderBy(x => x).ToList(); return a.Count > 0 ? a[a.Count / 2] : 0; }
        static double CircMedianDeg(List<double> v)
        {
            if (v.Count == 0) return 0;
            double ref0 = v[0];
            var u = v.Select(x => ref0 + W180(x - ref0)).ToList();
            return W360(Median(u));
        }
        public static List<Window> FindManeuvers(List<RecSample> xs, double minLevelSec = 12, double minTurnSec = 8)
        {
            var outL = new List<Window>();
            if (xs == null || xs.Count < 50) return outL;
            int minLevel = (int)(minLevelSec * 10), minTurn = (int)(minTurnSec * 10);
            string runKind = null; int runFrom = 0, runSign = 1;
            Action<int> flush = (to) =>
            {
                if (runKind == null) return;
                var idx = new List<int>(); for (int i = runFrom; i <= to; i++) idx.Add(i);
                if (runKind == "level" && idx.Count >= minLevel)
                {
                    double altT = Js.Round(Median(idx.Select(i => AltFtOf(xs[i])).ToList()) / 50) * 50;
                    double hdgT = Js.Round(CircMedianDeg(idx.Select(i => AttOf(xs[i]).Hdg).ToList()));
                    double spdT = Js.Round(Median(idx.Select(i => xs[i].Ias).ToList()));
                    var w = ScoreWindow(xs, "直線水平（保持）", xs[runFrom].T, xs[to].T, new Dictionary<string, TgtIn>
                        { { "alt", new TgtIn { V = altT, Tol = TOL["alt"] } }, { "hdg", new TgtIn { V = hdgT, Tol = TOL["hdg"] } }, { "spd", new TgtIn { V = spdT, Tol = TOL["spd"] } } });
                    if (w != null) outL.Add(w);
                }
                else if (runKind == "turn" && idx.Count >= minTurn)
                {
                    double altT = Js.Round(Median(idx.Select(i => AltFtOf(xs[i])).ToList()) / 50) * 50;
                    double bankT = Js.Round(Median(idx.Select(i => Math.Abs(AttOf(xs[i]).Bank)).ToList()));
                    var w = ScoreWindow(xs, runSign > 0 ? "右旋回（保持）" : "左旋回（保持）", xs[runFrom].T, xs[to].T, new Dictionary<string, TgtIn>
                        { { "alt", new TgtIn { V = altT, Tol = TOL["alt"] } }, { "abank", new TgtIn { V = bankT, Tol = TOL["bank"] } } });
                    if (w != null) outL.Add(w);
                }
                runKind = null;
            };
            for (int i = 0; i < xs.Count; i++)
            {
                var x = xs[i];
                bool air = !x.OnGround && AglFtOf(x) > 30;
                double bank = AttOf(x).Bank, vs = VsAt(xs, i);
                string kind = !air ? null : Math.Abs(bank) >= 15 ? "turn" : Math.Abs(bank) <= 12 && Math.Abs(vs) <= 250 ? "level" : null;
                int sign = bank >= 0 ? 1 : -1;
                if (runKind == null || runKind != kind || (kind == "turn" && runSign != sign))
                {
                    flush(i - 1);
                    if (kind != null) { runKind = kind; runFrom = i; runSign = sign; }
                }
            }
            flush(xs.Count - 1);
            return outL.Take(6).ToList();
        }

        // ------------------------------------------------------------ gate + landings
        public class GateEl { public double? V, Dev; public bool Pass; }
        public class Gate
        {
            public double T, Agl, Along;
            public GateEl Spd, Gp, Vs, Flap, Gear;
            public GateEl Cross;
            public bool Stable;
        }
        public class GateOpts { public double Vref = 70; public double? FlapMinDeg; public bool GearRequired; }
        public static Gate GateAt(List<RecSample> xs, int before, GateOpts opts = null)
        {
            opts = opts ?? new GateOpts();
            double vref = opts.Vref, flapMin = opts.FlapMinDeg ?? 25;
            int g = -1;
            for (int i = Math.Min(before, xs.Count - 1); i > 0; i--)
            {
                if (AglFtOf(xs[i]) <= GATE_AGL_FT && AglFtOf(xs[i - 1]) > GATE_AGL_FT && !xs[i].OnGround) { g = i; break; }
                if (xs[i].OnGround && i < before) break;
                if (AglFtOf(xs[i]) > 1500) break;
            }
            if (g < 0) return null;
            var x = xs[g]; var rc = RwyCoords(x.N, x.E);
            double vs = VsAt(xs, g), gp = GpOf(x), spdDev = x.Ias - vref;
            var gate = new Gate
            {
                T = x.T, Agl = Js.Round(AglFtOf(x)), Along = Js.Round(rc.along),
                Spd = new GateEl { V = R1(x.Ias), Dev = R1(spdDev), Pass = Math.Abs(spdDev) <= TOL["spd"] },
                Gp = new GateEl { V = R1(gp), Dev = R1(gp - 3), Pass = Math.Abs(gp - 3) <= TOL["gp"] },
                Vs = new GateEl { V = Js.Round(vs), Pass = vs <= -200 && vs >= -1000 },
                Flap = new GateEl { V = Js.Round(x.Flap), Pass = x.Flap >= flapMin },
                Gear = opts.GearRequired ? new GateEl { V = R1(x.Gear), Pass = x.Gear >= 0.98 } : new GateEl { V = null, Pass = true },
                Cross = new GateEl { V = R1(rc.cross) },
            };
            gate.Stable = gate.Spd.Pass && gate.Gp.Pass && gate.Vs.Pass && gate.Flap.Pass && gate.Gear.Pass;
            return gate;
        }
        public class Landing
        {
            public double T; public int I, Along, SinkFpm, Bounces;
            public double Cross, Ias, Gs, DevAim;
            public double? FloatM;
            public bool InZone, OnRunway;
            public Gate Gate;
        }
        public static List<Landing> FindLandings(List<RecSample> xs, GateOpts opts = null)
        {
            opts = opts ?? new GateOpts();
            var outL = new List<Landing>();
            if (xs == null || xs.Count == 0) return outL;
            double airMax = 0; bool wasAir = false;
            for (int i = 1; i < xs.Count; i++)
            {
                var x = xs[i];
                bool air = !x.OnGround && AglFtOf(x) > 20;
                if (air) { airMax = Math.Max(airMax, AglFtOf(x)); wasAir = true; continue; }
                if (x.OnGround && wasAir)
                {
                    if (airMax > 100)
                    {
                        var rc = RwyCoords(x.N, x.E);
                        double? floatM = null;
                        for (int j = i - 1; j >= 0; j--)
                        {
                            if (AglFtOf(xs[j]) >= 50) { floatM = Math.Max(0, rc.along - RwyCoords(xs[j].N, xs[j].E).along); break; }
                            if (xs[j].OnGround) break;
                        }
                        int j2 = i - 1; while (j2 > 0 && xs[i - 1].T - xs[j2].T < 1.0) j2--;
                        double dtS = xs[i - 1].T - xs[j2].T;
                        double sink = dtS > 0.2 ? (AltFtOf(xs[j2]) - AltFtOf(xs[i - 1])) / dtS * 60 : -VsAt(xs, i - 1);
                        outL.Add(new Landing
                        {
                            T = x.T, I = i, Along = (int)Js.Round(rc.along), Cross = R1(rc.cross), SinkFpm = (int)Js.Round(sink),
                            Ias = R1(x.Ias), Gs = R1(x.Gs), FloatM = floatM == null ? null : (double?)Js.Round(floatM.Value),
                            DevAim = Js.Round(rc.along - AIM_ALONG), InZone = rc.along >= TD_ZONE.from && rc.along <= TD_ZONE.to,
                            OnRunway = rc.along >= 0 && rc.along <= RWY.len && Math.Abs(rc.cross) <= RWY.wid / 2,
                            Bounces = 0, Gate = GateAt(xs, i, opts),
                        });
                    }
                    wasAir = false; airMax = 0;
                }
                if (x.OnGround) airMax = 0;
            }
            for (int k = 0; k < outL.Count; k++)
            {
                int hops = 0; double up = 0;
                for (int i = outL[k].I + 1; i < xs.Count && xs[i].T - outL[k].T < 20; i++)
                {
                    if (!xs[i].OnGround) up = Math.Max(up, AglFtOf(xs[i]));
                    else if (up > 3) { hops++; up = 0; }
                }
                outL[k].Bounces = hops;
            }
            return outL;
        }

        // ------------------------------------------------------------ whole recording
        public class AnalysisResult
        {
            public int V = 1, Samples;
            public double Dur;
            public List<Window> Maneuvers = new List<Window>();
            public List<Landing> Landings = new List<Landing>();
            public Gate Gate;
        }
        public static AnalysisResult AnalyzeRecording(Recording rec, GateOpts opts = null)
        {
            opts = opts ?? new GateOpts();
            var xs = rec?.Samples;
            if (xs == null || xs.Count == 0) return null;
            var landings = FindLandings(xs, opts);
            var maneuvers = FindManeuvers(xs);
            if (landings.Count > 0)
            {
                var td = landings[landings.Count - 1];
                var w = ScoreWindow(xs, "最終進入", Math.Max(0, td.T - 90), td.T, new Dictionary<string, TgtIn>
                    { { "spd", new TgtIn { V = opts.Vref, Tol = TOL["spd"] } }, { "gp", new TgtIn { V = 3.0, Tol = TOL["gp"] } }, { "cl", new TgtIn { V = 0.0, Tol = TOL["cl"] } } });
                if (w != null) maneuvers.Add(w);
            }
            var gate = landings.Count > 0 ? landings[landings.Count - 1].Gate : GateAt(xs, xs.Count - 1, opts);
            return new AnalysisResult { Samples = xs.Count, Dur = R1(xs[xs.Count - 1].T - xs[0].T), Maneuvers = maneuvers, Landings = landings, Gate = gate };
        }

        public class RowGroup { public string Step; public List<Row> Rows = new List<Row>(); }
        public static List<RowGroup> AnalysisRows(AnalysisResult a)
        {
            var groups = new List<RowGroup>();
            if (a == null) return groups;
            if (a.Maneuvers.Count > 0)
            {
                var rows = new List<Row>();
                foreach (var m in a.Maneuvers) foreach (var r in m.Rows)
                    rows.Add(new Row { Name = $"{m.Name}：{r.Name}", Val = r.Val, Std = r.Std, Pass = r.Pass, Score = r.Score, Key = r.Key, Pct = r.Pct, Max = r.Max, Tol = r.Tol });
                groups.Add(new RowGroup { Step = "操縦標準（実技試験の公差）", Rows = rows });
            }
            if (a.Gate != null)
            {
                var g = a.Gate;
                var rows = new List<Row>
                {
                    new Row { Name = "速度", Val = $"{g.Spd.V} kt（基準速度との差 {(g.Spd.Dev >= 0 ? "+" : "")}{g.Spd.Dev} kt）", Std = "基準速度 ±10 kt", Pass = g.Spd.Pass },
                    new Row { Name = "グライドパス", Val = $"{g.Gp.V}°", Std = "3 ±0.9°", Pass = g.Gp.Pass },
                    new Row { Name = "降下率", Val = $"{g.Vs.V} fpm", Std = "−200 〜 −1,000 fpm", Pass = g.Vs.Pass },
                    new Row { Name = "構成（フラップ）", Val = $"{g.Flap.V}°", Std = "着陸フラップ", Pass = g.Flap.Pass },
                };
                if (g.Gear.V != null) rows.Add(new Row { Name = "構成（ギア）", Val = g.Gear.V >= 0.98 ? "DOWN" : "未降下", Std = "DOWN", Pass = g.Gear.Pass });
                rows.Add(new Row { Name = "ゲート判定", Val = g.Stable ? "STABLE（安定）" : "UNSTABLE（不安定：ゴーアラウンド相当）", Std = "全要素が基準内", Pass = g.Stable });
                groups.Add(new RowGroup { Step = "安定進入ゲート（500 ft AGL）", Rows = rows });
            }
            if (a.Landings.Count > 0)
            {
                var rows = new List<Row>();
                for (int i = 0; i < a.Landings.Count; i++)
                {
                    var Ld = a.Landings[i];
                    rows.Add(new Row
                    {
                        Name = $"接地 {i + 1}",
                        Val = $"滑走路端から {Ld.Along} m（目標点 {School.Num0(AIM_ALONG)} m との差 {(Ld.DevAim >= 0 ? "+" : "")}{School.Num0(Ld.DevAim)} m）・沈下 {Ld.SinkFpm} fpm・センターライン {(Ld.Cross >= 0 ? "+" : "")}{Ld.Cross} m・フロート {(Ld.FloatM == null ? "—" : Ld.FloatM + " m")}{(Ld.Bounces > 0 ? $"・バウンド {Ld.Bounces}" : "")}",
                        Std = $"接地帯 {School.Num0(TD_ZONE.from)}〜{School.Num0(TD_ZONE.to)} m・沈下 300 fpm 以下",
                        Pass = Ld.InZone && Ld.SinkFpm <= 300,
                    });
                }
                groups.Add(new RowGroup { Step = "着陸分析", Rows = rows });
            }
            return groups;
        }

        // ------------------------------------------------------------ logbook compact form
        static double? NGet(Dict d, string k) { var v = Js.Get(d, k); return v is double && !double.IsNaN((double)v) && !double.IsInfinity((double)v) ? (double?)v : null; }
        static double? Num(double? v, double lo, double hi) { return v != null && !double.IsNaN(v.Value) && !double.IsInfinity(v.Value) ? (double?)Clamp(Js.Round(v.Value * 10) / 10, lo, hi) : null; }
        public static Dict CompactAnalysis(AnalysisResult a)
        {
            if (a == null) return null;
            var Ld = a.Landings.Count > 0 ? a.Landings[a.Landings.Count - 1] : null;
            var g = a.Gate;
            var man = new Lst();
            foreach (var m in a.Maneuvers.Take(6))
                man.Add(new Dict { { "name", (m.Name ?? "").Length > 20 ? m.Name.Substring(0, 20) : m.Name ?? "" }, { "score", Num(m.Score, 0, 1) } });
            return new Dict
            {
                { "td", Ld == null ? null : new Dict { { "along", Num(Ld.Along, -2000, 4000) }, { "cross", Num(Ld.Cross, -500, 500) }, { "sink", Num(Ld.SinkFpm, -2000, 3000) }, { "float", Ld.FloatM == null ? null : Num(Ld.FloatM, 0, 4000) }, { "zone", Ld.InZone } } },
                { "gate", g == null ? null : new Dict { { "stable", g.Stable }, { "ias", Num(g.Spd.V, 0, 300) }, { "gp", Num(g.Gp.V, 0, 15) }, { "vs", Num(g.Vs.V, -3000, 1000) } } },
                { "man", man },
            };
        }
        public static Dict CleanAnalysis(Dict a)
        {
            if (a == null) return null;
            var tdO = Js.Obj(Js.Get(a, "td"));
            Dict td = null;
            if (tdO != null)
            {
                var t = new Dict
                {
                    { "along", Num(NGet(tdO, "along"), -2000, 4000) }, { "cross", Num(NGet(tdO, "cross"), -500, 500) },
                    { "sink", Num(NGet(tdO, "sink"), -2000, 3000) },
                    { "float", Js.Get(tdO, "float") == null ? null : Num(NGet(tdO, "float"), 0, 4000) },
                    { "zone", CareerLogic.Truthy(Js.Get(tdO, "zone")) },
                };
                if (t["along"] != null || t["sink"] != null) td = t;
            }
            var gO = Js.Obj(Js.Get(a, "gate"));
            Dict gate = gO == null ? null : new Dict
            {
                { "stable", CareerLogic.Truthy(Js.Get(gO, "stable")) }, { "ias", Num(NGet(gO, "ias"), 0, 300) },
                { "gp", Num(NGet(gO, "gp"), 0, 15) }, { "vs", Num(NGet(gO, "vs"), -3000, 1000) },
            };
            var man = new Lst();
            var manA = Js.Arr(Js.Get(a, "man"));
            if (manA != null) foreach (var m0 in manA.Take(6))
            {
                var m = Js.Obj(m0); if (m == null) continue;
                string nm = Js.Str(m, "name") ?? "";
                if (nm.Length > 20) nm = nm.Substring(0, 20);
                if (nm.Length == 0) continue;
                man.Add(new Dict { { "name", nm }, { "score", Num(NGet(m, "score"), 0, 1) } });
            }
            if (td == null && gate == null && man.Count == 0) return null;
            return new Dict { { "td", td }, { "gate", gate }, { "man", man } };
        }
        public class HistEntry
        {
            public string Date, Lesson;
            public double? Along, Cross, Sink, Float;
            public bool Zone;
            public Dict Gate;
        }
        public static List<HistEntry> LandingHistory(List<Dict> entries)
        {
            var outL = new List<HistEntry>();
            if (entries == null) return outL;
            foreach (var e in entries)
            {
                if (e == null) continue;
                var lessons = Js.Arr(Js.Get(e, "lessons"));
                if (lessons == null) continue;
                foreach (var l0 in lessons)
                {
                    var l = Js.Obj(l0); if (l == null) continue;
                    var ana = Js.Obj(Js.Get(l, "ana")); if (ana == null) continue;
                    var td = Js.Obj(Js.Get(ana, "td")); if (td == null) continue;
                    outL.Add(new HistEntry
                    {
                        Date = Js.Str(e, "date") ?? "", Lesson = Js.Str(l, "id") ?? "",
                        Along = NGet(td, "along"), Cross = NGet(td, "cross"), Sink = NGet(td, "sink"), Float = NGet(td, "float"),
                        Zone = CareerLogic.Truthy(Js.Get(td, "zone")), Gate = Js.Obj(Js.Get(ana, "gate")),
                    });
                }
            }
            return outL;
        }
        public class LandStats
        {
            public int N, AlongMean, AlongSd, SinkMean, SinkMax, FloatMean, InZonePct;
            public double CrossAbsMean;
            public int? GateStablePct;
        }
        public static LandStats LandingStats(List<HistEntry> list)
        {
            var xs = (list ?? new List<HistEntry>()).FindAll(x => x != null && x.Along != null);
            if (xs.Count == 0) return null;
            Func<Func<HistEntry, double>, double> mean = f => xs.Average(x => f(x));
            double alongMean = mean(x => x.Along.Value);
            double sd = Math.Sqrt(xs.Sum(x => Math.Pow(x.Along.Value - alongMean, 2)) / xs.Count);
            var gates = xs.FindAll(x => x.Gate != null);
            return new LandStats
            {
                N = xs.Count, AlongMean = (int)Js.Round(alongMean), AlongSd = (int)Js.Round(sd),
                SinkMean = (int)Js.Round(mean(x => x.Sink ?? 0)), SinkMax = (int)Js.Round(xs.Max(x => x.Sink ?? 0)),
                CrossAbsMean = R1(mean(x => Math.Abs(x.Cross ?? 0))), FloatMean = (int)Js.Round(mean(x => x.Float ?? 0)),
                InZonePct = (int)Js.Round((double)xs.Count(x => x.Zone) / xs.Count * 100),
                GateStablePct = gates.Count > 0 ? (int?)Js.Round((double)gates.Count(x => CareerLogic.Truthy(Js.Get(x.Gate, "stable"))) / gates.Count * 100) : null,
            };
        }
        public static string Sparkline(List<double> values, bool invert = false)
        {
            var vs = (values ?? new List<double>()).FindAll(v => !double.IsNaN(v) && !double.IsInfinity(v));
            if (vs.Count == 0) return "";
            const string B = "▁▂▃▄▅▆▇█";
            double lo = vs.Min(), hi = vs.Max();
            if (hi - lo < 1e-9) { lo -= 0.5; hi += 0.5; }
            var chars = new List<char>();
            foreach (var v in vs) chars.Add(B[(int)Clamp(Js.Round((invert ? hi - v : v - lo) / (hi - lo) * 7), 0, 7)]);
            return new string(chars.ToArray());
        }

        // ------------------------------------------------------------ profile.js
        public class Series { public List<double> T, Alt, Ias; public double Dur; }
        public static Series SeriesOf(Recording rec, int maxPts = 240)
        {
            var xs = rec?.Samples;
            if (xs == null || xs.Count == 0) return null;
            double t0 = xs[0].T;
            int step = Math.Max(1, (int)Math.Ceiling((double)xs.Count / Math.Max(2, maxPts)));
            var t = new List<double>(); var alt = new List<double>(); var ias = new List<double>();
            for (int i = 0; i < xs.Count; i += step) { var x = xs[i]; t.Add(R1(x.T - t0)); alt.Add(Js.Round(AltFtOf(x))); ias.Add(R1(x.Ias)); }
            var lastX = xs[xs.Count - 1];
            if (t[t.Count - 1] != R1(lastX.T - t0)) { t.Add(R1(lastX.T - t0)); alt.Add(Js.Round(AltFtOf(lastX))); ias.Add(R1(lastX.Ias)); }
            return new Series { T = t, Alt = alt, Ias = ias, Dur = R1(lastX.T - t0) };
        }
        public class TdProfile
        {
            public List<double> Dt, Agl, Ias;
            public double TdAt;
            public double? GateDt;
            public int SinkFpm, Along;
            public double? FloatM;
        }
        public static TdProfile TouchdownOf(Recording rec, AnalysisResult a)
        {
            var xs = rec?.Samples;
            var td = a != null && a.Landings.Count > 0 ? a.Landings[a.Landings.Count - 1] : null;
            if (xs == null || xs.Count == 0 || td == null) return null;
            int lo = Math.Max(0, td.I - 300), hi = Math.Min(xs.Count - 1, td.I + 50);
            var dt = new List<double>(); var agl = new List<double>(); var ias = new List<double>();
            for (int i = lo; i <= hi; i++) { var x = xs[i]; dt.Add(R1(x.T - td.T)); agl.Add(Js.Round(AglFtOf(x))); ias.Add(R1(x.Ias)); }
            return new TdProfile { Dt = dt, Agl = agl, Ias = ias, TdAt = 0, GateDt = td.Gate != null ? (double?)R1(td.Gate.T - td.T) : null, SinkFpm = td.SinkFpm, Along = td.Along, FloatM = td.FloatM };
        }
        public class Scaled { public List<(double x, double y)> Pts; public double Min, Max; }
        public static Scaled ScaleLine(List<double> vals, double w, double h, double pad = 4, (double, double)? range = null)
        {
            if (vals == null || vals.Count == 0) return new Scaled { Pts = new List<(double, double)>(), Min = 0, Max = 0 };
            double min = range != null ? range.Value.Item1 : vals.Min();
            double max = range != null ? range.Value.Item2 : vals.Max();
            if (!(max > min)) max = min + 1;
            double iw = Math.Max(1, w - pad * 2), ih = Math.Max(1, h - pad * 2);
            var pts = new List<(double, double)>();
            for (int i = 0; i < vals.Count; i++)
                pts.Add((pad + (vals.Count == 1 ? iw / 2 : (double)i / (vals.Count - 1) * iw), pad + ih - (vals[i] - min) / (max - min) * ih));
            return new Scaled { Pts = pts, Min = min, Max = max };
        }
        public static (Scaled a, Scaled b) PanelGeometry(List<double> a, List<double> b, double w, double h)
        {
            return (ScaleLine(a, w, h), ScaleLine(b, w, h));
        }
    }
}
