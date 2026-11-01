// CADET Godot port — Phase 1 JS reference generator (part B: systems + autopilot, driven on the JS physics)
// Writes test/reference1b.json. The GDScript runner replays the same drivers on the ports.
import fs from 'node:fs'; import vm from 'node:vm';
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..', '..', 'cadet-wt-next');
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'flight-lab/src/physics.js'), 'utf8'), { filename: 'physics.js' });
const P = globalThis.FL.physics;
const { createSystems } = await imp('cadet/src/aircraft/systems.js');
const { createAutopilot } = await imp('cadet/src/flight/autopilot.js');

const R = { systems: {}, ap: {} };
const round6 = (o) => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v));

// ---------------------------------------------------------------- systems driver
function applySys(a, sw, sys, s) {
  if (a.a === 'sw') sw[a.k] = a.v;
  else if (a.a === 'prime') { for (let i = 0; i < a.n; i++) sys.prime(); }
  else if (a.a === 'elecBatt') sys.elec.batt = a.v;
  else if (a.a === 'elecFault') sys.setElecFault(a.v);
  else if (a.a === 'fault') sys.setFault(a.v ? { dropL: a.v } : null);
  else if (a.a === 'thr') s.thr = a.v;
  else if (a.a === 'fuel') s.fuel = a.v.slice();
  else if (a.a === 'gear') s.gearDown = a.v;
}
function sampleSys(f, sys, s) {
  return { f, eng: sys.st.eng, rpm: sys.rpm, oil: sys.oil, oilT: sys.oilT, oilQ: sys.oilQ, volts: sys.elec.volts, amps: sys.elec.amps, batt: sys.elec.batt,
    shed: sys.elec.shed, gen: sys.elec.gen, load: sys.elec.load, pfdOn: sys.elec.pfdOn, mfdOn: sys.elec.mfdOn, standby: sys.elec.standby,
    alerts: sys.alerts.map(a => a.id), primes: sys.primes, crankHeat: sys.st.crankHeat, crankHeld: sys.st.crankHeld, hobbs: sys.hobbs,
    eRpm: s.eng.map(e => e.rpm), eRun: s.eng.map(e => !!e.run), twin: sys.twin, fuel: s.fuel.slice(), thr: s.thr };
}
function runSys({ aircraft = 'pa28', seconds = 30, init = 'cold', place = 'runway', actions = [], sampleEvery = 60 }) {
  const s = P.newState({}); if (aircraft !== 'pa28') P.setAircraft(s, aircraft);
  s.wind = { fromDeg: 0, kt: 0, gust: 0 };
  if (place === 'air') P.placeInAir(s, 2000, -38000, 1500, 354, 100); else P.placeOnRunway(s);
  const sw = {}; const sys = createSystems(sw);
  if (init === 'cold') sys.setCold(s); else sys.setRunning(s);
  const events = [], samples = [];
  const dt = 1 / 60, steps = Math.round(seconds / dt);
  for (let f = 0; f <= steps; f++) {
    for (const a of actions) if (a.f === f) applySys(a, sw, sys, s);
    for (const e of sys.update(dt, s)) events.push({ f, ...e });
    if (f % sampleEvery === 0) samples.push(sampleSys(f, sys, s));
    if (f < steps) P.step(s, dt);
  }
  return { events, samples, swEnd: { ...sw } };
}

