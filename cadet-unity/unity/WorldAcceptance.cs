// WorldAcceptance.cs — editor-only Stage 3 harness: attach WorldMain to the
// slice scene, play, wait for world-done.txt, exit with the verdict.
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class WorldAcceptance
{
    private static double startT;
    private static string donePath;

    public static void AddWorldMain()
    {
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        var sm = UnityEngine.Object.FindObjectOfType<SliceMain>();
        if (sm == null) { Debug.Log("WORLD_SETUP_FAIL no SliceMain"); EditorApplication.Exit(2); return; }
        if (UnityEngine.Object.FindObjectOfType<WorldMain>() == null)
        {
            var go = new GameObject("World");
            go.AddComponent<WorldMain>();
        }
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        Debug.Log("WORLD_MAIN_ATTACHED");
        EditorApplication.Exit(0);
    }

    public static void RunWorldAcceptance()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Slice.unity");
        donePath = Path.GetFullPath(Path.Combine(Application.dataPath, "../world-done.txt"));
        if (File.Exists(donePath)) File.Delete(donePath);
        startT = EditorApplication.timeSinceStartup;
        EditorApplication.update += Tick;
        EditorApplication.isPlaying = true;
        Debug.Log("WORLD_ACCEPTANCE_BEGIN");
    }

    private static void Tick()
    {
        double el = EditorApplication.timeSinceStartup - startT;
        if (File.Exists(donePath))
        {
            Debug.Log("WORLD_ACCEPTANCE_DONE " + File.ReadAllText(donePath));
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            EditorApplication.Exit(0);
            return;
        }
        if (el > 300)
        {
            Debug.Log("WORLD_ACCEPTANCE_FAIL timeout");
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            EditorApplication.Exit(3);
        }
    }
}
