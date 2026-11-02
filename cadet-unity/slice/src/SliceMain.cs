// SliceMain.cs — the CADET Unity vertical slice: title screen (clickable buttons) → runway spawn →
// real-input takeoff, on the ported physics (CadetPhysics.cs) and controls (Controls.cs).
// World mapping: physics (x = east, y = up, z = south) → Unity (x = east, y = up, z = north),
// with the altitude origin shifted so the ground plane sits at y = 0.
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using GLTFast;
using Cadet;

public sealed class UnityKeySet : IKeySet
{
    private static readonly Dictionary<KeyCode, string> Map = new Dictionary<KeyCode, string>
    {
        [KeyCode.W] = "KeyW", [KeyCode.S] = "KeyS", [KeyCode.A] = "KeyA", [KeyCode.D] = "KeyD",
        [KeyCode.Q] = "KeyQ", [KeyCode.E] = "KeyE", [KeyCode.R] = "KeyR", [KeyCode.F] = "KeyF",
        [KeyCode.B] = "KeyB", [KeyCode.Space] = "Space",
        [KeyCode.UpArrow] = "ArrowUp", [KeyCode.DownArrow] = "ArrowDown",
        [KeyCode.LeftArrow] = "ArrowLeft", [KeyCode.RightArrow] = "ArrowRight",
        [KeyCode.PageUp] = "PageUp", [KeyCode.PageDown] = "PageDown"
    };
    public bool Has(string code)
    {
        foreach (var kv in Map) if (kv.Value == code && Input.GetKey(kv.Key)) return true;
        return false;
    }
    public bool Shift => Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
}

public class SliceMain : MonoBehaviour
{
    public static SliceMain Instance;
    public State S;
    public Controls Ctl;
    public IKeySet KeySource;                 // real Unity keys by default; the automated test swaps in virtual keys
    public bool InFlight;
    public bool CareerMode;
    public Button CareerButton, FreeButton;
    public string LastActionText = "";

    private const double DT = 1.0 / 120.0;
    private double acc;
    private GameObject titlePanel, aircraft, modelRoot;
    public Canvas MainCanvas;
    private Text statusText, guideText, modeText;
    private Camera cam;
    private bool modelFlip = true;            // measured: the archer glb's nose faces -Z of the wrapper (chase shot showed the prop), so flip 180
    private Vector3 camPos;
    private readonly UnityKeySet unityKeys = new UnityKeySet();

    public static Vector3 ToUnity(double[] p) => new Vector3((float)p[0], (float)(p[1] - FlightPhysics.GROUND_M), (float)(-p[2]));
    private static Vector3 VecU(double[] v) => new Vector3((float)v[0], (float)v[1], (float)(-v[2]));

    void Awake()
    {
        Instance = this;
        KeySource = unityKeys;
        cam = Camera.main;
        BuildWorld();
        BuildTitle();
    }

    // ------------------------------------------------------------------ world (procedural, slice-grade)
    private void BuildWorld()
    {
        var lightGo = new GameObject("Sun");
        var li = lightGo.AddComponent<Light>();
        li.type = LightType.Directional;
        li.intensity = 1.1f;
        lightGo.transform.rotation = Quaternion.Euler(50, -30, 0);
        RenderSettings.ambientLight = new Color(0.55f, 0.6f, 0.65f);

        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "Ground";
        ground.transform.position = new Vector3(-39400, -0.05f, 600);
        ground.transform.localScale = new Vector3(400, 1, 400);
        var gm = new Material(Shader.Find("Standard")) { color = new Color(0.32f, 0.42f, 0.26f) };
        ground.GetComponent<MeshRenderer>().sharedMaterial = gm;

        // the LAB runway, from the physics definition itself
        var rwy = FlightPhysics.LAB_RWY;
        var c00 = FlightPhysics.RwyToNE(rwy, -40, -15); var c01 = FlightPhysics.RwyToNE(rwy, -40, 15);
        var c10 = FlightPhysics.RwyToNE(rwy, rwy.Len + 40, -15); var c11 = FlightPhysics.RwyToNE(rwy, rwy.Len + 40, 15);
        Vector3 V(double[] ne) => new Vector3((float)ne[1], 0f, (float)(-ne[0]));
        var mesh = new Mesh { vertices = new[] { V(c00), V(c01), V(c10), V(c11) }, triangles = new[] { 0, 2, 1, 1, 2, 3 } };
        mesh.RecalculateNormals();
        var rgo = new GameObject("Runway");
        rgo.AddComponent<MeshFilter>().sharedMesh = mesh;
        var rm = new Material(Shader.Find("Standard")) { color = new Color(0.16f, 0.16f, 0.17f) };
        rgo.AddComponent<MeshRenderer>().sharedMaterial = rm;
    }

