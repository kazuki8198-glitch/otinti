// CADET — CadetSchool.cs : port of flight-lab/src/school.js — the lesson
// engine (context, step machine, grading, checklists, ATC read-backs, free
// flight, progress records). Lesson definitions live in CadetSyllabus.cs.
// State access goes through the typed physics State (CadetPhysics.cs), whose
// fields mirror the JS state one-to-one.
using System;
using System.Collections.Generic;
using System.Globalization;

using Dict = System.Collections.Generic.Dictionary<string, object>;
using Lst = System.Collections.Generic.List<object>;

namespace Cadet
{
    public class LevelDef { public string Id, Name, En, Desc; public double K, HoldK; public bool Hints, Guide; }

    public class GuideSpec
    {
        public double? Kt, Fpm, Bank;
        public string Pwr, How;
        public int? Flaps;
        public bool? Gear, Pp, Oei;
    }

    public class TgtSpec
    {
        public Func<LessonState, Ctx, double> Fn;   // value as a function of the lesson (or null)
        public double Value;                        // constant value (when Fn == null)
        public double Tol;
        public bool Fixed;                          // spec[2] === 'fixed': tolerance not scaled by level.k
        public TgtSpec(double v, double tol, bool fix = false) { Value = v; Tol = tol; Fixed = fix; }
        public TgtSpec(Func<LessonState, Ctx, double> f, double tol, bool fix = false) { Fn = f; Tol = tol; Fixed = fix; }
        public double Eval(LessonState L, Ctx c) { return Fn != null ? Fn(L, c) : Value; }
    }

    public class AtcQ { public string Msg, Why; public List<string> Opts; public int Ok; }

    public class Step
    {
        public string Name, Keys, Say, Checklist, Fail, Upset, StopOnFail, Estimate;
        public object G;                 // GuideSpec | string | Func<LessonState, GuideSpec>
        public Dictionary<string, TgtSpec> Tgt;
        public double? Hold, Max, Dur, PropTo;
        public bool Grade, GradeFinal, Observe, HoodOn, HoodOff;
        public object Atc;               // string (ATC_Q key) | Func<LessonState, AtcQ>
        public Func<Ctx, LessonState, StepState, bool> Until, Check, GradeWhen;
        public Action<LessonState, Ctx, StepState> OnStart, OnEnd;
        public Func<LessonState, StepState, List<Row>> Result;
        public Func<Ctx, LessonState, StepState, string> Hint;
        public FieldDef Field;   // e4's off-field landing site (shown by the UI layer)
    }
    public class FieldDef { public double N, E, Hdg; }

    public class SetupDef
    {
        public string At, Nav, From;
        public double? Kt, Hdg, AltFt, Flaps, Thr, Gamma, N, E, Along, Cross, Km, Brg, Offset, IntHdg, Qnh;
        public bool? Gear, Calm, Hood, Toward;
        public (double rel, double kt, double gust)? Wind;
        public int? Obs; public double? ObsOff;
        public List<string> Fpl;
        public string Aircraft;
        public Action<LessonState> OnStart;
    }

    public class LessonDef
    {
        public string Id, Title, Goal, Why, Std, Aircraft;
        public List<string> Brief, Book;
        public SetupDef Setup;
        public List<Step> Steps;
        public bool AutoRud;
        // ground lessons (k1..k6): no steps; driven by the ground-school layer
        public string Tutor, Radio;
        public bool Read;
    }

    public class Row { public string Name, Val, Std; public bool Pass; public double? Score; public string Key; public double? Pct, Max, Tol; }   // Key/Pct/Max/Tol: analysis.js row extras (spread rows)
    public class StepResult { public string Step; public List<Row> Rows = new List<Row>(); }
    public class CheckState { public string Id; public int I; }
    public class TgtStat { public double N, InT, Max, Tol, Tv, D; public bool Inside; }

