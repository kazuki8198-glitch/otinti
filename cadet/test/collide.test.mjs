// CADET — collision tests (node --test): the walker's cylinder against the boxes of player/collide.js.
//  - walls stop it at its radius, it slides along them and settles into corners;
//  - a 1.0 m door lets a 0.3 m-radius walker through, a 0.5 m gap never does, and nothing is tunnelled at 60 m/s;
//  - low boxes are stepped over (and stood on), high ones walked under; doors close, open and slide;
//  - rays find the nearest box; huge boxes work; the results don't depend on the cell size; it is fast.
import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createCollisionWorld, acBox, placeBox } from '../src/player/collide.js';

const R = 0.3, near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const close = (a, b, tol, msg) => assert.ok(near(a, b, tol), `${msg ?? ''} expected ${b}, got ${a}`);
const rng = (seed) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

// walk frame by frame (dt 1/60) with a constant velocity → the final { x, y, z } and every frame's result
function walk(W, pos, vx, vz, seconds, opts = {}, dt = 1 / 60) {
  const p = { x: pos.x, y: pos.y ?? 0, z: pos.z }, frames = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    const m = W.move(p, vx * dt, vz * dt, opts);
    p.x = m.x; p.z = m.z; frames.push(m);
  }
  return { p, frames };
}

// a wall along x at z = [z0, z1] with an opening between gx0 and gx1 (the jambs run out to ±20 m)
function doorway(W, gx0, gx1, z0 = 0, z1 = 0.2) {
  W.add({ x0: -20, x1: gx0, z0, z1, y0: 0, y1: 3, tag: 'wall' });
  W.add({ x0: gx1, x1: 20, z0, z1, y0: 0, y1: 3, tag: 'wall' });
}

// the deepest overlap of a cylinder with any blocking box (brute force, for checking move)
function deepest(boxes, x, z, y = 0, r = R, height = 1.75, step = 0.35) {
  let worst = 0;
  for (const b of boxes) {
    if (!(b.y1 > y + step && b.y0 < y + height)) continue;
    const cx = Math.min(Math.max(x, b.x0), b.x1), cz = Math.min(Math.max(z, b.z0), b.z1), d = Math.hypot(x - cx, z - cz);
    worst = Math.max(worst, d > 0 ? r - d : r + Math.min(x - b.x0, b.x1 - x, z - b.z0, b.z1 - z));
  }
  return worst;
}

test('collide: walking into a wall stops at the radius, facing it', () => {
  const W = createCollisionWorld();
  W.add({ x0: 5, x1: 5.2, z0: -5, z1: 5, y0: 0, y1: 3 });
  const m = W.move({ x: 0, y: 0, z: 0 }, 10, 0);
  close(m.x, 5 - R, 1e-9, 'x'); close(m.z, 0, 1e-12, 'z');
  assert.equal(m.blocked, true);
  assert.deepEqual(m.hitNormal.map(v => +v.toFixed(9)), [-1, 0]);
  // and from the other side, frame by frame
  const { p } = walk(W, { x: 9, z: 1 }, -4, 0, 2);
  close(p.x, 5.2 + R, 1e-9, 'x from +x');
  // a move in the clear is exact and not blocked
  const f = W.move({ x: 0, y: 0, z: 0 }, 1.25, -2.5);
  assert.deepEqual([f.x, f.z, f.blocked, f.hitNormal], [1.25, -2.5, false, null]);
});

test('collide: sliding along a wall keeps the motion parallel to it', () => {
  const W = createCollisionWorld();
  W.add({ x0: 5, x1: 5.2, z0: -50, z1: 50, y0: 0, y1: 3 });
  const m = W.move({ x: 4.7, y: 0, z: 0 }, 2, 3);                    // touching, pushing in diagonally
  close(m.x, 4.7, 1e-9, 'x'); close(m.z, 3, 1e-9, 'z: all of the parallel motion');
  assert.equal(m.blocked, true); assert.deepEqual(m.hitNormal.map(v => +v.toFixed(9)), [-1, 0]);
  // a long frame-by-frame slide at 45° covers exactly the parallel distance
  const { p } = walk(W, { x: 3, z: 0 }, 3, -3, 4);
  close(p.x, 4.7, 1e-9, 'x'); close(p.z, -12, 1e-9, 'z');
  // over the seam between two wall pieces that meet end to end: no snag
  const W2 = createCollisionWorld();
  W2.add({ x0: 5, x1: 5.2, z0: -10, z1: 0, y0: 0, y1: 3 }); W2.add({ x0: 5, x1: 5.4, z0: 0, z1: 10, y0: 0, y1: 3 });
  const s = walk(W2, { x: 4.7, z: -2 }, 1, 2, 2).p;
  close(s.x, 4.7, 1e-9, 'x'); close(s.z, 2, 1e-9, 'z');
  // moving exactly parallel while touching is not blocked
  const t = W.move({ x: 4.7, y: 0, z: 0 }, 0, 1);
  assert.equal(t.blocked, false); close(t.z, 1, 1e-12);
});

