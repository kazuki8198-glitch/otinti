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
import { classDialogs, ftdDialogs, examDialogs, drillDialogs, DRILL_CHOICES, scoreOf, examScoreOf, CLASS_CHAPTERS, FTD_TITLES, pfdPictures, lectureLines, lecturePage, lecturerNotesHtml, pathOf, LINE_MAX, noteUnit, needSections, DECISION_NODE, sectionHtml } from '../src/content/school.js';
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
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) for (const sec of sectionsOf(i)) {
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

test('school: six classes read the textbook\'s part 1 in full — every sentence in order, the key points as such, every page real, two questions after each chapter, the class done', () => {
  const ids = CLASS_CHAPTERS.flat();
  // (in the order that puts each afternoon's training device lesson after the class that teaches it: career.js)
  assert.deepEqual(ids, ['aero', 'sys', 'perf', 'radio1', 'radio2', 'radio3', 'radio4', 'wx', 'radio5', 'law', 'hf']);
  let figures = 0;
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    const d = classDialogs(FL, i), N = d.dialogs.class.nodes, secs = sectionsOf(i), where = `class ${i}`;
    const { errors, warnings } = validateDialogs(d, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists });
    assert.deepEqual(errors, [], where);
    assert.deepEqual(warnings.filter(w => !/flag "qz_\d+" is declared but never read/.test(w)), [], `${where}: only the score's flags (read by scoreOf)`);
    // the start: the day's own (what it is for, naming the afternoon's lesson), then how to go through it — the three
    // paces, each with its time (none a "review": the first time is not one; the pace for today's training says when it
    // is the key points alone)
    assert.equal(N.hello.text, TALK.CLASS_DAY[i].hello[0]);
    assert.ok(TALK.CLASS_DAY[i].hello.join('').includes(CLASS_FTD[i]), `${where}: the start names the afternoon's ${CLASS_FTD[i]}`);
    assert.deepEqual(N.pace.choices.map(c => c.text.replace(/約 \d+ 分/, '約 N 分')), [needSections(FL, i).size ? '今日の訓練に要るところ（約 N 分）' : '今日の訓練に要るところ（約 N 分・今日は要点だけと同じ）', 'じっくり（教科書を全部、約 N 分）', '要点だけ（約 N 分）'], where);
    const r = run(d, 'class');
    clean(r.lines, where);
    assert.equal(r.views[0].text, TALK.CLASS_DAY[i].hello[0]); assert.equal(r.views[r.views.length - 1].text, TALK.CLASS_DAY[i].bye);
    assert.ok(r.hooks.some(h => h[0] === 'done' && h[1] === 'class'), `${where} done`);
    // the questions: two a chapter, ids aligned with questions[k], scored at the end
    assert.equal(d.questions.length, 2 * CLASS_CHAPTERS[i].length, where);
    assert.deepEqual(r.ctx.quiz, { right: d.questions.length, n: d.questions.length, pct: 100, pass: true }, where);
    // (the score said, then what the afternoon uses of today, then the goodbye)
    const sc = r.views.findIndex(v => v.node === 'score');
    assert.ok(sc > 0 && r.views[sc].text === `${d.questions.length} / ${d.questions.length} 問、100% でした。` && r.views[sc + 1].node === 'preview', `${where}: the score said`);
    assert.ok(r.views.slice(sc + 1, -1).some(v => v.text.includes(CLASS_FTD[i])), `${where}: the afternoon's ${CLASS_FTD[i]} previewed`);
    d.questions.forEach((x, k) => assert.equal(N[`q${k}`].choices.length, x.opts.length));
    assert.equal(new Set(d.questions.map(x => x.q)).size, d.questions.length, `${where}: chapters sharing a bank get different questions`);
    // every section, in order: its progress and its page; every page a real one
    assert.deepEqual(r.hooks.filter(h => h[0] === 'progress').map(h => +h[1]), secs.map((_, j) => j), `${where}: each section's place kept`);
    assert.deepEqual(r.hooks.filter(h => h[0] === 'page' && !h[1].includes('#')).map(h => h[1]), secs.map(s => s.id), `${where}: each section's first page`);
    for (const [, arg] of r.hooks.filter(h => h[0] === 'page')) {
      const pg = lecturePage(FL, arg);
      assert.ok(pg, `${where}: page ${arg} is a section's (or one of its units)`);
      // (what the screen and the whiteboard show is in the world's words too: today's call sign, nothing about the program)
      clean([JSON.stringify({ ...pg.unit, svg: '' }), pg.summary, ...pg.board.points], `${where} page ${arg}`);
      if (pg.unit) for (const s of [pg.unit.text, ...(pg.unit.sentences || []), ...(pg.unit.items || []).map(it => it.text || it)].filter(Boolean)) assert.ok(!NOT_SPOKEN.test(s), `${where} page ${arg}: "${s}"`);
    }
    for (const n of Object.values(N)) for (const e of [n.hook, ...(n.effects || []).map(x => ({ name: x.hook, arg: x.arg }))]) if (e && e.name === 'page') assert.ok(lecturePage(FL, e.arg), `${where}: page ${e.arg}`);
    // (each figure once on its own page; her notes on a figure put it up again while she reads it)
    figures += new Set(r.hooks.filter(h => h[0] === 'page' && lecturePage(FL, h[1]).unit && lecturePage(FL, h[1]).unit.k === 'figure').map(h => h[1])).size;
    // every sentence of the book's prose said, in order (unless it names FLIGHT LAB's own controls: NOT_SPOKEN)
    const all = norm(r.views.map(v => v.text).join(''));
    let at = 0, skipped = 0, checked = 0;
    for (const sec of secs) for (const s of proseOf(sec)) {
      // (the line that leads into a list or a table may get a です: compared without its last 。)
      const want = norm(lectureLines(s).join('')).replace(/。$/, '');
      if (!want) { assert.ok(NOT_SPOKEN.test(s) || /^[\s（(].*[）)]$/.test(s) || !s.trim(), `${sec.id}: "${s}" is left out only when it cannot be said`); skipped++; continue; }
      const k = all.indexOf(want, at);
      assert.ok(k >= 0, `${sec.id}: "${s}" said (in order)`); at = k + want.length; checked++;
    }
    assert.ok(skipped <= 3 && checked >= 10, `${where}: ${checked} sentences said in order, ${skipped} left out`);
    // the rest of the book, in order too: the headings, cautions, formulas, figure captions, the source, every cell of every
    // table (the lecture makes endings polite and reads ○ △ × in words, so a cell is compared by its stem) and every
    // exchange's English (spoken)
    let at2 = 0, checked2 = 0;
    const said2 = (w0, why) => { const w = norm(w0), k = all.indexOf(w, at2); assert.ok(k >= 0, `${where}: ${why} said (in order): "${w0}"`); at2 = k + w.length; checked2++; };
    const stem = (c) => String(c).trim().replace(/。$/, '').replace(/^[—–]\s*（(.+)）$/, '$1').replace(/^[○△×](?![\d.])\s*/, '').split('。')[0]
      .replace(/[（(][^）)]*[）)]$/, '').replace(/[ぁ-ゖ]+$/, '').replace(/（.*$/, '').slice(0, 6);
    for (const sec of secs) for (const u of lectureUnits(sec)) {
      // (a heading in one of the class's ways of saying it: its title in quotes)
      if (u.sub) said2(qq(u.sub), `${sec.id} heading`);
      if (u.k === 'caution') said2(`注意です。${u.label ? u.label + '：' : ''}${lectureLines(u.text)[0]}`, `${sec.id} caution`);
      if (u.k === 'formula' && u.lines.some(l => /[＝=≒]/.test(l))) u.lines.forEach((l, j) => said2(`${j ? 'もう一つ、' : '式で書くと、'}${l}。`, `${sec.id} formula`));
      if (u.k === 'figure') { const l = lectureLines(String(u.caption).replace(/^図[：:]\s*/, '')); if (l.length) said2(l[0], `${sec.id} caption`); }
      if (u.k === 'source') said2(`出典：${lectureLines(u.text)[0]}`, `${sec.id} source`);
      if (u.k === 'table') {
        // (announced, or asked about first: a question read off the table — its rows read all the same)
        for (const row of u.rows) for (const c of u.radio ? [row[1]] : row) {
          const v = u.radio ? String(c).split(/[.,!?]/)[0].replace(/Seven Lima Alpha|7LA/, '') : stem(c);
          if (v && !/^[—–-]$/.test(v)) said2(v, `${sec.id} table cell`);
        }
      }
    }
    assert.ok(checked2 >= 40, `${where}: ${checked2} more of the book said in order`);
    // every ここが大切 point said, as such (tag 'key', introduced)
    for (const sec of secs) for (const u of lectureUnits(sec).filter(x => x.k === 'key')) {
      for (const kp of u.items) for (const l of said(kp)) assert.ok(r.views.some(v => v.tag === 'key' && norm(v.text).includes(norm(l))), `${sec.id}: key point "${l}" said as one`);
      const first = u.items.flatMap(said)[0];
      if (first) assert.ok(r.views.some(v => v.tag === 'key' && TALK.KEY.some(k => v.text === `${k}${first}`)), `${sec.id}: introduced as such`);
    }
    // every 考えてみよう asked (a choice) before its answer; thinking first, the answers to choose from
    for (const sec of secs) for (const u of lectureUnits(sec).filter(x => x.k === 'think')) {
      // (a setting said as a supposition: …上げたいとします。操作は？)
      const q = r.views.findIndex(v => v.tag === 'think' && v.choices.length === 2 && norm(v.text).includes(norm(lectureLines(u.q).join('').replace(/たいです。(?=.)/g, 'たいとします。'))));
      const a = r.views.findIndex(v => TALK.THINK_ANSWER.some(p => v.text.startsWith(p)) && norm(v.text).includes(norm(lectureLines(u.a)[0])));
      assert.ok(q >= 0 && a > q, `${sec.id}: "${u.q}" asked, then answered`);
      assert.deepEqual(r.views[q].choices.map(c => c.text), ['考えてみます', '答えを聞きます']);
      const tc = r.views[q + 1];
      assert.ok(tc && /:tc$/.test(tc.node) && tc.choices.length === 3 && tc.choices.some(c => c.text === TALK.THINK_CHOICES[sec.id].opts[0]), `${sec.id}: thinking first, the answers to choose from`);
    }
    // the choices: the pace, the questions (the chapters', the screen's, the checks, the review), 考えてみよう; no
    // ordinary line has one — a section ends with a line of its own, its other ways on by key
    for (const v of r.views.filter(v => v.choices.length)) assert.ok(v.node === 'pace' || DECISION_NODE.test(v.node) || /:u\d+(:\d+)?$/.test(v.node), `${where}: a choice on ${v.node}`);
    // (a title in quotes: its own quotes become 『』)
    // (a break offered at every section's end but the class's last)
    secs.forEach((sec, j) => assert.ok(r.views.some(v => /:end$/.test(v.node) && v.text.includes(sec.title.replace(/「/g, '『').replace(/」/g, '』')) && !v.choices.length
      && v.keys.map(k => `${k.key} ${k.text}`).join('|') === `R この節をもう一度|B 教科書でこの節を読む${j < secs.length - 1 ? '|Q ここで休憩する（続きはまた後で）' : ''}`), `${sec.id}: its end, and its keys`));
    // the same seed, the same class
    assert.deepEqual(classDialogs(FL, i), d, `${where}: the same seed, the same class`);
  }
  assert.equal(figures, 14, 'every figure of part 1 on the screen');
});

