// CADET Godot port — Phase 2 JS reference generator (avionics)
// Loads the ORIGINAL flight-lab/src/physics.js + avionics.js from cadet-wt-next (898fe8a)
// and writes test/reference2.json. The GDScript runner (test/run_tests2.gd) replays the
// same inputs against src/avionics.gd (CadetAvionics).
import fs from 'node:fs'; import vm from 'node:vm';
import path from 'node:path'; import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..', '..', 'cadet-wt-next');
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'flight-lab/src/physics.js'), 'utf8'), { filename: 'physics.js' });
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'flight-lab/src/avionics.js'), 'utf8'), { filename: 'avionics.js' });
const P = globalThis.FL.physics;
const AV = globalThis.FL.avionics;
const VARW = P.MAGVAR_W;           // 6
const RWY = P.LAB_RWY;

const R = { pure: {}, nav: [], control: {} };
const round6 = (o) => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v));
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------------------------------------------------------------- pure functions
{
  const A = {};
  // headings / magnetic variation
  A.headings = [];
  for (const t of [-720, -360, -10, 0, 6, 90, 179.9, 180, 354, 359.9, 360, 725.3])
    for (const v of [6, 0, -11, 6.5])
      A.headings.push({ t, v, tm: AV.trueToMag(t, v), mt: AV.magToTrue(t, v) });
  A.hdgDiff = [];
  for (const [a, b] of [[0, 90], [350, 10], [10, 350], [180, 0], [90, 270], [359, 1], [45, 45]])
    A.hdgDiff.push({ a, b, d: AV.hdgDiff(a, b) });
  A.hdgFmt = [0, 0.4, 0.5, 5, 59.5, 90, 359.4, 359.5, 359.6, 360, -1, 725, 180.49].map(h => ({ h, s: AV.hdgFmt(h) }));
  // altimeter
  A.alt = [];
  for (const alt of [0, 55, 1000, 3000, 10000])
    for (const [q, s] of [[29.92, 29.92], [29.50, 30.00], [30.10, 29.00], [28.00, 31.50], [29.92, 27.50]])
      A.alt.push({ alt, q, s, out: AV.indicatedAlt(alt, q, s) });
  A.press = [29.92, 28.10, 31.00, 1013.25, 980].map(v => ({ v, hpa: AV.inhgToHpa(v), inhg: AV.hpaToInhg(v) }));
  // radios: single tunes incl. every wrap boundary + chained tunes (the runner replays `steps` times)
  A.tune = [];
  const tuneCases = [
    // COM MHz wraps
    [136975, 'MHz', 1, 'COM'], [136000, 'MHz', 1, 'COM'], [118000, 'MHz', -1, 'COM'], [118975, 'MHz', -1, 'COM'],
    [121700, 'MHz', 1, 'COM'], [121700, 'MHz', -1, 'COM'],
    // COM kHz wraps / steps
    [118975, 'kHz', 1, 'COM'], [118000, 'kHz', -1, 'COM'], [136975, 'kHz', 1, 'COM'], [136950, 'kHz', 1, 'COM'],
    [121700, 'kHz', 1, 'COM'], [121700, 'kHz', -1, 'COM'], [118025, 'kHz', -1, 'COM'],
    // NAV MHz wraps
    [117950, 'MHz', 1, 'NAV'], [117900, 'MHz', 1, 'NAV'], [108000, 'MHz', -1, 'NAV'], [109900, 'MHz', 1, 'NAV'],
    // NAV kHz wraps / steps (50 kHz)
    [108000, 'kHz', -1, 'NAV'], [117950, 'kHz', 1, 'NAV'], [113500, 'kHz', 1, 'NAV'], [113500, 'kHz', -1, 'NAV'], [108050, 'kHz', -1, 'NAV'],
  ];
  for (const [f, part, dir, kind] of tuneCases) A.tune.push({ f, part, dir, kind, steps: 1, out: AV.tune(f, part, dir, kind) });
  const chains = [
    [136975, 'MHz', 1, 'COM', 3], [118000, 'MHz', -1, 'COM', 3], [118000, 'kHz', 1, 'COM', 41],
    [118975, 'kHz', 1, 'COM', 2], [108000, 'kHz', -1, 'NAV', 3], [117950, 'MHz', 1, 'NAV', 2], [113500, 'kHz', 1, 'NAV', 20],
  ];
  for (const [f, part, dir, kind, steps] of chains) {
    let v = f; for (let i = 0; i < steps; i++) v = AV.tune(v, part, dir, kind);
    A.tune.push({ f, part, dir, kind, steps, out: v });
  }
  A.fmt = [118000, 118300, 121700, 126950, 136975, 108000, 109900, 113500, 117950]
    .map(f => ({ f, com: AV.fmtCom(f), nav: AV.fmtNav(f) }));
  A.validCom = [118000, 118025, 121700, 136975, 118010, 117975, 137000, 118000.5, 136980]
    .map(f => ({ f, ok: AV.validCom(f) }));
  // positions
  A.neLatLon = [];
  for (const [n, e] of [[0, 0], [1000, -40000], [-16000, -38000], [50000, 30000], [-30000, 10000], [-1200, -40000]]) {
    const ll = AV.neToLatLon(n, e);
    // the round trip is computed from the 6-decimal-rounded lat/lon, exactly what the
    // GD runner can recover from this JSON (an unrounded round trip would differ by ~0.03 m)
    const llr = round6(ll);
    A.neLatLon.push({ n, e, ll, back: AV.latLonToNe(llr.lat, llr.lon) });
  }
  A.latLonNe = [];
  for (const [lat, lon] of [[28.777, -81.238], [28.9, -81.1], [28.5, -81.5], [29.0, -80.9]]) {
    const ne = AV.latLonToNe(lat, lon);
    A.latLonNe.push({ lat, lon, ne, back: AV.neToLatLon(ne.n, ne.e) });
  }
  const ORG2 = { lat: 35.0, lon: 139.0 };
  A.customOrigin = { org: ORG2, ll: AV.neToLatLon(3000, -7000, ORG2), ne: AV.latLonToNe(35.02, 138.97, ORG2) };
  A.gc = [];
  for (const [a, b] of [
    [{ lat: 28.777, lon: -81.238 }, { lat: 28.9, lon: -81.1 }],
    [{ lat: 28.777, lon: -81.238 }, { lat: 28.777, lon: -81.238 }],
    [{ lat: 35.0, lon: 139.0 }, { lat: 34.0, lon: 138.0 }],
    [{ lat: 28.5, lon: -81.5 }, { lat: 29.2, lon: -80.7 }],
  ]) A.gc.push({ a, b, d: AV.gcDistNm(a, b), brg: AV.gcBearing(a, b) });
  A.plane = [];
  const pts = {
    o: { n: 0, e: 0 }, a: { n: -1200, e: -40000 }, b: { n: 9000, e: -34000 },
    c: { n: 15000, e: -21000 }, d: { n: -16000, e: -38000 }, e2: { n: -2000, e: -33000 },
  };
  for (const [x, y, p] of [['a', 'b', 'o'], ['a', 'b', 'c'], ['o', 'c', 'd'], ['a', 'c', 'b'], ['b', 'd', 'e2'], ['o', 'a', 'b']]) {
    A.plane.push({ a: pts[x], b: pts[y], p: pts[p], dis: AV.neDistNm(pts[x], pts[y]), brg: AV.neBearing(pts[x], pts[y]),
      xtk: AV.xtkNm(pts[x], pts[y], pts[p]), atk: AV.atkToGoNm(pts[x], pts[y], pts[p]) });
  }
  A.ete = [];
  for (const [d, g] of [[10, 100], [10, 5], [10, 5.1], [10, 0], [3.3, 87], [0, 120], [55.5, 3]])
    A.ete.push({ d, g, sec: AV.eteSec(d, g), fmt: AV.eteFmt(AV.eteSec(d, g)) });
  A.eteFmt = [0, 59, 60, 599, 600, 3599, 3600, 3661, 36000, 754].map(s => ({ s, f: AV.eteFmt(s) }));
  // CDI primitives
  A.cdiGps = [];
  for (const x of [-3, -1.25, -0.5, 0, 0.5, 1.25, 3]) for (const fs of [1.0, 0.3, 2.0])
    A.cdiGps.push({ x, fs, dots: AV.cdiGps(x, fs) });
  A.cdiVor = [];
  for (let r = 0; r < 360; r += 30) for (const obs of [0, 90, 180, 270, 354, 360])
    A.cdiVor.push({ r, obs, out: AV.cdiVor(r, obs) });
  A.cdiVor.push({ r: 95, obs: 90, out: AV.cdiVor(95, 90) }, { r: 269, obs: 90, out: AV.cdiVor(269, 90) }, { r: 271, obs: 90, out: AV.cdiVor(271, 90) });
  A.cdiLocGs = [-5, -2.5, -1.25, -0.3, 0, 1.25, 2.5, 5].map(a => ({ a, loc: AV.cdiLoc(a), gs: AV.gsDots(a) }));
  // data tables + lookups
  A.tables = { waypoints: AV.WAYPOINTS, navaids: AV.NAVAIDS, procedures: AV.PROCEDURES, ranges: AV.RANGES, origin: AV.ORIGIN };
  A.wpt = ['LABRW', 'LABEA', 'LABED', 'LABEF', 'SFBVW', 'XXXX'].map(id => ({ id, w: AV.wpt(id) ?? null }));
  A.procById = ['ILS36', 'RNAV36', 'NOPE'].map(id => ({ id, p: AV.procedureById(id) ?? null }));
  A.catalog = AV.fplCatalog();
  A.xpdrMode = [];
  for (const mode of ['ALT', 'ON', 'STBY']) for (const gnd of [true, false]) {
    const av = AV.createAvionics(); av.xpdr.mode = mode;
    A.xpdrMode.push({ mode, gnd, out: AV.xpdrEffMode(av, gnd) });
  }
  A.cdiName = [];
  for (const over of [{}, { cdi: 'NAV1' }, { cdi: 'NAV2' }, { cdi: 'NAV1', nav1: { act: 113500, stby: 109900 } }, { cdi: 'NAV2', nav2: { act: 109900, stby: 113500 } }, { cdi: 'NAV2', nav2: { act: 110300, stby: 113500 } }]) {
    const av = Object.assign(AV.createAvionics(), over);
    A.cdiName.push({ av: clone(av), name: AV.cdiName(av) });
  }
  A.nrst = [];
  for (const pos of [null, { n: 0, e: -40000 }, { n: 12000, e: -25000 }, { n: -16000, e: -38000 }])
    A.nrst.push({ pos, list: AV.nrstList({}, pos, VARW) });
  A.alerts = [
    { o: { alerts: ['FUEL', 'OIL'] }, d: null },
    { o: { alerts: [{ id: 'X1', tier: 'WARN', text: 'X one' }, { text: 'no id' }, { id: 'Y2', level: 'warn' }, { id: 'Z3', tier: 'CAUT' }] }, d: null },
    { o: {}, d: null },
    { o: { volts: 11.0, amps: -3, oilP: [80], fuel: [20, 20] }, d: { eng: [{ run: true }] } },
    { o: { volts: 14.0, amps: 2, oilP: [20, 80], fuel: [2, 1], fuelPress: 0.3 }, d: { eng: [{ run: true }, { run: false }] } },
    { o: { volts: 14.0, amps: 2, oilP: [80], fuel: [20, 20], fuelPress: 0.9 }, d: null },
    { o: { oilP: [10], rpm: 2000 }, d: null },
    { o: { fuel: [2.9] }, d: null },
  ].map(c => ({ in: c, out: AV.collectAlerts({}, c.o, c.d) }));
  A.createAv = AV.createAvionics();
  R.pure = A;
}

