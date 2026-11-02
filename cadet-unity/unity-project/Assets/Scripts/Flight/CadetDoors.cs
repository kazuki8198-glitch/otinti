// CadetDoors — a verbatim C# port of the LOGIC of cadet/src/world/doors.js
// (Stage 9; meshes and sound are the Unity layer's, sound events are raised
// with the original's names for Stage 10's sfx wiring).
//  swing / double_swing : opened and closed with E; they swing away from the player
//  sliding_auto         : glass leaves that slide apart when someone comes near
//  locked               : stays shut
// A door from the spec: { id, kind, wall: 'a' | 'c', at, from, to, label_ja }.
// Its collider is the closed leaf; an open swing door blocks where its leaf
// stands (open at 90° it is axis-aligned); a moving leaf does not block.
using System;
using System.Collections.Generic;

namespace Cadet
{
    public class DoorSpec
    {
        public string Id, Kind, LabelJa;
        public char Wall;            // 'a' | 'c'
        public double At, From, To, Y;
        public string[] Rooms;
    }
    public class DoorLeaf { public double Base, Flip, W; }
    public class Door
    {
        public DoorSpec Spec;
        public double W, Angle, Target, Open, OpenTarget, WallT, SlideOffset;
        public bool Hold;
        public List<int> Colliders = new List<int>();
        public List<DoorLeaf> Leaves = new List<DoorLeaf>();
        public string Id { get { return Spec.Id; } }
        public string Kind { get { return Spec.Kind; } }
    }
    public class DoorTarget
    {
        public string Id; public double[] Frame; public double Radius; public Door Door;
        public string PromptJa;
    }

    public class CadetDoors
    {
        public const double H = 2.15, T = 0.045;
        const int SEG = 3;

        readonly CollisionWorld world;
        readonly double wallT, bodyRadius;
        public readonly List<Door> Doors = new List<Door>();
        public Action<string> OnSound;   // 'locked' | 'swing_open' | 'swing_close' | 'slide_open' | 'slide_close'

        public CadetDoors(CollisionWorld world, double wallT = 0.12, double bodyRadius = 0.28)
        {
            this.world = world; this.wallT = wallT; this.bodyRadius = bodyRadius;
        }

        // door-local (lx along the opening from its start, lz normal) → frame
        static (double, double, double) ToFrame(Door d, double lx, double ly, double lz)
        {
            return d.Spec.Wall == 'a' ? (d.Spec.From + lx, ly, -d.Spec.At + lz) : (d.Spec.At + lz, ly, -d.Spec.From - lx);
        }
        static BoxInput Aabb(Door d, (double, double)[] pts)
        {
            double x0 = double.PositiveInfinity, x1 = double.NegativeInfinity, z0 = double.PositiveInfinity, z1 = double.NegativeInfinity;
            foreach (var (lx, lz) in pts)
            {
                var (x, _, z) = ToFrame(d, lx, 0, lz);
                x0 = Math.Min(x0, x); x1 = Math.Max(x1, x); z0 = Math.Min(z0, z); z1 = Math.Max(z1, z);
            }
            double y = d.Spec.Y;
            return new BoxInput(x0, x1, z0, z1, y, y + H, "door:" + d.Spec.Id);
        }

        public Door Add(DoorSpec spec, double? wallTOpt = null, double slideOffset = 0)
        {
            var d = new Door { Spec = spec, W = spec.To - spec.From, WallT = wallTOpt ?? wallT, SlideOffset = slideOffset };
            double W = d.W;
            DoorLeaf Leaf(double w, double hingeX, double flip)
            {
                var l = new DoorLeaf { W = w, Flip = flip, Base = hingeX };
                d.Leaves.Add(l); return l;
            }
            if (spec.Kind == "double_swing") { Leaf(W / 2, 0, 1); Leaf(W / 2, W, -1); }
            else if (spec.Kind == "sliding_auto") { Leaf(W / 2 + 0.03, 0, 1); Leaf(W / 2 + 0.03, W, -1); }
            else Leaf(W, 0, 1);
            if (spec.Kind == "sliding_auto")
            {
                d.Colliders.Add(world.Add(Aabb(d, new[] { (0.0, slideOffset - T), (W, slideOffset + T) })));
            }
            else
            {
                foreach (var L in d.Leaves)
                {
                    var boxes = LeafBoxes(d, L, 0);
                    for (int k = 0; k < boxes.Count; k++)
                    {
                        int id = world.Add((boxes[k] ?? boxes[0]).Value);
                        world.SetEnabled(id, boxes[k] != null);
                        d.Colliders.Add(id);
                    }
                }
            }
            Doors.Add(d);
            return d;
        }

        void PlaceLeaves(Door d)
        {
            if (d.Spec.Kind == "sliding_auto")
            {
                world.SetEnabled(d.Colliders[0], d.Open < 0.65);
                return;
            }
            for (int i = 0; i < d.Leaves.Count; i++)
            {
                var boxes = LeafBoxes(d, d.Leaves[i], d.Angle);
                for (int k = 0; k < boxes.Count; k++)
                {
                    int id = d.Colliders[i * SEG + k];
                    if (boxes[k] != null) world.Update(id, boxes[k].Value);
                    world.SetEnabled(id, boxes[k] != null);
                }
            }
        }

