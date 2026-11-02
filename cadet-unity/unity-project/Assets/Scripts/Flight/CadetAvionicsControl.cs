// CADET — CadetAvionicsControl.cs : the panel controls (control()), the
// navigation solution (navSolve) and the CAS collector from avionics.js.
using System;
using System.Collections.Generic;

namespace Cadet
{
    public static class AvionicsControl
    {
        static double Clamp(double v, double a, double b) { return Avionics.Clamp(v, a, b); }
        static double Wrap360(double a) { return Avionics.Wrap360(a); }

        static RadioPair ComOf(AvionicsState av) { return av.ComSel == "COM1" ? av.Com1 : av.Com2; }
        static RadioPair NavOf(AvionicsState av) { return av.NavSel == "NAV1" ? av.Nav1 : av.Nav2; }

        // dir is a number for most controls, a string for MON / DIRECT / PFD_MENU
        public static string Control(AvionicsState av, string what, object dirObj = null, bool big = false)
        {
            double dir = dirObj is double ? (double)dirObj : 1;
            string dirS = dirObj as string;
            switch (what)
            {
                case "HDG": av.HdgBug = Wrap360(Js.Round(av.HdgBug + dir * (big ? 10 : 1))); if (av.HdgBug == 0) av.HdgBug = 360; return $"HDG {Avionics.HdgFmt(av.HdgBug)}";
                case "HDG_SYNC": av.HdgBug = Js.Round(dir); if (av.HdgBug == 0) av.HdgBug = 360; return $"HDG {Avionics.HdgFmt(av.HdgBug)}";
                case "ALT": av.AltSel = Clamp(Js.Round(av.AltSel / 100) * 100 + dir * (big ? 1000 : 100), 0, 18000); return $"ALT SEL {av.AltSel:0}";
                case "BARO": av.Baro = Js.Round(Clamp(av.Baro + dir * 0.01, 27.5, 31.5) * 100) / 100; return $"BARO {av.Baro:0.00}";
                case "STD_BARO": av.Baro = 29.92; return "BARO STD 29.92";
                case "ALT_UNIT": av.BaroUnit = av.BaroUnit == "IN" ? "HPA" : "IN"; return $"BARO 単位 {av.BaroUnit}";
                case "CRS": av.Crs = Wrap360(Js.Round(av.Crs + dir * (big ? 10 : 1))); if (av.Crs == 0) av.Crs = 360; return $"CRS {Avionics.HdgFmt(av.Crs)}";
                case "COM_MHZ": { var c = ComOf(av); c.Stby = Avionics.Tune(c.Stby, "MHz", (int)dir); return $"{av.ComSel} STBY {Avionics.FmtCom(c.Stby)}"; }
                case "COM_KHZ": { var c = ComOf(av); c.Stby = Avionics.Tune(c.Stby, "kHz", (int)dir); return $"{av.ComSel} STBY {Avionics.FmtCom(c.Stby)}"; }
                case "COM_SWAP": { var c = ComOf(av); int t = c.Act; c.Act = c.Stby; c.Stby = t; return $"{av.ComSel} ACT {Avionics.FmtCom(c.Act)}"; }
                case "COM_SEL": av.ComSel = av.ComSel == "COM1" ? "COM2" : "COM1"; return $"周波数の操作：{av.ComSel}";
                case "NAV_MHZ": { var c = NavOf(av); c.Stby = Avionics.Tune(c.Stby, "MHz", (int)dir, "NAV"); return $"{av.NavSel} STBY {Avionics.FmtNav(c.Stby)}"; }
                case "NAV_KHZ": { var c = NavOf(av); c.Stby = Avionics.Tune(c.Stby, "kHz", (int)dir, "NAV"); return $"{av.NavSel} STBY {Avionics.FmtNav(c.Stby)}"; }
                case "NAV_SWAP": { var c = NavOf(av); int t = c.Act; c.Act = c.Stby; c.Stby = t; return $"{av.NavSel} ACT {Avionics.FmtNav(c.Act)}"; }
                case "NAV_SEL": av.NavSel = av.NavSel == "NAV1" ? "NAV2" : "NAV1"; return $"周波数の操作：{av.NavSel}";
                case "CDI": av.Cdi = av.Cdi == "GPS" ? "NAV1" : av.Cdi == "NAV1" ? "NAV2" : "GPS"; return $"CDI {Avionics.CdiName(av)}";
                case "MIC": av.AudioMic = av.AudioMic == "COM1" ? "COM2" : "COM1"; return $"MIC {av.AudioMic}（送信はできません）";
                case "MON": av.Monitor[dirS] = !av.Monitor[dirS]; return $"{dirS} 受信 {(av.Monitor[dirS] ? "ON" : "OFF")}";
                case "MFD_PAGE": { var pages = new[] { "MAP", "FPL", "ENGINE", "SYSTEM", "NRST" }; av.MfdPage = pages[(Array.IndexOf(pages, av.MfdPage) + 1) % pages.Length]; return $"MFD {av.MfdPage}"; }
                case "MFD_MAP": av.MfdPage = "MAP"; return "MFD MAP";
                case "MFD_FPL": av.MfdPage = "FPL"; return "MFD FPL";
                case "MFD_ENG": av.MfdPage = "ENGINE"; return "MFD ENGINE";
                case "MFD_SYS": av.MfdPage = "SYSTEM"; return "MFD SYSTEM";
                case "MFD_NRST": av.MfdPage = "NRST"; return "MFD NRST — 最寄り";
                case "NRST_SEL": {
                    var cat = Avionics.FplCatalog();
                    av.NrstSel = (int)Clamp(av.NrstSel + dir, 0, cat.Count - 1);
                    return $"NRST {cat[av.NrstSel]}";
                }
                case "FPL_PICK": { var cat = Avionics.FplCatalog(); av.FplPick = (int)((av.FplPick + dir + cat.Count) % cat.Count); return $"挿入先 {cat[av.FplPick]}"; }
                case "FPL_INSERT": {
                    if (!av.FplEdit) return "";
                    var cat = Avionics.FplCatalog(); string id = cat[av.FplPick];
                    int at = (int)Clamp(av.FplCursor, 0, av.Fpl.Wps.Count);
                    av.Fpl.Wps.Insert(at, id); if (at <= av.Fpl.Active) av.Fpl.Active++; av.Direct = null;
                    return $"{id} を挿入（{av.Fpl.Wps.Count} 点）";
                }
                case "FPL_DEL": {
                    if (!av.FplEdit || av.Fpl.Wps.Count <= 2) return av.FplEdit ? "計画は2点以上で" : "";
                    int at = (int)Clamp(av.FplCursor, 0, av.Fpl.Wps.Count - 1);
                    string gone = av.Fpl.Wps[at]; av.Fpl.Wps.RemoveAt(at);
                    if (at < av.Fpl.Active) av.Fpl.Active--;
                    av.Fpl.Active = (int)Clamp(av.Fpl.Active, 1, av.Fpl.Wps.Count - 1);
                    av.FplCursor = (int)Clamp(av.FplCursor, 0, av.Fpl.Wps.Count - 1);
                    av.Direct = null; return $"{gone} を削除";
                }
                case "KEY_ENT": {
                    if (av.MfdPage == "NRST")
                    {
                        var list = av.Nrts != null && av.Nrts.Count > 0 ? av.Nrts : Avionics.FplCatalog();
                        string id = list[(int)Clamp(av.NrstSel, 0, list.Count - 1)];
                        if (id != null) { av.Direct = id; av.DirectFrom = null; av.MfdPage = "MAP"; return $"D→ {id}"; }
                        return "";
                    }
                    if (av.MfdPage == "FPL") { if (!av.FplEdit) { av.FplEdit = true; av.FplCursor = av.Fpl.Active; return "FPL 編集：FMS で点と挿入先、ENT で挿入、CLR で削除"; } return Control(av, "FPL_INSERT"); }
                    return "";
                }
                case "KEY_CLR": {
                    if (av.FplEdit) return Control(av, "FPL_DEL");
                    if (av.MfdPage == "NRST") { av.MfdPage = "MAP"; return "MFD MAP"; }
                    if (av.Direct != null) { av.Direct = null; av.DirectFrom = null; return "D→ 解除"; }
                    return "";
                }
                case "PROC": {
                    if (av.Proc == null) { av.Proc = new ProcState { Name = "ILS 36", Type = "ILS", Missed = false }; av.Nav1.Act = 109900; av.Cdi = "NAV1"; return "PROC：ILS 36 をロード（LOC 109.90）"; }
                    if (!av.Proc.Missed) { av.Proc.Missed = true; av.Direct = "LABED"; av.DirectFrom = null; av.Crs = 360; if (av.AltSel < 3000) av.AltSel = 3000; return "ミストアプローチ：LAB-D へ直行・3,000 ft へ上昇"; }
                    av.Proc = null; return "PROC 解除";
                }
                case "PROC_RNAV": {
                    if (av.Proc == null || av.Proc.Type != "RNAV")
                    {
                        var P36 = Avionics.ProcedureById("RNAV36");
                        av.Proc = new ProcState { Name = P36.Name, Type = "RNAV", Missed = false, DaFt = P36.DaFt, MdaFt = P36.MdaFt };
                        av.Cdi = "GPS"; av.Direct = "LABRW"; av.DirectFrom = null; av.Crs = 360;
                        if (av.AltSel < P36.FafAltFt) av.AltSel = P36.FafAltFt;
                        return $"PROC：{P36.Name} をロード（LPV DA {P36.DaFt:0} ft / LNAV MDA {P36.MdaFt:0} ft）";
                    }
                    if (!av.Proc.Missed) { av.Proc.Missed = true; av.Direct = "LABED"; av.DirectFrom = null; av.Crs = 360; if (av.AltSel < 3000) av.AltSel = 3000; return "ミストアプローチ：LAB-D へ直行・3,000 ft へ上昇"; }
                    av.Proc = null; return "PROC 解除";
                }
                case "RANGE": av.MfdRangeIdx = (int)Clamp(av.MfdRangeIdx + dir, 0, Avionics.RANGES.Length - 1); return $"RANGE {Avionics.RANGES[av.MfdRangeIdx]:0.#} NM";
                case "NORTH_UP": av.MapNorthUp = !av.MapNorthUp; return av.MapNorthUp ? "MAP NORTH UP" : "MAP TRACK UP";
                case "PFD_MENU": av.PfdMenu = dirS; return $"PFD {dirS}";
                case "XPDR": av.PfdMenu = av.PfdMenu == "XPDR" ? "TOP" : "XPDR"; av.Xpdr.Entry = ""; return $"XPDR {av.Xpdr.Code:0000}";
                case "XPDR_DIGIT": {
                    var x = av.Xpdr;
                    if (x.Entry.Length >= 4) x.Entry = "";
                    x.Entry += ((int)Clamp(Math.Floor(dir), 0, 7)).ToString();
                    if (x.Entry.Length == 4) { x.Code = int.Parse(x.Entry); x.Entry = ""; return $"XPDR {x.Code:0000} セット"; }
                    return $"XPDR {x.Entry}";
                }
                case "XPDR_BKSP": av.Xpdr.Entry = av.Xpdr.Entry.Length > 0 ? av.Xpdr.Entry.Substring(0, av.Xpdr.Entry.Length - 1) : ""; return $"XPDR {(av.Xpdr.Entry.Length > 0 ? av.Xpdr.Entry : av.Xpdr.Code.ToString("0000"))}";
                case "XPDR_MODE": { var modes = new[] { "ALT", "ON", "STBY" }; av.Xpdr.Mode = modes[(Array.IndexOf(modes, av.Xpdr.Mode) + 1) % modes.Length]; return $"XPDR {av.Xpdr.Mode}"; }
                case "XPDR_IDENT": av.XpdrIdent = 18; return "XPDR IDENT — 18秒";
                case "OBS": av.Obs = !av.Obs; return $"OBS {(av.Obs ? "ON（CRS でコース）" : "OFF")}";
                case "BRG1": { var srcs = new string[] { null, "NAV1", "GPS" }; av.Brg1 = srcs[(Array.IndexOf(srcs, av.Brg1) + 1) % srcs.Length]; return $"BRG1 {av.Brg1 ?? "OFF"}"; }
                case "BRG2": { var srcs = new string[] { null, "NAV2", "GPS" }; av.Brg2 = srcs[(Array.IndexOf(srcs, av.Brg2) + 1) % srcs.Length]; return $"BRG2 {av.Brg2 ?? "OFF"}"; }
                case "ALERTS": av.PfdMenu = av.PfdMenu == "ALERTS" ? "TOP" : "ALERTS"; return av.PfdMenu == "ALERTS" ? "ALERTS — 警告一覧" : "ALERTS 閉じる";
                case "WIND": av.Wind = !av.Wind; return $"WIND {(av.Wind ? "ON" : "OFF")}";
                case "DIRECT": av.Direct = dirS; av.DirectFrom = null; return dirS != null ? $"D→ {dirS}" : "D→ 解除";
                case "FPL_NEXT": {
                    if (av.MfdPage == "NRST") return Control(av, "NRST_SEL", dirObj);
                    if (av.MfdPage == "FPL" && av.FplEdit) { av.FplCursor = (int)Clamp(av.FplCursor + dir, 0, av.Fpl.Wps.Count - 1); return $"カーソル {av.Fpl.Wps[av.FplCursor]}"; }
                    av.Fpl.Active = (int)Clamp(av.Fpl.Active + dir, 1, av.Fpl.Wps.Count - 1); av.Direct = null; return $"ACTIVE LEG → {av.Fpl.Wps[av.Fpl.Active]}";
                }
                default: return "";
            }
        }

