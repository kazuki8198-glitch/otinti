// CADET — the career's core without a screen (career/career.js): the calendar, the weather, the plan of each day by
// chapter, the gates between the chapters, the time of day and the night's sleep, the save (versioned and cleaned).
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE, CHECKS, LATER, weatherFor2, nextIn, createCareer, newCareer, cleanCareer, prologueFlags, PROLOGUE_FLAGS, weatherFor, dateOf, dateText, isOff, schedule, gate, nextLesson, passedAt, noteGround, CH2, GROUND, CLASSES, EXAMS, WEATHER, SOLO_TRUST, SOLO_JUDGE, CAREER_KEY, SLOTS, lessonGrowth, ftdGrowth, classGrowth, trustBand, graduationRank, missAsk, MISS_LABELS } from '../src/career/career.js';
import { installSorajima } from '../src/flight/sorajima.js';

const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const rec = (levels = ['basic']) => ({ tries: 1, best: 'S', pass: true, levels });
const progWith = (ids, levels) => ({ lessons: Object.fromEntries(ids.map(id => [id, rec(levels)])) });

test('career: the calendar — day 1 is 1 April 2027, Sundays are days off (not the first day)', () => {
  assert.equal(dateOf(1).iso, '2027-04-01'); assert.equal(dateText(1), '2027 年 4 月 1 日（木）');
  assert.equal(dateOf(31).iso, '2027-05-01');
  assert.ok(isOff(4)); assert.equal(dateOf(4).wd, 0);
  assert.ok(!isOff(1) && !isOff(5));
});

test('career: the weather — the same for the same seed and day, all five kinds over a season, the lessons\' wind on a day that can be flown', () => {
  assert.deepEqual(weatherFor(7, 12), weatherFor(7, 12));
  const kinds = new Set(), n = {};
  for (let d = 1; d <= 400; d++) { const w = weatherFor(3, d); kinds.add(w.kind); n[w.kind] = (n[w.kind] || 0) + 1; }
  assert.deepEqual([...kinds].sort(), Object.keys(WEATHER).filter(k => k !== 'lowCloud').sort());   // (low cloud: the instrument chapter's)
  assert.ok(n.good > 180 && n.good < 300, JSON.stringify(n));
  const g = weatherFor(3, 2, { force: 'good' });
  assert.match(g.metar.am, /36005KT 10SM/); assert.equal(g.decision, 'go'); assert.deepEqual(g.fly, { am: true, pm: true });
  const f = weatherFor(3, 2, { force: 'amFog' }); assert.match(f.metar.am, /FG/); assert.deepEqual(f.fly, { am: false, pm: true });
  const s = weatherFor(3, 2, { force: 'pmStorm' }); assert.match(s.metar.pm, /TSRA/); assert.match(s.taf, /TSRA/);
  const x = weatherFor(3, 2, { force: 'crosswind' }); assert.match(x.metar.am, /09016G24KT/); assert.equal(x.decision, 'cancel');
});

test('career: the prologue, then chapter 1 — classes in the morning, the training device in the afternoon, the written test last', () => {
  const s = newCareer(5);
  const p = schedule(s, {});
  assert.deepEqual(p.map(x => x.kind), ['ceremony', 'tour', 'brief']);
  assert.deepEqual(gate(s, {}), ['入社の 1 日']);
  s.done.prologue = 1; s.chapter = 'ch1'; s.day = 2;
  let d = schedule(s, {});
  // (the evening's event of the day's class: content/dialog/ch1-events.js)
  assert.deepEqual(d.map(x => [x.slot, x.kind, x.id]), [['am', 'class', '0'], ['pm', 'ftd', 'k1'], ['evening', 'event', 'forces']]);
  for (let i = 0; i < CLASSES.length; i++) s.done[`class:${i}`] = 1;   // (done on earlier days)
  d = schedule(s, progWith(['k1', 'k2']));
  assert.deepEqual(d.map(x => [x.slot, x.kind, x.id]), [['am', 'ftd', 'k3']]);
  const allK = progWith(GROUND);
  d = schedule(s, allK);
  assert.deepEqual(d.map(x => [x.slot, x.kind, x.id]), [['am', 'exam', 'written1']]);
  assert.deepEqual(gate(s, allK), [EXAMS.written1.title]);
  s.exams.written1 = { tries: 1, best: 86, pass: true };
  assert.deepEqual(gate(s, allK), []);
});

