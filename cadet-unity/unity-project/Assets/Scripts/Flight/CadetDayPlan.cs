// CADET — CadetDayPlan.cs : cadet/src/career/day.js ported (the pure part) —
// STEPS, startKind / endKind, planFor, stepsFor, aircraftOf, ORDER, DAY1.
// createDay (the day state machine) needs walkaround.js, dialog/atc.js and
// the CADET-side aircraft checklists + systems state; it lands with those.
using System;
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;

namespace Cadet
{
    public class DayStepDef { public string Label, List, Radio, Place, Move; public bool Soft; }
    public class DayPlan
    {
        public string Main; public bool Solo, Xc, Check;
        public string XcVariant, DivertTo; public bool Ctaf;
        public List<string> Lessons = new List<string>();
        public string Aircraft = "pa28";
    }

    public static class DayPlanLib
    {
        public static readonly Dict DAY1 = new Dict { { "id", "day1" }, { "n", 1.0 }, { "title", "最初の 1 日" }, { "lessons", new List<object> { "t1", "a2", "t3" } }, { "aircraft", "N738SY" }, { "type", "PA-28-181" } };

        public static readonly Dictionary<string, DayStepDef> STEPS = new Dictionary<string, DayStepDef>
        {
            { "walk", new DayStepDef { Label = "外部点検" } },
            { "prestart", new DayStepDef { Label = "エンジン始動前", List = "before_start" } },
            { "start", new DayStepDef { Label = "エンジン始動", List = "start" } },
            { "afterStart", new DayStepDef { Label = "エンジン始動後", List = "after_start" } },
            { "atis", new DayStepDef { Label = "ATIS を聞く", Radio = "atis" } },
            { "ground", new DayStepDef { Label = "地上管制を呼ぶ", Radio = "ground" } },
            { "taxiOut", new DayStepDef { Label = "タキシー：A1 の停止線まで", Place = "hold" } },
            { "runup", new DayStepDef { Label = "ランナップ", List = "runup" } },
            { "tower", new DayStepDef { Label = "管制塔を呼ぶ", Radio = "tower" } },
            { "lineup", new DayStepDef { Label = "滑走路 36 に入って待つ", Place = "lineup" } },
            { "takeoff", new DayStepDef { Label = "管制塔：離陸の許可", Radio = "takeoff" } },
            { "leave", new DayStepDef { Label = "管制塔：周波数の変更", Radio = "leave" } },
            { "transit", new DayStepDef { Label = "訓練空域へ", Move = "transit" } },
            { "back", new DayStepDef { Label = "管制塔を呼ぶ（帰投）", Radio = "back" } },
            { "return", new DayStepDef { Label = "LAB へ戻る", Move = "return" } },
            { "closed", new DayStepDef { Label = "管制塔：場周経路", Radio = "closed" } },
            { "ctaf", new DayStepDef { Label = "CTAF 自家通報（LABEF・122.9）", Radio = "ctaf" } },
            { "pattern", new DayStepDef { Label = "場周経路を回る", Move = "pattern" } },
            { "recover", new DayStepDef { Label = "教官が出力を戻して LAB へ", Move = "recover" } },
            { "stopgo", new DayStepDef { Label = "管制塔：もう一度離陸", Radio = "stopgo" } },
            { "recycle", new DayStepDef { Label = "もう一度離陸して場周経路へ", Move = "recycle" } },
            { "exit", new DayStepDef { Label = "管制塔：滑走路を出る", Radio = "exit" } },
            { "taxiOff", new DayStepDef { Label = "滑走路を出て止まる", Place = "clear" } },
            { "groundIn", new DayStepDef { Label = "地上管制を呼ぶ", Radio = "groundIn" } },
            { "taxiIn", new DayStepDef { Label = "タキシー：駐機場へ", Place = "stand", List = "after_landing", Soft = true } },
            { "shutdown", new DayStepDef { Label = "エンジン停止", List = "shutdown" } },
            { "debrief", new DayStepDef { Label = "講評" } },
            { "done", new DayStepDef { Label = "1 日の終わり" } },
        };
        static readonly string[] GROUND_OUT = { "walk", "prestart", "start", "afterStart", "atis", "ground", "taxiOut", "runup", "tower", "lineup" };
        static readonly string[] GROUND_IN = { "exit", "taxiOff", "groundIn", "taxiIn", "shutdown", "debrief", "done" };
        static readonly Dictionary<string, string> START_OF = new Dictionary<string, string>
            { { "runway", "runway" }, { "area", "area" }, { "away", "area" }, { "final", "pattern" }, { "downwind", "pattern" }, { "ils", "pattern" } };
        static readonly Dictionary<string, string> END_OF = new Dictionary<string, string>
        {
            { "t1", "air" }, { "t4", "air" }, { "x3", "air" }, { "t2", "stopped" }, { "t3", "stopped" }, { "e1", "stopped" }, { "x1", "stopped" }, { "x2", "stopped" },
            { "e2", "failed" }, { "e3", "failed" }, { "e4", "failed" }, { "c1", "failed" },
            { "m1", "air" }, { "m4", "air" }, { "e6", "air" }, { "m5", "stopped" }, { "r1", "stopped" }, { "cx2", "stopped" }, { "cf2", "stopped" },
            { "j1", "air" }, { "j4", "stopped" }, { "j5", "stopped" },
        };
        static readonly HashSet<string> OWN_TAKEOFF = new HashSet<string> { "t1", "c1", "cx1", "j1" };

