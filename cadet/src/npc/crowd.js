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
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { actorMaterial } from './actor.js';

// scene: where the crowd's meshes go (at the scene's origin: the bones' world matrices place everyone);
// outdoors(root): whether that actor stands outside
export function createCrowd(scene, { outdoors = () => true } = {}) {
  const members = [];
  const ZERO = new THREE.Object3D();                       // a bone folded to a point
  ZERO.matrixWorld.makeScale(0, 0, 0); ZERO.matrixAutoUpdate = false; ZERO.matrixWorldAutoUpdate = false;
  let mesh = null, outside = null, dirty = false;

  function add(actor) { members.push({ actor, from: 0, targets: [], slots: null, start: 0, count: 0 }); actor.crowd.join(); dirty = true; }
  function build() {
    dirty = false;
    if (mesh) { mesh.removeFromParent(); outside.removeFromParent(); mesh.geometry.dispose(); outside.geometry.dispose(); mesh.skeleton.dispose(); mesh = outside = null; }
    const bones = [], inverses = [], geos = [];
    let at = 0;
    for (const m of members) {
      const p = m.actor.crowd.parts();
      m.from = bones.length; m.targets = p.targets; m.slots = p.slots; m.start = at;
      for (const { geo } of p.geos) at += geo.index.count;
      m.count = at - m.start;
      bones.push(...p.targets); inverses.push(...p.inverses);
      for (const { geo, t } of p.geos) {
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
  function ranges(geo, list) {
    geo.clearGroups();
    let s = -1, e = -1;
    for (const m of list) { if (m.start === e) { e += m.count; continue; } if (s >= 0) geo.addGroup(s, e - s, 0); s = m.start; e = s + m.count; }
    if (s >= 0) geo.addGroup(s, e - s, 0);
  }
  const shown = (root) => { for (let o = root; o; o = o.parent) { if (!o.visible) return false; if (o === scene) return true; } return false; };
  // every frame, before the picture: who is drawn, which slots are folded
  function update() {
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
    ranges(mesh.geometry, inner); ranges(outside.geometry, outer);
    mesh.visible = inner.length > 0; outside.visible = outer.length > 0;
  }
  const drawn = [], inner = [], outer = [];
  // (meshes: the people indoors, the people outdoors)
  return { add, update, get meshes() { return mesh ? [mesh, outside] : []; }, get size() { return members.length; }, get drawn() { return drawn.length; } };
}
