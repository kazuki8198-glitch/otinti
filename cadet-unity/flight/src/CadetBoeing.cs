// CadetBoeing.cs — the 737's display state and FMC CDU key handling, ported from
// boeing.js (createBoeingGlass's state + cduKey). The canvas drawing itself lives
// in the Unity layer (BoeingGlassMain); this file is the pure state machine the
// cockpit controls and the CDU keys drive, kept equivalence-testable headlessly.
using System;

namespace Cadet
{
    // a line route handed over from the FO operation (main → fly → cockpit): the
    // subset of line.js's FO_ROUTES fields the CDU's RTE page reads
    public class BoeingRoute
    {
        public string Id, From, To, Alternate;
        public int CruiseFL, DistKm, BlockMin;
    }

    public class CduState
    {
        public string Page = "IDENT", Scratch = "", Msg = "", From = "", To = "", Ref = "";
        public bool Edited, PendingExec, Active, PosSet, Dirty;   // dirty starts clear: the first draw has already happened by the time a key is pressed
    }

    public class BoeingState
    {
        public string NdMode = "MAP"; public int NdRange = 40;                 // state.efis
        public string DuOut = "PFD", DuInb = "ND", DuLow = "EICAS";            // state.du
        public BoeingRoute Route;                                              // state.route (null until a line flight hands one over)
        public CduState Cdu = new CduState();
    }

    public static class BoeingCdu
    {
        static readonly string[] Pages = { "IDENT", "POS", "RTE", "INDEX" };

        static bool IsKeyChar(string k)
        {
            if (k == null || k.Length != 1) return false;
            char c = k[0];
            return (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '/' || c == '.';
        }

        static bool IsIcao(string v)
        {
            if (v.Length < 3 || v.Length > 4) return false;
            foreach (char c in v) if (c < 'A' || c > 'Z') return false;
            return true;
        }

        // boeing.js cduKey, line for line
        public static void Key(BoeingState st, string k)
        {
            var c = st.Cdu;
            c.Dirty = true;
            if (IsKeyChar(k)) { if (c.Scratch.Length < 14) c.Scratch += k; c.Msg = ""; return; }
            if (k == "DEL") { c.Scratch = c.Scratch.Length > 0 ? c.Scratch.Substring(0, c.Scratch.Length - 1) : ""; return; }
            if (k == "CLR") { if (c.Scratch.Length > 0) c.Scratch = ""; else c.Msg = ""; return; }
            if (k == "EXEC") { if (c.PendingExec) { c.PendingExec = false; c.Active = true; c.Msg = ""; } return; }
            if (k == "INIT") { c.Page = "IDENT"; return; }
            if (k == "RTE") { c.Page = "RTE"; return; }
            if (k == "PREV" || k == "NEXT") { int i = Array.IndexOf(Pages, c.Page); c.Page = Pages[(i + (k == "NEXT" ? 1 : Pages.Length - 1)) % Pages.Length]; return; }
            Func<string, bool> put = field =>
            {
                string v = c.Scratch.Trim();
                if (IsIcao(v)) { if (field == "ref") c.Ref = v; else if (field == "from") c.From = v; else c.To = v; c.Edited = true; c.Scratch = ""; c.Msg = ""; return true; }
                c.Msg = "INVALID ENTRY"; return false;
            };
            if (c.Page == "IDENT")
            {
                if (k == "R6") c.Page = "POS";
                else if (k == "L6") c.Page = "INDEX";
            }
            else if (c.Page == "INDEX")
            {
                if (k == "L1") c.Page = "IDENT";
                else if (k == "L2") c.Page = "POS";
                else if (k == "R1") c.Page = "RTE";
            }
            else if (c.Page == "POS")
            {
                if (k == "L1") put("ref");
                else if (k == "R5") { c.PosSet = true; c.Msg = ""; }
                else if (k == "R6") c.Page = "RTE";
            }
            else if (c.Page == "RTE")
            {
                if (k == "L1") put("from");
                else if (k == "R1") put("to");
                else if (k == "R6") { if (c.From.Length > 0 && c.To.Length > 0) { c.PendingExec = true; c.Msg = ""; } else c.Msg = "ENTER FROM/TO"; }
            }
        }
    }
}
