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
// the time, the fatigue, the tests' scores, the go / no-go decisions and the day's work done. The flags and the trust
// are the conversations' state (dialog/engine.js), kept beside it.
// Pure logic: no three.js, no DOM.

export const CAREER_KEY = 'cadet.career';
export const CAREER_VERSION = 1;
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
// the classes of chapter 1: the textbook's part 1 (its chapters by id), a class a day (the lecturer: content/school.js)
export const CLASSES = [['aero'], ['sys', 'perf'], ['wx'], ['law', 'hf'], ['radio1', 'radio2'], ['radio3', 'radio4', 'radio5']];
// the written tests: FLIGHT LAB's question banks (quiz.js), so many questions drawn, the pass mark
export const EXAMS = {
  written1: { title: '学科試験（第 1 章）', banks: ['q_aero', 'q_sys', 'q_perf', 'q_wx', 'q_law', 'q_comm', 'q_hf'], n: 28, pass: 80, room: 'planning' },
  presolo: { title: 'ソロ前の筆記試験', banks: ['q_ops', 'q_emg', 'q_law'], n: 20, pass: 80, room: 'planning' },
  nav: { title: '航法の筆記試験', banks: ['q_nav', 'q_wx'], n: 20, pass: 80, room: 'planning', ok: '合格です。航法ログを作って、ひとりで遠くまで飛ぶ準備ができました。' },
  instr: { title: '計器飛行の筆記試験', banks: ['q_ifr', 'q_hf'], n: 20, pass: 80, room: 'planning', ok: '合格です。計器の審査に進めます。' },
  multi: { title: '双発の筆記試験', banks: ['q_me', 'q_emg'], n: 20, pass: 80, room: 'planning', ok: '合格です。双発の審査に進めます。' },
  final: { title: '最終の筆記試験', banks: ['q_crm', 'q_law', 'q_ops', 'q_radio'], n: 24, pass: 80, room: 'planning', ok: '合格です。残るは、最終審査の Check Flight だけです。' },
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
  let kind = x < 0.6 ? 'good' : x < 0.72 ? 'amFog' : x < 0.87 ? 'pmStorm' : x < 0.95 ? 'crosswind' : 'storm';
  // (M6: the instrument chapter's days bring low cloud too, about one in five)
  if (o.ifr && kind === 'good' && r2() < 0.22) kind = 'lowCloud';
  if (force) kind = force;
  const W = WEATHER[kind];
  const tempC = 17 + Math.floor(r() * 9), dewC = tempC - 4 - Math.floor(r() * 6), qnh = 29.92;
  const z = (h) => `${pad2(h)}53Z`, q = `A${String(Math.round(qnh * 100))}`;
  const wind = kind === 'crosswind' ? '09016G24KT' : kind === 'lowCloud' ? '03006KT' : '00405KT';
  const m = {
    good: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} ${wind} 10SM FEW035 ${pad2(tempC - 3)}/${pad2(dewC)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} ${wind} 10SM SCT045 ${pad2(tempC)}/${pad2(dewC)} ${q}` },
    amFog: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} 00000KT 1/2SM FG VV002 ${pad2(tempC - 5)}/${pad2(tempC - 5)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} ${wind} 10SM FEW030 ${pad2(tempC)}/${pad2(dewC)} ${q}` },
    pmStorm: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} ${wind} 10SM FEW040 ${pad2(tempC - 2)}/${pad2(dewC + 3)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} 22018G30KT 3SM +TSRA BKN025CB ${pad2(tempC - 4)}/${pad2(dewC + 2)} ${q}` },
    crosswind: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} ${wind} 10SM SCT035 ${pad2(tempC)}/${pad2(dewC)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} ${wind} 10SM SCT040 ${pad2(tempC + 1)}/${pad2(dewC)} ${q}` },
    lowCloud: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} ${wind} 3SM BR BKN008 OVC015 ${pad2(tempC - 4)}/${pad2(tempC - 5)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} ${wind} 4SM BR OVC009 ${pad2(tempC - 3)}/${pad2(tempC - 4)} ${q}` },
    storm: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} 18012G22KT 2SM TSRA BKN015CB ${pad2(tempC - 4)}/${pad2(tempC - 5)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} 20015G28KT 1 1/2SM +TSRA OVC012CB ${pad2(tempC - 5)}/${pad2(tempC - 6)} ${q}` },
  }[kind];
  const taf = {
    good: 'TAF KLAB … 01005KT P6SM FEW035 FM1800 03008KT P6SM SCT045',
    amFog: 'TAF KLAB … 00000KT 1/2SM FG VV002 TEMPO 1215 1SM BR FM1500 01005KT P6SM FEW030',
    pmStorm: 'TAF KLAB … 01005KT P6SM FEW040 FM1700 22015G25KT 3SM TSRA BKN030CB',
    crosswind: 'TAF KLAB … 09015G24KT P6SM SCT035 FM2000 09012G20KT P6SM SCT040',
    storm: 'TAF KLAB … 18012G22KT 2SM TSRA BKN015CB TEMPO 1622 1SM +TSRA OVC010CB',
    lowCloud: 'TAF KLAB … 03006KT 3SM BR BKN008 OVC015 FM2000 03008KT 5SM BR OVC012',
  }[kind];
  return { kind, ja: W.ja, fly: { ...W.fly }, decision: W.decision, why: W.why, metar: m, taf, tempC, dewC, qnh, ...(W.ifr ? { ifr: W.ifr } : {}) };
}

