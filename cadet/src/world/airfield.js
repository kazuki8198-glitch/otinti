// CADET — world/airfield.js : LAB RWY 36 / 18, the parallel taxiway A with A1–A3, the apron, their markings,
// lights, signs, the PAPI and the windsock. Everything is placed from FL.physics (LAB_RWY, PAVED): what is drawn
// as pavement is exactly what the wheels find paved.
// The markings are not geometry: they are computed per pixel from the runway frame (crisp at any distance, nothing
// drawn twice on the same plane). Positions follow FLIGHT LAB's runway (threshold stripes, numbers, touchdown zone
// and aiming point markings at the same places the landing lessons use).
import * as THREE from 'three';
import { NOISE } from '../render/glsl.js';
import { tex, numeralTexture, signTexture } from '../render/textures.js';
import { mergeGeos } from './ground.js';

export const CONNECTORS = [{ id: 'A1', a: 10, dir: 1 }, { id: 'A2', a: 600, dir: 1 }, { id: 'A3', a: 1175, dir: -1 }];   // `a`: start of the 15 m wide connector
export const TWY_C = 102.5;                         // the parallel taxiway's centre line (cross, m)
export const HOLD_C = 37;                           // the hold-short line (cross, m from the runway centre line)
export const STANDS = [];                           // tie-down spots on the apron: { a, c, row }
for (let a = 470; a <= 730; a += 18.5) { STANDS.push({ a, c: 168, row: 1 }); STANDS.push({ a, c: 208, row: 2 }); }

// colliders for walking among the airfield's furniture: each sign, each PAPI unit, the windsock's pole (boxes in the
// runway frame, from the meshes' own bounds; the airfield's group is the runway frame)
export function airfieldColliders(airfield, world) {
  const frame = airfield.group;
  frame.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(frame.matrixWorld).invert(), m = new THREE.Matrix4();
  const boxOf = (obj) => {
    const box = new THREE.Box3();
    obj.traverse(o => { if (o.isMesh) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld))); } });
    return box;
  };
  const add = (box, tag) => { if (!box.isEmpty()) world.add({ x0: box.min.x, x1: box.max.x, y0: Math.max(0, box.min.y), y1: box.max.y, z0: box.min.z, z1: box.max.z, tag }); };
  let n = 0;
  for (const [name, each] of [['signs', true], ['papi', true], ['windsock', false]]) {
    const grp = frame.getObjectByName(name); if (!grp) continue;
    for (const obj of grp.children) if (each || obj.isMesh) { add(boxOf(obj), name); n++; }       // windsock: the pole only
  }
  return n;
}

