// CADET — render/sky.js : the sky (three.js's physical Sky with its clouds), the sun's position for a date and a
// local time over central Florida, the sunlight's colour through the atmosphere, the image-based light from the sky
// and the sunlit ground under it (PMREM, rebuilt when the time changes), the sky along the horizon for the aerial
// perspective (post.js), and the sun's shadow that follows the camera (snapped to its texels so it does not shimmer).
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

const DEG = Math.PI / 180;
const ENV_INTENSITY = 0.5;                                               // the scene's scale on the image-based light
// the visible sky's light (not the sun's disc) is kept under the bloom's threshold (8, post.js): its brightest part, the
// horizon towards the sun, crossed it and the bloom started and stopped along a line. The haze that takes the sky's
// colour (post.js) is kept the same way so that the two still meet
export const SKY_CAP = 7.5;
// open country round the field seen from above (grass, fields, pines, a little pavement): linear albedo
const GROUND_ALBEDO = new THREE.Color().setRGB(0.13, 0.135, 0.11);
const SKY_TINT = new THREE.Color().setRGB(0.75, 0.88, 1.15);             // the sky's light on the ground: bluish
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
// (cdSkyCap: the luminance the scattered light is kept under, the sun's disc added after it; no cap unless set)
function addTwilight(mat) {
  mat.uniforms.cdSkyCap = { value: 1e9 };
  mat.fragmentShader = mat.fragmentShader
    .replace('void main() {', 'float cdCloudA = 0.0;\nuniform float cdSkyCap;\nvoid main() {')
    .replace('vec3 texColor = ( Lin + L0 ) * 0.04 + sundiscColor + vec3( 0.0, 0.0003, 0.00075 );', `
      vec3 cdScat = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );
      cdScat *= min( 1.0, cdSkyCap / max( dot( cdScat, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-4 ) );
      vec3 texColor = cdScat + sundiscColor;`)
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

// (graphics plan C3) the flat clouds' structure and light. The stock field is one fbm stamp lit by a single
// beer-powder term, which reads flat: no warp, no fine edge, no shadow inside the cloud, and the low sun's
// colour is dimmed away by the day factor. This patch warps the field with a larger, slower noise and
// roughens it with a finer octave, takes a second sample of the same field offset towards the sun (the
// cloud's own shadow on itself; where that path is thin but the point is deep, a lit rim), darkens thick
// cores towards their base (a second, lower shadow under the beer-powder top light), strengthens the silver
// lining, and adds a warm term for the low sun. Everything is scaled by the cdCloudDetail uniform (the
// cloudDetail preset): at 0 the field and the light are the old ones, bit for bit. The coverage and density
// uniforms keep their meaning and their weather mapping (setWeather) — nothing here moves them.
function addCloudDetail(mat) {
  mat.uniforms.cdCloudDetail = { value: 1 };
  mat.fragmentShader = mat.fragmentShader
    .replace('uniform float cloudElevation;', 'uniform float cloudElevation;\n\t\tuniform float cdCloudDetail;')
    .replace('float cloudNoise = clamp( fbm( cloudUV * 1000.0, evolve ) * 0.7 + 0.5, 0.0, 1.0 );', /* glsl */`
				vec2 cdWarp = vec2( noise( cloudUV * 230.0 + evolve * 0.6 ), noise( cloudUV * 230.0 + 37.3 - evolve * 0.45 ) );
				vec2 cdSunOff = normalize( vSunDirection.xz + vec2( 1e-4 ) ) * 0.30;
				float cdRim = 0.0;
				float cloudNoise = clamp( fbm( cloudUV * 1000.0 + cdWarp * ( cdCloudDetail * 0.55 ), evolve ) * 0.7 + 0.5, 0.0, 1.0 );
				cloudNoise = clamp( cloudNoise + fbm( cloudUV * 3900.0 - cdWarp * 0.7, evolve * 1.6 ) * 0.13 * cdCloudDetail, 0.0, 1.0 );`)
    .replace('float shade = mix( 0.45, 1.0, clamp( beer * powder * 2.6, 0.0, 1.0 ) ); // 2.6 = 1/0.385, normalizes beer*powder peak to 1', /* glsl */`
				float shade = mix( 0.45, 1.0, clamp( beer * powder * 2.6, 0.0, 1.0 ) ); // 2.6 = 1/0.385, normalizes beer*powder peak to 1
				if ( cdCloudDetail > 0.001 ) {
					float cdSunNoise = clamp( fbm( cloudUV * 1000.0 + cdSunOff + cdWarp * ( cdCloudDetail * 0.55 ), evolve ) * 0.7 + 0.5, 0.0, 1.0 );
					float cdSunDepth = max( 0.0, cdSunNoise - threshold );
					shade *= mix( 1.0, 0.30 + 0.70 * exp( -cdSunDepth * 6.0 * cloudDensity ), cdCloudDetail );
					shade *= 1.0 - 0.34 * cdCloudDetail * smoothstep( 0.10, 0.62, depth );
					cdRim = clamp( depth - cdSunDepth, 0.0, 1.0 );
				}`)
    .replace('cloudColor += sunColor * silver * edge * 0.6;', 'cloudColor += sunColor * silver * ( edge * ( 0.6 + 0.4 * cdCloudDetail ) + cdRim * cloudMask * 0.9 * cdCloudDetail );')
    .replace('cloudColor *= max( dayFactor, 0.03 );', /* glsl */`
				cloudColor *= max( dayFactor, 0.03 );
				float cdDusk = ( 1.0 - smoothstep( 0.02, 0.30, vSunDirection.y ) ) * smoothstep( -0.10, -0.005, vSunDirection.y );
				cloudColor += vec3( 0.90, 0.30, 0.09 ) * cdDusk * ( 0.15 + 0.85 * pow( max( cosTheta, 0.0 ), 3.0 ) ) * ( 0.25 + 0.75 * shade ) * ( 0.6 * cdCloudDetail );`);
}

export function createSky(renderer, scene, quality) {
  const sky = new Sky(); addTwilight(sky.material); addCloudDetail(sky.material); sky.scale.setScalar(120000); sky.name = 'sky';      // beyond the far plane: the ambient-occlusion pass does not see it
  const U = sky.material.uniforms;
  U.cdSkyCap.value = SKY_CAP;
  U.cdCloudDetail.value = quality.cloudDetail ?? 1;
  U.turbidity.value = 3.8; U.rayleigh.value = 1.35; U.mieCoefficient.value = 0.0035; U.mieDirectionalG.value = 0.84;
  U.cloudCoverage.value = 0.34; U.cloudDensity.value = 0.55; U.cloudElevation.value = 0.55; U.cloudScale.value = 0.00018;
  scene.add(sky);

  // the sky for the image-based light (no sun disc: the sun is the directional light)
  const envScene = new THREE.Scene(), envSky = new Sky(); envSky.scale.setScalar(900); addTwilight(envSky.material); addCloudDetail(envSky.material); envSky.material.uniforms.cdCloudDetail.value = quality.cloudDetail ?? 1;
  envScene.add(envSky);
  // the ground under it: Preetham's sky fills the lower half with the horizon's colour, several times brighter than
  // sunlit land, so surfaces facing down (a wing's underside, the headliner, a windshield reflecting the panel's way)
  // were lit as if from a second sky. The lower hemisphere is the land's own radiance instead (setTime)
  const groundMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  const ground = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), groundMat);
  envScene.add(ground);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;
  // the sky alone (no sun disc, no ground) in a small cube: the aerial perspective takes the horizon's colour from it,
  // so the haze over distant ground is the sky's own colour behind it (post.js)
  const horizonRT = new THREE.WebGLCubeRenderTarget(32, { type: THREE.HalfFloatType, generateMipmaps: false });
  const horizonCam = new THREE.CubeCamera(0.1, 2000, horizonRT);

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
    EU.showSunDisc.value = 0; EU.cdSkyCap.value = 1e9;               // (the light from the sky itself, uncapped)
    // the ground's radiance: the sun on the horizontal plus the sky's light, over pi, times the land's albedo, divided
    // by the scale the scene puts on the whole environment. The sky's part (a quarter of the sun's at mid-morning) does
    // not fall with the sun's elevation as the direct light does: it stays at a low sun and fades through twilight;
    // under an overcast, where the sun is dimmed, there is more of it
    const sunH = sun.intensity * Math.max(0, p.dir.y);
    const skyH = 10 * (0.06 + 0.19 * Math.max(0, p.dir.y)) * THREE.MathUtils.smoothstep(p.el, -8, 4) * (1 + 1.5 * state.overcast);
    groundMat.color.copy(sun.color).multiplyScalar(sunH).add(SKY_TINT.clone().multiplyScalar(skyH))
      .multiply(GROUND_ALBEDO).multiplyScalar(1 / Math.PI / ENV_INTENSITY);
    ground.visible = false; horizonCam.update(renderer, envScene); ground.visible = true;
    const rt = pmrem.fromScene(envScene, 0, 0.1, 2000);
    if (envRT) envRT.dispose();
    envRT = rt;
    scene.environment = rt.texture;
    scene.environmentIntensity = ENV_INTENSITY;
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
  return { sky, sun, state, setTime, setWeather, update, applyQuality: applyQualityKeep, setShadowHalf, uniforms: U, horizon: horizonRT.texture };
}
