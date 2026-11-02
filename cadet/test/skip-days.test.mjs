// CADET — すべて無視して進める (skip everything): the user-ordered counterpart to 時間を進める.
// Where the careful advance is compressed living that stops at every mandatory item, the skip
// resolves every mandatory item in the span as スキップ — honestly recorded, never as passed or
// flown: no ability growth, no exam tries, no check passes, no sectors or block minutes — while
// the per-day bookkeeping (the same sleepMutate/chapterMutate nights) applies unchanged, and
// the chapter/phase gates treat the skipped requirements as satisfied for progression only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareer, newCareer, cleanCareer, schedule, gate, passedAt, skipTargetsOf, previewSkipDays, ABILITY_START, CLASSES, GROUND, CH2 } from '../src/career/career.js';

const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const rec = (levels = ['basic']) => ({ tries: 1, best: 'S', pass: true, levels });
const progWith = (ids, levels) => ({ lessons: Object.fromEntries(ids.map(id => [id, rec(levels)])) });
const EMPTY_SKIPPED = { lessons: [], classes: [], exams: [], checks: [], events: [], duties: 0, dutyBlockMin: 0, solo: false, night: false, lineCheck: false };

test('skip: the state carries an empty skipped record by default, and old saves read as one', () => {
  assert.deepEqual(newCareer(5).skipped, EMPTY_SKIPPED);
  assert.deepEqual(cleanCareer({ v: 3, seed: 5 }).skipped, EMPTY_SKIPPED, 'a save from before the record was kept');
  assert.deepEqual(cleanCareer({ v: 2, seed: 5 }).skipped, EMPTY_SKIPPED);
  assert.deepEqual(cleanCareer({ v: 1, seed: 5 }).skipped, EMPTY_SKIPPED);
});

test('skip: the targets a phase offers — cadet chapters and graduation, the FO milestone, nothing else', () => {
  const at = (tune) => { const C = createCareer({ store: memStore(), seed: 5 }); tune(C.state); return C.state; };
  assert.deepEqual(skipTargetsOf(at(s => { s.chapter = 'prologue'; })), ['chapter', 'graduation']);
  assert.deepEqual(skipTargetsOf(at(s => { s.chapter = 'ch3'; s.done.prologue = 1; })), ['chapter', 'graduation']);
  assert.deepEqual(skipTargetsOf(at(s => { s.chapter = 'ch6'; s.done.prologue = 1; })), ['graduation'], 'the last chapter: graduation is the boundary');
  assert.deepEqual(skipTargetsOf(at(s => { s.chapter = 'ch6'; s.done.prologue = 1; s.graduated = { day: 40, rank: '通常' }; })), [], 'graduated: the FO entry is a choice, not a time boundary');
  assert.deepEqual(skipTargetsOf(at(s => { s.chapter = 'ch7'; s.done.prologue = 1; s.graduated = { day: 40, rank: '通常' }; })), [], 'the endorsement is open-ended: no onward milestone');
  assert.deepEqual(skipTargetsOf(at(s => { s.chapter = 'fo2'; s.graduated = { day: 40, rank: '通常' }; s.fo.hired = true; })), ['fo']);
  assert.deepEqual(skipTargetsOf(at(s => { s.chapter = 'fo2'; s.graduated = { day: 40, rank: '通常' }; s.fo.hired = true; s.fo.done = true; })), [], '一人前 reached: nothing left to skip to');
});

