// CADET — content tests (node --test): the in-game textbook (content/book.js) and the instructor's dialogues
// (content/dialog/instructor.js), built from FLIGHT LAB's data.
//  - the book: no real airline / training partner / their sites anywhere; the introduction (and FLIGHT LAB's own practice
//    chapter) left out; FLIGHT LAB's simulator boxes, calculators and key notes gone; figures are inline SVG; every
//    lesson's textbook sections resolve; chapter references follow this book's numbering;
//  - the dialogues pass the validator for every lesson, every textbook section can be reached from 'ask:root', no list
//    has more than 12 choices, every way through 'brief' that ends sets briefed_today, the lines are of a sayable
//    length and never name FLIGHT LAB's keys or pages; the words come from the data (title, goal, standard, key points).
import test from 'node:test';
import assert from 'node:assert/strict';
import { gameBook, plain, sentences } from '../src/content/book.js';
import { INSTRUCTOR, instructorDialogs, sampleCtx, speakable, polite, speechLines } from '../src/content/dialog/instructor.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createDialogState, createRunner, evalCond, applyEffects, resolveTarget, END } from '../src/dialog/engine.js';
import { installSorajima } from '../src/flight/sorajima.js';
import { loadFL, GAME } from './helpers/fl.mjs';

loadFL(GAME);                      // FLIGHT LAB's modules as the game reads them
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL;
const BOOK = gameBook(FL);
const LESSONS = FL.syllabus.STAGES.flatMap(s => s.lessons);
const SECTIONS = BOOK.chapters.flatMap(c => c.sections.map(s => s.id));

