// CADET — aircraft/exterior.js : the aircraft as seen from outside: the Archer made in Blender (aircraft/archer-model.js:
// SHOYO AIRWAYS' colours, its registration), any other type from FLIGHT LAB's own description (FL.acmesh.buildParts),
// both as acmesh's parts — the fuselage, wings, tail, moving surfaces, propellers and gear, in the physics' body frame
// (x = right wing, y = up, −z = the nose). Each hinged part turns with the state on acmesh's hinge lines.
// Materials: glossy paint with a clear coat, dark glass, rubber, metal — told apart by the vertex colours acmesh uses;
// the model's ambient occlusion (baked per vertex) darkens the light from the sky (attribute ao, 1 for acmesh's).
// Parked aircraft are baked (two draw calls). The flown one (liveAircraft) stays alive: its propeller turns the way a
// Lycoming does and becomes a blurred disc at speed, the exterior lights glow (lenses and halos, no light sources), and
// the fuselage round the cabin is its own mesh, which the cockpit view takes away (seen from inside, the skin is culled
// but would still cast its shadow over the whole cockpit, and the cockpit draws its own cabin and cowling).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { exteriorParts } from './archer-model.js';

const DEG = Math.PI / 180;
const toLin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

// what the vertex colours stand for (linear values): the shader below and the tests use the same numbers.
// acmesh's struts (0.72, 0.73, 0.75) and hub caps (0.75, 0.75, 0.78) are slightly blue: |r − b| is 0.046 and 0.048.
export const PAINT_CLASSES = { glassMax: 0.05, glassBlue: 1.8, rubberMax: 0.02, metalMin: 0.35, metalMax: 0.6, metalTint: 0.06 };
export function paintClass(c) {
  const C = PAINT_CLASSES, mx = Math.max(c[0], c[1], c[2]);
  if (mx <= C.glassMax && c[2] >= c[0] * C.glassBlue) return 'glass';
  if (mx <= C.rubberMax) return 'rubber';
  if (mx >= C.metalMin && mx <= C.metalMax && Math.abs(c[0] - c[2]) <= C.metalTint) return 'metal';
  return 'paint';
}

let paintMat = null, propMat = null;
// the baked occlusion: the light from the sky (and the environment's reflections) scaled by it, the sun's left alone
// (the shadows do that)
function withAO(sh) {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float ao; varying float vAO;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAO = ao;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAO;')
    .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n  reflectedLight.indirectDiffuse *= vAO; reflectedLight.indirectSpecular *= mix(1.0, vAO, 0.7);');
}
function paintShader(sh) {
  const C = PAINT_CLASSES, f = v => v.toFixed(3);
  const metal = mx => `step(${f(C.metalMin)}, ${mx}) * step(abs(vColor.r - vColor.b), ${f(C.metalTint)}) * step(${mx}, ${f(C.metalMax)})`;
  withAO(sh);
  // (B2) the windows: a material's envMapIntensity never reaches the image-based light here (the scene's
  // environmentIntensity, 0.5, overrides it — CLAUDE.md §6), which leaves the glass returning only half the sky
  // it should. The glass class gets its share back in the shader: its sky reflection ×1.7, the paint, rubber and
  // metal untouched, and nothing behind the glass dimmed (the exterior glass is opaque: this is the reflection
  // of a real window, dark inside, the sky bright on it towards grazing angles by the Fresnel three already does)
  sh.fragmentShader = sh.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>
      #if defined( USE_COLOR )
        reflectedLight.indirectSpecular *= mix(1.0, 1.7, glass);
      #endif`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', /* glsl */`
      float roughnessFactor = roughness;
      #if defined( USE_COLOR )
        float mx = max(vColor.r, max(vColor.g, vColor.b));
        float glass = step(mx, ${f(C.glassMax)}) * step(vColor.r * ${f(C.glassBlue)}, vColor.b);   // the dark blue-grey windows
        float rubber = step(mx, ${f(C.rubberMax)}) * (1.0 - glass);                                 // tyres
        float metal = ${metal('mx')};                                                                // struts, hub caps
        roughnessFactor = mix(roughnessFactor, 0.03, glass);
        roughnessFactor = mix(roughnessFactor, 0.85, rubber);
        roughnessFactor = mix(roughnessFactor, 0.3, metal);
      #endif`)
    .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
      #if defined( USE_COLOR ) && defined( USE_CLEARCOAT )
        material.clearcoat *= 1.0 - rubber;
      #endif`)
    .replace('#include <metalnessmap_fragment>', `float metalnessFactor = metalness;
      #if defined( USE_COLOR )
        float mx3 = max(vColor.r, max(vColor.g, vColor.b));
        metalnessFactor = ${metal('mx3')} * 0.8;
      #endif`);
}

// the paint, plain or (detail 1: the Archer, 2: the Seminole) with the rivets and grime of paintDetailShader below
function makePaint(detail) {
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.06, envMapIntensity: 1.1 });
  m.onBeforeCompile = (sh) => { paintShader(sh); if (detail) paintDetailShader(sh, detail); };
  m.customProgramCacheKey = () => (detail ? 'cadet-ac-paint-d' + detail : 'cadet-ac-paint');
  return m;
}
// (B3) the spinner: in the models it is the propeller's one navy part (the blades are near-neutral black,
// their tips yellow; acmesh's propellers carry no spinner at all), and a real spinner is polished where the
// blades are satin. It is told apart by its colour — deep blue, b well over r — polished in the roughness,
// and its sky reflection is scaled up here for the reason the glass's is (B2): a material's envMapIntensity
// never reaches the image-based light in this scene (CLAUDE.md §6), so an unscaled spinner returns only
// half the sky a polished cone should.
function propShader(sh) {
  withAO(sh);
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      #if defined( USE_COLOR )
        float spin = step(vColor.r * 2.2, vColor.b) * step(0.004, vColor.b);   // the navy spinner
        roughnessFactor = mix(roughnessFactor, 0.16, spin);
      #endif`)
    .replace('reflectedLight.indirectSpecular *= mix(1.0, vAO, 0.7);',
      `reflectedLight.indirectSpecular *= mix(1.0, vAO, 0.7);
      #if defined( USE_COLOR )
        reflectedLight.indirectSpecular *= mix(1.0, 1.8, spin);
      #endif`);
}
function materials() {
  if (paintMat) return { paintMat, propMat };
  paintMat = makePaint(0);
  // the blades: black paint with acmesh's yellow tips (vertex colours)
  propMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 });
  propMat.onBeforeCompile = propShader;
  propMat.customProgramCacheKey = () => 'cadet-ac-prop';
  return { paintMat, propMat };
}

// the modelled types carry the detail variant of the paint; every other type (acmesh's own shapes, the 737) the plain
// one. The strength is the quality preset's (core/quality.js paintDetail), shared by both variants as one uniform.
const paintDetailU = { value: 1 };
export function setPaintDetail(v) { paintDetailU.value = Math.max(0, Math.min(1, +v || 0)); }
const paintVariants = {};
function paintFor(id) {
  materials();
  const d = id === 'pa28' ? 1 : id === 'pa44' ? 2 : 0;
  if (!d) return paintMat;
  return paintVariants[id] || (paintVariants[id] = makePaint(d));
}

// ================================================================ the paint's detail (graphics plan B1)
// Rivet rows along the panel joints the models already draw, the two joints they do not draw (the wing root's
// fairing edge, the tail cone's ring at the cabin's rear bulkhead), and the grime of a working trainer — exhaust
// soot, oil down the belly and under the nacelles, mud thrown up behind the wheels. All of it is worked out here,
// in the paint's shader, from the fragment's place on the airframe: the skin's meshes carry their positions in the
// body frame, so a seam is a curve in that frame and the detail sits on the skin itself — no triangles, no texture,
// no file size. Every anchor is a seam or a fitting the Blender scripts draw (build_archer.py, build_seminole.py:
// their seam outlines, their exhaust pipes) or a dimension of FLIGHT LAB's aircraft description (the wing, the
// gear), repeated here; the rivets are dots every 30 mm, 6.4 mm across, centred on the seam (the drawn ribbons
// under them are 6–7 mm wide). The lines and rivets fade out with distance (they would moiré), the grime later;
// the whole thing is scaled by the preset's paintDetail (setPaintDetail) and touches paint only — glass, rubber
// and metal keep their own finish.
const PD_HELPERS = /* glsl */`
varying vec3 vPPos;
uniform float uPaintDetail;
float pdHash(vec3 p) { p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float pdNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(pdHash(i), pdHash(i + vec3(1.0, 0.0, 0.0)), f.x),
                 mix(pdHash(i + vec3(0.0, 1.0, 0.0)), pdHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(pdHash(i + vec3(0.0, 0.0, 1.0)), pdHash(i + vec3(1.0, 0.0, 1.0)), f.x),
                 mix(pdHash(i + vec3(0.0, 1.0, 1.0)), pdHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
// a seam's rivets from (d, s): the distance off the seam and the length along it
float pdDots(vec2 ds) {
  float u = fract(ds.y / 0.030);
  float r = length(vec2((u - 0.5) * 0.030, ds.x));
  float aa = min(fwidth(ds.x) + fwidth(ds.y), 0.0030);
  return 1.0 - smoothstep(0.0032 - aa, 0.0032 + aa, r);
}
// a drawn joint: a dark line of half-width hw at distance d
float pdLine(float d, float hw) { float aa = fwidth(d); return 1.0 - smoothstep(hw - aa, hw + aa, d); }
// one straight run of a seam in a plane: p, its ends a and b, the length along the seam before it (s0);
// ds keeps the nearest run's (distance off the seam, length along the whole seam)
void pdRun(vec2 p, vec2 a, vec2 b, inout float s0, inout vec2 ds) {
  vec2 ba = b - a;
  float t = clamp(dot(p - a, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  float d = length(p - a - ba * t);
  if (d < ds.x) ds = vec2(d, s0 + t * length(ba));
  s0 += length(ba);
}
// the distance from a point to a streak on the skin (the exhaust's path), and how far along it (0..1)
vec2 pdSeg3(vec3 p, vec3 a, vec3 b) {
  vec3 pa = p - a, ba = b - a;
  float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  return vec2(length(pa - ba * t), t);
}`;

