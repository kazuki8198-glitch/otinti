// CADET Godot port — Phase 3b JS reference generator (recorder / flight-recorder capture side)
// Loads the ORIGINAL modules from cadet-wt-next (898fe8a): cadet/src/flight/recorder.js,
// cadet/src/flight/analysis.js (for the landing records over the captured samples) and
// flight-lab/src/physics.js (flown through the Phase 1 bot laws, exactly as
// tools/gen_reference1.mjs flew its recording). Writes test/reference3b.json.
// The GDScript runner (test/run_save.gd) replays the same inputs against
// src/recorder.gd and compares, then covers src/save_store.gd on its own.
import fs from 'node:fs'; import vm from 'node:vm';
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..', '..', 'cadet-wt-next');
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'flight-lab/src/physics.js'), 'utf8'), { filename: 'physics.js' });
const P = globalThis.FL.physics;

const REC = await imp('cadet/src/flight/recorder.js');
const analysis = await imp('cadet/src/flight/analysis.js');

const R = {};
const round6 = (o) => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v));
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
// the GPX coordinate mapping the app uses (main.js: Sorajima placed at a nominal 35N 140E)
const SORA_GEO = { lat: 35, lon: 140 };
const neToLatLon = ([n, e]) => [SORA_GEO.lat + n / 111320, SORA_GEO.lon + e / (111320 * Math.cos(SORA_GEO.lat * Math.PI / 180))];

// ---------------------------------------------------------------- snapshot: defensive inputs
{
  const cases = [
    [null, 0], [null, 3.5], [{}, 1.25], [{}, null],
    [{ pos: [100, 16.8, -200], q: [0, 0, 0, 1], out: { ias: 55.5, gs: 50.25, vsi: -300, alt: 1200 }, pIn: 0.1, rIn: -0.2, rud: 0.05, eng: [{ thr: 0.8, rpm: 2400, failed: false }], gearPos: 1, flapDeg: 10, onGround: true }, 2.5],
    [{ n: 123.5, e: -45.25, pos: [999, 1, 999], out: { vs: -450.5, altTrue: 800.5 }, thr: 0.33, eng: [], gearPos: null, flaps: { deg: 25 }, onGround: false }, 0],
    [{ pos: [0, 0, 0], q: [1, 2], out: { ias: 0, gs: 0, vsi: 0, alt: 0 }, eng: [{ rpm: 500 }] }, 7],
    [{ pos: [-40000, 500, 300], q: [0.5, 0.5, 0.5, 0.5], out: { alt: 55 }, pIn: -1, rIn: 1, rud: -1, eng: [{ thr: null, rpm: 0, failed: true }], thr: 0.25, gearPos: 0, flapDeg: 40 }, 9.75],
    [{ pos: { y: 321.5 }, out: {}, eng: [null] }, 4],
    [{ n: 0, e: 0, pos: [5, 5, 5], out: { vsi: null, vs: -100, alt: null }, eng: [{}], gearPos: 0.5, flaps: null }, 6],
  ];
  R.snapshots = cases.map(([s, t]) => ({ in: s, t, out: REC.snapshot(s, t) }));
  R.recHz = REC.REC_HZ;
}

