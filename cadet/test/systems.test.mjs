// CADET — the engine and electrics behind the switches (aircraft/systems.js), on FLIGHT LAB's physics:
//  - cold on the apron the engine is stopped and still (no thrust, no rpm), the parking brake holds;
//  - the published start (fuel, mixture rich, throttle cracked, 2–3 primes, master, START) catches and settles at idle;
//    not primed, no master, mixture lean or the selector OFF: no start, and the reason is said; primed too much it
//    floods and starts only with the throttle open;
//  - running, the idle cut-off, the magnetos OFF and the selector OFF (after the fuel in the lines) stop it;
//  - the run-up: at 2,000 rpm the tachometer drops on each magneto within the published limits, and with carb heat;
//  - in a lesson (everything on, running) the systems leave the physics alone: FLIGHT LAB's bot flies t1 to the same
//    bit-identical result with the systems updated every step.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeBot, runLesson } from './helpers/bot.mjs';
import { createFlight } from '../src/flight/flight.js';
import { createSystems, RUNUP, COLD } from '../src/aircraft/systems.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL, P = FL.physics;
const NOKEYS = { has: () => false };

function apron() {
  const fl = createFlight(FL, { store: null });
  const [n, e] = P.rwyToNE(P.LAB_RWY, 715, 208);
  fl.startOnGround(n, e, 264, 'pa28', { wind: { rel: 10, kt: 5, gust: 0.5 } });
  const sw = {}, sys = createSystems(sw);
  sys.setCold(fl.s);
  const run = (sec, each) => { const ev = []; for (let t = 0; t < sec; t += 1 / 60) { if (each) each(t); fl.frame(1 / 60, NOKEYS); ev.push(...sys.update(1 / 60, fl.s)); } return ev; };
  return { fl, sw, sys, run };
}
function startUp(A, { primes = 3, thrStep = 1 } = {}) {
  const { fl, sw, sys } = A;
  sw.fuelSel = 'L'; sw.mixture = 1; sw.master = true; sw.beacon = true; sw.fuelPump = true;
  for (let i = 0; i < thrStep; i++) fl.action('thrStep', 1);
  for (let i = 0; i < primes; i++) sys.prime();
  sw.mag = 'START';
}

test('systems: cold on the apron — stopped and still; the published start catches and settles at idle', () => {
  const A = apron(), { fl, sw, sys } = A;
  assert.deepEqual({ ...sw }, COLD);
  const ev0 = A.run(5);
  assert.equal(sys.running, false); assert.equal(fl.s.eng[0].run, false);
  assert.equal(sys.rpm, 0, 'the propeller does not turn in the wind'); assert.ok(fl.s.rpm < 60);
  assert.ok(Math.abs(fl.s.thrust) < 1, 'no thrust');
  assert.ok(!ev0.length && !fl.s.events.some(e => e.type === 'engine_stop'), 'no stop told for an engine that was never running');
  startUp(A);
  const ev = A.run(4);
  assert.deepEqual(ev.map(e => e.type), ['crank', 'catch']);
  assert.equal(sw.mag, 'BOTH', 'the key sprang back');
  assert.ok(sys.running && fl.s.eng[0].run);
  // idle (the throttle a step open): about 700–1,000 rpm on the gauge, oil pressure up
  fl.action('thrIdle');
  A.run(4);
  assert.ok(sys.rpm > 600 && sys.rpm < 900, `idle ${sys.rpm}`);
  assert.ok(sys.oil > 50);
  const at = P.ne(fl.s), [n0, e0] = P.rwyToNE(P.LAB_RWY, 715, 208);
  assert.ok(Math.hypot(at.n - n0, at.e - e0) < 0.01, 'the parking brake holds it');
});