test('career: chapter 2 — the next lesson each day, a morning lost to fog flies in the afternoon, the tests, c1, then the solo with enough trust', () => {
  const s = newCareer(9); s.chapter = 'ch2'; s.day = 10;
  // the first flying day is a good one whatever the seed
  assert.equal(nextLesson({}), 'a1');
  assert.deepEqual(schedule(s, {}).map(x => [x.kind, x.id]), [['flight', 'a1']]);
  const fog = weatherFor(9, 10, { force: 'amFog' }), cancel = weatherFor(9, 10, { force: 'storm' });
  const p2 = progWith(['a1', 'a2']);
  assert.deepEqual(schedule(s, p2, { weather: fog }).map(x => [x.slot, x.kind, x.id]), [['pm', 'flight', 'a3']]);
  assert.deepEqual(schedule(s, p2, { weather: cancel }).map(x => [x.slot, x.kind]), [['am', 'study']]);
  // a pass at the gentlest level does not count for the syllabus
  assert.equal(nextLesson(progWith(['a1'], ['intro'])), 'a1');
  assert.ok(passedAt(progWith(['a1'], ['precision']), 'a1'));
  // all 15: the pre-solo test (in the slot of the day), then c1 with the chief instructor
  const all = progWith(CH2), good = weatherFor(9, 10, { force: 'good' });
  assert.deepEqual(schedule(s, all, { weather: good }).map(x => [x.kind, x.id, x.who]), [['exam', 'presolo', 'instructor']]);
  s.exams.presolo = { tries: 1, best: 90, pass: true };
  assert.deepEqual(schedule(s, all, { weather: good }).map(x => [x.kind, x.id, x.who]), [['checkride', 'c1', 'chief']]);
  const withC1 = progWith([...CH2, 'c1']);
  // (the growth system: the solo also needs the judgement — a cadet who has it, and one who has not)
  assert.deepEqual(schedule(s, withC1, { trust: SOLO_TRUST, weather: good }).map(x => [x.kind, x.id]), [['flight', 't2']], 'no solo yet: the judgement is still the starting 10');
  assert.deepEqual(gate(s, withC1, 70), [`判断（${SOLO_JUDGE} 以上）`]);
  s.abilities.judge = 40;
  assert.deepEqual(schedule(s, withC1, { trust: SOLO_TRUST, weather: good }).map(x => [x.kind, x.id]), [['solo', 'solo']]);
  assert.deepEqual(schedule(s, withC1, { trust: SOLO_TRUST - 1, weather: good }).map(x => [x.kind, x.id]), [['flight', 't2']]);
  assert.deepEqual(gate(s, withC1, SOLO_TRUST - 1), [`担当教官の信頼（${SOLO_TRUST} 以上）`]);
  assert.deepEqual(gate(s, withC1, 70), []);
  // late in the syllabus the pre-solo test is offered the same day as the flight
  delete s.exams.presolo;
  const late = progWith(CH2.slice(0, 10));
  assert.deepEqual(schedule(s, late, { weather: good }).map(x => [x.slot, x.kind, x.id]), [['am', 'flight', CH2[10]], ['pm', 'exam', 'presolo']]);
  // Sundays: a day off
  s.day = 11; assert.equal(dateOf(11).wd, 0); assert.deepEqual(schedule(s, all).map(x => x.kind), ['off']);
});

test('career: the time of day, the night, the tiredness; the chapter moves on only through its gate', () => {
  const st = memStore(), c = createCareer({ store: st, seed: 4 });
  assert.equal(c.slot, 'morning'); assert.equal(c.day, 1);
  assert.ok(c.advance()); assert.equal(c.slot, 'am'); assert.ok(c.advance('evening')); assert.equal(c.slot, 'evening');
  assert.ok(!c.advance(), 'the evening lasts until bed');
  c.tire(60); assert.ok(c.tired());
  const n = c.sleep({ late: true }); assert.equal(n.day, 2); assert.equal(c.slot, 'morning'); assert.equal(c.state.fatigue, 75, 'a late night rests little: 15 back, 10 of it spent studying');
  c.sleep(); assert.equal(c.state.fatigue, 25, 'a full night rests 50');
  assert.equal(c.advanceChapter({}), false, 'the prologue is not done');
  c.finishPrologue(); assert.equal(c.advanceChapter({}), true); assert.equal(c.chapter, 'ch1');
  assert.equal(c.advanceChapter(progWith(GROUND)), false, 'the written test');
  const r = c.exam('written1', 75); assert.equal(r.pass, false);
  c.exam('written1', 82); assert.equal(c.state.exams.written1.best, 82);
  assert.equal(c.advanceChapter(progWith(GROUND)), true); assert.equal(c.chapter, 'ch2');
  // the go / no-go: the right call for the weather
  assert.equal(c.decision('wait', weatherFor(4, 3, { force: 'amFog' })), true);
  assert.equal(c.decidedToday().right, true);
  // kept: a new career on the same store reads it back
  const c2 = createCareer({ store: st });
  assert.deepEqual(c2.state, c.state);
  assert.ok(st.m.has(CAREER_KEY));
});

test('career: the save — another version or broken data is not read, values of the wrong kind are dropped', () => {
  assert.equal(cleanCareer({ v: 99, day: 3 }), null); assert.equal(cleanCareer('x'), null);
  const c = cleanCareer({ v: 1, seed: 3, day: 12, slot: 'pm', chapter: 'ch2', fatigue: 250, exams: { presolo: { tries: 2, best: 140, pass: 1 }, '__proto__': {} }, decisions: [{ day: 3, choice: 'go', right: true }, { bad: 1 }], done: { 'class:0': 2, x: 'no' }, solo: { day: 'z' } });
  assert.deepEqual([c.day, c.slot, c.chapter, c.fatigue], [12, 'pm', 'ch2', 100]);
  assert.deepEqual(c.exams.presolo, { tries: 2, best: 100, pass: true });
  assert.equal(c.decisions.length, 1); assert.deepEqual(c.done, { 'class:0': 2 }); assert.equal(c.solo, null);
  // (a save from before the sections heard were kept: its classes in the order before — aero | sys perf | wx | law hf |
  // radio1 radio2 | radio3 radio4 radio5 — read by their chapters; a class left midway begun again)
  const old = (done) => cleanCareer({ v: 1, seed: 3, day: 8, slot: 'morning', chapter: 'ch1', done: { prologue: 1, ...done } }).done;
  assert.deepEqual(old({ 'class:0': 2, 'class:1': 3, 'class:2': 5, 'lecture:3': 4 }), { prologue: 1, 'class:0': 2, 'class:1': 3 }, 'wx done before: not its class now (with radio5)');
  assert.deepEqual(old({ 'class:0': 2, 'class:1': 3, 'class:2': 5, 'class:3': 6, 'class:4': 7, 'lecture:5': 4 }), { prologue: 1, 'class:0': 2, 'class:1': 3, 'class:2': 7, 'class:5': 6 });
  assert.deepEqual(old(Object.fromEntries([0, 1, 2, 3, 4, 5].map(i => [`class:${i}`, 2 + i]))), { prologue: 1, ...Object.fromEntries([[0, 2], [1, 3], [2, 6], [3, 7], [4, 7], [5, 5]].map(([i, d]) => [`class:${i}`, d])) });
  assert.deepEqual(cleanCareer({ v: 1, seed: 3, day: 8, chapter: 'ch1', done: { 'class:2': 5, 'lecture:3': 4 }, heard: {} }).done, { 'class:2': 5, 'lecture:3': 4 }, 'a save of this order as it is');
  const broken = memStore(); broken.setItem(CAREER_KEY, '{nope');
  assert.equal(createCareer({ store: broken, seed: 2 }).day, 1, 'broken: a new career');
  assert.equal(createCareer({ store: null, seed: 2 }).slot, SLOTS[0], 'no storage: still a career');
});

