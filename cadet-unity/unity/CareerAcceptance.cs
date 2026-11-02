// CareerAcceptance.cs — editor-only Stage 15 harness (same pattern as Stage 12,
// with a longer budget: the whole career is ~150 days of flow).
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class CareerAcceptance
{
    private static double startT;
    private static string donePath;

    public static void AddDriver()
    {
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        EditorSceneManager.OpenScene("Assets/Scenes/Game.unity");
        if (UnityEngine.Object.FindObjectOfType<CareerDriver>() == null)
        {
            var go = new GameObject("CareerTest");
            go.AddComponent<CareerDriver>();
        }
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        Debug.Log("CAREER_DRIVER_ATTACHED");
        EditorApplication.Exit(0);
    }

    public static void RunCareerAcceptance()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Game.unity");
        donePath = Path.GetFullPath(Path.Combine(Application.dataPath, "../career-done.txt"));
        if (File.Exists(donePath)) File.Delete(donePath);
        var drv = UnityEngine.Object.FindObjectOfType<CareerDriver>();
        if (drv == null) { Debug.Log("CAREER_SETUP_FAIL no driver"); EditorApplication.Exit(2); return; }
        drv.DonePath = donePath;
        startT = EditorApplication.timeSinceStartup;
        EditorApplication.update += Tick;
        EditorApplication.isPlaying = true;
        Debug.Log("CAREER_ACCEPTANCE_BEGIN");
    }

    static void Tick()
    {
        if (File.Exists(donePath))
        {
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            Debug.Log("CAREER_ACCEPTANCE_TICK_DONE");
            EditorApplication.Exit(0);
        }
        if (EditorApplication.timeSinceStartup - startT > 2400)
        {
            EditorApplication.update -= Tick;
            Debug.Log("CAREER_ACCEPTANCE_TIMEOUT");
            EditorApplication.Exit(3);
        }
    }
}
