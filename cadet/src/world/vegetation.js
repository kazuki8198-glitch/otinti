// CADET — world/vegetation.js : trees (live oaks, slash pines, sabal palms, shrubs) and the farm buildings.
// The scattered clumps use FLIGHT LAB's own placement (the same random sequence, seed 42), so the landscape matches
// what FLIGHT LAB pilots know; the academy's grounds get their own palms and oaks.
// Soft low-poly trees made at start-up (no files): displaced spheres with smooth "cloud" normals and vertex colours.
// Close trees are full models with shadows and a little wind; far trees are a cheap version (the same instances).
import * as THREE from 'three';
import { rng } from '../render/textures.js';
import { CONNECTORS } from './airfield.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

// 3D value noise for displacement
function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t, h = (i, j, k) => hash3(xi + i, yi + j, zi + k);
  return L(L(L(h(0, 0, 0), h(1, 0, 0), u), L(h(0, 1, 0), h(1, 1, 0), u), v), L(L(h(0, 0, 1), h(1, 0, 1), u), L(h(0, 1, 1), h(1, 1, 1), u), v), w);
}

// ---------------------------------------------------------------- a mesh builder with vertex colours
class TreeGeo {
  constructor() { this.pos = []; this.nrm = []; this.col = []; }
  // a puff of foliage: a displaced icosphere; normals blend the puff's and the crown's outward directions (soft look)
  puff(c, r, crownC, crownR, base, top, detail = 2, rough = 0.28, seed = 0) {
    const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, tmp = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      tmp.fromBufferAttribute(p, i);
      const d = tmp.clone().normalize();
      const k = 1 + rough * (noise3(tmp.x * 0.9 + seed, tmp.y * 0.9, tmp.z * 0.9) - 0.5) * 2 + 0.12 * (noise3(tmp.x * 2.3, tmp.y * 2.3 + seed, tmp.z * 2.3) - 0.5);
      tmp.multiplyScalar(k).add(c);
      const nc = tmp.clone().sub(crownC).divideScalar(crownR);
      const n = d.multiplyScalar(0.55).add(nc.multiplyScalar(0.45)).normalize();
      // colour: darker inside and underneath, lighter on top, a little noise
      const hgt = THREE.MathUtils.clamp((tmp.y - (crownC.y - crownR)) / (2 * crownR), 0, 1);
      const shade = (0.52 + 0.55 * hgt) * (0.88 + 0.24 * noise3(tmp.x * 0.5, tmp.y * 0.5, tmp.z * 0.5 + seed));
      const col = base.clone().lerp(top, hgt * 0.8).multiplyScalar(shade);
      this.pos.push(tmp.x, tmp.y, tmp.z); this.nrm.push(n.x, n.y, n.z); this.col.push(col.r, col.g, col.b);
    }
    return this;
  }
  // a tapered tube from a to b (bark)
  limb(a, b, r0, r1, col, seg = 7) {
    const g = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), seg, 1, true).toNonIndexed();
    const dir = b.clone().sub(a).normalize(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
    g.applyQuaternion(q); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i)); this.nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      const s = 0.8 + 0.3 * noise3(p.getX(i) * 3, p.getY(i) * 3, p.getZ(i) * 3); this.col.push(col.r * s, col.g * s, col.b * s);
    }
    return this;
  }
  // a palm frond: a fan of leaflets (a pleated sector) at the end of a stem
  frond(origin, yaw, droop, len, col) {
    const stemEnd = V(Math.cos(yaw) * len * 0.35, -droop * 0.15 + len * 0.12, Math.sin(yaw) * len * 0.35).add(origin);
    this.limb(origin, stemEnd, 0.06, 0.04, col.clone().multiplyScalar(0.8), 4);
    const N = 14, spread = 2.2, R = len * 0.65;
    for (let i = 0; i < N; i++) {
      const a0 = yaw - spread / 2 + spread * i / N, a1 = yaw - spread / 2 + spread * (i + 1) / N, am = (a0 + a1) / 2;
      const tip = (a, r) => { const t = r / R; return V(Math.cos(a) * r, -droop * t * t + 0.25 * t * R * 0.3, Math.sin(a) * r).add(stemEnd); };
      const pl = (i % 2 ? 0.12 : -0.05);
      const A = stemEnd, B = tip(a0, R * 0.95), C = tip(am, R).add(V(0, pl, 0)), D = tip(a1, R * 0.95);
      for (const [p, q, r] of [[A, B, C], [A, C, D]]) {
        const n = q.clone().sub(p).cross(r.clone().sub(p)).normalize(); if (n.y < 0) n.negate();
        n.lerp(V(0, 1, 0), 0.5).normalize();
        for (const v of [p, q, r]) { const s = 0.75 + 0.35 * (v.distanceTo(A) / R); this.pos.push(v.x, v.y, v.z); this.nrm.push(n.x, n.y, n.z); this.col.push(col.r * s, col.g * s, col.b * s); }
      }
    }
    return this;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }
}

