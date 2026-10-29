// CADET — career/logbook.js : the cadet's logbook (航空日誌). One line per day flown: the date, the aircraft, from / to,
// the flight's time (block time, engine start to shutdown, with the time of a skipped transit added and said so) — with
// the instructor (dual) or alone (solo, M5) — the landings, what was trained (FLIGHT LAB's lessons and their grades),
// the instructor's remarks and signature (on the first solo: his endorsement). The totals carry over. M6: the type
// (the Seminole's days), cross-country time (the solo cross-country), simulated instrument time (under the hood:
// the lessons' share of the day) and multi-engine time; a check's line signed by the check pilot. Kept in the browser (localStorage 'cadet.logbook', versioned); a record of play, not a real
// pilot's logbook (the page says so).
export const LOGBOOK_KEY = 'cadet.logbook';
export const LOGBOOK_V = 1;
export const INSTRUCTOR_SIG = { name: '早瀬 航', cert: 'CFI-0412（架空）' };
// the time logged: hours in tenths, as pilots log it (6 minutes a tenth, rounded to the nearest)
export const tenths = (sec) => Math.round(Math.max(0, sec) / 360) / 10;

const defaultStore = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };

// an entry from the day's summary (career/day.js) and what the debrief said; date: the career's day (M5)
const HOOD = new Set(['i1', 'i2', 'i3', 'i4', 'i5']);
export function entryFrom(sum, { date, remarks = '', dayN = 1, skippedSec = 0, xc = false, sig = null, endorsement = '' } = {}) {
  const lessons = sum.lessons.filter(l => l.done).map(l => ({ id: l.id, title: l.title, grade: l.grade, passed: !!l.passed }));
  const block = sum.blockT + skippedSec, solo = !!sum.solo, h = tenths(block), twin = sum.plan && sum.plan.aircraft === 'pa44';
  const hood = lessons.filter(l => HOOD.has(l.id)).length;
  const landings = Number.isInteger(sum.landings) ? sum.landings : sum.lessons.some(l => l.id === 't3' && l.done && !l.crashed) ? 1 : 0;
  return {
    day: dayN, date: date || new Date().toISOString().slice(0, 10), aircraft: twin ? 'PA-44-180' : 'PA-28-181', reg: twin ? 'N452SY' : 'N738SY', from: 'LAB', to: 'LAB',
    total: h, dual: solo ? 0 : h, solo: solo ? h : 0, landings,
    xc: xc ? h : 0, inst: hood ? Math.round(h * Math.min(1, hood / Math.max(1, lessons.length) * 1.4) * 10) / 10 : 0, me: twin ? h : 0,
    lessons, remarks, skipped: skippedSec > 0 ? Math.round(skippedSec / 60) : 0, trust: sum.trust,
    sig: sig ? { ...sig } : { ...INSTRUCTOR_SIG }, signed: true,
    ...(endorsement ? { endorsement } : solo && !xc ? { endorsement: '単独飛行（ファーストソロ）を認める。LAB 飛行場の場周経路、昼間・有視界' } : xc ? { endorsement: '単独の野外飛行を認める。LAB 訓練空域、昼間・有視界' } : {}),
  };
}
// the first day's introductory flight (体験飛行): the cadet's minutes at the controls over the practice area, and what
// the instructor flew behind the cards — the start, the taxi, the take-off, the 4 NM out and back, the pattern, the
// landing and the taxi in — added as skipped (the HUD says so). src: 14 CFR 1.1 (flight time: from moving under its
// own power for flight to rest after landing)
export const INTRO_SKIPPED_S = 1500;
// its line: dual (he is the pilot in command and the instructor), no lesson, no landing of the cadet's; src: 14 CFR
// 61.51(b) (what a logbook entry holds), 61.51(h)(2) (training time endorsed by the instructor: the training described,
// its length, the instructor's signature and certificate number). The training as it was flown (flight/intro-flight.js
// summary): level / turn the tasks' results (null: not reached; 'none': no turn made), takes his takeovers
export function introEntry({ date, dayN = 1, airSec = 0, cut = false, watched = false, level = null, turn = null, takes = 0, trust = 0 } = {}) {
  const flown = ['操縦の受け渡し', ...(level ? ['直線水平飛行'] : []), ...(turn && turn !== 'none' ? ['右旋回'] : [])].join('、');
  const remarks = cut ? '体験飛行（途中で切り上げ、早瀬 教官が LAB へ）。'
    : watched ? '体験飛行（操縦は早瀬 教官、同乗して見学）。訓練空域 3,000 ft で、直線水平飛行と右旋回。'
      : `体験飛行（離着陸と往復は早瀬 教官）。訓練空域 3,000 ft で、${flown}。${takes ? `教官が操縦を引き継ぎ ${takes} 回。` : ''}`;
  return entryFrom({ lessons: [], blockT: airSec, landings: 0, trust }, { date, dayN, remarks, skippedSec: INTRO_SKIPPED_S });
}
// an entry read back (a saved book, an imported file): the parts of the right kind, else null
const str = (x, n) => (typeof x === 'string' ? x.slice(0, n) : '');
const num = (x) => (Number.isFinite(x) ? Math.max(0, Math.round(x * 10) / 10) : 0);
export function cleanEntry(e) {
  if (!e || typeof e !== 'object' || !Number.isFinite(e.total)) return null;
  const out = { day: Number.isInteger(e.day) ? e.day : 0, date: str(e.date, 10), aircraft: str(e.aircraft, 16) || 'PA-28-181', reg: str(e.reg, 8) || 'N738SY', from: str(e.from, 4) || 'LAB', to: str(e.to, 4) || 'LAB',
    total: num(e.total), dual: num(e.dual), solo: num(e.solo), xc: num(e.xc), inst: num(e.inst), me: num(e.me), landings: Number.isInteger(e.landings) ? Math.max(0, Math.min(20, e.landings)) : 0,
    lessons: Array.isArray(e.lessons) ? e.lessons.filter(l => l && /^[a-z0-9]{1,6}$/.test(l.id)).slice(0, 12).map(l => ({ id: l.id, title: str(l.title, 40), grade: str(l.grade, 2), passed: !!l.passed })) : [],
    remarks: str(e.remarks, 200), skipped: Number.isInteger(e.skipped) ? e.skipped : 0, trust: Number.isFinite(e.trust) ? e.trust : 0,
    sig: { name: str(e.sig && e.sig.name, 20) || INSTRUCTOR_SIG.name, cert: str(e.sig && e.sig.cert, 30) || INSTRUCTOR_SIG.cert }, signed: e.signed !== false };
  if (e.endorsement) out.endorsement = str(e.endorsement, 120);
  return out;
}

