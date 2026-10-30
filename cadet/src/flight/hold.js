// CADET — flight/hold.js : holding, as data and arithmetic (next-wave item 3).
// The fix, the entry, the wind correction and the timing of a hold, in one pure module the lessons,
// the PROC display and the tests all read. The hold itself is the one FLIGHT LAB's i4 already flies
// (LAB VOR, inbound course 090°, right turns, 3,000 ft, one-minute legs); what is new is everything
// around it: how you ENTER it (direct / parallel / teardrop, by where you arrive from), how the wind
// bends it (the inbound wind-correction angle, tripled on the outbound leg — the standard teaching
// rule, AIM 5-3-8) and how long the outbound leg must be so the inbound leg takes one minute.
// Pure logic: no three.js, no DOM. Angles are magnetic degrees, speeds knots, times seconds.

export const wrap360 = (a) => ((a % 360) + 360) % 360;
export const wrap180 = (a) => ((a + 540) % 360) - 180;
const DEG = Math.PI / 180;

// the hold at LAB VOR (架空局 LBV): inbound 090° (to the fix, eastbound), right-hand turns
export const HOLD_LBV = {
  fix: 'LBV', fixName: 'LAB VOR（架空局）', inboundCourse: 90, turns: 'right',
  altitudeFt: 3000, legSec: 60, tasKt: 100,
};

// entryForHold(hold, { courseToFix, holdingSide }) → 'direct' | 'parallel' | 'teardrop'
// courseToFix: the direction of travel toward the fix when arriving (magnetic).
// holdingSide: whether the aircraft arrives from the holding side of the inbound course
// (for a right-hand hold, the right side of the inbound course — south of an eastbound course).
// The sectors (AIM 5-3-8): arriving within ±70° of the inbound course is a direct entry — fly the
// hold as drawn. Arriving from the other side: from the holding side it is a teardrop (cross the
// fix, fly out at 30° into the holding side, turn right back to the inbound course); from the
// non-holding side it is parallel (cross the fix, fly the outbound course parallel on the
// non-holding side, turn left back to intercept the inbound course).
export function entryForHold(hold, arrival) {
  const d = Math.abs(wrap180((arrival && arrival.courseToFix) - hold.inboundCourse));
  if (d <= 70) return 'direct';
  return arrival && arrival.holdingSide ? 'teardrop' : 'parallel';
}
export const ENTRY_NAMES = { direct: 'Direct entry（直接進入）', parallel: 'Parallel entry（平行進入）', teardrop: 'Teardrop entry（涙滴進入）' };
// is a position (offset from the fix, metres north/east) on the holding side of the inbound course?
export function onHoldingSide(hold, dn, de) {
  const h = hold.inboundCourse * DEG;                       // inbound direction of travel (n, e)
  const dirN = Math.cos(h), dirE = Math.sin(h);
  // right of the direction of travel, for a right-hand hold: cross = dir × offset (z-down plane)
  const cross = dirN * de - dirE * dn;                      // > 0: the offset is to the right (holding side)
  return hold.turns === 'right' ? cross > 0 : cross < 0;
}

// windCorrection(hold, { windFrom, windKt, tasKt }) → the numbers the hold is flown with:
//  wcaInDeg: the wind-correction angle on the inbound leg (signed: + = correct to the right);
//  inboundHdg / outboundHdg: the headings that hold the courses (the outbound correction is the
//  inbound one tripled, applied the other way — the standard rule for a one-minute hold);
//  gsInKt / gsOutKt: the ground speeds on the two legs;
//  outboundSec: the outbound time that makes the INBOUND leg take hold.legSec (the legs cover the
//  same ground distance, so tOut = legSec × gsIn / gsOut).
export function windCorrection(hold, { windFrom, windKt, tasKt } = {}) {
  const tas = tasKt || hold.tasKt || 100, kt = windKt || 0;
  const rel = wrap180(windFrom + 180 - hold.inboundCourse); // where the wind blows TO, against the inbound course
  const crossKt = kt * Math.sin(rel * DEG);                 // + : the wind pushes the aircraft right of course inbound
  const wcaInDeg = -Math.asin(Math.max(-1, Math.min(1, crossKt / tas))) / DEG;
  const alongInKt = kt * Math.cos(rel * DEG);               // the wind's component along the inbound course (+ = tailwind)
  const gsInKt = Math.sqrt(Math.max(1, tas * tas - crossKt * crossKt)) + alongInKt;
  const gsOutKt = Math.sqrt(Math.max(1, tas * tas - crossKt * crossKt)) - alongInKt;
  const inboundHdg = wrap360(hold.inboundCourse + wcaInDeg) || 360;
  const outboundCourse = wrap360(hold.inboundCourse + 180);
  const outboundHdg = wrap360(outboundCourse - 3 * wcaInDeg) || 360;
  const outboundSec = Math.round(hold.legSec * gsInKt / Math.max(1, gsOutKt));
  const r1 = (v) => Math.round(v * 10) / 10 || 0;          // (|| 0: no −0 in the readouts)
  return { wcaInDeg: r1(wcaInDeg), inboundHdg: Math.round(inboundHdg), outboundHdg: Math.round(outboundHdg), outboundCourse, gsInKt: r1(gsInKt), gsOutKt: r1(gsOutKt), outboundSec };
}
