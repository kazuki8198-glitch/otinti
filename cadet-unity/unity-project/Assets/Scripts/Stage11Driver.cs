// Stage11Driver — Stage 11 acceptance: the audible SFX follower follows
// the ported mix, the AI mock answers per specialty, device enumeration +
// assignment save/load round-trips.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;

public class Stage11Driver : MonoBehaviour
{
    public string DonePath;
    readonly List<string> log = new List<string>();
    int fails;
    void Check(bool ok, string what) { log.Add((ok ? "PASS " : "FAIL ") + what); if (!ok) fails++; Debug.Log("S11 " + (ok ? "PASS " : "FAIL ") + what); }
    void Start() { StartCoroutine(Run()); }

    System.Collections.IEnumerator Run()
    {
        yield return null; yield return null;
        // ---- SFX ----
        var sfxGo = new GameObject("Sfx"); var sm = sfxGo.AddComponent<SfxMain>();
        yield return null;
        sm.Unlock();
        Check(sm.Sfx.Ready, "sfx unlocked & ready");
        sm.EngineTick(new CadetSfx.EngObs { Rpm = 2400, Thr = 1, Ias = 100, OnGround = false });
        var L = sm.Sfx.Live;
        Check(L.EngineActive && L.ExGain[0] > 0.1, "engine mix live: exhaust gain " + L.ExGain[0].ToString("F3"));
        var srcs = sfxGo.GetComponentsInChildren<AudioSource>();
        bool anyPlaying = false, cycleOk = false;
        foreach (var s in srcs) { if (s.isPlaying && s.volume > 0.01f) anyPlaying = true; if (s.clip != null && s.clip.name == "cycle" && s.isPlaying) cycleOk = Math.Abs(s.pitch - L.CycleFreq[0] / 20.0) < 0.05; }
        Check(anyPlaying, "loop sources playing with volume");
        Check(cycleOk, "cycle source pitch follows rpm (" + L.CycleFreq[0].ToString("F1") + " Hz)");
        int before = sm.OneShotsPlayed;
        sm.Click(); sm.Footstep("concrete"); sm.Door("swing_open");
        Check(sm.OneShotsPlayed >= before + 3, "one-shots played: click/footstep/door (" + sm.OneShotsPlayed + ")");
        var clip = sm.GetComponentInChildren<AudioSource>().clip;
        float[] samples = new float[2048]; clip.GetData(samples, 0);
        double rms = 0; foreach (var v in samples) rms += v * v; rms = Math.Sqrt(rms / samples.Length);
        Check(rms > 0.01, "generated cycle clip has energy (rms " + rms.ToString("F3") + ")");
        sm.EngineTick(null);
        Check(!sm.Sfx.Live.EngineActive, "engine(null) stops the mix");

        // ---- AI mock ----
        var aiGo = new GameObject("Ai"); var ai = aiGo.AddComponent<AiAskMain>();
        yield return null;
        var a1 = ai.Ask("離陸のコツを教えてください");
        Check(MiniJson.Bool(a1, "ok") && (string)a1["topic"] == "離陸" && MiniJson.Bool(a1, "mock"), "makabe answers takeoff in specialty");
        ai.Instructor = "miller"; var a2 = ai.Ask("リードバックの要点は？");
        Check((string)a2["topic"] == "リードバック", "miller answers readback");
        ai.Instructor = "saeki"; var a3 = ai.Ask("明日の天気はどうですか");
        Check(MiniJson.Bool(a3, "ok") && a3["topic"] == null, "off-specialty falls back gracefully");
        var mock = new CadetAiMock();
        Check(!MiniJson.Bool(mock.Ask("nobody", "x"), "ok"), "unknown instructor rejected");

        // ---- devices ----
        var devs = DevicesMain.Enumerate();
        log.Add("INFO enumerated devices: " + devs.Count + (devs.Count > 0 ? " (" + devs[0].Name + "/" + devs[0].Layout + ")" : ""));
        var dmGo = new GameObject("Devices"); var dm = dmGo.AddComponent<DevicesMain>();
        var asn = new DeviceAssignment { DeviceName = "Test Yoke", DeviceLayout = "Joystick" };
        asn.Axes["pitch"] = "stick/y"; asn.Axes["roll"] = "stick/x"; asn.Axes["throttle"] = "rz";
        asn.Buttons["brake"] = "trigger";
        dm.Assignments.Add(asn);
        dm.Save();
        Check(File.Exists(dm.SavePath), "assignment saved to " + dm.SavePath);
        dm.Assignments.Clear();
        Check(dm.Load() && dm.Assignments.Count == 1 && dm.Assignments[0].Axes["throttle"] == "rz" && dm.Assignments[0].Buttons["brake"] == "trigger",
            "assignment load round-trips");
        var axes = dm.Poll();
        Check(axes.Pitch == 0 && axes.Throttle01 == 0, "poll with no physical device returns zeros, no exception");

        log.Add(fails == 0 ? "RESULT PASS" : "RESULT FAIL (" + fails + ")");
        File.WriteAllText(DonePath, string.Join("\n", log));
        Debug.Log("STAGE11 DONE fails=" + fails);
    }
}
