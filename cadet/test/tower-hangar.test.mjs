// CADET — tower and hangar tests (node --test): Phase 4's places are consistent and walkable on paper.
//  - the tower's spec (content/tower-spec.js): rooms inside the building without overlapping (by floor), every
//    door on the wall between the rooms it joins, and a routed way hall → stair → cab through doors that open;
//  - the stair (world/layout.js towerStairs()): five flights climbing evenly from the hall floor to the cab
//    floor, no tread higher than the walker's step, every flight inside the shaft;
//  - the controller (content/people.js): a place in the cab, at the console, at the cab's floor height, all day
//    and never in the evening; the talk target's height follows (npc/cast.js reads place.y);
//  - the hangars: both stand open now, their furniture and the things to examine inside their walls, the prop
//    types exist; the mechanic's afternoon is in hangar 2 at work, his morning still on the apron;
//  - the tower visit's COMM: once a day through career.grow/done (the pattern main.js uses), and smaller than
//    the chair-flight practice's daily growth.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { towerSpec } from '../src/content/tower-spec.js';
import { hangarSpec } from '../src/content/hangar-spec.js';
import { makeRouter } from '../src/career/guide.js';
import { makeLayout, TOWER as T, HANGARS, towerStairs } from '../src/world/layout.js';
import { PEOPLE, placeOf } from '../src/content/people.js';
import { TOWER_COMM_BASE } from '../src/content/usable.js';
import { createCareer } from '../src/career/career.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const P = globalThis.FL.physics;
const S = towerSpec();
const room = (id) => S.rooms.find(r => r.id === id);

test('tower: rooms inside the building, no overlap on the same floor, doors on their walls', () => {
  const rects = (r) => r.floorRects || [[r.a0, r.a1, r.c0, r.c1]];
  for (const r of S.rooms) {
    assert.ok(r.a0 >= T.b0 && r.a1 <= T.b1 && r.c0 >= T.c0 && r.c1 <= T.c1, `${r.id} inside the base's plan`);
    for (const o of S.rooms) {
      if (o === r || (o.floorY || 0) !== (r.floorY || 0)) continue;
      for (const [a0, a1, c0, c1] of rects(r)) for (const [b0, b1, d0, d1] of rects(o)) {
        const overlap = Math.min(a1, b1) - Math.max(a0, b0) > 1e-9 && Math.min(c1, d1) - Math.max(c0, d0) > 1e-9;
        assert.ok(!overlap, `${r.id} overlaps ${o.id}`);
      }
    }
    for (const f of r.furniture || []) assert.ok(f.a >= r.a0 - 1.5 && f.a <= r.a1 + 1.5 && f.c >= r.c0 - 1.5 && f.c <= r.c1 + 1.5, `${r.id}: ${f.type} near its room`);
  }
  for (const d of S.doors) {
    for (const id of d.rooms) assert.ok(id === 'outside' || room(id), `${d.id}: room ${id} exists`);
    assert.ok(d.to > d.from, `${d.id} spans`);
    // on the shared wall of the two rooms it joins (the outside door: on the base's west face)
    const line = d.wall === 'a' ? d.at : d.at;
    const spans = d.rooms.filter(x => x !== 'outside').map(x => room(x));
    assert.ok(spans.every(r => line >= (d.wall === 'a' ? r.a0 : r.c0) - 0.5 && line <= (d.wall === 'a' ? r.a1 : r.c1) + 0.5), `${d.id} on its rooms' wall line`);
  }
  for (const it of S.interactables) {
    const r = room(it.room); assert.ok(r, `${it.id}'s room`);
    assert.ok(it.a >= r.a0 - 0.5 && it.a <= r.a1 + 0.5 && it.c >= r.c0 - 0.5 && it.c <= r.c1 + 0.5, `${it.id} in ${it.room}`);
    if (r.floorY) assert.ok(it.y > r.floorY && it.y < r.floorY + 2.4, `${it.id} at the cab's eye height`);
  }
});

test('tower: a routed way from the hall to the cab, through the stair', () => {
  const router = makeRouter(S);
  assert.ok(router.next('tower-hall', 'tower-stairs'), 'the hall reaches the stair');
  assert.ok(router.next('tower-stairs', 'tower-cab'), 'the stair reaches the cab');
  assert.ok(router.next('tower-hall', 'tower-cab'), 'the hall reaches the cab');
  assert.ok(router.next('outside', 'tower-cab'), 'the outside reaches the cab');
});

