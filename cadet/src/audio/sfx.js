// CADET — audio/sfx.js : the game's sounds, made with the Web Audio API (no sound files).
// Footsteps by surface, doors, small UI sounds, and the ambience: outdoors the wind in gusts, birds now and then and a
// distant light aircraft every minute or so; indoors the air conditioning and a faint hum. Calm and quiet — this is a
// simulator, not an action game. Every call is safe before unlock() (the first click) or without Web Audio.
// In the aircraft: the engine and propeller (engine(), every frame), the engine start, the touchdown, the airflow, the
// stall warning horn, and the cockpit's chime, switches and knobs.
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
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const sm = (x, a, b) => { const u = cl((x - a) / (b - a)); return u * u * (3 - 2 * u); };

export function createAudio() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  let ctx = null, master = null, noise = null, amb = null, eng = null, volume = 0.8, foot = 0;
  // the three groups the settings turn up and down: the aircraft (engine, airflow, starter, wheels), the world around
  // (ambience, footsteps, doors), the radio (its hiss and squelch)
  let engOut = null, ambOut = null, radOut = null;
  const vols = { engine: 1, amb: 1, radio: 1 };
  const next = { bird: 6, plane: 35 };
  let tNow = 0;
  const mix = { indoor: 0, wind: 0.5, airborne: false };

  function unlock() {
    if (!AC) return;
    try {
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = volume;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
        master.connect(comp).connect(ctx.destination);
        engOut = ctx.createGain(); ambOut = ctx.createGain(); radOut = ctx.createGain();
        engOut.gain.value = vols.engine; ambOut.gain.value = vols.amb; radOut.gain.value = vols.radio;
        for (const g of [engOut, ambOut, radOut]) g.connect(master);
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
  function burst({ f, q, d, g = 0.5, type = 'bandpass', pan = 0, thump = 0, thumpF = 95, at = 0, to = master }) {
    const t = ctx.currentTime + at;
    const s = src(), bp = ctx.createBiquadFilter(), ga = ctx.createGain(), p = ctx.createStereoPanner();
    bp.type = type; bp.frequency.value = f; bp.Q.value = q; p.pan.value = pan;
    s.connect(bp).connect(ga).connect(p).connect(to);
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
    burst({ f: s.f * pit, q: s.q, d: s.d * (0.9 + 0.2 * Math.random()), g, pan, thump: s.thump, thumpF: 80 + 30 * pit, to: ambOut });
    if (s.tail) burst({ f: s.f * 0.6 * pit, q: s.q * 0.7, d: s.d * 1.8, g: g * s.tail * 0.4, pan, at: 0.02, to: ambOut });
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
    const out = ctx.createGain(); out.gain.value = 1; out.connect(ambOut);
    const wind = src(true), wlp = ctx.createBiquadFilter(), wg = ctx.createGain();
    wlp.type = 'lowpass'; wlp.frequency.value = 380; wlp.Q.value = 0.4;
    wind.connect(wlp).connect(wg).connect(out); wg.gain.value = 0; wind.start();
    const hvac = src(true), hlp = ctx.createBiquadFilter(), hg = ctx.createGain();
    hlp.type = 'lowpass'; hlp.frequency.value = 220; hvac.connect(hlp).connect(hg).connect(out); hg.gain.value = 0; hvac.start(0, 0.7);
    const hum = ctx.createOscillator(), humg = ctx.createGain(); hum.frequency.value = 120; hum.connect(humg).connect(out); humg.gain.value = 0; hum.start();
    amb = { out, wg, wlp, hg, humg };
    apply();
  }
  // airborne: the gusts in the trees fade (the airflow comes with the engine); in the aircraft (its engine sound
  // exists) there is no building's air conditioning or mains hum, whatever "indoor" says
  function apply() {
    if (!amb) return;
    const t = ctx.currentTime, inn = mix.indoor, air = mix.airborne ? 1 : 0, room = eng ? 0 : 1;
    amb.wg.gain.setTargetAtTime(((1 - inn) * (0.04 + 0.1 * mix.wind) + inn * 0.004) * (1 - 0.85 * air), t, air ? 2 : 0.6);
    amb.hg.gain.setTargetAtTime(inn * 0.05 * room, t, 0.6);
    amb.humg.gain.setTargetAtTime(inn * 0.0025 * room, t, 0.6);
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
    // nothing of the ground up in the air: no birds, no aircraft passing in the distance
    if (tNow > next.bird) { next.bird = tNow + 4 + Math.random() * 9; if (mix.indoor < 0.7 && !mix.airborne) bird(); }
    if (tNow > next.plane) { next.plane = tNow + 40 + Math.random() * 50; if (!mix.airborne) plane(); }
  }

  // ---------------------------------------------------------------- the aircraft
  // The Archer's engine is a four-cylinder Lycoming O-360 driving a two-bladed propeller directly: two firing pulses per
  // crank revolution (rpm/60·2 Hz), and the same blade-pass frequency. Its sound is built from
  //  - the exhaust: an oscillator running once per engine cycle (two revolutions) whose waveform holds the four firing
  //    pulses, each a little different in strength and timing (no two cylinders are equal: the lope of a real engine
  //    at idle), through the stacks' resonance and a low-pass that opens with power;
  //  - its crackle: noise gated by the same pulses (a chuff at idle, a rasp at full power), and the valve train's ticks
  //    with the intake's hiss, high and quiet;
  //  - the propeller: a buzz at the blade-pass frequency, and its swish (noise gated by the blades) growing with rpm;
  //  - irregularity: a slow random wander of the speed and a faster random strength from firing to firing, both
  //    strongest at idle;
  //  - the airflow (noise rising with airspeed), the tyres' rumble on the ground, the stall warning horn.
  // In the cabin (inside) the engine goes through two low-passes and a little cabin boom, and is quieter; outside (the
  // chase view) it is open, brighter and louder. The nodes are made once per engine start; engine() only moves params.
  let engBroken = false, cycWave = null, envWave = null, jitBuf = null, cranked = -1;
  // one engine cycle: the four cylinders' pulses (a quick rise, an exponential decay; a little different in strength
  // and timing), as a Fourier series in closed form. tau, rise: as fractions of the cycle
  function pulses(H, tau, rise) {
    const P = [[0, 1], [0.2535, 0.82], [0.4975, 0.94], [0.7515, 0.76]], re = new Float32Array(H + 1), im = new Float32Array(H + 1);
    for (let n = 1; n <= H; n++) {
      const w = 2 * Math.PI * n, dr = 1 - w * w * tau * rise, di = w * (tau + rise), m = dr * dr + di * di;
      let sr = 0, si = 0;
      for (const [t0, a] of P) { sr += a * Math.cos(w * t0); si -= a * Math.sin(w * t0); }
      re[n] = 2 * (sr * dr + si * di) / m; im[n] = -2 * (si * dr - sr * di) / m;
    }
    return ctx.createPeriodicWave(re, im);
  }
  function engineWaves() {
    if (cycWave) return;
    cycWave = pulses(640, 1 / 110, 1 / 550);          // the pressure pulses themselves: sharp, rich in harmonics
    envWave = pulses(160, 1 / 22, 1 / 160);           // their envelope (the chuff each one makes): broad
    // smooth random values for the irregularity: a new one every 15 ms, eased in between; 9 s, looping seamlessly
    const rate = 8000, len = rate * 9, step = 120, first = Math.random() * 2 - 1;
    jitBuf = ctx.createBuffer(1, len, rate);
    const d = jitBuf.getChannelData(0);
    let a = first, b = Math.random() * 2 - 1;
    for (let i = 0; i < len; i++) {
      if (i && i % step === 0) { a = b; b = i + step >= len ? first : Math.random() * 2 - 1; }
      d[i] = a + (b - a) * (0.5 - 0.5 * Math.cos(Math.PI * (i % step) / step));
    }
  }
  // n: the number of engines (the Seminole: 2, one on each wing, heard a little to each side; their speeds never quite
  // the same, so the two beat slowly against each other unless the pilot synchronises them)
  function buildEngine(n = 1) {
    if (engBroken) return false;
    try {
      engineWaves();
      const t = ctx.currentTime, nodes = [], srcs = [];
      const add = (x) => { nodes.push(x); return x; };
      const gain = (v = 0) => { const g = add(ctx.createGain()); g.gain.value = v; return g; };
      const filt = (type, f, q, db = 0) => { const b = add(ctx.createBiquadFilter()); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = db; return b; };
      const osc = (type) => { const o = add(ctx.createOscillator()); if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type); srcs.push(o); return o; };
      const loop = (buf, rate) => { const x = add(ctx.createBufferSource()); x.buffer = buf; x.loop = true; x.playbackRate.value = rate; srcs.push(x); return x; };
      // the whole engine fades in and out on the bus; the cabin's (or the open air's) tone on the way to it
      const bus = gain(0), mixG = gain(1), hp = filt('highpass', 32, 0.7), lp1 = filt('lowpass', 800, 0.6), lp2 = filt('lowpass', 1300, 0.5), boom = filt('peaking', 105, 1, 0);
      mixG.connect(hp).connect(lp1).connect(lp2).connect(boom).connect(bus); bus.connect(engOut);
      const voices = [];
      for (let k = 0; k < n; k++) {
        // one engine: its own noise (the two crackle apart), its sounds summed, panned to its wing
        const out = gain(n > 1 ? 0.78 : 1), pan = add(ctx.createStereoPanner());
        pan.pan.value = n > 1 ? (k ? 0.38 : -0.38) : 0; out.connect(pan).connect(mixG);
        // the exhaust
        const cyc = osc(cycWave), exPk = filt('peaking', 260, 1.2, 4), exLP = filt('lowpass', 600, 0.8), exG = gain();
        cyc.connect(exPk).connect(exLP).connect(exG).connect(out);
        // the crackle (noise gated by the pulses' envelope, in step with them), the valve train's ticks (gated by the
        // sharp pulses) and the intake's hiss
        const envO = osc(envWave), nz = loop(noise, 1 + 0.07 * k), crBP = filt('bandpass', 900, 0.5), crG = gain(), am = gain();
        nz.connect(crBP).connect(crG).connect(out); envO.connect(am); am.connect(crG.gain);
        const mkBP = filt('bandpass', 3000, 1.4), mkG = gain(), mkAm = gain();
        nz.connect(mkBP).connect(mkG).connect(out); cyc.connect(mkAm); mkAm.connect(mkG.gain);
        // the propeller: its buzz and its swish
        const prop = osc('sawtooth'), pLP = filt('lowpass', 300, 1), pG = gain();
        prop.connect(pLP).connect(pG).connect(out);
        const swBP = filt('bandpass', 600, 0.9), swG = gain(), swAm = gain();
        nz.connect(swBP).connect(swG).connect(out); prop.connect(swAm); swAm.connect(swG.gain);
        // irregularity: the speed wanders (all three oscillators together, so they stay locked), the pulses' strength
        const j1 = loop(jitBuf, 1 + 0.23 * k), jLP = filt('lowpass', 7, 0.7), jd = gain();
        j1.connect(jLP).connect(jd); jd.connect(cyc.detune); jd.connect(envO.detune); jd.connect(prop.detune);
        const j2 = loop(jitBuf, 1.37 + 0.19 * k), ja = gain();
        j2.connect(ja); ja.connect(exG.gain);
        voices.push({ out, cyc, envO, prop, exG, exLP, crBP, crG, am, mkG, mkAm, pG, pLP, swG, swAm, swBP, jd, ja, cranked: -1 });
      }
      // the airflow and the tyres (not through the engine's tone), the stall warning horn, the gear's motor
      const nz2 = loop(noise, 0.93), wBP = filt('bandpass', 500, 0.6), wG = gain();
      nz2.connect(wBP).connect(wG).connect(bus);
      const rLP = filt('lowpass', 120, 0.8), rG = gain();
      nz2.connect(rLP).connect(rG).connect(bus);
      const horn = osc('triangle'), hLP = filt('lowpass', 5000, 0.7), hG = gain();
      horn.frequency.value = 2800; horn.connect(hLP).connect(hG).connect(bus);
      // (the Seminole's gear: an electric hydraulic pump whining while the wheels travel, about 6 s)
      const gm = osc('sawtooth'), gmLP = filt('lowpass', 900, 1.5), gmG = gain();
      gm.frequency.value = 410; gm.connect(gmLP).connect(gmG).connect(bus);
      for (const x of srcs) { if (x.buffer) x.start(t, Math.random() * 1.9); else x.start(t); }
      bus.gain.setTargetAtTime(1, t, 0.15);
      eng = { n, nodes, srcs, voices, last: new Map(), inside: true, bus, mixG, lp1, lp2, boom, wG, wBP, rG, hG, gm, gmG, ...voices[0] };
      apply();
      return true;
    } catch (e) { engBroken = true; eng = null; return false; }
  }
  // a parameter glides to v (an automation event only when the target really changes: none for a steady state)
  function glide(p, v, tc) {
    const was = eng.last.get(p);
    if (was !== undefined && Math.abs(was - v) <= 1e-5 + Math.abs(v) * 0.002) return;
    eng.last.set(p, v); p.setTargetAtTime(v, ctx.currentTime, tc);
  }
  // one engine's voice at rpm (running: firing; false while its start is under way: only the starter's sound then)
  function voice(e, rpm, thr, running, inside) {
    const since = e.cranked >= 0 ? ctx.currentTime - e.cranked : cranked >= 0 ? ctx.currentTime - cranked : 1e9;
    const fire = running ? sm(rpm, 250, 480) : since < 3.5 ? sm(since, 1.75, 2.45) : 0;
    const r = rpm / 2400, idle = 1 - sm(rpm, 750, 1600), fc = Math.max(rpm, 60) / 120;
    glide(e.cyc.frequency, fc, 0.03); glide(e.envO.frequency, fc, 0.03); glide(e.prop.frequency, fc * 4, 0.03);
    glide(e.jd.gain, 25 + 160 * idle, 0.3);                                      // cents, before its 7 Hz low-pass
    // the exhaust: stronger and brighter with power
    const ex = fire * (0.14 + 0.2 * thr + 0.06 * r);
    glide(e.exG.gain, ex, 0.05); glide(e.ja.gain, ex * (0.12 + 0.4 * idle), 0.05);
    glide(e.exLP.frequency, 380 + 1000 * thr + 500 * r, 0.06);
    const cr = fire * (0.22 + 0.3 * thr + 0.1 * idle);
    glide(e.am.gain, cr, 0.05); glide(e.crG.gain, cr * 0.2, 0.05); glide(e.crBP.frequency, 650 + 900 * thr, 0.1);
    glide(e.mkG.gain, fire * 0.02 * thr, 0.1); glide(e.mkAm.gain, fire * 0.12 * (0.3 + r), 0.1);
    // the propeller: grows fast with rpm (its tips' speed), more of it outside
    const pk = fire * (inside ? 0.7 : 1.2), sw = pk * 0.25 * r * r * r * r;
    glide(e.pG.gain, pk * (0.02 + 0.1 * r * r * r), 0.05); glide(e.pLP.frequency, fc * 4 * (2 + 6 * r * r), 0.05);
    glide(e.swG.gain, sw, 0.05); glide(e.swAm.gain, sw, 0.05); glide(e.swBP.frequency, 450 + 900 * r, 0.1);
  }
  // o: { rpm, thr 0..1, ias kt, onGround, stall, inside (the cockpit view; default true), running (false while the
  // start is under way: only starter()'s sound then; default true), engines (a twin: [{ rpm, running }, …] each),
  // gearMoving } every frame; null: fade out and let the nodes go
  function engine(o) {
    if (!o) { stopEngine(); return; }
    const n = Array.isArray(o.engines) && o.engines.length > 1 ? o.engines.length : 1;
    if (eng && eng.n !== n) stopEngine();
    if (!ok() || (!eng && !buildEngine(n))) return;
    const e = eng, thr = cl(+o.thr || 0), ias = cl(+o.ias || 0, 0, 300), inside = o.inside !== false;
    e.inside = inside;
    if (n > 1) e.voices.forEach((v, k) => { const x = o.engines[k] || {}; voice(v, cl(+x.rpm || 0, 0, 3200), thr, x.running !== false, inside); });
    else voice(e.voices[0], cl(+o.rpm || 0, 0, 3200), thr, o.running !== false, inside);
    // the cabin, or the open air
    glide(e.mixG.gain, inside ? 0.62 : 0.72, 0.08);
    glide(e.lp1.frequency, inside ? 1000 : 9000, 0.08); glide(e.lp2.frequency, inside ? 2000 : 16000, 0.08); glide(e.boom.gain, inside ? 3 : 0, 0.08);
    // the airflow, the tyres rolling, the stall warning horn, the gear's pump
    const u = Math.min(ias / 120, 1.4);
    glide(e.wG.gain, u * u * (inside ? 0.04 : 0.09), 0.2); glide(e.wBP.frequency, inside ? 380 + 500 * u : 500 + 1500 * u, 0.2);
    glide(e.rG.gain, o.onGround ? Math.min(1, ias / 30) * (inside ? 0.1 : 0.06) : 0, 0.08);
    glide(e.hG.gain, o.stall ? (inside ? 0.028 : 0.018) : 0, 0.015);
    glide(e.gmG.gain, o.gearMoving ? (inside ? 0.012 : 0.006) : 0, 0.12);
  }
  function stopEngine() {
    if (!eng) return;
    const e = eng; eng = null; cranked = -1;
    if (ok()) {
      const t = ctx.currentTime;
      e.bus.gain.setTargetAtTime(0, t, 0.1);
      for (const s of e.srcs) s.stop(t + 0.6);
      apply();
    }
    setTimeout(() => { for (const n of e.nodes) n.disconnect(); }, 700);
  }

  // the engine start (about 2.6 s): the starter motor's whine, dragged down at each compression (the propeller's slow
  // chuffs), the first uneven firings, then the engine's own sound (engine()) fades in and settles at idle
  function starter() {
    if (!ok()) return;
    const t = ctx.currentTime, inside = eng ? eng.inside : true;
    cranked = t;
    const C = [0.24, 0.5, 0.76, 1.0, 1.23], F = [1.42, 1.57, 1.66, 1.81, 1.89, 1.97, 2.06, 2.13, 2.21];
    const m = ctx.createOscillator(), mlp = ctx.createBiquadFilter(), mg = ctx.createGain();
    m.type = 'sawtooth'; mlp.type = 'lowpass'; mlp.frequency.value = inside ? 1400 : 2600; mlp.Q.value = 2;
    m.connect(mlp).connect(mg).connect(engOut);
    m.frequency.setValueAtTime(140, t); m.frequency.exponentialRampToValueAtTime(430, t + 0.15);
    for (const c of C) { m.frequency.setTargetAtTime(330, t + c - 0.03, 0.035); m.frequency.setTargetAtTime(440, t + c + 0.07, 0.07); }
    m.frequency.setTargetAtTime(90, t + 1.46, 0.2);
    mg.gain.setValueAtTime(0.0001, t); mg.gain.exponentialRampToValueAtTime(0.035, t + 0.08); mg.gain.setTargetAtTime(0, t + 1.44, 0.07);
    // the chuffs and the firings: one noise and one low thump, with an envelope per event
    const s = src(true), lp = ctx.createBiquadFilter(), g = ctx.createGain(), th = ctx.createOscillator(), tg = ctx.createGain();
    lp.type = 'lowpass'; lp.Q.value = 0.7; lp.frequency.value = 420; g.gain.value = 0; tg.gain.value = 0;
    s.connect(lp).connect(g).connect(engOut); th.connect(tg).connect(engOut);
    for (const c of C) {
      lp.frequency.setValueAtTime(420, t + c); th.frequency.setValueAtTime(48, t + c);
      g.gain.setTargetAtTime(0.06, t + c, 0.03); g.gain.setTargetAtTime(0, t + c + 0.08, 0.06);
      tg.gain.setTargetAtTime(0.05, t + c, 0.02); tg.gain.setTargetAtTime(0, t + c + 0.06, 0.05);
    }
    for (const c0 of F) {
      const c = c0 + Math.random() * 0.02, a = (c0 < 1.7 ? 0.14 : 0.1) * (0.6 + 0.5 * Math.random());
      lp.frequency.setValueAtTime(1500, t + c); th.frequency.setValueAtTime(78, t + c); th.frequency.setTargetAtTime(45, t + c, 0.03);
      g.gain.setTargetAtTime(a, t + c, 0.003); g.gain.setTargetAtTime(0, t + c + 0.012, 0.03);
      tg.gain.setTargetAtTime(a * 1.4, t + c, 0.003); tg.gain.setTargetAtTime(0, t + c + 0.01, 0.04);
    }
    m.start(t); m.stop(t + 2); s.start(t, Math.random() * 1.5); s.stop(t + 2.7); th.start(t); th.stop(t + 2.7);
    burst({ f: 2400, q: 1.2, d: 0.03, g: 0.14, thump: 0.4, thumpF: 120, to: engOut });       // the starter's gear engaging
  }
  // the starter turning the engine for as long as the key is at START (M4: the start from aircraft/systems.js): the
  // motor's whine dragged down at each compression (about 4 a second at cranking speed) with a chuff, until crank(false);
  // fire() is the first uneven firings when it catches
  // (side: −1 the left engine of a twin, +1 the right, 0 the single engine in the nose)
  let crk = null;
  function crank(on, side = 0) {
    if (!ok()) return;
    const t = ctx.currentTime;
    if (on && !crk) {
      const inside = eng ? eng.inside : true, out = ctx.createStereoPanner();
      out.pan.value = cl(+side || 0, -1, 1) * 0.38; out.connect(engOut);
      const m = ctx.createOscillator(), mlp = ctx.createBiquadFilter(), mg = ctx.createGain();
      m.type = 'sawtooth'; mlp.type = 'lowpass'; mlp.frequency.value = inside ? 1400 : 2600; mlp.Q.value = 2;
      m.frequency.setValueAtTime(140, t); m.frequency.exponentialRampToValueAtTime(430, t + 0.15);
      // the compressions: a slow square wave pulling the motor's pitch down (and a chuff of noise with each)
      const lfo = ctx.createOscillator(), lg = ctx.createGain(), s = src(true), nlp = ctx.createBiquadFilter(), ng = ctx.createGain(), nAm = ctx.createGain();
      lfo.type = 'square'; lfo.frequency.value = 3.9; lg.gain.value = 55;
      lfo.connect(lg).connect(m.frequency);
      nlp.type = 'lowpass'; nlp.frequency.value = 420; ng.gain.value = 0.03; nAm.gain.value = 0.03;
      lfo.connect(nAm.gain);
      s.connect(nlp).connect(ng).connect(nAm).connect(out);
      m.connect(mlp).connect(mg).connect(out);
      mg.gain.setValueAtTime(0.0001, t); mg.gain.exponentialRampToValueAtTime(0.035, t + 0.08);
      m.start(t); lfo.start(t); s.start(t, Math.random() * 1.5);
      burst({ f: 2400, q: 1.2, d: 0.03, g: 0.14, thump: 0.4, thumpF: 120, to: engOut });       // the starter's gear engaging
      crk = { m, lfo, s, mg, ng };
    } else if (!on && crk) {
      const c = crk; crk = null;
      c.mg.gain.setTargetAtTime(0, t, 0.06); c.ng.gain.setTargetAtTime(0, t, 0.06); c.m.frequency.setTargetAtTime(90, t, 0.15);
      for (const n of [c.m, c.lfo, c.s]) n.stop(t + 0.5);
    }
  }
  function fire(side = 0) {
    if (!ok()) return;
    const t = ctx.currentTime, F = [0.0, 0.12, 0.21, 0.36, 0.44, 0.52, 0.61, 0.68, 0.76];
    const s = src(true), lp = ctx.createBiquadFilter(), g = ctx.createGain(), th = ctx.createOscillator(), tg = ctx.createGain(), out = ctx.createStereoPanner();
    out.pan.value = cl(+side || 0, -1, 1) * 0.38; out.connect(engOut);
    lp.type = 'lowpass'; lp.Q.value = 0.7; lp.frequency.value = 1500; g.gain.value = 0; tg.gain.value = 0;
    s.connect(lp).connect(g).connect(out); th.connect(tg).connect(out);
    for (const c0 of F) {
      const c = c0 + Math.random() * 0.02, a = (c0 < 0.3 ? 0.14 : 0.1) * (0.6 + 0.5 * Math.random());
      th.frequency.setValueAtTime(78, t + c); th.frequency.setTargetAtTime(45, t + c, 0.03);
      g.gain.setTargetAtTime(a, t + c, 0.003); g.gain.setTargetAtTime(0, t + c + 0.012, 0.03);
      tg.gain.setTargetAtTime(a * 1.4, t + c, 0.003); tg.gain.setTargetAtTime(0, t + c + 0.01, 0.04);
    }
    s.start(t, Math.random() * 1.5); s.stop(t + 1.2); th.start(t); th.stop(t + 1.2);
  }
  // the radio: the hiss of the squelch opening at the start and closing at the end of a transmission
  function squelch() { if (!ok()) return; burst({ f: 2200, q: 0.8, d: 0.07, g: 0.05, to: radOut }); }
  // a transmission heard (for about sec seconds, or until radio(0)): the squelch opens, the carrier's hiss sits under
  // the voice — band-limited like a VHF receiver's speaker (300–3,000 Hz), with a faint crackle — then the squelch
  // tail as it closes
  let rad = null;
  function radio(sec = 3) {
    if (!ok()) return;
    const t = ctx.currentTime;
    if (rad) { rad.g.gain.setTargetAtTime(0, t, 0.03); rad.s.stop(t + 0.3); rad.c.stop(t + 0.3); clearTimeout(rad.timer); rad = null; burst({ f: 3400, q: 0.6, d: 0.12, g: 0.06, to: radOut }); }
    if (!(sec > 0)) return;
    squelch();
    const s = src(true), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 300; lp.type = 'lowpass'; lp.frequency.value = 3000;
    s.connect(hp).connect(lp).connect(g).connect(radOut);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 0.05);
    // the crackle: the hiss's level shaken by a fast random square wave
    const c = ctx.createOscillator(), cg = ctx.createGain(); c.type = 'square'; c.frequency.value = 23; cg.gain.value = 0.004;
    c.connect(cg).connect(g.gain);
    s.start(t, Math.random() * 1.5); c.start(t);
    const me = { s, c, g, timer: setTimeout(() => { if (rad === me) radio(0); }, Math.min(20, sec) * 1000) };
    rad = me;
  }
  // the wheels meeting the runway: a tyre chirp (the other main wheel a moment later) and the gear's thump, both
  // stronger for a harder landing (fpm: the sink rate at touchdown, ft/min)
  function touchdown(fpm = 200) {
    if (!ok()) return;
    const k = cl(((+fpm || 0) - 40) / 600, 0.08, 1), t = ctx.currentTime, inside = eng ? eng.inside : true;
    const s = src(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.Q.value = 7; bp.frequency.setValueAtTime(2300, t); bp.frequency.exponentialRampToValueAtTime(1500, t + 0.25);
    s.connect(bp).connect(g).connect(engOut); g.gain.value = 0;
    const ch = (inside ? 0.6 : 1) * (0.25 + 1.1 * k), dec = 0.02 + 0.035 * k, t2 = t + 0.07 - 0.04 * k;
    g.gain.setTargetAtTime(ch, t, 0.004); g.gain.setTargetAtTime(0, t + 0.02, dec);
    g.gain.setTargetAtTime(ch * 0.8, t2, 0.004); g.gain.setTargetAtTime(0, t2 + 0.02, dec);
    s.start(t, Math.random() * 1.5); s.stop(t + 0.6);
    burst({ f: 420, q: 0.7, d: 0.1 + 0.15 * k, g: 0.08 + 0.3 * k, type: 'lowpass', thump: 0.9, thumpF: 70 + 30 * k, to: engOut });
    if (k > 0.6) burst({ f: 900, q: 1, d: 0.08, g: 0.12 * k, at: 0.09, to: engOut });      // a hard one rattles
  }
  // the cockpit's chime at a new lesson step (two soft tones), a switch or lever (a crisp snap), a knob's detent (a tick)
  function chime() { if (!ok()) return; tone(1175, 1175, 0.3, 0.032); tone(880, 880, 0.42, 0.03, 'sine', 0.17); }
  function click() { if (!ok()) return; burst({ f: 3600, q: 1.6, d: 0.014, g: 0.3, thump: 0.25, thumpF: 320 }); }
  function knob() { if (!ok()) return; burst({ f: 4800, q: 2, d: 0.008, g: 0.2 }); }

  return {
    unlock,
    setVolume(v) { volume = Math.max(0, Math.min(1, +v || 0)); if (ok()) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05); },
    footstep, door, ui, update,
    engine, starter, crank, fire, squelch, radio, touchdown, chime, click, knob,
    // the three groups' levels (0..1 each, under the overall volume)
    setVolumes({ engine = vols.engine, amb = vols.amb, radio: rv = vols.radio } = {}) {
      vols.engine = cl(+engine || 0); vols.amb = cl(+amb || 0); vols.radio = cl(+rv || 0);
      if (ok()) { const t = ctx.currentTime; engOut.gain.setTargetAtTime(vols.engine, t, 0.05); ambOut.gain.setTargetAtTime(vols.amb, t, 0.05); radOut.gain.setTargetAtTime(vols.radio, t, 0.05); }
    },
    // indoor 0..1 (the cockpit: 0.6), wind 0..1, airborne (above ≈30 m: nothing of the ground)
    setAmbience({ indoor = mix.indoor, wind = mix.wind, airborne = mix.airborne } = {}) {
      mix.indoor = cl(+indoor || 0); mix.wind = cl(+wind || 0); mix.airborne = !!airborne;
      if (ok()) apply();
    },
    get ready() { return ok(); },
  };
}