R.systems.start_ok = runSys({ seconds: 40, actions: [
  { f: 0, a: 'prime', n: 3 }, { f: 1, a: 'sw', k: 'master', v: true }, { f: 1, a: 'sw', k: 'mixture', v: 1 }, { f: 2, a: 'sw', k: 'mag', v: 'START' },
  { f: 240, a: 'thr', v: 0.6 }, { f: 600, a: 'sw', k: 'mag', v: 'L' }, { f: 780, a: 'sw', k: 'mag', v: 'R' },
  { f: 960, a: 'sw', k: 'mag', v: 'BOTH' }, { f: 1080, a: 'sw', k: 'carbHeat', v: true }, { f: 1260, a: 'sw', k: 'carbHeat', v: false },
  { f: 1440, a: 'sw', k: 'mixture', v: 0 },
], sampleEvery: 60 });
R.systems.start_noprime = runSys({ seconds: 12, actions: [{ f: 1, a: 'sw', k: 'master', v: true }, { f: 1, a: 'sw', k: 'mixture', v: 1 }, { f: 2, a: 'sw', k: 'mag', v: 'START' }], sampleEvery: 120 });
R.systems.start_flooded = runSys({ seconds: 30, actions: [
  { f: 0, a: 'prime', n: 7 }, { f: 1, a: 'thr', v: 0.2 }, { f: 1, a: 'sw', k: 'master', v: true }, { f: 1, a: 'sw', k: 'mixture', v: 1 }, { f: 2, a: 'sw', k: 'mag', v: 'START' },
  { f: 600, a: 'thr', v: 0.5 }, { f: 602, a: 'sw', k: 'mag', v: 'START' },
], sampleEvery: 120 });
R.systems.start_selfuel = runSys({ seconds: 12, actions: [
  { f: 0, a: 'prime', n: 3 }, { f: 1, a: 'sw', k: 'fuelSel', v: 'OFF' }, { f: 1, a: 'sw', k: 'master', v: true }, { f: 2, a: 'sw', k: 'mag', v: 'START' },
], sampleEvery: 120 });
R.systems.start_nomaster = runSys({ seconds: 8, actions: [
  { f: 0, a: 'prime', n: 3 }, { f: 1, a: 'sw', k: 'mixture', v: 1 }, { f: 2, a: 'sw', k: 'mag', v: 'START' }, { f: 180, a: 'sw', k: 'mag', v: 'BOTH' }, { f: 200, a: 'sw', k: 'master', v: true }, { f: 202, a: 'sw', k: 'mag', v: 'START' },
], sampleEvery: 60 });
R.systems.start_fault = runSys({ seconds: 20, actions: [
  { f: 0, a: 'prime', n: 3 }, { f: 1, a: 'sw', k: 'master', v: true }, { f: 1, a: 'sw', k: 'mixture', v: 1 }, { f: 1, a: 'fault', v: 260 },
  { f: 2, a: 'sw', k: 'mag', v: 'START' }, { f: 240, a: 'thr', v: 0.6 }, { f: 600, a: 'sw', k: 'mag', v: 'L' }, { f: 900, a: 'sw', k: 'mag', v: 'BOTH' },
], sampleEvery: 60 });
R.systems.elec_shed = runSys({ seconds: 150, init: 'running', actions: [
  { f: 1, a: 'sw', k: 'bat', v: true }, { f: 1, a: 'sw', k: 'alt', v: false }, { f: 2, a: 'elecBatt', v: 0.5 },
  { f: 3, a: 'sw', k: 'landing', v: true }, { f: 3, a: 'sw', k: 'taxi', v: true }, { f: 3, a: 'sw', k: 'pitot', v: true },
], sampleEvery: 300 });
R.systems.elec_altfail = runSys({ seconds: 30, init: 'running', actions: [{ f: 10, a: 'elecFault', v: true }], sampleEvery: 120 });
R.systems.twin_start = runSys({ aircraft: 'pa44', seconds: 60, actions: [
  { f: 0, a: 'prime', n: 3 }, { f: 1, a: 'sw', k: 'master', v: true }, { f: 1, a: 'sw', k: 'mixture', v: 1 }, { f: 2, a: 'sw', k: 'mag', v: 'START' }, { f: 400, a: 'sw', k: 'mag', v: 'START' },
  { f: 800, a: 'thr', v: 0.5 }, { f: 1500, a: 'sw', k: 'propCycleT', v: 2.6 }, { f: 2400, a: 'sw', k: 'mixture', v: 0 },
], sampleEvery: 120 });
R.systems.alerts_mix = runSys({ seconds: 10, init: 'running', actions: [
  { f: 1, a: 'fuel', v: [2.5, 20] }, { f: 2, a: 'elecFault', v: true },
], sampleEvery: 60 });
R.systems.gear_alert = runSys({ aircraft: 'pa28r', seconds: 6, init: 'running', place: 'air', actions: [{ f: 1, a: 'gear', v: false }], sampleEvery: 30 });

