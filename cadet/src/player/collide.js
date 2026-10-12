// CADET — player/collide.js : what the walker bumps into (PLAN 3.7). Axis-aligned boxes in the runway frame
// (x = across, y = up from the floor, z = −along), kept in a spatial hash, and the player as a vertical cylinder that
// slides along them. Plain JS (no three.js, no DOM), so the tests run it directly in node.
//  - move() walks in sub-steps no longer than half the radius, so it never jumps a wall however thin or fast; each
//    sub-step pushes the cylinder out of every box it overlaps (the shortest way out), a few passes over, which settles
//    corners and narrow doors. A sub-step that cannot settle is undone: stuck is better than through a wall.
//  - a box low enough to step onto (top ≤ feet + step) or high enough to walk under (bottom ≥ feet + height) does not
//    block; groundAt() gives the height to stand at, so steps, stairs and an upper floor are boxes too.
//  - the result depends only on the boxes: not on the cell size, nor on the order they were moved in (ties go by id).

const EPS = 1e-9;        // m: a cylinder this close to a box is touching, not overlapping
const SLOP = 1e-4;       // m: overlap left after the passes that still counts as settled
const PASSES = 8;        // push-out passes per sub-step (a corner settles in 1–2, a narrow door in a few)
const BIG = 256;         // a box over more cells than this goes in a short list that every lookup checks
const MAX_SUB = 8192;    // sub-steps in one move; a longer move is cut short (radius 0.3 m → 1.2 km)

const byId = (a, b) => a.id - b.id;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// box: { x0, x1, z0, z1, y0 = 0, y1 = Infinity, tag } (ends in either order) → the stored record's fields
function readBox(b, old) {
  if (!b || typeof b !== 'object') throw new TypeError('collide: a box must be an object { x0, x1, y0, y1, z0, z1 }');
  const num = (k, d) => {
    const v = b[k] !== undefined ? b[k] : old ? old[k] : d;
    if (typeof v !== 'number' || Number.isNaN(v)) throw new TypeError(`collide: box.${k} must be a number (got ${v})`);
    return v;
  };
  const x0 = num('x0'), x1 = num('x1'), z0 = num('z0'), z1 = num('z1'), y0 = num('y0', 0), y1 = num('y1', Infinity);
  return {
    x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), z0: Math.min(z0, z1), z1: Math.max(z0, z1),
    tag: b.tag !== undefined ? b.tag : old ? old.tag : undefined,
  };
}

