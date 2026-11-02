// CADET — controls, functionally (node --test): every control in the Archer's and the Seminole's cockpit,
// operated through act() exactly as fly-mode's applyAct applies the intent, with the real systems
// (aircraft/systems.js) and FLIGHT LAB's physics running — and the SYSTEM STATE asserted afterwards:
// the magneto starts and stops the engine and drops on each side at the run-up, the mixture cuts it off,
// the selector starves it, the pump holds the pressure, the pitot heat melts the ice, each light draws
// its current, each circuit breaker kills its own circuit, the gear transits and lights its lamps.
// (cockpit.test.mjs proves the controls can be found and picked and say the right intent; this proves
// the intent DOES the thing.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCockpit } from '../src/aircraft/cockpit.js';
import { createSystems } from '../src/aircraft/systems.js';
import { createFlight } from '../src/flight/flight.js';
import { createAutopilot } from '../src/flight/autopilot.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'acmesh.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL, P = FL.physics, AV = FL.avionics, SC = FL.school;
const AC = id => P.AIRCRAFT.find(a => a.id === id);
const NOKEYS = { has: () => false };
const AP_WHATS = new Set(['AP', 'AP_HDG', 'AP_ALT', 'AP_NAV', 'AP_APR', 'AP_VS', 'AP_LVL', 'FD']);

function fakeCanvas(w, h) {
  const grad = { addColorStop() {} };
  const g = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern' ? () => grad
      : k === 'measureText' ? s => ({ width: String(s).length * 6 }) : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { width: w, height: h, getContext: () => g };
}
function recCanvas(w, h) {
  const texts = [];
  const grad = { addColorStop() {} };
  const g = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern' ? () => grad
      : k === 'measureText' ? s => ({ width: String(s).length * 6 }) : (...a) => { if (k === 'fillText') texts.push(String(a[0])); }),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { width: w, height: h, getContext: () => g, texts };
}

// a rig: the cockpit, a flight on the apron, the systems on the cockpit's own switches — and apply(),
// fly-mode's applyAct with the toasts and sounds left out
function rig(type = 'pa28', makeCanvas = fakeCanvas) {
  const cp = buildCockpit(FL, AC(type), { makeCanvas, twin: AC('pa44') });
  cp.setType(type);
  const fl = createFlight(FL, { store: null });
  const [n, e] = P.rwyToNE(P.LAB_RWY, 715, 208);
  fl.startOnGround(n, e, 264, type, { wind: { rel: 10, kt: 5, gust: 0.5 } });
  const sys = createSystems(cp.switches);
  const ap = createAutopilot(FL);
  const R = { cp, fl, sys, ap, av: fl.av, sw: cp.switches };
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
  R.events = [];
  R.step = (sec) => {
    for (let t = 0; t < sec - 1e-9; t += 1 / 60) {
      fl.frame(1 / 60, NOKEYS);
      R.events.push(...sys.update(1 / 60, fl.s));
      cp.update(1 / 60, { s: fl.s, L: fl.L, av: fl.av, eng: { rpm: sys.rpm, run: sys.running, twin: sys.twinLive, oil: sys.oil, oilT: sys.oilT, elec: sys.elec, hobbs: sys.hobbs },
        parkBrake: fl.controls.parkBrake, elecPfd: sys.elec.pfdOn, elecMfd: sys.elec.mfdOn, elecStandby: sys.elec.standbyOn, night: 0 });
    }
  };
  R.ctl = id => cp.controls.find(c => c.id === id);
  R.press = (id, dir = 1, wheel = false) => { const c = R.ctl(id); assert.ok(c, `control ${id} exists`); const r = c.act(dir, wheel); R.apply(r); return r; };
  R.step(0.2);
  return R;
}
// start the Archer's engine entirely through the cockpit's controls (from COLD), as the checklist has it
function startViaControls(R) {
  const { sw } = R;
  R.press('fuelSel', -1, true); R.press('fuelSel', -1, true);           // OFF → R → L
  assert.equal(sw.fuelSel, 'L');
  R.press('mixture');                                                  // cut → full rich
  assert.equal(sw.mixture, 1);
  R.press('sw.bat'); R.press('sw.alt'); R.press('sw.fuelPump'); R.press('sw.beacon');
  R.press('throttle');                                                 // cracked open
  R.press('primer'); R.press('primer'); R.press('primer');             // 3 primes in all
  R.press('mag'); R.press('mag'); R.press('mag'); R.press('mag');      // OFF → R → L → BOTH → START
  R.step(5);
  assert.ok(R.sys.running, 'the engine caught');
  assert.equal(sw.mag, 'BOTH', 'the key sprang back from START');
}

