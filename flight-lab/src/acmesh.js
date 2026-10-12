// FLIGHT LAB — acmesh.js
// The aircraft's 3D model, built from the same description the flight model uses (FL.physics.AIRCRAFT: fuselage
// sections, wing, tailplane, fin, engines, wheels), the way 空島フライト builds its aircraft: lofted fuselage rings,
// NACA-section wings and tail, separate moving parts (ailerons, flaps, stabilator, rudder, propellers, retractable
// gear) each with its hinge so the renderer can turn them with the controls. Body frame: x = right wing, y = up,
// −z = the nose (as the physics). Pure data (no WebGL): scene.js uploads it. A teaching model, not a scale model.
(function (FL) {
  'use strict';
  const DEG = Math.PI / 180;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const vscale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const vlen = a => Math.hypot(a[0], a[1], a[2]);
  const vnorm = a => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const vlerp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // ---------------------------------------------------------------- a triangle soup with normals and colours
  function MeshBuilder() { this.pos = []; this.nrm = []; this.col = []; }
  MeshBuilder.prototype.tri = function (a, b, c, na, nb, nc, ca, cb, cc) {
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.nrm.push(na[0], na[1], na[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2]);
    this.col.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]);
  };
  // a flat quad facing away from `ref`
  MeshBuilder.prototype.quad = function (a, b, c, d, col, ref) {
    let n = vcross(vsub(c, a), vsub(d, b));
    const fc = vscale(vadd(vadd(a, b), vadd(c, d)), 0.25);
    if (vdot(n, vsub(fc, ref)) < 0) { [b, d] = [d, b]; n = vscale(n, -1); }
    n = vnorm(n);
    this.tri(a, b, c, n, n, n, col, col, col); this.tri(a, c, d, n, n, n, col, col, col);
  };
  // a surface through closed rings of points (equal length); colour: [r, g, b] or a function of the point
  MeshBuilder.prototype.loft = function (rings, color, opt = {}) {
    const R = rings.length, M = rings[0].length, smooth = opt.smooth !== false;
    const colorOf = typeof color === 'function' ? color : () => color;
    const cent = rings.map(r => vscale(r.reduce((s, p) => vadd(s, p), [0, 0, 0]), 1 / r.length));
    const acc = rings.map(r => r.map(() => [0, 0, 0])), faces = [];
    for (let r = 0; r < R - 1; r++) {
      const axis = vlerp(cent[r], cent[r + 1], 0.5);
      for (let m = 0; m < M; m++) {
        let q = [[r, m], [r, (m + 1) % M], [r + 1, (m + 1) % M], [r + 1, m]];
        const P = q.map(([a, b]) => rings[a][b]);
        let n = vcross(vsub(P[2], P[0]), vsub(P[3], P[1]));
        const fc = vscale(vadd(vadd(P[0], P[1]), vadd(P[2], P[3])), 0.25);
        if (vdot(n, vsub(fc, opt.ref || axis)) < 0) { q = [q[0], q[3], q[2], q[1]]; n = vscale(n, -1); }
        if (vlen(n) < 1e-9) continue;
        n = vnorm(n); faces.push([q, n]);
        for (const [a, b] of q) acc[a][b] = vadd(acc[a][b], n);
      }
    }
    for (const [q, n] of faces) {
      const P = q.map(([a, b]) => rings[a][b]), N = q.map(([a, b]) => (smooth ? vnorm(acc[a][b]) : n)), C = P.map(colorOf);
      this.tri(P[0], P[1], P[2], N[0], N[1], N[2], C[0], C[1], C[2]);
      this.tri(P[0], P[2], P[3], N[0], N[2], N[3], C[0], C[2], C[3]);
    }
    const cap = (r, other) => {
      const c = cent[r], out = vnorm(vsub(c, cent[other]));
      for (let m = 0; m < M; m++) {
        let a = rings[r][m], b = rings[r][(m + 1) % M];
        if (vdot(vcross(vsub(a, c), vsub(b, c)), out) < 0) [a, b] = [b, a];
        this.tri(c, a, b, out, out, out, colorOf(c), colorOf(a), colorOf(b));
      }
    };
    if (opt.capStart) cap(0, 1);
    if (opt.capEnd) cap(R - 1, R - 2);
  };
  MeshBuilder.prototype.cylinder = function (p0, p1, r0, r1, seg, col, caps = true) {
    const ax = vnorm(vsub(p1, p0)), helper = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = vnorm(vcross(ax, helper)), v = vcross(ax, u);
    const ring = (p, r) => Array.from({ length: seg }, (_, i) => { const a = i / seg * Math.PI * 2; return vadd(p, vadd(vscale(u, Math.cos(a) * r), vscale(v, Math.sin(a) * r))); });
    this.loft([ring(p0, r0), ring(p1, r1)], col, { capStart: caps, capEnd: caps, smooth: seg > 6 });
  };
  MeshBuilder.prototype.build = function () { return { pos: new Float32Array(this.pos), nrm: new Float32Array(this.nrm), col: new Float32Array(this.col), count: this.pos.length / 3 }; };

  // ---------------------------------------------------------------- shapes
  function superRing(z, hw, hh, yc, n = 22, e = 2.5) {
    return Array.from({ length: n }, (_, k) => {
      const t = k / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      return [hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / e), yc + hh * Math.sign(s) * Math.pow(Math.abs(s), 2 / e), z];
    });
  }
  const NACA = xc => 5 * (0.2969 * Math.sqrt(xc) - 0.1260 * xc - 0.3516 * xc * xc + 0.2843 * xc ** 3 - 0.1036 * xc ** 4);
  // an airfoil ring between chord fractions xc0..xc1. horizontal: points (span, base ± t, z); vertical: (± t, span, z)
  function foil(span, base, zLE, chord, thick, xc0, xc1, vertical = false) {
    const ss = xc0 <= 1e-3 ? [0, 0.015, 0.05, 0.12, 0.22, 0.35, 0.5, 0.65, 0.8, 0.92, 1] : [0, 0.35, 0.7, 1];
    const xs = ss.map(v => xc0 + (xc1 - xc0) * v);
    const P = (xc, sgn) => { const t = NACA(Math.max(xc, 0)) * thick * chord * sgn, z = zLE + xc * chord; return vertical ? [t, span, z] : [span, base + t, z]; };
    const up = xs.slice().reverse().map(x => P(x, 1)), lo = xs.map(x => P(x, -1));
    if (xc0 <= 1e-3) lo.shift();
    if (xc1 >= 0.999) lo.pop();
    return [...up, ...lo];
  }
  function fuseAt(F, z) {
    for (let i = 0; i < F.length - 1; i++) { const a = F[i], b = F[i + 1]; if (z <= b[0]) { const t = clamp((z - a[0]) / (b[0] - a[0]), 0, 1); return a.map((v, k) => lerp(v, b[k], t)); } }
    return F[F.length - 1];
  }
  function wingFns(w) {
    const span = w.tipX - w.rootX, f = ax => clamp((ax - w.rootX) / span, 0, 1);
    const W = { y: ax => w.y + (ax - w.rootX) * Math.tan(w.dih * DEG), c: ax => lerp(w.rootC, w.tipC, f(ax)), le: ax => lerp(w.rootLE, w.tipLE, f(ax)), t: ax => lerp(w.t0, w.t1, f(ax)) };
    W.hinge = x => { const ax = Math.abs(x); return [x, W.y(ax), W.le(ax) + w.hinge * W.c(ax)]; };
    return W;
  }

  // ---------------------------------------------------------------- the parts
  // liveries (teaching colours only: no airline's or school's livery is copied)
  const LIVERY = { pa28: { base: [0.94, 0.94, 0.92], a: [0.13, 0.32, 0.62], b: [0.85, 0.62, 0.18], cowl: [0.94, 0.94, 0.92] }, pa44: { base: [0.95, 0.95, 0.94], a: [0.62, 0.12, 0.16], b: [0.20, 0.22, 0.28], cowl: [0.95, 0.95, 0.94] } };
  // parts: { name, mesh, pivot?, axis?, angle?(s) → radians, gear?, disc?, prop? }
  function buildParts(A) {
    const parts = [], Lv = LIVERY[A.id] || LIVERY.pa28, WHITE = Lv.base;
    const W = wingFns(A.wing), hs = A.hstab, vs = A.vstab;
    const stripe = p => (p[1] > 0.02 && p[1] < 0.16 ? Lv.a : p[1] > -0.06 && p[1] <= 0.02 ? Lv.b : WHITE);
    let b = new MeshBuilder();
    b.loft(A.fuse.map(f => superRing(f[0], f[1], f[2], f[3], 22, 2.5)), stripe, { capStart: true, capEnd: true });
    // the cabin windows: dark side panels and the windscreen, slightly outside the skin
    for (const s of [1, -1]) {
      const zs = [-1.55, -1.0, -0.2, 0.55], ring = zs.map(z => { const f = fuseAt(A.fuse, z); return [s * (f[1] * 0.985 + 0.012), f[3] + f[2] * 0.35, z]; });
      for (let i = 0; i < zs.length - 1; i++) {
        const a = ring[i], c = ring[i + 1], h0 = fuseAt(A.fuse, zs[i])[2] * 0.42, h1 = fuseAt(A.fuse, zs[i + 1])[2] * 0.42;
        b.quad([a[0], a[1], a[2]], [c[0], c[1], c[2]], [c[0], c[1] + h1, c[2]], [a[0], a[1] + h0, a[2]], [0.10, 0.14, 0.19], [0, a[1], a[2]]);
      }
    }
    { const z0 = -2.15, z1 = -1.5, f0 = fuseAt(A.fuse, z0), f1 = fuseAt(A.fuse, z1);
      const y0 = f0[3] + f0[2] * 0.62, y1 = f1[3] + f1[2] * 1.0;
      b.quad([-f0[1] * 0.78, y0, z0], [f0[1] * 0.78, y0, z0], [f1[1] * 0.92, y1, z1], [-f1[1] * 0.92, y1, z1], [0.10, 0.14, 0.19], [0, 0, 0]); }
    // the wing (fixed part, ahead of the hinge line)
    for (const s of [1, -1]) {
      const xs = [A.wing.rootX, (A.wing.rootX + A.wing.tipX) / 2, A.wing.tipX];
      b.loft(xs.map(ax => foil(s * ax, W.y(ax), W.le(ax), W.c(ax), W.t(ax), 0, A.wing.hinge - 0.005)), WHITE, { capStart: true, capEnd: true });
      b.loft([A.wing.rootX, A.wing.tipX].map(ax => foil(s * ax, W.y(ax), W.le(ax) + A.wing.hinge * W.c(ax), W.c(ax) * (1 - A.wing.hinge), W.t(ax) * 0.4, 0, 1)), WHITE, { capStart: true, capEnd: true, smooth: false });
    }
    // the fin (fixed part)
    const finLE = y => lerp(vs.rootLE, vs.topLE, (y - vs.y0) / (vs.y1 - vs.y0));
    b.loft([vs.y0, vs.y1].map(y => { const le = finLE(y), ch = vs.te - le; return foil(y, 0, le, ch, vs.t, 0, (vs.hinge - le) / ch, true); }), y => (y[1] > vs.y1 - 0.35 ? Lv.a : WHITE), { capStart: true, capEnd: true });
    // engines (static parts): a nose cowling, or two wing nacelles
    for (const e of A.engines) {
      if (e.type === 'nose') {
        const f0 = A.fuse[0];
        b.loft([[f0[0], f0[1] * 0.9], [e.z + 0.05, f0[1] * 0.75], [e.z - 0.2, f0[1] * 0.45], [e.z - 0.38, 0.02]].map(([z, r]) => superRing(z, r, r, e.y, 16, 2)), Lv.a, { capEnd: true });
      } else if (e.type === 'wing') {
        for (const s of [1, -1]) {
          const x = s * e.x, z0 = e.z + 0.05, z1 = W.le(e.x) + W.c(e.x) + 0.4, r = 0.36;
          b.loft([[z0 - 0.05, r * 0.45], [z0 + 0.25, r * 0.92], [z0 + 0.8, r], [z1 - 0.6, r * 0.9], [z1, r * 0.25]].map(([z, rr]) => superRing(z, rr, rr * 1.15, e.y, 14, 2).map(p => [p[0] + x, p[1], p[2]])), WHITE, { capStart: true, capEnd: true });
          b.loft([[e.z - 0.02, 0.17], [e.z - 0.24, 0.12], [e.z - 0.4, 0.02]].map(([z, rr]) => superRing(z, rr, rr, e.y, 12, 2).map(p => [p[0] + x, p[1], p[2]])), Lv.a, { capEnd: true });
        }
      }
    }
    parts.push({ name: 'body', mesh: b.build() });
    // control surfaces, each turning about its hinge
    const surf = (name, x0, x1, angle) => {
      const bb = new MeshBuilder(), sec = x => { const ax = Math.abs(x); return foil(x, W.y(ax), W.le(ax), W.c(ax), W.t(ax), A.wing.hinge + 0.01, 1); };
      bb.loft([sec(x0), sec(x1)], WHITE, { capStart: true, capEnd: true });
      const p0 = W.hinge(x0), p1 = W.hinge(x1);
      let axis = vnorm(vsub(p1, p0)); if (axis[0] < 0) axis = vscale(axis, -1);
      parts.push({ name, mesh: bb.build(), pivot: p0, axis, angle });
    };
    const [a0, a1] = A.wing.ail;
    surf('ailR', a0, a1, s => -s.ail * 18 * DEG);
    surf('ailL', -a0, -a1, s => s.ail * 18 * DEG);
    if (A.wing.flap) { const [f0, f1] = A.wing.flap; surf('flapR', f0, f1, s => s.flapDeg * DEG); surf('flapL', -f0, -f1, s => s.flapDeg * DEG); }
    // the stabilator (the whole tailplane turns) and the rudder
    { const bb = new MeshBuilder(), stabLE = ax => lerp(hs.rootLE, hs.tipLE, ax / hs.span);
      bb.loft([-hs.span, 0, hs.span].map(x => { const ax = Math.abs(x), le = stabLE(ax), c = hs.te - le; return foil(x, hs.y, le, c, hs.t, 0, 1); }), WHITE, { capStart: true, capEnd: true });
      const piv = [0, hs.y, hs.rootLE + (hs.te - hs.rootLE) * 0.25];
      parts.push({ name: 'stab', mesh: bb.build(), pivot: piv, axis: [1, 0, 0], angle: s => -clamp(s.elev + s.trim, -1, 1) * 14 * DEG }); }
    { const bb = new MeshBuilder(), ry0 = vs.y0 + 0.1, ry1 = vs.y1 - (hs.y >= vs.y1 - 0.2 ? 0.18 : 0);
      bb.loft([ry0, ry1].map(y => { const le = finLE(y), c = vs.te - le; return foil(y, 0, le, c, vs.t, clamp((vs.hinge + 0.02 - le) / c, 0.05, 0.9), 1, true); }), y => (y[1] > vs.y1 - 0.35 ? Lv.a : WHITE), { capStart: true, capEnd: true });
      parts.push({ name: 'rud', mesh: bb.build(), pivot: [0, ry0, vs.hinge + 0.01], axis: [0, 1, 0], angle: s => (s.rudEff != null ? s.rudEff : s.rud) * 25 * DEG }); }
    // propellers (blades turning with the engine; a faint disc when fast) — counter-rotating on the twin
    for (const e of A.engines) {
      const centers = e.type === 'nose' ? [[0, e.y, e.z, 0]] : [[-e.x, e.y, e.z, 0], [e.x, e.y, e.z, 1]];
      for (const [cx, cy, cz, idx] of centers) {
        const c = [cx, cy, cz], pb = new MeshBuilder();
        for (let k = 0; k < e.blades; k++) {
          const a = k / e.blades * Math.PI * 2, dir = [Math.cos(a + Math.PI / 2), Math.sin(a + Math.PI / 2), 0], segs = 6;
          for (let i = 0; i < segs; i++) {
            const r0 = 0.1 + (e.r - 0.1) * i / segs, r1 = 0.1 + (e.r - 0.1) * (i + 1) / segs, w = e.r * 0.09 * (1 - 0.4 * i / segs);
            const side = [-dir[1], dir[0], 0], tw = 0.45 - 0.3 * i / segs;
            const P = (r, sw) => vadd(vadd(c, vscale(dir, r)), vadd(vscale(side, sw * Math.cos(tw)), [0, 0, sw * Math.sin(tw)]));
            const col = i === segs - 1 ? [0.95, 0.78, 0.15] : [0.13, 0.13, 0.14];
            pb.quad(P(r0, -w), P(r0, w), P(r1, w), P(r1, -w), col, vadd(c, [0, 0, 1]));
            pb.quad(P(r0, -w), P(r0, w), P(r1, w), P(r1, -w), col, vadd(c, [0, 0, -1]));
          }
        }
        const sign = A.counterRotating && idx === 1 ? -1 : 1;
        parts.push({ name: 'prop', mesh: pb.build(), pivot: c, axis: [0, 0, 1], angle: s => (s.eng[idx] ? s.eng[idx].ang || 0 : s.propAng) * sign, prop: idx });
        const db = new MeshBuilder(), n = [0, 0, -1], dc = [0.35, 0.35, 0.36];
        for (let i = 0; i < 32; i++) {
          const q0 = i / 32 * Math.PI * 2, q1 = (i + 1) / 32 * Math.PI * 2;
          db.tri([c[0], c[1], c[2] - 0.02], [c[0] + Math.cos(q0) * e.r, c[1] + Math.sin(q0) * e.r, c[2] - 0.02], [c[0] + Math.cos(q1) * e.r, c[1] + Math.sin(q1) * e.r, c[2] - 0.02], n, n, n, dc, dc, dc);
        }
        parts.push({ name: 'disc', mesh: db.build(), disc: idx });
      }
    }
    // landing gear: fixed (with fairings) or folding up with the gear position
    const G = A.gear, wr = G.wheelR, len = (G.nose[1] < -1 ? 0.75 : 0.6);
    const gear = (name, axle, sideSign, isNose) => {
      const bb = new MeshBuilder(), pivot = [axle[0] * 0.96, axle[1] + len + wr * 0.2, axle[2] - 0.05], width = wr * (isNose ? 0.45 : 0.55);
      bb.cylinder(pivot, axle, wr * 0.16, wr * 0.14, 6, [0.72, 0.73, 0.75]);
      bb.cylinder(vadd(axle, [-width / 2, 0, 0]), vadd(axle, [width / 2, 0, 0]), wr, wr, 14, [0.09, 0.09, 0.1]);
      bb.cylinder(vadd(axle, [-width / 2 - 0.01, 0, 0]), vadd(axle, [width / 2 + 0.01, 0, 0]), wr * 0.4, wr * 0.4, 10, [0.75, 0.75, 0.78]);
      if (G.fixed) {
        bb.loft([[-0.55, 0.3], [-0.2, 1.05], [0.25, 1.1], [0.7, 0.2]].map(([dz, k]) => superRing(axle[2] + dz * wr * 2.2, width * 0.9 * k, wr * 1.05 * k, axle[1] + wr * 0.1, 12, 2.2).map(p => [p[0] + axle[0], p[1], p[2]])), WHITE, { capStart: true, capEnd: true });
        parts.push({ name, mesh: bb.build() }); return;
      }
      const axis = isNose ? [1, 0, 0] : [0, 0, 1], angle = isNose ? (s => -(1 - s.gearPos) * 90 * DEG) : (s => sideSign * -(1 - s.gearPos) * 88 * DEG);
      parts.push({ name, mesh: bb.build(), pivot, axis, angle, gear: true });
    };
    gear('gearN', G.nose, 0, true);
    for (const m of G.mains) { gear('gearR', m, 1, false); gear('gearL', [-m[0], m[1], m[2]], -1, false); }
    return parts;
  }
  // a rotation matrix (3×3, row-major) about a unit axis
  function axisAngle(ax, a) {
    const c = Math.cos(a), s = Math.sin(a), t = 1 - c, [x, y, z] = ax;
    return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
  }

  FL.acmesh = { MeshBuilder, buildParts, axisAngle, superRing, foil, LIVERY };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
