// C#-side digest runner for the lesson-bot equivalence check (Stage 2).
// Prints one JSON object per (lesson, level) in the same shape as bot-fly-js.mjs.
using System;
using System.Collections.Generic;
using Cadet;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotFlyCs
{
    static string Q(string s) { return MiniJson.Stringify(s); }
    static string RowJson(string step, Row r)
    {
        string score = r.Score == null ? "null" : Math.Round(r.Score.Value, 4).ToString("R", System.Globalization.CultureInfo.InvariantCulture);
        return "[" + Q(step) + "," + Q(r.Name) + "," + (r.Pass ? "true" : "false") + "," + score + "]";
    }
    public static int Main()
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        var ids = new List<string>();
        foreach (var st in Syllabus.STAGES) foreach (var l in st.Lessons) if (l.Steps != null) ids.Add(l.Id);
        var levels = new[] { "intro", "basic", "precision" };
        foreach (var id in ids)
        {
            foreach (var lv in levels)
            {
                LessonState L = null; string err = null;
                try { L = BotFly.RunLesson(id, lv, 900); } catch (Exception e) { err = e.Message; }
                if (err != null) { Console.WriteLine("{\"id\":" + Q(id) + ",\"level\":" + Q(lv) + ",\"error\":" + Q(err) + "}"); continue; }
                var rows = new List<string>();
                foreach (var sr in L.Results) foreach (var row in sr.Rows) rows.Add(RowJson(sr.Step, row));
                Console.WriteLine("{\"id\":" + Q(id) + ",\"level\":" + Q(lv)
                    + ",\"done\":" + (L.Done ? "true" : "false")
                    + ",\"passed\":" + (L.Passed ? "true" : "false")
                    + ",\"grade\":" + Q(L.Grade)
                    + ",\"score\":" + (L.Done ? Math.Round(L.Score, 4).ToString("R", System.Globalization.CultureInfo.InvariantCulture) : "null")
                    + ",\"passPct\":" + (L.Done ? L.PassPct.ToString() : "null")
                    + ",\"t\":" + Math.Round(L.T, 2).ToString("R", System.Globalization.CultureInfo.InvariantCulture)
                    + ",\"rows\":[" + string.Join(",", rows) + "]}");
            }
        }
        return 0;
    }
}
