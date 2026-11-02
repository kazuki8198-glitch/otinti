// DialogDriver — editor-only Stage 8 driver (play mode): builds the
// conversation screen over the people's dialog data and walks ALL nine
// conversations by clicking the actual UI (choice buttons and the panel).
// The walk must land on the same final state as the JS golden walk of the
// same data (golden-dialog.jsonl, trees/people): flags met_* ×5, trust
// dispatcher=52, 17 nodes seen. Screenshots: a line view and a choice view.
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cadet;

public class DialogDriver : MonoBehaviour
{
    public string DonePath = "";
    readonly List<string> log = new List<string>();
    void Say(string s) { log.Add(s); Debug.Log("[dialog] " + s); }

    IEnumerator Start()
    {
        yield return null;
        var cam = Camera.main;
        if (cam == null)
        {
            var cgo = new GameObject("MainCamera"); cgo.tag = "MainCamera";
            cam = cgo.AddComponent<Camera>();
        }
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.05f, 0.06f, 0.09f);

        var go = new GameObject("Dialog");
        var dm = go.AddComponent<DialogMain>();
        dm.BuildUi();
        // screen-space-camera so the acceptance's RenderTexture shots include the UI
        var canvas = go.GetComponentInChildren<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceCamera;
        canvas.worldCamera = cam; canvas.planeDistance = 1f;
        Say("load=" + dm.LoadPeople());

        string[] dialogs = { "chief", "dispatcher", "mechanic", "controller", "kiryu", "asahi", "mori", "lecturer", "examiner" };
        bool shotLine = false, shotChoice = false;
        int totalSteps = 0;
        foreach (var did in dialogs)
        {
            if (!dm.StartDialog(did)) { Say(did + ": start→end"); continue; }
            int steps = 0;
            while (dm.Runner.Running && steps < 60)
            {
                var v = dm.Current;
                if (v == null) break;
                if (!shotLine && v.Choices.Count == 0)
                {
                    shotLine = true;
                    yield return null;
                    Shot(Path.Combine(Path.GetDirectoryName(DonePath), "stage8-line.png"));
                    Say("line view: " + v.Dialog + ":" + v.Node + " speaker=" + v.Name);
                }
                if (v.Choices.Count > 0)
                {
                    if (!shotChoice)
                    {
                        shotChoice = true;
                        yield return null;
                        Shot(Path.Combine(Path.GetDirectoryName(DonePath), "stage8-choice.png"));
                        Say("choice view: " + v.Dialog + ":" + v.Node + " choices=" + v.Choices.Count + " first=\"" + v.Choices[0].Text + "\"");
                    }
                    dm.ClickChoiceButton(0);
                }
                else dm.ClickNext();
                steps++; totalSteps++;
                yield return null;
            }
            Say(did + ": steps=" + steps + " running=" + dm.Runner.Running);
        }
        var st = dm.Runner.State;
        var flagNames = new List<string>(st.Flags.Keys); flagNames.Sort();
        Say("state: flags=[" + string.Join(",", flagNames) + "] seen=" + st.Seen.Count + " trust dispatcher=" + DialogEngine.TrustOf(st, "dispatcher") + " views=" + dm.ViewsShown);
        bool pass = shotLine && shotChoice && dm.ViewsShown == 17 && st.Seen.Count == 17
            && Math.Abs(DialogEngine.TrustOf(st, "dispatcher") - 52) < 1e-9 && flagNames.Count == 5;
        Say(pass ? "RESULT PASS" : "RESULT FAIL");
        File.WriteAllText(DonePath, string.Join("\n", log) + "\n");
    }

    void Shot(string path)
    {
        var cam = Camera.main;
        var rt = new RenderTexture(1280, 800, 24);
        cam.targetTexture = rt;
        cam.Render();
        RenderTexture.active = rt;
        var tex = new Texture2D(1280, 800, TextureFormat.RGB24, false);
        tex.ReadPixels(new Rect(0, 0, 1280, 800), 0, 0); tex.Apply();
        cam.targetTexture = null; RenderTexture.active = null;
        File.WriteAllBytes(path, tex.EncodeToPNG());
        Destroy(tex); Destroy(rt);
        Say("shot " + Path.GetFileName(path));
    }
}
