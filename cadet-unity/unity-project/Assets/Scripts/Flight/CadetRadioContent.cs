// CADET — CadetRadioContent.cs : cadet/src/content/dialog/atc.js ported —
// the day's radio: LAB ATIS / Ground / Tower exchanges for the day's
// weather and aircraft, plus the LABEF CTAF self-announce set. Fictional
// frequencies and call signs, exactly as the JS content has them.
using System;
using System.Collections.Generic;
using System.Globalization;

using Dict = System.Collections.Generic.Dictionary<string, object>;

namespace Cadet
{
    public static class RadioContent
    {
        public static string CallFull = "Archer Seven Three Eight Sierra Yankee";
        public static string CallShort = "Archer 8SY";
        public static string CallSpoken = "Archer Eight Sierra Yankee";
        public static string CallReg = "N738SY";
        static readonly Dictionary<string, string[]> CALLS = new Dictionary<string, string[]>
        {
            { "pa28", new[] { "Archer Seven Three Eight Sierra Yankee", "Archer 8SY", "Archer Eight Sierra Yankee", "N738SY" } },
            { "pa44", new[] { "Seminole Four Five Two Sierra Yankee", "Seminole 2SY", "Seminole Two Sierra Yankee", "N452SY" } },
        };
        public static void SetCall(string type = "pa28")
        {
            var c = CALLS.TryGetValue(type ?? "pa28", out var v) ? v : CALLS["pa28"];
            CallFull = c[0]; CallShort = c[1]; CallSpoken = c[2]; CallReg = c[3];
        }
        public const string FreqAtis = "127.65", FreqGround = "121.7", FreqTower = "118.3";

        public static string OurCall(string text)
        {
            if (text == null) return null;
            var parts = CallFull.Split(' ');
            string mid = parts.Length >= 4 ? parts[2] + " " + parts[3] : CallFull;
            // JS: text.replace(/(Archer|Seminole) Seven Lima Alpha/g, CALL.full) — the whole match becomes CALL.full
            text = text.Replace("Archer Seven Lima Alpha", CallFull).Replace("Seminole Seven Lima Alpha", CallFull);
            text = text.Replace("Archer 7LA", CallShort).Replace("Seminole 7LA", CallShort);
            text = text.Replace("…Seven Lima…", "…" + mid + "…");
            return text;
        }
        public static string Spoken(string s)
        {
            if (s == null) return null;
            return s.Replace("Archer 8SY", CallSpoken).Replace("Seminole 2SY", CallSpoken);
        }

