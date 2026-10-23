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
};
// the training device's lessons (FLIGHT LAB's stage 0), in order
export const GROUND = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'];
// chapter 2's lessons in the order they are flown (t1 and t3 are flown every day round the others: they are passed
// along the way; the instructor schedules them on their own only if they are not)
export const CH2 = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't2', 't4', 'e1', 'e2', 'e3', 't1', 't3'];
export const ALL_CH2 = [...CH2, 'c1'];
// the classes of chapter 1: the textbook's part 1, two chapters a day (the lecturer's talk: content/dialog/school.js)
export const CLASSES = [['intro', 'aero'], ['sys', 'perf'], ['wx', 'law'], ['radio1', 'radio2'], ['radio3', 'radio4'], ['radio5', 'hf']];
// the written tests: FLIGHT LAB's question banks (quiz.js), so many questions drawn, the pass mark
export const EXAMS = {
  written1: { title: '学科試験（第 1 章）', banks: ['q_aero', 'q_sys', 'q_perf', 'q_wx', 'q_law', 'q_comm', 'q_hf'], n: 28, pass: 80, room: 'planning' },
  presolo: { title: 'ソロ前の筆記試験', banks: ['q_ops', 'q_emg', 'q_law'], n: 20, pass: 80, room: 'planning' },
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
};
// weatherFor(seed, day, { force }) → { kind, ja, fly, decision, why, metar: { am, pm }, taf, tempC, dewC, qnh }
// (the wind on a day that can be flown is the lessons' own wind: FLIGHT LAB's lessons fly in 010° 5 kt, so the METAR,
// the ATIS and the windsock agree with what the cadet flies in)
export function weatherFor(seed, day, { force } = {}) {
  const r = rng((seed * 7919 + day * 104729) >>> 0);
  const x = r();
  let kind = x < 0.6 ? 'good' : x < 0.72 ? 'amFog' : x < 0.87 ? 'pmStorm' : x < 0.95 ? 'crosswind' : 'storm';
  if (force) kind = force;
  const W = WEATHER[kind];
  const tempC = 17 + Math.floor(r() * 9), dewC = tempC - 4 - Math.floor(r() * 6), qnh = 29.92;
  const z = (h) => `${pad2(h)}53Z`, q = `A${String(Math.round(qnh * 100))}`;
  const wind = kind === 'crosswind' ? '09016G24KT' : '00405KT';
  const m = {
    good: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} ${wind} 10SM FEW035 ${pad2(tempC - 3)}/${pad2(dewC)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} ${wind} 10SM SCT045 ${pad2(tempC)}/${pad2(dewC)} ${q}` },
    amFog: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} 00000KT 1/2SM FG VV002 ${pad2(tempC - 5)}/${pad2(tempC - 5)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} ${wind} 10SM FEW030 ${pad2(tempC)}/${pad2(dewC)} ${q}` },
    pmStorm: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} ${wind} 10SM FEW040 ${pad2(tempC - 2)}/${pad2(dewC + 3)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} 22018G30KT 3SM +TSRA BKN025CB ${pad2(tempC - 4)}/${pad2(dewC + 2)} ${q}` },
    crosswind: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} ${wind} 10SM SCT035 ${pad2(tempC)}/${pad2(dewC)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} ${wind} 10SM SCT040 ${pad2(tempC + 1)}/${pad2(dewC)} ${q}` },
    storm: { am: `KLAB ${pad2(dateOf(day).d)}${z(13)} 18012G22KT 2SM TSRA BKN015CB ${pad2(tempC - 4)}/${pad2(tempC - 5)} ${q}`, pm: `KLAB ${pad2(dateOf(day).d)}${z(18)} 20015G28KT 1 1/2SM +TSRA OVC012CB ${pad2(tempC - 5)}/${pad2(tempC - 6)} ${q}` },
  }[kind];
  const taf = {
    good: 'TAF KLAB … 01005KT P6SM FEW035 FM1800 03008KT P6SM SCT045',
    amFog: 'TAF KLAB … 00000KT 1/2SM FG VV002 TEMPO 1215 1SM BR FM1500 01005KT P6SM FEW030',
    pmStorm: 'TAF KLAB … 01005KT P6SM FEW040 FM1700 22015G25KT 3SM TSRA BKN030CB',
    crosswind: 'TAF KLAB … 09015G24KT P6SM SCT035 FM2000 09012G20KT P6SM SCT040',
    storm: 'TAF KLAB … 18012G22KT 2SM TSRA BKN015CB TEMPO 1622 1SM +TSRA OVC010CB',
  }[kind];
  return { kind, ja: W.ja, fly: { ...W.fly }, decision: W.decision, why: W.why, metar: m, taf, tempC, dewC, qnh };
}

