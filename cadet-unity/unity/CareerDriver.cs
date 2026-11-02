// CareerDriver — the Stage 15 cold-boot serial test: title → hub career
// button (a real onClick) → the career screen driven day by day through its
// real UI (schedule item buttons, dialog choices, the virtual-key advance,
// quiz answers via the correct option button, the sleep button) until the
// cadet has graduated and been hired as a first officer. Any stall is
// reported with the exact view / item / phase / dialog node it stuck on.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.UI;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;

public class CareerDriver : MonoBehaviour
{
    public string DonePath;
    readonly List<string> log = new List<string>();
    int fails;
    float lastProgressT;
    string lastProgressKey = "";
    readonly HashSet<string> attemptedToday = new HashSet<string>();
    readonly Dictionary<string, int> nodeAttempts = new Dictionary<string, int>();
    int lastDay = -1;
    bool sawPrologue, sawGraduation;
    void Check(bool ok, string what) { log.Add((ok ? "PASS " : "FAIL ") + what); if (!ok) fails++; Debug.Log("CAREER " + (ok ? "PASS " : "FAIL ") + what); }
    void Start() { StartCoroutine(Run()); }

    System.Collections.IEnumerator Run()
    {
        yield return null; yield return null; yield return null;
        var gm = FindObjectOfType<GameMain>();
        Check(gm != null, "hub present");
        var hub = GameObject.Find("Hub-career");
        Check(hub != null, "career hub button present");
        if (hub != null) hub.GetComponent<Button>().onClick.Invoke();
        yield return null; yield return null;
        var cm = FindObjectOfType<CareerMain>();
        Check(cm != null && gm.OpenPanel == "career", "career panel opened from the hub");
        if (cm == null) { Finish(); yield break; }
        cm.AutoPlay = true;
        cm.ResetAll(12345);
        yield return null;
        Check(cm.Career != null && cm.Career.Chapter == "prologue", "fresh career starts at the prologue");
        lastProgressT = Time.realtimeSinceStartup;
        float startT = Time.realtimeSinceStartup;
        while (Time.realtimeSinceStartup - startT < 1700)
        {
            yield return null;
            if (cm == null) break;
            var st = cm.Career.State;
            var fo = Js.Obj(Js.Get(st, "fo"));
            if (!sawPrologue && Js.Obj(Js.Get(st, "done")) != null && Js.Get(Js.Obj(Js.Get(st, "done")), "prologue") != null) { sawPrologue = true; Check(true, "prologue completed (brief:meet + FinishPrologue)"); }
            if (!sawGraduation && Js.Get(st, "graduated") != null) { sawGraduation = true; Check(true, "graduation recorded (career.graduate at the ch6 gate)"); }
            if (fo != null && Js.Bool(fo, "hired"))
            {
                Check(true, $"FO hired — the serial flow reached first-officer entry (day {cm.Career.Day}, chapter {cm.Career.Chapter})");
                break;
            }
            // the line panel owns the screen while a duty runs
            if (gm.OpenPanel == "line") { yield return DriveLine(); continue; }
            // progress bookkeeping / stall detection
            string key = $"{cm.Career.Day}|{cm.Career.Chapter}|{cm.View}|{(cm.CurrentItem != null ? Js.Str(cm.CurrentItem, "kind") + ":" + Js.Str(cm.CurrentItem, "id") : "")}|{cm.FlightPhaseText}|{cm.DlgNodeId}";
            if (key != lastProgressKey) { lastProgressKey = key; lastProgressT = Time.realtimeSinceStartup; }
            if (Time.realtimeSinceStartup - lastProgressT > 150)
            {
                Check(false, $"STALL at view={cm.View} day={cm.Career.Day} chapter={cm.Career.Chapter} item={(cm.CurrentItem != null ? Js.Str(cm.CurrentItem, "title") : "-")} phase={cm.FlightPhaseText} dlgNode={cm.DlgNodeId} err={cm.LastError}");
                break;
            }
            if (cm.Career.Day != lastDay) { lastDay = cm.Career.Day; attemptedToday.Clear(); nodeAttempts.Clear(); }
            switch (cm.View)
            {
                case "schedule":
                    {
                        bool clicked = false;
                        for (int i = 0; i < cm.ItemList.Count; i++)
                        {
                            var it = cm.ItemList[i];
                            string kind = Js.Str(it, "kind"), id = Js.Str(it, "id");
                            string akey = kind + ":" + id;
                            if (id != null && cm.Career.DoneToday(kind, id)) continue;
                            if (attemptedToday.Contains(akey)) continue;
                            attemptedToday.Add(akey);
                            cm.ItemButtons[i].onClick.Invoke();
                            clicked = true;
                            break;
                        }
                        if (!clicked && cm.SleepButton != null) cm.SleepButton.onClick.Invoke();
                        break;
                    }
                case "dialog":
                    {
                        if (cm.DlgChoiceButtons.Count > 0)
                        {
                            string node = cm.DlgNodeId ?? "?";
                            nodeAttempts.TryGetValue(node, out int att);
                            nodeAttempts[node] = att + 1;
                            cm.DlgChoiceButtons[att % cm.DlgChoiceButtons.Count].onClick.Invoke();
                        }
                        else cm.SimKey("e");
                        break;
                    }
                case "quiz":
                    {
                        if (cm.QuizOptionButtons.Count > 0 && cm.QuizCorrectIndex >= 0) cm.QuizOptionButtons[cm.QuizCorrectIndex].onClick.Invoke();
                        else if (cm.QuizNextButton != null) cm.QuizNextButton.onClick.Invoke();
                        break;
                    }
                case "weather":
                    if (cm.FlowButtons.Count > 0) cm.FlowButtons[0].onClick.Invoke();   // 飛ぶ
                    break;
                default:   // info / class / exam / ftd / navlog / flight
                    if (cm.View != "flight")
                    {
                        if (cm.FlowNextButton != null) cm.FlowNextButton.onClick.Invoke();
                        else if (cm.FlowButtons.Count > 0) cm.FlowButtons[0].onClick.Invoke();
                    }
                    break;
            }
        }
        var stF = cm.Career.State;
        var foF = Js.Obj(Js.Get(stF, "fo"));
        Check(foF != null && Js.Bool(foF, "hired"), "final state: FO hired");
        Check(sawPrologue, "prologue was completed during the run");
        Check(sawGraduation, "graduation was recorded during the run");
        Check(File.Exists(Path.Combine(Application.persistentDataPath, "cadet-career-save.json")), "career save file exists on disk");
        Finish();
    }

