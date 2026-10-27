// CADET — k4 rebuilt (the brief's §7, the third problem): 交信のチェアフライト. The cadet is the pilot of the first flight
// (day 10's own radio, in day 10's order), the lecturer every controller: the switches set (COM1, the altimeter, the
// code, listening first), each call chosen (or said), the controller's answer — a wrong call corrected ("negative"), a
// late one asked again ("how do you hear?") — and the debrief that names the words a call left out. Scored: 80% passes;
// a run not passed is flown again the same day. Every run a little different. Done with no voice and no microphone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, readingSeconds, LINE_S } from '../tools/measure-ch1.mjs';
import { chairScript, radioPlan, FIRST_FLIGHT } from '../src/content/chair-flight.js';
import { createChairFlight, runChairFlight, chairLines, PASS } from '../src/dialog/chair-flight.js';
import { stepsFor, planFor, STEPS } from '../src/career/day.js';
import { keysOf } from '../src/dialog/readback.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { dayRadio } from '../src/content/dialog/atc.js';

const L = await load(), FL = L.FL, S = L.school;
const APP = /ゲーム|ソフト|プレイヤー|FLIGHT LAB|シミュレータ|キーボード|メニュー|[{}<>]/;
const LEAK = /Seven Lima Alpha|7LA/;
const right = (v, run) => run.rightIndex();

test('k4 flies day 10\'s radio in day 10\'s order — what the first flight asks, from career/day.js (t1 asks its own take-off clearance)', () => {
  // (day 10: the first flight, a1 — t1, a1 and t3 — as planFor makes it; its radio steps as stepsFor lays them out)
  const plan = planFor(FL, FIRST_FLIGHT), radio = dayRadio({});
  assert.deepEqual(plan.lessons, ['t1', 'a1', 't3']);
  const want = stepsFor(FL, plan.lessons).flatMap(st => (STEPS[st] && STEPS[st].radio ? radio.sequences[STEPS[st].radio] : st === 't1' ? ['twr_takeoff'] : st === 't3' ? radio.sequences.final : []));
  assert.deepEqual(want, ['atis', 'gnd_call', 'gnd_rb', 'twr_ready', 'twr_luaw', 'twr_takeoff', 'twr_leave', 'twr_back', 'twr_straight', 'twr_final', 'twr_land', 'twr_exit', 'gnd_in', 'gnd_in_rb']);
  assert.deepEqual(radioPlan(FL, plan.lessons, radio).flatMap(p => p.ids), want);
  for (let seed = 1; seed <= 40; seed++) {
    const sc = chairScript(FL, { seed }), ex = sc.items.filter(x => x.kind === 'ex').map(x => x.id);
    // (what changes from run to run is only added: the say-again after a garbled instruction)
    assert.deepEqual(ex.filter(id => id !== 'say_again'), want, `seed ${seed}`);
    // the calls as the day says them: the right one is day 10's own, with today's call sign
    const day = dayRadio({ ...sc.weather, intent: 'area' });
    const xs = sc.items.filter(x => x.kind === 'ex' && x.id !== 'say_again' && !/^twr_(back|straight|final|land|exit)$|^gnd_in/.test(x.id));
    for (const x of xs) { const d = day.exchanges[x.id]; assert.equal(x.ex.choices.find(c => c.ok).en, d.choices.find(c => c.ok).en, `seed ${seed} ${x.id}`); }
  }
});

test('k4: a dozen decisions and more, the switches real, no stretch without input over 60 s, a run within 5 minutes, every line short enough', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const sc = chairScript(FL, { seed });
    for (const stage of [1, 2, 3]) {
      const r = runChairFlight(sc, { stage, seed });
      assert.ok(r.run.done, `seed ${seed} stage ${stage}: done`);
      const lines = chairLines(r.run, readingSeconds);
      let gap = 0, longest = 0, t = 0, n = 0;
      for (const l of lines) { t += l.t; gap += l.t; if (l.decision) { n++; longest = Math.max(longest, gap); gap = 0; } }
      longest = Math.max(longest, gap);
      assert.ok(n >= 12, `seed ${seed}: ${n} decisions`);
      assert.ok(longest <= 60, `seed ${seed}: ${longest.toFixed(1)} s without input`);
      assert.ok(t <= 5 * 60, `seed ${seed} stage ${stage}: ${(t / 60).toFixed(2)} min`);
      for (const l of r.run.log) assert.ok(l.en.length <= 120 && !LEAK.test(l.en) && !APP.test(l.ja || ''), `seed ${seed}: "${l.en}"`);
    }
    // the switches of the textbook's script, set: COM1 for each station, the altimeter (the ATIS), the code, listening
    const ops = sc.items.filter(x => x.kind === 'op').map(x => x.id);
    for (const id of ['com:atis', 'com:ground', 'com:tower', 'com:back', 'com:groundIn', 'xpdr', 'listen', 'atis:letter', 'atis:again']) assert.ok(ops.includes(id), `seed ${seed}: ${id}`);
    for (const x of sc.items) {
      assert.ok(x.kind === 'op' ? x.choices.filter(c => c.ok).length === 1 : x.ex.choices.filter(c => c.ok).length === 1, `${x.id}: one right answer`);
      // (a choice is a button of the panel, wrapped: the first call to Ground is longer than a line, as day 10's own)
      for (const c of (x.kind === 'op' ? x.choices.map(c => c.t) : x.ex.choices.map(c => c.en))) assert.ok(c.length <= 160 && !LEAK.test(c), `${x.id}: ${c}`);
      assert.ok(!APP.test(x.kind === 'op' ? x.q : x.ex.q), x.id);
    }
  }
});

