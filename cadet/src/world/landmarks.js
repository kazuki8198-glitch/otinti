// CADET — world/landmarks.js : FLIGHT LAB's teaching landmarks (fictional): the coloured towers at the training points
// LAB-A … LAB-F and the LAB VOR (a Doppler VOR: a raised round counterpoise with a ring of antennas).
// Positions from FL.avionics (the same points the lessons and the G1000-type map use). NOT FOR NAVIGATION.
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
  return { group };
}
