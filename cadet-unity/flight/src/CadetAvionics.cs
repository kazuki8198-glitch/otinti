// CADET — CadetAvionics.cs : port of flight-lab/src/avionics.js, the LOGIC half
// (headings/variation, altimeter, radio tuning, CDI math, procedures, the
// avionics state and its panel controls, navSolve, CAS collection). The canvas
// drawing (drawPFD/drawMFD) is NOT here — it becomes Unity UI in Stage 3.
using System;
using System.Collections.Generic;
namespace Cadet
{
    public class AlertItem { public string Id, Tier, Level, Text; }
    public class RadioPair { public int Act, Stby; public RadioPair(int a, int s) { Act = a; Stby = s; } }
    public class FplState { public List<string> Wps = new List<string>(); public int Active = 1; }
    public class ProcState { public string Name, Type; public bool Missed; public double? DaFt, MdaFt; }
    public class XpdrState { public int Code = 1200; public string Mode = "ALT"; public string Entry = ""; }
    public class NePos { public double N, E; public NePos(double n, double e) { N = n; E = e; } }

    public class AvionicsState
    {
        public ApState Ap; public FdState Fd;   // autopilot annunciation / flight director (autopilot.js's av.ap / av.fd)
        public AtState At;                      // the 737's autothrottle annunciation (av.at)
        public RadioPair Com1 = new RadioPair(118300, 121700), Com2 = new RadioPair(126950, 120100);
        public RadioPair Nav1 = new RadioPair(109900, 113500), Nav2 = new RadioPair(113500, 110300);
        public string AudioMic = "COM1";
        public Dictionary<string, bool> Monitor = new Dictionary<string, bool> { { "COM1", true }, { "COM2", false }, { "NAV1", false }, { "NAV2", false } };
        public string ComSel = "COM1", NavSel = "NAV1";
        public double HdgBug = 360, AltSel = 3000, Baro = 29.92, Crs = 360;
        public string BaroUnit = "IN";
        public string Cdi = "GPS";
        public bool Obs;
        public string Brg1, Brg2;
        public double XpdrIdent;
        public bool FplEdit; public int FplCursor = 1, FplPick, NrstSel;
        public ProcState Proc;
        public Dictionary<string, bool> Ack = new Dictionary<string, bool>();
        public XpdrState Xpdr = new XpdrState();
        public string PfdMenu = "TOP";
        public bool Wind = true; public string MfdPage = "MAP"; public int MfdRangeIdx = 4; public bool MapNorthUp = true;
        public FplState Fpl = new FplState();
        public string Direct; public NePos DirectFrom; public string DirectFromId;
        public double Timer;
        public Dictionary<string, bool> Fail;   // { ahrs, gps } — null = no failures
        public List<string> Nrts = new List<string>();
        // G1000 draw state (avionics.js's av._egtPeak / av._fuelInit / av._alertsUnacked):
        // the engine page's leaned-EGT peaks, the system page's fuel totalizer latch, the CAS ack flag
        public List<double> EgtPeak = new List<double>();
        public double? FuelInit;
        public int AlertsUnacked;
    }

    public class WptDef { public string Id, Name, Kind; public double N, E; }
    public class NavAidDef { public string Id, Name, Type; public int Freq; public double N, E; }
    public class ProcDef { public string Id, Name, Type, Runway, MissedTo, MissedText; public double FinalCourse, FafDistNm, FafAltFt; public double? DaFt, MdaFt; public double VisSm, MissedAltFt; }

    public class NavSolution
    {
        public string Src, ToFrom = "", From = "", To = "", Flag = "";
        public double Dots; public double? Dtk, Dis, Ete, Xtk, GsDots, Brg, Radial, Dme;
        public double Crs; public double? CdiScale; public bool Obs;
    }

    public static class Avionics
    {
        public const double DEG = Math.PI / 180, NM = 1852;
        public static double Clamp(double v, double a, double b) { return v < a ? a : v > b ? b : v; }
        public static double Wrap360(double a) { return ((a % 360) + 360) % 360; }
        public static double Wrap180(double a) { return ((a + 540) % 360) - 180; }
        public static double Fin(double v, double d = 0) { return double.IsNaN(v) || double.IsInfinity(v) ? d : v; }
        public static bool IsFin(double v) { return !double.IsNaN(v) && !double.IsInfinity(v); }

        public static double TrueToMag(double t, double varW) { return Wrap360(t + varW); }
        public static double MagToTrue(double m, double varW) { return Wrap360(m - varW); }
        public static double HdgDiff(double a, double b) { return Wrap180(b - a); }
        public static string HdgFmt(double h) { var s = Js.Round(Wrap360(h)).ToString("0"); if (s == "0") s = "360"; return s.PadLeft(3, '0'); }

        public const double FT_PER_INHG = 1000;
        public static double IndicatedAlt(double altTrueFt, double qnhActual, double setting) { return altTrueFt + (setting - qnhActual) * FT_PER_INHG; }
        public static double InhgToHpa(double v) { return v * 33.8639; }
        public static double HpaToInhg(double v) { return v / 33.8639; }