        public static NavSolution NavSolve(AvionicsState av, NePos pos, OutRecord o, double varW, RwyDef rwy)
        {
            var outS = new NavSolution { Src = Avionics.CdiName(av), Crs = av.Crs };
            WptDef A = null, B = null;
            if (av.Direct != null)
            {
                B = Avionics.Wpt(av.Direct);
                if (av.DirectFrom == null) { av.DirectFrom = new NePos(pos.N, pos.E); av.DirectFromId = "P.POS"; }
                A = null; // A is the latched position, handled below via DirectFrom
            }
            else
            {
                var w = av.Fpl.Wps;
                B = Avionics.Wpt(w[av.Fpl.Active]);
                A = Avionics.Wpt(w[av.Fpl.Active - 1]);
            }
            NePos aPos = av.Direct != null ? av.DirectFrom : (A != null ? new NePos(A.N, A.E) : null);
            NePos bPos = B != null ? new NePos(B.N, B.E) : null;
            bool gpsFail = av.Fail != null && av.Fail.TryGetValue("gps", out var gf) && gf;
            if (aPos != null && bPos != null && !gpsFail)
            {
                outS.From = av.Direct != null ? "P.POS" : A.Id;
                outS.To = B.Id;
                outS.Dtk = Avionics.TrueToMag(Avionics.NeBearing(aPos, bPos), varW);
                outS.Dis = Avionics.NeDistNm(pos, bPos);
                outS.Ete = Avionics.EteSec(outS.Dis.Value, o.Gs);
                outS.Xtk = Avionics.XtkNm(aPos, bPos, pos);
                outS.Brg = Avionics.TrueToMag(Avionics.NeBearing(pos, bPos), varW);
            }
            if (av.Cdi == "GPS")
            {
                outS.Crs = outS.Dtk ?? av.Crs;
                bool finalLeg = av.Direct != null || av.Fpl.Active >= av.Fpl.Wps.Count - 1;
                outS.CdiScale = B != null && B.Kind == "apt" && finalLeg && outS.Dis != null && outS.Dis <= 5 ? 0.3 : outS.Dis != null && outS.Dis > 30 ? 2.0 : 1.0;
                outS.Dots = outS.Xtk != null ? Avionics.CdiGps(outS.Xtk.Value, outS.CdiScale.Value) : 0;
                outS.ToFrom = "TO";
                outS.Flag = gpsFail ? "NO GPS" : B != null ? "" : "NO LEG";
                if (av.Obs && B != null && !gpsFail)
                {
                    double radial = Avionics.TrueToMag(Avionics.NeBearing(bPos, pos), varW);
                    var v = Avionics.CdiVor(radial, av.Crs);
                    outS.Dots = v.dots; outS.ToFrom = v.toFrom; outS.Crs = av.Crs; outS.Obs = true;
                }
                if (av.Proc != null && av.Proc.Type == "RNAV" && !av.Proc.Missed && rwy != null && !gpsFail)
                {
                    var c = FlightPhysics.RwyCoords(rwy, pos.N, pos.E);
                    double h = (o.AltTrue - rwy.ElevFt) / 3.28084, dGp = 300 - c.along;
                    if (dGp > 200 && dGp < 35000 && Math.Abs(c.cross) < 3000)
                        outS.GsDots = Avionics.GsDots(Math.Atan2(h, dGp) / Avionics.DEG - 3);
                }
            }
            else
            {
                var r = av.Cdi == "NAV1" ? av.Nav1 : av.Nav2;
                var aid = Avionics.NAVAIDS.Find(x => x.Freq == r.Act);
                if (aid == null) { outS.Flag = "NO SIGNAL"; outS.Dots = 0; outS.ToFrom = ""; }
                else if (aid.Type == "VOR")
                {
                    var aidPos = new NePos(aid.N, aid.E);
                    double radial = Avionics.TrueToMag(Avionics.NeBearing(aidPos, pos), varW);
                    double d = Avionics.NeDistNm(aidPos, pos);
                    if (d > 40) outS.Flag = "NO SIGNAL";
                    else { var v = Avionics.CdiVor(radial, av.Crs); outS.Dots = v.dots; outS.ToFrom = v.toFrom; outS.Radial = radial; outS.Dme = d; }
                    outS.Crs = av.Crs;
                }
                else
                {
                    var c = FlightPhysics.RwyCoords(rwy, pos.N, pos.E);
                    double ant = rwy.Len + 300, dist = ant - c.along;
                    outS.Crs = Avionics.TrueToMag(rwy.TrueHdg, varW);
                    if (dist < 300 || dist > 35000 || Math.Abs(Math.Atan2(c.cross, dist)) > 35 * Avionics.DEG) outS.Flag = "NO LOC";
                    else
                    {
                        outS.Dots = Avionics.CdiLoc(Math.Atan2(c.cross, dist) / Avionics.DEG);
                        outS.ToFrom = "TO";
                        double h = (o.AltTrue - rwy.ElevFt) / 3.28084, dGp = 300 - c.along;
                        outS.GsDots = dGp > 200 ? Avionics.GsDots(Math.Atan2(h, dGp) / Avionics.DEG - 3) : (double?)null;
                    }
                }
            }
            av.Nrts = new List<string>();
            foreach (var e in Avionics.NrstList(av, pos, varW)) av.Nrts.Add(e.Id);
            return outS;
        }

