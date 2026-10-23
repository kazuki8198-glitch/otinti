// CADET — the first day from end to end, without a screen (career/day.js with everything it drives): the walk-around
// (aircraft/walkaround.js), the checklists and the engine (aircraft/systems.js), the radio (dialog/atc.js), the taxiing
// (flight/taxi.js), FLIGHT LAB's lessons t1 → a2 → t3 flown by FLIGHT LAB's bot through CADET's flight bridge, the
// debrief (content/dialog/debrief.js) and the logbook (career/logbook.js).
//  - the day goes through every phase in order and ends signed in the logbook;
//  - each lesson's grade, score and record are bit-identical to FLIGHT LAB's runLesson for the same level;
//  - the walk-around: planted anomalies found and fixed, or missed (the instructor finds them, the debrief says so);
//  - crossing the hold-short line without a clearance is caught; a wrong read-back is corrected.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeBot, runLesson } from '../../flight-lab/test/bot.mjs';
import { createFlight } from '../src/flight/flight.js';
import { createSystems } from '../src/aircraft/systems.js';
import { createDay, ORDER } from '../src/career/day.js';
import { routeOut, routeLineUp, routeIn, createTaxiPilot, exitFor } from '../src/flight/taxi.js';
import { debriefDialogs, DEBRIEF_HOOKS } from '../src/content/dialog/debrief.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createLogbook, entryFrom } from '../src/career/logbook.js';
import { POINTS } from '../src/content/walkaround-archer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
const FL = globalThis.FL, P = FL.physics, R = P.LAB_RWY;
const NOKEYS = { has: () => false };
const STAND = { a: 636.5, c: 207.6 };
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

