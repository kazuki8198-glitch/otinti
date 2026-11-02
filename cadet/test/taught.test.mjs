// CADET — chapter 1 asks only what it has said (the brief's §7, the second problem), after the ground-school
// redesign and the restoration of the format choice: each class is taken as its sections' key-point cards
// with their figures and tables on the screen, the checks inside them, and a five-question drill at the end —
// or read in full: the whole textbook said in the book's order, her introduction and notes, the checks inside,
// and two scored questions after each chapter. Every scored question — the classes' checks, drills and
// chapter questions, the written test, the training device's k2, k3, k5 and k6 — comes after the line that
// says its answer has been heard on the way the cadet actually went, in the format the cadet actually took,
// in a class taken up again midway (自動で続きから) too, for careers of seeds 1–200 (the cards) and 1–25 (in
// full). The judging is tools/measure-ch1.mjs's.
// The redesign's exceptions, named: the written test may ask about the two chapters that left the lecture frame
// — weather (wx) and the first radio chapter (radio1) — whose answers are no longer said in a class: weather is
// lived in the morning's go / no-go, the judgement drill and the evening's METAR event, radio in the book and
// the device; such a question must still be a question of part 1 (known, in the book), only its "said in class"
// is not required — and the evening METAR event's two questions, whose answers are said in the event's own
// talk just before (in its own words, not the book's: answer-map's wording is the book's).
// Also: a class says every ここが大切 and is shorter than the textbook it covers read in full (the redesign's
// −70% is of the units paged on the required path — tools/measure-zagaku.mjs); each device lesson comes on or
// after the day of the class that teaches it; a class, a lesson or a test begun again asks in another order.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../tools/measure-ch1.mjs';
import { load, measureCh1, readingSeconds, runTalk } from '../tools/measure-ch1.mjs';
import { NOT_SPOKEN } from '../src/content/dialog/instructor.js';
import { lectureUnits } from '../src/content/lecture-units.js';
import { BANK_ANSWERS, SCENE_ANSWERS, DRILL_ANSWERS, LISTEN_ANSWERS } from '../src/content/answer-map.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';

const L = await load(), FL = L.FL, S = L.school, BOOK = L.BOOK;
const squash = (s) => String(s ?? '').replace(/\s+/g, '');
const secsOf = (i) => S.CLASS_CHAPTERS[i].flatMap(id => BOOK.chapters.find(c => c.id === id).sections.map(s => s.id));
// the sections whose answers are no longer said in a class (the redesign's moved topics): wx and radio1
const MOVED = new Set([...BOOK.chapters.find(c => c.id === 'wx').sections, ...BOOK.chapters.find(c => c.id === 'radio1').sections].map(s => s.id));
const movedOnly = (id) => { const a = M.answerOf(L, id); return !!a && a.length > 0 && a.every(([sec]) => MOVED.has(sec)); };
// a class run: the right answers, a break at section `brk`'s end; pace: the format's label at the choice
// (left alone, the first way offered — the cards)
function runClass(data, { brk = null, pace = null } = {}) {
  const r = createRunner({ data, state: createDialogState(), ctx: { quiz: {} }, hooks: { onHook: () => {} } }), lines = [];
  r.start('class');
  for (let k = 0; k < 20000 && r.running; k++) {
    const v = r.view(); lines.push({ node: v.node, text: v.text });
    if (!v.choices.length) { if (!(brk !== null && v.node === brk && r.press('Q'))) r.next(); continue; }
    if (v.node === 'pace' && pace) { const j = v.choices.findIndex(c => pace.test(c.text)); r.choose(j >= 0 ? j : 0); continue; }
    const m = /^q(\d+)$/.exec(v.node), cq = /^cq(\d+)$/.exec(v.node), x = m ? data.questions[+m[1]] : cq ? (data.chapterQuestions || [])[+cq[1]] : null;
    r.choose(x ? v.choices.findIndex(c => c.text === x.opts[x.ok]) : 0);
  }
  assert.equal(r.running, false, 'the class ends');
  return lines;
}