test('collide: walking into an inside corner settles in the corner', () => {
  const W = createCollisionWorld();
  W.add({ x0: 5, x1: 5.2, z0: -10, z1: 5.2, y0: 0, y1: 3 });         // the walls meet (and overlap) at the corner
  W.add({ x0: -10, x1: 5.2, z0: 5, z1: 5.2, y0: 0, y1: 3 });
  for (const [vx, vz] of [[3, 3], [4, 1], [1, 4], [5, 1.2]]) {
    const { p, frames } = walk(W, { x: 0, z: 0 }, vx, vz, 6);
    close(p.x, 5 - R, 1e-6, `x (${vx}, ${vz})`); close(p.z, 5 - R, 1e-6, `z (${vx}, ${vz})`);
    assert.ok(frames.every(f => f.x <= 5 - R + 1e-6 && f.z <= 5 - R + 1e-6));
  }
  const m = W.move({ x: 4, y: 0, z: 4 }, 2, 2);
  close(m.x, 4.7, 1e-6); close(m.z, 4.7, 1e-6);
  close(m.hitNormal[0], -Math.SQRT1_2, 1e-6); close(m.hitNormal[1], -Math.SQRT1_2, 1e-6);
  // a corner of two walls that only touch (no overlap) and a room's four walls
  const W2 = createCollisionWorld();
  W2.add({ x0: 2, x1: 2.1, z0: -3, z1: 2 }); W2.add({ x0: -3, x1: 2, z0: 2, z1: 2.1 });
  const q = walk(W2, { x: 0, z: 0 }, 2, 2.5, 3).p;
  close(q.x, 2 - R, 1e-6); close(q.z, 2 - R, 1e-6);
});

test('collide: a 1.0 m door gap lets a 0.3 m walker through, even off-centre', () => {
  const W = createCollisionWorld();
  doorway(W, -0.5, 0.5);
  for (const x of [0, 0.15, -0.18, 0.35, -0.42, 0.45, -0.48]) {
    const { p, frames } = walk(W, { x, z: -3 }, 0, 1.4, 5);
    assert.ok(p.z > 3.0, `from x = ${x}: got through to z = ${p.z.toFixed(3)}`);
    assert.ok(Math.abs(p.x) <= 0.2 + 1e-6, `from x = ${x}: lined up in the door (x = ${p.x.toFixed(3)})`);
    for (const f of frames) assert.ok(deepest(W.query(-30, -30, 30, 30), f.x, f.z) <= 1e-4, 'never inside a jamb');
  }
  // straight into the jamb face beside the door (the centre in front of the jamb, not of the opening): stays out
  for (const x of [0.6, -0.65, 1.5]) {
    const j = walk(W, { x, z: -3 }, 0, 2, 3).p;
    close(j.z, -R, 1e-9, `stopped by the wall from x = ${x}`); close(j.x, x, 1e-9);
  }
});

test('collide: a 0.5 m gap blocks a 0.3 m walker, however it pushes', () => {
  const W = createCollisionWorld();
  doorway(W, -0.25, 0.25);
  const lim = -Math.sqrt(R * R - 0.25 * 0.25);                        // the closest the centre gets: touching both jamb corners
  for (const x of [0, 0.1, -0.2, 0.25, -0.4]) {
    const { p, frames } = walk(W, { x, z: -3 }, 0, 3, 4);
    assert.ok(p.z <= lim + 1e-5, `from x = ${x}: stays out (z = ${p.z.toFixed(4)})`);
    assert.ok(frames.every(f => f.z <= lim + 1e-5));
  }
  // jiggling at the gap for a long time, fast and slow, from every angle
  const rnd = rng(7), boxes = W.query(-30, -30, 30, 30), p = { x: 0, y: 0, z: -1 };
  let maxZ = -Infinity;
  for (let i = 0; i < 20000; i++) {
    const a = rnd() * Math.PI, sp = rnd() < 0.1 ? 30 : 4;              // mostly towards +z, some very fast steps
    const m = W.move(p, Math.cos(a) * sp / 60, Math.sin(a) * sp / 60);
    p.x = Math.max(-2, Math.min(2, m.x)); p.z = Math.max(-2, m.z);
    maxZ = Math.max(maxZ, m.z);
    assert.ok(deepest(boxes, m.x, m.z) <= 1e-4, `overlap at step ${i}`);
  }
  assert.ok(maxZ <= lim + 1e-5, `never got into the gap (max z ${maxZ})`);
});