        public class AlertEntry { public string Id, Tier, Text; }
        public static List<AlertEntry> CollectAlerts(AvionicsState av, OutRecord o, List<EngState> engs)
        {
            var outL = new List<AlertEntry>();
            if (o != null && o.Alerts != null)
            {
                foreach (var aObj in o.Alerts)
                {
                    if (aObj is string) { var s = (string)aObj; outL.Add(new AlertEntry { Id = s, Tier = "CAUT", Text = s }); continue; }
                    var ai = aObj as AlertItem;
                    string id = ai != null && (ai.Id ?? ai.Text) != null ? (ai.Id ?? ai.Text) : "ALERT";
                    string tier = ai != null && (ai.Tier == "WARN" || ai.Level == "warn") ? "WARN" : "CAUT";
                    string text = ai != null && ai.Text != null ? ai.Text : (ai != null && ai.Id != null ? ai.Id : "ALERT");
                    outL.Add(new AlertEntry { Id = id, Tier = tier, Text = text });
                }
                return outL;
            }
            o = o ?? new OutRecord();
            bool anyRun = false;
            if (engs != null) foreach (var e in engs) if (e.Run) anyRun = true;
            if (engs == null || engs.Count == 0) anyRun = true;   // JS fallback list is [{ run: true, ... }]
            if (Avionics.Fin(o.Volts, 99) < 12.2 && Avionics.Fin(o.Amps, 0) < -0.5) outL.Add(new AlertEntry { Id = "LOW VOLTS", Tier = "CAUT", Text = "LOW VOLTS — 電圧低下" });
            var oilP = o.OilP;
            if (anyRun && oilP != null && oilP.Length > 0)
            {
                bool low = false; foreach (var v in oilP) if (Avionics.Fin(v, 99) < 25) low = true;
                if (low) outL.Add(new AlertEntry { Id = "LOW OIL PRESSURE", Tier = "WARN", Text = "LOW OIL PRESSURE — 油圧低下" });
            }
            var fuel = o.Fuel;
            if (fuel != null && fuel.Length > 1)
            {
                if (Avionics.Fin(fuel[0], 99) < 3) outL.Add(new AlertEntry { Id = "LOW FUEL L", Tier = "CAUT", Text = "LOW FUEL L — 左タンク残りわずか" });
                if (Avionics.Fin(fuel[1], 99) < 3) outL.Add(new AlertEntry { Id = "LOW FUEL R", Tier = "CAUT", Text = "LOW FUEL R — 右タンク残りわずか" });
            }
            if (anyRun && Avionics.Fin(o.FuelPress, 99) < 0.5)
                outL.Add(new AlertEntry { Id = "LOW FUEL PRESSURE", Tier = "CAUT", Text = "LOW FUEL PRESS — 燃料圧低下" });
            return outL;
        }
    }
}
