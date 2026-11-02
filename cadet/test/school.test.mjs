// CADET — ground school without a screen (content/school.js): the six classes of chapter 1, the training device's six
// lessons (k1–k6) and the two written tests are valid dialog data from FLIGHT LAB's textbook, radio chapter and question
// banks; a quiz answered right passes, answered wrong fails (the score from the quiz's own flags); every line in the
// world's own words. The classes are lectures: every sentence of the textbook's part 1 said in order, ここが大切 said as
// such, 考えてみよう asked before it is answered, every page on the screen a real one, the lecturer's notes said where
// there are any (a test gives its own, to check how they are said; another checks content/lecture-notes as written:
// a note for every section, every line sayable and said in its place, a note on a figure or a table with it on the
// screen, none saying the book again), 要点だけ and 続きから too; every table row and every exchange read (the English on
// a line of its own, spoken), and no subtitle longer than 120 characters.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classDialogs, ftdDialogs, examDialogs, drillDialogs, DRILL_CHOICES, scoreOf, examScoreOf, CLASS_CHAPTERS, FTD_TITLES, pfdPictures, lectureLines, lecturePage, lecturerNotesHtml, pathOf, LINE_MAX, noteUnit, DECISION_NODE, sectionHtml, questionPool, classQuestions } from '../src/content/school.js';
import * as TALK from '../src/content/class-talk.js';
import { CLASS_FTD } from '../src/career/career.js';
import { units, lectureUnits, proseOf } from '../src/content/lecture-units.js';
import { gameBook } from '../src/content/book.js';
import { NOT_SPOKEN } from '../src/content/dialog/instructor.js';
import { NOTES } from '../src/content/lecture-notes/index.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { EXAMS, weatherFor, createCareer } from '../src/career/career.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js', 'radio.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL;
const BOOK = gameBook(FL);
const REAL = /(?<![A-Za-z])ANA(?![A-Za-z])|ＡＮＡ|all\s*nippon|全日空|acron|garmin|Seven Lima Alpha|7LA/i;
const APP = /ゲーム|ソフト|プレイヤー|FLIGHT LAB|シミュレータ|キーボード|メニュー|教材/;
const QUIZ = { quiz: { right: 1, n: 2, pct: 50, pass: false } };

