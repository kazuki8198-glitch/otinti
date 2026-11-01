// CADET — world/clouds.js : a few fair-weather cumulus around the training area, as soft billboards.
// The flat cloud layer in the sky shader has no height, so low down there is nothing with a lit top, a flat
// base and a shadowed underside to steer by. These are not models: the loaders read no UVs (CLAUDE.md §3-1),
// so a glb cumulus could only be vertex-coloured blobs with hard edges. Instead each cloud is a canvas
// painting (drawn at start-up like the signs and the window grids, so it costs no HTML bytes and no file),
// a cluster of soft puffs with the shading baked in — bright tops, a grey flat base — on a plane that yaws
// to face the camera. The tint follows the sun (its colour reddens at the low sun on its own), and the whole
// set fades out as the day's overcast closes in, where the flat layer takes over. Visual only: nothing here
// is in the collision world, and no lesson reads it.
// Count follows the cloudDetail preset (0 = none, 0.5 = the nearer four, 1 = all seven plus a small
// neighbour puff each). Placement keeps clear of the field itself and sits at fair-weather bases
// (1,100–1,400 m) round the practice area, far enough apart that they read as separate towers.
import * as THREE from 'three';
import { canvasTexture, rng } from '../render/textures.js';

const W = 512, H = 288, BASE = 0.80;                    // the painting's size; the cloud base sits 80% down it

