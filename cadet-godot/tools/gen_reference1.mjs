// CADET Godot port — Phase 1 JS reference generator (part A: hold / tem / career / atc / analysis)
// Loads the ORIGINAL modules from cadet-wt-next (898fe8a) and writes test/reference1.json.
// The GDScript runner (test/run_tests1.gd) replays the same inputs against the ports.
import fs from 'node:fs'; import vm from 'node:vm';
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..', '..', 'cadet-wt-next');
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'flight-lab/src/physics.js'), 'utf8'), { filename: 'physics.js' });
const P = globalThis.FL.physics;

const career = await imp('cadet/src/career/career.js');
const hold = await imp('cadet/src/flight/hold.js');
const tem = await imp('cadet/src/career/tem.js');
const analysis = await imp('cadet/src/flight/analysis.js');
const { createAtc } = await imp('cadet/src/dialog/atc.js');
const { snapshot } = await imp('cadet/src/flight/recorder.js');

const R = { hold: {}, tem: {}, career: {}, atc: {}, analysis: {} };
const round6 = (o) => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v));

// ---------------------------------------------------------------- hold
{
  const entries = [];
  for (let c = 0; c < 360; c += 5) for (const side of [true, false])
    entries.push({ courseToFix: c, holdingSide: side, entry: hold.entryForHold(hold.HOLD_LBV, { courseToFix: c, holdingSide: side }) });
  R.hold.entries = entries;
  const sides = [];
  for (let a = 7.5; a < 360; a += 15) {
    const rad = a * Math.PI / 180, dn = Math.cos(rad) * 1200, de = Math.sin(rad) * 1200;
    sides.push({ dn: Math.round(dn), de: Math.round(de), side: hold.onHoldingSide(hold.HOLD_LBV, dn, de) });
  }
  R.hold.sides = sides;
  const winds = [];
  for (let f = 0; f < 360; f += 10) for (const kt of [5, 12, 20]) winds.push({ from: f, kt, out: hold.windCorrection(hold.HOLD_LBV, { windFrom: f, windKt: kt }) });
  winds.push({ from: 10, kt: 5, tas: 80, out: hold.windCorrection(hold.HOLD_LBV, { windFrom: 10, windKt: 5, tasKt: 80 }) });
  winds.push({ from: 0, kt: 0, out: hold.windCorrection(hold.HOLD_LBV, { windFrom: 0, windKt: 0 }) });
  R.hold.winds = winds;
  R.hold.holdLbv = hold.HOLD_LBV;
  R.hold.entryNames = hold.ENTRY_NAMES;
}

// ---------------------------------------------------------------- tem
{
  const kinds = ['good', 'southFlow', 'amLowCloud', 'amFog', 'pmStorm', 'pmWind', 'crosswind', 'storm', 'lowCloud', 'forecastBust'];
  const out = [];
  const base = { weather: 'good', fatigue: 20, chapter: 'ch3', aircraft: 'pa28', check: false, xc: false, traffic: 0, cb: false };
  for (const kind of kinds) for (const day of [1, 5, 13]) for (const fatigue of [20, 50]) {
    const o = { ...base, weather: kind, day, fatigue };
    out.push({ in: o, out: tem.temFor(o) });
  }
  for (const over of [{ chapter: 'ch4' }, { aircraft: 'pa44' }, { check: true }, { xc: true }, { traffic: 2 }, { traffic: 1, weather: 'pmStorm' }, { cb: true, weather: 'pmStorm' }, { cb: true, weather: 'storm' }, { cb: true }, { fatigue: 45 }, { fatigue: 44 }, { day: 0 }, { day: -3 }, { weather: 'lowCloud', chapter: 'ch4', aircraft: 'pa44', check: true, xc: true, traffic: 3, fatigue: 60 }]) {
    const o = { ...base, day: 7, ...over };
    out.push({ in: o, out: tem.temFor(o) });
  }
  R.tem.cases = out;
  R.tem.threatOf = ['storm', 'calm', 'nope'].map(id => tem.threatOf(id));
  const sums = [
    {},
    { incursion: true, radio: { wrong: 2 }, autoItems: 9, walk: { missed: ['pitot'] }, lessons: [{ done: true, title: '離陸', rows: [{ name: '速度', pass: false }] }, { done: true, title: '着陸', rows: [{ name: 'フレア', pass: false }] }] },
    { radio: { wrong: 0 }, autoItems: 6, walk: { missed: [] }, lessons: [{ done: false, rows: [{ name: 'x', pass: false }] }, { rows: [{ name: 'y', pass: false }] }] },
    { walk: { missed: 2 } },
    { lessons: [{ done: true, title: '航法', rows: [{ name: '針路', pass: true }, { name: '時刻', pass: false }] }] },
    { autoItems: 7, radio: { wrong: 1 } },
  ];
  R.tem.errors = sums.map(s => ({ in: s, ja: tem.errorsOf(s), en: tem.errorsOfEn(s) }));
}

