// CADET — npc/crowd.js (node --test): everyone standing drawn as one skinned mesh. Checked: every vertex of the
// crowd's mesh lands where the person's own mesh puts it (after they have moved, turned and gestured), in both
// details; the nearest two within 5 m of the eye are drawn near, everyone else far; only the people
// drawn are in the ranges drawn (hidden, far or seated people are not); a talking mouth and a pointing hand are the
// person's own meshes then, and their copies in the crowd are folded away; the people outdoors are drawn by the
// mesh that casts the sun's shadow, the people indoors by the one that does not.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createActor, SEATED_PA28 } from '../src/npc/actor.js';
import { createCrowd } from '../src/npc/crowd.js';

function setup() {
  const scene = new THREE.Scene(), room = new THREE.Group(); room.position.set(30, 0, -12); room.rotation.y = 0.4; scene.add(room);
  const a = createActor({ seed: 3 }), b = createActor({ seed: 7, height: 1.62, look: { hair: 'bun' } });
  a.root.position.set(2, 0, -1); a.root.rotation.y = 1.1; b.root.position.set(-1.5, 0, 3);
  room.add(a.root); room.add(b.root);
  const outside = new Set();
  const crowd = createCrowd(scene, { outdoors: (root) => outside.has(root) });
  crowd.add(a); crowd.add(b);
  return { scene, room, a, b, crowd, outside };
}
// the crowd mesh's vertex i in the world, as the GPU skins it
function skinned(mesh, i, out) {
  mesh.getVertexPosition(i, out);
  return out.applyMatrix4(mesh.matrixWorld);
}

test('crowd: each vertex where the person\'s own mesh puts it, after moving, turning and gesturing', () => {
  const { scene, a, b, crowd } = setup();
  for (let k = 0; k < 40; k++) { a.update(1 / 30, { lookAt: new THREE.Vector3(0, 1.6, 0) }); b.update(1 / 30, { talking: false }); }
  a.gesture('nod'); a.root.position.x += 0.7; a.root.rotation.y -= 0.5;
  for (let k = 0; k < 10; k++) a.update(1 / 30);
  crowd.update(); scene.updateMatrixWorld(true); crowd.meshes[0].skeleton.update();
  assert.equal(crowd.drawn, 2);
  // the meshes of both people, in the order the crowd took them (everyone's far detail, then everyone's near detail —
  // their own meshes): positions, compared vertex by vertex
  const own = [];
  for (const lod of ['far', 'near']) for (const x of [a, b]) for (const m of x.meshes) {
    const g = lod === 'far' ? x.farGeometry(m) : m.geometry;
    own.push({ m, g, n: g.attributes.position.count });
  }
  const v = new THREE.Vector3(), w = new THREE.Vector3();
  let i = 0, worst = 0, where = '';
  for (const o of own) {
    const pos = o.g.attributes.position;
    for (let j = 0; j < o.n; j++, i++) {
      if (o.m.name === 'actor-mouth') continue;                   // (the mouth's morph: checked below with the slots)
      w.fromBufferAttribute(pos, j).applyMatrix4(o.m.matrixWorld);
      const d = skinned(crowd.meshes[0], i, v).distanceTo(w); if (d > worst) { worst = d; where = o.m.name; }
    }
  }
  assert.equal(i, crowd.meshes[0].geometry.attributes.position.count, 'every vertex of the crowd is one of a person\'s');
  assert.ok(worst < 1e-5, `a vertex ${worst} m from where the person's own mesh has it (${where})`);
  // the people's own meshes are not drawn (the mouth and hands only while talking or pointing)
  for (const x of [a, b]) for (const m of x.meshes) assert.equal(m.visible, false, m.name);
});

test('crowd: the people near the eye are drawn in the near detail — the nearest two within 5 m; the rest far', () => {
  const { scene, room, a, b, crowd } = setup();
  const c = createActor({ seed: 9 }); room.add(c.root); crowd.add(c);
  // (positions in the room: a at (2, −1); b and c put where each case needs them)
  const put = (x, px, pz) => { x.root.position.set(px, 0, pz); scene.updateMatrixWorld(true); };
  const drawn = () => crowd.meshes[0].geometry.groups.reduce((n, g) => n + g.count, 0) / 3;
  const eye = room.localToWorld(new THREE.Vector3(2, 1.6, 0));          // 1 m from a
  put(b, -6, 4); put(c, 8, 6);
  crowd.update();
  assert.deepEqual(crowd.near, [], 'no eye: all far');
  assert.equal(crowd.meshes[0].geometry.groups.length, 1, 'all far: one draw call');
  assert.equal(drawn(), a.trianglesFar + b.trianglesFar + c.trianglesFar, 'all far: their far triangles');
  crowd.update(eye);
  assert.deepEqual(crowd.near, [a], 'a near, b and c (more than 5 m away) far');
  const own = a.meshes.reduce((n, m) => n + m.geometry.index.count / 3, 0);  // (its own meshes: the near detail)
  assert.equal(drawn(), own + b.trianglesFar + c.trianglesFar, 'a drawn from its near detail');
  put(b, 3.2, -1); put(c, -0.5, -1);                                    // b 1.6 m, c 2.7 m from the eye
  crowd.update(eye);
  assert.deepEqual(new Set(crowd.near), new Set([a, b]), 'all three within 5 m: the nearest two');
});

