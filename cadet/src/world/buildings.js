// CADET — world/buildings.js : the academy's side of the field (east of the apron, in the runway frame):
// two hangars (one open), the academy building (two floors, the lobby facing the apron), the tower, the fuel farm
// and the apron flood lights. Shells only in M0; the academy's inside (briefing rooms, dispatch) comes with walking (M1).
// All fictional. The names are in layout.NAMES.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tex, canvasTexture, corrugatedNormal, windowTexture, windowMask } from '../render/textures.js';
import { metricMaterial, glassMaterial } from '../render/materials.js';
import { NAMES } from './layout.js';

export function buildBuildings(L) {
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
  const box = (mat, a0, a1, c0, c1, y0, y1) => { const g = new THREE.BoxGeometry(c1 - c0, y1 - y0, a1 - a0); g.translate((c0 + c1) / 2, (y0 + y1) / 2, -(a0 + a1) / 2); add(mat, g); return g; };
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
  hangar(470, 520, 241, 282, 10, false, M.metalWall);
  hangar(536, 590, 241, 282, 10.5, true, M.metalWallB);

  // ---------------------------------------------------------------- the academy building
  {
    const a0 = 608, a1 = 702, c0 = 248, c1 = 278, H = 8.2;
    const lob0 = 646, lob1 = 664;                                                     // the lobby (two floors of glass)
    // walls with window bands (both floors), the lobby glass on the apron side
    box(M.plaster, a0, lob0, c0, c0 + 0.4, 0, H); box(M.plaster, lob1, a1, c0, c0 + 0.4, 0, H);
    box(M.plaster, a0, a1, c1 - 0.4, c1, 0, H);
    box(M.plaster, a0, a0 + 0.4, c0, c1, 0, H); box(M.plaster, a1 - 0.4, a1, c0, c1, 0, H);
    for (const [y0, y1] of [[1.0, 2.7], [5.0, 6.7]]) {
      panel(glass, 'w', c0 - 0.02, a0 + 1.5, lob0 - 1.5, y0, y1);
      panel(glass, 'w', c0 - 0.02, lob1 + 1.5, a1 - 1.5, y0, y1);
      panel(glass, 'e', c1 + 0.02, a0 + 1.5, a1 - 1.5, y0, y1);
      panel(glass, 's', a0 - 0.02, c0 + 2, c1 - 2, y0, y1);
      panel(glass, 'n', a1 + 0.02, c0 + 2, c1 - 2, y0, y1);
      // sills
      box(M.trim, a0 + 1.4, lob0 - 1.4, c0 - 0.12, c0, y0 - 0.12, y0); box(M.trim, lob1 + 1.4, a1 - 1.4, c0 - 0.12, c0, y0 - 0.12, y0);
      box(M.trim, a0 + 1.4, a1 - 1.4, c1, c1 + 0.12, y0 - 0.12, y0);
    }
    // the lobby: glass from the floor to the roof, set back, with mullions
    panel(lobbyGlass, 'w', c0 + 1.0, lob0, lob1, 0, H - 0.4, 2);
    for (let a = lob0; a <= lob1 + 0.01; a += 2) box(M.steel, a - 0.06, a + 0.06, c0 + 0.85, c0 + 1.0, 0, H - 0.4);
    box(M.steel, lob0, lob1, c0 + 0.85, c0 + 1.0, 3.9, 4.1);
    box(M.plaster, lob0, lob1, c0 + 1.0, c1 - 0.4, H - 0.4, H);                         // lobby roof slab
    // the floor slab band between the floors and the parapet
    box(M.trim, a0 - 0.1, a1 + 0.1, c0 - 0.1, c1 + 0.1, 3.8, 4.2);
    box(M.trim, a0 - 0.15, a1 + 0.15, c0 - 0.15, c1 + 0.15, H, H + 0.9);
    box(M.roofFlat, a0, a1, c0, c1, H - 0.2, H + 0.05);
    // the entrance canopy and its columns
    box(M.white, lob0 - 3, lob1 + 3, c0 - 4.5, c0 + 1.0, 3.3, 3.6);
    for (const a of [lob0 - 2.5, lob1 + 2.5]) box(M.steel, a - 0.12, a + 0.12, c0 - 4.2, c0 - 3.96, 0, 3.3);
    // rooftop: plant units, a stair house, railings
    for (let i = 0; i < 4; i++) box(M.steel, a0 + 12 + i * 9, a0 + 16 + i * 9, c0 + 9, c0 + 12, H + 0.05, H + 1.6);
    box(M.plaster, a1 - 14, a1 - 8, c1 - 9, c1 - 3, H, H + 3);
    // the name boards: apron side above the canopy, car-park side
    const sign = nameBoard();
    const sw = 22, sh = sw * sign.image.height / sign.image.width;
    const sm = new THREE.MeshStandardMaterial({ map: sign, roughness: 0.4, metalness: 0.2, emissive: 0xffffff, emissiveMap: sign, emissiveIntensity: 0 });
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), sm); s1.position.set(c0 - 0.17, H + 0.45, -(lob0 + lob1) / 2); s1.rotation.y = -Math.PI / 2;
    const s2 = s1.clone(); s2.position.x = c1 + 0.17; s2.rotation.y = Math.PI / 2;
    frame.add(s1, s2);
    frame.userData.signMaterial = sm;
  }

  // ---------------------------------------------------------------- the tower (fictional, decorative)
  {
    const a = 721, c = 262;
    box(M.plaster, a - 9, a + 9, c - 9, c + 9, 0, 3.6);
    panel(glass, 'w', c - 9.02, a - 7.5, a + 7.5, 1.0, 2.7);
    box(M.trim, a - 9.2, a + 9.2, c - 9.2, c + 9.2, 3.6, 4.0);
    box(M.plaster, a - 2.4, a + 2.4, c - 2.4, c + 2.4, 3.6, 17);
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
    group: frame,
    setNight(k) { glass.emissiveIntensity = 0.9 * k; lobbyGlass.emissiveIntensity = 0; if (frame.userData.signMaterial) frame.userData.signMaterial.emissiveIntensity = 0.6 * k; },
  };
}

// the academy's name board (fictional): English and Japanese, each fitted to its share of the board
function nameBoard() {
  return canvasTexture(2048, 230, (g, W, H) => {
    g.fillStyle = '#16324f'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f2b632'; g.fillRect(0, H - 14, W, 14);
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle';
    const fit = (text, font, px, maxW) => { g.font = `${font.replace('PX', px)}`; const w = g.measureText(text).width; if (w > maxW) g.font = font.replace('PX', Math.floor(px * maxW / w)); };
    fit(NAMES.academy.en, '700 PXpx "Arial", "Helvetica Neue", sans-serif', 96, W * 0.56);
    g.textAlign = 'left'; g.fillText(NAMES.academy.en, 60, H * 0.44);
    fit(NAMES.academy.ja, '500 PXpx "Hiragino Sans", "Yu Gothic UI", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", "Noto Sans JP", sans-serif', 60, W * 0.33);
    g.textAlign = 'right'; g.fillText(NAMES.academy.ja, W - 60, H * 0.46);
  });
}
