// CADET — npc/actor.js : a person built at start-up (no model files) — the flight instructor of M2, and later the
// academy's other people. A hierarchy of groups (hips → spine → chest → neck → head; shoulders → upper arm → forearm →
// hand; thighs → shins → feet) with one merged mesh per moving part, so it animates without a skeleton: breathing and a
// slow weight shift (the feet stay planted: two-bone IK), blinking eyelids, eyes and head that follow a point within
// human limits, a mouth that moves in syllables while talking, hands that gesture now and then, and short keyframed
// gestures (nod, point, explain, wave, shrug).
// Soft low-poly like the academy's props: rounded lofted shapes with smooth normals and flat colours. Every actor
// shares one material: the colour is per vertex (linear), and roughness / metalness come from a tiny palette texture
// (each part's uv points at its texel), so a body is 20 draw calls. update() makes no new objects (it reuses its vectors
// and quaternions).
// The look is fictional: a white short-sleeved pilot shirt with navy epaulettes (3 gold bars), a navy tie, a lanyard
// ID card and a small SHOYO wing badge, navy trousers, black shoes.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const DEG = Math.PI / 180, TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const SIDES = ['L', 'R'];
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- limits and sizes (metres; bind pose: feet at y = 0, facing +z)
export const LIMITS = { headYaw: 70 * DEG, headPitch: 35 * DEG, eyes: 15 * DEG };
const MODEL_H = 1.745;                                   // the top of the hair
const ANKLE_Y = 0.085, L1 = 0.42, L2 = 0.41, HIPJ_Y = ANKLE_Y + 0.996 * (L1 + L2);
const P = {
  hips: [0, 0.95, 0], spine: [0, 1.03, -0.004], chest: [0, 1.22, 0], neck: [0, 1.445, -0.018], head: [0, 1.535, -0.012],
  clav: [0.03, 1.405, -0.014], uarm: [0.172, 1.39, -0.016], thigh: [0.092, HIPJ_Y, 0.004], ankle: [0.098, ANKLE_Y, 0.004],
};
const UARM_LEN = 0.295, FARM_LEN = 0.25, TOE_OUT = 7 * DEG;
const DOWN = new THREE.Vector3(0, -1, 0), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
const _lq = new THREE.Quaternion(), _lq2 = new THREE.Quaternion();
// two-bone IK of a leg in the hips' frame: `to` (changed) runs from the hip joint to the ankle; sets the thigh's and the
// shin's rotations (the knee forwards, the thigh turned out a little with the foot)
function legIK(to, s, thighQ, shinQ) {
  const d = clamp(to.length(), 0.3, (L1 + L2) * 0.9995); to.normalize();
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const k = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  thighQ.setFromUnitVectors(DOWN, to).multiply(_lq.setFromAxisAngle(AY, s * TOE_OUT * 0.6)).multiply(_lq2.setFromAxisAngle(AX, -a));
  shinQ.setFromAxisAngle(AX, k);
}
// the left leg standing at rest (the trousers are shaped for it)
const LEG_REST = { thigh: new THREE.Quaternion(), shin: new THREE.Quaternion() };
legIK(new THREE.Vector3(P.ankle[0] - P.thigh[0], P.ankle[1] - P.thigh[1], P.ankle[2] - P.thigh[2]), 1, LEG_REST.thigh, LEG_REST.shin);

// ---------------------------------------------------------------- the material: colour per vertex, roughness / metalness per class
const CLASSES = {
  skin: [0.56, 0], hair: [0.62, 0], brow: [0.8, 0], eye: [0.18, 0], iris: [0.1, 0], mouth: [0.75, 0], shirt: [0.8, 0], cloth: [0.7, 0],
  tie: [0.5, 0], trousers: [0.86, 0], leather: [0.4, 0], shoe: [0.24, 0], rubber: [0.9, 0], gold: [0.32, 0.85], silver: [0.26, 0.9], plastic: [0.32, 0],
};
const CLASS_IDS = Object.keys(CLASSES);
let MAT = null;
export function actorMaterial() {
  if (MAT) return MAT;
  const n = CLASS_IDS.length, data = new Uint8Array(n * 4);
  CLASS_IDS.forEach((k, i) => { const [r, m] = CLASSES[k]; data.set([255, Math.round(r * 255), Math.round(m * 255), 255], i * 4); });
  const t = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1, roughnessMap: t, metalnessMap: t });
  MAT.name = 'actor';
  return MAT;
}
// the mouth (the one part with a morph target) has a material of its own: one shared with the meshes that have none
// would make three.js switch the shader program back and forth every frame
let MOUTH_MAT = null;
function mouthMaterial() {
  if (!MOUTH_MAT) { MOUTH_MAT = actorMaterial().clone(); MOUTH_MAT.name = 'actor-mouth'; }   // (the same palette texture)
  return MOUTH_MAT;
}
const uOf = (cls) => (CLASS_IDS.indexOf(cls) + 0.5) / CLASS_IDS.length;

// sRGB colours (THREE.Color converts them to linear for the vertex colours)
export const COLORS = {
  skin: 0xd8a688, lid: 0xcf9a7c, lash: 0x3a2a24, lip: 0xb7766a, mouth: 0x5e2a2a, hair: 0x2a221e, eye: 0xf0ece5, iris: 0x4b3326,
  pupil: 0x0e0b0a, shirt: 0xf4f4f0, pocket: 0xe9eae5, button: 0xe6e3dc, navy: 0x16324f, tie: 0x1b3050, trousers: 0x1f2a3b,
  belt: 0x17171a, shoe: 0x111114, sole: 0x222225, gold: 0xf2b632, silver: 0xc9cdd2, card: 0xf7f7f3, photo: 0x9db1c6, ink: 0x56606b,
  lanyard: 0x1d4a82, strap: 0x1b1b1e, dial: 0x161a20,
};

