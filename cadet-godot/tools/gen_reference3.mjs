// CADET Godot port — Phase 2b JS 参照値ジェネレータ (school / syllabus / controls)
// 移植元 (898fe8a): flight-lab/src/{physics,avionics,school,syllabus}.js と
// cadet/src/flight/controls.js を Node で FL グローバルに組み立て、単純な規則ベースの
// スクリプトパイロット (test/run_tests2b.gd 側と同一ロジック) で a1 / t1 / t2 / t3 を
// 駆動し、ステップ遷移・スコア・合否・履歴を test/reference2b.json に書き出す。
// 併せて controls の駆動・アクション、記録/進捗の整形、ガイド文・ATC・チェックリストの
// 文字列も参照値化する。
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)); // Phase 3 generator (base: 2b harness)
const LAB = path.join(here, '..', '..', 'cadet-wt-next', 'flight-lab', 'src');
const CAD = path.join(here, '..', '..', 'cadet-wt-next', 'cadet', 'src');
for (const n of ['physics.js', 'avionics.js', 'school.js', 'syllabus.js'])
  vm.runInThisContext(fs.readFileSync(path.join(LAB, n), 'utf8'), { filename: n });
const FL = globalThis.FL;
const P = FL.physics, SC = FL.school, SY = FL.syllabus;
const CT = await import(pathToFileURL(path.join(CAD, 'flight', 'controls.js')).href);

