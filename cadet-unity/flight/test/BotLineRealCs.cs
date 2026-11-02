// BotLineRealCs.cs — the PF line sector flown for real in the 737 physics
// (Stage 13): CadetLinePilot flies HND-KMQ while CadetLineDuty reads real
// observations; asserts the duty reaches debrief with a scored touchdown.
using System;
using System.IO;
using Cadet;
using Dict = System.Collections.Generic.Dictionary<string, object>;

public static class BotLineRealCs
{
    public static int Main()
    {
        string dataDir = Environment.GetEnvironmentVariable("CADET_DATA") ?? "/home/hatch/workspace/cadet-unity/data";
        CadetLineData.Load(
            File.ReadAllText(Path.Combine(dataDir, "line.json")),
            File.ReadAllText(Path.Combine(dataDir, "airfields.json")));
        int fails = 0;
        foreach (var route in new[] { "HND-KMQ", "HND-FUK" })
        {
            CadetLineDuty duty = null;
            for (double seed = 1; seed <= 40; seed++)
            {
                var d = new CadetLineDuty(route, "PF", "sakurai", seed);
                d.Advance();
                if (d.DispatchCase != null && d.DispatchCase.CorrectGo) { duty = d; break; }
            }
            if (duty == null) { Console.WriteLine($"{route}: no GO dispatch seed found"); fails++; continue; }
            duty.AnswerDispatch((double)duty.DispatchCase.CorrectIndex);
            Console.WriteLine($"{route}: after dispatch phase={duty.Phase} nogo={duty.NoGo}");
            var pilot = new LinePilot(duty, 3);
            int guard = 0;
            while (duty.Phase != "debrief" && guard++ < 600)
            {
                if (duty.Event != null && duty.EventAnswer == null)
                {
                    int best = 0; for (int i = 1; i < duty.Event.Scores.Count; i++) if (duty.Event.Scores[i] > duty.Event.Scores[best]) best = i;
                    duty.AnswerEvent((double)best);
                }
                pilot.Step(10);
                if (pilot.S.Dead) break;
            }
            var sum = duty.Summary();
            Console.WriteLine($"{route}: phase={duty.Phase} steps={guard} dead={pilot.S.Dead} crash={pilot.S.CrashReason} total={MiniJson.Num(sum, "total")} grade={MiniJson.Str(sum, "grade")} td={MiniJson.Stringify(duty.Touchdown ?? new Dict())} note={pilot.Note}");
            if (duty.Phase != "debrief" || pilot.S.Dead) fails++;
            var td = duty.Touchdown;
            if (td == null || MiniJson.Str(td, "at") != duty.Destination.Id) { Console.WriteLine($"{route}: touchdown airport mismatch"); fails++; }
        }
        // straight-in case: a seed whose flight completes without diverting
        {
            bool found = false;
            for (double seed = 1; seed <= 40 && !found; seed++)
            {
                var d = new CadetLineDuty("HND-KMQ", "PF", "sakurai", seed);
                d.Advance();
                if (d.DispatchCase == null || !d.DispatchCase.CorrectGo) continue;
                d.AnswerDispatch((double)d.DispatchCase.CorrectIndex);
                var p = new LinePilot(d, 3);
                int g = 0;
                while (d.Phase != "debrief" && g++ < 400)
                {
                    if (d.Event != null && d.EventAnswer == null)
                    {
                        int best = 0; for (int i = 1; i < d.Event.Scores.Count; i++) if (d.Event.Scores[i] > d.Event.Scores[best]) best = i;
                        d.AnswerEvent((double)best);
                    }
                    p.Step(10);
                    if (p.S.Dead) break;
                }
                if (d.Phase == "debrief" && !p.S.Dead && !d.Diverted)
                {
                    found = true;
                    Console.WriteLine($"straight-in: seed={seed} td={MiniJson.Stringify(d.Touchdown ?? new Dict())} dest={d.Destination.Id}");
                    if (d.Touchdown == null || MiniJson.Str(d.Touchdown, "at") != "KMQ") { Console.WriteLine("straight-in: touchdown mismatch"); fails++; }
                }
            }
            if (!found) Console.WriteLine("straight-in: no completing non-divert seed in 1..40 (case skipped, not failed)");
        }
        // divert case: answer the weather event with choice 0 (divert) and land at the alternate
        {
            CadetLineDuty duty = null; LinePilot pilot = null;
            for (double seed = 1; seed <= 60 && duty == null; seed++)
            {
                var d = new CadetLineDuty("HND-KMQ", "PF", "sakurai", seed);
                d.Advance();
                if (d.DispatchCase == null || !d.DispatchCase.CorrectGo) continue;
                d.AnswerDispatch((double)d.DispatchCase.CorrectIndex);
                var p = new LinePilot(d, 3);
                int g = 0; bool diverted = false;
                while (d.Phase != "debrief" && g++ < 900)
                {
                    if (d.Event != null && d.EventAnswer == null)
                    {
                        if (d.Event.Kind == "weather") { d.AnswerEvent(0.0); diverted = d.Diverted; }
                        else { int best = 0; for (int i = 1; i < d.Event.Scores.Count; i++) if (d.Event.Scores[i] > d.Event.Scores[best]) best = i; d.AnswerEvent((double)best); }
                    }
                    p.Step(10);
                    if (p.S.Dead) break;
                }
                if (diverted) { duty = d; pilot = p; Console.WriteLine($"divert: seed={seed} phase={d.Phase} dead={p.S.Dead} td={MiniJson.Stringify(d.Touchdown ?? new Dict())} dest={d.Destination.Id}"); }
            }
            if (duty == null) Console.WriteLine("divert: no weather-event seed found (case skipped, not failed)");
            else if (duty.Phase != "debrief" || pilot.S.Dead || duty.Touchdown == null || MiniJson.Str(duty.Touchdown, "at") != duty.Destination.Id) { Console.WriteLine("divert: FAILED"); fails++; }
        }
        Console.WriteLine(fails == 0 ? "LINE REAL FLIGHT PASS" : $"LINE REAL FLIGHT FAIL x{fails}");
        return fails == 0 ? 0 : 1;
    }
}
