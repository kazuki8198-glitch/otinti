// CockpitMain — the Unity layer of the cockpit: builds every control of the
// current HTML cockpit (data/cockpit-controls.json, extracted from cockpit.js)
// as a pickable mesh, and wires presses to the ported logic (Cadet.Cockpit's
// act/apply over Systems + physics + autopilot). Stage 6: the geometry is the
// extracted hit geometry (boxes / cylinders) on a panel shell — the dressed
// meshes and glass are Stage 7. The session composition (a parked aircraft at
// the LAB stand) mirrors BotCockpitCs's rig, so what you can do by clicking
// here is what the equivalence harness proved.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;

public class CockpitMain : MonoBehaviour
{
    public Cockpit Cp;
    public Systems Sys;
    public State S;
    public AvionicsState Av;
    public Autopilot Ap;
    public Controls Ctl;
    public LessonState Fl;
    public string Type = "";
    public string LastToast = "";
    public bool SessionLive;
    public int ControlCount;
    public Vector3 Eye = new Vector3(-0.3f, 0.62f, 0.4f);   // the extraction eye, z mirrored

    readonly Dictionary<string, GameObject> byId = new Dictionary<string, GameObject>();
    readonly Dictionary<GameObject, string> idOf = new Dictionary<GameObject, string>();
    readonly Dictionary<string, Vector3> aimOf = new Dictionary<string, Vector3>();
    GameObject root;
    double acc, frameAcc;
    static readonly VirtualKeySet NoKeys = new VirtualKeySet();

    static Vector3 M(double[] v) { return new Vector3((float)v[0], (float)v[1], (float)-v[2]); }   // JS → Unity (z mirror)
    static double[] Arr(object o) { return ((List<object>)o).ConvertAll(x => (double)x).ToArray(); }

    static Material Mat(Color c)
    {
        var m = new Material(Shader.Find("Cadet/Toon") ?? Shader.Find("Standard"));
        m.color = c;
        return m;
    }

