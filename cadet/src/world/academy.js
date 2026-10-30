// CADET — world/academy.js : the academy building, inside and out (fictional: 翔洋航空 フライトアカデミー).
// Built from the interior spec (content/academy-spec.js: rooms, doors, furniture, the things to examine), in the runway
// frame (x = across = c, z = −along = −a, y up from the floor; the frame sits on FLIGHT LAB's ground).
//  - the shell: plaster walls with real ground-floor ribbon windows (clear glass you can see through, mullions,
//    sills), the double-height lobby with its glass front to the apron and the automatic doors, the main entrance
//    on the car-park side, the upper floor (closed in M1: its windows stay tinted), the roof, the canopy, the name boards;
//  - the rooms: floors by material, suspended ceilings with light panels, interior walls cut from the room
//    rectangles with door openings, skirting boards, the doors (doors.js), the furniture (props.js) and the boards'
//    writing (boards.js), every wall and piece of furniture a collider.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tex, canvasTexture, windowTexture, windowMask } from '../render/textures.js';
import { metricMaterial, glassMaterial, clearGlassMaterial } from '../render/materials.js';
import { createDoors } from './doors.js';
import { drawWhiteboard, drawScreen, drawStatusBoard, drawBulletin, drawAreaMap } from './boards.js';
import { NAMES, ACADEMY } from './layout.js';

export { ACADEMY };
const IN = { a0: 608.4, a1: 701.6, c0: 248.4, c1: 277.6 };
const near = (x, y, e = 0.06) => Math.abs(x - y) < e;

// ---------------------------------------------------------------- floor and ceiling textures (drawn at start-up)
// (shared with the dormitory: world/dorm.js builds its rooms from the same floors)
export function floorMaterials() {
  // a seeded random for the speckles (index arithmetic would leave a visible lattice)
  let seed = 9001; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const carpet = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#3b4652'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) { const v = 40 + ((i * 7919) % 40); g.fillStyle = `rgba(${v},${v + 8},${v + 18},0.5)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);          // carpet tiles 0.5 m
  }, { repeat: true });
  const vinyl = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#c9c6bf'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = 150 + ((i * 7919) % 70); g.fillStyle = `rgba(${v},${v},${v - 6},0.35)`; g.fillRect(rnd() * w, rnd() * h, 3, 2); }
    g.strokeStyle = 'rgba(80,80,80,0.18)'; g.lineWidth = 1.5; g.strokeRect(0.5, 0.5, w - 1, h - 1);
  }, { repeat: true });
  const tile = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#e4e1da'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { const v = 200 + ((i * 7919) % 40); g.fillStyle = `rgba(${v},${v - 2},${v - 8},0.4)`; g.fillRect(rnd() * w, rnd() * h, 4, 3); }
    g.strokeStyle = 'rgba(110,105,95,0.55)'; g.lineWidth = 4; g.strokeRect(0, 0, w, h);                // 0.6 m tiles, grout
  }, { repeat: true });
  const terrazzo = canvasTexture(1024, 1024, (g, w, h) => {
    g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, w, h);
    const cols = ['#9aa3ab', '#5f6870', '#b9a58a', '#ffffff', '#3d4a57', '#c8b27e'];
    for (let i = 0; i < 5200; i++) { g.fillStyle = cols[i % cols.length]; const r = 1.2 + rnd() * rnd() * 6; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, r, r * (0.5 + 0.4 * rnd()), rnd() * 6.28, 0, 6.29); g.fill(); }
  }, { repeat: true });
  const ceiling = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#eceae4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = 'rgba(150,150,145,0.35)'; g.fillRect(rnd() * w, rnd() * h, 1 + (i % 3), 1); }
    g.strokeStyle = '#c9c7c0'; g.lineWidth = 5; g.strokeRect(0, 0, w, h);                          // 0.6 m grid
  }, { repeat: true });
  const mk = (map, scale, rough, extra = {}) => { const m = new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: 0, ...extra }); m.userData.metric = scale; return m; };
  return {
    carpet: mk(carpet, 1.0, 0.95), vinyl: mk(vinyl, 1.2, 0.55), tile: mk(tile, 0.6, 0.35), terrazzo: mk(terrazzo, 2.4, 0.18),
    concrete: metricMaterial({ map: tex('concrete_c'), normalMap: tex('concrete_n'), scale: 3, color: 0xd8dadc, roughness: 0.55, grime: 0.05 }),
    ceiling: mk(ceiling, 0.6, 0.92),
  };
}

