// spin-retry: direct steep-spin hold — initialise in a developed steep spin (alpha ~38, Om -100 deg/s),
// hold pro-spin controls, and report where the mode goes over 20 s.
// usage: PHYS=./physics-wip.js node hold.mjs [alpha] [Om] [pitch] [bank]
import fs from 'node:fs'; import vm from 'node:vm';
globalThis.FL = {};
if (process.env.EXP) globalThis.SPIN_EXP = JSON.parse(process.env.EXP);
vm.runInThisContext(fs.readFileSync(process.env.PHYS || new URL('../../src/physics.js', import.meta.url).pathname, 'utf8'), { filename: 'physics.js' });
const P = globalThis.FL.physics, DT = 1 / 120, DEG = P.DEG;
const alpha0 = +(process.argv[2] || 38), Om = +(process.argv[3] || -100), pitch0 = +(process.argv[4] || -42), bank0 = +(process.argv[5] || 20);
const s = P.newState(); P.placeInAir(s, 0, -40000, 9000, 90, 70);
s.wind = { fromDeg: 0, kt: 0, gust: 0 }; s.thr = 0; s.keyHold = false;
const atm = P.atmos(9000 / P.FT); const Vt = 45 / P.KT / Math.sqrt(atm.sigma);
const gamma = (pitch0 - alpha0) * DEG;
s.vel = [Vt * Math.cos(gamma), Vt * Math.sin(gamma), 0];
s.q = P.qFromHPB(90, pitch0, bank0);
s.w = P.qrot(P.qconj(s.q), [0, Om * DEG, 0]);
s.pos = [0, 9000 / P.FT, 40000];
{ // settle the stall hysteresis in the frozen state first (as probe12 does)
  const q0 = s.q.slice(), v0 = s.vel.slice(), w0 = s.w.slice(), p0 = s.pos.slice();
  for (let i = 0; i < 120; i++) { s.q = q0.slice(); s.vel = v0.slice(); s.w = w0.slice(); s.pos = p0.slice(); s.ovr = { elev: 1, ail: 0, rud: 1 }; P.step(s, DT); }
  s.t = 0;
}
let hdgP = P.attitude(s).hdg, hdgT = 0;
const rows = [];
for (let i = 0; i < 20 * 120; i++) {
  s.ovr = { elev: 1, ail: 0, rud: 1 };
  P.step(s, DT);
  const a = P.attitude(s); let dh = a.hdg - hdgP; if (dh > 180) dh -= 360; if (dh < -180) dh += 360; hdgT += dh; hdgP = a.hdg;
  if (i % 12 === 0) rows.push({ t: s.t, alpha: s.out.alpha, beta: s.out.beta, ias: s.out.ias, pitch: a.pitch, bank: a.bank, yaw: dh / (DT * 10), sink: -s.vel[1] * 196.85, hdgT });
  if (s.crashed) { console.log('CRASH', s.crashReason); break; }
  if (s.out.altTrue < 500) { console.log('LOWALT'); break; }
}
const late = rows.filter(r => r.t > 5), mid = rows.filter(r => r.t > 2 && r.t <= 5);
const mean = (rs, f) => rs.reduce((a, x) => a + f(x), 0) / (rs.length || 1);
const frac = (rs) => rs.filter(r => r.alpha >= 22 && r.alpha <= 48).length / (rs.length || 1);
console.log(JSON.stringify({
  exp: process.env.EXP || null, init: { alpha0, Om, pitch0, bank0 },
  mid: { alpha: +mean(mid, r => r.alpha).toFixed(1), beta: +mean(mid, r => r.beta).toFixed(1), frac: +frac(mid).toFixed(2) },
  late: { alpha: +mean(late, r => r.alpha).toFixed(1), beta: +mean(late, r => r.beta).toFixed(1), frac: +frac(late).toFixed(2), sink: Math.round(mean(late, r => r.sink)), turns: +(Math.abs(hdgT) / 360).toFixed(2) },
  trace: rows.filter((_, i) => i % 10 === 0).map(r => `${r.t.toFixed(0)}s a${r.alpha.toFixed(0)} p${r.pitch.toFixed(0)} b${r.bank.toFixed(0)}`).join(' | '),
}));