test('crowd: only the people drawn are drawn — hidden, out of the scene or seated people are not', () => {
  const { scene, room, a, b, crowd } = setup();
  crowd.update();
  const total = (a.trianglesFar + b.trianglesFar) * 3;                  // (no eye given: both far)
  assert.deepEqual(crowd.meshes[0].geometry.groups.map(g => [g.start, g.count]), [[0, total]], 'both: one range, one draw call');
  b.root.visible = false; crowd.update();
  assert.equal(crowd.drawn, 1); assert.equal(crowd.meshes[0].geometry.groups.length, 1);
  assert.ok(crowd.meshes[0].geometry.groups[0].count < total);
  room.visible = false; crowd.update();
  assert.equal(crowd.drawn, 0); assert.equal(crowd.meshes[0].visible, false, 'no one drawn: the mesh is not drawn');
  room.visible = true; b.root.visible = true;
  // seated (the cockpit): their own meshes, out of the crowd
  assert.equal(a.setSeated(SEATED_PA28.seat), true); a.update(1 / 30); crowd.update();
  assert.equal(crowd.drawn, 1);
  assert.ok(a.meshes.every(m => m.visible), 'seated: all their own meshes');
  const B = crowd.meshes[0].skeleton.bones;
  assert.ok(a.crowd.view.on === false && B.slice(0, 5).every(x => !Object.values(a.bones).includes(x)), 'their bones in the crowd folded');
  a.setSeated(null); a.update(1 / 30); crowd.update();
  assert.equal(crowd.drawn, 2);
  assert.ok(a.meshes.every(m => !m.visible));
  room.remove(a.root); crowd.update();
  assert.equal(crowd.drawn, 1, 'out of the scene: not drawn');
  void scene;
});

test('crowd: a talking mouth and a pointing hand are the person\'s own meshes; their copies are folded away', () => {
  const { a, crowd } = setup();
  const mouth = a.meshes.find(m => m.name === 'actor-mouth'), hand = a.meshes.find(m => m.name === 'actor-handL');
  for (let k = 0; k < 30; k++) a.update(1 / 30, { talking: true });
  crowd.update();
  assert.equal(mouth.visible, true, 'talking: the mouth of its own (its morph target)');
  const B = crowd.meshes[0].skeleton.bones, slot = (name) => B.indexOf(a.root.getObjectByName(name));
  assert.equal(slot('actor-slot-mouth'), -1, 'the crowd\'s copy of the mouth folded');
  for (let k = 0; k < 60; k++) a.update(1 / 30, { talking: false });
  crowd.update();
  assert.equal(mouth.visible, false); assert.ok(slot('actor-slot-mouth') >= 0, 'quiet: the mouth in the crowd again');
  // pointing with the left hand: that hand of its own (the pointing shape)
  a.pointAt(new THREE.Vector3(40, 1.5, -20)); a.gesture('point');
  let seen = false;
  for (let k = 0; k < 90; k++) { a.update(1 / 30); crowd.update(); if (hand.visible) { seen = true; assert.equal(slot('actor-slot-handL'), -1); } }
  assert.ok(seen || a.meshes.find(m => m.name === 'actor-handR').visible, 'a pointing hand shown as its own mesh');
});

test('crowd: the people outdoors cast the sun\'s shadow, the people indoors do not', () => {
  const { a, b, crowd, outside } = setup();
  crowd.update();
  const [inner, outer] = crowd.meshes, count = (m) => (m.visible ? m.geometry.groups.reduce((n, g) => n + g.count, 0) : 0);
  assert.deepEqual([inner.castShadow, outer.castShadow], [false, true]);
  assert.deepEqual([inner.visible, outer.visible], [true, false], 'both indoors');
  const all = count(inner);
  outside.add(b.root); crowd.update();
  assert.deepEqual([inner.visible, outer.visible], [true, true]);
  assert.equal(count(inner) + count(outer), all, 'each person in one of the two');
  assert.ok(count(outer) > 0 && count(outer) < all);
  b.root.visible = false; crowd.update();
  assert.equal(outer.visible, false, 'the one outdoors not drawn');
  void a;
});