    System.Collections.IEnumerator DriveLine()
    {
        var lm = FindObjectOfType<LineMain>();
        if (lm == null || lm.Duty == null) yield break;
        int guard = 0;
        while (lm.Duty.Phase != "debrief" && guard++ < 400)
        {
            yield return null;
            var d = lm.Duty;
            if (d.Phase == "brief") d.Advance();
            else if (d.Phase == "dispatch") d.AnswerDispatch((double)d.DispatchCase.CorrectIndex);
            else if (d.Phase == "ride")
            {
                var task = d.CurrentTask();
                if (d.Event != null && d.EventAnswer == null) d.AnswerEvent(BestEvent(d));
                else if (task != null) d.Answer(task.Id, 0.0);
                else lm.StepRide();
            }
            else
            {
                if (d.Event != null && d.EventAnswer == null) d.AnswerEvent(BestEvent(d));
                else if (lm.RealFlight) lm.StepReal(30);
                else lm.StepPf();
            }
        }
    }
    static double BestEvent(CadetLineDuty d)
    {
        int best = 0;
        for (int i = 1; i < d.Event.Scores.Count; i++) if (d.Event.Scores[i] > d.Event.Scores[best]) best = i;
        return best;
    }

    void Finish()
    {
        log.Add(fails == 0 ? "RESULT PASS" : "RESULT FAIL (" + fails + ")");
        File.WriteAllText(DonePath, string.Join("\n", log));
        Debug.Log("CAREER DONE fails=" + fails);
    }
}
