// CADET — world/props.js : the academy's furniture, built at start-up (no model files).
// place(type, { a, c, rot, y, opts }) puts a piece in the runway frame (x = c, z = −a, y up from the floor); each piece is
// modelled with its front towards local +Z and turned by rotation.y = −(rot + 90)° (rot 0 = faces −c, 90 = +a,
// 180 = +c, 270 = −a). Wall pieces have their back at (a, c). build() merges every piece per material (few draw calls)
// and returns the colliders (axis-aligned in the frame) and anchors (boards' and screens' centres).
// Soft low-poly: rounded boxes, believable sizes in metres, PBR materials in the academy's palette (light oak, white
// laminate, charcoal fabric, navy #16324f and gold #f2b632).
import * as THREE from 'three';
import { exteriorParts } from '../aircraft/archer-model.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture } from '../render/textures.js';
import { placeBox } from '../player/collide.js';

const DEG = Math.PI / 180;
const JP = '"Hiragino Sans", "Yu Gothic UI", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", "Noto Sans JP", sans-serif';
const toLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

let MAT = null;
function materials() {
  if (MAT) return MAT;
  const oak = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#c8a273'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const y = (i * 53) % h, a = 0.04 + (i % 6) * 0.015; g.fillStyle = `rgba(${110 + (i % 5) * 9},${70 + (i % 4) * 7},${35},${a})`; g.fillRect(0, y, w, 1 + (i % 3)); }
    for (let i = 0; i < 24; i++) { g.strokeStyle = 'rgba(120,78,38,0.10)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, (i * 41) % h); g.bezierCurveTo(w * 0.3, (i * 67) % h, w * 0.6, (i * 13) % h, w, (i * 29) % h); g.stroke(); }
  }, { repeat: true });
  const fabric = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const v = 112 + ((x * 7 + y * 13) % 5) * 8; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 2, 2); }
  }, { repeat: true, srgb: false });
  const m = (o) => new THREE.MeshStandardMaterial(o);
  MAT = {
    oak: m({ map: oak, roughness: 0.55 }), white: m({ color: 0xeeede8, roughness: 0.45 }), grey: m({ color: 0xb9bcbf, roughness: 0.5 }),
    charcoal: m({ color: 0x34383d, roughness: 0.95, roughnessMap: fabric }), navy: m({ color: 0x1f3b5c, roughness: 0.92, roughnessMap: fabric }),
    navyHard: m({ color: 0x16324f, roughness: 0.5 }), gold: m({ color: 0xf2b632, roughness: 0.35, metalness: 0.6 }),
    metal: m({ color: 0x2c3036, roughness: 0.4, metalness: 0.7 }), chrome: m({ color: 0xd3d7db, roughness: 0.18, metalness: 1.0 }),
    alu: m({ color: 0xb8bec4, roughness: 0.3, metalness: 0.9 }), black: m({ color: 0x141518, roughness: 0.45 }),
    bezel: m({ color: 0x0b0c0e, roughness: 0.25, metalness: 0.2 }), steelLocker: m({ color: 0x8e9aa5, roughness: 0.45, metalness: 0.55 }),
    leaf: m({ color: 0x3e6a2c, roughness: 0.8 }), leafDark: m({ color: 0x2c4f22, roughness: 0.85 }), pot: m({ color: 0xf1efe9, roughness: 0.6 }),
    soil: m({ color: 0x3a2a1c, roughness: 1 }), red: m({ color: 0xb3261e, roughness: 0.5 }), blueWater: m({ color: 0x8cc6e6, roughness: 0.1, metalness: 0 }),
    cork: m({ color: 0xb98a57, roughness: 0.9 }), rubber: m({ color: 0x18191b, roughness: 0.9 }),
    book: [0x8c2f2f, 0x2f4f8c, 0x3c6e47, 0xb8862b, 0x4a4a52, 0x7a3d6e, 0xd9d4c5].map(c => m({ color: c, roughness: 0.7 })),
  };
  return MAT;
}

const FACES = new Map();
// ---------------------------------------------------------------- a piece being built (local coordinates)
class Piece {
  constructor() { this.parts = []; this.faces = []; this.box = null; this.anchors = []; }
  add(mat, geo) { this.parts.push([mat, geo]); return geo; }
  rbox(mat, w, h, d, x, y, z, r = 0.012) {
    // rounded where it shows (a bevel of one step; two on big soft pieces), a plain box for small or sharp parts
    const round = r >= 0.008 && Math.min(w, h, d) > r * 2.2 && Math.max(w, h, d) > 0.08;
    const g = round ? new RoundedBoxGeometry(w, h, d, r >= 0.03 && Math.max(w, h, d) > 0.4 ? 2 : 1, r) : new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z); return this.add(mat, g);
  }
  cyl(mat, r0, r1, h, x, y, z, seg = 16) { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(x, y, z); return this.add(mat, g); }
  // a canvas face (screen, board, sign), facing +Z: its own material, or one shared by every face with the same key
  face(draw, w, h, x, y, z, { px = 512, emissive = 0, rough = 0.4, ry = 0, both = false, key = null } = {}) {
    let mat = key && FACES.get(key);
    if (!mat) {
      const aspect = w / h, W = Math.round(aspect >= 1 ? px : px * aspect), H = Math.round(aspect >= 1 ? px / aspect : px);
      const t = canvasTexture(Math.max(16, W), Math.max(16, H), draw);
      mat = new THREE.MeshStandardMaterial({ map: t, roughness: rough, emissive: emissive ? 0xffffff : 0x000000, emissiveMap: emissive ? t : null, emissiveIntensity: emissive, side: both ? THREE.DoubleSide : THREE.FrontSide });
      mat.userData.face = true;
      if (key) FACES.set(key, mat);
    }
    const g = new THREE.PlaneGeometry(w, h); if (ry) g.rotateY(ry); g.translate(x, y, z);
    this.faces.push([mat, g]); return mat;
  }
  collide(w, d, h, x = 0, z = 0, y0 = 0) { this.box = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0, y1: y0 + h }; }
}

