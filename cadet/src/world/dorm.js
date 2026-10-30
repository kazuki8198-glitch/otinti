// CADET — world/dorm.js : the cadets' dormitory, inside and out (fictional), east of the car park.
// Built from the interior spec (content/dorm-spec.js) with the academy's own patterns (world/academy.js): the shell
// merged per material, interior walls cut from the room rectangles with door openings, the doors (doors.js), the
// furniture (props.js) merged per room, every wall and piece a collider. Two storeys outside (the upper floor is
// closed: tinted windows), one floor inside. In the runway frame (x = across = c, z = −along = −a, y up).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tex, canvasTexture, windowTexture, windowMask } from '../render/textures.js';
import { metricMaterial, glassMaterial, clearGlassMaterial } from '../render/materials.js';
import { createDoors } from './doors.js';
import { drawScreen, drawBulletin, drawAreaMap } from './boards.js';
import { floorMaterials } from './academy.js';
import { DORM } from './layout.js';

export { DORM };
const IN = { a0: 618.4, a1: 665.6, c0: 366.4, c1: 389.6 };
const near = (x, y, e = 0.06) => Math.abs(x - y) < e;

export function buildDorm({ L, FL, spec, kit, world, audio = null }) {
  const D = DORM;
  const frame = new THREE.Group(); frame.name = 'dormitory';
  frame.position.set(0, L.G, 0); frame.rotation.y = L.frameYaw;
  const M = {
    plaster: metricMaterial({ map: tex('plaster_c'), nr: tex('plaster_nr'), scale: 2.2, color: 0xefe9dc, roughness: 0.9, grime: 0.3 }),
    inner: metricMaterial({ map: tex('plaster_c'), nr: tex('plaster_nr'), scale: 2.2, color: 0xf6f3ec, roughness: 0.92, grime: 0.04, normalStrength: 0.35 }),
    trim: metricMaterial({ map: tex('concrete2_c'), nr: tex('concrete2_nr'), scale: 3, color: 0x9a9fa6, roughness: 0.85, grime: 0.2 }),
    roofFlat: metricMaterial({ map: tex('concrete2_c'), nr: tex('concrete2_nr'), scale: 4, color: 0x8b8f93, roughness: 0.95, grime: 0.15 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8d949b, roughness: 0.45, metalness: 0.8 }),
    mullion: new THREE.MeshStandardMaterial({ color: 0x2f353b, roughness: 0.4, metalness: 0.7 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5, metalness: 0.05 }),
    skirting: new THREE.MeshStandardMaterial({ color: 0x3b4046, roughness: 0.6 }),
  };
  const F = floorMaterials();
  const upperGlass = glassMaterial({ map: windowTexture(), mask: windowMask() });
  const clear = clearGlassMaterial();
  const parts = new Map();
  const add = (mat, geo) => { if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(geo); };
  const box = (mat, a0, a1, c0, c1, y0, y1, collide = true) => {
    if (a1 - a0 < 1e-3 || c1 - c0 < 1e-3 || y1 - y0 < 1e-3) return null;
    const g = new THREE.BoxGeometry(c1 - c0, y1 - y0, a1 - a0); g.translate((c0 + c1) / 2, (y0 + y1) / 2, -(a0 + a1) / 2); add(mat, g);
    if (collide && world) world.add({ x0: c0, x1: c1, y0, y1, z0: -a1, z1: -a0, tag: 'dormitory' });
    return g;
  };
  const panel = (mat, face, at, s0, s1, y0, y1, bay = 3) => {
    const w = s1 - s0, h = y1 - y0, g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * w / bay);
    if (face === 'w') { g.rotateY(-Math.PI / 2); g.translate(at, (y0 + y1) / 2, -(s0 + s1) / 2); }
    if (face === 'e') { g.rotateY(Math.PI / 2); g.translate(at, (y0 + y1) / 2, -(s0 + s1) / 2); }
    if (face === 's') { g.translate((s0 + s1) / 2, (y0 + y1) / 2, -at); }
    if (face === 'n') { g.rotateY(Math.PI); g.translate((s0 + s1) / 2, (y0 + y1) / 2, -at); }
    add(mat, g); return g;
  };
  const flat = (mat, a0, a1, c0, c1, y, down = false) => {
    const g = new THREE.PlaneGeometry(c1 - c0, a1 - a0); g.rotateX(down ? Math.PI / 2 : -Math.PI / 2); g.translate((c0 + c1) / 2, y, -(a0 + a1) / 2);
    const s = mat.userData.metric || 1, uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (c0 + uv.getX(i) * (c1 - c0)) / s, (a0 + uv.getY(i) * (a1 - a0)) / s);
    add(mat, g); return g;
  };

  // ---------------------------------------------------------------- the exterior walls with ground-floor windows
  const outsideDoors = (spec.doors || []).filter(d => (d.rooms || []).includes('outside'));
  // one exterior wall: kind 'c' walls run along a at a constant c, 'a' walls along c; win: the window band's span
  function exteriorWall(kind, t0, t1, s0, s1, win, glassFace) {
    const at = kind === 'c' ? (near(t0, D.c0) ? IN.c0 : IN.c1) : (near(t0, D.a0) ? IN.a0 : IN.a1);
    const doors = outsideDoors.filter(d => d.wall === kind && near(d.at, at, 0.5) && d.from >= s0 && d.to <= s1);
    const B = (mat, u0, u1, y0, y1, collide = true) => (kind === 'c' ? box(mat, u0, u1, t0, t1, y0, y1, collide) : box(mat, t0, t1, u0, u1, y0, y1, collide));
    const cuts = new Set([s0, s1]);
    if (win) { cuts.add(win[0]); cuts.add(win[1]); }
    for (const d of doors) { cuts.add(d.from); cuts.add(d.to); cuts.add(Math.max(s0, d.from - 0.3)); cuts.add(Math.min(s1, d.to + 0.3)); }
    const xs = [...cuts].filter(x => x >= s0 - 1e-6 && x <= s1 + 1e-6).sort((p, q) => p - q);
    for (let i = 0; i < xs.length - 1; i++) {
      const u0 = xs[i], u1 = xs[i + 1]; if (u1 - u0 < 1e-3) continue;
      const mid = (u0 + u1) / 2;
      const door = doors.find(d => mid > d.from && mid < d.to);
      const pier = doors.some(d => (mid > d.from - 0.3 && mid < d.from) || (mid > d.to && mid < d.to + 0.3));
      const glazed = win && mid > win[0] && mid < win[1] && !pier;
      if (door) {
        B(M.plaster, u0, u1, D.head, D.slab);
        glassPane(kind, (t0 + t1) / 2, u0, u1, D.doorH + 0.25, D.head);
      } else if (glazed) {
        B(M.plaster, u0, u1, 0, D.sill); B(M.plaster, u0, u1, D.head, D.slab);
        glassPane(kind, (t0 + t1) / 2, u0, u1, D.sill, D.head);
        const inward = glassFace === 'w' || glassFace === 's' ? 1 : -1;
        if (kind === 'c') box(M.white, u0, u1, inward > 0 ? t1 : t0 - 0.22, inward > 0 ? t1 + 0.22 : t0, D.sill - 0.03, D.sill, false);
        else box(M.white, inward > 0 ? t1 : t0 - 0.22, inward > 0 ? t1 + 0.22 : t0, u0, u1, D.sill - 0.03, D.sill, false);
      } else B(M.plaster, u0, u1, 0, D.slab);
      B(M.plaster, u0, u1, D.slab + 0.4, D.H, false);                     // the upper floor: solid, tinted glass outside
    }
    if (win) panel(upperGlass, glassFace, kind === 'c' ? (glassFace === 'w' ? t0 - 0.02 : t1 + 0.02) : (glassFace === 's' ? t0 - 0.02 : t1 + 0.02), win[0], win[1], 4.9, 6.4);
    return doors;
  }
  function glassPane(kind, mid, u0, u1, y0, y1) {
    const g = new THREE.PlaneGeometry(u1 - u0, y1 - y0);
    if (kind === 'c') { g.rotateY(Math.PI / 2); g.translate(mid, (y0 + y1) / 2, -(u0 + u1) / 2); } else g.translate((u0 + u1) / 2, (y0 + y1) / 2, -mid);
    add(clear, g);
    const fr = (p0, p1, q0, q1) => (kind === 'c' ? box(M.mullion, p0, p1, mid - 0.07, mid + 0.07, q0, q1, false) : box(M.mullion, mid - 0.07, mid + 0.07, p0, p1, q0, q1, false));
    fr(u0, u1, y0, y0 + 0.05); fr(u0, u1, y1 - 0.05, y1);
    const n = Math.max(1, Math.round((u1 - u0) / 1.5));
    for (let k = 0; k <= n; k++) { const u = u0 + (u1 - u0) * k / n; fr(u - 0.03, u + 0.03, y0, y1); }
  }
  exteriorWall('c', D.c0, D.c0 + D.wall, D.a0, D.a1, [D.a0 + 1.5, D.a1 - 1.5], 'w');       // the road side, with the entrance
  exteriorWall('c', D.c1 - D.wall, D.c1, D.a0, D.a1, [D.a0 + 1.5, D.a1 - 1.5], 'e');
  exteriorWall('a', D.a0, D.a0 + D.wall, D.c0, D.c1, [D.c0 + 2, D.c1 - 2], 's');
  exteriorWall('a', D.a1 - D.wall, D.a1, D.c0, D.c1, [D.c0 + 2, D.c1 - 2], 'n');
  // the band between the storeys, the parapet, the roof
  box(M.trim, D.a0 - 0.1, D.a1 + 0.1, D.c0 - 0.1, D.c0, D.slab, D.slab + 0.4, false); box(M.trim, D.a0 - 0.1, D.a1 + 0.1, D.c1, D.c1 + 0.1, D.slab, D.slab + 0.4, false);
  box(M.trim, D.a0 - 0.1, D.a0, D.c0, D.c1, D.slab, D.slab + 0.4, false); box(M.trim, D.a1, D.a1 + 0.1, D.c0, D.c1, D.slab, D.slab + 0.4, false);
  box(M.trim, D.a0 - 0.15, D.a1 + 0.15, D.c0 - 0.15, D.c1 + 0.15, D.H, D.H + 0.7, false);
  box(M.roofFlat, D.a0, D.a1, D.c0, D.c1, D.H - 0.2, D.H + 0.05, false);
  for (let i = 0; i < 3; i++) box(M.steel, D.a0 + 10 + i * 12, D.a0 + 13.5 + i * 12, D.c0 + 8, D.c0 + 11, D.H + 0.05, D.H + 1.3, false);
  // a canopy over the entrance and its columns; the name board over it
  box(M.white, 639.5, 649.0, D.c0 - 3.4, D.c0, 2.9, 3.1, false);
  for (const a of [640.3, 648.2]) box(M.steel, a - 0.12, a + 0.12, D.c0 - 3.1, D.c0 - 2.86, 0, 2.9);
  const sign = canvasTexture(1024, 128, (g, W, H) => {
    g.fillStyle = '#16324f'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f2b632'; g.fillRect(0, H - 10, W, 10);
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.font = '600 56px "Hiragino Sans", "Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", sans-serif';
    g.fillText('翔洋航空　訓練生寮', W / 2, H * 0.46);
  });
  const sm = new THREE.MeshStandardMaterial({ map: sign, roughness: 0.4, metalness: 0.2, emissive: 0xffffff, emissiveMap: sign, emissiveIntensity: 0 });
  const s1 = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.125), sm); s1.position.set(D.c0 - 0.17, 3.55, -(641.4 + 645.0) / 2); s1.rotation.y = -Math.PI / 2;
  frame.add(s1);

  // ---------------------------------------------------------------- the rooms
  const rooms = spec.rooms || [];
  const roomOf = (a, c) => rooms.find(r => a >= r.a0 && a <= r.a1 && c >= r.c0 && c <= r.c1) || null;
  for (const r of rooms) {
    flat(F[r.floor] || F.vinyl, r.a0, r.a1, r.c0, r.c1, 0.02);
    flat(F.ceiling, r.a0, r.a1, r.c0, r.c1, r.ceiling, true);
  }
  // interior walls: every room edge that is not an exterior wall, merged per line (as in the academy)
  const lines = new Map();
  const exterior = (kind, at) => (kind === 'c' ? near(at, IN.c0) || near(at, IN.c1) : near(at, IN.a0) || near(at, IN.a1));
  const addEdge = (kind, at, u0, u1, h) => {
    if (exterior(kind, at)) return;
    const key = kind + ':' + at.toFixed(2);
    if (!lines.has(key)) lines.set(key, { kind, at, spans: [] });
    lines.get(key).spans.push([u0, u1, h]);
  };
  for (const r of rooms) {
    addEdge('a', r.a0, r.c0, r.c1, r.ceiling); addEdge('a', r.a1, r.c0, r.c1, r.ceiling);
    addEdge('c', r.c0, r.a0, r.a1, r.ceiling); addEdge('c', r.c1, r.a0, r.a1, r.ceiling);
  }
  const T = 0.12;
  for (const ln of lines.values()) {
    const xs = [...new Set(ln.spans.flatMap(s => [s[0], s[1]]))].sort((p, q) => p - q);
    const doorsHere = (spec.doors || []).filter(d => d.wall === ln.kind && near(d.at, ln.at));
    for (const d of doorsHere) { xs.push(d.from, d.to); }
    xs.sort((p, q) => p - q);
    for (let i = 0; i < xs.length - 1; i++) {
      const u0 = xs[i], u1 = xs[i + 1]; if (u1 - u0 < 1e-3) continue;
      const mid = (u0 + u1) / 2;
      const hs = ln.spans.filter(s => mid > s[0] && mid < s[1]).map(s => s[2]); if (!hs.length) continue;
      const h = Math.max(...hs) + 0.02;
      const door = doorsHere.find(d => mid > d.from && mid < d.to);
      const W = (y0, y1, collide) => (ln.kind === 'a' ? box(M.inner, ln.at - T / 2, ln.at + T / 2, u0, u1, y0, y1, collide) : box(M.inner, u0, u1, ln.at - T / 2, ln.at + T / 2, y0, y1, collide));
      if (door) { W(door.kind === 'opening' ? Math.min(2.8, h) : D.doorH, h, false); continue; }
      W(0, h, true);
      for (const s of [-1, 1]) {
        if (ln.kind === 'a') box(M.skirting, ln.at + s * (T / 2) - (s < 0 ? 0.012 : 0), ln.at + s * (T / 2) + (s > 0 ? 0.012 : 0), u0, u1, 0.02, 0.11, false);
        else box(M.skirting, u0, u1, ln.at + s * (T / 2) - (s < 0 ? 0.012 : 0), ln.at + s * (T / 2) + (s > 0 ? 0.012 : 0), 0.02, 0.11, false);
      }
    }
  }

  // ---------------------------------------------------------------- doors
  const doors = createDoors({ frame, world, audio });
  for (const d of spec.doors || []) {
    if (d.kind === 'opening') continue;
    if ((d.rooms || []).includes('outside')) {
      const mid = d.wall === 'c' ? (near(d.at, IN.c0, 0.5) ? D.c0 + D.wall / 2 : D.c1 - D.wall / 2) : (near(d.at, IN.a1, 0.5) ? D.a1 - D.wall / 2 : D.a0 + D.wall / 2);
      const inside = d.wall === 'c' ? (mid < (D.c0 + D.c1) / 2 ? 1 : -1) : (mid > (D.a0 + D.a1) / 2 ? 1 : -1);
      doors.add({ ...d, at: mid }, { wallT: D.wall, slideOffset: d.kind === 'sliding_auto' ? inside * (D.wall / 2 + 0.08) : 0 });
      continue;
    }
    doors.add(d, { wallT: T });
  }

  // ---------------------------------------------------------------- furniture, boards, ceiling lights
  const inter = spec.interactables || [];
  const nearestText = (a, c, r = 1.6) => { let best = null, bd = r; for (const it of inter) { const d = Math.hypot(it.a - a, it.c - c); if (d < bd) { bd = d; best = it; } } return best; };
  const lights = [];
  for (const r of rooms) {
    for (const f of r.furniture || []) {
      const it = nearestText(f.a, f.c), opts = {};
      if (f.type === 'wall_screen') opts.draw = drawScreen(it ? it.title_ja : '翔洋航空 訓練生寮', it ? it.text_ja : '');
      else if (f.type === 'bulletin_board') opts.draw = drawBulletin(it ? it.title_ja : 'お知らせ', it ? it.text_ja : '');
      else if (f.type === 'map_wall') { opts.draw = drawAreaMap(FL, L); opts.key = 'area-map'; }
      if (f.y != null) opts.y = f.y;
      if (f.note) opts.note = f.note;
      kit.place(f.type, { a: f.a, c: f.c, rot: f.rot || 0, opts });
    }
    for (const l of r.lights || []) { kit.place('ceiling_light', { a: l.a, c: l.c, rot: 0, y: r.ceiling - 0.005 }); lights.push({ x: l.c, y: r.ceiling - 0.15, z: -l.a, room: r.id }); }
  }
  for (const d of outsideDoors) {
    const u = (d.from + d.to) / 2;
    if (d.wall === 'c') kit.place('exit_sign', { a: u, c: IN.c0 + 0.02, rot: 180, opts: { y: 2.55 } });
  }
  const built = kit.build({ zoneOf: (a, c) => (roomOf(a, c) || { id: 'dorm-shell' }).id });
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
    const m = new THREE.Mesh(geo, mat); m.castShadow = mat !== clear; m.receiveShadow = true; m.name = 'dormitory-part';
    if (mat === clear) { m.userData.noAO = true; m.renderOrder = 2; }
    frame.add(m);
  }

  const targets = inter.map(it => ({
    id: 'ex:' + it.id, frame: [it.c, it.y, -it.a], radius: 0.55, prompt: it.prompt_ja, title: it.title_ja, text: it.text_ja, room: it.room,
  }));
  const interiorMaterials = new Set();
  frame.traverse(o => { if (o.isMesh && o.material && o.material !== clear && o.material !== sm && o.material !== upperGlass) interiorMaterials.add(o.material); });

  return {
    group: frame, doors, rooms, lights, targets, roomOf, interiorMaterials, anchors: built.anchors,
    floorAt(a, c) { const r = roomOf(a, c); return r ? r.floor : null; },
    inside(a, c) { return a > D.a0 && a < D.a1 && c > IN.c0 && c < D.c1; },
    setNight(k) { sm.emissiveIntensity = 0.6 * k; upperGlass.emissiveIntensity = 0.5 * k; },
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
