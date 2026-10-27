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
import { EXAMS, CLASSES, CLASS_FTD, PACE_IDS, heardSet } from '../career/career.js';
import { BANK_ANSWERS, SCENE_ANSWERS, DRILL_ANSWERS, LISTEN_ANSWERS, NOTE_ANSWERS } from './answer-map.js';
import { SUMMARIES } from './lecture-summaries.js';

export const SCHOOL_HOOKS = ['board', 'pfd', 'say', 'quizEnd', 'done', 'look', 'nod', 'point', 'page', 'progress', 'book', 'pace', 'heard', 'ans', 'chair'];
const SPEAKERS = { lecturer: { name_ja: PEOPLE.lecturer.title, color: PEOPLE.lecturer.color }, instructor: { name_ja: PEOPLE.instructor.title, color: PEOPLE.instructor.color }, player: { name_ja: 'あなた', color: '#f2b632' } };
// the textbook's chapters each class covers (part 1; its introduction is not in the game's book) and the question bank
// that goes with each chapter
export const CLASS_CHAPTERS = CLASSES;
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
// reason too long for that many characters is said over a few lines (q<k>:ok, q<k>:ok:1…)
export function quizNodes(N, questions, { speaker = 'lecturer', then = 'result', label = '', from = 0, to = questions.length, end = true, fitTo = 0 } = {}) {
  const say = (id, text, next) => { const l = fitTo ? fit(text, fitTo) : [text]; l.forEach((t, j) => { N[j ? `${id}:${j}` : id] = { speaker, text: t, next: j < l.length - 1 ? `${id}:${j + 1}` : next, tag: 'material' }; }); };
  for (let k = from; k < to; k++) {
    const x = questions[k], id = `q${k}`, nextQ = k < to - 1 ? `q${k + 1}` : end ? 'q:end' : then;
    const more = x.say ? { hook: { name: 'say', arg: x.say } } : x.pfd != null ? { hook: { name: 'pfd', arg: String(x.pfd) } } : {};
    // (M8: the questions and their reasons are the course's own words: 'material', said as written in the English mode)
    N[id] = { speaker, text: `${label ? label + '　' : ''}第 ${k - from + 1} 問（${to - from} 問中）。${x.q}`, ...more, tag: 'material',
      choices: x.opts.map((t, j) => ({ text: t, next: j === x.ok ? `${id}:ok` : `${id}:ng`, effects: [...(j === x.ok ? [{ set: `qz_${k}` }] : []), ...(x.id ? [{ hook: 'ans', arg: `${x.id}|${j === x.ok ? 1 : 0}` }] : [])] })) };
    say(`${id}:ok`, `正解です。${x.why || ''}`.trim(), nextQ);
    say(`${id}:ng`, `正しくは${q(x.opts[x.ok])}です。${x.why || ''}`.trim(), nextQ);
  }
  if (end) N['q:end'] = { speaker, text: '以上です。採点しますね。', hook: { name: 'quizEnd', arg: String(questions.length) }, next: then };
}
const resultNodes = (N, speaker, passText, failText) => {
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
    for (const a of [...Object.values(SCENE_ANSWERS), ...Object.values(DRILL_ANSWERS), ...Object.values(LISTEN_ANSWERS), ...Object.values(NOTE_ANSWERS)]) put(a);
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
// the section read in full → its nodes from `base` (its title), going on to `after`
function sectionNodes(N, { sec, base, after, idx, j, of, notes, r, next = null }) {
  const us = lectureUnits(sec), nt = notesOf(notes);
  let open = [];                                              // the nodes waiting for the next one
  const put = (id, node) => { const n = { speaker: S, ...node }; N[id] = n; for (const o of open) o.next = id; open = n.choices ? [] : [n]; return n; };
  // (a line too long for the box before a choice: the start said first, the end with the choice)
  const ask = (id, text, more) => {
    const l = fit(text), { effects, ...rest } = more;
    l.slice(0, -1).forEach((t, k) => put(`${id}:pre${k}`, { text: t, ...(rest.tag ? { tag: rest.tag } : {}), ...(k === 0 && effects ? { effects } : {}) }));
    return put(id, { ...rest, ...(l.length === 1 && effects ? { effects } : {}), text: l[l.length - 1] });
  };
  // (an answer: its lines, the first with its hook; the last left open for what follows)
  const reply = (id, text, more = {}) => { const l = fit(text); l.forEach((t, k) => { N[k ? `${id}:${k}` : id] = { speaker: S, text: t, ...(k ? {} : more), ...(k < l.length - 1 ? { next: `${id}:${k + 1}` } : {}) }; }); return N[l.length > 1 ? `${id}:${l.length - 1}` : id]; };
  const pageOf = (x) => { const m = noteUnit(us, x.page); return m === null ? {} : { effects: [{ hook: 'page', arg: `${sec.id}#${m}` }] }; };
  const title = of === 1 ? `${qq(sec.title)}です。` : j === 0 ? `最初は${qq(sec.title)}です。` : j === of - 1 ? `最後は${qq(sec.title)}です。` : `次は${qq(sec.title)}です。`;
  put(base, { text: title, effects: [{ hook: 'page', arg: sec.id }, { hook: 'progress', arg: String(idx) }] });
  nt.intro.forEach((t, k) => put(`${base}:i${k}`, { text: t.text, ...pageOf(t) }));
  const steps = sectionSteps(sec), seenUnit = new Set();
  steps.forEach((s, n) => {
    const m = s.m, u = `${base}:u${m}`, k = steps.slice(0, n).filter(x => x.m === m).length, id = k ? `${u}:${k}` : u;
    const more = seenUnit.has(m) ? {} : { effects: [{ hook: 'page', arg: `${sec.id}#${m}` }] }; seenUnit.add(m);
    if (!s.think) { put(id, { text: s.text, ...(s.tag ? { tag: s.tag } : {}), ...(s.hook ? { hook: s.hook } : {}), ...more }); return; }
    const a0 = `${id}:a0`;
    ask(id, `考えてみましょう。${s.think.q}`, { tag: 'think', ...more, choices: [{ text: '考えてみます', next: `${id}:wait` }, { text: '答えを聞きます', next: a0 }] });
    put(`${id}:wait`, { text: 'では、少し考えてみてください。……いいですか？' });
    (s.think.a.length ? first(s.think.a, '答えです。') : ['答えは、教科書のこの節にあります。']).forEach((t, q) => put(`${id}:a${q}`, { text: t }));
  });
  nt.notes.forEach((t, k) => put(`${base}:n${k}`, { text: t.text, tag: 'note', ...pageOf(t) }));
  if (nt.ask) {
    const x = nt.ask, o = shuffled(x.opts.map((t, i) => ({ t, ok: i === x.ok })), r), right = x.opts[x.ok];
    ask(`${base}:ask`, `ひとつ確認します。${x.q}`, { choices: o.map(c => ({ text: c.t, next: c.ok ? `${base}:ask:ok` : `${base}:ask:ng` })) });
    open = [reply(`${base}:ask:ok`, `That's right. ${x.why}`.trim(), { hook: { name: 'nod' } }), reply(`${base}:ask:ng`, `正しくは${q(right)}です。${x.why}`.trim())];
  }
  const rest = next ? [{ text: 'ここで休憩する（続きはまた後で）', next: `${base}:break` }] : [];
  put(`${base}:end`, { text: `${qq(sec.title)}はここまでです。`, effects: [{ hook: 'heard', arg: `${sec.id}|f` }], choices: [{ text: '次へ', next: after }, { text: 'この節をもう一度', next: base }, { text: '教科書でこの節を読む', next: `${base}:book` }, ...rest] });
  N[`${base}:book`] = { speaker: S, text: `教科書の${qq(sec.title)}です。読み終わったら、閉じてください。`, hook: { name: 'book', arg: sec.id }, next: `${base}:end` };
  if (next) N[`${base}:break`] = { speaker: S, text: `OK. ここで一度区切りましょう。続きは${qq(next.title)}からです。また声をかけてください。`, effects: [{ hook: 'progress', arg: String(idx + 1) }], end: true };
}
// the section in its key points (quickSteps), its unit on the screen with each line; the last says it was heard
function quickNodes(N, sec, id, then) {
  const steps = quickSteps(sec), lines = [{ text: `${q(sec.title)}。`, m: null }, ...steps];
  // (the title and a short first line together, as before)
  if (steps.length && `${q(sec.title)}。${steps[0].text}`.length <= LINE_MAX && !steps[0].hook) lines.splice(0, 2, { ...steps[0], text: `${q(sec.title)}。${steps[0].text}` });
  let shown = null;
  lines.forEach((l, k) => {
    const nid = k ? `${id}:${k}` : id, page = l.m === null || l.m === undefined ? (k === 0 ? sec.id : null) : `${sec.id}#${l.m}`;
    const eff = [...(page && page !== shown ? [{ hook: 'page', arg: page }] : []), ...(k === lines.length - 1 ? [{ hook: 'heard', arg: `${sec.id}|q` }] : [])];
    if (page) shown = page;
    N[nid] = { speaker: S, text: l.text, ...(l.tag ? { tag: l.tag } : {}), ...(l.hook ? { hook: l.hook } : {}), ...(eff.length ? { effects: eff } : {}), next: k < lines.length - 1 ? `${id}:${k + 1}` : then };
  });
}
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
  const at = state.done && state.done[`lecture:${i}`];
  return { from: Number.isInteger(at) && at > 0 ? at : null, heard: heardOf(FL, state), attempt: attempt ?? ((state.attempts || {})[`class:${i}`] || 0), last: state.lastPace || null, afternoon: CLASS_FTD[i] };
}
// the sections a career has heard (its record, and the classes it finished before the record was kept)
export function heardOf(FL, state) { return heardSet(state, CLASS_CHAPTERS.map((_, k) => sectionsBefore(FL, k + 1).slice(sectionsBefore(FL, k).length))); }