// ---------------------------------------------------------------- default drawings
const slide = (title, sub) => (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#16324f'); gr.addColorStop(1, '#0b1a2b'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f2b632'; g.fillRect(w * 0.06, h * 0.62, w * 0.2, h * 0.012);
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.font = `700 ${Math.round(h * 0.11)}px ${JP}`; g.fillText(title, w * 0.06, h * 0.45);
  g.font = `500 ${Math.round(h * 0.06)}px ${JP}`; g.fillStyle = '#b9cbe0'; g.fillText(sub, w * 0.06, h * 0.75);
};
const pfd = (seed = 0) => (g, w, h) => {
  // a simple attitude display with speed and altitude tapes (a teaching look, not the G1000's screens)
  const p = (seed % 5) * 0.03 - 0.05, b = ((seed * 7) % 9 - 4) * 0.03;
  g.save(); g.translate(w / 2, h / 2); g.rotate(b);
  g.fillStyle = '#2d77c4'; g.fillRect(-w, -h * 2, w * 2, h * 2 + h * p); g.fillStyle = '#7a4f2b'; g.fillRect(-w, h * p, w * 2, h * 2);
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-w, h * p); g.lineTo(w, h * p); g.stroke();
  for (let k = -3; k <= 3; k++) if (k) { g.beginPath(); g.moveTo(-w * 0.06, h * p - k * h * 0.07); g.lineTo(w * 0.06, h * p - k * h * 0.07); g.stroke(); }
  g.restore();
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(w * 0.08, h * 0.2, w * 0.1, h * 0.6); g.fillRect(w * 0.78, h * 0.2, w * 0.12, h * 0.6);
  g.fillStyle = '#fff'; g.font = `700 ${Math.round(h * 0.07)}px monospace`; g.fillText('100', w * 0.09, h * 0.52); g.fillText('3000', w * 0.785, h * 0.52);
  g.fillStyle = '#f2b632'; g.fillRect(w * 0.4, h * 0.49, w * 0.07, h * 0.02); g.fillRect(w * 0.53, h * 0.49, w * 0.07, h * 0.02);
  g.fillStyle = '#000'; g.fillRect(0, h * 0.86, w, h * 0.14); g.fillStyle = '#9ef0c9'; g.font = `600 ${Math.round(h * 0.06)}px monospace`; g.fillText('HDG 090   ALT 3000   GS 100KT', w * 0.05, h * 0.94);
};
const clockFace = (g, w, h) => {
  g.fillStyle = '#fbfbf8'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.48, 0, 6.29); g.fill();
  g.strokeStyle = '#222'; g.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.lineWidth = i % 3 ? 3 : 6; g.beginPath(); g.moveTo(w / 2 + Math.sin(a) * w * 0.38, h / 2 - Math.cos(a) * h * 0.38); g.lineTo(w / 2 + Math.sin(a) * w * 0.44, h / 2 - Math.cos(a) * h * 0.44); g.stroke(); }
  const hand = (a, l, wd) => { g.lineWidth = wd; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.sin(a) * w * l, h / 2 - Math.cos(a) * h * l); g.stroke(); };
  hand((9 + 35 / 60) / 12 * 6.283, 0.25, 7); hand(35 / 60 * 6.283, 0.36, 4);
  g.strokeStyle = '#c0392b'; hand(12 / 60 * 6.283, 0.4, 2);
};
const exitFace = (g, w, h) => {
  g.fillStyle = '#0f7b3f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
  // a running figure and a door (the ISO 7010 idea, simplified)
  g.fillRect(w * 0.08, h * 0.15, w * 0.22, h * 0.7); g.fillStyle = '#0f7b3f'; g.fillRect(w * 0.12, h * 0.2, w * 0.14, h * 0.6);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.45, h * 0.28, h * 0.1, 0, 6.29); g.fill();
  g.lineWidth = h * 0.09; g.strokeStyle = '#fff'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(w * 0.44, h * 0.42); g.lineTo(w * 0.40, h * 0.62); g.lineTo(w * 0.33, h * 0.8); g.moveTo(w * 0.40, h * 0.62); g.lineTo(w * 0.48, h * 0.8); g.moveTo(w * 0.44, h * 0.45); g.lineTo(w * 0.36, h * 0.5); g.moveTo(w * 0.44, h * 0.45); g.lineTo(w * 0.52, h * 0.52); g.stroke();
  g.font = `700 ${Math.round(h * 0.3)}px ${JP}`; g.textBaseline = 'middle'; g.fillText('非常口', w * 0.6, h * 0.42); g.font = `700 ${Math.round(h * 0.2)}px sans-serif`; g.fillText('EXIT', w * 0.62, h * 0.74);
};
const signFace = (title, sub = '') => (g, w, h) => {
  g.fillStyle = '#16324f'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2b632'; g.fillRect(0, h - h * 0.07, w, h * 0.07);
  g.fillStyle = '#fff'; g.textBaseline = 'middle';
  let px = Math.round(h * (sub ? 0.36 : 0.5)); g.font = `700 ${px}px ${JP}`;
  while (g.measureText(title).width > w * 0.92 && px > 8) { px--; g.font = `700 ${px}px ${JP}`; }
  g.fillText(title, w * 0.04, h * (sub ? 0.36 : 0.48));
  if (sub) { let q = Math.round(h * 0.22); g.font = `500 ${q}px ${JP}`; while (g.measureText(sub).width > w * 0.92 && q > 8) { q--; g.font = `500 ${q}px ${JP}`; } g.fillStyle = '#c9d8e8'; g.fillText(sub, w * 0.04, h * 0.72); }
};
const flagFace = (g, w, h) => {
  g.fillStyle = '#16324f'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2b632';
  g.beginPath(); g.moveTo(w * 0.2, h * 0.62); g.lineTo(w * 0.5, h * 0.3); g.lineTo(w * 0.8, h * 0.62); g.lineTo(w * 0.5, h * 0.5); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.font = `700 ${Math.round(h * 0.11)}px sans-serif`; g.textAlign = 'center'; g.fillText('SHOYO', w / 2, h * 0.82);
};
const drinksFace = (g, w, h) => {
  g.fillStyle = '#e9eef2'; g.fillRect(0, 0, w, h);
  const cols = ['#c0392b', '#2471a3', '#27ae60', '#f39c12', '#8e44ad', '#16a085'];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { g.fillStyle = cols[(r + k) % cols.length]; g.fillRect(w * (0.06 + k * 0.15), h * (0.08 + r * 0.2), w * 0.09, h * 0.14); g.fillStyle = '#333'; g.fillRect(w * (0.06 + k * 0.15), h * (0.23 + r * 0.2), w * 0.09, h * 0.02); }
};

