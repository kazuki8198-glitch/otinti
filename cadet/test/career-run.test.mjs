// CADET — a whole career without a screen, from the first day to the first solo (M5's goal: "新しく始めてから
// ファーストソロまで通して遊べる。bot.mjs で全課目を進められる"). Each day goes as the game runs it (main.js): the plan
// from career/career.js; the talks from their dialog data, answered as a good cadet answers (the welcome, the tour, the
// instructor; the classes, the training device and the written tests with the right answers; the go / no-go at the
// counter with the right call); the flying days played from the walk-around to the debrief (test/helpers/play-day.mjs)
// with FLIGHT LAB's bot flying every lesson, each lesson noted in FLIGHT LAB's progress (school.noteLesson) as the game's
// flight bridge notes it; the check ride with the chief instructor; the solo; a night's sleep between days.
// Checked: the chapters open in order through their gates, every lesson of chapter 2 is passed at the basic level, c1
// passes, the solo is flown, and it all takes a believable number of days.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCareer, CH2, GROUND, passedAt, SOLO_TRUST, CLASSES, STAGE, CHECKS, LATER, EXAMS } from '../src/career/career.js';
import { planFor } from '../src/career/day.js';
import { peopleDialogs } from '../src/content/dialog/people.js';
import { careerInstructorDialogs } from '../src/content/dialog/instructor-career.js';
import { classDialogs, ftdDialogs, examDialogs, navlogDialogs, scoreOf, classOptions, heardOf, chairDebriefDialogs } from '../src/content/school.js';
import { chairScript } from '../src/content/chair-flight.js';
import { runChairFlight } from '../src/dialog/chair-flight.js';
import { createRunner, createDialogState, trustOf } from '../src/dialog/engine.js';
import { playDay } from './helpers/play-day.mjs';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js', 'radio.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL, SC = FL.school;
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

