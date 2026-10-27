// CADET — actor tests (node --test): the instructor's body (src/npc/actor.js), without a browser.
//  - it builds within budget: ≤ 8,000 triangles far from the eye (as the crowd draws most people), ≤ 16,000 up close,
//    ≤ 20 meshes, 1.70–1.78 m tall, feet at y = 0, facing +z;
//  - 600 frames with a moving lookAt (talking or not) stay finite, and the head turns only within human limits while the
//    eyes do the first 15°; someone behind is not followed round;
//  - every gesture plays, then the body is back in exactly the pose it would have had without it;
//  - 'point' aims the right arm at pointAt()'s target, wherever the actor stands;
//  - update() works on the same objects every frame (no per-frame allocation);
//  - seated in the Archer's right seat (setSeated, SEATED_PA28, seatFromBody): the hips and ankles where they were put,
//    knees up, hands on the thighs, looking round at the student; every gesture plays seated, keeps clear of the door
//    and the roof, and ends in the seated rest; explaining is a small movement over the lap; pointing at the student's
//    side of the panel is done low, the elbow bent, with the nearer (left) arm, never up in front of the student's face
//    nor over the PFD as the student sees it; standing up again is exactly standing;
//  - the models made in Blender (assets/model/actor.glb, actor-near.glb): each look within the budget, every face turned the way its
//    normals say (it is drawn one-sided), the mouth's morph target, the name plate's letters.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createActor, LIMITS, GESTURE_NAMES, SEATED_PA28, seatFromBody } from '../src/npc/actor.js';
import { actorModel } from '../src/npc/actor-model.js';

const DEG = Math.PI / 180;
const DT = 1 / 60;
const SIDES2 = ['L', 'R'];
const run = (a, seconds, o = {}) => { for (let t = 0; t < seconds - 1e-9; t += DT) a.update(DT, o); };
const finite = (...v) => v.every(Number.isFinite);
const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'upperArmL', 'forearmL', 'handL', 'shoulderR', 'upperArmR', 'forearmR', 'handR',
  'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
// the head's forward (+z) in the actor's own frame: yaw and pitch (radians)
const _q = new THREE.Quaternion(), _r = new THREE.Quaternion(), _f = new THREE.Vector3();
function headAngles(a) {
  a.root.updateWorldMatrix(true, true);
  a.bones.head.getWorldQuaternion(_q); a.root.getWorldQuaternion(_r);
  _f.set(0, 0, 1).applyQuaternion(_q).applyQuaternion(_r.invert());
  return { yaw: Math.atan2(_f.x, _f.z), pitch: Math.atan2(_f.y, Math.hypot(_f.x, _f.z)) };
}
const angleTo = (q0, q1) => q0.angleTo(q1);
// how far each eye's line of sight passes from the target (radians, the worse eye)
const _p = new THREE.Vector3();
function gazeError(a, target) {
  a.root.updateWorldMatrix(true, true);
  let worst = 0;
  for (const n of ['eyeL', 'eyeR']) {
    a.bones[n].getWorldPosition(_p); a.bones[n].getWorldQuaternion(_q);
    worst = Math.max(worst, _f.set(0, 0, 1).applyQuaternion(_q).angleTo(_p.subVectors(target, _p)));
  }
  return worst;
}

