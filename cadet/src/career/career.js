// CADET — career/career.js : the cadet's career (M5) — the calendar, the time of day, the weather, how tired they
// are, the chapter, what is due today, the gates between chapters, and the save.
// The days: day 1 is 2027-04-01 (a fictional calendar); each day has four times — 朝 (morning, before anything),
// 午前 (the morning's work), 午後 (the afternoon's), 夜 (evening, free) — and Sundays are days off. A day's plan comes
// from the chapter and the progress (schedule()), its weather from the career's seed (weatherFor()). The game marks
// the work done (done()), moves the time on (advance()) and sends the cadet to bed (sleep()).
// The chapters: 序章 (prologue: the first day — joining, the people, the place), 第 1 章 (ground school: classes,
// the training device's six lessons k1–k6, the written test), 第 2 章 (the 16 lessons before the first solo, the
// pre-solo written test, the check ride c1 with the chief instructor, the first solo).
// Progress in FLIGHT LAB's lessons is FLIGHT LAB's own record (school.saveProgress's shape: the game keeps it with the
// flight's store); the career reads it, it does not keep a copy. What the career keeps itself: the chapter, the day,
// the time, the fatigue, the tests' scores, the go / no-go decisions and the day's work done. Since v2 it also keeps
// the cadet's four abilities (操縦・知識・交信・判断), grown by the work itself. The flags and the trust
// are the conversations' state (dialog/engine.js), kept beside it.
// The first afternoon's introductory flight (体験飛行) is not on the plan: it is the meeting's end (main.js). Its record
// is done['intro:flight'] (flown, or cut short) or done['intro:no'] (declined), each the day it was; neither is ever
// offered again once one is kept.
// Pure logic: no three.js, no DOM.

export const CAREER_KEY = 'cadet.career';
export const CAREER_VERSION = 2;
// the cadet's abilities (the growth system): four axes, 0–100, grown by the work itself (see grow())
export const ABILITIES = ['hand', 'know', 'comm', 'judge'];
export const ABILITY_NAMES = { hand: '操縦', know: '知識', comm: '交信', judge: '判断' };
export const ABILITY_START = { hand: 10, know: 5, comm: 5, judge: 10 };
// the judgement the first solo needs, beside the instructor's trust (SOLO_TRUST)
export const SOLO_JUDGE = 30;
// (growth design v1 §4.7) the words that go with a trust value, beside its number on the tablet
export function trustBand(v) { return v >= 80 ? '深い信頼' : v >= 60 ? '信頼されている' : v >= 40 ? '通常' : 'まだ距離がある'; }
// (growth design v1 §4.6) the graduation's rank: the abilities weighted, but never the abilities alone —
// the first-try rate and the number of written tests taken count too, so retakes cannot buy the top rank.
// firstRate comes back as a percent, avgScore from FLIGHT LAB's lesson scores (only the lessons that have one)
export function graduationRank(state, prog) {
  const a = (state && state.abilities) || ABILITY_START;
  const total = a.hand * 0.35 + a.know * 0.25 + a.comm * 0.15 + a.judge * 0.25;
  const ft = (state && state.firstTry) || { pass: 0, total: 0 };
  const rate = ft.total ? ft.pass / ft.total : 0;
  const examTries = Object.values((state && state.exams) || {}).reduce((n, e) => n + (e.tries || 0), 0);
  const scores = Object.values((prog && prog.lessons) || {}).map(r => (r && r.score) || 0).filter(s => s > 0);
  const avgScore = scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : 0;
  const rank = total >= 68 && rate >= 0.88 && examTries <= 6 ? '優等' : total >= 62 && rate >= 0.6 ? '優秀' : '通常';
  return { rank, total: Math.round(total * 10) / 10, firstRate: Math.round(rate * 100), examTries, avgScore };
}
// (growth design v1 §4.1) what one finished flight lesson teaches, as [axis, base] pairs for C.grow():
// the grade's hand base, weighted by the lesson's level; a sub-axis by the id's lesson letter (n/x/e the
// judgement of navigation and emergencies, i the knowledge of instruments, the rest more hand); the
// calls a fixed crumb. Flown tired (fatigue ≥ 65 at the lesson's end): half of it, and no judgement.
export function lessonGrowth(grade, levelId, lessonId, tired = false) {
  const base = { S: 5.0, A: 4.0, B: 3.0, C: 1.5 }[grade] || 0;
  if (!base) return [];
  const w = base * (levelId === 'precision' ? 1.3 : levelId === 'intro' ? 0.5 : 1.0);
  const kind = String(lessonId || '').charAt(0);
  const sub = kind === 'i' ? 'know' : (kind === 'n' || kind === 'x' || kind === 'e') ? 'judge' : 'hand';
  const out = [['hand', w], ['comm', 0.6]];
  if (sub === 'hand') out[0][1] += w * 0.35; else out.push([sub, w * 0.35]);
  return tired ? out.filter(([a]) => a !== 'judge').map(([a, v]) => [a, v * 0.5]) : out;
}
// (growth design v1 §4.1) a passed ground lesson (FTD): the radio ones teach the calls, the others knowledge
export function ftdGrowth(id) {
  return (id === 'k3' || id === 'k4' || id === 'k5' || id === 'k6') ? [['comm', 2.4], ['hand', 0.6]] : [['know', 1.6], ['hand', 0.6]];
}
// (growth design v1 §4.1) a class done: knowledge by the pace it was taken at (full / as needed / 要点だけ)
export function classGrowth(pace) {
  return [['know', 6.0 * (pace === 'need' ? 0.7 : pace === 'quick' ? 0.45 : 1.0)]];
}
export const judgeOf = (state) => (state && state.abilities && Number.isFinite(state.abilities.judge)) ? state.abilities.judge : ABILITY_START.judge;
// (the briefing's shape, PLAN's ch2 proposal) the debrief's main missed item, kept overnight and asked about at the
// next morning's briefing (content/dialog/instructor-career.js's 'day'): a stable key, a short label. The labels a
// cadet can be asked to tell apart — yesterday's own, and these other points a debrief can make.
export const MISS_LABELS = ['停止線の手前で止まること', 'ランナップで制限を超えたときの判断', 'タキシーの速さと周りを見ること', '外部点検の外し忘れ', '無線の復唱',
  '高度を基準に保つこと', '速度を基準に保つこと', '着陸のフレア', '場周経路の形', '外部点検で見落とした異常'];
