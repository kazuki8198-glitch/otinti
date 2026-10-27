// CADET — chapter 1 as the brief's §7 counts it, with tools/measure-ch1.mjs's own functions (the measure and the tests
// count the same way): the classes' frame (no wording of the class's own said 8 times or more, but those kept here
// with their reason), each day's own start and end, the parts of the sections not going the same way three in a row,
// no long stretch without a choice, the first flight's sections asked about again and again, the review at a class's
// start, a day at the pace for today's training within 40 minutes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, measureCh1, framePatterns, dayPatterns, answerScenes, sectionStages, runTalk } from '../tools/measure-ch1.mjs';
import * as TALK from '../src/content/class-talk.js';

const L = await load(), S = L.school, FL = L.FL;
// the wordings said 8 times or more that stay, and why: the book's own content, its words masked by the pattern
const KEPT = [
  [/^(あなた|Tower|Ground|ATIS|Departure|Approach|Center|CTAF|Unicom)：“…”$/, 'the textbook\'s radio exchanges, read row by row: each a different call (the pattern masks the English)'],
  [/^“…”$/, 'the textbook\'s example calls, each said on its own line and spoken'],
  [/^［選択］[^ぁ-ゖァ-ヺ]*$/, 'choices that are the book\'s values alone — numbers, units, words in quotes (the pattern masks them)'],
];

test('the classes\' frame: no wording of their own said 8 times or more in chapter 1 read in full — but the book\'s content, listed with its reason', async () => {
  for (const seed of [1, 2]) {
    const r = await measureCh1({ pace: 'full', seed });
    for (const { pattern, count } of framePatterns(r).filter(p => p.count >= 8)) assert.ok(KEPT.some(([re]) => re.test(pattern)), `seed ${seed}: "${pattern}" said ${count} times`);
  }
});

test('each day its own: the class\'s first and last lines and the training device\'s first never the same on 3 days; each names the afternoon\'s lesson', async () => {
  for (const pace of ['need', 'full', 'quick']) {
    const r = await measureCh1({ pace, seed: 1 });
    for (const p of dayPatterns(r).filter(x => /^(class:first|class:last|ftd:first)｜/.test(x.pattern))) assert.ok(p.days.length < 3, `${pace}: "${p.pattern}" on days ${p.days.join(', ')}`);
    for (const d of r.days) {
      const cls = d.talks.find(t => /^class \d/.test(t.label)), ftd = d.talks.find(t => /^ftd k\d$/.test(t.label));
      if (cls) { const k = L.career.CLASS_FTD[+cls.label.slice(6)]; assert.ok(cls.lines.slice(0, 3).some(l => l.text.includes(k)), `day ${d.day}: the class's start names the afternoon's ${k}`); }
      if (ftd) assert.ok(ftd.lines[0].text.includes(ftd.label.slice(4)) && ftd.lines[0].text !== 'Welcome to the training device room.', `day ${d.day}: ${ftd.label}'s start is its own: ${ftd.lines[0].text}`);
    }
  }
});

test('a class\'s sections do not go the same way three in a row (the parts in their order: title, prediction, introduction, book, key points, questions, notes, answer, end)', async () => {
  for (const seed of [1, 2]) {
    const r = await measureCh1({ pace: 'full', seed }), all = [];
    for (const d of r.days) for (const t of d.talks) if (/^class/.test(t.label)) all.push(...sectionStages(t.lines));
    assert.equal(all.length, 59, 'every section of part 1');
    for (let k = 2; k < all.length; k++) assert.ok(!(all[k].stages === all[k - 1].stages && all[k].stages === all[k - 2].stages), `seed ${seed}: ${all[k - 2].base}, ${all[k - 1].base}, ${all[k].base} all "${all[k].stages}"`);
    assert.ok(new Set(all.map(x => x.stages)).size >= 10, `${new Set(all.map(x => x.stages)).size} ways a section goes`);
  }
});

test('no long stretch without a choice: at most 2 minutes at the pace for today\'s training and at 要点だけ, 3 in full; a day at the first within 40 minutes', async () => {
  const LIMIT = { need: 120, quick: 120, full: 180 };
  for (const pace of ['need', 'full', 'quick']) for (const seed of [1, 2, 3, 4, 5]) {
    const r = await measureCh1({ pace, seed });
    for (const d of r.days) {
      assert.ok(d.longestGap <= LIMIT[pace], `${pace} seed ${seed} day ${d.day}: ${(d.longestGap / 60).toFixed(2)} min without a choice`);
      if (pace === 'need') assert.ok(d.time <= 40 * 60, `need seed ${seed} day ${d.day}: ${(d.time / 60).toFixed(1)} min`);
    }
  }
});

test('the first flight\'s sections asked about again: aero.forces and aero.left each answered at least twice on days 2–9 (reading again does not count), every pace', async () => {
  for (const pace of ['need', 'full', 'quick']) for (let seed = 1; seed <= 20; seed++) {
    const r = await measureCh1({ pace, seed }), sc = answerScenes(L, r, ['aero.forces', 'aero.left']);
    for (const [sec, days] of Object.entries(sc)) assert.ok(days.filter(d => d >= 2 && d <= 9).length >= 2, `${pace} seed ${seed}: ${sec} answered on ${days.join(', ') || 'no day'}`);
  }
});

test('the review at a class\'s start: of the classes before, their answers heard, the ones missed first (said so), not scored, and none when a class is taken up midway', async () => {
  const book = L.BOOK, pool = S.questionPool(FL), chOf = (x) => book.section(x.home).chapter.id;
  // (a career after class 1: one of class 0's questions missed)
  const st = { seed: 3, answers: { 'q_aero#3': [0, 1, 0, 3], 'q_aero#0': [1, 0, 1, 3] }, done: { 'class:0': 2, 'class:1': 3 }, heard: {} };
  const rv = S.reviewFor(FL, st, 2);
  assert.ok(rv.ids.length >= 2 && rv.ids.length <= 3, rv.ids.join(' '));
  assert.equal(rv.ids[0], 'q_aero#3', 'the one missed first'); assert.equal(rv.missed, 1);
  for (const id of rv.ids) { const x = pool.find(y => y.id === id); assert.ok(x && ['aero', 'sys', 'perf'].includes(chOf(x)), `${id}: of the classes before`); }
  const d = S.classDialogs(FL, 2, { seed: 3, review: rv }), N = d.dialogs.class.nodes;
  const r = runTalk(L, d, 'class', { ctx: { quiz: {} }, policy: (v) => (v.node === 'pace' ? v.choices.findIndex(c => /^要点だけ/.test(c.text)) : null) });
  const at = r.lines.findIndex(l => l.node === 'rv0');
  assert.ok(at > 0 && at < r.lines.findIndex(l => l.node === 'pace'), 'before the pace');
  assert.ok(TALK.REVIEW_MISSED.some(t => r.lines[at].text.startsWith(t) || (N['rv0:pre'] && N['rv0:pre'].text.startsWith(t))), 'the missed one said to be so');
  assert.ok(!Object.keys(N).some(k => /^rv\d+$/.test(k) && N[k].choices.some(c => (c.effects || []).some(e => e.set))), 'not scored');
  assert.ok(N.rv0.choices.every(c => c.effects.some(e => e.hook === 'ans')), 'its answer kept');
  assert.ok(!S.classDialogs(FL, 2, { seed: 3, review: rv, from: 3 }).dialogs.class.nodes.rv0, 'none when taken up midway');
  assert.deepEqual(S.reviewFor(FL, { seed: 1, answers: {}, done: {}, heard: {} }, 0).ids, [], 'none before the first class');
});
