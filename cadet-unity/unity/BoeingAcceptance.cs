// BoeingAcceptance.cs — editor-only Stage 7 harness: attach the boeing
// driver to the slice scene, play, wait for boeing-done.txt, exit.
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class BoeingAcceptance
{
    private static double startT;
    private static string donePath;

    public static void AddDriver()
    {
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        if (UnityEngine.Object.FindObjectOfType<BoeingDriver>() == null)
        {
            var go = new GameObject("BoeingTest");
            go.AddComponent<BoeingDriver>();
        }
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        Debug.Log("BOEING_DRIVER_ATTACHED");
        EditorApplication.Exit(0);
    }

    public static void RunBoeingAcceptance()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        donePath = Path.GetFullPath(Path.Combine(Application.dataPath, "../boeing-done.txt"));
        if (File.Exists(donePath)) File.Delete(donePath);
        var drv = UnityEngine.Object.FindObjectOfType<BoeingDriver>();
        if (drv == null) { Debug.Log("BOEING_SETUP_FAIL no driver"); EditorApplication.Exit(2); return; }
        drv.DonePath = donePath;
        startT = EditorApplication.timeSinceStartup;
        EditorApplication.update += Tick;
        EditorApplication.isPlaying = true;
        Debug.Log("BOEING_ACCEPTANCE_BEGIN");
    }

    static void Tick()
    {
        if (File.Exists(donePath))
        {
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            Debug.Log("BOEING_ACCEPTANCE_TICK_DONE");
            EditorApplication.Exit(0);
        }
        if (EditorApplication.timeSinceStartup - startT > 600)
        {
            EditorApplication.update -= Tick;
            Debug.Log("BOEING_ACCEPTANCE_TIMEOUT");
            EditorApplication.Exit(3);
        }
    }
}