const MISS_KEY = /^[a-z][a-z0-9:_-]{0,31}$/;
// the morning's question about yesterday's miss: yesterday's label and two of the others, the right one's place
// turning with the day (null: nothing was missed, or nothing is kept)
export function missAsk(state) {
  const m = state && state.miss;
  if (!m || typeof m.label !== 'string' || !m.label) return null;
  const pool = MISS_LABELS.filter(x => x !== m.label);
  const i = ((m.day * 7 + m.label.length) % pool.length + pool.length) % pool.length;
  const options = [pool[i], pool[(i + 4) % pool.length]];
  const right = ((m.day + m.key.length) % 3 + 3) % 3;
  options.splice(right, 0, m.label);
  return { label: m.label, options, right };
}
export const START_DATE = '2027-04-01';
export const SLOTS = ['morning', 'am', 'pm', 'evening'];
export const SLOT_NAMES = { morning: '朝', am: '午前', pm: '午後', evening: '夜' };
// the sky's local time for each (the light the scene is drawn in)
export const SLOT_HOURS = { morning: 7.7, am: 9.6, pm: 14.0, evening: 18.6 };
export const CHAPTERS = {
  prologue: { n: 0, title: '序章　入社', short: '序章' },
  ch1: { n: 1, title: '第 1 章　座学', short: '第 1 章' },
  ch2: { n: 2, title: '第 2 章　ソロまで', short: '第 2 章' },
  ch3: { n: 3, title: '第 3 章　航法', short: '第 3 章', sub: '横風・短い滑走路・VOR・推測航法、そして単独の野外飛行' },
  ch4: { n: 4, title: '第 4 章　計器', short: '第 4 章', sub: 'フードをかぶって、計器だけで飛ぶ。最後は雲の中の ILS 進入' },
  ch5: { n: 5, title: '第 5 章　双発', short: '第 5 章', sub: 'Piper Seminole。エンジンが 2 つ、止まるのも片方' },
  ch6: { n: 6, title: '第 6 章　最終審査', short: '第 6 章', sub: 'TEM、そして審査官の同乗する Check Flight' },
};
// the chapters after the first solo (M6): their lessons in the order they are flown, the written test, the check
// that closes them (flown with the chief instructor, the examiner, or alone), the aircraft
export const LATER = ['ch3', 'ch4', 'ch5', 'ch6'];
export const STAGE = {
  ch3: { lessons: ['x3', 'x1', 'x2', 'n1', 'n2', 'n3'], exam: 'nav', check: 'xc', aircraft: 'pa28' },
  ch4: { lessons: ['i1', 'i2', 'i3', 'i4', 'i5'], exam: 'instr', check: 'ir', aircraft: 'pa28' },
  ch5: { lessons: ['m1', 'm2', 'm3', 'm4', 'm5'], exam: 'multi', check: 'me', aircraft: 'pa44' },
  ch6: { lessons: ['r1'], exam: 'final', check: 'final', aircraft: 'pa28' },          // (r1 in the Archer; the final check in the Seminole)
};
// the checks: kind 'xc' (the solo cross-country: the navigation log in the morning, then FLIGHT LAB's n2 flown alone —
// its diversion is the chapter's turn of events) or 'checkride' (the lessons flown one after the other with the check
// pilot in the right seat, who says nothing); each passes when every lesson in it does
export const CHECKS = {
  xc: { kind: 'xc', title: '単独の野外飛行', short: 'ソロ クロスカントリー', lessons: ['t1', 'n2', 't3'], who: null, ch: 'ch3' },
  ir: { kind: 'checkride', title: '計器飛行の審査', short: '計器の審査', lessons: ['t1', 'i3', 'i5', 't3'], who: 'chief', ch: 'ch4' },
  me: { kind: 'checkride', title: '双発の審査', short: '双発の審査', lessons: ['m4', 'm2', 'm5'], who: 'chief', ch: 'ch5' },
  final: { kind: 'checkride', title: '最終審査（Check Flight）', short: '最終審査', lessons: ['m1', 'm2', 'm5'], who: 'examiner', ch: 'ch6' },
};
// the training device's lessons (FLIGHT LAB's stage 0), in order
export const GROUND = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'];
// chapter 2's lessons in the order they are flown (t1 and t3 are flown every day round the others: they are passed
// along the way; the instructor schedules them on their own only if they are not)
export const CH2 = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't2', 't4', 'e1', 'e2', 'e3', 't1', 't3'];
export const ALL_CH2 = [...CH2, 'c1'];
// the classes of chapter 1: the textbook's part 1 (its chapters by id), a class a day (the lecturer: content/school.js).
// In this order each afternoon's training device lesson comes after the class that teaches it: the numbers and the
// alphabet (radio2) before k3, the calls of one flight (radio3, radio4) before k4, the scenes' calls, the airports
// without a tower and the emergencies (radio5) before k5; the weather before Mori asks for help with it
export const CLASSES = [['aero'], ['sys', 'perf'], ['radio1', 'radio2'], ['radio3', 'radio4'], ['wx', 'radio5'], ['law', 'hf']];
// (the order before, of the saves without the sections heard: cleanCareer reads their classes by their chapters)
const CLASSES_BEFORE = [['aero'], ['sys', 'perf'], ['wx'], ['law', 'hf'], ['radio1', 'radio2'], ['radio3', 'radio4', 'radio5']];
// the training device lesson each class comes before (the same day's afternoon)
export const CLASS_FTD = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'];
// the training device's lessons by name (FLIGHT LAB's stage 0, as CADET teaches them)
export const FTD_TITLES = { k1: 'G1000 型 PFD の読み方', k2: 'PFD の読み取り（10 問）', k3: '数字とアルファベットの言い方（10 問）', k4: '交信のチェアフライト', k5: '復唱と応答（10 問）', k6: '聞き取り（10 問）' };
// the textbook's part 1 by its chapters, in a few words (the day's plan, the guide, the toasts)
export const CHAPTER_SHORT = { aero: '飛行の原理', sys: '機体と装備', perf: '性能と重量・重心', radio1: '交信のしくみ', radio2: '言葉の決まり', radio3: '交信の型',
  radio4: '1 回の飛行の交信', wx: '航空気象', radio5: '管制塔のない空港と緊急', law: '規則と空域', hf: '人間の能力と判断' };
// (the textbook's chapter numbers of part 1: book.js gameBook's)
const CHAPTER_N = { aero: 1, sys: 2, perf: 3, wx: 4, law: 5, radio1: 6, radio2: 7, radio3: 8, radio4: 9, radio5: 10, hf: 11 };
export const classShort = (i) => (CLASSES[i] || []).map(id => `第 ${CHAPTER_N[id]} 章 ${CHAPTER_SHORT[id]}`).join('・');
// each class day's own event, in the evening, with someone (it uses the day's class; content/dialog/ch1-events.js);
// Sunday's (the 4th day), at the lounge, is the week's review (it can be left)
export const CH1_EVENTS = [
  { id: 'forces', cls: 0, who: 'mechanic', where: 'outside', title: '駐機場の大城さんと、実機で 4 つの力を見る' },
  { id: 'pitot', cls: 1, who: 'mechanic', where: 'outside', title: '駐機場の大城さんと、Archer のピトー管と燃料のサンプを見る' },
  { id: 'spell', cls: 2, who: 'dispatcher', where: 'dispatch', title: '運航管理の佐伯さんと、登録記号と周波数を声に出す' },
  { id: 'readback', cls: 3, who: 'kiryu', where: 'lounge', title: 'ラウンジで、桐生の管制官役に復唱する' },
  { id: 'metar', cls: 4, who: 'dispatcher', where: 'dispatch', title: '運航管理の佐伯さんと、今朝の METAR を読んで、今日の判断を聞く' },
  { id: 'imsafe', cls: 5, who: 'chief', where: 'instructors', title: '教官室の真壁 主任教官と、IMSAFE を確かめる' },
  { id: 'week', cls: -1, who: 'asahi', where: 'lounge', title: 'ラウンジの朝日と、今週の復習（しなくてもよい）', optional: true },
];
// the written tests: FLIGHT LAB's question banks (quiz.js), so many questions drawn, the pass mark
export const EXAMS = {
  written1: { title: '学科試験（第 1 章）', banks: ['q_aero', 'q_sys', 'q_perf', 'q_wx', 'q_law', 'q_comm', 'q_hf'], n: 30, pass: 80, room: 'planning' },
  presolo: { title: 'ソロ前の筆記試験', banks: ['q_ops', 'q_emg', 'q_law'], n: 30, pass: 80, room: 'planning' },
  nav: { title: '航法の筆記試験', banks: ['q_nav', 'q_wx'], n: 30, pass: 80, room: 'planning', ok: '合格です。航法ログを作って、ひとりで遠くまで飛ぶ準備ができました。' },
  instr: { title: '計器飛行の筆記試験', banks: ['q_ifr', 'q_hf'], n: 30, pass: 80, room: 'planning', ok: '合格です。計器の審査に進めます。' },
  multi: { title: '双発の筆記試験', banks: ['q_me', 'q_emg'], n: 30, pass: 80, room: 'planning', ok: '合格です。双発の審査に進めます。' },
  final: { title: '最終の筆記試験', banks: ['q_crm', 'q_law', 'q_ops', 'q_radio'], n: 30, pass: 80, room: 'planning', ok: '合格です。残るは、最終審査の Check Flight だけです。' },
};
// the trust the first solo needs (the cadet's instructor's)
export const SOLO_TRUST = 60;
// a lesson counts for the syllabus when passed at this level or a stricter one
const COUNTS = ['basic', 'precision'];

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const pad2 = (n) => String(n).padStart(2, '0');
// ---- the calendar
export function dateOf(day) {
  const [y, m, d] = START_DATE.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d + day - 1));
  return { iso: `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`, y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() };
}
const WD = ['日', '月', '火', '水', '木', '金', '土'];
export const dateText = (day) => { const t = dateOf(day); return `${t.y} 年 ${t.m} 月 ${t.d} 日（${WD[t.wd]}）`; };
export const isOff = (day) => day > 1 && dateOf(day).wd === 0;

