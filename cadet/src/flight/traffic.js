// CADET — flight/traffic.js : the other trainers in the pattern (MSFS-grade review, roadmap #6).
// The sky over LAB used to be empty, yet the morning TEM briefing named pattern congestion as the threat of a
// quiet day. Now the two agree: on a busy day 1–3 other academy Archers fly the standard left pattern at
// 1,000 ft AGL (the same circuit FLIGHT LAB's t2 teaches: downwind 1,600 m west of the runway, the same
// speeds), spaced round the circuit, flying touch-and-go cycles — scripted, analytic flight: a pose is a pure
// function of the time round the loop, so there is no integration to drift and nothing per frame to allocate.
// They are still non-collidable, but they are no longer pure ghosts (gap audit v2, B4.2): with a player
// pose passed to update(), the pattern reacts in the two places spacing is taught — a trainer on final
// goes around when the player is on the runway, and a trainer on downwind extends when the player cuts
// in ahead of it on final. The tower sequences the player ("number two, follow…") from the actual
// relative positions, a spacing collapse on final brings the tower's go-around instruction to the
// player, a pass within ~150 m is a near-miss event (for the debrief, not a crash), and crossing close
// behind/below one on final sets sys.wake (a light turbulence level the flight model can take as a gust).
// Not modelled (deliberately): taxiing traffic, full-stop landings and parking, departures to the practice
// area, and a second runway direction (LAB flies 36 in the career). One cycle in five or so ends in a
// go-around instead of a touch-and-go.
// Pure logic: no three.js, no DOM. The drawing is flight/traffic-view.js; the day decides (trafficForDay).

// ---------------------------------------------------------------- the day's traffic
// Other day features gate the same way (career/day.js's fault: a kind of day, a chapter, a seed): traffic
// belongs to ordinary Archer lesson days of the flying chapters, in weather a VFR pattern can work in. The
// sky stays clear on the days the design wants it clear: the first solo and the solo cross-country (kind
// 'solo' / 'xc'), the check rides ('checkride'), exams and ground days, and the Seminole / final chapters.
const VFR_KINDS = new Set(['good', 'crosswind', 'pmWind', 'southFlow']);
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
// (gap audit v2, B4/item 6) the twin does not vanish in the advanced chapters: on a Seminole-chapter day
// one Seminole flies the same circuit (visual + radio only). trafficForDay stays Archer-chapters-only (its
// gating is tested); the twin day is its own gate, asked for by name.
export const TRAFFIC_TWIN = { short: 'Seminole 4SY', spoken: 'Seminole Four Sierra Yankee', reg: 'N454SY' };
export function trafficForTwinDay({ seed = 0, kind = '', chapter = '', weather = '', slot = '' } = {}) {
  if (kind !== 'flight' || chapter !== 'ch5') return 0;
  const vfr = VFR_KINDS.has(weather) || ((weather === 'amFog' || weather === 'amLowCloud') && slot === 'pm');
  if (!vfr) return 0;
  return mix((seed | 0) >>> 0) % 2 === 0 ? 1 : 0;      // about half the twin's VFR days share the circuit
}