// the real names the fiction leaves out (checked here on their own, not with the book's own pattern)
const REAL = [/(?<![A-Za-z])ANA(?![A-Za-z])/, /ＡＮＡ/, /all\s*nippon/i, /全日空/, /全日本空輸/, /acron/i, /ana\.co\.jp/i, /anahd/i];
const realIn = (s) => REAL.find(r => r.test(String(s)));
// FLIGHT LAB's own controls and pages
// (a key in brackets after a Japanese word: 右ラダー（E）・スロットル（R / F）, or a key with its meaning in brackets:
// → E（右ラダー）; Restricted Area（R）・LAB-A（架空の訓練点）・Class B（大空港） are names)
const APP = /キーボード|[^ァ-ヶ]キー[（(で を]|Shift\s*\+|Enter\s*で|空島|このシミュレータ|シミュレータで体験|メニュー|data-lesson|bk-sim|bk-calc|実装|G1000 型表示|教材の簡略版|教材の使い方|この教材には[^。]*自動操縦|この教材は IFR|[ぁ-んァ-ヶー一-龠][（(]\s*[WASDQERFTVBZXU](?:\s*\/\s*[WASDQERFTVBZXU])*\s*[）)]|(?<![A-Za-z0-9-]\s?)[WASDQERFTVBZXU][（(][ぁ-んァ-ヶー一-龠]/;
// what must stay: the fiction's and safety notes (この教材 as the course itself), and the real half of a sentence whose
// other half was about FLIGHT LAB's build
const KEEP = { 'nav.chart': [/架空/, /NOT FOR NAVIGATION/], 'law.special': [/架空/], 'solo.first': [/根拠にはならない/], 'perf.climb': [/POH/],
  'perf.wb': [/POH/], 'aero.lift': [/この教材の Archer/], 'ifr.np': [/自動操縦（オートパイロット）があることが多いです。/] };
// FLIGHT LAB's notes on what is published or guessed about the real course (the academy states its own course plainly)
const COURSE_NOTE = /公開情報|推測・要確認|class="tag (?:fact|unk)"/;

// ---------------------------------------------------------------- the book

test('book: chapters — the introduction is left out, the rest numbered 1…N in FLIGHT LAB\'s order', () => {
  assert.ok(BOOK.chapters.length >= 20, `${BOOK.chapters.length} chapters`);
  assert.ok(!BOOK.chapters.some(c => c.id === 'intro'), 'no introduction chapter');
  assert.ok(!SECTIONS.some(id => id.startsWith('intro.')), 'no introduction section');
  assert.equal(BOOK.section('intro.course'), null);
  const order = FL.book.CHAPTERS.map(c => c.id);
  BOOK.chapters.forEach((c, i) => {
    assert.equal(c.n, i + 1, `${c.id}: number`);
    if (i) assert.ok(order.indexOf(c.id) > order.indexOf(BOOK.chapters[i - 1].id), `${c.id}: order`);
    assert.ok(FL.book.PARTS.some(p => p.id === c.part), `${c.id}: part ${c.part}`);
    assert.ok(c.title && c.sections.length, `${c.id}: title and sections`);
    for (const s of c.sections) assert.ok(s.id && s.title, `${c.id}: a section without id or title`);
  });
  assert.equal(new Set(SECTIONS).size, SECTIONS.length, 'section ids are unique');
  assert.ok(SECTIONS.length >= 100, `${SECTIONS.length} sections`);
});

test('book: no real airline, call sign, training partner or their sites in any section', () => {
  // the filter has something to do: FLIGHT LAB's own text names them
  const raw = (id) => FL.book.html(FL.book.findSection(id).sec);
  for (const id of ['comm.callsign', 'comm.icao', 'solo.req', 'nav.divert']) assert.ok(realIn(raw(id)), `${id}: FLIGHT LAB names them here`);
  for (const c of BOOK.chapters) {
    assert.ok(!realIn(c.title), `${c.id}: title`);
    for (const { id } of c.sections) {
      const s = BOOK.section(id);
      for (const [what, v] of [['title', s.title], ['html', s.html], ['text', s.text], ['summary', s.summary], ['keyPoints', s.keyPoints.join('\n')], ['caption', s.caption || ''], ['chapter', s.chapter.title]]) {
        const r = realIn(v);
        assert.ok(!r, `${id}: ${what} matches ${r}`);
        assert.ok(!COURSE_NOTE.test(v), `${id}: ${what} has a note on the real course: ${(String(v).match(COURSE_NOTE) || [])[0]}`);
      }
    }
  }
  assert.deepEqual(BOOK.issues, [], 'the safety net never had to act');
  // what was around them stays (only the sentence / item / row that names them goes)
  assert.match(BOOK.section('comm.icao').html, /CAP 413/);
  assert.match(BOOK.section('nav.divert').html, /まず向きを変え/);
  assert.match(BOOK.section('solo.req').text, /訓練回数の決まりはない/);
  assert.match(BOOK.section('me.basics').text, /^Archer の次に双発機 Piper Seminole/);
  assert.match(BOOK.section('comm.icao').text, /両方を知っておくと混乱しません。代表的な例/);
});

test('book: FLIGHT LAB\'s simulator boxes, calculators, lesson buttons and key notes are gone; tables and figures stay', () => {
  let figs = 0, tables = 0;
  for (const id of SECTIONS) {
    const s = BOOK.section(id);
    assert.ok(!APP.test(s.html), `${id}: ${(s.html.match(APP) || [])[0]}`);
    assert.ok(!/<button\b/.test(s.html), `${id}: a button`);
    assert.ok(!/\{ch:/.test(s.html), `${id}: an unresolved chapter reference`);
    for (const m of s.text.matchAll(/第 (\d+) 章/g)) assert.ok(+m[1] >= 1 && +m[1] <= BOOK.chapters.length, `${id}: 第 ${m[1]} 章`);
    // the markup is still whole
    for (const tag of ['div', 'table', 'tr', 'ul', 'ol', 'li', 'p', 'figure', 'svg', 'details', 'b']) {
      const open = (s.html.match(new RegExp(`<${tag}\\b`, 'g')) || []).length, close = (s.html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      assert.equal(open, close, `${id}: <${tag}> ${open} open, ${close} closed`);
    }
    if (s.figure !== null) {
      figs++;
      assert.match(s.figure, /^<svg\b[\s\S]*<\/svg>$/, `${id}: figure is an <svg>`);
      assert.equal((s.figure.match(/<svg\b/g) || []).length, 1, `${id}: one figure`);
      assert.ok(s.html.includes(s.figure), `${id}: the figure is the section's own`);
      assert.ok(s.html.indexOf(s.figure) === s.html.search(/<svg\b/), `${id}: the first figure`);
    } else assert.ok(!/<svg\b/.test(s.html), `${id}: has a drawing but no figure`);
    if (/<table\b/.test(s.html)) tables++;
  }
  assert.ok(figs >= 15, `${figs} figures`);
  assert.ok(tables >= 40, `${tables} sections with tables`);
  // its notes on itself as software are gone, with what only explained them; the course's own notes stay
  assert.doesNotMatch(BOOK.section('crm.auto').html, /練習するためです|この教材には/);
  assert.doesNotMatch(BOOK.section('ifr.np').html, /この教材|実装/);
  for (const [id, keep] of Object.entries(KEEP)) for (const re of keep) assert.match(BOOK.section(id).text, re, `${id}: ${re}`);
  // FLIGHT LAB's key column is taken out of the controls table; the table itself stays
  const ctl = BOOK.section('sys.ctl').html;
  assert.match(ctl, /スタビレーター/); assert.doesNotMatch(ctl, /このシミュレータのキー|<td>W \/ S<\/td>/);
});

test('book: sections — key points, summary, plain text, caching', () => {
  for (const id of SECTIONS) {
    const s = BOOK.section(id);
    assert.equal(s.id, id);
    assert.ok(BOOK.chapters.find(c => c.id === s.chapter.id).sections.some(x => x.id === id), `${id}: its chapter`);
    assert.ok(s.text.length > 40 && !/[<>]/.test(s.text.replace(/<\s|\s>/g, '')), `${id}: plain text`);
    assert.ok(s.summary && s.summary.length <= 200, `${id}: summary ${s.summary.length}`);
    assert.ok(s.keyPoints.length >= 1 && s.keyPoints.every(k => typeof k === 'string' && k.trim() && !/[<>]/.test(k)), `${id}: key points`);
    // with a ここが大切 box, the key points are its items
    const box = s.html.match(/<div class="bk-key">([\s\S]*?)<\/div>/g);
    if (box) assert.deepEqual(s.keyPoints, box.flatMap(b => [...b.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(m => plain(m[1]))), `${id}: key points from the box`);
    assert.equal(BOOK.section(id), s, `${id}: cached`);
  }
  assert.deepEqual(BOOK.section('ops.trim').keyPoints.slice(-1), ['トリムは最後。トリムで機首を上げ下げしない']);
  assert.equal(BOOK.section('aero.lift').keyPoints.length, 2, 'no box: the first 2 sentences');
  assert.equal(BOOK.section('nope.nope'), null);
  assert.equal(gameBook(FL), BOOK, 'one book per FLIGHT LAB');
  assert.deepEqual(sentences('A です。B（C。D）です。「E。」F'), ['A です。', 'B（C。D）です。', '「E。」F']);
});

test('book: every lesson\'s textbook sections resolve (except the left-out introduction)', () => {
  let n = 0;
  for (const l of LESSONS) {
    const want = (l.book || []).filter(id => !id.startsWith('intro.'));
    for (const id of want) assert.ok(BOOK.section(id), `${l.id}: ${id}`);
    assert.deepEqual(BOOK.lessonSections(l.id).map(s => s.id), want, `${l.id}: lessonSections`);
    for (const s of BOOK.lessonSections(l.id)) assert.equal(s.title, BOOK.section(s.id).title);
    n += want.length;
  }
  assert.ok(n >= 40, `${n} lesson references`);
  assert.deepEqual(BOOK.lessonSections('a1').map(s => s.id), ['aero.forces', 'ops.trim']);
  // (W07d, DESIGN 6.1) c1, the pre-solo check, links the section on what the check looks at (it linked the left-out
  // introduction, intro.course, so the game showed it no section); the stall lessons add the recovery section after aero.stall
  assert.deepEqual(BOOK.lessonSections('c1').map(s => s.id), ['solo.check']);
  assert.deepEqual(BOOK.lessonSections('a7').map(s => s.id), ['aero.stall', 'ops.stall']);
  assert.deepEqual(BOOK.lessonSections('nope'), []);
});

// ---------------------------------------------------------------- the instructor

const OPTS = { sectionExists: BOOK.sectionExists, lessonExists: (id) => LESSONS.some(l => l.id === id), sampleCtx: sampleCtx(FL) };
const A1 = instructorDialogs(FL, { lessonId: 'a1' });
const nodesOf = (data) => Object.entries(data.dialogs).flatMap(([d, dd]) => Object.entries(dd.nodes).map(([id, n]) => [`${d}:${id}`, n]));

test('instructor: who he is, and data that passes the validator for every lesson', () => {
  assert.deepEqual(INSTRUCTOR, { id: 'instructor', name_ja: '早瀬 航', title_ja: '早瀬 教官', role_ja: '担当教官' });
  assert.equal(A1.speakers.instructor.name_ja, '早瀬 教官');
  assert.deepEqual(Object.keys(A1.dialogs).sort(), ['ask', 'brief']);
  for (const f of ['met_instructor', 'briefed_today', 'brief_checked']) assert.ok(A1.flags.includes(f), f);
  assert.deepEqual([...A1.hooks].sort(), ['ai', 'board', 'book', 'look', 'nod', 'point']);          // (M8: ai, the free question)
  for (const l of LESSONS) {
    const data = l.id === 'a1' ? A1 : instructorDialogs(FL, { lessonId: l.id });
    const r = validateDialogs(data, OPTS);
    assert.deepEqual(r.errors, [], `${l.id}: errors`);
    assert.deepEqual(r.warnings, [], `${l.id}: warnings`);
  }
  assert.deepEqual(instructorDialogs(FL, { lessonId: 'a1' }), A1, 'the same data each time');
  assert.deepEqual(instructorDialogs(FL), A1, 'a1 by default');
  assert.throws(() => instructorDialogs(FL, { lessonId: 'zz' }), /zz/);
});

test('instructor: every textbook section can be reached from ask:root; no list has more than 12 choices', () => {
  for (const data of [A1, instructorDialogs(FL, { lessonId: 'k4' }), instructorDialogs(FL, { lessonId: 'c1' })]) {
    const seen = new Set(['root']), queue = ['root'];
    const nodes = data.dialogs.ask.nodes;
    while (queue.length) {
      const n = nodes[queue.shift()];
      for (const t of [n.next, n.else, ...(n.choices || []).map(c => c.next)]) {
        const p = t === undefined ? null : resolveTarget(data, 'ask', t);
        if (p && p !== END && p.dialog === 'ask' && !seen.has(p.node)) { seen.add(p.node); queue.push(p.node); }
      }
    }
    for (const id of SECTIONS) {
      assert.ok(seen.has(`sec:${id}`), `sec:${id} from root`);
      const menu = nodes[`sec:${id}:menu`].choices.map(c => c.text);
      assert.ok(menu.includes('教科書で読む') && menu.includes('ほかの質問') && menu.includes('ありがとうございました'), `${id}: menu`);
      assert.equal(menu.includes('図を画面に映してください'), !!BOOK.section(id).figure, `${id}: the screen only with a figure`);
    }
    for (const [id, n] of nodesOf(data)) if (n.choices) {
      assert.ok(n.choices.length >= 1 && n.choices.length <= 12, `${id}: ${n.choices.length} choices`);
      // a way back out of every list in 'ask'
      if (id.startsWith('ask:')) assert.ok(n.choices.some(c => /^(戻る|質問はもうありません|ほかの質問|ありがとうございました)$/.test(c.text)), `${id}: no way back`);
    }
  }
  // today's sections first, then one choice per part that has chapters in this book, then the way out. (W09: the front
  // part 序部 (p0, book-0.js) holds only 'intro' and 'sim' until W10 adds 'basics', and the game leaves both out, so p0
  // has no chapters here yet and is not listed; p1–p6 are, in FL.book.PARTS order. DESIGN 3.1・6.3, TEST-CONSTANTS.md)
  const root = A1.dialogs.ask.nodes.root.choices.map(c => c.next);
  assert.deepEqual(root.slice(0, 2), ['sec:aero.forces', 'sec:ops.trim']);
  assert.deepEqual(root.slice(2, -1), FL.book.PARTS.filter(p => BOOK.chapters.some(c => c.part === p.id)).map(p => `part:${p.id}`));
  assert.deepEqual(root.slice(2, -1).filter(x => x !== 'part:p0'), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map(p => `part:${p}`));
  assert.equal(root[root.length - 1], 'brief:menu');
});

// every way through 'brief' (and into 'ask' and back) from a state: the ends reached and the states they are reached with
function walk(data, state) {
  const ends = [], stuck = [], seen = new Set();
  const copy = (s) => JSON.parse(JSON.stringify(s));
  const settle = (from, target, st) => {
    let p = resolveTarget(data, from, target);
    for (let hops = 0; p && p !== END && !evalCond(data.dialogs[p.dialog].nodes[p.node].if, st, {}); hops++) {
      assert.ok(hops < 64, 'a loop of skipped nodes');
      const n = data.dialogs[p.dialog].nodes[p.node];
      p = resolveTarget(data, p.dialog, n.else !== undefined ? n.else : n.next);
    }
    assert.ok(p, `${from}: ${target} leads nowhere`);
    return p;
  };
  const visit = (p, st) => {
    if (p === END) { ends.push({ ...st, at: 'END' }); return; }
    const key = `${p.dialog}:${p.node}|${JSON.stringify(st.flags)}|${JSON.stringify(st.trust)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const n = data.dialogs[p.dialog].nodes[p.node];
    st = copy(st); applyEffects(n.effects, st, {});
    if (n.end === true) { ends.push({ ...st, at: p.node }); return; }
    if (n.choices) {
      const vis = n.choices.filter(c => evalCond(c.if, st, {}));
      if (!vis.length) stuck.push(`${p.dialog}:${p.node}`);
      for (const c of vis) { const s2 = copy(st); applyEffects(c.effects, s2, {}); visit(settle(p.dialog, c.next, s2), s2); }
    } else visit(settle(p.dialog, n.next, st), st);
  };
  visit(settle('brief', data.dialogs.brief.start, state), state);
  return { ends, stuck, seen };
}

test('instructor: every way through the briefing ends at bye (briefed) or later (left for now), met either way', () => {
  const starts = [
    createDialogState(),
    createDialogState({ v: 1, flags: { met_instructor: true } }),
    createDialogState({ v: 1, flags: { met_instructor: true, brief_checked: true } }),
    createDialogState({ v: 1, flags: { met_instructor: true, brief_checked: true, briefed_today: true } }),
  ];
  for (const lessonId of ['a1', 'k1', 'm2']) {
    const data = lessonId === 'a1' ? A1 : instructorDialogs(FL, { lessonId });
    for (const s0 of starts) {
      const { ends, stuck, seen } = walk(data, s0);
      assert.deepEqual(stuck, [], `${lessonId}: a list with every choice hidden`);
      assert.ok(ends.some(st => st.at === 'bye'), `${lessonId}: the briefing can be heard to the end`);
      // before the wrap-up, 'later' leaves the talk; after it, 準備に向かいます (→ bye) does
      if (!s0.flags.briefed_today) assert.ok(ends.some(st => st.at === 'later'), `${lessonId}: the talk can be left`);
      for (const st of ends) {
        assert.ok(['bye', 'later'].includes(st.at), `${lessonId}: ended at ${st.at}`);
        if (st.at === 'bye') assert.equal(st.flags.briefed_today, true, `${lessonId}: ended without briefed_today from ${JSON.stringify(s0.flags)}`);
        else assert.equal(!!st.flags.briefed_today, !!s0.flags.briefed_today, `${lessonId}: leaving does not count as briefed`);
        assert.equal(st.flags.met_instructor, true);
      }
      if (!s0.flags.brief_checked) {
        // the check was reached: right answers raise trust by 3, wrong ones leave it
        assert.ok([...seen].some(k => k.startsWith('brief:check:ok|')) && [...seen].some(k => k.startsWith('brief:check:fix|')), `${lessonId}: both outcomes`);
        const trusts = new Set(ends.filter(st => st.flags.brief_checked).map(st => st.trust.instructor ?? 50));
        assert.deepEqual([...trusts].sort(), [50, 53], `${lessonId}: trust after the check`);
      }
    }
  }
});

test('instructor: a run through with the real engine — first meeting, lesson, check, a question, wrap-up', () => {
  const state = createDialogState(), hooks = [];
  const r = createRunner({ data: A1, state, ctx: sampleCtx(FL), hooks: { onHook: (name, arg) => hooks.push([name, arg]) } });
  const said = [];
  const choose = (text) => { const v = r.view(); const c = v.choices.find(x => x.text === text); assert.ok(c, `no choice "${text}" at ${v.dialog}:${v.node}: ${v.choices.map(x => x.text)}`); r.choose(c.i); };
  const until = (pred, max = 80) => { for (let i = 0; i < max && r.running && !pred(r.view()); i++) { said.push(r.view().text); if (r.view().choices.length) return; r.next(); } };
  r.start('brief');
  assert.match(r.view().text, /はじめまして/);
  assert.equal(r.view().name, '早瀬 教官');
  until(v => v.choices.length > 0); choose('よろしくお願いします');
  until(v => v.choices.length > 0); assert.equal(r.view().node, 'menu'); choose('今日の課目を教えてください');
  until(v => v.node === 'check');
  const lesson = LESSONS.find(l => l.id === 'a1');
  const talk = said.join('\n');
  assert.ok(talk.includes(lesson.title), 'the title');
  assert.ok(talk.includes('トリムを使い、操縦から手を離しても水平飛行が続く状態を作る'), 'the goal');
  assert.ok(talk.includes(lesson.std), 'the standard');
  assert.ok(hooks.some(([n, a]) => n === 'board' && a === 'aero.forces'), 'the figure on the screen');
  assert.ok(hooks.some(([n, a]) => n === 'point' && a === 'screen'), 'pointing at the screen');
  assert.ok(hooks.some(([n, a]) => n === 'point' && a === 'board'), 'pointing at the board');
  choose('トリムを使い、操縦から手を離しても水平飛行が続く状態を作る');
  assert.equal(state.trust.instructor, 53); assert.equal(state.flags.brief_checked, true);
  until(v => v.node === 'post'); choose('質問があります');
  assert.equal(r.view().dialog, 'ask');
  choose('飛行機に働く 4 つの力（今日の課目）');
  until(v => v.choices.length > 0); choose('教科書で読む');
  assert.deepEqual(hooks[hooks.length - 1], ['book', 'aero.forces']);
  until(v => v.choices.length > 0); choose('ありがとうございました');
  until(v => v.choices.length > 0); assert.equal(r.view().node, 'menu:mid');
  choose('このあとの流れを教えてください');
  until(() => false);
  assert.equal(r.running, false);
  assert.equal(state.flags.briefed_today, true);
  assert.ok(said.some(t => /運航管理/.test(t)) && said.some(t => /エプロン/.test(t)), 'to dispatch, then the apron');
  // a later visit: the menu offers to go
  r.start('brief');
  assert.match(r.view().text, /おかえりなさい/);
  r.next(); assert.ok(r.view().choices.some(c => c.text === '準備に向かいます'));
});

// (W07d, DESIGN 10.5〔安全〕) the instructor reads FLIGHT LAB's brief of the stall lessons aloud: the recovery in the AFH
// order the textbook teaches (the autopilot off first where there is one; ① the angle of attack ② wings level ③ power as
// needed ④ back to the path), not the old "full power before the wings"; FLIGHT LAB's note on its own Archer unsaid; the
// figure on the screen still aero.stall's
test('instructor: the stall lessons\' recovery is said in the AFH order', () => {
  for (const id of ['a7', 'a8']) {
    const nodes = instructorDialogs(FL, { lessonId: id }).dialogs.brief.nodes, lines = [];
    for (let k = 'lesson'; k && k.startsWith('lesson'); k = nodes[k].next) lines.push(nodes[k]);
    const talk = lines.map(n => n.text).join('\n');
    let at = -1;
    for (const w of ['まず自動操縦を切ります', '① 機首を下げて迎え角を減らします（失速警報が止まるまで）', '② 翼を水平にします', '③ 出力', '④ 速度が付いたら元の経路']) {
      const i = talk.indexOf(w, at + 1);
      assert.ok(i > at, `${id}: "${w}" not in order:\n${talk}`);
      at = i;
    }
    assert.doesNotMatch(talk, /② フルパワー|出力（すでに全開）|この教材/, `${id}: the old order, or FLIGHT LAB's own note`);
    assert.ok(lines.some(n => n.hook && n.hook.name === 'board' && n.hook.arg === 'aero.stall'), `${id}: aero.stall's figure on the screen`);
  }
});

test('instructor: lines are sayable — length, no FLIGHT LAB controls or pages, no real names, です/ます', () => {
  let n = 0, long = 0;
  for (const l of LESSONS) {
    const data = l.id === 'a1' ? A1 : instructorDialogs(FL, { lessonId: l.id });
    for (const [id, node] of nodesOf(data)) {
      if (l.id !== 'a1' && id.startsWith('ask:sec:')) continue;              // the same for every lesson
      for (const t of [node.text, ...(node.choices || []).map(c => c.text)]) {
        n++;
        assert.ok(t.length >= 2 && t.length <= 120, `${l.id} ${id}: ${t.length} characters: ${t}`);
        if (t.length > 90) long++;
        assert.ok(!APP.test(t), `${l.id} ${id}: names FLIGHT LAB's controls: ${t}`);
        assert.ok(!realIn(t) && !COURSE_NOTE.test(t), `${l.id} ${id}: a real name or a note on the real course: ${t}`);
        if (!l.aircraft && /^brief:(check|wrap)/.test(id)) assert.ok(!/飛ぶ|エプロン|運航管理/.test(t), `${l.id} ${id}: a ground lesson does not fly: ${t}`);
        assert.ok(!/[{}<>]|undefined|null|NaN/.test(t), `${l.id} ${id}: ${t}`);
      }
      for (const c of node.choices || []) assert.ok(c.text.length <= 60, `${l.id} ${id}: a long choice: ${c.text}`);
    }
  }
  assert.ok(long / n < 0.02, `${long} of ${n} lines over 90 characters`);
  // the briefing's own lines are polite
  for (const id of ['hello', 'hello:2', 'hello:4', 'again', 'menu', 'post', 'wrap:2', 'wrap:3', 'wrap:4', 'bye', 'check:ok', 'check:fix:2'])
    assert.match(A1.dialogs.brief.nodes[id].text, /(です|ます|ません|ました|ましょう|ください|でしょう)[かね]?[。？]$/, id);
  // made speakable and polite
  assert.equal(speakable('<b>T キー（トリム）</b>は力を覚えさせる装置。'), 'トリムは力を覚えさせる装置。');
  assert.equal(speakable('速度はスロットル（R / F）で。速度を変えたらトリム（T）を取り直す。'), '速度はスロットルで。速度を変えたらトリムを取り直す。');
  assert.equal(speakable('主輪から接地し、B でブレーキ。'), '主輪から接地し、ブレーキ。');
  assert.equal(speakable('45° では 1.41 G で失速速度が約 19% 上がる。荷重倍数（G）'), '45° では 1.41 G で失速速度が約 19% 上がる。荷重倍数（G）');
  assert.equal(speakable('脚を上げる（G）。高すぎれば S 字で高度を捨てる。'), '脚を上げる。高すぎれば S 字で高度を捨てる。');
  assert.equal(speakable('振られやすい → <b>E（右ラダー）でボールを中央</b>に。'), '振られやすい → 右ラダーでボールを中央に。', 'a key after an arrow');
  assert.equal(speakable('（姿勢→高度→姿勢）・局通過（TO→FROM）'), '（姿勢 → 高度 → 姿勢）・局通過（TO → FROM）', 'arrows spaced on both sides');
  for (const t of ['Class D で交信を確立する。', 'T 字尾翼の双発機。', 'TO 表示で針が右なら右へ。', 'Class B（cleared into the Class Bravo）が必要。', 'LAB-A（架空の訓練点）へ。'])
    assert.equal(speakable(t), t, 'English and names are left alone');
  for (const [a, b] of [
    ['トリムで機首を上げ下げしない', 'トリムで機首を上げ下げしません。'],
    ['引き返さない。', '引き返しません。'], ['急がない。', '急ぎません。'], ['訓練回数の決まりはない', '訓練回数の決まりはありません。'],
    ['76 kt を保つ（速すぎても遅すぎても届かない）。', '76 kt を保ちます（速すぎても遅すぎても届かない）。'],
    ['G1000 の姿勢・方位は AHRS という装置から来る。', 'G1000 の姿勢・方位は AHRS という装置から来ます。'],
    ['煙は最も急ぐ緊急事態の 1 つ。', '煙は最も急ぐ緊急事態の 1 つです。'],
    ['義務は全員にある（91.113(b)）。', '義務は全員にあります（91.113(b)）。'],
    ['すべての操作の土台。', 'すべての操作の土台です。'], ['フルパワー。', 'フルパワー。'], ['TO 表示で針が右なら右へ修正。', 'TO 表示で針が右なら右へ修正。'],
    ['判断は早く。', '判断は早く。'], ['数字は原則 1 桁ずつ。', '数字は原則 1 桁ずつ。'], ['積乱雲には近づかない・下を通らない。', '積乱雲には近づかない・下を通らない。'],
  ]) assert.equal(polite(a), b, a);
  assert.deepEqual(speechLines('手順：①機首を合わせる ②落ち着いたら T ③高度が保たれるか見る。', { steps: true }),
    ['手順：① 機首を合わせます。② 落ち着いたらトリム。③ 高度が保たれるか見ます。'], 'short steps share a line');
  assert.deepEqual(speechLines('正の上昇率（VSI がプラス・高度が増えている）を確認したら脚を上げる。使える滑走路が残っていない高さで。'),
    ['正の上昇率（VSI がプラス・高度が増えている）を確認したら脚を上げます。使える滑走路が残っていない高さで。'], 'a phrase that leans on its sentence stays with it');
  assert.deepEqual(speechLines('この教材の地図は架空。実際の空域判定はしない', { whole: true }), [], 'a key point that loses its context is not said');
});

test('instructor: the words come from FLIGHT LAB\'s data', () => {
  const brief = A1.dialogs.brief.nodes, ask = A1.dialogs.ask.nodes;
  // the answer to a section is its key points
  const trim = Object.entries(ask).filter(([id]) => id.startsWith('sec:ops.trim:k')).map(([, n]) => n.text);
  assert.ok(trim.length >= 3 && trim.length <= 4, `${trim.length} lines`);
  assert.equal(trim[trim.length - 1], 'トリムは最後です。トリムで機首を上げ下げしません。');
  assert.match(ask['sec:aero.forces'].text, /大事なことは 2 つ/);
  // a count said is the count in the book's box, and that many points follow
  for (const id of SECTIONS) {
    const t = ask[`sec:${id}`].text, m = /大事なことは (\d+) つ|この一点/.exec(t);
    if (!m) continue;
    const n = m[1] ? +m[1] : 1, keys = BOOK.section(id).keyPoints.length;
    assert.equal(n, keys, `${id}: says ${n}, the book has ${keys}`);
  }
  // every answer opens in one of the four ways (a count only when the whole box is said)
  for (const id of SECTIONS) assert.match(ask[`sec:${id}`].text, /かいつまんで話します|大事なところを話します|大事なのは、この一点です|大事なことは \d+ つあります/, id);
  // the check: today's goal and two other lessons' goals
  const goals = new Set(LESSONS.map(l => sentences(l.goal).pop()));
  const check = brief.check.choices;
  assert.equal(check.length, 3);
  for (const c of check) assert.ok(goals.has(c.text), c.text);
  assert.equal(check.filter(c => c.next === 'check:ok').length, 1);
  // in every lesson: one right answer, and no wrong one worded almost like it (shared pairs of characters)
  const pairs = (s) => { const c = [...s]; return new Set(c.slice(1).map((ch, k) => c[k] + ch)); };
  const alike = (a, b) => { const A = pairs(a), B = pairs(b), n = [...A].filter(x => B.has(x)).length; return n / (A.size + B.size - n); };
  for (const l of LESSONS) {
    const cs = (l.id === 'a1' ? A1 : instructorDialogs(FL, { lessonId: l.id })).dialogs.brief.nodes.check.choices;
    const right = cs.filter(c => c.next === 'check:ok');
    assert.equal(cs.length, 3, `${l.id}: 3 answers`); assert.equal(right.length, 1, `${l.id}: one right answer`);
    for (const c of cs) if (c !== right[0]) assert.ok(alike(c.text, right[0].text) < 0.4, `${l.id}: "${c.text}" is worded almost like "${right[0].text}"`);
  }
  // aircraft numbers said in a briefing are FLIGHT LAB's (here the Archer's Vr / Vy for t1)
  const t1 = nodesOf(instructorDialogs(FL, { lessonId: 't1' })).map(([, n]) => n.text).join('\n');
  const v = FL.physics.AIRCRAFT.find(a => a.id === 'pa28').v;
  assert.ok(t1.includes(`${v.rotate} kt（Vr）`) && t1.includes(`${v.y} kt（Vy）`), 'Vr and Vy');
  // the sample context has what a context would hold
  assert.deepEqual(Object.keys(sampleCtx(FL)).sort(), ['instructor', 'lesson']);
  assert.equal(sampleCtx(FL).lesson.id, 'a1');
});

// ---------------------------------------------------------------- what the book shows: no dead references, no dead links
// (textbook/rewrite/combined/DESIGN.md 6.2 rule 6, W02) No （別の章） — a {ch:} to a chapter this book leaves out — and
// no link without a target, in what the game shows from the book: every section (its HTML, text, summary and key points:
// the book page, the classes, the instructor's lines and the AI instructor read these), and the written tests'
// questions and reasons (content/school.js turns a {ch:} it cannot number into 「教科書」, so each must name a chapter
// here). Known ones, each to be fixed by the unit named; a new one fails, a fixed one only asks to be taken off the list:
const KNOWN_OTHER_CHAPTER = {
  // none now: comm.practice's {ch:sim} went into its bk.sim, which this book drops (W07a, ERRATA APP.cadet-comm-practice-ch-sim)
};
test('book: no （別の章） and no link without a target — every section; the written tests\' {ch:} name chapters of this book', (t) => {
  const found = [];
  for (const id of SECTIONS) {
    const s = BOOK.section(id);
    if ([s.html, s.text, s.summary, ...s.keyPoints].some(x => /（別の章）|\{ch:/.test(x))) found.push(id);
    for (const m of s.html.matchAll(/data-sec="([^"]*)"/g)) assert.ok(BOOK.sectionExists(m[1]), `${id} → ${m[1]}`);
    assert.doesNotMatch(s.html, /<span class="bk-see"(?! data-sec=")/, `${id}: a "→" to a section this book leaves out`);
    assert.doesNotMatch(s.html, /<button\b|data-lesson=|data-calc=/, `${id}: a FLIGHT LAB control`);
    for (const m of s.html.matchAll(/<a\b([^>]*)>/g)) assert.match(m[1], /\shref="https:\/\/[^"\s]+"/, `${id}: ${m[0]}`);
  }
  assert.deepEqual(found.filter(id => !KNOWN_OTHER_CHAPTER[id]), [], 'sections that show （別の章）');
  for (const id of Object.keys(KNOWN_OTHER_CHAPTER)) if (!found.includes(id)) t.diagnostic(`${id} no longer shows （別の章）: take it off KNOWN_OTHER_CHAPTER`);
  const chapters = new Set(BOOK.chapters.map(c => c.id));
  let refs = 0;
  for (const b of FL.quiz.BANKS) for (const q of b.qs) for (const x of [q[0], ...q[1], q[3]]) for (const m of String(x).matchAll(/\{ch:([a-z0-9]+)\}/g)) {
    refs++;
    assert.ok(chapters.has(m[1]), `${b.id}: {ch:${m[1]}} is not a chapter of this book`);
  }
  assert.ok(refs >= 1, 'the written tests point at chapters');
});

// ---------------------------------------------------------------- W10b: what FLIGHT LAB's and TEXTBOOK's pages draw
// from the book's data (textbook/rewrite/combined/DESIGN.md 3.2, 6.3): the section's marks (FL.book.secMarks: the scope
// badge, 発展, 「パイロット基礎教材（第 3 版）… をもとに改稿」) and the chapter-end 説明してみよう (ch.written) are not
// in this book, nor in anything the instructor says; the boxes of the section form (bk.deep・bk.drill・bk.judge・bk.dont・
// bk.recall) stay in the book, filtered as the rest, and out of the instructor's words.
const NOT_HERE = /をもとに改稿|パイロット基礎教材|bk-scope|bk-from|bk-marks|bk-written|bk-w-|説明してみよう/;
test('book: no scope badge, provenance line or 説明してみよう — in no section, summary or key point; the written questions are not read out', () => {
  assert.equal(typeof FL.book.secMarks, 'function', 'FLIGHT LAB draws the marks (book-core.js)');
  let fromSecs = 0;
  for (const id of SECTIONS) {
    const s = BOOK.section(id), src = FL.book.findSection(id).sec;
    for (const x of [s.html, s.text, s.summary, ...s.keyPoints]) assert.doesNotMatch(x, NOT_HERE, id);
    if (src.from) fromSecs++;
  }
  assert.ok(fromSecs >= 9, `the front part's basics has its provenance in the data (${fromSecs}), not in this book`);
  for (const c of BOOK.chapters) assert.deepEqual(Object.keys(c).filter(k => /written|scope|from|marks/i.test(k)), [], `${c.id}: no written, no marks`);
  // the basics chapter is in this book; its written questions and their answers are nowhere in it
  const basics = FL.book.CHAPTERS.find(c => c.id === 'basics');
  assert.ok(BOOK.chapters.some(c => c.id === 'basics') && FL.book.writtenItems(basics).length >= 14);
  const all = SECTIONS.map(id => BOOK.section(id).text).join('\n');
  for (const w of FL.book.writtenItems(basics)) assert.ok(!all.includes(plain(w.q)), w.key);
});

test('book: the boxes of the section form — kept in the book (the folds folded), filtered as the rest, out of the instructor\'s words', () => {
  const b = FL.book.bk;
  const body = b.aim('ねらいの文です。') + '<p>説明の文です。</p>'
    + b.deep('深い話', '<p>発展の文です。</p>') + b.drill('計算', '<p>問の文です。</p>', '<p>答えの文です。</p>')
    + b.judge('判断の文です。') + b.dont('混同の文です。') + b.key('要点の文', '二つめの要点')
    + b.recall('呼び戻しの文です。', ['zz.b', 'ほかの節'], ['nowhere.sec', 'ない節'])
    + b.judge('ANA の訓練では引き返します。') + b.deep('日本の話', b.jp('<p>日本の決まりの文です。</p>'));
  const fake = { book: { CHAPTERS: [{ id: 'zz', part: 'p1', t: '試しの章', summary: '試しの章です。', secs: [{ id: 'zz.a', t: '箱の節', h: () => body }, { id: 'zz.b', t: 'ほかの節', h: () => b.aim('ほかの節のねらいです。') + b.recall('戻る文です。', ['zz.a', '箱の節']) }] }] }, syllabus: FL.syllabus };
  const gb = gameBook(fake), s = gb.section('zz.a');
  // in the book: the folds (still folded), the boxes; the link to a section of this book stays a link, the other is text
  for (const cls of ['bk-deep', 'bk-drill', 'bk-judge', 'bk-dont', 'bk-recall']) assert.ok(s.html.includes(`class="${cls}"`), cls);
  assert.match(s.html, /<details class="bk-deep"><summary>もっと深く：深い話<\/summary>/);
  assert.doesNotMatch(s.html, /<details[^>]*\sopen/);
  assert.ok(s.html.includes('<span class="bk-see" data-sec="zz.b">→ ほかの節</span>') && s.html.includes('<span class="bk-see">→ ない節</span>'));
  // filtered as the rest: the real name's box goes whole, the Japanese side goes and its fold with it
  assert.doesNotMatch(s.html, /ANA|日本の決まりの文|日本の話/);
  assert.equal((s.html.match(/class="bk-judge"/g) || []).length, 1);
  assert.equal((s.html.match(/class="bk-deep"/g) || []).length, 1);
  // the instructor's words: the opening lines and the key points, not the boxes
  assert.equal(s.summary, 'ねらいの文です。説明の文です。');
  assert.deepEqual(s.keyPoints, ['要点の文', '二つめの要点']);
  for (const t of ['発展の文', '問の文', '答えの文', '判断の文', '混同の文', '呼び戻しの文']) assert.ok(!s.summary.includes(t) && s.text.includes(t), t);
  const o = gb.section('zz.b');
  assert.deepEqual([o.summary, o.keyPoints], ['ほかの節のねらいです。', ['ほかの節のねらいです。']]);
  assert.match(o.html, /<span class="bk-see" data-sec="zz.a">→ 箱の節<\/span>/);
});

// ---------------------------------------------------------------- W10c: the line 使う場面 and the notes on the exams
// (FLIGHT LAB's FL.book.secMarks from the sections' data use・jcab・faa and the links of the lessons, the test banks and the
// summary chapters; textbook/rewrite/combined/DESIGN.md 3.2, 6.3): drawn by FLIGHT LAB's and TEXTBOOK's pages, never in
// this book — no section, summary, key point, chapter or section list, nor the AI instructor's contents, has the line,
// the summary chapters it names (まとめ N) or Japan's 出題範囲参考; were the marks ever pasted into a body, they go whole.
const NOT_IN_GAME = /使う場面：|>まとめ [1-7]<|試験の項目を|出題範囲参考の見出し|ACS の知識の項目|JCAB 学科の道|FAA の学科を受けるかは未公表|bk-use|bk-exam|data-use-|data-page=/;
test('book: no 使う場面 line and no notes on the exams — in no section, summary, key point or list, nor the AI instructor\'s contents; pasted marks go whole', async () => {
  const { bookIndex } = await import('../src/ai/tutor.js');
  let lined = 0;
  for (const id of SECTIONS) {
    const s = BOOK.section(id), src = FL.book.findSection(id).sec;
    for (const x of [s.html, s.text, s.summary, ...s.keyPoints]) assert.doesNotMatch(x, NOT_IN_GAME, id);
    if (/bk-use/.test(FL.book.secMarks(src))) lined++;
  }
  assert.ok(lined >= 50, `FLIGHT LAB draws the line for ${lined} of this book's sections (from the data), not this book`);
  for (const c of BOOK.chapters) {
    assert.deepEqual(Object.keys(c).filter(k => /use|jcab|faa|marks/i.test(k)), [], `${c.id}: no use, jcab, faa`);
    for (const s of c.sections) assert.deepEqual(Object.keys(s).filter(k => /use|jcab|faa/i.test(k)), [], `${c.id}.${s.id}`);
  }
  assert.doesNotMatch(bookIndex(BOOK), NOT_IN_GAME, 'the AI instructor\'s contents');
  // FLIGHT LAB's marks pasted into a body (never done): the line, the notes and the badge go whole; the body stays
  const marks = FL.book.secMarks('aero.stall');
  assert.match(marks, /bk-use[\s\S]*bk-exam/, 'aero.stall has the line and the notes in FLIGHT LAB');
  const fake = { book: { CHAPTERS: [{ id: 'zz', part: 'p1', t: '試しの章', summary: '試しの章です。', secs: [{ id: 'zz.a', t: '札の節', h: () => `${marks}${FL.book.bk.aim('ねらいの文です。')}<p>説明の文です。</p>` }] }] }, syllabus: FL.syllabus };
  const s = gameBook(fake).section('zz.a');
  assert.doesNotMatch(s.html, NOT_IN_GAME);
  assert.doesNotMatch(s.html, /bk-marks|をもとに改稿/);
  assert.equal(s.summary, 'ねらいの文です。説明の文です。');
});