// ---------------------------------------------------------------- career (pure)
{
  const C = {};
  C.dates = [1, 2, 4, 30, 31, 61, 100, 365, 400, 730, 1000].map(d => ({ day: d, date: career.dateOf(d), text: career.dateText(d), doy: career.dayOfYear(d), off: career.isOff(d) }));
  const wx = [];
  for (const seed of [1, 7, 42]) for (let day = 1; day <= 60; day++) {
    wx.push({ seed, day, o: {}, w: career.weatherFor(seed, day) });
    wx.push({ seed, day, o: { ifr: true }, w: career.weatherFor(seed, day, { ifr: true }) });
    wx.push({ seed, day, o: { bustOk: true }, w: career.weatherFor(seed, day, { bustOk: true }) });
  }
  for (const f of ['good', 'storm', 'lowCloud', 'southFlow']) wx.push({ seed: 3, day: 20, o: { force: f }, w: career.weatherFor(3, 20, { force: f }) });
  C.weather = wx;
  C.weatherAt = [];
  for (const kind of ['amFog', 'amLowCloud', 'lowCloud', 'forecastBust', 'good']) {
    const W = career.weatherFor(5, 33, { force: kind });
    for (const h of [6, 7.7, 8, 9.6, 11, 12, 12.5, 14, 18.6]) C.weatherAt.push({ kind, h, at: career.weatherAt(W, h) });
  }
  C.aloft = [];
  for (let day = 1; day <= 40; day++) { const W = career.weatherFor(11, day); C.aloft.push({ day, surf: career.surfaceWindOf(W.metar.pm), aloft: career.windsAloftFor(W), rwy: career.activeRunway(W) }); }
  C.surface = ['36005KT', '09016G24KT', '00000KT', '19008KT', '24018G30KT', 'VRB02KT', ''].map(m => ({ m, w: career.surfaceWindOf(m) }));
  C.weatherFor2 = [];
  for (const kind of ['lowCloud', 'good']) for (const ch of ['ch3', 'ch4']) for (const k of ['flight', 'xc']) {
    const W = career.weatherFor(2, 15, { force: kind });
    C.weatherFor2.push({ kind, ch, k, w: career.weatherFor2(W, ch, k) });
  }
  C.growth = {
    lesson: [], ftd: {}, class: {},
  };
  for (const g of ['S', 'A', 'B', 'C', 'D']) for (const lv of ['basic', 'precision', 'intro']) for (const id of ['a1', 'i3', 'n2', 'x1', 'e4', 't2']) for (const tired of [false, true])
    C.growth.lesson.push({ g, lv, id, tired, out: career.lessonGrowth(g, lv, id, tired) });
  for (const id of ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'x9']) C.growth.ftd[id] = career.ftdGrowth(id);
  for (const p of ['full', 'need', 'quick', 'other']) C.growth.class[p] = career.classGrowth(p);
  C.rank = [
    career.graduationRank({ abilities: { hand: 80, know: 70, comm: 60, judge: 75 }, firstTry: { pass: 9, total: 10 }, exams: { a: { tries: 1 }, b: { tries: 2 } } }, { lessons: { a1: { score: 90 }, a2: { score: 80 }, a3: {} } }),
    career.graduationRank({ abilities: { hand: 50, know: 50, comm: 50, judge: 50 }, firstTry: { pass: 3, total: 10 }, exams: {} }, null),
    career.graduationRank(null, null),
    career.graduationRank({ abilities: { hand: 95, know: 95, comm: 95, judge: 95 }, firstTry: { pass: 0, total: 0 }, exams: { a: { tries: 7 } } }, { lessons: {} }),
  ];
  C.trustBand = [0, 39, 40, 59, 60, 79, 80, 100].map(v => career.trustBand(v));
  C.missAsk = [
    career.missAsk({ miss: { day: 10, key: 'radio', label: '無線の復唱' } }),
    career.missAsk({ miss: { day: 3, key: 'flare', label: '着陸のフレア' } }),
    career.missAsk({ miss: null }), career.missAsk({}),
    career.missAsk({ miss: { day: 7, key: 'x', label: '外部点検で見落とした異常' } }),
  ];
  // gates + schedules with scripted progress
  const progOf = (ids) => ({ lessons: Object.fromEntries(ids.map(id => [id, { pass: true, levels: ['basic'] }])) });
  const st = (over) => Object.assign(career.newCareer(3), over);
  const schedIn = [];
  const addSched = (name, state, prog, opts = {}) => schedIn.push({ name, state, prog, opts, gate: career.gate(state, prog, opts.trust ?? 50), schedule: career.schedule(state, prog, opts) });
  addSched('prologue', st({}), null);
  addSched('ch1-fresh', st({ chapter: 'ch1', day: 2 }), null);
  addSched('ch1-class-today', st({ chapter: 'ch1', day: 2, done: { 'class:0': 2 } }), progOf(['k1']));
  addSched('ch1-late', st({ chapter: 'ch1', day: 9, done: { 'class:0': 3, 'class:1': 4, 'class:2': 5, 'class:3': 6, 'class:4': 7, 'class:5': 8 } }), progOf(['k1', 'k2', 'k3', 'k4', 'k5', 'k6']));
  addSched('ch2-fresh', st({ chapter: 'ch2', day: 12 }), progOf([]));
  addSched('ch2-mid', st({ chapter: 'ch2', day: 20 }), progOf(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't2']));
  addSched('ch2-solo-low-judge', st({ chapter: 'ch2', day: 30, exams: { presolo: { tries: 1, best: 90, pass: true } } }), progOf([...career.CH2, 'c1']), { trust: 70 });
  addSched('ch2-solo', st({ chapter: 'ch2', day: 30, exams: { presolo: { tries: 1, best: 90, pass: true } }, abilities: { hand: 40, know: 20, comm: 20, judge: 35 } }), progOf([...career.CH2, 'c1']), { trust: 70 });
  addSched('ch3-fresh', st({ chapter: 'ch3', day: 40 }), progOf([]));
  addSched('ch3-check', st({ chapter: 'ch3', day: 50, exams: { nav: { tries: 1, best: 85, pass: true } } }), progOf(career.STAGE.ch3.lessons));
  addSched('ch4-cloud', st({ chapter: 'ch4', day: 60 }), progOf(['i1']), { weather: career.weatherFor(3, 60, { force: 'lowCloud' }) });
  addSched('ch6-night', st({ chapter: 'ch6', day: 80, exams: { final: { tries: 1, best: 88, pass: true } } }), progOf(['r1']));
  addSched('ch6-grad', st({ chapter: 'ch6', day: 81, exams: { final: { tries: 1, best: 88, pass: true } }, checks: { final: { tries: 1, pass: true, day: 80 } } }), progOf(['r1']));
  addSched('off-ch1', st({ chapter: 'ch1', day: 4, done: { 'class:0': 2 } }), null);
  addSched('graduated', st({ chapter: 'ch6', day: 90, graduated: { day: 85 } }), progOf(['r1']));
  C.sched = schedIn;
  C.noteGround = [
    career.noteGround(null, true, 100), career.noteGround({ tries: 1, best: 'A', pass: true, levels: [] }, true, 85),
    career.noteGround({ tries: 2, best: 'B', pass: true, levels: [] }, false), career.noteGround(null, true, 95),
    career.noteGround({ tries: 0, best: '', pass: false, levels: [] }, true, 50),
  ];
  career.CLASS_SECTIONS[0] = ['aero.1', 'aero.2']; career.CLASS_SECTIONS[1] = ['sys.1', 'perf.1'];
  C.heardSet = [
    [...career.heardSet({ heard: { 'wx.1': 'f' }, done: { 'class:0': 3 } })],
    [...career.heardSet({ heard: {}, done: {} })],
  ];
  C.classSections = career.CLASS_SECTIONS.map(a => a.slice());
  // cleanCareer over crafted saves (inputs are JSON strings, replayed identically on the GD side)
  const cleanInputs = [
    { v: 2, seed: 5, day: 40, chapter: 'ch2', fatigue: 130.6, abilities: { hand: 55.5, know: -3, judge: 100 }, exams: { written1: { tries: 2.7, best: 88.2, pass: 1 } }, decisions: [{ day: 3, choice: 'go', right: true }, { day: 'x', choice: 1, right: true }], done: { 'flight:a1': 12, 'bad key!': 3 }, heard: { 'aero.1': 'f', 'bad': 'f', 'sys.2': 'x' }, answers: { 'q_aero#1': [3, 1, 1, 20], 'bad': [1, 2, 3] }, walked: ['lobby', 'lobby', 'brief-1', 'BAD ROOM'], growth: { 'exam:written1': 3, 'bad key': 2 }, miss: { day: 39, key: 'radio', label: '無線の復唱' }, aloft: { day: 40, surfFrom: 190, surfKt: 8, from: 220, kt: 16 }, drills: { day: 40, n: 5 }, graduated: { day: 38, rank: '優等', total: 70.5 }, firstTry: { pass: 12, total: 9 } },
    { v: 1, seed: 9, day: 20, chapter: 'ch1', done: { 'class:0': 15, 'class:2': 18, 'ftd:k1': 16 } },
    { v: 3 }, 'garbage', { v: 2, exams: 'nope', day: -5, slot: 'noon' },
    { v: 2, seed: 0, checks: { xc: { tries: 1.5, pass: true, day: 12 }, nope: { tries: 1 } }, solo: { day: 33 }, examDay: { written1: 5, bogus: 3 } },
  ];
  C.clean = cleanInputs.map(o => ({ in: JSON.stringify(o), out: career.cleanCareer(JSON.parse(JSON.stringify(o))) }));
  R.career = C;
}