test('career run: from the first day to the first solo — every gate in order, every lesson flown by FLIGHT LAB\'s bot', { timeout: 1800000 }, () => {
  const career = createCareer({ store: memStore(), seed: 11 });
  const talk = createDialogState(), prog = SC.sanitizeProgress({});
  const log = [], flown = [];
  // a talk run to its end: the right answers where there is a question, else the choice matching one of `pick` (at most
  // two steps a node: a class read in full goes through each of its nodes once)
  function run(data, id, { pick = [], ctx = {}, state = talk, hooks = () => {} } = {}) {
    const r = createRunner({ data, state, ctx, hooks: { onHook: hooks } });
    r.start(id);
    const max = Math.max(600, 2 * Object.values(data.dialogs).reduce((n, d) => n + Object.keys(d.nodes).length, 0));
    for (let k = 0; k < max && r.running; k++) {
      const v = r.view();
      if (v.choices.length) {
        const m = /^q(\d+)$/.exec(v.node), qs = data.questions || [];
        let i = 0;
        if (m && qs[+m[1]]) i = v.choices.findIndex(c => c.text === qs[+m[1]].opts[qs[+m[1]].ok]);
        else for (const p of pick) { const j = v.choices.findIndex(c => p.test(c.text)); if (j >= 0) { i = j; break; } }
        r.choose(i);
      } else r.next();
    }
    assert.equal(r.running, false, `${id}: the talk ends`);
  }
  const people = peopleDialogs(), ins = careerInstructorDialogs();
  let days = 0;
  while (!career.state.solo && days < 80) {
    days++;
    const st = career.state, w = career.weather(prog), sch = career.schedule(prog, { trust: trustOf(talk, 'instructor'), weather: w });
    log.push(`${st.day} ${st.chapter} ${w.kind}: ${sch.map(x => `${x.kind}:${x.id}`).join(' ')}`);
    const ctx = { career: { chapter: st.chapter, slot: st.slot, day: st.day, dayMod3: st.day % 3, tired: career.tired(), solo: false }, today: {}, weather: { ja: w.ja, metarAm: w.metar.am, metarPm: w.metar.pm, taf: w.taf, why: w.why }, imsafe: { honest: true } };
    for (const it of sch) {
      if (it.kind === 'ceremony') { run(people, 'chief', { ctx }); career.done('ceremony', 'welcome'); }
      else if (it.kind === 'tour') { run(people, 'dispatcher', { ctx }); career.done('tour', 'tour'); }
      else if (it.kind === 'brief') { run(ins, 'meet', { ctx, pick: [/今は大丈夫/] }); career.done('brief', 'meet'); career.finishPrologue(); }
      // (the class's pace by its name: the whole textbook; the career keeps what was heard and answered, as the game does)
      else if (it.kind === 'class') { const q = { quiz: {} }, s2 = createDialogState(), d = classDialogs(FL, +it.id, { seed: st.seed, ...classOptions(FL, career.state, +it.id, { attempt: career.attempt(`class:${it.id}`) }) }); run(d, 'class', { state: s2, ctx: q, pick: [/^じっくり/], hooks: (n, a) => { if (n === 'quizEnd') q.quiz = scoreOf(s2, +a); careerHook(career, n, a); } }); career.done('class', it.id); }
      else if (it.kind === 'ftd' || it.kind === 'exam') {
        const q = { quiz: {} }, s2 = createDialogState(), heard = heardOf(FL, career.state), d = it.kind === 'ftd' ? ftdDialogs(FL, it.id, { seed: st.seed + st.day, heard, attempt: career.attempt(`ftd:${it.id}`) }) : examDialogs(FL, it.id, { seed: st.seed + st.day, heard, attempt: career.attempt(`exam:${it.id}`) });
        let result = null;
        let stage = null;
        run(d, it.kind, { state: s2, ctx: q, hooks: (n, a) => { if (n === 'quizEnd') q.quiz = scoreOf(s2, +a); if (n === 'done') result = a; if (n === 'chair') stage = a; careerHook(career, n, a); } });
        // (k4: the talk begins the chair flight; the run flown with the right answers, as the game's test API's
        // rightIndex; its debrief passes it)
        if (it.id === 'k4') {
          assert.equal(stage, '2', 'k4 begins with the script hidden');
          const seed = (st.seed * 31 + career.attempt('k4:run') * 977 + 1) >>> 0, script = chairScript(FL, { seed }), { summary } = runChairFlight(script, { stage: 2, seed });
          q.quiz = { pct: summary.pct };
          run(chairDebriefDialogs(FL, summary, script, {}), 'ftd', { hooks: (n, a) => { if (n === 'done') result = a; } });
        }
        if (it.kind === 'ftd') { career.done('ftd', it.id); if (result === 'pass') { const r = prog.lessons[it.id] || { tries: 0, best: '', pass: false, levels: [] }; r.tries++; r.pass = true; r.best = 'S'; prog.lessons[it.id] = r; } }
        else career.exam(it.id, q.quiz.pct);
        assert.equal(result, 'pass', `${it.kind} ${it.id} passed with the right answers`);
      } else if (FLY_KINDS.includes(it.kind)) {
        // the go / no-go: the right call; then the day as planned
        const right = career.decision(w.decision, w); assert.ok(right);
        const plan = it.kind === 'solo' ? planFor(FL, 't2', { solo: true }) : planFor(FL, it.kind === 'checkride' ? 'c1' : it.id);
        const r = playDay(FL, { plan, anomalies: [], seed: st.day });
        for (const L of r.got) { SC.noteLesson(prog, L); flown.push(`${L.id}:${L.grade}`); }
        assert.ok(r.got.every(L => L.passed), `day ${st.day} ${plan.lessons.join(' ')}: ${r.got.map(L => `${L.id} ${L.grade}`).join(', ')}`);
        talk.trust.instructor = Math.min(100, trustOf(talk, 'instructor') + Math.max(0, r.day.summary().trust));
        career.done(it.kind, it.id);
        if (it.kind === 'solo') career.soloDone();
      } else if (it.kind === 'study') career.done('study', it.id);
    }
    if (!career.state.solo) { career.sleep(); career.advanceChapter(prog, trustOf(talk, 'instructor')); }
  }
  if (process.env.DBG) console.log(log.join('\n'), '\n', flown.join(' '));
  const st = career.state;
  assert.ok(st.solo, `the solo was flown (after ${days} days)\n${log.join('\n')}`);
  assert.equal(st.chapter, 'ch2');
  for (const id of GROUND) assert.ok(prog.lessons[id] && prog.lessons[id].pass, id);
  for (const id of [...CH2, 'c1']) assert.ok(passedAt(prog, id), `${id} passed at the basic level`);
  assert.ok(st.exams.written1.pass && st.exams.presolo.pass);
  assert.ok(trustOf(talk, 'instructor') >= SOLO_TRUST);
  assert.ok(CLASSES.every((_, i) => st.done[`class:${i}`]), 'every class taken');
  // a believable length: about a week of ground school, three to five weeks of flying (Sundays off, the weather)
  assert.ok(days >= 18 && days <= 60, `${days} days`);
  assert.ok(log.some(l => / off/.test(l) || /off:/.test(l)), 'Sundays off');
});
const FLY_KINDS = ['flight', 'checkride', 'solo'];
// what the game does with a lesson's hooks to the career (main.js onHook): the pace, a section heard, an answer
function careerHook(career, n, a) {
  if (n === 'pace') career.setPace(a);
  else if (n === 'heard') { const [id, how] = String(a).split('|'); career.heardSection(id, how); }
  else if (n === 'ans') { const [id, ok] = String(a).split('|'); career.answered(id, ok === '1'); }
}

