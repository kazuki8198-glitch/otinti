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

test('MFD engine strip: unimplemented engine values are shown as "—", not as made-up normal values', () => {
  const texts = [];
  const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { if (k === 'fillText') texts.push(String(a[0])); }), set: (t, k, v) => { t[k] = v; return true; } });
  const av = A.createAvionics(), s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100);
  A.drawMFD(g, 640, 420, panel(s, av));
  for (const lab of ['OIL PSI', 'OIL °F', 'EGT °F']) { const i = texts.indexOf(lab); assert.ok(i >= 0, lab); assert.equal(texts[i + 1], '—', `${lab} shows —`); }
  assert.ok(texts.some(t => /未実装/.test(t)));
  assert.ok(texts.some(t => /NOT FOR NAVIGATION/.test(t)));
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