test('school: a class\'s tables — every row read (short rows joined), the marks in words, the radio\'s English on a line of its own and spoken, then its meaning', () => {
  // (aero.turn's table: a question read off it first — not scored — then its rows)
  const r = run(classDialogs(FL, 0), 'class'), i = r.views.findIndex(v => v.text.startsWith('10°')) - 1;
  const tq = r.views.findIndex(v => /^c0s5:u\d+:tq$/.test(v.node));
  assert.ok(i > 0 && tq > 0 && tq < i && r.views[tq].choices.length === 3, 'aero.turn\'s table asked about');
  assert.ok(TALK.TABLE_ASK.some(f => r.views[tq].text.includes(f('「X」', '「Y」').split('「X」')[0])) && !d0q(r.views[tq]), 'read off the table (no score)');
  assert.deepEqual(r.views.slice(i + 1, i + 7).map(v => v.text.split('：')[0]), ['10°', '20°', '30°', '45°', '60°', '75°'], 'its six rows read');
  assert.match(r.views[i + 1].text, /失速速度の増加は×1\.01（\+1%）/, '(×1.01 is a number, not a mark)');
  // (aero.lift: ○ △ × in words; a cell's second sentence keeps the next heading off it)
  const lift = r.views.filter(v => /^(ρ（ロー）|V|S|CL)：/.test(v.text)).map(v => v.text);
  assert.deepEqual(lift.map(t => t.replace(/^.*操縦士が変えられるかは/, '')), ['できません（場所と天気で決まる）。', 'できます（パワーと姿勢）。', '少しだけできます（フラップで少し増える）。', 'できます（操縦桿・エレベーター）。']);
  assert.match(lift[0], /^ρ（ロー）：意味は空気の密度、高い所/);
  // the alphabet: all 26 letters, in order, a few to a line
  const r4 = run(classDialogs(FL, 2), 'class'), b = r4.views.findIndex(v => /^A：言い方は Alfa、/.test(v.text));
  assert.ok(b > 0, 'the alphabet read');
  const abc = r4.views.slice(b, b + 26).map(v => v.text).join('');
  assert.deepEqual([...abc.matchAll(/(?:^|。)([A-Z])：言い方は ([A-Za-z-]+)、/g)].map(m => m[1]).join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'every letter (Whiskey and Yankee too; T is the letter, not the trim)');
  assert.ok(r4.views.slice(b, b + 26).filter(v => /^[A-Z]：/.test(v.text)).length < 20, 'a few rows to a line');
  assert.ok(!r4.lines.some(l => /残りは画面の表で/.test(l)), 'no table left to the screen');
  // the radio's exchanges: every row, its English alone on a line (spoken), its meaning on the next (the calls of a
  // flight: class 3; the airports without a tower: class 4)
  const d5 = classDialogs(FL, 3), r5 = run(d5, 'class'), says = r5.hooks.filter(h => h[0] === 'say');
  assert.ok(says.length > 60, `${says.length} calls spoken`);
  for (const [, en] of says) assert.ok(!/Seven Lima Alpha|7LA/.test(en) && /[A-Za-z]/.test(en) && !JA.test(en), `today's call sign, English only: ${en}`);
  const g = r5.views.findIndex(v => v.text === 'Ground：“Archer 8SY, runway three six, taxi via Alpha, hold short of taxiway Charlie.”');
  assert.ok(g > 0 && r5.views[g + 1].text === '意味：滑走路 36 へ、誘導路 A 経由で地上走行。誘導路 C の手前で止まれ。', 'the call, then what it means');
  assert.ok(r5.hooks.some(h => h[0] === 'say' && h[1] === 'Archer 8SY, runway three six, taxi via Alpha, hold short of taxiway Charlie.' && h[2] === g), 'spoken with its line');
  for (const sec of ['comm.readback', 'comm.tower', 'comm.radar', 'comm.arrive', 'comm.option']) {
    const t = lectureUnits(BOOK.section(sec)).find(u => u.k === 'table' && u.radio);
    for (const row of t.rows.filter(x => /[A-Za-z]/.test(x[1]) && !JA.test(x[1]))) {
      const head = row[1].replace(/Archer (Seven Lima Alpha|7LA)/, '').split(/[,.]/)[0].trim();
      assert.ok(r5.views.some((v, k) => /^(?:[^“]*：)?“[^”]*”$/.test(v.text) && v.text.includes(head) && r5.hooks.some(h => h[0] === 'say' && h[2] === k)), `${sec}: “${row[1]}” on its own line, spoken`);
    }
  }
  // (the ATIS: a few sentences a line, each line spoken)
  const atis = r5.views.findIndex(v => v.text.startsWith('ATIS：“LAB information Bravo.'));
  assert.ok(atis > 0 && r5.views[atis + 3].text === '“Advise on initial contact you have information Bravo.”' && r5.views[atis + 4].text.startsWith('意味：LAB の情報 B。'));
  for (let k = atis; k < atis + 4; k++) assert.ok(r5.hooks.some(h => h[0] === 'say' && h[2] === k), `ATIS line ${k - atis} spoken`);
  // an ordinary table's whole calls are spoken with their line (a pattern with blanks is not); short rows go together
  const r6 = run(classDialogs(FL, 4), 'class'), ctaf = r6.views.findIndex(v => v.text === '“Strawn traffic, Apache Two Two Five Zulu, entering downwind runway one seven, full stop, Strawn.”');
  assert.ok(ctaf > 0 && r6.hooks.some(h => h[0] === 'say' && h[1] === 'Strawn traffic, Apache Two Two Five Zulu, entering downwind runway one seven, full stop, Strawn.' && h[2] === ctaf), 'comm.ctaf: the call spoken');
  assert.ok(![...r5.hooks, ...r6.hooks].some(h => h[0] === 'say' && /\(|方向/.test(h[1])), 'a pattern with blanks is not spoken');
  const kb = r5.views.findIndex(v => v.text === '記号：B。風：340/08。視程・雲：10・FEW035。温度・露点：31/22。');
  assert.ok(kb > 0 && r5.views[kb + 1].text === '高度計：30.01 → すぐ合わせる。滑走路：36。', 'comm.atis\'s kneeboard: six short rows in two lines');
});

test('school: every line of every class fits the subtitle box (at most 120 characters: じっくり and 要点だけ, any career, taken up midway too), and reads cleanly', () => {
  assert.equal(LINE_MAX, 120);
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) for (let seed = 1; seed <= 12; seed++) for (const from of [null, 3]) {
    const N = classDialogs(FL, i, { seed, from }).dialogs.class.nodes;
    for (const [id, n] of Object.entries(N)) for (const t of [n.text, ...(n.choices || []).map(c => c.text)]) assert.ok(t.length <= 120, `class ${i} (seed ${seed}) ${id}: ${t.length} characters: ${t}`);
  }
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) for (const pace of ['full', 'quick', 'need']) {
    const r = run(classDialogs(FL, i), 'class', { pace }), where = `class ${i} ${pace}`;
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

test('school: the lecturer\'s notes — her introduction after the title, her notes after the book (tagged), her check unscored; the textbook shows them', () => {
  const d = classDialogs(FL, 0, { notes: testNotes }), N = d.dialogs.class.nodes;
  assert.deepEqual(validateDialogs(d, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists }).errors, []);
  const r = run(d, 'class'), texts = r.views.map(v => v.text), at = (node) => r.views.findIndex(v => v.node === node);
  const title = texts.indexOf('最初は「飛行機に働く 4 つの力」です。');
  // (the introduction after the title — the prediction before it or after it: the section's order)
  assert.ok(title >= 0 && at('c0s0:i0') > title && at('c0s0:i0') <= title + 3 && texts[at('c0s0:i0')] === TEST_NOTES['aero.forces'].intro[0], 'the introduction just after the title');
  assert.equal(texts[at('c0s0:u0')], '空を飛んでいる飛行機には、いつも次の 4 つの力が働いています。', 'then the book');
  assert.ok(at('c0s0:u0') > at('c0s0:i0') && at('c0s0:u0') > at('c0s0:pr'), 'the book after the introduction and the prediction');
  const n0 = texts.indexOf(TEST_NOTES['aero.forces'].notes[0]), n1 = texts.indexOf(TEST_NOTES['aero.forces'].notes[1]);
  assert.ok(n0 > texts.findIndex(t => /パワーを上げます/.test(t) && TALK.THINK_ANSWER.some(p => t.startsWith(p))) && n1 > n0 && n1 <= n0 + 2, 'her notes after the book\'s own text');
  assert.ok(r.views[n0].tag === 'note' && r.views[n1].tag === 'note');
  assert.ok(r.views.some(v => v.tag === 'note' && v.text === TEST_NOTES['aero.lift'].notes[0]), 'and in the next section');
  // the check: the prediction at the section's start — its choices and わかりません, every one going on, none scored,
  // the choice kept (flag pr); the answer at the end, as it was chosen: right, wrong, わかりません
  const ask = N['c0s0:pr'], x = TEST_NOTES['aero.forces'].ask, right = x.opts[x.ok];
  assert.ok(TALK.PRED.some(p => ask.text === `${p}${x.q}`) || (N['c0s0:pr:pre'] && TALK.PRED.some(p => `${N['c0s0:pr:pre'].text}${ask.text}` === `${p}${x.q}`)), ask.text);
  assert.deepEqual(ask.choices.slice(0, -1).map(c => c.text).sort(), [...x.opts].sort());
  assert.ok(TALK.DUNNO.includes(ask.choices[ask.choices.length - 1].text), 'わかりません among them, last');
  assert.ok(ask.choices.every(c => c.effects.length === 1 && c.effects[0].set === 'pr'), 'not scored: only the choice kept');
  for (const c of ask.choices) assert.equal(c.effects[0].to, c.text === right ? 'ok' : TALK.DUNNO.includes(c.text) ? 'dk' : 'ng');
  assert.ok(TALK.PRAISE.includes(N[ask.choices[ask.choices.length - 1].next].text), 'わかりません praised');
  const rv = N['c0s0:rv'];
  assert.deepEqual([rv.if, N['c0s0:rv:ng'].if, N['c0s0:rv:dk'].if], [{ flag: 'pr', is: 'ok' }, { flag: 'pr', is: 'ng' }, undefined]);
  for (const [n, list] of [['c0s0:rv', TALK.REVEAL_OK], ['c0s0:rv:ng', TALK.REVEAL_NG], ['c0s0:rv:dk', TALK.REVEAL_DK]]) assert.ok(list.some(f => N[n].text === `${f('「揚力＝重力、推力＝抗力」')}つり合っていれば加速しません。`), `${n}: ${N[n].text}`);
  assert.ok(at('c0s0:rv') > at('c0s0:u0') || at('c0s0:rv:ng') > at('c0s0:u0') || at('c0s0:rv:dk') > at('c0s0:u0'), 'answered after the book');
  // a section without notes is read all the same (no prediction); the class is longer with them
  assert.ok(!N['c0s2:pr'] && N['c0s2'] && N['c0s2:end']);
  assert.ok(Object.keys(N).length > Object.keys(classDialogs(FL, 0, { notes: () => null }).dialogs.class.nodes).length);
  // bad notes are left out rather than breaking the class
  const bad = classDialogs(FL, 0, { notes: (id) => (id === 'aero.forces' ? { intro: 'x', notes: [3, ''], ask: { q: 'Q', opts: ['a', 'a'], ok: 0 } } : null) });
  assert.deepEqual(validateDialogs(bad, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists }).errors, []);
  assert.ok(!bad.dialogs.class.nodes['c0s0:pr'] && !bad.dialogs.class.nodes['c0s0:i0'] && !bad.dialogs.class.nodes['c0s0:n0']);
  // the textbook overlay: her box under the section, only where she has notes
  const html = lecturerNotesHtml('aero.forces', testNotes);
  assert.match(html, /^<div class="bk-lecturer"><b>講師の補足（ミラー 講師）<\/b><p>この 4 つの力は/);
  assert.equal((html.match(/<p>/g) || []).length, 3);
  assert.equal(lecturerNotesHtml('aero.drag', testNotes), '');
});

