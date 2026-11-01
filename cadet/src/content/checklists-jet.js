// CADET — content/checklists-jet.js : the jet's ground checklists (first-officer S1), in the Archer's
// shape (content/checklists-archer.js) for the 737-class teaching model: the same six lists day.js runs
// through a flying day, with the piston engine's items left out — there is no primer, no carburettor and
// nothing to swing a key between. In their place: the fuel pumps, the APU and the electrical source, the
// flap schedule and the speed bugs, the spoilers and the autobrake, and the engine instruments read as
// N1 / EGT / FF. The run-up is an engine-instrument check (the jets are run up at the stand, not at the
// hold): the readings settling, both sides in the green.
// Each item: [name, what (the setting), test(c) → true when it is set (null: the cadet confirms it, Enter
// or a click), the cockpit control to look at, a note the instructor adds, set(c): the instructor's hands].
// The test functions read only what day.js's tick actually passes (c: { sw, sys, s, park, av, rpm, memo,
// walk, qnh, act, setThr, setFlaps }) — a jet-only setting that has no field there yet (the APU, the speed
// bugs, the autobrake) is a confirm item, never a guess at a field that is not in c.
const near = (x, v, d) => Math.abs(x - v) <= d;
export const CHECKLISTS = {
  before_start: { title: 'エンジン始動前（BEFORE START）', items: [
    ['外部点検', '完了', c => c.walk, null, '機体の周りは見終わりましたね。ジェットは高いところも多いので、見上げる点検でした。', null],
    ['座席・シートベルト・ドア', '調整・着用・ロック', null, 'door', '座席を合わせて、ベルトを締めます。ドアは閉めて、ロックを確認。', null],
    ['サーキット ブレーカー', 'すべて押し込まれている', null, 'cb', '飛び出しているものがないか、後ろと右の列を見ます。', null],
    ['アビオニクス スイッチ', 'OFF', c => !c.sw.avionics, 'sw.avionics', '始動のときの電圧の変動から、画面を守ります。', c => { c.sw.avionics = false; }],
    ['パーキングブレーキ', 'セット', c => c.park, 'parkBrake', '', c => c.act('parkBrake', true)],
    ['バッテリー／マスター', 'ON', c => c.sw.master, 'sw.master', 'まず電源です。APU を回す電気が要ります。', c => { c.sw.master = true; }],
    ['燃料ポンプ', 'ON', c => c.sw.fuelPump, 'sw.fuelPump', 'APU もエンジンも、ポンプの圧力で燃料を送ります。ジェットにセレクターの切り替えはありません。', c => { c.sw.fuelPump = true; }],
    ['APU', '始動・運転、電源が安定', null, null, 'APU が回れば、エンジンをかけなくても画面と空調が使えます。排気の音と EGT を確かめます。', null],
    ['燃料量', '飛行計画の搭載量と一致', null, null, '左右と合計。路線では代替空港分と 30 分の予備まで考えます（学科の性能・運航の話です）。', null],
    ['ビーコン', 'ON', c => c.sw.beacon, 'sw.beacon', '「これからエンジンをかけます」の知らせです。APU の運転中も点けます。', c => { c.sw.beacon = true; }],
  ] },
  start: { title: 'エンジン始動（STARTING ENGINES・右から）', items: [
    ['吸気と排気の周り', '人がいないことを確かめ、「クリア！」', null, null, 'ジェットの危ないのは前と後ろです。吸い込みと排気の範囲に人がいないこと。大きな声で「クリア！」。', null],
    ['エンジン始動スイッチ', '右エンジンを GRD', null, null, '始動スイッチを GRD に。スターターが N1 を回し始めます。', null],
    ['N1 の上昇', '回転が上がり始める', null, null, 'N1 が上がり始めたら、次は燃料です。回らないうちは燃料を入れません。', null],
    ['始動レバー', 'IDLE（燃料を入れる）', c => c.sys.running, null, 'レバーを IDLE のくぼみへ。燃料が入ると EGT が上がり始めます。上がりすぎないか、ずっと見ます。', null],
    ['左エンジン', '同じ手順で始動', null, null, '右が安定したら、左も同じ手順で。急がなくて大丈夫です。', null],
    ['エンジン計器', 'N1・EGT 安定、油圧が上がる', c => c.sys.running && c.sys.oil > 25, null, 'MFD のエンジン表示で、左右とも確かめます。', null],
    ['スロットル', 'アイドル', c => c.sys.running && c.s.thr <= 0.06, 'throttle', '始動のあとはアイドルで安定させます。推力レバーは、まだそっとしておきます。', c => c.setThr(0)],
  ] },
  after_start: { title: 'エンジン始動後（AFTER START）', items: [
    ['アビオニクス スイッチ', 'ON', c => c.sw.avionics, 'sw.avionics', '', c => { c.sw.avionics = true; }],
    ['電源', 'エンジンの発電機に切り替わり、安定', null, null, 'APU からエンジンの発電機へ。画面が消えたりしないこと。APU はここで止められます。', null],
    ['航法灯', 'ON', c => c.sw.nav, 'sw.nav', '', c => { c.sw.nav = true; }],
    ['フラップ', 'UP', c => c.s.flapIdx === 0, 'flaps', 'タキシーの間は UP。離陸の 5 は、ランナップの最後に合わせます。', c => c.setFlaps(0)],
    ['高度計', 'ATIS の値', c => !!c.av && near(c.av.baro, c.qnh ?? 29.92, 0.005), 'pfd.crs.outer', '', c => { if (c.av) c.av.baro = c.qnh ?? 29.92; }],
    ['タキシー灯', 'ON', c => c.sw.taxi, 'sw.taxi', '', c => { c.sw.taxi = true; }],
    ['燃料ポンプ', 'ON（離陸までそのまま）', c => c.sw.fuelPump, 'sw.fuelPump', 'ジェットは離陸もポンプ ON のままです。Archer のように切ったりしません。', c => { c.sw.fuelPump = true; }],
  ] },
  runup: { title: 'ランナップ（RUN-UP：エンジン計器の確認）', items: [
    ['パーキングブレーキ', 'セット', c => c.park, 'parkBrake', '止まって、機首を風上へ。排気の後ろに人や機体がないこと。', c => c.act('parkBrake', true)],
    ['スロットル', 'アイドル・運転が安定', c => c.sys.running && c.s.thr <= 0.06, 'throttle', 'ジェットのランナップは、回転を上げての点火の点検ではありません。計器が安定しているかの確認です。', c => c.setThr(0)],
    ['エンジン計器', 'N1・EGT・燃料流量、左右とも安定', null, null, '左右の N1 がそろっているか、EGT に異常な上がり方がないか、流量が流れ続けているか。MFD で見ます。', null],
    ['油圧・油温', '左右とも上がっている', c => c.sys.running && c.sys.oil > 25, null, '始動後、油圧はすぐに上がります。上がらないエンジンは、止めて整備です。', null],
    ['燃料ポンプ', 'ON', c => c.sw.fuelPump, 'sw.fuelPump', '', c => { c.sw.fuelPump = true; }],
    ['フラップ', '離陸位置 5', c => c.s.flapIdx === 1, 'flaps', '離陸フラップは 5 です。表示が 5 でそろっていること（j1 の課目の最初の一手です）。', c => c.setFlaps(1)],
    ['速度バグ', 'Vr・V2 をセット', null, null, '今日の重さの Vr と V2 を、速度計のバグに合わせます。離陸の判断は、この数字でします。', null],
    ['スピードブレーキ', '収納（レバー DOWN）', c => !(c.s && c.s.spoiler), null, '出したままでは離陸できません。収納を確かめます。', c => { if (c.s) c.s.spoiler = 0; }],
    ['オートブレーキ', 'RTO にセット', null, null, '離陸を中止したとき、自動で強く止まるための設定です。着陸のときは別の段を選びます。', null],
    ['ストロボ・着陸灯', 'ON', c => c.sw.strobe && c.sw.landing, 'sw.landing', '滑走路に入る前に。', c => { c.sw.strobe = true; c.sw.landing = true; }],
  ] },
  after_landing: { title: '着陸後（AFTER LANDING：滑走路を出てから）', items: [
    ['フラップ', 'UP', c => c.s.flapIdx === 0, 'flaps', '', c => c.setFlaps(0)],
    ['スポイラー', '収納・アーム解除', c => !(c.s && c.s.spoiler), null, '接地で出たスポイラーを収め、アームを解きます。', c => { if (c.s) c.s.spoiler = 0; }],
    ['オートブレーキ', 'OFF', null, null, '自動の制動を解きます。ここからは足のブレーキです。', null],
    ['ストロボ・着陸灯', 'OFF（タキシー灯は ON）', c => !c.sw.strobe && !c.sw.landing, 'sw.strobe', '', c => { c.sw.strobe = false; c.sw.landing = false; }],
    ['燃料ポンプ', '確認（地上では APU の準備）', null, null, 'エンジンを止める前に APU を回すかどうか、機長と確かめます。', null],
  ] },
  shutdown: { title: 'エンジン停止（SHUTDOWN）', items: [
    ['パーキングブレーキ', 'セット', c => c.park, 'parkBrake', '', c => c.act('parkBrake', true)],
    ['スロットル', 'アイドル', c => !c.sys.running || c.s.thr <= 0.06, 'throttle', '', c => c.setThr(0)],
    ['始動レバー', 'カットオフ（エンジン停止）', c => !c.sys.running, null, 'エンジンは、燃料を止めて止めます。レバーをカットオフへ。N1 が下がり切るまで見ます。', null],
    ['アビオニクス スイッチ', 'OFF', c => !c.sw.avionics, 'sw.avionics', '', c => { c.sw.avionics = false; }],
    ['灯火（ビーコン以外）', 'OFF', c => !c.sw.nav && !c.sw.strobe && !c.sw.landing && !c.sw.taxi, 'sw.nav', '', c => { c.sw.nav = false; c.sw.strobe = false; c.sw.landing = false; c.sw.taxi = false; }],
    ['燃料ポンプ', 'OFF', c => !c.sw.fuelPump, 'sw.fuelPump', 'APU を止めるまで、と言うときはそのままです。今日はここで全部止めます。', c => { c.sw.fuelPump = false; }],
    ['APU', '停止（または外部電源へ）', null, null, 'ゲートの電源に替わったら、APU を止めます。', null],
    ['マスター／バッテリー', 'OFF', c => !c.sw.master, 'sw.master', '', c => { c.sw.master = false; }],
    ['ビーコン', 'OFF（スイッチ）', c => !c.sw.beacon, 'sw.beacon', 'マスターを切ると消えますが、スイッチも切っておきます。', c => { c.sw.beacon = false; }],
  ] },
};
// day.js imports the jet lists by this name (the Archer/Seminole modules export theirs as CHECKLISTS)
export const CHECKLISTS_JET = CHECKLISTS;
