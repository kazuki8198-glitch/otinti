// spin-retry: capture a live state from the steep hold at time T, then decompose the frozen accelerations
// under mutations (rate components zeroed, controls zeroed). usage: PHYS=./physics-wip.js node capture.mjs [T]
import fs from 'node:fs'; import vm from 'node:vm';
globalThis.FL = {};
if (process.env.EXP) globalThis.SPIN_EXP = JSON.parse(process.env.EXP);
vm.runInThisContext(fs.readFileSync(process.env.PHYS || new URL('../../src/physics.js', import.meta.url).pathname, 'utf8'), { filename: 'physics.js' });
const P = globalThis.FL.physics, DT = 1 / 120, DEG = P.DEG;
const T = +(process.argv[2] || 0.6);
const s = P.newState(); P.placeInAir(s, 0, -40000, 9000, 90, 70);
s.wind = { fromDeg: 0, kt: 0, gust: 0 }; s.thr = 0; s.keyHold = false;
const atm = P.atmos(9000 / P.FT); const Vt = 45 / P.KT / Math.sqrt(atm.sigma);
const gamma = (-42 - 38) * DEG;
s.vel = [Vt * Math.cos(gamma), Vt * Math.sin(gamma), 0];
s.q = P.qFromHPB(90, -42, 20);
s.w = P.qrot(P.qconj(s.q), [0, -100 * DEG, 0]);
s.pos = [0, 9000 / P.FT, 40000];
{ const q0 = s.q.slice(), v0 = s.vel.slice(), w0 = s.w.slice(), p0 = s.pos.slice();
  for (let i = 0; i < 120; i++) { s.q = q0.slice(); s.vel = v0.slice(); s.w = w0.slice(); s.pos = p0.slice(); s.ovr = { elev: 1, ail: 0, rud: 1 }; P.step(s, DT); } s.t = 0; }
for (let i = 0; i < T * 120; i++) { s.ovr = { elev: 1, ail: 0, rud: 1 }; P.step(s, DT); }
const snap = { q: s.q.slice(), vel: s.vel.slice(), w: s.w.slice(), pos: s.pos.slice(), stH: s._stH && s._stH.slice() };
const a = P.attitude(s);
console.log(`t=${T} alpha ${s.out.alpha.toFixed(1)} beta ${s.out.beta.toFixed(1)} pitch ${a.pitch.toFixed(1)} bank ${a.bank.toFixed(1)} ias ${s.out.ias.toFixed(0)} w(deg/s) ${s.w.map(x => (x / DEG).toFixed(0)).join(',')} stallW ${s.stallW.toFixed(2)}`);
function frozen(mutate, ovr) {
  const { q, vel, w, pos, stH } = snap; const W = w.slice();
  if (mutate) mutate(W);
  let acc = null;
  for (let i = 0; i < 60; i++) {
    s.q = q.slice(); s.vel = vel.slice(); s.pos = pos.slice(); s.w = W.slice(); if (stH && i === 0) s._stH = stH.slice();
    s.ovr = ovr || { elev: 1, ail: 0, rud: 1 };
    const w0 = s.w.slice(); P.step(s, DT);
    acc = [(s.w[0] - w0[0]) / DT / DEG, (-(s.w[1] - w0[1])) / DT / DEG, (-(s.w[2] - w0[2])) / DT / DEG];
  }
  return acc;
}
const show = (name, acc) => console.log(`  ${name}: pitch ${acc[0].toFixed(1)} yaw ${acc[1].toFixed(1)} roll ${acc[2].toFixed(1)}`);
show('as-is', frozen());
show('w0(pitch)=0', frozen(w => { w[0] = 0; }));
show('w1(yaw)=0', frozen(w => { w[1] = 0; }));
show('w2(roll)=0', frozen(w => { w[2] = 0; }));
show('all w=0', frozen(w => { w[0] = w[1] = w[2] = 0; }));
show('rud=0', frozen(null, { elev: 1, ail: 0, rud: 0 }));
show('elev=0', frozen(null, { elev: 0, ail: 0, rud: 1 }));
show('ail=opp', frozen(null, { elev: 1, ail: -1, rud: 1 }));
