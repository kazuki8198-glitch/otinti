// CADET — 時間を進める (career time advance): compressed living, never a skip. The advance is
// proven EQUAL to living the same span night by night (the career state, field by field), and it
// stops on the morning of the next day that holds anything mandatory — a class, a lesson, a
// written test, a check, a duty, the booked remedial evening — without consuming any of it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareer, newCareer, schedule, isStopItem, stopItemsOf, previewAdvanceDays, isOff, CLASSES, GROUND } from '../src/career/career.js';

const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const rec = (levels = ['basic']) => ({ tries: 1, best: 'S', pass: true, levels });
const progWith = (ids, levels) => ({ lessons: Object.fromEntries(ids.map(id => [id, rec(levels)])) });
const careerAt = (seed, tune) => { const C = createCareer({ store: memStore(), seed }); tune(C.state); return C; };
// living the span by hand: the nights one by one, exactly as the game's sleep flow performs them
const liveThrough = (C, prog, nights, trust = 50) => { for (let n = 0; n < nights; n++) { C.sleep({}); C.advanceChapter(prog, trust); } };

test('time advance: what counts as a stop — duties and lessons yes, rest and self-study no, the booked remedial evening yes', () => {
  assert.equal(isStopItem({ kind: 'off' }), false);
  assert.equal(isStopItem({ kind: 'study', id: 'self' }), false);
  assert.equal(isStopItem({ kind: 'study', id: 'remedial' }), true, 'the booked remedial evening is a commitment');
  assert.equal(isStopItem({ kind: 'event', optional: true }), false, 'an item the schedule itself marks optional is not a stop');
  for (const kind of ['class', 'ftd', 'exam', 'flight', 'checkride', 'solo', 'line', 'linecheck', 'event', 'ceremony', 'night', 'xc', 'navlog']) assert.equal(isStopItem({ kind }), true, kind);
});

test('time advance (cadet): a weekend with nothing due advances to the Monday class — state identical to sleeping through', () => {
  // chapter 1, day 3 is a Saturday with classes due (a stop day itself); the Sunday holds only the
  // optional review, Monday holds the next class
  const tune = (s) => { s.chapter = 'ch1'; s.day = 3; s.done.prologue = 1; s.fatigue = 80; };
  const A = careerAt(5, tune), B = careerAt(5, tune);
  const before = JSON.stringify(A.state);
  const p = A.previewDays({});
  assert.equal(JSON.stringify(A.state), before, 'the preview does not touch the state');
  assert.ok(p && p.days === 2 && p.day === 5, JSON.stringify(p && { days: p.days, day: p.day }));
  assert.ok(p.items.some(x => x.kind === 'class'), 'it lands on the class day');
  const applied = A.advanceDays({});
  assert.deepEqual(applied, p);
  liveThrough(B, {}, p.days);
  assert.deepEqual(A.state, B.state, 'advanced state == lived state, field by field');
  assert.equal(A.state.fatigue, 0, 'two nights of rest, as two nights give (80 − 50 − 50, floored)');
  assert.equal(A.state.day, 5); assert.equal(A.state.slot, 'morning');
});

test('time advance (cadet): the written test is a stop — the advance lands on its morning and does not sit it', () => {
  const tune = (s) => { s.chapter = 'ch1'; s.day = 4; s.done.prologue = 1; for (let i = 0; i < CLASSES.length; i++) s.done[`class:${i}`] = 1; };
  const A = careerAt(5, tune);
  const p = A.previewDays(progWith(GROUND));
  assert.ok(p && p.days === 1 && p.items.some(x => x.kind === 'exam'), JSON.stringify(p));
  A.advanceDays(progWith(GROUND));
  assert.equal(A.state.day, 5);
  assert.equal(A.state.exams.written1, undefined, 'the test waits, unsat');
});

test('time advance: the booked remedial evening makes its day a stop; without it the same day is passed', () => {
  // an FO roster day off: the day itself holds nothing mandatory — until a remedial evening is
  // booked onto it (the booking is appended to the day's plan on the flying paths)
  const C = createCareer({ store: memStore(), seed: 5 });
  C.state.chapter = 'fo2'; C.state.graduated = { day: 49, rank: '優秀' }; C.state.fatigue = 10;
  let offDay = -1;
  for (let d = 60; d < 90 && offDay < 0; d++) { C.state.day = d; if (!isOff(d) && !stopItemsOf(C.state, {}).length && !schedule(C.state, {}).some(x => x.kind === 'line')) offDay = d; }
  assert.ok(offDay > 0, 'a roster day off exists');
  C.state.day = offDay - 1;
  const plain = C.previewDays({});
  assert.ok(!plain || plain.day !== offDay, 'unbooked, the day off is passed over');
  C.state.remedial = { day: offDay, label: '気象', seen: false, spoke: false };
  const p = C.previewDays({});
  assert.ok(p && p.day === offDay && p.days === 1, JSON.stringify(p));
  assert.deepEqual(p.items.map(x => x.id), ['remedial'], 'the remedial evening is the day\u2019s only stop');
});

