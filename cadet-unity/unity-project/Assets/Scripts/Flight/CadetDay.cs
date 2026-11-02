// CADET — CadetDay.cs : cadet/src/career/day.js ported (createDay) — a
// flying day from the walk-around to the logbook: ground checklists that
// tick themselves, the scripted radio with its clearance state underneath,
// the run-up watch (and the magneto fault decision), the lessons slotted
// between the moves, the debrief summary. Pure logic.
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public class DayFault { public string Kind; public bool Asked; public int Tries; public string Decided; public double Drop; }
    public class DayAtcState
    {
        public string AtisCopied = "", AtisCurrent = "";
        public bool Taxi, Lineup, Takeoff, Landing, FreqChange, Closed, StaleAtis;
        public int NoClearTakeoff, NoClearLanding, TrafficGA;
        public List<string> NearMiss = new List<string>();
    }
    public class DayLessonStatus
    {
        public double T, Score;
        public bool Crashed, Done, Passed;
        public string Grade, Reason, CrashReason, Exit;
        public Analysis.AnalysisResult Analysis;
        public List<StepResult> Results;
    }
    public class DayOpts
    {
        public uint Seed = 1;
        public string Level = "basic";
        public List<string> Anomalies;
        public (double a, double c) Stand = (636.5, 207.6);
        public DayPlan Plan;
        public RadioContent.DayWeather Weather = new RadioContent.DayWeather();
        public double? Qnh;
        public string Fault;
        public bool ElecFault;
    }

    public class Day
    {
        // taxi.js constants the day's place checks use
        public const double HOLD_C = 37, A1_A = 17.5;
        public static readonly (double a, double c) HOLD_STOP = (17.5, 44.5);

        static readonly string[] INFO_WORDS = { "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliett", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "Xray", "Yankee", "Zulu" };
        static double W180(double a) { return ((a % 360) + 540) % 360 - 180; }

        public readonly Radio Radio;
        public readonly AtcRunner Atc;
        public readonly Walkaround Walk;
        public readonly DayPlan Plan;
        public readonly List<string> Steps;
        public readonly double Qnh;

        public string Phase = "walk";
        public int StepIdx;
        public string ListId;
        public int I;
        public readonly List<Dict> Flown = new List<Dict>();
        public readonly List<string> Ticked = new List<string>();
        public readonly List<string> Skipped = new List<string>();
        public readonly RunupMemo Memo = new RunupMemo();
        public readonly Dictionary<string, Dict> Lessons = new Dictionary<string, Dict>();
        public bool Incursion, OverHold, Started, ShutdownDone;
        public string Exit = "", Crash = "", Transit = "skip";
        public string StopAt;
        public double T, AirT, BlockT, Trust;
        public readonly List<string> Notes = new List<string>();
        public int AutoList, AutoTaxi;
        public readonly List<string> LeftOn = new List<string>();
        public DayFault Fault;
        public Lst PreflightEffects = new Lst();
        public bool ElecFaultDay;
        public readonly DayAtcState AtcState = new DayAtcState();
        bool _og = true, _lWarn, _atisAdvanced;
        string _flownLevel;
        readonly List<Dict> _events = new List<Dict>();
        readonly (double a, double c) _stand;
        readonly Dictionary<string, CList> _checklists;

        public Day(WalkKit archerKit, WalkKit seminoleKit, DayOpts o)
        {
            o = o ?? new DayOpts();
            Plan = o.Plan ?? new DayPlan { Main = "a2", Lessons = new List<string> { "t1", "a2", "t3" }, Aircraft = "pa28" };
            _flownLevel = o.Level == "intro" || o.Level == "basic" || o.Level == "precision" ? o.Level : "basic";
            RadioContent.SetCall(Plan.Aircraft ?? "pa28");
            Steps = DayPlanLib.StepsFor(Plan.Lessons, Plan.Ctaf);
            string intent = "pattern";
            foreach (var id in Plan.Lessons) if (DayPlanLib.StartKind(id) == "area") { intent = "area"; break; }
            var L1 = School.StartLesson(Plan.Lessons[0], "intro");
            double windMag = 10, windKt = 5;
            var m = Regex.Match(L1.WindStr ?? "", @"^(\d+) at (\d+)$");
            if (m.Success) { windMag = double.Parse(m.Groups[1].Value); windKt = double.Parse(m.Groups[2].Value); }
            Qnh = o.Qnh ?? o.Weather.Qnh;
            var w = new RadioContent.DayWeather
            {
                WindMag = windMag, WindKt = windKt, Qnh = Qnh, TempC = o.Weather.TempC, DewC = o.Weather.DewC,
                Zulu = o.Weather.Zulu, Info = o.Weather.Info, Intent = intent, Solo = Plan.Solo && !Plan.Xc, Xc = Plan.Xc, Ifr = o.Weather.Ifr, Runway = o.Weather.Runway,
            };
            Radio = RadioContent.DayRadio(w);
            if (Plan.Ctaf)
            {
                var c = RadioContent.CtafRadio();
                foreach (var kv in c.Exchanges) Radio.Exchanges[kv.Key] = kv.Value;
                foreach (var kv in c.Sequences) Radio.Sequences[kv.Key] = kv.Value;
            }
            Atc = new AtcRunner(Radio, o.Seed);
            string aircraft = Plan.Aircraft ?? "pa28";
            _checklists = aircraft == "pa44" ? CareerChecklists.SEMINOLE : aircraft == "b737" ? CareerChecklists.JET : CareerChecklists.ARCHER;
            var kit = aircraft == "pa44" ? seminoleKit : archerKit;
            Walk = new Walkaround(kit, Walkaround.Plant(kit, o.Seed, o.Anomalies));
            _stand = o.Stand;
            Fault = o.Fault == "mag" ? new DayFault { Kind = "mag" } : o.Fault != null ? new DayFault { Kind = o.Fault } : null;
            ElecFaultDay = o.ElecFault;
            AtcState.AtisCurrent = w.Info;
            ListId = Info(Phase).list;
        }

        public string Level { get { return _flownLevel; } }
        public void SetLevel(string lv) { if (lv == "intro" || lv == "basic" || lv == "precision") _flownLevel = lv; }
        public string Label { get { return Info(Phase).label; } }

        public (string label, string list, string radio, string place, string move, string lesson, bool soft) Info(string id)
        {
            if (id != null && DayPlanLib.STEPS.TryGetValue(id, out var sd)) return (sd.Label, sd.List, sd.Radio, sd.Place, sd.Move, null, sd.Soft);
            var def = id != null ? Syllabus.Lesson(id) : null;
            return ($"課目 {id}：{(def != null ? def.Title : id)}", null, null, null, null, id, false);
        }

        void Emit(Dict e) { _events.Add(e); }
        void AdvanceAtis()
        {
            var A = AtcState; if (_atisAdvanced) return; _atisAdvanced = true;
            int i = Array.IndexOf(INFO_WORDS, A.AtisCurrent); if (i < 0) return;
            A.AtisCurrent = INFO_WORDS[(i + 1) % INFO_WORDS.Length];
            if (A.AtisCopied != "" && A.AtisCopied != A.AtisCurrent && !A.StaleAtis)
            {
                A.StaleAtis = true;
                Emit(new Dict { { "type", "atc" }, { "kind", "staleAtis" }, { "en", $"{Radio.CallShort}, LAB Tower, information {A.AtisCurrent} is now current. Verify you have {A.AtisCurrent}." } });
            }
        }
        public Dict ListenAtis()
        {
            var A = AtcState; A.AtisCopied = A.AtisCurrent;
            string en = Radio.AtisText
                .Replace($"information {Radio.WeatherInfo}", $"information {A.AtisCurrent}")
                .Replace($"have information {Radio.WeatherInfo}", $"have information {A.AtisCurrent}");
            return new Dict { { "en", en }, { "letter", A.AtisCurrent } };
        }
        void Enter(string phase, int? k0 = null)
        {
            int k;
            if (k0 != null) k = k0.Value;
            else { k = Steps.IndexOf(phase, StepIdx + 1); if (k < 0) k = Steps.IndexOf(phase); }
            string from = Phase; Phase = phase; StepIdx = k;
            var ph = Info(phase);
            ListId = ph.list; I = 0;
            if (phase == "back") AdvanceAtis();
            if (ph.radio != null) Atc.Start(ph.radio, phase == "exit" || phase == "groundIn" ? Exit : null);
            Emit(new Dict { { "type", "phase" }, { "from", from }, { "to", phase } });
        }
        CList List() { return ListId != null && _checklists.TryGetValue(ListId, out var c) ? c : null; }
        public Dict Items()
        {
            var C = List(); if (C == null) return null;
            var items = new Lst();
            for (int k = 0; k < C.Items.Count; k++)
            {
                var it = C.Items[k];
                items.Add(new Dict { { "name", it.Name }, { "what", it.What }, { "confirm", it.Test == null }, { "ctl", it.Ctl }, { "note", it.Note }, { "ok", k < I }, { "cur", k == I } });
            }
            return new Dict { { "id", ListId }, { "title", C.Title }, { "i", (double)I }, { "items", items } };
        }
        void WatchRunup(DayCtx c, double dt)
        {
            var m = Memo; double rpm = c.Rpm;
            if (Phase != "runup" || dt == 0) return;
            bool steady = m.Prev != null && Math.Abs(rpm - m.Prev.Value) / dt < 25 && m.PrevMag == c.Sw.Mag && m.PrevCarb == c.Sw.CarbHeat;
            m.Prev = rpm; m.PrevMag = c.Sw.Mag; m.PrevCarb = c.Sw.CarbHeat;
            m.SteadyT = steady ? m.SteadyT + dt : 0;
            if (c.Sw.Mag == "BOTH" && !c.Sw.CarbHeat && rpm > 1850 && m.SteadyT > 0.3) m.Both = rpm;
            void Hold(string key, bool on, Action<double> set)
            {
                double h = on && m.Both > 0 && m.SteadyT > 0.3 ? (key == "L" ? m.HoldL : key == "R" ? m.HoldR : m.HoldC) + dt : 0;
                if (key == "L") m.HoldL = h; else if (key == "R") m.HoldR = h; else m.HoldC = h;
                if (h > 0.4) set(Js.Round(m.Both - rpm));
            }
            Hold("L", c.Sw.Mag == "L", v => m.DropL = v);
            Hold("R", c.Sw.Mag == "R", v => m.DropR = v);
            Hold("C", c.Sw.CarbHeat && c.Sw.Mag == "BOTH", v => m.Carb = v);
            if (rpm > 300 && rpm < 820 && m.Both > 0) m.Idle = true;
        }
        void Tick(DayCtx c)
        {
            var C = List(); if (C == null) return;
            while (I < C.Items.Count)
            {
                var it = C.Items[I];
                if (it.Test == null || !it.Test(c)) break;
                Ticked.Add($"{ListId}:{I}"); I++;
                Emit(new Dict { { "type", "tick" }, { "list", ListId }, { "i", (double)(I - 1) } });
            }
        }
        DayCtx Prep(DayCtx c) { c.Memo = Memo; c.Walk = true; c.Qnh = Qnh; return c; }
        public bool Confirm(DayCtx c)
        {
            Prep(c); Tick(c);
            var C = List(); if (C == null || I >= C.Items.Count) return false;
            var it = C.Items[I];
            if (it.Test != null) return false;
            Ticked.Add($"{ListId}:{I}"); I++;
            Emit(new Dict { { "type", "tick" }, { "list", ListId }, { "i", (double)(I - 1) }, { "confirmed", true } });
            Tick(c);
            return true;
        }
        public bool Assist(DayCtx c)
        {
            Prep(c);
            var C = List(); if (C == null || I >= C.Items.Count) return false;
            var it = C.Items[I];
            if (it.Test == null) { AutoList++; return Confirm(c); }
            if (it.Set != null) it.Set(c);
            AutoList++;
            return true;
        }
        bool ListDone() { var C = List(); return C == null || I >= C.Items.Count; }
        bool At(string where, DayCtx c)
        {
            var p = c.Pos; double v = c.V, h = c.Hdg;
            if (where == "hold") return Math.Sqrt((p.a - HOLD_STOP.a) * (p.a - HOLD_STOP.a) + (p.c - HOLD_STOP.c) * (p.c - HOLD_STOP.c)) < 7 && v < 0.3;
            if (where == "lineup") return p.a > 10 && p.a < 150 && Math.Abs(p.c) < 4 && Math.Abs(W180(h - FlightPhysics.LAB_RWY.TrueHdg)) < 10 && v < 1.0;
            if (where == "clear") return p.c > HOLD_C + 2 && v < 0.5;
            if (where == "stand") return Math.Sqrt((p.a - _stand.a) * (p.a - _stand.a) + (p.c - _stand.c) * (p.c - _stand.c)) < 4 && v < 0.2;
            return false;
        }

        public List<Dict> Update(DayCtx c)
        {
            double dt = c.Dt; T += dt;
            Prep(c);
            if (c.Sys != null && c.Sys.Running && Info(Phase).lesson == null) { Started = true; BlockT += dt; if (c.OnGround == false) AirT += dt; }
            if ((Phase == "taxiOut" || Phase == "runup" || Phase == "tower") && c.Pos.c < HOLD_C - 0.5 && c.Pos.a < A1_A + 30 && !Incursion)
            {
                Incursion = true; Trust -= 8; Emit(new Dict { { "type", "incursion" } });
            }
            WatchRunup(c, dt);
            var F = Fault;
            if (F != null && F.Decided == null && !F.Asked && Phase == "runup" && Memo.DropL > Systems.RUNUP.MaxDrop)
            {
                F.Asked = true; F.Drop = Memo.DropL;
                Emit(new Dict { { "type", "fault" }, { "kind", F.Kind }, { "drop", F.Drop }, { "tries", (double)F.Tries } });
            }
            foreach (var e in Atc.Update(dt))
            {
                if (e.Type == "done")
                {
                    var A = AtcState;
                    if (e.Seq == "atis") A.AtisCopied = A.AtisCurrent;
                    else if (e.Seq == "ground") A.Taxi = true;
                    else if (e.Seq == "tower") A.Lineup = true;
                    else if (e.Seq == "takeoff" || e.Seq == "stopgo") A.Takeoff = true;
                    else if (e.Seq == "final") A.Landing = true;
                    else if (e.Seq == "leave") A.FreqChange = true;
                    else if (e.Seq == "closed") A.Closed = true;
                }
                var d = new Dict { { "type", "radio" }, { "kind", e.Type } };
                if (e.Who != null) d["who"] = e.Who;
                if (e.En != null) d["en"] = e.En;
                if (e.Seq != null) d["seq"] = e.Seq;
                Emit(d);
            }
            if (c.OnGround != null && Info(Phase).lesson != null) _og = c.OnGround.Value;
            if (c.OnGround != null && Info(Phase).lesson == null)
            {
                var A = AtcState;
                if (_og && c.OnGround == false)
                {
                    if (!A.Takeoff) { A.NoClearTakeoff++; Trust -= 4; Emit(new Dict { { "type", "atc" }, { "kind", "noClearTakeoff" }, { "en", $"{Radio.CallShort}, LAB Tower, you departed without a takeoff clearance." } }); }
                    A.Takeoff = false; _lWarn = false;
                }
                if (!_og && c.OnGround == true) A.Landing = false;
                if (c.OnGround == false && c.Pos.a < -250 && c.Pos.a > -3200 && Math.Abs(c.Pos.c) < 80 && !A.Landing && !_lWarn
                    && (Phase == "return" || Phase == "pattern" || Phase == "recycle" || Phase == "transit"))
                {
                    _lWarn = true; A.NoClearLanding++; Trust -= 3;
                    Emit(new Dict { { "type", "atc" }, { "kind", "noClearLanding" }, { "en", $"{Radio.CallShort}, LAB Tower, go around, you have no landing clearance." } });
                }
                _og = c.OnGround.Value;
            }
            var ph = Info(Phase);
            if (ph.list != null) Tick(c);
            if (F != null && F.Asked && F.Decided == null && Phase == "runup") return Drain();
            if (ph.radio != null) { if (!Atc.Busy) Next(); }
            else if (ph.place != null) { if (At(ph.place, c) && (ph.list == null || ph.soft || ListDone())) Next(); }
            else if (ph.list != null) { if (ListDone()) Next(); }
            return Drain();
        }
        List<Dict> Drain() { var r = new List<Dict>(_events); _events.Clear(); return r; }

        public void Next()
        {
            if (StepIdx + 1 >= Steps.Count) return;
            string to = Steps[StepIdx + 1];
            if (Phase == "taxiIn" && ListId == "after_landing" && _checklists.TryGetValue("after_landing", out var cl) && I < cl.Items.Count) LeftOn.Add("after_landing");
            Enter(to, StepIdx + 1);
        }
        public void Boarded()
        {
            if (Phase == "walk") { PreflightEffects = Walk.Consequences(); Walk.Settle(); Enter("prestart"); }
        }
        public void LessonEnded(string id, DayLessonStatus status)
        {
            if (Phase != id) return;
            if (status.T > 0) { BlockT += status.T; AirT += status.T; }
            bool forced = status.Crashed && status.Done && status.Passed;
            var rows = new Lst();
            if (status.Results != null) foreach (var r in status.Results)
            {
                var rl = new Lst();
                foreach (var x in r.Rows) { var rd = new Dict { { "step", r.Step }, { "name", x.Name }, { "val", x.Val }, { "std", x.Std }, { "pass", x.Pass } }; if (x.Score != null) rd["score"] = x.Score.Value; rl.Add(rd); }
                foreach (var x in rl) rows.Add(x);
            }
            var rec = new Dict
            {
                { "id", id }, { "title", Syllabus.Lesson(id)?.Title ?? id }, { "grade", status.Grade }, { "score", status.Score },
                { "passed", status.Passed }, { "t", status.T }, { "done", status.Done },
                { "ana", status.Analysis != null ? Analysis.CompactAnalysis(status.Analysis) : null },
                { "crashed", status.Crashed && !forced }, { "forced", forced },
                { "end", DayPlanLib.EndKind(id) }, { "rows", rows },
            };
            if (status.Reason != null) rec["reason"] = status.Reason;
            Flown.Add(rec); Lessons[id] = rec;
            if (Js.Bool(rec, "crashed")) { Crash = status.Reason ?? status.CrashReason ?? "crash"; Enter("debrief"); return; }
            if ((string)rec["end"] == "stopped") Exit = status.Exit ?? "A2";
            Next();
        }
        public void LessonStarted(string id)
        {
            if (Info(Phase).move != null && StepIdx + 1 < Steps.Count && Steps[StepIdx + 1] == id) Next();
        }
        public string NextLesson()
        {
            for (int i = StepIdx + 1; i < Steps.Count; i++) if (!DayPlanLib.STEPS.ContainsKey(Steps[i])) return Steps[i];
            return null;
        }
        public void TransitFlown(string how) { Transit = how; }
        public string DecideFault(string arg)
        {
            var F = Fault; if (F == null || !F.Asked || F.Decided != null) return null;
            if (arg == "burn" && F.Tries < 1) { F.Tries++; F.Asked = false; Memo.DropL = 0; Memo.HoldL = 0; return "again"; }
            F.Decided = arg == "go" ? "go" : "return";
            Trust += F.Decided == "return" ? 3 : -5;
            Exit = "A1";
            Enter("taxiIn", Steps.IndexOf("taxiIn"));
            return F.Decided;
        }
        public void NoteTraffic(string kind, string w)
        {
            var A = AtcState;
            if (kind == "nearMiss") { if (!A.NearMiss.Contains(w)) A.NearMiss.Add(w); }
            else if (kind == "trafficGoAround") A.TrafficGA++;
        }
        public void DebriefRead() { if (Phase == "debrief") Enter("done"); }
        public void AbortTo(string phase) { if (Steps.Contains(phase)) Enter(phase, Steps.LastIndexOf(phase)); }

        Lst LessonsLst(List<Dict> lessons) { var l = new Lst(); foreach (var x in lessons) l.Add(x); return l; }
        Lst LeftOnLst() { var l = new Lst(); foreach (var x in LeftOn) l.Add(x); return l; }

        public Dict Summary()
        {
            var w = Walk.Summary();
            var r = Atc.Summary();
            var lessons = new List<Dict>();
            foreach (var l in Flown) lessons.Add(new Dict(l));
            double trust = Trust;
            trust += Js.Num(w, "found") * 2 - ((Lst)Js.Get(w, "missed")).Count * 3 - ((Lst)Js.Get(w, "tasksLeft")).Count * 2;
            trust += Js.Round(Js.Num(r, "first") / 2) - Js.Num(r, "wrong") - Js.Num(r, "late");
            int landings = 0;
            foreach (var l in lessons)
            {
                if (!Js.Bool(l, "done")) continue;
                trust += Js.Bool(l, "passed") ? (Js.Str(l, "grade") == "S" ? 2 : 1) : -1;
                if (!Js.Bool(l, "crashed") && Js.Str(l, "end") == "stopped") landings++;
            }
            if (AutoList > 6) trust -= 1;
            if (Crash != "") trust -= 6;
            var planD = new Dict
            {
                { "main", Plan.Main }, { "solo", Plan.Solo }, { "xc", Plan.Xc }, { "check", Plan.Check },
                { "aircraft", Plan.Aircraft ?? "pa28" }, { "lessons", new Lst() },
            };
            foreach (var x in Plan.Lessons) ((Lst)planD["lessons"]).Add(x);
            if (Plan.Ctaf) { planD["ctaf"] = true; planD["divertTo"] = Plan.DivertTo ?? "LABEF"; planD["xcVariant"] = Plan.XcVariant; }
            var atcD = new Dict
            {
                { "copied", AtcState.AtisCopied }, { "current", AtcState.AtisCurrent },
                { "noClearTakeoff", (double)AtcState.NoClearTakeoff }, { "noClearLanding", (double)AtcState.NoClearLanding },
                { "staleAtis", AtcState.StaleAtis }, { "nearMiss", new Lst() }, { "trafficGA", (double)AtcState.TrafficGA },
            };
            foreach (var x in AtcState.NearMiss) ((Lst)atcD["nearMiss"]).Add(x);
            return new Dict
            {
                { "walk", w }, { "radio", r }, { "lessons", LessonsLst(lessons) }, { "plan", planD }, { "solo", Plan.Solo },
                { "landings", (double)landings }, { "atcState", atcD }, { "incursion", Incursion },
                { "crash", Crash }, { "fault", Fault != null && Fault.Decided != null ? new Dict { { "kind", Fault.Kind }, { "asked", Fault.Asked }, { "tries", (double)Fault.Tries }, { "decided", Fault.Decided }, { "drop", Fault.Drop } } : null },
                { "dayFault", Fault != null ? Fault.Kind : null }, { "preflightEffects", new Lst(PreflightEffects) },
                { "transit", Transit }, { "blockT", BlockT }, { "airT", AirT }, { "autoItems", (double)AutoList },
                { "leftOn", LeftOnLst() }, { "trust", Math.Max(-10, Math.Min(12, trust)) }, { "level", _flownLevel },
            };
        }
    }

}
