// CADET — render/indoor.js : light inside buildings.
// The sky's image-based light reaches every surface the same way, roofs or not; inside the academy that would light the
// rooms as if they were outdoors. So every lit material's indirect light (the sky's diffuse and reflections, the
// ambient) is scaled by where the surface is: 1 outdoors, about 0.5 next to the ribbon windows, 0.15–0.2 deep inside,
// in between in the double-height glass lobby and the open hangar. Direct sunlight still comes in through the windows
// (the shadows decide). The ceiling lights near the player are a small pool of point lights; the eye adapts
// (exposure) when walking in and out.
import * as THREE from 'three';
import { HANGARS } from '../world/layout.js';

let installed = false;
// the open hangar is half-lit from its door; the shut one is dim
const HANGAR_K = (h) => (h.open ? [0.45, 0.2] : [0.12, 0.12]);
// a, c in the runway frame; the boxes are fixed at start-up (as constants in the shader: no new uniforms needed).
// The test is the same on the GPU (cdIndoorK) and the CPU (indoorAt), boundaries included.
export function installIndoorShading(L, A, hangars = HANGARS) {
  if (installed) return; installed = true;
  const cy = Math.cos(L.frameYaw).toFixed(8), sy = Math.sin(L.frameYaw).toFixed(8), G = L.G.toFixed(4);
  const f = (v) => Number(v).toFixed(3);
  // inside a hangar: within its walls' inner faces and under its roof (the gable's slope), so the walls, the door
  // header, the gables and the underside of the roof count as inside, and every outer face as outside
  const hangarGLSL = hangars.map(h => {
    const [k0, k1] = HANGAR_K(h), cm = (h.c0 + h.c1) / 2, half = (h.c1 - h.c0) / 2;
    return `if (a > ${f(h.a0 + 0.2)} && a < ${f(h.a1 - 0.2)} && c > ${f(h.c0 + 0.2)} && c < ${f(h.c1 - 0.2)} && y < ${f(h.h + 0.12)} + 0.14 * (${f(half)} - abs(c - ${f(cm)})))
        return mix(${f(k0)}, ${f(k1)}, smoothstep(${f(h.c0 + 1)}, ${f(h.c0 + 29)}, c));`;
  }).join('\n      ');
  const fn = /* glsl */`
    // 1 outdoors; less indirect light inside the academy and the hangars (CADET)
    float cdIndoorK(vec3 viewPos) {
      vec3 w = cameraPosition + transpose(mat3(viewMatrix)) * (-viewPos);
      float fx = w.x * ${cy} - w.z * ${sy}, fz = w.x * ${sy} + w.z * ${cy}, y = w.y - ${G};
      float a = -fz, c = fx;
      // the academy: the ground floor and the lobby (the recess in front of the lobby's glass is outdoors)
      if (a > ${f(A.a0 + 0.38)} && a < ${f(A.a1 - 0.38)} && c > ${f(A.c0 + 0.38)} && c < ${f(A.c1 - 0.38)} && y < ${f(A.H - 0.25)}) {
        if (c < ${f(A.glassC + 0.01)} && a > ${f(A.lob0 - 0.01)} && a < ${f(A.lob1 + 0.01)}) return 1.0;
        if (a > ${f(A.lob0)} && a < ${f(A.lob1)}) return 0.55 - 0.25 * smoothstep(${f(A.glassC + 2)}, ${f(A.c1)}, c);
        if (y > ${f(A.slab)}) return 0.05;
        float dw = min(c - ${f(A.c0 + A.wall)}, ${f(A.c1 - A.wall)} - c);
        float de = min(a - ${f(A.a0 + A.wall)}, ${f(A.a1 - A.wall)} - a);
        return 0.17 + 0.38 * exp(-min(dw, de) / 2.2);
      }
      ${hangarGLSL}
      return 1.0;
    }`;
  THREE.ShaderChunk.lights_pars_begin = THREE.ShaderChunk.lights_pars_begin + '\n' + fn;
  // after the sky's light has been added: scale what exists in this shader (Lambert and Phong have no specular IBL)
  THREE.ShaderChunk.lights_fragment_maps = THREE.ShaderChunk.lights_fragment_maps + /* glsl */`
    {
      float cdIn = cdIndoorK(vViewPosition);
      #if defined( RE_IndirectDiffuse )
        irradiance *= cdIn; iblIrradiance *= cdIn;
        // the scene's ambient light is the light the lit rooms bounce off their floors and walls (CADET sets it only
        // when the room lights are on): none outdoors, more the deeper inside (cdIn already scaled the ambient by cdIn)
        irradiance += ambientLightColor * (1.0 - 2.0 * cdIn);
        // the lower half of the image-based light is the sunlit ground outside (sky.js); a ceiling facing down inside
        // sees the room's floor instead, lit by the daylight that comes in: the light from above at this place (scaled
        // like the rest) times a floor's albedo
        #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV ) && ( defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG ) )
          if (cdIn < 1.0) {
            float cdDown = max(0.0, -transformNormalByInverseViewMatrix(geometryNormal, viewMatrix).y);
            iblIrradiance += cdDown * 0.6 * cdIn * getIBLIrradiance(-geometryNormal);
          }
        #endif
      #endif
      #if defined( RE_IndirectSpecular )
        radiance *= cdIn;
        #ifdef USE_CLEARCOAT
          clearcoatRadiance *= cdIn;
        #endif
      #endif
    }`;
}