test('career: one file for everything — written, read back cleaned; a wrong or broken file is refused with the reason', async () => {
  const fs = await import('node:fs'), vm = await import('node:vm'), path = await import('node:path'), { fileURLToPath } = await import('node:url');
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
  installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
  const FL = globalThis.FL;
  const { exportArchive, importArchive } = await import('../src/career/archive.js');
  const { createDialogState } = await import('../src/dialog/engine.js');
  const { entryFrom, createLogbook } = await import('../src/career/logbook.js');
  const career = newCareer(8); career.chapter = 'ch2'; career.day = 14; career.exams.written1 = { tries: 1, best: 88, pass: true };
  const talk = createDialogState(); talk.flags.met_instructor = true; talk.trust.instructor = 63;
  const ent = entryFrom({ lessons: [{ id: 't2', title: '場周経路', grade: 'S', passed: true, done: true }], blockT: 1800, landings: 3, solo: true, trust: 5 }, { date: '2027-04-30', dayN: 30 });
  assert.deepEqual([ent.total, ent.dual, ent.solo, ent.landings], [0.5, 0, 0.5, 3]); assert.match(ent.endorsement, /単独飛行/);
  const progress = { lessons: { a1: { tries: 2, best: 'A', pass: true, levels: ['basic'] } }, quiz: { q_aero: 90 } };
  const text = exportArchive({ career, talk, logbook: [ent], progress, records: [] }, { now: new Date('2027-05-01T00:00:00Z') });
  const back = importArchive(text, FL);
  assert.deepEqual(back.career, cleanCareer(career)); assert.equal(back.talk.trust.instructor, 63);
  assert.deepEqual(back.logbook, [ent]); assert.equal(back.progress.lessons.a1.best, 'A'); assert.equal(back.progress.quiz.q_aero, 90);
  // into a logbook: replaced, kept, the solo time in the totals
  const store = memStore(), book = createLogbook(store); book.replace(back.logbook);
  assert.deepEqual(createLogbook(store).totals(), { total: 0.5, dual: 0, solo: 0.5, xc: 0, inst: 0, me: 0, landings: 3, days: 1 });
  assert.throws(() => importArchive('{', FL), /JSON/);
  assert.throws(() => importArchive(JSON.stringify({ app: 'FLIGHT LAB', kind: 'learning-record' }), FL), /CADET の記録/);
  assert.throws(() => importArchive(JSON.stringify({ app: 'CADET', kind: 'cadet-save', v: 2 }), FL), /版/);
  assert.throws(() => importArchive(JSON.stringify({ app: 'CADET', kind: 'cadet-save', v: 1, career: { v: 7 } }), FL), /キャリア/);
});

test('career: what was done today stays today\'s plan (the class, the device, the flight), not tomorrow\'s', () => {
  const s = newCareer(5); s.chapter = 'ch1'; s.day = 3; s.done['class:0'] = 2; s.done['class:1'] = 3; s.done['ftd:k2'] = 3;
  const p = progWith(['k1', 'k2']);
  assert.deepEqual(schedule(s, p).map(x => [x.kind, x.id]), [['class', '1'], ['ftd', 'k2'], ['event', 'pitot']]);
  s.chapter = 'ch2'; s.day = 12; s.done['flight:a3'] = 12;
  const good = weatherFor(5, 12, { force: 'good' });
  assert.deepEqual(schedule(s, progWith(['a1', 'a2', 'a3']), { weather: good }).map(x => [x.kind, x.id]), [['flight', 'a3']], 'not a4 the same day');
  s.done['checkride:c1'] = 12; delete s.done['flight:a3'];
  assert.deepEqual(schedule(s, progWith([...CH2, 'c1']), { weather: good, trust: 80 }).map(x => [x.kind, x.id]), [['checkride', 'c1']], 'not the solo the same day');
});

test('career: the prologue\'s talk flags follow the career, not an older save (the instructor\'s meeting is not skipped)', () => {
  const C = createCareer({ store: memStore(), seed: 3 });
  // a new career: none of them, whatever an older game's conversations kept (M2–M4 set met_instructor)
  assert.deepEqual(prologueFlags(C.state), { welcome_done: false, tour_done: false, met_instructor: false });
  C.done('ceremony', 'welcome');
  assert.deepEqual(prologueFlags(C.state), { welcome_done: true, tour_done: false, met_instructor: false });
  C.done('tour', 'tour'); C.done('brief', 'meet'); C.finishPrologue();
  assert.deepEqual(prologueFlags(C.state), { welcome_done: true, tour_done: true, met_instructor: true });
  // a career past the prologue (a record loaded without its conversations): all of them
  const later = newCareer(3); later.chapter = 'ch2';
  assert.ok(Object.values(prologueFlags(later)).every(Boolean));
  assert.deepEqual(Object.keys(PROLOGUE_FLAGS).sort(), ['met_instructor', 'tour_done', 'welcome_done']);
});