// ---------------------------------------------------------------- control() transcript
{
  // [what, dir, big] — dir doubles as the value/key/id argument for several controls, as on the panel.
  const calls = [
    ['HDG', 1, false], ['HDG', 1, true], ['HDG', -1, false], ['HDG_SYNC', 123.6, false], ['HDG_SYNC', 0.2, false], ['HDG', -1, true],
    ['ALT', 1, false], ['ALT', 1, true], ['ALT', -1, false], ['ALT', -1, true], ['ALT', -1, true], ['ALT', -1, true],
    ['BARO', 1, false], ['BARO', 1, false], ['BARO', -1, false], ['STD_BARO', 1, false], ['BARO', -30, false], ['BARO', 200, false], ['STD_BARO', 1, false],
    ['ALT_UNIT', 1, false], ['ALT_UNIT', 1, false],
    ['CRS', 1, false], ['CRS', -1, true], ['CRS', 1, true],
    ['COM_MHZ', 1, false], ['COM_KHZ', 1, false], ['COM_KHZ', -1, false], ['COM_SWAP', 1, false], ['COM_SEL', 1, false],
    ['COM_MHZ', -1, false], ['COM_KHZ', 1, false], ['COM_SWAP', 1, false], ['COM_SEL', 1, false],
    ['NAV_MHZ', 1, false], ['NAV_KHZ', 1, false], ['NAV_SWAP', 1, false], ['NAV_SEL', 1, false], ['NAV_KHZ', -1, false], ['NAV_MHZ', -1, false], ['NAV_SWAP', 1, false], ['NAV_SEL', 1, false],
    ['CDI', 1, false], ['CDI', 1, false], ['CDI', 1, false], ['CDI', 1, false],
    ['MIC', 1, false], ['MON', 'COM2', false], ['MON', 'NAV1', false], ['MON', 'COM2', false],
    ['MFD_PAGE', 1, false], ['MFD_PAGE', 1, false], ['MFD_MAP', 1, false], ['MFD_FPL', 1, false], ['MFD_ENG', 1, false], ['MFD_SYS', 1, false], ['MFD_NRST', 1, false],
    ['NRST_SEL', 1, false], ['NRST_SEL', 1, false], ['NRST_SEL', -1, false], ['FPL_NEXT', -1, false], ['KEY_ENT', 1, false],
    ['MFD_FPL', 1, false], ['KEY_ENT', 1, false], ['FPL_PICK', 1, false], ['FPL_PICK', -1, false], ['KEY_ENT', 1, false],
    ['FPL_NEXT', 1, false], ['FPL_NEXT', -1, false], ['KEY_CLR', 1, false], ['KEY_CLR', 1, false], ['FPL_DEL', 1, false],
    ['PROC', 1, false], ['PROC', 1, false], ['PROC', 1, false],
    ['PROC_RNAV', 1, false], ['PROC_RNAV', 1, false], ['PROC_RNAV', 1, false],
    ['RANGE', 1, false], ['RANGE', 1, false], ['RANGE', -1, false], ['RANGE', -9, false], ['RANGE', 99, false],
    ['NORTH_UP', 1, false], ['NORTH_UP', 1, false],
    ['PFD_MENU', 'PFD', false], ['PFD_MENU', 'TOP', false],
    ['XPDR', 1, false], ['XPDR_DIGIT', 1, false], ['XPDR_DIGIT', 2, false], ['XPDR_BKSP', 1, false],
    ['XPDR_DIGIT', 3, false], ['XPDR_DIGIT', 4, false], ['XPDR_DIGIT', 7, false], ['XPDR_DIGIT', 9, false],
    ['XPDR_MODE', 1, false], ['XPDR_MODE', 1, false], ['XPDR_MODE', 1, false], ['XPDR_IDENT', 1, false], ['XPDR', 1, false],
    ['OBS', 1, false], ['OBS', 1, false],
    ['BRG1', 1, false], ['BRG1', 1, false], ['BRG1', 1, false], ['BRG2', 1, false], ['BRG2', 1, false], ['BRG2', 1, false],
    ['ALERTS', 1, false], ['ALERTS', 1, false], ['WIND', 1, false], ['WIND', 1, false],
    ['DIRECT', 'LABEC', false], ['KEY_CLR', 1, false], ['DIRECT', null, false],
    ['FPL_NEXT', 1, false], ['FPL_NEXT', 1, false], ['FPL_NEXT', -1, false],
    ['BOGUS', 1, false],
  ];
  const av = AV.createAvionics();
  const transcript = [];
  for (const c of calls) transcript.push({ msg: AV.control(av, c[0], c[1], c[2]), av: clone(av) });
  R.control = { calls, transcript };
}

