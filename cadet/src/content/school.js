// CADET — content/school.js : ground school (M5, chapter 1 and the pre-solo test), as dialog data for the runner.
//  - classes: ミラー 講師 (fictional) teaches the textbook's part 1 (content/book.js), a class a day: each section's key
//    points, its figure on the classroom's screen, then two questions from FLIGHT LAB's question bank for the chapter;
//  - the training device's six lessons (FLIGHT LAB's stage 0, k1–k6): the PFD, read on the room's screen (k1 the parts
//    one by one, k2 ten pictures to read); the radio from FLIGHT LAB's radio chapter (radio.js) — the numbers and the
//    alphabet (k3), one whole flight's calls with their meaning (k4), read-backs (k5), listening (k6, the English
//    spoken by the browser);
//  - the written tests: FLIGHT LAB's question banks (quiz.js).
// A quiz is one dialog: each question a node whose choices go to "right" or "wrong" (the reason said either way); a
// right answer sets the flag qz_<n> in the quiz's own (unsaved) state, so the game counts them at the end: the hook
// 'quizEnd' (the game scores it then, into ctx.quiz), then the result is said from ctx. Hooks: 'board' (a figure on the
// screen), 'pfd' (a PFD picture on the device room's screen: arg the picture's index; 'tutor:<part>' for k1),
// 'say' (English spoken), 'quizEnd', 'done'.
import { gameBook } from './book.js';
import { speechLines } from './dialog/instructor.js';
import { ourCall } from './dialog/atc.js';
import { PEOPLE } from './people.js';
import { EXAMS, CLASSES } from '../career/career.js';

export const SCHOOL_HOOKS = ['board', 'pfd', 'say', 'quizEnd', 'done', 'look', 'nod', 'point'];
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
// → nodes q0… and the end (the score said from ctx.quiz: { right, n, pct, pass })
export function quizNodes(N, questions, { speaker = 'lecturer', then = 'result', label = '' } = {}) {
  questions.forEach((x, k) => {
    const id = `q${k}`, nextQ = k < questions.length - 1 ? `q${k + 1}` : 'q:end';
    const more = x.say ? { hook: { name: 'say', arg: x.say } } : x.pfd != null ? { hook: { name: 'pfd', arg: String(x.pfd) } } : {};
    N[id] = { speaker, text: `${label ? label + '　' : ''}第 ${k + 1} 問（${questions.length} 問中）。${x.q}`, ...more,
      choices: x.opts.map((t, j) => ({ text: t, next: j === x.ok ? `${id}:ok` : `${id}:ng`, effects: j === x.ok ? [{ set: `qz_${k}` }] : [] })) };
    N[`${id}:ok`] = { speaker, text: `正解です。${x.why || ''}`.trim(), next: nextQ };
    N[`${id}:ng`] = { speaker, text: `正しくは${q(x.opts[x.ok])}です。${x.why || ''}`.trim(), next: nextQ };
  });
  N['q:end'] = { speaker, text: '以上です。採点しますね。', hook: { name: 'quizEnd', arg: String(questions.length) }, next: then };
}
const resultNodes = (N, speaker, passText, failText) => {
  N.result = { speaker, text: '{quiz.right} / {quiz.n} 問、{quiz.pct}% でした。', next: 'result:pass' };
  N['result:pass'] = { speaker, text: passText, if: { ctx: 'quiz.pass', is: true }, else: 'result:fail', hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'pass' }], end: true };
  N['result:fail'] = { speaker, text: failText, effects: [{ hook: 'done', arg: 'fail' }], end: true };
};

// ---------------------------------------------------------------- a class (index into CLASS_CHAPTERS)
export function classDialogs(FL, i, { seed = 1 } = {}) {
  const book = gameBook(FL), ids = CLASS_CHAPTERS[i], r = rng(seed * 31 + i);
  if (!ids) throw new Error(`classDialogs: no class ${i}`);
  const chs = ids.map(id => book.chapters.find(c => c.id === id)).filter(Boolean);
  const N = {};
  const titles = chs.map(c => `第 ${c.n} 章${q(c.title)}`).join('と');
  N.hello = { speaker: 'lecturer', text: `Good morning, everyone. 今日は${titles}です。Let's get started.`, hook: { name: 'look', arg: 'player' }, next: 'c0' };
  chs.forEach((c, k) => {
    const nextC = k < chs.length - 1 ? `c${k + 1}` : 'check';
    const secs = c.sections.map(s => book.section(s.id)).filter(Boolean);
    N[`c${k}`] = { speaker: 'lecturer', text: `${k ? 'Next, ' : ''}第 ${c.n} 章${q(c.title)}。${secs.length} 節あります。順に見ていきましょう。`, next: secs.length ? `c${k}s0` : nextC };
    secs.forEach((sec, j) => {
      const id = `c${k}s${j}`, after = j < secs.length - 1 ? `c${k}s${j + 1}` : nextC;
      // the section's title and its first key points (two lines at most: a class goes through every section)
      const pts = []; for (const kp of sec.keyPoints) { const l = speechLines(kp, { whole: true }); if (pts.length + l.length > 2) break; pts.push(...l); }
      const body = pts.length ? pts : speechLines(sec.summary || '').slice(0, 2);
      // (a line in English alone is the textbook's mnemonic: said as one)
      const lines = (body.length ? [`${q(sec.title)}。${body[0]}`, ...body.slice(1)] : [`${q(sec.title)}。`]).map(callFix)
        .map(l => (/[\u3040-\u30ff\u4e00-\u9fff]/.test(l) ? l : `英語の覚え方もあります。“${l.replace(/[.。]$/, '')}”。`));
      // the first line puts the section's figure on the screen (when it has one)
      chain(N, id, lines, after, 'lecturer', sec.figure ? { hook: { name: 'board', arg: sec.id } } : {});
    });
  });
  // two questions on what was taught (FLIGHT LAB's bank for the chapter), then the class is over
  const bankIds = [...new Set(ids.map(id => BANK_OF[id]).filter(Boolean))];
  const pool = bankIds.flatMap(b => (FL.quiz.BANKS.find(x => x.id === b) || { qs: [] }).qs);
  const qs = pick(pool, 2, r).map(fromBank(book, r));
  N.check = { speaker: 'lecturer', text: 'OK. 最後に、今日のところを 2 問だけ確かめます。', next: 'q0' };
  quizNodes(N, qs, { then: 'bye' });
  N.bye = { speaker: 'lecturer', text: 'Great job today. 教科書の同じ章を、今夜もう一度読んでおいてください。See you tomorrow!', hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'class' }], end: true };
  return { speakers: SPEAKERS, flags: qs.map((_, k) => `qz_${k}`), hooks: [...SCHOOL_HOOKS], dialogs: { class: { start: 'hello', nodes: N } }, questions: qs };
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
