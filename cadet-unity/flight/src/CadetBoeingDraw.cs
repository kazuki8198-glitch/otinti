// CadetBoeingDraw.cs — the 737's display drawing, ported line for line from
// boeing.js's draw functions (PFD / ND / EICAS upper+lower / standby / CDU)
// and its update() scheduler (rates, DU source selection, power blanking,
// the route hand-off). Drawing goes through IBCanvas: the headless harness
// records the op stream (BotBoeingCs vs golden-boeing.jsonl), the Unity
// layer rasterizes it (BoeingGlassMain).
//
// Faithful-port note: boeing.js reads `o.hdg` for the PFD heading strip and
// the ND compass, but physics.js's out record has no `hdg` field (only
// hdgTrue) — so in the original those two readouts sit at 000 / north. This
// port reproduces that (Hdg = 0) rather than silently diverging; the defect
// is the original's, flagged in STAGE7-REPORT.md.
using System;
using System.Collections.Generic;
using System.Globalization;

namespace Cadet
{
    public struct FontSpec
    {
        public double Size; public int Weight; public bool Mono;
        public FontSpec(double size, int weight, bool mono) { Size = size; Weight = weight; Mono = mono; }
    }

    public interface IBCanvas
    {
        string FillStyle { get; set; }
        string StrokeStyle { get; set; }
        double LineWidth { get; set; }
        FontSpec Font { get; set; }
        string TextAlign { get; set; }
        string TextBaseline { get; set; }
        void Save(); void Restore();
        void BeginPath(); void Arc(double x, double y, double r, double a0, double a1);
        void Rect(double x, double y, double w, double h);
        void MoveTo(double x, double y); void LineTo(double x, double y); void ClosePath();
        void Clip(); void Fill(); void Stroke();
        void Translate(double x, double y); void Rotate(double a); void Scale(double x, double y);
        void FillRect(double x, double y, double w, double h);
        void StrokeRect(double x, double y, double w, double h);
        void FillText(string str, double x, double y);
        void SetLineDash(double[] d);
    }

    public class BoeingUnit { public IBCanvas G; public int W, H; }

    // the eng snapshot fly-mode hands the glass (systems' twin lives + elec + the brake)
    public class BoeingEngView
    {
        public TwinEng[] Twin;          // systems' twin array (oil pressure / temp per engine)
        public bool AltFail;            // sys.elec.altFail
        public bool ParkBrake;          // the controls' parking brake
    }

    public class BoeingFrame
    {
        public State S; public AvionicsState Av; public BoeingEngView Eng;
        public bool ElecPfd = true; public BoeingRoute Route;
    }

    public class BoeingGlass
    {
        public readonly BoeingState State;
        public readonly Dictionary<string, BoeingUnit> Units = new Dictionary<string, BoeingUnit>();
        public readonly Dictionary<string, int> Stats = new Dictionary<string, int> { { "pfd", 0 }, { "nd", 0 }, { "eicasU", 0 }, { "eicasL", 0 }, { "cdu", 0 }, { "stby", 0 } };
        public int Bytes;

        double tPfd = 1, tNd = 1, tEicas = 1, tCdu = 1, tStby = 1;
        bool blanked; BoeingRoute routeSeen; bool routeSeenSet;
        double gearTransitT;

        static class C
        {
            public const string Green = "#3ae06a", Magenta = "#ff4fd8", Cyan = "#35d3e8", Amber = "#ffb02e", Red = "#ff3b30",
                White = "#e8f2f8", Dim = "#8fa5b5", Sky = "#2f7fd0", Gnd = "#a06a28", Tape = "rgba(8,12,16,0.72)",
                Line = "#cfe3ee", Dark = "#05070a";
        }
        const double KG_PER_GAL = 3.04;

        public BoeingGlass(BoeingState state, Func<int, int, IBCanvas> factory)
        {
            State = state;
            State.Cdu.Dirty = true;   // createBoeingGlass's initial cdu state (the first update draws it)
            Add("pfd", 1024, 768, factory); Add("nd", 1024, 768, factory);
            Add("eicasU", 1024, 768, factory); Add("eicasL", 768, 576, factory);
            Add("cdu", 512, 640, factory); Add("stby", 384, 384, factory);
            Bytes = 0;
            foreach (var u in Units.Values) Bytes += (int)Math.Round(u.W * (double)u.H * 4 / 3);
        }
        void Add(string k, int w, int h, Func<int, int, IBCanvas> f)
        {
            var g = f(w, h);
            g.FillStyle = "#000"; g.FillRect(0, 0, w, h);
            Units[k] = new BoeingUnit { G = g, W = w, H = h };
        }

        static double Clamp(double x, double a, double b) { return Math.Min(b, Math.Max(a, x)); }
        static string JsNum(double v)
        {
            if (v == Math.Floor(v) && Math.Abs(v) < 1e15) return ((long)v).ToString(CultureInfo.InvariantCulture);
            return v.ToString("R", CultureInfo.InvariantCulture);
        }
        static string Round0(double v) { return JsNum(Js.Round(v)); }
        static string F1(double v) { return v.ToString("F1", CultureInfo.InvariantCulture); }

        static void Txt(IBCanvas g, string str, double x, double y, double size, string col, string align = "left", bool bold = false)
        {
            g.FillStyle = col; g.Font = new FontSpec(size, bold ? 700 : 400, false);
            g.TextAlign = align; g.TextBaseline = "middle"; g.FillText(str, x, y);
        }
        static string FmtAlt(double ft)
        {
            double v = Js.Round(ft); double a = Math.Abs(v);
            return (v < 0 ? "-" : "") + (a >= 1000 ? $"{JsNum(Math.Floor(a / 1000))},{((long)(a % 1000)).ToString("000", CultureInfo.InvariantCulture)}" : $"{JsNum(a)}");
        }

