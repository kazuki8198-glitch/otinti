// CADET — flight/analysis.js : the standards analysis layer (next wave, item 1). An ADDITIONAL layer over the
// flight recorder's 10 Hz samples (flight/recorder.js): it never touches a grade, a pass, a gate or a growth
// number — FLIGHT LAB's school.js still decides all of those exactly as before, and the physics is untouched.
// What it adds, from the recording alone:
//   - maneuver scoring against practical-test (ACS-style) tolerances — speed ±10 kt, altitude ±100 ft,
//     heading ±10° as the base, narrowed/widened per maneuver the way the lessons themselves are;
//   - the stabilised-approach gate at 500 ft AGL: speed, glide path, configuration (gear / flaps) and
//     descent rate, each with its measured value, stable / unstable overall;
//   - landing analysis for every touchdown: where it touched (scatter along the runway), the sink rate at
//     contact, the centreline deviation and the float distance — kept in the logbook so the history and its
//     trend can be read back (career/logbook.js, ui/day-hud.js).
// Pure logic: samples in, plain data out. Altitude comes from the sample's height (h, metres above the
// field's datum) when the alt field is empty — recordings made before the recorder's alt/vs fallbacks carry
// h only — and the sink rate is the height's own slope, so old and new recordings read the same way.

export const FT = 3.28084;
export const FIELD_ELEV_FT = 55;                       // LAB (Sorajima): GROUND_FT in the flight model
// LAB RWY 36 as the flight model has it (physics LAB_RWY): origin, true heading, length, width
export const RWY = { n: 0, e: -40000, trueHdg: 354, len: 1200, wid: 30 };
export const MAGVAR_W = 6;                             // the model's variation: magnetic = true + 6
export const AIM_ALONG = 300;                          // the aiming point: 300 m past the threshold (school.js's own aim)
export const TD_ZONE = { from: 200, to: 700 };         // the touchdown zone t3 teaches: the mark −100 m … +400 m
export const GATE_AGL_FT = 500;
// the base practical-test tolerances (the task's numbers; a maneuver may narrow them, as the lessons do)
export const TOL = { spd: 10, alt: 100, hdg: 10, bank: 5, gp: 0.9, cl: 30 };

const DEG = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const w360 = a => ((a % 360) + 360) % 360;
const w180 = a => ((a % 360) + 540) % 360 - 180;
const r1 = v => Math.round(v * 10) / 10;