const PD_MAIN_OPEN = /* glsl */`
      {
        float pdK = uPaintDetail * (1.0 - glass) * (1.0 - rubber) * (1.0 - metal);
        if (pdK > 0.003) {
          vec3 pdPos = vPPos;
          float pdCam = length(vViewPosition);
          float pdLineK = pdK * (1.0 - smoothstep(14.0, 26.0, pdCam));
          float pdRivK = pdK * (1.0 - smoothstep(7.0, 15.0, pdCam));
          float pdGrimeK = pdK * (1.0 - smoothstep(30.0, 65.0, pdCam));
          float pdLineF = 0.0, pdRivF = 0.0, pdGAmt = 0.0;
          vec3 pdGCol = vec3(0.03);`;
const PD_MAIN_CLOSE = /* glsl */`
          diffuseColor.rgb *= 1.0 - pdLineK * 0.20 * pdLineF - pdRivK * 0.17 * pdRivF;
          roughnessFactor = clamp(roughnessFactor + pdLineK * 0.10 * pdLineF - pdRivK * 0.12 * pdRivF, 0.03, 1.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, pdGCol, pdGrimeK * pdGAmt * 0.55);
          roughnessFactor = mix(roughnessFactor, 0.88, pdGrimeK * pdGAmt * 0.65);
        }
      }`;

const PD_ARCHER = /* glsl */`
          // the Archer (build_archer.py: the seams it draws; its exhaust's mouth at (0.19, -0.60, -1.80); the gear
          // of FLIGHT LAB's description: the mains at x ±1.6, z 0.25, the nose wheel at z -2.3)
          vec2 pdDs = vec2(1e3, 0.0); float pdS0 = 0.0;
          // rivets round the cowling's rear joint (the ring at z -1.47; its ribbon runs from y -0.50 up the sides
          // and across the top) and along its split line (y 0.205 at the joint, by the script's own line)
          if (abs(pdPos.x) < 0.62 && pdPos.y > -0.50 && pdPos.y < 0.48)
            pdRivF = max(pdRivF, pdDots(vec2(abs(pdPos.z + 1.47), atan(pdPos.y + 0.05, pdPos.x) * 0.52)));
          if (pdPos.z > -3.15 && pdPos.z < -1.47 && abs(pdPos.x) > 0.30)
            pdRivF = max(pdRivF, pdDots(vec2(abs(pdPos.y - (0.205 - 0.02 * (pdPos.z + 1.47))), pdPos.z)));
          // the tail cone's ring at the cabin's rear bulkhead (z 1.70, where the model's two skins meet)
          if (abs(pdPos.x) < 0.50 && pdPos.y > -0.44 && pdPos.y < 0.69) {
            pdLineF = max(pdLineF, pdLine(abs(pdPos.z - 1.70), 0.0022));
            pdRivF = max(pdRivF, pdDots(vec2(abs(pdPos.z - 1.70), atan(pdPos.y - 0.13, pdPos.x) * 0.45)));
          }
          // the wing root: the fairing's edge on the wing just outboard of the skin (x ±0.605), chordwise
          {
            float pdAx = abs(pdPos.x);
            float pdLe = -1.00 + (pdAx - 0.55) * 0.0309, pdTe = pdLe + 1.60 - (pdAx - 0.55) * 0.0825;
            float pdWy = -0.45 + (pdAx - 0.55) * 0.1228;
            if (pdPos.z > pdLe - 0.02 && pdPos.z < pdTe + 0.02 && abs(pdPos.y - pdWy) < 0.135) {
              pdLineF = max(pdLineF, pdLine(abs(pdAx - 0.605), 0.0022));
              pdRivF = max(pdRivF, pdDots(vec2(abs(pdAx - 0.605), pdPos.z)));
            }
          }
          // the cabin door and the baggage door (the right side; their outlines in (z, y), as the script draws them)
          if (pdPos.x > 0.30) {
            vec2 pdP = pdPos.zy;
            pdRun(pdP, vec2(-1.10, -0.30), vec2(-0.16, -0.30), pdS0, pdDs);
            pdRun(pdP, vec2(-0.16, -0.30), vec2(-0.16, 0.80), pdS0, pdDs);
            pdRun(pdP, vec2(-0.16, 0.80), vec2(-0.70, 0.80), pdS0, pdDs);
            pdRun(pdP, vec2(-0.70, 0.80), vec2(-1.12, 0.47), pdS0, pdDs);
            pdRun(pdP, vec2(-1.12, 0.47), vec2(-1.10, -0.30), pdS0, pdDs);
            pdRivF = max(pdRivF, pdDots(pdDs));
            pdDs = vec2(1e3, 0.0); pdS0 = 0.0;
            pdRun(pdP, vec2(1.24, -0.18), vec2(1.62, -0.16), pdS0, pdDs);
            pdRun(pdP, vec2(1.62, -0.16), vec2(1.60, 0.33), pdS0, pdDs);
            pdRun(pdP, vec2(1.60, 0.33), vec2(1.25, 0.36), pdS0, pdDs);
            pdRun(pdP, vec2(1.25, 0.36), vec2(1.24, -0.18), pdS0, pdDs);
            pdRivF = max(pdRivF, pdDots(pdDs));
          }
          // the oil door on the cowling's top (its outline in (x, z))
          if (pdPos.y > 0.28) {
            vec2 pdP = pdPos.xz;
            pdDs = vec2(1e3, 0.0); pdS0 = 0.0;
            pdRun(pdP, vec2(0.20, -2.70), vec2(0.44, -2.70), pdS0, pdDs);
            pdRun(pdP, vec2(0.44, -2.70), vec2(0.44, -2.40), pdS0, pdDs);
            pdRun(pdP, vec2(0.44, -2.40), vec2(0.20, -2.40), pdS0, pdDs);
            pdRun(pdP, vec2(0.20, -2.40), vec2(0.20, -2.70), pdS0, pdDs);
            pdRivF = max(pdRivF, pdDots(pdDs));
          }
          // exhaust soot: from the pipe's mouth aft along the lower right skin, spreading and thinning
          {
            vec2 pdSd = pdSeg3(pdPos, vec3(0.19, -0.60, -1.80), vec3(0.34, -0.70, -0.45));
            float pdR = mix(0.09, 0.23, pdSd.y);
            float pdAmt = (1.0 - smoothstep(pdR * 0.5, pdR, pdSd.x)) * (1.0 - pdSd.y) * (0.45 + 0.55 * pdNoise(pdPos * 6.0)) * 0.55;
            if (pdAmt > pdGAmt) { pdGAmt = pdAmt; pdGCol = vec3(0.030, 0.027, 0.024); }
          }
          // oil: a thin streak down the belly from the cowling's underside
          {
            vec2 pdSd = pdSeg3(pdPos, vec3(0.0, -0.53, -1.55), vec3(0.02, -0.565, 0.30));
            float pdAmt = (1.0 - smoothstep(0.045, 0.095, pdSd.x)) * (0.35 + 0.65 * pdNoise(pdPos * 9.0 + 3.7)) * 0.34;
            if (pdAmt > pdGAmt) { pdGAmt = pdAmt; pdGCol = vec3(0.020, 0.017, 0.014); }
          }
          // mud: a speckle thrown up behind the main wheels (z 0.25) and the nose wheel (z -2.3)
          {
            float pdSpk = step(0.70, pdNoise(pdPos * 30.0)) * (0.45 + 0.55 * pdNoise(pdPos * 8.0 + 9.1));
            float pdAmt = smoothstep(0.30, 0.45, pdPos.z) * (1.0 - smoothstep(0.85, 1.30, pdPos.z))
              * (1.0 - smoothstep(0.26, 0.48, abs(abs(pdPos.x) - 1.6)))
              * smoothstep(-1.24, -1.06, pdPos.y) * (1.0 - smoothstep(-0.58, -0.40, pdPos.y)) * pdSpk * 0.42;
            float pdN = smoothstep(-2.32, -2.20, pdPos.z) * (1.0 - smoothstep(-1.75, -1.45, pdPos.z))
              * (1.0 - smoothstep(0.18, 0.36, abs(pdPos.x))) * step(pdPos.y, -0.40) * pdSpk * 0.34;
            pdAmt = max(pdAmt, pdN);
            if (pdAmt > pdGAmt) { pdGAmt = pdAmt; pdGCol = vec3(0.055, 0.045, 0.032); }
          }`;
