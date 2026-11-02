// JS reference driver for systems.js equivalence (scripted switch timelines).
import fs from 'node:fs';
const TEST = '/home/hatch/workspace/cadet-wt-all/flight-lab/test/';
const { load, CORE } = await import(TEST + 'load.mjs');
const FL = load(...CORE);
const SYS = await import('file:///home/hatch/workspace/cadet-wt-all/cadet/src/aircraft/systems.js');
const P = FL.physics;
const out = [];
const r2 = (v, d = 2) => v == null ? null : +v.toFixed(d);

function run(tag, aircraft, script, seconds) {
  const s = P.newState({ seed: 7, aircraft });
  P.applyLoading(s, P.stdLoading());
  P.placeOnRunway(s, P.LAB_RWY, 30);
  const sw = {};
  const sys = SYS.createSystems(sw);
  sys.setCold(s);
  const dt = 1 / 30;
  let evAcc = [];
  const total = Math.round(seconds / dt);
  for (let i = 0; i <= total; i++) {
    const t = i * dt;
    script(t, sw, sys, s);
    const evs = sys.update(dt, s);
    for (const e of evs) evAcc.push(e.type + (e.why ? ':' + e.why : ''));
    P.step(s, dt);
    if (i % 30 === 0) {
      out.push(JSON.stringify({ tag, t: r2(t, 1), eng: sys.st.eng, rpm: r2(sys.rpm, 1), volts: r2(sys.elec.volts), amps: sys.elec.amps, batt: r2(sys.elec.batt, 4), shed: sys.elec.shed, pfd: sys.elec.pfdOn, mfd: sys.elec.mfdOn, oil: r2(sys.oil, 1), oilT: r2(sys.oilT, 1), primes: sys.primes, twin: sys.twin.map(x => x.eng).join('/'), ev: evAcc }));
      evAcc = [];
    }
  }
}
const startSeq = (primes, thrV) => (t, sw, sys, s) => {
  if (t >= 0.5 && t < 0.6) { sw.master = true; sw.mixture = 1; s.thr = thrV; for (let i = 0; i < primes; i++) sys.prime(); }
  if (t >= 1 && t < 11) sw.mag = 'START'; else if (t >= 11) sw.mag = 'BOTH';
};
// A: cold start, 3 primes
run('A', 'pa28', (t, sw, sys, s) => { startSeq(3, 0.25)(t, sw, sys, s); if (t >= 20) s.thr = 0.62; if (t >= 30 && t < 40) sw.mag = 'L'; if (t >= 40 && t < 50) sw.mag = 'R'; if (t >= 50 && t < 60) { sw.mag = 'BOTH'; sw.carbHeat = true; } if (t >= 60) { sw.carbHeat = false; } if (t >= 70) sw.mag = 'OFF'; }, 80);
// B: no prime -> nocatch prime
run('B', 'pa28', startSeq(0, 0.25), 14);
// C: flooded then open-throttle catch
run('C', 'pa28', (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) { sw.master = true; sw.mixture = 1; s.thr = 0.2; for (let i = 0; i < 7; i++) sys.prime(); } if (t >= 1 && t < 11) sw.mag = 'START'; if (t >= 12) s.thr = 0.5; if (t >= 13 && t < 23) sw.mag = 'START'; else if (t >= 23) sw.mag = 'BOTH'; }, 30);
// D: selector OFF stop from running
run('D', 'pa28', (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) sys.setRunning(s); if (t >= 5) sw.fuelSel = 'OFF'; }, 16);
// E: alternator failure + shed (batt pre-set low)
run('E', 'pa28', (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) { sys.setRunning(s); sys.setElecFault(true); sys.elec.batt = 0.5; sw.landing = true; sw.pitot = true; s.thr = 0.62; } }, 60);
// F: twin start both, then mixture cutoff
run('F', 'pa44', (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) { sw.master = true; sw.mixture = 1; s.thr = 0.25; for (let i = 0; i < 3; i++) sys.prime(); } if (t >= 1 && t < 6) sw.mag = 'START'; if (t >= 8 && t < 13) sw.mag = 'START'; else if (t >= 13) sw.mag = 'BOTH'; if (t >= 20) sw.mixture = 0; }, 30);
// G: mag fault drop
run('G', 'pa28', (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) { sys.setRunning(s); sys.setFault({ dropL: 210 }); s.thr = 0.62; } if (t >= 10 && t < 20) sw.mag = 'L'; if (t >= 20) sw.mag = 'BOTH'; }, 30);
// H: starter heat lockout (mixture 0 so it never catches)
run('H', 'pa28', (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) { sw.master = true; sw.mixture = 0; s.thr = 0.25; for (let i = 0; i < 3; i++) sys.prime(); } const cyc = Math.floor(t / 10) % 2 === 0; sw.mag = t >= 1 && cyc ? 'START' : 'BOTH'; }, 90);
// I: split bat/alt switches (E2 bus): alt off drains, bat off floats
run('I', 'pa28', (t, sw, sys, s) => { if (t >= 0.5 && t < 0.6) { sys.setRunning(s); sw.bat = true; sw.alt = true; s.thr = 0.62; } if (t >= 10) sw.alt = false; if (t >= 30) { sw.alt = true; sw.bat = false; } }, 45);

fs.writeFileSync(new URL('./digest-sys-js.jsonl', import.meta.url), out.join('\n') + '\n');
console.log('sys js lines:', out.length);