        public static string StartKind(string id)
        {
            var def = Syllabus.Lesson(id);
            string at = def?.Setup?.At;
            string k;
            return at != null && START_OF.TryGetValue(at, out k) ? k : "area";
        }
        public static string EndKind(string id)
        {
            string e;
            if (id != null && END_OF.TryGetValue(id, out e)) return e;
            return StartKind(id) == "area" ? "area" : "air";
        }
        public static string AircraftOf(List<string> lessons)
        {
            foreach (var id in lessons)
            {
                var def = Syllabus.Lesson(id);
                if (def != null && def.Aircraft != null && def.Aircraft != "pa28") return def.Aircraft;
            }
            return "pa28";
        }

        public static DayPlan PlanFor(string id, bool solo = false, Dict check = null, string xcVariant = null)
        {
            if (xcVariant == "labef")
                return new DayPlan { Main = "n2", Solo = true, Xc = true, XcVariant = "labef", Ctaf = true, DivertTo = "LABEF", Lessons = new List<string> { "t1", "n2", "t3" }, Aircraft = "pa28" };
            if (check != null)
            {
                var chkLessons = new List<string>();
                var la = Js.Arr(Js.Get(check, "lessons"));
                if (la != null) foreach (var x in la) chkLessons.Add(x as string);
                string kind = Js.Str(check, "kind");
                string main = null;
                foreach (var x in chkLessons) { if (!(x == "t1" || x == "t3")) { main = x; break; } }   // JS: find(x => !/^t[13]$/.test(x))
                if (main == null && chkLessons.Count > 0) main = chkLessons[0];
                return new DayPlan { Main = main, Solo = kind == "xc", Xc = kind == "xc", Check = kind == "checkride", Lessons = chkLessons, Aircraft = AircraftOf(chkLessons) };
            }
            if (solo) return new DayPlan { Main = "t2", Solo = true, Lessons = new List<string> { "t1", "t2", "t2", "t2" }, Aircraft = "pa28" };
            string k = StartKind(id), e = EndKind(id);
            List<string> lessons;
            if (AircraftOf(new List<string> { id }) == "pa28r")
            {
                var cxLessons = (id == "cx1" || id == "cx2") ? new List<string> { "cx1", "cx2" } : new List<string> { "cx1", id, "cx2" };
                return new DayPlan { Main = id, Lessons = cxLessons, Aircraft = "pa28r" };
            }
            if (AircraftOf(new List<string> { id }) == "b737")
            {
                if (id == "j4") lessons = new List<string> { "j1", "j4" };
                else if (k == "runway") lessons = new List<string> { id, "j4" };
                else lessons = new List<string> { "j1", id, "j4" };
                return new DayPlan { Main = id, Lessons = lessons, Aircraft = "b737" };
            }
            if (AircraftOf(new List<string> { id }) == "pa44")
            {
                if (id == "m5") lessons = new List<string> { "m1", "m5" };
                else if (k == "runway") lessons = new List<string> { id, "m5" };
                else lessons = new List<string> { "m1", id, "m5" };
                return new DayPlan { Main = id, Lessons = lessons, Aircraft = "pa44" };
            }
            if (k == "runway") lessons = e == "stopped" ? new List<string> { id } : new List<string> { id, "t3" };
            else if (id == "t3") lessons = new List<string> { "t1", "t3" };
            else { lessons = new List<string> { "t1", id }; if (e != "stopped") lessons.Add("t3"); }
            return new DayPlan { Main = id, Lessons = lessons, Aircraft = "pa28" };
        }

        public static List<string> StepsFor(List<string> lessons, bool ctaf = false)
        {
            var outL = new List<string>(GROUND_OUT);
            for (int i = 0; i < lessons.Count; i++)
            {
                string id = lessons[i], k = StartKind(id);
                if (i == 0)
                {
                    if (k != "runway") throw new Exception($"the day's first lesson starts on the runway ({id} does not)");
                    if (!OWN_TAKEOFF.Contains(id)) outL.Add("takeoff");
                }
                else
                {
                    string pe = EndKind(lessons[i - 1]);
                    if (k == "runway") throw new Exception($"{id} starts on the runway: only as the day's first lesson");
                    if (pe == "failed") outL.Add("recover");
                    else if (k == "area") { outL.Add("leave"); outL.Add("transit"); }
                    else if (pe == "area") { if (ctaf && !outL.Contains("ctaf")) outL.Add("ctaf"); outL.Add("back"); outL.Add("return"); }
                    else if (pe == "air") { outL.Add("closed"); outL.Add("pattern"); }
                    else { outL.Add("stopgo"); outL.Add("recycle"); }
                }
                outL.Add(id);
            }
            if (EndKind(lessons[lessons.Count - 1]) != "stopped") throw new Exception("the day ends with a landing");
            outL.AddRange(GROUND_IN);
            return outL;
        }

        public static List<string> ORDER
        {
            get
            {
                var o = new List<string>(GROUND_OUT) { "t1", "leave", "transit", "a2", "back", "return", "t3" };
                o.AddRange(GROUND_IN);
                return o;
            }
        }
    }
}