        // the boxes around a swing leaf at an angle: one box when shut or fully
        // open, SEG boxes along it in between
        static List<BoxInput?> LeafBoxes(Door d, DoorLeaf L, double angle)
        {
            double ex = L.Flip * L.W * Math.Cos(angle), ez = -L.W * Math.Sin(angle);
            var outp = new List<BoxInput?>();
            bool square = Math.Abs(ez) < 0.02 * L.W || Math.Abs(ex) < 0.03 * L.W;
            int n = square ? 1 : SEG;
            for (int k = 0; k < SEG; k++)
            {
                if (k >= n) { outp.Add(null); continue; }
                double t0 = (double)k / n, t1 = (double)(k + 1) / n;
                double x0 = L.Base + ex * t0, x1 = L.Base + ex * t1, z0 = ez * t0, z1 = ez * t1;
                outp.Add(Aabb(d, new[] { (Math.Min(x0, x1) - T, Math.Min(z0, z1) - T), (Math.Max(x0, x1) + T, Math.Max(z0, z1) + T) }));
            }
            return outp;
        }

        static double DistTo(List<BoxInput?> boxes, (double X, double Z) p)
        {
            double m = double.PositiveInfinity;
            foreach (var b in boxes)
            {
                if (b == null) continue;
                var bb = b.Value;
                m = Math.Min(m, Math.Sqrt(Math.Pow(p.X - Math.Max(bb.X0, Math.Min(p.X, bb.X1)), 2) + Math.Pow(p.Z - Math.Max(bb.Z0, Math.Min(p.Z, bb.Z1)), 2)));
            }
            return m;
        }

        // the player's position in the door's own coordinates (frame position)
        public static (double Lx, double Lz) LocalOf(Door d, (double X, double Z) p)
        {
            double dx = p.X - (d.Spec.Wall == 'a' ? d.Spec.From : d.Spec.At);
            double dz = p.Z - (d.Spec.Wall == 'a' ? -d.Spec.At : -d.Spec.From);
            return d.Spec.Wall == 'a' ? (dx, dz) : (-dz, dx);
        }

        public string Toggle(Door d, (double X, double Z)? player, bool quiet = false)
        {
            if (d.Spec.Kind == "locked") { if (!quiet) OnSound?.Invoke("locked"); return "locked"; }
            if (d.Spec.Kind == "sliding_auto") return "auto";
            if (Math.Abs(d.Target) > 0.01) { d.Target = 0; if (!quiet) OnSound?.Invoke("swing_close"); return "closed"; }
            double lz = player.HasValue ? LocalOf(d, player.Value).Lz : 1;
            d.Target = (lz >= 0 ? 1 : -1) * 1.6;
            if (!quiet) OnSound?.Invoke("swing_open");
            return "opened";
        }

        public void Update(double dt, (double X, double Z)? player)
        {
            foreach (var d in Doors)
            {
                if (d.Spec.Kind == "sliding_auto")
                {
                    var (lx, lz) = player.HasValue ? LocalOf(d, player.Value) : (1e9, 1e9);
                    bool near = Math.Abs(lz) < 3.2 && lx > -1.6 && lx < d.W + 1.6;
                    double want = near || d.Hold ? 1 : 0;
                    if (want != d.OpenTarget)
                    {
                        d.OpenTarget = want;
                        if (Math.Abs(lz) < 9 && lx > -4 && lx < d.W + 4) OnSound?.Invoke(want == 1 ? "slide_open" : "slide_close");
                    }
                    double sp = dt / 0.9;
                    d.Open = d.Open < d.OpenTarget ? Math.Min(d.OpenTarget, d.Open + sp) : Math.Max(d.OpenTarget, d.Open - sp);
                    PlaceLeaves(d);
                    continue;
                }
                if (d.Angle != d.Target)
                {
                    double sp = dt * 2.6;
                    double next = d.Angle < d.Target ? Math.Min(d.Target, d.Angle + sp) : Math.Max(d.Target, d.Angle - sp);
                    bool blocked = false;
                    if (player.HasValue)
                    {
                        foreach (var L in d.Leaves)
                        {
                            double n = DistTo(LeafBoxes(d, L, next), player.Value);
                            if (n < bodyRadius - 1e-4 && n < DistTo(LeafBoxes(d, L, d.Angle), player.Value) - 1e-6) { blocked = true; break; }
                        }
                    }
                    if (blocked) d.Target = d.Angle;
                    else { d.Angle = next; PlaceLeaves(d); }
                }
            }
        }

        public List<DoorTarget> Targets()
        {
            var outp = new List<DoorTarget>();
            foreach (var d in Doors)
            {
                if (d.Spec.Kind == "sliding_auto") continue;
                var (x, y, z) = ToFrame(d, d.W / 2, d.Spec.Y + 1.1, 0);
                outp.Add(new DoorTarget
                {
                    Id = "door:" + d.Spec.Id, Frame = new[] { x, y, z },
                    Radius = Math.Max(0.55, d.W / 2), Door = d,
                    PromptJa = d.Spec.Kind == "locked" ? "扉を開ける" : Math.Abs(d.Target) > 0.01 ? "扉を閉める" : "扉を開ける",
                });
            }
            return outp;
        }

        public Door Find(string id) { return Doors.Find(d => d.Spec.Id == id); }

        public void OpenAll()
        {
            foreach (var d in Doors)
                if (d.Spec.Kind == "swing" || d.Spec.Kind == "double_swing") { d.Target = 1.6; d.Angle = 1.6; PlaceLeaves(d); }
        }
    }
}
