// CADET — next-wave item 2 (emergency lessons) wiring: e4/i8/e6 sit in the career's chapters, the day's
// plan rounds them like their neighbours (e3's forced landing, i3's partial panel, m4's engine failure),
// and their growth stays on the existing axes (an 'e' lesson grows judgement, an 'i' lesson knowledge —
// career.lessonGrowth's letter rule, no new plumbing).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CH2, STAGE, gate, newCareer, lessonGrowth } from '../src/career/career.js';
import { planFor, stepsFor, endKind } from '../src/career/day.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL;

test('emergency lessons are in the career chapters, in syllabus order', () => {
  assert.deepEqual(CH2.slice(CH2.indexOf('e3'), CH2.indexOf('e3') + 3), ['e3', 'e4', 't1'], 'e4 after e3 in chapter 2');
  assert.deepEqual(STAGE.ch4.lessons, ['i1', 'i2', 'i3', 'i8', 'i4', 'i5', 'i6', 'i7'], 'i8 (partial panel) after i3, then the hold, ILS, RNAV i6 and IMC i7');
  assert.deepEqual(STAGE.ch5.lessons, ['m1', 'm2', 'm3', 'm4', 'e6', 'm5'], 'e6 before the single-engine landing in the twin chapter');
  for (const id of ['e4', 'i8', 'e6']) assert.ok(FL.school.lesson(id), `${id} resolves in FLIGHT LAB's syllabus`);
});

test('the gates ask for the new lessons like any other (nothing skipped, nothing extra)', () => {
  const rec = { tries: 1, best: 'A', pass: true, levels: ['basic'] };
  const prog = { lessons: Object.fromEntries(CH2.filter(id => id !== 'e4').map(id => [id, rec])) };
  const s = { ...newCareer(7), chapter: 'ch2' };
  assert.ok(gate(s, prog, 80).some(x => /e4/.test(x)), 'chapter 2 is not done without e4');
  prog.lessons.e4 = rec;
  assert.ok(!gate(s, prog, 80).some(x => /e4/.test(x)), 'e4 passed: no longer missing');
});

test('the day plans round the new lessons as their neighbours are rounded', () => {
  const P = (id) => planFor(FL, id).lessons.join(' ');
  assert.equal(P('e4'), 't1 e4 t3', 'the forced landing flies between the take-off and the landing, like e3');
  assert.equal(endKind(FL, 'e4'), 'failed', 'the day recovers the aircraft after e4, like e3');
  assert.equal(P('i8'), 't1 i8 t3');
  assert.equal(P('e6'), 'e6 m5', 'the twin drill takes off itself and lands with m5, like m4');
  assert.equal(endKind(FL, 'e6'), 'air');
  assert.doesNotThrow(() => stepsFor(FL, planFor(FL, 'e4').lessons));
  assert.doesNotThrow(() => stepsFor(FL, planFor(FL, 'e6').lessons));
});

test('growth stays on the existing axes: e-lessons grow judgement, i8 knowledge', () => {
  const axes = (id) => Object.fromEntries(lessonGrowth('A', 'basic', id));
  assert.ok(axes('e4').judge > 0 && axes('e6').judge > 0, 'emergency lessons grow JUDGE via the e rule');
  assert.ok(axes('i8').know > 0, 'i8 grows KNOW via the i rule');
  assert.ok(axes('e4').hand > 0 && axes('e4').comm === 0.6, 'the hand and the fixed comm crumb, as every flight');
});
