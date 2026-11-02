// LessonAcceptance.cs — editor-only Stage 2 acceptance: for each of a1 / t2 /
// i5 / j1, click the lesson button through the UI event system (the same seam
// SliceSceneSetup uses for the career button), fast-forward the lesson inside
// the play-mode runtime, and assert the outcome equals the verified mono
// reference (the bot digest): a1 S/pass, t2 done/not-passed (the reference
// bot's genuine result), i5 S/pass, j1 still in its first checklist step at
// t=240 (the jet checklist needs the CADET cockpit switch layer; the JS
// reference stalls identically). Screenshots are captured as evidence.
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;

public static class LessonAcceptance
{
    public static void AddLessonMain()
    {
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        var sm = UnityEngine.Object.FindObjectOfType<SliceMain>();
        if (sm == null) { Debug.Log("LESSON_SETUP_FAIL no SliceMain"); EditorApplication.Exit(2); return; }
        if (UnityEngine.Object.FindObjectOfType<LessonMain>() == null) sm.gameObject.AddComponent<LessonMain>();
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        Debug.Log("LESSON_MAIN_ATTACHED");
        EditorApplication.Exit(0);
    }

    private static readonly string[] IDS = { "a1", "t2", "i5", "j1" };
    private static int idx, phase, failures;
    private static double startT, lessonStartT;
    private static bool shotMid;

    public static void RunLessonAcceptance()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        idx = 0; phase = 0; failures = 0; shotMid = false;
        startT = EditorApplication.timeSinceStartup;
        EditorApplication.update += Tick;
        EditorApplication.isPlaying = true;
        Debug.Log("LESSON_ACCEPTANCE_BEGIN");
    }

    private static void Fail(string why)
    {
        EditorApplication.update -= Tick;
        Debug.Log("LESSON_ACCEPTANCE_FAIL " + why);
        EditorApplication.isPlaying = false;
        EditorApplication.Exit(3);
    }

    private static void Check(bool ok, string what)
    {
        Debug.Log((ok ? "LESSON_ACCEPT_PASS " : "LESSON_ACCEPT_FAIL ") + what);
        if (!ok) failures++;
    }

    private static void Tick()
    {
        double el = EditorApplication.timeSinceStartup - startT;
        if (el > 900) { Fail("timeout"); return; }
        var lm = LessonMain.Instance;
        var sm = SliceMain.Instance;
        if (lm == null || sm == null) return;
        try
        {
            if (idx >= IDS.Length)
            {
                Debug.Log("LESSON_ACCEPTANCE_DONE failures=" + failures);
                EditorApplication.update -= Tick;
                EditorApplication.isPlaying = false;
                EditorApplication.Exit(failures == 0 ? 0 : 3);
                return;
            }
            string id = IDS[idx];
            if (phase == 0)
            {
                var btn = GameObject.Find("LessonButton_" + id);
                if (btn == null) { if (el > 30) Fail("no button " + id); return; }
                lm.StepsPerFrame = 600;
                var pd = new PointerEventData(EventSystem.current) { button = PointerEventData.InputButton.Left };
                ExecuteEvents.ExecuteHierarchy(btn, pd, ExecuteEvents.pointerClickHandler);
                Debug.Log("LESSON_CLICK " + id);
                lessonStartT = EditorApplication.timeSinceStartup;
                shotMid = false;
                phase = 1;
                return;
            }
            if (!lm.LessonActive || lm.L == null) { if (EditorApplication.timeSinceStartup - lessonStartT > 20) Fail("lesson did not start " + id); return; }
            var L = lm.L;
            if (!shotMid && L.T > 20)
            {
                shotMid = true;
                string p = Path.GetFullPath(Path.Combine(Application.dataPath, "../lesson_" + id + ".png"));
                if (sm.CaptureWithUI(p)) Debug.Log("LESSON_SHOT " + p);
            }
            bool j1 = id == "j1";
            bool finished = j1 ? L.T >= 240 : L.Done;
            if (!finished) { if (EditorApplication.timeSinceStartup - lessonStartT > 300) Fail("lesson timeout " + id); return; }
            // assertions vs the mono reference digest
            if (id == "a1") { Check(L.Done && L.Passed && L.Grade == "S", $"a1 done={L.Done} passed={L.Passed} grade={L.Grade} t={L.T:F1}"); }
            else if (id == "t2") { Check(L.Done && !L.Passed && Math.Abs(L.Score - 0.8333) < 0.01, $"t2 done={L.Done} passed={L.Passed} grade={L.Grade} score={L.Score:F4} t={L.T:F1}"); }
            else if (id == "i5") { Check(L.Done && L.Passed && L.Grade == "S", $"i5 done={L.Done} passed={L.Passed} grade={L.Grade} t={L.T:F1}"); }
            else if (id == "j1") { Check(!L.Done && L.StepIdx == 0 && Math.Abs(L.Last.Kias - 3.61) < 0.6, $"j1 done={L.Done} step={L.StepIdx} kias={L.Last.Kias:F2} alt={L.Last.Alt:F0} t={L.T:F1} (mono reference: identical stall)"); }
            string ep = Path.GetFullPath(Path.Combine(Application.dataPath, "../lesson_" + id + "_end.png"));
            if (sm.CaptureWithUI(ep)) Debug.Log("LESSON_SHOT " + ep);
            lm.EndLessonToTitle();
            idx++; phase = 0;
        }
        catch (Exception ex) { Fail("exception: " + ex.Message + " " + ex.StackTrace); }
    }
}
