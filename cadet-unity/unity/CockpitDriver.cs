// CockpitDriver — the Stage 6 in-engine acceptance run (driven by
// CockpitAcceptance): builds all three cockpits, raycast-picks every control
// from the pilot's eye, presses everything every way inside a live session,
// then starts the Archer from cold by cockpit controls only and does the
// run-up checks (mag drops, carb heat) through the same clicks.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cadet;

public class CockpitDriver : MonoBehaviour
{
    public string DonePath;
    CockpitMain cm;
    readonly List<string> lines = new List<string>();
    bool ran;

    void Log(string s) { lines.Add(s); Debug.Log("COCKPIT_TEST " + s); }

    void Start()
    {
        if (ran) return; ran = true;
        if (string.IsNullOrEmpty(DonePath)) DonePath = Path.GetFullPath(Path.Combine(Application.dataPath, "../cockpit-done.txt"));
        try { Run(); }
        catch (Exception e) { Log("EXCEPTION " + e.GetType().Name + ": " + e.Message); }
        File.WriteAllLines(DonePath, lines);
        Debug.Log("COCKPIT_ACCEPTANCE_DONE");
    }

    void Run()
    {
        cm = gameObject.AddComponent<CockpitMain>();
        var press = new[] { (1.0, false), (1.0, true), (-1.0, true), (-1.0, false) };
        foreach (var (type, want) in new[] { ("pa28", 144), ("pa44", 150), ("b737", 96) })
        {
            cm.StartParkedSession(type);
            Log($"{type}: controls={cm.ControlCount} want={want} countOk={cm.ControlCount == want}");
            Physics.SyncTransforms();
            // raycast pick from the pilot's eye to every control's aim point
            var eye = transform.TransformPoint(cm.Eye);
            int direct = 0, occluded = 0, missed = 0;
            var occIds = new List<string>();
            foreach (var id in new List<string>(cm.ControlIds))
            {
                Vector3 aim;
                if (!cm.TryAim(id, out aim)) { missed++; continue; }
                var dirV = (aim - eye).normalized;
                RaycastHit hit;
                if (Physics.Raycast(eye, dirV, out hit, 5f) && hit.collider.gameObject.name == id) direct++;
                else { occluded++; if (occIds.Count < 8) occIds.Add(id); }
            }
            Log($"{type}: pick direct={direct} occluded={occluded} missed={missed} (occluded e.g. {string.Join(",", occIds)})");
            // press everything, every way — no exceptions allowed
            int errs = 0;
            foreach (var id in new List<string>(cm.ControlIds))
                foreach (var (dir, wheel) in press)
                {
                    try { cm.Press(id, dir, wheel); cm.StepSeconds(0.05); }
                    catch { errs++; }
                }
            Log($"{type}: press-all errors={errs}");
        }

        // ---- cold start by cockpit controls only (Archer), then the run-up
        cm.StartParkedSession("pa28");
        var sw = cm.Cp.Sw;
        cm.Press("sw.bat"); cm.Press("sw.avionics");           // battery + avionics on
        cm.Press("mixture");                                    // click: full rich
        cm.Press("primer"); cm.Press("primer"); cm.Press("primer");
        cm.Press("throttle", 1, true); cm.Press("throttle", 1, true); cm.Press("throttle", 1, true);   // ~0.3 throttle
        for (int i = 0; i < 4; i++) cm.Press("mag");            // OFF→R→L→BOTH→START
        double t = 0; bool running = false;
        for (; t < 10; t += 0.25) { cm.StepSeconds(0.25); if (cm.Sys.St.Eng == "run") { running = true; break; } }
        Log($"coldstart: eng={cm.Sys.St.Eng} running={running} after {t:F1}s rpm={cm.Sys.Rpm:F0} mag={sw.Mag}");
        // (the systems spring the key back from START to BOTH once it catches)
        Log($"coldstart: mag after catch: {sw.Mag}");
        // run-up at ~2000 rpm: walk the key by name (MAG order OFF,R,L,BOTH,START)
        string[] magOrder = { "OFF", "R", "L", "BOTH", "START" };
        Action<string> goMag = target =>
        {
            for (int guard = 0; guard < 6; guard++)
            {
                int i = Array.IndexOf(magOrder, sw.Mag), j = Array.IndexOf(magOrder, target);
                if (i == j) break;
                cm.Press("mag", j > i ? 1 : -1, true);
            }
        };
        for (int i = 0; i < 4; i++) cm.Press("throttle", 1, true);
        cm.StepSeconds(2);
        double rpmBoth = cm.Sys.Rpm;
        goMag("L");
        cm.StepSeconds(1.5);
        double rpmL = cm.Sys.Rpm;
        goMag("R");
        cm.StepSeconds(1.5);
        double rpmR = cm.Sys.Rpm;
        goMag("BOTH");
        cm.StepSeconds(1);
        double rpmBoth2 = cm.Sys.Rpm;
        cm.Press("carbHeat");
        cm.StepSeconds(1.5);
        double rpmCarb = cm.Sys.Rpm;
        Log($"runup: both={rpmBoth:F0} L={rpmL:F0} (drop {rpmBoth - rpmL:F0}) R={rpmR:F0} (drop {rpmBoth - rpmR:F0}) both2={rpmBoth2:F0} carb={rpmCarb:F0} (drop {rpmBoth2 - rpmCarb:F0}) magNow={sw.Mag}");
        Log($"runup drops plausible: L[40..220]={rpmBoth - rpmL >= 40 && rpmBoth - rpmL <= 220} R[40..220]={rpmBoth - rpmR >= 40 && rpmBoth - rpmR <= 220} carb>=20={rpmBoth2 - rpmCarb >= 20}");

        Screenshot();
    }

    void Screenshot()
    {
        var camGo = new GameObject("CockpitCam");
        var cam = camGo.AddComponent<Camera>();
        cam.transform.position = transform.TransformPoint(new Vector3(-0.28f, 0.47f, 0.38f));
        cam.transform.LookAt(transform.TransformPoint(new Vector3(-0.10f, 0.27f, 1.08f)));
        cam.fieldOfView = 50;
        var dirLight = new GameObject("L").AddComponent<Light>();
        dirLight.type = LightType.Directional; dirLight.intensity = 1.2f;
        dirLight.transform.rotation = Quaternion.Euler(40, -30, 0);
        var rt = new RenderTexture(1280, 800, 24);
        cam.targetTexture = rt; cam.Render();
        RenderTexture.active = rt;
        var tex = new Texture2D(1280, 800, TextureFormat.RGB24, false);
        tex.ReadPixels(new Rect(0, 0, 1280, 800), 0, 0); tex.Apply();
        cam.targetTexture = null; RenderTexture.active = null;
        File.WriteAllBytes("/home/hatch/workspace/cadet-unity/stage6-cockpit.png", tex.EncodeToPNG());
        Log("screenshot: stage6-cockpit.png written");
    }
}