    // ------------------------------------------------------------------ title screen
    private Font Font() => Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
    private Text MakeText(Transform parent, string txt, int size, Vector2 anchor, Vector2 pos, Color col)
    {
        var go = new GameObject("Text");
        go.transform.SetParent(parent, false);
        var t = go.AddComponent<Text>();
        t.font = Font(); t.text = txt; t.fontSize = size; t.color = col; t.alignment = TextAnchor.MiddleCenter;
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = rt.anchorMax = anchor; rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(900, size * 2.2f); rt.anchoredPosition = pos;
        return t;
    }
    private Button MakeButton(Transform parent, string label, Vector2 pos, UnityEngine.Events.UnityAction onClick)
    {
        var go = new GameObject("Button");
        go.transform.SetParent(parent, false);
        var img = go.AddComponent<Image>();
        img.color = new Color(0.13f, 0.3f, 0.5f, 0.95f);
        var b = go.AddComponent<Button>();
        b.targetGraphic = img;
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f); rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(420, 72); rt.anchoredPosition = pos;
        var t = MakeText(go.transform, label, 30, new Vector2(0.5f, 0.5f), Vector2.zero, Color.white);
        t.GetComponent<RectTransform>().sizeDelta = new Vector2(420, 72);
        b.onClick.AddListener(onClick);
        return b;
    }
    private void BuildTitle()
    {
        if (FindObjectOfType<EventSystem>() == null)
        {
            var es = new GameObject("EventSystem");
            es.AddComponent<EventSystem>();
            es.AddComponent<StandaloneInputModule>();
        }
        var canvasGo = new GameObject("Canvas");
        var canvas = canvasGo.AddComponent<Canvas>();
        MainCanvas = canvas;
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasGo.AddComponent<CanvasScaler>();
        canvasGo.AddComponent<GraphicRaycaster>();

        titlePanel = new GameObject("TitlePanel");
        titlePanel.transform.SetParent(canvasGo.transform, false);
        var bg = titlePanel.AddComponent<Image>();
        bg.color = new Color(0.05f, 0.09f, 0.14f, 0.88f);
        var brt = titlePanel.GetComponent<RectTransform>();
        brt.anchorMin = Vector2.zero; brt.anchorMax = Vector2.one; brt.offsetMin = Vector2.zero; brt.offsetMax = Vector2.zero;

        MakeText(titlePanel.transform, "CADET", 64, new Vector2(0.5f, 0.5f), new Vector2(0, 170), Color.white);
        MakeText(titlePanel.transform, "パイロット訓練生シミュレーター — Unity 縦切り", 24, new Vector2(0.5f, 0.5f), new Vector2(0, 105), new Color(0.75f, 0.85f, 0.95f));
        CareerButton = MakeButton(titlePanel.transform, "キャリアをはじめる", new Vector2(0, 10), () => StartFlight(true));
        FreeButton = MakeButton(titlePanel.transform, "フリー飛行", new Vector2(0, -80), () => StartFlight(false));

        // HUD (visible in flight)
        statusText = MakeText(canvasGo.transform, "", 22, new Vector2(0, 1), new Vector2(430, -40), Color.white);
        statusText.alignment = TextAnchor.UpperLeft;
        guideText = MakeText(canvasGo.transform, "", 26, new Vector2(0.5f, 0), new Vector2(0, 46), new Color(1f, 0.95f, 0.6f));
        modeText = MakeText(canvasGo.transform, "", 20, new Vector2(1, 1), new Vector2(-260, -34), new Color(0.8f, 0.9f, 1f));
        statusText.gameObject.SetActive(false); guideText.gameObject.SetActive(false); modeText.gameObject.SetActive(false);

        if (cam != null)
        {
            cam.transform.position = new Vector3(-39960, 26, 90);
            cam.transform.LookAt(new Vector3(-40003, 2, -30));
            camPos = cam.transform.position;
        }
    }

    // ------------------------------------------------------------------ flight
    public void StartFlight(bool career)
    {
        if (InFlight) return;
        CareerMode = career;
        titlePanel.SetActive(false);
        S = Sim.NewState(1, "pa28");
        Sim.PlaceOnRunway(S, FlightPhysics.LAB_RWY, 30);
        Ctl = new Controls();
        Ctl.Reset();
        S.Opts.Sens = Ctl.Prefs.Sens; S.Opts.Assist = Ctl.Prefs.Assist; S.Opts.AutoRud = Ctl.Prefs.AutoRud; S.Opts.GainCap = Ctl.Prefs.GainCap;
        LastActionText = Ctl.Action(S, "parkBrake", 1, career == false);   // a flight starts parked, as flight.js does
        aircraft = new GameObject("Aircraft");
        modelRoot = new GameObject("Model");
        modelRoot.transform.SetParent(aircraft.transform, false);
        _ = LoadModel();
        SyncAircraft(true);
        statusText.gameObject.SetActive(true); guideText.gameObject.SetActive(true); modeText.gameObject.SetActive(true);
        modeText.text = career ? "キャリア（縦切り：訓練飛行）" : "フリー飛行";
        InFlight = true;
        Debug.Log("SLICE_FLIGHT_START career=" + career);
    }

    private async Task LoadModel()
    {
        try
        {
            var gltf = new GltfImport();
            string path = Path.Combine(Application.streamingAssetsPath, "archer.glb");
            if (await gltf.Load(path)) await gltf.InstantiateMainSceneAsync(modelRoot.transform);
            Debug.Log("SLICE_MODEL_LOADED");
        }
        catch (Exception ex) { Debug.Log("SLICE_MODEL_FAIL " + ex.Message); }
    }

    private void SyncAircraft(bool snapCam = false)
    {
        if (S == null || aircraft == null) return;
        var fwd = PhysMath.QRot(S.Q, new double[] { 0, 0, -1 });
        var up = PhysMath.QRot(S.Q, new double[] { 0, 1, 0 });
        aircraft.transform.position = ToUnity(S.Pos);
        var fU = VecU(fwd); var uU = VecU(up);
        if (fU.sqrMagnitude > 0.001f) aircraft.transform.rotation = Quaternion.LookRotation(fU, uU);
        modelRoot.transform.localRotation = Quaternion.Euler(0, modelFlip ? 180 : 0, 0);
        if (cam != null)
        {
            Vector3 want = aircraft.transform.position - fU * 17f + uU * 5.5f;
            camPos = snapCam ? want : Vector3.Lerp(camPos, want, 0.12f);
            cam.transform.position = camPos;
            cam.transform.LookAt(aircraft.transform.position + fU * 12f);
        }
    }

    void Update()
    {
        if (!InFlight || S == null) return;
        HandleDiscreteKeys();
        acc += Math.Min(Time.deltaTime, 0.1f);
        while (acc >= DT)
        {
            acc -= DT;
            Ctl.Update(S, DT, KeySource, true);
            Sim.Step(S, DT);
        }
        SyncAircraft();
        var o = S.Out;
        statusText.text = $"IAS {o.Ias:0} kt   ALT {o.AltTrue:0} ft   VS {o.Vsi:0} fpm   THR {S.Thr * 100:0}%\n" +
                          $"フラップ {o.FlapLabel}   脚 {(o.GearDown ? "DOWN" : "UP")}   {LastActionText}";
        guideText.text = GuideText();
    }

    private string GuideText()
    {
        if (Ctl.ParkBrake) return "Shift+B：パーキングブレーキを解除する";
        if (S.OnGround && S.Thr < 0.99) return "R を押し続ける：スロットル全開";
        if (S.OnGround && S.Out.Ias < 55) return $"加速中… {S.Out.Ias:0} kt（55 kt で引き起こし）";
        if (S.OnGround) return "S を押し続ける：機首を上げる";
        return "上昇中 — W/S で姿勢、A/D でバンク、T でトリム";
    }

    private static readonly (KeyCode kc, string code)[] DiscreteCodes =
    {
        (KeyCode.V, "KeyV"), (KeyCode.G, "KeyG"), (KeyCode.T, "KeyT"), (KeyCode.L, "KeyL"), (KeyCode.U, "KeyU"),
        (KeyCode.R, "KeyR"), (KeyCode.F, "KeyF"), (KeyCode.Z, "KeyZ"), (KeyCode.X, "KeyX"),
        (KeyCode.N, "KeyN"), (KeyCode.Backslash, "Backslash"), (KeyCode.LeftBracket, "BracketLeft"), (KeyCode.RightBracket, "BracketRight")
    };
    private void HandleDiscreteKeys()
    {
        if (KeySource != unityKeys) return;   // the test drives actions through Controls.Action itself
        bool shift = unityKeys.Shift;
        if (Input.GetKeyDown(KeyCode.B) && shift) { LastActionText = Ctl.Action(S, "parkBrake", null, !CareerMode); return; }
        foreach (var (kc, code) in DiscreteCodes)
        {
            if (!Input.GetKeyDown(kc)) continue;
            var a = Controls.ActionForKey(code, shift);
            if (a != null) LastActionText = Ctl.Action(S, a, null, !CareerMode);
        }
    }

    // capture the frame WITH the UI: the canvas is switched to ScreenSpaceCamera for one
    // render (ScreenCapture returns null in batch mode, and overlay UI never reaches a
    // camera's RenderTexture). Used by the acceptance test for title/HUD evidence.
    public bool CaptureWithUI(string path)
    {
        if (MainCanvas == null || cam == null) return false;
        var prev = MainCanvas.renderMode;
        MainCanvas.renderMode = RenderMode.ScreenSpaceCamera;
        MainCanvas.worldCamera = cam;
        Canvas.ForceUpdateCanvases();
        int w = Math.Max(Screen.width, 320), h = Math.Max(Screen.height, 240);
        var rt = new RenderTexture(w, h, 24);
        cam.targetTexture = rt; cam.Render();
        RenderTexture.active = rt;
        var tex = new Texture2D(w, h, TextureFormat.RGB24, false);
        tex.ReadPixels(new Rect(0, 0, w, h), 0, 0); tex.Apply();
        cam.targetTexture = null; RenderTexture.active = null;
        MainCanvas.renderMode = prev;
        File.WriteAllBytes(path, tex.EncodeToPNG());
        return true;
    }
}