// ---------------------------------------------------------------- the sweep: every control, every way
// of pressing it — the intent it returns must LAND (a switch intent leaves the switch where it says,
// a select leaves the value, a prime is counted, a flight / av intent is accepted by its owner)
test('functional: every Archer control\'s intent lands in the state it names', () => {
  const R = rig('pa28');
  R.sys.setRunning(R.fl.s); R.step(1);
  let landed = 0;
  for (const c of R.cp.controls) {
    for (const [dir, wheel] of [[1, false], [1, true], [-1, true]]) {
      const before = c.id === 'primer' ? null : null;
      const r = c.act(dir, wheel);
      if (!r) continue;
      if (r.type === 'switch') { R.apply(r); assert.equal(R.sw[r.id], r.on, `${c.id}: switch ${r.id} → ${r.on}`); landed++; }
      else if (r.type === 'select') { R.apply(r); assert.equal(R.sw[r.id], r.value, `${c.id}: select ${r.id} → ${r.value}`); landed++; }
      else if (r.type === 'prime') { const n = R.apply(r); assert.ok(Number.isInteger(n) && n >= 1, `${c.id}: the prime is counted (${n})`); landed++; }
      else if (r.type === 'flight') { assert.equal(typeof R.apply(r), 'string', `${c.id}: the flight bridge takes ${r.name}`); landed++; }
      else if (r.type === 'av') { assert.equal(typeof R.apply(r), 'string', `${c.id}: the avionics / AP take ${r.what}`); landed++; }
      else assert.ok(['info', 'view', 'exit', 'gearEmerg'].includes(r.type), `${c.id}: ${r.type}`);
      R.step(0.05);
    }
  }
  assert.ok(landed >= 120, `${landed} intents landed`);
  R.cp.dispose();
});

test('functional: every Seminole control\'s intent lands in the state it names', () => {
  const R = rig('pa44');
  R.sys.setRunning(R.fl.s); R.step(1);
  let landed = 0;
  for (const c of R.cp.controls) {
    for (const [dir, wheel] of [[1, false], [1, true], [-1, true]]) {
      const r = c.act(dir, wheel);
      if (!r) continue;
      if (r.type === 'switch') { R.apply(r); assert.equal(R.sw[r.id], r.on, `${c.id}: switch ${r.id} → ${r.on}`); landed++; }
      else if (r.type === 'select') { R.apply(r); assert.equal(R.sw[r.id], r.value, `${c.id}: select ${r.id} → ${r.value}`); landed++; }
      else if (r.type === 'prime') { const n = R.apply(r); assert.ok(Number.isInteger(n) && n >= 1, `${c.id}: prime counted`); landed++; }
      else if (r.type === 'flight') { assert.equal(typeof R.apply(r), 'string', `${c.id}: flight ${r.name}`); landed++; }
      else if (r.type === 'av') { assert.equal(typeof R.apply(r), 'string', `${c.id}: av ${r.what}`); landed++; }
      else assert.ok(['info', 'view', 'exit', 'gearEmerg'].includes(r.type), `${c.id}: ${r.type}`);
      R.step(0.05);
    }
  }
  assert.ok(landed >= 120, `${landed} intents landed`);
  R.cp.dispose();
});

// ---------------------------------------------------------------- the engine, through its own controls
test('functional: the full start from the cockpit controls — then the run-up drops on each magneto', () => {
  const R = rig('pa28');
  R.sys.setCold(R.fl.s); R.step(0.5);
  assert.equal(R.sys.running, false);
  startViaControls(R);
  // to 2,000 rpm on the gauge, with the throttle control alone — and let it settle before reading
  for (let i = 0; i < 60 && R.sys.rpm < 1950; i++) { R.press('throttle'); R.step(0.15); }
  for (let i = 0; i < 20; i++) { const r0 = R.sys.rpm; R.step(1); if (Math.abs(R.sys.rpm - r0) < 8) break; }
  assert.ok(R.sys.rpm > 1900 && R.sys.rpm < 2350, `run-up at ${R.sys.rpm}`);
  const both = R.sys.rpm;
  R.press('mag', -1, true);                                            // BOTH → L
  assert.equal(R.sw.mag, 'L'); R.step(1.5);
  const dropL = both - R.sys.rpm;
  assert.ok(dropL >= 40 && dropL <= 175, `the left magneto's drop ${dropL}`);
  R.press('mag');                                                      // L → BOTH
  R.step(1.5);
  R.press('mag', -1, true); R.press('mag', -1, true);                  // BOTH → L → R
  assert.equal(R.sw.mag, 'R'); R.step(1.5);
  const dropR = both - R.sys.rpm;
  assert.ok(dropR >= 40 && dropR <= 175, `the right magneto's drop ${dropR}`);
  assert.ok(Math.abs(dropL - dropR) <= 50, `the drops agree (${dropL} / ${dropR})`);
  R.press('mag'); R.press('mag');                                      // R → L → BOTH
  R.step(0.5);
  R.press('carbHeat'); R.step(1.5);
  const dropCH = both - R.sys.rpm;
  assert.ok(dropCH >= 30 && dropCH <= 140, `the carburettor heat's drop ${dropCH}`);
  R.press('carbHeat');
  R.press('mag', -1, true); R.press('mag', -1, true); R.press('mag', -1, true);   // → OFF
  assert.equal(R.sw.mag, 'OFF');
  R.step(1.5);
  assert.equal(R.sys.running, false, 'magnetos OFF stop the engine');
  R.cp.dispose();
});

