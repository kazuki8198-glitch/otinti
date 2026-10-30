// CADET — Phase 2 (people live): the routes the cast walks (npc/walker-npc.js over the academy's and the
// dormitory's door graphs), the walking itself (arriving, at a natural speed, turned the way they go), and the
// seats and doings placeOf hands out (content/people.js) — each seat a real chair of its room, each act one the
// cast knows how to show.
import test from 'node:test';
import assert from 'node:assert/strict';
import { academySpec } from '../src/content/academy-spec.js';
import { dormSpec } from '../src/content/dorm-spec.js';
import { placeOf, PEERS } from '../src/content/people.js';
import { planRoute, roomOf, roomPath, WalkPath, WALK_SPEED } from '../src/npc/walker-npc.js';

// academySpec reads the syllabus and the aircraft from FLIGHT LAB; only those fields are touched here
const FL = {
  syllabus: { STAGES: [{ lessons: [{ id: 'a1', title: '' }, { id: 't1', title: '' }, { id: 'a2', title: '', dual: '', std: '' }, { id: 't3', title: '' }, { id: 'a3', title: '' }, { id: 'n2', title: '' }, { id: 'm1', title: '' }, { id: 'x1', title: '' }] }] },
  physics: { AIRCRAFT: [{ id: 'pa28', v: { rotate: 55, y: 79, x: 64, appr: 66, glide: 76 } }, { id: 'pa44', v: { mc: 56, yse: 88 } }] },
};
const SPEC = academySpec(FL), DORM = dormSpec(), SPECS = [SPEC, DORM];
const doorMid = (d) => (d.wall === 'a' ? { a: d.at, c: (d.from + d.to) / 2 } : { a: (d.from + d.to) / 2, c: d.at });
const MIDS = new Map();
for (const s of SPECS) for (const d of s.doors) MIDS.set(d.id, doorMid(d));

test('walk-npc: a route across the academy goes through the doors between the rooms', () => {
  const pts = planRoute(SPECS, { a: 640, c: 255 }, { a: 695, c: 255 });   // briefing room 1 → the lounge
  assert.ok(pts && pts.length >= 3, JSON.stringify(pts));
  assert.deepEqual([pts.at(-1).a, pts.at(-1).c], [695, 255], 'it ends where it was going');
  const doors = pts.filter(p => p.door).map(p => p.door);
  assert.equal(doors[0], 'd-brief-1', 'out of the briefing room by its own door');
  assert.ok(doors.includes('d-lounge'), 'into the lounge by its door');
  for (const p of pts) if (p.door) { const m = MIDS.get(p.door); assert.ok(Math.hypot(m.a - p.a, m.c - p.c) < 1.5, `${p.door} is at its door`); }
  // the room path is the chain the guide's router walks the cadet through
  assert.deepEqual(roomPath(SPECS, 'brief-1', 'lounge'), ['brief-1', 'corridor-s', 'lobby', 'corridor-n', 'lounge']);
});

test('walk-npc: inside the dorm, and from the dorm to a class room by the car park hub', () => {
  const inDorm = planRoute(SPECS, { a: 624, c: 372 }, { a: 635, c: 383 });   // the own room → the common room
  assert.deepEqual(inDorm.filter(p => p.door).map(p => p.door), ['d-dorm-room', 'd-dorm-common']);
  const cross = planRoute(SPECS, { a: 624, c: 372 }, { a: 640, c: 255 }, { hub: { a: 648, c: 322 } });
  const doors = cross.filter(p => p.door).map(p => p.door);
  assert.ok(doors.includes('x-dorm-main') && doors.includes('x-main'), doors.join(','));
  assert.ok(cross.some(p => !p.door && p.a === 648 && p.c === 322), 'the outdoor leg goes by the hub');
  assert.equal(roomOf(SPECS, 624, 372), 'dorm-room');
  assert.equal(roomOf(SPECS, 640, 210), 'outside');
  // no way through the doors (a spec of one sealed room): no route, the cast will simply be there
  const sealed = [{ rooms: [{ id: 'box', a0: 0, a1: 5, c0: 0, c1: 5 }], doors: [] }];
  assert.equal(planRoute(sealed, { a: 2, c: 2 }, { a: 50, c: 50 }), null);
  assert.deepEqual(planRoute(sealed, { a: 2, c: 2 }, { a: 3, c: 3 }), [{ a: 3, c: 3 }], 'the same room is a straight line');
});

