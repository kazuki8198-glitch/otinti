// LessonMain.cs — Stage 2: flyable lessons inside the Unity slice scene.
// Adds lesson buttons to the title panel (children of the same panel as the
// career/free buttons, so clicks go through the same UI event path) and runs
// a lesson with the ported school engine: BotFly (the reference pilot, the
// same one the JS tests use) → Sim.Step → School.Update at 120 Hz, exactly
// the loop the equivalence digests verify. A 10 Hz recorder runs alongside
// and the debrief analysis is computed at the end, in-engine.
using System;
using System.IO;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.UI;
using GLTFast;
using Cadet;

public class LessonMain : MonoBehaviour
{
    public static LessonMain Instance;
    public LessonState L;
    public BotFly Bot;
    public Recorder Rec;
    public int StepsPerFrame = 1;                 // the acceptance test raises this (fast-forward)
    public bool LessonActive;
    public string CurrentId = "";
    public string ResultSummary = "";
    public string LastStepName = "";

    private const double DT = 1.0 / 120.0;
    private GameObject aircraft, modelRoot;
    private Camera cam;
    private Vector3 camPos;
    private Text hudStep, hudGuide, hudData, hudResult;
    private bool camInit;

    void Start()
    {
        Instance = this;
        cam = Camera.main;
        var sm = SliceMain.Instance;
        if (sm == null || sm.CareerButton == null) { Debug.Log("LESSON_MAIN_NO_SLICE"); return; }
        var panel = sm.CareerButton.transform.parent;
        MakeLessonButton(panel, "レッスン a1：基礎飛行", new Vector2(0, -172), "a1");
        MakeLessonButton(panel, "レッスン t2：場周経路と着陸", new Vector2(0, -240), "t2");
        MakeLessonButton(panel, "レッスン i5：ILS 進入", new Vector2(0, -308), "i5");
        MakeLessonButton(panel, "レッスン j1：ジェット離陸", new Vector2(0, -376), "j1");
        var canvas = sm.MainCanvas.transform;
        hudStep = MakeHud(canvas, 26, new Vector2(0, 1), new Vector2(460, -40), TextAnchor.UpperLeft, new Color(1f, 0.95f, 0.6f));
        hudGuide = MakeHud(canvas, 22, new Vector2(0.5f, 0), new Vector2(0, 88), TextAnchor.MiddleCenter, Color.white);
        hudData = MakeHud(canvas, 22, new Vector2(0, 1), new Vector2(460, -76), TextAnchor.UpperLeft, Color.white);
        hudResult = MakeHud(canvas, 30, new Vector2(0.5f, 0.5f), new Vector2(0, 0), TextAnchor.MiddleCenter, new Color(0.6f, 1f, 0.7f));
        SetHudVisible(false);
        Debug.Log("LESSON_MAIN_READY");
    }