test('school: the lecturer\'s notes as written (content/lecture-notes) — one for every section taught, every line sayable, every line said in its place, every check asked', () => {
  const ids = CLASS_CHAPTERS.flatMap((_, i) => sectionsOf(i).map(sec => sec.id));
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
  }
  // the classes as the game builds them (with these notes): each section's introduction right after its title, its
  // notes after the book's text (tagged), its check asked before the section's end — on the path that always goes on
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    const d = classDialogs(FL, i), N = d.dialogs.class.nodes, r = run(d, 'class'), at = (node) => r.views.findIndex(v => v.node === node);
    clean(r.lines, `class ${i} with the notes`);
    CLASS_CHAPTERS[i].forEach((ch, k) => BOOK.chapters.find(c => c.id === ch).sections.forEach((s, j) => {
      const base = `c${k}s${j}`, n = NOTES[s.id], intro = n.intro || [];
      assert.ok(N[base].effects.some(e => e.hook === 'page' && e.arg === s.id), `${base} is ${s.id}`);
      // (the book's first view: its first line, or the question on its first unit; the introduction after the title,
      // the prediction — which may come first — between them)
      const u0 = r.views.findIndex(v => v.node.startsWith(`${base}:u`));
      const pre = at(`${base}:pr`) > at(base) && at(`${base}:pr`) < u0 && (at(`${base}:i0`) < 0 || at(`${base}:pr`) < at(`${base}:i0`)) ? r.views.slice(at(base) + 1).findIndex(v => !/:pr(:|$)/.test(v.node)) : 0;
      intro.forEach((t, m) => { assert.equal(N[`${base}:i${m}`].text, textOf(t), `${s.id}: intro ${m}`); assert.equal(at(`${base}:i${m}`), at(base) + 1 + pre + m, `${s.id}: intro ${m} said after the title`); });
      let last = u0;
      assert.ok(last > at(base), `${s.id}: the book after the introduction`);
      const us = lectureUnits(BOOK.section(s.id));
      n.notes.forEach((t, m) => {
        const v = r.views[at(`${base}:n${m}`)];
        assert.ok(v && v.text === textOf(t) && v.tag === 'note' && at(`${base}:n${m}`) > last, `${s.id}: note ${m} said, tagged, after the book`); last = Math.max(last, at(`${base}:n${m}`));
        // (one about a figure or a table: that page on the screen while it is said)
        const pg = typeof t === 'string' ? null : `${s.id}#${noteUnit(us, t.page)}`;
        assert.deepEqual((N[`${base}:n${m}`].effects || []).filter(e => e.hook === 'page').map(e => e.arg), pg ? [pg] : [], `${s.id}: note ${m}'s page`);
      });
      // (her lines add to the book rather than say its lines again: no sentence of hers of 8 characters or more shares
      // 80% of its pairs of characters with a line the class read from the book in the section)
      const book = r.views.filter(v => v.node.startsWith(`${base}:u`) && !/:(tq|fq|rq|tc|ck)(:|$)/.test(v.node)).map(v => v.text);
      for (const t of [...intro, ...n.notes].map(textOf)) for (const sen of t.split(/(?<=[。！？])/).filter(x => norm(x).length >= 8)) {
        const o = Math.max(0, ...book.map(b => overlap(sen, b)));
        assert.ok(o < 0.8, `${s.id}: "${sen}" says a line of the book again (${o.toFixed(2)})`);
      }
      // her check: the prediction before the book, its answer after it (at the notes' end or before them)
      if (n.ask) {
        const ask = N[`${base}:pr`], v = r.views[at(`${base}:pr`)], said = (v && v.text) || '', pre = N[`${base}:pr:pre`];
        // (asked as one line with its choices; or — 桐生 answering first — the question said, his answer, then the
        // lecturer's turn to the cadet with the choices)
        const kiryu = N[`${base}:pr:k`];
        const asked = kiryu ? TALK.PRED.some(p => r.views.slice(at(`${base}:pr:q`), at(`${base}:pr:k`)).map(x => x.text).join('') === `${p}${n.ask.q}`) && TALK.PRED_YOU.includes(said) && at(`${base}:pr:k`) < at(`${base}:pr`) && kiryu.speaker === 'kiryu'
          : TALK.PRED.some(p => `${pre ? r.views[at(`${base}:pr:pre`)].text : ''}${said}` === `${p}${n.ask.q}`);
        assert.ok(v && at(`${base}:pr`) < u0 && asked, `${s.id}: the prediction asked before the book`);
        assert.deepEqual(ask.choices.slice(0, -1).map(c => c.text).sort(), [...n.ask.opts].sort());
        for (const c of ask.choices) assert.ok(/:pr:[ad]$/.test(c.next) && c.effects[0].to === (c.text === n.ask.opts[n.ask.ok] ? 'ok' : TALK.DUNNO.includes(c.text) ? 'dk' : 'ng'), `${s.id}: ${c.text}`);
        const rv = Math.max(at(`${base}:rv`), at(`${base}:rv:ng`), at(`${base}:rv:dk`));
        assert.ok(rv > u0 && (r.views[rv].text.endsWith(n.ask.why.slice(-12)) || fit0(r, rv, n.ask.why)), `${s.id}: answered after the book, with why`);
      } else assert.ok(!N[`${base}:pr`]);
      assert.ok(at(`${base}:end`) > last, `${s.id}: then its end`);
      // (the textbook's box under the section: her introduction and notes)
      assert.equal((lecturerNotesHtml(s.id).match(/<p>/g) || []).length, intro.length + n.notes.length, `${s.id}: the textbook's box`);
    }));
  }
});

