// FreePowerDriver — Stage 19 verification for the free-mode session
// composition fix: StartSession must match the original startFreeSession.
// Only the ramp start is cold & dark; an airborne start keeps the factory
// switch state, so Elec.PfdOn must stand WITHOUT anyone pressing the
// split BAT/ALT rockers (the Stage 17 build kept them off after SetCold
// and the G1000 never powered). The ramp start is re-checked cold.
using System.Collections.Generic;
using System.IO;
using UnityEngine;

public class FreePowerDriver : MonoBehaviour
{
    public string DonePath;
    readonly List<string> log = new List<string>();
    int fails;
    void Check(bool ok, string what) { log.Add((ok ? "PASS " : "FAIL ") + what); if (!ok) fails++; Debug.Log("FREEPOWER " + (ok ? "PASS " : "FAIL ") + what); }
    void Start() { StartCoroutine(Run()); }

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
        var gm = FindObjectOfType<GameMain>();
        Check(gm != null, "hub present");
        if (gm == null) { Finish(); yield break; }
        gm.Open("free");
        yield return null; yield return null;
        var fm = FindObjectOfType<FreeModeMain>();
        Check(fm != null && fm.Cockpit != null, "free mode present");
        if (fm == null) { Finish(); yield break; }
        var cp = fm.Cockpit;

        // ---- airborne start: no switch presses allowed ----
        fm.SelAircraft = "pa28"; fm.SelStart = "area"; fm.SelFail = "none";
        fm.StartSession();
        Check(cp.Cp.GetBool("bat") && cp.Cp.GetBool("alt"), "airborne start keeps factory split BAT/ALT on");
        float w = Time.realtimeSinceStartup;
        while (Time.realtimeSinceStartup - w < 10 && !cp.Sys.Elec.PfdOn) yield return null;
        Check(cp.Sys.Elec.PfdOn, "airborne start: Elec.PfdOn without touching switches (rpm " + (cp.S != null ? cp.S.Rpm.ToString("F0") : "?") + ")");
        var glass = FindObjectOfType<G1000GlassMain>();
        if (glass != null)
        {
            float bw = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - bw < 10 && !glass.Bound) yield return null;
            glass.Pump();
            Check(glass.Bound && AnyLit(glass.PfdTexture), "airborne start: G1000 PFD texture drawn");
        }

        // ---- ramp start: still cold & dark ----
        fm.SelStart = "ramp";
        fm.StartSession();
        yield return null; yield return null;
        Check(!cp.Cp.GetBool("bat") && !cp.Cp.GetBool("alt"), "ramp start: split BAT/ALT off (cold & dark)");
        float w2 = Time.realtimeSinceStartup;
        while (Time.realtimeSinceStartup - w2 < 3) yield return null;
        Check(!cp.Sys.Elec.PfdOn, "ramp start: PfdOn stays false");
        Finish();
    }

    void Finish()
    {
        log.Add(fails == 0 ? "RESULT PASS" : "RESULT FAIL (" + fails + ")");
        File.WriteAllText(DonePath, string.Join("\n", log));
        Debug.Log("FREEPOWER DONE fails=" + fails);
    }
}
