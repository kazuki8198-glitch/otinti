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

test('the ways skipped the second time on (G): the day\'s fixed flow — cards, toasts, the jumps, the dorm\'s card — 20 s or less a day, chapter 1 within 3 minutes', async () => {
  for (const pace of ['need', 'full', 'quick']) for (const seed of [1, 2, 3]) {
    const r = await measureCh1({ pace, seed, skip: true }), days = r.days.filter(d => d.day >= 2 && d.day <= 9);
    for (const d of days) assert.ok(d.fixedS <= 20, `${pace} seed ${seed} day ${d.day}: ${d.fixedS.toFixed(1)} s (${d.fixed.map(f => f.what).join(' ')})`);
    assert.ok(days.reduce((a, d) => a + d.fixedS, 0) <= 180, `${pace} seed ${seed}: ${(days.reduce((a, d) => a + d.fixedS, 0) / 60).toFixed(2)} min`);
    assert.ok(!days.some(d => d.fixed.some(f => f.what === 'walk')), 'no walking');
  }
});

test('each day its own words: the toasts, the guide\'s lines and the dorm\'s card never the same on 3 days — walking or skipping', async () => {
  for (const skip of [false, true]) for (const pace of ['need', 'full', 'quick']) {
    const r = await measureCh1({ pace, seed: 1, skip });
    for (const p of dayPatterns(r).filter(x => x.days.length >= 3)) assert.fail(`${pace}${skip ? ' (skipping)' : ''}: "${p.pattern}" on days ${p.days.join(', ')}`);
  }
});

test('days 2–9 each have an event of their own that uses the day\'s class: the evenings\' (career.js CH1_EVENTS), Sunday\'s review, the warm-up before the written test', async () => {
  const want = { 2: 'event forces', 3: 'event pitot', 4: 'event week', 5: 'event spell', 6: 'event readback', 7: 'event metar', 8: 'event imsafe' };
  for (const pace of ['need', 'quick']) for (const seed of [1, 4]) {
    const r = await measureCh1({ pace, seed }), seen = new Set();
    for (const d of r.days.filter(x => x.day >= 2 && x.day <= 9)) {
      if (want[d.day]) { const t = d.talks.find(x => x.label === want[d.day]); assert.ok(t && t.decisions >= 2, `${pace} day ${d.day}: ${want[d.day]} (${d.talks.map(x => x.label).join(', ')})`); seen.add(t.lines.map(l => l.text).join('')); }
      else { const ex = d.talks.find(x => x.label === 'exam written1'); assert.ok(ex && ex.lines[0].node === 'wu' && ex.lines.filter(l => /^wu\d$/.test(l.node)).length === 3, `day ${d.day}: the warm-up, chapters mixed`); }
    }
    assert.equal(seen.size, 7, 'each its own');
  }
  // (each event's questions are on its own class: the words of that day's chapters)
  const W = { forces: /揚力|推力|ラダー/, pitot: /ピトー|静圧|サンプ/, spell: /November|point|thousand/, readback: /hold short|line up and wait/, metar: /METAR|雲高/, imsafe: /IMSAFE|Medication|Fatigue/ };
  for (const [id, re] of Object.entries(W)) assert.match(Object.values(L.events.eventDialogs(id).dialogs.ev.nodes).map(n => n.text).join(''), re, id);
});

