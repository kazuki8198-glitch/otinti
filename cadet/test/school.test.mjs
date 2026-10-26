// CADET — ground school without a screen (content/school.js): the six classes of chapter 1, the training device's six
// lessons (k1–k6) and the two written tests are valid dialog data from FLIGHT LAB's textbook, radio chapter and question
// banks; a quiz answered right passes, answered wrong fails (the score from the quiz's own flags); every line in the
// world's own words. The classes are lectures: every sentence of the textbook's part 1 said in order, ここが大切 said as
// such, 考えてみよう asked before it is answered, every page on the screen a real one, the lecturer's notes said where
// there are any (a test gives its own, to check how they are said; another checks content/lecture-notes as written:
// a note for every section, every line sayable and said in its place), 要点だけ and 続きから too.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classDialogs, ftdDialogs, examDialogs, scoreOf, CLASS_CHAPTERS, FTD_TITLES, pfdPictures, lectureLines, lecturePage, lecturerNotesHtml, pathOf } from '../src/content/school.js';
import { units, lectureUnits, proseOf } from '../src/content/lecture-units.js';
import { gameBook } from '../src/content/book.js';
import { NOT_SPOKEN } from '../src/content/dialog/instructor.js';
import { NOTES } from '../src/content/lecture-notes/index.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { EXAMS } from '../src/career/career.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js', 'radio.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL;
const BOOK = gameBook(FL);
const REAL = /(?<![A-Za-z])ANA(?![A-Za-z])|ＡＮＡ|all\s*nippon|全日空|acron|garmin|Seven Lima Alpha|7LA/i;
const APP = /ゲーム|ソフト|プレイヤー|FLIGHT LAB|シミュレータ|キーボード|メニュー/;
const QUIZ = { quiz: { right: 1, n: 2, pct: 50, pass: false } };