// the same test on the CPU (for the player: the eye's adaptation, the ambience, the light pool), at eye height
export function indoorAt(A, a, c, y = 1.6, hangars = HANGARS) {
  if (a > A.a0 + 0.38 && a < A.a1 - 0.38 && c > A.c0 + 0.38 && c < A.c1 - 0.38 && y < A.H - 0.25) {
    if (c < A.glassC + 0.01 && a > A.lob0 - 0.01 && a < A.lob1 + 0.01) return 0;
    return a > A.lob0 && a < A.lob1 ? 0.55 : 0.85;
  }
  for (const h of hangars) {
    const half = (h.c1 - h.c0) / 2, cm = (h.c0 + h.c1) / 2;
    if (a > h.a0 + 0.2 && a < h.a1 - 0.2 && c > h.c0 + 0.2 && c < h.c1 - 0.2 && y < h.h + 0.12 + 0.14 * (half - Math.abs(c - cm))) return h.open ? 0.5 : 0.8;
  }
  return 0;
}

// The ceiling lights as real lights: a fixed pool of lights given to the room the player is in. Each room's
// fixtures are grouped into at most `count` clusters (a grid shaped like the room), each cluster one light at the
// fixtures' mean position with their summed strength, so walking inside a room never reassigns a light (no popping);
// going into another room fades the old room's lights out and the new room's in. Other rooms are lit by their glowing
// panels and the sky only, so no light leaks through a wall. Outdoors the lights are hidden, so the outdoor shaders do
// not pay for them (the programs for both states are compiled at start-up).
// the pool's spot lights (also used to judge how evenly a set of clusters lights a floor)
export const SPOT = { angle: 1.35, penumbra: 0.6, decay: 2, reach: 9 };
// light reaching a floor point from clusters [{ p, w }] (three's falloff for a spot light pointing straight down)
function floorLight(cl, x, y, z) {
  let e = 0;
  for (const { p, w } of cl) {
    const dx = x - p.x, dy = y - p.y, dz = z - p.z, d = Math.hypot(dx, dy, dz) || 1e-6, cut = SPOT.reach * Math.sqrt(w);
    const win = Math.pow(Math.max(0, 1 - (d / cut) ** 4), 2), cosT = Math.max(0, -dy / d), cone = Math.acos(Math.min(1, cosT));
    const inner = SPOT.angle * (1 - SPOT.penumbra), spot = cone >= SPOT.angle ? 0 : cone <= inner ? 1 : (SPOT.angle - cone) / (SPOT.angle - inner);
    e += w * win / (d * d) * cosT * spot;
  }
  return e;
}
export function roomClusters(fixtures, count = 5, floorY = null) {
  // fixtures: [{ a, c, p (world Vector3), w }] of one room → at most `count` clusters [{ p, w }]: the fixtures binned on
  // a grid shaped like the room, each bin one light at their mean position with their summed strength. With the floor's
  // height given, every grid shape and a few heights are tried and the most even light on the floor wins (a cluster
  // standing for fixtures spread over a long cell is raised, above the suspended ceiling if need be: these lights cast
  // no shadows and the ceiling's face looks down, away from them; its strength grows so the floor straight below stays
  // as bright).
  if (!fixtures.length) return [];
  const a0 = Math.min(...fixtures.map(f => f.a)), a1 = Math.max(...fixtures.map(f => f.a)), c0 = Math.min(...fixtures.map(f => f.c)), c1 = Math.max(...fixtures.map(f => f.c));
  const A = a1 - a0 + 1e-3, C = c1 - c0 + 1e-3;
  const make = (ka, kc, lift) => {
    const cells = new Map();
    for (const f of fixtures) {
      const i = Math.min(ka - 1, Math.floor((f.a - a0) / A * ka)), j = Math.min(kc - 1, Math.floor((f.c - c0) / C * kc)), key = i * 16 + j;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(f);
    }
    const span = Math.max(A / ka, C / kc);
    return [...cells.values()].map(g => {
      const p = g[0].p.clone().set(0, 0, 0); let w = 0;
      for (const f of g) { p.add(f.p); w += f.w; }
      p.multiplyScalar(1 / g.length);
      if (floorY != null && lift > 0) {
        const h = p.y - floorY, h2 = Math.min(Math.max(h, lift * span), h + 2.5);     // at most 2.5 m up: the reach stays short
        if (h > 0.5 && h2 > h) { p.y = floorY + h2; w *= (h2 / h) ** 2; }
      }
      return { p, w };
    });
  };
  // as many clusters as allowed (one fewer at most): a few big lights would reach far beyond the room
  const shapes = [], most = Math.min(count, fixtures.length);
  for (let ka = 1; ka <= count; ka++) for (let kc = 1; ka * kc <= count; kc++) if (ka * kc <= fixtures.length && ka * kc >= most - 1) shapes.push([ka, kc]);
  if (floorY == null) {
    // no floor to judge by: square cells, as many as allowed
    let best = shapes[0], bestE = Infinity;
    for (const [ka, kc] of shapes) { const e = Math.abs(Math.log((A / ka + 1) / (C / kc + 1))) - 0.35 * ka * kc; if (e < bestE) { bestE = e; best = [ka, kc]; } }
    return make(best[0], best[1], 0);
  }
  // judge on the fixtures' footprint (where people stand under the lights), the world's x/z from the fixtures' own axes
  const f0 = fixtures[0], samples = [];
  const toXZ = (a, c) => {
    // the fixtures carry both their (a, c) and their world position: solve the (rigid) map from two of them, or use a
    // frame where world x = c and z = −a when there is only one
    const f1 = fixtures.find(f => Math.hypot(f.a - f0.a, f.c - f0.c) > 0.5);
    if (!f1) return [f0.p.x + (c - f0.c), f0.p.z - (a - f0.a)];
    const da = f1.a - f0.a, dc = f1.c - f0.c, dx = f1.p.x - f0.p.x, dz = f1.p.z - f0.p.z, n2 = da * da + dc * dc;
    // world = R · (c, −a) with R a rotation: find it from the pair
    const u = [dc, -da], v = [dx, dz], cos = (u[0] * v[0] + u[1] * v[1]) / n2, sin = (u[0] * v[1] - u[1] * v[0]) / n2;
    const qa = a - f0.a, qc = c - f0.c;
    return [f0.p.x + cos * qc - sin * -qa, f0.p.z + sin * qc + cos * -qa];
  };
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) samples.push(toXZ(a0 + A * i / 6, c0 + C * j / 6));
  let best = null, bestR = Infinity;
  for (const [ka, kc] of shapes) for (const lift of [0, 0.7, 0.9]) {
    const cl = make(ka, kc, lift);
    if (cl.length < most - 1) continue;                                      // empty bins: fewer lights than asked
    let lo = Infinity, hi = 0;
    for (const [x, z] of samples) { const e = floorLight(cl, x, floorY, z); lo = Math.min(lo, e); hi = Math.max(hi, e); }
    const r = hi / Math.max(lo, 1e-9) + 0.02 * lift;                       // the most even (a slight preference to stay low)
    if (r < bestR) { bestR = r; best = cl; }
  }
  return best;
}

