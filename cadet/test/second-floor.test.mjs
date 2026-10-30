// CADET — second floor + usable furniture tests (node --test), Phase 3 (部屋の機能と2階):
//  - the second floor's rooms sit on the slab (floorY), do not overlap on their own storey, and the roof caps them;
//  - the door graph connects the ground floor's start room to every second-floor room and the roof, through the
//    stairwell (the graph-only stair edge), and every upper door's height is its rooms' floor;
//  - the stair flights' geometry (the rises and runs academy.js builds) stays climbable;
//  - the usable furniture exists as interactables on both sites, and its one number (the coffee) moves the
//    career's fatigue through the career's own API, once a day by its own done-mark;
//  - the notice boards rotate by the day, and the shelf's section rotates with them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { academySpec } from '../src/content/academy-spec.js';
import { dormSpec } from '../src/content/dorm-spec.js';
import { installSorajima } from '../src/flight/sorajima.js';
import { createCareer } from '../src/career/career.js';
import { usableKind, USABLE, COFFEE_TIRE, shelfSection, dailyNotices, NOTICES } from '../src/content/usable.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const S = academySpec(globalThis.FL);
const D = dormSpec();
const room = (id) => S.rooms.find(r => r.id === id);
const door = (id) => S.doors.find(d => d.id === id);
const F2 = 4.22, RF = 8.27;

test('second floor: the rooms are on the slab, the roof above them, the stairwell open', () => {
  for (const id of ['class2', 'corridor2-s', 'library', 'av', 'stairs2']) {
    const r = room(id); assert.ok(r, `${id} exists`);
    assert.equal(r.level, 2, `${id}: level 2`); assert.equal(r.floorY, F2, `${id}: on the slab`);
    assert.ok(!r.closed, `${id}: open`);
  }
  const roof = room('roof'); assert.ok(roof, 'roof exists');
  assert.equal(roof.level, 3); assert.equal(roof.floorY, RF); assert.ok(roof.open, 'the roof is open-air');
  // the stairwell itself: unlocked, tall enough for both flights, open (no ceiling of its own)
  const st = room('stairs');
  assert.ok(!st.closed, 'the stairs room is open'); assert.ok(st.open, 'the stairwell has no ceiling flat');
  assert.ok(st.ceiling >= 7, 'the stairwell rises through both flights');
  assert.notEqual(door('d-stairs').kind, 'locked', 'the stairs door is unlocked');
  // no two rooms overlap on the second storey (or the roof against anything of its level)
  const up = S.rooms.filter(r => (r.level || 1) > 1);
  for (let i = 0; i < up.length; i++) for (let j = i + 1; j < up.length; j++) {
    const p = up[i], q = up[j]; if ((p.level || 1) !== (q.level || 1)) continue;
    const da = Math.min(p.a1, q.a1) - Math.max(p.a0, q.a0), dc = Math.min(p.c1, q.c1) - Math.max(p.c0, q.c0);
    assert.ok(!(da > 1e-3 && dc > 1e-3), `${p.id} overlaps ${q.id} on its own storey`);
  }
  // the floor heights stack: ground 0 < slab top < roof
  assert.ok(0 < F2 && F2 < RF, 'the floors stack');
});

test('second floor: the door graph reaches every upper room and the roof, through the stairs', () => {
  const open = S.doors.filter(d => d.kind !== 'locked');
  const prev = new Map([[S.start.room, null]]), queue = [S.start.room];
  while (queue.length) { const r = queue.shift(); for (const d of open) if (d.rooms.includes(r)) for (const o of d.rooms) if (!prev.has(o)) { prev.set(o, r); queue.push(o); } }
  for (const id of ['stairs', 'stairs2', 'class2', 'corridor2-s', 'library', 'av', 'roof']) assert.ok(prev.has(id), `${id} is reachable`);
  // the way up passes the stairwell on both floors (the graph-only edge joins them)
  const chain = []; let cur = 'roof'; while (cur) { chain.push(cur); cur = prev.get(cur); }
  assert.ok(chain.includes('stairs2') && chain.includes('stairs'), `the roof's path climbs the stairs: ${chain.join(' → ')}`);
  // every upper door stands at its rooms' floor height (the leaf and its frame are built there)
  for (const d of S.doors) {
    if (d.graph) continue;
    const fy = Math.max(...d.rooms.filter(x => x !== 'outside').map(x => room(x).floorY || 0));
    if (fy > 0) assert.equal(d.y, fy, `${d.id}: at its floor ${fy}`);
  }
});