// ---- the state
export function newCareer(seed = 1) {
  return { v: CAREER_VERSION, seed: seed >>> 0 || 1, day: 1, slot: 'morning', chapter: 'prologue', fatigue: 20, exams: {}, ground: {}, decisions: [], done: {}, solo: null, started: true };
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
  const miss = CH2.filter(id => !passedAt(prog, id)).map(id => `課目 ${id}`);
  if (!(state.exams.presolo && state.exams.presolo.pass)) miss.push(EXAMS.presolo.title);
  if (!passedAt(prog, 'c1')) miss.push('ソロ前の審査（c1）');
  if (trust < SOLO_TRUST) miss.push(`担当教官の信頼（${SOLO_TRUST} 以上）`);
  return miss;
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
    const cls = CLASSES.findIndex((_, i) => !state.done[`class:${i}`]);
    const k = GROUND.find(id => !groundPassed(prog, id));
    if (cls >= 0) out.push({ slot: 'am', kind: 'class', id: String(cls), title: `座学：${CLASSES[cls].join('・')}`, where: 'brief-2', who: 'lecturer' });
    if (k) out.push({ slot: cls >= 0 ? 'pm' : 'am', kind: 'ftd', id: k, title: `訓練装置：${k}`, where: 'sim', who: 'lecturer' });
    const ex = state.exams.written1;
    if (cls < 0 && !k && !(ex && ex.pass)) out.push({ slot: out.length ? 'pm' : 'am', kind: 'exam', id: 'written1', title: EXAMS.written1.title, where: 'planning', who: 'lecturer' });
    return out;
  }
  // chapter 2: one flight a day (in the morning, or the afternoon when the morning cannot be flown); the tests
  const id = nextLesson(prog), ex = state.exams.presolo;
  const flySlot = W.fly.am ? 'am' : W.fly.pm ? 'pm' : null;
  const ground = (slot) => { if (!(ex && ex.pass) && id && CH2.indexOf(id) >= 9) out.push({ slot, kind: 'exam', id: 'presolo', title: EXAMS.presolo.title, where: 'planning', who: 'instructor' }); };
  if (state.solo) return [{ slot: 'am', kind: 'study', id: 'after', title: '自習（次の段階の予習）', where: 'planning', who: null }];
  if (!flySlot) { out.push({ slot: 'am', kind: 'study', id: 'weather', title: '天気で飛べない日：地上で復習', where: 'brief-1', who: 'instructor' }); ground('pm'); return out; }
  if (id) out.push({ slot: flySlot, kind: 'flight', id, title: `飛行：${id}`, where: 'apron', who: 'instructor' });
  else if (!(ex && ex.pass)) out.push({ slot: flySlot, kind: 'exam', id: 'presolo', title: EXAMS.presolo.title, where: 'planning', who: 'instructor' });
  else if (!passedAt(prog, 'c1')) out.push({ slot: flySlot, kind: 'checkride', id: 'c1', title: 'ソロ前の審査（c1・主任教官）', where: 'apron', who: 'chief' });
  else if (trust >= SOLO_TRUST) out.push({ slot: flySlot, kind: 'solo', id: 'solo', title: 'ファーストソロ', where: 'apron', who: 'instructor' });
  else out.push({ slot: flySlot, kind: 'flight', id: 't2', title: '飛行：場周経路の仕上げ（t2）', where: 'apron', who: 'instructor' });
  if (id) ground(flySlot === 'am' ? 'pm' : 'am');
  return out;
}
// the first day of flying and the first solo are not spoiled by the weather (the instructor picks a good day)
function forcedWeather(state, prog) {
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
    weather: (prog) => weatherFor(st.seed, st.day, forcedWeather(st, prog)),
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
      else return false;
      save(); return true;
    },
    finishPrologue() { st.done.prologue = st.day; save(); },
    soloDone() { st.solo = { day: st.day }; save(); },
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
