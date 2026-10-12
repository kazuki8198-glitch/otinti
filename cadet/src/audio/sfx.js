// CADET — audio/sfx.js : the game's sounds, made with the Web Audio API (no sound files).
// Footsteps by surface, doors, small UI sounds, and the ambience: outdoors the wind in gusts, birds now and then and a
// distant light aircraft every minute or so; indoors the air conditioning and a faint hum. Calm and quiet — this is a
// simulator, not an action game. Every call is safe before unlock() (the first click) or without Web Audio.
const SURF = {
  concrete: { f: 1700, q: 0.9, d: 0.085, thump: 0.45, tail: 0.25, g: 0.55 },
  asphalt: { f: 1200, q: 0.8, d: 0.095, thump: 0.5, tail: 0.15, g: 0.5 },
  grass: { f: 3400, q: 0.45, d: 0.17, thump: 0.25, tail: 0, g: 0.32 },
  carpet: { f: 650, q: 0.7, d: 0.075, thump: 0.35, tail: 0, g: 0.3 },
  vinyl: { f: 2300, q: 1.1, d: 0.06, thump: 0.4, tail: 0.15, g: 0.42 },
  tile: { f: 2900, q: 1.3, d: 0.065, thump: 0.4, tail: 0.35, g: 0.5 },
  terrazzo: { f: 2700, q: 1.2, d: 0.07, thump: 0.42, tail: 0.45, g: 0.52 },
  metal: { f: 900, q: 9, d: 0.22, thump: 0.3, tail: 0.5, g: 0.35 },
};

