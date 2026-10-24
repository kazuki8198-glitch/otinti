// CADET — the first day's radio (content/dialog/atc.js, dialog/atc.js):
//  - every exchange has exactly one right answer and a reason for each wrong one; the controller corrects a wrong
//    answer ("negative") and asks again, the clock running out is noted as late and he calls again;
//  - every sequence runs to its end; the ATIS gives the lesson's own wind and altimeter (FLIGHT LAB's t1);
//  - the choices are shown shuffled (the same on every run), the call sign is today's (N738SY) everywhere, and
//    FLIGHT LAB's tower lines in a lesson are shown with it; no real operator is named.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dayRadio, ourCall, CALL, spoken } from '../src/content/dialog/atc.js';
import { createAtc } from '../src/dialog/atc.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL, SC = FL.school;
const REAL = /(?<![A-Za-z])ANA(?![A-Za-z])|ＡＮＡ|all\s*nippon|全日空|acron|garmin/i;
const radio = dayRadio({ windMag: 10, windKt: 5, qnh: 29.92 });
const run = (atc, sec) => { const ev = []; for (let t = 0; t < sec; t += 0.1) ev.push(...atc.update(0.1)); return ev; };
const allEx = () => Object.entries(radio.exchanges).flatMap(([id, x]) => (typeof x === 'function' ? [['A2', x('A2')], ['A3', x('A3')]].map(([k, v]) => [id + ':' + k, v]) : [[id, x]]));

test('atc: every exchange — one right answer, a reason for each wrong one, today\'s call sign, no real names', () => {
  for (const [id, x] of allEx()) {
    assert.equal(x.choices.filter(c => c.ok).length, 1, id);
    assert.equal(x.choices.length, 3, id);
    for (const c of x.choices) if (!c.ok) assert.ok(c.why && c.why.length > 8, `${id}: a reason for "${c.en}"`);
    const text = JSON.stringify(x);
    assert.ok(!/Lima Alpha|7LA/.test(text), `${id}: FLIGHT LAB's call sign`);
    assert.ok(!REAL.test(text), `${id}: a real name`);
    if (x.kind !== 'listen') assert.ok(x.choices.find(c => c.ok).en.includes('Archer'), `${id}: the right answer has the call sign`);
  }
  // the ATIS: the lesson's wind (FLIGHT LAB's t1 tower) and altimeter
  const L = SC.startLesson('t1', 'basic');
  assert.match(L.windStr, /^010 at 5$/);
  assert.match(radio.atisText, /Wind zero one zero at five/); assert.match(radio.atisText, /Altimeter two niner niner two/);
  assert.equal(L.s.qnh, 29.92);
  // FLIGHT LAB's tower in a lesson, with today's call sign; the speech says the short one in words
  const q = SC.ATC_Q.takeoff(L);
  assert.equal(ourCall(q.msg), `LAB Tower: "${CALL.full}, wind 010 at 5, runway 36, cleared for takeoff."`);
  assert.equal(ourCall(q.opts[q.ok]), `Runway 36, cleared for takeoff, ${CALL.short}.`);
  assert.equal(spoken(`Runway 36, ${CALL.short}.`), 'Runway 36, Archer Eight Sierra Yankee.');
});

test('atc: the sequences run through — right first time, a wrong answer corrected, late noted', () => {
  const atc = createAtc(radio);
  const said = [];
  const go = (seq, arg, pick = 'right') => {
    atc.start(seq, arg);
    for (let guard = 0; guard < 400 && atc.busy; guard++) {
      said.push(...run(atc, 0.5).filter(e => e.type === 'say'));
      const v = atc.view();
      if (v && v.phase === 'choose') {
        const k = pick === 'wrong-first' && v.last == null ? (atc.rightIndex() + 1) % 3 : atc.rightIndex();
        const r = atc.answer(k);
        assert.ok(r);
      }
    }
    assert.ok(!atc.busy, `${seq} ended`);
  };
  go('atis'); go('ground', null, 'wrong-first'); go('tower'); go('leave'); go('back'); go('final'); go('exit', 'A2'); go('groundIn', 'A2');
  const sum = atc.summary();
  assert.equal(sum.n, 13);
  assert.equal(sum.wrong, 2, 'the two exchanges answered wrong first');
  assert.equal(sum.first, 11);
  assert.ok(said.some(e => /negative|say again|Say again/.test(e.en)), 'a correction was heard');
  assert.ok(said.some(e => /line up and wait/.test(e.en)) && said.some(e => /cleared to land/.test(e.en)));
  // late: nobody answers, the controller calls again
  const b = createAtc(radio); b.start('leave');
  const ev = run(b, 40);
  assert.ok(ev.some(e => e.type === 'say' && /how do you hear/.test(e.en)));
  b.answer(b.rightIndex()); run(b, 3);
  assert.equal(b.summary().late, 1); assert.equal(b.summary().first, 0);
});

test('atc: the choices are shuffled, the same on every run', () => {
  const order = (seed) => { const a = createAtc(radio, { seed }); a.start('ground'); run(a, 1); return a.view().choices.map(c => c.en); };
  assert.deepEqual(order(11), order(11));
  const firsts = new Set(); for (let s = 1; s < 12; s++) { const a = createAtc(radio, { seed: s }); a.start('tower'); run(a, 1); firsts.add(a.rightIndex()); }
  assert.ok(firsts.size >= 2, 'the right answer is not always in the same place');
});
