// CADET — CadetSyllabus.cs : syllabus.js's lesson definitions (the stages and
// every stepped flight lesson), ported 1:1. Display-only prose (why / brief /
// std / book / stage desc) also lives in data/syllabus.json (Stage 1 pipeline)
// and is loaded by the Unity layer; titles/goals are kept here too.
// Part 1: helpers, shared step builders, stages s0–s2.
using System;
using System.Collections.Generic;

using Dict = System.Collections.Generic.Dictionary<string, object>;

namespace Cadet
{
    public class SyllabusStage
    {
        public string Id, Title, Phase, Desc;
        public List<LessonDef> Lessons = new List<LessonDef>();
    }
    public class SyllabusPhase { public string Id, Title, Fact; public int No; }

    public static partial class Syllabus
    {
        static Dictionary<string, double> VOf(string id)
        {
            var a = FlightPhysics.AIRCRAFT.Find(x => x.Id == id);
            return a != null ? a.V : new Dictionary<string, double>();
        }
        public static readonly Dictionary<string, double> AR = VOf("pa28");
        public static readonly Dictionary<string, double> SM = VOf("pa44");
        public static readonly Dictionary<string, double> AW = VOf("pa28r");
        public static readonly Dictionary<string, double> JT = VOf("b737").Count > 0 ? VOf("b737")
            : new Dictionary<string, double> { { "rotate", 128 }, { "y", 150 }, { "cruise", 300 }, { "appr", 138 }, { "apprFlaps", 3 }, { "fe", 230 }, { "toFlaps", 1 } };
        static double AV(Dictionary<string, double> v, string k) { double x; return v.TryGetValue(k, out x) ? x : 0; }

        public static readonly Dictionary<string, string> KEYS = new Dictionary<string, string>
        {
            { "pitch", "S＝機首上げ・W＝機首下げ（離すとその姿勢を保つ）" }, { "roll", "A / D＝左右に傾ける" }, { "rud", "Q / E＝ラダー（ボールを中央へ）" },
            { "thr", "R＝スロットル増・F＝スロットル減（Shift で一気に全開 / アイドル）" }, { "trim", "T＝いまの速度でトリム（手放しで水平）" },
            { "flaps", "V＝フラップを 1 段下げる（最後まで行くと UP に戻る）" }, { "brake", "B / Space＝ブレーキ" }, { "gear", "G＝脚の上げ下げ" },
            { "feather", "[＝左のプロペラをフェザー・]＝右のプロペラをフェザー" }, { "rtrim", "Z / X＝ラダートリム 左 / 右（片発で足を楽に）" },
            { "prop", ", ＝プロペラレバーを引く（ガバナー設定を下げる）・. ＝プロペラレバーを前へ（設定を上げる）" },
            { "manin", "MFD の MAN IN（マニホールド圧）と RPM の 2 つの計器で出力を確かめる" },
            { "spoiler", "スピードブレーキ／スポイラー（トグルで出す／しまう。ブレーキの B とは別）" }, { "n1", "MFD の N1（%）・EGT（℃）・FF（燃料流量）で出力を確かめる" },
        };
        public static string K(params string[] a)
        {
            var parts = new List<string>();
            foreach (var x in a) { string v; parts.Add(KEYS.TryGetValue(x, out v) ? v : x); }
            return string.Join("　", parts);
        }

        static double W180(double a) { return School.W180(a); }
        static double ClampF(double x, double a, double b) { return x < a ? a : x > b ? b : x; }
        public static double DistNm(LessonState L, string id)
        {
            var w = Avionics.Wpt(id);
            return w != null ? Avionics.NeDistNm(School.Ne(L.S), new NePos(w.N, w.E)) : 99;
        }
        public static double RwyNm(LessonState L)
        {
            var s = School.Ne(L.S); var R = FlightPhysics.LAB_RWY;
            double dn = s.N - (R.N + 600), de = s.E - R.E;
            return Math.Sqrt(dn * dn + de * de) / 1852;
        }
        public static readonly FieldDef FIELD = BuildField();
        static FieldDef BuildField()
        {
            var ne = FlightPhysics.RwyToNE(FlightPhysics.LAB_RWY, -2600, 2400);
            return new FieldDef { N = ne[0], E = ne[1], Hdg = 360 };
        }
        public static double DistField(LessonState L)
        {
            var p = School.Ne(L.S);
            double dn = p.N - FIELD.N, de = p.E - FIELD.E;
            return Math.Sqrt(dn * dn + de * de);
        }
        public static int LiveSide(LessonState L) { return L.S.Eng[0].Failed ? 1 : -1; }
        public static string DeadName(LessonState L) { return L.S.Eng[0].Failed ? "左" : "右"; }

