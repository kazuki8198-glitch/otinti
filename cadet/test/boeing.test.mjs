// CADET — boeing tests (node --test): the 737's own display system (src/aircraft/boeing.js) in the shared
// cockpit (src/aircraft/cockpit.js), and its wiring: the MCP to the autopilot and the autothrottle, the
// EFIS to the altimeter and the ND, the DU selectors to the displays, the CDU's keys to its pages.
// The pistons' cockpits must not notice any of it: their control sets, counts and glass are untouched.
// The canvases are fakes that record the texts drawn (as in cockpit.test / controls-functional.test).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { buildCockpit } from '../src/aircraft/cockpit.js';
import { createFlight } from '../src/flight/flight.js';
import { createSystems } from '../src/aircraft/systems.js';
import { createAutopilot } from '../src/flight/autopilot.js';
import { nextFocus, FOCUS_IDS_737, FOCUS_FRAME } from '../src/flight/panel-view.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'acmesh.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL, P = FL.physics, AV = FL.avionics;
const AC = id => P.AIRCRAFT.find(a => a.id === id);
const NOKEYS = { has: () => false };
const AP_WHATS = new Set(['AP', 'AP_HDG', 'AP_ALT', 'AP_NAV', 'AP_APR', 'AP_VS', 'AP_LVL', 'FD', 'MCP_ALT', 'AT_ARM', 'AT_SPD', 'AP_VS_ADJ', 'AP_LVLCHG', 'AP_DISC']);

function recCanvas(w, h) {
  const texts = [];
  const grad = { addColorStop() {} };
  const g = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern' ? () => grad
      : k === 'measureText' ? s => ({ width: String(s).length * 6 }) : k === 'fillText' ? s => { texts.push(String(s)); } : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { width: w, height: h, getContext: () => g, texts };
}

// a jet on the apron, fully wired the way fly-mode wires it (intents applied as applyAct applies them)
function rig(route = null) {
  const cp = buildCockpit(FL, AC('pa28'), { makeCanvas: recCanvas, twin: AC('pa44'), boeing: AC('b737') });
  cp.setType('b737');
  const fl = createFlight(FL, { store: null });
  const [n, e] = P.rwyToNE(P.LAB_RWY, 715, 208);
  fl.startOnGround(n, e, 264, 'b737', { wind: { rel: 10, kt: 5, gust: 0.5 } });
  const sys = createSystems(cp.switches);
  const ap = createAutopilot(FL);
  const R = { cp, fl, sys, ap, sw: cp.switches, route };
  const apply = (d) => {
    if (!d) return undefined;
    if (d.type === 'switch') { cp.switches[d.id] = d.on; return ''; }
    if (d.type === 'select') { cp.switches[d.id] = d.value; return ''; }
    if (d.type === 'prime') return sys.prime();
    if (d.type === 'gearEmerg') { fl.s.gearEmerg = true; return ''; }
    if (d.type === 'flight') return fl.action(d.name, d.arg);
    if (d.type === 'av') return AP_WHATS.has(d.what) ? ap.control(fl, d.what, d.dir, d.big) : AV.control(fl.av, d.what, d.dir, d.big);
    return undefined;
  };
  R.apply = apply;
  R.step = (sec) => {
    for (let t = 0; t < sec - 1e-9; t += 1 / 60) {
      fl.frame(1 / 60, NOKEYS, { pilot: (L) => ap.pilot(L, 1 / 60), airPilot: true });
      sys.update(1 / 60, fl.s);
      ap.sync(fl.av);
      cp.update(1 / 60, { s: fl.s, L: fl.L, av: fl.av,
        eng: { rpm: sys.rpm, run: sys.running, twin: sys.twinLive, oil: sys.oil, oilT: sys.oilT, elec: sys.elec, hobbs: sys.hobbs },
        parkBrake: fl.controls.parkBrake, elecPfd: sys.elec.pfdOn, elecMfd: sys.elec.mfdOn, elecStandby: sys.elec.standbyOn, route: R.route, night: 0 });
    }
  };
  R.press = (id, dir = 1, wheel = false) => {
    const c = cp.controls.find(c => c.id === id);
    assert.ok(c, `the control ${id} exists`);
    const r = c.act(dir, wheel);
    apply(r);
    return r;
  };
  return R;
}
const texts = (R, unit) => R.cp.boeing.units[unit].canvas.texts;

