// CadetPhysics.cs — faithful C# port of flight-lab/src/physics.js (Sorajima flight model).
// Pure .NET (no UnityEngine dependency) so it can be verified headlessly against the JS reference.
// Conventions mirror the JS exactly: world x = east, y = up, z = south; body x = right wing, y = up, -z = nose.
// All arithmetic is double, in the same order as the JS, so traces should match to float noise.
using System;
using System.Collections.Generic;

namespace Cadet
{
    public static class PhysMath
    {
        public const double DEG = Math.PI / 180.0;
        public const double KT = 1.943844;
        public const double FT = 3.28084;
        public const double G = 9.81;

        public static double Clamp(double x, double a, double b) => x < a ? a : x > b ? b : x;
        public static double Lerp(double a, double b, double t) => a + (b - a) * t;
        public static double Smoothstep(double a, double b, double x)
        {
            double t = Clamp((x - a) / (b - a), 0, 1);
            return t * t * (3 - 2 * t);
        }
        public static double Wrap360(double a) => ((a % 360) + 360) % 360;
        public static double Wrap180(double a) => ((a + 540) % 360) - 180;

        public static double[] VAdd(double[] a, double[] b) => new[] { a[0] + b[0], a[1] + b[1], a[2] + b[2] };
        public static double[] VSub(double[] a, double[] b) => new[] { a[0] - b[0], a[1] - b[1], a[2] - b[2] };
        public static double[] VScale(double[] a, double s) => new[] { a[0] * s, a[1] * s, a[2] * s };
        public static double[] VMadd(double[] a, double[] b, double s) => new[] { a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s };
        public static double VDot(double[] a, double[] b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        public static double[] VCross(double[] a, double[] b) => new[] { a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0] };
        public static double VLen(double[] a) => Math.Sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
        public static double[] VNorm(double[] a) { double l = VLen(a); if (l == 0) l = 1; return new[] { a[0] / l, a[1] / l, a[2] / l }; }

