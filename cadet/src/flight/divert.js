// CADET — flight/divert.js : the diversion to LABEF, as a CADET-side lesson type (next-wave item 3).
// FLIGHT LAB's shared syllabus is NOT touched by this: the diversion is a CADET lesson kind of its
// own (the branch the task allows, because wiring a landing at a second field through the shared
// syllabus would move both suites). It is a pure step machine the game (or a test bot) feeds with
// flight samples, in the shape of the day's other lessons:
//   enroute → decide → navigate → ctaf → final → landed → return → done
// The day it belongs to is a forecast-bust day (career.js's forecastBust: the TAF promised VFR and a
// front arrives half a day early): en route, the sky ahead closes in, and the scored decision is to
// divert to LABEF — the uncontrolled grass strip, runway 09 — while it is still near and the weather
// behind is still flyable. Continuing to LAB through the front, or pressing on and hoping, fails the
// decision row. The CTAF self-announce set (content/dialog/atc.js ctafRadio, rewritten for LABEF
// RWY 09) is run for real through dialog/atc.js's createAtc before the landing: the divert is not
// complete until every announcement has been made. The landing is scored from the strip's own
// geometry (flight/airfields.js STRIP_LABEF): on the grass, inside its length, near its centre line.
// Then the return leg: back to LAB and stopped there, and the cross-country variant is complete.
// Pure logic: no three.js, no DOM.
import { STRIP_LABEF } from './airfields.js';
import { ctafRadio, CTAF } from '../content/dialog/atc.js';
import { createAtc } from '../dialog/atc.js';

export const DIVERT_TO = 'LABEF';
// the cross-country variant this flow completes: the solo XC's lessons, with the LABEF landing and
// the CTAF announcements in the middle (career/day.js planFor takes it as { xcVariant: 'labef' })
export const XC_LABEF = { id: 'xc-labef', kind: 'xc', title: '単独の野外飛行（LABEF へのダイバート付き）', lessons: ['t1', 'n2', 't3'], divertTo: DIVERT_TO, ctaf: true, rwy: CTAF.rwy, freq: CTAF.freq };
export const DIVERT_WEATHER = 'forecastBust';

// position helpers on the local plane (metres north/east of the world origin, as FL.avionics uses)
const distM = (a, b) => Math.hypot(a.n - b.n, a.e - b.e);
// a sample's place in the strip's frame: along (0 at the strip's centre, + in the landing direction
// 090°) and cross (+ to the right of the landing direction)
export function stripFrame(pos) {
  const h = STRIP_LABEF.trueHdg * Math.PI / 180, dn = pos.n - STRIP_LABEF.n, de = pos.e - STRIP_LABEF.e;
  return { along: dn * Math.cos(h) + de * Math.sin(h), cross: -dn * Math.sin(h) + de * Math.cos(h) };
}
export const onStrip = (pos) => { const f = stripFrame(pos); return Math.abs(f.along) <= STRIP_LABEF.len / 2 && Math.abs(f.cross) <= STRIP_LABEF.wid / 2 + 12; };