const PD_SEMINOLE = /* glsl */`
          // the Seminole (build_seminole.py: the seams it draws — its cabin and baggage doors are the Archer's
          // outlines moved by its DZ -0.2, DY -0.04; the nacelles at x ±1.95, their exhausts under the outer side
          // with the mouths at x ±2.18, y -0.66, z -0.42; the gear: the mains at x ±1.6, z 0.30, the nose at z -2.5)
          vec2 pdDs = vec2(1e3, 0.0); float pdS0 = 0.0;
          // rivets round the nose cone's joint (the ring at z -2.95; its ribbon runs y -0.28..0.15 and across the top)
          if (abs(pdPos.x) < 0.40 && pdPos.y > -0.38 && pdPos.y < 0.24)
            pdRivF = max(pdRivF, pdDots(vec2(abs(pdPos.z + 2.95), atan(pdPos.y + 0.08, pdPos.x) * 0.34)));
          // rivets round each nacelle's cowling joint (the ring at z -0.95; the section's centre is y -0.355)
          for (int pdI = 0; pdI < 2; pdI++) {
            vec2 pdQ = vec2(pdPos.x - (pdI == 0 ? -1.95 : 1.95), pdPos.y + 0.355);
            float pdL = length(pdQ);
            if (abs(pdPos.z + 0.95) < 0.03 && pdL > 0.20 && pdL < 0.42)
              pdRivF = max(pdRivF, pdDots(vec2(abs(pdPos.z + 0.95), atan(pdQ.y, pdQ.x) * 0.32)));
          }
          // the tail cone's ring at the cabin's rear bulkhead (z 1.80, where the model's two skins meet)
          if (abs(pdPos.x) < 0.50 && pdPos.y > -0.45 && pdPos.y < 0.65) {
            pdLineF = max(pdLineF, pdLine(abs(pdPos.z - 1.80), 0.0022));
            pdRivF = max(pdRivF, pdDots(vec2(abs(pdPos.z - 1.80), atan(pdPos.y - 0.10, pdPos.x) * 0.44)));
          }
          // the wing root: the fairing's edge on the wing just outboard of the skin (x ±0.655), chordwise
          {
            float pdAx = abs(pdPos.x);
            float pdLe = -1.00 + (pdAx - 0.60) * 0.0473, pdTe = pdLe + 1.75 - (pdAx - 0.60) * 0.0947;
            float pdWy = -0.45 + (pdAx - 0.60) * 0.1228;
            if (pdPos.z > pdLe - 0.02 && pdPos.z < pdTe + 0.02 && abs(pdPos.y - pdWy) < 0.135) {
              pdLineF = max(pdLineF, pdLine(abs(pdAx - 0.655), 0.0022));
              pdRivF = max(pdRivF, pdDots(vec2(abs(pdAx - 0.655), pdPos.z)));
            }
          }
          // the cabin door and the baggage door (the right side; their outlines in (z, y), as the script draws them)
          if (pdPos.x > 0.30) {
            vec2 pdP = pdPos.zy;
            pdRun(pdP, vec2(-1.30, -0.34), vec2(-0.36, -0.34), pdS0, pdDs);
            pdRun(pdP, vec2(-0.36, -0.34), vec2(-0.36, 0.76), pdS0, pdDs);
            pdRun(pdP, vec2(-0.36, 0.76), vec2(-0.90, 0.76), pdS0, pdDs);
            pdRun(pdP, vec2(-0.90, 0.76), vec2(-1.32, 0.43), pdS0, pdDs);
            pdRun(pdP, vec2(-1.32, 0.43), vec2(-1.30, -0.34), pdS0, pdDs);
            pdRivF = max(pdRivF, pdDots(pdDs));
            pdDs = vec2(1e3, 0.0); pdS0 = 0.0;
            pdRun(pdP, vec2(1.16, -0.22), vec2(1.56, -0.20), pdS0, pdDs);
            pdRun(pdP, vec2(1.56, -0.20), vec2(1.54, 0.30), pdS0, pdDs);
            pdRun(pdP, vec2(1.54, 0.30), vec2(1.17, 0.33), pdS0, pdDs);
            pdRun(pdP, vec2(1.17, 0.33), vec2(1.16, -0.22), pdS0, pdDs);
            pdRivF = max(pdRivF, pdDots(pdDs));
          }
          // the nose baggage door (the left side)
          if (pdPos.x < -0.25) {
            vec2 pdP = pdPos.zy;
            pdDs = vec2(1e3, 0.0); pdS0 = 0.0;
            pdRun(pdP, vec2(-2.70, -0.20), vec2(-1.95, -0.22), pdS0, pdDs);
            pdRun(pdP, vec2(-1.95, -0.22), vec2(-1.95, 0.22), pdS0, pdDs);
            pdRun(pdP, vec2(-1.95, 0.22), vec2(-2.62, 0.16), pdS0, pdDs);
            pdRun(pdP, vec2(-2.62, 0.16), vec2(-2.70, -0.20), pdS0, pdDs);
            pdRivF = max(pdRivF, pdDots(pdDs));
          }
          // exhaust soot and oil under each nacelle: the soot aft from the pipe's mouth, the oil from the cowl flap
          for (int pdI = 0; pdI < 2; pdI++) {
            float pdSg = pdI == 0 ? -1.0 : 1.0;
            vec2 pdSd = pdSeg3(pdPos, vec3(pdSg * 2.18, -0.66, -0.42), vec3(pdSg * 2.25, -0.71, 0.85));
            float pdR = mix(0.09, 0.22, pdSd.y);
            float pdAmt = (1.0 - smoothstep(pdR * 0.5, pdR, pdSd.x)) * (1.0 - pdSd.y) * (0.45 + 0.55 * pdNoise(pdPos * 6.0 + pdSg * 5.3)) * 0.55;
            if (pdAmt > pdGAmt) { pdGAmt = pdAmt; pdGCol = vec3(0.030, 0.027, 0.024); }
            pdSd = pdSeg3(pdPos, vec3(pdSg * 1.95, -0.685, -0.90), vec3(pdSg * 1.95, -0.665, 0.35));
            pdAmt = (1.0 - smoothstep(0.05, 0.10, pdSd.x)) * (0.35 + 0.65 * pdNoise(pdPos * 9.0 + pdSg * 2.9)) * 0.28;
            if (pdAmt > pdGAmt) { pdGAmt = pdAmt; pdGCol = vec3(0.020, 0.017, 0.014); }
          }
          // mud behind the main wheels (z 0.30) and the nose wheel (z -2.5)
          {
            float pdSpk = step(0.70, pdNoise(pdPos * 30.0)) * (0.45 + 0.55 * pdNoise(pdPos * 8.0 + 9.1));
            float pdAmt = smoothstep(0.35, 0.50, pdPos.z) * (1.0 - smoothstep(0.90, 1.35, pdPos.z))
              * (1.0 - smoothstep(0.28, 0.50, abs(abs(pdPos.x) - 1.6)))
              * smoothstep(-1.28, -1.08, pdPos.y) * (1.0 - smoothstep(-0.62, -0.44, pdPos.y)) * pdSpk * 0.38;
            float pdN = smoothstep(-2.50, -2.38, pdPos.z) * (1.0 - smoothstep(-1.85, -1.55, pdPos.z))
              * (1.0 - smoothstep(0.18, 0.36, abs(pdPos.x))) * step(pdPos.y, -0.44) * pdSpk * 0.32;
            pdAmt = max(pdAmt, pdN);
            if (pdAmt > pdGAmt) { pdGAmt = pdAmt; pdGCol = vec3(0.055, 0.045, 0.032); }
          }
          // the static ports on the aft fuselage (B4): a flush rim and a dark hole on each side at z 2.40 —
          // the walk-around's place on the left; the skin there stands at |x| 0.369 at this height (read off
          // the model: the loft between the spec's rings bows out past a straight interpolation). Drawn here
          // because a port is a hole in the skin, not a part on it: the rim takes the seam darkening, the
          // hole the grime channel.
          for (int pdI = 0; pdI < 2; pdI++) {
            float pdSx = pdI == 0 ? -0.368 : 0.368;
            float pdD = length(pdPos - vec3(pdSx, 0.05, 2.40));
            pdLineF = max(pdLineF, (1.0 - smoothstep(0.0075, 0.0095, pdD)) * smoothstep(0.0042, 0.0060, pdD));
            float pdHole = 1.0 - smoothstep(0.0028, 0.0042, pdD);
            if (pdHole * 0.9 > pdGAmt) { pdGAmt = pdHole * 0.9; pdGCol = vec3(0.012); }
          }`;

