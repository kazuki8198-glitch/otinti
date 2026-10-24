// CADET — every day of chapter 2, without a screen: for each of the 16 lessons before the first solo (a1–a8, t1–t4,
// e1–e3, c1) and for the first solo, the day planned around it (career/day.js planFor: the take-off t1 and the landing
// t3 where it needs them) is played from the walk-around to the debrief (test/helpers/play-day.mjs). The lessons are
// flown by FLIGHT LAB's bot (t2 with the circuit's shape: test/helpers/pattern-hook.mjs).
//  - the day goes through its steps in order (the moves between lessons skipped);
//  - every lesson flown is graded exactly as FLIGHT LAB's runLesson grades the same inputs, and passes;
//  - the day ends with the engine stopped on the stand; the landings are counted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planFor, stepsFor } from '../src/career/day.js';
import { playDay } from './helpers/play-day.mjs';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL;
export const CH2 = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't1', 't2', 't3', 't4', 'e1', 'e2', 'e3', 'c1'];

test('days: the plans — the take-off and the landing round each lesson, and the steps between', () => {
  const P = (id, o) => planFor(FL, id, o).lessons.join(' ');
  assert.equal(P('a5'), 't1 a5 t3'); assert.equal(P('e3'), 't1 e3 t3'); assert.equal(P('t1'), 't1 t3'); assert.equal(P('t2'), 't1 t2');
  assert.equal(P('t3'), 't1 t3'); assert.equal(P('t4'), 't1 t4 t3'); assert.equal(P('e1'), 'e1'); assert.equal(P('e2'), 'e2 t3'); assert.equal(P('c1'), 'c1 t3');
  assert.equal(P('t2', { solo: true }), 't1 t2 t2 t2');
  const S = (id, o) => stepsFor(FL, planFor(FL, id, o).lessons).filter(x => !['walk', 'prestart', 'start', 'afterStart', 'atis', 'ground', 'taxiOut', 'runup', 'tower', 'exit', 'taxiOff', 'groundIn', 'taxiIn', 'shutdown', 'debrief', 'done'].includes(x)).join(' ');
  assert.equal(S('a2'), 'lineup t1 leave transit a2 back return t3');
  assert.equal(S('t4'), 'lineup t1 closed pattern t4 closed pattern t3');
  assert.equal(S('e1'), 'lineup takeoff e1');
  assert.equal(S('e2'), 'lineup takeoff e2 recover t3');
  assert.equal(S('c1'), 'lineup c1 recover t3');
  assert.equal(S('t2', { solo: true }), 'lineup t1 closed pattern t2 stopgo recycle t2 stopgo recycle t2');
  assert.throws(() => stepsFor(FL, ['a2']), /runway/);
  assert.throws(() => stepsFor(FL, ['t1', 'a2']), /landing/);
});

for (const [name, plan] of [...CH2.map(id => [id, null]), ['solo', 'solo']]) {
  test(`days: the day of ${name === 'solo' ? 'the first solo' : name} — every step in order, every lesson graded as FLIGHT LAB grades it`, () => {
    const p = name === 'solo' ? planFor(FL, 't2', { solo: true }) : planFor(FL, name);
    const r = playDay(FL, { plan: p, anomalies: [] });
    const steps = stepsFor(FL, p.lessons);
    assert.deepEqual(r.phases, steps.slice(steps.indexOf('prestart'), steps.indexOf('debrief') + 1));
    assert.deepEqual(r.got.map(L => L.id), p.lessons);
    r.got.forEach((L, i) => {
      const b = r.ref[i];
      assert.ok(L.done && L.passed, `${L.id} passed: ${L.grade} ${L.reason || ''} ${JSON.stringify(L.results.flatMap(x => x.rows).filter(x => !x.pass))}`);
      assert.deepEqual([L.grade, L.score, L.t], [b.grade, b.score, b.t], `${L.id}: FLIGHT LAB's grade, score and time`);
      assert.equal(JSON.stringify(L.results), JSON.stringify(b.results), `${L.id}: FLIGHT LAB's rows`);
    });
    assert.ok(!r.sys.running, 'the engine is stopped');
    const sum = r.day.summary();
    assert.equal(sum.lessons.length, p.lessons.length);
    assert.equal(sum.landings, p.lessons.filter(id => ['t2', 't3', 'e1'].includes(id)).length);
    assert.equal(sum.solo, name === 'solo');
    assert.equal(sum.radio.wrong, 0); assert.equal(sum.radio.late, 0);
  });
}