// ------------------------------------------------------------------ reading a sample
// the runway frame of a position: along (m past the threshold, negative before it), cross (m, + right)
export function rwyCoords(n, e) {
  const h = RWY.trueHdg * DEG, dn = n - RWY.n, de = e - RWY.e;
  return { along: dn * Math.cos(h) + de * Math.sin(h), cross: -dn * Math.sin(h) + de * Math.cos(h) };
}
// attitude from the sample's quaternion (the flight model's own attitude formulas)
function qrot(q, v) {
  const [x, y, z, w] = q, [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}
export function attOf(x) {
  const q = Array.isArray(x && x.q) && x.q.length >= 4 ? x.q : [0, 0, 0, 1];
  const f = qrot(q, [0, 0, -1]), r = qrot(q, [1, 0, 0]), up = qrot(q, [0, 1, 0]);
  const hdgT = w360(Math.atan2(f[0], -f[2]) / DEG);
  return { hdgT, hdg: w360(hdgT + MAGVAR_W), pitch: Math.asin(clamp(f[1], -1, 1)) / DEG, bank: Math.atan2(-r[1], up[1]) / DEG };
}
// altitude (ft MSL): the recorded alt when there is one, else the height over the datum
export const altFtOf = (x) => (x && x.alt > 0 ? x.alt : (x && x.h || 0) * FT);
export const aglFtOf = (x) => altFtOf(x) - FIELD_ELEV_FT;
// the vertical speed (fpm) at sample i, from the height's slope over about a second (the recorded vs when the
// recording has nothing else is 0 — the slope is the honest number either way)
export function vsAt(xs, i) {
  const x = xs[i]; if (!x) return 0;
  let a = i, b = i;
  while (a > 0 && x.t - xs[a].t < 0.5) a--;
  while (b < xs.length - 1 && xs[b].t - x.t < 0.5) b++;
  const dt = xs[b].t - xs[a].t;
  if (dt > 0.05 && b > a) return (altFtOf(xs[b]) - altFtOf(xs[a])) / dt * 60;
  return x.vs || 0;
}
// the glide-path angle (deg) to the aiming point, the school's own formula (school.js ctx)
export function gpOf(x) {
  const rc = rwyCoords(x.n || 0, x.e || 0);
  return rc.along < AIM_ALONG - 50 ? Math.atan2(Math.max(aglFtOf(x) / FT, 0), AIM_ALONG - rc.along) / DEG : 3;
}

// ------------------------------------------------------------------ maneuver scoring
// one target of a window: the share of the window inside the tolerance and the largest deviation (the
// school's pass rule for a graded target: ≥ 85 % inside and the worst excursion within 1.6 × the tolerance)
function scoreTarget(xs, idx, get, tv, tol) {
  let n = 0, inT = 0, max = 0;
  for (const i of idx) { const d = get(xs[i], i); if (!Number.isFinite(d)) continue; n++; if (Math.abs(d) <= tol) inT++; max = Math.max(max, Math.abs(d)); }
  if (!n) return null;
  const pct = inT / n;
  return { tv, tol, pct: Math.round(pct * 100), max: r1(max), pass: pct >= 0.85 && max <= tol * 1.6, score: pct };
}
const LABEL = { spd: ['速度', 'kt'], alt: ['高度', 'ft'], hdg: ['針路', '°'], abank: ['バンク', '°'], gp: ['進入角', '°'], cl: ['センターライン', 'm'] };
// score the samples in [t0, t1] against targets { spd: {v, tol}, alt:…, hdg:…, abank:… } (v may be a function
// of the sample index). Returns school-shaped rows plus the window's own pass/score — display data only.
export function scoreWindow(xs, { name = '', t0 = -Infinity, t1 = Infinity, targets = {} } = {}) {
  const idx = [];
  for (let i = 0; i < xs.length; i++) if (xs[i].t >= t0 && xs[i].t <= t1) idx.push(i);
  if (idx.length < 5) return null;
  const rows = [], dev = {
    spd: (spec) => (x, i) => x.ias - (typeof spec.v === 'function' ? spec.v(i) : spec.v),
    alt: (spec) => (x, i) => altFtOf(x) - (typeof spec.v === 'function' ? spec.v(i) : spec.v),
    hdg: (spec) => (x, i) => w180(attOf(x).hdg - (typeof spec.v === 'function' ? spec.v(i) : spec.v)),
    abank: (spec) => (x, i) => Math.abs(attOf(x).bank) - (typeof spec.v === 'function' ? spec.v(i) : spec.v),
    gp: (spec) => (x, i) => gpOf(x) - (typeof spec.v === 'function' ? spec.v(i) : spec.v),
    cl: (spec) => (x, i) => rwyCoords(x.n || 0, x.e || 0).cross - (typeof spec.v === 'function' ? spec.v(i) : spec.v),
  };
  for (const [k, spec] of Object.entries(targets)) {
    if (!spec) continue;
    const tol = spec.tol != null ? spec.tol : TOL[k];
    const q = scoreTarget(xs, idx, dev[k](spec), typeof spec.v === 'function' ? 0 : spec.v, tol);
    if (!q) continue;
    const [lab, unit] = LABEL[k] || [k, ''];
    rows.push({ key: k, name: lab, val: `${q.pct}% が基準内（最大のずれ ${q.max} ${unit}）`, std: `±${tol} ${unit}`, pass: q.pass, score: q.score, pct: q.pct, max: q.max, tol });
  }
  if (!rows.length) return null;
  const score = rows.reduce((a, r) => a + r.score, 0) / rows.length;
  return { name, t0: xs[idx[0]].t, t1: xs[idx[idx.length - 1]].t, rows, score: Math.round(score * 100) / 100, pass: rows.every(r => r.pass) };
}
// the median of a window (robust targets: a maneuver is scored against what it set out to hold)
function median(v) { const a = v.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0; }
function circMedianDeg(v) { // headings: unwrap around the first, median, wrap back
  if (!v.length) return 0; const ref = v[0], u = v.map(x => ref + w180(x - ref)); return w360(median(u));
}
// find the maneuvers in a recording: steady level runs (altitude / heading / speed held together) and
// sustained turns (altitude held through the bank, the bank itself) — scored against their own medians,
// which is what the pilot was holding. Approach windows are scored per touchdown (below), not here.
export function findManeuvers(xs, opts = {}) {
  const out = [];
  if (!xs || xs.length < 50) return out;
  const minLevel = (opts.minLevelSec || 12) * 10, minTurn = (opts.minTurnSec || 8) * 10;
  let run = null;   // { kind, from, sign }
  const flush = (to) => {
    if (!run) return;
    const idx = []; for (let i = run.from; i <= to; i++) idx.push(i);
    if (run.kind === 'level' && idx.length >= minLevel) {
      const altT = Math.round(median(idx.map(i => altFtOf(xs[i]))) / 50) * 50;
      const hdgT = Math.round(circMedianDeg(idx.map(i => attOf(xs[i]).hdg)));
      const spdT = Math.round(median(idx.map(i => xs[i].ias)));
      const w = scoreWindow(xs, { name: '直線水平（保持）', t0: xs[run.from].t, t1: xs[to].t, targets: { alt: { v: altT, tol: TOL.alt }, hdg: { v: hdgT, tol: TOL.hdg }, spd: { v: spdT, tol: TOL.spd } } });
      if (w) out.push(w);
    } else if (run.kind === 'turn' && idx.length >= minTurn) {
      const altT = Math.round(median(idx.map(i => altFtOf(xs[i]))) / 50) * 50;
      const bankT = Math.round(median(idx.map(i => Math.abs(attOf(xs[i]).bank))));
      const w = scoreWindow(xs, { name: run.sign > 0 ? '右旋回（保持）' : '左旋回（保持）', t0: xs[run.from].t, t1: xs[to].t, targets: { alt: { v: altT, tol: TOL.alt }, abank: { v: bankT, tol: TOL.bank } } });
      if (w) out.push(w);
    }
    run = null;
  };
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i], air = !x.onGround && aglFtOf(x) > 30, bank = attOf(x).bank, vs = vsAt(xs, i);
    const kind = !air ? null : Math.abs(bank) >= 15 ? 'turn' : Math.abs(bank) <= 12 && Math.abs(vs) <= 250 ? 'level' : null;
    const sign = bank >= 0 ? 1 : -1;
    if (!run || run.kind !== kind || (kind === 'turn' && run.sign !== sign)) { flush(i - 1); if (kind) run = { kind, from: i, sign }; }
  }
  flush(xs.length - 1);
  return out.slice(0, 6);
}

