// CADET — academy tests (node --test): the interior plan (content/academy-spec.js) is consistent.
//  - the rooms fill the building without overlapping; every door sits on the wall between the two rooms it joins;
//  - every open room can be reached from the starting briefing room through doors that open, and so can the outside;
//  - the things to examine are inside their rooms, at a height you can see, with text taken from FLIGHT LAB;
//  - the walk from the briefing room to today's aircraft goes room to room through real doors.
// (The browser test walks the same route with the real colliders.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { ACADEMY as A } from '../src/world/layout.js';
import { academySpec } from '../src/content/academy-spec.js';
import { installSorajima } from '../src/flight/sorajima.js';
import { loadFL, CORE } from './helpers/fl.mjs';

loadFL(CORE);
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL;
const S = academySpec(FL);
const IN = { a0: A.a0 + A.wall, a1: A.a1 - A.wall, c0: A.c0 + A.wall, c1: A.c1 - A.wall };
const E = 1e-6;
const room = (id) => S.rooms.find(r => r.id === id);
const inRoom = (r, a, c, m = 0) => a >= r.a0 + m - E && a <= r.a1 - m + E && c >= r.c0 + m - E && c <= r.c1 - m + E;
const where = (a, c) => S.rooms.find(r => inRoom(r, a, c)) || null;

test('academy: rooms lie inside the building and do not overlap', () => {
  assert.ok(S.rooms.length >= 12);
  const ids = new Set();
  for (const r of S.rooms) {
    assert.ok(!ids.has(r.id), `duplicate room ${r.id}`); ids.add(r.id);
    assert.ok(r.a1 > r.a0 && r.c1 > r.c0, `${r.id}: empty`);
    assert.ok(r.a0 >= IN.a0 - E && r.a1 <= IN.a1 + E, `${r.id}: outside the building along a`);
    const c0 = r.a0 >= A.lob0 - E && r.a1 <= A.lob1 + E ? A.glassC : IN.c0;        // the lobby reaches the glass front
    assert.ok(r.c0 >= c0 - E && r.c1 <= IN.c1 + E, `${r.id}: outside the building across`);
    assert.ok(r.ceiling > 2.4 && r.ceiling < A.H, `${r.id}: ceiling ${r.ceiling}`);
    assert.ok(r.name_ja && r.floor, `${r.id}: name and floor`);
  }
  for (let i = 0; i < S.rooms.length; i++) for (let j = i + 1; j < S.rooms.length; j++) {
    const p = S.rooms[i], q = S.rooms[j];
    const da = Math.min(p.a1, q.a1) - Math.max(p.a0, q.a0), dc = Math.min(p.c1, q.c1) - Math.max(p.c0, q.c0);
    assert.ok(!(da > 1e-3 && dc > 1e-3), `${p.id} overlaps ${q.id}`);
  }
  // the ground floor is covered: no gaps bigger than a wall between the rooms
  let area = 0; for (const r of S.rooms) area += (r.a1 - r.a0) * (r.c1 - r.c0);
  const full = (IN.a1 - IN.a0) * (IN.c1 - IN.c0) + (A.lob1 - A.lob0) * (IN.c0 - A.glassC);
  assert.ok(area > full * 0.97 && area <= full + 1e-3, `rooms cover ${(area / full * 100).toFixed(1)} % of the floor`);
});

test('academy: every door is on the wall between the rooms it joins, wide enough, and doors do not overlap', () => {
  for (const d of S.doors) {
    assert.ok(['a', 'c'].includes(d.wall), `${d.id}: wall`);
    assert.ok(d.to - d.from >= 0.9 - E, `${d.id}: ${(d.to - d.from).toFixed(2)} m wide`);
    assert.ok(d.kind === 'opening' || d.kind === 'sliding_auto' || d.to - d.from <= 2.0, `${d.id}: too wide for a swing door`);
    for (const id of d.rooms) {
      if (id === 'outside') {
        // on the exterior wall or the lobby's glass front
        const ext = d.wall === 'c' ? [IN.c0, IN.c1, A.glassC] : [IN.a0, IN.a1];
        assert.ok(ext.some(x => Math.abs(x - d.at) < 0.05), `${d.id}: not on an outside wall`);
        continue;
      }
      const r = room(id); assert.ok(r, `${d.id}: unknown room ${id}`);
      const edges = d.wall === 'a' ? [r.a0, r.a1] : [r.c0, r.c1], span = d.wall === 'a' ? [r.c0, r.c1] : [r.a0, r.a1];
      assert.ok(edges.some(x => Math.abs(x - d.at) < 0.05), `${d.id}: not on an edge of ${id}`);
      assert.ok(d.from >= span[0] - E && d.to <= span[1] + E, `${d.id}: not within ${id}'s wall`);
    }
  }
  for (let i = 0; i < S.doors.length; i++) for (let j = i + 1; j < S.doors.length; j++) {
    const p = S.doors[i], q = S.doors[j];
    if (p.wall !== q.wall || Math.abs(p.at - q.at) > 0.05) continue;
    assert.ok(p.to <= q.from + E || q.to <= p.from + E, `${p.id} overlaps ${q.id}`);
  }
});