// ---------------------------------------------------------------- geometry helpers (build time only)
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
function xf(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, order = 'XYZ') {
  _q.setFromEuler(_e.set(rx, ry, rz, order)); g.applyMatrix4(_m.compose(_p.set(x, y, z), _q, _s.set(1, 1, 1))); return g;
}
// shared vertices along seams and poles, so the normals are smooth everywhere
function clean(g) { g.deleteAttribute('uv'); g.deleteAttribute('normal'); const m = mergeVertices(g, 1e-7); g.dispose(); return m; }
const ellipsoid = (rx, ry, rz, ws = 12, hs = 8) => { const g = clean(new THREE.SphereGeometry(1, ws, hs)); g.scale(rx, ry, rz); g.computeVertexNormals(); return g; };
const capsule = (r, len, rs = 5, cs = 1) => { const g = clean(new THREE.CapsuleGeometry(r, len, cs, rs, 1)); g.computeVertexNormals(); return g; };
const cyl = (r0, r1, h, seg = 12) => { const g = clean(new THREE.CylinderGeometry(r1, r0, h, seg)); g.computeVertexNormals(); return g; };
const rbox = (w, h, d, r = 0.002, seg = 1) => (r > 0 && Math.min(w, h, d) > r * 2.2 ? new RoundedBoxGeometry(w, h, d, seg, r) : new THREE.BoxGeometry(w, h, d));
function mirrorX(g) {
  g.scale(-1, 1, 1);
  if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
  const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  g.index.needsUpdate = true; return g;
}
// a tube through rings { x, y, z, a, b, p } (superellipses of half-sizes a, b and exponent p). axis 'y': a across x and
// b across z, going up y; axis 'z': a across x and b across y, going along z. cap0 / cap1: false, or the end's bulge.
// A ring can also be { pts: [[x, y, z] × seg] } (in the same turning order: x = cos, z = sin), without caps.
function loft(rings, seg, axis = 'y', cap0 = false, cap1 = false) {
  const pos = [], idx = [], n = rings.length, Y = axis === 'y';
  for (const r of rings) for (let j = 0; j < seg; j++) {
    if (r.pts) { pos.push(...r.pts[j]); continue; }
    const t = j / seg * TAU, c = Math.cos(t), s = Math.sin(t), e = 2 / (r.p || 2);
    const u = Math.sign(c) * Math.pow(Math.abs(c), e) * r.a, v = Math.sign(s) * Math.pow(Math.abs(s), e) * r.b;
    if (Y) pos.push(r.x + u, r.y, r.z + v); else pos.push(r.x + u, r.y + v, r.z);
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * seg + j, b = i * seg + (j + 1) % seg, c = b + seg, d = a + seg;
    if (Y) idx.push(a, d, b, b, d, c); else idx.push(a, b, d, b, c, d);
  }
  const cap = (r, ring, off, start) => {
    const o = pos.length / 3; pos.push(r.x, r.y + (Y ? off : 0), r.z + (Y ? 0 : off));
    for (let j = 0; j < seg; j++) {
      const a = ring * seg + j, b = ring * seg + (j + 1) % seg;
      if (Y === start) idx.push(o, a, b); else idx.push(o, b, a);
    }
  };
  if (cap0 !== false) cap(rings[0], 0, -cap0, true);
  if (cap1 !== false) cap(rings[n - 1], n - 1, cap1, false);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals(); return g;
}
const ring = (y, a, b, x = 0, z = 0, p = 2) => ({ x, y, z, a, b, p });
// a grid of rows of vertices (each row the same length): rows[i][j] = [x, y, z]; faces towards (row → next row) × (j → j+1)
function grid(rows, wrap = false) {
  const pos = [], idx = [], n = rows.length, m = rows[0].length;
  for (const r of rows) for (const v of r) pos.push(v[0], v[1], v[2]);
  const mm = wrap ? m : m - 1;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < mm; j++) {
    const a = i * m + j, b = i * m + (j + 1) % m, c = b + m, d = a + m;
    idx.push(a, d, b, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}

// a part: geometries in one colour and class each, merged into one geometry (translated so `origin` is at 0)
class Part {
  constructor(colors) { this.geos = []; this.C = colors; }
  add(geo, col, cls) {
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.index) geo.setIndex([...Array(geo.attributes.position.count).keys()]);
    const n = geo.attributes.position.count, c = _c.set(typeof col === 'string' ? this.C[col] : col), cv = new Float32Array(n * 3), uv = new Float32Array(n * 2), u = uOf(cls);
    for (let i = 0; i < n; i++) { cv[i * 3] = c.r; cv[i * 3 + 1] = c.g; cv[i * 3 + 2] = c.b; uv[i * 2] = u; uv[i * 2 + 1] = 0.5; }
    geo.setAttribute('color', new THREE.BufferAttribute(cv, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.clearGroups(); this.geos.push(geo); return geo;
  }
  build(origin = null) {
    const g = mergeGeometries(this.geos); for (const x of this.geos) x.dispose();
    if (origin) g.translate(-origin[0], -origin[1], -origin[2]);
    g.computeBoundingSphere(); return g;
  }
}
// tint the vertices of a geometry (already added) whose test(x, y, z) is true
function tint(geo, col, test) {
  const p = geo.attributes.position, c = geo.attributes.color; _c.set(col);
  for (let i = 0; i < p.count; i++) if (test(p.getX(i), p.getY(i), p.getZ(i))) c.setXYZ(i, _c.r, _c.g, _c.b);
}

// ---------------------------------------------------------------- the head: a deformed sphere (bind space)
const HD = { cy: 1.622, cz: 0.012, ryU: 0.112, ryL: 0.117, w: 0.077, jaw: 0.0078, dF: 0.09, dB: 0.104, chin: 0.028 };
function headPt(ux, uy, uz, o) {
  const W = HD.w - HD.jaw * smooth(-0.15, -0.9, uy);
  // the underside rises from the chin towards the ears (a jaw line, not a round bowl)
  o.x = ux * W; o.y = HD.cy + uy * (uy >= 0 ? HD.ryU : HD.ryL) + 0.026 * smooth(-0.5, -1, uy) * smooth(0.5, -0.6, uz);
  // the back of the lower head is pulled in: the neck meets the skull at the occiput, the jaw ends under the ear
  const back = HD.dB * (1 - 0.42 * smooth(-0.1, -0.75, uy));
  o.z = HD.cz + (uz >= 0 ? Math.pow(uz, 0.8) * HD.dF : -Math.pow(-uz, 0.9) * back) + HD.chin * smooth(-0.25, -1, uy);
  return o;
}
// the face's z at (x, y) (the front of the deformed sphere)
function faceZ(x, y) {
  const uy = (y - HD.cy) / (y >= HD.cy ? HD.ryU : HD.ryL), ux = x / (HD.w - HD.jaw * smooth(-0.15, -0.9, uy));
  return HD.cz + Math.pow(Math.max(1 - ux * ux - uy * uy, 0), 0.4) * HD.dF + HD.chin * smooth(-0.25, -1, uy);
}
const EYE = { x: 0.0318, y: 1.622, r: 0.0121 };
EYE.z = faceZ(EYE.x, EYE.y) + 0.005 - EYE.r;             // the eyeball stands 5 mm out of the face
const MOUTH = { y: 1.548 }; MOUTH.z = faceZ(0, MOUTH.y);

function buildHead(C) {
  const H = new Part(C), o = new THREE.Vector3();
  // the skull and face
  const g = clean(new THREE.SphereGeometry(1, 24, 16)), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { headPt(p.getX(i), p.getY(i), p.getZ(i), o); p.setXYZ(i, o.x, o.y, o.z); }
  g.computeVertexNormals(); H.add(g, 'skin', 'skin');
  // short hair: a cap over the skull, thick on top and short at the sides, thinning to nothing on the hairline. The
  // columns sit where the hairline turns: forehead, temples, sideburns, over the ears, the nape.
  const NT = 6, rows = [], cols = [];
  for (const [a] of HAIRLINE) { if (a > 0 && a < 180) cols.push(-a); }
  cols.reverse(); cols.unshift(-180); cols.push(0, ...HAIRLINE.filter(([a]) => a > 0 && a < 180).map(([a]) => a));
  for (let j = 0; j <= NT; j++) {
    const row = [], f = j / NT;
    for (const a of cols) {
      const phi = a * DEG, th = Math.max(hairline(Math.abs(a)) * f, 1e-4) * DEG;
      headPt(Math.sin(th) * Math.sin(phi), Math.cos(th), Math.sin(th) * Math.cos(phi), o);
      const quiff = 0.005 * Math.max(0, Math.cos(phi)) ** 2 * Math.exp(-(((th / DEG - 36) / 16) ** 2));
      const t = lerp(0.0135, 0.0003, Math.pow(f, 1.7)) + quiff, dx = o.x, dy = o.y - HD.cy, dz = o.z - HD.cz, l = Math.hypot(dx, dy, dz);
      row.push([o.x + dx / l * t, o.y + dy / l * t, o.z + dz / l * t]);
    }
    rows.push(row);
  }
  const hair = clean(grid(rows, true)); hair.computeVertexNormals(); H.add(hair, 'hair', 'hair');
  // ears: tilted back a little, their back rim standing out from the head; the hollow a shade darker
  for (const s of [-1, 1]) {
    const e = ellipsoid(0.0085, 0.028, 0.0175, 8, 6); xf(e, s * 0.0765, 1.604, -0.012, -0.16, s * -0.42, s * -0.06); H.add(e, 'skin', 'skin');
    tint(e, C.lid, (x, y, z) => s * x > 0.0815 && Math.abs(y - 1.6) < 0.016 && z < -0.004);
  }
  // nose (bridge, tip, wings)
  // the nose: a narrow bridge widening to a soft tip (rings of [y, half width, half depth, out of the face at the front])
  { const N = [[1.567, 0.0055, 0.003, 0.004], [1.571, 0.0092, 0.0072, 0.011], [1.578, 0.0092, 0.0088, 0.0145], [1.589, 0.0074, 0.0086, 0.012], [1.602, 0.0064, 0.0072, 0.0075],
      [1.616, 0.0068, 0.005, 0.0025]];
    H.add(loft(N.map(([y, a, b, f]) => ring(y, a, b, 0, faceZ(0, y) + f - b, 2.2)), 10, 'y', 0.002, 0), 'skin', 'skin'); }
  for (const s of [-1, 1]) { const n = ellipsoid(0.0058, 0.0048, 0.0062, 6, 4); xf(n, s * 0.0098, 1.5735, faceZ(0.0098, 1.5735) + 0.0026, 0, s * 0.5); H.add(n, 'skin', 'skin'); }
  // eyeballs, lower lids (static) and brows
  for (const s of [-1, 1]) {
    const ex = s * EYE.x;
    // the eyeball's front half (the rest is inside the head)
    const ball = clean(new THREE.SphereGeometry(EYE.r, 12, 5, 0, TAU, 0, 0.6 * Math.PI)); ball.computeVertexNormals(); ball.rotateX(Math.PI / 2);
    xf(ball, ex, EYE.y, EYE.z); H.add(ball, 'eye', 'eye');
    const lo = clean(new THREE.SphereGeometry(1, 12, 3, 0, TAU, Math.PI / 2 + 20 * DEG, Math.PI / 2 - 20 * DEG));
    lo.scale(EYE.r * 1.07, EYE.r * 1.07, EYE.r * 1.07); lo.computeVertexNormals(); xf(lo, ex, EYE.y, EYE.z); H.add(lo, 'skin', 'skin');
    tint(lo, C.lid, (x, y) => y > EYE.y - EYE.r * 0.5);
    H.add(brow(s), 'hair', 'brow');
  }
  return H.build(P.head);
}
// the hairline: [|azimuth| (0 = the forehead, 180 = the nape), its angle from the crown] (degrees, round the unit head)
const HAIRLINE = [[0, 46], [24, 47.5], [44, 50], [54, 56], [62, 71], [70, 91], [77, 98], [83, 95], [89, 80], [98, 76], [107, 78], [114, 88],
  [122, 101], [140, 115], [160, 122], [180, 124]];
function hairline(a) {
  let i = 0; while (i < HAIRLINE.length - 2 && HAIRLINE[i + 1][0] < a) i++;
  const [a0, t0] = HAIRLINE[i], [a1, t1] = HAIRLINE[i + 1]; return lerp(t0, t1, clamp((a - a0) / (a1 - a0), 0, 1));
}
// an eyebrow on the brow ridge: a strip thicker at the inner end, arched, thin at the outer end; its edges sink into the skin
function brow(s) {
  const rows = [[], [], []], N = 6;
  for (let i = 0; i <= N; i++) {
    const u = i / N, x = lerp(0.0125, 0.0505, u), yc = 1.6445 + 0.0042 * Math.sin(Math.PI * Math.min(1, u * 1.3)) - 0.0035 * u * u;
    const hw = lerp(0.0033, 0.0013, u), lift = lerp(0.0017, 0.0007, u);
    [[hw, -0.0008], [0, lift], [-hw, -0.0008]].forEach(([dy, dz], k) => rows[k].push([x, yc + dy, faceZ(x, yc + dy) + dz]));
  }
  const g = grid(rows); g.computeVertexNormals();
  return s < 0 ? mirrorX(g) : g;
}
// the upper lids: one mesh for both eyes, turned about the line through the eyes' centres (blinks, follows the gaze)
function buildLids(C) {
  const L = new Part(C);
  for (const s of [-1, 1]) {
    const g = clean(new THREE.SphereGeometry(1, 12, 5, 0, TAU, 0, Math.PI / 2)); g.scale(EYE.r * 1.1, EYE.r * 1.1, EYE.r * 1.1); g.computeVertexNormals();
    g.translate(s * EYE.x, 0, 0); L.add(g, 'lid', 'skin');
    tint(g, C.lash, (x, y) => y < EYE.r * 0.12);         // the lash line along the edge
  }
  return L.build();
}
// one iris and pupil, on the front of the eyeball (turns with the eye)
function buildIris(C) {
  const I = new Part(C);
  const cap = (r, ang, col, rows) => { const g = clean(new THREE.SphereGeometry(r, 14, rows, 0, TAU, 0, ang)); g.computeVertexNormals(); g.rotateX(Math.PI / 2); I.add(g, col, 'iris'); };
  cap(EYE.r * 1.012, 33 * DEG, 'iris', 2); cap(EYE.r * 1.022, 14 * DEG, 'pupil', 1);
  return I.build();
}
// the mouth: a dark smile line that opens (a morph target) and the lower lip that drops with it; pivot on the upper lip
function buildMouth(C) {
  const M = new Part(C), curve = (x, y) => faceZ(x, MOUTH.y + y) - MOUTH.z, bend = (x) => 0.0022 * (x / 0.021) ** 2;
  const shape = (geo, closed, open) => {
    const p = geo.attributes.position, o = new Float32Array(p.count * 3), a = [0, 0, 0];
    for (let i = 0; i < p.count; i++) { const u = [p.getX(i), p.getY(i), p.getZ(i)]; closed(u, a); p.setXYZ(i, a[0], a[1], a[2]); open(u, a); o.set(a, i * 3); }
    geo.computeVertexNormals(); geo.morphAttributes.position = [new THREE.BufferAttribute(o, 3)]; return geo;
  };
  M.add(shape(clean(new THREE.SphereGeometry(1, 12, 6)),
    ([x, y, z], a) => { a[0] = x * 0.021; a[1] = y * 0.0016 + bend(a[0]); a[2] = z * 0.004 - 0.0021 + curve(a[0], a[1]); },
    ([x, y, z], a) => { a[0] = x * 0.0185; a[1] = y * 0.0072 - 0.0066 + bend(a[0]) * 0.7; a[2] = z * 0.0052 - 0.0036 + curve(a[0], a[1]); }), 'mouth', 'mouth');
  M.add(shape(clean(new THREE.SphereGeometry(1, 10, 5)),
    ([x, y, z], a) => { a[0] = x * 0.0145; a[1] = y * 0.0042 - 0.0062; a[2] = z * 0.004 - 0.0018 + curve(a[0], a[1]); },
    ([x, y, z], a) => { a[0] = x * 0.0138; a[1] = y * 0.0042 - 0.0062 - 0.0098; a[2] = z * 0.004 - 0.003 + curve(a[0], a[1]); }), 'lip', 'skin');
  const g = M.build(); g.computeBoundingSphere(); return g;
}
const buildNeck = (C) => {
  const N = new Part(C), z = P.neck[2];
  N.add(loft([ring(1.425, 0.056, 0.058, 0, z), ring(1.5, 0.054, 0.056, 0, z), ring(1.585, 0.05, 0.052, 0, z + 0.004)], 14, 'y', 0, 0), 'skin', 'skin');
  return N.build(P.neck);
};

// ---------------------------------------------------------------- the torso (shirt and what is on it), bind space
// rows: [y, half width, half depth, centre z, superellipse exponent]
const TORSO = [
  [0.960, 0.148, 0.096, 0.002, 2.4], [1.000, 0.152, 0.100, 0.004, 2.4], [1.060, 0.155, 0.104, 0.007, 2.4], [1.140, 0.160, 0.109, 0.011, 2.5],
  [1.220, 0.168, 0.115, 0.015, 2.6], [1.290, 0.174, 0.115, 0.014, 2.7], [1.345, 0.178, 0.108, 0.006, 2.8], [1.390, 0.179, 0.098, -0.004, 2.9],
  [1.420, 0.172, 0.086, -0.010, 2.8], [1.440, 0.140, 0.074, -0.013, 2.6], [1.456, 0.100, 0.064, -0.015, 2.3], [1.468, 0.064, 0.056, -0.016, 2.0],
];
// the trousers' section round the hips and seat (the legs carry it below the belt: see buildThigh)
const SEAT = [
  [0.78, 0.168, 0.09, -0.004, 2.4], [0.81, 0.170, 0.100, -0.008, 2.5], [0.85, 0.174, 0.108, -0.010, 2.5], [0.89, 0.176, 0.111, -0.008, 2.5],
  [0.94, 0.171, 0.109, -0.004, 2.5], [0.985, 0.163, 0.108, 0.000, 2.5], [1.012, 0.161, 0.108, 0.002, 2.5],
];
function rowAt(T, y) {
  let i = 0; while (i < T.length - 2 && T[i + 1][0] < y) i++;
  const a = T[i], b = T[i + 1], t = clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
  return a.map((v, k) => lerp(v, b[k], t));
}
function frontZ(T, x, y) { const [, wx, dz, cz, p] = rowAt(T, y), u = Math.min(Math.abs(x) / wx, 0.999); return cz + dz * Math.pow(1 - Math.pow(u, p), 1 / p); }
function frontN(T, x, y, o) { const h = 0.004; return o.set(-(frontZ(T, x + h, y) - frontZ(T, x - h, y)) / (2 * h), -(frontZ(T, x, y + h) - frontZ(T, x, y - h)) / (2 * h), 1).normalize(); }
// y of the shoulder's top at |x| (the upper rings, where the width shrinks towards the neck)
function shoulderY(x) {
  const U = TORSO.slice(7); let i = 0; while (i < U.length - 2 && U[i + 1][1] > x) i++;
  const a = U[i], b = U[i + 1]; return lerp(a[0], b[0], clamp((a[1] - x) / (a[1] - b[1]), 0, 1));
}
// put a small part (modelled facing +z, centred at 0) on the torso's front at (x, y), `off` out of the surface
function onFront(g, x, y, off) {
  const n = frontN(TORSO, x, y, new THREE.Vector3()), xa = new THREE.Vector3(0, 1, 0).cross(n).normalize(), ya = n.clone().cross(xa);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(xa, ya, n).setPosition(x, y, frontZ(TORSO, x, y) + off)); return g;
}
// a patch of cloth on the front (a pocket, a flap): a slab that follows the surface, its edges soft
function frontSlab(x0, x1, y0, y1, t, nx = 6, ny = 4) {
  const n = new THREE.Vector3(), pos = [], idx = [], W = nx + 1, at = (i, j) => j * W + i;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const x = lerp(x0, x1, i / nx), y = lerp(y0, y1, j / ny); frontN(TORSO, x, y, n);
    const z = frontZ(TORSO, x, y); pos.push(x + n.x * t, y + n.y * t, z + n.z * t);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) idx.push(at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
  const loop = [];
  for (let i = 0; i < nx; i++) loop.push(at(i, 0));
  for (let j = 0; j < ny; j++) loop.push(at(nx, j));
  for (let i = nx; i > 0; i--) loop.push(at(i, ny));
  for (let j = ny; j > 0; j--) loop.push(at(0, j));
  const base = pos.length / 3;
  for (const k of loop) { const x = pos[k * 3], y = pos[k * 3 + 1]; frontN(TORSO, x, y, n); const z = frontZ(TORSO, x, y); pos.push(x - n.x * 0.002, y - n.y * 0.002, z - n.z * 0.002); }
  for (let k = 0; k < loop.length; k++) { const f0 = loop[k], f1 = loop[(k + 1) % loop.length], b0 = base + k, b1 = base + (k + 1) % loop.length; idx.push(f0, b0, f1, f1, b0, b1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

function buildTorso(C) {
  const T = new Part(C);
  T.add(loft(TORSO.map(r => ring(r[0], r[1], r[2], 0, r[3], r[4])), 22, 'y', 0, 0.004), 'shirt', 'shirt');
  // the collar: a band round the neck, lower at the front, and its two points
  const nz = P.neck[2];
  { const c = loft([ring(1.452, 0.0595, 0.0625, 0, nz), ring(1.45, 0.0635, 0.0665, 0, nz), ring(1.49, 0.062, 0.065, 0, nz), ring(1.495, 0.06, 0.063, 0, nz),
      ring(1.49, 0.058, 0.061, 0, nz), ring(1.452, 0.0595, 0.0625, 0, nz)], 22, 'y');
    c.translate(0, -1.47, -nz); c.rotateX(13 * DEG); c.translate(0, 1.47, nz); T.add(c, 'shirt', 'shirt'); }
  for (const s of [-1, 1]) { const f = new THREE.BoxGeometry(0.026, 0.04, 0.003); f.translate(0, -0.012, 0); f.rotateZ(s * 0.62); T.add(onFront(f, s * 0.016, 1.448, 0.003), 'shirt', 'shirt'); }
  // the tie: the knot, then the blade down the shirt front to the belt
  { const k = rbox(0.03, 0.03, 0.016, 0.006, 1), p = k.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 + p.getY(i) * 9));                     // wider at the top
    k.computeVertexNormals(); xf(k, 0, 1.446, frontZ(TORSO, 0, 1.446) + 0.0045, -0.25); T.add(k, 'tie', 'tie'); }
  { const ys = [1.436, 1.4, 1.34, 1.26, 1.18, 1.1, 1.06, 1.044, 1.034], ws = [0.016, 0.0175, 0.022, 0.027, 0.032, 0.036, 0.037, 0.026, 0.006];
    T.add(loft(ys.map((y, i) => ring(y, ws[i], 0.0022, 0, frontZ(TORSO, 0, y) + 0.0032, 4)).reverse(), 8, 'y', 0, 0), 'tie', 'tie'); }
  // chest pockets with flaps and buttons; a pen in the left one
  for (const s of [-1, 1]) {
    const [x0, x1] = s > 0 ? [0.032, 0.122] : [-0.122, -0.032];
    T.add(frontSlab(x0, x1, 1.17, 1.292, 0.0024), 'pocket', 'shirt');
    T.add(frontSlab(x0 - 0.002, x1 + 0.002, 1.266, 1.3, 0.0052, 6, 2), 'shirt', 'shirt');
    const b = ellipsoid(0.004, 0.004, 0.0022, 6, 4); onFront(b, s * 0.077, 1.274, 0.0068); T.add(b, 'button', 'plastic');
  }
  { const pen = cyl(0.0042, 0.0042, 0.04, 8); onFront(pen, 0.108, 1.3, 0.0035); T.add(pen, 0x1a1c22, 'plastic');
    const clip = rbox(0.0022, 0.022, 0.0016, 0); onFront(clip, 0.108, 1.305, 0.0085); T.add(clip, 'silver', 'silver'); }
  // the wing badge (SHOYO, fictional) above the left pocket
  { const at = (g, x, y) => onFront(g, 0.077 + x, 1.333 + y, 0.0032);
    const d = cyl(0.0068, 0.0068, 0.003, 10); d.rotateX(Math.PI / 2); T.add(at(d, 0, 0), 'gold', 'gold');
    const d2 = cyl(0.0038, 0.0038, 0.003, 8); d2.rotateX(Math.PI / 2); d2.translate(0, 0, 0.0012); T.add(at(d2, 0, 0), 'navy', 'cloth');
    for (const s of [-1, 1]) {
      const w1 = rbox(0.03, 0.0062, 0.0024, 0); w1.rotateZ(s * 0.13); T.add(at(w1, s * 0.02, 0.0012), 'gold', 'gold');
      const w2 = rbox(0.021, 0.0042, 0.0024, 0); w2.rotateZ(s * 0.24); T.add(at(w2, s * 0.016, -0.0042), 'gold', 'gold');
    } }
  // epaulettes on the shoulders: navy, three gold bars at the outer end, a gold button at the inner end
  for (const s of [-1, 1]) {
    // a straight strap from the collar to the sleeve, resting on the shoulder's curve
    const xi = 0.07, xo = 0.166, yi = shoulderY(xi), yo = shoulderY(xo), ang = Math.atan2(yo - yi, xo - xi), len = Math.hypot(xo - xi, yo - yi);
    let lift = 0; for (let k = 0; k <= 8; k++) { const x = lerp(xi, xo, k / 8); lift = Math.max(lift, shoulderY(x) - lerp(yi, yo, k / 8)); }
    const cx = (xi + xo) / 2, cy = (yi + yo) / 2 + lift;
    const parts = [[rbox(len, 0.006, 0.05, 0.0025), 0, 0.003, 'navy', 'cloth']];
    for (let k = 0; k < 3; k++) parts.push([rbox(0.0048, 0.0024, 0.042, 0), len / 2 - 0.016 - k * 0.0095, 0.0068, 'gold', 'gold']);
    parts.push([cyl(0.0055, 0.0055, 0.003, 8), -len / 2 + 0.012, 0.0072, 'gold', 'gold']);
    for (const [g, x, y, col, cls] of parts) { g.translate(x, y, 0); g.rotateZ(ang); g.translate(cx, cy + 0.0015, -0.01); if (s < 0) mirrorX(g); T.add(g, col, cls); }
  }
  // the lanyard (a cord round the neck) and the ID card on it
  { const pts = [], over = (x) => 0.0045 + 0.0075 * Math.exp(-((x / 0.03) ** 2));
    const front = [[0.0, 1.262], [0.011, 1.29], [0.022, 1.33], [0.033, 1.38], [0.043, 1.42], [0.05, 1.445]];
    for (const [x, y] of front) pts.push(new THREE.Vector3(-x, y, frontZ(TORSO, x, y) + over(x)));
    const back = [[-0.062, 1.47, 0.01], [-0.066, 1.482, -0.03], [-0.04, 1.492, -0.075], [0, 1.495, -0.084], [0.04, 1.492, -0.075], [0.066, 1.482, -0.03], [0.062, 1.47, 0.01]];
    for (const [x, y, z] of back) pts.push(new THREE.Vector3(x, y, z));
    for (let i = front.length - 1; i > 0; i--) { const [x, y] = front[i]; pts.push(new THREE.Vector3(x, y, frontZ(TORSO, x, y) + over(x))); }
    const cord = clean(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), 30, 0.0033, 3, true)); cord.computeVertexNormals();
    T.add(cord, 'lanyard', 'cloth');
    const cz = frontZ(TORSO, 0, 1.2) + 0.014, card = (g, x, y, z = 0) => { g.translate(x, 1.2 + y, cz + z); return g; };
    T.add(card(rbox(0.054, 0.085, 0.0024, 0), 0, 0), 'card', 'plastic');
    T.add(card(rbox(0.054, 0.016, 0.0008, 0), 0, 0.0345, 0.0012), 'navy', 'plastic');
    T.add(card(rbox(0.018, 0.022, 0.0006, 0), -0.0135, 0.008, 0.0013), 'photo', 'plastic');
    for (let k = 0; k < 3; k++) T.add(card(rbox(k ? 0.019 : 0.023, 0.0026, 0.0006, 0), 0.0105 - (k ? 0.002 : 0), 0.014 - k * 0.0065, 0.0013), 'ink', 'plastic');
    T.add(card(rbox(0.04, 0.0024, 0.0006, 0), 0, -0.024, 0.0013), 'ink', 'plastic');
    for (const s of [-1, 1]) { const w = rbox(0.009, 0.0022, 0.0008, 0); w.rotateZ(s * 0.15); T.add(card(w, s * 0.006, 0.0345, 0.0018), 'gold', 'gold'); }
    T.add(card(rbox(0.012, 0.014, 0.004, 0), 0, 0.047, -0.0008), 'silver', 'silver');
  }
  return T.build(P.chest);
}
function buildHips(C) {
  const H = new Part(C), sec = (y, dw = 0, dd = 0, w = null) => { const r = rowAt(SEAT, y); return ring(y, w ?? r[1] + dw, r[2] + dd, 0, r[3], w ? 2 : r[4]); };
  // the waistband above the belt, and a core between the legs' two halves of the seat (a crease shows trouser colour)
  H.add(loft([sec(0.972), sec(0.99), sec(1.012)], 20, 'y', false, 0), 'trousers', 'trousers');
  H.add(loft([ring(0.796, 0.012, 0.04, 0, -0.006), ring(0.82, 0.02, 0.07, 0, -0.008), sec(0.86, 0, -0.006, 0.024), sec(0.975, 0, -0.006, 0.024)], 8, 'y', 0.008, false),
    'trousers', 'trousers');
  // the belt and its buckle
  const b0 = rowAt(SEAT, 0.962), b1 = rowAt(SEAT, 0.998);
  H.add(loft([ring(0.962, b0[1] - 0.002, b0[2] - 0.002, 0, b0[3], b0[4]), ring(0.962, b0[1] + 0.004, b0[2] + 0.004, 0, b0[3], b0[4]),
    ring(0.998, b1[1] + 0.004, b1[2] + 0.004, 0, b1[3], b1[4]), ring(0.998, b1[1] - 0.002, b1[2] - 0.002, 0, b1[3], b1[4])], 20, 'y'), 'belt', 'leather');
  const fz = b1[3] + b1[2] + 0.004;
  H.add(xf(rbox(0.046, 0.032, 0.007, 0), 0, 0.98, fz + 0.002), 'silver', 'silver');
  H.add(xf(rbox(0.034, 0.02, 0.003, 0), 0, 0.98, fz + 0.0055), 'belt', 'leather');
  return H.build(P.hips);
}