// ---------------------------------------------------------------- synthetic recording: thinning / mark / sampleAt / exports
{
  const rec = REC.createRecorder();
  const seq = { states: [], log: [] };
  const st = (t, over = {}) => ({
    pos: [t * 100, 16.8, -t * 50], q: [0, 0, 0, 1],
    out: { ias: 60 + t, gs: 58 + t, vsi: -200 - t * 10, alt: 1000 - t * 20 },
    pIn: 0.1 * t, rIn: 0, rud: 0, eng: [{ thr: 0.5, rpm: 2000 + t * 100, failed: false }],
    gearPos: 1, flapDeg: 10, onGround: t >= 3, ...over,
  });
  seq.log.push(['recording0', rec.recording(), 'last0', rec.last()]);
  const r0 = rec.start({ title: 'テスト飛行 <A&B>', aircraft: 'pa28', startISO: '2026-11-01T01:02:03.250Z' });
  seq.log.push(['started', r0.meta, 'recording1', rec.recording()]);
  // push every 0.03 s from 0 to 3.0: the recorder must thin to 10 Hz itself
  for (let i = 0; i <= 100; i++) rec.push(st(i * 0.03), i * 0.03);
  rec.push(null, 3.01);                       // null state: ignored
  rec.mark(st(3.02, { out: { ias: 0, gs: 0, vsi: -900, alt: 55 } }), 3.02);  // forced (touchdown)
  seq.log.push(['nAfterThin', rec.current().samples.length, 'first', rec.current().samples[0], 'lastT', rec.current().samples[rec.current().samples.length - 1].t]);
  const doneRec = rec.done();
  seq.log.push(['doneN', doneRec.samples.length, 'recordingAfter', rec.recording(), 'lastIsDone', rec.last() === doneRec]);
  seq.log.push(['duration', REC.duration(doneRec)]);
  // an empty flight does not replace last()
  rec.start({ title: '空' }); const emptyDone = rec.done();
  seq.log.push(['emptyDone', emptyDone, 'lastStillDone', rec.last() === doneRec]);
  rec.clear();
  seq.log.push(['lastAfterClear', rec.last()]);
  R.seq = seq;
  R.synthetic = doneRec;
  R.sampleQueries = [-1, 0, 0.05, 0.15, 0.55, 1.234, 2.999, 3.0, 3.01, 3.02, 99];
  R.sampleAts = R.sampleQueries.map(t => REC.sampleAt(doneRec, t));
  R.poseAts = R.sampleQueries.map(t => REC.poseAt(doneRec, t));
  R.csvSynthetic = REC.toCSV(doneRec);
  R.gpxSynthetic = REC.toGPX(doneRec, neToLatLon);
  R.gpxNoStart = REC.toGPX({ meta: {}, samples: doneRec.samples.slice(0, 2) }, neToLatLon);
  R.gpxOffsetStart = REC.toGPX({ meta: { title: 'x', startISO: '2026-11-01T10:02:03+09:00' }, samples: doneRec.samples.slice(0, 1) }, neToLatLon);
  R.gpxBadStart = REC.toGPX({ meta: { title: 'x', startISO: 'garbage' }, samples: doneRec.samples.slice(0, 1) }, neToLatLon);
  R.csvEmpty = REC.toCSV({ samples: [] });
  R.gpxEmpty = REC.toGPX({ meta: {}, samples: [] }, neToLatLon);
  R.sampleAtEmpty = REC.sampleAt({ samples: [] }, 1);
  R.durationEmpty = REC.duration({ samples: [] });
  R.durationNull = REC.duration(null);
}

// ---------------------------------------------------------------- slerp corner cases (synthetic sample pairs)
{
  const mk = (q) => ({ t: 0, n: 0, e: 0, h: 0, q, ias: 0, gs: 0, vs: 0, alt: 0, pIn: 0, rIn: 0, rud: 0, thr: 0, gear: 1, flap: 0, onGround: false, rpm: 0, failed: false });
  const pairs = [
    [[0, 0, 0, 1], [0, 0, Math.SQRT1_2, Math.SQRT1_2]],       // 90 deg yaw
    [[0, 0, 0, 1], [0, 0, -Math.SQRT1_2, -Math.SQRT1_2]],     // same rotation, negated (dot < 0)
    [[0, 0, 0, 1], [0, 0, 0.0001, 1]],                        // near-identical (nlerp branch)
    [[1, 0, 0, 0], [0, 1, 0, 0]],                             // 180 deg apart
    [[0.5, 0.5, 0.5, 0.5], [-0.5, 0.5, 0.5, -0.5]],
  ];
  R.slerp = [];
  for (const [qa, qb] of pairs) {
    const a = mk(qa), b = { ...mk(qb), t: 2, n: 100, onGround: true, failed: true };
    const rec = { samples: [a, b] };
    R.slerp.push({ a, b, mid: REC.sampleAt(rec, 1), q1: REC.sampleAt(rec, 0.5), q3: REC.sampleAt(rec, 1.75) });
  }
}

