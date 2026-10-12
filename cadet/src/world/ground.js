// CADET — world/ground.js : the ground and the lakes.
// FLIGHT LAB's world is flat (55 ft above sea level). The ground is drawn as one mesh with holes where the pavement
// and the lakes are (so nothing is drawn twice on the same plane), plus the grass cells inside the airfield. Its colour
// is computed per pixel: photo grass (anti-tiled) close by, the airfield's mowed grass, and FLIGHT LAB's fields,
// roads, lake shores and landmark rings further away — the same layout pilots already know from FLIGHT LAB.
import * as THREE from 'three';
import { NOISE } from '../render/glsl.js';
import { tex, canvasTexture, rng } from '../render/textures.js';

const srgbToLin = c => c.map(v => Math.pow(v, 2.2));

export function buildGround(L, FL, { quality }) {
  const group = new THREE.Group(); group.name = 'ground';
  const A = FL.avionics, G = L.G;

  // ---------------------------------------------------------------- the material
  const lakes = L.lakes.map(k => new THREE.Vector4(k.e, k.n, k.r, k.seed));
  while (lakes.length < 8) lakes.push(new THREE.Vector4(0, 0, 0, 0));
  const RINGS = [['LABEA', [0.95, 0.55, 0.12]], ['LABEB', [0.20, 0.75, 0.30]], ['LABEC', [0.20, 0.50, 0.95]], ['LABED', [0.95, 0.85, 0.15]], ['LABEF', [0.90, 0.25, 0.80]]];
  const rings = [], ringCol = [];
  for (const [id, col] of RINGS) { const w = A.wpt(id); if (!w) continue; rings.push(new THREE.Vector4(w.e, w.n, 140, 0)); ringCol.push(new THREE.Vector3(...srgbToLin(col))); }
  while (rings.length < 8) { rings.push(new THREE.Vector4(0, 0, 0, 0)); ringCol.push(new THREE.Vector3()); }

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
  const U = {
    tGrass: { value: tex('grass_c') }, tGrassNR: { value: tex('grass_nr') },
    uOrigin: { value: new THREE.Vector2(L.E0, L.N0) }, uRwy: { value: new THREE.Vector4(Math.sin(L.H), Math.cos(L.H), 0, 0) },
    uRegion: { value: new THREE.Vector4(L.region.a0, L.region.a1, L.region.c0, L.region.c1) },
    uLakes: { value: lakes }, uRings: { value: rings }, uRingCol: { value: ringCol },
    uDetail: { value: quality.groundDetail ?? 1 },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vGW;
        uniform sampler2D tGrass, tGrassNR; uniform vec2 uOrigin; uniform vec4 uRwy, uRegion; uniform float uDetail;
        uniform vec4 uLakes[8]; uniform vec4 uRings[8]; uniform vec3 uRingCol[8];
        ${NOISE}
        vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
        float gRough; vec3 gNrm;
        `)
      .replace('#include <map_fragment>', /* glsl */`
        vec2 loc = vGW.xz;
        vec2 w = vec2(loc.x + uOrigin.x, -loc.y + uOrigin.y);                  // FLIGHT LAB's (e, n)
        float dist = length(vGW - cameraPosition);
        float nearK = 1.0 - smoothstep(900.0, 5000.0, dist);
        // the runway frame: along / across from the threshold of 36
        float dn = -loc.y, de = loc.x;
        vec2 rf = vec2(-dn * uRwy.x + de * uRwy.y, dn * uRwy.y + de * uRwy.x);  // (cross, along)
        vec2 rg0 = vec2(uRegion.z, uRegion.x), rg1 = vec2(uRegion.w, uRegion.y);
        vec2 dOut = max(rg0 - rf, rf - rg1);
        float inField = smoothstep(0.0, 90.0, max(dOut.x, dOut.y));            // 0 on the airfield, 1 outside
        // close-up grass from the photo texture, without visible repetition
        vec2 guv = loc / 2.6;
        vec4 gc = cdTexNoTile(tGrass, guv, 0.31);
        vec4 gn = cdTexNoTile(tGrassNR, guv, 0.31);
        float m1 = cdFbm(loc * 0.011), m2 = cdFbm3(loc * 0.0013 + 7.0);
        vec3 grass = gc.rgb * mix(vec3(0.80, 0.86, 0.66), vec3(1.10, 1.06, 0.92), m1) * mix(0.86, 1.08, m2);
        // the airfield's mowed strips along the runway
        float stripe = sign(sin(rf.x * 3.14159 / 7.0));
        float sw = fwidth(rf.x) / 7.0;                                         // fade the strips before they alias
        grass *= 1.0 + 0.04 * stripe * (1.0 - inField) * (1.0 - smoothstep(0.08, 0.35, sw));
        // the farmland: FLIGHT LAB's field grid, jittered per column and split, with pasture, crops, sod, citrus groves,
        // fallow land, tree lines on some edges and patches of pine woods (sRGB palette, made linear)
        vec2 cs = vec2(460.0, 320.0);
        float colI = floor(w.x / cs.x);
        vec2 q = vec2(w.x, w.y + cdHash12(vec2(colI, 3.0)) * cs.y);
        vec2 cell = floor(q / cs), f = fract(q / cs);
        if (cdHash12(cell + 5.0) < 0.55) { float s = 0.3 + 0.4 * cdHash12(cell + 9.0); float side = step(s, f.x); cell += vec2(side * 0.5, 0.0); f.x = side > 0.5 ? (f.x - s) / (1.0 - s) : f.x / s; }
        float r = cdHash12(cell + 17.0), rowDir = cdHash12(cell + 23.0);
        vec3 c;
        float rows = 0.5 + 0.5 * sin((rowDir > 0.5 ? w.x : w.y) * 1.3);
        float rowsAA = 1.0 - smoothstep(0.3, 1.2, fwidth((rowDir > 0.5 ? w.x : w.y) * 1.3));
        if (r < 0.26) c = vec3(0.40, 0.50, 0.25) * (0.95 + 0.1 * cdNoise(w * 0.02));                          // pasture
        else if (r < 0.42) c = vec3(0.33, 0.47, 0.21) * (1.0 - 0.08 * rows * rowsAA);                           // crops
        else if (r < 0.52) c = mix(vec3(0.36, 0.53, 0.24), vec3(0.42, 0.58, 0.28), step(0.5, fract((rowDir > 0.5 ? w.x : w.y) / 30.0)));   // sod farm strips
        else if (r < 0.62) c = mix(vec3(0.26, 0.33, 0.17), vec3(0.15, 0.26, 0.10), (0.5 + 0.5 * sin(w.x * 0.9) * sin(w.y * 0.9)) * rowsAA * 0.8 + 0.2);   // citrus grove
        else if (r < 0.74) c = vec3(0.55, 0.53, 0.36) * (0.92 + 0.12 * cdNoise(w * 0.05));                     // dry grass
        else if (r < 0.84) c = vec3(0.50, 0.42, 0.30) * (1.0 - 0.1 * rows * rowsAA);                            // ploughed
        else c = vec3(0.47, 0.48, 0.33);                                                                         // fallow
        c = lin(c);
        vec2 e2 = min(f, 1.0 - f) * cs; float edge = min(e2.x, e2.y), fw = max(fwidth(edge), 0.001);
        float treeLine = step(0.6, cdHash12(cell + 31.0));
        c = mix(mix(c * 0.72, lin(vec3(0.16, 0.25, 0.12)), treeLine * 0.8), c, smoothstep(2.0 - fw, (treeLine > 0.5 ? 9.0 : 4.0) + fw, edge));
        c *= mix(0.86, 1.1, cdFbm3(w * 0.004));
        // pine woods and wet flatwoods over the grid (large, irregular)
        float wood = smoothstep(0.60, 0.66, cdFbm(w * 0.00042 + 3.0)) * smoothstep(2200.0, 3200.0, length(loc - vec2(300.0, -500.0)));
        // the canopy seen from above: crowns about 7 m across (nearest of jittered points), shaded, fading with distance
        vec2 cw = w / 7.0, ci = floor(cw); float dmin = 9.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 o = vec2(float(i), float(j)); vec2 fp = o + cdHash22(ci + o) * 0.8 + 0.1 - fract(cw); dmin = min(dmin, dot(fp, fp)); }
        float crownK = 1.0 - smoothstep(0.15, 0.6, fwidth(cw.x));
        float crown = mix(0.8, 0.55 + 0.6 * (1.0 - smoothstep(0.0, 0.5, dmin)), crownK);
        vec3 woods = lin(vec3(0.16, 0.25, 0.12)) * crown * (0.8 + 0.4 * cdNoise(w * 0.05)) * (0.85 + 0.3 * cdNoise(w * 0.011));
        c = mix(c, woods, wood);
        // the photo grass shows through the fields close by
        float gl = dot(gc.rgb, vec3(0.3, 0.5, 0.2));
        vec3 fields = c * mix(1.0, clamp(gl / 0.10, 0.6, 1.5), 1.0 - smoothstep(60.0, 400.0, dist));
        vec3 alb = mix(grass, fields, inField);
        // roads on a 1.9 km grid (some cells only), as in FLIGHT LAB
        vec2 rgd = abs(fract(w / 1900.0 + 0.5) - 0.5) * 1900.0; vec2 rc = floor(w / 1900.0 + 0.5);
        float roadX = rgd.x + (cdHash12(rc + vec2(5.0, 1.0)) < 0.55 ? 0.0 : 1e5), roadY = rgd.y + (cdHash12(rc + vec2(2.0, 9.0)) < 0.55 ? 0.0 : 1e5);
        float road = min(roadX, roadY), rw = max(fwidth(road), 0.01);
        float onRoad = (1.0 - smoothstep(3.5 - rw, 3.5 + rw, road)) * inField;
        alb = mix(alb, lin(vec3(0.36, 0.36, 0.35)) * (0.9 + 0.2 * cdNoise(w * 0.7)), onRoad);
        alb = mix(alb, lin(vec3(0.62, 0.60, 0.55)), (1.0 - smoothstep(4.0 - rw, 4.6 + rw, road)) * (1.0 - onRoad) * inField * 0.6);   // gravel verges
        // lake shores (the water itself is its own mesh in the hole)
        float wet = 0.0;
        for (int i = 0; i < 8; i++) {
          vec4 Lk = uLakes[i]; if (Lk.z <= 0.0) continue;
          vec2 q = w - Lk.xy; float a = atan(q.y, q.x), rr = Lk.z * (1.0 + 0.16 * sin(a * 3.0 + Lk.w) + 0.08 * sin(a * 7.0 + Lk.w * 2.0)), dl = length(q);
          float fl = max(fwidth(dl), 0.01);
          alb = mix(lin(vec3(0.62, 0.58, 0.45)), alb, smoothstep(rr + 5.0 - fl, rr + 11.0 + fl + 4.0 * cdNoise(w * 0.05), dl));
          wet = max(wet, 1.0 - smoothstep(rr, rr + 4.0, dl));
        }
        alb *= 1.0 - 0.35 * wet;
        // landmark rings around the training-point towers
        for (int i = 0; i < 8; i++) {
          vec4 Rg = uRings[i]; if (Rg.z <= 0.0) continue;
          float dr = abs(distance(w, Rg.xy) - Rg.z), fr = max(fwidth(dr), 0.01);
          alb = mix(uRingCol[i], alb, smoothstep(5.0 - fr, 9.0 + fr, dr));
        }
        diffuseColor.rgb *= alb;
        gRough = mix(mix(0.92, 1.0, gn.b), 0.97, inField) - 0.25 * wet - 0.25 * onRoad;
        float nk = (1.0 - smoothstep(25.0, 160.0, dist)) * uDetail;
        vec2 nxy = (gn.rg * 2.0 - 1.0) * 0.9 * nk;
        gNrm = normalize(vec3(nxy.x, 1.0, -nxy.y));
      `)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(gRough, 0.05, 1.0);')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(gNrm, 0.0)).xyz);');
  };
  mat.customProgramCacheKey = () => 'cadet-ground';

  // ---------------------------------------------------------------- the outer ground with holes (airfield, lakes)
  const S = 60000, cx = 0, cz = 0;
  const shape = new THREE.Shape([[cx - S, cz - S], [cx + S, cz - S], [cx + S, cz + S], [cx - S, cz + S]].map(([x, z]) => new THREE.Vector2(x, -z)));
  const hole = (pts) => new THREE.Path(pts.map(p => new THREE.Vector2(p[0], -p[2])));
  shape.holes.push(hole(L.regionCorners));
  for (const k of L.lakes) shape.holes.push(hole(k.ring));
  const outer = new THREE.ShapeGeometry(shape, 1);
  outer.rotateX(-Math.PI / 2);                                         // (x, y) → (x, 0, −y): back to local x / z
  outer.translate(0, G, 0);
  const ground = new THREE.Mesh(outer, mat); ground.receiveShadow = true; ground.name = 'ground-outer';
  group.add(ground);

  // ---------------------------------------------------------------- the airfield's grass cells (between the pavement)
  const pos = [];
  for (const c of L.grass) {
    const p = [[c.a0, c.c0], [c.a1, c.c0], [c.a1, c.c1], [c.a0, c.c1]].map(([a, cr]) => L.rwyToLocal(a, cr));
    pos.push(...p[0], ...p[2], ...p[1], ...p[0], ...p[3], ...p[2]);
  }
  const inner = new THREE.BufferGeometry();
  inner.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  fixUp(inner);
  inner.computeVertexNormals();
  const field = new THREE.Mesh(inner, mat); field.receiveShadow = true; field.name = 'ground-airfield';
  group.add(field);

  // ---------------------------------------------------------------- lakes
  const water = buildWater(L, G);
  group.add(water.mesh);

  return { group, material: mat, update: (t) => water.update(t) };
}

// make every triangle face up (+y)
function fixUp(geo) {
  const p = geo.attributes.position.array;
  for (let i = 0; i < p.length; i += 9) {
    const ax = p[i + 3] - p[i], az = p[i + 5] - p[i + 2], bx = p[i + 6] - p[i], bz = p[i + 8] - p[i + 2];
    if (az * bx - ax * bz < 0) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; }
  }
}

// the lakes: dark water reflecting the sky, two layers of moving ripples (normal map drawn at start-up)
function buildWater(L, G) {
  const nrm = canvasTexture(512, 512, (g, W, H) => {
    const img = g.createImageData(W, H), r = rng(7), waves = [];
    for (let i = 0; i < 24; i++) { const a = r() * Math.PI * 2, k = (1 + Math.floor(r() * 7)) * 2 * Math.PI / W; waves.push([Math.cos(a) * k * (1 + Math.floor(r() * 3)), Math.sin(a) * k * (1 + Math.floor(r() * 3)), r() * 6.283, 0.6 / (1 + i * 0.15)]); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let dx = 0, dy = 0;
      for (const [kx, ky, ph, a] of waves) { const c = Math.cos(kx * x + ky * y + ph) * a; dx += c * kx * W / 40; dy += c * ky * W / 40; }
      const nz = 1, l = Math.hypot(dx, dy, nz), i = (y * W + x) * 4;
      img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { srgb: false, repeat: true });
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.012, 0.035, 0.045), roughness: 0.06, metalness: 0, normalMap: nrm, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.0 });
  const U = { uTime: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWXZ; uniform float uTime;')
      .replace('#include <normal_fragment_maps>', /* glsl */`
        vec3 n1 = texture2D(normalMap, vWXZ / 37.0 + vec2(uTime * 0.011, uTime * 0.004)).xyz * 2.0 - 1.0;
        vec3 n2 = texture2D(normalMap, vWXZ / 13.0 * mat2(0.8, -0.6, 0.6, 0.8) - vec2(uTime * 0.017, -uTime * 0.009)).xyz * 2.0 - 1.0;
        vec3 mapN = normalize(vec3((n1.xy + n2.xy) * normalScale, 1.0));
        vec3 wn = normalize(vec3(mapN.x, mapN.z, -mapN.y));
        normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
      `);
  };
  mat.customProgramCacheKey = () => 'cadet-water';
  const geos = L.lakes.map(k => {
    const s = new THREE.Shape(k.ring.map(p => new THREE.Vector2(p[0], -p[2])));
    const g = new THREE.ShapeGeometry(s, 1); g.rotateX(-Math.PI / 2); g.translate(0, G, 0); return g;
  });
  const merged = mergeGeos(geos);
  const mesh = new THREE.Mesh(merged, mat); mesh.name = 'lakes'; mesh.receiveShadow = true;
  return { mesh, update: (t) => { U.uTime.value = t; } };
}

export function mergeGeos(geos) {
  let n = 0; for (const g of geos) n += (g.index ? g.index.count : g.attributes.position.count);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}