export function createLightPool(scene, count = 5) {
  // ceiling panels light downwards: spot lights pointing at the floor, with soft edges (a point light just under the
  // ceiling would burn a bright patch into it)
  const lights = [], slots = [];
  for (let i = 0; i < count; i++) {
    const l = new THREE.SpotLight(0xfff1e0, 0, SPOT.reach, SPOT.angle, SPOT.penumbra, SPOT.decay);
    l.castShadow = false; l.visible = false; scene.add(l); scene.add(l.target); lights.push(l); slots.push({ f: null, k: 0 });
  }
  const setVisible = (v) => { for (const l of lights) l.visible = v; };
  return {
    lights, setVisible,
    // clusters: the lit room's [{ p, w }] (null or [] outside); intensity: one 3 m fixture's
    update(dt, clusters, intensity = 7) {
      const want = clusters || [], step = Math.min(1, dt / 0.3);
      let any = false;
      for (let i = 0; i < lights.length; i++) {
        const s = slots[i], target = want[i] || null, l = lights[i];
        if (s.f !== target) { s.k = Math.max(0, s.k - 3 * step); if (s.k === 0) s.f = target; }   // out quickly, then in
        else if (s.f) s.k = Math.min(1, s.k + step);
        if (s.f) {
          if (!l.position.equals(s.f.p)) { l.position.copy(s.f.p); l.target.position.set(s.f.p.x, s.f.p.y - 2, s.f.p.z); l.target.updateMatrixWorld(); }
          l.distance = SPOT.reach * Math.sqrt(s.f.w); l.intensity = intensity * s.f.w * s.k;
        } else l.intensity = 0;
        if (s.f || target) any = true;                     // hidden only when nothing is lit or on its way
      }
      setVisible(any);
    },
  };
}