// ------------------------------------------------------------------ the 500 ft gate + the landing
// the gate at 500 ft AGL on the approach that ends at sample `before` (a touchdown index): the last
// descending crossing of 500 ft before it. Each element with its measured value; stable only if all pass.
export function gateAt(xs, before, opts = {}) {
  const vref = opts.vref || 70, flapMin = opts.flapMinDeg != null ? opts.flapMinDeg : 25;
  let g = -1;
  for (let i = Math.min(before, xs.length - 1); i > 0; i--) {
    if (aglFtOf(xs[i]) <= GATE_AGL_FT && aglFtOf(xs[i - 1]) > GATE_AGL_FT && !xs[i].onGround) { g = i; break; }
    if (xs[i].onGround && i < before) break;                    // (an earlier landing: this approach has no gate)
    if (aglFtOf(xs[i]) > 1500) break;                           // (climbed away: not this approach's gate)
  }
  if (g < 0) return null;
  const x = xs[g], rc = rwyCoords(x.n || 0, x.e || 0), vs = vsAt(xs, g), gp = gpOf(x);
  const spdDev = x.ias - vref;
  const el = {
    spd: { v: r1(x.ias), dev: r1(spdDev), pass: Math.abs(spdDev) <= TOL.spd },
    gp: { v: r1(gp), dev: r1(gp - 3), pass: Math.abs(gp - 3) <= TOL.gp },
    vs: { v: Math.round(vs), pass: vs <= -200 && vs >= -1000 },
    flap: { v: Math.round(x.flap || 0), pass: (x.flap || 0) >= flapMin },
    gear: opts.gearRequired ? { v: r1(x.gear == null ? 1 : x.gear), pass: (x.gear == null ? 1 : x.gear) >= 0.98 } : { v: null, pass: true },
    cross: { v: r1(rc.cross) },
  };
  return { t: x.t, agl: Math.round(aglFtOf(x)), along: Math.round(rc.along), ...el, stable: el.spd.pass && el.gp.pass && el.vs.pass && el.flap.pass && el.gear.pass };
}
// every real touchdown in the recording (an airborne→ground transition after having been properly up:
// at least 100 ft AGL since leaving the ground — a taxi bump or a bounce is not a landing; a bounce after
// a touchdown counts into that landing's `bounces`)
export function findLandings(xs, opts = {}) {
  const out = [];
  if (!xs || !xs.length) return out;
  let airMax = 0, wasAir = false;
  for (let i = 1; i < xs.length; i++) {
    const x = xs[i], air = !x.onGround && aglFtOf(x) > 20;
    if (air) { airMax = Math.max(airMax, aglFtOf(x)); wasAir = true; continue; }
    if (x.onGround && wasAir) {
      if (airMax > 100) {
        const rc = rwyCoords(x.n || 0, x.e || 0);
        // the float: from the last time the approach was at 50 ft AGL to the touchdown point
        let floatM = null;
        for (let j = i - 1; j >= 0; j--) { if (aglFtOf(xs[j]) >= 50) { floatM = Math.max(0, rc.along - rwyCoords(xs[j].n || 0, xs[j].e || 0).along); break; } if (xs[j].onGround) break; }
        // the sink at the contact: the height's slope over the last second BEFORE it (a centred window
        // would dilute it with the ground roll that follows)
        let j = i - 1; while (j > 0 && xs[i - 1].t - xs[j].t < 1.0) j--;
        const dtS = xs[i - 1].t - xs[j].t, sink = dtS > 0.2 ? (altFtOf(xs[j]) - altFtOf(xs[i - 1])) / dtS * 60 : -vsAt(xs, i - 1);
        out.push({ t: x.t, i, along: Math.round(rc.along), cross: r1(rc.cross), sinkFpm: Math.round(sink), ias: r1(x.ias), gs: r1(x.gs),
          floatM: floatM == null ? null : Math.round(floatM), devAim: Math.round(rc.along - AIM_ALONG), inZone: rc.along >= TD_ZONE.from && rc.along <= TD_ZONE.to,
          onRunway: rc.along >= 0 && rc.along <= RWY.len && Math.abs(rc.cross) <= RWY.wid / 2, bounces: 0, gate: gateAt(xs, i, opts) });
      }
      wasAir = false; airMax = 0;
    }
    if (x.onGround) airMax = 0;
  }
  // bounces: a brief airborne hop (never above 100 ft) right after a touchdown belongs to that landing
  for (let k = 0; k < out.length; k++) {
    let hops = 0, up = 0;
    for (let i = out[k].i + 1; i < xs.length && xs[i].t - out[k].t < 20; i++) {
      if (!xs[i].onGround) up = Math.max(up, aglFtOf(xs[i]));
      else if (up > 3) { hops++; up = 0; }
    }
    out[k].bounces = hops;
  }
  return out;
}