// ================================================================ the tyres' tread (graphics plan B3)
// The tread of a working trainer's tyres, worked out — like B1's detail — from the fragment's place on the
// airframe: three circumferential grooves and fine sipes round each axle, as a height (tdHeight: metres,
// negative in a groove) that the paint shader reads as darker, rougher rubber and, at the normals, as a dip.
// The wheels' places and sizes are the models' own (build_archer.py / build_seminole.py's wheel(): the
// section's radius runs R − 0.055 at the rim to R at the crown; FLIGHT LAB's gear: the axle centres, the
// radius; the widths are the scripts'). Only the rubber the paint shader found, only near a wheel, only
// close up (past ~14 m the grooves would alias) — and the wheel fairings hide the tyres' tops anyway.
// (B4: the grooves a step deeper and wider, and the normal dip stronger — at the walk-around's half metre
// the first cut read only faintly on near-black rubber.)
const TD_COMMON = /* glsl */`
float tdWheel(vec3 p, vec3 c, float w, float R) {
  vec2 q = vec2(p.y - c.y, p.z - c.z);
  float r = length(q);
  float sinA = clamp((r - (R - 0.055)) / 0.055, 0.0, 1.0);   // round the section: 0 at the rim, 1 at the crown
  float crown = smoothstep(0.35, 0.80, sinA) * (1.0 - smoothstep(w * 0.5 - 0.012, w * 0.5, abs(p.x - c.x)));
  if (crown <= 0.0) return 0.0;
  float u = p.x - c.x;
  float g = exp(-pow(u / 0.0075, 2.0)) + exp(-pow((abs(u) - w * 0.30) / 0.0075, 2.0));
  float th = atan(q.y, q.x);
  float sipe = max(0.0, sin(th * 60.0 + abs(u) * 30.0)) * 0.35;
  return crown * (-0.0042 * min(g, 1.2) - 0.0011 * sipe) + crown * (pdNoise(p * 110.0) - 0.5) * 0.0005;
}`;
const TD_WHEELS = {
  1: /* glsl */`
float tdHeight(vec3 p) {
  return tdWheel(p, vec3(1.6, -1.15, 0.25), 0.15, 0.25) + tdWheel(p, vec3(-1.6, -1.15, 0.25), 0.15, 0.25)
       + tdWheel(p, vec3(0.0, -1.15, -2.30), 0.13, 0.25);
}`,
  2: /* glsl */`
float tdHeight(vec3 p) {
  return tdWheel(p, vec3(1.6, -1.20, 0.30), 0.16, 0.27) + tdWheel(p, vec3(-1.6, -1.20, 0.30), 0.16, 0.27)
       + tdWheel(p, vec3(0.0, -1.20, -2.50), 0.13, 0.27);
}`,
};
const TD_MAIN = /* glsl */`
      {
        float tdK = uPaintDetail * rubber * (1.0 - smoothstep(8.0, 14.0, length(vViewPosition)));
        if (tdK > 0.003) {
          float tdH = tdHeight(vPPos);
          diffuseColor.rgb *= 1.0 + tdK * tdH * 78.0;
          roughnessFactor = clamp(roughnessFactor - tdK * tdH * 55.0, 0.05, 1.0);
        }
      }`;
// ================================================================ the hubs' bolt circles (graphics plan B4)
// Six bolts round each axle, on the hub's outboard end face (the disc the scripts' wheel() fans shut at
// 0.42 of the width, its radius the outer hub radius): darker, rougher metal than the hub around them.
// Worked out from the airframe place like B1's rivets — no new geometry, no texture. Seminole hubs stand
// uncovered at the walk-around; the Archer's sit behind its wheel fairings, where they cost nothing.
const HB_COMMON = /* glsl */`
float hbBolts(vec3 p, vec3 c, float w, float R) {
  float face = 1.0 - smoothstep(0.004, 0.010, abs(abs(p.x - c.x) - w * 0.42));
  if (face <= 0.0) return 0.0;
  vec2 q = vec2(p.y - c.y, p.z - c.z);
  float ring = 1.0 - smoothstep(0.007, 0.012, abs(length(q) - (R - 0.165)));
  if (ring <= 0.0) return 0.0;
  float d = 0.5 - abs(fract(atan(q.y, q.x) / 1.047198) - 0.5);   // 0 at a bolt's angle, 0.5 between two
  return face * ring * (1.0 - smoothstep(0.07, 0.105, d));
}`;
const HB_MAIN = /* glsl */`
      {
        float hbK = uPaintDetail * metal * (1.0 - smoothstep(4.0, 7.0, length(vViewPosition)));
        if (hbK > 0.003) {
          float hbB = hbHeight(vPPos);
          diffuseColor.rgb *= 1.0 - hbK * hbB * 0.38;
          roughnessFactor = clamp(roughnessFactor + hbK * hbB * 0.30, 0.05, 1.0);
        }
      }`;
const HB_WHEELS = {
  1: /* glsl */`
float hbHeight(vec3 p) {
  return hbBolts(p, vec3(1.6, -1.15, 0.25), 0.15, 0.25) + hbBolts(p, vec3(-1.6, -1.15, 0.25), 0.15, 0.25)
       + hbBolts(p, vec3(0.0, -1.15, -2.30), 0.13, 0.25);
}`,
  2: /* glsl */`
float hbHeight(vec3 p) {
  return hbBolts(p, vec3(1.6, -1.20, 0.30), 0.16, 0.27) + hbBolts(p, vec3(-1.6, -1.20, 0.30), 0.16, 0.27)
       + hbBolts(p, vec3(0.0, -1.20, -2.50), 0.13, 0.27);
}`,
};
// the tread's dip, by the screen-space derivatives of its own height (the way three's bump mapping turns a
// height into a normal, written out here for a height that is a function of the airframe place)
const TD_NORMAL = /* glsl */`
      #if defined( USE_COLOR )
      {
        float mxN = max(vColor.r, max(vColor.g, vColor.b));
        float glassN = step(mxN, 0.050) * step(vColor.r * 1.800, vColor.b);
        float rubN = step(mxN, 0.020) * (1.0 - glassN);
        float tdNK = uPaintDetail * rubN * (1.0 - smoothstep(8.0, 14.0, length(vViewPosition)));
        if (tdNK > 0.003) {
          float tdH = tdHeight(vPPos);
          vec2 tdD = vec2(dFdx(tdH), dFdy(tdH)) * (1.0 * tdNK);
          vec3 tdSx = dFdx(-vViewPosition), tdSy = dFdy(-vViewPosition);
          vec3 tdR1 = cross(tdSy, normal), tdR2 = cross(normal, tdSx);
          float tdDet = dot(tdSx, tdR1);
          vec3 tdGrad = sign(tdDet) * (tdD.x * tdR1 + tdD.y * tdR2);
          normal = normalize(abs(tdDet) * normal - tdGrad);
        }
      }
      #endif`;

function paintDetailShader(sh, type) {
  if (!sh.uniforms) sh.uniforms = {};
  sh.uniforms.uPaintDetail = paintDetailU;
  sh.vertexShader = sh.vertexShader
    .replace('attribute float ao; varying float vAO;', 'attribute float ao; varying float vAO;\nvarying vec3 vPPos;')
    .replace('vAO = ao;', 'vAO = ao;\n  vPPos = position;');
  sh.fragmentShader = sh.fragmentShader
    .replace('varying float vAO;', 'varying float vAO;\n' + PD_HELPERS + TD_COMMON + TD_WHEELS[type] + HB_COMMON + HB_WHEELS[type])
    .replace('roughnessFactor = mix(roughnessFactor, 0.3, metal);',
      'roughnessFactor = mix(roughnessFactor, 0.3, metal);' + PD_MAIN_OPEN + (type === 1 ? PD_ARCHER : PD_SEMINOLE) + PD_MAIN_CLOSE + TD_MAIN + HB_MAIN)
    .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + TD_NORMAL);
}

// (M8) the paint's material and a geometry from a model's mesh, for the other models drawn with them (the epilogue's 737)
export const paintMaterial = () => materials().paintMat;
export const meshGeometry = (m) => geometryOf(m);