// the class's sections in order ({ k (its chapter), j, of, sec }; the index is the class's progress), where it begins
// (from), and its questions: two after each chapter, on that chapter's own sections, of those whose every answer has
// been said by then (before this class, or in it: a class taken up midway said the sections before its place last
// time) — runs: [first, end) of each chapter's in qs. r: the class's random numbers (seed and attempt)
export function classQuestions(FL, i, { from = null, heard = null, r = null, seed = 1, attempt = 0 } = {}) {
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
    const pick2 = [...shuffled(fits.filter(x => !x.note), rr), ...shuffled(fits.filter(x => x.note), rr)].slice(0, 2);
    const at = qs.length; qs.push(...pick2.map(x => fromBank(book, rr, x.id)(x.raw))); runs.push([at, qs.length]);
  });
  return { all, start, qs, runs };
}
// classDialogs(FL, i, { seed, pace, from, notes, attempt, last, heard, afternoon }) → the class's dialog data (dialog
// 'class'). seed: the career's; attempt: how many times this class was begun before (its questions come in another
// order); pace: 'need' | 'full' | 'quick' to begin without the choice; from: the index of the section a class left
// midway reached (the choice then offers to go on from it); last: the pace chosen the time before (offered first);
// heard: the sections heard before (a Set; default: those of the classes before this one); afternoon: the day's
// training device lesson; notes: id → the lecturer's notes (content/lecture-notes; the tests give their own)
export function classDialogs(FL, i, { seed = 1, pace = null, from = null, notes = notesFor, attempt = 0, last = null, heard = null, afternoon = CLASS_FTD[i] } = {}) {
  const book = gameBook(FL), ids = CLASS_CHAPTERS[i], r = rng(seed * 31 + i + attempt * 7919);
  if (!ids) throw new Error(`classDialogs: no class ${i}`);
  const chs = ids.map(id => book.chapters.find(c => c.id === id)).filter(Boolean);
  const noteOf = typeof notes === 'function' ? notes : () => null;
  const need = needSections(FL, i, afternoon);
  const N = {}, data = () => ({ speakers: SPEAKERS, flags: [...qs.map((_, k) => `qz_${k}`), 'quick', 'need', 'resumed'], hooks: [...SCHOOL_HOOKS], dialogs: { class: { start: 'hello', nodes: N } }, questions: qs });
  const { all, start, qs, runs } = classQuestions(FL, i, { from, heard, r });
  chs.forEach((c, k) => {
    const secs = all.filter(x => x.k === k), check = `c${k}:check`, nextC = k < chs.length - 1 ? `c${k + 1}` : 'q:end';
    N[`c${k}`] = { speaker: S, text: `${k ? 'Next, ' : 'Let\'s get started. '}第 ${c.n} 章${q(c.title)}。${secs.length} 節あります。順に見ていきましょう。`, next: secs.length ? `c${k}s0` : check };
    secs.forEach((x) => {
      const more = x.j < x.of - 1, after = more ? `c${k}s${x.j + 1}` : check;
      const idx = all.indexOf(x);
      sectionNodes(N, { sec: x.sec, base: `c${k}s${x.j}`, after, idx, j: x.j, of: x.of, notes: noteOf(x.sec.id), r: rng(seed * 97 + i * 131 + idx + attempt * 15485), next: all[idx + 1] ? all[idx + 1].sec : null });
      quickNodes(N, x.sec, `r${k}s${x.j}`, after);
      // (each section read in full or as its key points: at the quick pace, its key points; at the pace for today's
      // training, in full only the sections today's lessons need)
      Object.assign(N[`c${k}s${x.j}`], { if: need.has(x.sec.id) ? { not: { flag: 'quick' } } : { not: { any: [{ flag: 'quick' }, { flag: 'need' }] } }, else: `r${k}s${x.j}` });
    });
    const [a, b] = runs[k];
    N[check] = { speaker: S, text: b > a ? `第 ${c.n} 章の確認です。${b - a} 問、答えてください。` : `第 ${c.n} 章はここまでです。`, next: b > a ? `q${a}` : nextC };
    quizNodes(N, qs, { from: a, to: b, end: false, then: nextC, fitTo: LINE_MAX });
  });
  // (only the end: the day's questions scored, and the score said — not to a class taken up midway, which did not ask
  // the questions before its place)
  quizNodes(N, qs, { from: qs.length, then: 'score' });
  N.score = { speaker: S, text: '{quiz.right} / {quiz.n} 問、{quiz.pct}% でした。', if: { not: { flag: 'resumed' } }, else: 'bye', next: 'bye' };
  N.bye = { speaker: S, text: 'Great job today. 教科書の同じ章を、今夜もう一度読んでおいてください。See you tomorrow!', hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'class' }], end: true };
  // the start: the day's chapters, then how to go through them
  const titles = chs.map(c => `第 ${c.n} 章${q(c.title)}`).join('と'), hi = `Good morning, everyone. 今日は${titles}です。`;
  const paceSet = (p) => [...(PACE_FLAG[p] ? [{ set: PACE_FLAG[p] }] : []), { hook: 'pace', arg: p }];
  N.hello = { speaker: S, text: hi.length <= LINE_MAX ? hi : `Good morning, everyone. 今日は第 ${chs[0].n} 章から第 ${chs[chs.length - 1].n} 章まで、${chs.length} つの章です。`, hook: { name: 'look', arg: 'player' }, next: pace ? 'c0' : 'pace', ...(pace && PACE_FLAG[pace] ? { effects: [{ set: PACE_FLAG[pace] }] } : {}) };
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
    N.pace = { speaker: S, text: '今日はどのように進めますか？ 時間は、読む速さの目安です。', choices: paceChoices };
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
  N.hello = { speaker: 'lecturer', text: `Welcome to the training device room. 今日は ${k}：${title}です。`, hook: { name: 'look', arg: 'player' }, next: 'intro' };
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
    if (k === 'k2') questions = pfdPictures(seed + attempt * 101).map((p, i) => ({ ...readQuestion(p, i, r), id: `pfd:${['ias', 'alt', 'hdg', 'vs', 'bank'][i % 5]}` }));
    if (k === 'k3') questions = shuffled(kinds(R.DRILLS, DRILL_ANSWERS).map(kind => ({ kind, ...R.DRILLS[kind].make(r) })), r).map(x => ({ id: `drill:${x.kind}`, q: callFix(x.q), opts: x.opts.map(callFix), ok: x.opts.indexOf(x.ok), why: callFix(x.why), say: x.say ? callFix(x.say) : undefined }));
    if (k === 'k5') questions = pick(R.SCENES.filter(sc => ok(SCENE_ANSWERS[sc.id])), 10, r).map(sc => { const o = shuffled(sc.options.map((t, j) => ({ t: callFix(t), ok: j === sc.answer })), r); return { id: `scene:${sc.id}`, q: `${sc.title}：${callFix(sc.situation)}${sc.atc ? `　聞こえた：“${callFix(sc.atc)}”` : ''}　${callFix(sc.q)}`, opts: o.map(x => x.t), ok: o.findIndex(x => x.ok), why: callFix(sc.why), say: sc.atc ? callFix(sc.atc) : undefined }; });
    if (k === 'k6') questions = shuffled(kinds(R.LISTEN, LISTEN_ANSWERS).map(kind => { const x = R.LISTEN[kind](r); x.opts = shuffled([...new Set(x.opts)], r); return { kind, ...x }; }), r).map(x => ({ id: `listen:${x.kind}`, q: `（英語を聞いて）${callFix(x.q)}`, opts: x.opts.map(callFix), ok: x.opts.indexOf(x.ok), why: callFix(x.why), say: callFix(x.say) }));
    N.intro = { speaker: 'lecturer', text: k === 'k2' ? '画面の PFD を読んで答えてください。10 問、80% で合格です。' : k === 'k6' ? '英語の指示が流れます。聞いて、内容を選んでください。10 問、80% で合格です。' : '10 問です。80% で合格。Take your time.', next: 'q0' };
    quizNodes(N, questions, {});
    resultNodes(N, 'lecturer', `Excellent! ${k} は合格です。`, 'Not yet. 大丈夫、間違えたところを見直して、もう一度やりましょう。準備ができたら、また声をかけてください。');
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
export function examDialogs(FL, id, { seed = 1, speaker, exam = null, attempt = 0, heard = null } = {}) {
  const E = exam || EXAMS[id]; if (!E) throw new Error(`examDialogs: no test ${id}`);
  const r = rng(seed * 17 + id.length + attempt * 7919), who = speaker || (id === 'written1' ? 'lecturer' : 'instructor'), book = gameBook(FL);
  const taught = id === 'written1' || heard ? (heard || new Set(sectionsBefore(FL, CLASS_CHAPTERS.length))) : null;
  const usable = (b, k) => { if (!taught || !BANK_ANSWERS[b]) return true; const a = BANK_ANSWERS[b][k] && BANK_ANSWERS[b][k].a; return !!a && allHeard(a, taught); };
  // drawn evenly from the banks
  const per = Math.ceil(E.n / E.banks.length), pool = [];
  for (const b of E.banks) pool.push(...pick((FL.quiz.BANKS.find(x => x.id === b) || { qs: [] }).qs.map((x, k) => ({ x, id: `${b}#${k}` })).filter(o => usable(o.id.split('#')[0], +o.id.split('#')[1])), per, r));
  const qs = pick(pool, E.n, r).map(o => fromBank(book, r, o.id)(o.x));
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
