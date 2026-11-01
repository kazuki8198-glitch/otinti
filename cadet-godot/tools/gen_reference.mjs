// CADET Godot port — JS 参照値ジェネレータ
// 移植元 flight-lab/src/physics.js (898fe8a) を読み、固定入力・固定初期条件で
// test/reference.json を生成する。GDScript 側テスト (test/run_tests.gd) がこれと照合する。
import fs from 'node:fs'; import vm from 'node:vm';
import path from 'node:path'; import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '..', '..', 'cadet-wt-next', 'flight-lab', 'src', 'physics.js');
vm.runInThisContext(fs.readFileSync(SRC, 'utf8'), { filename: 'physics.js' });
const P = globalThis.FL.physics, DT = 1 / 120;
const R = { scenarios: {} };

// JS の perlin は FL.physics に export されていないので、windAt 経由の観測と
// makeRng の再実装照合はできない。代わりに「風なし」を厳密に作れることと、
// 乱流込みステップ (stall buffet 等) の軌跡で間接的に検証する。
// atmos / rpm / trim / steady / WB は純関数として直接叩く。

R.atmos = [0, 1000, 3000, 11000, 12000].map(h => P.atmos(h));
R.atmosDev = P.atmos(1500, 10);
const A28 = P.AIRCRAFT[0], A44 = P.AIRCRAFT[1], A28R = P.AIRCRAFT[2];
R.rpmFor = [
  P.rpmFor(A28, 0, 0), P.rpmFor(A28, 0.5, 20), P.rpmFor(A28, 1, 40),
  P.rpmFor(A44, 0.5, 30), P.rpmFor(A44, 1, 50),
  P.rpmFor(A28R, 0.8, 30, 1, false, 1), P.rpmFor(A28R, 0.8, 30, 1, false, 0.5),
  P.rpmFor(A28, 0, 25, 1, true),
];
{
  const s = P.newState({});
  R.trimFor = P.trimFor(s, 40, 0);
  R.trimForFlap = P.trimFor(s, 30, 0.5);
  R.steady = [
    P.steadyState(s, 76, 800, { altFt: 3000 }),
    P.steadyState(s, 110, 0, { altFt: 3000 }),
    P.steadyState(s, 70, -500, { altFt: 1500, flaps: 2, gear: true }),
    P.steadyState(s, 87, 99999, { altFt: 2000, pwr: 'full' }),
  ];
}
R.wb = [
  P.computeWB(A28, P.stdLoading()),
  P.computeWB(A28, { fuel: 'full', front: 2, rear: 2, bagKg: 30 }),
  P.computeWB(A44, { fuel: 'tabs', front: 1, rear: 0, bagKg: 0 }),
];

function snap(s) {
  const o = s.out;
  return {
    t: s.t, pos: s.pos.slice(), vel: s.vel.slice(), q: s.q.slice(), w: s.w.slice(),
    onGround: s.onGround, crashed: s.crashed, crashReason: s.crashReason,
    iasKt: o.ias, tasKt: o.tas, pitch: o.pitch, bank: o.bank, hdg: o.hdgTrue, vsi: o.vsi,
    altFt: o.altTrue, alphaDeg: o.alpha, rpm: o.rpm, g: o.g, fuel: s.fuel.slice(),
    thrust: s.thrust, stallW: s.stallW, gearPos: s.gearPos, flapDeg: s.flapDeg,
    powerPct: o.powerPct, volts: o.volts, fuelUsed: s.fuelUsed,
  };
}
function runScenario(name, setup, seconds, checkpoints, perStep) {
  const s = P.newState({});
  s.wind = { fromDeg: 0, kt: 0, gust: 0 };
  setup(s);
  const out = { start: snap(s), points: {} };
  const total = Math.round(seconds * 120);
  for (let i = 1; i <= total; i++) {
    if (perStep) perStep(s, i);
    P.step(s, DT);
    if (checkpoints.includes(i)) out.points[i] = snap(s);
  }
  out.end = snap(s);
  R.scenarios[name] = out;
  return out;
}

// 地上滑走→離陸: フルスロットル、内部 ias (m/s) > 30 で elev override +0.4 (probe.mjs で実証)
runScenario('takeoff', s => { P.placeOnRunway(s); s.thr = 1; s.brake = false; }, 26, [240, 600, 1200, 1800, 2400, 3120],
  s => { if (s.ias > 30) s.ovr = { elev: 0.4, ail: 0, rud: 0 }; });
// 巡航: 3000 ft, 110 kt, LAB 滑走路付近
runScenario('cruise', s => { P.placeInAir(s, 2000, -38000, 3000, 354, 110); }, 10, [300, 600, 1200]);
// 降下・着陸進入: 70 kt, flap 2, gear down, gamma -3
runScenario('approach', s => { P.placeInAir(s, -6000, -40000 + 0, 1500, 354, 70, -3, 2); }, 10, [300, 600, 1200]);
// 失速: 50 kt でスロットル 0、放置
runScenario('stall', s => { P.placeInAir(s, 2000, -38000, 4000, 354, 55); s.thr = 0; }, 8, [240, 480, 960]);
// Seminole 巡航
runScenario('seminole_cruise', s => { P.setAircraft(s, 'pa44'); P.placeInAir(s, 2000, -38000, 5000, 354, 140); }, 10, [300, 600, 1200]);
// Seminole 片発停止 (左発フェイル)
runScenario('seminole_oei', s => { P.setAircraft(s, 'pa44'); P.placeInAir(s, 2000, -38000, 5000, 354, 110); s.eng[0].failed = true; }, 6, [240, 480, 720]);
// Arrow: 定速プロペラ、プロペラレバー 0.8
runScenario('arrow', s => { P.setAircraft(s, 'pa28r'); P.placeInAir(s, 2000, -38000, 4000, 354, 125); s.prop = 0.8; }, 8, [480, 960]);
// 横風着陸ロールアウト気味: 風 270°/12kt gust 1.2、地上スタート
runScenario('xwind_roll', s => { P.placeOnRunway(s); s.wind = { fromDeg: 270, kt: 12, gust: 1.2 }; s.thr = 0.6; }, 8, [240, 480, 960]);
// エンジン停止→再始動 (mag START) の状態遷移
runScenario('restart', s => {
  P.placeInAir(s, 2000, -38000, 3000, 354, 90);
  s.eng[0].mag = 'OFF';
}, 6, [240, 480, 720], (s, i) => { if (i === 300) { s.eng[0].mag = 'START'; } if (i === 500) { s.eng[0].mag = 'BOTH'; } });
// 燃料セレクター OFF → ライン燃料切れで停止
runScenario('fuel_cut', s => { P.placeInAir(s, 2000, -38000, 3000, 354, 90); s.fuelSel = 'OFF'; }, 10, [240, 600, 1200]);

fs.writeFileSync(path.join(here, '..', 'test', 'reference.json'), JSON.stringify(R));
console.log('reference.json written:', Object.keys(R.scenarios).join(', '));
for (const [k, v] of Object.entries(R.scenarios)) console.log(k, 'end:', JSON.stringify({ t: v.end.t, iasKt: +v.end.iasKt.toFixed(1), altFt: +v.end.altFt.toFixed(0), crashed: v.end.crashed, onGround: v.end.onGround }));
