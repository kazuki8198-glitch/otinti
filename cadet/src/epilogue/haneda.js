// CADET — epilogue/haneda.js : the epilogue's place (M8): a gate at Haneda, a few months after the graduation, and
// the right seat of SHOYO AIRWAYS' 737 parked there. Seen from that seat only: the 737-type airliners at the next
// gates to the left (tools/aircraft/build_737.py → assets/model/jet737.glb, one instanced mesh), the terminal's glass front with
// its jet bridges (one at our forward door), the apron with its lead-in lines, the taxiway and the runway beyond, the
// bay, the control tower, the city behind the terminal and, out of the right windows, Mt Fuji far off on a clear morning. Everything is made
// here (boxes, lathes, canvas textures; no files but the model). The place is generic: no real building is modelled,
// no real airline appears (the other aircraft wear the same fictional colours).
// The set stands far from the LAB airfield (OFFSET: further than the camera sees), so the two never show together.
// The flight deck is a 737-type's: two seats, six display units, the glareshield with its mode control panel, the
// pedestal and its levers, the yokes, the overhead panel, the windscreen and the side windows (the outside seen through
// them); the captain sits on the left (npc/actor.js, seated), the cadet on the right.
// Coordinates: the set's own (our aircraft's frame): x right, y up from the apron, −z ahead (the nose towards the
// terminal); the group is turned so the morning sun lights the terminal's front.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { modelMeshes } from '../aircraft/archer-model.js';
import { paintMaterial, meshGeometry } from '../aircraft/exterior.js';
import { tex, canvasTexture, windowTexture, windowMask, rng } from '../render/textures.js';
import { metricMaterial, glassMaterial, clearGlassMaterial } from '../render/materials.js';

export const OFFSET = 90000;                        // m east of the LAB airfield's origin (the camera sees 42 km)
// the cadet's eye in the right seat, the captain's seat (the aircraft's frame)
export const EYE = Object.freeze([0.53, 4.05, -15.95]);
export const CAPTAIN = Object.freeze({ hip: [-0.53, 3.37, -15.80], ankleL: [-0.45, 2.95, -16.45], ankleR: [-0.61, 2.95, -16.45], floor: 2.8 });
export const GATES = [-138, -92, -46, 0];            // the gates' x (ours: 0, the last on the right), noses to the terminal (−z)
export const TERM = Object.freeze({ z: -62, x0: -330, x1: 40, h: 14 });    // the terminal's glass front: its z, ends, height

