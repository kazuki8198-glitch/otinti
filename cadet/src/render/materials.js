// CADET — render/materials.js : materials whose textures are laid out in metres from the object's own coordinates
// (so a wall of any size has the right texture scale, with no UV unwrapping), with the anti-tiling lookup.
import * as THREE from 'three';
import { NOISE } from './glsl.js';

// opts: { map, nr (normal RG + roughness B, packed), normalMap (plain), scale (m per tile), color, roughness, metalness,
//         uAxis: which object axis the texture's u follows on horizontal faces ('x' | 'z'), noTile, grime }
export function metricMaterial(opts) {
  const mat = new THREE.MeshStandardMaterial({ color: opts.color ?? 0xffffff, roughness: opts.roughness ?? 0.8, metalness: opts.metalness ?? 0, envMapIntensity: opts.env ?? 1 });
  const U = {
    tMap: { value: opts.map || null }, tNR: { value: opts.nr || opts.normalMap || null },
    uScale: { value: opts.scale ?? 2 }, uNS: { value: opts.normalStrength ?? 1 }, uGrime: { value: opts.grime ?? 0.25 },
  };
  const hasMap = !!opts.map, hasNR = !!(opts.nr || opts.normalMap), packed = !!opts.nr, uz = opts.uAxis === 'z';
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vON = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vOP; varying vec3 vON;
        uniform mat3 normalMatrix;           // (three.js sets it; declared here so the fragment stage can use it)
        uniform sampler2D tMap, tNR; uniform float uScale, uNS, uGrime;
        ${NOISE}
        vec2 mUV; vec3 mT, mB, mN; float mRough;
      `)
      .replace('#include <map_fragment>', /* glsl */`
        vec3 an = abs(vON);
        mB = vec3(0.0, 1.0, 0.0);
        if (an.y > an.x && an.y > an.z) { mUV = ${uz ? 'vOP.zx' : 'vOP.xz'}; mT = ${uz ? 'vec3(0.0, 0.0, 1.0)' : 'vec3(1.0, 0.0, 0.0)'}; mB = ${uz ? 'vec3(1.0, 0.0, 0.0)' : 'vec3(0.0, 0.0, 1.0)'}; }
        else if (an.x > an.z) { mUV = vec2(vOP.z * sign(vON.x), vOP.y); mT = vec3(0.0, 0.0, sign(vON.x)); }
        else { mUV = vec2(-vOP.x * sign(vON.z), vOP.y); mT = vec3(-sign(vON.z), 0.0, 0.0); }
        mN = normalize(vON);
        vec2 uvm = mUV / uScale;
        ${hasMap ? `vec4 mc = ${opts.noTile === false ? 'texture2D(tMap, uvm)' : 'cdTexNoTile(tMap, uvm, 0.37)'}; diffuseColor.rgb *= mc.rgb;` : ''}
        // weathering: darker towards the ground and in soft patches
        float gr = (1.0 - smoothstep(0.0, 1.6, vOP.y)) * 0.35 + smoothstep(0.55, 0.85, cdFbm(vOP.xz * 0.21 + vOP.y * 0.13)) * 0.5;
        diffuseColor.rgb *= 1.0 - uGrime * gr;
        mRough = roughness;
        ${hasNR ? `vec4 mnr = ${opts.noTile === false ? 'texture2D(tNR, uvm)' : 'cdTexNoTile(tNR, uvm, 0.37)'};` : ''}
        ${packed ? 'mRough = clamp(roughness * (0.6 + 0.8 * mnr.b), 0.04, 1.0);' : ''}
      `)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mRough;')
      .replace('#include <normal_fragment_maps>', hasNR ? /* glsl */`
        vec2 nxy = (mnr.rg * 2.0 - 1.0) * uNS;
        vec3 on = normalize(mN + mT * nxy.x + mB * nxy.y);
        normal = normalize(normalMatrix * on);
      ` : '');
  };
  mat.customProgramCacheKey = () => `cadet-metric-${hasMap}-${hasNR}-${packed}-${uz}-${opts.noTile === false}`;
  return mat;
}

// glass: smooth, dark, reflective; optional window pattern (map + mask) laid out per bay
export function glassMaterial({ map = null, mask = null, tint = 0x9fb6c6, emissive = 0xffc98a } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({ color: tint, map, roughness: 0.06, metalness: 0.0, envMapIntensity: 1.4, clearcoat: 0.0,
    emissive, emissiveMap: map, emissiveIntensity: 0 });
  if (mask) { mat.roughnessMap = mask; mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        float gm = texture2D(roughnessMap, vRoughnessMapUv).r; roughnessFactor = mix(0.55, 0.05, gm);
      #endif`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      // lit windows vary bay by bay (graphics plan C1): the panels' uv runs in bays, so a hash of the bay
      // leaves a few bays dark and the rest uneven — by day the emissive is 0 and nothing changes
      float bayH = fract(sin(floor(vMapUv.x) * 127.1) * 43758.5453);
      totalEmissiveRadiance *= mix(0.10, 0.78 + 0.45 * fract(bayH * 7.31), step(0.22, bayH));`);
    }; mat.customProgramCacheKey = () => 'cadet-glass-mask'; }
  return mat;
}

// clear glass for real windows: what is behind shows through, and the sky's reflection grows towards grazing angles
// (Fresnel) — the blend keeps the full reflection and dims what is behind by the same amount. Not in the AO pass.
// The env argument is the reflection's strength, applied in the shader itself: a material's envMapIntensity does
// not reach the image-based light in this renderer (scene.environmentIntensity overrides it — CLAUDE.md §6), so
// the specular part is scaled here instead. What is behind the glass is never dimmed by it: the blend divides the
// outgoing light by the same alpha that dims the background, so only the reflection grows.
// With rain: true the glass also carries the windshield rain below (droplets that sit, then run with the airflow).
export function clearGlassMaterial({ tint = 0x0b1216, env = 1.4, rain = false } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.08, depthWrite: false, envMapIntensity: env, side: THREE.DoubleSide });
  const U = { uEnvB: { value: env } };
  if (rain) Object.assign(U, glassRainU);
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uEnvB;
        ${rain ? `varying vec3 vGPos; varying vec3 vGNor; varying vec3 vGTu; varying vec3 vGTv;
        uniform float uRainAmt; uniform float uRainSpd; uniform float uRainT;
        float grHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }` : ''}`);
    if (rain) {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          varying vec3 vGPos; varying vec3 vGNor; varying vec3 vGTu; varying vec3 vGTv;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vGPos = position; vGNor = normal;
          vec3 gAn = abs(normal);
          vec3 gAu, gAv;
          if (gAn.z >= gAn.x && gAn.z >= gAn.y) { gAu = vec3(1.0, 0.0, 0.0); gAv = vec3(0.0, 1.0, 0.0); }
          else if (gAn.x >= gAn.y) { gAu = vec3(0.0, 0.0, 1.0); gAv = vec3(0.0, 1.0, 0.0); }
          else { gAu = vec3(1.0, 0.0, 0.0); gAv = vec3(0.0, 0.0, 1.0); }
          vGTu = normalMatrix * gAu; vGTv = normalMatrix * gAv;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          float gRainCov = 0.0;
          if (uRainAmt > 0.003) {
            // the pane's own axes (the windshield faces forward, the side windows out, by their normals): drops
            // rest in a grid over the pane, run down it under gravity at a standstill and are driven up and aft
            // by the airflow as the speed builds; the coverage thins as they are blown off
            vec3 gAn2 = abs(normalize(vGNor));
            vec2 guv, gGrav, gAir;
            if (gAn2.z >= gAn2.x && gAn2.z >= gAn2.y) { guv = vGPos.xy; gGrav = vec2(0.0, -1.0); gAir = normalize(vec2(vGPos.x * 0.45, 1.0)); }
            else if (gAn2.x >= gAn2.y) { guv = vec2(vGPos.z, vGPos.y); gGrav = vec2(0.0, -1.0); gAir = normalize(vec2(1.0, 0.18)); }
            else { guv = vGPos.xz; gGrav = vec2(0.0, 1.0); gAir = vec2(0.0, 1.0); }
            float airK = smoothstep(4.0, 22.0, uRainSpd);
            vec2 flow = normalize(mix(gGrav, gAir, airK));
            vec2 cell = guv * 55.0; vec2 cid = floor(cell); vec2 cf = fract(cell);
            float ch1 = grHash(cid), ch4 = grHash(cid + 9.37);
            vec2 ctr = 0.28 + 0.44 * vec2(grHash(cid + 7.13), grHash(cid + 3.71));
            vec2 dv = cf - ctr; float dd = length(dv);
            float rad = 0.14 + 0.20 * ch4;
            float drop = smoothstep(rad, rad * 0.30, dd) * step(ch1, uRainAmt * 0.92);
            vec2 grad = (dd > 1e-3 ? dv / dd : vec2(0.0)) * drop * (1.0 - drop) * 4.0;
            vec2 perp = vec2(-flow.y, flow.x);
            float fa = dot(guv, flow), fb = dot(guv, perp);
            float col = floor(fb * 85.0); float cch = grHash(vec2(col, 3.17));
            float rspd = mix(0.045, 0.9, airK) * (0.35 + 0.65 * grHash(vec2(col, 8.71)));
            float sPh = fract(fa * 2.0 - uRainT * rspd * 2.0 + cch * 7.0);
            float bead = smoothstep(0.34, 0.05, abs(sPh - 0.5)) * smoothstep(0.5, 0.12, abs(fract(fb * 85.0) - 0.5));
            float run = bead * step(cch, uRainAmt * (0.30 + 0.70 * airK));
            float mist = grHash(floor(guv * 300.0)) * 0.35 + grHash(floor(guv * 90.0) + 4.7) * 0.65;
            float cov = clamp(drop * 0.95 + run * 0.85 + mist * mist * 0.10, 0.0, 1.0);
            cov *= (0.30 + 0.70 * uRainAmt) * mix(1.0, 0.55, airK);
            normal = normalize(normal + (vGTu * grad.x + vGTv * grad.y) * 0.38 * (0.4 + 0.6 * uRainAmt));
            gRainCov = cov;
          }`);
    }
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', /* glsl */`
      float gF = 0.04 + 0.96 * pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 5.0);
      float gA = clamp(gF + opacity, 0.0, 0.92);
      vec3 gOut = outgoingLight + (reflectedLight.directSpecular + reflectedLight.indirectSpecular) * (uEnvB - 1.0);
      ${rain ? `if (uRainAmt > 0.003) {
        // the drops scatter a little of what is behind and catch the sky: kept slight — a PA-28 has no wipers,
        // and the view through the wet glass has to stay a working one
        gA = clamp(gA + gRainCov * 0.13, 0.0, 0.92);
        gOut += gRainCov * (reflectedLight.indirectSpecular * 2.4 + reflectedLight.directSpecular * 1.6 + vec3(0.012));
      }` : ''}
      gl_FragColor = vec4(gOut / gA, gA);`);
  };
  mat.customProgramCacheKey = () => (rain ? 'cadet-clear-glass-rain' : 'cadet-clear-glass');
  return mat;
}

// ================================================================ rain on the windshield (graphics plan B2)
// The state the glass shader reads: how hard it is raining (0..1, set by the title from its weather — the
// rendering side only reads it), the quality preset's share of it (the low preset turns the rain off), and the
// airflow over the glass (the indicated airspeed, knots). One set of uniforms, shared by every rain-carrying
// glass material; tickGlassRain eases the amount in and out (rain does not switch) and runs the clock the
// runners move by. No weather, no drops: at an amount of 0 the shader skips the droplet work entirely.
const glassRainU = { uRainAmt: { value: 0 }, uRainSpd: { value: 0 }, uRainT: { value: 0 } };
const glassRainState = { wx: 0, q: 1, amt: 0 };
export function setGlassRain(v) { glassRainState.wx = Math.max(0, Math.min(1, +v || 0)); }
export function setGlassRainQuality(v) { glassRainState.q = Math.max(0, Math.min(1, +v || 0)); }
export function tickGlassRain(dt, spdKt) {
  const s = glassRainState, target = s.wx * s.q;
  s.amt += (target - s.amt) * (1 - Math.exp(-Math.max(0, dt || 0) / 1.2));
  if (Math.abs(target - s.amt) < 0.001) s.amt = target;
  glassRainU.uRainAmt.value = s.amt;
  glassRainU.uRainSpd.value = Math.max(0, +spdKt || 0);
  glassRainU.uRainT.value += Math.max(0, dt || 0);
}