        // ================================================================ the PFD
        void DrawPFD(IBCanvas g, State s, AvionicsState av)
        {
            var o = s.Out; const int W = 1024, H = 768;
            g.FillStyle = "#000"; g.FillRect(0, 0, W, H);
            double cx = 470, cy = 395, R = 238;
            g.Save();
            g.BeginPath(); g.Arc(cx, cy, R, 0, Math.PI * 2); g.Clip();
            g.Translate(cx, cy); g.Rotate(-(o.Bank) * Math.PI / 180);
            double ppd = 4.6, py = Clamp(o.Pitch * ppd, -R * 1.2, R * 1.2);
            g.FillStyle = C.Sky; g.FillRect(-R * 1.5, -R * 1.5 + py, R * 3, R * 1.5);
            g.FillStyle = C.Gnd; g.FillRect(-R * 1.5, py, R * 3, R * 1.5);
            g.StrokeStyle = "#fff"; g.LineWidth = 3;
            g.BeginPath(); g.MoveTo(-R * 1.5, py); g.LineTo(R * 1.5, py); g.Stroke();
            g.LineWidth = 2;
            foreach (double pd in new[] { -20.0, -10.0, 10.0, 20.0 })
            {
                double y = py - pd * ppd, w = Math.Abs(pd) == 10 ? 46 : 70;
                g.BeginPath(); g.MoveTo(-w, y); g.LineTo(w, y); g.Stroke();
                if (pd != 0) { Txt(g, $"{JsNum(Math.Abs(pd))}", -w - 16, y, 17, "#fff", "right"); Txt(g, $"{JsNum(Math.Abs(pd))}", w + 16, y, 17, "#fff", "left"); }
            }
            g.Restore();
            g.StrokeStyle = "#fff"; g.LineWidth = 2.5;
            foreach (double ba in new[] { -60.0, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60 })
            {
                double a = (-90 + ba) * Math.PI / 180, r1 = R - 2, r2 = R - (ba % 30 == 0 ? 20 : 12);
                g.BeginPath(); g.MoveTo(cx + r1 * Math.Cos(a), cy + r1 * Math.Sin(a)); g.LineTo(cx + r2 * Math.Cos(a), cy + r2 * Math.Sin(a)); g.Stroke();
            }
            double bptr = (-90 - o.Bank) * Math.PI / 180;
            g.FillStyle = "#ffd94a";
            g.BeginPath(); g.MoveTo(cx + (R - 26) * Math.Cos(bptr), cy + (R - 26) * Math.Sin(bptr));
            g.LineTo(cx + (R - 2) * Math.Cos(bptr - 0.045), cy + (R - 2) * Math.Sin(bptr - 0.045));
            g.LineTo(cx + (R - 2) * Math.Cos(bptr + 0.045), cy + (R - 2) * Math.Sin(bptr + 0.045)); g.Fill();
            g.StrokeStyle = "#ffd94a"; g.LineWidth = 5;
            g.BeginPath(); g.MoveTo(cx - 118, cy); g.LineTo(cx - 42, cy); g.LineTo(cx - 42, cy + 20); g.MoveTo(cx + 118, cy); g.LineTo(cx + 42, cy); g.LineTo(cx + 42, cy + 20); g.Stroke();
            g.FillStyle = "#ffd94a"; g.FillRect(cx - 4, cy - 4, 8, 8);
            if (av != null && av.Fd != null && av.Fd.On)
            {
                double fx = cx + Clamp(-((av.Fd.Bank) - o.Bank) * 3.4, -95, 95), fy = cy + Clamp((av.Fd.Pitch - o.Pitch) * ppd, -80, 80);
                g.StrokeStyle = C.Green; g.LineWidth = 4;
                g.BeginPath(); g.MoveTo(fx - 58, fy); g.LineTo(fx + 58, fy); g.Stroke();
                g.BeginPath(); g.MoveTo(fx, fy - 52); g.LineTo(fx, fy + 52); g.Stroke();
            }
            double ias = Math.Max(0, o.Ias), sx0 = 26, sx1 = 178, spdPx = 3.1;
            g.FillStyle = C.Tape; g.FillRect(sx0, cy - 190, sx1 - sx0, 380);
            g.Save(); g.BeginPath(); g.Rect(sx0, cy - 190, sx1 - sx0, 380); g.Clip();
            for (double v = Math.Max(0, Math.Floor((ias - 66) / 10) * 10); v < ias + 68; v += 10)
            {
                double y = cy + (ias - v) * spdPx; if (y < cy - 196 || y > cy + 196) continue;
                g.StrokeStyle = C.Line; g.LineWidth = 2; g.BeginPath(); g.MoveTo(sx1 - 18, y); g.LineTo(sx1, y); g.Stroke();
                if (v % 20 == 0) Txt(g, $"{JsNum(v)}", sx1 - 26, y, 25, C.White, "right", true);
            }
            if (s.OnGround && s.A.VGet("rotate") != 0)
            {
                foreach (var (vv, lab) in new[] { (s.A.VGet("rotate") - 5, "V1"), (s.A.VGet("rotate"), "VR") })
                {
                    double y = cy + (ias - vv) * spdPx; if (y > cy - 190 && y < cy + 190) { g.FillStyle = C.Cyan; g.FillRect(sx1 - 4, y - 2, 10, 4); Txt(g, lab, sx1 + 16, y, 18, C.Cyan, "left", true); }
                }
            }
            g.Restore();
            g.FillStyle = "#0a0e12"; g.FillRect(sx0 - 4, cy - 27, sx1 - sx0 + 14, 54);
            g.StrokeStyle = C.Line; g.LineWidth = 2; g.StrokeRect(sx0 - 4, cy - 27, sx1 - sx0 + 14, 54);
            Txt(g, $"{Round0(ias)}", sx1 - 16, cy + 1, 36, C.Green, "right", true);
            var at = av?.At;
            Txt(g, at != null && at.Arm ? $"{JsNum(at.Spd)}" : "---", sx1 - 16, cy - 216, 26, C.Magenta, "right", true);
            if (o.Mach >= 0.4) Txt(g, $"MACH {o.Mach.ToString("F3", CultureInfo.InvariantCulture).Substring(1)}", sx0 + 4, cy + 224, 22, C.Green, "left", true);
            double alt = av != null ? Avionics.IndicatedAlt(o.AltTrue, s.Qnh, av.Baro) : o.AltTrue, ax0 = 776, ax1 = 968, altPx = 0.30;
            g.FillStyle = C.Tape; g.FillRect(ax0, cy - 190, ax1 - ax0, 380);
            g.Save(); g.BeginPath(); g.Rect(ax0, cy - 190, ax1 - ax0, 380); g.Clip();
            for (double v = Math.Max(-1000, Math.Floor((alt - 660) / 100) * 100); v < alt + 680; v += 100)
            {
                double y = cy + (alt - v) * altPx; if (y < cy - 196 || y > cy + 196) continue;
                g.StrokeStyle = C.Line; g.LineWidth = 2; g.BeginPath(); g.MoveTo(ax0, y); g.LineTo(ax0 + 18, y); g.Stroke();
                if (v % 200 == 0) Txt(g, FmtAlt(v), ax0 + 26, y, 23, C.White, "left", true);
            }
            g.Restore();
            g.FillStyle = "#0a0e12"; g.FillRect(ax0 - 10, cy - 26, ax1 - ax0 + 14, 52);
            g.StrokeStyle = C.Green; g.LineWidth = 2; g.StrokeRect(ax0 - 10, cy - 26, ax1 - ax0 + 14, 52);
            Txt(g, FmtAlt(alt), ax1 - 8, cy + 1, 31, C.Green, "right", true);
            if (av != null) Txt(g, FmtAlt(av.AltSel), ax1 - 8, cy - 216, 25, C.Magenta, "right", true);
            bool stdSet = av != null && Math.Abs(av.Baro - 29.92) < 0.005 && alt > 14000;
            Txt(g, stdSet ? "STD" : av != null ? (av.BaroUnit == "HPA" ? $"{Round0(av.Baro * 33.8639)} HPA" : $"{av.Baro.ToString("F2", CultureInfo.InvariantCulture)} IN") : "", ax1 - 8, cy + 216, 21, C.Green, "right", true);
            Txt(g, Math.Abs(o.Vsi) >= 100 ? $"{(o.Vsi > 0 ? "+" : "−")}{JsNum(Js.Round(Math.Abs(o.Vsi) / 100) * 100)}" : "", 976, cy + 1, 22, C.White, "left");
            // o.hdg does not exist on the physics out record (see the header note): always 0
            double hdg = 0, hx = cx, hy = 716, hPx = 3.4;
            g.FillStyle = C.Tape; g.FillRect(hx - 175, hy - 24, 350, 48);
            g.Save(); g.BeginPath(); g.Rect(hx - 175, hy - 24, 350, 48); g.Clip();
            for (double v = Math.Floor((hdg - 55) / 10) * 10; v < hdg + 58; v += 10)
            {
                double x = hx + ((v - hdg + 540) % 360 - 180) * hPx; if (x < hx - 178 || x > hx + 178) continue;
                g.StrokeStyle = C.Line; g.LineWidth = 2; g.BeginPath(); g.MoveTo(x, hy + 8); g.LineTo(x, hy + 22); g.Stroke();
                double vv = ((v % 360) + 360) % 360;
                if (vv % 30 == 0) Txt(g, $"{(vv / 10 < 10 ? "0" : "")}{JsNum(vv / 10)}", x, hy - 8, 19, C.White, "center", true);
            }
            g.Restore();
            if (av != null) { double bx = hx + ((av.HdgBug - hdg + 540) % 360 - 180) * hPx; if (bx > hx - 175 && bx < hx + 175) { g.FillStyle = C.Magenta; g.BeginPath(); g.MoveTo(bx, hy + 24); g.LineTo(bx - 7, hy + 36); g.LineTo(bx + 7, hy + 36); g.Fill(); } }
            { long hh = (long)Js.Round(hdg); if (hh == 0) hh = 360; Txt(g, $"{hh.ToString("000", CultureInfo.InvariantCulture)}°", hx, hy + 52, 24, C.Green, "center", true); }
            if (o.Agl < 2500) Txt(g, $"RA {Round0(Math.Max(0, o.Agl))}", cx, cy + R + 34, 23, C.Green, "center", true);
            if (av != null)
            {
                var nav = AvionicsControl.NavSolve(av, new NePos(-s.Pos[2], s.Pos[0]), o, FlightPhysics.MAGVAR_W, FlightPhysics.LAB_RWY);
                if (nav != null && nav.Flag == "")
                {
                    double dy = 664;
                    g.StrokeStyle = C.Line; g.LineWidth = 2;
                    foreach (double ddx in new[] { -56.0, -28, 28, 56 }) { g.BeginPath(); g.Arc(cx + ddx, dy, 4.5, 0, Math.PI * 2); g.Stroke(); }
                    double dx = cx + Clamp(nav.Dots, -2.5, 2.5) * 28;
                    g.FillStyle = nav.Src == "LOC1" ? C.Green : C.Magenta;
                    g.BeginPath(); g.MoveTo(dx, dy - 13); g.LineTo(dx + 10, dy); g.LineTo(dx, dy + 13); g.LineTo(dx - 10, dy); g.Fill();
                    Txt(g, nav.Src == "LOC1" ? "LOC" : nav.Src, cx - 130, dy, 19, C.Dim, "right");
                }
                if (nav != null && nav.GsDots != null && nav.Flag == "")
                {
                    double gx = cx + R + 46;
                    g.StrokeStyle = C.Line; g.LineWidth = 2;
                    foreach (double ddy in new[] { -56.0, -28, 28, 56 }) { g.BeginPath(); g.Arc(gx, cy + ddy, 4.5, 0, Math.PI * 2); g.Stroke(); }
                    double gy = cy + Clamp(nav.GsDots.Value, -2.5, 2.5) * 28;
                    g.FillStyle = C.Green; g.BeginPath(); g.MoveTo(gx - 13, gy); g.LineTo(gx, gy - 10); g.LineTo(gx + 13, gy); g.LineTo(gx, gy + 10); g.Fill();
                    Txt(g, "G/S", gx, cy - R - 14, 19, C.Dim, "center");
                }
            }
            var ap = av?.Ap; var fd = av?.Fd;
            g.FillStyle = "rgba(5,8,11,0.85)"; g.FillRect(196, 10, 632, 62);
            g.StrokeStyle = "#3a4750"; g.LineWidth = 1.5; g.StrokeRect(196, 10, 632, 62);
            g.BeginPath(); g.MoveTo(406, 12); g.LineTo(406, 70); g.MoveTo(618, 12); g.LineTo(618, 70); g.Stroke();
            string atTxt = at != null ? (at.On ? "SPD" : at.Arm ? "ARM" : "") : "";
            string latTxt = ap != null ? (ap.Apr ? "LOC" : ap.Nav ? "LNAV" : ap.Hdg ? "HDG SEL" : ap.On ? "ROL" : "") : "";
            string vertTxt = ap != null ? (ap.Apr && ap.GsCap ? "G/S" : ap.LvlChg ? "LVL CHG" : ap.Vs ? "V/S" : ap.Alt ? "ALT" : ap.On ? "PIT" : "") : "";
            Txt(g, atTxt, 301, 41, 26, C.Green, "center", true);
            Txt(g, latTxt, 512, 41, 26, C.Green, "center", true);
            Txt(g, vertTxt, 723, 41, 26, C.Green, "center", true);
            Txt(g, ap != null && ap.On ? "CMD" : fd != null && fd.On ? "FD" : "", 130, 41, 23, C.Green, "center", true);
            if (ap != null && ap.Flash > 0 && (ap.Flash * 2.2) % 1 < 0.58) Txt(g, "A/P", 130, 41, 25, C.Amber, "center", true);
            if (o.StallWarn) { g.FillStyle = "#7a1610"; g.FillRect(cx - 62, 96, 124, 38); Txt(g, "STALL", cx, 115, 25, "#fff", "center", true); }
        }