test('the academy\'s seven: each says three different things or more on days 2–9, one at least about the day\'s class', () => {
  const KEY = [/4 つの力|揚力|迎え角|主翼|翼/, /ピトー|性能|重心|W&B|キャブレター|暑い日/, /Alfa|niner|アルファベット|November|数字|k3/, /交信|k4|チェアフライト|復唱|型/, /METAR|天気|雲高|燃料のサンプ|MAYDAY|気象/, /IMSAFE|学科試験|初飛行/];
  const ppl = L.people.peopleDialogs(), ins = L.insc.careerInstructorDialogs();
  const say = (data, id, cls) => runTalk(L, data, id, { ctx: { career: { chapter: 'ch1', slot: 'am', day: 2 + cls, dayMod3: 0, tired: false, solo: false, flying: false, graduated: false, cls, veteran: false }, today: {}, weather: { ja: '晴れ', metarAm: 'KLAB', metarPm: 'KLAB', taf: 'TAF', why: '' }, imsafe: { honest: true } }, state: L.engine.createDialogState(), policy: (v) => v.choices.findIndex(c => /大丈夫/.test(c.text)) }).lines[0].text;
  for (const [who, data, id] of [['chief', ppl, 'chief'], ['dispatcher', ppl, 'dispatcher'], ['mechanic', ppl, 'mechanic'], ['kiryu', ppl, 'kiryu'], ['asahi', ppl, 'asahi'], ['lecturer', ppl, 'lecturer'], ['instructor', ins, 'ground']]) {
    // (met before: the first meeting's lines past)
    const lines = [1, 2, 3, 4, 5, 6].map(k => { const st = L.engine.createDialogState(); for (const f of ['met_chief', 'met_dispatcher', 'met_mechanic', 'met_kiryu', 'met_asahi', 'met_mori', 'welcome_done', 'tour_done']) st.flags[f] = true; return runTalk(L, data, id, { ctx: { career: { chapter: 'ch1', slot: 'am', day: 2 + k, dayMod3: 0, tired: false, solo: false, flying: false, graduated: false, cls: k, veteran: false }, today: {}, weather: { ja: '晴れ', metarAm: 'KLAB', metarPm: 'KLAB', taf: 'TAF', why: '' }, imsafe: { honest: true } }, state: st, policy: (v) => Math.max(0, v.choices.findIndex(c => /大丈夫/.test(c.text))) }).lines[0].text; });
    assert.ok(new Set(lines).size >= 3, `${who}: ${new Set(lines).size} kinds of talk`);
    assert.ok(lines.some((t, k) => KEY[k].test(t)), `${who}: about the day's class: ${lines.join(' / ')}`);
    void say;
  }
});

test('the evening\'s study: three questions of the classes done, the one missed first; its answers on the tablet\'s ✓ / △', () => {
  const S2 = L.school, st = { seed: 5, day: 3, answers: { 'q_aero#3': [0, 1, 0, 2] }, done: { 'class:0': 2 }, heard: {}, attempts: {} };
  const d = S2.studyDialogs(FL, st), N = d.dialogs.study.nodes, qs = Object.keys(N).filter(k => /^sq\d$/.test(k));
  assert.equal(qs.length, 3);
  assert.ok(N.sq0.choices.every(c => c.effects.some(e => e.hook === 'ans' && e.arg.startsWith('q_aero#3|'))), 'the one missed first');
  assert.ok(Object.values(N).some(n => (n.effects || []).some(e => e.hook === 'done' && e.arg === 'night')), 'then to bed');
  // (answered: the right one now, another wrong — the marks follow the last answers)
  const marks = (s) => Object.fromEntries(S2.sectionMarks(FL, s).flatMap(c => c.chapters.flatMap(ch => ch.sections.map(x => [x.id, x.mark]))));
  const sec3 = S2.questionPool(FL).find(x => x.id === 'q_aero#3').home;
  assert.equal(marks(st)[sec3], '△');
  const after = { ...st, answers: { ...st.answers, 'q_aero#3': [1, 1, 1, 3] } };
  assert.equal(marks(after)[sec3], '✓');
  assert.equal(marks(st)['sys.ctl'], '', 'not heard yet: no mark');
  const ready = S2.written1Readiness(FL, st);
  assert.ok(ready.find(b => b.bank === 'q_aero').taught >= 4 && ready.find(b => b.bank === 'q_law').taught === 0, JSON.stringify(ready.map(b => `${b.bank} ${b.taught}`)));
});