// ---------------------------------------------------------------- the pieces (front towards +Z)
const WALL = new Set(['whiteboard', 'wall_screen', 'flight_status_board', 'bulletin_board', 'map_wall', 'sign_board', 'wall_clock', 'exit_sign', 'headset_rack']);
const BUILDERS = {
  desk(P, M) {
    P.rbox(M.oak, 1.4, 0.035, 0.72, 0, 0.74, 0, 0.008);
    for (const x of [-0.67, 0.67]) P.rbox(M.white, 0.03, 0.72, 0.68, x, 0.36, 0, 0.004);
    P.rbox(M.white, 1.3, 0.4, 0.02, 0, 0.5, -0.3, 0.004);
    P.rbox(M.white, 0.4, 0.55, 0.6, 0.45, 0.3, 0.02, 0.006);                        // a drawer unit
    for (let i = 0; i < 3; i++) P.rbox(M.alu, 0.12, 0.012, 0.012, 0.45, 0.15 + i * 0.18, 0.33, 0.004);
    P.rbox(M.bezel, 0.56, 0.34, 0.03, 0, 1.03, -0.22, 0.008); P.cyl(M.metal, 0.02, 0.02, 0.16, 0, 0.84, -0.24, 8); P.rbox(M.metal, 0.22, 0.012, 0.16, 0, 0.765, -0.24, 0.004);
    P.face(pfd(3), 0.53, 0.31, 0, 1.03, -0.2, { emissive: 0.6, px: 256, key: 'pfd3' });
    P.rbox(M.black, 0.42, 0.015, 0.13, 0, 0.765, 0.05, 0.004);
    P.collide(1.42, 0.74, 0.76);
  },
  office_chair(P, M) {
    P.rbox(M.charcoal, 0.48, 0.08, 0.46, 0, 0.47, 0.02, 0.03);
    P.rbox(M.charcoal, 0.46, 0.5, 0.07, 0, 0.82, -0.22, 0.03);
    P.rbox(M.metal, 0.06, 0.32, 0.03, 0, 0.6, -0.24, 0.008);
    for (const x of [-0.25, 0.25]) { P.rbox(M.black, 0.04, 0.03, 0.3, x, 0.66, 0.0, 0.01); P.rbox(M.black, 0.03, 0.2, 0.03, x, 0.56, -0.08, 0.008); }
    P.cyl(M.chrome, 0.025, 0.025, 0.3, 0, 0.3, 0, 10);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, g = new THREE.BoxGeometry(0.3, 0.03, 0.04); g.translate(0.15, 0, 0); g.rotateY(a); g.translate(0, 0.08, 0); P.add(M.black, g); const w = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 8); w.rotateX(Math.PI / 2); w.translate(Math.cos(a) * 0.29, 0.035, -Math.sin(a) * 0.29); P.add(M.rubber, w); }
    P.collide(0.56, 0.56, 1.0);
  },
  stool(P, M) {
    P.cyl(M.charcoal, 0.18, 0.18, 0.06, 0, 0.66, 0, 20); P.cyl(M.chrome, 0.025, 0.025, 0.62, 0, 0.33, 0, 10); P.cyl(M.chrome, 0.2, 0.2, 0.02, 0, 0.01, 0, 20);
    const ring = new THREE.TorusGeometry(0.15, 0.01, 6, 20); ring.rotateX(Math.PI / 2); ring.translate(0, 0.3, 0); P.add(M.chrome, ring);
    P.collide(0.4, 0.4, 0.7);
  },
  table_long(P, M) {
    P.rbox(M.white, 2.0, 0.035, 0.9, 0, 0.74, 0, 0.01);
    P.rbox(M.oak, 2.02, 0.012, 0.92, 0, 0.7225, 0, 0.004);
    for (const x of [-0.9, 0.9]) { P.rbox(M.metal, 0.05, 0.72, 0.7, x, 0.36, 0, 0.008); P.rbox(M.metal, 0.08, 0.02, 0.8, x, 0.01, 0, 0.006); }
    P.rbox(M.metal, 1.75, 0.05, 0.03, 0, 0.66, 0, 0.006);
    P.collide(2.02, 0.92, 0.76);
  },
  coffee_table(P, M) { P.rbox(M.oak, 1.0, 0.04, 0.6, 0, 0.4, 0, 0.012); for (const x of [-0.44, 0.44]) for (const z of [-0.24, 0.24]) P.cyl(M.metal, 0.018, 0.018, 0.38, x, 0.19, z, 8); P.rbox(M.oak, 0.9, 0.02, 0.5, 0, 0.15, 0, 0.006); P.collide(1.0, 0.6, 0.42); },
  sofa(P, M) {
    P.rbox(M.charcoal, 2.0, 0.24, 0.82, 0, 0.22, 0, 0.05);
    for (const x of [-0.48, 0.48]) P.rbox(M.charcoal, 0.94, 0.14, 0.62, x, 0.41, 0.07, 0.06);
    P.rbox(M.charcoal, 2.0, 0.44, 0.2, 0, 0.56, -0.31, 0.07);
    for (const x of [-0.95, 0.95]) P.rbox(M.charcoal, 0.16, 0.36, 0.82, x, 0.48, 0, 0.06);
    for (const x of [-0.9, 0.9]) for (const z of [-0.33, 0.33]) P.cyl(M.metal, 0.02, 0.015, 0.1, x, 0.05, z, 8);
    P.rbox(M.navy, 0.4, 0.34, 0.12, -0.65, 0.6, -0.16, 0.05);
    P.collide(2.0, 0.84, 0.8);
  },
  bench(P, M) {
    for (let i = 0; i < 4; i++) P.rbox(M.oak, 1.6, 0.03, 0.09, 0, 0.45, -0.16 + i * 0.105, 0.008);
    for (const x of [-0.7, 0.7]) { P.rbox(M.metal, 0.05, 0.44, 0.04, x, 0.22, -0.16, 0.006); P.rbox(M.metal, 0.05, 0.44, 0.04, x, 0.22, 0.16, 0.006); P.rbox(M.metal, 0.05, 0.03, 0.42, x, 0.43, 0, 0.006); }
    P.collide(1.6, 0.45, 0.5);
  },
  counter(P, M) {
    P.rbox(M.navyHard, 3.0, 1.06, 0.06, 0, 0.53, 0.37, 0.01);
    P.rbox(M.gold, 3.0, 0.03, 0.065, 0, 0.9, 0.37, 0.004);
    P.rbox(M.white, 3.1, 0.04, 0.42, 0, 1.1, 0.25, 0.01);
    P.rbox(M.oak, 3.0, 0.035, 0.6, 0, 0.74, -0.08, 0.008);
    for (const x of [-1.47, 1.47]) P.rbox(M.white, 0.04, 1.08, 0.8, x, 0.54, 0, 0.006);
    P.collide(3.1, 0.82, 1.12);
  },
  reception_desk(P, M) {
    P.rbox(M.oak, 2.4, 1.05, 0.06, 0, 0.525, 0.38, 0.01);
    P.rbox(M.navyHard, 2.42, 0.12, 0.07, 0, 0.12, 0.38, 0.01);
    P.rbox(M.white, 2.5, 0.04, 0.42, 0, 1.08, 0.25, 0.01);
    P.rbox(M.white, 2.4, 0.035, 0.6, 0, 0.74, -0.08, 0.008);
    for (const x of [-1.18, 1.18]) P.rbox(M.oak, 0.05, 1.06, 0.82, x, 0.53, 0, 0.006);
    P.face(signFace('翔洋航空 フライトアカデミー', 'RECEPTION'), 1.4, 0.2, 0, 0.7, 0.415, { px: 512 });
    P.rbox(M.bezel, 0.5, 0.32, 0.03, 0.5, 1.0, -0.2, 0.008); P.face(slide('受付', 'ご用件をどうぞ'), 0.47, 0.29, 0.5, 1.0, -0.18, { emissive: 0.5, px: 256 });
    P.collide(2.5, 0.84, 1.1);
  },
  plant(P, M) {
    P.cyl(M.pot, 0.2, 0.24, 0.5, 0, 0.25, 0, 18); P.cyl(M.soil, 0.21, 0.21, 0.02, 0, 0.49, 0, 16);
    const puff = (r, x, y, z, mat) => { const g = new THREE.IcosahedronGeometry(r, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + 0.18 * Math.sin(p.getX(i) * 9 + p.getY(i) * 7 + p.getZ(i) * 5); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); g.translate(x, y, z); P.add(mat, g); };
    puff(0.32, 0, 0.85, 0, M.leaf); puff(0.24, 0.16, 1.15, 0.05, M.leafDark); puff(0.22, -0.15, 1.05, -0.08, M.leaf); puff(0.18, 0.02, 1.35, -0.02, M.leaf);
    P.cyl(M.oak, 0.02, 0.02, 0.5, 0, 0.7, 0, 6);
    P.collide(0.5, 0.5, 1.2);
  },
  trash_bin(P, M) { P.cyl(M.alu, 0.15, 0.17, 0.42, 0, 0.21, 0, 16); P.cyl(M.black, 0.17, 0.17, 0.02, 0, 0.42, 0, 16); P.collide(0.34, 0.34, 0.42); },
  water_cooler(P, M) {
    P.rbox(M.white, 0.32, 0.95, 0.32, 0, 0.475, 0, 0.02); P.rbox(M.grey, 0.2, 0.1, 0.04, 0, 0.8, 0.17, 0.01);
    P.cyl(M.blueWater, 0.13, 0.13, 0.4, 0, 1.18, 0, 16); P.cyl(M.blueWater, 0.05, 0.13, 0.06, 0, 0.98, 0, 16);
    P.collide(0.34, 0.34, 1.4);
  },
  printer(P, M) {
    P.rbox(M.grey, 0.6, 0.6, 0.5, 0, 0.3, 0, 0.01); P.rbox(M.white, 0.5, 0.36, 0.44, 0, 0.78, 0, 0.02); P.rbox(M.black, 0.2, 0.06, 0.02, 0.1, 0.9, 0.22, 0.005);
    P.rbox(M.white, 0.36, 0.01, 0.2, 0, 0.97, -0.02, 0.003);
    P.collide(0.6, 0.5, 0.97);
  },
  bookshelf(P, M) {
    P.rbox(M.oak, 0.9, 1.9, 0.02, 0, 0.95, -0.15, 0.004);
    for (const x of [-0.44, 0.44]) P.rbox(M.oak, 0.02, 1.9, 0.32, x, 0.95, 0, 0.004);
    for (let i = 0; i < 6; i++) P.rbox(M.oak, 0.88, 0.02, 0.32, 0, 0.02 + i * 0.37, 0, 0.004);
    let k = 0;
    for (let i = 0; i < 5; i++) { let x = -0.42; while (x < 0.38) { const w = 0.025 + ((k * 37) % 5) * 0.008, h = 0.22 + ((k * 13) % 7) * 0.015; P.rbox(M.book[k % M.book.length], w, h, 0.22, x + w / 2, 0.03 + i * 0.37 + h / 2, 0.02, 0); x += w + 0.003; k++; if ((k * 7) % 23 === 0) x += 0.06; } }
    P.collide(0.9, 0.34, 1.9);
  },
  locker_bank(P, M) {
    P.rbox(M.steelLocker, 1.8, 1.9, 0.5, 0, 0.95, 0, 0.01);
    for (let i = 0; i < 4; i++) {
      const x = -0.675 + i * 0.45; P.rbox(M.steelLocker, 0.43, 1.82, 0.012, x, 0.95, 0.256, 0.004);
      for (let v = 0; v < 4; v++) P.rbox(M.metal, 0.22, 0.008, 0.004, x, 1.6 + v * 0.04, 0.263, 0);
      P.rbox(M.chrome, 0.02, 0.12, 0.02, x + 0.15, 1.0, 0.27, 0.005);
      P.rbox(M.white, 0.1, 0.05, 0.003, x, 1.4, 0.263, 0);
    }
    P.collide(1.8, 0.5, 1.9);
  },
  fridge(P, M) { P.rbox(M.white, 0.6, 1.75, 0.65, 0, 0.875, 0, 0.03); P.rbox(M.grey, 0.58, 0.01, 0.01, 0, 1.15, 0.33, 0); P.rbox(M.chrome, 0.02, 0.3, 0.03, 0.24, 1.35, 0.34, 0.008); P.rbox(M.chrome, 0.02, 0.25, 0.03, 0.24, 0.85, 0.34, 0.008); P.collide(0.6, 0.66, 1.75); },
  vending_machine(P, M) {
    P.rbox(M.navyHard, 0.9, 1.83, 0.75, 0, 0.915, 0, 0.02);
    P.face(drinksFace, 0.62, 1.05, -0.08, 1.15, 0.38, { emissive: 0.8, px: 256, key: 'drinks' });
    P.rbox(M.black, 0.62, 0.16, 0.02, -0.08, 0.35, 0.38, 0.004); P.rbox(M.bezel, 0.14, 0.4, 0.02, 0.33, 1.15, 0.38, 0.004);
    P.collide(0.9, 0.76, 1.83);
  },
  coffee_machine(P, M) {
    P.rbox(M.oak, 0.7, 0.9, 0.5, 0, 0.45, 0, 0.01);
    P.rbox(M.black, 0.34, 0.45, 0.38, 0, 1.13, -0.02, 0.03); P.rbox(M.chrome, 0.1, 0.06, 0.06, 0, 1.03, 0.16, 0.01);
    P.cyl(M.white, 0.035, 0.03, 0.08, -0.22, 0.94, 0.08, 12); P.cyl(M.white, 0.035, 0.03, 0.08, 0.24, 0.94, 0.0, 12);
    P.collide(0.7, 0.5, 1.36);
  },
  kneeboard_shelf(P, M) {
    P.rbox(M.oak, 1.0, 1.1, 0.4, 0, 0.55, 0, 0.01);
    for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) { P.rbox(M.black, 0.2, 0.26, 0.02, -0.36 + k * 0.24, 0.22 + i * 0.33, 0.12, 0.004); P.rbox(M.white, 0.16, 0.2, 0.004, -0.36 + k * 0.24, 0.23 + i * 0.33, 0.132, 0); }
    P.collide(1.0, 0.42, 1.1);
  },
  headset_rack(P, M) {
    P.rbox(M.oak, 1.2, 0.5, 0.025, 0, 1.45, 0.0125, 0.006);
    for (let k = 0; k < 5; k++) {
      const x = -0.48 + k * 0.24;
      P.rbox(M.chrome, 0.02, 0.02, 0.1, x, 1.58, 0.07, 0.005);
      const band = new THREE.TorusGeometry(0.075, 0.012, 6, 18, Math.PI); band.translate(x, 1.5, 0.12); P.add(M.black, band);
      for (const s of [-1, 1]) { const cup = new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14); cup.rotateZ(Math.PI / 2); cup.translate(x + s * 0.075, 1.48, 0.12); P.add(k % 2 ? M.navyHard : M.black, cup); }
      const mic = new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4); mic.rotateX(Math.PI / 2.4); mic.translate(x + 0.06, 1.44, 0.17); P.add(M.black, mic);
    }
  },
  sim_station(P, M) {
    P.rbox(M.white, 1.6, 0.035, 0.8, 0, 0.74, 0, 0.008);
    for (const x of [-0.77, 0.77]) P.rbox(M.metal, 0.04, 0.72, 0.7, x, 0.36, 0, 0.006);
    const mon = (x, ry, seed) => { P.rbox(M.bezel, 0.56, 0.34, 0.03, x, 1.05, -0.24, 0.008); const f = P.face(pfd(seed), 0.53, 0.31, x, 1.05, -0.222, { emissive: 0.7, px: 256, key: 'pfd' + seed }); P.cyl(M.metal, 0.02, 0.02, 0.18, x, 0.85, -0.26, 8); return f; };
    mon(-0.56, 0, 1); mon(0, 0, 2); mon(0.56, 0, 4);
    // the yoke and its column, the throttle quadrant
    P.rbox(M.black, 0.16, 0.12, 0.3, 0, 0.82, 0.12, 0.02);
    { const col = new THREE.CylinderGeometry(0.015, 0.015, 0.18, 8); col.rotateX(Math.PI / 2); col.translate(0, 0.85, 0.32); P.add(M.chrome, col); }
    P.rbox(M.black, 0.34, 0.035, 0.035, 0, 0.88, 0.42, 0.012); for (const s of [-1, 1]) P.rbox(M.black, 0.035, 0.12, 0.035, s * 0.16, 0.93, 0.42, 0.012);
    P.rbox(M.black, 0.16, 0.1, 0.22, 0.46, 0.8, 0.12, 0.015);
    [M.black, M.navyHard, M.red].forEach((m, i) => P.rbox(m, 0.025, 0.12, 0.025, 0.42 + i * 0.04, 0.89, 0.12, 0.008));   // throttle, propeller, mixture
    P.collide(1.62, 0.82, 1.22);
  },
  model_aircraft_stand(P, M, opts) {
    P.rbox(M.white, 0.42, 0.95, 0.42, 0, 0.475, 0, 0.02);
    P.cyl(M.chrome, 0.01, 0.01, 0.22, 0, 1.06, 0, 8);
    const FL = globalThis.FL;
    if (FL && FL.acmesh) {
      const A = FL.physics.AIRCRAFT.find(x => x.id === (/seminole/i.test(opts.note || '') ? 'pa44' : 'pa28'));
      const geos = [];
      for (const p of exteriorParts(FL, A, { lod: 'far', reg: A.id === 'pa28' ? 'N731SY' : undefined })) {
        if (p.disc != null) continue;
        for (const m of p.cabin ? [p.mesh, p.cabin] : [p.mesh]) {
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(m.pos.slice(), 3)); g.setAttribute('normal', new THREE.BufferAttribute(m.nrm.slice(), 3));
          const c = new Float32Array(m.col.length); for (let i = 0; i < c.length; i++) c[i] = toLin(m.col[i]); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
          geos.push(g);
        }
      }
      const g = mergeGeometries(geos); g.scale(1 / 13, 1 / 13, 1 / 13); g.rotateY(Math.PI * 0.8); g.rotateZ(0.08); g.translate(0, 1.2, 0);
      P.add(MODEL_MAT(), g);
    }
    P.collide(0.44, 0.44, 1.3);
  },
  flag_stand(P, M) {
    P.cyl(M.chrome, 0.16, 0.18, 0.04, 0, 0.02, 0, 18); P.cyl(M.chrome, 0.015, 0.015, 2.3, 0, 1.15, 0, 8); const tip = new THREE.SphereGeometry(0.03, 10, 8); tip.translate(0, 2.32, 0); P.add(M.gold, tip);
    P.face(flagFace, 0.9, 0.6, 0.46, 1.9, 0.0, { px: 256, both: true, key: 'flag' });
    P.collide(0.36, 0.36, 2.3);
  },
  // ---------------------------------------------------------------- wall pieces: the back at z = 0
  whiteboard(P, M, opts) {
    const y = opts.y ?? 1.45;
    P.rbox(M.alu, 2.42, 1.22, 0.025, 0, y, 0.0125, 0.008);
    P.face(opts.draw || slide('ホワイトボード', ''), 2.36, 1.16, 0, y, 0.026, { px: 1024, rough: 0.25 });
    P.rbox(M.alu, 1.4, 0.03, 0.07, 0, y - 0.62, 0.04, 0.008);
    for (const [x, m] of [[-0.3, M.navyHard], [-0.2, M.red], [-0.1, M.black]]) { const g = new THREE.CylinderGeometry(0.009, 0.009, 0.13, 8); g.rotateZ(Math.PI / 2); g.translate(x, y - 0.595, 0.05); P.add(m, g); }
    P.anchors.push({ key: 'board', x: 0, y, z: 0.03 });
  },
  wall_screen(P, M, opts) {
    const y = opts.y ?? 1.6;
    P.rbox(M.bezel, 1.42, 0.82, 0.05, 0, y, 0.035, 0.01);
    P.face(opts.draw || slide('翔洋航空 フライトアカデミー', 'SHOYO FLIGHT ACADEMY'), 1.36, 0.765, 0, y, 0.061, { emissive: 0.9, px: 1024, rough: 0.12 });
    P.anchors.push({ key: 'screen', x: 0, y, z: 0.06 });
  },
  flight_status_board(P, M, opts) {
    const y = opts.y ?? 2.6;
    P.rbox(M.bezel, 3.3, 1.5, 0.08, 0, y, 0.05, 0.012);
    P.face(opts.draw || slide('本日のフライト', ''), 3.2, 1.4, 0, y, 0.091, { emissive: 1.1, px: 1536, rough: 0.12 });
    P.anchors.push({ key: 'screen', x: 0, y, z: 0.09 });
  },
  bulletin_board(P, M, opts) {
    const y = opts.y ?? 1.5;
    P.rbox(M.oak, 1.84, 1.04, 0.03, 0, y, 0.015, 0.006);
    P.face(opts.draw || ((g, w, h) => { g.fillStyle = '#b98a57'; g.fillRect(0, 0, w, h); }), 1.76, 0.96, 0, y, 0.031, { px: 1024, rough: 0.85 });
    P.anchors.push({ key: 'board', x: 0, y, z: 0.03 });
  },
  map_wall(P, M, opts) {
    const y = opts.y ?? 1.6;
    P.rbox(M.black, 3.64, 1.64, 0.025, 0, y, 0.0125, 0.006);
    P.face(opts.draw || ((g, w, h) => { g.fillStyle = '#e8ecd9'; g.fillRect(0, 0, w, h); }), 3.56, 1.56, 0, y, 0.026, { px: 2048, rough: 0.6, key: opts.key || null });
    P.anchors.push({ key: 'map', x: 0, y, z: 0.03 });
  },
  sign_board(P, M, opts) {
    const y = opts.y ?? 2.3, note = opts.note || '';
    const text = opts.text ? [opts.text.title, (opts.text.lines || []).join(' ')] : /south/.test(note) ? ['↑ ブリーフィング室・訓練装置室', 'Briefing · FTD'] : /north/.test(note) ? ['← 運航管理　↑ パイロットルーム・ラウンジ', 'Dispatch · Pilot room · Lounge'] : /plaque/.test(note) ? ['翔洋航空 フライトアカデミー', '架空の訓練所 · A FICTIONAL ACADEMY'] : ['案内', ''];
    const w = /plaque/.test(note) ? 0.9 : 1.6, h = /plaque/.test(note) ? 0.5 : 0.36;
    P.rbox(/plaque/.test(note) ? M.gold : M.navyHard, w + 0.04, h + 0.04, 0.03, 0, y, 0.015, 0.006);
    P.face(signFace(text[0], text[1]), w, h, 0, y, 0.031, { px: 1024, emissive: /plaque/.test(note) ? 0 : 0.25 });
  },
  wall_clock(P, M, opts) {
    const y = opts.y ?? 2.2;
    const g = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 32); g.rotateX(Math.PI / 2); g.translate(0, y, 0.02); P.add(M.black, g);
    P.face(clockFace, 0.32, 0.32, 0, y, 0.041, { px: 256, key: 'clock' });
  },
  exit_sign(P, M, opts) {
    const y = opts.y ?? 2.45;
    P.rbox(M.white, 0.42, 0.18, 0.06, 0, y, 0.03, 0.006);
    P.face(exitFace, 0.38, 0.14, 0, y, 0.061, { emissive: 2.0, px: 512, key: 'exit' });
  },
  ceiling_light(P, M) {
    P.rbox(M.white, 0.62, 0.035, 1.22, 0, -0.0175, 0, 0.004);
    const g = new THREE.PlaneGeometry(0.56, 1.16); g.rotateX(Math.PI / 2); g.translate(0, -0.036, 0); P.add(LIGHT_MAT(), g);
  },
};
let modelMat = null, lightMat = null;
const MODEL_MAT = () => modelMat || (modelMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }));
const LIGHT_MAT = () => lightMat || (lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e8, emissiveIntensity: 2.6, roughness: 0.6 }));

