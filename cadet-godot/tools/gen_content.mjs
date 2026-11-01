// CADET Godot port — Phase 3 (content) JS reference + data extractor.
// Loads the ORIGINAL modules from cadet-wt-next (898fe8a, read-only) and writes:
//   data/content.json          — the pure-data part of cadet/src/content/*, the FLIGHT LAB
//                                quiz banks and career.js's EXAMS, as JSON. Functions are
//                                kept as { __fn: "<source>" } and RegExps as { __re, __flags }
//                                so nothing is silently dropped (see PHASE3-CONTENT.md).
//   test/reference_content.json — JS-side expectations for test/run_content.gd:
//                                dialog/engine.js unit cases + full runner transcripts over
//                                the real day1/intro dialogs, and content/dialog/atc.js
//                                dayRadio / ctafRadio / ourCall / spoken outputs.
// Run: node tools/gen_content.mjs
import fs from 'node:fs'; import vm from 'node:vm';
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.join(here, '..');
const ROOT = path.join(here, '..', '..', 'cadet-wt-next');
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

// ---- FL assembly (same order as gen_reference2b: physics, avionics, school, syllabus, quiz)
for (const n of ['physics.js', 'avionics.js', 'school.js', 'syllabus.js', 'quiz.js'])
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'flight-lab', 'src', n), 'utf8'), { filename: n });
const FL = globalThis.FL;

// ---- serializer: functions / regexps become marked objects, undefined keys are dropped
// exactly as JSON would drop them; everything else is copied verbatim.
function ser(v) {
  if (typeof v === 'function') return { __fn: v.toString() };
  if (v instanceof RegExp) return { __re: v.source, __flags: v.flags };
  if (Array.isArray(v)) return v.map(ser);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) if (v[k] !== undefined) out[k] = ser(v[k]);
    return out;
  }
  return v === undefined ? null : v;
}
const clone = (o) => JSON.parse(JSON.stringify(o));

// ================================================================ content.json
const people = await imp('cadet/src/content/people.js');
const chkA = await imp('cadet/src/content/checklists-archer.js');
const chkS = await imp('cadet/src/content/checklists-seminole.js');
const walkA = await imp('cadet/src/content/walkaround-archer.js');
const walkS = await imp('cadet/src/content/walkaround-seminole.js');
const lecSum = await imp('cadet/src/content/lecture-summaries.js');
const ansMap = await imp('cadet/src/content/answer-map.js');
const acad = await imp('cadet/src/content/academy-spec.js');
const dorm = await imp('cadet/src/content/dorm-spec.js');
const tower = await imp('cadet/src/content/tower-spec.js');
const hangar = await imp('cadet/src/content/hangar-spec.js');
const usable = await imp('cadet/src/content/usable.js');
const book = await imp('cadet/src/content/book.js');
const day1 = await imp('cadet/src/content/dialog/day1.js');
const intro = await imp('cadet/src/content/dialog/intro.js');
const career = await imp('cadet/src/career/career.js');