// ---- helpers: boxes merged by material (one draw a material)
function boxGeo(cx, cy, cz, sx, sy, sz, ry = 0) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  if (ry) g.rotateY(ry);
  return g.translate(cx, cy, cz);
}
function bucket() {
  const list = [];
  return { add(g) { list.push(g); return g; }, mesh(mat, { shadow = true, name = '' } = {}) {
    const m = new THREE.Mesh(mergeGeometries(list.map(g => (g.index ? g.toNonIndexed() : g)).map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; })), mat);
    m.castShadow = shadow; m.receiveShadow = true; m.name = name; return m;
  } };
}
const std = (color, roughness = 0.7, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

// ---- the display units' pictures (a 737-type's: primary flight, navigation, engines), drawn once (parked at the gate)
const FONT = (px, w = 600) => `${w} ${Math.round(px)}px "Segoe UI", "Hiragino Sans", "Noto Sans", sans-serif`;
function pfdPic(g, w, h) {
  g.fillStyle = '#05080c'; g.fillRect(0, 0, w, h);
  const cx = w * 0.5, cy = h * 0.46, R = w * 0.3;
  g.save(); g.beginPath(); g.rect(cx - R, cy - R, 2 * R, 2 * R); g.clip();
  g.fillStyle = '#2f7fd0'; g.fillRect(cx - R, cy - R, 2 * R, R); g.fillStyle = '#8a5a2b'; g.fillRect(cx - R, cy, 2 * R, R);
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.stroke();
  for (const p of [-10, -5, 5, 10]) { const y = cy - p * R / 22; g.beginPath(); g.moveTo(cx - R * (Math.abs(p) === 10 ? 0.3 : 0.15), y); g.lineTo(cx + R * (Math.abs(p) === 10 ? 0.3 : 0.15), y); g.stroke(); }
  g.restore();
  g.fillStyle = '#ffd34d'; g.fillRect(cx - R * 0.55, cy - 3, R * 0.4, 6); g.fillRect(cx + R * 0.15, cy - 3, R * 0.4, 6); g.fillRect(cx - 4, cy - 4, 8, 8);
  // the speed and altitude tapes, the heading below
  g.fillStyle = '#3a4048'; g.fillRect(w * 0.04, cy - R, w * 0.13, 2 * R); g.fillRect(w * 0.83, cy - R, w * 0.13, 2 * R);
  g.fillStyle = '#fff'; g.font = FONT(h * 0.06); g.textAlign = 'center';
  g.fillText('0', w * 0.105, cy + h * 0.02); g.fillText('20', w * 0.895, cy + h * 0.02);
  g.fillStyle = '#d0d4d8'; g.font = FONT(h * 0.05); g.fillText('340', cx, h * 0.93);
  g.strokeStyle = '#d0d4d8'; g.beginPath(); g.arc(cx, h * 1.15, h * 0.32, Math.PI * 1.25, Math.PI * 1.75); g.stroke();
}
function ndPic(g, w, h) {
  g.fillStyle = '#05080c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#e8eef4'; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h * 0.85, h * 0.62, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
  for (let k = -3; k <= 3; k++) { const a = Math.PI * 1.5 + k * 0.1; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * h * 0.62, h * 0.85 + Math.sin(a) * h * 0.62); g.lineTo(w / 2 + Math.cos(a) * h * 0.57, h * 0.85 + Math.sin(a) * h * 0.57); g.stroke(); }
  g.fillStyle = '#e8eef4'; g.font = FONT(h * 0.055); g.textAlign = 'center'; g.fillText('34', w / 2, h * 0.18);
  g.strokeStyle = '#ff6ad5'; g.beginPath(); g.moveTo(w / 2, h * 0.85); g.lineTo(w * 0.62, h * 0.3); g.stroke();
  g.fillStyle = '#7ee08a'; g.font = FONT(h * 0.045, 500); g.textAlign = 'left'; g.fillText('GS 0', w * 0.04, h * 0.08);
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(w / 2, h * 0.8); g.lineTo(w / 2 - 8, h * 0.88); g.lineTo(w / 2 + 8, h * 0.88); g.fill();
}
function engPic(g, w, h) {
  g.fillStyle = '#05080c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#e8eef4'; g.lineWidth = 3; g.fillStyle = '#e8eef4'; g.font = FONT(h * 0.07); g.textAlign = 'center';
  for (const x of [0.3, 0.7]) { g.beginPath(); g.arc(w * x, h * 0.3, w * 0.16, Math.PI * 0.75, Math.PI * 2.0); g.stroke(); g.fillText('0.0', w * x, h * 0.34); }
  g.font = FONT(h * 0.05, 500); g.fillText('N1', w * 0.5, h * 0.32);
  g.fillStyle = '#7ee08a'; g.fillText('FUEL  7.4', w * 0.5, h * 0.75);
}
function lowerPic(g, w, h) { g.fillStyle = '#05080c'; g.fillRect(0, 0, w, h); g.fillStyle = '#7ee08a'; g.font = FONT(h * 0.05, 500); g.textAlign = 'center'; g.fillText('DOORS', w / 2, h * 0.15); g.strokeStyle = '#7ee08a'; g.strokeRect(w * 0.4, h * 0.25, w * 0.2, h * 0.6); g.fillStyle = '#ffb547'; g.fillRect(w * 0.37, h * 0.32, w * 0.05, h * 0.08); }
function mcpPic(g, w, h) {
  g.fillStyle = '#3d4248'; g.fillRect(0, 0, w, h);
  const items = [['COURSE', '340'], ['IAS/MACH', '150'], ['HEADING', '340'], ['ALTITUDE', '6000'], ['VERT SPEED', ''], ['COURSE', '340']];
  items.forEach(([k, v], i) => {
    const x = (i + 0.5) / items.length * w;
    g.fillStyle = '#d8dde2'; g.font = FONT(h * 0.17, 500); g.textAlign = 'center'; g.fillText(k, x, h * 0.28);
    g.fillStyle = '#101214'; g.fillRect(x - w * 0.055, h * 0.38, w * 0.11, h * 0.3);
    g.fillStyle = '#ffb547'; g.font = FONT(h * 0.22); g.fillText(v, x, h * 0.6);
  });
}
function overheadPic(g, w, h) {
  g.fillStyle = '#4a5057'; g.fillRect(0, 0, w, h);
  const r = rng(7);
  for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) {
    const px = (x + 0.5) * w / 12, py = (y + 0.5) * h / 6;
    g.strokeStyle = '#2a2e33'; g.strokeRect(px - w / 26, py - h / 14, w / 13, h / 7);
    if (r() < 0.25) { g.fillStyle = r() < 0.5 ? '#3a3f45' : '#62686f'; g.fillRect(px - w / 40, py - h / 24, w / 20, h / 12); }
    else { g.fillStyle = '#c7ccd1'; g.fillRect(px - 2, py - h / 18, 4, h / 9); }
  }
}

