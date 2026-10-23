// CADET — career/logbook.js : the cadet's logbook (航空日誌). One line per day flown: the date, the aircraft, from / to,
// the flight's time (block time, engine start to shutdown, with the time of a skipped transit added and said so), the
// landings, what was trained (FLIGHT LAB's lessons and their grades), the instructor's remarks and signature. The
// totals carry over. Kept in the browser (localStorage 'cadet.logbook', versioned); a record of play, not a real
// pilot's logbook (the page says so).
export const LOGBOOK_KEY = 'cadet.logbook';
export const LOGBOOK_V = 1;
export const INSTRUCTOR_SIG = { name: '早瀬 航', cert: 'CFI-0412（架空）' };
// the time logged: hours in tenths, as pilots log it (6 minutes a tenth, rounded to the nearest)
export const tenths = (sec) => Math.round(Math.max(0, sec) / 360) / 10;

const defaultStore = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };

// an entry from the day's summary (career/day.js) and what the debrief said
export function entryFrom(sum, { date, remarks = '', dayN = 1, skippedSec = 0 } = {}) {
  const lessons = sum.lessons.filter(l => l.done).map(l => ({ id: l.id, title: l.title, grade: l.grade, passed: !!l.passed }));
  const block = sum.blockT + skippedSec;
  return {
    day: dayN, date: date || new Date().toISOString().slice(0, 10), aircraft: 'PA-28-181', reg: 'N738SY', from: 'LAB', to: 'LAB',
    total: tenths(block), dual: tenths(block), landings: sum.lessons.some(l => l.id === 't3' && l.done && !l.crashed) ? 1 : 0,
    lessons, remarks, skipped: skippedSec > 0 ? Math.round(skippedSec / 60) : 0, trust: sum.trust,
    sig: { ...INSTRUCTOR_SIG }, signed: true,
  };
}

export function createLogbook(store = defaultStore()) {
  let data = { v: LOGBOOK_V, entries: [] };
  try {
    const raw = store && store.getItem(LOGBOOK_KEY);
    if (raw) { const j = JSON.parse(raw); if (j && j.v === LOGBOOK_V && Array.isArray(j.entries)) data = j; }
  } catch (e) { /* a broken or unreadable book: start a new one */ }
  const save = () => { try { if (store) store.setItem(LOGBOOK_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ } };
  function add(entry) { data.entries.push(entry); save(); return entry; }
  function totals() {
    const t = { total: 0, dual: 0, landings: 0, days: data.entries.length };
    for (const e of data.entries) { t.total += e.total; t.dual += e.dual; t.landings += e.landings; }
    t.total = Math.round(t.total * 10) / 10; t.dual = Math.round(t.dual * 10) / 10;
    return t;
  }
  function clear() { data = { v: LOGBOOK_V, entries: [] }; try { if (store) store.removeItem(LOGBOOK_KEY); } catch (e) { /* storage unavailable */ } }
  return { add, totals, clear, get entries() { return data.entries.slice(); } };
}
