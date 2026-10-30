// CADET — ground school without a screen (content/school.js): the six classes of chapter 1, the training device's six
// lessons (k1–k6) and the two written tests are valid dialog data from FLIGHT LAB's textbook, radio chapter and question
// banks; a quiz answered right passes, answered wrong fails (the score from the quiz's own flags); every line in the
// world's own words.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classDialogs, classPlan, ftdDialogs, examDialogs, scoreOf, CLASS_CHAPTERS, BANK_OF, FTD_TITLES, pfdPictures } from '../src/content/school.js';
import { gameBook } from '../src/content/book.js';
import { ourCall } from '../src/content/dialog/atc.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { EXAMS } from '../src/career/career.js';
import { installSorajima } from '../src/flight/sorajima.js';
import { loadFL, GAME } from './helpers/fl.mjs';

loadFL(GAME);                      // FLIGHT LAB's modules as the game reads them
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
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
// a bank's question as the class says it (its chapter references numbered for the game's book, today's call sign)
const callText = (t) => { const B = gameBook(FL); return ourCall(String(t).replace(/\{ch:([a-z0-9]+)\}/g, (m, id) => { const c = B.chapters.find(x => x.id === id); return c ? `第 ${c.n} 章` : '教科書'; })); };
const clean = (lines, where) => { for (const l of lines) { assert.ok(!REAL.test(l), `${where}: ${l}`); assert.ok(!APP.test(l), `${where} talks about the game: ${l}`); assert.ok(!/\{[a-z]+:/.test(l), `${where}: a reference left: ${l}`); } };

test('school: six classes cover the textbook\'s ground school — each section said, its figure on the screen, two questions, the class done', () => {
  // (textbook/rewrite/combined/DESIGN.md 6.3: still six classes in the same order — a save keeps the classes done by
  // their place — each widened to the chapters R2 added: basics, inst, wb, navb, adm)
  const ids = CLASS_CHAPTERS.flat();
  assert.equal(CLASS_CHAPTERS.length, 6);
  assert.deepEqual(ids, ['basics', 'aero', 'sys', 'inst', 'perf', 'wb', 'wx', 'navb', 'law', 'hf', 'adm', 'radio1', 'radio2', 'radio3', 'radio4', 'radio5']);
  assert.deepEqual(CLASS_CHAPTERS.map(c => c.at(-1)), ['aero', 'wb', 'navb', 'adm', 'radio2', 'radio5'], 'each class still holds its old chapters, in the old order');
  // every chapter of the ground school in the game's book (the front part's and part 1's) is taught in a class
  const BOOK = gameBook(FL);
  assert.deepEqual(BOOK.chapters.filter(c => ['p0', 'p1'].includes(c.part)).map(c => c.id).sort(), [...ids].sort());
  // the game's book marks the deep sections (発展) as FLIGHT LAB's does
  const deepIn = (chs, key) => chs.flatMap(c => c[key].filter(s => s.deep).map(s => s.id));
  assert.deepEqual(deepIn(BOOK.chapters, 'sections'), deepIn(FL.book.CHAPTERS, 'secs').filter(id => BOOK.sectionExists(id)));
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
    // each chapter's sections said in the book's order, the deep ones (発展) left to the cadet's reading
    const text = r.lines.join('\n');
    for (const id of CLASS_CHAPTERS[i]) {
      const c = BOOK.chapters.find(x => x.id === id);
      assert.ok(c, `${id}: in the game's book`);
      assert.ok(text.includes(`第 ${c.n} 章「${c.title}」`), `class ${i}: ${id} introduced`);
      let at = -1;
      for (const s of c.sections) {
        const where = text.indexOf(`「${s.title}」。`);
        if (s.deep) { assert.equal(where, -1, `class ${i}: the deep section ${s.id} is not taught`); assert.ok(text.includes(`「${s.title.replace(/（発展）$/, '')}」は発展です。`), `${s.id}: left to the reading`); continue; }
        assert.ok(where > at, `class ${i}: ${s.id} said, in order`); at = where;
      }
    }
    for (const h of r.hooks.filter(x => x[0] === 'board')) assert.equal(BOOK.section(h[1]).deep, false, `class ${i}: no figure of a deep section`);
  }
  assert.ok(shown >= 4, `figures on the screen in ${shown} classes (the radio chapters have few)`);
});

test('school: the classes\' questions — from their chapters\' banks, on what was said that day', () => {
  // BANK_OF (DESIGN 6.3): the new chapters go with the banks there are (inst→q_sys, wb→q_perf, navb→q_nav, adm→q_hf);
  // basics has none of its own
  assert.deepEqual(Object.keys(BANK_OF).sort(), CLASS_CHAPTERS.flat().filter(id => id !== 'basics').sort());
  assert.deepEqual([BANK_OF.inst, BANK_OF.wb, BANK_OF.navb, BANK_OF.adm], ['q_sys', 'q_perf', 'q_nav', 'q_hf']);
  for (const b of new Set(Object.values(BANK_OF))) assert.ok(FL.quiz.BANKS.some(x => x.id === b), `${b}: a bank of FLIGHT LAB's`);
  const bankOf = new Map(FL.quiz.BANKS.flatMap(b => b.qs.map(x => [x, b.id])));
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    const { chapters, pool } = classPlan(FL, i);
    const said = new Set(chapters.flatMap(c => c.said.map(s => s.id)));
    const banks = new Set(CLASS_CHAPTERS[i].map(id => BANK_OF[id]).filter(Boolean));
    assert.ok(pool.length >= 10, `class ${i}: ${pool.length} questions to draw from`);
    for (const x of pool) {
      assert.ok(banks.has(bankOf.get(x)), `class ${i}: ${x[0]} from a bank of its chapters`);
      // a question that names its section: only when that section was said (not a deep one, not another chapter's)
      if (x[4] && x[4].sec) assert.ok(said.has(x[4].sec), `class ${i}: ${x[0]} is on ${x[4].sec}, not said in this class`);
      // q_nav's own questions are part 3's navigation (VOR, GPS, diversions): not drawn in a class on the basics
      else assert.notEqual(bankOf.get(x), 'q_nav', `class ${i}: ${x[0]} is part 3's`);
    }
    // the two asked are among them, whatever the seed
    for (const seed of [1, 2, 3, 11]) {
      const d = classDialogs(FL, i, { seed }), texts = new Set(pool.map(x => callText(x[0])));
      assert.equal(d.questions.length, 2);
      for (const x of d.questions) assert.ok(texts.has(x.q), `class ${i} seed ${seed}: ${x.q}`);
    }
  }
  // the class on weather and the basics of navigation asks navb's own questions too
  assert.ok(classPlan(FL, 2).pool.some(x => x[4] && /^navb\./.test(x[4].sec)), 'navb\'s questions in its class');
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
