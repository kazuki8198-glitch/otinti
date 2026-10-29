// CADET — sound tests (node --test): src/audio/sfx.js against a fake Web Audio context that records every node, connection
// and parameter automation (and throws where a browser would: non-finite values, exponential ramps to 0, a source
// started twice or stopped before it started).
//  - the API is all there; nothing is made and nothing throws before unlock(), or without Web Audio at all;
//  - engine(): its nodes are made on the first call only (600 frames of changing inputs add none), a steady state adds
//    no automation, odd inputs don't throw;
//  - the firing frequency follows rpm (two pulses per revolution, the propeller's blade pass the same), from a cycle
//    waveform with the four cylinders' pulses (firing harmonics strongest, the half-orders present: not a single line);
//  - the propeller grows and brightens with rpm, the exhaust with the throttle;
//  - inside the cabin the engine is low-passed lower and quieter than outside;
//  - the stall horn is on while stall is true and off after;
//  - engine(null) fades, stops and disconnects everything; a later engine() starts afresh;
//  - starter() lets the engine's own sound catch about 2 s in (running still false), and no later;
//  - the one-shots make a bounded number of nodes, reach the master and all end; a hard touchdown is louder;
//  - setAmbience: airborne → no birds or distant aircraft and the gusts fade; in the aircraft no building air
//    conditioning; the old { indoor, wind } calls still work;
//  - (M7) a twin: two engine voices, one to each side, each at its own rpm (one running while the other is still
//    being started); the gear's pump while the wheels travel; the radio's hiss for a transmission, then the squelch
//    tail; the three groups' volumes (aircraft, around, radio) each under the overall volume.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/audio/sfx.js';

// ---- the fake Web Audio
class Param {
  constructor(name, v) { this.name = name; this.value = v; this.events = []; this.inputs = []; }
  ev(type, v, t, tc) {
    if (!Number.isFinite(v) || !Number.isFinite(t)) throw new TypeError(`${this.name}.${type}: non-finite ${v} @ ${t}`);
    this.events.push({ type, v, t, tc }); return this;
  }
  setValueAtTime(v, t) { return this.ev('set', v, t); }
  linearRampToValueAtTime(v, t) { return this.ev('linear', v, t); }
  exponentialRampToValueAtTime(v, t) { if (!(Math.abs(v) > 0)) throw new RangeError(`${this.name}: exponential ramp to ${v}`); return this.ev('exp', v, t); }
  setTargetAtTime(v, t, tc) { if (!(tc >= 0) || !Number.isFinite(tc)) throw new RangeError(`${this.name}: time constant ${tc}`); return this.ev('target', v, t, tc); }
  cancelScheduledValues(t) { this.events = this.events.filter(e => e.t < t); return this; }
  get target() { return this.events.length ? this.events[this.events.length - 1].v : this.value; }
  get peak() { return this.events.length ? Math.max(...this.events.map(e => e.v)) : this.value; }
}
class Node {
  constructor(ctx, kind, params = {}) {
    this.ctx = ctx; this.kind = kind; this.outs = []; this.disconnected = false; ctx.nodes.push(this);
    for (const [k, v] of Object.entries(params)) this[k] = new Param(`${kind}.${k}`, v);
  }
  connect(d) {
    if (!(d instanceof Node || d instanceof Param)) throw new TypeError('connect: not a node or param');
    this.outs.push(d);
    if (d instanceof Param) { d.inputs.push(this); return undefined; }   // a browser returns nothing here
    return d;
  }
  disconnect() { this.outs.length = 0; this.disconnected = true; }
}
class Source extends Node {
  start(t = 0, off, dur) { if (this.started) throw new Error('InvalidStateError: started twice'); this.started = { t, off, dur }; }
  stop(t = 0) { if (!this.started) throw new Error('InvalidStateError: stopped before start'); this.stopped = t; }
  get ends() {
    if (!this.started) return -Infinity;
    if (this.stopped != null) return this.stopped;
    if (this.started.dur != null) return this.started.t + this.started.dur;
    if (this.kind === 'buffer' && !this.loop) return this.started.t + this.buffer.duration;
    return Infinity;
  }
}
class FakeContext {
  constructor() {
    FakeContext.made++; FakeContext.last = this;
    this.nodes = []; this.currentTime = 0; this.sampleRate = 48000; this.state = 'running';
    this.destination = new Node(this, 'destination');
  }
  resume() { return Promise.resolve(); }
  createGain() { return new Node(this, 'gain', { gain: 1 }); }
  createBiquadFilter() { const b = new Node(this, 'biquad', { frequency: 350, Q: 1, gain: 0, detune: 0 }); b.type = 'lowpass'; return b; }
  createDynamicsCompressor() { return new Node(this, 'compressor', { threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 }); }
  createStereoPanner() { return new Node(this, 'panner', { pan: 0 }); }
  createOscillator() { const o = new Source(this, 'osc', { frequency: 440, detune: 0 }); o.type = 'sine'; o.setPeriodicWave = (w) => { o.type = 'custom'; o.wave = w; }; return o; }
  createBufferSource() { const s = new Source(this, 'buffer', { playbackRate: 1, detune: 0 }); s.buffer = null; s.loop = false; return s; }
  createBuffer(ch, len, sr) {
    if (!(len > 0) || !(sr >= 3000 && sr <= 768000)) throw new RangeError('createBuffer');
    const data = Array.from({ length: ch }, () => new Float32Array(len));
    return { numberOfChannels: ch, length: len, sampleRate: sr, duration: len / sr, getChannelData: (i) => data[i] };
  }
  createPeriodicWave(re, im) {
    if (re.length !== im.length || re.length < 2) throw new Error('createPeriodicWave: lengths');
    for (let i = 0; i < re.length; i++) if (!Number.isFinite(re[i]) || !Number.isFinite(im[i])) throw new TypeError('createPeriodicWave: non-finite');
    return { re, im };
  }
}
FakeContext.made = 0;
globalThis.window = { AudioContext: FakeContext };