    public class StepState
    {
        public double T, Turned, HoldT, HoldBest, Need;
        public double? LastHdg;
        public string Note;
        public bool Done;
        public Dictionary<string, TgtStat> Stats = new Dictionary<string, TgtStat>();
        public Dict Extra = new Dict();
        public double GetD(string k, double def = 0) { object v; return Extra.TryGetValue(k, out v) && v is double ? (double)v : def; }
        public bool GetB(string k) { object v; return Extra.TryGetValue(k, out v) && v is bool && (bool)v; }
        public object GetO(string k) { object v; return Extra.TryGetValue(k, out v) ? v : null; }
        public void Set(string k, object v) { Extra[k] = v; }
    }

    public class Ctx
    {
        public double Dt, T, Alt, AltTrue, Agl, AglR, Kias, Tas, GsK, Hdg, Trk, Pitch, Bank, Vs, Rate;
        public double Along, Cross, RwyHdg, Thr, Prop, Rpm, ManIn, PropK, GearPos, LatV, Gp, Cl, Cdi, Loc, Gsd, DmeV, BrgV;
        public int Flaps, EngRun;
        public bool GearDown, OnGround, Paved, Stall, NavFlag, Crashed;
        public double G, Beta;
        public double? Dis, Xtk;
        public TdRecord Td;
    }

    public class LessonState
    {
        public string Id;
        public LessonDef Def;
        public LevelDef Level;
        public State S;
        public AvionicsState Av;
        public Aircraft A { get { return S.A; } }
        public int StepIdx = -1;
        public List<StepResult> Results = new List<StepResult>();
        public double T, Alt0, Hdg0;
        public string PosStr;   // JS L.posStr — never set by any lesson; ATC mayday falls back
        public string Call, CallShort, WindStr, Reason = "", Grade = "", Dest;
        public Dictionary<string, double> Fail = new Dictionary<string, double>();
        public bool Hood, Done, Passed, Free;
        public double? PrevHdg, IntHdg;
        public double RateF, NextSample, HintT, Score;
        public int PassPct, Landings, Chime;
        public List<double> HistAlt = new List<double>(), HistIas = new List<double>();
        public Ctx Last;
        public StepState St;
        public CheckState Check;
        public AtcQ Atc;
        public Dict AtcResult;
        public string GuideText = "", SayText = "", KeysText = "", Hint = "";
        public Dict Extra = new Dict();
    }

    public class StartOpt
    {
        public int Seed = 7;
        public double? OatDev, GainCap;
        public string Sens;
        public bool? AutoRud, Assist;
        public Loading Loading;
        public WindOpt Wind;
        public class WindOpt { public double FromDeg, Kt; public double? Gust, TopFrom, TopKt, TopFt; }
    }

    public static partial class School
    {
        public const double DEG = Math.PI / 180;
        public static double Clamp(double v, double a, double b) { return v < a ? a : v > b ? b : v; }
        public static double Fin(double v, double d = 0) { return double.IsNaN(v) || double.IsInfinity(v) ? d : v; }
        public static double W180(double a) { return ((a % 360) + 540) % 360 - 180; }
        public static double W360(double a) { return ((a % 360) + 360) % 360; }
        public static double R5(double x) { return Js.Round(x / 5) * 5; }
        public static double R50(double x) { return Js.Round(x / 50) * 50; }
        public static string Num0(double v) { return v.ToString("n0", CultureInfo.InvariantCulture); }

        public static readonly List<LevelDef> LEVELS = new List<LevelDef>
        {
            new LevelDef { Id = "intro", Name = "導入", En = "Introduction", K = 1.5, HoldK = 0.5, Hints = true, Guide = true, Desc = "許容幅を基礎の 1.5 倍に広げ、連続保持の時間を半分に。目安（姿勢と出力）と教官のヒントをすべて表示。" },
            new LevelDef { Id = "basic", Name = "基礎", En = "Basic", K = 1.0, HoldK = 1.0, Hints = true, Guide = true, Desc = "許容幅は FAA 自家用操縦士 ACS（実地試験基準）を参考にした値。目安とヒントを表示。" },
            new LevelDef { Id = "precision", Name = "精度", En = "Precision", K = 0.6, HoldK = 1.5, Hints = false, Guide = false, Desc = "許容幅を基礎の 6 割に狭め、連続保持を 1.5 倍に。目安とヒントは出さない（事業用・計器飛行の水準を意識した教材用の上級目標）。" },
        };
        public static LevelDef Level(string id) { return LEVELS.Find(l => l.Id == id) ?? LEVELS[0]; }