// ---------------------------------------------------------------- limbs (each in its bone's frame: the bone hangs down −y)
function buildUpperArm(C, s) {
  const A = new Part(C);
  // the sleeve: its cap low and a little outwards, so the shoulder runs on into it
  A.add(loft([ring(-0.122, 0.043, 0.041), ring(-0.128, 0.05, 0.048), ring(-0.121, 0.0525, 0.0505), ring(-0.06, 0.0535, 0.0515), ring(0, 0.0535, 0.052, 0.003),
    ring(0.016, 0.0465, 0.0455, 0.006), ring(0.026, 0.0345, 0.0335, 0.008), ring(0.031, 0.015, 0.015, 0.009)], 12, 'y', false, 0.002), 'shirt', 'shirt');
  A.add(loft([ring(-0.3, 0.03, 0.029), ring(-0.287, 0.036, 0.034), ring(-0.2, 0.0395, 0.038), ring(-0.12, 0.042, 0.041), ring(-0.08, 0.043, 0.042)], 10, 'y', 0.012, 0), 'skin', 'skin');
  const g = A.build(); return s < 0 ? mirrorX(g) : g;
}
function buildForearm(C, s) {
  const A = new Part(C);
  A.add(loft([ring(-0.262, 0.017, 0.024), ring(-0.247, 0.019, 0.027), ring(-0.18, 0.027, 0.032), ring(-0.08, 0.034, 0.036), ring(-0.03, 0.036, 0.035), ring(0, 0.034, 0.033),
    ring(0.02, 0.026, 0.026)], 10, 'y', 0.006, 0.004), 'skin', 'skin');
  if (s > 0) {
    // a watch on the left wrist: the strap round it, the case on the back of the wrist (outwards)
    A.add(loft([ring(-0.234, 0.02, 0.027), ring(-0.234, 0.0242, 0.031), ring(-0.216, 0.0242, 0.031), ring(-0.216, 0.021, 0.028)], 12, 'y'), 'strap', 'leather');
    const cs = cyl(0.0145, 0.0145, 0.006, 12); cs.rotateZ(Math.PI / 2); cs.translate(0.0245, -0.225, 0); A.add(cs, 'silver', 'silver');
    const d = cyl(0.0118, 0.0118, 0.002, 12); d.rotateZ(Math.PI / 2); d.translate(0.0278, -0.225, 0); A.add(d, 'dial', 'plastic');
  }
  const g = A.build(); return s < 0 ? mirrorX(g) : g;
}
// a finger: a tube of two segments bent towards the palm (−x) by c1 at the knuckle and c2 at the middle; tilted
// forwards by rx (the thumb); l1 = the share of the first segment
function finger(r, len, c1, c2, x, y, z, rx = 0, l1 = 0.52) {
  const a = len * l1, g = loft([ring(-len + r * 0.7, r * 0.8, r * 0.8), ring(-a, r * 0.94, r * 0.94), ring(0, r, r)], 5, 'y', r * 0.7, r * 0.6);
  const p = g.attributes.position, v = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (v.y < -a + 1e-6) { v.y += a; v.applyAxisAngle(Z, -c2); v.y -= a; }
    v.applyAxisAngle(Z, -c1); if (rx) v.applyAxisAngle(new THREE.Vector3(1, 0, 0), rx);
    p.setXYZ(i, v.x + x, v.y + y, v.z + z);
  }
  g.computeVertexNormals(); return g;
}
// the left hand (palm towards −x, thumb forwards +z), relaxed or pointing; the right one is its mirror image
function buildHand(C, s, pose) {
  const A = new Part(C), pt = pose === 'point';
  // the palm: a soft mitten, narrower at the wrist (rings: [y, half thickness, half width, x, z])
  const PALM = [[-0.097, 0.0105, 0.033, -0.001, 0.001], [-0.088, 0.0135, 0.0395, 0, 0.001], [-0.06, 0.015, 0.0405, 0.0005, 0.002], [-0.03, 0.0165, 0.036, 0.001, 0.003],
    [-0.005, 0.0195, 0.0295, 0.001, 0.002], [0.012, 0.0165, 0.024, 0, 0]];
  A.add(loft(PALM.map(([y, a, b, x, z]) => ring(y, a, b, x, z, 2.6)), 10, 'y', 0.004, 0.003), 'skin', 'skin');
  // fingers: [z, knuckle y, length, radius]; curls [knuckle, middle] in degrees, more towards the little finger
  const F = [[0.0255, -0.093, 0.07, 0.0088], [0.0085, -0.095, 0.078, 0.0092], [-0.0085, -0.093, 0.073, 0.0087], [-0.0245, -0.089, 0.058, 0.0077]];
  const curl = pt ? [[2, 4], [85, 100], [88, 100], [90, 100]] : [[18, 30], [22, 34], [26, 38], [30, 42]];
  F.forEach(([z, y, len, r], k) => A.add(finger(r, len, curl[k][0] * DEG, curl[k][1] * DEG, -0.003, y, z), 'skin', 'skin'));
  // the thumb: from the palm's front edge, forwards and down (folded across the curled fingers when pointing)
  A.add(pt ? finger(0.0112, 0.066, 38 * DEG, 52 * DEG, -0.008, -0.03, 0.033, -0.25, 0.55) : finger(0.0115, 0.068, 20 * DEG, 24 * DEG, -0.009, -0.03, 0.033, -0.36, 0.55), 'skin', 'skin');
  const g = A.build(); return s < 0 ? mirrorX(g) : g;
}
// trouser legs: [y in the bone's frame, half width, half depth, centre z]
const THIGH = [[-L1, 0.0595, 0.0615, 0], [-0.35, 0.064, 0.0665, 0], [-0.25, 0.07, 0.073, -0.001], [-0.17, 0.0745, 0.0775, -0.002], [-0.1, 0.078, 0.081, -0.003],
  [0, 0.08, 0.083, -0.004], [0.08, 0.078, 0.081, -0.004]];