const C = {
  meta: { source: 'cadet-wt-next @ 898fe8a', generator: 'tools/gen_content.mjs',
    fnEncoding: 'functions are {__fn: source}, RegExps are {__re: source, __flags: flags}' },
  people: { PEOPLE: ser(people.PEOPLE), PEERS: ser(people.PEERS), PLACES: ser(people.PLACES) },
  checklistsArcher: ser(chkA.CHECKLISTS),
  checklistsSeminole: ser(chkS.CHECKLISTS),
  walkaroundArcher: { WALK_ORDER: walkA.WALK_ORDER, POINTS: ser(walkA.POINTS), TASK_MISSED: ser(walkA.TASK_MISSED), ANOMALIES: walkA.ANOMALIES },
  walkaroundSeminole: { WALK_ORDER: walkS.WALK_ORDER, POINTS: ser(walkS.POINTS), TASK_MISSED: ser(walkS.TASK_MISSED), ANOMALIES: walkS.ANOMALIES },
  lectureSummaries: ser(lecSum.SUMMARIES),
  answerMap: {
    BANK_ANSWERS: ser(ansMap.BANK_ANSWERS), EVENT_ANSWERS: ser(ansMap.EVENT_ANSWERS),
    SCENE_ANSWERS: ser(ansMap.SCENE_ANSWERS), DRILL_ANSWERS: ser(ansMap.DRILL_ANSWERS),
    LISTEN_ANSWERS: ser(ansMap.LISTEN_ANSWERS), PFD_ANSWERS: ser(ansMap.PFD_ANSWERS),
    NOTE_ANSWERS: ser(ansMap.NOTE_ANSWERS),
  },
  academy: ser(acad.academySpec(FL)),
  dorm: ser(dorm.dormSpec()),
  tower: ser(tower.towerSpec()),
  hangar: ser(hangar.hangarSpec()),
  usable: {
    COFFEE_TIRE: usable.COFFEE_TIRE, TOWER_COMM_BASE: usable.TOWER_COMM_BASE,
    TOWER_VISIT: ser(usable.TOWER_VISIT), USABLE: ser(usable.USABLE), NOTICES: ser(usable.NOTICES),
    COFFEE_CARD: ser(usable.COFFEE_CARD), VENDING_CARD: ser(usable.VENDING_CARD),
    FRIDGE_CARD: ser(usable.FRIDGE_CARD), LOCKER_CARD: ser(usable.LOCKER_CARD),
  },
  book: { REAL_NAMES: ser(book.REAL_NAMES) },
  quiz: ser(FL.quiz.BANKS),
  exams: ser(career.EXAMS),
  dialogs: {
    day1: {
      PHASE_LINES: ser(day1.PHASE_LINES), ASSIST_LINES: ser(day1.ASSIST_LINES),
      RECOVER_LINE: day1.RECOVER_LINE, SOLO_LINES: ser(day1.SOLO_LINES), EVENT_LINES: ser(day1.EVENT_LINES),
      day: ser(day1.dayDialogs()), apron: ser(day1.apronDialogs()),
      all: ser((() => { const d = day1.dayDialogs(), a = day1.apronDialogs();
        return { speakers: { ...d.speakers, ...a.speakers }, dialogs: { ...d.dialogs, ...a.dialogs } }; })()),
    },
    intro: {
      INTRO_HOOKS: intro.INTRO_HOOKS, INTRO_SAMPLE: ser(intro.INTRO_SAMPLE), INTRO_RIGHT: ser(intro.INTRO_RIGHT),
      INTRO_AIR: ser(intro.INTRO_AIR), INTRO_AIR_EN: ser(intro.INTRO_AIR_EN),
      INTRO_HUD: ser(intro.INTRO_HUD), INTRO_KEYS_HUD: ser(intro.INTRO_KEYS_HUD), INTRO_CARDS: ser(intro.INTRO_CARDS),
      air: ser(intro.introAirDialogs()),
    },
  },
};
fs.mkdirSync(path.join(PROJ, 'data'), { recursive: true });
fs.writeFileSync(path.join(PROJ, 'data', 'content.json'), JSON.stringify(C));
console.log('content.json bytes:', fs.statSync(path.join(PROJ, 'data', 'content.json')).size);

// ================================================================ reference_content.json
const eng = await imp('cadet/src/dialog/engine.js');
const atcC = await imp('cadet/src/content/dialog/atc.js');
const R = {};

