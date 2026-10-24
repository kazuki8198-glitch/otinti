// CADET — the career's core without a screen (career/career.js): the calendar, the weather, the plan of each day by
// chapter, the gates between the chapters, the time of day and the night's sleep, the save (versioned and cleaned).
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE, CHECKS, LATER, weatherFor2, nextIn, createCareer, newCareer, cleanCareer, prologueFlags, PROLOGUE_FLAGS, weatherFor, dateOf, dateText, isOff, schedule, gate, nextLesson, passedAt, CH2, GROUND, CLASSES, EXAMS, WEATHER, SOLO_TRUST, CAREER_KEY, SLOTS } from '../src/career/career.js';
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
  assert.match(g.metar.am, /00405KT 10SM/); assert.equal(g.decision, 'go'); assert.deepEqual(g.fly, { am: true, pm: true });
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
  assert.deepEqual(d.map(x => [x.slot, x.kind, x.id]), [['am', 'class', '0'], ['pm', 'ftd', 'k1']]);
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
  const n = c.sleep({ late: true }); assert.equal(n.day, 2); assert.equal(c.slot, 'morning'); assert.ok(c.state.fatigue > 40, 'a late night rests less');
  c.sleep(); assert.ok(c.state.fatigue < 20);
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
  assert.deepEqual(createLogbook(store).totals(), { total: 0.5, dual: 0, solo: 0.5, landings: 3, days: 1 });
  assert.throws(() => importArchive('{', FL), /JSON/);
  assert.throws(() => importArchive(JSON.stringify({ app: 'FLIGHT LAB', kind: 'learning-record' }), FL), /CADET の記録/);
  assert.throws(() => importArchive(JSON.stringify({ app: 'CADET', kind: 'cadet-save', v: 2 }), FL), /版/);
  assert.throws(() => importArchive(JSON.stringify({ app: 'CADET', kind: 'cadet-save', v: 1, career: { v: 7 } }), FL), /キャリア/);
});

test('career: what was done today stays today\'s plan (the class, the device, the flight), not tomorrow\'s', () => {
  const s = newCareer(5); s.chapter = 'ch1'; s.day = 3; s.done['class:0'] = 2; s.done['class:1'] = 3; s.done['ftd:k2'] = 3;
  const p = progWith(['k1', 'k2']);
  assert.deepEqual(schedule(s, p).map(x => [x.kind, x.id]), [['class', '1'], ['ftd', 'k2']]);
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