// ---- the state
export function newCareer(seed = 1) {
  return { v: CAREER_VERSION, seed: seed >>> 0 || 1, day: 1, slot: 'morning', chapter: 'prologue', fatigue: 20, exams: {}, ground: {}, decisions: [], done: {}, solo: null, checks: {}, graduated: null, started: true };
}
// a saved state that can be used: this version, the parts of the right kind (a cleaned copy), else null
export function cleanCareer(o) {
  if (!isObj(o) || o.v !== CAREER_VERSION) return null;
  const s = newCareer(o.seed);
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
  if (isObj(o.graduated) && Number.isInteger(o.graduated.day)) s.graduated = { day: o.graduated.day };
  return s;
}

// ---- what counts
const lessonRec = (prog, id) => (prog && prog.lessons && prog.lessons[id]) || null;
export const passedAt = (prog, id, levels = COUNTS) => { const r = lessonRec(prog, id); return !!(r && r.pass && (r.levels || []).some(l => levels.includes(l))); };
export const groundPassed = (prog, id) => { const r = lessonRec(prog, id); return !!(r && r.pass); };
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
  if (isOff(day)) return [{ slot: 'am', kind: 'off', title: '休日', where: null, who: null }];
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
    const k = GROUND.find(id => !groundPassed(prog, id) || today(`ftd:${id}`));
    if (cls >= 0) out.push({ slot: 'am', kind: 'class', id: String(cls), title: `座学（${cls + 1} / ${CLASSES.length}）`, where: 'brief-2', who: 'lecturer' });
    if (k) out.push({ slot: cls >= 0 ? 'pm' : 'am', kind: 'ftd', id: k, title: `訓練装置：${k}`, where: 'sim', who: 'lecturer' });
    const ex = state.exams.written1;
    if (cls < 0 && !k && (!(ex && ex.pass) || today('exam:written1'))) out.push({ slot: out.length ? 'pm' : 'am', kind: 'exam', id: 'written1', title: EXAMS.written1.title, where: 'planning', who: 'lecturer' });
    return out;
  }
  if (STAGE[state.chapter]) return laterSchedule(state, prog, W, out).sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
  // chapter 2: one flight a day (in the morning, or the afternoon when the morning cannot be flown); the tests. A flight
  // already flown today stays today's
  const flown = Object.entries(state.done).find(([k, v]) => v === day && /^(flight|checkride|solo):/.test(k));
  const id = flown && flown[0].startsWith('flight:') ? flown[0].slice(7) : nextLesson(prog), ex = state.exams.presolo;
  const flySlot = W.fly.am ? 'am' : W.fly.pm ? 'pm' : null;
  const ground = (slot) => { if (!(ex && ex.pass) && id && CH2.indexOf(id) >= 9) out.push({ slot, kind: 'exam', id: 'presolo', title: EXAMS.presolo.title, where: 'planning', who: 'instructor' }); };
  if (state.solo && !(flown && flown[0] === 'solo:solo')) return [{ slot: 'am', kind: 'study', id: 'after', title: '自習（次の段階の予習）', where: 'planning', who: null }];
  if (flown && flown[0] === 'checkride:c1') return [{ slot: W.fly.am ? 'am' : 'pm', kind: 'checkride', id: 'c1', title: 'ソロ前の審査（c1・主任教官）', where: 'apron', who: 'chief' }];
  if (flown && flown[0] === 'solo:solo') return [{ slot: W.fly.am ? 'am' : 'pm', kind: 'solo', id: 'solo', title: 'ファーストソロ', where: 'apron', who: 'instructor' }];
  if (!flySlot) { out.push({ slot: 'am', kind: 'study', id: 'weather', title: '天気で飛べない日：地上で復習', where: 'brief-1', who: 'instructor' }); ground('pm'); return out; }
  if (id) out.push({ slot: flySlot, kind: 'flight', id, title: `飛行：${id}`, where: 'apron', who: 'instructor' });
  else if (!(ex && ex.pass) || state.done['exam:presolo'] === day) out.push({ slot: flySlot, kind: 'exam', id: 'presolo', title: EXAMS.presolo.title, where: 'planning', who: 'instructor' });
  else if (!passedAt(prog, 'c1')) out.push({ slot: flySlot, kind: 'checkride', id: 'c1', title: 'ソロ前の審査（c1・主任教官）', where: 'apron', who: 'chief' });
  else if (trust >= SOLO_TRUST) out.push({ slot: flySlot, kind: 'solo', id: 'solo', title: 'ファーストソロ', where: 'apron', who: 'instructor' });
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
  const written = (slot) => { if (!(ex && ex.pass) && id && S.lessons.indexOf(id) >= Math.floor(S.lessons.length / 2)) out.push({ slot, kind: 'exam', id: S.exam, title: EXAMS[S.exam].title, where: 'planning', who: 'instructor' }); };
  if (flown && flown[0] === `${C.kind}:${S.check}`) return checkItems(state, C, S.check, W, out, true);
  if (!flySlot) {
    out.push({ slot: 'am', kind: 'study', id: 'weather', title: '天気で飛べない日：地上で復習', where: 'brief-1', who: 'instructor' });
    if (!(ex && ex.pass) && (!id || S.lessons.indexOf(id) >= Math.floor(S.lessons.length / 2))) out.push({ slot: 'pm', kind: 'exam', id: S.exam, title: EXAMS[S.exam].title, where: 'planning', who: 'instructor' });
    return out;
  }
  if (id) { out.push({ slot: flySlot, kind: 'flight', id, title: `飛行：${id}`, where: 'apron', who: 'instructor' }); written(flySlot === 'am' ? 'pm' : 'am'); return out; }
  if (!(ex && ex.pass) || today(`exam:${S.exam}`)) { out.push({ slot: flySlot, kind: 'exam', id: S.exam, title: EXAMS[S.exam].title, where: 'planning', who: 'instructor' }); return out; }
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