// one cumulus painting: overlapping radial puffs (the silhouette), then the shading laid over the shape
// only (source-atop): light from above, the base greying down to its flat underside, and a few bites taken
// out of the outline (destination-out) so the edge reads cauliflower, not cut-out. The puffs are laid as
// one mass — two towers close together, shoulders and a dome filling between them, a wide base row — and
// their gradients run near-opaque through the core: a first version with separated towers and soft cores
// read in the game as two faint snowmen, so the mass and the core alpha are the point here.
function cumulusTexture(seed) {
  return canvasTexture(W, H, (g) => {
    const r = rng(seed), j = (a) => (r() - 0.5) * a;
    const puffs = [];
    const top = 0.21 + r() * 0.08;
    for (const fx of [0.40, 0.60]) {                                  // the two towers
      const steps = 3 + Math.floor(r() * 2);
      for (let s = 0; s <= steps; s++) {
        const k = s / steps;                                          // 0 at the base, 1 at the tower's top
        puffs.push({ x: fx + j(0.05), y: BASE - 0.03 - k * (BASE - top) + j(0.02), r: (0.35 - 0.11 * k) * (0.9 + r() * 0.2) });
      }
    }
    puffs.push({ x: 0.50 + j(0.04), y: top + 0.10 + j(0.02), r: 0.31 });          // the dome between the tops
    puffs.push({ x: 0.25 + j(0.03), y: BASE - 0.17 + j(0.02), r: 0.26 });         // the shoulders
    puffs.push({ x: 0.75 + j(0.03), y: BASE - 0.17 + j(0.02), r: 0.26 });
    puffs.push({ x: 0.33 + j(0.03), y: BASE - 0.09 + j(0.02), r: 0.29 });
    puffs.push({ x: 0.67 + j(0.03), y: BASE - 0.09 + j(0.02), r: 0.29 });
    for (let x = 0.20; x <= 0.84; x += 0.058 + r() * 0.02) puffs.push({ x: x + j(0.02), y: BASE - 0.05 + j(0.015), r: 0.17 + r() * 0.05 });   // the base row, narrower than the body
    for (const p of puffs) {
      const px = p.x * W, py = p.y * H, pr = p.r * H, v = 230 + Math.floor(r() * 25);   // each puff a shade of its own: where they stack, the mass lightens
      const gr = g.createRadialGradient(px, py, pr * 0.08, px, py, pr);
      gr.addColorStop(0, `rgba(${v},${v},${v},0.95)`); gr.addColorStop(0.45, `rgba(${v},${v},${v},0.78)`); gr.addColorStop(0.75, `rgba(${v},${v},${v},0.38)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-atop';
    const shade = g.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, 'rgba(255,255,255,0.12)'); shade.addColorStop(0.5, 'rgba(255,255,255,0)');
    shade.addColorStop(0.68, 'rgba(72,82,98,0.12)'); shade.addColorStop(0.84, 'rgba(66,76,92,0.30)'); shade.addColorStop(1, 'rgba(52,60,74,0.55)');
    g.fillStyle = shade; g.fillRect(0, 0, W, H);
    // the underside as its own plate: from any height but directly below, the base is a shadowed floor,
    // visibly darker than the body above it — without the band the lower half reads as a white slab
    // wherever it crosses dark fields
    const plate = g.createLinearGradient(0, (BASE - 0.07) * H, 0, (BASE + 0.01) * H);
    plate.addColorStop(0, 'rgba(58,68,82,0)'); plate.addColorStop(1, 'rgba(58,68,82,0.38)');
    g.fillStyle = plate; g.fillRect(0, (BASE - 0.07) * H, W, H * 0.1);
    // the flat base: a cumulus bottom is a level line, not a skirt — fade what hangs below it out over a
    // short fringe (tens of metres at a cloud's scale)
    g.globalCompositeOperation = 'destination-out';
    const cut = g.createLinearGradient(0, (BASE - 0.02) * H, 0, (BASE + 0.07) * H);
    cut.addColorStop(0, 'rgba(0,0,0,0)'); cut.addColorStop(0.3, 'rgba(0,0,0,0)'); cut.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = cut; g.fillRect(0, (BASE - 0.02) * H, W, H);
    const bite = rng(seed + 5);
    for (let i = 0; i < 18; i++) {
      const a = bite() * Math.PI * 2, px = W * (0.5 + Math.cos(a) * (0.32 + bite() * 0.13)), py = H * (0.47 + Math.sin(a) * (0.31 + bite() * 0.09)), pr = 6 + bite() * 16;
      const gr = g.createRadialGradient(px, py, 0, px, py, pr);
      gr.addColorStop(0, 'rgba(0,0,0,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  });
}

// [x, z] local (x east, z −north), base above the ground (m), width (m), painting
const SPOTS = [
  { x: 5200, z: -4200, base: 1150, w: 1500, v: 0 },
  { x: -6800, z: -2600, base: 1260, w: 1850, v: 1 },
  { x: -4200, z: 5800, base: 1080, w: 1300, v: 2 },
  { x: 7600, z: 2600, base: 1330, w: 1650, v: 0 },
  { x: 1800, z: -8800, base: 1180, w: 1450, v: 1 },
  { x: -9400, z: 900, base: 1420, w: 1950, v: 2 },
  { x: 10200, z: -7000, base: 1230, w: 1550, v: 1 },
];
const DRIFT = new THREE.Vector2(0.83, 0.55);            // the sea breeze's push (and the flat layer's drift sense)
const WHITE = new THREE.Color(1, 1, 1);

export function buildClouds(L, FL, { quality }) {
  const group = new THREE.Group(); group.name = 'clouds';
  const detail = quality.cloudDetail ?? 1;
  const items = [];
  if (detail > 0) {
    const texs = [cumulusTexture(101), cumulusTexture(202), cumulusTexture(303)];
    const geo = new THREE.PlaneGeometry(1, 1);
    const spots = detail >= 1 ? SPOTS : SPOTS.slice(0, 4);
    const add = (s, w, dx, dz, lift) => {
      // depth, carefully: the haze pass (post.js) reads the depth texture, and a cloud that writes none is
      // hazed by whatever ground lies behind it on screen — its base flattened into the fields' haze.
      // Writing depth for the whole quad was worse (the clear corners wrote too, and the rectangle showed
      // against the ground). alphaTest threads it: fragments under 0.35 alpha are discarded before they
      // can write, so the depth follows the painting's solid core, the soft edge still blends without
      // depth, and the pass haze the body by its own distance.
      const mat = new THREE.MeshBasicMaterial({ map: texs[s.v], transparent: true, depthWrite: true, alphaTest: 0.35, side: THREE.DoubleSide, fog: false });
      const m = new THREE.Mesh(geo, mat);
      const h = w * (H / W);
      m.scale.set(w, h, 1);
      m.renderOrder = 10;
      m.position.set(s.x + dx, L.G + s.base + lift + h * (BASE - 0.5), s.z + dz);   // centre, so the painting's base line (BASE down it) sits on the cloud base
      group.add(m);
      items.push({ m, mat, w, hx: s.x + dx, hz: s.z + dz, phase: items.length * 3700 });
    };
    for (const s of spots) {
      add(s, s.w, 0, 0, 0);
      if (detail >= 1) add(s, s.w * 0.45, s.w * 0.52, s.w * 0.20, 50);          // a smaller neighbour tower
    }
  }
  const tint = new THREE.Color();
  return {
    group,
    update(t, camPos, sky) {
      if (!items.length) return;
      const st = sky.state;
      const dayK = THREE.MathUtils.smoothstep(st.el, -3, 9);
      // the sun's own colour, kept at half strength (it reddens at the low sun; full strength painted the
      // whole cloud orange), dimmed by day and by the overcast that replaces these with the flat deck.
      // The level is the flat clouds' own: their colour in the sky shader is an HDR value around 2, and at
      // 1 these billboards tonemapped to a washed grey against them.
      tint.copy(sky.sun.color).lerp(WHITE, 0.5).multiplyScalar((0.16 + 0.84 * dayK) * (1.05 - 0.30 * st.overcast) * 2.0);
      const alpha = 0.96 * (1 - 0.90 * st.overcast) * (0.35 + 0.65 * dayK);
      for (const it of items) {
        const off = ((t * 5.5 + it.phase) % 26000) - 13000;
        it.m.position.x = it.hx + DRIFT.x * off; it.m.position.z = it.hz + DRIFT.y * off;
        const dx = camPos.x - it.m.position.x, dy = camPos.y - it.m.position.y, dz = camPos.z - it.m.position.z;
        it.m.rotation.y = Math.atan2(dx, dz);
        const dist = Math.hypot(dx, dy, dz), horiz = Math.max(Math.hypot(dx, dz), 1);
        const near = THREE.MathUtils.smoothstep(dist, it.w * 0.5, it.w * 1.05);          // inside it: gone, not sliced
        const far = 1 - THREE.MathUtils.smoothstep(dist, 34000, 52000);
        const graze = 1 - THREE.MathUtils.smoothstep(Math.atan2(Math.abs(dy), horiz), 0.55, 0.85);   // seen edge-on it would be a sliver
        it.mat.opacity = alpha * near * far * graze;
        it.mat.color.copy(tint);
        it.m.visible = it.mat.opacity > 0.015;
      }
    },
  };
}
