// CareerMain — the career screen (Stage 15): the schedule → the day's items
// （座学/会話/レッスン/試験/審査） → results → next day, wired as one playable
// flow on top of the ported career core (CadetCareer), exactly the op script
// the equivalence bots verified (BotCs / BotDay2Cs), with main.js's dayOver
// semantics where they differ. Flight days run the ported Day machine
// (walkaround → checklists → ATC → lessons flown by BotFly → debrief);
// exams and FTD lessons draw their questions through CadetQuiz (the school.js
// draw, verified against the original algorithm); conversations run on the
// ported DialogRunner with the career context (miss / TEM / today).
//
// Persistence: a file-backed ICareerStore at
// Application.persistentDataPath/cadet-career-save.json holding the career
// state (cadet.career), the lesson progress (cadet.prog) and the screen's
// trust value (cadet.trust).
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.UI;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public class CareerMain : MonoBehaviour
{
    public Career Career;
    public Prog Prog;
    public double TrustNow = 50;
    public LineMain Line;
    public GameMain Game;
    public bool AutoPlay;                 // the acceptance driver: radio choices inside a flight day answer themselves (through the real buttons)
    public string LastError = "";
    public bool Busy { get { return flow != null; } }
    public Dict CurrentItem { get; private set; }
    public string View = "schedule";

    class FileStore : ICareerStore
    {
        public readonly Dictionary<string, string> Map = new Dictionary<string, string>();
        public string Path_;
        public void LoadFile()
        {
            if (Path_ == null || !File.Exists(Path_)) return;
            var d = (Dict)MiniJson.Parse(File.ReadAllText(Path_));
            foreach (var kv in d) if (kv.Value is string) Map[kv.Key] = (string)kv.Value;
        }
        public void Flush()
        {
            if (Path_ == null) return;
            var d = new Dict();
            foreach (var kv in Map) d[kv.Key] = kv.Value;
            File.WriteAllText(Path_, MiniJson.Stringify(d));
        }
        public string GetItem(string key) { string v; return Map.TryGetValue(key, out v) ? v : null; }
        public void SetItem(string key, string value) { Map[key] = value; Flush(); }
    }
    FileStore store;
    Transform panel;
    readonly List<GameObject> dyn = new List<GameObject>();
    Coroutine flow;

    // ---- data loaded once ----
    static bool dataLoaded;
    static WalkKit archerKit, seminoleKit;
    static Dict dialogTrees, summaries, textbook;
    static string DataDir { get { return Path.Combine(Application.streamingAssetsPath, "cadet-data"); } }
    static string ReadData(string f) { return File.ReadAllText(Path.Combine(DataDir, f)); }

    // ---- driver-facing handles ----
    public readonly List<Button> ItemButtons = new List<Button>();
    public readonly List<Dict> ItemList = new List<Dict>();
    public Button SleepButton, DlgNextButton, QuizNextButton, FlowNextButton;
    public readonly List<Button> DlgChoiceButtons = new List<Button>();
    public readonly List<Button> QuizOptionButtons = new List<Button>();
    public readonly List<Button> FlowButtons = new List<Button>();
    public int QuizCorrectIndex = -1;
    public string FlightPhaseText = "";

    void Awake()
    {
        LoadDataOnce();
        store = new FileStore { Path_ = Path.Combine(Application.persistentDataPath, "cadet-career-save.json") };
        store.LoadFile();
        BuildCareerFromStore();
        BuildUi();
        ShowSchedule();
    }

    static void LoadDataOnce()
    {
        if (dataLoaded) return;
        dataLoaded = true;
        QuizData.Load(ReadData("quiz.json"), ReadData("answer-map.json"), ReadData("scene-answers.json"), ReadData("radio-data.json"), ReadData("gamebook.json"));
        archerKit = WalkKit.FromJson((Dict)MiniJson.Parse(ReadData("walkaround-archer.json")));
        seminoleKit = WalkKit.FromJson((Dict)MiniJson.Parse(ReadData("walkaround-seminole.json")));
        dialogTrees = (Dict)MiniJson.Parse(ReadData("dialog-trees.json"));
        summaries = (Dict)((Dict)MiniJson.Parse(ReadData("lecture-summaries.json")))["SUMMARIES"];
        textbook = (Dict)MiniJson.Parse(ReadData("textbook-fl.json"));
        // the class section lists the career core's HeardSet expects
        var gb = (Dict)MiniJson.Parse(ReadData("gamebook.json"));
        var chSecs = new Dictionary<string, List<string>>();
        foreach (var co in (Lst)gb["chapters"])
        {
            var cd = (Dict)co; var secs = new List<string>();
            foreach (var so in (Lst)cd["sections"]) secs.Add(Js.Str((Dict)so, "id"));
            chSecs[Js.Str(cd, "id")] = secs;
        }
        var built = new List<List<string>>();
        for (int i = 0; i < CareerData.CLASSES.Length; i++)
        {
            var l = new List<string>();
            foreach (var chId in CareerData.CLASSES[i]) if (chSecs.TryGetValue(chId, out var ss)) l.AddRange(ss);
            built.Add(l);
        }
        CareerLogic.ClassSections = built;
    }

    void BuildCareerFromStore()
    {
        Career = new Career(store);
        if (Js.Get(Career.State, "seed") == null) Career = new Career(store, (uint)UnityEngine.Random.Range(1, int.MaxValue));
        Prog = new Prog();
        var raw = store.GetItem("cadet.prog");
        if (raw != null)
        {
            var pd = (Dict)MiniJson.Parse(raw);
            var lessons = Js.Obj(Js.Get(pd, "lessons"));
            if (lessons != null) foreach (var kv in lessons)
            {
                var rd = (Dict)kv.Value; var rec = new Prog.Rec();
                rec.Tries = (int)Js.Num(rd, "tries"); rec.Best = Js.Str(rd, "best", ""); rec.Pass = Js.Bool(rd, "pass");
                var lv = Js.Arr(Js.Get(rd, "levels")); if (lv != null) foreach (var x in lv) rec.Levels.Add((string)x);
                if (Js.Get(rd, "score") is double) { rec.HasScore = true; rec.Score = (double)Js.Get(rd, "score"); }
                Prog.Lessons[kv.Key] = rec;
            }
        }
        var tr = store.GetItem("cadet.trust");
        TrustNow = tr != null ? double.Parse(tr, System.Globalization.CultureInfo.InvariantCulture) : 50;
    }

    public void SaveProg()
    {
        var lessons = new Dict();
        foreach (var kv in Prog.Lessons)
        {
            var r = kv.Value;
            var lv = new Lst(); foreach (var s in r.Levels) lv.Add(s);
            var rec = new Dict { { "tries", (double)r.Tries }, { "best", r.Best }, { "pass", r.Pass }, { "levels", lv } };
            if (r.HasScore) rec["score"] = r.Score;
            lessons[kv.Key] = rec;
        }
        store.SetItem("cadet.prog", MiniJson.Stringify(new Dict { { "lessons", lessons } }));
        store.SetItem("cadet.trust", TrustNow.ToString(System.Globalization.CultureInfo.InvariantCulture));
    }

    /// <summary>Test hook: wipe the save and start a fresh career with a fixed seed.</summary>
    public void ResetAll(uint seed)
    {
        if (flow != null) { StopCoroutine(flow); flow = null; }
        if (File.Exists(store.Path_)) File.Delete(store.Path_);
        store.Map.Clear();
        Career = new Career(store, seed);
        Prog = new Prog(); TrustNow = 50;
        SaveProg();
        ShowSchedule();
    }

    // ================= UI scaffolding =================
    void BuildUi()
    {
        var canvasGo = new GameObject("CareerCanvas");
        canvasGo.transform.SetParent(transform, false);
        var canvas = canvasGo.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasGo.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        canvasGo.AddComponent<GraphicRaycaster>();
        panel = canvasGo.transform;
    }
    void ClearDyn() { foreach (var g in dyn) DestroyImmediate(g); dyn.Clear(); ItemButtons.Clear(); ItemList.Clear(); DlgChoiceButtons.Clear(); QuizOptionButtons.Clear(); FlowButtons.Clear(); }
    RawImage Txt(string text, float x, float y, int w, int px, Color c)
    {
        var t = CadetUiTex.Text(panel, text, w, 44, px, c);
        CadetUiTex.Place(t.rectTransform, x, y); dyn.Add(t.gameObject); return t;
    }
    // wrapped multi-line text through the rasterizer (DialogMain's lesson)
    RawImage Wrap(string text, float x, float y, int w, int h, int px, Color c)
    {
        var rc = new RasterCanvas(w, h);
        rc.ClearAll();
        rc.FillStyle = "#" + ColorUtility.ToHtmlStringRGB(c);
        rc.Font = new FontSpec(px, 400, false);
        rc.TextAlign = "left"; rc.TextBaseline = "middle";
        var lines = new List<string>();
        string cur = "";
        foreach (var ch in (text ?? "").Replace("\r", ""))
        {
            if (ch == '\n') { lines.Add(cur); cur = ""; continue; }
            string next = cur + ch;
            if (rc.MeasureText(next, rc.Font) > w - 12 && cur.Length > 0) { lines.Add(cur); cur = ch.ToString(); }
            else cur = next;
        }
        if (cur.Length > 0) lines.Add(cur);
        double lh = px * 1.45;
        for (int i = 0; i < lines.Count && (i + 1) * lh <= h + lh * 0.4; i++) rc.FillText(lines[i], 6, lh * (i + 0.5));
        rc.Upload();
        var go = new GameObject("W"); go.transform.SetParent(panel, false);
        var ri = go.AddComponent<RawImage>(); ri.texture = rc.Tex; ri.raycastTarget = false;
        var rt = go.GetComponent<RectTransform>(); rt.sizeDelta = new Vector2(w, h);
        CadetUiTex.Place(rt, x, y); dyn.Add(go);
        return ri;
    }
    Button Btn(string label, float x, float y, int w, Action onClick, int px = 18, int h = 44)
    {
        var b = CadetUiTex.Btn(panel, label, w, h, px, new Color(0.16f, 0.22f, 0.34f), Color.white, onClick);
        CadetUiTex.Place(b.GetComponent<RectTransform>(), x, y); dyn.Add(b.gameObject); return b;
    }
    void Header()
    {
        var st = Career.State;
        var ch = CareerData.CHAPTERS.TryGetValue(Career.Chapter, out var cd) ? cd : null;
        Txt($"キャリア — {Career.Date()}／{(ch != null ? ch.Title : Career.Chapter)}／{CareerData.SLOT_NAMES[Career.Slot]}", 30, 14, 1500, 25, new Color(1f, 0.85f, 0.5f));
        var ab = Career.AbilitiesCopy();
        Txt($"能力：操縦 {Js.Num(ab, "hand"):F0}／知識 {Js.Num(ab, "know"):F0}／交信 {Js.Num(ab, "comm"):F0}／判断 {Js.Num(ab, "judge"):F0}　疲労 {Js.Num(st, "fatigue"):F0}　信頼 {CareerLogic.TrustBand(TrustNow)}（{TrustNow:F0}）", 30, 58, 1500, 18, new Color(0.8f, 0.9f, 1f));
    }

    // ================= the schedule =================
    public void ShowSchedule()
    {
        View = "schedule"; CurrentItem = null;
        ClearDyn(); Header();
        var sch = Career.Schedule(Prog, TrustNow);
        Txt("今日の予定（上から順に進めてください）", 30, 108, 900, 20, Color.white);
        float y = 160;
        foreach (var it in sch)
        {
            string kind = Js.Str(it, "kind"), id = Js.Str(it, "id");
            bool done = id != null && Career.DoneToday(kind, id);
            var captured = it;
            var b = Btn($"{CareerData.SLOT_NAMES[Js.Str(it, "slot")]}　{Js.Str(it, "title")}{(done ? "　✓完了" : "")}", 30, y, 1150, () => StartItem(captured));
            if (done) b.GetComponent<Image>().color = new Color(0.2f, 0.35f, 0.2f);
            ItemButtons.Add(b); ItemList.Add(it);
            y += 56;
        }
        var gate = Career.Gate(Prog, TrustNow);
        if (gate.Count > 0) Txt("次の段階まで：" + string.Join("、", gate), 30, y + 6, 1500, 17, new Color(1f, 0.75f, 0.5f));
        else Txt("次の段階への条件は揃っています。就寝すると進みます。", 30, y + 6, 1500, 17, new Color(0.6f, 1f, 0.7f));
        SleepButton = Btn("就寝する（翌日へ）", 1250, 160, 320, () => Sleep(), 20);
        if (!string.IsNullOrEmpty(LastError)) Txt(LastError, 30, y + 48, 1600, 17, new Color(1f, 0.55f, 0.45f));
    }

    void Sleep()
    {
        if (Career.Gate(Prog, TrustNow).Count == 0)
        {
            string ch = Career.Chapter;
            if (ch == "ch6") { Career.Graduate(Prog); Career.BeginEndorsement(); }
            else if (ch == "ch7") Career.BeginFirstOfficer();
            else if (ch != "fo2") Career.AdvanceChapter(Prog, TrustNow);
        }
        Career.Sleep(false);
        SaveProg();
        ShowSchedule();
    }

    void FinishItem() { Career.Advance(); SaveProg(); ShowSchedule(); }

    // ================= item dispatch =================
    void StartItem(Dict it)
    {
        if (flow != null || View != "schedule") return;
        CurrentItem = it;
        string kind = Js.Str(it, "kind"), id = Js.Str(it, "id");
        switch (kind)
        {
            case "ceremony": InfoItem(it, "入社の式。ロビーで所長と教官団に迎えられ、訓練生としての一歩が始まります。", () => { Career.Done("ceremony", "welcome"); FinishItem(); }); break;
            case "tour": InfoItem(it, "訓練所の案内。運航管理の席から格納庫、教室、シミュレーター室までを回ります。", () => { Career.Done("tour", "tour"); FinishItem(); }); break;
            case "brief": RunDialogItem(it, "career", "meet", () => { Career.Done("brief", "meet"); Career.FinishPrologue(); FinishItem(); }); break;
            case "event": RunDialogItem(it, "event_" + id, "ev", () => { Career.Done("event", id); FinishItem(); }); break;
            case "graduation": RunDialogItem(it, "career", "grad", () => { Career.Done("graduation", "grad"); FinishItem(); }); break;
            case "class": flow = StartCoroutine(RunClass(it)); break;
            case "ftd": StartFtd(it); break;
            case "exam": flow = StartCoroutine(RunExam(it)); break;
            case "flight": case "solo": case "checkride": case "xc": case "night": flow = StartCoroutine(RunFlightItem(it)); break;
            case "navlog": flow = StartCoroutine(RunNavlog(it)); break;
            case "study": StartStudy(it); break;
            case "line": StartLineItem(it, false); break;
            case "linecheck": StartLineItem(it, true); break;
            case "off": InfoItem(it, Js.Str(it, "title"), null); break;
            default: InfoItem(it, Js.Str(it, "title"), () => { if (id != null) Career.Done(kind, id); FinishItem(); }); break;
        }
    }

    void InfoItem(Dict it, string body, Action onDone)
    {
        View = "info"; ClearDyn(); Header();
        Txt(Js.Str(it, "title"), 30, 120, 1400, 23, new Color(1f, 0.85f, 0.5f));
        Wrap(body, 30, 180, 1400, 220, 20, Color.white);
        FlowNextButton = Btn("進む", 30, 430, 260, () => { if (onDone != null) onDone(); else ShowSchedule(); });
        FlowButtons.Add(FlowNextButton);
    }

    void StartStudy(Dict it)
    {
        string id = Js.Str(it, "id");
        if (id == "weather")
        {
            flow = StartCoroutine(StudyWeather(it));
        }
        else if (id == "remedial")
        {
            InfoItem(it, "補習ドリル。前回のつまずきを、地上でもう一度だけ練習します。", () => { Career.Drill(); Career.Done("study", "remedial"); FinishItem(); });
        }
        else InfoItem(it, Js.Str(it, "title") + "。次の段階に備えて、教科書で予習します。", () => { Career.Done("study", id ?? "std"); FinishItem(); });
    }

    // the fly / wait / morning-only / cancel decision, as the game asks it
    IEnumerator WeatherDecision(Dict it, Action<string> onChoice, bool allowFly)
    {
        View = "weather"; ClearDyn(); Header();
        var wx = Career.Weather(Prog);
        Txt("朝の天気判断 — " + Js.Str(wx, "ja"), 30, 120, 1400, 22, new Color(1f, 0.85f, 0.5f));
        var metar = Js.Obj(Js.Get(wx, "metar"));
        Wrap($"METAR（午前）「{(metar != null ? Js.Str(metar, "am") : "")}」／METAR（午後）「{(metar != null ? Js.Str(metar, "pm") : "")}」／TAF「{Js.Str(wx, "taf")}」\n{Js.Str(wx, "why")}", 30, 170, 1500, 160, 19, Color.white);
        string[] ids = { "go", "wait", "early", "cancel" };
        string[] labels = { "飛ぶ", "午後まで待つ", "午前だけ飛ぶ", "今日は飛ばない" };
        string chosen = null;
        for (int i = 0; i < 4; i++)
        {
            string cid = ids[i];
            var b = Btn(labels[i], 30, 350 + i * 56, 500, () => { chosen = cid; });
            FlowButtons.Add(b);
        }
        while (chosen == null) yield return null;
        onChoice(chosen);
    }

    IEnumerator StudyWeather(Dict it)
    {
        yield return WeatherDecision(it, choice =>
        {
            Career.Decision(choice, Career.Weather(Prog));
            Career.Done("study", "weather");
        }, true);
        flow = null;
        FinishItem();
    }

    // ================= conversations =================
    DialogRunner dlg;
    Action dlgDoneCb;
    public string DlgNodeId { get { return dlg != null && dlg.View() != null ? dlg.View().Node : null; } }
    public bool DlgRunning { get { return dlg != null && dlg.Running; } }

    Dict BuildCtx()
    {
        var c = new Dict();
        c["career"] = Career.State;
        var miss = CareerLogic.MissAsk(Career.State);
        if (miss != null)
        {
            var opts = (Lst)miss["options"];
            c["miss"] = new Dict { { "label", miss["label"] }, { "o0", opts[0] }, { "o1", opts[1] }, { "o2", opts[2] }, { "right", miss["right"] } };
        }
        try
        {
            var wx = Career.Weather(Prog);
            var tem = CadetTem.TemFor(new TemOpts { Weather = Js.Str(wx, "kind"), Fatigue = Js.Num(Career.State, "fatigue"), Chapter = Career.Chapter, Aircraft = "pa28", Day = Career.Day });
            var t = (Dict)tem["threat"]; var tops = (Lst)tem["options"]; var others = (Lst)tem["others"];
            int right = (int)(double)tem["right"];
            c["tem"] = new Dict { { "on", true }, { "threat", t["ja"] }, { "why", t["why"] }, { "plan", t["plan"] },
                { "not", right < others.Count ? others[right] : "" }, { "o0", tops[0] }, { "o1", tops.Count > 1 ? tops[1] : "" }, { "o2", tops.Count > 2 ? tops[2] : "" }, { "right", tem["right"] } };
        }
        catch { c["tem"] = new Dict { { "on", false }, { "threat", "" }, { "why", "" }, { "plan", "" }, { "not", "" }, { "o0", "" }, { "o1", "" }, { "o2", "" } }; }
        var today = new Dict { { "checkTitle", "" }, { "checkWho", "" }, { "studyTitle", "" } };
        foreach (var it in Career.Schedule(Prog, TrustNow))
        {
            string k = Js.Str(it, "kind");
            if (k == "checkride" || k == "xc") { today["checkTitle"] = Js.Str(it, "title"); today["checkWho"] = Js.Str(it, "who") ?? ""; }
            if (k == "study" || k == "class") today["studyTitle"] = Js.Str(it, "title");
        }
        c["today"] = today;
        c["weather"] = Career.Weather(Prog);
        c["quiz"] = new Dict { { "right", 0.0 }, { "n", 0.0 }, { "pct", 0.0 }, { "pass", false } };
        return c;
    }

    void RunDialogItem(Dict it, string setName, string dialogId, Action onDone)
    {
        View = "dialog"; ClearDyn(); Header();
        if (!dialogTrees.TryGetValue(setName, out var setObj) || !(setObj is Dict))
        {
            LastError = $"会話セット {setName} が dialog-trees.json にありません（項目：{Js.Str(it, "title")}）。この遷移は未結線です。";
            ShowSchedule();
            return;
        }
        dlgDoneCb = onDone;
        dlg = new DialogRunner((Dict)setObj, DialogEngine.CreateDialogState(), () => BuildCtx());
        dlg.OnChange(v => RenderDialog());
        bool started;
        try { started = dlg.Start(dialogId); }
        catch (Exception ex) { started = false; LastError = $"会話 {setName}/{dialogId} の開始で例外：{ex.Message}（項目：{Js.Str(it, "title")}）"; }
        if (!started)
        {
            if (string.IsNullOrEmpty(LastError)) LastError = $"会話 {setName}/{dialogId} を開始できませんでした（項目：{Js.Str(it, "title")}）。この遷移は未結線です。";
            dlg = null; dlgDoneCb = null;
            ShowSchedule();
            return;
        }
        RenderDialog();
    }

    void RenderDialog()
    {
        if (View != "dialog") return;
        ClearDyn(); Header();
        var v = dlg != null ? dlg.View() : null;
        if (v == null)
        {
            // the conversation ended
            var cb = dlgDoneCb; dlg = null; dlgDoneCb = null;
            if (cb != null) cb();
            return;
        }
        Txt(string.IsNullOrEmpty(v.Name) ? v.Speaker : v.Name, 30, 120, 900, 24, ColorFromHex(v.Color));
        Wrap(v.Text, 30, 170, 1500, 200, 22, Color.white);
        if (v.Choices.Count > 0)
        {
            float y = 400;
            foreach (var (ci, text) in v.Choices)
            {
                int idx = ci;
                var b = Btn(text, 30, y, 1250, () => { dlg.Choose(idx); });
                DlgChoiceButtons.Add(b);
                y += 56;
            }
        }
        else
        {
            DlgNextButton = Btn(v.Ends ? "閉じる" : "次へ（E / Space）", 30, 400, 340, () => DlgAdvance());
            FlowButtons.Add(DlgNextButton);
        }
    }

    void DlgAdvance() { if (dlg != null && dlg.Running) dlg.Next(); }
    /// <summary>The virtual-key path (the same handler the real E/Space keys call).</summary>
    public void SimKey(string key)
    {
        if (View == "dialog" && dlg != null)
        {
            var v = dlg.View();
            if (v != null && v.Choices.Count == 0) DlgAdvance();
            else if (v != null) dlg.Press(key);
        }
    }
    void Update()
    {
        if (View == "dialog" && dlg != null && gameObject.activeInHierarchy)
        {
            if (Input.GetKeyDown(KeyCode.E) || Input.GetKeyDown(KeyCode.Space)) SimKey("e");
        }
        PollLineItem();
    }
    static Color ColorFromHex(string hex)
    {
        if (!string.IsNullOrEmpty(hex) && ColorUtility.TryParseHtmlString(hex, out var c)) return c;
        return Color.white;
    }

    // ================= classes =================
    IEnumerator RunClass(Dict it)
    {
        View = "class";
        int idx = int.Parse(Js.Str(it, "id"));
        int attempt = Career.Attempt($"class:{idx}");
        string pace = Js.Str(Career.State, "lastPace") ?? "need";
        // 1) pace choice
        string chosenPace = null;
        ClearDyn(); Header();
        Txt(Js.Str(it, "title") + " — 進め方を選んでください", 30, 120, 1400, 22, new Color(1f, 0.85f, 0.5f));
        var paces = new[] { ("need", "要点だけ（まとめカード＋確認ドリル）"), ("full", "全文を読む（教科書の本文）"), ("quick", "速く（カードだけ・ドリルなし）") };
        float py = 180;
        foreach (var (pid, label) in paces)
        {
            string cp = pid;
            var b = Btn(label + (pace == pid ? "（前回の選択）" : ""), 30, py, 760, () => { chosenPace = cp; });
            FlowButtons.Add(b); py += 56;
        }
        while (chosenPace == null) yield return null;
        pace = chosenPace;
        // 2) the sections, one page each
        var secs = CareerLogic.ClassSections[idx];
        var summariesOf = summaries;
        for (int si = 0; si < secs.Count; si++)
        {
            string secId = secs[si];
            ClearDyn(); Header();
            Txt($"{Js.Str(it, "title")} — {SecTitle(secId)}（{si + 1} / {secs.Count} 節）", 30, 120, 1500, 21, new Color(1f, 0.85f, 0.5f));
            string body = pace == "full" ? SectionProse(secId) : SectionSummary(secId);
            if (string.IsNullOrEmpty(body)) body = SectionSummary(secId);
            Wrap(body, 30, 170, 1500, 460, 20, Color.white);
            bool next = false;
            FlowNextButton = Btn(si == secs.Count - 1 ? "読み終わる" : "次の節へ", 30, 660, 300, () => { next = true; });
            FlowButtons.Add(FlowNextButton);
            while (!next) yield return null;
        }
        // 3) the confirmation drill (not for the quick pace)
        if (pace != "quick")
        {
            var drill = ExamDraw.ClassDrill(idx, Career.HeardSet(), Js.Num(Career.State, "seed"), attempt);
            if (drill.Count > 0)
            {
                QuizRun drillRun = null;
                yield return RunQuiz(new QuizSpec { Title = "確認ドリル（点数には入りません）", Qs = drill }, r => drillRun = r);
            }
        }
        Career.SetPace(pace);
        Career.Tire(6);
        foreach (var g in CareerLogic.ClassGrowth(pace)) Career.Grow(g.Axis, g.V, "class:" + idx);
        foreach (var secId in secs) Career.HeardSection(secId, pace == "full" ? "f" : "q");
        Career.Done("class", idx.ToString());
        flow = null;
        FinishItem();
    }

    string SecTitle(string secId)
    {
        if (textbook != null && Js.Get(textbook, "CHAPTERS") is Lst chs)
            foreach (var co in chs) foreach (var so in (Lst)((Dict)co)["secs"])
            { var sd = (Dict)so; if (Js.Str(sd, "id") == secId) return Js.Str(sd, "t") ?? secId; }
        return secId;
    }
    string SectionSummary(string secId)
    {
        if (summaries != null && summaries.TryGetValue(secId, out var v) && v is Lst lines)
        {
            var parts = new List<string>();
            foreach (var x in lines) parts.Add((string)x);
            return string.Join("\n", parts);
        }
        return "（この節のまとめカードは用意されていません）";
    }
    // textbook-fl's prose is a JS template literal: strip ${...} figures and tags
    string SectionProse(string secId)
    {
        if (textbook == null || !(Js.Get(textbook, "CHAPTERS") is Lst chs)) return "";
        foreach (var co in chs) foreach (var so in (Lst)((Dict)co)["secs"])
        {
            var sd = (Dict)so;
            if (Js.Str(sd, "id") != secId) continue;
            var h = Js.Obj(Js.Get(sd, "h"));
            string src = h != null ? Js.Str(h, "src") : null;
            if (src == null) return "";
            int a = src.IndexOf('`'), b = src.LastIndexOf('`');
            if (a < 0 || b <= a) return "";
            string lit = src.Substring(a + 1, b - a - 1);
            var sb = new System.Text.StringBuilder();
            for (int i = 0; i < lit.Length; i++)
            {
                if (lit[i] == '$' && i + 1 < lit.Length && lit[i + 1] == '{')
                {
                    int depth = 1; i += 2;
                    while (i < lit.Length && depth > 0) { if (lit[i] == '{') depth++; else if (lit[i] == '}') depth--; i++; }
                    i--; continue;
                }
                if (lit[i] == '\\' && i + 1 < lit.Length) { i++; if (lit[i] == 'n') { sb.Append('\n'); continue; } }
                sb.Append(lit[i]);
            }
            string txt = Regex.Replace(sb.ToString(), "<[^>]+>", "");
            txt = txt.Replace("&lt;", "<").Replace("&gt;", ">").Replace("&amp;", "&").Replace("&quot;", "\"");
            return Regex.Replace(txt, @"[ \t]+", " ").Trim();
        }
        return "";
    }

    // ================= quizzes (shared) =================
    class QuizSpec { public string Title; public List<QuizQ> Qs; public string Intro; }
    class QuizRun { public List<bool> Rights = new List<bool>(); public int Right; public int Pct; }
    IEnumerator RunQuiz(QuizSpec spec, Action<QuizRun> done)
    {
        View = "quiz";
        var run = new QuizRun();
        for (int i = 0; i < spec.Qs.Count; i++)
        {
            var q = spec.Qs[i];
            QuizCorrectIndex = q.Ok;
            ClearDyn(); Header();
            Txt(spec.Title, 30, 116, 1400, 20, new Color(1f, 0.85f, 0.5f));
            if (!string.IsNullOrEmpty(q.Say) && q.Id != null && q.Id.StartsWith("listen:")) Txt("♪ " + q.Say, 30, 158, 1500, 17, new Color(0.65f, 0.8f, 1f));
            Wrap($"問 {i + 1} / {spec.Qs.Count}：{q.Q}", 30, 196, 1500, 170, 21, Color.white);
            int picked = -1;
            float y = 380;
            for (int oi = 0; oi < q.Opts.Count; oi++)
            {
                int cap = oi;
                var b = Btn(q.Opts[oi], 30, y, 1350, () => { picked = cap; });
                QuizOptionButtons.Add(b);
                y += 54;
            }
            while (picked < 0) yield return null;
            bool right = picked == q.Ok;
            run.Rights.Add(right); if (right) run.Right++;
            if (q.Id != null && CareerData.Q_ID.IsMatch(q.Id)) Career.Answered(q.Id, right);
            ClearDyn(); Header();
            Txt(right ? "正解です。" : $"不正解。正解は「{q.Opts[q.Ok]}」です。", 30, 140, 1400, 22, right ? new Color(0.6f, 1f, 0.7f) : new Color(1f, 0.6f, 0.5f));
            if (!string.IsNullOrEmpty(q.Say) && (q.Id == null || !q.Id.StartsWith("listen:"))) Txt("♪ " + q.Say, 30, 180, 1500, 17, new Color(0.65f, 0.8f, 1f));
            Wrap(q.Why ?? "", 30, 232, 1500, 240, 19, Color.white);
            bool next = false;
            QuizNextButton = Btn("次へ", 30, 500, 260, () => { next = true; });
            FlowButtons.Add(QuizNextButton);
            while (!next) yield return null;
        }
        QuizCorrectIndex = -1;
        run.Pct = spec.Qs.Count > 0 ? (int)Math.Round(100.0 * run.Right / spec.Qs.Count) : 0;
        done(run);
    }

    // ================= exams =================
    IEnumerator RunExam(Dict it)
    {
        View = "exam";
        string id = Js.Str(it, "id");
        var E = CareerData.EXAMS[id];
        if (!Career.ExamReady(id))
        {
            Career.Done("exam", id);
            flow = null; FinishItem(); yield break;
        }
        int attempt = id == "written1" ? Career.Attempt("exam:written1") : 0;
        var heard = id == "written1" ? Career.HeardSet() : null;
        double seed = Js.Num(Career.State, "seed") + Career.Day;
        var qs = ExamDraw.Draw(id, seed, attempt, heard);
        if (qs.Count == 0)
        {
            LastError = "";
            ClearDyn(); Header();
            Wrap($"{E.Title}：この分野は、まだ授業で話していません。授業で聞いたあとに、また開いてください。", 30, 160, 1500, 200, 21, Color.white);
            bool back = false;
            FlowNextButton = Btn("予定に戻る", 30, 400, 300, () => { back = true; });
            while (!back) yield return null;
            flow = null; ShowSchedule(); yield break;
        }
        QuizRun run = null;
        yield return RunQuiz(new QuizSpec { Title = $"{E.Title}（{qs.Count} 問・{E.Pass}% 以上で合格、分野ごとに 6 割以上も必要です）", Qs = qs }, r => run = r);
        var score = ExamDraw.Score(id, qs, run.Rights);
        ClearDyn(); Header();
        Txt(score.Pass ? $"{E.Title}：合格です（{score.Pct}%）" : $"{E.Title}：今回は届きませんでした（{score.Pct}%）", 30, 140, 1500, 24, score.Pass ? new Color(0.6f, 1f, 0.7f) : new Color(1f, 0.6f, 0.5f));
        float yy = 200;
        foreach (var kv in score.Banks)
        {
            string title = QuizData.BankById.TryGetValue(kv.Key, out var bk) ? bk.Title : kv.Key;
            Txt($"{title}：{kv.Value.Item3}%（{kv.Value.Item1} / {kv.Value.Item2}）{(kv.Value.Item3 < 60 ? "　← 6 割に届いていません" : "")}", 30, yy, 1400, 18, Color.white);
            yy += 42;
        }
        bool close = false;
        FlowNextButton = Btn("閉じる", 30, yy + 20, 260, () => { close = true; });
        while (!close) yield return null;
        Career.Exam(id, score.Pct, score.Pass);
        Career.Done("exam", id);
        flow = null;
        FinishItem();
    }

    // ================= the training device (FTD k1–k6) =================
    static readonly (string Part, string Text)[] K1_TUTOR =
    {
        ("all", "これが G1000 型の PFD、主な飛行表示です。真ん中が姿勢、左が速度、右が高度。この 3 つを順に見る「スキャン」が基本です。"),
        ("att", "真ん中の姿勢表示。青が空、茶色が地面。黄色い記号が機体です。上の弧の目盛りが傾き、横線が機首の上下（ピッチ）です。"),
        ("ias", "左のテープが速度、ノットです。窓の数字を読みます。テープの色の帯は、フラップを使える範囲や、超えてはいけない速度を表します。"),
        ("alt", "右のテープが高度、フィートです。上の水色の数字は、自分で決めた目標の高度です。"),
        ("vs", "高度テープのさらに右が昇降率。1 分間に何フィート上がっているか、下がっているかです。"),
        ("hsi", "下の円が HSI。上端の窓が機首の方位です。真ん中の針（CDI）は、選んだコースからどれだけずれているかを示します。"),
        ("baro", "高度テープの下の数字が高度計の設定値（BARO）。ATIS で聞いた値に合わせないと、高度が正しく出ません。"),
    };
    void StartFtd(Dict it)
    {
        string id = Js.Str(it, "id");
        if (id == "k1") { flow = StartCoroutine(RunK1(it)); return; }
        if (id == "k4") { flow = StartCoroutine(RunK4(it)); return; }
        flow = StartCoroutine(RunFtdQuiz(it));
    }
    IEnumerator RunK1(Dict it)
    {
        View = "ftd";
        Career.Attempt("ftd:k1");
        ClearDyn(); Header();
        Txt("訓練装置 k1・G1000 型 PFD の読み方", 30, 120, 1400, 22, new Color(1f, 0.85f, 0.5f));
        Wrap("正面の画面を見てください。実際の機体と同じ表示を、ひとつずつ見ていきます。", 30, 170, 1500, 120, 20, Color.white);
        for (int i = 0; i < K1_TUTOR.Length; i++)
        {
            ClearDyn(); Header();
            Txt($"PFD の見方（{i + 1} / {K1_TUTOR.Length}）", 30, 120, 1200, 21, new Color(1f, 0.85f, 0.5f));
            Wrap(K1_TUTOR[i].Text, 30, 180, 1500, 300, 21, Color.white);
            bool next = false;
            FlowNextButton = Btn(i == K1_TUTOR.Length - 1 ? "終わる" : "次へ", 30, 520, 260, () => { next = true; });
            FlowButtons.Add(FlowNextButton);
            while (!next) yield return null;
        }
        RecordGround("k1", 100);
        flow = null;
        FinishItem();
    }
    IEnumerator RunFtdQuiz(Dict it)
    {
        View = "ftd";
        string id = Js.Str(it, "id");
        int attempt = Career.Attempt($"ftd:{id}");
        double seed = Js.Num(Career.State, "seed") + Career.Day;
        var heard = Career.HeardSet();
        List<QuizQ> qs = id == "k2" ? FtdGen.K2(seed, attempt)
            : id == "k3" ? FtdGen.K3(seed, attempt, heard)
            : id == "k5" ? FtdGen.K5(seed, attempt, heard)
            : id == "k6" ? FtdGen.K6(seed, attempt, heard)
            : new List<QuizQ>();
        if (qs.Count == 0)
        {
            ClearDyn(); Header();
            Wrap($"{id} で使うところは、まだ授業で話していません。先に授業を受けてから、また来てください。", 30, 160, 1500, 200, 21, Color.white);
            bool back = false;
            FlowNextButton = Btn("予定に戻る", 30, 400, 300, () => { back = true; });
            while (!back) yield return null;
            flow = null; ShowSchedule(); yield break;
        }
        QuizRun run = null;
        yield return RunQuiz(new QuizSpec { Title = $"訓練装置 {id}・{CareerData.FTD_TITLES[id]}（10 問、80% で合格）", Qs = qs }, r => run = r);
        RecordGround(id, run.Pct);
        flow = null;
        FinishItem();
    }
    void RecordGround(string id, double pct)
    {
        Prog.Rec old; Prog.Lessons.TryGetValue(id, out old);
        var res = CareerLogic.NoteGround(old, pct >= 60, pct);
        Prog.Lessons[id] = res.rec;
        if (res.first) Career.FirstTry(res.rec.Pass);
        foreach (var g in CareerLogic.FtdGrowth(id)) Career.Grow(g.Axis, g.V, "ftd:" + id);
        Career.Done("ftd", id);
    }

    // ================= the navigation log (the solo XC's morning) =================
    IEnumerator RunNavlog(Dict it)
    {
        View = "navlog";
        var aloft = Career.Aloft(Prog);
        double? wf = null, wk = null;
        if (aloft != null)
        {
            if (Js.Get(aloft, "from") is double) { wf = Js.Num(aloft, "from"); wk = Js.Num(aloft, "kt"); }
            else if (Js.Obj(Js.Get(aloft, "at3000")) != null) { var a3 = Js.Obj(Js.Get(aloft, "at3000")); wf = Js.Num(a3, "from"); wk = Js.Num(a3, "kt"); }
        }
        var qs = NavlogQ.Build(wf, wk, Js.Rng((uint)(Career.Day * 41 + 7)));
        QuizRun run = null;
        yield return RunQuiz(new QuizSpec { Title = "航法ログを作る（LAB → LAB-B、風の計算・時間・燃料）", Qs = qs }, r => run = r);
        ClearDyn(); Header();
        Txt(run.Pct >= 80 ? "航法ログは、これで大丈夫。午後、外部点検から始めてください。" : "もう一度、計算を見直しましょう。午後までに直せば、今日飛べます。", 30, 160, 1500, 21, Color.white);
        bool close = false;
        FlowNextButton = Btn("閉じる", 30, 240, 260, () => { close = true; });
        while (!close) yield return null;
        Career.Done("navlog", "xc");
        flow = null;
        FinishItem();
    }

    // ================= flight days (the Day machine) =================
    readonly List<GameObject> flightDyn = new List<GameObject>();
    RasterCanvas statusCv; RawImage statusImg;
    void FlightClearDyn() { foreach (var g in flightDyn) DestroyImmediate(g); flightDyn.Clear(); }
    Button FlightBtn(string label, float x, float y, int w, Action onClick)
    {
        var b = CadetUiTex.Btn(panel, label, w, 44, 17, new Color(0.16f, 0.22f, 0.34f), Color.white, onClick);
        CadetUiTex.Place(b.GetComponent<RectTransform>(), x, y); flightDyn.Add(b.gameObject); return b;
    }
    void SetStatus(string text)
    {
        FlightPhaseText = text;
        if (statusCv == null) return;
        statusCv.ClearAll();
        statusCv.FillStyle = "#cfe2ff"; statusCv.Font = new FontSpec(21, 400, false);
        statusCv.TextAlign = "left"; statusCv.TextBaseline = "middle";
        statusCv.FillText(text, 4, 24);
        statusCv.Upload();
    }
    void BuildFlightView(string title)
    {
        View = "flight"; ClearDyn(); Header();
        Txt(title, 30, 116, 1500, 23, new Color(1f, 0.85f, 0.5f));
        var go = new GameObject("FStatus"); go.transform.SetParent(panel, false);
        statusImg = go.AddComponent<RawImage>(); statusCv = new RasterCanvas(1560, 48); statusImg.texture = statusCv.Tex; statusImg.raycastTarget = false;
        var rt = go.GetComponent<RectTransform>(); rt.sizeDelta = new Vector2(1560, 48);
        CadetUiTex.Place(rt, 30, 160); dyn.Add(go);
    }

    static Dict CheckDict(string id)
    {
        var cd = CareerData.CHECKS[id];
        var lessons = new Lst(); foreach (var l in cd.Lessons) lessons.Add(l);
        return new Dict { { "kind", cd.Kind }, { "lessons", lessons }, { "title", cd.Title } };
    }

    IEnumerator RunFlightItem(Dict it)
    {
        string kind = Js.Str(it, "kind");
        bool? go = null;
        yield return WeatherDecision(it, c => { Career.Decision(c, Career.Weather(Prog)); go = c != "cancel"; }, true);
        if (go == false) { flow = null; ShowSchedule(); yield break; }
        bool dayDone = false; Day finished = null;
        yield return RunFlightDay(it, d => { dayDone = true; finished = d; });
        if (!dayDone)
        {
            flow = null; ShowSchedule(); yield break;   // LastError already names the stuck phase
        }
        ApplyDayOver(it, finished);
        flow = null;
        FinishItem();
    }

    // k4: the chair flight — the a1 day's radio flown through the Day machine;
    // the score is the day's first-try radio rate (the bespoke chairScript's
    // COM-frequency / ATIS-letter items are not part of the Day machine).
    IEnumerator RunK4(Dict it)
    {
        View = "ftd";
        Career.Attempt("ftd:k4");
        string[] lines =
        {
            "k4 は交信のチェアフライトです。ヘッドセットをつけて、机の席へ。あなたがパイロット、わたしはコンソールで管制官をやります。",
            "飛ぶのは、初飛行と同じ流れです。ATIS を聞いて、Ground、Tower。訓練空域から帰って着陸し、駐機場に戻るまで。",
            "周波数を合わせる、高度計を合わせる、呼ぶ前に聞く。その交信を、初飛行の一日を通して行います。",
        };
        for (int i = 0; i < lines.Length; i++)
        {
            ClearDyn(); Header();
            Txt("訓練装置 k4・交信のチェアフライト", 30, 120, 1400, 22, new Color(1f, 0.85f, 0.5f));
            Wrap(lines[i], 30, 180, 1500, 240, 21, Color.white);
            bool next = false;
            FlowNextButton = Btn(i == lines.Length - 1 ? "チェアフライト開始" : "次へ", 30, 460, 340, () => { next = true; });
            FlowButtons.Add(FlowNextButton);
            while (!next) yield return null;
        }
        var fake = new Dict { { "kind", "flight" }, { "id", "a1" }, { "title", "チェアフライト（初飛行 a1 の交信）" } };
        bool dayDone = false; Day finished = null;
        yield return RunFlightDay(fake, d => { dayDone = true; finished = d; });
        if (!dayDone) { flow = null; ShowSchedule(); yield break; }
        var sum = finished.Summary();
        var radio = Js.Obj(Js.Get(sum, "radio"));
        double n = radio != null ? Js.Num(radio, "n") : 0, first = radio != null ? Js.Num(radio, "first") : 0;
        double pct = n > 0 ? Math.Round(100.0 * first / n) : 100;
        RecordGround("k4", pct);
        flow = null;
        FinishItem();
    }

    /// <summary>Drive one Day (BotDay2Cs' pattern, generalised): walkaround,
    /// boarding, then the phase loop — lessons flown for real by BotFly, radio
    /// choices through on-screen buttons, runup scripted, checklists answered.
    /// Calls onDone(day) only when the day reaches "done"; otherwise sets
    /// LastError naming the phase it stuck in.</summary>
    IEnumerator RunFlightDay(Dict it, Action<Day> onDone)
    {
        string kind = Js.Str(it, "kind"), id = Js.Str(it, "id");
        DayPlan plan;
        if (kind == "solo") plan = DayPlanLib.PlanFor(id, solo: true);
        else if (kind == "xc") plan = DayPlanLib.PlanFor(id, check: CheckDict("xc"));
        else if (kind == "checkride" && CareerData.CHECKS.ContainsKey(id)) plan = DayPlanLib.PlanFor(id, check: CheckDict(id));
        else plan = DayPlanLib.PlanFor(id);
        bool anyPassed = false;
        foreach (var kv in Prog.Lessons) if (kv.Value.Pass) { anyPassed = true; break; }
        string level = !anyPassed && Career.Chapter == "ch2" ? "intro" : "basic";
        double seed = Js.Num(Career.State, "seed");
        var rf = Failures.RandomFailureFor((int)seed, Career.Day, "flight", false, kind == "checkride", Prog.Lessons.Count == 0, plan.Aircraft ?? "pa28", id, "career");
        var day = new Day(archerKit, seminoleKit, new DayOpts
        {
            Seed = (uint)(seed + Career.Day), Level = level, Plan = plan,
            Weather = new RadioContent.DayWeather { Info = "Bravo", Zulu = "1405", TempC = 22, DewC = 11 },
            Qnh = 29.85, Fault = rf != null ? rf.Kind : null, ElecFault = rf != null && rf.Kind == "elec",
        });
        var L0 = School.StartLesson(plan.Lessons[0], level);
        var s = L0.S;
        var sw = new SwState();
        var sys = new Systems(sw);
        sys.SetCold(s);
        bool park = false;
        var av = new AvionicsState(); av.Baro = 29.92;
        var ctx = new DayCtx
        {
            Sw = sw, Sys = sys, S = s, Av = av, Pos = (636.5, 207.6), V = 0, Hdg = 354, OnGround = true, Dt = 0.1,
            ActFn = (name, arg) => { if (name == "parkBrake") park = arg is bool b && b; return ""; },
            SetThrFn = x => { s.Thr = x; },
            SetFlapsFn = i => { s.FlapIdx = i; s.FlapDeg = (plan.Aircraft == "b737" ? new[] { 0.0, 5, 15, 40 } : new[] { 0.0, 10, 25, 40 })[i]; },
        };
        ctx.Park = park;
        void Tick(int n = 1)
        {
            for (int i = 0; i < n; i++)
            {
                sys.Update(0.1, s);
                ctx.Rpm = sys.Rpm; ctx.Park = park;
                day.Update(ctx);
                for (int k = 0; k < 6; k++) Sim.Step(s, 1.0 / 60);
            }
        }
        BuildFlightView(Js.Str(it, "title"));
        SetStatus("外部点検をしています…");
        yield return null;
        foreach (var pObj in day.Walk.Points)
        {
            var p = (Dict)pObj;
            string pid = Js.Str(p, "id");
            day.Walk.Inspect(pid);
            var v1 = day.Walk.Inspect(pid);
            foreach (var ch in (Lst)v1["choices"]) if (Js.Str((Dict)ch, "act") == "task") day.Walk.Act(pid, "task");
            day.Walk.Inspect(pid);
            if (day.Walk.Planted.Contains(pid))
            {
                day.Walk.Act(pid, "report");
                var v3 = day.Walk.Inspect(pid);
                foreach (var ch in (Lst)v3["choices"]) if (Js.Str((Dict)ch, "act") == "fix") day.Walk.Act(pid, "fix");
            }
            else day.Walk.Act(pid, "ok");
        }
        day.Boarded();
        var flown = new Dictionary<string, LessonState>();
        int guard = 0, frame = 0;
        bool failed = false;
        while (day.Phase != "done" && guard++ < 4000)
        {
            string ph = day.Phase; var info = day.Info(ph);
            if ((frame++ % 30) == 0) SetStatus($"{info.label}（{ph}）");
            if (info.lesson != null)
            {
                SetStatus($"飛行中：{ph} を飛んでいます…");
                yield return null;
                var L = BotFly.RunLesson(ph, level);
                flown[ph] = L;
                day.LessonEnded(ph, new DayLessonStatus { T = L.T, Score = L.Score, Crashed = L.S.Dead, Done = L.Done, Passed = L.Passed, Grade = L.Grade, Reason = L.Reason, Results = L.Results });
                Tick(1); continue;
            }
            if (info.move != null) { day.LessonStarted(day.NextLesson()); Tick(1); continue; }
            if (info.radio != null)
            {
                int g2 = 0; bool stuck = false;
                while (day.Phase == ph && g2++ < 300)
                {
                    Tick(1);
                    var v = day.Atc.View();
                    if (v != null && Js.Str(v, "phase") == "choose")
                    {
                        var choices = (Lst)v["choices"];
                        FlightClearDyn();
                        SetStatus("交信：返答を選んでください — " + (Js.Str(v, "prompt") ?? ""));
                        int picked = -1;
                        var btns = new List<Button>();
                        for (int ci = 0; ci < choices.Count; ci++)
                        {
                            int cap = ci;
                            var b = FlightBtn(Js.Str((Dict)choices[ci], "text") ?? ("選択肢 " + (ci + 1)), 30, 240 + ci * 54, 1400, () => { picked = cap; });
                            btns.Add(b);
                        }
                        if (AutoPlay)
                        {
                            int right = day.Atc.RightIndex();
                            yield return null;
                            if (right >= 0 && right < btns.Count) btns[right].onClick.Invoke();
                        }
                        while (picked < 0) yield return null;
                        FlightClearDyn();
                        day.Atc.Answer(picked);
                    }
                    if ((g2 % 60) == 0) yield return null;
                }
                if (day.Phase == ph) stuck = true;
                if (stuck) { LastError = $"飛行日の交信フェーズ {ph} から進めませんでした（項目：{Js.Str(it, "title")}）"; failed = true; }
                continue;
            }
            if (ph == "runup")
            {
                sw.Mag = "BOTH"; s.Thr = 0.67; Tick(15);
                sw.Mag = "L"; Tick(8); sw.Mag = "R"; Tick(8); sw.Mag = "BOTH"; Tick(4);
                sw.CarbHeat = true; Tick(8); sw.CarbHeat = false; Tick(4);
                s.Thr = 0.0; Tick(8); s.Thr = 0.045; Tick(8);
                continue;
            }
            if (info.list != null)
            {
                if (info.place == "stand") { ctx.Pos = (636.5, 207.6); ctx.V = 0; }
                int g2 = 0;
                while (day.Phase == ph && g2++ < 40)
                {
                    var items = day.Items();
                    if (items == null || Js.Num(items, "i") >= ((Lst)items["items"]).Count) break;
                    var cur = (Dict)((Lst)items["items"])[(int)Js.Num(items, "i")];
                    if (Js.Bool(cur, "confirm")) day.Confirm(ctx); else day.Assist(ctx);
                    Tick(30);
                }
                Tick(2);
                continue;
            }
            if (info.place != null)
            {
                if (info.place == "hold") { ctx.Pos = (17.5, 44.5); ctx.V = 0; }
                if (info.place == "lineup") { ctx.Pos = (30, 0); ctx.V = 0; ctx.Hdg = 354; }
                if (info.place == "clear") { ctx.Pos = (620, 120); ctx.V = 0; }
                if (info.place == "stand") { ctx.Pos = (636.5, 207.6); ctx.V = 0; }
                Tick(2);
                continue;
            }
            if (ph == "debrief") { day.DebriefRead(); Tick(1); continue; }
            Tick(1);
            if ((guard % 25) == 0) yield return null;
        }
        foreach (var kv in flown) if (kv.Value.Done) School.NoteLesson(Prog, kv.Value);
        if (failed || day.Phase != "done")
        {
            if (!failed) LastError = $"飛行日がフェーズ {day.Phase} で終了しませんでした（項目：{Js.Str(it, "title")}、guard={guard}）";
            yield break;
        }
        SetStatus("デブリーフまで終わりました。");
        onDone(day);
    }

    // main.js missOf, in its own order of weight
    (string Key, string Label)? MissOf(Dict sum)
    {
        if (Js.Bool(sum, "incursion")) return ("incursion", "停止線の手前で止まること");
        var fault = Js.Obj(Js.Get(sum, "fault"));
        if (fault != null && Js.Str(fault, "decided") == "go") return ("fault", "ランナップで制限を超えたときの判断");
        if (!string.IsNullOrEmpty(Js.Str(sum, "crash"))) return ("crash", "タキシーの速さと周りを見ること");
        foreach (var lo in (Lst)sum["lessons"])
        {
            var l = (Dict)lo;
            if (!Js.Bool(l, "done") || Js.Bool(l, "passed")) continue;
            string rowName = null;
            foreach (var ro in (Lst)l["rows"]) { var rd = (Dict)ro; if (!Js.Bool(rd, "pass")) { rowName = Js.Str(rd, "name"); break; } }
            return ($"lesson:{Js.Str(l, "id")}", rowName != null ? $"「{Js.Str(l, "title")}」の{rowName}" : $"「{Js.Str(l, "title")}」をもう一度");
        }
        var w = Js.Obj(Js.Get(sum, "walk")) ?? new Dict();
        var missed = Js.Arr(Js.Get(w, "missed"));
        if (missed != null && missed.Count > 0)
        {
            string nm = Js.Str((Dict)missed[0], "name") ?? "";
            int ci = nm.IndexOf('：'); if (ci >= 0) nm = nm.Substring(ci + 1);
            return ("walk", $"外部点検で見落とした「{nm}」");
        }
        var tl = Js.Arr(Js.Get(w, "tasksLeft"));
        if (tl != null && tl.Count > 0) return ("left", "外部点検の外し忘れ");
        var r = Js.Obj(Js.Get(sum, "radio")) ?? new Dict();
        if (Js.Num(r, "n") > 0 && Js.Num(r, "first") < Js.Num(r, "n")) return ("radio", "無線の復唱");
        return null;
    }

    // main.js dayOver (+ soloLanded / xcLanded), in the port's terms
    void ApplyDayOver(Dict it, Day day)
    {
        string kind = Js.Str(it, "kind"), id = Js.Str(it, "id");
        var sum = day.Summary();
        // applyFlightGrowth
        var walk = Js.Obj(Js.Get(sum, "walk"));
        double pj = Failures.PreflightJudgeBase(walk != null ? Js.Num(walk, "found") : 0);
        if (pj > 0) Career.Grow("judge", pj, $"preflight:{Career.Day}");
        bool tired = Career.Tired();
        foreach (var lo in (Lst)sum["lessons"])
        {
            var l = (Dict)lo;
            if (!Js.Bool(l, "done")) continue;
            foreach (var g in CareerLogic.LessonGrowth(Js.Str(l, "grade"), Js.Str(sum, "level"), Js.Str(l, "id"), tired)) Career.Grow(g.Axis, g.V, "lesson:" + Js.Str(l, "id"));
            var rec = Prog.Get(Js.Str(l, "id"));
            if (rec != null && rec.Tries == 1) Career.FirstTry(Js.Bool(l, "passed"));
        }
        if (kind != "xc")
        {
            var miss = MissOf(sum);
            if (miss != null) Career.NoteMiss(miss.Value.Key, miss.Value.Label);
        }
        TrustNow = Math.Max(0, Math.Min(100, TrustNow + Js.Num(sum, "trust")));
        bool all = false;
        {
            var ls = (Lst)sum["lessons"];
            if (ls.Count > 0) { all = true; foreach (var lo in ls) { var l = (Dict)lo; if (!Js.Bool(l, "done") || !Js.Bool(l, "passed")) { all = false; break; } } }
        }
        if (kind == "xc") Career.Check("xc", all);
        else if (kind == "checkride" && CareerData.CHECKS.ContainsKey(id)) Career.Check(id, all);
        else Career.Done(kind, id);
        if (kind == "solo") Career.SoloDone();
        Career.Tire(15);
    }

    // ================= line duties (FO chapters) =================
    Dict lineItem; bool lineIsCheck, linePending;
    void StartLineItem(Dict it, bool isCheck)
    {
        if (Line == null || Game == null) { LastError = "ライン画面（LineMain）が結線されていません。"; return; }
        Line.Career = Career;
        Line.SelRoute = Js.Str(it, "route") ?? "HND-KMQ";
        Line.SelRole = Js.Str(it, "role") ?? "PF";
        Line.SelCaptain = Js.Str(it, "captain") ?? "sakurai";
        Line.SelSeed = Career.Day;
        Line.RealFlight = Line.SelRole == "PF";
        lineItem = it; lineIsCheck = isCheck; linePending = true;
        Line.StartDuty();
        Game.Open("line");
    }
    void PollLineItem()
    {
        if (!linePending || Line == null || Line.Duty == null) return;
        if (Line.Duty.Phase != "debrief") return;
        linePending = false;
        if (lineIsCheck)
        {
            var s = Line.Duty.Summary();
            Career.RecordLineCheck(Js.Num(s, "total") >= 70);
        }
        else
        {
            if (!Line.Duty.NoGo && !Line.LegRecorded) Line.RecordLeg();
            Career.Done("line", "line");
        }
        Career.Advance(); SaveProg();
        Game.Open("career");
        ShowSchedule();
    }
}