// createTraffic(P) → { set(count, seed, runway | { twin, runway }), update(dt, player?) → [events], poses, count, wake }
// poses[i] = { n, e, y (m MSL), q (the physics quaternion) } in FLIGHT LAB's world, ready to draw.
// runway '18' mirrors the circuit (the day's active runway: the pattern turns the other way, on the other
// side, and the calls name 18); the circuit itself is only ever drawn for 36 and mirrored here.
// player (optional): { along, cross, altFt, call } in the circuit frame — passing it turns the reactions
// on (spacing, sequencing, near-miss, wake). Without it the system is exactly the old analytic pattern.
// Events are the heard calls ({ name, en, say }) plus, with a player, kind-tagged ones the game routes
// differently: 'sequence' / 'playerGoAround' (tower calls to the player, heard), 'nearMiss' (not a radio
// call: { kind, with } for the debrief), 'trafficGoAround' (a heard call, tagged so the day can note it).
export function createTraffic(P) {
  const sys = { count: 0, t: 0, poses: [], wake: 0, update, set };
  let seed = -1, twin = false, rand = rng(1), ac = [], pending = [], rwy = '36';
  const evs = [], pose = {};
  function set(count, sd, opts = {}) {
    const tw = typeof opts === 'object' ? !!opts.twin : false;
    const runway = typeof opts === 'string' ? opts : (opts.runway || '36');
    if (count === sys.count && sd === seed && tw === twin && runway === rwy) return;
    sys.count = count; seed = sd; twin = tw; rwy = runway; rand = rng(sd >>> 0 || 1); ac = []; pending = [];
    sys.poses.length = 0;
    for (let i = 0; i < count; i++) {
      ac.push({ cs: tw && i === 0 ? TRAFFIC_TWIN : TRAFFIC_CALLS[i % TRAFFIC_CALLS.length], off: CIRCUIT_S * i / Math.max(1, count) + (rand() - 0.5) * 24,
        cycle: -1, ga: false, gaSaid: false, prevSeg: -1, prevFrac: 0,
        delay: 0, extSaid: false, seqSaid: false, gaIns: false, lastNear: -1e9 });
      sys.poses.push({ n: 0, e: 0, y: 0, q: [0, 0, 0, 1] });
    }
  }
  const call = (a, name, en, say, kind) => { evs.push(kind ? { name, en, say, kind } : { name, en, say }); };
  function update(dt, player) {
    evs.length = 0;
    if (!ac.length) { sys.wake = 0; return evs; }
    dt = Math.max(0, dt || 0);
    sys.t += dt;
    for (let i = 0; i < pending.length; i++) if (pending[i].at <= sys.t) { evs.push(pending[i].ev); pending.splice(i--, 1); }
    // the player's situation, in the circuit's own terms
    const pOnRwy = !!player && player.altFt < ELEV + 25 && player.along > -200 && player.along < 1400 && Math.abs(player.cross) < 30;
    const pOnFinal = !!player && Math.abs(player.cross) < 150 && player.along < -250 && player.altFt < 750;
    const pCall = (player && player.call) || 'Archer 8SY', pSpoken = (player && player.spoken) || 'Archer Eight Sierra Yankee';
    let wakeWant = 0;
    for (let i = 0; i < ac.length; i++) {
      const a = ac[i];
      // (extending downwind: while the player is established on final ahead of this trainer's turn, the
      // trainer's clock is held — its downwind stretches instead of cutting in behind too close)
      if (player && dt > 0) {
        circuitPose(((sys.t + a.off - a.delay) % CIRCUIT_S + CIRCUIT_S) % CIRCUIT_S, a.ga, pose);
        const mine = pose.seg === SEG_DOWNWIND || pose.seg === SEG_BASE;
        if (mine && pOnFinal && a.delay < 45) {
          a.delay += dt;
          if (!a.extSaid) { a.extSaid = true; call(a, a.cs.short, `LAB Tower, ${a.cs.short}, extending downwind for spacing.`, `LAB Tower, ${a.cs.spoken}, extending downwind for spacing.`); }
        }
      }
      const lt = sys.t + a.off - a.delay, cyc = Math.floor(lt / CIRCUIT_S);
      if (cyc !== a.cycle) { a.cycle = cyc; a.ga = rand() < 0.18; a.gaSaid = false; a.delay = 0; a.extSaid = false; a.seqSaid = false; a.gaIns = false; }
      circuitPose(lt - cyc * CIRCUIT_S, a.ga, pose);
      // (the runway is the player's: a trainer on final goes around rather than landing on top of him)
      if (player && pose.seg === SEG_FINAL && pOnRwy && !a.ga) {
        a.ga = true; circuitPose(lt - cyc * CIRCUIT_S, true, pose);
        if (!a.gaSaid) { a.gaSaid = true; call(a, a.cs.short, `LAB Tower, ${a.cs.short}, going around, traffic on the runway.`, `LAB Tower, ${a.cs.spoken}, going around, traffic on the runway.`, 'trafficGoAround'); }
      }
      if (player) {
        // sequencing + spacing on a shared final, from the actual positions
        if (pose.seg === SEG_FINAL && pOnFinal) {
          const gap = pose.along - player.along;          // > 0: the trainer is ahead (nearer the threshold)
          if (gap > 0 && !a.seqSaid) {
            a.seqSaid = true;
            call(a, '管制塔', `${pCall}, LAB Tower, number two, follow ${a.cs.short} on final, runway ${rwy}, cleared to land.`, `${pSpoken}, LAB Tower, number two, follow ${a.cs.spoken} on final, runway ${rwy}, cleared to land.`, 'sequence');
          } else if (gap < 0 && gap > -1100 && !a.seqSaid) {
            a.seqSaid = true;
            call(a, '管制塔', `${a.cs.short}, LAB Tower, number two, follow the traffic on final ahead.`, `${a.cs.short}, LAB Tower, number two, follow the traffic on final ahead.`, 'sequence');
          }
          if (gap > 0 && gap < 450 && player.altFt > ELEV + 60 && !a.gaIns) {
            a.gaIns = true;
            call(a, '管制塔', `${pCall}, LAB Tower, go around, traffic ahead on final.`, `${pSpoken}, LAB Tower, go around, traffic ahead on final.`, 'playerGoAround');
          }
          // the wake: close behind and not above the one ahead
          if (gap > 0 && gap < 200 && player.altFt <= pose.altFt + 100 && player.altFt >= pose.altFt - 220) wakeWant = 1;
        }
        // a near miss is an event for the debrief (the aircraft stay non-collidable)
        const d3 = Math.hypot(pose.along - player.along, pose.cross - player.cross, (pose.altFt - player.altFt) * 0.3048);
        if (d3 < 150 && sys.t - a.lastNear > 60) { a.lastNear = sys.t; evs.push({ kind: 'nearMiss', with: a.cs.short, dist: Math.round(d3) }); }
      }
      if (rwy === '18') {          // the circuit turned end for end (a half-turn about the field's centre): the
        pose.along = 1200 - pose.along; pose.cross = -pose.cross; pose.hdgTrue = wrap360(pose.hdgTrue + 180);   // pattern on the east side, still left traffic, so the bank keeps its sign
      }
      const cs = a.cs.short, sp = a.cs.spoken;
      if (pose.seg === SEG_DOWNWIND && a.prevSeg === SEG_DOWNWIND && a.prevFrac < ABEAM && pose.frac >= ABEAM)
        call(a, cs, `LAB Tower, ${cs}, abeam, left downwind runway ${rwy}, touch and go.`, `LAB Tower, ${sp}, abeam, left downwind runway ${rwy}, touch and go.`);
      if (pose.seg === SEG_BASE && a.prevSeg !== SEG_BASE && a.prevSeg !== -1)
        call(a, cs, `LAB Tower, ${cs}, turning base, runway ${rwy}${player && pOnFinal ? ', traffic on final in sight' : ''}.`, `LAB Tower, ${sp}, turning base, runway ${rwy}${player && pOnFinal ? ', traffic on final in sight' : ''}.`);
      if (pose.seg === SEG_FINAL && a.prevSeg !== SEG_FINAL) {
        call(a, cs, `LAB Tower, ${cs}, final runway ${rwy}, touch and go.`, `LAB Tower, ${sp}, final runway ${rwy}, touch and go.`);
        pending.push({ at: sys.t + 2.4, ev: { name: '管制塔', en: `${cs}, LAB Tower, runway ${rwy}, cleared touch and go.`, say: `${sp}, LAB Tower, runway ${rwy}, cleared touch and go.` } });
      }
      if (a.ga && pose.seg === SEG_FINAL && pose.frac >= 0.8 && !a.gaSaid) {
        a.gaSaid = true;
        call(a, cs, `LAB Tower, ${cs}, going around.`, `LAB Tower, ${sp}, going around.`);
      }
      a.prevSeg = pose.seg; a.prevFrac = pose.frac;
      const p = sys.poses[i], [n, e] = P.rwyToNE(P.LAB_RWY, pose.along, pose.cross), q = P.qFromHPB(pose.hdgTrue, pose.pitch, pose.bank);
      p.n = n; p.e = e; p.y = pose.altFt / P.FT; p.q[0] = q[0]; p.q[1] = q[1]; p.q[2] = q[2]; p.q[3] = q[3];
    }
    sys.wake += (wakeWant - sys.wake) * Math.min(1, dt * 1.5);   // (builds and fades like a gust, ~1 s)
    if (sys.wake < 0.01 && !wakeWant) sys.wake = 0;
    return evs;
  }
  return sys;
}