test('boeing: the type brings its own cockpit — the pistons\' sets are untouched', () => {
  const cp = buildCockpit(FL, AC('pa28'), { makeCanvas: recCanvas, twin: AC('pa44'), boeing: AC('b737') });
  assert.equal(cp.type, 'pa28');
  const pa28 = cp.controls.map(c => c.id);
  assert.equal(pa28.length, 144, 'the Archer: 119 at the base + Phase 1\'s 25');
  assert.ok(!pa28.some(id => id.startsWith('mcp.') || id.startsWith('cdu.') || id.startsWith('efis.') || id.startsWith('du.')), 'no jet controls in the Archer');
  cp.setType('pa44');
  assert.equal(cp.controls.length, 150, 'the Seminole likewise (125 at the base by this count, + 25)');
  cp.setType('b737');
  const jet = cp.controls.map(c => c.id);
  assert.ok(jet.length >= 80, `the jet's own set (${jet.length})`);
  for (const id of ['mcp.ap', 'mcp.alt', 'mcp.hdg', 'mcp.atArm', 'mcp.spd', 'mcp.vs', 'mcp.lvl', 'mcp.app', 'efis.baro', 'efis.ndMode', 'efis.ndRange', 'du.out', 'du.low', 'gear', 'flaps', 'throttle', 'speedbrake', 'parkBrake', 'cdu.EXEC', 'cdu.RTE', 'cdu.A', 'cdu.5', 'view.b737pfd', 'view.b737nd', 'view.b737eicasu', 'view.b737eicasl', 'view.b737cdu'])
    assert.ok(jet.includes(id), id);
  assert.ok(!jet.some(id => id.startsWith('pfd.') || id.startsWith('mfd.') || id === 'mag' || id === 'fuelSel'), 'no G1000 or piston-only controls in the jet');
  for (const id of ['sw.bat', 'sw.avionics', 'sw.fuelPump', 'sw.beacon', 'sw.nav', 'sw.strobe', 'sw.landing', 'sw.taxi'])
    assert.ok(jet.includes(id), id + ' — the electrical switch the jet checklists work');
  // every jet control can be picked from the seat (the fascia must not shadow its own)
  const L = FL.school.startLesson('a1', 'basic');
  for (let t = 0; t < 0.5; t += 1 / 60) cp.update(1 / 60, { s: L.s, L });
  cp.root.updateMatrixWorld(true);
  const bad = [];
  for (const c of cp.controls) {
    const to = cp.aimPoint(c, new THREE.Vector3());
    const got = cp.pick(new THREE.Raycaster(cp.eye.clone(), to.clone().sub(cp.eye).normalize(), 0, 3));
    if (got !== c) bad.push(`${c.id} → ${got ? got.id : 'nothing'}`);
  }
  assert.deepEqual(bad, [], 'controls that cannot be picked from the seat');
  cp.setType('pa28');
  assert.equal(cp.controls.length, 144, 'and back again');
  cp.dispose();
});