test('collide: no tunnelling through a 0.1 m wall at 60 m/s with dt 1/30', () => {
  const W = createCollisionWorld();
  W.add({ x0: -10, x1: 10, z0: 0, z1: 0.1, y0: 0, y1: 3 });
  const dt = 1 / 30;
  let p = walk(W, { x: 0, z: -3 }, 0, 60, 1, {}, dt).p;
  close(p.z, -R, 1e-9, 'from −z');
  p = walk(W, { x: 0.3, z: 3 }, 0, -60, 1, {}, dt).p;
  close(p.z, 0.1 + R, 1e-9, 'from +z');
  const dg = walk(W, { x: -4, z: -2 }, 42, 42, 1, {}, dt);            // diagonal, sliding along it, then round its end
  for (const f of dg.frames) assert.ok(!(f.z > -R + 1e-9 && f.x < 10 + R - 1e-6 && f.x > -10 - R), `diagonal: in front of the wall at ${f.x}, ${f.z}`);
  assert.ok(dg.p.x > 10, 'went along the wall and round its end');
  // one enormous move, and a 1 cm wall (the steps are radius / 2, so the wall's thickness doesn't matter)
  close(W.move({ x: 0, y: 0, z: -3 }, 0, 500).z, -R, 1e-9, 'one 500 m move');
  W.add({ x0: -10, x1: 10, z0: 20, z1: 20.01, y0: 0, y1: 3 });
  close(W.move({ x: 0, y: 0, z: 5 }, 0.001, 300).z, 20 - R, 1e-9, 'a 1 cm wall');
  // at a 1° grazing angle, 60 m/s, across many hash cells: it slides the whole way and never gets in front of the wall
  const G = createCollisionWorld();
  G.add({ x0: -10, x1: 60, z0: 0, z1: 0.1, y0: 0, y1: 3 });
  const gr = walk(G, { x: -9, z: -1 }, 60 * Math.cos(0.0175), 60 * Math.sin(0.0175), 1, {}, dt);
  for (const f of gr.frames) assert.ok(f.z <= -R + 1e-9, `grazing: in front of the wall at ${f.x}, ${f.z}`);
  assert.ok(gr.p.x > 40, `grazing: slid to x ${gr.p.x}`);
});

test('collide: steps over a 0.2 m box (and stands on it), not over a 0.5 m one; stairs climb', () => {
  const W = createCollisionWorld();
  const low = W.add({ x0: -1, x1: 1, z0: 1, z1: 1.5, y0: 0, y1: 0.2, tag: 'kerb' });
  let m = W.move({ x: 0, y: 0, z: 0 }, 0, 3);
  assert.deepEqual([m.z, m.blocked], [3, false]);
  assert.equal(W.groundAt(0, 1.25, 0), 0.2, 'stands on it');
  assert.equal(W.groundAt(0, 1.6, 0), 0.2, 'still on it while the disc overlaps the edge');
  assert.equal(W.groundAt(0, 1.9, 0), 0, 'off it');
  assert.equal(W.groundAt(0, 1.6, 0, { radius: 0 }), 0, 'a point foot is already off');
  W.update(low, { y1: 0.5 });
  m = W.move({ x: 0, y: 0, z: 0 }, 0, 3);
  close(m.z, 1 - R, 1e-9, 'blocked by 0.5 m'); assert.equal(m.blocked, true);
  assert.equal(W.groundAt(0, 1.25, 0), 0, 'too high to step onto');
  // ...but from on top of a 0.2 m platform the 0.5 m box is a 0.3 m step
  m = W.move({ x: 0, y: 0.2, z: 0 }, 0, 3);
  assert.equal(m.blocked, false);
  // a flight of stairs (0.18 m risers, 0.28 m treads) up to a 1.8 m landing, walked with move + groundAt each frame
  const S = createCollisionWorld();
  for (let i = 1; i <= 10; i++) S.add({ x0: -0.6, x1: 0.6, z0: i * 0.28, z1: 10, y0: 0, y1: i * 0.18, tag: 'stair' });
  const p = { x: 0, y: 0, z: -1 };
  for (let f = 0; f < 300; f++) {
    const r = S.move(p, 0, 1.4 / 60);
    p.x = r.x; p.z = r.z;
    p.y = S.groundAt(p.x, p.z, p.y, { radius: 0.15 });
  }
  close(p.y, 1.8, 1e-9, 'on the landing'); assert.ok(p.z > 5);
});

