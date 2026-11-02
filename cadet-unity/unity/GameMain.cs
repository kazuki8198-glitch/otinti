// GameMain — the integrated game's hub (Stage 12): adds launcher buttons
// for the ported screens (free mode, line ops, AI instructor, walking) to
// SliceMain's title panel, and manages one-panel-at-a-time display with a
// return button. The flight itself (career/free) stays SliceMain's.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class GameMain : MonoBehaviour
{
    public GameObject FreeModeRoot, LineRoot, AiRoot, WalkRoot, CareerRoot;
    public string OpenPanel = "";
    GameObject titlePanel, backButton;
    readonly Dictionary<string, GameObject> panels = new Dictionary<string, GameObject>();

    void Start()
    {
        titlePanel = GameObject.Find("TitlePanel");
        if (titlePanel == null) { Debug.Log("GAME_MAIN_NO_TITLE"); return; }
        panels["free"] = FreeModeRoot; panels["line"] = LineRoot; panels["ai"] = AiRoot; panels["walk"] = WalkRoot; panels["career"] = CareerRoot;
        AddHubButton("フリーモード設定", -170, "free");
        AddHubButton("ライン運航（副操縦士）", -245, "line");
        AddHubButton("AI 教官に質問", -320, "ai");
        AddHubButton("歩行：寮・学園を歩く", -395, "walk");
        AddHubButton("キャリア（訓練課程）", -470, "career");
        // the return button lives on SliceMain's canvas
        var canvas = titlePanel.transform.parent;
        var go = new GameObject("HubBack");
        go.transform.SetParent(canvas, false);
        var img = go.AddComponent<Image>(); img.color = new Color(0.5f, 0.2f, 0.12f, 0.95f);
        var btn = go.AddComponent<Button>(); btn.targetGraphic = img;
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = rt.anchorMax = new Vector2(1, 1); rt.pivot = new Vector2(1, 1);
        rt.sizeDelta = new Vector2(220, 54); rt.anchoredPosition = new Vector2(-16, -16);
        var tgo = new GameObject("T"); tgo.transform.SetParent(go.transform, false);
        var t = tgo.AddComponent<Text>(); t.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        t.text = "タイトルへ戻る"; t.fontSize = 22; t.color = Color.white; t.alignment = TextAnchor.MiddleCenter;
        var trt = tgo.GetComponent<RectTransform>(); trt.anchorMin = Vector2.zero; trt.anchorMax = Vector2.one; trt.offsetMin = Vector2.zero; trt.offsetMax = Vector2.zero;
        btn.onClick.AddListener(ClosePanel);
        backButton = go; backButton.SetActive(false);
        Debug.Log("GAME_HUB_READY");
    }
    void AddHubButton(string label, float y, string key)
    {
        var go = new GameObject("Hub-" + key);
        go.transform.SetParent(titlePanel.transform, false);
        var img = go.AddComponent<Image>(); img.color = new Color(0.16f, 0.35f, 0.3f, 0.95f);
        var btn = go.AddComponent<Button>(); btn.targetGraphic = img;
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f); rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(420, 62); rt.anchoredPosition = new Vector2(0, y);
        var tgo = new GameObject("T"); tgo.transform.SetParent(go.transform, false);
        var t = tgo.AddComponent<Text>(); t.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        t.text = label; t.fontSize = 26; t.color = Color.white; t.alignment = TextAnchor.MiddleCenter;
        var trt = tgo.GetComponent<RectTransform>(); trt.anchorMin = Vector2.zero; trt.anchorMax = Vector2.one; trt.offsetMin = Vector2.zero; trt.offsetMax = Vector2.zero;
        string k = key;
        btn.onClick.AddListener(() => Open(k));
        go.name = "Hub-" + key;
    }
    public void Open(string key)
    {
        if (!panels.TryGetValue(key, out var root) || root == null) return;
        ClosePanel();
        root.SetActive(true);
        OpenPanel = key;
        if (titlePanel != null) titlePanel.SetActive(false);
        if (backButton != null) backButton.SetActive(true);
        Debug.Log("GAME_PANEL_OPEN " + key);
    }
    public void ClosePanel()
    {
        foreach (var kv in panels) if (kv.Value != null) kv.Value.SetActive(false);
        OpenPanel = "";
        if (backButton != null) backButton.SetActive(false);
        if (titlePanel != null && (SliceMain.Instance == null || !SliceMain.Instance.InFlight)) titlePanel.SetActive(true);
    }
}
