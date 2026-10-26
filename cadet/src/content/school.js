// CADET — content/school.js : ground school (M5, chapter 1 and the pre-solo test), as dialog data for the runner.
//  - classes: ミラー 講師 (fictional) teaches the textbook's part 1 (content/book.js), a class a day: the day's chapters
//    read with the cadet section by section as the book has them, her own notes on each (content/lecture-notes), the
//    pages on the classroom's screen, two questions from FLIGHT LAB's question bank after each chapter; or, as a
//    review, each section's key points (see "a class" below);
//  - the training device's six lessons (FLIGHT LAB's stage 0, k1–k6): the PFD, read on the room's screen (k1 the parts
//    one by one, k2 ten pictures to read); the radio from FLIGHT LAB's radio chapter (radio.js) — the numbers and the
//    alphabet (k3), one whole flight's calls with their meaning (k4), read-backs (k5), listening (k6, the English
//    spoken by the browser);
//  - the written tests: FLIGHT LAB's question banks (quiz.js).
// A quiz is one dialog: each question a node whose choices go to "right" or "wrong" (the reason said either way); a
// right answer sets the flag qz_<n> in the quiz's own (unsaved) state, so the game counts them at the end: the hook
// 'quizEnd' (the game scores it then, into ctx.quiz), then the result is said from ctx. Hooks: 'board' (a figure on the
// screen), 'pfd' (a PFD picture on the device room's screen: arg the picture's index; 'tutor:<part>' for k1),
// 'say' (English spoken), 'quizEnd', 'done'; the class's 'page' (a page of the textbook on briefing room 2's screen:
// arg the section id, or secId#k for its k-th unit), 'progress' (arg the index of the section the class has reached)
// and 'book' (the section in the textbook overlay).
import { gameBook, sentences } from './book.js';
import { speechLines, NOT_SPOKEN } from './dialog/instructor.js';
import { lectureUnits, leadText } from './lecture-units.js';
import { notesFor } from './lecture-notes/index.js';
import { evalCond } from '../dialog/engine.js';
import { ourCall, CALL } from './dialog/atc.js';
import { PEOPLE } from './people.js';
import { EXAMS, CLASSES } from '../career/career.js';

export const SCHOOL_HOOKS = ['board', 'pfd', 'say', 'quizEnd', 'done', 'look', 'nod', 'point', 'page', 'progress', 'book'];
const SPEAKERS = { lecturer: { name_ja: PEOPLE.lecturer.title, color: PEOPLE.lecturer.color }, instructor: { name_ja: PEOPLE.instructor.title, color: PEOPLE.instructor.color }, player: { name_ja: 'あなた', color: '#f2b632' } };
// the textbook's chapters each class covers (part 1; its introduction is not in the game's book) and the question bank
// that goes with each chapter
export const CLASS_CHAPTERS = CLASSES;
const BANK_OF = { aero: 'q_aero', sys: 'q_sys', perf: 'q_perf', wx: 'q_wx', law: 'q_law', hf: 'q_hf', radio1: 'q_comm', radio2: 'q_comm', radio3: 'q_radio', radio4: 'q_radio', radio5: 'q_radio' };
export const FTD_TITLES = { k1: 'G1000 型 PFD の読み方', k2: 'PFD の読み取り（10 問）', k3: '数字とアルファベットの言い方（10 問）', k4: '1 回の飛行の交信', k5: '復唱と応答（10 問）', k6: '聞き取り（10 問）' };
export const PASS = 80;

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffled = (a, r) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = (a, n, r) => shuffled(a, r).slice(0, n);
const q = (s) => `「${s}」`;
// FLIGHT LAB's call sign in its radio and its textbook: the game's own (today's aircraft)
const callFix = (s) => ourCall(String(s || ''));
// FLIGHT LAB's question banks point at chapters as {ch:id}: the game's book numbers them
const refsIn = (book) => (t) => String(t || '').replace(/\{ch:([a-z0-9]+)\}/g, (m, id) => { const c = book.chapters.find(x => x.id === id); return c ? `第 ${c.n} 章` : '教科書'; });
const fromBank = (book, r) => ([text, opts, ok, why]) => { const fx = (t) => callFix(refsIn(book)(t)), o = shuffled(opts.map((t, j) => ({ t: fx(t), ok: j === ok })), r); return { q: fx(text), opts: o.map(x => x.t), ok: o.findIndex(x => x.ok), why: fx(why) }; };

// a chain of lines (one node each) → its first node's id; the last goes on to `then`
function chain(N, id, lines, then, speaker = 'lecturer', firstMore = {}) {
  lines.forEach((text, i) => { N[i ? `${id}:${i}` : id] = { speaker, text, ...(i ? {} : firstMore), next: i < lines.length - 1 ? `${id}:${i + 1}` : then }; });
  return lines.length ? id : then;
}

