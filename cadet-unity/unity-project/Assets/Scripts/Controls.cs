// Controls.cs — faithful C# port of cadet/src/flight/controls.js, keyboard path.
// (The gamepad path — padInput / padMapOf — is not in the vertical slice; see PORT-CHECKLIST §11.)
// Keys are read through IKeySet so the same mapping code runs on real Unity input and on the
// automated test's virtual keys. Action texts are the JS instructor explanations, unchanged.
using System;
using System.Collections.Generic;

namespace Cadet
{
    public interface IKeySet { bool Has(string code); bool Shift { get; } }

    public sealed class VirtualKeySet : IKeySet
    {
        public readonly HashSet<string> Down = new HashSet<string>();
        public bool ShiftFlag;
        public bool Has(string code) => Down.Contains(code);
        public bool Shift => ShiftFlag;
    }

    public sealed class ControlsPrefs
    {
        // PREFS0 of controls.js (CADET's defaults: pitch hold 'spring' = OFF, bank hold 'hold', low sensitivity)
        public string Hold = "spring", RHold = "hold", Sens = "low";
        public bool AutoRud = false, Assist = false;
        public double GainCap = 1.7, PadDz = 0.12, HoldSens = 1;
    }

    public sealed class Controls
    {
        public ControlsPrefs Prefs = new ControlsPrefs();
        public double RTrim;
        public double ThrHeld;
        public bool ParkBrake;
        public double BrAmt;
        public string Kind = "";
        private readonly HashSet<string> muted = new HashSet<string>();
        private bool arm;
        private static readonly IKeySet NOKEYS = new VirtualKeySet();
        private IKeySet keys = NOKEYS;

