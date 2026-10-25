// CADET — the first day from end to end, without a screen (career/day.js with everything it drives): the walk-around
// (aircraft/walkaround.js), the checklists and the engine (aircraft/systems.js), the radio (dialog/atc.js), the taxiing
// (flight/taxi.js), FLIGHT LAB's lessons t1 → a2 → t3 flown by FLIGHT LAB's bot through CADET's flight bridge, the
// debrief (content/dialog/debrief.js) and the logbook (career/logbook.js).
//  - the day goes through every phase in order and ends signed in the logbook;
//  - each lesson's grade, score and record are bit-identical to FLIGHT LAB's runLesson for the same level;
//  - the walk-around: planted anomalies found and fixed, or missed (the instructor finds them, the debrief says so);
//  - crossing the hold-short line without a clearance is caught; a wrong read-back is corrected;
//  - (M7) the run-up's fault: the left magneto beyond its limit stops the day at that item; back to the stand (after a
//    lean run-up that does not clear it), no lesson flown, the debrief and the trust say what was decided.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDay, ORDER, planFor, stepsFor } from '../src/career/day.js';
import { debriefDialogs, DEBRIEF_HOOKS } from '../src/content/dialog/debrief.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createLogbook, entryFrom } from '../src/career/logbook.js';
import { playDay as play } from './helpers/play-day.mjs';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL;
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
// M4's first day (t1 → a2 → t3); the lessons by id
function playDay(opts = {}) {
  const r = play(FL, opts), ref = {}, got = {};
  r.got.forEach((L, i) => { got[L.id] = L; ref[L.id] = r.ref[i]; });
  return { ...r, ref, got };
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
  assert.deepEqual(book.totals(), { total: ent.total, dual: ent.total, solo: 0, xc: 0, inst: 0, me: 0, landings: 1, days: 1 });
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

// (M6) more anomalies on both aircraft: the lens, the brake (its stain on the apron), the nose strut, the trim tab, the
// papers (the cadet sends for them) — each can be planted, found and put right
test('day: the walk-around\'s later anomalies — planted on either aircraft, reported or put right, the brake\'s stain shown', async () => {
  const { createWalkaround, plant } = await import('../src/aircraft/walkaround.js');
  for (const aircraft of ['pa28', 'pa44']) {
    const ids = { lens: 'r_tip', brake: 'l_main', strut: 'nose', tab: 'tail', docs: 'docs' };
    const seen = new Set();
    for (let seed = 1; seed < 400; seed++) for (const id of plant(seed, { aircraft })) seen.add(id);
    for (const pid of Object.values(ids)) assert.ok(seen.has(pid), `${aircraft}: ${pid} can be planted`);
    const w = createWalkaround({ seed: 5, anomalies: Object.values(ids), aircraft });
    assert.equal(w.props().brakeLeak, true, `${aircraft}: the brake's stain`);
    for (const pid of Object.values(ids)) {
      const card = w.inspect(pid);
      assert.ok(card && card.choices.some(c => c.act === 'report'), `${aircraft} ${pid}: a card`);
      w.act(pid, 'report');
      if (w.inspect(pid).choices.some(c => c.act === 'fix')) w.act(pid, 'fix');                  // (the papers: sent for)
    }
    const s = w.summary();
    assert.equal(s.found, 5, `${aircraft}: all five found`);
    assert.equal(w.props().brakeLeak, false, `${aircraft}: the brake put right, no stain`);
  }
});

test('day (M7): the run-up\'s magneto fault — the day stops there, the cadet goes back to the stand, the debrief says why', () => {
  const ok = playDay({ fault: 'mag', faultChoices: ['burn', 'return'] }), sum = ok.day.summary();
  assert.ok(ok.phases.includes('runup') && !ok.phases.includes('tower') && !ok.phases.includes('t1'), `no take-off: ${ok.phases.join(' ')}`);
  assert.ok(['taxiIn', 'shutdown', 'debrief'].every(p => ok.phases.includes(p)), ok.phases.join(' '));
  assert.equal(sum.fault.decided, 'return'); assert.equal(sum.fault.tries, 1);
  assert.equal(sum.lessons.length, 0);
  assert.ok(sum.fault.drop > 175, `the drop seen ${sum.fault.drop}`);
  const lines = []; const r = createRunner({ data: debriefDialogs(sum), state: createDialogState() }); r.start('debrief');
  for (let k = 0; k < 30 && r.running; k++) { const v = r.view(); lines.push(v.text); if (v.choices.length) r.choose(0); else r.next(); }
  assert.match(lines.join(''), /離陸をやめて戻ったのは、正しい判断です/); assert.match(lines.join(''), /プラグを焼き/);
  // going anyway: the instructor takes it back; the trust goes down
  const bad = playDay({ fault: 'mag', faultChoices: ['go'] }).day.summary();
  assert.equal(bad.fault.decided, 'go'); assert.ok(bad.trust < sum.trust, `${bad.trust} < ${sum.trust}`);
  assert.equal(validateDialogs(debriefDialogs(sum), { hooks: DEBRIEF_HOOKS }).errors.length, 0);
});

test('day (M7): the debrief in three voices — the instructor, the chief instructor, the examiner — the same facts, their own words', () => {
  const { day } = playDay({ level: 'basic' });
  const sum = { ...day.summary(), tem: { threat: { id: 'check', ja: '審査の緊張' }, named: true } };
  const read = (voice) => {
    const data = debriefDialogs(sum, { voice });
    assert.equal(validateDialogs(data, { hooks: DEBRIEF_HOOKS }).errors.length, 0, voice);
    const lines = []; const r = createRunner({ data, state: createDialogState() }); r.start('debrief');
    for (let k = 0; k < 40 && r.running; k++) { const v = r.view(); lines.push(v.text); if (v.choices.length) r.choose(0); else r.next(); }
    return lines;
  };
  const ins = read('instructor'), chief = read('chief'), exam = read('examiner');
  for (const L of [chief, exam]) {
    assert.notEqual(L[0], ins[0]); assert.notEqual(L[L.length - 1], ins[ins.length - 1]);
    // the facts (the walk-around, the radio, the lessons) are the same lines
    assert.ok(ins.filter(x => /^課目です/.test(x)).every(x => L.includes(x)));
  }
  assert.match(exam.join(''), /記録/); assert.match(chief.join(''), /審査/);
  assert.notEqual(chief.join(''), exam.join(''));
});
