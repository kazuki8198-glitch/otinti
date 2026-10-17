// CADET — aircraft/exterior.js : the aircraft as seen from outside, built from FLIGHT LAB's own description
// (FL.acmesh.buildParts: the fuselage, wings, tail, moving surfaces, propellers and gear, in the physics' body frame:
// x = right wing, y = up, −z = the nose). Each hinged part turns with the state, as in FLIGHT LAB.
// Materials: glossy paint with a clear coat, dark glass, rubber, metal — told apart by the vertex colours acmesh uses.
// Parked aircraft are baked (two draw calls). The flown one (liveAircraft) stays alive: its propeller turns the way a
// Lycoming does and becomes a blurred disc at speed, the exterior lights glow (lenses and halos, no light sources), and
// the fuselage round the cabin is its own mesh, which the cockpit view takes away (seen from inside, the skin is culled
// but would still cast its shadow over the whole cockpit, and the cockpit draws its own cabin and cowling).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DEG = Math.PI / 180;
const toLin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

// what the vertex colours stand for (linear values): the shader below and the tests use the same numbers.
// acmesh's struts (0.72, 0.73, 0.75) and hub caps (0.75, 0.75, 0.78) are slightly blue: |r − b| is 0.046 and 0.048.
export const PAINT_CLASSES = { glassMax: 0.05, glassBlue: 1.8, rubberMax: 0.02, metalMin: 0.35, metalMax: 0.6, metalTint: 0.06 };
export function paintClass(c) {
  const C = PAINT_CLASSES, mx = Math.max(c[0], c[1], c[2]);
  if (mx <= C.glassMax && c[2] >= c[0] * C.glassBlue) return 'glass';
  if (mx <= C.rubberMax) return 'rubber';
  if (mx >= C.metalMin && mx <= C.metalMax && Math.abs(c[0] - c[2]) <= C.metalTint) return 'metal';
  return 'paint';
}

let paintMat = null, propMat = null;
function materials() {
  if (paintMat) return { paintMat, propMat };
  const C = PAINT_CLASSES, f = v => v.toFixed(3);
  const metal = mx => `step(${f(C.metalMin)}, ${mx}) * step(abs(vColor.r - vColor.b), ${f(C.metalTint)}) * step(${mx}, ${f(C.metalMax)})`;
  paintMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.06, envMapIntensity: 1.1 });
  paintMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', /* glsl */`
      float roughnessFactor = roughness;
      #if defined( USE_COLOR )
        float mx = max(vColor.r, max(vColor.g, vColor.b));
        float glass = step(mx, ${f(C.glassMax)}) * step(vColor.r * ${f(C.glassBlue)}, vColor.b);   // the dark blue-grey windows
        float rubber = step(mx, ${f(C.rubberMax)}) * (1.0 - glass);                                 // tyres
        float metal = ${metal('mx')};                                                                // struts, hub caps
        roughnessFactor = mix(roughnessFactor, 0.03, glass);
        roughnessFactor = mix(roughnessFactor, 0.85, rubber);
        roughnessFactor = mix(roughnessFactor, 0.3, metal);
      #endif`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
      #if defined( USE_COLOR ) && defined( USE_CLEARCOAT )
        material.clearcoat *= 1.0 - rubber;
      #endif`)
      .replace('#include <metalnessmap_fragment>', `float metalnessFactor = metalness;
      #if defined( USE_COLOR )
        float mx3 = max(vColor.r, max(vColor.g, vColor.b));
        metalnessFactor = ${metal('mx3')} * 0.8;
      #endif`);
  };
  paintMat.customProgramCacheKey = () => 'cadet-ac-paint';
  // the blades: black paint with acmesh's yellow tips (vertex colours)
  propMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 });
  return { paintMat, propMat };
}

// one aircraft model; update(s) turns the hinged parts from a physics state (or a parked state)
export function buildAircraftModel(FL, A) {
  const { paintMat, propMat } = materials();
  const root = new THREE.Group(); root.name = 'aircraft-' + A.id;
  const hinges = [];
  for (const p of FL.acmesh.buildParts(A)) {
    if (p.disc != null) continue;                                     // the spinning disc: only the flown aircraft (liveAircraft)
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p.mesh.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(p.mesh.nrm, 3));
    const col = new Float32Array(p.mesh.col.length); for (let i = 0; i < col.length; i++) col[i] = toLin(p.mesh.col[i]);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(g, p.name === 'prop' ? propMat : paintMat);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = p.name;
    if (p.pivot && p.angle) {
      const pivot = new THREE.Group(); pivot.position.set(...p.pivot);
      mesh.position.set(-p.pivot[0], -p.pivot[1], -p.pivot[2]);
      pivot.add(mesh); root.add(pivot);
      hinges.push({ pivot, axis: new THREE.Vector3(...p.axis), angle: p.angle });
    } else root.add(mesh);
  }
  return {
    root,
    update(s) { for (const h of hinges) h.pivot.quaternion.setFromAxisAngle(h.axis, h.angle(s) || 0); },
  };
}