test('boeing: the displays draw — PFD, ND, both EICAS, the standby, the CDU\'s IDENT', () => {
  const R = rig();
  R.sys.setRunning(R.fl.s); R.step(1.2);
  const st = R.cp.boeing.stats;
  assert.ok(st.pfd >= 30 && st.nd >= 10 && st.eicasU >= 10 && st.stby >= 15, JSON.stringify(st));
  assert.ok(texts(R, 'pfd').some(t => /^\d+$/.test(t)), 'a speed readout on the PFD');
  assert.ok(texts(R, 'eicasU').includes('N1'), 'N1 on the upper EICAS');
  assert.ok(texts(R, 'eicasU').includes('TOTAL FUEL'), 'the fuel total');
  assert.ok(texts(R, 'cdu').includes('737-800'), 'the CDU IDENT page names the type');
  assert.ok(texts(R, 'cdu').includes('POS INIT>'), 'and offers POS INIT');
  assert.ok(texts(R, 'nd').includes('MAP'), 'the ND in MAP');
  // no power: the units blank and stop drawing
  const before = { ...R.cp.boeing.stats };
  for (let t = 0; t < 0.5; t += 1 / 60) R.cp.update(1 / 60, { s: R.fl.s, L: R.fl.L, av: R.fl.av, eng: { elec: R.sys.elec }, elecPfd: false, route: null, night: 0 });
  assert.equal(R.cp.boeing.stats.pfd, before.pfd, 'a dead bus draws nothing');
  R.cp.dispose();
});

test('boeing: the MCP works the autopilot — engage, bugs, LVL CHG, V/S, and the altitude knob\'s jet range', () => {
  const R = rig();
  R.sys.setRunning(R.fl.s);
  P.placeInAir(R.fl.s, 0, -30000, 12000, 360, 250, 0, 0);
  R.fl.s.thr = 0.62; R.step(1);
  const r = R.press('mcp.ap');
  assert.ok(R.ap.on, `CMD engages the AP (${r})`);
  R.step(0.2);
  assert.equal(R.fl.av.ap.on, true, 'and the annunciation follows (sync)');
  R.press('mcp.hdg', 1, true); R.press('mcp.hdg', 1, true);
  assert.notEqual(R.fl.av.hdgBug, 360 - 0, 'the HDG knob turns the bug') ;
  const bug0 = R.fl.av.hdgBug;
  R.press('mcp.hdg', -1, true);
  assert.notEqual(R.fl.av.hdgBug, bug0, 'both ways');
  const alt0 = R.fl.av.altSel;
  for (let i = 0; i < 25; i++) R.press('mcp.alt', 1, true);       // +1000 a notch, big steps
  assert.ok(R.fl.av.altSel > 18000, `past the G1000 knob's ceiling (${alt0} → ${R.fl.av.altSel})`);
  assert.ok(R.fl.av.altSel <= 41000, 'and not past the type\'s');
  R.press('mcp.lvl');
  assert.equal(R.ap.lvlChg, true, 'LVL CHG engages');
  R.step(0.2);
  assert.ok(R.fl.av.ap.lvlChg, 'and annunciates');
  R.press('mcp.vs', 1, false);
  assert.ok(R.ap.vsSel !== 0 || R.ap.vs, 'the V/S wheel brings the mode up');
  const vs0 = R.ap.vsSel;
  R.press('mcp.vs', 1, true);
  assert.ok(R.ap.vsSel > vs0, `the wheel adjusts it (${vs0} → ${R.ap.vsSel})`);
  R.press('mcp.app');
  assert.equal(R.ap.apr, false, 'APP is refused without a localizer (no fake capture)');
  R.press('mcp.disc');
  assert.equal(R.ap.on, false, 'the disconnect bar drops the AP');
  R.cp.dispose();
});

test('boeing: the autothrottle — armed on the MCP, holding the selected speed with the lever', () => {
  const R = rig();
  R.sys.setRunning(R.fl.s);
  P.placeInAir(R.fl.s, 0, -30000, 12000, 360, 250, 0, 0);
  R.fl.s.thr = 0.62; R.step(2);
  const ias0 = R.fl.s.out.ias;
  R.press('mcp.atArm');
  assert.equal(R.ap.atArm, true);
  for (let i = 0; i < 30; i++) R.press('mcp.spd', -1, false);      // select 30 kt less
  assert.equal(R.ap.atSpd, 220);
  R.step(10);
  assert.equal(R.ap.atOn, true, 'the A/T is live in the air');
  assert.ok(R.fl.av.at && R.fl.av.at.on, 'and annunciated for the FMA');
  assert.ok(Math.abs(R.fl.s.out.ias - 220) < Math.abs(ias0 - 220) - 4, `the speed closes on the selection (${ias0.toFixed(0)} → ${R.fl.s.out.ias.toFixed(0)} vs 220)`);
  R.press('mcp.atArm');
  assert.equal(R.ap.atOn, false, 'disarming lets go at once');
  R.cp.dispose();
});

