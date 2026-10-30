// CADET — flight/sorajima.js : the flight model the game flies — 空島フライト's (Sorajima Flight's), as it is there.
// FLIGHT LAB's physics.js (itself carried over from Sorajima, then tuned for the lessons) is the frame: the world
// (LAB field, the ground, the lakes), the state the lessons read, the touchdown record, the runway checks, the same
// functions (FL.physics's API, so FLIGHT LAB's school grades flights flown on it). The Archer in it flies as in
// Sorajima: its aircraft data (phys) — but for the engine, FLIGHT LAB's (a static pull of 2,400 N and a fixed-pitch
// propeller's efficiency: about 700 fpm at Vy, as the real one, not Sorajima's 1,270; the thrust does not change how
// the keys move the nose: tools/feel/compare.mjs measures both and they agree within 0.2°) —, the rigging (no roll from the fin's side forces, FLIGHT LAB's v2.2 addition), the
// keyboard with the stick springing back (no bank hold), the gear's limit (6 m/s), the parts that must not touch
// checked within 30 m of the ground. The reference speeds the lessons teach (rotation, Vx, Vy, the approach) stay the
// published checklist's (FLIGHT LAB's). The Seminole is FLIGHT LAB's (Sorajima has none).
// installSorajima(FL): FL.physics becomes this model (FLIGHT LAB's own stays as FL.physicsLab); call it before
// anything takes FL.physics. FLIGHT LAB itself is not changed.
export function installSorajima(FL) {
  if (FL.physics && FL.physics.SORAJIMA) return FL.physics;
  FL.physicsLab = FL.physicsLab || FL.physics;
(function (FL) {
  'use strict';
  const DEG = Math.PI / 180, KT = 1.943844, FT = 3.28084, G = 9.81;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const wrap360 = a => ((a % 360) + 360) % 360;
  const wrap180 = a => ((a + 540) % 360) - 180;
  // ---------------------------------------------------------------- vectors and quaternions [x, y, z, w]
  const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const vscale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const vmadd = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
  const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const vlen = a => Math.hypot(a[0], a[1], a[2]);
  const vnorm = a => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const qmul = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  const qconj = q => [-q[0], -q[1], -q[2], q[3]];
  const qaxis = (ax, ang) => { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; };
  const qnorm = q => { const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; };
  function qrot(q, v) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
    return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
  }
  // orientation from heading (deg, clockwise from north = -z), pitch and bank (deg)
  function qFromHPB(hdg, pitch = 0, bank = 0) {
    let q = qaxis([0, 1, 0], -hdg * DEG);
    q = qmul(q, qaxis([1, 0, 0], pitch * DEG));
    q = qmul(q, qaxis([0, 0, 1], -bank * DEG));
    return q;
  }
  // ---------------------------------------------------------------- smooth noise (turbulence)
  function makeRng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const PERM = new Uint8Array(512);
  (() => { const r = makeRng(20240917), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; })();
  const GX = new Float32Array(16), GY = new Float32Array(16);
  for (let i = 0; i < 16; i++) { GX[i] = Math.cos(i * Math.PI / 8); GY[i] = Math.sin(i * Math.PI / 8); }
  function perlin(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), X = xi & 255, Y = yi & 255, xf = x - xi, yf = y - yi;
    const a = PERM[X + PERM[Y]] & 15, b = PERM[X + 1 + PERM[Y]] & 15, c = PERM[X + PERM[Y + 1]] & 15, d = PERM[X + 1 + PERM[Y + 1]] & 15;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const n00 = GX[a] * xf + GY[a] * yf, n10 = GX[b] * (xf - 1) + GY[b] * yf, n01 = GX[c] * xf + GY[c] * (yf - 1), n11 = GX[d] * (xf - 1) + GY[d] * (yf - 1);
    const x0 = n00 + u * (n10 - n00), x1 = n01 + u * (n11 - n01);
    return (x0 + v * (x1 - x0)) * 1.42;
  }

  // ---------------------------------------------------------------- the teaching world
  // A flat teaching ground 55 ft above sea level (about Sanford's elevation). Nothing here is Google's terrain.
  const GROUND_FT = 55, GROUND_M = GROUND_FT / FT;
  const MAGVAR_W = 6;                                  // teaching approximation (教材用近似); real charts give the current value
  // LAB RWY 36 (fictional): its threshold at n 0 / e −40,000 m, true heading 354 (magnetic 360), 1,200 m × 30 m
  const LAB_RWY = { id: 'LAB RWY 36', n: 0, e: -40000, trueHdg: 354, len: 1200, wid: 30, elevFt: GROUND_FT };
  function rwyCoords(rwy, n, e) { const h = rwy.trueHdg * DEG, dn = n - rwy.n, de = e - rwy.e; return { along: dn * Math.cos(h) + de * Math.sin(h), cross: -dn * Math.sin(h) + de * Math.cos(h) }; }
  function rwyToNE(rwy, along, cross) { const h = rwy.trueHdg * DEG; return [rwy.n + along * Math.cos(h) - cross * Math.sin(h), rwy.e + along * Math.sin(h) + cross * Math.cos(h)]; }
  function onRunway(rwy, n, e, margin = 0) { const c = rwyCoords(rwy, n, e); return c.along >= -margin && c.along <= rwy.len + margin && Math.abs(c.cross) <= rwy.wid / 2 + margin; }
  // the paved surfaces around the runway (taxiway, connectors, apron): the same shapes the scene draws
  const PAVED = [[-40, LAB_RWY.len + 40, -15, 15, 'rwy'], [-10, LAB_RWY.len + 10, 95, 110, 'twy'], [10, 25, 15, 95, 'twy'], [600, 615, 15, 95, 'twy'], [LAB_RWY.len - 25, LAB_RWY.len - 10, 15, 95, 'twy'], [450, 750, 110, 230, 'apron']];
  function pavedAt(n, e) { const c = rwyCoords(LAB_RWY, n, e); for (const p of PAVED) if (c.along >= p[0] && c.along <= p[1] && c.cross >= p[2] && c.cross <= p[3]) return p[4]; return null; }
  // lakes (n, e, radius m, shape seed): water for the wheels too (the scene paints the same outlines)
  const LAKES = [[6000, -36500, 700, 1], [12500, -26000, 900, 2.3], [-9000, -27000, 600, 4], [-19000, -41000, 1100, 0.5], [2500, -47000, 500, 5.1], [-3500, -30500, 450, 2.9], [20000, -33000, 1300, 3.7], [9000, -18000, 800, 1.7]];
  function inLake(n, e) {
    for (const L of LAKES) {
      const dn = n - L[0], de = e - L[1], d = Math.hypot(dn, de); if (d > L[2] * 1.3) continue;
      const a = Math.atan2(dn, de), rr = L[2] * (1 + 0.16 * Math.sin(a * 3 + L[3]) + 0.08 * Math.sin(a * 7 + L[3] * 2));
      if (d < rr) return true;
    }
    return false;
  }
  // the ground under a world point (x east, z south)
  function groundAt(x, z) { const n = -z, e = x, p = pavedAt(n, e); return { h: GROUND_M, n: [0, 1, 0], paved: !!p, kind: p, water: !p && inLake(n, e) }; }

  // ---------------------------------------------------------------- the aircraft (geometry and reference data)
  const FLAP_DEG = [0, 10, 20, 30];       // the model's flap travel; each aircraft names its own detents (flapLabels)
  const AIRCRAFT = [
    {
      id: 'pa28', name: 'Piper PA-28-181 Archer（教材モデル）', short: 'Archer', kind: '低翼の単発練習機', engines1: 1,
      desc: '翼が胴体の下にある 4 人乗りの単発機。水平尾翼は全体が動く「スタビレーター」。180 馬力・固定ピッチプロペラ。ANA の公開情報で基礎訓練の最初に使うとされる機種で、訓練機は G1000 搭載（Acron Aviation の公開機材一覧）。',
      fuse: [[-3.25, 0.30, 0.30, 0.02], [-3.05, 0.43, 0.42, 0.02], [-2.5, 0.55, 0.54, 0.04], [-1.5, 0.60, 0.62, 0.06], [-0.5, 0.60, 0.64, 0.08],
        [0.6, 0.53, 0.57, 0.10], [1.7, 0.38, 0.44, 0.16], [2.8, 0.22, 0.30, 0.24], [3.75, 0.09, 0.17, 0.30], [4.0, 0.03, 0.07, 0.32]],
      wing: { y: -0.45, dih: 7, rootX: 0.55, tipX: 5.4, rootLE: -1.0, rootC: 1.6, tipLE: -0.85, tipC: 1.2, t0: 0.15, t1: 0.12, hinge: 0.74, flap: [0.6, 2.6], ail: [2.8, 5.2] },
      hstab: { y: 0.25, span: 2.0, rootLE: 3.05, tipLE: 3.05, te: 3.8, hinge: 3.05, t: 0.09 },
      vstab: { y0: 0.25, y1: 1.5, rootLE: 2.35, topLE: 3.2, te: 3.95, hinge: 3.55, t: 0.1 },
      engines: [{ type: 'nose', z: -3.34, y: 0.02, r: 0.94, blades: 2 }],
      gear: { fixed: true, wheelR: 0.25, nose: [0, -1.15, -2.3], mains: [[1.6, -1.15, 0.25]] },
      eye: [-0.3, 0.62, -0.4], flapLabels: ['UP', '10°', '25°', '40°'], fuelCap: 24, carb: true,   // (the O-360 is carburetted; the Seminole's engines are injected)
      phys: {
        mass: 1050, S: 15.8, b: 10.8, c: 1.6, L: 7.25, CL0: 0.28, CLa: 4.8, aStall: 0.28, CD0: 0.032, K: 0.05, CDgear: 0,
        Cm0: 0.015, Cma: -1.1, Cmde: 0.34, Cmq: -15, Clda: 0.055, Clp: -0.5, Clb: -0.12, Cnb: 0.1, Cndr: 0.03, Cnr: -0.14, CYb: -0.6,
        flapCL: 0.75, flapStall: 0.045, flapCD: 0.7, engine: { type: 'prop', P: 134000, T0: 2400, eta: 0.85, etaK: 0.8 }, maxG: 3.8, rollRate: 55, pitchRate: 12,
      },
      sora: true,                                   // (Sorajima's Archer: its phys above, and its formulas below)
      // reference speeds (KIAS). Rotation, climb, Vx / Vy, glide, final approach, go-around, Va, Vfe, the crosswind: the published
      // Archer III G1000 training checklist (MGA 2025); Vso / Vs1, Vno, Vne: teaching values (機体ごとに要確認, the POH governs)
      v: { s0: 45, s1: 50, rotate: 60, x: 64, y: 76, climb: 87, glide: 76, glideLand: 66, appr: 70, apprShort: 65, ga: 64, va: 113, fe: 102, no: 125, ne: 154, xwind: 17,
        apprFlaps: 3, apprThr: 0.3, cruise: 115, cruiseThr: 0.84, toFlaps: 0, descMax: 122 },   // (cruise 115 kt: Sorajima's — the stick's travel is scaled from it)
    },
    {
      id: 'pa44', name: 'Piper PA-44-180 Seminole（教材モデル）', short: 'Seminole', kind: '低翼の双発練習機・T 字尾翼', engines1: 2, twin: true, counterRotating: true, cs: true,
      desc: '180 馬力のエンジン 2 基、左右逆回転（counter-rotating）のプロペラ、引き込み脚、T 字尾翼。ANA の公開情報で、片発停止や故障の対応を訓練するとされる機種（Acron Aviation の公開機材一覧では G1000）。',
      fuse: [[-3.3, 0.30, 0.30, 0.02], [-3.1, 0.44, 0.43, 0.02], [-2.5, 0.58, 0.56, 0.04], [-1.5, 0.62, 0.66, 0.06], [-0.5, 0.62, 0.68, 0.08],
        [0.6, 0.56, 0.62, 0.10], [1.8, 0.42, 0.48, 0.16], [3.0, 0.26, 0.34, 0.26], [4.3, 0.12, 0.22, 0.36], [5.1, 0.04, 0.10, 0.42]],
      wing: { y: -0.45, dih: 7, rootX: 0.6, tipX: 5.88, rootLE: -1.0, rootC: 1.75, tipLE: -0.75, tipC: 1.25, t0: 0.15, t1: 0.12, hinge: 0.74, flap: [0.6, 3.2], ail: [3.4, 5.6] },
      hstab: { y: 1.95, span: 2.0, rootLE: 4.3, tipLE: 4.5, te: 5.1, hinge: 4.4, t: 0.09 },
      vstab: { y0: 0.3, y1: 1.95, rootLE: 3.4, topLE: 4.3, te: 5.2, hinge: 4.7, t: 0.1 },
      engines: [{ type: 'wing', x: 1.95, y: -0.35, z: -2.1, r: 0.94, blades: 2 }],
      gear: { fixed: false, wheelR: 0.27, nose: [0, -1.2, -2.5], mains: [[1.6, -1.2, 0.3]] },
      eye: [-0.3, 0.58, -0.6], flapLabels: ['UP', '10°', '25°', '40°'], fuelCap: 54,
      phys: {
        mass: 1650, S: 17.08, b: 11.77, c: 1.6, L: 8.41, CL0: 0.32, CLa: 4.8, aStall: 0.29, CD0: 0.028, K: 0.05, CDgear: 0.022,
        Cm0: 0.01, Cma: -1.1, Cmde: 0.32, Cmq: -16, Clda: 0.055, Clp: -0.5, Clb: -0.1, Cnb: 0.11, Cndr: 0.045, Cnr: -0.14, CYb: -0.6,
        flapCL: 0.55, flapStall: 0.045, flapCD: 0.7, engine: { type: 'prop', P: 268000, T0: 5200, eta: 0.82, etaK: 0.45 }, maxG: 3.8, rollRate: 50, pitchRate: 11,
      },
      // reference speeds (KIAS) from a published PA-44 maneuver guide (Southeastern Oklahoma State Univ.): Vso 55, Vs 57, Vmc 56 (red line),
      // Vr 75, Vx 82, Vy 88, Vxse 88, Vsse 82, Vyse 88 (blue line), Vfe 111, Vlo 109 / 140, Vle 140, Vno 169, Vne 202, Va 135
      v: { s0: 55, s1: 57, mc: 56, rotate: 75, x: 82, y: 88, xse: 88, sse: 82, yse: 88, glide: 88, appr: 88, apprFull: 80, ga: 88, va: 135, fe: 111, lo: 109, le: 140, no: 169, ne: 202, xwind: 17,
        apprFlaps: 2, apprThr: 0.3, cruise: 140, cruiseThr: 0.75, toFlaps: 0, climb: 105 },
    },
  ];

  // ---------------------------------------------------------------- geometry helpers
  function fuseAt(F, z) {
    for (let i = 0; i < F.length - 1; i++) { const a = F[i], b = F[i + 1]; if (z <= b[0]) { const t = clamp((z - a[0]) / (b[0] - a[0]), 0, 1); return a.map((v, k) => lerp(v, b[k], t)); } }
    return F[F.length - 1];
  }
  function wingFns(w) {
    const span = w.tipX - w.rootX, f = ax => clamp((ax - w.rootX) / span, 0, 1);
    return { y: ax => w.y + (ax - w.rootX) * Math.tan(w.dih * DEG), c: ax => lerp(w.rootC, w.tipC, f(ax)), le: ax => lerp(w.rootLE, w.tipLE, f(ax)), t: ax => lerp(w.t0, w.t1, f(ax)) };
  }

  // ---------------------------------------------------------------- blade-element aerodynamics (from Sorajima, unchanged)
  const EL_N = 8;
  function buildElements(A, P) {
    const W = wingFns(A.wing), w = A.wing, hs = A.hstab, vs = A.vstab, pcs = [];
    const Gd = w.dih * DEG, fwd = [0, 0, -1];
    let area = 0, flapS = 0;
    for (const side of [-1, 1]) for (let i = 0; i < EL_N; i++) {
      const x0 = w.tipX * i / EL_N, x1 = w.tipX * (i + 1) / EL_N, xc = (x0 + x1) / 2, xa = Math.max(xc, w.rootX);
      const c = W.c(xa), s = vnorm([1, side * Math.tan(Gd), 0]);
      const p = { kind: 0, side, S: c * (x1 - x0), r: [side * xc, W.y(xa), W.le(xa) + 0.25 * c], s, n: vnorm(vcross(s, fwd)),
        flap: !!(w.flap && xc >= w.flap[0] && xc <= w.flap[1]), ail: xc >= w.ail[0] - 0.2 && xc <= w.ail[1] ? side : 0, span01: xc / w.tipX };
      pcs.push(p); area += p.S;
    }
    for (const p of pcs) { p.S *= P.S / area; if (p.flap) flapS += p.S; }
    const hle = x => lerp(hs.rootLE, hs.tipLE, x / hs.span);
    for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
      const xc = hs.span * (i + 0.5) / 2, c = Math.max(hs.te - hle(xc), 0.2);
      pcs.push({ kind: 1, side, S: c * hs.span / 2, r: [side * xc, hs.y, hle(xc) + 0.25 * c], s: [1, 0, 0], n: [0, 1, 0], wash: i ? 0.6 : 1 });
    }
    const fle = y => lerp(vs.rootLE, vs.topLE, (y - vs.y0) / (vs.y1 - vs.y0));
    for (let i = 0; i < 2; i++) {
      const dy = (vs.y1 - vs.y0) / 2, yc = vs.y0 + dy * (i + 0.5), c = Math.max(vs.te - fle(yc), 0.2);
      pcs.push({ kind: 2, side: 0, S: c * dy, r: [0, yc, fle(yc) + 0.25 * c], s: [0, 1, 0], n: [-1, 0, 0], wash: i ? 0.5 : 1 });
    }
    const E = { pcs, flapK: flapS > 0 ? P.S / flapS : 0, dCmF: 0, at: 3.5, af: 3, it: 0, deps: 0.35, ke: 1, ka: 1, kr: 1, gdi: 0, dCma: 0, dCmq: 0, dClp: 0, dClr: 0, dCnr: 0, dCnp: 0, dCnda: 0, dCY: 0 };
    // tune the pieces to the reference derivatives, at cruise speed in still air
    const Vc = A.v.cruise / KT, rho = 1.225, q = 0.5 * rho * Vc * Vc, hv = 0.25 * rho * Vc;
    const a0 = (P.mass * G / (q * P.S) - P.CL0) / P.CLa;
    const vAt = (a, b = 0) => [Vc * Math.sin(b), -Vc * Math.sin(a) * Math.cos(b), -Vc * Math.cos(a) * Math.cos(b)];
    const run = (o = {}) => aeroElements(E, P, o.vb || vAt(o.a ?? a0, o.b || 0), o.w || [0, 0, 0], rho, { flapF: 0, elev: o.elev || 0, ail: o.ail || 0, rud: o.rud || 0, dq: 0 });
    const d = (f, h) => (f(h) - f(-h)) / (2 * h);
    const Mx = o => run(o).M[0], Lroll = o => -run(o).M[2], Nyaw = o => -run(o).M[1];
    const qSc = q * P.S * P.c, qSb = q * P.S * P.b;
    const slope = at => { E.at = at; return d(h => Mx({ a: a0 + h }), 0.01); };
    const s0 = slope(0), s1 = slope(1);
    let at = (P.Cma * Math.cos(a0) * qSc - s0) / (s1 - s0);
    at = clamp(Number.isFinite(at) ? at : 3.5, 0.5, 14); E.at = at;
    E.dCma = P.Cma - slope(at) / (qSc * Math.cos(a0));
    E.it = 0; const m0 = Mx({ a: 0 }); E.it = 0.01; const m1 = Mx({ a: 0 }); E.it = -m0 * 0.01 / (m1 - m0);
    E.ke = 1; E.ke = P.Cmde * qSc / d(h => Mx({ elev: h }), 0.05);
    E.dCmF = 0; { const mm0 = run({}).M[0], mm1 = aeroElements(E, P, vAt(a0), [0, 0, 0], rho, { flapF: 1, elev: 0, ail: 0, rud: 0, dq: 0 }).M[0]; E.dCmF = w.flap ? -(mm1 - mm0) / qSc : 0; }
    E.dCmq = P.Cmq - d(h => Mx({ w: [h, 0, 0] }), 0.02) / (hv * P.S * P.c * P.c);
    E.ka = 1; E.ka = P.Clda * qSb / d(h => Lroll({ ail: h }), 0.05);
    const nb = af => { E.af = af; return d(h => Nyaw({ b: h }), 0.01); };
    const n0 = nb(0), n1 = nb(1); E.af = clamp((P.Cnb * qSb - n0) / (n1 - n0), 0.3, 14);
    E.kr = 1; E.kr = P.Cndr * qSb / d(h => Nyaw({ rud: h }), 0.05);
    const lb = gdi => { E.gdi = gdi; return d(h => Lroll({ b: h }), 0.01); };
    const l0 = lb(0), l1 = lb(1); E.gdi = (P.Clb * qSb - l0) / (l1 - l0);
    E.dClp = P.Clp - d(h => Lroll({ w: [0, 0, -h] }), 0.02) / (hv * P.S * P.b * P.b);
    E.dClr = (P.Clr || 0) - d(h => Lroll({ w: [0, -h, 0] }), 0.02) / (hv * P.S * P.b * P.b);
    E.dCnr = P.Cnr - d(h => Nyaw({ w: [0, -h, 0] }), 0.02) / (hv * P.S * P.b * P.b);
    E.dCnp = (P.Cnp || 0) - d(h => Nyaw({ w: [0, 0, -h] }), 0.02) / (hv * P.S * P.b * P.b);
    E.dCnda = (P.Cnda || 0) - d(h => Nyaw({ ail: h }), 0.05) / qSb;
    E.dCY = P.CYb - d(h => run({ b: h }).F[0], 0.01) / (q * P.S);
    // a side force on the fin turns the nose and, as the fin is above the CG, rolls too: roll / yaw = -height / arm
    { let sy = 0, sz = 0, sa = 0; for (const p of pcs) if (p.kind === 2) { sy += p.r[1] * p.S; sz += p.r[2] * p.S; sa += p.S; } E.finYZ = sa ? sy / Math.max(sz, 0.5) : 0; }
    return E;
  }
  // forces (body frame) and moments about the CG from every piece. o: flapF, elev, ail, rud, dq (slipstream on the tail), hgt(p), gust(p)
  function aeroElements(E, P, vb, w, rho, o) {
    const F = [0, 0, 0], M = [0, 0, 0];
    const V = Math.hypot(vb[0], vb[1], vb[2]) || 1, sb = vb[0] / V;
    let clw = 0, stw = 0, eps = 0;
    // (the downwash weakens in ground effect: near the ground the wing bends the air less, so the tail
    // flies at a different angle than it does upstairs — the pitch change pilots feel in the flare. The
    // tuning runs pass no height and keep the free-air value. The share is small on purpose: the model's
    // trim was tuned in free air, and the textbook-size reduction (~40% at the surface) pitches the nose
    // down through the flare harder than the airframe answers — the landing ladder measured 476 fpm and
    // a nose-wheel touchdown at full share, a bounce at 15%, clean at this 7%)
    let geEps = 1;
    if (o.hgt) { const tp = E.pcs.find(p => p.kind === 1); if (tp) { const hh = Math.max(o.hgt(tp), 0.3) / P.b, gg = (16 * hh * hh) / (1 + 16 * hh * hh); geEps = 0.93 + 0.07 * gg; } }
    const aS0 = P.aStall - P.flapStall * o.flapF;
    for (let pass = 0; pass < 2; pass++) for (let pi = 0; pi < E.pcs.length; pi++) { const p = E.pcs[pi];
      if ((p.kind === 0) !== (pass === 0)) continue;              // wing first: its lift sets the downwash on the tail
      const r = p.r;
      let vx = vb[0] + w[1] * r[2] - w[2] * r[1], vy = vb[1] + w[2] * r[0] - w[0] * r[2], vz = vb[2] + w[0] * r[1] - w[1] * r[0];
      if (o.gust) { const gg = o.gust(p); vx -= gg[0]; vy -= gg[1]; vz -= gg[2]; }
      const s = p.s, n = p.n, vs = vx * s[0] + vy * s[1] + vz * s[2];
      const px = vx - vs * s[0], py = vy - vs * s[1], pz = vz - vs * s[2], Vp = Math.hypot(px, py, pz);
      if (Vp < 0.5) continue;
      let a = Math.atan2(-(px * n[0] + py * n[1] + pz * n[2]), -pz);
      const qd = 0.5 * rho * Vp * Vp;
      let slope, cl0 = 0, dcl = 0, aS, cdi, ge = 1;
      if (p.kind === 0) {
        a += p.side * E.gdi * sb;                                   // effective dihedral
        if (o.hgt) { const h = Math.max(o.hgt(p), 0.3) / P.b; ge = (16 * h * h) / (1 + 16 * h * h); }
        slope = P.CLa * (1 + 0.06 * (1 - ge));
        cl0 = P.CL0 + (p.flap ? P.flapCL * o.flapF * E.flapK : 0);
        dcl = p.ail ? E.ka * o.ail * p.ail : 0;
        aS = aS0 + 0.03 * p.span01;                                 // washout: the root stalls first, the ailerons keep working
        cdi = P.K * ge;
      } else if (p.kind === 1) { a += E.it - eps; slope = E.at; dcl = E.ke * o.elev; aS = 0.32; cdi = 0.09; }
      else { slope = E.af; dcl = E.kr * o.rud; aS = 0.36; cdi = 0.09; }
      const over = Math.max(a - aS, -aS - 0.06 - a);
      let st = smoothstep(0, 0.07, over);
      // (the stall's memory, when the caller keeps it (o.stH, the flight only — the tuning runs stay pure):
      // separated flow lets go quickly and reattaches slowly, so the blend the piece flies with lags the
      // angle — a recovery has to hold the nose down a moment, not just touch it)
      if (o.stH) { const cur = o.stH[pi] || 0, tau = st > cur ? 0.06 : 0.4; st = o.stH[pi] = cur + (st - cur) * Math.min(1, (o.dt || 0) / tau); }
      const lin = cl0 + slope * a + dcl * (1 - 0.5 * st);
      const CL = lerp(lin, 1.15 * Math.sin(2 * a), st), sa = Math.sin(a);
      const CD = cdi * lin * lin * (1 - st) + st * 1.25 * sa * sa;
      const lx = s[1] * pz - s[2] * py, ly = s[2] * px - s[0] * pz, lz = s[0] * py - s[1] * px;
      const ll = Math.hypot(lx, ly, lz) || 1, k = qd * p.S;
      const cx = p.kind ? o.dq * p.wash * p.S * dcl * (1 - 0.5 * st) : 0;     // slipstream over the tail (taxiing, low speed)
      const fx = k * (CL * lx / ll - CD * px / Vp) + cx * lx / ll, fy = k * (CL * ly / ll - CD * py / Vp) + cx * ly / ll, fz = k * (CL * lz / ll - CD * pz / Vp) + cx * lz / ll;
      if (p.kind === 1) { F[0] -= k * CD * px / Vp; F[1] -= k * CD * py / Vp; F[2] -= k * CD * pz / Vp; }   // (the tailplane's lift is in the reference lift curve)
      else { F[0] += fx; F[1] += fy; F[2] += fz; }
      M[0] += (p.kind === 0 ? 0 : r[1]) * fz - r[2] * fy; M[1] += r[2] * fx - r[0] * fz; M[2] += r[0] * fy - r[1] * fx;
      p.cl = CL; p.st = st; p.a = a;
      if (p.kind === 0) { clw += CL * p.S; stw += st * p.S; }
      if (pass === 0) eps = E.deps * (clw / P.S) / P.CLa * geEps;
    }
    return { F, M, CLw: clw / P.S, stallW: stw / P.S };
  }

  // the derived aircraft: inertia, wheels, the points that must not touch the ground, the propeller's arms, the pieces
  function deriveAircraft(A, mass, load) {
    const P = { ...A.phys, mass: mass || A.phys.mass }, m = P.mass;
    // (the load's centre of gravity moves the longitudinal stability, not only the trim: the static margin is
    // the distance from the CG to the neutral point and Cma = −CLa × that margin, so a CG behind the standard
    // load's shrinks Cma (less stable in pitch, the lesson the W&B page teaches) and one ahead of it grows it,
    // by CLa per mean chord of travel; the trim follows the CG by the nudge applyLoading always applied. The
    // spread of the load about its CG (load.spreadIn, inches) likewise stretches the pitch/yaw inertia a
    // little — mass carried far aft is harder to pitch. No load, or the standard load, changes nothing at all.)
    if (load && Number.isFinite(load.cgIn)) {
      const dIn = load.cgIn - refCgOf(A);
      P.Cma = A.phys.Cma + A.phys.CLa * dIn / (P.c / 0.0254);
      P.Cm0 = A.phys.Cm0 + clamp(dIn * 0.0025, -0.015, 0.015);
    }
    let iMul = 1;
    if (load && Number.isFinite(load.spreadIn)) { const rs = refSpreadOf(A); if (rs > 0) iMul = clamp(0.7 + 0.3 * (load.spreadIn * load.spreadIn) / (rs * rs), 0.9, 1.35); }
    const I = [m * (0.18 * P.L) ** 2 * iMul, m * (0.19 * (P.L + P.b) / 2) ** 2, m * (0.12 * P.b) ** 2 * iMul];
    const wr = A.gear.wheelR, bottom = A.gear.nose[1] - wr, zn = A.gear.nose[2], zm = A.gear.mains[0][2];
    const Fn = m * G * zm / (zm - zn), Fm = m * G * -zn / (zm - zn) / (A.gear.mains.length * 2);
    const defl = clamp(wr * 0.38, 0.05, 0.22);
    const spring = load => { const k = load / defl; return { k, c: 2 * 0.65 * Math.sqrt(k * load / G) }; };
    const wheels = [{ off: [0, bottom, zn], ...spring(Math.max(Fn, m * G * 0.35)), nose: true }];
    for (const mm of A.gear.mains) for (const s of [-1, 1]) wheels.push({ off: [s * mm[0], bottom, mm[2]], ...spring(Fm) });
    const F = A.fuse, zTail = F[F.length - 1][0], tailSt = fuseAt(F, zTail - (zTail - F[0][0]) * 0.1);
    const W = wingFns(A.wing), hs = A.hstab, vs = A.vstab;
    const hard = [
      { off: [0, F[0][3], F[0][0] - (A.engines[0].type === 'nose' ? 0.4 : 0)], name: '機首' },
      { off: [-A.wing.tipX, W.y(A.wing.tipX), W.le(A.wing.tipX) + W.c(A.wing.tipX) * 0.4], name: '左の翼端' },
      { off: [A.wing.tipX, W.y(A.wing.tipX), W.le(A.wing.tipX) + W.c(A.wing.tipX) * 0.4], name: '右の翼端' },
      { off: [0, vs.y1, vs.topLE + 0.2], name: '垂直尾翼' },
      { off: [-hs.span, hs.y, (hs.tipLE + hs.te) / 2], name: '水平尾翼' }, { off: [hs.span, hs.y, (hs.tipLE + hs.te) / 2], name: '水平尾翼' },
    ];
    for (const s of [-1, 1]) { const x = A.wing.tipX * 0.55; hard.push({ off: [s * x, W.y(x) - W.t(x) * W.c(x) * 0.3, W.le(x) + W.c(x) * 0.4], name: s < 0 ? '左翼' : '右翼' }); }
    for (const z of [F[0][0] * 0.45, F[F.length - 1][0] * 0.3]) { const f = fuseAt(F, z); hard.push({ off: [0, f[3] - f[2], z], name: '胴体下面' }); }
    if (A.sora) { const zc = A.eye[2], f = fuseAt(F, zc); hard.push({ off: [0, f[3] + f[2], zc], name: '機体の上面' }); }
    for (const e of A.engines) {
      if (e.type === 'nose') hard.push({ off: [0, e.y - e.r, e.z], name: 'プロペラ' });
      if (e.type === 'wing') for (const s of [-1, 1]) hard.push({ off: [s * e.x, e.y - e.r, e.z], name: 'プロペラ' });
    }
    // the propeller: design speed (fixed pitch) and the fin offset that cancels the left-turning tendencies at cruise
    const Eng = P.engine, pr = {};
    const Vc = A.v.cruise / KT, qc = 0.5 * 1.225 * Vc * Vc, CLc = m * G / (qc * P.S), ac = (CLc - P.CL0) / P.CLa;
    const Tc = (P.CD0 + (P.CDgear || 0) * (A.gear.fixed ? 1 : 0) + P.K * CLc * CLc) * qc * P.S;
    pr.Vd = Vc * 1.2; pr.a0 = 0.012 * P.b; pr.a1 = 0.15 * P.b;
    pr.fin = A.counterRotating ? 0 : Tc * (pr.a0 + pr.a1 * ac) / qc;
    if (A.counterRotating) { pr.a0 = 0; pr.a1 = 0; }          // (counter-rotating propellers: the left-turning tendencies cancel)
    pr.Ip = 2.5 * Eng.P / 92000 / (A.engines1 || 1); pr.tq = A.counterRotating ? 0 : 0.12 * Math.min(1, 92000 / Eng.P);
    const thrC = A.v.cruiseThr || 0.65, omC = rpmFor(A, thrC, Vc) * Math.PI / 30;
    const ac2 = { ...P, I, prop: pr, Cnda: P.Cnda ?? -0.1 * P.Clda, Cnp: P.Cnp ?? -0.04, Clr: P.Clr ?? 0.06 };
    ac2.el = buildElements(A, ac2);
    // rigging (wing and aileron rig): at cruise power and speed the engine torque and the roll of the fin's side
    // forces (the slipstream on the fin, the fin offset) cancel, so the airplane flies straight hands off at cruise
    const finRollC = A.sora ? 0 : -ac2.el.finYZ * (-Tc * pr.a0 + pr.fin * qc);
    pr.rig = ((0.04 + 0.96 * thrC) * Eng.P / 0.85 / omC * pr.tq - finRollC) / qc;
    return { AC: ac2, WHEELS: wheels, WHEEL_BOTTOM: bottom, HARDPTS: hard, TAILSKID: { off: [0, tailSt[3] - tailSt[2], zTail - (zTail - F[0][0]) * 0.1], k: 30 * m, c: 4 * m } };
  }

  // ---------------------------------------------------------------- atmosphere, propeller rpm, wind
  function atmos(h, dev = 0) {
    h = Math.max(h, -500);
    let Ts, p;
    if (h < 11000) { Ts = 288.15 - 0.0065 * h; p = 101325 * Math.pow(Ts / 288.15, 5.25588); } else { Ts = 216.65; p = 22632.1 * Math.exp(-(h - 11000) / 6341.62); }
    const T = Ts + dev, rho = p / (287.05 * T);
    return { T, p, rho, a: Math.sqrt(1.4 * 287.05 * T), sigma: rho / 1.225 };
  }
  // fixed-pitch propeller rpm (grows with power and airspeed); constant-speed: held near the governor's setting
  function rpmFor(A, thr, u, pw = 1, dead = false) {
    if (dead) return clamp(14 * u, 0, 1300);
    if (A && A.cs) return 2250 + 450 * Math.sqrt(Math.max(thr, 0));
    return Math.min(650 + 1650 * Math.sqrt(Math.max(thr, 0)) * Math.pow(Math.max(pw, 0.1), 0.3) + 6 * Math.max(u, 0), 2850);
  }
  function windGradient(agl) { const h = clamp(agl, 1, 400); return clamp(Math.log(h / 0.03) / Math.log(10 / 0.03), 0.55, 1.35); }
  // s.wind: { fromDeg (true), kt, gust (turbulence scale: 0.4 still, 1 normal, 2–5 gusty) }
  // (a wind field with a top (topFrom / topKt at topFt AGL — a day's winds aloft) blends from the surface wind
  // to the top wind between the ground and topFt instead of the log profile: the two given winds are the profile)
  function windAt(s, t, agl) {
    const W = s.wind || { fromDeg: 0, kt: 0, gust: 0.4 }, k = W.gust ?? 1;
    const gust = Math.min(1, Math.max(agl, 0) / 300 + 0.4) * k;
    let from = W.fromDeg * DEG, sp = W.kt / KT, wg = windGradient(agl);
    if (W.topKt != null && W.topFt > 0) {
      const f = clamp(agl / (W.topFt / FT), 0, 1);
      let d = (W.topFrom - W.fromDeg) % 360; if (d > 180) d -= 360; else if (d < -180) d += 360;
      from = (W.fromDeg + d * f) * DEG; sp = (W.kt + (W.topKt - W.kt) * f) / KT; wg = 1;
    }
    const w = [-Math.sin(from) * sp, 0, Math.cos(from) * sp];
    return [w[0] * wg + perlin(t * 0.35, 1.7) * 1.4 * gust, perlin(t * 0.5, 4.4) * 0.5 * gust, w[2] * wg + perlin(t * 0.31, 8.2) * 1.1 * gust];
  }

  // the thrust of one engine (N): the static pull at low speed, then the shaft power through the propeller, whose
  // efficiency grows with airspeed up to about 0.85 near its design speed (a fixed-pitch climb propeller is far less
  // efficient at climb speed than in cruise). th: throttle 0..1, V: forward speed m/s, pw: power left at this density.
  function propThrust(P, th, V, pw, nE = 1) {
    if (!P.engine.eta) {                                      // (Sorajima: the efficiency (V / Vd)^0.35, no cap below 1)
      const ua = Math.max(V, 1), eta = Math.pow(Math.min(1, ua / P.prop.Vd), 0.35);
      return (0.04 + 0.96 * th) * pw * Math.min(P.engine.T0 / nE * (1 - 0.25 * Math.min(Math.max(V, 0) / P.prop.Vd, 1)), eta * P.engine.P / nE / ua);
    }
    const ua = Math.max(V, 1), eta = P.engine.eta * Math.pow(Math.min(1, ua / P.prop.Vd), P.engine.etaK);
    return (0.04 + 0.96 * th) * pw * Math.min(P.engine.T0 / nE * (1 - 0.25 * Math.min(V / P.prop.Vd, 1)), eta * P.engine.P / nE / ua);
  }
  // ---------------------------------------------------------------- trim and the steady states the instructor quotes
  const TRIM_MAX = 0.45;
  // the powerplant model's constants: the fuel left in the lines when the feed runs dry or is shut off (seconds of
  // running), and the mixture lever's idle cut-off detent (at or below it, no fuel is metered at all)
  const LINE_FUEL_S = 6, MIX_CUT = 0.12;
  function trimFor(s, V, flapF, n = 1, rho = 1.225) {
    const AC = s.AC, qd = 0.5 * rho * V * V, cl0 = AC.CL0 + AC.flapCL * flapF;
    const alpha = (n * AC.mass * G / (qd * AC.S) - cl0) / AC.CLa;
    return { alpha, elev: clamp((-AC.Cma * Math.sin(alpha) - AC.Cm0) / AC.Cmde, -1, 1) };
  }
  // the T key: the trim that holds 1 g at the present speed with the stick let go
  function trimLevel(s) {
    const flapF = s.A.wing.flap ? s.flapDeg / 30 : 0, rho = s.rho || atmos(s.pos[1]).rho;
    const a1 = trimFor(s, Math.max(s.tas || 0, 20), flapF, 1, rho).alpha;
    return clamp(s.elev + s.trim + s.AC.Cma / s.AC.Cmde * (s.alpha - a1), -TRIM_MAX, TRIM_MAX);
  }
  // attitude and power for a steady state (speed kt, climb fpm, or full / idle / dead engine), from the model's own equations:
  // what a real instructor quotes as the starting attitude and power ("pitch + power = performance")
  function steadyState(s, kt, fpm, o = {}) {
    const P = s.AC, A = s.A, atm = atmos((o.altFt ?? 3000) / FT, o.oatDev ?? s.oatDev ?? 0), W = P.mass * G;   // (the day's air, as flown: the instructor's numbers breathe the same density the flight does)
    const flapF = A.wing.flap ? FLAP_DEG[o.flaps || 0] / 30 : 0, gear = A.gear.fixed ? 1 : (o.gear ? 1 : 0);
    const V = kt / KT / Math.sqrt(atm.sigma), q = 0.5 * atm.rho * V * V, n = 1 / Math.cos((o.bank || 0) * DEG);
    const cl0 = P.CL0 + P.flapCL * flapF, pw = Math.max(0, 1.132 * atm.sigma - 0.132), ne = o.oei ? 0.5 : 1;
    const thrust = thr => {
      if (thr === 'dead') return -0.026 * q * P.S * (P.mass / 1050) ** 0.3;
      return ne * (propThrust(P, thr, V, pw, 1) - (1 - thr) * 2.5 * V * P.mass / 1000) - (o.oei ? 0.004 * q * P.S : 0);
    };
    const forces = gm => { const CL = n * W * Math.cos(gm) / (q * P.S), a = (CL - cl0) / P.CLa, CD = P.CD0 + (0.02 * flapF + 0.05 * flapF * flapF) * (P.flapCD ?? 1) + (P.CDgear || 0) * gear + P.K * CL * CL; return { a, D: CD * q * P.S }; };
    let gm, thr = null;
    if (o.pwr === 'full' || o.pwr === 'idle' || o.pwr === 'dead') {
      const T = thrust(o.pwr === 'full' ? 1 : o.pwr === 'idle' ? 0 : 'dead');
      gm = 0; for (let i = 0; i < 30; i++) { const f = forces(gm); gm = Math.asin(clamp((T - f.D) / W, -0.9, 0.9)); }
      thr = o.pwr === 'full' ? 1 : 0;
    } else {
      gm = Math.asin(clamp(fpm / 196.85 / V, -0.9, 0.9));
      const need = forces(gm).D + W * Math.sin(gm);
      let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (thrust(m) < need) lo = m; else hi = m; }
      thr = (lo + hi) / 2; if (thrust(1) < need) thr = 1.01;
    }
    const f = forces(gm), pitch = (gm + f.a) / DEG * Math.cos((o.bank || 0) * DEG), dead = o.pwr === 'dead';
    return { thr, pitch, fpm: Math.sin(gm) * V * 196.85, aoa: f.a / DEG, rpm: rpmFor(A, dead ? 0 : Math.min(thr, 1), V, pw, dead), ok: thr <= 1 };
  }

  // ---------------------------------------------------------------- the controls (Sorajima's): stick curves, pitch hold, assist
  // direct (no assist): pitch / roll = deflection per unit of stick, more at low speed so the response feels alike at every speed
  const SENS = {
    low: { direct: 0.45, pitch: 0.16, roll: 0.36, pMax: 0.4, rMax: 0.6, bank: 30, gamma: 8 },
    mid: { direct: 0.7, pitch: 0.26, roll: 0.55, pMax: 0.55, rMax: 0.8, bank: 45, gamma: 12 },
    high: { direct: 1.0, pitch: 0.42, roll: 0.85, pMax: 0.75, rMax: 1, bank: 60, gamma: 18 },
  };
  // the keyboard's pitch hold (W/S move a target nose attitude; released, the attitude stays)
  function pitchHold(s, alpha, qd, qdc, aS) {
    const AC = s.AC, f = qrot(s.q, [0, 0, -1]), th = Math.asin(clamp(f[1], -1, 1));
    let thT = (s.pTgt || 0) * DEG;
    if (!s.onGround && alpha > aS - 0.05) thT = Math.min(thT, th - (alpha - (aS - 0.05)) * 2);   // the wing kept off the stall
    const ratio = qd / Math.max(qdc, 1), e0 = (-AC.Cma * Math.sin(alpha) - AC.Cm0) / AC.Cmde * ratio;
    const Mde = Math.max(qdc * AC.S * AC.c * AC.Cmde / AC.I[0], 0.02), qCmd = clamp((thT - th) * 1.6 + (s.pRate || 0) * DEG, -0.2, 0.2);
    s.pHI = s.onGround ? 0 : clamp((s.pHI || 0) + (thT - th) * (1 / 120) * 0.8, -0.3, 0.3);
    s.elev = clamp(e0 + clamp(2.5 / Mde, 0.1, 30) * (qCmd - s.w[0]) + s.pHI - s.trim, -1, 1);
  }
  // the keyboard's bank hold (A / D released: the aileron keeps the bank there, as a hand on the yoke would; a bank
  // within 4 degrees is taken as "wings level"). It holds against the left-turning tendencies of a full-power climb.
  function bankHold(s, V, rMax) {
    const AC = s.AC, r = qrot(s.q, [1, 0, 0]), up = qrot(s.q, [0, 1, 0]), bank = Math.atan2(-r[1], up[1]), p = -s.w[2];
    if (s.bTgt == null) { s.bTgt = Math.abs(bank) < 4 * DEG ? 0 : clamp(bank, -60 * DEG, 60 * DEG); s.bHI = 0; }
    const err = s.bTgt - bank;
    if (Math.abs(err) < 3 * DEG) s.bHI = clamp((s.bHI || 0) + err * (1 / 120) * 0.6, -0.05, 0.05);     // the slow part: no steady error (no slow turn)
    const pMaxR = AC.rollRate * DEG * 0.5, pCmd = clamp(err * 1.2 + (s.bHI || 0), -pMaxR, pMaxR);
    const kAil = Math.abs(AC.Clp) * AC.b / (2 * Math.max(V, 10) * AC.Clda);
    s.ail = clamp((pCmd + 0.9 * (pCmd - p)) * kAil, -rMax, rMax);
    s.bankHoldOn = true;
  }
  function applyControls(s, V, alpha, qd, qdc, flapF, aS, cl0) {
    const AC = s.AC, A = s.A, o = s.opts, sens = SENS[o.sens] || SENS.low;
    const airborne = !s.onGround && s.airTime > 0.6 && V > 12, leveling = (o.levelT || 0) > 0;
    s.assistOn = (o.assist || leveling) && airborne && !s.crashed;
    const holdP = s.keyHold && !leveling && !s.crashed && V > 12 && !s.ovr && !s.onGround;
    if (!holdP) s.pHI = 0;
    const holdB = !A.sora && s.rollHold && !leveling && !s.crashed && V > 12 && !s.ovr && !s.onGround && s.airTime > 0.6 && Math.abs(s.rIn) < 0.02;
    s.bankHoldOn = false; if (!holdB) s.bTgt = null;
    if (!s.assistOn) {
      s.gI = 0; s.bI = 0;
      const vr = A.v.cruise / KT, spd = Math.max(V, 12);
      const pMax = Math.min(1, sens.pMax * clamp(vr / spd, 1, s.opts.gainCap ?? 1.7)), rMax = Math.min(1, sens.rMax * clamp(vr / spd, 1, 2));
      const kg = s.onGround ? 1 : s.airTime < 3 ? 1 - s.airTime / 3 : 0;     // full elevator for the rotation, blended out after lift-off
      const lin = Math.max(clamp(0.45 + (vr / spd - 1) * 0.35, 0.45, 0.8), 0.45 + 0.35 * kg);
      const shape = (x, a) => a * x + (1 - a) * x * x * x;
      const kp = Math.max(pMax, kg);
      let el = kp * shape(clamp(s.pIn, -1, 1), lin);
      if (s.trimHold) { if (Math.abs(s.pIn) < 0.04 || Math.sign(el) !== Math.sign(s.trimHold)) s.trimHold = 0; else el -= Math.sign(el) * Math.min(Math.abs(el), Math.abs(s.trimHold)); }
      s.elev = clamp(el, -1, 1); s.ail = clamp(rMax * shape(clamp(s.rIn, -1, 1), 0.45), -1, 1);
      // (Sorajima: with the assist on, back stick on the takeoff asks for a pitch attitude, never into the stall)
      if (A.sora && o.assist && !s.crashed && V > 12 && s.pIn > 0.05 && (s.onGround || s.airTime < 3)) {
        const f = qrot(s.q, [0, 0, -1]), th = Math.asin(clamp(f[1], -1, 1));
        let thCmd = Math.min(1, s.pIn * 1.8) * 10 * DEG;
        if (alpha > aS - 0.06) thCmd = Math.min(thCmd, th - (alpha - (aS - 0.06)) * 2);
        s.elev = clamp(Math.min(clamp((thCmd - th) * 10 - s.w[0] * 2.5, -1, 1), 1) - s.trim, -1, 1);
      }
      if (holdB) bankHold(s, V, rMax);
      if (holdP) pitchHold(s, alpha, qd, qdc, aS);
      return;
    }
    // the assist (fly-by-wire, a teaching aid; off in graded lessons): stick left/right = bank angle, fore/aft = climb angle
    const r = qrot(s.q, [1, 0, 0]), up = qrot(s.q, [0, 1, 0]);
    const bank = Math.atan2(-r[1], up[1]), spd = vlen(s.vel) || 1, gamma = Math.asin(clamp(s.vel[1] / spd, -1, 1)), p = -s.w[2];
    const bankMax = Math.min(sens.bank, 80) * DEG;
    const rIn = leveling ? 0 : s.rIn, pIn = leveling ? 0 : s.pIn;
    const bankCmd = rIn * bankMax, pMaxR = AC.rollRate * DEG * (o.sens === 'high' ? 1 : o.sens === 'mid' ? 0.75 : 0.55);
    const bErr = bankCmd - bank, hold = Math.abs(bankCmd) < 2 * DEG && Math.abs(bErr) < 3 * DEG;
    s.bI = hold ? clamp((s.bI || 0) + bErr * (1 / 120) * 1.5 * Math.min(1, AC.rollRate / 50), -0.08, 0.08) : (s.bI || 0) * 0.98;
    const pCmd = clamp(bErr * 1.6 + s.bI, -pMaxR, pMaxR), kAil = Math.abs(AC.Clp) * AC.b / (2 * Math.max(V, 10) * AC.Clda);
    s.ail = clamp((pCmd + 0.9 * (pCmd - p)) * kAil, -1, 1);
    const gMax = sens.gamma * DEG, gammaCmd = pIn * gMax;
    s.gI = clamp((s.gI || 0) * (1 - 0.1 / 120) + clamp(gammaCmd - gamma, -1.5 * DEG, 1.5 * DEG) * (1 / 120) * 0.35, -0.08, 0.08);
    const gdot = clamp((gammaCmd - gamma) * 0.7 + s.gI, -AC.pitchRate * DEG, AC.pitchRate * DEG);
    const nCmd = clamp(Math.cos(gamma) / Math.max(Math.cos(bank), 0.35) + spd * gdot / G, -1, AC.maxG);
    const aFree = (nCmd * AC.mass * G / Math.max(qd * AC.S, 1) - cl0) / AC.CLa, aReq = clamp(aFree, -aS * 0.7, aS - 0.04);
    if (aReq !== aFree) s.gI *= 0.97;
    const ratio = qd / Math.max(qdc, 1);
    let e = (-AC.Cma * Math.sin(aReq) - AC.Cm0) / AC.Cmde * ratio;
    const Mde = Math.max(qdc * AC.S * AC.c * AC.Cmde / AC.I[0], 0.02), qCmd = G / spd * (nCmd - Math.cos(gamma) * Math.cos(bank)) + 2.0 * (aReq - alpha);
    e += 1.2 * (aReq - alpha) + clamp(2.5 / Mde, 0.1, 30) * (qCmd - s.w[0]);
    s.elev = clamp(e - s.trim, -1, 1);
    if (holdP) pitchHold(s, alpha, qd, qdc, aS);
  }

  // ---------------------------------------------------------------- the engine systems (the start, the magnetos, the mixture, the fuel selector)
  // The same states as FLIGHT LAB's physics.js (this model differs from it in the ways the header lists; the engine
  // systems are not one of them): each engine carries mag (OFF / R / L / BOTH / START), mix (the mixture lever:
  // 0 pulled to idle cut-off, 1 full rich), sel (the fuel selector: 'L' / 'R' / 'OFF') and on (it has been started
  // and nothing has stopped it since). The defaults are the running configuration, so a lesson that never touches
  // them flies exactly as before. A stopped engine starts again only by cranking — the key held at START with fuel
  // reaching it and the mixture rich — and catches after CATCH_S. It stops at once on a failure or the mixture cut
  // (cut, or the lever at idle cut-off), at once on the magnetos OFF, and when no fuel reaches it — the selector
  // OFF or its tank empty — after the fuel left in the lines (LINE_FUEL_S) is used. CADET's aircraft/systems.js
  // drives these from the cockpit's switches and layers its own start (the primer, flooding, the catch timing,
  // the run-up gauge) on top.
  const MAG_POS = ['OFF', 'R', 'L', 'BOTH', 'START'];
  const MIX_OFF = MIX_CUT, MIX_RICH = 0.7, CATCH_S = 1.2;   // (the cut-off detent is the powerplant model's MIX_CUT, above)

  // ---------------------------------------------------------------- weight and balance (teaching values)
  // The same section as FLIGHT LAB's physics.js (this model differs from it in the ways the header lists;
  // the loading is not one of them). The load the aircraft carries: the people, the baggage and the fuel in
  // the tanks, on the arms of the type's loading graph (inches from the datum, as the POH's graph is drawn;
  // weights in kilograms here, at 6 lb to the gallon of avgas). The model's reference mass (A.phys.mass) IS
  // the standard training load — two in front, no one behind, no baggage, the tanks at the 80 % a day
  // begins with — so the equipped empty weight below is the teaching value that makes that true, and a
  // lesson that never chooses a load flies exactly as before. What a different load changes: the mass the
  // integrator carries (the inertia, the wheel loads and the elements' tuning all follow it — a heavier
  // aircraft rolls further and climbs slower, a solo one, without the instructor's weight, climbs better),
  // and the trim: a centre of gravity away from the standard load's asks for a different elevator trim
  // (AC.Cm0 shifted by the same amount everywhere trim is quoted; a nudge, never more, inside the
  // envelope) — and, with it, the stability itself: Cma follows the static margin the CG leaves
  // (deriveAircraft's load), so an aft load is genuinely less stable in pitch, as the W&B lesson says.
  // The stall speeds derive() quotes (vs0 / vs1) scale with √weight. Outside the limits the
  // before-takeoff checklist refuses (FLIGHT LAB's school.js): overweight, nose-heavy or tail-heavy is a
  // load to fix on the ground, not a flight to make.
  const LB_KG = 0.45359237, PERSON_KG = 77, FUEL_KG_GAL = 6 * LB_KG;   // a standard adult (170 lb); avgas at 6 lb/US gal
  const WB = {
    // mtowLb and the CG limits (a simplified constant envelope); arms: empty / front seats / rear seats /
    // baggage / fuel; tabsGal: the fuel at the filler tabs, per tank (the Seminole's is a teaching value)
    pa28: { mtowLb: 2550, fwdIn: 82, aftIn: 93, emptyArm: 85.5, frontArm: 80.5, rearArm: 118.1, bagArm: 142.8, bagMaxKg: 90, fuelArm: 95, tabsGal: 17 },
    pa44: { mtowLb: 3800, fwdIn: 84, aftIn: 94, emptyArm: 89, frontArm: 84, rearArm: 118.9, bagArm: 142, bagMaxKg: 90, fuelArm: 95.7, tabsGal: 40 },
  };
  // the standard training load (what every lesson has flown with until now)
  const stdLoading = () => ({ fuel: 'std', front: 2, rear: 0, bagKg: 0 });
  function cleanLoading(A, ld) {
    const W = WB[A.id]; if (!W) return stdLoading();
    const o = (ld && typeof ld === 'object') ? ld : {}, num = v => (Number.isFinite(+v) ? +v : NaN);
    return { fuel: ['std', 'full', 'tabs', 'half'].includes(o.fuel) ? o.fuel : 'std',
      front: clamp(Math.round(Number.isNaN(num(o.front)) ? 2 : num(o.front)), 0, 2), rear: clamp(Math.round(Number.isNaN(num(o.rear)) ? 0 : num(o.rear)), 0, 2),
      bagKg: clamp(Number.isNaN(num(o.bagKg)) ? 0 : num(o.bagKg), 0, W.bagMaxKg) };
  }
  // the fuel in each tank for a load's fuel choice ('std' is the 80 % the state begins with)
  function fuelPerTank(A, mode) { const W = WB[A.id]; return mode === 'full' ? A.fuelCap : mode === 'tabs' ? W.tabsGal : mode === 'half' ? A.fuelCap / 2 : A.fuelCap * 0.8; }
  // the weight and balance of a load: the total mass, the CG (inches from the datum) and what is wrong with
  // it, if anything ('over' / 'nose' / 'tail'). fuelGal: the gallons actually in the tanks (default: the
  // load's own fuel choice, the same in both tanks)
  function computeWB(A, ld, fuelGal) {
    const W = WB[A.id]; if (!W) return null;
    const L = cleanLoading(A, ld);
    const fg = (Array.isArray(fuelGal) && fuelGal.length === 2 && fuelGal.every(Number.isFinite)) ? fuelGal : [fuelPerTank(A, L.fuel), fuelPerTank(A, L.fuel)];
    const emptyKg = A.phys.mass - 2 * PERSON_KG - 2 * A.fuelCap * 0.8 * FUEL_KG_GAL;   // (the equipped empty weight that makes the standard load come to the reference mass)
    let kg = emptyKg + L.front * PERSON_KG + L.rear * PERSON_KG + L.bagKg + (fg[0] + fg[1]) * FUEL_KG_GAL;
    const mom = emptyKg * W.emptyArm + L.front * PERSON_KG * W.frontArm + L.rear * PERSON_KG * W.rearArm + L.bagKg * W.bagArm + (fg[0] + fg[1]) * FUEL_KG_GAL * W.fuelArm;
    // (the standard load is the reference mass, exactly — not the components' sum to within float dust)
    if (L.front === 2 && !L.rear && !L.bagKg && Math.abs(fg[0] - A.fuelCap * 0.8) < 1e-9 && Math.abs(fg[1] - A.fuelCap * 0.8) < 1e-9) kg = A.phys.mass;
    const cgIn = mom / kg, lb = kg / LB_KG, problems = [];
    if (lb > W.mtowLb) problems.push('over');
    if (cgIn < W.fwdIn) problems.push('nose'); else if (cgIn > W.aftIn) problems.push('tail');
    // (the load's spread about its own CG, inches: how far the carried mass sits from the middle — the inertia's share of the loading)
    const spreadIn = Math.sqrt((emptyKg * (W.emptyArm - cgIn) ** 2 + L.front * PERSON_KG * (W.frontArm - cgIn) ** 2 + L.rear * PERSON_KG * (W.rearArm - cgIn) ** 2 + L.bagKg * (W.bagArm - cgIn) ** 2 + (fg[0] + fg[1]) * FUEL_KG_GAL * (W.fuelArm - cgIn) ** 2) / kg);
    return { kg, lb, cgIn, spreadIn, mtowLb: W.mtowLb, fwdIn: W.fwdIn, aftIn: W.aftIn, ok: !problems.length, problems, fuelGal: fg.slice(), loading: L, emptyKg };
  }
  const refCgOf = A => { const w = computeWB(A, stdLoading()); return w ? w.cgIn : 0; };
  const refSpreadOf = A => { const w = computeWB(A, stdLoading()); return w ? w.spreadIn : 0; };
  // put a load on the aircraft: the tanks filled as the load says ('std' leaves them as they are), the state
  // re-derived at the real mass (inertia, wheel springs, the elements' tuning), the trim shifted for the CG.
  // Returns the computeWB result; the state keeps it as s.wb (and the load as s.loading).
  function applyLoading(s, ld) {
    const A = s.A, W = WB[A.id]; if (!W) return null;
    const L = cleanLoading(A, ld);
    if (L.fuel !== 'std') { const per = fuelPerTank(A, L.fuel); s.fuel = [per, per]; }
    const wb = computeWB(A, L, s.fuel);
    s.loading = L; s.wb = wb;
    const d = deriveAircraft(A, wb.kg, { cgIn: wb.cgIn, spreadIn: wb.spreadIn });   // (the CG works inside the derivation now: the trim — ≈ 0.03 of elevator per 4 in at cruise, quoted by the same Cm0 everywhere — and the stability and inertia with it)
    Object.assign(s, { AC: d.AC, WHEELS: d.WHEELS, WHEEL_BOTTOM: d.WHEEL_BOTTOM, HARDPTS: d.HARDPTS, TAILSKID: d.TAILSKID });
    if (!s.contacts || s.contacts.length !== d.WHEELS.length) s.contacts = d.WHEELS.map(() => false);
    return wb;
  }

  // ---------------------------------------------------------------- the state
  function newState(o = {}) {
    const s = {
      t: 0, pos: [0, GROUND_M + 1.4, 0], vel: [0, 0, 0], q: [0, 0, 0, 1], w: [0, 0, 0],
      thr: 0, elev: 0, ail: 0, rud: 0, trim: 0, trimTgt: null, brake: false, pIn: 0, rIn: 0, flapIdx: 0, flapDeg: 0, gearDown: true, gearPos: 1,
      rpm: 0, propAng: 0, onGround: false, mainContact: false, airTime: 0, crashed: false, crashReason: '',
      alpha: 0, beta: 0, ias: 0, tas: 0, gLoad: 1, stallW: 0, stallWarn: false, agl: 0, vs: 0, contacts: [],
      keyHold: true, pTgt: null, pRate: 0, dead: false,
      opts: { sens: 'low', assist: false, autoRud: false, levelT: 0 },
      wind: { fromDeg: 0, kt: 0, gust: 0.4 }, qnh: 29.92, oatDev: 0, surfaceWet: 0,
      mix: 1, fuelSel: 'L', carbHeat: false, carbRisk: 0,
      pitotHeat: false, pitotRisk: 0, pitotIce: 0, staticBlocked: false, altStatic: false, boostPump: false, xfeed: false, gearFault: false, gearEmerg: false, gearEmergT: 0, fuelUsed: 0, _iasFrz: null, _altFrz: null,   // (systems depth: pitot/static icing and blockage, the boost pump, the twin's crossfeed, a gear fault and its emergency extension, the fuel totalizer)   // the engine's own controls: the mixture lever (1 = full rich), the tank selector, the carburettor heat, and how humid the day is (0 = carburettor ice cannot form; a lesson sets it)
      _mixCmd: 1, _selCmd: 'L',   // the shared controls as last followed by every engine's own switches (see the engine systems in step): moving s.mix / s.fuelSel moves them all; an engine's own mag / mix / sel can still be set one by one
      fuel: [0, 0], fuelFlow: 0,
      eng: [], events: [], td: null, out: {}, wasOnRunway: false, lastRwyT: -99, seed: o.seed || 1,
    };
    setAircraft(s, o.aircraft || 'pa28', o.mass);
    return s;
  }
  function setAircraft(s, id, mass) {
    const A = AIRCRAFT.find(a => a.id === id) || AIRCRAFT[0];
    const d = deriveAircraft(A, mass);
    Object.assign(s, { A, AC: d.AC, WHEELS: d.WHEELS, WHEEL_BOTTOM: d.WHEEL_BOTTOM, HARDPTS: d.HARDPTS, TAILSKID: d.TAILSKID });
    s.contacts = d.WHEELS.map(() => false);
    s.fuel = [A.fuelCap * 0.8, A.fuelCap * 0.8];
    s.eng = Array.from({ length: A.engines1 || 1 }, (_, i) => ({ run: true, failed: false, feather: false, cut: false, thr: null, rpm: 0, mag: 'BOTH', mix: 1, sel: i ? 'R' : 'L', on: true, crankT: 0, lineT: LINE_FUEL_S, egt: 70, carbIce: 0, feed: i ? 1 : 0, feedOk: true, mixK: 1, powK: 1, rough: 0, manIn: 0, ff: 0, ffK: 1, shaftW: 0, lev: 1, iceNoted: false, magBad: null, pumpFail: false, fuelPress: 0, pressT: 0, oilQ: (A.fuelCap > 30 ? 8 : 7), cyl: null }));
    s.gearDown = true; s.gearPos = 1;
    return s;
  }
  const engineRunning = s => s.eng.some(e => e.run);

  // ---------------------------------------------------------------- one step (dt = 1/120 s)
  function step(s, dt) {
    if (s.crashed) { derive(s); return s; }
    const A = s.A, AC = s.AC;
    s.t += dt;
    // (a trim commanded by the T key runs in like a wheel being wound, not a jump: the trim state eases
    // towards trimTgt at a finite rate and the target clears on arrival. Anything that sets s.trim
    // directly — the wheel itself, a reset, a placement — clears the target and snaps)
    if (s.trimTgt != null) { const d = s.trimTgt - s.trim, m = 0.6 * dt; if (Math.abs(d) <= m) { s.trim = s.trimTgt; s.trimTgt = null; } else s.trim += Math.sign(d) * m; }
    if ((s.opts.levelT || 0) > 0) s.opts.levelT -= dt;
    s.flapDeg += clamp(FLAP_DEG[s.flapIdx] - s.flapDeg, -8 * dt, 8 * dt);
    if (A.gear.fixed) { s.gearDown = true; s.gearPos = 1; }
    else if (s.gearEmerg) { s.gearDown = true; s.gearEmergT += dt; if (s.gearEmergT > 1.2) s.gearPos = clamp(s.gearPos + dt / 3, 0, 1); }   // (the emergency free-fall extension: a beat while it lets go, then it drops; it cannot be retracted afterwards)
    else if (!(s.onGround && !s.gearDown)) { const tgt = s.gearDown ? (s.gearFault ? 0.55 : 1) : 0; s.gearPos = clamp(s.gearPos + clamp(tgt - s.gearPos, -dt / 6, dt / 6), 0, 1); }   // (a gear fault: the transit stalls part-way and never locks — no greens)
    const flapF = A.wing.flap ? s.flapDeg / 30 : 0;
    const atm = atmos(s.pos[1], s.oatDev), rho = atm.rho;
    const ground = groundAt(s.pos[0], s.pos[2]);
    const agl = s.pos[1] + s.WHEEL_BOTTOM - ground.h;
    const qi = qconj(s.q);
    const vb = qrot(qi, vsub(s.vel, windAt(s, s.t, agl + 2)));
    const V = vlen(vb), u = -vb[2];
    const alpha = Math.atan2(-vb[1], u), beta = V > 0.5 ? Math.asin(clamp(vb[0] / V, -1, 1)) : 0;
    const qd = 0.5 * rho * V * V;
    // engines: each one's state (the systems above, a failure, the mixture cut-off, feather), its own throttle when set.
    // The shared controls (s.mix / s.fuelSel) are the cockpit's one set of switches: when they move, every engine's
    // own lever / selector follows (the cockpits have one set, and the twin's selector is its crossfeed valve — one
    // feed for both engines while it is the thing being moved); an engine's own switches can still be set one by
    // one, and then they are what the engine answers to until the shared controls move again.
    if (s.mix !== s._mixCmd) { s._mixCmd = s.mix; for (const e of s.eng) e.mix = s.mix; }
    if (s.fuelSel !== s._selCmd) { s._selCmd = s.fuelSel; for (const e of s.eng) e.sel = s.fuelSel; }
    // The fuel feed and the mixture, the powerplant model: an engine drinks from the tank its selector names. A dry
    // feed, or OFF, leaves the fuel in the lines — about six seconds — then the engine stops, however full the other
    // tank is. The mixture lever (e.lev; 1 = full rich) meters the fuel-air ratio: an engine runs above the cut-off
    // detent only, and how well it runs on the mixture is worked out with the thrust, below.
    for (const e of s.eng) {
      e.lev = e.mix ?? 1;
      const mag = e.mag || 'BOTH', sel = e.sel || 'L';
      // the feed (which tank's fuel reaches this engine). The Archer: its selector names a tank (L / R / OFF).
      // The Seminole (the PA-44's system, simplified and stated here): each engine has its own selector valve
      // (ON / OFF — a legacy non-OFF value counts as ON) at its own tank, plus one crossfeed valve. Selector ON:
      // the engine drinks its own tank. Selector OFF, crossfeed open, the other side's selector ON: it drinks
      // the other tank — both engines on one tank, which is the single-engine crossfeed drill. Both selectors
      // ON: each engine its own tank, crossfeed open or not. Both OFF: nothing feeds either engine.
      if (s.eng.length > 1) { const on = s.eng.map(x => (x.sel || 'ON') !== 'OFF'); const i = s.eng.indexOf(e); e.feed = on[i] ? i : (s.xfeed && on[1 - i] ? 1 - i : -1); }
      else e.feed = sel === 'OFF' ? -1 : sel === 'R' ? 1 : 0;
      if (e.feed >= 0 && s.fuel[e.feed] > 0) e.lineT = LINE_FUEL_S; else e.lineT = Math.max(0, (e.lineT ?? LINE_FUEL_S) - dt);
      e.feedOk = (e.feed >= 0 && s.fuel[e.feed] > 0) || e.lineT > 0;
      // fuel pressure (0..1, a teaching scale): the engine-driven pump while the engine turns, or the electric
      // boost pump. A failed engine-driven pump (the 'pump' fault) leaves the boost pump as the only source —
      // and at low rpm without it the pressure sags away: the starvation the checklist's pump steps exist for
      const pTgtP = !e.run ? (s.boostPump ? 0.35 : 0) : e.pumpFail ? (s.boostPump ? 0.85 : ((e.rpm || 0) > 1200 ? 0.3 : 0)) : 1;
      e.fuelPress = (e.fuelPress || 0) + (pTgtP - (e.fuelPress || 0)) * Math.min(1, dt * 2);
      const stop = e.failed || e.cut ? 1 : mag === 'OFF' ? 2 : e.lev <= MIX_CUT ? 3 : !e.feedOk ? 4 : 0;
      if (stop) { e.on = false; e.crankT = 0; }
      else if (e.on === false && mag === 'START' && e.lev >= MIX_RICH) { e.crankT = (e.crankT || 0) + dt; if (e.crankT >= CATCH_S) { e.on = true; e.crankT = 0; } }
      else e.crankT = 0;
      e.run = e.on !== false && !stop;
    }
    if (!s.eng[0].run && !s.engStopNoted && (A.engines1 || 1) === 1) { const e0 = s.eng[0]; s.engStopNoted = true; s.events.push({ t: s.t, type: 'engine_stop', why: e0.failed ? '故障（教材の想定）' : e0.cut || e0.lev <= MIX_CUT ? 'ミクスチャー カットオフ' : e0.mag === 'OFF' ? 'マグネトー OFF' : e0.sel === 'OFF' ? '燃料セレクター OFF' : '燃料切れ' }); }
    s.dead = !engineRunning(s);
    const thrOf = e => (e.thr != null ? e.thr : s.thr);
    const nE = s.eng.length, runShare = s.eng.reduce((a, e) => a + (e.run ? thrOf(e) : 0), 0) / nE;
    const qdc = qd + 240 * runShare * Math.sqrt(AC.mass / 1000);
    const aS = AC.aStall - AC.flapStall * flapF, cl0 = AC.CL0 + AC.flapCL * flapF;
    applyControls(s, V, alpha, qd, qdc, flapF, aS, cl0);
    if (s.ovr) { s.elev = clamp(s.ovr.elev, -1, 1); s.ail = clamp(s.ovr.ail, -1, 1); s.rud = clamp(s.ovr.rud, -1, 1); }
    const F = [0, 0, 0], EL = AC.el;
    // --- engines (normally aspirated piston: power falls faster than density; a fixed-pitch prop is weakest at low speed)
    const Eng = AC.engine, pw = Math.max(0, 1.132 * atm.sigma - 0.132), ua = Math.max(u, 0);
    let T = 0, Tasym = 0, shaft = 0;
    const xe = A.engines[0].x || 0;
    // The mixture, worked per engine (teaching numbers, from the POH's leaning pages): the strength m is the lever
    // against sea-level full rich — the air thins with density altitude and a plain carburettor does not, so full rich
    // grows richer as you climb. Power is whole at m ≈ 0.93–1.06 (full rich is made to be right up to about 4,500 ft
    // density altitude, so a lesson that never touches the lever is unchanged), falls away rich of it (2.2 per unit²
    // of excess — the high-altitude take-off case: about 2 % at 8,000 ft, 7 % at 12,000 ft) and faster lean of it
    // (1.6 per unit²), and below m ≈ 0.62 the charge will not burn evenly at all: the smoothstep fades the power
    // out and `rough` (felt in the thrust, and in the rpm) rises. Leaning back toward the plateau is best power, and
    // at the plateau the EGT peaks (below).
    const pAmbIn = atm.p / 3386.39;                                 // ambient pressure, inHg — what a stopped engine's manifold gauge reads
    s.eng.forEach((e, i) => {
      const th = thrOf(e), P1 = Eng.P / nE;
      let Ti;
      if (!e.run) {
        Ti = -(e.feather ? 0.003 : 0.026 / nE) * qd * AC.S * (AC.mass / 1050 / nE) ** 0.3;          // windmilling (or feathered) propeller drag
        e.mixK = 0; e.powK = 0; e.rough = 0; e.ff = 0; e.shaftW = 0; e.manIn = pAmbIn;
        e.egt = (e.egt == null ? 70 : e.egt) + ((atm.T * 9 / 5 - 459.67) - (e.egt == null ? 70 : e.egt)) * Math.min(1, dt / 6);   // a stopped engine's exhaust cools toward the outside air
      } else {
        const mStr = e.lev / Math.sqrt(Math.max(atm.sigma, 0.35));
        let mixK = 1 - 2.2 * Math.max(0, mStr - 1.06) ** 2 - 1.6 * Math.max(0, 0.93 - mStr) ** 2;
        if (mStr < 0.62) mixK *= smoothstep(0.45, 0.62, mStr);
        e.mixK = clamp(mixK, 0, 1);
        e.rough = clamp((0.74 - mStr) / 0.12, 0, 1);
        // Carburettor ice (the Archer; the Seminole is injected): it builds when the day is humid (s.carbRisk, set by
        // the lesson — never at random) and the venturi is in its band, about −7…+26 °C, worst near +12 °C and at
        // low power, over minutes. Half the power is gone when it is full; above about half it runs rough. The heat
        // melts it in tens of seconds, costing power while it is on and a little more while the melt water goes
        // through — the drop, then the rise, of the run-up check.
        let carbK = 1;
        if (A.carb) {
          const oatC = atm.T - 273.15, band = clamp((oatC + 7) / 19, 0, 1) * clamp((26 - oatC) / 14, 0, 1);
          if (s.carbHeat) e.carbIce = Math.max(0, (e.carbIce || 0) - dt / 14);
          else if (s.carbRisk > 0 && band > 0) e.carbIce = Math.min(1, (e.carbIce || 0) + dt * s.carbRisk * band * (1.3 - 0.8 * th) / 200);
          if ((e.carbIce || 0) > 0.45 && !e.iceNoted) { e.iceNoted = true; s.events.push({ t: s.t, type: 'carb_ice' }); }
          carbK = (1 - 0.5 * (e.carbIce || 0)) * (s.carbHeat ? 0.94 - 0.08 * (e.carbIce || 0) : 1);
          if ((e.carbIce || 0) > 0.45) e.rough = Math.max(e.rough, 0.7);
        }
        e.powK = e.mixK * carbK;
        // one magneto (the key at L or R): a real engine is weaker on a single ignition source — about 3 % of
        // power gone, a slightly hotter exhaust, a rougher note; a bad magneto (e.magBad names its side, set by
        // the day's fault) roughens hard at run-up rpm and above whenever it is in circuit
        const mag = e.mag || 'BOTH';
        let magEgt = 0;
        if (mag === 'L' || mag === 'R') { e.powK *= 0.97; e.rough = clamp(e.rough + 0.3, 0, 1); magEgt = 18; }
        if (e.magBad && (mag === 'BOTH' || mag === e.magBad)) { e.powK *= 0.96; if ((e.rpm || 0) > 1700) e.rough = Math.max(e.rough, 0.55); }
        // a failed engine-driven fuel pump with the boost pump off: the pressure falls away and the engine
        // starves (it stops, and restarts when the boost pump brings the pressure back)
        if (e.pumpFail && e.fuelPress < 0.08) { e.pressT = (e.pressT || 0) + dt; if (e.pressT > 2.5) { e.on = false; e.powK = 0; } } else e.pressT = 0;
        if (e.pumpFail) { e.powK *= clamp((e.fuelPress || 0) * 1.3, 0.05, 1); if ((e.fuelPress || 0) < 0.3) e.rough = Math.max(e.rough, 0.6); }
        Ti = propThrust(AC, th, ua, pw, nE) * e.powK - (1 - th) * 2.5 * ua * AC.mass / 1000 / nE;
        if (e.rough > 0) Ti *= 1 + e.rough * 0.05 * Math.sin(s.t * 39 + i * 2.4);   // an over-lean or iced engine shakes its thrust
        e.shaftW = (0.04 + 0.96 * th) * pw * P1 / 0.85 * e.powK;
        shaft += e.shaftW;
        // EGT (°F): it peaks at a strength of about 0.86 — lean of best power, as the POH's graph shows — and falls
        // away rich (unburned fuel cooling the charge) and leaner (less to burn); a first-order lag, seconds.
        const pf = (0.04 + 0.96 * th) * pw * e.mixK;
        const egtT = 980 + 300 * pf + 330 * Math.pow(Math.max(pf, 0), 0.7) * Math.exp(-(((mStr - 0.86) / 0.15) ** 2)) + magEgt;
        e.egt = (e.egt == null ? egtT : e.egt) + (egtT - (e.egt == null ? egtT : e.egt)) * Math.min(1, dt / 2.5);
        // Manifold pressure (inHg): the ambient pressure less what the throttle plate holds back — nearly ambient at
        // full throttle, about 10 inHg at idle; it falls with altitude because the ambient does.
        e.manIn = Math.min(pAmbIn * (0.30 + 0.68 * th), pAmbIn - 0.3);
        // The fuel flow the mixture meters: the lever's share of the rich flow (cut-off meters none)
        e.ffK = clamp(0.15 + 0.85 * Math.pow(e.lev, 1.2), 0, 1);
      }
      e.T = Ti; T += Ti;
      if (nE === 2) Tasym += (i === 1 ? 1 : -1) * Ti * xe;      // eng[0] = left, eng[1] = right: right thrust yaws left
    });
    s.shaftP = shaft; s.thrust = T; s.rho = rho; s.oat = atm.T - 273.15; s.nProp = 0;
    s.densAlt = (1 - Math.pow(Math.min(atm.sigma, 1.2), 0.234969)) * 44330.8;
    F[2] -= T;
    // --- moments not from the lifting pieces (pilot convention: roll right, pitch up, yaw right)
    const p = -s.w[2], qq = s.w[0], r = -s.w[1], hv = 0.25 * rho * V;
    const elevEff = clamp(s.elev + s.trim, -1, 1);
    let Nx = qd * AC.S * AC.b * EL.dCnda * s.ail + hv * AC.S * AC.b * AC.b * EL.dCnp * p - Tasym, Rl = 0, Ng = 0, Gp = 0;
    if (nE === 2) Rl += -Tasym * 0.08;                         // the running engine's slipstream lifts its wing: roll toward the dead engine
    if (nE === 2) Rl += -(s.fuel[0] - s.fuel[1]) * 2.72 * G * 1.05;   // fuel imbalance (the twin: independent tanks, so a split that grows is a real handling factor — the heavier tank's weight, 2.72 kg a gallon, on a metre's arm; the Archer's one selector and its BOTH position keep it a non-event there, and it is left out)
    {
      const Pr = AC.prop, Tp = Math.max(T, 0);
      s.nProp = -(Tp * (Pr.a0 + Pr.a1 * clamp(alpha, -0.1, 0.35) + Pr.a1 * 0.35 * clamp(beta, -0.25, 0.25))) + Pr.fin * qd;   // (P-factor: the alpha term, and a sideslip share — the disc met at an angle either way pushes the nose toward the wind)
      Nx += s.nProp;
      if (!A.sora) Rl += -EL.finYZ * (-Tp * Pr.a0 + Pr.fin * qd);             // the slipstream's swirl on the fin and the fin offset: side forces above the CG
      const om = Math.max(s.rpm, 300) * Math.PI / 30;
      Rl += -(s.shaftP || 0) / om * Pr.tq + Pr.rig * qd;        // engine torque reaction (partly rigged out): rolls left
      Ng = Pr.Ip * om * qq * (A.counterRotating ? 0 : 1);       // gyroscopic precession: pitch up -> yaw right
      Gp = 0.18 * Pr.Ip * om * r * (A.counterRotating ? 0 : 1);        // …and its mirror from the same cross product: yaw right -> pitch down (taken off Mp below; at a modest share of the disc's inertia — at the whole rotating group's value, the one Ng was tuned around, gusty yaw in the flare kicks the nose harder than the pitch axis answers: the crosswind lesson's touchdown measured 320 fpm at full share, 300 at this one, ground turbulence included)
    }
    // the automatic rudder (ball kept centred), for the assist and for keyboard pilots who want it
    const autoR = s.assistOn || s.opts.autoRud;
    const rAuth = Math.max(qdc * AC.S * AC.b * AC.Cndr, 1);
    s.rudNeed = clamp(-(Nx + Ng) / rAuth, -1, 1);
    let yd = 0;
    if (autoR && !s.onGround && V > 10) {
      const rgt = qrot(s.q, [1, 0, 0]), upv = qrot(s.q, [0, 1, 0]), sb = -rgt[1] / Math.hypot(rgt[1], upv[1]);
      yd = -clamp(1.5 * AC.I[2] / rAuth, 0.8, 20) * (r - G * sb / V);
    }
    s.rudAuto = autoR ? clamp(-(Nx + Ng) / rAuth + 1.5 * beta + yd, -1, 1) * (s.onGround && V < 8 ? V / 8 : 1) : 0;
    const rudEff = clamp(s.rud + s.rudAuto, -1, 1);
    // --- aerodynamics: the lifting pieces, with turbulence that varies across the span
    const upB = qrot(qi, [0, 1, 0]), hCG = s.pos[1] - ground.h;
    // (the air near the ground is not calm: the profile used to fade the gusts out entirely below 3 m,
    // exactly where the flare happens — now a floor of the turbulence remains at the surface, and a
    // mechanical share rides on the surface wind itself (the wake of the ground and its obstacles),
    // strongest in the last metres and gone by 60 m up)
    const gA = (s.wind.gust ?? 1) * Math.min(1, Math.max(agl, 0) / 300 + 0.4) * 0.9 * (0.12 + 0.88 * smoothstep(3, 40, agl))
      + (s.wind.gust ?? 1) * (s.wind.kt / KT) * 0.0005 * Math.exp(-Math.max(agl, 0) / 20);
    const gW = perlin(s.t * 0.9, 23.1) * gA / (AC.b / 2), gT = perlin(s.t * 0.7, 41.9) * gA * 0.2;
    const ae = aeroElements(EL, AC, vb, s.w, rho, {
      flapF, elev: elevEff, ail: s.ail, rud: rudEff, dq: 240 * runShare * Math.sqrt(AC.mass / 1000),
      stH: s._stH && s._stH.length === EL.pcs.length ? s._stH : (s._stH = new Float32Array(EL.pcs.length)), dt,
      hgt: pc => hCG + pc.r[0] * upB[0] + pc.r[1] * upB[1] + pc.r[2] * upB[2],
      gust: pc => { const gg = pc.kind === 0 ? gW * pc.r[0] : pc.kind === 1 ? gT : 0; return [upB[0] * gg, upB[1] * gg, upB[2] * gg]; },
    });
    const stallW = ae.stallW;
    const hx = Math.max(agl + 1.3, 0.3) / AC.b, ge = (16 * hx * hx) / (1 + 16 * hx * hx);
    const CDp = AC.CD0 + (0.02 * flapF + 0.05 * flapF * flapF) * (AC.flapCD ?? 1) + AC.CDgear * s.gearPos + 0.6 * beta * beta;
    F[0] += ae.F[0] + qd * AC.S * EL.dCY * beta; F[1] += ae.F[1]; F[2] += ae.F[2];
    if (V > 0.3) { const k = qd * AC.S * CDp / V; F[0] -= vb[0] * k; F[1] -= vb[1] * k; F[2] -= vb[2] * k; }
    { const ln = Math.hypot(vb[1], vb[2]) || 1, qs = Math.max(qd * AC.S, 1e-6);
      s.liftN = (ae.F[1] * -vb[2] + ae.F[2] * vb[1]) / ln; s.dragN = -(F[0] * vb[0] + F[1] * vb[1] + (F[2] + T) * vb[2]) / Math.max(V, 1e-3);
      s.CL = ae.CLw; s.CD = s.dragN / qs; s.ge = ge; }
    const Mp = ae.M[0] + qd * AC.S * AC.c * (AC.Cm0 + EL.dCma * Math.sin(alpha) + EL.dCmF * flapF) + hv * AC.S * AC.c * AC.c * EL.dCmq * qq - Gp;
    let Lr = -ae.M[2] + hv * AC.S * AC.b * AC.b * (EL.dClp * p + EL.dClr * r) + Rl;
    if (stallW > 0.15) Lr += qd * AC.S * AC.b * 0.012 * stallW * perlin(s.t * 1.3, 12.5);        // buffet
    const Nr = -ae.M[1] + hv * AC.S * AC.b * AC.b * EL.dCnr * r + Nx + Ng;
    const Tb = [Mp, -Nr, -Lr];
    // --- the wheels and the parts that must not touch (world frame)
    const Fw = qrot(s.q, F), Tw = [0, 0, 0], wW = qrot(s.q, s.w);
    const gsp = Math.hypot(s.vel[0], s.vel[2]);
    const steer = clamp(s.rud + s.rIn * 0.5, -1, 1) * lerp(32, 4, clamp(gsp / 25, 0, 1)) * DEG;
    const noseOff = s.WHEELS[0].off, crashPen = Math.max(0.5, A.gear.wheelR * 1.4);
    // (the brakes are a travel now, not a switch: s.brake 0..1 (an old boolean still reads as full or off),
    // split left/right when s.brakeL / s.brakeR are given — or, for the keyboard pilot (s.opts.diffBrake
    // unless refused), by the rudder held with the brakes at taxi pace. A wet surface (s.surfaceWet 0..1)
    // shrinks the tyre's grip; stomp past the grip and the wheel locks and slides, gripping less)
    const wetF = lerp(1, 0.55, clamp(s.surfaceWet || 0, 0, 1));
    const bAmt = clamp(s.brake === true ? 1 : +s.brake || 0, 0, 1);
    let bL = s.brakeL != null ? clamp(+s.brakeL || 0, 0, 1) : bAmt, bR = s.brakeR != null ? clamp(+s.brakeR || 0, 0, 1) : bAmt;
    if (s.brakeL == null && s.brakeR == null && s.opts.diffBrake !== false && bAmt > 0) {
      const sp = clamp(s.rud, -1, 1) * 0.6 * clamp(1 - gsp / 15, 0, 1);
      if (sp > 0) { bR = clamp(bAmt * (1 + sp), 0, 1); bL = clamp(bAmt * (1 - sp), 0, 1); }
      else if (sp < 0) { bL = clamp(bAmt * (1 - sp), 0, 1); bR = clamp(bAmt * (1 + sp), 0, 1); }
    }
    s.wheelLock = false;
    let yLoad = F[1];
    const contact = (off, k, c, kind, name) => {
      const rw = qrot(s.q, off), cp = vadd(s.pos, rw), g = groundAt(cp[0], cp[2]), pen = g.h - cp[1];
      if (pen <= 0) return false;
      if (g.water) { crash(s, kind === 'hard' ? '湖に墜落しました' : '湖に着水してしまいました'); return true; }
      const vc = vadd(s.vel, vcross(wW, rw)), vn = vdot(vc, g.n);
      if (kind === 'hard') { crash(s, name + 'が地面に接触しました'); return true; }
      if (kind === 'wheel' && (pen > crashPen || vn < (A.sora ? -6 : -5.08))) { crash(s, `接地の衝撃で脚が壊れました（降下率 ${Math.round(-vn * 196.85)} fpm）`); return true; }
      if (kind === 'skid' && vn < -4) { crash(s, '尾部を強く打ちつけました'); return true; }
      if (kind === 'skid' && !s.tailTouch) { s.tailTouch = true; s.events.push({ t: s.t, type: 'tail_strike' }); }
      const Fn = Math.max(0, k * pen - c * vn);
      let fb = [0, 0, -1];
      if (off === noseOff) fb = [Math.sin(steer), 0, -Math.cos(steer)];
      let fwd = qrot(s.q, fb); fwd = vnorm(vsub(fwd, vscale(g.n, vdot(fwd, g.n))));
      const lat = vnorm(vcross(g.n, fwd)), vl = vdot(vc, fwd), vt = vdot(vc, lat);
      const mu = (kind === 'skid' ? 0.5 : g.paved ? 0.85 : 0.6) * (kind === 'wheel' ? wetF : 1);
      let bCoef = 0, locked = false;
      if (kind === 'wheel' && off !== noseOff) {
        const bw = off[0] < 0 ? bL : bR;
        bCoef = bw * (g.paved ? 0.42 : 0.3);
        if (bw > 0.85 && mu < 0.6) { locked = true; bCoef *= 0.65; s.wheelLock = true; }   // (past the grip the tyre stops turning, and a sliding wheel brakes worse than a rolling one at its limit)
      }
      const rr = kind === 'skid' ? 0.5 : (g.paved ? 0.02 : 0.05) + bCoef;
      const Ft = clamp(-vt * 9 * AC.mass, -(locked ? mu * 0.6 : mu) * Fn, (locked ? mu * 0.6 : mu) * Fn), Fl = clamp(-vl * 6 * AC.mass, -rr * Fn, rr * Fn);
      const Fc = vadd(vadd(vscale(g.n, Fn), vscale(fwd, Fl)), vscale(lat, Ft));
      Fw[0] += Fc[0]; Fw[1] += Fc[1]; Fw[2] += Fc[2];
      const tq = vcross(rw, Fc); Tw[0] += tq[0]; Tw[1] += tq[1]; Tw[2] += tq[2];
      yLoad += vdot(qrot(qi, Fc), [0, 1, 0]);
      return true;
    };
    const reach = Math.max(8, AC.b * 0.6);
    if (agl < reach) {
      for (let i = 0; i < s.WHEELS.length; i++) s.contacts[i] = s.gearPos > 0.98 ? contact(s.WHEELS[i].off, s.WHEELS[i].k, s.WHEELS[i].c, 'wheel') : false;
      contact(s.TAILSKID.off, s.TAILSKID.k, s.TAILSKID.c, 'skid');
      for (const h of s.HARDPTS) { if (s.crashed) break; contact(h.off, 0, 0, 'hard', h.name); }
    } else {
      if (A.sora && agl < reach + 30) for (const h of s.HARDPTS) { if (s.crashed) break; contact(h.off, 0, 0, 'hard', h.name); }
      s.contacts.fill(false);
    }
    if (s.crashed) { derive(s); return s; }
    // --- integrate
    Fw[1] -= AC.mass * G;
    const saved = { pos: s.pos, vel: s.vel, q: s.q, w: s.w.slice() };
    s.vel = vmadd(s.vel, Fw, dt / AC.mass);
    s.pos = vmadd(s.pos, s.vel, dt);
    const Tt = vadd(Tb, qrot(qi, Tw)), Iw = [AC.I[0] * s.w[0], AC.I[1] * s.w[1], AC.I[2] * s.w[2]], gyro = vcross(s.w, Iw);
    for (let k = 0; k < 3; k++) s.w[k] += (Tt[k] - gyro[k] - AC.I[k] * s.w[k] * 0.05) / AC.I[k] * dt;
    const dq = qmul(s.q, [s.w[0], s.w[1], s.w[2], 0]);
    s.q = qnorm([s.q[0] + 0.5 * dt * dq[0], s.q[1] + 0.5 * dt * dq[1], s.q[2] + 0.5 * dt * dq[2], s.q[3] + 0.5 * dt * dq[3]]);
    if (![...s.pos, ...s.vel, ...s.q, ...s.w].every(Number.isFinite)) { Object.assign(s, saved); crash(s, '機体が制御不能になりました'); derive(s); return s; }
    // --- the touchdown, measured with the velocity this step began with (what the aircraft arrived with)
    const wasMain = s.mainContact, wasGround = s.onGround;
    s.mainContact = s.contacts.some((c, i) => c && i > 0);
    s.onGround = s.contacts.some(c => c);
    if (s.onGround && !wasGround) { s.gndAir = s.airTime; s.gndVel = saved.vel; if (s.airTime > 1.5) { s.firstWheel = s.contacts.findIndex(c => c); s.tailTouch = false; } }
    const air = wasGround ? s.gndAir || 0 : s.airTime;
    if (s.mainContact && !wasMain && air > 1.5 && !(wasGround && s.td && s.t - s.td.t < 5)) onTouchdown(s, wasGround ? s.gndVel : saved.vel);
    else if (s.mainContact && !wasMain && air > 0.25 && s.td) s.td.bounces++;
    s.airTime = s.onGround ? 0 : s.airTime + dt;
    s.alpha = alpha; s.beta = beta; s.tas = V; s.ias = V * Math.sqrt(atm.sigma); s.rudEff = rudEff;
    s.stallW = stallW; s.stallWarn = !s.onGround && V > 8 && alpha > aS - 0.045;
    s.gLoad = lerp(s.gLoad, yLoad / (AC.mass * G), 0.1);
    s.agl = agl; s.vs = s.vel[1];
    // engine rpm, fuel
    let rpmSum = 0;
    s.eng.forEach(e => { const rt = e.run ? rpmFor(A, thrOf(e), u, pw * (0.3 + 0.7 * (e.powK == null ? 1 : e.powK))) : e.feather ? 0 : rpmFor(A, 0, u, 1, true); e.rpm = (e.rpm || 0) + (rt - (e.rpm || 0)) * Math.min(1, dt * 1.8); e.ang = ((e.ang || 0) + e.rpm / 60 * Math.PI * 2 * dt) % (Math.PI * 2); rpmSum += e.rpm; });   // a fixed-pitch prop turns slower on a weak mixture or an iced carburettor (a governed one holds its rpm and shows it in the manifold pressure instead)
    s.rpm = rpmSum / nE;
    s.propAng = (s.propAng + s.rpm / 60 * Math.PI * 2 * dt) % (Math.PI * 2);
    // fuel: each running engine burns its own flow — its shaft power at BSFC, metered by its mixture — out of the
    // tank that feeds it (its selector's tank), so the two gauges fall as the tanks really are (the total flow is
    // unchanged at full rich)
    let ffT = 0;
    for (const e of s.eng) {
      e.ff = e.run ? (e.shaftW || 0) / 745.7 * 0.078 * (e.ffK == null ? 1 : e.ffK) : 0;   // US gal/h (about 0.47 lb/hp/h, teaching value)
      ffT += e.ff;
      if (e.ff > 0 && e.feed >= 0 && s.fuel[e.feed] > 0) s.fuel[e.feed] = Math.max(0, s.fuel[e.feed] - e.ff * dt / 3600);
    }
    s.fuelFlow = ffT;
    s.fuelUsed = (s.fuelUsed || 0) + ffT * dt / 3600;          // (the totalizer: everything burned since it was last zeroed)
    // oil quantity and pressure, and the per-cylinder temperatures (this copy carries no gauge oil of its
    // own — CADET's systems module keeps the cockpit's — but the state is the physics', as in FLIGHT LAB)
    { const oatF = (atm.T - 273.15) * 9 / 5 + 32;
      for (const e of s.eng) {
        if (e.oilT == null) e.oilT = oatF;
        if (e.run) e.oilQ = Math.max(0, (e.oilQ == null ? 7 : e.oilQ) - 0.08 * dt / 3600 * (0.5 + thrOf(e)));
        let pTgt = e.run ? clamp(55 + e.rpm * 0.012, 0, 85) : 0;
        if (e.run && (e.oilQ == null ? 7 : e.oilQ) < 2.5) pTgt *= clamp(0.3 + 0.7 * ((e.oilQ == null ? 7 : e.oilQ) / 2.5), 0.3, 1) * (e.rpm > 2000 ? 0.8 : 1);
        e.oilP = (e.oilP || 0) + (pTgt - (e.oilP || 0)) * Math.min(1, dt * 1.5);
        const tTgt = e.run ? 130 + 70 * clamp(thrOf(e), 0, 1) : oatF;
        e.oilT += (tTgt - e.oilT) * dt / (e.run ? 240 : 600);
        if (!e.cyl) e.cyl = [0, 1, 2, 3].map(() => ({ egt: e.egt || 70, cht: oatF }));
        const egtSp = [0.96, 1.0, 1.07, 1.03], chtSp = [0.97, 1.0, 1.06, 1.02];
        e.cyl.forEach((c, ci) => {
          c.egt += ((e.egt || 70) * egtSp[ci] - c.egt) * Math.min(1, dt / 2.5);
          const chtT = oatF + (e.run ? (215 + 195 * clamp(thrOf(e), 0, 1)) * chtSp[ci] : 0);
          const tau = chtT > c.cht ? 150 : (thrOf(e) < 0.35 && u > 30 ? 45 : 240);
          c.cht += (chtT - c.cht) * dt / tau;
        });
      } }
    // pitot ice: in visible moisture (a lesson or a day sets s.pitotRisk, as with carburettor ice; the band is
    // around freezing) with the heat off, the tube blocks over a minute or two; the heat prevents it, and
    // melts an existing blockage back off in tens of seconds
    { const oatC = atm.T - 273.15;
      if (s.pitotHeat) s.pitotIce = Math.max(0, (s.pitotIce || 0) - dt / 20);
      else if ((s.pitotRisk || 0) > 0 && oatC > -12 && oatC < 6) s.pitotIce = Math.min(1, (s.pitotIce || 0) + dt * s.pitotRisk / 90); }
    runwayChecks(s);
    derive(s);
    return s;
  }
  function crash(s, why) {
    if (s.crashed) return;
    s.crashed = true; s.crashReason = why; s.vel = [0, 0, 0]; s.w = [0, 0, 0];
    s.events.push({ t: s.t, type: 'crash', why });
  }
  // the touchdown record: sink rate, speed, attitude, crab, side drift, where on the runway, the first wheel
  function onTouchdown(s, v0) {
    const a = attitude(s), n = -s.pos[2], e = s.pos[0], rc = rwyCoords(LAB_RWY, n, e), h = LAB_RWY.trueHdg * DEG;
    const perp = [Math.cos(h), 0, Math.sin(h)];                    // (world x east, z south: the runway's right-hand direction)
    const latV = v0[0] * perp[0] + v0[2] * perp[2];
    const fpm = Math.round(-v0[1] * 196.85), onR = onRunway(LAB_RWY, n, e);
    s.td = { t: s.t, fpm, kias: Math.round(s.ias * KT), gsKt: Math.round(Math.hypot(v0[0], v0[2]) * KT), pitch: +a.pitch.toFixed(1), bank: +a.bank.toFixed(1),
      crab: +Math.abs(wrap180(a.hdg - LAB_RWY.trueHdg)).toFixed(1), latV: +latV.toFixed(2), along: Math.round(rc.along), cross: +rc.cross.toFixed(1),
      onRunway: onR, noseFirst: s.firstWheel === 0, bounces: 0 };
    s.events.push({ t: s.t, type: 'touchdown', ...s.td });
    if (fpm > 600) s.events.push({ t: s.t, type: 'hard_landing', fpm });
    if (!onR) s.events.push({ t: s.t, type: 'off_runway_touchdown' });
    if (Math.abs(a.bank) > 15 && !s.crashed) crash(s, '大きく傾いたまま接地（翼端接触）');
  }
  // rolling off the paved runway after being on it
  function runwayChecks(s) {
    const n = -s.pos[2], e = s.pos[0], onR = onRunway(LAB_RWY, n, e), gsMs = Math.hypot(s.vel[0], s.vel[2]);
    if (s.onGround && onR) { s.wasOnRunway = true; s.lastRwyT = s.t; }
    if (s.onGround && !onR && s.wasOnRunway && gsMs > 1.5 && s.t - s.lastRwyT < 30 && !s._excursion && !pavedAt(n, e)) { s._excursion = true; s.events.push({ t: s.t, type: 'runway_excursion' }); }
    if (!s.onGround && s.airTime > 5) { s.wasOnRunway = false; s._excursion = false; }
  }

  // ---------------------------------------------------------------- what the instruments read
  function attitude(s) {
    const f = qrot(s.q, [0, 0, -1]), r = qrot(s.q, [1, 0, 0]), up = qrot(s.q, [0, 1, 0]);
    return { pitch: Math.asin(clamp(f[1], -1, 1)) / DEG, bank: Math.atan2(-r[1], up[1]) / DEG, hdg: wrap360(Math.atan2(f[0], -f[2]) / DEG) };
  }
  function windNow(s) { return windAt(s, s.t, Math.max(s.agl || 0, 0) + 2); }
  function derive(s) {
    const o = s.out, A = s.A, a = attitude(s), atm = atmos(s.pos[1], s.oatDev);
    const wnd = windNow(s), va = vsub(s.vel, wnd), V = vlen(va);
    const vb = qrot(qconj(s.q), va);
    o.tas = V * KT; o.ias = V * Math.sqrt(atm.sigma) * KT * (vb[2] < 0 ? 1 : 0);
    // the pitot side as the instruments suffer it: a partly blocked tube leaks the reading away; a fully
    // blocked one freezes it where it was (the classic trap: a speed that will not change with pitch or power)
    o.pitotIce = s.pitotIce || 0; o.pitotBlocked = (s.pitotIce || 0) >= 0.999;
    if (o.pitotBlocked) { if (s._iasFrz == null) s._iasFrz = o.ias; o.ias = s._iasFrz; }
    else { s._iasFrz = null; if (o.pitotIce > 0) o.ias *= 1 - 0.8 * o.pitotIce; }
    o.staticBlocked = !!s.staticBlocked && !s.altStatic; o.altStatic = !!s.altStatic;
    o.gs = Math.hypot(s.vel[0], s.vel[2]) * KT;
    o.trk = o.gs > 1 ? wrap360(Math.atan2(s.vel[0], -s.vel[2]) / DEG) : a.hdg;
    o.hdgTrue = a.hdg; o.pitch = a.pitch; o.bank = a.bank;
    o.vsi = s.vel[1] * 196.85;
    o.altTrue = s.pos[1] * FT; o.agl = (s.pos[1] + s.WHEEL_BOTTOM - GROUND_M) * FT;
    // the static side: a blocked port freezes the altimeter and the vertical-speed indicator where they were;
    // the alternate static source (the cabin) unfreezes them, reading about 80 ft high for the lower pressure
    if (o.staticBlocked) { if (s._altFrz == null) s._altFrz = o.altTrue; o.altTrue = s._altFrz; o.vsi = 0; } else s._altFrz = null;
    if (s.altStatic && s.staticBlocked) o.altTrue += 80;
    o.alpha = V > 2 ? Math.atan2(-vb[1], -vb[2]) / DEG : 0;
    o.beta = V > 2 ? Math.asin(clamp(vb[0] / V, -1, 1)) / DEG : 0;
    const flapF = A.wing.flap ? s.flapDeg / 30 : 0;
    o.aStall = (s.AC.aStall - s.AC.flapStall * flapF) / DEG;
    o.aoaFrac = clamp((o.alpha + 4) / (o.aStall + 4), 0, 1.2);
    o.stallWarn = s.stallWarn;
    o.slip = clamp(o.beta * 0.35, -1.5, 1.5);
    o.windFrom = s.wind.fromDeg; o.windKt = Math.hypot(wnd[0], wnd[2]) * KT;
    o.rpm = s.rpm; o.rpms = s.eng.map(e => e.rpm || 0); o.fuelFlow = s.fuelFlow || 0; o.fuel = s.fuel.slice();
    o.mag = s.eng[0] ? s.eng[0].mag || 'BOTH' : 'BOTH'; o.mix = s.eng[0] ? s.eng[0].lev ?? s.eng[0].mix ?? 1 : 1; o.fuelSel = s.eng[0] ? s.eng[0].sel || 'L' : 'L';   // the systems of the first engine (the mixture as the lever the engine answers to); every engine's in the arrays
    o.mags = s.eng.map(e => e.mag || 'BOTH'); o.mixs = s.eng.map(e => e.lev ?? e.mix ?? 1); o.fuelSels = s.eng.map(e => e.sel || 'L'); o.cranking = s.eng.some(e => e.on === false && e.mag === 'START');
    // % power from the shaft power the model actually makes (throttle × the density factor × the mixture), not from
    // the lever's position: it falls with altitude and with a bad mixture, as the real gauge story does. At sea level,
    // full rich, it is the old number.
    const pwD = Math.max(0, 1.132 * atm.sigma - 0.132);
    o.powerPct = engineRunning(s) ? Math.round(s.eng.reduce((a, e) => a + (e.run ? (0.04 + 0.96 * (e.thr != null ? e.thr : s.thr)) * pwD * (e.mixK == null ? 1 : e.mixK) : 0), 0) / s.eng.length * 100) : 0;
    o.egts = s.eng.map(e => Math.round(e.egt || 0)); o.egt = o.egts[0];
    o.oilQ = s.eng.map(e => Math.round((e.oilQ == null ? 7 : e.oilQ) * 10) / 10);
    o.lowOilPress = s.eng.some(e => e.run && (e.oilP || 0) < 30);
    o.fuelPress = Math.round((s.eng[0] ? s.eng[0].fuelPress || 0 : 0) * 100) / 100; o.fuelPresses = s.eng.map(e => Math.round((e.fuelPress || 0) * 100) / 100);
    o.fuelUsed = Math.round((s.fuelUsed || 0) * 10) / 10; o.fuelRemain = Math.round((s.fuel[0] + s.fuel[1]) * 10) / 10;
    o.enduranceH = (s.fuelFlow || 0) > 0.2 ? Math.round(o.fuelRemain / s.fuelFlow * 10) / 10 : null;
    o.cyl = (s.eng[0] && s.eng[0].cyl) ? s.eng[0].cyl.map(c => ({ egt: Math.round(c.egt), cht: Math.round(c.cht) })) : [];
    o.cyls = s.eng.map(e => (e.cyl || []).map(c => ({ egt: Math.round(c.egt), cht: Math.round(c.cht) })));
    o.cht = o.cyl.length ? Math.round(o.cyl.reduce((a, c) => a + c.cht, 0) / o.cyl.length) : 0; o.chts = o.cyls.map(cs => cs.length ? Math.round(cs.reduce((a, c) => a + c.cht, 0) / cs.length) : 0);
    o.gearFault = !!s.gearFault; o.gearEmerg = !!s.gearEmerg; o.xfeed = !!s.xfeed;
    o.manIns = s.eng.map(e => Math.round((e.manIn || 0) * 10) / 10); o.manIn = o.manIns[0];
    o.rough = Math.max(0, ...s.eng.map(e => e.rough || 0));
    o.carbIce = Math.max(0, ...s.eng.map(e => e.carbIce || 0));
    o.oat = atm.T - 273.15; o.g = s.gLoad; o.densAlt = (s.densAlt || 0) * FT;
    const n = -s.pos[2], e = s.pos[0];
    o.onRunway = onRunway(LAB_RWY, n, e);
    const rc = rwyCoords(LAB_RWY, n, e); o.rwyAlong = rc.along; o.rwyCross = rc.cross;
    // the stall speeds at today's weight (the book's numbers are at the reference load): they grow with √weight
    const wSqrt = Math.sqrt(s.AC.mass / A.phys.mass);
    o.vs0 = Math.round(A.v.s0 * wSqrt * 10) / 10; o.vs1 = Math.round(A.v.s1 * wSqrt * 10) / 10;
    o.flapLabel = A.flapLabels[s.flapIdx]; o.gearDown = s.gearDown; o.gearPos = s.gearPos;
    return o;
  }

  // ---------------------------------------------------------------- placing the aircraft
  const ne = s => ({ n: -s.pos[2], e: s.pos[0] });
  function resetState(s) {
    s.vel = [0, 0, 0]; s.w = [0, 0, 0]; s.onGround = false; s.mainContact = false; s.crashed = false; s.crashReason = '';
    s.events = []; s.td = null; s.tailTouch = false; s.firstWheel = -1; s.gLoad = 1; s.pTgt = null; s.pHI = 0; s.gI = 0; s.bI = 0;
    s.trimHold = 0; s.trimTgt = null; s.engStopNoted = false; s.wasOnRunway = false; s._excursion = false; s.pIn = 0; s.rIn = 0; s.rud = 0; s.ovr = null; s._stH = null;
    s.eng.forEach((e, i) => Object.assign(e, { failed: false, feather: false, cut: false, thr: null, mag: 'BOTH', mix: 1, sel: i ? 'R' : 'L', on: true, crankT: 0, lineT: LINE_FUEL_S, carbIce: 0, iceNoted: false, magBad: null, pumpFail: false, pressT: 0 }));
    s.pitotIce = 0; s.staticBlocked = false; s._iasFrz = null; s._altFrz = null; s.gearFault = false; s.gearEmerg = false; s.gearEmergT = 0;
    s._mixCmd = s.mix; s._selCmd = s.fuelSel;   // the reset engines are in the running configuration above; the shared controls command them again when they next move
  }
  // on the runway, stopped, `along` metres past the threshold
  function placeOnRunway(s, rwy = LAB_RWY, along = 30) {
    resetState(s);
    const [n, e] = rwyToNE(rwy, along, 0);
    s.q = qFromHPB(rwy.trueHdg, 0, 0);
    s.pos = [e, GROUND_M - s.WHEEL_BOTTOM + 0.02, -n];         // (the wheels just touching)
    s.flapIdx = 0; s.flapDeg = 0; s.thr = 0; s.trim = 0; s.brake = false; s.gearDown = true; s.gearPos = 1;
    s.onGround = true; s.airTime = 0; s.wasOnRunway = true; s.lastRwyT = s.t;
    s.contacts = s.WHEELS.map(() => true);
    s.rpm = rpmFor(s.A, 0, 0); for (const en of s.eng) en.rpm = s.rpm;
    derive(s);
    return s;
  }
  // in the air: n, e (m), altitude ft MSL, true heading, IAS kt, climb angle (deg), flap detent, throttle (null: for the steady state)
  function placeInAir(s, n, e, altFt, hdgTrue, kias, gammaDeg = 0, flapIdx = 0, thr = null) {
    resetState(s);
    const A = s.A, atm = atmos(altFt / FT, s.oatDev), kt = kias / Math.sqrt(atm.sigma);
    s.flapIdx = A.wing.flap ? flapIdx : 0; s.flapDeg = FLAP_DEG[s.flapIdx];
    const v = kt / KT, ff = A.wing.flap ? s.flapDeg / 30 : 0, tr = trimFor(s, v, ff, Math.cos(gammaDeg * DEG), atm.rho);
    s.trim = clamp(tr.elev, -TRIM_MAX, TRIM_MAX); s.trimHold = 0;
    s.pos = [e, altFt / FT, -n]; s.q = qFromHPB(hdgTrue, tr.alpha / DEG + gammaDeg, 0);
    const dir = [Math.sin(hdgTrue * DEG), 0, -Math.cos(hdgTrue * DEG)];
    const w = windAt(s, s.t, altFt / FT - GROUND_M);
    s.vel = vadd(vadd(vscale(dir, v * Math.cos(gammaDeg * DEG)), [0, v * Math.sin(gammaDeg * DEG), 0]), [w[0], 0, w[2]]);
    s.gearDown = A.gear.fixed ? true : gammaDeg < -1 || flapIdx > 0; s.gearPos = s.gearDown ? 1 : 0;
    if (thr == null) { const ss = steadyState(s, kias, Math.sin(gammaDeg * DEG) * v * 196.85, { altFt, flaps: s.flapIdx, gear: s.gearDown }); thr = clamp(ss.thr, 0, 1); }
    s.thr = thr;
    s.airTime = 10; s.onGround = false; s.mainContact = false; s.contacts = s.WHEELS.map(() => false);
    s.rpm = rpmFor(A, thr, v); for (const en of s.eng) en.rpm = s.rpm;
    s.pTgt = attitude(s).pitch;
    derive(s);
    return s;
  }

  FL.physics = {
    DEG, KT, FT, G, GROUND_FT, GROUND_M, MAGVAR_W, LAB_RWY, LAKES, PAVED, AIRCRAFT, FLAP_DEG, TRIM_MAX, SENS,
    clamp, lerp, wrap360, wrap180, qrot, qconj, qmul, qFromHPB, vadd, vsub, vscale, vnorm, vcross, vdot, vlen,
    rwyCoords, rwyToNE, onRunway, pavedAt, inLake, groundAt, atmos, rpmFor, windAt, windNow,
    newState, setAircraft, step, derive, attitude, trimFor, trimLevel, steadyState, placeOnRunway, placeInAir, ne, engineRunning,
    MAG_POS, MIX_OFF, MIX_RICH, CATCH_S, LINE_FUEL_S,
    WB, stdLoading, cleanLoading, computeWB, applyLoading, PERSON_KG, FUEL_KG_GAL, LB_KG,
    SORAJIMA: true,
  };
})(FL);
  return FL.physics;
}