const SHIN = [[-0.32, 0.059, 0.065, -0.003], [-0.2, 0.0595, 0.063, 0], [-0.08, 0.0585, 0.0605, 0], [0, 0.0565, 0.059, 0], [0.03, 0.05, 0.05, -0.005]];
// where a ray from (cx, Cz) in the direction (c, s) leaves the left half (x ≥ 0) of the seat's section at height y; cx
// puts the half's front and back corners on the rays at 120° and 240° (ring vertices: the two halves meet exactly there)
function halfSeat(y, c, s, out) {
  const [, W, D, Cz, p] = rowAt(SEAT, y), cx = D / Math.sqrt(3);
  if (c < 0 && Math.abs(s * cx / c) <= D * (1 + 1e-9)) return out.set(0, y, Cz - s * cx / c);   // through the middle (the fly, the seat seam)
  let lo = 0, hi = W * 2;
  for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2, x = cx + c * m; if (x >= 0 && Math.pow(Math.abs(x / W), p) + Math.pow(Math.abs(s * m / D), p) < 1) lo = m; else hi = m; }
  return out.set(cx + c * lo, y, Cz + s * lo);
}
// a trouser leg from the belt to just below the knee, in the thigh's frame (the left one; the right one is its mirror
// image). Each leg carries its half of the seat: the top rings are the half of the hips' section on its side (the two
// meet in the middle, as trousers do at the fly and the seat seam) and turn into the round thigh by the crotch, so there
// is no seam round the hips. Its end hugs the shin's top as the knee is bent at rest.
function buildThigh(C, s) {
  const A = new Part(C), seg = 12, inv = LEG_REST.thigh.clone().invert(), J = new THREE.Vector3(...P.thigh), v = new THREE.Vector3(), rings = [];
  for (const ys of [-0.03, -0.012]) {
    const [, a, b, zc] = rowAt(SHIN, ys), pts = [];
    for (let j = 0; j < seg; j++) { const t = j / seg * TAU; v.set(Math.cos(t) * (a + 0.0012), ys, zc + Math.sin(t) * (b + 0.0012)).applyQuaternion(LEG_REST.shin); pts.push([v.x, v.y - L1, v.z]); }
    rings.push({ pts });
  }
  for (const [y, a, b, z] of THIGH.slice(0, 4)) rings.push(ring(y, a, b, 0, z));
  for (const yb of [0.775, 0.8, 0.83, 0.865, 0.9, 0.94, 0.985]) {
    const yl = yb - HIPJ_Y, [, a, b, zc] = rowAt(THIGH, yl), pts = [];
    for (let j = 0; j < seg; j++) {
      const t = j / seg * TAU, c = Math.cos(t), sn = Math.sin(t), side = (1 + c) / 2;
      halfSeat(yb, c, sn, v).sub(J).applyQuaternion(inv);
      // the inside of the leg joins the other one just above the crotch; the outside blends into the hip slowly
      const w = smooth(lerp(0.77, 0.83, side), lerp(0.815, 0.93, side), yb);
      pts.push([lerp(c * a, v.x, w), lerp(yl, v.y, w), lerp(zc + sn * b, v.z, w)]);
    }
    rings.push({ pts });
  }
  A.add(loft(rings, seg, 'y'), 'trousers', 'trousers');
  const g = A.build(); return s < 0 ? mirrorX(g) : g;
}
function buildShin(C) {
  const A = new Part(C), hem = ANKLE_Y - 0.038 - (HIPJ_Y - L1 - L2);   // the hem 3.8 cm above the soles in the bind pose
  A.add(loft([ring(-L2 - hem + 0.006, 0.05, 0.058, 0, -0.004), ring(-L2 - hem, 0.0585, 0.067, 0, -0.006), ring(-L2 - hem + 0.012, 0.059, 0.067, 0, -0.006),
    ...SHIN.map(([y, a, b, z]) => ring(y, a, b, 0, z))], 10, 'y', false, 0.006), 'trousers', 'trousers');
  return A.build();
}
// the shoe, in the ankle's frame (the sole at y = −ANKLE_Y); left and right are the same (the toe-out is in the pose)
function buildFoot(C) {
  const A = new Part(C), y0 = -ANKLE_Y;
  const S = [[-0.072, 0.03, 0.006, 0.06], [-0.062, 0.041, 0, 0.083], [-0.03, 0.045, 0, 0.099], [0.03, 0.047, 0, 0.09], [0.09, 0.05, 0, 0.064],
    [0.15, 0.047, 0, 0.051], [0.195, 0.035, 0.003, 0.043], [0.214, 0.014, 0.011, 0.033]];
  A.add(loft(S.map(([z, a, b0, b1]) => ({ x: 0, y: y0 + (b0 + b1) / 2, z, a, b: (b1 - b0) / 2, p: 2.6 })), 12, 'z', 0.004, 0.003), 'shoe', 'shoe');
  tint(A.geos[0], C.sole, (x, y) => y < y0 + 0.011);                 // the sole and welt
  return A.build();
}

