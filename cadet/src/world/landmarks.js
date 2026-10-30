// CADET — world/landmarks.js : FLIGHT LAB's teaching landmarks (fictional): the coloured towers at the training points
// LAB-A … LAB-F and the LAB VOR (a Doppler VOR: a raised round counterpoise with a ring of antennas).
// Positions from FL.avionics (the same points the lessons and the G1000-type map use). NOT FOR NAVIGATION.
// (B1.2/B1.3-lite) the world beyond the field: a small town on the cross-country route (instanced houses, a
// church, a school), a river bending between two lakes past it, and the northern mountains — silhouettes
// only, no colliders, a handful of draw calls for the depth they give the horizon.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TOWERS = [['LABEA', 0xf28c1f], ['LABEB', 0x33bf4d], ['LABEC', 0x3380f2], ['LABED', 0xf2d826], ['LABEF', 0xe640cc]];

export function buildLandmarks(L, FL) {
  const group = new THREE.Group(); group.name = 'landmarks';
  const A = FL.avionics, G = L.G;
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.5, metalness: 0.2 });
  for (const [id, hex] of TOWERS) {
    const w = A.wpt(id); if (!w) continue;
    const [x, , z] = L.toLocal(w.n, w.e);
    const col = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, metalness: 0.2 });
    const bands = { col: [], white: [] };
    for (let k = 0; k < 8; k++) {
      const r0 = 3.2 - k * 0.22, r1 = 3.2 - (k + 1) * 0.22;
      const g = new THREE.CylinderGeometry(r1, r0, 10, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, k * 10 + 5, 0);
      (k % 2 ? bands.white : bands.col).push(g);
    }
    const ball = new THREE.OctahedronGeometry(8, 1); ball.translate(0, 92, 0); bands.col.push(ball);
    const t = new THREE.Group(); t.position.set(x, G, z);
    for (const [k, mat] of [['col', col], ['white', white]]) { const m = new THREE.Mesh(mergeGeometries(bands[k].map(g => (g.index ? g.toNonIndexed() : g))), mat); m.castShadow = true; m.receiveShadow = true; t.add(m); }
    // an obstruction light on top
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff2010, emissiveIntensity: 4 }));
    lamp.position.y = 100.6; t.add(lamp);
    group.add(t);
  }
  for (const n of A.NAVAIDS || []) if (n.type === 'VOR') {
    const [x, , z] = L.toLocal(n.n, n.e);
    const v = new THREE.Group(); v.position.set(x, G, z);
    const parts = { white: [], steel: [] };
    const disc = new THREE.CylinderGeometry(15, 15, 0.35, 64); disc.translate(0, 4.2, 0); parts.white.push(disc);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, leg = new THREE.CylinderGeometry(0.15, 0.15, 4, 6); leg.translate(Math.cos(a) * 11, 2, Math.sin(a) * 11); parts.steel.push(leg); }
    const hut = new THREE.BoxGeometry(5, 3, 4); hut.translate(0, 1.5, 0); parts.white.push(hut);
    for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2, ant = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 4); ant.translate(Math.cos(a) * 13.5, 5.2, Math.sin(a) * 13.5); parts.steel.push(ant); }
    const cone = new THREE.ConeGeometry(1.1, 3.0, 16); cone.translate(0, 5.9, 0); parts.white.push(cone);
    const steel = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.4, metalness: 0.7 });
    for (const [k, mat] of [['white', white], ['steel', steel]]) { const m = new THREE.Mesh(mergeGeometries(parts[k].map(g => g.toNonIndexed())), mat); m.castShadow = true; m.receiveShadow = true; v.add(m); }
    group.add(v);
  }

  // ---------------------------------------------------------------- the town, the river, the mountains
  const rngT = (s0) => { let s = s0 >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const TOWN = { n: 8000, e: -30000 };                       // on the LAB → LAB-B route, at cross-country distance
  {
    const r = rngT(20261030);
    const [tx, , tz] = L.toLocal(TOWN.n, TOWN.e);
    const town = new THREE.Group(); town.position.set(tx, G, tz); town.name = 'town';
    // the houses and shops: one instanced box, ninety-odd of them in a loose grid with jitter
    const N = 92, box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    const inst = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }), N);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3();
    const palette = [0xd8cfc0, 0xc9b8a3, 0xb7c0c8, 0xd0b48f, 0xa8b39a, 0xc4cdd4].map(h => new THREE.Color(h));
    for (let i = 0; i < N; i++) {
      const gx = (i % 10 - 4.5) * 62 + (r() - 0.5) * 30, gz = (Math.floor(i / 10) - 4.5) * 58 + (r() - 0.5) * 28;
      const w = 11 + r() * 12, d = 10 + r() * 10, h = 6 + r() * 12;
      E.set(0, (r() - 0.5) * 0.24, 0); Q.setFromEuler(E); V.set(gx, 0, gz); SC.set(w, h, d);
      M.compose(V, Q, SC); inst.setMatrixAt(i, M); inst.setColorAt(i, palette[(r() * palette.length) | 0]);
    }
    inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    town.add(inst);
    // the church: a tower and a spire, the town's landmark from the air
    const churchMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.8 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(7, 24, 7), churchMat); tower.position.set(6, 12, -4); town.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(5.4, 12, 4), new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.7 }));
    spire.position.set(6, 30, -4); spire.rotation.y = Math.PI / 4; town.add(spire);
    const nave = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 8), churchMat); nave.position.set(17, 4, -4); town.add(nave);
    // the school: one long low block, lighter than the houses
    const school = new THREE.Mesh(new THREE.BoxGeometry(34, 8, 13), new THREE.MeshStandardMaterial({ color: 0xdcd6c2, roughness: 0.85 }));
    school.position.set(-30, 4, 26); town.add(school);
    group.add(town);
  }
  {
    // the river: a ribbon bending from the western lake to the LAB-B lake, passing south of the town
    const pts = [[6000, -36500], [7600, -34100], [9200, -31200], [10900, -28400], [12500, -26000]].map(([n, e]) => L.toLocal(n, e));
    const W2 = 34, pos = [], idx = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], q0 = pts[Math.max(i - 1, 0)];
      let dx = q[0] - q0[0], dz = q[2] - q0[2]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      pos.push(p[0] - dz * W2, G + 0.35, p[2] + dx * W2, p[0] + dz * W2, G + 0.35, p[2] - dx * W2);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const river = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x39586e, roughness: 0.25, metalness: 0.1 }));
    river.name = 'river'; group.add(river);
  }
  {
    // the northern mountains: a merged ridge of broad cones at the horizon, unlit and hazed by distance —
    // a depth cue only (nothing collides, nothing lands there)
    const r = rngT(777), cones = [];
    for (let i = 0; i < 8; i++) {
      const n = 37000 + r() * 5000, e = -58000 + i * 8200 + r() * 2600, h = 900 + r() * 900, rad = 5200 + r() * 2600;
      const [x, , z] = L.toLocal(n, e);
      const c = new THREE.ConeGeometry(rad, h, 7); c.translate(x, G + h / 2 - 30, z); cones.push(c);
    }
    const ridge = new THREE.Mesh(mergeGeometries(cones.map(c => c.toNonIndexed())), new THREE.MeshBasicMaterial({ color: 0x8799b0 }));
    ridge.name = 'mountains'; group.add(ridge);
  }
  return { group };
}