// plays the day as a careful cadet would (the options make it less careful)
function playDay({ level = 'basic', anomalies = ['oil', 'r_sump'], skipWalk = [], wrongFirst = [], crossHold = false } = {}) {
  const day = createDay(FL, { seed: 3, level, anomalies, stand: STAND });
  // ---- the walk-around: every place looked at; anomalies reported (and fixed by the cadet where they can be)
  for (const p of POINTS) {
    if (skipWalk.includes(p.id)) continue;
    const card = day.walk.inspect(p.id);
    if (card.choices.some(c => c.act === 'task')) day.walk.act(p.id, 'task');
    const bad = day.walk.planted.includes(p.id);
    day.walk.act(p.id, bad ? 'report' : 'ok');
    if (day.walk.inspect(p.id).choices.some(c => c.act === 'fix')) day.walk.act(p.id, 'fix');
  }
  // ---- in the seat: the aircraft as left on the stand
  const fl = createFlight(FL, { store: null }), sw = {}, sys = createSystems(sw);
  const [n, e] = P.rwyToNE(R, STAND.a, STAND.c);
  fl.startOnGround(n, e, (R.trueHdg + 270) % 360, 'pa28', { wind: { rel: 10, kt: 5, gust: 0.5 } });
  sys.setCold(fl.s);
  day.boarded();
  const phases = [day.phase], ref = {}, got = {};
  const pos = () => { const p = P.ne(fl.s); const rc = P.rwyCoords(R, p.n, p.e); return { a: rc.along, c: rc.cross }; };
  const ctx = (dt) => ({ dt, sw, sys, s: fl.s, park: fl.controls.parkBrake, av: fl.av, rpm: sys.rpm, pos: pos(), v: Math.hypot(fl.s.vel[0], fl.s.vel[2]), hdg: P.attitude(fl.s).hdg,
    onGround: fl.s.onGround, act: (a, x) => fl.action(a, x), setThr: (x) => { fl.s.thr = x; }, setFlaps: (i) => { fl.s.flapIdx = i; }, prime: () => sys.prime() });
  let taxi = null, assistT = 0;
  const said = [];
  const answer = () => { const v = day.atc.view(); if (v && v.phase === 'choose') { const right = day.atc.rightIndex(); const k = wrongFirst.includes(v.id) && !v.last ? (right + 1) % 3 : right; day.atc.answer(k); } };
  const fly = (id) => {
    fl.startLesson(id, level, { sens: 'low', autoRud: !!FL.school.lesson(id).autoRud }); sys.setRunning(fl.s);
    const bot = makeBot(FL);
    const L = fl.runScripted((L, dt) => { bot.fly(L, dt); sys.update(dt, L.s); for (const ev of day.atc.update(dt)) if (ev.type === 'say') said.push(ev.en); answer(); });
    ref[id] = runLesson(FL, id, level, 900); got[id] = L;
    const st = fl.status();
    const stop = pos();
    day.lessonEnded(id, { ...st, results: L.results, exit: exitFor(stop.a) });
    fl.continueFree();
    return stop;
  };
  for (let f = 0; f < 60 * 60 * 20 && day.phase !== 'debrief' && day.phase !== 'done'; f++) {
    const dt = 1 / 60;
    const ph = day.phase;
    // the cadet's hands: the current checklist item set (a little at a time), the radio answered, the taxiing
    if ((assistT -= dt) <= 0 && day.st.list && !(ph === 'taxiIn' && !day.items())) { assistT = 0.25; day.assist(ctx(0)); }
    answer();
    if (ph === 'taxiOut' && !taxi) { fl.action('parkBrake', false); taxi = createTaxiPilot(FL, routeOut(STAND)); }
    if (ph === 'lineup' && !taxi) { fl.action('parkBrake', false); taxi = createTaxiPilot(FL, routeLineUp(), { speed: 2.2, turnSpeed: 1.8 }); }
    if (ph === 'taxiOff' && !taxi) { fl.action('parkBrake', false); taxi = createTaxiPilot(FL, routeIn(pos(), STAND).off); }
    if (ph === 'taxiIn' && !taxi) { fl.action('parkBrake', false); taxi = createTaxiPilot(FL, routeIn({ a: day.st.exit === 'A2' ? 590 : 1160, c: 0 }, STAND).in); }
    // a careless cadet rolls over the hold-short line before the tower is called
    if (crossHold && ph === 'tower' && !day.st.incursion) { fl.action('parkBrake', false); taxi = createTaxiPilot(FL, [{ ...pos() }, { a: 17.5, c: 30, stop: true }]); }
    fl.frame(dt, NOKEYS, { pilot: taxi ? taxi.fly : null });
    for (const ev of sys.update(dt, fl.s)) if (ev.type === 'nocatch') throw new Error('no start: ' + ev.why);
    for (const ev of day.update(ctx(dt))) {
      if (ev.type === 'radio' && ev.kind === 'say') said.push(ev.en);
      if (ev.type !== 'phase') continue;
      phases.push(ev.to); taxi = null;
      if (['taxiOff', 'taxiIn', 'lineup', 'taxiOut'].includes(ev.to)) { /* set above */ }
      if (ev.to === 't1') fly('t1');
      if (ev.to === 'transit') { day.transitFlown('skip'); day.lessonStarted('a2'); fly('a2'); }
      if (ev.to === 't3') { day.atc.start('final'); fly('t3'); }
      if (['runup', 'shutdown'].includes(ev.to)) fl.action('parkBrake', true);
    }
  }
  return { day, fl, sys, phases, ref, got, said };
}

