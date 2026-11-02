// CadetCollide — a verbatim C# port of cadet/src/player/collide.js (Stage 9).
// Axis-aligned boxes in the runway frame (x = across, y = up from the floor,
// z = −along), kept in a spatial hash; the player is a vertical cylinder that
// slides along them. The result depends only on the boxes, so a JS golden
// trace replayed through this code must match step for step.
using System;
using System.Collections.Generic;

namespace Cadet
{
    /// <summary>A box as given to / read from the collision world. Y1 = +∞ is allowed.</summary>
    public class CollideBox
    {
        public int Id;
        public double X0, X1, Y0, Y1, Z0, Z1;
        public string Tag;
        public CollideBox Clone() { return (CollideBox)MemberwiseClone(); }
    }

    /// <summary>Input box with optional fields (JS: missing y0 = 0, y1 = ∞).</summary>
    public struct BoxInput
    {
        public double X0, X1, Z0, Z1;
        public double? Y0, Y1;
        public string Tag;
        public BoxInput(double x0, double x1, double z0, double z1, double? y0 = null, double? y1 = null, string tag = null)
        { X0 = x0; X1 = x1; Z0 = z0; Z1 = z1; Y0 = y0; Y1 = y1; Tag = tag; }
    }

    public struct MoveResult { public double X, Z; public bool Blocked; public double[] HitNormal; }
    public class RayHit { public double Dist; public CollideBox Box; }

    public class CollisionWorld
    {
        const double EPS = 1e-9;
        const double SLOP = 1e-4;
        const int PASSES = 8;
        const int BIG = 256;
        const int MAX_SUB = 8192;

        class Rec
        {
            public int Id; public double X0, X1, Y0, Y1, Z0, Z1; public string Tag;
            public bool On; public int Mark;
            public int I0, I1, K0, K1; public bool Big;
            public CollideBox View;
        }

        readonly double cell, inv;
        readonly List<Rec> recs = new List<Rec>();          // insertion order = id order
        readonly Dictionary<int, Rec> byIdMap = new Dictionary<int, Rec>();
        readonly Dictionary<long, List<Rec>> grid = new Dictionary<long, List<Rec>>();
        readonly List<Rec> big = new List<Rec>();
        readonly List<Rec> cand = new List<Rec>();
        int nextId = 1, stamp = 0;

        public CollisionWorld(double cell = 4)
        {
            if (!(cell > 0 && cell < double.PositiveInfinity)) throw new ArgumentOutOfRangeException(nameof(cell));
            this.cell = cell; inv = 1 / cell;
        }

        static long Key(int i, int k) { return (long)i * 1048576 + k; }
        static double Clamp(double v, double lo, double hi) { return v < lo ? lo : v > hi ? hi : v; }

        static Rec ReadBox(BoxInput b, Rec old)
        {
            double Num(string k, double? v, double? oldV, double dflt, bool hasDflt)
            {
                double val = v.HasValue ? v.Value : oldV.HasValue ? oldV.Value : dflt;
                if (double.IsNaN(val) || (!hasDflt && !v.HasValue && !oldV.HasValue))
                    throw new ArgumentException($"collide: box.{k} must be a number");
                return val;
            }
            double x0 = Num("x0", b.X0, old?.X0, 0, false), x1 = Num("x1", b.X1, old?.X1, 0, false);
            double z0 = Num("z0", b.Z0, old?.Z0, 0, false), z1 = Num("z1", b.Z1, old?.Z1, 0, false);
            double y0 = Num("y0", b.Y0, old?.Y0, 0, true), y1 = Num("y1", b.Y1, old?.Y1, double.PositiveInfinity, true);
            return new Rec
            {
                X0 = Math.Min(x0, x1), X1 = Math.Max(x0, x1),
                Y0 = Math.Min(y0, y1), Y1 = Math.Max(y0, y1),
                Z0 = Math.Min(z0, z1), Z1 = Math.Max(z0, z1),
                Tag = b.Tag ?? old?.Tag,
            };
        }

