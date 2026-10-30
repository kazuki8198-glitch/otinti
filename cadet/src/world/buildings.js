// CADET — world/buildings.js : the academy's side of the field (east of the apron, in the runway frame):
// two hangars (one open, walk-in), the tower, the fuel farm and the apron flood lights. The academy building itself,
// inside and out, is academy.js. Every box is also a collider for walking (the walker ignores what is below its step
// height or above its head). All fictional.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tex, canvasTexture, corrugatedNormal, windowTexture, windowMask } from '../render/textures.js';
import { metricMaterial, glassMaterial } from '../render/materials.js';
import { HANGARS, TOWER } from './layout.js';
import { hangarSpec } from '../content/hangar-spec.js';

export function buildBuildings(L, { world = null, kit = null } = {}) {
  const frame = new THREE.Group(); frame.name = 'buildings';
  frame.position.set(0, L.G, 0); frame.rotation.y = L.frameYaw;          // x = across, z = −along

  // ---------------------------------------------------------------- materials
  const corr = corrugatedNormal();
  const M = {
    plaster: metricMaterial({ map: tex('plaster_c'), nr: tex('plaster_nr'), scale: 2.2, color: 0xf3eee4, roughness: 0.9, grime: 0.3 }),
    trim: metricMaterial({ map: tex('concrete2_c'), nr: tex('concrete2_nr'), scale: 3, color: 0x9a9fa6, roughness: 0.85, grime: 0.2 }),
    roofFlat: metricMaterial({ map: tex('concrete2_c'), nr: tex('concrete2_nr'), scale: 4, color: 0x8b8f93, roughness: 0.95, grime: 0.15 }),
    metalWall: metricMaterial({ normalMap: corr, scale: 1.0, color: 0xc7ccd1, roughness: 0.42, metalness: 0.55, normalStrength: 0.9, noTile: false, grime: 0.35 }),
    metalWallB: metricMaterial({ normalMap: corr, scale: 1.0, color: 0x3f6f9e, roughness: 0.45, metalness: 0.45, normalStrength: 0.9, noTile: false, grime: 0.3 }),
    metalRoof: metricMaterial({ normalMap: corr, scale: 1.0, color: 0xb5babf, roughness: 0.38, metalness: 0.75, normalStrength: 0.9, noTile: false, uAxis: 'z', grime: 0.2 }),
    door: metricMaterial({ normalMap: corr, scale: 0.7, color: 0xe4e6e8, roughness: 0.4, metalness: 0.5, normalStrength: 0.8, noTile: false, grime: 0.3 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8d949b, roughness: 0.45, metalness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.8 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.55, metalness: 0.1 }),
    tank: new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.35, metalness: 0.2 }),
    hangarFloor: metricMaterial({ map: tex('concrete_c'), nr: null, normalMap: tex('concrete_n'), scale: 4, color: 0xd6d8da, roughness: 0.5, grime: 0.1 }),
  };
  const winTex = windowTexture(), winMask = windowMask();
  const glass = glassMaterial({ map: winTex, mask: winMask });
  const lobbyGlass = glassMaterial({ tint: 0x7f97a8 });
  const parts = new Map();                                              // material → [geometries]
  const add = (mat, geo) => { if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(geo); };
  // a box from (along, across, height) bounds
  const box = (mat, a0, a1, c0, c1, y0, y1) => {
    const g = new THREE.BoxGeometry(c1 - c0, y1 - y0, a1 - a0); g.translate((c0 + c1) / 2, (y0 + y1) / 2, -(a0 + a1) / 2); add(mat, g);
    if (world) world.add({ x0: c0, x1: c1, y0, y1, z0: -a1, z1: -a0, tag: 'building' });
    return g;
  };
  // a flat panel facing ±across (face: 'w' = towards the runway / apron, 'e' = away) or ±along ('s' / 'n'), uv in bays
  const panel = (mat, face, at, s0, s1, y0, y1, bay = 3) => {
    const w = s1 - s0, h = y1 - y0, g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * w / bay);
    if (face === 'w') { g.rotateY(-Math.PI / 2); g.translate(at, (y0 + y1) / 2, -(s0 + s1) / 2); }
    if (face === 'e') { g.rotateY(Math.PI / 2); g.translate(at, (y0 + y1) / 2, -(s0 + s1) / 2); }
    if (face === 's') { g.translate((s0 + s1) / 2, (y0 + y1) / 2, -at); }
    if (face === 'n') { g.rotateY(Math.PI); g.translate((s0 + s1) / 2, (y0 + y1) / 2, -at); }
    add(mat, g); return g;
  };

  // ---------------------------------------------------------------- hangars (door towards the apron)
  const hangar = (a0, a1, c0, c1, h, open, wallMat) => {
    const t = 0.25, pitch = 0.14, cm = (c0 + c1) / 2, ridge = h + (c1 - c0) / 2 * pitch;
    box(wallMat, a0, a0 + t, c0, c1, 0, h); box(wallMat, a1 - t, a1, c0, c1, 0, h);   // the gable-end walls
    box(wallMat, a0, a1, c1 - t, c1, 0, h);                                           // the back wall
    // the gable triangles
    for (const a of [a0, a1 - t]) {
      const s = new THREE.Shape([new THREE.Vector2(c0, h), new THREE.Vector2(c1, h), new THREE.Vector2(cm, ridge)]);
      const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.translate(0, 0, -a - t); add(wallMat, g);
    }
    // the roof: two sloping sheets with a little overhang
    const len = Math.hypot((c1 - c0) / 2 + 0.6, ((c1 - c0) / 2 + 0.6) * pitch);
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(len, 0.12, a1 - a0 + 1.2);
      g.rotateZ(-s * Math.atan(pitch)); g.translate(cm + s * ((c1 - c0) / 4 + 0.3), (h + ridge) / 2 + 0.08, -(a0 + a1) / 2); add(M.metalRoof, g);
    }
    // the door wall: a header above the opening and the door leaves (sliding; stacked at the ends when open)
    const dh = h - 1.6;
    box(wallMat, a0, a1, c0, c0 + t, dh, h);
    const leaves = 6, lw = (a1 - a0 - 1.0) / leaves;
    for (let i = 0; i < leaves; i++) {
      let s0 = a0 + 0.5 + i * lw;
      if (open) s0 = i < leaves / 2 ? a0 + 0.5 + (i % 3) * 0.12 : a1 - 0.5 - lw - (i % 3) * 0.12;       // pushed to the sides
      box(M.door, s0, s0 + lw, c0 - 0.35 - (i % 3) * 0.12, c0 - 0.2 - (i % 3) * 0.12, 0.05, dh);
    }
    box(M.steel, a0 - 0.5, a1 + 0.5, c0 - 0.7, c0 - 0.1, dh, dh + 0.25);                   // the door track
    // inside: a smooth floor
    box(M.hangarFloor, a0 + t, a1 - t, c0 + t, c1 - t, 0, 0.02);
    // small personnel door and windows in the gable end facing south
    box(M.dark, a0 - 0.05, a0, c1 - 6, c1 - 5, 0, 2.1);
  };
  HANGARS.forEach((hg, i) => hangar(hg.a0, hg.a1, hg.c0, hg.c1, hg.h, hg.open, i === 1 ? M.metalWallB : M.metalWall));

  // ---------------------------------------------------------------- the hangars' insides (Phase 4): the
  // workshop's benches, tools and parts, and the spare hangar's shelves — the prop kit, merged as everywhere
  const hangarTargets = [];
  if (kit) {
    const hs = hangarSpec();
    for (const area of hs.areas) {
    for (const f of area.furniture || []) kit.place(f.type, { a: f.a, c: f.c, rot: f.rot || 0, opts: {} });
      for (const it of area.interactables || []) hangarTargets.push({ id: 'ex:' + it.id, frame: [it.c, it.y, -it.a], radius: 0.55, prompt: it.prompt_ja, title: it.title_ja, text: it.text_ja, room: it.room });
    }
    const built = kit.build({ zoneOf: (a, c) => { const ar = hs.areas.find(x => a >= x.hangar.a0 && a <= x.hangar.a1 && c >= x.hangar.c0 && c <= x.hangar.c1); return ar ? ar.id : 'hangars'; } });
    frame.add(built.group);
    if (world) for (const b of built.colliders) world.add({ ...b, tag: b.type || 'prop' });
  }

  // ---------------------------------------------------------------- the tower (fictional): since Phase 4 a
  // hollow shell — the base's walls (a window band, the entrance in the west wall), the shaft's walls with
  // the stair door's opening in its south face, the slab between them cut round the shaft. Its inside
  // (hall, stair, cab floor) is world/tower.js.
  {
    const T = TOWER, a = T.a, c = T.c;
    // a base wall along a at across [w0, w1]: plaster below and above the window band, glass in it, and a
    // header (no band) over the entrance's span when doorAt is given
    const baseWall = (w0, w1, doorAt = null) => {
      const segs = doorAt ? [[T.b0, doorAt[0]], [doorAt[0], doorAt[1]], [doorAt[1], T.b1]] : [[T.b0, T.b1]];
      for (const [s0, s1] of segs) {
        if (s1 - s0 < 1e-3) continue;
        const isDoor = doorAt && s0 >= doorAt[0] - 1e-6 && s1 <= doorAt[1] + 1e-6;
        if (isDoor) { box(M.plaster, s0, s1, w0, w1, T.doorH, T.baseTop); continue; }
        box(M.plaster, s0, s1, w0, w1, 0, 1.0); box(M.plaster, s0, s1, w0, w1, 2.7, T.baseTop);
        const pane = new THREE.BoxGeometry(w1 - w0 - 0.1, 1.7, s1 - s0); pane.translate((w0 + w1) / 2, 1.85, -(s0 + s1) / 2); add(lobbyGlass, pane);
        if (world) world.add({ x0: w0 + 0.05, x1: w1 - 0.05, y0: 1.0, y1: 2.7, z0: -s1, z1: -s0, tag: 'building' });
      }
    };
    baseWall(T.c0, T.c0 + 0.4, [720.1, 721.9]);                     // the west wall, with the entrance
    baseWall(T.c1 - 0.4, T.c1);                                     // the east wall
    box(M.plaster, T.b0, T.b0 + 0.4, T.c0, T.c1, 0, T.baseTop);     // the north and south ends
    box(M.plaster, T.b1 - 0.4, T.b1, T.c0, T.c1, 0, T.baseTop);
    panel(glass, 'w', T.c0 - 0.02, T.b0 + 1.5, T.b1 - 1.5, 1.0, 2.7);
    // the slab over the hall, cut round the shaft
    box(M.trim, T.b0, T.s0, T.c0, T.c1, T.baseTop, T.baseTop + 0.4, false); box(M.trim, T.s1, T.b1, T.c0, T.c1, T.baseTop, T.baseTop + 0.4, false);
    box(M.trim, T.s0, T.s1, T.c0, T.sc0, T.baseTop, T.baseTop + 0.4, false); box(M.trim, T.s0, T.s1, T.sc1, T.c1, T.baseTop, T.baseTop + 0.4, false);
    // the shaft's walls, from the ground to the cab: the south face has the stair door's opening (c 260.4–261.6)
    const w = T.wall;
    box(M.plaster, T.s0, T.s1, T.sc0, T.sc0 + w, 0, 17); box(M.plaster, T.s0, T.s1, T.sc1 - w, T.sc1, 0, 17);
    box(M.plaster, T.s0, T.s0 + w, T.sc0 + w, T.sc1 - w, 0, 17);
    box(M.plaster, T.s1 - w, T.s1, T.sc0 + w, 260.4, 0, 17); box(M.plaster, T.s1 - w, T.s1, 261.6, T.sc1 - w, 0, 17);
    box(M.plaster, T.s1 - w, T.s1, 260.4, 261.6, T.doorH, 17);
    // the cab: eight glass faces leaning out, a dark roof, the beacon
    const cab = new THREE.CylinderGeometry(4.0, 3.4, 3.4, 8, 1, true); cab.rotateY(Math.PI / 8); cab.translate(c, 18.7, -a); add(lobbyGlass, cab);
    const floor = new THREE.CylinderGeometry(3.6, 3.6, 0.4, 8); floor.rotateY(Math.PI / 8); floor.translate(c, 17.0, -a); add(M.trim, floor);
    const roof = new THREE.CylinderGeometry(4.4, 4.4, 0.45, 8); roof.rotateY(Math.PI / 8); roof.translate(c, 20.6, -a); add(M.dark, roof);
    box(M.steel, a - 0.08, a + 0.08, c - 0.08, c + 0.08, 20.8, 25);
  }

  // ---------------------------------------------------------------- the fuel farm (on its pad south of the apron)
  {
    const a = 434.5, c = 212;
    for (const da of [-3.2, 3.2]) {
      const g = new THREE.CylinderGeometry(1.35, 1.35, 9, 28); g.rotateZ(Math.PI / 2); g.translate(c, 2.0, -(a + da)); add(M.tank, g);
      if (world) world.add({ x0: c - 4.5, x1: c + 4.5, y0: 0.65, y1: 3.35, z0: -(a + da) - 1.35, z1: -(a + da) + 1.35, tag: 'building' });   // the tank itself
      for (const dc of [-3, 3]) box(M.trim, a + da - 0.6, a + da + 0.6, c + dc - 0.3, c + dc + 0.3, 0, 1.0);
    }
    box(M.trim, 423, 446, 193, 194, 0, 0.8); box(M.trim, 423, 446, 224, 225, 0, 0.8); box(M.trim, 423, 424, 193, 225, 0, 0.8);
    box(M.steel, 446, 447.2, 200, 203, 0, 1.6);                               // the dispenser
    box(M.white, 444.5, 449.5, 198, 205, 3.6, 3.8);                           // its canopy
    for (const [da, dc] of [[445, 199], [449, 199], [445, 204], [449, 204]]) box(M.steel, da - 0.08, da + 0.08, dc - 0.08, dc + 0.08, 0, 3.6);
  }

  // ---------------------------------------------------------------- apron flood lights
  for (const a of [480, 600, 720]) {
    box(M.steel, a - 0.18, a + 0.18, 237.8, 238.2, 0, 15);
    box(M.dark, a - 1.4, a + 1.4, 237.4, 238.0, 14.6, 15.2);
  }

  // ---------------------------------------------------------------- merge per material
  for (const [mat, geos] of parts) {
    const geo = mergeGeometries(geos.map(g0 => {
      const g = g0.index ? g0.toNonIndexed() : g0;
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.clearGroups();
      return g;
    }));
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
    frame.add(m);
  }
  return {
    group: frame, targets: hangarTargets,
    setNight(k) { glass.emissiveIntensity = 0.9 * k; lobbyGlass.emissiveIntensity = 0; },
  };
}