const BARK = lin(0.36, 0.31, 0.26), BARK_P = lin(0.45, 0.38, 0.30), PALM_TRUNK = lin(0.55, 0.50, 0.42);
// lod: 0 = close (full), 1 = middle distance, 2 = far (one puff, no trunk detail)
function oak(seed, lod) {
  const r = rng(seed), t = new TreeGeo(), H = 8 + r() * 3, W = 6 + r() * 2.5;
  const crownC = V(0, H, 0), base = lin(0.20, 0.30, 0.12), top = lin(0.38, 0.50, 0.20);
  if (lod === 2) { t.limb(V(0, 0, 0), V(0, H * 0.5, 0), 0.5, 0.4, BARK, 3); t.puff(V(0, H, 0), W * 0.95, crownC, W, base, top, 0, 0.25, seed); return t.build(); }
  t.limb(V(0, 0, 0), V(0, H * 0.45, 0), 0.45, 0.35, BARK, lod ? 5 : 8);
  if (!lod) for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + r(); t.limb(V(0, H * 0.4, 0), V(Math.cos(a) * W * 0.55, H * 0.75 + r(), Math.sin(a) * W * 0.55), 0.28, 0.12, BARK, 5); }
  const n = lod ? 4 : 8;
  for (let i = 0; i < n; i++) {
    const a = lod ? i / n * 6.28 + r() : r() * 6.28, d = (lod ? 0.45 : 0.25 + r() * 0.6) * W, c = V(Math.cos(a) * d, H + (r() - 0.35) * 2.6, Math.sin(a) * d);
    t.puff(c, (lod ? 3.4 : 2.4 + r() * 1.6), crownC, W, base, top, lod ? 1 : 2, 0.3, seed + i);
  }
  return t.build();
}
function pine(seed, lod) {
  const r = rng(seed), t = new TreeGeo(), H = 15 + r() * 5;
  const crownC = V(0, H, 0), base = lin(0.13, 0.22, 0.10), top = lin(0.24, 0.36, 0.15);
  t.limb(V(0, 0, 0), V(0, H + 1, 0), 0.32, 0.14, BARK_P, lod === 2 ? 3 : lod ? 5 : 7);
  if (lod === 2) { t.puff(V(0, H, 0), 3.0, crownC, 3, base, top, 0, 0.3, seed); return t.build(); }
  const n = lod ? 2 : 6;
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = r() * 2.2, c = V(Math.cos(a) * d, H - 1.5 + r() * 3, Math.sin(a) * d);
    t.puff(c, lod ? 2.6 : 1.5 + r() * 1.2, crownC, 3, base, top, lod ? 1 : 2, 0.35, seed * 3 + i);
  }
  if (!lod) for (let i = 0; i < 3; i++) { const a = r() * 6.28; t.limb(V(0, H - 2, 0), V(Math.cos(a) * 2, H - 0.5, Math.sin(a) * 2), 0.1, 0.05, BARK_P, 4); }
  return t.build();
}
function palm(seed, lod) {
  const r = rng(seed), t = new TreeGeo(), H = 6 + r() * 3, lean = (r() - 0.5) * 0.8;
  const top = V(lean, H, lean * 0.5);
  const segs = lod ? 2 : 6;
  for (let i = 0; i < segs; i++) {
    const a = V(lean * (i / segs) ** 2, H * i / segs, lean * 0.5 * (i / segs) ** 2), b = V(lean * ((i + 1) / segs) ** 2, H * (i + 1) / segs, lean * 0.5 * ((i + 1) / segs) ** 2);
    t.limb(a, b, 0.24 + 0.02 * Math.sin(i * 2), 0.23, PALM_TRUNK, lod ? 4 : 8);
  }
  const green = lin(0.27, 0.42, 0.15);
  if (lod === 2) { t.puff(top, 2.6, top, 2.6, green.clone().multiplyScalar(0.7), green, 0, 0.35, seed); return t.build(); }
  const nF = lod ? 7 : 15;
  for (let i = 0; i < nF; i++) { const yaw = i / nF * 6.28 + r() * 0.4; t.frond(top, yaw, 1.0 + r() * 1.6, 3.4 + r() * 0.8, green.clone().multiplyScalar(0.85 + r() * 0.3)); }
  t.puff(top.clone().add(V(0, 0.1, 0)), 0.45, top, 0.5, lin(0.3, 0.32, 0.2), lin(0.36, 0.38, 0.22), 1, 0.2, seed);
  return t.build();
}
function shrub(seed) {
  const r = rng(seed), t = new TreeGeo(), c = V(0, 0.7, 0), base = lin(0.17, 0.27, 0.11), top = lin(0.32, 0.44, 0.18);
  for (let i = 0; i < 4; i++) { const a = r() * 6.28; t.puff(V(Math.cos(a) * 0.7, 0.6 + r() * 0.4, Math.sin(a) * 0.7), 0.8 + r() * 0.4, c, 1.3, base, top, 1, 0.3, seed + i); }
  return t.build();
}
function farmhouse() {
  // a unit house (1 × 1 × 1 walls and a pitched roof), scaled per instance; vertex colours: walls white, roof dark
  const t = new TreeGeo(), wall = lin(0.86, 0.84, 0.78), roof = lin(0.42, 0.40, 0.40);
  const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(); g.translate(0, 0.5, 0);
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { t.pos.push(p.getX(i), p.getY(i), p.getZ(i)); t.nrm.push(n.getX(i), n.getY(i), n.getZ(i)); t.col.push(wall.r, wall.g, wall.b); }
  const R = [V(-0.55, 1, -0.55), V(0.55, 1, -0.55), V(0.55, 1, 0.55), V(-0.55, 1, 0.55), V(0, 1.45, -0.55), V(0, 1.45, 0.55)];
  const tri = (a, b, c, col) => { const nn = b.clone().sub(a).cross(c.clone().sub(a)).normalize(); for (const v of [a, b, c]) { t.pos.push(v.x, v.y, v.z); t.nrm.push(nn.x, nn.y, nn.z); t.col.push(col.r, col.g, col.b); } };
  tri(R[0], R[4], R[5], roof); tri(R[0], R[5], R[3], roof); tri(R[1], R[2], R[5], roof); tri(R[1], R[5], R[4], roof);
  tri(R[0], R[1], R[4], wall); tri(R[3], R[5], R[2], wall);
  return t.build();
}