// ---------------------------------------------------------------- dialog unit cases
{
  const U = {};
  const ctxA = { lesson: { title: '離陸', brief: ['x', 'y'] }, n: 5, b: true, s: 'hi', z: null };
  U.getPath = [
    ['lesson.title', ctxA], ['lesson.brief.0', ctxA], ['lesson.brief.5', ctxA], ['missing', ctxA],
    ['n', ctxA], ['constructor', ctxA], ['toString', ctxA], ['lesson.constructor', ctxA], ['z.x', ctxA], ['s.length', ctxA],
  ].map(([p, c]) => ({ path: p, ctx: c, out: eng.getPath(c, p) ?? null, isUndef: eng.getPath(c, p) === undefined }));
  const miss = [];
  U.fill = [
    ['高度 {lesson.title} です', ctxA], ['{n} と {b} と {s}', ctxA], ['{missing}!', ctxA], ['{z} と {lesson}', ctxA],
    ['{not a path} と {} と {n}', ctxA], ['プレーン', ctxA], ['{lesson.brief.1}', ctxA],
  ].map(([t, c]) => { miss.length = 0; const out = eng.fill(t, c, (p) => miss.push(p)); return { text: t, ctx: c, out, missing: [...miss] }; });
  U.fillNoCb = [{ text: '{missing}', ctx: ctxA, out: eng.fill('{missing}', ctxA) }];

  const stA = { v: 1, flags: { a: true, n: 3, s: 'x' }, trust: { instructor: 72 }, items: [], seen: { 'd:n': true } };
  const condCases = [
    null, {}, { all: [] }, { all: [{ flag: 'a' }, { flag: 'n', is: 3 }] }, { all: [{ flag: 'a' }, { flag: 'zz' }] },
    { any: [{ flag: 'zz' }, { flag: 's', is: 'x' }] }, { any: [] }, { not: { flag: 'a' } }, { not: { not: { flag: 'a' } } },
    { flag: 'a' }, { flag: 'zz' }, { flag: 'a', is: true }, { flag: 'a', is: 1 }, { flag: 'n', is: 3 }, { flag: 'zz', is: false },
    { flag: 'constructor' }, { trust: 'instructor', gte: 70 }, { trust: 'instructor', gte: 73 }, { trust: 'instructor', lt: 80 },
    { trust: 'instructor', gte: 60, lt: 80 }, { trust: 'instructor', gte: 80, lt: 90 }, { trust: 'nobody', gte: 50 }, { trust: 'nobody', lt: 50 },
    { seen: 'd:n' }, { seen: 'd:x' }, { ctx: 'lesson.title', is: '離陸' }, { ctx: 'n', is: 5 }, { ctx: 'n', is: '5' },
    { ctx: 'z', exists: false }, { ctx: 'n', exists: true }, { ctx: 'missing', exists: false }, { ctx: 'missing', exists: true },
    { all: [{ any: [{ flag: 'zz' }, { trust: 'instructor', gte: 70 }] }, { not: { seen: 'd:x' } }] },
    // error cases (JS throws)
    { bogus: 1 }, { all: 'x' }, { trust: 'instructor' }, { ctx: 'n' }, { flag: 'a', trust: 'x' }, 'str', 42,
  ];
  U.cond = condCases.map((cond) => {
    try { return { cond: ser(cond), state: clone(stA), ctx: clone(ctxA), out: eng.evalCond(cond === null ? null : clone(cond), clone(stA), clone(ctxA)) }; }
    catch (e) { return { cond: ser(cond), state: clone(stA), ctx: clone(ctxA), throws: true }; }
  });
  U.condKind = [null, {}, { all: [] }, { flag: 'a' }, { flag: 'a', any: [] }, 'x', { not: null }, { ctx: 'n', is: 1 }]
    .map((c) => ({ c: ser(c), kind: eng.condKind(c) }));
  U.effectKind = [null, {}, { set: 'a' }, { trust: 'x', add: 1 }, { give: 'y' }, { hook: 'h' }, { set: 'a', give: 'b' }, []]
    .map((e) => ({ e: ser(e), kind: eng.effectKind(e) }));

  const stateCases = [
    null, {}, { v: 1 }, { v: 2, flags: { a: true } },
    { v: 1, flags: { ok: 1, bad: {}, arr: [], nan: NaN, inf: Infinity, s: 'x', __proto__: true }, trust: { a: 150, b: -5, c: 'x', d: 42.5 }, items: ['a', 'a', 3, 'b'], seen: { x: 1, y: 0, z: 's' } },
    { v: 1, flags: [], trust: [], items: 'x', seen: [] },
  ];
  U.states = stateCases.map((s) => ({ in: ser(s), isState: eng.isDialogState(s), out: ser(eng.createDialogState(s ? clone(s) : s)) }));
  U.trustOf = [{ state: clone(stA), who: 'instructor' }, { state: clone(stA), who: 'nobody' }, { state: null, who: 'x' }]
    .map((c) => ({ ...c, out: eng.trustOf(c.state, c.who) }));

  const effCases = [
    { effects: undefined, state: { v: 1, flags: {}, trust: {}, items: [], seen: {} } },
    { effects: { set: 'a' }, state: { v: 1, flags: {}, trust: {}, items: [], seen: {} } },
    { effects: [{ set: 'a', to: 3 }, { set: 'b', to: 's' }, { set: 'c', to: false }], state: { v: 1, flags: {}, trust: {}, items: [], seen: {} } },
    { effects: [{ trust: 'instructor', add: 30 }, { trust: 'instructor', add: -200 }], state: { v: 1, flags: {}, trust: {}, items: [], seen: {} } },
    { effects: [{ trust: 'new', add: 5 }], state: { v: 1, flags: {}, trust: {}, items: [], seen: {} } },
    { effects: [{ give: 'map' }, { give: 'map' }, { give: 'pen' }], state: { v: 1, flags: {}, trust: {}, items: ['pen'], seen: {} } },
    { effects: [{ hook: 'look', arg: 'player' }, { hook: 'go' }], state: { v: 1, flags: {}, trust: {}, items: [], seen: {} } },
    { effects: [{ set: '__proto__' }], state: { v: 1, flags: {}, trust: {}, items: [], seen: {} } },
    { effects: [{ set: 'a', to: {} }], state: { v: 1, flags: {}, trust: {}, items: [], seen: {} } },
    { effects: [{ trust: 'x', add: '1' }], state: { v: 1, flags: {}, trust: {}, items: [], seen: {} } },
    { effects: [{ give: '' }], state: { v: 1, flags: {}, trust: {}, items: [], seen: {} } },
    { effects: [{ bogus: 1 }], state: { v: 1, flags: {}, trust: {}, items: [], seen: {} } },
    { effects: [{ set: 'a' }, { bogus: 1 }, { set: 'b' }], state: { v: 1, flags: {}, trust: {}, items: [], seen: {} } },
  ];
  U.effects = effCases.map((c) => {
    const st = clone(c.state), hooks = [];
    try {
      eng.applyEffects(c.effects === undefined ? undefined : clone(c.effects), st, { onHook: (n, a) => hooks.push([n, a ?? null]) });
      return { effects: ser(c.effects), stateIn: c.state, stateOut: ser(st), hooks };
    } catch (e) { return { effects: ser(c.effects), stateIn: c.state, stateOut: ser(st), hooks, throws: true }; }
  });

  const dayData = day1.dayDialogs(), introData = intro.introAirDialogs();
  U.resolve = [
    [dayData, 'transit', 'end'], [dayData, 'transit', 'skip'], [dayData, 'transit', 'fault:ask'], [dayData, 'apron', 'hi:2'],
    [dayData, 'transit', 'apron:hi:2'], [dayData, 'transit', 'nope'], [dayData, 'transit', ''], [dayData, 'transit', null],
    [dayData, 'transit', 42], [introData, 'introEnd', 'introD:d:feel:ask'], [introData, 'intro', 'a:yhc:ask'], [introData, 'intro', 'introB:b1'],
  ].map(([d, from, t]) => ({ data: d === dayData ? 'day' : 'intro', from, target: t ?? null, targetIsNull: t === null, out: ser(eng.resolveTarget(d, from, t)) }));
  R.dialogUnit = U;
  R._dayData = null; // (dialog data itself lives in content.json)
}