// ---------------------------------------------------------------- navSolve scenarios
{
  const mkAv = (over = {}) => Object.assign(AV.createAvionics(), over);
  const deepAv = (over = {}) => { const av = AV.createAvionics(); for (const k of Object.keys(over)) av[k] = over[k]; return av; };
  // position on the RWY 36 final from along/cross (metres, threshold origin) via the physics inverse
  const onFinal = (along, cross) => { const ne = P.rwyToNE(RWY, along, cross); return { n: ne[0], e: ne[1] }; };
  const gpAlt = (along) => RWY.elevFt + Math.tan(3 * Math.PI / 180) * (300 - along) * 3.28084;
  const S = [];
  const add = (name, av, pos, o, rwy = RWY) => {
    const before = clone(av);
    const out = AV.navSolve(av, pos, o, VARW, rwy);
    S.push({ name, av: before, pos, o, varW: VARW, useRwy: rwy != null, out, avAfter: clone(av) });
  };
  const O = (gs, altTrue) => ({ gs, altTrue });
  // GPS: en-route leg LABRW -> LABEA, on track and offset
  add('gps-leg-ontrack', mkAv(), { n: 3900, e: -37000 }, O(100, 3000));
  add('gps-leg-offset', mkAv(), { n: 3900, e: -35000 }, O(100, 3000));
  add('gps-leg-slow', mkAv(), { n: 3900, e: -37000 }, O(4, 3000));
  // GPS: final leg into the airport waypoint (<=5 NM -> 0.3 scale), and the same leg far out (>30 NM -> 2.0)
  add('gps-final-apt', deepAv({ fpl: { wps: ['LABEA', 'LABRW'], active: 1 } }), { n: -7000, e: -40000 }, O(90, 1500));
  add('gps-enroute-far', deepAv({ fpl: { wps: ['LABRW', 'LABEB'], active: 1 } }), { n: -60000, e: 20000 }, O(120, 8000));
  add('gps-mid-scale', deepAv({ fpl: { wps: ['LABRW', 'LABEB'], active: 1 } }), { n: 3900, e: -37000 }, O(100, 3000));
  // GPS OBS (the hold): needle resolved against CRS to LABED from four quadrants
  for (const [tag, pos] of [['n', { n: -6000, e: -38000 }], ['e', { n: -16000, e: -28000 }], ['s', { n: -26000, e: -38000 }], ['w', { n: -16000, e: -48000 }]])
    add('gps-obs-hold-' + tag, deepAv({ direct: 'LABED', obs: true, crs: 90 }), pos, O(100, 3000));
  add('gps-obs-off', deepAv({ direct: 'LABED', obs: true, crs: 90 }), { n: -11000, e: -33000 }, O(100, 3000));
  // GPS direct-to (directFrom latches at the first solution) and with a preset origin
  add('gps-direct-latch', deepAv({ direct: 'LABEB' }), { n: 0, e: -40000 }, O(110, 3500));
  add('gps-direct-preset', deepAv({ direct: 'LABEC', directFrom: { n: 9000, e: -34000, id: 'P.POS' } }), { n: 0, e: -30000 }, O(110, 3500));
  // GPS failure / no leg
  add('gps-fail', deepAv({ fail: { gps: true } }), { n: 3900, e: -37000 }, O(100, 3000));
  add('gps-noleg', deepAv({ fpl: { wps: ['LABRW', 'XXXX'], active: 1 } }), { n: 3900, e: -37000 }, O(100, 3000));
  // VOR tracking (NAV1 = LBV 113.50): on radial, off radial, TO/FROM sides, out of range, NAV2, untuned freq
  add('vor-north', deepAv({ cdi: 'NAV1', crs: 180 }), { n: 14000, e: -30000 }, O(100, 3000));
  add('vor-east-off', deepAv({ cdi: 'NAV1', crs: 270 }), { n: 5000, e: -20000 }, O(100, 3000));
  add('vor-south-to', deepAv({ cdi: 'NAV1', crs: 360 }), { n: -6000, e: -31000 }, O(100, 3000));
  add('vor-far', deepAv({ cdi: 'NAV1', crs: 180 }), { n: 100000, e: -30000 }, O(100, 3000));
  add('vor-nav2', deepAv({ cdi: 'NAV2', crs: 90 }), { n: 4000, e: -20000 }, O(100, 3000));
  add('vor-notune', deepAv({ cdi: 'NAV1', nav1: { act: 110300, stby: 113500 }, crs: 90 }), { n: 4000, e: -20000 }, O(100, 3000));
  // LOC / ILS RWY 36: on the glidepath, right of course, high, too close, too far right, behind the antenna
  add('ils-onpath', deepAv({ cdi: 'NAV1' }), onFinal(-9260, 0), O(80, gpAlt(-9260)));
  add('ils-right-high', deepAv({ cdi: 'NAV1' }), onFinal(-9260, 300), O(80, gpAlt(-9260) + 300));
  add('ils-left-low', deepAv({ cdi: 'NAV1' }), onFinal(-5000, -150), O(80, gpAlt(-5000) - 200));
  add('ils-too-close', deepAv({ cdi: 'NAV1' }), onFinal(1300, 0), O(80, 300));
  add('ils-wide', deepAv({ cdi: 'NAV1' }), onFinal(-9260, 9000), O(80, 3000));
  add('ils-short-final', deepAv({ cdi: 'NAV1' }), onFinal(-250, 10), O(70, gpAlt(-250)));
  add('loc-nav2-tuned', deepAv({ cdi: 'NAV2', nav2: { act: 109900, stby: 113500 } }), onFinal(-9260, 0), O(80, gpAlt(-9260)));
  // RNAV LPV: procedure loaded, on the 3-degree path to the same threshold; missed sequenced -> no guidance
  const rnavProc = { name: 'RNAV (GPS) RWY 36', type: 'RNAV', missed: false, daFt: 305, mdaFt: 505 };
  add('lpv-onpath', deepAv({ proc: clone(rnavProc), direct: 'LABRW' }), onFinal(-6000, 100), O(85, gpAlt(-6000)));
  add('lpv-offpath', deepAv({ proc: clone(rnavProc), direct: 'LABRW' }), onFinal(-6000, -800), O(85, gpAlt(-6000) + 400));
  add('lpv-missed', deepAv({ proc: { ...clone(rnavProc), missed: true }, direct: 'LABED' }), onFinal(-6000, 100), O(85, gpAlt(-6000)));
  add('lpv-norwy', deepAv({ proc: clone(rnavProc), direct: 'LABRW' }), onFinal(-6000, 100), O(85, gpAlt(-6000)), null);
  add('gps-norwy', mkAv(), { n: 3900, e: -37000 }, O(100, 3000), null);
  R.nav = S;
}

fs.writeFileSync(path.join(here, '..', 'test', 'reference2.json'), JSON.stringify(round6(R)));
console.log('reference2.json written:', JSON.stringify({
  headings: R.pure.headings.length, tune: R.pure.tune.length, cdiVor: R.pure.cdiVor.length,
  controlCalls: R.control.calls.length, navScenarios: R.nav.length,
}));