test('collide: walks under a box whose bottom is 2.2 m up, unless standing higher', () => {
  const W = createCollisionWorld();
  W.add({ x0: -2, x1: 2, z0: 1, z1: 2, y0: 2.2, y1: 3, tag: 'beam' });
  let m = W.move({ x: 0, y: 0, z: 0 }, 0, 4);
  assert.deepEqual([m.z, m.blocked], [4, false]);
  m = W.move({ x: 0, y: 0.5, z: 0 }, 0, 4);                           // head at 2.25 m
  close(m.z, 1 - R, 1e-9); assert.equal(m.blocked, true);
  m = W.move({ x: 0, y: 0, z: 0 }, 0, 4, { height: 2.3 });            // a taller walker
  assert.equal(m.blocked, true);
  // a box just below the head (bottom 1.6 m) blocks, a sign whose bottom is exactly at head height doesn't
  W.add({ x0: -2, x1: 2, z0: 5, z1: 6, y0: 1.6, y1: 2 });
  W.add({ x0: -2, x1: 2, z0: -3, z1: -2, y0: 1.75, y1: 2 });
  close(W.move({ x: 0, y: 0, z: 3 }, 0, 3).z, 5 - R, 1e-9);
  assert.equal(W.move({ x: 0, y: 0, z: 0 }, 0, -4).blocked, false);
  // and from an upper floor (feet at 3.5 m) the beam is below the step height: walk over it
  assert.equal(W.move({ x: 0, y: 3.5, z: 0 }, 0, 4).blocked, false);
});

test('collide: a door blocks, opens (disabled), slides aside, closes again', () => {
  const W = createCollisionWorld();
  doorway(W, -0.5, 0.5);
  const door = W.add({ x0: -0.5, x1: 0.5, z0: 0.05, z1: 0.15, y0: 0, y1: 2.1, tag: 'door' });
  const through = () => walk(W, { x: 0, z: -2 }, 0, 1.4, 4).p;
  let p = through();
  close(p.z, 0.05 - R, 1e-9, 'closed');
  W.setEnabled(door, false);
  assert.ok(through().z > 3, 'open (disabled)');
  assert.equal(W.query(-1, -1, 1, 1).some(b => b.tag === 'door'), false, 'a disabled box is not listed');
  W.setEnabled(door, true);
  close(through().z, 0.05 - R, 1e-9, 'closed again');
  W.update(door, { x0: 0.5, x1: 1.5 });                               // slid into the wall
  assert.ok(through().z > 3, 'slid open');
  W.update(door, { x0: 0.2, x1: 1.2 });                               // 0.7 m open: the walker is steered round the edge
  p = through();
  assert.ok(p.z > 3 && p.x <= -0.1 + 1e-6, `part open: ${p.x.toFixed(3)}, ${p.z.toFixed(3)}`);
  W.update(door, { x0: -0.5, x1: 0.5 });
  close(through().z, 0.05 - R, 1e-9, 'slid shut');
  // a door closing on someone standing in the doorway pushes them out the nearer side
  const m = W.move({ x: 0, y: 0, z: 0.12 }, 0, 0);
  close(m.z, 0.15 + R, 1e-9); assert.equal(m.blocked, true);
  assert.equal(W.remove(door), true); assert.equal(W.remove(door), false);
  assert.ok(through().z > 3, 'removed');
  assert.equal(W.update(door, { x0: 0 }), false); assert.equal(W.setEnabled(door, true), false);
});

test('collide: a centre inside a box goes out through the nearest face', () => {
  const W = createCollisionWorld();
  W.add({ x0: 0, x1: 4, z0: 0, z1: 2, y0: 0, y1: 1 });
  let m = W.move({ x: 0.5, y: 0, z: 1 }, 0, 0);
  close(m.x, -R, 1e-12); close(m.z, 1, 1e-12); assert.deepEqual(m.hitNormal, [-1, 0]);
  m = W.move({ x: 2, y: 0, z: 1.8 }, 0, 0);
  close(m.x, 2, 1e-12); close(m.z, 2 + R, 1e-12);
  // inside a huge box: out through the nearest face, wherever that is in the hash
  W.add({ x0: 100, x1: 300, z0: 100, z1: 300, y0: 0, y1: 3 });
  m = W.move({ x: 297, y: 0, z: 150 }, 0.1, 0);
  close(m.x, 300 + R + 0.1, 1e-9);
});