// ---------------------------------------------------------------- dialog transcripts
{
  const dayData = day1.dayDialogs(), apronData = day1.apronDialogs(), introData = intro.introAirDialogs();
  // apron is its own data object in the game; merge it into the day data for the runner
  const dayAll = { speakers: { ...dayData.speakers, ...apronData.speakers }, dialogs: { ...dayData.dialogs, ...apronData.dialogs } };

  function drive(data, ctx, actions, saved = null, ctxFn = false) {
    const hooks = [];
    const state = eng.createDialogState(saved ? clone(saved) : null);
    const r = eng.createRunner({ data, state, ctx: ctxFn ? () => ctx : ctx, hooks: { onHook: (n, a) => hooks.push([n, a ?? null]) } });
    const steps = [];
    for (const a of actions) {
      let ret;
      if (a.op === 'start') ret = r.start(a.dialog, a.node ?? undefined);
      else if (a.op === 'next') ret = r.next();
      else if (a.op === 'choose') ret = r.choose(a.i);
      else if (a.op === 'press') ret = r.press(a.key);
      else if (a.op === 'stop') { r.stop(); ret = null; }
      steps.push({ ret: ret ?? null, view: ser(r.view()), state: ser(r.state), hooks: clone(hooks), running: r.running });
    }
    return steps;
  }
  const S = (name, dataKey, data, ctx, actions, saved, ctxFn) => ({ name, dataKey, ctx: ser(ctx), actions, saved: ser(saved ?? null), ctxFn: !!ctxFn, steps: drive(data, ctx, actions, saved, ctxFn) });
  const ICTX = (over = {}) => ({ intro: { level: 'good', watch: false, turn: 'good', labSide: 'r', toward: 'good', ...over } });
  R.transcripts = [
    S('transit-skip', 'day', dayAll, {}, [{ op: 'start', dialog: 'transit' }, { op: 'choose', i: 0 }, { op: 'next' }]),
    S('transit-fly', 'day', dayAll, {}, [{ op: 'start', dialog: 'transit' }, { op: 'choose', i: 1 }, { op: 'next' }]),
    S('transit-badchoice', 'day', dayAll, {}, [{ op: 'start', dialog: 'transit' }, { op: 'choose', i: 5 }, { op: 'choose', i: -1 }, { op: 'next' }, { op: 'choose', i: 0 }]),
    S('fault-return', 'day', dayAll, {}, [{ op: 'start', dialog: 'fault' }, { op: 'choose', i: 0 }, { op: 'next' }]),
    S('fault-burn-fault2-ret', 'day', dayAll, {}, [{ op: 'start', dialog: 'fault' }, { op: 'choose', i: 1 }, { op: 'start', dialog: 'fault2' }, { op: 'choose', i: 0 }, { op: 'next' }]),
    S('fault-go', 'day', dayAll, {}, [{ op: 'start', dialog: 'fault' }, { op: 'choose', i: 2 }, { op: 'next' }]),
    S('apron-walk', 'day', dayAll, {}, [{ op: 'start', dialog: 'apron' }, { op: 'next' }, { op: 'next' }, { op: 'choose', i: 0 }, { op: 'next' }]),
    S('apron-node-start', 'day', dayAll, {}, [{ op: 'start', dialog: 'apron', node: 'hi:3' }, { op: 'choose', i: 0 }]),
    S('intro-good', 'intro', introData, ICTX(), [{ op: 'start', dialog: 'intro' }, { op: 'next' }, { op: 'next' }, { op: 'choose', i: 0 }, { op: 'next' }, { op: 'next' }, { op: 'next' }]),
    S('intro-watch', 'intro', introData, ICTX(), [{ op: 'start', dialog: 'intro' }, { op: 'next' }, { op: 'next' }, { op: 'choose', i: 1 }, { op: 'next' }]),
    S('intro-short', 'intro', introData, ICTX(), [{ op: 'start', dialog: 'intro' }], { v: 1, flags: { prologue_short: true }, trust: {}, items: [], seen: {} }),
    S('introB-drift-ok', 'intro', introData, ICTX({ level: 'drift' }), [{ op: 'start', dialog: 'introB' }, { op: 'next' }, { op: 'choose', i: 0 }, { op: 'next' }, { op: 'next' }]),
    S('introB-watch', 'intro', introData, ICTX({ level: 'watch', watch: true }), [{ op: 'start', dialog: 'introB' }, { op: 'next' }, { op: 'choose', i: 2 }, { op: 'next' }]),
    S('introC-lb', 'intro', introData, ICTX({ turn: 'nolook', labSide: 'lb' }), [{ op: 'start', dialog: 'introC' }, { op: 'next' }, { op: 'next' }, { op: 'next' }]),
    S('introD-good', 'intro', introData, ICTX(), [{ op: 'start', dialog: 'introD' }, { op: 'next' }, { op: 'choose', i: 0 }, { op: 'next' }, { op: 'choose', i: 1 }, { op: 'next' }]),
    S('introD-wrong-then-right', 'intro', introData, ICTX(), [{ op: 'start', dialog: 'introD' }, { op: 'next' }, { op: 'choose', i: 1 }, { op: 'next' }, { op: 'choose', i: 0 }, { op: 'next' }, { op: 'choose', i: 2 }, { op: 'next' }]),
    S('introD-watch', 'intro', introData, ICTX({ watch: true }), [{ op: 'start', dialog: 'introD' }, { op: 'next' }, { op: 'choose', i: 0 }, { op: 'next' }]),
    S('introTake', 'intro', introData, ICTX(), [{ op: 'start', dialog: 'introTake' }, { op: 'next' }, { op: 'choose', i: 1 }, { op: 'next' }, { op: 'choose', i: 0 }, { op: 'next' }, { op: 'choose', i: 0 }, { op: 'next' }]),
    S('introEnd-to-introD', 'intro', introData, ICTX(), [{ op: 'start', dialog: 'introEnd' }, { op: 'choose', i: 0 }, { op: 'next' }, { op: 'choose', i: 0 }, { op: 'next' }]),
    S('intro-ctxfn', 'intro', introData, ICTX({ level: 'took', turn: 'took' }), [{ op: 'start', dialog: 'introB' }, { op: 'start', dialog: 'introC' }, { op: 'next' }, { op: 'next' }], null, true),
    S('stop-mid', 'day', dayAll, {}, [{ op: 'start', dialog: 'transit' }, { op: 'stop' }, { op: 'next' }]),
  ];
  delete R._dayData;
}