        void SetView(Rec r)
        {
            r.View = new CollideBox { Id = r.Id, X0 = r.X0, X1 = r.X1, Y0 = r.Y0, Y1 = r.Y1, Z0 = r.Z0, Z1 = r.Z1, Tag = r.Tag };
        }

        void Place(Rec r)
        {
            bool fin = double.IsFinite(r.X0) && double.IsFinite(r.X1) && double.IsFinite(r.Z0) && double.IsFinite(r.Z1);
            r.I0 = fin ? (int)Math.Floor(r.X0 * inv) : 0; r.I1 = fin ? (int)Math.Floor(r.X1 * inv) : 0;
            r.K0 = fin ? (int)Math.Floor(r.Z0 * inv) : 0; r.K1 = fin ? (int)Math.Floor(r.Z1 * inv) : 0;
            r.Big = !fin || (r.I1 - r.I0 + 1) * (r.K1 - r.K0 + 1) > BIG;
            if (r.Big) { big.Add(r); return; }
            for (int i = r.I0; i <= r.I1; i++) for (int k = r.K0; k <= r.K1; k++)
            {
                long kk = Key(i, k);
                if (!grid.TryGetValue(kk, out var a)) { a = new List<Rec>(); grid[kk] = a; }
                a.Add(r);
            }
        }

        void Unplace(Rec r)
        {
            if (r.Big) { big.Remove(r); return; }
            for (int i = r.I0; i <= r.I1; i++) for (int k = r.K0; k <= r.K1; k++)
            {
                long kk = Key(i, k);
                var a = grid[kk];
                int j = a.IndexOf(r);
                a[j] = a[a.Count - 1]; a.RemoveAt(a.Count - 1);
                if (a.Count == 0) grid.Remove(kk);
            }
        }

        bool SameCellsW(Rec r, Rec b)
        {
            return !r.Big && double.IsFinite(b.X0 + b.X1 + b.Z0 + b.Z1)
                && (int)Math.Floor(b.X0 * inv) == r.I0 && (int)Math.Floor(b.X1 * inv) == r.I1
                && (int)Math.Floor(b.Z0 * inv) == r.K0 && (int)Math.Floor(b.Z1 * inv) == r.K1;
        }

        // ---------------------------------------------------------------- gather
        int gS = 0; double gx0 = 0, gz0 = 0, gx1 = 0, gz1 = 0, gLo = 0, gHi = 0;
        List<Rec> gOut;
        void Take(Rec r)
        {
            if (r.Mark == gS) return;
            r.Mark = gS;
            if (r.On && r.X0 <= gx1 && r.X1 >= gx0 && r.Z0 <= gz1 && r.Z1 >= gz0 && r.Y1 > gLo && r.Y0 < gHi) gOut.Add(r);
        }
        List<Rec> Gather(List<Rec> outList, double x0, double z0, double x1, double z1, double lo = double.NegativeInfinity, double hi = double.PositiveInfinity)
        {
            outList.Clear(); gOut = outList; gS = ++stamp;
            gx0 = x0; gz0 = z0; gx1 = x1; gz1 = z1; gLo = lo; gHi = hi;
            for (int j = 0; j < big.Count; j++) Take(big[j]);
            int i0 = (int)Math.Floor(x0 * inv), i1 = (int)Math.Floor(x1 * inv), k0 = (int)Math.Floor(z0 * inv), k1 = (int)Math.Floor(z1 * inv);
            if (!((i1 - i0 + 1) * (k1 - k0 + 1) <= grid.Count)) { foreach (var r in recs) if (!r.Big) Take(r); }
            else for (int i = i0; i <= i1; i++) for (int k = k0; k <= k1; k++)
            {
                if (grid.TryGetValue(Key(i, k), out var a)) for (int j = 0; j < a.Count; j++) Take(a[j]);
            }
            if (outList.Count > 1) outList.Sort((a, b) => a.Id - b.Id);
            return outList;
        }

