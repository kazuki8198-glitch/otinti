// CADET — the engine and electrics behind the switches (aircraft/systems.js), on FLIGHT LAB's physics:
//  - cold on the apron the engine is stopped and still (no thrust, no rpm), the parking brake holds;
//  - the published start (the NXi Archer's: fuel, mixture rich, throttle cracked, 2–3 primes, BATT MASTR, ALTR, MAG
//    LEFT, START held) catches — START springs back — and settles at idle (MAG RIGHT ON after it);
//    not primed, no BATT MASTR, mixture lean, the selector OFF or both magnetos OFF: no start, and the reason is said;
//    primed too much it floods and starts only with the throttle open;
//  - running, the idle cut-off, both magnetos OFF and the selector OFF (after the fuel in the lines) stop it;
//  - the run-up: at 2,000 rpm the tachometer drops on each magneto within the published limits, and with carb heat;
//  - in a lesson (everything on, running) the systems leave the physics alone: FLIGHT LAB's bot flies t1 to the same
//    bit-identical result with the systems updated every step;
//  - (round R3) the twin, the G1000 NXi Seminole's cold start (POH VB-2636 4.5c), each engine by its own switches: its
//    fuel pump, both its magnetos, its mixture forward a few seconds with the pump on (the prime) and back to cut-off,
//    its half of START held, the mixture advanced as it fires — the left, then the right; not primed, primed too long
//    (flooded: then cleared with the throttle open), its magnetos OFF, its selector OFF, its mixture left at cut-off as it
//    fires: that engine alone does not start or stops, and the reason is said with its side; each engine's run-up drops
//    and the alternate air's on its own gauge; the instructor's start turns both; a twin lesson (m1) stays FLIGHT LAB's to
//    the bit.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeBot, runLesson } from './helpers/bot.mjs';
import { createFlight } from '../src/flight/flight.js';
import { createSystems, RUNUP, COLD, PRIME, magState, magStateOf, NOCATCH } from '../src/aircraft/systems.js';
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
  sw.fuelSel = 'L'; sw.mixture = 1; sw.master = true; sw.altr = true; sw.fuelPump = true; sw.magL = true; sw.beacon = true;
  for (let i = 0; i < thrStep; i++) fl.action('thrStep', 1);
  for (let i = 0; i < primes; i++) sys.prime();
  sw.start = true;                                 // (the right magneto OFF while cranking: the impulse coupling is the left's)
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
  assert.equal(sw.start, false, 'START sprang back'); assert.equal(magState(sw), 'L');
  assert.ok(sys.running && fl.s.eng[0].run);
  sw.magR = true;                                  // MAG RIGHT ON after the start
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
    ['mixture', (A) => { startUp(A); A.sw.mixture = 0.3; A.sys.st.eng = 'off'; A.sw.start = false; A.run(0.1); A.sw.start = true; }, /ミクスチャー/],
    ['mags', (A) => { startUp(A); A.sw.magL = false; }, /マグネトー/],
    ['fuel', (A) => { A.sw.fuelSel = 'OFF'; startUp(A); A.sw.fuelSel = 'OFF'; }, /燃料/],
    ['flooded', (A) => startUp(A, { primes: 8 }), /押しすぎ/],
  ];
  for (const [name, set, said] of tries) {
    const A = apron(); set(A);
    const ev = A.run(10);
    assert.ok(!A.sys.running, name + JSON.stringify(ev));
    const no = ev.find(e => e.type === 'nocatch');
    assert.ok(no && said.test(no.why), `${name}: ${JSON.stringify(ev)}`);
    assert.equal(A.sw.start, false, `${name}: the starter is let go`);
  }
  // no master: the starter does not turn at all
  { const A = apron(); startUp(A); A.sw.master = false; const ev = A.run(3); assert.deepEqual(ev.map(e => e.type), ['nostarter']); assert.ok(!A.sys.running); }
  // flooded, then cleared with the throttle well open: it catches (and the surge is told)
  { const A = apron(); startUp(A, { primes: 8, thrStep: 10 }); const ev = A.run(5); assert.ok(A.sys.running, JSON.stringify(ev)); assert.ok(ev.some(e => e.type === 'surge')); }
});

