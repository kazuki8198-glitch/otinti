// SliceSceneSetup.cs — editor-only: builds the slice scene and runs the automated
// real-input acceptance test (title click via the UI event path → parked → brake release →
// throttle → rotation → climb), writing a numeric trace + screenshot as evidence.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;

public static class SliceSceneSetup
{
    public static void MakeScene()
    {
        // play mode must NOT reload the domain: the acceptance test is driven from an
        // EditorApplication.update handler, which a domain reload would silently kill
        // (the same trap that ate the spike's editor-side screenshot).
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var camGo = new GameObject("Main Camera");
        var cam = camGo.AddComponent<Camera>();
        camGo.tag = "MainCamera";
        cam.clearFlags = CameraClearFlags.Skybox;
        var main = new GameObject("SliceMain");
        main.AddComponent<SliceMain>();
        Directory.CreateDirectory("Assets/Scenes");
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/Slice.unity");
        Debug.Log("SLICE_SCENE_SAVED");
    }

    private static double startT;
    private static int phase;
    private static VirtualKeySetProbe probe;
    private static List<string> rows;
    private static double liftoffT = -1;
    private static bool shotDone;
    private static bool shotTitleDone;

    // the test drives the game through the same seams a player uses:
    // the career button is clicked through the UI event system, keys come from a virtual
    // IKeySet read by the very same Controls.Update, actions through Controls.Action.
    private sealed class VirtualKeySetProbe : Cadet.IKeySet
    {
        public readonly HashSet<string> Down = new HashSet<string>();
        public bool Has(string code) => Down.Contains(code);
        public bool Shift => false;
    }

    public static void RunSliceTest()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        startT = EditorApplication.timeSinceStartup;
        phase = 0; liftoffT = -1; shotDone = false;
        probe = new VirtualKeySetProbe();
        rows = new List<string> { "t,ias,alt,along,pitch,thr,ground" };
        EditorApplication.update += Tick;
        EditorApplication.isPlaying = true;
        Debug.Log("SLICE_TEST_BEGIN");
    }

    private static void Fail(string why)
    {
        EditorApplication.update -= Tick;
        Debug.Log("SLICE_TEST_FAIL " + why);
        EditorApplication.isPlaying = false;
        EditorApplication.Exit(2);
    }

    private static void Tick()
    {
        double el = EditorApplication.timeSinceStartup - startT;
        if (el > 300) { Fail("timeout"); return; }
        var m = SliceMain.Instance;
        if (m == null) return;
        try
        {
            if (phase == 0)
            {
                if (m.CareerButton == null) return;
                if (!shotTitleDone && el > 2.5)
                {
                    shotTitleDone = true;
                    string tp = Path.GetFullPath(Path.Combine(Application.dataPath, "../slice_title.png"));
                    if (m.CaptureWithUI(tp)) Debug.Log("SLICE_TITLE_SHOT_SAVED " + tp);
                }
                if (el < 3.2) return;
                var pd = new PointerEventData(EventSystem.current) { button = PointerEventData.InputButton.Left };
                ExecuteEvents.ExecuteHierarchy(m.CareerButton.gameObject, pd, ExecuteEvents.pointerClickHandler);
                Debug.Log("SLICE_CLICK_DISPATCHED");
                phase = 1;
                return;
            }
            if (!m.InFlight) { if (el > 20) Fail("click did not start the flight"); return; }
            if (phase == 1)
            {
                Debug.Log("SLICE_FLIGHT_CONFIRMED career=" + m.CareerMode);
                m.KeySource = probe;
                phase = 2;
            }
            var s = m.S;
            double t = s.T;
            // the script (identical to the JS/C# equivalence driver)
            if (t >= 1.0 && m.Ctl.ParkBrake) { m.LastActionText = m.Ctl.Action(s, "parkBrake", 0, false); Debug.Log("SLICE_PARK_RELEASED t=" + t.ToString("F2")); }
            probe.Down.Clear();
            if (t >= 2.0 && s.Thr < 0.999) probe.Down.Add("KeyR");
            bool rotated = liftoffT > 0 || (s.Out.Ias >= 55 && s.Out.Pitch >= 11);
            if (!rotated && s.Out.Ias >= 55) probe.Down.Add("KeyS");
            if (rotated && s.Out.Pitch < 11) probe.Down.Add("KeyS");
            if (!s.OnGround && liftoffT < 0 && t > 2) { liftoffT = t; Debug.Log("SLICE_LIFTOFF t=" + t.ToString("F2")); }
            double lt = Math.Round(t * 2) / 2;
            if (Math.Abs(t - lt) < 0.02 && (rows.Count == 1 || !rows[rows.Count - 1].StartsWith(lt.ToString("F4"))))
                rows.Add(string.Format("{0:F4},{1:F4},{2:F4},{3:F4},{4:F4},{5:F4},{6}", lt, s.Out.Ias, s.Out.AltTrue, s.Out.RwyAlong, s.Out.Pitch, s.Thr, s.OnGround ? 1 : 0));
            if (!shotDone && t >= 30)
            {
                shotDone = true;
                string hp = Path.GetFullPath(Path.Combine(Application.dataPath, "../slice_hud.png"));
                if (m.CaptureWithUI(hp)) Debug.Log("SLICE_HUD_SHOT_SAVED " + hp);
                var cam = Camera.main;
                var rt = new RenderTexture(960, 540, 24);
                cam.targetTexture = rt; cam.Render();
                RenderTexture.active = rt;
                var tex = new Texture2D(960, 540, TextureFormat.RGB24, false);
                tex.ReadPixels(new Rect(0, 0, 960, 540), 0, 0); tex.Apply();
                cam.targetTexture = null; RenderTexture.active = null;
                string outPath = Path.GetFullPath(Path.Combine(Application.dataPath, "../slice_flight.png"));
                File.WriteAllBytes(outPath, tex.EncodeToPNG());
                Debug.Log("SLICE_SHOT_SAVED " + outPath);
            }
            if (t >= 45)
            {
                string csvPath = Path.GetFullPath(Path.Combine(Application.dataPath, "../slice_trace.csv"));
                File.WriteAllLines(csvPath, rows);
                Debug.Log($"SLICE_TEST_DONE liftoffT={liftoffT:F2} alt45={s.Out.AltTrue:F1} ias45={s.Out.Ias:F1} rows={rows.Count - 1} crashed={s.Crashed}");
                EditorApplication.update -= Tick;
                EditorApplication.isPlaying = false;
                EditorApplication.Exit(0);
            }
        }
        catch (Exception ex) { Fail("exception: " + ex.Message); }
    }
}

public static class SliceBuild
{
    public static void BuildWindows()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        var scenes = new[] { "Assets/Scenes/Slice.unity" };
        var bp = new BuildPlayerOptions { scenes = scenes, locationPathName = "Build/Win/CadetSlice.exe", target = BuildTarget.StandaloneWindows64, options = BuildOptions.None };
        var rep = BuildPipeline.BuildPlayer(bp);
        Debug.Log("SLICE_BUILD_RESULT: " + rep.summary.result + " size=" + rep.summary.totalSize + " errors=" + rep.summary.totalErrors);
    }
}
