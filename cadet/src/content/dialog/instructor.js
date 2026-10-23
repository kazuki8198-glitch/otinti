// CADET — content/dialog/instructor.js : 早瀬 教官 (fictional), the cadet's instructor: today's lesson briefing ('brief')
// and questions about the textbook ('ask'). Every aviation fact comes from FLIGHT LAB's data: the syllabus lesson
// (title, goal, why, brief, std) and the game's textbook (content/book.js: key points, figures). Written text is made
// speakable (FLIGHT LAB's key names and notes about its own pages left out) and, where the ending is one this file
// knows for sure, put into です / ます; anything else is quoted as written rather than guessed at.
// Hooks the game acts out: look 'player'; point 'board' | 'screen' | 'apron'; nod; board <section id> (shows that
// section's figure on the briefing room's screen); book <section id> (opens the textbook there).
import { gameBook, sentences } from '../book.js';

export const INSTRUCTOR = { id: 'instructor', name_ja: '早瀬 航', title_ja: '早瀬 教官', role_ja: '担当教官' };
const SPEAKERS = { instructor: { name_ja: INSTRUCTOR.title_ja, color: '#5cc8ff' }, player: { name_ja: 'あなた', color: '#f2b632' } };
const FLAGS = ['met_instructor', 'briefed_today', 'brief_checked'];
const HOOKS = ['board', 'book', 'nod', 'point', 'look'];
const CHOICES_MAX = 12;
const LINE = 90;                                                               // characters per line, where the data allows
const KEY_LINES = 4;                                                           // an answer: at most this many lines

// ---- making written text speakable ----

const KEY = '[WASDQERFTVBZXU]';                // FLIGHT LAB's keys (G is not here: it is also the unit of load factor)
const JA = 'ぁ-んァ-ヶー\\u4e00-\\u9fff';
// a key letter stands alone after Japanese or an arrow (落ち着いたら T・B でブレーキ・→ E（右ラダー）), not inside English
// (Class D で・TO 表示・T 字)
const NB = `(?<=^|[${JA}、。：（「→]\\s?)`, NA = '(?![A-Za-z0-9\\-]|\\s*字)';
const KEY_ONLY = new RegExp(`^\\s*${KEY}(?:\\s*[/／]\\s*${KEY})*\\s*$`);         // （R / F）（T）（E）
const KEY_AT_END = new RegExp(`[ぁ-ん]\\s*${KEY}\\s*$`);                         // （機首が左へ振られたら E）
const APP_NOTE = /キー|Shift\s*\+|Enter\s*で|長押し|押し続ける|空島|シミュレータ|この教材|教材では|^[\s[\]/−+＋-]*$/;
// what still names FLIGHT LAB's controls or pages after the clean-up: such a sentence is not said at all
export const NOT_SPOKEN = /キーボード|キー|Shift\s*\+|Enter\s*で|空島|この教材|教材では|教材用の簡略化|シミュレータ|メニュー/;

// written (HTML) → what the instructor can say: tags out, key names and app notes out, the instructor's own viewpoint
export function speakable(html) {
  let s = String(html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^公開情報では、?/, '').replace(/教官に伝えるつもりで/g, 'わたしに伝えるつもりで')
    .replace(/教官に伝える(?=。|$)/g, 'わたしに伝えてください');                     // the instructor is the one they tell
  s = s.replace(new RegExp(`${NB}${KEY} キー（([${JA}][^）]*)）`, 'g'), '$1');      // T キー（トリム） → トリム
  s = s.replace(new RegExp(`${NB}${KEY}（([${JA}][^）]*)）`, 'g'), '$1');            // E（右ラダー） → 右ラダー
  s = s.replace(/[（(]([^（）()]*)[）)]/g, (m, t, at, all) => {
    const before = all.slice(0, at), after = all.slice(at + m.length);
    const app = KEY_ONLY.test(t) || KEY_AT_END.test(t) || APP_NOTE.test(t) || (t.trim() === 'G' && /脚[^（]{0,6}$/.test(before));
    if (!app) return m;
    return /[A-Za-z0-9]$/.test(before) && /^[^\s。、）]/.test(after) ? ' ' : '';   // keep "CRS でコースを" apart
  });
  s = s.replace(new RegExp(`\\s?${NB}${KEY} を(少しずつ)?押して\\s?`, 'g'), '$1');   // S を少しずつ押して → 少しずつ
  s = s.replace(new RegExp(`\\s?${NB}${KEY} で\\s?`, 'g'), '');                      // S で少し引いて / B でブレーキ
  s = s.replace(/[[\]＝・左右]+\s*のキーで/g, '');                                   // [＝左・]＝右 のキーで
  s = s.replace(new RegExp(`\\s?${NB}T${NA}\\s?`, 'g'), 'トリム');                   // 落ち着いたら T → トリム
  return s.replace(/([^\s①-⑩])([②-⑩])/g, '$1 $2').replace(/([^\s])→/g, '$1 →').replace(/→([^\s])/g, '→ $1')
    .replace(/\s+([。、）」])/g, '$1').replace(/\s+/g, ' ').trim();
}

