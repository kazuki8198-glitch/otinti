// C# mirror of bot-day-js.mjs — day.js planFor/stepsFor equivalence.
using System;
using System.Collections.Generic;
using System.IO;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotDayCs
{
    static readonly List<string> Lines = new List<string>();
    static Dict D(params object[] kv) { var d = new Dict(); for (int i = 0; i < kv.Length; i += 2) d[(string)kv[i]] = kv[i + 1]; return d; }
    static Lst L(List<string> xs) { var l = new Lst(); foreach (var x in xs) l.Add(x); return l; }
    static void Emit(Dict d) { Lines.Add(MiniJson.Stringify(d)); }
    static Dict PlanObj(DayPlan p)
    {
        return D("main", p.Main, "solo", p.Solo, "xc", p.Xc, "check", p.Check, "lessons", L(p.Lessons), "aircraft", p.Aircraft,
            "ctaf", p.Ctaf, "divertTo", p.DivertTo, "xcVariant", p.XcVariant);
    }
    static void StepsEmit(string id, List<string> lessons, bool ctaf)
    {
        List<string> steps = null; string err = null;
        try { steps = DayPlanLib.StepsFor(lessons, ctaf); } catch (Exception e) { err = e.Message; }
        Emit(D("tag", "steps", "id", id, "steps", steps == null ? null : L(steps), "err", err));
    }

    public static int Main()
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        var ids = new List<string>();
        foreach (var st in Syllabus.STAGES) foreach (var l in st.Lessons) if (l.Steps != null) ids.Add(l.Id);
        foreach (var id in ids)
        {
            var p = DayPlanLib.PlanFor(id);
            Emit(D("tag", "plan", "id", id, "p", PlanObj(p)));
            StepsEmit(id, p.Lessons, p.Ctaf);
        }
        Emit(D("tag", "plan", "id", "SOLO", "p", PlanObj(DayPlanLib.PlanFor("t2", solo: true))));
        Emit(D("tag", "plan", "id", "LABEF", "p", PlanObj(DayPlanLib.PlanFor("n2", xcVariant: "labef"))));
        foreach (var chk in new[]
        {
            D("lessons", new Lst { "t1", "n2", "t3" }, "kind", "xc"),
            D("lessons", new Lst { "t1", "x2", "t3" }, "kind", "checkride"),
            D("lessons", new Lst { "j1", "j5" }, "kind", "checkride"),
            D("lessons", new Lst { "t1", "t3" }, "kind", "checkride"),
        })
        {
            var lessons = new List<string>(); foreach (var x in Js.Arr(Js.Get(chk, "lessons"))) lessons.Add((string)x);
            string key = "CHK:" + string.Join("+", lessons);
            var p = DayPlanLib.PlanFor("", check: chk);
            Emit(D("tag", "plan", "id", key, "p", PlanObj(p)));
            StepsEmit(key, p.Lessons, false);
        }
        Emit(D("tag", "order", "o", L(DayPlanLib.ORDER)));
        var kinds = new Lst();
        foreach (var id in ids) kinds.Add(new Lst { id, DayPlanLib.StartKind(id), DayPlanLib.EndKind(id) });
        Emit(D("tag", "kinds", "m", kinds));
        File.WriteAllLines("digest-day-cs.jsonl", Lines);
        Console.WriteLine("day cs lines: " + Lines.Count);
        return 0;
    }
}
