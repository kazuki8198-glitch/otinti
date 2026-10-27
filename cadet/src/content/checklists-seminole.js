// CADET — content/checklists-seminole.js : the twin's ground checklists (M6; round R3: the G1000 NXi Seminole's own), as
// the Archer's (content/checklists-archer.js: the same item format, its items reused where they are the same), written
// for the game from the PA-44-180's POH (VB-2636 section 4: 4.5b before starting, 4.5c the cold start, 4.5d warm-up and
// before taxiing, 4.5f the ground check, 4.5n after landing, 4.5o stopping) and simplified as the Archer's are; the
// aircraft's POH and the school's checklist govern.
// The switches are the Seminole cockpit's own (aircraft/cockpit.js SEM; aircraft/systems.js's fields): the engine
// switches under the left yoke (each engine's MAG LEFT / RIGHT, the L ENG | R ENG START rocker), the bank left of the
// throttles (BATT MASTR, LEFT / RIGHT ALTR, AVION MASTER, EMERG BATT), the bank right of them (PITOT HEAT, NAV, RECOG,
// LANDING, the strobe), the L / R FUEL PUMP rockers; the six levers (each engine's mixture its own), the alternate air
// and the cowl flaps, the gear selector, the fuel selector levers between the seats (ON / OFF / XFEED). The start is
// the fuel-injected engine's, each in turn, the left first: its pump ON, both its magnetos ON, its mixture forward a few
// seconds (the prime) and back to cut-off, START held, the mixture forward as it fires. Left out (the game's model has
// nothing for them): the volts and amps (a look: the MFD shows "—"), the propellers' exercise at 2,200 rpm (one cycle,
// the feather check at 1,500, stands for both), the 30 s on crossfeed (XFEED_S here).
import { CHECKLISTS as A } from './checklists-archer.js';
import { PRIME } from '../aircraft/systems.js';