// ---- the weather: one kind a day, from the seed. What it means for flying (a student before the first solo flies
// only in good weather: no thunderstorms, visibility 5 SM or more, ceiling 3,000 ft or more, crosswind 10 kt or less)
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const WEATHER = {
  good: { ja: '晴れ', fly: { am: true, pm: true }, decision: 'go', why: '視程・雲・風とも基準内です。' },
  amFog: { ja: '朝霧（昼前に晴れる）', fly: { am: false, pm: true }, decision: 'wait', why: '朝は霧で視程 1/2 SM。予報（TAF）では 11 時ごろから視程が回復します。午後に回すのが正解です。' },
  pmStorm: { ja: '午後に雷雨', fly: { am: true, pm: false }, decision: 'early', why: 'TAF に午後の雷雨（TEMPO TSRA）。午前のうちに飛んで、13 時までに戻ります。' },
  crosswind: { ja: '強い横風', fly: { am: false, pm: false }, decision: 'cancel', why: '横風が 16 kt、突風 24 kt。ソロ前の訓練生の基準（横風 10 kt 以下）を超えています。今日は飛びません。' },
  storm: { ja: '雷雨', fly: { am: false, pm: false }, decision: 'cancel', why: '一日中、雷雨の予報です。飛びません。' },
  // (M6) a low ceiling in the morning that lifts by noon; a strong crosswind forecast for the afternoon
  amLowCloud: { ja: '朝の低い雲（昼前に上がる）', fly: { am: false, pm: true }, decision: 'wait', why: '朝は雲の底が 600 ft。予報（TAF）では 11 時ごろに 3,500 ft まで上がります。午後に回すのが正解です。' },
  pmWind: { ja: '午後に強い横風', fly: { am: true, pm: false }, decision: 'early', why: 'TAF では 15 時から横風が 18 kt、突風 26 kt に強まります。午前のうちに飛んで、早めに戻ります。' },
  // (M6) low cloud all day: no flying by sight; the instrument chapter flies in it with the instructor (the IFR flight
  // plan, the cloud from 800 ft to 4,000 ft)
  lowCloud: { ja: '低い雲（計器気象状態）', fly: { am: false, pm: false }, decision: 'cancel', why: '雲の底が 800 ft、視程 3 SM。有視界では飛べない天気です。',
    ifr: { fly: { am: true, pm: true }, decision: 'go', why: '雲の底は 800 ft ですが、計器飛行方式の飛行計画で、教官と一緒なら飛べます。雲の中の ILS は、今日しか練習できない本物です。' } },
};
// what the weather means for today's flying: the chapter and the flight change it (the instrument chapter flies in low
// cloud with an instructor or the check pilot; alone, never)
export function weatherFor2(W, chapter, kind) {
  if (W.ifr && chapter === 'ch4' && kind !== 'xc') return { ...W, fly: { ...W.ifr.fly }, decision: W.ifr.decision, why: W.ifr.why };
  return W;
}
// weatherFor(seed, day, { force }) → { kind, ja, fly, decision, why, metar: { am, pm }, taf, tempC, dewC, qnh }
// (the wind on a day that can be flown is the lessons' own wind: FLIGHT LAB's lessons fly in 010° 5 kt, so the METAR,
// the ATIS and the windsock agree with what the cadet flies in)
export function weatherFor(seed, day, o = {}) {
  const { force } = o;
  const r = rng((seed * 7919 + day * 104729) >>> 0), r2 = rng((seed * 131 + day * 7) >>> 0);
  const x = r();
  let kind = x < 0.54 ? 'good' : x < 0.6 ? 'amLowCloud' : x < 0.71 ? 'amFog' : x < 0.82 ? 'pmStorm' : x < 0.87 ? 'pmWind' : x < 0.95 ? 'crosswind' : 'storm';
  // (M6: the instrument chapter's days bring low cloud too, about one in five)
  if (o.ifr && kind === 'good' && r2() < 0.22) kind = 'lowCloud';
  if (force) kind = force;
  const W = WEATHER[kind];
  const tempC = 17 + Math.floor(r() * 9), dewC = tempC - 4 - Math.floor(r() * 6), qnh = 29.92;
  // (a METAR's temperature / dew point: the dew point never above the temperature)
  const td = (t, d) => `${pad2(t)}/${pad2(Math.min(d, t))}`;
  const z = (h) => `${pad2(h)}53Z`, q = `A${String(Math.round(qnh * 100))}`;
  const wind = kind === 'crosswind' ? '09016G24KT' : kind === 'lowCloud' ? '03006KT' : '36005KT';
  const m = {
    good: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} ${wind} 10SM FEW035 ${td(tempC - 3, dewC)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} ${wind} 10SM SCT045 ${td(tempC, dewC)} ${q}` },
    amFog: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} 00000KT 1/2SM FG VV002 ${td(tempC - 5, tempC - 5)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} ${wind} 10SM FEW030 ${td(tempC, dewC)} ${q}` },
    pmStorm: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} ${wind} 10SM FEW040 ${td(tempC - 2, dewC + 3)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} 22018G30KT 3SM +TSRA BKN025CB ${td(tempC - 4, dewC + 2)} ${q}` },
    crosswind: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} ${wind} 10SM SCT035 ${td(tempC, dewC)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} ${wind} 10SM SCT040 ${td(tempC + 1, dewC)} ${q}` },
    lowCloud: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} ${wind} 3SM BR BKN008 OVC015 ${td(tempC - 4, tempC - 5)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} ${wind} 4SM BR OVC009 ${td(tempC - 3, tempC - 4)} ${q}` },
    amLowCloud: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} 00000KT 5SM BR OVC006 ${td(tempC - 4, tempC - 5)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} ${wind} 10SM SCT035 ${td(tempC, dewC)} ${q}` },
    pmWind: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} ${wind} 10SM FEW040 ${td(tempC - 2, dewC)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} 09018G26KT 10SM SCT040 ${td(tempC + 1, dewC)} ${q}` },
    storm: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} 18012G22KT 2SM TSRA BKN015CB ${td(tempC - 4, tempC - 5)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} 20015G28KT 1 1/2SM +TSRA OVC012CB ${td(tempC - 5, tempC - 6)} ${q}` },
  }[kind];
  const taf = {
    good: 'TAF KLAB … 01005KT P6SM FEW035 FM1800 03008KT P6SM SCT045',
    amFog: 'TAF KLAB … 00000KT 1/2SM FG VV002 TEMPO 1215 1SM BR FM1500 01005KT P6SM FEW030',
    pmStorm: 'TAF KLAB … 01005KT P6SM FEW040 FM1700 22015G25KT 3SM TSRA BKN030CB',
    crosswind: 'TAF KLAB … 09015G24KT P6SM SCT035 FM2000 09012G20KT P6SM SCT040',
    storm: 'TAF KLAB … 18012G22KT 2SM TSRA BKN015CB TEMPO 1622 1SM +TSRA OVC010CB',
    lowCloud: 'TAF KLAB … 03006KT 3SM BR BKN008 OVC015 FM2000 03008KT 5SM BR OVC012',
    amLowCloud: 'TAF KLAB … 00000KT 5SM BR OVC006 FM1500 01005KT P6SM SCT035',
    pmWind: 'TAF KLAB … 01005KT P6SM FEW040 FM1900 09018G26KT P6SM SCT040',
  }[kind];
  return { kind, ja: W.ja, fly: { ...W.fly }, decision: W.decision, why: W.why, metar: m, taf, tempC, dewC, qnh, ...(W.ifr ? { ifr: W.ifr } : {}) };
}

