// GameSceneSetup.cs — editor-only: builds the integrated Game scene
// (Stage 12) and the final Windows player build.
//
// Stage 19 changes:
//  - The Windows build is now tools/build-windows.sh: it regenerates
//    the scene from code (BuildGameScene), evacuates the editor-only
//    sources (a cold player compile fails on their
//    UnityEditor.SceneManagement references, CS0234), builds via
//    Stage19Build.BuildOnly — which refuses to build if any *Driver
//    component is in the scene — and restores the sources. (Stage 17's
//    shipped build silently contained a live acceptance
//    "GameTest"/GameDriver object, and its compile only passed on a
//    player assembly cached from Stage 12's evacuated build.)
//  - EnsureAlwaysIncludedShaders: every material in this project is
//    created at runtime via Shader.Find, and no scene asset references
//    the shaders, so the player build stripped ALL of them (Cadet/Toon,
//    Standard, Unlit/Color, Unlit/Texture) — on the user's PC the world
//    rendered with the magenta error shader. They are now pinned in
//    GraphicsSettings' Always Included Shaders, from code, so the fix
//    is reproducible wherever this build runs.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class GameSceneSetup
{
    static void EnsureAlwaysIncludedShaders()
    {
        var wanted = new List<Shader>();
        var toon = AssetDatabase.LoadAssetAtPath<Shader>("Assets/Shaders/CadetToon.shader");
        if (toon != null) wanted.Add(toon);
        foreach (var n in new[] { "Standard", "Unlit/Color", "Unlit/Texture" })
        {
            var s = Shader.Find(n);
            if (s != null) wanted.Add(s);
        }
        var gs = AssetDatabase.LoadAssetAtPath<UnityEngine.Object>("ProjectSettings/GraphicsSettings.asset");
        var so = new SerializedObject(gs);
        var prop = so.FindProperty("m_AlwaysIncludedShaders");
        var added = new List<string>();
        foreach (var s in wanted)
        {
            bool present = false;
            for (int i = 0; i < prop.arraySize; i++)
                if (prop.GetArrayElementAtIndex(i).objectReferenceValue == s) { present = true; break; }
            if (!present)
            {
                int idx = prop.arraySize;
                prop.InsertArrayElementAtIndex(idx);
                prop.GetArrayElementAtIndex(idx).objectReferenceValue = s;
                added.Add(s.name);
            }
        }
        so.ApplyModifiedProperties();
        Debug.Log("ALWAYS_INCLUDED_SHADERS total=" + prop.arraySize + " added=[" + string.Join(",", added) + "]");
    }

    public static void BuildGameSceneCore()
    {
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
        EnsureAlwaysIncludedShaders();
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var camGo = new GameObject("MainCamera"); camGo.tag = "MainCamera";
        camGo.AddComponent<Camera>(); camGo.AddComponent<AudioListener>();
        camGo.transform.position = new Vector3(-39960, 26, 90);
        var sliceGo = new GameObject("Slice");
        sliceGo.AddComponent<SliceMain>();
        sliceGo.AddComponent<LessonMain>();
        var cockpitGo = new GameObject("Cockpit"); cockpitGo.AddComponent<CockpitMain>();
        var g1000Go = new GameObject("G1000Glass"); var g1 = g1000Go.AddComponent<G1000GlassMain>(); g1.Cm = cockpitGo.GetComponent<CockpitMain>();
        var bglassGo = new GameObject("BoeingGlass"); var bg = bglassGo.AddComponent<BoeingGlassMain>(); bg.Cm = cockpitGo.GetComponent<CockpitMain>();
        var freeGo = new GameObject("FreeMode"); var fm = freeGo.AddComponent<FreeModeMain>(); fm.Cockpit = cockpitGo.GetComponent<CockpitMain>();
        var lineGo = new GameObject("Line"); lineGo.AddComponent<LineMain>();
        var aiGo = new GameObject("Ai"); aiGo.AddComponent<AiAskMain>();
        var walkGo = new GameObject("Walk"); walkGo.AddComponent<WalkMain>();
        var careerGo = new GameObject("Career"); var cmain = careerGo.AddComponent<CareerMain>();
        var dlgGo = new GameObject("Dialog"); dlgGo.AddComponent<DialogMain>();
        var sfxGo = new GameObject("Sfx"); sfxGo.AddComponent<SfxMain>();
        var devGo = new GameObject("Devices"); devGo.AddComponent<DevicesMain>();
        var sttGo = new GameObject("Stt"); sttGo.AddComponent<SttMain>();
        var ttsGo = new GameObject("Tts"); ttsGo.AddComponent<TtsMain>();
        var gameGo = new GameObject("Game"); var gm = gameGo.AddComponent<GameMain>();
        gm.FreeModeRoot = freeGo; gm.LineRoot = lineGo; gm.AiRoot = aiGo; gm.WalkRoot = walkGo; gm.CareerRoot = careerGo;
        cmain.Line = lineGo.GetComponent<LineMain>(); cmain.Game = gm;
        freeGo.SetActive(false); lineGo.SetActive(false); aiGo.SetActive(false); walkGo.SetActive(false); careerGo.SetActive(false);
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/Game.unity");
        Debug.Log("GAME_SCENE_BUILT");
    }

    public static void BuildGameScene()
    {
        BuildGameSceneCore();
        EditorApplication.Exit(0);
    }

    public static void BuildWindows()
    {
        // Stage 19: this entry point no longer builds by itself — see
        // the header. Use tools/build-windows.sh.
        Debug.LogError("BUILD_WINDOWS_MOVED use tools/build-windows.sh (see STAGE19-REPORT.md)");
        EditorApplication.Exit(6);
    }
}