// one aircraft model; update(s) turns the hinged parts from a physics state (or a parked state)
// opts: { lod: 'near' | 'far', reg } (the Archer's model: its detail, the registration painted on it)
export function buildAircraftModel(FL, A, opts = {}) {
  const { propMat } = materials(); const paintMat = paintFor(A.id);
  const root = new THREE.Group(); root.name = 'aircraft-' + A.id;
  const hinges = [];
  for (const p of exteriorParts(FL, A, opts)) {
    if (p.disc != null) continue;                                     // the spinning disc: only the flown aircraft (liveAircraft)
    const g = p.cabin ? mergeGeometries([geometryOf(p.mesh), geometryOf(p.cabin)]) : geometryOf(p.mesh);
    const mesh = new THREE.Mesh(g, p.name === 'prop' ? propMat : paintMat);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = p.name;
    if (p.pivot && p.angle) {
      const pivot = new THREE.Group(); pivot.position.set(...p.pivot);
      mesh.position.set(-p.pivot[0], -p.pivot[1], -p.pivot[2]);
      pivot.add(mesh); root.add(pivot);
      hinges.push({ pivot, axis: new THREE.Vector3(...p.axis), angle: p.angle });
    } else root.add(mesh);
  }
  return {
    root,
    update(s) { for (const h of hinges) h.pivot.quaternion.setFromAxisAngle(h.axis, h.angle(s) || 0); },
  };
}

// a parked aircraft: a physics state at rest on its wheels (so the hinges and the height come from FLIGHT LAB).
// opt: { prop (the blades' angle), elev, bake (false: the parts kept apart), reg (the registration), lod: 'near' |
// 'far' | 'auto' (the Archer and the Seminole: near within LOD_FAR metres of the eye, far beyond: both baked, one drawn) }
export const LOD_FAR = 20;
export function parkedAircraft(FL, L, id, along, cross, hdgTrue, opt = {}) {
  const P = FL.physics, s = P.newState({ aircraft: id });
  const [n, e] = P.rwyToNE(L.R, along, cross);
  s.q = P.qFromHPB(hdgTrue, 0, 0);
  s.pos = [e, P.GROUND_M - s.WHEEL_BOTTOM + 0.01, -n];
  s.thr = 0; s.flapIdx = 0; s.flapDeg = 0; s.gearDown = true; s.gearPos = 1; s.propAng = opt.prop ?? 0.6;
  for (const en of s.eng) en.ang = opt.prop ?? 0.6;
  s.elev = opt.elev ?? -0.15; s.ail = 0; s.rud = 0;
  const lod = opt.lod || 'near', reg = opt.reg;
  const m = buildAircraftModel(FL, s.A, { lod: lod === 'far' ? 'far' : 'near', reg });
  m.update(s);
  const lp = L.physToLocal(s.pos);
  if (opt.bake !== false) bake(m.root);
  if (lod === 'auto' && (s.A.id === 'pa28' || s.A.id === 'pa44') && opt.bake !== false) {
    // both details baked under an LOD (the renderer picks one per camera); the colliders come from the near one
    const far = buildAircraftModel(FL, s.A, { lod: 'far', reg }); far.update(s); bake(far.root);
    const near = new THREE.Group(), lo = new THREE.Group(); near.name = 'lod-near'; lo.name = 'lod-far';
    for (const c of [...m.root.children]) near.add(c);
    for (const c of [...far.root.children]) { c.userData.lodFar = true; lo.add(c); }
    const sw = new THREE.LOD(); sw.name = 'aircraft-lod'; sw.addLevel(near, 0); sw.addLevel(lo, LOD_FAR);
    m.root.add(sw);
  }
  m.root.position.set(lp[0], lp[1], lp[2]);
  m.root.quaternion.set(s.q[0], s.q[1], s.q[2], s.q[3]);
  return { ...m, state: s };
}

// a parked aircraft does not move its controls: its parts (hinges set) become one mesh per material (two draw calls)
function bake(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map(), inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), m4 = new THREE.Matrix4();
  root.traverse(o => { if (o.isMesh) { const g = o.geometry.clone().applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld)); if (!byMat.has(o.material)) byMat.set(o.material, []); byMat.get(o.material).push(g); } });
  for (const c of [...root.children]) root.remove(c);
  for (const [mat, geos] of byMat) {
    const mesh = new THREE.Mesh(mergeGeometries(geos.map(g => (g.index ? g.toNonIndexed() : g))), mat);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'aircraft-baked'; root.add(mesh);
  }
}

// colliders for walking around a parked aircraft: its triangles' footprints on a grid of `cell` metres in the runway
// frame (toFrame(x, z) → [fx, fz]), each cell with the lowest and highest point over it, merged into runs along x.
// Tight for an aircraft parked square to the runway (wings, tail, gear legs each block where they stand; nothing low
// enough to step over or high enough to walk under, as with a real low-wing trainer).
export function colliderBoxes(root, toFrame, G, cell = 0.25) {
  root.updateMatrixWorld(true);
  const cells = new Map(), v = new THREE.Vector3(), inv = 1 / cell;
  root.traverse(o => {
    if (!o.isMesh || o.userData.lodFar) return;
    const pos = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : pos.count;
    for (let t = 0; t + 2 < n; t += 3) {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let j = 0; j < 3; j++) {
        v.fromBufferAttribute(pos, idx ? idx.getX(t + j) : t + j).applyMatrix4(o.matrixWorld);
        const [fx, fz] = toFrame(v.x, v.z);
        x0 = Math.min(x0, fx); x1 = Math.max(x1, fx); z0 = Math.min(z0, fz); z1 = Math.max(z1, fz); y0 = Math.min(y0, v.y - G); y1 = Math.max(y1, v.y - G);
      }
      for (let i = Math.floor(x0 * inv); i <= Math.floor(x1 * inv); i++) for (let k = Math.floor(z0 * inv); k <= Math.floor(z1 * inv); k++) {
        const key = i + ',' + k, c = cells.get(key);
        if (c) { c[2] = Math.min(c[2], y0); c[3] = Math.max(c[3], y1); } else cells.set(key, [i, k, y0, y1]);
      }
    }
  });
  const rows = new Map();
  for (const c of cells.values()) { if (!rows.has(c[1])) rows.set(c[1], []); rows.get(c[1]).push(c); }
  const out = [];
  for (const [k, row] of rows) {
    row.sort((p, q) => p[0] - q[0]);
    let run = null;
    for (const c of row) {
      if (run && c[0] === run.i1 + 1) { run.i1 = c[0]; run.y0 = Math.min(run.y0, c[2]); run.y1 = Math.max(run.y1, c[3]); continue; }
      if (run) out.push(run);
      run = { i0: c[0], i1: c[0], y0: c[2], y1: c[3] };
    }
    if (run) out.push(run);
    for (let j = out.length - 1; j >= 0 && out[j].k === undefined; j--) out[j].k = k;
  }
  return out.map(r => ({ x0: r.i0 * cell, x1: (r.i1 + 1) * cell, z0: r.k * cell, z1: (r.k + 1) * cell, y0: Math.max(0, r.y0), y1: r.y1 }));
}

// ================================================================ the flown aircraft
export const BLADES_OFF = 900;          // rpm: faster than this the blades are seen only as the disc (FLIGHT LAB's rule)
export const DISC_ON = 60;              // rpm: slower than this there is no blur to draw
const SMEAR_S = 0.013;                  // s: how long the eye smears a blade over (a whole half-turn from ≈ 2300 rpm);
                                        // a longer frame smears over the whole frame, so that the frames join up
const DISC_DRIFT = 2 * Math.PI * 1.4;   // rad/s: with the blades hidden, the blur's pattern turns this fast (≈ 85 rpm)
const DISC_GAIN = { out: 3.4, in: 1.2 };   // the disc is barely there from the seat, as in a real cockpit
const CABIN_AFT = 2.05;                 // m behind the eye: the cockpit's aft bulkhead (the cabin skin ends at the next ring)
const BEACON_T = 0.95;                  // s per turn of the rotating beacon (a flash each turn)
const STROBE_T = 1.2, STROBE_GAP = 0.13, STROBE_LEN = 0.045;   // a double flash every 1.2 s
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const NONE = Object.freeze({}), DARK = Object.freeze({});

function fuseAt(F, z) {
  for (let i = 0; i < F.length - 1; i++) { const a = F[i], b = F[i + 1]; if (z <= b[0]) { const t = Math.min(1, Math.max(0, (z - a[0]) / (b[0] - a[0]))); return a.map((v, k) => v + (b[k] - v) * t); } }
  return F[F.length - 1];
}
// where the cabin section of the fuselage ends: the first acmesh ring at or behind the cockpit's aft bulkhead
export function cabinRear(A) {
  const z = A.eye[2] + CABIN_AFT;
  for (const f of A.fuse) if (f[0] >= z - 1e-6) return f[0];
  return A.fuse[A.fuse.length - 1][0];
}