export function createAudio() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  let ctx = null, master = null, noise = null, amb = null, volume = 0.8, foot = 0;
  const next = { bird: 6, plane: 35 };
  let tNow = 0, mix = { indoor: 0, wind: 0.5 };

  function unlock() {
    if (!AC) return;
    try {
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = volume;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
        master.connect(comp).connect(ctx.destination);
        noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noise.getChannelData(0); let b = 0;
        for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = w * 0.7 + b * 3; }
        startAmbience();
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { ctx = null; }
  }
  const ok = () => !!ctx && ctx.state !== 'closed';
  const src = (loop = false) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = loop; return s; };
  const env = (g, t, a, peak, d) => { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };

  // a short filtered noise burst (+ optional low thump), panned
  function burst({ f, q, d, g = 0.5, type = 'bandpass', pan = 0, thump = 0, thumpF = 95, at = 0 }) {
    const t = ctx.currentTime + at;
    const s = src(), bp = ctx.createBiquadFilter(), ga = ctx.createGain(), p = ctx.createStereoPanner();
    bp.type = type; bp.frequency.value = f; bp.Q.value = q; p.pan.value = pan;
    s.connect(bp).connect(ga).connect(p).connect(master);
    env(ga, t, 0.004, g, d); s.start(t, Math.random() * 1.5, d + 0.05);
    if (thump > 0) {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(thumpF * 1.4, t); o.frequency.exponentialRampToValueAtTime(thumpF * 0.7, t + 0.08);
      o.connect(og).connect(p); env(og, t, 0.003, thump * g, 0.09); o.start(t); o.stop(t + 0.15);
    }
  }
  function footstep(surface = 'concrete', k = 1) {
    if (!ok()) return;
    const s = SURF[surface] || SURF.concrete, v = 0.85 + Math.random() * 0.3, pit = 0.92 + Math.random() * 0.16;
    foot = 1 - foot;
    const pan = (foot ? 0.12 : -0.12), g = s.g * k * v * 0.55;
    burst({ f: s.f * pit, q: s.q, d: s.d * (0.9 + 0.2 * Math.random()), g, pan, thump: s.thump, thumpF: 80 + 30 * pit });
    if (s.tail) burst({ f: s.f * 0.6 * pit, q: s.q * 0.7, d: s.d * 1.8, g: g * s.tail * 0.4, pan, at: 0.02 });
  }
  function tone(f0, f1, d, g, type = 'sine', at = 0) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), ga = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d);
    o.connect(ga).connect(master); env(ga, t, 0.006, g, d); o.start(t); o.stop(t + d + 0.05);
  }
  function door(kind) {
    if (!ok()) return;
    if (kind === 'swing_open') { burst({ f: 4200, q: 2, d: 0.025, g: 0.35, type: 'highpass' }); tone(190, 130, 0.38, 0.03, 'sawtooth', 0.04); burst({ f: 500, q: 0.6, d: 0.3, g: 0.08, at: 0.05 }); }
    else if (kind === 'swing_close') { burst({ f: 300, q: 0.7, d: 0.12, g: 0.45, type: 'lowpass', thump: 0.7, thumpF: 70, at: 0.35 }); burst({ f: 4000, q: 2, d: 0.02, g: 0.3, type: 'highpass', at: 0.38 }); }
    else if (kind === 'slide_open' || kind === 'slide_close') {
      const t = ctx.currentTime, s = src(), bp = ctx.createBiquadFilter(), ga = ctx.createGain();
      bp.type = 'bandpass'; bp.Q.value = 0.8; bp.frequency.setValueAtTime(kind === 'slide_open' ? 600 : 1300, t); bp.frequency.exponentialRampToValueAtTime(kind === 'slide_open' ? 1400 : 600, t + 0.8);
      s.connect(bp).connect(ga).connect(master); env(ga, t, 0.15, 0.09, 0.75); s.start(t, Math.random(), 1.0);
      tone(118, 112, 0.85, 0.025, 'triangle');
    } else if (kind === 'locked') { for (let i = 0; i < 3; i++) burst({ f: 2600, q: 3, d: 0.03, g: 0.3, at: i * 0.07, thump: 0.3, thumpF: 160 }); }
  }
  function ui(kind) {
    if (!ok()) return;
    if (kind === 'click') tone(1150, 1100, 0.04, 0.05);
    else if (kind === 'open') { tone(660, 660, 0.08, 0.04); tone(990, 990, 0.1, 0.035, 'sine', 0.07); }
    else if (kind === 'close') { tone(880, 880, 0.07, 0.035); tone(590, 590, 0.09, 0.03, 'sine', 0.06); }
    else if (kind === 'examine') { tone(1320, 1320, 0.25, 0.025); tone(1760, 1760, 0.3, 0.018, 'sine', 0.05); }
  }

  // ---------------------------------------------------------------- ambience
  function startAmbience() {
    const out = ctx.createGain(); out.gain.value = 1; out.connect(master);
    const wind = src(true), wlp = ctx.createBiquadFilter(), wg = ctx.createGain();
    wlp.type = 'lowpass'; wlp.frequency.value = 380; wlp.Q.value = 0.4;
    wind.connect(wlp).connect(wg).connect(out); wg.gain.value = 0; wind.start();
    const hvac = src(true), hlp = ctx.createBiquadFilter(), hg = ctx.createGain();
    hlp.type = 'lowpass'; hlp.frequency.value = 220; hvac.connect(hlp).connect(hg).connect(out); hg.gain.value = 0; hvac.start(0, 0.7);
    const hum = ctx.createOscillator(), humg = ctx.createGain(); hum.frequency.value = 120; hum.connect(humg).connect(out); humg.gain.value = 0; hum.start();
    amb = { out, wg, wlp, hg, humg };
    apply();
  }
  function apply() {
    if (!amb) return;
    const t = ctx.currentTime, inn = mix.indoor;
    amb.wg.gain.setTargetAtTime((1 - inn) * (0.04 + 0.1 * mix.wind) + inn * 0.004, t, 0.6);
    amb.hg.gain.setTargetAtTime(inn * 0.05, t, 0.6);
    amb.humg.gain.setTargetAtTime(inn * 0.0025, t, 0.6);
  }
  function bird() {
    const t0 = ctx.currentTime, n = 2 + Math.floor(Math.random() * 4), base = 2800 + Math.random() * 1800, pan = Math.random() * 1.6 - 0.8;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * (0.09 + Math.random() * 0.08), o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
      o.frequency.setValueAtTime(base * (1 + Math.random() * 0.2), t); o.frequency.exponentialRampToValueAtTime(base * (0.75 + Math.random() * 0.5), t + 0.07);
      p.pan.value = pan; o.connect(g).connect(p).connect(amb.out); env(g, t, 0.005, 0.012 * (1 - mix.indoor * 0.9), 0.07); o.start(t); o.stop(t + 0.1);
    }
  }
  function plane() {
    // a light aircraft passing in the distance: a propeller's buzz (about 80 Hz and its harmonics), muffled, slowly up and away
    const t = ctx.currentTime, dur = 16, f = 74 + Math.random() * 14;
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(), p = ctx.createStereoPanner();
    lp.type = 'lowpass'; lp.frequency.value = 650; p.pan.setValueAtTime(-0.8, t); p.pan.linearRampToValueAtTime(0.8, t + dur);
    g.connect(lp).connect(p).connect(amb.out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03 * (1 - mix.indoor * 0.85), t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const [h, a] of [[1, 1], [2, 0.6], [3, 0.35], [4, 0.2]]) {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth'; og.gain.value = a * 0.3;
      o.frequency.setValueAtTime(f * h * 1.03, t); o.frequency.linearRampToValueAtTime(f * h * 0.97, t + dur);
      o.connect(og).connect(g); o.start(t); o.stop(t + dur + 0.1);
    }
  }
  function update(dt) {
    if (!ok() || !amb) return;
    tNow += dt;
    if (tNow > next.bird) { next.bird = tNow + 4 + Math.random() * 9; if (mix.indoor < 0.7) bird(); }
    if (tNow > next.plane) { next.plane = tNow + 40 + Math.random() * 50; plane(); }
  }

  return {
    unlock,
    setVolume(v) { volume = Math.max(0, Math.min(1, +v || 0)); if (ok()) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05); },
    footstep, door, ui, update,
    setAmbience({ indoor = mix.indoor, wind = mix.wind } = {}) { mix = { indoor: Math.max(0, Math.min(1, indoor)), wind: Math.max(0, Math.min(1, wind)) }; if (ok()) apply(); },
    get ready() { return ok(); },
  };
}