// the questions: [{ q, opts, ok (the right one's index), why, say (English to speak), pfd (a picture's index) }]
// → nodes q0… and the end (the score said from ctx.quiz: { right, n, pct, pass }). A class asks its questions a few at a
// time (after each chapter): from / to pick the run of questions (ids stay q<k> for questions[k], numbered within the
// run), end: false leaves the run going on to `then` (the last run ends with q:end, the whole quiz scored)
export function quizNodes(N, questions, { speaker = 'lecturer', then = 'result', label = '', from = 0, to = questions.length, end = true } = {}) {
  for (let k = from; k < to; k++) {
    const x = questions[k], id = `q${k}`, nextQ = k < to - 1 ? `q${k + 1}` : end ? 'q:end' : then;
    const more = x.say ? { hook: { name: 'say', arg: x.say } } : x.pfd != null ? { hook: { name: 'pfd', arg: String(x.pfd) } } : {};
    // (M8: the questions and their reasons are the course's own words: 'material', said as written in the English mode)
    N[id] = { speaker, text: `${label ? label + '　' : ''}第 ${k - from + 1} 問（${to - from} 問中）。${x.q}`, ...more, tag: 'material',
      choices: x.opts.map((t, j) => ({ text: t, next: j === x.ok ? `${id}:ok` : `${id}:ng`, effects: j === x.ok ? [{ set: `qz_${k}` }] : [] })) };
    N[`${id}:ok`] = { speaker, text: `正解です。${x.why || ''}`.trim(), next: nextQ, tag: 'material' };
    N[`${id}:ng`] = { speaker, text: `正しくは${q(x.opts[x.ok])}です。${x.why || ''}`.trim(), next: nextQ, tag: 'material' };
  }
  if (end) N['q:end'] = { speaker, text: '以上です。採点しますね。', hook: { name: 'quizEnd', arg: String(questions.length) }, next: then };
}
const resultNodes = (N, speaker, passText, failText) => {
  N.result = { speaker, text: '{quiz.right} / {quiz.n} 問、{quiz.pct}% でした。', next: 'result:pass' };
  N['result:pass'] = { speaker, text: passText, if: { ctx: 'quiz.pass', is: true }, else: 'result:fail', hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'pass' }], end: true };
  N['result:fail'] = { speaker, text: failText, effects: [{ hook: 'done', arg: 'fail' }], end: true };
};

// ---------------------------------------------------------------- a class (index into CLASS_CHAPTERS)
// The class reads the day's chapters with the cadet, in the textbook's order (じっくり), or goes over each section's key
// points (要点だけ, a review). Read in full, each section is: its page on briefing room 2's screen (hook 'page': the
// section, or secId#k for its k-th unit of content/lecture-units.js, drawn by world/lecture-screen.js; the whiteboard
// shows its ここが大切) and the class's place in the course kept (hook 'progress': the section's index in the class, so a
// class left midway goes on from there); the title; ミラー 講師's own introduction (content/lecture-notes); every unit of
// the book as it comes — paragraphs and list items sentence by sentence, ここが大切 said as such (tag 'key'), 考えてみよう
// asked (a choice: think first, or hear the answer), cautions, formulas, figures (on the screen, the caption said),
// tables row by row (a long one: its first rows, the rest on the screen), the radio's English spoken ('say'); then her
// notes (tag 'note') and a check of her own (not scored); then the choice: on, the section again, or the section in the
// textbook (hook 'book'). Each chapter ends with two questions from FLIGHT LAB's question bank for it (scored: q<k>
// are questions[k]). Index 0 of every choice goes on, so a run that always picks the first reaches the end.
const S = 'lecturer';
// the textbook's words as the lecturer says them: in です / ます where that is certain, short sentences joined, long ones
// split (at up to LECTURE_LINE characters: the subtitle box holds three rows), a sentence that names FLIGHT LAB's
// controls or pages left out (instructor.js speechLines); today's call sign. "この教材の Archer" (FLIGHT LAB's model of
// it) is the Archer of the book in her hands; the book's example of a call sign too short to shorten (Archer Seven Lima
// Alpha, three characters) does not hold for today's, so she gives today's shortened as the controller would
const LECTURE_LINE = 110;
const inClass = (t) => String(t ?? '').replace(/この教材の(\s*Archer)/g, '教科書の$1')
  .replace(/「(Archer|Seminole) Seven Lima Alpha」\s*→\s*「\1 Seven Lima Alpha（3 文字なのでそのまま）」/g, () => `「${CALL.full}」 → 「${CALL.spokenShort}」`);
export const lectureLines = (text, o = {}) => speechLines(inClass(text), { max: LECTURE_LINE, ...o }).map(callFix)
  .map(l => l.replace(/([。！？])([）」』])。$/, '$1$2')).filter(Boolean);       // （…です。） is not closed twice
