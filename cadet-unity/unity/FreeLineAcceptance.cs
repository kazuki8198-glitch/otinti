// FreeLineAcceptance.cs — editor-only Stage 9 harness (same pattern as Stage 7).
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class FreeLineAcceptance
{
    private static double startT;
    private static string donePath;

    public static void AddDriver()
    {
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        if (UnityEngine.Object.FindObjectOfType<FreeLineDriver>() == null)
        {
            var go = new GameObject("FreeLineTest");
            go.AddComponent<FreeLineDriver>();
        }
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        Debug.Log("FREELINE_DRIVER_ATTACHED");
        EditorApplication.Exit(0);
    }

    public static void RunFreeLineAcceptance()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        donePath = Path.GetFullPath(Path.Combine(Application.dataPath, "../freeline-done.txt"));
        if (File.Exists(donePath)) File.Delete(donePath);
        var drv = UnityEngine.Object.FindObjectOfType<FreeLineDriver>();
        if (drv == null) { Debug.Log("FREELINE_SETUP_FAIL no driver"); EditorApplication.Exit(2); return; }
        drv.DonePath = donePath;
        startT = EditorApplication.timeSinceStartup;
        EditorApplication.update += Tick;
        EditorApplication.isPlaying = true;
        Debug.Log("FREELINE_ACCEPTANCE_BEGIN");
    }

    static void Tick()
    {
        if (File.Exists(donePath))
        {
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            Debug.Log("FREELINE_ACCEPTANCE_TICK_DONE");
            EditorApplication.Exit(0);
        }
        if (EditorApplication.timeSinceStartup - startT > 900)
        {
            EditorApplication.update -= Tick;
            Debug.Log("FREELINE_ACCEPTANCE_TIMEOUT");
            EditorApplication.Exit(3);
        }
    }
}