// run a dialog to its end: right answers (or wrong ones), the score worked out at 'quizEnd' as the game does; other
// choices: the first, or pick(view, step) → an index (null: the first); the class's pace by its name — じっくり (the whole
// textbook) unless pace says another (need | full | quick), or pick chooses at the pace node itself. At most a few steps
// a node (computed from the data)
const PACE_NAME = { need: /^(最初から：)?今日の訓練に要る/, full: /^(最初から：)?じっくり/, quick: /^(最初から：)?要点だけ/ };
export const paceIndex = (v, pace = 'full') => v.choices.findIndex(c => PACE_NAME[pace].test(c.text));
// (press: (view, k) → a letter for a line's other way on — the section's end: R again, B the textbook, Q a break)
function run(data, id, { right = true, pick = null, pace = 'full', press = null } = {}) {
  const st = createDialogState(), ctx = { quiz: null }, hooks = [], lines = [], views = [];
  const qs = data.questions || [], max = 3 * Object.values(data.dialogs).reduce((n, d) => n + Object.keys(d.nodes).length, 0) + 50;
  const r = createRunner({ data, state: st, ctx, hooks: { onHook: (n, a) => { hooks.push([n, a, views.length]); if (n === 'quizEnd') ctx.quiz = scoreOf(st, +a); } } });
  r.start(id);
  for (let k = 0; k < max && r.running; k++) {
    const v = r.view(); lines.push(v.text, ...v.choices.map(c => c.text)); views.push(v);
    if (v.choices.length) {
      const qi = /^q(\d+)$/.exec(v.node), x = qi ? (qs[+qi[1]] || null) : null;
      // (a class taken up midway offers to go on first: that stays the default)
      const resume = v.choices.some(c => /^続きから/.test(c.text));
      const chosen = pick ? pick(v, k) : null, byPace = v.node === 'pace' && !resume && chosen == null && paceIndex(v, pace) >= 0 ? paceIndex(v, pace) : null;
      const okText = x ? x.opts[x.ok] : null, i = okText != null ? v.choices.findIndex(c => c.text === okText) : chosen ?? byPace ?? 0;
      r.choose(right || okText == null ? i : (i + 1) % v.choices.length);
    } else { const key = press && v.keys && v.keys.length ? press(v, k) : null; if (!(key && r.press(key))) r.next(); }
  }
  assert.equal(r.running, false, `${id}: the talk ends within ${max} steps`);
  return { st, ctx, hooks, lines, views };
}
const clean = (lines, where) => { for (const l of lines) { assert.ok(!REAL.test(l), `${where}: ${l}`); assert.ok(!APP.test(l), `${where} talks about the game: ${l}`); assert.ok(!/\{[a-z]+:/.test(l), `${where}: a reference left: ${l}`); } };
const norm = (s) => String(s).replace(/\s+/g, '');
const qq = (t) => '「' + String(t).replace(/「/g, '『').replace(/」/g, '』') + '」';
const JA = /[\u3040-\u30ff\u4e00-\u9fff]/;
// a note line as content/lecture-notes writes it: a string, or { text, page }
const textOf = (t) => (typeof t === 'string' ? t : t.text);
const sectionsOf = (i) => CLASS_CHAPTERS[i].flatMap(id => BOOK.chapters.find(c => c.id === id).sections.map(s => BOOK.section(s.id)));
// (the lecturer says an English-only key point as a mnemonic)
const said = (kp) => lectureLines(kp, { whole: true }).map(l => (/[\u3040-\u30ff\u4e00-\u9fff]/.test(l) ? l : `英語の覚え方もあります。“${l.replace(/[.。]$/, '')}”。`));
// the lecturer's notes the tests give (content/lecture-notes is written by others): two sections of the first class
const TEST_NOTES = {
  'aero.forces': { intro: ['この 4 つの力は、これから毎日の飛行で何度も出てきます。'], notes: ['操縦桿とパワーで、この 4 つのつり合いを動かしているのが操縦です。', 'つり合いが崩れた方向へ、機体は加速します。'],
    ask: { q: '水平直線飛行で速度が一定のとき、正しいのは？', opts: ['揚力＝重力、推力＝抗力', '揚力＞重力', '推力＞抗力'], ok: 0, why: 'つり合っていれば加速しません。' } },
  'aero.lift': { notes: ['速度が 2 倍なら揚力は 4 倍。ここは試験にも出ます。'] },
};
const testNotes = (id) => TEST_NOTES[id] || null;
// (an answer said over a few lines: its last part ends the reason)
const fit0 = (r, k, why) => r.views.slice(k, k + 4).some(v => norm(v.text).endsWith(norm(why).slice(-10)));
// (a question scored: its choices set a qz_ flag)
const d0q = (v) => /^q\d+$/.test(v.node);
// how much of a sentence's pairs of characters (punctuation and spaces left out) another line has: 0–1
const pairs = (t) => { const c = Array.from(String(t).replace(/[\s。、，,．.！？!?「」“”"'（）()・：:…—―\-]/g, '')), o = new Set(); for (let k = 0; k + 1 < c.length; k++) o.add(c[k] + c[k + 1]); return o; };
const overlap = (a, b) => { const A = pairs(a), B = pairs(b); if (A.size < 6) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return n / A.size; };

test('lecture units: every section of part 1 parsed into known units — every figure, the 考えてみよう, the ここが大切, nothing left over', () => {
  let figures = 0, thinks = 0, keys = 0;
  // (the whole of part 1, the classes' chapters and the two that left the lecture frame alike — the weather and
  // how a radio works stay in the book, and the book is still opened section by section)
  const PART1 = ['aero', 'sys', 'perf', 'wx', 'law', 'radio1', 'radio2', 'radio3', 'radio4', 'radio5', 'hf'];
  for (const sec of PART1.flatMap(id => BOOK.chapters.find(c => c.id === id).sections.map(s => BOOK.section(s.id)))) {
    const raw = units(sec.html);
    assert.deepEqual(raw.filter(u => ['loose', 'other', 'sim', 'calc'].includes(u.k)), [], `${sec.id}: every block known`);
    const us = lectureUnits(sec);
    assert.ok(us.length > 0, sec.id);
    assert.equal(us.filter(u => u.k === 'figure').length, (sec.html.match(/<svg\b/g) || []).length, `${sec.id}: every figure, not only the first`);
    for (const u of us.filter(u => u.k === 'figure')) assert.ok(/^<svg\b[\s\S]*<\/svg>$/.test(u.svg) && u.viewBox && u.caption, `${sec.id}: a figure with its drawing, size and caption`);
    for (const u of us.filter(u => u.k === 'table')) assert.ok(u.head && u.rows.length && u.rows.every(r => r.length), `${sec.id}: a table with its header row`);
    figures += us.filter(u => u.k === 'figure').length; thinks += us.filter(u => u.k === 'think').length;
    keys += us.filter(u => u.k === 'key').reduce((n, u) => n + u.items.length, 0);
    assert.deepEqual(us.filter(u => u.k === 'key').flatMap(u => u.items), /class="bk-key"/.test(sec.html) ? sec.keyPoints : [], `${sec.id}: the key points as the book has them`);
  }
  assert.deepEqual([figures, thinks], [14, 3]);
  assert.ok(keys >= 80, `${keys} key points`);
  // a paragraph that leads into a list goes with it; a heading goes with what is under it
  const left = lectureUnits(BOOK.section('aero.left')), stall = lectureUnits(BOOK.section('aero.stall'));
  assert.ok(left.some(u => u.k === 'list' && u.ordered && /原因は 4 つ/.test(u.lead)), 'aero.left: the causes, led into');
  assert.ok(stall.some(u => u.k === 'list' && u.ordered && /失速からの回復/.test(u.sub)), 'aero.stall: the recovery under its heading');
  assert.equal(lectureUnits(BOOK.section('aero.turn')).filter(u => u.k === 'formula').flatMap(u => u.lines).length, 4, 'two formulas a box, each its own line');
});

test('school: the six classes as cards and a drill — each section its key points, its figure or table on the screen where it is read off it, five scored questions at the end, the class done', () => {
  const ids = CLASS_CHAPTERS.flat();
  // (the redesign: the weather and how a radio works are no longer classes — the weather is lived each morning
  // and in the judgement drill, the radio's workings left to the book and to k6's listening)
  assert.deepEqual(ids, ['aero', 'sys', 'perf', 'radio2', 'radio3', 'radio4', 'radio5', 'law', 'hf']);
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    const d = classDialogs(FL, i), N = d.dialogs.class.nodes, secs = sectionsOf(i), where = `class ${i}`;
    const { errors, warnings } = validateDialogs(d, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists });
    assert.deepEqual(errors, [], where);
    assert.deepEqual(warnings.filter(w => !/flag "qz_\d+" is declared but never read/.test(w)), [], `${where}: only the score's flags (read by scoreOf)`);
    // the start: the day's own (what it is for, naming the afternoon's lesson); no pace to choose any more
    assert.equal(N.hello.text, TALK.CLASS_DAY[i].hello[0]);
    assert.ok(TALK.CLASS_DAY[i].hello.join('').includes(CLASS_FTD[i]), `${where}: the start names the afternoon's ${CLASS_FTD[i]}`);
    assert.ok(!N.pace, `${where}: no pace`);
    const r = run(d, 'class');
    clean(r.lines, where);
    assert.equal(r.views[0].text, TALK.CLASS_DAY[i].hello[0]); assert.equal(r.views[r.views.length - 1].text, TALK.CLASS_DAY[i].bye);
    assert.ok(r.hooks.some(h => h[0] === 'done' && h[1] === 'class'), `${where} done`);
    // the drill: five questions, of the day's chapters (a question's home: the section its answer starts in),
    // scored at the end; answered right, all five
    assert.equal(d.questions.length, 5, where);
    const pool = questionPool(FL);
    for (const x of d.questions) { const p = pool.find(y => y.id === x.id); assert.ok(p && CLASS_CHAPTERS[i].includes(BOOK.section(p.home).chapter.id), `${where}: ${x.id} is of the day's chapters`); }
    assert.equal(new Set(d.questions.map(x => x.id)).size, 5, `${where}: no question twice`);
    assert.deepEqual(r.ctx.quiz, { right: 5, n: 5, pct: 100, pass: true }, where);
    // (the score said, then what the afternoon uses of today, then the goodbye)
    const sc = r.views.findIndex(v => v.node === 'score');
    assert.ok(sc > 0 && r.views[sc].text === '5 / 5 問、100% でした。' && r.views[sc + 1].node === 'preview', `${where}: the score said`);
    assert.ok(r.views.slice(sc + 1, -1).some(v => v.text.includes(CLASS_FTD[i])), `${where}: the afternoon's ${CLASS_FTD[i]} previewed`);
    d.questions.forEach((x, k) => assert.equal(N[`q${k}`].choices.length, x.opts.length));
    // every section, in order: its place kept from its first line; heard at its end, at its key points
    assert.deepEqual(r.hooks.filter(h => h[0] === 'progress').map(h => +h[1]), secs.map((_, j) => j), `${where}: each section's place kept`);
    assert.deepEqual(r.hooks.filter(h => h[0] === 'heard').map(h => h[1]), secs.map(s => `${s.id}|q`), `${where}: each section heard, at its key points`);
    for (const sec of secs) assert.ok(r.views.some(v => v.text.includes(qq(sec.title))), `${sec.id}: its title said`);
    // every ここが大切 point said, as such (tag 'key', introduced — the first on the title's line where the two
    // are said together, so the introduction is looked for within the line, not only at its head)
    for (const sec of secs) for (const u of lectureUnits(sec).filter(x => x.k === 'key')) {
      for (const kp of u.items) for (const l of said(kp)) assert.ok(r.views.some(v => v.tag === 'key' && norm(v.text).includes(norm(l))), `${sec.id}: key point "${l}" said as one`);
      const first = u.items.flatMap(said)[0];
      if (first) assert.ok(r.views.some(v => v.tag === 'key' && TALK.KEY.some(k => norm(v.text).includes(norm(`${k}${first}`)))), `${sec.id}: introduced as such`);
    }
    // the screen: each section's own page opens it, and a unit is paged only to be read off the screen (a figure
    // or a table — a card does not page the prose past the class); every page a real one, in the world's words
    // (nothing is paged but what is read off the screen — a figure, or a table a card's line or a check reads;
    // a section with a figure is always shown, and a paged unit is always a figure or a table)
    for (const s of secs.filter(x => lectureUnits(x).some(u => u.k === 'figure')))
      assert.ok(r.hooks.some(h => h[0] === 'page' && h[1].startsWith(s.id)), `${where}: ${s.id}'s figure shown`);
    for (const [, arg] of r.hooks.filter(h => h[0] === 'page')) {
      const [secId, frag] = arg.split('#');
      if (frag !== undefined) assert.ok(['figure', 'table'].includes(lectureUnits(BOOK.section(secId))[+frag].k), `${where}: ${arg} is a figure or a table`);
    }
    for (const [, arg] of r.hooks.filter(h => h[0] === 'page')) {
      const pg = lecturePage(FL, arg);
      assert.ok(pg, `${where}: page ${arg} is a section's (or one of its units)`);
      clean([JSON.stringify({ ...pg.unit, svg: '' }), pg.summary, ...pg.board.points], `${where} page ${arg}`);
      if (pg.unit) { assert.ok(pg.unit.k === 'figure' || pg.unit.k === 'table', `${where}: page ${arg} read off the screen (a ${pg.unit.k})`); for (const s of [pg.unit.text, ...(pg.unit.sentences || []), ...(pg.unit.items || []).map(it => it.text || it)].filter(Boolean)) assert.ok(!NOT_SPOKEN.test(s), `${where} page ${arg}: "${s}"`); }
    }
    // the choices: the drill's, the checks', the predictions', the review's — an ordinary line has none; a section
    // ends with a line of its own, its other ways on by key
    for (const v of r.views.filter(v => v.choices.length)) assert.ok(v.node === 'pace' || DECISION_NODE.test(v.node) || /^q\d+$/.test(v.node), `${where}: a choice on ${v.node}`);
    secs.forEach((sec, j) => assert.ok(r.views.some(v => /:end$/.test(v.node) && v.text.includes(sec.title.replace(/「/g, '『').replace(/」/g, '』')) && !v.choices.length
      && v.keys.map(k => `${k.key} ${k.text}`).join('|') === `R この節をもう一度|B 教科書でこの節を読む${j < secs.length - 1 ? '|Q ここで休憩する（続きはまた後で）' : ''}`), `${sec.id}: its end, and its keys`));
    // the same seed, the same class
    assert.deepEqual(classDialogs(FL, i), d, `${where}: the same seed, the same class`);
  }
});

test('school: the cards\' radio — the exchanges\' English spoken, with today\'s call sign, the prose of the book left to the book', () => {
  // (the calls of one flight: class 3 — its cards keep the exchanges' rows that answer a question, their English
  // on a line of its own and spoken ('say'), as the class has always said them)
  const r = run(classDialogs(FL, 3), 'class'), says = r.hooks.filter(h => h[0] === 'say');
  assert.ok(says.length > 10, `${says.length} calls spoken`);
  for (const [, en] of says) assert.ok(!/Seven Lima Alpha|7LA/.test(en) && /[A-Za-z]/.test(en) && !JA.test(en), `today's call sign, English only: ${en}`);
  // (the weather's and the radio's workings' chapters are in no class: no section of theirs is heard in one)
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    const heard = run(classDialogs(FL, i), 'class').hooks.filter(h => h[0] === 'heard').map(h => h[1].split('|')[0]);
    assert.ok(!heard.some(id => /^(wx|radio)\./.test(id) && !/^radio[2-5]\./.test(id)), `class ${i}: ${heard.filter(id => /^wx\./.test(id)).join(' ')}`);
  }
});
test('school: every line of every class fits the subtitle box (at most 120 characters: any career, taken up midway too), and reads cleanly', () => {
  assert.equal(LINE_MAX, 120);
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) for (let seed = 1; seed <= 12; seed++) for (const from of [null, 3]) {
    const N = classDialogs(FL, i, { seed, from }).dialogs.class.nodes;
    for (const [id, n] of Object.entries(N)) for (const t of [n.text, ...(n.choices || []).map(c => c.text)]) assert.ok(t.length <= 120, `class ${i} (seed ${seed}) ${id}: ${t.length} characters: ${t}`);
  }
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    const r = run(classDialogs(FL, i), 'class'), where = `class ${i}`;
    for (const l of r.lines) assert.ok(l.length <= 120, `${where}: ${l.length} characters: ${l}`);
    for (const [n, a] of r.hooks) if (n === 'say') assert.ok(a.length <= 120 && !JA.test(a), `${where}: say "${a}"`);
    // (a table read aloud: no heading said twice — 高度計・昇降計は高度計は…; no mark read as it is — は×（, は—; no
    // closing stop doubled — .”。)
    for (const l of r.lines) {
      assert.ok(!/([^\s、。：（）]{2,})は\1は/.test(l), `${where}: a heading said twice: ${l}`);
      assert.ok(!/は[×○△](?![\d.])|は—/.test(l) && !/[.!?][”」』]。$/.test(l), `${where}: ${l}`);
    }
  }
  // (the screen shows the 考えてみよう the class asks, numbers and all)
  assert.match(lecturePage(FL, 'aero.lift#4').unit.q, /1,050 kg/);
  // (the instructor the cadet tells is the flight instructor, not her)
  assert.ok(run(classDialogs(FL, 5), 'class').lines.includes('言い出しにくくても教官に伝えてください。'));
});

