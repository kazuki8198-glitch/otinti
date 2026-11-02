// CadetG1000Keys.cs — the G1000's twelve softkeys per display and menu, ported
// from g1000.js's SOFTKEYS / softkeysOf. An entry's Act returns [what, dir] for
// AvionicsControl.Control (or the autopilot), or null: a key this training does
// not use (a dim label with no function — cockpit.js checks act before label).
using System;
using System.Collections.Generic;

namespace Cadet
{
    public class SoftkeyDef
    {
        public string Label;                                  // static label ("" = blank)
        public Func<AvionicsState, string> LabelFn;           // dynamic label (the xpdr code display, NORTH UP…)
        public Func<AvionicsState, object[]> ActFn;           // null = no function
        public string ResolveLabel(AvionicsState av) { return LabelFn != null ? LabelFn(av) : (Label ?? ""); }
    }

    public static class G1000Keys
    {
        static SoftkeyDef K(string label, Func<AvionicsState, object[]> act = null) { return new SoftkeyDef { Label = label, ActFn = act }; }
        static SoftkeyDef KF(Func<AvionicsState, string> labelFn, Func<AvionicsState, object[]> act = null) { return new SoftkeyDef { LabelFn = labelFn, ActFn = act }; }
        static object[] W(string what, object dir) { return new object[] { what, dir }; }

        public static readonly List<SoftkeyDef> PfdTop = new List<SoftkeyDef>
        {
            K(""), K("INSET"), K("PFD", av => W("PFD_MENU", "PFD")), K("OBS", av => W("OBS", 1.0)), K("CDI", av => W("CDI", 1.0)),
            K("BRG1", av => W("BRG1", 1.0)), K("XPDR", av => W("XPDR", 1.0)), K("IDENT", av => W("XPDR_IDENT", 1.0)),
            K("BRG2", av => W("BRG2", 1.0)), K("NRST"), K(""), K("ALERTS", av => W("ALERTS", 1.0)),
        };

        public static readonly List<SoftkeyDef> PfdMenu = new List<SoftkeyDef>
        {
            K("NAV", av => W("AP_NAV", 1.0)), K("APR", av => W("AP_APR", 1.0)), K("WIND", av => W("WIND", 1.0)),
            K("AP", av => W("AP", 1.0)), K("HDG", av => W("AP_HDG", 1.0)), K("ALT", av => W("AP_ALT", 1.0)),
            K("VS", av => W("AP_VS", 1.0)), K("LVL", av => W("AP_LVL", 1.0)), K("FD", av => W("FD", 1.0)),
            K("ALT UNIT", av => W("ALT_UNIT", 1.0)), K("STD BARO", av => W("STD_BARO", 1.0)), K("BACK", av => W("PFD_MENU", "TOP")),
        };

        public static readonly List<SoftkeyDef> Xpdr = BuildXpdr();

        static List<SoftkeyDef> BuildXpdr()
        {
            var l = new List<SoftkeyDef>();
            for (int d = 0; d <= 7; d++) { int dd = d; l.Add(K(dd.ToString(), av => W("XPDR_DIGIT", (double)dd))); }
            l.Add(K("MODE", av => W("XPDR_MODE", 1.0)));
            l.Add(K("⌫", av => W("XPDR_BKSP", 1.0)));
            l.Add(K("BACK", av => W("XPDR", 1.0)));
            l.Add(KF(av => av.Xpdr != null ? (av.Xpdr.Entry != "" ? av.Xpdr.Entry : av.Xpdr.Code.ToString("0000")) : "----"));
            return l;
        }

        public static readonly List<SoftkeyDef> Mfd = new List<SoftkeyDef>
        {
            K("ENGINE", av => W("MFD_ENG", 1.0)), K("SYSTEM", av => W("MFD_SYS", 1.0)), K("MAP", av => W("MFD_MAP", 1.0)),
            K("FPL", av => W("MFD_FPL", 1.0)), K("NRST", av => W("MFD_NRST", 1.0)),
            KF(av => av.MapNorthUp ? "NORTH UP" : "TRACK UP", av => W("NORTH_UP", 1.0)), K(""),
            K("PREV LEG", av => W("FPL_NEXT", -1.0)), K("NEXT LEG", av => W("FPL_NEXT", 1.0)),
            K(""), K("DCLTR"), K("SHW CHRT"),
        };

        // softkeysOf: the MFD's row is fixed; the PFD's follows av.pfdMenu
        public static List<SoftkeyDef> SoftkeysOf(string which, AvionicsState av)
        {
            if (which == "mfd") return Mfd;
            if (av != null && av.PfdMenu == "XPDR") return Xpdr;
            if (av != null && av.PfdMenu == "PFD") return PfdMenu;
            return PfdTop;
        }
    }
}
