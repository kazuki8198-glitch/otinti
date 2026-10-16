// CADET — actor tests (node --test): the instructor's body (src/npc/actor.js), without a browser.
//  - it builds within budget: ≤ 8,000 triangles, ≤ 20 meshes, 1.70–1.78 m tall, feet at y = 0, facing +z;
//  - 600 frames with a moving lookAt (talking or not) stay finite, and the head turns only within human limits while the
//    eyes do the first 15°; someone behind is not followed round;
//  - every gesture plays, then the body is back in exactly the pose it would have had without it;
//  - 'point' aims the right arm at pointAt()'s target, wherever the actor stands;
//  - update() works on the same objects every frame (no per-frame allocation).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createActor, LIMITS, GESTURE_NAMES } from '../src/npc/actor.js';

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
  assert.ok(a.triangles <= 8000, `${a.triangles} triangles`);
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
  assert.deepEqual([red.getX(0), red.getY(0), red.getZ(0)], [1, 0, 0]);
  // an undefined override keeps the default (not the colour of whatever part was made before)
  const headColors = (o) => Array.from(createActor(o).meshes.find(m => m.name === 'actor-head').geometry.attributes.color.array);
  assert.deepEqual(headColors({ colors: { hair: undefined, skin: null } }), headColors(), 'undefined colours');
});