// ---- helpers
const O = (over = {}) => ({ rpm: 2300, thr: 0.7, ias: 100, onGround: false, stall: false, inside: true, running: true, ...over });
function fresh() { const a = createAudio(); a.unlock(); return { a, ctx: FakeContext.last }; }
const step = (ctx, dt = 1 / 60) => { ctx.currentTime += dt; };
const masterOf = (ctx) => ctx.nodes.find(n => n.kind === 'gain' && n.outs.some(o => o.kind === 'compressor'));
// every node downstream of n (through node connections, not into params)
function below(n, seen = new Set()) { for (const o of n.outs) if (o instanceof Node && !seen.has(o)) { seen.add(o); below(o, seen); } return seen; }
const reaches = (n, target) => below(n).has(target);
// the engine's nodes: those made by the first engine() call
function engineGraph(a, ctx, o = O()) {
  const n0 = ctx.nodes.length; a.engine(o);
  const nodes = ctx.nodes.slice(n0), oscs = nodes.filter(n => n.kind === 'osc');
  const cyc = oscs.find(n => n.type === 'custom' && n.wave.re.length > 300);
  const prop = oscs.find(n => n.type === 'sawtooth');
  const horn = oscs.find(n => n.frequency.value > 2000 && n.frequency.value < 3600);
  // the shared chain the engine's sounds go through (the cabin's tone and the bus)
  const shared = [...below(cyc)].filter(n => below(prop).has(n));
  const only = (src, not) => [...below(src)].filter(n => !below(not).has(n) && n.kind === 'gain');
  return { nodes, cyc, prop, horn, shared, exGain: only(cyc, prop)[0], propGain: only(prop, cyc)[0], hornGain: only(horn, cyc)[0] };
}
const lowest = (chain) => Math.min(...chain.filter(n => n.kind === 'biquad' && n.type === 'lowpass').map(n => n.frequency.target));
const gainOf = (chain) => chain.filter(n => n.kind === 'gain').reduce((p, n) => p * n.gain.target, 1);
const events = (nodes) => nodes.reduce((s, n) => s + Object.values(n).filter(v => v instanceof Param).reduce((k, p) => k + p.events.length, 0), 0);
const mag = (w, n) => Math.hypot(w.re[n], w.im[n]);

