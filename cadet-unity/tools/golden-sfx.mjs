// Stage 11 golden: sfx.js driven against a recording fake Web Audio context
// (seeded Math.random), dumping the canonical graph/automation log.
import fs from 'node:fs';
let seed = 123456789;
Math.random = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const T = '/home/hatch/workspace/cadet-wt-free/cadet/src';
const { createAudio } = await import(T + '/audio/sfx.js');

const log = [];
const R5 = (v) => Math.round(v * 1e5) / 1e5;
class Param {
  constructor(node, name, v) { this.node = node; this.name = name; this.value = v; }
  ev(type, v, t, tc) { log.push(['param', this.node, this.name, type, R5(v), R5(t), tc == null ? null : R5(tc)]); return this; }
  setValueAtTime(v, t) { return this.ev('set', v, t); }
  linearRampToValueAtTime(v, t) { return this.ev('linear', v, t); }
  exponentialRampToValueAtTime(v, t) { return this.ev('exp', v, t); }
  setTargetAtTime(v, t, tc) { return this.ev('target', v, t, tc); }
  cancelScheduledValues(t) { log.push(['param', this.node, this.name, 'cancel', null, R5(t), null]); return this; }
}
let nodeSeq = 0;
class Node {
  constructor(kind, params = {}) {
    this.id = nodeSeq++; this.kind = kind; log.push(['node', this.id, kind]);
    for (const [k, v] of Object.entries(params)) this[k] = new Param(this.id, k, v);
  }
  connect(d) { log.push(['conn', this.id, d instanceof Param ? 'p:' + d.node + '.' + d.name : d.id]); return d; }
  disconnect() { log.push(['disc', this.id]); }
}
class Source extends Node {
  start(t = 0, off, dur) { log.push(['start', this.id, R5(t), off == null ? null : R5(off), dur == null ? null : R5(dur)]); }
  stop(t = 0) { log.push(['stop', this.id, R5(t)]); }
}
class FakeCtx {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = 'running'; this.destination = new Node('destination'); }
  createGain() { return new Node('gain', { gain: 1 }); }
  createBiquadFilter() { const n = new Node('biquad', { frequency: 350, Q: 1, gain: 0 }); n.type = 'lowpass'; return n; }
  createStereoPanner() { return new Node('panner', { pan: 0 }); }
  createDynamicsCompressor() { const n = new Node('comp', { threshold: -24, ratio: 12 }); return n; }
  createOscillator() { const n = new Source('osc', { frequency: 440, detune: 0 }); n.type = 'sine'; n.setPeriodicWave = (w) => { n.wave = w; }; return n; }
  createBufferSource() { const n = new Source('buffer', { playbackRate: 1, detune: 0 }); n.loop = false; return n; }
  createBuffer(ch, len, rate) { log.push(['buffer', ch, len, rate]); return { duration: len / rate, getChannelData: () => new Float32Array(len) }; }
  createPeriodicWave(re, im) { log.push(['wave', re.length, R5(re[1] || 0), R5(im[1] || 0), R5(re[2] || 0), R5(im[2] || 0)]); return { wave: true }; }
}
globalThis.window = { AudioContext: FakeCtx };
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms) => { log.push(['timeout', ms]); return 999; };
globalThis.clearTimeout = (id) => { log.push(['cleartimeout', id]); };

const A = createAudio();
// before unlock: no-ops
A.footstep('concrete'); A.door('swing_open'); A.engine({ rpm: 700, thr: 0 }); A.click();
log.push(['marker', 'pre-unlock-empty', log.length]);
A.unlock();
const ctxNodes = () => {};
A.setAmbience({ indoor: 0.6, wind: 0.5, rain: 0 });
A.footstep('concrete'); A.footstep('grass'); A.footstep('metal');
A.door('swing_open'); A.door('swing_close'); A.door('slide_open'); A.door('locked');
A.ui('click'); A.ui('open'); A.click(); A.knob(); A.chime();
A.update(7); A.update(1);
// engine: build + frames (currentTime frozen at 0 — glides dedupe by target)
A.engine({ rpm: 0, thr: 0, ias: 0, onGround: true, running: false });
A.engine({ rpm: 700, thr: 0.02, ias: 0, onGround: true });
A.engine({ rpm: 1500, thr: 0.35, ias: 20, onGround: true });
A.engine({ rpm: 2400, thr: 1, ias: 105, onGround: false });
A.engine({ rpm: 2400, thr: 1, ias: 105, onGround: false, stall: true });
A.engine({ rpm: 2350, thr: 0.8, ias: 90, onGround: false, stall: false, gearMoving: true, flapMoving: true, rain: 0.7 });
A.engine({ engines: [{ rpm: 2300, thr: 0.7, running: true }, { rpm: 900, running: false }], thr: 0.7, ias: 80, onGround: false });
A.engine(null);
A.starter(); A.crank(true); A.crank(false); A.fire(); A.fire(-1);
A.squelch(); A.radio(3); A.radio(0);
A.touchdown(200); A.touchdown(800);
A.apDisc(); const identLen = A.ident('HND'); log.push(['marker', 'identLen', R5(identLen)]);
A.thunder(0.5, 0.8);
A.traffic({ gain: 0.5, pan: 0.3, f: 90 }); A.traffic({ gain: 0.5, pan: 0.3, f: 90 }); A.traffic(null);
A.setVolume(0.5); A.setVolumes({ engine: 0.7, amb: 0.9, radio: 0.4 });
A.setAmbience({ indoor: 0, wind: 0.9, airborne: true, rain: 0.3 });
log.push(['marker', 'end', log.length]);
fs.writeFileSync('/home/hatch/workspace/cadet-unity/flight/test/golden-sfx.json', JSON.stringify(log));
console.log('sfx golden log entries:', log.length);
globalThis.setTimeout = realSetTimeout;