export function createCollisionWorld({ cell = 4 } = {}) {
  if (!(cell > 0 && cell < Infinity)) throw new RangeError('collide: cell must be a positive number of metres');
  const inv = 1 / cell;
  const recs = new Map();          // id → record
  const grid = new Map();          // cell key → the records overlapping that cell
  const big = [];                  // records too large for the grid
  const cand = [];                 // the boxes near the walker (reused by move and groundAt)
  let nextId = 1, stamp = 0;
  // distinct while |k| < 2¹⁹ cells; a clash would only cost time, since every lookup re-tests the box itself
  const key = (i, k) => i * 1048576 + k;

  // ---------------------------------------------------------------- the hash
  function place(r) {
    const fin = Number.isFinite(r.x0) && Number.isFinite(r.x1) && Number.isFinite(r.z0) && Number.isFinite(r.z1);
    r.i0 = fin ? Math.floor(r.x0 * inv) : 0; r.i1 = fin ? Math.floor(r.x1 * inv) : 0;
    r.k0 = fin ? Math.floor(r.z0 * inv) : 0; r.k1 = fin ? Math.floor(r.z1 * inv) : 0;
    r.big = !fin || (r.i1 - r.i0 + 1) * (r.k1 - r.k0 + 1) > BIG;
    if (r.big) { big.push(r); return; }
    for (let i = r.i0; i <= r.i1; i++) for (let k = r.k0; k <= r.k1; k++) {
      const kk = key(i, k), a = grid.get(kk);
      if (a) a.push(r); else grid.set(kk, [r]);
    }
  }
  function unplace(r) {
    if (r.big) { big.splice(big.indexOf(r), 1); return; }
    for (let i = r.i0; i <= r.i1; i++) for (let k = r.k0; k <= r.k1; k++) {
      const kk = key(i, k), a = grid.get(kk), j = a.indexOf(r);
      a[j] = a[a.length - 1]; a.pop();                                     // order inside a cell doesn't matter (sorted later)
      if (!a.length) grid.delete(kk);
    }
  }
  const sameCells = (r, b) => !r.big && Number.isFinite(b.x0 + b.x1 + b.z0 + b.z1) &&
    Math.floor(b.x0 * inv) === r.i0 && Math.floor(b.x1 * inv) === r.i1 && Math.floor(b.z0 * inv) === r.k0 && Math.floor(b.z1 * inv) === r.k1;
  const setView = (r) => { r.view = Object.freeze({ id: r.id, x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, z0: r.z0, z1: r.z1, tag: r.tag }); };

  // every enabled box overlapping [x0, x1] × [z0, z1] (edges touching count) whose height range overlaps (lo, hi),
  // each once, in id order → out
  let gS = 0, gx0 = 0, gz0 = 0, gx1 = 0, gz1 = 0, gLo = 0, gHi = 0, gOut = cand;
  function take(r) {
    if (r.mark === gS) return;
    r.mark = gS;
    if (r.on && r.x0 <= gx1 && r.x1 >= gx0 && r.z0 <= gz1 && r.z1 >= gz0 && r.y1 > gLo && r.y0 < gHi) gOut.push(r);
  }
  function gather(out, x0, z0, x1, z1, lo = -Infinity, hi = Infinity) {
    out.length = 0; gOut = out; gS = ++stamp;
    gx0 = x0; gz0 = z0; gx1 = x1; gz1 = z1; gLo = lo; gHi = hi;
    for (let j = 0; j < big.length; j++) take(big[j]);
    const i0 = Math.floor(x0 * inv), i1 = Math.floor(x1 * inv), k0 = Math.floor(z0 * inv), k1 = Math.floor(z1 * inv);
    if (!((i1 - i0 + 1) * (k1 - k0 + 1) <= grid.size)) { for (const r of recs.values()) if (!r.big) take(r); }   // a wide area: scan them all
    else for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) {
      const a = grid.get(key(i, k));
      if (a) for (let j = 0; j < a.length; j++) take(a[j]);
    }
    if (out.length > 1) out.sort(byId);
    return out;
  }

  // ---------------------------------------------------------------- boxes
  function add(box) {
    const r = readBox(box);
    r.id = nextId++; r.on = true; r.mark = 0;
    setView(r); place(r); recs.set(r.id, r);
    return r.id;
  }
  // move or resize; fields left out keep their values (a sliding door can pass just { x0, x1 })
  function update(id, box) {
    const r = recs.get(id);
    if (!r) return false;
    const b = readBox(box, r);
    if (sameCells(r, b)) Object.assign(r, b);
    else { unplace(r); Object.assign(r, b); place(r); }
    setView(r);
    return true;
  }
  function remove(id) {
    const r = recs.get(id);
    if (!r) return false;
    unplace(r); recs.delete(id);
    return true;
  }
  function setEnabled(id, on) {
    const r = recs.get(id);
    if (!r) return false;
    r.on = !!on;
    return true;
  }
  // the enabled boxes overlapping a rectangle on the floor plan, each once, in id order (read-only views);
  // infinite bounds list them all (for a debug drawing)
  function query(x0, z0, x1, z1) {
    return gather([], Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)).map(r => r.view);
  }

  // ---------------------------------------------------------------- the walker
  const P = { x: 0, z: 0, px: 0, pz: 0, nx: 0, nz: 0, hits: 0 };   // the cylinder during a move, and its pushes

  // how far a circle at (x, z) overlaps the nearest-worst candidate (0 when it is clear of them all)
  function overlap(x, z, r) {
    let worst = 0;
    for (let j = 0; j < cand.length; j++) {
      const b = cand[j], ex = x - clamp(x, b.x0, b.x1), ez = z - clamp(z, b.z0, b.z1), d2 = ex * ex + ez * ez;
      const p = d2 > 0 ? r - Math.sqrt(d2) : r + Math.min(x - b.x0, b.x1 - x, z - b.z0, b.z1 - z);
      if (p > worst) worst = p;
    }
    return worst;
  }
  // push P out of the candidates it overlaps, the deepest first, each along the shortest way out (from the closest point
  // of the box's floor plan; a centre inside the box goes out the nearest face); repeat until clear → the overlap left.
  // Deepest first matters where two boxes meet end to end: the face pushes before the hidden corner can.
  function settle(r) {
    const lim = (r - EPS) * (r - EPS), max = PASSES * Math.max(1, Math.min(cand.length, 8));
    for (let it = 0; it < max; it++) {
      let best = -1, bestP = 0, bqx = 0, bqz = 0;
      for (let j = 0; j < cand.length; j++) {
        const b = cand[j], x = P.x, z = P.z;
        const ex = x - clamp(x, b.x0, b.x1), ez = z - clamp(z, b.z0, b.z1), d2 = ex * ex + ez * ez;
        if (d2 >= lim) continue;
        let qx = 0, qz = 0, pen;
        if (d2 > 1e-20) { const d = Math.sqrt(d2), k = (r - d) / d; qx = ex * k; qz = ez * k; pen = r - d; }
        else {
          const w = x - b.x0, e = b.x1 - x, s = z - b.z0, n = b.z1 - z, m = Math.min(w, e, s, n);
          if (m === w) qx = b.x0 - r - x; else if (m === e) qx = b.x1 + r - x; else if (m === s) qz = b.z0 - r - z; else qz = b.z1 + r - z;
          pen = r + m;
        }
        if (pen > bestP) { bestP = pen; best = j; bqx = qx; bqz = qz; }
      }
      if (best < 0) return 0;
      P.x += bqx; P.z += bqz; P.px += bqx; P.pz += bqz;
      const q = Math.hypot(bqx, bqz); P.nx = bqx / q; P.nz = bqz / q; P.hits++;
    }
    return overlap(P.x, P.z, r);
  }

  // move a vertical cylinder (feet at pos.y) by (dx, dz) → { x, z, blocked, hitNormal: [nx, nz] | null }.
  // pos is not changed. Sub-steps of at most half the radius: from outside a box, one sub-step cannot carry the centre
  // past the box's middle, so the push always goes back the way it came (no tunnelling, however thin the wall or fast
  // the move). A sub-step that cannot settle (squeezed between boxes closer than the diameter) is undone and the move
  // stops there. blocked: something pushed back or the move was cut short; hitNormal: the way it pushed, on average.
  function move(pos, dx, dz, { radius = 0.3, height = 1.75, step = 0.35 } = {}) {
    const y = pos.y ?? 0;
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.z) || !Number.isFinite(y)) throw new TypeError('collide.move: pos needs finite x, y, z');
    if (!Number.isFinite(dx)) dx = 0;
    if (!Number.isFinite(dz)) dz = 0;
    const r = Math.max(+radius || 0, 0.01), lo = y + step, hi = y + height;
    const len = Math.hypot(dx, dz);
    let n = Math.max(1, Math.ceil(len / (r * 0.5)));
    if (n > MAX_SUB) { const k = MAX_SUB * r * 0.5 / len; dx *= k; dz *= k; n = MAX_SUB; }
    const sx = dx / n, sz = dz / n;
    // every box near the whole path, once (with room for a push out of a box we start inside)
    const m = r + 1.0;
    gather(cand, Math.min(pos.x, pos.x + dx) - m, Math.min(pos.z, pos.z + dz) - m, Math.max(pos.x, pos.x + dx) + m, Math.max(pos.z, pos.z + dz) + m, lo, hi);
    P.x = pos.x; P.z = pos.z; P.px = P.pz = P.nx = P.nz = 0; P.hits = 0;
    let cut = false;
    if (cand.length) {
      // first settle where we stand (a door may have closed on us); then walk
      const start = settle(r);
      for (let i = 1; i <= n; i++) {
        const ox = P.x, oz = P.z;
        P.x += sx; P.z += sz;
        const left = settle(r);
        if (left > Math.max(SLOP, start) + 1e-6) { P.x = ox; P.z = oz; cut = true; break; }
      }
    } else { P.x += dx; P.z += dz; }
    const blocked = cut || P.hits > 0;
    let hitNormal = null;
    if (blocked) {
      let nx = P.px, nz = P.pz, l = Math.hypot(nx, nz);
      if (l < 1e-9) { nx = P.nx; nz = P.nz; l = Math.hypot(nx, nz); }      // pushes that cancelled out: the last one
      if (l < 1e-9) { nx = -dx; nz = -dz; l = Math.hypot(nx, nz); }        // cut short with no push: against the motion
      if (l > 1e-12) hitNormal = [nx / l, nz / l];
    }
    return { x: P.x, z: P.z, blocked, hitNormal };
  }

  // the height to stand at: the highest enabled box top under a disc of the given radius at (x, z) that the feet (at y)
  // can step onto (top ≤ y + step), or the floor (0)
  function groundAt(x, z, y = 0, { radius = 0.3, step = 0.35 } = {}) {
    const r = Math.max(+radius || 0, 0), top = y + step + EPS, r2 = r * r;
    gather(cand, x - r, z - r, x + r, z + r);
    let g = 0;
    for (let j = 0; j < cand.length; j++) {
      const b = cand[j];
      if (b.y1 > top || b.y1 <= g) continue;
      const ex = x - clamp(x, b.x0, b.x1), ez = z - clamp(z, b.z0, b.z1), d2 = ex * ex + ez * ez;
      if (d2 < r2 || d2 === 0) g = b.y1;
    }
    return g;
  }

  // ---------------------------------------------------------------- rays
  // where a ray (unit direction) enters a box, ≥ 0 (0 when it starts inside); −1 for a miss
  function enter(b, ox, oy, oz, dx, dy, dz) {
    let t0 = 0, t1 = Infinity;
    if (dx !== 0) { const u = (b.x0 - ox) / dx, v = (b.x1 - ox) / dx; t0 = Math.max(t0, Math.min(u, v)); t1 = Math.min(t1, Math.max(u, v)); }
    else if (ox < b.x0 || ox > b.x1) return -1;
    if (dy !== 0) { const u = (b.y0 - oy) / dy, v = (b.y1 - oy) / dy; t0 = Math.max(t0, Math.min(u, v)); t1 = Math.min(t1, Math.max(u, v)); }
    else if (oy < b.y0 || oy > b.y1) return -1;
    if (dz !== 0) { const u = (b.z0 - oz) / dz, v = (b.z1 - oz) / dz; t0 = Math.max(t0, Math.min(u, v)); t1 = Math.min(t1, Math.max(u, v)); }
    else if (oz < b.z0 || oz > b.z1) return -1;
    return t0 <= t1 ? t0 : -1;
  }
  // the nearest enabled box along a ray, within maxDist metres (the direction need not be unit length) → { dist, box }
  // or null. filter(box) → false skips a box (e.g. the very thing being looked at). Walks the hash cell by cell.
  function raycast(ox, oy, oz, dx, dy, dz, maxDist = Infinity, filter = null) {
    const l = Math.hypot(dx, dy, dz);
    if (!(l > 0) || !(maxDist >= 0) || !Number.isFinite(ox + oy + oz)) return null;
    dx /= l; dy /= l; dz /= l;
    let best = maxDist, hit = null;
    const s = ++stamp;
    const test = (b) => {
      if (b.mark === s) return;
      b.mark = s;
      if (!b.on || (filter && !filter(b.view))) return;
      const t = enter(b, ox, oy, oz, dx, dy, dz);
      if (t >= 0 && (t < best || (t === best && (!hit || b.id < hit.id)))) { best = t; hit = b; }
    };
    for (let j = 0; j < big.length; j++) test(big[j]);
    const span = (Math.abs(dx) + Math.abs(dz)) * maxDist * inv + 2;           // about how many cells the ray crosses
    if (!(span <= grid.size + 8)) { for (const b of recs.values()) test(b); }  // longer than the world is wide: test them all
    else {
      let i = Math.floor(ox * inv), k = Math.floor(oz * inv);
      const si = Math.sign(dx), sk = Math.sign(dz);
      const di = dx !== 0 ? cell / Math.abs(dx) : Infinity, dk = dz !== 0 ? cell / Math.abs(dz) : Infinity;
      let ti = dx > 0 ? ((i + 1) * cell - ox) / dx : dx < 0 ? (i * cell - ox) / dx : Infinity;
      let tk = dz > 0 ? ((k + 1) * cell - oz) / dz : dz < 0 ? (k * cell - oz) / dz : Infinity;
      for (let guard = 2 * span + 8; guard > 0; guard--) {
        const a = grid.get(key(i, k));
        if (a) for (let j = 0; j < a.length; j++) test(a[j]);
        const out = Math.min(ti, tk);                                           // where the ray leaves this cell
        if (best <= out || out > maxDist) break;                                // nothing further on can be nearer
        if (ti < tk) { i += si; ti += di; } else { k += sk; tk += dk; }
      }
    }
    return hit ? { dist: best, box: hit.view } : null;
  }

  return { add, update, remove, setEnabled, query, move, groundAt, raycast, count: () => recs.size };
}

