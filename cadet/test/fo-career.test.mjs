// CADET — the first-officer phase's career side (S1/S4), without a screen: joining the airline, the
// type-rating chapter's shape (the written test first, the jet lessons, the check), the day plans of a
// jet day (career/day.js), the jet ground checklists, the joining talk and its hook, and chapter fo2 —
// the roster, the fatigue/duty limit, the leg record and the line check.
// Run directly (package.json is not edited for this file): node --test test/fo-career.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCareer, cleanCareer, schedule, gate, isOff, weatherFor, STAGE, CHECKS, CHAPTERS, EXAMS, FO_ROUTES, FO_CAPTAINS, FO_DEFAULT, foLineCheckReady, foRosterItem, foPatternDuty, LESSON_GROWTH, lessonGrowth } from '../src/career/career.js';
import { planFor, stepsFor, createDay } from '../src/career/day.js';
import { CHECKLISTS as CHECKLISTS_JET, CHECKLISTS_JET as JET_ALIAS } from '../src/content/checklists-jet.js';
import { joinDialogs, captainLines, CAPTAINS_FO } from '../src/content/dialog/first-officer.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createDialogState, createRunner } from '../src/dialog/engine.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL;

const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const rec = () => ({ tries: 1, best: 'A', pass: true, levels: ['basic'] });
const progWith = (ids) => ({ lessons: Object.fromEntries(ids.map(id => [id, rec()])) });
const good = (seed, day) => weatherFor(seed, day, { force: 'good' });
const nextDay = (C) => { C.state.day++; while (isOff(C.state.day)) C.state.day++; };
// a graduated career, the morning after the ceremony (day 50 is a Thursday)
const graduated = (seed = 5, chapter = 'ch6') => {
  const C = createCareer({ store: memStore(), seed });
  C.state.chapter = chapter; C.state.day = 50; C.state.graduated = { day: 49, rank: '優秀' };
  return C;
};
// a graduated career driven to the type-rating check: the test passed, j1–j4 passed
const atCheck = () => {
  const C = graduated(); assert.equal(C.beginFirstOfficer(), true);
  C.exam('type', 90);
  return { C, prog: progWith(['j1', 'j2', 'j3', 'j4']) };
};

test('fo shape: the exam, the stage, the check, the chapter labels, the growth table', () => {
  assert.deepEqual([EXAMS.type.title, EXAMS.type.short, EXAMS.type.n, EXAMS.type.pass], ['型式限定学科（737 級）', '型式学科', 30, 80]);
  // the banks as landed in FLIGHT LAB: q_jet / q_jperf / q_jsys (q_perf and q_sys are the older GA banks)
  assert.deepEqual(EXAMS.type.banks, ['q_jet', 'q_jperf', 'q_jsys']);
  for (const b of EXAMS.type.banks) { const bank = FL.quiz.BANKS.find(x => x.id === b); assert.ok(bank && bank.qs.length >= 10, `${b}: a bank of at least 10`); }
  assert.deepEqual(STAGE.fo1.lessons, ['j1', 'j2', 'j3', 'j4']);
  assert.deepEqual([STAGE.fo1.exam, STAGE.fo1.check], ['type', 'typerate']);
  assert.deepEqual(STAGE.fo1.ftd, []);
  assert.deepEqual([CHECKS.typerate.id, CHECKS.typerate.name, CHECKS.typerate.kind], ['typerate', '型式限定チェック', 'checkride']);
  assert.deepEqual(CHECKS.typerate.lessons, ['j5']);
  assert.equal(CHAPTERS.fo1.title, '型式移行'); assert.equal(CHAPTERS.fo2.title, '路線運航');
  assert.deepEqual(LESSON_GROWTH, { j1: [['hand', 2.4]], j2: [['know', 2.4]], j3: [['judge', 2.4]], j4: [['hand', 2.4]] });
  assert.deepEqual(lessonGrowth('S', 'basic', 'j2'), [['know', 2.4]], 'a jet lesson grows by the table');
  assert.deepEqual(lessonGrowth('S', 'basic', 'j5'), [], 'the check lesson j5 grows nothing');
});

