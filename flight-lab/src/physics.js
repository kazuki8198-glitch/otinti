// FLIGHT LAB — physics.js
// A single-engine propeller trainer, simplified: rigid body with six degrees of freedom, lift / drag / thrust /
// gravity, angle of attack and the stall, pitch / roll / yaw moments from the controls and the aircraft's own
// stability, elevator trim, flaps, wind, the three wheels on a flat ground, engine stop and the glide.
// Every number here is a TEACHING VALUE (仮想教材値): chosen to behave like a light single-engine trainer
// (textbook stability derivatives of a generic four-seat high- or low-wing single), NOT the performance of any
// real aircraft. Real figures come from the aircraft's POH/AFM.
// Coordinates: NED (north, east, down) in metres for the world; body axes x forward, y right, z down.
(function (FL) {
  'use strict';
  const DEG = Math.PI / 180, KT = 1.943844, FT = 3.28084, G = 9.80665;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // ---------------------------------------------------------------- the aircraft (teaching values)
  const TRAINER = {
    name: '単発練習機（教材モデル）',
    mass: 1050,                      // kg
    S: 15.8, b: 10.7, c: 1.5,        // wing area m², span m, mean chord m
    CL0: 0.30, CLa: 4.8,             // lift at zero body angle (wing incidence), lift slope /rad
    aStall: 15.5 * DEG,              // critical angle of attack, flaps up
    CD0: 0.027, k: 0.055,            // parasite drag (fixed gear included), induced drag factor
    flaps: [                         // detents: angle, extra lift, extra drag, stall angle change, pitch moment
      { deg: 0, dCL: 0, dCD: 0, dA: 0, dCm: 0 },
      { deg: 10, dCL: 0.22, dCD: 0.006, dA: -0.5 * DEG, dCm: -0.015 },
      { deg: 25, dCL: 0.45, dCD: 0.020, dA: -1.0 * DEG, dCm: -0.030 },
      { deg: 40, dCL: 0.62, dCD: 0.045, dA: -1.5 * DEG, dCm: -0.045 },
    ],
    // pitch: moment at zero body angle, stability, damping, elevator power, trim power
    Cm0: 0.05, Cma: -0.95, Cmq: -14, Cmde: -1.15, deMax: 0.42, trimMax: 0.22,
    // lateral / directional
    CYb: -0.33, Clb: -0.09, Clp: -0.48, Clr: 0.10, Clda: 0.17, daMax: 0.26,
    Cnb: 0.070, Cnr: -0.11, Cnp: -0.035, Cnda: -0.010, Cndr: 0.075, drMax: 0.42,
    I: [1285, 1825, 2667],           // roll, pitch, yaw inertia kg·m²
    // engine and propeller (fixed pitch)
    Pmax: 107200, eta: 0.60, Tstatic: 2300, rpmIdle: 700, rpmMax: 2700, pFactor: 0.010,   // (effective power at the propeller: teaching value)
    fuelCap: 24,                     // US gal per side (teaching value)
    // wheels (body coordinates from the centre of gravity, metres; z down)
    gear: { nose: [1.65, 0, 1.05], left: [-0.30, -1.60, 1.05], right: [-0.30, 1.60, 1.05] },
    gearK: 52000, gearC: 5200, tail: [-5.6, 0, -0.10],
    steerMax: 22 * DEG,
    // V speeds (knots, indicated) — teaching values for the displays and the tasks, NOT a POH
    V: { s0: 48, s1: 53, r: 55, x: 64, y: 76, glide: 76, app: 66, fe: 102, no: 125, ne: 154, cruise: 105 },
  };

  // ---------------------------------------------------------------- atmosphere (ISA)
  function isa(altM) {
    const h = clamp(altM, -500, 11000), T = 288.15 - 0.0065 * h, p = 101325 * Math.pow(T / 288.15, 5.2559);
    return { T, p, rho: p / (287.05 * T) };
  }
  const RHO0 = 1.225;

  // ---------------------------------------------------------------- rotation (body -> NED) from Euler angles
  function dcm(phi, theta, psi) {
    const cf = Math.cos(phi), sf = Math.sin(phi), ct = Math.cos(theta), st = Math.sin(theta), cp = Math.cos(psi), sp = Math.sin(psi);
    return [
      ct * cp, sf * st * cp - cf * sp, cf * st * cp + sf * sp,
      ct * sp, sf * st * sp + cf * cp, cf * st * sp - sf * cp,
      -st, sf * ct, cf * ct,
    ];
  }
  const mulv = (R, v) => [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];
  const mulTv = (R, v) => [R[0] * v[0] + R[3] * v[1] + R[6] * v[2], R[1] * v[0] + R[4] * v[1] + R[7] * v[2], R[2] * v[0] + R[5] * v[1] + R[8] * v[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const wrap360 = a => ((a % 360) + 360) % 360;
  const wrap180 = a => ((a + 540) % 360) - 180;

  // ---------------------------------------------------------------- the lab runway and the ground
  // The ground is a flat teaching plane (55 ft above sea level, about Sanford's elevation). It is NOT Google's
  // terrain: nothing collides with Google buildings or hills.
  const GROUND_FT = 55, GROUND_M = GROUND_FT / FT;
  // LAB RWY 36: a fictional runway in its own practice area (west of the Sanford display origin), its magnetic
  // heading 360 (true 354 with the teaching variation of 6°W). 1,200 m × 30 m, teaching values.
  const MAGVAR_W = 6;                          // degrees west (teaching value; check current charts for the real one)
  const LAB_RWY = { id: 'LAB RWY 36', n: 0, e: -40000, trueHdg: 354, len: 1200, wid: 30, elevFt: GROUND_FT };
  // runway coordinates: along (m from the threshold, toward the far end) and cross (m right of the centre line)
  function rwyCoords(rwy, n, e) {
    const h = rwy.trueHdg * DEG, dn = n - rwy.n, de = e - rwy.e;
    return { along: dn * Math.cos(h) + de * Math.sin(h), cross: -dn * Math.sin(h) + de * Math.cos(h) };
  }
  function rwyToNE(rwy, along, cross) {
    const h = rwy.trueHdg * DEG;
    return [rwy.n + along * Math.cos(h) - cross * Math.sin(h), rwy.e + along * Math.sin(h) + cross * Math.cos(h)];
  }
  function onRunway(rwy, n, e, margin = 0) {
    const c = rwyCoords(rwy, n, e);
    return c.along >= -margin && c.along <= rwy.len + margin && Math.abs(c.cross) <= rwy.wid / 2 + margin;
  }

  // ---------------------------------------------------------------- state
  function newState(o = {}) {
    const A = o.aircraft || TRAINER;
    const s = {
      A, t: 0,
      pos: [0, 0, -GROUND_M - 1.05],     // NED: n, e, d (d negative above ground)
      vel: [0, 0, 0],                    // NED ground velocity m/s
      eul: [0, 0, 0],                    // phi (bank), theta (pitch), psi (true heading), radians
      w: [0, 0, 0],                      // body rates p, q, r rad/s
      ctl: { elev: 0, ail: 0, rud: 0, thr: 0, brake: 0, trim: 0, flap: 0 },
      flapPos: 0,                        // degrees, moving toward the selected detent
      wind: { fromDeg: 0, kt: 0, gust: 0 },   // true direction the wind blows from, speed, gust amplitude kt
      engine: { running: true, failed: false, rpm: A.rpmIdle },
      fuel: [A.fuelCap * 0.8, A.fuelCap * 0.8],
      qnh: 29.92,                        // the real pressure at sea level (inHg) in this world
      oatDev: 0,
      onGround: false, contacts: { nose: false, left: false, right: false, tail: false },
      airTime: 0, groundTime: 0,
      wasOnRunway: false, lastRwyT: -99,
      events: [], td: null, crashed: false, crashReason: '',
      seed: o.seed || 1,
      out: {},                           // derived values (air data etc.), refreshed each step
    };
    return s;
  }
  function placeOnRunway(s, rwy = LAB_RWY, alongM = 30) {
    const [n, e] = rwyToNE(rwy, alongM, 0);
    s.pos = [n, e, -(GROUND_M + s.A.gear.nose[2] - 0.02)];
    s.vel = [0, 0, 0]; s.w = [0, 0, 0];
    s.eul = [0, 0, rwy.trueHdg * DEG];
    s.onGround = true; s.airTime = 0; s.groundTime = 5; s.td = null; s.crashed = false; s.crashReason = ''; s.events = [];
    s.ctl.flap = 0; s.flapPos = 0; s.ctl.thr = 0; s.ctl.brake = 0; s.wasOnRunway = true; s.lastRwyT = 0;
    derive(s);
    return s;
  }
  // in the air: position (n, e), altitude ft MSL (true), true heading, indicated speed kt; trimmed for level flight
  function placeInAir(s, n, e, altFt, hdgTrue, kias, flap = 0) {
    const rho = isa(altFt / FT).rho, V = kias / KT / Math.sqrt(rho / RHO0);
    s.pos = [n, e, -altFt / FT];
    s.eul = [0, 0, hdgTrue * DEG]; s.w = [0, 0, 0];
    s.ctl.flap = flap; s.flapPos = s.A.flaps[flap].deg;
    s.onGround = false; s.airTime = 30; s.groundTime = 0; s.td = null; s.crashed = false; s.crashReason = ''; s.events = [];
    const tr = trimFor(s, V, altFt);
    s.eul[1] = tr.alpha;                      // level flight: pitch = angle of attack
    s.vel = [V * Math.cos(s.eul[2]), V * Math.sin(s.eul[2]), 0];
    const w = windNED(s); s.vel[0] += w[0]; s.vel[1] += w[1];
    s.ctl.trim = tr.trim; s.ctl.elev = 0; s.ctl.thr = tr.thr; s.ctl.ail = 0; s.ctl.rud = 0;
    derive(s);
    return s;
  }
  // the angle of attack, elevator trim and throttle for steady level flight at true speed V (a few iterations)
  function trimFor(s, V, altFt) {
    const A = s.A, f = A.flaps[s.ctl.flap] || A.flaps[0], rho = isa(altFt / FT).rho, q = 0.5 * rho * V * V;
    const W = A.mass * G;
    let alpha = (W / (q * A.S) - A.CL0 - f.dCL) / A.CLa;
    alpha = clamp(alpha, -0.1, A.aStall - 0.02);
    const CL = A.CL0 + f.dCL + A.CLa * alpha, CD = A.CD0 + f.dCD + A.k * CL * CL;
    const D = q * A.S * CD;
    // elevator angle that zeroes the pitching moment; the trim carries it
    const de = -(A.Cm0 + f.dCm + A.Cma * alpha) / A.Cmde;
    const trim = clamp(de / -A.trimMax, -1, 1);                    // trim +1 = nose up (the elevator's trailing edge up)
    const thr = clamp(thrustInverse(s, V, D, rho), 0, 1);
    return { alpha, trim, thr, CL, D };
  }
  function thrustAt(s, V, rho, thr) {
    const A = s.A, pf = Math.min(1, rho / RHO0);
    if (!s.engine.running) return 0;
    const P = A.Pmax * pf * (0.06 + 0.94 * thr);
    return Math.min(A.Tstatic * pf * (0.06 + 0.94 * thr), A.eta * P / Math.max(V, 8));
  }
  function thrustInverse(s, V, T, rho) { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (thrustAt(s, V, rho, m) < T) lo = m; else hi = m; } return (lo + hi) / 2; }
  function windNED(s, t = s.t) {
    const W = s.wind, from = W.fromDeg * DEG;
    let spd = W.kt / KT;
    if (W.gust) spd += (W.gust / KT) * gustNoise(t, s.seed);
    return [-spd * Math.cos(from), -spd * Math.sin(from), 0];
  }
  // deterministic smooth noise (the same gusts for the same seed: repeatable tests)
  function gustNoise(t, seed) {
    const a = Math.sin(t * 0.71 + seed * 1.3) * 0.5 + Math.sin(t * 1.73 + seed * 2.9) * 0.3 + Math.sin(t * 3.1 + seed * 0.7) * 0.2;
    return a;
  }

  // ---------------------------------------------------------------- one step (dt ≈ 1/120 s)
  function step(s, dt) {
    if (s.crashed) { derive(s); return s; }
    const A = s.A, c = s.ctl;
    s.t += dt;
    // flaps move toward the detent at about 5°/s (electric/manual alike in this model)
    const fT = A.flaps[c.flap].deg; s.flapPos += clamp(fT - s.flapPos, -5 * dt, 5 * dt);
    const fi = flapInterp(A, s.flapPos);
    const [phi, theta, psi] = s.eul, R = dcm(phi, theta, psi);
    const altM = -s.pos[2], atm = isa(altM), rho = atm.rho;
    const wind = windNED(s);
    const va = [s.vel[0] - wind[0], s.vel[1] - wind[1], s.vel[2] - wind[2]];
    const vb = mulTv(R, va), V = Math.hypot(vb[0], vb[1], vb[2]);
    const alpha = V > 2 ? Math.atan2(vb[2], vb[0]) : 0, beta = V > 2 ? Math.asin(clamp(vb[1] / V, -1, 1)) : 0;
    const qbar = 0.5 * rho * V * V;
    // ground effect: less induced drag within about a wingspan of the ground
    const hAgl = altM - GROUND_M - 1.05, ge = hAgl < A.b ? 1 - 0.45 * Math.pow(1 - Math.max(hAgl, 0) / A.b, 2) : 1;
    // lift: linear to the critical angle, then it falls away (the stall)
    const aS = A.aStall + fi.dA;
    let CL;
    if (alpha <= aS && alpha >= -aS) CL = A.CL0 + fi.dCL + A.CLa * alpha;
    else { const sg = Math.sign(alpha), over = Math.abs(alpha) - aS, CLmax = A.CL0 + fi.dCL + A.CLa * aS * sg; CL = CLmax - sg * Math.min(over * 2.6, 0.7) * (sg > 0 ? 1 : 0.6); }
    const stalled = alpha > aS;
    const CD = A.CD0 + fi.dCD + A.k * ge * CL * CL + (stalled ? 0.6 * (alpha - aS) : 0) + (s.engine.running ? 0 : 0.008);
    const L = qbar * A.S * CL, D = qbar * A.S * CD, Y = qbar * A.S * A.CYb * beta;
    const ca = Math.cos(alpha), sa = Math.sin(alpha);
    let Fb = [-D * ca + L * sa, Y, -D * sa - L * ca];
    // thrust along the body axis
    const T = thrustAt(s, V, rho, c.thr);
    Fb[0] += T;
    // moments (body): aerodynamic
    const hv = V > 2 ? 1 / (2 * V) : 0, [p, q, r] = s.w;
    const de = -clamp(c.elev, -1, 1) * A.deMax - clamp(c.trim, -1, 1) * A.trimMax;   // elevator input +1 = pull (nose up)
    const da = clamp(c.ail, -1, 1) * A.daMax, dr = clamp(c.rud, -1, 1) * A.drMax;
    const qs = qbar * A.S;
    let Mx = qs * A.b * (A.Clb * beta + A.Clp * p * A.b * hv + A.Clr * r * A.b * hv + A.Clda * da);
    let My = qs * A.c * (A.Cm0 + fi.dCm + A.Cma * alpha + A.Cmq * q * A.c * hv + A.Cmde * de + (stalled ? -0.35 * (alpha - aS) : 0));
    let Mz = qs * A.b * (A.Cnb * beta + A.Cnr * r * A.b * hv + A.Cnp * p * A.b * hv + A.Cnda * da + A.Cndr * dr);
    // the propeller's left-turning tendency (P-factor, slipstream): most at high power and low speed
    Mz -= A.pFactor * T * A.b * clamp(1.3 - V / 45, 0, 1);
    // a stalled wing drops toward the side the aircraft is slipping to / already rolling
    if (stalled && V > 10) Mx += qs * A.b * 0.02 * clamp((alpha - aS) / (4 * DEG), 0, 1) * (Math.sign(beta || p || 1));
    // gravity and the wheels
    const Fn = mulv(R, Fb);
    Fn[2] += A.mass * G;
    const gf = groundForces(s, R, dt);
    Fn[0] += gf.F[0]; Fn[1] += gf.F[1]; Fn[2] += gf.F[2];
    const Mg = mulTv(R, gf.M);
    Mx += Mg[0]; My += Mg[1]; Mz += Mg[2];
    // integrate: translation (semi-implicit), rotation (Euler's equations, diagonal inertia)
    for (let i = 0; i < 3; i++) s.vel[i] += Fn[i] / A.mass * dt;
    for (let i = 0; i < 3; i++) s.pos[i] += s.vel[i] * dt;
    const I = A.I;
    s.w[0] += (Mx - (I[2] - I[1]) * q * r) / I[0] * dt;
    s.w[1] += (My - (I[0] - I[2]) * p * r) / I[1] * dt;
    s.w[2] += (Mz - (I[1] - I[0]) * p * q) / I[2] * dt;
    const [P, Q, Rr] = s.w, cphi = Math.cos(s.eul[0]), sphi = Math.sin(s.eul[0]), cth = Math.cos(s.eul[1]), tth = Math.tan(s.eul[1]);
    s.eul[0] += (P + tth * (Q * sphi + Rr * cphi)) * dt;
    s.eul[1] += (Q * cphi - Rr * sphi) * dt;
    s.eul[2] += (Q * sphi + Rr * cphi) / Math.max(Math.abs(cth), 0.05) * dt;
    s.eul[0] = Math.atan2(Math.sin(s.eul[0]), Math.cos(s.eul[0]));
    s.eul[1] = clamp(s.eul[1], -1.45, 1.45);
    s.eul[2] = ((s.eul[2] % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    // engine, fuel
    engineStep(s, V, rho, dt);
    // contact bookkeeping, touchdown record, runway excursion, hard landing / crash
    contactEvents(s, gf, dt);
    s.aero = { V, alpha, beta, qbar, CL, stalled, aS, T, L, D };
    derive(s);
    return s;
  }
  function flapInterp(A, deg) {
    const F = A.flaps; let i = 0; while (i < F.length - 2 && deg > F[i + 1].deg) i++;
    const a = F[i], b = F[i + 1], k = clamp((deg - a.deg) / (b.deg - a.deg), 0, 1), m = (x, y) => x + (y - x) * k;
    return { dCL: m(a.dCL, b.dCL), dCD: m(a.dCD, b.dCD), dA: m(a.dA, b.dA), dCm: m(a.dCm, b.dCm) };
  }
  // three wheels (and the tail) on the flat ground: springs and dampers, rolling and braking friction,
  // sideways grip, nose-wheel steering with the rudder pedals
  function groundForces(s, R, dt) {
    const A = s.A, F = [0, 0, 0], M = [0, 0, 0], con = {};
    const pts = [['nose', A.gear.nose], ['left', A.gear.left], ['right', A.gear.right], ['tail', A.tail]];
    const psi = s.eul[2], gs = Math.hypot(s.vel[0], s.vel[1]) * KT;
    let maxSink = 0;
    for (const [name, gb] of pts) {
      const r = mulv(R, gb), d = s.pos[2] + r[2], pen = d + GROUND_M;
      con[name] = pen > 0;
      if (pen <= 0) continue;
      const wb = cross(s.w, gb), wv = mulv(R, wb), vp = [s.vel[0] + wv[0], s.vel[1] + wv[1], s.vel[2] + wv[2]];
      maxSink = Math.max(maxSink, vp[2]);
      const kk = name === 'tail' ? A.gearK * 2 : A.gearK, cc = name === 'tail' ? A.gearC * 2 : A.gearC;
      const N = Math.max(0, kk * pen + cc * vp[2]);
      // wheel direction (the nose wheel turns with the rudder pedals, less at speed)
      let wh = psi;
      if (name === 'nose') wh += clamp(s.ctl.rud, -1, 1) * A.steerMax * clamp(1 - gs / 70, 0.2, 1);
      const fx = Math.cos(wh), fy = Math.sin(wh);
      const vLong = vp[0] * fx + vp[1] * fy, vLat = -vp[0] * fy + vp[1] * fx;
      const brake = name === 'left' || name === 'right' ? clamp(s.ctl.brake, 0, 1) : 0;
      const muLong = name === 'tail' ? 0.5 : 0.025 + 0.55 * brake;
      const fLong = -muLong * N * clamp(vLong / 0.5, -1, 1);
      const fLat = -(name === 'tail' ? 0.5 : 0.85) * N * clamp(vLat / 0.6, -1, 1);
      const f = [fLong * fx - fLat * fy, fLong * fy + fLat * fx, -N];
      F[0] += f[0]; F[1] += f[1]; F[2] += f[2];
      const m = cross(r, f); M[0] += m[0]; M[1] += m[1]; M[2] += m[2];
    }
    return { F, M, con, maxSink };
  }
  function engineStep(s, V, rho, dt) {
    const A = s.A, E = s.engine;
    if (E.running && (E.failed || s.fuel[0] + s.fuel[1] <= 0)) { E.running = false; s.events.push({ t: s.t, type: 'engine_stop', why: E.failed ? '故障（教材の想定）' : '燃料切れ' }); }
    const thr = s.ctl.thr;
    const tgt = E.running ? clamp(A.rpmIdle + (A.rpmMax - 350 - A.rpmIdle) * thr + V * 4.5, A.rpmIdle, A.rpmMax + 50) : clamp((V - 25) * 22, 0, 1500);
    E.rpm += (tgt - E.rpm) * Math.min(1, dt * 2.5);
    s.fuelFlow = E.running ? 2.2 + 8.4 * thr : 0;          // US gal/h (teaching value)
    const used = s.fuelFlow * dt / 3600;
    s.fuel[0] = Math.max(0, s.fuel[0] - used / 2); s.fuel[1] = Math.max(0, s.fuel[1] - used / 2);
  }
  function contactEvents(s, gf, dt) {
    const con = gf.con, mains = con.left || con.right, any = mains || con.nose;
    const was = s.onGround;
    s.contacts = con;
    const rwyNow = onRunway(LAB_RWY, s.pos[0], s.pos[1]);
    if (any && !was && s.airTime > 2) {
      // touchdown: the sink rate just before the wheels pushed back, the speed, the attitude, where on the runway
      const sinkFpm = Math.max(0, s.prevVel ? s.prevVel[2] : s.vel[2]) * 196.85;
      const rc = rwyCoords(LAB_RWY, s.pos[0], s.pos[1]);
      s.td = { t: s.t, fpm: Math.round(sinkFpm), kias: Math.round(s.out.ias || 0), pitch: +(s.eul[1] / DEG).toFixed(1), bank: +(s.eul[0] / DEG).toFixed(1),
        along: Math.round(rc.along), cross: +rc.cross.toFixed(1), onRunway: rwyNow, noseFirst: con.nose && !mains };
      s.events.push({ t: s.t, type: 'touchdown', ...s.td });
      if (sinkFpm > 1000 || Math.abs(s.eul[0]) > 15 * DEG) crash(s, sinkFpm > 1000 ? `ハードランディング（${Math.round(sinkFpm)} fpm、教材基準 1,000 fpm 超）で機体損傷` : '大きく傾いたまま接地（翼端接触）');
      else if (sinkFpm > 600) s.events.push({ t: s.t, type: 'hard_landing', fpm: Math.round(sinkFpm) });
      if (!rwyNow) s.events.push({ t: s.t, type: 'off_runway_touchdown' });
    }
    if (con.tail && !s._tailEv) { s._tailEv = true; s.events.push({ t: s.t, type: 'tail_strike' }); }
    if (!con.tail) s._tailEv = false;
    s.onGround = any;
    if (any) { s.groundTime += dt; s.airTime = 0; } else { s.airTime += dt; s.groundTime = 0; }
    // runway excursion: rolling off the paved surface after being on it
    const gsMs = Math.hypot(s.vel[0], s.vel[1]);
    if (any && rwyNow) { s.wasOnRunway = true; s.lastRwyT = s.t; }
    if (any && !rwyNow && s.wasOnRunway && gsMs > 1.5 && s.t - s.lastRwyT < 30 && !s._excursion) { s._excursion = true; s.events.push({ t: s.t, type: 'runway_excursion' }); }
    if (!any && s.airTime > 5) { s.wasOnRunway = false; s._excursion = false; }
    // nose-down impact (nose wheel or propeller hitting first, fast)
    if (gf.maxSink > 6) crash(s, '機首から強く接地しました');
    s.prevVel = s.vel.slice();
  }
  function crash(s, why) { if (s.crashed) return; s.crashed = true; s.crashReason = why; s.vel = [0, 0, 0]; s.w = [0, 0, 0]; s.events.push({ t: s.t, type: 'crash', why }); }

  // ---------------------------------------------------------------- what the instruments read
  function derive(s) {
    const A = s.A, o = s.out, altM = -s.pos[2], atm = isa(altM);
    const wind = windNED(s), va = [s.vel[0] - wind[0], s.vel[1] - wind[1], s.vel[2] - wind[2]];
    const R = dcm(s.eul[0], s.eul[1], s.eul[2]), vb = mulTv(R, va), V = Math.hypot(va[0], va[1], va[2]);
    o.tas = V * KT;
    o.ias = V * Math.sqrt(atm.rho / RHO0) * KT * (vb[0] > 0 ? 1 : 0);   // (a crude pitot: no reading flying backwards)
    o.gs = Math.hypot(s.vel[0], s.vel[1]) * KT;
    o.trk = o.gs > 1 ? wrap360(Math.atan2(s.vel[1], s.vel[0]) / DEG) : wrap360(s.eul[2] / DEG);
    o.hdgTrue = wrap360(s.eul[2] / DEG);
    o.pitch = s.eul[1] / DEG; o.bank = s.eul[0] / DEG;
    o.vsi = -s.vel[2] * 196.85;                                   // ft/min
    o.altTrue = altM * FT; o.agl = (altM - GROUND_M) * FT - 1.05 * FT;
    o.alpha = V > 2 ? Math.atan2(vb[2], vb[0]) / DEG : 0;
    o.beta = V > 2 ? Math.asin(clamp(vb[1] / V, -1, 1)) / DEG : 0;
    o.aStall = (A.aStall + flapInterp(A, s.flapPos).dA) / DEG;
    o.aoaFrac = clamp((o.alpha + 4) / (o.aStall + 4), 0, 1.2);     // 0 at -4°, 1 at the critical angle
    o.stallWarn = !s.onGround && V > 10 && o.alpha > o.aStall - 3.5;
    // the slip / skid ball: lateral acceleration felt in the cockpit (ball out to the side the nose must follow)
    o.slip = clamp(o.beta * 0.35, -1.5, 1.5);
    o.windFrom = s.wind.fromDeg; o.windKt = Math.hypot(wind[0], wind[1]) * KT;
    o.rpm = s.engine.rpm; o.fuelFlow = s.fuelFlow || 0; o.fuel = s.fuel.slice();
    o.powerPct = s.engine.running ? Math.round((0.06 + 0.94 * s.ctl.thr) * 100) : 0;
    o.oat = atm.T - 273.15 + s.oatDev;
    o.onRunway = onRunway(LAB_RWY, s.pos[0], s.pos[1]);
    const rc = rwyCoords(LAB_RWY, s.pos[0], s.pos[1]); o.rwyAlong = rc.along; o.rwyCross = rc.cross;
    return o;
  }

  FL.physics = { TRAINER, LAB_RWY, GROUND_FT, GROUND_M, MAGVAR_W, DEG, KT, FT, G, isa, dcm, newState, placeOnRunway, placeInAir, trimFor, step, derive,
    rwyCoords, rwyToNE, onRunway, windNED, wrap360, wrap180, clamp, thrustAt, flapInterp };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