test('collide: raycast finds the nearest box, misses, and respects maxDist', () => {
  const W = createCollisionWorld();
  const a = W.add({ x0: -1, x1: 1, z0: -5, z1: -4, y0: 0, y1: 2.5, tag: 'near' });
  const b = W.add({ x0: -1, x1: 1, z0: -10, z1: -9, y0: 0, y1: 2.5, tag: 'far' });
  let h = W.raycast(0, 1, 0, 0, 0, -1, 100);
  assert.equal(h.box.id, a); close(h.dist, 4, 1e-12); assert.equal(h.box.tag, 'near');
  close(W.raycast(0, 1, 0, 0, 0, -7, 100).dist, 4, 1e-12, 'a direction of any length');
  assert.equal(W.raycast(0, 1, 0, 0, 0, 1, 100), null, 'behind');
  assert.equal(W.raycast(0, 1, 0, 0, 1, 0, 100), null, 'up');
  assert.equal(W.raycast(0, 3, 0, 0, 0, -1, 100), null, 'over the top');
  assert.equal(W.raycast(0, 1, 0, 0, 0, -1, 3.9), null, 'beyond maxDist');
  close(W.raycast(0, 1, 0, 0, 0, -1, 4).dist, 4, 1e-12, 'exactly at maxDist');
  assert.equal(W.raycast(0, 1, 0, 0, 0, -1, 100, box => box.tag !== 'near').box.id, b, 'filtered');
  W.setEnabled(a, false);
  h = W.raycast(0, 1, 0, 0, 0, -1, 100);
  assert.equal(h.box.id, b); close(h.dist, 9, 1e-12);
  W.setEnabled(a, true);
  h = W.raycast(0, 1, -4.5, 0, 0, -1, 10);
  assert.deepEqual([h.box.id, h.dist], [a, 0], 'starting inside');
  h = W.raycast(0, 5, -4.5, 0, -1, 0, 10);
  assert.equal(h.box.id, a); close(h.dist, 2.5, 1e-12, 'straight down');
  h = W.raycast(6, 1, -4.5, -1, 0, 0, Infinity);
  assert.equal(h.box.id, a); close(h.dist, 5, 1e-12, 'no maxDist');
  assert.equal(W.raycast(0, 1, 0, 0, 0, 0, 10), null, 'no direction');
  // against brute force: random boxes and rays, long and short, every direction
  const rnd = rng(3), boxes = [], V = createCollisionWorld({ cell: 3 });
  for (let i = 0; i < 400; i++) {
    const x = rnd() * 200 - 100, z = rnd() * 200 - 100, w = 0.2 + rnd() * 8, d = 0.2 + rnd() * 8, y0 = rnd() < 0.3 ? rnd() * 2 : 0;
    const box = { x0: x, x1: x + w, z0: z, z1: z + d, y0, y1: y0 + 0.2 + rnd() * 3 };
    box.id = V.add(box); boxes.push(box);
  }
  for (let i = 0; i < 3000; i++) {
    const o = [rnd() * 220 - 110, rnd() * 3, rnd() * 220 - 110], dir = [rnd() * 2 - 1, (rnd() * 2 - 1) * 0.2, rnd() * 2 - 1];
    if (i % 10 === 0) dir[0] = 0;                                     // along the grid lines too
    if (i % 10 === 1) dir[2] = 0;
    const max = i % 3 ? 5 + rnd() * 60 : Infinity, l = Math.hypot(...dir), u = dir.map(v => v / l);
    let want = null;
    for (const bx of boxes) {
      let t0 = 0, t1 = Infinity, miss = false;
      for (const [k0, k1, j] of [['x0', 'x1', 0], ['y0', 'y1', 1], ['z0', 'z1', 2]]) {
        if (u[j] === 0) { if (o[j] < bx[k0] || o[j] > bx[k1]) miss = true; continue; }
        const p = (bx[k0] - o[j]) / u[j], q = (bx[k1] - o[j]) / u[j];
        t0 = Math.max(t0, Math.min(p, q)); t1 = Math.min(t1, Math.max(p, q));
      }
      if (!miss && t0 <= t1 && t0 <= max && (!want || t0 < want.dist)) want = { dist: t0, id: bx.id };
    }
    const got = V.raycast(...o, ...dir, max);
    if (!want) assert.equal(got, null, `ray ${i}`);
    else { assert.ok(got, `ray ${i} missed`); close(got.dist, want.dist, 1e-9, `ray ${i}`); }
  }
});