// the body's triangles in two lists, by centroid: the cabin section (the fuselage skin ahead of zRear with its caps, the
// nose cowling, the painted windows and windscreen) and the rest (wings, fin, nacelles, the tail cone). The fuselage
// skin is told from the wing roots inside it by the superellipse it was lofted on (acmesh: 22 points, exponent 2.5).
export function splitBody(m, A, zRear = cabinRear(A)) {
  const F = A.fuse, z0 = F[0][0], z1 = F[F.length - 1][0], nose = A.engines.some(e => e.type === 'nose');
  const p = m.pos, c = m.col, cabin = [], rest = [];
  const glass = o => Math.abs(c[o] - 0.10) < 1e-4 && Math.abs(c[o + 1] - 0.14) < 1e-4 && Math.abs(c[o + 2] - 0.19) < 1e-4;
  for (let t = 0, n = m.count / 3; t < n; t++) {
    const o = t * 9, cx = (p[o] + p[o + 3] + p[o + 6]) / 3, cy = (p[o + 1] + p[o + 4] + p[o + 7]) / 3, cz = (p[o + 2] + p[o + 5] + p[o + 8]) / 3;
    let cab = false;
    if (glass(o) && glass(o + 3) && glass(o + 6)) cab = true;
    else if (cz < z0 - 1e-6) cab = nose && Math.abs(cx) < F[0][1] + 0.02;            // the cowling ahead of the fuselage
    else if (cz < zRear && cz <= z1 + 1e-6) {
      const f = fuseAt(F, cz), e = Math.pow(Math.abs(cx) / f[1], 2.5) + Math.pow(Math.abs(cy - f[3]) / f[2], 2.5);
      cab = (e > 0.9 && e < 1.04) || Math.abs(cz - z0) < 1e-6;
    }
    (cab ? cabin : rest).push(t);
  }
  return { cabin, rest };
}

// a BufferGeometry from an acmesh mesh (sRGB vertex colours → linear), optionally only some triangles, optionally shifted
function geometryOf(m, tris = null, shift = null) {
  const n = tris ? tris.length : m.count / 3, pos = new Float32Array(n * 9), nrm = new Float32Array(n * 9), col = new Float32Array(n * 9), ao = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = tris ? tris[i] : i;
    for (let k = 0; k < 9; k++) { pos[i * 9 + k] = m.pos[t * 9 + k] + (shift ? shift[k % 3] : 0); nrm[i * 9 + k] = m.nrm[t * 9 + k]; col[i * 9 + k] = toLin(m.col[t * 9 + k]); }
    for (let k = 0; k < 3; k++) ao[i * 3 + k] = m.ao ? m.ao[t * 3 + k] : 1;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('ao', new THREE.BufferAttribute(ao, 1));
  return g;
}

// the propeller's disc: what the eye keeps of two blades turning (no texture: drawn from the position on the disc).
// Each blade covers its own width plus the arc it swept during SMEAR_S; over that arc it is seen for (width / arc) of
// the time, so it thins out as it speeds up until, past half a turn, the disc is even — darker towards the hub where
// the blades are wide, with a yellow ring from the tips. The disc turns with the blades (it is under the same pivot);
// once they are hidden its pattern drifts slowly on its own (uPhase, from where the blades were): following the real
// angle — 120° a frame at 1200 rpm and 60 fps — it would strobe, or seem to turn backwards.
function discMaterial(e, dir) {
  const U = {
    uR: { value: e.r }, uHub: { value: 0.1 }, uTip: { value: e.r - 0.09 }, uDir: { value: dir },
    uSweep: { value: 0 }, uPhase: { value: 0 }, uAlpha: { value: 0 }, uGain: { value: DISC_GAIN.out },
    uBlade: { value: new THREE.Vector3(toLin(0.13), toLin(0.13), toLin(0.14)) }, uTipC: { value: new THREE.Vector3(toLin(0.95), toLin(0.78), toLin(0.15)) },
  };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, envMapIntensity: 0.5, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vDP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvDP = position.xy;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vDP; uniform float uR, uHub, uTip, uDir, uSweep, uPhase, uAlpha, uGain; uniform vec3 uBlade, uTipC;')
      .replace('#include <map_fragment>', /* glsl */`
      {
        float rr = length(vDP);
        float f = clamp((rr - uHub) / (uR - uHub), 0.0, 1.0);
        float aw = min(2.0 * uR * 0.09 * (1.0 - 0.4 * f) * cos(0.45 - 0.3 * f) / max(rr, 0.02), 1.4);   // a blade's width here (rad)
        float span = aw + min(uSweep, PI);                                         // what one blade covered in the smear
        float d = mod(uDir * (atan(vDP.y, vDP.x) - 0.5 * PI - uPhase) + 0.5 * aw, PI);   // radians behind a leading edge
        float full = smoothstep(0.7 * PI, PI, span);                               // half a turn smeared: an even disc
        float m = mix(smoothstep(0.0, 0.04, d) * (1.0 - smoothstep(0.55 * span, span, d)), 1.0, full);
        float cov = aw / clamp(span, aw, PI);                                      // the share of the time a point is covered
        // (B3) the eye keeps more of the disc than that share: it integrates over several turns and reads the
        // blur as one sheet, so the cover is spread a little towards even — outboard, where the blades are
        // narrow and cov fades to almost nothing, the sheet stays faintly there — and the yellow tips (the
        // outer 9 cm of a blade: uTip is their inner edge) gather into their own arc, a thin ring just inside
        // the rim, while the rim itself feathers out over its last 12 mm instead of ending on a hard circle
        float sheet = mix(cov, 0.30, 0.25);
        float tip = smoothstep(uTip - 0.006, uTip + 0.010, rr);
        float arc = exp(-pow((rr - (uR - 0.020)) / 0.007, 2.0));
        float a = uAlpha * clamp(sheet * uGain * (1.0 + 0.30 * tip) + arc * uGain * 0.16, 0.0, 0.9) * m;
        a *= smoothstep(uHub, uHub + 0.05, rr) * (1.0 - smoothstep(uR - 0.012, uR, rr));
        diffuseColor = vec4(mix(uBlade, uTipC, clamp(tip + arc * 0.4, 0.0, 1.0)), a);
      }`);
  };
  mat.customProgramCacheKey = () => 'cadet-prop-disc';
  return { mat, U };
}

// ---------------------------------------------------------------- exterior lights
// where they are on the airframe (body frame) and what they look like. Nav lights: red left tip, green right tip (each
// seen from ahead to 110° to its side), white on the tail cone (140° aft); the red beacon on the fin top; white strobes
// in the tip lenses; landing and taxi lights in the lower nose, looking ahead (a design choice: the Archer III family
// carries them in the cowling); a twin with its engines on the wings (the Seminole) has them in the nose's point.
const L_COL = { red: [1.0, 0.045, 0.02], green: [0.04, 1.0, 0.32], white: [1.0, 0.94, 0.86], xenon: [0.9, 0.95, 1.0], led: [1.0, 0.96, 0.9] };
export function lightSpots(A) {
  const w = A.wing, tipY = w.y + (w.tipX - w.rootX) * Math.tan(w.dih * DEG), navZ = w.tipLE + 0.16 * w.tipC;
  const F = A.fuse, end = F[F.length - 1], vs = A.vstab, hs = A.hstab;
  const finLE = y => vs.rootLE + (vs.topLE - vs.rootLE) * (y - vs.y0) / (vs.y1 - vs.y0);
  const tTail = hs.y >= vs.y1 - 0.2;                                              // a T-tail: on the fin's leading edge, below the stabilator
  const beacon = tTail ? [0, vs.y1 - 0.16, finLE(vs.y1 - 0.16) - 0.03] : [0, vs.y1 + 0.03, (vs.topLE + vs.hinge) / 2];
  const zl = F[0][0] + 0.12, f = fuseAt(F, zl), kx = Math.pow(Math.cos(40 * DEG), 0.8), ky = Math.pow(Math.sin(40 * DEG), 0.8);
  const nose = A.engines[0].type === 'wing' ? s => [s * 0.055, F[0][3] - 0.035, F[0][0] - 0.035] : s => [s * f[1] * kx * 0.98, f[3] - f[2] * ky * 0.98, zl - 0.012];
  const side = (s, deg) => [s * Math.sin(deg * DEG), 0, -Math.cos(deg * DEG)];
  const fwd = (x, y) => { const l = Math.hypot(x, y, 1); return [x / l, y / l, -1 / l]; };
  // size: the halo's radius (m), at most `ang` (the tangent of its angular radius: glare is in the eye, so a lamp close
  // by does not fill the view); cone: [cos of the outer edge, cos of the inner edge, sharpness], cone[0] < −1: all round.
  // glow: the halo's strength; lens: the lens's own glow, kept low for the coloured ones so that by day (AgX turns
  // anything much brighter white) a red lens still looks red — at night the halo does the glowing
  return [
    { id: 'navL', pos: [-(w.tipX + 0.012), tipY, navZ], col: L_COL.red, size: 0.4, ang: 0.022, glow: 2.2, lens: 4, axis: side(-1, 55), cone: [Math.cos(82 * DEG), Math.cos(55 * DEG), 1], lensId: 0 },
    { id: 'navR', pos: [w.tipX + 0.012, tipY, navZ], col: L_COL.green, size: 0.4, ang: 0.022, glow: 2.2, lens: 3, axis: side(1, 55), cone: [Math.cos(82 * DEG), Math.cos(55 * DEG), 1], lensId: 1 },
    { id: 'tail', pos: [0, end[3], end[0] + 0.012], col: L_COL.white, size: 0.28, ang: 0.018, glow: 1.6, lens: 5, axis: [0, 0, 1], cone: [Math.cos(92 * DEG), Math.cos(70 * DEG), 1], lensId: 2 },
    { id: 'beacon', pos: beacon, col: L_COL.red, size: 0.7, ang: 0.03, glow: 10, lens: 7, axis: [0, 1, 0], cone: [-2, -1, 1], lensId: 3 },
    { id: 'strobeL', pos: [-(w.tipX + 0.02), tipY, navZ + 0.02], col: L_COL.xenon, size: 0.9, ang: 0.045, glow: 50, lens: 90, axis: [0, 1, 0], cone: [-2, -1, 1], lensId: 0 },
    { id: 'strobeR', pos: [w.tipX + 0.02, tipY, navZ + 0.02], col: L_COL.xenon, size: 0.9, ang: 0.045, glow: 50, lens: 90, axis: [0, 1, 0], cone: [-2, -1, 1], lensId: 1 },
    { id: 'landing', pos: nose(-1), col: L_COL.led, size: 0.85, ang: 0.05, glow: 40, lens: 40, axis: fwd(-0.02, -0.06), cone: [Math.cos(35 * DEG), Math.cos(6 * DEG), 3], lensId: 4 },
    { id: 'taxi', pos: nose(1), col: L_COL.led, size: 0.6, ang: 0.04, glow: 24, lens: 30, axis: fwd(0.14, -0.14), cone: [Math.cos(50 * DEG), Math.cos(12 * DEG), 2], lensId: 5 },
  ];
}

