// CADET — world/doors.js : the academy's doors, in the runway frame (x = across, z = −along, y up from the floor).
//  swing / double_swing : opened and closed with E; they swing away from the player
//  sliding_auto         : glass leaves that slide apart when someone comes near (the airside exit, the main entrance)
//  locked               : stays shut (a rattle and a message)
// A door from the spec: { id, kind, wall: 'a' | 'c', at, from, to, label_ja }. Its collider is the closed leaf; an open
// swing door blocks where its leaf stands (open at 90° it is axis-aligned); a moving leaf does not block.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture } from '../render/textures.js';

const H = 2.15, T = 0.045;                       // opening height, leaf thickness
let MAT = null;
function materials() {
  if (MAT) return MAT;
  const wood = canvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = '#c9a77c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const x = (i * 37) % w, a = 0.05 + (i % 7) * 0.012; g.fillStyle = `rgba(${90 + (i % 5) * 8},${60 + (i % 3) * 6},30,${a})`; g.fillRect(x, 0, 1 + (i % 3), h); }
    for (let i = 0; i < 18; i++) { g.strokeStyle = 'rgba(120,80,40,0.10)'; g.beginPath(); g.moveTo((i * 53) % w, 0); g.bezierCurveTo((i * 31) % w, h * 0.3, (i * 71) % w, h * 0.7, (i * 23) % w, h); g.stroke(); }
  });
  MAT = {
    leaf: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55, metalness: 0 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.45, metalness: 0.6 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.25, metalness: 0.95 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xbfd6e2, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.18, depthWrite: false, envMapIntensity: 1.3 }),
    plate: null,
  };
  return MAT;
}
function plaque(text) {
  const t = canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = '#16324f'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2b632'; g.fillRect(0, h - 8, w, 8);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let px = 54; g.font = `600 ${px}px "Hiragino Sans", "Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", sans-serif`;
    while (g.measureText(text).width > w - 40 && px > 20) { px -= 2; g.font = `600 ${px}px "Hiragino Sans", "Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", sans-serif`; }
    g.fillText(text, w / 2, h * 0.47);
  });
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0.1 });
}

