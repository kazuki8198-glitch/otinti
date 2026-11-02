// CADET Unity Stage 13 — golden draw streams for the G1000 glass (PFD / MFD).
// Runs the real avionics.js drawPFD / drawMFD over a recording canvas through
// scripted flight segments (physics.js states composed the way flight-lab's
// glass composes them: d = fill(s, av) per cadet/src/aircraft/g1000.js),
// capturing, for every sample, a snapshot of the draw inputs and the exact
// canvas op streams. The C# harness (flight/test/BotG1000Cs.cs) replays the
// snapshots through the ported CadetG1000Draw and must reproduce the streams
// op for op. Output: flight/test/golden-g1000.jsonl
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const FL_DIR = '/home/hatch/workspace/cadet-wt-free/flight-lab/src';
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js'])
  vm.runInThisContext(fs.readFileSync(path.join(FL_DIR, m), 'utf8'), { filename: m });
const FL = globalThis.FL, P = FL.physics, AV = FL.avionics;

// ---------------------------------------------------------------- a recording canvas (same shape as golden-boeing.mjs)
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
    save() { stack.push({ ...st, dash: [...st.dash] }); ops.push(['save']); },
    restore() { const s = stack.pop() || {}; Object.assign(st, s); ops.push(['restore']); },
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

// g1000.js's panelText substitution (the glass wraps fillText so the panel
// labels name the real aircraft) — replicated on the recorder for fidelity.
function panelText(t, ac) {
  if (ac === 'pa28') return String(t).split('PA-28').join('PA-28-181 アーチャー').split('Archer').join('PA-28-181 アーチャー');
  if (ac === 'pa44') return String(t).split('PA-44').join('PA-44-180 セミノール').split('Seminole').join('PA-44-180 セミノール');
  return String(t);
}

// ---------------------------------------------------------------- snapshot helpers
const OFIELDS = ['pitch', 'bank', 'ias', 'vsi', 'altTrue', 'hdgTrue', 'trk', 'gs', 'tas', 'mach', 'oat', 'windFrom', 'windKt',
  'aoaFrac', 'slip', 'stallWarn', 'rpm', 'jet', 'n1s', 'n1', 'egts', 'egt', 'manIns', 'manIn', 'oilP', 'oilT', 'fuel',
  'fuelFlow', 'powerPct', 'govRpm', 'volts', 'amps', 'fuelPress', 'gearPos', 'cyls', 'cyl', 'hobbs', 'rev', 'spoiler', 'elecState'];
function snapO(s) {
  const o = { onGround: s.onGround };
  for (const k of OFIELDS) o[k] = s.out[k] === undefined ? null : s.out[k];
  return o;
}
function snapComposed(o) {
  const r = { onGround: o.onGround };
  for (const k of OFIELDS) r[k] = o[k] === undefined ? null : o[k];
  return r;
}
function snapAv(av) {
  return {
    com1: { ...av.com1 }, com2: { ...av.com2 }, nav1: { ...av.nav1 }, nav2: { ...av.nav2 },
    comSel: av.comSel, navSel: av.navSel, hdgBug: av.hdgBug, altSel: av.altSel, baro: av.baro, baroUnit: av.baroUnit,
    crs: av.crs, cdi: av.cdi, brg1: av.brg1 ?? null, brg2: av.brg2 ?? null, xpdrIdent: av.xpdrIdent,
    xpdr: { ...av.xpdr }, pfdMenu: av.pfdMenu, wind: av.wind, mfdPage: av.mfdPage, mfdRangeIdx: av.mfdRangeIdx,
    mapNorthUp: av.mapNorthUp, fpl: { wps: [...av.fpl.wps], active: av.fpl.active }, fplEdit: av.fplEdit,
    fplCursor: av.fplCursor, fplPick: av.fplPick, nrstSel: av.nrstSel, direct: av.direct ?? null,
    directFrom: av.directFrom ? { ...av.directFrom } : null, proc: av.proc ? { ...av.proc } : null,
    fail: av.fail ? { ...av.fail } : null, ack: { ...(av._ack || {}) },
    directFromId: av.directFrom && av.directFrom.id ? av.directFrom.id : null,
    fuelInit: av._fuelInit === undefined ? null : av._fuelInit, egtPeak: av._egtPeak ? [...av._egtPeak] : null,
    nrts: av._nrts ? [...av._nrts] : null,
  };
}

