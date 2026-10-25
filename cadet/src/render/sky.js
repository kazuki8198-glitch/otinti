// CADET — render/sky.js : the sky (three.js's physical Sky with its clouds), the sun's position for a date and a
// local time over central Florida, the sunlight's colour through the atmosphere, the image-based light from the sky
// (PMREM, rebuilt when the time changes), and the sun's shadow that follows the camera (snapped to its texels so it
// does not shimmer).
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

const DEG = Math.PI / 180;
export const SITE = { lat: 28.78, lon: -81.24, utcOffset: -4 };   // the airfield's area (EDT); the field itself is fictional

// the sun for a local clock time (hours) on a day of the year; returns elevation, azimuth (deg) and a local direction
export function sunPosition(hours, day = 285) {
  const g = 2 * Math.PI / 365 * (day - 1 + (hours - 12) / 24);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = hours * 60 + eqt + 4 * SITE.lon - 60 * SITE.utcOffset;      // true solar time, minutes
  const ha = (tst / 4 - 180) * DEG, lat = SITE.lat * DEG;
  const cz = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  const zen = Math.acos(THREE.MathUtils.clamp(cz, -1, 1));
  let az = Math.acos(THREE.MathUtils.clamp((Math.sin(decl) - Math.sin(lat) * Math.cos(zen)) / (Math.cos(lat) * Math.sin(zen)), -1, 1)) / DEG;
  if (ha > 0) az = 360 - az;                                                // from north, clockwise (afternoon: west)
  const el = 90 - zen / DEG;
  const dir = new THREE.Vector3(Math.cos(el * DEG) * Math.sin(az * DEG), Math.sin(el * DEG), -Math.cos(el * DEG) * Math.cos(az * DEG));
  return { el, az, dir };
}

// sunlight after the atmosphere (Rayleigh + aerosol optical depth times the air mass): a colour and an intensity
function sunlight(el) {
  const e = Math.max(el, -2);
  const m = 1 / (Math.sin(Math.max(e, 0.5) * DEG) + 0.50572 * Math.pow(Math.max(e, 0.5) + 6.07995, -1.6364));
  const tauR = [0.044, 0.096, 0.23], tauA = [0.08, 0.09, 0.1];
  const c = tauR.map((t, i) => Math.exp(-(t + tauA[i]) * m));
  const fade = THREE.MathUtils.smoothstep(e, -1.5, 3);
  return { color: new THREE.Color(c[0], c[1], c[2]), k: fade };
}

// Preetham's sky is not meant for a sun below the horizon: blend in a twilight sky (deep blue overhead, a glow over
// the sun's azimuth) and stars, keeping the clouds as silhouettes
function addTwilight(mat) {
  mat.fragmentShader = mat.fragmentShader
    .replace('void main() {', 'float cdCloudA = 0.0;\nvoid main() {')
    .replace('texColor = mix( texColor, cloudAerial, alpha );', 'texColor = mix( texColor, cloudAerial, alpha ); cdCloudA = alpha;')
    .replace('gl_FragColor = vec4( texColor, 1.0 );', `
      float sunH = vSunDirection.y;
      float tw = 1.0 - smoothstep(-0.03, 0.05, sunH);
      if (tw > 0.0) {
        float depth = clamp(-sunH / 0.21, 0.0, 1.0);
        float toward = dot(normalize(direction.xz + 1e-5), normalize(vSunDirection.xz + 1e-5)) * 0.5 + 0.5;
        float hgt = max(direction.y, 0.0);
        vec3 zenith = mix(vec3(0.010, 0.026, 0.085), vec3(0.0005, 0.0009, 0.0028), depth);
        vec3 horizonC = mix(vec3(0.11, 0.085, 0.10), vec3(0.0015, 0.0022, 0.005), depth);
        vec3 glowC = mix(vec3(0.42, 0.15, 0.035), vec3(0.012, 0.007, 0.012), depth);
        vec3 tc = mix(horizonC, zenith, pow(hgt, 0.45)) + glowC * pow(toward, 5.0) * exp(-hgt * 6.0);
        vec3 sp = floor(direction * 700.0); float sh = fract(sin(dot(sp, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        tc += vec3(0.9, 0.95, 1.0) * step(0.9986, sh) * smoothstep(0.4, 1.0, depth) * smoothstep(0.02, 0.2, hgt) * 0.05 * (1.0 - cdCloudA);
        tc = mix(tc, tc * 0.3 + glowC * 0.25 * pow(toward, 3.0), cdCloudA);
        texColor = mix(texColor, tc, tw);
      }
      gl_FragColor = vec4( texColor, 1.0 );`);
}