test('sfx: the API is there; nothing is made and nothing throws before unlock() or without Web Audio', () => {
  const made = FakeContext.made, a = createAudio();
  for (const k of ['unlock', 'setVolume', 'footstep', 'door', 'ui', 'update', 'setAmbience', 'engine', 'starter', 'touchdown', 'chime', 'click', 'knob']) assert.equal(typeof a[k], 'function', k);
  assert.equal(a.ready, false);
  const all = (x) => {
    x.engine(O()); x.engine(O({ stall: true, inside: false })); x.starter(); x.touchdown(500); x.chime(); x.click(); x.knob();
    x.engine(null); x.setAmbience({ indoor: 0.6, wind: 0.5, airborne: true }); x.setAmbience(); x.update(1 / 60);
    x.footstep('grass'); x.door('swing_open'); x.ui('click'); x.setVolume(0.5);
  };
  assert.doesNotThrow(() => all(a));
  assert.equal(FakeContext.made, made, 'no context before unlock()');
  const w = globalThis.window; delete globalThis.window;
  try { const b = createAudio(); assert.doesNotThrow(() => { b.unlock(); all(b); }); assert.equal(b.ready, false); } finally { globalThis.window = w; }
  a.unlock(); assert.equal(a.ready, true);
});

test('sfx: engine() makes its nodes once — 600 frames of changing inputs add none, a steady state adds no automation', () => {
  const { a, ctx } = fresh();
  a.engine(O());
  const n1 = ctx.nodes.length;
  for (let i = 0; i < 600; i++) {
    step(ctx);
    a.engine({ rpm: 650 + i * 3.5, thr: (i % 100) / 100, ias: i / 5, onGround: i < 300, stall: i % 120 < 20, inside: i % 200 < 100, running: i > 10 });
  }
  assert.equal(ctx.nodes.length, n1, 'no node made after the first call');
  const ev = events(ctx.nodes);
  for (let i = 0; i < 100; i++) { step(ctx); a.engine(O()); }
  const ev1 = events(ctx.nodes);
  for (let i = 0; i < 100; i++) { step(ctx); a.engine(O()); }
  assert.ok(ev1 - ev < 60, 'settling onto a new state: a few events');
  assert.equal(events(ctx.nodes), ev1, 'a steady state: no new automation events');
  assert.doesNotThrow(() => { a.engine({}); a.engine({ rpm: NaN, thr: undefined, ias: Infinity, inside: undefined }); a.engine({ rpm: -50, thr: 3, ias: -1 }); });
  assert.equal(ctx.nodes.length, n1);
});

