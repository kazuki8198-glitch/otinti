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
import { EXAMS, CLASSES, CLASS_FTD, PACE_IDS, heardSet, FTD_TITLES, weatherFor } from '../career/career.js';
import { BANK_ANSWERS, SCENE_ANSWERS, DRILL_ANSWERS, LISTEN_ANSWERS, NOTE_ANSWERS, EVENT_ANSWERS } from './answer-map.js';
import { SUMMARIES } from './lecture-summaries.js';
import * as TALK from './class-talk.js';
import { say } from './class-talk.js';

export const SCHOOL_HOOKS = ['board', 'pfd', 'say', 'quizEnd', 'done', 'look', 'nod', 'point', 'page', 'progress', 'book', 'pace', 'heard', 'ans', 'chair'];
const SPEAKERS = { lecturer: { name_ja: PEOPLE.lecturer.title, color: PEOPLE.lecturer.color }, instructor: { name_ja: PEOPLE.instructor.title, color: PEOPLE.instructor.color }, player: { name_ja: 'あなた', color: '#f2b632' },
  // (the classmates in the class)
  kiryu: { name_ja: PEOPLE.kiryu.title, color: PEOPLE.kiryu.color }, mori: { name_ja: PEOPLE.mori.title, color: PEOPLE.mori.color } };
// the textbook's chapters each class covers (part 1; its introduction is not in the game's book) and the question bank
// that goes with each chapter
export const CLASS_CHAPTERS = CLASSES;
export { FTD_TITLES };
export const PASS = 80;

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffled = (a, r) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = (a, n, r) => shuffled(a, r).slice(0, n);
const q = (s) => `「${s}」`;
// FLIGHT LAB's call sign in its radio and its textbook: the game's own (today's aircraft)
const callFix = (s) => ourCall(String(s || ''));
// FLIGHT LAB's question banks point at chapters as {ch:id}: the game's book numbers them
const refsIn = (book) => (t) => String(t || '').replace(/\{ch:([a-z0-9]+)\}/g, (m, id) => { const c = book.chapters.find(x => x.id === id); return c ? `第 ${c.n} 章` : '教科書'; });
const fromBank = (book, r, id) => ([text, opts, ok, why]) => { const fx = (t) => callFix(refsIn(book)(t)), o = shuffled(opts.map((t, j) => ({ t: fx(t), ok: j === ok })), r); return { ...(id ? { id } : {}), q: fx(text), opts: o.map(x => x.t), ok: o.findIndex(x => x.ok), why: fx(why) }; };

// a chain of lines (one node each) → its first node's id; the last goes on to `then`
function chain(N, id, lines, then, speaker = 'lecturer', firstMore = {}) {
  lines.forEach((text, i) => { N[i ? `${id}:${i}` : id] = { speaker, text, ...(i ? {} : firstMore), next: i < lines.length - 1 ? `${id}:${i + 1}` : then }; });
  return lines.length ? id : then;
}

// the questions: [{ q, opts, ok (the right one's index), why, say (English to speak), pfd (a picture's index) }]
// → nodes q0… and the end (the score said from ctx.quiz: { right, n, pct, pass }). A class asks its questions a few at a
// time (after each chapter): from / to pick the run of questions (ids stay q<k> for questions[k], numbered within the
// run), end: false leaves the run going on to `then` (the last run ends with q:end, the whole quiz scored); fitTo: a
// reason too long for that many characters is said over a few lines (q<k>:ok, q<k>:ok:1…); fitQ: a question too long
// too, its first lines before it (q<k>:p0…, the English to hear said from the first), the node with its choices still
// q<k> — the links already made to q<k> go to its first line (quizNodes → { entry }: the run's first)
export function quizNodes(N, questions, { speaker = 'lecturer', then = 'result', label = '', from = 0, to = questions.length, end = true, fitTo = 0, fitQ = false, words = null } = {}) {
  // (words: the class's own — { head(j, n), ok(j), ng(j, right in quotes) } for the j-th of the run)
  const W = words || { head: (j, n) => `第 ${j + 1} 問（${n} 問中）。`, ok: () => '正解です。', ng: (j, x) => `正しくは${x}です。` };
  const put = (id, text, next) => { const l = fitTo ? fit(text, fitTo) : [text]; l.forEach((t, j) => { N[j ? `${id}:${j}` : id] = { speaker, text: t, next: j < l.length - 1 ? `${id}:${j + 1}` : next, tag: 'material' }; }); };
  const parts = {}, entry = (k) => (parts[k] && parts[k].length > 1 ? `q${k}:p0` : `q${k}`);
  for (let k = from; k < to; k++) { const t = `${label ? label + '　' : ''}${W.head(k - from, to - from)}${questions[k].q}`; parts[k] = fitTo && fitQ ? fit(t, fitTo) : [t]; }
  for (let k = from; k < to; k++) {
    const x = questions[k], id = `q${k}`, nextQ = k < to - 1 ? entry(k + 1) : end ? 'q:end' : then, P = parts[k];
    const more = x.say ? { hook: { name: 'say', arg: x.say } } : x.pfd != null ? { hook: { name: 'pfd', arg: String(x.pfd) } } : {};
    P.slice(0, -1).forEach((t, j) => { N[`${id}:p${j}`] = { speaker, text: t, ...(j ? {} : more), tag: 'material', next: j < P.length - 2 ? `${id}:p${j + 1}` : id }; });
    // (M8: the questions and their reasons are the course's own words: 'material', said as written in the English mode)
    N[id] = { speaker, text: P[P.length - 1], ...(P.length > 1 ? {} : more), tag: 'material',
      choices: x.opts.map((t, j) => ({ text: t, next: j === x.ok ? `${id}:ok` : `${id}:ng`, effects: [...(j === x.ok ? [{ set: `qz_${k}` }] : []), ...(x.id ? [{ hook: 'ans', arg: `${x.id}|${j === x.ok ? 1 : 0}` }] : [])] })) };
    put(`${id}:ok`, `${W.ok(k - from)}${x.why || ''}`.trim(), nextQ);
    put(`${id}:ng`, `${W.ng(k - from, q(x.opts[x.ok]))}${x.why || ''}`.trim(), nextQ);
  }
  if (end) N['q:end'] = { speaker, text: (words && words.end) || '以上です。採点しますね。', hook: { name: 'quizEnd', arg: String(questions.length) }, next: then };
  // (the links made before to a question now said over lines: to its first)
  const to1 = (t) => { const m = /^q(\d+)$/.exec(t || ''); return m && parts[+m[1]] && parts[+m[1]].length > 1 ? entry(+m[1]) : t; };
  for (const [nid, n] of Object.entries(N)) {
    if (/^q\d+:p\d+$/.test(nid)) continue;
    if (n.next) n.next = to1(n.next);
    if (n.else) n.else = to1(n.else);
    for (const c of [...(n.choices || []), ...(n.keys || [])]) if (c.next) c.next = to1(c.next);
  }
  return { entry: from < to ? entry(from) : then };
}
const resultNodes = (N, speaker, passText, failText, endText) => {
  if (endText && N['q:end']) N['q:end'].text = endText;
  N.result = { speaker, text: '{quiz.right} / {quiz.n} 問、{quiz.pct}% でした。', next: 'result:pass' };
  N['result:pass'] = { speaker, text: passText, if: { ctx: 'quiz.pass', is: true }, else: 'result:fail', hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'pass' }], end: true };
  N['result:fail'] = { speaker, text: failText, effects: [{ hook: 'done', arg: 'fail' }], end: true };
};

// ---------------------------------------------------------------- a class (index into CLASS_CHAPTERS)
// The class reads the day's chapters with the cadet, in the textbook's order, at the pace the cadet chooses:
//   need  (今日の訓練に要るところ): the sections of the afternoon's training device lesson and of the first flight's
//         lessons (t1, a1, t3: the book's sections FLIGHT LAB's syllabus gives them) read in full, the rest as in quick;
//   full  (じっくり): the whole textbook;
//   quick (要点だけ): each section's key points — every ここが大切 (a short summary where the book has none), its figure
//         in a line, and every line that answers a question chapter 1 can ask from it (content/answer-map.js: so what
//         is asked later has been said, whatever the pace).
// A section read in full is: its page on briefing room 2's screen (hook 'page': the section, or secId#k for its k-th
// unit of content/lecture-units.js, drawn by world/lecture-screen.js; the whiteboard shows its ここが大切) and the class's
// place in the course kept (hook 'progress': the section's index in the class, so a class left midway goes on from
// there); the title; ミラー 講師's own introduction (content/lecture-notes); every unit of the book as it comes —
// paragraphs and list items sentence by sentence, ここが大切 said as such (tag 'key'), 考えてみよう asked (a choice:
// think first, or hear the answer), cautions, formulas, figures (on the screen, the caption said), tables row by row,
// the radio's English spoken ('say'); then her notes (tag 'note') and a check of her own (not scored); then the choice:
// on, the section again, the section in the textbook (hook 'book'), or a break (the class left there, its place the
// next section: the talk ends, and the next talk offers to go on from it; not after the class's last section). Every
// section, at either pace, says when it is over that it was heard (hook 'heard': secId|f in full, secId|q its key
// points). Each chapter ends with two questions on its own sections (scored: q<k> are questions[k]; each choice says
// what was answered: hook 'ans' id|1 or id|0); the questions come in another order each time the class is begun again.
// Index 0 of every choice goes on, so a run that always picks the first reaches the end.
const S = 'lecturer';
// the textbook's words as the lecturer says them: in です / ます where that is certain, short sentences joined, long ones
// split (at up to LECTURE_LINE characters), a sentence that names FLIGHT LAB's controls or pages left out (instructor.js
// speechLines); today's call sign; and no subtitle longer than LINE_MAX (the box holds three rows: a longer line is cut,
// fit). "この教材の Archer" (FLIGHT LAB's model of it) is the Archer of the book in her hands; the book's example of a
// call sign too short to shorten (Archer Seven Lima Alpha, three characters) does not hold for today's, so she gives
// today's shortened as the controller would; the book's aside on what kind of section it is (radio.listen: "（この節は
// 教材としての…）") is the book's, not hers; "教官に伝える" is the flight instructor the cadet tells, not her (speakable
// would make it "わたしに伝えて", as 早瀬 教官 says it)
const LECTURE_LINE = 110;
export const LINE_MAX = 120;
const inClass = (t) => String(t ?? '').replace(/教官に伝える(?=。|$)/g, '教官に伝えてください')
  .replace(/この教材の(\s*Archer)/g, '教科書の$1').replace(/（この節は教材としての[^（）]*）/g, '')
  // (the book's word for itself, in its figures' captions and values — 教材モデル, 教材値 — is the textbook, as she says it)
  .replace(/教材モデル/g, '教科書のモデル').replace(/教材値/g, '教科書の値').replace(/教材用近似/g, '教科書用の近似').replace(/教材/g, '教科書')
  .replace(/「(Archer|Seminole) Seven Lima Alpha」\s*→\s*「\1 Seven Lima Alpha（3 文字なのでそのまま）」/g, () => `「${CALL.full}」 → 「${CALL.spokenShort}」`);
// a line cut to fit the subtitle box: at a sentence's end, else a comma, else after a closing bracket (not before a
// particle), else before a quotation, else after a ・, else after an English comma, else at a space, else before a
// bracket; outside quotes and brackets where it can, nearest the middle, neither part under FIT_MIN characters
const FIT_MIN = 8, OPENS = '（(「『“', CLOSES = '）)」』”';
const CUTS = [/[。！？]/g, /[、，]/g, /[）」』”](?:[：:・]|(?=[^\sぁ-ゖ。、，．）)」』”：:・!?！？.,]))/g, /(?=[「『“])/g, /・/g, /, /g, / /g, /(?=[（(])/g];
export function fit(line, max = LINE_MAX) {
  const s = String(line ?? '').trim();
  if (s.length <= max) return s ? [s] : [];
  const depth = []; let d = 0;                                     // depth[i]: the brackets open where a cut before s[i] falls
  for (let i = 0; i <= s.length; i++) { depth[i] = d; const c = s[i]; if (OPENS.includes(c)) d++; else if (c && CLOSES.includes(c)) d = Math.max(0, d - 1); }
  for (const strict of [true, false]) for (const re of CUTS) {
    const at = [...s.matchAll(re)].map(m => m.index + m[0].length).filter(c => c >= FIT_MIN && s.length - c >= FIT_MIN && (!strict || depth[c] === 0));
    if (!at.length) continue;
    const mid = s.length / 2, c = at.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
    return [...fit(s.slice(0, c), max), ...fit(s.slice(c), max)];
  }
  return [s.slice(0, max), ...fit(s.slice(max), max)];                // (nowhere to cut: never in the book)
}
// the lines of a text, in groups: one group for each of speechLines' lines (a sentence or a few joined), the parts
// fit cut it into (a quick summary keeps a group whole)
export const lectureGroups = (text, o = {}) => speechLines(inClass(text), { max: LECTURE_LINE, ...o }).map(callFix)
  .map(l => l.replace(/([。！？.!?])([）」』”])。$/, '$1$2')).map(l => fit(l)).filter(g => g.length);   // （…です。）, “….” are not closed twice