// ---------------------------------------------------------------- placement
export function buildVegetation(L, FL, { quality }) {
  const group = new THREE.Group(); group.name = 'vegetation';
  const P = FL.physics, R = L.R;
  const items = { oak: [], pine: [], palm: [], shrub: [], house: [] };      // [x, z, scale, yaw, tint, sx, sy, sz]
  const lakeNear = (n, e, k = 1.3) => P.LAKES.some(Lk => Math.hypot(n - Lk[0], e - Lk[1]) < Lk[2] * k);
  // FLIGHT LAB's clumps (same random sequence), outside the airfield and the approach areas, away from Sanford's area
  const r = rng(42), r2 = rng(4242);
  for (let i = 0; i < 2600; i++) {
    const n = R.n + (r() - 0.5) * 50000, e = R.e + (r() - 0.5) * 50000;
    if (e > -16000) continue;
    const rc = P.rwyCoords(R, n, e); if (rc.along > -900 && rc.along < R.len + 900 && Math.abs(rc.cross) < 450) continue;
    if (lakeNear(n, e)) continue;
    const [x, , z] = L.toLocal(n, e);
    if (r() < 0.82) {
      const k = 2 + Math.floor(r() * 5);
      for (let j = 0; j < k; j++) {
        const dx = (r() - 0.5) * 60, dz = (r() - 0.5) * 60, h = r(), rad = r(), col = r();   // (FLIGHT LAB's draws, kept in step)
        r(); r();
        const kind = r2() < 0.45 ? 'pine' : r2() < 0.12 ? 'palm' : 'oak';
        items[kind].push([x + dx, z + dz, 0.8 + 0.5 * h, r2() * 6.28, 0.85 + 0.3 * col]);
      }
    } else {
      const w = 8 + r() * 14, d = 6 + r() * 10, h = 4 + r() * 4; r(); r();
      items.house.push([x, z, 1, Math.round(r2() * 4) * Math.PI / 2 + (r2() - 0.5) * 0.2, 0.9 + 0.2 * r2(), w, h, d]);
      for (let j = 0; j < 3; j++) items.oak.push([x + (r2() - 0.5) * 50, z + (r2() - 0.5) * 50, 0.9 + 0.3 * r2(), r2() * 6.28, 1]);
    }
  }
  // the academy grounds: palms along the walkway and the car park, oaks in the car park and a tree line to the east
  const rf = (a, c) => { const v = L.rwyToLocal(a, c); return [v[0], v[2]]; };
  const r3 = rng(77);
  for (let a = 612; a <= 700; a += 11) if (a < 644 || a > 666) { const [x, z] = rf(a, 246.5); items.palm.push([x, z, 0.95 + 0.15 * r3(), r3() * 6.28, 1]); }
  for (let a = 566; a <= 720; a += 15) { const [x, z] = rf(a, 287); items.palm.push([x, z, 0.9 + 0.2 * r3(), r3() * 6.28, 1]); }
  for (let a = 572; a <= 715; a += 22) { const [x, z] = rf(a, 316); items.oak.push([x, z, 0.75 + 0.15 * r3(), r3() * 6.28, 1]); }
  for (let a = 440; a <= 800; a += 12) for (const c of [372, 395, 418]) { if (r3() < 0.25) continue; const [x, z] = rf(a + (r3() - 0.5) * 8, c + (r3() - 0.5) * 10); items[r3() < 0.3 ? 'pine' : 'oak'].push([x, z, 0.8 + 0.4 * r3(), r3() * 6.28, 0.9 + 0.2 * r3()]); }
  for (let a = 612; a <= 700; a += 4) { if (a > 642 && a < 668) continue; const [x, z] = rf(a, 279.8); items.shrub.push([x, z, 0.8 + 0.3 * r3(), r3() * 6.28, 1]); }
  // scattered oaks and palms along the airfield's boundary (well clear of the runway and the approaches)
  for (let i = 0; i < 260; i++) {
    const a = -1400 + r3() * (R.len + 2800), c = (r3() < 0.5 ? -1 : 1) * (430 + r3() * 900);
    if (a > -950 && a < R.len + 950 && Math.abs(c) < 460) continue;
    const [x, z] = rf(a, c); items[r3() < 0.2 ? 'palm' : r3() < 0.4 ? 'pine' : 'oak'].push([x, z, 0.8 + 0.5 * r3(), r3() * 6.28, 0.85 + 0.3 * r3()]);
  }

  // ---------------------------------------------------------------- meshes
  // three rings around the camera: close (full trees, shadows), middle (simpler trees), far (one puff each, every tree,
  // hidden by the shader inside the middle ring and beyond the haze)
  const nearR = () => Math.min(420, U.uNearR.value * 0.3);
  const U = { uTime: { value: 0 }, uNearC: { value: new THREE.Vector3(0, 0, 0) }, uNearR: { value: quality.treeNear }, uFarR: { value: 14000 } };
  const makeMat = (far) => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime, uNearR, uFarR; uniform vec3 uNearC;')
        .replace('#include <begin_vertex>', /* glsl */`#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec3 ip = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
            float hk = max(position.y - 2.0, 0.0) / 10.0;
            float ph = dot(ip.xz, vec2(0.05, 0.07));
            transformed.x += sin(uTime * 1.3 + ph) * 0.10 * hk * hk;
            transformed.z += cos(uTime * 1.1 + ph * 1.3) * 0.08 * hk * hk;
            ${far ? 'float dc = distance((modelMatrix * vec4(ip, 1.0)).xz, uNearC.xz); if (dc < uNearR || dc > uFarR) transformed *= 0.0;' : ''}
          #endif`);
    };
    m.customProgramCacheKey = () => 'cadet-tree-' + far;
    return m;
  };
  const nearMat = makeMat(false), farMat = makeMat(true);
  const GEO = {
    oak: [[oak(11, 0), oak(12, 0), oak(13, 0)], [oak(11, 1), oak(12, 1), oak(13, 1)], oak(14, 2)],
    pine: [[pine(21, 0), pine(22, 0)], [pine(21, 1), pine(22, 1)], pine(23, 2)],
    palm: [[palm(31, 0), palm(32, 0), palm(33, 0)], [palm(31, 1), palm(32, 1), palm(33, 1)], palm(34, 2)],
    shrub: [[shrub(41), shrub(42)], [shrub(41), shrub(42)], null],
  };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), tp = new THREE.Vector3(), col = new THREE.Color();
  const y0 = L.G;
  const setInst = (mesh, i, it) => {
    q.setFromAxisAngle(V(0, 1, 0), it[3]); sc.setScalar(it[2]); tp.set(it[0], y0, it[1]);
    m4.compose(tp, q, sc); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, col.setScalar(it[4]));
  };
  const rings = [];                                  // { mesh, ring: 0 close | 1 middle, items }
  for (const [kind, [close, middle, farGeo]] of Object.entries(GEO)) {
    const list = items[kind];
    if (farGeo) {
      const fm = new THREE.InstancedMesh(farGeo, farMat, list.length);
      list.forEach((it, i) => setInst(fm, i, it));
      fm.computeBoundingSphere(); fm.name = 'trees-far-' + kind; group.add(fm);
    }
    for (const [ring, geos] of [[0, close], [1, middle]]) geos.forEach((g, vi) => {
      const mine = list.filter((_, i) => i % geos.length === vi);
      const nm = new THREE.InstancedMesh(g, nearMat, Math.max(1, Math.min(mine.length, ring === 0 ? 600 : 2500)));
      nm.castShadow = ring === 0; nm.receiveShadow = true; nm.count = 0; nm.frustumCulled = false; nm.name = `trees-${ring ? 'mid' : 'close'}-${kind}-${vi}`;
      group.add(nm); rings.push({ mesh: nm, ring, items: mine });
    });
  }
  // farm buildings
  const houses = new THREE.InstancedMesh(farmhouse(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), Math.max(1, items.house.length));
  items.house.forEach((it, i) => { q.setFromAxisAngle(V(0, 1, 0), it[3]); sc.set(it[5], it[6], it[7]); tp.set(it[0], y0, it[1]); m4.compose(tp, q, sc); houses.setMatrixAt(i, m4); houses.setColorAt(i, col.setScalar(it[4])); });
  houses.castShadow = true; houses.receiveShadow = true; houses.computeBoundingSphere(); group.add(houses);

  let last = null;
  function refill(cam) {
    U.uNearC.value.set(cam.x, 0, cam.z);
    const R1 = nearR() ** 2, R2 = U.uNearR.value ** 2;
    for (const { mesh, ring, items: its } of rings) {
      let k = 0; const cap = mesh.instanceMatrix.count;
      for (const it of its) {
        const dx = it[0] - cam.x, dz = it[1] - cam.z, d2 = dx * dx + dz * dz;
        if ((ring === 0 ? d2 < R1 : d2 >= R1 && d2 < R2) && k < cap) setInst(mesh, k++, it);
      }
      mesh.count = k; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  const counts = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.length]));
  return {
    group, counts,
    // the trees near a point (world x, z), for the walker's colliders: [x, z, scale, kind]
    near(x, z, r) { const out = []; for (const [k, list] of Object.entries(items)) if (k !== 'house') for (const it of list) if (Math.hypot(it[0] - x, it[1] - z) < r) out.push([it[0], it[1], it[2], k]); return out; },
    setNearRadius(r) { U.uNearR.value = r; last = null; },
    update(t, cam) {
      U.uTime.value = t;
      if (!last || Math.hypot(cam.x - last.x, cam.z - last.z) > 60) { last = cam.clone(); refill(cam); }
    },
  };
}
export { CONNECTORS };
