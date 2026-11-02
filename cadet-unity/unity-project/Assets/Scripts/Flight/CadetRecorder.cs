// CADET — CadetRecorder.cs : cadet/src/flight/recorder.js ported — the 10 Hz
// flight recorder, playback interpolation, and the CSV / GPX exports.
// Snapshots are taken from this port's FL State (recorder.js reads the CADET
// bridge state; the fields map 1:1, position via School.Ne).
using System;
using System.Collections.Generic;
using System.Globalization;

using Dict = System.Collections.Generic.Dictionary<string, object>;

namespace Cadet
{
    public class RecSample
    {
        public double T, N, E, H, Ias, Gs, Vs, Alt, PIn, RIn, Rud, Thr, Gear, Flap, Rpm;
        public double[] Q = { 0, 0, 0, 1 };
        public bool OnGround, Failed;
        public RecSample Clone() { var c = (RecSample)MemberwiseClone(); c.Q = (double[])Q.Clone(); return c; }
    }
    public class Recording
    {
        public Dict Meta = new Dict();
        public List<RecSample> Samples = new List<RecSample>();
    }

    public class Recorder
    {
        public const int REC_HZ = 10;
        const double DT = 1.0 / REC_HZ;
        Recording _cur, _last;

        public static RecSample Snapshot(State s, double t)
        {
            var x = new RecSample();
            if (s == null) { x.T = t; return x; }
            var o = s.Out; var e0 = s.Eng.Count > 0 ? s.Eng[0] : new EngState();
            var ne = School.Ne(s);
            x.T = t; x.N = ne.N; x.E = ne.E; x.H = s.Pos[1];
            x.Q = s.Q != null && s.Q.Length >= 4 ? (double[])s.Q.Clone() : new double[] { 0, 0, 0, 1 };
            x.Ias = o.Ias; x.Gs = o.Gs; x.Vs = o.Vsi; x.Alt = o.AltTrue;
            x.PIn = s.PIn; x.RIn = s.RIn; x.Rud = s.Rud;
            x.Thr = e0.Thr ?? s.Thr;
            x.Gear = s.GearPos; x.Flap = s.FlapDeg;
            x.OnGround = s.OnGround;
            x.Rpm = e0.Rpm; x.Failed = e0.Failed;
            return x;
        }

        public Recording Start(Dict meta = null)
        {
            _cur = new Recording { Meta = meta != null ? new Dict(meta) : new Dict() };
            return _cur;
        }
        public void Push(State s, double t)
        {
            if (_cur == null || s == null) return;
            var last = _cur.Samples.Count > 0 ? _cur.Samples[_cur.Samples.Count - 1] : null;
            if (last != null && t - last.T < DT - 1e-9) return;
            _cur.Samples.Add(Snapshot(s, t));
        }
        public void Mark(State s, double t) { if (_cur != null && s != null) _cur.Samples.Add(Snapshot(s, t)); }
        public Recording Done() { var r = _cur; _cur = null; if (r != null && r.Samples.Count > 0) _last = r; return r; }
        public bool RecordingNow { get { return _cur != null; } }
        public Recording Current { get { return _cur; } }
        public Recording Last { get { return _last; } }
        public void Clear() { _last = null; }