test('boeing: the EFIS — the baro knob is the altimeter\'s, the mode and range work the ND', () => {
  const R = rig();
  R.sys.setRunning(R.fl.s); R.step(0.5);
  const b0 = R.fl.av.baro;
  R.press('efis.baro', 1, true);
  assert.ok(Math.abs(R.fl.av.baro - b0) > 0.001, `the knob turns the setting (${b0} → ${R.fl.av.baro})`);
  R.press('efis.baro');
  assert.equal(R.fl.av.baro, 29.92, 'a click sets STD');
  R.press('efis.baroUnit');
  assert.equal(R.fl.av.baroUnit, 'HPA', 'the unit button flips IN / HPA');
  R.press('efis.ndMode');
  assert.equal(R.cp.boeing.state.efis.ndMode, 'ROSE');
  R.step(0.3);
  assert.ok(texts(R, 'nd').includes('ROSE'), 'the ND draws the rose');
  R.press('efis.ndRange');
  assert.equal(R.cp.boeing.state.efis.ndRange, 80, 'the range steps 40 → 80');
  R.cp.dispose();
});

test('boeing: the DU selectors swap what a unit shows', () => {
  const R = rig();
  R.sys.setRunning(R.fl.s); R.step(0.5);
  assert.ok(!texts(R, 'pfd').includes('MAP'), 'the outboard DU is the PFD');
  R.press('du.out');
  assert.equal(R.cp.boeing.state.du.out, 'ND');
  R.step(0.5);
  assert.ok(texts(R, 'pfd').includes('MAP'), 'now it shows the ND');
  R.press('du.low');
  assert.equal(R.cp.boeing.state.du.low, 'ND');
  R.step(0.5);
  assert.ok(R.cp.boeing.stats.eicasL > 0, 'the lower unit keeps drawing (the ND, scaled)');
  R.cp.dispose();
});

test('boeing: the CDU — the route from the line operation, typed entries, ACTIVATE and EXEC', () => {
  const R = rig({ id: 'HND-FUK', from: 'HND', to: 'FUK', alternate: 'KMQ', cruiseFL: 380, distKm: 880, blockMin: 115 });
  R.sys.setRunning(R.fl.s); R.step(0.5);
  const cdu = R.cp.boeing.state.cdu;
  assert.equal(cdu.page, 'IDENT');
  R.press('cdu.R6');
  assert.equal(cdu.page, 'POS', 'IDENT\'s R6 is POS INIT');
  R.press('cdu.R5');
  assert.equal(cdu.posSet, true, 'SET POS lands');
  R.press('cdu.R6');
  assert.equal(cdu.page, 'RTE');
  assert.equal(cdu.from, 'HND'); assert.equal(cdu.to, 'FUK');
  R.step(0.3);
  assert.ok(texts(R, 'cdu').includes('HND-FUK'), 'the company route is on the page');
  assert.ok(texts(R, 'cdu').includes('FL380'), 'with its cruise level');
  // type a new destination over it: K M Q into the TO field
  R.press('cdu.K'); R.press('cdu.M'); R.press('cdu.Q');
  assert.equal(cdu.scratch, 'KMQ');
  R.press('cdu.R1');
  assert.equal(cdu.to, 'KMQ'); assert.equal(cdu.scratch, '');
  R.press('cdu.Z');
  R.press('cdu.DEL');
  assert.equal(cdu.scratch, '', 'DEL scrubs the character back off');
  R.press('cdu.R6');
  assert.equal(cdu.pendingExec, true, 'ACTIVATE waits for EXEC');
  R.press('cdu.EXEC');
  assert.equal(cdu.active, true, 'EXEC activates the route');
  R.step(0.3);
  assert.ok(texts(R, 'cdu').includes('ACT RTE 1'), 'the page says so');
  // an invalid entry is refused with the type's own message
  R.press('cdu.1'); R.press('cdu.2');
  R.press('cdu.L1');
  assert.equal(cdu.msg, 'INVALID ENTRY');
  assert.equal(cdu.from, 'HND', 'the field is unchanged');
  R.cp.dispose();
});