        public static Func<Ctx, LessonState, StepState, bool> Established(double kt, double tol, double after = 0, double giveUp = 30)
        {
            return (c, L, st) => st.T > after && (st.GetB("cap") || st.T > giveUp || (Math.Abs(c.Kias - kt) <= tol * L.Level.K && st.SetRet("cap", true)));
        }
        public static Func<Ctx, LessonState, StepState, bool> EstablishedVs(double fpm, double tol, double after = 0, double giveUp = 25)
        {
            return (c, L, st) => st.T > after && (st.GetB("capV") || st.T > giveUp || (Math.Abs(c.Vs - fpm) <= tol * L.Level.K && st.SetRet("capV", true)));
        }

        // small builders ------------------------------------------------------
        static TgtSpec T(double v, double tol, bool fx = false) { return new TgtSpec(v, tol, fx); }
        static TgtSpec TF(Func<LessonState, Ctx, double> f, double tol) { return new TgtSpec(f, tol); }
        static Dictionary<string, TgtSpec> TG(params (string, TgtSpec)[] xs)
        {
            var d = new Dictionary<string, TgtSpec>();
            foreach (var x in xs) d[x.Item1] = x.Item2;
            return d;
        }
        static GuideSpec G(double? kt = null, string pwr = null, double? fpm = null, int? flaps = null, bool? gear = null, double? bank = null, string how = null, bool pp = false)
        {
            var g = new GuideSpec { Kt = kt, Pwr = pwr, Fpm = fpm, Flaps = flaps, Gear = gear, Bank = bank, How = how };
            if (pp) g.Pp = true;
            return g;
        }
        static Row R(string name, string val, string std, bool pass, double? score = null)
        { return new Row { Name = name, Val = val, Std = std, Pass = pass, Score = score }; }