test('systems: no start without priming, master, rich mixture or fuel — and the reason is said; flooding', () => {
  const tries = [
    ['prime', (A) => startUp(A, { primes: 0 }), /プライマー/],
    ['mixture', (A) => { startUp(A); A.sw.mixture = 0.3; A.sys.st.eng = 'off'; A.sw.mag = 'OFF'; A.run(0.1); A.sw.mag = 'START'; }, /ミクスチャー/],
    ['fuel', (A) => { A.sw.fuelSel = 'OFF'; startUp(A); A.sw.fuelSel = 'OFF'; }, /燃料/],
    ['flooded', (A) => startUp(A, { primes: 8 }), /押しすぎ/],
  ];
  for (const [name, set, said] of tries) {
    const A = apron(); set(A);
    const ev = A.run(10);
    assert.ok(!A.sys.running, name + JSON.stringify(ev));
    const no = ev.find(e => e.type === 'nocatch');
    assert.ok(no && said.test(no.why), `${name}: ${JSON.stringify(ev)}`);
    assert.equal(A.sw.mag, 'BOTH', `${name}: the starter is let go`);
  }
  // no master: the starter does not turn at all
  { const A = apron(); startUp(A); A.sw.master = false; const ev = A.run(3); assert.deepEqual(ev.map(e => e.type), ['nostarter']); assert.ok(!A.sys.running); }
  // flooded, then cleared with the throttle well open: it catches (and the surge is told)
  { const A = apron(); startUp(A, { primes: 8, thrStep: 10 }); const ev = A.run(5); assert.ok(A.sys.running, JSON.stringify(ev)); assert.ok(ev.some(e => e.type === 'surge')); }
});

test('systems: running — the idle cut-off, the magnetos OFF and the selector OFF stop it', () => {
  for (const [name, stop, within] of [['mixture', (sw) => { sw.mixture = 0; }, 0.2], ['mags', (sw) => { sw.mag = 'OFF'; }, 0.2], ['fuel', (sw) => { sw.fuelSel = 'OFF'; }, 7]]) {
    const A = apron(); startUp(A); A.run(4);
    assert.ok(A.sys.running);
    stop(A.sw);
    let t = 0; while (A.sys.running && t < 10) { A.run(0.05); t += 0.05; }
    assert.ok(!A.sys.running && t <= within + 0.06, `${name}: ${t}`);
    assert.ok(t > within - 1.1, `${name}: not before the fuel in the lines is used (${t})`);
    assert.ok(!A.fl.s.eng[0].run);
    A.run(3);
    assert.equal(A.sys.rpm, 0, `${name}: the propeller stops`);
    assert.ok(A.sys.oil < 1);
  }
});

test('systems: the run-up — 2,000 rpm, the magneto drops and carb heat inside the published limits', () => {
  const A = apron(), { fl, sw, sys } = A;
  startUp(A); A.run(3);
  // throttle to 2,000 rpm
  let guard = 0; while (fl.s.eng[0].rpm < RUNUP.rpm - 30 && guard++ < 40) { fl.action('thrStep', 1); A.run(1); }
  A.run(3);
  const both = sys.rpm;
  assert.ok(Math.abs(both - 2000) < 120, `run-up rpm ${both}`);
  sw.mag = 'L'; A.run(0.5); const l = both - sys.rpm;
  sw.mag = 'R'; A.run(0.5); const r = both - sys.rpm;
  sw.mag = 'BOTH'; A.run(2);   // (the tach settles back behind the real power loss now: a second or two, not at once)
  assert.ok(Math.abs(sys.rpm - both) < 1);
  assert.ok(l > 50 && l <= RUNUP.maxDrop && r > 50 && r <= RUNUP.maxDrop && Math.abs(l - r) <= RUNUP.maxDiff, `drops ${l} ${r}`);
  sw.carbHeat = true; A.run(0.5); const c = both - sys.rpm; sw.carbHeat = false;
  assert.ok(c > 40 && c < 120, `carb heat ${c}`);
  assert.ok(sys.running, 'still running after the checks');
  const at = P.ne(fl.s), [n0, e0] = P.rwyToNE(P.LAB_RWY, 715, 208);
  assert.ok(Math.hypot(at.n - n0, at.e - e0) < 0.01, 'held on the brake at 2,000 rpm');
});

