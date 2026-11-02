// CADET — CadetFailures.cs : cadet/src/aircraft/failures.js ported — seeded
// random failures, the instructor console's schedules, and the preflight
// defect → flight-hook map. Pure logic, deterministic in (seed, day, mode).
using System;
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;

namespace Cadet
{
    public static class Failures
    {
        public static readonly string[] FAIL_KINDS = { "mag", "carb", "elec", "pitot", "static", "gear", "pump", "engine", "engL", "engR", "ahrs", "gps" };
        public static readonly string[] CAREER_FAIL_KINDS = { "mag", "carb", "pitot", "static", "elec", "pump", "gear" };
        public const double RANDOM_FAIL_P = 0.20;

        static readonly Dictionary<string, double> W_CAREER = new Dictionary<string, double>
            { { "mag", 22 }, { "carb", 18 }, { "pitot", 16 }, { "static", 14 }, { "elec", 16 }, { "pump", 14 }, { "gear", 12 } };
        static readonly Dictionary<string, double> W_FREE = new Dictionary<string, double>
            { { "mag", 12 }, { "carb", 12 }, { "pitot", 12 }, { "static", 10 }, { "elec", 12 }, { "pump", 10 }, { "gear", 8 }, { "engine", 8 }, { "engL", 4 }, { "engR", 4 }, { "ahrs", 5 }, { "gps", 3 } };

        // the career's own mixer (career.js / walkaround.js use the same)
        public static Func<double> Rng(uint seed)
        {
            uint a = seed;
            return () =>
            {
                a = unchecked(a + 0x6D2B79F5);
                uint t = a;
                t = unchecked((t ^ (t >> 15)) * (t | 1));
                t ^= unchecked(t + (t ^ (t >> 7)) * (t | 61));
                return ((t ^ (t >> 14)) >> 0) / 4294967296.0;
            };
        }
        static uint HashOf(int seed, int day, string mode)
        {
            return unchecked((uint)(seed * 424243 + day * 104729 + (mode == "free" ? 131 : 7)));
        }

        public static bool IsEligibleDay(string kind = "", bool exam = false, bool checkride = false, bool firstLesson = false)
        {
            return kind == "flight" && !exam && !checkride && !firstLesson;
        }

        public class FailTrigger { public string Type; public double? AfterMin, AtAltFt; }
        public class RandomFailure { public string Kind; public double Prob; public FailTrigger Trigger; }

        public static RandomFailure RandomFailureFor(int seed = 1, int day = 1, string kind = "flight", bool exam = false,
            bool checkride = false, bool firstLesson = false, string aircraft = "pa28", string lessonId = "", string mode = "career")
        {
            if (mode == "career" && !IsEligibleDay(kind, exam, checkride, firstLesson)) return null;
            if (mode != "career" && mode != "free") return null;
            var R = Rng(HashOf(seed, day, mode));
            if (R() >= RANDOM_FAIL_P) return null;
            var table = new Dictionary<string, double>(mode == "free" ? W_FREE : W_CAREER);
            // JS object key order is insertion order — keep the same iteration order for the pick
            var order = mode == "free"
                ? new List<string> { "mag", "carb", "pitot", "static", "elec", "pump", "gear", "engine", "engL", "engR", "ahrs", "gps" }
                : new List<string> { "mag", "carb", "pitot", "static", "elec", "pump", "gear" };
            if (aircraft != "pa44") table.Remove("gear");
            if (aircraft != "pa44") { table.Remove("engL"); table.Remove("engR"); }
            if (mode == "career" && lessonId != null && lessonId.StartsWith("i")) table.Remove("static");
            var kinds = order.FindAll(k => table.ContainsKey(k));
            double sum = 0; foreach (var k in kinds) sum += table[k];
            double pick = R() * sum;
            string chosen = kinds[kinds.Count - 1];
            foreach (var k in kinds) { pick -= table[k]; if (pick < 0) { chosen = k; break; } }
            FailTrigger trigger;
            if (chosen == "mag") trigger = new FailTrigger { Type = mode == "free" ? "immediate" : "runup" };
            else if (mode == "career") trigger = new FailTrigger { Type = "immediate" };
            else if (chosen == "engine" || chosen == "engL" || chosen == "engR" || chosen == "ahrs" || chosen == "gps")
                trigger = new FailTrigger { Type = "atAltFt", AtAltFt = 1500 + 500 * Math.Floor(R() * 4) };
            else trigger = new FailTrigger { Type = "afterMin", AfterMin = 5 + Math.Floor(R() * 16) };
            return new RandomFailure { Kind = chosen, Prob = RANDOM_FAIL_P, Trigger = trigger };
        }

