// CADET — door tests (node --test): the swing doors with the real walker and collisions, at 60, 144 and 240 Hz.
//  - a door closed while the player stands in its swing stops, and the player is not pushed (any frame rate);
//  - a player standing against a closed door can still open it away from them;
//  - a door stopped part-way blocks where its leaf is drawn, not the whole corner of the doorway.
// (The doors' textures are drawn on a canvas: a do-nothing canvas stands in for it here.)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

const ctx2d = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = globalThis.document || { createElement: () => ({ width: 1, height: 1, getContext: () => ctx2d }) };
const { createDoors } = await import('../src/world/doors.js');
const { createWalker, BODY } = await import('../src/player/walker.js');
const { createCollisionWorld } = await import('../src/player/collide.js');

const settings = { get: (k) => ({ headBob: false, fov: 75, sensitivity: 1, invertY: false })[k] };
const input = { takeLook: () => ({ x: 0, y: 0 }), down: () => false };
// a 1 m swing door in a wall along x at z = 0 (door-local = frame here: lx = x, lz = z), frame = world
function setup(kind = 'swing', width = 1) {
  const world = createCollisionWorld();
  world.add({ x0: -5, x1: 0, z0: -0.06, z1: 0.06, y0: 0, y1: 3 }); world.add({ x0: width, x1: width + 5, z0: -0.06, z1: 0.06, y0: 0, y1: 3 });
  const doors = createDoors({ frame: new THREE.Group(), world });
  const d = doors.add({ id: 't', kind, wall: 'a', at: 0, from: 0, to: width, label_ja: '' });
  const w = createWalker({ camera: new THREE.PerspectiveCamera(75, 1, 0.1, 100), world, L: { G: 0, frameYaw: 0 }, input, settings });
  return { world, doors, d, w };
}
const run = (S, seconds, hz) => { const dt = 1 / hz; for (let t = 0; t < seconds; t += dt) { S.w.update(dt); S.doors.update(dt, S.w.framePos); } };
const place = (S, x, z) => { S.w.setPose(x, z, 0, 0); S.w.setAuto({ forward: 0 }); };

for (const hz of [60, 144, 240]) {
  test(`doors: closing onto the player stops the door and does not push them (${hz} Hz)`, () => {
    for (const [kind, width, px, pz] of [['swing', 1, 0.4, -0.5], ['swing', 1, 0.9, -0.35], ['double_swing', 1.6, 0.5, -0.6]]) {
      const S = setup(kind, width);
      place(S, width / 2, 1.0); S.doors.toggle(S.d, S.w.framePos); run(S, 1.0, hz);       // open, away from the player
      assert.ok(Math.abs(S.d.angle) > 1.5, `${kind}: did not open (${S.d.angle})`);
      place(S, px, pz);
      const before = { ...S.w.framePos };
      assert.equal(S.doors.toggle(S.d, S.w.framePos), 'closed');
      run(S, 1.5, hz);
      const after = S.w.framePos, moved = Math.hypot(after.x - before.x, after.z - before.z);
      assert.ok(Math.abs(S.d.angle) > 0.2, `${kind} at (${px}, ${pz}): the door closed onto the player (angle ${S.d.angle.toFixed(3)})`);
      assert.ok(moved < 0.01, `${kind} at (${px}, ${pz}): pushed ${moved.toFixed(3)} m`);
      assert.ok(S.w.state.speed < 0.05, `${kind}: walking speed ${S.w.state.speed}`);
    }
  });

  test(`doors: standing against a closed door you can still open it away (${hz} Hz)`, () => {
    for (const x of [0.2, 0.5, 0.8]) {
      const S = setup();
      place(S, x, 0.9); S.w.setAuto({ forward: 1 }); S.w.state.yaw = 0;                    // walk into the door (towards −z)
      run(S, 1.0, hz);
      assert.ok(Math.abs(S.w.framePos.z - (0.045 + BODY.radius)) < 0.005, `not against the door: z ${S.w.framePos.z}`);
      S.w.setAuto({ forward: 0 });
      assert.equal(S.doors.toggle(S.d, S.w.framePos), 'opened');
      run(S, 1.0, hz);
      assert.ok(Math.abs(Math.abs(S.d.angle) - 1.6) < 1e-6, `at x ${x}: stopped at ${S.d.angle}`);
    }
  });
}

test('doors: a door stopped part-way blocks along its leaf, not the whole corner of the doorway', () => {
  const S = setup();
  place(S, 0.5, 1.0); S.doors.toggle(S.d, S.w.framePos);
  S.d.target = 0.8; run(S, 1.0, 60);                                                    // stand it at about 46°
  assert.ok(Math.abs(S.d.angle - 0.8) < 1e-9);
  const boxes = S.world.query(-1, -2, 2, 1).filter(b => b.tag === 'door:t');
  const inside = (x, z) => boxes.some(b => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
  // along the drawn leaf: solid
  for (let t = 0.05; t < 1; t += 0.1) assert.ok(inside(Math.cos(0.8) * t, -Math.sin(0.8) * t), `the leaf is not solid at ${t}`);
  // well off the leaf, inside the old single box: free
  for (const [x, z] of [[0.7, -0.15], [0.6, -0.1], [0.05, -0.65]]) assert.ok(!inside(x, z), `a box at ${x}, ${z}, away from the leaf`);
});