const GLOW_VS = /* glsl */`
  attribute vec2 corner; attribute float lid; attribute float amax; attribute vec3 axis; attribute vec3 cone;
  uniform vec4 uL[8]; uniform float uMin;
  varying vec3 vC; varying vec2 vQ;
  void main() {
    vec4 L = uL[int(lid + 0.5)];
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = max(length(mv.xyz), 1e-4);
    vec3 toCam = -mv.xyz / dist;
    float k = 1.0;                                                       // the lamp's beam or sector, seen from here
    if (cone.x > -1.5) k = pow(smoothstep(cone.x, cone.y, dot(normalize(mat3(modelViewMatrix) * axis), toCam)), cone.z);
    vC = L.rgb * k;
    mv.xyz += toCam * min(L.w, dist * 0.5);                              // in front of the wingtip or the nose it sits on
    float sy = L.w * projectionMatrix[1][1] / max(-mv.z, 1e-3), s = clamp(sy, uMin, max(amax * projectionMatrix[1][1], uMin));
    vC *= clamp(sy / s, 0.25, 1.0);                                      // far away: a small dot that dims slowly
    vQ = corner;
    vec4 cp = projectionMatrix * mv;
    cp.xy += corner * vec2(s * projectionMatrix[0][0] / projectionMatrix[1][1], s) * cp.w;
    gl_Position = (vC.r + vC.g + vC.b > 1e-4) ? cp : vec4(0.0, 0.0, 2.0, 1.0);   // off: outside the view
  }`;
// (B3) the halo's skirt: beyond the core's two falls, a wide faint wash (the last term below) — the light
// bleeding into the dark at night and, where the halo lies over the fin, a wingtip or the nose, the lamp's
// spill on its own airframe. Its strength is the quality preset's glowDetail (setGlowQuality, wired like
// B1's paintDetail and B2's glassRain); the core is the preset's at every level, and the skirt's share is
// small enough at the centre that a lamp lit by day does not grow a second sun.
const glowQualityU = { value: 1 };
export function setGlowQuality(v) { glowQualityU.value = Math.max(0, Math.min(1, +v || 0)); }
const GLOW_FS = /* glsl */`
  varying vec3 vC; varying vec2 vQ; uniform float uGlowQ;
  void main() {
    float r2 = dot(vQ, vQ);
    if (r2 >= 1.0) discard;
    gl_FragColor = vec4(vC * (0.55 * exp(-r2 * 5.0) * (1.0 - r2) + exp(-r2 * 48.0) + uGlowQ * 0.14 * exp(-r2 * 1.15) * (1.0 - r2)), 1.0);
  }`;

function buildLights(spots) {
  // the lenses: small domes and discs, one mesh; each lens glows with its slot of uLens
  const tint = { 0: [0.5, 0.05, 0.04], 1: [0.05, 0.45, 0.22], 3: [0.55, 0.05, 0.04] }, clear = [0.62, 0.64, 0.68];
  const shapes = [];
  for (const sp of spots) {
    if (sp.id.startsWith('strobe')) continue;                                       // inside the nav lights' lenses
    let g;
    if (sp.id.startsWith('nav')) g = new THREE.SphereGeometry(1, 10, 6).scale(0.03, 0.026, 0.07);
    else if (sp.id === 'tail') g = new THREE.SphereGeometry(0.026, 8, 6);
    else if (sp.id === 'beacon') g = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.04, 0.05, 0.04);
    else g = new THREE.CylinderGeometry(0.045, 0.045, 0.014, 16).rotateX(Math.PI / 2).lookAt(new THREE.Vector3(...sp.axis));
    g.translate(...sp.pos);
    const n = g.attributes.position.count, rgb = (tint[sp.lensId] || clear).map(toLin), col = new Float32Array(n * 3), lid = new Float32Array(n).fill(sp.lensId);
    for (let i = 0; i < n; i++) col.set(rgb, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('lid', new THREE.BufferAttribute(lid, 1));
    shapes.push(g.index ? g.toNonIndexed() : g);
  }
  const lensU = { uLens: { value: Array.from({ length: 6 }, () => new THREE.Vector3()) } };
  const lensMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0, envMapIntensity: 1.2 });
  lensMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, lensU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float lid; uniform vec3 uLens[6]; varying vec3 vLit;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLit = uLens[int(lid + 0.5)];');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLit;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vLit;');
  };
  lensMat.customProgramCacheKey = () => 'cadet-ac-lens';
  const lens = new THREE.Mesh(mergeGeometries(shapes), lensMat); lens.name = 'lights';
  shapes.forEach(g => g.dispose());
  // the halos: a quad per lamp, turned to the camera in the vertex shader (one draw call for all of them)
  const n = spots.length, pos = new Float32Array(n * 12), corner = new Float32Array(n * 8), lid = new Float32Array(n * 4), amax = new Float32Array(n * 4), axis = new Float32Array(n * 12), cone = new Float32Array(n * 12), idx = [];
  const C = [-1, -1, 1, -1, 1, 1, -1, 1];
  spots.forEach((sp, i) => {
    for (let v = 0; v < 4; v++) { const j = i * 4 + v; pos.set(sp.pos, j * 3); axis.set(sp.axis, j * 3); cone.set(sp.cone, j * 3); corner[j * 2] = C[v * 2]; corner[j * 2 + 1] = C[v * 2 + 1]; lid[j] = i; amax[j] = sp.ang; }
    idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gg.setAttribute('corner', new THREE.BufferAttribute(corner, 2));
  gg.setAttribute('lid', new THREE.BufferAttribute(lid, 1)); gg.setAttribute('amax', new THREE.BufferAttribute(amax, 1)); gg.setAttribute('axis', new THREE.BufferAttribute(axis, 3)); gg.setAttribute('cone', new THREE.BufferAttribute(cone, 3));
  gg.setIndex(idx);
  const glowU = { uL: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) }, uMin: { value: 0.0035 }, uGlowQ: glowQualityU };
  const glowMat = new THREE.ShaderMaterial({ uniforms: glowU, vertexShader: GLOW_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true, fog: false });
  const glow = new THREE.Mesh(gg, glowMat); glow.name = 'light-glow'; glow.frustumCulled = false;
  for (const m of [lens, glow]) { m.castShadow = false; m.receiveShadow = false; }
  lens.receiveShadow = true;
  return { lens, glow, lensU: lensU.uLens.value, glowU: glowU.uL.value, geos: [lens.geometry, gg], mats: [lensMat, glowMat] };
}

// a strobe flash anywhere in (t0, t1] (or at t1 when paused): none is missed at a low frame rate
function flashIn(t0, t1) {
  const n1 = Math.floor(t1 / STROBE_T);
  for (let n = n1 - 1; n <= n1; n++) for (let k = 0; k < 2; k++) {
    const a = n * STROBE_T + k * STROBE_GAP;
    if (a <= t1 && a + STROBE_LEN > t0) return true;
  }
  return false;
}