test('k4: every call the cadet makes has a word to hear besides the call sign; wrong and late bring different answers from the controller', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const sc = chairScript(FL, { seed });
    for (const x of sc.items.filter(i => i.kind === 'ex' && i.ex.kind !== 'listen')) for (const c of x.ex.choices) {
      assert.ok(keysOf(c.en, sc.radio.call).some(k => k.kind !== 'call'), `seed ${seed} ${x.id}: "${c.en}" has words of its own`);
    }
  }
  const sc = chairScript(FL, { seed: 7 });
  // a wrong call: the correction; no call in time (stage 3): "how do you hear?"
  const wrong = createChairFlight(sc, { stage: 3, seed: 7 });
  const to = (run, id) => { for (let k = 0; k < 4000 && run.view() && run.view().id !== id; k++) { const v = run.view(); if (v.phase === 'choose') run.answer(run.rightIndex()); else run.update(0.25); } };
  to(wrong, 'gnd_rb');
  for (let k = 0; k < 200 && wrong.view().phase !== 'choose'; k++) wrong.update(0.25);
  wrong.answer((wrong.rightIndex() + 1) % 3);
  for (let k = 0; k < 20; k++) wrong.update(0.25);
  assert.ok(wrong.log.some(l => l.item === 'gnd_rb' && /negative|read back/i.test(l.en) && l.who === 'GND'), 'the correction');
  const late = createChairFlight(sc, { stage: 3, seed: 7 });
  to(late, 'gnd_rb');
  for (let k = 0; k < 400 && !late.log.some(l => /how do you hear/.test(l.en)); k++) late.update(0.25);
  assert.ok(late.log.some(l => l.item === 'gnd_rb' && /how do you hear\?/.test(l.en)), 'asked again when late');
  assert.ok(!late.log.some(l => l.item === 'gnd_rb' && /negative/.test(l.en)), '(not a correction)');
  // (no clock at stages 1 and 2: a cadet who takes the time is not late)
  const slow = createChairFlight(sc, { stage: 2, seed: 7 });
  for (let k = 0; k < 2000; k++) slow.update(0.25);
  assert.ok(!slow.log.some(l => /how do you hear/.test(l.en)));
  // (the clock waits while the line is still being spoken)
  let speaking = false; const held = createChairFlight(sc, { stage: 3, seed: 7, hold: () => speaking });
  for (let k = 0; k < 400 && !(held.view().id === 'atis:letter' && held.view().phase === 'hear'); k++) { const v = held.view(); if (v.phase === 'choose') held.answer(held.rightIndex()); else held.update(0.25); }
  speaking = true;                                            // (the ATIS's first part being spoken: longer than its time)
  for (let k = 0; k < 40; k++) held.update(0.25);
  assert.equal(held.view().phase, 'hear', 'the line still heard');
  speaking = false; for (let k = 0; k < 400 && held.view().phase !== 'choose'; k++) held.update(0.25);
  assert.equal(held.view().phase, 'choose'); assert.equal(held.view().timeLeft, held.view().time, 'the clock from the end of the line');
});