// ---------------------------------------------------------------- career instance flow
{
  const store = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; } };
  const c = career.createCareer({ store, seed: 1234 });
  const log = [];
  log.push(['date', c.date(), 'day', c.day, 'slot', c.slot, 'chapter', c.chapter, 'hours', c.hours]);
  log.push(['weather', c.weather(null)]);
  log.push(['schedule', c.schedule(null)]);
  log.push(['gate', c.gate(null)]);
  c.done('ceremony', 'welcome'); c.done('tour', 'tour'); c.done('brief', 'meet'); c.finishPrologue();
  log.push(['prologueFlags', career.prologueFlags(c.state)]);
  log.push(['advanceChapter', c.advanceChapter(null), c.chapter]);
  log.push(['examReady', c.examReady('written1')]);
  const ex1 = c.exam('written1', 86); log.push(['exam1', ex1, 'readyAgain', c.examReady('written1'), 'fatigue', c.state.fatigue, 'know', c.abilities.know]);
  log.push(['examSameDayGate', career.gate(c.state, { lessons: Object.fromEntries(career.GROUND.map(id => [id, { pass: true }])) })]);
  log.push(['drills', c.drill(), c.drill(), c.drill(), 'left', c.drillsLeft(), 'judge', c.abilities.judge]);
  const w = career.weatherFor(1234, 1); log.push(['decision', c.decision(w.decision, w), 'decided', c.decidedToday()]);
  log.push(['grow', c.grow('hand', 3.0, 'lesson:a1'), c.grow('hand', 3.0, 'lesson:a1'), c.grow('hand', 3.0, 'lesson:a1'), c.grow('bogus', 5), c.grow('know', -1)]);
  log.push(['firstTry', c.firstTry(true), c.firstTry(false)]);
  log.push(['attempt', c.attempt('lesson:a1'), c.attempt('lesson:a1'), c.tries('lesson:a1'), c.attempt('bad key!')]);
  c.answered('q_aero#1', true); c.answered('q_aero#1', false); c.answered('bad id!', true);
  c.heardSection('aero.1', 'q'); c.heardSection('aero.1', 'f'); c.heardSection('aero.2', 'q'); c.heardSection('bad', 'f');
  log.push(['heard', [...c.heardSet()]]);
  c.setPace('quick'); c.setPace('bogus'); c.walkedInto('lobby'); c.walkedInto('lobby'); c.walkedInto('BAD!');
  c.noteMiss('radio', '無線の復唱'); log.push(['missAsk', career.missAsk(c.state)]); c.clearMiss(); log.push(['missAfter', c.state.miss]);
  log.push(['aloft', c.aloft(null)]);
  log.push(['advance', c.advance(), c.slot, c.advance('evening'), c.slot, c.advance()]);
  c.tire(30); log.push(['tired', c.tired(), c.state.fatigue]);
  log.push(['sleep', c.sleep(), 'fatigue', c.state.fatigue]);
  c.tire(80); log.push(['sleepLate', c.sleep({ late: true }), 'fatigue', c.state.fatigue, 'tired', c.tired()]);
  log.push(['checkBad', (() => { try { return c.check('bogus', true); } catch (e) { return 'throws'; } })()]);
  const savedJson = store.data[career.CAREER_KEY];
  const c2 = career.createCareer({ store, seed: 999 });
  log.push(['reloadedDay', c2.day, 'reloadedChapter', c2.chapter]);
  log.push(['loadBad', c2.load({ v: 9 }), 'loadGood', c2.load(career.newCareer(77)), c2.day, c2.chapter]);
  R.careerFlow = { log, savedJson };
}