// ---------------------------------------------------------------- the scripted pilot
// (規則ベース: 目標姿勢・出力へのフィードバックのみ。GDScript 側と一字一句同じ規則)
function makePilot() {
  const clamp = P.clamp;
  const w180 = a => ((a % 360) + 540) % 360 - 180;
  const st = { pBase: null, iThr: 0, lastIas: null, lastStep: -1, flare: false, p0: 0, base: null };
  function reset() { st.pBase = null; st.iThr = 0; st.lastIas = null; st.flare = false; st.base = null; }
  function pitchTo(s, deg) { s.keyHold = true; s.pTgt = clamp(deg, -20, 22); s.pRate = 0; }
  function bankTo(s, bankT) { const o = s.out, p = -s.w[2] / (Math.PI / 180); s.rIn = clamp(0.045 * (bankT - o.bank) - 0.012 * p, -1, 1); }
  function headTo(s, c, hdgT, maxBank = 25) { bankTo(s, clamp(w180(hdgT - c.hdg) * 1.5, -maxBank, maxBank)); }
  function speedThr(s, c, kt, dt) { const e = kt - c.kias; st.iThr = clamp(st.iThr + e * 0.004 * dt, -0.4, 0.4); s.thr = clamp(s.thr + (e * 0.02 + st.iThr * 0.5) * dt * 2, 0, 1); }
  function speedPitch(s, c, kt, dt) {
    const dv = st.lastIas == null ? 0 : (c.kias - st.lastIas) / dt;
    if (st.pBase == null) st.pBase = c.pitch;
    st.pBase = clamp(st.pBase + (c.kias - kt) * 0.05 * dt, -15, 18);
    pitchTo(s, st.pBase + 0.35 * (c.kias - kt) + 1.5 * dv);
  }
  function vsPitch(s, c, vsT, dt) {
    if (st.pBase == null) st.pBase = c.pitch;
    st.pBase = clamp(st.pBase + (vsT - c.vs) * 0.0012 * dt, -10, 15);
    pitchTo(s, st.pBase + (vsT - c.vs) * 0.004);
  }
  const altVs = (c, alt) => clamp((alt - c.alt) * 3, -700, 700);
  function fly(L, dt) {
    const s = L.s, c = L.last, S = L.def.steps[L.step];
    if (!S || L.done) return;
    if (L.step !== st.lastStep) { st.lastStep = L.step; reset(); }
    if (S.checklist && L.check) {
      if (S.checklist.includes('landing')) { s.flapIdx = Math.max(s.flapIdx, 3); if (!s.A.gear.fixed) s.gearDown = true; s.mix = 1; s.fuelSel = s.fuel[1] > s.fuel[0] ? 'R' : 'L'; }
      if (S.checklist.includes('takeoff')) { s.flapIdx = 0; s.trim = 0; s.thr = 0; s.fuelSel = s.fuel[1] > s.fuel[0] ? 'R' : 'L'; }
      SC.checklistNext(L); return;
    }
    if (S.atc && L.atc) { SC.answerAtc(L, L.atc.ok); return; }
    s.opts.autoRud = true;
    const g = (S.g && typeof S.g === 'object') ? S.g : {};
    const name = S.name || '';
    const tv = k => { const sp = S.tgt && S.tgt[k]; return sp ? (typeof sp[0] === 'function' ? sp[0](L, c) : sp[0]) : null; };
    if (name.includes('接地')) {
      if (c.onGround) { s.thr = 0; s.brake = c.gsK < 60; s.opts.autoRud = false; s.rud = clamp(-0.06 * w180(c.hdg - 360) - 0.02 * c.cross, -1, 1); st.lastIas = c.kias; return; }
      const crab = w180(c.hdg - c.trk);
      headTo(s, c, 360 - clamp(c.cross * 0.5, -8, 8) - clamp(c.latV * 2, -6, 6) + (c.aglR > 12 ? crab : 0), 8);
      if (c.aglR < 16 || st.flare) {
        if (!st.flare) { st.flare = true; st.p0 = c.pitch; }
        s.thr = 0; pitchTo(s, clamp(st.p0 + (16 - c.aglR) / 16 * 8 + clamp((-c.vs - 150) * 0.01, 0, 3), -2, 8));
      } else {
        const vsT = -(c.gsK * 5.3) - clamp((c.gp - 3) * 250, -300, 300);
        vsPitch(s, c, vsT, dt); speedThr(s, c, g.kt || L.V.appr - 2, dt);
      }
      st.lastIas = c.kias; return;
    }
    if (c.onGround && (name.includes('離陸') || name.includes('ローテーション') || name.includes('滑走'))) {
      s.brake = false; s.thr = 1; s.opts.autoRud = false;
      s.rud = clamp(-0.06 * w180(c.hdg - 360) - 0.02 * c.cross, -1, 1);
      s.pIn = c.kias > L.V.rotate - 1 ? 0.65 : 0; s.rIn = 0; st.lastIas = c.kias; return;
    }
    if (g.flaps != null && s.flapIdx !== g.flaps) s.flapIdx = g.flaps;
    const how = g.how || 'level';
    const altT = tv('alt') != null ? tv('alt') : L.alt0;
    let hdgT = tv('hdg') != null ? tv('hdg') : L.hdg0;
    if (S.tgt && S.tgt.rhdg) hdgT = 360;
    if (S.tgt && S.tgt.dwhdg) hdgT = 180;
    if (how === 'climbFull') { s.thr = 1; speedPitch(s, c, g.kt, dt); headTo(s, c, (S.tgt && S.tgt.rhdg) ? 360 : hdgT); }
    else if (how === 'turn') { const dir = name.includes('左') ? -1 : 1; speedThr(s, c, g.kt, dt); vsPitch(s, c, altVs(c, altT), dt); bankTo(s, dir * ((S.tgt && S.tgt.abank) ? S.tgt.abank[0] : (g.bank || 30))); }
    else if (how === 'rate') {
      if (st.base == null) { st.base = clamp(P.steadyState(s, g.kt, g.fpm || 0, { altFt: c.alt }).thr, 0, 1); s.thr = st.base; }
      vsPitch(s, c, g.fpm || 0, dt);
      const e = g.kt - c.kias; st.iThr = clamp(st.iThr + e * 0.004 * dt, -0.3, 0.3); s.thr = clamp(st.base + e * 0.02 + st.iThr, 0, 1);
      headTo(s, c, hdgT);
    }
    else if (how === 'approach' || how === 'ils' || how === 'pattern') {
      const vsT = how === 'ils' ? -(c.gsK * 5.3) + clamp(c.gsd * 2.5, -2, 2) * 200 : how === 'pattern' ? (g.fpm || -500) : -(c.gsK * 5.3) - clamp((c.gp - 3) * 250, -300, 300);
      vsPitch(s, c, vsT, dt); speedThr(s, c, g.kt, dt);
      let h = hdgT;
      if (name.includes('ベース')) h = Math.abs(c.cross) > 400 ? 90 : 360 - clamp(c.cross * 0.3, -25, 25);
      else if (how === 'approach') h = 360 - clamp(c.cross * 0.12, -30, 30) + (c.gsK > 30 ? w180(c.hdg - c.trk) : 0);
      headTo(s, c, h, 20);
    }
    else if (how === 'slow') {
      speedPitch(s, c, g.kt, dt);
      const e = altT - c.alt; st.iThr = clamp(st.iThr + e * 0.0004 * dt, -0.3, 0.3); s.thr = clamp(0.55 + e * 0.004 + st.iThr, 0, 1);
      headTo(s, c, hdgT, 10);
    }
    else if (how === 'glide' || g.pwr === 'dead') { s.thr = 0; speedPitch(s, c, g.kt, dt); headTo(s, c, hdgT); }
    else { speedThr(s, c, g.kt || 100, dt); vsPitch(s, c, altVs(c, altT), dt); headTo(s, c, hdgT); }
    st.lastIas = c.kias;
  }
  return { fly };
}

