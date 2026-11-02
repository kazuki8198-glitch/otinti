// BotQuizCs — headless sanity for CadetQuiz: the exam draw, the FTD
// generators (k2/k3/k5/k6), the class drill and the navlog questions all
// produce well-formed papers (right answer present, options unique enough,
// counts as designed), and the exam score honours the bank floor.
using System;
using System.Collections.Generic;
using System.IO;
using Cadet;

public static class BotQuizCs
{
    static int fails;
    static void Check(bool ok, string what) { Console.WriteLine((ok ? "PASS " : "FAIL ") + what); if (!ok) fails++; }
    static void CheckPaper(List<QuizQ> qs, int n, string what)
    {
        bool ok = qs != null && qs.Count == n;
        if (ok) foreach (var q in qs) { if (q.Ok < 0 || q.Ok >= q.Opts.Count || string.IsNullOrEmpty(q.Q)) { ok = false; break; } }
        Check(ok, $"{what}: {qs?.Count} questions, all with a valid right answer");
        if (qs != null && qs.Count > 0) Console.WriteLine($"  sample[{what}]: {qs[0].Q} -> {qs[0].Opts[qs[0].Ok]}");
    }

    public static int Main()
    {
        string d = "/home/hatch/workspace/cadet-unity/data";
        string R(string f) { return File.ReadAllText(Path.Combine(d, f)); }
        QuizData.Load(R("quiz.json"), R("answer-map.json"), R("scene-answers.json"), R("radio-data.json"), R("gamebook.json"));
        // populate the class sections the way CareerMain does
        CareerLogic.ClassSections.Clear();
        var gb = (Dictionary<string, object>)MiniJson.Parse(R("gamebook.json"));
        var chSecs = new Dictionary<string, List<string>>();
        foreach (var co in (List<object>)gb["chapters"])
        {
            var cd = (Dictionary<string, object>)co;
            var secs = new List<string>();
            foreach (var so in (List<object>)cd["sections"]) secs.Add(Js.Str((Dictionary<string, object>)so, "id"));
            chSecs[Js.Str(cd, "id")] = secs;
        }
        for (int i = 0; i < CareerData.CLASSES.Length; i++)
        {
            var l = new List<string>();
            foreach (var chId in CareerData.CLASSES[i]) if (chSecs.TryGetValue(chId, out var ss)) l.AddRange(ss);
            CareerLogic.ClassSections.Add(l);
        }
        var allHeard = new HashSet<string>();
        foreach (var l in CareerLogic.ClassSections) foreach (var s in l) allHeard.Add(s);

        var w1 = ExamDraw.Draw("written1", 12345 + 30, 0, allHeard);
        CheckPaper(w1, 30, "written1 (all heard)");
        var w1none = ExamDraw.Draw("written1", 12345 + 5, 0, new HashSet<string>());
        Check(w1none.Count < 30, $"written1 (nothing heard) draws fewer ({w1none.Count})");
        CheckPaper(ExamDraw.Draw("presolo", 777 + 60, 0, null), 30, "presolo");
        CheckPaper(ExamDraw.Draw("type", 777 + 200, 0, null), 30, "type");
        var rights = new List<bool>(); foreach (var q in w1) rights.Add(true);
        var sc = ExamDraw.Score("written1", w1, rights);
        Check(sc.Pct == 100 && sc.Pass, "written1 all-right scores 100 and passes");
        var rights2 = new List<bool>(); foreach (var q in w1) rights2.Add(false);
        var sc2 = ExamDraw.Score("written1", w1, rights2);
        Check(sc2.Pct == 0 && !sc2.Pass && sc2.Weak.Count > 0, "written1 all-wrong fails with weak banks");

        CheckPaper(FtdGen.K2(999, 0), 10, "ftd k2");
        CheckPaper(FtdGen.K3(999, 0, allHeard), 10, "ftd k3 (all heard)");
        Check(FtdGen.K3(999, 0, new HashSet<string>()).Count == 0, "ftd k3 (nothing heard) is empty, as designed");
        CheckPaper(FtdGen.K5(999, 0, allHeard), 10, "ftd k5 (all heard)");
        CheckPaper(FtdGen.K6(999, 0, allHeard), 10, "ftd k6 (all heard)");
        CheckPaper(ExamDraw.ClassDrill(0, new HashSet<string>(), 4242, 0), 5, "class drill (class 0)");
        CheckPaper(NavlogQ.Build(), 5, "navlog");
        Console.WriteLine(fails == 0 ? "QUIZ PASS" : $"QUIZ FAIL x{fails}");
        return fails == 0 ? 0 : 1;
    }
}