        public static readonly string[] FLY_HELD = { "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "PageUp", "PageDown", "KeyW", "KeyS", "KeyA", "KeyD", "KeyQ", "KeyE", "KeyR", "KeyF", "KeyB" };
        private static readonly Dictionary<string, string[]> KEY_ACTS = new Dictionary<string, string[]>
        {
            ["KeyV"] = new string[] { "flaps", "flapsUp" },
            ["KeyR"] = new string[] { null, "thrFull" },
            ["KeyF"] = new string[] { null, "thrIdle" },
            ["KeyG"] = new string[] { "gear", "gear" },
            ["KeyT"] = new string[] { "trim", "trimReset" },
            ["KeyL"] = new string[] { "level", "level" },
            ["KeyU"] = new string[] { "autoRud", "autoRud" },
            ["BracketLeft"] = new string[] { "feather0", "restart0" },
            ["BracketRight"] = new string[] { "feather1", "restart1" },
            ["KeyZ"] = new string[] { "rtrimL", "rtrimL" },
            ["KeyX"] = new string[] { "rtrimR", "rtrimR" },
            ["Backslash"] = new string[] { "reverser", "reverser" },
            ["KeyN"] = new string[] { "spoiler", "spoiler" }
        };
        public static string ActionForKey(string code, bool shift) => KEY_ACTS.TryGetValue(code, out var a) ? a[shift ? 1 : 0] : null;

        private bool Held(string code) => keys.Has(code) && !(muted.Count > 0 && muted.Contains(code));
        private bool Pressed(string a, string b = null) => Held(a) || (b != null && Held(b));
        private static double Ramp(double cur, double tgt, double dt, bool analog)
            => analog ? cur + (tgt - cur) * Math.Min(1, 12 * dt)
                      : cur + PhysMath.Clamp(tgt - cur, -(tgt == 0 ? 3.5 : 0.67) * dt, (tgt == 0 ? 3.5 : 0.67) * dt);
        private static double Curve(double v) => Math.Sign(v) * Math.Pow(Math.Abs(v), 1.3);

        // every physics tick: the keys → the pilot's inputs on s (controls.js update(), keyboard path)
        public void Update(State s, double dt, IKeySet k, bool flying)
        {
            keys = k ?? NOKEYS;
            if (arm) { arm = false; foreach (var c in FLY_HELD) if (keys.Has(c)) muted.Add(c); }
            if (muted.Count > 0)
            {
                var gone = new List<string>();
                foreach (var c in muted) if (!keys.Has(c)) gone.Add(c);
                foreach (var c in gone) muted.Remove(c);
            }
            if (s == null) return;
            if (!flying) { s.PIn = 0; s.RIn = 0; s.Rud = RTrim; s.Brake = ParkBrake ? 1 : 0; return; }
            double tp = (Pressed("KeyS", "ArrowDown") ? 1 : 0) - (Pressed("KeyW", "ArrowUp") ? 1 : 0);
            double tr = (Pressed("KeyD", "ArrowRight") ? 1 : 0) - (Pressed("KeyA", "ArrowLeft") ? 1 : 0);
            double ty = (Pressed("KeyE") ? 1 : 0) - (Pressed("KeyQ") ? 1 : 0);
            bool brake = Pressed("KeyB", "Space");
            s.PKey = Ramp(s.PKey, tp, dt, false);
            s.RKey = Ramp(s.RKey, tr, dt, false);
            s.PIn = Curve(s.PKey);
            s.RIn = Curve(s.RKey);
            s.KeyHold = Prefs.Hold == "hold";
            s.RollHoldFlag = Prefs.RHold != "spring";   // (JS: !P.SORAJIMA && rhold !== 'spring'; the LAB physics has no SORAJIMA flag)
            double thNow = Sim.Attitude(s).Pitch;
            if (!s.KeyHold || s.Opts.LevelT > 0 || !s.PTgt.HasValue || s.OnGround) { s.PTgt = thNow; s.PHeld = 0; }
            if (s.KeyHold && tp != 0 && !s.OnGround)
            {
                s.PHeld += dt;
                double p0 = s.PTgt.Value;
                s.PTgt = PhysMath.Clamp(s.PTgt.Value + tp * (s.PHeld < 0.5 ? 1.5 : 3) * Prefs.HoldSens * dt, -20, 22);
                s.PRate = dt > 0 ? (s.PTgt.Value - p0) / dt : 0;
            }
            else { s.PHeld = 0; s.PRate = 0; }
            if (s.KeyHold && !s.OnGround) s.PIn = 0;
            s.RudKey += PhysMath.Clamp(ty - s.RudKey, -3 * dt, 3 * dt);
            s.Rud = PhysMath.Clamp(s.RudKey + RTrim, -1, 1);
            bool thU = Pressed("KeyR", "PageUp"), thD = Pressed("KeyF", "PageDown");
            ThrHeld = thU || thD ? ThrHeld + dt : 0;
            double thRate = ThrHeld < 0.4 ? 0.45 : 1.6;
            if (thU) s.Thr = PhysMath.Clamp(s.Thr + thRate * dt, 0, 1);
            if (thD) s.Thr = PhysMath.Clamp(s.Thr - thRate * dt, 0, 1);
            BrAmt = ParkBrake ? 1 : PhysMath.Clamp(BrAmt + (brake ? 2.5 : -5) * dt, 0, 1);
            s.Brake = BrAmt;
        }

        private string Say(string text, string kind = "") { Kind = kind; return text; }
        private static double Pct(double v) => Sim.JR(Math.Abs(v) * 100);
        private string TrimTxt(State s)
        {
            double t = Sim.JR(s.Trim / FlightPhysics.TRIM_MAX * 100);
            return t == 0 ? "中立" : $"{(t > 0 ? "機首上げ" : "機首下げ")} {Math.Abs(t):0}%";
        }

        // the discrete actions (controls.js action()); free = the flight is free flight (lessons restrict some)
        public string Action(State s, string a, double? arg = null, bool free = true)
        {
            Kind = "";
            if (s == null) return "";
            var A = s.A;
            if (a == "flaps" || a == "flapsUp")
            {
                if (A.Wing.Flap == null) return "";
                int n = A.FlapLabels.Length;
                s.FlapIdx = a == "flaps" ? (s.FlapIdx + 1) % n : Math.Max(0, s.FlapIdx - 1);
                string lab = A.FlapLabels[s.FlapIdx];
                double fe = A.VGet("fe");
                bool over = s.FlapIdx > 0 && s.Out.Ias > fe;
                return Say($"フラップ {lab}{(s.FlapIdx == 0 ? "：揚力と抗力が減り、速く飛べる（巡航・上昇）" : "：揚力と抗力が増え、遅く・深い角度で降りられる")}{(over ? $"　⚠ 白い帯の上限 Vfe {fe:0} kt を超えています" : "")}", over ? "bad" : "");
            }
            if (a == "gear")
            {
                if (A.Gear.Fixed) return Say("この機体（Archer）の脚は固定式で、上げ下げできません");
                if (s.OnGround && s.GearDown) return Say("地上では脚を上げられません");
                s.GearDown = !s.GearDown;
                return Say(s.GearDown ? "脚 DOWN：着陸に備える（緑のランプ 3 つで確認）。抗力が増える" : "脚 UP：抗力が減って上昇・加速しやすくなる（正の上昇を確認してから）");
            }
            if (a == "trim")
            {
                if (s.OnGround) { s.Trim = 0; s.TrimHold = 0; s.TrimTgt = null; return Say("地上ではトリムを離陸位置（中立）にしました"); }
                if (s.Opts.Assist) return Say("操縦アシスト中はトリムは自動です");
                s.TrimHold = s.Elev;
                s.TrimTgt = Sim.TrimLevel(s);
                return Say($"トリム {(s.TrimTgt.Value >= 0 ? "機首上げ" : "機首下げ")} {Math.Abs(Sim.JR(s.TrimTgt.Value / FlightPhysics.TRIM_MAX * 100)):0}%：いまの速度で、手を離してもこの姿勢が続くように合わせました（ホイールが回り込んでいきます）");
            }
            if (a == "thrFull" || a == "thrIdle")
            {
                s.Thr = a == "thrFull" ? 1 : 0;
                return Say(a == "thrFull" ? "スロットル全開（Shift+R）：離陸・ゴーアラウンド・失速の回復で一気に出力を出す" : "スロットル アイドル（Shift+F）：離陸中止・エンジン故障の模擬・着陸の接地前に一気に絞る");
            }
            if (a == "trimReset") { s.Trim = 0; s.TrimHold = 0; s.TrimTgt = null; return Say("トリムを中立（離陸位置）に戻しました"); }
            if (a == "level")
            {
                if (!free) return Say("L（水平に戻すアシスト）は自由飛行だけで使えます。訓練では自分で回復します");
                s.Opts.LevelT = 4;
                return Say("数秒間、自動で翼を水平・水平飛行に戻します（自由飛行の補助）");
            }
            if (a == "autoRud")
            {
                bool anyFailed = false; foreach (var e in s.Eng) if (e.Failed) anyFailed = true;
                if (!free && A.Twin && anyFailed) return Say("片発の課目では自動ラダーは使えません。生きているエンジン側のラダー（Q / E）とラダートリム（Z / X）で、自分の足で方向を保つ練習です");
                s.Opts.AutoRud = !s.Opts.AutoRud;
                Prefs.AutoRud = s.Opts.AutoRud;
                return Say(s.Opts.AutoRud ? "自動ラダー ON：ボールを自動で中央に保ちます" : "自動ラダー OFF：Q / E でボールを中央に（離陸・上昇は右ラダー E。片発では生きている側の足）");
            }
            if (a == "feather0" || a == "feather1")
            {
                if (!A.Twin) return Say("フェザーは双発機（Seminole）のプロペラ操作です");
                int i = a == "feather0" ? 0 : 1;
                var e = s.Eng[i];
                string side = i != 0 ? "右" : "左";
                if (e.Feather) return Say($"{side}のプロペラはすでにフェザーです");
                e.Feather = true; e.Cut = true;
                if (!e.Failed) return Say($"⚠ {side}エンジンは動いていました。生きているエンジンを止めました（重大な誤り）。Identify → Verify → Feather の順で", "bad");
                return Say($"{side}のプロペラをフェザー：羽根を風に平行にして回転を止め、抗力を大きく減らしました", "good");
            }
            if (a == "restart0" || a == "restart1")
            {
                if (!A.Twin) return "";
                if (!free) return Say("訓練中はエンジンの再始動はできません");
                var e = s.Eng[a == "restart0" ? 0 : 1];
                e.Feather = false; e.Cut = false; e.Failed = false; e.On = true;
                return Say("エンジンを再始動（自由飛行の補助）");
            }
            if (a == "rtrimL" || a == "rtrimR")
            {
                RTrim = PhysMath.Clamp(RTrim + (a == "rtrimR" ? 0.05 : -0.05), -0.6, 0.6);
                return Say($"ラダートリム {(RTrim == 0 ? "中立" : $"{(RTrim > 0 ? "右" : "左")} {Sim.JR(Math.Abs(RTrim) * 100):0}%")}：ラダーを踏み続けなくてよいように");
            }
            if (a == "reverser")
            {
                if (!A.Jet) return Say("逆噴射（リバーサー）はジェット機の装置です。プロペラ機にはありません");
                s.Rev = s.Rev != 0 ? 0 : 1;
                return Say(s.Rev != 0 ? "逆噴射（リバーサー）展開：推力を前方へ向けて減速する（効くのは接地して脚に荷重が乗っている間だけ。60 kt 以下で絞られ 25 kt で止まる）" : "逆噴射（リバーサー）格納：推力は通常へ");
            }
            if (a == "spoiler")
            {
                if (!A.Jet) return Say("スポイラーはジェット機の装置です（教材モデル）。プロペラ機にはありません");
                s.Spoiler = s.Spoiler != 0 ? 0 : 1;
                return Say(s.Spoiler != 0 ? "スポイラー展開：翼の揚力を捨てて抗力を増やす（降下を深く・速く、接地後は脚の荷重を増やしてブレーキを効かせる）" : "スポイラー格納：揚力と抗力は通常へ");
            }
            if (a == "trimStep")
            {
                if (s.Opts.Assist) return Say("操縦アシスト中はトリムは自動です");
                s.Trim = PhysMath.Clamp(s.Trim + ((arg ?? 1) < 0 ? -1 : 1) * FlightPhysics.TRIM_MAX * 0.04, -FlightPhysics.TRIM_MAX, FlightPhysics.TRIM_MAX);
                s.TrimHold = s.Elev; s.TrimTgt = null;
                return Say($"トリム {TrimTxt(s)}");
            }
            if (a == "thrStep")
            {
                s.Thr = PhysMath.Clamp(s.Thr + ((arg ?? 1) < 0 ? -0.05 : 0.05), 0, 1);
                return Say($"スロットル {Pct(s.Thr):0}%");
            }
            if (a == "parkBrake")
            {
                ParkBrake = !arg.HasValue ? !ParkBrake : arg.Value != 0;
                if (ParkBrake) s.Brake = 1;
                return Say(ParkBrake ? "パーキングブレーキ セット：止まっている間は機体をここに保つ（動き出す前に解除）" : "パーキングブレーキ 解除：B / Space で必要なときだけブレーキ");
            }
            return "";
        }

        public void Reset() { RTrim = 0; ThrHeld = 0; ParkBrake = false; ClearKeys(); }
        public void ClearKeys() { muted.Clear(); arm = true; }
    }
}
