// CADET — render/indoor.js : light inside buildings.
// The sky's image-based light reaches every surface the same way, roofs or not; inside the academy that would light the
// rooms as if they were outdoors. So every lit material's indirect light (the sky's diffuse and reflections, the
// ambient) is scaled by where the surface is: 1 outdoors, about 0.5 next to the ribbon windows, 0.15–0.2 deep inside,
// in between in the double-height glass lobby and the open hangar. Direct sunlight still comes in through the windows
// (the shadows decide). The ceiling lights near the player are a small pool of point lights; the eye adapts
// (exposure) when walking in and out.
import * as THREE from 'three';

let installed = false;
// a, c in the runway frame; the boxes are fixed at start-up (as constants in the shader: no new uniforms needed)
export function installIndoorShading(L, A) {
  if (installed) return; installed = true;
  const cy = Math.cos(L.frameYaw).toFixed(8), sy = Math.sin(L.frameYaw).toFixed(8), G = L.G.toFixed(4);
  const f = (v) => Number(v).toFixed(3);
  const fn = /* glsl */`
    // 1 outdoors; less indirect light inside the academy and the hangars (CADET)
    float cdIndoorK(vec3 viewPos) {
      vec3 w = cameraPosition + transpose(mat3(viewMatrix)) * (-viewPos);
      float fx = w.x * ${cy} - w.z * ${sy}, fz = w.x * ${sy} + w.z * ${cy}, y = w.y - ${G};
      float a = -fz, c = fx;
      // the academy: the ground floor and the lobby
      if (a > ${f(A.a0 + 0.38)} && a < ${f(A.a1 - 0.38)} && c > ${f(A.c0 + 0.38)} && c < ${f(A.c1 - 0.38)} && y < ${f(A.H - 0.25)}) {
        bool lobby = a > ${f(A.lob0)} && a < ${f(A.lob1)};
        if (lobby) return 0.55 - 0.25 * smoothstep(${f(A.glassC + 2)}, ${f(A.c1)}, c);
        if (y > ${f(A.slab)}) return 0.05;
        float dw = min(c - ${f(A.c0 + A.wall)}, ${f(A.c1 - A.wall)} - c);
        float de = min(a - ${f(A.a0 + A.wall)}, ${f(A.a1 - A.wall)} - a);
        return 0.17 + 0.38 * exp(-min(dw, de) / 2.2);
      }
      if (c > ${f(A.c0 - 0.05)} && c < ${f(A.c0 + 0.38)} && a > ${f(A.lob0)} && a < ${f(A.lob1)} && y < ${f(A.H)}) return 1.0;
      // the hangars (one open towards the apron, one shut)
      if (a > 536.3 && a < 589.7 && c > 241.3 && c < 281.7 && y < 10.5) return mix(0.45, 0.2, smoothstep(242.0, 270.0, c));
      if (a > 470.3 && a < 519.7 && c > 241.3 && c < 281.7 && y < 10.0) return 0.12;
      return 1.0;
    }`;
  THREE.ShaderChunk.lights_pars_begin = THREE.ShaderChunk.lights_pars_begin + '\n' + fn;
  THREE.ShaderChunk.lights_fragment_maps = THREE.ShaderChunk.lights_fragment_maps + /* glsl */`
    {
      float cdIn = cdIndoorK(vViewPosition);
      irradiance *= cdIn; iblIrradiance *= cdIn; radiance *= cdIn;
    }`;
}

// the same test on the CPU (for the player: the eye's adaptation, the ambience, the light pool)
export function indoorAt(A, a, c, y = 1.6) {
  if (a > A.a0 + 0.38 && a < A.a1 - 0.38 && c > A.c0 + 0.38 && c < A.c1 - 0.38 && y < A.H - 0.25) return a > A.lob0 && a < A.lob1 ? 0.55 : 0.85;
  if (a > 536.3 && a < 589.7 && c > 241.3 && c < 281.7) return 0.5;
  if (a > 470.3 && a < 519.7 && c > 241.3 && c < 281.7) return 0.8;
  return 0;
}

// a few point lights that follow the player through the ceiling fixtures (fixed count: no shader recompiles)
export function createLightPool(scene, count = 4) {
  const lights = [];
  for (let i = 0; i < count; i++) {
    const l = new THREE.PointLight(0xfff1e0, 0, 9, 2);
    l.castShadow = false; scene.add(l); lights.push(l);
  }
  const tmp = [];
  return {
    lights,
    // fixtures: { p: world position (Vector3), w: strength (1 for a 3 m ceiling; more for a high one, which also
    // reaches further) }; on: 0..1
    update(cam, fixtures, on, intensity = 7) {
      tmp.length = 0;
      for (const f of fixtures) { const d = f.p.distanceToSquared(cam); if (d < 400) tmp.push([d, f]); }
      tmp.sort((x, y) => x[0] - y[0]);
      for (let i = 0; i < lights.length; i++) {
        const it = tmp[i];
        if (it && on > 0) {
          const f = it[1]; lights[i].position.copy(f.p); lights[i].distance = 9 * Math.sqrt(f.w);
          lights[i].intensity = intensity * f.w * on * (1 - Math.min(1, Math.sqrt(it[0]) / 20));
        } else lights[i].intensity = 0;
      }
    },
  };
}