// createCareer({ store, seed }) → the career with its save; the game asks it and tells it what happened
export function createCareer({ store = null, seed } = {}) {
  let st = null;
  const read = () => { try { const raw = store && store.getItem(CAREER_KEY); return raw ? cleanCareer(JSON.parse(raw)) : null; } catch (e) { return null; } };
  const save = () => { try { if (store) store.setItem(CAREER_KEY, JSON.stringify(st)); return !!store; } catch (e) { return false; } };
  st = read() || newCareer(seed ?? Math.floor(Math.random() * 2 ** 31));
  const C = {
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
    exam(id, pct) {
      const E = EXAMS[id]; if (!E) return null;
      const r = st.exams[id] || { tries: 0, best: 0, pass: false };
      r.tries++; r.best = Math.max(r.best, Math.round(pct)); if (pct >= E.pass) r.pass = true;
      st.exams[id] = r; st.done[`exam:${id}`] = st.day; st.fatigue = clamp(st.fatigue + 8, 0, 100); save(); return r;
    },
    decision(choice, weather) { const right = choice === weather.decision; st.decisions.push({ day: st.day, choice, right }); save(); return right; },
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
    soloDone() { st.solo = { day: st.day }; save(); },
    // a check flown (M6): passed or not; the graduation
    check(id, pass) { const r = st.checks[id] || { tries: 0, pass: false, day: 0 }; r.tries++; if (pass) { r.pass = true; r.day = st.day; } st.checks[id] = r; st.done[`${CHECKS[id].kind}:${id}`] = st.day; save(); return r; },
    graduate() { st.graduated = { day: st.day }; st.done['graduation:grad'] = st.day; save(); },
    // today's weather as it counts for today's flying (the instrument chapter flies in low cloud)
    flyingWeather: (prog, kind = 'flight') => weatherFor2(weatherFor(st.seed, st.day, forcedWeather(st, prog)), st.chapter, kind),
    // the time moves on (the next slot; the evening stays the evening until the cadet goes to bed)
    advance(to) {
      const i = SLOTS.indexOf(st.slot), j = to ? SLOTS.indexOf(to) : i + 1;
      if (j > i && j < SLOTS.length) { st.slot = SLOTS[j]; save(); return true; }
      return false;
    },
    // work tires (a flight 15, a class or the device 6, a test 8); a night's sleep rests: early 50, late (studying) 25
    tire(n) { st.fatigue = clamp(st.fatigue + n, 0, 100); save(); },
    sleep({ late = false } = {}) {
      st.fatigue = clamp(st.fatigue - (late ? 25 : 50) + (late ? 10 : 0), 0, 100);
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