test('school: the lecturer\'s notes — her check as a card\'s prediction where a section runs long (unscored, answered at its end); her lines in the textbook\'s box', () => {
  // (the redesign: a card does not read her introduction and notes aloud — they are the textbook's box, under
  // the section, where the cadet reads by choice. Her check stays in the class, as the prediction, on a
  // section whose card would otherwise run long without a choice)
  const sec2 = sectionsOf(0)[2], base = 'c0s2';
  const ask2 = { q: '抗力を減らすために、設計でできることは？', opts: ['翼を細長くする', '翼を短く太くする', '表面を粗くする'], ok: 0, why: '細長い翼は誘導抗力が小さいからです。' };
  const withAsk = (id) => (id === sec2.id ? { ask: ask2 } : testNotes(id));
  const d = classDialogs(FL, 0, { notes: withAsk }), N = d.dialogs.class.nodes;
  assert.deepEqual(validateDialogs(d, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists }).errors, []);
  const r = run(d, 'class'), at = (node) => r.views.findIndex(v => v.node === node);
  // the prediction at the section's start — its choices and わかりません, every one going on, none scored, the
  // choice kept (flag pr); the answer at the section's end, as it was chosen
  const ask = N[`${base}:pr`];
  assert.ok(ask, 'the prediction asked');
  assert.ok(at(`${base}:pr`) > at(base) && at(`${base}:pr`) < at(`${base}:end`), 'asked in its section, before its end');
  assert.ok(TALK.PRED.some(p => ask.text === `${p}${ask2.q}`) || (N[`${base}:pr:pre`] && TALK.PRED.some(p => `${N[`${base}:pr:pre`].text}${ask.text}` === `${p}${ask2.q}`)), ask.text);
  assert.deepEqual(ask.choices.slice(0, -1).map(c => c.text).sort(), [...ask2.opts].sort());
  assert.ok(TALK.DUNNO.includes(ask.choices[ask.choices.length - 1].text), 'わかりません among them, last');
  assert.ok(ask.choices.every(c => c.effects.length === 1 && c.effects[0].set === 'pr'), 'not scored: only the choice kept');
  for (const c of ask.choices) assert.equal(c.effects[0].to, c.text === ask2.opts[ask2.ok] ? 'ok' : TALK.DUNNO.includes(c.text) ? 'dk' : 'ng');
  assert.ok(TALK.PRAISE.includes(N[ask.choices[ask.choices.length - 1].next].text), 'わかりません praised');
  const rv = N[`${base}:rv`];
  assert.deepEqual([rv.if, N[`${base}:rv:ng`].if, N[`${base}:rv:dk`].if], [{ flag: 'pr', is: 'ok' }, { flag: 'pr', is: 'ng' }, undefined]);
  assert.ok(at(`${base}:rv`) > at(`${base}:pr`) || at(`${base}:rv:ng`) > at(`${base}:pr`) || at(`${base}:rv:dk`) > at(`${base}:pr`), 'answered after the card');
  // her lines are not said in the class any more — not her introduction, not her notes
  assert.ok(!r.lines.some(l => l === TEST_NOTES['aero.forces'].intro[0] || TEST_NOTES['aero.forces'].notes.includes(l)), 'her lines left to the book');
  assert.ok(!Object.keys(N).some(k => /:(i|n)\d+$/.test(k)), 'no introduction or note nodes');
  // bad notes are left out rather than breaking the class
  const bad = classDialogs(FL, 0, { notes: (id) => (id === 'aero.forces' ? { intro: 'x', notes: [3, ''], ask: { q: 'Q', opts: ['a', 'a'], ok: 0 } } : null) });
  assert.deepEqual(validateDialogs(bad, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists }).errors, []);
  assert.ok(!bad.dialogs.class.nodes['c0s0:pr']);
  // the textbook overlay: her box under the section, only where she has notes
  const html = lecturerNotesHtml('aero.forces', testNotes);
  assert.match(html, /^<div class="bk-lecturer"><b>講師の補足（ミラー 講師）<\/b><p>この 4 つの力は/);
  assert.equal((html.match(/<p>/g) || []).length, 3);
  assert.equal(lecturerNotesHtml('aero.drag', testNotes), '');
});