// ---- です / ます ----

const DONE = /(?:です|ます|ません|ましょう|ください|でしょう|でした|ました)$/;
const A_TO_I = { わ: 'い', か: 'き', が: 'ぎ', さ: 'し', た: 'ち', な: 'に', ば: 'び', ま: 'み', ら: 'り' };
const U_TO_I = { う: 'い', す: 'し', ぬ: 'に', ぶ: 'び', む: 'み' };
const E_I_ROW = /[いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ]/;
const ICHIDAN_KANJI = /[見出来得寝着似経居]/;                                   // 見る・出る…; other kanji + る are godan (乗る・取る・守る)
const KU_VERB = /[行向引聞書置開続動描届浮傾着付吹づ働抜巻歩招説効導築輝驚省]/;  // 引く・向く (大きく・早く are adverbs)
const GU_VERB = /[防急泳注稼繋剥脱騒塞]/;                                       // 防ぐ・急ぐ (まっすぐ is not a verb)
const ADJ_NAI = /(?:少|危|切|汚|幼|拙)ない$/;
const NOUN_KANA = /(?:同じ|ため|おかげ|とき|もの|ところ|はず|ほう|\d\s?つ)$/;    // nouns in kana: 同じです・ためです・1 つです
const isKanji = (c) => /[\u4e00-\u9fff々]/.test(c);
const isHira = (c) => /[ぁ-ゖ]/.test(c);
const NOUN_END = /[\u4e00-\u9fff々ァ-ヶーA-Za-z0-9%°）)]$/;                    // a noun can end a sentence before です
// a noun at the end that is really an action after a particle (右へ修正・滑走路に接地・ずつ減速): left as written
const ACTION_NOUN = /(?:[へにをでと]|まで|ずつ|から|たら|なら)\s*[^\sぁ-ゖ、。]+$/;