test('sfx: the firing frequency follows rpm (two pulses per revolution), from four uneven cylinders', () => {
  const { a, ctx } = fresh();
  const g = engineGraph(a, ctx, O({ rpm: 2400 }));
  assert.ok(g.cyc && g.prop && g.horn, 'the cycle, propeller and horn oscillators');
  const oscs = g.nodes.filter(n => n.kind === 'osc');
  const f2400 = oscs.map(n => n.frequency.target);
  step(ctx); a.engine(O({ rpm: 1200 }));
  const f1200 = oscs.map(n => n.frequency.target);
  assert.ok(f2400.some(f => Math.abs(f - 2400 / 30) < 1e-9), 'an oscillator at the firing / blade-pass frequency rpm/60·2');
  assert.ok(Math.abs(g.cyc.frequency.target * 4 - 1200 / 30) < 1e-9, 'the cycle oscillator runs at a quarter of it (one cycle = 2 revolutions)');
  let following = 0;
  oscs.forEach((n, i) => { if (f1200[i] !== f2400[i]) { following++; assert.ok(Math.abs(f2400[i] / f1200[i] - 2) < 1e-9, 'proportional to rpm'); } });
  assert.ok(following >= 2);
  for (const rpm of [700, 1500, 2700]) { step(ctx); a.engine(O({ rpm })); assert.ok(Math.abs(g.prop.frequency.target - rpm / 30) < 1e-9 && Math.abs(g.cyc.frequency.target - rpm / 120) < 1e-9, `at ${rpm}`); }
  // the cycle waveform: firing harmonics (multiples of 4) strongest, the half-orders of uneven cylinders present, rich
  const w = g.cyc.wave, top = Math.max(...Array.from({ length: w.re.length - 1 }, (_, i) => mag(w, i + 1)));
  assert.ok(mag(w, 4) > 2 * Math.max(mag(w, 1), mag(w, 2), mag(w, 3)), 'the firing frequency dominates the cycle');
  for (const n of [1, 2, 3, 5, 6, 7]) assert.ok(mag(w, n) > 0.01 * mag(w, 4), `half-order ${n}/4 present`);
  const rich = Array.from({ length: w.re.length - 1 }, (_, i) => mag(w, i + 1)).filter(m => m > 0.05 * top).length;
  assert.ok(rich >= 60, `many harmonics, not a sine (${rich})`);
  // the speed's random wander reaches both oscillators equally (they stay locked)
  const wander = g.nodes.find(n => n.kind === 'gain' && n.outs.includes(g.cyc.detune));
  assert.ok(wander && wander.outs.includes(g.prop.detune));
});

test('sfx: the propeller grows and brightens with rpm, the exhaust with the throttle', () => {
  const { a, ctx } = fresh();
  const g = engineGraph(a, ctx, O({ rpm: 700, thr: 0.1 }));
  const pLP = [...below(g.prop)].find(n => n.kind === 'biquad');
  let lastG = -1, lastF = -1;
  for (const rpm of [700, 1200, 1700, 2200, 2700]) {
    step(ctx); a.engine(O({ rpm, thr: 0.5 }));
    assert.ok(g.propGain.gain.target > lastG && pLP.frequency.target > lastF, `propeller at ${rpm}`);
    lastG = g.propGain.gain.target; lastF = pLP.frequency.target;
  }
  let lastE = -1;
  for (const thr of [0, 0.3, 0.6, 1]) { step(ctx); a.engine(O({ rpm: 2000, thr })); assert.ok(g.exGain.gain.target > lastE); lastE = g.exGain.gain.target; }
  // not running (the start under way, no starter): the engine is silent
  step(ctx); a.engine(O({ running: false, rpm: 0 }));
  assert.equal(g.exGain.gain.target, 0); assert.equal(g.propGain.gain.target, 0);
  step(ctx); a.engine({ rpm: 2000, thr: 0.5 });
  assert.ok(g.exGain.gain.target > 0, 'running unless said otherwise');
});

test('sfx: inside the cabin the engine is muffled (a lower low-pass) and quieter than outside', () => {
  const { a, ctx } = fresh();
  const g = engineGraph(a, ctx, O({ inside: false }));
  const outCut = lowest(g.shared), outGain = gainOf(g.shared);
  step(ctx); a.engine(O({ inside: true }));
  const inCut = lowest(g.shared), inGain = gainOf(g.shared);
  assert.ok(inCut < outCut / 3, `cut-off inside ${inCut} Hz vs outside ${outCut} Hz`);
  assert.ok(inCut >= 500 && inCut <= 2000, 'muffled, not gone');
  assert.ok(inGain < outGain, `level inside ${inGain} vs outside ${outGain}`);
  assert.ok(g.propGain.gain.target > 0);
  step(ctx); a.engine(O({ inside: false }));
  assert.equal(lowest(g.shared), outCut);
});

