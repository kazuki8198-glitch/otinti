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

    static bool AnyLit(Texture2D tx)
    {
        if (tx == null) return false;
        var px = tx.GetPixels32();
        for (int i = 0; i < px.Length; i += 997) if (px[i].r > 24 || px[i].g > 24 || px[i].b > 24) return true;
        return false;
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
        // ---- Stage 13: G1000 glass live on the piston cockpit ----
        gm.ClosePanel(); gm.Open("free");
        yield return null; yield return null;
        fm.SelAircraft = "pa28"; fm.SelStart = "ramp"; fm.SelFail = "none";
        fm.StartSession();
        var glass = FindObjectOfType<G1000GlassMain>();
        // Bound is set inside Pump(), which runs from Update — judging it in
        // the session-start frame races the bind. Wait for it (capped).
        float bw = Time.realtimeSinceStartup;
        while (Time.realtimeSinceStartup - bw < 10 && !(glass != null && glass.Bound)) yield return null;
        Check(glass != null && glass.Bound, "G1000 glass bound to the free-mode cockpit");
        if (glass != null)
        {
            // The ramp start above is unpowered, so the PFD must be black
            // (that is the spec: no bus power, no picture). Then restart in
            // the air with the engine running — the PFD must be drawn.
            glass.Pump();
            bool darkOk = !AnyLit(glass.PfdTexture);
            fm.SelStart = "area";
            fm.StartSession();
            // The session is built cold (split BAT/ALT off) and SetRunning —
            // faithfully to systems.js — does not touch the split switches,
            // so power the bus the way the pilot does: the cockpit's own
            // rocker controls, through the normal Press path.
            if (!fm.Cockpit.Cp.GetBool("bat")) fm.Cockpit.Press("sw.bat");
            if (!fm.Cockpit.Cp.GetBool("alt")) fm.Cockpit.Press("sw.alt");
            float pw = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - pw < 10 && !fm.Cockpit.Sys.Elec.PfdOn) yield return null;
            glass.Pump();
            bool anyLit = AnyLit(glass.PfdTexture);
            Check(darkOk && anyLit, "G1000 PFD texture is drawn (non-black sample)");
        }
        // ---- Stage 13: free-mode failure injection, live ----
        fm.SelFail = "pitot"; fm.SelFailWhen = "now";
        fm.StartSession();
        Check(fm.FailFiredKinds.Contains("pitot") && fm.Cockpit.S.PitotRisk == 3, "free-mode fault injection fires (pitot, immediate)");
        fm.SelFail = "engine"; fm.SelFailWhen = "time"; fm.SelFailValue = 0.02;
        fm.StartSession();
        float fw = Time.realtimeSinceStartup;
        while (Time.realtimeSinceStartup - fw < 20 && !fm.FailFiredKinds.Contains("engine")) yield return null;
        Check(fm.FailFiredKinds.Contains("engine") && fm.Cockpit.S.Eng[0].Failed, "free-mode fault injection fires on schedule (engine at 0.02 min)");
        fm.SelFail = "none";
        // ---- Stage 13: device axes consumed by the flight loop ----
        var dev = FindObjectOfType<DevicesMain>();
        Check(dev != null, "devices component present");
        if (dev != null)
        {
            dev.Synthetic = new DeviceAxes { Pitch = 0.6, Roll = 0, Yaw = 0, Throttle01 = 0.42 };
            float dw = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - dw < 10 && !(Math.Abs(sm.S.PIn) > 0.2 && Math.Abs(sm.S.Thr - 0.42) < 0.03)) yield return null;
            Check(Math.Abs(sm.S.PIn) > 0.2 && Math.Abs(sm.S.Thr - 0.42) < 0.03, "device axes reach the flight loop (PIn " + sm.S.PIn.ToString("F2") + ", Thr " + sm.S.Thr.ToString("F2") + ")");
            dev.Synthetic = null;
        }
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
