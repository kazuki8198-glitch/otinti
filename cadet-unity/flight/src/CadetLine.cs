// CadetLine — a verbatim C# port of cadet/src/flight/line.js (Stage 10):
// the first-officer line-operations machine. Pure logic, no rendering: a
// duty as a step machine (brief → dispatch → fly → debrief) fed by
// observation updates, exactly as the original. The data tables (routes,
// captains, dispatch cases, PM task templates) live in
// StreamingAssets data/line.json, extracted from the source; the line
// airfields come from airfields.json (LINE_AIRFIELDS).
using System;
using System.Collections.Generic;
using System.Globalization;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public class LineRoute
    {
        public string Id, From, To, Alternate;
        public double DistKm, BlockMin, CruiseFL, CruiseAltFt, TripFuelKg;
    }
    public class LineCaptain
    {
        public string Id, Name, Style;
        public double Strict;
    }
    public class DispatchCase
    {
        public string Id, Title, Situation, Reason;
        public List<string> Choices;
        public int CorrectIndex;
        public bool CorrectGo;
    }
    public class LineAirfield
    {
        public string Id, Name, Rwy, Surface;
        public double N, E, TrueHdg, Len, Wid, ElevFt;
        public bool Controlled;
    }
    public class LineEvent
    {
        public string Id, Kind, Title, Situation, Reason;
        public Dict Data;
        public List<string> Choices;
        public int CorrectIndex;
        public List<double> Scores;
        public double? TargetAltFt;
    }
    public class PmTask
    {
        public string Id, TemplateId, Title, Prompt;
        public List<string> Choices;
        public int CorrectIndex;
        public bool Answered;
        public int? Choice;
        public bool? Correct;
    }

    public static class CadetLineData
    {
        public static List<LineRoute> Routes = new List<LineRoute>();
        public static List<LineCaptain> Captains = new List<LineCaptain>();
        public static List<DispatchCase> DispatchCases = new List<DispatchCase>();
        public static List<(string Id, string Title)> PmTaskTemplates = new List<(string, string)>();
        public static int PmTasksPerRide = 5;
        public static Dictionary<string, LineAirfield> Airfields = new Dictionary<string, LineAirfield>();
        static bool loaded;
        public static void Load(string lineJson, string airfieldsJson)
        {
            if (loaded) return; loaded = true;
            var d = (Dict)MiniJson.Parse(lineJson);
            foreach (var o in (Lst)d["ROUTES"]) { var r = (Dict)o; Routes.Add(new LineRoute { Id = MiniJson.Str(r, "id"), From = MiniJson.Str(r, "from"), To = MiniJson.Str(r, "to"), DistKm = MiniJson.Num(r, "distKm"), BlockMin = MiniJson.Num(r, "blockMin"), CruiseFL = MiniJson.Num(r, "cruiseFL"), CruiseAltFt = MiniJson.Num(r, "cruiseAltFt"), TripFuelKg = MiniJson.Num(r, "tripFuelKg"), Alternate = MiniJson.Str(r, "alternate") }); }
            foreach (var o in (Lst)d["CAPTAINS"]) { var c = (Dict)o; Captains.Add(new LineCaptain { Id = MiniJson.Str(c, "id"), Name = MiniJson.Str(c, "name"), Style = MiniJson.Str(c, "style"), Strict = MiniJson.Num(c, "strict", 1) }); }
            foreach (var o in (Lst)d["DISPATCH_CASES"]) { var c = (Dict)o; var ch = new List<string>(); foreach (var x in (Lst)c["choices"]) ch.Add((string)x); DispatchCases.Add(new DispatchCase { Id = MiniJson.Str(c, "id"), Title = MiniJson.Str(c, "title"), Situation = MiniJson.Str(c, "situation"), Choices = ch, CorrectIndex = (int)MiniJson.Num(c, "correctIndex"), CorrectGo = MiniJson.Bool(c, "correctGo"), Reason = MiniJson.Str(c, "reason") }); }
            foreach (var o in (Lst)d["PM_TASK_TEMPLATES"]) { var t = (Dict)o; PmTaskTemplates.Add((MiniJson.Str(t, "id"), MiniJson.Str(t, "title"))); }
            PmTasksPerRide = (int)MiniJson.Num(d, "PM_TASKS_PER_RIDE", 5);
            var af = (Dict)MiniJson.Parse(airfieldsJson);
            foreach (var o in (Lst)af["LINE_AIRFIELDS"]) { var a = (Dict)o; var f = new LineAirfield { Id = MiniJson.Str(a, "id"), Name = MiniJson.Str(a, "name"), N = MiniJson.Num(a, "n"), E = MiniJson.Num(a, "e"), Rwy = MiniJson.Str(a, "rwy"), TrueHdg = MiniJson.Num(a, "trueHdg"), Len = MiniJson.Num(a, "len"), Wid = MiniJson.Num(a, "wid"), ElevFt = MiniJson.Num(a, "elevFt"), Controlled = MiniJson.Bool(a, "controlled"), Surface = MiniJson.Str(a, "surface") }; Airfields[f.Id] = f; }
        }
        public static LineAirfield AirfieldById(string id) { return id != null && Airfields.TryGetValue(id, out var f) ? f : null; }

        static LineCaptain Copy(LineCaptain c) { return new LineCaptain { Id = c.Id, Name = c.Name, Style = c.Style, Strict = c.Strict }; }
        public static LineRoute ResolveRoute(object route)
        {
            if (route == null) return Routes[0];
            if (route is string rs)
            {
                string s = rs.ToUpperInvariant();
                return Routes.Find(r => r.Id == s) ?? Routes.Find(r => r.To == s) ?? Routes.Find(r => r.From + "-" + r.To == s) ?? Routes[0];
            }
            if (route is Dict rd)
            {
                string rid = MiniJson.Str(rd, "id");
                if (rid != null) { var byId = Routes.Find(r => r.Id == rid); if (byId != null) return byId; }
                string from = (MiniJson.Str(rd, "from", "HND") ?? "HND").ToUpperInvariant();
                string to = (MiniJson.Str(rd, "to") ?? MiniJson.Str(rd, "dest") ?? MiniJson.Str(rd, "destination") ?? "").ToUpperInvariant();
                return Routes.Find(r => r.From == from && r.To == to) ?? Routes.Find(r => r.To == to) ?? Routes[0];
            }
            return Routes[0];
        }
        static readonly Dictionary<string, double> STRICT_WORDS = new Dictionary<string, double>
        {
            { "strict", 0.95 }, { "厳格", 0.95 }, { "standard", 1.0 }, { "normal", 1.0 }, { "標準", 1.0 }, { "lenient", 1.05 }, { "kind", 1.05 }, { "温厚", 1.05 },
        };
        public static LineCaptain ResolveCaptain(object captain)
        {
            if (captain == null) return Copy(Captains[1]);
            if (captain is double n && !double.IsNaN(n) && !double.IsInfinity(n)) return new LineCaptain { Id = "custom", Name = "機長", Style = "標準", Strict = n };
            if (captain is string w)
            {
                var hit = Captains.Find(c => c.Id == w || c.Name == w);
                if (hit != null) return Copy(hit);
                if (STRICT_WORDS.TryGetValue(w, out var sw)) return new LineCaptain { Id = "custom", Name = "機長", Style = w, Strict = sw };
                var dflt = Copy(Captains[1]); dflt.Name = w; return dflt;
            }
            if (captain is Dict cd)
            {
                var baseC = Captains.Find(c => c.Id == MiniJson.Str(cd, "id")) ?? Captains[1];
                double strict;
                if (cd.TryGetValue("strict", out var sv) && sv is double sd) strict = sd;
                else if (sv is string ss && STRICT_WORDS.TryGetValue(ss, out var sw2)) strict = sw2;
                else if (MiniJson.Str(cd, "style") is string stl && STRICT_WORDS.TryGetValue(stl, out var sw3)) strict = sw3;
                else strict = baseC.Strict;
                return new LineCaptain { Id = MiniJson.Str(cd, "id", baseC.Id), Name = MiniJson.Str(cd, "name", baseC.Name), Style = MiniJson.Str(cd, "style", baseC.Style), Strict = strict };
            }
            return Copy(Captains[1]);
        }
        public static string GradeOf(double total) { return total >= 90 ? "S" : total >= 80 ? "A" : total >= 65 ? "B" : "C"; }
    }

    /// <summary>One deterministic duty (createLineDuty).</summary>
    public class CadetLineDuty
    {
        // ---- the rng (mulberry, uint32) ----
        class Rng
        {
            uint a;
            public Rng(uint seed) { a = seed; }
            static uint Imul(uint x, uint y) { unchecked { return (uint)((int)x * (int)y); } }
            public double Next()
            {
                unchecked
                {
                    a += 0x6D2B79F5u;
                    uint t = a;
                    t = Imul(t ^ (t >> 15), t | 1);
                    t ^= t + Imul(t ^ (t >> 7), t | 61);
                    return ((t ^ (t >> 14)) >> 0) / 4294967296.0;
                }
            }
        }
        readonly Rng R;
        List<T> Shuffled<T>(List<T> arr)
        {
            var a = new List<T>(arr);
            for (int i = a.Count - 1; i > 0; i--) { int j = (int)Math.Floor(R.Next() * (i + 1)); (a[i], a[j]) = (a[j], a[i]); }
            return a;
        }
        static double R1(double x) { return Js.Round(x * 10) / 10; }
        static double N(object v) { return v is double d ? d : 0; }
        static double Clamp(double v, double lo, double hi) { return Math.Min(hi, Math.Max(lo, v)); }
        static string FmtJa(double v)
        {
            long n = (long)Math.Round(v);
            return n.ToString("#,0", CultureInfo.InvariantCulture);
        }

        // ---- state (st) ----
        public string Phase = "brief";
        public double T, PhaseT;
        public string Role;
        public LineRoute Route;
        public LineCaptain Captain;
        public object Weather;
        public LineAirfield Destination;
        public bool Diverted, CompressRequested;
        public Dict Compression;
        public (int Choice, bool Correct, double Score)? Dispatch;
        public bool EventFired;
        public (int Choice, double Score)? EventAnswer;
        public bool Holding, PressedOn;
        public List<PmTask> Tasks = new List<PmTask>();
        public int TasksIssued, TasksCorrect;
        double lastTaskT = double.NegativeInfinity;
        public bool Airborne;
        Dict lastAir;
        public Dict Touchdown;
        public double? LandingScore;
        public double DistDestM, AltFt;
        public bool Arrived, NoGo;
        public DispatchCase DispatchCase;
        public LineEvent ScheduledEvent;
        public LineAirfield Origin, Destination0, AlternateField;
        readonly bool isPM;
        readonly List<Dict> events = new List<Dict>();
        readonly List<string> usedTemplates = new List<string>();
        int taskSeq;
        List<string> tplPool;
        Dict lastSnap = new Dict();

        public CadetLineDuty(object route = null, string role = "PF", object captain = null, double seed = 11, object weather = null)
        {
            Route = CadetLineData.ResolveRoute(route);
            isPM = (role ?? "").ToUpper() == "PM";
            Role = isPM ? "PM" : "PF";
            Captain = CadetLineData.ResolveCaptain(captain);
            Weather = weather;
            Origin = CadetLineData.AirfieldById(Route.From);
            Destination0 = CadetLineData.AirfieldById(Route.To);
            AlternateField = CadetLineData.AirfieldById(Route.Alternate);
            Destination = Destination0;
            ulong prod = (ulong)(long)seed * 2654435761UL;
            uint s = (uint)(prod & 0xFFFFFFFFUL); if (s == 0) s = 1;
            R = new Rng(s);
            DispatchCase = CadetLineData.DispatchCases[(int)Math.Floor(R.Next() * CadetLineData.DispatchCases.Count)];
            ScheduledEvent = BuildEvent(Route, Destination0, AlternateField);
            DistDestM = Route.DistKm * 1000;
        }
        public LineEvent Event { get { return EventFired ? ScheduledEvent : null; } }

        void Emit(Dict e) { events.Add(e); }

        LineEvent BuildEvent(LineRoute rt, LineAirfield dest, LineAirfield alternate)
        {
            if (R.Next() < 0.25) return null;
            string[] kinds = { "weather", "turbulence", "hold" };
            string kind = kinds[(int)Math.Floor(R.Next() * kinds.Length)];
            if (kind == "weather")
            {
                bool canHold = R.Next() < 0.5;
                double visM = canHold ? 400 : 200, minimaM = 550, alternateVisM = 6000, holdFuelMin = canHold ? 60 : 25;
                string trend = canHold ? "約20分で最低条件以上へ回復の予報" : "回復の見込みなし";
                var data = new Dict { { "visM", visM }, { "minimaM", minimaM }, { "trend", trend }, { "alternateVisM", alternateVisM }, { "holdFuelMin", holdFuelMin } };
                return new LineEvent
                {
                    Id = "evt-weather", Kind = kind, Title = "到着地の天候悪化",
                    Situation = $"{dest.Name}（{dest.Id}）の実況：視程 {(long)visM} m（着陸の最低条件 {(long)minimaM} m）、{trend}。代替地 {alternate.Name}（{alternate.Id}）は視程 {(long)alternateVisM} m で良好。ホールディング可能な燃料は約 {(long)holdFuelMin} 分。どうする？",
                    Data = data,
                    Choices = new List<string> { $"代替空港 {alternate.Id} へダイバートする", "ホールディングして様子を見る", "このまま進入を強行する" },
                    CorrectIndex = canHold ? 1 : 0,
                    Scores = canHold ? new List<double> { 0.5, 1, 0 } : new List<double> { 1, 0.25, 0 },
                    Reason = canHold
                        ? "視程は下限未満だが回復予報があり、待てる燃料も十分。様子見（ホールド）が最も無駄のない判断。ダイバートは安全だが過剰、強行は論外。"
                        : "視程 200 m は下限の半分以下で回復見込みもなく、待てる燃料も少ない。代替地が良好なうちにダイバートするのが正解。強行は大きな減点。",
                };
            }
            if (kind == "turbulence")
            {
                bool smoothBelow = R.Next() < 0.5;
                double calmAltFt = smoothBelow ? Math.Max(24000, rt.CruiseAltFt - 6000) : Math.Min(41000, rt.CruiseAltFt + 2000);
                double badAltFt = smoothBelow ? Math.Min(41000, rt.CruiseAltFt + 2000) : Math.Max(24000, rt.CruiseAltFt - 6000);
                var data = new Dict { { "smoothBelow", smoothBelow }, { "calmAltFt", calmAltFt }, { "badAltFt", badAltFt }, { "cruiseAltFt", rt.CruiseAltFt } };
                long calm = (long)(calmAltFt / 100), bad = (long)(badAltFt / 100);
                return new LineEvent
                {
                    Id = "evt-turbulence", Kind = kind, Title = "乱気流の回避",
                    Situation = $"前方機のレポート：現在の巡航高度では強い揺れが続く。{(smoothBelow ? $"下方 FL{calm} はスムーズ、上方はさらに悪いとのこと" : $"上方 FL{calm} はスムーズ、下方は対流雲でさらに悪いとのこと")}。機長が「高度変更、どうする？」と聞いている。",
                    Data = data,
                    Choices = new List<string> { $"FL{calm} へ{(smoothBelow ? "降下" : "上昇")}を要求する", $"FL{bad} へ{(smoothBelow ? "上昇" : "降下")}を要求する", "現在の高度を維持する" },
                    CorrectIndex = 0, Scores = new List<double> { 1, 0, 0.5 }, TargetAltFt = calmAltFt,
                    Reason = "レポートでスムーズと分かっている側へ移るのが正解。悪い側への変更は論外、維持は怪我人を出すリスクを抱えたままになる。",
                };
            }
            double fuelKg = new double[] { 2400, 3150, 3900 }[(int)Math.Floor(R.Next() * 3)];
            double burnKgPerMin = 42;
            double enduranceMin = Math.Floor(fuelKg / burnKgPerMin / 5) * 5;
            var options = Shuffled(new List<double> { enduranceMin - 15, enduranceMin, enduranceMin + 15 });
            return new LineEvent
            {
                Id = "evt-hold", Kind = kind, Title = "到着地混雑：ホールディングの燃料計算",
                Situation = $"{dest.Name}（{dest.Id}）の混雑でホールディングの指示。現在の残燃料 {(long)fuelKg} kg、ホールディング中の消費率 {(long)burnKgPerMin} kg/分。あと何分持つか（5分単位で切り捨て）を機長に報告する。",
                Data = new Dict { { "fuelKg", fuelKg }, { "burnKgPerMin", burnKgPerMin }, { "enduranceMin", enduranceMin } },
                Choices = options.ConvertAll(m => $"約 {(long)m} 分"),
                CorrectIndex = options.IndexOf(enduranceMin),
                Scores = options.ConvertAll(m => m == enduranceMin ? 1.0 : 0.0),
                Reason = $"{(long)fuelKg} ÷ {(long)burnKgPerMin} ＝ 約 {(long)Math.Floor(fuelKg / burnKgPerMin)} 分 → 切り捨てて {(long)enduranceMin} 分。多めに言うと燃料切れの判断を誤る。",
            };
        }

        // ---- the PM monitor tasks ----
        PmTask GenTask(string tplId, Dict snap)
        {
            double alt = Js.Round((SnapNum(snap, "altFt", Route.CruiseAltFt)) / 100) * 100;
            string title = CadetLineData.PmTaskTemplates.Find(t => t.Id == tplId).Title ?? tplId;
            PmTask WithChoices(string prompt, string correct, List<string> decoys)
            {
                var all = new List<string> { correct }; all.AddRange(decoys);
                var choices = Shuffled(all);
                return new PmTask { TemplateId = tplId, Title = title, Prompt = prompt, Choices = choices, CorrectIndex = choices.IndexOf(correct) };
            }
            switch (tplId)
            {
                case "alt-callout":
                    {
                        long fl = (long)Js.Round(alt / 100);
                        return WithChoices($"現在 {FmtJa(alt)} ft を通過中。PF への高度通過のコールアウトとして正しいのは？",
                            $"「{FmtJa(alt)} ft、通過」", new List<string> { $"「FL{fl + 10}、通過」", $"「あと {FmtJa(1000)} ft で巡航高度」" });
                    }
                case "checklist-timing":
                    return WithChoices("降下を開始するタイミングで、PM が実施するチェックリストは？", "Descent Checklist", new List<string> { "Before Start Checklist", "Shutdown Checklist" });
                case "radio-response":
                    return WithChoices("管制：「翔洋 212、FL350 へ上昇せよ」への応答として正しいのは？", "「FL350 へ上昇、翔洋 212」", new List<string> { "「了解」だけ", "「翔洋 212、FL250 へ上昇」" });
                case "deviation-detect":
                    {
                        double dAlt = Js.Round(SnapNum(snap, "altFt", Route.CruiseAltFt) - Route.CruiseAltFt);
                        double ias = SnapNum(snap, "ias", 0), vs = SnapNum(snap, "vsFpm", 0);
                        string finding = null;
                        if (Math.Abs(dAlt) > 200) finding = $"高度が割当より {(dAlt > 0 ? "+" : "")}{(long)dAlt} ft 逸脱している";
                        else if (ias > 310) finding = $"速度が {(long)Js.Round(ias)} kt で制限を超えている";
                        else if (Math.Abs(vs) > 300) finding = $"昇降率が {(long)Js.Round(vs)} fpm で巡航中として異常";
                        string correct = finding ?? "逸脱なし。このまま監視を続ける";
                        var decoys = new List<string> { "高度が割当より +500 ft 逸脱している", "速度が 250 kt で遅すぎる", "逸脱なし。このまま監視を続ける" };
                        decoys.RemoveAll(d => d == correct); decoys = decoys.GetRange(0, Math.Min(2, decoys.Count));
                        return WithChoices("モニター中。いま制限・割当を超えているのは？", correct, decoys);
                    }
                case "speed-read":
                    {
                        double mach = SnapNum(snap, "mach", 0.78); long ias = (long)Js.Round(SnapNum(snap, "ias", 250));
                        return WithChoices("速度の読み上げ確認。現在の表示として正しいのは？",
                            $"IAS {ias} kt、マッハ {mach.ToString("F2", CultureInfo.InvariantCulture)}", new List<string> { $"IAS {ias + 20} kt、マッハ {mach.ToString("F2", CultureInfo.InvariantCulture)}", $"IAS {ias} kt、マッハ {(mach + 0.03).ToString("F2", CultureInfo.InvariantCulture)}" });
                    }
                case "heading-read":
                    {
                        double hv = SnapNum(snap, "headingDeg", 90);
                        long hdg = (long)Js.Round(((hv % 360) + 360) % 360); if (hdg == 0) hdg = 360;
                        long plus = hdg + 10 > 360 ? hdg - 350 : hdg + 10, minus = hdg - 10 < 1 ? hdg + 350 : hdg - 10;
                        return WithChoices("針路の確認。現在の針路の読み上げとして正しいのは？",
                            $"「針路 {hdg.ToString("D3")}」", new List<string> { $"「針路 {plus.ToString("D3")}」", $"「針路 {minus.ToString("D3")}」" });
                    }
                case "descent-plan":
                    {
                        double loseFt = Route.CruiseAltFt - 3000; long nm = (long)Js.Round(loseFt / 1000 * 3); long km = (long)Js.Round(nm * 1.852);
                        return WithChoices($"降下計画：巡航高度から 3,000 ft まで、3:1 の割合で降りる。降下開始点（TOD）は目的地の何 km 手前？",
                            $"約 {km} km 手前", new List<string> { $"約 {(long)Js.Round(km * 0.6)} km 手前", $"約 {(long)Js.Round(km * 1.5)} km 手前" });
                    }
                case "fuel-check":
                    {
                        double fuelKg = 1800 + Math.Floor(R.Next() * 15) * 150, burn = 40 + Math.Floor(R.Next() * 6);
                        long enduranceMin = (long)(Math.Floor(fuelKg / burn / 5) * 5);
                        return WithChoices($"燃料の確認：残燃料 {(long)fuelKg} kg、消費率 {(long)burn} kg/分。このまま飛べる時間（5分単位で切り捨て）は？",
                            $"約 {enduranceMin} 分", new List<string> { $"約 {enduranceMin + 20} 分", $"約 {Math.Max(5, enduranceMin - 20)} 分" });
                    }
                case "vs-read":
                    {
                        long vs = (long)(Js.Round(SnapNum(snap, "vsFpm", -1800) / 100) * 100);
                        return WithChoices("降下率の読み上げ確認。現在の降下率として正しいのは？", $"{vs} fpm", new List<string> { $"{vs + 500} fpm", $"{vs - 500} fpm" });
                    }
                case "config-call":
                    return WithChoices("最終進入で着陸形態にする順序として正しいのは？", "フラップ15 → 40、Vref+5 で進入", new List<string> { "フラップ40 → 一気に UP へ戻す", "ギアを上げたままフラップ40" });
                default:
                    return WithChoices("モニターを続ける", "監視を続ける", new List<string> { "操縦を交代する", "チェックリストを最初からやり直す" });
            }
        }
        static double SnapNum(Dict snap, string key, double dflt)
        {
            // JS reads these as (snap.x || default): 0 and NaN are falsy too
            if (snap != null && snap.TryGetValue(key, out var v) && v is double d && d != 0 && !double.IsNaN(d)) return d;
            return dflt;
        }

        void Enter(string phase)
        {
            Phase = phase; PhaseT = 0;
            Emit(new Dict { { "type", "phase" }, { "to", phase } });
            if (phase == "cruise" && ScheduledEvent != null && ScheduledEvent.Kind == "turbulence" && !EventFired) FireEvent();
            if (phase == "descent" && ScheduledEvent != null && ScheduledEvent.Kind != "turbulence" && !EventFired) FireEvent();
            if (phase == "ride") IssueTask(true);
        }
        void FireEvent()
        {
            EventFired = true;
            Emit(new Dict { { "type", "event" }, { "event", ScheduledEvent } });
        }
        string NextTemplate()
        {
            if (tplPool == null || tplPool.Count == 0) tplPool = Shuffled(CadetLineData.PmTaskTemplates.ConvertAll(t => t.Id));
            string id = tplPool.Find(x => !usedTemplates.Contains(x)) ?? tplPool[0];
            usedTemplates.Add(id);
            return id;
        }
        PmTask IssueTask(bool first = false)
        {
            if (Phase != "ride" || TasksIssued >= CadetLineData.PmTasksPerRide) return null;
            if (!first && T - lastTaskT < 15) return null;
            if (Tasks.Exists(t => !t.Answered)) return null;
            string tplId = NextTemplate();
            var gt = GenTask(tplId, lastSnap);
            var task = new PmTask { Id = $"pm-{++taskSeq}", TemplateId = gt.TemplateId, Title = gt.Title, Prompt = gt.Prompt, Choices = gt.Choices, CorrectIndex = gt.CorrectIndex };
            Tasks.Add(task); TasksIssued++; lastTaskT = T;
            Emit(new Dict { { "type", "task" }, { "task", task } });
            return task;
        }

        static int ChoiceIndex(List<string> choices, object choice)
        {
            if (choice is double n && !double.IsNaN(n) && !double.IsInfinity(n)) return (int)n;
            if (choice is string s)
            {
                if (s.Length == 1 && ((s[0] >= 'a' && s[0] <= 'z') || (s[0] >= 'A' && s[0] <= 'Z'))) return char.ToLower(s[0]) - 'a';
                int i = choices.IndexOf(s); if (i >= 0) return i;
            }
            if (choice is Dict cd && cd.TryGetValue("index", out var iv) && iv is double idn) return (int)idn;
            return -1;
        }

        public Dict AnswerDispatch(object choice)
        {
            if (Phase != "dispatch" || Dispatch != null) return null;
            int idx = ChoiceIndex(DispatchCase.Choices, choice);
            if (idx < 0 || idx >= DispatchCase.Choices.Count) return null;
            bool correct = idx == DispatchCase.CorrectIndex;
            Dispatch = (idx, correct, correct ? 1 : 0);
            Emit(new Dict { { "type", "dispatch" }, { "choice", (double)idx }, { "correct", correct } });
            if (correct && !DispatchCase.CorrectGo) { NoGo = true; Enter("debrief"); }
            else Enter(isPM ? "ride" : "depart");
            return new Dict { { "ok", true }, { "correct", correct }, { "noGo", NoGo }, { "phase", Phase } };
        }
        public Dict AnswerEvent(object choice)
        {
            var ev = ScheduledEvent;
            if (ev == null || !EventFired || EventAnswer != null) return null;
            int idx = ChoiceIndex(ev.Choices, choice);
            if (idx < 0 || idx >= ev.Choices.Count) return null;
            double score = ev.Scores[idx];
            EventAnswer = (idx, score);
            Emit(new Dict { { "type", "eventAnswer" }, { "choice", (double)idx }, { "score", score } });
            if (ev.Kind == "weather")
            {
                if (idx == 0) { Diverted = true; Destination = AlternateField; DistDestM = Math.Sqrt(Math.Pow(Destination0.N - AlternateField.N, 2) + Math.Pow(Destination0.E - AlternateField.E, 2)); Emit(new Dict { { "type", "divert" }, { "to", AlternateField.Id }, { "distDestM", Js.Round(DistDestM) } }); }
                else if (idx == 1) Holding = true;
                else PressedOn = true;
            }
            if (ev.Kind == "hold") Holding = true;
            return new Dict { { "ok", true }, { "score", score }, { "diverted", Diverted }, { "destination", Destination.Id }, { "phase", Phase } };
        }
        public Dict Answer(string taskId, object choice)
        {
            if (taskId == DispatchCase.Id) return AnswerDispatch(choice);
            if (ScheduledEvent != null && taskId == ScheduledEvent.Id) return AnswerEvent(choice);
            var task = Tasks.Find(t => t.Id == taskId || t.TemplateId == taskId);
            if (task == null || task.Answered || Phase != "ride") return null;
            int idx = ChoiceIndex(task.Choices, choice);
            if (idx < 0 || idx >= task.Choices.Count) return null;
            task.Answered = true; task.Choice = idx; task.Correct = idx == task.CorrectIndex;
            if (task.Correct == true) TasksCorrect++;
            Emit(new Dict { { "type", "taskAnswer" }, { "id", task.Id }, { "correct", task.Correct.Value } });
            return new Dict { { "ok", true }, { "correct", task.Correct.Value }, { "phase", Phase } };
        }

        public Dict Compress()
        {
            if (isPM || Phase != "cruise") return new Dict { { "compressRequested", false }, { "reason", "notInCruise" } };
            if (ScheduledEvent != null && EventFired && EventAnswer == null) return new Dict { { "compressRequested", false }, { "reason", "eventPending" } };
            double todDistM = Js.Round((Route.CruiseAltFt - 3000) / 1000 * 3 * 1852);
            double fromDistM = Js.Round(DistDestM);
            double skippedM = Math.Max(0, fromDistM - todDistM);
            double elapsedMin = R1(skippedM / 1000 / 833.4 * 60);
            var plan = new Dict { { "compressRequested", true }, { "fromDistM", fromDistM }, { "toDistDestM", todDistM }, { "distDestM", todDistM }, { "skippedM", skippedM }, { "fuelUsedKg", Js.Round(elapsedMin * 43) }, { "elapsedMin", elapsedMin }, { "atAltFt", Route.CruiseAltFt } };
            CompressRequested = true; Compression = plan; DistDestM = todDistM;
            Enter("descent");
            return plan;
        }

        static double ScoreTouchdown(Dict td)
        {
            double sinkFpm = MiniJson.Num(td, "sinkFpm");
            double sinkScore;
            if (sinkFpm <= 300) sinkScore = 1;
            else if (sinkFpm <= 600) sinkScore = 1 - (sinkFpm - 300) / 300 * 0.5;
            else if (sinkFpm <= 1000) sinkScore = 0.5 - (sinkFpm - 600) / 400 * 0.5;
            else sinkScore = 0;
            double? alongScore = null, crossScore = null;
            if (td.TryGetValue("alongM", out var av) && av != null) { double a = N(av); alongScore = (a >= 200 && a <= 700) ? 1 : (a >= 0 && a <= 1200) ? 0.5 : 0; }
            if (td.TryGetValue("crossM", out var cv) && cv != null) { double a = Math.Abs(N(cv)); crossScore = a <= 5 ? 1 : a <= 15 ? 0.6 : a <= 30 ? 0.3 : 0; }
            double num = sinkScore * 0.5, den = 0.5;
            if (alongScore != null) { num += alongScore.Value * 0.3; den += 0.3; }
            if (crossScore != null) { num += crossScore.Value * 0.2; den += 0.2; }
            return Js.Round(num / den * 100);
        }
        void RecordTouchdown(Dict obs)
        {
            var air = lastAir ?? new Dict();
            double sinkSrc = air.TryGetValue("vsFpm", out var av) && av != null ? N(av) : (obs.TryGetValue("vsFpm", out var ov) && ov != null ? N(ov) : 600);
            double sinkFpm = Js.Round(Math.Abs(sinkSrc));
            object alongObj = obs.TryGetValue("tdAlongM", out var t1) && t1 != null ? t1 : (obs.TryGetValue("alongM", out var t2) ? t2 : null);
            object crossObj = obs.TryGetValue("tdCrossM", out var t3) && t3 != null ? t3 : (obs.TryGetValue("crossM", out var t4) ? t4 : null);
            double? alongM = alongObj != null ? N(alongObj) : (double?)null;
            double? crossM = crossObj != null ? N(crossObj) : (double?)null;
            if ((alongM == null || crossM == null) && obs.TryGetValue("n", out var nv) && nv != null && obs.TryGetValue("e", out var evv) && evv != null)
            {
                double h = Destination.TrueHdg * Math.PI / 180, dn = N(nv) - Destination.N, de = N(evv) - Destination.E;
                double along = dn * Math.Cos(h) + de * Math.Sin(h), cross = -dn * Math.Sin(h) + de * Math.Cos(h);
                if (alongM == null) alongM = Js.Round(along + Destination.Len / 2);
                if (crossM == null) crossM = Js.Round(cross * 10) / 10;
            }
            Touchdown = new Dict { { "sinkFpm", sinkFpm }, { "alongM", alongM.HasValue ? (object)alongM.Value : null }, { "crossM", crossM.HasValue ? (object)crossM.Value : null }, { "at", Destination.Id } };
            LandingScore = ScoreTouchdown(Touchdown);
            // JS emits { type:'touchdown', ...touchdown, landingScore } — key order: type first
            var ordered = new Dict { { "type", "touchdown" }, { "sinkFpm", sinkFpm }, { "alongM", Touchdown["alongM"] }, { "crossM", Touchdown["crossM"] }, { "at", Destination.Id }, { "landingScore", LandingScore.Value } };
            Emit(ordered);
        }

        public class Obs
        {
            public double? T, AltFt, Ias, Mach, VsFpm, HeadingDeg, DistDestM, N, E, TdAlongM, TdCrossM, AlongM, CrossM;
            public bool? OnGround, Stopped;
            public bool BriefDone, Arrived;
            public string EventStr;
            public Dict ToDict()
            {
                var d = new Dict();
                void Put(string k, double? v) { if (v.HasValue) d[k] = v.Value; }
                Put("t", T); Put("altFt", AltFt); Put("ias", Ias); Put("mach", Mach); Put("vsFpm", VsFpm); Put("headingDeg", HeadingDeg); Put("distDestM", DistDestM); Put("n", N); Put("e", E); Put("tdAlongM", TdAlongM); Put("tdCrossM", TdCrossM); Put("alongM", AlongM); Put("crossM", CrossM);
                if (OnGround.HasValue) d["onGround"] = OnGround.Value;
                if (Stopped.HasValue) d["stopped"] = Stopped.Value;
                if (BriefDone) d["briefDone"] = true;
                if (Arrived) d["arrived"] = true;
                if (EventStr != null) d["event"] = EventStr;
                return d;
            }
        }

        public List<Dict> Update(double dtIn, Dict obsIn)
        {
            double dt = dtIn; var obs = obsIn ?? new Dict();
            if (obs.TryGetValue("t", out var tv) && tv is double tn && !double.IsNaN(tn) && !double.IsInfinity(tn)) { if (dt == 0) dt = Math.Max(0, tn - T); T = tn; }
            else if (dt != 0) T += dt;
            PhaseT += dt;
            foreach (var kv in obs) lastSnap[kv.Key] = kv.Value;
            if (obs.TryGetValue("distDestM", out var dv) && dv is double ddn && !double.IsNaN(ddn) && !double.IsInfinity(ddn)) DistDestM = ddn;
            if (obs.TryGetValue("altFt", out var av) && av != null) AltFt = N(av);
            bool ObsBool(string k) { return obs.TryGetValue(k, out var v) && v is bool b && b; }
            double? ObsNum(string k) { return obs.TryGetValue(k, out var v) && v != null ? N(v) : (double?)null; }

            switch (Phase)
            {
                case "brief": if (ObsBool("briefDone")) Enter("dispatch"); break;
                case "dispatch": break;
                case "depart": if (obs.TryGetValue("onGround", out var og1) && og1 is bool b1 && !b1) { Airborne = true; Enter("climb"); } break;
                case "climb":
                    if (obs.TryGetValue("onGround", out var og2) && og2 is bool b2 && !b2) Airborne = true;
                    if (ObsNum("altFt") is double ca && ca >= Route.CruiseAltFt * 0.9) Enter("cruise");
                    break;
                case "cruise":
                    if (ObsNum("altFt") is double cra && cra < Route.CruiseAltFt * 0.85) Enter("descent");
                    else if (DistDestM <= (Route.CruiseAltFt - 3000) / 1000 * 3 * 1852) Enter("descent");
                    break;
                case "descent":
                    if (ScheduledEvent != null && EventFired && EventAnswer == null) break;
                    if ((ObsNum("altFt") is double da && da <= 10000) || DistDestM <= 30000) Enter("approach");
                    break;
                case "ride":
                    {
                        bool arrivedNow = ObsBool("arrived") || (obs.TryGetValue("event", out var evs) && evs is string es && es == "arrival") || (ObsBool("onGround") && ObsBool("stopped"));
                        if (ScheduledEvent != null && !EventFired && TasksIssued >= 2) FireEvent();
                        if (arrivedNow) { Arrived = true; Enter("debrief"); break; }
                        IssueTask(false);
                        break;
                    }
                default: break;
            }
            if (!isPM && Phase != "brief" && Phase != "dispatch" && Phase != "debrief")
            {
                bool hasGround = obs.TryGetValue("onGround", out var ogv) && ogv is bool;
                bool ogb = hasGround && (bool)ogv;
                if (hasGround && !ogb) { Airborne = true; lastAir = obs; }
                else if (hasGround && ogb && Airborne && (Phase == "approach" || Phase == "descent"))
                {
                    RecordTouchdown(obs);
                    Airborne = false;
                    Enter("landed");
                    if (ObsBool("stopped")) Emit(new Dict { { "type", "stopped" } });
                }
                else if (Phase == "landed" && ObsBool("stopped")) Enter("debrief");
            }
            var outEvents = new List<Dict>(events); events.Clear();
            return outEvents;
        }
        public List<Dict> Update(Dict obs) { return Update(0, obs); }
        public List<Dict> Update(Obs obs) { return Update(0, obs.ToDict()); }

        public bool Advance()
        {
            if (Phase == "brief") { Enter("dispatch"); return true; }
            if (Phase == "landed") { Enter("debrief"); return true; }
            return false;
        }
        public bool Start() { return Advance(); }
        public bool ConfirmBrief() { return Advance(); }
        public PmTask CurrentTask() { return Tasks.Find(t => !t.Answered); }

        public Dict Summary()
        {
            var parts = new List<(double W, double Score)>();
            if (Dispatch != null) parts.Add((3, Dispatch.Value.Score));
            if (EventFired) parts.Add((2, EventAnswer != null ? EventAnswer.Value.Score : 0));
            double? decisionScore = null;
            if (parts.Count > 0) { double n = 0, dn = 0; foreach (var p in parts) { n += p.W * p.Score; dn += p.W; } decisionScore = Js.Round(n / dn * 100); }
            var rows = new Lst();
            if (Dispatch != null) rows.Add(new Dict { { "name", $"ディスパッチ判断（{DispatchCase.Title}）" }, { "val", DispatchCase.Choices[Dispatch.Value.Choice] }, { "std", DispatchCase.Choices[DispatchCase.CorrectIndex] }, { "pass", Dispatch.Value.Correct } });
            if (EventFired) rows.Add(new Dict { { "name", $"飛行中の判断（{ScheduledEvent.Title}）" }, { "val", EventAnswer != null ? (object)ScheduledEvent.Choices[EventAnswer.Value.Choice] : "無回答" }, { "std", ScheduledEvent.Choices[ScheduledEvent.CorrectIndex] }, { "pass", EventAnswer != null && EventAnswer.Value.Score >= 1 } });
            var head = new Dict
            {
                { "kind", "line" }, { "role", Role }, { "route", Route.Id }, { "from", Route.From }, { "to", Route.To },
                { "destination", Destination.Id }, { "alternate", Route.Alternate }, { "diverted", Diverted },
                { "captain", new Dict { { "id", Captain.Id }, { "name", Captain.Name }, { "style", Captain.Style }, { "strict", Captain.Strict } } },
                { "phase", Phase }, { "done", Phase == "debrief" }, { "noGo", NoGo },
                { "decisionScore", decisionScore.HasValue ? (object)decisionScore.Value : null }, { "rows", rows },
            };
            if (isPM)
            {
                double taskScore = Js.Round((double)TasksCorrect / CadetLineData.PmTasksPerRide * 100);
                rows.Add(new Dict { { "name", "PM モニタータスク" }, { "val", $"{TasksCorrect} / {CadetLineData.PmTasksPerRide} 正解" }, { "std", "タスク列の正答率" }, { "pass", TasksCorrect >= CadetLineData.PmTasksPerRide * 0.6 } });
                double raw = decisionScore == null ? taskScore : taskScore * 0.6 + decisionScore.Value * 0.4;
                double total = Clamp(Js.Round(raw * Captain.Strict), 0, 100);
                head["taskScore"] = taskScore; head["tasksCorrect"] = (double)TasksCorrect; head["tasksTotal"] = (double)CadetLineData.PmTasksPerRide; head["total"] = total; head["grade"] = CadetLineData.GradeOf(total);
                return head;
            }
            if (Touchdown != null)
            {
                double sinkFpm = MiniJson.Num(Touchdown, "sinkFpm");
                string alongPart = Touchdown["alongM"] != null ? $"・接地 {FmtNum(MiniJson.Num(Touchdown, "alongM"))} m" : "";
                string crossPart = Touchdown["crossM"] != null ? $"・センターライン {FmtNum(MiniJson.Num(Touchdown, "crossM"))} m" : "";
                rows.Add(new Dict { { "name", $"{Touchdown["at"]} への接地" }, { "val", $"沈下 {FmtNum(sinkFpm)} fpm{alongPart}{crossPart}" }, { "std", "接地帯 200〜700 m・沈下 300 fpm 以下" }, { "pass", LandingScore >= 65 } });
            }
            double rawPf = LandingScore == null ? (decisionScore ?? 0) : LandingScore.Value * 0.6 + (decisionScore ?? 0) * 0.4;
            double totalPf = Clamp(Js.Round(rawPf * Captain.Strict), 0, 100);
            head["landingScore"] = LandingScore.HasValue ? (object)LandingScore.Value : null;
            head["touchdown"] = Touchdown;
            head["total"] = totalPf; head["grade"] = CadetLineData.GradeOf(totalPf);
            return head;
        }
        static string FmtNum(double v)
        {
            if (v == Math.Floor(v) && Math.Abs(v) < 1e15) return ((long)v).ToString(CultureInfo.InvariantCulture);
            return v.ToString("0.################", CultureInfo.InvariantCulture);
        }

        /// <summary>lineBrief(route): the briefing card's numbers for a route.</summary>
        public static Dict LineBrief(object route)
        {
            var rt = CadetLineData.ResolveRoute(route);
            Dict F(LineAirfield a) { return a == null ? null : new Dict { { "id", a.Id }, { "name", a.Name }, { "n", a.N }, { "e", a.E }, { "rwy", a.Rwy }, { "trueHdg", a.TrueHdg }, { "len", a.Len }, { "wid", a.Wid }, { "elevFt", a.ElevFt }, { "controlled", a.Controlled }, { "surface", a.Surface }, { "pattern", null } }; }
            Dict R(LineRoute r) { return new Dict { { "id", r.Id }, { "from", r.From }, { "to", r.To }, { "distKm", r.DistKm }, { "blockMin", r.BlockMin }, { "cruiseFL", r.CruiseFL }, { "cruiseAltFt", r.CruiseAltFt }, { "tripFuelKg", r.TripFuelKg }, { "alternate", r.Alternate } }; }
            return new Dict { { "route", R(rt) }, { "from", F(CadetLineData.AirfieldById(rt.From)) }, { "to", F(CadetLineData.AirfieldById(rt.To)) }, { "alternate", F(CadetLineData.AirfieldById(rt.Alternate)) }, { "cruiseAltFt", rt.CruiseAltFt } };
        }
    }
}
