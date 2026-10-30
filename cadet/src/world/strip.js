// CADET — world/strip.js : the second airfield, drawn (B2.5): the uncontrolled grass strip at LAB-F.
// A mown strip (a lighter green than the field around it), white corner and threshold markers, a
// windsock, a dirt apron and one hut. Six draw calls. No colliders: you land on the grass, and the
// physics' grass is what your wheels feel — the strip is the place the nav data (flight/airfields.js)
// names. The sock is still (LAB's own sock is the animated one).
import * as THREE from 'three';

export function buildStrip(L, strip) {
  const group = new THREE.Group(); group.name = 'strip-' + strip.id;
  const [cx, , cz] = L.toLocal(strip.n, strip.e);
  group.position.set(cx, L.G, cz);
  group.rotation.y = (90 - strip.trueHdg) * Math.PI / 180;   // local +x onto the strip's direction
  // the mown strip
  const mown = new THREE.Mesh(new THREE.PlaneGeometry(strip.len, strip.wid),
    new THREE.MeshStandardMaterial({ color: 0x7fa35e, roughness: 1 }));
  mown.rotation.x = -Math.PI / 2; mown.position.y = 0.22; mown.receiveShadow = true; group.add(mown);
  // the markers: white blocks at the thresholds and the corners (one instanced mesh)
  const block = new THREE.BoxGeometry(3, 0.5, 1.2);
  const inst = new THREE.InstancedMesh(block, new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.8 }), 12);
  const M = new THREE.Matrix4();
  const spots = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) spots.push([sx * (strip.len / 2 - 2), sz * (strip.wid / 2 + 1.5)]);
  for (const sx of [-1, 1]) for (let k = -1; k <= 1; k++) spots.push([sx * (strip.len / 2 - 6), k * 6]);
  spots.forEach(([x, z], i) => { M.makeTranslation(x, 0.3, z); inst.setMatrixAt(i, M); });
  inst.instanceMatrix.needsUpdate = true; group.add(inst);
  // the apron: a dirt pad beside the middle, and the hut
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(34, 22), new THREE.MeshStandardMaterial({ color: 0x9a8a70, roughness: 1 }));
  apron.rotation.x = -Math.PI / 2; apron.position.set(10, 0.2, strip.wid / 2 + 16); apron.receiveShadow = true; group.add(apron);
  const hut = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 5), new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: 0.9 }));
  hut.position.set(2, 1.6, strip.wid / 2 + 20); hut.castShadow = true; group.add(hut);
  // the windsock: a pole and an orange cone, lying along the strip
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6, 6), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.5, metalness: 0.6 }));
  pole.position.set(-strip.len / 2 + 30, 3, strip.wid / 2 + 6); group.add(pole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 8), new THREE.MeshStandardMaterial({ color: 0xe8762a, roughness: 0.8 }));
  sock.rotation.z = Math.PI / 2 - 0.18; sock.position.set(-strip.len / 2 + 31.4, 5.8, strip.wid / 2 + 6); group.add(sock);
  return { group };
}