test('systems: the electrical model — the bus charges under way, a failed alternator discharges, a flat battery turns no starter', () => {
  const A = apron(), { fl, sys } = A;
  sys.setRunning(fl.s);
  A.run(3);
  assert.ok(sys.elec.volts > 13.5 && sys.elec.volts < 14.6, `volts ${sys.elec.volts}`);
  assert.ok(sys.oilT > 150, `oilT ${sys.oilT} (a running engine's oil is warm)`);
  // the alternator fails: the amps go negative at once (the battery alone carries the panel)
  sys.setElecFault(true);
  A.run(2);
  assert.ok(sys.elec.amps < 0, `amps ${sys.elec.amps}`);
  assert.equal(sys.elecFault, true);
  sys.setElecFault(false);
  // a flat battery: the key to START says why, and nothing turns
  const B = apron(); B.sys.elec.batt = 0.01;
  startUp(B);
  const ev = B.run(3);
  const no = ev.find(e => e.type === 'nostarter');
  assert.ok(no && /バッテリー/.test(no.why), JSON.stringify(ev));
  assert.ok(!B.sys.running && !B.sys.cranking);
  // the Hobbs turns only while the engine runs
  const C = apron(); C.run(2); const h0 = C.sys.hobbs;
  startUp(C); C.run(36);
  assert.ok(C.sys.hobbs > h0, 'the meter advanced under power');
});

test('systems: oil temperature — cold-soaked to the day\'s air, then climbing behind power', () => {
  const C = apron(), { fl, sys } = C;
  C.run(1);
  const oatF = fl.s.out.oat * 9 / 5 + 32;
  assert.ok(Math.abs(sys.oilT - oatF) < 3, `oilT ${sys.oilT} vs the day's air ${oatF}`);
  startUp(C); C.run(30);
  assert.ok(sys.oilT > oatF + 5, `oilT warming ${sys.oilT}`);
});

test('systems: the twin — each engine has its own oil pressure and temperature', () => {
  const fl = createFlight(FL, { store: null });
  const [n, e] = P.rwyToNE(P.LAB_RWY, 715, 208);
  fl.startOnGround(n, e, 264, 'pa44', { wind: { rel: 10, kt: 5, gust: 0.5 } });
  const sw = {}, sys = createSystems(sw);
  sys.setRunning(fl.s);
  for (let t = 0; t < 5; t += 1 / 60) { fl.frame(1 / 60, NOKEYS); sys.update(1 / 60, fl.s); }
  const tw = sys.twin;
  assert.equal(tw.length, 2);
  for (const t of tw) { assert.ok(t.oil > 30, `oil ${t.oil}`); assert.ok(t.oilT > 150, `oilT ${t.oilT}`); }
  assert.ok(sys.elec.volts > 13.5, `volts ${sys.elec.volts}`);
});

test('systems: in a lesson everything is on and running, and the physics is FLIGHT LAB\'s to the bit (t1 by the bot)', () => {
  const ref = runLesson(FL, 't1', 'basic');
  const fl = createFlight(FL, { store: null }), sw = {}, sys = createSystems(sw);
  fl.startLesson('t1', 'basic', { sens: 'low', autoRud: !!FL.school.lesson('t1').autoRud }); sys.setRunning(fl.s);
  assert.equal(sw.master, true); assert.equal(sw.mag, 'BOTH'); assert.equal(sw.mixture, 1);
  const bot = makeBot(FL);
  const L = fl.runScripted((L, dt) => { bot.fly(L, dt); sys.update(dt, L.s); });
  assert.equal(L.grade, ref.grade); assert.equal(L.score, ref.score); assert.equal(L.t, ref.t);
  assert.deepEqual(L.s.pos, ref.s.pos); assert.deepEqual(L.s.q, ref.s.q);
  assert.deepEqual(JSON.stringify(L.results), JSON.stringify(ref.results));
  assert.ok(sys.running && sys.rpm > 2000);
});