test('fo (a): beginFirstOfficer — only a graduate, only once, from a post-graduation chapter', () => {
  const fresh = createCareer({ store: memStore(), seed: 5 });
  assert.equal(fresh.beginFirstOfficer(), false, 'not graduated: no joining');
  assert.equal(fresh.state.chapter, 'prologue'); assert.equal(fresh.state.fo.hired, false);
  const mid = graduated(5, 'ch2');
  assert.equal(mid.beginFirstOfficer(), false, 'graduated but not in a post-graduation chapter');
  for (const ch of ['ch6', 'ch7']) {
    const C = graduated(5, ch);
    assert.equal(C.beginFirstOfficer(), true, `from ${ch}`);
    assert.equal(C.state.chapter, 'fo1');
    assert.deepEqual(C.state.fo, { hired: true, sectors: 0, blockMin: 0, evalSum: 0, evalN: 0, lineCheck: null, done: false, failSectors: null });
    assert.equal(C.beginFirstOfficer(), false, 'and not twice');
  }
  // an old save (no fo record at all) cleans to the default, and a kept record is clamped, not trusted
  assert.deepEqual(cleanCareer({ v: 2, seed: 3 }).fo, FO_DEFAULT());
  const kept = cleanCareer({ v: 2, seed: 3, fo: { hired: 1, sectors: 20, blockMin: 1500.6, evalSum: 900, evalN: 10, lineCheck: 'pass', done: true, failSectors: -2 } });
  assert.deepEqual(kept.fo, { hired: true, sectors: 20, blockMin: 1501, evalSum: 900, evalN: 10, lineCheck: 'pass', done: true, failSectors: null });
  assert.equal(cleanCareer({ v: 2, seed: 3, fo: { lineCheck: 'maybe' } }).fo.lineCheck, null);
});

test('fo (b): fo1 schedule — the written test first, then j1..j4 one a day, then the check', () => {
  const C = graduated(); assert.equal(C.beginFirstOfficer(), true);
  const sch = (prog) => schedule(C.state, prog, { weather: good(C.state.seed, C.state.day) });
  assert.deepEqual(sch({}).map(x => [x.kind, x.id]), [['exam', 'type']], 'the test comes before any lesson');
  assert.deepEqual(gate(C.state, {}).includes(EXAMS.type.title), true);
  // failed today: the test is not offered again today (examReady's rule), and no lesson jumps ahead of it
  C.exam('type', 50);
  assert.equal(C.examReady('type'), false);
  assert.ok(!sch({}).some(x => x.kind === 'exam' || x.kind === 'flight'), JSON.stringify(sch({})));
  nextDay(C);
  assert.deepEqual(sch({}).map(x => [x.kind, x.id]), [['exam', 'type']], 'tomorrow it is offered again');
  C.exam('type', 90);
  assert.deepEqual(sch({}).map(x => [x.kind, x.id]), [['exam', 'type']], 'passed today: it stays as the day\'s record');
  // then one lesson a day, in order, with the instructor
  const prog = { lessons: {} };
  for (const id of ['j1', 'j2', 'j3', 'j4']) {
    nextDay(C);
    const items = sch(prog);
    assert.deepEqual(items.map(x => [x.kind, x.id, x.who]), [['flight', id, 'instructor']], `the day of ${id}: ${JSON.stringify(items)}`);
    prog.lessons[id] = rec(); C.done('flight', id);
  }
  nextDay(C);
  assert.deepEqual(sch(prog).map(x => [x.kind, x.id]), [['checkride', 'typerate']], 'lessons and test behind them: the check');
  assert.deepEqual(gate(C.state, prog), [CHECKS.typerate.title], 'only the check is missing');
});