test('boeing: the electrical switches drive the shared systems fields (the checklists’ items)', () => {
  const R = rig();
  for (const [id, field] of [['sw.bat', 'bat'], ['sw.avionics', 'avionics'], ['sw.fuelPump', 'fuelPump'], ['sw.beacon', 'beacon'], ['sw.nav', 'nav'], ['sw.strobe', 'strobe'], ['sw.landing', 'landing'], ['sw.taxi', 'taxi']]) {
    const before = R.cp.switches[field];
    R.press(id);
    assert.equal(R.cp.switches[field], !before, id + ' flipped the field');
  }
  // and the bus follows the battery, as the systems chain proved for the pistons in Phase 1
  if (!R.cp.switches.bat) R.press('sw.bat');
  if (!R.cp.switches.avionics) R.press('sw.avionics');
  R.step(0.5);
  assert.equal(R.sys.elec.pfdOn, true, 'with the battery and avionics on, the jet’s displays are powered');
});

test('boeing: the jet\'s own flight controls — thrust, flaps, gear, speedbrake, parking brake', () => {
  const R = rig();
  R.sys.setRunning(R.fl.s); R.step(0.5);
  R.press('throttle'); assert.ok(R.fl.s.thr > 0.04, 'the thrust lever steps');
  R.press('flaps'); assert.equal(R.fl.s.flapIdx, 1, 'the flap lever: 5');
  R.press('speedbrake'); assert.equal(R.fl.s.spoiler, 1, 'the speedbrake lever deploys');
  R.press('speedbrake'); assert.equal(R.fl.s.spoiler, 0, 'and stows');
  const pb0 = R.fl.controls.parkBrake;
  R.press('parkBrake'); assert.equal(R.fl.controls.parkBrake, !pb0, 'the parking brake handle flips it');
  P.placeInAir(R.fl.s, 0, -30000, 6000, 360, 220, 0, 0);           // placed gear-up, in the cruise configuration
  R.step(0.5);
  assert.equal(R.fl.s.gearDown, false);
  R.press('gear'); assert.equal(R.fl.s.gearDown, true, 'the gear lever selects down');
  R.step(6);
  assert.ok(R.fl.s.gearPos > 0.99, `and the gear travels (${R.fl.s.gearPos})`);
  R.step(0.5);
  assert.ok(texts(R, 'eicasU').includes('DN'), 'three green on the EICAS');
  R.cp.dispose();
});

test('boeing: the focus views cycle through the jet\'s units', () => {
  assert.deepEqual(FOCUS_IDS_737, ['b737pfd', 'b737nd', 'b737eicas', 'b737cdu']);
  assert.equal(nextFocus(null, FOCUS_IDS_737), 'b737pfd');
  assert.equal(nextFocus('b737pfd', FOCUS_IDS_737), 'b737nd');
  assert.equal(nextFocus('b737cdu', FOCUS_IDS_737), null);
  for (const id of FOCUS_IDS_737) assert.ok(FOCUS_FRAME[id], `${id} has a frame`);
  const R = rig();
  for (const id of FOCUS_IDS_737) assert.ok(R.cp.focusMeshes[id], `${id} has a unit to aim at`);
  const r = R.press('view.b737cdu');
  assert.deepEqual(r, { type: 'view', focus: 'b737cdu' });
  R.cp.dispose();
});