// ---- the flight deck (in our aircraft's frame)
function flightDeck() {
  const group = new THREE.Group(); group.name = 'b737-deck';
  const shell = bucket(), dark = bucket(), seats = bucket(), metal = bucket();
  const F = CAPTAIN.floor;
  // the floor, the back wall and its door, the side walls under and over the windows, the ceiling
  shell.add(boxGeo(0, F - 0.05, -15.85, 2.3, 0.1, 2.7));
  shell.add(boxGeo(0, 3.8, -14.55, 2.3, 2.1, 0.1));
  for (const s of [-1, 1]) {
    shell.add(boxGeo(s * 1.08, (F + 3.86) / 2, -15.85, 0.1, 3.86 - F, 2.7));                 // under the side windows
    shell.add(boxGeo(s * 1.06, 4.62, -15.6, 0.1, 0.5, 2.2));                                 // over them
    shell.add(boxGeo(s * 1.06, 4.12, -15.0, 0.1, 0.6, 0.9));                                 // behind the sliding window
    shell.add(boxGeo(s * 1.03, 4.12, -16.16, 0.12, 0.6, 0.07));                              // the post between the side windows
    shell.add(boxGeo(s * 0.86, 4.12, -16.98, 0.05, 0.62, 0.05, s * 0.5));                    // the corner post
  }
  shell.add(boxGeo(0, 4.80, -15.6, 2.2, 0.1, 2.3));                                          // the ceiling
  shell.add(boxGeo(0, 4.5, -16.82, 2.0, 0.1, 0.36));                                        // over the windscreen
  shell.add(boxGeo(0, 4.13, -17.0, 0.045, 0.62, 0.045));                                     // the windscreen's centre post
  // the glareshield (its top, dark) and the main panel under it
  dark.add(boxGeo(0, 3.80, -16.86, 2.0, 0.08, 0.36));
  dark.add(boxGeo(0, 3.35, -16.98, 2.0, 0.9, 0.08));
  // the pedestal between the seats, the yokes' columns
  dark.add(boxGeo(0, 3.12, -16.45, 0.38, 0.62, 0.95));
  for (const x of [-0.53, 0.53]) {
    // the yoke: its column from the floor, the bar and two short horns (dark grey), below the displays
    dark.add(boxGeo(x, 2.98, -16.66, 0.07, 0.36, 0.07));
    dark.add(boxGeo(x, 3.17, -16.6, 0.3, 0.035, 0.04));
    dark.add(boxGeo(x - 0.15, 3.22, -16.6, 0.035, 0.11, 0.04)); dark.add(boxGeo(x + 0.15, 3.22, -16.6, 0.035, 0.11, 0.04));
    // the seat: cushion, back, headrest, armrests
    seats.add(boxGeo(x, 3.22, -15.78, 0.5, 0.12, 0.5)); seats.add(boxGeo(x, 3.72, -15.5, 0.5, 0.85, 0.12));
    seats.add(boxGeo(x, 4.2, -15.48, 0.3, 0.2, 0.1));
    seats.add(boxGeo(x - 0.27, 3.42, -15.7, 0.05, 0.05, 0.4)); seats.add(boxGeo(x + 0.27, 3.42, -15.7, 0.05, 0.05, 0.4));
    metal.add(boxGeo(x, 2.98, -15.78, 0.18, 0.36, 0.18));
  }
  // the thrust levers, the flap and speed brake levers
  for (const x of [-0.06, 0.06]) { dark.add(boxGeo(x, 3.48, -16.62, 0.025, 0.14, 0.025)); metal.add(boxGeo(x, 3.56, -16.62, 0.05, 0.03, 0.035)); }
  dark.add(boxGeo(0.14, 3.46, -16.4, 0.02, 0.1, 0.02)); dark.add(boxGeo(-0.15, 3.46, -16.55, 0.02, 0.1, 0.02));
  metal.add(boxGeo(0.14, 3.51, -16.4, 0.04, 0.025, 0.03)); metal.add(boxGeo(-0.15, 3.51, -16.55, 0.04, 0.025, 0.03));
  group.add(shell.mesh(std(0x6f757c, 0.8), { name: 'deck-shell' }), dark.mesh(std(0x2b2f34, 0.75), { name: 'deck-panel' }),
    seats.mesh(std(0x3b3530, 0.9), { name: 'deck-seats' }), metal.mesh(std(0x8d9196, 0.45, 0.5), { name: 'deck-metal' }));
  // the display units, the mode control panel, the overhead panel (pictures on planes)
  const screen = (draw, w, h, x, y, z, rx = 0, name = '') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: canvasTexture(256, Math.round(256 * h / w), draw), toneMapped: false }));
    m.position.set(x, y, z); m.rotation.x = rx; m.name = name; group.add(m); return m;
  };
  const DU = 0.2, ZP = -16.93;
  screen(pfdPic, DU, DU, -0.74, 3.48, ZP, 0, 'du-pfd-l'); screen(ndPic, DU, DU, -0.5, 3.48, ZP, 0, 'du-nd-l');
  screen(engPic, DU, DU, 0, 3.48, ZP, 0, 'du-eng'); screen(lowerPic, DU, DU * 0.9, 0, 3.24, ZP + 0.005, 0, 'du-lower');
  screen(ndPic, DU, DU, 0.5, 3.48, ZP, 0, 'du-nd-r'); screen(pfdPic, DU, DU, 0.74, 3.48, ZP, 0, 'du-pfd-r');
  screen(mcpPic, 1.1, 0.13, 0, 3.80, -16.69, -0.35, 'mcp');
  const oh = screen(overheadPic, 1.1, 0.75, 0, 4.66, -15.95, Math.PI / 2 + 0.35, 'overhead');
  oh.material.side = THREE.DoubleSide;
  // the windscreen and the side windows (clear glass: the outside through them)
  const glass = clearGlassMaterial({ tint: 0x0b1216, env: 0.9 });
  const pane = (w, h, x, y, z, ry, rx) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass); m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ'); m.renderOrder = 6; group.add(m); };
  for (const s of [-1, 1]) {
    pane(0.78, 0.62, s * 0.42, 4.13, -16.95, 0, -0.42);
    pane(0.8, 0.52, s * 0.98, 4.12, -16.6, s * -1.2, 0);
    pane(0.55, 0.42, s * 1.07, 4.12, -15.84, s * -Math.PI / 2, 0);
  }
  return group;
}

