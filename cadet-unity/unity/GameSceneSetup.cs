// GameSceneSetup.cs — editor-only: builds the integrated Game scene
// (Stage 12) and the final Windows player build.
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class GameSceneSetup
{
    public static void BuildGameScene()
    {
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var camGo = new GameObject("MainCamera"); camGo.tag = "MainCamera";
        camGo.AddComponent<Camera>(); camGo.AddComponent<AudioListener>();
        camGo.transform.position = new Vector3(-39960, 26, 90);
        var sliceGo = new GameObject("Slice");
        sliceGo.AddComponent<SliceMain>();
        sliceGo.AddComponent<LessonMain>();
        var cockpitGo = new GameObject("Cockpit"); cockpitGo.AddComponent<CockpitMain>();
        var freeGo = new GameObject("FreeMode"); var fm = freeGo.AddComponent<FreeModeMain>(); fm.Cockpit = cockpitGo.GetComponent<CockpitMain>();
        var lineGo = new GameObject("Line"); lineGo.AddComponent<LineMain>();
        var aiGo = new GameObject("Ai"); aiGo.AddComponent<AiAskMain>();
        var walkGo = new GameObject("Walk"); walkGo.AddComponent<WalkMain>();
        var dlgGo = new GameObject("Dialog"); dlgGo.AddComponent<DialogMain>();
        var sfxGo = new GameObject("Sfx"); sfxGo.AddComponent<SfxMain>();
        var devGo = new GameObject("Devices"); devGo.AddComponent<DevicesMain>();
        var gameGo = new GameObject("Game"); var gm = gameGo.AddComponent<GameMain>();
        gm.FreeModeRoot = freeGo; gm.LineRoot = lineGo; gm.AiRoot = aiGo; gm.WalkRoot = walkGo;
        freeGo.SetActive(false); lineGo.SetActive(false); aiGo.SetActive(false); walkGo.SetActive(false);
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/Game.unity");
        Debug.Log("GAME_SCENE_BUILT");
        EditorApplication.Exit(0);
    }

    public static void BuildWindows()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/Game.unity");
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