        // ---------------------------------------------------------------- boxes
        public int Add(BoxInput b)
        {
            var r = ReadBox(b, null);
            r.Id = nextId++; r.On = true; r.Mark = 0;
            SetView(r); Place(r); recs.Add(r); byIdMap[r.Id] = r;
            return r.Id;
        }
        public bool Update(int id, BoxInput b)
        {
            if (!byIdMap.TryGetValue(id, out var r)) return false;
            var nb = ReadBox(b, r);
            if (SameCellsW(r, nb)) CopyInto(r, nb);
            else { Unplace(r); CopyInto(r, nb); Place(r); }
            SetView(r);
            return true;
        }
        static void CopyInto(Rec r, Rec b) { r.X0 = b.X0; r.X1 = b.X1; r.Y0 = b.Y0; r.Y1 = b.Y1; r.Z0 = b.Z0; r.Z1 = b.Z1; r.Tag = b.Tag; }
        public bool Remove(int id)
        {
            if (!byIdMap.TryGetValue(id, out var r)) return false;
            Unplace(r); recs.Remove(r); byIdMap.Remove(id);
            return true;
        }
        public bool SetEnabled(int id, bool on)
        {
            if (!byIdMap.TryGetValue(id, out var r)) return false;
            r.On = on; return true;
        }
        public List<CollideBox> Query(double x0, double z0, double x1, double z1)
        {
            var got = Gather(new List<Rec>(), Math.Min(x0, x1), Math.Min(z0, z1), Math.Max(x0, x1), Math.Max(z0, z1));
            var outp = new List<CollideBox>(got.Count);
            foreach (var r in got) outp.Add(r.View);
            return outp;
        }
        public int Count { get { return recs.Count; } }
        /// <summary>The current view of one box (refreshed on add/update), or null.</summary>
        public CollideBox GetView(int id) { return byIdMap.TryGetValue(id, out var r) ? r.View : null; }
        public bool IsEnabled(int id) { return byIdMap.TryGetValue(id, out var r) && r.On; }

        // ---------------------------------------------------------------- the walker
        double PX = 0, PZ = 0, PPx = 0, PPz = 0, PNx = 0, PNz = 0; int PHits = 0;

        double Overlap(double x, double z, double r)
        {
            double worst = 0;
            for (int j = 0; j < cand.Count; j++)
            {
                var b = cand[j];
                double ex = x - Clamp(x, b.X0, b.X1), ez = z - Clamp(z, b.Z0, b.Z1), d2 = ex * ex + ez * ez;
                double p = d2 > 0 ? r - Math.Sqrt(d2) : r + Math.Min(Math.Min(x - b.X0, b.X1 - x), Math.Min(z - b.Z0, b.Z1 - z));
                if (p > worst) worst = p;
            }
            return worst;
        }

        double Settle(double r)
        {
            double lim = (r - EPS) * (r - EPS);
            int max = PASSES * Math.Max(1, Math.Min(cand.Count, 8));
            for (int it = 0; it < max; it++)
            {
                int best = -1; double bestP = 0, bqx = 0, bqz = 0;
                for (int j = 0; j < cand.Count; j++)
                {
                    var b = cand[j]; double x = PX, z = PZ;
                    double ex = x - Clamp(x, b.X0, b.X1), ez = z - Clamp(z, b.Z0, b.Z1), d2 = ex * ex + ez * ez;
                    if (d2 >= lim) continue;
                    double qx = 0, qz = 0, pen;
                    if (d2 > 1e-20) { double d = Math.Sqrt(d2), k = (r - d) / d; qx = ex * k; qz = ez * k; pen = r - d; }
                    else
                    {
                        double w = x - b.X0, e = b.X1 - x, s = z - b.Z0, n = b.Z1 - z, m = Math.Min(Math.Min(w, e), Math.Min(s, n));
                        if (m == w) qx = b.X0 - r - x; else if (m == e) qx = b.X1 + r - x; else if (m == s) qz = b.Z0 - r - z; else qz = b.Z1 + r - z;
                        pen = r + m;
                    }
                    if (pen > bestP) { bestP = pen; best = j; bqx = qx; bqz = qz; }
                }
                if (best < 0) return 0;
                PX += bqx; PZ += bqz; PPx += bqx; PPz += bqz;
                double q = Math.Sqrt(bqx * bqx + bqz * bqz); PNx = bqx / q; PNz = bqz / q; PHits++;
            }
            return Overlap(PX, PZ, r);
        }