// ---- M6: chapters 3–6
test('career M6: after the first solo, chapter 3 the next morning; each later chapter through its lessons, its written test and its check', () => {
  const C = createCareer({ store: memStore(), seed: 5 });
  const all = [...CH2, 'c1'];
  C.load({ ...C.state, chapter: 'ch2', day: 30, done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true }, presolo: { tries: 1, best: 90, pass: true } }, solo: { day: 30 } });
  let prog = progWith(all);
  assert.deepEqual(C.gate(prog, 70), [], 'the solo closes chapter 2');
  C.sleep(); assert.ok(C.advanceChapter(prog, 70)); assert.equal(C.chapter, 'ch3');
  for (const ch of LATER) {
    assert.equal(C.chapter, ch);
    const S = STAGE[ch], seen = new Set();
    for (let d = 0; d < 80 && !(C.state.checks[S.check] && C.state.checks[S.check].pass); d++) {
      const sch = C.schedule(prog, { trust: 70 });
      for (const it of sch) {
        seen.add(it.kind);
        if (it.kind === 'flight') { prog = progWith([...Object.keys(prog.lessons), it.id]); C.done('flight', it.id); }
        else if (it.kind === 'exam') C.exam(it.id, 90);
        else if (it.kind === 'navlog') C.done('navlog', 'xc');
        else if (it.kind === 'xc' || it.kind === 'checkride') C.check(it.id, true);
      }
      if (process.env.DBG) console.log(ch, C.state.day, sch.map(x => `${x.slot}:${x.kind}:${x.id}`).join(" "));
      if (!(C.state.checks[S.check] && C.state.checks[S.check].pass)) C.sleep();
    }
    assert.ok(S.lessons.every(id => passedAt(prog, id)), `${ch}: every lesson`);
    assert.ok(C.state.exams[S.exam].pass, `${ch}: the written test`);
    assert.ok(C.state.checks[S.check].pass, `${ch}: the check`);
    assert.ok(seen.has('flight') && seen.has('exam'), `${ch}: ${[...seen]}`);
    if (ch === 'ch3') assert.ok(seen.has('navlog') && seen.has('xc'), 'the navigation log and the solo cross-country');
    else assert.ok(seen.has('checkride'));
    assert.deepEqual(C.gate(prog, 70), [], `${ch}: the gate is open`);
    C.sleep();
    if (ch !== 'ch6') { assert.ok(C.advanceChapter(prog, 70)); }
  }
  // chapter 6 done: the graduation the next morning (the lobby), then days off
  assert.equal(C.chapter, 'ch6');
  const g = C.schedule(prog, { trust: 70 });
  assert.deepEqual(g.map(x => x.kind), ['graduation']);
  C.graduate(); C.sleep();
  assert.deepEqual(C.schedule(prog, { trust: 70 }).map(x => x.kind), ['off']);
  assert.ok(cleanCareer(JSON.parse(JSON.stringify(C.state))).graduated, 'saved and read back');
});

test('career M6: the checks and their aircraft, the weather of the later chapters', () => {
  assert.deepEqual(Object.keys(CHECKS), ['xc', 'ir', 'me', 'final']);
  assert.equal(CHECKS.final.who, 'examiner'); assert.equal(CHECKS.xc.who, null);
  assert.equal(STAGE.ch5.aircraft, 'pa44');
  // low cloud: no flying by sight; the instrument chapter flies in it (not alone)
  const W = weatherFor(3, 40, { force: 'lowCloud' });
  assert.match(W.metar.am, /BKN008/); assert.equal(W.decision, 'cancel');
  const I = weatherFor2(W, 'ch4', 'flight'); assert.equal(I.decision, 'go'); assert.deepEqual(I.fly, { am: true, pm: true });
  assert.equal(weatherFor2(W, 'ch3', 'flight').decision, 'cancel');
  // the instrument chapter's days bring low cloud now and then; the others never
  const kinds4 = new Set(), kinds3 = new Set();
  for (let d = 1; d < 300; d++) { kinds4.add(weatherFor(3, d, { ifr: true }).kind); kinds3.add(weatherFor(3, d).kind); }
  assert.ok(kinds4.has('lowCloud') && !kinds3.has('lowCloud'));
  // the instrument check's day is in low cloud (its ILS in cloud)
  const C = createCareer({ store: memStore(), seed: 9 });
  let d0 = 60; while (isOff(d0)) d0++;
  C.load({ ...C.state, chapter: 'ch4', day: d0, exams: { instr: { tries: 1, best: 90, pass: true } } });
  const prog = progWith([...STAGE.ch4.lessons]);
  assert.equal(C.weather(prog).kind, 'lowCloud');
  const sch = C.schedule(prog, { trust: 70 });
  assert.deepEqual(sch.map(x => `${x.kind}:${x.id}`), ['checkride:ir']);
  assert.equal(nextIn(prog, STAGE.ch4.lessons), null);
});

test('career: the first day is a fine one, whatever the seed', () => {
  const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
  for (let seed = 1; seed < 60; seed++) assert.equal(createCareer({ store: memStore(), seed }).weather().kind, 'good', `seed ${seed}`);
});

