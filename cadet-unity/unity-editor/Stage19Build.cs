// Stage19Build.cs — editor-only build bootstrap (lives in Assets/Editor,
// synced from ~/workspace/cadet-unity/unity-editor/ by tools/sync-unity.sh).
//
// Why this exists: a cold player script compile cannot resolve
// UnityEditor.SceneManagement (CS0234), so *Acceptance.cs and
// GameSceneSetup.cs must be out of Assets/Scripts while
// BuildPipeline.BuildPlayer runs — the "evacuation" Stage 12 documented.
// (Stage 17's build only passed because the player assembly was still
// cached from Stage 12's evacuated compile; the first source edit since
// then forced a recompile and exposed this.) The full sequence —
// regenerate the scene, evacuate, build, restore — is
// tools/build-windows.sh. This bootstrap is the middle step only: open
// the freshly regenerated Game scene, verify no acceptance-driver
// component rides along (Stage 17 shipped a live GameDriver), build.
using System.IO;
using UnityEditor;
using UnityEngine;

public static class Stage19Build
{
    public static void BuildOnly()
    {
        UnityEditor.SceneManagement.EditorSceneManager.OpenScene("Assets/Scenes/Game.unity");
        foreach (var root in UnityEngine.SceneManagement.SceneManager.GetActiveScene().GetRootGameObjects())
            foreach (var mb in root.GetComponentsInChildren<MonoBehaviour>(true))
                if (mb != null && mb.GetType().Name.EndsWith("Driver"))
                {
                    Debug.LogError("BUILD_ABORT driver component in scene: " + mb.GetType().Name);
                    EditorApplication.Exit(5);
                    return;
                }
        string outDir = "/home/hatch/workspace/cadet-unity/build-windows";
        Directory.CreateDirectory(outDir);
        var opts = new BuildPlayerOptions
        {
            scenes = new[] { "Assets/Scenes/Game.unity" },
            locationPathName = Path.Combine(outDir, "Cadet.exe"),
            target = BuildTarget.StandaloneWindows64,
            options = BuildOptions.None,
        };
        var report = BuildPipeline.BuildPlayer(opts);
        Debug.Log("BUILD_RESULT " + report.summary.result + " size=" + report.summary.totalSize + " errors=" + report.summary.totalErrors);
        EditorApplication.Exit(report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded ? 0 : 4);
    }
}
