// CADET Godot port — Phase 3 (world/traffic) JS reference generator
// Loads the ORIGINAL flight-lab/src/physics.js (for P: LAB_RWY / FT / rwyToNE / qFromHPB)
// and cadet/src/flight/traffic.js from cadet-wt-next (898fe8a), and writes
// test/reference3c.json. The GDScript runner (test/run_world.gd) replays the same
// fixed-seed / fixed-timestep scenarios against src/traffic.gd (CadetTraffic).
import fs from 'node:fs'; import vm from 'node:vm';
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..', '..', 'cadet-wt-next');
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'flight-lab/src/physics.js'), 'utf8'), { filename: 'physics.js' });
const P = globalThis.FL.physics;
const T = await import(pathToFileURL(path.join(ROOT, 'cadet/src/flight/traffic.js')).href);

const round6 = (o) => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v));
const R = {};

// ---------------------------------------------------------------- day gates
{
  const day = [], twin = [];
  const seeds = [0, 1, 42, 12345];
  for (const seed of seeds)
    for (const kind of ['flight', 'ground', 'exam', ''])
      for (const chapter of ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', ''])
        for (const weather of ['good', 'crosswind', 'pmWind', 'southFlow', 'amFog', 'amLowCloud', 'rain', ''])
          for (const slot of ['am', 'pm'])
            day.push({ seed, kind, chapter, weather, slot, out: T.trafficForDay({ seed, kind, chapter, weather, slot }) });
  for (const seed of seeds)
    for (const kind of ['flight', 'ground'])
      for (const chapter of ['ch4', 'ch5', 'ch6'])
        for (const weather of ['good', 'amFog', 'rain'])
          for (const slot of ['am', 'pm'])
            twin.push({ seed, kind, chapter, weather, slot, out: T.trafficForTwinDay({ seed, kind, chapter, weather, slot }) });
  R.day = day; R.twin = twin;
  R.calls = T.TRAFFIC_CALLS; R.twinCall = T.TRAFFIC_TWIN;
}

// ---------------------------------------------------------------- circuit poses
{
  const poses = [];
  const ts = [-500, -1, 0, 0.5];
  for (let k = 0; k < 140; k++) ts.push(k * 7.31);
  for (const ga of [false, true])
    for (const t of ts) poses.push({ t, ga, out: T.circuitPose(t, ga, {}) });
  R.circuit = { s: T.CIRCUIT_S, poses };
}

// ---------------------------------------------------------------- traffic runs (fixed dt, scripted players)
const PLAYERS = {
  none: null,
  final: { along: -900, cross: 0, altFt: 400, call: 'Archer 8SY', spoken: 'Archer Eight Sierra Yankee' },
  runway: { along: 600, cross: 0, altFt: 55, call: 'Archer 8SY', spoken: 'Archer Eight Sierra Yankee' },
  near: { along: 0, cross: -1600, altFt: 1055, call: 'Archer 8SY', spoken: 'Archer Eight Sierra Yankee' },
};
function runScenario(phases) {
  const sys = T.createTraffic(P);
  const events = [], snapshots = [];
  let step = 0;
  for (const ph of phases) {
    sys.set(ph.count, ph.seed, ph.opts ?? {});
    const player = PLAYERS[ph.player || 'none'];
    for (let k = 0; k < ph.steps; k++) {
      const evs = sys.update(0.5, player || undefined);
      for (const ev of evs) events.push({ step, ev });
      step++;
      if (k % 30 === 29 || k === ph.steps - 1)
        snapshots.push({ step: step - 1, t: sys.t, wake: sys.wake, poses: JSON.parse(JSON.stringify(sys.poses)) });
    }
  }
  return { phases, events, snapshots, count: sys.count };
}
R.runs = [
  runScenario([{ count: 3, seed: 12345, steps: 720, player: 'none' }]),
  runScenario([{ count: 2, seed: 777, opts: '18', steps: 720, player: 'none' }]),
  runScenario([{ count: 1, seed: 99, opts: { twin: true }, steps: 480, player: 'none' }]),
  runScenario([{ count: 3, seed: 2024, steps: 720, player: 'final' }]),
  runScenario([{ count: 2, seed: 555, steps: 720, player: 'runway' }]),
  runScenario([{ count: 1, seed: 31, steps: 720, player: 'near' }]),
  runScenario([{ count: 0, seed: 5, steps: 10, player: 'none' }]),
  // re-set: same args are a no-op (state continues), changed args restart the pattern
  runScenario([
    { count: 2, seed: 42, steps: 240, player: 'none' },
    { count: 2, seed: 42, steps: 240, player: 'none' },
    { count: 3, seed: 43, opts: { runway: '18' }, steps: 240, player: 'final' },
  ]),
];
R.players = PLAYERS;

fs.writeFileSync(path.join(here, '..', 'test', 'reference3c.json'), JSON.stringify(round6(R)));
console.log('reference3c.json written:', JSON.stringify({
  day: R.day.length, twin: R.twin.length, circuitPoses: R.circuit.poses.length, circuitS: R.circuit.s,
  runs: R.runs.map(r => ({ events: r.events.length, snapshots: r.snapshots.length })),
}));