        static string PitchTxt(double p)
        {
            long v = (long)Js.Round(p);
            return v == 0 ? "ほぼ水平（0°）" : $"機首{(v > 0 ? "上げ" : "下げ")} 約 {Math.Abs(v)}°";
        }
        static string AiRef(double p)
        {
            double a = Math.Abs(p);
            if (a < 1.5) return "PFD の姿勢表示で、黄色い機体記号を水平線（青と茶の境）に合わせる";
            return $"PFD の姿勢表示で、黄色い機体記号を水平線の{(p > 0 ? "上" : "下")}へ{(a < 4 ? "少しだけ（目盛り 2.5° の 1 本分くらい）" : a < 7 ? "目盛り 2 本分（約 5°）" : a < 12 ? "目盛りの「10」の手前くらい" : "目盛りの「10」より先")}";
        }
        static string PwrTxt(SteadyResult ss, GuideSpec o, Aircraft A)
        {
            if (o.Pwr == "dead") return A != null && A.Twin ? "片方のエンジンが停止（もう片方は全開）" : "エンジン停止（プロペラは風で回るだけ）";
            if (A != null && A.Jet)
            {
                string n1 = ss.Rpm != 0 ? $"（N1 約 {Js.Round(ss.Rpm / 52)}%）" : "";
                if (o.Pwr == "full") return $"スロットル全開{n1}";
                if (o.Pwr == "idle") return $"スロットル アイドル{n1}";
                return $"スロットル 約 {R5(ss.Thr * 100)}%{n1}";
            }
            if (o.Pwr == "full") return $"スロットル全開{(ss.Rpm != 0 ? $"（約 {Num0(R50(ss.Rpm))} rpm）" : "")}";
            if (o.Pwr == "idle") return $"スロットル アイドル{(ss.Rpm != 0 ? $"（約 {Num0(R50(ss.Rpm))} rpm）" : "")}";
            return $"スロットル 約 {R5(ss.Thr * 100)}%{(ss.Rpm != 0 && !(A != null && A.Cs) ? $"（約 {Num0(R50(ss.Rpm))} rpm）" : "")}";
        }

        public static string GuideText(State s, GuideSpec o, LessonState L)
        {
            var A = s.A;
            var opt = new SteadyOpts { AltFt = L != null ? L.Alt0 : 3000, Gear = !A.Gear.Fixed ? (o.Gear ?? false) : true, Flaps = o.Flaps ?? 0, Bank = o.Bank ?? 0, Pwr = o.Pwr, Oei = o.Oei ?? false };
            if (o.Pwr == "dead" && A.Twin) { opt.Pwr = "full"; opt.Oei = true; }
            var ss = Sim.SteadyState(s, o.Kt ?? 0, o.Fpm ?? 0, opt);
            if (!ss.Ok) return $"目安：この機体では全開でも {o.Kt} kt・{o.Fpm} fpm は出せません。速度を優先してください。";
            string how = HOW[o.How ?? "level"];
            string rate = o.Pwr != null ? $"（昇降率 約 {(ss.Fpm >= 0 ? "+" : "")}{Num0(R50(ss.Fpm))} fpm）" : "";
            string flapTxt = o.Flaps != null ? $"・フラップ {A.FlapLabels[o.Flaps.Value]}" : "";
            string gearTxt = !A.Gear.Fixed ? $"・脚 {(o.Gear == true ? "DOWN" : "UP")}" : "";
            return $"目安：{PwrTxt(ss, o, A)}・{PitchTxt(ss.Pitch)}{rate}{(o.Bank != null ? $"・バンク {o.Bank}°" : "")}{flapTxt}{gearTxt}。{AiRef(ss.Pitch)}。直し方：{how}。";
        }