test('actor: builds within budget, the right size and the right way round', () => {
  const a = createActor();
  assert.ok(a.root instanceof THREE.Group);
  let meshes = 0, tris = 0;
  a.root.traverse(o => { if (o.isMesh) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
  assert.ok(meshes <= 20, `${meshes} meshes`);
  assert.ok(a.trianglesFar <= 8000, `far: ${a.trianglesFar} triangles`);
  assert.ok(a.triangles <= 16000, `near: ${a.triangles} triangles`);
  assert.ok(tris <= a.triangles, `counted ${tris} > reported ${a.triangles}`);
  assert.equal(a.radius, 0.3);
  a.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(a.root, true), h = box.max.y - box.min.y;
  assert.ok(Math.abs(box.min.y) < 0.004, `feet at y = ${box.min.y}`);
  assert.ok(h >= 1.70 && h <= 1.78, `height ${h}`);
  assert.ok(box.max.x - box.min.x < 0.7 && box.max.z - box.min.z < 0.45, 'a person-sized footprint');
  assert.ok(Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z) <= a.radius + 0.01, 'inside the walker collider');
  // the face and the toes point to +z
  const eyes = a.headWorld(new THREE.Vector3());
  assert.ok(eyes.y > 1.55 && eyes.y < 1.68, `eyes at ${eyes.y}`);
  assert.ok(eyes.z > 0.05, `eyes at z ${eyes.z}`);
  const foot = new THREE.Box3().setFromObject(a.bones.footL, true);
  assert.ok(foot.max.z > 0.18 && foot.min.z > -0.1, 'toes forwards');
  // every body part casts a shadow (the tiny face parts may not); one shared material, and one of its own for the mouth
  // (the only morph target: sharing a material with it would switch the shader program every frame)
  for (const n of ['torso', 'hips', 'head', 'upperArmL', 'forearmR', 'handL', 'thighR', 'shinL', 'footR']) {
    const m = a.meshes.find(x => x.name === 'actor-' + n);
    assert.ok(m && m.castShadow, `${n} casts a shadow`);
  }
  const morph = a.meshes.filter(m => m.geometry.morphAttributes.position), plain = a.meshes.filter(m => !m.geometry.morphAttributes.position);
  assert.deepEqual(morph.map(m => m.name), ['actor-mouth']);
  assert.equal(new Set(plain.map(m => m.material)).size, 1);
  assert.ok(!plain.some(m => m.material === morph[0].material), 'the mouth\'s material is its own');
  assert.equal(morph[0].material.roughnessMap, plain[0].material.roughnessMap, 'with the same palette');
  assert.equal(createActor().meshes.find(m => m.name === 'actor-mouth').material, morph[0].material, 'and shared by every actor');
  for (const m of a.meshes) for (const k of ['position', 'normal', 'color', 'uv']) assert.ok(m.geometry.attributes[k], `${m.name}: ${k}`);
  // another height scales the whole body
  const b = createActor({ height: 1.71 }); b.root.updateMatrixWorld(true);
  const hb = new THREE.Box3().setFromObject(b.root, true);
  assert.ok(Math.abs(hb.max.y - 1.71) < 0.005, `scaled to ${hb.max.y}`);
});

test('actor: 600 frames with a moving lookAt stay finite and within the head\'s limits', () => {
  for (const talking of [false, true]) {
    const a = createActor({ seed: talking ? 3 : 1 });
    a.root.position.set(2, 0, -1); a.root.rotation.y = 0.7;
    a.root.updateMatrixWorld(true);
    const look = new THREE.Vector3(), centre = new THREE.Vector3(2, 1.6, -1);
    let maxYaw = 0, maxPitch = 0, maxMouth = 0, blinked = false, gestures = 0;
    for (let i = 0; i < 600; i++) {
      const t = i * DT;
      // round the actor (in front, beside, behind), up and down, near and far
      look.set(Math.sin(t * 0.9) * (1.2 + Math.sin(t * 0.3)), 1.6 + 1.3 * Math.sin(t * 1.7), Math.cos(t * 0.9) * (1.2 + Math.sin(t * 0.3))).add(centre);
      if (i === 200) gestures += a.gesture('nod') > 0 ? 1 : 0;
      if (i === 400) { a.pointAt(look); gestures += a.gesture('point') > 0 ? 1 : 0; }
      a.update(DT, { lookAt: look, talking });
      for (const n of BONES) {
        const b = a.bones[n];
        assert.ok(finite(b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w), `frame ${i}: ${n} is not finite`);
      }
      const s = a.state;
      assert.ok(finite(s.headYaw, s.headPitch, s.eyeYaw, s.eyePitch, s.blink, s.mouth), `frame ${i}: state not finite`);
      assert.ok(Math.abs(s.headYaw) <= LIMITS.headYaw + 1e-9 && Math.abs(s.headPitch) <= LIMITS.headPitch + 1e-9, `frame ${i}: head ${s.headYaw}, ${s.headPitch}`);
      assert.ok(Math.abs(s.eyeYaw) <= LIMITS.eyes + 1e-9 && Math.abs(s.eyePitch) <= LIMITS.eyes + 1e-9, `frame ${i}: eyes ${s.eyeYaw}, ${s.eyePitch}`);
      // the head as it is drawn (neck, chest and the body's sway included), outside the gestures' own nods
      const h = headAngles(a);
      maxYaw = Math.max(maxYaw, Math.abs(h.yaw));
      if (!a.gesturing) maxPitch = Math.max(maxPitch, Math.abs(h.pitch));
      maxMouth = Math.max(maxMouth, s.mouth); blinked ||= s.blink > 0.99;
    }
    assert.equal(gestures, 2);
    assert.ok(maxYaw <= 70 * DEG + 3 * DEG, `head yaw reached ${(maxYaw / DEG).toFixed(1)}°`);
    assert.ok(maxYaw >= 50 * DEG, `the head hardly turned (${(maxYaw / DEG).toFixed(1)}°)`);
    assert.ok(maxPitch <= 35 * DEG + 4 * DEG, `head pitch reached ${(maxPitch / DEG).toFixed(1)}°`);
    assert.ok(blinked, 'blinks within 10 s');
    if (talking) assert.ok(maxMouth > 0.3, `the mouth moves while talking (${maxMouth})`);
    else assert.ok(maxMouth < 0.02, `the mouth stays shut (${maxMouth})`);
  }
});

test('actor: the eyes take the first 15°, the head the rest; nobody behind is followed', () => {
  const a = createActor();
  const eyes = a.headWorld(new THREE.Vector3());
  const at = (deg, up = 0) => new THREE.Vector3(eyes.x + Math.sin(deg * DEG) * 2, eyes.y + up, eyes.z + Math.cos(deg * DEG) * 2);
  // a little to the side: the eyes alone
  run(a, 3, { lookAt: at(10) });
  assert.ok(Math.abs(a.state.headYaw) < 1 * DEG, `head ${a.state.headYaw / DEG}`);
  assert.ok(Math.abs(a.state.eyeYaw - 10 * DEG) < 2.5 * DEG, `eyes ${a.state.eyeYaw / DEG}`);
  assert.ok(gazeError(a, at(10)) < 3 * DEG, `10°: the gaze misses by ${(gazeError(a, at(10)) / DEG).toFixed(1)}°`);
  // further: the head turns, the eyes stay near their limit; the gaze lands on the target (tiny eye movements aside)
  for (const deg of [40, -55, 20, -25]) {
    run(a, 3, { lookAt: at(deg, deg > 0 ? 0.4 : -0.3) });
    const h = headAngles(a);
    assert.ok(Math.abs(h.yaw - (deg - Math.sign(deg) * 15) * DEG) < 3.5 * DEG, `${deg}°: head ${h.yaw / DEG}`);
    assert.ok(Math.abs(a.state.eyeYaw) > 9 * DEG && Math.sign(a.state.eyeYaw) === Math.sign(deg), `${deg}°: eyes ${a.state.eyeYaw / DEG}`);
    const miss = gazeError(a, at(deg, deg > 0 ? 0.4 : -0.3));
    assert.ok(miss < 3 * DEG, `${deg}°: the gaze misses by ${(miss / DEG).toFixed(1)}°`);
  }
  // far to the side: the head stops at 70°
  run(a, 3, { lookAt: at(105) });
  assert.ok(Math.abs(a.state.headYaw - 70 * DEG) < 0.5 * DEG, `105°: head ${a.state.headYaw / DEG}`);
  // above: pitch limited to 35°
  run(a, 3, { lookAt: new THREE.Vector3(eyes.x, eyes.y + 5, eyes.z + 0.8) });
  assert.ok(Math.abs(a.state.headPitch - 35 * DEG) < 0.5 * DEG, `up: head ${a.state.headPitch / DEG}`);
  // right behind: back to looking ahead, the eyes too (not stuck in a corner, no flick as the target crosses behind)
  run(a, 3, { lookAt: at(178) });
  assert.ok(Math.abs(a.state.headYaw) < 3 * DEG, `behind: head ${a.state.headYaw / DEG}`);
  assert.ok(Math.abs(a.state.eyeYaw) < 4 * DEG, `behind: eyes ${a.state.eyeYaw / DEG}`);
  let flick = 0, prev = a.state.eyeYaw;
  for (let i = 0; i <= 240; i++) { a.update(DT, { lookAt: at(170 + i / 12) }); flick = Math.max(flick, Math.abs(a.state.eyeYaw - prev)); prev = a.state.eyeYaw; }
  assert.ok(flick < 1.5 * DEG, `the eyes flick by ${(flick / DEG).toFixed(1)}° as the target crosses behind`);
  // nearly straight above: the head looks up (the yaw means nothing there), whichever side of the eyes the point is
  for (const dz of [-0.02, 0, 0.03]) {
    const c = createActor(); run(c, 2, { lookAt: new THREE.Vector3(eyes.x, eyes.y + 1, eyes.z + dz) });
    assert.ok(Math.abs(c.state.headPitch - 35 * DEG) < 1 * DEG && Math.abs(c.state.headYaw) < 2 * DEG, `above (${dz}): head ${c.state.headYaw / DEG}, ${c.state.headPitch / DEG}`);
  }
  // a point at its own eyes (or inside the head) has no direction: it looks ahead, steadily
  const d = createActor(); let still = 0;
  for (let i = 0; i < 240; i++) { const y0 = d.state.headYaw; d.update(DT, { lookAt: d.headWorld(_p) }); if (i > 60) still = Math.max(still, Math.abs(d.state.headYaw - y0)); }
  assert.ok(Math.abs(d.state.headYaw) < 1 * DEG && Math.abs(d.state.headPitch) < 1 * DEG && Math.abs(d.state.eyeYaw) < 4 * DEG, 'a point at the eyes: looks ahead');
  assert.ok(still < 0.05 * DEG, `a point at the eyes: the head wobbles (${(still / DEG).toFixed(2)}°/frame)`);
  // the actor turned in the world: lookAt is a world point
  const b = createActor();
  b.root.position.set(5, 0, 5); b.root.rotation.y = Math.PI / 2;     // facing world +x
  const e = b.headWorld(new THREE.Vector3());
  run(b, 3, { lookAt: new THREE.Vector3(e.x + 2, e.y, e.z) });
  assert.ok(Math.abs(b.state.headYaw) < 1 * DEG && Math.abs(b.state.eyeYaw) < 1.5 * DEG, 'straight ahead in world +x');
  assert.ok(Math.abs(e.x - 5 - 0.088) < 0.02 && Math.abs(e.z - 5) < 0.02, `eyes in front of the head (${e.x}, ${e.z})`);
});

test('actor: every gesture plays, then the body is back in its idle pose', () => {
  const look = new THREE.Vector3(0.3, 1.65, 2.2);
  for (const name of GESTURE_NAMES) {
    const a = createActor({ seed: 5 }), b = createActor({ seed: 5 });
    run(a, 1, { lookAt: look }); run(b, 1, { lookAt: look });
    if (name === 'point') a.pointAt(new THREE.Vector3(-1.5, 1.5, 1.5));
    const relaxedHand = a.meshes.find(m => m.name === 'actor-handR').geometry;
    const dur = a.gesture(name);
    assert.ok(dur > 0.5 && dur < 4, `${name}: ${dur} s`);
    assert.equal(a.gesturing, name);
    let moved = 0;
    for (let t = 0; t < dur; t += DT) {
      a.update(DT, { lookAt: look }); b.update(DT, { lookAt: look });
      for (const n of BONES) moved = Math.max(moved, angleTo(a.bones[n].quaternion, b.bones[n].quaternion));
    }
    assert.ok(moved > 6 * DEG, `${name}: hardly moved (${(moved / DEG).toFixed(1)}°)`);
    run(a, 3, { lookAt: look }); run(b, 3, { lookAt: look });
    assert.equal(a.gesturing, null, `${name}: still playing`);
    for (const n of BONES) {
      const d = angleTo(a.bones[n].quaternion, b.bones[n].quaternion);
      assert.ok(d < 0.2 * DEG, `${name}: ${n} off by ${(d / DEG).toFixed(2)}°`);
      assert.ok(a.bones[n].position.distanceTo(b.bones[n].position) < 1e-4, `${name}: ${n} moved`);
    }
    assert.ok(Math.abs(a.state.headYaw - b.state.headYaw) < 0.2 * DEG && Math.abs(a.state.headPitch - b.state.headPitch) < 0.2 * DEG, `${name}: gaze`);
    assert.equal(a.meshes.find(m => m.name === 'actor-handR').geometry, relaxedHand, `${name}: the right hand is relaxed again`);
  }
  // an unknown name does nothing
  const a = createActor();
  assert.equal(a.gesture('cartwheel'), 0);
  assert.equal(a.gesturing, null);
  // the hand beats while talking are private: never reported as a gesture
  const seen = new Set();
  for (let i = 0; i < 900; i++) { a.update(DT, { talking: true }); seen.add(a.gesturing); seen.add(a.state.gesture); }
  assert.deepEqual([...seen], [null], 'talking beats show up as gestures');
  // a gesture started over another one blends from it (no jump)
  const c = createActor();
  run(c, 0.5); c.gesture('explain'); run(c, 0.6);
  const before = c.bones.forearmR.quaternion.clone();
  c.gesture('nod'); c.update(DT);
  assert.ok(angleTo(before, c.bones.forearmR.quaternion) < 4 * DEG, 'no jump when one gesture cuts into another');
});

test('actor: point aims the arm on the target\'s side at it, wherever the actor stands', () => {
  for (const [px, pz, ry] of [[0, 0, 0], [3, -2, Math.PI / 2], [-4, 6, -2.4]]) {
    const a = createActor();
    a.root.position.set(px, 0, pz); a.root.rotation.y = ry; a.root.updateMatrixWorld(true);
    // a board 2 m away, half right and a little up (in the actor's frame), given in world coordinates
    const target = new THREE.Vector3(-1.4, 1.7, 1.6).applyMatrix4(a.root.matrixWorld);
    a.pointAt(target);
    const hm = a.meshes.find(m => m.name === 'actor-handR'), relaxed = hm.geometry;
    const dur = a.gesture('point');
    run(a, dur * 0.45);
    a.root.updateWorldMatrix(true, true);
    const sh = new THREE.Vector3(), hand = new THREE.Vector3(), el = new THREE.Vector3();
    a.bones.upperArmR.getWorldPosition(sh); a.bones.forearmR.getWorldPosition(el); a.bones.handR.getWorldPosition(hand);
    const want = target.clone().sub(sh).normalize();
    const upper = el.clone().sub(sh).normalize(), arm = hand.clone().sub(sh).normalize();
    assert.ok(upper.angleTo(want) < 6 * DEG, `upper arm off by ${(upper.angleTo(want) / DEG).toFixed(1)}°`);
    assert.ok(arm.angleTo(want) < 12 * DEG, `arm off by ${(arm.angleTo(want) / DEG).toFixed(1)}°`);
    assert.notEqual(hm.geometry, relaxed, 'the index finger is out (the pointing hand)');
    // and it glances there
    assert.ok(Math.abs(a.state.headYaw) > 10 * DEG, 'looks towards what it points at');
  }
  // a target behind on the left: the left arm points, out to its side and back (the upper body turns towards it); the
  // right one stays down, and neither arm goes through the body
  const a = createActor();
  a.pointAt(new THREE.Vector3(1.5, 1.2, -2));
  run(a, 1.2); a.gesture('point'); run(a, 1.1);
  assert.equal(a.gesturing, 'point');
  a.root.updateWorldMatrix(true, true);
  const sh = a.bones.upperArmL.getWorldPosition(new THREE.Vector3()), el = a.bones.forearmL.getWorldPosition(new THREE.Vector3());
  const hand = a.bones.handL.getWorldPosition(new THREE.Vector3());
  const want = new THREE.Vector3(1.5, 1.2, -2).sub(sh).normalize();
  assert.ok(el.clone().sub(sh).normalize().angleTo(want) < 12 * DEG, `left upper arm off by ${(el.clone().sub(sh).normalize().angleTo(want) / DEG).toFixed(1)}°`);
  assert.ok(hand.x > sh.x + 0.2, `the hand is out to the side (${(hand.x - sh.x).toFixed(3)})`);
  assert.notEqual(a.meshes.find(m => m.name === 'actor-handL').geometry, a.meshes.find(m => m.name === 'actor-handR').geometry);
  const hr = a.bones.handR.getWorldPosition(new THREE.Vector3()), shr = a.bones.upperArmR.getWorldPosition(new THREE.Vector3());
  assert.ok(hr.y < shr.y - 0.45, 'the right arm stays down');
  const chestYaw = new THREE.Euler().setFromQuaternion(a.bones.chest.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
  assert.ok(chestYaw > 25 * DEG && chestYaw < 45 * DEG, `the upper body turns towards it (${(chestYaw / DEG).toFixed(1)}°)`);
  // straight behind (and a hair either side of it): the arm and the turn agree on the side, and it points back there
  for (const lx of [0, 0.1, -0.1, -1e-9]) {
    const x = createActor(); run(x, 0.5);
    const t = new THREE.Vector3(lx, 1.4, -2); x.pointAt(t); x.gesture('point'); run(x, 1.2); x.root.updateWorldMatrix(true, true);
    const side = lx >= 0 ? 'L' : 'R', sh = x.bones['upperArm' + side].getWorldPosition(new THREE.Vector3());
    const d = x.bones['forearm' + side].getWorldPosition(new THREE.Vector3()).sub(sh).normalize();
    const cy = new THREE.Euler().setFromQuaternion(x.bones.chest.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
    assert.ok(d.angleTo(t.clone().sub(sh).normalize()) < 35 * DEG, `behind (${lx}): the ${side} arm is ${(d.angleTo(t.clone().sub(sh).normalize()) / DEG).toFixed(1)}° off`);
    assert.ok(side === 'L' ? cy > 20 * DEG : cy < -20 * DEG, `behind (${lx}): turned the ${side === 'L' ? 'left' : 'right'} way (${(cy / DEG).toFixed(1)}°)`);
  }
  // straight above or below: no twist (the bearing means nothing there)
  for (const t of [[0, 4, -0.01], [0, 0, -0.01]]) {
    const x = createActor(); run(x, 0.5); x.pointAt(new THREE.Vector3(...t)); x.gesture('point'); run(x, 1.2);
    const cy = new THREE.Euler().setFromQuaternion(x.bones.chest.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
    assert.ok(Math.abs(cy) < 3 * DEG, `${t}: twisted ${(cy / DEG).toFixed(1)}°`);
  }
  // across the body (the right arm cannot reach a target far to the left in front): the left arm takes it
  const c = createActor(); c.pointAt(new THREE.Vector3(1.2, 1.5, 1.0)); c.gesture('point'); run(c, 1.1);
  c.root.updateWorldMatrix(true, true);
  assert.ok(c.bones.handL.getWorldPosition(new THREE.Vector3()).y > 1.2 && c.bones.handR.getWorldPosition(new THREE.Vector3()).y < 1.0, 'left arm up, right down');
  // without pointAt it still points somewhere sensible (front right)
  const b = createActor(); b.gesture('point'); run(b, 1.1); b.root.updateWorldMatrix(true, true);
  const hb = b.bones.handR.getWorldPosition(new THREE.Vector3());
  assert.ok(hb.y > 1.0 && hb.z > 0.2 && hb.x < -0.1, `default point (${hb.toArray().map(v => v.toFixed(2))})`);
});

test('actor: in the briefing room, the board and the screen behind are pointed at; one point after another is smooth', () => {
  // as main.js places the instructor: facing +a (rotation π in the runway frame), the whiteboard behind on his left and
  // the screen behind on his right (academy-spec: a 633.66, c 254.6 / 258.4; he stands at a 634.9, c 256.7)
  const at = (a, c, y) => new THREE.Vector3(c, y, -a);
  const board = at(633.66, 254.6, 1.45), screen = at(633.66, 258.4, 1.6);
  const make = () => { const x = createActor(); x.root.position.set(256.7, 0, -634.9); x.root.rotation.y = Math.PI; x.root.updateMatrixWorld(true); return x; };
  const upper = (x, side) => {
    x.root.updateWorldMatrix(true, true);
    const sh = x.bones['upperArm' + side].getWorldPosition(new THREE.Vector3()), el = x.bones['forearm' + side].getWorldPosition(new THREE.Vector3());
    return { sh, dir: el.sub(sh).normalize() };
  };
  for (const [target, side] of [[board, 'L'], [screen, 'R']]) {
    const x = make(); run(x, 0.5); x.pointAt(target); x.gesture('point'); run(x, 1.2);
    const { sh, dir } = upper(x, side), off = dir.angleTo(target.clone().sub(sh).normalize());
    assert.ok(off < 15 * DEG, `${side === 'L' ? 'board' : 'screen'}: the ${side} arm is ${(off / DEG).toFixed(1)}° off`);
  }
  // board → screen → board → the same again, each while the last one is still held: no jump from one frame to the next
  for (const gap of [0.3, 0.8, 1.5, 2.2]) {
    const x = make(); run(x, 0.5);
    let worst = 0;
    const prev = { L: null, R: null };
    const step = () => { x.update(DT); for (const s of SIDES2) { const d = upper(x, s).dir; if (prev[s]) worst = Math.max(worst, d.angleTo(prev[s])); prev[s] = d; } };
    for (const t of [board, screen, board, board, screen, screen]) { x.pointAt(t); x.gesture('point'); for (let k = 0; k < gap / DT; k++) step(); }
    assert.ok(worst < 9 * DEG, `gap ${gap} s: the arm jumped ${(worst / DEG).toFixed(1)}° in one frame`);
  }
  // re-aimed with the same arm from the board to the apron out of the window (16 m away) and back: by direction, at a
  // bounded rate (not along the straight line between the two points, which would swing the arm 17°+ in one frame)
  const apron = new THREE.Vector3(240, 1.4, -634.9 - 2);
  for (const gap of [0.3, 1.0, 2.2]) {
    const x = make(); run(x, 0.5); x.pointAt(board); x.gesture('point'); run(x, gap);
    for (const t of [apron, board]) {
      let p = upper(x, 'L').dir, worst = 0;
      x.pointAt(t); x.gesture('point');
      for (let k = 0; k < 72; k++) { x.update(DT); const d = upper(x, 'L').dir; worst = Math.max(worst, d.angleTo(p)); p = d; }
      const { sh, dir } = upper(x, 'L');
      assert.ok(worst < 6 * DEG, `gap ${gap} s, re-aimed: ${(worst / DEG).toFixed(1)}° in one frame`);
      assert.ok(dir.angleTo(t.clone().sub(sh).normalize()) < 10 * DEG, `gap ${gap} s: reached the new target`);
    }
  }
  // the left arm, still up, asked again just after the right one took over: it goes on from its height (no dip)
  { const x = make(); run(x, 0.5); x.pointAt(board); x.gesture('point'); run(x, 1.0);
    const d0 = upper(x, 'L').dir; x.pointAt(screen); x.gesture('point'); run(x, 0.05); x.pointAt(board); x.gesture('point');
    let dev = 0; for (let k = 0; k < 48; k++) { x.update(DT); dev = Math.max(dev, upper(x, 'L').dir.angleTo(d0)); }
    assert.ok(dev < 8 * DEG, `the left arm dipped ${(dev / DEG).toFixed(1)}°`); }
  // the same target again while held: the arm stays up (no sag)
  const y = make(); run(y, 0.5); y.pointAt(screen); y.gesture('point'); run(y, 1.0);
  const d0 = upper(y, 'R').dir;
  y.pointAt(screen); y.gesture('point');
  let sag = 0;
  for (let k = 0; k < 40; k++) { y.update(DT); sag = Math.max(sag, upper(y, 'R').dir.angleTo(d0)); }
  assert.ok(sag < 4 * DEG, `pointing again sags by ${(sag / DEG).toFixed(1)}°`);
});

test('actor: update() reuses its objects (no per-frame allocation)', () => {
  const a = createActor();
  const objs = [];
  for (const n of Object.keys(a.bones)) { const b = a.bones[n]; objs.push(b.position, b.quaternion, b.rotation, b.scale, b.matrix, b.matrixWorld); }
  objs.push(...a._scratch, a.state);
  const geos = new Set(a.meshes.map(m => m.geometry));
  // the clone()s of three's maths classes are counted while update() runs
  const P = [THREE.Vector3, THREE.Quaternion, THREE.Matrix4, THREE.Euler, THREE.Matrix3, THREE.Color].map(C => C.prototype);
  const orig = P.map(p => p.clone);
  let clones = 0;
  P.forEach((p, i) => { p.clone = function () { clones++; return orig[i].call(this); }; });
  const look = new THREE.Vector3();
  try {
    for (let i = 0; i < 900; i++) {
      look.set(Math.sin(i * 0.02) * 2, 1.6, 2);
      if (i % 150 === 10) { a.pointAt(look); a.gesture(GESTURE_NAMES[((i / 150) | 0) % GESTURE_NAMES.length]); }
      a.update(DT, { lookAt: i % 300 < 250 ? look : null, talking: i % 200 < 120 });
    }
  } finally { P.forEach((p, i) => { p.clone = orig[i]; }); }
  assert.equal(clones, 0, 'clone() during update()');
  const after = [];
  for (const n of Object.keys(a.bones)) { const b = a.bones[n]; after.push(b.position, b.quaternion, b.rotation, b.scale, b.matrix, b.matrixWorld); }
  after.push(...a._scratch, a.state);
  assert.equal(after.length, objs.length);
  after.forEach((o, i) => assert.ok(o === objs[i], `object ${i} was replaced`));
  for (const m of a.meshes) {
    if (m.name === 'actor-handR') continue;                          // swaps between its two prepared hands
    assert.ok(geos.has(m.geometry), `${m.name}: new geometry`);
  }
  // and the per-frame code has no constructors, clones, spreads or closures in it
  const src = createActor.toString(), body = src.slice(src.indexOf('function startGesture('), src.indexOf('const actor = {')).replace(/\/\/.*$/gm, '');
  assert.ok(body.length > 2000, 'found the per-frame code');
  for (const [re, what] of [[/\bnew\s/, 'new'], [/\.clone\(/, 'clone()'], [/\.\.\./, 'spread'], [/=>/, 'closure'], [/\[\s*\]|\{\s*\}/, 'literal']]) {
    assert.ok(!re.test(body), `${what} in the per-frame code`);
  }
  // bad steps do no harm
  a.update(NaN); a.update(-1); a.update(5, { lookAt: null }); a.update(DT, undefined); a.update(DT, null);
  a.pointAt(new THREE.Vector3(NaN, 1, 1)); a.gesture('point'); run(a, 1, { lookAt: new THREE.Vector3(0, NaN, 2), talking: true });
  assert.ok(finite(a.state.headYaw, a.state.eyeYaw, a.state.mouth), 'a bad lookAt or pointAt target is ignored');
  for (const n of BONES) assert.ok(finite(a.bones[n].quaternion.w), `${n} after bad steps`);
  // absurdly far (but finite) targets, where ∞ · 0 = NaN could creep in, and one frame under a broken parent transform
  const far = createActor(), ok = (x) => BONES.every(n => finite(x.bones[n].quaternion.w)) && finite(x.state.headYaw, x.state.headPitch, x.state.eyeYaw, x.state.eyePitch);
  for (const v of [[1e200, 1.6, 0], [0, 1e300, 0], [-1e300, -1e300, -1e300], [1e307, 1e307, 1e307]]) run(far, 0.2, { lookAt: new THREE.Vector3(...v) });
  far.pointAt(new THREE.Vector3(0, 1e300, 0)); far.gesture('point'); run(far, 1);
  assert.ok(ok(far), 'a target absurdly far away');
  const ahead = new THREE.Vector3(0, 1.6, 2);
  far.root.position.x = NaN; far.update(DT, { lookAt: ahead }); far.root.position.x = 0; run(far, 1, { lookAt: ahead });
  assert.ok(ok(far) && Math.abs(far.state.headYaw) < 2 * DEG, 'recovers after one frame with a NaN parent transform');
  // bad options fall back to the defaults instead of a NaN body
  for (const o of [null, { height: NaN }, { height: 'tall' }]) {
    const b = createActor(o); b.root.updateMatrixWorld(true);
    const top = new THREE.Box3().setFromObject(b.root, true).max.y;
    assert.ok(Math.abs(top - 1.748) < 0.005, `${JSON.stringify(o)}: ${top}`);
  }
  // colours as numbers or CSS strings
  const red = createActor({ colors: { skin: '#ff0000' } }).meshes.find(m => m.name === 'actor-head').geometry.attributes.color;
  // (times the model's baked shading: red, darker in the creases)
  assert.ok(red.getX(0) > 0.3 && red.getX(0) <= 1 && red.getY(0) === 0 && red.getZ(0) === 0, `[${red.getX(0)}, ${red.getY(0)}, ${red.getZ(0)}]`);
  // an undefined override keeps the default (not the colour of whatever part was made before)
  const headColors = (o) => Array.from(createActor(o).meshes.find(m => m.name === 'actor-head').geometry.attributes.color.array);
  assert.deepEqual(headColors({ colors: { hair: undefined, skin: null } }), headColors(), 'undefined colours');
});

// ---------------------------------------------------------------- the model (Blender)
test('actor: the model — every look within budget, faces turned out, the mouth opens, the name on the plate', () => {
  for (const [name, m] of [...actorModel('far')].concat([...actorModel('near')].map(([n, x]) => ['near:' + n, x]))) {
    if (name.startsWith('anchor.')) continue;
    assert.ok(m.normal && m.index.length % 3 === 0 && m.shade.every(v => v >= 0 && v <= 1.0001), `${name}: normals, triangles, shading 0…1`);
    // the faces' winding against their normals, by area (slivers under a millimetre square aside)
    const P = m.position, N = m.normal, I = m.index; let all = 0, wrong = 0;
    for (let t = 0; t < I.length; t += 3) {
      const [a, b, c] = [I[t] * 3, I[t + 1] * 3, I[t + 2] * 3];
      const u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], v = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], area = Math.hypot(...n) / 2;
      const d = n[0] * (N[a] + N[b] + N[c]) + n[1] * (N[a + 1] + N[b + 1] + N[c + 1]) + n[2] * (N[a + 2] + N[b + 2] + N[c + 2]);
      all += area; if (d < 0 && area > 1e-6) wrong += area;
    }
    assert.ok(wrong <= all * 0.01, `${name}: ${(100 * wrong / all).toFixed(1)}% of its area faces inwards`);
  }
  for (const look of [{}, { hair: 'long', bars: 1, tag: 'ASAHI' }, { hair: 'bun', glasses: true, tie: false, badge: false, bars: 0, tag: 'MILLER' }, { hair: 'crop', lanyard: false, tie: false, bars: 0 },
    { bars: 4, tag: 'MAKABE' }, { bars: 1, glasses: true, tag: 'MORI' }, { tag: 'WMWMWMW', glasses: true, hair: 'long' }]) {
    const a = createActor({ look });
    assert.ok(a.trianglesFar <= 8000 && a.triangles <= 16000, `${JSON.stringify(look)}: ${a.trianglesFar} triangles far, ${a.triangles} near`);
  }
  const mouth = createActor().meshes.find(m => m.name === 'actor-mouth').geometry;
  assert.ok(mouth.morphTargetsRelative && mouth.morphAttributes.position[0].count === mouth.attributes.position.count, 'the mouth: one relative morph target');
  let open = 0; for (const v of mouth.morphAttributes.position[0].array) open = Math.max(open, Math.abs(v));
  assert.ok(open > 0.008 && open < 0.02, `the mouth opens ${open} m`);
  // the name: letters on the plate (more triangles than without), none without a tag
  const torso = (look) => createActor({ look }).meshes.find(m => m.name === 'actor-torso').geometry.index.count / 3;
  assert.ok(torso({ tag: 'HAYASE' }) > torso({ tag: 'I' }) && torso({ tag: 'I' }) > torso({}), 'the name plate and its letters');
});

// ---------------------------------------------------------------- seated
// in the Archer's right seat as fly mode puts him: the root in the aircraft's body frame (x the right wing, y up, −z the
// nose; here the world), turned by π. The student's eye is the pilot's, (−0.30, 0.62, −0.40). The cabin round him as
// cockpit.js and its model draw it (tools/aircraft/cockpit_walls.py, cockpit.js WALLS): the right wall (the door) — its lower
// panel 6 mm proud of x 0.56 up to the split (y 0.265), the band at 0.56 up to the sill (y 0.38), the window band above it
// leaning in, the front window's raised surround (1 cm, taken all along y 0.35–0.405) —, the door's armrest (its box: in
// front of the instructor's elbow, as tx_leftfront has it), the headliner curving down towards the sides.
const PILOT_EYE = new THREE.Vector3(-0.30, 0.62, -0.40);
const wallX = (y) => (y < 0.265 ? 0.554 : y < 0.38 ? 0.56 : 0.56 - 0.19 * (y - 0.38)) - (y > 0.35 && y < 0.405 ? 0.010 : 0);
const roofY = (x) => 0.75 + 0.095 * Math.sqrt(Math.max(0, 1 - (x / 0.49) ** 2));
const ARMREST = new THREE.Box3(new THREE.Vector3(0.496, 0.099, -0.94), new THREE.Vector3(0.557, 0.167, -0.56));
// how far a point of an arm (r: the limb's radius there) goes into the right wall, the armrest or the headliner (m)
function intoCabin(p, r) { const d = ARMREST.distanceToPoint(p); return Math.max(p.x + r - wallX(p.y), d < r ? r - d : 0, p.y + r - roofY(p.x)); }
function seatedActor(seed = 1, place = SEATED_PA28) {
  const a = createActor({ seed });
  a.root.position.set(...place.position); a.root.rotation.y = place.yaw; a.root.updateMatrixWorld(true);
  assert.equal(a.setSeated(place.seat), true);
  return a;
}
const world = (a, name, local = null) => {
  a.root.updateWorldMatrix(true, true);
  return local ? new THREE.Vector3(...local).applyMatrix4(a.bones[name].matrixWorld) : a.bones[name].getWorldPosition(new THREE.Vector3());
};
const inRoot = (a, name) => a.root.worldToLocal(world(a, name));
const mid = (p, q) => p.clone().add(q).multiplyScalar(0.5);
const palm = (a, L) => world(a, 'hand' + L, [0, -0.06, 0]), tip = (a, L) => world(a, 'hand' + L, [0, -0.17, 0]);
// the arms' points that could touch the cabin, and the limb's radius there: the elbow, the forearm, the wrist, the palm,
// the fingertips; the worst of them, into the cabin (m)
const ARM_R = [0.04, 0.034, 0.025, 0.018, 0.01];
const armPts = (a, L) => { const el = world(a, 'forearm' + L), wr = world(a, 'hand' + L); return [el, mid(el, wr), wr, palm(a, L), tip(a, L)]; };
const armInto = (a, L) => Math.max(...armPts(a, L).map((p, i) => intoCabin(p, ARM_R[i])));
// the student's side above the panel (left of 5 cm short of the cabin's middle, above the panel's top: their head and
// what they look at): how far a point of an arm (radius r) goes into it (m)
const intoStudent = (p, r) => Math.min(0.05 - (p.x - r), p.y + r - 0.465);
// the PFD's screen as cockpit.js draws it (x, y at z −1.0825); whether a point of an arm (radius r) hides part of it from
// the student's eye
const PFD_SCREEN = { x: [-0.405, -0.195], y: [0.2995, 0.4308], z: -1.0825 };
function hidesPFD(p, r) {
  const k = (PFD_SCREEN.z - PILOT_EYE.z) / (p.z - PILOT_EYE.z);
  if (!(k > 1)) return false;                                              // (not between the eye and the screen)
  const x = PILOT_EYE.x + (p.x - PILOT_EYE.x) * k, y = PILOT_EYE.y + (p.y - PILOT_EYE.y) * k, rr = r * k;
  return x > PFD_SCREEN.x[0] - rr && x < PFD_SCREEN.x[1] + rr && y > PFD_SCREEN.y[0] - rr && y < PFD_SCREEN.y[1] + rr;
}
// the upper arm too (the shoulder to the elbow), with its radius
const armPts2 = (a, L) => { const sh = world(a, 'upperArm' + L); return [[sh, 0.05], [mid(sh, world(a, 'forearm' + L)), 0.045], ...armPts(a, L).map((p, i) => [p, ARM_R[i]])]; };

test('actor: seated in the Archer\'s right seat — hips on the seat, feet on the pedals, hands on the thighs', () => {
  const a = seatedActor(), cfg = SEATED_PA28.seat, v = (p) => new THREE.Vector3(...p);
  assert.equal(a.seated, true);
  const thighGeo = { L: a.meshes.find(m => m.name === 'actor-thighL').geometry, R: a.meshes.find(m => m.name === 'actor-thighR').geometry };
  for (let i = 0; i < 240; i++) {
    a.update(DT, { lookAt: PILOT_EYE, talking: i > 120 });
    if (i % 20) continue;
    // the hip joints' middle and the ankles where they were put (breathing and talking move neither)
    const hip = mid(inRoot(a, 'thighL'), inRoot(a, 'thighR'));
    assert.ok(hip.distanceTo(v(cfg.hip)) < 0.01, `frame ${i}: hips at ${hip.toArray().map(x => x.toFixed(3))}`);
    for (const L of SIDES2) {
      const ank = inRoot(a, 'foot' + L);
      assert.ok(ank.distanceTo(v(cfg['ankle' + L])) < 0.01, `frame ${i}: ankle ${L} at ${ank.toArray().map(x => x.toFixed(3))}`);
    }
  }
  run(a, 2, { lookAt: PILOT_EYE });
  const hip = v(cfg.hip);
  for (const L of SIDES2) {
    // knees up: well ahead of the hips and above them (the thighs rise towards the knees, feet out on the pedals)
    const knee = inRoot(a, 'shin' + L);
    assert.ok(knee.z > hip.z + 0.3 && knee.y > hip.y + 0.05, `knee ${L} at ${knee.toArray().map(x => x.toFixed(3))}`);
    // the elbows bent 65–95°, the palms on top of the thighs between the hip and the knee
    const sh = world(a, 'upperArm' + L), el = world(a, 'forearm' + L), wr = world(a, 'hand' + L);
    const bend = el.clone().sub(sh).angleTo(wr.clone().sub(el)) / DEG;
    assert.ok(bend > 65 && bend < 95, `elbow ${L} bent ${bend.toFixed(1)}°`);
    const p = a.bones['thigh' + L].worldToLocal(palm(a, L)), radial = Math.hypot(p.x, p.z);
    assert.ok(-p.y > 0.08 && -p.y < 0.34, `palm ${L} ${(-p.y).toFixed(3)} m down the thigh`);
    assert.ok(radial > 0.07 && radial < 0.14, `palm ${L} ${radial.toFixed(3)} m from the thigh's axis`);
    const ax = world(a, 'thigh' + L).lerp(world(a, 'shin' + L), -p.y / 0.42);
    assert.ok(palm(a, L).y > ax.y + 0.05, `palm ${L} on top of the thigh`);
    // the trousers shaped for sitting (swapped in, not built per frame)
    assert.notEqual(a.meshes.find(m => m.name === 'actor-thigh' + L).geometry, undefined);
    assert.equal(a.meshes.find(m => m.name === 'actor-thigh' + L).geometry, thighGeo[L], `thigh ${L}: the same seated geometry all along`);
  }
  // reclined against the seat back: the chest's up leans back 8–22°
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(a.bones.chest.getWorldQuaternion(new THREE.Quaternion()));
  up.applyQuaternion(a.root.getWorldQuaternion(new THREE.Quaternion()).invert());
  const lean = Math.atan2(-up.z, up.y) / DEG;
  assert.ok(lean > 8 && lean < 22, `leans back ${lean.toFixed(1)}°`);
  // looking ahead, his eyes are near the right seat's eye point (+0.30, 0.62, −0.40); the head stays under the headliner
  { const c = seatedActor(); run(c, 1.5, { lookAt: new THREE.Vector3(0.29, 0.65, -8) });
    const eyes = c.headWorld(new THREE.Vector3());
    assert.ok(Math.abs(eyes.x - 0.29) < 0.02 && eyes.y > 0.6 && eyes.y < 0.68 && eyes.z > -0.42 && eyes.z < -0.32, `eyes at ${eyes.toArray().map(x => x.toFixed(3))}`); }
  const head = new THREE.Box3().setFromObject(a.meshes.find(m => m.name === 'actor-head'), true);
  assert.ok(head.max.y < roofY(0.29) - 0.03, `the top of the head at ${head.max.y.toFixed(3)}`);
  // he looks round at the student (about 85° to his left): the head turns most of the way, the eyes do the rest
  assert.ok(a.state.headYaw > 60 * DEG, `head ${(a.state.headYaw / DEG).toFixed(1)}°`);
  assert.ok(gazeError(a, PILOT_EYE) < 5 * DEG, `the gaze misses the student by ${(gazeError(a, PILOT_EYE) / DEG).toFixed(1)}°`);
  // within budget seated too (the seated trousers have as many triangles as the standing ones)
  let meshes = 0, tris = 0;
  a.root.traverse(o => { if (o.isMesh) { meshes++; tris += o.geometry.index.count / 3; } });
  assert.ok(meshes <= 20 && tris <= a.triangles, `${meshes} meshes, ${tris} triangles (reported ${a.triangles})`);
  // a bad seat changes nothing
  const before = BONES.map(n => a.bones[n].quaternion.clone());
  for (const bad of [{ hip: [NaN, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0] }, { hip: [0, 0.4, 0] }, { hip: 'x', ankleL: [0, 0, 1], ankleR: [0, 0, 1] }]) assert.equal(a.setSeated(bad), false);
  assert.equal(a.seated, true);
  BONES.forEach((n, i) => assert.ok(before[i].equals(a.bones[n].quaternion), `${n} moved by a bad seat`));
});

test('actor: seatFromBody places him by points in the aircraft\'s body frame (left and right as his own)', () => {
  // the Archer's right seat in the body frame, as a cockpit gives it
  const body = { hip: [0.29, -0.035, -0.41], ankleL: [0.21, -0.25, -1.06], ankleR: [0.39, -0.25, -1.06], room: { L: 0.45, R: 0.09 } };
  const place = seatFromBody(body);
  assert.equal(place.yaw, Math.PI);
  assert.deepEqual(place.seat.room, body.room);
  const a = seatedActor(1, place);
  run(a, 1);
  const v = (p) => new THREE.Vector3(...p);
  assert.ok(mid(world(a, 'thighL'), world(a, 'thighR')).distanceTo(v(body.hip)) < 0.01, 'hips');
  assert.ok(world(a, 'footL').distanceTo(v(body.ankleL)) < 0.01 && world(a, 'footR').distanceTo(v(body.ankleR)) < 0.01, 'ankles, his left inboard');
  assert.ok(world(a, 'handL').x < world(a, 'handR').x, 'his left hand on the student\'s side');
  // SEATED_PA28 is that seat
  const b = seatedActor(); run(b, 1);
  for (const n of ['thighL', 'thighR', 'footL', 'footR', 'head']) assert.ok(world(a, n).distanceTo(world(b, n)) < 0.002, `${n}: SEATED_PA28 differs`);
});

test('actor: seated, every gesture plays, keeps clear of the door and the roof, and ends in the seated rest', () => {
  for (const name of GESTURE_NAMES) {
    const a = seatedActor(5), b = seatedActor(5);
    run(a, 1, { lookAt: PILOT_EYE }); run(b, 1, { lookAt: PILOT_EYE });
    if (name === 'point') a.pointAt(new THREE.Vector3(-0.30, 0.34, -1.10));        // the student's PFD
    const relaxed = { L: a.meshes.find(m => m.name === 'actor-handL').geometry, R: a.meshes.find(m => m.name === 'actor-handR').geometry };
    const thigh = a.meshes.find(m => m.name === 'actor-thighL').geometry;
    const rest = { L: palm(a, 'L').y, R: palm(a, 'R').y };
    const dur = a.gesture(name);
    assert.ok(dur > 0.5 && dur < 4, `${name}: ${dur} s`);
    assert.equal(a.gesturing, name);
    const lap = { L: palm(a, 'L'), R: palm(a, 'R') };
    let moved = 0, lift = 0, reach = 0, into = -9, pilot = 9;
    for (let t = 0; t < dur; t += DT) {
      a.update(DT, { lookAt: PILOT_EYE }); b.update(DT, { lookAt: PILOT_EYE });
      for (const n of BONES) moved = Math.max(moved, angleTo(a.bones[n].quaternion, b.bones[n].quaternion));
      for (const L of SIDES2) {
        lift = Math.max(lift, palm(a, L).y - rest[L]); reach = Math.max(reach, palm(a, L).distanceTo(lap[L])); into = Math.max(into, armInto(a, L));
        for (const p of armPts(a, L)) pilot = Math.min(pilot, p.distanceTo(PILOT_EYE));
      }
    }
    assert.ok(moved > 6 * DEG, `${name}: hardly moved (${(moved / DEG).toFixed(1)}°)`);
    // (explaining seated is a small movement of the open hands over the lap, not an arm raised in the cabin)
    if (name === 'explain') assert.ok(lift > 0.05 && reach < 0.16, `explain: the hands go ${lift.toFixed(3)} m up, ${reach.toFixed(3)} m off the lap`);
    else if (name !== 'nod') assert.ok(lift > 0.12, `${name}: the hands hardly leave the lap (${lift.toFixed(3)} m)`);
    assert.ok(into < 0.01, `${name}: an arm goes ${(into * 100).toFixed(1)} cm into the door, the armrest or the headliner`);
    assert.ok(pilot > 0.3, `${name}: a hand ${pilot.toFixed(3)} m from the student's eye`);
    run(a, 3, { lookAt: PILOT_EYE }); run(b, 3, { lookAt: PILOT_EYE });
    assert.equal(a.gesturing, null, `${name}: still playing`);
    for (const n of BONES) {
      const d = angleTo(a.bones[n].quaternion, b.bones[n].quaternion);
      assert.ok(d < 0.2 * DEG, `${name}: ${n} off by ${(d / DEG).toFixed(2)}°`);
      assert.ok(a.bones[n].position.distanceTo(b.bones[n].position) < 1e-4, `${name}: ${n} moved`);
    }
    for (const L of SIDES2) assert.equal(a.meshes.find(m => m.name === 'actor-hand' + L).geometry, relaxed[L], `${name}: the ${L} hand is relaxed again`);
    assert.equal(a.meshes.find(m => m.name === 'actor-thighL').geometry, thigh, `${name}: still sitting`);
  }
  // talking seated: the beats stay small and start from the lap (no gesture reported), the hands never far off the thighs
  const a = seatedActor(7); run(a, 0.5, { lookAt: PILOT_EYE });
  const rest = { L: palm(a, 'L'), R: palm(a, 'R') }, seen = new Set();
  let off = 0;
  for (let i = 0; i < 900; i++) {
    a.update(DT, { lookAt: PILOT_EYE, talking: true }); seen.add(a.gesturing);
    for (const L of SIDES2) off = Math.max(off, palm(a, L).distanceTo(rest[L]));
  }
  assert.deepEqual([...seen], [null]);
  assert.ok(off > 0.02 && off < 0.2, `the talking hands move ${off.toFixed(3)} m off the lap`);
});

test('actor: seated, point takes the student\'s side of the panel with the left arm; the door side stays in', () => {
  // the whole gesture (up from the lap, held, back down), seen by the student: the nearest an arm comes to their eye,
  // how far into their head space and into the cabin, whether it hides the PFD, the most a fingertip or an elbow moves in
  // one frame
  const watch = (a, o = {}) => {
    const w = { pilot: 9, head: -9, into: -9, hides: false, jump: 0 }, last = {};
    for (let t = 0; t < 3.2; t += DT) {
      a.update(DT, o);
      for (const L of SIDES2) {
        armPts2(a, L).forEach(([p, r], i) => {
          w.pilot = Math.min(w.pilot, p.distanceTo(PILOT_EYE) - r); w.hides ||= hidesPFD(p, r);
          if (i > 0) w.head = Math.max(w.head, intoStudent(p, r));             // (from the upper arm's middle on: the shoulder is his own)
        });
        w.into = Math.max(w.into, armInto(a, L));
        const el = world(a, 'forearm' + L), tp = tip(a, L);
        if (last[L]) w.jump = Math.max(w.jump, el.distanceTo(last[L][0]), tp.distanceTo(last[L][1]));
        last[L] = [el, tp];
      }
    }
    return w;
  };
  const clear = (what, w) => {
    assert.ok(w.pilot > 0.3, `${what}: an arm comes ${w.pilot.toFixed(3)} m from the student's eye`);
    assert.ok(w.head < -0.03, `${what}: an arm goes ${(w.head * 100).toFixed(1)} cm into the student's side above the panel`);
    assert.ok(!w.hides, `${what}: an arm hides the PFD from the student`);
    assert.ok(w.into < 0.01, `${what}: an arm goes ${(w.into * 100).toFixed(1)} cm into the door, the armrest or the headliner`);
    assert.ok(w.jump < 0.05, `${what}: a hand or an elbow jumps ${(w.jump * 100).toFixed(1)} cm in one frame`);
  };
  // the student's PFD (ahead to his left): the left arm, low, the elbow bent, the finger on at it from his own side of the
  // panel (short of the screen); the right hand stays on the lap
  for (const place of [SEATED_PA28, seatFromBody({ hip: [0.29, -0.03, -0.38], ankleL: [0.21, -0.25, -1.06], ankleR: [0.39, -0.25, -1.06] })]) {
    const a = seatedActor(1, place); run(a, 0.5, { lookAt: PILOT_EYE });
    const pfd = new THREE.Vector3(-0.30, 0.365, -1.0825), lap = palm(a, 'R');
    a.pointAt(pfd); a.gesture('point'); run(a, 1.2, { lookAt: PILOT_EYE });
    const sh = world(a, 'upperArmL'), el = world(a, 'forearmL'), wr = world(a, 'handL'), t = tip(a, 'L');
    const off = t.clone().sub(wr).angleTo(pfd.clone().sub(wr)) / DEG, bend = el.clone().sub(sh).angleTo(wr.clone().sub(el)) / DEG;
    assert.ok(off < 12, `the finger is ${off.toFixed(1)}° off the PFD`);
    assert.ok(bend > 30 && bend < 100, `the elbow bent ${bend.toFixed(1)}°`);
    assert.ok(el.y < sh.y - 0.12 && wr.y < 0.35 && t.y < 0.4, `low: the elbow ${(sh.y - el.y).toFixed(3)} m under the shoulder, the wrist at y ${wr.y.toFixed(3)}, the fingertip at ${t.y.toFixed(3)}`);
    assert.ok(t.x > PFD_SCREEN.x[1] + 0.03 && t.distanceTo(pfd) > 0.15, `the fingertip short of the PFD (${t.toArray().map(x => x.toFixed(3))})`);
    assert.ok(palm(a, 'R').distanceTo(lap) < 0.03, 'the right hand stays on the lap');
    assert.notEqual(a.meshes.find(m => m.name === 'actor-handL').geometry, a.meshes.find(m => m.name === 'actor-handR').geometry, 'the finger is out');
    const b = seatedActor(1, place); run(b, 0.5, { lookAt: PILOT_EYE }); b.pointAt(pfd); b.gesture('point');
    clear('the PFD', watch(b, { lookAt: PILOT_EYE }));
  }
  // the student's left rudder pedal: the left arm, down between the knees towards it
  { const a = seatedActor(); run(a, 0.5, { lookAt: PILOT_EYE });
    const pedal = new THREE.Vector3(-0.39, -0.27, -1.21);
    a.pointAt(pedal); a.gesture('point'); run(a, 1.2, { lookAt: PILOT_EYE });
    const wr = world(a, 'handL'), t = tip(a, 'L'), off = t.clone().sub(wr).angleTo(pedal.clone().sub(wr)) / DEG;
    assert.ok(off < 15 && t.y < 0.2, `the pedal: the finger ${off.toFixed(1)}° off, the fingertip at y ${t.y.toFixed(3)}`);
    const b = seatedActor(); run(b, 0.5, { lookAt: PILOT_EYE }); b.pointAt(pedal); b.gesture('point');
    clear('the pedal', watch(b, { lookAt: PILOT_EYE })); }
  // out of the right window, up at the sky, down at his own pedals, behind him between the seats, out of the student's
  // window, and nowhere in particular: inside the cabin, out of the student's way, ahead; no jumps
  for (const [what, t] of [['right', [4, 0.2, -1.5]], ['behind right', [3, 0.5, 2]], ['up', [0.3, 5, -2]], ['pedals', [0.3, -0.27, -1.21]], ['between the seats', [0, 0, 0]],
    ['left', [-4, 0.3, -1]], ['default', null]]) {
    for (const o of [{}, { lookAt: PILOT_EYE }]) {
      const a = seatedActor(); run(a, 0.5, o);
      a.pointAt(t ? new THREE.Vector3(...t) : null); a.gesture('point');
      clear(what, watch(a, o));
    }
    const a = seatedActor(); run(a, 0.5);
    a.pointAt(t ? new THREE.Vector3(...t) : null); a.gesture('point'); run(a, 1.2);
    const side = a.meshes.find(m => m.name === 'actor-handL').geometry === a.meshes.find(m => m.name === 'actor-handR').geometry ? null : 'R';
    const sh = world(a, 'upperArmR'), dir = world(a, 'forearmR').sub(sh).normalize();
    if (['right', 'up', 'default'].includes(what)) assert.ok(side === 'R' && dir.z < -0.6, `${what}: the right arm points ahead (${dir.toArray().map(x => x.toFixed(2))})`);
    assert.ok(tip(a, 'R').z < sh.z, `${what}: the hand stays in front of the shoulder`);
  }
});

test('actor: standing up again (twice) is exactly standing', () => {
  const a = createActor({ seed: 3 }), b = createActor({ seed: 3 }), look = new THREE.Vector3(0.4, 1.6, 2);
  for (const x of [a, b]) { x.root.position.set(1, 0, -2); x.root.rotation.y = 0.4; x.root.updateMatrixWorld(true); }
  const standing = { L: a.meshes.find(m => m.name === 'actor-thighL').geometry, R: a.meshes.find(m => m.name === 'actor-thighR').geometry };
  const other = seatFromBody({ hip: [0.29, -0.03, -0.38], ankleL: [0.21, -0.25, -1.06], ankleR: [0.39, -0.25, -1.06] });
  const step = (s, gesture = null) => { if (gesture) { a.gesture(gesture); b.gesture(gesture); } run(a, s, { lookAt: look }); run(b, s, { lookAt: look }); };
  step(0.5);
  assert.equal(a.setSeated(SEATED_PA28.seat), true); step(1.5, 'explain');
  assert.notEqual(a.meshes.find(m => m.name === 'actor-thighL').geometry, standing.L, 'the seated trousers');
  assert.equal(a.setSeated(null), true); assert.equal(a.seated, false); step(1.0);
  assert.equal(a.setSeated(other.seat), true); step(1.2, 'point');
  assert.equal(a.setSeated(null), true); step(3.5);
  assert.equal(a.gesturing, null);
  for (const n of Object.keys(a.bones)) {
    assert.ok(angleTo(a.bones[n].quaternion, b.bones[n].quaternion) < 1e-5, `${n} turned ${(angleTo(a.bones[n].quaternion, b.bones[n].quaternion) / DEG).toExponential(2)}°`);
    assert.ok(a.bones[n].position.distanceTo(b.bones[n].position) < 1e-6, `${n} at ${a.bones[n].position.toArray()} (fresh: ${b.bones[n].position.toArray()})`);
  }
  for (const L of SIDES2) assert.equal(a.meshes.find(m => m.name === 'actor-thigh' + L).geometry, standing[L], `thigh ${L}: the standing trousers again`);
  for (const k of ['headYaw', 'headPitch', 'eyeYaw', 'eyePitch', 'blink', 'mouth']) assert.ok(Math.abs(a.state[k] - b.state[k]) < 1e-6, `state.${k}`);
  assert.ok(a.headWorld(new THREE.Vector3()).distanceTo(b.headWorld(new THREE.Vector3())) < 1e-6, 'the eyes');
  a.root.updateMatrixWorld(true); b.root.updateMatrixWorld(true);
  const ba = new THREE.Box3().setFromObject(a.root, true), bb = new THREE.Box3().setFromObject(b.root, true);
  assert.ok(ba.min.distanceTo(bb.min) < 1e-6 && ba.max.distanceTo(bb.max) < 1e-6, 'the same body');
  // and 'point' on its own aims where a standing actor's does (ahead to the right), not where a seated one's does
  a.gesture('point'); b.gesture('point'); run(a, 1.1); run(b, 1.1);
  assert.ok(world(a, 'handR').distanceTo(world(b, 'handR')) < 1e-5, 'the default point target');
});

test('actor: seated, update() reuses its objects too', () => {
  const a = seatedActor(9);
  const objs = [];
  for (const n of Object.keys(a.bones)) { const b = a.bones[n]; objs.push(b.position, b.quaternion, b.rotation, b.scale, b.matrix, b.matrixWorld); }
  objs.push(...a._scratch, a.state);
  const geos = new Set(a.meshes.map(m => m.geometry));
  const P = [THREE.Vector3, THREE.Quaternion, THREE.Matrix4, THREE.Euler, THREE.Matrix3, THREE.Color].map(C => C.prototype);
  const orig = P.map(p => p.clone);
  let clones = 0;
  P.forEach((p, i) => { p.clone = function () { clones++; return orig[i].call(this); }; });
  const targets = [new THREE.Vector3(-0.3, 0.34, -1.1), new THREE.Vector3(4, 0, -2), new THREE.Vector3(0.3, 4, -3), PILOT_EYE];
  try {
    for (let i = 0; i < 900; i++) {
      if (i % 150 === 10) { a.pointAt(targets[(i / 150) % 4 | 0]); a.gesture(GESTURE_NAMES[((i / 150) | 0) % GESTURE_NAMES.length]); }
      a.update(DT, { lookAt: i % 300 < 250 ? PILOT_EYE : null, talking: i % 200 < 120 });
    }
  } finally { P.forEach((p, i) => { p.clone = orig[i]; }); }
  assert.equal(clones, 0, 'clone() during update()');
  const after = [];
  for (const n of Object.keys(a.bones)) { const b = a.bones[n]; after.push(b.position, b.quaternion, b.rotation, b.scale, b.matrix, b.matrixWorld); }
  after.push(...a._scratch, a.state);
  after.forEach((o, i) => assert.ok(o === objs[i], `object ${i} was replaced`));
  for (const m of a.meshes) if (!/actor-hand[LR]/.test(m.name)) assert.ok(geos.has(m.geometry), `${m.name}: new geometry`);
  // sitting down again in the same seat builds nothing new
  const thigh = a.meshes.find(m => m.name === 'actor-thighL').geometry;
  a.setSeated(SEATED_PA28.seat);
  assert.equal(a.meshes.find(m => m.name === 'actor-thighL').geometry, thigh, 'the seated trousers made again');
});
