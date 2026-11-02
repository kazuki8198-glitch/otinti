// CADET — CadetCareerChecklists.cs : cadet/src/content/checklists-archer.js
// + checklists-seminole.js + checklists-jet.js ported — the CADET-side
// ground checklists a flying day runs (before start / start / after start /
// run-up / after landing / shutdown), per aircraft family. An item with no
// Test is confirmed by the cadet (Enter / click); Set is the instructor's
// hands when the cadet leaves the item to him.
using System;
using System.Collections.Generic;

namespace Cadet
{
    public class RunupMemo
    {
        public double Both, DropL, DropR, Carb;
        public bool Idle;
        public double HoldL, HoldR, HoldC;
        public double? Prev;
        public string PrevMag;
        public bool PrevCarb;
        public double SteadyT;
    }

    // the c the checklist items read (day.js's tick context)
    public class DayCtx
    {
        public SwState Sw;
        public Systems Sys;
        public State S;
        public bool Park;
        public AvionicsState Av;
        public double Rpm;
        public RunupMemo Memo;
        public bool Walk;
        public double Qnh = 29.92;
        public (double a, double c) Pos;
        public double V, Hdg, Dt;
        public bool? OnGround;
        public Func<string, object, string> ActFn;
        public Action<double> SetThrFn;
        public Action<int> SetFlapsFn;
        public string Act(string name, object arg) { return ActFn != null ? ActFn(name, arg) : ""; }
        public void SetThr(double x) { SetThrFn?.Invoke(x); }
        public void SetFlaps(int i) { SetFlapsFn?.Invoke(i); }
        public double Prime() { return Sys != null ? Sys.Prime() : 0; }
    }

    public class CItem
    {
        public string Name, What, Ctl, Note;
        public Func<DayCtx, bool> Test;
        public Action<DayCtx> Set;
    }
    public class CList { public string Title; public List<CItem> Items = new List<CItem>(); }

    public static class CareerChecklists
    {
        static bool Near(double x, double v, double d) { return Math.Abs(x - v) <= d; }
        static CItem I(string name, string what, Func<DayCtx, bool> test = null, string ctl = null, string note = null, Action<DayCtx> set = null)
        {
            return new CItem { Name = name, What = what, Test = test, Ctl = ctl, Note = note ?? "", Set = set };
        }

        public static readonly Dictionary<string, CList> ARCHER = BuildArcher();
        public static readonly Dictionary<string, CList> SEMINOLE = BuildSeminole();
        public static readonly Dictionary<string, CList> JET = BuildJet();