test('systems: the physics\' own engine systems follow the switches (mag / mixture / selector / started)', () => {
  const A = apron(), { fl, sw, sys } = A, e = fl.s.eng[0];
  // cold on the apron, the physics sees the engine as the switches leave it: magnetos OFF, mixture cut, not started
  assert.equal(e.mag, 'OFF'); assert.equal(e.mix, 0); assert.equal(e.sel, 'L');
  A.run(1);
  assert.equal(e.on, false, 'the first step on the cut drops the started latch');
  assert.equal(fl.s.out.mag, 'OFF'); assert.equal(fl.s.out.mix, 0); assert.equal(fl.s.out.fuelSel, 'L');
  // the start: the catch starts the physics' engine too, and the key's spring-back is in both
  startUp(A); A.run(4);
  assert.ok(sys.running && e.run);
  assert.equal(e.on, true); assert.equal(e.mag, 'BOTH'); assert.equal(e.mix, 1);
  // a stop at the switches (the magnetos) drops the physics' latch with the systems' own stop
  sw.mag = 'OFF'; A.run(1);
  assert.ok(!sys.running); assert.equal(e.on, false); assert.equal(e.run, false);
});

test('systems: the engine controls reach the physics (the mirror), and the burn follows the selector', () => {
  const A = apron(), { fl, sw, sys } = A;
  startUp(A); A.run(12);
  assert.equal(sys.running, true);
  sw.fuelSel = 'R'; sw.carbHeat = true; A.run(0.1);
  assert.equal(fl.s.fuelSel, 'R'); assert.equal(fl.s.carbHeat, true); assert.equal(fl.s.mix, 1, 'the switches are mirrored into the flight model');
  sw.carbHeat = false;
  const f = [...fl.s.fuel]; A.run(60);
  assert.equal(fl.s.fuel[0], f[0], 'the left tank does not fall while the right one feeds');
  assert.ok(fl.s.fuel[1] < f[1] - 0.005, `the right tank falls (${f[1].toFixed(2)} → ${fl.s.fuel[1].toFixed(2)})`);
});

test('systems: the split bus — ALT off discharges on a timer, BAT off leaves the bus on the alternator alone', () => {
  const A = apron(); A.sys.setRunning(A.fl.s); A.run(1);
  A.sw.alt = false; A.run(2);                                    // (ALT off: the battery carries everything)
  assert.ok(A.sys.elec.gen === 0 && A.sys.elec.batOn && !A.sys.elec.altOn && A.sys.elec.pfdOn, 'everything works on the battery');
  assert.ok(A.sys.elec.volts < 13, `battery volts ${A.sys.elec.volts}`);
  const b0 = A.sys.elec.batt; A.run(60); assert.ok(A.sys.elec.batt < b0 - 0.005, 'it discharges on a timer');
  const B = apron(); B.sys.setRunning(B.fl.s); B.run(1);
  B.sw.bat = false; const bb = B.sys.elec.batt; B.run(10);       // (BAT off: the alternator alone, no buffer)
  assert.ok(B.sys.elec.volts > 13.5 && B.sys.elec.amps === 0 && B.sys.elec.batt === bb && B.sys.elec.pfdOn, 'bus powered, battery untouched and out of circuit');
});

test('systems: two-stage shedding — the MFD drops first, and shedding the avionics master stretches the PFD measurably', () => {
  const drain = (avionics) => {                                  // (alternator failed at half a battery; the systems alone, stepped without the physics — the bus does not care)
    const C = apron(); C.sys.setRunning(C.fl.s); C.sys.setElecFault(true); C.sw.avionics = avionics; C.sys.elec.batt = 0.5;
    let t = 0; do { for (let i = 0; i < 600; i++) C.sys.update(1 / 60, C.fl.s); t += 10; } while (C.sys.elec.pfdOn && t < 20000); return t;
  };
  const withAv = drain(true), shedEarly = drain(false);
  assert.ok(shedEarly > withAv * 1.3, `shedding the avionics master stretches the PFD: ${shedEarly}s against ${withAv}s`);
  const D = apron(); D.sys.setRunning(D.fl.s); D.sys.setElecFault(true); D.sys.elec.batt = 0.44; D.run(2);
  assert.ok(D.sys.elec.shed === 1 && !D.sys.elec.mfdOn && D.sys.elec.pfdOn, 'below 45%: the MFD sheds, the PFD stays');
  const E = apron(); E.sys.setRunning(E.fl.s); E.sys.setElecFault(true); E.sys.elec.batt = 0; E.run(2);
  assert.ok(!E.sys.elec.pfdOn && E.sys.elec.standbyOn, 'with the main bus dead the standby instruments live on their own battery');
});