test('functional: the mixture — leaning reaches the physics, cut-off stops the engine', () => {
  const R = rig('pa28');
  R.sys.setCold(R.fl.s); startViaControls(R);
  R.press('mixture', -1, true); R.press('mixture', -1, true); R.press('mixture', -1, true); R.press('mixture', -1, true);   // 1.0 → 0.6
  assert.equal(R.sw.mixture, 0.6);
  R.step(0.5);
  assert.equal(R.fl.s.eng[0].mix, 0.6, 'the physics\' mixture follows the lever');
  assert.ok(R.sys.running, 'leaned, still running');
  R.press('mixture');                                                  // → full rich
  assert.equal(R.sw.mixture, 1);
  R.press('mixture');                                                  // → idle cut-off
  assert.equal(R.sw.mixture, 0);
  R.step(1);
  assert.equal(R.sys.running, false, 'the cut-off stops it');
  R.cp.dispose();
});

test('functional: the fuel selector — the burn follows it, OFF starves the engine', () => {
  const R = rig('pa28');
  R.sys.setCold(R.fl.s); startViaControls(R);
  for (let i = 0; i < 8; i++) R.press('throttle');
  R.step(2);
  const L0 = R.fl.s.fuel[0], R0 = R.fl.s.fuel[1];
  R.press('fuelSel');                                                  // L → R
  assert.equal(R.sw.fuelSel, 'R');
  R.step(20);
  assert.ok(R.fl.s.fuel[1] < R0 - 0.02, `the right tank burns (${R0} → ${R.fl.s.fuel[1]})`);
  assert.ok(Math.abs(R.fl.s.fuel[0] - L0) < 2e-4, `the left tank untouched (a frame of line fuel at the switch-over: ${R.fl.s.fuel[0] - L0})`);
  assert.equal(R.fl.s.fuelSel, 'R', 'the physics\' selector follows');
  R.press('fuelSel', 1, true);                                         // R → OFF
  assert.equal(R.sw.fuelSel, 'OFF');
  R.step(9);
  assert.equal(R.sys.running, false, 'the lines run dry and it stops');
  R.cp.dispose();
});

test('functional: the selected tank runs dry — the systems notice the starvation, not just the physics', () => {
  const R = rig('pa28');
  R.sys.setRunning(R.fl.s); R.step(1);
  assert.ok(R.sys.running);
  R.fl.s.fuel = [0, 24];                               // the left tank dry, the right full — the selector is on the left
  R.step(9);                                           // the fuel in the lines carries it a few seconds
  assert.equal(R.fl.s.eng[0].on, false, 'the physics starves');
  // the systems notice it the way they notice a lesson's failure: the stop is on the record with its
  // reason, and the state is marked dead (the state machine itself stays where a restart can reach it)
  assert.ok(R.events.some(e => e.type === 'stop' && /燃料切れ/.test(e.why || '')), `the stop is told (${JSON.stringify(R.events)})`);
  assert.equal(R.sys.st.dead, true, 'and marked stopped-by-starvation');
  R.cp.dispose();
});

test('functional: the parking brake holds against power, and lets go', () => {
  const R = rig('pa28');
  R.sys.setCold(R.fl.s); startViaControls(R);
  assert.equal(R.fl.controls.parkBrake, true, 'set from the start');
  const p0 = [...R.fl.s.pos];
  for (let i = 0; i < 10; i++) R.press('throttle');
  R.step(3);
  assert.ok(Math.hypot(R.fl.s.pos[0] - p0[0], R.fl.s.pos[2] - p0[2]) < 0.3, 'held');
  R.press('parkBrake');
  assert.equal(R.fl.controls.parkBrake, false);
  R.step(3);
  assert.ok(Math.hypot(R.fl.s.pos[0] - p0[0], R.fl.s.pos[2] - p0[2]) > 1, 'it rolls');
  R.cp.dispose();
});

test('functional: flaps, trim and throttle through the flight bridge', () => {
  const R = rig('pa28');
  R.sys.setRunning(R.fl.s); R.step(0.5);
  R.press('flaps'); R.press('flaps'); R.press('flaps');
  assert.equal(R.fl.s.flapIdx, 3);
  R.step(6);                                           // the surfaces travel at their own rate (8°/s)
  // the model's travel is 0/10/20/30 degrees of surface for the detents the panel names 10/25/40
  // (physics' FLAP_DEG comment: the travel is the model's, the labels are the aircraft's)
  assert.ok(Math.abs(R.fl.s.flapDeg - 30) < 3, `full flap travel ${R.fl.s.flapDeg}°`);
  assert.equal(R.press('flaps').type, 'info', 'no further detent: it says so');
  R.press('flaps', -1);
  assert.equal(R.fl.s.flapIdx, 2);
  const tr0 = R.fl.s.trim;
  R.press('trim'); R.step(0.3);
  assert.ok(R.fl.s.trim < tr0 - 0.005, `the wheel forward trims nose-down (${tr0} → ${R.fl.s.trim})`);
  const tr1 = R.fl.s.trim;
  R.press('trim', -1); R.step(0.3);
  assert.ok(R.fl.s.trim > tr1 + 0.005, 'and back');
  const th0 = R.fl.s.thr;
  R.press('throttle'); R.press('throttle');
  assert.ok(R.fl.s.thr > th0 + 0.05, `the lever opens the throttle (${th0} → ${R.fl.s.thr})`);
  R.press('throttle', -1); R.press('throttle', -1);   // (a notch is 5 %: two up, two back down)
  assert.ok(Math.abs(R.fl.s.thr - th0) < 1e-9, 'and closes it again, notch for notch');
  R.cp.dispose();
});