// ------------------------------------------------------------------ the whole recording
// opts: { vref (the approach speed of the aircraft flown), gearRequired, flapMinDeg }
export function analyzeRecording(rec, opts = {}) {
  const xs = rec && rec.samples;
  if (!xs || !xs.length) return null;
  const landings = findLandings(xs, opts);
  const maneuvers = findManeuvers(xs, opts);
  // the approach window of the last landing, scored as a maneuver (speed on the gate's own reference)
  if (landings.length) {
    const td = landings[landings.length - 1];
    const w = scoreWindow(xs, { name: '最終進入', t0: Math.max(0, td.t - 90), t1: td.t, targets: { spd: { v: opts.vref || 70, tol: TOL.spd }, gp: { v: 3, tol: TOL.gp }, cl: { v: 0, tol: TOL.cl } } });
    if (w) maneuvers.push(w);
  }
  const gate = landings.length ? landings[landings.length - 1].gate : gateAt(xs, xs.length - 1, opts);
  return { v: 1, samples: xs.length, dur: r1(xs[xs.length - 1].t - xs[0].t), maneuvers, landings, gate };
}

// the debrief's rows for an analysis (school-shaped result groups; appended to the card's detail only —
// the lesson's own rows, grade and pass are never rebuilt from these)
export function analysisRows(a) {
  if (!a) return [];
  const groups = [];
  if (a.maneuvers && a.maneuvers.length) groups.push({ step: '操縦標準（実技試験の公差）', rows: a.maneuvers.flatMap(m => m.rows.map(r => ({ ...r, name: `${m.name}：${r.name}` }))) });
  if (a.gate) {
    const g = a.gate;
    groups.push({ step: `安定進入ゲート（500 ft AGL）`, rows: [
      { name: '速度', val: `${g.spd.v} kt（基準速度との差 ${g.spd.dev >= 0 ? '+' : ''}${g.spd.dev} kt）`, std: '基準速度 ±10 kt', pass: g.spd.pass },
      { name: 'グライドパス', val: `${g.gp.v}°`, std: '3 ±0.9°', pass: g.gp.pass },
      { name: '降下率', val: `${g.vs.v} fpm`, std: '−200 〜 −1,000 fpm', pass: g.vs.pass },
      { name: '構成（フラップ）', val: `${g.flap.v}°`, std: '着陸フラップ', pass: g.flap.pass },
      ...(g.gear.v == null ? [] : [{ name: '構成（ギア）', val: g.gear.v >= 0.98 ? 'DOWN' : '未降下', std: 'DOWN', pass: g.gear.pass }]),
      { name: 'ゲート判定', val: g.stable ? 'STABLE（安定）' : 'UNSTABLE（不安定：ゴーアラウンド相当）', std: '全要素が基準内', pass: g.stable },
    ] });
  }
  if (a.landings && a.landings.length) groups.push({ step: '着陸分析', rows: a.landings.map((L, i) => ({
    name: `接地 ${i + 1}`, val: `滑走路端から ${L.along} m（目標点 ${AIM_ALONG} m との差 ${L.devAim >= 0 ? '+' : ''}${L.devAim} m）・沈下 ${L.sinkFpm} fpm・センターライン ${L.cross >= 0 ? '+' : ''}${L.cross} m・フロート ${L.floatM == null ? '—' : L.floatM + ' m'}${L.bounces ? `・バウンド ${L.bounces}` : ''}`,
    std: `接地帯 ${TD_ZONE.from}〜${TD_ZONE.to} m・沈下 300 fpm 以下`, pass: L.inZone && L.sinkFpm <= 300 })) });
  return groups;
}

