// CADET — flight/taxi.js : the ways round LAB field on the ground, and a taxi pilot that drives them (M4).
// The airfield is FLIGHT LAB's (physics PAVED): runway 36/18, the parallel taxiway A (cross 95–110 m east of the
// runway's centre line), its connectors A1 (along 10–25), A2 (600–615) and A3 (1,175–1,190), and the apron east of A
// (along 450–750, cross 110–230) with its two rows of tie-down spots. Points here are in the runway frame: a = along
// from the threshold of 36, c = across, + to the right of 36 (east).
//  - routes: from today's stand out to the hold-short line of runway 36 at A1, onto the runway (lined up), and back in
//    from where a landing stopped (off at A2 or A3) to the stand;
//  - the taxi pilot: the same inputs a pilot has on the ground (throttle, the toe brakes, the nose wheel through the
//    rudder pedals), written before each physics step as FLIGHT LAB's bot writes them. It follows the route at a
//    walking pace (slower in the turns), stops at the end, and sets the brake. It is the instructor's hands when the
//    player asks him to taxi, and the tests' driver. Only for CADET's own (free) flights: it is never used in a lesson.
// Pure logic: no three.js, no DOM.
const DEG = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const w180 = (a) => ((a % 360) + 540) % 360 - 180;

export const TWY = { c: 102.5 };                       // taxiway A's centre line
export const LANE = { c: 188 };                        // the apron's lane between the rows (row 1 at 168, row 2 at 208)
export const APRON_S = 455;                            // across the apron's south end, clear of the first stands (470)
export const A1 = { a: 17.5 }, A2 = { a: 607.5 }, A3 = { a: 1182.5 };
export const HOLD = { c: 37 };                         // the hold-short line (airfield.js HOLD_C)
export const HOLD_STOP = { a: A1.a, c: 44.5 };          // where the aircraft stops for it (its nose short of the line)
export const LINEUP = { a: 30, c: 0 };                 // lined up on 36 (where FLIGHT LAB's take-off lessons start)

// out: the stand (nose west, towards the lane) → the lane → south across the apron → A → A1 → the hold-short line
export function routeOut(stand) {
  return [
    { a: stand.a, c: LANE.c + 4 }, { a: stand.a - 8, c: LANE.c }, { a: APRON_S + 8, c: LANE.c }, { a: APRON_S, c: LANE.c - 10 },
    { a: APRON_S, c: TWY.c + 3 }, { a: APRON_S - 9, c: TWY.c }, { a: A1.a + 9, c: TWY.c }, { a: A1.a, c: TWY.c - 3 },
    { a: HOLD_STOP.a, c: HOLD_STOP.c, stop: true, name: 'hold' },
  ];
}
// over the line and onto the runway, lined up (on the centre line, heading 36)
export function routeLineUp() {
  return [{ a: A1.a, c: 24 }, { a: A1.a, c: 14 }, { a: A1.a + 1.5, c: 5 }, { a: A1.a + 3, c: 0 }, { a: LINEUP.a, c: 0, stop: true, name: 'lineup' }];
}
// which way off the runway after a landing that stopped at `along`: the next connector ahead (A2, else A3)
export const exitFor = (along) => (along < A2.a - 22 ? 'A2' : 'A3');
// in: from where the landing stopped → off the runway on the right, stopped past the hold-short line (off) → A south →
// across the apron's south end → the lane north → the stand, nose east, into it (in)
export function routeIn(from, stand) {
  const ex = exitFor(from.a), xa = ex === 'A2' ? A2.a : A3.a;
  // (from where it stopped, so the way starts at the aircraft — a long roll down the runway to A3 is part of it)
  const off = [{ a: from.a, c: 0 }, { a: Math.max(from.a + 3, xa - 30), c: 0 }, { a: xa - 6, c: 3 }, { a: xa, c: 18 }, { a: xa, c: HOLD.c + 9, stop: true, name: 'clear' }];
  const inn = [{ a: xa, c: HOLD.c + 9 }, { a: xa, c: TWY.c - 3 }, { a: xa - 9, c: TWY.c }, { a: APRON_S + 9, c: TWY.c }, { a: APRON_S, c: TWY.c + 3 }, { a: APRON_S, c: LANE.c - 10 },
    { a: APRON_S + 10, c: LANE.c }, { a: stand.a - 10, c: LANE.c }, { a: stand.a, c: LANE.c + 9 }, { a: stand.a, c: stand.c - 1.5, stop: true, name: 'stand' }];
  return { exit: ex, off, in: inn, points: [...off.slice(0, -1), ...inn] };
}

