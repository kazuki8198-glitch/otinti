// FLIGHT LAB — avionics tests (node --test): headings, magnetic variation, the altimeter setting, radio steps,
// the CDI's direction, distances, cross-track, the panel controls and the drawing (no NaN / Infinity reaches a canvas).
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, CORE } from './load.mjs';
const FL = load(...CORE);
const A = FL.avionics, P = FL.physics;
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ''} ${a} ≈ ${b} (±${eps})`);

// a canvas 2D context that records every number it is given
export function mockCanvas() {
  const bad = [], calls = { n: 0 };
  const check = (name, args) => { calls.n++; for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) bad.push(`${name}(${args.join(',')})`); };
  const target = {};
  const g = new Proxy(target, {
    get(t, k) { if (k in t) return t[k]; return (...args) => { check(String(k), args); return undefined; }; },
    set(t, k, v) { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(`${String(k)}=${v}`); t[k] = v; return true; },
  });
  return { g, bad, calls };
}

test('heading wrap-around: shortest turn, 000 shown as 360, wrap of negatives', () => {
  assert.equal(A.hdgDiff(350, 10), 20);
  assert.equal(A.hdgDiff(10, 350), -20);
  assert.equal(A.hdgDiff(90, 270), -180);
  assert.equal(A.hdgFmt(0), '360');
  assert.equal(A.hdgFmt(360), '360');
  assert.equal(A.hdgFmt(5.4), '005');
  assert.equal(A.wrap360(-10), 350);
  assert.equal(A.wrap360(725), 5);
});

test('magnetic conversion: west variation is added ("west is best"), and back', () => {
  assert.equal(A.trueToMag(354, 6), 0);
  assert.equal(A.magToTrue(360, 6), 354);
  assert.equal(A.trueToMag(100, -5), 95);           // east variation subtracts
  for (const t of [0, 45, 183, 359]) near(A.magToTrue(A.trueToMag(t, 6), 6), t, 1e-9);
  // LAB RWY 36: true 354 with the teaching variation 6°W reads 360 magnetic
  assert.equal(A.hdgFmt(A.trueToMag(P.LAB_RWY.trueHdg, P.MAGVAR_W)), '360');
});

test('BARO sign: a setting higher than the real pressure reads higher, lower reads lower', () => {
  assert.equal(A.indicatedAlt(3000, 29.92, 29.92), 3000);
  near(A.indicatedAlt(3000, 29.92, 30.12), 3200, 1e-6, 'setting +0.20 inHg');
  near(A.indicatedAlt(3000, 30.12, 29.92), 2800, 1e-6, 'setting −0.20 inHg');
  near(A.inhgToHpa(29.92), 1013.2, 0.1);
  near(A.hpaToInhg(A.inhgToHpa(30.01)), 30.01, 1e-9);
});

test('COM tuning: 25 kHz steps, the inner knob wraps inside the MHz, the outer knob wraps 118–136', () => {
  assert.equal(A.tune(118000, 'kHz', 1), 118025);
  assert.equal(A.tune(118975, 'kHz', 1), 118000);
  assert.equal(A.tune(118000, 'kHz', -1), 118975);
  assert.equal(A.tune(136975, 'MHz', 1), 118975);
  assert.equal(A.tune(118500, 'MHz', -1), 136500);
  assert.equal(A.fmtCom(121500), '121.500');
  assert.equal(A.fmtCom(118025), '118.025');
  assert.ok(A.validCom(119275)); assert.ok(!A.validCom(119270)); assert.ok(!A.validCom(117975));
  // 1,000 random turns of either knob never leave the band or the step (integers: no float drift)
  let f = 121700;
  for (let i = 0; i < 1000; i++) { f = A.tune(f, i % 3 ? 'kHz' : 'MHz', (i * 7919) % 2 ? 1 : -1); assert.ok(A.validCom(f), `bad ${f}`); }
});

test('NAV tuning: 50 kHz steps inside 108.00–117.95', () => {
  assert.equal(A.tune(108000, 'kHz', 1, 'NAV'), 108050);
  assert.equal(A.tune(117950, 'MHz', 1, 'NAV'), 108950);
  assert.equal(A.fmtNav(109900), '109.90');
});

test('CDI direction: course to the right of the aircraft → needle right (+); GPS and VOR', () => {
  // aircraft RIGHT of a northbound course (positive XTK): the course is to the LEFT → needle left (negative)
  const a = { n: 0, e: 0 }, b = { n: 10000, e: 0 };
  const right = { n: 5000, e: 500 }, left = { n: 5000, e: -500 };
  assert.ok(A.xtkNm(a, b, right) > 0 && A.xtkNm(a, b, left) < 0);
  assert.ok(A.cdiGps(A.xtkNm(a, b, right)) < 0, 'needle left when right of course');
  assert.ok(A.cdiGps(A.xtkNm(a, b, left)) > 0, 'needle right when left of course');
  // the G1000 HSI scale: two dots a side, full scale at the second dot (pegged at 2.5)
  assert.equal(A.cdiGps(1), -2, 'TERM: 1.0 NM = full scale'); assert.equal(A.cdiGps(-0.25), 0.5); assert.equal(A.cdiGps(5), -2.5, 'pegged');
  assert.equal(A.cdiGps(-2, 2), 2, 'ENR: 2.0 NM = full scale');
  // VOR, OBS 360: on the 010 radial (north of the station, east of the 360 radial), FROM → the course is to the left
  const v = A.cdiVor(10, 360); assert.equal(v.toFrom, 'FROM'); assert.ok(v.dots < 0, 'radial 010, OBS 360 FROM: needle left');
  // on the 190 radial (south of the station, west of the 180 radial), TO → the course is to the right
  const w = A.cdiVor(190, 360); assert.equal(w.toFrom, 'TO'); assert.ok(w.dots > 0, 'radial 190, OBS 360 TO: needle right');
  assert.equal(A.cdiVor(360, 360).dots, 0);
  // VOR: 5° a dot, 10° full scale; localizer 1.25° a dot; glide slope 0.35° a dot
  near(A.cdiVor(185, 360).dots, 1, 1e-9, 'VOR 5° off'); near(Math.abs(A.cdiVor(170, 360).dots), 2, 1e-9, 'VOR 10° = full scale');
  near(A.cdiLoc(-1.25), 1, 1e-9); near(A.cdiLoc(2.5), -2, 1e-9); near(A.gsDots(0.35), -1, 1e-9); near(A.gsDots(-0.7), 2, 1e-9);
});

test('localizer and glide path: right of the centre line → needle left; high → diamond down', () => {
  const R = P.LAB_RWY, av = A.createAvionics(); av.cdi = 'NAV1'; av.nav1.act = 109900;
  const o = { altTrue: 0, gs: 70, trk: R.trueHdg, hdgTrue: R.trueHdg };
  const at = (along, cross, aglFt) => { const [n, e] = P.rwyToNE(R, along, cross); o.altTrue = R.elevFt + aglFt; return A.navSolve(av, { n, e }, o, P.MAGVAR_W, R); };
  const onPath = h => (300 + 4000) * Math.tan(3 * Math.PI / 180) * 3.28084 + h;
  const c = at(-4000, 0, onPath(0)); near(c.dots, 0, 1e-6); near(c.gsDots, 0, 0.05);
  assert.ok(at(-4000, 60, onPath(0)).dots < 0, 'right of the centre line: needle left');
  assert.ok(at(-4000, -60, onPath(0)).dots > 0, 'left: needle right');
  assert.ok(at(-4000, 0, onPath(150)).gsDots < 0, 'high: the glide path is below');
  assert.ok(at(-4000, 0, onPath(-150)).gsDots > 0, 'low: the glide path is above');
  assert.equal(c.src, 'LOC1');
});

test('navigation distance and bearing: plane and great circle agree near the origin', () => {
  const O = A.ORIGIN, p = A.neToLatLon(1852 * 10, 0), q = A.neToLatLon(0, 1852 * 10);
  near(A.gcDistNm(O, p), 10, 0.02, 'north 10 nm'); near(A.gcDistNm(O, q), 10, 0.02, 'east 10 nm');
  near(A.gcBearing(O, p), 0, 0.01); near(A.gcBearing(O, q), 90, 0.1);
  near(A.neDistNm({ n: 0, e: 0 }, { n: 3000, e: 4000 }), 5000 / 1852, 1e-9);
  assert.equal(A.neBearing({ n: 0, e: 0 }, { n: 0, e: -100 }), 270);
  const back = A.latLonToNe(p.lat, p.lon); near(back.n, 18520, 1e-6); near(back.e, 0, 1e-6);
  near(A.atkToGoNm({ n: 0, e: 0 }, { n: 18520, e: 0 }, { n: 1852 * 4, e: 300 }), 6, 1e-9);
});

test('ETE: distance ÷ ground speed, formatted; no ETE when not moving', () => {
  assert.equal(A.eteSec(10, 120), 300); assert.equal(A.eteSec(10, 2), null);
  assert.equal(A.eteFmt(300), '05:00'); assert.equal(A.eteFmt(3725), '1:02'); assert.equal(A.eteFmt(null), '--:--'); assert.equal(A.eteFmt(NaN), '--:--');
});

test('panel controls: HDG / ALT / BARO / COM swap / CDI cycle / range / D→ starts from the present position', () => {
  const av = A.createAvionics();
  A.control(av, 'HDG', 1); assert.equal(av.hdgBug, 1); A.control(av, 'HDG', -1); A.control(av, 'HDG', -1); assert.equal(av.hdgBug, 359);
  A.control(av, 'ALT', 1, true); assert.equal(av.altSel, 4000); A.control(av, 'ALT', -1); assert.equal(av.altSel, 3900);
  A.control(av, 'BARO', 1); assert.equal(av.baro, 29.93); A.control(av, 'STD_BARO'); assert.equal(av.baro, 29.92);
  const [a0, s0] = [av.com1.act, av.com1.stby]; A.control(av, 'COM_SWAP'); assert.deepEqual([av.com1.act, av.com1.stby], [s0, a0]);
  A.control(av, 'COM_KHZ', 1); assert.equal(av.com1.stby, a0 + 25);
  assert.equal(av.cdi, 'GPS'); A.control(av, 'CDI'); assert.equal(av.cdi, 'NAV1'); A.control(av, 'CDI'); assert.equal(av.cdi, 'NAV2'); A.control(av, 'CDI'); assert.equal(av.cdi, 'GPS');
  for (let i = 0; i < 20; i++) A.control(av, 'RANGE', 1); assert.equal(av.mfdRangeIdx, A.RANGES.length - 1);
  assert.match(A.control(av, 'MIC'), /送信はできません/);
  A.control(av, 'DIRECT', 'LABEF');
  const o = { gs: 100, trk: 0, hdgTrue: 0, altTrue: 2500 }, p1 = { n: 1000, e: -40000 };
  const n1 = A.navSolve(av, p1, o, 6, P.LAB_RWY); near(n1.xtk, 0, 1e-9, 'XTK 0 at the D→ point');
  const n2 = A.navSolve(av, { n: 1000, e: -39000 }, o, 6, P.LAB_RWY); assert.ok(Math.abs(n2.xtk) > 0.05, 'the D→ leg stays where it was set');
});

const panel = (s, av, o = s.out, qnh = 29.92) => ({ o, av, nav: A.navSolve(av, P.ne(s), o, 6, P.LAB_RWY), varW: 6, qnh, eng: s.eng.map(e => ({ run: e.run, rpm: e.rpm, feather: e.feather })), V: s.A.v, fuelCap: s.A.fuelCap, pos: P.ne(s) });
test('drawing: the PFD and MFD give no NaN / Infinity to the canvas (both aircraft, failures, broken inputs)', () => {
  const broken = { pitch: NaN, bank: Infinity, ias: NaN, vsi: -Infinity, altTrue: NaN, hdgTrue: NaN, trk: undefined, gs: NaN, tas: NaN, rpm: NaN, fuelFlow: NaN, fuel: [NaN, NaN], aoaFrac: NaN, windFrom: NaN, windKt: NaN, oat: NaN, powerPct: NaN, slip: NaN };
  for (const ac of ['pa28', 'pa44']) {
    const s = P.placeInAir(P.newState({ aircraft: ac }), 0, -40000, 3000, 354, ac === 'pa28' ? 100 : 130);
    if (ac === 'pa44') { s.eng[0].failed = true; s.eng[0].feather = true; }
    for (const [i, o] of [s.out, broken].entries()) for (const page of ['MAP', 'FPL']) for (const cdi of ['GPS', 'NAV1']) for (const fail of [{}, { ahrs: true, gps: true }]) {
      const av = A.createAvionics(); av.mfdPage = page; av.cdi = cdi; av.fail = fail;
      const d = panel(s, av, o, i ? NaN : 29.92);
      const m1 = mockCanvas(); A.drawPFD(m1.g, 640, 420, d); assert.deepEqual(m1.bad, [], `PFD ${ac} case ${i}`); assert.ok(m1.calls.n > 200);
      const m2 = mockCanvas(); A.drawMFD(m2.g, 640, 420, d); assert.deepEqual(m2.bad, [], `MFD ${ac} case ${i} ${page}`); assert.ok(m2.calls.n > 50);
    }
  }
});

test('MFD engine strip: every value with a model is shown real — oil, EGT, the twin\'s manifold pressure, volts and amps; nothing is made up', () => {
  // (changed twice over: OIL PSI / OIL °F / VOLTS / AMPS used to be pinned to '—' here until the electrical model
  // landed — oil pressure off rpm, oil temperature lagging power, a battery + alternator — and EGT / MAN IN until
  // the powerplant model landed. With both in, the whole strip is real; the '—' convention stays for any value a
  // caller does not provide.)
  const texts = [];
  const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { if (k === 'fillText') texts.push(String(a[0])); }), set: (t, k, v) => { t[k] = v; return true; } });
  const av = A.createAvionics(), s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100);
  for (let t = 0; t < 20; t += 1 / 30) P.step(s, 1 / 30);          // (let the oil pressure come up)
  A.drawMFD(g, 640, 420, panel(s, av));
  const after = lab => { const i = texts.indexOf(lab); assert.ok(i >= 0, lab); return texts[i + 1]; };
  const oilP = Number(after('OIL PSI')); assert.ok(oilP >= 40 && oilP <= 90, `OIL PSI ${oilP}`);
  assert.ok(Number(after('OIL °F')) > s.out.oat * 9 / 5 + 32, 'OIL °F above the day\'s air, and warming');
  assert.match(after('EGT °F'), /^\d+$/, 'EGT shows its real value');
  const volts = Number(after('VOLTS')); assert.ok(volts > 13.5 && volts < 14.6, `VOLTS ${volts}`);
  assert.notEqual(after('AMPS'), '—', 'AMPS shows its real value');
  assert.ok(texts.some(t => /未実装/.test(t)), 'the footer still explains the — convention');
  assert.ok(texts.some(t => /NOT FOR NAVIGATION/.test(t)));
  // the twin: stepped a few seconds so the gauges settle — MAN IN reads L/R manifold pressures, EGT reads L/R
  const t2 = P.placeInAir(P.newState({ aircraft: 'pa44' }), 0, -40000, 3000, 354, 110);
  for (let i = 0; i < 600; i++) P.step(t2, 1 / 120);
  const texts2 = [];
  const g2 = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { if (k === 'fillText') texts2.push(String(a[0])); }), set: (t, k, v) => { t[k] = v; return true; } });
  A.drawMFD(g2, 640, 420, panel(t2, A.createAvionics()));
  { const i = texts2.indexOf('MAN IN'); assert.ok(i >= 0, 'MAN IN'); assert.match(texts2[i + 1], /^\d+\.\d\/\d+\.\d$/, 'MAN IN shows L/R'); }
  { const i = texts2.indexOf('EGT °F'); assert.ok(i >= 0, 'EGT °F'); assert.match(texts2[i + 1], /^\d+\/\d+$/, 'EGT shows L/R'); }
});

test('GPS CDI full scale follows the phase: 2.0 en route, 1.0 terminal, 0.3 on the final leg to an airport', () => {
  const av = A.createAvionics(), o = { gs: 100, trk: 0, hdgTrue: 0, altTrue: 3000 };
  // the default plan's active leg ends at LABEA (a waypoint): far is en route, near is terminal, never approach
  assert.equal(A.navSolve(av, { n: 9000, e: -34000 - 40 * 1852 }, o, 6, P.LAB_RWY).cdiScale, 2.0);
  assert.equal(A.navSolve(av, { n: 9000, e: -34000 - 10 * 1852 }, o, 6, P.LAB_RWY).cdiScale, 1.0);
  assert.equal(A.navSolve(av, { n: 9000, e: -34000 - 3 * 1852 }, o, 6, P.LAB_RWY).cdiScale, 1.0, 'a waypoint final is still terminal scale');
  // the final leg into the airport waypoint (LABRW): within 5 NM the scale tightens to 0.3
  av.fpl.wps = ['LABEA', 'LABRW']; av.fpl.active = 1;
  assert.equal(A.navSolve(av, { n: -1200 - 3 * 1852, e: -40000 }, o, 6, P.LAB_RWY).cdiScale, 0.3);
  assert.equal(A.navSolve(av, { n: -1200 - 20 * 1852, e: -40000 }, o, 6, P.LAB_RWY).cdiScale, 1.0);
  // the same half-mile cross-track deflects the needle twice as far at terminal scale as en route
  const av2 = A.createAvionics();
  const enr = A.navSolve(av2, { n: -51506, e: -70667 }, o, 6, P.LAB_RWY), ter = A.navSolve(av2, { n: -3612, e: -42494 }, o, 6, P.LAB_RWY);
  assert.equal(enr.cdiScale, 2.0); assert.equal(ter.cdiScale, 1.0);
  near(Math.abs(ter.dots), Math.abs(enr.dots) * 2, 0.05, 'needle deflection follows the scale');
});

test('transponder: the code is set from the XPDR menu, digit by digit, and the mode cycles', () => {
  const av = A.createAvionics();
  assert.deepEqual(av.xpdr, { code: 1200, mode: 'ALT', entry: '' });
  A.control(av, 'XPDR'); assert.equal(av.pfdMenu, 'XPDR');
  for (const d of [4, 2, 1]) { A.control(av, 'XPDR_DIGIT', d); assert.equal(av.xpdr.code, 1200, 'not set until the fourth digit'); }
  assert.equal(av.xpdr.entry, '421');
  A.control(av, 'XPDR_BKSP'); assert.equal(av.xpdr.entry, '42');
  A.control(av, 'XPDR_DIGIT', 1); A.control(av, 'XPDR_DIGIT', 5);
  assert.equal(av.xpdr.code, 4215); assert.equal(av.xpdr.entry, '');
  A.control(av, 'XPDR_MODE'); assert.equal(av.xpdr.mode, 'ON');
  A.control(av, 'XPDR_MODE'); assert.equal(av.xpdr.mode, 'STBY');
  A.control(av, 'XPDR_MODE'); assert.equal(av.xpdr.mode, 'ALT');
  A.control(av, 'XPDR'); assert.equal(av.pfdMenu, 'TOP');
  A.control(av, 'XPDR'); A.control(av, 'XPDR_DIGIT', 9); assert.equal(av.xpdr.entry, '7', 'a squawk digit is 0–7');
});

test('electrics and oil: the alternator charges, a failed one drains, oil and the Hobbs follow the engines', () => {
  const step = (s, sec) => { for (let t = 0; t < sec; t += 1 / 30) P.step(s, 1 / 30); };
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100), h0 = s.hobbs;
  step(s, 12);
  assert.ok(s.out.volts > 13.5 && s.out.volts < 14.6, `volts ${s.out.volts}`);
  assert.ok(s.out.oilP[0] >= 40 && s.out.oilP[0] <= 90, `oilP ${s.out.oilP}`);
  assert.ok(s.out.oilT[0] > s.out.oat * 9 / 5 + 32, 'the oil is warming');
  near(s.hobbs, h0 + 12 / 3600, 0.002, 'the Hobbs turns with the engine');
  // the alternator failed and the battery is tired: negative amps, a sagging bus
  s.elec.altFail = true; s.elec.batt = 0.5; step(s, 5);
  assert.ok(s.out.amps < 0, `amps ${s.out.amps}`); assert.ok(s.out.volts < 12.2, `volts ${s.out.volts}`);
  // on the ground with the engines cut: the battery drains on the panel load, the Hobbs and the oil stop
  const s2 = P.placeOnRunway(P.newState());
  step(s2, 10); assert.ok(s2.out.oilP[0] > 30, `oil up at idle ${s2.out.oilP}`);
  s2.eng.forEach(e => { e.cut = true; }); const b0 = s2.elec.batt, h1 = s2.hobbs;
  step(s2, 30);
  assert.ok(s2.elec.batt < b0, 'draining'); assert.equal(s2.hobbs, h1, 'the Hobbs is stopped'); assert.ok(s2.out.oilP[0] < 5, 'oil pressure gone');
  // the twin: two oil readings, one per engine
  const s3 = P.placeInAir(P.newState({ aircraft: 'pa44' }), 0, -40000, 3000, 354, 130);
  step(s3, 12);
  assert.equal(s3.out.oilP.length, 2); assert.ok(s3.out.oilP.every(p => p >= 40 && p <= 90), `twin oilP ${s3.out.oilP}`);
  assert.equal(s3.out.oilT.length, 2);
});

test('PFD altitude readout: the drum turns in 20 ft steps (the tape itself stays smooth)', () => {
  const texts = [];
  const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { if (k === 'fillText') texts.push(String(a[0])); }), set: (t, k, v) => { t[k] = v; return true; } });
  const av = A.createAvionics(), s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100);
  A.drawPFD(g, 640, 420, panel(s, av, { ...s.out, altTrue: 3013 }));
  assert.ok(!texts.includes('3013') && !texts.includes('3010'), 'no 1 ft (or 10 ft) readout');
  assert.ok(texts.includes('3000'), 'reads the nearest 20');
});

test('failures on the displays: AHRS failure flags the attitude and heading, GPS failure flags the GPS course', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100), av = A.createAvionics();
  av.fail = { gps: true }; av.cdi = 'GPS'; A.control(av, 'DIRECT', 'LABEF');
  assert.equal(A.navSolve(av, P.ne(s), s.out, 6, P.LAB_RWY).flag, 'NO GPS');
  const texts = [];
  const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { if (k === 'fillText') texts.push(String(a[0])); }), set: (t, k, v) => { t[k] = v; return true; } });
  av.fail = { ahrs: true }; A.drawPFD(g, 640, 420, panel(s, av));
  assert.ok(texts.some(t => /AHRS|ATT FAIL|姿勢/.test(t)), texts.filter(t => /FAIL|AHRS/.test(t)).join(','));
});

test('CAS: the collector derives the stack from live signals, and o.alerts wins when provided', () => {
  const av = A.createAvionics();
  const calm = A.collectAlerts(av, { volts: 14.1, amps: 12, oilP: [70], fuel: [20, 20] }, { eng: [{ run: true }] });
  assert.deepEqual(calm, [], 'a healthy aircraft raises nothing');
  const low = A.collectAlerts(av, { volts: 11.4, amps: -8, oilP: [70], fuel: [20, 20] }, { eng: [{ run: true }] });
  assert.deepEqual(low.map(a => a.id), ['LOW VOLTS']);
  const bad = A.collectAlerts(av, { volts: 14, amps: 5, oilP: [10], fuel: [2, 20] }, { eng: [{ run: true }] });
  assert.deepEqual(bad.map(a => a.id), ['LOW OIL PRESSURE', 'LOW FUEL L']);
  assert.equal(bad[0].tier, 'WARN');
  const given = A.collectAlerts(av, { alerts: ['X CUSTOM', { id: 'Y', tier: 'WARN', text: 'Y TEXT' }] }, { eng: [{ run: true }] });
  assert.deepEqual(given.map(a => a.text), ['X CUSTOM', 'Y TEXT'], 'a provided stack is authoritative');
  // the PFD draws the stack and the ALERTS page acknowledges it
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100);
  const texts = [];
  const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { if (k === 'fillText') texts.push(String(a[0])); }), set: (t, k, v) => { t[k] = v; return true; } });
  const d = panel(s, av); d.o = { ...d.o, volts: 11.2, amps: -9 };
  A.drawPFD(g, 640, 420, d);
  assert.ok(texts.some(t => /LOW VOLTS/.test(t)), 'the stack is drawn on the PFD');
  assert.equal(av._alertsUnacked, 1, 'unacknowledged until the page is opened');
  A.control(av, 'ALERTS'); A.drawPFD(g, 640, 420, d);
  assert.equal(av._alertsUnacked, 0, 'opening the ALERTS page acknowledges');
});

test('OBS: the GPS needle resolves against the selected course to the waypoint', () => {
  const av = A.createAvionics(), o = { gs: 100, trk: 0, hdgTrue: 0, altTrue: 3000 };
  A.control(av, 'DIRECT', 'LABEA');                       // LABEA at n 9000, e -34000
  const wptPos = { n: 9000, e: -34000 };
  // south of the waypoint on its 360 radial (bearing from wpt to aircraft = 180): OBS 360 → TO, centred
  const south = { n: wptPos.n - 3 * 1852, e: wptPos.e };
  let n = A.navSolve(av, south, o, 6, P.LAB_RWY);
  assert.equal(n.obs, undefined); assert.ok(Math.abs(n.dots) < 0.6, 'the plain GPS needle follows the leg');
  A.control(av, 'OBS'); av.crs = 6;                       // (the inbound course along the 186° magnetic radial the aircraft sits on)
  n = A.navSolve(av, south, o, 6, P.LAB_RWY);
  assert.equal(n.obs, true); assert.equal(n.toFrom, 'TO'); assert.ok(Math.abs(n.dots) < 0.3, `OBS centred on course, got ${n.dots}`);
  av.crs = 96; n = A.navSolve(av, south, o, 6, P.LAB_RWY);
  assert.ok(Math.abs(n.dots) > 1.5, 'a 90° OBS course deflects the needle hard');
  A.control(av, 'OBS'); n = A.navSolve(av, south, o, 6, P.LAB_RWY); assert.equal(n.obs, undefined);
});

test('transponder: GND is the effective ALT on the ground, IDENT runs 18 s, PA is reported', () => {
  const av = A.createAvionics();
  assert.equal(A.xpdrEffMode(av, true), 'GND'); assert.equal(A.xpdrEffMode(av, false), 'ALT');
  av.xpdr.mode = 'STBY'; assert.equal(A.xpdrEffMode(av, true), 'STBY');
  av.xpdr.mode = 'ALT';
  A.control(av, 'XPDR_IDENT'); assert.equal(av.xpdrIdent, 18);
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100);
  const texts = [];
  const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { if (k === 'fillText') texts.push(String(a[0])); }), set: (t, k, v) => { t[k] = v; return true; } });
  const d = panel(s, av); d.o = { ...d.o, onGround: true };
  A.drawPFD(g, 640, 420, d);
  assert.ok(texts.includes('GND'), 'the window shows GND on the ground');
  assert.ok(texts.some(t => /^PA /.test(t)), 'the pressure altitude is shown for the cross-check');
  assert.ok(av.xpdrIdent < 18, 'IDENT counts down as the PFD redraws');
});

test('MFD pages: ENGINE / SYSTEM / NRST render, the totalizer counts down, per-cylinder bars take over when provided', () => {
  const texts = [];
  const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { if (k === 'fillText') texts.push(String(a[0])); if (k === 'fillText') return; }), set: (t, k, v) => { assert.ok(!(typeof v === 'number' && Number.isNaN(v))); t[k] = v; return true; } });
  const av = A.createAvionics(), s = P.newState();
  const d = panel(s, av);
  d.traffic = [{ n: 4000, e: -30000, altFt: 2500, hdg: 90 }];
  for (const p of ['MAP', 'FPL', 'ENGINE', 'SYSTEM', 'NRST']) { av.mfdPage = p; A.drawMFD(g, 1100, 800, d); }
  assert.ok(texts.some(t => /ENGINE/.test(t)) && texts.some(t => /SYSTEM/.test(t)) && texts.some(t => /NEAREST/.test(t)), 'the new pages are real');
  // the totalizer: latch at the first reading, then count the burn
  av.mfdPage = 'SYSTEM'; d.o = { ...d.o, fuel: [20, 20], fuelFlow: 10 };
  A.drawMFD(g, 1100, 800, d); assert.equal(av._fuelInit, 40);
  d.o = { ...d.o, fuel: [18, 17.5] }; texts.length = 0; A.drawMFD(g, 1100, 800, d);
  assert.ok(texts.some(t => /4\.5/.test(t)), 'FUEL USED counts the burn');
  // per-cylinder data replaces the fallback rows
  av.mfdPage = 'ENGINE'; texts.length = 0;
  d.o = { ...d.o, cyl: [{ egt: [1350, 1380, 1400, 1390], cht: [380, 395, 410, 400] }] };
  A.drawMFD(g, 1100, 800, d);
  assert.ok(texts.some(t => /PEAK/.test(t)), 'the lean page shows its peak');
  assert.equal(av._egtPeak[0], 1400);
});

test('NRST: the list sorts by distance and ENT flies direct to the cursor point', () => {
  const av = A.createAvionics(), s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100);
  A.navSolve(av, P.ne(s), s.out, 6, P.LAB_RWY);           // (stashes the sorted order)
  const list = A.nrstList(av, P.ne(s), 6);
  assert.equal(list[0].id, 'LABRW', 'on the field, the airport is nearest');
  assert.ok(list.every((p, i) => i === 0 || list[i - 1].dis <= p.dis), 'sorted by distance');
  av.mfdPage = 'NRST'; A.control(av, 'NRST_SEL', 1);
  A.control(av, 'KEY_ENT');
  assert.equal(av.direct, list[1].id); assert.equal(av.mfdPage, 'MAP');
});

test('FPL editing: ENT enters the editor, insert/delete reshape the plan and the leg follows', () => {
  const av = A.createAvionics(), s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100);
  av.mfdPage = 'FPL';
  A.control(av, 'KEY_ENT'); assert.equal(av.fplEdit, true);
  const before = av.fpl.wps.length, cat = A.fplCatalog();
  av.fplPick = cat.indexOf('LABEC'); av.fplCursor = 1;
  A.control(av, 'FPL_INSERT');
  assert.equal(av.fpl.wps.length, before + 1); assert.equal(av.fpl.wps[1], 'LABEC');
  assert.equal(av.fpl.active, 2, 'the active leg still points at the same target');
  A.control(av, 'FPL_DEL');
  assert.equal(av.fpl.wps.length, before); assert.equal(av.fpl.active, 1);
  // the knob walks the edit cursor while editing, the leg otherwise
  A.control(av, 'FPL_NEXT', 1); assert.equal(av.fplCursor, 2);
  A.control(av, 'KEY_CLR'); assert.equal(av.fpl.wps.length, before - 1, 'CLR deletes while editing');
  const n = A.navSolve(av, P.ne(s), s.out, 6, P.LAB_RWY);
  assert.ok(n.dtk != null, 'the edited plan still solves');
});

test('PROC: the fictional ILS 36 loads, sequences its missed approach, and unloads', () => {
  const av = A.createAvionics();
  A.control(av, 'PROC');
  assert.equal(av.proc.name, 'ILS 36'); assert.equal(av.cdi, 'NAV1'); assert.equal(av.nav1.act, 109900);
  const R = P.LAB_RWY, [pn, pe] = P.rwyToNE(R, -4000, 0);   // 4 km out on the centre line, on the glide path
  const o = { altTrue: R.elevFt + (300 + 4000) * Math.tan(3 * Math.PI / 180) * 3.28084, gs: 70, trk: R.trueHdg, hdgTrue: R.trueHdg };
  const n = A.navSolve(av, { n: pn, e: pe }, o, P.MAGVAR_W, R);
  assert.equal(n.src, 'LOC1'); assert.ok(n.gsDots != null && Math.abs(n.gsDots) < 0.1, 'the loaded procedure flies the glide slope');
  A.control(av, 'PROC');
  assert.equal(av.proc.missed, true); assert.equal(av.direct, 'LABED'); assert.ok(av.altSel >= 3000);
  A.control(av, 'PROC'); assert.equal(av.proc, null);
});

test('PROC_RNAV: the fictional RNAV (GPS) RWY 36 loads with its minima, flies its LPV path, and sequences its missed approach', () => {
  const P36 = A.procedureById('RNAV36');
  assert.deepEqual([P36.fafDistNm, P36.fafAltFt, P36.daFt, P36.mdaFt, P36.missed.to, P36.missed.altFt], [5.0, 2000, 305, 505, 'LABED', 3000]);
  const av = A.createAvionics();
  A.control(av, 'PROC_RNAV');
  assert.equal(av.proc.name, 'RNAV (GPS) RWY 36'); assert.equal(av.cdi, 'GPS'); assert.equal(av.direct, 'LABRW');
  const R = P.LAB_RWY, [pn, pe] = P.rwyToNE(R, -4000, 0);
  const o = { altTrue: R.elevFt + (300 + 4000) * Math.tan(3 * Math.PI / 180) * 3.28084, gs: 70, trk: R.trueHdg, hdgTrue: R.trueHdg };
  const n = A.navSolve(av, { n: pn, e: pe }, o, P.MAGVAR_W, R);
  assert.equal(n.cdiScale, 0.3, 'the approach CDI scale');
  assert.ok(n.gsDots != null && Math.abs(n.gsDots) < 0.1, 'the LPV vertical path, centred on the 3° path');
  A.control(av, 'PROC_RNAV');
  assert.equal(av.proc.missed, true); assert.equal(av.direct, 'LABED'); assert.ok(av.altSel >= 3000);
  A.control(av, 'PROC_RNAV'); assert.equal(av.proc, null);
});

test('systems-model shapes: o.cyls bars render, the 0..1 fuel pressure reads as a ratio and only sagging raises the CAS', () => {
  const av = A.createAvionics(), s = P.newState();
  const texts = [];
  const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { if (k === 'fillText') texts.push(String(a[0])); }), set: (t, k, v) => { t[k] = v; return true; } });
  const d = panel(s, av);
  d.o = { ...d.o, cyls: [[{ egt: 1300, cht: 370 }, { egt: 1420, cht: 405 }, { egt: 1380, cht: 390 }, { egt: 1350, cht: 380 }]], fuelPress: 1 };
  av.mfdPage = 'ENGINE'; A.drawMFD(g, 1100, 800, d);
  assert.equal(av._egtPeak[0], 1420, 'the per-engine cylinder bars take over from o.cyls');
  assert.deepEqual(A.collectAlerts(av, { volts: 14, amps: 5, oilP: [70], fuel: [20, 20], fuelPress: 1 }, { eng: [{ run: true }] }), [], 'full pressure: no alert');
  assert.deepEqual(A.collectAlerts(av, { volts: 14, amps: 5, oilP: [70], fuel: [20, 20], fuelPress: 0.85 }, { eng: [{ run: true }] }).map(a => a.id), [], 'boost-pump-only pressure is not an alert');
  assert.deepEqual(A.collectAlerts(av, { volts: 14, amps: 5, oilP: [70], fuel: [20, 20], fuelPress: 0.3 }, { eng: [{ run: true }] }).map(a => a.id), ['LOW FUEL PRESSURE'], 'a sagging pressure is');
});