test('collide: boxes spanning many hash cells are found once, collide, move and go', () => {
  const W = createCollisionWorld({ cell: 4 });
  const huge = W.add({ x0: -500, x1: 500, z0: -500, z1: 500, y0: 0, y1: 0.05, tag: 'apron' });   // 62,500 cells
  const hall = W.add({ x0: 0, x1: 40, z0: 0, z1: 40, y0: 0, y1: 10, tag: 'hangar' });            // 121 cells
  const wall = W.add({ x0: -60, x1: 60, z0: -20.2, z1: -20, y0: 0, y1: 3, tag: 'wall' });         // 31 × 2 cells
  W.add({ x0: -Infinity, x1: Infinity, z0: 1000, z1: 1001, y0: 0, y1: 2, tag: 'fence' });          // endless
  assert.equal(W.count(), 4);
  let q = W.query(5, 5, 30, 30);
  assert.deepEqual(q.map(b => b.tag), ['apron', 'hangar'], 'each once, in id order');
  q = W.query(-100, -100, 100, 100);
  assert.deepEqual(q.map(b => b.id), [huge, hall, wall]);
  assert.deepEqual(W.query(600, 600, 610, 610), []);
  assert.deepEqual(W.query(2000, 1000.5, 2001, 1000.6).map(b => b.tag), ['fence']);
  assert.deepEqual(W.query(30, 30, 5, 5).map(b => b.id), [huge, hall], 'corners in either order');
  assert.deepEqual(W.query(40, 40, 45, 45).map(b => b.id), [huge, hall], 'an edge touching counts');
  assert.equal(W.query(-Infinity, -Infinity, Infinity, Infinity).length, 4, 'everything');
  // the apron is underfoot (stepped on), the hangar and the wall stop the walker, the fence goes on forever
  close(W.move({ x: -10, y: 0, z: 20 }, 20, 0).x, -R, 1e-9);
  close(W.move({ x: 20, y: 0, z: -30 }, 0, 50).z, -20.2 - R, 1e-9);
  close(W.move({ x: 5000, y: 0, z: 990 }, 0, 50).z, 1000 - R, 1e-9);
  assert.equal(W.groundAt(-100, -100, 0), 0.05);
  close(W.raycast(-300, 1, 20, 1, 0, 0, 400).dist, 300, 1e-9, 'the ray crosses 75 cells to the hangar');
  // grow, shrink and move the hangar
  W.update(hall, { x0: -300, x1: 300 });
  assert.equal(W.query(-250, 10, -249, 11).some(b => b.id === hall), true, 'grown (into the big list)');
  W.update(hall, { x0: 100, x1: 104, z0: 100, z1: 104 });
  assert.equal(W.query(-250, 10, -249, 11).some(b => b.id === hall), false, 'shrunk');
  assert.equal(W.query(101, 101, 102, 102).some(b => b.id === hall), true, 'moved');
  close(W.move({ x: 95, y: 0, z: 102 }, 10, 0).x, 100 - R, 1e-9);
  W.remove(huge); W.remove(hall);
  assert.deepEqual(W.query(-100, -100, 200, 200).map(b => b.id), [wall]);
  assert.equal(W.count(), 2);
  assert.throws(() => W.add({ x0: 0, x1: 1, z0: 0 }), TypeError);
  assert.throws(() => W.add({ x0: NaN, x1: 1, z0: 0, z1: 1 }), TypeError);
});

