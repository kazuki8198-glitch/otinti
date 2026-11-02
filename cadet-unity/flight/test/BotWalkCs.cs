// BotWalkCs — Stage 9 harness: replays golden-walk.json through the C# ports
// (CadetCollide / CadetWalker / CadetDoors / CadetInteract / CadetNpcWalk).
//   dotnet-style build via tools/build-csharp.sh; args: <golden.json> <dataDir>
// Checks: box/door reconstruction counts, the three drive traces step by step,
// BFS visited counts + room verdicts, door-graph reachability, NPC routes.
using System;
using System.Collections.Generic;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotWalkCs
{
    static int failures = 0;
    static void Check(bool ok, string what) { Console.WriteLine((ok ? "ok   " : "FAIL ") + what); if (!ok) failures++; }
    static double Num(object o) { return o == null ? 0 : Convert.ToDouble(o); }

    static string DataDir;
    static Dict LoadJson(string name) { return (Dict)MiniJson.Parse(File.ReadAllText(Path.Combine(DataDir, name))); }

    static double G, FY;
    static (double X, double Y, double Z) RwyToLocal(double a, double c, double y)
    {
        double lx = c, lz = -a, cy = Math.Cos(FY), sy = Math.Sin(FY);
        return (lx * cy + lz * sy, G + y, -lx * sy + lz * cy);
    }

    static CollisionWorld world;
    static CadetWalker walker;
    static CadetInteract interactor;
    static readonly Dictionary<string, Door> doorByTarget = new Dictionary<string, Door>();
    static Dictionary<string, CadetDoors> sysByBuilding;
    static List<CadetDoors> sysUpdateOrder;   // dorm, academy, tower (as the golden)

    static HashSet<string> prompted = new HashSet<string>();
    static double mainDoorMaxOpen = 0;
    static List<double[]> trace;
    static bool recording = false;
    const double DT = 1.0 / 60;

    static void Step()
    {
        walker.Update(DT, (0.0, 0.0));
        var fp = walker.FramePos;
        foreach (var s in sysUpdateOrder) s.Update(DT, (fp.X, fp.Z));
        interactor.Update();
        var cur = interactor.Current;
        if (cur != null && cur.Id.StartsWith("door:")) prompted.Add(cur.Id.Substring(5));
        var main = sysByBuilding["dorm"].Find("x-dorm-main");
        if (main != null && main.Open > mainDoorMaxOpen) mainDoorMaxOpen = main.Open;
        if (recording) { var f = walker.FramePos; trace.Add(new[] { f.A, f.C, f.Y }); }
    }

    static bool DriveTo(double a1, double c1, string label, double maxT = 90)
    {
        double t = 0, lastD = double.PositiveInfinity, still = 0;
        while (t < maxT)
        {
            var fp = walker.FramePos;
            double d = Math.Sqrt(Math.Pow(a1 - fp.A, 2) + Math.Pow(c1 - fp.C, 2));
            if (d < 0.3) return true;
            var (wx, _, wz) = RwyToLocal(a1, c1, 0);
            walker.St.Yaw = Math.Atan2(-(wx - walker.St.X), -(wz - walker.St.Z));
            walker.St.Pitch = -0.1;
            walker.SetAuto(new AutoInput { Forward = Math.Min(1, 0.25 + d / 0.8) });
            Step();
            t += DT;
            var cur = interactor.Current;
            if (cur != null && doorByTarget.TryGetValue(cur.Id, out var door))
            {
                if (Math.Abs(door.Target) < 0.01 && door.Kind != "locked" && door.Kind != "sliding_auto")
                {
                    interactor.Use();
                    for (int k = 0; k < 50; k++) { walker.SetAuto(new AutoInput { Forward = 0 }); Step(); t += DT; }
                }
            }
            if (d > lastD - 1e-4) still += DT; else still = 0;
            lastD = d;
            if (still > 4) { Console.WriteLine($"STUCK leg \"{label}\" at a={fp.A:F2} c={fp.C:F2}"); return false; }
        }
        Console.WriteLine($"TIMEOUT leg \"{label}\"");
        return false;
    }

    static void PoseAt(double a, double c, double faceA, double faceC)
    {
        var (x, _, z) = RwyToLocal(a, c, 0);
        walker.SetPose(x, z, 0, 0);
        var (lx, ly, lz) = RwyToLocal(faceA, faceC, 1.5);
        walker.LookAt(lx, ly, lz);
    }

    static int Main(string[] args)
    {
        string goldenPath = args[0];
        DataDir = args[1];
        var golden = (Dict)MiniJson.Parse(File.ReadAllText(goldenPath));
        var layout = (Dict)golden["layout"];
        G = Num(layout["G"]); FY = Num(layout["frameYaw"]);

        // ---- specs (for door ownership, rooms, graph, npc)
        var specByBuilding = new Dictionary<string, Dict>
        {
            ["academy"] = LoadJson("academy-spec.json"),
            ["dorm"] = LoadJson("dorm-spec.json"),
            ["tower"] = LoadJson("tower-spec.json"),
        };
        var doorBuilding = new Dictionary<string, string>();
        foreach (var kv in specByBuilding)
            foreach (var dv in (Lst)kv.Value["doors"]) { var dd = (Dict)dv; doorBuilding[(string)dd["id"]] = kv.Key; }

        // ---- golden doors by id
        var gDoors = new Dictionary<string, Dict>();
        foreach (var dv in (Lst)golden["doors"]) { var dd = (Dict)dv; gDoors[(string)dd["id"]] = dd; }

        // ---- rebuild the world in the original box order
        world = new CollisionWorld();
        var systems = new Dictionary<string, CadetDoors>();
        foreach (var b in new[] { "academy", "dorm", "tower" }) systems[b] = new CadetDoors(world);
        sysByBuilding = systems;
        var addedDoors = new HashSet<string>();
        var doorBoxCounts = new Dictionary<string, int>();
        int staticCount = 0;
        foreach (var bv in (Lst)golden["boxes"])
        {
            var b = (Dict)bv;
            string tag = b["tag"] as string;
            var input = new BoxInput(Num(b["x0"]), Num(b["x1"]), Num(b["z0"]), Num(b["z1"]),
                Num(b["y0"]), b["y1"] == null ? double.PositiveInfinity : Num(b["y1"]), tag);
            if (tag != null && tag.StartsWith("door:"))
            {
                string did = tag.Substring(5);
                doorBoxCounts[did] = doorBoxCounts.TryGetValue(did, out var n0) ? n0 + 1 : 1;
                if (addedDoors.Add(did))
                {
                    var gd = gDoors[did];
                    var spec = new DoorSpec
                    {
                        Id = did, Kind = (string)gd["kind"], Wall = ((string)gd["wall"])[0],
                        At = Num(gd["at"]), From = Num(gd["from"]), To = Num(gd["to"]), Y = Num(gd["y"]),
                    };
                    if (gd.TryGetValue("rooms", out var rm) && rm is Lst rl) spec.Rooms = rl.ConvertAll(x => (string)x).ToArray();
                    systems[doorBuilding[did]].Add(spec, Num(gd["wallT"]), Num(gd["slideOffset"]));
                }
            }
            else { world.Add(input); staticCount++; }
        }
        int doorBoxesTotal = 0; foreach (var kv in doorBoxCounts) doorBoxesTotal += kv.Value;
        Check(staticCount + doorBoxesTotal == ((Lst)golden["boxes"]).Count, $"box reconstruction: {staticCount} static + {doorBoxesTotal} door = {((Lst)golden["boxes"]).Count}");
        // per-door: the ENABLED leaf boxes' geometry must equal the golden's
        // (the disabled SEG duplicates are an internal representation detail)
        var goldenDoorBoxes = new Dictionary<string, List<string>>();
        foreach (var bv in (Lst)golden["boxes"])
        {
            var b = (Dict)bv; string tag = b["tag"] as string;
            if (tag == null || !tag.StartsWith("door:")) continue;
            string geom = $"{Num(b["x0"]):R}|{Num(b["x1"]):R}|{Num(b["y0"]):R}|{(b["y1"] == null ? "inf" : Num(b["y1"]).ToString("R"))}|{Num(b["z0"]):R}|{Num(b["z1"]):R}";
            if (!goldenDoorBoxes.TryGetValue(tag, out var l)) { l = new List<string>(); goldenDoorBoxes[tag] = l; }
            l.Add(geom);
        }
        var myDoorBoxes = new Dictionary<string, List<string>>();
        foreach (var v in world.Query(-1e5, -1e5, 1e5, 1e5))
        {
            if (v.Tag == null || !v.Tag.StartsWith("door:")) continue;
            string geom = $"{v.X0:R}|{v.X1:R}|{v.Y0:R}|{(double.IsFinite(v.Y1) ? v.Y1.ToString("R") : "inf")}|{v.Z0:R}|{v.Z1:R}";
            if (!myDoorBoxes.TryGetValue(v.Tag, out var l)) { l = new List<string>(); myDoorBoxes[v.Tag] = l; }
            l.Add(geom);
        }
        foreach (var kv in goldenDoorBoxes)
        {
            bool ok = myDoorBoxes.TryGetValue(kv.Key, out var mine) && mine.Count == kv.Value.Count;
            if (ok) { var a = new List<string>(kv.Value); var b2 = new List<string>(mine); a.Sort(); b2.Sort(); for (int i = 0; i < a.Count; i++) if (a[i] != b2[i]) { ok = false; break; } }
            Check(ok, $"door {kv.Key.Substring(5)}: leaf geometry matches ({kv.Value.Count} boxes)");
        }

        // ---- walker + interactor (targets in dorm, academy, tower order)
        walker = new CadetWalker(world, G, FY, null, new WalkerSettings { HeadBob = false, Fov = 75, Sensitivity = 1, InvertY = false });
        interactor = new CadetInteract(walker, world, G, FY);
        sysUpdateOrder = new List<CadetDoors> { systems["dorm"], systems["academy"], systems["tower"] };
        foreach (var sys in sysUpdateOrder)
            foreach (var t in sys.Targets())
            {
                var door = t.Door; var s = sys;
                var it = new InteractTarget
                {
                    Id = t.Id, Frame = t.Frame, Radius = t.Radius,
                    PromptFn = () => door.Kind == "locked" ? "扉を開ける" : Math.Abs(door.Target) > 0.01 ? "扉を閉める" : "扉を開ける",
                    Use = _ => { var fp = walker.FramePos; return s.Toggle(door, (fp.X, fp.Z)); },
                };
                interactor.Add(it);
                doorByTarget[t.Id] = door;
            }

        // ---- traces
        var traces = (Dict)golden["traces"];
        var dspec = specByBuilding["dorm"];
        var dstart = (Dict)dspec["start"]; var dface = (Dict)dstart["face"];
        ReplayTrace(traces, "dormExit", () =>
        {
            PoseAt(Num(dstart["a"]), Num(dstart["c"]), Num(dface["a"]), Num(dface["c"]));
            var legs = new[]
            {
                (624.4, 376.2), (623.0, 377.4), (643.0, 378.2), (643.0, 375.0), (643.2, 369.2), (643.2, 363.0),
                (643.2, 340.0), (650.0, 300.0), (655.0, 276.5),
                (650.0, 300.0), (643.2, 340.0), (643.2, 363.0), (643.2, 370.0), (643.0, 375.0), (643.0, 378.2),
                (623.0, 377.4), (623.0, 376.2), (624.4, 376.2), (Num(dstart["a"]), Num(dstart["c"])),
            };
            foreach (var (a, c) in legs) if (!DriveTo(a, c, $"dorm-exit {a},{c}")) return false;
            return true;
        }, checkPrompts: true);

        var aspec = specByBuilding["academy"];
        var astart = (Dict)aspec["start"]; var ayaw = (Dict)astart["yawToward"];
        ReplayTrace(traces, "academyRoute", () =>
        {
            PoseAt(Num(astart["a"]), Num(astart["c"]), Num(ayaw["a"]), Num(ayaw["c"]));
            foreach (var pv in (Lst)aspec["route"]) { var p = (Dict)pv; if (!DriveTo(Num(p["a"]), Num(p["c"]), "academy-route")) return false; }
            var tgt = (Dict)aspec["target"];
            return DriveTo(Num(tgt["a"]), Num(tgt["c"]), "academy target");
        });

        ReplayTrace(traces, "hangars", () =>
        {
            PoseAt(495, 232, 495, 260);
            bool ok = DriveTo(495, 261.5, "hangar-1 centre") && DriveTo(495, 232, "hangar-1 out");
            ok = DriveTo(563, 232, "to hangar-2") && DriveTo(563, 261.5, "hangar-2 centre") && ok;
            return ok;
        });

        // ---- BFS (doors held open, as the golden)
        foreach (var sys in sysUpdateOrder)
        {
            sys.OpenAll();
            foreach (var d in sys.Doors) if (d.Kind == "sliding_auto") { d.Open = 1; d.OpenTarget = 1; }
            sys.Update(0, null);
        }
        var bfsGolden = (Dict)golden["bfs"];
        BfsCheck(bfsGolden, "dorm", dspec, Num(dstart["a"]), Num(dstart["c"]));
        BfsCheck(bfsGolden, "academy", aspec, Num(astart["a"]), Num(astart["c"]));
        var tspec = specByBuilding["tower"]; var thall = (Dict)tspec["hall"];
        BfsCheck(bfsGolden, "tower", tspec, Num(thall["a"]), Num(thall["c"]));

        // ---- door-graph reachability (from the specs)
        var graphGolden = (Dict)golden["graph"];
        GraphCheck(graphGolden, "dorm", dspec, "dorm-room");
        GraphCheck(graphGolden, "academy", aspec, "brief-1");
        GraphCheck(graphGolden, "tower", tspec, "tower-hall");

        // ---- NPC routes
        var npcSpecs = new List<NpcSpec> { NpcSpec.FromJson(aspec), NpcSpec.FromJson(dspec), NpcSpec.FromJson(tspec) };
        var hub = new NpcPoint(648, 322);
        int ri = 0;
        foreach (var rv in (Lst)golden["npcRoutes"])
        {
            var r = (Dict)rv; var from = (Dict)r["from"]; var to = (Dict)r["to"];
            var pts = CadetNpcWalk.PlanRoute(npcSpecs, new NpcPoint(Num(from["a"]), Num(from["c"])), new NpcPoint(Num(to["a"]), Num(to["c"])), hub);
            if (r["points"] == null) { Check(pts == null, $"npc route {ri}: null as golden"); }
            else
            {
                var gp = (Lst)r["points"];
                bool ok = pts != null && pts.Count == gp.Count;
                if (ok) for (int i = 0; i < gp.Count; i++)
                {
                    var p = (Dict)gp[i];
                    string gd = p.TryGetValue("door", out var dv) ? dv as string : null;
                    if (Math.Abs(pts[i].A - Num(p["a"])) > 1e-9 || Math.Abs(pts[i].C - Num(p["c"])) > 1e-9 || pts[i].Door != gd) { ok = false; break; }
                }
                Check(ok, $"npc route {ri}: {(pts == null ? 0 : pts.Count)} points match");
            }
            ri++;
        }

        Console.WriteLine(failures == 0 ? "WALK HARNESS: ALL PASS" : $"WALK HARNESS: {failures} FAILURES");
        return failures == 0 ? 0 : 1;
    }

    static void ReplayTrace(Dict traces, string name, Func<bool> drive, bool checkPrompts = false)
    {
        var g = (Dict)traces[name];
        var gSteps = (Lst)g["steps"];
        prompted = new HashSet<string>(); mainDoorMaxOpen = 0;
        trace = new List<double[]>(); recording = true;
        bool ok = drive();
        recording = false;
        Check(ok == (bool)g["ok"], $"{name}: drive ok flag ({ok})");
        Check(trace.Count == gSteps.Count, $"{name}: step count {trace.Count} == {gSteps.Count}");
        double maxDev = 0; int firstBad = -1;
        int n = Math.Min(trace.Count, gSteps.Count);
        for (int i = 0; i < n; i++)
        {
            var gs = (Lst)gSteps[i];
            double dev = Math.Max(Math.Abs(trace[i][0] - Num(gs[0])), Math.Max(Math.Abs(trace[i][1] - Num(gs[1])), Math.Abs(trace[i][2] - Num(gs[2]))));
            if (dev > maxDev) maxDev = dev;
            if (dev > 1e-4 && firstBad < 0) firstBad = i;
        }
        Check(firstBad < 0, $"{name}: trace max deviation {maxDev:E2} (first >1e-4 at {firstBad})");
        if (checkPrompts)
        {
            var gp = new HashSet<string>(); foreach (var p in (Lst)g["prompted"]) gp.Add((string)p);
            Check(gp.SetEquals(prompted), $"{name}: prompted doors match ({prompted.Count})");
            Check(Math.Abs(mainDoorMaxOpen - Num(g["mainDoorMaxOpen"])) < 1e-9, $"{name}: sliding door max open {mainDoorMaxOpen:F3}");
        }
    }

    static void BfsCheck(Dict bfsGolden, string name, Dict spec, double startA, double startC)
    {
        var g = (Dict)bfsGolden[name];
        var rooms = new List<Dict>();
        foreach (var rv in (Lst)spec["rooms"]) rooms.Add((Dict)rv);
        var bbox = name == "dorm" ? (614.0, 670.0, 362.0, 394.0) : name == "academy" ? (604.0, 706.0, 244.0, 282.0) : (706.0, 738.0, 246.0, 278.0);
        const double CELL = 0.4;
        string Key(double x, double z, double y) { return $"{Math.Floor(x / CELL + 0.5)},{Math.Floor(z / CELL + 0.5)},{Math.Floor(y * 4 + 0.5)}"; }   // JS Math.round semantics
        double sx = startC, sz = -startA;
        double sy = world.GroundAt(sx, sz, 0, CadetWalker.BODY.Radius, CadetWalker.BODY.Step);
        var seen = new HashSet<string> { Key(sx, sz, sy) };
        var q = new Queue<(double X, double Z, double Y)>();
        q.Enqueue((sx, sz, sy));
        var visited = new List<(double X, double Z, double Y)>();
        var dirs = new[] { (CELL, 0.0), (-CELL, 0.0), (0.0, CELL), (0.0, -CELL) };
        while (q.Count > 0)
        {
            var p = q.Dequeue();
            visited.Add(p);
            foreach (var (dx, dz) in dirs)
            {
                var r = world.Move(p.X, p.Y, p.Z, dx, dz, CadetWalker.BODY.Radius, CadetWalker.BODY.Height, CadetWalker.BODY.Step);
                double moved = Math.Sqrt(Math.Pow(r.X - p.X, 2) + Math.Pow(r.Z - p.Z, 2));
                if (moved < CELL * 0.75) continue;
                if (-r.Z < bbox.Item1 || -r.Z > bbox.Item2 || r.X < bbox.Item3 || r.X > bbox.Item4) continue;
                double ny = world.GroundAt(r.X, r.Z, p.Y, CadetWalker.BODY.Radius, CadetWalker.BODY.Step);
                if (ny - p.Y > CadetWalker.BODY.Step + 1e-9) continue;
                string kk = Key(r.X, r.Z, ny);
                if (!seen.Add(kk)) continue;
                q.Enqueue((r.X, r.Z, ny));
            }
        }
        Check(visited.Count == (int)Num(g["visited"]), $"bfs {name}: visited {visited.Count} == {(int)Num(g["visited"])}");
        var gv = (Dict)g["verdicts"];
        foreach (var room in rooms)
        {
            string id = (string)room["id"];
            double fy = room.TryGetValue("floorY", out var fyv) && fyv != null ? Num(fyv) : 0;
            var rects = new List<double[]>();
            if (room.TryGetValue("floorRects", out var fr) && fr is Lst frl)
                foreach (var x in frl) { var rr = (Lst)x; rects.Add(new[] { Num(rr[0]), Num(rr[1]), Num(rr[2]), Num(rr[3]) }); }
            else rects.Add(new[] { Num(room["a0"]), Num(room["a1"]), Num(room["c0"]), Num(room["c1"]) });
            bool reach = false;
            foreach (var p in visited)
            {
                if (Math.Abs(p.Y - fy) > 1.6) continue;
                foreach (var rr in rects) if (-p.Z >= rr[0] && -p.Z <= rr[1] && p.X >= rr[2] && p.X <= rr[3]) { reach = true; break; }
                if (reach) break;
            }
            Check(reach == (bool)gv[id], $"bfs {name}: room {id} reachable={reach}");
        }
    }

    static void GraphCheck(Dict graphGolden, string name, Dict spec, string startRoom)
    {
        var adj = new Dictionary<string, HashSet<string>>();
        void Link(string x, string y) { if (!adj.TryGetValue(x, out var s)) { s = new HashSet<string>(); adj[x] = s; } s.Add(y); }
        foreach (var dv in (Lst)spec["doors"])
        {
            var d = (Dict)dv;
            if ((string)d["kind"] == "locked") continue;
            var rooms = (Lst)d["rooms"];
            if (rooms.Count >= 2) { Link((string)rooms[0], (string)rooms[1]); Link((string)rooms[1], (string)rooms[0]); }
        }
        var seen = new HashSet<string> { startRoom };
        var q = new Queue<string>(); q.Enqueue(startRoom);
        while (q.Count > 0) { var r = q.Dequeue(); if (adj.TryGetValue(r, out var ns)) foreach (var n in ns) if (seen.Add(n)) q.Enqueue(n); }
        var mine = new List<string>();
        foreach (var rv in (Lst)spec["rooms"]) { var id = (string)((Dict)rv)["id"]; if (seen.Contains(id)) mine.Add(id); }
        mine.Sort();
        var gp = new List<string>(); foreach (var x in (Lst)graphGolden[name]) gp.Add((string)x);
        Check(mine.Count == gp.Count && new HashSet<string>(mine).SetEquals(gp), $"graph {name}: {mine.Count} rooms reachable");
    }
}