// run a dialog to its end: right answers (or wrong ones), the score worked out at 'quizEnd' as the game does; other
// choices: the first, or pick(view, step) → an index (null: the first). At most a few steps a node (computed from the data)
function run(data, id, { right = true, pick = null } = {}) {
  const st = createDialogState(), ctx = { quiz: null }, hooks = [], lines = [], views = [];
  const qs = data.questions || [], max = 3 * Object.values(data.dialogs).reduce((n, d) => n + Object.keys(d.nodes).length, 0) + 50;
  const r = createRunner({ data, state: st, ctx, hooks: { onHook: (n, a) => { hooks.push([n, a, views.length]); if (n === 'quizEnd') ctx.quiz = scoreOf(st, +a); } } });
  r.start(id);
  for (let k = 0; k < max && r.running; k++) {
    const v = r.view(); lines.push(v.text, ...v.choices.map(c => c.text)); views.push(v);
    if (v.choices.length) {
      const qi = /^q(\d+)$/.exec(v.node), x = qi ? (qs[+qi[1]] || null) : null;
      const okText = x ? x.opts[x.ok] : null, i = okText != null ? v.choices.findIndex(c => c.text === okText) : (pick && pick(v, k)) ?? 0;
      r.choose(right || okText == null ? i : (i + 1) % v.choices.length);
    } else r.next();
  }
  assert.equal(r.running, false, `${id}: the talk ends within ${max} steps`);
  return { st, ctx, hooks, lines, views };
}
const clean = (lines, where) => { for (const l of lines) { assert.ok(!REAL.test(l), `${where}: ${l}`); assert.ok(!APP.test(l), `${where} talks about the game: ${l}`); assert.ok(!/\{[a-z]+:/.test(l), `${where}: a reference left: ${l}`); } };
const norm = (s) => String(s).replace(/\s+/g, '');
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
  assert.deepEqual(ids, ['aero', 'sys', 'perf', 'wx', 'law', 'hf', 'radio1', 'radio2', 'radio3', 'radio4', 'radio5']);
  let figures = 0;
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    const d = classDialogs(FL, i), N = d.dialogs.class.nodes, secs = sectionsOf(i), where = `class ${i}`;
    const { errors, warnings } = validateDialogs(d, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists });
    assert.deepEqual(errors, [], where);
    assert.deepEqual(warnings.filter(w => !/flag "qz_\d+" is declared but never read/.test(w)), [], `${where}: only the score's flags (read by scoreOf)`);
    // the start: Good morning, then how to go through it (index 0 reads it all)
    assert.match(N.hello.text, /^Good morning/);
    assert.deepEqual(N.pace.choices.map(c => c.text.replace(/約 \d+ 分/, '約 N 分')), ['じっくり（教科書を全部、約 N 分）', '要点だけ（復習）'], where);
    const r = run(d, 'class');
    clean(r.lines, where);
    assert.match(r.views[0].text, /^Good morning/); assert.match(r.views[r.views.length - 1].text, /See you tomorrow/);
    assert.ok(r.hooks.some(h => h[0] === 'done' && h[1] === 'class'), `${where} done`);
    // the questions: two a chapter, ids aligned with questions[k], scored at the end
    assert.equal(d.questions.length, 2 * CLASS_CHAPTERS[i].length, where);
    assert.deepEqual(r.ctx.quiz, { right: d.questions.length, n: d.questions.length, pct: 100, pass: true }, where);
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
    figures += r.hooks.filter(h => h[0] === 'page' && lecturePage(FL, h[1]).unit && lecturePage(FL, h[1]).unit.k === 'figure').length;
    // every sentence of the book's prose said, in order (unless it names FLIGHT LAB's own controls: NOT_SPOKEN)
    const all = norm(r.views.map(v => v.text).join(''));
    let at = 0, skipped = 0, checked = 0;
    for (const sec of secs) for (const s of proseOf(sec)) {
      const want = norm(lectureLines(s).join(''));
      if (!want) { assert.ok(NOT_SPOKEN.test(s) || /^[\s（(].*[）)]$/.test(s) || !s.trim(), `${sec.id}: "${s}" is left out only when it cannot be said`); skipped++; continue; }
      const k = all.indexOf(want, at);
      assert.ok(k >= 0, `${sec.id}: "${s}" said (in order)`); at = k + want.length; checked++;
    }
    assert.ok(skipped <= 3 && checked >= 10, `${where}: ${checked} sentences said in order, ${skipped} left out`);
    // every ここが大切 point said, as such (tag 'key', introduced)
    for (const sec of secs) for (const u of lectureUnits(sec).filter(x => x.k === 'key')) {
      for (const kp of u.items) for (const l of said(kp)) assert.ok(r.views.some(v => v.tag === 'key' && norm(v.text).includes(norm(l))), `${sec.id}: key point "${l}" said as one`);
      const first = u.items.flatMap(said)[0];
      if (first) assert.ok(r.views.some(v => v.tag === 'key' && v.text === `ここが大切です。${first}`), `${sec.id}: introduced as such`);
    }
    // every 考えてみよう asked (a choice) before its answer
    for (const sec of secs) for (const u of lectureUnits(sec).filter(x => x.k === 'think')) {
      const q = r.views.findIndex(v => v.tag === 'think' && v.choices.length === 2 && norm(v.text).includes(norm(lectureLines(u.q).join(''))));
      const a = r.views.findIndex(v => /^答えです。/.test(v.text) && norm(v.text).includes(norm(lectureLines(u.a)[0])));
      assert.ok(q >= 0 && a > q, `${sec.id}: "${u.q}" asked, then answered`);
      assert.deepEqual(r.views[q].choices.map(c => c.text), ['考えてみます', '答えを聞きます']);
    }
    // a section ends with the choice (on; the section again; the textbook), and no ordinary line has one
    for (const v of r.views.filter(v => v.choices.length)) assert.ok(/^(pace|q\d+|.*:end|.*:ask|.*:u\d+(:\d+)?)$/.test(v.node), `${where}: a choice on ${v.node}`);
    // (a title in quotes: its own quotes become 『』)
    // (a break offered at every section's end but the class's last)
    secs.forEach((sec, j) => assert.ok(r.views.some(v => /:end$/.test(v.node) && v.text.includes(sec.title.replace(/「/g, '『').replace(/」/g, '』'))
      && v.choices.map(c => c.text).join('|') === `次へ|この節をもう一度|教科書でこの節を読む${j < secs.length - 1 ? '|ここで休憩する（続きはまた後で）' : ''}`), `${sec.id}: the choice at its end`));
    // the same seed, the same class
    assert.deepEqual(classDialogs(FL, i), d, `${where}: the same seed, the same class`);
  }
  assert.equal(figures, 14, 'every figure of part 1 on the screen');
});

