// CADET Unity Stage 7 — golden draw streams for the 737 glass.
// Runs the real boeing.js (createBoeingGlass) over a recording canvas through
// a scripted flight (the boeing.test rig composition), capturing, for every
// update() call, a snapshot of the draw inputs (s / av / eng / power / route)
// and the exact canvas op stream each unit produced. The C# harness
// (flight/test/BotBoeingCs.cs) replays the snapshots through the ported
// drawing and must reproduce the streams op for op.
// Output: flight/test/golden-boeing.jsonl
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { buildCockpit } from '/home/hatch/workspace/cadet-wt-free/cadet/src/aircraft/cockpit.js';
import { createBoeingGlass } from '/home/hatch/workspace/cadet-wt-free/cadet/src/aircraft/boeing.js';
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

// ---------------------------------------------------------------- a recording canvas
function recCanvas(w, h) {
  const ops = [];
  const st = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '', textAlign: 'left', textBaseline: 'alphabetic', dash: [] };
  const stack = [];
  let pathSegs = [];
  const g = {
    get fillStyle() { return st.fillStyle; }, set fillStyle(v) { st.fillStyle = v; },
    get strokeStyle() { return st.strokeStyle; }, set strokeStyle(v) { st.strokeStyle = v; },
    get lineWidth() { return st.lineWidth; }, set lineWidth(v) { st.lineWidth = v; },
    get font() { return st.font; }, set font(v) { st.font = v; },
    get textAlign() { return st.textAlign; }, set textAlign(v) { st.textAlign = v; },
    get textBaseline() { return st.textBaseline; }, set textBaseline(v) { st.textBaseline = v; },
    save() { stack.push({ ...st }); ops.push(['save']); },
    restore() { Object.assign(st, stack.pop() || {}); ops.push(['restore']); },
    beginPath() { pathSegs = []; },
    arc(x, y, r, a0, a1) { pathSegs.push(['A', x, y, r, a0, a1]); },
    rect(x, y, w2, h2) { pathSegs.push(['R', x, y, w2, h2]); },
    moveTo(x, y) { pathSegs.push(['M', x, y]); },
    lineTo(x, y) { pathSegs.push(['L', x, y]); },
    closePath() { pathSegs.push(['Z']); },
    clip() { ops.push(['clip', pathSegs]); pathSegs = []; },
    fill() { ops.push(['fill', pathSegs, st.fillStyle]); pathSegs = []; },
    stroke() { ops.push(['stroke', pathSegs, st.strokeStyle, st.lineWidth, st.dash]); pathSegs = []; },
    translate(x, y) { ops.push(['translate', x, y]); },
    rotate(a) { ops.push(['rotate', a]); },
    scale(x, y) { ops.push(['scale', x, y]); },
    fillRect(x, y, w2, h2) { ops.push(['fillRect', x, y, w2, h2, st.fillStyle]); },
    strokeRect(x, y, w2, h2) { ops.push(['strokeRect', x, y, w2, h2, st.strokeStyle, st.lineWidth]); },
    fillText(str, x, y) { ops.push(['text', String(str), x, y, st.font, st.textAlign, st.fillStyle]); },
    setLineDash(d) { st.dash = [...d]; },
  };
  return { width: w, height: h, getContext: () => g, ops };
}

// ---------------------------------------------------------------- snapshots of the draw inputs
const snapS = s => {
  const o = s.out;
  return {
    pos: [...s.pos], qnh: s.qnh, thr: s.thr, gearPos: s.gearPos, gearDown: s.gearDown, flapIdx: s.flapIdx, onGround: s.onGround,
    fuel: s.fuel ? [...s.fuel] : null,
    eng: s.eng.map(e => ({ egt: e.egt != null ? e.egt : null, ff: e.ff || 0, on: e.on !== false, oilQ: e.oilQ != null ? e.oilQ : null })),
    A: { id: s.A.id, flapLabels: [...s.A.flapLabels], rotate: s.A.v ? s.A.v.rotate : null },
    out: {
      bank: o.bank, pitch: o.pitch, ias: o.ias, altTrue: o.altTrue, vsi: o.vsi, hdgTrue: o.hdgTrue, hdg: o.hdg != null ? o.hdg : null,
      agl: o.agl, mach: o.mach, gs: o.gs, trk: o.trk, stallWarn: !!o.stallWarn, n1: o.n1,
      n1s: o.n1s ? [...o.n1s] : null, egts: o.egts ? [...o.egts] : null, spoiler: o.spoiler, rev: o.rev,
    },
  };
};
const snapAv = av => av ? {
  ap: av.ap ? { ...av.ap } : null, fd: av.fd ? { ...av.fd } : null, at: av.at ? { ...av.at } : null,
  altSel: av.altSel, baro: av.baro, baroUnit: av.baroUnit, hdgBug: av.hdgBug, crs: av.crs, cdi: av.cdi, obs: av.obs,
  brg1: av.brg1 != null ? av.brg1 : null, brg2: av.brg2 != null ? av.brg2 : null,
  fpl: av.fpl ? { wps: [...av.fpl.wps], active: av.fpl.active } : null,
  direct: av.direct != null ? av.direct : null,
  directFrom: av.directFrom ? { ...av.directFrom } : null, directFromId: av.directFromId != null ? av.directFromId : null,
  nav1: { act: av.nav1.act, sby: av.nav1.sby }, nav2: { act: av.nav2.act, sby: av.nav2.sby },
  com1: { act: av.com1.act, sby: av.com1.sby }, com2: { act: av.com2.act, sby: av.com2.sby },
  comSel: av.comSel, navSel: av.navSel, audioMic: av.audio.mic,
  monitor: { ...av.audio.monitor },
  xpdr: av.xpdr ? { ...av.xpdr } : null, xpdrIdent: av.xpdrIdent || 0,
  proc: av.proc ? { ...av.proc } : null, pfdMenu: av.pfdMenu || 'TOP', mapNorthUp: !!av.mapNorthUp,
} : null;