test('every question of chapter 1 comes after its answer was said (scored, and the classes\' and the evenings\' own) — the classes as cards and a drill, careers of seeds 1–200', { timeout: 900000 }, async () => {
  let n = 0;
  const where = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const r = await measureCh1({ seed });
    for (const a of r.asked) {
      assert.ok(a.known && a.inBook, `seed ${seed}: ${a.where} ${a.id} is a question of part 1`);
      // (the redesign's named exceptions: a question of the moved chapters only (the written test's), and the
      // METAR event's two — their answers are taught where they now live, not said in a class)
      if (a.said || movedOnly(a.id) || /^event:metar#/.test(a.id)) n++;
      else assert.ok(a.said, `seed ${seed}, day ${a.day} ${a.where}: ${a.id} asked before its answer was said`);
      where.add(a.where.replace(/ .*/, ''));
    }
    // (the classes' order: each device lesson on the day of the class that teaches it, or later — the moved
    // chapters' sections excepted: no class teaches them now, they are the book's and the device's own)
    if (seed === 1) for (const [k, f] of Object.entries(r.ftdDay)) {
      const need = new Set(({ k3: Object.values(DRILL_ANSWERS), k5: Object.values(SCENE_ANSWERS), k6: Object.values(LISTEN_ANSWERS) }[k] || []).flat().filter(Boolean).map(([sec]) => sec));
      for (const sec of BOOK.lessonSections(k).map(x => x.id)) need.add(sec);
      for (const sec of need) {
        if (MOVED.has(sec)) continue;
        const i = S.CLASS_CHAPTERS.findIndex((_, c) => secsOf(c).includes(sec));
        assert.ok(i >= 0 && r.classDay[i].day <= f.day, `${k} (day ${f.day}) after the class that teaches ${sec} (day ${r.classDay[i] && r.classDay[i].day})`);
      }
    }
    // the written test: at least 4 of each of its banks taught — except the weather bank, whose chapter left
    // the lecture frame (its questions stay known, above; they are learned where weather is lived)
    if (seed <= 3) {
      const heard = new Set(r.heard);
      for (const b of L.career.EXAMS.written1.banks) {
        if (b === 'q_wx') continue;
        const ok = BANK_ANSWERS[b].filter(x => x.a && x.a.every(([sec]) => heard.has(sec))).length;
        assert.ok(ok >= 4, `${b} has ${ok} questions taught`);
      }
    }
  }
  assert.deepEqual([...where].sort(), ['class', 'event', 'exam', 'ftd'], 'the classes, the evenings\' events, the device and the written test');
  assert.ok(n > 200 * 80, `${n} questions judged`);
});

