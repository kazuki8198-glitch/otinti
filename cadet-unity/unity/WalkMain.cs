// WalkMain — the walkable academy (Stage 9): interiors built from the ported
// collision data (data/interiors.json — the original builders' own boxes),
// doors that open, the ported walker/interactor in first person, examine
// cards from the specs, and the cast placed by people.js's placeOf (morning),
// one of them walking a planned route and working the doors.
// World layout mirrors the original: a frame group at (0, G, 0) rotated by
// frameYaw, children in runway-frame coords (x = across, z = −along).
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.UI;
using GLTFast;
using System.Threading.Tasks;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public class WalkMain : MonoBehaviour
{
    public CollisionWorld World;
    public CadetWalker Walker;
    public CadetInteract Interactor;
    public DialogMain Dialog;
    public Camera Cam;

    double G, FY;
    readonly Dictionary<string, CadetDoors> systems = new Dictionary<string, CadetDoors>();
    readonly List<CadetDoors> sysOrder = new List<CadetDoors>();
    readonly Dictionary<string, Door> doorByTarget = new Dictionary<string, Door>();
    Transform frameGroup;
    readonly List<(MeshRenderer Mesh, int ColliderId)> leafMeshes = new List<(MeshRenderer, int)>();
    readonly Dictionary<string, GameObject> npcFigures = new Dictionary<string, GameObject>();
    // Stage 13 (Task 5): figures assembled from the actor.glb parts kit
    // (head/torso bust — the kit has no skins or skeletal animation, in the
    // original either: actor.js poses it procedurally). The capsule
    // stand-ins remain as the fallback until the kit lands.
    class FigureRig { public Transform LegL, LegR, ArmL, ArmR; }
    readonly Dictionary<GameObject, FigureRig> rigs = new Dictionary<GameObject, FigureRig>();
    GameObject actorKit; bool actorDressed;
    double npcWalkPhase, npcSwing; Vector3 npcPrevPos; bool npcPrevSet;
    WalkPath npcPath; string npcWalkingId; GameObject npcWalkingFig;
    Dictionary<string, Door> doorById = new Dictionary<string, Door>();

    static double Num(object o) { return o == null ? 0 : System.Convert.ToDouble(o); }
    static Dict LoadData(string name)
    {
        return (Dict)MiniJson.Parse(File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "cadet-data", name)));
    }
    Material toonMat;
    Material Mat(Color c)
    {
        var m = new Material(toonMat); m.SetColor("_Color", c); return m;
    }
    static Color HexCol(string hex, Color dflt)
    {
        if (string.IsNullOrEmpty(hex)) return dflt;
        return ColorUtility.TryParseHtmlString(hex, out var c) ? c : dflt;
    }

    Color TagColor(string tag)
    {
        switch (tag)
        {
            case "academy": case "dormitory": case "tower": case "building": return new Color(0.93f, 0.91f, 0.86f);
            case "floor": return new Color(0.55f, 0.57f, 0.60f);
            case "glass": return new Color(0.65f, 0.78f, 0.86f);
            case "bed": return new Color(0.85f, 0.82f, 0.75f);
            case "desk": case "table_long": case "workbench": case "kitchen_counter": return new Color(0.62f, 0.48f, 0.33f);
            case "office_chair": case "stool": case "bench": case "sofa": return new Color(0.30f, 0.36f, 0.48f);
            case "bookshelf": case "locker_bank": case "parts_shelf": case "tool_cabinet": return new Color(0.45f, 0.38f, 0.30f);
            case "plant": return new Color(0.35f, 0.55f, 0.32f);
            case "sim_station": return new Color(0.20f, 0.23f, 0.28f);
            default: return new Color(0.78f, 0.76f, 0.72f);
        }
    }

    GameObject Box(Transform parent, double x0, double x1, double y0, double y1, double z0, double z1, Color col, string name)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = name;
        go.transform.SetParent(parent, false);
        go.transform.localPosition = new Vector3((float)((x0 + x1) / 2), (float)((y0 + y1) / 2), (float)((z0 + z1) / 2));
        go.transform.localScale = new Vector3((float)(x1 - x0), (float)(y1 - y0), (float)(z1 - z0));
        var mr = go.GetComponent<MeshRenderer>();
        mr.material = Mat(col);
        mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        mr.receiveShadows = false;
        Object.Destroy(go.GetComponent<BoxCollider>());
        return go;
    }

    public void Build()
    {
        toonMat = new Material(Shader.Find("Cadet/Toon"));
        var interiors = LoadData("interiors.json");
        var layout = (Dict)interiors["layout"];
        G = Num(layout["G"]); FY = Num(layout["frameYaw"]);

        frameGroup = new GameObject("Frame").transform;
        frameGroup.SetParent(transform, false);
        frameGroup.position = new Vector3(0, (float)G, 0);
        frameGroup.rotation = Quaternion.Euler(0, (float)(FY * 180 / System.Math.PI), 0);

        // collision world in the original box order, doors via CadetDoors
        World = new CollisionWorld();
        var specByBuilding = new Dictionary<string, Dict>();
        foreach (var b in new[] { "academy", "dorm", "tower" })
        {
            specByBuilding[b] = LoadData(b + "-spec.json");
            systems[b] = new CadetDoors(World);
        }
        sysOrder.AddRange(new[] { systems["dorm"], systems["academy"], systems["tower"] });
        var doorBuilding = new Dictionary<string, string>();
        foreach (var kv in specByBuilding) foreach (var dv in (Lst)kv.Value["doors"]) doorBuilding[(string)((Dict)dv)["id"]] = kv.Key;
        var gDoors = new Dictionary<string, Dict>();
        foreach (var dv in (Lst)interiors["doors"]) { var dd = (Dict)dv; gDoors[(string)dd["id"]] = dd; }
        var addedDoors = new HashSet<string>();
        foreach (var bv in (Lst)interiors["boxes"])
        {
            var b = (Dict)bv;
            string tag = b["tag"] as string;
            double y1 = b["y1"] == null ? double.PositiveInfinity : Num(b["y1"]);
            if (tag != null && tag.StartsWith("door:"))
            {
                string did = tag.Substring(5);
                if (addedDoors.Add(did))
                {
                    var gd = gDoors[did];
                    var spec = new DoorSpec
                    {
                        Id = did, Kind = (string)gd["kind"], Wall = ((string)gd["wall"])[0],
                        At = Num(gd["at"]), From = Num(gd["from"]), To = Num(gd["to"]), Y = Num(gd["y"]),
                    };
                    var door = systems[doorBuilding[did]].Add(spec, Num(gd["wallT"]), Num(gd["slideOffset"]));
                    doorById[did] = door;
                }
                continue;
            }
            World.Add(new BoxInput(Num(b["x0"]), Num(b["x1"]), Num(b["z0"]), Num(b["z1"]), Num(b["y0"]), y1, tag));
            // render (cap infinite heights for display)
            double ry1 = double.IsFinite(y1) ? y1 : Num(b["y0"]) + 8;
            if (ry1 - Num(b["y0"]) > 0.02 && Num(b["x1"]) - Num(b["x0"]) > 0.01 && Num(b["z1"]) - Num(b["z0"]) > 0.01)
                Box(frameGroup, Num(b["x0"]), Num(b["x1"]), Num(b["y0"]), ry1, Num(b["z0"]), Num(b["z1"]), TagColor(tag), "box-" + tag);
        }
        // door leaf meshes follow the doors' own collider boxes
        foreach (var sys in systems.Values) foreach (var door in sys.Doors)
            foreach (var cid in door.Colliders)
            {
                var go = Box(frameGroup, 0, 0.1, 0, 0.1, 0, 0.1, door.Kind == "sliding_auto" ? new Color(0.65f, 0.78f, 0.86f) : new Color(0.72f, 0.58f, 0.40f), "leaf-" + door.Id);
                leafMeshes.Add((go.GetComponent<MeshRenderer>(), cid));
            }
        // room floors
        var floorCols = new Dictionary<string, Color> { ["carpet"] = new Color(0.55f, 0.52f, 0.48f), ["tile"] = new Color(0.80f, 0.82f, 0.84f), ["vinyl"] = new Color(0.68f, 0.66f, 0.60f), ["wood"] = new Color(0.66f, 0.52f, 0.36f), ["concrete"] = new Color(0.62f, 0.63f, 0.64f) };
        var rooms = (Dict)interiors["rooms"];
        foreach (var bname in new[] { "dorm", "academy", "tower" })
            foreach (var rv in (Lst)rooms[bname])
            {
                var r = (Dict)rv;
                double fy = r["floorY"] == null ? 0 : Num(r["floorY"]);
                var col = floorCols.TryGetValue(r["floor"] as string ?? "", out var fc) ? fc : new Color(0.6f, 0.6f, 0.6f);
                var rects = new List<double[]>();
                if (r["floorRects"] is Lst fr) foreach (var x in fr) { var rr = (Lst)x; rects.Add(new[] { Num(rr[0]), Num(rr[1]), Num(rr[2]), Num(rr[3]) }); }
                else rects.Add(new[] { Num(r["a0"]), Num(r["a1"]), Num(r["c0"]), Num(r["c1"]) });
                foreach (var rc in rects)
                    Box(frameGroup, rc[2], rc[3], fy - 0.05, fy, -rc[1], -rc[0], col, "floor-" + (string)r["id"]);
            }
        // ground outside + sky light rig
        var ground = Box(transform, -3000, 3000, G - 0.1, G, -3000, 3000, new Color(0.45f, 0.55f, 0.40f), "ground");
        ground.transform.SetParent(null, false); ground.transform.position = Vector3.zero;
        ground.transform.localPosition = new Vector3(0, (float)(G - 0.05), 0); ground.transform.localScale = new Vector3(6000, 0.1f, 6000);
        var sun = new GameObject("Sun"); sun.transform.SetParent(transform, false);
        var li = sun.AddComponent<Light>(); li.type = LightType.Directional; li.intensity = 1.1f;
        sun.transform.rotation = Quaternion.Euler(48, -30, 0);
        gameObject.AddComponent<AmbientRig>();

        // walker + interactor
        Walker = new CadetWalker(World, G, FY, new UnityWalkerInput(), new WalkerSettings { HeadBob = true, Fov = 75, Sensitivity = 1 });
        Interactor = new CadetInteract(Walker, World, G, FY);
        foreach (var sys in sysOrder) foreach (var t in sys.Targets())
        {
            var door = t.Door; var s = sys;
            Interactor.Add(new InteractTarget
            {
                Id = t.Id, Frame = t.Frame, Radius = t.Radius,
                PromptFn = () => door.Kind == "locked" ? "扉を開ける" : System.Math.Abs(door.Target) > 0.01 ? "扉を閉める" : "扉を開ける",
                Use = _ => { var fp = Walker.FramePos; return s.Toggle(door, (fp.X, fp.Z)); },
            });
            doorByTarget[t.Id] = door;
        }
        // examine targets from the specs
        var inters = (Dict)interiors["interactables"];
        foreach (var bname in new[] { "dorm", "academy", "tower" })
            foreach (var iv in (Lst)inters[bname])
            {
                var it = (Dict)iv;
                string title = (string)it["title_ja"], text = (string)it["text_ja"], prompt = (string)it["prompt_ja"];
                Interactor.Add(new InteractTarget
                {
                    Id = (string)it["id"], Frame = new[] { Num(it["c"]), Num(it["y"]), -Num(it["a"]) }, Radius = 0.7,
                    PromptText = prompt,
                    Use = _ => { Interactor.ShowCard(title, text); return "card"; },
                });
            }
        // the cast (morning placements) + talk targets that open the dialog UI
        Dialog = gameObject.AddComponent<DialogMain>();
        Dialog.BuildUi(); Dialog.LoadPeople();
        var npcData = LoadData("npc-places.json");
        var places = (Dict)((Dict)npcData["places"])["morning"];
        var meta = (Dict)npcData["meta"];
        foreach (var kv in places)
        {
            var p = (Dict)kv.Value; var m = (Dict)meta[kv.Key];
            double fy = p.TryGetValue("y", out var yv) ? Num(yv) : 0;
            var fig = MakeFigure((string)m["name"], HexCol((string)m["color"], Color.gray), Num(m["height"]));
            fig.transform.SetParent(frameGroup, false);
            bool seated = p.ContainsKey("seat");
            fig.transform.localPosition = new Vector3((float)Num(p["c"]), (float)(fy + (seated ? -0.45 : 0)), (float)(-Num(p["a"])));
            npcFigures[kv.Key] = fig;
            string pid = kv.Key;
            Interactor.Add(new InteractTarget
            {
                Id = "npc:" + pid, Frame = new[] { Num(p["c"]), fy + 1.5, -Num(p["a"]) }, Radius = 0.5,
                PromptText = (string)m["title"] + "と話す",
                Use = _ => { Dialog.StartDialog(pid); return "talk"; },
            });
        }
        // one walking NPC: kiryu, dorm room → academy lobby and back, on a loop
        var specObjs = new List<NpcSpec> { NpcSpec.FromJson(specByBuilding["academy"]), NpcSpec.FromJson(specByBuilding["dorm"]), NpcSpec.FromJson(specByBuilding["tower"]) };
        npcSpecs = specObjs;
        npcRoute = CadetNpcWalk.PlanRoute(specObjs, new NpcPoint(633, 378), new NpcPoint(655, 253), new NpcPoint(648, 322));
        if (npcRoute != null && npcFigures.TryGetValue("kiryu", out var kfig))
        {
            npcWalkingId = "kiryu"; npcWalkingFig = kfig;
            npcPath = new WalkPath(npcRoute, CadetNpcWalk.WALK_SPEED, new NpcPoint(633, 378));
        }

        _ = LoadActorKit();
        // camera
        var camGo = new GameObject("WalkCamera"); camGo.transform.SetParent(transform, false);
        Cam = camGo.AddComponent<Camera>(); Cam.fieldOfView = 75; Cam.nearClipPlane = 0.05f; Cam.farClipPlane = 8000;
        Cam.backgroundColor = new Color(0.62f, 0.74f, 0.86f);
    }

    List<NpcSpec> npcSpecs; List<NpcPoint> npcRoute; bool npcReturn = false;

    GameObject MakeFigure(string name, Color col, double height)
    {
        var root = new GameObject("npc-" + name);
        float h = (float)(height > 0 ? height : 1.7);
        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.name = "body"; body.transform.SetParent(root.transform, false);
        body.transform.localPosition = new Vector3(0, h / 2, 0); body.transform.localScale = new Vector3(0.42f, h / 2, 0.42f);
        body.GetComponent<MeshRenderer>().material = Mat(col);
        Object.Destroy(body.GetComponent<Collider>());
        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = "head"; head.transform.SetParent(root.transform, false);
        head.transform.localPosition = new Vector3(0, h - 0.11f, 0); head.transform.localScale = Vector3.one * 0.23f;
        head.GetComponent<MeshRenderer>().material = Mat(new Color(0.93f, 0.80f, 0.68f));
        Object.Destroy(head.GetComponent<Collider>());
        return root;
    }

    async Task LoadActorKit()
    {
        try
        {
            actorKit = new GameObject("ActorKit");
            actorKit.transform.SetParent(transform, false);
            var gltf = new GltfImport();
            string path = System.IO.Path.Combine(Application.streamingAssetsPath, "actor.glb");
            if (!await gltf.Load(path)) { Object.Destroy(actorKit); actorKit = null; Debug.Log("ACTOR_KIT_FAIL load"); return; }
            await gltf.InstantiateMainSceneAsync(actorKit.transform);
            actorKit.SetActive(false);
            foreach (var kv in npcFigures) DressFigure(kv.Value);
            actorDressed = true;
            Debug.Log("ACTOR_KIT_DRESSED figures=" + rigs.Count);
        }
        catch (System.Exception ex) { Debug.Log("ACTOR_KIT_FAIL " + ex.Message); }
    }

    static readonly string[] ACTOR_KEEP = { "head.base.skin", "head.base.eye", "irisL.", "irisR.", "mouth.base.lip", "lids.base", "head.hair-short", "torso.base.shirt", "torso.base.button", "torso.base.pocket", "torso.nametag", "anchor.nametag" };
    void DressFigure(GameObject root)
    {
        if (actorKit == null || root == null) return;
        foreach (Transform ch in root.transform) if (ch.name == "body" || ch.name == "head") ch.gameObject.SetActive(false);
        var inst = Object.Instantiate(actorKit, root.transform, false);
        inst.name = "actor"; inst.SetActive(true);
        foreach (var t in inst.GetComponentsInChildren<Transform>(true))
        {
            if (t == inst.transform) continue;
            bool keep = false;
            foreach (var k in ACTOR_KEEP) if (t.name.StartsWith(k)) { keep = true; break; }
            if (!keep && t.parent == inst.transform) t.gameObject.SetActive(false);
        }
        var rig = new FigureRig();
        rig.LegL = MakeLimb(root, "legL", -0.09f, 0.96f, 0.13f, 0.48f, new Color(0.16f, 0.17f, 0.22f));
        rig.LegR = MakeLimb(root, "legR", 0.09f, 0.96f, 0.13f, 0.48f, new Color(0.16f, 0.17f, 0.22f));
        rig.ArmL = MakeLimb(root, "armL", -0.235f, 1.44f, 0.09f, 0.36f, new Color(0.85f, 0.87f, 0.90f));
        rig.ArmR = MakeLimb(root, "armR", 0.235f, 1.44f, 0.09f, 0.36f, new Color(0.85f, 0.87f, 0.90f));
        rigs[root] = rig;
    }
    Transform MakeLimb(GameObject root, string name, float x, float hipY, float w, float lenScale, Color col)
    {
        var pivot = new GameObject(name);
        pivot.transform.SetParent(root.transform, false);
        pivot.transform.localPosition = new Vector3(x, hipY, 0);
        var limb = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        limb.name = name + "Mesh"; limb.transform.SetParent(pivot.transform, false);
        limb.transform.localPosition = new Vector3(0, -0.47f * lenScale / 0.48f, 0);
        limb.transform.localScale = new Vector3(w, lenScale, w);
        limb.GetComponent<MeshRenderer>().material = Mat(col);
        Object.Destroy(limb.GetComponent<Collider>());
        return pivot.transform;
    }

    public (double X, double Y, double Z) RwyToLocal(double a, double c, double y)
    {
        double lx = c, lz = -a, cy = System.Math.Cos(FY), sy = System.Math.Sin(FY);
        return (lx * cy + lz * sy, G + y, -lx * sy + lz * cy);
    }
    public void PoseAt(double a, double c, double faceA, double faceC)
    {
        var (x, _, z) = RwyToLocal(a, c, 0);
        Walker.SetPose(x, z, 0, 0);
        var (lx, ly, lz) = RwyToLocal(faceA, faceC, 1.5);
        Walker.LookAt(lx, ly, lz);
    }

    public void StepFrame(double dt, (double X, double Y)? look = null)
    {
        Walker.Update(dt, look);
        var fp = Walker.FramePos;
        foreach (var s in sysOrder) s.Update(dt, (fp.X, fp.Z));
        Interactor.Update();
        // the walking NPC
        if (npcPath != null && npcWalkingFig != null)
        {
            var r = npcPath.Update(dt);
            var pos = npcPath.Pos;
            npcWalkingFig.transform.localPosition = new Vector3((float)pos.C, 0, (float)(-pos.A));
            if (rigs.TryGetValue(npcWalkingFig, out var rig))
            {
                // the original's procedural walk (actor.js): phase at
                // 6 rad/s at full speed, arms against the legs, hips bob
                // twice a cycle; the figure turns to face its heading.
                if (r.Moving) npcWalkPhase += dt * 6.0 * (r.Speed / CadetNpcWalk.WALK_SPEED);
                npcSwing += ((r.Moving ? 1.0 : 0.0) - npcSwing) * System.Math.Min(1, dt * 8);
                float sw = (float)(System.Math.Sin(npcWalkPhase) * 0.55 * npcSwing) * Mathf.Rad2Deg;
                if (rig.LegL) rig.LegL.localRotation = Quaternion.Euler(sw, 0, 0);
                if (rig.LegR) rig.LegR.localRotation = Quaternion.Euler(-sw, 0, 0);
                if (rig.ArmL) rig.ArmL.localRotation = Quaternion.Euler(-sw * 0.8f, 0, 0);
                if (rig.ArmR) rig.ArmR.localRotation = Quaternion.Euler(sw * 0.8f, 0, 0);
                var lp = npcWalkingFig.transform.localPosition;
                lp.y = (float)(System.Math.Abs(System.Math.Cos(npcWalkPhase)) * 0.03 * npcSwing);
                npcWalkingFig.transform.localPosition = lp;
                if (npcPrevSet)
                {
                    double dc = pos.C - npcPrevPos.x, dz = -pos.A - npcPrevPos.z;
                    if (dc * dc + dz * dz > 1e-6) npcWalkingFig.transform.localRotation = Quaternion.Euler(0, (float)(System.Math.Atan2(dc, dz) * 180 / System.Math.PI), 0);
                }
                npcPrevPos = new Vector3((float)pos.C, 0, (float)(-pos.A)); npcPrevSet = true;
            }
            var tgt = npcPath.Target;
            if (tgt.HasValue && tgt.Value.Door != null && doorById.TryGetValue(tgt.Value.Door, out var door))
            {
                double dd = System.Math.Sqrt(System.Math.Pow(tgt.Value.A - pos.A, 2) + System.Math.Pow(tgt.Value.C - pos.C, 2));
                if (dd < 1.1 && door.Kind != "sliding_auto" && door.Kind != "locked" && System.Math.Abs(door.Target) < 0.01)
                    systems[FindDoorBuilding(door.Id)].Toggle(door, (pos.C, -pos.A), quiet: true);
                if (door.Kind == "sliding_auto") door.Hold = dd < 2.5;
            }
            if (r.Done)
            {
                var back = new List<NpcPoint>(npcRoute); back.Reverse();
                npcPath = new WalkPath(back, CadetNpcWalk.WALK_SPEED, npcPath.Pos);
                npcReturn = !npcReturn;
            }
        }
        // door leaf meshes follow the collider views
        foreach (var (mesh, cid) in leafMeshes)
        {
            var v = World.GetView(cid);
            bool on = World.IsEnabled(cid) && v != null;
            mesh.gameObject.SetActive(on);
            if (on)
            {
                mesh.transform.localPosition = new Vector3((float)((v.X0 + v.X1) / 2), (float)((v.Y0 + v.Y1) / 2), (float)((v.Z0 + v.Z1) / 2));
                mesh.transform.localScale = new Vector3((float)(v.X1 - v.X0), (float)(v.Y1 - v.Y0), (float)(v.Z1 - v.Z0));
            }
        }
        // camera from the walker
        if (Cam != null)
        {
            Cam.transform.position = new Vector3((float)Walker.EyeX, (float)Walker.EyeY, (float)Walker.EyeZ);
            double yaw = Walker.St.Yaw, pitch = Walker.St.Pitch;
            var f = new Vector3((float)(-System.Math.Cos(pitch) * System.Math.Sin(yaw)), (float)System.Math.Sin(pitch), (float)(-System.Math.Cos(pitch) * System.Math.Cos(yaw)));
            if (f.sqrMagnitude > 0.001f) Cam.transform.rotation = Quaternion.LookRotation(f, Vector3.up);
            if (Walker.FovChanged) Cam.fieldOfView = (float)Walker.CamFov;
        }
    }

    public Door DoorForTarget(string targetId) { return doorByTarget.TryGetValue(targetId, out var d) ? d : null; }
    public double DoorOpen(string doorId) { return doorById.TryGetValue(doorId, out var d) ? d.Open : 0; }

    string FindDoorBuilding(string doorId)
    {
        foreach (var kv in systems) if (kv.Value.Find(doorId) != null) return kv.Key;
        return "dorm";
    }

    void Update()
    {
        if (Walker == null) return;
        if (Dialog != null && Dialog.Current != null) return;   // a conversation owns the input
        StepFrame(Time.deltaTime);
        if (Input.GetKeyDown(KeyCode.E)) Interactor.Use();
    }
}

class UnityWalkerInput : IWalkerInput
{
    Vector2 lookAccum;
    public (double X, double Y) TakeLook()
    {
        lookAccum = new Vector2(Input.GetAxis("Mouse X") * 120, -Input.GetAxis("Mouse Y") * 120);
        return (lookAccum.x, lookAccum.y);
    }
    public bool Down(string code)
    {
        switch (code)
        {
            case "KeyW": return Input.GetKey(KeyCode.W);
            case "KeyS": return Input.GetKey(KeyCode.S);
            case "KeyA": return Input.GetKey(KeyCode.A);
            case "KeyD": return Input.GetKey(KeyCode.D);
            case "ArrowUp": return Input.GetKey(KeyCode.UpArrow);
            case "ArrowDown": return Input.GetKey(KeyCode.DownArrow);
            case "ArrowLeft": return Input.GetKey(KeyCode.LeftArrow);
            case "ArrowRight": return Input.GetKey(KeyCode.RightArrow);
            case "ShiftLeft": case "ShiftRight": return Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
            default: return false;
        }
    }
}

class AmbientRig : MonoBehaviour
{
    void Start() { RenderSettings.ambientLight = new Color(0.55f, 0.58f, 0.62f); }
}