test('walk-npc: the walk arrives, at a natural speed, having walked the route\'s length', () => {
  const pts = [{ a: 3, c: 0, door: 'x' }, { a: 3, c: 4 }];
  const w = new WalkPath(pts, { from: { a: 0, c: 0 } });
  let maxSpeed = 0, steps = 0;
  while (!w.done && steps < 60 * 30) { const r = w.update(1 / 30); maxSpeed = Math.max(maxSpeed, r.speed); steps++; }
  assert.ok(w.done, 'arrived');
  assert.ok(Math.hypot(w.pos.a - 3, w.pos.c - 4) < 0.1, `stands at ${JSON.stringify(w.pos)}`);
  assert.ok(maxSpeed <= WALK_SPEED * 1.01 && maxSpeed > 1.0, `top speed ${maxSpeed}`);
  assert.ok(Math.abs(w.dist - 7) < 0.6, `walked ${w.dist} of the route's 7 m`);
  assert.ok(steps / 30 > 4 && steps / 30 < 9, `took ${steps / 30}s for 7 m`);
});

test('walk-npc: the seats and doings placeOf hands out are real chairs, in their rooms, doing known things', () => {
  const ACTS = ['read', 'type', 'work', 'map'];
  const seen = { seat: 0, act: new Set() };
  const chapters = ['prologue', 'ch1', 'ch2', 'ch6'], slots = ['morning', 'am', 'pm', 'evening'];
  const whats = [[], [{ slot: 'am', kind: 'class' }], [{ slot: 'pm', kind: 'ftd' }], [{ slot: 'am', kind: 'checkride' }], [{ slot: 'morning', kind: 'graduation' }]];
  for (const ch of chapters) for (const sl of slots) for (const what of whats) for (const id of ['chief', 'lecturer', 'dispatcher', 'mechanic', 'examiner', ...PEERS]) {
    const p = placeOf(id, sl, ch, what); if (!p) continue;
    if (p.act) { assert.ok(ACTS.includes(p.act), `${id}: act ${p.act}`); seen.act.add(p.act); }
    if (p.seat) {
      seen.seat++;
      assert.ok(p.seat.h > 0.35 && p.seat.h < 0.65, `${id}: cushion height ${p.seat.h}`);
      // the seat stands in a room of one of the buildings (not in a wall, not outside)
      const room = roomOf(SPECS, p.a, p.c);
      assert.notEqual(room, 'outside', `${id} ${sl} ${ch}: seat at ${p.a},${p.c} is in ${room}`);
      assert.ok(p.face && Math.hypot(p.face.a - p.a, p.face.c - p.c) > 0.3, `${id}: a seated person faces somewhere`);
    }
  }
  assert.ok(seen.seat >= 10, `${seen.seat} seated places`);
  for (const a of ACTS) assert.ok(seen.act.has(a), `act ${a} used`);
  // the named ones, where the task asked for them
  const disp = placeOf('dispatcher', 'am', 'ch2');
  assert.ok(disp.seat && disp.act === 'type' && disp.a > 664 && disp.a < 676 && disp.c < 261, '佐伯さん at her desk in dispatch');
  assert.equal(placeOf('mechanic', 'am', 'ch2').act, 'work', '大城さん at work on the apron');
  const cls = [{ slot: 'am', kind: 'class' }], ftd = [{ slot: 'pm', kind: 'ftd' }];
  for (const id of PEERS) {
    const inClass = placeOf(id, 'am', 'ch1', cls);
    assert.ok(inClass.seat && inClass.a > 621 && inClass.a < 633.6 && inClass.c < 261, `${id} seated in briefing room 2`);
    const inSim = placeOf(id, 'pm', 'ch1', ftd);
    assert.ok(inSim.seat && inSim.c > 263.6 && inSim.c < 277.6, `${id} seated at a sim station`);
    const evening = placeOf(id, 'evening', 'ch2');
    assert.ok(evening.seat && evening.c > 379, `${id} seated in the dorm common room`);
  }
  assert.equal(placeOf('asahi', 'am', 'ch2').act, 'map', '朝日 at the planning map');
});