        // ================================================================ the ND
        void DrawND(IBCanvas g, State s, AvionicsState av)
        {
            var o = s.Out; const int W = 1024, H = 768;
            g.FillStyle = "#000"; g.FillRect(0, 0, W, H);
            var pos = new NePos(-s.Pos[2], s.Pos[0]);
            double hdgM = 0, hdgRad = hdgM * Math.PI / 180;   // o.hdg: see the header note
            int rng = State.NdRange; bool rose = State.NdMode == "ROSE";
            double cx = 512, cy = rose ? 400 : 596, R = rose ? 296 : 478;
            double scale = R / (rng * 1852);
            Func<double, double, double[]> proj = (n, e) =>
            {
                double dx = e - pos.E, dy = n - pos.N;
                double fwd = dx * Math.Sin(hdgRad) + dy * Math.Cos(hdgRad), rgt = dx * Math.Cos(hdgRad) - dy * Math.Sin(hdgRad);
                return new[] { cx + rgt * scale, cy - fwd * scale };
            };
            g.StrokeStyle = "#5a6d7a"; g.LineWidth = 2;
            g.BeginPath(); g.Arc(cx, cy, R, 0, Math.PI * 2); g.Stroke();
            g.BeginPath(); g.Arc(cx, cy, R / 2, 0, Math.PI * 2); g.SetLineDash(new double[] { 7, 7 }); g.Stroke(); g.SetLineDash(new double[0]);
            double a0 = rose ? 0 : -65, a1 = rose ? 360 : 65;
            for (double a = a0; a <= a1; a += 5)
            {
                double brg = ((Js.Round(hdgM / 5) * 5 + a + 360) % 360), rad = (brg - hdgM) * Math.PI / 180 - Math.PI / 2;
                double x1 = cx + R * Math.Cos(rad), y1 = cy + R * Math.Sin(rad);
                if (!rose && y1 > cy + 6) continue;
                bool big = brg % 30 == 0;
                g.StrokeStyle = C.Line; g.LineWidth = 2;
                g.BeginPath(); g.MoveTo(x1, y1); g.LineTo(cx + (R - (big ? 22 : 12)) * Math.Cos(rad), cy + (R - (big ? 22 : 12)) * Math.Sin(rad)); g.Stroke();
                if (big) { double txp = cx + (R - 48) * Math.Cos(rad), typ = cy + (R - 48) * Math.Sin(rad); if (rose || typ < cy) Txt(g, brg == 0 ? "N" : brg == 90 ? "E" : brg == 180 ? "S" : brg == 270 ? "W" : $"{JsNum(brg / 10)}", txp, typ, 21, C.White, "center", true); }
            }
            Txt(g, $"{rng}", cx - R - 6, cy - R / 2, 20, C.Cyan, "right");
            Txt(g, $"{JsNum(rng / 2.0)}", cx - R - 6, cy - R / 4, 20, C.Cyan, "right");
            g.FillStyle = "#ffd94a";
            g.BeginPath(); g.MoveTo(cx, cy - R - 16); g.LineTo(cx - 9, cy - R + 4); g.LineTo(cx + 9, cy - R + 4); g.Fill();
            double trk = o.Trk, trkRad = (trk - hdgM) * Math.PI / 180;
            g.StrokeStyle = C.Green; g.LineWidth = 3;
            g.BeginPath(); g.MoveTo(cx, cy); g.LineTo(cx + R * 0.92 * Math.Sin(trkRad), cy - R * 0.92 * Math.Cos(trkRad)); g.Stroke();
            if (av != null && av.Fpl != null)
            {
                var pts = new List<(string Id, double[] P)>();
                foreach (var id in av.Fpl.Wps) { var w = Avionics.Wpt(id); pts.Add(w != null ? (id, proj(w.N, w.E)) : (id, null)); }
                g.LineWidth = 3;
                for (int i = 1; i < pts.Count; i++)
                {
                    if (pts[i].P == null || pts[i - 1].P == null) continue;
                    g.StrokeStyle = i == av.Fpl.Active ? C.Magenta : "#e8f2f8";
                    g.BeginPath(); g.MoveTo(pts[i - 1].P[0], pts[i - 1].P[1]); g.LineTo(pts[i].P[0], pts[i].P[1]); g.Stroke();
                }
                foreach (var q in pts)
                {
                    if (q.P == null) continue;
                    double x = q.P[0], y = q.P[1]; if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
                    g.StrokeStyle = C.Magenta; g.LineWidth = 2;
                    g.BeginPath(); g.MoveTo(x, y - 9); g.LineTo(x + 9, y); g.LineTo(x, y + 9); g.LineTo(x - 9, y); g.ClosePath(); g.Stroke();
                    Txt(g, q.Id, x + 14, y - 6, 19, C.Cyan, "left");
                }
                if (av.Fpl.Active >= 0 && av.Fpl.Active < pts.Count && pts[av.Fpl.Active].P != null)
                {
                    var nx = pts[av.Fpl.Active];
                    var w = Avionics.Wpt(nx.Id);
                    double dNm = Math.Sqrt((w.N - pos.N) * (w.N - pos.N) + (w.E - pos.E) * (w.E - pos.E)) / 1852;
                    Txt(g, $"{nx.Id}  {dNm.ToString("F1", CultureInfo.InvariantCulture)} NM", 780, 40, 23, C.Magenta, "right", true);
                }
            }
            if (rose && av != null)
            {
                var aid = Avionics.NAVAIDS.Find(a => a.Freq == av.Nav1.Act && a.Type != "LOC");
                if (aid != null)
                {
                    double brg = ((Math.Atan2(aid.E - pos.E, aid.N - pos.N) * 180 / Math.PI - FlightPhysics.MAGVAR_W) % 360 + 360) % 360;
                    double rad = (brg - hdgM) * Math.PI / 180 - Math.PI / 2;
                    g.StrokeStyle = C.Green; g.LineWidth = 4;
                    g.BeginPath(); g.MoveTo(cx + (R - 66) * Math.Cos(rad), cy + (R - 66) * Math.Sin(rad)); g.LineTo(cx + (R - 14) * Math.Cos(rad), cy + (R - 14) * Math.Sin(rad)); g.Stroke();
                    Txt(g, $"{aid.Id} {((long)Js.Round(brg)).ToString("000", CultureInfo.InvariantCulture)}°", 40, H - 36, 21, C.Green, "left");
                }
                var nav = AvionicsControl.NavSolve(av, pos, o, FlightPhysics.MAGVAR_W, FlightPhysics.LAB_RWY);
                if (nav != null && nav.Flag == "")
                {
                    double crsRad = ((nav.Crs) - hdgM) * Math.PI / 180 - Math.PI / 2;
                    double dx = Math.Cos(crsRad), dy = Math.Sin(crsRad), off = Clamp(nav.Dots, -2.5, 2.5) * 34;
                    double px = -dy, py2 = dx;
                    g.StrokeStyle = nav.Src == "LOC1" ? C.Green : C.Magenta; g.LineWidth = 4;
                    g.BeginPath(); g.MoveTo(cx - dx * (R - 60) + px * off, cy - dy * (R - 60) + py2 * off); g.LineTo(cx + dx * (R - 60) + px * off, cy + dy * (R - 60) + py2 * off); g.Stroke();
                    Txt(g, nav.Src, 40, 40, 21, nav.Src == "LOC1" ? C.Green : C.Magenta, "left");
                }
            }
            g.FillStyle = "#fff";
            g.BeginPath(); g.MoveTo(cx, cy - 17); g.LineTo(cx + 12, cy + 13); g.LineTo(cx, cy + 6); g.LineTo(cx - 12, cy + 13); g.ClosePath(); g.Fill();
            Txt(g, $"GS {Round0(o.Gs)}", 40, 40, 24, C.Green, "left", true);
            { long hh = (long)Js.Round(hdgM); if (hh == 0) hh = 360; Txt(g, $"{hh.ToString("000", CultureInfo.InvariantCulture)}° MAG", 40, 74, 21, C.Green, "left"); }
            Txt(g, rose ? "ROSE" : "MAP", 984, 40, 23, C.Cyan, "right", true);
            Txt(g, $"RNG {rng}", 984, 74, 21, C.Cyan, "right");
        }

