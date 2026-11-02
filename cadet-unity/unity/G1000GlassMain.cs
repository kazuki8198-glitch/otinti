// G1000GlassMain — the Unity host for the piston trainers' G1000 glass
// (Stage 13): owns two RasterCanvas units fed by the ported CadetG1000Draw
// (op-proven against avionics.js by BotG1000Cs), binds their textures onto
// the cockpit's view.pfd / view.mfd faces, and feeds them the live session's
// frame each Unity frame. Electrical state comes from the systems model:
// a dark PFD/MFD draws black, and a dark MFD on the twin raises the PFD's
// reversionary landing-gear box, as g1000.js composes it.
using UnityEngine;
using Cadet;

public class G1000GlassMain : MonoBehaviour
{
    public CockpitMain Cm;
    RasterCanvas pfd, mfd;
    public bool Bound;
    public Texture2D PfdTexture { get { return pfd != null ? pfd.Tex : null; } }

    public bool Bind()
    {
        if (Cm == null || Cm.Cp == null) return false;
        pfd = new RasterCanvas(1280, 800);
        mfd = new RasterCanvas(1280, 800);
        Cm.BindGlassTexture("view.pfd", pfd.Tex);
        Cm.BindGlassTexture("view.mfd", mfd.Tex);
        Bound = true;
        return true;
    }

    static void Black(RasterCanvas rc)
    {
        rc.FillStyle = "#000"; rc.FillRect(0, 0, 1280, 800); rc.Upload();
    }

    public G1000Frame BuildFrame()
    {
        var s = Cm.S; var sys = Cm.Sys;
        bool twin = Cm.Type == "pa44";
        var fr = new G1000Frame
        {
            O = s.Out, Av = Cm.Av, AcId = Cm.Type, OnGround = s.OnGround,
            V = s.A.V, FuelCap = s.A.FuelCap, Pos = new NePos(-s.Pos[2], s.Pos[0]),
            Qnh = s.Qnh, VoltsKnown = true, AmpsKnown = true, FuelPressKnown = true, HobbsKnown = true,
            GearRev = !sys.Elec.MfdOn && twin,
        };
        fr.Eng = new System.Collections.Generic.List<G1000Eng>();
        int n = twin ? 2 : 1;
        for (int i = 0; i < n; i++)
        {
            string st = twin ? sys.Twin[i].Eng : sys.St.Eng;
            fr.Eng.Add(new G1000Eng
            {
                Run = st == "run",
                Rpm = s.Out.Rpms != null && i < s.Out.Rpms.Length ? s.Out.Rpms[i] : s.Out.Rpm,
                Feather = i < s.Eng.Count && s.Eng[i].Feather,
            });
        }
        return fr;
    }

    public void Pump()
    {
        if (Cm == null || !Cm.SessionLive) return;
        if (Cm.Type == "b737") return;
        if (!Bound && !Bind()) return;
        var fr = BuildFrame();
        if (Cm.Sys.Elec.PfdOn) { G1000Draw.DrawPFD(pfd, 1280, 800, fr); pfd.Upload(); } else Black(pfd);
        if (Cm.Sys.Elec.MfdOn) { G1000Draw.DrawMFD(mfd, 1280, 800, fr); mfd.Upload(); } else Black(mfd);
    }

    void Update()
    {
        if (!Application.isPlaying) return;
        Pump();
    }
}