test('skip (cadet): from mid-chapter-1 to the chapter boundary — everything skipped, nothing grown', () => {
  const tune = (s) => { s.chapter = 'ch1'; s.day = 2; s.done.prologue = 1; s.done['class:0'] = 1; s.fatigue = 80; };
  const prog = progWith(['k1']);   // k1 flown and passed for real; everything else untouched
  const C = createCareer({ store: memStore(), seed: 5 }); tune(C.state);
  const before = JSON.stringify(C.state);
  const p = previewSkipDays(C.state, prog, { target: 'chapter' });
  assert.equal(JSON.stringify(C.state), before, 'the preview does not touch the state');
  assert.ok(p && p.chapter === 'ch2', JSON.stringify(p && { chapter: p.chapter, days: p.days }));
  const applied = C.skipDays(prog, { target: 'chapter' });
  assert.deepEqual(applied, p, 'the applied skip is the previewed skip');
  const s = C.state;
  assert.equal(s.chapter, 'ch2');
  assert.equal(s.day, p.day); assert.equal(s.slot, 'morning');
  // the classes not attended are recorded skipped (class 0 was attended for real, on day 1)
  assert.deepEqual([...s.skipped.classes].sort(), ['1', '2', '3', '4', '5']);
  // the device lessons not flown are recorded skipped; k1, passed for real, is not among them
  for (const id of GROUND.slice(1)) assert.ok(s.skipped.lessons.includes(id), id);
  assert.ok(!s.skipped.lessons.includes('k1'), 'a lesson really passed is not a skip');
  // the written test: skipped — not passed, not even a try on its record
  assert.deepEqual(s.skipped.exams, ['written1']);
  assert.ok(!(s.exams.written1 && s.exams.written1.pass), 'not a pass');
  assert.equal((s.exams.written1 || { tries: 0 }).tries, 0, 'not a try');
  // no growth, and the nights rested exactly as nights do (80 − 50 a night, floored)
  assert.deepEqual(s.abilities, { ...ABILITY_START });
  assert.equal(s.fatigue, Math.max(0, 80 - 50 * p.days));
  assert.equal(CLASSES.length, 6);
});

test('skip (cadet): to graduation — a coherent graduated state, the exams visibly skipped, FO entry open', () => {
  const C = createCareer({ store: memStore(), seed: 5 });
  C.state.chapter = 'ch1'; C.state.day = 2; C.state.done.prologue = 1;
  const prog = {};
  const p = C.previewSkip(prog, { target: 'graduation' });
  assert.ok(p, 'the preview finds the graduation morning');
  const applied = C.skipDays(prog, { target: 'graduation' });
  assert.deepEqual(applied, p);
  const s = C.state;
  assert.equal(s.chapter, 'ch6');
  assert.equal(s.graduated, null, 'the ceremony itself is not skipped: it waits on its morning');
  assert.ok(schedule(s, prog).some(x => x.kind === 'graduation'), 'the landing morning offers the graduation');
  // every written test of the career was skipped — none passed, none tried
  for (const id of ['written1', 'presolo', 'nav', 'instr', 'multi', 'final']) {
    assert.ok(s.skipped.exams.includes(id), id);
    assert.ok(!(s.exams[id] && s.exams[id].pass), `${id} not passed`);
    assert.equal((s.exams[id] || { tries: 0 }).tries, 0, `${id} not tried`);
  }
  // every check skipped, none passed; the last lessons and the night flight skipped, none flown
  for (const id of ['xc', 'ir', 'me', 'final']) {
    assert.ok(s.skipped.checks.includes(id), id);
    assert.ok(!(s.checks[id] && s.checks[id].pass), `${id} not passed`);
  }
  assert.ok(s.skipped.lessons.includes('r1'));
  assert.equal(s.skipped.night, true, 'the night flight was skipped, not flown');
  assert.equal(s.skipped.solo, true, 'the first solo was skipped, not flown');
  assert.equal(s.solo, null, 'no solo on the record');
  assert.deepEqual(s.abilities, { ...ABILITY_START }, 'a whole career skipped: nothing grown');
  assert.deepEqual(prog, {}, 'the flight record was never touched');
  // the graduation itself still happens, judged on the actual record (no tries, no first tries)
  C.graduate(prog);
  assert.ok(s.graduated && s.graduated.day === s.day);
  assert.equal(s.graduated.examTries, 0, 'skipped tests are not tries');
  assert.equal(s.graduated.firstRate, 0);
  assert.ok(['優等', '優秀', '通常'].includes(s.graduated.rank));
  // and the airline door is open afterwards
  assert.equal(C.beginFirstOfficer(), true);
  assert.equal(s.chapter, 'fo1');
});

test('skip (cadet): the solo gate is waived for progression only — the solo stays unflown', () => {
  // everything of chapter 2 passed for real, but trust 0 and no judgement: the solo is never
  // offered by the schedule (its t2 filler instead). The skip resolves the solo as skipped.
  const C = createCareer({ store: memStore(), seed: 5 });
  const s = C.state;
  s.chapter = 'ch2'; s.day = 30; s.done.prologue = 1; s.abilities.judge = 0;
  s.exams.presolo = { tries: 1, best: 90, pass: true };
  const prog = progWith([...CH2, 'c1']);
  const p = C.previewSkip(prog, { target: 'chapter', trust: 0 });
  assert.ok(p && p.chapter === 'ch3' && p.days === 1, JSON.stringify(p && { chapter: p.chapter, days: p.days }));
  C.skipDays(prog, { target: 'chapter', trust: 0 });
  assert.equal(s.chapter, 'ch3');
  assert.equal(s.skipped.solo, true);
  assert.equal(s.solo, null, 'the record keeps the truth: no solo was flown');
  assert.equal(s.skipped.lessons.length, 0, 'lessons really passed are not recorded as skips');
});