        // ================================================================ the EICAS
        void ArcGauge(IBCanvas g, double x, double y, double r, double v, double vMax, string lab, string unit, string digits, double? warnAt)
        {
            double a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
            g.StrokeStyle = "#54656f"; g.LineWidth = 5;
            g.BeginPath(); g.Arc(x, y, r, a0, a1); g.Stroke();
            if (warnAt != null) { g.StrokeStyle = C.Amber; g.BeginPath(); g.Arc(x, y, r, a0 + (a1 - a0) * warnAt.Value / vMax, a1); g.Stroke(); }
            double a = a0 + (a1 - a0) * Clamp(v, 0, vMax) / vMax;
            g.StrokeStyle = "#fff"; g.LineWidth = 4;
            g.BeginPath(); g.MoveTo(x, y); g.LineTo(x + r * 0.92 * Math.Cos(a), y + r * 0.92 * Math.Sin(a)); g.Stroke();
            Txt(g, digits, x, y + r * 0.52, 30, warnAt != null && v >= warnAt.Value ? C.Amber : C.Green, "center", true);
            Txt(g, lab, x, y - r * 0.95, 20, C.White, "center", true);
            Txt(g, unit, x, y + r * 0.82, 16, C.Dim, "center");
        }

        void DrawEicasU(IBCanvas g, State s, AvionicsState av, BoeingEngView eng, double dt)
        {
            var o = s.Out; const int W = 1024, H = 768;
            g.FillStyle = "#000"; g.FillRect(0, 0, W, H);
            var e0 = s.Eng.Count > 0 ? s.Eng[0] : new EngState();
            var e1 = s.Eng.Count > 1 ? s.Eng[1] : e0;
            double[] n1 = o.N1s != null && o.N1s.Length > 1 ? o.N1s : new[] { o.N1, o.N1 };
            double[] egt = o.Egts != null && o.Egts.Length > 1 ? o.Egts : new[] { e0.Egt ?? 0, e1.Egt ?? 0 };
            double n1Tgt = 20 + 84 * Math.Pow(Clamp(s.Thr, 0, 1), 1.15);
            ArcGauge(g, 168, 178, 104, n1[0], 110, "N1", "% RPM", F1(n1[0]), null);
            ArcGauge(g, 418, 178, 104, n1[1], 110, "N1", "% RPM", F1(n1[1]), null);
            foreach (var (x, v) in new[] { (168.0, n1[0]), (418.0, n1[1]) })
            {
                double a = Math.PI * 0.75 + Math.PI * 1.5 * Clamp(n1Tgt, 0, 110) / 110;
                g.FillStyle = C.Magenta; g.BeginPath();
                g.MoveTo(x + 116 * Math.Cos(a), 178 + 116 * Math.Sin(a)); g.LineTo(x + 96 * Math.Cos(a - 0.05), 178 + 96 * Math.Sin(a - 0.05)); g.LineTo(x + 96 * Math.Cos(a + 0.05), 178 + 96 * Math.Sin(a + 0.05)); g.Fill();
            }
            ArcGauge(g, 652, 178, 104, egt[0], 1100, "EGT", "°C", $"{Round0(egt[0])}", 950);
            ArcGauge(g, 892, 178, 104, egt[1], 1100, "EGT", "°C", $"{Round0(egt[1])}", 950);
            Func<EngState, long> ffKg = e => (long)Js.Round((e.Ff) * KG_PER_GAL / 10) * 10;
            Txt(g, "FF", 168, 330, 20, C.White, "center"); Txt(g, $"{ffKg(e0)}", 168, 360, 27, C.Green, "center", true);
            Txt(g, "FF", 418, 330, 20, C.White, "center"); Txt(g, $"{ffKg(e1)}", 418, 360, 27, C.Green, "center", true);
            Txt(g, "KG/H", 293, 360, 17, C.Dim, "center");
            var tw = eng?.Twin;
            Txt(g, "OIL P", 652, 330, 19, C.White, "center"); Txt(g, tw != null ? $"{Round0(tw[0].Oil)}" : "—", 652, 360, 25, C.Green, "center", true);
            Txt(g, "OIL P", 892, 330, 19, C.White, "center"); Txt(g, tw != null ? $"{Round0(tw[1].Oil)}" : "—", 892, 360, 25, C.Green, "center", true);
            double gp = s.GearPos;
            gearTransitT = gp > 0.02 && gp < 0.98 ? gearTransitT + dt : 0;
            for (int i = 0; i < 3; i++)
            {
                double x = 730 + i * 74, y = 452;
                g.StrokeStyle = gp >= 0.999 ? C.Green : gp <= 0.001 ? "#54656f" : C.Amber; g.LineWidth = 3;
                g.BeginPath(); g.Arc(x, y, 24, 0, Math.PI * 2); g.Stroke();
                if (gp > 0.001 && gp < 0.999) { g.FillStyle = C.Amber; g.FillRect(x - 14, y - 3, 28, 6); }
                else if (gp >= 0.999) Txt(g, "DN", x, y, 17, C.Green, "center", true);
            }
            Txt(g, "GEAR", 804, 410, 19, C.White, "center");
            string flapLab = s.A.FlapLabels[(int)Clamp(s.FlapIdx, 0, 3)];
            Txt(g, $"FLAP {flapLab}", 804, 502, 24, C.Green, "center", true);
            var warn = new List<(string, string)>(); var memo = new List<string>();
            if (o.StallWarn) warn.Add(("STALL", C.Red));
            if (!s.OnGround && (!e0.On || !e1.On)) warn.Add(("ENG FAIL", C.Amber));
            if (gearTransitT > 5) warn.Add(("GEAR DISAGREE", C.Amber));
            if (eng != null && eng.AltFail) warn.Add(("ALTERNATOR", C.Amber));
            if (s.Fuel != null && s.Fuel[0] + s.Fuel[1] < 500) warn.Add(("FUEL LOW QTY", C.Amber));
            if (eng != null && eng.ParkBrake) memo.Add("PARK BRAKE SET");
            if (o.Spoiler > 0.05) memo.Add(s.OnGround ? "GND SPOILERS EXTENDED" : "SPEEDBRAKE EXTENDED");
            if (o.Rev > 0.05) memo.Add("REVERSER DEPLOYED");
            if (av != null && av.At != null && av.At.Arm && !av.At.On) memo.Add("A/T ARMED");
            if (av != null && av.Ap != null && av.Ap.On) memo.Add("A/P ENGAGED");
            double y2 = 440;
            foreach (var (m, col) in warn) { Txt(g, m, 44, y2, 26, col, "left", true); y2 += 38; }
            foreach (var m in memo) { Txt(g, m, 44, y2, 24, C.White, "left"); y2 += 36; }
            Txt(g, "TOTAL FUEL", 44, 716, 20, C.White, "left");
            Txt(g, $"{Round0((s.Fuel != null ? s.Fuel[0] + s.Fuel[1] : 0) * KG_PER_GAL)} KG", 330, 716, 26, C.Green, "left", true);
        }