// ---------------------------------------------------------------- the electrics, through the rockers
test('functional: each electrical switch draws its load; the buses die in the right order', () => {
  const R = rig('pa28'), { sw, sys } = R;
  // battery only, the avionics on, everything else off: the bare bus (its 9 A is the base)
  Object.assign(sw, { bat: true, alt: false, avionics: true, fuelPump: false, beacon: false, nav: false, strobe: false, landing: false, taxi: false, pitot: false });
  R.step(1);
  const base = sys.elec.load;
  assert.ok(sys.elec.pfdOn, 'the essential bus lives on the battery');
  const draws = [['sw.beacon', 2], ['sw.nav', 2.5], ['sw.strobe', 1.5], ['sw.landing', 9], ['sw.taxi', 6], ['sw.pitot', 4], ['sw.fuelPump', 2.5]];
  for (const [id, amps] of draws) {
    R.press(id); R.step(0.5);
    assert.ok(Math.abs(sys.elec.load - base - amps) < 0.6, `${id}: +${amps} A (load ${sys.elec.load})`);
    R.press(id); R.step(0.5);
    assert.ok(Math.abs(sys.elec.load - base) < 0.6, `${id} off again (load ${sys.elec.load})`);
  }
  // the avionics switch gates both screens (the cockpit blanks them); the battery switch gates everything
  const drawn = R.cp.stats.pfd;
  R.press('sw.avionics'); R.step(1);
  assert.ok(R.cp.stats.blank > 0 && R.cp.stats.pfd === drawn, 'avionics off: the screens go dark');
  R.press('sw.avionics'); R.step(1);
  assert.ok(R.cp.stats.pfd > drawn, 'avionics back on: they draw again');
  R.press('sw.bat'); R.step(1);
  assert.equal(sys.elec.pfdOn, false, 'no battery, no alternator: the bus is dead');
  assert.ok(sys.elec.volts < 2, `volts ${sys.elec.volts}`);
  assert.equal(sys.elec.standbyOn, true, 'the standby instruments live on their own battery');
  R.cp.dispose();
});

test('functional: the alternator switch — charge, and the alert when it goes', () => {
  const R = rig('pa28');
  R.sys.setCold(R.fl.s); startViaControls(R);
  for (let i = 0; i < 20 && R.sys.rpm < 1400; i++) { R.press('throttle'); R.step(0.15); }
  R.step(1);
  assert.ok(R.sys.elec.gen > 20 && R.sys.elec.amps > 0, `charging (${R.sys.elec.gen} A gen, ${R.sys.elec.amps} A)`);
  R.press('sw.alt'); R.step(1.5);
  assert.equal(R.sys.elec.gen, 0, 'the alternator is off the line');
  assert.ok(R.sys.elec.amps < 0, 'the battery carries the load — the ammeter shows the discharge');
  // no FAIL annunciation for a switch the pilot turned off himself (that is the failure flag's, and the
  // lesson's): what the aircraft does show is the falling voltage, and LOW VOLTS once it sags under 12
  assert.ok(!R.sys.alerts.some(a => a.id === 'ALTERNATOR'), 'no FAIL light for his own switch');
  R.sys.elec.batt = 0.4; R.step(0.5);
  assert.ok(R.sys.alerts.some(a => a.id === 'LOW VOLTS'), 'LOW VOLTS as the battery sags');
  R.press('sw.alt'); R.step(1);
  assert.ok(R.sys.elec.gen > 20, 'and back');
  R.cp.dispose();
});

test('functional: the fuel pump switch — the pressure chain when the engine pump fails', () => {
  const R = rig('pa28');
  R.sys.setCold(R.fl.s); startViaControls(R);
  for (let i = 0; i < 30 && R.sys.rpm < 1900; i++) { R.press('throttle'); R.step(0.15); }
  R.fl.s.eng[0].pumpFail = true;                                       // the engine-driven pump lets go
  R.step(2);
  assert.ok(R.fl.s.boostPump, 'the boost pump is carrying it');
  assert.ok(R.fl.s.out.fuelPress > 0.6, `pressure held (${R.fl.s.out.fuelPress})`);
  R.press('sw.fuelPump');
  assert.equal(R.fl.s.boostPump, true, 'still on until the systems have run');
  let alerted = false;
  for (let i = 0; i < 12; i++) { R.step(0.25); if (R.sys.alerts.some(a => a.id === 'FUEL PRESS')) alerted = true; }
  assert.equal(R.fl.s.boostPump, false);
  assert.ok(R.fl.s.out.fuelPress < 0.5, `the pressure falls (${R.fl.s.out.fuelPress})`);
  assert.ok(alerted, 'the FUEL PRESS alert came up while it starved');
  R.press('sw.fuelPump'); R.step(2);
  assert.ok(R.fl.s.out.fuelPress > 0.6, 'the boost pump brings it back');
  R.cp.dispose();
});