function runLesson(id, levelId, maxSec) {
  const dt = 1 / 120, pilot = makePilot();
  const L = SC.startLesson(id, levelId);
  const start = {
    alt0: L.alt0, hdg0: L.hdg0, windStr: L.windStr, guideText: L.guideText, sayText: L.sayText, keysText: L.keysText,
    av: { baro: L.av.baro, hdgBug: L.av.hdgBug, altSel: L.av.altSel, cdi: L.av.cdi, crs: L.av.crs },
    ctx: { alt: L.last.alt, altTrue: L.last.altTrue, aglR: L.last.aglR, kias: L.last.kias, hdg: L.last.hdg, along: L.last.along, cross: L.last.cross, thr: L.last.thr, flaps: L.last.flaps },
    guides: L.def.steps.map(S => ({ name: S.name, guide: SC.stepGuide(S, L), say: S.say ? SC.fillText(S.say, L) : null, keys: S.keys ? SC.fillText(S.keys, L) : null })),
  };
  const trans = [];
  let lastStep = -99, n = 0;
  for (let i = 0; i < maxSec * 120 && !L.done; i++) {
    if (L.step !== lastStep) { lastStep = L.step; trans.push({ at: Math.round(L.t * 1000) / 1000, step: L.step, name: (L.def.steps[L.step] || {}).name || '' }); }
    pilot.fly(L, dt);
    P.step(L.s, dt);
    SC.update(L, dt);
    n++;
  }
  return {
    start, transitions: trans, stepsEntered: lastStep + 1, updates: n,
    final: { done: L.done, passed: L.passed, grade: L.grade, score: L.score, passPct: L.passPct, t: Math.round(L.t * 1000) / 1000, results: L.results, histAlt: L.hist.alt, histIas: L.hist.ias, landings: L.landings || 0 },
    L,
  };
}


// ================================================================ Phase 3 additions
// (a) structural serialization of EVERY lesson + function probes with shared
//     synthetic contexts, (b) full flights of a subset with the 2b pilot,
// (c) the n2 estimate helpers.
const R = {};

// ---- shared probe contexts (also written into the reference so the GDScript
// side applies byte-identical inputs). ctx fields are deltas over a lesson's
// own start ctx; st presets are merged over { t }.
R.variants = [
  {},
  { aglR: 30, alt: -500, vs: -600 },
  { kias: 40, stall: true, vs: -200 },
  { onGround: true, gsK: 0, kias: 0, thr: 0 },
  { onGround: true, gsK: 50, kias: 55, thr: 1 },
  { aglR: 300, along: -100, cross: 10, gsK: 65 },
  { kias: 130, vs: 300, bank: 20 },
  { aglR: 1200, along: 500, cross: -60, hdg: 90, dmeV: 0.2, loc: 0.2, gs: -0.2, cdi: 0.2 },
];
R.stPresets = [
  { t: 10, turned: 50 },
  { t: 35, turned: 100, td: { fpm: 180, along: 350, cross: 3, kias: 68, noseFirst: false, onRunway: true, bounces: 0, latV: 0.5, crab: 2 }, stopAlong: 900, min: 2800, start: 3000, a0: 290, pwr: 1.5, propT: 2.5, idle: 1, cut: 1, cap: true, capV: true, flap: true, rpm0: 2500, man0: 20, rpmSet: 2200, manSet: 21, kSet: 0.93, dev: 12, h0: 90, maxDev: 55, kind: 1, stallT: 0, lastKias: 60 },
];

const clean = (v) => {
  if (v === undefined) return null;
  if (typeof v === 'function') return '<fn>';
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = clean(v[k]); return o; }
  if (typeof v === 'number' && !Number.isFinite(v)) return String(v);
  return v;
};
const stSnapshot = (st) => { const o = {}; for (const k of Object.keys(st).sort()) if (k !== 'stats') o[k] = clean(st[k]); return o; };
const lSnapshot = (L) => ({
  fail: clean(L.fail), avFail: clean(L.av.fail || null), eng: L.s.eng.map(e => ({ failed: !!e.failed, feather: !!e.feather, thr: e.thr ?? null })),
  gearDown: !!L.s.gearDown, prop: L.s.prop ?? null, alt0: L.alt0, hdg0: L.hdg0,
  vmcAt: L.vmcAt ?? null, cfiDev: L.cfiDev ?? null, cfiKind: L.cfiKind ?? null, ovr: !!L.s.ovr, estimate: clean(L.estimate || null),
});

function serializeTgt(tgt, L) {
  if (!tgt) return null;
  const o = {};
  for (const k of Object.keys(tgt).sort()) {
    const sp = tgt[k];
    if (Array.isArray(sp)) o[k] = sp.map((x, i) => i === 0 && typeof x === 'function' ? clean(x(L)) : clean(x));
    else o[k] = clean(sp);
  }
  return o;
}