// ---------------------------------------------------------------- a flown recording (Phase 1 bot laws)
// Same flight as gen_reference1.mjs's analysis recording (takeoff, climb, level, a 90 deg
// turn, descent, landing), but captured THROUGH the recorder: push() every physics step
// (120 Hz, thinned by the recorder to 10 Hz) and mark() at the touchdown rollout.
{
  const s = P.newState({}); s.wind = { fromDeg: 0, kt: 0, gust: 0 };
  P.placeOnRunway(s);
  const w180 = a => ((a % 360) + 540) % 360 - 180;
  const clamp = P.clamp;
  const bot = { pBase: null };
  const ctxOf = () => { const o = s.out; return { hdg: ((o.hdgTrue + 6) % 360 + 360) % 360, pitch: o.pitch, vs: o.vsi, alt: o.altTrue, kias: o.ias, agl: o.agl, onGround: s.onGround, gsK: o.gs }; };
  const pitchTo = (deg) => { s.keyHold = true; s.pTgt = clamp(deg, -20, 22); s.pRate = 0; };
  const bankTo = (bankT) => { const p = -s.w[2] / (Math.PI / 180); s.rIn = clamp(0.045 * (bankT - s.out.bank) - 0.012 * p, -1, 1); };
  const headTo = (c, hdgT, maxBank = 25) => bankTo(clamp(w180(hdgT - c.hdg) * 1.5, -maxBank, maxBank));
  const vsPitch = (c, vsT, dt) => { if (bot.pBase == null) bot.pBase = c.pitch; bot.pBase = clamp(bot.pBase + (vsT - c.vs) * 0.0012 * dt, -10, 15); pitchTo(bot.pBase + (vsT - c.vs) * 0.004); };
  const altVs = (c, alt) => clamp((alt - c.alt) * 3, -700, 700);
  const botThr = { i: 0 };
  const speedThr = (c, kt, dt) => { const e = kt - c.kias; botThr.i = clamp(botThr.i + e * 0.004 * dt, -0.4, 0.4); s.thr = clamp(s.thr + (e * 0.02 + botThr.i * 0.5) * dt * 2, 0, 1); };
  const rec = REC.createRecorder();
  rec.start({ title: 't3相当', aircraft: 'pa28', startISO: '2026-11-01T00:00:00.000Z' });
  const DTs = 1 / 120;
  let phase = 'roll', phaseT = 0, marked = false;
  const totalSteps = 120 * 300;
  for (let i = 0; i < totalSteps; i++) {
    const c = ctxOf(), t = i * DTs;
    if (phase === 'roll') {
      s.brake = false; s.thr = 1;
      s.rud = clamp(-0.06 * w180(c.hdg - 360), -1, 1);
      if (c.kias > 54) { s.pIn = 0.65; phase = 'climb'; bot.pBase = null; }
    } else if (phase === 'climb') {
      s.pIn = 0; vsPitch(c, altVs(c, 800), DTs); headTo(c, 354 + 6);
      if (c.alt > 760) { phase = 'level'; phaseT = t; bot.pBase = null; }
    } else if (phase === 'level') {
      vsPitch(c, altVs(c, 800), DTs); headTo(c, 354 + 6); speedThr(c, 90, DTs);
      if (t - phaseT > 25) { phase = 'turn'; phaseT = t; bot.pBase = null; }
    } else if (phase === 'turn') {
      vsPitch(c, altVs(c, 800), DTs); headTo(c, 264 + 6); speedThr(c, 90, DTs);
      if (Math.abs(w180(c.hdg - 270)) < 4 || t - phaseT > 40) { phase = 'level2'; phaseT = t; bot.pBase = null; }
    } else if (phase === 'level2') {
      vsPitch(c, altVs(c, 800), DTs); headTo(c, 264 + 6); speedThr(c, 90, DTs);
      if (t - phaseT > 10) { phase = 'descend'; phaseT = t; bot.pBase = null; s.flapIdx = 2; }
    } else if (phase === 'descend') {
      const agl = c.alt - 55;
      const vsT = agl < 45 ? -160 : clamp((0 - c.alt) * 3, -800, -250);
      vsPitch(c, Math.max(vsT, -650), DTs); headTo(c, 264 + 6, 12);
      s.thr = clamp(s.thr + ((c.kias > 75 ? -0.2 : c.kias < 62 ? 0.2 : 0)) * DTs, 0.05, 0.6);
      if (s.onGround) { phase = 'rollout'; phaseT = t; }
    } else if (phase === 'rollout') {
      s.thr = 0; s.brake = c.gsK > 5; s.pIn = 0; s.rIn = 0;
      if (t - phaseT > 6) break;
    }
    P.step(s, DTs);
    rec.push(s, s.t);
    if (phase === 'rollout' && !marked) { rec.mark(s, s.t); marked = true; }
  }
  const flown = rec.done();
  const csv = REC.toCSV(flown), gpx = REC.toGPX(flown, neToLatLon);
  R.flown = {
    meta: flown.meta, samples: flown.samples, endPhase: phase, crashed: !!s.crashed, marked,
    duration: REC.duration(flown),
    analysis: analysis.analyzeRecording({ samples: flown.samples }, { vref: 65 }),
    csvLen: csv.length, csvSha256: sha(csv),
    gpxLen: gpx.length, gpxSha256: sha(gpx),
  };
  R.flownQueries = [0, 1.05, 10.55, 40.25, 80.75, R.flown.duration / 2, R.flown.duration - 0.05, R.flown.duration, R.flown.duration + 10];
  R.flownSampleAts = R.flownQueries.map(t => REC.sampleAt(flown, t));
  R.flownPoseAts = R.flownQueries.map(t => REC.poseAt(flown, t));
}

fs.writeFileSync(path.join(here, '..', 'test', 'reference3b.json'), JSON.stringify(round6(R)));
console.log('reference3b.json written:', JSON.stringify({
  snapshots: R.snapshots.length, syntheticSamples: R.synthetic.samples.length,
  csvSyntheticLen: R.csvSynthetic.length, flownSamples: R.flown.samples.length,
  flownEnd: R.flown.endPhase, flownCrashed: R.flown.crashed, flownMarked: R.flown.marked,
  landings: R.flown.analysis && R.flown.analysis.landings.length,
  csvSha256: R.flown.csvSha256.slice(0, 12), gpxSha256: R.flown.gpxSha256.slice(0, 12),
}));
