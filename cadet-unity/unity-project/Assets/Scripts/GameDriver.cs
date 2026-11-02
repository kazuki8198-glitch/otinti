// GameDriver — the Stage 12 cold-boot through-test: title → career flight
// (real button click, scripted virtual keys through SliceMain's own input
// path) → takeoff → the hub's panels (free mode session, line duty, AI
// question, walking) opened and exercised through their public APIs.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cadet;

public class GameDriver : MonoBehaviour
{
    public string DonePath;
    readonly List<string> log = new List<string>();
    int fails;
    void Check(bool ok, string what) { log.Add((ok ? "PASS " : "FAIL ") + what); if (!ok) fails++; Debug.Log("GAME " + (ok ? "PASS " : "FAIL ") + what); }
    void Start() { StartCoroutine(Run()); }

    void Shot(string name)
    {
        var cam = Camera.main; if (cam == null) return;
        var rt = new RenderTexture(1280, 800, 24); var prev = cam.targetTexture;
        cam.targetTexture = rt; cam.Render();
        RenderTexture.active = rt;
        var tex = new Texture2D(1280, 800, TextureFormat.RGB24, false);
        tex.ReadPixels(new Rect(0, 0, 1280, 800), 0, 0); tex.Apply();
        File.WriteAllBytes("/home/hatch/workspace/cadet-unity/" + name, tex.EncodeToPNG());
        cam.targetTexture = prev; RenderTexture.active = null;
        DestroyImmediate(rt); DestroyImmediate(tex);
    }

    System.Collections.IEnumerator Run()
    {
        yield return null; yield return null; yield return null;
        var sm = SliceMain.Instance;
        Check(sm != null, "cold boot: SliceMain alive");
        var title = GameObject.Find("TitlePanel");
        Check(title != null && title.activeInHierarchy, "title panel shown at boot");
        var gm = FindObjectOfType<GameMain>();
        Check(gm != null, "hub present");
        Shot("stage12-title.png");
        // ---- career flight through the real button ----
        sm.CareerButton.onClick.Invoke();
        yield return null;
        Check(sm.InFlight && sm.CareerMode, "career flight started via the title button");
        var keys = new VirtualKeySet();
        sm.KeySource = keys;
        Time.timeScale = 3f;
        double t = 0; bool released = false, rotated = false, airborne = false;
        float startRealtime = Time.realtimeSinceStartup;
        while (Time.realtimeSinceStartup - startRealtime < 90)
        {
            yield return null;
            if (sm.S == null) continue;
            t += Time.deltaTime * 3;   // approx sim seconds (timeScale 3)
            if (!released && t >= 1) { sm.Ctl.Action(sm.S, "parkBrake", 0, false); released = true; }
            if (t >= 2 && sm.S.Thr < 0.999) keys.Down.Add("KeyR"); else if (sm.S.Thr >= 0.999) keys.Down.Remove("KeyR");
            if (!rotated && sm.S.Out.Ias >= 55) { keys.Down.Add("KeyS"); rotated = true; }
            if (rotated && sm.S.Out.Pitch >= 11) keys.Down.Remove("KeyS");
            if (!sm.S.OnGround && sm.S.Out.AltTrue > 100) { airborne = true; break; }
        }
        Time.timeScale = 1f;
        Check(airborne, "takeoff through the input path (airborne, alt " + (sm.S != null ? sm.S.Out.AltTrue.ToString("F0") : "?") + " ft, IAS " + (sm.S != null ? sm.S.Out.Ias.ToString("F0") : "?") + " kt)");
        Shot("stage12-flight.png");
        // ---- hub panels ----
        gm.Open("free");
        yield return null; yield return null;
        var fm = FindObjectOfType<FreeModeMain>();
        Check(fm != null && gm.OpenPanel == "free", "free-mode panel opened from the hub");
        fm.SelAircraft = "b737"; fm.SelStart = "area";
        var cfg = fm.StartSession();
        Check((string)cfg["aircraft"] == "b737" && fm.Cockpit != null && fm.Cockpit.Sys.St.Eng == "run", "free session started from the panel (737, engine running)");
        gm.ClosePanel();
        gm.Open("line");
        yield return null; yield return null;
        var lm = FindObjectOfType<LineMain>();
        Check(lm != null, "line panel opened");
        lm.StartDuty();
        Check(lm.Duty != null && lm.Duty.Phase == "brief", "line duty created from the panel");
        gm.ClosePanel();
        gm.Open("ai");
        yield return null; yield return null;
        var ai = FindObjectOfType<AiAskMain>();
        var ans = ai != null ? ai.Ask("着陸のコツを教えてください") : null;
        Check(ans != null && MiniJson.Bool(ans, "ok"), "AI instructor answered from the panel");
        gm.ClosePanel();
        gm.Open("walk");
        yield return null; yield return null; yield return null;
        var wm = FindObjectOfType<WalkMain>();
        Check(wm != null && wm.gameObject.activeInHierarchy, "walk mode opened (interiors + walker)");
        Shot("stage12-walk.png");
        gm.ClosePanel();
        Check(gm.OpenPanel == "", "returned to title state");
        log.Add(fails == 0 ? "RESULT PASS" : "RESULT FAIL (" + fails + ")");
        File.WriteAllText(DonePath, string.Join("\n", log));
        Debug.Log("GAME DONE fails=" + fails);
    }
}