test('school: the lecturer\'s notes as written (content/lecture-notes) — one for every section of part 1, every line sayable; a class\'s predictions are her checks, word for word', () => {
  // (a note for every section of part 1 — the two chapters that left the lecture frame too: their pages of the
  // book carry her box as the classes' do)
  const PART1 = ['aero', 'sys', 'perf', 'wx', 'law', 'radio1', 'radio2', 'radio3', 'radio4', 'radio5', 'hf'];
  const ids = PART1.flatMap(id => BOOK.chapters.find(c => c.id === id).sections.map(s => s.id));
  assert.deepEqual(Object.keys(NOTES).sort(), [...ids].sort(), 'a note for every section of part 1, and none for another');
  // (the lines as index.js sets them: 2–120 characters, the world's own words, no program words, no markup)
  const sayable = (t, where) => {
    assert.ok(typeof t === 'string' && t.length >= 2 && t.length <= 120, `${where}: 2–120 characters (${t && t.length}): ${t}`);
    clean([t], where); assert.ok(!/教材|[{}<>]/.test(t) && !NOT_SPOKEN.test(t), `${where}: ${t}`);
    assert.ok(!/TODO|FIXME|XXX|TBD/.test(t), `${where}: ${t}`);
  };
  for (const id of ids) {
    const n = NOTES[id], a = n.ask;
    assert.ok((n.intro || []).length <= 2 && n.notes.length >= 2 && n.notes.length <= 8, `${id}: intro 0–2 lines, notes 2–8`);
    [...(n.intro || []), ...n.notes].forEach((t, k) => sayable(textOf(t), `${id} line ${k}`));
    // (a line about the section's figure or table names it: 'fig:k' / 'tab:k', one the section has)
    const us = lectureUnits(BOOK.section(id));
    for (const t of [...(n.intro || []), ...n.notes].filter(x => typeof x !== 'string')) {
      assert.deepEqual(Object.keys(t).sort(), ['page', 'text'], `${id}: ${t.text}`);
      assert.ok(noteUnit(us, t.page) !== null, `${id}: ${t.page} is one of the section's (${t.text})`);
    }
    if (!a) continue;
    assert.ok(`ひとつ確認します。${a.q}`.length <= LINE_MAX, `${id}: the check's question fits the subtitle box`);
    assert.ok(a.opts.length >= 3 && a.opts.length <= 4 && new Set(a.opts).size === a.opts.length && Number.isInteger(a.ok) && a.ok >= 0 && a.ok < a.opts.length, `${id}: the check's choices`);
    for (const t of [a.q, a.why, ...a.opts]) sayable(t, `${id} check`);
    // (the textbook's box under the section: her introduction and notes)
    assert.equal((lecturerNotesHtml(id).match(/<p>/g) || []).length, (n.intro || []).length + n.notes.length, `${id}: the textbook's box`);
  }
  // the classes as the game builds them (with these notes): where a prediction is asked, it is her check of
  // that section — its question and its choices, its answer kept for the section's end
  let preds = 0;
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    const d = classDialogs(FL, i), N = d.dialogs.class.nodes;
    clean(run(d, 'class').lines, `class ${i} with the notes`);
    for (const [node, n] of Object.entries(N)) {
      const m = /^c(\d+)s(\d+):pr$/.exec(node); if (!m) continue;
      const all = classQuestions(FL, i, {}).all, x = all.find(y => y.k === +m[1] && y.j === +m[2]), a = NOTES[x.sec.id] && NOTES[x.sec.id].ask;
      assert.ok(a, `${node}: a prediction of ${x.sec.id}, which has her check`);
      assert.ok(n.text.endsWith(a.q) || (N[`${m[1]}:pr:pre`] && `${N[`${m[1]}:pr:pre`].text}${n.text}`.endsWith(a.q)), `${node}: her question`);
      assert.deepEqual(n.choices.slice(0, -1).map(c => c.text).sort(), [...a.opts].sort(), `${node}: her choices`);
      preds++;
    }
  }
  assert.ok(preds > 0, `${preds} predictions in the six classes`);
});
test('school: a class\'s choices — the section again, the section in the textbook, a break, and taken up from its place', () => {
  // at the first section's end (a line of its own, its other ways on by key): the textbook (B: hook 'book', then back
  // to the end), then the section again (R), then on
  const seen = new Set();
  const press = (v) => { if (v.node !== 'c0s0:end') return null; for (const k of ['B', 'R']) if (!seen.has(k)) { seen.add(k); return k; } return null; };
  const r = run(classDialogs(FL, 0), 'class', { press });
  assert.deepEqual(r.hooks.filter(h => h[0] === 'book').map(h => h[1]), ['aero.forces']);
  assert.deepEqual(r.hooks.filter(h => h[0] === 'progress').map(h => +h[1]).slice(0, 3), [0, 0, 1], 'the section read again, then the next');
  assert.ok(r.hooks.some(h => h[0] === 'done' && h[1] === 'class'));
  // a break at the first section's end: the talk ends there, not done, its place the next section's; taken up from it
  const b = run(classDialogs(FL, 0), 'class', { press: (v) => (v.node === 'c0s0:end' ? 'Q' : null) });
  assert.deepEqual(b.hooks.filter(h => h[0] === 'progress').map(h => +h[1]), [0, 1], 'the break keeps the next section as the place');
  assert.ok(!b.hooks.some(h => h[0] === 'done'), 'a break is not the class done');
  assert.equal(b.views[b.views.length - 1].text, 'OK. ここで一度区切りましょう。続きは「揚力はどうやって生まれるか」からです。また声をかけてください。');
  // taken up from its place: no choice of how to go on — the class goes on from there, its greeting a resumed one,
  // and no score is said for a drill the class did not begin at its start
  const d = classDialogs(FL, 0, { from: 3 });
  assert.deepEqual(validateDialogs(d, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists }).errors, []);
  assert.ok(!d.dialogs.class.nodes.pace, 'no pace to choose');
  const on = run(d, 'class');
  assert.equal(on.views[on.views.findIndex(v => v.node === 'resume')].text, 'では、続きから始めます。');
  assert.deepEqual(on.hooks.filter(h => h[0] === 'progress').map(h => +h[1]), [3, 4, 5, 6, 7, 8, 9]);
  assert.ok(on.hooks.some(h => h[0] === 'done' && h[1] === 'class'));
  assert.ok(!on.views.some(v => v.node === 'score'), 'no score said');
  assert.ok(!on.views.some(v => /^rv/.test(v.node)), '(a class taken up midway goes on: no review first)');
  // (from a later chapter's first section: its chapter's introduction first, then the chapter, done)
  const d1 = classDialogs(FL, 1, { from: 7 }), on1 = run(d1, 'class'), nodes1 = on1.views.map(v => v.node);
  assert.equal(on1.views[nodes1.indexOf('resume')].text, 'では、第 3 章から続けます。');
  assert.ok(nodes1.indexOf('c1') > nodes1.indexOf('resume'), 'its chapter introduced');
  assert.match(on1.views[nodes1.indexOf('c1')].text, /第 3 章は?「性能と重量・重心」/);
  assert.ok(!nodes1.includes('score') && nodes1.includes('bye'));
  assert.deepEqual(on1.hooks.filter(h => h[0] === 'progress').map(h => +h[1]), [7, 8, 9, 10]);
  assert.ok(on1.hooks.some(h => h[0] === 'done' && h[1] === 'class'));
  // (no place, the first section's, or one past the end: from the start, and no resume)
  for (const from of [null, 0, 99]) assert.ok(!classDialogs(FL, 0, { from }).dialogs.class.nodes.resume, `from ${from}: from the start`);
  // (a pace passed by a caller from before the redesign: ignored, the class the same)
  assert.deepEqual(classDialogs(FL, 0, { pace: 'quick' }), classDialogs(FL, 0), 'a pace named is no pace at all now');
});
test('school: the training device — k1 told through, k4 begun (its chair flight: test/k4.test.mjs), k2/k3/k5/k6 ten questions each: passed when right, not when wrong', () => {
  assert.deepEqual(Object.keys(FTD_TITLES), ['k1', 'k2', 'k3', 'k4', 'k5', 'k6']);
  for (const k of Object.keys(FTD_TITLES)) {
    const d = ftdDialogs(FL, k, { seed: 4 });
    const { errors } = validateDialogs(d, { sampleCtx: { quiz: { right: 8, n: 10, pct: 80, pass: true } } });
    assert.deepEqual(errors, [], k);
    const good = run(d, 'ftd');
    clean(good.lines, k);
    // (k4's talk only begins the flight — the first time, the script hidden; it is passed by the run's debrief)
    if (k === 'k4') {
      assert.deepEqual(good.hooks.filter(h => ['chair', 'done'].includes(h[0])).map(h => h.slice(0, 2)), [['chair', '2']], 'k4 begins the run, the script hidden');
      const after = ftdDialogs(FL, k, { seed: 4, k4: { passed: true } });
      assert.deepEqual(validateDialogs(after).errors, [], 'k4 after the pass');
      const listen = run(after, 'ftd', { pick: (v) => (v.node === 'k4:stage' ? v.choices.findIndex(c => /^教科書の例を通しで聞く/.test(c.text)) : null) });
      clean(listen.lines, 'k4 listen');
      assert.ok(listen.hooks.filter(h => h[0] === 'say').length > 10 && listen.lines.some(l => /配置の違う空港/.test(l)), 'after the pass, the textbook\'s flight to listen to, said to be another airport\'s');
      continue;
    }
    assert.ok(good.hooks.some(h => h[0] === 'done' && h[1] === 'pass'), `${k} passed`);
    if (k === 'k1') assert.ok(good.hooks.filter(h => h[0] === 'pfd').length >= 7, 'the parts of the PFD on the screen');
    if (['k2', 'k3', 'k5', 'k6'].includes(k)) {
      assert.equal(d.questions.length, 10); assert.deepEqual(good.ctx.quiz, { right: 10, n: 10, pct: 100, pass: true });
      const bad = run(d, 'ftd', { right: false });
      assert.ok(bad.hooks.some(h => h[0] === 'done' && h[1] === 'fail')); assert.equal(bad.ctx.quiz.right, 0);
      for (const x of d.questions) { assert.equal(x.opts.length >= 3, true); assert.ok(x.ok >= 0 && x.ok < x.opts.length, `${k}: the right answer is among the choices`); }
    }
    if (k === 'k6') assert.ok(d.questions.every(x => x.say && /Archer Seven Three Eight Sierra Yankee|Archer 8SY/.test(x.say) || x.say), 'the English to hear');
  }
  // k2's pictures: what is asked can be read off them
  // (taken again: its own pictures, each with its question — the screen draws the question's picture)
  for (const attempt of [0, 1, 2]) {
    const pics = pfdPictures(4 + attempt * 101), d2 = ftdDialogs(FL, 'k2', { seed: 4, attempt });
    d2.questions.forEach((x, i) => {
      assert.equal(x.pfd, i); assert.deepEqual(x.pic, pics[i]);
      const right = x.opts[x.ok], kind = x.id.slice(4);
      if (kind === 'ias') assert.equal(right, `${x.pic.ias} kt`);
      if (kind === 'alt') assert.equal(right, `${x.pic.alt.toLocaleString('en-US')} ft`);
      if (kind === 'hdg') assert.equal(right, `${String(x.pic.hdg).padStart(3, '0')}°`);
    });
  }
});