        static Dictionary<string, CList> BuildArcher()
        {
            var d = new Dictionary<string, CList>();
            d["before_start"] = new CList { Title = "エンジン始動前（BEFORE STARTING ENGINE）", Items = new List<CItem>
            {
                I("外部点検", "完了", c => c.Walk, null, "機体の周りは見終わりましたね。"),
                I("座席・シートベルト・ドア", "調整・着用・ロック", null, "door", "座席を合わせて、ベルトを締めます。ドアは上と横の 2 か所でロックします。"),
                I("サーキット ブレーカー", "すべて押し込まれている", null, "cb", "飛び出しているものがないか、右下の列を見ます。"),
                I("アビオニクス スイッチ", "OFF", c => !c.Sw.Avionics, "sw.avionics", "始動のときの電圧の変動から、画面を守ります。", c => { c.Sw.Avionics = false; }),
                I("パーキングブレーキ", "セット", c => c.Park, "parkBrake", "", c => c.Act("parkBrake", true)),
                I("燃料セレクター", "左か右のタンク", c => c.Sw.FuelSel == "L" || c.Sw.FuelSel == "R", "fuelSel", "今日は左のタンクから使います。", c => { c.Sw.FuelSel = "L"; }),
            } };
            d["start"] = new CList { Title = "エンジン始動（STARTING ENGINE・冷えているとき）", Items = new List<CItem>
            {
                I("ミクスチャー", "フル リッチ（いちばん前）", c => c.Sw.Mixture >= 0.95, "mixture", "ミクスチャーは赤いレバーです。いちばん前まで。", c => { c.Sw.Mixture = 1; }),
                I("スロットル", "1/4 インチ開く", c => c.S.Thr >= 0.03 && c.S.Thr <= 0.16, "throttle", "ほんの少しだけ。ホイールで 1 目盛りです。", c => c.SetThr(0.05)),
                I("マスター スイッチ", "ON", c => c.Sw.Master, "sw.master", "赤いスイッチです。", c => { c.Sw.Master = true; }),
                I("ビーコン", "ON", c => c.Sw.Beacon, "sw.beacon", "周りの人に「エンジンをかけます」と知らせる灯火です。", c => { c.Sw.Beacon = true; }),
                I("燃料ポンプ", "ON", c => c.Sw.FuelPump, "sw.fuelPump", "", c => { c.Sw.FuelPump = true; }),
                I("プライマー", "2〜3 回", c => c.Sys.Primes >= 2 || c.Sys.Running, "primer", "エンジンが冷えているので、燃料を少し送っておきます。押しすぎないように。", c => { if (c.Sys.Primes < 3) c.Prime(); }),
                I("プロペラの周り", "人がいないことを確かめ、「クリア！」", null, null, "窓から周りを見て、大きな声で「プロペラ、クリア！」。"),
                I("マグネトー", "START（かかったら離す）", c => c.Sys.Running, "mag", "キーを START まで回します。かかったら手を離すと BOTH に戻ります。", c => { if (!c.Sys.Cranking && !c.Sys.Running) c.Sw.Mag = "START"; }),
                I("スロットル", "1,000 rpm", c => c.Sys.Running && Near(c.Rpm, 1000, 160), "throttle", "", c => c.SetThr(0.045)),
                I("油圧", "30 秒以内に上がる", c => c.Sys.Running && c.Sys.Oil > 25, null, "MFD のエンジン計器で確かめます。"),
            } };
            d["after_start"] = new CList { Title = "エンジン始動後（AFTER START）", Items = new List<CItem>
            {
                I("アビオニクス スイッチ", "ON", c => c.Sw.Avionics, "sw.avionics", "", c => { c.Sw.Avionics = true; }),
                I("燃料ポンプ", "OFF（エンジンのポンプの確認）", c => !c.Sw.FuelPump, "sw.fuelPump", "", c => { c.Sw.FuelPump = false; }),
                I("航法灯", "ON", c => c.Sw.Nav, "sw.nav", "", c => { c.Sw.Nav = true; }),
                I("フラップ", "UP", c => c.S.FlapIdx == 0, "flaps", "", c => c.SetFlaps(0)),
                I("高度計", "ATIS の値（29.92）", c => c.Av != null && Near(c.Av.Baro, c.Qnh, 0.005), "pfd.crs.outer", "", c => { if (c.Av != null) c.Av.Baro = c.Qnh; }),
            } };
            d["runup"] = new CList { Title = "ランナップ（RUN-UP）", Items = new List<CItem>
            {
                I("パーキングブレーキ", "セット", c => c.Park, "parkBrake", "止まって、機首を風上へ。プロペラの後ろに人や機体がないこと。", c => c.Act("parkBrake", true)),
                I("スロットル", "2,000 rpm", c => c.Rpm >= 1900 && c.Rpm <= 2120 && c.Memo.Both > 0, "throttle", "", c => c.SetThr(0.67)),
                I("マグネトー L", "回転の低下 175 rpm 以内", c => c.Memo.DropL > 20 && c.Memo.DropL <= 175, "mag", "キーを L に。回転がどれだけ下がるか見ます。", c => { c.Sw.Mag = "L"; }),
                I("マグネトー R", "低下 175 rpm 以内・左右の差 50 rpm 以内", c => c.Memo.DropR > 20 && c.Memo.DropR <= 175 && Math.Abs(c.Memo.DropL - c.Memo.DropR) <= 50, "mag", "次に R。", c => { c.Sw.Mag = "R"; }),
                I("マグネトー", "BOTH", c => c.Sw.Mag == "BOTH" && c.Memo.DropR > 0, "mag", "必ず BOTH に戻します。", c => { c.Sw.Mag = "BOTH"; }),
                I("キャブレター ヒート", "ON で回転が下がる → OFF", c => c.Memo.Carb > 20 && !c.Sw.CarbHeat, "carbHeat", "気化器の暖め。引くと少し回転が下がります。確かめたら戻します。", c => { c.Sw.CarbHeat = !(c.Memo.Carb > 20); }),
                I("エンジン計器", "緑の範囲", null, null, "油圧・油温・燃料の圧力。MFD で見ます。"),
                I("スロットル", "アイドルを確かめて 1,000 rpm", c => c.Memo.Idle && Near(c.Rpm, 1000, 200), "throttle", "いったんアイドルまで絞って、止まらないことを確かめます。", c => c.SetThr(c.Memo.Idle ? 0.045 : 0)),
                I("燃料ポンプ", "ON（離陸と着陸のとき）", c => c.Sw.FuelPump, "sw.fuelPump", "", c => { c.Sw.FuelPump = true; }),
                I("ストロボ・着陸灯", "ON", c => c.Sw.Strobe && c.Sw.Landing, "sw.landing", "滑走路に入る前に。", c => { c.Sw.Strobe = true; c.Sw.Landing = true; }),
            } };
            d["after_landing"] = new CList { Title = "着陸後（AFTER LANDING：滑走路を出てから）", Items = new List<CItem>
            {
                I("フラップ", "UP", c => c.S.FlapIdx == 0, "flaps", "", c => c.SetFlaps(0)),
                I("燃料ポンプ", "OFF", c => !c.Sw.FuelPump, "sw.fuelPump", "", c => { c.Sw.FuelPump = false; }),
                I("ストロボ・着陸灯", "OFF（タキシー灯はお好みで）", c => !c.Sw.Strobe && !c.Sw.Landing, "sw.strobe", "", c => { c.Sw.Strobe = false; c.Sw.Landing = false; }),
            } };
            d["shutdown"] = new CList { Title = "エンジン停止（SHUTDOWN）", Items = new List<CItem>
            {
                I("パーキングブレーキ", "セット", c => c.Park, "parkBrake", "", c => c.Act("parkBrake", true)),
                I("スロットル", "1,000 rpm", c => !c.Sys.Running || Near(c.Rpm, 1000, 220), "throttle", "", c => c.SetThr(0.045)),
                I("アビオニクス スイッチ", "OFF", c => !c.Sw.Avionics, "sw.avionics", "", c => { c.Sw.Avionics = false; }),
                I("灯火（ビーコン以外）", "OFF", c => !c.Sw.Nav && !c.Sw.Strobe && !c.Sw.Landing && !c.Sw.Taxi, "sw.nav", "", c => { c.Sw.Nav = false; c.Sw.Strobe = false; c.Sw.Landing = false; c.Sw.Taxi = false; }),
                I("ミクスチャー", "アイドル カットオフ（いちばん手前）", c => !c.Sys.Running, "mixture", "エンジンは、燃料を止めて止めます。", c => { c.Sw.Mixture = 0; }),
                I("マグネトー", "OFF・キーを抜く", c => c.Sw.Mag == "OFF", "mag", "", c => { c.Sw.Mag = "OFF"; }),
                I("マスター スイッチ", "OFF", c => !c.Sw.Master, "sw.master", "", c => { c.Sw.Master = false; }),
                I("ビーコン", "OFF（スイッチ）", c => !c.Sw.Beacon, "sw.beacon", "マスターを切ると消えますが、スイッチも切っておきます。", c => { c.Sw.Beacon = false; }),
            } };
            return d;
        }