// ---- the day's wind, at the surface and aloft: ONE field for the day (the nav log planned in the morning is
// flown in the afternoon). The METARs give the surface wind, magnetic, as the tower says it; the winds aloft at
// the nav cruise altitude come by the friction layer's rule of thumb every student is taught: by 3,000 ft the
// wind has veered 30° and doubled (the northern hemisphere). Between the ground and 3,000 ft the flight model
// blends the two linearly (the physics' windAt: the wind's topFrom / topKt / topFt). Scored lessons keep their
// own wind (their scores stay comparable); this field is for the cross-country, the solo and free flying, and
// for the log that plans them.
export const NAV_ALT_FT = 3000;
// the surface wind in a METAR (magnetic): { from (1–360), kt } — calm when the METAR says so or has none
export function surfaceWindOf(metar) {
  const m = /(\d{3})(\d{2,3})(?:G\d{2,3})?KT/.exec(String(metar || ''));
  if (!m) return { from: 360, kt: 0 };
  return { from: +m[1] || 360, kt: +m[2] };
}
// windsAloftFor(W) → the day's field (all magnetic): the surface wind (the afternoon METAR's — the flight of
// the day is the afternoon's) and the wind at NAV_ALT_FT above it
export function windsAloftFor(W) {
  const surf = surfaceWindOf(W && W.metar && W.metar.pm);
  return { surfFrom: surf.from, surfKt: surf.kt, from: (surf.from + 30) % 360 || 360, kt: surf.kt >= 1 ? surf.kt * 2 : 10, altFt: NAV_ALT_FT };
}