test('school: a device lesson with nothing of it taught yet (a record from the order before) says so, and does not break', () => {
  for (const k of ['k3', 'k5', 'k6']) {
    const d = ftdDialogs(FL, k, { heard: new Set() }), N = d.dialogs.ftd.nodes;
    assert.equal(d.questions.length, 0); assert.match(N.intro.text, /まだ授業で話していません/); assert.equal(N.intro.end, true);
    assert.deepEqual(validateDialogs(d).errors, [], k);
  }
});

test('school: the textbook as it opens (sectionHtml): every section with today\'s call sign, never FLIGHT LAB\'s', () => {
  let n = 0;
  for (const c of BOOK.chapters) for (const { id } of c.sections) { const sec = BOOK.section(id), h = sectionHtml(sec); assert.doesNotMatch(h, /Seven Lima Alpha|7LA/, sec.id); if (/Archer 8SY|Archer Seven Three Eight Sierra Yankee/.test(h)) n++; }
  assert.ok(n >= 10, `${n} sections with the call sign`);
});

test('school: the written tests — from FLIGHT LAB\'s banks, as many questions as set, 80% to pass', () => {
  // (thirty set for every test, and every test's banks now hold at least that many, so all draw the full thirty;
  // a test whose banks held fewer would give all they hold)
  const held = (id) => EXAMS[id].banks.reduce((n, b) => n + (FL.quiz.BANKS.find(x => x.id === b) || { qs: [] }).qs.length, 0);
  for (const id of Object.keys(EXAMS)) {
    const d = examDialogs(FL, id, { seed: 2 });
    assert.equal(d.questions.length, Math.min(EXAMS[id].n, held(id)), id);
    const { errors } = validateDialogs(d, { sampleCtx: { quiz: { right: 8, n: 10, pct: 80, pass: true, weakText: '' } } });
    assert.deepEqual(errors, []);
    const good = run(d, 'exam'); clean(good.lines, id);
    assert.equal(good.ctx.quiz.pct, 100); assert.ok(good.hooks.some(h => h[0] === 'done' && h[1] === 'pass'));
    assert.ok(run(d, 'exam', { right: false }).hooks.some(h => h[0] === 'done' && h[1] === 'fail'));
    // the same seed, the same test; another, another
    assert.deepEqual(examDialogs(FL, id, { seed: 2 }).questions, d.questions);
    assert.notDeepEqual(examDialogs(FL, id, { seed: 3 }).questions, d.questions);
  }
});