        // ------------------------------------------------------------- landing
        public class LandingOpt { public int? Flaps; public bool Twin, Short, Xwind; public double? TdSpdTol; }
        public static List<Step> LandingSteps(double vref, LandingOpt o = null)
        {
            o = o ?? new LandingOpt();
            int flaps = o.Flaps ?? (o.Twin ? 2 : 3);
            var steps = new List<Step>
            {
                new Step
                {
                    Name = "ファイナル（安定した進入）",
                    G = G(kt: vref, fpm: -Js.Round(vref * 5.3), flaps: flaps, gear: true, how: "approach"),
                    Keys = K("thr", "pitch", "roll", "rud"),
                    Say = $"ファイナル：{School.Num0(vref)} kt・3°（PAPI 赤 2 白 2）でセンターラインに乗る。地上 500 ft で安定していなければゴーアラウンド",
                    Tgt = TG(("spd", School.T_SPD(vref, 5)), ("cl", T(0, 30)), ("gp", T(3, 0.9))),
                    GradeWhen = (c, L, st) => c.AglR < 500 && c.AglR > 60 && c.Along < 250,
                    Until = (c, L, st) => c.AglR < 40 || c.OnGround, Max = 360, Grade = true,
                },
                new Step
                {
                    Name = o.Short ? "短距離接地" : "接地",
                    Keys = K("thr", "pitch", "brake"),
                    G = "目安：滑走路の端を越えたらアイドル（F）。地上 10〜15 ft から滑走路の先を見ながら S で少しずつ機首を上げ、最後は機首上げ 約 5〜8°。直し方：浮き上がったら引くのを止めて待つ、沈みが速ければ少し強く引く",
                    Say = o.Short ? "目標点（端から 300 m の太い標識）に接地。すぐにアイドル・ブレーキ（B）" : "滑走路の端を越えたらアイドル、地上 10〜15 ft でフレアして主輪から接地。止まるまでセンターラインを保つ",
                    Until = (c, L, st) => c.OnGround && c.GsK < 3, Max = 150,
                    Check = (c, L, st) =>
                    {
                        var td = L.S.Td;
                        if (td != null && st.GetO("td") == null && L.S.T - td.T < 2) { st.Set("td", td); L.Landings++; }
                        if (st.GetO("td") != null && c.OnGround) st.Set("stopAlong", c.Along);
                        return true;
                    },
                    Result = (L, st) =>
                    {
                        var td = st.GetO("td") as TdRecord;
                        double kk = L.Level.K;
                        if (td == null) return new List<Row> { R("接地", "していない", "—", false) };
                        double sink = Js.Round(300 * kk), du = td.Along - 300;
                        var zone = o.Short ? (Js.Round(-60 * kk), Js.Round(60 * kk)) : (Js.Round(-100 * kk), Js.Round(400 * kk));
                        double cl = Js.Round(6 * kk * 10) / 10;
                        var rows = new List<Row>
                        {
                            R("接地の降下率", $"{School.Num0(td.Fpm)} fpm", $"{School.Num0(sink)} fpm 以下", td.Fpm <= sink),
                            R("接地位置", $"目標点から {(du >= 0 ? "+" : "")}{Js.Round(du)} m", $"{zone.Item1}〜+{zone.Item2} m", du >= zone.Item1 && du <= zone.Item2),
                            R("センターライン", $"{Math.Abs(td.Cross).ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} m", $"{cl} m 以内", Math.Abs(td.Cross) <= cl && td.OnRunway),
                            R("接地の速度", $"{School.Num0(td.Kias)} kt", $"{vref - (o.TdSpdTol ?? 15)}〜{vref + 3} kt", td.Kias >= vref - (o.TdSpdTol ?? 15) && td.Kias <= vref + 3),
                            R("主輪から接地", td.NoseFirst ? "前輪から" : "主輪から", "前輪から接地しない", !td.NoseFirst),
                        };
                        if (o.Xwind)
                        {
                            rows.Add(R("接地時の横流れ", $"{Math.Abs(td.LatV).ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} m/s", $"{(1.5 * kk).ToString("F1", System.Globalization.CultureInfo.InvariantCulture)} m/s 以下", Math.Abs(td.LatV) <= 1.5 * kk));
                            rows.Add(R("機首方向（滑走路と平行）", $"{td.Crab.ToString("F0", System.Globalization.CultureInfo.InvariantCulture)}°", $"±{Js.Round(5 * kk)}°", td.Crab <= 5 * kk));
                        }
                        if (o.Short) rows.Add(R("停止距離", $"{Js.Round((st.GetD("stopAlong", td.Along)) - td.Along)} m", $"{Js.Round(400 * kk)} m 以内", (st.GetD("stopAlong", td.Along)) - td.Along <= 400 * kk));
                        if (td.Bounces > 0) rows.Add(R("バウンド", $"{td.Bounces} 回", "なし", false));
                        return rows;
                    },
                },
            };
            return steps;
        }

        public static Step TakeoffRoll(double vr, bool twin = false)
        {
            return new Step
            {
                Name = "離陸滑走とローテーション",
                Keys = K("thr", "rud", "pitch"),
                G = $"目安：スロットル全開（R を押し続ける）。右へ振られにくい双発以外は、プロペラの左偏向で機首が左へ行くので E（右ラダー）で押さえる。{School.Num0(vr)} kt で S を押して機首上げ 約 8〜10°（PFD の目盛り「10」の手前）にして浮揚",
                Say = $"フルパワー（R 長押し）。Q / E でセンターラインを保ち、{School.Num0(vr)} kt（Vr）でローテーション",
                Until = (c, L, st) => !c.OnGround && c.Agl > 3, Max = 90, Grade = true,
                Tgt = TG(("cl", T(0, 8))),
                GradeWhen = (c, L, st) => c.OnGround && c.Kias > 15,
                Check = (c, L, st) => { if (c.OnGround) st.Set("lastKias", c.Kias); return true; },
                Result = (L, st) =>
                {
                    double tol = Js.Round(5 * L.Level.K) + 2;
                    return new List<Row> { R("浮揚速度", $"{Js.Round(st.GetD("lastKias"))} kt", $"{School.Num0(vr)} ±{School.Num0(tol)} kt", Math.Abs(st.GetD("lastKias") - vr) <= tol) };
                },
            };
        }