export function buildAirfield(L, FL, { quality }) {
  const R = L.R, LEN = R.len, HW = R.wid / 2;
  const frame = new THREE.Group(); frame.name = 'airfield';
  frame.position.set(0, L.G, 0); frame.rotation.y = L.frameYaw;     // in the frame: x = across, z = −along
  const P = (a, c, y = 0) => new THREE.Vector3(c, y, -a);

  // ---------------------------------------------------------------- pavement
  const num36 = numeralTexture('36'), num18 = numeralTexture('18');
  const numAspect = num36.image.width / num36.image.height;
  const mats = {
    asphalt: pavementMaterial('asphalt', { num36, num18, numAspect, LEN, HW }),
    concrete: pavementMaterial('concrete', { LEN, HW }),
    walk: pavementMaterial('walk', { LEN, HW }),
    lot: pavementMaterial('lot', { LEN, HW }),
  };
  const MAT_OF = { rwy: 'asphalt', twy: 'asphalt', apron: 'concrete', walk: 'walk', lot: 'lot' };
  const quads = { asphalt: [], concrete: [], walk: [], lot: [] };
  for (const c of L.paved) quads[MAT_OF[c.kind]].push(c);
  for (const [k, cells] of Object.entries(quads)) {
    const pos = [], rf = [];
    for (const c of cells) {
      const v = [[c.a0, c.c0], [c.a1, c.c0], [c.a1, c.c1], [c.a0, c.c1]];
      for (const i of [0, 2, 1, 0, 3, 2]) { pos.push(v[i][1], 0, -v[i][0]); rf.push(v[i][1], v[i][0]); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('rf', new THREE.Float32BufferAttribute(rf, 2));
    g.computeVertexNormals();
    // make sure every triangle faces up
    const n = g.attributes.normal.array; if (n[1] < 0) { g.index = null; const p = g.attributes.position.array, q = g.attributes.rf.array; for (let i = 0; i < p.length; i += 9) for (let j = 0; j < 3; j++) { [p[i + 3 + j], p[i + 6 + j]] = [p[i + 6 + j], p[i + 3 + j]]; } for (let i = 0; i < q.length; i += 6) for (let j = 0; j < 2; j++) { [q[i + 2 + j], q[i + 4 + j]] = [q[i + 4 + j], q[i + 2 + j]]; } g.computeVertexNormals(); }
    const m = new THREE.Mesh(g, mats[k]); m.receiveShadow = true; m.name = 'pavement-' + k;
    frame.add(m);
  }

  // ---------------------------------------------------------------- lights (fixtures; lit at dusk)
  const lights = buildLights(LEN, HW);
  frame.add(lights.group);

  // ---------------------------------------------------------------- signs
  frame.add(buildSigns(LEN, HW));

  // ---------------------------------------------------------------- PAPI (left side, 300 m in, as FLIGHT LAB)
  const papi = buildPapi(LEN, HW);
  frame.add(papi.group);

  // ---------------------------------------------------------------- windsock and the segmented circle
  const sock = buildWindsock();
  sock.group.position.copy(P(250, -45));
  frame.add(sock.group);

  return {
    group: frame, materials: Object.values(mats),
    update(t, { cameraWorld, windFromDeg = 330, windKt = 8, lightsOn = 0 }) {
      sock.update(t, windFromDeg - L.R.trueHdg, windKt);
      papi.update(cameraWorld, frame);
      if (lights.update) lights.update(t, lightsOn); else lights.setOn(lightsOn);
    },
  };
}

// ---------------------------------------------------------------- the pavement material (asphalt / concrete + paint)
function pavementMaterial(kind, o) {
  const isA = kind === 'asphalt' || kind === 'lot', TEXC = { asphalt: 'asphalt', lot: 'asphalt', concrete: 'concrete', walk: 'concrete' }[kind];
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const U = {
    tC: { value: tex(kind === 'walk' ? 'concrete2_c' : TEXC + '_c') }, tN: { value: tex(TEXC + '_n') }, tR: { value: tex(TEXC + '_r') },
    tNum36: { value: o.num36 || null }, tNum18: { value: o.num18 || null }, uNumAspect: { value: o.numAspect || 1 },
    uLen: { value: o.LEN }, uHW: { value: o.HW },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 rf; varying vec2 vRf; varying vec3 vPW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvRf = rf; vPW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vRf; varying vec3 vPW;
        uniform mat4 modelMatrix;            // (three.js sets it; declared here so the fragment stage can use it)
        uniform sampler2D tC, tN, tR, tNum36, tNum18; uniform float uNumAspect, uLen, uHW;
        ${NOISE}
        ${PAINT}
        float pRough; vec3 pNrm;
      `)
      .replace('#include <map_fragment>', /* glsl */`
        vec2 p = vRf;                                           // (across, along) in metres
        float dist = length(vPW - cameraPosition);
        vec2 uv = vec2(p.x, p.y) / ${isA ? '3.2' : '4.0'};
        vec4 c = cdTexNoTile(tC, uv, 0.23);
        vec3 nt = cdTexNoTile(tN, uv, 0.23).xyz * 2.0 - 1.0;
        float rr = cdTexNoTile(tR, uv, 0.23).r;
        vec3 base = c.rgb;
        float macro = cdFbm(p * 0.035);
        ${isA ? /* glsl */`
          base *= mix(0.78, 1.12, macro) * vec3(1.0, 1.0, 1.02);
          float rubber = 0.0;
          ${kind === 'lot' ? '' : `// rubber in the touchdown zones (both directions) and along the centre line
          float yB = uLen - p.y;
          float tdz = smoothstep(80.0, 160.0, p.y) * (1.0 - smoothstep(420.0, 650.0, p.y)) + smoothstep(80.0, 160.0, yB) * (1.0 - smoothstep(420.0, 650.0, yB));
          float onRwy = step(abs(p.x), uHW) * step(0.0, p.y) * step(p.y, uLen);
          float streak = cdNoise(vec2(p.x * 1.6, p.y * 0.02)) * cdNoise(vec2(p.x * 0.4 + 3.0, p.y * 0.05));
          rubber = onRwy * (tdz * (1.0 - smoothstep(3.0, 9.0, abs(p.x))) * (0.55 + 0.9 * streak) + 0.18 * (1.0 - smoothstep(1.0, 5.0, abs(abs(p.x) - 2.6))) * streak);
          base *= 1.0 - 0.55 * clamp(rubber, 0.0, 1.0);`}
          // sealed cracks: thin, wandering, in patches
          vec2 cp = p * vec2(0.13, 0.09) + 2.5 * vec2(cdNoise(p * 0.031), cdNoise(p * 0.029 + 4.0));
          float ck = abs(cdNoise(cp) - 0.5), cw = max(fwidth(ck), 1e-4);
          float crack = clamp((0.006 - ck) / cw + 0.5, 0.0, 1.0) * min(1.0, 0.012 / cw) * smoothstep(0.5, 0.7, cdNoise(p * 0.012 + 9.0));
          base *= 1.0 - 0.5 * crack;
          vec2 paint = ${kind === 'lot' ? 'paintLot(p)' : 'paintAsphalt(p)'};
        ` : /* glsl */`
          // concrete slabs (5 m on the apron, 1.5 m on walkways), a shade per slab, dark joints
          float SL = ${kind === 'walk' ? '1.5' : '5.0'};
          vec2 slab = floor(p / SL);
          base *= mix(0.8, 1.08, cdHash12(slab)) * mix(0.84, 1.06, macro) ${kind === 'walk' ? '* 1.12' : '* 0.9'};
          float joint = lines(p, SL, 0.018);
          float grime = lines(p, SL, 0.09) * 0.5 + lines(p, SL, 0.3) * 0.25;      // dirt gathers along the joints
          base *= (1.0 - 0.6 * joint) * (1.0 - 0.12 * grime);
          ${kind === 'concrete' ? `// oil drips under the parked engines and tyre marks along the taxilane
          float si = clamp(floor((p.y - 470.0) / 18.5 + 0.5), 0.0, 14.0), sa = 470.0 + si * 18.5, sc = p.x < 188.0 ? 168.0 : 208.0;
          float oil = (1.0 - smoothstep(0.3, 1.6 + 0.8 * cdNoise(p * 1.7), length(p - vec2(sc - 5.6, sa)))) * (0.6 + 0.4 * cdNoise(p * 3.1));
          float tyre = (1.0 - smoothstep(0.4, 2.2, abs(p.x - 125.0 - 1.1 * sin(p.y * 0.02)))) * cdNoise(vec2(p.x * 2.0, p.y * 0.05)) * step(452.0, p.y) * step(p.y, 748.0);
          base *= (1.0 - 0.45 * oil) * (1.0 - 0.2 * tyre);` : ''}
          base *= 1.0 - 0.25 * smoothstep(0.55, 0.8, cdFbm(p * 0.12)) ;            // stains
          vec2 paint = ${kind === 'walk' ? 'vec2(0.0)' : 'paintApron(p)'};
          float rubber = 0.0;
        `}
        float wear = 0.80 + 0.2 * cdNoise(p * 2.3) * cdNoise(p * 0.37);
        paint *= wear;
        vec3 white = vec3(0.80), yellow = vec3(0.82, 0.55, 0.06);
        base = mix(base, white * mix(0.9, 1.0, c.r * 2.0), paint.x);
        base = mix(base, yellow * mix(0.9, 1.0, c.r * 2.0), paint.y);
        diffuseColor.rgb *= base;
        float pc = max(paint.x, paint.y);
        pRough = mix(mix(0.55, 1.0, rr) - 0.12 * rubber, 0.62, pc);
        float nk = (1.0 - smoothstep(20.0, 140.0, dist)) * (1.0 - 0.7 * pc);
        pNrm = normalize(vec3(nt.x * nk, 1.0, -nt.y * nk));
      `)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(pRough, 0.05, 1.0);')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(mat3(modelMatrix) * pNrm, 0.0)).xyz);');
  };
  mat.customProgramCacheKey = () => 'cadet-pave-' + kind;
  return mat;
}

// The paint (white, yellow) as coverage, anti-aliased with the pixel's footprint. p = (across, along), metres.
const PAINT = /* glsl */`
  // box-filtered coverage: the share of this pixel's footprint inside the rectangle (thin lines fade, never thicken)
  float box(vec2 p, vec2 a, vec2 b) {
    vec2 w = max(fwidth(p), vec2(1e-4));
    vec2 lo = max(p - 0.5 * w, a), hi = min(p + 0.5 * w, b);
    vec2 c = clamp((hi - lo) / w, 0.0, 1.0);
    return c.x * c.y;
  }
  float ring(vec2 p, vec2 c, float r, float hw) { float d = abs(length(p - c) - r); float w = max(fwidth(d), 1e-4); return clamp((hw - d) / w + 0.5, 0.0, 1.0) * min(1.0, 2.0 * hw / w); }
  float lines(vec2 p, float period, float hw) {           // a grid of thin lines (joints), box-filtered
    vec2 w = max(fwidth(p), vec2(1e-4)), d = abs(fract(p / period + 0.5) - 0.5) * period;
    vec2 c = clamp((hw - d) / w + 0.5, 0.0, 1.0) * min(vec2(1.0), 2.0 * hw / w);
    return max(c.x, c.y);
  }
  // one runway end, in that end's own frame (q.x across from the pilot's left, q.y along from its threshold)
  float runwayEnd(vec2 q, sampler2D num) {
    float W = 0.0;
    for (int k = 0; k < 8; k++) {                                      // threshold stripes (FLIGHT LAB's layout)
      float x = -uHW + 2.2 + float(k) * 3.35 + (k >= 4 ? 1.4 : 0.0);
      W += box(q, vec2(x, 6.0), vec2(x + 1.8, 36.0));
    }
    // the number: 18 m tall
    float nh = 18.0, nw = nh * uNumAspect;
    vec2 uvN = vec2((q.x + nw * 0.5) / nw, (q.y - 48.0) / nh);
    float inN = step(0.0, uvN.x) * step(uvN.x, 1.0) * step(0.0, uvN.y) * step(uvN.y, 1.0);
    W += texture2D(num, clamp(uvN, 0.0, 1.0)).a * inN;
    // touchdown zone (3 bars at 150, 2 at 450) and the aiming point (300)
    for (int s = -1; s <= 1; s += 2) {
      float sg = float(s);
      for (int j = 0; j < 3; j++) { float x0 = 3.5 + float(j) * 1.6; vec2 a = vec2(sg > 0.0 ? x0 : -x0 - 1.0, 150.0), b = vec2(sg > 0.0 ? x0 + 1.0 : -x0, 172.0); W += box(q, a, b); }
      for (int j = 0; j < 2; j++) { float x0 = 3.5 + float(j) * 1.6; vec2 a = vec2(sg > 0.0 ? x0 : -x0 - 1.0, 450.0), b = vec2(sg > 0.0 ? x0 + 1.0 : -x0, 472.0); W += box(q, a, b); }
      W += box(q, vec2(sg > 0.0 ? 4.5 : -8.5, 300.0), vec2(sg > 0.0 ? 8.5 : -4.5, 345.0));
    }
    return W;
  }
  vec2 paintAsphalt(vec2 p) {
    float W = 0.0, Y = 0.0;
    // runway: edges, both ends, the centre line (36 m dashes, 24 m gaps)
    W += box(p, vec2(-uHW, 0.0), vec2(-uHW + 0.9, uLen)) + box(p, vec2(uHW - 0.9, 0.0), vec2(uHW, uLen));
    W += runwayEnd(p, tNum36);
    W += runwayEnd(vec2(-p.x, uLen - p.y), tNum18);
    if (p.y > 80.0 && p.y < uLen - 80.0) { float m = mod(p.y - 80.0, 60.0); W += box(vec2(p.x, m), vec2(-0.45, 0.0), vec2(0.45, 36.0)); }
    // blast pads beyond both ends: yellow chevrons
    for (int e = 0; e < 2; e++) {
      vec2 q = e == 0 ? vec2(p.x, -p.y) : vec2(p.x, p.y - uLen);          // metres beyond the end (0..40)
      if (q.y > 0.0 && q.y < 40.0 && abs(q.x) < uHW) { float v = mod(q.y - abs(q.x) * 0.5, 12.0); float wv = fwidth(v) + 1e-3; Y += (smoothstep(0.0, wv, v) - smoothstep(1.2 - wv, 1.2 + wv, v)); }
    }
    // the parallel taxiway's centre line (yellow, 25 cm)
    Y += box(p, vec2(${TWY_C.toFixed(1)} - 0.125, -10.0), vec2(${TWY_C.toFixed(1)} + 0.125, uLen + 10.0));
    // the connectors A1–A3: centre lines, the turns onto the taxiway and the runway, the hold-short lines
    ${CONNECTORS.map(k => /* glsl */`{
      float ac = ${(k.a + 7.5).toFixed(1)};
      Y += box(p, vec2(uHW, ac - 0.125), vec2(${(TWY_C - 7.5).toFixed(1)}, ac + 0.125));
      Y += ring(p, vec2(${(TWY_C - 7.5).toFixed(1)}, ac + 7.5), 7.5, 0.125) * step(${(TWY_C - 7.5).toFixed(1)}, p.x) * step(p.y, ac + 7.5);
      Y += ring(p, vec2(${(TWY_C - 7.5).toFixed(1)}, ac - 7.5), 7.5, 0.125) * step(${(TWY_C - 7.5).toFixed(1)}, p.x) * step(ac - 7.5, p.y);
      // lead-on line onto the runway centre line, turning towards the usual departure direction
      Y += ring(p, vec2(uHW, ac + ${(k.dir * 15).toFixed(1)}), uHW, 0.125) * step(p.x, uHW) * step(0.0, p.x) * step(0.0, ${k.dir.toFixed(1)} * (ac + ${(k.dir * 15).toFixed(1)} - p.y));
      // hold short: two solid lines on the taxiway side, two dashed lines on the runway side
      float a0 = ${k.a.toFixed(1)}, a1 = ${(k.a + 15).toFixed(1)};
      float dash = box(vec2(0.0, mod(p.y, 1.8)), vec2(-1.0, 0.0), vec2(1.0, 0.9));
      Y += box(p, vec2(${HOLD_C.toFixed(1)} + 0.0, a0), vec2(${HOLD_C.toFixed(1)} + 0.2, a1)) * dash;
      Y += box(p, vec2(${HOLD_C.toFixed(1)} + 0.4, a0), vec2(${HOLD_C.toFixed(1)} + 0.6, a1)) * dash;
      Y += box(p, vec2(${HOLD_C.toFixed(1)} + 0.8, a0), vec2(${HOLD_C.toFixed(1)} + 1.0, a1));
      Y += box(p, vec2(${HOLD_C.toFixed(1)} + 1.2, a0), vec2(${HOLD_C.toFixed(1)} + 1.4, a1));
    }`).join('\n')}
    return clamp(vec2(W, Y), 0.0, 1.0);
  }
  vec2 paintLot(vec2 p) {
    // car park: two rows of stalls (2.6 m wide, 5.5 m deep) either side of a 7 m aisle, white lines
    float W = 0.0;
    float s = mod(p.y - 560.0, 2.6);
    float inRows = step(564.0, p.y) * step(p.y, 721.0);
    W += box(vec2(p.x, s), vec2(292.0, 0.0), vec2(297.5, 0.1)) * inRows + box(vec2(p.x, s), vec2(304.5, 0.0), vec2(310.0, 0.1)) * inRows;
    W += box(vec2(p.x, s), vec2(322.0, 0.0), vec2(327.5, 0.1)) * inRows + box(vec2(p.x, s), vec2(334.5, 0.0), vec2(340.0, 0.1)) * inRows;
    return vec2(W, 0.0);
  }
  vec2 paintApron(vec2 p) {
    float Y = 0.0, W = 0.0;
    // the apron's taxilane (along the apron, 15 m in) and its edge lines where it meets the grass
    Y += box(p, vec2(124.875, 452.0), vec2(125.125, 748.0));
    Y += box(p, vec2(228.6, 450.0), vec2(228.8, 750.0)) + box(p, vec2(229.1, 450.0), vec2(229.3, 750.0));
    Y += box(p, vec2(110.0, 450.7), vec2(229.3, 450.9)) + box(p, vec2(110.0, 451.2), vec2(229.3, 451.4));
    Y += box(p, vec2(110.0, 749.1), vec2(229.3, 749.3)) + box(p, vec2(110.0, 748.6), vec2(229.3, 748.8));
    // tie-down spots (only the nearest one is evaluated): a T for the wheels and the wing ropes, the tie-down rings,
    // and a lead-in line from the taxilane to the first row
    float i = clamp(floor((p.y - 470.0) / 18.5 + 0.5), 0.0, 14.0);
    float a = 470.0 + i * 18.5;
    float c = p.x < 188.0 ? 168.0 : 208.0;
    Y += box(p, vec2(c - 0.15, a - 5.2), vec2(c + 0.15, a + 5.2));            // the bar under the wings
    Y += box(p, vec2(c - 6.5, a - 0.12), vec2(c, a + 0.12));                   // the stem towards the nose
    W += ring(p, vec2(c, a - 4.8), 0.22, 0.06) + ring(p, vec2(c, a + 4.8), 0.22, 0.06) + ring(p, vec2(c + 6.2, a), 0.22, 0.06);
    Y += box(p, vec2(125.0, a - 0.12), vec2(161.5, a + 0.12));
    return clamp(vec2(W * 0.6, Y), 0.0, 1.0);
  }
`;

// ---------------------------------------------------------------- lights
function buildLights(LEN, HW) {
  const group = new THREE.Group(); group.name = 'airfield-lights';
  const items = [];                      // [across, along, colour]
  const WHITE = [1.0, 0.86, 0.62], GREEN = [0.2, 1.0, 0.45], BLUE = [0.15, 0.35, 1.0], RED = [1.0, 0.12, 0.08];
  for (let a = 0; a <= LEN + 0.1; a += 60) for (const s of [-1, 1]) items.push([s * (HW + 1.5), a, WHITE]);
  for (let k = 0; k < 8; k++) { const c = -HW + 1.8 + k * (2 * HW - 3.6) / 7; items.push([c, -1.5, GREEN]); items.push([c, LEN + 1.5, RED]); }
  for (let a = -10; a <= LEN + 10.1; a += 30) for (const c of [94.2, 110.8]) {
    if (c < 100 && CONNECTORS.some(k => a > k.a - 2 && a < k.a + 17)) continue;      // where a connector joins
    if (c > 100 && a > 448 && a < 752) continue;                                      // where the apron joins
    items.push([c, a, BLUE]);
  }
  for (const k of CONNECTORS) for (let c = HW + 12; c < 94; c += 20) for (const a of [k.a - 0.8, k.a + 15.8]) items.push([c, a, BLUE]);
  // the approach light system for runway 36 (the ILS runway): centreline barrettes every 60 m out to 420 m
  // before the threshold — steady white, part of the same instanced set as the edge lights
  for (let a = -420; a <= -60; a += 60) for (let c = -3; c <= 3; c += 1.5) items.push([c, a, WHITE]);
  const base = new THREE.CylinderGeometry(0.05, 0.07, 0.32, 8); base.translate(0, 0.16, 0);
  const cap = new THREE.SphereGeometry(0.085, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); cap.translate(0, 0.32, 0);
  const pole = new THREE.InstancedMesh(base, new THREE.MeshStandardMaterial({ color: 0xc9b23a, roughness: 0.6, metalness: 0.3 }), items.length);
  const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, emissive: 0xffffff, emissiveIntensity: 0 });
  const glass = new THREE.InstancedMesh(cap, capMat, items.length);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  items.forEach(([c, a, rgb], i) => {
    m.makeTranslation(c, 0, -a); pole.setMatrixAt(i, m); glass.setMatrixAt(i, m);
    glass.setColorAt(i, col.setRGB(rgb[0], rgb[1], rgb[2]));
  });
  pole.castShadow = true;
  group.add(pole, glass);
  // the strobes: the sequenced flashers of the ALS ("the rabbit", running towards the threshold) and the two
  // REIL at the 36 threshold corners, flashing together. One instanced mesh; the sequence is the instance
  // colours, rewritten as the phase runs (a handful of instances, twice a second at most in effect).
  const strobeAt = [];
  for (let a = -300; a <= -60; a += 60) strobeAt.push([0, a]);                    // the rabbit, far to near
  strobeAt.push([-(HW + 3), 0], [HW + 3, 0]);                                     // the REIL pair
  const strobeGeo = new THREE.SphereGeometry(0.14, 10, 8); strobeGeo.translate(0, 0.9, 0);
  const strobeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0 });
  const strobes = new THREE.InstancedMesh(strobeGeo, strobeMat, strobeAt.length);
  strobeAt.forEach(([c, a], i) => { m.makeTranslation(c, 0, -a); strobes.setMatrixAt(i, m); strobes.setColorAt(i, col.setRGB(0, 0, 0)); });
  group.add(strobes);
  const setOn = (k) => { capMat.emissiveIntensity = 0.15 + 9 * k; };
  return {
    group, setOn,
    update(t, on = 0) {
      setOn(on);
      // the rabbit runs once a second: each flasher fires in turn, farthest first; the REIL fires with the nearest
      const ph = (t % 1) * strobeAt.length;
      for (let i = 0; i < strobeAt.length; i++) {
        const d = Math.abs(ph - i);
        const b = on > 0.02 ? Math.max(0, 1 - Math.min(d, strobeAt.length - d) * 2.2) : 0;
        strobes.setColorAt(i, col.setRGB(b, b, b * 0.98));
      }
      if (strobes.instanceColor) strobes.instanceColor.needsUpdate = true;
      strobeMat.emissiveIntensity = on > 0.02 ? 6 : 0;
    },
  };
}

// ---------------------------------------------------------------- signs (FAA colours): hold-position, location, direction, distance remaining
function buildSigns(LEN, HW) {
  const group = new THREE.Group(); group.name = 'signs';
  const RED = '#c4161c', BLK = '#121212', YEL = '#f2c230', WHT = '#ffffff';
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.7 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0xd7c76a, roughness: 0.6 });
  const make = (parts, back, at, yaw) => {
    const front = signTexture(parts), rear = signTexture(back || parts);
    const h = 0.75, w = h * front.image.width / front.image.height;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.28), frameMat); body.castShadow = true;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: front, roughness: 0.5, emissive: 0xffffff, emissiveMap: front, emissiveIntensity: 0.05 }));
    f.position.z = 0.141;
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w * (rear.image.width / front.image.width), h), new THREE.MeshStandardMaterial({ map: rear, roughness: 0.5, emissive: 0xffffff, emissiveMap: rear, emissiveIntensity: 0.05 }));
    r.position.z = -0.141; r.rotation.y = Math.PI;
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 6), legMat); leg.position.set(s * w * 0.35, -h / 2 - 0.27, 0); g.add(leg); }
    g.add(body, f, r);
    g.position.set(at[0], 0.6 + h / 2 + 0.1, -at[1]); g.rotation.y = yaw;
    group.add(g);
  };
  for (const k of CONNECTORS) {
    // on the left of an aircraft taxiing towards the runway (towards −across): the hold sign and the location sign
    const side = k.a - 4;                                               // just beyond the connector's edge, on the left
    make([{ text: 'A' + k.id.slice(1), bg: BLK, fg: YEL, border: YEL }, { text: '36-18', bg: RED, fg: WHT, w: 2.1 }], [{ text: k.id, bg: BLK, fg: YEL, border: YEL }], [HOLD_C + 1.5, side], Math.PI / 2);
  }
  // runway distance remaining (thousands of feet) on the left of a 36 departure, both sides
  for (const n of [3, 2, 1]) for (const s of [-1, 1]) {
    const a = s < 0 ? LEN - n * 304.8 : n * 304.8;
    make([{ text: String(n), bg: BLK, fg: WHT }], null, [s * (HW + 12), a], s < 0 ? 0 : Math.PI);
  }
  // a direction sign before A2 for an aircraft taxiing north on A (on its left): "← A2" next to the location "A"
  make([{ text: 'A', bg: BLK, fg: YEL, border: YEL }, { text: '← A2', bg: YEL, fg: BLK, w: 1.6 }], null, [92.6, 600 - 22], 0);
  return group;
}

// ---------------------------------------------------------------- PAPI: four units, white above their angle, red below
function buildPapi(LEN, HW) {
  const group = new THREE.Group(); group.name = 'papi';
  const ANG = [3.5, 3.17, 2.83, 2.5];                 // from the runway outwards (degrees)
  const units = [];
  const boxGeo = new THREE.BoxGeometry(1.4, 0.55, 0.9); boxGeo.translate(0, 0.55, 0);
  const lensGeo = new THREE.CircleGeometry(0.13, 16);
  const body = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.4 });
  // one end's set: the units stand on the pilot's left, 300 m past that end's threshold, their lenses facing
  // the approaching aircraft (flip: +1 for the 36 end, whose traffic comes from the south; −1 for the 18 end)
  const end = (a, side, flip) => {
    for (let k = 0; k < 4; k++) {
      const c = side * (HW + 15 + k * 9);
      const g = new THREE.Group(); g.position.set(c, 0, -a);
      const b = new THREE.Mesh(boxGeo, body); b.castShadow = true; g.add(b);
      const lm = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: 6, roughness: 0.2 });
      for (const x of [-0.35, 0.35]) { const l = new THREE.Mesh(lensGeo, lm); l.position.set(x, 0.62, 0.451 * flip); if (flip < 0) l.rotation.y = Math.PI; g.add(l); }
      group.add(g); units.push({ g, lm, ang: ANG[k] });
    }
  };
  end(300, -1, 1);            // runway 36: left of a northbound approach is the west side
  end(LEN - 300, 1, -1);      // runway 18: left of a southbound approach is the east side
  const wp = new THREE.Vector3();
  return {
    group, update(cam, frame) {
      if (!cam) return;
      for (const u of units) {
        u.g.getWorldPosition(wp);
        const dx = cam.x - wp.x, dz = cam.z - wp.z, dy = cam.y - wp.y - 0.6;
        const el = Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI;
        const w = THREE.MathUtils.smoothstep(el, u.ang - 0.05, u.ang + 0.05);
        u.lm.emissive.setRGB(1.0, 0.1 + 0.85 * w, 0.06 + 0.8 * w);
      }
    },
  };
}

// ---------------------------------------------------------------- windsock (cone points downwind, droops in light wind)
function buildWindsock() {
  const group = new THREE.Group(); group.name = 'windsock';
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 6, 10), new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.5, metalness: 0.5 }));
  pole.position.y = 3; pole.castShadow = true; group.add(pole);
  const head = new THREE.Group(); head.position.y = 6; group.add(head);
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.025, 6, 24), pole.material); ringM.rotation.y = Math.PI / 2; ringM.position.x = 0.05; head.add(ringM);
  // the cone: an open tapered tube along +x with five orange / white bands (vertex colours)
  const len = 3.6, segs = 20, rad = 16, pos = [], col = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const x = i / segs * len, r = 0.45 - 0.22 * (i / segs), band = Math.min(4, Math.floor(i / segs * 5));
    const c = band % 2 ? [1, 1, 1] : [1.0, 0.24, 0.02];
    for (let j = 0; j <= rad; j++) { const a = j / rad * Math.PI * 2; pos.push(x, Math.cos(a) * r, Math.sin(a) * r); col.push(...c); }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const U = { uTime: { value: 0 }, uWind: { value: 0.5 } };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime, uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float k = position.x / 3.6;
        transformed.y += sin(uTime * 7.0 - position.x * 2.2) * 0.05 * k * (0.4 + uWind);
        transformed.z += sin(uTime * 5.3 - position.x * 1.7) * 0.08 * k * (0.4 + uWind);`);
  };
  mat.customProgramCacheKey = () => 'cadet-sock';
  const cone = new THREE.Mesh(geo, mat); cone.castShadow = true; head.add(cone);
  // the segmented circle (white boards on the grass)
  const seg = new THREE.BoxGeometry(3.2, 0.25, 0.6), segs2 = [];
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, g = seg.clone(); g.rotateY(-a + Math.PI / 2); g.translate(Math.cos(a) * 15, 0.12, Math.sin(a) * 15); segs2.push(g); }
  const circle = new THREE.Mesh(mergeGeos(segs2), new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.8 }));
  circle.castShadow = true; circle.receiveShadow = true; group.add(circle);
  return {
    group,
    update(t, relFromDeg, kt) {
      // the wind blows FROM relFromDeg (relative to the runway frame's −z = along): the cone points the other way
      const to = (relFromDeg + 180) * Math.PI / 180;
      head.rotation.y = Math.PI / 2 - to;
      const full = Math.min(1, kt / 15);
      head.rotation.z = -(1 - full) * 1.2;
      U.uTime.value = t; U.uWind.value = full;
    },
  };
}