export const lectureLines = (text, o = {}) => lectureGroups(text, o).flat();
const JA = /[぀-ヿ一-鿿]/;
// (a line in English alone is the textbook's mnemonic: said as one)
const mnemonic = (l) => (JA.test(l) ? l : `英語の覚え方もあります。“${l.replace(/[.。]$/, '')}”。`);
const first = (lines, p) => (lines.length ? [...fit(p + lines[0]), ...lines.slice(1)] : lines);
const qq = (t) => '「' + String(t).replace(/「/g, '『').replace(/」/g, '』') + '」';   // a title in quotes (its own quotes become 『』)
// a line that leads into a list or a table, its "：" left off: a bare phrase (AIM の決まり) gets its です
export function leadLines(lead) {
  const l = lectureLines(leadText(lead)), k = l.length - 1;
  if (k >= 0 && /。$/.test(l[k]) && !/(?:です|ます|ません|ください|でしょう)。$/.test(l[k].replace(/\s*[（(][^（）()]*[）)](?=。$)/g, ''))) l[k] = l[k].replace(/。$/, 'です。');
  return l;
}
// the table's marks in words (×1.01 is a number, not a mark)
// (○ パワーと姿勢 → できます（パワーと姿勢）; a note's own brackets become ・ inside the new ones)
const MARKS = { '○': 'できます', '△': '少しだけできます', '×': 'できません' };
const cellWords = (v) => {
  const t = v.replace(/^[—–]\s*（(.+)）$/, '$1'), m = /^([○△×])(?![\d.])\s*(.*)$/.exec(t);   // —（VFR 不可） → VFR 不可
  if (!m) return t;
  const note = m[2].trim();
  return MARKS[m[1]] + (!note ? '' : /^（[^（）]*）$/.test(note) ? note : `（${note.replace(/（([^（）]*)）/g, '・$1')}）`);
};
// a row of a table as a sentence: "first cell：heading は value、…" (a two-column table: "first：second"). A cell's own
// sentences are joined with 、 (the next heading does not land on its second sentence); a heading the cell begins with
// already (高度計・昇降計 → 高度計は止まる…) is not said twice; after the first row, a heading's note in brackets is left
// off (意味（PCG の定義の要約） → 意味)
function rowText(head, row, k = 0) {
  const c = row.map(x => String(x ?? '').trim().replace(/。$/, '')), val = (v) => v && !/^[—–-]$/.test(v);
  if (!head || head.length < 2 || c.length < 2) return c.filter(val).join('、') + '。';
  const hd = (h) => (k > 0 && h.replace(/\s*[（(][^（）()]*[）)]$/, '')) || h;
  const rest = c.slice(1).map((v, j) => [hd(head[j + 1] || ''), v]).filter(([, v]) => val(v)).map(([h, v]) => [h, cellWords(v)]);
  rest.forEach((x, j) => { if (j < rest.length - 1) x[1] = x[1].replace(/。(?=.)/g, '、'); });
  if (c.length === 2) return `${c[0]}：${rest.map(([, v]) => v).join('')}。`;
  const dup = (h, v) => h.split(/[・／/]/).some(p => p && v.startsWith(p + 'は'));
  const sp = (t) => (/[A-Za-z0-9]$/.test(t) ? ' ' : '');                        // FAA は (the book's spacing)
  return `${c[0]}：${rest.map(([h, v]) => (h && !dup(h, v) ? `${h}${sp(h)}は${/^[A-Za-z0-9“"]/.test(v) ? ' ' : ''}${v}` : v)).join('、')}。`;
}
// English in parts of up to `max` characters: whole sentences while they fit, else cut at a comma near the middle
function enParts(en, max) {
  if (en.length <= max) return [en];
  const out = [];
  for (const s of en.split(/(?<=[.!?])\s+(?=[A-Z])/)) { const l = out[out.length - 1]; if (l !== undefined && l.length + 1 + s.length <= max) out[out.length - 1] = `${l} ${s}`; else out.push(s); }
  return out.flatMap(s => {
    const cuts = s.length > max ? [...s.matchAll(/, /g)].map(m => m.index + 1) : [];
    if (!cuts.length) return [s];
    const mid = s.length / 2, c = cuts.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
    return [...enParts(s.slice(0, c).trim(), max), ...enParts(s.slice(c).trim(), max)];
  });
}
// a row of an exchange [誰, 英語, 意味]: the English on a line of its own, spoken ('say'; a long one — the ATIS — a few
// sentences a line, each line spoken), then what it means on the next (a row whose "English" is a note in Japanese,
// such as listening to the ATIS first, is said as it is)
function radioSteps(row) {
  const [who = '', en = '', ja = ''] = row.map(x => String(x ?? '').trim());
  if (!/[A-Za-z]/.test(en) || JA.test(en.replace(/“[^”]*”/g, ''))) return fit(callFix(`${who ? who + '：' : ''}${en}${ja ? `　${ja}` : ''}`)).map(text => ({ text }));
  const lead = who ? `${who}：` : '';
  const out = enParts(callFix(en), LINE_MAX - lead.length - 2).map((p, k) => ({ text: `${k ? '' : lead}“${p}”`, hook: { name: 'say', arg: p } }));
  if (ja) out.push(...fit(callFix(/^[（(]/.test(ja) ? ja : `意味：${ja}`)).map(text => ({ text })));
  return out;
}
// the whole radio calls a line of an ordinary table quotes (three words or more), to be spoken with it: a call with a
// blank to fill in (“… to the (方向) …”) is a pattern, not a call, and is not spoken
function callsIn(line) {
  const calls = [...String(line).matchAll(/“([^”]*)”/g)].map(m => m[1].trim())
    .filter(s => !/\([^)]*[^\x00-\x7F][^)]*\)/.test(s) && !JA.test(s) && s.split(/\s+/).length >= 3).map(s => s.replace(/[()]/g, ''));
  return calls.length ? calls.join(' ') : null;
}
// a table's rows as lines: each row a sentence (rowText), a short one joined to its neighbour as speechLines joins short
// sentences; in a long table of short rows (the alphabet) a few whole rows to a line
function tableLines(u) {
  const long = u.rows.length > 6;
  const lines = u.rows.flatMap((row, k) => { const l = lectureLines(rowText(u.head, row, k)); return l.map(text => ({ text, say: callsIn(text), whole: l.length === 1, row: k })); });
  const joined = lines.reduce((o, l) => {
    const p = o[o.length - 1], a = p ? p.text.length : 0, b = l.text.length;
    if (p && (((a < 20 || b < 16) && a + b <= 60) || (long && p.whole && l.whole && b <= 56 && a + b <= LECTURE_LINE))) o[o.length - 1] = { text: p.text + l.text, say: [p.say, l.say].filter(Boolean).join(' ') || null, whole: p.whole && l.whole, row: p.row };
    else o.push({ ...l });
    return o;
  }, []);
  // (a row cut over two lines keeps its two lines together: one group)
  return joined.map(l => ({ text: l.text, g: `t${l.row}`, ...(l.say ? { hook: { name: 'say', arg: l.say } } : {}) }));
}
// a table at the quick pace: only its rows that hold an answer's words, each said up to the last column an answer needs
// ("A：言い方は Alfa" without the pronunciation columns), short ones a few to a line as tableLines joins them
function quickTable(u, want) {
  const has = (t) => want.some(w => squash(t).includes(w) || w.includes(squash(t)));
  const rows = [];
  u.rows.forEach((row, k) => {
    const whole = lectureLines(rowText(u.head, row, k)).join('');
    if (!want.some(w => squash(whole).includes(w))) return;
    let cut = 1;
    for (let c = row.length - 1; c >= 1; c--) { const part = lectureLines(cutRow(u.head, row, k, c + 1)).join(''); if (!want.filter(w => squash(whole).includes(w)).every(w => squash(part).includes(w))) { cut = c + 1; break; } cut = c; }
    rows.push({ text: lectureLines(cutRow(u.head, row, k, cut + 1)).join(''), row: k });
  });
  void has;
  const joined = rows.reduce((o, l) => { const p = o[o.length - 1]; if (p && p.text.length + l.text.length <= LECTURE_LINE && (p.text.length <= 56 || l.text.length <= 56) && u.rows.length > 6) p.text += l.text; else o.push({ ...l }); return o; }, []);
  return joined.flatMap(l => fit(l.text).map(text => ({ text, g: `q${l.row}`, ...(callsIn(text) ? { hook: { name: 'say', arg: callsIn(text) } } : {}) })));
}
// a row said up to its n-th column (n ≥ 2: "first：heading は value"; a table of two columns as the book has it)
const cutRow = (head, row, k, n) => (n >= row.length ? rowText(head, row, k) : head && head.length > 2 && n === 2
  ? `${String(row[0]).trim()}：${(k > 0 && String(head[1]).replace(/\s*[（(][^（）()]*[）)]$/, '')) || head[1]}は ${cellWords(String(row[1]).trim().replace(/。$/, ''))}。` : rowText(head.slice(0, n), row.slice(0, n), k));
// what one unit of the book becomes: lines ({ text, g (its group within the unit), tag?, hook? }), or { think } for a
// question to ask
function unitSteps(u) {
  const out = [], add = (lines, g, more = {}) => { for (const t of lines) out.push(typeof t === 'string' ? { text: t, g, ...more } : { g, ...t, ...more }); };
  const groups = (gs, g, more = {}) => gs.forEach((lines, k) => add(lines, `${g}${k}`, more));
  if (u.sub) add(fit(callFix(`ここからは${qq(u.sub)}です。`)), 'h');
  if (u.lead) add(leadLines(u.lead), 'lead');
  switch (u.k) {
    case 'para': if (u.heading) add(fit(callFix(`ここからは${qq(u.text)}です。`)), 'h'); else groups(lectureGroups(u.text), 'p'); break;
    case 'list': u.items.forEach((it, i) => {
      const gs = lectureGroups(it.text), n = u.items.length;
      if (u.ordered && n > 1 && gs.length) gs[0] = first(gs[0], i === 0 ? 'まず、' : i === n - 1 ? '最後に、' : '次に、');
      gs.forEach((lines, k) => add(lines, `i${i}.${k}`));
    }); break;
    // every row (the radio's exchanges, the English spoken; the screen shows the table meanwhile)
    case 'table':
      add([u.radio ? '画面の交信の例を聞いてください。' : '画面の表を見てください。'], 'ann');
      if (u.radio) u.rows.forEach((row, k) => add(radioSteps(row), `r${k}`));
      else for (const l of tableLines(u)) out.push(l);
      break;
    case 'key': u.items.forEach((kp, i) => { const l = lectureLines(kp, { whole: true }).map(mnemonic); add(i === 0 ? first(l, 'ここが大切です。') : l, `k${i}`, { tag: 'key' }); }); break;
    // (a question's setting said as one: "…上げたい。操作は？" → "…上げたいとします。操作は？", not "…上げたいです")
    case 'think': { const qt = lectureLines(u.q).join('').replace(/たいです。(?=.)/g, 'たいとします。'); if (qt) out.push({ think: { q: qt, a: lectureLines(u.a) }, g: 'q' }); break; }
    case 'caution': add(first(lectureLines(u.text), `注意です。${u.label ? u.label + '：' : ''}`), 'c'); break;
    case 'formula': {
      const lines = u.lines && u.lines.length ? u.lines : [u.text];
      if (lines.some(l => /[＝=≒]/.test(l))) lines.forEach((l, i) => add(fit(callFix(`${i ? 'もう一つ、' : '式で書くと、'}${l}。`)), `f${i}`));
      else if (lines.every(l => /^["“]/.test(l))) {          // example calls: spoken
        add(['画面の例を聞いてください。'], 'ann');
        lines.forEach((l, i) => { for (const en of enParts(callFix(l.replace(/^["“]\s*|\s*["”]$/g, '')), LINE_MAX - 2)) out.push({ text: `“${en}”`, hook: { name: 'say', arg: en }, g: `e${i}` }); });
      } else add(fit(callFix(`画面の例を見てください。${lines.join(' ')}`)), 'f0');   // a literal string (a METAR)
      break;
    }
    case 'figure': { const l = first(lectureLines(String(u.caption || '').replace(/^図[：:]\s*/, '')), '画面の図を見てください。'); add(l.length ? l : ['画面の図を見てください。'], 'fig'); break; }
    case 'source': add(first(lectureLines(u.text), '出典：'), 's'); break;
    case 'see': add(fit(`関連して、${u.to.map(x => qq(x.label)).join('と')}も教科書で読んでおいてください。`), 'see'); break;
  }
  return out.filter(s => s.think || (s.text && !NOT_SPOKEN.test(s.text)));
}
// a section's book as the class says it in full: [{ text, tag?, hook?, m (its unit), g (its group in the unit), think? }]
export function sectionSteps(sec) {
  return lectureUnits(sec).flatMap((u, m) => unitSteps(u).map(s => ({ ...s, m, key: `${m}:${s.g}` })));
}
// a section's key points (the quick pace): every ここが大切, or the summary where the book has none (lecture-summaries);
// the first line said of each figure; every line holding the words of an answer (content/answer-map.js) — the whole
// group it is in (a row, a sentence cut in two); in the book's order
export function quickSteps(sec) {
  const steps = sectionSteps(sec), want = answerWords(sec.id), keep = new Set(), figs = new Set(), us = lectureUnits(sec);
  for (const s of steps) if (s.tag === 'key') keep.add(s.key);
  for (const w of want) for (const s of steps) if (!s.think && squash(s.text).includes(w)) keep.add(s.key);
  const out = [], tables = new Set();
  for (const s of steps) {
    if (s.think) continue;
    const u = us[s.m];
    // (a table's answers: its rows that hold them, each cut after the last column an answer needs)
    if (u && u.k === 'table' && !u.radio && keep.has(s.key)) { if (!tables.has(s.m)) { tables.add(s.m); out.push(...quickTable(u, want).map(t => ({ ...t, m: s.m, key: `${s.m}:${t.g}` }))); } continue; }
    if (keep.has(s.key)) out.push(s);
    else if (s.g === 'fig' && !figs.has(s.m)) { figs.add(s.m); out.push(s); }
  }
  const sum = steps.some(s => s.tag === 'key') ? [] : (SUMMARIES[sec.id] || []).flatMap(t => fit(callFix(t))).map((text, k) => ({ text, tag: 'key', m: null, g: `sum${k}`, key: `sum:${k}` }));
  return [...sum, ...out];
}
const squash = (s) => String(s ?? '').replace(/\s+/g, '');
// the words of every answer said in a section (all of chapter 1's questions that the section answers)
const WORDS = new Map();
export function answerWords(secId) {
  if (!WORDS.size) {
    const put = (a) => { if (a) for (const [s, w] of a) { if (!WORDS.has(s)) WORDS.set(s, new Set()); WORDS.get(s).add(squash(w)); } };
    for (const list of Object.values(BANK_ANSWERS)) for (const x of list) put(x.a);
    for (const a of [...Object.values(SCENE_ANSWERS), ...Object.values(DRILL_ANSWERS), ...Object.values(LISTEN_ANSWERS), ...Object.values(NOTE_ANSWERS), ...Object.values(EVENT_ANSWERS).flat()]) put(a);
  }
  return [...(WORDS.get(secId) || [])];
}
// the lecturer's notes for a section (content/lecture-notes), as far as they can be used: lines that are text (a line
// may be { text, page: 'fig:k' | 'tab:k' }: it is about the section's k-th figure or table, put on the screen while it
// is said), a check with 2–12 different choices and the right one among them
function notesOf(n) {
  const one = (t) => (typeof t === 'string' ? { text: t, page: null } : t && typeof t === 'object' && typeof t.text === 'string' ? { text: t.text, page: typeof t.page === 'string' ? t.page : null } : null);
  const lines = (a) => (Array.isArray(a) ? a.map(one).filter(x => x && x.text.trim()).map(x => ({ text: callFix(x.text.trim()), page: x.page })) : []);
  const a = n && n.ask, opts = a && Array.isArray(a.opts) ? a.opts.map(t => callFix(String(t ?? '').trim())) : [];
  const ask = a && typeof a.q === 'string' && a.q.trim() && opts.length >= 2 && opts.length <= 12 && opts.every(Boolean) && new Set(opts).size === opts.length
    && Number.isInteger(a.ok) && a.ok >= 0 && a.ok < opts.length ? { q: callFix(a.q.trim()), opts, ok: a.ok, why: callFix(String(a.why ?? '').trim()) } : null;
  return { intro: lines(n && n.intro), notes: lines(n && n.notes), ask };
}
// a note's 'fig:k' / 'tab:k' → the index of that unit among the section's lecture units (null: none such)
export function noteUnit(us, page) {
  const m = /^(fig|tab):(\d+)$/.exec(page || '');
  if (!m) return null;
  const k = us.flatMap((u, i) => (u.k === (m[1] === 'fig' ? 'figure' : 'table') ? [i] : []))[+m[2]];
  return k === undefined ? null : k;
}
// ---- a section as the class says it: a plan of entries, then its nodes
// Entries ({ k, id, …, stage }): a line ('line'); a question with a right answer and its reply ('ask': read off the
// table or the figure on the screen, what a call just heard meant, a check on what was just said — none scored); the
// prediction at the start ('pred': the lecturer's check of her notes, moved there, わかりません among its choices, the
// choice kept in the flag 'pr'); its answer at the end ('reveal', by what was chosen); 考えてみよう ('think': think
// first — then choose among answers — or hear it); the end ('end': a plain line, R / B / Q for the section again, the
// textbook, a break). Each says which part of the section it is (stage: 題 予想 導入 本文 大切 確認 補足 答え 区切り).
// The wording comes from content/class-talk.js, by the section's place in part 1 (g) and the k-th time within it.
export const DECISION_NODE = /^(q\d+|rv\d+|wu\d+|sq\d+)$|:(pr|tq|rq|fq|tc|ck|eq)$/;
const SEC_AT = new WeakMap();
// a section's place among all of chapter 1's (the classes in order)
function secAt(FL, id) {
  if (!SEC_AT.has(FL)) { const book = gameBook(FL), m = new Map(); for (const c of CLASS_CHAPTERS.flat()) for (const s of (book.chapters.find(x => x.id === c) || { sections: [] }).sections) m.set(s.id, m.size); SEC_AT.set(FL, m); }
  return SEC_AT.get(FL).get(id) ?? 0;
}
const cellText = (c) => callFix(String(c ?? '').trim().replace(/。$/, ''));
const plain = (t, max) => !!t && !/^[—–-]$/.test(t) && Array.from(t).length <= max && !NOT_SPOKEN.test(t) && !/[{}<>]/.test(t);
// a question read off a table on the screen (its first rows: a long table comes on the screen in parts): a row's cell in a
// column of short values, or, where the values are long, the row a value is in → { q, opts, right, said } | null
function tableAsk(u, r, n) {
  if (u.radio || !Array.isArray(u.rows) || u.rows.length < 3) return null;
  const rows = u.rows.slice(0, 6), head = (u.head || []).map(cellText), labels = rows.map(x => cellText(x[0]));
  if (new Set(labels).size !== labels.length || !labels.every(l => plain(l, 50))) return null;
  const others = (all, k) => shuffled([...new Set(all.filter((v, j) => j !== k && v !== all[k]))], r).slice(0, 2);
  const cols = Array.from({ length: Math.max(0, ...rows.map(x => x.length)) - 1 }, (_, c) => c + 1);
  for (const c of cols) {
    const vals = rows.map(x => cellText(x[c]));
    // (a column of sources — PCG, AIM — is not asked)
    if (!head[c] || /出典|ポイント/.test(head[c]) || !labels.every(l => plain(l, 30)) || !vals.every(v => plain(v, 34)) || new Set(vals).size < 3) continue;
    const ks = vals.map((_, k) => k).filter(k => vals.filter(v => v === vals[k]).length === 1), k = ks.length ? ks[Math.floor(r() * ks.length)] : -1;
    const o = k >= 0 ? others(vals, k) : [];
    if (o.length === 2) return { q: say(TALK.TABLE_ASK, n)(qq(labels[k]), qq(head[c])), opts: shuffled([vals[k], ...o], r), right: vals[k], said: vals[k], seen: true };
  }
  for (const c of cols) {
    const vals = rows.map(x => cellText(x[c]));
    if (/出典|ポイント/.test(head[c] || '') || !vals.every(v => plain(v, 60)) || new Set(vals).size !== vals.length) continue;
    const k = Math.floor(r() * rows.length), o = others(labels, k);
    if (o.length === 2) return { q: say(TALK.TABLE_WHICH, n)(qq(vals[k]), head[0] ? qq(head[0]) : ''), opts: shuffled([labels[k], ...o], r), right: labels[k], said: labels[k], seen: true };
  }
  return null;
}
// what a call of a radio example meant, once it has been heard (its rows: who, the English, the meaning): the rows that
// can be asked → [{ row, en, ja }], and the question on one (its wrong choices other rows' meanings)
function radioRows(u) {
  if (!u.radio || !Array.isArray(u.rows)) return [];
  const rows = u.rows.map((x, row) => ({ row, en: callFix(String(x[1] || '').trim()), ja: cellText(x[2]) })).filter(x => x.en && plain(x.ja, 40) && !/^[（(]/.test(x.ja));
  return rows.length >= 3 ? rows : [];
}
function radioAsk(rows, x, r, n) {
  const o = shuffled([...new Set(rows.map(y => y.ja).filter(j => j !== x.ja))], r).slice(0, 2);
  return o.length === 2 ? { q: say(TALK.RADIO_ASK, n)(`“${x.en}”`), opts: shuffled([x.ja, ...o], r), right: x.ja, said: x.ja } : null;
}
// the radio examples' questions of a section as checks (each after the step that says its row) → [{ id, after, radio }]
function radioChecks(sec, steps) {
  const us = lectureUnits(sec), out = [];
  us.forEach((u, m) => {
    const rows = radioRows(u); if (!rows.length) return;
    // (the steps of the unit, in order: radioSteps says each row in one or more lines, its English with a hook)
    const at = steps.map((s, k) => ({ s, k })).filter(x => x.s.m === m), byRow = new Map();
    let row = -1;
    for (const { s, k } of at) { if (/^r\d+$/.test(s.g)) row = +s.g.slice(1); if (row >= 0) byRow.set(row, k); }
    for (const x of rows) if (x.en.length <= 80 && byRow.has(x.row)) out.push({ id: `radio:${sec.id}#${m}:${x.row}`, after: byRow.get(x.row), radio: { rows, x } });
  });
  return out;
}
// a section's checks: the questions of chapter 1 whose answer it says (their other sections heard before), each with the
// step after which it may be asked (the last holding its answer's words) → [{ id, raw, after }]
function sectionChecks(FL, sec, steps, known) {
  const out = [];
  for (const x of questionPool(FL)) {
    if (x.note || !x.secs.includes(sec.id) || !x.secs.every(s => s === sec.id || known.has(s))) continue;
    const [b, i] = x.id.split('#'), a = (BANK_ANSWERS[b] && BANK_ANSWERS[b][+i] && BANK_ANSWERS[b][+i].a) || [];
    let after = -1;
    for (const [s, w] of a) { if (s !== sec.id) continue; const k = steps.findIndex(st => !st.think && squash(st.text).includes(squash(w))); if (k < 0) { after = -2; break; } after = Math.max(after, k); }
    if (after >= 0) out.push({ id: x.id, raw: x.raw, after });
  }
  return out;
}
// the entries of a section read in full. o: { base, g (its place in part 1), j, of (its place in its chapter), idx (in
// the class), nt (the notes), r, book, order (0–3: the prediction before or after the introduction; the answer before
// or after the notes), checks (Map: step index → a check entry) }
function fullEntries(sec, o) {
  const { base, g, j, of, idx, nt, r } = o, E = [], us = lectureUnits(sec), steps = sectionSteps(sec), t = qq(sec.title);
  const n = (k) => g * 7 + k, cnt = {}, nth = (slot) => n(cnt[slot] = (cnt[slot] ?? -1) + 1);
  const title = of === 1 ? `${t}です。` : j === 0 ? say(TALK.TITLE_FIRST, o.ci)(t) : j === of - 1 ? say(TALK.TITLE_LAST, o.ci)(t) : say(TALK.TITLE, g)(t);
  E.push({ k: 'line', id: base, text: title, effects: [{ hook: 'page', arg: sec.id }, { hook: 'progress', arg: String(idx) }], stage: '題' });
  const pageOf = (x) => { const m = noteUnit(us, x.page); return m === null ? undefined : [{ hook: 'page', arg: `${sec.id}#${m}` }]; };
  const intro = nt.intro.map((x, k) => ({ k: 'line', id: `${base}:i${k}`, text: x.text, effects: pageOf(x), stage: '導入' }));
  const pred = nt.ask ? predEntry(`${base}:pr`, nt.ask, r, g) : null;
  // (桐生 answers first, every third section: right more often than not; the lecturer then asks the cadet)
  let kiryu = null;
  if (pred && g % 3 === 1) {
    const right = r() < 0.6, opt = right ? pred.right : pred.opts.find(x => !x.ok).t;
    // (his turn's place among the sections he answers in: g / 3, so each wording comes in turn)
    const kt = Math.floor(g / 3), quoted = /^「.*」$/.test(opt) ? opt : q(opt);
    kiryu = { right, kt, lines: [{ k: 'line', id: `${base}:pr:q`, text: pred.text, effects: undefined, stage: '予想' }, { k: 'line', id: `${base}:pr:k`, speaker: 'kiryu', text: say(TALK.KIRYU_GUESS, kt)(quoted), stage: '予想' }] };
    pred.text = say(TALK.PRED_YOU, kt);
  }
  const predE = pred ? [...(kiryu ? kiryu.lines : []), pred] : [];
  if (o.order & 1) E.push(...intro, ...predE); else E.push(...predE, ...intro);
  const shown = new Set(), figs = us.map((u, m) => (u.k === 'figure' ? us.slice(0, m).filter(x => x.k === 'figure').length : -1));
  steps.forEach((s, k) => {
    const m = s.m, u = us[m], id0 = `${base}:u${m}`, before = steps.slice(0, k).filter(x => x.m === m).length, id = before ? `${id0}:${before}` : id0;
    const eff = shown.has(m) ? undefined : [{ hook: 'page', arg: `${sec.id}#${m}` }]; shown.add(m);
    const at0 = E.length;
    if (s.think) { E.push(thinkEntry(id, s.think, sec.id, r, nth('think'), eff)); }
    else if (s.g === 'ann' && u.k === 'table' && !u.radio) {
      const a = tableAsk(u, r, nth('table'));
      E.push(a ? askEntry(`${id}:tq`, a, nth('reply'), eff, '確認') : { k: 'line', id, text: say(TALK.TABLE_ANN, nth('ann')), effects: eff, stage: '本文' });
    } else if (s.g === 'ann') E.push({ k: 'line', id, text: say(u.radio ? TALK.RADIO_ANN : TALK.EX_ANN, nth('ann')), effects: eff, stage: '本文' });
    else if (s.g === 'fig') {
      // (the question read off the figure first, then its caption: the figure's own words after it)
      // (asked once, before the caption's first line)
      const a = before === 0 ? TALK.FIG_ASKS[`${sec.id}#${figs[m]}`] : null, text = s.text.replace(/^画面の図を見てください。/, TALK.FIG_ASKS[`${sec.id}#${figs[m]}`] ? '' : say(TALK.FIG_ANN, nth('fig')));
      if (a) E.push(askEntry(`${id}:fq`, { q: callFix(a.q), opts: shuffled(a.opts, r), right: a.opts[0], said: a.opts[0], why: a.why, seen: true }, nth('reply'), eff, '確認'));
      if (text) E.push({ k: 'line', id, text, effects: a ? undefined : eff, stage: '本文' });
    } else if (s.g === 'h') E.push({ k: 'line', id, text: s.text.replace(/^ここからは(「.*」)です。$/, (w, x) => say(TALK.SUB, nth('sub'))(x)), effects: eff, stage: '本文' });
    else if (s.tag === 'key' && s.text.startsWith('ここが大切です。')) E.push({ k: 'line', id, text: say(TALK.KEY, nth('key')) + s.text.slice('ここが大切です。'.length), tag: 'key', hook: s.hook, effects: eff, stage: '大切' });
    else E.push({ k: 'line', id, text: s.text, tag: s.tag, hook: s.hook, effects: eff, stage: s.tag === 'key' ? '大切' : '本文' });
    // (a check may follow only where the line's group ends: never between a call and its meaning, or inside a sentence)
    const brk = k === steps.length - 1 || steps[k + 1].m !== m || steps[k + 1].g !== s.g;
    for (const e of E.slice(at0)) { e.step = k; e.brk = brk; }
    if (o.checks && o.checks.has(k)) E.push(o.checks.get(k));
  });
  const notes = nt.notes.map((x, k) => ({ k: 'line', id: `${base}:n${k}`, text: x.text, tag: 'note', effects: pageOf(x), stage: '補足', step: steps.length + k, brk: true }));
  // (森's question before her note on a common mistake, every other section that has one: in the note's own words)
  if (g % 2 === 0) for (const [k, e] of notes.entries()) { const m = moriAsks(e.text, Math.floor(g / 2)); if (m) { notes.splice(k, 0, { k: 'line', id: `${base}:n${k}:m`, speaker: 'mori', text: m, stage: '補足' }); break; } }
  for (const e of notes) if (o.checks && o.checks.has(e.step)) e.then = o.checks.get(e.step);
  const reveal = pred ? revealEntry(`${base}:rv`, pred, g) : null;
  if (reveal && kiryu && !kiryu.right) reveal.after = { k: 'line', id: `${base}:rv:k`, speaker: 'kiryu', text: say(TALK.KIRYU_MISS, kiryu.kt), stage: '答え' };
  const withChecks = notes.flatMap(e => (e.then ? [e, e.then] : [e]));
  const rv = reveal ? [reveal, ...(reveal.after ? [reveal.after] : [])] : [];
  if (o.order & 2) E.push(...rv, ...withChecks); else E.push(...withChecks, ...rv);
  E.push({ k: 'end', id: `${base}:end`, text: say(TALK.END, g)(t), effects: [{ hook: 'heard', arg: `${sec.id}|f` }], keys: true, stage: '区切り' });
  return E;
}
// the entries of a section as its key points (quickSteps): the title with its first line, the key points (each unit on
// the screen as it is said), the last saying it was heard; a prediction and its answer where the class needs a choice
// by then (o.pred), and the checks (o.checks: quick step index → entry)
function quickEntries(sec, o) {
  // (the title, ここが大切 and the figure each said in words of their own from section to section: brief §7)
  let n = (o.g || 0) * 3;
  const steps = quickSteps(sec).map(l => (l.tag === 'key' && l.text.startsWith('ここが大切です。') ? { ...l, text: say(TALK.KEY, n++) + l.text.slice('ここが大切です。'.length) }
    : l.text.startsWith('画面の図を見てください。') ? { ...l, text: say(TALK.FIG_ANN, n++) + l.text.slice('画面の図を見てください。'.length) } : l));
  const head = say(TALK.QUICK_TITLE, o.g || 0)(q(sec.title)), lines = [{ text: head, m: null }, ...steps], { id } = o;
  // (the title and a short first line together, as before: then the k-th line is the k-th step)
  const merged = steps.length && `${head}${steps[0].text}`.length <= LINE_MAX && !steps[0].hook;
  if (merged) lines.splice(0, 2, { ...steps[0], text: `${head}${steps[0].text}` });
  const E = [];
  let shown = null;
  lines.forEach((l, k) => {
    const page = l.m === null || l.m === undefined ? (k === 0 ? sec.id : null) : `${sec.id}#${l.m}`;
    const eff = [...(page && page !== shown ? [{ hook: 'page', arg: page }] : []), ...(k === lines.length - 1 ? [{ hook: 'heard', arg: `${sec.id}|q` }] : [])];
    if (page) shown = page;
    const qk = merged ? k : k - 1, nx = lines[k + 1], brk = !nx || nx.m !== l.m || nx.g !== l.g;
    E.push({ k: 'line', id: k ? `${id}:${k}` : id, text: l.text, tag: l.tag, hook: l.hook, effects: eff.length ? eff : undefined, stage: '本文', ...(qk >= 0 ? { step: qk, brk } : {}) });
    if (k === 0 && o.pred) E.push(o.pred);
    if (o.checks && o.checks.has(qk)) E.push(o.checks.get(qk));
  });
  if (o.pred) E.push(revealEntry(`${id}:rv`, o.pred, o.g));
  return E;
}
// 森's question from the lecturer's note on a common mistake ("よくある間違いは、…ことです。" / "…は「…」です。"), or null
function moriAsks(text, g) {
  let m = /^よくある(?:勘違い|誤り|間違い)は「([^」]+)」(?:と考えること|と思うこと)?です。/.exec(text);
  if (m) return say(TALK.MORI_THINK, g)(q(m[1]));
  m = /^よくある(?:勘違い|誤り|間違い)は、?([^。「」]{4,60}?)ことです。/.exec(text);
  if (!m || /ことと|“|”|『/.test(m[1])) return null;
  return say(TALK.MORI_DO, g)(m[1].replace(/、$/, ''));
}
function predEntry(id, x, r, g) {
  const opts = shuffled(x.opts.map((t, i) => ({ t, ok: i === x.ok })), r);
  return { k: 'pred', id, text: `${say(TALK.PRED, g)}${x.q}`, opts, dunno: say(TALK.DUNNO, g), ack: say(TALK.ACK, g * 3), praise: say(TALK.PRAISE, g * 3), right: x.opts[x.ok], why: x.why, stage: '予想' };
}
const revealEntry = (id, p, g) => ({ k: 'reveal', id, ok: `${say(TALK.REVEAL_OK, g)(q(p.right))}${p.why}`, ng: `${say(TALK.REVEAL_NG, g)(q(p.right))}${p.why}`, dk: `${say(TALK.REVEAL_DK, g)(q(p.right))}${p.why}`, stage: '答え' });
// a: { q, opts, right, said (the right one, said plainly in the reply), why?, id? (a scored bank question's: its answer kept) }
const bare = (t) => String(t).trim().replace(/[。.]$/, '');
// (a.seen: read off the screen — its replies say so)
const askEntry = (id, a, n, effects, stage) => ({ k: 'ask', id, text: a.q, opts: a.opts.map(t => ({ t, ok: t === a.right })), ok: `${say(a.seen ? TALK.SEEN_RIGHT : TALK.RIGHT, n)(bare(a.said))}${a.why || ''}`, ng: `${say(a.seen ? TALK.SEEN_WRONG : TALK.WRONG, n)(bare(a.said))}${a.why || ''}`, qid: a.id, effects, stage });
function thinkEntry(id, th, secId, r, n, effects) {
  const c = TALK.THINK_CHOICES[secId];
  return { k: 'think', id, text: `${say(TALK.THINK, n)}${th.q}`, effects, answer: th.a.length ? first(th.a, say(TALK.THINK_ANSWER, n)) : ['答えは、教科書のこの節にあります。'],
    cand: c ? { q: say(TALK.THINK_PICK, n), opts: shuffled(c.opts.map((t, i) => ({ t, ok: i === 0, why: i ? c.why[i - 1] : '' })), r), right: c.opts[0], n } : null, stage: '確認' };
}
// a check on what was just said: a question of chapter 1's (its answer kept: hook 'ans'), not scored
function checkEntry(book, r, x, id, n) {
  if (x.radio) { const a = radioAsk(x.radio.rows, x.radio.x, r, n); return a ? askEntry(id, a, n, undefined, '確認') : null; }
  const b = fromBank(book, r, x.id)(x.raw);
  return askEntry(id, { q: `${say(x.earlier ? TALK.RECALL : TALK.CHECK, n)}${b.q}`, opts: b.opts, right: b.opts[b.ok], said: b.opts[b.ok], why: b.why, id: x.id }, n, undefined, '確認');
}
// how long an entry is read (the measure's way: school.js readingSeconds, the English spoken at LINE_S) and whether it
// ends a stretch without a choice: [{ t, dec }] in the order read (a question: read, chosen, its reply read)
const LINE_EN = (en) => 1.2 + String(en).split(/\s+/).length * 0.32;
const lineT = (text, hook) => fit(text).reduce((s, l) => s + readingSeconds(l), 0) + (hook && hook.name === 'say' ? Math.max(0, LINE_EN(hook.arg) - readingSeconds(text)) : 0);
function timeline(e) {
  switch (e.k) {
    case 'pred': return [{ t: lineT(e.text), dec: true }, { t: Math.max(lineT(e.ack), lineT(e.praise)) }];
    case 'ask': return [{ t: lineT(e.text), dec: true }, { t: Math.max(lineT(e.ok), lineT(e.ng)) }];
    case 'reveal': return [{ t: Math.max(lineT(e.ok), lineT(e.ng), lineT(e.dk)) }];
    case 'think': return [{ t: lineT(e.text) }, ...(e.cand ? [{ t: lineT(e.cand.q), dec: true }, { t: lineT(say(TALK.RIGHT, e.cand.n)(e.cand.right)) }] : []), ...e.answer.map(l => ({ t: lineT(l) }))];
    default: return [{ t: lineT(e.text, e.hook) }];
  }
}
// the entries' nodes, in order; the first goes on from `open` (the nodes left waiting for what comes next), the last
// to `then`
function emit(N, E, then, { rest = null } = {}) {
  let open = [];
  const link = (id) => { for (const n of open) n.next = id; };
  const node = (id, n) => { N[id] = { speaker: S, ...n }; return N[id]; };
  // (a line too long for the box: its parts in turn, the first with the effects and the hook, the last left open)
  const lines = (id, text, more = {}, last = {}) => {
    const l = fit(text), { effects, hook, if: cond, else: other, ...rest2 } = more;
    l.forEach((t, k) => node(k ? `${id}:${k}` : id, { text: t, ...rest2, ...(k === 0 ? { ...(cond ? { if: cond, else: other } : {}), ...(effects ? { effects } : {}), ...(hook ? { hook } : {}) } : {}), ...(k < l.length - 1 ? { next: `${id}:${k + 1}` } : last) }));
    return N[l.length > 1 ? `${id}:${l.length - 1}` : id];
  };
  // (a question: the start of a long one said first, its end with the choices)
  const asked = (id, text, more, choices) => { const l = fit(text); if (l.length > 1) { const pre = lines(`${id}:pre`, l.slice(0, -1).join(''), more); link(`${id}:pre`); open = [pre]; } link(id); node(id, { text: l[l.length - 1], ...(l.length > 1 ? (more.tag ? { tag: more.tag } : {}) : more), choices }); open = []; };
  for (const e of E) {
    const tag = e.tag ? { tag: e.tag } : {}, eff = e.effects && e.effects.length ? { effects: e.effects } : {};
    if (e.k === 'line') { link(e.id); open = [lines(e.id, e.text, { ...tag, ...eff, ...(e.hook ? { hook: e.hook } : {}), ...(e.speaker ? { speaker: e.speaker } : {}) })]; continue; }
    if (e.k === 'pred') {
      asked(e.id, e.text, eff, [...e.opts.map(o => ({ text: o.t, next: `${e.id}:a`, effects: [{ set: 'pr', to: o.ok ? 'ok' : 'ng' }] })), { text: e.dunno, next: `${e.id}:d`, effects: [{ set: 'pr', to: 'dk' }] }]);
      open = [lines(`${e.id}:a`, e.ack), lines(`${e.id}:d`, e.praise, { hook: { name: 'nod' } })];
      continue;
    }
    if (e.k === 'ask') {
      asked(e.id, e.text, eff, e.opts.map(o => ({ text: o.t, next: o.ok ? `${e.id}:ok` : `${e.id}:ng`, ...(e.qid ? { effects: [{ hook: 'ans', arg: `${e.qid}|${o.ok ? 1 : 0}` }] } : {}) })));
      open = [lines(`${e.id}:ok`, e.ok, { hook: { name: 'nod' } }), lines(`${e.id}:ng`, e.ng)];
      continue;
    }
    if (e.k === 'reveal') {
      link(e.id);
      const a = lines(e.id, e.ok, { if: { flag: 'pr', is: 'ok' }, else: `${e.id}:ng`, hook: { name: 'nod' } }), b = lines(`${e.id}:ng`, e.ng, { if: { flag: 'pr', is: 'ng' }, else: `${e.id}:dk` }), c = lines(`${e.id}:dk`, e.dk);
      // (a node skipped by its if goes to its else: the line after the answer is the next of each one's last part)
      open = [a, b, c];
      continue;
    }
    if (e.k === 'think') {
      const a0 = `${e.id}:a0`;
      asked(e.id, e.text, { tag: 'think', ...eff }, e.cand ? [{ text: '考えてみます', next: `${e.id}:tc` }, { text: '答えを聞きます', next: a0 }] : [{ text: '考えてみます', next: `${e.id}:wait` }, { text: '答えを聞きます', next: a0 }]);
      if (e.cand) {
        node(`${e.id}:tc`, { text: e.cand.q, choices: e.cand.opts.map((o, k) => ({ text: o.t, next: o.ok ? `${e.id}:tc:ok` : `${e.id}:tc:ng${k}` })) });
        open = [lines(`${e.id}:tc:ok`, say(TALK.RIGHT, e.cand.n)(bare(e.cand.right)), { hook: { name: 'nod' } }), ...e.cand.opts.map((o, k) => (o.ok ? null : lines(`${e.id}:tc:ng${k}`, `${o.why}${say(TALK.WRONG, e.cand.n)(bare(e.cand.right))}`))).filter(Boolean)];
      } else open = [node(`${e.id}:wait`, { text: 'では、少し考えてみてください。……いいですか？' })];
      e.answer.forEach((t, k) => { link(`${e.id}:a${k}`); open = [node(`${e.id}:a${k}`, { text: t })]; });
      continue;
    }
    if (e.k === 'end') {
      const base = e.id.replace(/:end$/, '');
      link(e.id);
      node(e.id, { text: e.text, ...eff, next: then, keys: [{ key: 'R', text: 'この節をもう一度', next: base }, { key: 'B', text: '教科書でこの節を読む', next: `${base}:book` }, ...(rest ? [{ key: 'Q', text: 'ここで休憩する（続きはまた後で）', next: `${base}:break` }] : [])] });
      open = [];
    }
  }
  link(then);
}
// a section's order (the prediction before or after the introduction; the answer before or after the notes) and what
// parts it then has, in order (its stages, a part said twice in a row once) — so that no two sections in a row go the same
const stagesOf = (E) => E.map(e => e.stage).filter((s, k, a) => s && s !== a[k - 1]).join(' ');

// how long a line takes: typed at text speed ×1 (the subtitles' typewriter, ui/dialog-ui.js: 40 characters a second, a
// pause after punctuation); read by the cadet, who keeps up with the typing only on short lines (about 10 characters a
// second for a textbook's Japanese), then a second to go on. The class's "約 N 分" is the reading time
const TYPE_CPS = 40, READ_CPS = 10, LINE_S = 1;
const pauseAfter = (c) => ('。！？!?'.includes(c) ? 6 : '、，,：'.includes(c) ? 3 : c === '\n' ? 4 : '…―—'.includes(c) ? 1.5 : 0);
export const typingSeconds = (text) => Array.from(String(text ?? '')).reduce((s, c) => s + 1 + pauseAfter(c), 0) / TYPE_CPS;
export const readingSeconds = (text) => Math.max(typingSeconds(text), Array.from(String(text ?? '')).length / READ_CPS) + LINE_S;
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

// ---- the questions a class, a lesson or a test can ask (content/answer-map.js), and what has been heard
export const PACES = PACE_IDS;
const PACE_FLAG = { need: 'need', quick: 'quick' };
const chapterOfSec = (book, id) => { const s = book.section(id); return s ? s.chapter.id : null; };
// every scored question chapter 1 can ask: { id, home (its section), secs (every section its answer needs), raw }
// (FLIGHT LAB's bank questions as [text, choices, right, why]; the lecturer's own checks where a chapter has too few)
const POOLS = new WeakMap();
export function questionPool(FL) {
  if (POOLS.has(FL)) return POOLS.get(FL);
  const out = [];
  for (const [b, list] of Object.entries(BANK_ANSWERS)) {
    const bank = FL.quiz.BANKS.find(x => x.id === b); if (!bank) continue;
    list.forEach((x, i) => { if (x.a && bank.qs[i]) out.push({ id: `${b}#${i}`, home: x.a[0][0], secs: [...new Set(x.a.map(p => p[0]))], raw: bank.qs[i] }); });
  }
  for (const [sec, a] of Object.entries(NOTE_ANSWERS)) {
    const n = notesFor(sec), k = n && n.ask; if (!k) continue;
    out.push({ id: `note:${sec}`, home: sec, secs: [...new Set(a.map(p => p[0]))], raw: [k.q, k.opts, k.ok, k.why], note: true });
  }
  POOLS.set(FL, out);
  return out;
}
// the sections of the classes before class i (what a cadet who took them in order has heard)
export function sectionsBefore(FL, i) { const book = gameBook(FL); return CLASS_CHAPTERS.slice(0, i).flat().flatMap(id => (book.chapters.find(c => c.id === id) || { sections: [] }).sections.map(s => s.id)); }
const allHeard = (answer, known) => answer.every(([s]) => s === 'k1' || known.has(s));
// the sections the 'need' pace reads in full: those of the afternoon's lesson and of the first flight's (t1, a1, t3)
export function needSections(FL, i, afternoon = CLASS_FTD[i]) {
  const book = gameBook(FL), mine = new Set(CLASS_CHAPTERS[i].flatMap(id => (book.chapters.find(c => c.id === id) || { sections: [] }).sections.map(s => s.id)));
  return new Set([afternoon, 't1', 'a1', 't3'].filter(Boolean).flatMap(l => book.lessonSections(l).map(s => s.id)).filter(id => mine.has(id)));
}
// what main.js (and the tools) give a class from the career: where it was left, what has been heard, how many times it
// was begun, the pace chosen last, the afternoon's lesson
export function classOptions(FL, state, i, { attempt } = {}) {
  const at = state.done && state.done[`lecture:${i}`], n = attempt ?? ((state.attempts || {})[`class:${i}`] || 0);
  return { from: Number.isInteger(at) && at > 0 ? at : null, heard: heardOf(FL, state), attempt: n, last: state.lastPace || null, afternoon: CLASS_FTD[i], review: reviewFor(FL, state, i, { attempt: n }) };
}
// the questions a class (or the evening's study) begins with: of the classes before it (their answers heard), those
// answered wrong last time first (the latest first), then one on the first flight's own sections (aero.forces,
// aero.left: what was answered longest ago first), then the latest class's, longest ago first → { ids, missed }
export function reviewFor(FL, state, i, { n = 3, attempt = 0, seed = state.seed || 1 } = {}) {
  if (!(i > 0)) return { ids: [], missed: 0 };
  const book = gameBook(FL), heard = heardOf(FL, state), before = CLASS_CHAPTERS.slice(0, i), ans = state.answers || {};
  const classOf = (x) => before.findIndex(ids => ids.includes(chapterOfSec(book, x.home)));
  const ok = questionPool(FL).filter(x => !x.note && classOf(x) >= 0 && x.secs.every(s => heard.has(s)));
  const flight = new Set(['t1', 'a1', 't3'].flatMap(l => book.lessonSections(l).map(s => s.id)));
  const r = rng(seed * 53 + i * 7 + attempt * 7919), when = (x) => (ans[x.id] ? ans[x.id][3] : -1);
  const missed = ok.filter(x => ans[x.id] && ans[x.id][2] === 0).sort((a, b) => when(b) - when(a)).slice(0, 2);
  const rest = (f) => shuffled(ok.filter(x => !missed.includes(x) && f(x)), r).sort((a, b) => when(a) - when(b));
  // (the first flight's sections in turn: the one whose questions were answered longest ago)
  const secWhen = (sec) => Math.max(-1, ...ok.filter(x => x.home === sec && ans[x.id]).map(x => ans[x.id][3]));
  const flSec = [...new Set(ok.filter(x => flight.has(x.home)).map(x => x.home))].sort((a, b) => secWhen(a) - secWhen(b) || a.localeCompare(b))[0];
  const fl = rest(x => x.home === flSec).slice(0, 1);
  const latest = rest(x => !fl.includes(x)).sort((a, b) => classOf(b) - classOf(a) || when(a) - when(b));
  return { ids: [...missed, ...fl, ...latest].slice(0, n).map(x => x.id), missed: missed.length };
}
// the sections a career has heard (its record, and the classes it finished before the record was kept)
export function heardOf(FL, state) { return heardSet(state, CLASS_CHAPTERS.map((_, k) => sectionsBefore(FL, k + 1).slice(sectionsBefore(FL, k).length))); }

// the class's sections in order ({ k (its chapter), j, of, sec }; the index is the class's progress), where it begins
// (from), and its questions: two after each chapter, on that chapter's own sections, of those whose every answer has
// been said by then (before this class, or in it: a class taken up midway said the sections before its place last
// time) — runs: [first, end) of each chapter's in qs. r: the class's random numbers (seed and attempt)
export function classQuestions(FL, i, { from = null, heard = null, r = null, seed = 1, attempt = 0, avoid = null } = {}) {
  const book = gameBook(FL), chs = CLASS_CHAPTERS[i].map(id => book.chapters.find(c => c.id === id)).filter(Boolean);
  const rr = r || rng(seed * 31 + i + attempt * 7919);
  const all = chs.flatMap((c, k) => c.sections.map(s => book.section(s.id)).filter(Boolean).map((sec, j, a) => ({ k, j, of: a.length, sec })));
  const start = Number.isInteger(from) && from > 0 && from < all.length ? from : 0;
  const known = new Set(heard ? [...heard] : sectionsBefore(FL, i));
  for (const x of all.slice(0, start)) known.add(x.sec.id);
  const pool = questionPool(FL), qs = [], runs = [];
  chs.forEach((c, k) => {
    for (const x of all.filter(y => y.k === k)) known.add(x.sec.id);
    const fits = pool.filter(x => chapterOfSec(book, x.home) === c.id && allHeard(x.secs.map(s => [s]), known));
    // (avoid: asked today already as a check — taken only where too few others are left)
    const fresh = (x) => !(avoid && avoid.has(x.id));
    const pick2 = [...shuffled(fits.filter(x => !x.note && fresh(x)), rr), ...shuffled(fits.filter(x => x.note && fresh(x)), rr), ...shuffled(fits.filter(x => !fresh(x)), rr)].slice(0, 2);
    const at = qs.length; qs.push(...pick2.map(x => fromBank(book, rr, x.id)(x.raw))); runs.push([at, qs.length]);
  });
  return { all, start, qs, runs };
}
// the tablet's 座学: each section of part 1 by its class — heard or not (in full 'f', as its key points 'q'), and its
// mark from the answers kept (hook 'ans'): ✓ every question of it answered right the last time, △ one wrong the last
// time, ・ heard, not asked yet; '' not heard
export function sectionMarks(FL, state) {
  const book = gameBook(FL), heard = heardOf(FL, state), ans = state.answers || {}, pool = questionPool(FL);
  return CLASS_CHAPTERS.map((ids, i) => ({ cls: i, chapters: ids.map(id => {
    const c = book.chapters.find(x => x.id === id) || { n: 0, title: id, sections: [] };
    return { id, n: c.n, title: c.title, sections: c.sections.map(x => {
      const qs = pool.filter(y => y.home === x.id), a = qs.filter(y => ans[y.id]), h = heard.has(x.id);
      return { id: x.id, title: (book.section(x.id) || x).title, how: h ? (state.heard && state.heard[x.id]) || 'f' : '', mark: !h ? '' : a.some(y => ans[y.id][2] === 0) ? '△' : a.length ? '✓' : '・', asked: a.length };
    }) };
  }) }));
}
// written1's readiness: each of its banks — its questions whose answers have been heard (of all of them), and of those the
// ones answered right the last time
export function written1Readiness(FL, state) {
  const heard = heardOf(FL, state), ans = state.answers || {};
  return EXAMS.written1.banks.map(b => {
    const list = BANK_ANSWERS[b] || [], taught = list.map((x, k) => ({ id: `${b}#${k}`, x })).filter(o => o.x.a && o.x.a.every(([sec]) => heard.has(sec)));
    return { bank: b, title: ((FL.quiz.BANKS || []).find(x => x.id === b) || { title: b }).title, taught: taught.length, total: list.length, right: taught.filter(o => ans[o.id] && ans[o.id][2] === 1).length };
  });
}
// the questions of a review (reviewFor's: those missed first; the classes done so far), as asked: [{ id, q, opts, ok, why }]
export function reviewQuestions(FL, state, { n = 3, attempt = 0 } = {}) {
  const i = CLASS_CHAPTERS.filter((_, k) => state.done && state.done[`class:${k}`]).length;
  const rv = reviewFor(FL, state, i, { n, attempt }), book = gameBook(FL), r = rng((state.seed || 1) * 59 + i + attempt * 7919), pool = questionPool(FL);
  return rv.ids.map(id => pool.find(x => x.id === id)).filter(Boolean).map(x => fromBank(book, r, x.id)(x.raw));
}
// a review of chapters mixed (before written1): one question from each of three different classes done — in each, the
// one missed last first, else the one answered longest ago — the classes taken in turn from the attempt
export function mixedReview(FL, state, { n = 3, attempt = 0 } = {}) {
  const book = gameBook(FL), heard = heardOf(FL, state), ans = state.answers || {}, pool = questionPool(FL), r = rng((state.seed || 1) * 67 + attempt * 7919);
  const done = CLASS_CHAPTERS.map((_, i) => i).filter(i => state.done && state.done[`class:${i}`]);
  const when = (x) => (ans[x.id] ? ans[x.id][3] : -1), out = [];
  for (const i of shuffled(done, r)) {
    const fits = shuffled(pool.filter(x => !x.note && CLASS_CHAPTERS[i].includes(chapterOfSec(book, x.home)) && x.secs.every(s => heard.has(s))), r)
      .sort((a, b) => ((ans[a.id] && ans[a.id][2] === 0) ? 0 : 1) - ((ans[b.id] && ans[b.id][2] === 0) ? 0 : 1) || when(a) - when(b));
    if (fits.length) out.push(fits[0]);
    if (out.length >= n) break;
  }
  return out.map(x => fromBank(book, r, x.id)(x.raw));
}
// the evening's study (the dorm's 少し自習してから寝る): three questions of the classes done — those missed first, then
// those answered longest ago — each answer kept (hook 'ans': the tablet's ✓ / △); then to bed (hook 'done' 'night').
// None scored. Said by the tablet (main.js names the speaker)
export function studyDialogs(FL, state, { attempt = 0 } = {}) {
  const qs = reviewQuestions(FL, state, { n: 3, attempt }), N = {}, E = [];
  E.push({ k: 'line', id: 'st', text: qs.length ? `今夜の自習：前に間違えた問題と、しばらく答えていない問題から ${qs.length} 問。` : 'まだ自習で解く問題がありません。今夜は教科書を少し読んで寝ましょう。' });
  qs.forEach((x, k) => E.push(askEntry(`sq${k}`, { q: x.q, opts: x.opts, right: x.opts[x.ok], said: x.opts[x.ok], why: x.why, id: x.id }, (state.day || 0) * 3 + k, undefined, '自習')));
  E.push({ k: 'line', id: 'st:end', text: '自習はここまで。結果はタブレットの「座学」に ✓ と △ で残ります。おやすみなさい。' });
  emit(N, E, 'st:bed');
  N['st:bed'] = { speaker: S, text: '（寮に帰って、少し遅くに寝た。）', effects: [{ hook: 'done', arg: 'night' }], end: true };
  return { speakers: SPEAKERS, flags: [], hooks: [...SCHOOL_HOOKS], dialogs: { study: { start: 'st', nodes: N } }, questions: [] };
}
// classDialogs(FL, i, { seed, pace, from, notes, attempt, last, heard, afternoon, review }) → the class's dialog data
// (dialog 'class'). seed: the career's; attempt: how many times this class was begun before (its questions come in
// another order); pace: 'need' | 'full' | 'quick' to begin without the choice; from: the index of the section a class
// left midway reached (the choice then offers to go on from it); last: the pace chosen the time before (offered first);
// heard: the sections heard before (a Set; default: those of the classes before this one); afternoon: the day's
// training device lesson; review: the questions to begin with ({ ids, missed }: classOptions's reviewFor); notes:
// id → the lecturer's notes (content/lecture-notes; the tests give their own)
// The class: the day's own start (CLASS_DAY: what the day is for, the afternoon's lesson), a review of earlier classes'
// questions (those missed first), the pace; each chapter its introduction, its sections, two questions; the score,
// what the afternoon uses of today, the day's goodbye. No stretch without a choice is long: a check (a question of
// chapter 1 on what was just said, not scored) goes where the time since the last choice reaches CHECK_AFTER, and a
// section read as its key points gets the prediction when the class needs a choice by then.
// (the time since the last choice at which a check is put in: a section read in full for today's lessons and the key
// points — whose limit is 2 minutes — sooner than the rest read in full, whose limit is 3)
const CHECK_AFTER = { need: 70, full: 120, quick: 85 };
export function classDialogs(FL, i, { seed = 1, pace = null, from = null, notes = notesFor, attempt = 0, last = null, heard = null, afternoon = CLASS_FTD[i], review = null } = {}) {
  const book = gameBook(FL), ids = CLASS_CHAPTERS[i], r = rng(seed * 31 + i + attempt * 7919);
  if (!ids) throw new Error(`classDialogs: no class ${i}`);
  const chs = ids.map(id => book.chapters.find(c => c.id === id)).filter(Boolean);
  const noteOf = typeof notes === 'function' ? notes : () => null;
  const need = needSections(FL, i, afternoon), day = TALK.CLASS_DAY[i] || TALK.CLASS_DAY[0];
  const ci0 = CLASS_CHAPTERS.slice(0, i).flat().length;                       // (the class's first chapter's place in part 1)
  const N = {}, data = () => ({ speakers: SPEAKERS, flags: [...qs.map((_, k) => `qz_${k}`), 'quick', 'need', 'resumed', 'pr'], hooks: [...SCHOOL_HOOKS], dialogs: { class: { start: 'hello', nodes: N } }, questions: qs });
  const all0 = classQuestions(FL, i, { from, heard, r: rng(1) }).all;
  // ---- each section planned: its entries in full and as its key points, the checks, the order of its parts
  const known = new Set(heard ? [...heard] : sectionsBefore(FL, i)), used = new Set(), plans = [];
  // (the class's start before its first section: its own lines, the review, the pace, the chapter's introduction)
  let gFull = 30, gQuick = 30, gNeed = 30, prev = '';
  const run = (E, g0) => { let g = g0; for (const e of E) for (const x of timeline(e)) { g += x.t; if (x.dec) g = 0; } return g; };
  // (the longest stretch without a choice in the entries, the one carried in and the one left at their end counted)
  const longest = (E, g0) => { let g = g0, m = 0; for (const e of E) for (const x of timeline(e)) { g += x.t; if (x.dec) { m = Math.max(m, g); g = 0; } } return Math.max(m, g); };
  // (the checks: after the step whose line completes the answer, where the time since the last choice has reached
  // CHECK_AFTER; a step index → its entry)
  // (none of the section's own yet: one from a section heard earlier — this class's latest first — once it is late)
  const placeChecks = (E, g0, cands, recall, idOf, mine, g7, T) => {
    const at = new Map(); let g = g0;
    for (const e of E) {
      for (const x of timeline(e)) { g += x.t; if (x.dec) g = 0; }
      if (e.step === undefined || !e.brk || at.has(e.step) || g < T) continue;
      let c = cands.find(x => x.after <= e.step && !mine.has(x.id));
      if (!c && g >= T + 20) c = recall.find(x => !mine.has(x.id));
      if (!c) continue;
      const ce = checkEntry(book, rng(seed * 61 + i * 17 + g7 + e.step + attempt * 3571), c, idOf(e.step), g7 + e.step);
      if (!ce) continue;
      mine.add(c.id);
      at.set(e.step, ce); for (const x of timeline(ce)) { g += x.t; if (x.dec) g = 0; }
    }
    return at;
  };
  const order0 = all0.map(x => x.sec.id);
  const recallFor = (sec) => questionPool(FL).filter(x => !x.note && !x.secs.includes(sec.id) && x.secs.every(s => known.has(s)))
    .map(x => ({ ...x, earlier: true, at: order0.indexOf(x.home) })).sort((a, b) => b.at - a.at);
  const usedFull = new Set(), usedQuick = new Set();
  all0.forEach((x, idx) => {
    const sec = x.sec, base = `c${x.k}s${x.j}`, g = secAt(FL, sec.id), nt = notesOf(noteOf(sec.id)), isNeed = need.has(sec.id);
    for (const s of book.chapters.find(c => c.id === ids[x.k]).sections) if (s.id === sec.id) known.add(s.id);
    const rf = () => rng(seed * 97 + i * 131 + idx + attempt * 15485);
    const o = { base, g, j: x.j, of: x.of, idx, nt, ci: ci0 + x.k };
    // (the entries made from the book's steps carry the step's index: a check goes after one)
    const make = (order, checks) => fullEntries(sec, { ...o, r: rf(), order, checks });
    const E0 = make(g % 4, null);
    const steps = sectionSteps(sec), recall = recallFor(sec);
    const fullChecks = placeChecks(E0, Math.max(gFull, isNeed ? gNeed : 0), [...sectionChecks(FL, sec, steps, known), ...radioChecks(sec, steps)].sort((a, b) => a.after - b.after), recall, (k) => `${base}:c${k}:ck`, usedFull, g * 7, isNeed ? CHECK_AFTER.need : CHECK_AFTER.full);
    // (the order: the first, from the section's place, whose parts do not go as the section before's did)
    let E = null;
    for (let t = 0; t < 4; t++) { const ord = (g + t) % 4, e = make(ord, fullChecks); if (stagesOf(e) !== prev || t === 3) { E = e; o.order = ord; break; } }
    prev = stagesOf(E);
    gFull = run(E, Math.max(gFull, isNeed ? gNeed : 0)); if (isNeed) gNeed = gFull;
    // as its key points: the prediction where a choice is due by its end
    const qid = `r${x.k}s${x.j}`, qsteps = quickSteps(sec), carried = Math.max(gQuick, isNeed ? 0 : gNeed);
    // (a check on a line just said first — shorter, and a second hearing of an answer; the prediction only where the
    // section would still go too long without a choice)
    const qc = [...sectionChecks(FL, sec, qsteps, known), ...radioChecks(sec, qsteps)].sort((a, b) => a.after - b.after);
    const tryChecks = (pred) => { const mine = new Set(usedQuick), at = placeChecks(quickEntries(sec, { id: qid, g, pred }), carried, qc, recall, (k) => `${qid}:c${k}:ck`, mine, g * 7 + 3, CHECK_AFTER.quick); return { at, mine, E: quickEntries(sec, { id: qid, g, pred, checks: at }) }; };
    let qp = tryChecks(null), pred = null;
    if (nt.ask && longest(qp.E, carried) > CHECK_AFTER.quick + 20) { pred = predEntry(`${qid}:pr`, nt.ask, rf(), g); qp = tryChecks(pred); }
    for (const id of qp.mine) usedQuick.add(id);
    const Q = qp.E;
    gQuick = run(Q, carried); if (!isNeed) gNeed = gQuick;
    for (const e of [...E, ...Q]) if (e.k === 'ask' && e.qid) used.add(e.qid);
    plans.push({ x, base, E, Q, qid, isNeed });
  });
  // ---- the chapters' questions (scored): two each, of those not asked as a check today where there are enough
  const { all, start, qs, runs } = classQuestions(FL, i, { from, heard, r, avoid: used });
  chs.forEach((c, k) => {
    const secs = all.filter(x => x.k === k), check = `c${k}:check`, nextC = k < chs.length - 1 ? `c${k + 1}` : 'q:end', ci = ci0 + k;
    const intro = TALK.CHAPTER_INTRO[c.id] ? TALK.CHAPTER_INTRO[c.id]({ n: c.n, title: q(c.title) }, secs.length) : `第 ${c.n} 章${q(c.title)}、${secs.length} 節です。`;
    chain(N, `c${k}`, fit(intro), secs.length ? `c${k}s0` : check);
    secs.forEach((x) => {
      const p = plans[all.indexOf(x)], more = x.j < x.of - 1, after = more ? `c${k}s${x.j + 1}` : check, idx = all.indexOf(x), next = all[idx + 1] ? all[idx + 1].sec : null;
      emit(N, p.E, after, { rest: next });
      emit(N, p.Q, after);
      // (each section read in full or as its key points: at the quick pace, its key points; at the pace for today's
      // training, in full only the sections today's lessons need)
      Object.assign(N[p.base], { if: p.isNeed ? { not: { flag: 'quick' } } : { not: { any: [{ flag: 'quick' }, { flag: 'need' }] } }, else: p.qid });
      N[`${p.base}:book`] = { speaker: S, text: `教科書の${qq(x.sec.title)}です。読み終わったら、閉じてください。`, hook: { name: 'book', arg: x.sec.id }, next: `${p.base}:end` };
      if (next) N[`${p.base}:break`] = { speaker: S, text: `OK. ここで一度区切りましょう。続きは${qq(next.title)}からです。また声をかけてください。`, effects: [{ hook: 'progress', arg: String(idx + 1) }], end: true };
    });
    const [a, b] = runs[k];
    N[check] = { speaker: S, text: b > a ? say(TALK.CHECK_HEAD, ci)(c.n, b - a) : say(TALK.CHECK_NONE, ci)(c.n), next: b > a ? `q${a}` : nextC };
    quizNodes(N, qs, { from: a, to: b, end: false, then: nextC, fitTo: LINE_MAX, words: { head: (j, n) => say(TALK.QUIZ_HEAD, ci * 2 + j)(j + 1, n), ok: (j) => say(TALK.QUIZ_OK, ci * 2 + j), ng: (j, x) => say(TALK.QUIZ_NG, ci * 2 + j)(x) } });
  });
  // (only the end: the day's questions scored, and the score said — not to a class taken up midway, which did not ask
  // the questions before its place); then what the afternoon uses, and the goodbye
  quizNodes(N, qs, { from: qs.length, then: 'score' });
  N.score = { speaker: S, text: '{quiz.right} / {quiz.n} 問、{quiz.pct}% でした。', if: { not: { flag: 'resumed' } }, else: 'preview', next: 'preview' };
  chain(N, 'preview', day.preview.flatMap(t => fit(t)), 'bye');
  N.bye = { speaker: S, text: day.bye, hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'class' }], end: true };
  // the start: the day's own lines, the review, then how to go through it
  const paceSet = (p) => [...(PACE_FLAG[p] ? [{ set: PACE_FLAG[p] }] : []), { hook: 'pace', arg: p }];
  const pool = questionPool(FL), rv = (review && start === 0 ? review.ids || [] : []).map(id => pool.find(x => x.id === id)).filter(Boolean).slice(0, 3);
  const toPace = pace ? 'c0' : 'pace';
  chain(N, 'hello', day.hello.flatMap(t => fit(t)), rv.length ? 'rv:lead' : toPace, S, { hook: { name: 'look', arg: 'player' }, ...(pace && PACE_FLAG[pace] ? { effects: [{ set: PACE_FLAG[pace] }] } : {}) });
  if (rv.length) {
    const rr = rng(seed * 43 + i + attempt * 7919), E = [];
    rv.forEach((x, k) => {
      const b = fromBank(book, rr, x.id)(x.raw), lead = k === 0 ? (review.missed ? say(TALK.REVIEW_MISSED, i) : '') : say(TALK.REVIEW_NEXT, i + k);
      E.push(askEntry(`rv${k}`, { q: `${lead}${b.q}`, opts: b.opts, right: b.opts[b.ok], said: b.opts[b.ok], why: b.why, id: x.id }, i * 3 + k, undefined, '振り返り'));
    });
    E.push({ k: 'line', id: 'rv:done', text: say(TALK.REVIEW_DONE, i) });
    N['rv:lead'] = { speaker: S, text: day.review || '始める前に、これまでの授業を少し思い出しましょう。', next: 'rv0' };
    emit(N, E, toPace);
  }
  if (pace) return data();                                            // (begun without the choice)
  // the paces, each with the time it takes (the reading time of its lines), the one chosen last time first
  const mins = (p) => { const m = minutesOf(N, 'c0', PACE_FLAG[p] ? { [PACE_FLAG[p]]: true } : {}); return m < 12 ? Math.max(1, Math.round(m)) : Math.round(m / 5) * 5; };
  const label = { need: need.size ? `今日の訓練に要るところ（約 ${mins('need')} 分）` : `今日の訓練に要るところ（約 ${mins('need')} 分・今日は要点だけと同じ）`,
    full: `じっくり（教科書を全部、約 ${mins('full')} 分）`, quick: `要点だけ（約 ${mins('quick')} 分）` };
  const order = PACES.includes(last) ? [last, ...PACES.filter(p => p !== last)] : PACES;
  const paceChoices = order.map(p => ({ text: label[p], next: 'c0', effects: paceSet(p) }));
  const at = start ? all[start] : null;
  if (at) {
    N.pace = { speaker: S, text: '前回は途中まででしたね。どこから始めましょうか？',
      choices: [{ text: `続きから（第 ${at.sec.chapter.n} 章${q(at.sec.title)}から）`, next: 'resume', effects: paceSet(PACES.includes(last) ? last : 'full') }, ...paceChoices.map(c => ({ ...c, text: `最初から：${c.text}` }))] };
    // (a place at a chapter's first section: the chapter before it ended there, its questions not yet asked — taken up
    // from them, which go on to the chapter)
    const back = at.j === 0 && at.k > 0;
    N.resume = { speaker: S, text: back ? `では、第 ${chs[at.k - 1].n} 章の確認から続けます。` : 'では、続きから始めます。', effects: [{ set: 'resumed' }], next: back ? `c${at.k - 1}:check` : `c${at.k}s${at.j}` };
  } else {
    N.pace = { speaker: S, text: day.pace, choices: paceChoices };
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
  // (the book's words made the class's first, so the screen leaves out just what the class leaves out)
  const said = (t) => sentences(inClass(t)).filter(s => !NOT_SPOKEN.test(s)).join('');
  const whole = (t) => (sentences(inClass(t)).some(s => NOT_SPOKEN.test(s)) ? '' : String(t ?? ''));
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
  return lines.length ? `<div class="bk-lecturer"><b>講師の補足（${esc(PEOPLE.lecturer.title)}）</b>${lines.map(t => `<p>${esc(t.text)}</p>`).join('')}</div>` : '';
}

// a section's page as the textbook opens it (the class's B, the tablet, a debrief): today's call sign in its examples
export const sectionHtml = (sec) => ourCall(String(sec.html || ''));

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
// ftdDialogs(FL, k, { seed, attempt, heard }) → the lesson's dialog data (dialog 'ftd'). attempt: how many times it was
// begun before (another order of questions each time; a lesson not passed can be taken again the same day); heard: the
// sections heard (a Set; null: all of part 1) — k3, k5 and k6 ask only what has been said (content/answer-map.js)
export function ftdDialogs(FL, k, { seed = 1, attempt = 0, heard = null, k4 = null } = {}) {
  const r = rng(seed * 13 + Number(k.slice(1)) + attempt * 7919), R = FL.radio, N = {}, title = FTD_TITLES[k];
  const ok = (a) => !!a && (!heard || allHeard(a, heard));
  if (!title) throw new Error(`ftdDialogs: no training device lesson ${k}`);
  // (each lesson its own start: what of the morning's class it uses — content/class-talk.js FTD_DAY)
  N.hello = { speaker: 'lecturer', text: TALK.FTD_DAY[k] || `今日は ${k}：${title}です。`, hook: { name: 'look', arg: 'player' }, next: 'intro' };
  let questions = null, flags = [];
  if (k === 'k1') {
    N.intro = { speaker: 'lecturer', text: '正面の画面を見てください。実際の機体と同じ表示を、ひとつずつ見ていきます。', hook: { name: 'pfd', arg: 'tutor:all' }, next: 't0' };
    TUTOR.forEach(([part, text], i) => { N[`t${i}`] = { speaker: 'lecturer', text, hook: { name: 'pfd', arg: `tutor:${part}` }, next: i < TUTOR.length - 1 ? `t${i + 1}` : 'k1:end' }; });
    N['k1:end'] = { speaker: 'lecturer', text: 'Perfect. 次は、実際の表示を読む練習です。読む順番を、体で覚えてください。', hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'pass' }], end: true };
  } else if (k === 'k4') {
    // k4, 交信のチェアフライト: what it is, then how to fly it (the stage: the runner, its panel and its screen are the
    // game's, dialog/chair-flight.js; the end, chairDebriefDialogs). k4 is passed only by a run scored 80% or more
    k4Start(N, k4 || {});
    if (k4 && k4.passed) { k4ListenNodes(FL, N, 'k4:listen:end'); N['k4:listen:end'] = { speaker: 'lecturer', text: 'That\'s the whole flight. 空港は違っても、交信の型は同じです。', hook: { name: 'nod' }, end: true }; }
    return { speakers: SPEAKERS, flags: [], hooks: [...SCHOOL_HOOKS], dialogs: { ftd: { start: 'hello', nodes: N } }, questions: [] };
  } else {
    // (k3, k6: ten of the kinds whose rules have been said, each kind in turn; k5: ten of the scenes whose calls have)
    const kinds = (all, map) => { const ks = shuffled(Object.keys(all).filter(x => ok(map[x])), r); return Array.from({ length: 10 }, (_, i) => ks[i % ks.length]); };
    // (each question with its picture: the screen draws the one asked, whatever the try — main.js showPfd)
    if (k === 'k2') questions = pfdPictures(seed + attempt * 101).map((p, i) => ({ ...readQuestion(p, i, r), id: `pfd:${['ias', 'alt', 'hdg', 'vs', 'bank'][i % 5]}`, pic: p }));
    if (k === 'k3') questions = shuffled(kinds(R.DRILLS, DRILL_ANSWERS).map(kind => ({ kind, ...R.DRILLS[kind].make(r) })), r).map(x => ({ id: `drill:${x.kind}`, q: callFix(x.q), opts: x.opts.map(callFix), ok: x.opts.indexOf(x.ok), why: callFix(x.why), say: x.say ? callFix(x.say) : undefined }));
    if (k === 'k5') questions = pick(R.SCENES.filter(sc => ok(SCENE_ANSWERS[sc.id])), 10, r).map(sc => { const o = shuffled(sc.options.map((t, j) => ({ t: callFix(t), ok: j === sc.answer })), r); return { id: `scene:${sc.id}`, q: `${sc.title}：${callFix(sc.situation)}${sc.atc ? `　聞こえた：“${callFix(sc.atc)}”` : ''}　${callFix(sc.q)}`, opts: o.map(x => x.t), ok: o.findIndex(x => x.ok), why: callFix(sc.why), say: sc.atc ? callFix(sc.atc) : undefined }; });
    if (k === 'k6') questions = shuffled(kinds(R.LISTEN, LISTEN_ANSWERS).map(kind => { const x = R.LISTEN[kind](r); x.opts = shuffled([...new Set(x.opts)], r); return { kind, ...x }; }), r).map(x => ({ id: `listen:${x.kind}`, q: `（英語を聞いて）${callFix(x.q)}`, opts: x.opts.map(callFix), ok: x.opts.indexOf(x.ok), why: callFix(x.why), say: callFix(x.say) }));
    N.intro = { speaker: 'lecturer', text: k === 'k2' ? '画面の PFD を読んで答えてください。10 問、80% で合格です。' : k === 'k6' ? '英語の指示が流れます。聞いて、内容を選んでください。10 問、80% で合格です。' : '10 問です。80% で合格。Take your time.', next: 'q0' };
    quizNodes(N, questions, { fitTo: LINE_MAX, fitQ: true });
    resultNodes(N, 'lecturer', `Excellent! ${k} は合格です。`, 'Not yet. 大丈夫、間違えたところを見直して、もう一度やりましょう。準備ができたら、また声をかけてください。', TALK.FTD_END[k]);
    flags = questions.map((_, i) => `qz_${i}`);
  }
  return { speakers: SPEAKERS, flags, hooks: [...SCHOOL_HOOKS], dialogs: { ftd: { start: 'hello', nodes: N } }, questions: questions || [] };
}

// ---- k4: the chair flight's start and its end
// k4Start(N, { passed, fails, missed }) — passed: k4 passed before; fails: runs not passed in a row; missed: the items a
// run got wrong (practised alone once two runs in a row did not pass). The choice's hook 'chair' says how to fly it:
// '2' the script hidden (scored), '1' the script in view (practice), '3' for real (the clock, the microphone),
// '1:missed' only the items missed, in view
const K4 = 'lecturer';
function k4Start(N, { passed = false, fails = 0, missed = [] } = {}) {
  const say = (id, text, more = {}) => { N[id] = { speaker: K4, text, ...more }; };
  say('hello', passed ? 'k4、交信のチェアフライトをもう一度やりますね。今日も、あなたがパイロット、わたしが管制官です。' : 'k4 は交信のチェアフライトです。ヘッドセットをつけて、机の席へ。あなたがパイロット、わたしはコンソールで管制官をやります。', { hook: { name: 'look', arg: 'player' }, next: 'k4:2' });
  say('k4:2', '飛ぶのは、10 日目の初飛行と同じ流れです。ATIS を聞いて、Ground、Tower。訓練空域から帰って着陸し、駐機場に戻るまで。', { hook: { name: 'point', arg: 'screen' }, next: 'k4:3' });
  say('k4:3', '周波数を合わせる、高度計を合わせる、呼ぶ前に聞く。その操作も一つずつ聞きます。壁の画面に、地図と周波数の表を出します。', { next: 'k4:4' });
  say('k4:4', '答えは 1〜3 で選びます。マイクが ON なら、M を押して声に出しても答えられます。理由を聞きたいときは H を押してください。', { next: 'k4:stage' });
  const go = (stage, text) => ({ text, next: 'k4:go', effects: [{ hook: 'chair', arg: stage }] });
  const choices = passed ? [go('3', '③ 本番（時間制限あり。マイクも使えます）'), go('2', '② 自分の台詞を隠して（80% で合格）'), go('1', '① 台本を見ながら（点数なしの練習）'), { text: '教科書の例を通しで聞く（別の空港の例）', next: 'k4:listen' }]
    : fails >= 2 && missed.length ? [go('1:missed', `間違えたところ（${missed.length} か所）だけ、台本を見ながら練習する`), go('1', '① 最初から、台本を見ながら練習する')]
      : fails >= 1 ? [go('1', '① 台本を見ながら練習する（点数なし）'), go('2', '② もう一度、台詞を隠して挑戦する')]
        : [go('2', '② 自分の台詞を隠して（80% で合格）'), go('1', '① 台本を見ながら（点数なしの練習）')];
  say('k4:stage', fails >= 2 ? '2 回続けて届きませんでしたね。間違えたところだけ、先に台本を見ながら練習しましょう。' : fails ? 'さっきの続きです。どうしますか？' : passed ? 'どれにしますか？' : '最初は、自分の台詞を隠して通してみましょう。台本を見ながら練習してからでもかまいません。', { choices });
  say('k4:go', 'では、始めます。席に着いてください。COM1 から合わせていきましょう。', { hook: { name: 'nod' }, end: true });
  // (after the pass, the textbook's own example, a whole flight at another airport, to listen to: said to be that)
  if (passed) say('k4:listen', 'これは教科書の例の交信です。別の空港で、西のエプロン、誘導路 Charlie、出発管制と進入管制があります。LAB の手順とは違います。', { next: 'f0:0' });
}
// the textbook's whole flight (FLIGHT LAB's FLIGHT, another airport), each call with its meaning, spoken: k4's
// listening after the pass
export function k4ListenNodes(FL, N, then) {
  const lines = [];
  for (const g of FL.radio.FLIGHT) {
    lines.push({ text: `${g.t}（${g.freq}）`, say: null });
    for (const [who, en, ja] of g.lines) if (en) lines.push({ text: `${who === 'P' ? 'あなた' : FL.radio.WHO[who] || who}：“${callFix(en)}” ── ${callFix(ja)}`, say: callFix(en) });
  }
  const parts = lines.flatMap(l => fit(l.text).map((t, k) => ({ text: t, say: k ? null : l.say })));
  parts.forEach((l, i) => { N[`f0:${i}`] = { speaker: K4, text: l.text, ...(l.say ? { hook: { name: 'say', arg: l.say } } : {}), next: i < parts.length - 1 ? `f0:${i + 1}` : then }; });
}
// chairDebriefDialogs(FL, summary, script, { fails, practice }) → the end of a run (dialog 'ftd'): the score, each
// item missed — what was left out of the call (readback.js's words), late, or the wrong switch — with its section of
// the textbook to open; then passed (hook done 'pass'), or the next try: 'chair' with the stage (no day lost), or the end
// for today (done 'fail'). practice: a run from the tablet (nothing passed or failed)
export function chairDebriefDialogs(FL, sum, script, { fails = 0, practice = false } = {}) {
  const book = gameBook(FL), N = {}, P = script.parts;
  // (a line too long for the box over two: its hook on the first, its choices or its end on the last)
  const say = (id, text, more = {}) => {
    const l = fit(text), { choices, end, ...first } = more;
    l.forEach((t, k) => { N[k ? `${id}:${k}` : id] = { speaker: K4, text: t, ...(k ? {} : first), ...(k < l.length - 1 ? { next: `${id}:${k + 1}` } : { ...(choices ? { choices } : {}), ...(end ? { end } : {}) }) }; });
    return l.length > 1 ? `${id}:${l.length - 1}` : id;
  };
  const missed = sum.items.filter(x => !x.ok).slice(0, 6);
  const head = sum.stage === 1 ? `台本を見ながらの練習、おつかれさまでした。${sum.n} か所のうち、${sum.first} か所が 1 回目で合っていました。`
    : `${sum.n} か所のうち、1 回目で${sum.stage === 3 ? '時間内に' : ''}合っていたのは ${sum.first} か所、${sum.pct}% でした。`;
  let at = say('d0', head, { hook: { name: 'look', arg: 'player' } }), prev = at;
  const link = (n, x) => {
    const sec = book.section(x.sec), part = (P[x.part] || {}).ja || '';
    const what = x.late ? '返事が遅れて、管制官に呼び直されました' : x.kind === 'op' ? `最初は「${x.said[0]}」でした` : x.missing && x.missing.length ? `${x.missing.join('・')} が抜けていました` : '最初は違う言い方でした';
    const id = `m${n}`, end = say(id, `${part}：${what}。正しくは${x.kind === 'op' ? `「${x.right}」` : `“${x.right}”`}です。`);
    N[prev].next = id;
    N[end].choices = [{ text: '次へ', next: `m${n}:after` }, ...(sec ? [{ text: `教科書の「${sec.title}」を開く`, next: `m${n}:book` }] : [])];
    N[`m${n}:book`] = { speaker: K4, text: `教科書の「${sec ? sec.title : ''}」です。読み終わったら閉じてください。`, hook: { name: 'book', arg: x.sec }, next: `m${n}:after` };
    N[`m${n}:after`] = { speaker: K4, text: n < missed.length - 1 ? '次です。' : 'ここまでが、直すところです。' };
    prev = `m${n}:after`;
  };
  missed.forEach((x, n) => link(n, x));
  const chair = (stage, text) => ({ text, next: 'again', effects: [{ hook: 'chair', arg: stage }] });
  const endWith = (id, text, choices, more = {}) => { N[prev].next = id; say(id, text, { ...more, ...(choices ? { choices } : { end: true }) }); };
  N.again = { speaker: K4, text: 'OK. 席はそのままで。始めます。', end: true };
  if (practice) endWith('last', sum.pass ? 'よくできました。この練習は記録には残りません。' : '練習はここまでです。この練習は記録には残りません。', null);
  else if (sum.stage === 1) endWith('last', '次は、自分の台詞を隠して通してみましょう。', [chair('2', '② 台詞を隠して挑戦する'), chair('1', '① もう一度、台本を見ながら'), { text: '今日はここまでにする', next: 'stop' }]);
  else if (sum.pass) endWith('pass', sum.pct === 100 ? 'Perfect. k4 は合格です。初飛行の日も、この順番どおりに交信します。' : 'Excellent. k4 は合格です。初飛行の日も、この順番どおりに交信します。', null, { hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'pass' }] });
  else if (fails + 1 >= 2 && sum.missed.length) endWith('last', 'あと少しです。2 回続けて届かなかったので、間違えたところだけ台本を見ながら練習して、それからもう一度挑戦しましょう。', [chair('1:missed', `間違えたところ（${sum.missed.length} か所）だけ練習する`), { text: '今日はここまでにする', next: 'stop' }]);
  else endWith('last', `あと少しです。合格は 80% から。台本を見ながら練習してもいいし、すぐにもう一度でもかまいません。`, [chair('1', '① 台本を見ながら練習する'), chair('2', '② もう一度、台詞を隠して挑戦する'), { text: '今日はここまでにする', next: 'stop' }]);
  N.stop = { speaker: K4, text: 'わかりました。準備ができたら、また声をかけてください。今日のうちに、何度でもできます。', effects: [{ hook: 'done', arg: 'fail' }], end: true };
  // (only the ends a choice leads to)
  const used = new Set(Object.values(N).flatMap(n => (n.choices || []).map(c => c.next)));
  for (const id of ['again', 'stop']) if (!used.has(id)) delete N[id];
  return { speakers: SPEAKERS, flags: [], hooks: [...SCHOOL_HOOKS], dialogs: { ftd: { start: 'd0', nodes: N } }, questions: [] };
}