// a parked aircraft: a physics state at rest on its wheels (so the hinges and the height come from FLIGHT LAB)
export function parkedAircraft(FL, L, id, along, cross, hdgTrue, opt = {}) {
  const P = FL.physics, s = P.newState({ aircraft: id });
  const [n, e] = P.rwyToNE(L.R, along, cross);
  s.q = P.qFromHPB(hdgTrue, 0, 0);
  s.pos = [e, P.GROUND_M - s.WHEEL_BOTTOM + 0.01, -n];
  s.thr = 0; s.flapIdx = 0; s.flapDeg = 0; s.gearDown = true; s.gearPos = 1; s.propAng = opt.prop ?? 0.6;
  for (const en of s.eng) en.ang = opt.prop ?? 0.6;
  s.elev = opt.elev ?? -0.15; s.ail = 0; s.rud = 0;
  const m = buildAircraftModel(FL, s.A);
  m.update(s);
  const lp = L.physToLocal(s.pos);
  if (opt.bake !== false) bake(m.root);
  m.root.position.set(lp[0], lp[1], lp[2]);
  m.root.quaternion.set(s.q[0], s.q[1], s.q[2], s.q[3]);
  return { ...m, state: s };
}

// a parked aircraft does not move its controls: its parts (hinges set) become one mesh per material (two draw calls)
function bake(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map(), inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), m4 = new THREE.Matrix4();
  root.traverse(o => { if (o.isMesh) { const g = o.geometry.clone().applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld)); if (!byMat.has(o.material)) byMat.set(o.material, []); byMat.get(o.material).push(g); } });
  for (const c of [...root.children]) root.remove(c);
  for (const [mat, geos] of byMat) {
    const mesh = new THREE.Mesh(mergeGeometries(geos.map(g => (g.index ? g.toNonIndexed() : g))), mat);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'aircraft-baked'; root.add(mesh);
  }
}

// colliders for walking around a parked aircraft: its triangles' footprints on a grid of `cell` metres in the runway
// frame (toFrame(x, z) → [fx, fz]), each cell with the lowest and highest point over it, merged into runs along x.
// Tight for an aircraft parked square to the runway (wings, tail, gear legs each block where they stand; nothing low
// enough to step over or high enough to walk under, as with a real low-wing trainer).
export function colliderBoxes(root, toFrame, G, cell = 0.25) {
  root.updateMatrixWorld(true);
  const cells = new Map(), v = new THREE.Vector3(), inv = 1 / cell;
  root.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : pos.count;
    for (let t = 0; t + 2 < n; t += 3) {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let j = 0; j < 3; j++) {
        v.fromBufferAttribute(pos, idx ? idx.getX(t + j) : t + j).applyMatrix4(o.matrixWorld);
        const [fx, fz] = toFrame(v.x, v.z);
        x0 = Math.min(x0, fx); x1 = Math.max(x1, fx); z0 = Math.min(z0, fz); z1 = Math.max(z1, fz); y0 = Math.min(y0, v.y - G); y1 = Math.max(y1, v.y - G);
      }
      for (let i = Math.floor(x0 * inv); i <= Math.floor(x1 * inv); i++) for (let k = Math.floor(z0 * inv); k <= Math.floor(z1 * inv); k++) {
        const key = i + ',' + k, c = cells.get(key);
        if (c) { c[2] = Math.min(c[2], y0); c[3] = Math.max(c[3], y1); } else cells.set(key, [i, k, y0, y1]);
      }
    }
  });
  const rows = new Map();
  for (const c of cells.values()) { if (!rows.has(c[1])) rows.set(c[1], []); rows.get(c[1]).push(c); }
  const out = [];
  for (const [k, row] of rows) {
    row.sort((p, q) => p[0] - q[0]);
    let run = null;
    for (const c of row) {
      if (run && c[0] === run.i1 + 1) { run.i1 = c[0]; run.y0 = Math.min(run.y0, c[2]); run.y1 = Math.max(run.y1, c[3]); continue; }
      if (run) out.push(run);
      run = { i0: c[0], i1: c[0], y0: c[2], y1: c[3] };
    }
    if (run) out.push(run);
    for (let j = out.length - 1; j >= 0 && out[j].k === undefined; j--) out[j].k = k;
  }
  return out.map(r => ({ x0: r.i0 * cell, x1: (r.i1 + 1) * cell, z0: r.k * cell, z1: (r.k + 1) * cell, y0: Math.max(0, r.y0), y1: r.y1 }));
}

