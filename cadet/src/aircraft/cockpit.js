// CADET — aircraft/cockpit.js : the cabin of the flown Archer (a PA-28-181 with the G1000-type panel), built at start-up
// (mostly in code) in the aircraft's BODY frame (x = right wing, y = up, −z = the nose; metres; origin at the CG), to be
// parented to the flown aircraft's root. Seen from the left seat (FLIGHT LAB's eye, A.eye) it is the real layout: the
// glareshield ~12° below the eye with the white cowling over it, the windshield up to the roof, the PFD in front of
// the pilot, the audio panel and the MFD to its right, the standby instruments, the switch row, the key, the circuit
// breakers, the throttle quadrant, two yokes, the rudder pedals, the flap handle and the trim wheel between the seats,
// the fuel selector on the left wall, the door on the right, the seats, the rear bench and the aft windows.
// The cabin is larger than the acmesh fuselage (hidden in the outside view, where the cockpit is not drawn).
// The top band — the headliner, the windshield header, the A-pillar and roof-edge trims, their rubber seals and
// the sun visors — is made in Blender to this layout (tools/aircraft/build_cockpit.py → assets/model/cockpit.glb, see
// CABIN below) and goes into the static shell like the rest; without the model, simple shapes made here stand in.
// Light without new lights: the sun comes in through the window openings (the shell casts shadows; the glass does
// not), and the sky's light inside is scaled by an occlusion baked per vertex at build time — rays from each vertex
// against a proxy of the cabin (its box, the window openings and the big occluders: panel, glareshield, seats).
// Draw calls: the static shell is one mesh per material; each moving part is its own mesh (the rocker switches one
// instanced mesh). The cockpit never applies a control: act() returns what the game should do.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { clearGlassMaterial } from '../render/materials.js';
import { NOISE } from '../render/glsl.js';
import { createGlass, BEZEL, KNOBS, KEYS, KEY_X, softkeysOf, DYN, dynUV } from './g1000.js';
import { modelMeshes } from './archer-model.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const PICK_LAYER = 7;                       // the invisible hit meshes live only on this layer

// ---------------------------------------------------------------- the layout (metres, body frame, around the Archer's eye)
const EYE0 = [-0.3, 0.62, -0.4];
const FLOOR = -0.40, FIRE = -1.45, AFT = 1.65;     // the cabin floor, the firewall, the aft bulkhead
const PZ = -1.10, PTOP = 0.465, PBOT = 0.03;      // the instrument panel's face, its top and bottom edges
const SILL = 0.38, WTOP = 0.75, HW = 0.56, HWT = 0.49, ROOF = 0.845;   // the side window band leans in towards the roof
const WS = { z0: -1.30, y0: 0.425, z1: -0.84, y1: 0.815, bow: 0.12 };  // the windshield: base, top, and how far its sides sweep back
const KX = -(HW - HWT) / (WTOP - SILL);
const bandX = y => HW + KX * (y - SILL);
const lowX = y => { const v = clamp((y - FLOOR) / (SILL - FLOOR), 0, 1); return HW - 0.10 * Math.pow(1 - Math.min(1, v / 0.45), 2); };
const roofY = x => WTOP + (ROOF - WTOP) * Math.sqrt(Math.max(0, 1 - (x / HWT) ** 2));
const wsZ = (x, y) => WS.z0 + (WS.z1 - WS.z0) * (y - WS.y0) / (WS.y1 - WS.y0) + WS.bow * (x / 0.5) ** 2;
const PFD = [-0.30, 0.34], MFD = [0.051, 0.34], AUD = [-0.1245, 0.34], STBY_X = 0.255, STBY_Y = [0.410, 0.327, 0.244];
const SEAT_X = 0.29;
const YOKE = { x: 0.30, y: 0.218, z: -0.855, travel: 0.07, roll: 42 * DEG };
const PEDAL_X = [-0.39, -0.21, 0.21, 0.39], PEDAL = { y: -0.27, z: -1.21, travel: 0.045 };
const LEVER = { y: -0.045, z: -1.24, len: 0.22, idle: -11 * DEG, full: 27 * DEG };
const FLAP = { y: -0.268, z: -0.40, det: [0, 11 * DEG, 22 * DEG, 33 * DEG] };
const TRIMW = { y: -0.30, z: -0.64, r: 0.072, turns: 1.6 };
const SEAT = { z: -0.58, w: 0.44 };               // the front seats (at ±SEAT_X): their cushions' centre z and width
const INSTRUCTOR = { hip: [SEAT_X, -0.03, -0.38], seatY: -0.15 };   // where the right seat holds the instructor (see instructorSeat)
// the glareshield's lip in profile ([z, y], from under it to the top of its roll; then the hood falls to the windshield)
const GLARE = { x: 0.553, lip: [[PZ + 0.004, 0.451], [-1.045, 0.451], [-1.031, 0.457], [-1.027, 0.4665], [-1.032, 0.4765], [-1.05, 0.4795]] };
// the yokes' hit boxes ([w, h, d] and an offset from the yoke's pivot; the horns' at ±x): a model of a yoke stays in them
const YOKE_HIT = { hub: [0.11, 0.07, 0.06, 0, 0, 0.004], horn: [0.042, 0.15, 0.045, 0.152, 0.075, 0.008] };
const COMPASS = [0, 0.737, -0.892];
const KEYSW = [-0.488, 0.10];                     // the key: just right of where the yoke's left horn hides the panel
const ROCKERS = [['master', 'MASTER'], ['avionics', 'AVIONICS'], ['fuelPump', 'FUEL PUMP'], ['beacon', 'BEACON'], ['nav', 'NAV'], ['strobe', 'STROBE'],
  ['landing', 'LANDING'], ['taxi', 'TAXI'], ['pitot', 'PITOT HEAT']];
const ROCKER = { x0: -0.428, dx: 0.036, y: 0.095, tilt: 12 * DEG };
const SWITCH_JA = { master: 'マスター', avionics: 'アビオニクス', fuelPump: '燃料ポンプ', beacon: 'ビーコン', nav: '航法灯', strobe: 'ストロボ', landing: '着陸灯', taxi: 'タキシー灯', pitot: 'ピトー ヒート' };
const MAG = ['OFF', 'R', 'L', 'BOTH', 'START'], MAG_ANG = [-70 * DEG, -35 * DEG, 0, 35 * DEG, 70 * DEG];
const FUEL_ANG = { L: 50 * DEG, R: -50 * DEG, OFF: 180 * DEG };
const FUEL = ['L', 'R', 'OFF'];

// ---------------------------------------------------------------- surfaces (sRGB colour, roughness, metalness, detail kind)
// kinds: 0 smooth, 1 textured paint, 2 leather, 3 carpet, 4 grained vinyl, 5 woven headliner
const S = {
  panel: { c: 0x313439, r: 0.72, k: 1 }, glare: { c: 0x1c1d20, r: 0.9, k: 1 }, glareLip: { c: 0x232427, r: 0.62, k: 4 },
  bezel: { c: 0x17181b, r: 0.36 }, key: { c: 0x26282c, r: 0.5 }, knob: { c: 0x101113, r: 0.42 }, knobRing: { c: 0x2b2d31, r: 0.35 },
  wall: { c: 0xb4afa6, r: 0.62, k: 4 }, sidePanel: { c: 0x9d988f, r: 0.66, k: 4 }, wallDark: { c: 0x6f6b66, r: 0.6, k: 4 }, roof: { c: 0xd2cdc3, r: 0.95, k: 5 }, trim: { c: 0x8f8b84, r: 0.55, k: 4 },
  arm: { c: 0x4a4542, r: 0.55, k: 2 }, carpet: { c: 0x302f2e, r: 1, k: 3 }, seat: { c: 0x9a7b5c, r: 0.55, k: 2 }, seatSide: { c: 0x3a302b, r: 0.5, k: 2 },
  chrome: { c: 0xc8ccd1, r: 0.16, m: 1 }, alu: { c: 0x9ba1a7, r: 0.34, m: 0.9 }, steel: { c: 0x5d6268, r: 0.4, m: 0.8 },
  black: { c: 0x121315, r: 0.5 }, rubber: { c: 0x151515, r: 0.9 }, red: { c: 0xb3231c, r: 0.42 }, white: { c: 0xe9e7e2, r: 0.4 },
  yoke: { c: 0x1b1c1f, r: 0.4, k: 4 }, grip: { c: 0x141416, r: 0.55, k: 2 }, cbBody: { c: 0x0e0e0f, r: 0.45 }, slot: { c: 0x050506, r: 0.9 },
  lens: { c: 0xf2efe6, r: 0.2 }, caseBlack: { c: 0x0c0c0d, r: 0.5 },
  blue: { c: 0x1f4f9a, r: 0.42 }, wheelWhite: { c: 0xdedcd6, r: 0.35 },          // (M6) the Seminole's propeller levers, its gear knob
};

// ---------------------------------------------------------------- geometry helpers (everything ends non-indexed)
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
function at(g, p, r) { _e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0); _q.setFromEuler(_e); _p.set(p[0], p[1], p[2]); return g.applyMatrix4(_m4.compose(_p, _q, _one)); }
const rbox = (w, h, d, r = 0.004, seg = 1) => { const rr = Math.min(r, Math.min(w, h, d) * 0.49); return rr < 0.0025 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, seg, rr); };
const cylZ = (rFront, rBack, h, seg = 16) => new THREE.CylinderGeometry(rFront, rBack, h, seg).rotateX(Math.PI / 2);   // along z, the front (+z) radius first
const cylX = (r, h, seg = 16) => new THREE.CylinderGeometry(r, r, h, seg).rotateZ(Math.PI / 2);
const cylY = (r0, r1, h, seg = 16) => new THREE.CylinderGeometry(r1, r0, h, seg);
const tube = (pts, r, ts = 12, rs = 8) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2]))), ts, r, rs, false);
const sphere = (r, ws = 12, hs = 8) => new THREE.SphereGeometry(r, ws, hs);
// a surface over u, v ∈ [0, 1]: fn(u, v, out) sets the point; faces along du × dv (flip turns them round)
function sheet(fn, nu, nv, flip = false) {
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3), idx = [], o = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { fn(i / nu, j / nv, o); const k = (j * (nu + 1) + i) * 3; pos[k] = o.x; pos[k + 1] = o.y; pos[k + 2] = o.z; }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// a closed outline with rounded corners (pts: [[x, y], …])
function rounded(path, pts, r) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const d0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), d1 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), rr = Math.min(r, d0 * 0.45, d1 * 0.45);
    const ax = p1[0] + (p0[0] - p1[0]) / d0 * rr, ay = p1[1] + (p0[1] - p1[1]) / d0 * rr, bx = p1[0] + (p2[0] - p1[0]) / d1 * rr, by = p1[1] + (p2[1] - p1[1]) / d1 * rr;
    if (i === 0) path.moveTo(ax, ay); else path.lineTo(ax, ay);
    path.quadraticCurveTo(p1[0], p1[1], bx, by);
  }
  path.closePath();
  return path;
}
const rectPts = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// an extruded outline (with holes) whose front face lies at z = front, soft (smoothed) edges
function slab(outline, r, holes, depth, front, bevel = 0.003, curveSeg = 5, bevelSeg = 2) {
  const sh = rounded(new THREE.Shape(), outline, r);
  for (const [pts, hr] of holes) sh.holes.push(rounded(new THREE.Path(), pts, hr));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: bevelSeg, curveSegments: curveSeg });
  g.translate(0, 0, front - depth - bevel);
  return smooth(g);
}
// merge the vertices by position and recompute smooth normals (soft bevels)
function smooth(g) {
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-5); m.computeVertexNormals();
  return m;
}