// ---------------------------------------------------------------- gestures: eased keyframe curves per channel (degrees)
const CH = ['headP', 'headY', 'headR', 'neckP', 'chestP', 'chestY', 'chestR', 'clavL', 'clavR',
  'flexL', 'abdL', 'rotL', 'elbowL', 'proL', 'wristL', 'flexR', 'abdR', 'rotR', 'elbowR', 'proR', 'wristR', 'aimL', 'aimR', 'glance',
  'pointHandL', 'pointHandR'];
const C_ = Object.fromEntries(CH.map((k, i) => [k, i]));
const UNITLESS = new Set(['aimL', 'aimR', 'glance', 'pointHandL', 'pointHandR']);
const AIM_CH = { L: [C_.aimL, C_.pointHandL], R: [C_.aimR, C_.pointHandR] };
const both = (k, keys) => ({ [k + 'L']: keys, [k + 'R']: keys });
const GESTURES = {
  nod: { dur: 1.0, ch: { headP: [0, 0, 0.2, 13, 0.42, -2, 0.6, 7, 0.85, 0, 1, 0], neckP: [0, 0, 0.2, 4, 0.42, -1, 0.6, 2, 0.85, 0, 1, 0] } },
  point: { dur: 2.6, ch: {
    aimR: [0, 0, 0.55, 1, 1.95, 1, 2.6, 0], elbowR: [0, 0, 0.55, -7, 1.95, -7, 2.6, 0], wristR: [0, 0, 0.55, -4, 1.95, -4, 2.6, 0],
    pointHandR: [0, 0, 0.28, 1, 2.25, 1, 2.5, 0], glance: [0, 0, 0.35, 1, 1.1, 1, 1.6, 0], clavR: [0, 0, 0.55, 3, 1.95, 3, 2.6, 0],
    headP: [0, 0, 1.3, 0, 1.6, 4, 1.9, 0, 2.6, 0] } },
  explain: { dur: 2.2, ch: {
    flexR: [0, 0, 0.4, 20, 1.0, 24, 1.5, 18, 2.2, 0], abdR: [0, 0, 0.4, 5, 1.0, 14, 1.5, 10, 2.2, 0], rotR: [0, 0, 0.4, 10, 1.0, 0, 1.5, 4, 2.2, 0],
    elbowR: [0, 0, 0.4, 60, 1.0, 66, 1.5, 58, 2.2, 0], proR: [0, 0, 0.4, -60, 1.5, -64, 2.2, 0], wristR: [0, 0, 0.4, -12, 1.5, -10, 2.2, 0],
    flexL: [0, 0, 0.5, 16, 1.1, 20, 1.6, 14, 2.2, 0], abdL: [0, 0, 0.5, 4, 1.1, 12, 1.6, 8, 2.2, 0], rotL: [0, 0, 0.5, 8, 1.1, 0, 1.6, 3, 2.2, 0],
    elbowL: [0, 0, 0.5, 54, 1.1, 60, 1.6, 50, 2.2, 0], proL: [0, 0, 0.5, -55, 1.6, -58, 2.2, 0], wristL: [0, 0, 0.5, -10, 1.6, -8, 2.2, 0],
    headP: [0, 0, 0.6, -3, 1.2, 3, 1.7, 0, 2.2, 0], chestP: [0, 0, 0.6, 2, 1.5, 2, 2.2, 0] } },
  wave: { dur: 2.6, ch: {
    abdR: [0, 0, 0.5, 72, 2.0, 72, 2.6, 0], flexR: [0, 0, 0.5, 22, 2.0, 22, 2.6, 0], elbowR: [0, 0, 0.5, 105, 2.0, 105, 2.6, 0],
    rotR: [0, 0, 0.5, -78, 0.75, -60, 1.0, -92, 1.25, -60, 1.5, -92, 1.75, -66, 2.0, -78, 2.6, 0], proR: [0, 0, 0.5, -15, 2.0, -15, 2.6, 0],
    clavR: [0, 0, 0.5, 6, 2.0, 6, 2.6, 0], headR: [0, 0, 0.5, 4, 2.0, 4, 2.6, 0], chestR: [0, 0, 0.5, 2, 2.0, 2, 2.6, 0] } },
  shrug: { dur: 1.6, ch: {
    ...both('clav', [0, 0, 0.35, 13, 0.95, 13, 1.6, 0]), ...both('elbow', [0, 0, 0.35, 68, 0.95, 68, 1.6, 0]), ...both('abd', [0, 0, 0.35, 5, 0.95, 5, 1.6, 0]),
    ...both('flex', [0, 0, 0.35, 6, 0.95, 6, 1.6, 0]), ...both('pro', [0, 0, 0.35, -80, 0.95, -80, 1.6, 0]), ...both('rot', [0, 0, 0.35, -14, 0.95, -14, 1.6, 0]),
    ...both('wrist', [0, 0, 0.35, -18, 0.95, -18, 1.6, 0]),
    headR: [0, 0, 0.35, 7, 0.95, 7, 1.6, 0], headP: [0, 0, 0.35, -3, 0.95, -3, 1.6, 0] } },
  // small beats of one hand while talking (not public)
  beatR: { dur: 1.2, ch: { elbowR: [0, 0, 0.35, 32, 0.75, 36, 1.2, 0], flexR: [0, 0, 0.35, 8, 0.75, 10, 1.2, 0], proR: [0, 0, 0.35, -40, 0.75, -44, 1.2, 0],
    wristR: [0, 0, 0.35, -8, 0.75, -4, 1.2, 0], headP: [0, 0, 0.4, 2, 0.8, -1, 1.2, 0] } },
  beatL: { dur: 1.2, ch: { elbowL: [0, 0, 0.35, 30, 0.75, 34, 1.2, 0], flexL: [0, 0, 0.35, 7, 0.75, 9, 1.2, 0], proL: [0, 0, 0.35, -38, 0.75, -42, 1.2, 0],
    wristL: [0, 0, 0.35, -8, 0.75, -4, 1.2, 0], headP: [0, 0, 0.4, 2, 0.8, -1, 1.2, 0] } },
};
// pointing at something on the actor's left: the same curves on the left arm (reported as 'point')
GESTURES.pointL = { dur: GESTURES.point.dur, alias: 'point',
  ch: Object.fromEntries(Object.entries(GESTURES.point.ch).map(([k, v]) => [k.replace(/^(aim|pointHand|elbow|wrist|clav)R$/, '$1L'), v])) };