        void DrawEicasL(IBCanvas g, State s, AvionicsState av, BoeingEngView eng)
        {
            const int W = 768, H = 576;
            g.FillStyle = "#000"; g.FillRect(0, 0, W, H);
            var e0 = s.Eng.Count > 0 ? s.Eng[0] : new EngState();
            var e1 = s.Eng.Count > 1 ? s.Eng[1] : e0;
            Txt(g, "FUEL", 60, 54, 24, C.White, "left", true);
            Func<double, string> kg = v => $"{Round0(v * KG_PER_GAL)}";
            Txt(g, "LEFT", 60, 104, 20, C.Dim, "left"); Txt(g, kg(s.Fuel != null ? s.Fuel[0] : 0), 240, 104, 28, C.Green, "right", true);
            Txt(g, "RIGHT", 60, 146, 20, C.Dim, "left"); Txt(g, kg(s.Fuel != null ? s.Fuel[1] : 0), 240, 146, 28, C.Green, "right", true);
            Txt(g, "TOTAL", 60, 196, 20, C.White, "left"); Txt(g, kg(s.Fuel != null ? s.Fuel[0] + s.Fuel[1] : 0), 240, 196, 30, C.Green, "right", true);
            Txt(g, "KG", 262, 196, 18, C.Dim, "left");
            Txt(g, "USED", 60, 238, 20, C.Dim, "left"); Txt(g, $"{Round0(((e0.Ff) + (e1.Ff)) * KG_PER_GAL)} KG/H FLOW", 240, 238, 22, C.Green, "right");
            Txt(g, "OIL", 60, 308, 24, C.White, "left", true);
            var tw = eng?.Twin;
            for (int i = 0; i < 2; i++)
            {
                double y = 352 + i * 44;
                string pTxt = tw != null ? Round0(tw[i].Oil) : "—";
                string tTxt = tw != null && tw[i].OilT != null ? Round0(tw[i].OilT.Value) : "—";
                string qTxt = s.Eng.Count > i ? F1(s.Eng[i].OilQ) : "—";
                Txt(g, i == 0 ? "ENG 1" : "ENG 2", 60, y, 20, C.Dim, "left");
                Txt(g, $"P {pTxt} PSI", 300, y, 23, C.Green, "right");
                Txt(g, $"T {tTxt} °C", 470, y, 23, C.Green, "right");
                Txt(g, $"Q {qTxt}", 640, y, 23, C.Green, "right");
            }
            Txt(g, "FF TOTAL", 60, 478, 20, C.White, "left");
            Txt(g, $"{JsNum(Js.Round(((e0.Ff) + (e1.Ff)) * KG_PER_GAL / 10) * 10)} KG/H", 300, 478, 26, C.Green, "right", true);
            Txt(g, "N1 SYNC — A/T SPD MODE", 60, 524, 17, C.Dim, "left");
            Txt(g, State.NdMode == "ROSE" ? "ND: ROSE" : "ND: MAP", 470, 524, 17, C.Dim, "left");
        }

