// CADET — ui/settings.js : the player's settings, kept in localStorage ('cadet.settings') when the browser allows it.
// Every storage access is guarded: a private window, blocked site data or a full quota just means the settings are
// not remembered. Values are checked and clamped; anything unknown or broken in storage is ignored.
export const DEFAULTS = { sensitivity: 1.0, invertY: false, fov: 75, headBob: true, quality: null, volume: 0.8, showPerf: false, walkHold: false, voice: false, textSpeed: 1,
  autoRud: false, pitchHold: false, stickBoost: false, lessonLevel: 'basic', panel2D: false, atcVoice: true, radioJa: true, guide: true,
  volEngine: 1, volAmb: 1, volRadio: 1, subSize: 1, colorAssist: false, firstHelp: true,
  // (platform fixes) subtitles can be turned off; the pad's dead zone and the keyboard hold's speed; the
  // gamepad axis map, the key rebindings and the held-key rebindings (null = the standard layout); the
  // advanced quality switches (null = follow the preset, true/false = force)
  subtitles: true, padDz: 0.12, holdSens: 1, padMap: null, keyBinds: null, heldBinds: null,
  qShadow: null, qAO: null, qBloom: null,
  // (M8) every one off at first: the AI instructor (and its model), the microphone on the radio, the crew in English
  aiTutor: false, aiModel: 'claude-opus-5-5', micRadio: false, crewEnglish: false, crewEnglishJa: true };
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
  pitchHold: (v) => (typeof v === 'boolean' ? v : undefined),
  stickBoost: (v) => (typeof v === 'boolean' ? v : undefined),
  guide: (v) => (typeof v === 'boolean' ? v : undefined),
  panel2D: (v) => (typeof v === 'boolean' ? v : undefined),
  atcVoice: (v) => (typeof v === 'boolean' ? v : undefined),
  radioJa: (v) => (typeof v === 'boolean' ? v : undefined),
  volEngine: (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : undefined),
  volAmb: (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : undefined),
  volRadio: (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : undefined),
  subSize: (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1.6, Math.max(0.85, v)) : undefined),
  colorAssist: (v) => (typeof v === 'boolean' ? v : undefined),
  firstHelp: (v) => (typeof v === 'boolean' ? v : undefined),
  aiTutor: (v) => (typeof v === 'boolean' ? v : undefined),
  aiModel: (v) => (typeof v === 'string' && /^[a-z0-9][a-z0-9._-]{2,63}$/.test(v.trim()) ? v.trim() : undefined),
  micRadio: (v) => (typeof v === 'boolean' ? v : undefined),
  crewEnglish: (v) => (typeof v === 'boolean' ? v : undefined),
  crewEnglishJa: (v) => (typeof v === 'boolean' ? v : undefined),
  lessonLevel: (v) => (typeof v === 'string' && /^(intro|basic|precision)$/.test(v) ? v : undefined),
  subtitles: (v) => (typeof v === 'boolean' ? v : undefined),
  padDz: (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(0.4, Math.max(0, v)) : undefined),
  holdSens: (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(2, Math.max(0.5, v)) : undefined),
  qShadow: (v) => (v === null || typeof v === 'boolean' ? v : undefined),
  qAO: (v) => (v === null || typeof v === 'boolean' ? v : undefined),
  qBloom: (v) => (v === null || typeof v === 'boolean' ? v : undefined),
  padMap: (v) => cleanBindMap(v, ['axis', 'inv', 'pad', 'dz']),
  keyBinds: (v) => cleanBindMap(v, null),
  heldBinds: (v) => cleanBindMap(v, null),
};
// a small plain object of small plain values (the pad map, the key bindings): anything else is dropped, so
// a broken or hostile stored value can never reach the controls. null stays null (= the standard layout)
function cleanBindMap(v, fields) {
  if (v === null) return null;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    if (!/^[a-zA-Z][a-zA-Z0-9]{0,15}$/.test(k)) continue;
    if (typeof x === 'string') { if (!fields && /^[A-Za-z][A-Za-z0-9]{0,23}$/.test(x)) out[k] = x; continue; }
    if (!fields || !x || typeof x !== 'object' || Array.isArray(x)) continue;
    const e = {};
    for (const f of fields) {
      const y = x[f];
      if (f === 'axis' && Number.isInteger(y) && y >= 0 && y <= 15) e.axis = y;
      else if (f === 'pad' && Number.isInteger(y) && y >= -1 && y <= 7) e.pad = y;
      else if (f === 'inv' && typeof y === 'boolean') e.inv = y;
      else if (f === 'dz' && typeof y === 'number' && Number.isFinite(y)) e.dz = Math.min(0.4, Math.max(0, y));
    }
    if ('axis' in e) out[k] = e;
  }
  return Object.keys(out).length ? out : null;
}

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