test('school: a class\'s tables — up to 6 rows read, a longer one its first 3 and the rest on the screen; the radio\'s English spoken', () => {
  const r = run(classDialogs(FL, 0), 'class'), i = r.views.findIndex((v, k) => v.text === '画面の表を見てください。' && r.views[k + 1].text.startsWith('10°'));
  assert.ok(i > 0, 'aero.turn\'s table announced');
  assert.deepEqual(r.views.slice(i + 1, i + 7).map(v => v.text.split('：')[0]), ['10°', '20°', '30°', '45°', '60°', '75°'], 'its six rows read');
  const r4 = run(classDialogs(FL, 4), 'class'), b = r4.views.findIndex(v => /26 行あります。最初の 3 行を読みます。/.test(v.text));
  assert.ok(b > 0, 'the alphabet: 26 rows');
  assert.deepEqual(r4.views.slice(b + 1, b + 5).map(v => v.text.split('：')[0]), ['A', 'B', 'C', '残りは画面の表で確認してください。']);
  const r5 = run(classDialogs(FL, 5), 'class'), says = r5.hooks.filter(h => h[0] === 'say');
  assert.ok(says.length > 20, `${says.length} calls spoken`);
  for (const [, en] of says) assert.ok(!/Seven Lima Alpha|7LA/.test(en) && /[A-Za-z]/.test(en), `today's call sign: ${en}`);
  assert.ok(r5.views.some(v => /^Ground：“Archer 8SY, runway three six, taxi via Alpha, hold short of taxiway Charlie\.” ── /.test(v.text)), 'the call, then what it means');
});