export function createSky(renderer, scene, quality) {
  const sky = new Sky(); addTwilight(sky.material); sky.scale.setScalar(120000); sky.name = 'sky';      // beyond the far plane: the ambient-occlusion pass does not see it
  const U = sky.material.uniforms;
  U.turbidity.value = 3.8; U.rayleigh.value = 1.35; U.mieCoefficient.value = 0.0035; U.mieDirectionalG.value = 0.84;
  U.cloudCoverage.value = 0.34; U.cloudDensity.value = 0.55; U.cloudElevation.value = 0.55; U.cloudScale.value = 0.00018;
  scene.add(sky);

  // the sky for the image-based light (no sun disc: the sun is the directional light)
  const envScene = new THREE.Scene(), envSky = new Sky(); envSky.scale.setScalar(900); addTwilight(envSky.material);
  envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0x9cc3e6, 0x3a4a2a, 0.0);       // only at night (moon / sky glow)
  scene.add(hemi);

  const state = { hours: 9.5, day: 285, el: 30, dir: new THREE.Vector3(0, 1, 0), lightsOn: 0, half: 90, overcast: 0 };
  function applyQuality(q) {
    sun.shadow.mapSize.set(q.shadow, q.shadow);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    sun.shadow.radius = q.shadowRadius; state.half = q.shadowHalf;
    sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.035;
    const c = sun.shadow.camera; c.left = -state.half; c.right = state.half; c.top = state.half; c.bottom = -state.half; c.near = 1; c.far = 2400; c.updateProjectionMatrix();
  }
  applyQuality(quality);

  function setTime(hours, day = state.day) {
    state.hours = hours; state.day = day;
    const p = sunPosition(hours, day);
    state.el = p.el; state.dir.copy(p.dir);
    U.sunPosition.value.copy(p.dir).multiplyScalar(450000);
    // a hazier, warmer sky low on the horizon
    const low = 1 - THREE.MathUtils.smoothstep(p.el, 2, 25);
    U.turbidity.value = 2.8 + 3.5 * low; U.rayleigh.value = 1.15 + 0.9 * low;
    const L = sunlight(p.el);
    // under an overcast the sun is behind the cloud: less of it, more of a grey sky
    sun.color.copy(L.color); sun.intensity = 10 * L.k * (1 - 0.8 * state.overcast);   // about four times the sky's light on open ground
    hemi.intensity = 0.2 * (1 - THREE.MathUtils.smoothstep(p.el, -6, 2));            // moonlight and sky glow at night
    state.lightsOn = 1 - THREE.MathUtils.smoothstep(p.el, -4, 5);
    // the image-based light from this sky
    const EU = envSky.material.uniforms;
    for (const k of Object.keys(U)) if (EU[k] && EU[k].value !== undefined) { if (EU[k].value?.copy) EU[k].value.copy(U[k].value); else EU[k].value = U[k].value; }
    EU.showSunDisc.value = 0;
    const rt = pmrem.fromScene(envScene, 0, 0.1, 2000);
    if (envRT) envRT.dispose();
    envRT = rt;
    scene.environment = rt.texture;
    scene.environmentIntensity = 0.5;
    return state;
  }

  // the shadow follows a focus point (the camera, or what it looks at), snapped to the shadow map's texels
  const right = new THREE.Vector3(), up = new THREE.Vector3(), f = new THREE.Vector3();
  function update(camera, t, focus) {
    sky.position.copy(camera.position);
    U.time.value = t;
    const d = state.dir;
    right.set(0, 1, 0).cross(d); if (right.lengthSq() < 1e-6) right.set(1, 0, 0); right.normalize();
    up.copy(d).cross(right).normalize();
    const texel = 2 * state.half / sun.shadow.mapSize.x;
    const fx = Math.round(focus.dot(right) / texel) * texel, fy = Math.round(focus.dot(up) / texel) * texel, fz = focus.dot(d);
    f.copy(right).multiplyScalar(fx).addScaledVector(up, fy).addScaledVector(d, fz);
    sun.target.position.copy(f);
    sun.position.copy(f).addScaledVector(d, 1200);
    sun.target.updateMatrixWorld();
  }
  // a smaller shadow box for a while (the cockpit: millimetre texels around the seat); null goes back to the preset's
  let presetHalf = state.half;
  function setShadowHalf(m) {
    const h = m == null ? presetHalf : m;
    if (h === state.half) return;
    state.half = h;
    const c = sun.shadow.camera; c.left = -h; c.right = h; c.top = h; c.bottom = -h; c.updateProjectionMatrix();
  }
  // the day's weather (M5): cloud cover 0..1 (0.34 a fair day's few clouds, 1 overcast), the sky redrawn at once
  function setWeather({ overcast = 0 } = {}) {
    state.overcast = Math.max(0, Math.min(1, overcast));
    U.cloudCoverage.value = 0.34 + 0.6 * state.overcast; U.cloudDensity.value = 0.55 + 0.4 * state.overcast;
    U.turbidity.value = 2.8 + 6 * state.overcast;
    setTime(state.hours, state.day);
  }
  const applyQ = applyQuality;
  function applyQualityKeep(q) { const custom = state.half !== presetHalf ? state.half : null; applyQ(q); presetHalf = state.half; if (custom != null) setShadowHalf(custom); }
  return { sky, sun, state, setTime, setWeather, update, applyQuality: applyQualityKeep, setShadowHalf, uniforms: U };
}
