// Stage11Acceptance.cs — editor-only Stage 9 harness (same pattern as Stage 7).
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class Stage11Acceptance
{
    private static double startT;
    private static string donePath;

    public static void AddDriver()
    {
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        if (UnityEngine.Object.FindObjectOfType<Stage11Driver>() == null)
        {
            var go = new GameObject("Stage11Test");
            go.AddComponent<Stage11Driver>();
        }
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        Debug.Log("STAGE11_DRIVER_ATTACHED");
        EditorApplication.Exit(0);
    }

    public static void RunStage11Acceptance()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        donePath = Path.GetFullPath(Path.Combine(Application.dataPath, "../stage11-done.txt"));
        if (File.Exists(donePath)) File.Delete(donePath);
        var drv = UnityEngine.Object.FindObjectOfType<Stage11Driver>();
        if (drv == null) { Debug.Log("STAGE11_SETUP_FAIL no driver"); EditorApplication.Exit(2); return; }
        drv.DonePath = donePath;
        startT = EditorApplication.timeSinceStartup;
        EditorApplication.update += Tick;
        EditorApplication.isPlaying = true;
        Debug.Log("STAGE11_ACCEPTANCE_BEGIN");
    }

    static void Tick()
    {
        if (File.Exists(donePath))
        {
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            Debug.Log("STAGE11_ACCEPTANCE_TICK_DONE");
            EditorApplication.Exit(0);
        }
        if (EditorApplication.timeSinceStartup - startT > 900)
        {
            EditorApplication.update -= Tick;
            Debug.Log("STAGE11_ACCEPTANCE_TIMEOUT");
            EditorApplication.Exit(3);
        }
    }
}