        static Dictionary<string, CList> BuildSeminole()
        {
            var A = ARCHER;
            var d = new Dictionary<string, CList>(A);
            var bs = new List<CItem>(A["before_start"].Items)
            {
                I("脚のレバー", "DOWN（緑のランプ 3 つ）", null, "gear", "引き込み脚の機体です。地上では、脚のレバーが DOWN にあり、緑のランプが 3 つ点いていることを必ず確かめます。"),
            };
            d["before_start"] = new CList { Title = "エンジン始動前（BEFORE STARTING ENGINES）", Items = bs };
            var st = new List<CItem>();
            foreach (var it in A["start"].Items)
            {
                if (it.Name == "マグネトー" || it.Name == "スロットル" || it.Name == "油圧") continue;
                if (it.Name == "ミクスチャー")
                {
                    st.Add(I("ミクスチャー", "フル リッチ（左右とも）", it.Test, it.Ctl, "赤いレバーを 2 本とも、いちばん前まで。", it.Set));
                    st.Add(I("スロットル", "1/4 インチ開く（左右とも）", c => c.S.Thr >= 0.03 && c.S.Thr <= 0.16, "throttle", "左右のレバーを、ほんの少しだけ。", c => c.SetThr(0.05)));
                }
                else st.Add(it);
            }
            st.Add(I("左エンジン", "START（かかったら離す）", c => c.Sys.RunningL || c.Sys.Running, "mag", "まず左のエンジンから。キーを START まで回し、かかったら手を離します。", c => { if (!c.Sys.Cranking && !c.Sys.RunningL) c.Sw.Mag = "START"; }));
            st.Add(I("右エンジン", "START（かかったら離す）", c => c.Sys.Running, "mag", "左が回ったら、右。もう一度 START です。", c => { if (!c.Sys.Cranking && c.Sys.RunningL && !c.Sys.Running) c.Sw.Mag = "START"; }));
            st.Add(I("スロットル", "1,000 rpm（左右とも）", c => c.Sys.Running && Near(c.Rpm, 1000, 180), "throttle", "", c => c.SetThr(0.045)));
            st.Add(I("油圧", "左右とも 30 秒以内に上がる", c => c.Sys.Running && c.Sys.Oil > 25, null, "MFD のエンジン計器で、左右の両方を確かめます。"));
            d["start"] = new CList { Title = "エンジン始動（STARTING ENGINES・左から）", Items = st };
            var ru = new List<CItem>();
            ru.AddRange(A["runup"].Items.GetRange(0, 6));
            ru.Add(I("プロペラ", "サイクル（定速プロペラ・フェザーの確認）", c => c.Sw.PropCycled, "prop", "青いプロペラのレバーを引いて回転が下がり、戻すと上がることを確かめます。左右とも。", c => { if (!(c.Sw.PropCycleT > 0)) c.Sw.PropCycleT = 2.6; }));
            ru.AddRange(A["runup"].Items.GetRange(6, A["runup"].Items.Count - 6));
            d["runup"] = new CList { Title = "ランナップ（RUN-UP）", Items = ru };
            return d;
        }