test('day: the whole first day, every phase in order — the lessons graded exactly as FLIGHT LAB grades them', () => {
  const { day, phases, ref, got, sys, said } = playDay();
  if (process.env.DBG) console.log(phases.join(' '), JSON.stringify(day.items()), JSON.stringify(day.st.memo), sys.rpm, sys.running, JSON.stringify(sys.sw));
  assert.deepEqual(phases, ORDER.slice(ORDER.indexOf('prestart'), ORDER.indexOf('debrief') + 1));
  for (const id of ['t1', 'a2', 't3']) {
    const a = got[id], b = ref[id];
    assert.ok(a.done && a.passed, `${id} passed`);
    assert.deepEqual([a.grade, a.score, a.t], [b.grade, b.score, b.t], `${id}: FLIGHT LAB's grade, score and time`);
    assert.equal(JSON.stringify(a.results), JSON.stringify(b.results), `${id}: FLIGHT LAB's rows`);
  }
  assert.ok(!sys.running, 'the engine is stopped');
  const sum = day.summary();
  assert.equal(sum.walk.anomalies, 2); assert.equal(sum.walk.found, 2); assert.equal(sum.walk.missed.length, 0);
  assert.equal(sum.radio.n, 13); assert.equal(sum.radio.first, 13);
  assert.ok(!sum.incursion);
  assert.ok(sum.blockT > 200, `block time ${sum.blockT}`);
  assert.ok(said.some(s => /cleared to land/.test(s)) && said.some(s => /line up and wait/.test(s)));
  assert.ok(sum.trust > 6, `a good day: ${sum.trust}`);
  // the run-up's readings were seen
  assert.ok(day.st.memo.dropL > 50 && day.st.memo.dropR > 50 && day.st.memo.carb > 30 && day.st.memo.idle);
  // the debrief: valid, it raises the trust, it opens the logbook; the logbook entry
  const data = debriefDialogs(sum);
  const { errors, warnings } = validateDialogs(data, {});
  assert.deepEqual(errors, []); assert.deepEqual(warnings, []);
  const state = createDialogState(), hooks = [];
  const r = createRunner({ data, state, hooks: { onHook: (n) => hooks.push(n) } });
  r.start('debrief');
  const lines = [];
  for (let k = 0; k < 30 && r.running; k++) { const v = r.view(); lines.push(v.text); if (v.choices.length) r.choose(0); else r.next(); }
  assert.ok(hooks.includes('logbook'));
  assert.ok(lines.some(l => /全部見つけました/.test(l)) && lines.some(l => /通常着陸/.test(l)), lines.join('\n'));
  assert.ok(state.trust.instructor > 50 && state.flags.day1_done);
  for (const h of hooks) assert.ok(DEBRIEF_HOOKS.includes(h));
  const book = createLogbook(memStore());
  const ent = book.add(entryFrom(sum, { date: '2026-10-23', remarks: lines[lines.length - 1], skippedSec: 600 }));
  assert.deepEqual(ent.lessons.map(l => [l.id, l.grade]), [['t1', ref.t1.grade], ['a2', ref.a2.grade], ['t3', ref.t3.grade]]);
  assert.equal(ent.landings, 1); assert.ok(ent.total >= 0.3 && ent.total < 1.5, `logged ${ent.total} h`);
  assert.deepEqual(book.totals(), { total: ent.total, dual: ent.total, landings: 1, days: 1 });
  assert.equal(createLogbook(null).entries.length, 0, 'no storage: an empty book, no error');
});

test('day: a careless cadet — anomalies missed, a rope left on, a wrong read-back, the hold-short line crossed', () => {
  const { day } = playDay({ level: 'intro', anomalies: ['oil', 'r_main'], skipWalk: ['oil', 'tail'], wrongFirst: ['gnd_rb'], crossHold: true });
  const sum = day.summary();
  assert.equal(sum.walk.missed.length, 1, 'the oil (never looked at) is missed'); assert.equal(sum.walk.found, 1, 'the tyre was found');
  assert.deepEqual(sum.walk.tasksLeft, ['tieT']);
  assert.equal(sum.radio.wrong, 1);
  assert.ok(sum.incursion);
  const lines = []; const r = createRunner({ data: debriefDialogs(sum), state: createDialogState() }); r.start('debrief');
  for (let k = 0; k < 30 && r.running; k++) { const v = r.view(); lines.push(v.text); if (v.choices.length) r.choose(0); else r.next(); }
  const all = lines.join('');
  assert.match(all, /見落としたのは「オイル（量とふた）」/); assert.match(all, /外し忘れたもの/); assert.match(all, /停止線を越えました/);
  assert.ok(sum.trust < 6);
});
