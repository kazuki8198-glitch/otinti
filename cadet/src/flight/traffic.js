// CADET — flight/traffic.js : the other trainers in the pattern (MSFS-grade review, roadmap #6).
// The sky over LAB used to be empty, yet the morning TEM briefing named pattern congestion as the threat of a
// quiet day. Now the two agree: on a busy day 1–3 other academy Archers fly the standard left pattern at
// 1,000 ft AGL (the same circuit FLIGHT LAB's t2 teaches: downwind 1,600 m west of the runway, the same
// speeds), spaced round the circuit, flying touch-and-go cycles — scripted, analytic flight: a pose is a pure
// function of the time round the loop, so there is no integration to drift and nothing per frame to allocate.
// They are ghosts: no collision with the player (if you are on final and one is ahead of you, that is the
// lesson — go around). Their position calls are heard on the tower frequency, timed to the legs.
// Not modelled (deliberately): taxiing traffic, full-stop landings and parking, departures to the practice
// area, a second runway direction (LAB flies 36 in the career), and any right of way logic — they never
// react to the player. One cycle in five or so ends in a go-around instead of a touch-and-go.
// Pure logic: no three.js, no DOM. The drawing is flight/traffic-view.js; the day decides (trafficForDay).

// ---------------------------------------------------------------- the day's traffic
// Other day features gate the same way (career/day.js's fault: a kind of day, a chapter, a seed): traffic
// belongs to ordinary Archer lesson days of the flying chapters, in weather a VFR pattern can work in. The
// sky stays clear on the days the design wants it clear: the first solo and the solo cross-country (kind
// 'solo' / 'xc'), the check rides ('checkride'), exams and ground days, and the Seminole / final chapters.
const VFR_KINDS = new Set(['good', 'crosswind', 'pmWind']);
export function trafficForDay({ seed = 0, kind = '', chapter = '', weather = '', slot = '' } = {}) {
  if (kind !== 'flight') return 0;
  if (chapter !== 'ch2' && chapter !== 'ch3' && chapter !== 'ch4') return 0;
  const vfr = VFR_KINDS.has(weather) || ((weather === 'amFog' || weather === 'amLowCloud') && slot === 'pm');
  if (!vfr) return 0;
  const h = mix((seed | 0) >>> 0);
  if (h % 10 < 3) return 0;                       // some fine days the pattern is still empty (TEM's quiet day)
  return 1 + ((h >>> 4) % 3);
}
function mix(a) { a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); return (a ^ (a >>> 16)) >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- the circuit
// Runway frame (FLIGHT LAB physics' rwyCoords): along = metres past the 36 threshold, cross = metres east of
// the centreline. Left traffic: the downwind at cross −1,600 (where FLIGHT LAB's own downwind start puts the
// student), pattern altitude 1,055 ft MSL = 1,000 ft AGL (the field is 55 ft). Corners rounded with a
// 450 m radius; speeds and the descent profile are a trainer's: 90 kt downwind, 65 kt final, the descent
// begun abeam the threshold. Segments: [upwind, crosswind turn, crosswind, downwind turn, downwind, base
// turn, base, final turn, final] and round again through the touch-and-go.
const R = 450, PAT = 1055, ELEV = 55, RWY_TRUE = 354;
const SEGS = [
  { leg: 'upwind', line: [250, 0, 1050, 0], f: 0, kt: [62, 85], alt: [ELEV, PAT], hold: 0.15, pitch: [2, 8], bank: 0 },
  { leg: 'crosswind', arc: [1050, -450, 90], kt: [85, 90], alt: [PAT, PAT], pitch: [4, 1], bank: -20 },
  { leg: 'crosswind', line: [1500, -450, 1500, -1150], f: 270, kt: [90, 90], alt: [PAT, PAT], pitch: [1, 1], bank: 0 },
  { leg: 'downwind', arc: [1050, -1150, 0], kt: [90, 90], alt: [PAT, PAT], pitch: [1, 1], bank: -20 },
  { leg: 'downwind', line: [1050, -1600, -1450, -1600], f: 180, kt: [90, 82], alt: [PAT, 880], hold: 0.42, pitch: [1, -1], bank: 0 },
  { leg: 'base', arc: [-1450, -1150, -90], kt: [80, 78], alt: [880, 840], pitch: [-1, -1], bank: -18 },
  { leg: 'base', line: [-1900, -1150, -1900, -450], f: 90, kt: [75, 75], alt: [840, 640], pitch: [-2, -2], bank: 0 },
  { leg: 'final', arc: [-1450, -450, 180], kt: [70, 68], alt: [640, 600], pitch: [-2, -2], bank: -15 },
  { leg: 'final', line: [-1450, 0, 250, 0], f: 0, kt: [66, 60], alt: [600, ELEV], pitch: [-1.5, 4], bank: 0 },
];
const SEG_DOWNWIND = 4, SEG_BASE = 5, SEG_FINAL = 8, ABEAM = 0.42;   // (the abeam point: along 0 on the downwind)
const KTMS = 0.514444;
for (const s of SEGS) {
  s.len = s.line ? Math.hypot(s.line[2] - s.line[0], s.line[3] - s.line[1]) : R * Math.PI / 2;
  s.dur = s.len / ((s.kt[0] + s.kt[1]) / 2 * KTMS);
}
export const CIRCUIT_S = SEGS.reduce((a, s) => a + s.dur, 0);
const lerp = (a, b, f) => a + (b - a) * f;
const wrap360 = (d) => ((d % 360) + 360) % 360;
const altAt = (s, f) => (s.hold && f < s.hold ? s.alt[0] : lerp(s.alt[0], s.alt[1], s.hold ? (f - s.hold) / (1 - s.hold) : f));