export function createLogbook(store = defaultStore()) {
  let data = { v: LOGBOOK_V, entries: [] };
  try {
    const raw = store && store.getItem(LOGBOOK_KEY);
    if (raw) { const j = JSON.parse(raw); if (j && j.v === LOGBOOK_V && Array.isArray(j.entries)) data = { v: LOGBOOK_V, entries: j.entries.map(cleanEntry).filter(Boolean) }; }
  } catch (e) { /* a broken or unreadable book: start a new one */ }
  const save = () => { try { if (store) store.setItem(LOGBOOK_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ } };
  function add(entry) { data.entries.push(entry); save(); return entry; }
  function totals() {
    const t = { total: 0, dual: 0, solo: 0, xc: 0, inst: 0, me: 0, landings: 0, days: data.entries.length };
    for (const e of data.entries) { t.total += e.total; t.dual += e.dual; t.solo += e.solo || 0; t.xc += e.xc || 0; t.inst += e.inst || 0; t.me += e.me || 0; t.landings += e.landings; }
    for (const k of ['total', 'dual', 'solo', 'xc', 'inst', 'me']) t[k] = Math.round(t[k] * 10) / 10;
    return t;
  }
  function clear() { data = { v: LOGBOOK_V, entries: [] }; try { if (store) store.removeItem(LOGBOOK_KEY); } catch (e) { /* storage unavailable */ } }
  // the whole book replaced (an imported file: its entries cleaned)
  function replace(entries) { data = { v: LOGBOOK_V, entries: (entries || []).map(cleanEntry).filter(Boolean) }; save(); }
  return { add, totals, clear, replace, get entries() { return data.entries.slice(); } };
}
