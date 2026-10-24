// CADET — npc/crowd.js : everyone standing in the academy drawn as one skinned mesh (M5). A person made of their own
// meshes (npc/actor.js) is some 20 draw calls and as many again for their shadow; with the instructor, the chief
// instructor, the lecturer, the dispatcher, the mechanic and three fellow cadets that is more than the whole budget of
// a room. Here every actor's parts are skinned to its own bones in one geometry, and the people drawn are drawn as
// a few ranges of it (one draw call for each run of people next to each other in it; their triangles only). Someone
// not drawn (hidden, far, in a parent that is hidden, seated in the cockpit: then they are their own meshes) is left
// out of the ranges; the slots of a mouth talking or a hand pointing (shown as that actor's own mesh while it does)
// have their bones folded to a point. Shadows: the sun's, cast by the people outdoors only (indoors the roof shades
// the floor already, and the shadow would cost as many triangles again as the people). three.js draws a mesh's shadow
// from the same ranges as the mesh, so there are two meshes on the same skeleton and the same vertices: the people
// indoors (no shadow) and the people outdoors (with it); each person drawn is in the ranges of one of them.
// Two details: everyone is in the geometry twice, far (within a person's share of the budget) and near (the parts
// with more triangles: npc/actor-model.js); the few people closest to the eye (NEAR_MAX, within NEAR_DIST) are drawn
// from their near range, everyone else from the far one.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { actorMaterial } from './actor.js';

export const NEAR_DIST = 5, NEAR_MAX = 2;                  // metres from the eye; how many people at most

// scene: where the crowd's meshes go (at the scene's origin: the bones' world matrices place everyone);
// outdoors(root): whether that actor stands outside
export function createCrowd(scene, { outdoors = () => true } = {}) {
  const members = [];
  const ZERO = new THREE.Object3D();                       // a bone folded to a point
  ZERO.matrixWorld.makeScale(0, 0, 0); ZERO.matrixAutoUpdate = false; ZERO.matrixWorldAutoUpdate = false;
  let mesh = null, outside = null, dirty = false;

  function add(actor) { members.push({ actor, from: 0, targets: [], slots: null, far: { start: 0, count: 0 }, near: { start: 0, count: 0 }, d: 0, lod: 'far' }); actor.crowd.join(); dirty = true; }
  function build() {
    dirty = false;
    if (mesh) { mesh.removeFromParent(); outside.removeFromParent(); mesh.geometry.dispose(); outside.geometry.dispose(); mesh.skeleton.dispose(); mesh = outside = null; }
    const bones = [], inverses = [], geos = [];
    let at = 0;
    // everyone's far detail first, then everyone's near detail (people far from the eye, next to each other in the
    // geometry, are one draw call); both on the same bones (the near parts' targets are the far ones')
    const parts = members.map(m => ({ m, far: m.actor.crowd.parts('far'), near: m.actor.crowd.parts('near') }));
    for (const { m, far } of parts) { m.from = bones.length; m.targets = far.targets; m.slots = far.slots; bones.push(...far.targets); inverses.push(...far.inverses); }
    for (const lod of ['far', 'near']) for (const P of parts) {
      const m = P.m, r = m[lod];
      r.start = at; for (const { geo } of P[lod].geos) at += geo.index.count; r.count = at - r.start;
      for (const { geo, t } of P[lod].geos) {
        const n = geo.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
        for (let i = 0; i < n; i++) { si[i * 4] = m.from + t; sw[i * 4] = 1; }
        geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
        geos.push(geo);
      }
    }
    if (!geos.length) return;
    const geo = mergeGeometries(geos); for (const g of geos) g.dispose();
    // (the material as an array: the geometry's groups are the ranges drawn)
    const geo2 = new THREE.BufferGeometry(); geo2.setIndex(geo.index);
    for (const k of Object.keys(geo.attributes)) geo2.setAttribute(k, geo.attributes[k]);
    const skeleton = new THREE.Skeleton(bones, inverses), mat = [actorMaterial()];
    mesh = new THREE.SkinnedMesh(geo, mat); mesh.name = 'crowd';
    outside = new THREE.SkinnedMesh(geo2, mat); outside.name = 'crowd-outdoors'; outside.castShadow = true;
    for (const o of [mesh, outside]) { o.receiveShadow = true; o.frustumCulled = false; o.bindMode = THREE.DetachedBindMode; scene.add(o); o.bind(skeleton, new THREE.Matrix4()); }
  }
  // the ranges of the people drawn (runs next to each other merged)
  const byStart = (a, b) => a[a.lod].start - b[b.lod].start;
  function ranges(geo, list) {
    geo.clearGroups(); list.sort(byStart);
    let s = -1, e = -1;
    for (const m of list) { const r = m[m.lod]; if (r.start === e) { e += r.count; continue; } if (s >= 0) geo.addGroup(s, e - s, 0); s = r.start; e = s + r.count; }
    if (s >= 0) geo.addGroup(s, e - s, 0);
  }
  const shown = (root) => { for (let o = root; o; o = o.parent) { if (!o.visible) return false; if (o === scene) return true; } return false; };
  // every frame, before the picture: who is drawn, from which detail (eye: the camera's world position; none: all
  // far), which slots are folded
  const _p = new THREE.Vector3();
  function update(eye = null) {
    if (dirty) build();
    if (!mesh) return;
    const B = mesh.skeleton.bones;
    drawn.length = 0; inner.length = 0; outer.length = 0;
    for (const m of members) {
      const v = m.actor.crowd.view, on = v.on && shown(m.actor.root);
      if (on) { drawn.push(m); (outdoors(m.actor.root) ? outer : inner).push(m); }
      for (let i = 0; i < m.targets.length; i++) B[m.from + i] = on ? m.targets[i] : ZERO;
      if (!on) continue;
      if (v.mouth) B[m.from + m.slots.mouth] = ZERO;
      if (v.L) B[m.from + m.slots.L] = ZERO;
      if (v.R) B[m.from + m.slots.R] = ZERO;
    }
    // the nearest few within NEAR_DIST: near (the list in the geometry's order again for the ranges)
    for (const m of drawn) { m.lod = 'far'; m.d = eye ? m.actor.root.getWorldPosition(_p).distanceTo(eye) : Infinity; }
    near.length = 0; for (const m of drawn) if (m.d < NEAR_DIST) near.push(m);
    near.sort((a, b) => a.d - b.d); for (let i = 0; i < near.length && i < NEAR_MAX; i++) near[i].lod = 'near';
    ranges(mesh.geometry, inner); ranges(outside.geometry, outer);
    mesh.visible = inner.length > 0; outside.visible = outer.length > 0;
  }
  const drawn = [], inner = [], outer = [], near = [];
  // (meshes: the people indoors, the people outdoors)
  return { add, update, get meshes() { return mesh ? [mesh, outside] : []; }, get size() { return members.length; }, get drawn() { return drawn.length; },
    get near() { return drawn.filter(m => m.lod === 'near').map(m => m.actor); } };
}
