// CADET — ui/settings.js : the player's settings, kept in localStorage ('cadet.settings') when the browser allows it.
// Every storage access is guarded: a private window, blocked site data or a full quota just means the settings are
// not remembered. Values are checked and clamped; anything unknown or broken in storage is ignored.
export const DEFAULTS = { sensitivity: 1.0, invertY: false, fov: 75, headBob: true, quality: null, volume: 0.8, showPerf: false, walkHold: false, voice: false, textSpeed: 1,
  autoRud: true, lessonLevel: 'basic', panel2D: false, atcVoice: true, radioJa: true };
const KEY = 'cadet.settings';
const RULES = {
  sensitivity: (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(3, Math.max(0.2, v)) : undefined),
  fov: (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(60, Math.round(v))) : undefined),
  volume: (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : undefined),
  invertY: (v) => (typeof v === 'boolean' ? v : undefined),
  headBob: (v) => (typeof v === 'boolean' ? v : undefined),
  showPerf: (v) => (typeof v === 'boolean' ? v : undefined),
  walkHold: (v) => (typeof v === 'boolean' ? v : undefined),
  voice: (v) => (typeof v === 'boolean' ? v : undefined),
  textSpeed: (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(3, Math.max(0.5, v)) : undefined),
  quality: (v) => (v === null || (typeof v === 'string' && /^(low|medium|high|ultra)$/.test(v)) ? v : undefined),
  autoRud: (v) => (typeof v === 'boolean' ? v : undefined),
  panel2D: (v) => (typeof v === 'boolean' ? v : undefined),
  atcVoice: (v) => (typeof v === 'boolean' ? v : undefined),
  radioJa: (v) => (typeof v === 'boolean' ? v : undefined),
  lessonLevel: (v) => (typeof v === 'string' && /^(intro|basic|precision)$/.test(v) ? v : undefined),
};

export function createSettings(defaults = DEFAULTS, storage = (() => { try { return globalThis.localStorage || null; } catch (e) { return null; } })()) {
  const values = { ...defaults };
  const fns = new Set();
  try {
    const raw = storage && storage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (k in defaults && RULES[k]) { const c = RULES[k](v); if (c !== undefined) values[k] = c; }
    }
  } catch (e) { /* unreadable: keep the defaults */ }
  const save = () => { try { if (storage) storage.setItem(KEY, JSON.stringify(values)); } catch (e) { /* not remembered */ } };
  return {
    get: (k) => values[k],
    set(k, v) {
      if (!(k in defaults)) return false;
      const c = RULES[k] ? RULES[k](v) : v;
      if (c === undefined || c === values[k]) return c !== undefined;
      values[k] = c; save();
      for (const f of fns) { try { f(k, c); } catch (e) { console.error(e); } }
      return true;
    },
    all: () => ({ ...values }),
    onChange(fn) { fns.add(fn); return () => fns.delete(fn); },
    reset() { for (const k of Object.keys(defaults)) this.set(k, defaults[k]); },
  };
}