// ---------------------------------------------------------------- helpers for building the boxes
// a box from runway bounds (along a0…a1, across c0…c1, height y0…y1), as buildings.js lays its walls out
export function acBox(a0, a1, c0, c1, y0 = 0, y1 = Infinity, tag) {
  return { x0: Math.min(c0, c1), x1: Math.max(c0, c1), y0, y1, z0: -Math.max(a0, a1), z1: -Math.min(a0, a1), tag };
}

// a piece's box (in its own model space, front towards +Z) placed at frame (x, z) with the spec's rot in degrees
// (0 = front faces −c, 90 = +a, 180 = +c, 270 = −a; the mesh gets rotation.y = −(rot + 90)°). Exact for multiples of
// 90°; otherwise the box around the turned one.
export function placeBox(local, x, z, rot = 0) {
  const th = -(rot + 90) * Math.PI / 180, snap = (v) => (Math.abs(v - Math.round(v)) < 1e-12 ? Math.round(v) : v);
  const c = snap(Math.cos(th)), s = snap(Math.sin(th));
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const lx of [local.x0, local.x1]) for (const lz of [local.z0, local.z1]) {
    const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;                   // three.js's turn about +Y
    x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); z0 = Math.min(z0, wz); z1 = Math.max(z1, wz);
  }
  return { x0, x1, y0: local.y0 ?? 0, y1: local.y1 ?? Infinity, z0, z1, tag: local.tag };
}
