// BoeingDriver — editor-only Stage 7 driver (play mode): builds the 737
// cockpit session through CockpitMain, energizes it by its own switches,
// starts the engines in the systems state, binds BoeingGlassMain, checks the
// glass drew (stats + pixel evidence), and screenshots the eye view and the
// PFD / ND / CDU focus views. Writes boeing-done.txt when finished.
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

public class BoeingDriver : MonoBehaviour
{
    public string DonePath = "";
    readonly List<string> log = new List<string>();
    CockpitMain cm;
    BoeingGlassMain bgm;

    void Say(string s) { log.Add(s); Debug.Log("[boeing] " + s); }

    IEnumerator Start()
    {
        yield return null;
        var cam = Camera.main;
        if (cam == null)
        {
            var cgo = new GameObject("MainCamera"); cgo.tag = "MainCamera";
            cam = cgo.AddComponent<Camera>();
        }
        cam.nearClipPlane = 0.01f; cam.farClipPlane = 200f;
        cam.backgroundColor = new Color(0.02f, 0.02f, 0.03f);
        if (FindObjectOfType<Light>() == null)
        {
            var lgo = new GameObject("Sun");
            var li = lgo.AddComponent<Light>(); li.type = LightType.Directional; li.intensity = 1.2f;
            lgo.transform.rotation = Quaternion.Euler(50, 30, 0);
        }

        var go = new GameObject("Cockpit");
        cm = go.AddComponent<CockpitMain>();
        cm.StartParkedSession("b737");
        Say("controls=" + cm.ControlCount + " (expect 96)");

        // energize by the cockpit's own switches, then run the session
        cm.Press("sw.bat"); cm.Press("sw.avionics"); cm.Press("sw.beacon");
        cm.StepSeconds(3);
        Say("elec: busV=" + cm.Sys.Elec.Volts.ToString("F1") + " pfdOn=" + cm.Sys.Elec.PfdOn + " avionicsOn=" + cm.Sys.AvionicsOn);
        // the jet has no cockpit engine-start controls in the original either
        // (the start switches are confirm items): a jet session begins running
        // through the systems' own setRunning — the lesson-start state
        cm.Sys.SetRunning(cm.S);
        cm.StepSeconds(20);
        Say("engines: N1=" + cm.S.Eng[0].N1.ToString("F1") + "/" + cm.S.Eng[1].N1.ToString("F1") + " run=" + cm.S.Eng[0].Run + " sysRunning=" + cm.Sys.Running);

        bgm = go.AddComponent<BoeingGlassMain>();
        bgm.Cm = cm;
        Say("glass bind=" + bgm.Bind());
        // the test scene composes the cockpit at the airfield origin, where the
        // runway pavement mesh cuts the pedestal sight lines: lift the rig clear
        go.transform.position = new Vector3(0, 60, 0);
        for (int i = 0; i < 90; i++) { cm.Frame(); cm.Frame(); bgm.Pump(1.0 / 30); }
        var st = bgm.Glass.Stats;
        Say("stats: pfd=" + st["pfd"] + " nd=" + st["nd"] + " eicasU=" + st["eicasU"] + " eicasL=" + st["eicasL"] + " cdu=" + st["cdu"] + " stby=" + st["stby"]);
        Say("font available=" + RasterCanvas.FontAvailable);

        CheckTexture("pfd", 12, 1200);
        CheckTexture("cdu", 5, 100);
        CheckTexture("nd", 6, 100);

        string dir = Path.GetDirectoryName(DonePath);
        // diagnostics: dump the unit textures themselves, plus a text probe
        foreach (var u in new[] { "pfd", "cdu", "eicasU" })
        {
            var t = bgm.UnitTexture(u);
            if (t != null) File.WriteAllBytes(Path.Combine(dir, "tex-" + u + ".png"), t.EncodeToPNG());
        }
        // per-glyph packing probe: how does this Unity store each glyph?
        {
            var pf = Font.CreateDynamicFontFromOSFont(new[] { "DejaVu Sans" }, 64);
            const string chars = "0123456789,.IN-";
            pf.RequestCharactersInTexture(chars, 40, FontStyle.Bold);
            var ptex = pf.material.mainTexture as Texture2D;
            var sb = new System.Text.StringBuilder("glyph probe (tex " + ptex.width + "x" + ptex.height + "): ");
            foreach (var ch in chars)
            {
                pf.GetCharacterInfo(ch, out var ci, 40, FontStyle.Bold);
                sb.Append($"[{ch} adv={ci.advance} uSpan={(ci.uvBottomRight.x - ci.uvBottomLeft.x) * ptex.width:F0} vSpan={(ci.uvTopLeft.y - ci.uvBottomLeft.y) * ptex.height:F0} w={ci.maxY - ci.minY}]");
            }
            Say(sb.ToString());
        }
        var probe = new RasterCanvas(200, 200);
        probe.FillStyle = "#000"; probe.FillRect(0, 0, 200, 200);
        probe.FillStyle = "#ff0000"; probe.FillRect(0, 0, 30, 12);          // canvas top-left marker
        probe.FillStyle = "#00ff00"; probe.FillRect(170, 188, 30, 12);      // canvas bottom-right marker
        probe.FillStyle = "#ffffff"; probe.Font = new Cadet.FontSpec(120, 700, false);
        probe.TextAlign = "left"; probe.TextBaseline = "middle";
        probe.FillText("4", 60, 100);
        probe.Upload();
        var pp = probe.Tex.GetPixels32(); long lit = 0; foreach (var p in pp) if (p.r > 60) lit++;
        Say("text probe: lit=" + lit + " (expect > 300)");
        File.WriteAllBytes(Path.Combine(dir, "tex-probe.png"), probe.Tex.EncodeToPNG());

        cm.SetFocusView(null);
        yield return null; Shot(Path.Combine(dir, "stage7-eye.png"));
        cm.SetFocusView("view.b737pfd");
        yield return null; Shot(Path.Combine(dir, "stage7-pfd.png"));
        cm.SetFocusView("view.b737nd");
        yield return null; Shot(Path.Combine(dir, "stage7-nd.png"));
        cm.SetFocusView("view.b737cdu");
        // the hitbox yoke sits on the eye→CDU sight line in this rig: if a
        // raycast hits something before the CDU face, pull the camera in front of it
        {
            var camT = Camera.main.transform;
            if (cm.TryAim("view.b737cdu", out var cduPos))
            {
                var to = cduPos - camT.position; float dist = to.magnitude;
                if (Physics.Raycast(camT.position, to / dist, out var hit, dist - 0.03f))
                {
                    camT.position = hit.point - (to / dist) * 0.05f;
                    camT.LookAt(cduPos);
                    Say("cdu focus occluded by " + hit.collider.gameObject.name + " — camera pulled in");
                }
            }
        }
        yield return null; Shot(Path.Combine(dir, "stage7-cdu.png"));
        cm.SetFocusView("view.b737eicasu");
        yield return null; Shot(Path.Combine(dir, "stage7-eicas.png"));

        bool pass = st["pfd"] >= 30 && st["nd"] >= 5 && st["cdu"] >= 1
            && log.Exists(l => l.StartsWith("tex pfd: PASS")) && log.Exists(l => l.StartsWith("tex cdu: PASS"));
        Say(pass ? "RESULT PASS" : "RESULT FAIL");
        File.WriteAllText(DonePath, string.Join("\n", log) + "\n");
    }

    void CheckTexture(string unit, int minColors, int minBright)
    {
        var tex = bgm.UnitTexture(unit);
        if (tex == null) { Say("tex " + unit + ": FAIL (no texture)"); return; }
        var px = tex.GetPixels32();
        var colors = new HashSet<int>();
        long greenish = 0, bright = 0;
        foreach (var p in px)
        {
            colors.Add((p.r << 16) | (p.g << 8) | p.b);
            if (p.g > 150 && p.r < 130) greenish++;
            if (p.r + p.g + p.b > 500) bright++;
        }
        bool ok = colors.Count >= minColors && (unit == "pfd" ? greenish >= minBright : bright >= minBright);
        Say($"tex {unit}: {(ok ? "PASS" : "FAIL")} colors={colors.Count} greenish={greenish} bright={bright}");
    }

    void Shot(string path)
    {
        // RenderTexture + ReadPixels (the Stage 6 way): ScreenCapture hangs in batchmode
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
        Say("shot " + Path.GetFileName(path) + " focus=" + (cm.FocusId ?? "eye"));
    }
}