// ================================================================ the flown aircraft
export const BLADES_OFF = 900;          // rpm: faster than this the blades are seen only as the disc (FLIGHT LAB's rule)
export const DISC_ON = 60;              // rpm: slower than this there is no blur to draw
const SMEAR_S = 0.013;                  // s: how long the eye smears a blade over (a whole half-turn from ≈ 2300 rpm)
const DISC_GAIN = { out: 3.4, in: 1.2 };   // the disc is barely there from the seat, as in a real cockpit
const CABIN_AFT = 2.05;                 // m behind the eye: the cockpit's aft bulkhead (the cabin skin ends at the next ring)
const BEACON_T = 0.95;                  // s per turn of the rotating beacon (a flash each turn)
const STROBE_T = 1.2, STROBE_GAP = 0.13, STROBE_LEN = 0.045;   // a double flash every 1.2 s
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const NONE = Object.freeze({}), DARK = Object.freeze({});

function fuseAt(F, z) {
  for (let i = 0; i < F.length - 1; i++) { const a = F[i], b = F[i + 1]; if (z <= b[0]) { const t = Math.min(1, Math.max(0, (z - a[0]) / (b[0] - a[0]))); return a.map((v, k) => v + (b[k] - v) * t); } }
  return F[F.length - 1];
}
// where the cabin section of the fuselage ends: the first acmesh ring at or behind the cockpit's aft bulkhead
export function cabinRear(A) {
  const z = A.eye[2] + CABIN_AFT;
  for (const f of A.fuse) if (f[0] >= z - 1e-6) return f[0];
  return A.fuse[A.fuse.length - 1][0];
}

// the body's triangles in two lists, by centroid: the cabin section (the fuselage skin ahead of zRear with its caps, the
// nose cowling, the painted windows and windscreen) and the rest (wings, fin, nacelles, the tail cone). The fuselage
// skin is told from the wing roots inside it by the superellipse it was lofted on (acmesh: 22 points, exponent 2.5).
export function splitBody(m, A, zRear = cabinRear(A)) {
  const F = A.fuse, z0 = F[0][0], z1 = F[F.length - 1][0], nose = A.engines.some(e => e.type === 'nose');
  const p = m.pos, c = m.col, cabin = [], rest = [];
  const glass = o => Math.abs(c[o] - 0.10) < 1e-4 && Math.abs(c[o + 1] - 0.14) < 1e-4 && Math.abs(c[o + 2] - 0.19) < 1e-4;
  for (let t = 0, n = m.count / 3; t < n; t++) {
    const o = t * 9, cx = (p[o] + p[o + 3] + p[o + 6]) / 3, cy = (p[o + 1] + p[o + 4] + p[o + 7]) / 3, cz = (p[o + 2] + p[o + 5] + p[o + 8]) / 3;
    let cab = false;
    if (glass(o) && glass(o + 3) && glass(o + 6)) cab = true;
    else if (cz < z0 - 1e-6) cab = nose && Math.abs(cx) < F[0][1] + 0.02;            // the cowling ahead of the fuselage
    else if (cz < zRear && cz <= z1 + 1e-6) {
      const f = fuseAt(F, cz), e = Math.pow(Math.abs(cx) / f[1], 2.5) + Math.pow(Math.abs(cy - f[3]) / f[2], 2.5);
      cab = (e > 0.9 && e < 1.04) || Math.abs(cz - z0) < 1e-6;
    }
    (cab ? cabin : rest).push(t);
  }
  return { cabin, rest };
}

