// DialogAcceptance.cs — editor-only Stage 8 harness: attach the dialog
// driver to the slice scene, play, wait for dialog-done.txt, exit.
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class DialogAcceptance
{
    private static double startT;
    private static string donePath;

    public static void AddDriver()
    {
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        if (UnityEngine.Object.FindObjectOfType<DialogDriver>() == null)
        {
            var go = new GameObject("DialogTest");
            go.AddComponent<DialogDriver>();
        }
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        Debug.Log("DIALOG_DRIVER_ATTACHED");
        EditorApplication.Exit(0);
    }

    public static void RunDialogAcceptance()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        donePath = Path.GetFullPath(Path.Combine(Application.dataPath, "../dialog-done.txt"));
        if (File.Exists(donePath)) File.Delete(donePath);
        var drv = UnityEngine.Object.FindObjectOfType<DialogDriver>();
        if (drv == null) { Debug.Log("DIALOG_SETUP_FAIL no driver"); EditorApplication.Exit(2); return; }
        drv.DonePath = donePath;
        startT = EditorApplication.timeSinceStartup;
        EditorApplication.update += Tick;
        EditorApplication.isPlaying = true;
        Debug.Log("DIALOG_ACCEPTANCE_BEGIN");
    }

    static void Tick()
    {
        if (File.Exists(donePath))
        {
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            Debug.Log("DIALOG_ACCEPTANCE_TICK_DONE");
            EditorApplication.Exit(0);
        }
        if (EditorApplication.timeSinceStartup - startT > 600)
        {
            EditorApplication.update -= Tick;
            Debug.Log("DIALOG_ACCEPTANCE_TIMEOUT");
            EditorApplication.Exit(3);
        }
    }
}