// ---------------------------------------------------------------- radio (dayRadio / ctaf / ourCall)
{
  const serRadio = (out) => {
    const o = ser(out);
    for (const id of ['twr_exit', 'gnd_in']) {
      const fn = out.exchanges[id];
      o.exchanges[id] = { __callable: true, A2: ser(fn('A2')), A3: ser(fn('A3')) };
    }
    o.call = ser({ ...out.call });
    return o;
  };
  const cases = [];
  const addCase = (name, call, weather) => {
    atcC.setCall(call);
    cases.push({ name, call, weather: ser(weather), out: serRadio(atcC.dayRadio(clone(weather))) });
  };
  // weather inputs derived from career.weatherFor (the day's temp/dew/qnh + the METAR pm wind),
  // exactly the fields day.js hands dayRadio (plus intent/solo/xc from the plan)
  const fromCareer = (seed, day, extra = {}) => {
    const W = career.weatherFor(seed, day);
    const sw = career.surfaceWindOf(W.metar.pm);
    return { windMag: sw.from, windKt: sw.kt, qnh: W.qnh, tempC: W.tempC, dewC: W.dewC, ...extra };
  };
  addCase('career-s1d1-area', 'pa28', fromCareer(1, 1));
  addCase('career-s1d20-pattern', 'pa28', fromCareer(1, 20, { intent: 'pattern' }));
  addCase('career-s7d33-solo', 'pa28', fromCareer(7, 33, { solo: true, intent: 'pattern' }));
  addCase('career-s42d15-xc', 'pa28', fromCareer(42, 15, { xc: true }));
  addCase('career-s3d20-rwy18', 'pa28', fromCareer(3, 20, { force: undefined, runway: '18' }));
  addCase('seminole-xc', 'pa44', fromCareer(5, 40, { xc: true }));
  addCase('seminole-pattern-solo', 'pa44', fromCareer(9, 12, { intent: 'pattern', solo: true }));
  addCase('ifr-day', 'pa28', { windMag: 30, windKt: 6, qnh: 29.71, tempC: 12, dewC: 11, ifr: true, info: 'Bravo', zulu: '0853' });
  addCase('calm', 'pa28', { windMag: 0, windKt: 0, qnh: 30.10, tempC: 22, dewC: 9, info: 'Charlie', zulu: '1753' });
  addCase('windy-mag0', 'pa28', { windMag: 0, windKt: 14, qnh: 28.92, tempC: 5, dewC: -2 });
  addCase('defaults', 'pa28', {});
  addCase('qnh-swap-edge', 'pa28', { windMag: 190, windKt: 8, qnh: 29.99, tempC: 18, dewC: 3, runway: '18' });
  atcC.setCall('pa28');
  R.radio = {
    cases,
    ctaf: ser(atcC.ctafRadio()),
    ctafConst: { area: atcC.CTAF_AREA, ctaf: ser(atcC.CTAF), freq: ser(atcC.FREQ), calls: ser(atcC.CALLS) },
    ourCall: [
      ['pa28', 'Archer Seven Lima Alpha, LAB Tower'], ['pa28', 'Seminole Seven Lima Alpha'],
      ['pa28', 'Archer 7LA, ready'], ['pa28', '…Seven Lima…'], ['pa28', 'no call sign here'], ['pa28', 42], ['pa28', null],
      ['pa44', 'Archer Seven Lima Alpha'], ['pa44', 'Seminole 7LA'], ['pa44', '…Seven Lima…'],
    ].map(([call, input]) => { atcC.setCall(call); return { call, input: input ?? null, inputIsNull: input === null, out: atcC.ourCall(input) ?? null }; }),
    spoken: [
      ['pa28', 'Archer 8SY, runway three six'], ['pa28', 'Seminole 2SY'], ['pa44', 'Seminole 2SY, final'], ['pa44', 'Archer 8SY'],
    ].map(([call, input]) => { atcC.setCall(call); return { call, input, out: atcC.spoken(input) }; }),
  };
  atcC.setCall('pa28');
}

