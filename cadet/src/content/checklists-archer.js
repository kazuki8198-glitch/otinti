// CADET — content/checklists-archer.js : the checklists FLIGHT LAB leaves out (its lessons start lined up or in the
// air): before the start, the start, after the start, the run-up, after landing and the shutdown. Written for the game
// from a school's normal checklist for the G1000 NXi carbureted Archer (its items, simplified; the switches on the
// overhead panel: BATT MASTR, ALTR, FUEL PUMP, MAG LEFT / RIGHT, START and PRIMER, the strobe's FIN STROBE, EMERG BATT,
// AVION MASTER); the aircraft's POH and the school's checklist govern. The magnetos' ground check at the shutdown is
// left out (the game's engine would stop). The before-takeoff and before-landing checklists are FLIGHT LAB's own (in its
// lessons t1 and t3).
// Each item: [name, what (the setting), test(c) → true when it is set (null: the cadet confirms it, Enter or a click),
// the cockpit control to look at (its id in aircraft/cockpit.js: every one is on the Archer), a note the instructor adds,
// set(c): what the instructor's hands do for it when the cadet leaves it to him (null: nothing to set)]. c: { sw, sys, s,
// park, av, rpm (the engine's own rpm), memo (what the run-up saw), walk (the walk-around done), act(name, arg) (the
// flight bridge's action), setThr(x), setFlaps(i), prime() }. sw's fields are aircraft/systems.js's (the strobe's three
// positions are its lamps: STROBE LIGHTS = strobe + beacon, FIN STROBE = the beacon alone).
const near = (x, v, d) => Math.abs(x - v) <= d;
export const CHECKLISTS = {
  before_start: { title: 'エンジン始動前（BEFORE STARTING ENGINE）', items: [
    ['外部点検', '完了', c => c.walk, null, '機体の周りは見終わりましたね。', null],
    ['座席・シートベルト・ドア', '調整・着用・ロック', null, 'door', '座席を合わせて、ベルトを締めます。ドアは上と横の 2 か所でロックします。', null],
    ['燃料セレクター', '左か右のタンク', c => c.sw.fuelSel === 'L' || c.sw.fuelSel === 'R', 'fuelSel', '今日は左のタンクから使います。', c => { c.sw.fuelSel = 'L'; }],
    ['代替静圧源', 'OFF（押し込んである）', null, 'altStatic', 'パネルの左下のつまみ。押し込んで閉じてあることを確かめます。', null],
    ['パーキングブレーキ', 'セット', c => c.park, 'parkBrake', '', c => c.act('parkBrake', true)],
    ['キャブレター ヒート', 'OFF（上）', c => !c.sw.carbHeat, 'carbHeat', '', c => { c.sw.carbHeat = false; }],
    ['サーキット ブレーカー', 'すべて押し込まれている', null, 'cb', '飛び出しているものがないか、右下の列を見ます。', null],
    ['アビオニクス マスター', 'OFF', c => !c.sw.avionics, 'sw.avionics', '始動のときの電圧の変動から、画面を守ります。スイッチは窓の上の天井のパネルにあります。', c => { c.sw.avionics = false; }],
    ['バッテリー マスター（BATT MASTR）', 'OFF', c => !c.sw.master, 'sw.master', '', c => { c.sw.master = false; }],
    ['非常用バッテリー（EMERG BATT）', 'ARM：PFD と G5 が点く', c => c.sw.emergBatt, 'sw.emergBatt', 'ARM にすると、バッテリー マスターが OFF のままでも、PFD と予備の計器 G5 が非常用のバッテリーで点きます。点いて、赤い × がないことを確かめます。', c => { c.sw.emergBatt = true; }],
  ] },
  start: { title: 'エンジン始動（STARTING ENGINE・冷えているとき）', items: [
    ['バッテリー マスター（BATT MASTR）', 'ON', c => c.sw.master, 'sw.master', '天井のパネルのスイッチで、左から順に入れていきます。', c => { c.sw.master = true; }],
    ['オルタネーター（ALTR）', 'ON', c => c.sw.altr, 'sw.altr', '', c => { c.sw.altr = true; }],
    ['燃料ポンプ', 'ON', c => c.sw.fuelPump, 'sw.fuelPump', '', c => { c.sw.fuelPump = true; }],
    ['左マグネトー（MAG LEFT）', 'ON（右は OFF のまま）', c => c.sw.magL, 'sw.magL', 'かけるときは左のマグネトーだけ。始動のための仕掛け（インパルス カップリング）が左にあります。', c => { c.sw.magL = true; }],
    ['フィン ストロボ（FIN STROBE）', 'ON', c => c.sw.beacon, 'sw.strobe', '尾翼の衝突防止灯。周りの人に「エンジンをかけます」と知らせます。ストロボのスイッチを下へ。', c => { c.sw.beacon = true; c.sw.strobe = false; }],
    ['ミクスチャー', 'フル リッチ（いちばん前）', c => c.sw.mixture >= 0.95, 'mixture', 'ミクスチャーは赤いレバーです。いちばん前まで。', c => { c.sw.mixture = 1; }],
    ['スロットル', '1/4 インチ開く', c => c.s.thr >= 0.03 && c.s.thr <= 0.16, 'throttle', 'ほんの少しだけ。ホイールで 1 目盛りです。', c => c.setThr(0.05)],
    ['プライマー（PRIMER）', '2〜3 回', c => c.sys.primes >= 2 || c.sys.running, 'primer', 'START の右のスイッチ。押すたびに燃料を少し送ります。エンジンが冷えているので 2〜3 回。押しすぎないように。', c => { if (c.sys.primes < 3) c.prime(); }],
    ['プロペラの周り', '人がいないことを確かめ、「クリア！」', null, null, '窓から周りを見て、大きな声で「プロペラ、クリア！」。', null],
    ['スターター（START）', '押す（かかったら離す）', c => c.sys.running, 'sw.start', '天井のパネルの左端。押している間スターターが回ります。かかったら手を離します。', c => { if (!c.sys.cranking && !c.sys.running) c.sw.start = true; }],
    ['スロットル', '1,000 rpm', c => c.sys.running && near(c.rpm, 1000, 160), 'throttle', '', c => c.setThr(0.045)],
    ['右マグネトー（MAG RIGHT）', 'ON', c => c.sw.magR, 'sw.magR', 'かかったら右のマグネトーも ON。これで両方です。', c => { c.sw.magR = true; }],
    ['油圧', '30 秒以内に上がる', c => c.sys.running && c.sys.oil > 25, null, '油圧が上がることを確かめます。上がらなければ、すぐにエンジンを止めます。', null],
    ['アビオニクス マスター', 'ON', c => c.sw.avionics, 'sw.avionics', 'MFD が点きます。', c => { c.sw.avionics = true; }],
  ] },
  after_start: { title: 'エンジン始動後（AFTER START）', items: [
    ['燃料ポンプ', 'OFF（エンジンのポンプの確認）', c => !c.sw.fuelPump, 'sw.fuelPump', '', c => { c.sw.fuelPump = false; }],
    ['航法灯（NAV LIGHT）', 'ON', c => c.sw.nav, 'sw.nav', '', c => { c.sw.nav = true; }],
    ['フラップ', 'UP', c => c.s.flapIdx === 0, 'flaps', '', c => c.setFlaps(0)],
    ['高度計', 'ATIS の値（29.92）', c => !!c.av && near(c.av.baro, c.qnh ?? 29.92, 0.005), 'pfd.crs.outer', '', c => { if (c.av) c.av.baro = c.qnh ?? 29.92; }],
  ] },
  runup: { title: 'ランナップ（RUN-UP）', items: [
    ['パーキングブレーキ', 'セット', c => c.park, 'parkBrake', '止まって、機首を風上へ。プロペラの後ろに人や機体がないこと。', c => c.act('parkBrake', true)],
    ['スロットル', '2,000 rpm', c => c.rpm >= 1900 && c.rpm <= 2120 && c.memo.both > 0, 'throttle', '', c => c.setThr(0.67)],
    ['右マグネトー', 'OFF（左だけ）：回転の低下 175 rpm 以内', c => c.memo.dropL > 20 && c.memo.dropL <= 175, 'sw.magR', '右を OFF にすると、左のマグネトーだけで回ります。回転がどれだけ下がるか見ます。', c => { c.sw.magL = true; c.sw.magR = false; }],
    ['右マグネトー', 'ON に戻す', c => c.sw.magR, 'sw.magR', '先に右を ON に戻します。左を切るのはそのあと（両方 OFF にするとエンジンが止まります）。', c => { c.sw.magR = true; }],
    ['左マグネトー', 'OFF（右だけ）：低下 175 rpm 以内・左右の差 50 rpm 以内', c => c.memo.dropR > 20 && c.memo.dropR <= 175 && Math.abs(c.memo.dropL - c.memo.dropR) <= 50, 'sw.magL', '今度は左を OFF。右のマグネトーだけで回ります。', c => { c.sw.magR = true; c.sw.magL = false; }],
    ['マグネトー', '左右とも ON', c => c.sw.magL && c.sw.magR && c.memo.dropR > 0, 'sw.magL', '必ず両方 ON に戻します。', c => { c.sw.magL = true; c.sw.magR = true; }],
    ['キャブレター ヒート', 'ON で回転が下がる → OFF', c => c.memo.carb > 20 && !c.sw.carbHeat, 'carbHeat', '気化器の暖め。レバーを下げる（ON）と少し回転が下がります。確かめたら上（OFF）に戻します。', c => { c.sw.carbHeat = !(c.memo.carb > 20); }],
    ['エンジン計器', '緑の範囲', null, null, '油圧・油温・燃料の圧力。MFD で見ます。', null],
    ['スロットル', 'アイドルを確かめて 1,000 rpm', c => c.memo.idle && near(c.rpm, 1000, 200), 'throttle', 'いったんアイドルまで絞って、止まらないことを確かめます。', c => c.setThr(c.memo.idle ? 0.045 : 0)],
    ['燃料ポンプ', 'ON（離陸と着陸のとき）', c => c.sw.fuelPump, 'sw.fuelPump', '', c => { c.sw.fuelPump = true; }],
    ['ストロボ（STROBE LIGHTS）', 'ON', c => c.sw.strobe, 'sw.strobe', '滑走路に入る前に。ストロボのスイッチを上へ。翼端のストロボも光ります。', c => { c.sw.strobe = true; c.sw.beacon = true; }],
    ['着陸灯（LANDG LIGHT）', 'ON', c => c.sw.landing, 'sw.landing', '', c => { c.sw.landing = true; }],
  ] },
  after_landing: { title: '着陸後（AFTER LANDING：滑走路を出てから）', items: [
    ['フラップ', 'UP', c => c.s.flapIdx === 0, 'flaps', '', c => c.setFlaps(0)],
    ['燃料ポンプ', 'OFF', c => !c.sw.fuelPump, 'sw.fuelPump', '', c => { c.sw.fuelPump = false; }],
    ['ストロボ', 'FIN STROBE（尾翼だけ）', c => !c.sw.strobe && c.sw.beacon, 'sw.strobe', '翼端のストロボは、まぶしくないように切ります。着陸灯はタキシーの灯りにそのまま。', c => { c.sw.strobe = false; c.sw.beacon = true; }],
  ] },
  shutdown: { title: 'エンジン停止（SHUTDOWN）', items: [
    ['パーキングブレーキ', 'セット', c => c.park, 'parkBrake', '', c => c.act('parkBrake', true)],
    ['スロットル', '1,000 rpm', c => !c.sys.running || near(c.rpm, 1000, 220), 'throttle', '', c => c.setThr(0.045)],
    ['燃料ポンプ', 'OFF', c => !c.sw.fuelPump, 'sw.fuelPump', '', c => { c.sw.fuelPump = false; }],
    ['非常用バッテリー（EMERG BATT）', 'OFF', c => !c.sw.emergBatt, 'sw.emergBatt', '', c => { c.sw.emergBatt = false; }],
    ['アビオニクス マスター', 'OFF', c => !c.sw.avionics, 'sw.avionics', '', c => { c.sw.avionics = false; }],
    ['オルタネーター（ALTR）', 'OFF', c => !c.sw.altr, 'sw.altr', '', c => { c.sw.altr = false; }],
    ['ミクスチャー', 'アイドル カットオフ（いちばん手前）', c => !c.sys.running, 'mixture', 'エンジンは、燃料を止めて止めます。', c => { c.sw.mixture = 0; }],
    ['外部の灯火', 'OFF', c => !c.sw.nav && !c.sw.strobe && !c.sw.beacon && !c.sw.landing, 'sw.nav', '航法灯・ストロボ（フィン ストロボも）・着陸灯。', c => { c.sw.nav = false; c.sw.strobe = false; c.sw.beacon = false; c.sw.landing = false; c.sw.taxi = false; }],
    ['マグネトー', '左右とも OFF', c => !c.sw.magL && !c.sw.magR, 'sw.magL', '', c => { c.sw.magL = false; c.sw.magR = false; }],
    ['バッテリー マスター（BATT MASTR）', 'OFF', c => !c.sw.master, 'sw.master', '', c => { c.sw.master = false; }],
  ] },
};
