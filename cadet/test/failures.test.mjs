// CADET — next-wave item 4: seeded random failures + the preflight inspection's defects.
//  - the roll is a pure function of (seed, day): reproducible, eligible days only (a normal
//    flight day — never a written test, a checkride/XC, a solo, or a chapter's first lesson),
//    at the stated probability, in the career kind set only (no engine/AHRS/GPS ambush in a
//    scored career; gear twin-only; no static block on an instrument lesson);
//  - the instructor console: a reservation by minutes / by altitude, due exactly then;
//  - the walk-around's new points (the left fuel cap, the pitot tube's blockage, the Archer's
//    static port) plant, are found, and — left behind — read out of walk.consequences() as
//    the EXISTING flight hooks (PS1 pitot, the static block, the EN4 oil quantity), and those
//    hooks do what they always did on the physics state (failNow);
//  - a day captures the consequences at boarded() (before the instructor's settle) and its
//    summary carries them; finding a defect grows JUDGE only through career.grow itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAIL_KINDS, CAREER_FAIL_KINDS, RANDOM_FAIL_P, isEligibleDay, randomFailureFor, makeSchedule, failureDue, dueSchedule, scheduleOf, preflightJudgeBase, PREFLIGHT_HOOKS } from '../src/aircraft/failures.js';
import { createWalkaround, plant } from '../src/aircraft/walkaround.js';
import { createDay } from '../src/career/day.js';
import { createCareer } from '../src/career/career.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL;
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

test('failures: the roll is reproducible in (seed, day) and only fires on eligible days', () => {
  for (let seed = 1; seed <= 60; seed++) for (let day = 1; day <= 30; day++) {
    const a = randomFailureFor({ seed, day, kind: 'flight', aircraft: 'pa44', lessonId: 'x1' });
    assert.deepEqual(randomFailureFor({ seed, day, kind: 'flight', aircraft: 'pa44', lessonId: 'x1' }), a, `seed ${seed} day ${day}`);
    if (a) assert.ok(CAREER_FAIL_KINDS.includes(a.kind) && a.prob === RANDOM_FAIL_P, a.kind);
  }
  // never on a test / checkride / xc / solo day, nor on a chapter's first lesson — for any seed
  for (let seed = 1; seed <= 200; seed++) for (let day = 1; day <= 20; day++) {
    for (const bad of [{ kind: 'exam' }, { kind: 'checkride' }, { kind: 'xc' }, { kind: 'solo' }, { kind: 'flight', exam: true }, { kind: 'flight', checkride: true }, { kind: 'flight', firstLesson: true }, { kind: '' }])
      assert.equal(randomFailureFor({ seed, day, aircraft: 'pa44', lessonId: 'x1', ...bad }), null, JSON.stringify(bad));
  }
  assert.equal(isEligibleDay({ kind: 'flight' }), true);
  assert.equal(isEligibleDay({ kind: 'flight', firstLesson: true }), false);
  // the twin-only and instrument-lesson guards, over the whole roll space
  for (let seed = 1; seed <= 200; seed++) for (let day = 1; day <= 20; day++) {
    const a28 = randomFailureFor({ seed, day, kind: 'flight', aircraft: 'pa28', lessonId: 'a2' });
    if (a28) assert.notEqual(a28.kind, 'gear', 'no gear fault on a fixed-gear Archer');
    const ai = randomFailureFor({ seed, day, kind: 'flight', aircraft: 'pa28', lessonId: 'i3' });
    if (ai) assert.notEqual(ai.kind, 'static', 'no static block on an instrument lesson');
    const free = randomFailureFor({ seed, day, kind: 'free', mode: 'free', aircraft: 'pa44' });
    if (free) assert.ok(FAIL_KINDS.includes(free.kind), free.kind);
  }
});

test('failures: the measured rate over the roll space is the stated 0.20 (±0.04)', () => {
  let n = 0, hits = 0; const kinds = {};
  for (let seed = 1; seed <= 250; seed++) for (let day = 1; day <= 40; day++) {
    n++; const r = randomFailureFor({ seed, day, kind: 'flight', aircraft: 'pa44', lessonId: 'x1' });
    if (r) { hits++; kinds[r.kind] = (kinds[r.kind] || 0) + 1; }
  }
  const p = hits / n;
  assert.ok(Math.abs(p - RANDOM_FAIL_P) < 0.04, `measured ${p.toFixed(3)} over ${n} days (${JSON.stringify(kinds)})`);
  assert.ok(Object.keys(kinds).length >= 5, `several kinds occur: ${Object.keys(kinds)}`);
});