test('academy: from briefing room 1, every open room and the outside can be reached through doors that open', () => {
  const open = S.doors.filter(d => d.kind !== 'locked');
  const seen = new Set([S.start.room]), queue = [S.start.room];
  while (queue.length) { const r = queue.shift(); for (const d of open) if (d.rooms.includes(r)) for (const o of d.rooms) if (!seen.has(o)) { seen.add(o); queue.push(o); } }
  assert.ok(seen.has('outside'), 'cannot get out');
  for (const r of S.rooms) if (!r.closed) assert.ok(seen.has(r.id), `${r.id} cannot be reached`);
  for (const r of S.rooms) if (r.closed) assert.ok(!seen.has(r.id), `closed room ${r.id} can be entered`);
});

test('academy: the things to examine are in their rooms, at eye level, with text', () => {
  assert.ok(S.interactables.length >= 12);
  const ids = new Set();
  for (const it of S.interactables) {
    assert.ok(!ids.has(it.id), `duplicate ${it.id}`); ids.add(it.id);
    const r = room(it.room); assert.ok(r, `${it.id}: room ${it.room}`);
    assert.ok(inRoom(r, it.a, it.c), `${it.id}: not inside ${it.room}`);
    assert.ok(it.y >= 0.3 && it.y <= 2.9, `${it.id}: height ${it.y}`);
    assert.ok(it.prompt_ja && it.title_ja && it.text_ja && it.text_ja.length > 20, `${it.id}: text`);
    assert.ok(!/undefined|NaN|\[object/.test(it.text_ja + it.title_ja), `${it.id}: broken text`);
  }
  // furniture stands inside its room
  for (const r of S.rooms) for (const f of r.furniture || []) assert.ok(inRoom(r, f.a, f.c), `${r.id}: ${f.type} at ${f.a}, ${f.c} is outside the room`);
});

test('academy: the walk to today\'s aircraft goes from room to room through doors', () => {
  const st = S.start;
  assert.equal(where(st.a, st.c)?.id, 'brief-1');
  const pts = [{ a: st.a, c: st.c }, ...S.route];
  const inside = (a, c) => a > A.a0 && a < A.a1 && c > A.c0 && c < A.c1 && (c > IN.c0 || (a > A.lob0 && a < A.lob1 && c > A.glassC));
  const placeOf = (a, c) => (inside(a, c) ? where(a, c)?.id || 'wall' : 'outside');
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], q = pts[i], rp = placeOf(p.a, p.c), rq = placeOf(q.a, q.c);
    assert.notEqual(rp, 'wall'); assert.notEqual(rq, 'wall');
    if (rp === rq) continue;
    // the segment crosses a door joining the two places, through its opening
    const ok = S.doors.some(d => {
      if (!(d.rooms.includes(rp) && d.rooms.includes(rq))) return false;
      const [u0, u1, v0, v1] = d.wall === 'a' ? [p.a, q.a, p.c, q.c] : [p.c, q.c, p.a, q.a];
      if ((u0 - d.at) * (u1 - d.at) > 0) return false;
      const v = v0 + (v1 - v0) * (d.at - u0) / (u1 - u0);
      return v > d.from + 0.28 && v < d.to - 0.28;                    // the walker (radius 0.28 m) fits through
    });
    assert.ok(ok, `route ${i}: ${rp} → ${rq} without a door`);
  }
  const last = S.route[S.route.length - 1];
  assert.ok(Math.hypot(last.a - S.target.a, last.c - S.target.c) < 4, 'the route ends by the aircraft');
});