// the pose at `t` seconds round the loop → out { along, cross, altFt, hdgTrue, pitch, bank, kt, leg, seg, frac }
// ga: this cycle ends in a go-around (the final bottoms out at about 200 ft AGL and climbs away)
export function circuitPose(t, ga = false, out = {}) {
  let x = ((t % CIRCUIT_S) + CIRCUIT_S) % CIRCUIT_S, i = 0;
  while (i < SEGS.length - 1 && x >= SEGS[i].dur) { x -= SEGS[i].dur; i++; }
  const s = SEGS[i], f = Math.min(1, x / s.dur);
  out.seg = i; out.frac = f; out.leg = s.leg; out.bank = s.bank; out.kt = lerp(s.kt[0], s.kt[1], f);
  if (s.line) {
    out.along = lerp(s.line[0], s.line[2], f); out.cross = lerp(s.line[1], s.line[3], f);
    out.hdgTrue = wrap360(s.f + RWY_TRUE);
  } else {
    const phi = (s.arc[2] - 90 * f) * Math.PI / 180;
    out.along = s.arc[0] + R * Math.cos(phi); out.cross = s.arc[1] + R * Math.sin(phi);
    out.hdgTrue = wrap360(s.arc[2] - 90 * f - 90 + RWY_TRUE);
  }
  out.altFt = altAt(s, f); out.pitch = lerp(s.pitch[0], s.pitch[1], f);
  if (ga && i === SEG_FINAL) {                       // (the go-around: down to 215 ft MSL, then climbing away)
    out.altFt = f < 0.82 ? lerp(600, 215, f / 0.82) : lerp(215, 430, (f - 0.82) / 0.18);
    if (f >= 0.7) out.pitch = 7;
  } else if (ga && i === 0) out.altFt = lerp(430, PAT, f);
  return out;
}

// ---------------------------------------------------------------- the traffic itself
// the academy's other Archers (fictional registrations, as the parked ones are): the tower calls them by the
// short form, the speech by the spoken one
export const TRAFFIC_CALLS = [
  { short: 'Archer 1SY', spoken: 'Archer One Sierra Yankee', reg: 'N731SY' },
  { short: 'Archer 5SY', spoken: 'Archer Five Sierra Yankee', reg: 'N735SY' },
  { short: 'Archer 9SY', spoken: 'Archer Niner Sierra Yankee', reg: 'N739SY' },
];

