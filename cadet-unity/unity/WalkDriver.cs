// WalkDriver — Stage 9 acceptance driver: builds the walkable academy,
// drives the dorm-exit route in the real Unity scene (rendered frames, live
// door meshes), and takes the evidence screenshots.
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cadet;

public class WalkDriver : MonoBehaviour
{
    public string DonePath;
    WalkMain wm;
    readonly List<string> log = new List<string>();
    void Say(string s) { log.Add(s); Debug.Log("[walk] " + s); }

    readonly HashSet<string> prompted = new HashSet<string>();
    double mainDoorMaxOpen = 0;
    const double DT = 1.0 / 60;

    IEnumerator Start()
    {
        wm = gameObject.AddComponent<WalkMain>();
        wm.Build();
        Say("built: boxes=" + wm.World.Count + " npcs placed");
        yield return null;

        var dspec = (Dictionary<string, object>)MiniJson.Parse(File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "cadet-data", "dorm-spec.json")));
        var start = (Dictionary<string, object>)dspec["start"];
        var face = (Dictionary<string, object>)start["face"];
        double SA = (double)start["a"], SC = (double)start["c"];
        wm.PoseAt(SA, SC, (double)face["a"], (double)face["c"]);
        yield return null; yield return null;
        Shot("stage9-dorm-room.png");

        var legs = new (double, double, string)[]
        {
            (624.4, 376.2, null), (623.0, 377.4, null), (643.0, 378.2, "stage9-corridor.png"),
            (643.0, 375.0, null), (643.2, 369.2, "stage9-entrance.png"), (643.2, 363.0, null),
            (643.2, 352.0, "stage9-outside.png"),
        };
        bool ok = true;
        foreach (var (a, c, shot) in legs)
        {
            if (!DriveTo(a, c, $"leg {a},{c}")) { ok = false; break; }
            if (shot != null) { yield return null; Shot(shot); }
        }
        var fp = wm.Walker.FramePos;
        Say($"drive ok={ok} final a={fp.A:F2} c={fp.C:F2} y={fp.Y:F2} mainDoorMaxOpen={mainDoorMaxOpen:F2} prompted={string.Join(",", prompted)}");
        // rendered-scene spot views: academy lobby, tower cab, hangar 2
        wm.PoseAt(655, 256, 655, 249); yield return null; yield return null; Shot("stage9-academy-lobby.png");
        wm.PoseAt(721, 262, 721, 250); wm.Walker.St.Y = 17.2; wm.StepFrame(0); yield return null; Shot("stage9-tower-cab.png");
        wm.PoseAt(563, 252, 563, 262); yield return null; yield return null; Shot("stage9-hangar.png");

        bool pass = ok && fp.C < 366.4 && mainDoorMaxOpen > 0.9 && prompted.Contains("d-dorm-room") && prompted.Contains("d-dorm-entrance");
        File.WriteAllText(DonePath, string.Join("\n", log) + "\nRESULT " + (pass ? "PASS" : "FAIL") + "\n");
        Debug.Log("[walk] RESULT " + (pass ? "PASS" : "FAIL"));
    }

    void StepOnce()
    {
        wm.StepFrame(DT, (0, 0));
        var cur = wm.Interactor.Current;
        if (cur != null && cur.Id.StartsWith("door:")) prompted.Add(cur.Id.Substring(5));
        double mo = wm.DoorOpen("x-dorm-main");
        if (mo > mainDoorMaxOpen) mainDoorMaxOpen = mo;
    }

    bool DriveTo(double a1, double c1, string label)
    {
        double t = 0, lastD = double.PositiveInfinity, still = 0;
        while (t < 90)
        {
            var fp = wm.Walker.FramePos;
            double d = System.Math.Sqrt((a1 - fp.A) * (a1 - fp.A) + (c1 - fp.C) * (c1 - fp.C));
            if (d < 0.3) return true;
            var (wx, _, wz) = wm.RwyToLocal(a1, c1, 0);
            wm.Walker.St.Yaw = System.Math.Atan2(-(wx - wm.Walker.St.X), -(wz - wm.Walker.St.Z));
            wm.Walker.St.Pitch = -0.1;
            wm.Walker.SetAuto(new AutoInput { Forward = System.Math.Min(1, 0.25 + d / 0.8) });
            StepOnce();
            t += DT;
            var cur = wm.Interactor.Current;
            var door = cur != null ? wm.DoorForTarget(cur.Id) : null;
            if (door != null && System.Math.Abs(door.Target) < 0.01 && door.Kind != "locked" && door.Kind != "sliding_auto")
            {
                wm.Interactor.Use();
                for (int k = 0; k < 50; k++) { wm.Walker.SetAuto(new AutoInput { Forward = 0 }); StepOnce(); t += DT; }
            }
            if (d > lastD - 1e-4) still += DT; else still = 0;
            lastD = d;
            if (still > 4) { Say($"STUCK {label} at a={fp.A:F2} c={fp.C:F2}"); return false; }
        }
        Say("TIMEOUT " + label);
        return false;
    }

    void Shot(string name)
    {
        var cam = wm.Cam;
        int w = 1280, h = 800;
        var rt = new RenderTexture(w, h, 24);
        cam.targetTexture = rt;
        cam.Render();
        RenderTexture.active = rt;
        var tex = new Texture2D(w, h, TextureFormat.RGB24, false);
        tex.ReadPixels(new Rect(0, 0, w, h), 0, 0);
        tex.Apply();
        cam.targetTexture = null;
        RenderTexture.active = null;
        string path = Path.Combine(Path.GetDirectoryName(DonePath), name);
        File.WriteAllBytes(path, tex.EncodeToPNG());
        // non-blank check: distinct colors
        var px = tex.GetPixels32();
        var seen = new HashSet<int>();
        for (int i = 0; i < px.Length; i += 997) seen.Add((px[i].r << 16) | (px[i].g << 8) | px[i].b);
        Say($"shot {name}: {seen.Count} sampled colors");
        Object.Destroy(tex); Object.Destroy(rt);
    }
}