// the polite form of the predicate that ends `s`, or null when this cannot be sure of it
function politeEnd(s) {
  if (DONE.test(s)) return s;
  if (/(?:だ|である)$/.test(s)) return s.replace(/(?:だ|である)$/, 'です');
  if (/(?:では|じゃ)ない$/.test(s)) return s.replace(/(?:では|じゃ)ない$/, 'ではありません');
  if (/がない$/.test(s) && GU_VERB.test(s.slice(-4, -3))) return s.slice(0, -3) + 'ぎません';   // 急がない
  if (/[はがもど]ない$/.test(s)) return s.replace(/ない$/, 'ありません');         // 決まりはない・ほとんどない
  if (ADJ_NAI.test(s)) return s + 'です';
  if (/ない$/.test(s)) {
    const c = s.slice(-3, -2);                                                 // the verb stem's last character
    if (A_TO_I[c]) return s.slice(0, -3) + A_TO_I[c] + 'ません';               // 引き返さない → 引き返しません
    if (E_I_ROW.test(c) || isKanji(c)) return s.slice(0, -2) + 'ません';       // 上げない・できない・しない
    return null;
  }
  if (/(?:よう|そう|ろう)$/.test(s)) return null;
  if (NOUN_KANA.test(s)) return s + 'です';
  if (/[てで](?:おく|いく)$/.test(s)) return s.slice(0, -1) + 'きます';           // 決めておく・降りていく
  if (/い$/.test(s)) return s + 'です';                                         // しやすい・小さい・多い
  if (/する$/.test(s)) return s.slice(0, -2) + 'します';
  if (/てくる$/.test(s)) return s.slice(0, -2) + 'きます';
  const last = s.slice(-1), prev = s.slice(-2, -1);
  if (last === 'る') {
    if (isKanji(prev)) return s.slice(0, -1) + (ICHIDAN_KANJI.test(prev) ? 'ます' : 'ります');
    if (E_I_ROW.test(prev)) return s.slice(0, -1) + 'ます';                    // 上げる・確かめる・できる
    if (isHira(prev)) return s.slice(0, -1) + 'ります';                        // なる・わかる・上がる
    return null;
  }
  if (last === 'く') return KU_VERB.test(prev) ? s.slice(0, -1) + 'きます' : null;
  if (last === 'ぐ') return GU_VERB.test(prev) ? s.slice(0, -1) + 'ぎます' : null;
  if (last === 'つ') return isKanji(prev) ? s.slice(0, -1) + 'ちます' : null;  // 保つ・断つ (少しずつ・1 つ are not verbs)
  if (U_TO_I[last]) return isKanji(prev) || isHira(prev) ? s.slice(0, -1) + U_TO_I[last] + 'ます' : null;
  if (NOUN_END.test(s)) return s + (/[A-Za-z0-9.%°]$/.test(s) ? ' です' : 'です');
  return null;
}

// the closing brackets at the end of `s`, nested ones too: '…全員にある（91.113(b)）' → ['…全員にある', '（91.113(b)）']
function splitTail(s) {
  let core = s;
  for (;;) {
    if (!/[）)]$/.test(core)) break;
    let depth = 0, i = core.length - 1;
    for (; i >= 0; i--) {
      const c = core[i];
      if (c === '）' || c === ')') depth++;
      else if ((c === '（' || c === '(') && --depth === 0) break;
    }
    if (i <= 0) break;                                                         // unbalanced, or the whole sentence is in brackets
    core = core.slice(0, i).trimEnd();
  }
  return [core, s.slice(core.length)];
}
const unbracket = (s) => { let t = s; for (let p = null; p !== t; ) { p = t; t = t.replace(/[（(][^（）()]*[）)]/g, ''); } return t; };

// one sentence in です / ます where that is certain; lists (→ ① or several predicates), quotes and bare phrases
// ("フルパワー。") as written
export function polite(sentence) {
  const s = String(sentence).trim();
  const stop = /。$/.test(s) ? '。' : '';
  const [core, tail] = splitTail(stop ? s.slice(0, -1) : s);
  const bare = unbracket(core).replace(/「[^」]*」/g, '「」');
  if (!core || /[→①-⑩]/.test(bare) || /[」』…〜、]$/.test(core)) return s;
  // 近づかない・下を通らない・間をすり抜けない: several predicates in a row (止まる・遅れるときは… is one)
  if (/(?:ない|[うくぐすつぬぶむる])・/.test(bare) && !/は/.test(bare.slice(bare.lastIndexOf('・')))) return s;
  const noun = !isHira(core.slice(-1)) || NOUN_KANA.test(core);
  const colon = bare.split(/[：:]/);
  // "X：…" reads as a definition: said politely, unless it is a list (a noun at the end, or several 、)
  if (colon.length > 1 && (noun || (colon[colon.length - 1].match(/、/g) || []).length >= 2)) return s;
  if (noun && (!/[はがの]/.test(bare) || ACTION_NOUN.test(core))) return s;
  const p = politeEnd(core);
  return p === null ? s : p + tail + '。';
}