        public static RecSample SampleAt(Recording rec, double t)
        {
            var xs = rec?.Samples;
            if (xs == null || xs.Count == 0) return null;
            if (t <= xs[0].T) return xs[0].Clone();
            var lastX = xs[xs.Count - 1];
            if (t >= lastX.T) return lastX.Clone();
            int lo = 0, hi = xs.Count - 1;
            while (hi - lo > 1) { int mid = (lo + hi) >> 1; if (xs[mid].T <= t) lo = mid; else hi = mid; }
            var a = xs[lo]; var b = xs[hi];
            double span = Math.Max(1e-9, b.T - a.T), f = (t - a.T) / span;
            Func<Func<RecSample, double>, double> mix = g => g(a) + (g(b) - g(a)) * f;
            double ax = a.Q[0], ay = a.Q[1], az = a.Q[2], aw = a.Q[3];
            double bx = b.Q[0], by = b.Q[1], bz = b.Q[2], bw = b.Q[3];
            double dot = ax * bx + ay * by + az * bz + aw * bw, s0, s1;
            if (dot < 0) { dot = -dot; s1 = -1; } else s1 = 1;
            if (dot > 0.9995) { s0 = 1 - f; s1 = s1 * f; }
            else { double th = Math.Acos(Math.Min(1, dot)), sn = Math.Sin(th); s0 = Math.Sin((1 - f) * th) / sn; s1 = s1 * Math.Sin(f * th) / sn; }
            return new RecSample
            {
                T = t, N = mix(x => x.N), E = mix(x => x.E), H = mix(x => x.H),
                Q = new[] { ax * s0 + bx * s1, ay * s0 + by * s1, az * s0 + bz * s1, aw * s0 + bw * s1 },
                Ias = mix(x => x.Ias), Gs = mix(x => x.Gs), Vs = mix(x => x.Vs), Alt = mix(x => x.Alt),
                PIn = mix(x => x.PIn), RIn = mix(x => x.RIn), Rud = mix(x => x.Rud), Thr = mix(x => x.Thr),
                Gear = mix(x => x.Gear), Flap = mix(x => x.Flap), OnGround = f < 0.5 ? a.OnGround : b.OnGround,
                Rpm = mix(x => x.Rpm), Failed = a.Failed || b.Failed,
            };
        }

        public static double Duration(Recording rec)
        {
            var xs = rec?.Samples;
            return xs != null && xs.Count > 0 ? xs[xs.Count - 1].T - xs[0].T : 0;
        }

        static string F(double v, int dp) { return v.ToString("F" + dp, CultureInfo.InvariantCulture); }
        public static string ToCSV(Recording rec)
        {
            var lines = new List<string> { "t_s,north_m,east_m,height_m,ias_kt,gs_kt,vs_fpm,alt_ft,pitch_in,roll_in,rudder,thr,gear,flap_deg,on_ground,rpm" };
            foreach (var x in rec.Samples)
                lines.Add(string.Join(",", new[]
                {
                    F(x.T, 1), F(x.N, 1), F(x.E, 1), F(x.H, 1), F(x.Ias, 1), F(x.Gs, 1),
                    Js.Round(x.Vs).ToString(CultureInfo.InvariantCulture), Js.Round(x.Alt).ToString(CultureInfo.InvariantCulture),
                    F(x.PIn, 3), F(x.RIn, 3), F(x.Rud, 3), F(x.Thr, 3), F(x.Gear, 2),
                    Js.Round(x.Flap).ToString(CultureInfo.InvariantCulture), x.OnGround ? "1" : "0", Js.Round(x.Rpm).ToString(CultureInfo.InvariantCulture),
                }));
            return string.Join("\n", lines) + "\n";
        }

        public static string ToGPX(Recording rec, Func<double[], double[]> toLatLon)   // JS: toLatLon([n, e]) -> [lat, lon]
        {
            Func<object, string> esc = v => (v == null ? "" : v.ToString()).Replace("&", "&amp;").Replace("<", "&lt;");
            object title = rec.Meta != null && rec.Meta.ContainsKey("title") ? rec.Meta["title"] : null;
            string name = esc(title ?? "CADET flight");
            DateTime t0 = DateTime.MinValue; bool hasT0 = false;
            object iso = rec.Meta != null && rec.Meta.ContainsKey("startISO") ? rec.Meta["startISO"] : null;
            if (iso is string && DateTime.TryParse((string)iso, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed)) { t0 = parsed; hasT0 = true; }
            var pts = new List<string>();
            foreach (var x in rec.Samples)
            {
                var ll = toLatLon(new[] { x.N, x.E });
                string when = hasT0 ? $"<time>{t0.AddSeconds(x.T).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture)}</time>" : "";
                pts.Add($"      <trkpt lat=\"{F(ll[0], 6)}\" lon=\"{F(ll[1], 6)}\"><ele>{F(x.H, 1)}</ele>{when}</trkpt>");
            }
            return $"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<gpx version=\"1.1\" creator=\"CADET\" xmlns=\"http://www.topografix.com/GPX/1/1\">\n  <metadata><name>{name}</name></metadata>\n  <trk><name>{name}</name><trkseg>\n{string.Join("\n", pts)}\n  </trkseg></trk>\n</gpx>\n";
        }
    }
}