test('collide: the same walk gives the same path whatever the cell size or update order', () => {
  const run = (cell, shuffle) => {
    const W = createCollisionWorld({ cell }), rnd = rng(11), ids = [];
    for (let i = 0; i < 300; i++) {
      const x = rnd() * 60 - 30, z = rnd() * 60 - 30, w = 0.1 + rnd() * 4, d = 0.1 + rnd() * 4;
      ids.push(W.add({ x0: x, x1: x + w, z0: z, z1: z + d, y0: 0, y1: 1 + rnd() * 2 }));
    }
    // move every box away and back, in a different order: the hash's buckets get shuffled, the boxes don't change
    if (shuffle) for (const id of [...ids].reverse()) { const b = W.query(-99, -99, 99, 99).find(v => v.id === id); W.update(id, { x0: b.x0 + 50, x1: b.x1 + 50 }); W.update(id, { x0: b.x0, x1: b.x1 }); }
    const p = { x: 0, y: 0, z: 0 }, out = [];
    for (let i = 0; i < 4000; i++) {
      const a = rnd() * 2 * Math.PI, sp = rnd() < 0.05 ? 25 : 4;
      const m = W.move(p, Math.cos(a) * sp / 60, Math.sin(a) * sp / 60);
      p.x = m.x; p.z = m.z; out.push(m.x, m.z);
    }
    return out;
  };
  const a = run(4, false);
  assert.deepEqual(run(4, false), a, 'twice the same');
  assert.deepEqual(run(1, false), a, 'cell 1 m');
  assert.deepEqual(run(16, false), a, 'cell 16 m');
  assert.deepEqual(run(4, true), a, 'after shuffling the hash');
});

// does the segment p → q pass through the box's floor plan (shrunk by a hair: touching a face is not crossing)?
function segHits(p, q, b, e = 1e-6) {
  let t0 = 0, t1 = 1;
  for (const [o, d, lo, hi] of [[p.x, q.x - p.x, b.x0 + e, b.x1 - e], [p.z, q.z - p.z, b.z0 + e, b.z1 - e]]) {
    if (Math.abs(d) < 1e-12) { if (o < lo || o > hi) return false; continue; }
    let u = (lo - o) / d, v = (hi - o) / d; if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return false;
  }
  return true;
}

test('collide: a random walk through a crowded room never ends up inside anything', () => {
  const W = createCollisionWorld(), rnd = rng(5);
  for (let i = 0; i < 400; i++) {                                     // desks, pillars, thin partitions
    const x = rnd() * 40 - 20, z = rnd() * 40 - 20, thin = rnd() < 0.3;
    const w = thin ? 0.02 + rnd() * 0.1 : 0.2 + rnd() * 2, d = thin ? 1 + rnd() * 4 : 0.2 + rnd() * 2;
    const [bw, bd] = rnd() < 0.5 ? [w, d] : [d, w];
    W.add({ x0: x, x1: x + bw, z0: z, z1: z + bd, y0: rnd() < 0.15 ? 2.3 : 0, y1: rnd() < 0.15 ? 0.25 : 2.5 });
  }
  const boxes = W.query(-99, -99, 99, 99);
  const walkers = [];
  while (walkers.length < 12) {
    const p = { x: rnd() * 40 - 20, y: 0, z: rnd() * 40 - 20 };
    if (deepest(boxes, p.x, p.z) <= 0) walkers.push({ p, a: rnd() * 6.28 });
  }
  let worst = 0, blocked = 0;
  for (let f = 0; f < 3000; f++) for (const w of walkers) {
    w.a += (rnd() - 0.5) * 0.6;
    const sp = rnd() < 0.02 ? 60 : 5, dt = rnd() < 0.5 ? 1 / 60 : 1 / 30;
    const old = { x: w.p.x, z: w.p.z };
    const m = W.move(w.p, Math.cos(w.a) * sp * dt, Math.sin(w.a) * sp * dt);
    w.p.x = m.x; w.p.z = m.z;
    worst = Math.max(worst, deepest(boxes, m.x, m.z));
    // the centre never jumped across a box (thin partitions included): the straight line from where it was to where it
    // is never passes through a blocking box's floor plan, in any direction
    for (const b of boxes) {
      if (!(b.y1 > 0.35 && b.y0 < 1.75)) continue;
      assert.ok(!segHits(old, m, b), `jumped a box: ${JSON.stringify(old)} → ${m.x}, ${m.z} across ${JSON.stringify(b)}`);
    }
    if (m.blocked) { blocked++; w.a += Math.PI * rnd(); }
    if (Math.abs(w.p.x) > 30 || Math.abs(w.p.z) > 30) { w.a += Math.PI; }
  }
  assert.ok(worst <= 1e-4, `deepest overlap ${worst}`);
  assert.ok(blocked > 300, `the walkers did bump into things (${blocked})`);
});