test('every question of chapter 1 comes after its answer was said — the classes read in full (the whole textbook said, two scored questions after each chapter), careers of seeds 1–25', { timeout: 900000 }, async () => {
  let n = 0;
  const where = new Set();
  for (let seed = 1; seed <= 25; seed++) {
    const r = await measureCh1({ seed, pace: 'full' });
    for (const a of r.asked) {
      assert.ok(a.known && a.inBook, `seed ${seed}: ${a.where} ${a.id} is a question of part 1`);
      // (the same named exceptions as the cards': a question of the moved chapters only (the written test's),
      // and the METAR event's two)
      if (a.said || movedOnly(a.id) || /^event:metar#/.test(a.id)) n++;
      else assert.ok(a.said, `seed ${seed}, day ${a.day} ${a.where}: ${a.id} asked before its answer was said`);
      where.add(a.where.replace(/ .*/, ''));
    }
    // (in full, every section is a class's own: each device lesson on the day of the class that teaches it,
    // or later — the moved chapters' sections excepted, as with the cards)
    if (seed === 1) for (const [k, f] of Object.entries(r.ftdDay)) {
      const need = new Set(({ k3: Object.values(DRILL_ANSWERS), k5: Object.values(SCENE_ANSWERS), k6: Object.values(LISTEN_ANSWERS) }[k] || []).flat().filter(Boolean).map(([sec]) => sec));
      for (const sec of BOOK.lessonSections(k).map(x => x.id)) need.add(sec);
      for (const sec of need) {
        if (MOVED.has(sec)) continue;
        const i = S.CLASS_CHAPTERS.findIndex((_, c) => secsOf(c).includes(sec));
        assert.ok(i >= 0 && r.classDay[i].day <= f.day, `${k} (day ${f.day}) after the class that teaches ${sec} (day ${r.classDay[i] && r.classDay[i].day})`);
      }
    }
  }
  assert.deepEqual([...where].sort(), ['class', 'event', 'exam', 'ftd'], 'the classes, the evenings\' events, the device and the written test');
  assert.ok(n > 25 * 80, `${n} questions judged`);
});

test('a class taken up again midway asks only what was said — before the break, after it, or in the classes before: the dialog each seed builds, its scored questions and its checks', { timeout: 900000 }, () => {
  let judged = 0;
  // (the classes before: heard as they go now)
  const before = (i) => S.CLASS_CHAPTERS.slice(0, i).map((_, c) => runClass(S.classDialogs(FL, c, {})).map(l => l.text).join('')).join('');
  for (let i = 0; i < S.CLASS_CHAPTERS.length; i++) {
    const prior = squash(before(i)), all = S.classQuestions(FL, i, {}).all;
    for (let b = 0; b < all.length - 1; b++) {
      const sec = all[b], end = `c${sec.k}s${sec.j}:end`, heard = new Set([...S.sectionsBefore(FL, i), ...all.slice(0, b + 1).map(x => x.sec.id)]);
      // (each seed and try its own dialog — the questions a resumed class asks depend on what it asked as checks)
      for (let seed = 1; seed <= 4; seed++) for (const attempt of [0, 1]) {
        const s1 = runClass(S.classDialogs(FL, i, { seed, attempt }), { brk: end });
        if (!s1.some(l => l.node === `c${sec.k}s${sec.j}:break`)) continue;
        const d2 = S.classDialogs(FL, i, { seed, attempt, from: b + 1, heard });
        const s2 = runTalk(L, d2, 'class', { ctx: { quiz: {} } }).lines;
        assert.ok(s2.some(l => /続きから|から続けます/.test(l.text)), `class ${i} from ${b + 1}: taken up again`);
        const text1 = prior + squash(s1.map(l => l.text).join(''));
        s2.forEach((l, at) => {
          if (!l.q || !l.q.id) return;
          const a = M.answerOf(L, l.q.id); if (!a) return;
          const heardText = text1 + squash(s2.slice(0, at).map(x => x.text).join(''));
          for (const [sec2, w] of a) if (sec2 !== 'k1') assert.ok(heardText.includes(squash(w)), `class ${i} from ${b + 1} seed ${seed}/${attempt}: ${l.q.id} (${l.node}) before "${w}"`);
          judged++;
        });
      }
    }
  }
  assert.ok(judged > 300, `${judged} questions judged`);
});

test('a class taken up again midway in full asks only what was said — before the break, after it, or in the classes before (themselves read in full): its chapter questions and its checks', { timeout: 900000 }, () => {
  let judged = 0;
  // (the classes before: heard in full, as this cadet took them)
  const before = (i) => S.CLASS_CHAPTERS.slice(0, i).map((_, c) => runClass(S.classDialogs(FL, c, {}), { pace: /^じっくり/ }).map(l => l.text).join('')).join('');
  for (let i = 0; i < S.CLASS_CHAPTERS.length; i++) {
    const prior = squash(before(i)), all = S.classQuestions(FL, i, {}).all;
    for (let b = 0; b < all.length - 1; b++) {
      const sec = all[b], end = `f${sec.k}s${sec.j}:end`, heard = new Set([...S.sectionsBefore(FL, i), ...all.slice(0, b + 1).map(x => x.sec.id)]);
      for (let seed = 1; seed <= 2; seed++) {
        const s1 = runClass(S.classDialogs(FL, i, { seed }), { brk: end, pace: /^じっくり/ });
        if (!s1.some(l => l.node === `f${sec.k}s${sec.j}:break`)) continue;
        const d2 = S.classDialogs(FL, i, { seed, pace: 'full', from: b + 1, heard });
        assert.ok(!d2.dialogs.class.nodes.pace, `class ${i} from ${b + 1}: the format not asked again`);
        const s2 = runTalk(L, d2, 'class', { ctx: { quiz: {} } }).lines;
        assert.ok(s2.some(l => /続きから|から続けます|確認から続けます/.test(l.text)), `class ${i} from ${b + 1}: taken up again`);
        const text1 = prior + squash(s1.map(l => l.text).join(''));
        s2.forEach((l, at) => {
          if (!l.q || !l.q.id) return;
          const a = M.answerOf(L, l.q.id); if (!a) return;
          const heardText = text1 + squash(s2.slice(0, at).map(x => x.text).join(''));
          for (const [sec2, w] of a) if (sec2 !== 'k1') assert.ok(heardText.includes(squash(w)), `class ${i} from ${b + 1} seed ${seed}: ${l.q.id} (${l.node}) before "${w}"`);
          judged++;
        });
      }
    }
  }
  assert.ok(judged > 100, `${judged} questions judged`);
});

test('a class as cards: every ここが大切 of every section said, and each class shorter than the textbook it covers read in full (the −70% is of paged units: tools/measure-zagaku.mjs)', () => {
  for (let i = 0; i < S.CLASS_CHAPTERS.length; i++) {
    const q = runClass(S.classDialogs(FL, i, {}));
    const text = squash(q.map(l => l.text).join(''));
    for (const id of secsOf(i)) for (const u of lectureUnits(BOOK.section(id)).filter(x => x.k === 'key')) for (const kp of u.items) {
      if (NOT_SPOKEN.test(kp)) continue;
      for (const l of S.lectureLines(kp, { whole: true })) assert.ok(text.includes(squash(l).replace(/^英語の覚え方もあります。/, '')) || text.includes(squash(`英語の覚え方もあります。“${l.replace(/[.。]$/, '')}”。`)), `class ${i} ${id}: key point "${l}"`);
    }
    const t = (ls) => ls.reduce((s, l) => s + readingSeconds(l.text), 0);
    const full = secsOf(i).reduce((s, id) => s + S.sectionSteps(BOOK.section(id)).reduce((a, x) => a + readingSeconds(x.text), 0), 0);
    // (a card class with its checks and its drill is not 30% of the book — it is shorter than the book read in
    // full, every class; what fell by more than 70% is the paging itself, measured by tools/measure-zagaku.mjs)
    assert.ok(t(q) < full, `class ${i}: the class ${(t(q) / 60).toFixed(1)} min against the book read in full (${(full / 60).toFixed(1)})`);
  }
});

test('begun again, a class, a lesson and a test ask in another order', () => {
  const ids = (qs) => qs.map(x => `${x.id}:${x.opts.join('/')}`).join(' ');
  for (let i = 0; i < S.CLASS_CHAPTERS.length; i++) assert.notEqual(ids(S.classDialogs(FL, i, { seed: 5, attempt: 0 }).questions), ids(S.classDialogs(FL, i, { seed: 5, attempt: 1 }).questions), `class ${i}`);
  for (const k of ['k2', 'k3', 'k5', 'k6']) assert.notEqual(ids(S.ftdDialogs(FL, k, { seed: 5, attempt: 0 }).questions), ids(S.ftdDialogs(FL, k, { seed: 5, attempt: 1 }).questions), k);
  assert.notEqual(ids(S.examDialogs(FL, 'written1', { seed: 5, attempt: 0 }).questions), ids(S.examDialogs(FL, 'written1', { seed: 5, attempt: 1 }).questions), 'written1');
});