        public const int COM_MIN = 118000, COM_MAX = 136975, COM_STEP = 25;
        public const int NAV_MIN = 108000, NAV_MAX = 117950, NAV_STEP = 50;
        public static int Tune(int kHz, string part, int dir, string kind = "COM")
        {
            int mn = kind == "NAV" ? NAV_MIN : COM_MIN, mx = kind == "NAV" ? NAV_MAX : COM_MAX, st = kind == "NAV" ? NAV_STEP : COM_STEP;
            int mhz = kHz / 1000, k = kHz % 1000;
            if (part == "MHz")
            {
                int lo = mn / 1000, hi = mx / 1000;
                mhz += dir; if (mhz > hi) mhz = lo; if (mhz < lo) mhz = hi;
            }
            else { k += dir * st; if (k >= 1000) k = 0; if (k < 0) k = 1000 - st; }
            return (int)Clamp(mhz * 1000 + k, mn, mx);
        }
        public static string FmtCom(int kHz) { return (kHz / 1000.0).ToString("0.000"); }
        public static string FmtNav(int kHz) { return (kHz / 1000.0).ToString("0.00"); }
        public static bool ValidCom(int kHz) { return kHz >= COM_MIN && kHz <= COM_MAX && kHz % COM_STEP == 0; }

        public static readonly (double lat, double lon) ORIGIN = (28.777, -81.238);
        public const double R_E = 6371008.8;
        public static (double lat, double lon) NeToLatLon(double n, double e)
        { return (ORIGIN.lat + n / R_E / DEG, ORIGIN.lon + e / (R_E * Math.Cos(ORIGIN.lat * DEG)) / DEG); }
        public static NePos LatLonToNe(double lat, double lon)
        { return new NePos((lat - ORIGIN.lat) * DEG * R_E, (lon - ORIGIN.lon) * DEG * R_E * Math.Cos(ORIGIN.lat * DEG)); }
        public static double GcDistNm((double lat, double lon) a, (double lat, double lon) b)
        {
            double f1 = a.lat * DEG, f2 = b.lat * DEG, df = (b.lat - a.lat) * DEG, dl = (b.lon - a.lon) * DEG;
            double h = Math.Pow(Math.Sin(df / 2), 2) + Math.Cos(f1) * Math.Cos(f2) * Math.Pow(Math.Sin(dl / 2), 2);
            return 2 * R_E * Math.Asin(Math.Min(1, Math.Sqrt(h))) / NM;
        }
        public static double GcBearing((double lat, double lon) a, (double lat, double lon) b)
        {
            double f1 = a.lat * DEG, f2 = b.lat * DEG, dl = (b.lon - a.lon) * DEG;
            return Wrap360(Math.Atan2(Math.Sin(dl) * Math.Cos(f2), Math.Cos(f1) * Math.Sin(f2) - Math.Sin(f1) * Math.Cos(f2) * Math.Cos(dl)) / DEG);
        }
        public static double NeDistNm(NePos a, NePos b) { return Math.Sqrt(Math.Pow(b.N - a.N, 2) + Math.Pow(b.E - a.E, 2)) / NM; }
        public static double NeBearing(NePos a, NePos b) { return Wrap360(Math.Atan2(b.E - a.E, b.N - a.N) / DEG); }
        public static double XtkNm(NePos a, NePos b, NePos p)
        {
            double dx = b.E - a.E, dy = b.N - a.N, L = Math.Sqrt(dx * dx + dy * dy); if (L == 0) L = 1;
            return ((p.E - a.E) * dy - (p.N - a.N) * dx) / L / NM;
        }
        public static double AtkToGoNm(NePos a, NePos b, NePos p)
        {
            double dx = b.E - a.E, dy = b.N - a.N, L = Math.Sqrt(dx * dx + dy * dy); if (L == 0) L = 1;
            return (L - ((p.E - a.E) * dx + (p.N - a.N) * dy) / L) / NM;
        }
        public static double? EteSec(double distNm, double gsKt) { return gsKt > 5 ? distNm / gsKt * 3600 : (double?)null; }
        public static string EteFmt(double? s)
        {
            if (s == null || !IsFin(s.Value)) return "--:--";
            double v = s.Value;
            if (v >= 3600) return $"{Math.Floor(v / 3600):0}:{Math.Floor(v % 3600 / 60):00}";
            return $"{Math.Floor(v / 60):00}:{Math.Floor(v % 60):00}";
        }

        public static double CdiGps(double xtk, double fullScaleNm = 1.0) { return Clamp(-xtk / fullScaleNm * 2, -2.5, 2.5); }
        public static (double dots, string toFrom, double devDeg) CdiVor(double radial, double obs)
        {
            double off = Wrap180(radial - obs); bool from = Math.Abs(off) < 90;
            double devDeg = from ? Wrap180(obs - radial) : Wrap180(radial - obs - 180);
            return (Clamp(devDeg / 5, -2.5, 2.5), from ? "FROM" : "TO", devDeg);
        }
        public static double CdiLoc(double angleOffDeg) { return Clamp(-angleOffDeg / 1.25, -2.5, 2.5); }
        public static double GsDots(double aboveDeg) { return Clamp(-aboveDeg / 0.35, -2.5, 2.5); }