test('skip: gates read skipped as satisfied for progression, and only there — the truth stays in the records', () => {
  const C = createCareer({ store: memStore(), seed: 5 });
  const s = C.state;
  s.chapter = 'ch3'; s.done.prologue = 1;
  assert.ok(gate(s, {}).length > 0, 'nothing done: the gate is shut, as ever');
  s.skipped.lessons.push('x3', 'x1', 'x2', 'n1', 'n2', 'n3');
  s.skipped.exams.push('nav');
  s.skipped.checks.push('xc');
  assert.deepEqual(gate(s, {}), [], 'all skipped: the gate opens for progression');
  assert.equal(passedAt({}, 'x3'), false, 'and the lesson is still not passed anywhere');
});

test('skip (FO): through the type rating to 一人前 — duties and the line check skipped, no sectors, no block minutes', () => {
  const C = createCareer({ store: memStore(), seed: 5 });
  const s = C.state;
  s.chapter = 'ch6'; s.day = 50; s.graduated = { day: 49, rank: '通常' };
  assert.equal(C.beginFirstOfficer(), true);
  // the type rating by skipping to the chapter boundary (fo2)
  const p1 = C.skipDays({}, { target: 'chapter' });
  assert.ok(p1 && s.chapter === 'fo2', JSON.stringify(p1 && { chapter: p1.chapter }));
  assert.ok(s.skipped.exams.includes('type'));
  for (const id of ['j1', 'j2', 'j3', 'j4']) assert.ok(s.skipped.lessons.includes(id), id);
  assert.ok(s.skipped.checks.includes('typerate'));
  assert.ok(!(s.checks.typerate && s.checks.typerate.pass), 'the type check was not passed');
  // then the line flying itself, to the 一人前 boundary
  const p2 = C.previewSkip({}, { target: 'fo' });
  assert.ok(p2, 'the preview finds the boundary');
  const applied = C.skipDays({}, { target: 'fo' });
  assert.deepEqual(applied, p2);
  assert.equal(s.fo.done, true, 'the phase boundary is reached');
  assert.equal(s.fo.lineCheck, 'skip', 'the line check is recorded as skipped — not passed, not failed');
  assert.equal(s.skipped.lineCheck, true);
  assert.equal(s.fo.sectors, 0, 'no duty was flown: no sectors');
  assert.equal(s.fo.blockMin, 0, 'and no block minutes');
  assert.equal(s.fo.evalN, 0, 'and no evaluations');
  assert.ok(s.skipped.duties >= 12, `the duties that would have made the check due were skipped (${s.skipped.duties})`);
  assert.ok(s.skipped.dutyBlockMin >= 900, `their block minutes, as a shadow only (${s.skipped.dutyBlockMin})`);
  assert.equal(s.day, p2.day, 'landed on the morning after the boundary resolved');
});

test('skip: the markers round-trip through a save — and a skipped line check is never cleaned into a pass', () => {
  const C = createCareer({ store: memStore(), seed: 5 });
  const s = C.state;
  s.chapter = 'ch6'; s.day = 50; s.graduated = { day: 49, rank: '通常' };
  C.beginFirstOfficer();
  C.skipDays({}, { target: 'fo' });
  const clean = cleanCareer(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(clean.skipped, s.skipped, 'every marker kept');
  assert.equal(clean.fo.lineCheck, 'skip', 'the truth survives the save');
  assert.equal(clean.fo.done, true);
  // a hand-made skip record with junk in it is cleaned to the honest shape
  const dirty = cleanCareer({ v: 3, seed: 5, skipped: { lessons: ['a1', 'a1', 'NO WAY!', 7], duties: -4, dutyBlockMin: 12.6, solo: 1 } });
  assert.deepEqual(dirty.skipped.lessons, ['a1']);
  assert.equal(dirty.skipped.duties, 0);
  assert.equal(dirty.skipped.dutyBlockMin, 13);
  assert.equal(dirty.skipped.solo, true);
});