test('career growth: the four abilities start low, grow less as they rise and less when the same work repeats', () => {
  const C = createCareer({ store: memStore(), seed: 7 });
  assert.deepEqual(C.abilities, { hand: 10, know: 5, comm: 5, judge: 10 });
  // the first time counts in full: Δ = 5 × (1 − 10/130)
  const v1 = C.grow('hand', 5, 'lesson:a1');
  assert.ok(Math.abs(v1 - (10 + 5 * (1 - 10 / 130))) < 1e-9, `first growth ${v1}`);
  // the same key again: half, then a quarter
  const before2 = C.abilities.hand, v2 = C.grow('hand', 5, 'lesson:a1');
  assert.ok(Math.abs((v2 - before2) - 5 * (1 - before2 / 130) * 0.5) < 1e-9, 'second time counts half');
  const before3 = C.abilities.hand, v3 = C.grow('hand', 5, 'lesson:a1');
  assert.ok(Math.abs((v3 - before3) - 5 * (1 - before3 / 130) * 0.25) < 1e-9, 'third time counts a quarter');
  // a new key counts in full again; a high ability grows slowly and never past 100
  C.grow('hand', 5, 'lesson:a2'); assert.ok(C.abilities.hand > v3);
  for (let i = 0; i < 200; i++) C.grow('hand', 5, `lesson:x${i}`);
  assert.equal(C.abilities.hand, 100);
  // an unknown axis or a bad base grows nothing
  assert.equal(C.grow('nope', 5, 'lesson:a1'), undefined); assert.equal(C.grow('know', -1, 'lesson:a1'), 5);
});

test('career growth: a written test grows the knowledge, a weather decision the judgement; the record survives the save', () => {
  const st = memStore(), C = createCareer({ store: st, seed: 8 });
  C.exam('written1', 90); assert.ok(C.abilities.know > 5 + 3, 'a pass grows the knowledge by about 4');
  const k1 = C.abilities.know; C.exam('written1', 50); assert.ok(C.abilities.know > k1, 'even a fail grows it a little');
  assert.ok(C.abilities.know - k1 < 1.2, 'a fail grows it less than a pass, and the same test repeated counts less');
  const w = weatherFor(8, 1, { force: 'good' });
  const j0 = C.abilities.judge; assert.equal(C.decision('go', w), true); assert.ok(C.abilities.judge > j0 + 1.5, 'a right decision grows the judgement');
  const back = createCareer({ store: st, seed: 8 });
  assert.deepEqual(back.abilities, C.abilities, 'the abilities are in the save');
  assert.deepEqual(back.state.firstTry, { pass: 0, total: 0 });
  back.firstTry(true); back.firstTry(false);
  assert.deepEqual(createCareer({ store: st, seed: 8 }).state.firstTry, { pass: 1, total: 2 }, 'the first tries are in the save');
});

test('career growth: a v1 save migrates — its progress is kept, the abilities start fresh', () => {
  const old = { v: 1, seed: 3, day: 12, slot: 'pm', chapter: 'ch2', fatigue: 40, exams: { presolo: { tries: 1, best: 90, pass: true } }, done: { prologue: 1 } };
  const c = cleanCareer(old);
  assert.ok(c, 'a v1 save is read, not refused');
  assert.equal(c.v, 2); assert.equal(c.day, 12); assert.equal(c.chapter, 'ch2'); assert.equal(c.exams.presolo.pass, true);
  assert.deepEqual(c.abilities, { hand: 10, know: 5, comm: 5, judge: 10 });
  assert.deepEqual(c.firstTry, { pass: 0, total: 0 }); assert.deepEqual(c.growth, {});
  // and a v2 save with a record keeps it, clamped to the axes' range
  const c2 = cleanCareer({ v: 2, seed: 3, abilities: { hand: 250, know: 'x', judge: 33.5 }, firstTry: { pass: 3, total: 2 }, growth: { 'exam:written1': 2, bad: 5 } });
  assert.equal(c2.abilities.hand, 100); assert.equal(c2.abilities.know, 5); assert.equal(c2.abilities.judge, 33.5);
  assert.deepEqual(c2.firstTry, { pass: 2, total: 2 }, 'the passes never outnumber the tries');
  assert.deepEqual(c2.growth, { 'exam:written1': 2 });
});

test('career growth: what a lesson, a device lesson and a class teach (the §4.1 table, as pure functions)', () => {
  const near = (got, want, where) => assert.deepEqual(got.map(([a, v]) => [a, Math.round(v * 100) / 100]), want.map(([a, v]) => [a, Math.round(v * 100) / 100]), where);
  // a flight lesson: the grade's base, the level's weight, the sub-axis by the id's lesson letter
  near(lessonGrowth('S', 'basic', 'a1'), [['hand', 5 + 5 * 0.35], ['comm', 0.6]], 'an S at the basic level, a hand lesson');
  near(lessonGrowth('A', 'precision', 'n1'), [['hand', 4 * 1.3], ['comm', 0.6], ['judge', 4 * 1.3 * 0.35]], 'precision weighs more; n is navigation, so judgement');
  near(lessonGrowth('B', 'intro', 'i2'), [['hand', 3 * 0.5], ['comm', 0.6], ['know', 3 * 0.5 * 0.35]], 'an intro lesson counts half; i is instruments, so knowledge');
  near(lessonGrowth('C', 'basic', 'x1'), [['hand', 1.5], ['comm', 0.6], ['judge', 1.5 * 0.35]], 'x is the cross-country: judgement');
  assert.deepEqual(lessonGrowth('―', 'basic', 'a1'), [], 'no grade, no growth');
  assert.deepEqual(lessonGrowth('', 'basic', 'a1'), [], 'not flown, no growth');
  // flown tired: half of it, and the judgement does not grow at all
  near(lessonGrowth('S', 'basic', 'n1', true), [['hand', 2.5], ['comm', 0.3]], 'tired: halved, no judgement');
  near(lessonGrowth('S', 'basic', 'a1', true), [['hand', (5 + 5 * 0.35) / 2], ['comm', 0.3]], 'tired: a hand lesson is only halved');
  // the device lessons: the radio ones teach the calls, the others knowledge; the hand a crumb either way
  near(ftdGrowth('k1'), [['know', 1.6], ['hand', 0.6]], 'k1');
  near(ftdGrowth('k2'), [['know', 1.6], ['hand', 0.6]], 'k2');
  near(ftdGrowth('k4'), [['comm', 2.4], ['hand', 0.6]], 'k4');
  near(ftdGrowth('k6'), [['comm', 2.4], ['hand', 0.6]], 'k6');
  // a class: knowledge by its pace
  near(classGrowth('full'), [['know', 6.0]], 'the full pace');
  near(classGrowth('need'), [['know', 6.0 * 0.7]], 'only what is needed');
  near(classGrowth('quick'), [['know', 6.0 * 0.45]], '要点だけ');
  near(classGrowth(undefined), [['know', 6.0]], 'no pace said: the full one');
});

