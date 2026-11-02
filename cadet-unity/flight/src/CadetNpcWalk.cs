// CadetNpcWalk — a verbatim C# port of cadet/src/npc/walker-npc.js (Stage 9).
// How a person gets from one place to another on foot: the route is planned
// over the buildings' door graphs, across several specs at once with
// 'outside' as the room they share; WalkPath steps a position along the
// points at a natural speed, turning smoothly.
using System;
using System.Collections.Generic;
using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public class NpcRoom { public string Id; public double A0, A1, C0, C1; }
    public class NpcDoor
    {
        public string Id, Kind; public char Wall; public double At, From, To;
        public List<string> Rooms = new List<string>();
    }
    public class NpcSpec
    {
        public List<NpcRoom> Rooms = new List<NpcRoom>();
        public List<NpcDoor> Doors = new List<NpcDoor>();
        public static NpcSpec FromJson(Dict d)
        {
            var s = new NpcSpec();
            if (d.TryGetValue("rooms", out var rv) && rv is Lst rl)
                foreach (var x in rl) if (x is Dict rd) s.Rooms.Add(new NpcRoom
                {
                    Id = (string)rd["id"], A0 = MiniJson.Num(rd, "a0"), A1 = MiniJson.Num(rd, "a1"),
                    C0 = MiniJson.Num(rd, "c0"), C1 = MiniJson.Num(rd, "c1"),
                });
            if (d.TryGetValue("doors", out var dv) && dv is Lst dl)
                foreach (var x in dl) if (x is Dict dd)
                {
                    var door = new NpcDoor
                    {
                        Id = (string)dd["id"], Kind = (string)dd["kind"], Wall = ((string)dd["wall"])[0],
                        At = MiniJson.Num(dd, "at"), From = MiniJson.Num(dd, "from"), To = MiniJson.Num(dd, "to"),
                    };
                    if (dd.TryGetValue("rooms", out var rm) && rm is Lst rml) foreach (var r in rml) door.Rooms.Add((string)r);
                    s.Doors.Add(door);
                }
            return s;
        }
    }
    public struct NpcPoint { public double A, C; public string Door; public NpcPoint(double a, double c, string door = null) { A = a; C = c; Door = door; } }

    public static class CadetNpcWalk
    {
        public const double WALK_SPEED = 1.2;

        public static NpcPoint DoorMid(NpcDoor d)
        {
            return d.Wall == 'a' ? new NpcPoint(d.At, (d.From + d.To) / 2) : new NpcPoint((d.From + d.To) / 2, d.At);
        }

        public static string RoomOf(List<NpcSpec> specs, double a, double c)
        {
            foreach (var s in specs) foreach (var r in s.Rooms)
                if (a >= r.A0 && a <= r.A1 && c >= r.C0 && c <= r.C1) return r.Id;
            return "outside";
        }

        public static List<NpcDoor> AllDoors(List<NpcSpec> specs)
        {
            var outp = new List<NpcDoor>();
            foreach (var s in specs) foreach (var d in s.Doors) if (d.Kind != "locked") outp.Add(d);
            return outp;
        }

        class Best { public double Cost; public string Prev; public NpcDoor Door; public NpcPoint? At; }

        static (List<string> Rooms, List<NpcDoor> Doors) Route(List<NpcSpec> specs, string from, string to, NpcPoint? fromPt = null, NpcPoint? toPt = null)
        {
            if (from == to) return (new List<string> { from }, new List<NpcDoor>());
            var doors = AllDoors(specs);
            var best = new Dictionary<string, Best> { [from] = new Best { Cost = 0, Prev = null, Door = null, At = fromPt } };
            var open = new List<string> { from };
            while (open.Count > 0)
            {
                string r = null;
                foreach (var x in open) if (r == null || best[x].Cost < best[r].Cost) r = x;
                open.Remove(r);
                if (r == to) break;
                var st = best[r];
                foreach (var d in doors)
                {
                    if (!d.Rooms.Contains(r)) continue;
                    string o = d.Rooms[0] == r ? d.Rooms[1] : d.Rooms[0];
                    var m = DoorMid(d);
                    double cost = st.Cost + 1 + (st.At.HasValue ? Math.Sqrt(Math.Pow(m.A - st.At.Value.A, 2) + Math.Pow(m.C - st.At.Value.C, 2)) / 40 : 0);
                    if (!best.TryGetValue(o, out var bo) || cost < bo.Cost)
                    {
                        best[o] = new Best { Cost = cost, Prev = r, Door = d, At = m };
                        if (!open.Contains(o)) open.Add(o);
                    }
                }
            }
            if (!best.ContainsKey(to)) return (null, null);
            var rooms = new List<string>(); var ds = new List<NpcDoor>();
            for (string r = to; r != null; r = best[r].Prev) { rooms.Insert(0, r); if (best[r].Door != null) ds.Insert(0, best[r].Door); }
            return (rooms, ds);
        }

        public static List<string> RoomPath(List<NpcSpec> specs, string from, string to)
        {
            var r = Route(specs, from, to);
            return r.Rooms;
        }

        public static List<NpcPoint> PlanRoute(List<NpcSpec> specs, NpcPoint from, NpcPoint to, NpcPoint? hub = null)
        {
            string fr = RoomOf(specs, from.A, from.C), tr = RoomOf(specs, to.A, to.C);
            if (fr == tr) return new List<NpcPoint> { to };
            var r = Route(specs, fr, tr, from, to);
            if (r.Rooms == null) return null;
            var pts = new List<NpcPoint>();
            NpcPoint? lastDoor = null;
            for (int i = 0; i < r.Doors.Count; i++)
            {
                var d = r.Doors[i]; var m = DoorMid(d);
                if (hub.HasValue && lastDoor.HasValue && r.Rooms[i] == "outside"
                    && Math.Sqrt(Math.Pow(m.A - lastDoor.Value.A, 2) + Math.Pow(m.C - lastDoor.Value.C, 2)) > 30)
                    pts.Add(hub.Value);
                pts.Add(new NpcPoint(m.A, m.C, d.Id));
                lastDoor = m;
            }
            pts.Add(to);
            return pts;
        }
    }

    public class WalkPath
    {
        readonly List<NpcPoint> pts;
        int i = 0;
        public NpcPoint Pos;
        public double Yaw, Top, Speed, Dist;
        public bool Done;
        public WalkPath(List<NpcPoint> points, double speed = CadetNpcWalk.WALK_SPEED, NpcPoint? from = null, double yaw = 0)
        {
            pts = new List<NpcPoint>(points);
            Pos = from ?? (points.Count > 0 ? points[0] : new NpcPoint(0, 0));
            Yaw = yaw; Top = speed; Speed = 0; Done = points.Count == 0; Dist = 0;
        }
        public NpcPoint? Target { get { return i < pts.Count ? pts[i] : (NpcPoint?)null; } }
        public double Left()
        {
            double d = 0; var p = Pos;
            for (int j = i; j < pts.Count; j++) { d += Math.Sqrt(Math.Pow(pts[j].A - p.A, 2) + Math.Pow(pts[j].C - p.C, 2)); p = pts[j]; }
            return d;
        }
        public (bool Done, bool Moving, double Speed) Update(double dt)
        {
            if (Done) { Speed = 0; return (true, false, 0); }
            var t = Target;
            while (t.HasValue && Math.Sqrt(Math.Pow(t.Value.A - Pos.A, 2) + Math.Pow(t.Value.C - Pos.C, 2)) < 0.12 && i < pts.Count - 1) { i++; t = Target; }
            if (!t.HasValue) { Done = true; Speed = 0; return (true, false, 0); }
            double da = t.Value.A - Pos.A, dc = t.Value.C - Pos.C, d = Math.Sqrt(da * da + dc * dc);
            bool last = i == pts.Count - 1;
            if (last && d < 0.06) { Pos = t.Value; Done = true; Speed = 0; return (true, false, 0); }
            double wantYaw = Math.Atan2(t.Value.C - Pos.C, Pos.A - t.Value.A);
            double dy = wantYaw - Yaw;
            while (dy > Math.PI) dy -= 2 * Math.PI;
            while (dy < -Math.PI) dy += 2 * Math.PI;
            double turn = 3.6 * dt;
            Yaw += Math.Max(-turn, Math.Min(turn, dy));
            double align = Math.Max(0.25, Math.Cos(dy));
            double ease = Math.Min(1, Math.Min(Left() / 0.9 + 0.15, Dist / 0.7 + 0.2));
            double goal = Top * align * ease;
            Speed += Math.Max(-3.2 * dt, Math.Min(2.2 * dt, goal - Speed));
            double step = Math.Min(Speed * dt, d);
            if (d > 1e-9) { Pos = new NpcPoint(Pos.A + da / d * step, Pos.C + dc / d * step); Dist += step; }
            if (!last && d - step < 0.12) i++;
            else if (last && d - step < 0.06) Done = true;
            return (Done, Speed > 0.03, Speed);
        }
    }
}