const JA = /[\u3040-\u30ff\u4e00-\u9fff]/;
// (a line in English alone is the textbook's mnemonic: said as one)
const mnemonic = (l) => (JA.test(l) ? l : `英語の覚え方もあります。“${l.replace(/[.。]$/, '')}”。`);
const first = (lines, p) => (lines.length ? [p + lines[0], ...lines.slice(1)] : lines);
const qq = (t) => '「' + String(t).replace(/「/g, '『').replace(/」/g, '』') + '」';   // a title in quotes (its own quotes become 『』)
// a table read aloud: up to ROWS_SAID rows; a longer one, its first ROWS_FIRST rows (the screen shows it all)
const ROWS_SAID = 6, ROWS_FIRST = 3;
// a row of a table as a sentence: "first cell：heading は value、…" (a two-column table: "first：second")
function rowText(head, row) {
  const c = row.map(x => String(x ?? '').trim().replace(/。$/, '')), val = (v) => v && !/^[—–-]$/.test(v);
  if (!head || head.length < 2 || c.length < 2) return c.filter(val).join('、') + '。';
  const rest = c.slice(1).map((v, j) => [head[j + 1] || '', v]).filter(([, v]) => val(v));
  if (c.length === 2) return `${c[0]}：${rest.map(([, v]) => v).join('')}。`;
  return `${c[0]}：${rest.map(([h, v]) => (h ? `${h}は${/^[A-Za-z0-9“"]/.test(v) ? ' ' : ''}${v}` : v)).join('、')}。`;
}
// a row of an exchange [誰, 英語, 意味]: the English spoken, then its meaning (a row whose "English" is a note in
// Japanese, such as listening to the ATIS first, is said as it is)
function radioStep(row) {
  const [who = '', en = '', ja = ''] = row.map(x => String(x ?? '').trim());
  if (!/[A-Za-z]/.test(en) || JA.test(en.replace(/“[^”]*”/g, ''))) return { text: callFix(`${who ? who + '：' : ''}${en}${ja ? `　${ja}` : ''}`) };
  return { text: callFix(`${who}：“${en}”${ja ? ` ── ${ja}` : ''}`), hook: { name: 'say', arg: callFix(en) } };
}
// what one unit of the book becomes: lines ({ text, tag?, hook? }), or { think } for a question to ask
function unitSteps(u) {
  const out = [], add = (lines, more = {}) => { for (const t of lines) out.push(typeof t === 'string' ? { text: t, ...more } : t); };
  if (u.sub) add([callFix(`ここからは${qq(u.sub)}です。`)]);
  if (u.lead) add(lectureLines(leadText(u.lead)));
  switch (u.k) {
    case 'para': add(u.heading ? [callFix(`ここからは${qq(u.text)}です。`)] : lectureLines(u.text)); break;
    case 'list': u.items.forEach((it, i) => {
      const l = lectureLines(it.text), n = u.items.length;
      add(u.ordered && n > 1 ? first(l, i === 0 ? 'まず、' : i === n - 1 ? '最後に、' : '次に、') : l);
    }); break;
    case 'table': {
      const n = u.rows.length, said = n > ROWS_SAID ? u.rows.slice(0, ROWS_FIRST) : u.rows;
      add([`${u.radio ? '画面の交信の例を聞いてください。' : '画面の表を見てください。'}${n > ROWS_SAID ? `${n} 行あります。最初の ${ROWS_FIRST} 行を読みます。` : ''}`]);
      for (const row of said) add(u.radio ? [radioStep(row)] : lectureLines(rowText(u.head, row)));
      if (n > ROWS_SAID) add(['残りは画面の表で確認してください。']);
      break;
    }
    case 'key': add(first(u.items.flatMap(kp => lectureLines(kp, { whole: true }).map(mnemonic)), 'ここが大切です。'), { tag: 'key' }); break;
    case 'think': { const qt = lectureLines(u.q).join(''); if (qt) out.push({ think: { q: qt, a: lectureLines(u.a) } }); break; }
    case 'caution': add(first(lectureLines(u.text), `注意です。${u.label ? u.label + '：' : ''}`)); break;
    case 'formula': {
      const lines = u.lines && u.lines.length ? u.lines : [u.text];
      if (lines.some(l => /[＝=≒]/.test(l))) add(lines.map((l, i) => callFix(`${i ? 'もう一つ、' : '式で書くと、'}${l}。`)));
      else if (lines.every(l => /^["“]/.test(l))) {          // example calls: spoken
        add(['画面の例を聞いてください。']);
        for (const l of lines) { const en = callFix(l.replace(/^["“]\s*|\s*["”]$/g, '')); out.push({ text: `“${en}”`, hook: { name: 'say', arg: en } }); }
      } else add([callFix(`画面の例を見てください。${lines.join(' ')}`)]);   // a literal string (a METAR)
      break;
    }
    case 'figure': { const l = first(lectureLines(String(u.caption || '').replace(/^図[：:]\s*/, '')), '画面の図を見てください。'); add(l.length ? l : ['画面の図を見てください。']); break; }
    case 'source': add(first(lectureLines(u.text), '出典：')); break;
    case 'see': add([`関連して、${u.to.map(x => qq(x.label)).join('と')}も教科書で読んでおいてください。`]); break;
  }
  return out.filter(s => s.think || (s.text && !NOT_SPOKEN.test(s.text)));
}
// the lecturer's notes for a section (content/lecture-notes), as far as they can be used: lines that are text, a check
// with 2–12 different choices and the right one among them
function notesOf(n) {
  const lines = (a) => (Array.isArray(a) ? a.filter(t => typeof t === 'string' && t.trim()).map(t => callFix(t.trim())) : []);
  const a = n && n.ask, opts = a && Array.isArray(a.opts) ? a.opts.map(t => callFix(String(t ?? '').trim())) : [];
  const ask = a && typeof a.q === 'string' && a.q.trim() && opts.length >= 2 && opts.length <= 12 && opts.every(Boolean) && new Set(opts).size === opts.length
    && Number.isInteger(a.ok) && a.ok >= 0 && a.ok < opts.length ? { q: callFix(a.q.trim()), opts, ok: a.ok, why: callFix(String(a.why ?? '').trim()) } : null;
  return { intro: lines(n && n.intro), notes: lines(n && n.notes), ask };
}
// the section read in full → its nodes from `base` (its title), going on to `after`
function sectionNodes(N, { sec, base, after, idx, j, of, notes, r }) {
  const us = lectureUnits(sec), nt = notesOf(notes);
  let open = [];                                              // the nodes waiting for the next one
  const put = (id, node) => { const n = { speaker: S, ...node }; N[id] = n; for (const o of open) o.next = id; open = n.choices ? [] : [n]; return n; };
  const title = of === 1 ? `${qq(sec.title)}です。` : j === 0 ? `最初は${qq(sec.title)}です。` : j === of - 1 ? `最後は${qq(sec.title)}です。` : `次は${qq(sec.title)}です。`;
  put(base, { text: title, effects: [{ hook: 'page', arg: sec.id }, { hook: 'progress', arg: String(idx) }] });
  nt.intro.forEach((t, k) => put(`${base}:i${k}`, { text: t }));
  us.forEach((u, m) => {
    const id = `${base}:u${m}`, page = { hook: 'page', arg: `${sec.id}#${m}` };
    unitSteps(u).forEach((s, k) => {
      const more = k === 0 ? { effects: [page] } : {};
      if (!s.think) { put(k ? `${id}:${k}` : id, { text: s.text, ...(s.tag ? { tag: s.tag } : {}), ...(s.hook ? { hook: s.hook } : {}), ...more }); return; }
      const qid = k ? `${id}:${k}` : id, a0 = `${qid}:a0`;
      put(qid, { text: `考えてみましょう。${s.think.q}`, tag: 'think', ...more, choices: [{ text: '考えてみます', next: `${qid}:wait` }, { text: '答えを聞きます', next: a0 }] });
      put(`${qid}:wait`, { text: 'では、少し考えてみてください。……いいですか？' });
      (s.think.a.length ? first(s.think.a, '答えです。') : ['答えは、教科書のこの節にあります。']).forEach((t, n) => put(`${qid}:a${n}`, { text: t }));
    });
  });
  nt.notes.forEach((t, k) => put(`${base}:n${k}`, { text: t, tag: 'note' }));
  if (nt.ask) {
    const x = nt.ask, o = shuffled(x.opts.map((t, i) => ({ t, ok: i === x.ok })), r), right = x.opts[x.ok];
    put(`${base}:ask`, { text: `ひとつ確認します。${x.q}`, choices: o.map(c => ({ text: c.t, next: c.ok ? `${base}:ask:ok` : `${base}:ask:ng` })) });
    N[`${base}:ask:ok`] = { speaker: S, text: `That's right. ${x.why}`.trim(), hook: { name: 'nod' } };
    N[`${base}:ask:ng`] = { speaker: S, text: `正しくは${q(right)}です。${x.why}`.trim() };
    open = [N[`${base}:ask:ok`], N[`${base}:ask:ng`]];
  }
  put(`${base}:end`, { text: `${qq(sec.title)}はここまでです。`, choices: [{ text: '次へ', next: after }, { text: 'この節をもう一度', next: base }, { text: '教科書でこの節を読む', next: `${base}:book` }] });
  N[`${base}:book`] = { speaker: S, text: `教科書の${qq(sec.title)}です。読み終わったら、閉じてください。`, hook: { name: 'book', arg: sec.id }, next: `${base}:end` };
}
// the section in its key points (要点だけ): the title and two lines, its figure (or its key points) on the screen
function quickNodes(N, sec, id, then) {
  const pts = []; for (const kp of sec.keyPoints) { const l = lectureLines(kp, { whole: true }); if (pts.length + l.length > 2) break; pts.push(...l); }
  const body = pts.length ? pts : lectureLines(sec.summary || '').slice(0, 2);
  const lines = (body.length ? [`${q(sec.title)}。${body[0]}`, ...body.slice(1)] : [`${q(sec.title)}。`]).map(callFix).map(mnemonic);
  const us = lectureUnits(sec), m = [us.findIndex(u => u.k === 'figure'), us.findIndex(u => u.k === 'key')].find(x => x >= 0);
  chain(N, id, lines, then, S, { effects: [{ hook: 'page', arg: m === undefined ? sec.id : `${sec.id}#${m}` }] });
}
// how long a line takes: typed at text speed ×1 (the subtitles' typewriter, ui/dialog-ui.js: 40 characters a second, a
// pause after punctuation); read by the cadet, who keeps up with the typing only on short lines (about 10 characters a
// second for a textbook's Japanese), then a second to go on. The class's "約 N 分" is the reading time
const TYPE_CPS = 40, READ_CPS = 10, LINE_S = 1;
const pauseAfter = (c) => ('。！？!?'.includes(c) ? 6 : '、，,：'.includes(c) ? 3 : c === '\n' ? 4 : '…―—'.includes(c) ? 1.5 : 0);
export const typingSeconds = (text) => Array.from(String(text ?? '')).reduce((s, c) => s + 1 + pauseAfter(c), 0) / TYPE_CPS;
const readingSeconds = (text) => Math.max(typingSeconds(text), Array.from(String(text ?? '')).length / READ_CPS) + LINE_S;
// the nodes a run that always picks the first choice goes through from `start` (flags: the class's own, as set)
export function pathOf(nodes, start, flags = {}) {
  const out = [], seen = new Set(), st = { flags };
  for (let id = start; id && id !== 'end' && nodes[id] && !seen.has(id); ) {
    seen.add(id); const n = nodes[id];
    if (n.if !== undefined && !evalCond(n.if, st, {})) { id = n.else !== undefined ? n.else : n.next; continue; }
    out.push(id);
    id = Array.isArray(n.choices) ? n.choices[0].next : n.end ? null : n.next;
  }
  return out;
}
export const minutesOf = (nodes, start, flags) => pathOf(nodes, start, flags).reduce((s, id) => s + readingSeconds(nodes[id].text), 0) / 60;

// classDialogs(FL, i, { seed, pace, from, notes }) → the class's dialog data (dialog 'class'). seed: the career's (the same
// questions each time the class is taken); pace: 'full' | 'quick' to begin without the choice; from: the index of the
// section a class left midway reached (the choice then offers to go on from it); notes: id → the lecturer's notes
// (content/lecture-notes; the tests give their own)
export function classDialogs(FL, i, { seed = 1, pace = null, from = null, notes = notesFor } = {}) {
  const book = gameBook(FL), ids = CLASS_CHAPTERS[i], r = rng(seed * 31 + i);
  if (!ids) throw new Error(`classDialogs: no class ${i}`);
  const chs = ids.map(id => book.chapters.find(c => c.id === id)).filter(Boolean);
  const noteOf = typeof notes === 'function' ? notes : () => null;
  const N = {}, data = () => ({ speakers: SPEAKERS, flags: [...qs.map((_, k) => `qz_${k}`), 'quick'], hooks: [...SCHOOL_HOOKS], dialogs: { class: { start: 'hello', nodes: N } }, questions: qs });
  // two questions after each chapter, from FLIGHT LAB's bank for it (chapters that share a bank get different ones)
  const decks = new Map(), qs = [], runs = [];
  for (const c of chs) {
    const b = BANK_OF[c.id];
    if (!decks.has(b)) decks.set(b, shuffled((FL.quiz.BANKS.find(x => x.id === b) || { qs: [] }).qs, r));
    const at = qs.length; qs.push(...decks.get(b).splice(0, 2).map(fromBank(book, r))); runs.push([at, qs.length]);
  }
  // every section of the day, in order (its index: the class's progress)
  const all = chs.flatMap((c, k) => c.sections.map(s => book.section(s.id)).filter(Boolean).map((sec, j, a) => ({ k, j, of: a.length, sec })));
  chs.forEach((c, k) => {
    const secs = all.filter(x => x.k === k), check = `c${k}:check`, nextC = k < chs.length - 1 ? `c${k + 1}` : 'q:end';
    N[`c${k}`] = { speaker: S, text: `${k ? 'Next, ' : 'Let\'s get started. '}第 ${c.n} 章${q(c.title)}。${secs.length} 節あります。順に見ていきましょう。`, next: secs.length ? `c${k}s0` : check };
    secs.forEach((x) => {
      const more = x.j < x.of - 1;
      sectionNodes(N, { sec: x.sec, base: `c${k}s${x.j}`, after: more ? `c${k}s${x.j + 1}` : check, idx: all.indexOf(x), j: x.j, of: x.of, notes: noteOf(x.sec.id), r: rng(seed * 97 + i * 131 + all.indexOf(x)) });
      quickNodes(N, x.sec, `r${k}s${x.j}`, more ? `r${k}s${x.j + 1}` : check);
    });
    // (the chapter's first section read in full, unless 要点だけ was chosen)
    if (secs.length) Object.assign(N[`c${k}s0`], { if: { not: { flag: 'quick' } }, else: `r${k}s0` });
    const [a, b] = runs[k];
    N[check] = { speaker: S, text: b > a ? `第 ${c.n} 章の確認です。${b - a} 問、答えてください。` : `第 ${c.n} 章はここまでです。`, next: b > a ? `q${a}` : nextC };
    quizNodes(N, qs, { from: a, to: b, end: false, then: nextC });
  });
  quizNodes(N, qs, { from: qs.length, then: 'bye' });                // (only the end: the day's questions scored)
  N.bye = { speaker: S, text: 'Great job today. 教科書の同じ章を、今夜もう一度読んでおいてください。See you tomorrow!', hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'class' }], end: true };
  // the start: the day's chapters, then how to go through them
  const titles = chs.map(c => `第 ${c.n} 章${q(c.title)}`).join('と');
  N.hello = { speaker: S, text: `Good morning, everyone. 今日は${titles}です。`, hook: { name: 'look', arg: 'player' }, next: pace ? 'c0' : 'pace', ...(pace === 'quick' ? { effects: [{ set: 'quick' }] } : {}) };
  const quick = (text) => ({ text, next: 'c0', effects: [{ set: 'quick' }] });
  const at = Number.isInteger(from) && from > 0 && from < all.length ? all[from] : null;
  if (pace) return data();                                            // (begun without the choice)
  if (at) {
    N.pace = { speaker: S, text: '前回は途中まででしたね。どこから始めましょうか？',
      choices: [{ text: `続きから（第 ${at.sec.chapter.n} 章${q(at.sec.title)}から）`, next: 'resume' }, { text: '最初から', next: 'c0' }, quick('要点だけ')] };
    N.resume = { speaker: S, text: `では、${q(at.sec.title)}から続けます。`, next: at.j === 0 ? `c${at.k}` : `c${at.k}s${at.j}` };
  } else {
    const m = minutesOf(N, 'c0'), mins = m < 12 ? Math.max(1, Math.round(m)) : Math.round(m / 5) * 5;
    N.pace = { speaker: S, text: '教科書を全部、順に読んでいきますか？ それとも、今日は要点だけにしますか？',
      choices: [{ text: `じっくり（教科書を全部、約 ${mins} 分）`, next: 'c0' }, quick('要点だけ（復習）')] };
  }
  return data();
}
// what the classroom shows for a 'page' hook (arg: a section id, or secId#k for its k-th lecture unit): the screen's page
// { id, k (null: the section's first page), chapter, title, n (its units), summary, unit } in the words the class hears
// (today's call sign; the svg of a figure as it is), and the whiteboard's { title, points, key } (its ここが大切, or its
// first points where the book has no such box); null for an arg that names no section or unit
export function lecturePage(FL, arg) {
  const [id, kk] = String(arg ?? '').split('#'), sec = gameBook(FL).section(id);
  if (!sec) return null;
  const us = lectureUnits(sec), k = kk === undefined ? null : Number(kk);
  if (k !== null && !(Number.isInteger(k) && us[k])) return null;
  // (the prose without the sentences the class does not say: the book's notes on FLIGHT LAB itself, such as its call sign
  // being fictional, would contradict the academy's own aircraft; a table's cells as they are)
  // (a key point goes whole, as the class leaves it out whole)
  const said = (t) => sentences(String(t ?? '')).filter(s => !NOT_SPOKEN.test(s)).join('');
  const whole = (t) => (sentences(String(t ?? '')).some(s => NOT_SPOKEN.test(s)) ? '' : String(t ?? ''));
  const prose = (u) => (!u ? u : { ...u, ...(u.lead ? { lead: said(u.lead) } : {}), ...(u.sentences ? { sentences: u.sentences.filter(s => !NOT_SPOKEN.test(s)) } : {}),
    ...(u.k === 'para' || u.k === 'caution' || u.k === 'source' ? { text: said(u.text) } : {}), ...(u.k === 'think' ? { q: said(u.q), a: said(u.a) } : {}),
    ...(u.k === 'figure' ? { caption: said(u.caption) } : {}),
    ...(u.items ? { items: u.items.map(it => (typeof it === 'string' ? whole(it) : { ...it, text: said(it.text) })).filter(it => (typeof it === 'string' ? it : it.text)) } : {}) });
  const fix = (v, key) => (key === 'svg' ? v : typeof v === 'string' ? callFix(inClass(v)) : Array.isArray(v) ? v.map(x => fix(x))
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([a, b]) => [a, fix(b, a)])) : v);
  const keys = us.filter(u => u.k === 'key').flatMap(u => u.items);
  return { id, k, chapter: `第 ${sec.chapter.n} 章　${sec.chapter.title}`, title: sec.title, n: us.length, summary: fix(said(sec.summary || '')),
    unit: k === null ? null : fix(prose(us[k])), board: { title: sec.title, points: fix((keys.length ? keys.map(whole) : sec.keyPoints.map(said)).filter(Boolean)), key: keys.length > 0 } };
}
// the textbook overlay's box under a section: the lecturer's introduction and notes on it (none: nothing)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function lecturerNotesHtml(id, notes = notesFor) {
  const n = notesOf(typeof notes === 'function' ? notes(id) : null), lines = [...n.intro, ...n.notes];
  return lines.length ? `<div class="bk-lecturer"><b>講師の補足（${esc(PEOPLE.lecturer.title)}）</b>${lines.map(t => `<p>${esc(t)}</p>`).join('')}</div>` : '';
}

