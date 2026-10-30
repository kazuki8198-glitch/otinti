// CADET — chapter 1 as the brief's §7 counts it, with tools/measure-ch1.mjs's own functions (the measure and the tests
// count the same way): the classes' frame (no wording of the class's own said 8 times or more, but those kept here
// with their reason), each day's own start and end, the parts of the sections not going the same way three in a row,
// no long stretch without a choice, the first flight's sections asked about again and again, the review at a class's
// start, a day at the pace for today's training within 40 minutes; the first day's introductory flight.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, measureCh1, framePatterns, dayPatterns, daySentencePatterns, answerScenes, sectionStages, runTalk, summarize, introLines } from '../tools/measure-ch1.mjs';
import * as TALK from '../src/content/class-talk.js';
import fs from 'node:fs';

const L = await load(), S = L.school, FL = L.FL;
// the wordings said 8 times or more that stay, and why: the book's own content, its words masked by the pattern
const KEPT = [
  [/^(あなた|Tower|Ground|ATIS|Departure|Approach|Center|CTAF|Unicom)：“…”$/, 'the textbook\'s radio exchanges, read row by row: each a different call (the pattern masks the English)'],
  [/^“…”$/, 'the textbook\'s example calls, each said on its own line and spoken'],
  [/^［選択］[^ぁ-ゖァ-ヺ]*$/, 'choices that are the book\'s values alone — numbers, units, words in quotes (the pattern masks them)'],
];

