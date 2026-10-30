// CADET — content/checklists-archer.js : the checklists FLIGHT LAB leaves out (its lessons start lined up or in the
// air): before the start, the start, after the start, the run-up, after landing and the shutdown. Written for the game
// from the published PA-28-181 training checklists' items, simplified; the aircraft's POH and the school's checklist
// govern. The before-takeoff and before-landing checklists are FLIGHT LAB's own (in its lessons t1 and t3).
// The game's trainer has a key for the magnetos and the start and one master switch. The G1000 Archer III's POH
// (VB-2266) and the published school checklist (R.archerCk) have left and right magneto switches and a starter switch
// on the overhead panel, and BATT MASTR and ALTR switches: the instructor says so where the item is (it differs by
// year and equipment — the aircraft's own checklist governs; ERRATA SYNC.cadet-checklist-mag).
// Each item: [name, what (the setting), test(c) → true when it is set (null: the cadet confirms it, Enter or a click),
// the cockpit control to look at (its id in aircraft/cockpit.js), a note the instructor adds, set(c): what the
// instructor's hands do for it when the cadet leaves it to him (null: nothing to set)]. c: { sw, sys, s, park,
// av, rpm (the engine's own rpm), memo (what the run-up saw), walk (the walk-around done), act(name, arg) (the flight bridge's action), setThr(x), setFlaps(i), prime() }.
const near = (x, v, d) => Math.abs(x - v) <= d;
export const CHECKLISTS = {
  before_start: { title: 'エンジン始動前（BEFORE STARTING ENGINE）', items: [
    ['外部点検', '完了', c => c.walk, null, '機体の周りは見終わりましたね。', null],
    ['座席・シートベルト・ドア', '調整・着用・ロック', null, 'door', '座席を合わせて、ベルトを締めます。ドアは上と横の 2 か所でロックします。', null],
    ['サーキット ブレーカー', 'すべて押し込まれている', null, 'cb', '飛び出しているものがないか、右下の列を見ます。', null],
    ['アビオニクス スイッチ', 'OFF', c => !c.sw.avionics, 'sw.avionics', '始動のときの電圧の変動から、画面を守ります。', c => { c.sw.avionics = false; }],
    ['パーキングブレーキ', 'セット', c => c.park, 'parkBrake', '', c => c.act('parkBrake', true)],
    ['燃料セレクター', '左か右のタンク', c => c.sw.fuelSel === 'L' || c.sw.fuelSel === 'R', 'fuelSel', '今日は左のタンクから使います。', c => { c.sw.fuelSel = 'L'; }],
  ] },
  start: { title: 'エンジン始動（STARTING ENGINE・冷えているとき）', items: [
    ['ミクスチャー', 'フル リッチ（いちばん前）', c => c.sw.mixture >= 0.95, 'mixture', 'ミクスチャーは赤いレバーです。いちばん前まで。', c => { c.sw.mixture = 1; }],
    ['スロットル', '1/4 インチ開く', c => c.s.thr >= 0.03 && c.s.thr <= 0.16, 'throttle', 'ほんの少しだけ。ホイールで 1 目盛りです。', c => c.setThr(0.05)],
    ['マスター スイッチ', 'ON', c => c.sw.master, 'sw.master', '赤いスイッチです。G1000 の Archer III では BATT MASTR と ALTR の 2 つに分かれています。年式や装備で違います。', c => { c.sw.master = true; }],
    ['ビーコン', 'ON', c => c.sw.beacon, 'sw.beacon', '周りの人に「エンジンをかけます」と知らせる灯火です。', c => { c.sw.beacon = true; }],
    ['燃料ポンプ', 'ON', c => c.sw.fuelPump, 'sw.fuelPump', '', c => { c.sw.fuelPump = true; }],
    ['プライマー', '2〜3 回', c => c.sys.primes >= 2 || c.sys.running, 'primer', 'エンジンが冷えているので、燃料を少し送っておきます。押しすぎないように。', c => { if (c.sys.primes < 3) c.prime(); }],
    ['プロペラの周り', '人がいないことを確かめ、「クリア！」', null, null, '窓から周りを見て、大きな声で「プロペラ、クリア！」。', null],
    ['マグネトー', 'START（かかったら離す）', c => c.sys.running, 'mag', 'キーを START まで回します。かかったら手を離すと BOTH に戻ります。この機体はキー式です。G1000 の Archer III は、天井のパネルの左右のマグネトーのスイッチと、始動のスイッチを使います。', c => { if (!c.sys.cranking && !c.sys.running) c.sw.mag = 'START'; }],
    ['スロットル', '1,000 rpm', c => c.sys.running && near(c.rpm, 1000, 160), 'throttle', '', c => c.setThr(0.045)],
    ['油圧', '30 秒以内に上がる', c => c.sys.running && c.sys.oil > 25, null, 'MFD のエンジン計器で確かめます。', null],
  ] },
  after_start: { title: 'エンジン始動後（AFTER START）', items: [
    ['アビオニクス スイッチ', 'ON', c => c.sw.avionics, 'sw.avionics', '', c => { c.sw.avionics = true; }],
    ['燃料ポンプ', 'OFF（エンジンのポンプの確認）', c => !c.sw.fuelPump, 'sw.fuelPump', '', c => { c.sw.fuelPump = false; }],
    ['航法灯', 'ON', c => c.sw.nav, 'sw.nav', '', c => { c.sw.nav = true; }],
    ['フラップ', 'UP', c => c.s.flapIdx === 0, 'flaps', '', c => c.setFlaps(0)],
    ['高度計', 'ATIS の値（29.92）', c => !!c.av && near(c.av.baro, c.qnh ?? 29.92, 0.005), 'pfd.crs.outer', '', c => { if (c.av) c.av.baro = c.qnh ?? 29.92; }],
  ] },
  runup: { title: 'ランナップ（RUN-UP）', items: [
    ['パーキングブレーキ', 'セット', c => c.park, 'parkBrake', '止まって、機首を風上へ。プロペラの後ろに人や機体がないこと。', c => c.act('parkBrake', true)],
    ['スロットル', '2,000 rpm', c => c.rpm >= 1900 && c.rpm <= 2120 && c.memo.both > 0, 'throttle', '', c => c.setThr(0.67)],
    ['マグネトー L', '回転の低下 175 rpm 以内', c => c.memo.dropL > 20 && c.memo.dropL <= 175, 'mag', 'キーを L に。回転がどれだけ下がるか見ます。', c => { c.sw.mag = 'L'; }],
    ['マグネトー R', '低下 175 rpm 以内・左右の差 50 rpm 以内', c => c.memo.dropR > 20 && c.memo.dropR <= 175 && Math.abs(c.memo.dropL - c.memo.dropR) <= 50, 'mag', '次に R。', c => { c.sw.mag = 'R'; }],
    ['マグネトー', 'BOTH', c => c.sw.mag === 'BOTH' && c.memo.dropR > 0, 'mag', '必ず BOTH に戻します。', c => { c.sw.mag = 'BOTH'; }],
    ['キャブレター ヒート', 'ON で回転が下がる → OFF', c => c.memo.carb > 20 && !c.sw.carbHeat, 'carbHeat', '気化器の暖め。引くと少し回転が下がります。確かめたら戻します。', c => { c.sw.carbHeat = !(c.memo.carb > 20); }],
    ['エンジン計器', '緑の範囲', null, null, '油圧・油温・燃料の圧力。MFD で見ます。', null],
    ['スロットル', 'アイドルを確かめて 1,000 rpm', c => c.memo.idle && near(c.rpm, 1000, 200), 'throttle', 'いったんアイドルまで絞って、止まらないことを確かめます。', c => c.setThr(c.memo.idle ? 0.045 : 0)],
    ['燃料ポンプ', 'ON（離陸と着陸のとき）', c => c.sw.fuelPump, 'sw.fuelPump', '', c => { c.sw.fuelPump = true; }],
    ['ストロボ・着陸灯', 'ON', c => c.sw.strobe && c.sw.landing, 'sw.landing', '滑走路に入る前に。', c => { c.sw.strobe = true; c.sw.landing = true; }],
  ] },
  after_landing: { title: '着陸後（AFTER LANDING：滑走路を出てから）', items: [
    ['フラップ', 'UP', c => c.s.flapIdx === 0, 'flaps', '', c => c.setFlaps(0)],
    ['燃料ポンプ', 'OFF', c => !c.sw.fuelPump, 'sw.fuelPump', '', c => { c.sw.fuelPump = false; }],
    ['ストロボ・着陸灯', 'OFF（タキシー灯はお好みで）', c => !c.sw.strobe && !c.sw.landing, 'sw.strobe', '', c => { c.sw.strobe = false; c.sw.landing = false; }],
  ] },
  shutdown: { title: 'エンジン停止（SHUTDOWN）', items: [
    ['パーキングブレーキ', 'セット', c => c.park, 'parkBrake', '', c => c.act('parkBrake', true)],
    ['スロットル', '1,000 rpm', c => !c.sys.running || near(c.rpm, 1000, 220), 'throttle', '', c => c.setThr(0.045)],
    ['アビオニクス スイッチ', 'OFF', c => !c.sw.avionics, 'sw.avionics', '', c => { c.sw.avionics = false; }],
    ['灯火（ビーコン以外）', 'OFF', c => !c.sw.nav && !c.sw.strobe && !c.sw.landing && !c.sw.taxi, 'sw.nav', '', c => { c.sw.nav = false; c.sw.strobe = false; c.sw.landing = false; c.sw.taxi = false; }],
    ['ミクスチャー', 'アイドル カットオフ（いちばん手前）', c => !c.sys.running, 'mixture', 'エンジンは、燃料を止めて止めます。', c => { c.sw.mixture = 0; }],
    ['マグネトー', 'OFF・キーを抜く', c => c.sw.mag === 'OFF', 'mag', '', c => { c.sw.mag = 'OFF'; }],
    ['マスター スイッチ', 'OFF', c => !c.sw.master, 'sw.master', '', c => { c.sw.master = false; }],
    ['ビーコン', 'OFF（スイッチ）', c => !c.sw.beacon, 'sw.beacon', 'マスターを切ると消えますが、スイッチも切っておきます。', c => { c.sw.beacon = false; }],
  ] },
};