// ---------------------------------------------------------------- atc
{
  const radio = {
    call: { short: 'Archer 8SY' },
    exchanges: {
      atis: { station: 'ATIS', freq: '127.65', kind: 'listen', q: 'ATIS を聞いて情報の文字を答える', time: 25,
        hear: [{ who: 'ATIS', en: 'LAB information Alpha time 1253 wind 010 at 5 visibility 10 temperature 17 dewpoint 8 altimeter 2992', ja: '情報 Alpha' }],
        choices: [{ en: 'Information Alpha', ok: true }, { en: 'Information Bravo', why: '情報は Alpha です' }, { en: 'Information Charlie', why: '情報は Alpha です' }], reply: [] },
      gnd1: { station: 'GND', freq: '121.7', kind: 'call', q: '地上管制への最初の呼びかけ', time: 20, hear: [],
        choices: [{ en: 'LAB Ground Archer 8SY east ramp with information Alpha request taxi', ok: true }, { en: 'Ground Archer 8SY taxi please', why: '管制官の名前と情報を持っていることを言います' }, { en: 'Archer 8SY is ready', why: '誰に話しているかから始めます' }],
        reply: [{ who: 'GND', en: 'Archer 8SY LAB Ground taxi to runway 36 via Alpha', ja: 'タクシー許可' }], note: 'その通りです' },
      gnd2: { station: 'GND', freq: '121.7', kind: 'readback', q: 'タクシー指示の復唱', time: 20,
        hear: [{ who: 'GND', en: 'Archer 8SY runway 36 taxi via Alpha hold short of runway 36 at Alpha Two', ja: 'タクシー指示' }],
        choices: [{ en: 'Runway 36 via Alpha hold short at Alpha Two Archer 8SY', ok: true }, { en: 'Taxi via Alpha Archer 8SY', why: '滑走路の番号と停止位置の復唱が抜けています', negative: 'Negative read back the runway and the hold short instruction' }, { en: 'Hold short Archer 8SY', why: '経路の復唱が抜けています' }],
        reply: [{ who: 'GND', en: 'Archer 8SY readback correct', ja: '復唱正しい' }] },
    },
    sequences: { ground: ['atis', 'gnd1', 'gnd2'] },
  };
  R.atc.radio = radio;
  const atc = createAtc(radio, { seed: 11 });
  const transcript = [];
  const says = [];
  const step = (dt) => { for (const e of atc.update(dt)) if (e.type === 'say') says.push(e); else transcript.push(['event', e]); };
  const snapView = (tag) => { const v = atc.view(); transcript.push([tag, v && { phase: v.phase, id: v.id, choices: v.choices.map(c => c.en), timeLeft: Math.round(v.timeLeft * 100) / 100, wrongWhy: v.wrongWhy, last: v.last }]); };
  transcript.push(['start', (() => { const v = atc.start('ground'); return v && v.phase; })()]);
  let guard = 0;
  const untilChoose = () => { while (atc.view() && atc.view().phase !== 'choose' && guard++ < 400) step(0.25); };
  untilChoose(); snapView('atis-choose');
  transcript.push(['answer', atc.answer(atc.rightIndex())]);
  untilChoose(); snapView('gnd1-choose');
  const ri = atc.rightIndex(); transcript.push(['answerWrong', atc.answer((ri + 1) % atc.view().choices.length)]);
  untilChoose(); snapView('gnd1-again');
  // let the clock run out once (late): step without answering until the re-call line is heard
  const saysBefore = says.length; guard = 0;
  while (says.length === saysBefore && guard++ < 400) step(0.25);
  snapView('gnd1-late');
  transcript.push(['answer', atc.answer(atc.rightIndex())]);
  untilChoose(); snapView('gnd2-choose');
  transcript.push(['answer', atc.answer(atc.rightIndex())]);
  guard = 0; while (atc.busy && guard++ < 400) step(0.25);
  transcript.push(['summary', atc.summary()]);
  transcript.push(['log', atc.log]);
  transcript.push(['says', says]);
  transcript.push(['busy', atc.busy, 'seq', atc.seq]);
  R.atc.transcript = transcript;
}

