// CadetPanelView.cs — the instrument focus views and the zoom, ported from
// panel-view.js: pure state and numbers (which views exist, the I-key order,
// each view's framing, the zoom law). fly-mode's camera work maps to
// CockpitMain.FocusPose on the Unity side.
using System;

namespace Cadet
{
    public static class PanelView
    {
        public static readonly (string Id, string Label)[] FocusViews =
            { ("pfd", "PFD"), ("mfd", "MFD"), ("stby", "予備計器・オーディオ") };
        public static readonly (string Id, string Label)[] FocusViews737 =
            { ("b737pfd", "PFD（737）"), ("b737nd", "ND（737）"), ("b737eicas", "EICAS（737）"), ("b737cdu", "FMC CDU") };

        public static readonly string[] FocusIds = { "pfd", "mfd", "stby" };
        public static readonly string[] FocusIds737 = { "b737pfd", "b737nd", "b737eicas", "b737cdu" };

        // the next focus after cur (null = the pilot's view), cycling forward;
        // an unknown id starts again at the first view
        public static string NextFocus(string cur, string[] ids = null)
        {
            ids = ids ?? FocusIds;
            int i = Array.IndexOf(ids, cur);
            return i < 0 ? ids[0] : (i + 1 < ids.Length ? ids[i + 1] : null);
        }

        // how each focus view is framed: fov (degrees) and the eye's distance
        // in front of the unit's face (metres)
        public static (double Fov, double Dist) Frame(string id)
        {
            switch (id)
            {
                case "pfd": return (38, 0.42);
                case "mfd": return (38, 0.42);
                case "stby": return (46, 0.46);
                case "b737pfd": return (36, 0.40);
                case "b737nd": return (36, 0.40);
                case "b737eicas": return (40, 0.44);
                case "b737cdu": return (44, 0.46);
            }
            return (38, 0.42);
        }

        // the standby dials' centre from the MFD screen's centre (panel frame)
        public static readonly double[] StbyOff = { 0.139, -0.040 };
        // how far the head may turn inside a focus view (radians)
        public const double LookYaw = 0.30, LookUp = 0.24, LookDown = 0.20;
        // the camera's move between views (seconds)
        public const double FocusT = 0.35;
        public const double ZoomMin = 16, ZoomStepRatio = 0.85;

        // the field of view after stepping: cur (null = base) moved by notches
        // (positive = in), kept within [min, max]
        public static double ZoomStep(double? cur, double notches, double baseFov, double? max = null, double min = ZoomMin)
        {
            double mx = max ?? baseFov;
            double v = (cur ?? baseFov) * Math.Pow(ZoomStepRatio, notches);
            return Math.Min(mx, Math.Max(min, v));
        }

        public static double Smooth01(double t) { t = Math.Min(1, Math.Max(0, t)); return t * t * (3 - 2 * t); }
        public static double LerpAngle(double a, double b, double k) { return a + Math.Atan2(Math.Sin(b - a), Math.Cos(b - a)) * k; }
    }
}