        public static void PlaceFinal(LessonState L, double km = 6, int flaps = 3, double? kt = null)
        {
            kt = kt ?? AV(JT, "appr");
            var R = FlightPhysics.LAB_RWY; double D = km * 1000;
            var ne = FlightPhysics.RwyToNE(R, 300 - D, 0);
            double altFt = R.ElevFt + Math.Tan(3 * Math.PI / 180) * D * PhysMath.FT;
            Sim.PlaceInAir(L.S, ne[0], ne[1], altFt, R.TrueHdg, kt.Value, -3, flaps, null);
            L.S.GearDown = true; L.S.GearPos = 1;
            L.Hdg0 = 360; L.Alt0 = Js.Round(altFt);
            Sim.Derive(L.S);
        }

        public static Step JetGearUp(string say = null)
        {
            return new Step
            {
                Name = "正の上昇・脚上げ",
                G = G(kt: AV(JT, "y"), pwr: "full", how: "climbFull"),
                Keys = K("gear", "pitch"),
                Say = say ?? "正の上昇を確認して脚 UP（G）",
                Until = (c, L, st) => !c.GearDown || c.AglR > 600, Max = 60,
                Result = (L, st) => new List<Row> { R("脚上げ", !L.S.GearDown ? $"地上 {Js.Round(L.Last.AglR)} ft で UP" : "上げていない", "地上 500 ft まで", !L.S.GearDown && L.Last.AglR <= 600) },
            };
        }

        public class JetAccelOpt { public string Say; public double? ToAlt; public Action<LessonState, Ctx, StepState> OnEnd; }
        public static Step JetAccel(JetAccelOpt o = null)
        {
            o = o ?? new JetAccelOpt();
            return new Step
            {
                Name = "加速とフラップ退避",
                G = G(kt: 220, pwr: "full", how: "climbFull", flaps: 0),
                Keys = K("pitch", "flaps"),
                Say = o.Say ?? "加速。170 kt を過ぎたらフラップ UP（Shift+V）。機首の下がりを抑えながら 220 kt へ",
                Tgt = TG(("spd", School.T_SPD(220, 15))),
                GradeWhen = Established(220, 15, 4, 40),
                Until = (c, L, st) => c.Flaps == 0 && c.Kias >= 200 && (o.ToAlt == null || c.AglR >= o.ToAlt.Value),
                Max = 240, Grade = true,
                Check = (c, L, st) => { if (st.GetO("ret") == null && c.Flaps == 0) st.Set("ret", c.Kias); return true; },
                Result = (L, st) => new List<Row> { R("フラップ退避の速度", st.GetO("ret") != null ? $"{Js.Round(st.GetD("ret"))} kt" : "—", "165 kt 以上で UP（フラップ 5 の制限の内側で、失速にも近づかない）", st.GetO("ret") != null && st.GetD("ret") >= 160) },
                OnEnd = o.OnEnd,
            };
        }

        public static Step StallRecovery(double vMin)
        {
            return new Step
            {
                Name = "失速からの回復",
                Keys = K("pitch", "thr", "roll", "rud"),
                G = "目安：W で機首を水平線付近（0〜+5°）まで下げる → R で全開 → A / D で翼を水平。速度が付いたら上昇姿勢（約 +8°）へ。直し方：失速警報がまた鳴ったら引きすぎ。少し戻す",
                Say = "回復！ ①機首を下げて迎え角を減らす ②フルパワー ③翼を水平 ④速度が付いたら上昇へ",
                Until = (c, L, st) => c.Vs > 100 && c.Kias > vMin && st.T > 2, Max = 45, Grade = true,
                Tgt = TG(("hdg", School.T_HDG(20))),
                OnStart = (L, c, st) => { st.Set("min", c.Alt); st.Set("start", c.Alt); },
                Check = (c, L, st) => { st.Set("min", Math.Min(st.GetD("min", c.Alt), c.Alt)); if (st.T > 4 && c.Stall) st.Set("second", true); return true; },
                Result = (L, st) =>
                {
                    double lim = Js.Round(300 * L.Level.K);
                    return new List<Row>
                    {
                        R("回復で失った高度", $"{Js.Round(st.GetD("start") - st.GetD("min"))} ft", $"{School.Num0(lim)} ft 以内", st.GetD("start") - st.GetD("min") <= lim),
                        R("二次失速", st.GetB("second") ? "あり" : "なし", "なし", !st.GetB("second")),
                    };
                },
            };
        }
    }

    // StepState helper: set-and-return-true for the established() latch
    public static class StepStateExt
    {
        public static bool SetRet(this StepState st, string k, bool v) { st.Set(k, v); return v; }
    }
}