// text → the lines the instructor says: sentences in です / ます, a short one joined to its neighbour, a long one
// split at a step (②③…), an arrow or a comma near its middle. whole: a text with any sentence that cannot be said
// (it names FLIGHT LAB's controls or pages) is left out altogether, so what remains never loses its context
export function speechLines(text, { max = LINE, whole = false, steps = false } = {}) {
  const out = [];
  let all = sentences(speakable(text));
  if (whole && all.some(x => NOT_SPOKEN.test(x))) return [];
  // steps: a procedure (手順：①… ②… ③…) is said one step at a time, each step a sentence of its own
  if (steps) all = all.flatMap(x => {
    const i = x.indexOf('①');
    if (i < 0 || !/[②-⑩]/.test(x)) return [x];
    const parts = x.slice(i).replace(/。$/, '').split(/\s*(?=[②-⑩])/).map(t => `${t[0]} ${polite(t.slice(1).trim() + '。')}`);
    parts[0] = x.slice(0, i).trim() + parts[0];
    return parts;
  });
  for (const sen of all) {
    if (NOT_SPOKEN.test(sen)) continue;
    // 。 closes a Japanese sentence; one that ends in English or a quotation keeps its own ending
    const p = polite(/[。！？.!?”"]$/.test(sen) || /[A-Za-z0-9]$/.test(sen) ? sen : sen + '。');
    const last = out[out.length - 1];
    const short = last !== undefined && (last.length < 20 || p.length < 16) && last.length + p.length <= 60;
    // a phrase that leans on its neighbour (使える滑走路が残っていない高さで。・ファイナル（約 5 km）から。) or a bare
    // label (ILS（計器着陸装置）。) is not left on a line of its own while the two still fit on one
    const leans = last !== undefined && [last, p].some(x => /(?:で|から|まで)。$/.test(x) || x.length < 16) && last.length + p.length <= max;
    if (short || leans) out[out.length - 1] = last + (/[。！？]$/.test(last) ? '' : ' ') + p;
    else out.push(p);
  }
  return out.flatMap(l => split(l, max));
}
// a long line in two at a step (② …), before an arrow or after a comma, where both halves keep a fair length;
// with no such place it stays whole
function split(line, max) {
  if (line.length <= max) return [line];
  const cuts = [];
  for (const m of line.matchAll(/ (?=[②-⑩])|、| (?=→)/g)) cuts.push(m.index + m[0].length);
  const fair = cuts.filter(c => c >= 30 && line.length - c >= 30);
  if (!fair.length) return [line];
  const mid = line.length / 2;
  const at = fair.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
  return [...split(line.slice(0, at).trim(), max), ...split(line.slice(at).trim(), max)];
}
// the first lines of a text, up to `n` but never stopping on a line that ends in mid-sentence (、)
function firstLines(lines, n) {
  const out = [];
  for (const l of lines) { if (out.length >= n && !/、$/.test(out[out.length - 1])) break; out.push(l); }
  return out;
}
const verbEnd = (s) => { const c = s.trim().replace(/。$/, ''); return isHira(c.slice(-1)) && /[うくぐすつぬぶむる]$/.test(c) && politeEnd(c) !== null && !/(?:ずつ|まっすぐ)$/.test(c); };
const partShort = (t) => String(t).replace(/[（(][^（）()]*[）)]\s*$/, '').trim();
const q = (t) => '「' + String(t).replace(/「/g, '『').replace(/」/g, '』') + '」';   // a title in quotes (its own quotes become 『』)

// ---- the lesson ----

function lessonsOf(FL) { return FL.syllabus && Array.isArray(FL.syllabus.STAGES) ? FL.syllabus.STAGES.flatMap(s => s.lessons || []) : []; }

// how alike two short texts are (shared pairs of characters, 0–1)
function alike(a, b) {
  const pairs = (s) => { const o = new Set(); for (let k = 0; k + 1 < s.length; k++) o.add(s.slice(k, k + 2)); return o; };
  const A = pairs(a), B = pairs(b);
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return n / Math.max(1, A.size + B.size - n);
}

// one question about today's goal: the right answer and two goals of other lessons, in an order that depends on the lesson.
// A goal worded almost like today's (ランダムな 10 場面・80% で合格 next to ランダムな PFD の表示を読み取る 10 問・80% で合格)
// is not offered: the check asks what was said, not how closely it was heard.
function goalCheck(lessons, lesson) {
  const all = lessons.filter(l => !!l.why === !!lesson.why);                   // flight lessons with flight lessons, ground with ground
  const i = Math.max(0, all.findIndex(l => l.id === lesson.id));
  const goalOf = (l) => (sentences(speakable(l.goal)).pop() || '').replace(/。$/, '');   // "実地試験の定番。バンク 45° で…" → its aim
  const pick = [], used = new Set([goalOf(lesson)]);
  for (const k of [4, 9, 13, 17, 21, 25, 29, 33, 2, 6]) {
    const o = all[(i + k) % all.length];
    const g = o && goalOf(o);
    if (!g || used.has(g) || g.length > 46 || alike(g, goalOf(lesson)) >= 0.4) continue;
    used.add(g); pick.push({ id: o.id, title: o.title, goal: g });
    if (pick.length === 2) break;
  }
  const right = { id: lesson.id, title: lesson.title, goal: goalOf(lesson), right: true };
  const opts = [...pick];
  opts.splice((2 * i + 1) % (opts.length + 1), 0, right);                    // the right answer moves about (not first in a1)
  return opts;
}

// ---- the dialogs ----

// day: the day's lessons in order, when today's lesson is flown inside a whole day (M4: t1 → a2 → t3); the briefing
// then says where it sits in the day and the wrap-up sends the cadet to the walk-around
export function instructorDialogs(FL, { lessonId = 'a1', day = null } = {}) {
  const book = gameBook(FL);
  const all = lessonsOf(FL);
  const lesson = all.find(l => l.id === lessonId);
  if (!lesson) throw new Error(`instructorDialogs: no lesson "${lessonId}" in FLIGHT LAB's syllabus`);
  const say = (text, more = {}) => ({ speaker: 'instructor', text, ...more });

  // a chain of lines: ids `${base}`, `${base}:2`, … ; the last one goes on to `next`. → the first id
  function chain(nodes, base, lines, next, extra = []) {
    const ids = lines.map((_, k) => (k ? `${base}:${k + 1}` : base));
    lines.forEach((t, k) => { nodes[ids[k]] = say(t, { ...(extra[k] || {}), next: k + 1 < lines.length ? ids[k + 1] : next }); });
    return ids[0] || next;
  }

  // ---- 'brief' ----
  const B = {};
  const title = speakable(lesson.title);
  const goalParts = sentences(speakable(lesson.goal));
  const goal = (goalParts.pop() || '').replace(/。$/, '');
  const goalLine = verbEnd(goal) ? `目標は、${goal}ことです。` : `目標は${q(goal)}です。`;
  const why = lesson.why ? speechLines(lesson.why) : [];
  const points = (Array.isArray(lesson.brief) ? lesson.brief : []).flatMap(b => speechLines(b, { steps: true }));
  const std = lesson.std ? speakable(lesson.std) : '';
  const figSec = book.lessonSections(lesson.id).map(s => book.section(s.id)).find(s => s && s.figure);
  const figLines = figSec && figSec.caption ? firstLines(speechLines(figSec.caption.replace(/^図[：:]\s*/, '')), 2) : [];

  B.hello = say('はじめまして。今日からあなたの担当教官になる、早瀬 航です。', {
    if: { not: { flag: 'met_instructor' } }, else: 'again', effects: [{ hook: 'look', arg: 'player' }], next: 'hello:2' });
  B['hello:2'] = say('ここ、翔洋航空 フライトアカデミーでは、飛ぶ前に必ずこの部屋でブリーフィングをします。', { next: 'hello:3' });
  B['hello:3'] = say('何を、どう飛ぶのか。地上で頭に入れておけば、空の上で慌てずに済みます。', { choices: [{ text: 'よろしくお願いします', next: 'hello:4' }] });
  // met only once the greeting is over (a talk cut short before this greets you again from the start)
  B['hello:4'] = say('こちらこそ、よろしくお願いします。わからないことは、いつでも聞いてください。', { effects: [{ set: 'met_instructor' }], hook: { name: 'nod' }, next: 'menu' });
  B.again = say('おかえりなさい。準備は進んでいますか。', { if: { flag: 'briefed_today' }, else: 'again:2', hook: { name: 'look', arg: 'player' }, next: 'menu' });
  B['again:2'] = say('お疲れさまです。準備はいいですか。', { hook: { name: 'look', arg: 'player' }, next: 'menu' });

  // the menu: before the check / between the check and the wrap-up / after the wrap-up. Each one lets you leave.
  B.menu = say('何から始めましょうか。', { if: { not: { flag: 'brief_checked' } }, else: 'menu:mid', choices: [
    { text: '今日の課目を教えてください', next: 'lesson' },
    { text: '質問があります', next: 'ask:root' },
    { text: 'また後で来ます', next: 'later' },
  ] });
  B['menu:mid'] = say('では、続けましょうか。', { if: { not: { flag: 'briefed_today' } }, else: 'menu:done', choices: [
    { text: 'このあとの流れを教えてください', next: 'wrap' },
    { text: '今日の課目をもう一度聞かせてください', next: 'lesson' },
    { text: '質問があります', next: 'ask:root' },
    { text: 'また後で来ます', next: 'later' },
  ] });
  B.later = say('わかりました。準備ができたら、声をかけてください。', { hook: { name: 'nod' }, end: true });
  B['menu:done'] = say('ほかに何かありますか。', { choices: [
    { text: '今日の課目をもう一度聞かせてください', next: 'lesson' },
    { text: '質問があります', next: 'ask:root' },
    { text: '準備に向かいます', next: 'bye' },
  ] });

  // today's lesson: title → goal → why (with the figure on the board) → the points → the standard
  const steps = [];                                                            // [text, extra]
  steps.push([`ホワイトボードを見てください。今日の課目は${q(title)}です。`, { hook: { name: 'point', arg: 'board' } }]);
  for (const g of goalParts) steps.push(...speechLines(g).map(t => [t, {}]));
  steps.push([goalLine, {}]);
  if (why.length) {
    steps.push(['まず、この課目の考え方からお話しします。', { hook: { name: 'look', arg: 'player' } }]);
    steps.push(...why.map(t => [t, {}]));
  }
  if (figSec) {
    steps.push([`図にすると、こうなります。教科書の${q(figSec.title)}にある図です。`, { hook: { name: 'board', arg: figSec.id } }]);
    steps.push(...figLines.map((t, k) => [t, k ? {} : { hook: { name: 'point', arg: 'screen' } }]));
  }
  if (points.length) {
    steps.push(['では、飛び方のポイントです。', { hook: { name: 'point', arg: 'board' } }]);
    steps.push(...points.map(t => [t, {}]));
  }
  if (std && std.length <= LINE - 12) steps.push([`今日の基準は${q(std)}です。`, { hook: { name: 'look', arg: 'player' } }]);
  else if (std) steps.push(['今日の基準は、こうです。', { hook: { name: 'look', arg: 'player' } }], [/[。」）]$/.test(std) ? std : std + '。', {}]);
  if (Array.isArray(day) && day.length > 1) {
    const T = (id) => { const l = all.find(x => x.id === id); if (!l) throw new Error(`instructorDialogs: no lesson "${id}"`); return q(speakable(l.title)); };
    const at = day.indexOf(lesson.id), before = day.slice(0, Math.max(0, at)).map(T), after = day.slice(at + 1).map(T);
    steps.push([`今日はこの課目を、1 日の飛行の中でやります。${before.length ? `まず${before.join('と')}で離陸して、` : ''}訓練空域でこの課目、${after.length ? `戻って${after.join('と')}です。` : 'それで戻ります。'}`, { hook: { name: 'point', arg: 'board' } }]);
  }
  chain(B, 'lesson', steps.map(x => x[0]), 'check', steps.map(x => x[1]));

  // the check: one question, three answers
  const opts = goalCheck(all, lesson);
  B.check = say('では、ひとつ確認させてください。今日の課目の目標は、次のうちどれでしょう。', {
    if: { not: { flag: 'brief_checked' } }, else: 'post',
    choices: opts.map((o, k) => ({ text: o.goal, next: o.right ? 'check:ok' : `check:ng${k}`,
      effects: o.right ? [{ set: 'brief_checked' }, { trust: 'instructor', add: 3 }] : [{ set: 'brief_checked' }] })),
  });
  B['check:ok'] = say('そのとおりです。よく聞いていましたね。', { hook: { name: 'nod' }, next: 'check:ok:2' });
  B['check:ok:2'] = say('目標がはっきりしていれば、何に集中すればいいかが決まります。', { next: 'post' });
  opts.forEach((o, k) => { if (!o.right) B[`check:ng${k}`] = say(`それは${q(speakable(o.title))}の課目の目標ですね。`, { next: 'check:fix' }); });
  B['check:fix'] = say(`今日の${goalLine}`, { hook: { name: 'point', arg: 'board' }, next: 'check:fix:2' });
  B['check:fix:2'] = say(`大丈夫。${lesson.aircraft ? '飛ぶ' : '始める'}前に確かめられて、よかったです。`, { next: 'post' });   // ground lessons do not fly

  B.post = say('ここまでで、質問はありますか。', { choices: [
    { text: '質問があります', next: 'ask:root' },
    { text: '大丈夫です', next: 'wrap' },
  ] });

  // the wrap-up: a flight lesson goes to dispatch, then out to the aircraft; a ground lesson to the training devices
  B.wrap = say('では、このあとの流れです。', { next: 'wrap:2' });
  if (lesson.aircraft) {
    B['wrap:2'] = say('まず運航管理（ディスパッチ）で、今日の機体の割り当てと天気を確かめてください。', { next: 'wrap:3' });
    B['wrap:3'] = day ? say('それからエプロン（駐機場）の今日の機体へ。外部点検をして、異常があれば私に知らせてください。私は機体のところで待っています。', { hook: { name: 'point', arg: 'apron' }, next: 'wrap:4' })
      : say('それからエプロン（駐機場）へ出て、機体のところまで歩いていきましょう。', { hook: { name: 'point', arg: 'apron' }, next: 'wrap:4' });
    B['wrap:4'] = say('体調に不安があれば、遠慮なく言ってください。飛ばないと決めるのも、大切な判断です。', { next: 'bye' });
  } else {
    B['wrap:2'] = say('今日は飛びません。訓練装置室の練習席で、この課目を進めてください。', { next: 'wrap:3' });
    B['wrap:3'] = say('地上での練習も、空の上でそのまま役に立ちます。', { next: 'bye' });
  }
  // briefed once the wrap-up has been heard to the end (every way to the end of it passes here)
  B.bye = say('では、行きましょう。焦らず、一つずつ確かめていけば大丈夫です。', { effects: [{ set: 'briefed_today' }], hook: { name: 'nod' }, end: true });

  // ---- 'ask' ----
  const A = {};
  const toMenu = { text: '質問はもうありません', next: 'brief:menu' };
  // a list of choices across pages of at most 12 (次へ / 戻る between them); `back` is where 戻る on the first page goes
  function pages(id, text, items, back) {
    const one = items.length + (back ? 1 : 0) + 1 <= CHOICES_MAX;              // all on one page with 戻る and 質問はもうありません
    const per = one ? items.length : CHOICES_MAX - 3;                          // else room for 次へ, 戻る and 質問はもうありません
    const n = one ? 1 : Math.ceil(items.length / per);
    for (let p = 0; p < n; p++) {
      const pid = p ? `${id}:${p + 1}` : id;
      const choices = items.slice(p * per, (p + 1) * per);
      if (p + 1 < n) choices.push({ text: '次へ', next: `${id}:${p + 2}` });
      if (p) choices.push({ text: '戻る', next: p > 1 ? `${id}:${p}` : id });
      else if (back) choices.push({ text: '戻る', next: back });
      choices.push(toMenu);
      A[pid] = say(p ? '続きです。どれにしますか。' : text, { choices });
    }
  }

  const today = book.lessonSections(lesson.id);
  const parts = (FL.book.PARTS || []).filter(p => book.chapters.some(c => c.part === p.id));
  const rootItems = [
    ...today.map(s => ({ text: `${s.title}（今日の課目）`, next: `sec:${s.id}` })),
    ...parts.map(p => ({ text: partShort(p.title), next: `part:${p.id}` })),
  ];
  pages('root', today.length ? '何について聞きたいですか。今日の課目に関係するところから挙げますね。' : '何について聞きたいですか。', rootItems, null);

  for (const p of parts) {
    const chs = book.chapters.filter(c => c.part === p.id);
    pages(`part:${p.id}`, `${partShort(p.title)}ですね。どの章にしますか。`, chs.map(c => ({ text: `第 ${c.n} 章　${c.title}`, next: `chap:${c.id}` })), 'root');
    for (const c of chs) {
      pages(`chap:${c.id}`, `第 ${c.n} 章${q(c.title)}ですね。どの節を聞きたいですか。`,
        c.sections.map(s => ({ text: s.title, next: `sec:${s.id}` })), `part:${p.id}`);
    }
  }

  for (const c of book.chapters) for (const s of c.sections) {
    const sec = book.section(s.id);
    const id = `sec:${s.id}`;
    // the answer: the key points (or the opening sentences), at most four lines
    const fromKeys = /class="bk-key"/.test(sec.html);
    const lines = [];
    let used = 0;
    for (const k of sec.keyPoints) {
      const l = speechLines(k, { whole: true });
      if (!l.length || lines.length + l.length > KEY_LINES) continue;
      lines.push(...l); used++;
    }
    if (!lines.length) { lines.push(...firstLines(speechLines(sec.summary || sec.text), KEY_LINES)); used = 0; }
    // a count only when every point in the book's box is said (one cut for length or left unsaid would make it wrong)
    const intro = !fromKeys || !used ? `${q(sec.title)}ですね。かいつまんで話します。`
      : used < sec.keyPoints.length ? `${q(sec.title)}ですね。大事なところを話します。`
        : used === 1 ? `${q(sec.title)}ですね。大事なのは、この一点です。` : `${q(sec.title)}ですね。大事なことは ${used} つあります。`;
    const menuChoices = [
      { text: '教科書で読む', next: `${id}:read` },
      ...(sec.figure ? [{ text: '図を画面に映してください', next: `${id}:board` }] : []),
      { text: 'ほかの質問', next: 'root' },
      { text: 'ありがとうございました', next: 'thanks' },
    ];
    A[id] = say(intro, { hook: { name: 'look', arg: 'player' }, next: chain(A, `${id}:k`, lines, `${id}:menu`) });
    A[`${id}:menu`] = say(sec.figure ? '詳しくは教科書のこの節にあります。図もありますよ。' : '詳しくは教科書のこの節にあります。', { choices: menuChoices });
    A[`${id}:again`] = say('ほかに、この節で確かめたいことはありますか。', { choices: menuChoices });
    A[`${id}:read`] = say(`教科書の${q(sec.title)}です。ゆっくり読んでください。`, { hook: { name: 'book', arg: s.id }, next: `${id}:again` });
    if (sec.figure) {
      const cap = sec.caption ? firstLines(speechLines(sec.caption.replace(/^図[：:]\s*/, '')), 2) : [];
      A[`${id}:board`] = say('いいですよ。画面に映しますね。', { hook: { name: 'board', arg: s.id }, next: `${id}:fig` });
      chain(A, `${id}:fig`, cap.length ? cap : ['図と教科書の説明を、照らし合わせてみてください。'], `${id}:again`, [{ hook: { name: 'point', arg: 'screen' } }]);
    }
  }
  A.thanks = say('どういたしまして。わからないことは、そのままにしないでくださいね。', { hook: { name: 'nod' }, next: 'brief:menu' });

  return {
    speakers: SPEAKERS, flags: [...FLAGS], hooks: [...HOOKS],
    dialogs: { brief: { start: 'hello', nodes: B }, ask: { start: 'root', nodes: A } },
  };
}

// the context the dialogs can be shown with (they hold no placeholders: the lesson's words are written in when the
// data is built); a sample for the validator and the tests
export function sampleCtx(FL) {
  const l = lessonsOf(FL).find(x => x.id === 'a1') || {};
  return { lesson: { id: l.id || 'a1', title: l.title || '', goal: l.goal || '', std: l.std || '' }, instructor: { ...INSTRUCTOR } };
}
