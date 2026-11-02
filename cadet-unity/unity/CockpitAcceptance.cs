// CockpitAcceptance.cs — editor-only Stage 6 harness: attach the cockpit
// driver to the slice scene, play, wait for cockpit-done.txt, exit.
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class CockpitAcceptance
{
    private static double startT;
    private static string donePath;

    public static void AddDriver()
    {
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        if (UnityEngine.Object.FindObjectOfType<CockpitDriver>() == null)
        {
            var go = new GameObject("CockpitTest");
            go.AddComponent<CockpitDriver>();
        }
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        Debug.Log("COCKPIT_DRIVER_ATTACHED");
        EditorApplication.Exit(0);
    }

    public static void RunCockpitAcceptance()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        donePath = Path.GetFullPath(Path.Combine(Application.dataPath, "../cockpit-done.txt"));
        if (File.Exists(donePath)) File.Delete(donePath);
        var drv = UnityEngine.Object.FindObjectOfType<CockpitDriver>();
        if (drv == null) { Debug.Log("COCKPIT_SETUP_FAIL no driver"); EditorApplication.Exit(2); return; }
        drv.DonePath = donePath;
        startT = EditorApplication.timeSinceStartup;
        EditorApplication.update += Tick;
        EditorApplication.isPlaying = true;
        Debug.Log("COCKPIT_ACCEPTANCE_BEGIN");
    }

    static void Tick()
    {
        if (File.Exists(donePath))
        {
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            Debug.Log("COCKPIT_ACCEPTANCE_TICK_DONE");
            EditorApplication.Exit(0);
        }
        if (EditorApplication.timeSinceStartup - startT > 600)
        {
            EditorApplication.update -= Tick;
            Debug.Log("COCKPIT_ACCEPTANCE_TIMEOUT");
            EditorApplication.Exit(3);
        }
    }
}