const POINT_HOLD = 0.55, POINT_END = 1.95;                 // the point's hold (aim 1, finger out), from … to
export const GESTURE_NAMES = ['nod', 'point', 'explain', 'wave', 'shrug'];
// compiled: per channel the key times, values (radians) and monotone tangents (no overshoot past a key)
for (const [name, g] of Object.entries(GESTURES)) {
  g.pub = GESTURE_NAMES.includes(g.alias || name);          // the talking beats are not reported as gestures
  g.tracks = Object.entries(g.ch).map(([k, a]) => {
    const n = a.length / 2, t = new Float64Array(n), v = new Float64Array(n), m = new Float64Array(n), sc = UNITLESS.has(k) ? 1 : DEG;
    for (let i = 0; i < n; i++) { t[i] = a[i * 2]; v[i] = a[i * 2 + 1] * sc; }
    for (let i = 1; i < n - 1; i++) { const d0 = (v[i] - v[i - 1]) / (t[i] - t[i - 1]), d1 = (v[i + 1] - v[i]) / (t[i + 1] - t[i]); m[i] = d0 * d1 > 0 ? 2 * d0 * d1 / (d0 + d1) : 0; }
    if (C_[k] === undefined) throw new Error('actor: unknown gesture channel ' + k);
    return { ch: C_[k], t, v, m };
  });
}
function evalTrack(tr, x) {
  const { t, v, m } = tr, n = t.length;
  if (x <= t[0]) return v[0];
  if (x >= t[n - 1]) return v[n - 1];
  let i = 0; while (x > t[i + 1]) i++;
  const h = t[i + 1] - t[i], s = (x - t[i]) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * v[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * v[i + 1] + (s3 - s2) * h * m[i + 1];
}
// a critically damped spring (value at a[i], velocity at a[i + 1]): exact for any step, never overshoots from rest
function spring(a, i, target, w, dt) {
  const x0 = a[i] - target, v0 = a[i + 1], e = Math.exp(-w * dt), k = (v0 + w * x0) * dt;
  a[i] = target + (x0 + k) * e; a[i + 1] = (v0 - w * k) * e;
}

const NO_OPTS = Object.freeze({});

// ---------------------------------------------------------------- the actor
// opts: { seed (idle timing), height (m, default 1.745), colors: { skin, hair, … } (sRGB: 0xrrggbb or '#rrggbb') }
export function createActor(opts = {}) {
  opts = opts || {};
  const C = { ...COLORS }, mat = actorMaterial(), seed = opts.seed ?? 1;
  for (const [k, v] of Object.entries(opts.colors || {})) if (v != null) C[k] = v;   // (an undefined override keeps the default)
  const root = new THREE.Group(); root.name = 'actor';
  const body = new THREE.Group(); body.name = 'actor-body'; body.userData.bind = new THREE.Vector3(); root.add(body);
  const height = Number(opts.height ?? MODEL_H);               // a bad height falls back to the default (not a NaN body)
  body.scale.setScalar(clamp(Number.isFinite(height) ? height / MODEL_H : 1, 0.85, 1.12));
  const bones = {}, meshes = [];
  const bone = (name, parent, [x, y, z]) => {
    const g = new THREE.Group(); g.name = 'actor-' + name; const b = parent.userData.bind;
    g.position.set(x - b.x, y - b.y, z - b.z); g.userData.bind = new THREE.Vector3(x, y, z); g.userData.rest = g.position.clone();
    parent.add(g); bones[name] = g; return g;
  };
  const mesh = (name, geo, parent, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.name = 'actor-' + name; m.castShadow = shadow; m.receiveShadow = true; m.userData.actor = true;
    parent.add(m); meshes.push(m); return m;
  };
  const hips = bone('hips', body, P.hips), spine = bone('spine', hips, P.spine), chest = bone('chest', spine, P.chest);
  const neck = bone('neck', chest, P.neck), head = bone('head', neck, P.head);
  const torsoMesh = mesh('torso', buildTorso(C), chest);
  mesh('hips', buildHips(C), hips); mesh('neck', buildNeck(C), neck); mesh('head', buildHead(C), head);
  const mouthPivot = bone('mouth', head, [0, MOUTH.y, MOUTH.z]), mouth = mesh('mouth', buildMouth(C), mouthPivot, false);
  mouth.material = mouthMaterial();
  const lids = bone('lids', head, [0, EYE.y, EYE.z]); mesh('lids', buildLids(C), lids, false);
  const eyes = [-1, 1].map(s => { const e = bone(s > 0 ? 'eyeL' : 'eyeR', head, [s * EYE.x, EYE.y, EYE.z]); mesh(s > 0 ? 'irisL' : 'irisR', buildIris(C), e, false); return e; });
  const arm = {}, leg = {};
  for (const s of [1, -1]) {
    const L = s > 0 ? 'L' : 'R';
    const clav = bone('shoulder' + L, chest, [s * P.clav[0], P.clav[1], P.clav[2]]);
    const ua = bone('upperArm' + L, clav, [s * P.uarm[0], P.uarm[1], P.uarm[2]]);
    const fa = bone('forearm' + L, ua, [s * P.uarm[0], P.uarm[1] - UARM_LEN, P.uarm[2]]);
    const hd = bone('hand' + L, fa, [s * P.uarm[0], P.uarm[1] - UARM_LEN - FARM_LEN, P.uarm[2]]);
    ua.rotation.order = 'XZY';
    mesh('upperArm' + L, buildUpperArm(C, s), ua); mesh('forearm' + L, buildForearm(C, s), fa);
    const relaxed = buildHand(C, s, 'relaxed'), pointing = buildHand(C, s, 'point'), hm = mesh('hand' + L, relaxed, hd);
    arm[L] = { s, clav, ua, fa, hd, hm, relaxed, pointing };
    const th = bone('thigh' + L, hips, [s * P.thigh[0], P.thigh[1], P.thigh[2]]);
    const sh = bone('shin' + L, th, [s * P.thigh[0], P.thigh[1] - L1, P.thigh[2]]);
    const ft = bone('foot' + L, sh, [s * P.thigh[0], P.thigh[1] - L1 - L2, P.thigh[2]]);
    mesh('thigh' + L, buildThigh(C, s), th); mesh('shin' + L, buildShin(C), sh); mesh('foot' + L, buildFoot(C), ft);
    leg[L] = { s, th, sh, ft, ankle: new THREE.Vector3(s * P.ankle[0], P.ankle[1], P.ankle[2]), toe: new THREE.Quaternion().setFromAxisAngle(AY, s * TOE_OUT) };
  }
  let triangles = 0;
  for (const m of meshes) triangles += m.geometry.index.count / 3;
  for (const L of ['L', 'R']) triangles += Math.max(0, arm[L].pointing.index.count - arm[L].relaxed.index.count) / 3;

  // ---------------------------------------------------------------- state (made once; update() reuses it)
  const R1 = rng(seed), R2 = rng(seed * 7919 + 17);          // idle (blinks, glances) and talking: separate streams
  const ph = [R1() * TAU, R1() * TAU, R1() * TAU, R1() * TAU];
  const S = new Float64Array(12);                            // springs: head yaw, pitch; eyes yaw, pitch; mouth; talk nod
  const HY = 0, HP = 2, EY = 4, EP = 6, MO = 8, TN = 10;
  const G = new Float64Array(CH.length), F = new Float64Array(CH.length);
  let time = 0, gDef = null, gName = null, gT = 0, fadeT = 1;
  let blinkIn = 1.5 + R1() * 3, blinkT = -1, wanderIn = 2 + R1() * 2, wanderY = 0, wanderP = -2 * DEG, microIn = 1, microY = 0, microP = 0, lastHyT = 0;
  let sylT = 0, sylDur = 0, sylAmp = 0, sylLeft = 6, beatIn = 1.5;
  const tv = new THREE.Vector3(), pv = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const q1 = new THREE.Quaternion();
  // pointing: the asked-for target, and per arm where it is going (want) and where it aims now (aim, eased towards want)
  const pointTarget = new THREE.Vector3(), want = { L: new THREE.Vector3(), R: new THREE.Vector3() }, aimAt = { L: new THREE.Vector3(), R: new THREE.Vector3() };
  let hasPoint = false, pSide = 'R';
  const TURN_MAX = 40 * DEG;                                 // the upper body turns this far at most towards what is pointed at
  const AIM_RATE = 240 * DEG;                                // an arm swings over to a new target at most this fast (per second)
  const piv = new THREE.Vector3(), du = new THREE.Vector3(), dw = new THREE.Vector3(), ax = new THREE.Vector3();
  // the aim moves towards its goal by direction (seen from the chest, at a bounded rate) and by distance on a log scale:
  // a target much farther away, or across from the old one, never makes the arm jump
  function easeAim(p, goal, dt) {
    piv.set(0, 1.4, 0); body.localToWorld(piv);
    du.subVectors(p, piv); dw.subVectors(goal, piv);
    const r0 = du.length(), r1 = dw.length();
    if (!(r0 > 1e-4 && r1 > 1e-4 && Number.isFinite(r0 + r1))) { p.copy(goal); return; }
    du.multiplyScalar(1 / r0); dw.multiplyScalar(1 / r1);
    const k = 1 - Math.exp(-dt / 0.14), ang = Math.acos(clamp(du.dot(dw), -1, 1));
    if (ang > 1e-6) {
      ax.crossVectors(du, dw);
      if (ax.lengthSq() < 1e-12) { ax.set(0, 1, 0); if (Math.abs(du.y) > 0.99) ax.set(1, 0, 0); }   // straight across: about the vertical
      q1.setFromAxisAngle(ax.normalize(), Math.min(ang * k, AIM_RATE * dt));
      du.applyQuaternion(q1);
    }
    p.copy(piv).addScaledVector(du, r0 * Math.pow(r1 / r0, k));
  }
  const EYE0 = new THREE.Vector3(0, EYE.y, EYE.z + 0.012);   // the eyes' midpoint in the body's frame (bind)
  const EYE_HEAD = new THREE.Vector3(0, EYE.y - P.head[1], EYE.z - P.head[2]);
  const state = { headYaw: 0, headPitch: 0, eyeYaw: 0, eyePitch: 0, blink: 0, mouth: 0, gesture: null };

  function startGesture(name) {
    let def = GESTURES[name]; if (!def) return 0;
    let hold = false;
    if (name === 'point') {
      // the target (by default: ahead to the right), and the arm on its side (+x is the actor's left)
      root.updateWorldMatrix(true, true);
      if (hasPoint) v1.copy(pointTarget); else { v1.set(-0.9, 1.55, 1.4); body.localToWorld(v1); }
      v2.copy(v1); body.worldToLocal(v2);
      // (in front the right arm may take a target a little left of the middle; behind, each arm keeps to its own side)
      const side = (v2.z < 0 ? v2.x >= 0 : v2.x > 0.15) ? 'L' : 'R', aimCh = side === 'L' ? C_.aimL : C_.aimR;
      def = side === 'L' ? GESTURES.pointL : GESTURES.point;
      // already pointing with that arm: it swings over to the new target and goes on from where it is (no restart, no
      // sag); an arm that is down aims straight at it as it comes up
      hold = gDef === def;
      if (G[aimCh] < 0.05) aimAt[side].copy(v1);
      want[side].copy(v1); pSide = side;
      if (hold) {
        if (gT > POINT_HOLD && gT <= POINT_END) gT = POINT_HOLD;                    // holding: hold again
        else if (gT > POINT_END) {
          // letting go: back onto the way up, at the same height (the arm's channels rise and fall on the same smoothstep)
          const a = clamp(G[aimCh], 0, 1);
          gT = POINT_HOLD * (0.5 - Math.sin(Math.asin(1 - 2 * a) / 3));
        }
        return def.dur - gT;
      }
    }
    for (let i = 0; i < CH.length; i++) F[i] = G[i];        // whatever is still moving fades out under the new one
    fadeT = 0; gDef = def; gName = def.pub ? (def.alias || name) : null; gT = 0;
    if (name === 'point') {
      // that arm is still up (letting go, or the other arm took over a moment ago): it goes on from its height instead of
      // sinking under the fade and rising again
      const ch = AIM_CH[pSide], a = clamp(G[ch[0]], 0, 1);
      if (a > 0.05) { F[ch[0]] = 0; F[ch[1]] = 0; gT = POINT_HOLD * (0.5 - Math.sin(Math.asin(1 - 2 * a) / 3)); }
    }
    return def.dur - gT;
  }
  function gestures(dt) {
    G.fill(0);
    if (gDef) {
      gT += dt;
      if (gT >= gDef.dur) { gDef = null; gName = null; } else { const tr = gDef.tracks; for (let i = 0; i < tr.length; i++) G[tr[i].ch] = evalTrack(tr[i], gT); }
    }
    if (fadeT < 0.3) { fadeT += dt; const w = 1 - smooth(0, 0.3, fadeT); for (let i = 0; i < CH.length; i++) G[i] += F[i] * w; }
  }
  // two-bone IK: the hip joint (moved by the hips) to the planted ankle, the knee forwards, the foot flat and turned out
  function solveLeg(l) {
    const { th, sh, ft } = l;
    v1.copy(th.position).applyQuaternion(hips.quaternion).add(hips.position);   // the hip joint in the body's frame
    v2.subVectors(l.ankle, v1).applyQuaternion(q1.copy(hips.quaternion).invert());   // to the ankle, in the hips' frame
    legIK(v2, l.s, th.quaternion, sh.quaternion);
    q1.copy(hips.quaternion).multiply(th.quaternion).multiply(sh.quaternion).invert();
    ft.quaternion.copy(q1).multiply(l.toe);
  }
  function poseArm(a, flex, abd, rot, elbow, pro, wrist, clavUp, breath) {
    const s = a.s;
    a.clav.position.y = a.clav.userData.rest.y + breath * 0.0022;
    a.clav.rotation.set(0, 0, s * clavUp);
    a.ua.rotation.set(-flex, -s * rot, s * abd);
    a.fa.rotation.set(-elbow, -s * pro, 0);
    a.hd.rotation.set(0, 0, -s * wrist);
  }

  function update(dt, o = NO_OPTS) {
    if (!o) o = NO_OPTS;
    dt = clamp(Number(dt) || 0, 0, 0.1);
    for (let i = 0; i < S.length; i++) if (!Number.isFinite(S[i])) S[i] = 0;   // a NaN let in once (a broken parent transform) does not stay
    const lookAt = o.lookAt || null, talking = !!o.talking;
    time += dt;
    // ---- timers: blinks, idle glances, tiny eye movements, syllables, hand beats while talking
    blinkIn -= dt;
    if (blinkT < 0 && blinkIn <= 0) { blinkT = 0; blinkIn = (talking ? 1.6 : 2.2) + R1() * 3.8; if (R1() < 0.12) blinkIn = 0.32; }
    let close = 0;
    if (blinkT >= 0) { blinkT += dt; close = blinkT < 0.07 ? smooth(0, 0.07, blinkT) : blinkT < 0.1 ? 1 : 1 - smooth(0.1, 0.24, blinkT); if (blinkT > 0.24) blinkT = -1; }
    wanderIn -= dt;
    if (wanderIn <= 0) { wanderIn = 1.8 + R1() * 3.4; const big = R1() < 0.35; wanderY = (R1() - 0.5) * (big ? 56 : 18) * DEG; wanderP = (R1() * 10 - 7) * DEG; }
    microIn -= dt;
    if (microIn <= 0) { microIn = 0.5 + R1() * 1.9; microY = (R1() - 0.5) * 2.6 * DEG; microP = (R1() - 0.5) * 1.6 * DEG; }
    let mouthT = 0;
    if (talking) {
      sylT += dt;
      if (sylT >= sylDur) {
        sylT = 0;
        if (sylLeft <= 0) { sylLeft = 5 + Math.floor(R2() * 10); sylDur = 0.16 + R2() * 0.3; sylAmp = 0; }   // a breath between phrases
        else { sylLeft--; sylDur = 0.095 + R2() * 0.09; sylAmp = R2() < 0.1 ? 0.08 : 0.3 + R2() * 0.7; }
      }
      mouthT = sylAmp * Math.pow(Math.sin(Math.PI * sylT / sylDur), 0.7);
      beatIn -= dt;
      if (beatIn <= 0) { beatIn = 2.4 + R2() * 4; if (!gDef) startGesture(R2() < 0.6 ? 'beatR' : 'beatL'); }
    } else { sylT = sylDur = 0; sylAmp = 0; sylLeft = 6; beatIn = Math.max(beatIn, 0.8); }
    gestures(dt);

    // ---- where to look (in the body's frame): the target, an idle glance, or towards the pointed-at thing
    body.updateWorldMatrix(true, false);
    // pointing: each arm's aim eases towards its target; the upper body turns towards it, by the arm's share, only to
    // that arm's side, and less the more the target is straight above or below (smooth: it follows the aim curves)
    let turn = 0;
    for (const side of SIDES) {
      const w = clamp(G[side === 'L' ? C_.aimL : C_.aimR], 0, 1);
      if (w <= 1e-4) continue;
      easeAim(aimAt[side], want[side], dt);
      pv.copy(aimAt[side]); body.worldToLocal(pv);
      const hd = Math.sqrt(pv.x * pv.x + pv.z * pv.z), hy = pv.y - 1.4;
      if (!(hd > 1e-4)) continue;
      const share = smooth(0.2, 0.6, hd / Math.sqrt(hd * hd + hy * hy));
      turn += w * share * clamp(0.4 * Math.atan2(pv.x, pv.z), side === 'L' ? -5 * DEG : -TURN_MAX, side === 'L' ? TURN_MAX : 5 * DEG);
    }
    if (lookAt && Number.isFinite(lookAt.x + lookAt.y + lookAt.z)) { tv.copy(lookAt); body.worldToLocal(tv); }   // (a bad point is ignored)
    else tv.set(EYE0.x + Math.sin(wanderY) * 2, EYE0.y + Math.tan(wanderP) * 2, EYE0.z + Math.cos(wanderY) * 2);
    const glance = G[C_.glance];
    if (glance > 0) { pv.copy(aimAt[pSide]); body.worldToLocal(pv); tv.lerp(pv, glance); }
    if (!Number.isFinite(tv.x + tv.y + tv.z)) tv.set(EYE0.x, EYE0.y, EYE0.z + 2);   // overflowed (a point absurdly far away): look ahead
    const dx = tv.x - EYE0.x, dy = tv.y - EYE0.y, dz = tv.z - EYE0.z, dh = Math.sqrt(dx * dx + dz * dz), dist = Math.sqrt(dh * dh + dy * dy);
    let yaw = Math.atan2(dx, dz), pitch = Math.atan2(dy, dh);
    // someone behind: give up and look ahead. Nearly straight above or below, the yaw means nothing: keep the pitch only.
    // A point at the eyes themselves has no direction: look ahead. The eyes then aim where the head does (no side-eye).
    const behind = 1 - smooth(115 * DEG, 150 * DEG, Math.abs(yaw)), steep = smooth(62 * DEG, 80 * DEG, Math.abs(pitch)), near = smooth(0.08, 0.2, dist);
    yaw *= behind * (1 - steep) * near; pitch *= lerp(behind, 1, steep) * near;
    const r = clamp(dist, 0.2, 100), cp = Math.cos(pitch);           // only the direction matters (and ∞ · 0 would be NaN)
    tv.set(EYE0.x + r * Math.sin(yaw) * cp, EYE0.y + r * Math.sin(pitch), EYE0.z + r * Math.cos(yaw) * cp);
    // (the head's limits are the neck's: on top of the upper body's turn)
    const hyT = clamp(yaw - clamp(yaw, -LIMITS.eyes, LIMITS.eyes), turn - LIMITS.headYaw, turn + LIMITS.headYaw);
    const hpT = clamp(pitch - clamp(pitch, -LIMITS.eyes, LIMITS.eyes), -LIMITS.headPitch, LIMITS.headPitch);
    if (Math.abs(hyT - lastHyT) > 25 * DEG && blinkT < 0) blinkT = 0;   // a big change of gaze comes with a blink
    lastHyT = hyT;
    spring(S, HY, hyT, 6.5, dt); spring(S, HP, hpT, 6.5, dt);
    S[HY] = clamp(S[HY], turn - LIMITS.headYaw, turn + LIMITS.headYaw); S[HP] = clamp(S[HP], -LIMITS.headPitch, LIMITS.headPitch);
    spring(S, TN, talking ? 0.022 * Math.sin(time * 5.1) * Math.sin(time * 1.7 + 1) : 0, 9, dt);

    // ---- the body: breathing, weight shift (hips sway, the spine keeps the shoulders level), looking
    const br = 0.5 - 0.5 * Math.cos(time * TAU / 4.3 + ph[0]);
    const w1 = 0.65 * Math.sin(time * TAU / 11.3 + ph[1]) + 0.35 * Math.sin(time * TAU / 7.1 + ph[2]), w2 = Math.sin(time * TAU / 13.7 + ph[3]);
    const hRoll = 1.5 * DEG * w1, hYaw = 1.3 * DEG * w2;
    hips.position.set(0.015 * w1, P.hips[1] - 0.003 * w1 * w1, 0);
    hips.rotation.set(0.5 * DEG * w2, hYaw, hRoll);
    spine.rotation.set(0.8 * DEG, -0.5 * hYaw + 0.45 * turn, -0.5 * hRoll);
    const Y = S[HY] - turn, Pt = S[HP], chestYaw = 0.12 * Y, rest = Y - chestYaw;   // Y: the head's turn on top of the body's
    chest.rotation.set(-0.8 * DEG - 0.6 * DEG * br + G[C_.chestP], chestYaw + 0.55 * turn - 0.5 * hYaw + G[C_.chestY], -0.6 * hRoll + G[C_.chestR]);
    torsoMesh.scale.set(1 + 0.006 * br, 1, 1 + 0.014 * br);
    const nod = S[TN];
    neck.rotation.set(-0.4 * Pt + 0.6 * DEG * br + G[C_.neckP] + 0.4 * nod, 0.4 * rest, 0, 'YXZ');
    head.rotation.set(-0.6 * Pt + G[C_.headP] + 0.6 * nod, 0.6 * rest + G[C_.headY], G[C_.headR] + 1.2 * DEG * w2, 'YXZ');
    // arms: relaxed at the sides, plus the gesture
    poseArm(arm.L, (3 + 1.2 * w2) * DEG + G[C_.flexL], 8 * DEG + G[C_.abdL], G[C_.rotL], (13 + 2 * br) * DEG + G[C_.elbowL], G[C_.proL], 5 * DEG + G[C_.wristL], G[C_.clavL], br);
    poseArm(arm.R, (3 - 1.2 * w2) * DEG + G[C_.flexR], 8 * DEG + G[C_.abdR], G[C_.rotR], (13 + 2 * br) * DEG + G[C_.elbowR], G[C_.proR], 5 * DEG + G[C_.wristR], G[C_.clavR], br);
    // pointing: the arm turns towards its target. It does not cross the body (at most a little past the middle), and it
    // reaches back only out to its own side (a board behind and to the left: the left arm, out to the side and back).
    for (const side of SIDES) {
      const a = arm[side], aim = clamp(G[side === 'L' ? C_.aimL : C_.aimR], 0, 1);
      a.hm.geometry = G[side === 'L' ? C_.pointHandL : C_.pointHandR] > 0.5 ? a.pointing : a.relaxed;
      if (aim <= 1e-4) continue;
      a.clav.updateWorldMatrix(true, false);
      v1.copy(aimAt[side]); a.clav.worldToLocal(v1); v1.sub(a.ua.position);
      if (v1.lengthSq() <= 1e-6) continue;
      v1.normalize();
      const out = a.s * v1.x;                                // outwards, to the arm's own side
      if (out < -0.3) v1.x = -0.3 * a.s;
      v1.z = Math.max(v1.z, lerp(0.3, -0.6, smooth(0.15, 0.75, out)));
      v1.y = clamp(v1.y, -0.8, 0.72); v1.normalize();
      q1.setFromUnitVectors(DOWN, v1); a.ua.quaternion.slerp(q1, aim);
    }
    solveLeg(leg.L); solveLeg(leg.R);

    // ---- eyes: towards the target in the head's frame (the eyes do the first 15°), then lids and mouth
    head.updateWorldMatrix(true, false);
    v1.copy(tv); body.localToWorld(v1); head.worldToLocal(v1); v1.sub(EYE_HEAD);
    const ey = clamp(Math.atan2(v1.x, v1.z) + microY, -LIMITS.eyes, LIMITS.eyes), ep = clamp(Math.atan2(v1.y, Math.sqrt(v1.x * v1.x + v1.z * v1.z)) + microP, -LIMITS.eyes, LIMITS.eyes);
    spring(S, EY, ey, 38, dt); spring(S, EP, ep, 38, dt);
    for (let i = 0; i < 2; i++) eyes[i].rotation.set(-S[EP], S[EY], 0, 'YXZ');
    const lidOpen = clamp(21 * DEG + 0.75 * S[EP], 4 * DEG, 34 * DEG);           // the upper lid follows the gaze up and down
    lids.rotation.x = -lerp(lidOpen, -27 * DEG, close);
    spring(S, MO, mouthT, 42, dt);
    const m = clamp(S[MO], 0, 1); mouth.morphTargetInfluences[0] = m;

    state.headYaw = Y; state.headPitch = Pt; state.eyeYaw = S[EY]; state.eyePitch = S[EP]; state.blink = close; state.mouth = m; state.gesture = gName;
  }

  const actor = {
    root, bones, meshes, radius: 0.3, triangles, state,
    update,
    // plays once and goes back to idle; returns its length in seconds (0 for an unknown name)
    gesture(name) { return GESTURE_NAMES.includes(name) ? startGesture(name) : 0; },
    pointAt(target) { if (target && Number.isFinite(target.x + target.y + target.z)) { pointTarget.copy(target); hasPoint = true; } else hasPoint = false; },
    headWorld(out = new THREE.Vector3()) { head.updateWorldMatrix(true, false); return out.copy(EYE_HEAD).applyMatrix4(head.matrixWorld); },
    get gesturing() { return gName; },
    // for tests: the objects update() works with (they must stay the same ones)
    _scratch: [tv, pv, v1, v2, q1, pointTarget, want.L, want.R, aimAt.L, aimAt.R, piv, du, dw, ax, S, G, F],
    dispose() { for (const m of meshes) m.geometry.dispose(); for (const L of ['L', 'R']) { arm[L].pointing.dispose(); arm[L].relaxed.dispose(); } },
  };
  update(0);
  return actor;
}