test('sfx: the stall warning horn sounds while stall is true, and stops after', () => {
  const { a, ctx } = fresh();
  const g = engineGraph(a, ctx, O({ stall: false }));
  assert.ok(Math.abs(g.horn.frequency.value - 2800) < 400, 'a steady tone near 2.8 kHz');
  assert.ok(reaches(g.horn, masterOf(ctx)));
  assert.equal(g.hornGain.gain.target, 0);
  step(ctx); a.engine(O({ stall: true }));
  assert.ok(g.hornGain.gain.target > 0.01, 'on');
  step(ctx); a.engine(O({ stall: true, inside: false }));
  assert.ok(g.hornGain.gain.target > 0.01, 'heard outside too');
  step(ctx); a.engine(O({ stall: false }));
  assert.equal(g.hornGain.gain.target, 0, 'off');
  assert.ok(g.hornGain.gain.events.every(e => e.type !== 'target' || e.tc > 0 && e.tc < 0.05), 'quick but not a click');
});

test('sfx: engine(null) fades, stops and disconnects everything; a later engine() starts afresh', async () => {
  const { a, ctx } = fresh();
  const master = masterOf(ctx);
  const g = engineGraph(a, ctx, O());
  const n = g.nodes.length, bus = g.nodes.find(x => x.kind === 'gain' && x.outs.some(o => !g.nodes.includes(o)));   // (into the aircraft's group)
  for (let i = 0; i < 30; i++) { step(ctx); a.engine(O()); }
  const t = ctx.currentTime;
  a.engine(null);
  assert.equal(bus.gain.target, 0, 'fades out');
  for (const s of g.nodes.filter(x => x instanceof Source)) assert.ok(s.stopped > t && s.stopped <= t + 1, `${s.kind} stops after the fade`);
  assert.doesNotThrow(() => a.engine(null), 'twice is fine');
  await new Promise(r => setTimeout(r, 800));
  assert.ok(g.nodes.every(x => x.disconnected && x.outs.length === 0), 'every node let go');
  step(ctx);
  const h = engineGraph(a, ctx, O());
  assert.equal(h.nodes.length, n, 'a new engine, the same graph');
  assert.ok(h.nodes.every(x => !g.nodes.includes(x)));
  assert.ok(reaches(h.cyc, master) && reaches(h.prop, master));
  for (let i = 0; i < 10; i++) { step(ctx); a.engine(O()); }
  assert.equal(ctx.nodes.length - ctx.nodes.indexOf(h.nodes[0]), n);
});

test('sfx: starter() — the engine catches about 2 s in with running still false, then hands over to engine()', () => {
  const { a, ctx } = fresh();
  const g = engineGraph(a, ctx, O({ running: false, rpm: 0, thr: 0, ias: 0, onGround: true }));
  const n0 = ctx.nodes.length;
  a.starter();
  const made = ctx.nodes.slice(n0);
  assert.ok(made.length > 0 && made.length <= 20, `bounded (${made.length})`);
  const t0 = ctx.currentTime, at = (s, o) => { ctx.currentTime = t0 + s; a.engine(O({ thr: 0, ias: 0, onGround: true, ...o })); return g.exGain.gain.target; };
  assert.equal(at(0.5, { running: false, rpm: 70 }), 0, 'cranking: only the starter');
  assert.ok(at(2.3, { running: false, rpm: 560 }) > 0, 'catching');
  assert.ok(at(2.7, { running: true, rpm: 650 }) > 0, 'running at idle');
  assert.equal(at(5, { running: false, rpm: 650 }), 0, 'stopped again, long after the start');
  for (const s of made.filter(x => x instanceof Source)) assert.ok(s.ends <= t0 + 3, 'the start sound ends');
});

