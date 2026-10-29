// FLIGHT LAB — src3d/google-hook.js : Google's photorealistic 3D tiles (src/google3d.js, raw WebGL2 on three.js's own
// context) drawn inside three.js's main render pass, and the hole they need in CADET's ground.
// The tiles are drawn from a hook: an empty mesh whose material makes three.js set exactly the state google3d.js
// assumes (depth test on, LEQUAL, depth writes on, no blending, no culling) and whose onAfterRender calls the draw.
// It lands in the pipeline's HDR (multisampled) target with real depth, after the opaque world and the cockpit (so the
// panel hides what is behind it) and before the glass; the haze pass then sees the tiles' depth like any surface's.
// What three.js caches about the GL state (the program, the vertex array, the active texture unit and unit 0's
// texture) is put back after the draw, so its caches stay true. Kept out of the shadow pass (castShadow false) and
// the ambient occlusion's normal pass (userData.noAO, and the overrideMaterial guard).
// Frames: google3d.js works in FLIGHT LAB's GL frame; the scene is drawn in CADET's (local = FL + T): the offset is
// folded into the matrix in double precision, so the tiles keep the precision they have in the legacy view.
import * as THREE from 'three';

export function createGoogleHook(pipe, T) {
  const { renderer, camera } = pipe, gl = renderer.getContext();
  const mat = new THREE.ShaderMaterial({
    name: 'google-tiles-hook',
    vertexShader: 'void main() { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); }',
    fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }',
    depthTest: true, depthWrite: true, depthFunc: THREE.LessEqualDepth, blending: THREE.NoBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  mesh.name = 'google-tiles-hook';
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.renderOrder = 1; mesh.userData.noAO = true;

  const Tm = new THREE.Matrix4().makeTranslation(T.x, T.y, T.z), VP = new THREE.Matrix4(), eye = new THREE.Vector3();
  const c = { VP: new Float32Array(16), eye: new Float32Array(3), fog: [0, 0, 0], fogD: 0, gain: 1 };
  let extra = null, calls = 0, failed = null;
  mesh.onAfterRender = (r, scene, cam) => {
    // only the main pass: not the AO's normal pass (override material), not a draw to the screen, not another camera
    if (!extra || scene.overrideMaterial || r.getRenderTarget() === null || cam !== camera) return;
    VP.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).multiply(Tm);
    const e = VP.elements; for (let i = 0; i < 16; i++) c.VP[i] = e[i];
    cam.getWorldPosition(eye);
    c.eye[0] = eye.x - T.x; c.eye[1] = eye.y - T.y; c.eye[2] = eye.z - T.z;
    // the photos are final display colours: sampled as sRGB (linear here), unlit, scaled so that they come out of the
    // tone mapping (AgX at this exposure) close to what they were; the haze pass adds the distance's haze
    c.gain = 0.84 / r.toneMappingExposure;
    const prog = gl.getParameter(gl.CURRENT_PROGRAM), vao = gl.getParameter(gl.VERTEX_ARRAY_BINDING), unit = gl.getParameter(gl.ACTIVE_TEXTURE);
    gl.activeTexture(gl.TEXTURE0);
    const tex0 = gl.getParameter(gl.TEXTURE_BINDING_2D);
    // (an error is not thrown from inside three.js's render: render() throws it once the frame is complete)
    try { extra(gl, c); calls++; } catch (err) { failed = failed || err; } finally {
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex0);
      gl.activeTexture(unit); gl.bindVertexArray(vao); gl.useProgram(prog);
    }
  };

  // the ground's hole: CADET's ground (one material for the outer square and the airfield's grass) discards what lies
  // within the tiles' round area. Its own onBeforeCompile is kept and runs first; the new cache key makes three.js
  // build the patched program instead of reusing the one it may have made already.
  const hole = { value: new THREE.Vector3(0, 0, 0) };
  function patchGround(m) {
    const before = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (before) before.call(m, sh, r);
      sh.uniforms.uFlHole = hole;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vFlHoleW;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvFlHoleW = (modelMatrix * vec4(transformed, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vFlHoleW;\nuniform vec3 uFlHole;')
        .replace('void main() {', 'void main() {\n  if (uFlHole.z > 0.0 && distance(vFlHoleW, uFlHole.xy) < uFlHole.z) discard;');
    };
    const key = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
    m.customProgramCacheKey = () => key + '+flight-lab-hole';
    m.needsUpdate = true;
  }

  return {
    mesh, patchGround,
    // what the next frame draws: extra(gl, c) or null; the hole { n, e, r } (FLIGHT LAB's metres) or null
    set(fn, h) {
      extra = typeof fn === 'function' ? fn : null;
      if (h && h.r > 0) hole.value.set(h.e + T.x, -h.n + T.z, h.r); else hole.value.set(0, 0, 0);
    },
    // the draws so far; the error the last frame's draw threw (then forgotten)
    get calls() { return calls; },
    takeError() { const e = failed; failed = null; return e; },
  };
}
