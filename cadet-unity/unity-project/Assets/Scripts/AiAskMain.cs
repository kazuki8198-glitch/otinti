// AiAskMain — the AI-instructor question panel (Stage 11): pick an
// instructor, tap a sample question (or the screen's question is set by
// code), and the answer comes from IAiInstructor — currently the offline
// CadetAiMock. The real API provider swaps in behind the same interface.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;

public class AiAskMain : MonoBehaviour
{
    public IAiInstructor Provider = new CadetAiMock();
    public string Instructor = "makabe";
    public Dict LastAnswer;
    Transform panel;
    readonly List<GameObject> dyn = new List<GameObject>();
    static readonly string[] SampleQuestions =
    {
        "離陸のコツを教えてください", "失速したらどうする？", "リードバックの要点は？",
        "燃料計画で大事なことは？", "マグネトーの点検で見る点は？", "霧が出たらどう判断する？",
        "VFR の条件を教えて", "ダイバートの判断は？",
    };
    void Awake()
    {
        var canvas = new GameObject("AiCanvas").AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.gameObject.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        canvas.gameObject.AddComponent<GraphicRaycaster>();
        panel = canvas.transform;
        Show();
    }
    void Clear() { foreach (var g in dyn) DestroyImmediate(g); dyn.Clear(); }
    RawImage Txt(string text, float x, float y, int w, int px, Color c)
    {
        var t = CadetUiTex.Text(panel, text, w, 44, px, c);
        CadetUiTex.Place(t.rectTransform, x, y); dyn.Add(t.gameObject); return t;
    }
    public void Show()
    {
        Clear();
        Txt("AI 教官に質問（モック応答：API キーは Secure Vault 前提で未接続）", 30, 16, 1400, 24, new Color(1f, 0.85f, 0.5f));
        float x = 30;
        foreach (var id in CadetAiMock.InstructorIds)
        {
            string v = id;
            var b = CadetUiTex.Btn(panel, id + "（" + CadetAiMock.SpecialtyOf(id) + "）", 300, 42, 15, Instructor == id ? new Color(0.85f, 0.6f, 0.15f) : new Color(0.16f, 0.22f, 0.34f), Color.white, () => { Instructor = v; Show(); });
            CadetUiTex.Place(b.GetComponent<RectTransform>(), x, 70); dyn.Add(b.gameObject); x += 312;
            if (x > 1600) { x = 30; }
        }
        float y = 130;
        foreach (var q0 in SampleQuestions)
        {
            string q = q0;
            var b = CadetUiTex.Btn(panel, q, 700, 42, 16, new Color(0.16f, 0.22f, 0.34f), Color.white, () => Ask(q));
            CadetUiTex.Place(b.GetComponent<RectTransform>(), 30, y); dyn.Add(b.gameObject); y += 52;
        }
        if (LastAnswer != null)
        {
            Txt(MiniJson.Str(LastAnswer, "name") + "：", 780, 130, 500, 19, new Color(1f, 0.75f, 0.5f));
            Txt(MiniJson.Str(LastAnswer, "answer"), 780, 176, 1000, 17, Color.white);
        }
    }
    public Dict Ask(string question)
    {
        LastAnswer = Provider.Ask(Instructor, question);
        Show();
        return LastAnswer;
    }
}