test('sfx: the one-shots make a few nodes, reach the master and all end; a hard touchdown is louder', () => {
  const { a, ctx } = fresh();
  const master = masterOf(ctx);
  const shot = (fn, max) => {
    const n0 = ctx.nodes.length, t = ctx.currentTime; fn();
    const made = ctx.nodes.slice(n0), srcs = made.filter(x => x instanceof Source);
    assert.ok(made.length > 0 && made.length <= max, `${made.length} nodes`);
    assert.ok(srcs.length > 0 && srcs.every(s => s.started && s.ends <= t + 3), 'every source started and scheduled to end');
    assert.ok(srcs.every(s => reaches(s, master)), 'heard');
    return made;
  };
  for (const inside of [true, false]) {
    a.engine(O({ inside }));
    shot(() => a.starter(), 20);
    const loud = (m) => Math.max(...m.filter(x => x.kind === 'gain').map(x => x.gain.peak));
    const soft = shot(() => a.touchdown(100), 16), hard = shot(() => a.touchdown(700), 16);
    assert.ok(loud(hard) > 1.5 * loud(soft), 'harder landing, louder');
    shot(() => a.touchdown(), 16); shot(() => a.touchdown(NaN), 16);
    shot(() => a.chime(), 6); shot(() => a.click(), 8); shot(() => a.knob(), 6);
    a.engine(null);
  }
  // without the engine (no aircraft): still fine
  shot(() => a.touchdown(300), 16); shot(() => a.starter(), 20);
});

test('sfx: setAmbience — airborne: no birds or distant aircraft, the gusts fade; in the aircraft no building air conditioning', () => {
  const ground = fresh();
  ground.a.setAmbience({ indoor: 0, wind: 0.5 });
  let n0 = ground.ctx.nodes.length;
  for (let i = 0; i < 120; i++) ground.a.update(1);
  assert.ok(ground.ctx.nodes.length > n0, 'birds and aircraft on the ground');
  const { a, ctx } = fresh();
  const windG = ctx.nodes.find(n => n.kind === 'biquad' && n.frequency.value === 380).outs[0];
  const hvacG = ctx.nodes.find(n => n.kind === 'biquad' && n.frequency.value === 220).outs[0];
  a.setAmbience({ indoor: 0.6, wind: 0.5, airborne: false });
  const gust = windG.gain.target;
  assert.ok(Math.abs(hvacG.gain.target - 0.03) < 1e-9, 'indoors: the air conditioning');
  a.setAmbience({ indoor: 0.6, wind: 0.5, airborne: true });
  assert.ok(windG.gain.target < gust * 0.3, 'airborne: the gusts fade');
  n0 = ctx.nodes.length;
  for (let i = 0; i < 120; i++) a.update(1);
  assert.equal(ctx.nodes.length, n0, 'airborne: nothing of the ground');
  a.engine(O()); a.setAmbience({ indoor: 0.6, wind: 0.5, airborne: true });
  assert.equal(hvacG.gain.target, 0, 'in the aircraft: no building air conditioning');
  a.engine(null);
  a.setAmbience({ indoor: 0.6, wind: 0.5 });
  assert.ok(windG.gain.target < gust * 0.3, '{ indoor, wind } alone keeps airborne');
  assert.ok(hvacG.gain.target > 0, 'out of the aircraft: back');
  // the old calls: { indoor, wind } keeps airborne, no argument keeps everything, odd values are clamped
  assert.doesNotThrow(() => { a.setAmbience(); a.setAmbience({ indoor: 2, wind: NaN }); a.setAmbience({ airborne: false }); });
  assert.ok(windG.gain.target > 0 && Number.isFinite(windG.gain.target));
  // the other sounds still work
  assert.doesNotThrow(() => { a.footstep('metal'); a.door('swing_close'); a.door('slide_open'); a.door('locked'); a.ui('examine'); a.setVolume(0.3); });
});