test('school: a class\'s choices — the section again, the section in the textbook, a break, 要点だけ, 続きから', () => {
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
  assert.equal(classDialogs(FL, 0, { from: 1 }).dialogs.class.nodes.pace.choices[0].text, '続きから（第 1 章「揚力はどうやって生まれるか」から）');
  // 要点だけ: each section's title and key points with its figure, the chapters' questions, done
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    const d = classDialogs(FL, i), q = run(d, 'class', { pace: 'quick' }), full = run(d, 'class');
    clean(q.lines, `class ${i} 要点だけ`);
    assert.ok(q.hooks.some(h => h[0] === 'done' && h[1] === 'class'), `class ${i}: 要点だけ done`);
    assert.equal(q.ctx.quiz.right, d.questions.length);
    assert.ok(q.views.length < full.views.length / 2, `class ${i}: 要点だけ is short (${q.views.length} lines, ${full.views.length} in full)`);
    for (const sec of sectionsOf(i)) assert.ok(q.views.some(v => v.text.includes(`「${sec.title}」`)), `${sec.id}: its title`);
    assert.ok(!q.hooks.some(h => h[0] === 'progress'), '(a review keeps no place)');
    for (const [, arg] of q.hooks.filter(h => h[0] === 'page')) assert.ok(lecturePage(FL, arg));
  }
  // 続きから: the place a class left midway reached
  const d = classDialogs(FL, 0, { from: 3 }), P = d.dialogs.class.nodes.pace;
  assert.deepEqual(P.choices.map(c => c.text.replace(/約 \d+ 分/, '約 N 分')), ['続きから（第 1 章「抗力・揚抗比・最良滑空速度」から）', '最初から：今日の訓練に要るところ（約 N 分）', '最初から：じっくり（教科書を全部、約 N 分）', '最初から：要点だけ（約 N 分）']);
  assert.deepEqual(validateDialogs(d, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists }).errors, []);
  const on = run(d, 'class');
  assert.deepEqual(on.hooks.filter(h => h[0] === 'progress').map(h => +h[1]), [3, 4, 5, 6, 7, 8, 9]);
  assert.ok(on.hooks.some(h => h[0] === 'done' && h[1] === 'class'));
  assert.deepEqual(run(d, 'class', { pick: (v) => (v.node === 'pace' ? paceIndex(v, 'full') : null) }).hooks.filter(h => h[0] === 'progress').map(h => +h[1]), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], '最初から');
  assert.ok(run(d, 'class', { pick: (v) => (v.node === 'pace' ? paceIndex(v, 'quick') : null) }).hooks.some(h => h[0] === 'done' && h[1] === 'class'), '要点だけ');
  // (from a later chapter's first section — a break at the chapter before's last: that chapter's questions first, then
  // the chapter, done; a class taken up midway does not say a score for questions it did not ask)
  const d1 = classDialogs(FL, 1, { from: 7 }), on1 = run(d1, 'class'), nodes1 = on1.views.map(v => v.node), rs = nodes1.indexOf('resume');
  assert.equal(on1.views[rs].text, 'では、第 2 章の確認から続けます。');
  assert.deepEqual(nodes1.slice(rs + 1, rs + 3), ['c0:check', 'q0']);
  assert.ok(nodes1.indexOf('q1') > 0 && nodes1.indexOf('q1') < nodes1.indexOf('c1'), 'its two questions before the next chapter');
  assert.match(on1.views[nodes1.indexOf('c1')].text, /第 3 章は?「性能と重量・重心」/);
  assert.ok(!nodes1.includes('score') && nodes1.includes('bye'));
  assert.ok(!nodes1.some(n => /^rv/.test(n)), '(a class taken up midway goes on: no review first)');
  assert.equal(on.views[on.views.findIndex(v => v.node === 'resume')].text, 'では、続きから始めます。');
  assert.deepEqual(on1.hooks.filter(h => h[0] === 'progress').map(h => +h[1]), [7, 8, 9, 10]);
  assert.ok(on1.hooks.some(h => h[0] === 'done' && h[1] === 'class'));
  // (no place, the first section's, or one past the end: the usual choice)
  for (const from of [null, 0, 99]) assert.equal(classDialogs(FL, 0, { from }).dialogs.class.nodes.pace.choices.length, 3);
  // pace given: no choice
  for (const pace of ['full', 'quick', 'need']) {
    const dp = classDialogs(FL, 0, { pace }), rp = run(dp, 'class');
    assert.deepEqual(validateDialogs(dp, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists }).errors, []);
    assert.ok(!dp.dialogs.class.nodes.pace && !rp.views.some(v => v.choices.length && !DECISION_NODE.test(v.node) && !/:u\d+(:\d+)?$/.test(v.node)), `${pace}: no choice of pace (only the questions, the predictions, the checks, the 考えてみよう)`);
    assert.equal(rp.hooks.some(h => h[0] === 'progress'), pace === 'full' || (pace === 'need' && needSections(FL, 0).size > 0), `${pace}: a place kept where sections are read in full`);
    assert.ok(rp.hooks.some(h => h[0] === 'done' && h[1] === 'class'));
  }
  // (at the quick pace the first section is its key points: the full one skipped)
  const qp = pathOf(classDialogs(FL, 0, { pace: 'quick' }).dialogs.class.nodes, 'hello', { quick: true });
  assert.ok(qp.includes('r0s0') && !qp.includes('c0s0') && qp.indexOf('r0s0') < 6, qp.slice(0, 6).join(' '));
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
      assert.ok(listen.hooks.filter(h => h[0] === 'say').length > 10 && listen.lines.some(l => /別の空港/.test(l)), 'after the pass, the textbook\'s flight to listen to, said to be another airport\'s');
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
