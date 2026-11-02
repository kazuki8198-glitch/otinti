// DialogMain — the conversation screen (Stage 8): a uGUI panel driven by the
// ported DialogRunner. Speaker name in the speaker's color, the line, choice
// buttons when the node offers them, key hints for a line's other ways on,
// click / E to advance. The demo data is the people's conversation set (the
// academy cast), with the module's own sample context.
//
// Text is drawn with RasterCanvas (the glass rasterizer) into RawImages:
// legacy uGUI Text over a dynamic CJK font silently dropped glyphs in this
// Unity (atlas rebuilds invalidated baked meshes), while the rasterizer's
// text path is the one proven on the 737 glass.
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.UI;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;

public class DialogMain : MonoBehaviour
{
    public DialogRunner Runner;
    public DialogView Current { get; private set; }
    public int ViewsShown { get; private set; }

    GameObject panelGo, choiceRoot;
    RawImage nameImg, bodyImg, hintImg;
    RasterCanvas nameCv, bodyCv, hintCv;
    readonly List<Button> choiceButtons = new List<Button>();
    readonly List<RasterCanvas> choiceCvs = new List<RasterCanvas>();
    const int BodyW = 1500, BodyH = 190;

    static string Hex(Color c) { return "#" + ColorUtility.ToHtmlStringRGB(c); }

    RasterCanvas MakeLabel(Transform parent, Vector2 aMin, Vector2 aMax, int w, int h, out RawImage img)
    {
        var go = new GameObject("Label");
        go.transform.SetParent(parent, false);
        img = go.AddComponent<RawImage>();
        var cv = new RasterCanvas(w, h);
        img.texture = cv.Tex;
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = aMin; rt.anchorMax = aMax; rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
        return cv;
    }

    static void DrawLine(RasterCanvas cv, string text, double size, string color, string align = "left")
    {
        cv.ClearAll();
        cv.FillStyle = color; cv.Font = new FontSpec(size, 400, false);
        cv.TextAlign = align; cv.TextBaseline = "middle";
        double x = align == "right" ? cv.W - 4 : 4;
        cv.FillText(text, x, cv.H / 2.0);
        cv.Upload();
    }

    void DrawBody(string text, string color)
    {
        bodyCv.ClearAll();
        bodyCv.FillStyle = color; bodyCv.Font = new FontSpec(30, 400, false);
        bodyCv.TextAlign = "left"; bodyCv.TextBaseline = "middle";
        // wrap by measured advance (CJK-safe), up to the canvas' lines
        var words = new List<string>();
        string cur = "";
        foreach (var ch in text)
        {
            string next = cur + ch;
            if (bodyCv.MeasureText(next, bodyCv.Font) > BodyW - 16 && cur.Length > 0) { words.Add(cur); cur = ch.ToString(); }
            else cur = next;
        }
        if (cur.Length > 0) words.Add(cur);
        double lh = 44;
        for (int i = 0; i < words.Count && i < 4; i++) bodyCv.FillText(words[i], 6, 26 + i * lh);
        bodyCv.Upload();
    }

    public void BuildUi()
    {
        var canvasGo = new GameObject("DialogCanvas");
        canvasGo.transform.SetParent(transform, false);
        var canvas = canvasGo.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        var scaler = canvasGo.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1600, 1000);
        canvasGo.AddComponent<GraphicRaycaster>();

        panelGo = new GameObject("Panel");
        panelGo.transform.SetParent(canvasGo.transform, false);
        var panelImg = panelGo.AddComponent<Image>();
        panelImg.color = new Color(0.03f, 0.05f, 0.08f, 0.92f);
        var prt = panelGo.GetComponent<RectTransform>();
        prt.anchorMin = new Vector2(0.06f, 0.04f); prt.anchorMax = new Vector2(0.94f, 0.34f);
        prt.offsetMin = Vector2.zero; prt.offsetMax = Vector2.zero;
        var panelButton = panelGo.AddComponent<Button>();
        panelButton.transition = Selectable.Transition.None;
        panelButton.onClick.AddListener(ClickNext);

        nameCv = MakeLabel(panelGo.transform, new Vector2(0.015f, 0.76f), new Vector2(0.62f, 0.99f), 760, 54, out nameImg);
        bodyCv = MakeLabel(panelGo.transform, new Vector2(0.015f, 0.24f), new Vector2(0.985f, 0.78f), BodyW, BodyH, out bodyImg);
        hintCv = MakeLabel(panelGo.transform, new Vector2(0.40f, 0.01f), new Vector2(0.985f, 0.15f), 900, 40, out hintImg);