        public static string StepGuide(Step S, LessonState L)
        {
            if (S == null || S.G == null) return "";
            GuideSpec g;
            if (S.G is string) return (string)S.G;
            if (S.G is Func<LessonState, GuideSpec>) g = ((Func<LessonState, GuideSpec>)S.G)(L);
            else g = (GuideSpec)S.G;
            string t = GuideText(L.S, g, L);
            if (g.Pp == true) t = System.Text.RegularExpressions.Regex.Replace(t, "。PFD の姿勢表示で[^。]*。", "。PFD の姿勢表示は故障中：右下の予備の姿勢指示器と、高度・昇降率・航跡の変化で判断。");
            return t;
        }

        // target helpers (school.js's T_ALT / T_HDG / T_SPD / stepSL / stepTurn)
        public static TgtSpec T_ALT(double tol = 100) { return new TgtSpec((L, c) => L.Alt0, tol); }
        public static TgtSpec T_HDG(double tol = 10) { return new TgtSpec((L, c) => L.Hdg0, tol); }
        public static TgtSpec T_SPD(double kt, double tol = 10) { return new TgtSpec(kt, tol); }

        public static Step StepSL(string name, double kt, double hold = 20, Action<Step> extra = null)
        {
            var st = new Step
            {
                Name = name,
                G = new GuideSpec { Kt = kt, How = "level" },
                Say = $"直線水平飛行：高度 {{alt0}} ft・針路 {{hdg0}}°・{kt} kt を保つ",
                Tgt = new Dictionary<string, TgtSpec> { { "alt", T_ALT() }, { "hdg", T_HDG() }, { "spd", T_SPD(kt) } },
                Hold = hold, Max = 150, Grade = true,
                GradeWhen = (c, L, s) => s.T > 4,
            };
            if (extra != null) extra(st);
            return st;
        }

        public static List<Step> StepTurn(double dir, double bank, string name, double kt = 100, Dictionary<string, TgtSpec> extraTgt = null, Action<Step> extra = null)
        {
            string side = dir < 0 ? "左" : "右";
            var main = new Step
            {
                Name = name,
                G = new GuideSpec { Kt = kt, Bank = bank, How = "turn" },
                Keys = "A / D でバンク、S で少し引く、R でパワー少し",
                Say = $"{side}へバンク {bank}° で 360° 旋回。高度 {{alt0}} ft を保つ（少し引いてパワーを足し、沈みを防ぐ）",
                Tgt = new Dictionary<string, TgtSpec> { { "alt", T_ALT() }, { "abank", new TgtSpec(bank, 5) } },
                GradeWhen = (c, L, s) => Math.Abs(s.Turned) > 25 && Math.Abs(s.Turned) < 330,
                Until = (c, L, s) => Math.Abs(s.Turned) >= 345 - bank / 2,
                Max = 150, Grade = true,
                Check = (c, L, s) => { if (Math.Abs(s.Turned) > 20 && Math.Sign(s.Turned) != dir) s.Note = "旋回方向が逆です"; return false; },
            };
            if (extraTgt != null) foreach (var kv in extraTgt) main.Tgt[kv.Key] = kv.Value;
            var roll = new Step
            {
                Name = $"{name}：ロールアウト",
                G = new GuideSpec { Kt = kt, How = "level" },
                Say = "開始時の針路 {hdg0}° で翼を水平に戻す（バンク角の半分くらい手前から戻し始める）",
                Tgt = new Dictionary<string, TgtSpec> { { "hdg", T_HDG() }, { "alt", T_ALT() } },
                Until = (c, L, s) => Math.Abs(c.Bank) < 5 && s.T > 2,
                Max = 20, Grade = true, GradeFinal = true,
            };
            if (extra != null) { extra(main); }
            return new List<Step> { main, roll };
        }
    }
}