test('systems: running — the idle cut-off, the magnetos OFF and the selector OFF stop it', () => {
  for (const [name, stop, within] of [['mixture', (sw) => { sw.mixture = 0; }, 0.2], ['mags', (sw) => { sw.magL = false; sw.magR = false; }, 0.2], ['fuel', (sw) => { sw.fuelSel = 'OFF'; }, 7]]) {
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
  startUp(A); A.run(3); sw.magR = true;
  // throttle to 2,000 rpm
  let guard = 0; while (fl.s.eng[0].rpm < RUNUP.rpm - 30 && guard++ < 40) { fl.action('thrStep', 1); A.run(1); }
  A.run(3);
  const both = sys.rpm;
  assert.ok(Math.abs(both - 2000) < 120, `run-up rpm ${both}`);
  sw.magR = false; A.run(0.5); const l = both - sys.rpm;                // MAG RIGHT OFF: on the left alone
  sw.magR = true; sw.magL = false; A.run(0.5); const r = both - sys.rpm; // then on the right alone
  sw.magL = true; A.run(0.5);
  assert.ok(Math.abs(sys.rpm - both) < 1);
  assert.ok(l > 50 && l <= RUNUP.maxDrop && r > 50 && r <= RUNUP.maxDrop && Math.abs(l - r) <= RUNUP.maxDiff, `drops ${l} ${r}`);
  sw.carbHeat = true; A.run(0.5); const c = both - sys.rpm; sw.carbHeat = false;
  assert.ok(c > 40 && c < 120, `carb heat ${c}`);
  assert.ok(sys.running, 'still running after the checks');
  const at = P.ne(fl.s), [n0, e0] = P.rwyToNE(P.LAB_RWY, 715, 208);
  assert.ok(Math.hypot(at.n - n0, at.e - e0) < 0.01, 'held on the brake at 2,000 rpm');
});

test('systems: in a lesson everything is on and running, and the physics is FLIGHT LAB\'s to the bit (t1 by the bot)', () => {
  const ref = runLesson(FL, 't1', 'basic');
  const fl = createFlight(FL, { store: null }), sw = {}, sys = createSystems(sw);
  fl.startLesson('t1', 'basic', { sens: 'low', autoRud: !!FL.school.lesson('t1').autoRud }); sys.setRunning(fl.s);
  assert.equal(sw.master, true); assert.equal(magState(sw), 'BOTH'); assert.equal(sw.mixture, 1); assert.ok(sw.altr && sw.emergBatt && sw.avionics && !sw.start);
  const bot = makeBot(FL);
  const L = fl.runScripted((L, dt) => { bot.fly(L, dt); sys.update(dt, L.s); });
  assert.equal(L.grade, ref.grade); assert.equal(L.score, ref.score); assert.equal(L.t, ref.t);
  assert.deepEqual(L.s.pos, ref.s.pos); assert.deepEqual(L.s.q, ref.s.q);
  assert.deepEqual(JSON.stringify(L.results), JSON.stringify(ref.results));
  assert.ok(sys.running && sys.rpm > 2000);
});

// (round R3) the twin on the apron: FLIGHT LAB's Seminole, cold
function twinApron() {
  const fl = createFlight(FL, { store: null });
  const [n, e] = P.rwyToNE(P.LAB_RWY, 715, 208);
  fl.startOnGround(n, e, 264, 'pa44', { wind: { rel: 10, kt: 5, gust: 0.5 } });
  const sw = {}, sys = createSystems(sw);
  sys.setCold(fl.s);
  const run = (sec) => { const ev = []; for (let t = 0; t < sec; t += 1 / 60) { fl.frame(1 / 60, NOKEYS); ev.push(...sys.update(1 / 60, fl.s).map(x => ({ ...x }))); } return ev; };
  return { fl, sw, sys, run };
}
// the POH's starred items for engine k (0 the left, 1 the right), up to START engaged: pump, magnetos, prime (secs of the
// mixture forward), cut-off
function twinPrep(A, k, { prime = 3, mags = [true, true] } = {}) {
  const { sw } = A, mix = k ? 'mixtureR' : 'mixture';
  sw[k ? 'rFuelPump' : 'fuelPump'] = true; sw[k ? 'rMagL' : 'magL'] = mags[0]; sw[k ? 'rMagR' : 'magR'] = mags[1];
  if (prime) { sw[mix] = 1; A.run(prime); }
  sw[mix] = 0;
  sw.start = k ? 'R' : 'L';
}

test('systems (R3): the twin\'s cold start, each engine in turn — prime, cut-off, START, the mixture advanced as it fires', () => {
  const A = twinApron(), { fl, sw, sys } = A;
  assert.deepEqual({ ...sw }, COLD);
  assert.ok(sw.fuelSelL === 'ON' && sw.fuelSelR === 'ON' && sw.cowlFlaps === 'CLOSED' && sw.mixtureR === 0, 'as left on the apron');
  A.run(2); assert.deepEqual(sys.twinLive.map(t => t.eng), ['off', 'off']); assert.ok(fl.s.eng.every(e => e.cut));
  sw.master = true; fl.action('thrStep', 1);
  // the mixture forward without the pump: no prime; with it, the prime counts while it is forward
  sw.mixture = 1; A.run(1); assert.equal(sys.twinLive[0].prime, 0, 'no prime without the pump'); sw.mixture = 0;
  twinPrep(A, 0);
  assert.ok(sys.twinLive[0].prime >= PRIME.ok && sys.twinLive[1].prime === 0, `the left primed (${sys.twinLive[0].prime.toFixed(2)} s), the right not`);
  let ev = A.run(2.5);
  assert.deepEqual(ev.map(e => `${e.type}:${e.why}`), ['crank:左エンジン', 'catch:左エンジン']);
  assert.equal(sw.start, false, 'START sprang back'); assert.ok(sys.runningL && !sys.runningR && !fl.s.eng[0].cut && fl.s.eng[1].cut);
  sw.mixture = 1; A.run(6);
  assert.ok(sys.runningL, 'the left runs on, its mixture forward'); assert.ok(sys.twinLive[0].oil > 25 && sys.twinLive[1].oil < 1);
  // the right: the same, on its own switches
  twinPrep(A, 1); ev = A.run(2.5);
  assert.deepEqual(ev.map(e => `${e.type}:${e.why}`), ['crank:右エンジン', 'catch:右エンジン']);
  sw.mixtureR = 1; A.run(6);
  assert.ok(sys.running && sys.runningR && fl.s.eng.every(e => !e.cut), 'both running');
  // the magnetos and START as each engine's own key would show them
  assert.equal(magStateOf(sw, 0), 'BOTH'); sw.rMagR = false; assert.equal(magStateOf(sw, 1), 'L'); sw.rMagR = true;
  // each engine stops by its own mixture
  sw.mixtureR = 0; ev = A.run(0.5);
  assert.deepEqual(ev.map(e => `${e.type}:${e.why}`), ['stop:右エンジン：ミクスチャー アイドル カットオフ']); assert.ok(sys.runningL && !sys.runningR && fl.s.eng[1].cut && !fl.s.eng[0].cut);
});

test('systems (R3): the twin\'s starts that do not work — said with the engine\'s side; flooded, then cleared', () => {
  const tries = [
    ['prime', A => twinPrep(A, 0, { prime: 0.5 }), NOCATCH.twinPrime],
    ['mags', A => twinPrep(A, 0, { mags: [false, false] }), NOCATCH.twinMags],
    ['magL', A => twinPrep(A, 0, { mags: [false, true] }), NOCATCH.twinMagL],
    ['fuel', A => { A.sw.fuelSelL = 'OFF'; twinPrep(A, 0); }, NOCATCH.twinFuel],
    ['flooded', A => twinPrep(A, 0, { prime: PRIME.flood + 1 }), NOCATCH.twinFlooded],
  ];
  for (const [name, set, said] of tries) {
    const A = twinApron(); A.sw.master = true; A.fl.action('thrStep', 1); set(A);
    const ev = A.run(9);
    assert.ok(!A.sys.runningL, name);
    const no = ev.find(e => e.type === 'nocatch');
    assert.ok(no && no.why === said, `${name}: ${JSON.stringify(ev)}`);
    assert.equal(A.sw.start, false, `${name}: the starter is let go`);
  }
  // the right selector on XFEED draws on the left tank: it starts
  { const A = twinApron(); A.sw.master = true; A.sw.fuelSelR = 'XFEED'; twinPrep(A, 1); assert.ok(A.run(3).some(e => e.type === 'catch')); }
  // flooded: cranked with the throttle well open and the mixture at cut-off, the fuel is blown out and it catches
  { const A = twinApron(); A.sw.master = true; twinPrep(A, 0, { prime: PRIME.flood + 2 }); A.fl.s.thr = 0.6; const ev = A.run(6); assert.ok(A.sys.runningL, JSON.stringify(ev)); }
  // the mixture left at cut-off as it fires: it runs on the prime a moment, then stops, and why is said
  { const A = twinApron(); A.sw.master = true; A.fl.action('thrStep', 1); twinPrep(A, 0); const ev = A.run(9);
    assert.deepEqual(ev.map(e => e.type), ['crank', 'catch', 'stop']); assert.match(ev[2].why, /^左エンジン：.*ミクスチャーを進めなかった/); assert.ok(!A.sys.runningL); }
  // a warm engine (it ran a moment ago): no prime needed
  { const A = twinApron(); A.sw.master = true; A.fl.action('thrStep', 1); twinPrep(A, 0); A.run(2.5); A.sw.mixture = 1; A.run(2); A.sw.mixture = 0; A.run(3);
    assert.ok(!A.sys.runningL); twinPrep(A, 0, { prime: 0 }); const ev = A.run(2); A.sw.mixture = 1; ev.push(...A.run(2)); assert.ok(A.sys.runningL, JSON.stringify(ev)); }
  // no BATT MASTR: the starter does not turn
  { const A = twinApron(); twinPrep(A, 0); assert.deepEqual(A.run(2).map(e => e.type), ['nostarter']); }
});

test('systems (R3): the twin\'s run-up — each engine\'s magneto drops and the alternate air on its own gauge; the instructor\'s start; m1 bit-identical', () => {
  const A = twinApron(), { fl, sw, sys } = A;
  Object.assign(sw, { master: true, fuelPump: true, rFuelPump: true, magL: true, magR: true, rMagL: true, rMagR: true, mixture: 1, mixtureR: 1 });
  sys.autoStart(); fl.s.thr = 0.05;
  const ev = A.run(6);
  assert.deepEqual(ev.filter(e => e.type === 'catch').map(e => e.why), ['左エンジン', '右エンジン'], 'the instructor starts the left, then the right');
  assert.ok(sys.running);
  fl.s.thr = 0.67; A.run(4);
  const b = sys.twinLive.map(t => t.rpm);
  assert.ok(b.every(r => Math.abs(r - RUNUP.rpm) < 60), `run-up rpm ${b}`);
  const drop = (k, set) => { set(); A.run(0.5); const d = b[k] - sys.twinLive[k].rpm; Object.assign(sw, { magL: true, magR: true, rMagL: true, rMagR: true, altAir: false }); A.run(0.5); return d; };
  const lL = drop(0, () => { sw.magR = false; }), lR = drop(0, () => { sw.magL = false; }), rL = drop(1, () => { sw.rMagR = false; }), rR = drop(1, () => { sw.rMagL = false; });
  for (const [x, y] of [[lL, lR], [rL, rR]]) assert.ok(x > 50 && x <= RUNUP.maxDrop && y > 50 && y <= RUNUP.maxDrop && Math.abs(x - y) <= RUNUP.maxDiff, `drops ${x} ${y}`);
  assert.ok(Math.abs(sys.twinLive[1].rpm - b[1]) < 1, 'the other engine unchanged');
  const al = drop(0, () => { sw.altAir = true; });
  assert.ok(al > 15 && al < 80, `alternate air ${al}`);
  assert.ok(sys.running, 'still running after the checks');
  // a twin lesson flown with the systems updated every step: FLIGHT LAB's to the bit
  const ref = runLesson(FL, 'm1', 'basic');
  const f2 = createFlight(FL, { store: null }), sw2 = {}, s2 = createSystems(sw2);
  f2.startLesson('m1', 'basic', { sens: 'low', autoRud: !!FL.school.lesson('m1').autoRud }); s2.setRunning(f2.s);
  const bot = makeBot(FL);
  const L = f2.runScripted((L, dt) => { bot.fly(L, dt); s2.update(dt, L.s); });
  assert.equal(L.grade, ref.grade); assert.equal(L.score, ref.score); assert.equal(L.t, ref.t);
  assert.deepEqual(L.s.pos, ref.s.pos); assert.deepEqual(JSON.stringify(L.results), JSON.stringify(ref.results));
});
