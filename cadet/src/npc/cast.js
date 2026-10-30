// CADET — npc/cast.js : the academy's other people in the world (M5): one actor each (npc/actor.js, the look and the
// colours of content/people.js), where the time of day puts them (placeOf), each with a collider so the cadet walks
// round them and a target to talk to them (E). They look at the cadet when near, and move their mouth while
// their line types. The instructor (M2) stays main.js's own; on the day of the first solo the cast can also be put
// on the apron by today's aircraft (the celebration: at()).
// (Phase 2) put() no longer teleports a person who is anywhere near the cadet: they walk there — the route over
// the buildings' doors (npc/walker-npc.js), the doors opening for them as they come (world/doors.js, quietly),
// the actor's walk cycle posing the steps (npc/actor.js setWalk). Far from the cadet, or with no way through the
// doors, they are simply there, as before (nobody watches an empty building's corridors). A place may seat them
// (people.js's seat: worked into a pose by actor.setSeated) and give them something to do (act: a book to read, a
// desk screen, work on the aircraft, the planning map — small props in the hand, built here from plain shapes).
import * as THREE from 'three';
import { createActor } from './actor.js';
import { PEOPLE, placeOf } from '../content/people.js';
import { planRoute, WalkPath, WALK_SPEED } from './walker-npc.js';

export const FAR = 45;                                     // metres: beyond this a person is not drawn
const HUB = { a: 648, c: 322 };                            // the car park's middle: outdoor legs between buildings go by it
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const yawOf = (p) => (p.face ? Math.atan2(p.face.c - p.c, p.a - p.face.a) : 0);

// ---------------------------------------------------------------- the hand props (plain shapes, no model files)
let PROP_MATS = null;
function propMats() {
  if (PROP_MATS) return PROP_MATS;
  const m = (color, roughness = 0.7) => new THREE.MeshStandardMaterial({ color, roughness });
  PROP_MATS = { navy: m(0x24456e, 0.6), paper: m(0xf2efe6, 0.9), red: m(0x8c2f2f, 0.6), steel: m(0x9aa2ab, 0.35), dark: m(0x23262b, 0.5), cup: m(0xf4f4f0, 0.4) };
  return PROP_MATS;
}
function makeProp(kind) {
  const M = propMats(), g = new THREE.Group(); g.name = 'prop-' + kind;
  const box = (mat, w, h, d, x, y, z, rx = 0) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); q.position.set(x, y, z); q.rotation.x = rx; g.add(q); return q; };
  if (kind === 'book') { box(M.red, 0.17, 0.028, 0.24, 0, 0, 0); box(M.paper, 0.16, 0.02, 0.23, 0, 0.006, 0); }
  else if (kind === 'wrench') { box(M.steel, 0.028, 0.17, 0.012, 0, -0.05, 0); const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.014, 10), M.steel); hd.rotation.x = Math.PI / 2; hd.position.set(0, 0.045, 0); g.add(hd); }
  else if (kind === 'kneeboard') { box(M.dark, 0.15, 0.012, 0.21, 0, 0, 0); box(M.paper, 0.13, 0.004, 0.19, 0, 0.009, 0); }
  else if (kind === 'cup') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.028, 0.09, 12), M.cup); g.add(c); }
  g.visible = false;
  return g;
}
const PROP_FOR = { read: 'book', work: 'wrench' };
// a seat (people.js) as actor.setSeated's cfg, in the root's frame (the root stands at the seat, facing its way):
// the hip joints a little above the cushion, the ankles on the floor ahead, the feet flat (not on rudder pedals)
const seatCfg = (seat) => ({ hip: [0, seat.h + 0.02, 0], ankleL: [0.10, 0.085, seat.z || 0.42], ankleR: [-0.10, 0.085, seat.z || 0.42], footPitch: 0, room: null, keepOut: null });

