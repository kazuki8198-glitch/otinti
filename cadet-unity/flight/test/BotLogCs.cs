// C# mirror of bot-log-js.mjs.
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Cadet;
using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

public static class BotLogCs
{
    static Dict Lesson(string id, string title, string grade, bool passed, bool done)
    {
        return new Dict { { "id", id }, { "title", title }, { "grade", grade }, { "passed", passed }, { "done", done }, { "crashed", false } };
    }
    public static int Main()
    {
        Console.OutputEncoding = Encoding.UTF8;
        var lines = new List<string>();
        var sumA = new Dict
        {
            { "lessons", new Lst { Lesson("t1", "離陸", "A", true, true), Lesson("i5", "計器", "S", true, true), Lesson("a2", "場周", "B", false, true), Lesson("x1", "航法", "", false, false) } },
            { "blockT", 4567.0 }, { "solo", false }, { "landings", 2.0 }, { "trust", 7.0 },
            { "plan", new Dict { { "aircraft", "pa28" } } },
        };
        var sumB = new Dict
        {
            { "lessons", new Lst { Lesson("t3", "着陸", "A", true, true) } },
            { "blockT", 1800.0 }, { "solo", true }, { "trust", 3.0 },
            { "plan", new Dict { { "aircraft", "pa44" } } },
        };
        var book = new Logbook(new MemLogStore());
        var eA = book.Add(LogbookLib.EntryFrom(sumA, new LogbookLib.EntryOpts { Date = "2026-10-23", Remarks = "よくできました", DayN = 4, SkippedSec = 300 }));
        var eB = book.Add(LogbookLib.EntryFrom(sumB, new LogbookLib.EntryOpts { Date = "2026-11-02", DayN = 21, Xc = true }));
        var eI = book.Add(LogbookLib.IntroEntry("2026-10-20", 1, 2400, level: "level", turn: "right", takes: 2, trust: 1));
        lines.Add(MiniJson.Stringify(new Dict { { "tag", "entries" }, { "eA", eA }, { "eB", eB }, { "eI", eI } }));
        lines.Add(MiniJson.Stringify(new Dict { { "tag", "totals" }, { "totals", book.Totals() } }));
        var dirtyLessons = new Lst
        {
            new Dict { { "id", "T1" }, { "title", new string('x', 50) }, { "grade", "SS" }, { "passed", 1.0 } },
            new Dict { { "id", "ok99" }, { "title", "航法" }, { "grade", "A" }, { "passed", true } },
        };
        var dirty = new Dict
        {
            { "v", 1.0 },
            { "entries", new Lst
            {
                new Dict
                {
                    { "day", 2.5 }, { "date", "2026-10-24T99" }, { "aircraft", "" }, { "reg", "TOOLONGREGX" }, { "from", "" }, { "to", "LABX" },
                    { "total", 1.25 }, { "dual", 1.25 }, { "solo", -3.0 }, { "landings", 25.0 }, { "lessons", dirtyLessons },
                    { "remarks", new string('r', 250) }, { "skipped", 2.5 }, { "trust", "x" },
                    { "sig", new Dict { { "name", "" }, { "cert", "" } } }, { "signed", false }, { "endorsement", new string('e', 150) },
                },
                new Dict { { "total", "nope" } },
                null,
                new Dict { { "total", 0.5 }, { "lessons", "no" } },
            } },
        };
        var store2 = new MemLogStore();
        store2.SetItem(LogbookLib.KEY, MiniJson.Stringify(dirty));
        var book2 = new Logbook(store2);
        var cleanedEntries = new Lst(); foreach (var e in book2.Entries) cleanedEntries.Add(e);
        lines.Add(MiniJson.Stringify(new Dict { { "tag", "cleaned" }, { "entries", cleanedEntries }, { "totals", book2.Totals() } }));
        var tenths = new Lst();
        foreach (var sec in new[] { 0.0, 59, 60, 359, 360, 540, 3599, 3600 }) tenths.Add(LogbookLib.Tenths(sec));
        lines.Add(MiniJson.Stringify(new Dict { { "tag", "tenths" }, { "vals", tenths } }));
        File.WriteAllLines("/home/hatch/workspace/cadet-unity/flight/test/digest-log-cs.jsonl", lines);
        Console.WriteLine($"log cs lines: {lines.Count}");
        return 0;
    }
}