test('school: the device lessons k3, k5 and k6 never ask about the textbook\'s other airport (its west ramp) nor say FLIGHT LAB\'s call sign — any seed, any try', () => {
  for (const k of ['k3', 'k5', 'k6']) for (let seed = 1; seed <= 20; seed++) for (const attempt of [0, 1, 2]) {
    const d = ftdDialogs(FL, k, { seed, attempt }), all = JSON.stringify([d.questions, d.dialogs]);
    // (FLIGHT LAB's call sign whole or shortened — "Seven Lima Alpha", "Archer Lima Alpha", "7LA"; other aircraft and a
    // drill's own registration may say "Two Lima Alpha" or "Seven Lima Yankee")
    const bad = /.{0,40}(西のエプロン|[Ww]est ramp|Seven Lima Alpha|(Archer|Seminole) Lima Alpha|7LA).{0,40}/.exec(all);
    assert.ok(!bad, `${k} seed ${seed}/${attempt}: ${bad && bad[0]}`);
  }
});

test('school, as the review\'s second pass found it: a resumed class greets as a resumed one; no space before a particle after Japanese, nor after a row\'s は before Japanese', () => {
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    for (const seed of [1, 2, 3, 4, 5]) {
      const N = classDialogs(FL, i, { seed }).dialogs.class.nodes;
      for (const [id, n] of Object.entries(N)) {
        const t = n.text || '';
        assert.ok(!(/：[^：。]{0,30}は (?=[ぁ-ゖァ-ヺ一-龥])/.test(t) && !/答えは|正解は/.test(t)), `class ${i} ${id}: a row's は spaced before Japanese — ${t}`);
        assert.doesNotMatch(t, /[ぁ-ゖァ-ヺ一-龥）」] (でした|になっています|です)。/, `class ${i} ${id}: a particle spaced`);
      }
    }
    // (taken up again from its second section: not the first day's greeting)
    const all = classDialogs(FL, i, {}).dialogs.class.nodes, d = classDialogs(FL, i, { from: 1 }).dialogs.class.nodes;
    assert.notEqual(d.hello.text, all.hello.text, `class ${i}: resumed, its own greeting`);
    assert.match(d.hello.text, /続き/);
  }
  // (the textbook's page on call signs as the class says it: today's shortened, not "3 文字なのでそのまま")
  const cs = sectionHtml(BOOK.section('comm.callsign'));
  assert.doesNotMatch(cs, /3 文字なのでそのまま/); assert.match(cs, /Archer Eight Sierra Yankee/);
});
test('school: nav, instr and multi — each bank holds twenty, the draw is thirty different questions, the floor counts on a real draw', () => {
  for (const id of ['nav', 'instr', 'multi']) for (const b of EXAMS[id].banks)
    assert.ok((FL.quiz.BANKS.find(x => x.id === b) || { qs: [] }).qs.length >= 20, `${id}: ${b} holds at least twenty`);
  for (const id of ['nav', 'instr', 'multi']) {
    const d = examDialogs(FL, id, { seed: 7 });
    assert.equal(d.questions.length, EXAMS[id].n, `${id}: the full thirty drawn`);
    assert.equal(new Set(d.questions.map(x => x.id)).size, d.questions.length, `${id}: no question twice`);
    for (const b of EXAMS[id].banks) assert.equal(d.questions.filter(x => x.id.startsWith(`${b}#`)).length, 15, `${id}: fifteen of ${b}`);
  }
  // (the floor on a real draw: every nav question right and 8 of 15 weather right — the weather bank is named weak)
  const d = examDialogs(FL, 'nav', { seed: 7 }), seen = {}, flags = {};
  d.questions.forEach((x, k) => { const b = x.id.split('#')[0]; seen[b] = (seen[b] || 0) + 1; flags[`qz_${k}`] = b === 'q_nav' || seen[b] <= 8; });
  const s = examScoreOf({ flags }, d.questions, { q_nav: '航法', q_wx: '航空気象' });
  assert.equal(s.banks.q_wx.n, 15); assert.ok(s.banks.q_wx.pct < 60, `weather at ${s.banks.q_wx.pct}%`);
  assert.deepEqual(s.weak, ['q_wx']); assert.equal(s.pass, false);
  const all = {}; d.questions.forEach((_, k) => { all[`qz_${k}`] = 1; });
  assert.equal(examScoreOf({ flags: all }, d.questions).pass, true, 'all right: a pass');
});