test('the classes\' frame: no wording of their own said 8 times or more in chapter 1 at any pace — but the book\'s content, listed with its reason', async () => {
  for (const pace of ['full', 'need', 'quick']) for (const seed of [1, 2]) {
    const r = await measureCh1({ pace, seed });
    for (const { pattern, count } of framePatterns(r).filter(p => p.count >= 8)) assert.ok(KEPT.some(([re]) => re.test(pattern)), `${pace}, seed ${seed}: "${pattern}" said ${count} times`);
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

test('no long stretch without a choice: at most 2 minutes at the pace for today\'s training and at 要点だけ, 3 in full; a day at the first within 40 minutes — 考えてみよう tried or its answer heard', async () => {
  const LIMIT = { need: 120, quick: 120, full: 180 };
  for (const think of ['try', 'hear']) for (const pace of ['need', 'full', 'quick']) for (const seed of think === 'try' ? [1, 2, 3, 4, 5] : [1, 2]) {
    const r = await measureCh1({ pace, seed, think });
    for (const d of r.days) {
      assert.ok(d.longestGap <= LIMIT[pace], `${pace} seed ${seed} (${think}) day ${d.day}: ${(d.longestGap / 60).toFixed(2)} min without a choice`);
      if (pace === 'need') assert.ok(d.time <= 40 * 60, `need seed ${seed} (${think}) day ${d.day}: ${(d.time / 60).toFixed(1)} min`);
    }
  }
});

test('the first day\'s introductory flight: a talk of its own with 8 decisions or more at every pace, no long stretch (hands off too), the day within 40 minutes; declined, the day as before with the offer; what is heard and asked the same', async () => {
  for (const pace of ['need', 'full', 'quick']) for (const seed of [1, 2, 3]) {
    const r = await measureCh1({ pace, seed }), d = r.days[0], t = d.talks.find(x => x.label === 'intro');
    assert.ok(t && t.decisions >= 8, `${pace} seed ${seed}: ${t ? t.decisions : 'no'} decisions in the flight`);
    assert.ok(d.longestGap <= 120, `${pace} seed ${seed}: ${(d.longestGap / 60).toFixed(2)} min without a choice on day 1`);
    if (pace === 'need') assert.ok(d.time <= 40 * 60, `${(d.time / 60).toFixed(1)} min`);
  }
  // (a cadet who never touches the yoke: the hints, his lines and the tasks' ends still come within 2 minutes)
  assert.ok(summarize(introLines(L, { hands: 'none' }).lines).longestGap <= 120);
  // declined: no flight; the offer its one decision and its one line more (the day was 3.4 min before the
  // graphics merge; it is 3.45 now — the dispatcher sits at her desk, a longer walk there and back, and the
  // way home is said in the dorm's words: measured +3.1 s on this day, the offer's own bound unchanged)
  const fly = await measureCh1({ pace: 'need', seed: 1 }), no = await measureCh1({ pace: 'need', seed: 1, intro: 'no' }), d = no.days[0];
  const ask = d.talks.find(x => x.label === 'meet').lines.find(l => l.node === 'fly:ask');
  assert.ok(!d.talks.some(x => x.label === 'intro')); assert.equal(d.decisions, 1);
  assert.ok(ask && ask.t <= 12, `the offer: ${ask && ask.t} s`); assert.ok(d.time <= 3.45 * 60 + 12, `${(d.time / 60).toFixed(2)} min`);
  // (its lines are no class's: what is heard, and every question with what was said before it, the same either way)
  assert.deepEqual(fly.asked, no.asked); assert.deepEqual(fly.heard, no.heard);
  assert.deepEqual(fly.days.slice(1).map(x => x.time), no.days.slice(1).map(x => x.time));
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
    const r = await measureCh1({ pace, seed, skip: true }), days = r.days;                       // (days 1–10)
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

// the sentences of those that come back on 3 days or more, and why: each says the day's own (its number or its lesson —
// masked by the pattern), not a direction the cadet already knows
const KEPT_SENTENCES = [
  [/^toast｜k# 合格$/, 'the day\'s lesson passed, by its name (k2, k3, …)'],
  [/^toast｜午後：訓練装置室で k#「…」$/, 'the afternoon\'s lesson, by its name and title'],
  [/^toast｜前の間違い # 問は、授業の最初に$/, 'how many questions missed before come first today'],
];
test('each day its own words, sentence by sentence: no direction said on 3 days or more (the way home, the study, Tab) — but those listed with their reason', async () => {
  for (const skip of [false, true]) for (const pace of ['need', 'full', 'quick']) for (const seed of [1, 2]) {
    const r = await measureCh1({ pace, seed, skip });
    for (const p of daySentencePatterns(r).filter(x => x.days.length >= 3)) if (!KEPT_SENTENCES.some(([re]) => re.test(p.pattern))) assert.fail(`${pace} seed ${seed}${skip ? ' (skipping)' : ''}: "${p.pattern}" on days ${p.days.join(', ')}`);
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

test('the evenings\' events ask only what the day\'s class said, at every pace (answer-map.js EVENT_ANSWERS; the week\'s from the banks)', async () => {
  for (const pace of ['need', 'full', 'quick']) for (const seed of [1, 2, 3]) {
    const ev = (await measureCh1({ pace, seed })).asked.filter(a => /^event /.test(a.where));
    assert.ok(ev.length >= 15, `${pace}, seed ${seed}: ${ev.length} questions`);
    for (const a of ev) assert.ok(a.known && a.inBook && a.said, `${pace}, seed ${seed}: ${a.where} ${a.id} — its answer said before`);
  }
});

test('every subtitle of chapter 1 is 2–120 characters: classes, devices, events, the written test, every pace (k4\'s run: test/k4.test.mjs)', async () => {
  for (const pace of ['need', 'full', 'quick']) for (const seed of [1, 2, 3]) {
    const r = await measureCh1({ pace, seed });
    for (const d of r.days) for (const t of d.talks) if (t.label !== 'ftd k4 run') for (const l of t.lines) { const n = Array.from(String(l.text)).length; assert.ok(n >= 2 && n <= 120, `${pace}, seed ${seed}, day ${d.day}, ${t.label} ${l.node}: ${n} characters`); }
  }
  // (the week's review with a long reason — a later Sunday's, a bank's: said over lines)
  const why = '理由はこうです。'.repeat(20), N = L.events.eventDialogs('week', { review: [{ id: 'q_radio#14', q: '問題です。', opts: ['A', 'B', 'C'], ok: 0, why }] }).dialogs.ev.nodes;
  for (const [id, n] of Object.entries(N)) assert.ok(Array.from(n.text).length <= 120, `week ${id}`);
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

test('the written test\'s day and the day it is passed: no one says it is tomorrow, nor the first flight the day after', () => {
  const ppl = L.people.peopleDialogs(), ins = L.insc.careerInstructorDialogs();
  const first = (data, id, exam1) => { const st = L.engine.createDialogState(); for (const f of ['met_chief', 'met_dispatcher', 'met_mechanic', 'met_kiryu', 'met_asahi', 'met_mori', 'welcome_done', 'tour_done']) st.flags[f] = true;
    return runTalk(L, data, id, { ctx: { career: { chapter: 'ch1', slot: 'evening', day: 9, dayMod3: 0, tired: false, solo: false, flying: false, graduated: false, cls: 6, veteran: false, exam1 }, today: {}, weather: { ja: '晴れ', metarAm: 'KLAB', metarPm: 'KLAB', taf: 'TAF', why: '' }, imsafe: { honest: true } }, state: st, policy: (v) => Math.max(0, v.choices.findIndex(c => /大丈夫/.test(c.text))) }).lines[0].text; };
  for (const [who, data, id] of [['chief', ppl, 'chief'], ['dispatcher', ppl, 'dispatcher'], ['mechanic', ppl, 'mechanic'], ['kiryu', ppl, 'kiryu'], ['asahi', ppl, 'asahi'], ['mori', ppl, 'mori'], ['lecturer', ppl, 'lecturer'], ['instructor', ins, 'ground']]) {
    for (const exam1 of [1, 2]) { const t = first(data, id, exam1); assert.doesNotMatch(t, /明日(は|の)?(学科)?試験|明後日/, `${who}, exam1 ${exam1}: ${t}`); if (exam1 === 2) assert.doesNotMatch(t, /今日(は|の)(学科)?試験/, `${who} after the test: ${t}`); }
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
  // (the device lessons' answers too: k5's scenes by their sections — answer-map.js)
  const radio = { ...st, day: 7, done: { 'class:0': 2, 'class:1': 3, 'class:2': 5, 'class:3': 6 }, heard: {}, answers: { 'scene:r_exit': [0, 1, 0, 7], 'scene:r_correct': [1, 0, 1, 7] } };
  assert.equal(marks(radio)['comm.arrive'], '△', 'k5 missed: △'); assert.equal(marks(radio)['comm.clarify'], '✓', 'k5 right: ✓');
  assert.match(Object.values(N).map(n => n.text).join(''), /タブレットの「進み具合」/, 'the tablet\'s page by its name');
  const ready = S2.written1Readiness(FL, st);
  assert.ok(ready.find(b => b.bank === 'q_aero').taught >= 4 && ready.find(b => b.bank === 'q_law').taught === 0, JSON.stringify(ready.map(b => `${b.bank} ${b.taught}`)));
});

test('a lesson not passed: the day goes on — the guide back to the lecturer (or on, waiting), the day\'s words, the class and the lesson naming the plan\'s afternoon, tomorrow\'s the lesson still to pass', () => {
  const F = L.flow, G = L.guide;
  // (k2 tried and not passed on day 3: the guide to the lecturer again, the day not stuck)
  const plan = [{ slot: 'am', kind: 'class', id: '1', title: '座学 2 / 6', state: 'done' }, { slot: 'pm', kind: 'ftd', id: 'k2', title: '訓練装置 k2・PFD の読み取り（10 問）', state: 'retry' },
    { slot: 'evening', kind: 'event', id: 'pitot', title: '駐機場の大城さんと…', who: 'mechanic', state: 'later' }];
  const g = G.nextStep({ chapter: 'ch1', slot: 'pm', plan });
  assert.equal(g.who, 'lecturer'); assert.match(g.text, /k2.*もう一度/); assert.match(g.text, /待つ/);
  // (day 5: class 2 in the morning, k2 again in the afternoon — named as the plan has it, not k3)
  const st = { chapter: 'ch1', day: 5, done: { 'class:0': 2, 'class:1': 3 }, exams: {} };
  const sch = [{ slot: 'am', kind: 'class', id: '2' }, { slot: 'pm', kind: 'ftd', id: 'k2' }, { slot: 'evening', kind: 'event', id: 'spell' }];
  for (const t of [F.dayToast(st, sch), F.dayToast(st, sch, { short: true }), F.dayToast(st, sch, { missed: 2 }), F.afterClassToast(2, sch), F.dormCard({ ...st, done: { ...st.done, 'class:2': 5 } }, sch).text]) {
    assert.match(t, /k2/, t); assert.doesNotMatch(t, /k3/, t);
  }
  const d = S.classDialogs(FL, 2, { afternoon: 'k2' }), hello = Object.entries(d.dialogs.class.nodes).filter(([id]) => /^(hello|preview)/.test(id)).map(([, n]) => n.text).join('\n');
  assert.match(hello, /訓練装置 k2/); assert.doesNotMatch(hello, /k3/);
  assert.doesNotMatch(S.ftdDialogs(FL, 'k2', { own: false }).dialogs.ftd.nodes.hello.text, /午前/);
  // (tomorrow: the lesson still to pass, or a retake before the written test)
  assert.match(F.tomorrowText({ ...st, done: { ...st.done, 'class:2': 5 } }, { nextFtd: 'k2' }), /午後は k2/);
  assert.match(F.tomorrowText({ chapter: 'ch1', day: 8, done: Object.fromEntries([0, 1, 2, 3, 4, 5].map(i => [`class:${i}`, 2 + i])), exams: {} }, { nextFtd: 'k6' }), /k6 のやり直し/);
  // (no afternoon at all: the class says so, the evening next)
  assert.match(F.afterClassToast(5, [{ slot: 'am', kind: 'class', id: '5' }, { slot: 'evening', kind: 'event', id: 'imsafe', title: '教官室の真壁 主任教官と…' }]), /夜：/);
});

test('the written test failed on a Friday: no one says the first flight is tomorrow when tomorrow is Sunday', () => {
  const F = L.flow, all = Object.fromEntries([0, 1, 2, 3, 4, 5].map(i => [`class:${i}`, 2 + i]));
  const day = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find(d => !L.career.isOff(d) && L.career.isOff(d + 1));
  const st = { chapter: 'ch1', day, done: all, exams: { written1: { pass: false } } };
  for (const t of [F.dayToast(st, [{ slot: 'am', kind: 'exam', id: 'written1' }]), F.dayToast(st, [{ slot: 'am', kind: 'exam', id: 'written1' }], { short: true })]) assert.doesNotMatch(t, /明日は(、いよいよ)?初飛行/, t);
  assert.doesNotMatch(F.tomorrowText({ ...st, day: day - 1 }, { nextFtd: null }), /次の日が初飛行/);
});

test('the people\'s lines of chapter 1 do not name a class as today\'s: they are said on the days after it too (and on Sunday)', () => {
  const src = ['people.js', 'instructor-career.js'].map(f => fs.readFileSync(new URL(`../src/content/dialog/${f}`, import.meta.url), 'utf8')).join('\n');
  const lists = [...src.matchAll(/byClass\(say, '[^']+', \[([\s\S]*?)\]/g)].map(m => m[1]);
  assert.ok(lists.length >= 7);
  for (const l of lists) assert.doesNotMatch(l, /今日の(授業|性能|k\d|METAR|気象|交信)|明日の?(学科)?試験|明後日/, l.slice(0, 80));
});

test('the classes, as the second review found them: a prediction before the section\'s first line at 要点だけ, no doubled quotes, the recall checks not the same every day, the review not asked again, a resumed class promises no score, the written test not asking its warm-up again, k3 not saying its answer first', () => {
  const runAll = (d, pace) => runTalk(L, d, 'class', { policy: (v) => (v.node === 'pace' ? v.choices.findIndex(c => ({ need: /^今日の訓練に要る/, full: /^じっくり/, quick: /^要点だけ/ })[pace].test(c.text)) : null), ctx: { quiz: { right: 0, n: 0, pct: 0, pass: false } } }).lines;
  for (let i = 0; i < 6; i++) for (const pace of ['quick', 'full']) {
    const lines = runAll(S.classDialogs(FL, i, { seed: 3 }), pace);
    for (const l of lines) assert.doesNotMatch(l.text + (l.choices || []).join(''), /「「|」」/, `class ${i} ${pace}: ${l.text}`);
    // (a prediction at 要点だけ comes right after the section's title alone)
    lines.forEach((l, k) => { if (/^r\d+s\d+:pr$/.test(l.node)) assert.match(lines[k - 1].node, /^r\d+s\d+$/, `class ${i}: before ${l.node}`); });
  }
  // (the recall checks of a later class: not the same questions for every seed)
  const recalls = new Set();
  for (const seed of [1, 2, 3, 4, 5, 6]) for (const l of runAll(S.classDialogs(FL, 3, { seed }), 'full')) if (l.q && /:ck$/.test(l.node) && /^q_(aero|sys|perf)/.test(l.q.id)) recalls.add(`${seed}:${l.q.id}`);
  assert.ok(new Set([...recalls].map(x => x.split(':')[1])).size >= 3, `recalled: ${[...recalls].join(' ')}`);
  // (the review's questions not asked again as checks the same day)
  const st = { seed: 4, day: 6, done: { 'class:0': 2, 'class:1': 3, 'class:2': 5 }, heard: {}, attempts: {}, answers: {} };
  const o = S.classOptions(FL, st, 3, {}), rv = new Set(o.review.ids), lines = runAll(S.classDialogs(FL, 3, { seed: 4, ...o }), 'full');
  for (const l of lines) if (l.q && /:ck$/.test(l.node)) assert.ok(!rv.has(l.q.id), `${l.q.id} reviewed, then checked`);
  // (resumed: the questions' end without 採点しますね)
  const resumed = runTalk(L, S.classDialogs(FL, 1, { from: 5 }), 'class', { ctx: { quiz: { right: 0, n: 0, pct: 0, pass: false } } }).lines;
  assert.ok(!resumed.some(l => /採点しますね/.test(l.text)) && resumed.some(l => l.text === '今日の問題は以上です。'));
  // (written1: its warm-up's three not among the 28)
  for (const seed of [1, 2, 3, 4, 5]) {
    const all = Object.fromEntries([0, 1, 2, 3, 4, 5].map(i => [`class:${i}`, 2 + i])), s2 = { seed, day: 9, done: all, heard: {}, attempts: {}, answers: {} };
    const warm = S.mixedReview(FL, s2, {}), d = S.examDialogs(FL, 'written1', { seed: seed + 9, warm }), w = new Set(warm.map(x => x.id));
    assert.ok(!d.questions.some(x => w.has(x.id)), `seed ${seed}: a warm-up question in the test`);
  }
  // (k3: the right way to say it is spoken once answered, not with the question)
  const k3 = S.ftdDialogs(FL, 'k3', {}).dialogs.ftd.nodes;
  for (const [id, n] of Object.entries(k3)) if (/^q\d+(:p\d+)?$/.test(id)) assert.ok(!(n.hook && n.hook.name === 'say'), `${id} speaks its answer`);
  assert.ok(Object.entries(k3).some(([id, n]) => /^q\d+:ok$/.test(id) && n.hook && n.hook.name === 'say'), 'spoken after the answer');
});

test('the evening\'s METAR: the visibility question\'s right answer read off the morning\'s METAR (5 SM the class\'s example), the day\'s decision told after it', () => {
  for (const [metar, enough] of [['KLAB 121353Z 36005KT 10SM FEW035 19/12 A2992', true], ['KLAB 121353Z 00000KT 1/2SM FG VV002 14/14 A2992', false], ['KLAB 121353Z 00000KT 5SM BR OVC006 15/14 A2992', true],
    ['KLAB 121353Z 18012G22KT 2SM TSRA BKN015CB 16/15 A2992', false], ['KLAB 121353Z 20015G28KT 1 1/2SM +TSRA OVC012CB 15/14 A2992', false]]) {
    const ev = L.events.eventDialogs('metar', { weather: { metar, decision: enough ? 'go' : 'wait', why: '理由。' } }), N = ev.dialogs.ev.nodes;
    const q = Object.values(N).find(n => n.choices && /視程/.test(n.text));
    const right = q.choices.find(c => /:ok$/.test(c.next));
    assert.match(right.text, enough ? /^満たしている/ : /^満たしていない/, metar);
    assert.match(Object.values(N).map(n => n.text).join(''), new RegExp(`今日の判断は「${enough ? '予定どおり飛ぶ' : '午後まで待つ'}`), metar);
  }
});

test('after chapter 1: the dorm\'s study is a late night again (no chapter 1 questions), the record page no longer readies the written test', () => {
  const F = L.flow, st = { ...L.career.newCareer(4), chapter: 'ch3', day: 30, done: { prologue: 1, 'class:0': 2 }, exams: { written1: { tries: 1, best: 90, pass: true } } };
  const card = F.dormCard(st, [], {});
  assert.ok(!card.choices.some(c => /3 問/.test(c.text)), JSON.stringify(card.choices));
  assert.ok(!F.dormCard(st, [], { short: true }).choices.some(c => /3 問/.test(c.text)));
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /ch\.act === 'late' && career\.chapter === 'ch1'/, 'the study only in chapter 1');
  assert.match(main, /written1: st\.chapter === 'ch1' && !\(st\.exams\.written1 && st\.exams\.written1\.pass\)/, 'the readiness only while the test is ahead');
});