        static Dictionary<string, CList> BuildJet()
        {
            var d = new Dictionary<string, CList>();
            d["before_start"] = new CList { Title = "エンジン始動前（BEFORE START）", Items = new List<CItem>
            {
                I("外部点検", "完了", c => c.Walk, null, "機体の周りは見終わりましたね。ジェットは高いところも多いので、見上げる点検でした。"),
                I("座席・シートベルト・ドア", "調整・着用・ロック", null, "door", "座席を合わせて、ベルトを締めます。ドアは閉めて、ロックを確認。"),
                I("サーキット ブレーカー", "すべて押し込まれている", null, "cb", "飛び出しているものがないか、後ろと右の列を見ます。"),
                I("アビオニクス スイッチ", "OFF", c => !c.Sw.Avionics, "sw.avionics", "始動のときの電圧の変動から、画面を守ります。", c => { c.Sw.Avionics = false; }),
                I("パーキングブレーキ", "セット", c => c.Park, "parkBrake", "", c => c.Act("parkBrake", true)),
                I("バッテリー／マスター", "ON", c => c.Sw.Master, "sw.master", "まず電源です。APU を回す電気が要ります。", c => { c.Sw.Master = true; }),
                I("燃料ポンプ", "ON", c => c.Sw.FuelPump, "sw.fuelPump", "APU もエンジンも、ポンプの圧力で燃料を送ります。ジェットにセレクターの切り替えはありません。", c => { c.Sw.FuelPump = true; }),
                I("APU", "始動・運転、電源が安定", null, null, "APU が回れば、エンジンをかけなくても画面と空調が使えます。排気の音と EGT を確かめます。"),
                I("燃料量", "飛行計画の搭載量と一致", null, null, "左右と合計。路線では代替空港分と 30 分の予備まで考えます（学科の性能・運航の話です）。"),
                I("ビーコン", "ON", c => c.Sw.Beacon, "sw.beacon", "「これからエンジンをかけます」の知らせです。APU の運転中も点けます。", c => { c.Sw.Beacon = true; }),
            } };
            d["start"] = new CList { Title = "エンジン始動（STARTING ENGINES・右から）", Items = new List<CItem>
            {
                I("吸気と排気の周り", "人がいないことを確かめ、「クリア！」", null, null, "ジェットの危ないのは前と後ろです。吸い込みと排気の範囲に人がいないこと。大きな声で「プロペラ、クリア！」。"),
                I("エンジン始動スイッチ", "右エンジンを GRD", null, null, "始動スイッチを GRD に。スターターが N1 を回し始めます。"),
                I("N1 の上昇", "回転が上がり始める", null, null, "N1 が上がり始めたら、次は燃料です。回らないうちは燃料を入れません。"),
                I("始動レバー", "IDLE（燃料を入れる）", c => c.Sys.Running, null, "レバーを IDLE のくぼみへ。燃料が入ると EGT が上がり始めます。上がりすぎないか、ずっと見ます。"),
                I("左エンジン", "同じ手順で始動", null, null, "右が安定したら、左も同じ手順で。急がなくて大丈夫です。"),
                I("エンジン計器", "N1・EGT 安定、油圧が上がる", c => c.Sys.Running && c.Sys.Oil > 25, null, "MFD のエンジン表示で、左右とも確かめます。"),
                I("スロットル", "アイドル", c => c.Sys.Running && c.S.Thr <= 0.06, "throttle", "始動のあとはアイドルで安定させます。推力レバーは、まだそっとしておきます。", c => c.SetThr(0)),
            } };
            d["after_start"] = new CList { Title = "エンジン始動後（AFTER START）", Items = new List<CItem>
            {
                I("アビオニクス スイッチ", "ON", c => c.Sw.Avionics, "sw.avionics", "", c => { c.Sw.Avionics = true; }),
                I("電源", "エンジンの発電機に切り替わり、安定", null, null, "APU からエンジンの発電機へ。画面が消えたりしないこと。APU はここで止められます。"),
                I("航法灯", "ON", c => c.Sw.Nav, "sw.nav", "", c => { c.Sw.Nav = true; }),
                I("フラップ", "UP", c => c.S.FlapIdx == 0, "flaps", "タキシーの間は UP。離陸の 5 は、ランナップの最後に合わせます。", c => c.SetFlaps(0)),
                I("高度計", "ATIS の値", c => c.Av != null && Near(c.Av.Baro, c.Qnh, 0.005), "pfd.crs.outer", "", c => { if (c.Av != null) c.Av.Baro = c.Qnh; }),
                I("タキシー灯", "ON", c => c.Sw.Taxi, "sw.taxi", "", c => { c.Sw.Taxi = true; }),
                I("燃料ポンプ", "ON（離陸までそのまま）", c => c.Sw.FuelPump, "sw.fuelPump", "ジェットは離陸もポンプ ON のままです。Archer のように切ったりしません。", c => { c.Sw.FuelPump = true; }),
            } };
            d["runup"] = new CList { Title = "ランナップ（RUN-UP：エンジン計器の確認）", Items = new List<CItem>
            {
                I("パーキングブレーキ", "セット", c => c.Park, "parkBrake", "止まって、機首を風上へ。排気の後ろに人や機体がないこと。", c => c.Act("parkBrake", true)),
                I("スロットル", "アイドル・運転が安定", c => c.Sys.Running && c.S.Thr <= 0.06, "throttle", "ジェットのランナップは、回転を上げての点火の点検ではありません。計器が安定しているかの確認です。", c => c.SetThr(0)),
                I("エンジン計器", "N1・EGT・燃料流量、左右とも安定", null, null, "左右の N1 がそろっているか、EGT に異常な上がり方がないか、流量が流れ続けているか。MFD で見ます。"),
                I("油圧・油温", "左右とも上がっている", c => c.Sys.Running && c.Sys.Oil > 25, null, "始動後、油圧はすぐに上がります。上がらないエンジンは、止めて整備です。"),
                I("燃料ポンプ", "ON", c => c.Sw.FuelPump, "sw.fuelPump", "", c => { c.Sw.FuelPump = true; }),
                I("フラップ", "離陸位置 5", c => c.S.FlapIdx == 1, "flaps", "離陸フラップは 5 です。表示が 5 でそろっていること（j1 の課目の最初の一手です）。", c => c.SetFlaps(1)),
                I("速度バグ", "Vr・V2 をセット", null, null, "今日の重さの Vr と V2 を、速度計のバグに合わせます。離陸の判断は、この数字でします。"),
                I("スピードブレーキ", "収納（レバー DOWN）", c => !(c.S != null && c.S.Spoiler > 0), null, "出したままでは離陸できません。収納を確かめます。", c => { if (c.S != null) c.S.Spoiler = 0; }),
                I("オートブレーキ", "RTO にセット", null, null, "離陸を中止したとき、自動で強く止まるための設定です。着陸のときは別の段を選びます。"),
                I("ストロボ・着陸灯", "ON", c => c.Sw.Strobe && c.Sw.Landing, "sw.landing", "滑走路に入る前に。", c => { c.Sw.Strobe = true; c.Sw.Landing = true; }),
            } };
            d["after_landing"] = new CList { Title = "着陸後（AFTER LANDING：滑走路を出てから）", Items = new List<CItem>
            {
                I("フラップ", "UP", c => c.S.FlapIdx == 0, "flaps", "", c => c.SetFlaps(0)),
                I("スポイラー", "収納・アーム解除", c => !(c.S != null && c.S.Spoiler > 0), null, "接地で出たスポイラーを収め、アームを解きます。", c => { if (c.S != null) c.S.Spoiler = 0; }),
                I("オートブレーキ", "OFF", null, null, "自動の制動を解きます。ここからは足のブレーキです。"),
                I("ストロボ・着陸灯", "OFF（タキシー灯は ON）", c => !c.Sw.Strobe && !c.Sw.Landing, "sw.strobe", "", c => { c.Sw.Strobe = false; c.Sw.Landing = false; }),
                I("燃料ポンプ", "確認（地上では APU の準備）", null, null, "エンジンを止める前に APU を回すかどうか、機長と確かめます。"),
            } };
            d["shutdown"] = new CList { Title = "エンジン停止（SHUTDOWN）", Items = new List<CItem>
            {
                I("パーキングブレーキ", "セット", c => c.Park, "parkBrake", "", c => c.Act("parkBrake", true)),
                I("スロットル", "アイドル", c => !c.Sys.Running || c.S.Thr <= 0.06, "throttle", "", c => c.SetThr(0)),
                I("始動レバー", "カットオフ（エンジン停止）", c => !c.Sys.Running, null, "エンジンは、燃料を止めて止めます。レバーをカットオフへ。N1 が下がり切るまで見ます。"),
                I("アビオニクス スイッチ", "OFF", c => !c.Sw.Avionics, "sw.avionics", "", c => { c.Sw.Avionics = false; }),
                I("灯火（ビーコン以外）", "OFF", c => !c.Sw.Nav && !c.Sw.Strobe && !c.Sw.Landing && !c.Sw.Taxi, "sw.nav", "", c => { c.Sw.Nav = false; c.Sw.Strobe = false; c.Sw.Landing = false; c.Sw.Taxi = false; }),
                I("燃料ポンプ", "OFF", c => !c.Sw.FuelPump, "sw.fuelPump", "APU を止めるまで、と言うときはそのままです。今日はここで全部止めます。", c => { c.Sw.FuelPump = false; }),
                I("APU", "停止（または外部電源へ）", null, null, "ゲートの電源に替わったら、APU を止めます。"),
                I("マスター／バッテリー", "OFF", c => !c.Sw.Master, "sw.master", "", c => { c.Sw.Master = false; }),
                I("ビーコン", "OFF（スイッチ）", c => !c.Sw.Beacon, "sw.beacon", "マスターを切ると消えますが、スイッチも切っておきます。", c => { c.Sw.Beacon = false; }),
            } };
            return d;
        }
    }
}