// ---------------------------------------------------------------- the occlusion proxy (sky light reaching each vertex)
const AO_BOX = { x: 0.555, y0: FLOOR, y1: ROOF, z0: FIRE, z1: AFT };
const AO_WIN = [[-1.10, -0.27, 0.41, 0.72], [-0.08, 0.58, 0.41, 0.71], [0.81, 1.18, 0.44, 0.66]];
// the side windows (z, y): the opening, the ring round it (its outer edge), the corner radius; and the posts between
const W1 = [[-1.13, 0.405], [-0.26, 0.405], [-0.26, 0.732], [-0.755, 0.732]], W2 = [[-0.09, 0.405], [0.60, 0.405], [0.52, 0.715], [-0.09, 0.722]], W3 = [[0.80, 0.425], [1.20, 0.47], [1.17, 0.66], [0.80, 0.69]];
const zf1 = y => -1.1635 + 1.147 * (y - 0.405), zr2 = y => 0.6227 - 0.258 * (y - 0.405), zr3 = y => 1.222 - 0.158 * (y - 0.47);
const WINDOWS = [
  [W1, [[zf1(SILL), SILL], [-0.238, SILL], [-0.238, WTOP], [zf1(WTOP), WTOP]], 0.05],
  [W2, [[-0.112, SILL], [zr2(SILL), SILL], [zr2(WTOP), WTOP], [-0.112, WTOP]], 0.06],
  [W3, [[0.778, SILL], [zr3(SILL), SILL], [zr3(WTOP), WTOP], [0.778, WTOP]], 0.04],
];
const POSTS = [[y => wsZ(bandX(y) + 0.004, y) - 0.03, zf1], [() => -0.238, () => -0.112], [zr2, () => 0.778], [zr3, () => AFT]];
const AO_OCC = [
  [-0.56, 0.56, PBOT - 0.01, PTOP + 0.01, FIRE, PZ], [-0.56, 0.56, 0.44, 0.49, -1.31, -1.03], [-0.08, 0.10, -0.11, 0.07, FIRE, -1.065],
  [-0.51, -0.07, FLOOR, -0.15, -0.84, -0.31], [-0.51, -0.07, -0.15, 0.48, -0.33, -0.14], [-0.43, -0.15, 0.53, 0.69, -0.17, -0.09],
  [0.07, 0.51, FLOOR, -0.15, -0.84, -0.31], [0.07, 0.51, -0.15, 0.48, -0.33, -0.14], [0.15, 0.43, 0.53, 0.69, -0.17, -0.09],
  [-0.52, 0.52, FLOOR, -0.13, 0.22, 0.78], [-0.52, 0.52, -0.13, 0.50, 0.74, 0.95], [-0.07, 0.07, FLOOR, -0.28, -0.76, 0.10],
  [-0.56, 0.56, FLOOR, -0.22, 0.95, AFT],
];
// the overhead console, and the compass case on the windshield's centre post (its body, its hanger: [w, h, d] and an
// offset from COMPASS): built below, and seen by tools/aircraft/build_cockpit.py as what shades the top band
const CONSOLE = { pos: [0, ROOF - 0.01, -0.45], size: [0.14, 0.03, 0.5] };
const CASE = { body: [0.064, 0.056, 0.040, 0, 0, -0.015], hanger: [0.012, 0.03, 0.03, 0, 0.038, -0.012] };
// the cabin's layout and surfaces for tools/aircraft/cockpit-spec.mjs (the parts made in Blender — the top band, the
// seats, the glareshield, the yokes: assets/model/cockpit.glb — are made to these)
export const CABIN = {
  EYE0, FLOOR, FIRE, AFT, PZ, PTOP, PBOT, SILL, WTOP, HW, HWT, ROOF, WS, KX, COMPASS, CONSOLE, CASE, SURFACES: S, bandX, roofY, wsZ, lowX,
  SEAT_X, SEAT, INSTRUCTOR, AO_OCC, FLAP, TRIMW, LEVER, PEDAL, PEDAL_X, YOKE, YOKE_HIT, GLARE,
};
const AO_N = 40, AO_DIRS = new Float32Array(AO_N * 3);
for (let i = 0; i < AO_N; i++) { const u = (i + 0.5) / AO_N, r = Math.sqrt(u), ph = i * 2.399963; AO_DIRS[i * 3] = r * Math.cos(ph); AO_DIRS[i * 3 + 1] = r * Math.sin(ph); AO_DIRS[i * 3 + 2] = Math.sqrt(1 - u); }
function rayOpen(ox, oy, oz, dx, dy, dz) {
  const B = AO_BOX;
  let t = Infinity, face = -1, tt;
  if (dx > 1e-6) { tt = (B.x - ox) / dx; if (tt < t) { t = tt; face = 0; } } else if (dx < -1e-6) { tt = (-B.x - ox) / dx; if (tt < t) { t = tt; face = 0; } }
  if (dy > 1e-6) { tt = (B.y1 - oy) / dy; if (tt < t) { t = tt; face = 2; } } else if (dy < -1e-6) { tt = (B.y0 - oy) / dy; if (tt < t) { t = tt; face = 3; } }
  if (dz > 1e-6) { tt = (B.z1 - oz) / dz; if (tt < t) { t = tt; face = 4; } } else if (dz < -1e-6) { tt = (B.z0 - oz) / dz; if (tt < t) { t = tt; face = 5; } }
  for (const b of AO_OCC) {
    if (ox > b[0] && ox < b[1] && oy > b[2] && oy < b[3] && oz > b[4] && oz < b[5]) continue;
    let t0 = 0, t1 = t;
    for (let a = 0; a < 3 && t0 <= t1; a++) {
      const o = a === 0 ? ox : a === 1 ? oy : oz, d = a === 0 ? dx : a === 1 ? dy : dz, lo = b[a * 2], hi = b[a * 2 + 1];
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) t1 = -1; continue; }
      let ta = (lo - o) / d, tb = (hi - o) / d; if (ta > tb) { const s = ta; ta = tb; tb = s; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
    }
    if (t0 <= t1) return false;
  }
  const ex = ox + dx * t, ey = oy + dy * t, ez = oz + dz * t;
  if (face === 0) { for (const w of AO_WIN) if (ez > w[0] && ez < w[1] && ey > w[2] && ey < w[3]) return true; return false; }
  if (face === 2) return ez < wsZ(ex, WS.y1);
  if (face === 5) return ey > WS.y0 + 0.01;
  return false;
}
// cosine-weighted sky visibility of a point with a normal (0..1)
function skyVis(px, py, pz, nx, ny, nz) {
  const ox = clamp(px + nx * 0.006, -AO_BOX.x + 1e-3, AO_BOX.x - 1e-3), oy = clamp(py + ny * 0.006, AO_BOX.y0 + 1e-3, AO_BOX.y1 - 1e-3), oz = clamp(pz + nz * 0.006, AO_BOX.z0 + 1e-3, AO_BOX.z1 - 1e-3);
  let tx = 0, ty = 0, tz = 0;
  if (Math.abs(nx) < 0.9) { tx = 0; ty = nz; tz = -ny; } else { tx = -nz; ty = 0; tz = nx; }
  const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
  const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
  let open = 0;
  for (let i = 0; i < AO_N; i++) {
    const a = AO_DIRS[i * 3], b = AO_DIRS[i * 3 + 1], c = AO_DIRS[i * 3 + 2];
    if (rayOpen(ox, oy, oz, tx * a + bx * b + nx * c, ty * a + by * b + ny * c, tz * a + bz * b + nz * c)) open++;
  }
  return open / AO_N;
}
const aoOf = vis => 0.16 + 0.84 * Math.min(1, vis * 2.2);
// bake into the 4th component of cdMat (multiplied with the surface's own factor); a cache for repeated vertices
function bakeAO(g, cache) {
  const p = g.attributes.position, n = g.attributes.normal, m = g.attributes.cdMat;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    const key = `${Math.round(x * 400)},${Math.round(y * 400)},${Math.round(z * 400)},${Math.round(nx * 8)},${Math.round(ny * 8)},${Math.round(nz * 8)}`;
    let ao = cache.get(key);
    if (ao === undefined) { ao = aoOf(skyVis(x, y, z, nx, ny, nz)); cache.set(key, ao); }
    m.setW(i, m.getW(i) * ao);
  }
}
// split edges longer than len (both triangles sharing an edge split it the same way: no cracks), so the occlusion
// baked per vertex has enough vertices on big flat faces
function refine(g, len) {
  const names = Object.keys(g.attributes), src = names.map(k => g.attributes[k]), out = names.map(() => []);
  const l2 = len * len, P = g.attributes.position;
  const emit = (v) => { for (let k = 0; k < names.length; k++) for (let c = 0; c < src[k].itemSize; c++) out[k].push(v[k][c]); };
  const vert = i => src.map(a => { const r = []; for (let c = 0; c < a.itemSize; c++) r.push(a.array[i * a.itemSize + c]); return r; });
  const mid = (a, b) => a.map((arr, k) => { const r = arr.map((x, c) => (x + b[k][c]) / 2); if (names[k] === 'normal') { const l = Math.hypot(r[0], r[1], r[2]) || 1; r[0] /= l; r[1] /= l; r[2] /= l; } return r; });
  const d2 = (a, b) => { const pa = a[0], pb = b[0]; return (pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2 + (pa[2] - pb[2]) ** 2; };
  const tri = (a, b, c, depth) => {
    const s0 = d2(a, b) > l2, s1 = d2(b, c) > l2, s2 = d2(c, a) > l2;
    if (depth > 7 || (!s0 && !s1 && !s2)) { emit(a); emit(b); emit(c); return; }
    const ab = s0 ? mid(a, b) : null, bc = s1 ? mid(b, c) : null, ca = s2 ? mid(c, a) : null;
    if (s0 && s1 && s2) { tri(a, ab, ca, depth + 1); tri(ab, b, bc, depth + 1); tri(ca, bc, c, depth + 1); tri(ab, bc, ca, depth + 1); return; }
    if (s0 && s1) { tri(ab, b, bc, depth + 1); tri(a, ab, bc, depth + 1); tri(a, bc, c, depth + 1); return; }
    if (s1 && s2) { tri(bc, c, ca, depth + 1); tri(a, b, bc, depth + 1); tri(a, bc, ca, depth + 1); return; }
    if (s2 && s0) { tri(ca, a, ab, depth + 1); tri(ab, b, c, depth + 1); tri(ab, c, ca, depth + 1); return; }
    if (s0) { tri(a, ab, c, depth + 1); tri(ab, b, c, depth + 1); return; }
    if (s1) { tri(a, b, bc, depth + 1); tri(a, bc, c, depth + 1); return; }
    tri(a, b, ca, depth + 1); tri(ca, b, c, depth + 1);
  };
  for (let i = 0; i + 2 < P.count; i += 3) tri(vert(i), vert(i + 1), vert(i + 2), 0);
  const r = new THREE.BufferGeometry();
  names.forEach((k, j) => r.setAttribute(k, new THREE.BufferAttribute(new Float32Array(out[j]), src[j].itemSize)));
  return r;
}

// the parts made in Blender (tools/aircraft/build_cockpit.py → assets/model/cockpit.glb) into the cabin: each node
// "<group>.<surface>[.<moving part>][.pa28|.pa44]" with that surface's roughness, metalness and detail kind, its own
// colours (sRGB) per vertex, and its alpha (the occlusion of what is close by) as the starting occlusion that bakeAO
// multiplies by the sky's; into the static shell, a moving part (made in place: see PIV), or one type's own shell (the
// Seminole's only with twin) → the nodes' names, or null when the model is not there
function addBand(B, twin) {
  const m = modelMeshes('cockpit');
  if (!m) return null;
  const c = new THREE.Color(), names = [];
  for (const [name, mm] of m) {
    const [, surf, ...tags] = name.split('.'), s = S[surf];
    if (!s) throw new Error('cockpit: no surface for ' + name);
    const v = tags.find(t => t === 'pa28' || t === 'pa44') || null, part = tags.find(t => t !== v) || null;
    if (v === 'pa44' && !twin) continue;                     // (the Archer alone: none of the Seminole's)
    const n = mm.count, col = new Float32Array(n * 3), mat = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      c.setRGB(mm.col[i * 3], mm.col[i * 3 + 1], mm.col[i * 3 + 2], THREE.SRGBColorSpace);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      mat[i * 4] = s.r ?? 0.6; mat[i * 4 + 1] = s.m ?? 0; mat[i * 4 + 2] = s.k ?? 0; mat[i * 4 + 3] = mm.ao[i];
    }
    const g = new THREE.BufferGeometry();                    // (the model's arrays are shared: copied)
    g.setAttribute('position', new THREE.BufferAttribute(mm.pos.slice(), 3)); g.setAttribute('normal', new THREE.BufferAttribute(mm.nrm.slice(), 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('cdMat', new THREE.BufferAttribute(mat, 4));
    if (part) { if (!B.moving.has(part)) B.moving.set(part, []); B.moving.get(part).push(g); if (v) B.partV.set(part, v); }
    else (v ? B.kitV[v] : B.kit).push(g);
    names.push(name);
  }
  return names;
}

// ---------------------------------------------------------------- materials
// the cabin's material: colour per vertex, roughness / metalness / detail kind / occlusion per vertex (cdMat), a fine
// procedural surface detail by kind (paint, leather grain, carpet pile, vinyl grain, woven cloth) that fades out before
// it can alias, and the occlusion applied to the sky's light only (the sun is shadowed by the shadow map)
const VERT = (sh) => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec4 cdMat; varying vec4 vMat; varying vec3 vOP; varying vec3 vON;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = cdMat; vOP = position; vON = normal;');
};
const AO_FRAG = /* glsl */`
  float ambientOcclusion = vMat.w;
  reflectedLight.indirectDiffuse *= ambientOcclusion;
  #if defined( USE_ENVMAP ) && defined( STANDARD )
    float dotNVo = saturate( dot( geometryNormal, geometryViewDir ) );
    reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNVo, ambientOcclusion, material.roughness );
  #endif`;
function kitMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1, envMapIntensity: 1 });
  m.onBeforeCompile = (sh) => {
    VERT(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec4 vMat; varying vec3 vOP; varying vec3 vON;
        ${NOISE}
        float cdH = 0.0, cdR = 1.0;
        vec3 cdPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection) {
          vec3 vSigmaX = normalize(dFdx(surf_pos)), vSigmaY = normalize(dFdy(surf_pos)), vN = surf_norm;
          vec3 R1 = cross(vSigmaY, vN), R2 = cross(vN, vSigmaX);
          float fDet = dot(vSigmaX, R1) * faceDirection;
          vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
          return normalize(abs(fDet) * surf_norm - vGrad);
        }`)
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
        {
          int kind = int(vMat.z + 0.5);
          vec3 an = abs(vON);
          vec2 dp = an.y > an.x && an.y > an.z ? vOP.xz : (an.x > an.z ? vOP.zy : vOP.xy);
          float freq = 0.0, amp = 0.0, alb = 0.0, n = 0.5;
          if (kind == 1) { freq = 650.0; n = cdNoise(dp * freq); amp = 0.00006; alb = 0.06; cdR = 0.88 + 0.24 * n; }
          else if (kind == 2) { freq = 330.0; n = cdNoise(dp * freq) * 0.65 + cdNoise(dp * freq * 2.3) * 0.35; amp = 0.00012; alb = 0.10; cdR = 0.75 + 0.5 * n; }
          else if (kind == 3) { freq = 800.0; n = cdNoise(dp * freq) * 0.55 + cdNoise(dp * 95.0) * 0.45; amp = 0.00025; alb = 0.32; cdR = 1.0; }
          else if (kind == 4) { freq = 420.0; n = cdNoise(dp * freq); amp = 0.00004; alb = 0.035; cdR = 0.9 + 0.2 * n; }
          else if (kind == 5) { freq = 1400.0; vec2 q = dp * freq; n = 0.5 + 0.25 * (sin(q.x) * sin(q.y * 0.97)) + 0.25 * cdNoise(dp * 180.0); amp = 0.00004; alb = 0.08; cdR = 1.0; }
          float fade = freq > 0.0 ? 1.0 - smoothstep(0.35, 1.0, length(fwidth(dp)) * freq) : 0.0;
          diffuseColor.rgb *= 1.0 + alb * (n - 0.5) * 2.0 * mix(0.35, 1.0, fade);
          cdH = n * amp * fade;
          cdR = mix(1.0, cdR, fade);
        }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(vMat.x * cdR, 0.04, 1.0);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMat.y;')
      .replace('#include <normal_fragment_maps>', /* glsl */`
        {
          vec3 sp = -vViewPosition;
          float lx = max(length(dFdx(sp)), 1e-6), ly = max(length(dFdy(sp)), 1e-6);
          vec2 dHdxy = vec2(dFdx(cdH) / lx, dFdy(cdH) / ly);
          if (abs(dHdxy.x) + abs(dHdxy.y) > 0.0) normal = cdPerturb(sp, normal, dHdxy, faceDirection);
        }`)
      .replace('#include <aomap_fragment>', AO_FRAG);
  };
  m.customProgramCacheKey = () => 'cadet-cockpit-kit';
  return m;
}
// labels and placards' ink: the atlas holds only the ink's coverage (one channel), the colour comes from the vertices;
// roughness / metalness / backlight / occlusion per vertex; at night only the backlit labels glow (cdMat.z). base: an
// opaque variant, the ink over a ground of that colour (the compass card)
function decalMaterial(map, key, base = null) {
  const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, emissive: 0xffe6c4, emissiveIntensity: 0, roughness: 1, metalness: 1,
    transparent: !base, depthWrite: !!base, polygonOffset: !base, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const ground = base ? new THREE.Color(base) : null;
  m.onBeforeCompile = (sh) => {
    VERT(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vMat; varying vec3 vOP; varying vec3 vON; float cdCov = 1.0;')
      .replace('#include <map_fragment>', '#ifdef USE_MAP\n  cdCov = texture2D( map, vMapUv ).r;\n#endif')
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + (ground
        ? `diffuseColor.rgb = mix(vec3(${ground.r.toFixed(4)}, ${ground.g.toFixed(4)}, ${ground.b.toFixed(4)}), diffuseColor.rgb, cdCov);`
        : 'diffuseColor.a *= cdCov;'))
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vMat.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMat.y;')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= vColor.rgb * cdCov * vMat.z;')
      .replace('#include <aomap_fragment>', AO_FRAG);
  };
  m.customProgramCacheKey = () => 'cadet-cockpit-decal-' + key;
  return m;
}
// the standby dials' faces (a colour texture, redrawn): lit like the panel, a faint backlight that grows at night
function dialMaterial(map) {
  const m = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.04, roughness: 1, metalness: 1 });
  m.onBeforeCompile = (sh) => {
    VERT(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vMat; varying vec3 vOP; varying vec3 vON;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vMat.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMat.y;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vMat.z;')
      .replace('#include <aomap_fragment>', AO_FRAG);
  };
  m.customProgramCacheKey = () => 'cadet-cockpit-dials';
  return m;
}
// a display (self-lit, exact colours): the texture is never mipmapped (redrawn up to 30 times a second), so it is
// filtered here instead: 4 bilinear taps over the pixel's footprint — sharp up close, no shimmer from the seat
function screenMaterial(map, vertexColors = false) {
  const m = new THREE.MeshBasicMaterial({ map, toneMapped: false, vertexColors });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', /* glsl */`
      #ifdef USE_MAP
        vec2 sdx = dFdx(vMapUv), sdy = dFdy(vMapUv);
        vec4 sampledDiffuseColor = 0.25 * (texture2D(map, vMapUv + 0.125 * sdx + 0.375 * sdy) + texture2D(map, vMapUv - 0.125 * sdx - 0.375 * sdy)
          + texture2D(map, vMapUv + 0.375 * sdx - 0.125 * sdy) + texture2D(map, vMapUv - 0.375 * sdx + 0.125 * sdy));
        diffuseColor *= sampledDiffuseColor;
      #endif`);
  };
  m.customProgramCacheKey = () => 'cadet-cockpit-screen-' + vertexColors;
  return m;
}
// the cowling seen over the glareshield: the aircraft's glossy white paint, with its seams, the oil door and the
// fasteners drawn from the position (no texture)
// (twin: the Seminole's nose — no cowling, only the nose cone's joint and its baggage door on the left)
function cowlMaterial(twin = false) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xefefea, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.07, envMapIntensity: 1.1 });
  if (twin) {
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vOP; float cdSeam = 0.0;')
        .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
          {
            float w = max(fwidth(vOP.z), fwidth(vOP.x)) * 1.2 + 0.0015;
            float joint = 1.0 - smoothstep(0.0, w, abs(vOP.z + 2.75));                                 // the nose cone's joint
            float door = (1.0 - smoothstep(0.0, w, min(abs(vOP.z + 1.75), abs(vOP.z + 2.5)))) * step(vOP.x, -0.2)
                       + (1.0 - smoothstep(0.0, w, abs(vOP.y - 0.2))) * step(vOP.x, -0.2) * step(-2.5, vOP.z) * step(vOP.z, -1.75);
            cdSeam = clamp(joint + door, 0.0, 1.0);
            diffuseColor.rgb *= 1.0 - 0.55 * cdSeam;
          }`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.7, cdSeam);');
    };
    m.customProgramCacheKey = () => 'cadet-cockpit-nose';
    return m;
  }
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOP; float cdSeam = 0.0;')
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
        {
          float w = max(fwidth(vOP.z), fwidth(vOP.x)) * 1.2 + 0.0015;
          float joint = 1.0 - smoothstep(0.0, w, abs(vOP.z + 1.47));                                   // the cowling's rear joint
          float door = (1.0 - smoothstep(0.0, w, abs(abs(vOP.x) - 0.11))) * step(-2.78, vOP.z) * step(vOP.z, -2.42)
                     + (1.0 - smoothstep(0.0, w, min(abs(vOP.z + 2.42), abs(vOP.z + 2.78)))) * step(abs(vOP.x), 0.11);
          float split = (1.0 - smoothstep(0.0, w, abs(vOP.y - 0.205))) * step(vOP.z, -1.47);           // upper / lower cowling
          float fz = fract((vOP.z + 1.47) / 0.085);
          float dots = (1.0 - smoothstep(0.002, 0.0035, length(vec2((fz - 0.5) * 0.085, vOP.y - 0.218)))) * step(vOP.z, -1.5);
          cdSeam = clamp(joint + door + split + dots * 0.7, 0.0, 1.0);
          diffuseColor.rgb *= 1.0 - 0.55 * cdSeam;
        }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.7, cdSeam);');
  };
  m.customProgramCacheKey = () => 'cadet-cockpit-cowl';
  return m;
}

// ---------------------------------------------------------------- the decal atlas (labels and placards, drawn once)
// One channel: the ink's coverage, drawn white on black (a colour canvas uploaded as R8 — a quarter of the memory);
// the ink's colour is the decal's vertex colour, and a placard's ground is a plate of its own under the ink. Its scale
// (pixels per millimetre) is the largest at which everything fits.
const SANS = '"Arial Narrow", "Helvetica Neue", Arial, Helvetica, sans-serif';
const ATLAS_W = 1024, ATLAS_H = 256, INK = 0xeeeeea;
class Atlas {
  constructor(W, H) { this.W = W; this.H = H; this.k = 4; this.used = 0; this.items = []; }
  // a region of w × h millimetres; draw(g, w, h) in pixels
  add(wmm, hmm, draw) {
    const it = { wmm, hmm, x: 0, y: 0, w: 0, h: 0, draw };
    this.items.push(it);
    return it;
  }
  // shelves, tallest first, at k pixels per mm: does it fit?
  packAt(k) {
    let x = 2, y = 2, row = 0;
    for (const it of [...this.items].sort((a, b) => b.hmm - a.hmm || b.wmm - a.wmm)) {
      it.w = Math.max(2, Math.round(it.wmm * k)); it.h = Math.max(2, Math.round(it.hmm * k));
      if (x + it.w + 2 > this.W) { x = 2; y += row + 3; row = 0; }
      it.x = x; it.y = y; x += it.w + 3; row = Math.max(row, it.h);
    }
    this.used = (y + row + 2) / this.H;
    return this.used <= 1;
  }
  pack(kMax = 4) { for (this.k = kMax; this.k > 1.5 && !this.packAt(this.k); this.k -= 0.05); return this; }
  get full() { return this.used > 1; }
  uv(it) { return [it.x / this.W, 1 - (it.y + it.h) / this.H, (it.x + it.w) / this.W, 1 - it.y / this.H]; }
  render(cv) {
    const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, this.W, this.H);
    for (const it of this.items) { g.save(); g.translate(it.x, it.y); g.beginPath(); g.rect(0, 0, it.w, it.h); g.clip(); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; it.draw(g, it.w, it.h); g.restore(); }
  }
}
// text (white ink): lines (strings), size = the cap height in mm (about)
function textDraw(lines, { weight = 700, align = 'center', font = SANS } = {}) {
  return (g, w, h) => {
    g.textBaseline = 'middle'; g.textAlign = align;
    const n = lines.length, lh = h / n, fs = lh * 0.78;
    g.font = `${weight} ${fs}px ${font}`;
    lines.forEach((l, i) => g.fillText(l, align === 'center' ? w / 2 : align === 'left' ? w * 0.04 : w * 0.96, lh * (i + 0.55), w * 0.94));
  };
}

// ---------------------------------------------------------------- the builder: parts collected per material / moving part
// (M6) variant: while set ('pa28' | 'pa44'), what is added belongs to that type only (its own meshes, shown by setType)
function makeBuilder() {
  const kit = [], decals = [], glass = [], cowl = [], dynLit = [], unlit = [], moving = new Map();
  const kitV = { pa28: [], pa44: [] }, decalsV = { pa28: [], pa44: [] }, unlitV = { pa28: [], pa44: [] }, partV = new Map();
  const surfOf = s => { const c = new THREE.Color(s.c); return [c.r, c.g, c.b, s.r ?? 0.6, s.m ?? 0, s.k ?? 0]; };
  // a part of the cabin's material: surface s; into the static mesh, or a moving part (name); refine: split big faces
  function add(g, s, part = null, refineLen = 0) {
    let geo = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const [r, gg, b, ro, me, ki] = surfOf(s), n = geo.attributes.position.count;
    const col = new Float32Array(n * 3), mat = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = b; mat[i * 4] = ro; mat[i * 4 + 1] = me; mat[i * 4 + 2] = ki; mat[i * 4 + 3] = s.ao ?? 1; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('cdMat', new THREE.BufferAttribute(mat, 4));
    if (refineLen) geo = refine(geo, refineLen);
    if (part) { if (!moving.has(part)) moving.set(part, []); moving.get(part).push(geo); if (B.variant) partV.set(part, B.variant); }
    else (B.variant ? kitV[B.variant] : kit).push(geo);
    return geo;
  }
  const B = { kit, decals, glass, cowl, dynLit, unlit, moving, add, kitV, decalsV, unlitV, partV, variant: null };
  return B;
}
// a quad facing +z (w × h), uv = [u0, v0, u1, v1], placed; attrs for the decal-like materials
function quad(w, h, uv, p, r) {
  const g = new THREE.PlaneGeometry(w, h);
  const a = g.attributes.uv;
  for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
  return at(g.toNonIndexed(), p, r);
}
function withMat(g, rough, metal, z, ao = 1) {
  const n = g.attributes.position.count, m = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { m[i * 4] = rough; m[i * 4 + 1] = metal; m[i * 4 + 2] = z; m[i * 4 + 3] = ao; }
  g.setAttribute('cdMat', new THREE.BufferAttribute(m, 4));
  return g;
}
function withCol(g, hex) {
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

// ================================================================ buildCockpit
// buildCockpit(FL, A, opts) → { root, eye, instructorSeat: { hip, ankleL, ankleR, eye, yaw, seatY }, screens: { pfd, mfd },
//   controls, switches, parts, pick(raycaster), aimPoint(control, out), update(dt, o), setVisible(v), setAnisotropy(n),
//   markDirty(), triangles, meshes, textureBytes, stats, dispose() }. root goes under the flown aircraft's root (the body
//   frame); eye and instructorSeat are in that frame. update(dt, { s, L, av = L.av, parkBrake, night 0..1 }) every frame.
// controls: [{ id, label (Japanese, short), kind, target (its hit mesh, on PICK_LAYER), at (where to aim, at rest),
//   act(dir, wheel) }]: dir +1 = a click or the wheel turned up (clockwise / forward / on), −1 = the wheel down; act
//   returns what the game should do, or null for nothing: { type: 'flight', name, arg? } (the flight bridge's action),
//   { type: 'av', what, dir, big } (FL.avionics.control(L.av, what, dir, big); the softkey labels and the lamps follow
//   av by themselves), { type: 'switch', id, on } and { type: 'select', id, value } (set cockpit.switches[id]; the
//   lights and the engine are the game's to apply: aircraft/systems.js), { type: 'prime' } (one stroke of the primer),
//   { type: 'exit' }, { type: 'info', text }.
// pick(raycaster): the control whose hit box the ray meets first (what is drawn does not block it, so every aim point
//   is kept in plain sight from the eye: see the tests), null while the cockpit is hidden.
// The screens are unlit and toneMapped: false, but CADET's composer tone maps the whole image in its OutputPass (AgX),
//   so their colours come out somewhat darker and less saturated than FLIGHT LAB's canvases.
// opts: { makeCanvas(w, h) → canvas | null (default: a DOM canvas when there is a document), anisotropy }
export function buildCockpit(FL, A, opts = {}) {
  const P = FL.physics, AV = FL.avionics;
  const makeCanvas = opts.makeCanvas !== undefined ? opts.makeCanvas
    : (typeof document !== 'undefined' ? (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } : null);
  const B = makeBuilder(), add = B.add;
  const atlas = new Atlas(ATLAS_W, ATLAS_H);
  // ink from the atlas on a quad of w × h mm at p (turned by r), in the colour col; lit: backlit at night
  const decal = (wmm, hmm, draw, p, r, { lit = 1, rough = 0.55, col = INK } = {}) => {
    const it = atlas.add(wmm, hmm, draw), g = withCol(withMat(quad(wmm / 1000, hmm / 1000, [0, 0, 1, 1], p, r), rough, 0, lit), col);
    g.userData = { it }; (B.variant ? B.decalsV[B.variant] : B.decals).push(g);
    return it;
  };
  const label = (text, p, { size = 2.2, r = null, lit = 1, col = INK, weight, wmm = null, align } = {}) => {
    const lines = Array.isArray(text) ? text : [text], n = lines.length, longest = Math.max(...lines.map(l => l.length));
    const w = wmm || Math.max(3, longest * size * 0.66 + size * 0.6), h = size * 1.45 * n;
    return decal(w, h, textDraw(lines, { weight, align }), p, r, { lit, col });
  };
  // a placard: its ground (a plate in the cabin's material, on the surface) and its ink just in front
  const placard = (lines, wmm, hmm, p, { bg = 0xd7d4cc, fg = 0x151515, r = null, lift = 0.0004 } = {}) => {
    add(at(new THREE.PlaneGeometry(wmm / 1000, hmm / 1000), [p[0], p[1], p[2] + lift], r), { c: bg, r: 0.32 });
    return decal(wmm, hmm, placardDraw(lines), [p[0], p[1], p[2] + lift + 0.0003], r, { lit: 0, rough: 0.32, col: fg });
  };
  const controls = [], hitMat = new THREE.MeshBasicMaterial({ visible: false }), hits = [], hitGeos = [];
  const hitRoot = new THREE.Group(); hitRoot.name = 'cockpit-hits';
  // a control: target = an invisible box (or cylinder) a little larger than the thing (more: further boxes [size, pos] of
  // the same control, e.g. a yoke's two horns); part = the moving part it rides on; at = where to aim at it
  function control(c) {
    const g = c.cyl ? cylZ(c.cyl[0], c.cyl[0], c.cyl[1], 12) : new THREE.BoxGeometry(c.size[0], c.size[1], c.size[2]);
    const mesh = new THREE.Mesh(g, hitMat);
    mesh.position.set(c.pos[0], c.pos[1], c.pos[2]); if (c.rot) mesh.rotation.set(c.rot[0], c.rot[1], c.rot[2]);
    mesh.layers.set(PICK_LAYER); mesh.name = 'hit-' + c.id;
    const ctl = { id: c.id, label: c.label, kind: c.kind, target: mesh, at: new THREE.Vector3(...(c.aim || c.pos)), part: c.part || null, act: c.act, type: B.variant };
    if (typeof c.label === 'function') Object.defineProperty(ctl, 'label', { get: c.label, enumerable: true });     // it changes (a softkey's function)
    mesh.updateMatrix();
    ctl.aimLocal = ctl.at.clone().applyMatrix4(mesh.matrix.clone().invert());     // where to aim, in the hit mesh's frame (moves with it)
    mesh.userData.control = ctl;
    for (const [sz, p] of c.more || []) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sz[0], sz[1], sz[2]), hitMat);
      m.position.set(p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]); m.layers.set(PICK_LAYER); m.name = mesh.name; m.userData.control = ctl;
      mesh.add(m); hitGeos.push(m.geometry);
    }
    hits.push({ mesh, part: c.part || null }); hitGeos.push(g);
    controls.push(ctl);
    return ctl;
  }
  const cur = { s: null, av: null, L: null };                 // the last state update() saw (act() reads it)
  const switches = { master: true, avionics: true, fuelPump: true, beacon: true, nav: true, strobe: true, landing: false, taxi: false, pitot: false, mag: 'BOTH', fuelSel: 'L', mixture: 1, carbHeat: false, propCycleT: 0, propCycled: false };
  const twinA = opts.twin || null;                            // (M6) the Seminole's own parts too: setType('pa44') shows them
  const flight = (name, arg) => (arg === undefined ? { type: 'flight', name } : { type: 'flight', name, arg });
  const info = text => ({ type: 'info', text });
  const avc = (what, dir = 1, big = false) => ({ type: 'av', what, dir, big });

  // ============================================================ the shell
  // the parts made in Blender (null: none; a group missing from the model: its simple shapes made here)
  const band = addBand(B, twinA), fromModel = group => !!band && band.some(n => n.split('.')[0] === group);
  // floor (carpet), firewall, the plate under the panel
  add(sheet((u, v, o) => o.set(-0.462 + 0.924 * u, FLOOR, FIRE + (AFT - FIRE) * v), 6, 18, true), S.carpet);
  add(sheet((u, v, o) => o.set(-0.53 + 1.06 * u, FLOOR + (WS.y0 - 0.03 - FLOOR) * v, FIRE), 8, 8, false), S.carpet);   // (its top hidden under the glareshield)
  add(sheet((u, v, o) => o.set(-0.55 + 1.1 * u, PBOT - 0.004, PZ - 0.02 + (FIRE - PZ + 0.02) * v), 6, 4, true), { ...S.black, ao: 0.6 });
  // the lower walls (to the window sill): a soft profile from the floor up
  for (const sd of [-1, 1]) {
    add(sheet((u, v, o) => { const y = FLOOR + (SILL - FLOOR) * v; o.set(sd * lowX(y), y, FIRE + (AFT - FIRE) * u); }, 22, 8, sd < 0), S.wall);
    // the upholstered side panel (on the right: the door's), a shade darker than the wall
    add(sheet((u, v, o) => { const y = -0.27 + (SILL - 0.02 + 0.27) * v; o.set(sd * (lowX(y) - 0.0025), y, -1.17 + 1.01 * u); }, 6, 6, sd < 0), S.sidePanel);
    // the window band (leaning in towards the roof): a ring round each window (its thick, soft-edged reveal) and the
    // posts between them, all in the band's plane
    const len = Math.hypot(KX, 1), nx = sd / len, ny = -KX / len;
    // (sx, sy, sz) → x = sd·bandX(sy) + (0.016 − sz)·n, y = sy + (0.016 − sz)·n.y, z = sd·sx  (sx = sd·z keeps the faces' winding)
    const M = new THREE.Matrix4().set(0, sd * KX, -nx, sd * (HW - KX * SILL) + 0.016 * nx, 0, 1, -ny, 0.016 * ny, sd, 0, 0, 0, 0, 0, 0, 1);
    const mir = pts => pts.map(([z, y]) => [sd * z, y]);
    for (const [win, ring, r] of WINDOWS) add(slab(mir(ring), 0.002, [[mir(win), r]], 0.014, 0.016, 0.005, 5, 1).applyMatrix4(M), S.wall);
    for (const [z0, z1] of POSTS) add(sheet((u, v, o) => { const y = SILL + (WTOP - SILL) * v, z = z0(y) + (z1(y) - z0(y)) * u; o.set(sd * bandX(y), y, z); }, 4, 6, sd < 0), S.wall);
    const zp = y => wsZ(bandX(y) + 0.004, y) - 0.03;
    // the sill trim and the armrest
    add(at(rbox(0.035, 0.022, AFT - zp(SILL) - 0.02, 0.008, 1), [sd * (HW - 0.012), SILL + 0.004, (AFT + zp(SILL)) / 2]), S.trim);
    add(at(rbox(0.06, 0.05, 0.42, 0.014, 2), [sd * (HW - 0.035), 0.205, -0.62]), S.arm);
    add(at(rbox(0.05, 0.045, 0.36, 0.012, 2), [sd * (HW - 0.03), 0.20, 0.42]), S.arm);
    // (without the model) the A-pillar trim along the windshield's edge, and the upper trim along the roof
    if (!fromModel('headliner')) {
      const pil = []; for (let i = 0; i <= 8; i++) { const y = WS.y0 - 0.02 + (WTOP + 0.02 - WS.y0) * i / 8; pil.push([sd * (bandX(y) - 0.012), y, wsZ(bandX(y), y) + 0.02]); }
      add(tube(pil, 0.028, 16, 8), S.trim);
      add(at(rbox(0.04, 0.03, AFT - zp(WTOP) + 0.02, 0.01, 1), [sd * (HWT - 0.005), WTOP + 0.002, (AFT + zp(WTOP)) / 2]), S.trim);
    }
    // the B-pillar trim between the front and rear windows
    add(at(rbox(0.024, WTOP - SILL + 0.02, 0.15, 0.010, 2), [sd * (HW - 0.034), (WTOP + SILL) / 2, -0.175], [0, 0, -sd * Math.atan(-KX)]), S.trim);
  }
  // (without the model) the headliner: an arch from window top to window top, from the windshield's top edge to the aft
  // bulkhead; the windshield's top bow
  if (!fromModel('headliner')) {
    add(sheet((u, v, o) => {
      const ph = Math.PI * u, x = -HWT * Math.cos(ph), y = WTOP + (ROOF - WTOP) * Math.sin(ph), z0 = wsZ(x, Math.min(y, WS.y1)) + 0.004;
      o.set(x, y, z0 + (AFT - z0) * v);
    }, 16, 18, false), S.roof);
    const pts = []; for (let i = 0; i <= 12; i++) { const x = -HWT + 2 * HWT * i / 12, y = Math.min(roofY(x), WS.y1 + 0.01) - 0.01; pts.push([x, y, wsZ(x, Math.min(y, WS.y1)) + 0.025]); }
    add(tube(pts, 0.026, 24, 8), S.trim);
  }
  // the windshield's centre strip
  { const pts = []; for (let i = 0; i <= 6; i++) { const y = WS.y0 + 0.01 + (WS.y1 - WS.y0 - 0.02) * i / 6; pts.push([0, y, wsZ(0, y) + 0.008]); }
    add(tube(pts, 0.011, 8, 6), S.steel); }
  // the aft bulkhead and the baggage floor
  add(sheet((u, v, o) => { const x = -HW + 2 * HW * u, y = FLOOR + (ROOF - FLOOR) * v; o.set(x, Math.min(y, roofY(x) + 0.01), AFT); }, 8, 8, true), S.wallDark);
  add(at(rbox(1.04, 0.18, AFT - 0.95, 0.02), [0, FLOOR + 0.09, (AFT + 0.95) / 2]), S.carpet);

  // ============================================================ the panel, the glareshield
  add(at(rbox(1.106, PTOP - PBOT, 0.035, 0.008, 2), [0, (PTOP + PBOT) / 2, PZ - 0.018]), S.panel);
  add(sheet((u, v, o) => o.set(-0.545 + 1.09 * u, PBOT + 0.008 + (PTOP - PBOT - 0.016) * v, PZ + 0.0002), 22, 9), S.panel);
  // (without the model) the glareshield: a hood from under its lip, over the rounded lip, forward to the windshield's base
  if (!fromModel('glareshield')) add(sheet((u, v, o) => {
    const x = -GLARE.x + 2 * GLARE.x * u, zb = wsZ(x, WS.y0);
    const z1 = zb - 0.002, y1 = WS.y0 - 0.002, slope = (f) => [-1.05 + (z1 + 1.05) * f, 0.4795 + (y1 - 0.4795) * f];   // the hood falls straight to the windshield
    const prof = [...GLARE.lip, slope(0.33), slope(0.67), [z1, y1]];
    const f = v * (prof.length - 1), i = Math.min(prof.length - 2, Math.floor(f)), t = f - i;
    o.set(x, prof[i][1] + (prof[i + 1][1] - prof[i][1]) * t, prof[i][0] + (prof[i + 1][0] - prof[i][0]) * t);
  }, 24, 16, false), S.glare);

  // ============================================================ the displays (G1000 type)
  const BZ = PZ + BEZEL.depth;                                       // the bezels' front face
  const screens = { pfd: null, mfd: null };
  const scr = { pfd: [], mfd: [] }, strips = [];
  for (const [which, C] of [['pfd', PFD], ['mfd', MFD]]) {
    const hw = BEZEL.w / 2, hh = BEZEL.h / 2, sw = BEZEL.screenW / 2, sy0 = BEZEL.screenBot, sy1 = BEZEL.screenBot + BEZEL.screenH;
    // the glass sits just behind the bezel's rounded lip, and the opening is wider than the screen by the bevel (whose
    // middle narrows the opening by its size): seen from the seat (≈25° down onto the PFD, ≈27° from the left onto the
    // MFD) the lip hides none of the top bar or the engine strip
    const bev = 0.002, m = bev + 0.0002;
    const fr = slab(rectPts(-hw, -hh, hw, hh), 0.009, [[rectPts(-sw - m, sy0 - m, sw + m, sy1 + m), 0.003]], BEZEL.depth - 0.003, BZ, bev);
    add(at(fr, [C[0], C[1], 0]), S.bezel);
    // the screen itself (the display, then the label strip under it), the black case behind its edges
    const zS = BZ - bev - 0.0005;
    add(at(new THREE.PlaneGeometry(BEZEL.screenW + 0.008, BEZEL.screenH + 0.008), [C[0], C[1] + BEZEL.screenY, zS - 0.001]), S.caseBlack);
    scr[which].push(quad(BEZEL.screenW, BEZEL.imageH, [0, 0, 1, 1], [C[0], C[1] + sy1 - BEZEL.imageH / 2, zS]));
    strips.push(quad(BEZEL.screenW, BEZEL.stripH, dynUV(DYN.strip[which]), [C[0], C[1] + sy0 + BEZEL.stripH / 2, zS]));
    const band = sy1 - BEZEL.imageH - sy0 - BEZEL.stripH;
    if (band > 1e-4) { const q = quad(BEZEL.screenW, band, dynUV(DYN.white), [C[0], C[1] + sy0 + BEZEL.stripH + band / 2, zS]); q.userData.black = true; B.unlit.push(q); }
    // softkeys
    for (let i = 0; i < 12; i++) {
      const x = C[0] + KEY_X(i), y = C[1] + BEZEL.keyY;
      add(at(rbox(0.0125, 0.0068, 0.008, 0.0018), [x, y, BZ - 0.001]), S.key);
      const tag = `${which === 'pfd' ? 'PFD' : 'MFD'} ソフトキー ${i + 1}`;
      const now = () => { const k = softkeysOf(which, cur.av)[i], l = k && (typeof k.label === 'function' ? (cur.av ? k.label(cur.av) : '') : k.label); return l && k.act ? `${tag}（${l}）` : tag; };
      control({ id: `${which}.sk${i + 1}`, label: now, kind: 'button', size: [0.016, 0.011, 0.02], pos: [x, y, BZ + 0.002],
        act: () => { const k = softkeysOf(which, cur.av)[i], w = k && k.act ? k.act(cur.av) : null; return w ? avc(w[0], w[1]) : info('このキーはこの飛行では使いません'); } });
    }
    // knobs: dual (outer ring + inner knob) or single, with the labels around them
    for (const kn of KNOBS) {
      const x = C[0] + kn.x, y = C[1] + kn.y;
      add(at(new THREE.CircleGeometry(kn.r + 0.003, 16), [x, y, BZ + 0.0006]), S.knobRing);
      if (kn.dual) {
        add(at(knurled(kn.r, 0.0085, 20), [x, y, BZ + 0.005]), S.knob);
        add(at(knurled(kn.r * 0.62, 0.0085, 14), [x, y, BZ + 0.0125]), S.knob);
      } else add(at(knurled(kn.r, 0.011, 16), [x, y, BZ + 0.0065]), S.knob);
      label(kn.label, [x, y + kn.r + 0.0048, BZ + 0.0002], { size: 1.8, wmm: kn.label.length * 1.25 + 1.5 });
      knobControls(which, kn, x, y);
    }
    for (const k of KEYS) {
      const x = C[0] + k.x, y = C[1] + k.y;
      add(at(rbox(k.w, 0.0068, 0.006, 0.0015), [x, y, BZ + 0.001]), S.key);
      label(k.label, [x, y, BZ + 0.0041], { size: 1.5, wmm: k.w * 1000 - 1 });
      keyControl(which, k, x, y);
    }
  }
  function knurled(r, h, n) {
    const g = new THREE.CylinderGeometry(r, r, h, n, 1, false);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z); if (rr > r * 0.9) { const k = 1 + 0.03 * (i % 2 ? 1 : -1); p.setX(i, x * k); p.setZ(i, z * k); } }
    g.computeVertexNormals();
    return g.rotateX(Math.PI / 2);
  }
  function knobControls(which, kn, x, y) {
    const id = `${which}.${kn.id}`, z = BZ + 0.012;
    const dual = (name, outer, inner, push, labOut, labIn) => {
      const ex = EYE0[0] - x, ey = EYE0[1] - y, el = Math.hypot(ex, ey) || 1;                 // the ring's side towards the eye
      control({ id: id + '.outer', label: `${name}（外側）${labOut}`, kind: 'knob', cyl: [kn.r + 0.003, 0.012], pos: [x, y, BZ + 0.004], aim: [x + ex / el * kn.r * 0.86, y + ey / el * kn.r * 0.86, BZ + 0.009],
        act: (dir, wheel) => outer(wheel ? dir : 1) });
      control({ id: id + '.inner', label: `${name}（内側）${labIn}`, kind: 'knob', cyl: [kn.r * 0.62 + 0.0015, 0.01], pos: [x, y, z + 0.003],
        act: (dir, wheel) => (wheel || !push ? inner(wheel ? dir : 1) : push()) });
    };
    if (kn.id === 'nav') dual('NAV 周波数', d => avc('NAV_MHZ', d), d => avc('NAV_KHZ', d), () => avc('NAV_SEL'), 'MHz', 'kHz・押すと NAV1/2');
    else if (kn.id === 'com') dual('COM 周波数', d => avc('COM_MHZ', d), d => avc('COM_KHZ', d), () => avc('COM_SEL'), 'MHz', 'kHz・押すと COM1/2');
    else if (kn.id === 'alt') dual('高度選択 ALT', d => avc('ALT', d, true), d => avc('ALT', d), null, '1000 ft', '100 ft');
    else if (kn.id === 'crs') dual('CRS / BARO', d => avc('BARO', d), d => avc('CRS', d), null, '気圧設定', 'コース');
    else if (kn.id === 'fms') dual('FMS', d => avc('FPL_NEXT', d), d => avc('FPL_NEXT', d), null, '飛行計画のレグ', '飛行計画のレグ');
    else if (kn.id === 'hdg') control({ id, label: 'HDG ヘディング バグ（押すと今の機首方位に合わせる）', kind: 'knob', cyl: [kn.r + 0.003, 0.016], pos: [x, y, BZ + 0.007],
      act: (dir, wheel) => (wheel ? avc('HDG', dir) : avc('HDG_SYNC', cur.s ? Math.round(AV.trueToMag(cur.s.out.hdgTrue || 0, P.MAGVAR_W)) : 360)) });
    else if (kn.id === 'range') control({ id, label: 'RANGE 地図の範囲', kind: 'knob', cyl: [kn.r + 0.003, 0.016], pos: [x, y, BZ + 0.007], act: (dir) => avc('RANGE', dir < 0 ? -1 : 1) });
    else control({ id, label: `${kn.label}（音量）`, kind: 'knob', cyl: [kn.r + 0.003, 0.016], pos: [x, y, BZ + 0.007], act: () => info('音量はこの飛行では変えません') });
  }
  function keyControl(which, k, x, y) {
    const id = `${which}.${k.id}`, size = [k.w + 0.0015, 0.0088, 0.016], pos = [x, y, BZ + 0.003];    // (neighbours' boxes do not overlap)
    const wps = AV.WAYPOINTS.filter(w => w.kind !== 'ref').map(w => w.id);
    const acts = {
      navSwap: () => avc('NAV_SWAP'), comSwap: () => avc('COM_SWAP'), fpl: () => avc('MFD_PAGE'),
      direct: () => { const now = cur.av && cur.av.direct, i = wps.indexOf(now); return avc('DIRECT', i + 1 < wps.length ? wps[i + 1] : null); },
    };
    const labels = { navSwap: 'NAV 周波数の入れ替え', comSwap: 'COM 周波数の入れ替え', fpl: 'FPL（飛行計画のページ）', direct: 'D→（直行先を順に選ぶ）', menu: 'MENU キー', proc: 'PROC キー', clr: 'CLR キー', ent: 'ENT キー' };
    control({ id, label: labels[k.id], kind: 'button', size, pos, act: acts[k.id] || (() => info('このキーはこの飛行では使いません')) });
  }
  // the screens' and strips' textures come later (createGlass); remember the quads
  // ============================================================ the audio panel (GMA type)
  const AUDIO = [['COM1 MIC', 'COM1'], ['COM2 MIC', 'COM2'], ['COM3 MIC', 'COM3'], ['COM1/2', 'TEL'], ['PA', 'SPKR'], ['MKR/MUTE', 'HI SENS'], ['DME', 'ADF'], ['NAV1', 'NAV2'], ['AUX', 'MAN SQ'], ['PLAY', ''], ['PILOT', 'COPLT']];
  // a lamp: its quad into the unlit mesh (the type's own while B.variant is set); { key, list, index }, and once the
  // meshes are made { col, first, count }: its vertices in that mesh's colours
  const lamps = [];
  const lamp = (key, g) => { const list = B.variant ? B.unlitV[B.variant] : B.unlit; list.push(g); lamps.push({ key, list, index: list.length - 1 }); };
  {
    const [cx, cy] = AUD, w = 0.062, h = BEZEL.h;
    add(at(rbox(w, h, 0.018, 0.006, 2), [cx, cy, PZ + 0.009]), S.bezel);
    AUDIO.forEach((row, j) => row.forEach((name, i) => {
      if (!name) return;
      const x = cx + (i ? 0.0145 : -0.0145), y = cy + 0.088 - j * 0.0148, z = PZ + 0.018;
      add(at(rbox(0.024, 0.0105, 0.006, 0.0018), [x, y, z + 0.002]), S.key);
      label(name, [x, y - 0.0012, z + 0.0051], { size: 1.35, wmm: 22 });
      const lampKey = { 'COM1 MIC': 'micCOM1', 'COM2 MIC': 'micCOM2', COM1: 'monCOM1', COM2: 'monCOM2', NAV1: 'monNAV1', NAV2: 'monNAV2' }[name] || null;
      lamp(lampKey, quad(0.009, 0.0016, dynUV(DYN.white), [x, y + 0.0037, z + 0.0052]));
      const act = name === 'COM1 MIC' || name === 'COM2 MIC' ? () => { const r = name.slice(0, 4); return cur.av && cur.av.audio.mic === r ? info(`送信はすでに ${r} です`) : avc('MIC'); }
        : /^(COM1|COM2|NAV1|NAV2)$/.test(name) ? () => avc('MON', name) : () => info('このボタンはこの飛行では使いません');
      control({ id: 'audio.' + name.replace(/[^A-Z0-9]/g, ''), label: `オーディオ ${name}`, kind: 'button', size: [0.026, 0.0125, 0.016], pos: [x, y, z + 0.004], act });
    }));
    add(at(knurled(0.0085, 0.008, 24), [cx, cy - 0.080, PZ + 0.022]), S.knob);
    add(at(knurled(0.0055, 0.008, 18), [cx, cy - 0.080, PZ + 0.029]), S.knob);
    label('VOL', [cx, cy - 0.066, PZ + 0.0182], { size: 1.4 });
    add(at(rbox(0.03, 0.007, 0.005, 0.0015), [cx, cy - 0.097, PZ + 0.019]), S.red);
    label('DISPLAY BACKUP', [cx, cy - 0.097, PZ + 0.0216], { size: 1.1, wmm: 28 });
  }

  // ============================================================ the standby instruments (airspeed, attitude, altimeter)
  const stbyNames = ['asi', 'att', 'alt'], stbyJa = { asi: '予備の速度計', att: '予備の姿勢指示器', alt: '予備の高度計' };
  stbyNames.forEach((k, i) => {
    const y = STBY_Y[i], x = STBY_X;
    add(slab(rectPts(x - 0.035, y - 0.035, x + 0.035, y + 0.035), 0.006, [[circlePts(x, y, 0.0295, 24), 0.0005]], 0.012, PZ + 0.015, 0, 3), S.bezel);
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) add(at(new THREE.CircleGeometry(0.0022, 6), [x + sx * 0.029, y + sy * 0.029, PZ + 0.0156]), S.steel);
    const g = new THREE.CircleGeometry(0.0295, 32), uv = dynUV(DYN[k]), a = g.attributes.uv;
    for (let j = 0; j < a.count; j++) a.setXY(j, uv[0] + a.getX(j) * (uv[2] - uv[0]), uv[1] + a.getY(j) * (uv[3] - uv[1]));
    B.dynLit.push(withMat(at(g.toNonIndexed(), [x, y, PZ + 0.004]), 0.5, 0, 1));
    B.glass.push(at(new THREE.CircleGeometry(0.0293, 24), [x, y, PZ + 0.011]));
    if (k === 'alt') { add(at(knurled(0.0065, 0.008, 18), [x - 0.026, y - 0.026, PZ + 0.019]), S.knob); }
    if (k === 'att') { add(at(knurled(0.005, 0.007, 16), [x, y - 0.029, PZ + 0.0185]), S.knob); }
    control({ id: 'stby.' + k, label: stbyJa[k], kind: 'button', size: [0.07, 0.07, 0.02], pos: [x, y, PZ + 0.01],
      act: () => info(k === 'asi' ? '予備の速度計：PFD が使えないときの速度（ノット）' : k === 'att' ? '予備の姿勢指示器：PFD が使えないときの姿勢' : '予備の高度計：PFD と同じ気圧設定で読みます') });
  });
  function circlePts(x, y, r, n) { const p = []; for (let i = 0; i < n; i++) { const a = -i / n * Math.PI * 2; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return p; }

  // ============================================================ the switch row, the key, the primer, the vents, the breakers
  ROCKERS.forEach(([id, name], i) => {
    const x = ROCKER.x0 + i * ROCKER.dx;
    add(at(rbox(0.0195, 0.032, 0.004, 0.0015), [x, ROCKER.y, PZ + 0.002]), S.caseBlack);
    label(name.includes(' ') ? name.split(' ') : name, [x, ROCKER.y + (name.includes(' ') ? 0.031 : 0.0275), PZ + 0.0002], { size: 2.3, wmm: 34 });
    label('ON', [x, ROCKER.y + 0.0195, PZ + 0.0002], { size: 1.6 });
    const ax = Math.abs(x + YOKE.x) < 0.03 ? x + 0.006 * Math.sign(x + YOKE.x) : x;             // (the one behind the yoke's shaft: its free side)
    control({ id: 'sw.' + id, label: SWITCH_JA[id], kind: 'switch', size: [0.02, 0.032, 0.022], pos: [x, ROCKER.y, PZ + 0.008], aim: [ax, ROCKER.y, PZ + 0.008],
      act: (dir, wheel) => { const on = wheel ? dir > 0 : !switches[id]; return on === switches[id] && wheel ? null : { type: 'switch', id, on }; } });
  });
  label('ELECTRICAL', [ROCKER.x0 + 4 * ROCKER.dx, ROCKER.y - 0.024, PZ + 0.0002], { size: 1.8, wmm: 40 });
  // the ignition (magneto) switch: a lock with the key in it, the positions printed round it
  add(at(cylZ(0.016, 0.017, 0.006, 28), [KEYSW[0], KEYSW[1], PZ + 0.003]), S.chrome);
  add(at(cylZ(0.0105, 0.0105, 0.0015, 24), [KEYSW[0], KEYSW[1], PZ + 0.0062]), S.steel);
  // (the key turned by MAG_ANG clockwise from 12 o'clock: OFF on the left, START on the right, as on the real switch)
  MAG.forEach((m, i) => { const a = MAG_ANG[i]; label(m, [KEYSW[0] + Math.sin(a) * 0.027, KEYSW[1] + Math.cos(a) * 0.027, PZ + 0.0002], { size: 1.6 }); });
  label('MAGNETOS', [KEYSW[0], KEYSW[1] - 0.026, PZ + 0.0002], { size: 1.6, wmm: 24 });
  add(at(rbox(0.021, 0.026, 0.0035, 0.007, 3), [KEYSW[0], KEYSW[1] + 0.006, PZ + 0.031]), S.alu, 'key');
  add(at(rbox(0.006, 0.012, 0.025, 0.0015), [KEYSW[0], KEYSW[1], PZ + 0.018]), S.steel, 'key');
  control({ id: 'mag', label: 'マグネトー（エンジンの点火）', kind: 'switch', part: 'key', size: [0.03, 0.04, 0.04], pos: [KEYSW[0], KEYSW[1] + 0.005, PZ + 0.022],
    act: (dir, wheel) => { const i = MAG.indexOf(switches.mag), j = clamp(i + (wheel ? dir : 1), 0, MAG.length - 1); return j === i ? null : { type: 'select', id: 'mag', value: MAG[j] }; } });
  // the primer and the dimmers (left column)
  // (above the key, just right of where the yoke's left horn hides the panel from the left seat)
  const PRIM = [-0.468, 0.183];
  add(at(cylZ(0.009, 0.009, 0.004, 20), [PRIM[0], PRIM[1], PZ + 0.002]), S.chrome);
  add(at(cylZ(0.0065, 0.0055, 0.016, 20), [PRIM[0], PRIM[1], PZ + 0.012]), S.chrome);
  label('PRIMER', [PRIM[0], PRIM[1] + 0.018, PZ + 0.0002], { size: 1.7 });
  control({ id: 'primer', label: 'プライマー（押すごとに 1 回）', kind: 'button', size: [0.026, 0.026, 0.03], pos: [PRIM[0], PRIM[1], PZ + 0.012], act: () => ({ type: 'prime' }) });
  for (const [y, name] of [[0.33, 'PANEL LTS'], [0.285, 'SWITCH LTS']]) { add(at(knurled(0.007, 0.01, 18), [-0.51, y, PZ + 0.005]), S.knob); label(name, [-0.51, y + 0.014, PZ + 0.0002], { size: 1.5, wmm: 22 }); }
  // the air vents (eyeballs)
  for (const sx of [-1, 1]) {
    const x = sx * 0.505, y = 0.415;
    add(at(cylZ(0.026, 0.027, 0.006, 28), [x, y, PZ + 0.003]), S.black);
    add(at(sphere(0.019, 12, 8), [x, y, PZ + 0.004]), S.knob);
    add(at(cylZ(0.009, 0.009, 0.02, 12), [x, y, PZ + 0.012]), S.caseBlack);
  }
  // circuit breakers (right, low)
  { const names = [['PFD', 'MFD', 'AHRS', 'ADC', 'GPS/NAV1', 'GPS/NAV2', 'AUDIO'], ['COM1', 'COM2', 'XPDR', 'ENG', 'FUEL PUMP', 'PITOT', 'TURN'], ['NAV LT', 'STROBE', 'LDG LT', 'TAXI LT', 'BEACON', 'ALT FLD', 'MASTER']];
    names.forEach((row, j) => row.forEach((n, i) => {
      const x = 0.322 + i * 0.033, y = 0.178 - j * 0.052;
      add(at(new THREE.CircleGeometry(0.0062, 10), [x, y, PZ + 0.0008]), S.steel);
      add(at(cylZ(0.0048, 0.0052, 0.011, 8), [x, y, PZ + 0.0062]), S.cbBody);
      label(n, [x, y - 0.0125, PZ + 0.0002], { size: 1.3, wmm: 15 });
      label(['5', '5', '5', '3', '5', '5', '2', '5', '5', '2', '5', '10', '10', '2', '5', '5', '5', '5', '5', '5', '60'][j * 7 + i] || '5', [x, y + 0.0095, PZ + 0.0002], { size: 1.2 });
    }));
    label('CIRCUIT BREAKERS', [0.421, 0.205, PZ + 0.0002], { size: 1.8, wmm: 50 });
    control({ id: 'cb', label: 'サーキット ブレーカー', kind: 'button', size: [0.23, 0.15, 0.02], pos: [0.421, 0.13, PZ + 0.008], aim: [0.49, 0.13, PZ + 0.008], act: () => info('サーキット ブレーカー：飛び出しているもの（切れた回路）がないか、目で確かめます') });
  }
  // placards (right of the panel)
  placard(['THIS AIRPLANE MUST BE OPERATED IN THE NORMAL OR UTILITY', 'CATEGORY IN COMPLIANCE WITH THE OPERATING LIMITATIONS', 'STATED IN THE FORM OF PLACARDS, MARKINGS AND MANUALS.', 'NO ACROBATIC MANEUVERS INCLUDING SPINS APPROVED.'],
    88, 30, [0.424, 0.37, PZ]);
  B.variant = 'pa28';
  placard(['MANEUVERING SPEED 113 KIAS AT 2550 LBS'], 64, 9, [0.424, 0.336, PZ]);
  placard(['DEMONSTRATED CROSSWIND 17 KTS'], 64, 9, [0.424, 0.322, PZ]);
  B.variant = twinA ? 'pa44' : null;
  if (twinA) {                                                     // (the Seminole's: its speeds, one engine out)
    placard(['MANEUVERING SPEED 135 KIAS AT 3800 LBS'], 64, 9, [0.424, 0.336, PZ]);
    placard(['ONE ENGINE INOP: VMC 56 KIAS  VYSE 88 KIAS'], 64, 9, [0.424, 0.322, PZ], { bg: 0xe8e4da, fg: 0xb3231c });
  }
  B.variant = null;
  placard(['NO SMOKING'], 30, 9, [0.424, 0.300, PZ], { bg: 0xe8e4da, fg: 0xb3231c });
  // the hour meter
  add(at(rbox(0.032, 0.016, 0.004, 0.002), [0.47, 0.255, PZ + 0.002]), S.caseBlack);
  decal(26, 9, (g, w, h) => { g.font = `700 ${h * 0.62}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('0 4 7 1 2', w / 2, h * 0.55); }, [0.47, 0.255, PZ + 0.0042], null, { lit: 0, col: 0xf0f0f0 });
  label('HOURS', [0.47, 0.268, PZ + 0.0002], { size: 1.4 });
  function placardDraw(lines) {
    return (g, w, h) => {
      g.lineWidth = Math.max(1, h * 0.03); g.strokeRect(g.lineWidth * 1.5, g.lineWidth * 1.5, w - g.lineWidth * 3, h - g.lineWidth * 3);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const lh = (h * 0.86) / lines.length; g.font = `700 ${lh * 0.72}px ${SANS}`;
      lines.forEach((l, i) => g.fillText(l, w / 2, h * 0.07 + lh * (i + 0.5), w * 0.94));
    };
  }

  // ============================================================ the throttle quadrant and the park brake
  B.variant = 'pa28';
  { const qx = 0.01, qw = 0.17, qy0 = -0.105, qy1 = 0.065, qz = PZ + 0.035;
    add(at(rbox(qw, qy1 - qy0, 0.05, 0.01, 2), [qx, (qy0 + qy1) / 2, qz - 0.025]), S.panel);
    for (const [x, name, sub] of [[-0.05, 'CARB HEAT', ['OFF', 'ON']], [-0.005, 'THROTTLE', ['OPEN', 'CLOSE']], [0.045, 'MIXTURE', ['RICH', 'LEAN']]]) {
      add(at(rbox(0.009, 0.16, 0.004, 0.003), [x, -0.017, qz + 0.0005]), S.slot);
      label(name, [x, qy1 - 0.008, qz + 0.0021], { size: 1.6, wmm: 20 });
      label(sub[0], [x + 0.013, 0.045, qz + 0.0021], { size: 1.3 }); label(sub[1], [x + 0.013, -0.085, qz + 0.0021], { size: 1.3 });
    }
    add(at(knurled(0.007, 0.012, 18), [0.08, -0.075, qz + 0.006]), S.knob);
    label('FRICTION', [0.08, -0.061, qz + 0.0021], { size: 1.2 });
    // the levers: an arm from a pivot behind the face, a knob at its end (built at 0°: pointing aft)
    const lever = (x, part, knob, s) => {
      add(at(new THREE.BoxGeometry(0.006, 0.006, LEVER.len), [x, LEVER.y, LEVER.z + LEVER.len / 2]), S.steel, part);
      add(at(knob, [x, LEVER.y, LEVER.z + LEVER.len + 0.012]), s, part);
    };
    lever(-0.005, 'throttle', rbox(0.034, 0.024, 0.03, 0.007, 2), S.black);
    lever(0.045, 'mixture', ribbed(0.026, 0.024, 0.026), S.red);
    lever(-0.05, 'carb', rbox(0.02, 0.016, 0.014, 0.003), S.black);
    const lp = (x, a) => [x, LEVER.y + Math.sin(a) * (LEVER.len + 0.012), LEVER.z + Math.cos(a) * (LEVER.len + 0.012)];
    control({ id: 'throttle', label: 'スロットル（R / F）', kind: 'lever', part: 'throttle', size: [0.04, 0.032, 0.04], pos: lp(-0.005, 0), act: (dir) => flight('thrStep', dir >= 0 ? 1 : -1) });
    // the mixture: a click, full rich or (on the ground only) idle cut-off; the wheel, a tenth at a time
    control({ id: 'mixture', label: () => `ミクスチャー（${switches.mixture >= 0.95 ? 'リッチ' : switches.mixture < 0.15 ? 'アイドル カットオフ' : 'リーン'}）`, kind: 'lever', part: 'mixture', size: [0.032, 0.03, 0.036], pos: lp(0.045, 0),
      act: (dir, wheel) => {
        if (wheel) { const v = clamp(Math.round((switches.mixture + (dir > 0 ? 0.1 : -0.1)) * 10) / 10, 0, 1); return v === switches.mixture ? null : { type: 'select', id: 'mixture', value: v }; }
        if (switches.mixture < 0.95) return { type: 'select', id: 'mixture', value: 1 };
        return cur.s && !cur.s.onGround ? info('飛んでいる間は、ミクスチャーはリッチのままにします') : { type: 'select', id: 'mixture', value: 0 };
      } });
    control({ id: 'carbHeat', label: () => `キャブレター ヒート（${switches.carbHeat ? 'ON' : 'OFF'}）`, kind: 'lever', part: 'carb', size: [0.026, 0.024, 0.026], pos: lp(-0.05, 0),
      act: (dir, wheel) => { const on = wheel ? dir > 0 : !switches.carbHeat; return on === switches.carbHeat ? null : { type: 'switch', id: 'carbHeat', on }; } });
  }
  B.variant = null;
  // (M6) the Seminole's quadrant: the two throttles (black), the two propeller levers (blue), the two mixtures (red),
  // the two carburettor heat levers left of them; each pair moves together (FLIGHT LAB has one throttle, the cockpit's
  // switches one mixture); and its gear selector on the panel with the three green lights and the red one
  const TWIN_LV = { thrL: -0.045, thrR: -0.027, propL: 0.003, propR: 0.021, mixL: 0.051, mixR: 0.069, carbL: -0.083, carbR: -0.072 };
  const GEAR = { x: 0.205, y: 0.105, len: 0.045, down: 30 * DEG, up: -30 * DEG };
  if (twinA) {
    B.variant = 'pa44';
    const qx = 0.005, qw = 0.2, qy0 = -0.105, qy1 = 0.065, qz = PZ + 0.035;
    add(at(rbox(qw, qy1 - qy0, 0.05, 0.01, 2), [qx, (qy0 + qy1) / 2, qz - 0.025]), S.panel);
    for (const x of Object.values(TWIN_LV)) add(at(rbox(0.008, 0.16, 0.004, 0.003), [x, -0.017, qz + 0.0005]), S.slot);
    for (const [x, name] of [[-0.036, 'THROTTLE'], [0.012, 'PROP'], [0.06, 'MIXTURE'], [-0.0775, 'CARB HEAT']]) label(name, [x, qy1 - 0.008, qz + 0.0021], { size: 1.5, wmm: 22 });
    label('L   R', [-0.036, qy1 - 0.019, qz + 0.0021], { size: 1.3 }); label('L   R', [0.012, qy1 - 0.019, qz + 0.0021], { size: 1.3 }); label('L   R', [0.06, qy1 - 0.019, qz + 0.0021], { size: 1.3 });
    label('FEATHER', [0.012, -0.094, qz + 0.0021], { size: 1.2, wmm: 16 });
    const lever = (x, part, knob, sf) => {
      add(at(new THREE.BoxGeometry(0.005, 0.005, LEVER.len), [x, LEVER.y, LEVER.z + LEVER.len / 2]), S.steel, part);
      add(at(knob, [x, LEVER.y, LEVER.z + LEVER.len + 0.011]), sf, part);
    };
    lever(TWIN_LV.thrL, 'thrL', rbox(0.016, 0.022, 0.028, 0.006, 2), S.black); lever(TWIN_LV.thrR, 'thrR', rbox(0.016, 0.022, 0.028, 0.006, 2), S.black);
    lever(TWIN_LV.propL, 'propL', ribbed(0.015, 0.02, 0.024), S.blue); lever(TWIN_LV.propR, 'propR', ribbed(0.015, 0.02, 0.024), S.blue);
    lever(TWIN_LV.mixL, 'mixL', ribbed(0.015, 0.02, 0.024), S.red); lever(TWIN_LV.mixR, 'mixR', ribbed(0.015, 0.02, 0.024), S.red);
    lever(TWIN_LV.carbL, 'carbL', rbox(0.009, 0.014, 0.012, 0.003), S.black); lever(TWIN_LV.carbR, 'carbR', rbox(0.009, 0.014, 0.012, 0.003), S.black);
    const lp = (x, a) => [x, LEVER.y + Math.sin(a) * (LEVER.len + 0.012), LEVER.z + Math.cos(a) * (LEVER.len + 0.012)];
    const mid = (a, b) => (a + b) / 2;
    control({ id: 'throttle', label: 'スロットル 左右（R / F）', kind: 'lever', part: 'thrL', size: [0.04, 0.03, 0.04], pos: lp(mid(TWIN_LV.thrL, TWIN_LV.thrR), 0), act: (dir) => flight('thrStep', dir >= 0 ? 1 : -1) });
    control({ id: 'prop', label: () => `プロペラ 左右（${switches.propCycleT > 0 ? 'サイクル中' : '高回転'}）`, kind: 'lever', part: 'propL', size: [0.036, 0.03, 0.036], pos: lp(mid(TWIN_LV.propL, TWIN_LV.propR), 0),
      act: () => {
        if (!cur.s || !cur.s.onGround) return info('プロペラのレバーは、前（高回転）のままにします');
        if (!(cur.s.eng || []).every(e => !e.cut)) return info('プロペラのサイクルは、両方のエンジンが回っているときに（ランナップで）');
        return switches.propCycleT > 0 ? null : { type: 'select', id: 'propCycleT', value: 2.6 };
      } });
    control({ id: 'mixture', label: () => `ミクスチャー 左右（${switches.mixture >= 0.95 ? 'リッチ' : switches.mixture < 0.15 ? 'アイドル カットオフ' : 'リーン'}）`, kind: 'lever', part: 'mixL', size: [0.036, 0.03, 0.036], pos: lp(mid(TWIN_LV.mixL, TWIN_LV.mixR), 0),
      act: (dir, wheel) => {
        if (wheel) { const v = clamp(Math.round((switches.mixture + (dir > 0 ? 0.1 : -0.1)) * 10) / 10, 0, 1); return v === switches.mixture ? null : { type: 'select', id: 'mixture', value: v }; }
        if (switches.mixture < 0.95) return { type: 'select', id: 'mixture', value: 1 };
        return cur.s && !cur.s.onGround ? info('飛んでいる間は、ミクスチャーはリッチのままにします') : { type: 'select', id: 'mixture', value: 0 };
      } });
    control({ id: 'carbHeat', label: () => `キャブレター ヒート 左右（${switches.carbHeat ? 'ON' : 'OFF'}）`, kind: 'lever', part: 'carbL', size: [0.026, 0.024, 0.026], pos: lp(mid(TWIN_LV.carbL, TWIN_LV.carbR), 0),
      act: (dir, wheel) => { const on = wheel ? dir > 0 : !switches.carbHeat; return on === switches.carbHeat ? null : { type: 'switch', id: 'carbHeat', on }; } });
    // the gear selector: a slot in the panel, the lever with its wheel-shaped knob (down / up), the lights above
    add(at(rbox(0.03, 0.085, 0.004, 0.004), [GEAR.x, GEAR.y, PZ + 0.002]), S.caseBlack);
    add(at(rbox(0.006, 0.07, 0.002, 0.002), [GEAR.x, GEAR.y, PZ + 0.0045]), S.slot);
    add(at(new THREE.BoxGeometry(0.006, 0.006, GEAR.len), [GEAR.x, GEAR.y, PZ + GEAR.len / 2]), S.chrome, 'gearLever');
    add(at(cylX(0.013, 0.009, 18), [GEAR.x, GEAR.y, PZ + GEAR.len + 0.004]), S.wheelWhite, 'gearLever');
    label('UP', [GEAR.x + 0.025, GEAR.y + 0.03, PZ + 0.0002], { size: 1.6 }); label('DOWN', [GEAR.x + 0.027, GEAR.y - 0.03, PZ + 0.0002], { size: 1.6 });
    label('GEAR', [GEAR.x, GEAR.y - 0.052, PZ + 0.0002], { size: 1.8 });
    label(['NOSE', 'LEFT', 'RIGHT'].join('  '), [GEAR.x, GEAR.y + 0.074, PZ + 0.0002], { size: 1.2, wmm: 26 });
    for (let i = 0; i < 3; i++) {                                                   // nose (middle), left, right
      const dx = [0, -0.0175, 0.0175][i];
      add(at(rbox(0.0125, 0.0095, 0.004, 0.0015), [GEAR.x + dx, GEAR.y + 0.062, PZ + 0.002]), S.caseBlack);
      lamp(['gearN', 'gearL', 'gearR'][i], quad(0.0095, 0.007, dynUV(DYN.white), [GEAR.x + dx, GEAR.y + 0.062, PZ + 0.0043]));
    }
    add(at(rbox(0.03, 0.009, 0.004, 0.0015), [GEAR.x, GEAR.y + 0.086, PZ + 0.002]), S.caseBlack);
    lamp('gearRed', quad(0.027, 0.0065, dynUV(DYN.white), [GEAR.x, GEAR.y + 0.086, PZ + 0.0043]));
    label('GEAR UNSAFE', [GEAR.x, GEAR.y + 0.097, PZ + 0.0002], { size: 1.2, wmm: 22 });
    control({ id: 'gear', label: () => `脚のレバー（${cur.s && !cur.s.gearDown ? 'UP' : 'DOWN'}・G）`, kind: 'lever', part: 'gearLever', size: [0.03, 0.03, 0.03], pos: [GEAR.x, GEAR.y, PZ + GEAR.len + 0.004],
      act: () => flight('gear') });
    B.variant = null;
  }
  function ribbed(w, h, d) {
    const parts = [rbox(w, h, d, 0.004, 2)];
    for (let i = 0; i < 4; i++) parts.push(at(new THREE.BoxGeometry(w + 0.002, 0.0022, d * 0.8), [0, -h / 2 + 0.004 + i * (h - 0.008) / 3, 0]));
    return mergeGeometries(parts.map(g => (g.index ? g.toNonIndexed() : g)).map(g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; }));
  }
  // the park brake: a T-handle under the panel, left of the quadrant (pulled out when set)
  { const x = -0.135, py = 0.036, pz = PZ - 0.012;
    add(at(rbox(0.03, 0.012, 0.03, 0.003), [x, py + 0.002, pz]), S.black);
    add(at(new THREE.CylinderGeometry(0.0045, 0.0045, 0.075, 10), [x, py - 0.037, pz + 0.012], [0.32, 0, 0]), S.steel, 'brake');
    add(at(cylX(0.0105, 0.07, 16), [x, py - 0.073, pz + 0.025]), S.black, 'brake');
    label('PARK BRAKE', [x, PBOT - 0.012, PZ + 0.0002], { size: 1.5, wmm: 24 });
    // (aimed at its right end: the left one goes behind the yoke's horn as soon as the yoke comes back a little)
    control({ id: 'parkBrake', label: 'パーキングブレーキ', kind: 'lever', part: 'brake', size: [0.085, 0.035, 0.04], pos: [x, py - 0.073, pz + 0.025], aim: [x + 0.023, py - 0.073, pz + 0.025], act: () => flight('parkBrake') });
  }

  // ============================================================ the yokes
  for (const sd of [-1, 1]) {
    const part = sd < 0 ? 'yokeL' : 'yokeR', x0 = sd * YOKE.x, y0 = YOKE.y, z0 = YOKE.z;
    const P3 = (x, y, z) => [x0 + x, y0 + y, z0 + z];
    if (!fromModel('yokes')) {                                 // (without the model) the yoke and its boot at the panel
      add(at(rbox(0.078, 0.052, 0.036, 0.013, 2), P3(0, 0, 0)), S.yoke, part);
      add(at(rbox(0.056, 0.03, 0.004, 0.006, 2), P3(0, 0.002, 0.018)), S.alu, part);
      add(at(cylZ(0.0135, 0.0135, 0.40, 16), P3(0, 0, -0.20)), S.chrome, part);
      add(at(cylZ(0.017, 0.017, 0.02, 16), P3(0, 0, -0.027)), S.yoke, part);
      for (const s of [-1, 1]) {
        add(tube([P3(s * 0.03, 0, 0), P3(s * 0.085, -0.008, 0.004), P3(s * 0.13, 0.004, 0.01), P3(s * 0.152, 0.036, 0.012)], 0.0115, 12, 8), S.yoke, part);
        add(tube([P3(s * 0.150, 0.03, 0.012), P3(s * 0.159, 0.068, 0.011), P3(s * 0.158, 0.103, 0.006), P3(s * 0.149, 0.128, 0.0)], 0.0158, 10, 8), S.grip, part);
        add(at(sphere(0.0158, 8, 6), P3(s * 0.149, 0.128, 0.0)), S.grip, part);
      }
      if (sd < 0) add(at(cylZ(0.0048, 0.0048, 0.006, 12), P3(-0.152, 0.112, 0.016)), S.red, part);           // push-to-talk
      add(at(cylZ(0.032, 0.03, 0.01, 24), [x0, y0, PZ + 0.005]), S.rubber);                                  // the boot at the panel
    }
    control({ id: part, label: sd < 0 ? '操縦輪（W / S・A / D）' : '右席の操縦輪（左と連動）', kind: 'handle', part,
      size: YOKE_HIT.hub.slice(0, 3), pos: [x0 + YOKE_HIT.hub[3], y0 + YOKE_HIT.hub[4], z0 + YOKE_HIT.hub[5]],
      more: [-1, 1].map(k => [YOKE_HIT.horn.slice(0, 3), [x0 + k * YOKE_HIT.horn[3], y0 + YOKE_HIT.horn[4], z0 + YOKE_HIT.horn[5]]]), act: () => info('操縦輪：W / S（↑ / ↓）で機首の上げ下げ、A / D（← / →）で傾き') });
  }

  // ============================================================ rudder pedals (left pair, right pair: they move opposite ways)
  PEDAL_X.forEach((x, i) => {
    const part = i % 2 === 0 ? 'pedalsL' : 'pedalsR', tilt = -30 * DEG, c = Math.cos(tilt), sn = Math.sin(tilt);
    const onPad = (u, w) => [x, PEDAL.y + u * c - w * sn, PEDAL.z + u * sn + w * c];   // u up the pad, w off its face
    add(at(rbox(0.082, 0.085, 0.008, 0.003, 1), onPad(-0.012, 0), [tilt, 0, 0]), S.alu, part);
    for (let k = 0; k < 4; k++) add(at(new THREE.BoxGeometry(0.068, 0.006, 0.004), onPad(-0.045 + k * 0.022, 0.005), [tilt, 0, 0]), S.rubber, part);
    add(at(rbox(0.082, 0.045, 0.012, 0.003, 1), onPad(0.058, -0.002), [tilt, 0, 0]), S.steel, part);
    add(at(new THREE.BoxGeometry(0.07, 0.006, 0.004), onPad(0.062, 0.005), [tilt, 0, 0]), S.rubber, part);
    add(tube([[x, PEDAL.y - 0.05, PEDAL.z - 0.02], [x, PEDAL.y - 0.09, PEDAL.z - 0.07], [x, FLOOR + 0.035, PEDAL.z - 0.11]], 0.008, 8, 6), S.steel, part);
  });
  add(at(cylX(0.016, 0.98, 12), [0, FLOOR + 0.035, PEDAL.z - 0.115]), S.steel);
  control({ id: 'pedals', label: 'ラダー ペダル（Q / E）', kind: 'handle', size: [0.30, 0.16, 0.12], pos: [-0.30, PEDAL.y, PEDAL.z], act: () => info('ラダー ペダル：Q / E で踏みます。つま先のブレーキは B / Space') });

  // ============================================================ the seats
  const seat = (x, z, w, front) => {
    // the pan, the cushion with its leather insert, the back reclined 13°, the headrest on two posts
    add(at(rbox(w, 0.11, 0.52, 0.04, 2), [x, -0.21, z], [5 * DEG, 0, 0]), S.seatSide);
    add(at(rbox(w - 0.13, 0.035, 0.44, 0.016, 2), [x, -0.15, z + 0.005], [5 * DEG, 0, 0]), S.seat);
    const bz = z + 0.40, by = 0.17;
    add(at(rbox(w, 0.62, 0.105, 0.045, 2), [x, by, bz], [13 * DEG, 0, 0]), S.seatSide);
    add(at(rbox(w - 0.13, 0.48, 0.03, 0.014, 2), [x, by + 0.01, bz - 0.054], [13 * DEG, 0, 0]), S.seat);
    for (const k of [-1, 1]) add(at(rbox(w - 0.13, 0.008, 0.01, 0.002), [x, by - 0.02 + k * 0.12, bz - 0.067 + k * 0.03], [13 * DEG, 0, 0]), S.seatSide);
    add(at(rbox(0.25, 0.155, 0.085, 0.035, 2), [x, 0.615, bz + 0.06], [8 * DEG, 0, 0]), S.seatSide);
    add(at(rbox(0.19, 0.11, 0.02, 0.009, 2), [x, 0.615, bz + 0.015], [8 * DEG, 0, 0]), S.seat);
    for (const k of [-1, 1]) add(at(new THREE.CylinderGeometry(0.0055, 0.0055, 0.08, 8), [x + k * 0.07, 0.52, bz + 0.05], [13 * DEG, 0, 0]), S.chrome);
    if (front) {
      add(at(rbox(w - 0.06, 0.12, 0.40, 0.01), [x, FLOOR + 0.07, z]), S.black);
      for (const k of [-1, 1]) add(at(rbox(0.03, 0.025, 0.62, 0.002), [x + k * 0.15, FLOOR + 0.012, z - 0.05]), S.alu);
    }
  };
  if (!fromModel('seats')) { seat(-SEAT_X, SEAT.z, SEAT.w, true); seat(SEAT_X, SEAT.z, SEAT.w, true); }     // (without the model)
  // (without the model) the rear bench: two places, one piece
  if (!fromModel('bench')) {
    add(at(rbox(1.0, 0.14, 0.50, 0.04, 2), [0, -0.205, 0.48], [4 * DEG, 0, 0]), S.seatSide);
    for (const x of [-0.25, 0.25]) add(at(rbox(0.32, 0.035, 0.42, 0.015, 2), [x, -0.13, 0.48], [4 * DEG, 0, 0]), S.seat);
    add(at(rbox(1.0, 0.62, 0.11, 0.045, 2), [0, 0.18, 0.86], [16 * DEG, 0, 0]), S.seatSide);
    for (const x of [-0.25, 0.25]) {
      add(at(rbox(0.32, 0.48, 0.03, 0.014, 2), [x, 0.19, 0.80], [16 * DEG, 0, 0]), S.seat);
      add(at(rbox(0.24, 0.14, 0.08, 0.032, 2), [x, 0.60, 0.97], [10 * DEG, 0, 0]), S.seatSide);
    }
  }

  // ============================================================ between the seats: console, flap handle, trim wheel
  add(at(rbox(0.13, 0.13, 0.86, 0.025, 2), [0, FLOOR + 0.065, -0.33]), S.seatSide);
  add(at(rbox(0.05, 0.03, 0.06, 0.008), [0, FLAP.y - 0.012, FLAP.z]), S.black);
  add(tube([[0, FLAP.y, FLAP.z], [0, FLAP.y + 0.004, FLAP.z + 0.15], [0, FLAP.y + 0.006, FLAP.z + 0.32]], 0.009, 10, 8), S.chrome, 'flap');
  add(at(cylZ(0.016, 0.017, 0.11, 16), [0, FLAP.y + 0.006, FLAP.z + 0.36]), S.grip, 'flap');
  add(at(cylZ(0.008, 0.008, 0.01, 12), [0, FLAP.y + 0.006, FLAP.z + 0.418]), S.chrome, 'flap');
  // its hit box: the whole handle (the grip lies beside the seat backs, out of the pilot's sight: one aims at the rod)
  control({ id: 'flaps', label: 'フラップ レバー（V / Shift+V）', kind: 'lever', part: 'flap', size: [0.045, 0.05, 0.42], pos: [0, FLAP.y + 0.006, FLAP.z + 0.215], aim: [0, FLAP.y + 0.004, FLAP.z + 0.14],
    act: (dir, wheel) => {
      const s = cur.s, n = s ? s.A.flapLabels.length : 4, i = s ? s.flapIdx : 0, down = dir > 0;                // up on the handle = more flap
      if (down) return i < n - 1 ? flight('flaps') : info('フラップはいちばん下（40°）です');
      return i > 0 ? flight('flapsUp') : info('フラップは上がっています（UP）');
    } });
  // the trim wheel (rolls fore and aft; forward = nose down), half sunk in the console
  { const g = new THREE.CylinderGeometry(TRIMW.r, TRIMW.r, 0.022, 36).rotateZ(Math.PI / 2);
    add(at(g, [0, TRIMW.y, TRIMW.z]), S.black, 'trim');
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; add(at(new THREE.BoxGeometry(0.024, 0.009, 0.006), [0, TRIMW.y + Math.sin(a) * TRIMW.r, TRIMW.z + Math.cos(a) * TRIMW.r], [-a, 0, 0]), i % 6 === 0 ? S.white : S.grip, 'trim'); }
    add(at(rbox(0.05, 0.012, 0.18, 0.004), [0, FLOOR + 0.132, TRIMW.z]), S.black);
    // on the console's top, on the pilot's side of the wheel
    label(['NOSE', 'DN'], [-0.033, FLOOR + 0.1305, TRIMW.z - 0.07], { size: 1.9, r: [-Math.PI / 2, 0, 0] });
    label(['NOSE', 'UP'], [-0.033, FLOOR + 0.1305, TRIMW.z + 0.07], { size: 1.9, r: [-Math.PI / 2, 0, 0] });
    // (its hit box stays put: the wheel turns about its own axle, the part above the console is always there)
    control({ id: 'trim', label: 'トリム ホイール（前へ回すと機首下げ）', kind: 'lever', size: [0.04, 0.06, 0.16], pos: [0, TRIMW.y + 0.04, TRIMW.z], aim: [0, TRIMW.y + TRIMW.r - 0.004, TRIMW.z], act: (dir) => flight('trimStep', dir >= 0 ? -1 : 1) });
  }

  // ============================================================ the fuel selector (left wall, low)
  { const x = -lowX(-0.13) + 0.004, y = -0.13, z = -1.0, r = [0, Math.PI / 2, 0];
    add(at(new THREE.CircleGeometry(0.0298, 28), [x - 0.0004, y, z], r), { ...S.black, r: 0.45 });
    decal(62, 62, (g, w, h) => {
      g.lineWidth = w * 0.012; g.beginPath(); g.arc(w / 2, h / 2, w * 0.45, 0, Math.PI * 2); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${w * 0.085}px ${SANS}`;
      g.save(); g.translate(w / 2, h / 2);
      for (const [t, a] of [['L TANK', -50], ['R TANK', 50], ['OFF', 180]]) { g.save(); g.rotate(a * DEG); g.fillText(t, 0, -h * 0.33); g.restore(); }
      g.restore(); g.font = `700 ${w * 0.07}px ${SANS}`; g.fillText('FUEL', w / 2, h * 0.72); g.font = `600 ${w * 0.05}px ${SANS}`; g.fillText('24 GAL USABLE EACH', w / 2, h * 0.80);
    }, [x, y, z], r, { lit: 0, col: 0xdcdcd6 });
    add(at(cylX(0.011, 0.008, 16), [x + 0.004, y, z]), S.black, 'fuel');
    add(at(rbox(0.012, 0.062, 0.016, 0.005), [x + 0.012, y + 0.015, z]), S.black, 'fuel');
    add(at(rbox(0.008, 0.016, 0.01, 0.003), [x + 0.012, y + 0.044, z]), S.white, 'fuel');
    control({ id: 'fuelSel', label: '燃料セレクター（左 / 右 / OFF）', kind: 'switch', part: 'fuel', size: [0.03, 0.08, 0.04], pos: [x + 0.012, y + 0.015, z],
      act: (dir, wheel) => {
        // a click: the other tank; the wheel: L → R → OFF and back
        const i = FUEL.indexOf(switches.fuelSel), v = wheel ? FUEL[clamp(i + (dir > 0 ? 1 : -1), 0, FUEL.length - 1)] : (switches.fuelSel === 'L' ? 'R' : 'L');
        return v === switches.fuelSel ? null : { type: 'select', id: 'fuelSel', value: v };
      } });
  }

  // ============================================================ the door (right), its handle and latch
  { const x = HW - 0.004, D = { z0: -1.20, z1: -0.13, y0: -0.30 };
    // its outline (dark seams following the wall), the upholstered panel inside it, the map pocket
    const seam = (y0, y1, z0, z1) => add(sheet((u, v, o) => { const y = y0 + (y1 - y0) * v; o.set(lowX(y) - 0.0035, y, z0 + (z1 - z0) * u); }, 1, 6), { ...S.wallDark, c: 0x2c2a28, ao: 0.6 });
    seam(D.y0, SILL, D.z0 - 0.003, D.z0 + 0.003); seam(D.y0, SILL, D.z1 - 0.003, D.z1 + 0.003); seam(D.y0 - 0.003, D.y0 + 0.003, D.z0, D.z1);
    add(at(rbox(0.02, 0.10, 0.34, 0.006), [lowX(-0.15) - 0.011, -0.15, -0.86]), { ...S.arm, c: 0x55504b });
    add(at(rbox(0.03, 0.022, 0.12, 0.006), [x - 0.02, 0.27, -0.76]), S.chrome);
    add(at(rbox(0.012, 0.016, 0.03, 0.004), [x - 0.012, 0.27, -0.685]), S.black);
    add(at(rbox(0.022, 0.03, 0.09, 0.006), [bandX(0.72) - 0.02, 0.715, -0.98]), S.chrome);
    label(['DOOR', 'LATCH'], [x - 0.0005, 0.302, -0.76], { size: 1.8, r: [0, -Math.PI / 2, 0], lit: 0 });
    control({ id: 'door', label: 'ドア ハンドル（降りる）', kind: 'handle', size: [0.05, 0.05, 0.16], pos: [x - 0.02, 0.27, -0.74], act: () => ({ type: 'exit' }) });
  }

  // ============================================================ the wet compass on the windshield's centre post, the sun visors
  { const [cx, cy, cz] = COMPASS;
    // the case: its body round the back of the card, and its face with the window the card is read through
    const [bw, bh, bd, bx, by, bz] = CASE.body, [hw, hh, hd, hx, hy, hz] = CASE.hanger;
    add(at(rbox(bw, bh, bd, 0.008, 2), [cx + bx, cy + by, cz + bz]), S.caseBlack);
    add(slab(rectPts(cx - 0.032, cy - 0.028, cx + 0.032, cy + 0.028), 0.008, [[rectPts(cx - 0.025, cy - 0.0145, cx + 0.025, cy + 0.0145), 0.004]], 0.019, cz + 0.025, 0.002, 3, 1), S.caseBlack);
    add(at(rbox(hw, hh, hd, 0.002), [cx + hx, cy + hy, cz + hz]), S.caseBlack);
    const card = new THREE.CylinderGeometry(0.024, 0.024, 0.014, 48, 1, true);
    const it = atlas.add(151, 14, compassCard), cg = card.toNonIndexed(), a = cg.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i), a.getY(i));
    cg.userData = { it }; cg.deleteAttribute('normal'); cg.computeVertexNormals();
    B.cardGeo = at(cg, [cx, cy, cz]);
    B.glass.push(at(new THREE.PlaneGeometry(0.05, 0.03), [cx, cy, cz + 0.0235]));
    decal(2, 26, (g, w, h) => { g.fillRect(w * 0.3, 0, w * 0.4, h); }, [cx, cy, cz + 0.0238], null, { lit: 1, col: 0xf2f2ee });
    // the deviation card under it: FOR (the heading wanted) / STEER (what the compass shows then)
    const cardY = cy - 0.0285 - 0.0105;
    add(at(new THREE.PlaneGeometry(0.046, 0.021), [cx, cardY, cz + 0.0218]), { c: 0xe4e1d9, r: 0.35 });
    decal(46, 21, (g, w, h) => {
      const rows = [0.2, 0.42, 0.64, 0.86], cx0 = 0.28, dx = 0.125;
      const steer = [2, 31, 59, 88, 119, 151, 182, 211, 240, 269, 300, 331];
      g.textBaseline = 'middle'; g.textAlign = 'left'; g.font = `700 ${h * 0.13}px ${SANS}`;
      ['FOR', 'STEER', 'FOR', 'STEER'].forEach((t, i) => g.fillText(t, w * 0.025, h * rows[i], w * 0.16));
      g.textAlign = 'center'; g.font = `700 ${h * 0.16}px ${SANS}`;
      ['N', '30', '60', 'E', '120', '150', 'S', '210', '240', 'W', '300', '330'].forEach((t, i) => {
        const x = w * (cx0 + (i % 6) * dx), r = i < 6 ? 0 : 2;
        g.fillText(t, x, h * rows[r], w * 0.11); g.fillText(String(steer[i]).padStart(3, '0'), x, h * rows[r + 1], w * 0.11);
      });
      g.fillRect(0, h * 0.53, w, Math.max(1, h * 0.02)); g.fillRect(w * 0.205, 0, Math.max(1, w * 0.008), h);
    }, [cx, cardY, cz + 0.0221], null, { lit: 0, rough: 0.3, col: 0x151515 });
    control({ id: 'compass', label: '磁気コンパス', kind: 'button', size: [0.07, 0.07, 0.07], pos: [cx, cy, cz], act: () => info('磁気コンパス：機首の磁方位（PFD が使えないときの予備）') });
  }
  function compassCard(g, w, h) {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let d = 0; d < 360; d += 5) {
      const u = 1 - d / 360, x = (u % 1) * w, big = d % 30 === 0;
      g.lineWidth = Math.max(1, w / 400); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h * (big ? 0.34 : d % 10 === 0 ? 0.26 : 0.18)); g.stroke();
      if (big) { g.font = `700 ${h * 0.5}px ${SANS}`; const t = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d] || String(d / 10); g.fillText(t, x, h * 0.68); if (x < 20) g.fillText(t, x + w, h * 0.68); }
    }
  }
  if (!fromModel('headliner')) for (const sd of [-1, 1]) {      // (without the model) the sun visors
    add(at(rbox(0.29, 0.012, 0.14, 0.006), [sd * 0.25, roofY(sd * 0.25) - 0.03, -0.70], [-12 * DEG, 0, 0]), S.trim);
    add(at(cylX(0.005, 0.27, 8), [sd * 0.25, roofY(sd * 0.25) - 0.022, -0.77]), S.steel);
  }
  // the overhead console: two fresh-air eyeballs and the dome light
  add(at(rbox(...CONSOLE.size, 0.012), CONSOLE.pos), S.trim);
  for (const sx of [-0.04, 0.04]) { add(at(cylY(0.016, 0.015, 0.008, 18), [sx, ROOF - 0.027, -0.62]), S.black); add(at(sphere(0.011, 12, 8), [sx, ROOF - 0.031, -0.62]), S.knob); }
  add(at(rbox(0.07, 0.008, 0.04, 0.003), [0, ROOF - 0.027, -0.40]), S.lens);

  // ============================================================ the glass: windshield and side windows (no shadows, no AO)
  B.glass.push(sheet((u, v, o) => { const y = WS.y0 + (WS.y1 - WS.y0) * v, x = (-1 + 2 * u) * (bandX(y) + 0.006); o.set(x, y, wsZ(x, y) - 0.004); }, 16, 6, true));
  for (const sd of [-1, 1]) {
    for (const [w] of WINDOWS) {
      const sh = rounded(new THREE.Shape(), w.map(([z, y]) => [z, y]), 0.03), g = new THREE.ShapeGeometry(sh, 6), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const z = p.getX(i), y = p.getY(i); p.setXYZ(i, sd * (bandX(y) + 0.016), y, z); }
      g.computeVertexNormals(); B.glass.push(g);
    }
  }

  // ============================================================ the cowling seen over the glareshield
  B.cowl.push(sheet((u, v, o) => {
    const zr = -1.31, zn = -3.22, z = zr + (zn - zr) * v;
    const yTop = 0.418 - 0.07 * Math.pow(v, 1.8), w = 0.552 - 0.22 * Math.pow(v, 2.4), h = 0.2 - 0.05 * v, yc = yTop - h;
    // u: down the right side, over the top, down the left side
    const side = 0.12, y0 = -0.25;
    let x, y;
    if (u < side) { const t = u / side; x = w; y = y0 + (yc - y0) * t; }
    else if (u > 1 - side) { const t = (u - 1 + side) / side; x = -w; y = yc + (y0 - yc) * t; }
    else { const ph = (u - side) / (1 - 2 * side) * Math.PI, c = Math.cos(ph), s = Math.sin(ph); x = w * Math.sign(c) * Math.pow(Math.abs(c), 0.45); y = yc + h * Math.pow(s, 0.32); }
    const zb = wsZ(x, WS.y0) - 0.01; o.set(x, y, zb + (zn - zb) * v + 0 * z);
  }, 32, 20, true));
  // (M6) the Seminole's nose (no engine in it): tools/aircraft/build_seminole.py's stations (z, belt half-width W at
  // yc, shoulder Ws at ys, crown yt), moved into this frame with the cockpit (0.2 m aft, 0.04 up), to its point
  if (twinA) {
    const K = [[-1.5, 0.595, 0.16, 0.505, 0.34, 0.425], [-1.9, 0.57, 0.11, 0.475, 0.29, 0.38], [-2.4, 0.5, 0.07, 0.405, 0.22, 0.31], [-2.8, 0.4, 0.04, 0.31, 0.16, 0.23],
      [-3.1, 0.27, 0.015, 0.205, 0.1, 0.15], [-3.25, 0.16, 0, 0.12, 0.06, 0.09], [-3.33, 0.06, -0.01, 0.045, 0.02, 0.03]];
    const nose = (z) => {
      let i = 0; while (i < K.length - 2 && z < K[i + 1][0]) i++;
      const a = K[i], b = K[i + 1], t = clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
      return a.map((x, k) => x + (b[k] - x) * t);
    };
    B.cowl.push(sheet((u, v, o) => {
      const side = 0.16, e = 2 / 2.3;
      // (twice: the base follows the windshield's curved base, so z depends on x, and the section on z)
      let x = 0, y = 0, z = -1.3;
      for (let pass = 0; pass < 3; pass++) {
        const zb = wsZ(clamp(x, -0.55, 0.55), WS.y0) - 0.01; z = zb + (-3.12 - zb) * v;
        const [, W, yc, Ws, ys, yt] = nose(z - 0.2);
        if (u < side) { const t = u / side; x = W + (Ws - W) * t; y = yc + (ys - yc) * t; }
        else if (u > 1 - side) { const t = (u - 1 + side) / side; x = -(Ws + (W - Ws) * t); y = ys + (yc - ys) * t; }
        else { const ph = (u - side) / (1 - 2 * side) * Math.PI, c = Math.cos(ph), sn = Math.sin(ph); x = Ws * Math.sign(c) * Math.pow(Math.abs(c), e); y = ys + (yt - ys) * Math.pow(sn, e); }
      }
      o.set(x, y + 0.04, z);
    }, 32, 22, true));
  }

  // ============================================================ assemble: occlusion, merging, textures, materials
  const cache = new Map();
  for (const g of [...B.kit, ...B.kitV.pa28, ...B.kitV.pa44]) bakeAO(g, cache);
  for (const list of B.moving.values()) for (const g of list) bakeAO(g, cache);
  for (const g of [...B.decals, ...B.decalsV.pa28, ...B.decalsV.pa44]) bakeAO(g, cache);
  for (const g of B.dynLit) bakeAO(g, cache);

  const root = new THREE.Group(); root.name = 'cockpit';
  const cabin = new THREE.Group(); cabin.name = 'cockpit-cabin';
  const off = [A.eye[0] - EYE0[0], A.eye[1] - EYE0[1], A.eye[2] - EYE0[2]];       // another type's eye: the same cabin round it
  cabin.position.set(off[0], off[1], off[2]);
  root.add(cabin);
  const meshes = [], mats = [], texs = [];
  const mesh = (geo, mat, name, { cast = true, receive = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = receive; meshes.push(m); return m; };
  const kitMat = kitMaterial(); mats.push(kitMat);
  cabin.add(mesh(mergeGeometries(B.kit), kitMat, 'cockpit-shell'));

  // the atlas (labels and placards), the compass card's uv into it
  atlas.pack();
  const atlasCv = makeCanvas ? makeCanvas(atlas.W, atlas.H) : null;
  if (atlasCv) atlas.render(atlasCv);
  let atlasTex = null;
  if (atlasCv) {
    atlasTex = new THREE.CanvasTexture(atlasCv); atlasTex.format = THREE.RedFormat; atlasTex.colorSpace = THREE.NoColorSpace;
    atlasTex.generateMipmaps = true; atlasTex.minFilter = THREE.LinearMipmapLinearFilter; atlasTex.anisotropy = opts.anisotropy || 8; texs.push(atlasTex);
  }
  for (const g of [...B.decals, ...B.decalsV.pa28, ...B.decalsV.pa44]) { const uv = atlas.uv(g.userData.it), a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1])); }
  const decalMat = decalMaterial(atlasTex, 'labels'); mats.push(decalMat);
  const decalMesh = mesh(mergeGeometries(B.decals), decalMat, 'cockpit-labels', { cast: false }); decalMesh.renderOrder = 1; decalMesh.userData.noAO = true;
  cabin.add(decalMesh);
  // (M6) each type's own: its shell parts and its labels (the throttle quadrant, the placards; the Seminole's gear)
  const VG = { pa28: new THREE.Group(), pa44: new THREE.Group() };
  VG.pa28.name = 'cockpit-pa28'; VG.pa44.name = 'cockpit-pa44'; VG.pa44.visible = false;
  cabin.add(VG.pa28, VG.pa44);
  for (const t of ['pa28', 'pa44']) {
    if (B.kitV[t].length) VG[t].add(mesh(mergeGeometries(B.kitV[t]), kitMat, 'cockpit-shell-' + t));
    if (B.decalsV[t].length) { const m = mesh(mergeGeometries(B.decalsV[t]), decalMat, 'cockpit-labels-' + t, { cast: false }); m.renderOrder = 1; m.userData.noAO = true; VG[t].add(m); }
  }

  // glass
  const glassMat = clearGlassMaterial({ tint: 0x0b1216, env: 1.2 }); mats.push(glassMat);
  const glassGeo = mergeGeometries(B.glass.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; }));
  const glassMesh = mesh(glassGeo, glassMat, 'cockpit-glass', { cast: false, receive: false }); glassMesh.renderOrder = 2; glassMesh.userData.noAO = true;
  cabin.add(glassMesh);
  // cowling (the Archer's); the Seminole's nose
  const cowlMat = cowlMaterial(); mats.push(cowlMat);
  VG.pa28.add(mesh(B.cowl[0].toNonIndexed(), cowlMat, 'cockpit-cowl'));
  if (twinA) { const noseMat = cowlMaterial(true); mats.push(noseMat); VG.pa44.add(mesh(B.cowl[1].toNonIndexed(), noseMat, 'cockpit-nose')); }

  // the displays and the small instrument canvas
  const glassPanel = createGlass(FL, makeCanvas);
  const pfdMat = screenMaterial(glassPanel.pfd ? glassPanel.pfd.texture : null), mfdMat = screenMaterial(glassPanel.mfd ? glassPanel.mfd.texture : null);
  const dynTex = glassPanel.dyn ? glassPanel.dyn.texture : null;
  const unlitMat = screenMaterial(dynTex, true);
  const dynLitMat = dialMaterial(dynTex);
  mats.push(pfdMat, mfdMat, unlitMat, dynLitMat);
  if (glassPanel.pfd) glassPanel.setAnisotropy(opts.anisotropy || 8);
  screens.pfd = mesh(scr.pfd[0], pfdMat, 'cockpit-pfd', { cast: false });
  screens.mfd = mesh(scr.mfd[0], mfdMat, 'cockpit-mfd', { cast: false });
  cabin.add(screens.pfd, screens.mfd);
  // the label strips, the black band over them and the audio panel's lamps: one unlit mesh with vertex colours (lamps
  // change colour); (M6) the Seminole's gear lights in one of its own, hidden with its other parts in the Archer's view
  const unlitMesh = (lead, list, name) => {
    const geos = [...lead, ...list].map(g => { const n = g.attributes.position.count, c = new Float32Array(n * 3).fill(g.userData.black ? 0 : 1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); if (!g.attributes.normal) g.computeVertexNormals(); return g; });
    const m = mesh(mergeGeometries(geos), unlitMat, name, { cast: false }), firstOf = [];
    let vOff = lead.reduce((a, g) => a + g.attributes.position.count, 0);
    for (const g of list) { firstOf.push(vOff); vOff += g.attributes.position.count; }
    for (const l of lamps) if (l.list === list) { l.col = m.geometry.attributes.color; l.first = firstOf[l.index]; l.count = list[l.index].attributes.position.count; }
    return m;
  };
  const dialMesh = mesh(mergeGeometries(B.dynLit), dynLitMat, 'cockpit-dials', { cast: false });
  cabin.add(unlitMesh(strips, B.unlit, 'cockpit-lit'), dialMesh);
  for (const t of ['pa28', 'pa44']) if (B.unlitV[t].length) VG[t].add(unlitMesh([], B.unlitV[t], 'cockpit-lit-' + t));

  // moving parts: each in a group at its pivot (the geometry was built in place)
  const PIV = {
    yokeL: [-YOKE.x, YOKE.y, YOKE.z], yokeR: [YOKE.x, YOKE.y, YOKE.z], pedalsL: [0, 0, 0], pedalsR: [0, 0, 0],
    throttle: [-0.005, LEVER.y, LEVER.z], mixture: [0.045, LEVER.y, LEVER.z], carb: [-0.05, LEVER.y, LEVER.z],
    ...Object.fromEntries(Object.entries(TWIN_LV).map(([k, x]) => [k, [x, LEVER.y, LEVER.z]])), gearLever: [GEAR.x, GEAR.y, PZ],
    flap: [0, FLAP.y, FLAP.z], trim: [0, TRIMW.y, TRIMW.z], key: [KEYSW[0], KEYSW[1], PZ], fuel: [-lowX(-0.13) + 0.004, -0.13, -1.0], brake: [-0.135, 0.036, PZ - 0.012],
  };
  const parts = {}, CASTS = new Set(['yokeL', 'yokeR', 'throttle', 'mixture', 'flap', 'thrL', 'thrR']);   // the small ones cast no shadow
  for (const [name, list] of B.moving) {
    if (!PIV[name]) throw new Error('cockpit: no pivot for the moving part ' + name);
    const p = PIV[name], g = mergeGeometries(list); g.translate(-p[0], -p[1], -p[2]);
    const grp = new THREE.Group(); grp.name = 'cockpit-' + name; grp.position.set(p[0], p[1], p[2]);
    grp.add(mesh(g, kitMat, 'cockpit-' + name, { cast: CASTS.has(name) }));
    (B.partV.has(name) ? VG[B.partV.get(name)] : cabin).add(grp); parts[name] = grp;
  }
  // the compass card (labels material, turns about y)
  { const uv = atlas.uv(B.cardGeo.userData.it), a = B.cardGeo.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
    withCol(withMat(B.cardGeo, 0.5, 0, 1, 0.55), 0xf0efe8); B.cardGeo.translate(-COMPASS[0], -COMPASS[1], -COMPASS[2]);
    const grp = new THREE.Group(); grp.position.set(COMPASS[0], COMPASS[1], COMPASS[2]); grp.name = 'cockpit-compass';
    const cm = mesh(B.cardGeo, decalMaterial(atlasTex, 'card', 0x121212), 'cockpit-compass-card', { cast: false }); mats.push(cm.material);
    grp.add(cm); cabin.add(grp); parts.compass = grp;
  }
  // the rocker switches: one instanced mesh (the master red, the rest black)
  const RK0 = [ROCKER.x0 + 4 * ROCKER.dx, ROCKER.y, PZ + 0.0045];
  B.add(at(rbox(0.0145, 0.026, 0.008, 0.003, 1), RK0), { c: 0xffffff, r: 0.38 });
  const rkGeo = B.kit.pop();
  bakeAO(rkGeo, cache); rkGeo.translate(-RK0[0], -RK0[1], -RK0[2]);
  const rockers = new THREE.InstancedMesh(rkGeo, kitMat, ROCKERS.length);
  rockers.name = 'cockpit-rockers'; rockers.castShadow = false; rockers.receiveShadow = true; meshes.push(rockers);
  const red = new THREE.Color(S.red.c), blk = new THREE.Color(0x1f2023);
  ROCKERS.forEach(([id], i) => rockers.setColorAt(i, id === 'master' ? red : blk));
  cabin.add(rockers);

  // the hit meshes: on their moving part, or on the cabin; the aim points in the cockpit's (root's) frame
  for (const c of controls) { c.at.x += off[0]; c.at.y += off[1]; c.at.z += off[2]; }
  for (const h of hits) {
    if (h.part && parts[h.part]) { const p = PIV[h.part]; h.mesh.position.x -= p[0]; h.mesh.position.y -= p[1]; h.mesh.position.z -= p[2]; parts[h.part].add(h.mesh); }
    else hitRoot.add(h.mesh);
  }
  cabin.add(hitRoot);

  // ============================================================ the instructor's seat (right): where his hips, ankles and eyes go
  const v3 = (x, y, z) => [x + off[0], y + off[1], z + off[2]];
  const instructorSeat = { hip: v3(...INSTRUCTOR.hip), ankleL: v3(0.21, -0.25, -1.06), ankleR: v3(0.39, -0.25, -1.06), eye: v3(0.30, 0.625, -0.40), yaw: Math.PI, seatY: INSTRUCTOR.seatY + off[1] };

  let triangles = 0;
  // (the Archer's view: the Seminole's own parts are hidden then; trianglesTwin the Seminole's)
  let trianglesTwin = 0;
  const inType = (m, g) => { for (let o = m; o; o = o.parent) if (o === g) return true; return false; };
  for (const m of meshes) {
    const n = (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1);
    if (!inType(m, VG.pa44)) triangles += n;
    if (!inType(m, VG.pa28)) trianglesTwin += n;
  }

  // what update() works with (made here, once)
  const RK_POS = new THREE.Vector3(), RK_Q = new THREE.Quaternion(), RK_M = new THREE.Matrix4(), RK_E = new THREE.Euler();
  const lastSw = new Array(ROCKERS.length).fill(null);
  const avSeen = { pfdMenu: '', wind: null, baroUnit: '', mfdPage: '', north: null, mic: '', c1: null, c2: null, n1: null, n2: null, powered: null, cdi: '' };
  const lampCols = [...new Set(lamps.map(l => l.col))];     // (the colours of the unlit meshes the lamps are in)
  const comp = { a: 0, v: 0, init: false };
  const t = { pfd: 1, mfd: 1, stby: 1 };
  const RATE = { pfd: 1 / 30, mfd: 1 / 10, stby: 1 / 15 };
  let visible = true, flapAng = 0, night = -1, type = 'pa28', gearSeen = -1;

  // ================================================================ per frame (no allocation below this line)
  function avChanged(av, powered) {
    const a = av.audio, m = a.monitor;
    if (avSeen.pfdMenu === av.pfdMenu && avSeen.wind === av.wind && avSeen.baroUnit === av.baroUnit && avSeen.mfdPage === av.mfdPage && avSeen.north === av.mapNorthUp
      && avSeen.mic === a.mic && avSeen.c1 === m.COM1 && avSeen.c2 === m.COM2 && avSeen.n1 === m.NAV1 && avSeen.n2 === m.NAV2 && avSeen.powered === powered && avSeen.cdi === av.cdi) return false;
    avSeen.pfdMenu = av.pfdMenu; avSeen.wind = av.wind; avSeen.baroUnit = av.baroUnit; avSeen.mfdPage = av.mfdPage; avSeen.north = av.mapNorthUp;
    avSeen.mic = a.mic; avSeen.c1 = m.COM1; avSeen.c2 = m.COM2; avSeen.n1 = m.NAV1; avSeen.n2 = m.NAV2; avSeen.powered = powered; avSeen.cdi = av.cdi;
    return true;
  }
  function lampOn(key, av) {
    if (key && key.startsWith('gear')) {                       // (the Seminole's: three green when down and locked, red in transit)
      const g = cur.s ? (cur.s.gearPos ?? 1) : 1;
      return key === 'gearRed' ? g > 0.001 && g < 0.999 : g >= 0.999;
    }
    if (!key || !av) return false;
    const a = av.audio;
    if (key === 'micCOM1') return a.mic === 'COM1';
    if (key === 'micCOM2') return a.mic === 'COM2';
    if (key === 'monCOM1') return !!a.monitor.COM1;
    if (key === 'monCOM2') return !!a.monitor.COM2;
    if (key === 'monNAV1') return !!a.monitor.NAV1;
    return key === 'monNAV2' && !!a.monitor.NAV2;
  }
  function setLamps(av, powered) {
    for (let i = 0; i < lamps.length; i++) {
      const l = lamps[i], c = l.col, on = (powered || (l.key && l.key.startsWith('gear') && switches.master)) && lampOn(l.key, av);
      if (l.key === 'gearRed') { for (let k = 0; k < l.count; k++) c.setXYZ(l.first + k, on ? 1.0 : 0.05, on ? 0.12 : 0.02, on ? 0.08 : 0.02); continue; }
      for (let k = 0; k < l.count; k++) c.setXYZ(l.first + k, on ? 0.35 : 0.035, on ? 1.0 : 0.04, on ? 0.45 : 0.035);
    }
    for (let i = 0; i < lampCols.length; i++) lampCols[i].needsUpdate = true;
  }
  function poseRockers() {
    let changed = false;
    for (let i = 0; i < ROCKERS.length; i++) {
      const on = !!switches[ROCKERS[i][0]];
      if (lastSw[i] === on) continue;
      lastSw[i] = on; changed = true;
      RK_E.set(on ? -ROCKER.tilt : ROCKER.tilt, 0, 0); RK_Q.setFromEuler(RK_E);
      RK_POS.set(ROCKER.x0 + i * ROCKER.dx, ROCKER.y, PZ + 0.0045);
      rockers.setMatrixAt(i, RK_M.compose(RK_POS, RK_Q, _one));
    }
    if (changed) rockers.instanceMatrix.needsUpdate = true;
  }
  // dt (s); o: { s, L, av (default L.av), parkBrake, night 0..1, eng: { rpm, run } (the engine as the systems have it, for
  // the MFD's tachometer; default the physics') }
  function update(dt, o) {
    if (!o) return;
    if (!(dt >= 0)) dt = 0; else if (dt > 0.25) dt = 0.25;
    const s = o.s || null, av = o.av || (o.L ? o.L.av : null);
    cur.s = s; cur.av = av; cur.L = o.L || null;
    poseRockers();
    const nt = clamp(o.night || 0, 0, 1);
    if (nt !== night) {
      night = nt;
      decalMat.emissiveIntensity = 0.7 * nt; dynLitMat.emissiveIntensity = 0.04 + 0.6 * nt;
      pfdMat.color.setScalar(1 - 0.45 * nt); mfdMat.color.setScalar(1 - 0.45 * nt); unlitMat.color.setScalar(1 - 0.35 * nt);
    }
    if (!s) return;
    // the controls: the yokes ride fore and aft with the stabilator (elevator + trim; aft = nose up) and turn with
    // the ailerons; the pedals with the rudder after the auto-rudder; the levers, the flap handle (eased between its
    // detents), the trim wheel, the key, the fuel selector, the park brake handle
    const pc = clamp((s.elev || 0) + (s.trim || 0), -1, 1), roll = -clamp(s.ail || 0, -1, 1) * YOKE.roll;
    parts.yokeL.position.z = YOKE.z + pc * YOKE.travel; parts.yokeL.rotation.z = roll;
    parts.yokeR.position.z = YOKE.z + pc * YOKE.travel; parts.yokeR.rotation.z = roll;
    const rud = clamp((s.rudEff != null ? s.rudEff : s.rud) || 0, -1, 1);
    parts.pedalsL.position.z = rud * PEDAL.travel; parts.pedalsR.position.z = -rud * PEDAL.travel;
    const thrA = -(LEVER.idle + (LEVER.full - LEVER.idle) * clamp(s.thr || 0, 0, 1)), mixA = -(LEVER.idle + (LEVER.full - LEVER.idle) * clamp(switches.mixture, 0, 1));
    const carbA = -(switches.carbHeat ? LEVER.full : LEVER.idle + 0.15);
    if (type === 'pa44' && parts.thrL) {
      // the Seminole's pairs; the propeller levers pulled back and pushed forward again while they are cycled; the gear
      // selector up or down, its lights (three green: down and locked; red: in transit)
      const pc = switches.propCycleT > 0 ? Math.sin(Math.PI * clamp(1 - switches.propCycleT / 2.6, 0, 1)) : 0;
      const propA = -(LEVER.full - (LEVER.full - LEVER.idle) * 0.85 * pc);
      parts.thrL.rotation.x = thrA; parts.thrR.rotation.x = thrA; parts.mixL.rotation.x = mixA; parts.mixR.rotation.x = mixA;
      parts.propL.rotation.x = propA; parts.propR.rotation.x = propA; parts.carbL.rotation.x = carbA; parts.carbR.rotation.x = carbA;
      parts.gearLever.rotation.x = s.gearDown === false ? GEAR.up : GEAR.down;
      const g = s.gearPos ?? 1, code = (switches.master ? 1 : 0) + (g >= 0.999 ? 2 : g <= 0.001 ? 4 : 8);
      if (code !== gearSeen) { gearSeen = code; setLamps(av, !!(switches.master && switches.avionics)); }
    } else {
      parts.throttle.rotation.x = thrA; parts.mixture.rotation.x = mixA; parts.carb.rotation.x = carbA;
    }
    const fi = clamp(s.flapIdx | 0, 0, FLAP.det.length - 1);
    flapAng += (FLAP.det[fi] - flapAng) * (1 - Math.exp(-dt * 12));
    parts.flap.rotation.x = -flapAng;
    parts.trim.rotation.x = (s.trim || 0) / P.TRIM_MAX * TRIMW.turns * Math.PI * 2;
    parts.key.rotation.z = -MAG_ANG[Math.max(0, MAG.indexOf(switches.mag))];
    parts.fuel.rotation.x = FUEL_ANG[switches.fuelSel] || 0;
    parts.brake.rotation.x = o.parkBrake ? -38 * DEG : 0;
    // the wet compass: the card follows the magnetic heading, a little behind and swinging (damped)
    const mag = ((s.out.hdgTrue || 0) + P.MAGVAR_W) * DEG;
    if (!comp.init) { comp.a = mag; comp.v = 0; comp.init = true; }
    let da = mag - comp.a; da -= Math.round(da / (Math.PI * 2)) * Math.PI * 2;
    for (let left = dt; left > 1e-9; left -= 0.02) {
      const h = Math.min(left, 0.02);
      comp.v += (da * 9 - comp.v * 3.6) * h; comp.a += comp.v * h; da -= comp.v * h;
    }
    parts.compass.rotation.y = comp.a;
    // the displays: on a schedule, only when seen; black without power
    if (!visible) return;
    const powered = !!(switches.master && switches.avionics);
    t.pfd += dt; t.mfd += dt; t.stby += dt;
    if (av && avChanged(av, powered)) {
      glassPanel.drawStrips(av, powered); setLamps(av, powered);
      if (!powered) { glassPanel.blankScreen('pfd'); glassPanel.blankScreen('mfd'); }
      t.pfd = RATE.pfd; t.mfd = RATE.mfd;
    }
    if (powered && av) {
      if (t.pfd >= RATE.pfd - 1e-6) { t.pfd = Math.min(t.pfd - RATE.pfd, RATE.pfd); glassPanel.drawScreen('pfd', s, av, o.eng); }
      if (t.mfd >= RATE.mfd - 1e-6) { t.mfd = Math.min(t.mfd - RATE.mfd, RATE.mfd); glassPanel.drawScreen('mfd', s, av, o.eng); }
    }
    if (t.stby >= RATE.stby - 1e-6) {
      t.stby = Math.min(t.stby - RATE.stby, RATE.stby);
      const baro = av ? av.baro : s.qnh;
      glassPanel.drawStandby(s.out, AV.indicatedAlt(s.out.altTrue || 0, s.qnh, baro), baro, !!(av && av.baroUnit === 'HPA'), s.A.v);
    }
  }
  // ================================================================ end of the per-frame code

  // where to aim at a control now (world): its aim point, carried by its moving part
  function aimPoint(ctl, out) { return out.copy(ctl.aimLocal).applyMatrix4(ctl.target.matrixWorld); }
  function pick(raycaster) {
    if (!visible) return null;                                // (the raycaster sees hidden objects: not in the chase view)
    const mask = raycaster.layers.mask;
    raycaster.layers.set(PICK_LAYER);
    const out = raycaster.intersectObject(cabin, true);
    raycaster.layers.mask = mask;
    for (const h of out) { const c = h.object.userData.control; if (c && (!c.type || c.type === type)) return c; }
    return null;
  }
  // (M6) the type the cockpit is in: the Archer's quadrant and cowling, or the Seminole's levers, gear and nose
  const byType = { pa28: controls.filter(c => c.type !== 'pa44'), pa44: controls.filter(c => c.type !== 'pa28') };
  function setType(t) {
    if (t === 'pa44' && !twinA) t = 'pa28';
    type = t; VG.pa28.visible = t === 'pa28'; VG.pa44.visible = t === 'pa44'; gearSeen = -1; avSeen.powered = null;
  }
  poseRockers();
  const bytes = glassPanel.bytes + (atlasCv ? Math.round(atlas.W * atlas.H * 4 / 3) : 0);      // the atlas: one byte a texel, mipmapped
  return {
    root, eye: new THREE.Vector3(A.eye[0], A.eye[1], A.eye[2]), instructorSeat, screens, switches, parts, pick, aimPoint, update, setType, band,
    get controls() { return byType[type]; }, get type() { return type; }, allControls: controls,
    setVisible(v) { visible = !!v; root.visible = visible; if (visible) { avSeen.powered = null; t.pfd = RATE.pfd; t.mfd = RATE.mfd; t.stby = RATE.stby; } },
    get visible() { return visible; },
    markDirty() { avSeen.powered = null; },
    setAnisotropy(n) { glassPanel.setAnisotropy(n); if (atlasTex) { atlasTex.anisotropy = n; atlasTex.needsUpdate = true; } },
    triangles, trianglesTwin, meshes, textureBytes: bytes, atlasFull: atlas.full, atlasUsed: atlas.used, atlasScale: atlas.k, stats: glassPanel.stats,
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      rockers.dispose();                                     // (its instance buffers)
      for (const g of hitGeos) g.dispose();
      for (const m of mats) m.dispose();
      hitMat.dispose(); glassPanel.dispose(); for (const tx of texs) tx.dispose();
      root.removeFromParent();
    },
  };
}