        // ================================================================ the standby
        void DrawStby(IBCanvas g, State s, AvionicsState av)
        {
            var o = s.Out; const int W = 384;
            g.FillStyle = "#000"; g.FillRect(0, 0, W, W);
            double cx = 192, cy = 150, R = 108;
            g.Save();
            g.BeginPath(); g.Arc(cx, cy, R, 0, Math.PI * 2); g.Clip();
            g.Translate(cx, cy); g.Rotate(-o.Bank * Math.PI / 180);
            double py = Clamp(o.Pitch * 2.6, -80, 80);
            g.FillStyle = C.Sky; g.FillRect(-160, -160 + py, 320, 160);
            g.FillStyle = C.Gnd; g.FillRect(-160, py, 320, 160);
            g.StrokeStyle = "#fff"; g.LineWidth = 2.5; g.BeginPath(); g.MoveTo(-160, py); g.LineTo(160, py); g.Stroke();
            g.Restore();
            g.StrokeStyle = "#ffd94a"; g.LineWidth = 4;
            g.BeginPath(); g.MoveTo(cx - 52, cy); g.LineTo(cx + 52, cy); g.Stroke();
            g.FillStyle = "#ffd94a"; g.FillRect(cx - 3, cy - 3, 6, 6);
            double alt = av != null ? Avionics.IndicatedAlt(o.AltTrue, s.Qnh, av.Baro) : o.AltTrue;
            Txt(g, $"{Round0(Math.Max(0, o.Ias))}", 26, 316, 40, C.Green, "left", true);
            Txt(g, "KT", 26, 348, 16, C.Dim, "left");
            Txt(g, FmtAlt(alt), 358, 316, 34, C.Green, "right", true);
            Txt(g, "FT", 358, 348, 16, C.Dim, "right");
            Txt(g, av != null ? (av.BaroUnit == "HPA" ? $"{Round0(av.Baro * 33.8639)} HPA" : $"{av.Baro.ToString("F2", CultureInfo.InvariantCulture)} IN") : "", cx, 372, 17, C.Cyan, "center");
        }

