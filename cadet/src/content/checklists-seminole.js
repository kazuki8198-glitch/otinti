// CADET — content/checklists-seminole.js : the twin's ground checklists (M6): the Archer's (content/checklists-archer.js)
// where the items are the same, with what a published PA-44 training checklist adds: the gear lever checked DOWN before
// the start, the two engines started one after the other (the left first), the propellers cycled (and the feathering
// checked) in the run-up. The switches are the Seminole cockpit's own until its own layout (round R3): the panel row
// (MASTER, AVIONICS, FUEL PUMP, BEACON, NAV, STROBE, LANDING, TAXI, PITOT HEAT), the key (OFF / R / L / BOTH / START: it
// sets aircraft/systems.js's magL, magR and start) and the plunger primer; the gear selector and the propeller levers are
// its own too (aircraft/cockpit.js setType('pa44')).
// Simplified, written for the game; the aircraft's POH and the school's checklist govern.
import { CHECKLISTS as A } from './checklists-archer.js';

const near = (x, v, d) => Math.abs(x - v) <= d;
// one of the Archer's items, as it is (k: the k-th of that name)
const item = (list, name, k = 0) => { const it = A[list].items.filter(x => x[0] === name)[k]; if (!it) throw new Error(`checklists-seminole: no ${list} item ${name}`); return it; };
// the key's positions on the switches' own fields (the checklists' hands work on aircraft/systems.js's switches)
const key = (sw, pos) => { sw.magL = pos === 'L' || pos === 'BOTH' || pos === 'START'; sw.magR = pos === 'R' || pos === 'BOTH' || pos === 'START'; sw.start = pos === 'START'; };
export const CHECKLISTS = {
  before_start: { title: 'エンジン始動前（BEFORE STARTING ENGINES）', items: [
    item('before_start', '外部点検'), item('before_start', '座席・シートベルト・ドア'), item('before_start', 'サーキット ブレーカー'),
    ['アビオニクス スイッチ', 'OFF', c => !c.sw.avionics, 'sw.avionics', '始動のときの電圧の変動から、画面を守ります。', c => { c.sw.avionics = false; }],
    item('before_start', 'パーキングブレーキ'), item('before_start', '燃料セレクター'),
    ['脚のレバー', 'DOWN（緑のランプ 3 つ）', null, 'gear', '引き込み脚の機体です。地上では、脚のレバーが DOWN にあり、緑のランプが 3 つ点いていることを必ず確かめます。', null],
  ] },
  start: { title: 'エンジン始動（STARTING ENGINES・左から）', items: [
    ['ミクスチャー', 'フル リッチ（左右とも）', c => c.sw.mixture >= 0.95, 'mixture', '赤いレバーを 2 本とも、いちばん前まで。', c => { c.sw.mixture = 1; }],
    ['スロットル', '1/4 インチ開く（左右とも）', c => c.s.thr >= 0.03 && c.s.thr <= 0.16, 'throttle', '左右のレバーを、ほんの少しだけ。', c => c.setThr(0.05)],
    ['マスター スイッチ', 'ON', c => c.sw.master, 'sw.master', '赤いスイッチです。', c => { c.sw.master = true; }],
    ['ビーコン', 'ON', c => c.sw.beacon, 'sw.beacon', '周りの人に「エンジンをかけます」と知らせる灯火です。', c => { c.sw.beacon = true; }],
    ['燃料ポンプ', 'ON', c => c.sw.fuelPump, 'sw.fuelPump', '', c => { c.sw.fuelPump = true; }],
    ['プライマー', '2〜3 回', c => c.sys.primes >= 2 || c.sys.running, 'primer', 'エンジンが冷えているので、燃料を少し送っておきます。押しすぎないように。', c => { if (c.sys.primes < 3) c.prime(); }],
    item('start', 'プロペラの周り'),
    ['左エンジン', 'START（かかったら離す）', c => c.sys.runningL || c.sys.running, 'mag', 'まず左のエンジンから。キーを START まで回し、かかったら手を離します。', c => { if (!c.sys.cranking && !c.sys.runningL) key(c.sw, 'START'); }],
    ['右エンジン', 'START（かかったら離す）', c => c.sys.running, 'mag', '左が回ったら、右。もう一度 START です。', c => { if (!c.sys.cranking && c.sys.runningL && !c.sys.running) key(c.sw, 'START'); }],
    ['スロットル', '1,000 rpm（左右とも）', c => c.sys.running && near(c.rpm, 1000, 180), 'throttle', '', c => c.setThr(0.045)],
    ['油圧', '左右とも 30 秒以内に上がる', c => c.sys.running && c.sys.oil > 25, null, 'MFD のエンジン計器で、左右の両方を確かめます。', null],
  ] },
  after_start: { title: 'エンジン始動後（AFTER START）', items: [
    ['アビオニクス スイッチ', 'ON', c => c.sw.avionics, 'sw.avionics', '', c => { c.sw.avionics = true; }],
    item('after_start', '燃料ポンプ'),
    ['航法灯', 'ON', c => c.sw.nav, 'sw.nav', '', c => { c.sw.nav = true; }],
    item('after_start', 'フラップ'), item('after_start', '高度計'),
  ] },
  runup: { title: 'ランナップ（RUN-UP）', items: [
    item('runup', 'パーキングブレーキ'), item('runup', 'スロットル'),
    ['マグネトー L', '回転の低下 175 rpm 以内', c => c.memo.dropL > 20 && c.memo.dropL <= 175, 'mag', 'キーを L に。回転がどれだけ下がるか見ます。', c => { key(c.sw, 'L'); }],
    ['マグネトー R', '低下 175 rpm 以内・左右の差 50 rpm 以内', c => c.memo.dropR > 20 && c.memo.dropR <= 175 && Math.abs(c.memo.dropL - c.memo.dropR) <= 50, 'mag', '次に R。', c => { key(c.sw, 'R'); }],
    ['マグネトー', 'BOTH', c => c.sw.magL && c.sw.magR && c.memo.dropR > 0, 'mag', '必ず BOTH に戻します。', c => { key(c.sw, 'BOTH'); }],
    item('runup', 'キャブレター ヒート'),
    ['プロペラ', 'サイクル（定速プロペラ・フェザーの確認）', c => !!c.sw.propCycled, 'prop', '青いプロペラのレバーを引いて回転が下がり、戻すと上がることを確かめます。左右とも。', c => { if (!(c.sw.propCycleT > 0)) c.sw.propCycleT = 2.6; }],
    item('runup', 'エンジン計器'), item('runup', 'スロットル', 1),
    item('runup', '燃料ポンプ'),
    ['ストロボ・着陸灯', 'ON', c => c.sw.strobe && c.sw.landing, 'sw.landing', '滑走路に入る前に。', c => { c.sw.strobe = true; c.sw.landing = true; }],
  ] },
  after_landing: { title: '着陸後（AFTER LANDING：滑走路を出てから）', items: [
    item('after_landing', 'フラップ'), item('after_landing', '燃料ポンプ'),
    ['ストロボ・着陸灯', 'OFF（タキシー灯はお好みで）', c => !c.sw.strobe && !c.sw.landing, 'sw.strobe', '', c => { c.sw.strobe = false; c.sw.landing = false; }],
  ] },
  shutdown: { title: 'エンジン停止（SHUTDOWN）', items: [
    item('shutdown', 'パーキングブレーキ'), item('shutdown', 'スロットル'),
    ['アビオニクス スイッチ', 'OFF', c => !c.sw.avionics, 'sw.avionics', '', c => { c.sw.avionics = false; }],
    ['灯火（ビーコン以外）', 'OFF', c => !c.sw.nav && !c.sw.strobe && !c.sw.landing && !c.sw.taxi, 'sw.nav', '', c => { c.sw.nav = false; c.sw.strobe = false; c.sw.landing = false; c.sw.taxi = false; }],
    item('shutdown', 'ミクスチャー'),
    ['マグネトー', 'OFF・キーを抜く', c => !c.sw.magL && !c.sw.magR, 'mag', '', c => { key(c.sw, 'OFF'); }],
    ['マスター スイッチ', 'OFF', c => !c.sw.master, 'sw.master', '', c => { c.sw.master = false; }],
    ['ビーコン', 'OFF（スイッチ）', c => !c.sw.beacon, 'sw.beacon', 'マスターを切ると消えますが、スイッチも切っておきます。', c => { c.sw.beacon = false; }],
  ] },
};