test('fo (c): the type-rating check passed moves the chapter to fo2; a fail does not', () => {
  const { C, prog } = atCheck();
  nextDay(C);
  assert.deepEqual(schedule(C.state, prog, { weather: good(C.state.seed, C.state.day) }).map(x => [x.kind, x.id]), [['checkride', 'typerate']]);
  C.check('typerate', false);
  assert.equal(C.state.chapter, 'fo1', 'a failed check leaves the chapter where it was');
  C.check('typerate', true);
  assert.equal(C.state.checks.typerate.pass, true);
  assert.equal(C.state.chapter, 'fo2', 'passed: line flying begins');
});

test('fo (d): the fo2 roster — deterministic, at most four duty days in a row, rest at fatigue 65', () => {
  const { C } = atCheck(); C.check('typerate', true);
  C.state.fatigue = 20;
  const day0 = C.state.day;
  assert.deepEqual(C.schedule({}), C.schedule({}), 'the same state, the same day');
  assert.deepEqual(foRosterItem(C.state, day0 + 3), foRosterItem(C.state, day0 + 3), 'the roster item is a pure function of seed and day');
  // four duty days at most in a row, over a long run (the pattern itself, Sundays aside)
  let run = 0, runMax = 0;
  for (let d = 1; d <= 240; d++) { run = foPatternDuty(C.state.seed, d) ? run + 1 : 0; runMax = Math.max(runMax, run); }
  assert.ok(runMax <= 4, `the longest duty run is ${runMax}`);
  // the schedule's line items are always on the roster's routes, with one of the three captains, at Haneda
  let lines = 0;
  for (let d = day0; d < day0 + 60; d++) {
    C.state.day = d; C.state.fatigue = 20;
    for (const it of C.schedule({})) if (it.kind === 'line') {
      lines++;
      assert.ok(FO_ROUTES.some(r => r.id === it.route), it.route);
      assert.ok(FO_CAPTAINS.some(c => c.id === it.captain), it.captain);
      assert.deepEqual([it.where, it.slot], ['haneda', 'am']);
      assert.equal(it.role, 'PF', 'no sectors flown yet: the first duties are PF');
    }
  }
  assert.ok(lines >= 20, `${lines} line duties in 60 days`);
  // the role alternates with the legs flown
  C.recordLeg({ route: 'HND-KMQ', role: 'PF', blockMin: 65 });
  C.state.fatigue = 20;
  for (let d = day0; d < day0 + 30; d++) { C.state.day = d; const it = C.schedule({}).find(x => x.kind === 'line'); if (it) { assert.equal(it.role, 'PM', 'one sector flown: PM'); break; } }
  // fatigue at the IMSAFE line: no line item, a rest day instead — whatever the roster says
  C.state.fatigue = 65;
  for (let d = day0; d < day0 + 10; d++) {
    C.state.day = d;
    const items = C.schedule({});
    assert.ok(!items.some(x => x.kind === 'line' || x.kind === 'linecheck'), `day ${d} at fatigue 65: ${JSON.stringify(items)}`);
    if (!isOff(d)) assert.deepEqual(items.map(x => [x.kind, x.reason]), [['off', 'rest']], `day ${d}: a rest day`);
  }
});