// ---------------------------------------------------------------- the training device
// k2's pictures: a PFD state each (the game draws it on the screen: FLIGHT LAB's drawPFD) and what to read off it
export function pfdPictures(seed, n = 10) {
  const r = rng(seed * 7 + 2), out = [];
  for (let i = 0; i < n; i++) out.push({ ias: 70 + Math.round(r() * 12) * 5, alt: 1500 + Math.round(r() * 25) * 100, hdg: Math.round(r() * 35) * 10 + 10, vs: (Math.round(r() * 8) - 4) * 250, bank: (Math.round(r() * 4) - 2) * 10 });
  return out;
}
const DIRS = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
function readQuestion(p, k, r) {
  const kind = ['ias', 'alt', 'hdg', 'vs', 'bank'][k % 5];
  const fmt = { ias: (v) => `${v} kt`, alt: (v) => `${v.toLocaleString('en-US')} ft`, hdg: (v) => `${String(v).padStart(3, '0')}°`, vs: (v) => (v === 0 ? '0 fpm（水平）' : `${v > 0 ? '+' : ''}${v} fpm`), bank: (v) => (v === 0 ? '水平（0°）' : `${v < 0 ? '左' : '右'}に ${Math.abs(v)}°`) }[kind];
  // three wrong readings close to the right one (each different)
  const step = { ias: 5, alt: 100, hdg: 10, vs: 250, bank: 10 }[kind], v = p[kind], seen = new Set([v]), wrong = [];
  const norm = (x) => (kind === 'hdg' ? ((x % 360) + 360) % 360 || 360 : x);
  for (const d of kind === 'hdg' ? [180, 1, -1, 2, -2] : kind === 'bank' ? [-2 * Math.sign(v || 1) * Math.abs(v || 10) / 10, 1, -1, 2, -2] : [1, -1, 10, 2, -2]) {
    const x = kind === 'bank' && d === -2 * Math.sign(v || 1) * Math.abs(v || 10) / 10 ? -v || step : norm(v + d * step);
    if (!seen.has(x) && (kind !== 'ias' || x > 40)) { seen.add(x); wrong.push(x); }
    if (wrong.length === 3) break;
  }
  const opts = shuffled([v, ...wrong].map(x => ({ t: fmt(x), ok: x === v })), r);
  const q = { ias: '速度（左のテープ）は？', alt: '高度（右のテープ）は？', hdg: '機首の方位（下の HSI の上端）は？', vs: '昇降率（右端の目盛り）は？', bank: '傾き（上の弧の三角）は？' }[kind];
  const why = { ias: '左の速度テープ、中央の黒い窓の数字を読みます。', alt: '右の高度テープ、中央の窓の数字です。', hdg: `HSI の上端の窓の数字です（${DIRS[Math.round(v / 45) % 8]}向き）。`, vs: '高度テープの右の目盛りの針と数字。上は上昇、下は降下です。', bank: '姿勢表示の上の弧の目盛りと、白い三角のずれで読みます。' }[kind];
  return { q, opts: opts.map(o => o.t), ok: opts.findIndex(o => o.ok), why, pfd: k };
}
// k1: the parts of the PFD one by one (the screen highlights each: 'tutor:<part>')
const TUTOR = [
  ['all', 'これが G1000 型の PFD、主な飛行表示です。真ん中が姿勢、左が速度、右が高度。この 3 つを順に見る「スキャン」が基本です。'],
  ['att', '真ん中の姿勢表示。青が空、茶色が地面。黄色い記号が機体です。上の弧の目盛りが傾き、横線が機首の上下（ピッチ）です。'],
  ['ias', '左のテープが速度、ノットです。窓の数字を読みます。テープの色の帯は、フラップを使える範囲や、超えてはいけない速度を表します。'],
  ['alt', '右のテープが高度、フィートです。上の水色の数字は、自分で決めた目標の高度です。'],
  ['vs', '高度テープのさらに右が昇降率。1 分間に何フィート上がっているか、下がっているかです。'],
  ['hsi', '下の円が HSI。上端の窓が機首の方位です。真ん中の針（CDI）は、選んだコースからどれだけずれているかを示します。'],
  ['baro', '高度テープの下の数字が高度計の設定値（BARO）。ATIS で聞いた値に合わせないと、高度が正しく出ません。'],
];
export function ftdDialogs(FL, k, { seed = 1 } = {}) {
  const r = rng(seed * 13 + Number(k.slice(1))), R = FL.radio, N = {}, title = FTD_TITLES[k];
  if (!title) throw new Error(`ftdDialogs: no training device lesson ${k}`);
  N.hello = { speaker: 'lecturer', text: `Welcome to the training device room. 今日は ${k}：${title}です。`, hook: { name: 'look', arg: 'player' }, next: 'intro' };
  let questions = null, flags = [];
  if (k === 'k1') {
    N.intro = { speaker: 'lecturer', text: '正面の画面を見てください。実際の機体と同じ表示を、ひとつずつ見ていきます。', hook: { name: 'pfd', arg: 'tutor:all' }, next: 't0' };
    TUTOR.forEach(([part, text], i) => { N[`t${i}`] = { speaker: 'lecturer', text, hook: { name: 'pfd', arg: `tutor:${part}` }, next: i < TUTOR.length - 1 ? `t${i + 1}` : 'k1:end' }; });
    N['k1:end'] = { speaker: 'lecturer', text: 'Perfect. 次は、実際の表示を読む練習です。読む順番を、体で覚えてください。', hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'pass' }], end: true };
  } else if (k === 'k4') {
    // one whole flight: each call — who says it, what it means, why (FLIGHT LAB's FLIGHT), the English spoken
    N.intro = { speaker: 'lecturer', text: 'ATIS から駐機場まで、1 回の飛行の交信を全部、順番に聞きます。意味と理由も一緒に。', next: 'f0:0' };
    const lines = [];
    for (const g of R.FLIGHT) {
      lines.push({ text: `${g.t}（${g.freq}）`, say: null });
      for (const [who, en, ja] of g.lines) if (en) lines.push({ text: `${who === 'P' ? 'あなた' : who}：“${callFix(en)}” ── ${callFix(ja)}`, say: callFix(en) });
    }
    lines.forEach((l, i) => { N[`f0:${i}`] = { speaker: 'lecturer', text: l.text, ...(l.say ? { hook: { name: 'say', arg: l.say } } : {}), next: i < lines.length - 1 ? `f0:${i + 1}` : 'k4:end' }; });
    N['k4:end'] = { speaker: 'lecturer', text: 'That\'s the whole flight. 型が見えてきましたか？ 実際の飛行でも、同じ順番で交信します。', hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'pass' }], end: true };
  } else {
    if (k === 'k2') questions = pfdPictures(seed).map((p, i) => readQuestion(p, i, r));
    if (k === 'k3') questions = R.drill(10, r, 'all').map(x => ({ q: callFix(x.q), opts: x.opts.map(callFix), ok: x.opts.indexOf(x.ok), why: callFix(x.why), say: x.say ? callFix(x.say) : undefined }));
    if (k === 'k5') questions = pick(R.SCENES, 10, r).map(sc => { const o = shuffled(sc.options.map((t, j) => ({ t: callFix(t), ok: j === sc.answer })), r); return { q: `${sc.title}：${sc.situation}${sc.atc ? `　聞こえた：“${callFix(sc.atc)}”` : ''}　${sc.q}`, opts: o.map(x => x.t), ok: o.findIndex(x => x.ok), why: sc.why, say: sc.atc ? callFix(sc.atc) : undefined }; });
    if (k === 'k6') questions = R.listen(10, r).map(x => ({ q: `（英語を聞いて）${callFix(x.q)}`, opts: x.opts.map(callFix), ok: x.opts.indexOf(x.ok), why: callFix(x.why), say: callFix(x.say) }));
    N.intro = { speaker: 'lecturer', text: k === 'k2' ? '画面の PFD を読んで答えてください。10 問、80% で合格です。' : k === 'k6' ? '英語の指示が流れます。聞いて、内容を選んでください。10 問、80% で合格です。' : '10 問です。80% で合格。Take your time.', next: 'q0' };
    quizNodes(N, questions, {});
    resultNodes(N, 'lecturer', `Excellent! ${k} は合格です。`, 'Not yet. 大丈夫、間違えたところを見直して、もう一度やりましょう。明日また来てください。');
    flags = questions.map((_, i) => `qz_${i}`);
  }
  return { speakers: SPEAKERS, flags, hooks: [...SCHOOL_HOOKS], dialogs: { ftd: { start: 'hello', nodes: N } }, questions: questions || [] };
}