test('time advance (cadet): after graduation the filler days hold nothing — no advance is offered across them', () => {
  const A = careerAt(5, (s) => { s.chapter = 'ch6'; s.day = 50; s.graduated = { day: 49, rank: '優秀' }; });
  assert.equal(A.previewDays({}), null);
  assert.equal(A.advanceDays({}), null);
  assert.equal(A.state.day, 50, 'nothing moved');
});

test('time advance (cadet): within the day — the next stop item at a later slot', () => {
  const A = careerAt(5, (s) => { s.chapter = 'ch1'; s.day = 2; s.done.prologue = 1; });
  // day 2 of chapter 1: am class, pm device lesson, the evening's event
  assert.deepEqual([A.state.slot, A.nextStop({})?.id], ['morning', '0']);
  A.state.slot = 'am'; assert.equal(A.nextStop({})?.id, 'k1');
  // by the afternoon the evening event has lapsed from the plan (it is offered while the morning's
  // class is pending or done) — unless the class WAS done today, when it is the evening's stop
  A.state.slot = 'pm'; assert.equal(A.nextStop({}), null);
  A.state.done['class:0'] = 2;
  assert.equal(A.nextStop({})?.kind, 'event');
  A.state.slot = 'evening'; assert.equal(A.nextStop({}), null, 'nothing later today');
});

test('time advance (FO): rest days advance to the next duty — fatigue and roster state identical to sleeping through', () => {
  const atFo2 = (seed) => {
    const C = createCareer({ store: memStore(), seed });
    C.state.chapter = 'ch6'; C.state.day = 50; C.state.graduated = { day: 49, rank: '優秀' };
    assert.equal(C.beginFirstOfficer(), true);
    C.exam('type', 90); C.check('typerate', true);
    assert.equal(C.state.chapter, 'fo2');
    return C;
  };
  // find, by living it on a scout career, a span of at least two stop-free mornings ending on a duty
  let start = -1, span = 0, landed = null;
  for (let d0 = 60; d0 < 90 && !landed; d0++) {
    const scout = atFo2(5); scout.state.day = d0; scout.state.fatigue = 10;
    let n = 0, items = null;
    for (; n < 30 && !items; n++) { scout.sleep({}); const it = stopItemsOf(scout.state, {}); if (it.length) items = it; }
    if (items && n >= 2) { start = d0; span = n; landed = items; }
  }
  assert.ok(landed, 'a rest span of at least two nights ending in a stop exists');
  assert.ok(landed.some(x => x.kind === 'line' || x.kind === 'linecheck'), JSON.stringify(landed));
  const A = atFo2(5); A.state.day = start; A.state.fatigue = 10;
  const B = atFo2(5); B.state.day = start; B.state.fatigue = 10;
  const p = A.previewDays({});
  assert.equal(p.days, span, 'the preview promises the scouted span');
  A.advanceDays({});
  liveThrough(B, {}, span);
  assert.deepEqual(A.state, B.state, 'advanced state == lived state, field by field');
  assert.equal(A.state.fo.sectors, 0, 'the duty was landed on, not flown');
});

test('time advance (FO): a duty day hidden by fatigue is rested through, then stopped at — never flown over', () => {
  const C = createCareer({ store: memStore(), seed: 5 });
  C.state.chapter = 'fo2'; C.state.graduated = { day: 49, rank: '優秀' };
  // find a roster duty day: fatigue low, a line item on it
  let dutyDay = -1;
  for (let d = 60; d < 90 && dutyDay < 0; d++) { C.state.day = d; C.state.fatigue = 10; if (stopItemsOf(C.state, {}).some(x => x.kind === 'line')) dutyDay = d; }
  assert.ok(dutyDay > 0);
  // the day before, exhausted: the roster day itself reads as a forced rest day (no stop)
  C.state.day = dutyDay - 1; C.state.fatigue = 70;
  const p = C.previewDays({});
  assert.ok(p && p.days === 1 && p.day === dutyDay, JSON.stringify(p && { days: p.days, day: p.day }));
  C.advanceDays({});
  assert.equal(C.state.day, dutyDay);
  assert.equal(C.state.fatigue, 20, 'one night of rest, as one night gives (70 − 50)');
  assert.ok(stopItemsOf(C.state, {}).some(x => x.kind === 'line'), 'the duty is there to be flown');
});

test('time advance (FO): the line check is a stop like any duty', () => {
  const C = createCareer({ store: memStore(), seed: 5 });
  C.state.chapter = 'fo2'; C.state.graduated = { day: 49, rank: '優秀' }; C.state.day = 60; C.state.fatigue = 10;
  C.state.fo.sectors = 12; C.state.fo.blockMin = 950;
  const p = C.previewDays({});
  assert.ok(p && p.days === 1 && p.items.some(x => x.kind === 'linecheck'), JSON.stringify(p));
});
