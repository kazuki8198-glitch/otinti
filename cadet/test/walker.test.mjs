// CADET — walker tests (node --test): walking feels the same at any frame rate.
//  - against a wall the walker slides along it at the wish's speed along the wall (only the part of the velocity
//    pressed into the wall is lost), at 30, 60 and 144 frames a second;
//  - walking straight into a wall stops at the body's radius, and the speed drops to zero (a corner stops you);
//  - a push out of something that closed on you never turns into a run (the speed used for steps stays capped);
//  - on a talk's leash (3 m round where the talk began) walking away stops at the rim, a step along it slides round,
//    walking back in is free, and the walls still stop it (the leash only takes off the outward part of each step).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWalker, BODY } from '../src/player/walker.js';
import { createCollisionWorld } from '../src/player/collide.js';

const settings = { get: (k) => ({ headBob: false, fov: 75, sensitivity: 1, invertY: false })[k] };
const input = { takeLook: () => ({ x: 0, y: 0 }), down: () => false };
// a walker in a world whose runway frame is turned (as LAB's is: the walker works in world space, collides in the frame)
function setup(frameYaw = -354 * Math.PI / 180) {
  const world = createCollisionWorld();
  world.add({ x0: 0, x1: 1, z0: -1000, z1: 1000, y0: 0, y1: 3, tag: 'wall' });     // a long wall: frame x 0…1
  const L = { G: 0, frameYaw };
  const w = createWalker({ camera: new THREE.PerspectiveCamera(75, 1, 0.1, 100), world, L, input, settings });
  return { w, world };
}
// start 1 m from the wall (frame x = -1), heading `deg` off the wall's normal, towards −z along it
function slide(deg, hz, seconds = 4) {
  const { w } = setup();
  const [x, z] = w.toWorld(-1, 0), a = deg * Math.PI / 180;
  const [dx, dz] = w.toWorld(Math.cos(a), -Math.sin(a));                              // into the wall (+x) and along −z
  w.setPose(x, z, Math.atan2(-dx, -dz), 0); w.setAuto({ forward: 1 });
  const dt = 1 / hz;
  for (let t = 0; t < 2.5; t += dt) w.update(dt);
  const z0 = w.framePos.z;
  for (let t = 0; t < seconds; t += dt) w.update(dt);
  return { along: (z0 - w.framePos.z) / seconds, x: w.framePos.x };
}

test('walker: slides along a wall at the wish\'s speed along it, at 30, 60 and 144 Hz', () => {
  for (const deg of [20, 45, 60]) for (const hz of [30, 60, 144]) {
    const ideal = 1.45 * Math.sin(deg * Math.PI / 180), r = slide(deg, hz);
    assert.ok(Math.abs(r.along - ideal) < 0.03 * ideal, `${deg}° at ${hz} Hz: ${r.along.toFixed(3)} m/s along the wall, ideal ${ideal.toFixed(3)}`);
    assert.ok(Math.abs(r.x - (-BODY.radius)) < 1e-3, `${deg}° at ${hz} Hz: x ${r.x} (should touch the wall at the radius)`);
  }
});

test('walker: straight into a wall it stops at the radius, with no speed left', () => {
  for (const hz of [30, 144]) {
    const r = slide(0, hz, 1);
    assert.ok(Math.abs(r.along) < 1e-6, `drifts along the wall: ${r.along}`);
    assert.ok(Math.abs(r.x + BODY.radius) < 1e-3, `x ${r.x}`);
  }
  const { w } = setup();
  const [x, z] = w.toWorld(-1, 0), [dx, dz] = w.toWorld(1, 0);
  w.setPose(x, z, Math.atan2(-dx, -dz), 0); w.setAuto({ forward: 1 });
  for (let t = 0; t < 2; t += 1 / 60) w.update(1 / 60);
  assert.ok(Math.hypot(w.state.vx, w.state.vz) < 1e-6 && w.state.speed < 1e-6, `still moving: ${w.state.vx}, ${w.state.vz}`);
});

