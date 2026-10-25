// FLIGHT LAB — src3d/view3d.js : the three.js view (the entry build.mjs bundles; one classic script in the page).
// The out-the-window view drawn with CADET's renderer (cadet/src, imported read-only): its image pipeline (HDR, haze,
// AgX), sky, ground, airfield, buildings, trees, landmarks, the Archer's and the Seminole's exteriors and the full 3D
// cockpit with the G1000-type screens drawn by FLIGHT LAB's own avionics.js. FLIGHT LAB's physics, school and app are
// unchanged: the view only reads the lesson's state (FL.physics' frame in, the same frame out).
// Loading this script does nothing but define FL.view3d; app.js decides at start-up whether to use it or the legacy
// scene.js (「軽量」), and createScene() either works completely or throws before it has touched the page.
//   FL.view3d = { probe(), PRESETS, ORDER, guessPreset(gpu), createScene(wrap, opt) }   (see scene3d.js)
import { PRESETS, ORDER, guessPreset } from '../../cadet/src/core/quality.js';
import { createScene } from './scene3d.js';

const SOFTWARE = /swiftshader|llvmpipe|software|basic render/i;

// what the browser offers, from a throwaway canvas (its context given back at once): WebGL2 or not, the GPU's name,
// and whether that is a software renderer (where three.js would run at a frame every second or two). The context asks
// for the GPU the renderer will ask for (CADET's pipeline: 'high-performance'): with two GPUs (a laptop's integrated
// and discrete ones) the browser can pick per context, and the name decides the renderer and the quality
function probe() {
  const out = { webgl2: false, gpu: '', software: false };
  try {
    const cv = document.createElement('canvas'), gl = cv.getContext('webgl2', { powerPreference: 'high-performance' });
    if (gl) {
      out.webgl2 = true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      out.gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
  } catch (e) { /* no canvas, or the context refused: reported as no WebGL2 */ }
  out.software = SOFTWARE.test(out.gpu);
  return out;
}

(function (FL) {
  FL.view3d = {
    probe, PRESETS, ORDER, guessPreset,
    createScene: (wrap, opt = {}) => createScene(FL, wrap, opt),
  };
})(globalThis.FL = globalThis.FL || {});