        static readonly string[] DIG = { "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "niner" };
        static string Digits(string s)
        {
            var outP = new List<string>();
            foreach (char c in s ?? "") { if (c == '.') outP.Add("point"); else if (c >= '0' && c <= '9') outP.Add(DIG[c - '0']); }
            return string.Join(" ", outP);
        }
        static string Cap(string s) { return s.Length == 0 ? s : char.ToUpperInvariant(s[0]) + s.Substring(1); }
        static string Swapped(string txt, double v)
        {
            var parts = txt.Split('.');
            string r = parts[0] + "." + parts[1][1] + parts[1][0];
            return r == txt ? (v - 0.1).ToString("F2", CultureInfo.InvariantCulture) : r;
        }
        static readonly Dictionary<string, string> CX = new Dictionary<string, string> { { "A2", "Alpha Two" }, { "A3", "Alpha Three" } };
        static string CxOf(string exit) { return exit != null && CX.TryGetValue(exit, out var v) ? v : exit; }

        static RadioLine L(string who, string en, string ja) { return new RadioLine { Who = who, En = en, Ja = ja }; }
        static RadioChoice C(string en, bool ok = false, string why = null, string negative = null) { return new RadioChoice { En = en, Ok = ok, Why = why, Negative = negative }; }
        static Exchange Ex(string station, string freq, string kind, string q = null, string note = null, double? time = null, List<RadioLine> hear = null, List<RadioChoice> choices = null, List<RadioLine> reply = null)
        {
            return new Exchange { Station = station, Freq = freq, Kind = kind, Q = q, Note = note, Time = time, Hear = hear ?? new List<RadioLine>(), Choices = choices ?? new List<RadioChoice>(), Reply = reply ?? new List<RadioLine>() };
        }

        public class DayWeather
        {
            public double WindMag = 10, WindKt = 5, Qnh = 29.92, TempC = 15, DewC = 8;
            public string Zulu = "1253", Info = "Alpha", Intent = "area", Runway = "36";
            public bool Solo, Xc, Ifr;
        }

        public static Radio DayRadio(DayWeather w)
        {
            w = w ?? new DayWeather();
            string rwySay = w.Runway == "18" ? "one eight" : "three six";
            bool pattern = w.Intent == "pattern";
            string goEn = pattern ? "for closed traffic" : "VFR to the practice area";
            string goJa = pattern ? "場周経路" : "訓練空域";
            double windDir = Js.Round(w.WindMag); if (windDir == 0) windDir = 360;
            string windSay = w.WindKt < 3 ? "wind calm" : $"wind {Digits(windDir.ToString("0", CultureInfo.InvariantCulture).PadLeft(3, '0'))} at {Digits(Js.Round(w.WindKt).ToString("0", CultureInfo.InvariantCulture))}";
            string windJa = w.WindKt < 3 ? "風は静穏" : $"風 {w.WindMag.ToString("0", CultureInfo.InvariantCulture).PadLeft(3, '0')}° {w.WindKt.ToString("0", CultureInfo.InvariantCulture)} kt";
            string qnhTxt = w.Qnh.ToString("F2", CultureInfo.InvariantCulture);
            string qnhSay = Digits(qnhTxt.Replace(".", ""));
            string info = w.Info, F = CallFull, S = CallShort;
            string sqEn = w.Xc ? ", squawk four two one five" : "", sqJa = w.Xc ? "スコーク 4215。" : "";
            string skyEn = w.Ifr ? "Visibility three, mist. Ceiling eight hundred broken, one thousand five hundred overcast" : "Visibility one zero. Few clouds at three thousand five hundred";
            string skyJa = w.Ifr ? "視程 3 SM、もや。雲底 800 ft（BKN）、1,500 ft に OVC" : "視程 10 SM。3,500 ft に少しの雲";
            string atis = $"LAB information {info}. {Cap(Digits(w.Zulu))} Zulu. {Cap(windSay)}. {skyEn}. "
                + $"Temperature {Digits(w.TempC.ToString("0", CultureInfo.InvariantCulture))}, dew point {Digits(w.DewC.ToString("0", CultureInfo.InvariantCulture).PadLeft(2, '0'))}. Altimeter {qnhSay}. {(w.Ifr ? "I L S runway three six approach in use. " : "")}Landing and departing runway {rwySay}. "
                + $"Advise on initial contact you have information {info}.";
            var X = new Dictionary<string, Exchange>();
            X["atis"] = Ex("ATIS", FreqAtis, "listen",
                q: "ATIS の高度計規正値は？（高度計の BARO に合わせる値）",
                hear: new List<RadioLine> { L("ATIS", atis, $"LAB の情報 {info[0]}。{w.Zulu.Substring(0, 2)}:{w.Zulu.Substring(2)} UTC。{windJa}。{skyJa}。気温 {w.TempC.ToString("0", CultureInfo.InvariantCulture)}℃・露点 {w.DewC.ToString("0", CultureInfo.InvariantCulture)}℃。高度計 {qnhTxt}。離着陸の滑走路 {w.Runway}。最初の交信で {info[0]} を聞いたと伝えよ。") },
                choices: new List<RadioChoice> { C(qnhTxt, true), C((w.Qnh + 0.1).ToString("F2", CultureInfo.InvariantCulture), why: "数字は 1 桁ずつ読まれます。もう一度聞いてみましょう。"), C(Swapped(qnhTxt, w.Qnh), why: $"数字の順番に気を付けて。「{qnhSay}」は {qnhTxt} です。") },
                note: $"高度計を {qnhTxt} に合わせ、表示が飛行場の標高（55 ft）に近いことを確かめます。", time: 30);
            X["gnd_call"] = Ex("GND", FreqGround, "call",
                q: "地上管制を最初に呼びます。正しい呼び方は？",
                choices: new List<RadioChoice>
                {
                    C($"LAB Ground, {F}, student pilot, at the east ramp with information {info}, {goEn}, request taxi.", true),
                    C($"LAB Ground, {S}, request taxi.", why: "最初の交信ではコールサインを省略しません（省略は管制官が先にしてから）。位置と ATIS も伝えます（AIM 4-2-3・4-2-4）。", negative: "Aircraft calling LAB Ground, say again your full call sign, position and request."),
                    C("Ground, Archer, ready to go, over.", why: "相手 → 自分 → 位置 → ATIS → 要求、の順です。“over” は使いません。", negative: "Station calling Ground, say again."),
                },
                reply: new List<RadioLine> { L("GND", $"{F}, LAB Ground, runway three six, taxi via Alpha, hold short of runway three six at Alpha One{sqEn}.", $"滑走路 36 へ。誘導路 A 経由、A1 で滑走路 36 の手前に止まれ。{sqJa}") }, time: 25);
            X["gnd_rb"] = Ex("GND", FreqGround, "readback",
                q: "タキシーの指示を復唱します。",
                choices: new List<RadioChoice>
                {
                    C($"Runway three six, taxi via Alpha, hold short of runway three six at Alpha One{sqEn}, {S}.", true),
                    C($"Taxi via Alpha, {S}.", why: "滑走路の手前で止まる指示（hold short）は必ず復唱します（AIM 4-3-18）。", negative: $"{S}, negative. Read back the hold short instruction: hold short of runway three six at Alpha One."),
                    C($"Runway three six, cleared for takeoff, {S}.", why: "「滑走路 36 へ」は離陸の許可ではありません。滑走路に入る許可でもありません。", negative: $"{S}, negative, you are not cleared for takeoff. Taxi via Alpha, hold short of runway three six at Alpha One."),
                },
                note: $"誘導路 A を南へ走り、A1 の停止線の手前で止まります。ランナップはそこで。今日は{goJa}です。{(w.Xc ? "トランスポンダーは 4215 に。" : "")}", time: 25);
            X["twr_ready"] = Ex("TWR", FreqTower, "call",
                q: "ランナップが終わりました。管制塔に出発の準備ができたことを伝えます。",
                choices: new List<RadioChoice>
                {
                    C($"LAB Tower, {F}, holding short runway three six at Alpha One, ready for departure, {goEn}{(w.Solo ? ", first solo" : w.Xc ? ", student pilot solo" : "")}.", true),
                    C($"LAB Ground, {S}, ready for departure.", why: "滑走路の手前まで来たら、周波数を管制塔（118.3）に変えて管制塔を呼びます（AIM 4-3-14）。", negative: $"{S}, LAB Ground, contact Tower one one eight point three."),
                    C($"LAB Tower, {S}, taking off runway three six.", why: "管制塔のある空港では、許可を受けてから滑走路に入ります。自分で離陸を宣言しません。", negative: $"{S}, LAB Tower, hold short of runway three six."),
                },
                reply: new List<RadioLine> { L("TWR", $"{CallShort}, LAB Tower, runway three six, line up and wait.", "滑走路 36 に入って待て。") }, time: 25);
            X["twr_luaw"] = Ex("TWR", FreqTower, "readback",
                q: "指示を復唱します。",
                choices: new List<RadioChoice>
                {
                    C($"Runway three six, line up and wait, {S}.", true),
                    C($"Runway three six, cleared for takeoff, {S}.", why: "“line up and wait” は離陸許可ではありません（AIM 5-2-5）。滑走路に入って止まり、許可を待ちます。", negative: $"{S}, negative, line up and wait runway three six."),
                    C($"Roger, {S}.", why: "滑走路に入る指示は、滑走路番号を付けて復唱します（AIM 4-4-7）。", negative: $"{S}, read back line up and wait."),
                },
                note: "停止線を越えて滑走路に入り、センターラインに合わせて止まります。", time: 25);
            X["twr_leave"] = Ex("TWR", FreqTower, "readback",
                hear: new List<RadioLine> { L("TWR", $"{S}, frequency change approved. Report returning.", "周波数の変更を承認。戻るときに報告せよ。") },
                q: "応答します。",
                choices: new List<RadioChoice>
                {
                    C($"Frequency change approved, will report returning, {S}.", true),
                    C("Bye.", why: "応答の最後にはコールサインを付けます（AIM 4-2-3）。", negative: $"{S}, say again."),
                    C($"Contact departure, {S}.", why: "言われたことをそのまま返します。今日は出発管制を呼ばずに、訓練空域へ向かいます。", negative: $"{S}, negative, frequency change approved."),
                }, time: 25);
            X["twr_back"] = Ex("TWR", FreqTower, "call",
                q: "訓練空域から戻ります。管制塔を呼びます。",
                choices: new List<RadioChoice>
                {
                    C($"LAB Tower, {F}, over the practice area, three thousand, with information {info}, inbound for landing.", true),
                    C($"LAB Tower, {S}, landing.", why: "最初の呼び出しでは、位置・高度・ATIS・意図を伝えます（AIM 4-3-2）。", negative: "Aircraft calling LAB Tower, say again your position and altitude."),
                    C($"LAB Ground, {F}, inbound.", why: "飛んでいる間の相手は管制塔（118.3）です。地上管制は地上を動く機を見ています。", negative: "Aircraft calling Ground, contact Tower one one eight point three."),
                },
                reply: new List<RadioLine> { L("TWR", $"{S}, LAB Tower, make straight-in runway three six, report final.", "滑走路 36 へ直線進入せよ。最終進入で報告せよ。") }, time: 25);
            X["twr_straight"] = Ex("TWR", FreqTower, "readback",
                q: "指示を復唱します。",
                choices: new List<RadioChoice>
                {
                    C($"Straight-in runway three six, report final, {S}.", true),
                    C($"Left downwind runway three six, {S}.", why: "直線進入（straight-in）の指示です。言われた入り方を、滑走路番号と一緒に復唱します。", negative: $"{S}, negative, make straight-in runway three six."),
                    C($"Roger, {S}.", why: "進入の方法と報告の地点を復唱します。Roger だけでは足りません。", negative: $"{S}, read back."),
                }, time: 25);
            X["twr_final"] = Ex("TWR", FreqTower, "call",
                q: "最終進入に入りました。報告します。",
                choices: new List<RadioChoice>
                {
                    C($"LAB Tower, {S}, final runway three six.", true),
                    C($"LAB Tower, {S}, cleared to land.", why: "許可はパイロットが言うものではありません。位置を報告して、許可を待ちます。", negative: $"{S}, report your position."),
                    C($"LAB Tower, {S}, downwind.", why: "いまは最終進入（final）です。位置を正しく伝えます。", negative: $"{S}, verify position."),
                },
                reply: new List<RadioLine> { L("TWR", $"{S}, runway three six, {windSay}, cleared to land.", $"滑走路 36、{windJa}、着陸を許可。") }, time: 20);
            X["twr_land"] = Ex("TWR", FreqTower, "readback",
                q: "着陸許可を復唱します。",
                choices: new List<RadioChoice>
                {
                    C($"Runway three six, cleared to land, {S}.", true),
                    C($"Cleared to land, {S}.", why: "着陸許可は滑走路番号を付けて復唱します（取り違えは滑走路誤進入の原因）。", negative: $"{S}, read back runway number."),
                    C($"Landing runway one eight, {S}.", why: "滑走路番号の取り違えは重大な誤りです。36 です。", negative: $"{S}, negative, runway three six, cleared to land."),
                }, time: 20);
            var radio = new Radio { CallShort = CallShort, WeatherInfo = w.Info, AtisText = atis };
            foreach (var kv in X) { var ex = kv.Value; radio.Exchanges[kv.Key] = _ => ex; }
            radio.Exchanges["twr_exit"] = exit => Ex("TWR", FreqTower, "readback",
                hear: new List<RadioLine> { L("TWR", $"{S}, turn right at {CxOf(exit)}, contact Ground point seven.", $"誘導路 {exit} で右に出よ。地上管制 121.7 と交信せよ。") },
                q: "指示を復唱します。",
                choices: new List<RadioChoice>
                {
                    C($"Right at {CxOf(exit)}, Ground point seven, {S}.", true),
                    C($"Left at {CxOf(exit)}, Ground point seven, {S}.", why: "右（right）です。曲がる向きの取り違えは、ほかの機や車とぶつかる原因になります。", negative: $"{S}, negative, turn right at {CxOf(exit)}."),
                    C($"Roger, {S}.", why: "出る誘導路と次の周波数を復唱します。", negative: $"{S}, read back."),
                },
                note: $"{exit} で滑走路を出て、停止線を越えたら止まり、地上管制を呼びます。", time: 25);
            radio.Exchanges["gnd_in"] = exit => Ex("GND", FreqGround, "call",
                q: "滑走路を出ました。地上管制を呼びます。",
                choices: new List<RadioChoice>
                {
                    C($"LAB Ground, {F}, clear of runway three six at {CxOf(exit)}, taxi to the east ramp.", true),
                    C($"LAB Ground, {S}, request taxi.", why: "どこにいて（滑走路を出た）、どこへ行きたいか（エプロン）を伝えます。", negative: $"{S}, say position."),
                    C($"LAB Tower, {S}, clear of the runway.", why: "「Ground point seven」と言われました。地上管制 121.7 に変えて呼びます。", negative: $"{S}, contact Ground point seven."),
                },
                reply: new List<RadioLine> { L("GND", $"{S}, LAB Ground, taxi to the east ramp via Alpha.", "誘導路 A 経由で東のエプロンへ。") }, time: 25);
            X["gnd_in_rb"] = Ex("GND", FreqGround, "readback",
                q: "指示を復唱します。",
                choices: new List<RadioChoice>
                {
                    C($"Taxi to the east ramp via Alpha, {S}.", true),
                    C($"Roger, {S}.", why: "地上の経路の指示も復唱します（AIM 4-3-18）。", negative: $"{S}, read back."),
                    C($"Taxi via Alpha, hold short of runway three six, {S}.", why: "今度は滑走路の手前で止まる指示はありません。言われたことだけを、そのまま返します。", negative: $"{S}, negative, taxi to the east ramp via Alpha."),
                },
                note: "駐機場で止まり、チェックリストでエンジンを止めます。交信はここまでです。", time: 25);
            radio.Exchanges["gnd_in_rb"] = _ => X["gnd_in_rb"];
            X["twr_takeoff"] = Ex("TWR", FreqTower, "readback",
                hear: new List<RadioLine> { L("TWR", $"{S}, runway three six, {windSay}, cleared for takeoff.", $"滑走路 36、{windJa}、離陸を許可。") },
                q: "離陸許可を復唱します。",
                choices: new List<RadioChoice>
                {
                    C($"Runway three six, cleared for takeoff, {S}.", true),
                    C($"Cleared for takeoff, {S}.", why: "離陸許可は滑走路番号を付けて復唱します（AIM 4-4-7）。", negative: $"{S}, read back runway number."),
                    C($"Runway three six, line up and wait, {S}.", why: "いま出たのは離陸の許可です。聞こえたとおりに返します。", negative: $"{S}, negative, runway three six, cleared for takeoff."),
                },
                note: "センターラインを保って、出力を全開にします。", time: 20);
            radio.Exchanges["twr_takeoff"] = _ => X["twr_takeoff"];
            X["twr_closed"] = Ex("TWR", FreqTower, "readback",
                hear: new List<RadioLine> { L("TWR", $"{S}, make left closed traffic runway three six, report midfield downwind.", "滑走路 36 の左場周経路を回れ。ダウンウインドの中間で報告せよ。") },
                q: "指示を復唱します。",
                choices: new List<RadioChoice>
                {
                    C($"Left closed traffic runway three six, report midfield downwind, {S}.", true),
                    C($"Right closed traffic runway three six, {S}.", why: "左（left）の場周経路です。滑走路 36 の左場周は、滑走路の西側を回ります。", negative: $"{S}, negative, make left closed traffic."),
                    C($"Roger, {S}.", why: "回る向きと報告の地点を復唱します。", negative: $"{S}, read back."),
                },
                note: "場周経路の高度（1,000 ft AGL）でダウンウインドに入ります。", time: 25);
            radio.Exchanges["twr_closed"] = _ => X["twr_closed"];
            X["twr_stopgo"] = Ex("TWR", FreqTower, "readback",
                hear: new List<RadioLine> { L("TWR", $"{S}, runway three six, {windSay}, cleared for takeoff, make left closed traffic.", $"滑走路 36、{windJa}、離陸を許可。左場周経路を回れ。") },
                q: "復唱します。",
                choices: new List<RadioChoice>
                {
                    C($"Runway three six, cleared for takeoff, left closed traffic, {S}.", true),
                    C($"Cleared for takeoff, {S}.", why: "滑走路番号と、離陸後の指示（左場周）も復唱します。", negative: $"{S}, read back runway and traffic pattern."),
                    C($"Runway three six, taxi to the ramp, {S}.", why: "もう一度離陸する許可です。駐機場へ戻る指示ではありません。", negative: $"{S}, negative, runway three six, cleared for takeoff."),
                },
                note: "フラップを上げ、出力を全開にして、もう一度離陸します。", time: 20);
            radio.Exchanges["twr_stopgo"] = _ => X["twr_stopgo"];
            radio.Sequences = new Dictionary<string, List<string>>
            {
                { "atis", new List<string> { "atis" } },
                { "ground", new List<string> { "gnd_call", "gnd_rb" } },
                { "tower", new List<string> { "twr_ready", "twr_luaw" } },
                { "leave", new List<string> { "twr_leave" } },
                { "takeoff", new List<string> { "twr_takeoff" } },
                { "closed", new List<string> { "twr_closed" } },
                { "stopgo", new List<string> { "twr_stopgo" } },
                { "back", new List<string> { "twr_back", "twr_straight" } },
                { "final", new List<string> { "twr_final", "twr_land" } },
                { "exit", new List<string> { "twr_exit" } },
                { "groundIn", new List<string> { "gnd_in", "gnd_in_rb" } },
            };
            return radio;
        }

        public static Radio CtafRadio()
        {
            string F = CallFull, S = CallShort, T = "LABEF traffic";
            Exchange Mk(string q, string ok, List<RadioChoice> wrongs, string note)
            {
                var choices = new List<RadioChoice> { C(ok, true) };
                choices.AddRange(wrongs);
                return Ex("CTAF", "122.9", "call", q: q, choices: choices, note: note, time: 30);
            }
            var radio = new Radio { CallShort = CallShort };
            var X = new Dictionary<string, Exchange>();
            X["ctaf_10"] = Mk("無管制の飛行場（LABEF）へ 10 マイル。最初の自家通報は？",
                $"{T}, {F}, one zero miles west of LABEF, two thousand five hundred, inbound for landing runway zero niner, LABEF.",
                new List<RadioChoice> { C($"{T}, {S}, landing runway zero niner.", why: "最初の通報はコールサインを省略せず、位置・高度・意図・滑走路を全部言います（AIM 4-1-9）。誰も答えはしません。"), C($"LABEF Tower, {F}, inbound for landing.", why: "無管制の飛行場に管制塔はありません。相手は「その空域の交通（traffic）」です。") },
                "答える者はいません。聞いている他機のために言うのです。LABEF は LAB の東にある草地、滑走路は 09（方位 090°）です。");
            X["ctaf_dw"] = Mk("ダウンウインドに入ります。自家通報は？",
                $"{T}, {S}, entering left downwind runway zero niner, LABEF.",
                new List<RadioChoice> { C($"{T}, {S}, downwind.", why: "入るレグと滑走路番号を言います。"), C($"LAB Tower, {S}, entering downwind.", why: "ここは無管制です。LAB の管制塔ではなく、その場の交通へ。") },
                "場周の他機は、この通報であなたの位置を知ります。09 の左場周は、滑走路の南側を西向きに飛びます。");
            X["ctaf_base"] = Mk("ベースへ曲がります。",
                $"{T}, {S}, turning left base runway zero niner, LABEF.",
                new List<RadioChoice> { C($"{T}, {S}, base.", why: "曲がるレグと滑走路を言います。") }, "");
            X["ctaf_fin"] = Mk("ファイナルに入ります。",
                $"{T}, {S}, final runway zero niner, full stop, LABEF.",
                new List<RadioChoice> { C($"{T}, {S}, cleared to land runway zero niner.", why: "無管制では「許可」は存在しません。自分の位置と意図（full stop）を言います。"), C($"{T}, {S}, final.", why: "滑走路番号と着陸の意図（full stop か touch and go か）を付けます。") },
                "先行機がいれば、その後ろに着く間隔も自分で取ります。草地は 900 m。接地は早めに、確実に。");
            X["ctaf_clear"] = Mk("滑走路を出ました。最後の通報は？",
                $"{T}, {S}, clear of runway zero niner, LABEF.",
                new List<RadioChoice> { C($"{T}, {S}, clear.", why: "出た滑走路の番号を言います。") }, "これで場周の他機は、滑走路が空いたことを知ります。");
            foreach (var kv in X) { var ex = kv.Value; radio.Exchanges[kv.Key] = _ => ex; }
            radio.Sequences = new Dictionary<string, List<string>> { { "ctaf", new List<string> { "ctaf_10", "ctaf_dw", "ctaf_base", "ctaf_fin", "ctaf_clear" } } };
            return radio;
        }
    }
}
