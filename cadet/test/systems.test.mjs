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
import { makeBot, runLesson } from '../../flight-lab/test/bot.mjs';
import { createFlight } from '../src/flight/flight.js';
import { createSystems, RUNUP, COLD } from '../src/aircraft/systems.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
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
  sw.mag = 'BOTH'; A.run(0.5);
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
  assert.equal(sw.master, true); assert.equal(sw.mag, 'BOTH'); assert.equal(sw.mixture, 1);
  const bot = makeBot(FL);
  const L = fl.runScripted((L, dt) => { bot.fly(L, dt); sys.update(dt, L.s); });
  assert.equal(L.grade, ref.grade); assert.equal(L.score, ref.score); assert.equal(L.t, ref.t);
  assert.deepEqual(L.s.pos, ref.s.pos); assert.deepEqual(L.s.q, ref.s.q);
  assert.deepEqual(JSON.stringify(L.results), JSON.stringify(ref.results));
  assert.ok(sys.running && sys.rpm > 2000);
});
