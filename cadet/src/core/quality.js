// CADET — core/quality.js : graphics presets, the GPU guess for the first start, and dynamic resolution
// (the render scale moves between a preset's limits to keep the frame time near the target).
export const PRESETS = {
  low:    { id: 'low',    label: '低',   maxDpr: 0.85, minDpr: 0.5,  msaa: 0, ao: false, aoHalf: true,  bloom: false, shadow: 1024, shadowRadius: 2, shadowHalf: 60,  treeNear: 450,  aniso: 4,  groundDetail: 0 },
  medium: { id: 'medium', label: '中',   maxDpr: 1.0,  minDpr: 0.6,  msaa: 4, ao: false, aoHalf: true,  bloom: true,  shadow: 2048, shadowRadius: 3, shadowHalf: 80,  treeNear: 800,  aniso: 8,  groundDetail: 1 },
  high:   { id: 'high',   label: '高',   maxDpr: 1.25, minDpr: 0.7,  msaa: 4, ao: true,  aoHalf: true,  bloom: true,  shadow: 4096, shadowRadius: 3, shadowHalf: 100, treeNear: 1200, aniso: 16, groundDetail: 1 },
  ultra:  { id: 'ultra',  label: '最高', maxDpr: 2.0,  minDpr: 0.75, msaa: 4, ao: true,  aoHalf: false, bloom: true,  shadow: 4096, shadowRadius: 4, shadowHalf: 120, treeNear: 1700, aniso: 16, groundDetail: 1 },
};
export const ORDER = ['low', 'medium', 'high', 'ultra'];
const KEY = 'cadet.quality';

export function gpuName(renderer) {
  try {
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch (e) { return 'unknown'; }
}
// the first guess: software rendering → low; Iris Xe → high, older integrated Intel → medium; a discrete or Apple GPU → ultra
export function guessPreset(gpu) {
  const g = gpu.toLowerCase();
  if (/swiftshader|llvmpipe|software|basic render/.test(g)) return 'low';
  if (/nvidia|geforce|rtx|radeon rx|amd radeon pro|apple m\d|apple gpu/.test(g)) return 'ultra';
  // (M7) Iris Xe and AMD's integrated graphics: high (with the dynamic resolution); older Intel UHD / HD: medium
  if (/iris|radeon\(tm\) graphics|vega/.test(g)) return 'high';
  if (/intel|uhd|hd graphics/.test(g)) return 'medium';
  return 'high';
}
export function pickPreset(gpu) {
  const q = new URLSearchParams(location.search).get('q');
  if (q && PRESETS[q]) return q;
  try { const s = localStorage.getItem(KEY); if (s && PRESETS[s]) return s; } catch (e) { /* storage blocked */ }
  return guessPreset(gpu);
}
export function rememberPreset(id) { try { localStorage.setItem(KEY, id); } catch (e) { /* storage blocked */ } }

// dynamic resolution: a slow loop on the smoothed frame time. With vsync the frame time cannot show spare GPU time,
// so the scale only creeps back up after several seconds at full rate, and not soon after it had to come down.
export function makeDynRes(pipeline, getPreset, { target = 1000 / 58 } = {}) {
  let ema = target, cool = 0, good = 0, blockUp = 0, enabled = true;
  return {
    set enabled(v) { enabled = v; }, get enabled() { return enabled; },
    get ema() { return ema; },
    tick(dtMs) {
      ema += (Math.min(dtMs, 100) - ema) * 0.05;
      good = ema < target * 1.03 ? good + dtMs : 0;
      blockUp -= dtMs;
      if (!enabled || (cool -= dtMs) > 0) return;
      const p = getPreset(), cap = Math.min(window.devicePixelRatio || 1, p.maxDpr), d = pipeline.dpr;
      if (ema > target * 1.18 && d > p.minDpr + 0.01) { pipeline.resize(Math.max(p.minDpr, d * 0.9)); cool = 1500; blockUp = 15000; good = 0; }
      else if (good > 4000 && blockUp <= 0 && d < cap - 0.01) { pipeline.resize(Math.min(cap, d * 1.05)); cool = 2500; good = 0; }
    },
  };
}