// createTraffic(P) → { set(count, seed), update(dt) → [heard calls], poses, count }
// poses[i] = { n, e, y (m MSL), q (the physics quaternion) } in FLIGHT LAB's world, ready to draw.
export function createTraffic(P) {
  const sys = { count: 0, t: 0, poses: [], update, set };
  let seed = -1, rand = rng(1), ac = [], pending = [];
  const evs = [], pose = {}, heard = { name: '', en: '', say: '' };
  function set(count, sd) {
    if (count === sys.count && sd === seed) return;
    sys.count = count; seed = sd; rand = rng(sd >>> 0 || 1); ac = []; pending = [];
    sys.poses.length = 0;
    for (let i = 0; i < count; i++) {
      ac.push({ cs: TRAFFIC_CALLS[i % TRAFFIC_CALLS.length], off: CIRCUIT_S * i / Math.max(1, count) + (rand() - 0.5) * 24,
        cycle: -1, ga: false, gaSaid: false, prevSeg: -1, prevFrac: 0 });
      sys.poses.push({ n: 0, e: 0, y: 0, q: [0, 0, 0, 1] });
    }
  }
  const call = (a, name, en, say) => { evs.push({ name, en, say }); };
  function update(dt) {
    evs.length = 0;
    if (!ac.length) return evs;
    sys.t += Math.max(0, dt || 0);
    for (let i = 0; i < pending.length; i++) if (pending[i].at <= sys.t) { evs.push(pending[i].ev); pending.splice(i--, 1); }
    for (let i = 0; i < ac.length; i++) {
      const a = ac[i], lt = sys.t + a.off, cyc = Math.floor(lt / CIRCUIT_S);
      if (cyc !== a.cycle) { a.cycle = cyc; a.ga = rand() < 0.18; a.gaSaid = false; }
      circuitPose(lt - cyc * CIRCUIT_S, a.ga, pose);
      const cs = a.cs.short, sp = a.cs.spoken;
      if (pose.seg === SEG_DOWNWIND && a.prevSeg === SEG_DOWNWIND && a.prevFrac < ABEAM && pose.frac >= ABEAM)
        call(a, cs, `LAB Tower, ${cs}, abeam, left downwind runway 36, touch and go.`, `LAB Tower, ${sp}, abeam, left downwind runway 36, touch and go.`);
      if (pose.seg === SEG_BASE && a.prevSeg !== SEG_BASE && a.prevSeg !== -1)
        call(a, cs, `LAB Tower, ${cs}, turning base, runway 36.`, `LAB Tower, ${sp}, turning base, runway 36.`);
      if (pose.seg === SEG_FINAL && a.prevSeg !== SEG_FINAL) {
        call(a, cs, `LAB Tower, ${cs}, final runway 36, touch and go.`, `LAB Tower, ${sp}, final runway 36, touch and go.`);
        pending.push({ at: sys.t + 2.4, ev: { name: '管制塔', en: `${cs}, LAB Tower, runway 36, cleared touch and go.`, say: `${sp}, LAB Tower, runway 36, cleared touch and go.` } });
      }
      if (a.ga && pose.seg === SEG_FINAL && pose.frac >= 0.8 && !a.gaSaid) {
        a.gaSaid = true;
        call(a, cs, `LAB Tower, ${cs}, going around.`, `LAB Tower, ${sp}, going around.`);
      }
      a.prevSeg = pose.seg; a.prevFrac = pose.frac;
      const p = sys.poses[i], [n, e] = P.rwyToNE(P.LAB_RWY, pose.along, pose.cross), q = P.qFromHPB(pose.hdgTrue, pose.pitch, pose.bank);
      p.n = n; p.e = e; p.y = pose.altFt / P.FT; p.q[0] = q[0]; p.q[1] = q[1]; p.q[2] = q[2]; p.q[3] = q[3];
    }
    return evs;
  }
  return sys;
}