// the palette for plain materials (cached: the kit may be built more than once with the same materials)
let PAL = null;
function paletteFor(mats) {
  if (PAL && mats.every(m => PAL.uv.has(m))) return PAL;
  const all = [...new Set([...(PAL ? PAL.uv.keys() : []), ...mats])], N = 16, C = 4;    // 16 × 16 cells of 4 px
  if (all.length > N * N) throw new Error('props: too many plain materials for the palette');
  const col = document.createElement('canvas'), rm = document.createElement('canvas');
  col.width = col.height = rm.width = rm.height = N * C;
  const gc = col.getContext('2d'), gr = rm.getContext('2d'), uv = new Map();
  all.forEach((m, i) => {
    const x = (i % N) * C, y = Math.floor(i / N) * C;
    gc.fillStyle = '#' + m.color.getHexString(); gc.fillRect(x, y, C, C);
    gr.fillStyle = `rgb(0,${Math.round(m.roughness * 255)},${Math.round(m.metalness * 255)})`; gr.fillRect(x, y, C, C);
    uv.set(m, [(x + C / 2) / (N * C), 1 - (y + C / 2) / (N * C)]);
  });
  const tex = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
  const rmTex = tex(rm, false);
  const material = new THREE.MeshStandardMaterial({ map: tex(col, true), roughnessMap: rmTex, metalnessMap: rmTex, roughness: 1, metalness: 1 });
  material.name = 'props-palette';
  if (PAL) PAL.material.dispose();
  PAL = { uv, material };
  return PAL;
}