test('fo (e): recordLeg and the line check — sectors, block time, fatigue, growth, the milestone', () => {
  const { C } = atCheck(); C.check('typerate', true);
  C.state.fatigue = 20;
  const a0 = C.abilities;
  const r1 = C.recordLeg({ route: 'HND-KMQ', role: 'PF', blockMin: 65, captainEval: 88 });
  assert.deepEqual([r1.sectors, r1.blockMin, r1.evalAvg, r1.lineCheckReady], [1, 65, 88, false]);
  assert.equal(C.state.fatigue, 46, 'a duty tires by 26 (the FDP: the flight plus the preparation)');
  assert.ok(C.abilities.hand > a0.hand && C.abilities.judge > a0.judge, 'a PF leg grows hand and judge');
  assert.deepEqual([C.abilities.comm, C.abilities.know], [a0.comm, a0.know], 'a PF leg grows nothing else');
  const r2 = C.recordLeg({ route: 'HND-CTS', role: 'PM' });
  assert.equal(r2.blockMin, 65 + 95, 'no block minutes said: the route table\'s');
  assert.ok(C.abilities.comm > a0.comm && C.abilities.know > a0.know, 'a PM leg grows comm and know');
  assert.deepEqual([C.state.fo.evalSum, C.state.fo.evalN], [88, 1], 'only the evaluated leg counts in the average');
  // up to the milestone: 12 sectors and 900 block minutes
  assert.equal(foLineCheckReady({ sectors: 12, blockMin: 899, lineCheck: null, done: false }), false, '899 minutes is not enough');
  assert.equal(foLineCheckReady({ sectors: 12, blockMin: 900, lineCheck: null, done: false }), true);
  while (!(C.state.fo.sectors >= 12 && C.state.fo.blockMin >= 900)) C.recordLeg({ route: 'HND-OKA', role: 'PF', blockMin: 100 });
  assert.equal(C.lineCheckReady(), true);
  C.state.fatigue = 20; nextDay(C);
  const lc = C.schedule({}).find(x => x.kind === 'linecheck');
  assert.ok(lc, 'the line check is on the schedule');
  assert.deepEqual([lc.route, lc.role, lc.captain, lc.where], ['HND-KMQ', 'PF', 'examiner', 'haneda']);
  // a fail: not done, and not offered again until four more sectors
  const atFail = C.state.fo.sectors;
  assert.deepEqual([C.recordLineCheck(false).done, C.state.fo.lineCheck], [false, 'fail']);
  assert.equal(C.lineCheckReady(), false);
  for (let i = 0; i < 3; i++) C.recordLeg({ route: 'HND-KMQ', role: 'PF', blockMin: 65 });
  assert.equal(C.state.fo.sectors, atFail + 3); assert.equal(C.lineCheckReady(), false, 'three more sectors: not yet');
  C.recordLeg({ route: 'HND-KMQ', role: 'PF', blockMin: 65 });
  assert.equal(C.lineCheckReady(), true, 'four more sectors: offered again');
  const done = C.recordLineCheck(true);
  assert.deepEqual([done.done, done.lineCheck, C.state.fo.done, C.state.fo.lineCheck], [true, 'pass', true, 'pass']);
  assert.equal(C.lineCheckReady(), false, 'done is done');
  // the whole record survives the save
  const back = cleanCareer(JSON.parse(JSON.stringify(C.state)));
  assert.deepEqual(back.fo, C.state.fo, 'the fo record is in the save');
});

