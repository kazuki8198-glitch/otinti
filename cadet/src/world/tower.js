// CADET — world/tower.js : the control tower's inside (fictional), built from the interior spec
// (content/tower-spec.js). The shell — the base block's walls, the hollow shaft, the cab's glass and floor
// disc — is world/buildings.js (it always was the tower's outside); this builds what the shell holds: the
// hall's floors and ceiling, the dog-leg stair in the shaft (five flights and their landings, from
// world/layout.js towerStairs()), the cab's floor over the disc, the doors (doors.js), the furniture
// (props.js) and the ceiling lights. In the runway frame (x = across = c, z = −along = −a, y up).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tex } from '../render/textures.js';
import { metricMaterial } from '../render/materials.js';
import { createDoors } from './doors.js';
import { drawBulletin } from './boards.js';
import { floorMaterials } from './academy.js';
import { TOWER, towerStairs } from './layout.js';

export { TOWER };
const near = (x, y, e = 0.06) => Math.abs(x - y) < e;

export function buildTower({ L, spec, kit, world, audio = null }) {
  const T = TOWER, S = towerStairs(T);
  const frame = new THREE.Group(); frame.name = 'tower';
  frame.position.set(0, L.G, 0); frame.rotation.y = L.frameYaw;
  const M = {
    inner: metricMaterial({ map: tex('plaster_c'), nr: tex('plaster_nr'), scale: 2.2, color: 0xf6f3ec, roughness: 0.92, grime: 0.04, normalStrength: 0.35 }),
    trim: metricMaterial({ map: tex('concrete2_c'), nr: tex('concrete2_nr'), scale: 3, color: 0x9a9fa6, roughness: 0.85, grime: 0.2 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8d949b, roughness: 0.45, metalness: 0.8 }),
  };
  const F = floorMaterials();
  const parts = new Map();
  const add = (mat, geo) => { if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(geo); };
  const box = (mat, a0, a1, c0, c1, y0, y1, collide = true, tag = 'tower') => {
    if (a1 - a0 < 1e-3 || c1 - c0 < 1e-3 || y1 - y0 < 1e-3) return null;
    const g = new THREE.BoxGeometry(c1 - c0, y1 - y0, a1 - a0); g.translate((c0 + c1) / 2, (y0 + y1) / 2, -(a0 + a1) / 2); add(mat, g);
    if (collide && world) world.add({ x0: c0, x1: c1, y0, y1, z0: -a1, z1: -a0, tag });
    return g;
  };
  const flat = (mat, a0, a1, c0, c1, y, down = false) => {
    const g = new THREE.PlaneGeometry(c1 - c0, a1 - a0); g.rotateX(down ? Math.PI / 2 : -Math.PI / 2); g.translate((c0 + c1) / 2, y, -(a0 + a1) / 2);
    const s = mat.userData.metric || 1, uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (c0 + uv.getX(i) * (c1 - c0)) / s, (a0 + uv.getY(i) * (a1 - a0)) / s);
    add(mat, g); return g;
  };

  // ---------------------------------------------------------------- the rooms' floors and ceilings
  const rooms = spec.rooms || [];
  const roomOf = (a, c, y = null) => {
    const rs = rooms.filter(r => a >= r.a0 && a <= r.a1 && c >= r.c0 && c <= r.c1);
    if (!rs.length) return null;
    if (y == null) return rs[0];
    let best = null;
    for (const r of rs) if ((r.floorY || 0) <= y + 0.6 && (!best || (r.floorY || 0) > (best.floorY || 0))) best = r;
    return best || rs[0];
  };
  for (const r of rooms) {
    const fy = r.floorY || 0, rects = r.floorRects || [[r.a0, r.a1, r.c0, r.c1]];
    for (const [a0, a1, c0, c1] of rects) {
      flat(F[r.floor] || F.vinyl, a0, a1, c0, c1, fy + 0.02);
      if (fy > 0 && world) world.add({ x0: c0, x1: c1, y0: fy - 0.35, y1: fy, z0: -a1, z1: -a0, tag: 'floor' });
      if (!r.open) flat(F.ceiling, a0, a1, c0, c1, r.ceiling, true);
    }
  }

  // ---------------------------------------------------------------- the stair (its geometry: layout.js)
  for (const f of S.flights) {
    for (let i = 0; i < S.steps; i++) {
      const e0 = f.aFrom + (f.aTo - f.aFrom) * i / S.steps, e1 = f.aFrom + (f.aTo - f.aFrom) * (i + 1) / S.steps;
      const top = f.y0 + S.stepRise * (i + 1);
      box(M.trim, Math.min(e0, e1), Math.max(e0, e1), f.c0, f.c1, top - 0.28, top);
    }
    // the stringer: a sloped steel slab under the treads
    const len = Math.hypot(f.aTo - f.aFrom, f.y1 - f.y0) + 0.3;
    const sg = new THREE.BoxGeometry(f.c1 - f.c0, 0.14, len);
    sg.rotateX(Math.atan2(-(f.y1 - f.y0), -(f.aTo - f.aFrom)));
    sg.translate((f.c0 + f.c1) / 2, (f.y0 + f.y1) / 2 - 0.36, -(f.aFrom + f.aTo) / 2); add(M.steel, sg);
  }
  for (const l of S.landings) {
    box(M.trim, l.a0, l.a1, l.c0, l.c1, l.y - 0.28, l.y);
    box(M.steel, l.a0, l.a1, (l.c0 + l.c1) / 2 - 0.06, (l.c0 + l.c1) / 2 + 0.06, Math.max(0, l.y - 1.6), l.y - 0.28, false);   // its post
  }

  // ---------------------------------------------------------------- doors
  const doors = createDoors({ frame, world, audio });
  for (const d of spec.doors || []) {
    if (d.kind === 'opening') continue;                                  // an open passage / a graph edge
    if ((d.rooms || []).includes('outside')) {
      doors.add(d, { wallT: 0.4, slideOffset: d.kind === 'sliding_auto' ? 0.28 : 0 });
      continue;
    }
    doors.add(d, { wallT: T.wall });
  }

  // ---------------------------------------------------------------- furniture and ceiling lights
  const inter = spec.interactables || [];
  const nearestText = (a, c, r = 1.6) => { let best = null, bd = r; for (const it of inter) { const d = Math.hypot(it.a - a, it.c - c); if (d < bd) { bd = d; best = it; } } return best; };
  const lights = [];
  for (const r of rooms) {
    for (const f of r.furniture || []) {
      const it = nearestText(f.a, f.c), opts = {};
      if (f.type === 'bulletin_board') opts.draw = drawBulletin(it ? it.title_ja : 'お知らせ', it ? it.text_ja : '');
      else if (f.type === 'sign_board' && it) opts.text = { title: it.title_ja, lines: [] };
      if (f.y != null) opts.y = f.y;
      if (f.note) opts.note = f.note;
      kit.place(f.type, { a: f.a, c: f.c, rot: f.rot || 0, y: (r.floorY || 0) + (f.yOff || 0), opts });
    }
    for (const l of r.lights || []) {
      if (l.prop !== false) kit.place('ceiling_light', { a: l.a, c: l.c, rot: 0, y: l.y != null ? l.y : r.ceiling - 0.005 });
      lights.push({ x: l.c, y: (l.y != null ? l.y : r.ceiling) - 0.15, z: -l.a, room: r.id });
    }
  }
  for (const d of (spec.doors || []).filter(x => (x.rooms || []).includes('outside'))) {
    const u = (d.from + d.to) / 2;
    if (d.wall === 'c') kit.place('exit_sign', { a: u, c: T.c0 + 0.42, rot: 180, opts: { y: 2.55 } });
  }
  const zoneOf = (a, c) => { for (const r of [...rooms].reverse()) if (a >= r.a0 && a <= r.a1 && c >= r.c0 && c <= r.c1) return r.id; return 'tower-shell'; };
  const built = kit.build({ zoneOf });
  frame.add(built.group);
  const propMeshes = built.group.children.filter(m => m.isMesh && m.userData.shadow);
  if (world) for (const b of built.colliders) world.add({ ...b, tag: b.type || 'prop' });

  // ---------------------------------------------------------------- merge the shell per material
  for (const [mat, geos] of parts) {
    const geo = mergeGeometries(geos.map(g0 => {
      const g = g0.index ? g0.toNonIndexed() : g0;
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.clearGroups(); return g;
    }));
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.name = 'tower-part';
    frame.add(m);
  }

  const targets = inter.map(it => ({
    id: 'ex:' + it.id, frame: [it.c, it.y, -it.a], radius: 0.55, prompt: it.prompt_ja, title: it.title_ja, text: it.text_ja, room: it.room,
  }));
  const interiorMaterials = new Set();
  frame.traverse(o => { if (o.isMesh && o.material) interiorMaterials.add(o.material); });

  return {
    group: frame, doors, rooms, lights, targets, roomOf, interiorMaterials, anchors: built.anchors,
    floorAt(a, c) { const r = roomOf(a, c); return r ? r.floor : null; },
    inside(a, c) { return a > T.b0 && a < T.b1 && c > T.c0 && c < T.c1; },
    setNight() {},
    update(dt, playerFrame) {
      doors.update(dt, playerFrame);
      const a = -playerFrame.z, c = playerFrame.x;
      for (const m of propMeshes) {
        const r = rooms.find(q => q.id === m.userData.zone);
        const d = r ? Math.hypot(Math.max(r.a0 - a, 0, a - r.a1), Math.max(r.c0 - c, 0, c - r.c1)) : 0;
        m.castShadow = m.userData.shadow && d < 6;
      }
    },
  };
}
