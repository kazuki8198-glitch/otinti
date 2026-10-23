// CADET — ground school without a screen (content/school.js): the six classes of chapter 1, the training device's six
// lessons (k1–k6) and the two written tests are valid dialog data from FLIGHT LAB's textbook, radio chapter and question
// banks; a quiz answered right passes, answered wrong fails (the score from the quiz's own flags); every line in the
// world's own words.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classDialogs, ftdDialogs, examDialogs, scoreOf, CLASS_CHAPTERS, FTD_TITLES, pfdPictures } from '../src/content/school.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { EXAMS } from '../src/career/career.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js', 'radio.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
const FL = globalThis.FL;
const REAL = /(?<![A-Za-z])ANA(?![A-Za-z])|ＡＮＡ|all\s*nippon|全日空|acron|garmin|Seven Lima Alpha|7LA/i;
const APP = /ゲーム|ソフト|プレイヤー|FLIGHT LAB|シミュレータ|キーボード|メニュー/;

// run a dialog to its end: right answers (or wrong ones), the score worked out at 'quizEnd' as the game does
function run(data, id, { right = true } = {}) {
  const st = createDialogState(), ctx = { quiz: null }, hooks = [], lines = [];
  const qs = data.questions || [];
  const r = createRunner({ data, state: st, ctx, hooks: { onHook: (n, a) => { hooks.push([n, a]); if (n === 'quizEnd') ctx.quiz = scoreOf(st, +a); } } });
  r.start(id);
  for (let k = 0; k < 400 && r.running; k++) {
    const v = r.view(); lines.push(v.text, ...v.choices.map(c => c.text));
    if (v.choices.length) {
      const qi = /^q(\d+)$/.exec(v.node), x = qi ? (qs[+qi[1]] || null) : null;
      const okText = x ? x.opts[x.ok] : null, i = okText != null ? v.choices.findIndex(c => c.text === okText) : 0;
      r.choose(right ? i : (i + 1) % v.choices.length);
    } else r.next();
  }
  assert.equal(r.running, false);
  return { st, ctx, hooks, lines };
}
const clean = (lines, where) => { for (const l of lines) { assert.ok(!REAL.test(l), `${where}: ${l}`); assert.ok(!APP.test(l), `${where} talks about the game: ${l}`); assert.ok(!/\{[a-z]+:/.test(l), `${where}: a reference left: ${l}`); } };

test('school: six classes cover the textbook\'s part 1 — each section said, its figure on the screen, two questions, the class done', () => {
  const ids = CLASS_CHAPTERS.flat();
  assert.deepEqual(ids, ['aero', 'sys', 'perf', 'wx', 'law', 'hf', 'radio1', 'radio2', 'radio3', 'radio4', 'radio5']);
  let shown = 0;
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    const d = classDialogs(FL, i);
    const { errors } = validateDialogs(d, { sampleCtx: { quiz: { right: 1, n: 2, pct: 50, pass: false } } });
    assert.deepEqual(errors, [], `class ${i}`);
    const r = run(d, 'class');
    clean(r.lines, `class ${i}`);
    assert.ok(r.hooks.some(h => h[0] === 'done' && h[1] === 'class'), `class ${i} done`);
    if (r.hooks.some(h => h[0] === 'board')) shown++;
    assert.equal(r.ctx.quiz.right, 2);
  }
  assert.ok(shown >= 4, `figures on the screen in ${shown} classes (the radio chapters have few)`);
});

test('school: the training device — k1 and k4 told through, k2/k3/k5/k6 ten questions each: passed when right, not when wrong', () => {
  assert.deepEqual(Object.keys(FTD_TITLES), ['k1', 'k2', 'k3', 'k4', 'k5', 'k6']);
  for (const k of Object.keys(FTD_TITLES)) {
    const d = ftdDialogs(FL, k, { seed: 4 });
    const { errors } = validateDialogs(d, { sampleCtx: { quiz: { right: 8, n: 10, pct: 80, pass: true } } });
    assert.deepEqual(errors, [], k);
    const good = run(d, 'ftd');
    clean(good.lines, k);
    assert.ok(good.hooks.some(h => h[0] === 'done' && h[1] === 'pass'), `${k} passed`);
    if (k === 'k1') assert.ok(good.hooks.filter(h => h[0] === 'pfd').length >= 7, 'the parts of the PFD on the screen');
    if (k === 'k4') assert.ok(good.hooks.filter(h => h[0] === 'say').length > 10, 'the calls spoken');
    if (['k2', 'k3', 'k5', 'k6'].includes(k)) {
      assert.equal(d.questions.length, 10); assert.deepEqual(good.ctx.quiz, { right: 10, n: 10, pct: 100, pass: true });
      const bad = run(d, 'ftd', { right: false });
      assert.ok(bad.hooks.some(h => h[0] === 'done' && h[1] === 'fail')); assert.equal(bad.ctx.quiz.right, 0);
      for (const x of d.questions) { assert.equal(x.opts.length >= 3, true); assert.ok(x.ok >= 0 && x.ok < x.opts.length, `${k}: the right answer is among the choices`); }
    }
    if (k === 'k6') assert.ok(d.questions.every(x => x.say && /Archer Seven Three Eight Sierra Yankee|Archer 8SY/.test(x.say) || x.say), 'the English to hear');
  }
  // k2's pictures: what is asked can be read off them
  const pics = pfdPictures(4), d2 = ftdDialogs(FL, 'k2', { seed: 4 });
  d2.questions.forEach((x, i) => { assert.equal(x.pfd, i); assert.ok(pics[i]); });
});

test('school: the written tests — from FLIGHT LAB\'s banks, as many questions as set, 80% to pass', () => {
  for (const id of Object.keys(EXAMS)) {
    const d = examDialogs(FL, id, { seed: 2 });
    assert.equal(d.questions.length, EXAMS[id].n);
    const { errors } = validateDialogs(d, { sampleCtx: { quiz: { right: 8, n: 10, pct: 80, pass: true } } });
    assert.deepEqual(errors, []);
    const good = run(d, 'exam'); clean(good.lines, id);
    assert.equal(good.ctx.quiz.pct, 100); assert.ok(good.hooks.some(h => h[0] === 'done' && h[1] === 'pass'));
    assert.ok(run(d, 'exam', { right: false }).hooks.some(h => h[0] === 'done' && h[1] === 'fail'));
    // the same seed, the same test; another, another
    assert.deepEqual(examDialogs(FL, id, { seed: 2 }).questions, d.questions);
    assert.notDeepEqual(examDialogs(FL, id, { seed: 3 }).questions, d.questions);
  }
});
