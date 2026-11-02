// LineMain — the first-officer line-operations screen (Stage 10): route /
// role / captain selection, then the duty itself driven through the ported
// CadetLineDuty machine — dispatch decision, the flight (PF: flown by the
// scripted observation profile the tests use; PM: the ride with its monitor
// tasks), the in-flight event, and the debrief, whose result is recorded
// into the career via CadetCareer.RecordLeg.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.UI;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public class LineMain : MonoBehaviour
{
    public string SelRoute = "HND-KMQ", SelRole = "PF", SelCaptain = "sakurai";
    public double SelSeed = 1;
    public CadetLineDuty Duty;
    public Career Career;
    public Dict LastSummary;
    public bool LegRecorded;
    Transform panel;
    readonly List<GameObject> dyn = new List<GameObject>();
    double tClock;
    int pfStep;
    string status = "";

    void Awake()
    {
        CadetLineData.Load(
            File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "cadet-data", "line.json")),
            File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "cadet-data", "airfields.json")));
        BuildUi();
    }

    void ClearDyn() { foreach (var g in dyn) DestroyImmediate(g); dyn.Clear(); }
    RawImage Txt(string text, float x, float y, int w, int px, Color c)
    {
        var t = CadetUiTex.Text(panel, text, w, 44, px, c);
        CadetUiTex.Place(t.rectTransform, x, y); dyn.Add(t.gameObject); return t;
    }
    Button Btn(string label, float x, float y, int w, Action onClick, int px = 18)
    {
        var b = CadetUiTex.Btn(panel, label, w, 44, px, new Color(0.16f, 0.22f, 0.34f), Color.white, onClick);
        CadetUiTex.Place(b.GetComponent<RectTransform>(), x, y); dyn.Add(b.gameObject); return b;
    }
    void BuildUi()
    {
        var canvas = new GameObject("LineCanvas").AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.gameObject.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        canvas.gameObject.AddComponent<GraphicRaycaster>();
        panel = canvas.transform;
        ShowSetup();
    }
    public void ShowSetup()
    {
        ClearDyn();
        Txt("副操縦士ライン運航 — 区間 × 役割 × 機長を選んで勤務開始", 30, 16, 1400, 26, new Color(1f, 0.85f, 0.5f));
        Txt("区間", 30, 76, 120, 20, Color.white);
        float x = 170;
        foreach (var r in CadetLineData.Routes) { string id = r.Id; var b = Btn(id + "（" + r.BlockMin + "分・FL" + r.CruiseFL + "）", x, 76, 300, () => { SelRoute = id; ShowSetup(); }); if (SelRoute == id) b.GetComponent<Image>().color = new Color(0.85f, 0.6f, 0.15f); x += 312; }
        Txt("役割", 30, 136, 120, 20, Color.white);
        foreach (var role in new[] { "PF", "PM" }) { string v = role; var b = Btn(role == "PF" ? "PF（自分が操縦）" : "PM（機長が操縦・監視）", 170 + (role == "PF" ? 0 : 330), 136, 320, () => { SelRole = v; ShowSetup(); }); if (SelRole == v) b.GetComponent<Image>().color = new Color(0.85f, 0.6f, 0.15f); }
        Txt("機長", 30, 196, 120, 20, Color.white);
        x = 170;
        foreach (var c in CadetLineData.Captains) { string id = c.Id; var b = Btn(c.Name + "（" + c.Style + "）", x, 196, 300, () => { SelCaptain = id; ShowSetup(); }); if (SelCaptain == id) b.GetComponent<Image>().color = new Color(0.85f, 0.6f, 0.15f); x += 312; }
        Btn("シード " + SelSeed + "（クリックで変更）", 170, 256, 300, () => { SelSeed = SelSeed % 20 + 1; ShowSetup(); });
        var rf = Btn(RealFlight ? "PF 操縦：実飛行（737 物理で実際に飛ぶ）" : "PF 操縦：スクリプト観測（従来）", 490, 256, 560, () => { RealFlight = !RealFlight; ShowSetup(); });
        if (RealFlight) rf.GetComponent<Image>().color = new Color(0.85f, 0.6f, 0.15f);
        Btn("勤務開始（ブリーフィングへ）", 170, 330, 420, () => StartDuty(), 22);
        if (!string.IsNullOrEmpty(status)) Txt(status, 170, 400, 1500, 18, new Color(0.8f, 0.9f, 1f));
    }

    public void StartDuty()
    {
        Duty = new CadetLineDuty(SelRoute, SelRole, SelCaptain, SelSeed);
        tClock = 0; pfStep = 0; LastSummary = null; LegRecorded = false;
        Pilot = null;
        ShowPhase();
    }
    void ShowPhase()
    {
        ClearDyn();
        if (Duty == null) { ShowSetup(); return; }
        var brief = CadetLineDuty.LineBrief(Duty.Route.Id);
        Txt($"ライン勤務 {Duty.Route.Id}／{Duty.Role}／機長 {Duty.Captain.Name}（{Duty.Captain.Style}）— 現在：{Duty.Phase}", 30, 16, 1600, 24, new Color(1f, 0.85f, 0.5f));
        switch (Duty.Phase)
        {
            case "brief":
                Txt($"ブリーフィング：{Duty.Origin.Name} → {Duty.Destination0.Name}、巡航 FL{Duty.Route.CruiseFL}、代替 {Duty.Route.Alternate}、ブロック {Duty.Route.BlockMin} 分", 30, 70, 1600, 19, Color.white);
                Btn("ブリーフィング完了 → ディスパッチへ", 30, 130, 460, () => { Duty.Advance(); ShowPhase(); });
                break;
            case "dispatch":
                {
                    var dc = Duty.DispatchCase;
                    Txt("ディスパッチ判断：" + dc.Title, 30, 70, 1500, 21, new Color(1f, 0.75f, 0.5f));
                    Txt(dc.Situation, 30, 116, 1650, 17, Color.white);
                    for (int i = 0; i < dc.Choices.Count; i++) { int idx = i; Btn(dc.Choices[i], 30, 170 + i * 54, 1200, () => { Duty.AnswerDispatch((double)idx); ShowPhase(); }); }
                    break;
                }
            case "ride":
                {
                    var task = Duty.CurrentTask();
                    if (Duty.Event != null && Duty.EventAnswer == null) { ShowEvent(70); break; }
                    if (task != null)
                    {
                        Txt("PM タスク：" + task.Title, 30, 70, 1200, 21, new Color(1f, 0.75f, 0.5f));
                        Txt(task.Prompt, 30, 116, 1650, 17, Color.white);
                        for (int i = 0; i < task.Choices.Count; i++) { int idx = i; Btn(task.Choices[i], 30, 170 + i * 54, 1100, () => { Duty.Answer(task.Id, (double)idx); ShowPhase(); }); }
                    }
                    else Btn("乗務を進める（次のタスク／到着まで）", 30, 130, 520, () => { StepRide(); ShowPhase(); });
                    break;
                }
            case "debrief":
                ShowDebrief();
                break;
            default: // PF flight phases
                if (Duty.Event != null && Duty.EventAnswer == null) { ShowEvent(70); break; }
                Txt(PfPhaseText(), 30, 70, 1600, 19, Color.white);
                if (RealFlight)
                {
                    Txt(RealNote, 30, 116, 1700, 18, new Color(0.8f, 0.9f, 1f));
                    Btn("飛行を進める（実飛行 30 秒）", 30, 170, 460, () => { StepReal(30); ShowPhase(); });
                }
                else
                {
                    if (Duty.Phase == "cruise") Btn("巡航を圧縮する（TOD へ）", 30, 130, 420, () => { Duty.Compress(); ShowPhase(); });
                    Btn("飛行を進める", 30, 190, 300, () => { StepPf(); ShowPhase(); });
                }
                break;
        }
    }
    string PfPhaseText()
    {
        switch (Duty.Phase)
        {
            case "depart": return "出発：離陸滑走中…「飛行を進める」で離陸します。";
            case "climb": return "上昇中…巡航高度へ。";
            case "cruise": return $"巡航中 FL{Duty.Route.CruiseFL}。圧縮するか、そのまま飛んで TOD で降下します。";
            case "descent": return "降下中…進入へ。";
            case "approach": return "最終進入…接地まであと少し。";
            case "landed": return "接地しました。停止まで進めてデブリーフへ。";
            default: return Duty.Phase;
        }
    }
    void ShowEvent(float y)
    {
        var ev = Duty.Event;
        Txt("飛行中のイベント：" + ev.Title, 30, y, 1200, 21, new Color(1f, 0.6f, 0.45f));
        Txt(ev.Situation, 30, y + 46, 1650, 17, Color.white);
        for (int i = 0; i < ev.Choices.Count; i++) { int idx = i; Btn(ev.Choices[i], 30, y + 100 + i * 54, 1100, () => { Duty.AnswerEvent((double)idx); ShowPhase(); }); }
    }
    void ShowDebrief()
    {
        LastSummary = Duty.Summary();
        var s = LastSummary;
        Txt($"デブリーフ — 総合 {MiniJson.Num(s, "total")} 点／評価 {MiniJson.Str(s, "grade")}" + (Duty.NoGo ? "（正しいノーゴー：この勤務はここで終了）" : ""), 30, 70, 1500, 23, new Color(0.6f, 1f, 0.7f));
        float y = 126;
        foreach (var ro in (Lst)s["rows"])
        {
            var row = (Dict)ro;
            Txt($"{MiniJson.Str(row, "name")}：{row["val"]}（基準：{MiniJson.Str(row, "std")}）{(MiniJson.Bool(row, "pass") ? " ✓" : " ✗")}", 30, y, 1650, 17, Color.white);
            y += 40;
        }
        if (!LegRecorded && !Duty.NoGo)
            Btn("この区間をキャリアに記録する", 30, y + 10, 460, () => { RecordLeg(); ShowPhase(); });
        else if (LegRecorded) Txt("キャリアに記録済み（セクター＋1、疲労は勤務1区間の分が加算されます）", 30, y + 10, 1400, 17, new Color(0.8f, 0.9f, 1f));
        Btn("次の勤務を選ぶ", 520, y + 10, 300, () => ShowSetup());
    }
    public void RecordLeg()
    {
        if (Career == null) Career = new Career(new MemoryStore(), 1);
        var s = Duty.Summary();
        Career.RecordLeg(Duty.Route.Id, Duty.Role, Duty.Route.BlockMin, MiniJson.Num(s, "total"), null, Duty.Diverted);
        LegRecorded = true;
    }

    /// <summary>PF: feed the next scripted observation-profile step (the same
    /// profile the logic golden uses) — the screen's stand-in for flying.</summary>
    public void StepPf()
    {
        Dict[] profile =
        {
            new Dict { { "onGround", true }, { "stopped", true }, { "altFt", 36.0 }, { "distDestM", Duty.Route.DistKm * 1000 } },
            new Dict { { "onGround", false }, { "altFt", 600.0 }, { "ias", 165.0 }, { "vsFpm", 2200.0 }, { "distDestM", Duty.Route.DistKm * 960 } },
            new Dict { { "onGround", false }, { "altFt", 12000.0 }, { "ias", 250.0 }, { "vsFpm", 1800.0 }, { "distDestM", Duty.Route.DistKm * 820 } },
            new Dict { { "onGround", false }, { "altFt", Duty.Route.CruiseAltFt }, { "ias", 280.0 }, { "mach", 0.74 }, { "vsFpm", 0.0 }, { "distDestM", Duty.Route.DistKm * 690 } },
            new Dict { { "onGround", false }, { "altFt", 9000.0 }, { "ias", 250.0 }, { "vsFpm", -1800.0 }, { "distDestM", 90000.0 } },
            new Dict { { "onGround", false }, { "altFt", 2000.0 }, { "ias", 150.0 }, { "vsFpm", -750.0 }, { "distDestM", 8000.0 } },
            new Dict { { "onGround", false }, { "altFt", 400.0 }, { "ias", 138.0 }, { "vsFpm", -650.0 }, { "distDestM", 1500.0 } },
            new Dict { { "onGround", true }, { "stopped", false }, { "tdAlongM", 350.0 }, { "tdCrossM", 3.0 } },
            new Dict { { "onGround", true }, { "stopped", true } },
        };
        if (pfStep >= profile.Length) return;
        var obs = profile[pfStep++]; obs["t"] = (tClock += 10);
        Duty.Update(obs);
    }
    /// <summary>PM: feed ride updates until a task, the event, or arrival.</summary>
    public void StepRide()
    {
        for (int i = 0; i < 12; i++)
        {
            var obs = new Dict { { "t", (tClock += 20) }, { "altFt", Duty.Route.CruiseAltFt }, { "ias", 270.0 }, { "mach", 0.74 }, { "headingDeg", 90.0 }, { "vsFpm", 0.0 }, { "distDestM", 150000.0 } };
            Duty.Update(obs);
            if (Duty.CurrentTask() != null || (Duty.Event != null && Duty.EventAnswer == null) || Duty.Phase != "ride") return;
            if (Duty.TasksIssued >= CadetLineData.PmTasksPerRide)
            {
                Duty.Update(new Dict { { "t", (tClock += 20) }, { "arrived", true } });
                return;
            }
        }
    }

    // ================= real flight (Stage 13): PF flown in the 737 physics =================
    // The sector is flown by CadetLinePilot on a real physics state; the duty
    // reads real observations, so the touchdown is scored from the actual
    // touchdown point and sink (see flight/src/CadetLinePilot.cs).
    public bool RealFlight;
    public LinePilot Pilot;
    public State RS { get { return Pilot != null ? Pilot.S : null; } }
    public bool RealDone { get { return Pilot != null && Pilot.Done; } }
    public string RealNote = "";

    public void SetupRealFlight()
    {
        Pilot = new LinePilot(Duty, SelSeed);
        RealNote = Pilot.Note;
    }

    /// <summary>Advance the real flight by dtSim seconds of sim time.</summary>
    public void StepReal(double dtSim)
    {
        if (Pilot == null) SetupRealFlight();
        Pilot.Step(dtSim);
        RealNote = Pilot.Note;
    }
}