        public MoveResult Move(double posX, double posY, double posZ, double dx, double dz, double radius = 0.3, double height = 1.75, double step = 0.35)
        {
            double y = posY;
            if (!double.IsFinite(posX) || !double.IsFinite(posZ) || !double.IsFinite(y)) throw new ArgumentException("collide.move: pos needs finite x, y, z");
            if (!double.IsFinite(dx)) dx = 0;
            if (!double.IsFinite(dz)) dz = 0;
            double r = Math.Max(radius, 0.01), lo = y + step, hi = y + height;
            double len = Math.Sqrt(dx * dx + dz * dz);
            int n = Math.Max(1, (int)Math.Ceiling(len / (r * 0.5)));
            if (n > MAX_SUB) { double k = MAX_SUB * r * 0.5 / len; dx *= k; dz *= k; n = MAX_SUB; }
            double sx = dx / n, sz = dz / n;
            double m = r + 1.0;
            Gather(cand, Math.Min(posX, posX + dx) - m, Math.Min(posZ, posZ + dz) - m, Math.Max(posX, posX + dx) + m, Math.Max(posZ, posZ + dz) + m, lo, hi);
            PX = posX; PZ = posZ; PPx = PPz = PNx = PNz = 0; PHits = 0;
            bool cut = false;
            if (cand.Count > 0)
            {
                double start = Settle(r);
                for (int i = 1; i <= n; i++)
                {
                    double ox = PX, oz = PZ;
                    PX += sx; PZ += sz;
                    double left = Settle(r);
                    if (left > Math.Max(SLOP, start) + 1e-6) { PX = ox; PZ = oz; cut = true; break; }
                }
            }
            else { PX += dx; PZ += dz; }
            bool blocked = cut || PHits > 0;
            double[] hitNormal = null;
            if (blocked)
            {
                double nx = PPx, nz = PPz, l = Math.Sqrt(nx * nx + nz * nz);
                if (l < 1e-9) { nx = PNx; nz = PNz; l = Math.Sqrt(nx * nx + nz * nz); }
                if (l < 1e-9) { nx = -dx; nz = -dz; l = Math.Sqrt(nx * nx + nz * nz); }
                if (l > 1e-12) hitNormal = new[] { nx / l, nz / l };
            }
            return new MoveResult { X = PX, Z = PZ, Blocked = blocked, HitNormal = hitNormal };
        }

        public double GroundAt(double x, double z, double y = 0, double radius = 0.3, double step = 0.35)
        {
            double r = Math.Max(radius, 0), top = y + step + EPS, r2 = r * r;
            Gather(cand, x - r, z - r, x + r, z + r);
            double g = 0;
            for (int j = 0; j < cand.Count; j++)
            {
                var b = cand[j];
                if (b.Y1 > top || b.Y1 <= g) continue;
                double ex = x - Clamp(x, b.X0, b.X1), ez = z - Clamp(z, b.Z0, b.Z1), d2 = ex * ex + ez * ez;
                if (d2 < r2 || d2 == 0) g = b.Y1;
            }
            return g;
        }

        // ---------------------------------------------------------------- rays
        static double Enter(Rec b, double ox, double oy, double oz, double dx, double dy, double dz)
        {
            double t0 = 0, t1 = double.PositiveInfinity;
            if (dx != 0) { double u = (b.X0 - ox) / dx, v = (b.X1 - ox) / dx; t0 = Math.Max(t0, Math.Min(u, v)); t1 = Math.Min(t1, Math.Max(u, v)); }
            else if (ox < b.X0 || ox > b.X1) return -1;
            if (dy != 0) { double u = (b.Y0 - oy) / dy, v = (b.Y1 - oy) / dy; t0 = Math.Max(t0, Math.Min(u, v)); t1 = Math.Min(t1, Math.Max(u, v)); }
            else if (oy < b.Y0 || oy > b.Y1) return -1;
            if (dz != 0) { double u = (b.Z0 - oz) / dz, v = (b.Z1 - oz) / dz; t0 = Math.Max(t0, Math.Min(u, v)); t1 = Math.Min(t1, Math.Max(u, v)); }
            else if (oz < b.Z0 || oz > b.Z1) return -1;
            return t0 <= t1 ? t0 : -1;
        }