test('walker: a push out of a box that appears on it does not become a run', () => {
  const { w, world } = setup();
  const [x, z] = w.toWorld(-1, 0);
  w.setPose(x, z, 0, 0); w.setAuto({ forward: 0 });
  w.update(1 / 60);
  // a door leaf closes on the walker: a box over its centre; the next step settles it out
  world.add({ x0: -1.1, x1: -0.9, z0: -0.5, z1: 0.5, y0: 0, y1: 2.1, tag: 'door' });
  const steps = [];
  for (let i = 0; i < 30; i++) { w.update(1 / 60); steps.push(w.state.speed); }
  assert.ok(Math.max(...steps) <= 3.8 + 1e-9, `speed after the push: ${Math.max(...steps).toFixed(2)} m/s`);
  assert.ok(Math.hypot(w.state.vx, w.state.vz) < 0.5, `left with a velocity of ${Math.hypot(w.state.vx, w.state.vz).toFixed(2)} m/s`);
});

// the walker's distance from a point (world x, z) and its bearing round it
const from = (w, c) => ({ d: Math.hypot(w.state.x - c.x, w.state.z - c.z), ang: Math.atan2(w.state.z - c.z, w.state.x - c.x) });
const yawTo = (dx, dz) => Math.atan2(-dx, -dz);                           // the walker's yaw that faces (dx, dz)

test('walker: on a talk\'s leash it stops at the rim, slides round it, and walks back in freely', () => {
  for (const hz of [30, 60, 144]) {
    const dt = 1 / hz;
    const w = createWalker({ camera: new THREE.PerspectiveCamera(75, 1, 0.1, 100), world: createCollisionWorld(), L: { G: 0, frameYaw: -354 * Math.PI / 180 }, input, settings });
    const leash = { x: 12, z: -30, r: 3 };
    w.setPose(leash.x, leash.z, yawTo(1, 0.3), 0); w.setAuto({ forward: 1, run: true });
    let far = 0;
    for (let t = 0; t < 4; t += dt) { w.update(dt, { leash }); far = Math.max(far, from(w, leash).d); }
    assert.ok(far <= leash.r + 1e-9, `${hz} Hz: ${far.toFixed(4)} m from where the talk began`);
    assert.ok(from(w, leash).d > leash.r - 0.01, `${hz} Hz: stopped short of the rim at ${from(w, leash).d.toFixed(3)} m`);
    assert.ok(Math.hypot(w.state.vx, w.state.vz) < 0.05, `${hz} Hz: still pressing outward at ${Math.hypot(w.state.vx, w.state.vz).toFixed(2)} m/s`);
    // half along the rim (45° off straight out): it slides round, at no more than the wish's speed, never out
    const a0 = from(w, leash).ang, out = [w.state.x - leash.x, w.state.z - leash.z];
    const along = [-out[1], out[0]], wish = [out[0] + along[0], out[1] + along[1]];
    w.state.yaw = yawTo(wish[0], wish[1]); w.setAuto({ forward: 1 });
    far = 0;
    for (let t = 0; t < 3; t += dt) { w.update(dt, { leash }); far = Math.max(far, from(w, leash).d); }
    const arc = Math.abs(Math.atan2(Math.sin(from(w, leash).ang - a0), Math.cos(from(w, leash).ang - a0))) * leash.r;
    assert.ok(far <= leash.r + 1e-9, `${hz} Hz: along the rim it left the circle (${far.toFixed(4)} m)`);
    assert.ok(arc > 1.5 && arc < 1.45 * 3 + 0.05, `${hz} Hz: slid ${arc.toFixed(2)} m round the rim in 3 s`);
    // back in: no leash felt
    const back = [leash.x - w.state.x, leash.z - w.state.z];
    w.state.yaw = yawTo(back[0], back[1]);
    for (let t = 0; t < 1.5; t += dt) w.update(dt, { leash });
    assert.ok(from(w, leash).d < 1.2, `${hz} Hz: walking back in, still ${from(w, leash).d.toFixed(2)} m out`);
  }
});