test('systems: starter duty — about 30 s of cranking in total overheats and locks it, and it cools back', () => {
  const A = apron(), { sw, sys } = A;
  sw.fuelSel = 'L'; sw.mixture = 1; sw.master = true;            // (never primed: it cranks and never catches)
  let hot = null;
  for (let i = 0; i < 24 && !sys.st.crankLock; i++) { sw.mag = 'START'; const ev = A.run(7); hot = hot || ev.find(e => e.type === 'nocatch' && /熱で回らなくなりました/.test(e.why)); }
  assert.ok(sys.st.crankLock && sys.starterHot, 'locked out hot');
  assert.ok(hot, 'and the instructor said why');
  A.run(45);
  assert.ok(!sys.st.crankLock && !sys.starterHot, 'cooled back below the latch');
});

test('systems: the alert state — low fuel and a failed alternator collected, stable, and on the outputs', () => {
  const A = apron(); A.sys.setRunning(A.fl.s); A.run(1);
  A.fl.s.fuel[0] = 2; A.sys.setElecFault(true); A.run(5);
  const ids = A.sys.alerts.map(a => a.id);
  assert.ok(ids.includes('FUEL L') && ids.includes('ALTERNATOR'), JSON.stringify(ids));
  assert.ok(Array.isArray(A.fl.s.out.alerts) && A.fl.s.out.alerts.length === A.sys.alerts.length, 'mirrored on s.out.alerts');
  assert.ok(A.sys.alerts.every(a => (a.level === 'warn' || a.level === 'caution') && a.text), 'the shape the avionics draw');
});

test('systems depth: a blocked static port freezes the altimeter and the VSI; the alternate source restores them, reading high', () => {
  const L = FL.school.startFree('area', 'pa28'), s = L.s;
  P.step(s, 1 / 120); const alt0 = s.out.altTrue;
  FL.school.failNow(L, 'static'); s.thr = 0.9;
  for (let i = 0; i < 240; i++) P.step(s, 1 / 120);
  assert.ok(s.out.staticBlocked && Math.abs(s.out.altTrue - alt0) < 0.01 && s.out.vsi === 0, `frozen at ${s.out.altTrue} (was ${alt0})`);
  s.altStatic = true; P.step(s, 1 / 120);
  assert.ok(!s.out.staticBlocked && Math.abs(s.out.altTrue - (alt0 + 80)) < 1.5, 'the cabin source: live again, about 80 ft high');
});

test('systems depth: pitot ice blocks the tube in the band with the heat off, and the heat melts it back', () => {
  const L = FL.school.startFree('area', 'pa28'), s = L.s;
  FL.school.failNow(L, 'pitot');
  const hold = () => { s.pos[1] = 1829; s.vel = [0, 0, -30]; };   // (held at 6,000 ft, in the band, whatever the flight does)
  for (let i = 0; i < 3600; i++) { if (i % 120 === 0) hold(); P.step(s, 1 / 120); }
  assert.ok(s.out.pitotBlocked && s.pitotIce >= 0.999, `blocked (${s.pitotIce})`);
  const frozen = s.out.ias; hold(); s.vel = [0, 0, -55]; P.step(s, 1 / 120);
  assert.equal(s.out.ias, frozen, 'a blocked tube: the speed will not change with the airflow');
  s.pitotHeat = true;
  for (let i = 0; i < 3600; i++) { if (i % 120 === 0) hold(); P.step(s, 1 / 120); }
  assert.ok(!s.out.pitotBlocked && s.pitotIce < 0.05, `melted (${s.pitotIce})`);
});