        public class Schedule { public string Kind; public double? AtMin, AtAltFt; }
        public static Schedule MakeSchedule(string kind, double? atMin = null, double? atAltFt = null)
        {
            if (Array.IndexOf(FAIL_KINDS, kind) < 0) return null;
            if (atMin != null && !(atMin.Value >= 0)) return null;
            if (atAltFt != null && !(atAltFt.Value >= 0)) return null;
            return new Schedule { Kind = kind, AtMin = atMin, AtAltFt = atAltFt };
        }
        public static bool FailureDue(Schedule entry, double elapsedMin = 0, double altFt = 0)
        {
            if (entry == null || Array.IndexOf(FAIL_KINDS, entry.Kind) < 0) return false;
            if (entry.AtMin == null && entry.AtAltFt == null) return true;
            return (entry.AtMin != null && elapsedMin >= entry.AtMin.Value) || (entry.AtAltFt != null && altFt >= entry.AtAltFt.Value);
        }
        public static List<Schedule> DueSchedule(List<Schedule> list, double elapsedMin, double altFt)
        {
            var outL = new List<Schedule>();
            if (list != null) foreach (var e in list) if (FailureDue(e, elapsedMin, altFt)) outL.Add(e);
            return outL;
        }
        public static Schedule ScheduleOf(RandomFailure rf)
        {
            if (rf == null) return null;
            var tr = rf.Trigger ?? new FailTrigger();
            return MakeSchedule(rf.Kind,
                tr.Type == "afterMin" ? tr.AfterMin : (tr.Type == "immediate" || tr.Type == "runup" ? (double?)0 : null),
                tr.Type == "atAltFt" ? tr.AtAltFt : null);
        }

        public class PreflightHook { public string Hook, FailKind, Via; public double? OilQ; }
        static readonly Dictionary<string, Dictionary<string, PreflightHook>> PREFLIGHT_HOOKS = new Dictionary<string, Dictionary<string, PreflightHook>>
        {
            { "task", new Dictionary<string, PreflightHook>
                {
                    { "pitot", new PreflightHook { Hook = "pitotRisk", FailKind = "pitot", Via = "failNow('pitot') — s.pitotRisk = 3 (PS1: the tube blocks, the heat is the cure)" } },
                    { "lock", GroundHook() }, { "tieR", GroundHook() }, { "tieL", GroundHook() }, { "tieT", GroundHook() }, { "chocks", GroundHook() },
                } },
            { "defect", new Dictionary<string, PreflightHook>
                {
                    { "pitotBlock", new PreflightHook { Hook = "pitotRisk", FailKind = "pitot", Via = "failNow('pitot') — s.pitotRisk = 3 (PS1)" } },
                    { "static", new PreflightHook { Hook = "staticBlocked", FailKind = "static", Via = "failNow('static') — s.staticBlocked = true（高度計・昇降計の凍結、代替静圧で回復）" } },
                    { "oil", new PreflightHook { Hook = "oilQ", OilQ = 4, Via = "EN4 の油量：s.eng[].oilQ = 4（systems の oilQ と同じ状態。油圧は 2.5 qt 未満で下がり始める）" } },
                    { "cap", new PreflightHook { Hook = "ground", Via = "自分で閉める／整備の項目：出発前に直り、講評に残る" } },
                    { "water", new PreflightHook { Hook = "ground", Via = "サンプの取り直しで直る項目：出発前に直り、講評に残る" } },
                } },
        };
        static PreflightHook GroundHook() { return new PreflightHook { Hook = "ground", Via = "出発不可の地上項目：教官の見回り（settle）で外され、講評と信頼に残る" }; }
        public static PreflightHook PreflightHookFor(string source, string item)
        {
            Dictionary<string, PreflightHook> m; PreflightHook h;
            if (source != null && PREFLIGHT_HOOKS.TryGetValue(source, out m) && m.TryGetValue(item, out h)) return h;
            return new PreflightHook { Hook = "ground", Via = "整備が直す項目：出発前に直り、講評に残る" };
        }

        public static double PreflightJudgeBase(double found = 0)
        {
            double n = !double.IsNaN(found) && !double.IsInfinity(found) ? Math.Max(0, Math.Floor(found)) : 0;
            return n > 0 ? Math.Min(1.0, 0.5 * n) : 0;
        }
    }
}