test('career exams: thirty questions everywhere, and a test is never taken twice in a day (§4.3)', () => {
  for (const [id, E] of Object.entries(EXAMS)) assert.equal(E.n, 30, id);
  const st = memStore(), C = createCareer({ store: st, seed: 11 });
  const s = C.state; s.chapter = 'ch1'; s.day = 5;   // (a weekday: day 4 is the Sunday off)
  for (let i = 0; i < CLASSES.length; i++) s.done[`class:${i}`] = 1;   // (the classes done on an earlier day)
  const prog = progWith(GROUND);
  assert.equal(C.examReady('written1'), true);
  assert.ok(schedule(s, prog).some(x => x.kind === 'exam' && x.id === 'written1'), 'offered before the try');
  C.exam('written1', 50);
  assert.equal(s.examDay.written1, 5, 'the day of the try is kept');
  assert.equal(C.examReady('written1'), false, 'not again today');
  assert.ok(!schedule(s, prog).some(x => x.kind === 'exam'), 'failed today: the plan offers no test');
  s.day = 6;
  assert.equal(C.examReady('written1'), true, 'tomorrow it may be taken again');
  assert.ok(schedule(s, prog).some(x => x.kind === 'exam' && x.id === 'written1'), 'and the plan offers it again');
  assert.equal(createCareer({ store: st, seed: 11 }).state.examDay.written1, 5, 'the day is in the save');
  // (a v2 save without the record reads as none taken)
  assert.deepEqual(cleanCareer({ v: 2, seed: 3 }).examDay, {});
});

test('career drills: a judgement drill grows the judgement, twice a day at most (§4.4)', () => {
  const C = createCareer({ store: memStore(), seed: 12 });
  assert.equal(C.drillsLeft(), 2);
  const j0 = C.abilities.judge;
  assert.equal(C.drill(), true); assert.ok(C.abilities.judge > j0, 'the first drill grows it');
  assert.equal(C.drillsLeft(), 1);
  assert.equal(C.drill(), true); assert.equal(C.drillsLeft(), 0);
  const j2 = C.abilities.judge;
  assert.equal(C.drill(), false, 'a third today does not count');
  assert.equal(C.abilities.judge, j2, 'and grows nothing');
  C.state.day += 1;
  assert.equal(C.drillsLeft(), 2, 'tomorrow, two more');
  assert.equal(C.drill(), true);
  // (a v2 save without the record reads as none done)
  assert.deepEqual(cleanCareer({ v: 2, seed: 3 }).drills, { day: 0, n: 0 });
});

test('career graduation: the rank\'s three conditions, each one able to cost the top (§4.6), and the trust bands (§4.7)', () => {
  const state = (abilities, firstTry, exams) => ({ abilities, firstTry, exams });
  const examsOf = (tries) => Object.fromEntries(tries.map((n, i) => [`e${i}`, { tries: n, best: 90, pass: true }]));
  const prog = { lessons: { a1: { score: 80 }, a2: { score: 60 }, a3: { score: 0 }, k1: {} } };
  // all four at 70: the composite is 70; a diligent profile — an 88% first-try rate, six sittings in all — honours
  const top = graduationRank(state({ hand: 70, know: 70, comm: 70, judge: 70 }, { pass: 22, total: 25 }, examsOf([1, 1, 1, 1, 1, 1])), prog);
  assert.deepEqual(top, { rank: '優等', total: 70, firstRate: 88, examTries: 6, avgScore: 70 });
  // a standard profile — the same abilities, a 79% first-try rate and seven sittings: excellent, not honours
  const std = graduationRank(state({ hand: 70, know: 70, comm: 70, judge: 70 }, { pass: 15, total: 19 }, examsOf([2, 1, 1, 1, 1, 1])), prog);
  assert.deepEqual([std.rank, std.firstRate, std.examTries], ['優秀', 79, 7]);
  // the composite short of 68 (all at 67): excellent, not honours
  assert.equal(graduationRank(state({ hand: 67, know: 67, comm: 67, judge: 67 }, { pass: 22, total: 25 }, examsOf([1, 1, 1, 1, 1, 1])), prog).rank, '優秀');
  // the first-try rate short of 88%: excellent
  assert.equal(graduationRank(state({ hand: 70, know: 70, comm: 70, judge: 70 }, { pass: 37, total: 50 }, examsOf([1, 1, 1, 1, 1, 1])), prog).rank, '優秀');
  // seven sittings of the tests: excellent, however clean the rest
  assert.equal(graduationRank(state({ hand: 70, know: 70, comm: 70, judge: 70 }, { pass: 22, total: 25 }, examsOf([2, 1, 1, 1, 1, 1])), prog).rank, '優秀');
  // the composite short of 62, or the rate short of 60%: the plain rank
  assert.equal(graduationRank(state({ hand: 61, know: 61, comm: 61, judge: 61 }, { pass: 3, total: 4 }, examsOf([1])), prog).rank, '通常');
  assert.equal(graduationRank(state({ hand: 70, know: 70, comm: 70, judge: 70 }, { pass: 1, total: 2 }, examsOf([1])), prog).rank, '通常');
  // the weights: the hand counts most (all at 0 but the hand at 100: 35 — nowhere)
  assert.equal(graduationRank(state({ hand: 100, know: 0, comm: 0, judge: 0 }, { pass: 0, total: 0 }, {}), {}).total, 35);
  // graduate() keeps the rank with the day, and the save keeps both
  const st = memStore(), C = createCareer({ store: st, seed: 21 });
  Object.assign(C.state.abilities, { hand: 70, know: 70, comm: 70, judge: 70 }); C.state.firstTry = { pass: 22, total: 25 };
  C.graduate(prog);
  assert.equal(C.state.graduated.rank, '優等'); assert.equal(C.state.graduated.avgScore, 70);
  assert.deepEqual(createCareer({ store: st, seed: 21 }).state.graduated, C.state.graduated, 'the rank survives the save');
  // the bands of trust
  assert.deepEqual([0, 39, 40, 59, 60, 79, 80, 100].map(trustBand), ['まだ距離がある', 'まだ距離がある', '通常', '通常', '信頼されている', '信頼されている', '深い信頼', '深い信頼']);
});