function probeLesson(id) {
  const out = { steps: [] };
  const def = SY.STAGES.flatMap(s => s.lessons).find(l => l.id === id);
  out.nSteps = def.steps ? def.steps.length : 0;
  if (!def.steps) return out;
  def.steps.forEach((S, si) => {
    const L = SC.startLesson(id, 'basic');
    const so = {
      name: S.name || null, keys: S.keys || null, g: clean(S.g || null), dur: S.dur ?? null, hold: S.hold ?? null, max: S.max ?? null,
      grade: !!S.grade, gradeFinal: !!S.gradeFinal, checklist: S.checklist || null, estimate: S.estimate || null,
      fail: S.fail || null, upset: S.upset || null, hoodOff: !!S.hoodOff, propTo: S.propTo ?? null, stopOnFail: S.stopOnFail || null,
      field: S.field ? { n: S.field.n, e: S.field.e, hdg: S.field.hdg } : null,
      atc: typeof S.atc === 'string' ? S.atc : (typeof S.atc === 'function' ? clean(S.atc(L)) : null),
      tgt: serializeTgt(S.tgt, L),
      guide: SC.stepGuide(S, L), say: S.say ? SC.fillText(S.say, L) : null,
      probes: [],
    };
    for (let vi = 0; vi < R.variants.length; vi++) {
      for (let pi = 0; pi < R.stPresets.length; pi++) {
        const Lp = SC.startLesson(id, 'basic');
        const c = JSON.parse(JSON.stringify(Lp.last));
        Object.assign(c, R.variants[vi]);
        Lp.last = c;
        const st = JSON.parse(JSON.stringify(R.stPresets[pi]));
        st.stats = {};
        const pr = { v: vi, p: pi };
        try { if (S.onStart) { S.onStart(Lp, c, st); pr.onStart = { st: stSnapshot(st), L: lSnapshot(Lp) }; } } catch (e) { pr.onStart = 'ERR:' + e.message; }
        try { pr.until = S.until ? !!S.until(c, Lp, st) : null; } catch (e) { pr.until = 'ERR:' + e.message; }
        try { pr.gradeWhen = S.gradeWhen ? !!S.gradeWhen(c, Lp, st) : null; } catch (e) { pr.gradeWhen = 'ERR:' + e.message; }
        try { if (S.check) { S.check(c, Lp, st); pr.afterCheck = stSnapshot(st); } } catch (e) { pr.afterCheck = 'ERR:' + e.message; }
        try { pr.result = S.result ? clean(S.result(Lp, st)) : null; } catch (e) { pr.result = 'ERR:' + e.message; }
        try { if (S.onEnd) { S.onEnd(Lp, c, st); pr.onEnd = { st: stSnapshot(st), L: lSnapshot(Lp) }; } } catch (e) { pr.onEnd = 'ERR:' + e.message; }
        so.probes.push(pr);
      }
    }
    out.steps.push(so);
  });
  return out;
}

R.probes = {};
for (const st of SY.STAGES) for (const l of st.lessons) { R.probes[l.id] = probeLesson(l.id); console.log('probe', l.id, R.probes[l.id].nSteps); }

// ---- estimate helpers on a started n2
{
  const L = SC.startLesson('n2', 'basic');
  const out = { truth0: SY.estimateTruth(L) };
  out.rowsNoEst = SY.estimateRows(L);
  SY.submitEstimate(L, { hdg: '120', dist: '8.5', eteMin: '5' });
  out.est = clean(L.estimate); out.rows = SY.estimateRows(L);
  const L2 = SC.startLesson('n2', 'basic');
  SY.submitEstimate(L2, { hdg: '', dist: 'x', eteMin: null });
  out.estBad = clean(L2.estimate); out.rowsBad = SY.estimateRows(L2);
  R.estimate = out;
}

// ---- full flights (subset) with the shared pilot
R.lessons = {};
for (const [key, id, lv, max] of [['a2', 'a2', 'intro', 300], ['e1', 'e1', 'intro', 300], ['x3', 'x3', 'intro', 400], ['a7', 'a7', 'intro', 400]]) {
  const r = runLesson(id, lv, max);
  const { L, ...rest } = r;
  R.lessons[key] = rest;
  console.log(key, 'done=', r.final.done, 'passed=', r.final.passed, 'grade=', r.final.grade, 'score=', +r.final.score.toFixed(3), 't=', r.final.t, 'steps=', r.stepsEntered);
}
fs.writeFileSync(path.join(here, '..', 'test', 'reference3.json'), JSON.stringify(R));
console.log('reference3.json written');