test('fo (f): a jet day — planFor pairs j1 up with j4 down, stepsFor builds, the jet checklists run the day', () => {
  assert.deepEqual(planFor(FL, 'j2'), { main: 'j2', solo: false, lessons: ['j1', 'j2', 'j4'], aircraft: 'b737' });
  assert.deepEqual(planFor(FL, 'j4').lessons, ['j1', 'j4'], 'j4\'s own day is the two of them');
  assert.deepEqual(planFor(FL, 'j1').lessons, ['j1', 'j4'], 'a runway-start lesson pairs with j4');
  assert.deepEqual(planFor(FL, 'j3').lessons, ['j1', 'j3', 'j4']);
  assert.deepEqual(planFor(FL, null, { check: CHECKS.typerate }).lessons, ['j5'], 'the check day is j5 alone, in the jet');
  for (const id of ['j1', 'j2', 'j3', 'j4']) {
    const steps = stepsFor(FL, planFor(FL, id).lessons);
    assert.ok(steps.includes(id) && steps[steps.length - 1] === 'done', `${id}: ${steps.join(',')}`);
  }
  assert.doesNotThrow(() => stepsFor(FL, ['j5']));
  // a jet day's lists are the jet's (and an Archer day's are still the Archer's)
  const day = createDay(FL, { plan: planFor(FL, 'j2') });
  day.boarded();
  assert.equal(day.items().title, CHECKLISTS_JET.before_start.title, 'the jet before-start list');
  // the six lists, in the Archer's shape; nothing of the piston engine anywhere in them
  assert.deepEqual(Object.keys(CHECKLISTS_JET), ['before_start', 'start', 'after_start', 'runup', 'after_landing', 'shutdown']);
  assert.equal(JET_ALIAS, CHECKLISTS_JET);
  const all = JSON.stringify(CHECKLISTS_JET);
  assert.doesNotMatch(all, /マグネト|ミクスチャー|プロペラ|キャブレター|プライマー/);
  assert.match(CHECKLISTS_JET.runup.title, /エンジン計器/, 'the run-up is an engine-instrument check');
  assert.ok(CHECKLISTS_JET.runup.items.some(it => /N1/.test(it[0]) || /N1/.test(it[1])), 'N1 is read in the run-up');
  // every item's test and the instructor's hands run on the c day.js passes, without throwing
  const mkC = () => ({ sw: { master: true, avionics: true, fuelPump: true, beacon: true, nav: true, strobe: true, landing: true, taxi: true, fuelSel: 'L', mag: 'BOTH', mixture: 1, carbHeat: false },
    sys: { running: true, cranking: false, oil: 60, primes: 0 }, s: { thr: 0, flapIdx: 0, spoiler: 0 }, park: true, av: { baro: 29.92 }, rpm: 20, qnh: 29.92, walk: true,
    memo: { both: 0, dropL: 0, dropR: 0, carb: 0, idle: false, hold: { L: 0, R: 0, C: 0 } }, act: () => {}, setThr: () => {}, setFlaps: () => {}, prime: () => {} });
  for (const [list, L] of Object.entries(CHECKLISTS_JET)) for (const it of L.items) {
    assert.equal(it.length, 6, `${list}: ${it[0]} is a full item`);
    if (it[2]) assert.doesNotThrow(() => it[2](mkC()), `${list}: ${it[0]}'s test`);
    if (it[5]) assert.doesNotThrow(() => it[5](mkC()), `${list}: ${it[0]}'s hands`);
  }
});

test('fo dialog: the joining talk is valid, and 「入社する」 fires the hook { name: \'hook\', arg: \'join\' }', () => {
  const data = joinDialogs();
  assert.deepEqual(validateDialogs(data, {}).errors, []);
  assert.deepEqual(validateDialogs(data, {}).warnings, []);
  const hooks = [], state = createDialogState();
  const r = createRunner({ data, state, hooks: { onHook: (n, a) => hooks.push([n, a]) } });
  r.start('join');
  const said = [];
  for (let i = 0; i < 20 && r.running; i++) {
    const v = r.view(); said.push(v.text);
    if (v.choices.length) r.choose(v.choices.findIndex(c => c.text === '入社する'));
    else r.next();
  }
  assert.ok(said.some(t => /今度はあの席が、あなたの席になります/.test(t)), 'the epilogue\'s right seat, turned round');
  assert.deepEqual(hooks.filter(([n]) => n === 'hook'), [['hook', 'join']], 'the joining hook, once');
  assert.equal(state.flags.fo_joined, true);
  // the captains: three, the roster's ids, the strictness in the design's order, a brief and two debriefs each
  assert.deepEqual(captainLines.captains.map(c => c.id), FO_CAPTAINS.map(c => c.id), 'the roster\'s captains');
  assert.deepEqual(captainLines.captains.map(c => c.strict), [1.1, 1.0, 0.9]);
  assert.deepEqual(CAPTAINS_FO, captainLines.captains);
  for (const c of captainLines.captains) {
    assert.ok(c.name_ja && c.intro && c.tone, c.id);
    assert.ok(captainLines.brief(c.id, { route: 'HND-CTS', role: 'PF' }).includes('HND-CTS'), `${c.id}: the briefing fills the route`);
    assert.ok(captainLines.debrief(c.id, true).length > 5 && captainLines.debrief(c.id, false).length > 5, `${c.id}: both debriefs`);
  }
  assert.equal(captainLines.byId('nope'), captainLines.captains[1], 'an unknown captain is the standard one');
});