test('school: an exam\'s bank floor (§4.3) — over the line as a whole is not enough with a weak bank', () => {
  const qs = [...Array(5)].map((_, k) => ({ id: `q_wx#${k}` })).concat([...Array(25)].map((_, k) => ({ id: `q_law#${k}` })));
  const stateWith = (rightWx, rightLaw) => { const flags = {}; qs.forEach((q, k) => { flags[`qz_${k}`] = q.id.startsWith('q_wx') ? +q.id.split('#')[1] < rightWx : +q.id.split('#')[1] < rightLaw; }); return { flags }; };
  const titles = { q_wx: '航空気象', q_law: '規則と空域' };
  // 24 / 30 = 80% overall, but the weather bank at 40%: no pass, and the bank is named for the review
  const over = examScoreOf(stateWith(2, 22), qs, titles);
  assert.equal(over.pct, 80); assert.equal(over.pass, false, '80% overall, weather at 40%: the floor fails it');
  assert.deepEqual(over.weak, ['q_wx']); assert.match(over.weakText, /航空気象（40%）/);
  // every bank at the floor or over, and the whole over the line: a pass
  const ok = examScoreOf(stateWith(4, 20), qs, titles);
  assert.equal(ok.pct, 80); assert.equal(ok.pass, true); assert.deepEqual(ok.weak, []); assert.equal(ok.weakText, '');
  // a bank exactly at 60% is not weak
  const edge = examScoreOf(stateWith(3, 25), qs, titles);
  assert.equal(edge.banks.q_wx.pct, 60); assert.deepEqual(edge.weak, []); assert.equal(edge.pass, true);
});