test('school: the lecturer\'s notes — her introduction after the title, her notes after the book (tagged), her check unscored; the textbook shows them', () => {
  const d = classDialogs(FL, 0, { notes: testNotes }), N = d.dialogs.class.nodes;
  assert.deepEqual(validateDialogs(d, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists }).errors, []);
  const r = run(d, 'class'), texts = r.views.map(v => v.text);
  const title = texts.indexOf('最初は「飛行機に働く 4 つの力」です。');
  assert.equal(texts[title + 1], TEST_NOTES['aero.forces'].intro[0], 'the introduction right after the title');
  assert.equal(texts[title + 2], '空を飛んでいる飛行機には、いつも次の 4 つの力が働いています。', 'then the book');
  const n0 = texts.indexOf(TEST_NOTES['aero.forces'].notes[0]), n1 = texts.indexOf(TEST_NOTES['aero.forces'].notes[1]);
  assert.ok(n0 > texts.findIndex(t => /^答えです。パワーを上げます/.test(t)) && n1 === n0 + 1, 'her notes after the book\'s own text');
  assert.ok(r.views[n0].tag === 'note' && r.views[n1].tag === 'note');
  assert.ok(r.views.some(v => v.tag === 'note' && v.text === TEST_NOTES['aero.lift'].notes[0]), 'and in the next section');
  // the check: every choice goes on; the right one → That's right. + why, a wrong one → the right answer + why
  const ask = N['c0s0:ask'];
  assert.match(ask.text, /^ひとつ確認します。水平直線飛行で/);
  assert.deepEqual([...ask.choices.map(c => c.text)].sort(), [...TEST_NOTES['aero.forces'].ask.opts].sort());
  assert.ok(!ask.choices.some(c => c.effects), 'not scored');
  assert.equal(N['c0s0:ask:ok'].text, 'That\'s right. つり合っていれば加速しません。');
  assert.equal(N['c0s0:ask:ng'].text, '正しくは「揚力＝重力、推力＝抗力」です。つり合っていれば加速しません。');
  for (const c of ask.choices) assert.equal(c.next, c.text === '揚力＝重力、推力＝抗力' ? 'c0s0:ask:ok' : 'c0s0:ask:ng');
  assert.equal(N['c0s0:ask:ok'].next, 'c0s0:end'); assert.equal(N['c0s0:ask:ng'].next, 'c0s0:end');
  // a section without notes is read all the same; the class is longer with them
  assert.ok(!N['c0s2:ask'] && N['c0s2'] && N['c0s2:end']);
  assert.ok(Object.keys(N).length > Object.keys(classDialogs(FL, 0, { notes: () => null }).dialogs.class.nodes).length);
  // bad notes are left out rather than breaking the class
  const bad = classDialogs(FL, 0, { notes: (id) => (id === 'aero.forces' ? { intro: 'x', notes: [3, ''], ask: { q: 'Q', opts: ['a', 'a'], ok: 0 } } : null) });
  assert.deepEqual(validateDialogs(bad, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists }).errors, []);
  assert.ok(!bad.dialogs.class.nodes['c0s0:ask'] && !bad.dialogs.class.nodes['c0s0:i0'] && !bad.dialogs.class.nodes['c0s0:n0']);
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
    [...(n.intro || []), ...n.notes].forEach((t, k) => sayable(t, `${id} line ${k}`));
    if (!a) continue;
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
      intro.forEach((t, m) => { assert.equal(N[`${base}:i${m}`].text, t, `${s.id}: intro ${m}`); assert.equal(at(`${base}:i${m}`), at(base) + 1 + m, `${s.id}: intro ${m} said after the title`); });
      let last = at(`${base}:u0`);
      assert.ok(last > at(base), `${s.id}: the book after the introduction`);
      n.notes.forEach((t, m) => {
        const v = r.views[at(`${base}:n${m}`)];
        assert.ok(v && v.text === t && v.tag === 'note' && at(`${base}:n${m}`) > last, `${s.id}: note ${m} said, tagged, after the book`); last = at(`${base}:n${m}`);
      });
      if (n.ask) {
        const ask = N[`${base}:ask`], v = r.views[at(`${base}:ask`)];
        assert.ok(v && v.text === `ひとつ確認します。${n.ask.q}` && at(`${base}:ask`) > last, `${s.id}: the check asked after the notes`);
        assert.deepEqual([...ask.choices.map(c => c.text)].sort(), [...n.ask.opts].sort());
        for (const c of ask.choices) assert.equal(c.next, c.text === n.ask.opts[n.ask.ok] ? `${base}:ask:ok` : `${base}:ask:ng`, `${s.id}: ${c.text}`);
        assert.equal(N[`${base}:ask:ok`].text, `That's right. ${n.ask.why}`);
      } else assert.ok(!N[`${base}:ask`]);
      assert.ok(at(`${base}:end`) > last, `${s.id}: then its end`);
      // (the textbook's box under the section: her introduction and notes)
      assert.equal((lecturerNotesHtml(s.id).match(/<p>/g) || []).length, intro.length + n.notes.length, `${s.id}: the textbook's box`);
    }));
  }
});