// ---------------------------------------------------------------- the written tests
// (exam: another test's settings — the tablet's practice: one bank, ten questions)
export function examDialogs(FL, id, { seed = 1, speaker, exam = null } = {}) {
  const E = exam || EXAMS[id]; if (!E) throw new Error(`examDialogs: no test ${id}`);
  const r = rng(seed * 17 + id.length), who = speaker || (id === 'written1' ? 'lecturer' : 'instructor'), book = gameBook(FL);
  // drawn evenly from the banks
  const per = Math.ceil(E.n / E.banks.length), pool = [];
  for (const b of E.banks) pool.push(...pick((FL.quiz.BANKS.find(x => x.id === b) || { qs: [] }).qs, per, r));
  const qs = pick(pool, E.n, r).map(fromBank(book, r));
  const N = {};
  N.hello = { speaker: who, text: `${E.title}です。${E.n} 問、${E.pass}% 以上で合格。答えを選ぶと、すぐに正解と理由を言います。`, hook: { name: 'look', arg: 'player' }, next: 'q0' };
  quizNodes(N, qs, { speaker: who });
  resultNodes(N, who, E.ok || (id === 'presolo' ? '合格です。これで、ソロ前の審査に進めます。' : '合格です。おめでとうございます。来週から、いよいよ実機の訓練です。'),
    '今回は届きませんでした。間違えた問題の理由を、教科書でもう一度確かめてください。また受けられます。');
  return { speakers: SPEAKERS, flags: qs.map((_, k) => `qz_${k}`), hooks: [...SCHOOL_HOOKS], dialogs: { exam: { start: 'hello', nodes: N } }, questions: qs };
}
// the score of a finished quiz from its state's flags
export const scoreOf = (state, n) => { let right = 0; for (let k = 0; k < n; k++) if (state.flags[`qz_${k}`]) right++; const pct = n ? Math.round(right / n * 100) : 0; return { right, n, pct, pass: pct >= PASS }; };