// parent: the academy's group (the runway frame: x = across, z = −along); world: the colliders; interactor: the E
// targets; onTalk(id): the cadet asked to talk to them; nav (Phase 2): { specs, doorSystems } for walking
export function createCast({ parent, world, interactor, ids, onTalk, nav = null }) {
  const people = {};
  // the doors of both buildings by id, with their middle in the runway frame (an 'opening' has no leaf and is
  // not in a door system: the walker just walks through it)
  const doorReg = new Map();
  if (nav) for (const sys of nav.doorSystems || []) for (const d of sys.doors) {
    doorReg.set(d.id, { sys, door: d, mid: d.wall === 'a' ? { a: d.at, c: (d.from + d.to) / 2 } : { a: (d.from + d.to) / 2, c: d.at } });
  }
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
    // the hand prop (an empty group in the right hand's bone until an act fills it)
    const prop = makeProp('book'); prop.visible = false; a.bones.handR.add(prop); prop.position.set(-0.012, -0.105, 0.012); prop.rotation.set(-1.15, 0, 0);
    people[id] = { id, actor: a, col, target: t, r, at: null, pos: null, walk: null, dest: null, seated: false, act: null, actT: hash(id) % 7, prop, holding: new Set(), opened: new Set() };
  }
  const tmpV = new THREE.Vector3();

  // what their hands hold and do (null: nothing)
  function setAct(o, act) {
    o.act = act || null;
    const kind = o.act && PROP_FOR[o.act];
    if (kind) {
      if (o.prop.name !== 'prop-' + kind) { const p = makeProp(kind); p.position.copy(o.prop.position); p.rotation.copy(o.prop.rotation); o.prop.removeFromParent(); o.actor.bones.handR.add(p); o.prop = p; }
      o.prop.visible = true;
    } else o.prop.visible = false;
  }
  // stand them up again (a seat lets go), quietly closing nothing
  function stand(o) { if (o.seated) { o.actor.setSeated(null); o.seated = false; } }
  // the doors this person holds or opened on their way: let go (sliding leaves close themselves behind them)
  function releaseDoors(o) {
    for (const did of o.holding) { const r = doorReg.get(did); if (r) r.door.hold = false; }
    o.holding.clear(); o.opened.clear();
  }
  function setCollider(o, a, c, on = true) {
    const y = (o.at && o.at.y) || 0;               // (Phase 4: a place can be up a tower — its floor's height)
    world.update(o.col, { x0: c - o.r, x1: c + o.r, y0: y, y1: y + 1.8, z0: -a - o.r, z1: -a + o.r });
    world.setEnabled(o.col, on);
  }
  // placed, at rest: root, seat, act, collider and talk target all where p says
  function applyPlace(o, p) {
    o.walk = null; o.dest = null; o.actor.setWalk(0); releaseDoors(o);
    o.at = p; o.pos = { a: p.a, c: p.c };
    o.actor.root.position.set(p.c, p.y || 0, -p.a); o.actor.root.rotation.set(0, yawOf(p), 0); o.actor.root.visible = true;
    if (p.seat) { o.actor.setSeated(seatCfg(p.seat)); o.seated = true; } else stand(o);
    setAct(o, p.act);
    setCollider(o, p.a, p.c, true);
    o.target.frame = [p.c, (p.y || 0) + 1.5, -p.a]; o.target.enabled = true;
  }
  // set them walking to p, when a route exists and the cadet is near enough to see the walk happen
  function startWalk(o, p, eye) {
    if (!nav || !o.pos || !eye) return false;
    if (Math.hypot(eye.a - o.pos.a, eye.c - o.pos.c) > FAR || Math.hypot(eye.a - p.a, eye.c - p.c) > FAR) return false;
    const pts = planRoute(nav.specs, o.pos, p, { hub: HUB });
    if (!pts || !pts.length) return false;
    stand(o); setAct(o, null);
    o.walk = new WalkPath(pts, { from: o.pos, yaw: o.actor.root.rotation.y });
    o.dest = p; o.at = p;
    o.target.enabled = false;                        // no talking to someone on their way
    setCollider(o, o.pos.a, o.pos.c, true);
    return true;
  }
  function openFor(o, reg) {
    const d = reg.door;
    if (d.kind === 'sliding_auto') { d.hold = true; o.holding.add(d.id); return; }
    if ((d.kind === 'swing' || d.kind === 'double_swing') && Math.abs(d.target) < 0.01 && Math.abs(d.angle) < 0.05) {
      reg.sys.toggle(d, o.actor.root.position, true); o.opened.add(d.id);
    }
  }
  // put one where p says ({ a, c, face, seat?, act? }), or away (null). eye: where the cadet stands (cast.update's
  // last report; a put before the first frame, or with the cadet far away, places them at once, as it always did)
  let lastEye = null;
  function put(id, p) {
    const o = people[id]; if (!o) return;
    if (!p) {
      o.walk = null; o.dest = null; o.actor.setWalk(0); releaseDoors(o); stand(o); setAct(o, null);
      o.at = null; o.pos = null; o.actor.root.visible = false; world.setEnabled(o.col, false); o.target.enabled = false;
      return;
    }
    if (o.pos && !o.walk && Math.hypot(o.pos.a - p.a, o.pos.c - p.c) < 0.4 && !!o.seated === !!p.seat && o.act === (p.act || null)) { applyPlace(o, p); return; }
    if (o.pos && startWalk(o, p, lastEye)) return;
    applyPlace(o, p);
  }
  // in the aircraft (fly-mode takes the actor into the cockpit): nothing to bump into or talk to where they stood
  function detach(id) {
    const o = people[id]; if (!o) return;
    o.walk = null; o.dest = null; o.actor.setWalk(0); releaseDoors(o); stand(o); setAct(o, null);
    o.at = null; o.pos = null; world.setEnabled(o.col, false); o.target.enabled = false;
  }
  // back out: under the academy again (placed by the next layout)
  function home(id) { const o = people[id]; if (o && o.actor.root.parent !== parent) parent.add(o.actor.root); }
  // everyone where the time of day puts them (what: today's plan, career/career.js schedule())
  function layout(slot, chapter, what = []) { for (const id of ids) put(id, placeOf(id, slot, chapter, what)); }
  // every frame: they look at the cadet when near (or when talking to them), their mouth while their line types
  const opt = { lookAt: null, talking: false, crouch: 0 };
  // (camWorld: where to look, in the scene; at: the eye in the runway frame { a, c }). Someone far from the eye is not
  // drawn (a person is some 20 draw calls and their shadows: far away they are a few pixels, or behind walls)
  function update(dt, camWorld, at, talkingTo = null, typing = false) {
    lastEye = at;
    for (const id of ids) {
      const o = people[id]; if (!o.pos) continue;
      o.actT += dt;
      if (o.walk) {
        const w = o.walk, r = w.update(dt);
        o.pos = { a: w.pos.a, c: w.pos.c };
        o.actor.root.position.set(w.pos.c, 0, -w.pos.a); o.actor.root.rotation.set(0, w.yaw, 0);
        o.actor.setWalk(r.speed / WALK_SPEED);
        setCollider(o, o.pos.a, o.pos.c, true);
        // the doors on the way: open the one being walked to, hold the sliding ones, close swing doors behind
        const tgt = w.target;
        if (tgt && tgt.door) { const reg = doorReg.get(tgt.door); if (reg && Math.hypot(reg.mid.a - o.pos.a, reg.mid.c - o.pos.c) < 1.6) openFor(o, reg); }
        for (const did of [...o.opened]) {
          const reg = doorReg.get(did); if (!reg) { o.opened.delete(did); continue; }
          if (Math.hypot(reg.mid.a - o.pos.a, reg.mid.c - o.pos.c) > 2.0 && Math.hypot(reg.mid.a - at.a, reg.mid.c - at.c) > 3.0 && Math.abs(reg.door.target) > 0.01) { reg.sys.toggle(reg.door, o.actor.root.position, true); o.opened.delete(did); }
        }
        for (const did of [...o.holding]) { const reg = doorReg.get(did); if (!reg || Math.hypot(reg.mid.a - o.pos.a, reg.mid.c - o.pos.c) > 3.0) { if (reg) reg.door.hold = false; o.holding.delete(did); } }
        if (r.done) { const dest = o.dest; o.walk = null; o.actor.setWalk(0); releaseDoors(o); if (dest) applyPlace(o, dest); }
      }
      const da = at.a - o.pos.a, dc = at.c - o.pos.c, d2 = da * da + dc * dc, near = d2 < 36;
      o.actor.root.visible = d2 < FAR * FAR || talkingTo === id;
      if (!o.actor.root.visible) continue;
      // what the eyes rest on: the cadet when near, else the work at hand (the book in the hand, the desk's
      // screen, the planning map on the pilot room's wall)
      opt.lookAt = near || talkingTo === id ? camWorld : null;
      opt.crouch = 0;
      if (!o.walk && talkingTo !== id) {
        if (o.act === 'read') { o.actor.bones.handR.getWorldPosition(tmpV); opt.lookAt = tmpV; }
        else if (o.act === 'type') { tmpV.set(251.4, 1.05, -667.0); parent.localToWorld(tmpV); opt.lookAt = tmpV; }
        else if (o.act === 'map') { tmpV.set(260.9, 1.6, -683.6); parent.localToWorld(tmpV); opt.lookAt = tmpV; }
        else if (o.act === 'work') opt.crouch = Math.pow(0.5 + 0.5 * Math.sin(o.actT * 0.55), 1.5) * 0.85;   // bent over the aircraft, up again
      }
      opt.talking = talkingTo === id && typing;
      o.actor.update(dt, opt);
    }
  }
  return {
    people, layout, put, update, detach, home,
    actor: (id) => (people[id] ? people[id].actor : null),
    where: (id) => (people[id] ? people[id].at : null),
    walking: (id) => !!(people[id] && people[id].walk),
    get triangles() { return ids.reduce((n, id) => n + (people[id].actor.triangles || 0), 0); },
  };
}