export function createDoors({ frame, world, audio = null, wallT = 0.12 }) {
  const group = new THREE.Group(); group.name = 'doors'; frame.add(group);
  const M = materials();
  const doors = [];
  // door-local (lx along the opening from its start, lz normal) → frame
  const toFrame = (d, lx, ly, lz) => (d.wall === 'a' ? [d.from + lx, ly, -d.at + lz] : [d.at + lz, ly, -d.from - lx]);
  const aabb = (d, pts) => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [lx, lz] of pts) { const [x, , z] = toFrame(d, lx, 0, lz); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    return { x0, x1, y0: 0, y1: H, z0, z1, tag: 'door:' + d.id };
  };

  function add(spec, opts = {}) {
    // slideOffset: sliding leaves run on the inside face (in front of the fixed glass or wall beside the opening)
    const d = { ...spec, W: spec.to - spec.from, angle: 0, target: 0, open: 0, openTarget: 0, colliders: [], leaves: [], wallT: opts.wallT ?? wallT, slideOffset: opts.slideOffset ?? 0 };
    const g = new THREE.Group(); g.name = 'door-' + d.id;
    if (d.wall === 'a') g.position.set(d.from, 0, -d.at); else { g.position.set(d.at, 0, -d.from); g.rotation.y = Math.PI / 2; }
    group.add(g); d.group = g;
    const W = d.W, wt = d.wallT;
    // small parts are merged per material into one mesh per group (a door is a few draw calls, not a dozen)
    const at = (geo, x, y, z, rx = 0) => { const q = geo.index ? geo.toNonIndexed() : geo; if (rx) q.rotateX(rx); q.translate(x, y, z); for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'uv'].includes(k)) q.deleteAttribute(k); return q; };
    const mesh = (parent, mat, geos, shadow = true) => { const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; };
    // the frame: two jambs and a head, as deep as the wall
    if (d.kind !== 'sliding_auto') {
      mesh(g, M.frame, [at(new THREE.BoxGeometry(0.07, H + 0.07, wt + 0.03), -0.035, (H + 0.07) / 2, 0), at(new THREE.BoxGeometry(0.07, H + 0.07, wt + 0.03), W + 0.035, (H + 0.07) / 2, 0),
        at(new THREE.BoxGeometry(W + 0.14, 0.07, wt + 0.03), W / 2, H + 0.035, 0)]);
    } else {
      mesh(g, M.frame, [at(new THREE.BoxGeometry(W * 2 + 0.3, 0.22, 0.2), W / 2, H + 0.11, d.slideOffset)]);
    }
    const leaf = (w, hingeX, flip) => {
      // a leaf hinged at hingeX; its body extends towards +x (flip = -1: towards −x)
      const pivot = new THREE.Group(); pivot.position.set(hingeX, 0, d.kind === 'sliding_auto' ? d.slideOffset : 0); g.add(pivot);
      const body = mesh(pivot, d.kind === 'sliding_auto' ? M.glass : M.leaf, [at(new RoundedBoxGeometry(w - 0.02, H - 0.02, T, 1, 0.008), flip * (w / 2), H / 2, 0)], d.kind !== 'sliding_auto');
      if (d.kind !== 'sliding_auto') {
        const hw = [];
        for (const s of [-1, 1]) {
          hw.push(at(new THREE.BoxGeometry(0.13, 0.022, 0.022), flip * (w - 0.12), 1.02, s * (T / 2 + 0.035)));
          hw.push(at(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 16), flip * (w - 0.07), 1.02, s * (T / 2 + 0.006), Math.PI / 2));
          hw.push(at(new THREE.BoxGeometry(w - 0.1, 0.2, 0.003), flip * (w / 2), 0.12, s * (T / 2 + 0.002)));
        }
        mesh(pivot, M.metal, hw, false);
      } else {
        // aluminium frame around the glass leaf
        const fr = [];
        for (const y of [0.04, H - 0.04]) fr.push(at(new THREE.BoxGeometry(w, 0.08, 0.06), flip * w / 2, y, 0));
        for (const x of [0.03, w - 0.03]) fr.push(at(new THREE.BoxGeometry(0.06, H, 0.06), flip * x, H / 2, 0));
        mesh(pivot, M.frame, fr);
        body.userData.noAO = true;
      }
      d.leaves.push({ pivot, w, flip, base: hingeX });
      return pivot;
    };
    if (d.kind === 'double_swing') { leaf(W / 2, 0, 1); leaf(W / 2, W, -1); }
    else if (d.kind === 'sliding_auto') { leaf(W / 2 + 0.03, 0, 1); leaf(W / 2 + 0.03, W, -1); }
    else leaf(W, 0, 1);
    // name plates beside the door, on both faces
    if (spec.label_ja && d.kind !== 'sliding_auto') {
      const pm = plaque(spec.label_ja), faces = [];
      for (const s of [-1, 1]) { const q = new THREE.PlaneGeometry(0.42, 0.105); if (s < 0) q.rotateY(Math.PI); faces.push(at(q, W + 0.32, 1.55, s * (wt / 2 + 0.006))); }
      mesh(g, pm, faces, false);
    }
    // collider: the closed opening
    d.colliders.push(world.add(aabb(d, [[0, d.slideOffset - T], [W, d.slideOffset + T]])));
    doors.push(d);
    return d;
  }

  function placeLeaves(d) {
    if (d.kind === 'sliding_auto') {
      for (const L of d.leaves) L.pivot.position.x = L.base - L.flip * d.open * (L.w - 0.12);
      world.setEnabled(d.colliders[0], d.open < 0.65);
      return;
    }
    for (const L of d.leaves) L.pivot.rotation.y = d.angle * L.flip;
    const moving = Math.abs(d.angle - d.target) > 0.02;
    const c = d.colliders[0];
    if (Math.abs(d.angle) < 0.02 && !moving) { world.update(c, aabb(d, [[0, -T], [d.W, T]])); world.setEnabled(c, true); }
    else if (!moving && Math.abs(d.angle) > 1.45) {
      // open: the leaves stand out from the wall on one side
      const side = -Math.sign(d.angle), L0 = d.leaves[0];
      const pts = d.kind === 'double_swing' ? [[-0.05, 0], [0.05, side * L0.w]] : [[-0.05, 0], [0.05, side * d.W]];
      world.update(c, aabb(d, pts)); world.setEnabled(c, true);
      if (d.kind === 'double_swing') {
        if (!d.colliders[1]) d.colliders[1] = world.add(aabb(d, [[d.W - 0.05, 0], [d.W + 0.05, side * L0.w]]));
        else world.update(d.colliders[1], aabb(d, [[d.W - 0.05, 0], [d.W + 0.05, side * L0.w]]));
        world.setEnabled(d.colliders[1], true);
      }
    } else { world.setEnabled(c, false); if (d.colliders[1]) world.setEnabled(d.colliders[1], false); }
  }

  // the player's position in the door's own coordinates
  const localOf = (d, p) => {
    const dx = p.x - (d.wall === 'a' ? d.from : d.at), dz = p.z - (d.wall === 'a' ? -d.at : -d.from);
    return d.wall === 'a' ? { lx: dx, lz: dz } : { lx: -dz, lz: dx };
  };
  function toggle(d, player) {
    if (d.kind === 'locked') { audio?.door('locked'); return 'locked'; }
    if (d.kind === 'sliding_auto') return 'auto';
    if (Math.abs(d.target) > 0.01) { d.target = 0; audio?.door('swing_close'); return 'closed'; }
    const { lz } = player ? localOf(d, player) : { lz: 1 };
    d.target = (lz >= 0 ? 1 : -1) * 1.6;              // about 92°, away from the player
    audio?.door('swing_open');
    return 'opened';
  }

  function update(dt, player) {
    for (const d of doors) {
      if (d.kind === 'sliding_auto') {
        const { lx, lz } = player ? localOf(d, player) : { lx: 1e9, lz: 1e9 };
        const near = Math.abs(lz) < 3.2 && lx > -1.6 && lx < d.W + 1.6;
        const want = near || d.hold ? 1 : 0;
        if (want !== d.openTarget) { d.openTarget = want; audio?.door(want ? 'slide_open' : 'slide_close'); }
        const sp = dt / 0.9; d.open = d.open < d.openTarget ? Math.min(d.openTarget, d.open + sp) : Math.max(d.openTarget, d.open - sp);
        placeLeaves(d);
        continue;
      }
      if (d.angle !== d.target) {
        const sp = dt * 2.6;
        d.angle = d.angle < d.target ? Math.min(d.target, d.angle + sp) : Math.max(d.target, d.angle - sp);
        placeLeaves(d);
      }
    }
  }

  // interaction targets: a sphere at each door's handle height, on its centre line
  function targets() {
    return doors.filter(d => d.kind !== 'sliding_auto').map(d => {
      const [x, y, z] = toFrame(d, d.W / 2, 1.1, 0);
      return {
        id: 'door:' + d.id, frame: [x, y, z], radius: Math.max(0.55, d.W / 2), door: d,
        prompt: () => (d.kind === 'locked' ? '扉を開ける' : Math.abs(d.target) > 0.01 ? '扉を閉める' : '扉を開ける'),
      };
    });
  }

  return {
    group, doors, add, toggle, update, targets, localOf,
    find: (id) => doors.find(d => d.id === id),
    // open every swing door at once (tests, the visit camera)
    openAll() { for (const d of doors) if (d.kind === 'swing' || d.kind === 'double_swing') { d.target = 1.6; d.angle = 1.6; placeLeaves(d); } },
  };
}
