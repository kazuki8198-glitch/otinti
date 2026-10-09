// FLIGHT LAB — physics.js
// The flight model of 空島フライト (Sorajima Flight), carried over: blade-element aerodynamics (the wing cut into
// strips, the tailplane and the fin into pieces, each with its own airflow, angle of attack and stall), tuned at
// load time to the aircraft's reference stability data; a propeller with its left-turning tendencies (slipstream,
// P-factor, torque, gyroscopic precession); the three wheels on springs and dampers with brakes and nose-wheel
// steering; ground effect; turbulence that varies across the span; the keyboard pitch hold, the stick curves and the
// optional assists exactly as there. The world here is the app's own flat teaching ground (55 ft) with the fictional
// LAB RWY 36 and its lakes. Numbers are TEACHING VALUES (仮想教材値); the reference speeds of the two aircraft follow
// published training checklists (sources in the documents), but this is not the aircraft's certified performance.
// Axes (as in Sorajima): world x = east, y = up, z = south; body x = right wing, y = up, -z = the nose.
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
      eye: [-0.3, 0.56, -0.4], flapLabels: ['UP', '10°', '25°', '40°'], fuelCap: 24,
      phys: {
        mass: 1050, S: 15.8, b: 10.8, c: 1.6, L: 7.25, CL0: 0.28, CLa: 4.8, aStall: 0.28, CD0: 0.032, K: 0.05, CDgear: 0,
        Cm0: 0.015, Cma: -1.1, Cmde: 0.34, Cmq: -15, Clda: 0.055, Clp: -0.5, Clb: -0.12, Cnb: 0.1, Cndr: 0.03, Cnr: -0.14, CYb: -0.6,
        flapCL: 0.55, flapStall: 0.045, flapCD: 0.7, engine: { type: 'prop', P: 134000, T0: 2400, eta: 0.85, etaK: 0.8 }, maxG: 3.8, rollRate: 55, pitchRate: 12,
      },
      // reference speeds (KIAS). Rotation, climb, Vx / Vy, glide, final approach, go-around, Va, Vfe, the crosswind: the published
      // Archer III G1000 training checklist (MGA 2025); Vso / Vs1, Vno, Vne: teaching values (機体ごとに要確認, the POH governs)
      v: { s0: 45, s1: 50, rotate: 60, x: 64, y: 76, climb: 87, glide: 76, glideLand: 66, appr: 70, apprShort: 65, ga: 64, va: 113, fe: 102, no: 125, ne: 154, xwind: 17,
        apprFlaps: 3, apprThr: 0.3, cruise: 110, cruiseThr: 0.79, toFlaps: 0, descMax: 122 },
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
      // Vr 75, Vx 82, Vy 88, Vxse 82–88 (sources differ), Vsse 82, Vyse 88 (blue line), Vfe 111, Vlo 109 / 140, Vle 140, Vno 169, Vne 202, Va 135
      v: { s0: 55, s1: 57, mc: 56, rotate: 75, x: 82, y: 88, xse: 82, sse: 82, yse: 88, glide: 88, appr: 88, apprFull: 80, ga: 88, va: 135, fe: 111, lo: 109, le: 140, no: 169, ne: 202, xwind: 17,
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
    return E;
  }
  // forces (body frame) and moments about the CG from every piece. o: flapF, elev, ail, rud, dq (slipstream on the tail), hgt(p), gust(p)
  function aeroElements(E, P, vb, w, rho, o) {
    const F = [0, 0, 0], M = [0, 0, 0];
    const V = Math.hypot(vb[0], vb[1], vb[2]) || 1, sb = vb[0] / V;
    let clw = 0, stw = 0, eps = 0;
    const aS0 = P.aStall - P.flapStall * o.flapF;
    for (let pass = 0; pass < 2; pass++) for (const p of E.pcs) {
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
      const over = Math.max(a - aS, -aS - 0.06 - a), st = smoothstep(0, 0.07, over);
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
      if (pass === 0) eps = E.deps * (clw / P.S) / P.CLa;
    }
    return { F, M, CLw: clw / P.S, stallW: stw / P.S };
  }

  // the derived aircraft: inertia, wheels, the points that must not touch the ground, the propeller's arms, the pieces
  function deriveAircraft(A, mass) {
    const P = { ...A.phys, mass: mass || A.phys.mass }, m = P.mass;
    const I = [m * (0.18 * P.L) ** 2, m * (0.19 * (P.L + P.b) / 2) ** 2, m * (0.12 * P.b) ** 2];
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
    pr.rig = (0.04 + 0.96 * thrC) * Eng.P / 0.85 / omC * pr.tq / qc;
    const ac2 = { ...P, I, prop: pr, Cnda: P.Cnda ?? -0.1 * P.Clda, Cnp: P.Cnp ?? -0.04, Clr: P.Clr ?? 0.06 };
    ac2.el = buildElements(A, ac2);
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
  function windAt(s, t, agl) {
    const W = s.wind || { fromDeg: 0, kt: 0, gust: 0.4 }, from = W.fromDeg * DEG, sp = W.kt / KT, k = W.gust ?? 1;
    const gust = Math.min(1, Math.max(agl, 0) / 300 + 0.4) * k, wg = windGradient(agl);
    const w = [-Math.sin(from) * sp, 0, Math.cos(from) * sp];
    return [w[0] * wg + perlin(t * 0.35, 1.7) * 1.4 * gust, perlin(t * 0.5, 4.4) * 0.5 * gust, w[2] * wg + perlin(t * 0.31, 8.2) * 1.1 * gust];
  }

  // the thrust of one engine (N): the static pull at low speed, then the shaft power through the propeller, whose
  // efficiency grows with airspeed up to about 0.85 near its design speed (a fixed-pitch climb propeller is far less
  // efficient at climb speed than in cruise). th: throttle 0..1, V: forward speed m/s, pw: power left at this density.
  function propThrust(P, th, V, pw, nE = 1) {
    const ua = Math.max(V, 1), eta = P.engine.eta * Math.pow(Math.min(1, ua / P.prop.Vd), P.engine.etaK);
    return (0.04 + 0.96 * th) * pw * Math.min(P.engine.T0 / nE * (1 - 0.25 * Math.min(V / P.prop.Vd, 1)), eta * P.engine.P / nE / ua);
  }
  // ---------------------------------------------------------------- trim and the steady states the instructor quotes
  const TRIM_MAX = 0.45;
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
    const P = s.AC, A = s.A, atm = atmos((o.altFt ?? 3000) / FT), W = P.mass * G;
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
  function applyControls(s, V, alpha, qd, qdc, flapF, aS, cl0) {
    const AC = s.AC, A = s.A, o = s.opts, sens = SENS[o.sens] || SENS.low;
    const airborne = !s.onGround && s.airTime > 0.6 && V > 12, leveling = (o.levelT || 0) > 0;
    s.assistOn = (o.assist || leveling) && airborne && !s.crashed;
    const holdP = s.keyHold && !leveling && !s.crashed && V > 12 && !s.ovr && !s.onGround;
    if (!holdP) s.pHI = 0;
    if (!s.assistOn) {
      s.gI = 0; s.bI = 0;
      const vr = A.v.cruise / KT, spd = Math.max(V, 12);
      const pMax = Math.min(1, sens.pMax * clamp(vr / spd, 1, 2.6)), rMax = Math.min(1, sens.rMax * clamp(vr / spd, 1, 2));
      const kg = s.onGround ? 1 : s.airTime < 3 ? 1 - s.airTime / 3 : 0;     // full elevator for the rotation, blended out after lift-off
      const lin = Math.max(clamp(0.45 + (vr / spd - 1) * 0.35, 0.45, 0.8), 0.45 + 0.35 * kg);
      const shape = (x, a) => a * x + (1 - a) * x * x * x;
      const kp = Math.max(pMax, kg);
      let el = kp * shape(clamp(s.pIn, -1, 1), lin);
      if (s.trimHold) { if (Math.abs(s.pIn) < 0.04 || Math.sign(el) !== Math.sign(s.trimHold)) s.trimHold = 0; else el -= Math.sign(el) * Math.min(Math.abs(el), Math.abs(s.trimHold)); }
      s.elev = clamp(el, -1, 1); s.ail = clamp(rMax * shape(clamp(s.rIn, -1, 1), 0.45), -1, 1);
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

  // ---------------------------------------------------------------- the state
  function newState(o = {}) {
    const s = {
      t: 0, pos: [0, GROUND_M + 1.4, 0], vel: [0, 0, 0], q: [0, 0, 0, 1], w: [0, 0, 0],
      thr: 0, elev: 0, ail: 0, rud: 0, trim: 0, brake: false, pIn: 0, rIn: 0, flapIdx: 0, flapDeg: 0, gearDown: true, gearPos: 1,
      rpm: 0, propAng: 0, onGround: false, mainContact: false, airTime: 0, crashed: false, crashReason: '',
      alpha: 0, beta: 0, ias: 0, tas: 0, gLoad: 1, stallW: 0, stallWarn: false, agl: 0, vs: 0, contacts: [],
      keyHold: true, pTgt: null, pRate: 0, dead: false,
      opts: { sens: 'low', assist: false, autoRud: false, levelT: 0 },
      wind: { fromDeg: 0, kt: 0, gust: 0.4 }, qnh: 29.92, oatDev: 0, fuel: [0, 0], fuelFlow: 0,
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
    s.eng = Array.from({ length: A.engines1 || 1 }, () => ({ run: true, failed: false, feather: false, cut: false, thr: null, rpm: 0 }));
    s.gearDown = true; s.gearPos = 1;
    return s;
  }
  const engineRunning = s => s.eng.some(e => e.run);

  // ---------------------------------------------------------------- one step (dt = 1/120 s)
  function step(s, dt) {
    if (s.crashed) { derive(s); return s; }
    const A = s.A, AC = s.AC;
    s.t += dt;
    if ((s.opts.levelT || 0) > 0) s.opts.levelT -= dt;
    s.flapDeg += clamp(FLAP_DEG[s.flapIdx] - s.flapDeg, -8 * dt, 8 * dt);
    if (A.gear.fixed) { s.gearDown = true; s.gearPos = 1; }
    else if (!(s.onGround && !s.gearDown)) s.gearPos = clamp(s.gearPos + (s.gearDown ? dt : -dt) / 6, 0, 1);
    const flapF = A.wing.flap ? s.flapDeg / 30 : 0;
    const atm = atmos(s.pos[1], s.oatDev), rho = atm.rho;
    const ground = groundAt(s.pos[0], s.pos[2]);
    const agl = s.pos[1] + s.WHEEL_BOTTOM - ground.h;
    const qi = qconj(s.q);
    const vb = qrot(qi, vsub(s.vel, windAt(s, s.t, agl + 2)));
    const V = vlen(vb), u = -vb[2];
    const alpha = Math.atan2(-vb[1], u), beta = V > 0.5 ? Math.asin(clamp(vb[0] / V, -1, 1)) : 0;
    const qd = 0.5 * rho * V * V;
    // engines: each one's state (failure, mixture cut-off, feather), its own throttle when set
    for (const e of s.eng) e.run = !e.failed && !e.cut && s.fuel[0] + s.fuel[1] > 0;
    if (!s.eng[0].run && !s.engStopNoted && (A.engines1 || 1) === 1) { s.engStopNoted = true; s.events.push({ t: s.t, type: 'engine_stop', why: s.eng[0].failed ? '故障（教材の想定）' : s.eng[0].cut ? 'ミクスチャー カットオフ' : '燃料切れ' }); }
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
    s.eng.forEach((e, i) => {
      const th = thrOf(e), P1 = Eng.P / nE;
      let Ti;
      if (!e.run) Ti = -(e.feather ? 0.003 : 0.026 / nE) * qd * AC.S * (AC.mass / 1050 / nE) ** 0.3;          // windmilling (or feathered) propeller drag
      else {
        Ti = propThrust(AC, th, ua, pw, nE) - (1 - th) * 2.5 * ua * AC.mass / 1000 / nE;
        shaft += (0.04 + 0.96 * th) * pw * P1 / 0.85;
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
    let Nx = qd * AC.S * AC.b * EL.dCnda * s.ail + hv * AC.S * AC.b * AC.b * EL.dCnp * p - Tasym, Rl = 0, Ng = 0;
    if (nE === 2) Rl += -Tasym * 0.08;                         // the running engine's slipstream lifts its wing: roll toward the dead engine
    {
      const Pr = AC.prop, Tp = Math.max(T, 0);
      s.nProp = -(Tp * (Pr.a0 + Pr.a1 * clamp(alpha, -0.1, 0.35))) + Pr.fin * qd;
      Nx += s.nProp;
      const om = Math.max(s.rpm, 300) * Math.PI / 30;
      Rl += -(s.shaftP || 0) / om * Pr.tq + Pr.rig * qd;        // engine torque reaction (partly rigged out): rolls left
      Ng = Pr.Ip * om * qq * (A.counterRotating ? 0 : 1);       // gyroscopic precession: pitch up -> yaw right
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
    const gA = (s.wind.gust ?? 1) * Math.min(1, Math.max(agl, 0) / 300 + 0.4) * 0.9 * smoothstep(3, 40, agl);
    const gW = perlin(s.t * 0.9, 23.1) * gA / (AC.b / 2), gT = perlin(s.t * 0.7, 41.9) * gA * 0.2;
    const ae = aeroElements(EL, AC, vb, s.w, rho, {
      flapF, elev: elevEff, ail: s.ail, rud: rudEff, dq: 240 * runShare * Math.sqrt(AC.mass / 1000),
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
    const Mp = ae.M[0] + qd * AC.S * AC.c * (AC.Cm0 + EL.dCma * Math.sin(alpha) + EL.dCmF * flapF) + hv * AC.S * AC.c * AC.c * EL.dCmq * qq;
    let Lr = -ae.M[2] + hv * AC.S * AC.b * AC.b * (EL.dClp * p + EL.dClr * r) + Rl;
    if (stallW > 0.15) Lr += qd * AC.S * AC.b * 0.012 * stallW * perlin(s.t * 1.3, 12.5);        // buffet
    const Nr = -ae.M[1] + hv * AC.S * AC.b * AC.b * EL.dCnr * r + Nx + Ng;
    const Tb = [Mp, -Nr, -Lr];
    // --- the wheels and the parts that must not touch (world frame)
    const Fw = qrot(s.q, F), Tw = [0, 0, 0], wW = qrot(s.q, s.w);
    const gsp = Math.hypot(s.vel[0], s.vel[2]);
    const steer = clamp(s.rud + s.rIn * 0.5, -1, 1) * lerp(32, 4, clamp(gsp / 25, 0, 1)) * DEG;
    const noseOff = s.WHEELS[0].off, crashPen = Math.max(0.5, A.gear.wheelR * 1.4);
    let yLoad = F[1];
    const contact = (off, k, c, kind, name) => {
      const rw = qrot(s.q, off), cp = vadd(s.pos, rw), g = groundAt(cp[0], cp[2]), pen = g.h - cp[1];
      if (pen <= 0) return false;
      if (g.water) { crash(s, kind === 'hard' ? '湖に墜落しました' : '湖に着水してしまいました'); return true; }
      const vc = vadd(s.vel, vcross(wW, rw)), vn = vdot(vc, g.n);
      if (kind === 'hard') { crash(s, name + 'が地面に接触しました'); return true; }
      if (kind === 'wheel' && (pen > crashPen || vn < -5.08)) { crash(s, `接地の衝撃で脚が壊れました（降下率 ${Math.round(-vn * 196.85)} fpm、教材基準 1,000 fpm 超）`); return true; }
      if (kind === 'skid' && vn < -4) { crash(s, '尾部を強く打ちつけました'); return true; }
      if (kind === 'skid' && !s.tailTouch) { s.tailTouch = true; s.events.push({ t: s.t, type: 'tail_strike' }); }
      const Fn = Math.max(0, k * pen - c * vn);
      let fb = [0, 0, -1];
      if (off === noseOff) fb = [Math.sin(steer), 0, -Math.cos(steer)];
      let fwd = qrot(s.q, fb); fwd = vnorm(vsub(fwd, vscale(g.n, vdot(fwd, g.n))));
      const lat = vnorm(vcross(g.n, fwd)), vl = vdot(vc, fwd), vt = vdot(vc, lat);
      const mu = kind === 'skid' ? 0.5 : g.paved ? 0.85 : 0.6;
      const rr = kind === 'skid' ? 0.5 : (g.paved ? 0.02 : 0.05) + (s.brake && off !== noseOff ? (g.paved ? 0.42 : 0.3) : 0);
      const Ft = clamp(-vt * 9 * AC.mass, -mu * Fn, mu * Fn), Fl = clamp(-vl * 6 * AC.mass, -rr * Fn, rr * Fn);
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
    } else s.contacts.fill(false);
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
    s.eng.forEach(e => { const rt = e.run ? rpmFor(A, thrOf(e), u, pw) : e.feather ? 0 : rpmFor(A, 0, u, 1, true); e.rpm = (e.rpm || 0) + (rt - (e.rpm || 0)) * Math.min(1, dt * 1.8); e.ang = ((e.ang || 0) + e.rpm / 60 * Math.PI * 2 * dt) % (Math.PI * 2); rpmSum += e.rpm; });
    s.rpm = rpmSum / nE;
    s.propAng = (s.propAng + s.rpm / 60 * Math.PI * 2 * dt) % (Math.PI * 2);
    s.fuelFlow = shaft / 745.7 * 0.078;                       // US gal/h (about 0.47 lb/hp/h, teaching value)
    const used = s.fuelFlow * dt / 3600;
    s.fuel[0] = Math.max(0, s.fuel[0] - used / 2); s.fuel[1] = Math.max(0, s.fuel[1] - used / 2);
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
    o.gs = Math.hypot(s.vel[0], s.vel[2]) * KT;
    o.trk = o.gs > 1 ? wrap360(Math.atan2(s.vel[0], -s.vel[2]) / DEG) : a.hdg;
    o.hdgTrue = a.hdg; o.pitch = a.pitch; o.bank = a.bank;
    o.vsi = s.vel[1] * 196.85;
    o.altTrue = s.pos[1] * FT; o.agl = (s.pos[1] + s.WHEEL_BOTTOM - GROUND_M) * FT;
    o.alpha = V > 2 ? Math.atan2(-vb[1], -vb[2]) / DEG : 0;
    o.beta = V > 2 ? Math.asin(clamp(vb[0] / V, -1, 1)) / DEG : 0;
    const flapF = A.wing.flap ? s.flapDeg / 30 : 0;
    o.aStall = (s.AC.aStall - s.AC.flapStall * flapF) / DEG;
    o.aoaFrac = clamp((o.alpha + 4) / (o.aStall + 4), 0, 1.2);
    o.stallWarn = s.stallWarn;
    o.slip = clamp(o.beta * 0.35, -1.5, 1.5);
    o.windFrom = s.wind.fromDeg; o.windKt = Math.hypot(wnd[0], wnd[2]) * KT;
    o.rpm = s.rpm; o.rpms = s.eng.map(e => e.rpm || 0); o.fuelFlow = s.fuelFlow || 0; o.fuel = s.fuel.slice();
    o.powerPct = engineRunning(s) ? Math.round((0.04 + 0.96 * s.thr) * 100) : 0;
    o.oat = atm.T - 273.15; o.g = s.gLoad; o.densAlt = (s.densAlt || 0) * FT;
    const n = -s.pos[2], e = s.pos[0];
    o.onRunway = onRunway(LAB_RWY, n, e);
    const rc = rwyCoords(LAB_RWY, n, e); o.rwyAlong = rc.along; o.rwyCross = rc.cross;
    o.flapLabel = A.flapLabels[s.flapIdx]; o.gearDown = s.gearDown; o.gearPos = s.gearPos;
    return o;
  }

  // ---------------------------------------------------------------- placing the aircraft
  const ne = s => ({ n: -s.pos[2], e: s.pos[0] });
  function resetState(s) {
    s.vel = [0, 0, 0]; s.w = [0, 0, 0]; s.onGround = false; s.mainContact = false; s.crashed = false; s.crashReason = '';
    s.events = []; s.td = null; s.tailTouch = false; s.firstWheel = -1; s.gLoad = 1; s.pTgt = null; s.pHI = 0; s.gI = 0; s.bI = 0;
    s.trimHold = 0; s.engStopNoted = false; s.wasOnRunway = false; s._excursion = false; s.pIn = 0; s.rIn = 0; s.rud = 0; s.ovr = null;
    for (const e of s.eng) Object.assign(e, { failed: false, feather: false, cut: false, thr: null });
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
  };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