// ------------------------------------------------------------------ the logbook's compact form + history
const num = (v, lo, hi) => (Number.isFinite(v) ? clamp(Math.round(v * 10) / 10, lo, hi) : null);
// what an entry keeps per lesson: the last landing and its gate, the maneuver scores' names and numbers
export function compactAnalysis(a) {
  if (!a) return null;
  const L = a.landings && a.landings.length ? a.landings[a.landings.length - 1] : null;
  const g = a.gate;
  return {
    td: L ? { along: num(L.along, -2000, 4000), cross: num(L.cross, -500, 500), sink: num(L.sinkFpm, -2000, 3000), float: L.floatM == null ? null : num(L.floatM, 0, 4000), zone: !!L.inZone } : null,
    gate: g ? { stable: !!g.stable, ias: num(g.spd.v, 0, 300), gp: num(g.gp.v, 0, 15), vs: num(g.vs.v, -3000, 1000) } : null,
    man: (a.maneuvers || []).slice(0, 6).map(m => ({ name: String(m.name || '').slice(0, 20), score: num(m.score, 0, 1) })),
  };
}
export function cleanAnalysis(a) {
  if (!a || typeof a !== 'object') return null;
  const tdRaw = a.td && typeof a.td === 'object' ? { along: num(a.td.along, -2000, 4000), cross: num(a.td.cross, -500, 500), sink: num(a.td.sink, -2000, 3000), float: a.td.float == null ? null : num(a.td.float, 0, 4000), zone: !!a.td.zone } : null;
  const td = tdRaw && (tdRaw.along != null || tdRaw.sink != null) ? tdRaw : null;   // (a touchdown with no number in it is not one)
  const gate = a.gate && typeof a.gate === 'object' ? { stable: !!a.gate.stable, ias: num(a.gate.ias, 0, 300), gp: num(a.gate.gp, 0, 15), vs: num(a.gate.vs, -3000, 1000) } : null;
  const man = Array.isArray(a.man) ? a.man.slice(0, 6).map(m => ({ name: String((m && m.name) || '').slice(0, 20), score: num(m && m.score, 0, 1) })).filter(m => m.name) : [];
  if (!td && !gate && !man.length) return null;
  return { td, gate, man };
}
// every recorded landing in a logbook (entries in order, lessons in order): the history the log page reads
export function landingHistory(entries) {
  const out = [];
  for (const e of entries || []) for (const l of (e && e.lessons) || []) if (l && l.ana && l.ana.td) out.push({ date: e.date || '', lesson: l.id || '', ...l.ana.td, gate: l.ana.gate || null });
  return out;
}
export function landingStats(list) {
  const xs = (list || []).filter(x => x && Number.isFinite(x.along));
  if (!xs.length) return null;
  const mean = (f) => xs.reduce((a, x) => a + f(x), 0) / xs.length;
  const alongMean = mean(x => x.along);
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x.along - alongMean) ** 2, 0) / xs.length);
  const gates = xs.filter(x => x.gate);
  return { n: xs.length, alongMean: Math.round(alongMean), alongSd: Math.round(sd), sinkMean: Math.round(mean(x => x.sink || 0)), sinkMax: Math.round(Math.max(...xs.map(x => x.sink || 0))),
    crossAbsMean: r1(mean(x => Math.abs(x.cross || 0))), floatMean: Math.round(mean(x => x.float || 0)), inZonePct: Math.round(xs.filter(x => x.zone).length / xs.length * 100),
    gateStablePct: gates.length ? Math.round(gates.filter(x => x.gate.stable).length / gates.length * 100) : null };
}
// a one-line trend graph (unicode blocks) of a value series, scaled to its own range
export function sparkline(values, { invert = false } = {}) {
  const vs = (values || []).filter(Number.isFinite);
  if (!vs.length) return '';
  const B = '▁▂▃▄▅▆▇█';
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi - lo < 1e-9) { lo -= 0.5; hi += 0.5; }
  return vs.map(v => B[clamp(Math.round((invert ? hi - v : v - lo) / (hi - lo) * 7), 0, 7)]).join('');
}
