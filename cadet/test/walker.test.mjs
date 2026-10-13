// CADET — walker tests (node --test): walking feels the same at any frame rate.
//  - against a wall the walker slides along it at the wish's speed along the wall (only the part of the velocity
//    pressed into the wall is lost), at 30, 60 and 144 frames a second;
//  - walking straight into a wall stops at the body's radius, and the speed drops to zero (a corner stops you);
//  - a push out of something that closed on you never turns into a run (the speed used for steps stays capped).
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