test('failures: the instructor console — a reservation by time / by altitude, due exactly then', () => {
  assert.equal(makeSchedule('bogus', {}), null);
  assert.equal(makeSchedule('engine', { atMin: -1 }), null);
  assert.deepEqual(makeSchedule('engine', {}), { kind: 'engine', atMin: null, atAltFt: null });
  const byTime = makeSchedule('pitot', { atMin: 10 });
  assert.equal(failureDue(byTime, { elapsedMin: 9.9, altFt: 9000 }), false);
  assert.equal(failureDue(byTime, { elapsedMin: 10, altFt: 0 }), true);
  const byAlt = makeSchedule('engine', { atAltFt: 2000 });
  assert.equal(failureDue(byAlt, { elapsedMin: 99, altFt: 1999 }), false);
  assert.equal(failureDue(byAlt, { elapsedMin: 0, altFt: 2000 }), true);
  const list = [byTime, byAlt, makeSchedule('gps', {})];
  assert.deepEqual(dueSchedule(list, { elapsedMin: 0, altFt: 0 }).map(e => e.kind), ['gps'], 'an unreserved time/altitude fires at once');
  assert.deepEqual(dueSchedule(list, { elapsedMin: 10, altFt: 2000 }).map(e => e.kind), ['pitot', 'engine', 'gps']);
  // a free-flight random roll becomes a console entry through the same shape
  let rf = null; for (let seed = 1; seed < 500 && !rf; seed++) rf = randomFailureFor({ seed, day: 3, kind: 'free', mode: 'free', aircraft: 'pa28' });
  assert.ok(rf, 'a free roll exists in the seed space');
  const entry = scheduleOf(rf);
  assert.ok(entry && FAIL_KINDS.includes(entry.kind));
  assert.equal(failureDue(entry, { elapsedMin: 10000, altFt: 10000 }), true, 'and it does come due');
});

test('failures: the new preflight points plant on both aircraft, and are found the usual way', () => {
  for (const [aircraft, pid, badId] of [['pa28', 'l_cap', 'cap'], ['pa28', 'pitot_block', 'pitotBlock'], ['pa28', 'static', 'static'], ['pa44', 'l_cap', 'cap'], ['pa44', 'pitot_block', 'pitotBlock']]) {
    const seen = new Set();
    for (let seed = 1; seed < 600; seed++) for (const id of plant(seed, { aircraft })) seen.add(id);
    assert.ok(seen.has(pid), `${aircraft}: ${pid} can be planted`);
    const w = createWalkaround({ seed: 5, anomalies: [pid], aircraft });
    assert.deepEqual(w.planted, [pid]);
    const card = w.inspect(pid);
    assert.ok(card && card.seen.length > 0 && card.choices.some(c => c.act === 'report'), `${aircraft} ${pid}: a card with a report choice`);
    w.act(pid, 'report');
    if (w.inspect(pid).choices.some(c => c.act === 'fix')) w.act(pid, 'fix');
    assert.equal(w.summary().found, 1, `${aircraft} ${pid}: found and put right`);
    assert.deepEqual(w.consequences().filter(e => e.point === pid), [], `${aircraft} ${pid}: nothing left behind once fixed`);
    void badId;
  }
});