// ---- the state
export function newCareer(seed = 1) {
  return { v: CAREER_VERSION, seed: seed >>> 0 || 1, day: 1, slot: 'morning', chapter: 'prologue', fatigue: 20, exams: {}, ground: {}, decisions: [], done: {}, solo: null, checks: {}, graduated: null, started: true,
    // (the growth system, v2) the four abilities, how many first tries at a lesson or a check passed, and how often
    // each kind of work has already grown an ability (the growth of a repeated key counts for less)
    abilities: { ...ABILITY_START }, firstTry: { pass: 0, total: 0 }, growth: {},
    // (growth design v1 §4.3) the day each written test was last taken: a test is not taken twice in a day
    examDay: {},
    // the day's wind field (windsAloftFor), kept for the day it was worked out for: { day, surfFrom, surfKt,
    // from, kt, altFt } (the nav log and the cross-country read the same numbers)
    aloft: null,
    // (growth design v1 §4.4) the judgement drills done today (at most two grow the judgement)
    drills: { day: 0, n: 0 },
    // (the debrief's main missed item, asked about at the next morning's briefing; null: nothing kept)
    miss: null,
    // (chapter 1's classes) the sections heard and how ('f' read in full, 'q' its key points: content/school.js), the
    // pace chosen last, how many times each class, lesson and test was begun (mixed into its questions' order), and each
    // question's answers so far: [right, wrong, the last right (1) or not (0), its day]
    heard: {}, lastPace: null, attempts: {}, answers: {}, walked: [] };
}
export const PACE_IDS = ['need', 'full', 'quick'];
const SEC_ID = /^[a-z0-9]{1,12}\.[a-z0-9]{1,16}$/, Q_ID = /^[a-z0-9_]{1,12}[#:][a-z0-9_.]{1,24}$/, ATTEMPT_ID = /^[a-z0-9]{1,12}:[a-z0-9_]{1,16}$/;
// a saved state that can be used: this version, the parts of the right kind (a cleaned copy), else null.
// (a v1 save is read as a migration: everything it kept is kept, the growth system's record starts fresh)
export function cleanCareer(o) {
  if (!isObj(o) || (o.v !== CAREER_VERSION && o.v !== 1)) return null;
  const s = newCareer(o.seed);
  if (isObj(o.abilities)) for (const a of ABILITIES) if (Number.isFinite(o.abilities[a])) s.abilities[a] = clamp(o.abilities[a], 0, 100);
  if (isObj(o.firstTry)) { if (Number.isInteger(o.firstTry.pass) && o.firstTry.pass >= 0) s.firstTry.pass = Math.min(o.firstTry.pass, 9999); if (Number.isInteger(o.firstTry.total) && o.firstTry.total >= 0) s.firstTry.total = Math.min(o.firstTry.total, 9999); if (s.firstTry.pass > s.firstTry.total) s.firstTry.pass = s.firstTry.total; }
  if (isObj(o.growth)) for (const [k, v] of Object.entries(o.growth).slice(0, 200)) if (ATTEMPT_ID.test(k) && Number.isInteger(v) && v >= 0) s.growth[k] = Math.min(v, 999);
  if (isObj(o.examDay)) for (const [k, v] of Object.entries(o.examDay)) if (EXAMS[k] && Number.isInteger(v) && v >= 1 && v < 10000) s.examDay[k] = v;
  if (isObj(o.drills) && Number.isInteger(o.drills.day) && Number.isInteger(o.drills.n)) s.drills = { day: clamp(o.drills.day, 0, 9999), n: clamp(o.drills.n, 0, 99) };
  if (isObj(o.aloft) && Number.isInteger(o.aloft.day) && o.aloft.day >= 1 && o.aloft.day < 10000
    && [o.aloft.surfFrom, o.aloft.surfKt, o.aloft.from, o.aloft.kt].every(Number.isFinite))
    s.aloft = { day: o.aloft.day, surfFrom: clamp(o.aloft.surfFrom, 0, 360), surfKt: clamp(o.aloft.surfKt, 0, 99), from: clamp(o.aloft.from, 0, 360), kt: clamp(o.aloft.kt, 0, 99), altFt: NAV_ALT_FT };
  // (a save from before the miss was kept has none: null, nothing asked)
  if (isObj(o.miss) && typeof o.miss.key === 'string' && MISS_KEY.test(o.miss.key) && typeof o.miss.label === 'string' && o.miss.label.length >= 1 && o.miss.label.length <= 80 && Number.isInteger(o.miss.day) && o.miss.day >= 1 && o.miss.day < 10000) s.miss = { day: o.miss.day, key: o.miss.key, label: o.miss.label };
  if (Number.isInteger(o.day) && o.day >= 1 && o.day < 10000) s.day = o.day;
  if (SLOTS.includes(o.slot)) s.slot = o.slot;
  if (CHAPTERS[o.chapter]) s.chapter = o.chapter;
  if (Number.isFinite(o.fatigue)) s.fatigue = clamp(Math.round(o.fatigue), 0, 100);
  for (const k of ['exams', 'ground']) if (isObj(o[k])) for (const [id, v] of Object.entries(o[k])) {
    if (/^[a-z0-9_]{1,16}$/.test(id) && isObj(v)) s[k][id] = { tries: clamp(Math.round(+v.tries || 0), 0, 9999), best: clamp(Math.round(+v.best || 0), 0, 100), pass: !!v.pass };
  }
  if (Array.isArray(o.decisions)) s.decisions = o.decisions.filter(d => isObj(d) && Number.isInteger(d.day) && typeof d.choice === 'string' && typeof d.right === 'boolean').slice(-200).map(d => ({ day: d.day, choice: d.choice.slice(0, 12), right: d.right }));
  if (isObj(o.done)) for (const [k, v] of Object.entries(o.done)) if (/^[a-z0-9_:]{1,24}$/.test(k) && Number.isInteger(v)) s.done[k] = v;
  if (isObj(o.solo) && Number.isInteger(o.solo.day)) s.solo = { day: o.solo.day };
  if (isObj(o.checks)) for (const [id, v] of Object.entries(o.checks)) if (CHECKS[id] && isObj(v)) s.checks[id] = { tries: clamp(Math.round(+v.tries || 0), 0, 999), pass: !!v.pass, day: Number.isInteger(v.day) ? v.day : 0 };
  if (isObj(o.graduated) && Number.isInteger(o.graduated.day)) { s.graduated = { day: o.graduated.day }; if (['優等', '優秀', '通常'].includes(o.graduated.rank)) { s.graduated.rank = o.graduated.rank; for (const k of ['total', 'firstRate', 'examTries', 'avgScore']) if (Number.isFinite(o.graduated[k])) s.graduated[k] = clamp(o.graduated[k], 0, 9999); } }
  // (saves from before these were kept have none: an empty record, the classes already finished taken as heard in full
  // — the pace they were heard at was not kept)
  if (isObj(o.heard)) { for (const [k, v] of Object.entries(o.heard)) if (SEC_ID.test(k) && (v === 'f' || v === 'q')) s.heard[k] = v; }
  // (…and their classes in the order before: a class now done when each of its chapters was; a class left midway begun
  // again — its place was a section of the class before's)
  else {
    const before = Object.keys(s.done).filter(k => /^(class|lecture):\d+$/.test(k)), chapters = new Map();
    CLASSES_BEFORE.forEach((ids, i) => { const d = s.done[`class:${i}`]; if (d != null) for (const id of ids) chapters.set(id, d); });
    for (const k of before) delete s.done[k];
    CLASSES.forEach((ids, i) => { if (ids.every(id => chapters.has(id))) s.done[`class:${i}`] = Math.max(...ids.map(id => chapters.get(id))); });
    // (a class of today's no longer a class done — its chapters part of one still to come: today begun again from its
    // morning, so the class comes before its afternoon)
    const today = (d) => d === s.day;
    if (s.chapter === 'ch1' && [...chapters.values()].some(today) && !CLASSES.some((_, i) => today(s.done[`class:${i}`]))) s.slot = 'morning';
  }
  if (PACE_IDS.includes(o.lastPace)) s.lastPace = o.lastPace;
  if (isObj(o.attempts)) for (const [k, v] of Object.entries(o.attempts)) if (ATTEMPT_ID.test(k) && Number.isInteger(v) && v >= 0) s.attempts[k] = Math.min(v, 9999);
  if (isObj(o.answers)) for (const [k, v] of Object.entries(o.answers).slice(0, 400)) {
    if (Q_ID.test(k) && Array.isArray(v) && v.length === 4 && v.every(Number.isInteger)) s.answers[k] = [clamp(v[0], 0, 9999), clamp(v[1], 0, 9999), v[2] ? 1 : 0, clamp(v[3], 0, 9999)];
  }
  // (the rooms walked into: the second time on, the way there may be skipped — main.js's G)
  if (Array.isArray(o.walked)) s.walked = [...new Set(o.walked.filter(x => typeof x === 'string' && /^[a-z0-9-]{1,16}$/.test(x)))].slice(0, 40);
  return s;
}

// ---- what counts
const lessonRec = (prog, id) => (prog && prog.lessons && prog.lessons[id]) || null;
export const passedAt = (prog, id, levels = COUNTS) => { const r = lessonRec(prog, id); return !!(r && r.pass && (r.levels || []).some(l => levels.includes(l))); };
export const groundPassed = (prog, id) => { const r = lessonRec(prog, id); return !!(r && r.pass); };
// one try at a training device lesson, in FLIGHT LAB's progress record (its shape, as its own ground pages
// write it): every try counts — a fail too, or the tries would count only the passes and every first try at
// the device would read as a success. A pass grades by the percent (100 S, 90 A, else B) and keeps the best.
// → { rec, first }: first says the try was the lesson's first ever (the caller counts it for the first-try rate)
export function noteGround(rec, pass, pct = 100) {
  const r = rec || { tries: 0, best: '', pass: false, levels: [] };
  const first = r.tries === 0;
  r.tries++;
  if (pass) { r.pass = true; const g = pct >= 100 ? 'S' : pct >= 90 ? 'A' : 'B'; if (!r.best || 'SAB'.indexOf(g) < 'SAB'.indexOf(r.best)) r.best = g; }
  return { rec: r, first };
}
// the next lesson of chapter 2 to fly (null: all 15 are passed)
export const nextLesson = (prog) => CH2.find(id => !passedAt(prog, id)) || null;
// the gates: what is still missing (an empty list: the gate is open)
export function gate(state, prog, trust = 50) {
  if (state.chapter === 'prologue') return state.done.prologue ? [] : ['入社の 1 日'];
  if (state.chapter === 'ch1') {
    const miss = GROUND.filter(id => !groundPassed(prog, id)).map(id => `訓練装置 ${id}`);
    if (!(state.exams.written1 && state.exams.written1.pass)) miss.push(EXAMS.written1.title);
    return miss;
  }
  if (STAGE[state.chapter]) {
    const S = STAGE[state.chapter], miss = S.lessons.filter(id => !passedAt(prog, id)).map(id => `課目 ${id}`);
    if (!(state.exams[S.exam] && state.exams[S.exam].pass)) miss.push(EXAMS[S.exam].title);
    if (!(state.checks[S.check] && state.checks[S.check].pass)) miss.push(CHECKS[S.check].title);
    return miss;
  }
  if (state.solo) return [];                                  // (chapter 2 is over with the first solo)
  const miss = CH2.filter(id => !passedAt(prog, id)).map(id => `課目 ${id}`);
  if (!(state.exams.presolo && state.exams.presolo.pass)) miss.push(EXAMS.presolo.title);
  if (!passedAt(prog, 'c1')) miss.push('ソロ前の審査（c1）');
  if (trust < SOLO_TRUST) miss.push(`担当教官の信頼（${SOLO_TRUST} 以上）`);
  if (judgeOf(state) < SOLO_JUDGE) miss.push(`判断（${SOLO_JUDGE} 以上）`);
  return miss;
}

// ---- the prologue's talks are told apart by the conversations' flags (who has welcomed, shown round, met the cadet);
// the career's record is what counts. A flag kept from another save (an older game's: the M2–M4 briefing set
// met_instructor on the first talk) would skip a talk that moves the day on — the instructor's meeting, that ends the
// prologue — so the game sets these from the career: flag → the work it stands for
export const PROLOGUE_FLAGS = { welcome_done: 'ceremony:welcome', tour_done: 'tour:tour', met_instructor: 'brief:meet' };
// → { flag: true / false } as the career says (all true once the prologue is over)
export function prologueFlags(state) {
  const past = state.chapter !== 'prologue' || state.done.prologue != null;
  return Object.fromEntries(Object.entries(PROLOGUE_FLAGS).map(([f, k]) => [f, past || state.done[k] != null]));
}

// ---- what is due today: [{ slot, kind, id, title, where, who }]
//  kind: 'ceremony' | 'tour' | 'class' | 'ftd' | 'exam' | 'flight' | 'checkride' | 'solo' | 'study' | 'off'
// where: the room (academy-spec's ids; 'apron' for the aircraft); who: the person it is with
export function schedule(state, prog, { trust = 50, weather = null } = {}) {
  const day = state.day, out = [];
  const W = weather || weatherFor(state.seed, day, forcedWeather(state, prog));
  if (isOff(day)) {
    const off = [{ slot: 'am', kind: 'off', title: '休日', where: null, who: null }], w = CH1_EVENTS.find(e => e.id === 'week');
    // (chapter 1's Sunday: the week's review with 朝日, if the cadet likes)
    return state.chapter === 'ch1' && Object.keys(state.done).some(k => /^class:/.test(k)) && (!state.done['event:week'] || state.done['event:week'] === day) ? [...off, { slot: 'am', kind: 'event', id: w.id, title: w.title, where: w.where, who: w.who, optional: true }] : off;
  }
  if (state.chapter === 'prologue') {
    out.push({ slot: 'morning', kind: 'ceremony', id: 'welcome', title: '入社の式（ロビー）', where: 'lobby', who: 'chief' });
    out.push({ slot: 'am', kind: 'tour', id: 'tour', title: '訓練所の案内', where: 'dispatch', who: 'dispatcher' });
    out.push({ slot: 'pm', kind: 'brief', id: 'meet', title: '担当教官との顔合わせ（ブリーフィング室 1）', where: 'brief-1', who: 'instructor' });
    return out;
  }
  if (state.chapter === 'ch1') {
    // (what was done today stays today's: the plan does not move on to tomorrow's work)
    const today = (key) => state.done[key] === day;
    const cls = CLASSES.findIndex((_, i) => !state.done[`class:${i}`] || today(`class:${i}`));
    // (a device lesson waits for the class that teaches it — today's, or one before: a save from the classes' order before
    // can have a lesson whose class is still to come)
    const k0 = GROUND.find(id => !groundPassed(prog, id) || today(`ftd:${id}`)), ci = k0 ? CLASS_FTD.indexOf(k0) : -1;
    const k = k0 && (ci < 0 || state.done[`class:${ci}`] != null || ci === cls) ? k0 : null;
    if (cls >= 0) out.push({ slot: 'am', kind: 'class', id: String(cls), title: `座学 ${cls + 1} / ${CLASSES.length}（${classShort(cls)}）`, where: 'brief-2', who: 'lecturer' });
    if (k) out.push({ slot: cls >= 0 ? 'pm' : 'am', kind: 'ftd', id: k, title: `訓練装置 ${k}・${FTD_TITLES[k]}`, where: 'sim', who: 'lecturer' });
    // (the evening's event of the day's class: the class taken today, or still to come this morning — not a class missed)
    const ev = cls >= 0 && (today(`class:${cls}`) || SLOTS.indexOf(state.slot) <= SLOTS.indexOf('am')) && CH1_EVENTS.find(e => e.cls === cls);
    if (ev && (!state.done[`event:${ev.id}`] || today(`event:${ev.id}`))) out.push({ slot: 'evening', kind: 'event', id: ev.id, title: ev.title, where: ev.where, who: ev.who });
    const ex = state.exams.written1;
    // (taken and failed today, the test is not offered again until tomorrow; passed today, it stays as the day's record)
    if (cls < 0 && !k && ((!(ex && ex.pass) && (state.examDay || {}).written1 !== state.day) || (ex && ex.pass && today('exam:written1')))) out.push({ slot: out.length ? 'pm' : 'am', kind: 'exam', id: 'written1', title: EXAMS.written1.title, where: 'planning', who: 'lecturer' });
    return out;
  }
  if (STAGE[state.chapter]) return laterSchedule(state, prog, W, out).sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
  // chapter 2: one flight a day (in the morning, or the afternoon when the morning cannot be flown); the tests. A flight
  // already flown today stays today's
  const flown = Object.entries(state.done).find(([k, v]) => v === day && /^(flight|checkride|solo):/.test(k));
  const id = flown && flown[0].startsWith('flight:') ? flown[0].slice(7) : nextLesson(prog), ex = state.exams.presolo;
  const flySlot = W.fly.am ? 'am' : W.fly.pm ? 'pm' : null;
  const ground = (slot) => { if (!(ex && ex.pass) && (state.examDay || {}).presolo !== day && id && CH2.indexOf(id) >= 9) out.push({ slot, kind: 'exam', id: 'presolo', title: EXAMS.presolo.title, where: 'planning', who: 'instructor' }); };
  if (state.solo && !(flown && flown[0] === 'solo:solo')) return [{ slot: 'am', kind: 'study', id: 'after', title: '自習（次の段階の予習）', where: 'planning', who: null }];
  if (flown && flown[0] === 'checkride:c1') return [{ slot: W.fly.am ? 'am' : 'pm', kind: 'checkride', id: 'c1', title: 'ソロ前の審査（c1・主任教官）', where: 'apron', who: 'chief' }];
  if (flown && flown[0] === 'solo:solo') return [{ slot: W.fly.am ? 'am' : 'pm', kind: 'solo', id: 'solo', title: 'ファーストソロ', where: 'apron', who: 'instructor' }];
  if (!flySlot) { out.push({ slot: 'am', kind: 'study', id: 'weather', title: '天気で飛べない日：地上で復習', where: 'brief-1', who: 'instructor' }); ground('pm'); return out; }
  if (id) out.push({ slot: flySlot, kind: 'flight', id, title: `飛行：${id}`, where: 'apron', who: 'instructor' });
  // (a test taken today is not offered again today (§4.3, as written1): passed, it stays as the day's record;
  // failed, the day is a finishing flight instead and the test comes back tomorrow)
  else if ((!(ex && ex.pass) && (state.examDay || {}).presolo !== day) || (ex && ex.pass && state.done['exam:presolo'] === day)) out.push({ slot: flySlot, kind: 'exam', id: 'presolo', title: EXAMS.presolo.title, where: 'planning', who: 'instructor' });
  else if (!(ex && ex.pass)) out.push({ slot: flySlot, kind: 'flight', id: 't2', title: '飛行：場周経路の仕上げ（t2）', where: 'apron', who: 'instructor' });
  else if (!passedAt(prog, 'c1')) out.push({ slot: flySlot, kind: 'checkride', id: 'c1', title: 'ソロ前の審査（c1・主任教官）', where: 'apron', who: 'chief' });
  else if (trust >= SOLO_TRUST && judgeOf(state) >= SOLO_JUDGE) out.push({ slot: flySlot, kind: 'solo', id: 'solo', title: 'ファーストソロ', where: 'apron', who: 'instructor' });
  else out.push({ slot: flySlot, kind: 'flight', id: 't2', title: '飛行：場周経路の仕上げ（t2）', where: 'apron', who: 'instructor' });
  if (id) ground(flySlot === 'am' ? 'pm' : 'am');
  return out;
}
// chapters 3–6 (M6): a flight a day through the chapter's lessons (the written test on another slot once half are
// passed); then the test, then the check (the solo cross-country: the navigation log in the morning, the flight in the
// afternoon); the check passed, the next chapter comes with the night. Chapter 6's check passed: the graduation, the
// next morning in the lobby; after it, days off.
export const nextIn = (prog, list) => list.find(id => !passedAt(prog, id)) || null;
function laterSchedule(state, prog, W, out) {
  const day = state.day, S = STAGE[state.chapter], C = CHECKS[S.check], ex = state.exams[S.exam];
  const today = (key) => state.done[key] === day;
  if (state.graduated) return [{ slot: 'am', kind: 'off', id: 'grad', title: '修了（訓練はすべて終わりました）', where: null, who: null }];
  const checkPassed = !!(state.checks[S.check] && state.checks[S.check].pass);
  if (state.chapter === 'ch6' && checkPassed) return [{ slot: 'morning', kind: 'graduation', id: 'grad', title: '修了式（ロビー）', where: 'lobby', who: 'chief' }];
  const flown = Object.entries(state.done).find(([k, v]) => v === day && /^(flight|checkride|xc):/.test(k));
  const W2 = weatherFor2(W, state.chapter, flown && flown[0].startsWith('xc:') ? 'xc' : 'flight');
  const flySlot = W2.fly.am ? 'am' : W2.fly.pm ? 'pm' : null;
  let id = flown && flown[0].startsWith('flight:') ? flown[0].slice(7) : nextIn(prog, S.lessons);
  if (flown && !flown[0].startsWith('flight:')) id = null;
  const written = (slot) => { if (!(ex && ex.pass) && (state.examDay || {})[S.exam] !== day && id && S.lessons.indexOf(id) >= Math.floor(S.lessons.length / 2)) out.push({ slot, kind: 'exam', id: S.exam, title: EXAMS[S.exam].title, where: 'planning', who: 'instructor' }); };
  if (flown && flown[0] === `${C.kind}:${S.check}`) return checkItems(state, C, S.check, W, out, true);
  if (!flySlot) {
    out.push({ slot: 'am', kind: 'study', id: 'weather', title: '天気で飛べない日：地上で復習', where: 'brief-1', who: 'instructor' });
    if (!(ex && ex.pass) && (state.examDay || {})[S.exam] !== day && (!id || S.lessons.indexOf(id) >= Math.floor(S.lessons.length / 2))) out.push({ slot: 'pm', kind: 'exam', id: S.exam, title: EXAMS[S.exam].title, where: 'planning', who: 'instructor' });
    return out;
  }
  if (id) { out.push({ slot: flySlot, kind: 'flight', id, title: `飛行：${id}`, where: 'apron', who: 'instructor' }); written(flySlot === 'am' ? 'pm' : 'am'); return out; }
  // (a test taken today is not offered again today (§4.3, as written1): passed, it stays as the day's record;
  // failed, nothing more is due today and the test comes back tomorrow)
  if ((!(ex && ex.pass) && (state.examDay || {})[S.exam] !== day) || (ex && ex.pass && today(`exam:${S.exam}`))) { out.push({ slot: flySlot, kind: 'exam', id: S.exam, title: EXAMS[S.exam].title, where: 'planning', who: 'instructor' }); return out; }
  if (!(ex && ex.pass)) return out;
  return checkItems(state, C, S.check, W2, out, false);
}
function checkItems(state, C, id, W, out, flown) {
  if (C.kind === 'xc') {
    // the navigation log first (the planning room, in the morning), the flight after it
    out.push({ slot: 'am', kind: 'navlog', id: 'xc', title: '航法ログを作る（ブリーフィング室 1）', where: 'brief-1', who: 'instructor' });
    out.push({ slot: 'pm', kind: 'xc', id, title: C.title, where: 'apron', who: null });
    return out;
  }
  out.push({ slot: W.fly.am || flown ? 'am' : 'pm', kind: 'checkride', id, title: C.title, where: 'apron', who: C.who });
  return out;
}

// the first day of flying and the first solo are not spoiled by the weather (the instructor picks a good day)
function forcedWeather(state, prog) {
  if (state.chapter === 'prologue') return { force: 'good' };              // (the first day: a fine morning to arrive in)
  // (M6) a chapter's first flight and the solo cross-country on a good day; the instrument check in low cloud (its ILS
  // in cloud is the chapter's high point); the instrument chapter's other days can be cloudy
  if (STAGE[state.chapter]) {
    const S = STAGE[state.chapter];
    if (!prog || !prog.lessons || !passedAt(prog, S.lessons[0])) return { force: 'good' };
    const lessonsDone = !nextIn(prog, S.lessons), exOk = !!(state.exams[S.exam] && state.exams[S.exam].pass);
    if (lessonsDone && exOk && S.check === 'xc') return { force: 'good' };
    if (lessonsDone && exOk && S.check === 'ir') return { force: 'lowCloud' };
    if (lessonsDone && exOk) return { force: 'good' };
    return state.chapter === 'ch4' ? { ifr: true } : {};
  }
  if (state.chapter === 'ch2' && (!prog || !prog.lessons || !passedAt(prog, 'a1'))) return { force: 'good' };
  if (state.chapter === 'ch2' && passedAt(prog, 'c1') && !state.solo) return { force: 'good' };
  return {};
}

// the sections heard (a Set of ids): the record, and the sections of every class finished (a save from before the
// record was kept)
export function heardSet(st, chapters = CLASS_SECTIONS) {
  const out = new Set(Object.keys(st.heard || {}));
  CLASSES.forEach((_, i) => { if (st.done && st.done[`class:${i}`] != null) for (const id of (chapters[i] || [])) out.add(id); });
  return out;
}
// the sections of each class (filled by content/school.js from the book: the career itself has no book)
export const CLASS_SECTIONS = CLASSES.map(() => []);

// createCareer({ store, seed }) → the career with its save; the game asks it and tells it what happened
export function createCareer({ store = null, seed } = {}) {
  let st = null;
  const read = () => { try { const raw = store && store.getItem(CAREER_KEY); return raw ? cleanCareer(JSON.parse(raw)) : null; } catch (e) { return null; } };
  const save = () => { try { if (store) store.setItem(CAREER_KEY, JSON.stringify(st)); return !!store; } catch (e) { return false; } };
  st = read() || newCareer(seed ?? Math.floor(Math.random() * 2 ** 31));
  // the growth of an ability: less the higher it already is, and less for the same work repeated
  // (a key's first time counts in full, its second half, from its third a quarter). Returns the new value.
  const applyGrow = (axis, base, key) => {
    if (!ABILITIES.includes(axis) || !(base > 0)) return st.abilities[axis];
    const rep = key && ATTEMPT_ID.test(key) ? (st.growth[key] || 0) : 0;
    const f = rep === 0 ? 1 : rep === 1 ? 0.5 : 0.25;
    st.abilities[axis] = clamp(st.abilities[axis] + base * (1 - st.abilities[axis] / 130) * f, 0, 100);
    if (key && ATTEMPT_ID.test(key)) st.growth[key] = rep + 1;
    return st.abilities[axis];
  };
  const C = {
    // the abilities as they stand, and the growth itself (the game calls it for the work the cadet did)
    get abilities() { return { ...st.abilities }; },
    grow(axis, base, key) { const v = applyGrow(axis, base, key); save(); return v; },
    // a lesson's or a check's first try, counted once per try at it (the game says whether it was a first try)
    firstTry(pass) { st.firstTry.total++; if (pass) st.firstTry.pass++; save(); return { ...st.firstTry }; },
    get state() { return st; },
    get day() { return st.day; }, get slot() { return st.slot; }, get chapter() { return st.chapter; },
    get hours() { return SLOT_HOURS[st.slot]; },
    date: () => dateText(st.day),
    weather: (prog) => weatherFor2(weatherFor(st.seed, st.day, forcedWeather(st, prog)), st.chapter, 'flight'),
    schedule: (prog, o = {}) => schedule(st, prog, { ...o, weather: o.weather || C.weather(prog) }),
    gate: (prog, trust) => gate(st, prog, trust),
    // the work of the day done (kind:id), the tests' scores, the ground lessons
    done(kind, id) { st.done[`${kind}:${id}`] = st.day; if (kind === 'ceremony' || kind === 'brief') { /* the prologue's parts */ } save(); },
    isDone: (kind, id) => st.done[`${kind}:${id}`] != null,
    doneToday: (kind, id) => st.done[`${kind}:${id}`] === st.day,
    // (passed, when the game says it: the test's own score with its bank floor (§4.3) — the record, and the
    // knowledge grown, are what the cadet was told at the result, not the raw percent alone)
    exam(id, pct, passed) {
      const E = EXAMS[id]; if (!E) return null;
      const ok = typeof passed === 'boolean' ? passed : pct >= E.pass;
      const r = st.exams[id] || { tries: 0, best: 0, pass: false };
      r.tries++; r.best = Math.max(r.best, Math.round(pct)); if (ok) r.pass = true;
      st.exams[id] = r; st.done[`exam:${id}`] = st.day; st.examDay[id] = st.day; st.fatigue = clamp(st.fatigue + 8, 0, 100);
      applyGrow('know', ok ? 4.0 : 1.2, `exam:${id}`); save(); return r;
    },
    // a written test may be begun today (not taken yet today: §4.3, the next try is tomorrow or later)
    examReady: (id) => !!EXAMS[id] && st.examDay[id] !== st.day,
    // (growth design v1 §4.4) a judgement drill finished: the judgement grows a little, twice a day at most
    drill() {
      if (st.drills.day !== st.day) st.drills = { day: st.day, n: 0 };
      if (st.drills.n >= 2) { save(); return false; }
      st.drills.n++; applyGrow('judge', 1.0, `drill:${st.day}:${st.drills.n}`); save(); return true;
    },
    drillsLeft: () => (st.drills.day === st.day ? Math.max(0, 2 - st.drills.n) : 2),
    // the debrief's main missed item, kept for the next morning's briefing (a later debrief replaces it);
    // asked about once, it is cleared (the game calls clearMiss when the question is answered)
    noteMiss(key, label) { if (typeof key === 'string' && MISS_KEY.test(key) && typeof label === 'string' && label.length >= 1 && label.length <= 80) { st.miss = { day: st.day, key, label }; save(); } },
    clearMiss() { if (st.miss) { st.miss = null; save(); } },
    decision(choice, weather) { const right = choice === weather.decision; st.decisions.push({ day: st.day, choice, right }); applyGrow('judge', right ? 1.8 : 0.5, `decision:${st.day}`); save(); return right; },
    decidedToday: () => st.decisions.find(d => d.day === st.day) || null,
    // the chapter moves on when its gate is open (the game calls it at the end of the work that opens it)
    advanceChapter(prog, trust) {
      if (gate(st, prog, trust).length) return false;
      if (st.chapter === 'prologue') st.chapter = 'ch1';
      else if (st.chapter === 'ch1') st.chapter = 'ch2';
      else if (st.chapter === 'ch2') { if (!st.solo) return false; st.chapter = 'ch3'; }   // (the gate opens the solo; the solo flown, chapter 3)
      else if (LATER.includes(st.chapter) && st.chapter !== 'ch6') st.chapter = LATER[LATER.indexOf(st.chapter) + 1];
      else return false;
      save(); return true;
    },
    finishPrologue() { st.done.prologue = st.day; save(); },
    // (chapter 1) a section heard: in full ('f') or its key points ('q'); in full stays in full
    heardSection(id, how) { if (!SEC_ID.test(String(id)) || (how !== 'f' && how !== 'q')) return; if (st.heard[id] !== 'f') st.heard[id] = how; save(); },
    // the sections heard: the record, and the classes finished before it was kept (heard in full: see cleanCareer)
    heardSet: () => heardSet(st),
    setPace(p) { if (PACE_IDS.includes(p)) { st.lastPace = p; save(); } },
    // a room walked into on foot (kept: the way there may be skipped the next time)
    walkedInto(room) { if (typeof room === 'string' && /^[a-z0-9-]{1,16}$/.test(room) && !st.walked.includes(room) && st.walked.length < 40) { st.walked.push(room); save(); } },
    // a class, a lesson, a test begun: how many times before (its questions come in another order each time)
    attempt(key) { if (!ATTEMPT_ID.test(key)) return 0; const n = st.attempts[key] || 0; st.attempts[key] = n + 1; save(); return n; },
    tries: (key) => st.attempts[key] || 0,
    // a question answered (id: content/answer-map.js's): right or not, today
    answered(id, right) {
      if (!Q_ID.test(String(id))) return;
      const r = st.answers[id] || [0, 0, 0, 0]; if (right) r[0]++; else r[1]++; r[2] = right ? 1 : 0; r[3] = st.day; st.answers[id] = r;
      const ks = Object.keys(st.answers); if (ks.length > 400) delete st.answers[ks[0]];
      save();
    },
    soloDone() { st.solo = { day: st.day }; save(); },
    // a check flown (M6): passed or not; the graduation
    check(id, pass) { const r = st.checks[id] || { tries: 0, pass: false, day: 0 }; r.tries++; if (pass) { r.pass = true; r.day = st.day; } st.checks[id] = r; st.done[`${CHECKS[id].kind}:${id}`] = st.day; save(); return r; },
    // (the graduation: its day, and its rank with the record it was judged by — §4.6)
    graduate(prog) { st.graduated = { day: st.day, ...graduationRank(st, prog) }; st.done['graduation:grad'] = st.day; save(); },
    // today's weather as it counts for today's flying (the instrument chapter flies in low cloud)
    flyingWeather: (prog, kind = 'flight') => weatherFor2(weatherFor(st.seed, st.day, forcedWeather(st, prog)), st.chapter, kind),
    // the day's wind field (surface + the winds aloft at the nav altitude), kept with the day it belongs to:
    // the morning's nav log is planned from these numbers and the afternoon's cross-country flies in them
    aloft(prog) {
      if (!st.aloft || st.aloft.day !== st.day) { st.aloft = { day: st.day, ...windsAloftFor(C.weather(prog)) }; save(); }
      return { ...st.aloft };
    },
    // the time moves on (the next slot; the evening stays the evening until the cadet goes to bed)
    advance(to) {
      const i = SLOTS.indexOf(st.slot), j = to ? SLOTS.indexOf(to) : i + 1;
      if (j > i && j < SLOTS.length) { st.slot = SLOTS[j]; save(); return true; }
      return false;
    },
    // work tires (a flight 15, a class or the device 6, a test 8); a night's sleep rests: early 50, late (studying)
    // 15, and the studying itself tires 10 back — a late night nets only 5, so a run of them under flying days
    // climbs to the IMSAFE line (65) instead of hovering below it
    tire(n) { st.fatigue = clamp(st.fatigue + n, 0, 100); save(); },
    sleep({ late = false } = {}) {
      st.fatigue = clamp(st.fatigue - (late ? 15 : 50) + (late ? 10 : 0), 0, 100);
      st.day++; st.slot = 'morning'; save();
      return { day: st.day, date: dateText(st.day), off: isOff(st.day) };
    },
    // IMSAFE: tired enough to say so (the honest answer)
    tired: () => st.fatigue >= 65,
    save, reset(seed2) { st = newCareer(seed2 ?? Math.floor(Math.random() * 2 ** 31)); save(); return st; },
    load(o) { const c = cleanCareer(o); if (!c) return false; st = c; save(); return true; },
  };
  return C;
}