test('functional: the pitot heat switch — the state reaches the probe, and the ice melts', () => {
  const R = rig('pa28');
  R.sys.setRunning(R.fl.s);
  P.placeInAir(R.fl.s, 0, -20000, 3000, 360, 120, 0, 0);
  R.fl.s.thr = 0.55;
  R.fl.s.pitotIce = 1;
  R.step(1);
  assert.equal(R.fl.s.pitotHeat, false, 'heat off');
  assert.equal(R.fl.s.out.pitotBlocked, true, 'the airspeed is frozen by the ice');
  R.press('sw.pitot');
  R.step(1);
  assert.equal(R.fl.s.pitotHeat, true, 'the switch reaches the probe');
  R.step(25);
  assert.ok(R.fl.s.pitotIce < 0.05, `the ice melts (${R.fl.s.pitotIce})`);
  assert.equal(R.fl.s.out.pitotBlocked, false, 'the airspeed lives again');
  R.cp.dispose();
});

test('functional: the screens follow the bus; the standby dials keep their own power', () => {
  const R = rig('pa28');
  R.sys.setRunning(R.fl.s); R.step(1);
  const pfdDraws = R.cp.stats.pfd, stbyDraws = R.cp.stats.standby;
  assert.ok(pfdDraws > 0 && stbyDraws > 0, 'both drawing');
  R.press('sw.bat'); R.press('sw.alt'); R.step(1);                     // the whole bus dies (engine off)
  assert.ok(R.cp.stats.blank > 0, 'the PFD is blanked');
  const stby2 = R.cp.stats.standby;
  R.step(1);
  assert.ok(R.cp.stats.standby > stby2, 'the standby dials still draw on their own battery');
  R.press('sw.bat'); R.step(1);
  assert.ok(R.cp.stats.pfd > pfdDraws, 'power back: the PFD draws again');
  R.cp.dispose();
});

// ---------------------------------------------------------------- the circuit breakers, one by one
// name → the switch field the breaker drives (switches['cb' + KEY]); every breaker is its own control,
// and tripping it kills its own circuit — not the neighbour's
const BREAKERS = [['PFD', 'PFD'], ['MFD', 'MFD'], ['AHRS', 'AHRS'], ['ADC', 'ADC'], ['GPS/NAV1', 'GPS1'], ['GPS/NAV2', 'GPS2'], ['AUDIO', 'AUDIO'],
  ['COM1', 'COM1'], ['COM2', 'COM2'], ['XPDR', 'XPDR'], ['ENG', 'ENG'], ['FUEL PUMP', 'FUELPUMP'], ['PITOT', 'PITOT'], ['TURN', 'TURN'],
  ['NAV LT', 'NAVLT'], ['STROBE', 'STROBE'], ['LDG LT', 'LDGLT'], ['TAXI LT', 'TAXILT'], ['BEACON', 'BEACON'], ['ALT FLD', 'ALTFLD'], ['MASTER', 'MASTER']];
test('functional: the breakers — each is its own control, and tripping it lands', () => {
  const R = rig('pa28');
  R.sys.setRunning(R.fl.s); R.step(0.5);
  for (const [name, key] of BREAKERS) {
    const id = 'cb.' + key;
    const c = R.ctl(id);
    assert.ok(c, `breaker ${name}: control ${id}`);
    const r = c.act(1, false);
    assert.deepEqual(r, { type: 'switch', id: 'cb' + key, on: true }, `${name}: trips out`);
    R.apply(r); assert.equal(R.sw['cb' + key], true);
    const r2 = c.act(1, false);
    assert.deepEqual(r2, { type: 'switch', id: 'cb' + key, on: false }, `${name}: pushes back in`);
    R.apply(r2); assert.equal(R.sw['cb' + key], false);
  }
  // the panel's own placard control remains, and now reports the panel's state honestly
  const agg = R.ctl('cb');
  assert.ok(agg, 'the CIRCUIT BREAKERS placard control');
  R.cp.dispose();
});

test('functional: a tripped breaker kills its circuit — screens, bus, alternator, pumps, heat, lights', () => {
  const R = rig('pa28'), { sw, sys } = R;
  R.sys.setRunning(R.fl.s); R.step(1);
  assert.ok(sys.elec.pfdOn && sys.elec.mfdOn);
  R.press('cb.PFD'); R.step(0.5);
  assert.equal(sys.elec.pfdOn, false, 'the PFD breaker kills the PFD only');
  assert.equal(sys.elec.mfdOn, true, 'the MFD lives');
  R.press('cb.PFD'); R.press('cb.MFD'); R.step(0.5);
  assert.equal(sys.elec.mfdOn, false, 'the MFD breaker kills the MFD');
  assert.equal(sys.elec.pfdOn, true);
  R.press('cb.MFD');
  R.press('cb.MASTER'); R.step(1);
  assert.equal(sys.elec.pfdOn, false, 'the MASTER breaker kills the bus');
  assert.ok(sys.elec.volts < 2);
  R.press('cb.MASTER'); R.step(0.5);
  assert.ok(sys.elec.pfdOn, 'and back in, the bus lives');
  // the alternator's field breaker: the generator drops off the line with the engine running
  for (let i = 0; i < 20 && sys.rpm < 1400; i++) { R.press('throttle'); R.step(0.15); }
  R.step(1);
  assert.ok(sys.elec.gen > 20, `charging (${sys.elec.gen})`);
  R.press('cb.ALTFLD'); R.step(1);
  assert.equal(sys.elec.gen, 0, 'ALT FLD out: no generation');
  assert.ok(sys.elec.amps < 0, 'the battery discharges — the cue the real panel gives');
  R.press('cb.ALTFLD'); R.step(0.5);
  assert.ok(sys.elec.gen > 20, 'back in: charging again');
  // the boost pump's breaker: the pump stops even with its switch on
  assert.ok(R.fl.s.boostPump);
  R.press('cb.FUELPUMP'); R.step(0.5);
  assert.equal(R.fl.s.boostPump, false, 'FUEL PUMP breaker out: no boost pump');
  R.press('cb.FUELPUMP'); R.step(0.5);
  assert.ok(R.fl.s.boostPump, 'and back');
  // the pitot heat's breaker: no heat even with the switch on
  R.press('sw.pitot'); R.step(0.5);
  assert.ok(R.fl.s.pitotHeat);
  R.press('cb.PITOT'); R.step(0.5);
  assert.equal(R.fl.s.pitotHeat, false, 'PITOT breaker out: no heat');
  R.press('cb.PITOT'); R.step(0.5);
  assert.ok(R.fl.s.pitotHeat, 'and back in: the heat returns');
  // a light's breaker: its load leaves the bus (the beacon, 2 A)
  const withBeacon = sys.elec.load;
  R.press('cb.BEACON'); R.step(0.5);
  assert.ok(Math.abs(sys.elec.load - (withBeacon - 2)) < 0.6, `the beacon's load is gone (${withBeacon} → ${sys.elec.load})`);
  R.press('cb.BEACON');
  R.cp.dispose();
});