const records = [];
function sample(tag, s, av, dExtra = {}) {
  const { o: extraO, ...rest } = dExtra;
  const d = {
    o: { ...s.out, onGround: s.onGround }, av,
    nav: AV.navSolve(av, { n: -s.pos[2], e: s.pos[0] }, s.out, P.MAGVAR_W, P.LAB_RWY),
    varW: P.MAGVAR_W, qnh: s.qnh,
    eng: s.eng.map(e => ({ run: !!e.run, rpm: e.rpm || 0, feather: !!e.feather })),
    V: s.A.v, fuelCap: s.A.fuelCap, pos: { n: -s.pos[2], e: s.pos[0] },
    gearRev: false, ...rest,
  };
  if (extraO) d.o = { ...d.o, ...extraO };
  const pc = recCanvas(1280, 800), mc = recCanvas(1280, 800);
  const wrap = (cv) => { const g = cv.getContext(); const ft = g.fillText.bind(g); g.fillText = (t, x, y) => ft(panelText(t, s.A.id), x, y); return g; };
  AV.drawPFD(wrap(pc), 1280, 800, d);
  AV.drawMFD(wrap(mc), 1280, 800, d);
  records.push({
    tag, ac: s.A.id, o: snapComposed(d.o), av: snapAv(av), eng: d.eng, V: d.V, fuelCap: d.fuelCap, qnh: d.qnh,
    varW: d.varW, pos: d.pos, traffic: d.traffic || null, gearRev: !!d.gearRev,
    pfd: pc.ops, mfd: mc.ops,
  });
}

// ---------------------------------------------------------------- the scripted segments
const DT = 1 / 120;
function stepN(s, n, ctl) { for (let i = 0; i < n; i++) { if (ctl) ctl(s, i); P.step(s, DT); } }

// --- pa28: parked → takeoff → climb/cruise (pages) → VOR approach → landed ---
{
  const s = P.newState({ aircraft: 'pa28', seed: 11 });
  P.placeOnRunway(s, P.LAB_RWY, 30);
  const av = AV.createAvionics();
  av.fpl.wps = ['LABRW', 'LABEA', 'LABEB', 'LABEC']; av.fpl.active = 1;
  av.hdgBug = 350; av.altSel = 3000;
  stepN(s, 240, x => { x.thr = 0.12; });
  sample('pa28-parked-map', s, av);
  av.mfdPage = 'ENGINE'; sample('pa28-parked-engine', s, av);
  av.mfdPage = 'MAP';
  // takeoff roll + climb-out, gentle right turn
  stepN(s, 120 * 27, (x, i) => {
    x.thr = 1;
    if (x.out.ias > 52) x.pIn = 0.45; else x.pIn = 0;
    if (i > 120 * 25) x.rIn = 0.22;
  });
  sample('pa28-climb-map', s, av, { traffic: [{ n: -s.pos[2] + 900, e: s.pos[0] + 1400, altFt: 2100, hdg: 180 }, { n: -s.pos[2] - 2500, e: s.pos[0] + 600, altFt: 1500, hdg: 90 }] });
  // cruise segment (placed): the page tour flies level at 3,000 ft
  P.placeInAir(s, -20000, -30000, 3000, 350, 95, 2, 0, 0.7);
  stepN(s, 240, x => { x.thr = 0.7; x.pIn = 0.1; });
  av.mfdPage = 'FPL'; sample('pa28-cruise-fpl', s, av);
  av.mfdPage = 'SYSTEM'; sample('pa28-cruise-system', s, av, { o: { volts: 28.2, amps: 9 } });
  av.mfdPage = 'NRST'; av.nrstSel = 1; sample('pa28-cruise-nrst', s, av);
  av.mfdPage = 'MAP'; av.direct = 'LABEB';   // directFrom latches inside navSolve, as in the real flow
  sample('pa28-direct-map', s, av);
  av.direct = null;
  av.xpdr.entry = '12'; sample('pa28-xpdr-entry', s, av);
  av.xpdr.entry = ''; av.pfdMenu = 'ALERTS'; sample('pa28-alerts-page', s, av);
  av.pfdMenu = 'TOP'; av.fail = { ahrs: true }; sample('pa28-ahrs-fail', s, av);
  av.fail = { gps: true }; sample('pa28-gps-fail', s, av);
  av.fail = null; sample('pa28-gear-rev', s, av, { gearRev: true });
  av.fplEdit = true; av.mfdPage = 'FPL'; sample('pa28-fpl-edit', s, av);
  av.fplEdit = false; av.proc = { name: 'LAB ILS 36', type: 'ILS', missed: false };
  sample('pa28-proc-loaded', s, av);
  av.proc = null; av.mfdPage = 'MAP';
  // VOR approach segment: reposition on a VOR radial inbound
  const vor = AV.NAVAIDS.find(n => n.type === 'VOR' && n.n != null);
  av.cdi = 'NAV1'; av.nav1.act = vor.freq; av.crs = 350;
  P.placeInAir(s, vor.n - 9000, vor.e + 1500, 1800, 355, 85, -2, 0, 0.55);
  stepN(s, 240, x => { x.thr = 0.45; x.pIn = 0.08; });
  sample('pa28-vor-approach', s, av);
  // landed, engine off
  P.placeOnRunway(s, P.LAB_RWY, 400);
  for (const e of s.eng) e.run = false;
  stepN(s, 120, x => { x.thr = 0; });
  av.pfdMenu = 'ALERTS'; av.mfdPage = 'ENGINE';
  sample('pa28-landed-alerts', s, av);
}

