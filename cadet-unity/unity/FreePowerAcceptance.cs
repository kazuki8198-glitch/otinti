// FreePowerAcceptance.cs — editor-only Stage 19 harness (same pattern as GameAcceptance).
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class FreePowerAcceptance
{
    private static double startT;
    private static string donePath;

    public static void AddDriver()
    {
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        EditorSceneManager.OpenScene("Assets/Scenes/Game.unity");
        if (UnityEngine.Object.FindObjectOfType<FreePowerDriver>() == null)
        {
            var go = new GameObject("FreePowerTest");
            go.AddComponent<FreePowerDriver>();
        }
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        Debug.Log("FREEPOWER_DRIVER_ATTACHED");
        EditorApplication.Exit(0);
    }

    public static void RunFreePower()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Game.unity");
        donePath = Path.GetFullPath(Path.Combine(Application.dataPath, "../freepower-done.txt"));
        if (File.Exists(donePath)) File.Delete(donePath);
        var drv = UnityEngine.Object.FindObjectOfType<FreePowerDriver>();
        if (drv == null) { Debug.Log("FREEPOWER_SETUP_FAIL no driver"); EditorApplication.Exit(2); return; }
        drv.DonePath = donePath;
        startT = EditorApplication.timeSinceStartup;
        EditorApplication.update += Tick;
        EditorApplication.isPlaying = true;
        Debug.Log("FREEPOWER_ACCEPTANCE_BEGIN");
    }

    static void Tick()
    {
        if (File.Exists(donePath))
        {
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            Debug.Log("FREEPOWER_ACCEPTANCE_TICK_DONE");
            EditorApplication.Exit(0);
        }
        if (EditorApplication.timeSinceStartup - startT > 300)
        {
            EditorApplication.update -= Tick;
            Debug.Log("FREEPOWER_ACCEPTANCE_TIMEOUT");
            EditorApplication.Exit(3);
        }
    }
}