test('functional: the AHRS and GPS breakers fail the PFD and the map, as the lessons\' own failures do', () => {
  const made = [];
  const R = rig('pa28', (w, h) => { const c = recCanvas(w, h); made.push(c); return c; });
  R.sys.setRunning(R.fl.s); R.step(1.5);
  const scr = made.filter(c => c.width === 2048);    // the two big screens, PFD first
  const pfdCv = scr[0], mfdCv = scr[1];
  assert.ok(pfdCv && mfdCv && pfdCv.texts.length > 10, 'the PFD is drawing');
  assert.ok(!pfdCv.texts.some(t => t.includes('AHRS FAIL')), 'no failure yet');
  R.press('cb.AHRS'); R.step(1);
  assert.equal(R.sys.elec.cbAhrs, true);
  assert.ok(pfdCv.texts.some(t => t.includes('AHRS FAIL')), 'the PFD shows the AHRS failure');
  R.press('cb.AHRS'); R.step(1);
  assert.equal(R.sys.elec.cbAhrs, false);
  const before = pfdCv.texts.length;
  R.step(1);
  assert.ok(!pfdCv.texts.slice(before).some(t => t.includes('AHRS FAIL')), 'back in: the attitude is back');
  R.press('cb.GPS1'); R.step(1.5);
  assert.equal(R.sys.elec.cbGps, true);
  assert.ok(mfdCv.texts.some(t => t.includes('GPS 信号なし')), 'the MFD shows the GPS failure');
  R.cp.dispose();
});

test('functional: the TURN breaker flags the standby attitude indicator off', () => {
  const made = [];
  const R = rig('pa28', (w, h) => { const c = recCanvas(w, h); made.push(c); return c; });
  R.sys.setRunning(R.fl.s); R.step(1);
  const dynCv = made.find(c => c.width === 1024 && c.height === 384);   // the small canvas (strips + standby dials)
  assert.ok(dynCv, 'the standby canvas exists');
  assert.ok(!dynCv.texts.includes('OFF'), 'no OFF flag yet');
  R.press('cb.TURN'); R.step(1);
  assert.ok(dynCv.texts.includes('OFF'), 'the standby attitude wears its OFF flag');
  R.cp.dispose();
});

// ---------------------------------------------------------------- the dimmers and the audio panel's rest
test('functional: the panel dimmers turn the backlights, in the cockpit\'s own materials', () => {
  const R = rig('pa28');
  R.sys.setRunning(R.fl.s);
  const labels = R.cp.meshes.find(m => m.name === 'cockpit-labels'), lit = R.cp.meshes.find(m => m.name === 'cockpit-lit');
  assert.ok(labels && lit);
  const upd = night => R.cp.update(1 / 60, { s: R.fl.s, L: R.fl.L, av: R.av, night, eng: { rpm: 0, run: false, elec: R.sys.elec } });
  upd(1);
  assert.ok(Math.abs(labels.material.emissiveIntensity - 0.7) < 0.01, 'full panel light at night');
  R.press('dimmer.panel', -1, true); R.press('dimmer.panel', -1, true); R.press('dimmer.panel', -1, true); R.press('dimmer.panel', -1, true); R.press('dimmer.panel', -1, true);
  assert.ok(Math.abs(R.sw.panelDim - 0.5) < 1e-9, `the panel dimmer at ${R.sw.panelDim}`);
  upd(1);
  assert.ok(Math.abs(labels.material.emissiveIntensity - 0.35) < 0.01, `the labels dim with it (${labels.material.emissiveIntensity})`);
  const litFull = lit.material.color.r;
  for (let i = 0; i < 10; i++) R.press('dimmer.switch', -1, true);
  assert.equal(R.sw.switchDim, 0);
  upd(1);
  assert.ok(lit.material.color.r < litFull * 0.4, `the switch lamps dim to ${lit.material.color.r} from ${litFull}`);
  R.cp.dispose();
});

