// BoeingGlassMain — the Unity host for the 737 glass (Stage 7): owns the
// ported BoeingGlass (CadetBoeingDraw, op-proven against boeing.js), gives it
// RasterCanvas units, binds the textures onto the cockpit's view.* faces,
// adds the standby ISFD quad (the jet's control set has no stby click target),
// and feeds it the live session's frame each Unity frame. The demo route is
// the game's HND–FUK line route (the same one the draw-equivalence rig used).
using System.Collections.Generic;
using UnityEngine;
using Cadet;

public class BoeingGlassMain : MonoBehaviour
{
    public CockpitMain Cm;
    public BoeingGlass Glass;
    public BoeingRoute Route = new BoeingRoute { Id = "HND-FUK", From = "HND", To = "FUK", Alternate = "KMQ", CruiseFL = 380, DistKm = 880, BlockMin = 115 };

    readonly List<RasterCanvas> canvases = new List<RasterCanvas>();
    readonly Dictionary<string, RasterCanvas> byUnit = new Dictionary<string, RasterCanvas>();
    static readonly string[] UnitOrder = { "pfd", "nd", "eicasU", "eicasL", "cdu", "stby" };
    static readonly (string unit, string ctrl)[] Bindings =
    {
        ("pfd", "view.b737pfd"), ("nd", "view.b737nd"),
        ("eicasU", "view.b737eicasu"), ("eicasL", "view.b737eicasl"),
        ("cdu", "view.b737cdu"),
    };

    public bool Bind()
    {
        if (Cm == null || Cm.Cp == null) return false;
        canvases.Clear(); byUnit.Clear();
        Glass = new BoeingGlass(Cm.Cp.Boeing, (w, h) =>
        {
            var rc = new RasterCanvas(w, h);
            canvases.Add(rc);
            return rc;
        });
        for (int i = 0; i < UnitOrder.Length; i++) byUnit[UnitOrder[i]] = canvases[i];
        foreach (var (unit, ctrl) in Bindings) Cm.BindGlassTexture(ctrl, byUnit[unit].Tex);
        // the standby ISFD: a small textured cube at the panel place boeing.js gives it
        var stby = GameObject.CreatePrimitive(PrimitiveType.Cube);
        stby.name = "view.b737stby";
        stby.transform.SetParent(Cm.transform, false);
        stby.transform.position = new Vector3(0.345f, 0.262f, 0.60f);
        stby.transform.localScale = new Vector3(0.096f, 0.096f, 0.01f);
        var mr = stby.GetComponent<MeshRenderer>();
        var smat = new Material(Shader.Find("Unlit/Texture") ?? Shader.Find("Standard")) { mainTexture = byUnit["stby"].Tex };
        smat.mainTextureScale = new Vector2(-1, -1);
        smat.mainTextureOffset = new Vector2(1, 1);
        mr.material = smat;
        Object.DestroyImmediate(stby.GetComponent<Collider>());
        return true;
    }

    public Texture2D UnitTexture(string unit) { return byUnit.TryGetValue(unit, out var rc) ? rc.Tex : null; }

    void Update()
    {
        if (Cm != null && Glass == null && Cm.SessionLive && Cm.Type == "b737") Bind();   // in-scene lazy bind (the acceptance driver binds explicitly)
        if (Glass == null || Cm == null || !Cm.SessionLive || !Application.isPlaying) return;
        var frame = new BoeingFrame
        {
            S = Cm.S,
            Av = Cm.Av,
            Eng = new BoeingEngView { Twin = Cm.Sys.Twin, AltFail = Cm.Sys.ElecFault, ParkBrake = Cm.Ctl.ParkBrake },
            ElecPfd = Cm.Sys.Elec.PfdOn,
            Route = Route,
        };
        Glass.Update(Mathf.Min(Time.deltaTime, 0.1f), frame);
        foreach (var rc in canvases) rc.Upload();
    }

    /// <summary>Headless drive for tests: advance the glass by dt without play mode.</summary>
    public void Pump(double dt)
    {
        var frame = new BoeingFrame
        {
            S = Cm.S,
            Av = Cm.Av,
            Eng = new BoeingEngView { Twin = Cm.Sys.Twin, AltFail = Cm.Sys.ElecFault, ParkBrake = Cm.Ctl.ParkBrake },
            ElecPfd = Cm.Sys.Elec.PfdOn,
            Route = Route,
        };
        Glass.Update(dt, frame);
        foreach (var rc in canvases) rc.Upload();
    }
}