        choiceRoot = new GameObject("Choices");
        choiceRoot.transform.SetParent(canvasGo.transform, false);
        var crt = choiceRoot.AddComponent<RectTransform>();
        crt.anchorMin = new Vector2(0.30f, 0.36f); crt.anchorMax = new Vector2(0.94f, 0.92f);
        crt.offsetMin = Vector2.zero; crt.offsetMax = Vector2.zero;
        var layout = choiceRoot.AddComponent<VerticalLayoutGroup>();
        layout.spacing = 10; layout.childControlWidth = true; layout.childControlHeight = false;
        layout.childForceExpandWidth = true; layout.childForceExpandHeight = false;
        layout.reverseArrangement = true;
    }

    public bool LoadPeople()
    {
        string dir = Path.Combine(Application.streamingAssetsPath, "cadet-data");
        var trees = (Dict)MiniJson.Parse(File.ReadAllText(Path.Combine(dir, "dialog-trees.json")));
        var peopleMod = (Dict)MiniJson.Parse(File.ReadAllText(Path.Combine(dir, "dialog-people.json")));
        var data = (Dict)trees["people"];
        var ctx = peopleMod.TryGetValue("SAMPLE_CTX", out var sc) ? (Dict)sc : new Dict();
        Runner = new DialogRunner(data, DialogEngine.CreateDialogState(), () => ctx);
        Runner.OnChange(v => { Current = v; if (v != null) ViewsShown++; Refresh(); });
        return true;
    }

    public bool StartDialog(string id) { Refresh(); return Runner.Start(id); }

    void Refresh()
    {
        var v = Current;
        bool on = v != null;
        panelGo.SetActive(on);
        choiceRoot.SetActive(on);
        if (!on) return;
        DrawLine(nameCv, v.Name, 32, string.IsNullOrEmpty(v.Color) ? "#ffffff" : v.Color);
        DrawBody(v.Text, "#ffffff");
        TtsMain.Speak(v.Text);   // Stage 13: voice on Windows via the SAPI bridge (no-op elsewhere)
        foreach (var b in choiceButtons) Destroy(b.gameObject);
        choiceButtons.Clear(); choiceCvs.Clear();
        if (v.Choices.Count > 0)
        {
            DrawLine(hintCv, "", 22, "#a6bcd9", "right");
            for (int i = 0; i < v.Choices.Count; i++)
            {
                int idx = i;
                var bgo = new GameObject("Choice" + i);
                bgo.transform.SetParent(choiceRoot.transform, false);
                var img = bgo.AddComponent<Image>(); img.color = new Color(0.10f, 0.16f, 0.24f, 0.95f);
                var btn = bgo.AddComponent<Button>(); btn.targetGraphic = img;
                btn.onClick.AddListener(() => ClickChoice(idx));
                var le = bgo.AddComponent<LayoutElement>(); le.preferredHeight = 58; le.preferredWidth = 900;
                var lgo = new GameObject("Label"); lgo.transform.SetParent(bgo.transform, false);
                var raw = lgo.AddComponent<RawImage>();
                var cv = new RasterCanvas(1100, 54);
                raw.texture = cv.Tex;
                var rt = lgo.GetComponent<RectTransform>();
                rt.anchorMin = new Vector2(0.01f, 0); rt.anchorMax = new Vector2(0.99f, 1);
                rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
                DrawLine(cv, v.Choices[i].Text, 27, "#ffffff");
                choiceButtons.Add(btn); choiceCvs.Add(cv);
            }
        }
        else
        {
            var hints = new List<string>();
            if (v.Keys != null) foreach (var k in v.Keys) hints.Add($"[{k.Key}] {k.Text}");
            hints.Add(v.Ends ? "クリックで閉じる" : "クリックで次へ");
            DrawLine(hintCv, string.Join("　", hints), 22, "#a6bcd9", "right");
        }
    }

    public void ClickNext() { if (Runner != null && Current != null && Current.Choices.Count == 0) Runner.Next(); }
    public void ClickChoice(int i) { if (Runner != null) Runner.Choose(i); }
    public void PressKey(string key) { if (Runner != null) Runner.Press(key); }
    public int ChoiceCount { get { return choiceButtons.Count; } }
    public void ClickChoiceButton(int i) { if (i >= 0 && i < choiceButtons.Count) choiceButtons[i].onClick.Invoke(); }

    void Update()
    {
        if (Runner == null || Current == null) return;
        if (Input.GetKeyDown(KeyCode.E) || Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0)) ClickNext();
        if (Current.Keys != null) foreach (var k in Current.Keys)
            if (Input.GetKeyDown(k.Key.ToLowerInvariant())) PressKey(k.Key);
    }
}