test('career fatigue: flying days and late nights climb to the IMSAFE line; full nights never do (§4.5)', () => {
  const C = createCareer({ store: memStore(), seed: 31 });
  // a flight a day (+15) and a late night (a net 5 back): the tiredness climbs 10 a day, over the line in five
  for (let d = 0; d < 5; d++) { C.tire(15); C.sleep({ late: true }); }
  assert.ok(C.state.fatigue >= 65, `five late nights under flying days: ${C.state.fatigue}`);
  assert.ok(C.tired(), 'tired enough to say so');
  // the same days with a full night's sleep: it never builds up
  const D = createCareer({ store: memStore(), seed: 31 });
  for (let d = 0; d < 5; d++) { D.tire(15); D.sleep(); assert.ok(!D.tired(), `a full night rests it away (day ${d + 1})`); }
});

test('career exams: the bank floor the cadet was told is the result recorded (§4.3)', () => {
  const C = createCareer({ store: memStore(), seed: 17 });
  // over the line as a whole, a bank under the floor: the dialog says fail, and the record says fail — the
  // best percent is kept, the try counted, and the knowledge grows by the fail's amount, not the pass's
  const k0 = C.abilities.know;
  const r = C.exam('nav', 85, false);
  assert.equal(r.pass, false); assert.equal(r.best, 85); assert.equal(r.tries, 1);
  assert.ok(C.abilities.know > k0 && C.abilities.know < k0 + 2, `a fail's growth: ${C.abilities.know - k0}`);
  // the same percent with the floor met: a pass, and the pass's growth
  const k1 = C.abilities.know;
  const r2 = C.exam('instr', 85, true);
  assert.equal(r2.pass, true); assert.equal(r2.tries, 1);
  assert.ok(C.abilities.know > k1 + 3, `a pass's growth: ${C.abilities.know - k1}`);
  // no word from the dialog: the percent alone decides, as before
  assert.equal(C.exam('multi', 85).pass, true);
  assert.equal(C.exam('final', 50).pass, false);
});