const near = (x, v, d) => Math.abs(x - v) <= d;
// one of the Archer's items, as it is (k: the k-th of that name)
const item = (list, name, k = 0) => { const it = A[list].items.filter(x => x[0] === name)[k]; if (!it) throw new Error(`checklists-seminole: no ${list} item ${name}`); return it; };
// the fuel selector levers between the seats (their controls: the console's, aircraft/cockpit.js CON44 — the ring on the
// left engine's lever, the right one beside it)
const FUEL_CTL = 'fuelSelL';
// both of a pair of switch fields (the left engine's, the right's) set to v
const both = (c, a, b, v) => { c.sw[a] = v; c.sw[b] = v; };
// how long both selectors stay on XFEED in the check before taxiing (the POH's 30 s, shortened for the game: day.js)
export const XFEED_S = 5;
// the engine k's start, the POH's starred items (k: 0 the left, 1 the right; its pump, magnetos, mixture, START half)
function engineStart(k) {
  const L = !k, ja = L ? '左' : '右', pump = L ? 'fuelPump' : 'rFuelPump', ma = L ? 'magL' : 'rMagL', mb = L ? 'magR' : 'rMagR', mix = L ? 'mixture' : 'mixtureR';
  const run = c => (L ? c.sys.runningL : c.sys.runningR), t = c => c.sys.twinLive[k];
  return [
    [`${ja}の燃料ポンプ（${L ? 'LEFT' : 'RIGHT'} FUEL PUMP）`, 'ON', c => !!c.sw[pump], 'sw.' + pump, L ? 'まず左のエンジンから。左の FUEL PUMP のスイッチ（左の操縦輪の右下）。' : '左が回ったら、右のエンジン。右の FUEL PUMP。', c => { c.sw[pump] = true; }],
    [`${ja}エンジンのマグネトー`, 'LEFT・RIGHT とも ON', c => !!(c.sw[ma] && c.sw[mb]), 'sw.' + ma, L ? '左ひざの前のスイッチの、左の 2 つ（LEFT ENG MAG LEFT・RIGHT）。' : '右の 2 つ（RIGHT ENG MAG LEFT・RIGHT）。', c => { c.sw[ma] = true; c.sw[mb] = true; }],
    [`${ja}のミクスチャー`, 'プライム（3 秒ほど前へ）→ カットオフ', c => run(c) || (t(c).prime >= PRIME.min && c.sw[mix] < 0.15), L ? 'mixture' : 'mixtureR',
      '燃料ポンプが ON のまま赤いレバーを 3 秒ほど前へ出すと、エンジンに燃料が送られます（プライム）。送ったら、いちばん手前（カットオフ）に戻します。出しすぎると燃料が多すぎてかかりません。',
      c => { c.sw[mix] = t(c).prime < PRIME.ok ? 1 : 0; }],
    item('start', 'プロペラの周り'),
    [`${ja}エンジンのスターター（${L ? 'L' : 'R'} ENG START）`, '押す（かかったら離す）', run, L ? 'sw.startL' : 'sw.startR',
      `左ひざの前の、横向きのスイッチの${ja}側。押している間スターターが回ります。かかったら手を離します。`, c => { if (!c.sys.cranking && !run(c)) c.sw.start = L ? 'L' : 'R'; }],
    [`${ja}のミクスチャー`, 'かかったら前へ（リッチ）', c => run(c) && c.sw[mix] >= 0.95, L ? 'mixture' : 'mixtureR',
      'かかったら、すぐに赤いレバーを前へ。カットオフのままだと、プライムの燃料を使い切って止まります。', c => { c.sw[mix] = 1; if (!run(c) && !c.sys.cranking) c.sw.start = L ? 'L' : 'R'; }],
    ...(L ? [['スロットル', '1,000 rpm', c => run(c) && near(c.rpm, 1000, 180), 'throttle', '', c => c.setThr(0.045)]] : []),
    [`${ja}の油圧`, '30 秒以内に上がる', c => run(c) && t(c).oil > 25, null, 'MFD のエンジン計器で。上がらなければ、すぐにそのエンジンを止めます。', null],
  ];
}
// the run-up's magneto check of engine k: one magneto OFF (the drop on the other alone, held a moment), back ON
function magCheck(k) {
  const L = !k, eng = L ? '左エンジン' : '右エンジン', ma = L ? 'magL' : 'rMagL', mb = L ? 'magR' : 'rMagR', dL = L ? 'dropL' : 'rDropL', dR = L ? 'dropR' : 'rDropR';
  return [
    [`${eng}：MAG RIGHT OFF`, '左だけ：低下 175 rpm 以内 → ON に戻す', c => c.memo[dL] > 20 && c.memo[dL] <= 175 && !!c.sw[mb], 'sw.' + mb,
      `${eng}の右のマグネトーを切ると、左だけで回ります。MFD の${L ? '左' : '右'}の回転計でどれだけ下がるか見て、ON に戻します。`, c => { if (!(c.memo[dL] > 20)) { c.sw[ma] = true; c.sw[mb] = false; } else c.sw[mb] = true; }],
    [`${eng}：MAG LEFT OFF`, '右だけ：低下 175 rpm 以内・左右の差 50 rpm 以内 → ON に戻す', c => c.memo[dR] > 20 && c.memo[dR] <= 175 && Math.abs(c.memo[dL] - c.memo[dR]) <= 50 && !!c.sw[ma], 'sw.' + ma,
      '今度は左を切って、右だけで。見たら ON に戻します（両方 OFF にするとエンジンが止まります）。', c => { if (!(c.memo[dR] > 20)) { c.sw[mb] = true; c.sw[ma] = false; } else c.sw[ma] = true; }],
  ];
}
export const CHECKLISTS = {
  before_start: { title: 'エンジン始動前（BEFORE STARTING ENGINES）', items: [
    item('before_start', '外部点検'),
    ['ドア・座席・シートベルト', 'ロック（下、それから上）・調整・着用', null, 'door', 'ドアは下の掛け金を先に、それから上の掛け金。座席を合わせて、ベルトを締めます。', null],
    ['パーキングブレーキ', 'セット', c => c.park, 'parkBrake', 'つま先のブレーキを踏んで、PARK BRAKE のつまみを引きます。', c => c.act('parkBrake', true)],
    ['脚のレバー', 'DOWN', c => c.s.gearDown !== false, 'gear', '引き込み脚の機体です。地上では、脚のレバーが DOWN にあることを必ず確かめます。', null],
    ['スロットル', 'アイドル（左右とも）', c => c.s.thr <= 0.02, 'throttle', '黒いレバーを 2 本とも、いちばん手前まで。', c => c.setThr(0)],
    ['プロペラ', 'いちばん前（高回転）', null, 'prop', '青いレバーを 2 本とも、いちばん前まで。', null],
    ['ミクスチャー', 'カットオフ（左右とも）', c => c.sw.mixture < 0.15 && c.sw.mixtureR < 0.15, 'mixture', '赤いレバーを 2 本とも、いちばん手前まで。', c => both(c, 'mixture', 'mixtureR', 0)],
    ['代替空気（ALT AIR）', 'CLOSE（上）', c => !c.sw.altAir, 'altAir', 'クアドラントの下の 2 つのつまみ。上がフィルターを通った空気（CLOSE）です。', c => { c.sw.altAir = false; }],
    ['カウル フラップ', 'OPEN（押す）', c => c.sw.cowlFlaps === 'OPEN', 'cowlFlaps', 'エンジンを冷やす空気の出口。地上では開けておきます。足もとの 2 本のレバーを、ロックを押しながら前へ。', c => { c.sw.cowlFlaps = 'OPEN'; }],
    ['トリム', '離陸の位置', c => Math.abs(c.s.trim || 0) < 1e-6, 'trim', 'スタビレーターのトリムを離陸の位置に。ラダーのトリムは中立。', c => c.act('trimReset')],
    ['燃料セレクター', 'ON（左右とも）', c => c.sw.fuelSelL === 'ON' && c.sw.fuelSelR === 'ON', FUEL_CTL, '席の間の 2 本のレバー。前が ON、まん中が OFF、後ろが XFEED です。', c => both(c, 'fuelSelL', 'fuelSelR', 'ON')],
    ['オルタネーター（LEFT・RIGHT ALTR）', 'ON（左右とも）', c => c.sw.altr && c.sw.rAltr, 'sw.altr', 'スロットルの左のスイッチの列。', c => both(c, 'altr', 'rAltr', true)],
    item('before_start', '非常用バッテリー（EMERG BATT）'),
    ['アビオニクス マスター', 'OFF', c => !c.sw.avionics, 'sw.avionics', '始動のときの電圧の変動から、画面を守ります。', c => { c.sw.avionics = false; }],
    ['ストロボ', 'FIN STROBE（尾翼だけ）', c => !c.sw.strobe && c.sw.beacon, 'sw.strobe', '尾翼の衝突防止灯。周りの人に「エンジンをかけます」と知らせます。スロットルの右の列の、右端のスイッチを下へ。', c => { c.sw.strobe = false; c.sw.beacon = true; }],
    ['そのほかの電気のスイッチ', 'OFF', c => !c.sw.master && !c.sw.fuelPump && !c.sw.rFuelPump && !c.sw.nav && !c.sw.recog && !c.sw.landing && !c.sw.pitot, 'sw.nav', 'バッテリー マスター・燃料ポンプ・灯火・ピトー ヒート。',
      c => { for (const k of ['master', 'fuelPump', 'rFuelPump', 'nav', 'recog', 'landing', 'pitot']) c.sw[k] = false; }],
    ['キャビン ヒーター', 'OFF', c => c.sw.heater === 'OFF', 'sw.heater', '右端の CABIN HEAT のスイッチ。', c => { c.sw.heater = 'OFF'; }],
    item('before_start', 'サーキット ブレーカー'),
  ] },
  start: { title: 'エンジン始動（STARTING ENGINES・冷えているとき・左から）', items: [
    ['バッテリー マスター（BATT MASTR）', 'ON', c => c.sw.master, 'sw.master', 'スロットルの左のスイッチの列の、いちばん左。', c => { c.sw.master = true; }],
    ['脚の表示', '緑 3 つ', c => c.sw.master && c.s.gearPos >= 0.999, 'gear', '脚の位置は画面に出ます。MFD が消えている間は、PFD の左上の LANDING GEAR。緑の丸が 3 つで、下りて固定されています。', null],
    ['スロットル', '1/4 インチ開く（左右とも）', c => c.s.thr >= 0.03 && c.s.thr <= 0.16, 'throttle', '左右のレバーを、ほんの少しだけ。', c => c.setThr(0.05)],
    ['プロペラ', 'いちばん前（高回転）', null, 'prop', '', null],
    ...engineStart(0),
    ...engineStart(1),
    ['電圧・発電（VOLTS・ALTR AMPS）', '確かめる', null, null, '両方のオルタネーターが発電していることを、電気の表示で確かめます（この機体の画面では省いています）。', null],
    ['燃料ポンプ', 'OFF（左右とも）', c => !c.sw.fuelPump && !c.sw.rFuelPump, 'sw.fuelPump', 'エンジンについているポンプで燃料が来ることを確かめます。', c => both(c, 'fuelPump', 'rFuelPump', false)],
  ] },
  after_start: { title: 'タキシーの前（BEFORE TAXIING）', items: [
    ['燃料セレクター', 'ON → 左右とも XFEED（数秒）→ ON', c => !!c.memo.xfeed && c.sw.fuelSelL === 'ON' && c.sw.fuelSelR === 'ON', FUEL_CTL,
      'クロスフィード（反対側のタンクから送る道）を確かめます。2 本とも XFEED にして、両方のエンジンが回り続けるのを見てから ON に戻します（実機は 30 秒）。',
      c => { both(c, 'fuelSelL', 'fuelSelR', c.memo.xfeed ? 'ON' : 'XFEED'); }],
    ['アビオニクス マスター', 'ON', c => c.sw.avionics, 'sw.avionics', 'MFD が点きます。', c => { c.sw.avionics = true; }],
    ['航法灯（NAV LIGHTS）', 'ON', c => c.sw.nav, 'sw.nav', '', c => { c.sw.nav = true; }],
    item('after_start', 'フラップ'), item('after_start', '高度計'),
  ] },
  runup: { title: '地上点検（GROUND CHECK）', items: [
    item('runup', 'パーキングブレーキ'),
    ['ミクスチャー', 'リッチ（左右とも）', c => c.sw.mixture >= 0.95 && c.sw.mixtureR >= 0.95, 'mixture', '', c => both(c, 'mixture', 'mixtureR', 1)],
    ['スロットル', '1,500 rpm', c => c.rpm >= 1420 && c.rpm <= 1600, 'throttle', '', c => c.setThr(0.36)],
    ['プロペラ', 'フェザーの確認（低下 500 rpm 以内）', c => !!c.sw.propCycled, 'prop', '青いレバーを 2 本とも、フェザーの手前まで引いて回転が下がり、前へ戻すと上がることを確かめます。下がりすぎ（500 rpm より多い）は不可。', c => { if (!(c.sw.propCycleT > 0)) c.sw.propCycleT = 2.6; }],
    item('runup', 'スロットル'),
    ...magCheck(0),
    ...magCheck(1),
    ['代替空気（ALT AIR）', 'OPEN で少し下がる → CLOSE', c => c.memo.alt > 15 && !c.sw.altAir, 'altAir', 'つまみを下げる（OPEN）と、フィルターを通らない暖かい空気になって、回転が少し下がります。確かめたら上（CLOSE）に戻します。', c => { c.sw.altAir = !(c.memo.alt > 15); }],
    item('runup', 'スロットル', 1),
    ['燃料ポンプ', 'ON（左右とも：離陸と着陸のとき）', c => c.sw.fuelPump && c.sw.rFuelPump, 'sw.fuelPump', '', c => both(c, 'fuelPump', 'rFuelPump', true)],
    ['摩擦（FRICTION）', 'セット', null, 'friction', 'レバーが勝手に動かないように、クアドラントの右の摩擦のレバーを締めます。', null],
    ['ストロボ・着陸灯', 'ON', c => c.sw.strobe && c.sw.landing, 'sw.landing', '滑走路に入る前に。', c => { c.sw.strobe = true; c.sw.beacon = true; c.sw.landing = true; }],
  ] },
  after_landing: { title: '着陸後（AFTER LANDING：滑走路を出てから）', items: [
    item('after_landing', 'フラップ'),
    ['カウル フラップ', 'OPEN', c => c.sw.cowlFlaps === 'OPEN', 'cowlFlaps', '', c => { c.sw.cowlFlaps = 'OPEN'; }],
    ['代替空気（ALT AIR）', 'CLOSE', c => !c.sw.altAir, 'altAir', '', c => { c.sw.altAir = false; }],
    ['燃料ポンプ', 'OFF（左右とも）', c => !c.sw.fuelPump && !c.sw.rFuelPump, 'sw.fuelPump', '', c => both(c, 'fuelPump', 'rFuelPump', false)],
    item('after_landing', 'ストロボ'),
    ['ピトー ヒート', 'OFF', c => !c.sw.pitot, 'sw.pitot', '', c => { c.sw.pitot = false; }],
  ] },
  shutdown: { title: 'エンジン停止（STOPPING ENGINES）', items: [
    item('shutdown', 'パーキングブレーキ'),
    ['キャビン ヒーター・換気ファン', 'OFF', c => c.sw.heater === 'OFF' && c.sw.ventFan === 'OFF', 'sw.heater', 'ヒーターを使ったときは、FAN で 2 分回してから OFF にします。', c => { c.sw.heater = 'OFF'; c.sw.ventFan = 'OFF'; }],
    ['アビオニクス マスター', 'OFF', c => !c.sw.avionics, 'sw.avionics', '', c => { c.sw.avionics = false; }],
    item('shutdown', '非常用バッテリー（EMERG BATT）'),
    ['オルタネーター（LEFT・RIGHT ALTR）', 'OFF（左右とも）', c => !c.sw.altr && !c.sw.rAltr, 'sw.altr', '', c => both(c, 'altr', 'rAltr', false)],
    ['燃料ポンプ', 'OFF（左右とも）', c => !c.sw.fuelPump && !c.sw.rFuelPump, 'sw.fuelPump', '', c => both(c, 'fuelPump', 'rFuelPump', false)],
    ['スロットル', 'アイドル', c => !c.sys.anyRunning || c.s.thr <= 0.02, 'throttle', '', c => c.setThr(0)],
    ['ミクスチャー', 'カットオフ（左右とも）', c => !c.sys.anyRunning, 'mixture', 'エンジンは、燃料を止めて止めます。左右とも。', c => both(c, 'mixture', 'mixtureR', 0)],
    ['マグネトー', '4 つとも OFF', c => !c.sw.magL && !c.sw.magR && !c.sw.rMagL && !c.sw.rMagR, 'sw.magL', '', c => { for (const k of ['magL', 'magR', 'rMagL', 'rMagR']) c.sw[k] = false; }],
    ['外部の灯火', 'OFF', c => !c.sw.nav && !c.sw.recog && !c.sw.strobe && !c.sw.beacon && !c.sw.landing, 'sw.nav', '航法灯・識別灯・ストロボ（フィン ストロボも）・着陸灯。',
      c => { for (const k of ['nav', 'recog', 'strobe', 'beacon', 'landing']) c.sw[k] = false; }],
    item('shutdown', 'バッテリー マスター（BATT MASTR）'),
  ] },
};
