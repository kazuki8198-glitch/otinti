// CADET — aircraft/failures.js : seeded random failures and the preflight-defect → flight-hook map
// (next-wave item 4). Pure logic: no three.js, no DOM, no physics of its own.
//
// RANDOM FAILURES
//  - Career: on an eligible day (see isEligibleDay) a single failure may be seeded, with
//    probability RANDOM_FAIL_P = 0.20. Grounding for the number: the previous hand-rolled
//    hashes gave a magneto day on ~1/6 of eligible ch3/4 Archer days and an alternator day
//    on ~1/7, mutually exclusive — a combined envelope of roughly one eventful day in five.
//    0.20 keeps that envelope while widening the kinds, so scored lessons (which keep their
//    fixed wind and must keep passing) are not swamped: four days in five are clean, and the
//    career kinds are the day-fault kinds the day flow already tolerates (a run-up magneto,
//    carb ice, pitot/static blockage, a fuel pump, an alternator, a twin's gear transit) —
//    never an outright engine stop, AHRS or GPS loss in career. Those three are free-flight
//    only, where nothing is scored.
//  - Free flight: no failure unless the instructor console schedules one, or — when the
//    setup leaves the failure on "none" — a seeded roll (the session's seed) schedules one
//    in flight at its trigger (minutes / altitude), never at the ramp.
//  - The instructor console: makeSchedule(kind, { atMin, atAltFt }) is one reservation;
//    failureDue / dueSchedule say when it fires. fly-mode applies a due kind through the
//    routes that already exist (systems.setFault / setElecFault for mag/elec, carbDay for
//    carb, FLIGHT LAB's failNow for pitot/static/gear/pump/engine/engL/engR/ahrs/gps).
//
// PREFLIGHT DEFECTS
//  PREFLIGHT_HOOKS maps every walk-around task / anomaly to the EXISTING hook its being
//  left behind connects to — no parallel system: a left pitot cover or a blocked pitot
//  tube goes to the PS1 pitot path (failNow 'pitot': s.pitotRisk = 3, the tube blocks in
//  the band and the heat is the cure), a taped static port to failNow 'static'
//  (s.staticBlocked), low oil to the EN4 oil quantity (s.eng[].oilQ, the systems' oilQ),
//  and everything else to 'ground' — it is put right before departure by the cadet, the
//  maintenance, or the instructor's look-round (walkaround.settle), and is judged in the
//  debrief / trust, not in the air. walkaround.consequences() reads this map;
//  career/day.js captures it at boarded() (before settle) as the day's preflightEffects,
//  and fly-mode seeds the flight hooks from it each frame (a lesson's fresh state starts
//  clean, as with the day faults). Finding a defect is judged through the career's existing
//  growth: preflightJudgeBase() is only the base value main.js hands to career.grow('judge',
//  …, `preflight:<day>`) — the diminishing/repeat formula is career.js's own, unchanged.

export const FAIL_KINDS = ['mag', 'carb', 'elec', 'pitot', 'static', 'gear', 'pump', 'engine', 'engL', 'engR', 'ahrs', 'gps'];
// the kinds a career day may seed (day-fault kinds only: no scored lesson is ambushed)
export const CAREER_FAIL_KINDS = ['mag', 'carb', 'pitot', 'static', 'elec', 'pump', 'gear'];
export const RANDOM_FAIL_P = 0.20;

// conditional weights once a failure is seeded (renormalised over the kinds allowed for
// the aircraft / lesson: gear is twin-only, static is not seeded on an instrument lesson —
// a frozen altimeter there would grade the instruments, not the cadet)
const WEIGHTS = {
  career: { mag: 22, carb: 18, pitot: 16, static: 14, elec: 16, pump: 14, gear: 12 },
  free: { mag: 12, carb: 12, pitot: 12, static: 10, elec: 12, pump: 10, gear: 8, engine: 8, engL: 4, engR: 4, ahrs: 5, gps: 3 },
};

// the seeded rng of the career's own kind (career.js / walkaround.js use the same mixer)
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// a hash apart from the weather's and the walk-around's, so a failure never moves either
const hashOf = (seed, day, mode) => (seed * 424243 + day * 104729 + (mode === 'free' ? 131 : 7)) >>> 0;

// a day that may carry a random failure: a normal flying day's flight lesson — never a
// written-test day, a checkride / XC day, a solo, or a chapter's first lesson (the old
// hand-rolled hashes kept the first lesson clean too, and a first lesson is scored
// against a clean aircraft). `kind` is the schedule item's kind ('flight' | 'exam' |
// 'checkride' | 'xc' | 'solo' | 'free' | …).
export function isEligibleDay({ kind = '', exam = false, checkride = false, firstLesson = false } = {}) {
  return kind === 'flight' && !exam && !checkride && !firstLesson;
}