test('second floor: the flights academy.js builds are climbable (rise and run in range)', () => {
  // flight 1: 20 steps from the stairwell floor to the slab; flight 2: 18 from the slab to the roof
  const rise1 = F2 / 20, run1 = (645.4 - 640.2) / 20, rise2 = (RF - F2) / 18, run2 = (645.42 - 640.2) / 18;
  for (const [name, rise, run] of [['flight 1', rise1, run1], ['flight 2', rise2, run2]]) {
    assert.ok(rise >= 0.15 && rise <= 0.25, `${name}: rise ${rise.toFixed(3)} m`);
    assert.ok(run >= 0.24 && run <= 0.32, `${name}: run ${run.toFixed(3)} m`);
    // the walker's step-up (0.35 in collide.js) clears one tread from the one below
    assert.ok(rise < 0.35, `${name}: one tread is a step, not a wall`);
  }
});

test('usable furniture: every mapped target exists, and the training device is no longer 準備中', () => {
  const ac = new Set(S.interactables.map(t => t.id)), dm = new Set(D.interactables.map(t => t.id));
  for (const [id, kind] of Object.entries(USABLE)) {
    assert.ok(ac.has(id) || dm.has(id), `${id} (${kind}) is an interactable somewhere`);
    assert.equal(usableKind(id), kind);
  }
  const sim = S.interactables.find(t => t.id === 'sim-station');
  assert.ok(sim && !/準備中/.test(sim.text_ja + sim.prompt_ja), 'the training device invites practice, not 準備中');
  assert.equal(usableKind('sim-station'), 'sim');
  assert.equal(usableKind('coffee'), 'coffee'); assert.equal(usableKind('dorm-coffee'), 'coffee');
  assert.equal(usableKind('no-such-thing'), null);
});

test('usable furniture: the coffee moves fatigue through the career API, once a day', () => {
  assert.ok(COFFEE_TIRE < 0 && COFFEE_TIRE >= -10, 'a small relief, inside the career ranges');
  const store = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const c = createCareer({ store, seed: 3 });
  c.state.fatigue = 50;
  assert.ok(!c.doneToday('coffee', 'brew'), 'not yet today');
  c.tire(COFFEE_TIRE); c.done('coffee', 'brew');           // what main's coffeeUse does, once
  assert.equal(c.state.fatigue, 50 + COFFEE_TIRE, 'the fatigue eased by the coffee amount');
  assert.ok(c.doneToday('coffee', 'brew'), 'the mark is set: a second cup does nothing today');
});

test('usable furniture: the boards rotate by the day; the shelf opens a rotating section', () => {
  assert.deepEqual(dailyNotices(5), dailyNotices(5), 'the same day shows the same board');
  assert.notDeepEqual(dailyNotices(1).join(), dailyNotices(2).join(), 'the next day differs');
  assert.equal(dailyNotices(1).length, 3);
  for (const line of dailyNotices(9)) assert.ok(NOTICES.includes(line), 'every line is from the pool');
  const ids = ['s1', 's2', 's3', 's4', 's5'];
  const seen = new Set([1, 2, 3, 4, 5, 6].map(d => shelfSection(d, ids)));
  assert.ok(seen.size > 1, 'the shelf section rotates with the day');
  for (const id of seen) assert.ok(ids.includes(id));
  assert.equal(shelfSection(1, []), null, 'no sections, no book');
});