// ---------------------------------------------------------------- autopilot driver
const w360 = a => ((a % 360) + 360) % 360;
const ctxOf = (s) => { const o = s.out; return { hdg: w360(o.hdgTrue + 6), pitch: o.pitch, vs: o.vsi, alt: o.altTrue }; };
function mkFlight(setup) {
  const s = P.newState({}); s.wind = { fromDeg: 0, kt: 0, gust: 0 };
  setup(s);
  const av = { hdgBug: 0, altSel: 3000, _nav: null };
  const L = { s, av, last: ctxOf(s), done: false };
  return { L, s, av };
}
const FL = { physics: P, avionics: { navSolve: (av) => av._nav ?? null, wrap180: P.wrap180 } };
function apSample(f, ap, s, av) {
  ap.sync(av);
  return { f, hdg: ctxOf(s).hdg, alt: s.out.altTrue, bank: s.out.bank, pitch: s.out.pitch, vs: s.out.vsi, rIn: s.rIn, pTgt: s.pTgt, trim: s.trim, ap: { ...av.ap }, fd: { ...av.fd } };
}
function driveAp(ap, flight, frames, samples, sampleEvery = 60) {
  const { L, s, av } = flight;
  for (let f = 0; f <= frames; f++) {
    L.last = ctxOf(s);
    ap.pilot(L, 1 / 60);
    if (f % sampleEvery === 0) samples.push(apSample(f, ap, s, av));
    if (f < frames) { P.step(s, 1 / 120); P.step(s, 1 / 120); }
  }
}
{
  // HDG + ALT capture, then a manual-override disconnect
  const ap = createAutopilot(FL);
  const fl = mkFlight(s => P.placeInAir(s, 2000, -38000, 3000, 354, 110));
  const out = { msgs: [], samples: [] };
  out.msgs.push(ap.control(fl, 'AP'));
  fl.av.hdgBug = 40;
  driveAp(ap, fl, 2400, out.samples);
  fl.av.altSel = 3400;
  driveAp(ap, fl, 2400, out.samples);
  let calls = 0, msg = '';
  const input = { down: (k) => k === 'KeyW' };
  while (calls < 90 && !msg) { msg = ap.update(1 / 60, fl, input); calls++; }
  out.override = { calls, msg, flash: ap.flash, tone1: ap.takeDiscTone(), tone2: ap.takeDiscTone(), on: ap.on };
  ap.sync(fl.av); out.endAp = { ...fl.av.ap };
  R.ap.hdg_alt = out;
}
{
  // VS capture into ALT, APR refusal then APR engage
  const ap = createAutopilot(FL);
  const fl = mkFlight(s => P.placeInAir(s, 2000, -38000, 3000, 354, 110, -3));
  const out = { msgs: [], samples: [] };
  fl.av.altSel = 2500;
  out.msgs.push(ap.control(fl, 'AP_VS'));
  out.vsSel0 = null; // (vsSel is internal; the capture shows in the sync strip)
  driveAp(ap, fl, 3600, out.samples, 120);
  out.afterVs = {}; ap.sync(fl.av); out.afterVs = { ap: { ...fl.av.ap }, alt: fl.s.out.altTrue };
  fl.av._nav = { src: 'GPS', flag: false, dots: 0.3, gsDots: null, crs: 354, dtk: 354 };
  out.msgs.push(ap.control(fl, 'AP_APR'));
  fl.av._nav = { src: 'LOC1', flag: false, dots: 0.4, gsDots: 0.6, crs: 354, dtk: 354 };
  out.msgs.push(ap.control(fl, 'AP_APR'));
  driveAp(ap, fl, 900, out.samples, 120);
  ap.sync(fl.av); out.endAp = { ...fl.av.ap }; out.endFd = { ...fl.av.fd };
  R.ap.vs_apr = out;
}
{
  // refusals, FD-only behaviour, LVL
  const ap = createAutopilot(FL);
  const out = { msgs: [] };
  const gnd = mkFlight(s => P.placeOnRunway(s));
  out.msgs.push(ap.control(gnd, 'AP'));
  const low = mkFlight(s => P.placeInAir(s, 2000, -38000, 600, 354, 100));
  out.msgs.push(ap.control(low, 'AP'));
  const fl = mkFlight(s => P.placeInAir(s, 2000, -38000, 3000, 354, 110));
  out.msgs.push(ap.control(fl, 'FD'));
  fl.av.hdgBug = 30; fl.L.last = ctxOf(fl.s);
  ap.pilot(fl.L, 1 / 60);
  ap.sync(fl.av);
  out.fdOnly = { rIn: fl.s.rIn, fd: { ...fl.av.fd }, on: ap.on, fdOn: ap.fdOn };
  out.msgs.push(ap.control(fl, 'FD'));
  out.msgs.push(ap.control(fl, 'AP_LVL'));
  ap.sync(fl.av); out.lvlAp = { ...fl.av.ap };
  out.msgs.push(ap.control(fl, 'AP'));
  R.ap.refusals = out;
}

fs.writeFileSync(path.join(here, '..', 'test', 'reference1b.json'), JSON.stringify(round6(R)));
console.log('reference1b.json written:', Object.keys(R.systems).map(k => `${k}: ${R.systems[k].events.length} ev`).join('; '), '| ap samples:', R.ap.hdg_alt.samples.length, R.ap.vs_apr.samples.length);