// createTaxiPilot(FL, points, opts) → { fly(L, dt), state }: fly writes the controls for one physics step.
// opts: { speed m/s (default 4.1 ≈ 8 kt), turnSpeed (2.2), lookahead (m) }
export function createTaxiPilot(FL, points, { speed = 4.1, turnSpeed = 2.2, look = 5.5 } = {}) {
  const P = FL.physics, R = P.LAB_RWY;
  const st = { i: 0, done: false, stopped: false, dist: 0, err: 0, at: null, v: 0, iThr: 0 };
  const segLen = (k) => Math.hypot(points[k + 1].a - points[k].a, points[k + 1].c - points[k].c);
  // the corner ahead: how sharp, how far
  function cornerAhead(k, a, c) {
    if (k + 2 >= points.length) return { ang: 0, d: Infinity };
    const p = points[k + 1], d = Math.hypot(p.a - a, p.c - c);
    const h1 = Math.atan2(p.c - points[k].c, p.a - points[k].a), h2 = Math.atan2(points[k + 2].c - p.c, points[k + 2].a - p.a);
    return { ang: Math.abs(w180((h2 - h1) / DEG)), d };
  }
  function fly(L, dt) {
    const s = L.s, pos = P.ne(s), rc = P.rwyCoords(R, pos.n, pos.e), a = rc.along, c = rc.cross;
    st.at = { a, c };
    const v = Math.hypot(s.vel[0], s.vel[2]); st.v = v;
    s.pIn = 0; s.rIn = 0;
    // the first call: start from the segment nearest to where the aircraft is (it may be part of the way already)
    if (st.i === 0 && !st.started) {
      st.started = true; st.fresh = true;           // (already there: it just stops)
      let best = Infinity;
      for (let k = 0; k < points.length - 1; k++) {
        const p0 = points[k], p1 = points[k + 1], sl = segLen(k) || 1, ux = (p1.a - p0.a) / sl, uy = (p1.c - p0.c) / sl;
        const t = clamp((a - p0.a) * ux + (c - p0.c) * uy, 0, sl), d = Math.hypot(p0.a + ux * t - a, p0.c + uy * t - c);
        if (d < best - 0.5) { best = d; st.i = k; }
      }
    }
    if (st.done) { s.thr = 0; s.brake = true; s.rud = 0; st.stopped = v < 0.15; return; }
    // the segment we are on: move on once past the end of the current one (projected)
    while (st.i < points.length - 1) {
      const p0 = points[st.i], p1 = points[st.i + 1], L2 = segLen(st.i) ** 2 || 1;
      const t = ((a - p0.a) * (p1.a - p0.a) + (c - p0.c) * (p1.c - p0.c)) / L2;
      if (t > 1 && st.i < points.length - 2) st.i++; else break;
    }
    const k = Math.min(st.i, points.length - 2), p0 = points[k], p1 = points[k + 1];
    const last = points[points.length - 1], toEnd = Math.hypot(last.a - a, last.c - c);
    // the point to steer for: `look` metres ahead along the path from the nearest point on this segment
    const sl = segLen(k) || 1, ux = (p1.a - p0.a) / sl, uy = (p1.c - p0.c) / sl;
    const t0 = clamp((a - p0.a) * ux + (c - p0.c) * uy, 0, sl);
    let rem = t0 + look + v * 0.6, j = k, ta, tc;
    for (;;) {
      const q0 = points[j], q1 = points[j + 1], ln = Math.hypot(q1.a - q0.a, q1.c - q0.c) || 1;
      if (rem <= ln || j + 2 >= points.length) { const f = Math.min(rem / ln, 1); ta = q0.a + (q1.a - q0.a) * f; tc = q0.c + (q1.c - q0.c) * f; break; }
      rem -= ln; j++;
    }
    // heading: the runway frame's along axis is the runway's true heading
    const hdg = P.attitude(s).hdg;
    let want = R.trueHdg + Math.atan2(tc - c, ta - a) / DEG;
    // the last few metres: along the last segment, the cross-track error steered out (so it stops lined up on it)
    if (k === points.length - 2 && toEnd < look + 4) {
      const xte = (a - p0.a) * uy - (c - p0.c) * ux;          // + : left of the segment's direction
      want = R.trueHdg + Math.atan2(uy, ux) / DEG + clamp(Math.atan2(1.0 * xte, v + 1.0) / DEG, -30, 30);
    }
    const err = w180(want - hdg); st.err = err;
    s.rud = clamp(err / 22, -1, 1);
    // the speed: slower before a sharp corner, down to a stop at the end
    const cor = cornerAhead(k, a, c);
    let vt = speed;
    if (cor.ang > 30) vt = Math.min(vt, turnSpeed + Math.max(0, cor.d - 6) * 0.25);
    if (Math.abs(err) > 25) vt = Math.min(vt, turnSpeed);
    vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * 0.5 * (toEnd - 0.6))) + 0.15);
    if (toEnd < 0.8 || (toEnd < 3 && (v < 0.25 || st.fresh))) { st.done = true; s.thr = 0; s.brake = true; s.rud = 0; return; }
    st.fresh = false;
    const e = vt - v;
    st.iThr = clamp(st.iThr + e * 0.05 * dt, 0, 0.12);
    s.thr = clamp(0.06 + st.iThr + e * 0.09, 0, 0.42);
    s.brake = e < -0.9;
    if (s.brake) s.thr = 0;
    st.dist += v * dt;
  }
  return { fly, state: st, points };
}