// randomFailureFor({ seed, day, kind, aircraft, lessonId, mode, … })
//  → null (a clean day) or { kind, prob, trigger: { type: 'runup' | 'immediate' |
//    'afterMin' | 'atAltFt', afterMin?, atAltFt? } }. Deterministic in (seed, day, mode).
export function randomFailureFor({ seed = 1, day = 1, kind = 'flight', exam = false, checkride = false, firstLesson = false, aircraft = 'pa28', lessonId = '', mode = 'career' } = {}) {
  if (mode === 'career' && !isEligibleDay({ kind, exam, checkride, firstLesson })) return null;
  if (mode !== 'career' && mode !== 'free') return null;
  const R = rng(hashOf(seed, day, mode));
  if (R() >= RANDOM_FAIL_P) return null;
  const table = { ...(mode === 'free' ? WEIGHTS.free : WEIGHTS.career) };
  if (aircraft !== 'pa44') delete table.gear;
  if (aircraft !== 'pa44') { delete table.engL; delete table.engR; }
  if (mode === 'career' && /^i/.test(String(lessonId || ''))) delete table.static;
  const kinds = Object.keys(table);
  let sum = kinds.reduce((a, k) => a + table[k], 0), pick = R() * sum, chosen = kinds[kinds.length - 1];
  for (const k of kinds) { pick -= table[k]; if (pick < 0) { chosen = k; break; } }
  let trigger;
  if (chosen === 'mag') trigger = { type: mode === 'free' ? 'immediate' : 'runup' };
  else if (mode === 'career') trigger = { type: 'immediate' };            // (a day fault: latent for the day, as mag/carb/pitot/gear/pump/elec were)
  else if (chosen === 'engine' || chosen === 'engL' || chosen === 'engR' || chosen === 'ahrs' || chosen === 'gps') trigger = { type: 'atAltFt', atAltFt: 1500 + 500 * Math.floor(R() * 4) };
  else trigger = { type: 'afterMin', afterMin: 5 + Math.floor(R() * 16) };   // 5–20 min in
  return { kind: chosen, prob: RANDOM_FAIL_P, trigger };
}

// ---- the instructor console (free flight): a failure reserved for a time / an altitude
// makeSchedule(kind, { atMin, atAltFt }) → { kind, atMin, atAltFt } or null (a kind the
// failNow / systems routes do not know, or a negative time/altitude, is refused). Both
// null: it fires at once. Due when EITHER condition it carries is met.
export function makeSchedule(kind, { atMin = null, atAltFt = null } = {}) {
  if (!FAIL_KINDS.includes(kind)) return null;
  const t = atMin == null ? null : +atMin, a = atAltFt == null ? null : +atAltFt;
  if (t != null && !(Number.isFinite(t) && t >= 0)) return null;
  if (a != null && !(Number.isFinite(a) && a >= 0)) return null;
  return { kind, atMin: t, atAltFt: a };
}
export function failureDue(entry, { elapsedMin = 0, altFt = 0 } = {}) {
  if (!entry || !FAIL_KINDS.includes(entry.kind)) return false;
  if (entry.atMin == null && entry.atAltFt == null) return true;
  return (entry.atMin != null && elapsedMin >= entry.atMin) || (entry.atAltFt != null && altFt >= entry.atAltFt);
}
export const dueSchedule = (list, state) => (Array.isArray(list) ? list : []).filter(e => failureDue(e, state));

// a random failure's trigger, as a console entry (fly-mode schedules free-flight rolls
// through the same due check as the console's own reservations)
export function scheduleOf(rf) {
  if (!rf) return null;
  const tr = rf.trigger || {};
  return makeSchedule(rf.kind, { atMin: tr.type === 'afterMin' ? tr.afterMin : tr.type === 'immediate' || tr.type === 'runup' ? 0 : null, atAltFt: tr.type === 'atAltFt' ? tr.atAltFt : null });
}

// ---- preflight defects → the existing hooks (see the header). `hook` is the machine
// word fly-mode / the tests switch on; `via` says, in words, the existing route it takes.
export const PREFLIGHT_HOOKS = {
  task: {
    pitot: { hook: 'pitotRisk', failKind: 'pitot', via: "failNow('pitot') — s.pitotRisk = 3 (PS1: the tube blocks, the heat is the cure)" },
    lock: { hook: 'ground', via: '出発不可の地上項目：教官の見回り（settle）で外され、講評と信頼に残る' },
    tieR: { hook: 'ground', via: '出発不可の地上項目：教官の見回り（settle）で外され、講評と信頼に残る' },
    tieL: { hook: 'ground', via: '出発不可の地上項目：教官の見回り（settle）で外され、講評と信頼に残る' },
    tieT: { hook: 'ground', via: '出発不可の地上項目：教官の見回り（settle）で外され、講評と信頼に残る' },
    chocks: { hook: 'ground', via: '出発不可の地上項目：教官の見回り（settle）で外され、講評と信頼に残る' },
  },
  defect: {
    pitotBlock: { hook: 'pitotRisk', failKind: 'pitot', via: "failNow('pitot') — s.pitotRisk = 3 (PS1)" },
    static: { hook: 'staticBlocked', failKind: 'static', via: "failNow('static') — s.staticBlocked = true（高度計・昇降計の凍結、代替静圧で回復）" },
    oil: { hook: 'oilQ', oilQ: 4, via: 'EN4 の油量：s.eng[].oilQ = 4（systems の oilQ と同じ状態。油圧は 2.5 qt 未満で下がり始める）' },
    cap: { hook: 'ground', via: '自分で閉める／整備の項目：出発前に直り、講評に残る' },
    water: { hook: 'ground', via: 'サンプの取り直しで直る項目：出発前に直り、講評に残る' },
  },
};
export const preflightHookFor = (source, item) => (PREFLIGHT_HOOKS[source] && PREFLIGHT_HOOKS[source][item]) || { hook: 'ground', via: '整備が直す項目：出発前に直り、講評に残る' };

// the JUDGE base for the defects a cadet FOUND on the walk-around, handed to the career's
// existing grow() by main.js (no new growth plumbing: the formula, the diminishing and
// the repeat factor are career.js's). A small base, in the range of the design's other
// judgement crumbs (a drill is 1.0, a weather decision 1.8 / 0.5): half a point a defect,
// at most 1.0 for a day. Finding nothing — or missing everything — grows nothing here;
// a miss is judged in the debrief and the trust, as before.
export function preflightJudgeBase(found = 0) {
  const n = Number.isFinite(found) ? Math.max(0, Math.floor(found)) : 0;
  return n > 0 ? Math.min(1.0, 0.5 * n) : 0;
}
