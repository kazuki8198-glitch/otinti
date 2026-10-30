// CADET — npc/walker-npc.js : how a person gets from one place to another on foot (Phase 2: people live).
// Pure (no three.js, Node tests import it): the route is planned over the buildings' door graphs — the same doors
// career/guide.js's makeRouter walks the cadet through, here across several specs at once (the academy, the
// dormitory) with 'outside' as the room they share. Rooms are rectangles, so a straight line between two door
// points of one room stays in the room; a long outdoor leg between two buildings goes by a hub point on the
// car park, so nobody cuts across the grass in a straight line from door to door.
//   planRoute(specs, from, to, { hub }) → [{ a, c, door? }] | null (null: no way through the doors — teleport)
//   WalkPath: steps a position along those points at a natural speed, turning smoothly; the cast moves the
//   actor's root by what it says and opens the doors the points name.
export const WALK_SPEED = 1.2;                       // m/s, a natural indoor walk

const doorMid = (d) => (d.wall === 'a' ? { a: d.at, c: (d.from + d.to) / 2 } : { a: (d.from + d.to) / 2, c: d.at });

// the room a point stands in (the first spec that has it), or 'outside'
export function roomOf(specs, a, c) {
  for (const s of specs) for (const r of s.rooms) if (a >= r.a0 && a <= r.a1 && c >= r.c0 && c <= r.c1) return r.id;
  return 'outside';
}

// every open door of every spec, once (a door belongs to one spec, but the two buildings share 'outside')
export function allDoors(specs) {
  const out = [];
  for (const s of specs) for (const d of s.doors) if (d.kind !== 'locked') out.push(d);
  return out;
}

// the way from one room to another, as { rooms, doors } (the door used between each pair), or null when there
// is no way. Not a plain breadth-first search: a hop costs 1 plus the distance walked to its door, so the way
// in from outside is the front door the road leads to, not the airside doors a straight line would cut across
// the building to reach. fromPt / toPt ({ a, c }, optional) anchor the first and last legs.
function route(specs, from, to, fromPt = null, toPt = null) {
  if (from === to) return { rooms: [from], doors: [] };
  const doors = allDoors(specs);
  const best = new Map([[from, { cost: 0, prev: null, door: null, at: fromPt }]]);
  const open = new Set([from]);
  while (open.size) {
    let r = null;
    for (const x of open) if (r === null || best.get(x).cost < best.get(r).cost) r = x;
    open.delete(r);
    if (r === to) break;
    const st = best.get(r);
    for (const d of doors) {
      if (!d.rooms.includes(r)) continue;
      const o = d.rooms[0] === r ? d.rooms[1] : d.rooms[0], m = doorMid(d);
      const cost = st.cost + 1 + (st.at ? Math.hypot(m.a - st.at.a, m.c - st.at.c) / 40 : 0);
      if (!best.has(o) || cost < best.get(o).cost) { best.set(o, { cost, prev: r, door: d, at: m }); open.add(o); }
    }
  }
  if (!best.has(to)) return null;
  const rooms = [], ds = [];
  for (let r = to; r; r = best.get(r).prev) { rooms.unshift(r); if (best.get(r).door) ds.unshift(best.get(r).door); }
  void toPt;
  return { rooms, doors: ds };
}

// the rooms on the way from one room to another, or null when there is no way through the doors
export function roomPath(specs, from, to) {
  const r = route(specs, from, to);
  return r ? r.rooms : null;
}