test('career exams: the same-day rule holds for the other tests too (§4.3) — presolo and a later chapter\'s', () => {
  const good = weatherFor(9, 10, { force: 'good' });
  // chapter 2: all the lessons passed, the pre-solo test is the day
  const C = createCareer({ store: memStore(), seed: 9 }), s = C.state;
  s.chapter = 'ch2'; s.day = 10; s.done.prologue = 1;
  const all = progWith(CH2);
  assert.deepEqual(C.schedule(all, { weather: good }).map(x => [x.kind, x.id]), [['exam', 'presolo']]);
  C.exam('presolo', 50);   // (failed today)
  assert.equal(C.examReady('presolo'), false);
  const after = C.schedule(all, { weather: good });
  assert.ok(!after.some(x => x.kind === 'exam'), 'failed today: the test is not offered again today');
  assert.deepEqual(after.map(x => [x.kind, x.id]), [['flight', 't2']], 'the day is a finishing flight instead');
  s.day = 12;   // (day 11 is the Sunday off)
  assert.equal(C.examReady('presolo'), true);
  assert.deepEqual(C.schedule(all, { weather: weatherFor(9, 12, { force: 'good' }) }).map(x => [x.kind, x.id]), [['exam', 'presolo']], 'and it is offered again on a later day');
  // passed today: the test stays in the plan as the day's record, and cannot be begun again
  C.exam('presolo', 90);
  assert.deepEqual(C.schedule(all, { weather: weatherFor(9, 12, { force: 'good' }) }).map(x => [x.kind, x.id]), [['exam', 'presolo']], 'passed today: it stays as the day\'s record');
  assert.equal(C.examReady('presolo'), false, 'but it cannot be begun again today');
  s.day = 13;
  assert.deepEqual(C.schedule(all, { weather: weatherFor(9, 13, { force: 'good' }) }).map(x => [x.kind, x.id]), [['checkride', 'c1']], 'tomorrow, the check ride');
  // late in the syllabus the test rides along with the flight — and a fail there ends it for the day too
  const C2 = createCareer({ store: memStore(), seed: 9 }), s2 = C2.state;
  s2.chapter = 'ch2'; s2.day = 10; s2.done.prologue = 1;
  const late = progWith(CH2.slice(0, 10));
  assert.deepEqual(C2.schedule(late, { weather: good }).map(x => [x.slot, x.kind, x.id]), [['am', 'flight', CH2[10]], ['pm', 'exam', 'presolo']]);
  C2.exam('presolo', 50);
  assert.deepEqual(C2.schedule(late, { weather: good }).map(x => [x.slot, x.kind, x.id]), [['am', 'flight', CH2[10]]], 'failed in the afternoon: no second sitting that day');
  // a later chapter: its test alone on the day once the lessons are done
  const C3 = createCareer({ store: memStore(), seed: 9 }), s3 = C3.state;
  s3.chapter = 'ch3'; s3.day = 20; s3.done.prologue = 1;
  const done3 = progWith(STAGE.ch3.lessons), g20 = weatherFor(9, 20, { force: 'good' });
  assert.deepEqual(C3.schedule(done3, { weather: g20 }).map(x => [x.kind, x.id]), [['exam', 'nav']]);
  C3.exam('nav', 40);
  assert.equal(C3.examReady('nav'), false);
  assert.deepEqual(C3.schedule(done3, { weather: g20 }), [], 'failed today: nothing more is due, and the check does not jump the test');
  s3.day = 21;
  assert.deepEqual(C3.schedule(done3, { weather: weatherFor(9, 21, { force: 'good' }) }).map(x => [x.kind, x.id]), [['exam', 'nav']], 'tomorrow it is offered again');
  // with lessons left, the test rides along from halfway — a fail today takes it off the plan too
  s3.day = 20;
  const half = progWith(STAGE.ch3.lessons.slice(0, 3));
  assert.deepEqual(C3.schedule(half, { weather: g20 }).map(x => [x.kind, x.id]), [['flight', 'n1']], 'a test failed today no longer rides along');
});

test('career ground records: a device lesson\'s tries count its fails too (noteGround)', () => {
  const C = createCareer({ store: memStore(), seed: 41 });
  // a first try at a device lesson, failed: the try is in the record, the lesson is not passed, and the
  // career's first-try record takes the fail (as main.js's groundFail does with the record)
  let r = noteGround(undefined, false);
  assert.equal(r.first, true); assert.deepEqual(r.rec, { tries: 1, best: '', pass: false, levels: [] });
  if (r.first) C.firstTry(false);
  assert.deepEqual(C.state.firstTry, { pass: 0, total: 1 });
  // the second try passes at 95: no longer a first try, the grade kept
  r = noteGround(r.rec, true, 95);
  assert.equal(r.first, false); assert.deepEqual(r.rec, { tries: 2, best: 'A', pass: true, levels: [] });
  assert.deepEqual(C.state.firstTry, { pass: 0, total: 1 }, 'a pass on the second try is not a first-try pass');
  // a first-try pass elsewhere counts the other way, and a later, better pass lifts the best grade
  r = noteGround(undefined, true, 80);
  assert.equal(r.first, true); assert.equal(r.rec.best, 'B');
  if (r.first) C.firstTry(true);
  assert.deepEqual(C.state.firstTry, { pass: 1, total: 2 });
  r = noteGround(r.rec, true, 100);
  assert.equal(r.rec.best, 'S'); assert.equal(r.rec.tries, 2);
});

test('career miss: the debrief\'s main missed item is kept overnight, asked about once, and old saves load without one', () => {
  const st = memStore(), C = createCareer({ store: st, seed: 9 });
  assert.equal(C.state.miss, null, 'a new career has none');
  C.noteMiss('lesson:a3', '「場周経路」の高度');
  assert.deepEqual(C.state.miss, { day: C.state.day, key: 'lesson:a3', label: '「場周経路」の高度' });
  assert.deepEqual(createCareer({ store: st, seed: 9 }).state.miss, C.state.miss, 'it is in the save');
  // the morning's question: the item itself among two others, the same for the same record
  const a = missAsk(C.state);
  assert.deepEqual(a, missAsk(C.state), 'deterministic');
  assert.equal(a.options.filter(x => x === a.label).length, 1, 'the item appears once');
  assert.equal(a.options[a.right], a.label, 'the right choice is the item');
  assert.ok(a.options.every(x => x === a.label || MISS_LABELS.includes(x)), 'the others are the generic points');
  C.clearMiss();
  assert.equal(C.state.miss, null); assert.equal(missAsk(C.state), null);
  assert.equal(createCareer({ store: st, seed: 9 }).state.miss, null, 'cleared in the save too');
  // a bad record is refused, and a save carrying one loads without it; a save without the field loads as none
  C.noteMiss('Bad Key', 'x'); assert.equal(C.state.miss, null, 'a bad key is refused');
  C.noteMiss('walk', 'x'.repeat(81)); assert.equal(C.state.miss, null, 'an over-long label is refused');
  assert.equal(cleanCareer({ v: 2, seed: 1, miss: { day: 3, key: 'walk', label: '外部点検の外し忘れ' } }).miss.label, '外部点検の外し忘れ');
  assert.equal(cleanCareer({ v: 2, seed: 1, miss: { day: 3, key: 'BAD KEY', label: 'x' } }).miss, null);
  assert.equal(cleanCareer({ v: 2, seed: 1, miss: { day: 3, key: 'walk', label: 42 } }).miss, null);
  assert.equal(cleanCareer({ v: 1, seed: 1, day: 5 }).miss, null, 'a v1 save has none');
});
