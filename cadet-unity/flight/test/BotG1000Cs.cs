// BotG1000Cs.cs — the C# replay of golden-g1000.jsonl (tools/golden-g1000.mjs).
// Each record carries a snapshot of the G1000 draw inputs (the g1000.js fill()
// frame) and the canvas op streams the real avionics.js produced for
// drawPFD / drawMFD at 1280×800; the ported CadetG1000Draw must reproduce
// the streams op for op (numbers compared at 3 decimals).
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotG1000Cs
{
    class Rec : IBCanvas
    {
        public string FillStyle { get; set; } = "#000";
        public string StrokeStyle { get; set; } = "#000";
        public double LineWidth { get; set; } = 1;
        public FontSpec Font { get; set; }
        public string TextAlign { get; set; } = "left";
        public string TextBaseline { get; set; } = "alphabetic";
        public readonly List<string> Ops = new List<string>();
        List<string> path = new List<string>();
        double[] dash = new double[0];
        readonly Stack<(string, string, double, FontSpec, string, string, double[])> stack = new Stack<(string, string, double, FontSpec, string, string, double[])>();

        static string R(double v) { double r = Math.Round(v * 1000) / 1000; return r.ToString("R", CultureInfo.InvariantCulture); }
        string Segs() { return string.Join(";", path); }
        public static string FontStr(FontSpec f) { return $"{R(f.Size)}px w{f.Weight}{(f.Mono ? " mono" : "")}"; }

        public void Save() { stack.Push((FillStyle, StrokeStyle, LineWidth, Font, TextAlign, TextBaseline, dash)); Ops.Add("save"); }
        public void Restore() { var s = stack.Pop(); FillStyle = s.Item1; StrokeStyle = s.Item2; LineWidth = s.Item3; Font = s.Item4; TextAlign = s.Item5; TextBaseline = s.Item6; dash = s.Item7; Ops.Add("restore"); }
        public void BeginPath() { path = new List<string>(); }
        public void Arc(double x, double y, double r, double a0, double a1) { path.Add($"A {R(x)} {R(y)} {R(r)} {R(a0)} {R(a1)}"); }
        public void Rect(double x, double y, double w, double h) { path.Add($"R {R(x)} {R(y)} {R(w)} {R(h)}"); }
        public void MoveTo(double x, double y) { path.Add($"M {R(x)} {R(y)}"); }
        public void LineTo(double x, double y) { path.Add($"L {R(x)} {R(y)}"); }
        public void ClosePath() { path.Add("Z"); }
        public void Clip() { Ops.Add($"clip({Segs()})"); path = new List<string>(); }
        public void Fill() { Ops.Add($"fill({Segs()}|{FillStyle})"); path = new List<string>(); }
        public void Stroke() { Ops.Add($"stroke({Segs()}|{StrokeStyle}|{R(LineWidth)}|{string.Join(",", Array.ConvertAll(dash, d => R(d)))})"); path = new List<string>(); }
        public void Translate(double x, double y) { Ops.Add($"translate({R(x)},{R(y)})"); }
        public void Rotate(double a) { Ops.Add($"rotate({R(a)})"); }
        public void Scale(double x, double y) { Ops.Add($"scale({R(x)},{R(y)})"); }
        public void FillRect(double x, double y, double w, double h) { Ops.Add($"fillRect({R(x)},{R(y)},{R(w)},{R(h)}|{FillStyle})"); }
        public void StrokeRect(double x, double y, double w, double h) { Ops.Add($"strokeRect({R(x)},{R(y)},{R(w)},{R(h)}|{StrokeStyle}|{R(LineWidth)})"); }
        public void FillText(string str, double x, double y) { Ops.Add($"text({str}|{R(x)},{R(y)}|{FontStr(Font)}|{TextAlign}|{FillStyle})"); }
        public void SetLineDash(double[] d) { dash = d; }
    }

    static string R(double v) { double r = Math.Round(v * 1000) / 1000; return r.ToString("R", CultureInfo.InvariantCulture); }
    static string JsFont(string font)
    {
        var parts = font.Split(' ');
        int weight = 400; string sizeTok = parts[0];
        if (parts.Length > 1 && parts[1].EndsWith("px") && int.TryParse(parts[0], out var w)) { weight = w; sizeTok = parts[1]; }
        double size = double.Parse(sizeTok.Replace("px", ""), CultureInfo.InvariantCulture);
        bool mono = font.Contains("Consolas") || font.Contains("monospace");
        return $"{R(size)}px w{weight}{(mono ? " mono" : "")}";
    }
    static string CanonSeg(Lst seg)
    {
        string k = (string)seg[0];
        if (k == "Z") return "Z";
        var nums = new List<string>();
        for (int i = 1; i < seg.Count; i++) nums.Add(R((double)seg[i]));
        return k + " " + string.Join(" ", nums);
    }
    static string CanonSegs(object segsObj)
    {
        var parts = new List<string>();
        foreach (var s in (Lst)segsObj) parts.Add(CanonSeg((Lst)s));
        return string.Join(";", parts);
    }
    static string CanonOp(Lst op)
    {
        string k = (string)op[0];
        switch (k)
        {
            case "save": return "save";
            case "restore": return "restore";
            case "translate": return $"translate({R((double)op[1])},{R((double)op[2])})";
            case "rotate": return $"rotate({R((double)op[1])})";
            case "scale": return $"scale({R((double)op[1])},{R((double)op[2])})";
            case "clip": return $"clip({CanonSegs(op[1])})";
            case "fill": return $"fill({CanonSegs(op[1])}|{(string)op[2]})";
            case "stroke": { var dash = new List<string>(); foreach (var d in (Lst)op[4]) dash.Add(R((double)d)); return $"stroke({CanonSegs(op[1])}|{(string)op[2]}|{R((double)op[3])}|{string.Join(",", dash)})"; }
            case "fillRect": return $"fillRect({R((double)op[1])},{R((double)op[2])},{R((double)op[3])},{R((double)op[4])}|{(string)op[5]})";
            case "strokeRect": return $"strokeRect({R((double)op[1])},{R((double)op[2])},{R((double)op[3])},{R((double)op[4])}|{(string)op[5]}|{R((double)op[6])})";
            case "text": return $"text({(string)op[1]}|{R((double)op[2])},{R((double)op[3])}|{JsFont((string)op[4])}|{(string)op[5]}|{(string)op[6]})";
        }
        return "??" + k;
    }

    static double Num(Dict d, string k, double def = 0) { object v; return d != null && d.TryGetValue(k, out v) && v is double x ? x : def; }
    static bool HasNum(Dict d, string k) { object v; return d != null && d.TryGetValue(k, out v) && v is double; }
    static string Str(Dict d, string k, string def = null) { object v; return d != null && d.TryGetValue(k, out v) && v is string s ? s : def; }
    static bool Bool(Dict d, string k, bool def = false) { object v; return d != null && d.TryGetValue(k, out v) && v is bool b ? b : def; }
    static Dict Obj(Dict d, string k) { object v; return d != null && d.TryGetValue(k, out v) ? v as Dict : null; }
    static Lst Arr(Dict d, string k) { object v; return d != null && d.TryGetValue(k, out v) ? v as Lst : null; }
    static double[] DArr(Dict d, string k)
    {
        var a = Arr(d, k); if (a == null) return null;
        var r = new double[a.Count]; for (int i = 0; i < a.Count; i++) r[i] = a[i] is double x ? x : 0;
        return r;
    }

    static OutRecord BuildOut(Dict od, G1000Frame fr)
    {
        var o = new OutRecord();
        o.Pitch = Num(od, "pitch"); o.Bank = Num(od, "bank"); o.Ias = Num(od, "ias"); o.Vsi = Num(od, "vsi");
        o.AltTrue = Num(od, "altTrue"); o.HdgTrue = Num(od, "hdgTrue"); o.Trk = Num(od, "trk"); o.Gs = Num(od, "gs");
        o.Tas = Num(od, "tas"); o.Mach = Num(od, "mach"); o.Oat = Num(od, "oat"); o.WindFrom = Num(od, "windFrom");
        o.WindKt = Num(od, "windKt"); o.AoaFrac = Num(od, "aoaFrac"); o.Slip = Num(od, "slip");
        o.StallWarn = Bool(od, "stallWarn"); o.Rpm = Num(od, "rpm"); o.Jet = Bool(od, "jet");
        o.N1s = DArr(od, "n1s"); o.N1 = Num(od, "n1"); o.Egts = DArr(od, "egts"); o.Egt = Num(od, "egt");
        o.ManIns = DArr(od, "manIns"); o.ManIn = Num(od, "manIn"); o.OilP = DArr(od, "oilP"); o.OilT = DArr(od, "oilT");
        o.Fuel = DArr(od, "fuel"); o.FuelFlow = Num(od, "fuelFlow"); o.PowerPct = Num(od, "powerPct");
        o.GovRpm = HasNum(od, "govRpm") ? Num(od, "govRpm") : (double?)null;
        o.Volts = Num(od, "volts"); o.Amps = (int)Num(od, "amps"); o.FuelPress = Num(od, "fuelPress");
        o.GearPos = Num(od, "gearPos"); o.Hobbs = Num(od, "hobbs"); o.Rev = Num(od, "rev"); o.Spoiler = Num(od, "spoiler");
        fr.VoltsKnown = HasNum(od, "volts"); fr.AmpsKnown = HasNum(od, "amps");
        fr.FuelPressKnown = HasNum(od, "fuelPress"); fr.HobbsKnown = HasNum(od, "hobbs");
        fr.ElecState = Str(od, "elecState");
        fr.OnGround = Bool(od, "onGround");
        var cyls = Arr(od, "cyls");
        if (cyls != null) foreach (var eObj in cyls)
        {
            var lst = new List<CylState>();
            foreach (var cObj in (Lst)eObj) { var cd = (Dict)cObj; lst.Add(new CylState { Egt = Num(cd, "egt"), Cht = Num(cd, "cht") }); }
            o.Cyls.Add(lst);
        }
        var cyl = Arr(od, "cyl");
        if (cyl != null) foreach (var cObj in cyl) { var cd = (Dict)cObj; o.Cyl.Add(new CylState { Egt = Num(cd, "egt"), Cht = Num(cd, "cht") }); }
        return o;
    }

    static RadioPair Pair(Dict d, string k, RadioPair def)
    {
        var p = Obj(d, k); if (p == null) return def;
        return new RadioPair((int)Num(p, "act", def.Act), (int)Num(p, "stby", def.Stby));
    }

    static AvionicsState BuildAv(Dict ad)
    {
        var av = Avionics.CreateAvionics();
        av.Com1 = Pair(ad, "com1", av.Com1); av.Com2 = Pair(ad, "com2", av.Com2);
        av.Nav1 = Pair(ad, "nav1", av.Nav1); av.Nav2 = Pair(ad, "nav2", av.Nav2);
        av.ComSel = Str(ad, "comSel", av.ComSel); av.NavSel = Str(ad, "navSel", av.NavSel);
        av.HdgBug = Num(ad, "hdgBug", av.HdgBug); av.AltSel = Num(ad, "altSel", av.AltSel);
        av.Baro = Num(ad, "baro", av.Baro); av.BaroUnit = Str(ad, "baroUnit", av.BaroUnit);
        av.Crs = Num(ad, "crs", av.Crs); av.Cdi = Str(ad, "cdi", av.Cdi);
        av.Brg1 = Str(ad, "brg1"); av.Brg2 = Str(ad, "brg2");
        av.XpdrIdent = Num(ad, "xpdrIdent");
        var xp = Obj(ad, "xpdr"); if (xp != null) { av.Xpdr.Code = (int)Num(xp, "code", av.Xpdr.Code); av.Xpdr.Mode = Str(xp, "mode", av.Xpdr.Mode); av.Xpdr.Entry = Str(xp, "entry", ""); }
        av.PfdMenu = Str(ad, "pfdMenu", av.PfdMenu); av.Wind = Bool(ad, "wind", av.Wind);
        av.MfdPage = Str(ad, "mfdPage", av.MfdPage); av.MfdRangeIdx = (int)Num(ad, "mfdRangeIdx", av.MfdRangeIdx);
        av.MapNorthUp = Bool(ad, "mapNorthUp", av.MapNorthUp);
        var fpl = Obj(ad, "fpl"); if (fpl != null) { var wps = Arr(fpl, "wps"); if (wps != null) { av.Fpl.Wps = new List<string>(); foreach (var w in wps) av.Fpl.Wps.Add((string)w); } av.Fpl.Active = (int)Num(fpl, "active", av.Fpl.Active); }
        av.FplEdit = Bool(ad, "fplEdit"); av.FplCursor = (int)Num(ad, "fplCursor", av.FplCursor);
        av.FplPick = (int)Num(ad, "fplPick"); av.NrstSel = (int)Num(ad, "nrstSel");
        av.Direct = Str(ad, "direct");
        var df = Obj(ad, "directFrom"); if (df != null) av.DirectFrom = new NePos(Num(df, "n"), Num(df, "e"));
        av.DirectFromId = Str(ad, "directFromId");
        var pr = Obj(ad, "proc"); if (pr != null) av.Proc = new ProcState { Name = Str(pr, "name"), Type = Str(pr, "type"), Missed = Bool(pr, "missed"), DaFt = HasNum(pr, "daFt") ? Num(pr, "daFt") : (double?)null, MdaFt = HasNum(pr, "mdaFt") ? Num(pr, "mdaFt") : (double?)null };
        var fail = Obj(ad, "fail"); if (fail != null) { av.Fail = new Dictionary<string, bool>(); foreach (var kv in fail) av.Fail[kv.Key] = kv.Value is bool b && b; }
        var ack = Obj(ad, "ack"); if (ack != null) foreach (var kv in ack) av.Ack[kv.Key] = kv.Value is bool b2 && b2;
        av.FuelInit = HasNum(ad, "fuelInit") ? Num(ad, "fuelInit") : (double?)null;
        var ep = Arr(ad, "egtPeak"); if (ep != null) { av.EgtPeak = new List<double>(); foreach (var v in ep) av.EgtPeak.Add(v is double x ? x : 0); }
        return av;
    }

    static int Compare(string tag, string unit, Lst jsOps, List<string> csOps)
    {
        var js = new List<string>(); foreach (var o in jsOps) js.Add(CanonOp((Lst)o));
        int n = Math.Max(js.Count, csOps.Count);
        for (int i = 0; i < n; i++)
        {
            string a = i < js.Count ? js[i] : "<none>", b = i < csOps.Count ? csOps[i] : "<none>";
            if (a != b)
            {
                Console.WriteLine($"DIFF {tag} {unit} op {i}: JS {a}  |  CS {b}");
                return 1;
            }
        }
        return 0;
    }

    public static int Main(string[] args)
    {
        string path = args.Length > 0 ? args[0] : "flight/test/golden-g1000.jsonl";
        var lines = File.ReadAllLines(path);
        int bad = 0, totalOps = 0;
        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            var rec = (Dict)MiniJson.Parse(line);
            string tag = Str(rec, "tag");
            var fr = new G1000Frame { AcId = Str(rec, "ac", "pa28") };
            fr.O = BuildOut(Obj(rec, "o"), fr);
            fr.Av = BuildAv(Obj(rec, "av"));
            var eng = Arr(rec, "eng"); if (eng != null) { fr.Eng = new List<G1000Eng>(); foreach (var eObj in eng) { var ed = (Dict)eObj; fr.Eng.Add(new G1000Eng { Run = Bool(ed, "run"), Rpm = Num(ed, "rpm"), Feather = Bool(ed, "feather") }); } }
            var vd = Obj(rec, "V"); if (vd != null) { fr.V = new Dictionary<string, double>(); foreach (var kv in vd) if (kv.Value is double dv) fr.V[kv.Key] = dv; }
            fr.FuelCap = Num(rec, "fuelCap", 24); fr.Qnh = Num(rec, "qnh", 29.92); fr.VarW = Num(rec, "varW", FlightPhysics.MAGVAR_W);
            var pos = Obj(rec, "pos"); fr.Pos = new NePos(Num(pos, "n"), Num(pos, "e"));
            fr.GearRev = Bool(rec, "gearRev");
            var tr = Arr(rec, "traffic"); if (tr != null) { fr.Traffic = new List<G1000Traffic>(); foreach (var tObj in tr) { var td = (Dict)tObj; fr.Traffic.Add(new G1000Traffic { N = Num(td, "n"), E = Num(td, "e"), AltFt = HasNum(td, "altFt") ? Num(td, "altFt") : (double?)null, Hdg = HasNum(td, "hdg") ? Num(td, "hdg") : (double?)null }); } }
            var rp = new Rec(); G1000Draw.DrawPFD(rp, 1280, 800, fr);
            var rm = new Rec(); G1000Draw.DrawMFD(rm, 1280, 800, fr);
            totalOps += rp.Ops.Count + rm.Ops.Count;
            bad += Compare(tag, "pfd", Arr(rec, "pfd"), rp.Ops);
            bad += Compare(tag, "mfd", Arr(rec, "mfd"), rm.Ops);
        }
        Console.WriteLine($"records done, csOps={totalOps}, mismatched units={bad}");
        return bad == 0 ? 0 : 1;
    }
}
