// CADET — npc/cast.js : the academy's other people in the world (M5): one actor each (npc/actor.js, the look and the
// colours of content/people.js), standing where the time of day puts them (placeOf), each with a collider so the
// cadet walks round them and a target to talk to them (E). They look at the cadet when near, and move their mouth while
// their line types. The instructor (M2) stays main.js's own; on the day of the first solo the cast can also be put
// on the apron by today's aircraft (the celebration: at()).
import { createActor } from './actor.js';
import { PEOPLE, placeOf } from '../content/people.js';

const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

// parent: the academy's group (the runway frame: x = across, z = −along); world: the colliders; interactor: the E
// targets; onTalk(id): the cadet asked to talk to them
export function createCast({ parent, world, interactor, ids, onTalk }) {
  const people = {};
  for (const id of ids) {
    const P = PEOPLE[id];
    const a = createActor({ seed: hash(id) % 1000, height: P.height, look: P.look, colors: P.colors });
    a.root.name = 'npc-' + id; a.root.visible = false;
    parent.add(a.root);
    const r = a.radius || 0.28;
    const col = world.add({ x0: -r, x1: r, y0: 0, y1: 1.8, z0: -r, z1: r, tag: 'npc:' + id });
    world.setEnabled(col, false);
    const t = interactor.add({ id: 'npc:' + id, frame: [0, 1.5, 0], radius: 0.45, prompt: `${P.title}と話す`, use: () => onTalk(id) });
    t.enabled = false;
    people[id] = { id, actor: a, col, target: t, r, at: null };
  }
  // put one where p says ({ a, c, face: { a, c } }), or away (null)
  function put(id, p) {
    const o = people[id]; if (!o) return;
    o.at = p || null;
    if (!p) { o.actor.root.visible = false; world.setEnabled(o.col, false); o.target.enabled = false; return; }
    const yaw = p.face ? Math.atan2(p.face.c - p.c, p.a - p.face.a) : 0;
    o.actor.root.position.set(p.c, 0, -p.a); o.actor.root.rotation.set(0, yaw, 0); o.actor.root.visible = true;
    world.update(o.col, { x0: p.c - o.r, x1: p.c + o.r, z0: -p.a - o.r, z1: -p.a + o.r }); world.setEnabled(o.col, true);
    o.target.frame = [p.c, 1.5, -p.a]; o.target.enabled = true;
  }
  // in the aircraft (fly-mode takes the actor into the cockpit): nothing to bump into or talk to where they stood
  function detach(id) { const o = people[id]; if (!o) return; o.at = null; world.setEnabled(o.col, false); o.target.enabled = false; }
  // back out: under the academy again (placed by the next layout)
  function home(id) { const o = people[id]; if (o && o.actor.root.parent !== parent) parent.add(o.actor.root); }
  // everyone where the time of day puts them (what: today's plan, career/career.js schedule())
  function layout(slot, chapter, what = []) { for (const id of ids) put(id, placeOf(id, slot, chapter, what)); }
  // every frame: they look at the cadet when near (or when talking to them), their mouth while their line types
  const opt = { lookAt: null, talking: false };
  // (camWorld: where to look, in the scene; at: the cadet in the runway frame { a, c })
  function update(dt, camWorld, at, talkingTo = null, typing = false) {
    for (const id of ids) {
      const o = people[id]; if (!o.at) continue;
      const da = at.a - o.at.a, dc = at.c - o.at.c, near = da * da + dc * dc < 36;
      opt.lookAt = near || talkingTo === id ? camWorld : null; opt.talking = talkingTo === id && typing;
      o.actor.update(dt, opt);
    }
  }
  return {
    people, layout, put, update, detach, home,
    actor: (id) => (people[id] ? people[id].actor : null),
    where: (id) => (people[id] ? people[id].at : null),
    get triangles() { return ids.reduce((n, id) => n + (people[id].actor.triangles || 0), 0); },
  };
}