test('failures: left behind, a defect reads out as its existing flight hook — and the hook bites on the physics', () => {
  // the pitot cover left on (the task not done): the PS1 pitot path
  const w0 = createWalkaround({ seed: 5, anomalies: [], aircraft: 'pa28' });
  const pitotTask = w0.consequences().find(e => e.source === 'task' && e.item === 'pitot');
  assert.ok(pitotTask && pitotTask.hook === 'pitotRisk' && pitotTask.failKind === 'pitot', JSON.stringify(pitotTask));
  w0.act('pitot', 'task');
  assert.ok(!w0.consequences().some(e => e.item === 'pitot'), 'the cover off: no pitot consequence');
  // a blocked pitot tube, looked at and called fine: the same hook; a taped static port: the static hook; low oil: the quantity
  const w = createWalkaround({ seed: 5, anomalies: ['pitot_block', 'static', 'oil'], aircraft: 'pa28' });
  for (const pid of ['pitot_block', 'static', 'oil']) { w.inspect(pid); w.act(pid, 'ok'); }
  const fx = w.consequences();
  const byItem = Object.fromEntries(fx.map(e => [e.item, e]));
  assert.equal(byItem.pitotBlock.hook, 'pitotRisk'); assert.equal(byItem.pitotBlock.failKind, 'pitot');
  assert.equal(byItem.static.hook, 'staticBlocked'); assert.equal(byItem.static.failKind, 'static');
  assert.equal(byItem.oil.hook, 'oilQ'); assert.equal(byItem.oil.oilQ, 4);
  // the hooks are FLIGHT LAB's failNow states, and they do what they always did
  const L = FL.school.startFree('area', 'pa28'), s = L.s;
  FL.school.failNow(L, byItem.pitotBlock.failKind);
  assert.equal(s.pitotRisk, 3, 'PS1: the pitot risk is set (the tube blocks in the band, the heat cures it)');
  FL.school.failNow(L, byItem.static.failKind);
  assert.equal(s.staticBlocked, true, 'the static port is blocked (altimeter/VSI freeze until the alternate source)');
  for (const e of s.eng) e.oilQ = byItem.oil.oilQ;
  assert.ok(s.eng.every(e => e.oilQ === 4), 'the EN4 quantity the MFD and the pressure read');
  // the map itself: every task and every flight-hook defect is spelled out
  for (const t of ['pitot', 'lock', 'tieR', 'tieL', 'tieT', 'chocks']) assert.ok(PREFLIGHT_HOOKS.task[t], `task ${t}`);
  assert.equal(PREFLIGHT_HOOKS.defect.cap.hook, 'ground', 'a fuel cap is a ground fix, honestly not a flight state');
});

test('failures: a day captures the consequences at boarded(), before the settle, and its summary carries them', () => {
  const day = createDay(FL, { seed: 5, anomalies: ['pitot_block'] });
  // the cadet boards without the walk-around: the cover is still on, the tube still blocked
  day.boarded();
  assert.equal(day.phase, 'prestart');
  const fx = day.st.preflightEffects;
  assert.ok(fx.some(e => e.source === 'task' && e.item === 'pitot' && e.hook === 'pitotRisk'), JSON.stringify(fx));
  assert.ok(fx.some(e => e.source === 'defect' && e.item === 'pitotBlock' && e.failKind === 'pitot'), JSON.stringify(fx));
  assert.deepEqual(day.summary().preflightEffects, fx, 'the summary carries the capture');
  assert.deepEqual(day.summary().walk.tasksLeft.length > 0, true, 'the settle still records what the instructor had to do');
  // a static day fault is a day fault of its own kind
  assert.equal(createDay(FL, { fault: 'static' }).st.fault.kind, 'static');
  assert.equal(createDay(FL, { fault: 'static' }).summary().dayFault, 'static');
  assert.equal(createDay(FL, {}).st.fault, null);
});

test('failures: finding defects grows JUDGE only through career.grow (its own formula, its repeat factor)', () => {
  assert.equal(preflightJudgeBase(0), 0); assert.equal(preflightJudgeBase(1), 0.5);
  assert.equal(preflightJudgeBase(2), 1.0); assert.equal(preflightJudgeBase(9), 1.0, 'capped at a day’s 1.0');
  const C = createCareer({ store: memStore(), seed: 7 });
  const before = C.abilities.judge;
  C.grow('judge', preflightJudgeBase(2), `preflight:${C.day}`);
  const once = C.abilities.judge;
  assert.ok(Math.abs(once - (before + 1.0 * (1 - before / 130))) < 1e-9, `grow's own formula: ${before} → ${once}`);
  C.grow('judge', preflightJudgeBase(2), `preflight:${C.day}`);
  assert.ok(C.abilities.judge - once < once - before, 'the same key again counts for less (the repeat factor is career.js’s)');
  assert.ok(C.abilities.hand === 10 && C.abilities.know === 5, 'no other axis moved — and no ability ever touches the flying');
});