export function buildAcademy({ L, FL, spec, kit, world, audio = null }) {
  const A = ACADEMY;
  const frame = new THREE.Group(); frame.name = 'academy';
  frame.position.set(0, L.G, 0); frame.rotation.y = L.frameYaw;
  const M = {
    plaster: metricMaterial({ map: tex('plaster_c'), nr: tex('plaster_nr'), scale: 2.2, color: 0xf3eee4, roughness: 0.9, grime: 0.3 }),
    inner: metricMaterial({ map: tex('plaster_c'), nr: tex('plaster_nr'), scale: 2.2, color: 0xf6f3ec, roughness: 0.92, grime: 0.04, normalStrength: 0.35 }),
    accent: metricMaterial({ map: tex('plaster_c'), nr: tex('plaster_nr'), scale: 2.2, color: 0x2a4a6e, roughness: 0.9, grime: 0.02, normalStrength: 0.3 }),
    trim: metricMaterial({ map: tex('concrete2_c'), nr: tex('concrete2_nr'), scale: 3, color: 0x9a9fa6, roughness: 0.85, grime: 0.2 }),
    roofFlat: metricMaterial({ map: tex('concrete2_c'), nr: tex('concrete2_nr'), scale: 4, color: 0x8b8f93, roughness: 0.95, grime: 0.15 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8d949b, roughness: 0.45, metalness: 0.8 }),
    mullion: new THREE.MeshStandardMaterial({ color: 0x2f353b, roughness: 0.4, metalness: 0.7 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5, metalness: 0.05 }),
    skirting: new THREE.MeshStandardMaterial({ color: 0x3b4046, roughness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.8 }),
  };
  const F = floorMaterials();
  const upperGlass = glassMaterial({ map: windowTexture(), mask: windowMask() });
  const clear = clearGlassMaterial();
  const parts = new Map();
  const add = (mat, geo) => { if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(geo); };
  // a box from (along, across, height) bounds; a collider too unless told otherwise
  const box = (mat, a0, a1, c0, c1, y0, y1, collide = true, tag = 'academy') => {
    if (a1 - a0 < 1e-3 || c1 - c0 < 1e-3 || y1 - y0 < 1e-3) return null;
    const g = new THREE.BoxGeometry(c1 - c0, y1 - y0, a1 - a0); g.translate((c0 + c1) / 2, (y0 + y1) / 2, -(a0 + a1) / 2); add(mat, g);
    if (collide && world) world.add({ x0: c0, x1: c1, y0, y1, z0: -a1, z1: -a0, tag });
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
  // a horizontal quad (floor: facing up; ceiling: facing down) with uv in metres / scale
  const flat = (mat, a0, a1, c0, c1, y, down = false) => {
    const g = new THREE.PlaneGeometry(c1 - c0, a1 - a0); g.rotateX(down ? Math.PI / 2 : -Math.PI / 2); g.translate((c0 + c1) / 2, y, -(a0 + a1) / 2);
    const s = mat.userData.metric || 1, uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (c0 + uv.getX(i) * (c1 - c0)) / s, (a0 + uv.getY(i) * (a1 - a0)) / s);
    add(mat, g); return g;
  };

  // ---------------------------------------------------------------- the exterior walls with ground-floor windows
  const outsideDoors = (spec.doors || []).filter(d => (d.rooms || []).includes('outside'));
  // one exterior wall: 'c' walls run along a (constant c from t0 to t1), 'a' walls run along c.
  // upperWin (Phase 3): over the built second floor, the upper ribbon window is real glass too, not a tinted
  // sheet over solid plaster — the second floor's rooms get the apron's light.
  function exteriorWall(kind, t0, t1, s0, s1, win, glassFace, upperWin = false) {
    const at = kind === 'c' ? (near(t0, A.c0) ? IN.c0 : IN.c1) : (near(t0, A.a0) ? IN.a0 : IN.a1);
    const doors = outsideDoors.filter(d => d.wall === kind && (near(d.at, at, 0.5) || near(d.at, (t0 + t1) / 2, 0.5)) && d.from >= s0 && d.to <= s1);
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
        // a door: open up to the head; a glass transom up to the window head; wall above
        B(M.plaster, u0, u1, A.head, A.slab);
        glassPane(kind, (t0 + t1) / 2, u0, u1, A.doorH + 0.25, A.head);
      } else if (glazed) {
        B(M.plaster, u0, u1, 0, A.sill); B(M.plaster, u0, u1, A.head, A.slab);
        glassPane(kind, (t0 + t1) / 2, u0, u1, A.sill, A.head);
        // sills inside and out
        const inward = glassFace === 'w' || glassFace === 's' ? 1 : -1;
        if (kind === 'c') { box(M.white, u0, u1, inward > 0 ? t1 : t0 - 0.22, inward > 0 ? t1 + 0.22 : t0, A.sill - 0.03, A.sill, false); box(M.trim, u0, u1, inward > 0 ? t0 - 0.12 : t1, inward > 0 ? t0 : t1 + 0.12, A.sill - 0.05, A.sill, false); }
        else { box(M.white, inward > 0 ? t1 : t0 - 0.22, inward > 0 ? t1 + 0.22 : t0, u0, u1, A.sill - 0.03, A.sill, false); box(M.trim, inward > 0 ? t0 - 0.12 : t1, inward > 0 ? t0 : t1 + 0.12, u0, u1, A.sill - 0.05, A.sill, false); }
      } else B(M.plaster, u0, u1, 0, A.slab);
      // the upper floor: solid, with the tinted ribbon window outside — or, over the built second floor, a real
      // window band (plaster below and above, clear glass between, at the ground floor's own heights + the slab)
      if (upperWin && glazed) {
        B(M.plaster, u0, u1, A.slab + 0.4, 5.0, false); B(M.plaster, u0, u1, 6.7, A.H, false);
        glassPane(kind, (t0 + t1) / 2, u0, u1, 5.0, 6.7);
      } else B(M.plaster, u0, u1, A.slab + 0.4, A.H, false);
    }
    if (win && !upperWin) panel(upperGlass, glassFace, kind === 'c' ? (glassFace === 'w' ? t0 - 0.02 : t1 + 0.02) : (glassFace === 's' ? t0 - 0.02 : t1 + 0.02), win[0], win[1], 5.0, 6.7);
    return doors;
  }
  // a pane of clear glass with its frame and mullions every 1.5 m, centred in the wall
  function glassPane(kind, mid, u0, u1, y0, y1) {
    const g = kind === 'c' ? new THREE.PlaneGeometry(u1 - u0, y1 - y0) : new THREE.PlaneGeometry(u1 - u0, y1 - y0);
    if (kind === 'c') { g.rotateY(Math.PI / 2); g.translate(mid, (y0 + y1) / 2, -(u0 + u1) / 2); } else g.translate((u0 + u1) / 2, (y0 + y1) / 2, -mid);
    add(clear, g);
    const fr = (p0, p1, q0, q1) => (kind === 'c' ? box(M.mullion, p0, p1, mid - 0.07, mid + 0.07, q0, q1, false) : box(M.mullion, mid - 0.07, mid + 0.07, p0, p1, q0, q1, false));
    fr(u0, u1, y0, y0 + 0.05); fr(u0, u1, y1 - 0.05, y1);
    const n = Math.max(1, Math.round((u1 - u0) / 1.5));
    for (let k = 0; k <= n; k++) { const u = u0 + (u1 - u0) * k / n; fr(u - 0.03, u + 0.03, y0, y1); }
  }
  // apron side (two parts either side of the lobby), car-park side, the two ends. The second floor is built over
  // the south wing (a up to the lobby), so its walls — the apron side, the car-park side up to a 646, and the
  // south end — get real upper windows; the north wing's upper floor stays a tinted shell.
  exteriorWall('c', A.c0, A.c0 + A.wall, A.a0, A.lob0, [A.a0 + 1.5, A.lob0 - 1.5], 'w', true);
  exteriorWall('c', A.c0, A.c0 + A.wall, A.lob1, A.a1, [A.lob1 + 1.5, A.a1 - 1.5], 'w');
  const carDoors = [...exteriorWall('c', A.c1 - A.wall, A.c1, A.a0, A.lob0, [A.a0 + 1.5, A.lob0 - 1.5], 'e', true),
    ...exteriorWall('c', A.c1 - A.wall, A.c1, A.lob0, A.a1, [A.lob0 + 1.5, A.a1 - 1.5], 'e')];
  exteriorWall('a', A.a0, A.a0 + A.wall, A.c0, A.c1, [A.c0 + 2, A.c1 - 2], 's', true);
  exteriorWall('a', A.a1 - A.wall, A.a1, A.c0, A.c1, [A.c0 + 2, A.c1 - 2], 'n');
  // the lobby: returns closing the recess, the glass front (two storeys, mullions every 2 m, a transom), the airside doors
  box(M.plaster, A.lob0 - 0.4, A.lob0, A.c0 + A.wall, A.glassC, 0, A.H); box(M.plaster, A.lob1, A.lob1 + 0.4, A.c0 + A.wall, A.glassC, 0, A.H);
  const airside = (spec.doors || []).find(d => d.kind === 'sliding_auto' && d.wall === 'c' && near(d.at, A.glassC, 0.3));
  {
    const y1 = A.H - 0.4, dz = airside ? [airside.from, airside.to] : [0, 0];
    const spans = airside ? [[A.lob0, dz[0]], [dz[1], A.lob1]] : [[A.lob0, A.lob1]];
    for (const [u0, u1] of spans) if (u1 - u0 > 0.01) {
      const g = new THREE.PlaneGeometry(u1 - u0, y1); g.rotateY(Math.PI / 2); g.translate(A.glassC, y1 / 2, -(u0 + u1) / 2); add(clear, g);
      if (world) world.add({ x0: A.glassC - 0.06, x1: A.glassC + 0.06, y0: 0, y1, z0: -u1, z1: -u0, tag: 'glass' });
    }
    if (airside) { const g = new THREE.PlaneGeometry(dz[1] - dz[0], y1 - 2.45); g.rotateY(Math.PI / 2); g.translate(A.glassC, (y1 + 2.45) / 2, -(dz[0] + dz[1]) / 2); add(clear, g); }
    for (let a = A.lob0; a <= A.lob1 + 0.01; a += 2) if (!airside || a < dz[0] - 0.05 || a > dz[1] + 0.05) box(M.mullion, a - 0.05, a + 0.05, A.glassC - 0.08, A.glassC + 0.08, 0, y1, false);
    box(M.mullion, A.lob0, A.lob1, A.glassC - 0.08, A.glassC + 0.08, 3.9, 4.1, false);
    box(M.plaster, A.lob0, A.lob1, A.glassC, A.c1 - A.wall, A.H - 0.4, A.H, false);         // the lobby's roof slab
  }
  // the floor slab between the storeys, except over the lobby — and except over the stairwell (a 637–646,
  // c 263.6–277.6), where the flight rises through it (Phase 3); the exterior band; the parapet; the roof
  box(M.trim, A.a0 + A.wall, A.lob0, A.c0 + A.wall, 263.6, A.slab, A.slab + 0.4, false);
  box(M.trim, A.a0 + A.wall, 637.0, 263.6, A.c1 - A.wall, A.slab, A.slab + 0.4, false);
  box(M.trim, A.lob1, A.a1 - A.wall, A.c0 + A.wall, A.c1 - A.wall, A.slab, A.slab + 0.4, false);
  box(M.trim, A.a0 - 0.1, A.a1 + 0.1, A.c0 - 0.1, A.c0, A.slab, A.slab + 0.4, false); box(M.trim, A.a0 - 0.1, A.a1 + 0.1, A.c1, A.c1 + 0.1, A.slab, A.slab + 0.4, false);
  box(M.trim, A.a0 - 0.1, A.a0, A.c0, A.c1, A.slab, A.slab + 0.4, false); box(M.trim, A.a1, A.a1 + 0.1, A.c0, A.c1, A.slab, A.slab + 0.4, false);
  // the parapet: a ring at the roof's edge (it was a solid slab over the whole roof until the roof became a
  // place to stand — Phase 3); its boxes are colliders, so the roof's edge holds the walker
  box(M.trim, A.a0 - 0.15, A.a1 + 0.15, A.c0 - 0.15, A.c0, A.H, A.H + 0.9, true);
  box(M.trim, A.a0 - 0.15, A.a1 + 0.15, A.c1, A.c1 + 0.15, A.H, A.H + 0.9, true);
  box(M.trim, A.a0 - 0.15, A.a0, A.c0, A.c1, A.H, A.H + 0.9, true);
  box(M.trim, A.a1, A.a1 + 0.15, A.c0, A.c1, A.H, A.H + 0.9, true);
  // the roof slab, with the stair bulkhead's opening cut out of it (a 640–646.2, c 268–270.4)
  box(M.roofFlat, A.a0, A.a1, A.c0, 268.0, A.H - 0.2, A.H + 0.05, false);
  box(M.roofFlat, A.a0, A.a1, 270.4, A.c1, A.H - 0.2, A.H + 0.05, false);
  box(M.roofFlat, A.a0, 640.0, 268.0, 270.4, A.H - 0.2, A.H + 0.05, false);
  box(M.roofFlat, 646.2, A.a1, 268.0, 270.4, A.H - 0.2, A.H + 0.05, false);
  // the entrance canopy over the walkway and its columns; rooftop plant; the stair house
  box(M.white, A.lob0 - 3, A.lob1 + 3, A.c0 - 4.5, A.glassC, 3.3, 3.6, false);
  for (const a of [A.lob0 - 2.5, A.lob1 + 2.5]) box(M.steel, a - 0.12, a + 0.12, A.c0 - 4.2, A.c0 - 3.96, 0, 3.3);
  for (let i = 0; i < 4; i++) box(M.steel, A.a0 + 12 + i * 9, A.a0 + 16 + i * 9, A.c0 + 9, A.c0 + 12, A.H + 0.05, A.H + 1.6, true);
  box(M.plaster, A.a1 - 14, A.a1 - 8, A.c1 - 9, A.c1 - 3, A.H, A.H + 3, false);
  // a small canopy over the car-park entrance
  for (const d of carDoors) box(M.white, d.from - 1.5, d.to + 1.5, A.c1, A.c1 + 2.6, 2.9, 3.1, false);
  // the name boards
  const sign = nameBoard();
  const sw = 22, sh = sw * sign.image.height / sign.image.width;
  const sm = new THREE.MeshStandardMaterial({ map: sign, roughness: 0.4, metalness: 0.2, emissive: 0xffffff, emissiveMap: sign, emissiveIntensity: 0 });
  const s1 = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), sm); s1.position.set(A.c0 - 0.17, A.H + 0.45, -(A.lob0 + A.lob1) / 2); s1.rotation.y = -Math.PI / 2;
  const s2 = s1.clone(); s2.position.x = A.c1 + 0.17; s2.rotation.y = Math.PI / 2;
  frame.add(s1, s2);

  // ---------------------------------------------------------------- the rooms
  const rooms = spec.rooms || [];
  // a point can be in two rooms at once now (a second-floor room over a ground-floor one): with no height given
  // the first (the ground floor's, listed first) answers, as before; with a height, the room whose floor the
  // height stands on
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
      // an upper floor's slab as a collider (its top is the floor): what the walker stands on up there
      if (fy > 0 && world) world.add({ x0: c0, x1: c1, y0: fy - 0.35, y1: fy, z0: -a1, z1: -a0, tag: 'floor' });
    }
    if (!r.open) flat(F.ceiling, r.a0, r.a1, r.c0, r.c1, r.ceiling, true);
  }
  // interior walls: every room edge that is not an exterior wall, merged per line AND per floor (a second-floor
  // wall stands on the slab, over the ground floor's wall on the same line); height = the taller ceiling beside it
  const lines = new Map();                      // key → { kind, at, base, spans: [[u0, u1, ceiling]] }
  const exterior = (kind, at, u0, u1) => (kind === 'c' ? near(at, IN.c0) || near(at, IN.c1) || (near(at, A.glassC) && u0 >= A.lob0 - 0.01 && u1 <= A.lob1 + 0.01) : near(at, IN.a0) || near(at, IN.a1));
  const addEdge = (kind, at, u0, u1, h, base) => {
    if (exterior(kind, at, u0, u1)) return;
    const key = kind + ':' + at.toFixed(2) + ':' + base.toFixed(2);
    if (!lines.has(key)) lines.set(key, { kind, at, base, spans: [] });
    lines.get(key).spans.push([u0, u1, h]);
  };
  for (const r of rooms) {
    const base = r.floorY || 0;
    addEdge('a', r.a0, r.c0, r.c1, r.ceiling, base); addEdge('a', r.a1, r.c0, r.c1, r.ceiling, base);
    addEdge('c', r.c0, r.a0, r.a1, r.ceiling, base); addEdge('c', r.c1, r.a0, r.a1, r.ceiling, base);
  }
  const T = 0.12;
  for (const ln of lines.values()) {
    const xs = [...new Set(ln.spans.flatMap(s => [s[0], s[1]]))].sort((p, q) => p - q);
    // the doors on this line, on this floor (a door's y is its floor; graph edges build nothing)
    const doorsHere = (spec.doors || []).filter(d => d.wall === ln.kind && near(d.at, ln.at) && !d.graph && Math.abs((d.y || 0) - ln.base) < 0.5);
    for (const d of doorsHere) { xs.push(d.from, d.to); }
    xs.sort((p, q) => p - q);
    // a wall under a floor built above it stops at that floor's slab (the upper wall stands on its own line)
    const capAt = (mid) => {
      let cap = Infinity;
      for (const o of lines.values()) {
        if (o === ln || o.kind !== ln.kind || !near(o.at, ln.at) || o.base <= ln.base) continue;
        if (o.spans.some(s => mid > s[0] && mid < s[1])) cap = Math.min(cap, o.base);
      }
      return cap;
    };
    for (let i = 0; i < xs.length - 1; i++) {
      const u0 = xs[i], u1 = xs[i + 1]; if (u1 - u0 < 1e-3) continue;
      const mid = (u0 + u1) / 2;
      const hs = ln.spans.filter(s => mid > s[0] && mid < s[1]).map(s => s[2]); if (!hs.length) continue;
      // beside the double-height lobby the ground floor's wall goes up to the roof; elsewhere just above the
      // suspended ceiling — and never through the floor above
      let h = ln.base === 0 && Math.max(...hs) > 4 ? A.H - 0.2 : Math.max(...hs) + 0.02;
      h = Math.min(h, capAt(mid));
      if (h <= ln.base + 0.1) continue;
      const door = doorsHere.find(d => mid > d.from && mid < d.to);
      const mat = M.inner;
      const W = (y0, y1, collide) => (ln.kind === 'a' ? box(mat, ln.at - T / 2, ln.at + T / 2, u0, u1, y0, y1, collide) : box(mat, u0, u1, ln.at - T / 2, ln.at + T / 2, y0, y1, collide));
      if (door) { W(ln.base + (door.kind === 'opening' ? Math.min(2.8, h - ln.base) : A.doorH), h, false); continue; }
      W(ln.base, h, true);
      // skirting boards on both faces
      for (const s of [-1, 1]) {
        if (ln.kind === 'a') box(M.skirting, ln.at + s * (T / 2) - (s < 0 ? 0.012 : 0), ln.at + s * (T / 2) + (s > 0 ? 0.012 : 0), u0, u1, ln.base + 0.02, ln.base + 0.11, false);
        else box(M.skirting, u0, u1, ln.at + s * (T / 2) - (s < 0 ? 0.012 : 0), ln.at + s * (T / 2) + (s > 0 ? 0.012 : 0), ln.base + 0.02, ln.base + 0.11, false);
      }
    }
  }

  // ---------------------------------------------------------------- the stairs and the roof (Phase 3)
  // Flight 1 rises in the stairwell's west lane (c 264–266.4) from a 645.4 to the landing at a 640.2 (its top
  // tread is the second floor, 4.22); flight 2 climbs from the landing in the c 268–270.4 lane to the roof
  // (8.27), through the slab's and the roof's openings, into the bulkhead whose door (d-roof) opens to the roof.
  {
    const F2 = 4.22, RF = 8.27;
    const n1 = 20, run1 = (645.4 - 640.2) / n1;
    for (let i = 0; i < n1; i++) { const top = F2 * (i + 1) / n1; box(M.trim, 645.4 - run1 * (i + 1), 645.4 - run1 * i, 264.0, 266.4, 0, top); }
    const n2 = 18, run2 = (645.42 - 640.2) / n2;
    for (let i = 0; i < n2; i++) { const top = F2 + (RF - F2) * (i + 1) / n2; box(M.trim, 640.2 + run2 * i, 640.2 + run2 * (i + 1), 268.0, 270.4, top - 0.28, top); }
    const sg = new THREE.BoxGeometry(2.4, 0.14, Math.hypot(5.22, RF - F2) + 0.3);
    sg.rotateX(Math.atan2(RF - F2, 5.22)); sg.translate(269.2, (F2 + RF) / 2 - 0.34, -(640.2 + 645.42) / 2); add(M.steel, sg);
    // the landing's railing along the well's edge, except where the two flights arrive and leave
    box(M.steel, 640.05, 640.35, 266.4, 268.0, F2, F2 + 0.9);
    box(M.steel, 640.05, 640.35, 270.4, 277.6, F2, F2 + 0.9);
    // the bulkhead: the c 270.4 wall, the a 646 end wall, and the c 268 wall with the door's opening in it
    // (a 645.0–646.0, the door's own span from the spec), a lintel over the door, and its little roof
    box(M.plaster, 640.0, 646.2, 270.4, 270.65, RF, 10.6);
    box(M.plaster, 646.0, 646.25, 268.0, 270.4, 7.3, 10.6);
    box(M.plaster, 640.0, 645.0, 267.75, 268.0, RF, 10.6);
    box(M.plaster, 645.0, 646.0, 267.75, 268.0, RF + A.doorH, 10.6);
    box(M.plaster, 646.0, 646.25, 267.75, 268.0, RF, 10.6);
    box(M.roofFlat, 639.8, 646.4, 267.6, 270.8, 10.6, 10.8, false);
  }

  // ---------------------------------------------------------------- doors
  const doors = createDoors({ frame, world, audio });
  for (const d of spec.doors || []) {
    if (d.kind === 'opening') continue;                                  // an open passage: only the wall is cut
    if (d.kind === 'sliding_auto' && near(d.at, A.glassC, 0.3)) { doors.add({ ...d, at: A.glassC }, { wallT: 0.16, slideOffset: 0.14 }); continue; }
    if ((d.rooms || []).includes('outside')) {
      const mid = d.wall === 'c' ? (near(d.at, IN.c1, 0.5) || near(d.at, A.c1, 0.5) ? A.c1 - A.wall / 2 : A.c0 + A.wall / 2) : (near(d.at, IN.a1, 0.5) || near(d.at, A.a1, 0.5) ? A.a1 - A.wall / 2 : A.a0 + A.wall / 2);
      const inside = d.wall === 'c' ? (mid > (A.c0 + A.c1) / 2 ? -1 : 1) : (mid > (A.a0 + A.a1) / 2 ? 1 : -1);   // towards the rooms, in door-local z
      doors.add({ ...d, at: mid }, { wallT: A.wall, slideOffset: d.kind === 'sliding_auto' ? inside * (A.wall / 2 + 0.08) : 0 });
      continue;
    }
    doors.add(d, { wallT: T });
  }

  // ---------------------------------------------------------------- furniture, boards, ceiling lights
  const inter = spec.interactables || [];
  const nearestText = (a, c, r = 1.6) => { let best = null, bd = r; for (const it of inter) { const d = Math.hypot(it.a - a, it.c - c); if (d < bd) { bd = d; best = it; } } return best; };
  const lights = [], surfaces = new Map();                        // 'room:whiteboard' | 'room:wall_screen' → its face
  for (const r of rooms) {
    for (const f of r.furniture || []) {
      const it = nearestText(f.a, f.c), opts = {};
      if (f.type === 'whiteboard') opts.draw = drawWhiteboard(it ? it.title_ja : '本日のブリーフィング', it ? it.text_ja : '');
      else if (f.type === 'flight_status_board') opts.draw = drawStatusBoard(it ? it.title_ja : '本日のフライト', it ? it.text_ja : '');
      else if (f.type === 'wall_screen') opts.draw = drawScreen(it ? it.title_ja : NAMES.academy.ja, it ? it.text_ja : '', { mono: !!(it && /METAR|TAF/.test(it.text_ja)) });
      else if (f.type === 'bulletin_board') opts.draw = drawBulletin(it ? it.title_ja : 'お知らせ', it ? it.text_ja : '');
      else if (f.type === 'map_wall') { opts.draw = drawAreaMap(FL, L); opts.key = 'area-map'; }      // one texture for every copy
      else if (f.type === 'sign_board' && it) opts.text = { title: it.title_ja, lines: [] };
      if (f.y != null) opts.y = f.y;
      if (f.note) opts.note = f.note;
      const piece = kit.place(f.type, { a: f.a, c: f.c, rot: f.rot || 0, y: (r.floorY || 0) + (f.yOff || 0), opts });
      // the boards and screens can be drawn on again later (the instructor shows a figure)
      if ((f.type === 'whiteboard' || f.type === 'wall_screen') && piece.faces[0]) {
        const mat = piece.faces[0][0], key = r.id + ':' + f.type;
        if (!surfaces.has(key)) surfaces.set(key, { mat, a: f.a, c: f.c, rot: f.rot || 0, y: f.type === 'whiteboard' ? 1.45 : 1.6, draw: opts.draw || null });
      }
    }
    for (const l of r.lights || []) { kit.place('ceiling_light', { a: l.a, c: l.c, rot: 0, y: r.ceiling - 0.005 }); lights.push({ x: l.c, y: r.ceiling - 0.15, z: -l.a, room: r.id }); }
  }
  // exit signs over the doors to the outside
  for (const d of outsideDoors) {
    const u = (d.from + d.to) / 2;
    if (d.wall === 'c') kit.place('exit_sign', { a: u, c: near(d.at, A.glassC, 0.3) ? A.glassC + 0.3 : IN.c1 - 0.02, rot: near(d.at, A.glassC, 0.3) ? 180 : 0, opts: { y: 2.55 } });
  }
  const built = kit.build({ zoneOf: (a, c) => (roomOf(a, c) || { id: 'shell' }).id });
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
    const m = new THREE.Mesh(geo, mat); m.castShadow = mat !== clear; m.receiveShadow = true; m.name = 'academy-part';
    if (mat === clear) { m.userData.noAO = true; m.renderOrder = 2; }
    frame.add(m);
  }

  // ---------------------------------------------------------------- the things to examine
  const targets = inter.map(it => ({
    id: 'ex:' + it.id, frame: [it.c, it.y, -it.a], radius: 0.55, prompt: it.prompt_ja, title: it.title_ja, text: it.text_ja, room: it.room,
  }));

  // the interior's materials see an indoor reflection, not the sky (set by main once the indoor environment exists)
  const interiorMaterials = new Set();
  frame.traverse(o => { if (o.isMesh && o.material && o.material !== clear && o.material !== sm && o.material !== upperGlass) interiorMaterials.add(o.material); });

  return {
    group: frame, doors, rooms, lights, targets, roomOf, interiorMaterials, anchors: built.anchors,
    // draw on a room's whiteboard or wall screen again: draw(g, w, h) on its canvas, or null for what it showed first;
    // returns the surface's centre in the frame (x, y, z) or null when the room has none
    redraw(roomId, type, draw) {
      const s = surfaces.get(roomId + ':' + type); if (!s) return null;
      const tex = s.mat.map, cv = tex.image, g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      (draw || s.draw || ((gg, w, h) => { gg.fillStyle = '#0b1422'; gg.fillRect(0, 0, w, h); }))(g, cv.width, cv.height);
      tex.needsUpdate = true;
      return { x: s.c, y: s.y, z: -s.a };
    },
    surfaceAt(roomId, type) { const s = surfaces.get(roomId + ':' + type); return s ? { x: s.c, y: s.y, z: -s.a } : null; },
    // (what a board or a screen shows: its canvas, to be read — the tests check what the class put on the screen)
    surfaceCanvas(roomId, type) { const s = surfaces.get(roomId + ':' + type); return s && s.mat.map ? s.mat.map.image : null; },
    // the floor under a point (for footsteps), null outside
    floorAt(a, c) { const r = roomOf(a, c); return r ? r.floor : null; },
    // on the ground floor's rooms (the window strip included), but not in the recess in front of the lobby's glass
    inside(a, c) { return a > A.a0 && a < A.a1 && c > IN.c0 && c < A.c1 && (c > A.glassC || a < A.lob0 - 0.4 || a > A.lob1 + 0.4); },
    setNight(k) { sm.emissiveIntensity = 0.6 * k; upperGlass.emissiveIntensity = 0.5 * k; },
    update(dt, playerFrame) {
      doors.update(dt, playerFrame);
      // furniture casts the sun's shadows only in and next to the room the player is in (the shadow pass stays small)
      const a = -playerFrame.z, c = playerFrame.x;
      for (const m of propMeshes) {
        const r = rooms.find(q => q.id === m.userData.zone);
        const d = r ? Math.hypot(Math.max(r.a0 - a, 0, a - r.a1), Math.max(r.c0 - c, 0, c - r.c1)) : 0;
        m.castShadow = m.userData.shadow && d < 6;
      }
    },
  };
}

// the academy's name board (fictional): English and Japanese, each fitted to its share of the board
function nameBoard() {
  return canvasTexture(2048, 230, (g, W, H) => {
    g.fillStyle = '#16324f'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f2b632'; g.fillRect(0, H - 14, W, 14);
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle';
    const fit = (text, font, px, maxW) => { g.font = font.replace('PX', px); const w = g.measureText(text).width; if (w > maxW) g.font = font.replace('PX', Math.floor(px * maxW / w)); };
    fit(NAMES.academy.en, '700 PXpx "Arial", "Helvetica Neue", sans-serif', 96, W * 0.56);
    g.textAlign = 'left'; g.fillText(NAMES.academy.en, 60, H * 0.44);
    fit(NAMES.academy.ja, '500 PXpx "Hiragino Sans", "Yu Gothic UI", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", "Noto Sans JP", sans-serif', 60, W * 0.33);
    g.textAlign = 'right'; g.fillText(NAMES.academy.ja, W - 60, H * 0.46);
  });
}
