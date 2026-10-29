// CADET — render/textures.js : the embedded photo textures (data URLs from the build, CC0 ambientCG) and textures
// drawn at start-up on canvases (no files: signs, runway numerals, corrugated metal, window grids).
import * as THREE from 'three';

const cache = new Map();
const COLOR = new Set(['asphalt_c', 'concrete_c', 'grass_c', 'plaster_c', 'concrete2_c']);   // the rest are data (normals, roughness)

export async function loadTextures(onProgress = () => {}) {
  const A = globalThis.CADET_ASSETS || {};
  const keys = Object.keys(A).filter(k => k.startsWith('tex/'));
  let done = 0;
  await Promise.all(keys.map(async k => {
    const img = new Image();
    img.src = A[k];
    await img.decode();
    const t = new THREE.Texture(img);
    const name = k.slice(4);
    t.colorSpace = COLOR.has(name) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    cache.set(name, t);
    onProgress(++done / keys.length, name);
  }));
}
export const tex = name => { const t = cache.get(name); if (!t) throw new Error('texture missing: ' + name); return t; };
export function setAnisotropy(n) { for (const t of cache.values()) { t.anisotropy = n; t.needsUpdate = true; } for (const t of made) { t.anisotropy = n; t.needsUpdate = true; } }

// ---------------------------------------------------------------- canvas textures
const made = [];
export function canvasTexture(w, h, draw, { srgb = true, repeat = false, mips = true } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = mips; t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  made.push(t);
  return t;
}

// deterministic random numbers (the same scenery every time)
export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Runway numerals drawn as strokes (the blocky FAA shapes, not a font: the same on every computer).
// Each digit in a 3 × 5 box (units: 1 = a third of the width), traced with thick square lines.
const DIGITS = {
  '0': [[[0, 0], [3, 0], [3, 5], [0, 5], [0, 0]]],
  '1': [[[1.5, 0], [1.5, 5]], [[0.6, 0.9], [1.5, 0]]],
  '2': [[[0, 0.9], [0.6, 0], [3, 0], [3, 2.3], [0, 4.2], [0, 5], [3, 5]]],
  '3': [[[0, 0], [3, 0], [3, 5], [0, 5]], [[0.8, 2.5], [3, 2.5]]],
  '4': [[[2.4, 5], [2.4, 0], [0, 3.4], [3, 3.4]]],
  '5': [[[3, 0], [0, 0], [0, 2.3], [3, 2.3], [3, 5], [0, 5]]],
  '6': [[[3, 0], [0, 0], [0, 5], [3, 5], [3, 2.4], [0, 2.4]]],
  '7': [[[0, 0], [3, 0], [1.2, 5]]],
  '8': [[[0, 0], [3, 0], [3, 5], [0, 5], [0, 0]], [[0, 2.5], [3, 2.5]]],
  '9': [[[3, 2.6], [0, 2.6], [0, 0], [3, 0], [3, 5], [0, 5]]],
};
// a texture with the text in white on transparent; the digits fill the height
export function numeralTexture(text, px = 1024) {
  const n = text.length, cw = px * 0.34, gap = px * 0.14, W = Math.ceil(n * cw + (n - 1) * gap + px * 0.08), H = px;
  return canvasTexture(W, H, (g) => {
    g.clearRect(0, 0, W, H);
    g.strokeStyle = '#fff'; g.lineJoin = 'miter'; g.lineCap = 'square'; g.lineWidth = px * 0.075;
    const pad = px * 0.03, sx = (cw - g.lineWidth) / 3, sy = (H - 2 * pad - g.lineWidth) / 5;
    [...text].forEach((ch, i) => {
      const ox = px * 0.04 + i * (cw + gap) + g.lineWidth / 2, oy = pad + g.lineWidth / 2;
      for (const path of DIGITS[ch] || []) {
        g.beginPath(); path.forEach(([x, y], k) => (k ? g.lineTo : g.moveTo).call(g, ox + x * sx, oy + y * sy)); g.stroke();
      }
    });
  }, { mips: true });
}

// a sign face: text on a coloured panel with a border (FAA sign colours)
export function signTexture(parts, { h = 256 } = {}) {
  // parts: [{ text, bg, fg, w }] side by side
  const W = parts.reduce((s, p) => s + (p.w || 1) * h * 1.15, 0);
  return canvasTexture(Math.ceil(W), h, (g) => {
    let x = 0;
    for (const p of parts) {
      const w = (p.w || 1) * h * 1.15;
      g.fillStyle = p.bg; g.fillRect(x, 0, w, h);
      if (p.border) { g.strokeStyle = p.border; g.lineWidth = h * 0.05; g.strokeRect(x + h * 0.08, h * 0.08, w - h * 0.16, h * 0.84); }
      g.fillStyle = p.fg; g.font = `700 ${Math.round(h * 0.66)}px "Arial Narrow", Arial, "Helvetica Neue", sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(p.text, x + w / 2, h * 0.54);
      x += w;
    }
  });
}

// corrugated metal (normal map, data): ridges across u
export function corrugatedNormal() {
  return canvasTexture(256, 8, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let x = 0; x < w; x++) {
      const a = x / w * Math.PI * 2 * 4, dz = Math.cos(a) * 0.55;            // slope of the ridges
      const nx = -dz, nz = 1, l = Math.hypot(nx, nz);
      for (let y = 0; y < h; y++) { const i = (y * w + x) * 4; img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = 128; img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255; }
    }
    g.putImageData(img, 0, 0);
  }, { srgb: false, repeat: true });
}

// window band: glass panes with mullions (colour; alpha unused). One texture tile = one bay.
export function windowTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#2b3138'; g.fillRect(0, 0, w, h);                              // frame
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5d7387'); gr.addColorStop(1, '#2a3a48');
    g.fillStyle = gr; g.fillRect(10, 10, w - 20, h * 0.62 - 10); g.fillRect(10, h * 0.62 + 6, w - 20, h - h * 0.62 - 16);
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(10, 10, (w - 20) * 0.45, h * 0.62 - 10);
  }, { repeat: true });
}
// the same layout as data for the glass mask (white = glass): used as a roughness/metal-free map
export function windowMask() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.fillRect(10, 10, w - 20, h * 0.62 - 10); g.fillRect(10, h * 0.62 + 6, w - 20, h - h * 0.62 - 16);
  }, { srgb: false, repeat: true });
}
