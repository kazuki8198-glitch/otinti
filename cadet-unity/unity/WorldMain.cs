// WorldMain.cs — Stage 3 world build: the LAB airfield (paved rects from the
// ported physics), the academy block extruded from data/academy-spec.json
// (room rects + ceiling heights, cel-shaded), the Archer glb parked at the
// day.js stand, clouds and light. Captures evidence views and writes
// world-done.txt. Editor-driven by WorldAcceptance.
//
// Model note (measured, not assumed): glTFast converts this material-less
// glb with an X mirror — the correct left-handed conversion: the Unity
// vertex set matches the glb's under (-x, y, z) (ailL 133/133, body
// 5333/5349 with duplicates), and the body mesh in Unity has exactly the
// glb's 7,044 triangles with max edge 0.82 m. The wings only LOOK detached
// from high angles (low wing, root under the cabin line, no shadows in the
// first pass) — the geometry is intact.
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using UnityEngine;
using GLTFast;
using Cadet;
using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public class WorldMain : MonoBehaviour
{
    // physics PAVED_RECT (a0, a1, c0, c1) — runway, taxiways, apron
    static readonly double[][] PAVED = {
        new[]{-40.0, 1240, -15, 15}, new[]{-10.0, 1210, 95, 110}, new[]{10.0, 25, 15, 95},
        new[]{600.0, 615, 15, 95}, new[]{1175.0, 1190, 15, 95}, new[]{450.0, 750, 110, 230} };
    static readonly string[] PAVED_KIND = { "rwy", "twy", "twy", "twy", "twy", "apron" };

    private Camera cam;
    private GameObject field, modelRoot;
    private int frame;
    private bool built, shot;
    private readonly List<string> log = new List<string>();

    private Material Toon(Color c)
    {
        var sh = Shader.Find("Cadet/Toon");
        var m = new Material(sh != null ? sh : Shader.Find("Standard"));
        m.color = c; if (m.HasProperty("_Color")) m.SetColor("_Color", c);
        return m;
    }
    private GameObject Box(GameObject parent, string name, double a0, double a1, double c0, double c1, double y0, double y1, Material mat)
    {
        var g = GameObject.CreatePrimitive(PrimitiveType.Cube);
        g.name = name; g.transform.SetParent(parent.transform, false);
        g.transform.localPosition = new Vector3((float)((c0 + c1) / 2), (float)((y0 + y1) / 2), (float)((a0 + a1) / 2));
        g.transform.localScale = new Vector3((float)Math.Abs(c1 - c0), (float)(y1 - y0), (float)Math.Abs(a1 - a0));
        var mr = g.GetComponent<MeshRenderer>();
        mr.sharedMaterial = mat; mr.receiveShadows = true;
        return g;
    }

    void Start()
    {
        cam = Camera.main;
        if (cam == null) { var cg = new GameObject("WorldCam"); cam = cg.AddComponent<Camera>(); }
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.55f, 0.75f, 0.95f);
        cam.farClipPlane = 8000;
        RenderSettings.fog = true; RenderSettings.fogColor = new Color(0.75f, 0.85f, 0.95f);
        RenderSettings.fogStartDistance = 900; RenderSettings.fogEndDistance = 6000;
        var sun = FindObjectOfType<Light>();
        if (sun == null)
        {
            var lg = new GameObject("Sun"); sun = lg.AddComponent<Light>();
            sun.type = LightType.Directional;
            lg.transform.rotation = Quaternion.Euler(48, -32, 0);
        }
        sun.intensity = 1.1f;
        sun.shadows = LightShadows.Soft;
        sun.shadowStrength = 0.55f;
        Build();
        _ = LoadModel();
    }

    void Build()
    {
        field = new GameObject("Field");
        field.transform.rotation = Quaternion.Euler(0, -6, 0);   // RWY 36 → true 354°
        var grass = Toon(new Color(0.36f, 0.55f, 0.30f));
        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "Ground"; ground.transform.SetParent(field.transform, false);
        ground.transform.localPosition = new Vector3(600, -0.05f, 600);
        ground.transform.localScale = new Vector3(400, 1, 400);
        var gmr = ground.GetComponent<MeshRenderer>();
        gmr.sharedMaterial = grass; gmr.receiveShadows = true;
        var asphalt = Toon(new Color(0.16f, 0.16f, 0.18f));
        var concrete = Toon(new Color(0.55f, 0.55f, 0.57f));
        var paint = Toon(new Color(0.95f, 0.95f, 0.95f));
        var yellow = Toon(new Color(0.95f, 0.75f, 0.15f));
        for (int i = 0; i < PAVED.Length; i++)
        {
            var r = PAVED[i];
            Box(field, "paved_" + PAVED_KIND[i] + i, r[0], r[1], r[2], r[3], 0, 0.06, PAVED_KIND[i] == "rwy" ? asphalt : concrete);
            if (PAVED_KIND[i] == "twy") Box(field, "twyline" + i, r[0], r[1], (r[2] + r[3]) / 2 - 0.18, (r[2] + r[3]) / 2 + 0.18, 0.06, 0.09, yellow);
        }
        for (int b = 0; b < 8; b++) Box(field, "thr" + b, 6, 26, -13.5 + b * 3.4, -11.3 + b * 3.4, 0.06, 0.09, paint);
        for (int dsh = 0; dsh < 18; dsh++) Box(field, "cl" + dsh, 70 + dsh * 62, 100 + dsh * 62, -0.55, 0.55, 0.06, 0.09, paint);
        Box(field, "holdA1", 15.5, 17.0, 30, 44, 0.06, 0.1, yellow);
        Box(field, "holdA1b", 18.2, 19.7, 30, 44, 0.06, 0.1, yellow);

        // ---- the academy from data/academy-spec.json
        string specPath = Path.Combine(Application.streamingAssetsPath, "cadet-data", "academy-spec.json");
        var spec = (Dict)MiniJson.Parse(File.ReadAllText(specPath));
        var rooms = (Lst)spec["rooms"];
        var palette = new[] {
            new Color(0.92f, 0.88f, 0.78f), new Color(0.85f, 0.80f, 0.70f), new Color(0.78f, 0.83f, 0.88f),
            new Color(0.88f, 0.78f, 0.72f), new Color(0.80f, 0.87f, 0.78f) };
        int ri = 0;
        var academy = new GameObject("Academy"); academy.transform.SetParent(field.transform, false);
        foreach (var rv in rooms)
        {
            var r = (Dict)rv;
            double a0 = Js.Num(r, "a0"), a1 = Js.Num(r, "a1"), c0 = Js.Num(r, "c0"), c1 = Js.Num(r, "c1");
            double h = Math.Max(2.6, Js.Num(r, "ceiling", 3.1));
            var mat = Toon(palette[ri++ % palette.Length]);
            var wall = Toon(new Color(0.93f, 0.91f, 0.86f));
            Box(academy, "floor_" + Js.Str(r, "id"), a0, a1, c0, c1, 0, 0.12, mat);
            const double T = 0.18;
            Box(academy, "wN_" + Js.Str(r, "id"), a1 - T, a1, c0, c1, 0, h, wall);
            Box(academy, "wS_" + Js.Str(r, "id"), a0, a0 + T, c0, c1, 0, h, wall);
            Box(academy, "wW_" + Js.Str(r, "id"), a0, a1, c0, c0 + T, 0, h, wall);
            Box(academy, "wE_" + Js.Str(r, "id"), a0, a1, c1 - T, c1, 0, h, wall);
            Box(academy, "roof_" + Js.Str(r, "id"), a0, a1, c0, c1, h, h + 0.15, Toon(new Color(0.45f, 0.42f, 0.40f)));
        }
        log.Add("rooms=" + rooms.Count);
        var cloudMat = new Material(Shader.Find("Unlit/Color")); cloudMat.color = new Color(1, 1, 1, 0.92f);
        var rnd = new System.Random(7);
        for (int i = 0; i < 42; i++)
        {
            var cl = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            cl.name = "cloud" + i;
            cl.transform.position = new Vector3(rnd.Next(-2500, 3500), 260 + rnd.Next(0, 160), rnd.Next(-1500, 3000));
            cl.transform.localScale = new Vector3(180 + rnd.Next(0, 260), 16 + rnd.Next(0, 14), 90 + rnd.Next(0, 120));
            cl.GetComponent<MeshRenderer>().sharedMaterial = cloudMat;
        }
        built = true;
        Debug.Log("WORLD_BUILT rooms=" + rooms.Count);
    }

    private async Task LoadModel()
    {
        try
        {
            modelRoot = new GameObject("ArcherAtStand");
            modelRoot.transform.SetParent(field.transform, false);
            modelRoot.transform.localPosition = new Vector3(207.6f, 0.1f, 636.5f);   // the day.js stand (a 636.5, c 207.6)
            modelRoot.transform.localRotation = Quaternion.Euler(0, 90, 0);
            var gltf = new GltfImport();
            string path = Path.Combine(Application.streamingAssetsPath, "archer.glb");
            if (await gltf.Load(path)) { await gltf.InstantiateMainSceneAsync(modelRoot.transform); HideExtraRegs(); Debug.Log("WORLD_MODEL_LOADED"); }
            else Debug.Log("WORLD_MODEL_FAIL load");
        }
        catch (Exception ex) { Debug.Log("WORLD_MODEL_FAIL " + ex.Message); }
    }

    private void HideExtraRegs()
    {
        // the glb carries every registration decal at once; the HTML build
        // shows only the airframe's own (N738SY for the Archer)
        foreach (var t in modelRoot.GetComponentsInChildren<Transform>(true))
            if (t.name.StartsWith("reg.") && t.name != "reg.N738SY") t.gameObject.SetActive(false);
        foreach (var r in modelRoot.GetComponentsInChildren<MeshRenderer>(true))
        { r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On; r.receiveShadows = true; }
    }

    private bool Capture(string name, Vector3 pos, Vector3 look, float fov = 55)
    {
        int w = 1100, h = 750;
        var rt = new RenderTexture(w, h, 24);
        cam.transform.position = pos; cam.transform.LookAt(look); cam.fieldOfView = fov;
        cam.targetTexture = rt; cam.Render();
        RenderTexture.active = rt;
        var tex = new Texture2D(w, h, TextureFormat.RGB24, false);
        tex.ReadPixels(new Rect(0, 0, w, h), 0, 0); tex.Apply();
        cam.targetTexture = null; RenderTexture.active = null;
        string p = Path.GetFullPath(Path.Combine(Application.dataPath, "../" + name));
        File.WriteAllBytes(p, tex.EncodeToPNG());
        Debug.Log("WORLD_SHOT " + p);
        return true;
    }
    private Vector3 F(double a, double c, double y)   // field (a, c) → world (field group rotated -6°)
    {
        return field.transform.TransformPoint(new Vector3((float)c, (float)y, (float)a));
    }

    void Update()
    {
        if (!built || shot) return;
        if (++frame < 90) return;   // let the glb land
        shot = true;
        Capture("world_overview.png", F(-260, 560, 240), F(620, 60, 0));
        Capture("world_stand.png", F(622, 224, 3.2), F(636.5, 207.6, 1.0));
        Capture("world_academy.png", F(560, 254, 210), F(650, 254, 0));
        Capture("world_cockpit.png", F(642, 199, 1.3), F(636.5, 208.5, 0.9));
        Capture("world_top.png", F(636.5, 207.6, 26), F(636.6, 207.6, 0));
        File.WriteAllText(Path.GetFullPath(Path.Combine(Application.dataPath, "../world-done.txt")), string.Join("; ", log));
        Debug.Log("WORLD_DONE");
    }
}