test('k4 scored: 80% passes, not passed is flown again the same day (the lecturer\'s choices), twice not passed practises the missed ones; the debrief names what was left out and opens its section', () => {
  const sc = chairScript(FL, { seed: 5 });
  let w = 6;
  const bad = runChairFlight(sc, { stage: 2, seed: 5, pick: (v, run) => (!v.last && w-- > 0 ? (run.rightIndex() + 1) % v.choices.length : run.rightIndex()) });
  assert.ok(!bad.summary.pass && bad.summary.pct < PASS, `${bad.summary.pct}%`);
  const good = runChairFlight(sc, { stage: 2, seed: 5 });
  assert.ok(good.summary.pass && good.summary.pct === 100);
  // (stage 1: a practice — never a pass)
  assert.ok(!runChairFlight(sc, { stage: 1, seed: 5 }).summary.pass);
  const run = (data, pick = () => 0) => {
    const r = createRunner({ data, state: createDialogState(), ctx: { quiz: {} }, hooks: { onHook: (n, a) => hooks.push([n, a]) } }), lines = [], hooks = [];
    r.start('ftd');
    for (let k = 0; k < 400 && r.running; k++) { const v = r.view(); lines.push(v); if (v.choices.length) r.choose(pick(v)); else r.next(); }
    return { lines, hooks };
  };
  for (const [sum, fails] of [[bad.summary, 0], [bad.summary, 1], [good.summary, 0]]) {
    const d = S.chairDebriefDialogs(FL, sum, sc, { fails });
    assert.deepEqual(validateDialogs(d, {}).errors, []);
    const r = run(d), text = r.lines.map(v => v.text);
    for (const t of text) assert.ok(t.length <= 120 && !APP.test(t) && !LEAK.test(t), t);
    if (sum.pass) assert.ok(r.hooks.some(h => h[0] === 'done' && h[1] === 'pass'), 'passed');
    else {
      assert.ok(!r.hooks.some(h => h[0] === 'done'), 'not passed: the next try is offered (the first choice), no day lost');
      assert.ok(r.hooks.some(h => h[0] === 'chair'), 'flown again');
      if (fails >= 1) assert.ok(r.hooks.some(h => h[0] === 'chair' && h[1] === '1:missed'), 'twice: the missed ones practised');
      // the words left out, named, and the section to open
      const m = sum.items.find(x => !x.ok && x.kind === 'ex' && x.missing.length);
      assert.ok(m && text.some(t => m.missing.every(w => t.includes(w)) || t.includes(m.missing[0])), `the words left out of ${m && m.id}: ${m && m.missing.join('・')}`);
      const choices = r.lines.flatMap(v => v.choices.map(c => c.text));
      assert.ok(choices.some(c => /^教科書の「.+」を開く$/.test(c)), 'its section of the textbook');
      // (the last choice: today stops here — done 'fail', still the same day's to take again)
      const stop = run(d, (v) => (v.choices.some(c => /今日はここまで/.test(c.text)) ? v.choices.findIndex(c => /今日はここまで/.test(c.text)) : 0));
      assert.ok(stop.hooks.some(h => h[0] === 'done' && h[1] === 'fail'));
    }
  }
  // the start: the first time the script hidden first; after a fail, the script in view first; after two, the missed ones
  const first = (o) => S.ftdDialogs(FL, 'k4', { k4: o }).dialogs.ftd.nodes['k4:stage'].choices.map(c => c.effects && c.effects[0] ? c.effects[0].arg : 'listen');
  assert.deepEqual(first({}), ['2', '1']);
  assert.deepEqual(first({ fails: 1 }), ['1', '2']);
  assert.deepEqual(first({ fails: 2, missed: ['gnd_rb'] }), ['1:missed', '1']);
  assert.deepEqual(first({ passed: true }), ['3', '2', '1', 'listen']);
  for (const o of [{}, { fails: 1 }, { fails: 2, missed: ['x'] }, { passed: true }]) assert.deepEqual(validateDialogs(S.ftdDialogs(FL, 'k4', { k4: o }), {}).errors, [], JSON.stringify(o));
  // (only the missed ones, when practised)
  const only = createChairFlight(sc, { stage: 1, seed: 5, only: bad.summary.missed });
  assert.deepEqual(only.items.map(x => x.id), bad.summary.missed);
});

test('k4 changes from run to run, and says little of the class\'s own English (the textbook\'s airport is another)', () => {
  const sig = (seed) => { const sc = chairScript(FL, { seed }); return JSON.stringify([sc.weather, sc.exit, sc.events]); };
  assert.ok(new Set(Array.from({ length: 30 }, (_, i) => sig(i + 1))).size >= 15, 'the ATIS, the exit, what happens');
  const evs = new Set(Array.from({ length: 40 }, (_, i) => chairScript(FL, { seed: i + 1 }).events.join('+')));
  assert.ok(evs.has('other') && evs.has('partial') && evs.has('other+partial'), [...evs].join(' '));
  // the English the classes speak (their 'say' hooks) and the calls k4 has (heard and said): the same word for word ≤ 5
  const said = new Set();
  for (let i = 0; i < S.CLASS_CHAPTERS.length; i++) for (const n of Object.values(S.classDialogs(FL, i, { pace: 'full' }).dialogs.class.nodes)) if (n.hook && n.hook.name === 'say') said.add(n.hook.arg.trim());
  const k4 = new Set();
  for (let seed = 1; seed <= 20; seed++) for (const x of chairScript(FL, { seed }).items) {
    for (const l of [...(x.kind === 'ex' ? x.ex.hear || [] : x.hear || []), ...(x.kind === 'ex' ? x.ex.reply || [] : [])]) k4.add(l.en.trim());
    if (x.kind === 'ex') k4.add(x.ex.choices.find(c => c.ok).en.trim());
  }
  const same = [...k4].filter(e => said.has(e));
  assert.ok(same.length <= 5, `${same.length} the same: ${same.join(' | ')}`);
});