    public void BuildType(string type)
    {
        Type = type;
        if (root != null) DestroyImmediate(root);
        byId.Clear(); idOf.Clear(); aimOf.Clear();
        root = new GameObject("Cockpit-" + type);
        root.transform.SetParent(transform, false);

        string path = Path.Combine(Application.streamingAssetsPath, "cadet-data", "cockpit-controls.json");
        var data = (Dict)MiniJson.Parse(File.ReadAllText(path));
        var types = (Dict)data["types"];
        var tdata = (Dict)types[type];
        var controls = (List<object>)tdata["controls"];
        ControlCount = controls.Count;

        // the panel shell behind the controls (the glareshield face), so the
        // arrangement reads as a cockpit and not a cloud of boxes
        var shell = GameObject.CreatePrimitive(PrimitiveType.Cube);
        shell.name = "panel-shell";
        shell.transform.SetParent(root.transform, false);
        shell.transform.position = new Vector3(-0.02f, 0.27f, 1.10f);
        shell.transform.localScale = new Vector3(1.16f, 0.52f, 0.04f);
        var shellMr = shell.GetComponent<MeshRenderer>(); shellMr.material = Mat(new Color(0.13f, 0.13f, 0.14f));
        shellMr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        DestroyImmediate(shell.GetComponent<Collider>());

        var screenMat = Mat(new Color(0.05f, 0.10f, 0.16f));
        var knobMat = Mat(new Color(0.08f, 0.08f, 0.09f));
        var btnMat = Mat(new Color(0.22f, 0.22f, 0.24f));
        var swMat = Mat(new Color(0.55f, 0.55f, 0.58f));
        var leverMat = Mat(new Color(0.30f, 0.22f, 0.16f));
        var redMat = Mat(new Color(0.55f, 0.12f, 0.10f));

        foreach (var co in controls)
        {
            var c = (Dict)co;
            string id = (string)c["id"];
            string kind = (string)c["kind"];
            var pos = M(Arr(c["pos"]));
            var go = new GameObject(id);
            go.transform.SetParent(root.transform, false);
            go.transform.position = pos;
            var rot = Arr(c["rot"]);
            go.transform.rotation = Quaternion.Euler((float)(-rot[0] * Mathf.Rad2Deg), (float)(-rot[1] * Mathf.Rad2Deg), (float)(rot[2] * Mathf.Rad2Deg));
            MeshRenderer mr;
            if (c.ContainsKey("cyl"))
            {
                var cyl = Arr(c["cyl"]);
                var prim = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                prim.transform.SetParent(go.transform, false);
                prim.transform.rotation = Quaternion.Euler(90, 0, 0);
                prim.transform.localScale = new Vector3((float)(cyl[0] * 2), (float)cyl[1], (float)(cyl[0] * 2));
                mr = prim.GetComponent<MeshRenderer>();
                var col = go.AddComponent<BoxCollider>();
                col.size = new Vector3((float)(cyl[0] * 2), (float)(cyl[0] * 2), (float)cyl[1]);
                DestroyImmediate(prim.GetComponent<Collider>());
            }
            else
            {
                var box = Arr(c["box"]);
                var prim = GameObject.CreatePrimitive(PrimitiveType.Cube);
                prim.transform.SetParent(go.transform, false);
                prim.transform.localScale = new Vector3((float)box[0], (float)box[1], (float)box[2]);
                mr = prim.GetComponent<MeshRenderer>();
                var col = go.AddComponent<BoxCollider>();
                col.size = new Vector3((float)box[0], (float)box[1], (float)box[2]);
                DestroyImmediate(prim.GetComponent<Collider>());
            }
            mr.material = id.StartsWith("view.") ? screenMat
                : kind == "knob" ? knobMat
                : kind == "switch" ? swMat
                : kind == "lever" || kind == "handle" ? leverMat
                : id == "gearEmerg" || id == "primer" ? redMat
                : btnMat;
            mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            byId[id] = go; idOf[go] = id;
            aimOf[id] = c.ContainsKey("aim") ? M(Arr(c["aim"])) : pos;
        }
    }

    // a parked-aircraft session at the LAB stand, cold — the harness's rig
    public void StartParkedSession(string type)
    {
        BuildType(type);
        S = Sim.NewState(7, type);
        Sim.ApplyLoading(S, new Loading());
        Sim.ResetState(S);
        var ne = FlightPhysics.RwyToNE(FlightPhysics.LAB_RWY, 715, 208);
        S.Q = PhysMath.QFromHPB(264, 0, 0);
        S.Pos = new[] { ne[1], FlightPhysics.GROUND_M - S.WheelBottom + 0.02, -ne[0] };
        S.FlapIdx = 0; S.FlapDeg = 0; S.Thr = 0; S.Trim = 0; S.Brake = 0; S.GearDown = true; S.GearPos = 1;
        S.OnGround = true; S.AirTime = 0; S.WasOnRunway = true; S.LastRwyT = S.T;
        S.Contacts = new bool[S.Wheels.Count]; for (int i = 0; i < S.Contacts.Length; i++) S.Contacts[i] = true;
        S.Rpm = Aero.RpmFor(S.A, 0, 0);
        foreach (var en in S.Eng) en.Rpm = S.Rpm;
        S.Wind = new WindState { FromDeg = 4, Kt = 5, Gust = 0.5 };
        Sim.Derive(S);

        Cp = new Cockpit(); Cp.Type = type;
        Av = Avionics.CreateAvionics();
        Cp.CurS = S; Cp.CurAv = Av;
        Sys = new Systems(Cp.Sw);
        Sys.SetCold(S);
        Ctl = new Controls();
        Fl = new LessonState { S = S, Av = Av, Free = true };
        Ap = new Autopilot();
        Ctl.Action(S, "parkBrake", null, true);
        SessionLive = true;
    }