// ---------------------------------------------------------------- analysis (synthetic + a flown recording)
{
  const A = {};
  A.rwy = [];
  for (const [n, e] of [[0, -40000], [300, -40000], [0, -39700], [-500, -40100], [1200, -40000]]) A.rwy.push({ n, e, ...analysis.rwyCoords(n, e) });
  const qFromHPB = (h, p, b) => {
    // build [x,y,z,w] quaternions the same way for both sides: inputs are the literal arrays below
    return null;
  };
  A.att = [
    { q: [0, 0, 0, 1] }, { q: [0, 0, 0.7071068, 0.7071068] }, { q: [0.1830127, 0, 0, 0.9659258] },
    { q: [0, 0.258819, 0, 0.9659258] }, { q: [0.5, 0.5, 0.5, 0.5] },
  ].map(x => ({ q: x.q, att: analysis.attOf(x) }));
  A.gp = [{ n: -2000, e: -40000, alt: 1055 }, { n: 100, e: -40000, alt: 200 }, { n: 500, e: -40000, alt: 55 }].map(x => ({ ...x, gp: analysis.gpOf(x), agl: analysis.aglFtOf(x) }));
  A.spark = [
    analysis.sparkline([1, 2, 3, 4, 5, 6, 7, 8]), analysis.sparkline([8, 7, 6, 5, 4, 3, 2, 1], { invert: true }),
    analysis.sparkline([5, 5, 5]), analysis.sparkline([]), analysis.sparkline([0, 100]),
  ];
  const compactIn = { td: { along: 350.24, cross: -3.26, sink: 120.4, float: 210.5, zone: true }, gate: { stable: true, ias: 68.24, gp: 3.14, vs: -540.6 }, man: [{ name: '直線水平（保持）', score: 0.923 }, { name: 'x'.repeat(30), score: 2 }] };
  A.compact = compactIn;
  A.clean = [analysis.cleanAnalysis(compactIn), analysis.cleanAnalysis(null), analysis.cleanAnalysis({}), analysis.cleanAnalysis({ td: { along: 'x' } }), analysis.cleanAnalysis({ man: [{ name: '', score: 0.5 }, { name: '旋回', score: 0.5 }] })];
  A.statsIn = [
    { date: '2027-04-02', lesson: 'a1', along: 300, cross: 2, sink: 100, float: 150, zone: true, gate: { stable: true } },
    { date: '2027-04-03', lesson: 'a2', along: 420, cross: -5, sink: 180, float: 260, zone: true, gate: { stable: false } },
    { date: '2027-04-04', lesson: 't3', along: 800, cross: 12, sink: 320, float: 500, zone: false, gate: null },
  ];
  A.history = analysis.landingHistory([{ date: '2027-04-02', lessons: [{ id: 'a1', ana: { td: A.statsIn[0] && { along: 300, cross: 2, sink: 100, float: 150, zone: true }, gate: { stable: true } } }, { id: 'a2', ana: null }, { id: 'a3', ana: { td: { along: 420, cross: -5, sink: 180, float: 260, zone: true }, gate: { stable: false } } }] }]);
  A.stats = analysis.landingStats(A.statsIn);
  A.statsEmpty = analysis.landingStats([]);
  R.analysis = A;

  // a flown recording: takeoff, climb, level, a 90° turn, descent, landing (bot laws from flight-lab/test/bot.mjs)
  const s = P.newState({}); s.wind = { fromDeg: 0, kt: 0, gust: 0 };
  P.placeOnRunway(s);
  const w180 = a => ((a % 360) + 540) % 360 - 180;
  const clamp = P.clamp;
  const bot = { pBase: null };
  const ctxOf = () => { const o = s.out; return { hdg: ((o.hdgTrue + 6) % 360 + 360) % 360, pitch: o.pitch, vs: o.vsi, alt: o.altTrue, kias: o.ias, agl: o.agl, onGround: s.onGround, gsK: o.gs }; };
  const pitchTo = (deg) => { s.keyHold = true; s.pTgt = clamp(deg, -20, 22); s.pRate = 0; };
  const bankTo = (bankT) => { const p = -s.w[2] / (Math.PI / 180); s.rIn = clamp(0.045 * (bankT - s.out.bank) - 0.012 * p, -1, 1); };
  const headTo = (c, hdgT, maxBank = 25) => bankTo(clamp(w180(hdgT - c.hdg) * 1.5, -maxBank, maxBank));
  const vsPitch = (c, vsT, dt) => { if (bot.pBase == null) bot.pBase = c.pitch; bot.pBase = clamp(bot.pBase + (vsT - c.vs) * 0.0012 * dt, -10, 15); pitchTo(bot.pBase + (vsT - c.vs) * 0.004); };
  const altVs = (c, alt) => clamp((alt - c.alt) * 3, -700, 700);
  const botThr = { i: 0 };
  const speedThr = (c, kt, dt) => { const e = kt - c.kias; botThr.i = clamp(botThr.i + e * 0.004 * dt, -0.4, 0.4); s.thr = clamp(s.thr + (e * 0.02 + botThr.i * 0.5) * dt * 2, 0, 1); };
  const samples = [];
  const DT = 1 / 120;
  let phase = 'roll', phaseT = 0;
  const totalSteps = 120 * 300;
  for (let i = 0; i < totalSteps; i++) {
    const c = ctxOf(), t = i * DT;
    if (phase === 'roll') {
      s.brake = false; s.thr = 1;
      s.rud = clamp(-0.06 * w180(c.hdg - 360), -1, 1);
      if (c.kias > 54) { s.pIn = 0.65; phase = 'climb'; bot.pBase = null; }
    } else if (phase === 'climb') {
      s.pIn = 0; vsPitch(c, altVs(c, 800), DT); headTo(c, 354 + 6);
      if (c.alt > 760) { phase = 'level'; phaseT = t; bot.pBase = null; }
    } else if (phase === 'level') {
      vsPitch(c, altVs(c, 800), DT); headTo(c, 354 + 6); speedThr(c, 90, DT);
      if (t - phaseT > 25) { phase = 'turn'; phaseT = t; bot.pBase = null; }
    } else if (phase === 'turn') {
      vsPitch(c, altVs(c, 800), DT); headTo(c, 264 + 6); speedThr(c, 90, DT);
      if (Math.abs(w180(c.hdg - 270)) < 4 || t - phaseT > 40) { phase = 'level2'; phaseT = t; bot.pBase = null; }
    } else if (phase === 'level2') {
      vsPitch(c, altVs(c, 800), DT); headTo(c, 264 + 6); speedThr(c, 90, DT);
      if (t - phaseT > 10) { phase = 'descend'; phaseT = t; bot.pBase = null; s.flapIdx = 2; }
    } else if (phase === 'descend') {
      const agl = c.alt - 55;
      const vsT = agl < 45 ? -160 : clamp((0 - c.alt) * 3, -800, -250);
      vsPitch(c, Math.max(vsT, -650), DT); headTo(c, 264 + 6, 12);
      s.thr = clamp(s.thr + ((c.kias > 75 ? -0.2 : c.kias < 62 ? 0.2 : 0)) * DT, 0.05, 0.6);
      if (s.onGround) { phase = 'rollout'; phaseT = t; }
    } else if (phase === 'rollout') {
      s.thr = 0; s.brake = c.gsK > 5; s.pIn = 0; s.rIn = 0;
      if (t - phaseT > 6) break;
    }
    P.step(s, DT);
    if (i % 12 === 0) samples.push(snapshot(s, t));
  }
  R.recording = { samples, endPhase: phase, crashed: !!s.crashed, crashReason: s.crashReason || '' };
  R.recAnalysis = {
    a: analysis.analyzeRecording({ samples }, { vref: 65 }),
    b: analysis.analyzeRecording({ samples }, { vref: 70, gearRequired: true, flapMinDeg: 10 }),
    empty: analysis.analyzeRecording({ samples: [] }),
    rows: null, compact: null,
  };
  R.recAnalysis.rows = analysis.analysisRows(R.recAnalysis.a);
  R.recAnalysis.compact = analysis.compactAnalysis(R.recAnalysis.a);
}

fs.writeFileSync(path.join(here, '..', 'test', 'reference1.json'), JSON.stringify(round6(R)));
console.log('reference1.json written:', JSON.stringify({ holdEntries: R.hold.entries.length, temCases: R.tem.cases.length, wx: R.career.weather.length, sched: R.career.sched.length, samples: R.recording.samples.length, endPhase: R.recording.endPhase, landings: R.recAnalysis.a && R.recAnalysis.a.landings.length, maneuvers: R.recAnalysis.a && R.recAnalysis.a.maneuvers.length }));