        // ================================================================ the CDU
        void DrawCDU(IBCanvas g, State s, AvionicsState av)
        {
            var c = State.Cdu; const int W = 512, H = 640;
            g.FillStyle = "#10151a"; g.FillRect(0, 0, W, H);
            double X0 = 26, CW = 19.2, Y0 = 44, LH = 40;
            Action<string, double, double, string, string, bool> cell = (str, col, row, colr, align, big) =>
            {
                g.FillStyle = colr; g.Font = new FontSpec(big ? 21 : 19, big ? 600 : 400, true);
                g.TextAlign = align; g.TextBaseline = "middle";
                g.FillText(str, align == "right" ? X0 + 24 * CW - 4 : X0 + col * CW, Y0 + row * LH);
            };
            Action<string, double, double> label = (str, col, row) => cell(str, col, row, "#9fb4c4", "left", false);
            Action<string, double, double, string> labelA = (str, col, row, align) => cell(str, col, row, "#9fb4c4", align, false);
            Action<string, double, double> data = (str, col, row) => cell(str, col, row, C.Green, "left", true);
            Action<string, double, double, string> dataA = (str, col, row, align) => cell(str, col, row, C.Green, align, true);
            Action<string, double, double> prompt = (str, col, row) => cell(str, col, row, "#e8f2f8", "left", false);
            Action<string, double, double, string> promptA = (str, col, row, align) => cell(str, col, row, "#e8f2f8", align, false);
            string title = c.Page == "POS" ? "POS INIT" : c.Page == "RTE" ? (c.Active ? "ACT RTE 1" : "RTE 1") : c.Page == "INDEX" ? "INDEX" : "IDENT";
            g.FillStyle = "#e8f2f8"; g.Font = new FontSpec(22, 600, true); g.TextAlign = "center"; g.TextBaseline = "middle";
            g.FillText(title, W / 2, 20);
            g.StrokeStyle = "#3a4750"; g.LineWidth = 1; g.BeginPath(); g.MoveTo(10, 34); g.LineTo(W - 10, 34); g.Stroke();
            if (c.Page == "IDENT")
            {
                label("MODEL", 0, 0); data("737-800", 0, 1);
                label("ENGINES", 0, 2); data("CFM56-7B", 0, 3);
                labelA("NAV DATA", 24, 0, "right"); dataA("CADET OFFLINE", 24, 1, "right");
                labelA("DRAG/FF", 24, 2, "right"); dataA("+0.0/+0.0", 24, 3, "right");
                label("PROGRAM", 0, 4); data("CADET FMC V1", 0, 5);
                prompt("<INDEX", 0, 13); promptA("POS INIT>", 24, 13, "right");
            }
            else if (c.Page == "INDEX")
            {
                prompt("<IDENT", 0, 1); prompt("<POS INIT", 0, 3); promptA("RTE>", 24, 1, "right");
                label("THE BASIC PAGES ONLY", 0, 6); label("PERF / VNAV: NOT IN SCOPE", 0, 7);
            }
            else if (c.Page == "POS")
            {
                label("REF AIRPORT", 0, 0); data(c.Ref != "" ? c.Ref : (State.Route != null ? State.Route.From : "----"), 0, 1);
                label("GATE", 0, 2); data("---", 0, 3);
                labelA("IRS POSITION", 24, 7, "right"); dataA(c.PosSet ? "SET (GPS)" : "NOT SET", 24, 8, "right");
                promptA("SET POS>", 24, 9, "right");
                promptA("ROUTE>", 24, 13, "right");
                label(c.PosSet ? "POSITION SET — READY" : "SET THE POSITION BEFORE DEPARTURE", 0, 11);
            }
            else
            {
                var r = State.Route;
                label("FROM", 0, 0); data(c.From != "" ? c.From : "----", 0, 1);
                labelA("TO", 24, 0, "right"); dataA(c.To != "" ? c.To : "----", 24, 1, "right");
                label("CO ROUTE", 0, 2); data(r != null && !c.Edited ? r.Id : "-------", 0, 3);
                labelA("ALTN", 24, 2, "right"); dataA(r != null ? (r.Alternate ?? "----") : "----", 24, 3, "right");
                label("VIA", 0, 5); label("TO", 12, 5); labelA("CRZ ALT", 24, 5, "right");
                data("DIRECT", 0, 6); data(c.To != "" ? c.To : "----", 12, 6);
                dataA(r != null ? $"FL{r.CruiseFL}" : (av != null ? FmtAlt(av.AltSel) : "-----"), 24, 6, "right");
                if (r != null) label($"DIST {r.DistKm} KM  BLOCK {r.BlockMin} MIN", 0, 8);
                if (c.PendingExec) promptA("ACTIVATE + EXEC", 24, 12, "right");
                else if (!c.Active) promptA("ACTIVATE>", 24, 13, "right");
                else dataA("ROUTE ACTIVE", 24, 13, "right");
            }
            g.FillStyle = "#05080b"; g.FillRect(10, H - 74, W - 20, 34);
            g.FillStyle = C.Green; g.Font = new FontSpec(21, 600, true); g.TextAlign = "left"; g.TextBaseline = "middle";
            g.FillText(c.Scratch, 20, H - 57);
            if (c.Msg != "") { g.FillStyle = C.Amber; g.TextAlign = "right"; g.FillText(c.Msg, W - 20, H - 57); }
            if (c.PendingExec) { g.FillStyle = C.Amber; g.BeginPath(); g.Arc(W - 30, 20, 7, 0, Math.PI * 2); g.Fill(); }
        }

