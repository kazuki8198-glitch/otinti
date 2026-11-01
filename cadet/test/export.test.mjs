// CADET — export & profile tests (game-quality wave, item 5): the logbook's CSV / GPX downloads and
// the debrief profile graphs' data. The formats are contracts with tools outside the game (a
// spreadsheet, a GPX track viewer), so they are pinned exactly: the CSV's columns, one row per
// sample; the GPX a well-formed XML document with one trackpoint per sample. The profile module is
// pure — series, touchdown windows and pixel geometry, no canvas needed to test it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRecorder, toCSV, toGPX } from '../src/flight/recorder.js';
import { analyzeRecording } from '../src/flight/analysis.js';
import { seriesOf, touchdownOf, scaleLine, panelGeometry } from '../src/flight/profile.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FLSRC = path.join(here, '../../flight-lab/src');
for (const m of ['physics.js', 'avionics.js', 'school.js']) vm.runInThisContext(fs.readFileSync(path.join(FLSRC, m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const P = globalThis.FL.physics;

// a small synthetic recording by hand (the exports must not depend on a flown lesson)
const mkRec = (n = 25, meta = {}) => ({
  meta,
  samples: Array.from({ length: n }, (_, i) => ({
    t: i * 0.5, n: 100 + i * 10, e: -40000 + i * 25, h: 16.8 + i * 2, q: [0, 0, 0, 1],
    ias: 60 + i, gs: 62 + i, vs: -300, alt: 55 + i * 6.56, pIn: 0.1, rIn: -0.05, rud: 0,
    thr: 0.4, gear: 1, flap: 25, onGround: i === 0, rpm: 2000, failed: false,
  })),
});

test('exports: the CSV has the pinned columns and one row per sample', () => {
  const csv = toCSV(mkRec(25));
  const lines = csv.trimEnd().split('\n');
  assert.equal(lines[0], 't_s,north_m,east_m,height_m,ias_kt,gs_kt,vs_fpm,alt_ft,pitch_in,roll_in,rudder,thr,gear,flap_deg,on_ground,rpm');
  assert.equal(lines.length, 26, 'header + 25 samples');
  const row = lines[1].split(',');
  assert.equal(row.length, 16);
  assert.equal(row[0], '0.0');
  assert.equal(row[4], '60.0', 'ias of the first sample');
  assert.equal(row[14], '1', 'on ground flag');
  assert.equal(lines[25].split(',')[0], '12.0', 'the last sample at t=12 s');
});

test('exports: the GPX is well-formed XML, one trackpoint per sample, times from the start', () => {
  const rec = mkRec(10, { title: '訓練 <テスト> & 飛行', startISO: '2026-11-01T00:00:00.000Z' });
  const gpx = toGPX(rec, ([n, e]) => [35 + n / 111320, 140 + e / 100000]);
  assert.match(gpx, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<gpx version="1\.1" creator="CADET"/);
  // well-formedness, checked structurally: every opened tag closes in order (a small stack parser —
  // not a full XML parser, but enough to catch the breakage a template edit would cause)
  const tags = [...gpx.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*")*?)(\/?)>/g)];
  const stack = [];
  for (const [, close, name, , selfClose] of tags) {
    if (selfClose) continue;
    if (close) assert.equal(stack.pop(), name, `closing ${name} in order`);
    else stack.push(name);
  }
  assert.deepEqual(stack, [], 'all tags closed');
  assert.equal((gpx.match(/<trkpt /g) || []).length, 10);
  assert.match(gpx, /<trkpt lat="35\.000898" lon="139\.600000"><ele>16\.8<\/ele><time>2026-11-01T00:00:00\.000Z<\/time><\/trkpt>/);
  assert.match(gpx, /訓練 &lt;テスト> &amp; 飛行/, 'the title is escaped (< and &; a raw > is legal XML content)');
  const bare = toGPX(mkRec(3), ([n, e]) => [35, 140]);
  assert.ok(!bare.includes('<time>'), 'no start kept, no times invented');
});

test('profile: the flight series thins evenly and keeps both ends', () => {
  const s = seriesOf(mkRec(1000), 100);
  assert.ok(s.t.length >= 99 && s.t.length <= 101, `${s.t.length} points`);
  assert.equal(s.t[0], 0);
  assert.equal(s.t[s.t.length - 1], s.dur);
  assert.equal(s.alt.length, s.t.length); assert.equal(s.ias.length, s.t.length);
  assert.equal(seriesOf({ samples: [] }), null);
  assert.equal(seriesOf(null), null);
});

test('profile: the touchdown window is the last landing, −30 s … +5 s, gate marked', () => {
  // fly a real landing with the physics so the analysis has a touchdown to find: a glidepath PD with
  // a two-stage flare (the same shape the syllabus' trainee flies), recorded as it goes
  const s = P.newState({ aircraft: 'pa28' });
  const R = P.LAB_RWY, [n, e] = P.rwyToNE(R, 300 - 2500, 0);
  P.placeInAir(s, n, e, R.elevFt + Math.tan(3 * Math.PI / 180) * 2500 * P.FT, R.trueHdg, 70, -3, 3, null);
  s.wind = { fromDeg: R.trueHdg + 10, kt: 5, gust: 0.5 };
  s.opts.autoRud = true;
  const rec = createRecorder(); rec.start({ title: 'test' });
  const clamp = P.clamp;
  P.step(s, 1 / 60);   // settle the outputs once before flying by them
  let guard = 0, flaring = false;
  while (guard++ < 60 * 240) {
    const o = s.out, c = { aglR: o.agl };
    const pos = P.ne(s), along = (pos.n - R.n) * Math.cos(R.trueHdg * Math.PI / 180) + (pos.e - R.e) * Math.sin(R.trueHdg * Math.PI / 180);
    const cross = -(pos.n - R.n) * Math.sin(R.trueHdg * Math.PI / 180) + (pos.e - R.e) * Math.cos(R.trueHdg * Math.PI / 180);
    const ias = o.ias, vs = o.vsi, gsK = o.gs, pitch = o.pitch, bank = o.bank, hdg = o.hdgTrue;
    const hdgT = 360 + clamp(-cross * 0.12, -12, 12);
    const bankT = clamp((((hdgT - hdg) % 360 + 540) % 360 - 180) * 1.2, -16, 16);
    let pitchT, thrT;
    if (c.aglR > 28 && !flaring) {
      const pathFt = Math.max(0, 300 - along) * 0.0524 * 3.28084;
      pitchT = -1 - clamp((c.aglR - pathFt) * 0.05, -5, 3) + clamp((-gsK * 5.31 - vs) * 0.006, -3, 3);
      thrT = clamp(0.30 + (70 - ias) * 0.06, 0, 0.8);
    } else {
      flaring = true;
      pitchT = c.aglR > 13 ? 4.5 : Math.min(9.5, 4.5 + (13 - c.aglR) * 0.55);
      if (vs > -60 && c.aglR > 6) pitchT = Math.min(pitchT, 1.5);
      thrT = c.aglR > 28 ? 0.3 : 0;
    }
    if (s.onGround) { pitchT = 0; thrT = 0; s.brake = Math.min(1, (s.brake || 0) + 2 / 60); if (gsK < 3) break; }
    s.ovr = { elev: clamp((pitchT - pitch) * 0.16, -0.6, 0.6), ail: clamp((bankT - bank) * 0.06, -0.5, 0.5), rud: 0 };
    s.thr += clamp(thrT - s.thr, -0.012, 0.012);
    P.step(s, 1 / 60);
    rec.push(s, s.t);
  }
  const done = rec.done();
  const a = analyzeRecording(done, { vref: 70 });
  assert.ok(a && a.landings.length >= 1, 'a landing was analysed');
  const td = touchdownOf(done, a);
  assert.ok(td, 'a touchdown profile exists');
  assert.ok(td.dt[0] >= -30 && td.dt[td.dt.length - 1] <= 5.01, `window ${td.dt[0]} … ${td.dt[td.dt.length - 1]}`);
  assert.ok(td.dt.includes(0), 'the touchdown itself is in the window');
  const aglAtTd = td.agl[td.dt.indexOf(0)];
  assert.ok(aglAtTd >= 0 && aglAtTd <= 6, `AGL at the touchdown sample is the wheel height, not the airframe's (${aglAtTd} ft)`);
  assert.equal(td.sinkFpm, a.landings[a.landings.length - 1].sinkFpm);
});

test('profile: geometry stays inside the box, flat series included', () => {
  const g = panelGeometry([0, 50, 100, 50], [10, 10, 10, 10], 200, 80);
  for (const line of [g.a, g.b]) for (const [x, y] of line.pts) assert.ok(x >= 0 && x <= 200 && y >= 0 && y <= 80, `(${x}, ${y}) in the box`);
  assert.equal(g.a.pts[2][1], 4, 'the peak touches the top padding');
  const single = scaleLine([7], 100, 40);
  assert.equal(single.pts.length, 1);
  assert.deepEqual(scaleLine([], 100, 40).pts, []);
});