test('functional: the audio panel — mic and monitors move the avionics; the rest explain themselves', () => {
  const R = rig('pa28'), av = R.av;
  R.sys.setRunning(R.fl.s); R.step(0.5);
  assert.equal(av.audio.mic, 'COM1');
  R.press('audio.COM2MIC');
  assert.equal(av.audio.mic, 'COM2', 'the MIC selector moves');
  assert.equal(R.press('audio.COM2MIC').type, 'info', 'already there: it says so');
  R.press('audio.COM1MIC');
  assert.equal(av.audio.mic, 'COM1');
  const m0 = av.audio.monitor.NAV1;
  R.press('audio.NAV1');
  assert.equal(av.audio.monitor.NAV1, !m0, 'the NAV1 monitor toggles (the ident is heard on it)');
  R.press('audio.NAV1');
  assert.equal(av.audio.monitor.NAV1, m0);
  for (const id of ['audio.COM3MIC', 'audio.PA', 'audio.MKR/MUTE'.replace('/', ''), 'audio.VOL', 'audio.DISPLAYBACKUP']) {
    const c = R.ctl(id);
    assert.ok(c, `${id} is a control`);
    assert.equal(c.act(1).type, 'info', `${id}: present, and honest about being unused in this flight`);
  }
  R.cp.dispose();
});

// ---------------------------------------------------------------- the G1000's keys and knobs, end to end
test('functional: the NAV knobs tune the standby and swap it in; the FMS knob walks the plan', () => {
  const R = rig('pa28'), av = R.av;
  R.sys.setRunning(R.fl.s); R.step(0.5);
  const stby = av.nav1.stby;
  R.press('pfd.nav.inner', 1, true);
  assert.notEqual(av.nav1.stby, stby, 'the inner NAV knob tunes the kHz');
  R.press('pfd.nav.outer', 1, true);
  assert.ok(Math.abs(av.nav1.stby - stby) >= 1000 - 1, 'the outer NAV knob tunes the MHz');
  const tuned = av.nav1.stby;
  R.press('pfd.navSwap');
  assert.equal(av.nav1.act, tuned, 'the transfer key swaps standby into active');
  R.press('pfd.nav.inner');                            // a push on the inner knob
  assert.equal(av.navSel, 'NAV2', 'the push selects the other NAV radio');
  const stby2 = av.nav2.stby;
  R.press('mfd.nav.inner', 1, true);
  assert.notEqual(av.nav2.stby, stby2, 'the MFD\'s NAV knob tunes the selected radio (NAV2)');
  // the plan: on the MAP page the FMS knob walks the active leg; on the FPL page ENT opens the editor
  assert.equal(av.mfdPage, 'MAP');
  const leg = av.fpl.active;
  R.press('mfd.fms.inner', 1, true);
  assert.equal(av.fpl.active, leg + 1, 'the FMS knob advances the active leg');
  R.press('mfd.fms.inner', -1, true);
  assert.equal(av.fpl.active, leg);
  R.cp.dispose();
});

test('functional: the keys — PROC loads, D→ cycles, ENT/CLR edit the plan, MENU explains itself', () => {
  const R = rig('pa28'), av = R.av;
  R.sys.setRunning(R.fl.s); R.step(0.5);
  assert.equal(av.proc, null);
  R.press('pfd.proc');
  assert.ok(av.proc && av.proc.name, `PROC loaded ${av.proc && av.proc.name}`);
  R.press('pfd.direct');
  const d1 = av.direct;
  assert.ok(d1, 'D→ picks a target');
  R.press('pfd.direct');
  assert.ok(av.direct && av.direct !== d1, 'and the next press the next one');
  // the plan editor through the MFD's own keys: FPL page, ENT to edit, ENT to insert, CLR to delete
  R.apply(AV.control(av, 'MFD_FPL'));
  assert.equal(av.mfdPage, 'FPL');
  R.press('mfd.ent');
  assert.equal(av.fplEdit, true, 'ENT opens the editor');
  const n0 = av.fpl.wps.length;
  R.press('mfd.ent');
  assert.equal(av.fpl.wps.length, n0 + 1, 'ENT inserts the picked point');
  R.press('mfd.clr');
  assert.equal(av.fpl.wps.length, n0, 'CLR deletes it again');
  assert.equal(R.ctl('pfd.menu').act(1).type, 'info', 'MENU: no menu in this avionics, and it says so');
  assert.equal(R.ctl('pfd.navVol').act(1).type, 'info', 'the volume knobs say the same');
  R.cp.dispose();
});

test('functional: the transponder, typed on its own softkeys', () => {
  const R = rig('pa28'), av = R.av;
  R.sys.setRunning(R.fl.s); R.step(0.5);
  // the pfdTop row: [blank, INSET, PFD, OBS, CDI, BRG1, XPDR, IDENT, …] — XPDR is the 7th key
  R.press('pfd.sk7');
  assert.equal(av.pfdMenu, 'XPDR', 'the XPDR row is up');
  R.step(0.2);
  // the digit row: keys 1..8 are 0..7 — type 4, 5, 2, 1
  R.press('pfd.sk5'); R.press('pfd.sk6'); R.press('pfd.sk3'); R.press('pfd.sk2');
  assert.equal(av.xpdr.code, 4521, `the code is set (${av.xpdr.code})`);
  R.press('pfd.sk9');                                  // MODE
  assert.equal(av.xpdr.mode, 'ON', 'the mode cycles ALT → ON');
  R.press('pfd.sk11');                                 // BACK
  assert.equal(av.pfdMenu, 'TOP');
  R.press('pfd.sk8');                                  // IDENT on the top row
  assert.ok(av.xpdrIdent > 0, 'IDENT runs its timer');
  R.cp.dispose();
});