    // one 1/60 s frame of the session (the generator's composition)
    public void Frame()
    {
        if (!SessionLive) return;
        Ctl.Update(S, 1.0 / 60, NoKeys, true);
        acc += 1.0 / 60;
        double H = 1.0 / 120; int n = 0;
        while (acc >= H && n < 30) { Ap.Pilot(Fl, H); Sim.Step(S, H); acc -= H; n++; }
        Sys.Update(1.0 / 60, S);
        Ap.Sync(Av);
    }
    public void StepSeconds(double sec) { for (double t = 0; t < sec - 1e-9; t += 1.0 / 60) Frame(); }

    void Update()
    {
        if (!SessionLive || !Application.isPlaying) return;
        frameAcc += Math.Min(Time.deltaTime, 0.1);
        while (frameAcc >= 1.0 / 60) { frameAcc -= 1.0 / 60; Frame(); }
    }

    // press a control by id (a click, or a wheel turn when wheel is set)
    public string Press(string id, double dir = 1, bool wheel = false)
    {
        var d = Cp.Act(id, dir, wheel);
        string toast = Cp.Apply(d, Sys, Ctl, Ap, Fl, true);
        if (!string.IsNullOrEmpty(toast)) LastToast = toast;
        return toast;
    }

    // press whatever a ray hits; returns the control id or ""
    public string RayPress(Vector3 origin, Vector3 dirV, double dir = 1, bool wheel = false)
    {
        RaycastHit hit;
        if (!Physics.Raycast(origin, dirV, out hit, 5f)) return "";
        var go = hit.collider.gameObject;
        string id;
        if (!idOf.TryGetValue(go, out id)) return "";
        Press(id, dir, wheel);
        return id;
    }

    // the aim point of a control, in world space (for picking tests)
    public bool TryAim(string id, out Vector3 aim)
    {
        aim = Vector3.zero;
        Vector3 a;
        if (!aimOf.TryGetValue(id, out a)) return false;
        aim = transform.TransformPoint(a);
        return true;
    }
    public IEnumerable<string> ControlIds { get { return byId.Keys; } }

    /// <summary>Stage 7: give a control's face an unlit material showing a live glass texture.</summary>
    public bool BindGlassTexture(string id, Texture tex)
    {
        GameObject go;
        if (!byId.TryGetValue(id, out go)) return false;
        var mr = go.GetComponentInChildren<MeshRenderer>();
        if (mr == null) return false;
        var mat = new Material(Shader.Find("Unlit/Texture") ?? Shader.Find("Standard")) { mainTexture = tex };
        // the built-in cube's pilot-facing UVs run v downwards: flip so the glass reads upright
        mat.mainTextureScale = new Vector2(-1, -1);
        mat.mainTextureOffset = new Vector2(1, 1);
        mr.material = mat;
        return true;
    }

    public string FocusId { get; private set; }

    /// <summary>Stage 7: the I-key focus view (panel-view.js) — the camera moves
    /// in front of the focused instrument at the frame's distance and fov.
    /// focusId null restores the extraction eye.</summary>
    public void SetFocusView(string focusId)
    {
        FocusId = focusId;
        var cam = Camera.main;
        if (cam == null) return;
        Vector3 eyeW = transform.TransformPoint(Eye);
        if (focusId == null || !byId.TryGetValue(focusId, out var go))
        {
            cam.transform.position = eyeW;
            cam.transform.rotation = transform.rotation;
            cam.fieldOfView = 55f;
            return;
        }
        var frame = PanelView.Frame(focusId);
        Vector3 pos = go.transform.position;
        Vector3 dir = (eyeW - pos).normalized;
        cam.transform.position = pos + dir * (float)frame.Dist;
        cam.transform.LookAt(pos);
        cam.fieldOfView = (float)frame.Fov;
    }
}