// a BufferGeometry from an acmesh mesh (sRGB vertex colours → linear), optionally only some triangles, optionally shifted
function geometryOf(m, tris = null, shift = null) {
  const n = tris ? tris.length : m.count / 3, pos = new Float32Array(n * 9), nrm = new Float32Array(n * 9), col = new Float32Array(n * 9);
  for (let i = 0; i < n; i++) {
    const t = tris ? tris[i] : i;
    for (let k = 0; k < 9; k++) { pos[i * 9 + k] = m.pos[t * 9 + k] + (shift ? shift[k % 3] : 0); nrm[i * 9 + k] = m.nrm[t * 9 + k]; col[i * 9 + k] = toLin(m.col[t * 9 + k]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// the propeller's disc: what the eye keeps of two blades turning (no texture: drawn from the position on the disc).
// Each blade covers its own width plus the arc it swept during SMEAR_S; over that arc it is seen for (width / arc) of
// the time, so it thins out as it speeds up until, past half a turn, the disc is even — darker towards the hub where
// the blades are wide, with a yellow ring from the tips. The disc turns with the blades (it is under the same pivot).
function discMaterial(e, dir) {
  const U = {
    uR: { value: e.r }, uHub: { value: 0.1 }, uTip: { value: 0.1 + (e.r - 0.1) * 5 / 6 }, uDir: { value: dir },
    uSweep: { value: 0 }, uAlpha: { value: 0 }, uGain: { value: DISC_GAIN.out },
    uBlade: { value: new THREE.Vector3(toLin(0.13), toLin(0.13), toLin(0.14)) }, uTipC: { value: new THREE.Vector3(toLin(0.95), toLin(0.78), toLin(0.15)) },
  };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, envMapIntensity: 0.5, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vDP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvDP = position.xy;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vDP; uniform float uR, uHub, uTip, uDir, uSweep, uAlpha, uGain; uniform vec3 uBlade, uTipC;')
      .replace('#include <map_fragment>', /* glsl */`
      {
        float rr = length(vDP);
        float f = clamp((rr - uHub) / (uR - uHub), 0.0, 1.0);
        float aw = min(2.0 * uR * 0.09 * (1.0 - 0.4 * f) * cos(0.45 - 0.3 * f) / max(rr, 0.02), 1.4);   // a blade's width here (rad)
        float span = aw + min(uSweep, PI);                                         // what one blade covered in the smear
        float d = mod(uDir * (atan(vDP.y, vDP.x) - 0.5 * PI) + 0.5 * aw, PI);      // radians behind a leading edge
        float full = smoothstep(0.7 * PI, PI, span);                               // half a turn smeared: an even disc
        float m = mix(smoothstep(0.0, 0.04, d) * (1.0 - smoothstep(0.55 * span, span, d)), 1.0, full);
        float cov = aw / clamp(span, aw, PI);                                      // the share of the time a point is covered
        float tip = smoothstep(uTip - 0.008, uTip + 0.008, rr);
        float a = uAlpha * clamp(cov * uGain * (1.0 + 0.6 * tip), 0.0, 0.9) * m;
        a *= smoothstep(uHub, uHub + 0.05, rr) * (1.0 - smoothstep(uR - 0.015, uR, rr));
        diffuseColor = vec4(mix(uBlade, uTipC, tip), a);
      }`);
  };
  mat.customProgramCacheKey = () => 'cadet-prop-disc';
  return { mat, U };
}

// ---------------------------------------------------------------- exterior lights
// where they are on the airframe (body frame) and what they look like. Nav lights: red left tip, green right tip (each
// seen from ahead to 110° to its side), white on the tail cone (140° aft); the red beacon on the fin top; white strobes
// in the tip lenses; landing and taxi lights in the lower nose, looking ahead (a design choice: the Archer III family
// carries them in the cowling).
const L_COL = { red: [1.0, 0.045, 0.02], green: [0.04, 1.0, 0.32], white: [1.0, 0.94, 0.86], xenon: [0.9, 0.95, 1.0], led: [1.0, 0.96, 0.9] };
export function lightSpots(A) {
  const w = A.wing, tipY = w.y + (w.tipX - w.rootX) * Math.tan(w.dih * DEG), navZ = w.tipLE + 0.16 * w.tipC;
  const F = A.fuse, end = F[F.length - 1], vs = A.vstab, hs = A.hstab;
  const finLE = y => vs.rootLE + (vs.topLE - vs.rootLE) * (y - vs.y0) / (vs.y1 - vs.y0);
  const tTail = hs.y >= vs.y1 - 0.2;                                              // a T-tail: on the fin's leading edge, below the stabilator
  const beacon = tTail ? [0, vs.y1 - 0.16, finLE(vs.y1 - 0.16) - 0.03] : [0, vs.y1 + 0.03, (vs.topLE + vs.hinge) / 2];
  const zl = F[0][0] + 0.12, f = fuseAt(F, zl), kx = Math.pow(Math.cos(40 * DEG), 0.8), ky = Math.pow(Math.sin(40 * DEG), 0.8);
  const nose = s => [s * f[1] * kx * 0.98, f[3] - f[2] * ky * 0.98, zl - 0.012];
  const side = (s, deg) => [s * Math.sin(deg * DEG), 0, -Math.cos(deg * DEG)];
  const fwd = (x, y) => { const l = Math.hypot(x, y, 1); return [x / l, y / l, -1 / l]; };
  // size: the halo's radius (m), at most `ang` (the tangent of its angular radius: glare is in the eye, so a lamp close
  // by does not fill the view); cone: [cos of the outer edge, cos of the inner edge, sharpness], cone[0] < −1: all round.
  // glow: the halo's strength; lens: the lens's own glow, kept low for the coloured ones so that by day (AgX turns
  // anything much brighter white) a red lens still looks red — at night the halo does the glowing
  return [
    { id: 'navL', pos: [-(w.tipX + 0.012), tipY, navZ], col: L_COL.red, size: 0.3, ang: 0.022, glow: 2.2, lens: 4, axis: side(-1, 55), cone: [Math.cos(82 * DEG), Math.cos(55 * DEG), 1], lensId: 0 },
    { id: 'navR', pos: [w.tipX + 0.012, tipY, navZ], col: L_COL.green, size: 0.3, ang: 0.022, glow: 2.2, lens: 3, axis: side(1, 55), cone: [Math.cos(82 * DEG), Math.cos(55 * DEG), 1], lensId: 1 },
    { id: 'tail', pos: [0, end[3], end[0] + 0.012], col: L_COL.white, size: 0.22, ang: 0.018, glow: 1.6, lens: 5, axis: [0, 0, 1], cone: [Math.cos(92 * DEG), Math.cos(70 * DEG), 1], lensId: 2 },
    { id: 'beacon', pos: beacon, col: L_COL.red, size: 0.45, ang: 0.03, glow: 10, lens: 7, axis: [0, 1, 0], cone: [-2, -1, 1], lensId: 3 },
    { id: 'strobeL', pos: [-(w.tipX + 0.02), tipY, navZ + 0.02], col: L_COL.xenon, size: 0.9, ang: 0.045, glow: 50, lens: 90, axis: [0, 1, 0], cone: [-2, -1, 1], lensId: 0 },
    { id: 'strobeR', pos: [w.tipX + 0.02, tipY, navZ + 0.02], col: L_COL.xenon, size: 0.9, ang: 0.045, glow: 50, lens: 90, axis: [0, 1, 0], cone: [-2, -1, 1], lensId: 1 },
    { id: 'landing', pos: nose(-1), col: L_COL.led, size: 0.6, ang: 0.05, glow: 40, lens: 40, axis: fwd(-0.02, -0.06), cone: [Math.cos(35 * DEG), Math.cos(6 * DEG), 3], lensId: 4 },
    { id: 'taxi', pos: nose(1), col: L_COL.led, size: 0.45, ang: 0.04, glow: 24, lens: 30, axis: fwd(0.14, -0.14), cone: [Math.cos(50 * DEG), Math.cos(12 * DEG), 2], lensId: 5 },
  ];
}

const GLOW_VS = /* glsl */`
  attribute vec2 corner; attribute float lid; attribute float amax; attribute vec3 axis; attribute vec3 cone;
  uniform vec4 uL[8]; uniform float uMin;
  varying vec3 vC; varying vec2 vQ;
  void main() {
    vec4 L = uL[int(lid + 0.5)];
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = max(length(mv.xyz), 1e-4);
    vec3 toCam = -mv.xyz / dist;
    float k = 1.0;                                                       // the lamp's beam or sector, seen from here
    if (cone.x > -1.5) k = pow(smoothstep(cone.x, cone.y, dot(normalize(mat3(modelViewMatrix) * axis), toCam)), cone.z);
    vC = L.rgb * k;
    mv.xyz += toCam * min(L.w, dist * 0.5);                              // in front of the wingtip or the nose it sits on
    float sy = L.w * projectionMatrix[1][1] / max(-mv.z, 1e-3), s = clamp(sy, uMin, max(amax * projectionMatrix[1][1], uMin));
    vC *= clamp(sy / s, 0.25, 1.0);                                      // far away: a small dot that dims slowly
    vQ = corner;
    vec4 cp = projectionMatrix * mv;
    cp.xy += corner * vec2(s * projectionMatrix[0][0] / projectionMatrix[1][1], s) * cp.w;
    gl_Position = (vC.r + vC.g + vC.b > 1e-4) ? cp : vec4(0.0, 0.0, 2.0, 1.0);   // off: outside the view
  }`;
const GLOW_FS = /* glsl */`
  varying vec3 vC; varying vec2 vQ;
  void main() {
    float r2 = dot(vQ, vQ);
    if (r2 >= 1.0) discard;
    gl_FragColor = vec4(vC * (0.55 * exp(-r2 * 5.0) * (1.0 - r2) + exp(-r2 * 48.0)), 1.0);
  }`;

function buildLights(spots) {
  // the lenses: small domes and discs, one mesh; each lens glows with its slot of uLens
  const tint = { 0: [0.5, 0.05, 0.04], 1: [0.05, 0.45, 0.22], 3: [0.55, 0.05, 0.04] }, clear = [0.62, 0.64, 0.68];
  const shapes = [];
  for (const sp of spots) {
    if (sp.id.startsWith('strobe')) continue;                                       // inside the nav lights' lenses
    let g;
    if (sp.id.startsWith('nav')) g = new THREE.SphereGeometry(1, 10, 6).scale(0.03, 0.026, 0.07);
    else if (sp.id === 'tail') g = new THREE.SphereGeometry(0.026, 8, 6);
    else if (sp.id === 'beacon') g = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.04, 0.05, 0.04);
    else g = new THREE.CylinderGeometry(0.045, 0.045, 0.014, 16).rotateX(Math.PI / 2).lookAt(new THREE.Vector3(...sp.axis));
    g.translate(...sp.pos);
    const n = g.attributes.position.count, rgb = (tint[sp.lensId] || clear).map(toLin), col = new Float32Array(n * 3), lid = new Float32Array(n).fill(sp.lensId);
    for (let i = 0; i < n; i++) col.set(rgb, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('lid', new THREE.BufferAttribute(lid, 1));
    shapes.push(g.index ? g.toNonIndexed() : g);
  }
  const lensU = { uLens: { value: Array.from({ length: 6 }, () => new THREE.Vector3()) } };
  const lensMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0, envMapIntensity: 1.2 });
  lensMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, lensU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float lid; uniform vec3 uLens[6]; varying vec3 vLit;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLit = uLens[int(lid + 0.5)];');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLit;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vLit;');
  };
  lensMat.customProgramCacheKey = () => 'cadet-ac-lens';
  const lens = new THREE.Mesh(mergeGeometries(shapes), lensMat); lens.name = 'lights';
  shapes.forEach(g => g.dispose());
  // the halos: a quad per lamp, turned to the camera in the vertex shader (one draw call for all of them)
  const n = spots.length, pos = new Float32Array(n * 12), corner = new Float32Array(n * 8), lid = new Float32Array(n * 4), amax = new Float32Array(n * 4), axis = new Float32Array(n * 12), cone = new Float32Array(n * 12), idx = [];
  const C = [-1, -1, 1, -1, 1, 1, -1, 1];
  spots.forEach((sp, i) => {
    for (let v = 0; v < 4; v++) { const j = i * 4 + v; pos.set(sp.pos, j * 3); axis.set(sp.axis, j * 3); cone.set(sp.cone, j * 3); corner[j * 2] = C[v * 2]; corner[j * 2 + 1] = C[v * 2 + 1]; lid[j] = i; amax[j] = sp.ang; }
    idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gg.setAttribute('corner', new THREE.BufferAttribute(corner, 2));
  gg.setAttribute('lid', new THREE.BufferAttribute(lid, 1)); gg.setAttribute('amax', new THREE.BufferAttribute(amax, 1)); gg.setAttribute('axis', new THREE.BufferAttribute(axis, 3)); gg.setAttribute('cone', new THREE.BufferAttribute(cone, 3));
  gg.setIndex(idx);
  const glowU = { uL: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) }, uMin: { value: 0.0035 } };
  const glowMat = new THREE.ShaderMaterial({ uniforms: glowU, vertexShader: GLOW_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true, fog: false });
  const glow = new THREE.Mesh(gg, glowMat); glow.name = 'light-glow'; glow.frustumCulled = false;
  for (const m of [lens, glow]) { m.castShadow = false; m.receiveShadow = false; }
  lens.receiveShadow = true;
  return { lens, glow, lensU: lensU.uLens.value, glowU: glowU.uL.value, geos: [lens.geometry, gg], mats: [lensMat, glowMat] };
}