        public static double[] QMul(double[] a, double[] b) => new[]
        {
            a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
            a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
            a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
            a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
        };
        public static double[] QConj(double[] q) => new[] { -q[0], -q[1], -q[2], q[3] };
        public static double[] QAxis(double[] ax, double ang) { double s = Math.Sin(ang / 2); return new[] { ax[0] * s, ax[1] * s, ax[2] * s, Math.Cos(ang / 2) }; }
        public static double[] QNorm(double[] q) { double l = Math.Sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]); if (l == 0) l = 1; return new[] { q[0] / l, q[1] / l, q[2] / l, q[3] / l }; }
        public static double[] QRot(double[] q, double[] v)
        {
            double x = q[0], y = q[1], z = q[2], w = q[3];
            double tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
            return new[] { v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx) };
        }
        public static double[] QFromHPB(double hdg, double pitch = 0, double bank = 0)
        {
            var q = QAxis(new[] { 0.0, 1, 0 }, -hdg * DEG);
            q = QMul(q, QAxis(new[] { 1.0, 0, 0 }, pitch * DEG));
            q = QMul(q, QAxis(new[] { 0.0, 0, 1 }, -bank * DEG));
            return q;
        }
    }

    // splitmix-style RNG identical to the JS makeRng (Math.imul semantics via unchecked int math)
    public sealed class JsRng
    {
        private uint s;
        public JsRng(uint seed) { s = seed; }
        public double Next()
        {
            unchecked
            {
                s = s + 0x6D2B79F5u;
                uint t = s;
                t = Imul(t ^ (t >> 15), t | 1);
                t ^= t + Imul(t ^ (t >> 7), t | 61);
                return ((t ^ (t >> 14)) & 0xFFFFFFFFu) / 4294967296.0;
            }
        }
        private static uint Imul(uint a, uint b) => unchecked((uint)((int)a * (int)b));
    }

    public static class Perlin
    {
        private static readonly int[] PERM = new int[512];
        private static readonly double[] GX = new double[16];
        private static readonly double[] GY = new double[16];
        static Perlin()
        {
            var r = new JsRng(20240917);
            var p = new int[256];
            for (int i = 0; i < 256; i++) p[i] = i;
            for (int i = 255; i > 0; i--) { int j = (int)Math.Floor(r.Next() * (i + 1)); int tmp = p[i]; p[i] = p[j]; p[j] = tmp; }
            for (int i = 0; i < 512; i++) PERM[i] = p[i & 255];
            for (int i = 0; i < 16; i++) { GX[i] = Math.Cos(i * Math.PI / 8); GY[i] = Math.Sin(i * Math.PI / 8); }
        }
        public static double Noise(double x, double y)
        {
            int xi = (int)Math.Floor(x), yi = (int)Math.Floor(y);
            int X = xi & 255, Y = yi & 255;
            double xf = x - xi, yf = y - yi;
            int a = PERM[X + PERM[Y]] & 15, b = PERM[X + 1 + PERM[Y]] & 15, c = PERM[X + PERM[Y + 1]] & 15, d = PERM[X + 1 + PERM[Y + 1]] & 15;
            double u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
            double n00 = GX[a] * xf + GY[a] * yf, n10 = GX[b] * (xf - 1) + GY[b] * yf, n01 = GX[c] * xf + GY[c] * (yf - 1), n11 = GX[d] * (xf - 1) + GY[d] * (yf - 1);
            double x0 = n00 + u * (n10 - n00), x1 = n01 + u * (n11 - n01);
            return (x0 + v * (x1 - x0)) * 1.42;
        }
    }

    // ------------------------------------------------------------------ data types
    public sealed class EngineGeom { public string Type; public double X, Y, Z, R; public int Blades; }
    public sealed class WingGeom { public double Y, Dih, RootX, TipX, RootLE, RootC, TipLE, TipC, T0, T1, Hinge; public double[] Flap, Ail; }
    public sealed class HStabGeom { public double Y, Span, RootLE, TipLE, Te, Hinge, T; }
    public sealed class VStabGeom { public double Y0, Y1, RootLE, TopLE, Te, Hinge, T; }
    public sealed class GearGeom { public bool Fixed; public double WheelR; public double[] Nose; public double[][] Mains; }
    public sealed class EnginePhys { public string Type; public double P, T0, Eta, EtaK; public double? FfK; }
    public sealed class PhysCoeffs
    {
        public double Mass, S, B, C, L, CL0, CLa, AStall, CD0, K, CDgear, Cm0, Cma, Cmde, Cmq, Clda, Clp, Clb, Cnb, Cndr, Cnr, CYb;
        public double FlapCL, FlapStall, FlapCD, MaxG, RollRate, PitchRate;
        public double? Cnda, Cnp, Clr;
        public EnginePhys Engine;
        public PhysCoeffs Clone() => (PhysCoeffs)MemberwiseClone();
    }
    public sealed class Aircraft
    {
        public string Id, Name, Short, Kind;
        public int Engines1 = 1;
        public bool Twin, CounterRotating, Cs, PropCtrl, Complex, Jet, Carb;
        public double[] PropGov; // null unless PropCtrl
        public double[][] Fuse;
        public WingGeom Wing; public HStabGeom HStab; public VStabGeom VStab;
        public List<EngineGeom> Engines = new List<EngineGeom>();
        public GearGeom Gear;
        public double[] Eye;
        public string[] FlapLabels;
        public double FuelCap;
        public PhysCoeffs Phys;
        public Dictionary<string, double> V = new Dictionary<string, double>();
        public double VGet(string key) => V.TryGetValue(key, out var v) ? v : 0.0;
    }

    public sealed class Piece
    {
        public int Kind, Side;
        public double S;
        public double[] R, SDir, N;
        public bool Flap;
        public double Ail, Span01, Wash;
        public double Cl, St, A;
    }
    public sealed class Elements
    {
        public List<Piece> Pcs = new List<Piece>();
        public double FlapK, DCmF, At, Af, It, Deps = 0.35, Ke, Ka, Kr, Gdi, DCma, DCmq, DClp, DClr, DCnr, DCnp, DCnda, DCY, FinYZ;
    }
    public sealed class PropDerived { public double Vd, A0, A1, Fin, Ip, Tq, Rig; }
    public sealed class DerivedAC
    {
        // resolved copy of PhysCoeffs + derivation results (JS: ac2)
        public double Mass, S, B, C, L, CL0, CLa, AStall, CD0, K, CDgear, Cm0, Cma, Cmde, Cmq, Clda, Clp, Clb, Cnb, Cndr, Cnr, CYb;
        public double FlapCL, FlapStall, FlapCD, MaxG, RollRate, PitchRate;
        public double Cnda, Cnp, Clr;
        public EnginePhys Engine;
        public double[] I;
        public PropDerived Prop;
        public Elements El;
    }
    public sealed class Wheel { public double[] Off; public double K, C; public bool Nose; }
    public sealed class HardPt { public double[] Off; public string Name; }
    public sealed class TailSkidDef { public double[] Off; public double K, C; }
    public sealed class DerivedBundle { public DerivedAC AC; public List<Wheel> Wheels; public double WheelBottom; public List<HardPt> HardPts; public TailSkidDef TailSkid; }

    public sealed class WbTable { public double MtowLb, FwdIn, AftIn, EmptyArm, FrontArm, RearArm, BagArm, BagMaxKg, FuelArm, TabsGal; }
    public sealed class Loading { public string Fuel = "std"; public int Front = 2, Rear = 0; public double BagKg = 0; }
    public sealed class WbResult
    {
        public double Kg, Lb, CgIn, SpreadIn, MtowLb, FwdIn, AftIn, EmptyKg;
        public bool Ok; public List<string> Problems = new List<string>();
        public double[] FuelGal; public Loading Loading;
    }

    public sealed class CylState { public double Egt, Cht; }
    public sealed class EngState
    {
        public bool Run = true, Failed, Feather, Cut, On = true, IceNoted, PumpFail, FeedOk = true;
        public double? Thr;
        public double Rpm, N1 = 20, Mix = 1, CrankT, LineT, CarbIce, Rough, ManIn, Ff, ShaftW, Lev = 1, FuelPress, PressT, OilP, PropK = 1, MixK = 1, PowK = 1, T, Ang;
        public double? Egt = 70, OilT;
        public double FfK = 1;
        public string Mag = "BOTH", Sel = "L", MagBad;
        public int Feed;
        public double OilQ;
        public List<CylState> Cyl;
    }
    public sealed class WindState { public double FromDeg, Kt, Gust = 0.4; public double? TopFrom, TopKt, TopFt; }
    public sealed class OptsState { public string Sens = "low"; public bool Assist, AutoRud; public double LevelT; public bool DiffBrake = true; public double? GainCap; }
    public sealed class ElecState { public double Batt = 1, Volts = 12.6, Amps; public bool AltFail; }
    public sealed class OvrState { public double Elev, Ail, Rud; }
    public sealed class SimEvent
    {
        public double T; public string Type, Why;
        public double? Fpm, Kias, GsKt, Pitch, Bank, Crab, LatV, Along, Cross;
        public bool? OnRunway, NoseFirst; public int? Bounces;
    }
    public sealed class TdRecord
    {
        public double T, Fpm, Kias, GsKt, Pitch, Bank, Crab, LatV, Along, Cross;
        public bool OnRunway, NoseFirst; public int Bounces;
    }
    public sealed class OutRecord
    {
        public double Tas, Ias, Gs, Trk, HdgTrue, Pitch, Bank, Vsi, AltTrue, Agl, Alpha, Beta, AStallDeg, AoaFrac, Slip;
        public bool StallWarn, StaticBlocked, AltStatic, GearFault, GearEmerg, Xfeed, Jet, LowOilPress, OnRunway;
        public double PitotIce, WindFrom, WindKt, Rpm, FuelFlow, Mag2, DensAlt, G, Oat, RwyAlong, RwyCross, Vs0, Vs1, GearPos, Prop, PropK, Volts, Hobbs, FuelUsed, FuelRemain, N1, Mach, Rev, Spoiler, ManIn, Rough, CarbIce, FuelPress;
        public double[] Rpms, Fuel, Egts, N1s, ManIns, OilP, OilT, OilQ, FuelPresses;
        public string[] Mags, FuelSels; public double[] Mixs;
        public string Mag, FuelSel; public double Mix, PowerPct, Egt, Cht;
        public bool Cranking, PitotBlocked, GearDown;
        public double? EnduranceH, GovRpm;
        public List<List<CylState>> Cyls = new List<List<CylState>>();
        public List<CylState> Cyl = new List<CylState>();
        public double[] Chts;
        public System.Collections.Generic.List<object> Alerts;
        public string FlapLabel;
        public int Amps;
    }

    // ------------------------------------------------------------------ the world
    public sealed class RwyDef { public string Id; public double N, E, TrueHdg, Len, Wid, ElevFt; }
    public sealed class GroundInfo { public double H; public double[] N; public bool Paved; public string Kind; public bool Water; }

    public static class FlightPhysics
    {
        public const double GROUND_FT = 55;
        public static readonly double GROUND_M = GROUND_FT / PhysMath.FT;
        public const double MAGVAR_W = 6;
        public static readonly RwyDef LAB_RWY = new RwyDef { Id = "LAB RWY 36", N = 0, E = -40000, TrueHdg = 354, Len = 1200, Wid = 30, ElevFt = GROUND_FT };
        public static readonly double[][] LAKES =
        {
            new[] { 6000.0, -36500, 700, 1 }, new[] { 12500.0, -26000, 900, 2.3 }, new[] { -9000.0, -27000, 600, 4 }, new[] { -19000.0, -41000, 1100, 0.5 },
            new[] { 2500.0, -47000, 500, 5.1 }, new[] { -3500.0, -30500, 450, 2.9 }, new[] { 20000.0, -33000, 1300, 3.7 }, new[] { 9000.0, -18000, 800, 1.7 }
        };
        // [alongMin, alongMax, crossMin, crossMax, kind]
        private static readonly double[][] PAVED_RECT =
        {
            new[] { -40.0, LAB_RWY_LEN + 40, -15, 15 }, new[] { -10.0, LAB_RWY_LEN + 10, 95, 110 }, new[] { 10.0, 25, 15, 95 },
            new[] { 600.0, 615, 15, 95 }, new[] { LAB_RWY_LEN - 25, LAB_RWY_LEN - 10, 15, 95 }, new[] { 450.0, 750, 110, 230 }
        };
        private static readonly string[] PAVED_KIND = { "rwy", "twy", "twy", "twy", "twy", "apron" };
        private const double LAB_RWY_LEN = 1200;
        public static readonly double[] FLAP_DEG = { 0, 10, 20, 30 };
        public const double TRIM_MAX = 0.45;
        public const double LINE_FUEL_S = 6, MIX_CUT = 0.12, MIX_OFF = MIX_CUT, MIX_RICH = 0.7, CATCH_S = 1.2;
        public static readonly string[] MAG_POS = { "OFF", "R", "L", "BOTH", "START" };
        public const double LB_KG = 0.45359237, PERSON_KG = 77, FUEL_KG_GAL = 6 * LB_KG;

        public static (double along, double cross) RwyCoords(RwyDef rwy, double n, double e)
        {
            double h = rwy.TrueHdg * PhysMath.DEG, dn = n - rwy.N, de = e - rwy.E;
            return (dn * Math.Cos(h) + de * Math.Sin(h), -dn * Math.Sin(h) + de * Math.Cos(h));
        }
        public static double[] RwyToNE(RwyDef rwy, double along, double cross)
        {
            double h = rwy.TrueHdg * PhysMath.DEG;
            return new[] { rwy.N + along * Math.Cos(h) - cross * Math.Sin(h), rwy.E + along * Math.Sin(h) + cross * Math.Cos(h) };
        }
        public static bool OnRunway(RwyDef rwy, double n, double e, double margin = 0)
        {
            var c = RwyCoords(rwy, n, e);
            return c.along >= -margin && c.along <= rwy.Len + margin && Math.Abs(c.cross) <= rwy.Wid / 2 + margin;
        }
        public static string PavedAt(double n, double e)
        {
            var c = RwyCoords(LAB_RWY, n, e);
            for (int i = 0; i < PAVED_RECT.Length; i++)
            {
                var p = PAVED_RECT[i];
                if (c.along >= p[0] && c.along <= p[1] && c.cross >= p[2] && c.cross <= p[3]) return PAVED_KIND[i];
            }
            return null;
        }
        public static bool InLake(double n, double e)
        {
            foreach (var L in LAKES)
            {
                double dn = n - L[0], de = e - L[1], d = Math.Sqrt(dn * dn + de * de);
                if (d > L[2] * 1.3) continue;
                double a = Math.Atan2(dn, de), rr = L[2] * (1 + 0.16 * Math.Sin(a * 3 + L[3]) + 0.08 * Math.Sin(a * 7 + L[3] * 2));
                if (d < rr) return true;
            }
            return false;
        }
        public static GroundInfo GroundAt(double x, double z)
        {
            double n = -z, e = x; string p = PavedAt(n, e);
            return new GroundInfo { H = GROUND_M, N = new[] { 0.0, 1, 0 }, Paved = p != null, Kind = p, Water = p == null && InLake(n, e) };
        }

        // -------------------------------------------------------------- aircraft data
        public static readonly List<Aircraft> AIRCRAFT = BuildAircraft();
        private static WingGeom W(double y, double dih, double rootX, double tipX, double rootLE, double rootC, double tipLE, double tipC, double t0, double t1, double hinge, double[] flap, double[] ail)
            => new WingGeom { Y = y, Dih = dih, RootX = rootX, TipX = tipX, RootLE = rootLE, RootC = rootC, TipLE = tipLE, TipC = tipC, T0 = t0, T1 = t1, Hinge = hinge, Flap = flap, Ail = ail };
        private static Dictionary<string, double> VDict(params (string, double)[] kv)
        {
            var d = new Dictionary<string, double>();
            foreach (var pair in kv) d[pair.Item1] = pair.Item2;
            return d;
        }
        private static List<Aircraft> BuildAircraft()
        {
            var pa28Fuse = new[]
            {
                new[] { -3.25, 0.30, 0.30, 0.02 }, new[] { -3.05, 0.43, 0.42, 0.02 }, new[] { -2.5, 0.55, 0.54, 0.04 }, new[] { -1.5, 0.60, 0.62, 0.06 }, new[] { -0.5, 0.60, 0.64, 0.08 },
                new[] { 0.6, 0.53, 0.57, 0.10 }, new[] { 1.7, 0.38, 0.44, 0.16 }, new[] { 2.8, 0.22, 0.30, 0.24 }, new[] { 3.75, 0.09, 0.17, 0.30 }, new[] { 4.0, 0.03, 0.07, 0.32 }
            };
            var pa28Wing = W(-0.45, 7, 0.55, 5.4, -1.0, 1.6, -0.85, 1.2, 0.15, 0.12, 0.74, new[] { 0.6, 2.6 }, new[] { 2.8, 5.2 });
            var pa28Hs = new HStabGeom { Y = 0.25, Span = 2.0, RootLE = 3.05, TipLE = 3.05, Te = 3.8, Hinge = 3.05, T = 0.09 };
            var pa28Vs = new VStabGeom { Y0 = 0.25, Y1 = 1.5, RootLE = 2.35, TopLE = 3.2, Te = 3.95, Hinge = 3.55, T = 0.1 };
            var list = new List<Aircraft>
            {
                new Aircraft
                {
                    Id = "pa28", Name = "Piper PA-28-181 Archer", Short = "Archer", Engines1 = 1, Carb = true,
                    Fuse = pa28Fuse, Wing = pa28Wing, HStab = pa28Hs, VStab = pa28Vs,
                    Engines = new List<EngineGeom> { new EngineGeom { Type = "nose", Z = -3.34, Y = 0.02, R = 0.94, Blades = 2 } },
                    Gear = new GearGeom { Fixed = true, WheelR = 0.25, Nose = new[] { 0.0, -1.15, -2.3 }, Mains = new[] { new[] { 1.6, -1.15, 0.25 } } },
                    Eye = new[] { -0.3, 0.62, -0.4 }, FlapLabels = new[] { "UP", "10°", "25°", "40°" }, FuelCap = 24,
                    Phys = new PhysCoeffs
                    {
                        Mass = 1050, S = 15.8, B = 10.8, C = 1.6, L = 7.25, CL0 = 0.28, CLa = 4.8, AStall = 0.28, CD0 = 0.032, K = 0.05, CDgear = 0,
                        Cm0 = 0.015, Cma = -1.1, Cmde = 0.34, Cmq = -15, Clda = 0.055, Clp = -0.5, Clb = -0.12, Cnb = 0.1, Cndr = 0.03, Cnr = -0.14, CYb = -0.6,
                        FlapCL = 0.55, FlapStall = 0.045, FlapCD = 0.7, MaxG = 3.8, RollRate = 55, PitchRate = 12,
                        Engine = new EnginePhys { Type = "prop", P = 134000, T0 = 2400, Eta = 0.85, EtaK = 0.8 }
                    },
                    V = VDict(("s0", 45), ("s1", 50), ("rotate", 60), ("x", 64), ("y", 76), ("climb", 87), ("glide", 76), ("glideLand", 66), ("appr", 70), ("apprShort", 65), ("ga", 64), ("va", 113), ("fe", 102), ("no", 125), ("ne", 154), ("xwind", 17), ("apprFlaps", 3), ("apprThr", 0.3), ("cruise", 110), ("cruiseThr", 0.79), ("toFlaps", 0), ("descMax", 122))
                },
                new Aircraft
                {
                    Id = "pa44", Name = "Piper PA-44-180 Seminole", Short = "Seminole", Engines1 = 2, Twin = true, CounterRotating = true, Cs = true,
                    Fuse = new[]
                    {
                        new[] { -3.3, 0.30, 0.30, 0.02 }, new[] { -3.1, 0.44, 0.43, 0.02 }, new[] { -2.5, 0.58, 0.56, 0.04 }, new[] { -1.5, 0.62, 0.66, 0.06 }, new[] { -0.5, 0.62, 0.68, 0.08 },
                        new[] { 0.6, 0.56, 0.62, 0.10 }, new[] { 1.8, 0.42, 0.48, 0.16 }, new[] { 3.0, 0.26, 0.34, 0.26 }, new[] { 4.3, 0.12, 0.22, 0.36 }, new[] { 5.1, 0.04, 0.10, 0.42 }
                    },
                    Wing = W(-0.45, 7, 0.6, 5.88, -1.0, 1.75, -0.75, 1.25, 0.15, 0.12, 0.74, new[] { 0.6, 3.2 }, new[] { 3.4, 5.6 }),
                    HStab = new HStabGeom { Y = 1.95, Span = 2.0, RootLE = 4.3, TipLE = 4.5, Te = 5.1, Hinge = 4.4, T = 0.09 },
                    VStab = new VStabGeom { Y0 = 0.3, Y1 = 1.95, RootLE = 3.4, TopLE = 4.3, Te = 5.2, Hinge = 4.7, T = 0.1 },
                    Engines = new List<EngineGeom> { new EngineGeom { Type = "wing", X = 1.95, Y = -0.35, Z = -2.1, R = 0.94, Blades = 2 } },
                    Gear = new GearGeom { Fixed = false, WheelR = 0.27, Nose = new[] { 0.0, -1.2, -2.5 }, Mains = new[] { new[] { 1.6, -1.2, 0.3 } } },
                    Eye = new[] { -0.3, 0.58, -0.6 }, FlapLabels = new[] { "UP", "10°", "25°", "40°" }, FuelCap = 54,
                    Phys = new PhysCoeffs
                    {
                        Mass = 1650, S = 17.08, B = 11.77, C = 1.6, L = 8.41, CL0 = 0.32, CLa = 4.8, AStall = 0.29, CD0 = 0.028, K = 0.05, CDgear = 0.022,
                        Cm0 = 0.01, Cma = -1.1, Cmde = 0.32, Cmq = -16, Clda = 0.055, Clp = -0.5, Clb = -0.1, Cnb = 0.11, Cndr = 0.045, Cnr = -0.14, CYb = -0.6,
                        FlapCL = 0.55, FlapStall = 0.045, FlapCD = 0.7, MaxG = 3.8, RollRate = 50, PitchRate = 11,
                        Engine = new EnginePhys { Type = "prop", P = 268000, T0 = 5200, Eta = 0.82, EtaK = 0.45 }
                    },
                    V = VDict(("s0", 55), ("s1", 57), ("mc", 56), ("rotate", 75), ("x", 82), ("y", 88), ("xse", 88), ("sse", 82), ("yse", 88), ("glide", 88), ("appr", 88), ("apprFull", 80), ("ga", 88), ("va", 135), ("fe", 111), ("lo", 109), ("le", 140), ("no", 169), ("ne", 202), ("xwind", 17), ("apprFlaps", 2), ("apprThr", 0.3), ("cruise", 140), ("cruiseThr", 0.75), ("toFlaps", 0), ("climb", 105))
                },
                new Aircraft
                {
                    Id = "pa28r", Name = "Piper PA-28R-201 Arrow III", Short = "Arrow", Engines1 = 1, Cs = true, PropCtrl = true, Complex = true, PropGov = new[] { 1900.0, 2700 },
                    Fuse = pa28Fuse, Wing = pa28Wing, HStab = pa28Hs, VStab = pa28Vs,
                    Engines = new List<EngineGeom> { new EngineGeom { Type = "nose", Z = -3.34, Y = 0.02, R = 0.99, Blades = 3 } },
                    Gear = new GearGeom { Fixed = false, WheelR = 0.25, Nose = new[] { 0.0, -1.15, -2.3 }, Mains = new[] { new[] { 1.6, -1.15, 0.25 } } },
                    Eye = new[] { -0.3, 0.62, -0.4 }, FlapLabels = new[] { "UP", "10°", "25°", "40°" }, FuelCap = 36,
                    Phys = new PhysCoeffs
                    {
                        Mass = 1180, S = 15.8, B = 10.8, C = 1.6, L = 7.36, CL0 = 0.28, CLa = 4.8, AStall = 0.28, CD0 = 0.030, K = 0.05, CDgear = 0.020,
                        Cm0 = 0.015, Cma = -1.1, Cmde = 0.34, Cmq = -15, Clda = 0.055, Clp = -0.5, Clb = -0.12, Cnb = 0.1, Cndr = 0.03, Cnr = -0.14, CYb = -0.6,
                        FlapCL = 0.55, FlapStall = 0.045, FlapCD = 0.7, MaxG = 3.8, RollRate = 55, PitchRate = 12,
                        Engine = new EnginePhys { Type = "prop", P = 149000, T0 = 2800, Eta = 0.85, EtaK = 0.55 }
                    },
                    V = VDict(("s0", 53), ("s1", 58), ("rotate", 65), ("x", 78), ("y", 90), ("climb", 100), ("glide", 79), ("glideLand", 72), ("appr", 75), ("apprShort", 70), ("ga", 78), ("va", 125), ("fe", 103), ("lo", 107), ("le", 129), ("no", 146), ("ne", 183), ("xwind", 17), ("apprFlaps", 3), ("apprThr", 0.3), ("cruise", 125), ("cruiseThr", 0.75), ("toFlaps", 0))
                },
                new Aircraft
                {
                    Id = "b737", Name = "Boeing 737-800", Short = "737", Engines1 = 2, Twin = true, CounterRotating = true, Jet = true,
                    Fuse = new[]
                    {
                        new[] { -19.0, 0.9, 1.2, -0.3 }, new[] { -17.0, 1.8, 1.85, -0.85 }, new[] { -10.0, 1.88, 1.88, -0.95 }, new[] { 5.0, 1.88, 1.88, -0.95 },
                        new[] { 12.0, 1.8, 1.8, -0.8 }, new[] { 16.0, 1.3, 1.5, -0.2 }, new[] { 18.8, 0.35, 0.6, 0.55 }
                    },
                    Wing = W(-1.1, 6, 0.7, 17.9, -3.0, 6.2, 3.6, 1.7, 0.15, 0.10, 0.75, new[] { 0.8, 9.5 }, new[] { 10.5, 16.5 }),
                    HStab = new HStabGeom { Y = 1.2, Span = 7.0, RootLE = 14.5, TipLE = 16.5, Te = 18.6, Hinge = 16.8, T = 0.09 },
                    VStab = new VStabGeom { Y0 = 1.0, Y1 = 6.2, RootLE = 13.0, TopLE = 16.8, Te = 18.8, Hinge = 17.4, T = 0.1 },
                    Engines = new List<EngineGeom> { new EngineGeom { Type = "wing", X = 5.9, Y = -1.9, Z = -4.6, R = 1.0, Blades = 0 } },
                    Gear = new GearGeom { Fixed = false, WheelR = 0.55, Nose = new[] { 0.0, -3.6, -14.5 }, Mains = new[] { new[] { 2.35, -3.6, 1.8 } } },
                    Eye = new[] { -0.7, 1.1, -17.5 }, FlapLabels = new[] { "UP", "5", "15", "40" }, FuelCap = 2600,
                    Phys = new PhysCoeffs
                    {
                        Mass = 48000, S = 124.6, B = 35.8, C = 3.48, L = 37.6, CL0 = 0.30, CLa = 5.0, AStall = 0.33, CD0 = 0.020, K = 0.042, CDgear = 0.020,
                        Cm0 = 0.01, Cma = -1.1, Cmde = 0.34, Cmq = -15, Clda = 0.055, Clp = -0.5, Clb = -0.12, Cnb = 0.1, Cndr = 0.03, Cnr = -0.14, CYb = -0.6,
                        FlapCL = 0.75, FlapStall = 0.05, FlapCD = 0.055, MaxG = 3.8, RollRate = 40, PitchRate = 8,
                        Engine = new EnginePhys { Type = "jet", T0 = 138000, FfK = 0.70 }
                    },
                    V = VDict(("s0", 97), ("s1", 109), ("rotate", 128), ("x", 135), ("y", 150), ("climb", 170), ("glide", 150), ("appr", 138), ("ga", 135), ("va", 270), ("fe", 230), ("no", 340), ("ne", 340), ("xwind", 33), ("apprFlaps", 3), ("apprThr", 0.25), ("cruise", 300), ("cruiseThr", 0.78), ("toFlaps", 1), ("descMax", 320))
                }
            };
            return list;
        }
        public static Aircraft FindAircraft(string id)
        {
            foreach (var a in AIRCRAFT) if (a.Id == id) return a;
            return AIRCRAFT[0];
        }

        public static readonly Dictionary<string, WbTable> WB = new Dictionary<string, WbTable>
        {
            ["pa28"] = new WbTable { MtowLb = 2550, FwdIn = 82, AftIn = 93, EmptyArm = 85.5, FrontArm = 80.5, RearArm = 118.1, BagArm = 142.8, BagMaxKg = 90, FuelArm = 95, TabsGal = 17 },
            ["pa44"] = new WbTable { MtowLb = 3800, FwdIn = 84, AftIn = 94, EmptyArm = 89, FrontArm = 84, RearArm = 118.9, BagArm = 142, BagMaxKg = 90, FuelArm = 95.7, TabsGal = 40 },
            ["pa28r"] = new WbTable { MtowLb = 2750, FwdIn = 84, AftIn = 93, EmptyArm = 86, FrontArm = 80.5, RearArm = 118.1, BagArm = 142.8, BagMaxKg = 90, FuelArm = 95, TabsGal = 25 },
            ["b737"] = new WbTable { MtowLb = 174200, FwdIn = 640, AftIn = 690, EmptyArm = 655, FrontArm = 470, RearArm = 700, BagArm = 760, BagMaxKg = 2000, FuelArm = 655, TabsGal = 1300 }
        };
    }

    // ------------------------------------------------------------------ aerodynamics
    public sealed class WingFns
    {
        private readonly WingGeom w;
        public WingFns(WingGeom w) { this.w = w; }
        private double F(double ax) => PhysMath.Clamp((ax - w.RootX) / (w.TipX - w.RootX), 0, 1);
        public double Y(double ax) => w.Y + (ax - w.RootX) * Math.Tan(w.Dih * PhysMath.DEG);
        public double C(double ax) => PhysMath.Lerp(w.RootC, w.TipC, F(ax));
        public double Le(double ax) => PhysMath.Lerp(w.RootLE, w.TipLE, F(ax));
        public double T(double ax) => PhysMath.Lerp(w.T0, w.T1, F(ax));
    }
    public sealed class AeroOpts
    {
        public double FlapF, Elev, Ail, Rud, Dq, Spoiler, Dt;
        public float[] StH;
        public Func<Piece, double> Hgt;
        public Func<Piece, double[]> Gust;
    }
    public sealed class AeroResult { public double[] F, M; public double CLw, StallW; }
    public sealed class AtmosResult { public double T, P, Rho, A, Sigma; }

    public static class Aero
    {
        public static double[] FuseAt(double[][] F, double z)
        {
            for (int i = 0; i < F.Length - 1; i++)
            {
                var a = F[i]; var b = F[i + 1];
                if (z <= b[0])
                {
                    double t = PhysMath.Clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
                    var r = new double[4];
                    for (int k = 0; k < 4; k++) r[k] = PhysMath.Lerp(a[k], b[k], t);
                    return r;
                }
            }
            return F[F.Length - 1];
        }

        public static AeroResult AeroElements(Elements E, DerivedAC P, double[] vb, double[] w, double rho, AeroOpts o)
        {
            var F = new double[3]; var M = new double[3];
            double V = Math.Sqrt(vb[0] * vb[0] + vb[1] * vb[1] + vb[2] * vb[2]); if (V == 0) V = 1;
            double sb = vb[0] / V;
            double clw = 0, stw = 0, eps = 0;
            double geEps = 1;
            if (o.Hgt != null)
            {
                Piece tp = null;
                foreach (var p in E.Pcs) if (p.Kind == 1) { tp = p; break; }
                if (tp != null) { double hh = Math.Max(o.Hgt(tp), 0.3) / P.B, gg = (16 * hh * hh) / (1 + 16 * hh * hh); geEps = 0.93 + 0.07 * gg; }
            }
            double aS0 = P.AStall - P.FlapStall * o.FlapF;
            for (int pass = 0; pass < 2; pass++)
            {
                for (int pi = 0; pi < E.Pcs.Count; pi++)
                {
                    var p = E.Pcs[pi];
                    if ((p.Kind == 0) != (pass == 0)) continue;
                    var r = p.R;
                    double vx = vb[0] + w[1] * r[2] - w[2] * r[1], vy = vb[1] + w[2] * r[0] - w[0] * r[2], vz = vb[2] + w[0] * r[1] - w[1] * r[0];
                    if (o.Gust != null) { var gg = o.Gust(p); vx -= gg[0]; vy -= gg[1]; vz -= gg[2]; }
                    var s = p.SDir; var n = p.N;
                    double vs = vx * s[0] + vy * s[1] + vz * s[2];
                    double px = vx - vs * s[0], py = vy - vs * s[1], pz = vz - vs * s[2];
                    double Vp = Math.Sqrt(px * px + py * py + pz * pz);
                    if (Vp < 0.5) continue;
                    double a = Math.Atan2(-(px * n[0] + py * n[1] + pz * n[2]), -pz);
                    double qd = 0.5 * rho * Vp * Vp;
                    double slope, cl0 = 0, dcl = 0, aS, cdi, ge = 1;
                    if (p.Kind == 0)
                    {
                        a += p.Side * E.Gdi * sb;
                        if (o.Hgt != null) { double h = Math.Max(o.Hgt(p), 0.3) / P.B; ge = (16 * h * h) / (1 + 16 * h * h); }
                        slope = P.CLa * (1 + 0.06 * (1 - ge));
                        cl0 = P.CL0 + (p.Flap ? P.FlapCL * o.FlapF * E.FlapK : 0) - 0.30 * o.Spoiler;
                        dcl = p.Ail != 0 ? E.Ka * o.Ail * p.Ail : 0;
                        aS = aS0 + 0.03 * p.Span01;
                        cdi = P.K * ge + 0.02 * o.Spoiler;
                    }
                    else if (p.Kind == 1) { a += E.It - eps; slope = E.At; dcl = E.Ke * o.Elev; aS = 0.32; cdi = 0.09; }
                    else { slope = E.Af; dcl = E.Kr * o.Rud; aS = 0.36; cdi = 0.09; }
                    double over = Math.Max(a - aS, -aS - 0.06 - a);
                    double st = PhysMath.Smoothstep(0, 0.07, over);
                    if (o.StH != null)
                    {
                        double cur = o.StH[pi], tau = st > cur ? 0.06 : 0.4;
                        double nv = cur + (st - cur) * Math.Min(1, o.Dt / tau);
                        o.StH[pi] = (float)nv; st = o.StH[pi];
                    }
                    double lin = cl0 + slope * a + dcl * (1 - 0.5 * st);
                    double CL = PhysMath.Lerp(lin, 1.15 * Math.Sin(2 * a), st), sa = Math.Sin(a);
                    double CD = cdi * lin * lin * (1 - st) + st * 1.25 * sa * sa;
                    double lx = s[1] * pz - s[2] * py, ly = s[2] * px - s[0] * pz, lz = s[0] * py - s[1] * px;
                    double ll = Math.Sqrt(lx * lx + ly * ly + lz * lz); if (ll == 0) ll = 1;
                    double k = qd * p.S;
                    double cx = p.Kind != 0 ? o.Dq * p.Wash * p.S * dcl * (1 - 0.5 * st) : 0;
                    double fx = k * (CL * lx / ll - CD * px / Vp) + cx * lx / ll, fy = k * (CL * ly / ll - CD * py / Vp) + cx * ly / ll, fz = k * (CL * lz / ll - CD * pz / Vp) + cx * lz / ll;
                    if (p.Kind == 1) { F[0] -= k * CD * px / Vp; F[1] -= k * CD * py / Vp; F[2] -= k * CD * pz / Vp; }
                    else { F[0] += fx; F[1] += fy; F[2] += fz; }
                    M[0] += (p.Kind == 0 ? 0 : r[1]) * fz - r[2] * fy; M[1] += r[2] * fx - r[0] * fz; M[2] += r[0] * fy - r[1] * fx;
                    p.Cl = CL; p.St = st; p.A = a;
                    if (p.Kind == 0) { clw += CL * p.S; stw += st * p.S; }
                    if (pass == 0) eps = E.Deps * (clw / P.S) / P.CLa * geEps;
                }
            }
            return new AeroResult { F = F, M = M, CLw = clw / P.S, StallW = stw / P.S };
        }

        private sealed class TuneOpts { public double? A, B; public double[] Vb, W; public double Elev, Ail, Rud; }
        public static Elements BuildElements(Aircraft A, DerivedAC P)
        {
            var W = new WingFns(A.Wing); var w = A.Wing; var hs = A.HStab; var vs = A.VStab;
            var pcs = new List<Piece>();
            double Gd = w.Dih * PhysMath.DEG; var fwd = new[] { 0.0, 0, -1 };
            double area = 0, flapS = 0;
            const int EL_N = 8;
            for (int sideI = 0; sideI < 2; sideI++)
            {
                int side = sideI == 0 ? -1 : 1;
                for (int i = 0; i < EL_N; i++)
                {
                    double x0 = w.TipX * i / EL_N, x1 = w.TipX * (i + 1) / EL_N, xc = (x0 + x1) / 2, xa = Math.Max(xc, w.RootX);
                    double c = W.C(xa);
                    var sdir = PhysMath.VNorm(new[] { 1.0, side * Math.Tan(Gd), 0 });
                    var p = new Piece
                    {
                        Kind = 0, Side = side, S = c * (x1 - x0), R = new[] { side * xc, W.Y(xa), W.Le(xa) + 0.25 * c },
                        SDir = sdir, N = PhysMath.VNorm(PhysMath.VCross(sdir, fwd)),
                        Flap = w.Flap != null && xc >= w.Flap[0] && xc <= w.Flap[1],
                        Ail = xc >= w.Ail[0] - 0.2 && xc <= w.Ail[1] ? side : 0, Span01 = xc / w.TipX
                    };
                    pcs.Add(p); area += p.S;
                }
            }
            foreach (var p in pcs) { p.S *= P.S / area; if (p.Flap) flapS += p.S; }
            Func<double, double> hle = x => PhysMath.Lerp(hs.RootLE, hs.TipLE, x / hs.Span);
            for (int sideI = 0; sideI < 2; sideI++)
            {
                int side = sideI == 0 ? -1 : 1;
                for (int i = 0; i < 2; i++)
                {
                    double xc = hs.Span * (i + 0.5) / 2, c = Math.Max(hs.Te - hle(xc), 0.2);
                    pcs.Add(new Piece { Kind = 1, Side = side, S = c * hs.Span / 2, R = new[] { side * xc, hs.Y, hle(xc) + 0.25 * c }, SDir = new[] { 1.0, 0, 0 }, N = new[] { 0.0, 1, 0 }, Wash = i != 0 ? 0.6 : 1 });
                }
            }
            Func<double, double> fle = y => PhysMath.Lerp(vs.RootLE, vs.TopLE, (y - vs.Y0) / (vs.Y1 - vs.Y0));
            for (int i = 0; i < 2; i++)
            {
                double dy = (vs.Y1 - vs.Y0) / 2, yc = vs.Y0 + dy * (i + 0.5), c = Math.Max(vs.Te - fle(yc), 0.2);
                pcs.Add(new Piece { Kind = 2, Side = 0, S = c * dy, R = new[] { 0.0, yc, fle(yc) + 0.25 * c }, SDir = new[] { 0.0, 1, 0 }, N = new[] { -1.0, 0, 0 }, Wash = i != 0 ? 0.5 : 1 });
            }
            var E = new Elements { Pcs = pcs, FlapK = flapS > 0 ? P.S / flapS : 0, At = 3.5, Af = 3, It = 0, Deps = 0.35, Ke = 1, Ka = 1, Kr = 1 };
            double Vc = A.VGet("cruise") / PhysMath.KT, rho = 1.225, q = 0.5 * rho * Vc * Vc, hv = 0.25 * rho * Vc;
            double a0 = (P.Mass * PhysMath.G / (q * P.S) - P.CL0) / P.CLa;
            Func<double, double, double[]> vAt = (a, b) => new[] { Vc * Math.Sin(b), -Vc * Math.Sin(a) * Math.Cos(b), -Vc * Math.Cos(a) * Math.Cos(b) };
            Func<TuneOpts, AeroResult> run = o => AeroElements(E, P, o.Vb ?? vAt(o.A ?? a0, o.B ?? 0), o.W ?? new double[3], rho, new AeroOpts { FlapF = 0, Elev = o.Elev, Ail = o.Ail, Rud = o.Rud, Dq = 0 });
            Func<Func<double, double>, double, double> d = (f, h) => (f(h) - f(-h)) / (2 * h);
            Func<TuneOpts, double> Mx = o => run(o).M[0];
            Func<TuneOpts, double> Lroll = o => -run(o).M[2];
            Func<TuneOpts, double> Nyaw = o => -run(o).M[1];
            double qSc = q * P.S * P.C, qSb = q * P.S * P.B;
            Func<double, double> slope = atv => { E.At = atv; return d(h => Mx(new TuneOpts { A = a0 + h }), 0.01); };
            double s0 = slope(0), s1 = slope(1);
            double atSolved = (P.Cma * Math.Cos(a0) * qSc - s0) / (s1 - s0);
            atSolved = PhysMath.Clamp(double.IsFinite(atSolved) ? atSolved : 3.5, 0.5, 14); E.At = atSolved;
            E.DCma = P.Cma - slope(atSolved) / (qSc * Math.Cos(a0));
            E.It = 0; double m0 = Mx(new TuneOpts { A = 0 }); E.It = 0.01; double m1 = Mx(new TuneOpts { A = 0 }); E.It = -m0 * 0.01 / (m1 - m0);
            E.Ke = 1; E.Ke = P.Cmde * qSc / d(h => Mx(new TuneOpts { Elev = h }), 0.05);
            E.DCmF = 0;
            {
                double mm0 = run(new TuneOpts()).M[0];
                double mm1 = AeroElements(E, P, vAt(a0, 0), new double[3], rho, new AeroOpts { FlapF = 1, Elev = 0, Ail = 0, Rud = 0, Dq = 0 }).M[0];
                E.DCmF = w.Flap != null ? -(mm1 - mm0) / qSc : 0;
            }
            E.DCmq = P.Cmq - d(h => Mx(new TuneOpts { W = new[] { h, 0.0, 0 } }), 0.02) / (hv * P.S * P.C * P.C);
            E.Ka = 1; E.Ka = P.Clda * qSb / d(h => Lroll(new TuneOpts { Ail = h }), 0.05);
            Func<double, double> nb = af => { E.Af = af; return d(h => Nyaw(new TuneOpts { B = h }), 0.01); };
            double n0 = nb(0), n1 = nb(1); E.Af = PhysMath.Clamp((P.Cnb * qSb - n0) / (n1 - n0), 0.3, 14);
            E.Kr = 1; E.Kr = P.Cndr * qSb / d(h => Nyaw(new TuneOpts { Rud = h }), 0.05);
            Func<double, double> lb = gdi => { E.Gdi = gdi; return d(h => Lroll(new TuneOpts { B = h }), 0.01); };
            double l0 = lb(0), l1 = lb(1); E.Gdi = (P.Clb * qSb - l0) / (l1 - l0);
            E.DClp = P.Clp - d(h => Lroll(new TuneOpts { W = new[] { 0.0, 0, -h } }), 0.02) / (hv * P.S * P.B * P.B);
            E.DClr = P.Clr - d(h => Lroll(new TuneOpts { W = new[] { 0.0, -h, 0 } }), 0.02) / (hv * P.S * P.B * P.B);
            E.DCnr = P.Cnr - d(h => Nyaw(new TuneOpts { W = new[] { 0.0, -h, 0 } }), 0.02) / (hv * P.S * P.B * P.B);
            E.DCnp = P.Cnp - d(h => Nyaw(new TuneOpts { W = new[] { 0.0, 0, -h } }), 0.02) / (hv * P.S * P.B * P.B);
            E.DCnda = P.Cnda - d(h => Nyaw(new TuneOpts { Ail = h }), 0.05) / qSb;
            E.DCY = P.CYb - d(h => run(new TuneOpts { B = h }).F[0], 0.01) / (q * P.S);
            {
                double sy = 0, sz = 0, sa = 0;
                foreach (var p in pcs) if (p.Kind == 2) { sy += p.R[1] * p.S; sz += p.R[2] * p.S; sa += p.S; }
                E.FinYZ = sa != 0 ? sy / Math.Max(sz, 0.5) : 0;
            }
            return E;
        }

        public static DerivedBundle DeriveAircraft(Aircraft A, double? mass = null, WbResult load = null)
        {
            var phys = A.Phys;
            double m = mass ?? phys.Mass;
            var ac = new DerivedAC
            {
                Mass = m, S = phys.S, B = phys.B, C = phys.C, L = phys.L, CL0 = phys.CL0, CLa = phys.CLa, AStall = phys.AStall, CD0 = phys.CD0, K = phys.K, CDgear = phys.CDgear,
                Cm0 = phys.Cm0, Cma = phys.Cma, Cmde = phys.Cmde, Cmq = phys.Cmq, Clda = phys.Clda, Clp = phys.Clp, Clb = phys.Clb, Cnb = phys.Cnb, Cndr = phys.Cndr, Cnr = phys.Cnr, CYb = phys.CYb,
                FlapCL = phys.FlapCL, FlapStall = phys.FlapStall, FlapCD = phys.FlapCD, MaxG = phys.MaxG, RollRate = phys.RollRate, PitchRate = phys.PitchRate,
                Engine = phys.Engine,
                Cnda = phys.Cnda ?? -0.1 * phys.Clda, Cnp = phys.Cnp ?? -0.04, Clr = phys.Clr ?? 0.06
            };
            if (load != null)
            {
                double dIn = load.CgIn - RefCgOf(A);
                ac.Cma = phys.Cma + phys.CLa * dIn / (ac.C / 0.0254);
                ac.Cm0 = phys.Cm0 + PhysMath.Clamp(dIn * 0.0025, -0.015, 0.015);
            }
            double iMul = 1;
            if (load != null) { double rs = RefSpreadOf(A); if (rs > 0) iMul = PhysMath.Clamp(0.7 + 0.3 * (load.SpreadIn * load.SpreadIn) / (rs * rs), 0.9, 1.35); }
            ac.I = new[] { m * Math.Pow(0.18 * ac.L, 2) * iMul, m * Math.Pow(0.19 * (ac.L + ac.B) / 2, 2), m * Math.Pow(0.12 * ac.B, 2) * iMul };
            double wr = A.Gear.WheelR, bottom = A.Gear.Nose[1] - wr, zn = A.Gear.Nose[2], zm = A.Gear.Mains[0][2];
            double Fn = m * PhysMath.G * zm / (zm - zn), Fm = m * PhysMath.G * -zn / (zm - zn) / (A.Gear.Mains.Length * 2);
            double defl = PhysMath.Clamp(wr * 0.38, 0.05, 0.22);
            Func<double, (double k, double c)> spring = ld => { double k = ld / defl; return (k, 2 * 0.65 * Math.Sqrt(k * ld / PhysMath.G)); };
            var wheels = new List<Wheel>();
            {
                var sp = spring(Math.Max(Fn, m * PhysMath.G * 0.35));
                wheels.Add(new Wheel { Off = new[] { 0.0, bottom, zn }, K = sp.k, C = sp.c, Nose = true });
            }
            foreach (var mm in A.Gear.Mains)
            {
                for (int si = 0; si < 2; si++)
                {
                    int sg = si == 0 ? -1 : 1;
                    var sp = spring(Fm);
                    wheels.Add(new Wheel { Off = new[] { sg * mm[0], bottom, mm[2] }, K = sp.k, C = sp.c, Nose = false });
                }
            }
            var F = A.Fuse; double zTail = F[F.Length - 1][0];
            var tailSt = FuseAt(F, zTail - (zTail - F[0][0]) * 0.1);
            var W = new WingFns(A.Wing); var hs = A.HStab; var vs = A.VStab;
            var hard = new List<HardPt>
            {
                new HardPt { Off = new[] { 0.0, F[0][3], F[0][0] - (A.Engines[0].Type == "nose" ? 0.4 : 0) }, Name = "機首" },
                new HardPt { Off = new[] { -A.Wing.TipX, W.Y(A.Wing.TipX), W.Le(A.Wing.TipX) + W.C(A.Wing.TipX) * 0.4 }, Name = "左の翼端" },
                new HardPt { Off = new[] { A.Wing.TipX, W.Y(A.Wing.TipX), W.Le(A.Wing.TipX) + W.C(A.Wing.TipX) * 0.4 }, Name = "右の翼端" },
                new HardPt { Off = new[] { 0.0, vs.Y1, vs.TopLE + 0.2 }, Name = "垂直尾翼" },
                new HardPt { Off = new[] { -hs.Span, hs.Y, (hs.TipLE + hs.Te) / 2 }, Name = "水平尾翼" },
                new HardPt { Off = new[] { hs.Span, hs.Y, (hs.TipLE + hs.Te) / 2 }, Name = "水平尾翼" }
            };
            for (int si = 0; si < 2; si++)
            {
                int sg = si == 0 ? -1 : 1;
                double x = A.Wing.TipX * 0.55;
                hard.Add(new HardPt { Off = new[] { sg * x, W.Y(x) - W.T(x) * W.C(x) * 0.3, W.Le(x) + W.C(x) * 0.4 }, Name = sg < 0 ? "左翼" : "右翼" });
            }
            foreach (var z in new[] { F[0][0] * 0.45, F[F.Length - 1][0] * 0.3 })
            {
                var f = FuseAt(F, z);
                hard.Add(new HardPt { Off = new[] { 0.0, f[3] - f[2], z }, Name = "胴体下面" });
            }
            foreach (var e in A.Engines)
            {
                if (e.Type == "nose") hard.Add(new HardPt { Off = new[] { 0.0, e.Y - e.R, e.Z }, Name = "プロペラ" });
                if (e.Type == "wing") for (int si = 0; si < 2; si++) { int sg = si == 0 ? -1 : 1; hard.Add(new HardPt { Off = new[] { sg * e.X, e.Y - e.R, e.Z }, Name = "プロペラ" }); }
            }
            var Eng = phys.Engine;
            var pr = new PropDerived();
            double Vc = A.VGet("cruise") / PhysMath.KT, qc = 0.5 * 1.225 * Vc * Vc, CLc = m * PhysMath.G / (qc * ac.S), acA = (CLc - ac.CL0) / ac.CLa;
            double Tc = (ac.CD0 + ac.CDgear * (A.Gear.Fixed ? 1 : 0) + ac.K * CLc * CLc) * qc * ac.S;
            pr.Vd = Vc * 1.2; pr.A0 = 0.012 * ac.B; pr.A1 = 0.15 * ac.B;
            pr.Fin = A.CounterRotating ? 0 : Tc * (pr.A0 + pr.A1 * acA) / qc;
            if (A.CounterRotating) { pr.A0 = 0; pr.A1 = 0; }
            pr.Ip = 2.5 * Eng.P / 92000 / A.Engines1; pr.Tq = A.CounterRotating ? 0 : 0.12 * Math.Min(1, 92000 / Eng.P);
            if (A.Jet) { pr.A0 = 0; pr.A1 = 0; pr.Fin = 0; pr.Ip = 0; pr.Tq = 0; }
            double thrC = A.V.TryGetValue("cruiseThr", out var ctv) && ctv != 0 ? ctv : 0.65;
            double omC = RpmFor(A, thrC, Vc) * Math.PI / 30;
            ac.Prop = pr;
            ac.El = BuildElements(A, ac);
            double finRollC = -ac.El.FinYZ * (-Tc * pr.A0 + pr.Fin * qc);
            pr.Rig = A.Jet ? 0 : ((0.04 + 0.96 * thrC) * Eng.P / 0.85 / omC * pr.Tq - finRollC) / qc;
            return new DerivedBundle
            {
                AC = ac, Wheels = wheels, WheelBottom = bottom, HardPts = hard,
                TailSkid = new TailSkidDef { Off = new[] { 0.0, tailSt[3] - tailSt[2], zTail - (zTail - F[0][0]) * 0.1 }, K = 30 * m, C = 4 * m }
            };
        }

        // ---------------------------------------------------------- weight & balance
        public static Loading StdLoading() => new Loading { Fuel = "std", Front = 2, Rear = 0, BagKg = 0 };
        public static Loading CleanLoading(Aircraft A, Loading ld)
        {
            if (!FlightPhysics.WB.TryGetValue(A.Id, out var W)) return StdLoading();
            var o = ld ?? new Loading();
            string fuel = (o.Fuel == "std" || o.Fuel == "full" || o.Fuel == "tabs" || o.Fuel == "half") ? o.Fuel : "std";
            return new Loading
            {
                Fuel = fuel,
                Front = (int)PhysMath.Clamp(Js.Round((double)(double.IsNaN(o.Front) ? 2 : o.Front)), 0, 2),
                Rear = (int)PhysMath.Clamp(Js.Round((double)(double.IsNaN(o.Rear) ? 0 : o.Rear)), 0, 2),
                BagKg = PhysMath.Clamp(double.IsNaN(o.BagKg) ? 0 : o.BagKg, 0, W.BagMaxKg)
            };
        }
        public static double FuelPerTank(Aircraft A, string mode)
        {
            var W = FlightPhysics.WB[A.Id];
            return mode == "full" ? A.FuelCap : mode == "tabs" ? W.TabsGal : mode == "half" ? A.FuelCap / 2 : A.FuelCap * 0.8;
        }
        public static WbResult ComputeWB(Aircraft A, Loading ld, double[] fuelGal = null)
        {
            if (!FlightPhysics.WB.TryGetValue(A.Id, out var W)) return null;
            var L = CleanLoading(A, ld);
            double[] fg = (fuelGal != null && fuelGal.Length == 2 && double.IsFinite(fuelGal[0]) && double.IsFinite(fuelGal[1]))
                ? fuelGal : new[] { FuelPerTank(A, L.Fuel), FuelPerTank(A, L.Fuel) };
            double emptyKg = A.Phys.Mass - 2 * FlightPhysics.PERSON_KG - 2 * A.FuelCap * 0.8 * FlightPhysics.FUEL_KG_GAL;
            double kg = emptyKg + L.Front * FlightPhysics.PERSON_KG + L.Rear * FlightPhysics.PERSON_KG + L.BagKg + (fg[0] + fg[1]) * FlightPhysics.FUEL_KG_GAL;
            double mom = emptyKg * W.EmptyArm + L.Front * FlightPhysics.PERSON_KG * W.FrontArm + L.Rear * FlightPhysics.PERSON_KG * W.RearArm + L.BagKg * W.BagArm + (fg[0] + fg[1]) * FlightPhysics.FUEL_KG_GAL * W.FuelArm;
            if (L.Front == 2 && L.Rear == 0 && L.BagKg == 0 && Math.Abs(fg[0] - A.FuelCap * 0.8) < 1e-9 && Math.Abs(fg[1] - A.FuelCap * 0.8) < 1e-9) kg = A.Phys.Mass;
            double cgIn = mom / kg, lb = kg / FlightPhysics.LB_KG;
            var problems = new List<string>();
            if (lb > W.MtowLb) problems.Add("over");
            if (cgIn < W.FwdIn) problems.Add("nose"); else if (cgIn > W.AftIn) problems.Add("tail");
            double spreadIn = Math.Sqrt((emptyKg * Math.Pow(W.EmptyArm - cgIn, 2) + L.Front * FlightPhysics.PERSON_KG * Math.Pow(W.FrontArm - cgIn, 2) + L.Rear * FlightPhysics.PERSON_KG * Math.Pow(W.RearArm - cgIn, 2) + L.BagKg * Math.Pow(W.BagArm - cgIn, 2) + (fg[0] + fg[1]) * FlightPhysics.FUEL_KG_GAL * Math.Pow(W.FuelArm - cgIn, 2)) / kg);
            return new WbResult { Kg = kg, Lb = lb, CgIn = cgIn, SpreadIn = spreadIn, MtowLb = W.MtowLb, FwdIn = W.FwdIn, AftIn = W.AftIn, Ok = problems.Count == 0, Problems = problems, FuelGal = new[] { fg[0], fg[1] }, Loading = L, EmptyKg = emptyKg };
        }
        public static double RefCgOf(Aircraft A) { var w = ComputeWB(A, StdLoading()); return w != null ? w.CgIn : 0; }
        public static double RefSpreadOf(Aircraft A) { var w = ComputeWB(A, StdLoading()); return w != null ? w.SpreadIn : 0; }

        // ---------------------------------------------------------- atmosphere / wind / rpm
        public static AtmosResult Atmos(double h, double dev = 0)
        {
            h = Math.Max(h, -500);
            double Ts, p;
            if (h < 11000) { Ts = 288.15 - 0.0065 * h; p = 101325 * Math.Pow(Ts / 288.15, 5.25588); }
            else { Ts = 216.65; p = 22632.1 * Math.Exp(-(h - 11000) / 6341.62); }
            double T = Ts + dev, rho = p / (287.05 * T);
            return new AtmosResult { T = T, P = p, Rho = rho, A = Math.Sqrt(1.4 * 287.05 * T), Sigma = rho / 1.225 };
        }
        public static double RpmFor(Aircraft A, double thr, double u, double pw = 1, bool dead = false, double? propLev = null)
        {
            if (A != null && A.Jet) return dead ? PhysMath.Clamp(6 * u, 0, 900) : (20 + 84 * Math.Pow(PhysMath.Clamp(thr, 0, 1), 1.15)) / 100 * 5200;
            if (dead) return PhysMath.Clamp(14 * u, 0, 1300);
            if (A != null && A.PropCtrl) { double gov = A.PropGov[0] + (A.PropGov[1] - A.PropGov[0]) * PhysMath.Clamp(propLev ?? 1, 0, 1); return gov * PhysMath.Clamp(0.30 + 3.0 * Math.Max(thr, 0), 0, 1); }
            if (A != null && A.Cs) return 2250 + 450 * Math.Sqrt(Math.Max(thr, 0));
            return Math.Min(650 + 1650 * Math.Sqrt(Math.Max(thr, 0)) * Math.Pow(Math.Max(pw, 0.1), 0.3) + 6 * Math.Max(u, 0), 2850);
        }
        public static double WindGradient(double agl) { double h = PhysMath.Clamp(agl, 1, 400); return PhysMath.Clamp(Math.Log(h / 0.03) / Math.Log(10 / 0.03), 0.55, 1.35); }
        public static double PropThrust(DerivedAC P, double th, double V, double pw, int nE = 1)
        {
            double ua = Math.Max(V, 1), eta = P.Engine.Eta * Math.Pow(Math.Min(1, ua / P.Prop.Vd), P.Engine.EtaK);
            return (0.04 + 0.96 * th) * pw * Math.Min(P.Engine.T0 / nE * (1 - 0.25 * Math.Min(V / P.Prop.Vd, 1)), eta * P.Engine.P / nE / ua);
        }
    }

    // ------------------------------------------------------------------ flight state
    public sealed class State
    {
        public Aircraft A; public DerivedAC AC; public List<Wheel> Wheels; public double WheelBottom; public List<HardPt> HardPts; public TailSkidDef TailSkid;
        public double T; public double[] Pos, Vel, Q, W;
        public double Thr, Prop = 1, Elev, Ail, Rud, Trim; public double? TrimTgt; public double Brake; public double? BrakeL, BrakeR;
        public double PIn, RIn; public int FlapIdx; public double FlapDeg; public bool GearDown; public double GearPos = 1;
        public double Rev, Spoiler;
        public double Rpm, PropAng; public bool OnGround, MainContact; public double AirTime; public bool Crashed; public string CrashReason = "";
        public double Alpha, Beta, Ias, Tas, GLoad = 1, StallW; public bool StallWarn; public double Agl, Vs; public bool[] Contacts = new bool[0];
        public bool KeyHold = true; public bool RollHoldFlag; public double? PTgt; public double PRate; public bool Dead;
        public double PKey, RKey, PHeld, RudKey;   // the controls layer's stick state (JS: s.pKey / s.rKey / s.pHeld / s.rudKey)
        public OptsState Opts = new OptsState(); public WindState Wind = new WindState();
        public double Qnh = 29.92, OatDev, SurfaceWet;
        public double Mix = 1; public string FuelSel = "L"; public bool CarbHeat; public double CarbRisk;
        public bool PitotHeat; public double PitotRisk, PitotIce; public bool StaticBlocked, AltStatic, BoostPump, Xfeed, GearFault, GearEmerg; public double GearEmergT, FuelUsed;
        public double? IasFrz, AltFrz;
        public double MixCmd = 1; public string SelCmd = "L";
        public double[] Fuel = new double[2]; public double FuelFlow;
        public List<EngState> Eng = new List<EngState>(); public List<SimEvent> Events = new List<SimEvent>(); public TdRecord Td; public OutRecord Out = new OutRecord();
        public bool WasOnRunway; public double LastRwyT = -99; public int Seed = 1;
        public ElecState Elec = new ElecState(); public double Hobbs = 471.2;
        // dynamic / controller memory
        public double PHI, BHI, GI, BI, TrimHold; public double? BTgt;
        public bool AssistOn, BankHoldOn, EngStopNoted, TailTouch, Excursion, WheelLock;
        public double RudNeed, RudAuto, RudEff, ShaftP, Thrust, Rho, Oat, DensAlt, NProp, LiftN, DragN, CL, CD, Ge;
        public int FirstWheel = -1; public double GndAir; public double[] GndVel;
        public Loading Loading; public WbResult Wb; public float[] StH; public OvrState Ovr;
    }
    public sealed class SensDef { public double Direct, Pitch, Roll, PMax, RMax, Bank, Gamma; }
    public sealed class SteadyOpts { public double? AltFt, OatDev; public int Flaps; public bool Gear, Oei; public double Bank; public string Pwr; }
    public sealed class SteadyResult { public double Thr, Pitch, Fpm, Aoa, Rpm; public bool Ok; }
    public sealed class AttResult { public double Pitch, Bank, Hdg; }

    public static class Sim
    {
        public static readonly Dictionary<string, SensDef> SENS = new Dictionary<string, SensDef>
        {
            ["low"] = new SensDef { Direct = 0.45, Pitch = 0.16, Roll = 0.36, PMax = 0.4, RMax = 0.6, Bank = 30, Gamma = 8 },
            ["mid"] = new SensDef { Direct = 0.7, Pitch = 0.26, Roll = 0.55, PMax = 0.55, RMax = 0.8, Bank = 45, Gamma = 12 },
            ["high"] = new SensDef { Direct = 1.0, Pitch = 0.42, Roll = 0.85, PMax = 0.75, RMax = 1, Bank = 60, Gamma = 18 }
        };

        public static State NewState(int seed = 1, string aircraft = "pa28", double? mass = null)
        {
            var s = new State
            {
                T = 0, Pos = new[] { 0.0, FlightPhysics.GROUND_M + 1.4, 0 }, Vel = new double[3], Q = new[] { 0.0, 0, 0, 1 }, W = new double[3],
                GearDown = true, GearPos = 1, KeyHold = true, Seed = seed
            };
            SetAircraft(s, aircraft, mass);
            return s;
        }
        public static State SetAircraft(State s, string id, double? mass = null)
        {
            var A = FlightPhysics.FindAircraft(id);
            var d = Aero.DeriveAircraft(A, mass);
            s.A = A; s.AC = d.AC; s.Wheels = d.Wheels; s.WheelBottom = d.WheelBottom; s.HardPts = d.HardPts; s.TailSkid = d.TailSkid;
            s.Contacts = new bool[d.Wheels.Count];
            s.Fuel = new[] { A.FuelCap * 0.8, A.FuelCap * 0.8 };
            s.Eng = new List<EngState>();
            for (int i = 0; i < A.Engines1; i++)
            {
                s.Eng.Add(new EngState
                {
                    Run = true, On = true, Mag = "BOTH", Mix = 1, Sel = i != 0 ? "R" : "L", LineT = FlightPhysics.LINE_FUEL_S, Egt = 70,
                    Feed = i != 0 ? 1 : 0, FeedOk = true, MixK = 1, PowK = 1, FfK = 1, Lev = 1, OilQ = A.FuelCap > 30 ? 8 : 7, N1 = 20
                });
            }
            s.GearDown = true; s.GearPos = 1;
            return s;
        }
        public static bool EngineRunning(State s) { foreach (var e in s.Eng) if (e.Run) return true; return false; }
        public static WbResult ApplyLoading(State s, Loading ld)
        {
            var A = s.A;
            if (!FlightPhysics.WB.ContainsKey(A.Id)) return null;
            var L = Aero.CleanLoading(A, ld);
            if (L.Fuel != "std") { double per = Aero.FuelPerTank(A, L.Fuel); s.Fuel = new[] { per, per }; }
            var wb = Aero.ComputeWB(A, L, s.Fuel);
            s.Loading = L; s.Wb = wb;
            var d = Aero.DeriveAircraft(A, wb.Kg, wb);
            s.AC = d.AC; s.Wheels = d.Wheels; s.WheelBottom = d.WheelBottom; s.HardPts = d.HardPts; s.TailSkid = d.TailSkid;
            if (s.Contacts == null || s.Contacts.Length != d.Wheels.Count) s.Contacts = new bool[d.Wheels.Count];
            return wb;
        }

        public static double[] WindAt(State s, double t, double agl)
        {
            var W = s.Wind ?? new WindState { FromDeg = 0, Kt = 0, Gust = 0.4 };
            double k = W.Gust;
            double gust = Math.Min(1, Math.Max(agl, 0) / 300 + 0.4) * k;
            double from = W.FromDeg * PhysMath.DEG, sp = W.Kt / PhysMath.KT, wg = Aero.WindGradient(agl);
            if (W.TopKt.HasValue && (W.TopFt ?? 0) > 0)
            {
                double f = PhysMath.Clamp(agl / (W.TopFt.Value / PhysMath.FT), 0, 1);
                double dd = ((W.TopFrom ?? 0) - W.FromDeg) % 360; if (dd > 180) dd -= 360; else if (dd < -180) dd += 360;
                from = (W.FromDeg + dd * f) * PhysMath.DEG; sp = (W.Kt + (W.TopKt.Value - W.Kt) * f) / PhysMath.KT; wg = 1;
            }
            var w = new[] { -Math.Sin(from) * sp, 0.0, Math.Cos(from) * sp };
            return new[]
            {
                w[0] * wg + Perlin.Noise(t * 0.35, 1.7) * 1.4 * gust,
                Perlin.Noise(t * 0.5, 4.4) * 0.5 * gust,
                w[2] * wg + Perlin.Noise(t * 0.31, 8.2) * 1.1 * gust
            };
        }

        public static (double alpha, double elev) TrimFor(State s, double V, double flapF, double n = 1, double rho = 1.225)
        {
            var AC = s.AC;
            double qd = 0.5 * rho * V * V, cl0 = AC.CL0 + AC.FlapCL * flapF;
            double alpha = (n * AC.Mass * PhysMath.G / (qd * AC.S) - cl0) / AC.CLa;
            return (alpha, PhysMath.Clamp((-AC.Cma * Math.Sin(alpha) - AC.Cm0) / AC.Cmde, -1, 1));
        }
        public static double TrimLevel(State s)
        {
            double flapF = s.A.Wing.Flap != null ? s.FlapDeg / 30 : 0;
            double rho = s.Rho != 0 ? s.Rho : Aero.Atmos(s.Pos[1]).Rho;
            double a1 = TrimFor(s, Math.Max(s.Tas, 20), flapF, 1, rho).alpha;
            return PhysMath.Clamp(s.Elev + s.Trim + s.AC.Cma / s.AC.Cmde * (s.Alpha - a1), -FlightPhysics.TRIM_MAX, FlightPhysics.TRIM_MAX);
        }
        public static SteadyResult SteadyState(State s, double kt, double fpm, SteadyOpts o = null)
        {
            o = o ?? new SteadyOpts();
            var P = s.AC; var A = s.A;
            var atm = Aero.Atmos((o.AltFt ?? 3000) / PhysMath.FT, o.OatDev ?? s.OatDev);
            double W = P.Mass * PhysMath.G;
            double flapF = A.Wing.Flap != null ? FlightPhysics.FLAP_DEG[o.Flaps] / 30 : 0;
            double gear = A.Gear.Fixed ? 1 : (o.Gear ? 1 : 0);
            double V = kt / PhysMath.KT / Math.Sqrt(atm.Sigma), q = 0.5 * atm.Rho * V * V, n = 1 / Math.Cos(o.Bank * PhysMath.DEG);
            double cl0 = P.CL0 + P.FlapCL * flapF, pw = Math.Max(0, 1.132 * atm.Sigma - 0.132), ne = o.Oei ? 0.5 : 1;
            Func<object, double> thrust = thArg =>
            {
                if (thArg is string) return -0.026 * q * P.S * Math.Pow(P.Mass / 1050, 0.3);
                double th = (double)thArg;
                if (A.Jet)
                {
                    double n1T = 20 + 84 * Math.Pow(PhysMath.Clamp(th, 0, 1), 1.15);
                    double fracJ = Math.Pow(PhysMath.Clamp((n1T - 20) / 84, 0, 1), 1.55);
                    return ne * fracJ * P.Engine.T0 * Math.Pow(atm.Sigma, 0.85) * (1 - 0.10 * (V / atm.A)) - (o.Oei ? 0.004 * q * P.S : 0);
                }
                return ne * (Aero.PropThrust(P, th, V, pw, 1) - (1 - th) * 2.5 * V * P.Mass / 1000) - (o.Oei ? 0.004 * q * P.S : 0);
            };
            Func<double, (double a, double D)> forces = gmArg =>
            {
                double CL = n * W * Math.Cos(gmArg) / (q * P.S), a = (CL - cl0) / P.CLa;
                double CD = P.CD0 + (0.02 * flapF + 0.05 * flapF * flapF) * P.FlapCD + P.CDgear * gear + P.K * CL * CL;
                return (a, CD * q * P.S);
            };
            double gm, thr;
            if (o.Pwr == "full" || o.Pwr == "idle" || o.Pwr == "dead")
            {
                object arg = o.Pwr == "full" ? (object)1.0 : o.Pwr == "idle" ? (object)0.0 : "dead";
                double T = thrust(arg);
                gm = 0; for (int i = 0; i < 30; i++) { var f = forces(gm); gm = Math.Asin(PhysMath.Clamp((T - f.D) / W, -0.9, 0.9)); }
                thr = o.Pwr == "full" ? 1 : 0;
            }
            else
            {
                gm = Math.Asin(PhysMath.Clamp(fpm / 196.85 / V, -0.9, 0.9));
                double need = forces(gm).D + W * Math.Sin(gm);
                double lo = 0, hi = 1;
                for (int i = 0; i < 40; i++) { double m = (lo + hi) / 2; if (thrust(m) < need) lo = m; else hi = m; }
                thr = (lo + hi) / 2; if (thrust(1.0) < need) thr = 1.01;
            }
            var ff = forces(gm);
            bool dead = o.Pwr == "dead";
            return new SteadyResult
            {
                Thr = thr, Pitch = (gm + ff.a) / PhysMath.DEG * Math.Cos(o.Bank * PhysMath.DEG), Fpm = Math.Sin(gm) * V * 196.85,
                Aoa = ff.a / PhysMath.DEG, Rpm = Aero.RpmFor(A, dead ? 0 : Math.Min(thr, 1), V, pw, dead), Ok = thr <= 1
            };
        }

        public static void PitchHold(State s, double alpha, double qd, double qdc, double aS)
        {
            var AC = s.AC;
            var f = PhysMath.QRot(s.Q, new[] { 0.0, 0, -1 });
            double th = Math.Asin(PhysMath.Clamp(f[1], -1, 1));
            double thT = (s.PTgt ?? 0) * PhysMath.DEG;
            if (!s.OnGround && alpha > aS - 0.05) thT = Math.Min(thT, th - (alpha - (aS - 0.05)) * 2);
            double ratio = qd / Math.Max(qdc, 1), e0 = (-AC.Cma * Math.Sin(alpha) - AC.Cm0) / AC.Cmde * ratio;
            double Mde = Math.Max(qdc * AC.S * AC.C * AC.Cmde / AC.I[0], 0.02), qCmd = PhysMath.Clamp((thT - th) * 1.6 + s.PRate * PhysMath.DEG, -0.2, 0.2);
            s.PHI = s.OnGround ? 0 : PhysMath.Clamp(s.PHI + (thT - th) * (1.0 / 120) * 0.8, -0.3, 0.3);
            s.Elev = PhysMath.Clamp(e0 + PhysMath.Clamp(2.5 / Mde, 0.1, 30) * (qCmd - s.W[0]) + s.PHI - s.Trim, -1, 1);
        }
        public static void BankHold(State s, double V, double rMax)
        {
            var AC = s.AC;
            var r = PhysMath.QRot(s.Q, new[] { 1.0, 0, 0 });
            var up = PhysMath.QRot(s.Q, new[] { 0.0, 1, 0 });
            double bank = Math.Atan2(-r[1], up[1]), p = -s.W[2];
            if (s.BTgt == null) { s.BTgt = Math.Abs(bank) < 4 * PhysMath.DEG ? 0 : PhysMath.Clamp(bank, -60 * PhysMath.DEG, 60 * PhysMath.DEG); s.BHI = 0; }
            double err = s.BTgt.Value - bank;
            if (Math.Abs(err) < 3 * PhysMath.DEG) s.BHI = PhysMath.Clamp(s.BHI + err * (1.0 / 120) * 0.6, -0.05, 0.05);
            double pMaxR = AC.RollRate * PhysMath.DEG * 0.5, pCmd = PhysMath.Clamp(err * 1.2 + s.BHI, -pMaxR, pMaxR);
            double kAil = Math.Abs(AC.Clp) * AC.B / (2 * Math.Max(V, 10) * AC.Clda);
            s.Ail = PhysMath.Clamp((pCmd + 0.9 * (pCmd - p)) * kAil, -rMax, rMax);
            s.BankHoldOn = true;
        }
        public static void ApplyControls(State s, double V, double alpha, double qd, double qdc, double flapF, double aS, double cl0)
        {
            var AC = s.AC; var A = s.A; var o = s.Opts;
            var sens = SENS.TryGetValue(o.Sens ?? "low", out var sd) ? sd : SENS["low"];
            bool airborne = !s.OnGround && s.AirTime > 0.6 && V > 12, leveling = o.LevelT > 0;
            s.AssistOn = (o.Assist || leveling) && airborne && !s.Crashed;
            bool holdP = s.KeyHold && !leveling && !s.Crashed && V > 12 && s.Ovr == null && !s.OnGround;
            if (!holdP) s.PHI = 0;
            bool holdB = s.RollHoldFlag && !leveling && !s.Crashed && V > 12 && s.Ovr == null && !s.OnGround && s.AirTime > 0.6 && Math.Abs(s.RIn) < 0.02;
            s.BankHoldOn = false; if (!holdB) s.BTgt = null;
            if (!s.AssistOn)
            {
                s.GI = 0; s.BI = 0;
                double vr = A.VGet("cruise") / PhysMath.KT, spd = Math.Max(V, 12);
                double pMax = Math.Min(1, sens.PMax * PhysMath.Clamp(vr / spd, 1, o.GainCap ?? 1.7)), rMax = Math.Min(1, sens.RMax * PhysMath.Clamp(vr / spd, 1, 2));
                double kg = s.OnGround ? 1 : s.AirTime < 3 ? 1 - s.AirTime / 3 : 0;
                double lin = Math.Max(PhysMath.Clamp(0.45 + (vr / spd - 1) * 0.35, 0.45, 0.8), 0.45 + 0.35 * kg);
                Func<double, double, double> shape = (x, a) => a * x + (1 - a) * x * x * x;
                double kp = Math.Max(pMax, kg);
                double el = kp * shape(PhysMath.Clamp(s.PIn, -1, 1), lin);
                if (s.TrimHold != 0) { if (Math.Abs(s.PIn) < 0.04 || Math.Sign(el) != Math.Sign(s.TrimHold)) s.TrimHold = 0; else el -= Math.Sign(el) * Math.Min(Math.Abs(el), Math.Abs(s.TrimHold)); }
                s.Elev = PhysMath.Clamp(el, -1, 1);
                s.Ail = PhysMath.Clamp(rMax * shape(PhysMath.Clamp(s.RIn, -1, 1), 0.45), -1, 1);
                if (holdB) BankHold(s, V, rMax);
                if (holdP) PitchHold(s, alpha, qd, qdc, aS);
                return;
            }
            var r = PhysMath.QRot(s.Q, new[] { 1.0, 0, 0 });
            var up = PhysMath.QRot(s.Q, new[] { 0.0, 1, 0 });
            double bank = Math.Atan2(-r[1], up[1]), spd2 = PhysMath.VLen(s.Vel); if (spd2 == 0) spd2 = 1;
            double gamma = Math.Asin(PhysMath.Clamp(s.Vel[1] / spd2, -1, 1)), p = -s.W[2];
            double bankMax = Math.Min(sens.Bank, 80) * PhysMath.DEG;
            double rIn = leveling ? 0 : s.RIn, pIn = leveling ? 0 : s.PIn;
            double bankCmd = rIn * bankMax, pMaxR = AC.RollRate * PhysMath.DEG * (o.Sens == "high" ? 1 : o.Sens == "mid" ? 0.75 : 0.55);
            double bErr = bankCmd - bank;
            bool hold = Math.Abs(bankCmd) < 2 * PhysMath.DEG && Math.Abs(bErr) < 3 * PhysMath.DEG;
            s.BI = hold ? PhysMath.Clamp(s.BI + bErr * (1.0 / 120) * 1.5 * Math.Min(1, AC.RollRate / 50), -0.08, 0.08) : s.BI * 0.98;
            double pCmd = PhysMath.Clamp(bErr * 1.6 + s.BI, -pMaxR, pMaxR), kAil = Math.Abs(AC.Clp) * AC.B / (2 * Math.Max(V, 10) * AC.Clda);
            s.Ail = PhysMath.Clamp((pCmd + 0.9 * (pCmd - p)) * kAil, -1, 1);
            double gMax = sens.Gamma * PhysMath.DEG, gammaCmd = pIn * gMax;
            s.GI = PhysMath.Clamp(s.GI * (1 - 0.1 / 120) + PhysMath.Clamp(gammaCmd - gamma, -1.5 * PhysMath.DEG, 1.5 * PhysMath.DEG) * (1.0 / 120) * 0.35, -0.08, 0.08);
            double gdot = PhysMath.Clamp((gammaCmd - gamma) * 0.7 + s.GI, -AC.PitchRate * PhysMath.DEG, AC.PitchRate * PhysMath.DEG);
            double nCmd = PhysMath.Clamp(Math.Cos(gamma) / Math.Max(Math.Cos(bank), 0.35) + spd2 * gdot / PhysMath.G, -1, AC.MaxG);
            double aFree = (nCmd * AC.Mass * PhysMath.G / Math.Max(qd * AC.S, 1) - cl0) / AC.CLa, aReq = PhysMath.Clamp(aFree, -aS * 0.7, aS - 0.04);
            if (aReq != aFree) s.GI *= 0.97;
            double ratio = qd / Math.Max(qdc, 1);
            double e = (-AC.Cma * Math.Sin(aReq) - AC.Cm0) / AC.Cmde * ratio;
            double Mde = Math.Max(qdc * AC.S * AC.C * AC.Cmde / AC.I[0], 0.02), qCmd = PhysMath.G / spd2 * (nCmd - Math.Cos(gamma) * Math.Cos(bank)) + 2.0 * (aReq - alpha);
            e += 1.2 * (aReq - alpha) + PhysMath.Clamp(2.5 / Mde, 0.1, 30) * (qCmd - s.W[0]);
            s.Elev = PhysMath.Clamp(e - s.Trim, -1, 1);
            if (holdP) PitchHold(s, alpha, qd, qdc, aS);
        }

        private sealed class ContactCtx { public double[] Fw, Tw, WW, Qi; public double BL, BR, WetF, Steer, CrashPen, YLoad; }
        private static bool Contact(State s, double[] off, double k, double c, string kind, string name, bool isNose, ContactCtx ctx)
        {
            var AC = s.AC;
            var rw = PhysMath.QRot(s.Q, off);
            var cp = PhysMath.VAdd(s.Pos, rw);
            var g = FlightPhysics.GroundAt(cp[0], cp[2]);
            double pen = g.H - cp[1];
            if (pen <= 0) return false;
            if (g.Water) { Crash(s, kind == "hard" ? "湖に墜落しました" : "湖に着水してしまいました"); return true; }
            var vc = PhysMath.VAdd(s.Vel, PhysMath.VCross(ctx.WW, rw));
            double vn = PhysMath.VDot(vc, g.N);
            if (kind == "hard") { Crash(s, name + "が地面に接触しました"); return true; }
            if (kind == "wheel" && (pen > ctx.CrashPen || vn < -5.08)) { Crash(s, $"接地の衝撃で脚が壊れました（降下率 {JR(-vn * 196.85):0} fpm、教材基準 1,000 fpm 超）"); return true; }
            if (kind == "skid" && vn < -4) { Crash(s, "尾部を強く打ちつけました"); return true; }
            if (kind == "skid" && !s.TailTouch) { s.TailTouch = true; s.Events.Add(new SimEvent { T = s.T, Type = "tail_strike" }); }
            double Fn = Math.Max(0, k * pen - c * vn);
            var fb = new[] { 0.0, 0, -1 };
            if (isNose) fb = new[] { Math.Sin(ctx.Steer), 0.0, -Math.Cos(ctx.Steer) };
            var fwd = PhysMath.QRot(s.Q, fb);
            fwd = PhysMath.VNorm(PhysMath.VSub(fwd, PhysMath.VScale(g.N, PhysMath.VDot(fwd, g.N))));
            var lat = PhysMath.VNorm(PhysMath.VCross(g.N, fwd));
            double vl = PhysMath.VDot(vc, fwd), vt = PhysMath.VDot(vc, lat);
            double mu = (kind == "skid" ? 0.5 : g.Paved ? 0.85 : 0.6) * (kind == "wheel" ? ctx.WetF : 1);
            double bCoef = 0; bool locked = false;
            if (kind == "wheel" && !isNose)
            {
                double bw = off[0] < 0 ? ctx.BL : ctx.BR;
                bCoef = bw * (g.Paved ? 0.42 : 0.3);
                if (bw > 0.85 && mu < 0.6) { locked = true; bCoef *= 0.65; s.WheelLock = true; }
            }
            double rr = kind == "skid" ? 0.5 : (g.Paved ? 0.02 : 0.05) + bCoef;
            double Ft = PhysMath.Clamp(-vt * 9 * AC.Mass, -(locked ? mu * 0.6 : mu) * Fn, (locked ? mu * 0.6 : mu) * Fn);
            double Fl = PhysMath.Clamp(-vl * 6 * AC.Mass, -rr * Fn, rr * Fn);
            var Fc = PhysMath.VAdd(PhysMath.VAdd(PhysMath.VScale(g.N, Fn), PhysMath.VScale(fwd, Fl)), PhysMath.VScale(lat, Ft));
            ctx.Fw[0] += Fc[0]; ctx.Fw[1] += Fc[1]; ctx.Fw[2] += Fc[2];
            var tq = PhysMath.VCross(rw, Fc); ctx.Tw[0] += tq[0]; ctx.Tw[1] += tq[1]; ctx.Tw[2] += tq[2];
            ctx.YLoad += PhysMath.VDot(PhysMath.QRot(ctx.Qi, Fc), new[] { 0.0, 1, 0 });
            return true;
        }

        public static State Step(State s, double dt = 1.0 / 120)
        {
            if (s.Crashed) { Derive(s); return s; }
            var A = s.A; var AC = s.AC;
            s.T += dt;
            if (s.TrimTgt.HasValue)
            {
                double d = s.TrimTgt.Value - s.Trim, m = 0.6 * dt;
                if (Math.Abs(d) <= m) { s.Trim = s.TrimTgt.Value; s.TrimTgt = null; } else s.Trim += Math.Sign(d) * m;
            }
            if (s.Opts.LevelT > 0) s.Opts.LevelT -= dt;
            s.FlapDeg += PhysMath.Clamp(FlightPhysics.FLAP_DEG[s.FlapIdx] - s.FlapDeg, -8 * dt, 8 * dt);
            if (A.Gear.Fixed) { s.GearDown = true; s.GearPos = 1; }
            else if (s.GearEmerg) { s.GearDown = true; s.GearEmergT += dt; if (s.GearEmergT > 1.2) s.GearPos = PhysMath.Clamp(s.GearPos + dt / 3, 0, 1); }
            else if (!(s.OnGround && !s.GearDown)) { double tgt = s.GearDown ? (s.GearFault ? 0.55 : 1) : 0; s.GearPos = PhysMath.Clamp(s.GearPos + PhysMath.Clamp(tgt - s.GearPos, -dt / 6, dt / 6), 0, 1); }
            double flapF = A.Wing.Flap != null ? s.FlapDeg / 30 : 0;
            var atm = Aero.Atmos(s.Pos[1], s.OatDev);
            double rho = atm.Rho;
            var ground = FlightPhysics.GroundAt(s.Pos[0], s.Pos[2]);
            double agl = s.Pos[1] + s.WheelBottom - ground.H;
            var qi = PhysMath.QConj(s.Q);
            var vb = PhysMath.QRot(qi, PhysMath.VSub(s.Vel, WindAt(s, s.T, agl + 2)));
            double V = PhysMath.VLen(vb), u = -vb[2];
            double alpha = Math.Atan2(-vb[1], u), beta = V > 0.5 ? Math.Asin(PhysMath.Clamp(vb[0] / V, -1, 1)) : 0;
            double qd = 0.5 * rho * V * V;
            if (s.Mix != s.MixCmd) { s.MixCmd = s.Mix; foreach (var e in s.Eng) e.Mix = s.Mix; }
            if (s.FuelSel != s.SelCmd) { s.SelCmd = s.FuelSel; foreach (var e in s.Eng) e.Sel = s.FuelSel; }
            for (int ei = 0; ei < s.Eng.Count; ei++)
            {
                var e = s.Eng[ei];
                e.Lev = e.Mix;
                string mag = e.Mag ?? "BOTH", sel = e.Sel ?? "L";
                if (s.Eng.Count > 1)
                {
                    var on = new bool[s.Eng.Count];
                    for (int j = 0; j < s.Eng.Count; j++) on[j] = (s.Eng[j].Sel ?? "ON") != "OFF";
                    e.Feed = on[ei] ? ei : (s.Xfeed && on[1 - ei] ? 1 - ei : -1);
                }
                else e.Feed = sel == "OFF" ? -1 : sel == "R" ? 1 : 0;
                if (e.Feed >= 0 && s.Fuel[e.Feed] > 0) e.LineT = FlightPhysics.LINE_FUEL_S; else e.LineT = Math.Max(0, e.LineT - dt);
                e.FeedOk = (e.Feed >= 0 && s.Fuel[e.Feed] > 0) || e.LineT > 0;
                double pTgtP = !e.Run ? (s.BoostPump ? 0.35 : 0) : e.PumpFail ? (s.BoostPump ? 0.85 : (e.Rpm > 1200 ? 0.3 : 0)) : 1;
                e.FuelPress = e.FuelPress + (pTgtP - e.FuelPress) * Math.Min(1, dt * 2);
                int stop = (e.Failed || e.Cut) ? 1 : mag == "OFF" ? 2 : e.Lev <= FlightPhysics.MIX_CUT ? 3 : !e.FeedOk ? 4 : 0;
                if (stop != 0) { e.On = false; e.CrankT = 0; }
                else if (!e.On && mag == "START" && e.Lev >= FlightPhysics.MIX_RICH) { e.CrankT += dt; if (e.CrankT >= FlightPhysics.CATCH_S) { e.On = true; e.CrankT = 0; } }
                else e.CrankT = 0;
                e.Run = e.On && stop == 0;
            }
            if (!s.Eng[0].Run && !s.EngStopNoted && A.Engines1 == 1)
            {
                var e0 = s.Eng[0];
                s.EngStopNoted = true;
                s.Events.Add(new SimEvent { T = s.T, Type = "engine_stop", Why = e0.Failed ? "故障（教材の想定）" : (e0.Cut || e0.Lev <= FlightPhysics.MIX_CUT) ? "ミクスチャー カットオフ" : e0.Mag == "OFF" ? "マグネトー OFF" : e0.Sel == "OFF" ? "燃料セレクター OFF" : "燃料切れ" });
            }
            s.Dead = !EngineRunning(s);
            Func<EngState, double> thrOf = e => e.Thr ?? s.Thr;
            int nE = s.Eng.Count;
            double runShare = 0; foreach (var e in s.Eng) runShare += e.Run ? thrOf(e) : 0; runShare /= nE;
            double qdc = qd + 240 * runShare * Math.Sqrt(AC.Mass / 1000);
            double aS = AC.AStall - AC.FlapStall * flapF, cl0 = AC.CL0 + AC.FlapCL * flapF;
            ApplyControls(s, V, alpha, qd, qdc, flapF, aS, cl0);
            if (s.Ovr != null) { s.Elev = PhysMath.Clamp(s.Ovr.Elev, -1, 1); s.Ail = PhysMath.Clamp(s.Ovr.Ail, -1, 1); s.Rud = PhysMath.Clamp(s.Ovr.Rud, -1, 1); }
            var F = new double[3];
            var EL = AC.El;
            var Eng = AC.Engine;
            double pw = Math.Max(0, 1.132 * atm.Sigma - 0.132), ua = Math.Max(u, 0);
            double T = 0, Tasym = 0, shaft = 0;
            double xe = A.Engines[0].X;
            double pAmbIn = atm.P / 3386.39;
            for (int i = 0; i < s.Eng.Count; i++)
            {
                var e = s.Eng[i];
                double th = thrOf(e), P1 = Eng.P / nE;
                double Ti;
                if (A.Jet)
                {
                    double oatC = atm.T - 273.15;
                    if (!e.Run)
                    {
                        Ti = -0.004 * qd * AC.S * Math.Pow(AC.Mass / 1050 / nE, 0.3);
                        e.MixK = 0; e.PowK = 0; e.Rough = 0; e.Ff = 0; e.ShaftW = 0; e.ManIn = 0; e.FfK = Eng.FfK ?? 1;
                        double n1W = e.Failed ? 0 : PhysMath.Clamp(ua * 0.2, 0, 10);
                        e.N1 = e.N1 + (n1W - e.N1) * Math.Min(1, dt / 3);
                        double ec = e.Egt ?? oatC; e.Egt = ec + (oatC - ec) * Math.Min(1, dt / 6);
                    }
                    else
                    {
                        double n1Tgt = 20 + 84 * Math.Pow(PhysMath.Clamp(th, 0, 1), 1.15);
                        double tau = 2.0 + 3.8 * (1 - PhysMath.Clamp(e.N1, 0, 100) / 100);
                        e.N1 = e.N1 + (n1Tgt - e.N1) * Math.Min(1, dt / tau);
                        double mach = V / atm.A;
                        double frac = Math.Pow(PhysMath.Clamp((e.N1 - 20) / 84, 0, 1), 1.55);
                        Ti = frac * (Eng.T0 / nE) * Math.Pow(atm.Sigma, 0.85) * (1 - 0.10 * mach);
                        if ((s.MainContact || s.OnGround) && s.Rev > 0)
                        {
                            double fade = PhysMath.Smoothstep(25, 60, ua * PhysMath.KT);
                            Ti = Ti * (1 - s.Rev) - 0.38 * (Eng.T0 / nE) * s.Rev * fade;
                        }
                        e.ShaftW = Ti * Math.Max(ua, 25) / 0.82;
                        e.FfK = Eng.FfK ?? 1;
                        e.MixK = 1; e.PowK = 1; e.Rough = 0; e.ManIn = 0;
                        double egtT = Math.Min(420 + 5.6 * e.N1, 1050);
                        double ec = e.Egt ?? egtT; e.Egt = ec + (egtT - ec) * Math.Min(1, dt / 3);
                    }
                    e.T = Ti; T += Ti;
                    if (nE == 2) Tasym += (i == 1 ? 1 : -1) * Ti * xe;
                    continue;
                }
                if (!e.Run)
                {
                    Ti = -(e.Feather ? 0.003 : 0.026 / nE) * qd * AC.S * Math.Pow(AC.Mass / 1050 / nE, 0.3);
                    e.MixK = 0; e.PowK = 0; e.Rough = 0; e.Ff = 0; e.ShaftW = 0; e.ManIn = pAmbIn;
                    double ec = e.Egt ?? 70; e.Egt = ec + ((atm.T * 9 / 5 - 459.67) - ec) * Math.Min(1, dt / 6);
                }
                else
                {
                    double mStr = e.Lev / Math.Sqrt(Math.Max(atm.Sigma, 0.35));
                    double mixK = 1 - 2.2 * Math.Pow(Math.Max(0, mStr - 1.06), 2) - 1.6 * Math.Pow(Math.Max(0, 0.93 - mStr), 2);
                    if (mStr < 0.62) mixK *= PhysMath.Smoothstep(0.45, 0.62, mStr);
                    e.MixK = PhysMath.Clamp(mixK, 0, 1);
                    e.Rough = PhysMath.Clamp((0.74 - mStr) / 0.12, 0, 1);
                    double carbK = 1;
                    if (A.Carb)
                    {
                        double oatC = atm.T - 273.15, band = PhysMath.Clamp((oatC + 7) / 19, 0, 1) * PhysMath.Clamp((26 - oatC) / 14, 0, 1);
                        if (s.CarbHeat) e.CarbIce = Math.Max(0, e.CarbIce - dt / 14);
                        else if (s.CarbRisk > 0 && band > 0) e.CarbIce = Math.Min(1, e.CarbIce + dt * s.CarbRisk * band * (1.3 - 0.8 * th) / 200);
                        if (e.CarbIce > 0.45 && !e.IceNoted) { e.IceNoted = true; s.Events.Add(new SimEvent { T = s.T, Type = "carb_ice" }); }
                        carbK = (1 - 0.5 * e.CarbIce) * (s.CarbHeat ? 0.94 - 0.08 * e.CarbIce : 1);
                        if (e.CarbIce > 0.45) e.Rough = Math.Max(e.Rough, 0.7);
                    }
                    e.PowK = e.MixK * carbK;
                    if (A.PropCtrl) { double gov = A.PropGov[0] + (A.PropGov[1] - A.PropGov[0]) * PhysMath.Clamp(s.Prop, 0, 1); e.PropK = Math.Pow(gov / A.PropGov[1], 0.55); e.PowK *= e.PropK; }
                    else e.PropK = 1;
                    string mag2 = e.Mag ?? "BOTH";
                    double magEgt = 0;
                    if (mag2 == "L" || mag2 == "R") { e.PowK *= 0.97; e.Rough = PhysMath.Clamp(e.Rough + 0.3, 0, 1); magEgt = 18; }
                    if (e.MagBad != null && (mag2 == "BOTH" || mag2 == e.MagBad)) { e.PowK *= 0.96; if (e.Rpm > 1700) e.Rough = Math.Max(e.Rough, 0.55); }
                    if (e.PumpFail && e.FuelPress < 0.08) { e.PressT += dt; if (e.PressT > 2.5) { e.On = false; e.PowK = 0; } } else e.PressT = 0;
                    if (e.PumpFail) { e.PowK *= PhysMath.Clamp(e.FuelPress * 1.3, 0.05, 1); if (e.FuelPress < 0.3) e.Rough = Math.Max(e.Rough, 0.6); }
                    Ti = Aero.PropThrust(AC, th, ua, pw, nE) * e.PowK - (1 - th) * 2.5 * ua * AC.Mass / 1000 / nE;
                    if (e.Rough > 0) Ti *= 1 + e.Rough * 0.05 * Math.Sin(s.T * 39 + i * 2.4);
                    e.ShaftW = (0.04 + 0.96 * th) * pw * P1 / 0.85 * e.PowK;
                    shaft += e.ShaftW;
                    double pf = (0.04 + 0.96 * th) * pw * e.MixK;
                    double egtT = 980 + 300 * pf + 330 * Math.Pow(Math.Max(pf, 0), 0.7) * Math.Exp(-Math.Pow((mStr - 0.86) / 0.15, 2)) + magEgt;
                    double ec2 = e.Egt ?? egtT; e.Egt = ec2 + (egtT - ec2) * Math.Min(1, dt / 2.5);
                    e.ManIn = Math.Min(pAmbIn * (0.30 + 0.68 * th), pAmbIn - 0.3);
                    if (A.PropCtrl && th > 0.05) e.ManIn = Math.Min(e.ManIn + (1 - PhysMath.Clamp(s.Prop, 0, 1)) * 1.5, pAmbIn - 0.3);
                    e.FfK = PhysMath.Clamp(0.15 + 0.85 * Math.Pow(e.Lev, 1.2), 0, 1);
                }
                e.T = Ti; T += Ti;
                if (nE == 2) Tasym += (i == 1 ? 1 : -1) * Ti * xe;
            }
            s.ShaftP = shaft; s.Thrust = T; s.Rho = rho; s.Oat = atm.T - 273.15; s.NProp = 0;
            s.DensAlt = (1 - Math.Pow(Math.Min(atm.Sigma, 1.2), 0.234969)) * 44330.8;
            F[2] -= T;
            double p = -s.W[2], qq = s.W[0], r = -s.W[1], hv = 0.25 * rho * V;
            double elevEff = PhysMath.Clamp(s.Elev + s.Trim, -1, 1);
            double Nx = qd * AC.S * AC.B * EL.DCnda * s.Ail + hv * AC.S * AC.B * AC.B * EL.DCnp * p - Tasym, Rl = 0, Ng = 0, Gp = 0;
            if (nE == 2) Rl += -Tasym * 0.08;
            if (nE == 2) Rl += -(s.Fuel[0] - s.Fuel[1]) * 2.72 * PhysMath.G * 1.05;
            {
                var Pr = AC.Prop;
                double Tp = Math.Max(T, 0);
                s.NProp = -(Tp * (Pr.A0 + Pr.A1 * PhysMath.Clamp(alpha, -0.1, 0.35) + Pr.A1 * 0.35 * PhysMath.Clamp(beta, -0.25, 0.25))) + Pr.Fin * qd;
                Nx += s.NProp;
                Rl += -EL.FinYZ * (-Tp * Pr.A0 + Pr.Fin * qd);
                double om = Math.Max(s.Rpm, 300) * Math.PI / 30;
                Rl += -s.ShaftP / om * Pr.Tq + Pr.Rig * qd;
                Ng = Pr.Ip * om * qq * (A.CounterRotating ? 0 : 1);
                Gp = 0.18 * Pr.Ip * om * r * (A.CounterRotating ? 0 : 1);
            }
            bool autoR = s.AssistOn || s.Opts.AutoRud;
            double rAuth = Math.Max(qdc * AC.S * AC.B * AC.Cndr, 1);
            s.RudNeed = PhysMath.Clamp(-(Nx + Ng) / rAuth, -1, 1);
            double yd = 0;
            if (autoR && !s.OnGround && V > 10)
            {
                var rgt = PhysMath.QRot(s.Q, new[] { 1.0, 0, 0 });
                var upv = PhysMath.QRot(s.Q, new[] { 0.0, 1, 0 });
                double sb2 = -rgt[1] / Math.Sqrt(rgt[1] * rgt[1] + upv[1] * upv[1]);
                yd = -PhysMath.Clamp(1.5 * AC.I[2] / rAuth, 0.8, 20) * (r - PhysMath.G * sb2 / V);
            }
            s.RudAuto = autoR ? PhysMath.Clamp(-(Nx + Ng) / rAuth + 1.5 * beta + yd, -1, 1) * (s.OnGround && V < 8 ? V / 8 : 1) : 0;
            double rudEff = PhysMath.Clamp(s.Rud + s.RudAuto, -1, 1);
            var upB = PhysMath.QRot(qi, new[] { 0.0, 1, 0 });
            double hCG = s.Pos[1] - ground.H;
            double gA = s.Wind.Gust * Math.Min(1, Math.Max(agl, 0) / 300 + 0.4) * 0.9 * (0.12 + 0.88 * PhysMath.Smoothstep(3, 40, agl))
                + s.Wind.Gust * (s.Wind.Kt / PhysMath.KT) * 0.0005 * Math.Exp(-Math.Max(agl, 0) / 20);
            double gW = Perlin.Noise(s.T * 0.9, 23.1) * gA / (AC.B / 2), gT = Perlin.Noise(s.T * 0.7, 41.9) * gA * 0.2;
            if (s.StH == null || s.StH.Length != EL.Pcs.Count) s.StH = new float[EL.Pcs.Count];
            var ae = Aero.AeroElements(EL, AC, vb, s.W, rho, new AeroOpts
            {
                FlapF = flapF, Elev = elevEff, Ail = s.Ail, Rud = rudEff, Spoiler = s.Spoiler,
                Dq = 240 * runShare * Math.Sqrt(AC.Mass / 1000),
                StH = s.StH, Dt = dt,
                Hgt = pc => hCG + pc.R[0] * upB[0] + pc.R[1] * upB[1] + pc.R[2] * upB[2],
                Gust = pc => { double gg = pc.Kind == 0 ? gW * pc.R[0] : pc.Kind == 1 ? gT : 0; return new[] { upB[0] * gg, upB[1] * gg, upB[2] * gg }; }
            });
            double stallW = ae.StallW;
            double hx = Math.Max(agl + 1.3, 0.3) / AC.B, ge = (16 * hx * hx) / (1 + 16 * hx * hx);
            double CDp = AC.CD0 + (0.02 * flapF + 0.05 * flapF * flapF) * AC.FlapCD + AC.CDgear * s.GearPos + 0.6 * beta * beta + 0.045 * s.Spoiler;
            F[0] += ae.F[0] + qd * AC.S * EL.DCY * beta; F[1] += ae.F[1]; F[2] += ae.F[2];
            if (V > 0.3) { double k = qd * AC.S * CDp / V; F[0] -= vb[0] * k; F[1] -= vb[1] * k; F[2] -= vb[2] * k; }
            {
                double ln = Math.Sqrt(vb[1] * vb[1] + vb[2] * vb[2]); if (ln == 0) ln = 1;
                double qs = Math.Max(qd * AC.S, 1e-6);
                s.LiftN = (ae.F[1] * -vb[2] + ae.F[2] * vb[1]) / ln;
                s.DragN = -(F[0] * vb[0] + F[1] * vb[1] + (F[2] + T) * vb[2]) / Math.Max(V, 1e-3);
                s.CL = ae.CLw; s.CD = s.DragN / qs; s.Ge = ge;
            }
            double Mp = ae.M[0] + qd * AC.S * AC.C * (AC.Cm0 + EL.DCma * Math.Sin(alpha) + EL.DCmF * flapF) + hv * AC.S * AC.C * AC.C * EL.DCmq * qq - Gp;
            double Lr = -ae.M[2] + hv * AC.S * AC.B * AC.B * (EL.DClp * p + EL.DClr * r) + Rl;
            if (stallW > 0.15) Lr += qd * AC.S * AC.B * 0.012 * stallW * Perlin.Noise(s.T * 1.3, 12.5);
            double Nr = -ae.M[1] + hv * AC.S * AC.B * AC.B * EL.DCnr * r + Nx + Ng;
            var Tb = new[] { Mp, -Nr, -Lr };
            var Fw = PhysMath.QRot(s.Q, F);
            var ctx = new ContactCtx { Fw = Fw, Tw = new double[3], WW = PhysMath.QRot(s.Q, s.W), Qi = qi };
            double gsp = Math.Sqrt(s.Vel[0] * s.Vel[0] + s.Vel[2] * s.Vel[2]);
            ctx.Steer = PhysMath.Clamp(s.Rud + s.RIn * 0.5, -1, 1) * PhysMath.Lerp(32, 4, PhysMath.Clamp(gsp / 25, 0, 1)) * PhysMath.DEG;
            ctx.CrashPen = Math.Max(0.5, A.Gear.WheelR * 1.4);
            ctx.WetF = PhysMath.Lerp(1, 0.55, PhysMath.Clamp(s.SurfaceWet, 0, 1));
            double bAmt = PhysMath.Clamp(s.Brake, 0, 1);
            double bL = s.BrakeL.HasValue ? PhysMath.Clamp(s.BrakeL.Value, 0, 1) : bAmt;
            double bR = s.BrakeR.HasValue ? PhysMath.Clamp(s.BrakeR.Value, 0, 1) : bAmt;
            if (!s.BrakeL.HasValue && !s.BrakeR.HasValue && s.Opts.DiffBrake && bAmt > 0)
            {
                double sp = PhysMath.Clamp(s.Rud, -1, 1) * 0.6 * PhysMath.Clamp(1 - gsp / 15, 0, 1);
                if (sp > 0) { bR = PhysMath.Clamp(bAmt * (1 + sp), 0, 1); bL = PhysMath.Clamp(bAmt * (1 - sp), 0, 1); }
                else if (sp < 0) { bL = PhysMath.Clamp(bAmt * (1 - sp), 0, 1); bR = PhysMath.Clamp(bAmt * (1 + sp), 0, 1); }
            }
            ctx.BL = bL; ctx.BR = bR;
            s.WheelLock = false;
            ctx.YLoad = F[1];
            double reach = Math.Max(8, AC.B * 0.6);
            if (agl < reach)
            {
                for (int i = 0; i < s.Wheels.Count; i++)
                    s.Contacts[i] = s.GearPos > 0.98 ? Contact(s, s.Wheels[i].Off, s.Wheels[i].K, s.Wheels[i].C, "wheel", null, i == 0, ctx) : false;
                Contact(s, s.TailSkid.Off, s.TailSkid.K, s.TailSkid.C, "skid", null, false, ctx);
                foreach (var h in s.HardPts) { if (s.Crashed) break; Contact(s, h.Off, 0, 0, "hard", h.Name, false, ctx); }
            }
            else for (int i = 0; i < s.Contacts.Length; i++) s.Contacts[i] = false;
            if (s.Crashed) { Derive(s); return s; }
            ctx.Fw[1] -= AC.Mass * PhysMath.G;
            var savedPos = s.Pos; var savedVel = s.Vel; var savedQ = s.Q; var savedW = (double[])s.W.Clone();
            s.Vel = PhysMath.VMadd(s.Vel, ctx.Fw, dt / AC.Mass);
            s.Pos = PhysMath.VMadd(s.Pos, s.Vel, dt);
            var Tt = PhysMath.VAdd(Tb, PhysMath.QRot(qi, ctx.Tw));
            var Iw = new[] { AC.I[0] * s.W[0], AC.I[1] * s.W[1], AC.I[2] * s.W[2] };
            var gyro = PhysMath.VCross(s.W, Iw);
            for (int k = 0; k < 3; k++) s.W[k] += (Tt[k] - gyro[k] - AC.I[k] * s.W[k] * 0.05) / AC.I[k] * dt;
            var dq = PhysMath.QMul(s.Q, new[] { s.W[0], s.W[1], s.W[2], 0.0 });
            s.Q = PhysMath.QNorm(new[] { s.Q[0] + 0.5 * dt * dq[0], s.Q[1] + 0.5 * dt * dq[1], s.Q[2] + 0.5 * dt * dq[2], s.Q[3] + 0.5 * dt * dq[3] });
            bool finite = true;
            foreach (var v in s.Pos) finite &= double.IsFinite(v);
            foreach (var v in s.Vel) finite &= double.IsFinite(v);
            foreach (var v in s.Q) finite &= double.IsFinite(v);
            foreach (var v in s.W) finite &= double.IsFinite(v);
            if (!finite) { s.Pos = savedPos; s.Vel = savedVel; s.Q = savedQ; s.W = savedW; Crash(s, "機体が制御不能になりました"); Derive(s); return s; }
            bool wasMain = s.MainContact, wasGround = s.OnGround;
            s.MainContact = false; for (int i = 0; i < s.Contacts.Length; i++) if (s.Contacts[i] && i > 0) { s.MainContact = true; break; }
            s.OnGround = false; foreach (var c in s.Contacts) if (c) { s.OnGround = true; break; }
            if (s.OnGround && !wasGround) { s.GndAir = s.AirTime; s.GndVel = savedVel; if (s.AirTime > 1.5) { s.FirstWheel = Array.FindIndex(s.Contacts, c => c); s.TailTouch = false; } }
            double air = wasGround ? s.GndAir : s.AirTime;
            if (s.MainContact && !wasMain && air > 1.5 && !(wasGround && s.Td != null && s.T - s.Td.T < 5)) OnTouchdown(s, wasGround ? s.GndVel : savedVel);
            else if (s.MainContact && !wasMain && air > 0.25 && s.Td != null) s.Td.Bounces++;
            s.AirTime = s.OnGround ? 0 : s.AirTime + dt;
            s.Alpha = alpha; s.Beta = beta; s.Tas = V; s.Ias = V * Math.Sqrt(atm.Sigma); s.RudEff = rudEff;
            s.StallW = stallW; s.StallWarn = !s.OnGround && V > 8 && alpha > aS - 0.045;
            s.GLoad = PhysMath.Lerp(s.GLoad, ctx.YLoad / (AC.Mass * PhysMath.G), 0.1);
            s.Agl = agl; s.Vs = s.Vel[1];
            double rpmSum = 0;
            foreach (var e in s.Eng)
            {
                double rt = A.Jet ? e.N1 * 52 : e.Run ? Aero.RpmFor(A, thrOf(e), u, pw * (0.3 + 0.7 * e.PowK), false, s.Prop) : e.Feather ? 0 : Aero.RpmFor(A, 0, u, 1, true);
                e.Rpm = e.Rpm + (rt - e.Rpm) * Math.Min(1, dt * 1.8);
                e.Ang = (e.Ang + e.Rpm / 60 * Math.PI * 2 * dt) % (Math.PI * 2);
                rpmSum += e.Rpm;
            }
            s.Rpm = rpmSum / nE;
            s.PropAng = (s.PropAng + s.Rpm / 60 * Math.PI * 2 * dt) % (Math.PI * 2);
            double ffT = 0;
            foreach (var e in s.Eng)
            {
                e.Ff = e.Run ? e.ShaftW / 745.7 * 0.078 * e.FfK : 0;
                ffT += e.Ff;
                if (e.Ff > 0 && e.Feed >= 0 && s.Fuel[e.Feed] > 0) s.Fuel[e.Feed] = Math.Max(0, s.Fuel[e.Feed] - e.Ff * dt / 3600);
            }
            s.FuelFlow = ffT;
            s.FuelUsed += ffT * dt / 3600;
            double oatF = (atm.T - 273.15) * 9 / 5 + 32;
            double maxRpm = 0; bool anyRun = false;
            foreach (var e in s.Eng)
            {
                if (!e.OilT.HasValue) e.OilT = oatF;
                if (e.Run) e.OilQ = Math.Max(0, e.OilQ - 0.08 * dt / 3600 * (0.5 + thrOf(e)));
                double pTgt = e.Run ? PhysMath.Clamp(55 + e.Rpm * 0.012, 0, 85) : 0;
                if (e.Run && e.OilQ < 2.5) pTgt *= PhysMath.Clamp(0.3 + 0.7 * (e.OilQ / 2.5), 0.3, 1) * (e.Rpm > 2000 ? 0.8 : 1);
                if (e.Cyl == null && !A.Jet)
                {
                    e.Cyl = new List<CylState>();
                    for (int ci = 0; ci < 4; ci++) e.Cyl.Add(new CylState { Egt = e.Egt ?? 70, Cht = oatF });
                }
                if (e.Cyl != null)
                {
                    var egtSp = new[] { 0.96, 1.0, 1.07, 1.03 };
                    var chtSp = new[] { 0.97, 1.0, 1.06, 1.02 };
                    for (int ci = 0; ci < e.Cyl.Count; ci++)
                    {
                        var c = e.Cyl[ci];
                        c.Egt += ((e.Egt ?? 70) * egtSp[ci] - c.Egt) * Math.Min(1, dt / 2.5);
                        double chtT = oatF + (e.Run ? (215 + 195 * PhysMath.Clamp(thrOf(e), 0, 1)) * chtSp[ci] : 0);
                        double tau = chtT > c.Cht ? 150 : (thrOf(e) < 0.35 && u > 30 ? 45 : 240);
                        c.Cht += (chtT - c.Cht) * dt / tau;
                    }
                }
                e.OilP = e.OilP + (pTgt - e.OilP) * Math.Min(1, dt * 1.5);
                double tTgt = e.Run ? 130 + 70 * PhysMath.Clamp(thrOf(e), 0, 1) : oatF;
                e.OilT = e.OilT.Value + (tTgt - e.OilT.Value) * dt / (e.Run ? 240 : 600);
                if (e.Run) { anyRun = true; if (e.Rpm > maxRpm) maxRpm = e.Rpm; }
            }
            var el = s.Elec;
            double gen = el.AltFail ? 0 : PhysMath.Clamp((maxRpm - 500) / 500, 0, 1) * 55;
            double net = gen - 11;
            if (net > 0 && el.Batt >= 1) net *= 0.06;
            el.Batt = PhysMath.Clamp(el.Batt + net * dt / (20 * 3600), 0, 1);
            bool deadBus = el.Batt <= 0.001 && gen <= 1;
            el.Volts = deadBus ? 0 : gen > 1 ? 13.9 + 0.3 * (gen / 55) : 11.3 + 1.5 * el.Batt;
            el.Amps = deadBus ? 0 : Math.Floor(net + 0.5);
            if (anyRun) s.Hobbs += dt / 3600;
            {
                double oatC = atm.T - 273.15;
                if (s.PitotHeat) s.PitotIce = Math.Max(0, s.PitotIce - dt / 20);
                else if (s.PitotRisk > 0 && oatC > -12 && oatC < 6) s.PitotIce = Math.Min(1, s.PitotIce + dt * s.PitotRisk / 90);
            }
            RunwayChecks(s);
            Derive(s);
            return s;
        }

        public static void Crash(State s, string why)
        {
            if (s.Crashed) return;
            s.Crashed = true; s.CrashReason = why; s.Vel = new double[3]; s.W = new double[3];
            s.Events.Add(new SimEvent { T = s.T, Type = "crash", Why = why });
        }
        public static void OnTouchdown(State s, double[] v0)
        {
            var a = Attitude(s);
            double n = -s.Pos[2], e = s.Pos[0];
            var rc = FlightPhysics.RwyCoords(FlightPhysics.LAB_RWY, n, e);
            double h = FlightPhysics.LAB_RWY.TrueHdg * PhysMath.DEG;
            var perp = new[] { Math.Cos(h), 0.0, Math.Sin(h) };
            double latV = v0[0] * perp[0] + v0[2] * perp[2];
            double fpm = JR(-v0[1] * 196.85);
            bool onR = FlightPhysics.OnRunway(FlightPhysics.LAB_RWY, n, e);
            var td = new TdRecord
            {
                T = s.T, Fpm = fpm, Kias = JR(s.Ias * PhysMath.KT), GsKt = JR(Math.Sqrt(v0[0] * v0[0] + v0[2] * v0[2]) * PhysMath.KT),
                Pitch = JR1(a.Pitch), Bank = JR1(a.Bank), Crab = JR1(Math.Abs(PhysMath.Wrap180(a.Hdg - FlightPhysics.LAB_RWY.TrueHdg))),
                LatV = JR2(latV), Along = JR(rc.along), Cross = JR1(rc.cross), OnRunway = onR, NoseFirst = s.FirstWheel == 0, Bounces = 0
            };
            s.Td = td;
            s.Events.Add(new SimEvent { T = td.T, Type = "touchdown", Fpm = td.Fpm, Kias = td.Kias, GsKt = td.GsKt, Pitch = td.Pitch, Bank = td.Bank, Crab = td.Crab, LatV = td.LatV, Along = td.Along, Cross = td.Cross, OnRunway = td.OnRunway, NoseFirst = td.NoseFirst, Bounces = td.Bounces });
            if (fpm > 600) s.Events.Add(new SimEvent { T = s.T, Type = "hard_landing", Fpm = fpm });
            if (!onR) s.Events.Add(new SimEvent { T = s.T, Type = "off_runway_touchdown" });
            if (Math.Abs(a.Bank) > 15 && !s.Crashed) Crash(s, "大きく傾いたまま接地（翼端接触）");
        }
        public static void RunwayChecks(State s)
        {
            double n = -s.Pos[2], e = s.Pos[0];
            bool onR = FlightPhysics.OnRunway(FlightPhysics.LAB_RWY, n, e);
            double gsMs = Math.Sqrt(s.Vel[0] * s.Vel[0] + s.Vel[2] * s.Vel[2]);
            if (s.OnGround && onR) { s.WasOnRunway = true; s.LastRwyT = s.T; }
            if (s.OnGround && !onR && s.WasOnRunway && gsMs > 1.5 && s.T - s.LastRwyT < 30 && !s.Excursion && FlightPhysics.PavedAt(n, e) == null)
            {
                s.Excursion = true;
                s.Events.Add(new SimEvent { T = s.T, Type = "runway_excursion" });
            }
            if (!s.OnGround && s.AirTime > 5) { s.WasOnRunway = false; s.Excursion = false; }
        }
        public static AttResult Attitude(State s)
        {
            var f = PhysMath.QRot(s.Q, new[] { 0.0, 0, -1 });
            var r = PhysMath.QRot(s.Q, new[] { 1.0, 0, 0 });
            var up = PhysMath.QRot(s.Q, new[] { 0.0, 1, 0 });
            return new AttResult { Pitch = Math.Asin(PhysMath.Clamp(f[1], -1, 1)) / PhysMath.DEG, Bank = Math.Atan2(-r[1], up[1]) / PhysMath.DEG, Hdg = PhysMath.Wrap360(Math.Atan2(f[0], -f[2]) / PhysMath.DEG) };
        }
        public static double[] WindNow(State s) => WindAt(s, s.T, Math.Max(s.Agl, 0) + 2);
        // JS Math.round (half toward +infinity)
        public static double JR(double x) => Math.Floor(x + 0.5);
        public static double JR1(double x) => Math.Floor(x * 10 + 0.5) / 10;
        public static double JR2(double x) => Math.Floor(x * 100 + 0.5) / 100;

        public static OutRecord Derive(State s)
        {
            var o = s.Out; var A = s.A;
            var a = Attitude(s);
            var atm = Aero.Atmos(s.Pos[1], s.OatDev);
            var wnd = WindNow(s);
            var va = PhysMath.VSub(s.Vel, wnd);
            double V = PhysMath.VLen(va);
            var vb = PhysMath.QRot(PhysMath.QConj(s.Q), va);
            o.Tas = V * PhysMath.KT;
            o.Ias = V * Math.Sqrt(atm.Sigma) * PhysMath.KT * (vb[2] < 0 ? 1 : 0);
            o.PitotIce = s.PitotIce; o.PitotBlocked = s.PitotIce >= 0.999;
            if (o.PitotBlocked) { if (!s.IasFrz.HasValue) s.IasFrz = o.Ias; o.Ias = s.IasFrz.Value; }
            else { s.IasFrz = null; if (o.PitotIce > 0) o.Ias *= 1 - 0.8 * o.PitotIce; }
            o.StaticBlocked = s.StaticBlocked && !s.AltStatic; o.AltStatic = s.AltStatic;
            o.Gs = Math.Sqrt(s.Vel[0] * s.Vel[0] + s.Vel[2] * s.Vel[2]) * PhysMath.KT;
            o.Trk = o.Gs > 1 ? PhysMath.Wrap360(Math.Atan2(s.Vel[0], -s.Vel[2]) / PhysMath.DEG) : a.Hdg;
            o.HdgTrue = a.Hdg; o.Pitch = a.Pitch; o.Bank = a.Bank;
            o.Vsi = s.Vel[1] * 196.85;
            o.AltTrue = s.Pos[1] * PhysMath.FT;
            o.Agl = (s.Pos[1] + s.WheelBottom - FlightPhysics.GROUND_M) * PhysMath.FT;
            if (o.StaticBlocked) { if (!s.AltFrz.HasValue) s.AltFrz = o.AltTrue; o.AltTrue = s.AltFrz.Value; o.Vsi = 0; }
            else s.AltFrz = null;
            if (s.AltStatic && s.StaticBlocked) o.AltTrue += 80;
            o.Alpha = V > 2 ? Math.Atan2(-vb[1], -vb[2]) / PhysMath.DEG : 0;
            o.Beta = V > 2 ? Math.Asin(PhysMath.Clamp(vb[0] / V, -1, 1)) / PhysMath.DEG : 0;
            double flapF = A.Wing.Flap != null ? s.FlapDeg / 30 : 0;
            o.AStallDeg = (s.AC.AStall - s.AC.FlapStall * flapF) / PhysMath.DEG;
            o.AoaFrac = PhysMath.Clamp((o.Alpha + 4) / (o.AStallDeg + 4), 0, 1.2);
            o.StallWarn = s.StallWarn;
            o.Slip = PhysMath.Clamp(o.Beta * 0.35, -1.5, 1.5);
            o.WindFrom = s.Wind.FromDeg; o.WindKt = Math.Sqrt(wnd[0] * wnd[0] + wnd[2] * wnd[2]) * PhysMath.KT;
            o.Rpm = s.Rpm;
            o.Rpms = new double[s.Eng.Count]; for (int i = 0; i < s.Eng.Count; i++) o.Rpms[i] = s.Eng[i].Rpm;
            o.FuelFlow = s.FuelFlow;
            o.Fuel = new[] { s.Fuel[0], s.Fuel[1] };
            var e0 = s.Eng.Count > 0 ? s.Eng[0] : null;
            o.Mag = e0 != null ? e0.Mag ?? "BOTH" : "BOTH";
            o.Mix = e0 != null ? e0.Lev : 1;
            o.FuelSel = e0 != null ? e0.Sel ?? "L" : "L";
            o.Mags = new string[s.Eng.Count]; o.Mixs = new double[s.Eng.Count]; o.FuelSels = new string[s.Eng.Count];
            bool cranking = false;
            for (int i = 0; i < s.Eng.Count; i++) { o.Mags[i] = s.Eng[i].Mag ?? "BOTH"; o.Mixs[i] = s.Eng[i].Lev; o.FuelSels[i] = s.Eng[i].Sel ?? "L"; if (!s.Eng[i].On && s.Eng[i].Mag == "START") cranking = true; }
            o.Cranking = cranking;
            double pwD = Math.Max(0, 1.132 * atm.Sigma - 0.132);
            if (EngineRunning(s))
            {
                double sum = 0;
                foreach (var e in s.Eng) sum += e.Run ? (0.04 + 0.96 * (e.Thr ?? s.Thr)) * pwD * e.MixK : 0;
                o.PowerPct = JR(sum / s.Eng.Count * 100);
            }
            else o.PowerPct = 0;
            o.Egts = new double[s.Eng.Count]; for (int i = 0; i < s.Eng.Count; i++) o.Egts[i] = JR(s.Eng[i].Egt ?? 0);
            o.Egt = o.Egts.Length > 0 ? o.Egts[0] : 0;
            o.Jet = A.Jet;
            o.N1s = new double[s.Eng.Count]; for (int i = 0; i < s.Eng.Count; i++) o.N1s[i] = JR(s.Eng[i].N1 * 10) / 10;
            if (o.N1s.Length > 0) { double sm = 0; foreach (var v in o.N1s) sm += v; o.N1 = JR(sm / o.N1s.Length * 10) / 10; } else o.N1 = 0;
            o.Mach = atm.A > 0 ? JR(V / atm.A * 1000) / 1000 : 0;
            o.Rev = s.Rev; o.Spoiler = s.Spoiler;
            o.ManIns = new double[s.Eng.Count]; for (int i = 0; i < s.Eng.Count; i++) o.ManIns[i] = JR(s.Eng[i].ManIn * 10) / 10;
            o.ManIn = o.ManIns.Length > 0 ? o.ManIns[0] : 0;
            double rough = 0, carb = 0; foreach (var e in s.Eng) { rough = Math.Max(rough, e.Rough); carb = Math.Max(carb, e.CarbIce); }
            o.Rough = rough; o.CarbIce = carb;
            o.OilP = new double[s.Eng.Count]; o.OilT = new double[s.Eng.Count]; o.OilQ = new double[s.Eng.Count];
            double oatF = (atm.T - 273.15) * 9 / 5 + 32;
            bool lowOil = false;
            for (int i = 0; i < s.Eng.Count; i++)
            {
                var e = s.Eng[i];
                o.OilP[i] = JR(e.OilP); o.OilT[i] = JR(e.OilT ?? oatF); o.OilQ[i] = JR(e.OilQ * 10) / 10;
                if (e.Run && e.OilP < 30) lowOil = true;
            }
            o.LowOilPress = lowOil;
            o.FuelPress = JR((e0 != null ? e0.FuelPress : 0) * 100) / 100;
            o.FuelPresses = new double[s.Eng.Count]; for (int i = 0; i < s.Eng.Count; i++) o.FuelPresses[i] = JR(s.Eng[i].FuelPress * 100) / 100;
            o.FuelUsed = JR(s.FuelUsed * 10) / 10;
            o.FuelRemain = JR((s.Fuel[0] + s.Fuel[1]) * 10) / 10;
            o.EnduranceH = s.FuelFlow > 0.2 ? JR(o.FuelRemain / s.FuelFlow * 10) / 10 : (double?)null;
            o.Cyls = new List<List<CylState>>();
            foreach (var e in s.Eng)
            {
                var lst = new List<CylState>();
                if (e.Cyl != null) foreach (var c in e.Cyl) lst.Add(new CylState { Egt = JR(c.Egt), Cht = JR(c.Cht) });
                o.Cyls.Add(lst);
            }
            o.Cyl = o.Cyls.Count > 0 ? o.Cyls[0] : new List<CylState>();
            o.Cht = o.Cyl.Count > 0 ? JR(AvgCht(o.Cyl)) : 0;
            o.Chts = new double[o.Cyls.Count];
            for (int i = 0; i < o.Cyls.Count; i++) o.Chts[i] = o.Cyls[i].Count > 0 ? JR(AvgCht(o.Cyls[i])) : 0;
            o.GearFault = s.GearFault; o.GearEmerg = s.GearEmerg; o.Xfeed = s.Xfeed;
            o.Prop = s.Prop;
            o.PropK = e0 != null ? JR(e0.PropK * 100) / 100 : 1;
            o.GovRpm = A.PropCtrl ? JR(A.PropGov[0] + (A.PropGov[1] - A.PropGov[0]) * PhysMath.Clamp(o.Prop, 0, 1)) : (double?)null;
            o.Volts = JR(s.Elec.Volts * 10) / 10;
            o.Amps = (int)s.Elec.Amps;
            o.Hobbs = JR(s.Hobbs * 10) / 10;
            o.Oat = atm.T - 273.15;
            o.G = s.GLoad;
            o.DensAlt = s.DensAlt * PhysMath.FT;
            double n = -s.Pos[2], e2 = s.Pos[0];
            o.OnRunway = FlightPhysics.OnRunway(FlightPhysics.LAB_RWY, n, e2);
            var rc = FlightPhysics.RwyCoords(FlightPhysics.LAB_RWY, n, e2);
            o.RwyAlong = rc.along; o.RwyCross = rc.cross;
            double wSqrt = Math.Sqrt(s.AC.Mass / A.Phys.Mass);
            o.Vs0 = JR(A.VGet("s0") * wSqrt * 10) / 10;
            o.Vs1 = JR(A.VGet("s1") * wSqrt * 10) / 10;
            o.FlapLabel = A.FlapLabels[s.FlapIdx];
            o.GearDown = s.GearDown; o.GearPos = s.GearPos;
            return o;
        }
        private static double AvgCht(List<CylState> cs) { double sm = 0; foreach (var c in cs) sm += c.Cht; return sm / cs.Count; }

        public static void ResetState(State s)
        {
            s.Vel = new double[3]; s.W = new double[3];
            s.OnGround = false; s.MainContact = false; s.Crashed = false; s.CrashReason = "";
            s.Events = new List<SimEvent>(); s.Td = null; s.TailTouch = false; s.FirstWheel = -1; s.GLoad = 1;
            s.PTgt = null; s.PHI = 0; s.GI = 0; s.BI = 0; s.TrimHold = 0; s.TrimTgt = null;
            s.EngStopNoted = false; s.WasOnRunway = false; s.Excursion = false; s.PIn = 0; s.RIn = 0; s.Rud = 0; s.Ovr = null; s.StH = null; s.Prop = 1;
            for (int i = 0; i < s.Eng.Count; i++)
            {
                var e = s.Eng[i];
                e.Failed = false; e.Feather = false; e.Cut = false; e.Thr = null; e.Mag = "BOTH"; e.Mix = 1; e.Sel = i != 0 ? "R" : "L";
                e.On = true; e.CrankT = 0; e.LineT = FlightPhysics.LINE_FUEL_S; e.CarbIce = 0; e.IceNoted = false; e.MagBad = null; e.PumpFail = false; e.PressT = 0;
            }
            s.Rev = 0; s.Spoiler = 0;
            s.PitotIce = 0; s.StaticBlocked = false; s.IasFrz = null; s.AltFrz = null; s.GearFault = false; s.GearEmerg = false; s.GearEmergT = 0;
            s.MixCmd = s.Mix; s.SelCmd = s.FuelSel;
        }
        public static State PlaceOnRunway(State s, RwyDef rwy = null, double along = 30)
        {
            rwy = rwy ?? FlightPhysics.LAB_RWY;
            ResetState(s);
            var ne = FlightPhysics.RwyToNE(rwy, along, 0);
            s.Q = PhysMath.QFromHPB(rwy.TrueHdg, 0, 0);
            s.Pos = new[] { ne[1], FlightPhysics.GROUND_M - s.WheelBottom + 0.02, -ne[0] };
            s.FlapIdx = 0; s.FlapDeg = 0; s.Thr = 0; s.Trim = 0; s.Brake = 0; s.GearDown = true; s.GearPos = 1;
            s.OnGround = true; s.AirTime = 0; s.WasOnRunway = true; s.LastRwyT = s.T;
            s.Contacts = new bool[s.Wheels.Count]; for (int i = 0; i < s.Contacts.Length; i++) s.Contacts[i] = true;
            s.Rpm = Aero.RpmFor(s.A, 0, 0);
            foreach (var en in s.Eng) en.Rpm = s.Rpm;
            Derive(s);
            return s;
        }
        public static State PlaceInAir(State s, double n, double e, double altFt, double hdgTrue, double kias, double gammaDeg = 0, int flapIdx = 0, double? thr = null)
        {
            ResetState(s);
            var A = s.A;
            var atm = Aero.Atmos(altFt / PhysMath.FT, s.OatDev);
            double kt = kias / Math.Sqrt(atm.Sigma);
            s.FlapIdx = A.Wing.Flap != null ? flapIdx : 0;
            s.FlapDeg = FlightPhysics.FLAP_DEG[s.FlapIdx];
            double v = kt / PhysMath.KT, ff = A.Wing.Flap != null ? s.FlapDeg / 30 : 0;
            var tr = TrimFor(s, v, ff, Math.Cos(gammaDeg * PhysMath.DEG), atm.Rho);
            s.Trim = PhysMath.Clamp(tr.elev, -FlightPhysics.TRIM_MAX, FlightPhysics.TRIM_MAX); s.TrimHold = 0;
            s.Pos = new[] { e, altFt / PhysMath.FT, -n };
            s.Q = PhysMath.QFromHPB(hdgTrue, tr.alpha / PhysMath.DEG + gammaDeg, 0);
            var dir = new[] { Math.Sin(hdgTrue * PhysMath.DEG), 0.0, -Math.Cos(hdgTrue * PhysMath.DEG) };
            var w = WindAt(s, s.T, altFt / PhysMath.FT - FlightPhysics.GROUND_M);
            s.Vel = PhysMath.VAdd(PhysMath.VAdd(PhysMath.VScale(dir, v * Math.Cos(gammaDeg * PhysMath.DEG)), new[] { 0.0, v * Math.Sin(gammaDeg * PhysMath.DEG), 0 }), new[] { w[0], 0.0, w[2] });
            s.GearDown = A.Gear.Fixed ? true : gammaDeg < -1 || flapIdx > 0;
            s.GearPos = s.GearDown ? 1 : 0;
            double thrV;
            if (!thr.HasValue)
            {
                var ss = SteadyState(s, kias, Math.Sin(gammaDeg * PhysMath.DEG) * v * 196.85, new SteadyOpts { AltFt = altFt, Flaps = s.FlapIdx, Gear = s.GearDown });
                thrV = PhysMath.Clamp(ss.Thr, 0, 1);
            }
            else thrV = thr.Value;
            s.Thr = thrV;
            s.AirTime = 10; s.OnGround = false; s.MainContact = false;
            s.Contacts = new bool[s.Wheels.Count];
            s.Rpm = Aero.RpmFor(A, thrV, v);
            foreach (var en in s.Eng) en.Rpm = s.Rpm;
            if (A.Jet) foreach (var en in s.Eng) { en.N1 = 20 + 84 * Math.Pow(PhysMath.Clamp(thrV, 0, 1), 1.15); en.Egt = Math.Min(420 + 5.6 * en.N1, 1050); }
            s.PTgt = Attitude(s).Pitch;
            Derive(s);
            return s;
        }
    }
}
