// CADET — render/post.js : the renderer and the image pipeline.
// scene (HDR, multisampled) → aerial perspective (haze that thickens with distance and thins with height, brighter
// towards the sun; computed from the depth buffer for every surface at once) → ambient occlusion (GTAO) → bloom →
// tone mapping (AgX) and sRGB.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const AerialShader = {
  name: 'CadetAerial',
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null },
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uHaze: { value: new THREE.Color(0.55, 0.66, 0.80) }, uSunHaze: { value: new THREE.Color(0.9, 0.75, 0.5) },
    uDensity: { value: 0.000085 }, uFall: { value: 0.00055 }, uGround: { value: 16.8 }, uSkyFog: { value: 0 }, uSkyGrey: { value: 0 },
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tDepth; uniform mat4 uInvProj, uCamWorld;
    uniform vec3 uSunDir, uHaze, uSunHaze; uniform float uDensity, uFall, uGround, uSkyFog, uSkyGrey;
    varying vec2 vUv;
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      // the sun's disc is far brighter than half floats like (and bloom would spread it over the sky): cap it
      col.rgb = clamp(col.rgb, 0.0, 12.0); if (any(isnan(col.rgb))) col.rgb = vec3(12.0);
      float d = texture2D(tDepth, vUv).x;
      if (d >= 1.0) {                                                       // nothing drawn here: the sky has its own atmosphere,
        if (uSkyFog + uSkyGrey <= 0.0) { gl_FragColor = col; return; }
        // under a storm's deck it is grey and darker; in fog it is the fog's colour (as far off as the ground is)
        vec4 sp = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0); sp /= sp.w;
        float up = clamp(normalize(mat3(uCamWorld) * sp.xyz).y, 0.0, 1.0);
        // (the deck's brightness from the haze's, the horizon's: the sky's own is far brighter; its clouds' pattern kept)
        float ref = dot(uHaze, vec3(0.2126, 0.7152, 0.0722)), sky = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
        vec3 deck = vec3(0.86, 0.9, 0.97) * ref * (0.92 + 0.25 * clamp(sky / max(ref * 4.0, 1e-4) - 1.0, -1.0, 1.0)) * (1.0 - 0.5 * sqrt(up));
        vec3 c = mix(col.rgb, deck, min(1.0, uSkyGrey * 1.7));
        gl_FragColor = vec4(mix(c, uHaze, uSkyFog * (1.0 - 0.2 * up)), col.a); return;
      }
      vec4 vp = uInvProj * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); vp /= vp.w;
      vec3 cam = uCamWorld[3].xyz;
      vec3 wp = (uCamWorld * vec4(vp.xyz, 1.0)).xyz;
      float dist = length(vp.xyz);
      vec3 rd = (wp - cam) / max(dist, 1e-3);
      // optical depth through air whose density falls off exponentially with height
      float h0 = max(cam.y - uGround, 0.0), dy = rd.y * dist, k = uFall;
      float shape = abs(k * dy) > 1e-4 ? (1.0 - exp(-k * dy)) / (k * dy) : 1.0;
      float od = uDensity * exp(-k * h0) * dist * shape;
      float fog = 1.0 - exp(-od);
      float mu = max(dot(rd, uSunDir), 0.0);
      vec3 haze = uHaze + uSunHaze * (0.35 * pow(mu, 6.0) + 0.65 * pow(mu, 40.0));
      gl_FragColor = vec4(mix(col.rgb, haze, fog), col.a);
    }`,
};

export function createPipeline(container, quality) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 0.62;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = false;
  container.appendChild(renderer.domElement);
  renderer.domElement.tabIndex = 0;

  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 42000);
  const scene = new THREE.Scene();
  let composer = null, aerial = null, gtao = null, bloom = null, depthTex = null, dpr = 1, baseExposure = 0.62, indoor = 0;
  // the exposure: outdoors it follows the sun (more at dusk and under the moon); inside a lit room it tends to a fixed
  // value whatever the time of day (the ceiling lights, not the sky, decide how bright the room is)
  const INDOOR_EXPOSURE = 1.8;
  let lit = 1;
  const exposure = () => {
    const e = Math.exp(Math.log(baseExposure) * (1 - indoor) + Math.log(INDOOR_EXPOSURE) * indoor);
    // an unlit interior (the hangar at night) only adapts brighter; lit (0..1, smoothed by the caller) blends the two
    const eu = Math.max(baseExposure, e);
    return Math.exp(Math.log(e) * lit + Math.log(eu) * (1 - lit));
  };
  const sceneInfo = { calls: 0, triangles: 0 };

  function build(q) {
    if (composer) { composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); composer.passes.forEach(p => p.dispose && p.dispose()); }
    const size = renderer.getSize(new THREE.Vector2());
    depthTex = new THREE.DepthTexture(1, 1); depthTex.type = THREE.UnsignedIntType;
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: q.msaa, depthTexture: depthTex });
    composer = new EffectComposer(renderer, rt);
    // the first pass renders into the read buffer, and which of the two that is changes from frame to frame when a
    // frame swaps them an odd number of times (with the AO): each has a depth texture, and the haze reads the one the
    // scene was drawn into (render())
    const depth1 = new THREE.DepthTexture(1, 1); depth1.type = THREE.UnsignedIntType;
    composer.renderTarget2.depthTexture = depthTex; composer.renderTarget1.depthTexture = depth1;
    composer.renderTarget1.depthBuffer = true;
    composer.setPixelRatio(dpr); composer.setSize(size.x, size.y);
    const rp = new RenderPass(scene, camera);
    const render0 = rp.render.bind(rp);
    rp.render = (...a) => { const c0 = renderer.info.render.calls, t0 = renderer.info.render.triangles; render0(...a); sceneInfo.calls = renderer.info.render.calls - c0; sceneInfo.triangles = renderer.info.render.triangles - t0; };
    composer.addPass(rp);
    aerial = new ShaderPass(AerialShader); aerial.uniforms.tDepth.value = depthTex;
    const dbg = new URLSearchParams(location.search);
    if (!dbg.has('noaerial')) composer.addPass(aerial);
    gtao = null;
    if (q.ao && !dbg.has('noao')) {
      gtao = new GTAOPass(scene, camera, size.x * dpr, size.y * dpr);
      gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: q.aoHalf ? 12 : 16, distanceFallOff: 1.0, screenSpaceRadius: false });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      gtao.blendIntensity = 0.9;
      // glass and other see-through things must not cast ambient occlusion (they are not in the depth the AO reads)
      const hide = gtao._overrideVisibility.bind(gtao);
      gtao._overrideVisibility = () => {
        hide();
        scene.traverse((o) => { if (o.visible && o.isMesh && (o.userData.noAO || (o.material && o.material.transparent))) { o.visible = false; gtao._visibilityCache.push(o); } });
      };
      composer.addPass(gtao);
    }
    bloom = null;
    if (q.bloom && !dbg.has('nobloom')) { bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.07, 0.2, 8.0); composer.addPass(bloom); }
    composer.addPass(new OutputPass());
  }

  function resize(newDpr = dpr) {
    dpr = newDpr;
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, true);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(dpr); composer.setSize(w, h); }
  }

  let lastHaze = null;               // kept so that a rebuilt pipeline (a new preset) gets the same sky
  // fog (M5's weather): 0 clear … 1 a visibility of a few hundred metres; grey (the overcast's light)
  function setHaze({ sunDir, el, fog = lastHaze ? lastHaze.fog || 0 : 0, grey = lastHaze ? lastHaze.grey || 0 : 0 }) {
    lastHaze = { sunDir, el, fog, grey };
    // the eye adapts: more exposure as the sun goes down (dusk, then night under the moon)
    const dark = 1 - THREE.MathUtils.smoothstep(el, -10, 8);
    // (M7: a little less at full night — it read as a bright dusk: the apron's floodlit patches should stand out)
    baseExposure = 0.62 * (1 + 4.2 * dark * dark);
    renderer.toneMappingExposure = exposure();
    const u = aerial.uniforms;
    u.uSunDir.value.copy(sunDir);
    // haze colour: blue-grey by day, warmer near sunrise / sunset, dark at night
    const day = THREE.MathUtils.smoothstep(el, -6, 10), low = 1 - THREE.MathUtils.smoothstep(el, 0, 25);
    u.uHaze.value.setRGB(0.52 - 0.1 * low, 0.62 - 0.12 * low, 0.78 - 0.25 * low).multiplyScalar(0.03 + 0.97 * day);
    u.uSunHaze.value.setRGB(1.0, 0.72 - 0.25 * low, 0.42 - 0.25 * low).multiplyScalar((0.4 + 0.8 * low) * day);
    // (fog 0.85: a visibility of about 800 m, the METAR's 1/2 SM; the sky hidden as with VV002)
    u.uDensity.value = 0.000085 * (1 + 80 * fog * fog) * (1 + grey);
    u.uSkyFog.value = fog > 0 ? Math.min(1, fog * 1.18) : 0; u.uSkyGrey.value = grey;
    if (grey > 0) { u.uHaze.value.lerp(new THREE.Color(0.42, 0.45, 0.5).multiplyScalar(0.03 + 0.97 * day), grey * 0.7); u.uSunHaze.value.multiplyScalar(1 - grey * 0.8); }
    if (fog > 0) u.uHaze.value.lerp(new THREE.Color(0.66, 0.69, 0.72).multiplyScalar(0.03 + 0.97 * day), fog * 0.8);
  }

  function render() {
    renderer.info.reset();
    const u = aerial.uniforms;
    u.uInvProj.value.copy(camera.projectionMatrixInverse); u.uCamWorld.value.copy(camera.matrixWorld);
    u.tDepth.value = composer.readBuffer.depthTexture;
    // the sun's shadow map once per frame: the AO's normal pass renders the scene again and must not redraw it
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    composer.render();
  }

  build(quality); resize(Math.min(window.devicePixelRatio || 1, quality.maxDpr));
  return {
    renderer, scene, camera, render, resize, setHaze,
    // the eye adapting indoors: 0 outdoors, 1 inside a lit room
    setIndoor(k, isLit = 1) { indoor = Math.max(0, Math.min(1, k)); lit = Math.max(0, Math.min(1, +isLit)); renderer.toneMappingExposure = exposure(); },
    // compile the scene's shaders as the game draws them: into the pipeline's buffer (no tone mapping, linear colour),
    // not to the screen (a different program for every material)
    async compile() {
      const rt = renderer.getRenderTarget();
      let p = null;
      renderer.setRenderTarget(composer.readBuffer);
      try { p = renderer.compileAsync(scene, camera); } finally { renderer.setRenderTarget(rt); }
      await p;
    },
    get dpr() { return dpr; }, sceneInfo,
    setQuality(q) { build(q); resize(Math.min(window.devicePixelRatio || 1, q.maxDpr)); if (lastHaze) setHaze(lastHaze); },
  };
}
