// CADET — CadetSchoolRest.cs : school.js's grading finish, instructor hints,
// checklist / ATC dialogs, crash handling, free flight, and the progress
// record helpers (sanitizeProgress / noteLesson).
using System;
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public static partial class School
    {
        public static string InstructorHint(LessonState L, Step S, StepState st, Ctx c)
        {
            if (S.Tgt == null) return S.Hint != null ? S.Hint(c, L, st) ?? "" : "";
            string worstK = null; double worstR = 0, worstD = 0;
            foreach (var kv in st.Stats)
            {
                double r = Math.Abs(kv.Value.D) / kv.Value.Tol;
                if (r > 0.6 && (worstK == null || r > worstR)) { worstK = kv.Key; worstR = r; worstD = kv.Value.D; }
            }
            if (worstK == null) return S.Hint != null ? S.Hint(c, L, st) ?? "良い調子です。そのまま" : "良い調子です。そのまま";
            string k = worstK; double d = worstD; bool hi = d > 0;
            var g = S.G as GuideSpec;
            bool pitchForSpeed = g != null && (g.Pwr != null || new[] { "rate", "approach", "ils", "pattern", "slow", "glide", "climbFull", "oei" }.Contains(g.How));
            bool slow = g != null && g.How == "slow";
            long ad = (long)Js.Round(Math.Abs(d));
            switch (k)
            {
                case "alt": return slow ? (hi ? $"高度が {ad} ft 高い：パワーを少し絞る" : $"高度が {ad} ft 低い：パワーを足す（低速では高度はパワー）")
                    : hi ? $"高度が {ad} ft 高い：機首を 1〜2° 下げる（W を軽く）" : $"高度が {ad} ft 低い：機首を 1〜2° 上げ（S を軽く）、速度が落ちるならパワーも";
                case "aglR": return hi ? "高い：パワーを絞って降下率を増やす" : "低い：パワーを足して降下を浅く";
                case "spd": return pitchForSpeed ? (hi ? $"速度が {ad} kt 速い：機首を 1〜2° 上げる{(g.Pwr != null ? "（出力はそのまま）" : "")}" : $"速度が {ad} kt 遅い：機首を 1〜2° 下げる{(g.Pwr != null ? "（出力はそのまま）" : "")}")
                    : hi ? $"速度が {ad} kt 速い：パワーを少し絞る（F）" : $"速度が {ad} kt 遅い：パワーを少し足す（R）";
                case "hdg": return hi ? $"針路が右に {ad}° ずれ：左へ修正（A）" : $"針路が左に {ad}° ずれ：右へ修正（D）";
                case "trk": return hi ? "航跡が右へずれている：左へ修正（風上へ少し向ける）" : "航跡が左へずれている：右へ修正（風上へ少し向ける）";
                case "rhdg": return hi ? "滑走路の方位より右：左へ" : "滑走路の方位より左：右へ";
                case "dwhdg": return hi ? "滑走路と平行に：左へ" : "滑走路と平行に：右へ";
                case "abank": return hi ? "バンクが深い：少し浅く" : "バンクが浅い：もう少し傾ける";
                case "bank": return hi ? "バンクが右に深い：左へ戻す" : "バンクが左に深い：右へ戻す";
                case "arate": return hi ? "旋回が速い：バンクを浅く" : "旋回が遅い：バンクを少し深く";
                case "vs": return hi ? (g != null && g.Fpm < 0 ? "降下が浅い：パワーを少し絞る" : "上昇が速すぎる：パワーを少し絞る") : (g != null && g.Fpm < 0 ? "降下が速すぎる：パワーを少し足す" : "上昇が遅い：パワーを少し足す");
                case "cl": return hi ? "センターラインの右：左へ（Q ラダー・A）" : "センターラインの左：右へ（E ラダー・D）";
                case "xtk": return hi ? "航路の右にずれている：左へ修正" : "航路の左にずれている：右へ修正";
                case "gp": return d > 0 ? "進入が高い（PAPI の白が多い）：パワーを少し絞る" : "進入が低い（PAPI の赤が多い）：パワーを足す";
                case "cdi": case "loc": return d > 0 ? "CDI の針が右：右へ修正（針の方へ）" : "CDI の針が左：左へ修正（針の方へ）";
                case "gs": return d > 0 ? "グライドスロープより低い（菱形が上）：降下を浅く（パワー＋）" : "グライドスロープより高い（菱形が下）：降下率を増やす（パワー−）";
                default: return "";
            }
        }

        public static void FinishStep(LessonState L, Step S, StepState st, Ctx c, bool timeout)
        {
            var rows = new List<Row>();
            if (S.Grade && S.Tgt != null && S.GradeFinal)
            {
                foreach (var kv in st.Stats)
                {
                    var q = kv.Value; var lab = TGT_LABEL.ContainsKey(kv.Key) ? TGT_LABEL[kv.Key] : (kv.Key, "");
                    bool pass = Math.Abs(q.D) <= q.Tol;
                    rows.Add(new Row { Name = lab.Item1 + "（終了時）", Val = $"{(q.D >= 0 ? "+" : "")}{FmtD(q.D, kv.Key)} {lab.Item2}", Std = $"±{q.Tol} {lab.Item2}", Pass = pass, Score = pass ? 1 - Math.Abs(q.D) / q.Tol * 0.3 : 0 });
                }
            }
            else if (S.Grade && S.Tgt != null)
            {
                foreach (var kv in st.Stats)
                {
                    var q = kv.Value;
                    if (q.N < 0.5) continue;
                    double pct = q.InT / q.N; var lab = TGT_LABEL.ContainsKey(kv.Key) ? TGT_LABEL[kv.Key] : (kv.Key, "");
                    bool pass = pct >= 0.85 && q.Max <= q.Tol * 1.6;
                    rows.Add(new Row { Name = lab.Item1, Val = $"{Js.Round(pct * 100)}% が基準内（最大のずれ {FmtD(q.Max, kv.Key)} {lab.Item2}）", Std = $"±{q.Tol} {lab.Item2}", Pass = pass, Score = pct });
                }
            }
            if (st.Need != 0) rows.Add(new Row { Name = "連続保持", Val = $"最長 {st.HoldBest.ToString("F0", System.Globalization.CultureInfo.InvariantCulture)} 秒", Std = $"{st.Need} 秒続けて基準内", Pass = st.HoldBest >= st.Need - 0.05, Score = Clamp(st.HoldBest / st.Need, 0, 1) });
            if (S.Result != null) rows.AddRange(S.Result(L, st));
            if (timeout && S.Grade && st.Need == 0) rows.Add(new Row { Name = "制限時間", Val = "時間切れ", Std = $"{S.Max} 秒以内", Pass = false });
            if (st.Note != null) rows.Add(new Row { Name = "注意", Val = st.Note, Std = "", Pass = false });
            if (rows.Count > 0) L.Results.Add(new StepResult { Step = S.Name, Rows = rows });
            if (S.OnEnd != null) S.OnEnd(L, c, st);
            if (S.StopOnFail != null && rows.Exists(r => !r.Pass)) { EndLesson(L, false, S.StopOnFail); return; }
            NextStep(L, c);
        }

        // ---------------------------------------------------------------- checklists / ATC
        public static ChecklistItem ChecklistItemOf(LessonState L)
        {
            var K = L.Check; if (K == null) return null;
            var items = CHECKLISTS[K.Id].Items;
            return K.I < items.Count ? items[K.I] : null;
        }
        public static string ChecklistText(ChecklistItem it, State s) { return it.TextFn != null ? it.TextFn(s) : it.Text; }
        public static (bool ok, string item) ChecklistNext(LessonState L)
        {
            var K = L.Check; if (K == null || L.Done) return (false, null);
            var C = CHECKLISTS[K.Id];
            var it = K.I < C.Items.Count ? C.Items[K.I] : null;
            if (it != null && it.Test != null && !it.Test(L.S)) { L.Hint = $"{it.Name}：{ChecklistText(it, L.S)} にしてから確認"; return (false, it.Name); }
            K.I++;
            if (K.I >= C.Items.Count)
            {
                L.Check = null; L.St.Done = true;
                L.Results.Add(new StepResult { Step = C.Title, Rows = new List<Row> { new Row { Name = "チェックリスト", Val = "完了", Std = "全項目", Pass = true } } });
            }
            return (true, null);
        }

        public static (bool ok, string why, string right)? AnswerAtc(LessonState L, int i)
        {
            var q = L.Atc; if (q == null || L.Done) return null;
            bool ok = i == q.Ok;
            L.Results.Add(new StepResult { Step = "無線（復唱）", Rows = new List<Row> { new Row { Name = "応答", Val = ok ? "正しい" : $"誤り（正解：{q.Opts[q.Ok]}）", Std = "正しく復唱", Pass = ok } } });
            L.Atc = null;
            L.AtcResult = new Dict { { "ok", ok }, { "why", q.Why }, { "t", L.T }, { "i", (double)i } };
            L.St.Done = true;
            return (ok, q.Why, q.Opts[q.Ok]);
        }

        public static void Crashed(LessonState L, string reason)
        {
            if (L.Done) return;
            var c = L.Last;
            bool engineOut = L.Fail.ContainsKey("engine") || L.Fail.ContainsKey("engL") || L.Fail.ContainsKey("engR");
            bool gentle = c != null && engineOut && c.Vs > -800 && c.Kias < VOr(L.A, "glide", 76) + 12 && Math.Abs(c.Bank) < 20 && !reason.Contains("湖");
            if (gentle)
            {
                L.Results.Add(new StepResult { Step = "不時着", Rows = new List<Row> { new Row { Name = "結果", Val = "滑走路外へ不時着（機体は損傷・乗員は無事という想定）", Std = "安全に接地", Pass = true } } });
                EndLesson(L, true); return;
            }
            L.Results.Add(new StepResult { Step = "事故", Rows = new List<Row> { new Row { Name = "結果", Val = reason, Std = "安全に飛行を終える", Pass = false } } });
            EndLesson(L, false, reason);
        }

        public static void EndLesson(LessonState L, bool complete, string reason = "")
        {
            if (L.Done) return;
            L.Done = true; L.Reason = reason;
            var all = new List<Row>();
            foreach (var r in L.Results) all.AddRange(r.Rows);
            L.Passed = complete && all.Count > 0 && all.TrueForAll(r => r.Pass);
            double sum = 0; int n = 0;
            foreach (var r in all) { sum += r.Pass ? (r.Score != null ? 0.7 + 0.3 * r.Score.Value : 1) : 0.4 * (r.Score ?? 0); n++; }
            double avg = n > 0 ? sum / n : 0;
            L.Score = avg;
            L.Grade = !complete ? "―" : L.Passed ? (avg > 0.97 ? "S" : avg > 0.92 ? "A" : "B") : "C";
            int passN = 0; foreach (var r in all) if (r.Pass) passN++;
            L.PassPct = all.Count > 0 ? (int)Js.Round((double)passN / all.Count * 100) : 0;
        }

        public static void Abort(LessonState L, string reason = "途中で終了")
        {
            if (!L.Done) { L.Results.Add(new StepResult { Step = "中断", Rows = new List<Row> { new Row { Name = "結果", Val = reason, Std = "", Pass = false } } }); EndLesson(L, false, reason); }
        }

        // ---------------------------------------------------------------- free flight
        public class FreeStart { public string Id, Name; public SetupDef Su; }
        public static readonly List<FreeStart> FREE_STARTS = new List<FreeStart>
        {
            new FreeStart { Id = "rwy", Name = "LAB RWY 36（滑走路上・停止）", Su = new SetupDef { At = "runway" } },
            new FreeStart { Id = "pattern", Name = "場周経路のダウンウインド（1,000 ft AGL）", Su = new SetupDef { At = "downwind" } },
            new FreeStart { Id = "final", Name = "最終進入 5 km（3° のパス上）", Su = new SetupDef { At = "final", Km = 5 } },
            new FreeStart { Id = "area", Name = "訓練空域 上空 3,000 ft", Su = new SetupDef { At = "area" } },
            new FreeStart { Id = "ils", Name = "ILS 進入の開始点（2,000 ft）", Su = new SetupDef { At = "ils", Nav = "ILS" } },
            new FreeStart { Id = "sfb", Name = "Sanford 上空 1,500 ft（Google 3D の確認用）", Su = new SetupDef { At = "away", From = "sfb", N = -9000, E = -2000, AltFt = 1500, Hdg = 360, Kt = 100 } },
        };

        public class FreeOpt
        {
            public int Seed = 7; public double? OatDev, GainCap; public string Sens; public bool AutoRud, Assist;
            public (double rel, double kt, double gust)? Wind;
            public (double topRel, double topKt, double topFt)? WindTop;
            public Loading Loading;
        }

        public static LessonState StartFree(string startId = "rwy", string aircraft = "pa28", FreeOpt opt = null)
        {
            opt = opt ?? new FreeOpt();
            var st = FREE_STARTS.Find(x => x.Id == startId) ?? FREE_STARTS[0];
            var s = Sim.NewState(opt.Seed != 0 ? opt.Seed : 7, aircraft);   // JS: opt.seed || 7
            s.OatDev = opt.OatDev ?? 0;
            s.Opts.GainCap = opt.GainCap ?? 1.7;
            s.Opts.Sens = opt.Sens ?? "low"; s.Opts.AutoRud = opt.AutoRud; s.Opts.Assist = opt.Assist;
            var W = opt.Wind ?? (10.0, 5.0, 0.5);
            s.Wind = new WindState { FromDeg = W360(FlightPhysics.LAB_RWY.TrueHdg + W.Item1), Kt = W.Item2, Gust = W.Item3 };
            if (opt.WindTop != null) { s.Wind.TopFrom = W360(FlightPhysics.LAB_RWY.TrueHdg + opt.WindTop.Value.topRel); s.Wind.TopKt = opt.WindTop.Value.topKt; s.Wind.TopFt = opt.WindTop.Value.topFt; }
            var call = CallOf(s.A);
            var L = new LessonState
            {
                Id = "free", Free = true, Def = new LessonDef { Title = "自由飛行", Steps = new List<Step>() }, Level = LEVELS[0],
                S = s, Av = Avionics.CreateAvionics(), Call = call.spoken, CallShort = call.short_,
            };
            Sim.ApplyLoading(s, opt.Loading ?? new Loading());
            if (st.Id == "sfb") { Sim.PlaceInAir(s, -9000, -2000, 1500, Avionics.MagToTrue(360, FlightPhysics.MAGVAR_W), 100, 0, 0, null); L.Alt0 = 1500; L.Hdg0 = 360; L.Av.Baro = s.Qnh; }
            else Place(L, st.Su);
            L.Last = CtxOf(L);
            return L;
        }

        public static void FreeUpdate(LessonState L, double dt)
        {
            var c = CtxOf(L, dt); L.Last = c; L.T += dt;
            if (L.T >= L.NextSample) { L.NextSample = L.T + 2; if (L.HistAlt.Count < 1800) { L.HistAlt.Add(Js.Round(c.Alt)); L.HistIas.Add(Js.Round(c.Kias)); } }
        }

        // ---------------------------------------------------------------- progress (school.js's sanitizeProgress / noteLesson)
        public static Prog SanitizeProgress(Dict p)
        {
            var outP = new Prog();
            if (p == null) return outP;
            var lessons = Js.Obj(Js.Get(p, "lessons"));
            if (lessons != null) foreach (var kv in lessons)
            {
                if (!System.Text.RegularExpressions.Regex.IsMatch(kv.Key, "^[a-z0-9_]{1,12}$")) continue;
                var v = Js.Obj(kv.Value); if (v == null) continue;
                var r = new Prog.Rec();
                r.Tries = (int)Clamp(Js.Round(Js.Num(v, "tries")), 0, 99999);
                string best = Js.Str(v, "best");
                r.Best = best != null && new[] { "S", "A", "B", "C", "―" }.Contains(best) ? best : "";
                r.Pass = CareerLogic.Truthy(Js.Get(v, "pass"));
                object sc = Js.Get(v, "score");
                r.HasScore = sc is double;
                r.Score = (int)Clamp(Js.Round(Js.Num(v, "score")), 0, 100);
                var lv = Js.Arr(Js.Get(v, "levels"));
                if (lv != null) foreach (var x in lv) { string xs = x as string; if (xs != null && LEVELS.Exists(l => l.Id == xs) && r.Levels.Count < 3) r.Levels.Add(xs); }
                outP.Lessons[kv.Key] = r;
            }
            return outP;
        }

        public static Prog NoteLesson(Prog prog, LessonState L)
        {
            if (L == null || L.Free || !L.Done) return prog;
            Prog.Rec rec;
            if (!prog.Lessons.TryGetValue(L.Id, out rec)) { rec = new Prog.Rec(); prog.Lessons[L.Id] = rec; }
            rec.Tries++;
            if (L.Passed) { rec.Pass = true; if (!rec.Levels.Contains(L.Level.Id)) rec.Levels.Add(L.Level.Id); }
            var rank = new Dictionary<string, int> { { "S", 4 }, { "A", 3 }, { "B", 2 }, { "C", 1 }, { "―", 0 }, { "", -1 } };
            int cur; if (!rank.TryGetValue(rec.Best ?? "", out cur)) cur = -1;
            int nw; if (!rank.TryGetValue(L.Grade ?? "", out nw)) nw = -1;
            if (nw > cur) rec.Best = L.Grade;
            rec.HasScore = true;
            rec.Score = Math.Max(rec.Score, (int)Clamp(Js.Round(L.Score * 100), 0, 100));
            return prog;
        }
    }

    public static class ArrExt
    {
        public static bool Contains(this string[] a, string v) { return Array.IndexOf(a, v) >= 0; }
    }
}
