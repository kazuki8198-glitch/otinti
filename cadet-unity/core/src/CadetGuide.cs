// CADET — CadetGuide.cs : port of cadet/src/career/guide.js (the one-line
// "what to do next" guide + the door-graph router over the academy spec).
// Pure logic, no UnityEngine. Inputs/outputs are MiniJson object graphs.
using System;
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public static class CadetGuide
    {
        static readonly Dictionary<string, string> SLOT_JA = new Dictionary<string, string>
            { { "morning", "朝" }, { "am", "午前" }, { "pm", "午後" }, { "evening", "夜" } };
        static readonly string[] ORDER = { "morning", "am", "pm", "evening" };
        static readonly HashSet<string> FLYING = new HashSet<string> { "flight", "checkride", "solo", "xc" };
        static readonly Dictionary<string, string> WHO_JA = new Dictionary<string, string>
            { { "chief", "真壁 主任教官" }, { "examiner", "黒田 審査官" } };

        static Dict Ret(string text, object who, object room, string at)
        {
            var d = new Dict();
            d["text"] = text;
            d["who"] = who; d["room"] = room; d["at"] = at;
            return d;
        }

        // s: { slot, plan: [{slot, kind, id, title, where, who, state}], decided,
        //      briefed, walk: {done, total}, graduated, doneText }
        public static Dict NextStep(Dict s)
        {
            var plan = new List<Dict>();
            var raw = Js.Arr(Js.Get(s, "plan"));
            if (raw != null) foreach (var x in raw) { var it = Js.Obj(x); if (it != null && Js.Str(it, "kind") != "off") plan.Add(it); }
            if (CareerLogic.Truthy(Js.Get(s, "graduated")))
                return Ret("修了しました。ラウンジで同期と話したり、航空日誌を見返したり（Tab）。寮は駐車場の先、自室のベッドで今日を終えられます", null, "outside", "entrance");
            if (plan.Count == 0)
                return Ret("今日は休日。ラウンジで休んでも、自習してもいい。寮の自室のベッドで寝ると次の日になります", null, "outside", "entrance");
            Dict cur = null;
            foreach (var x in plan)
            {
                string stt = Js.Str(x, "state");
                if (stt == "now" || stt == "retry" || stt == "later") { cur = x; break; }
            }
            if (cur == null)
            {
                bool evening = Js.Str(s, "slot") == "evening";
                var dt = Js.Get(s, "doneText");
                string doneTxt = dt is string ? (string)dt
                    : evening ? "今日の予定は終わり。寮の談話室で同期と話せます。自室のベッドで寝ると次の日になります"
                    : "今日の予定は終わりました。寮の自室のベッドで寝ると、次の日になります";
                return Ret(doneTxt, null, "outside", "entrance");
            }
            string later = Array.IndexOf(ORDER, Js.Str(cur, "slot")) > Array.IndexOf(ORDER, Js.Str(s, "slot"))
                ? SLOT_JA[Js.Str(cur, "slot")] + "：" : "";
            string kind = Js.Str(cur, "kind");
            if (FLYING.Contains(kind))
            {
                if (!CareerLogic.Truthy(Js.Get(s, "decided")))
                    return Ret($"{later}運航管理で今日の天気を見て、飛ぶかを決める（佐伯さんに話しかける）", "dispatcher", "dispatch", "person");
                if (!CareerLogic.Truthy(Js.Get(s, "briefed")))
                {
                    if (kind == "checkride")
                    {
                        string cwho = Js.Str(cur, "who") ?? "chief";
                        string whoJa = WHO_JA.ContainsKey(cwho) ? WHO_JA[cwho] : WHO_JA["chief"];
                        var d = new Dict { { "text", $"{later}審査の前に、{whoJa}のブリーフィングを受ける（教官室）" }, { "who", cwho }, { "room", null }, { "at", "person" } };
                        return d;
                    }
                    return kind == "xc"
                        ? Ret($"{later}ブリーフィング室 1 で、早瀬 教官から単独の野外飛行のブリーフィングを受ける", "instructor", "brief-1", "person")
                        : Ret($"{later}ブリーフィング室 1 で、早瀬 教官から今日の課目の説明を受ける", "instructor", "brief-1", "person");
                }
                var walk = Js.Obj(Js.Get(s, "walk"));
                if (walk != null && Js.Num(walk, "done") < Js.Num(walk, "total"))
                    return Ret($"駐機場の今日の機体で外部点検（{(long)Js.Num(walk, "done")} / {(long)Js.Num(walk, "total")}）。光る印の所を調べる（E）", null, "outside", "walk");
                return Ret("今日の機体に乗り込む（右の翼の付け根のドア：E）", null, "outside", "board");
            }
            string text; object who; object room;
            switch (kind)
            {
                case "ceremony": text = "ロビーで、真壁 主任教官の歓迎の言葉を聞く（近づいて E で話しかける）"; who = "chief"; room = "lobby"; break;
                case "tour": text = "運航管理（ロビーの北）の佐伯さんに話しかけて、訓練所を案内してもらう"; who = "dispatcher"; room = "dispatch"; break;
                case "brief": text = "ブリーフィング室 1 で、担当の早瀬 教官に会う"; who = "instructor"; room = "brief-1"; break;
                case "class": text = $"ブリーフィング室 2 で、ミラー講師の授業を受ける：{Js.Str(cur, "title")}"; who = "lecturer"; room = "brief-2"; break;
                case "ftd":
                    text = Js.Str(cur, "state") == "retry"
                        ? $"訓練装置室で、ミラー講師と{Js.Str(cur, "title")}をもう一度（Tab の「次の予定まで待つ」で、先へ進むこともできます）"
                        : $"訓練装置室で、ミラー講師と{Js.Str(cur, "title")}を受ける";
                    who = "lecturer"; room = "sim"; break;
                case "exam": {
                    string w2 = Js.Str(cur, "who");
                    text = $"{Js.Str(cur, "title")}を受ける（{(w2 == "lecturer" ? "ミラー講師" : "早瀬 教官")}に話しかける）";
                    who = w2; room = w2 == "lecturer" ? "planning" : "brief-1"; break;
                }
                case "navlog": text = "ブリーフィング室 1 で、早瀬 教官と航法ログを作る"; who = "instructor"; room = "brief-1"; break;
                case "graduation": text = "ロビーで修了式。真壁 主任教官に話しかける"; who = "chief"; room = "lobby"; break;
                case "study": text = Js.Str(cur, "title"); who = Js.Get(cur, "who"); room = Js.Get(cur, "where"); break;
                default: text = Js.Str(cur, "title"); who = Js.Get(cur, "who"); room = Js.Get(cur, "where"); break;
            }
            var outD = new Dict { { "text", later + text } };
            outD["who"] = who; outD["room"] = room;
            outD["at"] = who != null ? "person" : "room";
            return outD;
        }
    }

    // The academy's doors as a graph (BFS), over the converted academy spec.
    public class AcademyRouter
    {
        readonly List<Dict> openDoors = new List<Dict>();
        readonly List<Dict> rooms = new List<Dict>();

        public AcademyRouter(Dict spec)
        {
            var doors = Js.Arr(Js.Get(spec, "doors"));
            if (doors != null) foreach (var x in doors) { var d = Js.Obj(x); if (d != null && Js.Str(d, "kind") != "locked") openDoors.Add(d); }
            var rs = Js.Arr(Js.Get(spec, "rooms"));
            if (rs != null) foreach (var x in rs) { var r = Js.Obj(x); if (r != null) rooms.Add(r); }
        }

        static (double a, double c) Mid(Dict d)
        {
            if (Js.Str(d, "wall") == "a") return (Js.Num(d, "at"), (Js.Num(d, "from") + Js.Num(d, "to")) / 2);
            return ((Js.Num(d, "from") + Js.Num(d, "to")) / 2, Js.Num(d, "at"));
        }

        public Dict Next(string from, string to)
        {
            if (string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to) || from == to) return null;
            var prev = new Dictionary<string, (string room, Dict door)?>();
            prev[from] = null;
            var queue = new List<string> { from };
            while (queue.Count > 0)
            {
                string r = queue[0]; queue.RemoveAt(0);
                if (r == to) break;
                foreach (var d in openDoors)
                {
                    var rm = Js.Arr(Js.Get(d, "rooms"));
                    if (rm == null || rm.Count < 2) continue;
                    string r0 = rm[0] as string, r1 = rm[1] as string;
                    if (r0 != r && r1 != r) continue;
                    string o = r0 == r ? r1 : r0;
                    if (!prev.ContainsKey(o)) { prev[o] = (r, d); queue.Add(o); }
                }
            }
            if (!prev.ContainsKey(to)) return null;
            string cur = to;
            var step = prev[to];
            while (step.HasValue && step.Value.room != from) { cur = step.Value.room; step = prev[cur]; }
            if (!step.HasValue) return null;
            var m = Mid(step.Value.door);
            return new Dict { { "a", m.a }, { "c", m.c }, { "label", Js.Str(step.Value.door, "label_ja") ?? "" }, { "door", Js.Str(step.Value.door, "id") } };
        }

        public Dict Room(string id)
        {
            foreach (var r in rooms) if (Js.Str(r, "id") == id) return r;
            return null;
        }

        public Dict Centre(string id)
        {
            var r = Room(id);
            if (r == null) return null;
            return new Dict { { "a", (Js.Num(r, "a0") + Js.Num(r, "a1")) / 2 }, { "c", (Js.Num(r, "c0") + Js.Num(r, "c1")) / 2 } };
        }
    }
}