// ---------------------------------------------------------------- the rig (boeing.test's composition)
function fakeCanvas(w, h) {
  const grad = { addColorStop() {} };
  const g = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern' ? () => grad
      : k === 'measureText' ? s => ({ width: String(s).length * 6 }) : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { width: w, height: h, getContext: () => g };
}
const cp = buildCockpit(FL, AC('pa28'), { makeCanvas: fakeCanvas, twin: AC('pa44'), boeing: AC('b737') });
cp.setType('b737');
const fl = createFlight(FL, { store: null });
const [n0, e0] = P.rwyToNE(P.LAB_RWY, 715, 208);
fl.startOnGround(n0, e0, 264, 'b737', { wind: { rel: 10, kt: 5, gust: 0.5 } });
const sys = createSystems(cp.switches);
const ap = createAutopilot(FL);
const bg = createBoeingGlass(FL, recCanvas);
const ROUTE = { id: 'HND-FUK', from: 'HND', to: 'FUK', alternate: 'KMQ', cruiseFL: 380, distKm: 880, blockMin: 115 };
let elecPfd = true;

const apply = (d) => {
  if (!d) return;
  if (d.type === 'switch') cp.switches[d.id] = d.on;
  else if (d.type === 'select') cp.switches[d.id] = d.value;
  else if (d.type === 'prime') sys.prime();
  else if (d.type === 'gearEmerg') { if (fl.s && !fl.s.gearEmerg) fl.s.gearEmerg = true; }
  else if (d.type === 'flight') fl.action(d.name, d.arg);
  else if (d.type === 'av') return AP_WHATS.has(d.what) ? ap.control(fl, d.what, d.dir, d.big) : AV.control(fl.av, d.what, d.dir, d.big);
};
const press = (id, dir = 1, wheel = false) => { const c = cp.controls.find(c => c.id === id); apply(c.act(dir, wheel)); };

const out = [];
let frameIdx = 0;
function frame() {
  fl.frame(1 / 60, NOKEYS, { pilot: (L) => ap.pilot(L, 1 / 60), airPilot: true });
  sys.update(1 / 60, fl.s);
  ap.sync(fl.av);
  const eng = { twin: sys.twinLive.map(t => ({ oil: t.oil, oilT: t.oilT })), elec: { altFail: !!sys.elec.altFail }, parkBrake: fl.controls.parkBrake };
  const snap = { s: snapS(fl.s), av: snapAv(fl.av), eng, elecPfd, route: ROUTE };
  const before = {}; for (const k of Object.keys(bg.units)) before[k] = bg.units[k].canvas.ops.length;
  bg.update(1 / 60, { s: fl.s, av: fl.av, eng: { twin: sys.twinLive, elec: sys.elec, parkBrake: fl.controls.parkBrake }, elecPfd, route: ROUTE });
  const ops = {};
  for (const k of Object.keys(bg.units)) { const o = bg.units[k].canvas.ops.slice(before[k]); if (o.length) ops[k] = o; }
  out.push(JSON.stringify({ i: frameIdx++, snap, ops }));
}
const step = sec => { for (let t = 0; t < sec - 1e-9; t += 1 / 60) frame(); };

// ---------------------------------------------------------------- the scenario
sys.setRunning(fl.s);
step(1.2);                                   // A: on the apron, everything live
P.placeInAir(fl.s, 0, -30000, 12000, 360, 250, 0, 0);
fl.s.thr = 0.62;
press('mcp.ap'); press('mcp.atArm');
for (let i = 0; i < 30; i++) press('mcp.spd', -1, false);
step(3);                                     // B: cruise, AP + A/T holding 220
bg.state.du.out = 'ND'; step(0.6);           // C: DU swaps, ROSE, range
bg.state.du.low = 'ND'; step(0.6);
bg.state.efis.ndMode = 'ROSE'; bg.state.efis.ndRange = 80; step(0.6);
bg.state.du.out = 'PFD'; bg.state.du.low = 'EICAS'; bg.state.efis.ndMode = 'MAP'; bg.state.efis.ndRange = 40; step(0.3);
for (const k of ['R6', 'R5', 'R6', 'K', 'M', 'Q', 'R1', 'R6', 'EXEC', '1', '2', 'L1', 'CLR']) { bg.cduKey(k); step(0.1); }   // D: the CDU
elecPfd = false; step(0.5);                  // E: the bus dies and returns
elecPfd = true; step(0.5);
fl.s.gearDown = false; step(2);              // F: gear transit, then back down
fl.s.gearDown = true; step(1);

fs.writeFileSync(new URL('../flight/test/golden-boeing.jsonl', import.meta.url), out.join('\n') + '\n');
console.log(`boeing golden records: ${out.length}`);