test('school: a class\'s choices — the section again, the section in the textbook, a break, 要点だけ, 続きから', () => {
  // at the first section's end: the textbook (hook 'book', then back to the choice), then the section again, then on
  const seen = new Set();
  const pick = (v) => { if (v.node !== 'c0s0:end') return null; for (const k of [2, 1]) if (!seen.has(k)) { seen.add(k); return k; } return 0; };
  const r = run(classDialogs(FL, 0), 'class', { pick });
  assert.deepEqual(r.hooks.filter(h => h[0] === 'book').map(h => h[1]), ['aero.forces']);
  assert.deepEqual(r.hooks.filter(h => h[0] === 'progress').map(h => +h[1]).slice(0, 3), [0, 0, 1], 'the section read again, then the next');
  assert.ok(r.hooks.some(h => h[0] === 'done' && h[1] === 'class'));
  // a break at the first section's end: the talk ends there, not done, its place the next section's; taken up from it
  const b = run(classDialogs(FL, 0), 'class', { pick: (v) => (v.node === 'c0s0:end' ? 3 : null) });
  assert.deepEqual(b.hooks.filter(h => h[0] === 'progress').map(h => +h[1]), [0, 1], 'the break keeps the next section as the place');
  assert.ok(!b.hooks.some(h => h[0] === 'done'), 'a break is not the class done');
  assert.equal(b.views[b.views.length - 1].text, 'OK. ここで一度区切りましょう。続きは「揚力はどうやって生まれるか」からです。また声をかけてください。');
  assert.equal(classDialogs(FL, 0, { from: 1 }).dialogs.class.nodes.pace.choices[0].text, '続きから（第 1 章「揚力はどうやって生まれるか」から）');
  // 要点だけ: each section's title and key points with its figure, the chapters' questions, done
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    const d = classDialogs(FL, i), q = run(d, 'class', { pick: (v) => (v.node === 'pace' ? 1 : null) }), full = run(d, 'class');
    clean(q.lines, `class ${i} 要点だけ`);
    assert.ok(q.hooks.some(h => h[0] === 'done' && h[1] === 'class'), `class ${i}: 要点だけ done`);
    assert.equal(q.ctx.quiz.right, d.questions.length);
    assert.ok(q.views.length < full.views.length / 2, `class ${i}: 要点だけ is short (${q.views.length} lines, ${full.views.length} in full)`);
    for (const sec of sectionsOf(i)) assert.ok(q.views.some(v => v.text.startsWith(`「${sec.title}」。`)), `${sec.id}: its title`);
    assert.ok(!q.hooks.some(h => h[0] === 'progress'), '(a review keeps no place)');
    for (const [, arg] of q.hooks.filter(h => h[0] === 'page')) assert.ok(lecturePage(FL, arg));
  }
  // 続きから: the place a class left midway reached
  const d = classDialogs(FL, 0, { from: 3 }), P = d.dialogs.class.nodes.pace;
  assert.deepEqual(P.choices.map(c => c.text), ['続きから（第 1 章「抗力・揚抗比・最良滑空速度」から）', '最初から', '要点だけ']);
  assert.deepEqual(validateDialogs(d, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists }).errors, []);
  const on = run(d, 'class');
  assert.deepEqual(on.hooks.filter(h => h[0] === 'progress').map(h => +h[1]), [3, 4, 5, 6, 7, 8, 9]);
  assert.ok(on.hooks.some(h => h[0] === 'done' && h[1] === 'class'));
  assert.deepEqual(run(d, 'class', { pick: (v) => (v.node === 'pace' ? 1 : null) }).hooks.filter(h => h[0] === 'progress').map(h => +h[1]), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], '最初から');
  assert.ok(run(d, 'class', { pick: (v) => (v.node === 'pace' ? 2 : null) }).hooks.some(h => h[0] === 'done' && h[1] === 'class'), '要点だけ');
  // (from a later chapter's first section: that chapter's title first, its questions, done)
  const d1 = classDialogs(FL, 1, { from: 7 }), on1 = run(d1, 'class');
  assert.match(on1.views[3].text, /^Next, 第 3 章「性能と重量・重心」/);
  assert.deepEqual(on1.hooks.filter(h => h[0] === 'progress').map(h => +h[1]), [7, 8, 9, 10]);
  assert.ok(on1.hooks.some(h => h[0] === 'done' && h[1] === 'class'));
  // (no place, the first section's, or one past the end: the usual choice)
  for (const from of [null, 0, 99]) assert.equal(classDialogs(FL, 0, { from }).dialogs.class.nodes.pace.choices.length, 2);
  // pace given: no choice
  for (const pace of ['full', 'quick']) {
    const dp = classDialogs(FL, 0, { pace }), rp = run(dp, 'class');
    assert.deepEqual(validateDialogs(dp, { sampleCtx: QUIZ, sectionExists: BOOK.sectionExists }).errors, []);
    assert.ok(!dp.dialogs.class.nodes.pace && !rp.views.some(v => v.choices.length && !/^q\d+$|:end$|:ask$|:u\d+(:\d+)?$/.test(v.node)), `${pace}: no choice of pace (only the questions, the sections' ends, her checks, the 考えてみよう)`);
    assert.equal(rp.hooks.some(h => h[0] === 'progress'), pace === 'full');
    assert.ok(rp.hooks.some(h => h[0] === 'done' && h[1] === 'class'));
  }
  assert.equal(pathOf(classDialogs(FL, 0, { pace: 'quick' }).dialogs.class.nodes, 'hello', { quick: true })[2], 'r0s0');
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