// M6's goal: "最初から修了式まで通して遊べる（bot.mjs で各章の関門を通る）" — from the morning after the first solo to the
// graduation: each later chapter's lessons flown by the bot in whole days (the twin's in the Seminole, from its own
// walk-around and two-engine start), the written tests, the navigation log and the solo cross-country, the instrument
// check in low cloud, the multi-engine check, the final check with the examiner, the graduation in the lobby.
test('career run M6: from the morning after the first solo to the graduation — every chapter\'s gate by the bot', { timeout: 3600000 }, () => {
  const career = createCareer({ store: memStore(), seed: 21 });
  const talk = createDialogState(), prog = SC.sanitizeProgress({});
  for (const id of [...GROUND, ...CH2, 'c1']) prog.lessons[id] = { tries: 1, best: 'S', pass: true, levels: ['basic'] };
  career.load({ ...career.state, chapter: 'ch2', day: 30, done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true }, presolo: { tries: 1, best: 90, pass: true } }, solo: { day: 30 } });
  talk.trust.instructor = 70;
  career.sleep(); assert.ok(career.advanceChapter(prog, 70)); assert.equal(career.chapter, 'ch3');
  const quiz = (data, id) => {
    const q = { quiz: {} }, s2 = createDialogState(), r = createRunner({ data, state: s2, ctx: q, hooks: { onHook: (n, a) => { if (n === 'quizEnd') q.quiz = scoreOf(s2, +a); if (n === 'done') q.result = a; } } });
    r.start(id);
    for (let k = 0; k < 600 && r.running; k++) {
      const v = r.view(), m = /^q(\d+)$/.exec(v.node);
      if (v.choices.length) r.choose(m && data.questions[+m[1]] ? v.choices.findIndex(c => c.text === data.questions[+m[1]].opts[data.questions[+m[1]].ok]) : 0); else r.next();
    }
    return q;
  };
  const log = [], chapterDays = {};
  let days = 0, graduated = false;
  while (!graduated && days < 160) {
    days++;
    const st = career.state, w = career.weather(prog), sch = career.schedule(prog, { trust: 70, weather: w });
    chapterDays[st.chapter] = (chapterDays[st.chapter] || 0) + 1;
    log.push(`${st.day} ${st.chapter} ${w.kind}: ${sch.map(x => `${x.kind}:${x.id}`).join(' ')}`);
    for (const it of sch) {
      if (it.kind === 'exam') { const q = quiz(examDialogs(FL, it.id, { seed: st.seed + st.day }), 'exam'); career.exam(it.id, q.quiz.pct); assert.equal(q.result, 'pass', `${it.id} passed with the right answers`); }
      else if (it.kind === 'navlog') { const q = quiz(navlogDialogs(FL, { seed: st.day }), 'navlog'); assert.equal(q.result, 'pass', 'the navigation log'); career.done('navlog', 'xc'); }
      else if (it.kind === 'graduation') {
        let hooked = false;
        const ctx = { career: { chapter: st.chapter, graduated: false, flying: true }, today: { graduation: true, checkride: false, checkId: '' }, weather: {} };
        const r = createRunner({ data: peopleDialogs(), state: talk, ctx, hooks: { onHook: (n, a) => { if (n === 'done' && a === 'graduation') hooked = true; } } });
        r.start('chief'); for (let k = 0; k < 100 && r.running; k++) { const v = r.view(); if (v.choices.length) r.choose(0); else r.next(); }
        assert.ok(hooked, 'the ceremony\'s speech heard to its end');
        career.graduate(); graduated = true;
      } else if (['flight', 'xc', 'checkride'].includes(it.kind)) {
        assert.ok(career.decision(w.decision, w));
        const plan = it.kind === 'flight' ? planFor(FL, it.id) : planFor(FL, null, { check: CHECKS[it.id] });
        if (it.kind === 'flight') assert.equal(plan.aircraft, STAGE[st.chapter].aircraft, `${it.id} in the ${plan.aircraft}`);
        const r = playDay(FL, { plan, anomalies: [], seed: st.day });
        assert.equal(r.day.phase, 'debrief', `day ${st.day} ${plan.lessons.join(' ')}: ${r.phases.join(' ')}`);
        for (const L of r.got) SC.noteLesson(prog, L);
        const pass = r.got.every(L => L.passed);
        assert.ok(pass, `day ${st.day} ${plan.lessons.join(' ')}: ${r.got.map(L => `${L.def.id} ${L.grade}`).join(', ')}`);
        if (it.kind === 'flight') career.done('flight', it.id); else career.check(it.id, pass);
      } else if (it.kind === 'study') career.done('study', it.id);
    }
    if (!graduated) { career.sleep(); career.advanceChapter(prog, 70); }
  }
  if (process.env.DBG) console.log(log.join('\n'));
  const st = career.state;
  assert.ok(st.graduated, `graduated (after ${days} days)\n${log.join('\n')}`);
  for (const ch of LATER) {
    const S = STAGE[ch];
    for (const id of S.lessons) assert.ok(passedAt(prog, id), `${ch} ${id}`);
    assert.ok(st.exams[S.exam].pass, `${ch}: ${EXAMS[S.exam].title}`);
    assert.ok(st.checks[S.check].pass, `${ch}: ${CHECKS[S.check].title}`);
    assert.ok(chapterDays[ch] >= 3, `${ch}: ${chapterDays[ch]} days`);           // (a twin's day flies m1 and m5 round its lesson: they pass early)
  }
  assert.ok(log.some(l => /lowCloud/.test(l)), 'a day of low cloud in the instrument chapter');
  assert.ok(days >= 25 && days <= 120, `${days} days`);
});
