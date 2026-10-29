// CADET — chapter 1 asks only what it has said (the brief's §7, the second problem). Every scored question — the
// classes' checks, the written test, the training device's k2, k3, k5 and k6 — comes after the line that says its
// answer has been heard on the way the cadet actually went: at every pace (今日の訓練に要るところ, じっくり, 要点だけ),
// in a class taken up again midway (続きから), for careers of seeds 1–200. The judging is tools/measure-ch1.mjs's.
// Also: 要点だけ says every ここが大切 and stays under 30% of the class read in full; the paces' names and times say
// what they are; each device lesson comes on or after the day of the class that teaches it; a class, a lesson or a
// test begun again asks in another order.
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
const PACE = { need: /^(最初から：)?今日の訓練に要る/, full: /^(最初から：)?じっくり/, quick: /^(最初から：)?要点だけ/ };
const secsOf = (i) => S.CLASS_CHAPTERS[i].flatMap(id => BOOK.chapters.find(c => c.id === id).sections.map(s => s.id));
// a class run: its pace by name (or the resume), the right answers, a break at section `brk`'s end
function runClass(data, { pace = 'full', resume = false, brk = null } = {}) {
  const r = createRunner({ data, state: createDialogState(), ctx: { quiz: {} }, hooks: { onHook: () => {} } }), lines = [];
  r.start('class');
  for (let k = 0; k < 6000 && r.running; k++) {
    const v = r.view(); lines.push({ node: v.node, text: v.text });
    // (the break: Q at the section's end, a line of its own)
    if (!v.choices.length) { if (!(brk !== null && v.node === brk && r.press('Q'))) r.next(); continue; }
    const m = /^q(\d+)$/.exec(v.node), x = m ? data.questions[+m[1]] : null;
    let i = 0;
    if (x) i = v.choices.findIndex(c => c.text === x.opts[x.ok]);
    else if (v.node === 'pace') i = resume ? 0 : v.choices.findIndex(c => PACE[pace].test(c.text) && !/^続きから/.test(c.text));
    r.choose(i);
  }
  assert.equal(r.running, false, 'the class ends');
  return lines;
}
const answerOf = (id) => { const m = /^(q_[a-z]+)#(\d+)$/.exec(id); if (m) return BANK_ANSWERS[m[1]][+m[2]].a; const n = /^note:(.+)$/.exec(id); return n ? L.answers.NOTE_ANSWERS[n[1]] : undefined; };

test('every question of chapter 1 comes after its answer was said (scored, and the classes\' and the evenings\' own) — 要るところ, じっくり and 要点だけ, careers of seeds 1–200', { timeout: 600000 }, async () => {
  for (const pace of ['need', 'full', 'quick']) {
    let n = 0;
    const where = new Set();
    for (let seed = 1; seed <= 200; seed++) {
      const r = await measureCh1({ pace, seed });
      for (const a of r.asked) {
        assert.ok(a.known && a.inBook, `${pace} seed ${seed}: ${a.where} ${a.id} is a question of part 1`);
        assert.ok(a.said, `${pace} seed ${seed}, day ${a.day} ${a.where}: ${a.id} asked before its answer was said`);
        n++; where.add(a.where.replace(/ .*/, ''));
      }
      // (the classes' order: each device lesson on the day of the class that teaches it, or later)
      if (seed === 1) for (const [k, f] of Object.entries(r.ftdDay)) {
        const need = new Set(({ k3: Object.values(DRILL_ANSWERS), k5: Object.values(SCENE_ANSWERS), k6: Object.values(LISTEN_ANSWERS) }[k] || []).flat().filter(Boolean).map(([sec]) => sec));
        for (const sec of BOOK.lessonSections(k).map(x => x.id)) need.add(sec);
        for (const sec of need) {
          const i = S.CLASS_CHAPTERS.findIndex((_, c) => secsOf(c).includes(sec));
          assert.ok(i >= 0 && r.classDay[i].day <= f.day, `${k} (day ${f.day}) after the class that teaches ${sec} (day ${r.classDay[i] && r.classDay[i].day})`);
        }
      }
      // the written test: at least 4 of each of its seven banks taught, whatever the pace
      if (seed <= 3) {
        const heard = new Set(r.heard);
        for (const b of L.career.EXAMS.written1.banks) {
          const ok = BANK_ANSWERS[b].filter(x => x.a && x.a.every(([sec]) => heard.has(sec))).length;
          assert.ok(ok >= 4, `${pace}: ${b} has ${ok} questions taught`);
        }
      }
    }
    assert.deepEqual([...where].sort(), ['class', 'event', 'exam', 'ftd'], `${pace}: the classes, the evenings' events, the device and the written test`);
    assert.ok(n > 200 * 80, `${pace}: ${n} questions judged`);
  }
});

test('a class taken up again midway (続きから) asks only what was said — before the break, after it, or in the classes before: the dialog each seed builds, its scored questions and its checks', { timeout: 600000 }, () => {
  let judged = 0;
  // (the classes before: heard at the quick pace, the least of them)
  const before = (i) => S.CLASS_CHAPTERS.slice(0, i).map((_, c) => runClass(S.classDialogs(FL, c, { pace: 'quick' }), { pace: 'quick' }).map(l => l.text).join('')).join('');
  for (let i = 0; i < S.CLASS_CHAPTERS.length; i++) {
    const prior = squash(before(i)), all = S.classQuestions(FL, i, {}).all;
    for (const pace of ['full', 'need']) for (let b = 0; b < all.length - 1; b++) {
      const sec = all[b], end = `c${sec.k}s${sec.j}:end`, heard = new Set([...S.sectionsBefore(FL, i), ...all.slice(0, b + 1).map(x => x.sec.id)]);
      // (each seed and try its own dialog — the questions a resumed class asks depend on what it asked as checks)
      for (let seed = 1; seed <= 12; seed++) for (const attempt of [0, 1]) {
        const s1 = runClass(S.classDialogs(FL, i, { seed, attempt }), { pace, brk: end });
        if (!s1.some(l => l.node === `c${sec.k}s${sec.j}:break`)) continue;
        const d2 = S.classDialogs(FL, i, { seed, attempt, from: b + 1, heard, last: pace });
        const s2 = runTalk(L, d2, 'class', { policy: (v) => (v.node === 'pace' ? 0 : null), ctx: { quiz: {} } }).lines;
        assert.ok(s2.some(l => /続きから|確認から続けます/.test(l.text)), `class ${i} from ${b + 1}: taken up again`);
        const text1 = prior + squash(s1.map(l => l.text).join(''));
        s2.forEach((l, at) => {
          if (!l.q || !l.q.id) return;
          const a = M.answerOf(L, l.q.id); if (!a) return;
          const heardText = text1 + squash(s2.slice(0, at).map(x => x.text).join(''));
          for (const [sec2, w] of a) if (sec2 !== 'k1') assert.ok(heardText.includes(squash(w)), `class ${i} ${pace} from ${b + 1} seed ${seed}/${attempt}: ${l.q.id} (${l.node}) before "${w}"`);
          judged++;
        });
      }
    }
  }
  assert.ok(judged > 1000, `${judged} questions judged`);
});

test('要点だけ: every ここが大切 of every section said, and each class under 30% of its time read in full; the paces\' names and times as they are', () => {
  for (let i = 0; i < S.CLASS_CHAPTERS.length; i++) {
    const d = S.classDialogs(FL, i, {}), q = runClass(d, { pace: 'quick' }), f = runClass(d, { pace: 'full' }), n = runClass(d, { pace: 'need' });
    const text = squash(q.map(l => l.text).join(''));
    for (const id of secsOf(i)) for (const u of lectureUnits(BOOK.section(id)).filter(x => x.k === 'key')) for (const kp of u.items) {
      if (NOT_SPOKEN.test(kp)) continue;
      for (const l of S.lectureLines(kp, { whole: true })) assert.ok(text.includes(squash(l).replace(/^英語の覚え方もあります。/, '')) || text.includes(squash(`英語の覚え方もあります。“${l.replace(/[.。]$/, '')}”。`)), `class ${i} ${id}: key point "${l}"`);
    }
    const t = (ls) => ls.reduce((s, l) => s + readingSeconds(l.text), 0);
    assert.ok(t(q) <= 0.3 * t(f), `class ${i}: 要点だけ ${(t(q) / 60).toFixed(1)} min, ${(100 * t(q) / t(f)).toFixed(0)}% of ${(t(f) / 60).toFixed(1)}`);
    // the names: the time each says is its own path's (rounded as said); the pace for today reads in full just the
    // sections the afternoon's lesson and the first flight need, the others as 要点だけ
    const N = d.dialogs.class.nodes, said = (p) => +/約 (\d+) 分/.exec(N.pace.choices.find(c => PACE[p].test(c.text)).text)[1];
    for (const [p, flags] of [['need', { need: true }], ['full', {}], ['quick', { quick: true }]]) {
      const m = S.minutesOf(N, 'c0', flags), want = m < 12 ? Math.max(1, Math.round(m)) : Math.round(m / 5) * 5;
      assert.equal(said(p), want, `class ${i} ${p}: says ${said(p)} minutes, takes ${m.toFixed(1)}`);
    }
    const need = S.needSections(FL, i), progress = (ls) => ls.filter(l => /^c\d+s\d+$/.test(l.node));
    assert.equal(progress(n).length, need.size, `class ${i}: in full only ${[...need].join(' ') || '(none)'}`);
    assert.ok(!N.pace.choices.some(c => /復習/.test(c.text)), 'the first time is not a review');
  }
});

test('begun again, a class, a lesson and a test ask in another order', () => {
  const ids = (qs) => qs.map(x => `${x.id}:${x.opts.join('/')}`).join(' ');
  for (let i = 0; i < S.CLASS_CHAPTERS.length; i++) assert.notEqual(ids(S.classQuestions(FL, i, { seed: 5, attempt: 0 }).qs), ids(S.classQuestions(FL, i, { seed: 5, attempt: 1 }).qs), `class ${i}`);
  for (const k of ['k2', 'k3', 'k5', 'k6']) assert.notEqual(ids(S.ftdDialogs(FL, k, { seed: 5, attempt: 0 }).questions), ids(S.ftdDialogs(FL, k, { seed: 5, attempt: 1 }).questions), k);
  assert.notEqual(ids(S.examDialogs(FL, 'written1', { seed: 5, attempt: 0 }).questions), ids(S.examDialogs(FL, 'written1', { seed: 5, attempt: 1 }).questions), 'written1');
});