// a strobe flash anywhere in (t0, t1] (or at t1 when paused): none is missed at a low frame rate
function flashIn(t0, t1) {
  const n1 = Math.floor(t1 / STROBE_T);
  for (let n = n1 - 1; n <= n1; n++) for (let k = 0; k < 2; k++) {
    const a = n * STROBE_T + k * STROBE_GAP;
    if (a <= t1 && a + STROBE_LEN > t0) return true;
  }
  return false;
}

// the flown aircraft: liveAircraft(FL, A, { cabinRear }) → { root, update(s, { dt, rpmVisual, lights, inside }),
// setInside(v), cabin, parts, spots, dispose }. Pose the root from the physics (position, quaternion) every frame.
// parts: body (with the parts that never move, named in parts.fixed: the Archer's gear), cabin, each hinged part by
// name, props / discs (prop / disc: the first engine's), lights (the lenses), glow (the halos).
// rpmVisual (a number, or one per engine) overrides the engines' rpm for the eye — an engine start or stop — and the
// propeller then turns by it; otherwise the blades sit at the physics' own angle. lights: { nav, beacon, strobe,
// landing, taxi } (true/false or 0..1). inside (or setInside): the cockpit view, where the cabin section is not drawn
// and casts no shadow, and the disc is fainter.
export function liveAircraft(FL, A, opts = {}) {
  const { paintMat, propMat } = materials();
  const root = new THREE.Group(); root.name = 'aircraft-live-' + A.id;
  const parts = { props: [], discs: [] }, hinges = [], props = [], geos = [], mats = [];
  const zRear = opts.cabinRear ?? cabinRear(A);
  const raw = FL.acmesh.buildParts(A);
  const discOf = new Map(raw.filter(p => p.disc != null).map(p => [p.disc, p]));
  const mesh = (geo, mat, name, cast = true) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; geos.push(geo); return m; };
  // the parts that never move (the Archer's fixed gear legs) go into the body's mesh: one draw call for all of them
  const fixed = [];
  parts.fixed = [];
  for (const p of raw) {
    if (p.disc != null) continue;
    if (p.name === 'body') {
      const { cabin, rest } = splitBody(p.mesh, A, zRear);
      fixed.unshift(geometryOf(p.mesh, rest));
      root.add(parts.cabin = mesh(geometryOf(p.mesh, cabin), paintMat, 'cabin'));
      continue;
    }
    if (!(p.pivot && p.angle) && p.prop == null) { fixed.push(geometryOf(p.mesh)); parts.fixed.push(p.name); continue; }
    const m = mesh(geometryOf(p.mesh), p.prop != null ? propMat : paintMat, p.name);
    const pivot = new THREE.Group(); pivot.name = p.name + '-pivot'; pivot.position.set(...p.pivot);
    m.position.set(-p.pivot[0], -p.pivot[1], -p.pivot[2]);
    pivot.add(m); root.add(pivot);
    if (p.prop == null) { hinges.push({ pivot, axis: new THREE.Vector3(...p.axis), angle: p.angle }); parts[p.name] = m; continue; }
    // a propeller: its blades and its disc under one pivot; acmesh turns it counter-clockwise seen from the cockpit
    // (+z), a Lycoming turns the other way: the angle is negated (and the twin's right engine still turns opposite)
    const e = A.engines[0], sign = A.counterRotating && p.prop === 1 ? -1 : 1, dp = discOf.get(p.prop);
    const { mat, U } = discMaterial(e, sign); mats.push(mat);
    const disc = mesh(geometryOf(dp.mesh, null, [-p.pivot[0], -p.pivot[1], -p.pivot[2]]), mat, 'disc', false);
    disc.geometry.deleteAttribute('color'); disc.visible = false; pivot.add(disc);
    props.push({ idx: p.prop, sign, angle: p.angle, pivot, blades: m, disc, U, ang: 0, rpm: 0 });
    parts.props.push(m); parts.discs.push(disc);
  }
  const bodyGeo = fixed.length > 1 ? mergeGeometries(fixed) : fixed[0];
  if (fixed.length > 1) fixed.forEach(g => g.dispose());
  root.add(parts.body = mesh(bodyGeo, paintMat, 'body'));
  parts.prop = parts.props[0]; parts.disc = parts.discs[0];
  const spots = lightSpots(A), lt = buildLights(spots);
  root.add(lt.lens, lt.glow); parts.lights = lt.lens; parts.glow = lt.glow;
  geos.push(...lt.geos); mats.push(...lt.mats);
  const slot = {};
  spots.forEach((sp, i) => { slot[sp.id] = { sp, glow: lt.glowU[i], lens: lt.lensU[sp.lensId] }; });
  const S = { navL: slot.navL, navR: slot.navR, tail: slot.tail, beacon: slot.beacon, strobeL: slot.strobeL, strobeR: slot.strobeR, landing: slot.landing, taxi: slot.taxi };
  let inside = false, clock = 0.37;

  function setInside(v) {
    inside = !!v;
    parts.cabin.visible = !inside; parts.cabin.castShadow = !inside;
    for (const pr of props) pr.U.uGain.value = inside ? DISC_GAIN.in : DISC_GAIN.out;
  }

  // ---- per frame (no allocation: the tests read this part of the source)
  function glowSet(sl, k) {
    const c = sl.sp.col, g = k * sl.sp.glow;
    sl.glow.set(c[0] * g, c[1] * g, c[2] * g, sl.sp.size);
  }
  function lensAdd(sl, k) {
    const c = sl.sp.col, g = k * sl.sp.lens;
    sl.lens.x += c[0] * g; sl.lens.y += c[1] * g; sl.lens.z += c[2] * g;
  }
  function lightsUpdate(o, dt) {
    const t0 = clock; clock += dt;
    const nav = +o.nav || 0, strobe = +o.strobe || 0, land = +o.landing || 0, taxi = +o.taxi || 0;
    const ph = (clock / BEACON_T) % 1, beacon = (+o.beacon || 0) * (0.03 + Math.exp(-((ph - 0.5) / 0.07) * ((ph - 0.5) / 0.07)));
    const flash = strobe > 0 && flashIn(t0, clock) ? strobe : 0;
    for (let i = 0; i < 6; i++) lt.lensU[i].set(0, 0, 0);
    glowSet(S.navL, nav); glowSet(S.navR, nav); glowSet(S.tail, nav); glowSet(S.beacon, beacon);
    glowSet(S.strobeL, flash); glowSet(S.strobeR, flash); glowSet(S.landing, land); glowSet(S.taxi, taxi);
    lensAdd(S.navL, nav); lensAdd(S.navR, nav); lensAdd(S.tail, nav); lensAdd(S.beacon, beacon);
    lensAdd(S.strobeL, flash); lensAdd(S.strobeR, flash); lensAdd(S.landing, land); lensAdd(S.taxi, taxi);
  }
  function update(s, o) {
    if (!o) o = NONE;
    const dt = o.dt > 0 ? Math.min(o.dt, 0.25) : 0;
    if ((o.inside === true || o.inside === false) && o.inside !== inside) setInside(o.inside);
    for (let i = 0; i < hinges.length; i++) { const h = hinges[i]; h.pivot.quaternion.setFromAxisAngle(h.axis, h.angle(s) || 0); }
    const rv = o.rpmVisual;
    for (let i = 0; i < props.length; i++) {
      const pr = props[i], e = s.eng ? s.eng[pr.idx] : null;
      let rpm;
      if (rv == null) { rpm = e ? e.rpm : s.rpm; pr.ang = -(pr.angle(s) || 0); }
      else { rpm = typeof rv === 'number' ? rv : rv[pr.idx]; if (rpm > 0) pr.ang = (pr.ang - pr.sign * rpm / 60 * 2 * Math.PI * dt) % (2 * Math.PI); }
      if (!(rpm > 0)) rpm = 0;
      pr.rpm = rpm;
      pr.pivot.quaternion.setFromAxisAngle(Z_AXIS, pr.ang);
      pr.blades.visible = rpm < BLADES_OFF;
      pr.disc.visible = rpm > DISC_ON;
      pr.U.uSweep.value = rpm / 60 * 2 * Math.PI * SMEAR_S;
      pr.U.uAlpha.value = THREE.MathUtils.smoothstep(rpm, DISC_ON, 500);
    }
    lightsUpdate(o.lights || DARK, dt);
  }
  // ---- end of the per-frame code

  setInside(false);
  return {
    root, cabin: parts.cabin, parts, spots, zRear,
    update, setInside,
    get inside() { return inside; },
    get rpm() { return props.length ? props[0].rpm : 0; },
    dispose() { root.removeFromParent(); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); },
  };
}