        public RayHit Raycast(double ox, double oy, double oz, double dx, double dy, double dz, double maxDist = double.PositiveInfinity, Func<CollideBox, bool> filter = null)
        {
            double l = Math.Sqrt(dx * dx + dy * dy + dz * dz);
            if (!(l > 0) || !(maxDist >= 0) || !double.IsFinite(ox + oy + oz)) return null;
            dx /= l; dy /= l; dz /= l;
            double best = maxDist; Rec hit = null;
            int s = ++stamp;
            void Test(Rec b)
            {
                if (b.Mark == s) return;
                b.Mark = s;
                if (!b.On || (filter != null && !filter(b.View))) return;
                double t = Enter(b, ox, oy, oz, dx, dy, dz);
                if (t >= 0 && (t < best || (t == best && (hit == null || b.Id < hit.Id)))) { best = t; hit = b; }
            }
            for (int j = 0; j < big.Count; j++) Test(big[j]);
            double span = (Math.Abs(dx) + Math.Abs(dz)) * maxDist * inv + 2;
            if (!(span <= grid.Count + 8)) { foreach (var b in recs) Test(b); }
            else
            {
                int i = (int)Math.Floor(ox * inv), k = (int)Math.Floor(oz * inv);
                int si = Math.Sign(dx), sk = Math.Sign(dz);
                double di = dx != 0 ? cell / Math.Abs(dx) : double.PositiveInfinity;
                double dk = dz != 0 ? cell / Math.Abs(dz) : double.PositiveInfinity;
                double ti = dx > 0 ? ((i + 1) * cell - ox) / dx : dx < 0 ? (i * cell - ox) / dx : double.PositiveInfinity;
                double tk = dz > 0 ? ((k + 1) * cell - oz) / dz : dz < 0 ? (k * cell - oz) / dz : double.PositiveInfinity;
                for (double guard = 2 * span + 8; guard > 0; guard--)
                {
                    if (grid.TryGetValue(Key(i, k), out var a)) for (int j = 0; j < a.Count; j++) Test(a[j]);
                    double outp = Math.Min(ti, tk);
                    if (best <= outp || outp > maxDist) break;
                    if (ti < tk) { i += si; ti += di; } else { k += sk; tk += dk; }
                }
            }
            return hit != null ? new RayHit { Dist = best, Box = hit.View } : null;
        }

        // ---------------------------------------------------------------- helpers
        /// <summary>acBox from collide.js: a box from runway bounds (along a0…a1, across c0…c1).</summary>
        public static BoxInput AcBox(double a0, double a1, double c0, double c1, double y0 = 0, double? y1 = null, string tag = null)
        {
            return new BoxInput(Math.Min(c0, c1), Math.Max(c0, c1), -Math.Max(a0, a1), -Math.Min(a0, a1), y0, y1 ?? double.PositiveInfinity, tag);
        }

        /// <summary>placeBox from collide.js: a piece's local box placed at frame (x, z) with rot degrees.</summary>
        public static BoxInput PlaceBox(BoxInput local, double x, double z, double rot = 0)
        {
            double th = -(rot + 90) * Math.PI / 180;
            double Snap(double v) { return Math.Abs(v - Math.Round(v)) < 1e-12 ? Math.Round(v) : v; }
            double c = Snap(Math.Cos(th)), s = Snap(Math.Sin(th));
            double x0 = double.PositiveInfinity, x1 = double.NegativeInfinity, z0 = double.PositiveInfinity, z1 = double.NegativeInfinity;
            foreach (double lx in new[] { local.X0, local.X1 }) foreach (double lz in new[] { local.Z0, local.Z1 })
            {
                double wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;
                x0 = Math.Min(x0, wx); x1 = Math.Max(x1, wx); z0 = Math.Min(z0, wz); z1 = Math.Max(z1, wz);
            }
            return new BoxInput(x0, x1, z0, z1, local.Y0 ?? 0, local.Y1 ?? double.PositiveInfinity, local.Tag);
        }
    }
}