// ---------------------------------------------------------------- the navigation log (M6: the solo cross-country's morning)
// 早瀬 教官 and the cadet plan the leg the solo cross-country is planned on (LAB → LAB-B, by LAB-A: FLIGHT LAB's n2,
// whose diversion to LAB-F comes in the air): its true course
// and distance off the chart, the magnetic course (the variation: 6° W, added), the wind (the day's winds aloft) and
// the heading that holds the course, the ground speed, the time and the fuel. Each a question with the right number
// and the usual mistakes (the correction the wrong way, true for magnetic, the wind forgotten); 80% to pass.
export const NAVLOG = { from: 'LABRW', to: 'LABEB', tas: 105, windFrom: 330, windKt: 15, varW: 6, gph: 10, reserveMin: 30 };
export function navlogNumbers(FL, o = NAVLOG) {
  const A = FL.avionics, a = A.wpt(o.from), b = A.wpt(o.to), DEG = Math.PI / 180;
  const tc = ((Math.atan2(b.e - a.e, b.n - a.n) / DEG) + 360) % 360, dist = Math.hypot(b.e - a.e, b.n - a.n) / 1852;
  const mc = (tc + o.varW) % 360, rel = (o.windFrom - mc) * DEG;
  const wca = Math.asin(o.windKt * Math.sin(rel) / o.tas) / DEG, mh = (mc + wca + 360) % 360;
  const gs = o.tas * Math.cos(wca * DEG) - o.windKt * Math.cos(rel), ete = dist / gs * 60, fuel = (ete + o.reserveMin) / 60 * o.gph;
  return { tc, dist, mc, wca, mh, gs, ete, fuel, from: a, to: b };
}
export function navlogDialogs(FL, { seed = 1 } = {}) {
  const r = rng(seed * 41 + 7), x = navlogNumbers(FL), o = NAVLOG, d3 = (v) => String(Math.round((v + 360) % 360) || 360).padStart(3, '0');
  const opts = (right, wrong) => { const all = shuffled([right, ...wrong.filter(w => w !== right)].slice(0, 4), r); return { opts: all, ok: all.indexOf(right) }; };
  const Q = [];
  const mcO = opts(`${d3(x.mc)}°`, [`${d3(x.tc)}°`, `${d3(x.tc - o.varW)}°`, `${d3(x.mc + 180)}°`]);
  Q.push({ q: `地図に引いた線（${x.from.name.replace(/（架空）/, '')} → ${x.to.name.replace(/（架空）/, '')}）は、真方位 ${d3(x.tc)}°・${x.dist.toFixed(1)} NM。偏差は 6° W です。磁方位のコース（MC）は？`, ...mcO,
    why: `西偏差は足します（"West is best"）。${d3(x.tc)} ＋ 6 ＝ ${d3(x.mc)}°。` });
  const wcaR = Math.round(x.wca), mhO = opts(`${d3(x.mh)}°`, [`${d3(x.mc - x.wca)}°`, `${d3(x.mc)}°`, `${d3(x.mh + 10)}°`]);
  Q.push({ q: `上空の風は ${d3(o.windFrom)}° から ${o.windKt} kt、真対気速度（TAS）は ${o.tas} kt。コースを保つための磁針路（MH）は？`, ...mhO,
    why: `風は${wcaR < 0 ? '左' : '右'}から吹いているので、機首を風上（${wcaR < 0 ? '左' : '右'}）へ ${Math.abs(wcaR)}° 向けます（偏流修正角）。${d3(x.mc)} ${wcaR >= 0 ? '＋' : '−'} ${Math.abs(wcaR)} ＝ ${d3(x.mh)}°。` });
  const gsR = Math.round(x.gs), gsO = opts(`${gsR} kt`, [`${o.tas} kt`, `${Math.round(o.tas + (o.tas - x.gs))} kt`, `${o.tas - o.windKt} kt`]);
  Q.push({ q: `そのときの対地速度（GS）は？`, ...gsO, why: `${x.gs < o.tas ? '向かい風' : '追い風'}の成分の分だけ${x.gs < o.tas ? '遅く' : '速く'}なり、機首を風上に向けた分は少し遅くなります。約 ${gsR} kt。` });
  const eteR = Math.round(x.ete), eteO = opts(`${eteR} 分`, [`${Math.round(x.dist / o.tas * 60) === eteR ? eteR + 2 : Math.round(x.dist / o.tas * 60)} 分`, `${eteR * 2} 分`, `${Math.max(1, eteR - 4)} 分`]);
  Q.push({ q: `${x.dist.toFixed(1)} NM を対地速度 ${gsR} kt で。所要時間（ETE）は？`, ...eteO, why: `時間＝距離 ÷ 対地速度。${x.dist.toFixed(1)} ÷ ${gsR} × 60 ≒ ${eteR} 分（対気速度で割ると、風の分を忘れます）。` });
  const fR = x.fuel.toFixed(1), fO = opts(`${fR} gal`, [`${(x.ete / 60 * o.gph).toFixed(1)} gal`, `${((x.ete + 45) / 60 * o.gph).toFixed(1)} gal`, `${(o.gph).toFixed(1)} gal`]);
  Q.push({ q: `燃料の消費は 1 時間に ${o.gph} gal。昼間の有視界飛行の予備（30 分）を含めて、この区間に最低いるのは？（タキシーと上昇の分は別に足します）`, ...fO,
    why: `（${eteR} 分 ＋ 予備 30 分）÷ 60 × ${o.gph} ≒ ${fR} gal。予備は昼 30 分・夜 45 分。` });
  const N = {};
  N.hello = { speaker: 'instructor', text: '今日は単独の野外飛行です。その前に、ここで航法ログを作りましょう。地図に線を引いて、風の計算をして、時間と燃料。全部、自分の手で。', hook: { name: 'look', arg: 'player' }, next: 'hello:2' };
  N['hello:2'] = { speaker: 'instructor', text: '途中で目的地が変わることもあります。そのときに慌てないように、最初の計算をきちんと。', hook: { name: 'board', arg: 'navlog' }, next: 'q0' };
  quizNodes(N, Q, { speaker: 'instructor' });
  resultNodes(N, 'instructor', '航法ログは、これで大丈夫。午後、外部点検から始めてください。私は乗りません。無線は、ここで聞いています。', 'もう一度、計算を見直しましょう。午後までに直せば、今日飛べます。');
  return { speakers: SPEAKERS, flags: Q.map((_, k) => `qz_${k}`), hooks: [...SCHOOL_HOOKS], dialogs: { navlog: { start: 'hello', nodes: N } }, questions: Q, numbers: x };
}
