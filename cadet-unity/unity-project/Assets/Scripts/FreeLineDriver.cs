// FreeLineDriver — Stage 10 acceptance driver: the free-mode screen
// (selections → cfg → live session, career untouched) and the line screen
// (a PF duty and a PM duty driven to their debriefs, the leg recorded).
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public class FreeLineDriver : MonoBehaviour
{
    public string DonePath;
    readonly List<string> log = new List<string>();
    int fails;
    void Check(bool ok, string what) { log.Add((ok ? "PASS " : "FAIL ") + what); if (!ok) fails++; Debug.Log("FL " + (ok ? "PASS " : "FAIL ") + what); }
    void Start() { StartCoroutine(Run()); }

    System.Collections.IEnumerator Run()
    {
        yield return null; yield return null;
        // ---------- free mode ----------
        var career = new Career(new MemoryStore(), 7);
        string careerSnap = MiniJson.Stringify(career.State);
        var fmGo = new GameObject("FreeMode"); var fm = fmGo.AddComponent<FreeModeMain>();
        var cmGo = new GameObject("Cockpit"); var cm = cmGo.AddComponent<CockpitMain>();
        fm.Cockpit = cm;
        yield return null;
        fm.SelAircraft = "b737"; fm.SelStart = "area"; fm.SelHour = 21; fm.SelWind = "custom"; fm.SelWindRel = 45; fm.SelWindKt = 12;
        fm.SelLoading = "heavy"; fm.SelFail = "pitot"; fm.SelFailWhen = "alt"; fm.SelFailValue = 5000;
        var cfg = fm.StartSession();
        Check((string)cfg["aircraft"] == "b737" && (string)cfg["start"] == "area", "cfg aircraft/start");
        Check(MiniJson.Num(cfg, "hour") == 21, "cfg hour 21");
        var wn = (Dict)cfg["wind"];
        Check(MiniJson.Num(wn, "rel") == 45 && MiniJson.Num(wn, "kt") == 12 && MiniJson.Num(wn, "gust") == 0.5, "cfg custom wind 45°/12kt/gust .5");
        var ld = (Dict)cfg["loading"];
        Check(MiniJson.Num(ld, "front") == 2 && MiniJson.Num(ld, "rear") == 2 && MiniJson.Num(ld, "bagKg") == 25, "cfg heavy loading");
        Check((string)cfg["fail"] == "pitot" && MiniJson.Num((Dict)cfg["failAt"], "atAltFt") == 5000, "cfg fail pitot @5000ft");
        Check(MiniJson.Num(cfg, "seed") == fm.LastNowMs % 2147483647, "cfg seed = now % 2^31-1");
        Check(cm.Type == "b737" && cm.Sys.St.Eng == "run", "session live: b737 engine running");
        Check(!cm.S.OnGround && Math.Abs(cm.S.Pos[1] - (FlightPhysics.GROUND_M + 3000 * 0.3048)) < 2, "session at 3,000 ft airborne (posY " + cm.S.Pos[1].ToString("F1") + ")");
        Check(!cm.S.GearDown, "gear up for the jet start");
        Check(MiniJson.Stringify(career.State) == careerSnap, "career state untouched by the free session");
        Shot(cm, "stage10-free-session.png");
        // ramp cold start
        fm.SelAircraft = "pa28"; fm.SelStart = "ramp"; fm.SelFail = "none";
        fm.StartSession();
        Check(cm.Type == "pa28" && cm.Sys.St.Eng == "off" && cm.S.OnGround, "ramp start is cold & dark on the ground");
        Check(MiniJson.Stringify(career.State) == careerSnap, "career still untouched after the second session");

        // ---------- line screen ----------
        var lmGo = new GameObject("Line"); var lm = lmGo.AddComponent<LineMain>();
        yield return null;
        lm.Career = new Career(new MemoryStore(), 1);
        lm.SelRoute = "HND-KMQ"; lm.SelRole = "PF"; lm.SelCaptain = "sakurai"; lm.SelSeed = 1;
        lm.StartDuty();
        var duty = lm.Duty;
        Check(duty.Phase == "brief" && duty.DispatchCase != null, "line duty created at brief");
        duty.Advance();
        duty.AnswerDispatch((double)duty.DispatchCase.CorrectIndex);
        int guard = 0;
        while (duty.Phase != "debrief" && guard++ < 40)
        {
            if (duty.Event != null && duty.EventAnswer == null) { duty.AnswerEvent((double)duty.Event.CorrectIndex); continue; }
            if (duty.Phase == "cruise") { duty.Compress(); continue; }
            lm.StepPf();
        }
        Check(duty.Phase == "debrief", "PF duty reached debrief (phase " + duty.Phase + ")");
        var sum = duty.Summary();
        var golden = (Dict)MiniJson.Parse(File.ReadAllText("/home/hatch/workspace/cadet-unity/flight/test/golden-line.json"));
        Dict gsum = null;
        foreach (var so in (Lst)golden["scenarios"]) { var sc = (Dict)so; if ((string)sc["name"] == "pf-event-correct") foreach (var e in (Lst)sc["stream"]) { var en = (Dict)e; if ((string)en["call"] == "summary") gsum = (Dict)en["summary"]; } }
        Check(gsum != null && MiniJson.Num(sum, "total") == MiniJson.Num(gsum, "total") && MiniJson.Num(sum, "landingScore") == MiniJson.Num(gsum, "landingScore"),
            "screen PF summary == JS golden (total " + MiniJson.Num(sum, "total") + ")");
        double fatigueBefore = MiniJson.Num(lm.Career.State, "fatigue");
        lm.RecordLeg();
        var fo = (Dict)lm.Career.State["fo"];
        Check(MiniJson.Num(fo, "sectors") == 1 && MiniJson.Num(fo, "blockMin") == 65 && MiniJson.Num(lm.Career.State, "fatigue") == fatigueBefore + 26,
            "leg recorded: sectors 1, block 65, fatigue +26");
        // PM duty
        lm.SelRole = "PM"; lm.SelSeed = 1; lm.StartDuty();
        var pm = lm.Duty;
        pm.Advance(); pm.AnswerDispatch((double)pm.DispatchCase.CorrectIndex);
        guard = 0;
        while (pm.Phase != "debrief" && guard++ < 60)
        {
            if (pm.Event != null && pm.EventAnswer == null) { pm.AnswerEvent((double)pm.Event.CorrectIndex); continue; }
            var task = pm.CurrentTask();
            if (task != null) { pm.Answer(task.Id, (double)task.CorrectIndex); continue; }
            lm.StepRide();
        }
        Check(pm.Phase == "debrief", "PM duty reached debrief");
        var psum = pm.Summary();
        Check(MiniJson.Num(psum, "tasksTotal") == 5 && MiniJson.Num(psum, "tasksCorrect") == 5, "PM tasks 5/5 through the screen driver");

        log.Add(fails == 0 ? "RESULT PASS" : "RESULT FAIL (" + fails + ")");
        File.WriteAllText(DonePath, string.Join("\n", log));
        Debug.Log("FREELINE DONE fails=" + fails);
    }

    void Shot(CockpitMain cm, string name)
    {
        var camGo = new GameObject("ShotCam"); var cam = camGo.AddComponent<Camera>();
        cam.transform.position = cm.Eye; cam.transform.rotation = Quaternion.Euler(0, 180, 0);
        cam.fieldOfView = 55; cam.nearClipPlane = 0.01f; cam.farClipPlane = 50;
        var rt = new RenderTexture(1280, 800, 24); cam.targetTexture = rt; cam.Render();
        RenderTexture.active = rt;
        var tex = new Texture2D(1280, 800, TextureFormat.RGB24, false);
        tex.ReadPixels(new Rect(0, 0, 1280, 800), 0, 0); tex.Apply();
        File.WriteAllBytes("/home/hatch/workspace/cadet-unity/" + name, tex.EncodeToPNG());
        cam.targetTexture = null; RenderTexture.active = null;
        DestroyImmediate(rt); DestroyImmediate(tex); DestroyImmediate(camGo);
    }
}