// ---------------------------------------------------------------- the written tests
// (exam: another test's settings — the tablet's practice: one bank, ten questions)
// (written1, and a practice in chapter 1: heard — the sections heard, a Set — keeps to the questions whose answers
// have been said; null for written1: all of part 1; attempt: another order each time)
// warm: questions to begin with, not scored (written1: mixedReview's, one from each of three classes)
export function examDialogs(FL, id, { seed = 1, speaker, exam = null, attempt = 0, heard = null, warm = null } = {}) {
  const E = exam || EXAMS[id]; if (!E) throw new Error(`examDialogs: no test ${id}`);
  const r = rng(seed * 17 + id.length + attempt * 7919), who = speaker || (id === 'written1' ? 'lecturer' : 'instructor'), book = gameBook(FL);
  const taught = id === 'written1' || heard ? (heard || new Set(sectionsBefore(FL, CLASS_CHAPTERS.length))) : null;
  // (a bank the answer map does not hold — part 2's — has nothing said yet in chapter 1: a practice there has none)
  const usable = (b, k) => { if (!taught) return true; if (!BANK_ANSWERS[b]) return !heard; const a = BANK_ANSWERS[b][k] && BANK_ANSWERS[b][k].a; return !!a && allHeard(a, taught); };
  // drawn evenly from the banks
  const per = Math.ceil(E.n / E.banks.length), pool = [];
  for (const b of E.banks) pool.push(...pick((FL.quiz.BANKS.find(x => x.id === b) || { qs: [] }).qs.map((x, k) => ({ x, id: `${b}#${k}` })).filter(o => usable(o.id.split('#')[0], +o.id.split('#')[1])), per, r));
  const qs = pick(pool, E.n, r).map(o => fromBank(book, r, o.id)(o.x));
  const N = {};
  // (none whose answers have been said yet: said so, and nothing to answer)
  if (!qs.length) {
    N.hello = { speaker: who, text: `${E.title}：この分野は、まだ授業で話していません。授業で聞いたあとに、また開いてください。`, end: true };
    return { speakers: SPEAKERS, flags: [], hooks: [...SCHOOL_HOOKS], dialogs: { exam: { start: 'hello', nodes: N } }, questions: [] };
  }
  N.hello = { speaker: who, text: `${E.title}です。${qs.length} 問、${E.pass}% 以上で合格${exam ? '' : '（分野ごとに 6 割以上も必要です）'}。答えを選ぶと、すぐに正解と理由を言います。`, hook: { name: 'look', arg: 'player' }, next: 'q0' };
  // (a warm-up of chapters mixed, before the test: not scored, its answers kept)
  if (warm && warm.length) {
    const E2 = [{ k: 'line', id: 'wu', text: '始める前に、章をまぜて 3 問だけ肩ならしをしましょう。点数には入りません。' },
      ...warm.slice(0, 3).map((x, k) => askEntry(`wu${k}`, { q: x.q, opts: x.opts, right: x.opts[x.ok], said: x.opts[x.ok], why: x.why, id: x.id }, seed + k, undefined, '振り返り')),
      { k: 'line', id: 'wu:end', text: 'OK. 頭が温まりましたね。では、本番です。' }];
    emit(N, E2, 'hello');
    N.wu.hook = { name: 'look', arg: 'player' };
  }
  quizNodes(N, qs, { speaker: who, fitTo: LINE_MAX, fitQ: true });
  resultNodes(N, who, E.ok || (id === 'presolo' ? '合格です。これで、ソロ前の審査に進めます。' : '合格です。おめでとうございます。来週から、いよいよ実機の訓練です。'),
    // (a real test: the weak banks are named, and the next try is tomorrow — a practice keeps the old words)
    exam ? '今回は届きませんでした。間違えた問題の理由を、教科書でもう一度確かめてください。また受けられます。'
      : '今回は届きませんでした。{quiz.weakText}間違えた問題の理由を、教科書でもう一度確かめてください。また明日、受けられます。');
  return { speakers: SPEAKERS, flags: qs.map((_, k) => `qz_${k}`), hooks: [...SCHOOL_HOOKS], dialogs: { exam: { start: warm && warm.length ? 'wu' : 'hello', nodes: N } }, questions: qs };
}
// (growth design v1 §4.4) the judgement drill: ten mornings of weather to read — career.js's own sky, its
// kinds in turn — each asked as the day's question is asked: fly, wait for the afternoon, fly in the
// morning only, or not today. The right answer is the weather's own decision. Not a test: the count is
// said at the end, and the career grows the judgement a little for finishing (twice a day at most)
export const DRILL_CHOICES = [['go', '飛ぶ'], ['wait', '午後まで待つ'], ['early', '午前だけ飛ぶ'], ['cancel', '今日は飛ばない']];
export function drillDialogs(FL, state, { attempt = 0 } = {}) {
  const kinds = ['good', 'amFog', 'pmStorm', 'crosswind', 'storm', 'amLowCloud', 'pmWind', 'lowCloud'];
  const r = rng((state.seed || 1) * 131 + (state.day || 1) * 17 + attempt * 7919);
  const order = shuffled(kinds, r), qs = [];
  for (let i = 0; i < 10; i++) {
    const w = weatherFor(state.seed || 1, (state.day || 1) * 40 + i * 3 + attempt * 11, { force: order[i % order.length] });
    const opts = shuffled(DRILL_CHOICES.slice(), r);
    qs.push({ q: `朝の天気です。METAR（午前）「${w.metar.am}」／METAR（午後）「${w.metar.pm}」／TAF「${w.taf}」。今日の訓練は、どうしますか。`, opts: opts.map(([, ja]) => ja), ok: opts.findIndex(([d]) => d === w.decision), why: w.why });
  }
  const N = {};
  N.hello = { speaker: 'lecturer', text: '判断ドリル：朝の天気（METAR と TAF）を 10 回読みます。飛ぶか、午後まで待つか、午前だけ飛ぶか、今日は飛ばないか。試験ではなく、判断の練習です。', hook: { name: 'look', arg: 'player' }, next: 'q0' };
  quizNodes(N, qs, { speaker: 'lecturer', fitTo: LINE_MAX, fitQ: true });
  resultNodes(N, 'lecturer', 'よく判断できていました。ドリルはここまでです。', 'ドリルはここまでです。迷った天気は、教科書の気象の節でもう一度確かめてみてください。');
  return { speakers: SPEAKERS, flags: qs.map((_, k) => `qz_${k}`), hooks: [...SCHOOL_HOOKS], dialogs: { drill: { start: 'hello', nodes: N } }, questions: qs };
}
// a bank's questions whose answers have been said (heard: a Set of sections): what a practice in chapter 1 draws from
export function bankTaught(FL, bankId, heard) {
  const b = FL.quiz.BANKS.find(x => x.id === bankId), m = BANK_ANSWERS[bankId];
  if (!b || !m) return 0;
  return b.qs.filter((_, k) => m[k] && m[k].a && allHeard(m[k].a, heard)).length;
}
// the score of a finished quiz from its state's flags
export const scoreOf = (state, n) => { let right = 0; for (let k = 0; k < n; k++) if (state.flags[`qz_${k}`]) right++; const pct = n ? Math.round(right / n * 100) : 0; return { right, n, pct, pass: pct >= PASS }; };
// (growth design v1 §4.3) a written test's score, bank by bank: passing takes the whole test's line and no
// bank under the floor — a weak field named for the result, so the review can be aimed at it. A question
// carries its bank in its id (`bank#k`); titles names the banks for that line
export const EXAM_BANK_FLOOR = 60;
export function examScoreOf(state, questions, titles = {}) {
  const per = {};
  (questions || []).forEach((q, k) => { const b = String(q && q.id || '').split('#')[0] || '?'; const e = per[b] || (per[b] = { right: 0, n: 0 }); e.n++; if (state.flags[`qz_${k}`]) e.right++; });
  const banks = {}; for (const [b, e] of Object.entries(per)) banks[b] = { right: e.right, n: e.n, pct: e.n ? Math.round(e.right / e.n * 100) : 0 };
  const weak = Object.keys(banks).filter(b => banks[b].pct < EXAM_BANK_FLOOR);
  const base = scoreOf(state, (questions || []).length);
  const weakText = weak.length ? `弱い分野は ${weak.map(b => `${titles[b] || b}（${banks[b].pct}%）`).join('・')} で、6 割に届いていません。` : '';
  return { ...base, pass: base.pass && !weak.length, banks, weak, weakText };
}

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