// ---------------------------------------------------------------- content expectations
{
  const E = {};
  E.peopleCount = Object.keys(C.people.PEOPLE).length;
  E.quizBanks = C.quiz.map((b) => ({ id: b.id, title: b.title, n: b.qs.length, first: b.qs[0] }));
  E.walkArcherIds = C.walkaroundArcher.POINTS.map((p) => p.id);
  E.walkSeminoleIds = C.walkaroundSeminole.POINTS.map((p) => p.id);
  E.academyRooms = C.academy.rooms.map((r) => r.id);
  E.academyCounts = { rooms: C.academy.rooms.length, doors: C.academy.doors.length, interactables: C.academy.interactables.length };
  E.dormRooms = C.dorm.rooms.map((r) => r.id);
  E.towerRooms = C.tower.rooms.map((r) => r.id);
  E.hangarAreas = C.hangar.areas.map((a) => a.id);
  E.summaryKeys = Object.keys(C.lectureSummaries).length;
  E.chkArcher = Object.fromEntries(Object.entries(C.checklistsArcher).map(([k, v]) => [k, { title: v.title, items: v.items.map((it) => it[0]) }]));
  E.chkSeminole = Object.fromEntries(Object.entries(C.checklistsSeminole).map(([k, v]) => [k, { title: v.title, items: v.items.map((it) => it[0]) }]));
  E.usableFns = {
    shelf: [[3, ['a', 'b', 'c', 'd']], [0, ['a', 'b']], [-1, ['a', 'b', 'c']], [7, []]].map(([d, ids]) => ({ day: d, ids, out: usable.shelfSection(d, ids) })),
    notices: [[1, 3], [2, 3], [10, 3], [0, 2], [-3, 3]].map(([d, n]) => ({ day: d, n, out: usable.dailyNotices(d, n) })),
    kind: ['coffee', 'shelf-brief-1', 'sim-station', 'nope', 'pc-dispatch'].map((id) => ({ id, out: usable.usableKind(id) })),
  };
  E.bookFns = {
    plain: ['<p>あ<b>い</b>う</p><p>え&amp;お</p>', 'x<svg><path/></svg>y', null, '  a   b  '].map((h) => ({ in: h ?? null, inIsNull: h === null, out: book.plain(h) })),
    sentences: ['あ。い（う。え）お。', 'x', '', 'あ！い？う'].map((t) => ({ in: t, out: book.sentences(t) })),
  };
  R.expect = E;
}

fs.writeFileSync(path.join(PROJ, 'test', 'reference_content.json'), JSON.stringify(R));
console.log('reference_content.json bytes:', fs.statSync(path.join(PROJ, 'test', 'reference_content.json')).size);
console.log('transcripts:', R.transcripts.length, ' radio cases:', R.radio.cases.length,
  ' quiz banks:', C.quiz.length, ' academy rooms:', C.academy.rooms.length);