// ---------------------------------------------------------------- the Seminole, through its own controls
function gearLampCounts(R) {
  const m = R.cp.meshes.find(mm => mm.name === 'cockpit-lit-pa44');
  const col = m.geometry.attributes.color;
  let green = 0, red = 0;
  for (let i = 0; i < col.count; i++) { if (col.getY(i) > 0.9) green++; else if (col.getX(i) > 0.9) red++; }
  return [green / 6, red / 6];
}
test('functional: the Seminole\'s gear — transit, lamps, and the emergency extension under a fault', () => {
  const R = rig('pa44');
  R.sys.setRunning(R.fl.s); R.step(1);
  P.placeInAir(R.fl.s, 0, -20000, 3000, 360, 120, 0, 0);   // placed in the cruise: the gear starts UP
  R.fl.s.thr = 0.55;
  R.step(1);
  assert.equal(R.fl.s.gearDown, false);
  assert.deepEqual(gearLampCounts(R), [0, 0], 'no lamps: up');
  R.press('gear');
  assert.equal(R.fl.s.gearDown, true);
  R.step(2);
  assert.deepEqual(gearLampCounts(R), [0, 1], 'the red lamp: in transit');
  R.step(14);
  assert.ok(R.fl.s.gearPos > 0.99, `down (${R.fl.s.gearPos})`);
  assert.deepEqual(gearLampCounts(R), [3, 0], 'three green: down and locked');
  R.press('gear');
  assert.equal(R.fl.s.gearDown, false);
  R.step(14);
  assert.ok(R.fl.s.gearPos < 0.05, `up again (${R.fl.s.gearPos})`);
  assert.deepEqual(gearLampCounts(R), [0, 0], 'no lamps: up');
  // the fault: the transit stalls; the red handle drops the gear and it stays down
  SC.failNow(R.fl.L, 'gear');
  R.press('gear');
  assert.equal(R.fl.s.gearDown, true);
  R.step(15);
  assert.ok(R.fl.s.gearPos > 0.3 && R.fl.s.gearPos < 0.99, `the transit stalls (${R.fl.s.gearPos})`);
  R.press('gearEmerg');
  assert.equal(R.fl.s.gearEmerg, true);
  R.step(8);
  assert.equal(R.fl.s.gearPos, 1, 'the free-fall extension locks it down');
  assert.deepEqual(gearLampCounts(R), [3, 0], 'three green again');
  R.press('gear');
  R.step(8);
  assert.equal(R.fl.s.gearPos, 1, 'and it cannot be retracted afterwards');
  R.cp.dispose();
});

test('functional: the Seminole\'s fuel valves and crossfeed, through their levers', () => {
  const R = rig('pa44'), { sw } = R;
  R.sys.setRunning(R.fl.s); R.step(2);
  assert.ok(R.sys.twinLive.every(t => t.eng === 'run'), 'both running');
  R.press('fuelSelL');
  assert.equal(sw.fuelSelL, 'OFF');
  R.step(1);
  assert.equal(R.fl.s.eng[0].sel, 'OFF', 'the left engine\'s valve follows');
  R.step(9);
  assert.equal(R.sys.twinLive[0].eng, 'off', 'the left engine starves and stops');
  assert.equal(R.sys.twinLive[1].eng, 'run', 'the right keeps running');
  R.press('xfeed');
  assert.equal(sw.xfeed, true);
  R.step(0.5);
  assert.equal(R.fl.s.eng[0].feed, 1, 'crossfeed open: the left engine drinks from the right tank');
  R.cp.dispose();
});

test('functional: the Seminole\'s propeller cycle and the shared mixture', () => {
  const R = rig('pa44');
  R.sys.setRunning(R.fl.s); R.step(2);
  // the cycle is a run-up item: at 2,000 rpm, where the governor's gauge can show the sag (at idle the
  // lever's own gauge law reads ~650 and there is nothing to sag from)
  for (let i = 0; i < 40 && R.sys.twinLive[0].rpm < 1800; i++) { R.press('throttle'); R.step(0.2); }
  const base = R.sys.twinLive[0].rpm;
  assert.ok(base > 1700, `at the run-up (${base})`);
  const r = R.press('prop');
  assert.deepEqual(r, { type: 'select', id: 'propCycleT', value: 2.6 });
  let sag = 0;
  for (let i = 0; i < 20; i++) { R.step(0.15); sag = Math.max(sag, base - R.sys.twinLive[0].rpm); }
  assert.ok(sag > 150, `the cycle pulls the rpm down (${sag})`);
  R.step(2);
  assert.equal(R.sw.propCycled, true, 'the cycle is recorded');
  R.press('mixture');                                  // → idle cut-off, both engines
  assert.equal(R.sw.mixture, 0);
  R.step(2);
  assert.ok(R.sys.twinLive.every(t => t.eng === 'off'), 'both stop on the one mixture control');
  R.cp.dispose();
});