test('walker: the leash does not let it through a wall: along the wall to the rim, and there it stops', () => {
  const { w } = setup();
  const [x, z] = w.toWorld(-1, 0), leash = { x, z, r: 3 };
  const [dx, dz] = w.toWorld(Math.cos(30 * Math.PI / 180), -Math.sin(30 * Math.PI / 180));    // into the wall (+x) and along −z
  w.setPose(x, z, Math.atan2(-dx, -dz), 0); w.setAuto({ forward: 1 });
  let far = 0, maxX = -Infinity;
  for (let t = 0; t < 8; t += 1 / 60) { w.update(1 / 60, { leash }); far = Math.max(far, from(w, leash).d); maxX = Math.max(maxX, w.framePos.x); }
  assert.ok(far <= leash.r + 1e-9, `left the circle: ${far.toFixed(4)} m`);
  assert.ok(maxX <= -BODY.radius + 1e-6, `into the wall: frame x ${maxX}`);
  // where the wall meets the rim: 0.72 m from the wall's face line out to 3 m, so √(3² − 0.72²) along it
  assert.ok(Math.abs(-w.framePos.z - Math.sqrt(9 - (1 - BODY.radius) ** 2)) < 0.02, `stopped ${(-w.framePos.z).toFixed(3)} m along the wall`);
  assert.ok(Math.hypot(w.state.vx, w.state.vz) < 0.05 && w.state.speed < 0.05, `still moving: ${w.state.speed}`);
});

test('walker: round a corner a wall that pushes it out of the circle does not carry it past the leash', () => {
  // a desk (frame x 0…1, z −1…0); the talk began in front of it, the walker went round to its side: its side face pushes
  // the walker away from where the talk began (the leash's step towards the centre goes into the desk)
  const world = createCollisionWorld();
  world.add({ x0: 0, x1: 1, z0: -1, z1: 0, y0: 0, y1: 0.75, tag: 'desk' });
  const L = { G: 0, frameYaw: -354 * Math.PI / 180 };
  for (const hz of [30, 60, 144]) {
    const w = createWalker({ camera: new THREE.PerspectiveCamera(75, 1, 0.1, 100), world, L, input, settings });
    const [cx, cz] = w.toWorld(0.5, 0.6), leash = { x: cx, z: cz, r: 1.5 };
    const [x, z] = w.toWorld(1 + BODY.radius, -0.6);
    const [dx, dz] = w.toWorld(-0.5, -1);                                    // into the desk's side, and along it away
    w.setPose(x, z, Math.atan2(-dx, -dz), 0); w.setAuto({ forward: 1 });
    let far = 0, inDesk = false;
    for (let t = 0; t < 3; t += 1 / hz) {
      w.update(1 / hz, { leash });
      far = Math.max(far, from(w, leash).d);
      const p = w.framePos; if (p.x < 1 + BODY.radius - 1e-6 && p.z < BODY.radius && p.z > -1 - BODY.radius) inDesk = true;
    }
    assert.ok(far <= leash.r + 1e-9, `${hz} Hz: ${far.toFixed(4)} m from where the talk began`);
    assert.ok(!inDesk, `${hz} Hz: into the desk`);
  }
});

test('walker: update takes the caller\'s look, says when the keys ask to move, and leaves ↑↓ to a talk\'s choices', () => {
  const keys = new Set();
  const inp = { takeLook: () => { throw new Error('the caller took the look already'); }, down: (c) => keys.has(c) };
  const w = createWalker({ camera: new THREE.PerspectiveCamera(75, 1, 0.1, 100), world: createCollisionWorld(), L: { G: 0, frameYaw: 0 }, input: inp, settings });
  w.setPose(0, 0, 0, 0);
  assert.equal(w.update(1 / 60, { look: { x: 100, y: 0 } }), false);
  assert.ok(Math.abs(w.state.yaw + 100 * 0.0022) < 1e-12, `yaw ${w.state.yaw}`);
  keys.add('ArrowUp');
  assert.equal(w.update(1 / 60, { look: { x: 0, y: 0 }, upDown: false }), false, '↑ is the choices\' while they are shown');
  assert.equal(w.update(1 / 60, { look: { x: 0, y: 0 } }), true);
  keys.clear(); keys.add('KeyA');
  assert.equal(w.update(1 / 60, { look: { x: 0, y: 0 }, upDown: false }), true, 'A (and ←→) still walk');
});
