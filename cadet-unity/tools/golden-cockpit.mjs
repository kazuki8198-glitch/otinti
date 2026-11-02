// CADET Unity Stage 6 — golden intents for the cockpit controls.
// For each aircraft type and scripted context, presses every control every way
// (the controls-functional sweep), records the intent act() returns, applies
// it exactly as fly-mode's applyAct does, and steps the rig on. The C#
// harness (flight/test/BotCockpitCs.cs) replays the same script against the
// ported layers; the intent streams must match record for record.
// Output: flight/test/golden-cockpit.jsonl
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { buildCockpit } from '/home/hatch/workspace/cadet-wt-free/cadet/src/aircraft/cockpit.js';
import { createSystems } from '/home/hatch/workspace/cadet-wt-free/cadet/src/aircraft/systems.js';
import { createFlight } from '/home/hatch/workspace/cadet-wt-free/cadet/src/flight/flight.js';
import { createAutopilot } from '/home/hatch/workspace/cadet-wt-free/cadet/src/flight/autopilot.js';
import { installSorajima } from '/home/hatch/workspace/cadet-wt-free/cadet/src/flight/sorajima.js';

const FL_DIR = '/home/hatch/workspace/cadet-wt-free/flight-lab/src';
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'acmesh.js'])
  vm.runInThisContext(fs.readFileSync(path.join(FL_DIR, m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL, P = FL.physics, AV = FL.avionics;
const AC = id => P.AIRCRAFT.find(a => a.id === id);
const NOKEYS = { has: () => false };
const AP_WHATS = new Set(['AP', 'AP_HDG', 'AP_ALT', 'AP_NAV', 'AP_APR', 'AP_VS', 'AP_LVL', 'FD', 'MCP_ALT', 'AT_ARM', 'AT_SPD', 'AP_VS_ADJ', 'AP_LVLCHG', 'AP_DISC']);

function fakeCanvas(w, h) {
  const grad = { addColorStop() {} };
  const g = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern' ? () => grad
      : k === 'measureText' ? s => ({ width: String(s).length * 6 }) : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { width: w, height: h, getContext: () => g };
}

function rig(type) {
  const cp = buildCockpit(FL, AC('pa28'), { makeCanvas: fakeCanvas, twin: AC('pa44'), boeing: AC('b737') });
  cp.setType(type);
  const fl = createFlight(FL, { store: null });
  const [n, e] = P.rwyToNE(P.LAB_RWY, 715, 208);
  fl.startOnGround(n, e, 264, type, { wind: { rel: 10, kt: 5, gust: 0.5 } });
  const sys = createSystems(cp.switches);
  const ap = createAutopilot(FL);
  const R = { cp, fl, sys, ap };
  R.apply = (d) => {
    if (!d) return undefined;
    if (d.type === 'switch') cp.switches[d.id] = d.on;
    else if (d.type === 'select') cp.switches[d.id] = d.value;
    else if (d.type === 'prime') return sys.prime();
    else if (d.type === 'gearEmerg') { if (fl.s && !fl.s.gearEmerg) fl.s.gearEmerg = true; }
    else if (d.type === 'flight') return fl.action(d.name, d.arg);
    else if (d.type === 'av') return AP_WHATS.has(d.what) ? ap.control(fl, d.what, d.dir, d.big) : AV.control(fl.av, d.what, d.dir, d.big);
    return undefined;
  };
  R.step = (sec) => {
    for (let t = 0; t < sec - 1e-9; t += 1 / 60) {
      fl.frame(1 / 60, NOKEYS, { pilot: (L) => ap.pilot(L, 1 / 60), airPilot: true });
      sys.update(1 / 60, fl.s);
      ap.sync(fl.av);
      cp.update(1 / 60, { s: fl.s, L: fl.L, av: fl.av,
        eng: { rpm: sys.rpm, run: sys.running, twin: sys.twinLive, oil: sys.oil, oilT: sys.oilT, elec: sys.elec, hobbs: sys.hobbs },
        parkBrake: fl.controls.parkBrake, elecPfd: sys.elec.pfdOn, elecMfd: sys.elec.mfdOn, elecStandby: sys.elec.standbyOn, night: 0 });
    }
  };
  return R;
}

const stable = (o) => {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']';
  return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}';
};

const out = [];
const PRESS = [[1, false], [1, true], [-1, true], [-1, false]];
function sweep(type, ctx, setup) {
  const R = rig(type);
  setup(R);
  R.step(ctx === 'run' ? 1 : 0.5);
  for (const c of R.cp.controls) {
    for (const [dir, wheel] of PRESS) {
      let r = null, err = '';
      try { r = c.act(dir, wheel); } catch (e) { err = String(e && e.message || e); }
      const rec = { type, ctx, id: c.id, dir, wheel, intent: r === undefined ? null : r, err };
      if (type === 'b737') rec.bg = stable(R.cp.boeing.state);
      out.push(JSON.stringify(rec));
      if (r) { try { R.apply(r); } catch { /* application errors do not change the recorded intent */ } }
      R.step(0.05);
    }
  }
  R.cp.dispose();
}

sweep('pa28', 'cold', R => { R.sys.setCold(R.fl.s); });
sweep('pa28', 'run', R => { R.sys.setRunning(R.fl.s); });
sweep('pa44', 'cold', R => { R.sys.setCold(R.fl.s); });
sweep('pa44', 'run', R => { R.sys.setRunning(R.fl.s); });
sweep('b737', 'ground', () => {});

fs.writeFileSync(new URL('../flight/test/golden-cockpit.jsonl', import.meta.url), out.join('\n') + '\n');
console.log(`golden records: ${out.length}`);
