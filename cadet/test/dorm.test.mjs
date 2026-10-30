// CADET — dormitory tests (node --test): the dormitory's plan (content/dorm-spec.js) is consistent, and its site
// (world/layout.js) agrees with FLIGHT LAB's physics.
//  - the rooms fill the building without overlapping; every door sits on the wall between the two rooms it joins;
//  - the cadet's own room reaches the entrance (and the outside) through doors that open — the way home and the
//    way to the academy in the morning;
//  - the bed and the desk are in the cadet's own room; the things to examine are inside their rooms;
//  - the dormitory's pad and the road to it never cover FLIGHT LAB pavement; the drawn region reaches it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dormSpec } from '../src/content/dorm-spec.js';
import { makeRouter } from '../src/career/guide.js';
import { makeLayout, DORM as D } from '../src/world/layout.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const P = globalThis.FL.physics;
const S = dormSpec();
const IN = { a0: D.a0 + D.wall, a1: D.a1 - D.wall, c0: D.c0 + D.wall, c1: D.c1 - D.wall };
const E = 1e-6;
const room = (id) => S.rooms.find(r => r.id === id);

test('dorm: rooms lie inside the building, do not overlap, and cover the floor', () => {
  const ids = new Set();
  for (const r of S.rooms) {
    assert.ok(!ids.has(r.id), `duplicate room ${r.id}`); ids.add(r.id);
    assert.ok(r.a1 > r.a0 && r.c1 > r.c0, `${r.id}: empty`);
    assert.ok(r.a0 >= IN.a0 - E && r.a1 <= IN.a1 + E && r.c0 >= IN.c0 - E && r.c1 <= IN.c1 + E, `${r.id}: outside the building`);
    assert.ok(r.ceiling > 2.4 && r.ceiling < D.H, `${r.id}: ceiling ${r.ceiling}`);
    assert.ok(r.name_ja && r.floor, `${r.id}: name and floor`);
  }
  for (let i = 0; i < S.rooms.length; i++) for (let j = i + 1; j < S.rooms.length; j++) {
    const p = S.rooms[i], q = S.rooms[j];
    const da = Math.min(p.a1, q.a1) - Math.max(p.a0, q.a0), dc = Math.min(p.c1, q.c1) - Math.max(p.c0, q.c0);
    assert.ok(!(da > 1e-3 && dc > 1e-3), `${p.id} overlaps ${q.id}`);
  }
  let area = 0; for (const r of S.rooms) area += (r.a1 - r.a0) * (r.c1 - r.c0);
  const full = (IN.a1 - IN.a0) * (IN.c1 - IN.c0);
  assert.ok(area > full * 0.97 && area <= full + 1e-3, `rooms cover ${(area / full * 100).toFixed(1)} % of the floor`);
  // the rooms the spec asks for are all there
  for (const id of ['dorm-room', 'dorm-entrance', 'dorm-common', 'dorm-kitchen', 'dorm-laundry', 'dorm-bath', 'dorm-corridor', 'dorm-wc', 'dorm-peer-1', 'dorm-peer-2', 'dorm-peer-3'])
    assert.ok(room(id), `missing ${id}`);
});

test('dorm: every door is on the wall between the rooms it joins', () => {
  for (const d of S.doors) {
    assert.equal(d.wall, 'c', `${d.id}: the dorm's doors are all on across walls`);
    assert.ok(d.to - d.from >= 0.9 - E, `${d.id}: ${(d.to - d.from).toFixed(2)} m wide`);
    assert.ok(d.kind === 'sliding_auto' || d.to - d.from <= 2.0, `${d.id}: too wide for a swing door`);
    for (const id of d.rooms) {
      if (id === 'outside') { assert.ok(Math.abs(d.at - IN.c0) < 0.05, `${d.id}: not on the entrance wall`); continue; }
      const r = room(id); assert.ok(r, `${d.id}: no room ${id}`);
      // on one of the room's across edges, and its span inside the room's along range
      assert.ok(Math.abs(r.c0 - d.at) < 0.05 || Math.abs(r.c1 - d.at) < 0.05, `${d.id}: not on a wall of ${id}`);
      assert.ok(d.from >= r.a0 - E && d.to <= r.a1 + E, `${d.id}: span outside ${id}`);
    }
    if (d.rooms[0] !== 'outside' && d.rooms[1] !== 'outside') {
      const [p, q] = d.rooms.map(room);
      assert.ok(Math.abs(p.c1 - q.c0) < 0.05 || Math.abs(q.c1 - p.c0) < 0.05, `${d.id}: ${d.rooms} are not neighbours`);
    }
  }
});