        public static readonly List<ProcDef> PROCEDURES = new List<ProcDef>
        {
            new ProcDef { Id = "ILS36", Name = "ILS 36", Type = "ILS", Runway = "36", FinalCourse = 360, FafDistNm = 5.0, FafAltFt = 2000, DaFt = 255, MdaFt = null, VisSm = 0.5, MissedTo = "LABED", MissedAltFt = 3000, MissedText = "直行 LAB-D・3,000 ft へ上昇して待機" },
            new ProcDef { Id = "RNAV36", Name = "RNAV (GPS) RWY 36", Type = "RNAV", Runway = "36", FinalCourse = 360, FafDistNm = 5.0, FafAltFt = 2000, DaFt = 305, MdaFt = 505, VisSm = 0.5, MissedTo = "LABED", MissedAltFt = 3000, MissedText = "直行 LAB-D・3,000 ft へ上昇して待機" },
        };
        public static ProcDef ProcedureById(string id) { return PROCEDURES.Find(p => p.Id == id); }

        public static readonly List<WptDef> WAYPOINTS = new List<WptDef>
        {
            new WptDef { Id = "LABRW", Name = "LAB RWY 36（架空）", N = -1200, E = -40000, Kind = "apt" },
            new WptDef { Id = "LABEA", Name = "LAB-A（架空）", N = 9000, E = -34000, Kind = "wpt" },
            new WptDef { Id = "LABEB", Name = "LAB-B（架空）", N = 15000, E = -21000, Kind = "wpt" },
            new WptDef { Id = "LABEC", Name = "LAB-C（架空）", N = -6000, E = -24000, Kind = "wpt" },
            new WptDef { Id = "LABED", Name = "LAB-D（架空）", N = -16000, E = -38000, Kind = "wpt" },
            new WptDef { Id = "LABEF", Name = "LAB-F（架空・目的地変更先）", N = -2000, E = -33000, Kind = "wpt" },
            new WptDef { Id = "SFBVW", Name = "Sanford 概略表示原点（模式図）", N = 0, E = 0, Kind = "ref" },
        };
        public static WptDef Wpt(string id) { return WAYPOINTS.Find(w => w.Id == id); }
        static NePos PosOf(WptDef w) { return new NePos(w.N, w.E); }

        public static readonly List<NavAidDef> NAVAIDS = new List<NavAidDef>
        {
            new NavAidDef { Id = "LBV", Name = "LAB VOR（架空局）", Freq = 113500, N = 4000, E = -30000, Type = "VOR" },
            new NavAidDef { Id = "ILAB", Name = "I-LAB LOC 36（架空）", Freq = 109900, Type = "LOC" },
        };

        public static AvionicsState CreateAvionics()
        {
            var av = new AvionicsState();
            av.Fpl.Wps = new List<string> { "LABRW", "LABEA", "LABEB" };
            av.Fpl.Active = 1;
            return av;
        }

        public static readonly double[] RANGES = { 0.5, 1, 2, 5, 10, 15, 20, 30, 50 };

        public static List<string> FplCatalog()
        {
            var outL = new List<string>();
            foreach (var p in WAYPOINTS) if (p.Kind != "ref") outL.Add(p.Id);
            return outL;
        }

        public class NrstEntry { public string Id, Name; public double? Brg, Dis; }
        public static List<NrstEntry> NrstList(AvionicsState av, NePos pos, double varW)
        {
            var outL = new List<NrstEntry>();
            if (pos == null) { foreach (var id in FplCatalog()) outL.Add(new NrstEntry { Id = id }); return outL; }
            foreach (var p in WAYPOINTS)
            {
                if (p.Kind == "ref") continue;
                outL.Add(new NrstEntry { Id = p.Id, Name = p.Name, Brg = TrueToMag(NeBearing(pos, PosOf(p)), varW), Dis = NeDistNm(pos, PosOf(p)) });
            }
            outL.Sort((a, b) => a.Dis.Value.CompareTo(b.Dis.Value));
            return outL;
        }

        public static string CdiName(AvionicsState av)
        {
            if (av.Cdi == "GPS") return "GPS";
            var r = av.Cdi == "NAV1" ? av.Nav1 : av.Nav2;
            var aid = NAVAIDS.Find(x => x.Freq == r.Act);
            return (aid != null && aid.Type == "LOC" ? "LOC" : "VOR") + av.Cdi.Substring(3);
        }

        public static string XpdrEffMode(AvionicsState av, bool onGround)
        {
            if (av.Xpdr != null && av.Xpdr.Mode == "ALT" && onGround) return "GND";
            return av.Xpdr != null ? av.Xpdr.Mode : "ALT";
        }
    }
}