export function createPropKit() {
  const M = materials();
  const placed = [];
  return {
    types: () => Object.keys(BUILDERS),
    place(type, { a, c, rot = 0, y = 0, opts = {} } = {}) {
      const b = BUILDERS[type];
      const P = new Piece();
      if (!b) { console.warn('props: unknown type', type); P.rbox(M.grey, 0.5, 0.5, 0.5, 0, 0.25, 0); P.collide(0.5, 0.5, 0.5); }
      else b(P, M, { ...opts, note: opts.note });
      placed.push({ type, a, c, rot, y: type === 'ceiling_light' ? y : (WALL.has(type) ? 0 : y), P });
      return P;
    },
    // zoneOf(a, c) → a key (a room): pieces are merged per zone and material, so a room out of view is not drawn
    build({ zoneOf = () => '' } = {}) {
      const group = new THREE.Group(); group.name = 'props';
      const buckets = new Map(), colliders = [], anchors = [];
      const bucket = (mat, zone) => { const k = mat.uuid + '|' + zone; if (!buckets.has(k)) buckets.set(k, { mat, geos: [] }); return buckets.get(k).geos; };
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      for (const it of placed) {
        const th = -(it.rot + 90) * DEG;
        q.setFromAxisAngle(up, th); m4.compose(new THREE.Vector3(it.c, it.y, -it.a), q, new THREE.Vector3(1, 1, 1));
        const zone = zoneOf(it.a, it.c);
        for (const [mat, g0] of it.P.parts) { const g = (g0.index ? g0.toNonIndexed() : g0); g.applyMatrix4(m4); bucket(mat, zone).push(g); }
        for (const [mat, g0] of it.P.faces) { const g = g0.index ? g0.toNonIndexed() : g0; g.applyMatrix4(m4); bucket(mat, zone).push(g); }
        if (it.P.box) colliders.push({ ...placeBox(it.P.box, it.c, -it.a, it.rot), type: it.type });
        for (const an of it.P.anchors) { const v = new THREE.Vector3(an.x, an.y, an.z).applyMatrix4(m4); anchors.push({ type: it.type, key: an.key, a: -v.z, c: v.x, x: v.x, y: v.y, z: v.z }); }
      }
      // plain materials (one colour, roughness and metalness, no texture) share one material per zone: a small palette
      // texture holds their colours (map) and their roughness and metalness (G and B of the roughness / metalness map),
      // and each piece's uv points at its cell. Fewer draw calls in the rooms and in the shadow pass.
      const plain = (m) => m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && !m.map && !m.emissiveMap && !m.userData.face && m !== LIGHT_MAT() && m.emissive.getHex() === 0;
      const pal = paletteFor([...new Set([...buckets.values()].map(b => b.mat).filter(plain))]);
      const merged = new Map();
      for (const [k, b] of buckets) {
        if (!plain(b.mat)) { merged.set(k, b); continue; }
        const [u, v] = pal.uv.get(b.mat), zone = k.slice(k.indexOf('|') + 1), key = 'palette|' + zone;
        for (const g of b.geos) { const n = g.attributes.position.count, uv = new Float32Array(n * 2); for (let i = 0; i < n; i++) { uv[i * 2] = u; uv[i * 2 + 1] = v; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
        if (!merged.has(key)) merged.set(key, { mat: pal.material, geos: [] });
        merged.get(key).geos.push(...b.geos);
      }
      for (const [key, { mat, geos }] of merged) {
        const attrs = new Set(['position', 'normal', 'uv', 'color']);
        const hasColor = geos.some(g => g.attributes.color), hasUv = geos.every(g => g.attributes.uv);
        const geo = mergeGeometries(geos.map(g => {
          for (const k of Object.keys(g.attributes)) if (!attrs.has(k) || (k === 'uv' && !hasUv) || (k === 'color' && !hasColor)) g.deleteAttribute(k);
          if (hasColor && !g.attributes.color) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
          g.clearGroups(); return g;
        }));
        if (!geo) continue;
        const isFace = !!mat.userData.face;
        const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mat !== LIGHT_MAT() && !isFace; mesh.receiveShadow = true; mesh.name = 'props-merged';
        mesh.userData.zone = key.slice(key.indexOf('|') + 1); mesh.userData.shadow = mesh.castShadow;
        group.add(mesh);
      }
      return { group, colliders, anchors, lights: [] };
    },
  };
}