// the flown aircraft: liveAircraft(FL, A, { cabinRear }) → { root, update(s, { dt, rpmVisual, lights, inside }),
// setInside(v), cabin, parts, spots, dispose }. Pose the root from the physics (position, quaternion) every frame.
// parts: body (with the parts that never move, named in parts.fixed: the Archer's gear), cabin, each hinged part by
// name, props / discs (prop / disc: the first engine's), lights (the lenses), glow (the halos).
// rpmVisual (a number, or one per engine) overrides the engines' rpm for the eye — an engine start or stop — and the
// propeller then turns by it; otherwise the blades sit at the physics' own angle. lights: { nav, beacon, strobe,
// landing, taxi } (true/false or 0..1). inside (or setInside): the cockpit view, where the cabin section is not drawn
// and casts no shadow, and the disc is fainter.
export function liveAircraft(FL, A, opts = {}) {
  const { propMat } = materials(); const paintMat = paintFor(A.id);
  const root = new THREE.Group(); root.name = 'aircraft-live-' + A.id;
  const parts = { props: [], discs: [] }, hinges = [], props = [], geos = [], mats = [];
  const zRear = opts.cabinRear ?? cabinRear(A);
  const raw = exteriorParts(FL, A, { lod: 'near', reg: opts.reg });
  const discOf = new Map(raw.filter(p => p.disc != null).map(p => [p.disc, p]));
  const mesh = (geo, mat, name, cast = true) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; geos.push(geo); return m; };
  // the parts that never move (the Archer's fixed gear legs) go into the body's mesh: one draw call for all of them
  const fixed = [];
  parts.fixed = [];
  for (const p of raw) {
    if (p.disc != null) continue;
    if (p.name === 'body') {
      if (p.cabin) {                                                   // the model's: already apart (at its cabin's rear ring)
        fixed.unshift(geometryOf(p.mesh));
        root.add(parts.cabin = mesh(geometryOf(p.cabin), paintMat, 'cabin'));
        continue;
      }
      const { cabin, rest } = splitBody(p.mesh, A, zRear);
      fixed.unshift(geometryOf(p.mesh, rest));
      root.add(parts.cabin = mesh(geometryOf(p.mesh, cabin), paintMat, 'cabin'));
      continue;
    }
    if (!(p.pivot && p.angle) && p.prop == null) { fixed.push(geometryOf(p.mesh)); parts.fixed.push(p.name); continue; }
    const m = mesh(geometryOf(p.mesh), p.prop != null ? propMat : paintMat, p.name);
    const pivot = new THREE.Group(); pivot.name = p.name + '-pivot'; pivot.position.set(...p.pivot);
    m.position.set(-p.pivot[0], -p.pivot[1], -p.pivot[2]);
    pivot.add(m); root.add(pivot);
    if (p.prop == null) { hinges.push({ pivot, axis: new THREE.Vector3(...p.axis), angle: p.angle }); parts[p.name] = m; continue; }
    // a propeller: its blades and its disc under one pivot; acmesh turns it counter-clockwise seen from the cockpit
    // (+z), a Lycoming turns the other way: the angle is negated (and the twin's right engine still turns opposite)
    const e = A.engines[0], sign = A.counterRotating && p.prop === 1 ? -1 : 1, dp = discOf.get(p.prop);
    const { mat, U } = discMaterial(e, sign); mats.push(mat);
    const disc = mesh(geometryOf(dp.mesh, null, [-p.pivot[0], -p.pivot[1], -p.pivot[2]]), mat, 'disc', false);
    disc.geometry.deleteAttribute('color'); disc.visible = false; pivot.add(disc);
    props.push({ idx: p.prop, sign, angle: p.angle, pivot, blades: m, disc, U, ang: 0, vang: 0, rpm: 0 });
    parts.props.push(m); parts.discs.push(disc);
  }
  const bodyGeo = fixed.length > 1 ? mergeGeometries(fixed) : fixed[0];
  if (fixed.length > 1) fixed.forEach(g => g.dispose());
  root.add(parts.body = mesh(bodyGeo, paintMat, 'body'));
  parts.prop = parts.props[0]; parts.disc = parts.discs[0];
  const spots = lightSpots(A), lt = buildLights(spots);
  root.add(lt.lens, lt.glow); parts.lights = lt.lens; parts.glow = lt.glow;
  geos.push(...lt.geos); mats.push(...lt.mats);
  const slot = {};
  spots.forEach((sp, i) => { slot[sp.id] = { sp, glow: lt.glowU[i], lens: lt.lensU[sp.lensId] }; });
  const S = { navL: slot.navL, navR: slot.navR, tail: slot.tail, beacon: slot.beacon, strobeL: slot.strobeL, strobeR: slot.strobeR, landing: slot.landing, taxi: slot.taxi };
  let inside = false, clock = 0.37;

  function setInside(v) {
    inside = !!v;
    parts.cabin.visible = !inside; parts.cabin.castShadow = !inside;
    for (const pr of props) pr.U.uGain.value = inside ? DISC_GAIN.in : DISC_GAIN.out;
  }

  // ---- per frame (no allocation: the tests read this part of the source)
  function glowSet(sl, k) {
    const c = sl.sp.col, g = k * sl.sp.glow;
    sl.glow.set(c[0] * g, c[1] * g, c[2] * g, sl.sp.size);
  }
  function lensAdd(sl, k) {
    const c = sl.sp.col, g = k * sl.sp.lens;
    sl.lens.x += c[0] * g; sl.lens.y += c[1] * g; sl.lens.z += c[2] * g;
  }
  function lightsUpdate(o, dt) {
    const t0 = clock; clock += dt;
    const nav = +o.nav || 0, strobe = +o.strobe || 0, land = +o.landing || 0, taxi = +o.taxi || 0;
    const ph = (clock / BEACON_T) % 1, beacon = (+o.beacon || 0) * (0.03 + Math.exp(-((ph - 0.5) / 0.07) * ((ph - 0.5) / 0.07)));
    const flash = strobe > 0 && flashIn(t0, clock) ? strobe : 0;
    for (let i = 0; i < 6; i++) lt.lensU[i].set(0, 0, 0);
    glowSet(S.navL, nav); glowSet(S.navR, nav); glowSet(S.tail, nav); glowSet(S.beacon, beacon);
    glowSet(S.strobeL, flash); glowSet(S.strobeR, flash); glowSet(S.landing, land); glowSet(S.taxi, taxi);
    lensAdd(S.navL, nav); lensAdd(S.navR, nav); lensAdd(S.tail, nav); lensAdd(S.beacon, beacon);
    lensAdd(S.strobeL, flash); lensAdd(S.strobeR, flash); lensAdd(S.landing, land); lensAdd(S.taxi, taxi);
  }
  function update(s, o) {
    if (!o) o = NONE;
    const dt = o.dt > 0 ? Math.min(o.dt, 0.25) : 0;
    if ((o.inside === true || o.inside === false) && o.inside !== inside) setInside(o.inside);
    for (let i = 0; i < hinges.length; i++) { const h = hinges[i]; h.pivot.quaternion.setFromAxisAngle(h.axis, h.angle(s) || 0); }
    const rv = o.rpmVisual;
    for (let i = 0; i < props.length; i++) {
      const pr = props[i], e = s.eng ? s.eng[pr.idx] : null;
      let rpm;
      if (rv == null) { rpm = e ? e.rpm : s.rpm; pr.ang = -(pr.angle(s) || 0); }
      else { rpm = typeof rv === 'number' ? rv : rv[pr.idx]; if (rpm > 0) pr.ang = (pr.ang - pr.sign * rpm / 60 * 2 * Math.PI * dt) % (2 * Math.PI); }
      if (!(rpm > 0)) rpm = 0;
      pr.rpm = rpm;
      pr.pivot.quaternion.setFromAxisAngle(Z_AXIS, pr.ang);
      pr.blades.visible = rpm < BLADES_OFF;
      pr.disc.visible = rpm > DISC_ON;
      // the arc smeared: what the eye keeps, or at a low frame rate all the way back to the last frame's blade (at
      // 60 fps and 800 rpm the blades jump 80° a frame; their smears join them up)
      pr.U.uSweep.value = rpm / 60 * 2 * Math.PI * (dt > SMEAR_S ? dt : SMEAR_S);
      // the pattern: on the blades while they are seen, then drifting the way they turn, from where they were
      if (rpm < BLADES_OFF) pr.vang = pr.ang;
      else pr.vang = (pr.vang - pr.sign * DISC_DRIFT * dt) % (2 * Math.PI);
      pr.U.uPhase.value = (pr.vang - pr.ang) % (2 * Math.PI);
      pr.U.uAlpha.value = THREE.MathUtils.smoothstep(rpm, DISC_ON, 500);
    }
    lightsUpdate(o.lights || DARK, dt);
  }
  // ---- end of the per-frame code

  setInside(false);
  return {
    root, cabin: parts.cabin, parts, spots, zRear,
    update, setInside,
    get inside() { return inside; },
    get rpm() { return props.length ? props[0].rpm : 0; },
    dispose() { root.removeFromParent(); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); },
  };
}