// ---- the place
export function buildHaneda({ quality = null } = {}) {
  const group = new THREE.Group(); group.name = 'haneda'; group.visible = false;
  const R = rng(1957);
  // the ground: the apron (concrete), the taxiways and the runway (asphalt), the bay
  const conc = metricMaterial({ map: tex('concrete_c'), normalMap: tex('concrete_n'), scale: 6, roughness: 0.85, grime: 0.12, color: 0xd8d8d2 });
  const asph = metricMaterial({ map: tex('asphalt_c'), normalMap: tex('asphalt_n'), scale: 5, roughness: 0.9, grime: 0.1, color: 0x9a9a9a });
  const plane = (mat, x0, x1, z0, z1, y = 0, name = '') => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.name = name; group.add(m); return m; };
  plane(conc, -420, 420, TERM.z, 95, 0, 'apron');
  plane(asph, -1600, 1600, 95, 560, -0.02, 'taxiways');
  plane(asph, -1600, 1600, -360, TERM.z, -0.03, 'landside');
  const water = new THREE.Mesh((() => { const g = new THREE.PlaneGeometry(16000, 9000); g.rotateX(-Math.PI / 2); g.translate(0, -2.0, 560 + 4500); return g; })(),
    std(0x1d3a52, 0.12, 0.0, { envMapIntensity: 1.3 }));
  water.name = 'bay'; group.add(water);
  { const g = new THREE.PlaneGeometry(9000, 16000); g.rotateX(-Math.PI / 2); g.translate(1600 + 4500, -2.0, 0); group.add(Object.assign(new THREE.Mesh(g, water.material), { name: 'bay-east' })); }
  // the far land behind the terminal (the city's ground), under everything else
  { const g = new THREE.PlaneGeometry(16000, 9000); g.rotateX(-Math.PI / 2); g.translate(0, -0.1, -360 - 4500); const m = new THREE.Mesh(g, std(0x6d6f6c, 0.95)); m.name = 'land'; m.receiveShadow = true; group.add(m); }
  // (the land out to the right, past the terminal's end, where Mt Fuji stands far off)
  { const g = new THREE.PlaneGeometry(14400, 9400); g.rotateX(-Math.PI / 2); g.translate(1600 + 7200, -0.1, -4500); const m = new THREE.Mesh(g, std(0x6d6f6c, 0.95)); m.name = 'land-west'; group.add(m); }
  // the markings: the lead-in lines (yellow) to each gate and along the taxi lane; the runway's edges and centre (white)
  const yel = bucket(), wht = bucket();
  for (const x of GATES) {
    yel.add(boxGeo(x, 0.02, (TERM.z + 95) / 2, 0.18, 0.02, 95 - TERM.z));
    yel.add(boxGeo(x, 0.02, -16.5, 6, 0.02, 0.3));                                          // the stop line (the nose wheel's)
  }
  yel.add(boxGeo(80, 0.02, 92, 840, 0.02, 0.2)); yel.add(boxGeo(0, 0.02, 250, 3200, 0.02, 0.3));
  for (const z of [400 - 29, 400 + 29]) wht.add(boxGeo(0, 0.02, z, 3200, 0.02, 0.9));
  for (let x = -1580; x < 1580; x += 60) wht.add(boxGeo(x, 0.02, 400, 30, 0.02, 0.9));
  group.add(yel.mesh(std(0xd9a91c, 0.8), { shadow: false, name: 'marks-yellow' }), wht.mesh(std(0xe8e8e2, 0.8), { shadow: false, name: 'marks-white' }));
  // the terminal: its glass front facing the apron, the roof, the building behind; the control tower
  const term = bucket();
  const TW = TERM.x1 - TERM.x0, TX = (TERM.x0 + TERM.x1) / 2;
  term.add(boxGeo(TX, TERM.h / 2, TERM.z - 1.9 - 22, TW, TERM.h, 44));
  term.add(boxGeo(TX, TERM.h + 0.6, TERM.z - 22, TW + 12, 1.2, 52));
  group.add(term.mesh(metricMaterial({ map: tex('plaster_c'), nr: tex('plaster_nr'), scale: 4, color: 0xd9dcdf, roughness: 0.7, grime: 0.08 }), { name: 'terminal' }));
  const wt = windowTexture(); wt.repeat.set(TW / 6, 3); const wm = windowMask(); wm.repeat.copy(wt.repeat);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(TW, TERM.h - 1.5), glassMaterial({ map: wt, mask: wm, tint: 0xb9cad6 }));
  front.position.set(TX, TERM.h / 2 + 0.5, TERM.z - 1.8); front.name = 'terminal-front'; group.add(front);
  // the jet bridges: a rotunda by the terminal, the tunnel out to the forward left door, its legs
  const br = bucket(), brDark = bucket(), brGlass = bucket();
  for (const gx of GATES) {
    const a = new THREE.Vector3(gx - 15, 4.6, TERM.z + 0.5), b = new THREE.Vector3(gx - 2.9, 3.6, -14.9);
    const d = b.clone().sub(a), L = Math.hypot(d.x, d.z), yaw = Math.atan2(d.x, d.z);
    const t = new THREE.BoxGeometry(2.9, 3.0, L); t.rotateY(yaw); t.translate((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.6, (a.z + b.z) / 2); br.add(t);
    const w = new THREE.BoxGeometry(2.96, 0.9, L - 3); w.rotateY(yaw); w.translate((a.x + b.x) / 2, (a.y + b.y) / 2 + 1.0, (a.z + b.z) / 2); brGlass.add(w);
    br.add(boxGeo(a.x, 2.5, a.z, 3.6, 5.0, 3.6));
    brDark.add(boxGeo(b.x + 0.3, 1.2, b.z - 1.6, 0.5, 2.4, 0.5));
    brDark.add(boxGeo(b.x - 0.6, 3.9, b.z, 1.6, 2.6, 2.4, yaw));                             // the cab at the door
  }
  group.add(br.mesh(std(0xa9b0b6, 0.6, 0.2), { name: 'bridges' }), brDark.mesh(std(0x4a4f55, 0.6, 0.2), { name: 'bridge-cabs' }), brGlass.mesh(std(0x26323d, 0.15, 0.3), { shadow: false, name: 'bridge-windows' }));
  const tower = bucket(), towerTop = bucket();
  tower.add(new THREE.CylinderGeometry(5.5, 7, 100, 16).translate(170, 50, -360));
  towerTop.add(new THREE.CylinderGeometry(10.5, 8, 11, 12).translate(170, 106, -360));
  tower.add(new THREE.CylinderGeometry(9, 9, 2, 12).translate(170, 112.5, -360));
  group.add(tower.mesh(std(0xd6d8da, 0.6), { name: 'tower' }), towerTop.mesh(std(0x24323e, 0.15, 0.3), { name: 'tower-cab' }));
  // the ground equipment by our aircraft: a tug and its carts, a power unit at the nose, a fuel truck at the next gate
  const veh = bucket(), vehDark = bucket();
  veh.add(boxGeo(9, 0.8, -4, 2.2, 1.4, 3.6)); for (let k = 0; k < 3; k++) veh.add(boxGeo(9, 0.9, 1 + k * 3.6, 1.8, 1.4, 3.0));
  veh.add(boxGeo(3.2, 0.7, -22, 1.6, 1.2, 2.4));
  veh.add(boxGeo(-36, 1.6, -6, 2.6, 3.0, 9)); veh.add(boxGeo(-20, 1.2, -40, 2.2, 2.2, 5)); veh.add(boxGeo(28, 1.0, -48, 1.8, 1.8, 3.5));
  for (let k = 0; k < 4; k++) vehDark.add(boxGeo(9 + (k % 2 ? 1.2 : -1.2), 0.35, -4 + (k < 2 ? -1.2 : 1.2), 0.3, 0.7, 0.7));
  group.add(veh.mesh(std(0xf0f0ea, 0.6), { name: 'vehicles' }), vehDark.mesh(std(0x1c1c1e, 0.9), { name: 'wheels' }));
  // the city behind the terminal: blocks, taller towards the centre far off (one mesh)
  const city = bucket();
  for (let k = 0; k < 420; k++) {
    const x = (R() - 0.5) * 9000, z = -900 - R() * 5500, far = Math.min(1, (-z - 900) / 5500);
    if (x > 600 && z > -4500) continue;                                                     // (the view out to the right kept open: Mt Fuji)
    const h = 15 + R() * (40 + 160 * far * (1 - Math.min(1, Math.abs(x) / 4500))), w = 25 + R() * 60;
    city.add(boxGeo(x, h / 2, z, w, h, 25 + R() * 60));
  }
  group.add(city.mesh(std(0x9ea6ae, 0.8), { shadow: false, name: 'city' }));
  // the far shore across the bay
  const shore = bucket();
  for (let k = 0; k < 60; k++) { const x = 3000 + R() * 9000, z = 2500 + R() * 6000, h = 20 + R() * 60; shore.add(boxGeo(x, h / 2, z, 120 + R() * 200, h, 120 + R() * 200)); }
  group.add(shore.mesh(std(0x7d858c, 0.9), { shadow: false, name: 'shore' }));
  // Mt Fuji, far off ahead and to the left on a clear morning: a lathe (the concave slopes), snow on its upper part
  {
    const prof = [[0, 1300], [300, 1275], [650, 1190], [1120, 1015], [1750, 755], [2620, 445], [3750, 175], [5100, 0]].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(prof.reverse(), 40);
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < g.attributes.position.count; i++) {
      const y = g.attributes.position.getY(i), snow = THREE.MathUtils.smoothstep(y, 770, 940);
      const c = new THREE.Color(0x5b6d82).lerp(new THREE.Color(0xf2f4f6), snow);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const fuji = new THREE.Mesh(g, std(0xffffff, 0.9, 0, { vertexColors: true }));
    fuji.position.set(26000, -40, -18000); fuji.name = 'fuji'; group.add(fuji);
  }
  // the 737s at the gates (ours too: hidden while we sit in it) and one taxiing out beyond the lane
  const M = modelMeshes('jet737'), body = M && M.get('body');
  let jets = null;
  if (body) {
    // (ours, at gate 0, last: drawn only when seen from outside — showOwn)
    const spots = GATES.filter(x => x !== 0).map(x => [x, 0, 0]).concat([[-190, 250, Math.PI / 2], [330, 120, -Math.PI / 2], [-120, 40, Math.PI * 0.85], [0, 0, 0]]);
    jets = new THREE.InstancedMesh(meshGeometry(body), paintMaterial(), spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3(1, 1, 1);
    spots.forEach(([x, z, yaw], i) => { q.setFromAxisAngle(up, yaw); m.compose(new THREE.Vector3(x, 0, z), q, s); jets.setMatrixAt(i, m); });
    jets.castShadow = true; jets.receiveShadow = true; jets.name = 'jets'; jets.count = spots.length - 1;
    group.add(jets);
  }
  const deck = flightDeck();
  // our aircraft as one piece: the deck (and, in main.js, the captain in his seat) rides in this group, and the
  // departure moves it — pushback, taxi, the take-off and the climb — in the set's frame. At rest (the gate) it is
  // the identity, so the parked scene is exactly what it was. Its yaw-pitch-roll order is the flying one.
  const jet = new THREE.Group(); jet.name = 'b737-jet'; jet.rotation.order = 'YXZ'; jet.add(deck); group.add(jet);
  const showOwn = (on) => { if (jets) jets.count = jets.instanceMatrix.count - (on ? 0 : 1); deck.visible = !on; };
  return { group, deck, jet, jets, showOwn, triangles: () => { let n = 0; group.traverse(o => { if (o.isMesh && o.geometry) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); }); return Math.round(n); } };
}