// --- pa44: twin pages (gear box, Vmc/Vyse lines, twin engine strip) ---
{
  const s = P.newState({ aircraft: 'pa44', seed: 23 });
  P.placeInAir(s, -30000, -35000, 3200, 20, 105, 0, 0, 0.62);
  const av = AV.createAvionics();
  av.fpl.wps = ['LABRW', 'LABEA', 'LABEB']; av.fpl.active = 2; av.altSel = 4500; av.hdgBug = 45;
  stepN(s, 360, x => { x.thr = 0.62; });
  sample('pa44-cruise-map', s, av);
  av.mfdPage = 'ENGINE'; sample('pa44-cruise-engine', s, av, { o: { volts: 28.0, amps: 14 } });
  // one engine out (feathered)
  s.eng[1].run = false; s.eng[1].feather = true; s.eng[1].rpm = 400;
  av.mfdPage = 'MAP'; sample('pa44-one-out', s, av);
  av.pfdMenu = 'ALERTS'; sample('pa44-one-out-alerts', s, av);
}

// --- b737: jet branches (N1 arcs, Mach box, jet rows) ---
{
  const s = P.newState({ aircraft: 'b737', seed: 37 });
  P.placeInAir(s, -80000, 20000, 24000, 350, 300, 0, 0, 0.8);
  const av = AV.createAvionics();
  av.altSel = 25000; av.hdgBug = 355;
  stepN(s, 240, x => { x.thr = 0.8; });
  sample('b737-cruise-map', s, av, { o: { volts: 28.4, amps: 22 } });
  av.mfdPage = 'ENGINE'; sample('b737-engine-page', s, av);
  av.mfdPage = 'SYSTEM'; sample('b737-system-page', s, av);
}

fs.writeFileSync(new URL('./golden-g1000.jsonl', `file://${process.cwd()}/flight/test/`), records.map(r => JSON.stringify(r)).join('\n') + '\n');
const pfdOps = records.reduce((a, r) => a + r.pfd.length, 0), mfdOps = records.reduce((a, r) => a + r.mfd.length, 0);
console.log(`records=${records.length} pfdOps=${pfdOps} mfdOps=${mfdOps}`);
for (const r of records) console.log(' ', r.tag, 'pfd', r.pfd.length, 'mfd', r.mfd.length, 'ias', Math.round(r.o.ias || 0), 'alt', Math.round(r.o.altTrue || 0));