test('sfx (M7): a twin has two voices, panned left and right, each at its own rpm; one can run while the other is still', () => {
  const { a, ctx } = fresh();
  const n0 = ctx.nodes.length;
  a.engine(O({ engines: [{ rpm: 1000, running: true }, { rpm: 0, running: false }], thr: 0.05, onGround: true, ias: 0 }));
  const nodes = ctx.nodes.slice(n0), cycs = nodes.filter(n => n.kind === 'osc' && n.type === 'custom' && n.wave.re.length > 300);
  assert.equal(cycs.length, 2, 'two engines');
  const pans = nodes.filter(n => n.kind === 'panner').map(p => p.pan.value).sort((x, y) => x - y);
  assert.ok(pans[0] < -0.2 && pans[1] > 0.2, `panned ${pans}`);
  assert.ok(Math.abs(cycs[0].frequency.target - 1000 / 120) < 1e-9, 'the left at its rpm');
  // the left firing, the right silent (its start not begun)
  const gainBelow = (o) => [...below(o)].find(n => n.kind === 'gain');
  assert.ok(gainBelow(cycs[0]).gain.target > 0.05 && gainBelow(cycs[1]).gain.target === 0, 'the left runs, the right not yet');
  step(ctx); a.engine(O({ engines: [{ rpm: 1000 }, { rpm: 1030 }], thr: 0.05 }));
  assert.ok(gainBelow(cycs[1]).gain.target > 0.05 && Math.abs(cycs[1].frequency.target - 1030 / 120) < 1e-9, 'both run, a little apart (they beat)');
  // a single engine again: the twin's nodes go, one voice is made
  step(ctx); const n1 = ctx.nodes.length; a.engine(O());
  assert.equal(ctx.nodes.slice(n1).filter(n => n.kind === 'osc' && n.type === 'custom' && n.wave.re.length > 300).length, 1);
});

test('sfx (M7): the gear pump while the wheels travel; the radio hiss for a transmission; the three volumes', async () => {
  const { a, ctx } = fresh();
  const n0 = ctx.nodes.length;
  a.engine(O({ engines: [{ rpm: 2500 }, { rpm: 2500 }], gearMoving: false }));
  const nodes = ctx.nodes.slice(n0), pump = nodes.find(n => n.kind === 'osc' && n.type === 'sawtooth' && n.frequency.value === 410);
  const pg = [...below(pump)].find(n => n.kind === 'gain');
  assert.equal(pg.gain.target, 0);
  step(ctx); a.engine(O({ engines: [{ rpm: 2500 }, { rpm: 2500 }], gearMoving: true }));
  assert.ok(pg.gain.target > 0, 'the pump runs');
  // the radio: a hiss reaching the master, band-limited, gone after radio(0)
  const n1 = ctx.nodes.length; a.radio(4);
  const made = ctx.nodes.slice(n1), hp = made.find(n => n.kind === 'biquad' && n.type === 'highpass' && n.frequency.value === 300);
  assert.ok(hp && reaches(hp, masterOf(ctx)), 'a hiss through the receiver\'s band');
  const hiss = made.find(n => n.kind === 'buffer' && n.loop);
  a.radio(0);
  assert.ok(hiss.stopped != null, 'the squelch closes');
  assert.doesNotThrow(() => { a.radio(0); a.radio(NaN); a.radio(1); a.radio(0); });
  // the groups: each its own gain into the master
  const master = masterOf(ctx), groups = ctx.nodes.filter(n => n.kind === 'gain' && n.outs.includes(master));
  assert.ok(groups.length >= 3);
  a.setVolumes({ engine: 0.2, amb: 0.5, radio: 0 });
  const tg = groups.map(g => g.gain.target).sort();
  assert.deepEqual(tg.slice(0, 3), [0, 0.2, 0.5]);
  assert.doesNotThrow(() => a.setVolumes({ engine: NaN, amb: 5 }));
});