test('collide: 2,000 boxes and 20,000 moves in well under a second', () => {
  const W = createCollisionWorld(), rnd = rng(9);
  for (let i = 0; i < 2000; i++) {
    const x = rnd() * 400 - 200, z = rnd() * 400 - 200, w = 0.2 + rnd() * 6, d = 0.2 + rnd() * 6;
    W.add({ x0: x, x1: x + w, z0: z, z1: z + d, y0: rnd() < 0.1 ? 0 : 0, y1: 0.5 + rnd() * 3 });
  }
  // a crowded interior too: 400 more within 40 × 40 m
  for (let i = 0; i < 400; i++) { const x = rnd() * 40 - 20, z = rnd() * 40 - 20; W.add({ x0: x, x1: x + 0.3 + rnd(), z0: z, z1: z + 0.3 + rnd(), y0: 0, y1: 1 }); }
  const walkers = Array.from({ length: 20 }, (_, i) => ({ p: { x: i < 10 ? rnd() * 40 - 20 : rnd() * 400 - 200, y: 0, z: i < 10 ? rnd() * 40 - 20 : rnd() * 400 - 200 }, a: rnd() * 6.28 }));
  const t0 = performance.now();
  let n = 0, blocked = 0;
  for (let f = 0; f < 1000; f++) for (const w of walkers) {
    w.a += (rnd() - 0.5) * 0.3;
    const m = W.move(w.p, Math.cos(w.a) * 6 / 60, Math.sin(w.a) * 6 / 60);
    w.p.x = m.x; w.p.z = m.z; n++;
    if (m.blocked) { blocked++; w.a += 2; }
  }
  const ms = performance.now() - t0;
  // and 20,000 interaction rays of 3 m
  const t1 = performance.now();
  for (let i = 0; i < 20000; i++) W.raycast(rnd() * 400 - 200, 1.6, rnd() * 400 - 200, rnd() - 0.5, rnd() * 0.2 - 0.1, rnd() - 0.5, 3);
  const msRay = performance.now() - t1;
  console.log(`    ${n} moves: ${ms.toFixed(1)} ms (${blocked} blocked); 20,000 rays: ${msRay.toFixed(1)} ms`);
  assert.equal(n, 20000);
  assert.ok(ms < 250, `moves took ${ms.toFixed(0)} ms`);
  assert.ok(msRay < 250, `rays took ${msRay.toFixed(0)} ms`);
});

test('collide: box helpers follow the runway frame and the spec rotation', () => {
  // along 10…12, across 3…4 → x = across, z = −along
  assert.deepEqual(acBox(10, 12, 3, 4, 0, 2.5, 'w'), { x0: 3, x1: 4, y0: 0, y1: 2.5, z0: -12, z1: -10, tag: 'w' });
  // a desk 1.6 m wide (local x) and 0.8 m deep (local z, front at +z) at frame (10, −20)
  const desk = { x0: -0.8, x1: 0.8, y0: 0, y1: 0.75, z0: -0.4, z1: 0.4, tag: 'desk' };
  const at = (rot) => { const b = placeBox(desk, 10, -20, rot); return [b.x0, b.x1, b.z0, b.z1].map(v => +v.toFixed(9)); };
  assert.deepEqual(at(0), [9.6, 10.4, -20.8, -19.2], 'rot 0: its front faces −c, so it is deep across');
  assert.deepEqual(at(90), [9.2, 10.8, -20.4, -19.6]);
  assert.deepEqual(at(180), at(0)); assert.deepEqual(at(270), at(90));
  // a box only in front of the origin shows which way it faces
  const front = { x0: -0.1, x1: 0.1, z0: 0.5, z1: 1, y0: 0, y1: 1 };
  const c = (rot) => { const b = placeBox(front, 0, 0, rot); return [Math.sign(Math.round((b.x0 + b.x1) * 1e6)), Math.sign(Math.round((b.z0 + b.z1) * 1e6))]; };
  assert.deepEqual(c(0), [-1, 0], 'rot 0 → −c (−x)');
  assert.deepEqual(c(90), [0, -1], 'rot 90 → +a (−z)');
  assert.deepEqual(c(180), [1, 0], 'rot 180 → +c');
  assert.deepEqual(c(270), [0, 1], 'rot 270 → −a (+z)');
  const b45 = placeBox(desk, 0, 0, 45);
  close(b45.x1 - b45.x0, (1.6 + 0.8) * Math.SQRT1_2, 1e-9, 'a turned piece: the box around it');
  const W = createCollisionWorld(), id = W.add(placeBox(desk, 10, -20, 90));
  assert.equal(W.query(10, -20, 10, -20)[0].id, id);
});
