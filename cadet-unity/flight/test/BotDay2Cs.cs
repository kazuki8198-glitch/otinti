// C# mirror of bot-day2-js.mjs — the scripted first day, identical inputs.
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Cadet;
using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotDay2Cs
{
    public static int Main()
    {
        Console.OutputEncoding = Encoding.UTF8;
        var lines = new List<string>();
        string dataDir = Environment.GetEnvironmentVariable("CADET_DATA") ?? "/home/hatch/workspace/cadet-unity/data";
        var archerKit = WalkKit.FromJson((Dict)MiniJson.Parse(File.ReadAllText(Path.Combine(dataDir, "walkaround-archer.json"))));
        var seminoleKit = WalkKit.FromJson((Dict)MiniJson.Parse(File.ReadAllText(Path.Combine(dataDir, "walkaround-seminole.json"))));
        uint seed = 5;
        var plan = DayPlanLib.PlanFor("a2");
        var day = new Day(archerKit, seminoleKit, new DayOpts
        {
            Seed = seed, Level = "basic", Plan = plan,
            Weather = new RadioContent.DayWeather { Info = "Bravo", Zulu = "1405", TempC = 22, DewC = 11 },
            Qnh = 29.85,
        });
        var L0 = School.StartLesson("t1", "intro");
        var s = L0.S;
        var sw = new SwState();
        var sys = new Systems(sw);
        sys.SetCold(s);
        bool park = false;
        var av = new AvionicsState(); av.Baro = 29.92;
        var c = new DayCtx
        {
            Sw = sw, Sys = sys, S = s, Av = av, Pos = (636.5, 207.6), V = 0, Hdg = 354, OnGround = true, Dt = 0.1,
            ActFn = (name, arg) => { if (name == "parkBrake") park = arg is bool b && b; return ""; },
            SetThrFn = x => { s.Thr = x; },
            SetFlapsFn = i => { s.FlapIdx = i; s.FlapDeg = new[] { 0.0, 10, 25, 40 }[i]; },
        };
        c.Park = park;
        var phases = new List<string> { day.Phase };
        var events = new List<Dict>();
        bool wrongDone = false;
        void Tick(int n = 1)
        {
            for (int i = 0; i < n; i++)
            {
                sys.Update(0.1, s);
                c.Rpm = sys.Rpm; c.Park = park;
                var evs = day.Update(c);
                foreach (var e in evs) { events.Add(e); if (Js.Str(e, "type") == "phase") phases.Add(Js.Str(e, "to")); }
                for (int k = 0; k < 6; k++) Sim.Step(s, 1.0 / 60);
            }
        }
        foreach (var pObj in day.Walk.Points)
        {
            var p = (Dict)pObj;
            string pid = Js.Str(p, "id");
            day.Walk.Inspect(pid);
            var v1 = day.Walk.Inspect(pid);
            foreach (var ch in (Lst)v1["choices"]) if (Js.Str((Dict)ch, "act") == "task") day.Walk.Act(pid, "task");
            day.Walk.Inspect(pid);
            bool plantedBad = day.Walk.Planted.Contains(pid);
            if (plantedBad)
            {
                day.Walk.Act(pid, "report");
                var v3 = day.Walk.Inspect(pid);
                foreach (var ch in (Lst)v3["choices"]) if (Js.Str((Dict)ch, "act") == "fix") day.Walk.Act(pid, "fix");
            }
            else day.Walk.Act(pid, "ok");
        }
        day.Boarded(); phases.Add(day.Phase);
        var lessonStatus = new Dictionary<string, DayLessonStatus>
        {
            { "t1", new DayLessonStatus { Done = true, Passed = true, Grade = "A", Score = 0.9, T = 300, Results = new List<StepResult> { new StepResult { Step = "離陸滑走", Rows = new List<Row> { new Row { Name = "速度", Val = "Vr 55", Std = "±5", Pass = true, Score = 1 } } } } } },
            { "a2", new DayLessonStatus { Done = true, Passed = true, Grade = "S", Score = 1, T = 600, Results = new List<StepResult>() } },
            { "t3", new DayLessonStatus { Done = true, Passed = true, Grade = "A", Score = 0.88, T = 240, Exit = "A2", Results = new List<StepResult>() } },
        };
        int guard = 0;
        while (day.Phase != "done" && guard++ < 4000)
        {
            string ph = day.Phase; var info = day.Info(ph);
            if (info.lesson != null) { day.LessonEnded(ph, lessonStatus[ph]); Tick(1); continue; }
            if (info.move != null) { day.LessonStarted(day.NextLesson()); Tick(1); continue; }
            if (info.radio != null)
            {
                int g2 = 0;
                while (day.Phase == ph && g2++ < 300)
                {
                    Tick(1);
                    var v = day.Atc.View();
                    if (v != null && Js.Str(v, "phase") == "choose")
                    {
                        var choices = (Lst)v["choices"];
                        if (!wrongDone && Js.Str(v, "id") == "gnd_rb") { int wrong = -1; for (int ci = 0; ci < choices.Count; ci++) if (Js.Num((Dict)choices[ci], "k") != day.Atc.RightIndex()) { wrong = ci; break; } day.Atc.Answer(wrong >= 0 ? wrong : 0); wrongDone = true; }
                        else day.Atc.Answer(day.Atc.RightIndex());
                    }
                }
                continue;
            }
            if (ph == "runup")
            {
                sw.Mag = "BOTH"; s.Thr = 0.67; Tick(15);
                sw.Mag = "L"; Tick(8); sw.Mag = "R"; Tick(8); sw.Mag = "BOTH"; Tick(4);
                sw.CarbHeat = true; Tick(8); sw.CarbHeat = false; Tick(4);
                s.Thr = 0.0; Tick(8); s.Thr = 0.045; Tick(8);
            }
            if (info.list != null)
            {
                if (info.place == "stand") { c.Pos = (636.5, 207.6); c.V = 0; }
                int g2 = 0;
                while (day.Phase == ph && g2++ < 40)
                {
                    var items = day.Items();
                    if (items == null || Js.Num(items, "i") >= ((Lst)items["items"]).Count) break;
                    var cur = (Dict)((Lst)items["items"])[(int)Js.Num(items, "i")];
                    if (Js.Bool(cur, "confirm")) day.Confirm(c); else day.Assist(c);
                    Tick(30);
                }
                Tick(2);
                continue;
            }
            if (info.place != null)
            {
                if (info.place == "hold") { c.Pos = (17.5, 44.5); c.V = 0; }
                if (info.place == "lineup") { c.Pos = (30, 0); c.V = 0; c.Hdg = 354; }
                if (info.place == "clear") { c.Pos = (620, 120); c.V = 0; }
                if (info.place == "stand") { c.Pos = (636.5, 207.6); c.V = 0; }
                Tick(2);
                continue;
            }
            if (ph == "debrief") { day.DebriefRead(); Tick(1); continue; }
            Tick(1);
        }
        var phL = new Lst(); foreach (var x in phases) phL.Add(x);
        lines.Add(MiniJson.Stringify(new Dict { { "tag", "phases" }, { "phases", phL } }));
        var evL = new Lst();
        foreach (var e in events)
        {
            var row = new Lst { Js.Str(e, "type") ?? "", Js.Str(e, "kind") ?? "", Js.Str(e, "list") ?? "", e.ContainsKey("i") ? Js.Get(e, "i") : (object)"", Js.Str(e, "from") ?? "", Js.Str(e, "to") ?? "" };
            evL.Add(row);
        }
        lines.Add(MiniJson.Stringify(new Dict { { "tag", "events" }, { "events", evL } }));
        var memo = day.Memo;
        lines.Add(MiniJson.Stringify(new Dict { { "tag", "memo" }, { "memo", new Dict {
            { "both", Js.Round(memo.Both * 10) / 10 }, { "dropL", memo.DropL }, { "dropR", memo.DropR }, { "carb", memo.Carb }, { "idle", memo.Idle } } } }));
        lines.Add(MiniJson.Stringify(new Dict { { "tag", "summary" }, { "sum", day.Summary() } }));
        var pl = new Lst(); foreach (var x in day.Walk.Planted) pl.Add(x);
        lines.Add(MiniJson.Stringify(new Dict { { "tag", "walk" }, { "planted", pl }, { "summary", day.Walk.Summary() } }));
        File.WriteAllLines("/home/hatch/workspace/cadet-unity/flight/test/digest-day2-cs.jsonl", lines);
        Console.WriteLine($"day2 cs lines: {lines.Count} final phase: {day.Phase} guard: {guard}");
        return 0;
    }
}