// createDivert({ weatherKind, lab }) → the step machine.
//   weatherKind: the day's kind; the divert decision is only scored (and only right) on a
//     forecast-bust day — on any other day the flow refuses to start (a divert needs its reason).
//   lab: { n, e } of LAB (the return leg's target; FL.physics.LAB_RWY in the game).
// Feed it update(sample) with { n, e, altFt, onGround, gsKt } and answer the decision with
// decide('divert' | 'continue' | 'return'). The CTAF phase exposes .atc (createAtc over ctafRadio):
// the caller answers its exchanges (the game's radio panel, or a test's rightIndex loop); the flow
// advances when the sequence is done. summary() → the scored rows.
export function createDivert({ weatherKind = DIVERT_WEATHER, lab = { n: 0, e: -40000 }, seed = 11 } = {}) {
  const bust = weatherKind === DIVERT_WEATHER;
  const st = { phase: bust ? 'enroute' : 'refused', t: 0, decision: null, decisionT: null, td: null, landedAt: null, rows: [] };
  const atc = createAtc(ctafRadio(), { seed });
  let ctafStarted = false, ctafDone = false;
  const events = [];
  const emit = (e) => events.push(e);
  function enter(phase) { st.phase = phase; emit({ type: 'phase', to: phase }); if (phase === 'ctaf' && !ctafStarted) { ctafStarted = true; atc.start('ctaf'); } }
  function decide(what) {
    if (st.phase !== 'decide' || st.decision) return false;
    st.decision = what; st.decisionT = st.t;
    if (what === 'divert') enter('navigate');
    else { st.rows.push({ name: 'ダイバートの判断', val: what === 'continue' ? '前線へそのまま続行' : 'LAB へ引き返し', std: 'LABEF へダイバート', pass: false }); enter('failed'); }
    return true;
  }
  function update(dt, s = {}) {
    if (dt) st.t += dt;
    for (const e of atc.update(dt || 0)) { if (e.type === 'done' && e.seq === 'ctaf') ctafDone = true; emit({ ...e, type: 'radio', kind: e.type }); }
    // (the caller may drive the atc itself between updates — the radio panel answers it directly —
    // so completion is also read off the atc's own record, not only off its events)
    if (ctafStarted && !ctafDone && atc.summary().n >= 5) ctafDone = true;
    if (ctafDone && st.phase === 'ctaf') enter('final');
    if (st.phase === 'enroute' && st.t >= 30) enter('decide');   // (the decision point is time-based: it must fire even on a sample-less tick)
    if (!s || s.n == null) return events.splice(0);
    const dStrip = distM(s, STRIP_LABEF), dLab = distM(s, lab);
    switch (st.phase) {
      case 'enroute': if (st.t >= 30) enter('decide'); break;               // (half a minute out, the front is visibly ahead)
      case 'navigate': if (dStrip < 1852) enter('ctaf'); break;            // within 1 NM of the strip: start announcing
      case 'final': if (s.onGround && onStrip(s)) { st.td = stripFrame(s); st.landedAt = { ...s }; enter('landed'); } break;
      case 'landed': if (s.onGround === false) enter('return'); break;      // off again, homeward
      case 'return': if (s.onGround && dLab < 1500) enter('done'); break;   // stopped at (or beside) LAB
      default: break;
    }
    return events.splice(0);
  }
  function summary() {
    const rows = st.rows.slice();
    if (st.decision === 'divert') rows.unshift({ name: 'ダイバートの判断', val: `予報外れを認めて LABEF へ（${Math.round(st.decisionT)} 秒で判断）`, std: 'LABEF へダイバート', pass: true });
    else if (!rows.length && st.decision) rows.unshift({ name: 'ダイバートの判断', val: st.decision, std: 'LABEF へダイバート', pass: false });
    const r = atc.summary();
    rows.push({ name: 'CTAF 自家通報（LABEF・122.9）', val: ctafDone ? `${r.n} 件・初回正解 ${r.first}・誤答 ${r.wrong}` : '未完', std: '5 件すべて（10 マイル・ダウンウインド・ベース・ファイナル・クリア）', pass: ctafDone && r.n === 5 });
    if (st.td) rows.push({ name: 'LABEF への接地', val: `中心から ${st.td.along >= 0 ? '+' : ''}${Math.round(st.td.along)} m・センターライン ${Math.abs(st.td.cross).toFixed(1)} m`, std: `草地 ${STRIP_LABEF.len} m の中・センターライン ±12 m`, pass: Math.abs(st.td.along) <= STRIP_LABEF.len / 2 && Math.abs(st.td.cross) <= 12 });
    const passed = st.phase === 'done' && rows.every(x => x.pass);
    return { kind: 'divert', to: DIVERT_TO, rwy: CTAF.rwy, freq: CTAF.freq, phase: st.phase, decision: st.decision, rows, passed, done: st.phase === 'done' || st.phase === 'failed' };
  }
  return { st, atc, update, decide, summary, get phase() { return st.phase; }, get ctafDone() { return ctafDone; } };
}