test('dorm: the way from the cadet\'s room to the entrance and out, through doors that open', () => {
  const R = makeRouter(S);
  assert.equal(R.next('dorm-room', 'dorm-corridor').door, 'd-dorm-room');
  assert.equal(R.next('dorm-entrance', 'dorm-corridor').door, 'd-dorm-entrance');
  // hop by hop from the own room to the outside (the router names one door at a time)
  let at = 'dorm-room', hops = 0;
  while (at !== 'outside' && hops < 8) {
    const step = R.next(at, 'outside');
    assert.ok(step, `no way from ${at} to outside`);
    const d = S.doors.find(x => x.id === step.door);
    assert.notEqual(d.kind, 'locked', `${d.id} is locked`);
    at = d.rooms[0] === at ? d.rooms[1] : d.rooms[0];
    hops++;
  }
  assert.equal(at, 'outside');
  assert.ok(hops >= 2 && hops <= 3, `the way out takes ${hops} doors`);
  // the peers' rooms stay behind locked doors (Phase 2 opens them)
  assert.equal(R.next('dorm-room', 'dorm-peer-1'), null);
});

test('dorm: the bed and the desk are in the cadet\'s own room; the things to examine are in their rooms', () => {
  const bed = S.interactables.find(x => x.id === 'dorm-bed'), desk = S.interactables.find(x => x.id === 'dorm-desk');
  assert.ok(bed && desk, 'the bed and the desk exist');
  assert.equal(bed.room, 'dorm-room'); assert.equal(desk.room, 'dorm-room');
  const mine = room('dorm-room');
  for (const it of [bed, desk]) assert.ok(it.a > mine.a0 && it.a < mine.a1 && it.c > mine.c0 && it.c < mine.c1, `${it.id} in the room`);
  for (const it of S.interactables) {
    const r = room(it.room); assert.ok(r, `${it.id}: no room ${it.room}`);
    assert.ok(it.a >= r.a0 - E && it.a <= r.a1 + E && it.c >= r.c0 - E && it.c <= r.c1 + E, `${it.id}: outside ${it.room}`);
    assert.ok(it.prompt_ja && it.title_ja && it.text_ja, `${it.id}: words`);
  }
  // the furniture the life loop uses is placed: a bed to sleep in, a desk to study at, the five new props among them
  const types = new Set(S.rooms.flatMap(r => (r.furniture || []).map(f => f.type)));
  for (const t of ['bed', 'wardrobe', 'kitchen_counter', 'washing_machine', 'shower_booth']) assert.ok(types.has(t), `no ${t} placed`);
  const src = fs.readFileSync(path.join(here, '../src/world/props.js'), 'utf8');
  for (const t of ['bed', 'wardrobe', 'kitchen_counter', 'washing_machine', 'shower_booth']) assert.match(src, new RegExp(`\\n  ${t}\\(P, M`), `props: no builder ${t}`);
});

test('dorm: the site agrees with FLIGHT LAB — no game surface over its pavement, the region reaches the dorm', () => {
  const L = makeLayout(P);
  assert.equal(L.region.c1, 398);
  for (const s of L.SITE) for (const p of P.PAVED) {
    const overlap = Math.min(s[1], p[1]) - Math.max(s[0], p[0]) > 0 && Math.min(s[3], p[3]) - Math.max(s[2], p[2]) > 0;
    assert.ok(!overlap, `${s[4]} ${s.slice(0, 4)} overlaps ${p[4]} ${p.slice(0, 4)}`);
  }
  // the dormitory's own rectangle is clear of FLIGHT LAB pavement too
  for (const p of P.PAVED) {
    const overlap = Math.min(D.a1, p[1]) - Math.max(D.a0, p[0]) > 0 && Math.min(D.c1, p[3]) - Math.max(D.c0, p[2]) > 0;
    assert.ok(!overlap, `the dormitory overlaps ${p[4]}`);
  }
  // the road from the car park and the dorm's pad are drawn surfaces, and the start is in the cadet's room
  assert.equal(L.cellAt(643, 358)?.kind, 'lot');
  assert.equal(L.cellAt(643, 363)?.kind, 'lot');          // the road's end, in front of the entrance
  assert.equal(L.cellAt(620, 363)?.kind, 'walk');
  assert.equal(L.cellAt((D.a0 + D.a1) / 2, (D.c0 + D.c1) / 2)?.kind, 'walk');
  const st = S.start, r = room(st.room);
  assert.ok(st.a > r.a0 && st.a < r.a1 && st.c > r.c0 && st.c < r.c1, 'the morning starts in the cadet\'s room');
});
