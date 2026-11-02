// CADET — content/free-mode.js : the free mode (フリーモード) — free flying and free simulator
// operation as one first-class mode, apart from the training days. This module is the single
// source the setup screen (ui/menu.js's free tab) renders from and that the session starters
// (main.js's onFreeSetup / onSimSetup, the sim room's simFlight) consume, so what the screen
// offers and what a session starts can never drift apart.
//
// The sandbox contract: a free session is fly-mode's startFreeSession and nothing else — no day
// is begun, no lesson is scored, and career state (records, fatigue, abilities, the schedule)
// is never read or written on this path. The device's sessions add only main.js's simSession
// flag, whose leave puts the cadet back at the device desk; the outdoor ones leave beside the
// aircraft, as free sessions always have.

// every flyable type (the Arrow flies on the Archer's visual and cockpit, as on its career days:
// fly-mode resolves the physics id separately — see startFreeSession)
export const FREE_AIRCRAFT = [
  ['pa28', 'Archer（単発）'],
  ['pa44', 'Seminole（双発）'],
  ['pa28r', 'Arrow（単発・引込脚）'],
  ['b737', '737 級ジェット（双発）'],
];
// the three headline start states first (a cold parked aircraft / the runway ready / airborne
// at cruise), then the practice starts the setup screen has always offered
export const FREE_STARTS = [
  ['ramp', '駐機（コールド＆ダーク：エンジンは自分で始動）'],
  ['rwy', '滑走路（離陸準備完了・エンジン運転中）'],
  ['area', '空中（巡航：訓練空域 3,000 ft）'],
  ['pattern', 'ダウンウインド 1,000 ft'],
  ['final', '最終進入 5 km'],
  ['ils', 'ILS 開始点 2,000 ft'],
];
export const FREE_HOURS = [[6, '朝 6 時'], [9, '午前 9 時'], [12, '正午'], [15, '午後 3 時'], [18, '夕方 6 時'], [21, '夜 9 時'], [0, '深夜 0 時']];
export const FREE_WIND_OPTS = [['calm', '無風'], ['light', '軽い風（滑走路方向 5 kt）'], ['cross', '横風 10 kt'], ['strong', '強い風 16 kt・ガスト'], ['custom', 'カスタム']];
export const FREE_WIND_MAP = {
  calm: { rel: 0, kt: 0, gust: 0 },
  light: { rel: 10, kt: 5, gust: 0.5 },
  cross: { rel: 80, kt: 10, gust: 0.5 },
  strong: { rel: 30, kt: 16, gust: 1 },
};
export const FREE_LOAD_OPTS = [['std', '標準（前席 2 名）'], ['light', '軽い（前席 1 名）'], ['heavy', '重い（4 名＋荷物）']];
export const FREE_LOAD_MAP = {
  std: { fuel: 'std', front: 2, rear: 0, bagKg: 0 },
  light: { fuel: 'std', front: 1, rear: 0, bagKg: 0 },
  heavy: { fuel: 'std', front: 2, rear: 2, bagKg: 25 },
};
export const FREE_FAIL_OPTS = [
  ['none', 'ランダム（シード付き：約2割の飛行で1つ）'],
  ['mag', 'マグネトー不良（ランナップで分かる）'],
  ['carb', 'キャブレター着氷（湿度の高い日）'],
  ['elec', 'オルタネーター故障（電圧低下）'],
  ['pitot', 'ピトー閉塞（着氷の経路）'],
  ['static', '静圧閉塞（高度計の凍結）'],
  ['gear', '脚の故障（双発）'],
  ['pump', '燃料ポンプ故障'],
  ['engine', 'エンジン停止（飛行中）'],
  ['engL', '左エンジン停止（双発）'],
  ['engR', '右エンジン停止（双発）'],
  ['ahrs', 'AHRS 故障（姿勢表示）'],
  ['gps', 'GPS 故障'],
  ['ppanel', '部分パネル（AHRS＋GPS 故障）'],
];

// the setup screen's raw selections → the cfg fly-mode's startFreeSession takes (the outdoor
// flight: the chosen hour moves the world's clock in main.js's onFreeSetup). 'none' failure is
// not "no failure": it is the seeded random roll, resolved inside startFreeSession from cfg.seed.
export function buildFreeCfg(f) {
  return {
    start: f.start, aircraft: f.aircraft, hour: +f.hour,
    wind: f.wind === 'custom' ? { rel: +f.windRel || 0, kt: +f.windKt || 0, gust: 0.5 } : FREE_WIND_MAP[f.wind] || FREE_WIND_MAP.light,
    loading: FREE_LOAD_MAP[f.loading] || FREE_LOAD_MAP.std,
    fail: f.fail === 'none' ? null : f.fail,
    // the instructor console's reservation (a time / an altitude), and the session's seed
    // for the random roll when no failure was chosen (aircraft/failures.js)
    failAt: f.failWhen === 'time' ? { atMin: Math.max(0, +f.failMin || 0) } : f.failWhen === 'alt' ? { atAltFt: Math.max(0, +f.failAlt || 0) } : {},
    seed: Date.now() % 2147483647,
  };
}

// the training device's free-practice session: the sim room seat's own flight (its light wind,
// its standard load, no failure), whatever entry started it — the seat's preset page, or the
// free mode's simulator button with the screen's chosen aircraft and start.
export function simDeviceCfg(sel = {}) {
  return {
    start: sel.start || 'rwy', aircraft: sel.aircraft || 'pa28',
    wind: { ...FREE_WIND_MAP.light }, loading: { ...FREE_LOAD_MAP.std }, fail: null,
  };
}