test('systems depth: one magneto costs real power and roughens the engine; the bad magneto of a fault roughens at rpm', () => {
  const L = FL.school.startFree('area', 'pa28'), s = L.s;
  s.thr = 0.79; for (let i = 0; i < 1200; i++) P.step(s, 1 / 120);
  const both = s.eng[0].powK;
  s.eng[0].mag = 'L'; for (let i = 0; i < 240; i++) P.step(s, 1 / 120);
  assert.ok(Math.abs(s.eng[0].powK - both * 0.97) < 0.01, `single mag: powK ${s.eng[0].powK} against ${both}`);
  assert.ok(s.out.rough >= 0.25, `rough on one mag (${s.out.rough})`);
  s.eng[0].mag = 'BOTH'; s.eng[0].magBad = 'L'; for (let i = 0; i < 240; i++) P.step(s, 1 / 120);
  assert.ok(s.out.rough >= 0.5, `a bad mag in circuit roughens (${s.out.rough})`);
});

test('systems depth: the Seminole feed matrix — own tank, crossfeed, both off', () => {
  const L = FL.school.startFree('area', 'pa44'), s = L.s;
  s.eng[0].sel = 'ON'; s.eng[1].sel = 'OFF'; s.xfeed = false; P.step(s, 1 / 120);
  assert.equal(s.eng[0].feed, 0); assert.equal(s.eng[1].feed, -1, 'right selector off, no crossfeed: the right engine starves');
  s.xfeed = true; P.step(s, 1 / 120);
  assert.equal(s.eng[1].feed, 0, 'crossfeed open: both engines drink from the left tank');
  s.eng[0].sel = 'OFF'; P.step(s, 1 / 120);
  assert.equal(s.eng[0].feed, -1); assert.equal(s.eng[1].feed, -1, 'both selectors off: nothing feeds either engine, crossfeed or not');
});

test('systems depth: a failed engine-driven pump starves the engine at low rpm — the boost pump is the way back', () => {
  const L = FL.school.startFree('area', 'pa28'), s = L.s, e = s.eng[0];
  s.thr = 0; FL.school.failNow(L, 'pump'); s.boostPump = false;
  for (let i = 0; i < 720; i++) P.step(s, 1 / 120);
  assert.ok(e.fuelPress < 0.1 && e.on === false, `starved at idle (press ${e.fuelPress}, on ${e.on})`);
  const L2 = FL.school.startFree('area', 'pa28'), s2 = L2.s, e2 = s2.eng[0];
  s2.thr = 0; FL.school.failNow(L2, 'pump'); s2.boostPump = true;
  for (let i = 0; i < 720; i++) P.step(s2, 1 / 120);
  assert.ok(e2.fuelPress > 0.6 && e2.on === true, `the boost pump carries it (press ${e2.fuelPress})`);
  assert.ok(s2.out.fuelPress > 0.6 && s2.out.fuelRemain > 0 && s2.out.cyl.length === 4 && s2.out.oilQ[0] > 0, 'the new outputs ride along');
});

test('systems depth: a gear fault stalls the transit — the emergency extension drops it and it stays down', () => {
  const L = FL.school.startFree('area', 'pa44'), s = L.s;
  s.gearDown = false; for (let i = 0; i < 1200; i++) P.step(s, 1 / 120);
  assert.ok(s.gearPos < 0.02, `retracted (${s.gearPos})`);
  FL.school.failNow(L, 'gear'); s.gearDown = true;
  for (let i = 0; i < 1800; i++) P.step(s, 1 / 120);
  assert.ok(s.gearPos > 0.4 && s.gearPos < 0.99 && s.out.gearFault, `the transit stalls part-way (${s.gearPos})`);
  s.gearEmerg = true;
  for (let i = 0; i < 720; i++) P.step(s, 1 / 120);
  assert.equal(s.gearPos, 1, 'the free-fall extension locks it down');
  s.gearDown = false;
  for (let i = 0; i < 960; i++) P.step(s, 1 / 120);
  assert.equal(s.gearPos, 1, 'and it cannot be retracted afterwards');
});