test('tower: the stair climbs evenly from the ground to the cab floor, inside the shaft', () => {
  const st = towerStairs(T), L = makeLayout(P);
  assert.equal(st.flights.length, 5);
  assert.ok(st.stepRise > 0.15 && st.stepRise <= 0.35, `a tread's rise ${st.stepRise} within the walker's step`);
  let y = 0;
  for (const f of st.flights) {
    assert.equal(f.y0, y, `flight ${f.k} starts where the last ended`);
    y = f.y1;
    assert.ok(f.c0 >= st.inC0 && f.c1 <= st.inC1 && Math.min(f.aFrom, f.aTo) >= st.inA0 && Math.max(f.aFrom, f.aTo) <= st.inA1, `flight ${f.k} in the shaft`);
    assert.ok(f.c1 - f.c0 > 1.8, `flight ${f.k} wide enough to walk`);
  }
  assert.equal(y, T.cabFloor, 'the flights reach the cab floor exactly');
  for (const l of st.landings) assert.ok(l.a0 >= st.inA0 && l.a1 <= st.inA1 && l.c0 >= st.inC0 && l.c1 <= st.inC1, 'a landing in the shaft');
  // the cab's floor pieces stay over the floor disc (radius 3.6 round the cab's centre) and leave the stair's
  // arrival (the last flight's lane and its landing strip) open
  for (const [a0, a1, c0, c1] of S.cabFloors) {
    for (const [a, c] of [[a0, c0], [a0, c1], [a1, c0], [a1, c1]]) assert.ok(Math.hypot(a - T.a, c - T.c) <= 3.65, `a floor corner (${a}, ${c}) over the disc`);
  }
  const last = st.flights[st.flights.length - 1];
  const covered = S.cabFloors.some(([a0, a1, c0, c1]) => {
    const a = (Math.min(last.aFrom, last.aTo) + Math.max(last.aFrom, last.aTo)) / 2, c = (last.c0 + last.c1) / 2;
    return a >= a0 && a <= a1 && c >= c0 && c <= c1;
  });
  assert.ok(!covered, "the last flight's middle is not floored over");
  assert.equal(L.cellAt(T.a, T.c)?.kind, 'walk', 'the tower stands on the building pad');
});

test('tower: the controller is in the cab all day, seated at the console, and gone in the evening', () => {
  const cab = room('tower-cab');
  for (const slot of ['morning', 'am', 'pm']) {
    const p = placeOf('controller', slot, 'ch2');
    assert.ok(p, `the controller placed in ${slot}`);
    assert.ok(p.a >= cab.a0 && p.a <= cab.a1 && p.c >= cab.c0 && p.c <= cab.c1, 'in the cab');
    assert.equal(p.y, T.cabFloor, 'at the cab floor');
    assert.ok(p.seat, 'seated at the console');
    // on a cab floor piece (somewhere to stand — content/tower-spec.js cabFloors)
    assert.ok(S.cabFloors.some(([a0, a1, c0, c1]) => p.a >= a0 && p.a <= a1 && p.c >= c0 && p.c <= c1), 'on a floor piece');
    // and at the console the spec put there
    assert.ok(cab.furniture.some(f => f.type === 'atc_console' && Math.abs(f.a - p.a) < 0.2 && Math.abs(f.c - (p.c - 1.1)) < 0.2), 'the console in front of the seat');
  }
  assert.equal(placeOf('controller', 'evening', 'ch2'), null, 'the tower is unstaffed in the evening');
  assert.ok(PEOPLE.controller && PEOPLE.controller.name && PEOPLE.controller.title, 'the controller is a person');
  const specPlace = S.controller;
  assert.equal(specPlace.y, T.cabFloor, "the spec's controller place agrees");
});

test('hangars: both open, furnished inside their walls, the mechanic afternoons in hangar 2', async () => {
  const { createPropKit } = await import('../src/world/props.js').catch(() => ({ createPropKit: null }));
  assert.ok(HANGARS.every(h => h.open), 'both hangars stand open');
  const H = hangarSpec();
  const types = createPropKit ? createPropKit().types() : [];
  for (const area of H.areas) {
    const h = area.hangar;
    for (const f of area.furniture) {
      assert.ok(f.a > h.a0 && f.a < h.a1 && f.c > h.c0 && f.c < h.c1, `${area.id}: ${f.type} inside`);
      if (createPropKit) assert.ok(types.includes(f.type), `prop type ${f.type} exists`);
    }
    for (const it of area.interactables) assert.ok(it.a > h.a0 && it.a < h.a1 && it.c > h.c0 && it.c < h.c1, `${area.id}: ${it.id} inside`);
  }
  if (createPropKit) for (const t of ['atc_console', 'workbench', 'tool_cabinet', 'parts_shelf', 'tire_stack', 'step_ladder']) assert.ok(types.includes(t), `prop type ${t} exists`);
  const h2 = HANGARS[1], pm = placeOf('mechanic', 'pm', 'ch2');
  assert.ok(pm.a > h2.a0 && pm.a < h2.a1 && pm.c > h2.c0 && pm.c < h2.c1 && pm.act === 'work', 'the mechanic at work in hangar 2 in the afternoon');
  assert.ok(placeOf('mechanic', 'am', 'ch2').c < 230, 'the mechanic on the apron in the morning, as before');
  assert.ok(placeOf('mechanic', 'morning', 'ch2').c < 230, 'and in the early morning');
});

test('tower visit: COMM grows once a day through the career, below the chair practice', () => {
  const m = new Map(); const store = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
  const c = createCareer({ store, seed: 7 });
  assert.ok(TOWER_COMM_BASE > 0 && TOWER_COMM_BASE < 1.0, 'below the chair-flight practice (1.0)');
  // the pattern main.js's towerChoose uses
  const visit = () => { if (!c.doneToday('tower', 'visit')) { c.grow('comm', TOWER_COMM_BASE, `tower:${c.state.day}`); c.done('tower', 'visit'); return true; } return false; };
  const before = c.state.abilities.comm;
  assert.ok(visit(), 'the first visit of the day counts');
  const afterOne = c.state.abilities.comm;
  assert.ok(afterOne > before, 'COMM grew');
  assert.ok(!visit(), 'the second visit of the day does not');
  assert.equal(c.state.abilities.comm, afterOne, 'and COMM did not grow again');
});