// the waypoints from `from` to `to` ({ a, c }): one point at each door on the way (tagged with the door's id, so
// the walker can open it), the hub on a long outdoor leg between buildings, and `to` itself at the end
export function planRoute(specs, from, to, { hub = null } = {}) {
  const fr = roomOf(specs, from.a, from.c), tr = roomOf(specs, to.a, to.c);
  if (fr === tr) return [{ a: to.a, c: to.c }];
  const r = route(specs, fr, tr, from, to);
  if (!r) return null;
  const pts = [];
  let lastDoor = null;
  for (let i = 0; i < r.doors.length; i++) {
    const d = r.doors[i], m = doorMid(d);
    // leaving one building and entering another: both door points stand outside — a long leg goes by the hub
    if (hub && lastDoor && r.rooms[i] === 'outside' && Math.hypot(m.a - lastDoor.a, m.c - lastDoor.c) > 30) pts.push({ a: hub.a, c: hub.c });
    pts.push({ a: m.a, c: m.c, door: d.id });
    lastDoor = m;
  }
  pts.push({ a: to.a, c: to.c });
  return pts;
}

// steps along a route: pos { a, c } and yaw (the cast's frame: yaw = atan2(dc, −da)... the same yaw cast.put
// works out from a face point, atan2(face.c − c, a − face.a)). The speed eases in and out and slows in a turn;
// update(dt) → { done, moving, speed } and says where the walker now stands (this.pos, this.yaw).
export class WalkPath {
  constructor(points, { speed = WALK_SPEED, from = null, yaw = 0 } = {}) {
    this.pts = points.slice();
    this.i = 0;
    this.pos = from ? { a: from.a, c: from.c } : { a: points[0].a, c: points[0].c };
    this.yaw = yaw;
    this.top = speed;
    this.speed = 0;
    this.done = !points.length;
    this.dist = 0;                                   // metres walked (the tests read it)
  }
  // the point being walked to (its door tag rides along)
  get target() { return this.pts[this.i] || null; }
  // how far along the whole route (for judging the end's ease-out)
  left() {
    let d = 0, p = this.pos;
    for (let i = this.i; i < this.pts.length; i++) { d += Math.hypot(this.pts[i].a - p.a, this.pts[i].c - p.c); p = this.pts[i]; }
    return d;
  }
  update(dt) {
    if (this.done) { this.speed = 0; return { done: true, moving: false, speed: 0 }; }
    let t = this.target;
    // a point already reached (a door just passed) is skipped without a step
    while (t && Math.hypot(t.a - this.pos.a, t.c - this.pos.c) < 0.12 && this.i < this.pts.length - 1) { this.i++; t = this.target; }
    if (!t) { this.done = true; this.speed = 0; return { done: true, moving: false, speed: 0 }; }
    const da = t.a - this.pos.a, dc = t.c - this.pos.c, d = Math.hypot(da, dc);
    const last = this.i === this.pts.length - 1;
    if (last && d < 0.06) { this.pos = { a: t.a, c: t.c }; this.done = true; this.speed = 0; return { done: true, moving: false, speed: 0 }; }
    // turn towards the heading, at most ~200°/s; the step is slower the sharper the turn.
    // yaw in the cast's convention: facing a point (fa, fc) from (a, c) is atan2(fc − c, a − fa)
    const wantYaw = Math.atan2(t.c - this.pos.c, this.pos.a - t.a);
    let dy = wantYaw - this.yaw;
    while (dy > Math.PI) dy -= 2 * Math.PI;
    while (dy < -Math.PI) dy += 2 * Math.PI;
    const turn = 3.6 * dt;
    this.yaw += Math.max(-turn, Math.min(turn, dy));
    // ease: in from a stand, out into the last point, slower while turning hard
    const align = Math.max(0.25, Math.cos(dy));
    const ease = Math.min(1, this.left() / 0.9 + 0.15, this.dist / 0.7 + 0.2);
    const goal = this.top * align * ease;
    this.speed += Math.max(-3.2 * dt, Math.min(2.2 * dt, goal - this.speed));
    const step = Math.min(this.speed * dt, d);
    if (d > 1e-9) { this.pos = { a: this.pos.a + da / d * step, c: this.pos.c + dc / d * step }; this.dist += step; }
    if (!last && d - step < 0.12) this.i++;
    else if (last && d - step < 0.06) { this.done = true; }
    return { done: this.done, moving: this.speed > 0.03, speed: this.speed };
  }
}
