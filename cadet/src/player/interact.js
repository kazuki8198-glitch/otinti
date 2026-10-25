// CADET — player/interact.js : what the player is looking at, and E (or a click) to use it.
// Targets are spheres in the runway frame ({ id, frame: [x, y, z], radius, prompt(), use() }). The nearest target the
// view ray passes through (within reach) wins; one with a wall between the eyes and it (collision raycast) gives way to the next.
// The examine card shows a title and a few lines; it closes with E / Esc / a click, or when the player walks away.
export const REACH = 2.6;

export function createInteractor({ walker, world, L, hud }) {
  const targets = new Map();
  let current = null, card = null;
  const cy = Math.cos(L.frameYaw), sy = Math.sin(L.frameYaw);

  function add(t) { targets.set(t.id, t); return t; }
  function remove(id) { targets.delete(id); }

  // the view ray in the frame
  function viewRay(camera) {
    const p = camera.position, q = camera.quaternion;
    // forward = (0, 0, −1) rotated by the camera
    const x = q.x, y = q.y, z = q.z, w = q.w;
    const fx = -(2 * (x * z + w * y)), fy = -(2 * (y * z - w * x)), fz = -(1 - 2 * (x * x + y * y));
    const ox = p.x * cy - p.z * sy, oz = p.x * sy + p.z * cy, oy = p.y - L.G;
    const dx = fx * cy - fz * sy, dz = fx * sy + fz * cy;
    const n = Math.hypot(dx, fy, dz) || 1;
    return { ox, oy, oz, dx: dx / n, dy: fy / n, dz: dz / n };
  }

  function update(camera) {
    const r = viewRay(camera);
    const cands = [];
    for (const t of targets.values()) {
      if (t.enabled === false) continue;
      const [tx, ty, tz] = t.frame;
      const vx = tx - r.ox, vy = ty - r.oy, vz = tz - r.oz;
      const along = vx * r.dx + vy * r.dy + vz * r.dz;
      if (along < 0.15 || along > REACH + t.radius) continue;
      const px = vx - r.dx * along, py = vy - r.dy * along, pz = vz - r.dz * along;
      const off = Math.hypot(px, py, pz);
      if (off > t.radius) continue;
      // prefer what is nearest to the centre of the view, then nearest
      cands.push({ t, score: along + off * 1.5 });
    }
    cands.sort((x, y) => x.score - y.score);
    // the best one not hidden: a wall in between hides it (the target's own collider does not count, nor its owner's
    // where it touches the target: the aircraft's wing under its door, not the fuselage seen from the other side)
    let best = null;
    for (const { t } of cands) {
      const [tx, ty, tz] = t.frame;
      const d = Math.hypot(tx - r.ox, ty - r.oy, tz - r.oz), ux = (tx - r.ox) / d, uy = (ty - r.oy) / d, uz = (tz - r.oz) / d;
      const hit = world.raycast(r.ox, r.oy, r.oz, ux, uy, uz, d);
      // (a place under a wing or at a wheel: one crouches to look, so its owner's own parts do not hide it: `low`;
      // the door on the wing walk: `onOwner`, the wing's collider round it does not hide it either)
      const own = hit && hit.box && hit.box.tag && (hit.box.tag === t.id
        || (hit.box.tag === t.owner && (t.low || t.onOwner || d - hit.dist < t.radius + 0.6)));
      if (hit && hit.dist < d - (t.radius * 0.8) && !own) continue;
      best = t; break;
    }
    current = best;
    // (while a card is open E closes it, as its foot says: no prompt over it)
    hud.prompt(current && !card ? (typeof current.prompt === 'function' ? current.prompt() : current.prompt) : null);
    // close the card when the player walks away from where it was opened
    if (card && Math.hypot(walker.state.x - card.x, walker.state.z - card.z) > 2.0) closeCard();
    return current;
  }

  function use() {
    if (card) { closeCard(); return 'closed'; }
    if (!current) return null;
    return current.use ? current.use(current) : null;
  }
  function showCard(title, text, choices) { card = { x: walker.state.x, z: walker.state.z }; hud.card(title, text, choices); }
  function closeCard() { if (!card) return; card = null; hud.card(null); }

  return {
    add, remove, update, use, showCard, closeCard,
    get current() { return current; }, get cardOpen() { return !!card; },
    list: () => [...targets.values()],
  };
}