test('school: a test over the line with a weak bank ends in a fail — and the career records that fail (§4.3)', () => {
  const d = examDialogs(FL, 'written1', { seed: 2 }), qs = d.questions;
  assert.equal(qs.length, 30);
  const weakBank = String(qs[0].id).split('#')[0];
  // run it as the game does (main.js's quizEnd): the score is the test's own — examScoreOf, bank floor and all —
  // answering everything right except the one bank, which is answered wrong throughout
  const st = createDialogState(), cx = { quiz: null }, hooks = [];
  const titles = Object.fromEntries(FL.quiz.BANKS.map(b => [b.id, b.title]));
  const r = createRunner({ data: d, state: st, ctx: cx, hooks: { onHook: (n, a) => { hooks.push([n, a]); if (n === 'quizEnd') cx.quiz = examScoreOf(st, qs, titles); } } });
  r.start('exam');
  for (let k = 0; k < 400 && r.running; k++) {
    const v = r.view();
    if (v.choices.length) {
      const qi = /^q(\d+)$/.exec(v.node), x = qi ? qs[+qi[1]] : null;
      if (x) { const rightText = x.opts[x.ok], weak = String(x.id).split('#')[0] === weakBank; const i = v.choices.findIndex(c => weak ? c.text !== rightText : c.text === rightText); r.choose(i >= 0 ? i : 0); }
      else r.choose(0);
    } else r.next();
  }
  assert.equal(r.running, false, 'the test ends');
  const quiz = cx.quiz;
  assert.ok(quiz && quiz.pct >= 80, `over the line as a whole: ${quiz && quiz.pct}%`);
  assert.deepEqual(quiz.weak, [weakBank]); assert.equal(quiz.pass, false, 'the floor fails it');
  assert.ok(hooks.some(h => h[0] === 'done' && h[1] === 'fail'), 'the dialog ends in a fail');
  assert.ok(!hooks.some(h => h[0] === 'done' && h[1] === 'pass'), 'and never in a pass');
  // and the career, told the same score the way main.js tells it (career.exam(id, pct, pass)), records the fail:
  // the percent kept as the best, the try counted, no pass — where the percent alone would have passed it
  const C = createCareer({ seed: 23 }), rec = C.exam('written1', quiz.pct, quiz.pass);
  assert.equal(rec.pass, false); assert.equal(rec.best, quiz.pct); assert.equal(rec.tries, 1);
});

test('school: the judgement drill (§4.4) — ten weathers, and the right choice is each weather\'s own decision', () => {
  const KINDS = ['good', 'amFog', 'pmStorm', 'crosswind', 'storm', 'amLowCloud', 'pmWind', 'lowCloud'];
  const label = Object.fromEntries(DRILL_CHOICES);
  for (const [seed, day, attempt] of [[7, 5, 0], [7, 5, 1], [3, 12, 0], [9, 30, 2]]) {
    const d = drillDialogs(FL, { seed, day }, { attempt });
    assert.equal(d.questions.length, 10, 'ten questions');
    assert.deepEqual(validateDialogs(d, { sampleCtx: { quiz: { right: 8, n: 10, pct: 80, pass: true } } }).errors, []);
    d.questions.forEach((q, i) => {
      assert.equal(q.opts.length, 4); assert.equal(new Set(q.opts).size, 4, 'four different choices');
      assert.ok(q.why && q.why.length > 5, 'a reason is said');
      // the weather this question shows is one of the day's forced kinds: find it by its three reports,
      // and the marked answer must be that weather's decision
      const shown = KINDS.map(k => weatherFor(seed, day * 40 + i * 3 + attempt * 11, { force: k }))
        .find(w => q.q.includes(w.metar.am) && q.q.includes(w.metar.pm) && q.q.includes(w.taf));
      assert.ok(shown, `question ${i}: its weather is a real one`);
      assert.equal(q.opts[q.ok], label[shown.decision], `question ${i}: the answer is the weather's decision (${shown.decision})`);
    });
    // the same day and try again: the same drill
    assert.deepEqual(drillDialogs(FL, { seed, day }, { attempt }).questions, d.questions);
  }
});