    private Font Font() => Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
    private Text MakeHud(Transform parent, int size, Vector2 anchor, Vector2 pos, TextAnchor align, Color col)
    {
        var go = new GameObject("LessonHud");
        go.transform.SetParent(parent, false);
        var t = go.AddComponent<Text>();
        t.font = Font(); t.fontSize = size; t.color = col; t.alignment = align; t.text = "";
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = rt.anchorMax = anchor; rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(1100, size * 2.4f); rt.anchoredPosition = pos;
        return t;
    }
    private void MakeLessonButton(Transform parent, string label, Vector2 pos, string id)
    {
        var go = new GameObject("LessonButton_" + id);
        go.transform.SetParent(parent, false);
        var img = go.AddComponent<Image>();
        img.color = new Color(0.16f, 0.38f, 0.3f, 0.95f);
        var b = go.AddComponent<Button>();
        b.targetGraphic = img;
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f); rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(420, 56); rt.anchoredPosition = pos;
        var tgo = new GameObject("Text");
        tgo.transform.SetParent(go.transform, false);
        var t = tgo.AddComponent<Text>();
        t.font = Font(); t.text = label; t.fontSize = 24; t.color = Color.white; t.alignment = TextAnchor.MiddleCenter;
        var trt = tgo.GetComponent<RectTransform>();
        trt.anchorMin = trt.anchorMax = new Vector2(0.5f, 0.5f); trt.pivot = new Vector2(0.5f, 0.5f);
        trt.sizeDelta = new Vector2(420, 56); trt.anchoredPosition = Vector2.zero;
        b.onClick.AddListener(() => StartLessonById(id));
    }
    private void SetHudVisible(bool v)
    {
        if (hudStep != null) { hudStep.gameObject.SetActive(v); hudGuide.gameObject.SetActive(v); hudData.gameObject.SetActive(v); }
        if (hudResult != null) hudResult.gameObject.SetActive(v);
    }

    public void StartLessonById(string id)
    {
        if (LessonActive) return;
        var sm = SliceMain.Instance;
        if (sm != null && sm.CareerButton != null) sm.CareerButton.transform.parent.gameObject.SetActive(false);
        CurrentId = id;
        L = School.StartLesson(id, "intro");
        Bot = new BotFly();
        Rec = new Recorder();
        Rec.Start(new System.Collections.Generic.Dictionary<string, object> { { "title", "CADET " + id }, { "lesson", id } });
        aircraft = new GameObject("LessonAircraft");
        modelRoot = new GameObject("Model");
        modelRoot.transform.SetParent(aircraft.transform, false);
        _ = LoadModel();
        camInit = false;
        ResultSummary = ""; LastStepName = "";
        SetHudVisible(true);
        if (hudResult != null) hudResult.text = "";
        LessonActive = true;
        Debug.Log("LESSON_START " + id);
    }

    public void EndLessonToTitle()
    {
        LessonActive = false;
        L = null; Bot = null; Rec = null; CurrentId = ""; ResultSummary = "";
        if (aircraft != null) { Destroy(aircraft); aircraft = null; modelRoot = null; }
        SetHudVisible(false);
        var sm = SliceMain.Instance;
        if (sm != null && sm.CareerButton != null) sm.CareerButton.transform.parent.gameObject.SetActive(true);
        Debug.Log("LESSON_TO_TITLE");
    }

    private async Task LoadModel()
    {
        try
        {
            var gltf = new GltfImport();
            string path = Path.Combine(Application.streamingAssetsPath, "archer.glb");
            if (await gltf.Load(path)) await gltf.InstantiateMainSceneAsync(modelRoot.transform);
        }
        catch (Exception ex) { Debug.Log("LESSON_MODEL_FAIL " + ex.Message); }
    }

    void Update()
    {
        if (!LessonActive || L == null) return;
        for (int i = 0; i < StepsPerFrame && !L.Done; i++)
        {
            Bot.Fly(L, DT);
            Sim.Step(L.S, DT);
            School.Update(L, DT);
            Rec.Push(L.S, L.T);
        }
        SyncVisual();
        var step = L.StepIdx < L.Def.Steps.Count ? L.Def.Steps[L.StepIdx] : null;
        LastStepName = step != null ? step.Name : "";
        if (hudStep != null)
        {
            hudStep.text = $"課目 {CurrentId}：{L.Def.Title}　ステップ {Math.Min(L.StepIdx + 1, L.Def.Steps.Count)}/{L.Def.Steps.Count} {LastStepName}";
            hudGuide.text = step != null ? School.StepGuide(step, L) : "";
            var o = L.S.Out;
            hudData.text = $"IAS {o.Ias:0} kt   ALT {o.AltTrue:0} ft   VS {o.Vsi:0} fpm   t={L.T:0.0}s";
        }
        if (L.Done && ResultSummary == "")
        {
            Rec.Done();
            var ana = Analysis.AnalyzeRecording(Rec.Last, new Analysis.GateOpts { Vref = 70 });
            string anaTxt = ana == null ? "解析なし" : $"接地 {ana.Landings.Count} 回・ゲート {(ana.Gate != null && ana.Gate.Stable ? "STABLE" : "—")}";
            ResultSummary = $"done grade={L.Grade} passed={L.Passed} score={L.Score:0.0000} t={L.T:0.00} steps={L.Results.Count} {anaTxt}";
            if (hudResult != null) hudResult.text = $"レッスン終了：評価 {L.Grade}（{(L.Passed ? "合格" : "再訓練")}）スコア {L.Score * 100:0} 点\n{anaTxt}";
            Debug.Log("LESSON_RESULT " + CurrentId + " " + ResultSummary);
        }
    }

    private void SyncVisual()
    {
        if (aircraft == null || L == null) return;
        var fwd = PhysMath.QRot(L.S.Q, new double[] { 0, 0, -1 });
        var up = PhysMath.QRot(L.S.Q, new double[] { 0, 1, 0 });
        aircraft.transform.position = SliceMain.ToUnity(L.S.Pos);
        var fU = new Vector3((float)fwd[0], (float)fwd[1], (float)(-fwd[2]));
        var uU = new Vector3((float)up[0], (float)up[1], (float)(-up[2]));
        if (fU.sqrMagnitude > 0.001f) aircraft.transform.rotation = Quaternion.LookRotation(fU, uU);
        modelRoot.transform.localRotation = Quaternion.Euler(0, 180, 0);
        if (cam != null)
        {
            Vector3 want = aircraft.transform.position - fU * 17f + uU * 5.5f;
            camPos = !camInit ? want : Vector3.Lerp(camPos, want, 0.12f);
            camInit = true;
            cam.transform.position = camPos;
            cam.transform.LookAt(aircraft.transform.position + fU * 12f);
        }
    }
}