        // ================================================================ the update
        public void Update(double dt, BoeingFrame o)
        {
            if (o == null || o.S == null) return;
            var s = o.S; var av = o.Av; var eng = o.Eng;
            if (!routeSeenSet || o.Route != routeSeen)
            {
                routeSeenSet = true; routeSeen = o.Route; State.Route = o.Route;
                if (o.Route != null && !State.Cdu.Edited) { State.Cdu.From = o.Route.From ?? ""; State.Cdu.To = o.Route.To ?? ""; State.Cdu.Dirty = true; }
            }
            bool power = o.ElecPfd;
            if (!power)
            {
                if (!blanked)
                {
                    blanked = true;
                    foreach (var u in Units.Values) { u.G.FillStyle = "#000"; u.G.FillRect(0, 0, u.W, u.H); }
                }
                return;
            }
            blanked = false;
            tPfd += dt; tNd += dt; tEicas += dt; tCdu += dt; tStby += dt;
            if (tPfd >= 1.0 / 30)
            {
                tPfd = Math.Min(tPfd - 1.0 / 30, 1.0 / 30);
                if (State.DuOut == "ND") DrawND(Units["pfd"].G, s, av); else DrawPFD(Units["pfd"].G, s, av);
                Stats["pfd"]++;
            }
            if (tNd >= 1.0 / 10)
            {
                tNd = Math.Min(tNd - 1.0 / 10, 1.0 / 10);
                if (State.DuInb == "EICAS") DrawEicasU(Units["nd"].G, s, av, eng, 1.0 / 10); else DrawND(Units["nd"].G, s, av);
                Stats["nd"]++;
            }
            if (tEicas >= 1.0 / 10)
            {
                tEicas = Math.Min(tEicas - 1.0 / 10, 1.0 / 10);
                DrawEicasU(Units["eicasU"].G, s, av, eng, 1.0 / 10);
                if (State.DuLow == "ND") { var g2 = Units["eicasL"].G; g2.Save(); g2.Scale(768.0 / 1024, 576.0 / 768); DrawND(g2, s, av); g2.Restore(); }
                else DrawEicasL(Units["eicasL"].G, s, av, eng);
                Stats["eicasU"]++; Stats["eicasL"]++;
            }
            if (tStby >= 1.0 / 15) { tStby = Math.Min(tStby - 1.0 / 15, 1.0 / 15); DrawStby(Units["stby"].G, s, av); Stats["stby"]++; }
            if (State.Cdu.Dirty || tCdu >= 1) { tCdu = 0; State.Cdu.Dirty = false; DrawCDU(Units["cdu"].G, s, av); Stats["cdu"]++; }
        }
    }
}
