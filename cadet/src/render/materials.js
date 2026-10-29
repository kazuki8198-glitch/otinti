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
  if (mask) { mat.roughnessMap = mask; mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        float gm = texture2D(roughnessMap, vRoughnessMapUv).r; roughnessFactor = mix(0.55, 0.05, gm);
      #endif`); }; mat.customProgramCacheKey = () => 'cadet-glass-mask'; }
  return mat;
}

// clear glass for real windows: what is behind shows through, and the sky's reflection grows towards grazing angles
// (Fresnel) — the blend keeps the full reflection and dims what is behind by the same amount. Not in the AO pass.
export function clearGlassMaterial({ tint = 0x0b1216, env = 1.4, alpha = 0.08 } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.03, metalness: 0, transparent: true, opacity: alpha, depthWrite: false, envMapIntensity: env, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', /* glsl */`
      float gF = 0.04 + 0.96 * pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 5.0);
      float gA = clamp(gF + opacity, 0.0, 0.92);
      gl_FragColor = vec4(outgoingLight / gA, gA);`);
  };
  mat.customProgramCacheKey = () => 'cadet-clear-glass';
  return mat;
}
