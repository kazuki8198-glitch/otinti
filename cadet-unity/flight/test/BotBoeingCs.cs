// BotBoeingCs.cs — the C# replay of golden-boeing.jsonl (tools/golden-boeing.mjs).
// Each record carries a snapshot of the draw inputs and the canvas op stream
// the real boeing.js produced for that update() call; the ported BoeingGlass
// must reproduce the streams op for op (numbers compared at 3 decimals).
// The scenario's glass-state mutations (DU / EFIS changes, CDU keys) are
// replayed at the same frame indices the generator applied them.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotBoeingCs
{
    // ------------------------------------------------------------ a recording IBCanvas
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

    // canonicalize a JS-side op (parsed from the golden JSON) the same way
    static string R(double v) { double r = Math.Round(v * 1000) / 1000; return r.ToString("R", CultureInfo.InvariantCulture); }
    static string JsFont(string font)
    {
        // '700 36px "Segoe UI", Arial, sans-serif' / '600 21px "Consolas", "Courier New", monospace' / '19px ...'
        var parts = font.Split(' ');
        int weight = 400; string sizeTok = parts[0];
        if (parts.Length > 1 && (parts[0] == "700" || parts[0] == "600" || parts[0] == "400")) { weight = int.Parse(parts[0]); sizeTok = parts[1]; }
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

    // ------------------------------------------------------------ snapshot → objects
    static double Num(Dict d, string k, double def = 0) { object v; return d != null && d.TryGetValue(k, out v) && v is double x ? x : def; }
    static string Str(Dict d, string k, string def = null) { object v; return d != null && d.TryGetValue(k, out v) && v is string s ? s : def; }
    static bool Bool(Dict d, string k, bool def = false) { object v; return d != null && d.TryGetValue(k, out v) && v is bool b ? b : def; }
    static Dict Obj(Dict d, string k) { object v; return d != null && d.TryGetValue(k, out v) ? v as Dict : null; }
    static Lst Arr(Dict d, string k) { object v; return d != null && d.TryGetValue(k, out v) ? v as Lst : null; }

    static State BuildState(Dict sd)
    {
        var s = Sim.NewState(7, "b737");
        var pos = Arr(sd, "pos");
        s.Pos = new[] { (double)pos[0], (double)pos[1], (double)pos[2] };
        s.Qnh = Num(sd, "qnh", 29.92); s.Thr = Num(sd, "thr"); s.GearPos = Num(sd, "gearPos", 1);
        s.GearDown = Bool(sd, "gearDown", true); s.FlapIdx = (int)Num(sd, "flapIdx"); s.OnGround = Bool(sd, "onGround");
        var fuel = Arr(sd, "fuel"); if (fuel != null) s.Fuel = new[] { (double)fuel[0], (double)fuel[1] };
        var engs = Arr(sd, "eng");
        for (int i = 0; i < engs.Count && i < s.Eng.Count; i++)
        {
            var e = (Dict)engs[i];
            object eg; s.Eng[i].Egt = e.TryGetValue("egt", out eg) && eg is double ev ? ev : (double?)null;
            s.Eng[i].Ff = Num(e, "ff"); s.Eng[i].On = Bool(e, "on", true);
            object oq; s.Eng[i].OilQ = e.TryGetValue("oilQ", out oq) && oq is double ov ? ov : 0;
        }
        var o = Obj(sd, "out"); var so = s.Out;
        so.Bank = Num(o, "bank"); so.Pitch = Num(o, "pitch"); so.Ias = Num(o, "ias"); so.AltTrue = Num(o, "altTrue");
        so.Vsi = Num(o, "vsi"); so.HdgTrue = Num(o, "hdgTrue"); so.Agl = Num(o, "agl"); so.Mach = Num(o, "mach");
        so.Gs = Num(o, "gs"); so.Trk = Num(o, "trk"); so.StallWarn = Bool(o, "stallWarn"); so.N1 = Num(o, "n1");
        var n1s = Arr(o, "n1s"); if (n1s != null) { so.N1s = new double[n1s.Count]; for (int i = 0; i < n1s.Count; i++) so.N1s[i] = (double)n1s[i]; }
        var egts = Arr(o, "egts"); if (egts != null) { so.Egts = new double[egts.Count]; for (int i = 0; i < egts.Count; i++) so.Egts[i] = (double)egts[i]; }
        so.Spoiler = Num(o, "spoiler"); so.Rev = Num(o, "rev");
        return s;
    }

    static RadioPair Pair(Dict d, string k, RadioPair def)
    {
        var p = Obj(d, k); if (p == null) return def;
        return new RadioPair((int)Num(p, "act", def.Act), (int)Num(p, "sby", def.Stby));
    }

    static AvionicsState BuildAv(Dict ad)
    {
        var av = Avionics.CreateAvionics();
        if (ad == null) return null;
        var ap = Obj(ad, "ap");
        if (ap != null) av.Ap = new ApState { On = Bool(ap, "on"), Hdg = Bool(ap, "hdg"), Alt = Bool(ap, "alt"), Nav = Bool(ap, "nav"), Apr = Bool(ap, "apr"), Vs = Bool(ap, "vs"), Lvl = Bool(ap, "lvl"), Flash = Num(ap, "flash"), LvlChg = Bool(ap, "lvlChg"), GsCap = Bool(ap, "gsCap") };
        var fd = Obj(ad, "fd");
        if (fd != null) av.Fd = new FdState { On = Bool(fd, "on"), Bank = Num(fd, "bank"), Pitch = Num(fd, "pitch") };
        var at = Obj(ad, "at");
        if (at != null) av.At = new AtState { Arm = Bool(at, "arm"), On = Bool(at, "on"), Spd = Num(at, "spd", 250) };
        av.AltSel = Num(ad, "altSel", 3000); av.Baro = Num(ad, "baro", 29.92); av.BaroUnit = Str(ad, "baroUnit", "IN");
        av.HdgBug = Num(ad, "hdgBug", 360); av.Crs = Num(ad, "crs", 360); av.Cdi = Str(ad, "cdi", "GPS"); av.Obs = Bool(ad, "obs");
        av.Brg1 = Str(ad, "brg1"); av.Brg2 = Str(ad, "brg2");
        var fpl = Obj(ad, "fpl");
        if (fpl != null) { var w = Arr(fpl, "wps"); av.Fpl.Wps = new List<string>(); foreach (var x in w) av.Fpl.Wps.Add((string)x); av.Fpl.Active = (int)Num(fpl, "active", 1); }
        av.Direct = Str(ad, "direct");
        var df = Obj(ad, "directFrom"); if (df != null) av.DirectFrom = new NePos(Num(df, "n"), Num(df, "e"));
        av.DirectFromId = Str(ad, "directFromId");
        av.Nav1 = Pair(ad, "nav1", av.Nav1); av.Nav2 = Pair(ad, "nav2", av.Nav2);
        av.Com1 = Pair(ad, "com1", av.Com1); av.Com2 = Pair(ad, "com2", av.Com2);
        av.ComSel = Str(ad, "comSel", "COM1"); av.NavSel = Str(ad, "navSel", "NAV1"); av.AudioMic = Str(ad, "audioMic", "COM1");
        var mon = Obj(ad, "monitor"); if (mon != null) foreach (var kv in mon) av.Monitor[kv.Key] = (bool)kv.Value;
        var xp = Obj(ad, "xpdr"); if (xp != null) av.Xpdr = new XpdrState { Code = (int)Num(xp, "code", 1200), Mode = Str(xp, "mode", "ALT"), Entry = Str(xp, "entry", "") };
        av.XpdrIdent = Num(ad, "xpdrIdent");
        var pr = Obj(ad, "proc"); if (pr != null) av.Proc = new ProcState { Name = Str(pr, "name"), Type = Str(pr, "type"), Missed = Bool(pr, "missed") };
        av.PfdMenu = Str(ad, "pfdMenu", "TOP"); av.MapNorthUp = Bool(ad, "mapNorthUp", true);
        return av;
    }

    // the generator's glass-state schedule (frame index → mutation)
    static void Schedule(int i, BoeingGlass glass)
    {
        if (i == 252) glass.State.DuOut = "ND";
        if (i == 288) glass.State.DuLow = "ND";
        if (i == 324) { glass.State.NdMode = "ROSE"; glass.State.NdRange = 80; }
        if (i == 360) { glass.State.DuOut = "PFD"; glass.State.DuLow = "EICAS"; glass.State.NdMode = "MAP"; glass.State.NdRange = 40; }
        string[] keys = { "R6", "R5", "R6", "K", "M", "Q", "R1", "R6", "EXEC", "1", "2", "L1", "CLR" };
        if (i >= 378 && i < 378 + keys.Length * 6 && (i - 378) % 6 == 0) BoeingCdu.Key(glass.State, keys[(i - 378) / 6]);
    }

    public static int Main(string[] args)
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        string path = args.Length > 0 ? args[0] : "golden-boeing.jsonl";
        var lines = File.ReadAllLines(path);
        var created = new List<Rec>();
        var glass = new BoeingGlass(new BoeingState(), (w, h) => { var r = new Rec(); created.Add(r); return r; });
        // units in creation order: pfd, nd, eicasU, eicasL, cdu, stby
        var unitRec = new Dictionary<string, Rec>();
        string[] order = { "pfd", "nd", "eicasU", "eicasL", "cdu", "stby" };
        for (int ui = 0; ui < order.Length; ui++) unitRec[order[ui]] = created[ui];
        var counts = new Dictionary<string, int>();
        foreach (var k in order) counts[k] = unitRec[k].Ops.Count;

        BoeingRoute routeCache = null; bool routeBuilt = false;
        long totalOps = 0, badOps = 0; int badFrames = 0, shown = 0;
        for (int li = 0; li < lines.Length; li++)
        {
            if (lines[li].Length == 0) continue;
            var rec = (Dict)MiniJson.Parse(lines[li]);
            int fi = (int)(double)rec["i"];
            Schedule(fi, glass);
            var snap = Obj(rec, "snap");
            var s = BuildState(Obj(snap, "s"));
            var av = BuildAv(Obj(snap, "av"));
            var engD = Obj(snap, "eng");
            var twin = new TwinEng[2];
            var tw = Arr(engD, "twin");
            for (int i = 0; i < 2; i++) { var t = (Dict)tw[i]; object ot; twin[i] = new TwinEng { Oil = Num(t, "oil"), OilT = t.TryGetValue("oilT", out ot) && ot is double ov ? ov : (double?)null }; }
            var eng = new BoeingEngView { Twin = twin, AltFail = Bool(Obj(engD, "elec"), "altFail"), ParkBrake = Bool(engD, "parkBrake") };
            if (!routeBuilt)
            {
                routeBuilt = true;
                var routeD = Obj(snap, "route");
                routeCache = routeD == null ? null : new BoeingRoute { Id = Str(routeD, "id"), From = Str(routeD, "from"), To = Str(routeD, "to"), Alternate = Str(routeD, "alternate"), CruiseFL = (int)Num(routeD, "cruiseFL"), DistKm = (int)Num(routeD, "distKm"), BlockMin = (int)Num(routeD, "blockMin") };
            }
            var route = routeCache;
            glass.Update(1.0 / 60, new BoeingFrame { S = s, Av = av, Eng = eng, ElecPfd = Bool(snap, "elecPfd", true), Route = route });
            var want = Obj(rec, "ops");
            bool frameBad = false;
            foreach (var unit in order)
            {
                var gotOps = unitRec[unit].Ops.GetRange(counts[unit], unitRec[unit].Ops.Count - counts[unit]);
                counts[unit] = unitRec[unit].Ops.Count;
                var wantOps = want != null ? Arr(want, unit) : null;
                int wn = wantOps == null ? 0 : wantOps.Count;
                totalOps += Math.Max(wn, gotOps.Count);
                if (wn != gotOps.Count)
                {
                    frameBad = true; badOps += Math.Abs(wn - gotOps.Count);
                    if (shown < 12) { shown++; Console.WriteLine($"frame {fi} {unit}: cs {gotOps.Count} ops vs js {wn}"); }
                }
                int n = Math.Min(wn, gotOps.Count);
                for (int oi = 0; oi < n; oi++)
                {
                    string w = CanonOp((Lst)wantOps[oi]);
                    if (w != gotOps[oi])
                    {
                        frameBad = true; badOps++;
                        if (shown < 12) { shown++; Console.WriteLine($"frame {fi} {unit} op {oi}:\n  cs: {gotOps[oi]}\n  js: {w}"); }
                    }
                }
            }
            if (frameBad) badFrames++;
        }
        Console.WriteLine($"boeing cs: {lines.Length - badFrames}/{lines.Length} frames match ({totalOps - badOps}/{totalOps} ops)");
        return badFrames == 0 ? 0 : 1;
    }
}
