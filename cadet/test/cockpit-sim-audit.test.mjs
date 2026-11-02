// cockpit-sim-audit.test.mjs — SCENARIO-level simulation audit of the piston trainer cockpits.
// test/controls-functional.test.mjs proves every control DOES something; this suite flies complete
// flights with cockpit operations only and hunts what per-control tests cannot see: sequence
// effects, contradictory inputs, stuck/impossible states, wrong warnings, unrecoverable states.
// Rig mirrors controls-functional: vm-loaded flight-lab physics/avionics/school + the real
// buildCockpit + createFlight + createSystems + the real autopilot, stepped exactly as fly mode
// steps them (fl.frame -> systems.update -> autopilot.update/sync -> cockpit.update).
// Driving uses ONLY cockpit controls (cp.controls act()) plus the keyboard channel the real game
// uses for yoke/stick input; state is injected only to PLACE a scenario (placeInAir / setRunning),
// never to fix or fly one.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { buildCockpit } from '../src/aircraft/cockpit.js';
import { createSystems } from '../src/aircraft/systems.js';
import { createFlight } from '../src/flight/flight.js';
import { createAutopilot } from '../src/flight/autopilot.js';
import { installSorajima } from '../src/flight/sorajima.js';
import { softkeysOf } from '../src/aircraft/g1000.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'acmesh.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL, P = FL.physics, AV = FL.avionics;
const AC = id => P.AIRCRAFT.find(a => a.id === id);
const AP_WHATS = new Set(['AP', 'AP_HDG', 'AP_ALT', 'AP_NAV', 'AP_APR', 'AP_VS', 'AP_LVL', 'FD']);
function fakeCanvas(w, h) {
  const grad = { addColorStop() {} };
  const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern' ? () => grad : k === 'measureText' ? s => ({ width: String(s).length * 6 }) : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  return { width: w, height: h, getContext: () => g };
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function rig(type = 'pa28', { onRunway = false } = {}) {
  const cp = buildCockpit(FL, AC(type), { makeCanvas: fakeCanvas, twin: AC('pa44') });
  cp.setType(type);
  const fl = createFlight(FL, { store: null });
  const [n, e] = onRunway ? P.rwyToNE(P.LAB_RWY, 30, 0) : P.rwyToNE(P.LAB_RWY, 715, 208);
  fl.startOnGround(n, e, onRunway ? 354 : 264, type, { wind: { rel: 10, kt: 5, gust: 0.5 } });
  const sys = createSystems(cp.switches);
  const ap = createAutopilot(FL);
  const R = { cp, fl, sys, ap, av: fl.av, sw: cp.switches, keys: new Set(), thrTgt: null, type };
  R.apply = (d) => {
    if (!d) return undefined;
    if (d.type === 'switch') cp.switches[d.id] = d.on;
    else if (d.type === 'select') cp.switches[d.id] = d.value;
    else if (d.type === 'prime') return sys.prime();
    else if (d.type === 'gearEmerg') { if (fl.s && !fl.s.gearEmerg) fl.s.gearEmerg = true; }
    else if (d.type === 'flight') return fl.action(d.name, d.arg);
    else if (d.type === 'av') return AP_WHATS.has(d.what) ? ap.control(fl, d.what) : AV.control(fl.av, d.what, d.dir, d.big);
    return undefined;
  };
  const keyObj = { has: c => R.keys.has(c), shift: false };
  R.frame = (draw = true) => {
    if (R.thrTgt != null) { const d = R.thrTgt - fl.s.thr; if (Math.abs(d) > 0.026) R.press('throttle', Math.sign(d)); }
    fl.frame(1 / 60, keyObj, { pilot: (L, dt) => ap.pilot(L, dt), airPilot: true });
    sys.update(1 / 60, fl.s);
    ap.update(1 / 60, fl, { down: c => R.keys.has(c) });
    ap.sync(fl.av);
    if (draw) cp.update(1 / 60, { s: fl.s, L: fl.L, av: fl.av, eng: { rpm: sys.rpm, run: sys.running, twin: sys.twinLive, oil: sys.oil, oilT: sys.oilT, elec: sys.elec, hobbs: sys.hobbs }, parkBrake: fl.controls.parkBrake, elecPfd: sys.elec.pfdOn, elecMfd: sys.elec.mfdOn, elecStandby: sys.elec.standbyOn, night: 0 });
  };
  // accelerated stepping for the long-duration tests: identical physics substeps (frame() always
  // subdivides to 1/120 s), cockpit canvas only refreshed when a sample needs it.
  R.frameFast = () => {
    fl.frame(0.1, keyObj, { pilot: (L, dt) => ap.pilot(L, dt), airPilot: true });
    sys.update(0.1, fl.s);
    ap.update(0.1, fl, { down: c => R.keys.has(c) });
    ap.sync(fl.av);
  };
  R.draw = () => cp.update(1 / 60, { s: fl.s, L: fl.L, av: fl.av, eng: { rpm: sys.rpm, run: sys.running, twin: sys.twinLive, oil: sys.oil, oilT: sys.oilT, elec: sys.elec, hobbs: sys.hobbs }, parkBrake: fl.controls.parkBrake, elecPfd: sys.elec.pfdOn, elecMfd: sys.elec.mfdOn, elecStandby: sys.elec.standbyOn, night: 0 });
  R.step = (sec, law = null) => { for (let i = 0, f = Math.round(sec * 60); i < f; i++) { R.keys.clear(); if (law) law(R); R.frame(); } };
  R.stepFast = (sec, hook = null) => { for (let i = 0, f = Math.round(sec * 10); i < f; i++) { R.keys.clear(); R.frameFast(); if (hook) hook(R); } };
  R.ctl = id => cp.controls.find(c => c.id === id);
  R.press = (id, dir = 1, wheel = false) => { const c = R.ctl(id); if (!c) throw new Error(`no control ${id}`); const r = c.act(dir, wheel); R.apply(r); return r; };
  R.att = () => P.attitude(fl.s);
  R.where = () => { const p = P.ne(fl.s); return P.rwyCoords(P.LAB_RWY, p.n, p.e); };
  R.alerts = () => sys.alerts.map(a => a.id);
  R.step(0.2);
  return R;
}
// the hand-flying law the profiles use: keys only, exactly what a player produces.
function law(R, { hdgTgt = null, iasTgt = null, pitchTgt = null, pBase = 2, bankMax = 20 } = {}) {
  const att = R.att(), out = R.fl.s.out;
  if (hdgTgt != null) {
    const bTgt = clamp(P.wrap180(hdgTgt - att.hdg) * 1.1, -bankMax, bankMax);
    if (att.bank < bTgt - 1.2) R.keys.add('KeyD'); else if (att.bank > bTgt + 1.2) R.keys.add('KeyA');
  } else if (Math.abs(att.bank) > 2) R.keys.add(att.bank > 0 ? 'KeyA' : 'KeyD');
  const pTgt = pitchTgt != null ? pitchTgt : clamp(pBase + (out.ias - iasTgt) * 0.30, -6, 15);
  if (att.pitch < pTgt - 0.6) R.keys.add('KeyS'); else if (att.pitch > pTgt + 0.6) R.keys.add('KeyW');
}
function setAltSel(R, ft) {
  let guard = 0;
  while (R.av.altSel !== ft && guard++ < 80) {
    const d = ft - R.av.altSel;
    if (Math.abs(d) >= 500) R.press('pfd.alt.outer', Math.sign(d), true);
    else R.press('pfd.alt.inner', Math.sign(d), true);
  }
  assert.equal(R.av.altSel, ft, `altSel reaches ${ft}`);
}
function apKey(R, label) {
  R.press('pfd.sk3'); // PFD menu
  const row = softkeysOf('pfd', R.av);
  const idx = row.findIndex(k => k && k.label === label);
  assert.ok(idx >= 0, `softkey ${label} exists`);
  R.press('pfd.sk' + (idx + 1));
  R.step(0.5);
  return idx;
}
function engageCruiseAP(R) { // the AP softkey alone connects with HDG+ALT on the current bugs (verified
  apKey(R, 'AP');              // against the real softkey behaviour: pressing HDG/ALT after it would toggle them OFF)
  assert.equal(R.ap.on, true, 'AP engaged');
  assert.equal(R.ap.display.hdg, true, 'HDG mode latched by the AP softkey');
  assert.equal(R.ap.display.alt, true, 'ALT mode latched by the AP softkey');
}
function gearLampCounts(R) {
  // the lamp colours themselves live in a vertex buffer the cockpit API does not expose, so
  // this pins the exact state the lamp rule reads (cockpit.js lampOn/setLamps): three greens
  // iff gearPos >= 0.999, the red iff 0.001 < gearPos < 0.999, all of it gated on the master
  // switch. A transit that sticks, or lamps that would burn with the master off, fails here
  // exactly as the wrong lamp would present in the cockpit.
  R.draw();
  const g = R.fl.s.gearPos ?? 1;
  if (!R.sw.master) return [0, 0];
  return [g >= 0.999 ? 3 : 0, g > 0.001 && g < 0.999 ? 1 : 0];
}
// start an engine the way the checklist does it: battery + alternator + avionics, fuel on the
// fullest tank, pump, primer (cold), mixture rich, then hold the key at START until it catches.
function startViaControls(R, { cold = true } = {}) {
  const s = R.fl.s;
  R.press('sw.bat'); R.press('sw.alt');
  R.press('sw.avionics');
  if (R.ctl('sw.fuelPump')) R.press('sw.fuelPump');
  if (cold) { R.press('primer'); R.press('primer'); R.press('primer'); } // 3 strokes: >=6 floods it (modelled)
  if (Math.abs(R.sw.mixture - 1) > 0.01) R.press('mixture'); // click = full travel to rich
  R.press('mag', 1); R.press('mag', 1); R.press('mag', 1);    // OFF -> R -> L -> BOTH
  R.press('mag', 1);                                          // START (spring-loaded)
  let t = 0;
  while (!R.sys.running && t < 8) { R.step(0.25); t += 0.25; if (!R.sys.running && R.sw.mag !== 'START') R.press('mag', 1); }
  return R.sys.running;
}
const FUEL_ORDER = ['L', 'R', 'OFF'];
function setSel(R, want) { // the selector's detents are the WHEEL's work (a click only swaps L<->R;
  // OFF is a wheel step past R, exactly as controls-functional pins it)
  let g = 0;
  while (R.sw.fuelSel !== want && g++ < 4) R.press('fuelSel', Math.sign(FUEL_ORDER.indexOf(want) - FUEL_ORDER.indexOf(R.sw.fuelSel)), true);
  assert.equal(R.sw.fuelSel, want, `selector reaches ${want}`);
}
// the twin's per-engine state lives on state OBJECTS (sys.twinLive[k].eng, as controls-functional
// reads them) — never compare the objects themselves to state strings.
const twinEng = R => [R.sys.twinLive[0].eng, R.sys.twinLive[1].eng];
function crankTwin(R, k) { // one key-to-START cycle for engine k (the shared key cranks the first
  // engine that is not running, left first; the key springs back on a catch or at STARTER_MAX)
  if (R.sw.mag === 'OFF') { R.press('mag', 1); R.press('mag', 1); R.press('mag', 1); } // to BOTH
  if (R.sw.mag === 'BOTH') R.press('mag', 1); // START
  let t = 0;
  while (R.sys.twinLive[k].eng !== 'run' && t < 10) {
    R.step(0.25); t += 0.25;
    const e = R.sys.twinLive[k].eng;
    if (e !== 'run' && e !== 'crank' && R.sw.mag !== 'START') R.press('mag', 1);
  }
  return R.sys.twinLive[k].eng === 'run';
}
function startTwinEngine(R, { cold = true } = {}) { // startViaControls' preamble, but ONE engine:
  // the checklist start sequence, then a single START for the first engine not running
  R.press('sw.bat'); R.press('sw.alt');
  R.press('sw.avionics');
  if (R.ctl('sw.fuelPump')) R.press('sw.fuelPump');
  if (cold) { R.press('primer'); R.press('primer'); R.press('primer'); }
  if (Math.abs(R.sw.mixture - 1) > 0.01) R.press('mixture');
  const k = R.sys.twinLive.findIndex(t => t.eng !== 'run');
  return k < 0 ? true : crankTwin(R, k);
}
function taxiTo(R, alongTgt) {
  R.press('parkBrake'); R.thrTgt = 0.30;
  let g = 0;
  while (R.where().along < alongTgt && g++ < 40 * 60) {
    const w = R.where(), att = R.att(), gs = Math.hypot(R.fl.s.vel[0], R.fl.s.vel[2]);
    const err = P.wrap180(354 - att.hdg) - w.cross * 0.06;
    R.keys.clear();
    if (err > 1.2) R.keys.add('KeyE'); else if (err < -1.2) R.keys.add('KeyQ');
    R.thrTgt = gs > 5 ? 0.16 : 0.30;
    R.frame();
  }
  R.thrTgt = 0;
  let g2 = 0;
  while (Math.hypot(R.fl.s.vel[0], R.fl.s.vel[2]) > 0.2 && g2++ < 6 * 60) { R.keys.clear(); R.keys.add('KeyB'); R.frame(); }
  R.press('parkBrake'); R.step(0.5);
}
function stopAndPark(R) {
  R.thrTgt = 0;
  R.step(8, () => { R.keys.add('KeyB'); const w = R.where(); const err = P.wrap180(354 - R.att().hdg) - w.cross * 0.06; if (err > 1.2) R.keys.add('KeyE'); else if (err < -1.2) R.keys.add('KeyQ'); });
  if (!R.fl.controls.parkBrake) R.press('parkBrake');
  R.step(1);
}
// the hand-flown final, flown with the game's OWN instructor law (syllabus.js traineeLand,
// the 'fixed' parameter set): a glidepath PD (pitch for the 3-degree path to the 300 m aim
// point, with a sink-rate damping term; throttle for speed), then a two-stage flare — a
// first pitch at the flare height, deepening below the knee, power off below pOff, and an
// anti-balloon cap that keeps the descent coming until the flare is low. The lesson engine
// measured that law at 256 fpm from a stabilised 4 km final; from this audit's 200 ft
// hand-over it lands both types at 280-420 fpm, mains first, across the whole hand-over
// spread (probed at entry speeds ±4 kt around nominal).
//
// The law drives the flight model's stick channel (s.ovr — the same input the lesson
// engine's instructor flies with), and the reason is a measured property of the model, not
// a shortcut: the keyboard path flies through an attitude HOLD (W/S wind a target, the
// hold chases it, stall guard and all), and a scripted bang-bang loop around that hold
// limit-cycled in the last feet — across nine near-identical placed entries the touchdown
// attitude swung from -3.7 to +4.1 degrees and the nose-wheel-first verdict was a coin
// flip. A human anticipates; this harness does not, so it flies the final the way the
// game itself demonstrates one. Every other phase of every profile is keys and cockpit
// controls only, and nothing in the systems under audit reads the stick channel.
function handFinal(R, { iasTgt = 64, fH = 28, knee = 13, pOff = 28 } = {}) {
  const s = R.fl.s, out = s.out;
  const stage1 = 4.5, ramp = 0.55;
  let flaring = false, td = null;
  for (let f = 0; f < 180 * 60 && !td; f++) {
    R.keys.clear();
    const w = R.where(), att = R.att();
    if (s.onGround) { td = { ...w }; break; }
    const gsK = Math.hypot(s.vel[0], s.vel[2]) * 1.94384;
    const hdgT = 354 + clamp(-w.cross * 0.12, -12, 12);
    const bankT = clamp(P.wrap180(hdgT - att.hdg) * 1.2, -16, 16);
    let pitchT, thrT;
    if (out.agl > fH && !flaring) {
      const pathFt = Math.max(0, 300 - w.along) * 0.0524 * 3.28084; // the 3-degree path, ft
      pitchT = -1 - clamp((out.agl - pathFt) * 0.05, -5, 3) + clamp((-gsK * 5.31 - out.vsi) * 0.006, -3, 3);
      thrT = clamp(0.30 + (iasTgt - out.ias) * 0.06, 0, 0.8);
    } else {
      flaring = true;
      pitchT = out.agl > knee ? stage1 : Math.min(9.5, stage1 + (knee - out.agl) * ramp);
      if (out.vsi > -60 && out.agl > 6) pitchT = Math.min(pitchT, 1.5); // never balloon away
      thrT = out.agl > pOff ? Math.min(0.32, clamp(0.30 + (iasTgt - out.ias) * 0.06, 0, 0.8)) : 0;
    }
    s.ovr = { elev: clamp((pitchT - att.pitch) * 0.16, -0.6, 0.6), ail: clamp((bankT - att.bank) * 0.06, -0.5, 0.5), rud: 0 };
    R.thrTgt = thrT;
    if (process.env.AUDIT_DEBUG && f % 180 === 0) console.log(`    [hand] along=${w.along.toFixed(0)} agl=${out.agl.toFixed(0)} ias=${out.ias.toFixed(0)} vsi=${out.vsi.toFixed(0)} thr=${s.thr.toFixed(2)} pitch=${att.pitch.toFixed(1)} pT=${pitchT.toFixed(1)}`);
    R.frame();
  }
  s.ovr = null;
  return td;
}
// the traffic pattern back to a long final, flown by hand (shared shape, per-type speeds).
// Positioning uses the classical split (pitch for speed, throttle for altitude) — see patStep
// for why the other split parks the twin on the back of its power curve.
function flyPattern(R, cfg) {
  const s = R.fl.s, out = s.out;
  const patStep = (sec, hdgFn, iasTgt, altTgt) => {
    for (let t = 0; t < sec; t++) R.step(1, () => {
      const w = R.where(), att = R.att();
      const bTgt = clamp(P.wrap180(hdgFn(w) - att.hdg) * 1.1, -20, 20);
      if (att.bank < bTgt - 1.2) R.keys.add('KeyD'); else if (att.bank > bTgt + 1.2) R.keys.add('KeyA');
      // pitch for SPEED, throttle for ALTITUDE — the split that cannot park an aeroplane on
      // the back of its power curve. (Pitch-for-altitude + throttle-for-speed did exactly
      // that to the twin: 5 degrees nose-up at pattern speed on low power, neither climbing
      // nor descending; and in the turns the speed term slammed the lever shut whenever the
      // descent built speed — the classic energy trap, flown out of the classic way.)
      const pTgt = clamp(1.0 + (out.ias - iasTgt) * 0.18, -4, 8);
      if (att.pitch < pTgt - 0.6) R.keys.add('KeyS'); else if (att.pitch > pTgt + 0.6) R.keys.add('KeyW');
      R.thrTgt = clamp(0.45 + (altTgt - out.agl) * 0.0009, 0.15, 0.95);
    });
  };
  const downwindHdg = w => 174 + clamp((1500 - w.cross) * -0.09, -15, 15);
  if (process.env.AUDIT_DEBUG) console.log(`    [pattern] entry: along=${R.where().along.toFixed(0)} cross=${R.where().cross.toFixed(0)} agl=${out.agl.toFixed(0)} hdg=${R.att().hdg.toFixed(0)}`);
  // turn onto the downwind, descending to pattern altitude, then fly it to the base turn point
  patStep(24, downwindHdg, cfg.downwindIas, 1350);
  patStep(16, downwindHdg, cfg.downwindIas, 1350);
  let g = 0;
  while (R.where().along > -7500 && g++ < 1000) { patStep(1, downwindHdg, cfg.downwindIas, 1350); if (process.env.AUDIT_DEBUG && g % 40 === 0) console.log(`    [pattern] g=${g} along=${R.where().along.toFixed(0)} cross=${R.where().cross.toFixed(0)} agl=${out.agl.toFixed(0)} ias=${out.ias.toFixed(0)} hdg=${R.att().hdg.toFixed(0)} thr=${s.thr.toFixed(2)} crashed=${s.crashed}`); }
  assert.ok(R.where().along <= -7400, 'reaches the base turn point');
  if (process.env.AUDIT_DEBUG) console.log(`    [pattern] downwind end: along=${R.where().along.toFixed(0)} cross=${R.where().cross.toFixed(0)} agl=${out.agl.toFixed(0)}`);
  // base leg westbound, descending a little
  patStep(30, () => 264, cfg.baseIas, 1050);
  if (process.env.AUDIT_DEBUG) console.log(`    [pattern] base end: along=${R.where().along.toFixed(0)} cross=${R.where().cross.toFixed(0)} agl=${out.agl.toFixed(0)} hdg=${R.att().hdg.toFixed(0)}`);
  // final turn to north, levelling at the settle altitude
  patStep(35, w => 354 + clamp((0 - w.cross) * 0.09, -15, 15), cfg.baseIas - 3, 1000);
  if (process.env.AUDIT_DEBUG) console.log(`    [pattern] final turn end: along=${R.where().along.toFixed(0)} cross=${R.where().cross.toFixed(0)} agl=${out.agl.toFixed(0)} onGround=${s.onGround} crashed=${s.crashed}`);
  assert.ok(!s.crashed);
  assert.ok(out.agl > 700, `final turn ends airborne at a sane height (${out.agl.toFixed(0)})`);
  return out;
}

// ------------------------------------------------------------------ full profile: Archer
test('audit profile: Archer full flight, cold & dark to shutdown and restart', { timeout: 600000 }, () => {
  const R = rig('pa28', { onRunway: true }), s = R.fl.s, out = s.out, sw = R.sw;
  // ---- cold & dark gates (setCold is the game's own cold-start procedure)
  R.sys.setCold(); R.step(0.5);
  assert.equal(R.sys.elec.volts, 0, 'masters off: the bus is dead');
  assert.equal(R.sys.elec.pfdOn, false);
  assert.equal(sw.mag, 'OFF');
  assert.equal(sw.mixture, 0);
  assert.deepEqual(R.sys.alerts, []);
  assert.ok(Math.abs(s.fuel[0] - 19.2) < 0.01 && Math.abs(s.fuel[1] - 19.2) < 0.01, 'both tanks at the spawn quantity');
  const hobbs0 = R.sys.hobbs;
  // ---- start via cockpit controls only
  assert.ok(startViaControls(R), 'engine catches from the cockpit');
  R.step(5);
  assert.ok(R.sys.oil > 30, `oil pressure up (${R.sys.oil.toFixed(0)})`);
  assert.ok(R.sys.elec.volts > 13.5, 'alternator carries the bus');
  assert.deepEqual(R.alerts(), [], 'no warnings after a normal start');
  assert.equal(sw.mag, 'BOTH', 'key sprang back to BOTH');
  // ---- taxi on the runway heading
  taxiTo(R, 95);
  const wTaxi = R.where();
  assert.ok(Math.abs(wTaxi.cross) < 6, `taxi stays on the centreline (${wTaxi.cross.toFixed(1)})`);
  assert.ok(Math.hypot(s.vel[0], s.vel[2]) < 0.3, 'stopped after taxi braking');
  assert.equal(R.fl.controls.parkBrake, true, 'parking brake set at the hold');
  // ---- run-up: mag drops and carb-heat drop inside the modelled bands, aircraft held
  R.thrTgt = 0.52; // set the run-up by the tachometer, like a pilot (a cold engine needs more lever)
  for (let i = 0; i < 14 && R.sys.rpm < 2000; i++) { R.step(1); if (R.sys.rpm < 2000) R.thrTgt = Math.min(0.8, (R.thrTgt ?? 0.5) + 0.04); }
  assert.ok(R.sys.rpm > 1900 && R.sys.rpm < 2300, `run-up rpm (${Math.round(R.sys.rpm)})`);
  R.thrTgt = null; R.step(3); // freeze the lever and let the rpm settle before measuring drops
  const rpmBoth = R.sys.rpm, posRunup = R.where();
  R.press('mag', -1, true); R.step(2); const dropL = rpmBoth - R.sys.rpm;
  R.press('mag', 1); R.step(1);
  R.press('mag', -1, true); R.press('mag', -1, true); R.step(2); const dropR = R.sys.rpm > 0 ? (rpmBoth - R.sys.rpm) : -1;
  R.press('mag', 1); R.press('mag', 1); R.step(1);
  assert.ok(dropL >= 40 && dropL <= 175, `mag L drop in band (${dropL.toFixed(0)})`);
  assert.ok(dropR >= 40 && dropR <= 175, `mag R drop in band (${dropR.toFixed(0)})`);
  R.press('carbHeat'); R.step(3); const dropCarb = rpmBoth - R.sys.rpm;
  R.press('carbHeat'); R.step(2);
  assert.ok(dropCarb >= 25 && dropCarb <= 160, `carb-heat drop in band (${dropCarb.toFixed(0)})`);
  assert.ok(Math.abs(R.where().along - posRunup.along) < 1 && Math.abs(R.where().cross - posRunup.cross) < 1, 'no creep during the run-up');
  // ---- takeoff and hand climb
  R.thrTgt = 0; R.step(0.5);
  R.press('parkBrake'); R.thrTgt = 1;
  let liftAlong = null;
  for (let f = 0; f < 60 * 60 && liftAlong == null; f++) {
    R.keys.clear();
    if (!s.onGround) liftAlong = R.where().along;
    law(R, { hdgTgt: 354, iasTgt: 76, pBase: 3 });
    R.frame();
  }
  assert.ok(liftAlong != null && liftAlong > 150 && liftAlong < 750, `liftoff on the runway (${liftAlong && liftAlong.toFixed(0)})`);
  R.thrTgt = 0.92; // climb to pattern-plus altitude by hand (the model's Archer climbs ~500-700 fpm)
  let climbT = 0;
  while (out.agl < 2350 && climbT < 320) { R.step(5, () => law(R, { hdgTgt: 354, iasTgt: 80, pBase: 4 })); climbT += 5; }
  assert.ok(out.agl > 2000, `climbed out (${out.agl.toFixed(0)} ft in ${climbT} s)`);
  // ---- AP cruise: electrical, fuel-selector discipline, no warnings
  setAltSel(R, 2500);
  R.press('pfd.hdg');
  engageCruiseAP(R);
  assert.equal(R.ap.on, true, 'AP engages above its floor');
  const fuelL0 = s.fuel[0], fuelR0 = s.fuel[1];
  R.thrTgt = 0.66;
  if (process.env.AUDIT_DEBUG) { for (let t = 0; t < 140; t += 20) { R.step(20); console.log(`    [cruise] t=${t + 20} hdg=${R.att().hdg.toFixed(0)} bug=${R.av.hdgBug.toFixed(0)} indAlt=${R.fl.L.last.alt.toFixed(0)} altSel=${R.av.altSel} apOn=${R.ap.on} apHdg=${R.ap.display.hdg} apAlt=${R.ap.display.alt} along=${R.where().along.toFixed(0)} cross=${R.where().cross.toFixed(0)}`); } }
  else R.step(140);
  assert.ok(Math.abs(R.fl.L.last.alt - 2500) < 130, `AP holds the selected altitude (${R.fl.L.last.alt.toFixed(0)})`);
  assert.ok(fuelL0 - s.fuel[0] > 0.22, `selected (left) tank burns (${(fuelL0 - s.fuel[0]).toFixed(2)} gal in 140 s)`);
  assert.ok(Math.abs(s.fuel[1] - fuelR0) < 1e-9, 'unselected (right) tank untouched to the drop');
  assert.deepEqual(R.alerts(), [], 'no warnings in cruise');
  assert.ok(R.sys.elec.volts >= 13.5 && R.sys.elec.volts <= 14.6 && R.sys.elec.amps >= 0, 'bus healthy in cruise');
  assert.ok(R.sys.oilT > 140 && R.sys.oilT < 230, `oil temperature in band (${R.sys.oilT.toFixed(0)})`);
  // ---- leaning A/B at FIXED throttle: fuel flow must fall, EGT must rise toward peak
  R.thrTgt = null; // freeze the cockpit throttle where it is
  R.step(10);
  const ff0 = s.eng[0].ff, egt0 = s.eng[0].egt;
  for (let i = 0; i < 2; i++) R.press('mixture', -1, true); // wheel: 1.0 -> 0.8
  assert.ok(Math.abs(R.sw.mixture - 0.8) < 0.011);
  R.step(12);
  assert.ok(s.eng[0].ff < ff0 * 0.88, `leaning cuts fuel flow (${ff0.toFixed(1)} -> ${s.eng[0].ff.toFixed(1)} gph)`);
  assert.ok(s.eng[0].egt > egt0 + 50, `EGT rises toward peak (${egt0.toFixed(0)} -> ${s.eng[0].egt.toFixed(0)})`);
  for (let i = 0; i < 2; i++) R.press('mixture', 1, true); // richen back for descent
  assert.ok(Math.abs(R.sw.mixture - 1) < 0.011);
  apKey(R, 'AP'); // disconnect via the PFD softkey
  assert.equal(R.ap.on, false, 'AP disconnects from the softkey');
  // ---- pattern and an AP-flown final to its 200 ft floor
  flyPattern(R, { downwindThr: 0.42, downwindIas: 92, baseThr: 0.34, baseIas: 88 });
  R.press('sw.fuelPump');
  // settle onto the path — but never below the AP's 800 ft engage floor while settling
  for (let st = 0; st < 30; st++) {
    R.step(1, () => {
      const w = R.where(), dist = -w.along, pathAGL = Math.max(880, dist * 0.172);
      const vsiTgt = clamp(-(out.agl - pathAGL) * 2.0, -800, -200);
      if (out.vsi > vsiTgt + 50) R.thrTgt = clamp((R.thrTgt ?? s.thr) - 0.006, 0, 0.8);
      else if (out.vsi < vsiTgt - 50) R.thrTgt = clamp((R.thrTgt ?? s.thr) + 0.006, 0, 0.8);
      law(R, { hdgTgt: 354 + clamp((0 - w.cross) * 0.09, -15, 15), iasTgt: 80, pBase: 1 });
    });
    if (st >= 5 && out.agl >= 850) break;
  }
  assert.ok(out.agl >= 820, `settled high enough for the AP (${out.agl.toFixed(0)})`);
  setAltSel(R, Math.round(R.fl.L.last.alt / 100) * 100);
  R.press('pfd.hdg');
  apKey(R, 'AP');
  assert.equal(R.ap.on, true, 'AP re-engages for the final');
  let flapStage = 0, stairT = 0, discAGL = null;
  for (let f = 0; f < 300 * 60 && discAGL == null && !s.onGround; f++) {
    R.keys.clear();
    const w = R.where(), dist = -w.along;
    if (!R.ap.on) { discAGL = out.agl; break; }
    const iasTgt = flapStage === 0 ? 78 : flapStage === 1 ? 72 : flapStage === 2 ? 68 : 66;
    R.thrTgt = clamp((R.thrTgt ?? s.thr) + (iasTgt - out.ias) * 0.001, 0, 0.8);
    stairT += 1 / 60;
    if (stairT > 3) {
      stairT = 0;
      const pathAGL = Math.max(30, (dist - 1000) * 0.172 - 30);
      setAltSel(R, Math.round((R.fl.L.last.alt + (pathAGL - out.agl)) / 100) * 100);
      const wantBug = AV.trueToMag(354 + clamp((0 - w.cross) * 0.09, -12, 12), P.MAGVAR_W);
      let db = Math.round(P.wrap180(wantBug - R.av.hdgBug));
      while (db > 0) { R.press('pfd.hdg', 1, true); db--; }
      while (db < 0) { R.press('pfd.hdg', -1, true); db++; }
    }
    if (flapStage === 0 && out.agl < 900) { R.press('flaps'); flapStage = 1; }
    else if (flapStage === 1 && out.agl < 600) { R.press('flaps'); flapStage = 2; }
    else if (flapStage === 2 && out.agl < 350) { R.press('flaps'); flapStage = 3; }
    R.frame();
  }
  assert.ok(discAGL != null && discAGL >= 180 && discAGL <= 220, `AP flies to its 200 ft floor and disconnects (${discAGL && discAGL.toFixed(0)})`);
  if (process.env.AUDIT_DEBUG) console.log(`    [final] AP disconnect at dist=${(-R.where().along).toFixed(0)} cross=${R.where().cross.toFixed(0)} ias=${out.ias.toFixed(0)}`);
  assert.equal(s.flapIdx, 3, 'full flap for landing');
  assert.ok(Math.abs(R.where().cross) < 60, 'final is centred at disconnect');
  // ---- hand the last 200 ft and land
  assert.ok(handFinal(R, { iasTgt: 64 }), 'touches down');
  stopAndPark(R);
  assert.ok(s.td, 'touchdown recorded');
  assert.equal(s.td.onRunway, true, `touchdown on the runway (along ${s.td.along}, cross ${s.td.cross})`);
  assert.ok(s.td.fpm < 620 && s.td.fpm > 60, `firm but not hard (${s.td.fpm} fpm)`);
  assert.ok(s.td.kias >= 45 && s.td.kias <= 75, `crossing speed sane (${s.td.kias} kt)`);
  assert.equal(s.td.noseFirst, false);
  assert.equal(s.crashed, false);
  // ---- shutdown by the book, then prove a warm restart still works (state recovery)
  R.press('mixture');
  R.step(3);
  assert.equal(R.sys.running, false, 'mixture cutoff stops the engine');
  R.press('mag', -1, true); R.press('mag', -1, true); R.press('mag', -1, true);
  R.press('sw.avionics'); R.press('sw.alt'); R.press('sw.bat');
  R.step(8);
  assert.ok(s.eng[0].rpm < 60, `prop down to windmilling (${s.eng[0].rpm.toFixed(0)} rpm — a dead prop windmills faintly in the 5 kt breeze by the model's own rule, 14×airspeed)`);
  assert.equal(R.sys.rpm, 0, 'the tachometer reads zero');
  assert.equal(R.sys.elec.pfdOn, false);
  assert.equal(R.sys.elec.volts, 0, 'dark cockpit with the master off');
  assert.deepEqual(R.alerts(), [], 'no warnings in a cold cockpit');
  assert.ok(s.fuel[0] + s.fuel[1] < 38.4 - 1.2, 'the flight burned fuel');
  assert.ok(R.sys.hobbs > hobbs0, 'hobbs advanced');
  assert.ok(startViaControls(R, { cold: false }), 'warm restart after the full profile');
  R.step(5); // oil and fuel pressure take their seconds to come up after a catch — the
  // annunciators lit for them in between are the truth, not a false warning
  assert.ok(R.sys.oil > 30, 'oil pressure up after the restart');
  assert.deepEqual(R.alerts(), [], 'no warnings once the restart settles');
  R.press('mag', -1, true); R.press('mag', -1, true); R.press('mag', -1, true); R.step(6);
  assert.equal(R.sys.running, false, 'mags off stops it again');
  R.cp.dispose();
});

// ------------------------------------------------------------------ full profile: Seminole
test('audit profile: Seminole full flight with gear cycle and twin procedures', { timeout: 600000 }, () => {
  const R = rig('pa44', { onRunway: true }), s = R.fl.s, out = s.out, sw = R.sw;
  R.sys.setCold(); R.step(0.5);
  assert.equal(R.sys.elec.volts, 0, 'masters off: the bus is dead');
  assert.equal(R.sys.elec.pfdOn, false);
  assert.ok(Math.abs(s.fuel[0] - 43.2) < 0.01 && Math.abs(s.fuel[1] - 43.2) < 0.01, 'both tanks at the spawn quantity');
  // ---- start LEFT then RIGHT, each from the key, in checklist order (the shared key cranks
  // one engine at a time — startViaControls' loop-until-running would start BOTH, so the twin
  // profile uses the one-engine variant and asserts the order explicitly)
  assert.ok(startTwinEngine(R), 'first START catches an engine');
  R.step(3);
  assert.deepEqual(twinEng(R), ['run', 'off'], 'the first engine to start is the left');
  assert.ok(crankTwin(R, 1), 'second START catches the right engine');
  assert.deepEqual(twinEng(R), ['run', 'run'], 'both engines running');
  assert.equal(R.sys.running, true);
  R.step(4);
  assert.ok(R.sys.oil > 30 && R.sys.elec.volts > 13.5);
  assert.deepEqual(R.alerts(), [], 'no warnings after a normal twin start');
  // ---- taxi
  taxiTo(R, 95);
  assert.ok(Math.abs(R.where().cross) < 6, 'taxi stays centred');
  // ---- run-up: mag drops both engines + the prop cycle with a real RPM sag
  R.thrTgt = 0.55;
  for (let i = 0; i < 14 && R.sys.twinLive[0].rpm < 2000; i++) { R.step(1); if (R.sys.twinLive[0].rpm < 2000) R.thrTgt = Math.min(0.85, (R.thrTgt ?? 0.55) + 0.04); }
  assert.ok(R.sys.twinLive[0].rpm > 1900 && R.sys.twinLive[0].rpm < 2300, `run-up rpm (${Math.round(R.sys.twinLive[0].rpm)})`);
  R.thrTgt = null; R.step(3); // freeze the lever and settle before measuring drops
  const rpmBoth = R.sys.twinLive[0].rpm, posRunup = R.where();
  R.press('mag', -1, true); R.step(2); const dropL = rpmBoth - R.sys.twinLive[0].rpm;
  R.press('mag', 1); R.step(1);
  R.press('mag', -1, true); R.press('mag', -1, true); R.step(2); const dropR = rpmBoth - R.sys.twinLive[0].rpm;
  R.press('mag', 1); R.press('mag', 1); R.step(1);
  assert.ok(dropL >= 40 && dropL <= 175, `mag L drop (${dropL.toFixed(0)})`);
  assert.ok(dropR >= 40 && dropR <= 175, `mag R drop (${dropR.toFixed(0)})`);
  let sag = 0;
  R.press('prop'); // cycle toward feather and back
  for (let i = 0; i < 5 * 60; i++) { R.keys.clear(); R.frame(); sag = Math.max(sag, rpmBoth - R.sys.twinLive[0].rpm); if (sw.propCycled) break; }
  assert.ok(sag > 150, `prop cycle sags the rpm (${sag.toFixed(0)})`);
  assert.equal(sw.propCycled, true, 'checklist prop-cycle flag raised');
  assert.ok(Math.abs(R.where().along - posRunup.along) < 1, 'no creep during the run-up');
  // ---- takeoff, gear up in the climb with NO gear warning at climb power (fixed rule)
  R.thrTgt = 0; R.step(0.5);
  R.press('parkBrake'); R.thrTgt = 1;
  let liftAlong = null;
  for (let f = 0; f < 60 * 60 && liftAlong == null; f++) {
    R.keys.clear();
    if (!s.onGround) liftAlong = R.where().along;
    law(R, { hdgTgt: 354, iasTgt: 82, pBase: 3 });
    R.frame();
  }
  assert.ok(liftAlong != null && liftAlong < 950, `liftoff (${liftAlong && liftAlong.toFixed(0)})`);
  R.thrTgt = 0.92;
  let clT = 0; // the twin takes its seconds to settle into the climb — wait for the state,
  // don't just allow it four seconds and call the aeroplane broken
  while ((out.agl <= 60 || out.vsi <= 200) && clT < 30) { R.step(1, () => law(R, { hdgTgt: 354, iasTgt: 88, pBase: 3 })); clT += 1; }
  assert.ok(out.agl > 60 && out.vsi > 200, `positive climb before retracting (${out.agl.toFixed(0)} ft, ${out.vsi.toFixed(0)} fpm after ${clT} s)`);
  R.press('gear');
  let gearWarnAtPower = false;
  for (let i = 0; i < 12; i++) { R.step(1, () => law(R, { hdgTgt: 354, iasTgt: 88, pBase: 3 })); if (R.alerts().includes('GEAR')) gearWarnAtPower = true; }
  assert.equal(s.gearPos < 0.05, true, 'gear fully up');
  assert.deepEqual(gearLampCounts(R), [0, 0], 'no lamps with the gear up');
  assert.equal(gearWarnAtPower, false, 'NO gear warning during a full-power climb-out retraction');
  let climbT2 = 0;
  while (out.agl < 1750 && climbT2 < 240) { R.step(5, () => law(R, { hdgTgt: 354, iasTgt: 92, pBase: 3 })); climbT2 += 5; }
  assert.ok(out.agl > 1600, `climbed (${out.agl.toFixed(0)} in ${climbT2} s)`);
  // ---- AP cruise: both tanks feed their own engines
  setAltSel(R, 2400);
  R.press('pfd.hdg');
  engageCruiseAP(R);
  assert.equal(R.ap.on, true);
  const f0 = [...s.fuel];
  R.thrTgt = 0.62;
  R.step(240); // four minutes: at the cruise flow (~10 gph a side) 120 s only burns ~0.33 gal
  // a tank — the 0.5 gal claim needs the longer sample, not a bigger throttle
  assert.ok(Math.abs(R.fl.L.last.alt - 2400) < 130, 'AP holds altitude');
  assert.ok(f0[0] - s.fuel[0] > 0.5 && f0[1] - s.fuel[1] > 0.5, 'each engine burns its own tank');
  assert.ok(Math.abs((f0[0] - s.fuel[0]) - (f0[1] - s.fuel[1])) < 0.7, 'twin burn is balanced');
  assert.deepEqual(R.alerts(), [], 'no warnings in twin cruise');
  apKey(R, 'AP');
  assert.equal(R.ap.on, false);
  // ---- pattern, gear down BEFORE the final, 3 greens, then the AP final
  flyPattern(R, { downwindThr: 0.46, downwindIas: 100, baseThr: 0.38, baseIas: 95 });
  assert.ok(out.agl > 800, 'still high enough to extend the gear first');
  R.press('gear');
  let sawRed = false;
  for (let i = 0; i < 12; i++) { R.step(1, () => law(R, { hdgTgt: 354, iasTgt: 90, pBase: 1 })); const gc = gearLampCounts(R); if (gc[1] > 0) sawRed = true; }
  assert.equal(s.gearPos > 0.999, true, 'gear locked down');
  assert.deepEqual(gearLampCounts(R), [3, 0], 'three greens');
  assert.equal(sawRed, true, 'red transit lamps during extension');
  assert.ok(!R.alerts().includes('GEAR'), 'no gear warning with the gear locked down');
  R.press('sw.fuelPump');
  for (let st = 0; st < 30; st++) {
    R.step(1, () => {
      const w = R.where(), dist = -w.along, pathAGL = Math.max(880, dist * 0.172);
      const vsiTgt = clamp(-(out.agl - pathAGL) * 2.0, -800, -200);
      if (out.vsi > vsiTgt + 50) R.thrTgt = clamp((R.thrTgt ?? s.thr) - 0.006, 0, 0.8);
      else if (out.vsi < vsiTgt - 50) R.thrTgt = clamp((R.thrTgt ?? s.thr) + 0.006, 0, 0.8);
      law(R, { hdgTgt: 354 + clamp((0 - w.cross) * 0.09, -15, 15), iasTgt: 88, pBase: 1 });
    });
    if (st >= 4 && out.agl >= 850) break;
  }
  assert.ok(out.agl >= 820, `settled high enough for the AP (${out.agl.toFixed(0)})`);
  setAltSel(R, Math.round(R.fl.L.last.alt / 100) * 100);
  R.press('pfd.hdg');
  apKey(R, 'AP');
  assert.equal(R.ap.on, true, 'AP re-engages for the final');
  let flapStage = 0, stairT = 0, discAGL = null;
  for (let f = 0; f < 300 * 60 && discAGL == null && !s.onGround; f++) {
    R.keys.clear();
    const w = R.where(), dist = -w.along;
    if (!R.ap.on) { discAGL = out.agl; break; }
    const iasTgt = flapStage === 0 ? 92 : flapStage === 1 ? 86 : flapStage === 2 ? 82 : 80;
    R.thrTgt = clamp((R.thrTgt ?? s.thr) + (iasTgt - out.ias) * 0.001, 0, 0.8);
    stairT += 1 / 60;
    if (stairT > 3) {
      stairT = 0;
      const pathAGL = Math.max(30, (dist - 1000) * 0.172 - 30);
      setAltSel(R, Math.round((R.fl.L.last.alt + (pathAGL - out.agl)) / 100) * 100);
      const wantBug = AV.trueToMag(354 + clamp((0 - w.cross) * 0.09, -12, 12), P.MAGVAR_W);
      let db = Math.round(P.wrap180(wantBug - R.av.hdgBug));
      while (db > 0) { R.press('pfd.hdg', 1, true); db--; }
      while (db < 0) { R.press('pfd.hdg', -1, true); db++; }
    }
    if (flapStage === 0 && out.agl < 950) { R.press('flaps'); flapStage = 1; }
    else if (flapStage === 1 && out.agl < 650) { R.press('flaps'); flapStage = 2; }
    else if (flapStage === 2 && out.agl < 400) { R.press('flaps'); flapStage = 3; }
    R.frame();
  }
  assert.ok(discAGL != null && discAGL >= 180 && discAGL <= 220, `AP floor disconnect (${discAGL && discAGL.toFixed(0)})`);
  assert.equal(s.flapIdx, 3, 'full flap');
  assert.ok(handFinal(R, { iasTgt: 78, fH: 32, knee: 15, pOff: 32 }), 'touches down');
  stopAndPark(R);
  assert.ok(s.td, 'touchdown recorded');
  assert.equal(s.td.onRunway, true, `touchdown on the runway (along ${s.td.along}, cross ${s.td.cross})`);
  assert.ok(s.td.fpm < 620, `not hard (${s.td.fpm} fpm)`);
  assert.ok(s.td.kias >= 55 && s.td.kias <= 95, `crossing speed sane (${s.td.kias} kt)`);
  assert.equal(s.crashed, false);
  // ---- shutdown: one mixture lever stops BOTH engines; then restart both and stop again
  R.press('mixture');
  R.step(3);
  assert.deepEqual(twinEng(R), ['off', 'off'], 'mixture cutoff stops both engines');
  R.press('mag', -1, true); R.press('mag', -1, true); R.press('mag', -1, true);
  R.press('sw.avionics'); R.press('sw.alt'); R.press('sw.bat');
  R.step(8);
  assert.equal(R.sys.elec.volts, 0);
  assert.deepEqual(R.alerts(), []);
  assert.ok(startTwinEngine(R, { cold: false }), 'warm restart (left)');
  assert.ok(crankTwin(R, 1), 'warm restart (right)');
  assert.deepEqual(twinEng(R), ['run', 'run'], 'both restarted after the profile');
  R.press('mixture'); R.step(3);
  assert.deepEqual(twinEng(R), ['off', 'off'], 'and stopped again');
  R.cp.dispose();
});

// ------------------------------------------------------------------ shared air setup
function airSetup(type = 'pa28', { alt = 3000, ias = 100, selL = true } = {}) {
  const R = rig(type), s = R.fl.s;
  R.sys.setRunning(s);
  P.placeInAir(s, 0, -20000, alt, 360, ias, 0, 0);
  if (R.fl.controls.parkBrake) R.press('parkBrake'); // placed from a parked spawn: release it
  if (!selL) setSel(R, 'R'); // Archer selector to R
  R.step(2);
  assert.equal(R.sys.running, true);
  return R;
}
function crankStart(R) { // one key-to-START attempt cycle, returns whether it caught
  R.press('mag', 1);
  let t = 0;
  while (!R.sys.running && t < 8) { R.step(0.25); t += 0.25; if (!R.sys.running && R.sw.mag !== 'START') R.press('mag', 1); }
  return R.sys.running;
}
function stableCruise(R, sec = 30, allowed = []) { // prove normal flight: AP cruise with sane
  // indications. `allowed` names alerts that are CORRECT in the scenario (an empty tank's
  // FUEL L after a crossfeed restart is the drill working, not a malfunction).
  setAltSel(R, Math.round(R.fl.L.last.alt / 100) * 100);
  R.press('pfd.hdg');
  engageCruiseAP(R);
  assert.equal(R.ap.on, true, 'AP engages for the recovery check');
  R.thrTgt = R.type === 'pa44' ? 0.6 : 0.64;
  R.step(sec);
  assert.deepEqual(R.alerts().filter(id => !allowed.includes(id)), [], `no warnings in the recovery cruise (saw: ${R.alerts().join(', ') || 'none'})`);
  assert.ok(Math.abs(R.fl.L.last.alt - R.av.altSel) < 160, 'holds altitude');
  apKey(R, 'AP');
}

// ------------------------------------------------------------------ abuse battery: Archer
test('audit abuse: Archer ignition/fuel/electrical contradictions all recover', { timeout: 600000 }, () => {
  { // mags OFF in flight: engine stops; mags alone do NOT relight it (modelled); the starter does
    const R = airSetup('pa28'); const s = R.fl.s;
    R.press('mag', -1, true); R.press('mag', -1, true); R.press('mag', -1, true);
    R.step(4);
    assert.equal(R.sys.running, false, 'mags off stop the engine');
    R.press('mag', 1); R.press('mag', 1); R.press('mag', 1); // back to BOTH
    R.step(5);
    assert.equal(R.sys.running, false, 'NOTE (modelled): restoring mags alone does not relight a windmilling engine');
    assert.ok(crankStart(R), 'starter relights it in flight');
    stableCruise(R);
    R.cp.dispose();
  }
  { // mixture cutoff at altitude, then restart
    const R = airSetup('pa28');
    R.press('mixture');
    R.step(3);
    assert.equal(R.sys.running, false, 'mixture cutoff stops the engine');
    R.press('mixture'); // rich again
    assert.ok(crankStart(R), 'restarts after richening');
    stableCruise(R);
    R.cp.dispose();
  }
  { // selector OFF: line fuel gives a grace period; a long OFF stops it; reselect + crank recovers
    const R = airSetup('pa28'); const s = R.fl.s;
    setSel(R, 'OFF');
    R.step(3);
    assert.equal(R.sys.running, true, 'line fuel keeps it running briefly');
    setSel(R, 'R');
    R.step(3);
    assert.equal(R.sys.running, true, 'reselect before the lines drain: no stop');
    setSel(R, 'OFF');
    R.step(9);
    assert.equal(R.sys.running, false, 'a long selector OFF starves it');
    setSel(R, 'L');
    assert.ok(crankStart(R), 'restarts on the reselected tank');
    stableCruise(R);
    R.cp.dispose();
  }
  { // selecting the EMPTY tank in flight: starvation, then the classic save — other tank + crank
    const R = airSetup('pa28', { selL: true }); const s = R.fl.s;
    s.fuel[0] = 0.02; // scenario placement: the left tank is (nearly) dry
    R.step(20);
    assert.equal(R.sys.running, false, 'engine starves on the empty selected tank');
    setSel(R, 'R'); // the full tank
    assert.ok(crankStart(R), 'restarts on the full tank');
    stableCruise(R, 30, ['FUEL L']); // the dry tank's caution is correct, and stays lit
    R.cp.dispose();
  }
  { // battery OFF then alternator OFF in flight; breakers pulled and restored
    const R = airSetup('pa28'); const s = R.fl.s;
    R.press('sw.bat');
    R.step(2);
    assert.ok(R.sys.elec.volts > 13.5 && R.sys.elec.pfdOn, 'bus lives on the alternator with the battery off');
    R.press('sw.alt');
    R.step(2);
    assert.equal(R.sys.elec.pfdOn, false, 'bus dead: PFD off');
    assert.equal(R.sys.elec.mfdOn, false);
    assert.equal(R.sys.elec.standbyOn, true, 'standby flies on its own battery');
    assert.equal(R.sys.running, true, 'engine does not care');
    R.press('sw.bat'); R.press('sw.alt');
    R.step(2);
    assert.ok(R.sys.elec.pfdOn && R.sys.elec.volts > 13.5, 'electrics recover');
    R.press('cb.PFD'); R.step(1);
    assert.equal(R.sys.elec.pfdOn, false); assert.equal(R.sys.elec.mfdOn, true);
    R.press('cb.PFD'); R.step(1);
    assert.equal(R.sys.elec.pfdOn, true, 'PFD breaker restores the PFD');
    R.press('cb.ALTFLD'); R.step(1);
    assert.equal(R.sys.elec.gen, 0, 'ALT FLD breaker kills the alternator');
    R.press('cb.ALTFLD'); R.step(1);
    assert.ok(R.sys.elec.gen > 20, 'and restoring it brings charging back');
    R.press('cb.MASTER'); R.step(1);
    assert.equal(R.sys.elec.pfdOn, false);
    assert.equal(R.sys.running, true, 'master breaker does not stop the engine');
    R.press('cb.MASTER'); R.step(1);
    assert.equal(R.sys.elec.pfdOn, true);
    stableCruise(R);
    R.cp.dispose();
  }
  { // starter while running + key snapped back between frames: no crank, no heat, no state change
    const R = airSetup('pa28');
    R.press('mag', 1); // try START on a running engine
    R.step(1);
    assert.equal(R.sw.mag, 'BOTH', 'key forced back to BOTH');
    assert.equal(R.sys.st.crankHeat, 0);
    assert.equal(R.sys.running, true);
    R.cp.dispose();
    const R2 = rig('pa28'); // engine off: key to START and straight back to OFF between frames
    R2.press('sw.bat');
    R2.press('mag', 1); R2.press('mag', 1); R2.press('mag', 1); R2.press('mag', 1); // to START
    R2.press('mag', -1, true); R2.press('mag', -1, true); R2.press('mag', -1, true); R2.press('mag', -1, true); // straight to OFF
    R2.step(3);
    assert.equal(R2.sys.running, false, 'no phantom start');
    assert.equal(R2.sys.st.crankHeat, 0, 'no crank heat accumulated');
    R2.cp.dispose();
  }
  { // flaps above Vfe: the control warns, the flaps still go (as modelled), no damage state
    const R = airSetup('pa28', { ias: 130 });
    const r = R.apply(R.ctl('flaps').act(1)); // the words come back from the flight action,
    // not the control descriptor (R.press returns the descriptor, which carries no text)
    assert.match(String(r), /Vfe 102 kt を超えています/, 'the flap action warns above Vfe');
    R.step(20);
    assert.equal(R.fl.s.flapIdx, 1);
    assert.equal(R.fl.s.crashed, false);
    R.press('flaps', -1); R.step(2);
    assert.equal(R.fl.s.flapIdx, 0, 'retracts cleanly');
    R.cp.dispose();
  }
  { // carb heat at full takeoff power (Archer): the modelled power loss, and it comes back.
    // Measured on the physics' own power factor — an IAS comparison at full throttle in an
    // uncontrolled climb is noise (the aeroplane trades the loss for height); the model prices
    // the heat at a flat 6% with no ice present (carbK 0.94), which is exactly what shows here.
    const R = airSetup('pa28', { ias: 100 });
    R.thrTgt = 1; R.step(15);
    const pk0 = R.fl.s.eng[0].powK;
    R.press('carbHeat');
    R.step(12);
    const pk1 = R.fl.s.eng[0].powK;
    assert.ok(pk1 < pk0 * 0.97 && pk1 > pk0 * 0.88, `carb heat costs its modelled power (${pk0.toFixed(3)} -> ${pk1.toFixed(3)})`);
    assert.deepEqual(R.alerts(), [], 'no warnings from carb heat at power');
    R.press('carbHeat');
    R.step(12);
    assert.ok(R.fl.s.eng[0].powK > pk1 + 0.03, 'power returns with carb heat off');
    R.cp.dispose();
  }
  { // over-leaning in cruise: roughness arrives, richening cures it — nothing latches
    const R = airSetup('pa28');
    R.thrTgt = null; R.fl.s.thr = 0.66; // fixed throttle for an honest A/B
    R.step(8);
    for (let i = 0; i < 5; i++) R.press('mixture', -1, true); // 1.0 -> 0.5: far too lean at this altitude
    R.step(10);
    assert.ok(R.fl.s.eng[0].rough > 0.15, `over-lean roughness is modelled (${R.fl.s.eng[0].rough.toFixed(2)})`);
    for (let i = 0; i < 5; i++) R.press('mixture', 1, true);
    R.step(8);
    assert.ok(R.fl.s.eng[0].rough < 0.05, 'richening restores smooth running');
    assert.equal(R.sys.running, true, 'it never quit');
    stableCruise(R);
    R.cp.dispose();
  }
});

// ------------------------------------------------------------------ abuse battery: Seminole + the crossfeed start matrix
test('audit abuse: Seminole contradictions, crossfeed misuse and lever slams', { timeout: 600000 }, () => {
  { // both selectors OFF with the crossfeed open: both engines starve; restore + crank both back
    const R = airSetup('pa44'); const s = R.fl.s;
    R.press('xfeed');
    R.press('fuelSelL'); R.press('fuelSelR');
    R.step(14);
    // in flight a starved twin sits in 'stopping' at windmilling rpm — 'off' is only the
    // on-ground end state once the prop has spun down; either way it is stopped and restartable
    assert.deepEqual(twinEng(R), ['stopping', 'stopping'], 'open crossfeed cannot feed from OFF selectors');
    R.press('fuelSelL'); R.press('fuelSelR'); // both back ON
    assert.ok(crankTwin(R, 0), 'left restarts');
    assert.ok(crankTwin(R, 1), 'right restarts');
    assert.deepEqual(twinEng(R), ['run', 'run'], 'right restarts too');
    R.press('xfeed'); // back to the normal configuration
    stableCruise(R);
    R.cp.dispose();
  }
  { // crossfeed open with both selectors ON for a minute: each engine still burns its OWN tank
    const R = airSetup('pa44'); const s = R.fl.s;
    R.press('xfeed');
    const f0 = [...s.fuel];
    R.step(180); // at the placed cruise flow (~7 gph a side) a minute only burns ~0.12 gal a
    // tank — the both-tanks-burn claim needs the three-minute sample
    assert.ok(f0[0] - s.fuel[0] > 0.25 && f0[1] - s.fuel[1] > 0.25, 'both tanks burn with crossfeed open and both valves on');
    assert.ok(Math.abs((f0[0] - s.fuel[0]) - (f0[1] - s.fuel[1])) < 0.2, 'and they burn evenly — the open crossfeed is not quietly feeding both from one side');
    R.press('xfeed');
    stableCruise(R);
    R.cp.dispose();
  }
  { // lever slams: shared throttle stop-to-stop x3, prop pressed mid-cycle, mixture slam inside one frame
    const R = rig('pa44'); const s = R.fl.s;
    R.sys.setRunning(s); R.step(2);
    for (let c = 0; c < 3; c++) {
      for (let i = 0; i < 25; i++) R.press('throttle', 1);
      R.step(0.5);
      assert.ok(s.thr > 0.97, 'throttle reaches full');
      for (let i = 0; i < 25; i++) R.press('throttle', -1);
      R.step(0.5);
      assert.ok(s.thr < 0.03, 'throttle reaches idle');
    }
    assert.equal(R.sys.running, true, 'slams do not stop the engines');
    R.thrTgt = 0.55; R.step(4);
    R.press('prop'); R.press('prop'); // second press mid-cycle is a no-op by design
    let sag = 0; const rpm0 = R.sys.twinLive[0].rpm;
    for (let i = 0; i < 6 * 60; i++) { R.keys.clear(); R.frame(); sag = Math.max(sag, rpm0 - R.sys.twinLive[0].rpm); if (R.sw.propCycled) break; }
    assert.ok(sag > 150 && R.sw.propCycled, 'the cycle still completes after a double press');
    R.press('mixture'); R.press('mixture'); // rich -> cutoff -> rich with no frame between
    R.step(5);
    assert.equal(R.sys.running, true, 'a between-frames mixture slam never reaches the engine model');
    R.press('mixture'); R.step(3); // a REAL cutoff (held across frames) stops both
    assert.deepEqual(twinEng(R), ['off', 'off']);
    R.cp.dispose();
  }
  { // gear above Vle and flaps above Vfe on the Seminole: modelled behaviour, no damage state
    const R = airSetup('pa44', { ias: 160 });
    assert.equal(R.fl.s.gearPos, 0, 'starts gear-up at speed');
    R.press('gear');
    R.step(10);
    assert.ok(R.fl.s.gearPos > 0.999, 'gear extends fully even above Vle (no overspeed model, as designed)');
    assert.equal(R.fl.s.crashed, false);
    const r = R.apply(R.ctl('flaps').act(1)); // the words come back from the flight action,
    // not the control descriptor (same correction as the Archer block)
    assert.match(String(r), /Vfe \d+ kt を超えています/, 'Seminole flaps also warn above Vfe');
    R.step(5);
    assert.equal(R.fl.s.flapIdx, 1);
    R.press('gear'); R.step(10); // retract again at speed
    assert.ok(R.fl.s.gearPos < 0.05);
    R.cp.dispose();
  }
});

// the twin starter's fuel check once read the ARCHER's shared selector — a control the Seminole
// cockpit does not even present — so an engine whose own valve was open could be unstartable.
// These are the regression scenarios for that fix (systems catchTime per-engine feed rule).
test('audit regression: Seminole starts follow the per-engine feed rule', { timeout: 300000 }, () => {
  { // left tank EMPTY, both valves ON: the left engine must refuse — for the right reason
    const R = rig('pa44'); const s = R.fl.s;
    R.sys.setCold(); R.step(0.5); // (from cold, so the preamble presses below switch things ON)
    s.fuel[0] = 0; // scenario placement
    R.press('sw.bat'); R.press('sw.alt'); R.press('sw.avionics');
    if (R.ctl('sw.fuelPump')) R.press('sw.fuelPump');
    R.press('primer'); R.press('primer'); R.press('primer');
    if (Math.abs(R.sw.mixture - 1) > 0.01) R.press('mixture');
    R.press('mag', 1); R.press('mag', 1); R.press('mag', 1); // OFF -> BOTH
    R.press('mag', 1); // START (targets left)
    R.step(10); // the whole starter cycle runs out (STARTER_MAX is 8 s): no catch, key back at BOTH
    assert.deepEqual(twinEng(R), ['off', 'off'], 'no catch on an empty tank');
    // the textbook crossfeed start: left valve OFF + crossfeed open -> left runs on the right tank
    R.press('fuelSelL'); R.press('xfeed');
    assert.ok(crankTwin(R, 0), 'crossfeed start works');
    R.step(10);
    assert.equal(R.sys.twinLive[0].eng, 'run', 'and it keeps running on crossfeed');
    R.press('mixture'); R.step(3);
    assert.deepEqual(twinEng(R), ['off', 'off'], 'shutdown still works');
    R.cp.dispose();
  }
  { // right tank EMPTY: left starts normally; the right refuses until crossfed — then catches
    const R = rig('pa44'); const s = R.fl.s;
    R.sys.setCold(); R.step(0.5);
    s.fuel[1] = 0;
    assert.ok(startTwinEngine(R), 'left starts on its own full tank');
    assert.deepEqual(twinEng(R), ['run', 'off'], 'only the left is running');
    R.press('mag', 1); // START for the right
    R.step(10); // the whole starter cycle: it refuses on its empty tank
    assert.deepEqual(twinEng(R), ['run', 'off'], 'right refuses on its empty tank');
    R.press('fuelSelR'); R.press('xfeed');
    assert.ok(crankTwin(R, 1), 'right starts on crossfeed');
    R.press('mixture'); R.step(3);
    assert.deepEqual(twinEng(R), ['off', 'off']);
    R.cp.dispose();
  }
  { // in flight: left tank runs dry -> starve -> crossfeed drill -> restart in the air
    const R = airSetup('pa44'); const s = R.fl.s;
    s.fuel[0] = 0.05;
    // 0.05 gal at this burn (~7 gph) plus the fuel in the lines: flameout at ~30-35 s. In the
    // air the state then sits at 'stopping', not 'off' — the windmilling propeller never
    // spools down to the stopped threshold until the aeroplane lands (the model's own rule,
    // the same one the single engine follows). The claim that matters: it QUIT, from starvation.
    let starveT = 0;
    while (R.sys.twinLive[0].eng === 'run' && starveT < 70) { R.step(2); starveT += 2; }
    assert.notEqual(R.sys.twinLive[0].eng, 'run', 'left starves when its tank runs dry');
    assert.equal(s.eng[0].feedOk, false, 'the physics agrees: the left feed is dry');
    assert.equal(R.sys.twinLive[1].eng, 'run', 'right unaffected');
    R.press('fuelSelL'); R.press('xfeed'); // the drill
    assert.ok(crankTwin(R, 0), 'left restarts in flight on crossfeed');
    stableCruise(R, 30, ['FUEL L']); // the dry left tank's caution is correct, and stays
    R.cp.dispose();
  }
});

// the gear warning once lit through EVERY gear-up climb-out below 2000 ft (it keyed on gear
// position alone). The modelled rule is the real one: a landing configuration or low power.
test('audit regression: gear warning follows the modelled annunciator rule', { timeout: 300000 }, () => {
  // at 1,500 ft: the annunciator rule only applies below 2,000 ft AGL, so the scenario must
  // live there (the shared airSetup default of 3,000 ft could never warn at all)
  const R = airSetup('pa44', { alt: 1500 }); const s = R.fl.s;
  // placeInAir hands over a gear-UP aeroplane: extend first, so the retraction below is real
  R.press('gear');
  for (let i = 0; i < 12 && s.gearPos < 0.999; i++) R.step(1);
  assert.ok(s.gearPos > 0.999, 'gear down and locked before the retraction');
  R.thrTgt = 1; R.step(3);
  R.press('gear'); // retract at climb power
  let warned = false;
  for (let i = 0; i < 12; i++) { R.step(1); if (R.alerts().includes('GEAR')) warned = true; }
  assert.ok(s.gearPos < 0.05);
  assert.equal(warned, false, 'no gear warning retracting at climb power');
  R.step(5);
  assert.equal(R.alerts().includes('GEAR'), false, 'no warning clean and gear-up at power');
  R.thrTgt = 0.08; R.step(4); // idle power, gear up: the horn condition
  assert.equal(R.alerts().includes('GEAR'), true, 'warning at idle power with the gear up');
  R.thrTgt = 1; R.step(3);
  assert.equal(R.alerts().includes('GEAR'), false, 'power silences it');
  R.press('flaps'); R.press('flaps'); // landing flap at power: the other horn condition
  R.step(2);
  assert.equal(R.alerts().includes('GEAR'), true, 'warning with landing flap selected, gear up');
  R.press('flaps', -1); R.press('flaps', -1);
  R.press('gear'); // extend: transit at power may warn via the flap/power rule only — here neither applies
  for (let i = 0; i < 10; i++) R.step(1);
  assert.ok(s.gearPos > 0.999);
  assert.equal(R.alerts().includes('GEAR'), false, 'silent once locked down');
  R.cp.dispose();
});

// REGRESSION (defect found by this audit, fixed in systems.js): a starved SINGLE never left
// the 'run' state — its starvation branch shared the lesson-failure path (dead flag only), so
// the Hobbs kept counting on a stopped engine and the starter could never engage (the key
// springs back in 'run'): once a tank ran dry, the engine could never be restarted at all.
// The twin's per-engine branch already transitioned to 'stopping'; the single now does too.
test('audit regression: a starved Archer stops properly and restarts on the other tank', { timeout: 300000 }, () => {
  const R = airSetup('pa28', { selL: true }); const s = R.fl.s;
  s.fuel[0] = 0.02; // the selected tank is (nearly) dry
  let t = 0;
  while (R.sys.running && t < 60) { R.step(2); t += 2; }
  assert.equal(R.sys.running, false, 'the systems state leaves run when the tank runs dry');
  assert.equal(s.eng[0].run, false, 'and the physics agrees the engine is stopped');
  const h0 = R.sys.hobbs;
  R.step(10);
  assert.equal(R.sys.hobbs, h0, 'the Hobbs does not count on a stopped engine');
  setSel(R, 'R'); // the full tank — reselecting alone must not relight it
  R.step(6);
  assert.equal(R.sys.running, false, 'no relight from the selector alone');
  assert.equal(s.eng[0].run, false);
  assert.ok(crankStart(R), 'the starter restarts it on the full tank');
  assert.equal(s.eng[0].run, true);
  stableCruise(R, 30, ['FUEL L']); // the dry left tank's caution is correct, and stays lit
  R.cp.dispose();
});

// gear lever on the ground + mid-transit reversal: the squat/model rules hold, nothing sticks.
test('audit: gear lever abuse on the ground and mid-transit reversal', { timeout: 300000 }, () => {
  const R = rig('pa44'); const s = R.fl.s;
  const r = R.apply(R.ctl('gear').act()); // the refusal words come back from the flight action
  assert.match(String(r), /地上/, 'the lever explains the ground refusal');
  R.step(3);
  assert.equal(s.gearPos, 1, 'gear stays down on the ground');
  assert.equal(s.gearDown, true);
  R.sys.setRunning(s);
  P.placeInAir(s, 0, -20000, 2000, 360, 110, 0, 0);
  if (R.fl.controls.parkBrake) R.press('parkBrake');
  R.step(2);
  assert.equal(s.gearPos, 0, 'placed gear-up');
  R.press('gear'); // extend
  R.step(3);       // mid-transit (~0.55 in the fault model; healthy transit is linear)
  const mid = s.gearPos;
  assert.ok(mid > 0.2 && mid < 0.9, `caught mid-transit (${mid.toFixed(2)})`);
  R.press('gear'); // reverse it
  R.step(10);
  assert.ok(s.gearPos < 0.05, 'reversal completes back to up');
  assert.deepEqual(gearLampCounts(R), [0, 0]);
  R.press('gear'); // and down again for real
  R.step(10);
  assert.ok(s.gearPos > 0.999, 'extends fully after the reversal');
  assert.deepEqual(gearLampCounts(R), [3, 0], 'three greens after the reversal');
  stableCruise(R);
  R.cp.dispose();
});

// switch storm: everything toggled rapidly must end exactly as the final positions say.
test('audit abuse: rapid switch storm ends consistent, engine and electrics sane', { timeout: 300000 }, () => {
  const R = rig('pa28'); const s = R.fl.s, sw = R.sw;
  R.sys.setRunning(s); R.step(2);
  // baseline first: the storm's toggle counts must END where the assertions say, so every
  // stormed switch starts OFF (the spawn state has the masters ON — an odd toggle count from
  // there would end OFF, which is a counting artefact, not a latch-up)
  for (const [id, key] of [['sw.bat', 'bat'], ['sw.avionics', 'avionics'], ['sw.beacon', 'beacon'], ['sw.fuelPump', 'fuelPump']]) if (sw[key]) R.press(id);
  for (const id of ['cb.PFD', 'cb.MASTER']) if (sw[id.replace('.', '')]) R.press(id);
  for (let i = 0; i < 15; i++) { R.press('sw.bat'); R.press('sw.avionics'); R.press('sw.beacon'); R.press('sw.fuelPump'); }
  for (let i = 0; i < 4; i++) { R.press('cb.PFD'); R.press('cb.MASTER'); }
  for (let c = 0; c < 3; c++) { R.press('mag', 1, true); R.press('mag', -1, true); R.press('mag', -1, true); R.press('mag', 1, true); } // key spun BOTH->START->BOTH->L->BOTH (the real detent map: +1 from BOTH is START, -1 from START is BOTH — a +1,+1,-1,-1 spin would end at L)
  assert.equal(sw.bat, true); assert.equal(sw.avionics, true); assert.equal(sw.mag, 'BOTH');
  R.press('mixture'); R.press('mixture'); // rich -> cutoff -> rich inside one frame gap
  R.step(6);
  assert.equal(R.sys.running, true, 'engine survives the storm');
  assert.equal(s.mix, sw.mixture, 'physics mixture mirrors the lever');
  assert.equal(s.eng[0].mag, 'BOTH', 'mags live at BOTH (the physics carries the key position as e.mag)');
  assert.equal(R.sys.elec.pfdOn, true, 'avionics back');
  assert.deepEqual(R.alerts(), [], 'no latched warnings');
  R.press('mixture'); R.step(3);
  assert.equal(R.sys.running, false, 'and a deliberate shutdown still works');
  R.cp.dispose();
});

// parking brake set on final: land with it set — locked wheels must stop the aircraft fast,
// on the runway, without a crash or a stuck state.
test('audit abuse: landing with the parking brake set', { timeout: 300000 }, () => {
  const R = rig('pa28'); const s = R.fl.s;
  R.sys.setRunning(s);
  const [n, e] = P.rwyToNE(P.LAB_RWY, -1583, -17);
  P.placeInAir(s, n, e, 255, 354, 66, -2.6, 3); // the profiles' proven AP-disconnect state,
  // full flap — this test's subject is the brake, not approach geometry (two bespoke
  // placements before it produced unflyable gradients and runway-length floats)
  R.step(1);
  assert.equal(R.fl.controls.parkBrake, true, 'the brake is set (spawn state) for this scenario');
  R.thrTgt = 0.6;
  assert.ok(handFinal(R, { iasTgt: 66 }), 'touches down with the brake set');
  R.thrTgt = 0; // the power-on flare leaves the lever up; the pilot cuts it at touchdown
  const tdAlong = s.td ? s.td.along : R.where().along;
  R.step(20);
  const stopAlong = R.where().along;
  assert.equal(s.crashed, false, 'no crash landing on locked wheels');
  assert.ok(s.td && s.td.onRunway, 'touchdown was on the runway');
  assert.ok(Math.hypot(s.vel[0], s.vel[2]) < 0.3, 'the aircraft stops');
  assert.ok(stopAlong - tdAlong < 260, `locked wheels stop it fast (${(stopAlong - tdAlong).toFixed(0)} m rollout)`);
  R.press('parkBrake'); // release and prove it can taxi away
  R.thrTgt = 0.3; R.step(4);
  assert.ok(Math.hypot(s.vel[0], s.vel[2]) > 1, 'releasing the brake lets it move again');
  R.thrTgt = 0; R.step(2, () => R.keys.add('KeyB'));
  R.cp.dispose();
});

// pitot heat defeated by load shedding: with the alternator failed and the battery low, the
// shed bus drops the heater even though its switch is ON — ice must stay; recovery must melt it.
test('audit abuse: pitot heat shed with a low battery, then recovery melts the ice', { timeout: 300000 }, () => {
  const R = airSetup('pa28', { alt: 3000 }); const s = R.fl.s;
  s.pitotIce = 1; // the physics' pitot-ice state (s.pitotIce, as controls-functional sets it)
  R.press('sw.pitot');
  R.step(2);
  assert.equal(s.pitotHeat, true, 'heater works on a healthy bus');
  R.sys.setElecFault(true);
  R.sys.elec.batt = 0.4; // scenario placement: the battery is already low (functional-suite precedent)
  R.step(3);
  assert.equal(R.sw.pitot, true, 'the switch is still ON');
  assert.equal(s.pitotHeat, false, 'but the shed bus drops the heater');
  const iceAtShed = s.pitotIce; // (the healthy-bus seconds above already melted a tenth of it,
  // legitimately — the claim here is that it does not melt AT ALL while shed)
  R.step(20);
  assert.ok(s.pitotIce >= iceAtShed - 1e-9 && s.pitotIce > 0.5, `ice stays while the heater is shed (${iceAtShed.toFixed(2)} -> ${s.pitotIce.toFixed(2)})`);
  R.sys.setElecFault(false);
  R.step(3);
  assert.equal(s.pitotHeat, true, 'heater returns with the alternator');
  R.step(30);
  assert.ok(s.pitotIce < 0.1, `ice melts once heat is back (${s.pitotIce.toFixed(2)})`);
  stableCruise(R);
  R.cp.dispose();
});

// AP minimum-use height: an AP descent must disconnect itself at 200 ft AGL, not fly into the ground.
test('audit: autopilot disconnects at its 200 ft floor in a descent', { timeout: 300000 }, () => {
  const R = airSetup('pa28', { alt: 1600, ias: 95 }); const s = R.fl.s;
  setAltSel(R, 200); // BELOW the 200 ft floor: a target above it (700 ft is ~645 AGL here) is
  // simply captured and held — the floor can only be proven against a target underneath it
  R.press('pfd.hdg');
  engageCruiseAP(R);
  assert.equal(R.ap.on, true);
  R.thrTgt = 0.45;
  let discAGL = null;
  for (let i = 0; i < 240 && discAGL == null; i++) { R.step(1); if (!R.ap.on) discAGL = s.out.agl; }
  assert.ok(discAGL != null, 'the AP disconnected itself');
  assert.ok(discAGL >= 150 && discAGL <= 215, `disconnect at the floor (${discAGL.toFixed(0)} ft AGL)`);
  R.thrTgt = 0.7; // the pilot takes over and climbs away
  R.step(10, () => law(R, { hdgTgt: 360, iasTgt: 85, pBase: 3 }));
  assert.ok(s.out.agl > discAGL + 100, 'hand-flown recovery climbs');
  R.cp.dispose();
});

// ------------------------------------------------------------------ alternator failure endurance
test('audit endurance: alternator failure — warnings, load shed, battery death, full recovery', { timeout: 600000 }, () => {
  const R = airSetup('pa28', { alt: 3000 }); const s = R.fl.s;
  for (const id of ['sw.avionics', 'sw.beacon', 'sw.nav', 'sw.strobe', 'sw.fuelPump']) if (!R.sw[id.slice(3)]) R.press(id); // (state keys drop the sw. prefix)
  setAltSel(R, 3000);
  R.press('pfd.hdg');
  engageCruiseAP(R);
  assert.equal(R.ap.on, true);
  for (let i = 0; i < 16; i++) R.press('throttle', 1); // ~0.62 via the cockpit lever
  R.step(5);
  R.sys.setElecFault(true); // the alternator fails in cruise
  R.step(2);
  assert.ok(R.alerts().includes('ALTERNATOR'), 'the failure is annunciated');
  assert.equal(R.sys.running, true, 'the engine does not care');
  let shedAt = null, lowVoltsSeen = false, flatAt = null;
  for (let min = 0; min < 110 && flatAt == null; min++) {
    R.stepFast(60);
    if (R.sys.alerts.some(a => a.id === 'LOW VOLTS')) lowVoltsSeen = true;
    if (shedAt == null && R.sys.elec.shed) { shedAt = min; assert.equal(R.sys.elec.mfdOn, false, 'shed drops the MFD first'); assert.equal(R.sys.elec.pfdOn, true, 'PFD still alive at the shed point'); }
    if (!R.sys.elec.pfdOn) flatAt = min;
    assert.equal(R.sys.running, true, 'engine runs through the whole electrical failure');
  }
  assert.ok(shedAt != null, 'the bus sheds load as the battery fades');
  assert.ok(lowVoltsSeen, 'LOW VOLTS warned on the way down');
  assert.ok(flatAt != null, `the battery eventually dies (minute ${flatAt})`);
  assert.equal(R.sys.elec.standbyOn, true, 'the standby instrument is STILL alive on its own battery');
  R.sys.setElecFault(false); // the alternator comes back (a resettable failure in this scenario)
  R.step(5);
  assert.ok(R.sys.elec.gen > 20, 'charging restored');
  assert.equal(R.sys.elec.pfdOn, true, 'PFD back');
  assert.equal(R.sys.elec.mfdOn, true, 'MFD back (shed cleared)');
  assert.ok(!R.alerts().includes('ALTERNATOR'), 'failure warning cleared');
  R.cp.dispose();
});

// ------------------------------------------------------------------ 60-minute soaks
function soak(type, { thrLever, leanPresses, iasBand }) {
  const R = rig(type); const s = R.fl.s;
  R.sys.setRunning(s);
  P.placeInAir(s, 0, -20000, 5100, 360, 105, 0, 0);
  if (R.fl.controls.parkBrake) R.press('parkBrake');
  R.step(2);
  setAltSel(R, Math.round(R.fl.L.last.alt / 100) * 100);
  R.press('pfd.hdg');
  engageCruiseAP(R);
  assert.equal(R.ap.on, true, 'AP engaged for the soak');
  // placeInAir hands over a TRIMMED lever (~0.79 for the placed speed), not idle: pressing UP
  // from there pins it at full throttle. Walk it to the cruise setting with the cockpit lever
  // itself, the way a pilot sets cruise power.
  let tg = 0;
  while (Math.abs(s.thr - thrLever) > 0.03 && tg++ < 24) R.press('throttle', Math.sign(thrLever - s.thr));
  assert.ok(Math.abs(s.thr - thrLever) <= 0.03, `cruise lever set (${s.thr.toFixed(2)})`);
  for (let i = 0; i < leanPresses; i++) R.press('mixture', -1, true);
  R.step(30); // settle
  const fuel0 = s.fuel[0] + s.fuel[1], hobbs0 = R.sys.hobbs;
  const flapDeg0 = s.flapDeg, gearPos0 = s.gearPos, thr0 = s.thr;
  let ffInt = 0, trimPrev = null, trim10 = null, oilTPrev = null, egtPrev = null;
  const hook = () => { for (const e of s.eng) ffInt += e.ff * 0.1 / 3600; };
  for (let min = 1; min <= 60; min++) {
    R.stepFast(60, hook);
    const el = R.sys.elec, out = s.out;
    assert.ok(el.volts >= 13.5 && el.volts <= 14.6, `min ${min}: bus volts stable (${el.volts.toFixed(2)})`);
    assert.ok(el.amps >= -0.5, `min ${min}: battery not discharging (${el.amps.toFixed(1)})`);
    assert.ok(el.batt >= 0.999, `min ${min}: battery stays full`);
    assert.deepEqual(R.alerts(), [], `min ${min}: no warning appears or flickers`);
    assert.equal(s.flapDeg, flapDeg0, `min ${min}: flap never moves without an input`);
    assert.equal(s.gearPos, gearPos0, `min ${min}: gear never moves without an input`);
    assert.equal(s.thr, thr0, `min ${min}: no throttle servo on the pistons — the lever stays`);
    assert.equal(R.ap.on, true, `min ${min}: AP still engaged`);
    assert.ok(out.ias > iasBand[0] && out.ias < iasBand[1], `min ${min}: cruise speed in band (${out.ias.toFixed(0)})`);
    if (min >= 10) {
      // the AP's trim does not sit frozen — measured over this hour it HUNTS slowly around
      // its settled value (±0.02, sign-changing, no trend with the fuel burn): that is the
      // closed loop flying, not an uncommanded change. The invariant is the shape of it:
      // never a jump, never a runaway out of the settled band.
      if (trimPrev != null) assert.ok(Math.abs(s.trim - trimPrev) <= 0.03, `min ${min}: no trim jump (Δ${Math.abs(s.trim - trimPrev).toFixed(4)} — the band check below is the runaway guard; this only rules out steps)`);
      if (trim10 == null) trim10 = s.trim;
      assert.ok(Math.abs(s.trim - trim10) <= 0.05, `min ${min}: trim stays in its settled band (no runaway)`);
      if (oilTPrev != null) assert.ok(Math.abs(R.sys.oilT - oilTPrev) < 8, `min ${min}: oil temperature stable`);
      if (egtPrev != null) assert.ok(Math.abs(s.eng[0].egt - egtPrev) < 30, `min ${min}: EGT stable`);
      assert.ok(R.sys.oilT > 150 && R.sys.oilT < 230, `min ${min}: oil temperature in band`);
    }
    trimPrev = s.trim; oilTPrev = R.sys.oilT; egtPrev = s.eng[0].egt;
  }
  const burned = fuel0 - (s.fuel[0] + s.fuel[1]);
  assert.ok(burned > 3, `an hour of cruise burns fuel (${burned.toFixed(2)} gal)`);
  assert.ok(Math.abs(burned - ffInt) <= Math.max(0.06, 0.03 * ffInt), `tank gauges match the integrated fuel flow (${burned.toFixed(3)} vs ${ffInt.toFixed(3)} gal)`);
  assert.ok(Math.abs((R.sys.hobbs - hobbs0) - 1) < 0.03, 'hobbs advances exactly one hour');
  R.cp.dispose();
}
test('audit soak: Archer 60-minute cruise invariants', { timeout: 900000 }, () => {
  soak('pa28', { thrLever: 0.70, leanPresses: 1, iasBand: [78, 118] }); // 0.70, a normal
  // cruise setting: at the soak's 5,100 ft, 0.64 only made 76 kt — under the band's floor
});
test('audit soak: Seminole 60-minute cruise invariants', { timeout: 900000 }, () => {
  soak('pa44', { thrLever: 0.58, leanPresses: 1, iasBand: [92, 140] });
});
