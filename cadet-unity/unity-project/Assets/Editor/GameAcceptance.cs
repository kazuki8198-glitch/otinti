// GameAcceptance.cs — editor-only Stage 12 harness (same pattern as Stage 7).
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class GameAcceptance
{
    private static double startT;
    private static string donePath;

    public static void AddDriver()
    {
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        EditorSceneManager.OpenScene("Assets/Scenes/Game.unity");
        if (UnityEngine.Object.FindObjectOfType<GameDriver>() == null)
        {
            var go = new GameObject("GameTest");
            go.AddComponent<GameDriver>();
        }
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        Debug.Log("GAME_DRIVER_ATTACHED");
        EditorApplication.Exit(0);
    }

    public static void RunGameAcceptance()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Game.unity");
        donePath = Path.GetFullPath(Path.Combine(Application.dataPath, "../game-done.txt"));
        if (File.Exists(donePath)) File.Delete(donePath);
        var drv = UnityEngine.Object.FindObjectOfType<GameDriver>();
        if (drv == null) { Debug.Log("GAME_SETUP_FAIL no driver"); EditorApplication.Exit(2); return; }
        drv.DonePath = donePath;
        startT = EditorApplication.timeSinceStartup;
        EditorApplication.update += Tick;
        EditorApplication.isPlaying = true;
        Debug.Log("GAME_ACCEPTANCE_BEGIN");
    }

    static void Tick()
    {
        if (File.Exists(donePath))
        {
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            Debug.Log("GAME_ACCEPTANCE_TICK_DONE");
            EditorApplication.Exit(0);
        }
        if (EditorApplication.timeSinceStartup - startT > 900)
        {
            EditorApplication.update -= Tick;
            Debug.Log("GAME_ACCEPTANCE_TIMEOUT");
            EditorApplication.Exit(3);
        }
    }
}
