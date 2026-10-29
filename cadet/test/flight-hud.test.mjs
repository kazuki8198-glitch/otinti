// CADET — flight HUD tests (node --test): what the HUD shows, without a page (the DOM is checked in a browser).
//  - the key chips are FLIGHT LAB's: parseKeys gives what ui.js parseKeys gives for every step of every lesson;
//  - the debrief's advice is FLIGHT LAB's: pages.js advice (cut out of the file) beside the port on many sets of failed
//    rows;
//  - the gauges and the progress line read genuine status() objects (a1 through the bridge: FLIGHT LAB's bot, and the
//    realtime path the game feeds the HUD from, hands off): the needle, the bands, the arrow, the time left, the hold
//    and its bar, no red before the graded window opens, red when the hold drops back to 0 inside it;
//  - the debrief card for a pass (S), a fail (C, the nose held up), a stopped lesson, a lesson that ended in a crash
//    and a free flight that did: the grade, the words, the counts, the advice;
//  - the big G1000's canvas: 640 logical wide, the height kept between 376 and 544; FLIGHT LAB's own PFD and MFD drawn
//    on it say nothing of teaching material or of what is not modelled (the disclaimers stay).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeBot } from './helpers/bot.mjs';
import { createFlight } from '../src/flight/flight.js';
import { parseKeys, gaugeOf, progressOf, advice, adviceTips, debriefOf, fitCanvas, panelText, LW } from '../src/ui/flight-hud.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FLSRC = path.join(here, '../../flight-lab/src');
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'ui.js']) vm.runInThisContext(fs.readFileSync(path.join(FLSRC, m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL, SC = FL.school;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// a1 at basic flown by FLIGHT LAB's bot through the bridge, stopped when stop(L) says so (or at the end)
function flyA1(stop = () => false, hook) {
  const f = createFlight(FL, { store: null }), bot = makeBot(FL);
  f.startLesson('a1', 'basic', { sens: 'low', autoRud: false });
  for (let n = 0; n < 900 * 4 && !f.L.done && !stop(f.L); n++) f.runScripted(bot.fly, 0.25, hook);
  return f;
}
// the same in real time (frame at 60 fps, no keys held: the keyboard's pitch hold flies it), each(L) before a frame
function flyRT(stop, each) {
  const f = createFlight(FL, { store: null }), K = { has: () => false };
  f.startLesson('a1', 'basic');
  for (let n = 0; n < 300 * 60 && !f.L.done && !stop(f.L); n++) { if (each) each(f.L); f.frame(1 / 60, K); }
  return f;
}
const noseUp = (L) => { if (L.step === 1 && L.st.t < 15) L.s.pTgt = 5; };

test('key chips: parseKeys is ui.js parseKeys for every step of every lesson', () => {
  let n = 0;
  for (const id of SC.lessonOrder()) {
    const def = SC.lesson(id);
    for (const S of def.steps || []) if (typeof S.keys === 'string') { assert.deepEqual(parseKeys(S.keys), FL.ui.parseKeys(S.keys), `${id} ${S.name}`); n++; }
  }
  assert.ok(n > 60, `${n} key texts`);
  // a1 step 1 at basic (filled in by the school): five chips, the keys and the words
  const f = flyA1(L => L.step === 1), st = f.status();
  assert.deepEqual(parseKeys(st.keysText).map(p => p.keys.join('/') + '=' + p.what.replace(/（.*$/, '')), ['S=機首上げ', 'W=機首下げ', 'R=スロットル増', 'F=スロットル減', 'T=いまの速度でトリム']);
  assert.deepEqual(parseKeys('操作しない（観察）'), [{ keys: [], what: '操作しない（観察）' }]);
});

test('debrief advice: the port is pages.js advice on many sets of failed rows', () => {
  const PAGES = fs.readFileSync(path.join(FLSRC, 'pages.js'), 'utf8');
  const i = PAGES.indexOf('function advice(bad)'); assert.ok(i >= 0);
  let end = -1;
  for (let k = PAGES.indexOf('{', i), d = 0; k < PAGES.length; k++) { if (PAGES[k] === '{') d++; else if (PAGES[k] === '}' && --d === 0) { end = k + 1; break; } }
  const orig = vm.runInNewContext(`(${PAGES.slice(i, end)})`);
  const names = [...new Set([...Object.values(SC.TGT_LABEL).map(x => x[0]), ...Object.values(SC.TGT_LABEL).map(x => x[0] + '（終了時）'),
    '連続保持', '制限時間', '注意', '結果', '応答', 'チェックリスト', '接地時の横流れ', '停止距離', 'バウンド', '接地の降下率', '接地の速度', '浮揚速度',
    'フェザーした側', '失速からの回復', '高度損失', 'ロールアウト', '機首方向', '降下率', 'センターライン', '見積もり'])];
  const r = rng(7);
  for (let t = 0; t < 600; t++) {
    const bad = [];
    for (let k = Math.floor(r() * 6); k >= 0; k--) bad.push(['step', { name: names[Math.floor(r() * names.length)], pass: false }]);
    assert.equal(advice(bad), orig(bad), JSON.stringify(bad.map(b => b[1].name)));
    assert.ok(adviceTips(bad).length <= 3);
  }
});

test('gauges and progress from genuine status(): a1 step 0, step 1 before and inside the graded window, the end', () => {
  // step 0: no targets, the time left
  let f = flyA1(L => L.st.t > 4), st = f.status(), p = progressOf(st);
  assert.equal(st.step, 0); assert.equal(st.stats.length, 0);
  assert.equal(p.text, `残り ${Math.ceil(10 - st.stepT)} 秒`); assert.equal(p.frac, null); assert.equal(p.reset, false);
  // step 1, first seconds: the hold is not counting yet and that is not shown in red
  f = flyRT(L => L.step === 1 && L.st.t > 3); st = f.status(); p = progressOf(st);
  assert.equal(st.stats.length, 1); assert.equal(st.stats[0].key, 'alt');
  assert.equal(st.graded, false); assert.equal(p.pre, true); assert.equal(p.reset, false);
  assert.match(p.text, /^基準内を連続 0 \/ 20 秒$/); assert.match(p.note, /採点前/);
  // step 1, mid-hold: counting, the bar, the gauge inside the green band
  f = flyRT(L => L.step === 1 && L.st.holdT > 10); st = f.status(); p = progressOf(st);
  assert.equal(st.graded, true); assert.equal(p.reset, false); assert.equal(p.pre, false);
  assert.equal(p.text, `基準内を連続 ${Math.floor(st.holdT)} / 20 秒`); assert.equal(p.note, '（外れると 0 に戻る）');
  assert.ok(Math.abs(p.frac - st.holdT / 20) < 1e-12);
  const g = gaugeOf(st.stats[0]);
  assert.equal(g.cls, 'ok'); assert.equal(g.label, '高度 3,000 ft'); assert.equal(g.tip, '許容 ±100 ft');
  assert.ok(Math.abs(g.x - (50 + st.stats[0].d / 100 * 25)) < 1e-9);
  // the nose 5° up: out of tolerance, inside the graded window → red, the arrow says down
  f = flyRT(L => L.step === 1 && L.st.t > 12 && L.st.holdT === 0 && L.st.stats.alt.d > 100, noseUp); st = f.status(); p = progressOf(st);
  assert.equal(p.reset, true);
  const h = gaugeOf(st.stats[0]);
  assert.equal(h.cls, 'ng'); assert.match(h.dev, /^\+\d+ ▼$/); assert.equal(h.x, Math.min(98, 50 + st.stats[0].d / 100 * 25));
  assert.match(st.hint, /^高度が \d+ ft 高い/);
  // the end
  f = flyA1(); st = f.status();
  assert.equal(progressOf(st).text, '課目終了');
  // the gauge's own rules (FLIGHT LAB app.js): bands at 0.6 and 1 of the tolerance, the needle clamped, no arrow on a heading
  assert.equal(gaugeOf({ key: 'alt', label: '高度', unit: 'ft', tv: 3000, d: 60, tol: 100 }).cls, 'ok');
  assert.equal(gaugeOf({ key: 'alt', label: '高度', unit: 'ft', tv: 3000, d: -61, tol: 100 }).cls, 'warn');
  assert.equal(gaugeOf({ key: 'alt', label: '高度', unit: 'ft', tv: 3000, d: -150, tol: 100 }).dev, '−150 ▲');
  assert.equal(gaugeOf({ key: 'alt', label: '高度', unit: 'ft', tv: 3000, d: -900, tol: 100 }).x, 2);
  const hd = gaugeOf({ key: 'hdg', label: '針路', unit: '°', tv: 90, d: 25, tol: 10 });
  assert.equal(hd.label, '針路'); assert.equal(hd.dev, '+25'); assert.equal(hd.cls, 'ng');
  assert.equal(gaugeOf({ key: 'spd', label: '速度', unit: 'kt', tv: 100, d: -0.4, tol: 10 }).dev, '0');
});

test('the debrief card: pass S, fail C, stopped, a lesson and a free flight that crashed', () => {
  const pass = debriefOf(flyA1().status());
  assert.deepEqual([pass.grade, pass.status, pass.cls, pass.okN, pass.rowsN, pass.stepsDone, pass.stepsN, pass.time, pass.tips.length, pass.tipNone],
    ['S', '合格', 'ok g-s', 2, 2, 2, 2, '0:38', 0, '']);
  assert.equal(pass.title, '姿勢・出力・トリム（基礎）');
  const c = flyA1(() => false, noseUp).status(), fail = debriefOf(c);
  assert.equal(c.score.toFixed(6), '0.653529');                                 // (the scripted pilot on the game's model: test/flight.test.mjs REF)
  assert.deepEqual([fail.grade, fail.status, fail.cls, fail.okN, fail.rowsN, fail.stepsDone, fail.bad], ['C', '不合格', 'ng', 1, 2, 2, '高度']);
  assert.equal(fail.tips.length, 1); assert.match(fail.tips[0], /^高度：/);
  assert.match(fail.sub, /次に意識すること/);
  // stopped: the reason, no advice for the stop itself
  const f = flyA1(L => L.st.t > 5); f.abort('中止');
  const ab = debriefOf(f.status());
  assert.deepEqual([ab.grade, ab.status, ab.cls, ab.sub, ab.okN, ab.rowsN, ab.stepsDone, ab.tips.length, ab.tipNone, ab.bad], ['―', '中止', 'ng', '理由：中止', 0, 1, 0, 0, '', '']);
  // a free flight has no grade: how it ended and for how long
  const fr = createFlight(FL, { store: null }); fr.startFree('area');
  for (let i = 0; i < 180; i++) fr.frame(1 / 60, { has: () => false });
  fr.crash('地上の障害物に接触しました');
  const fd = debriefOf(fr.status());
  assert.deepEqual([fd.free, fd.grade, fd.status, fd.cls, fd.sub, fd.time, fd.results.length], [true, '―', '損傷', 'ng', '理由：地上の障害物に接触しました', '0:03', 0]);
  // a lesson that ends in a crash (a1, the nose down at idle into the ground): damaged, not "stopped"; no advice for it
  const cr = flyRT(() => false, (L) => { L.s.pTgt = -20; L.s.thr = 0; }), cs = cr.status(), cd = debriefOf(cs);
  assert.equal(cs.crashed, true); assert.ok(cs.reason.length > 0);
  assert.deepEqual([cd.free, cd.grade, cd.status, cd.cls, cd.sub, cd.tips.length, cd.tipNone, cd.bad], [false, '―', '損傷', 'ng', `理由：${cs.reason}`, 0, '', '']);
});

test('the big G1000: 640 logical wide, the height between 376 and 544, the backing store at the device pixel ratio', () => {
  const cv = { width: 0, height: 0, g: null, getContext() { return (this.g ||= { m: null, setTransform(...a) { this.m = a; } }); } };
  let r = fitCanvas(cv, { width: 600, height: 375 }, 2);
  assert.deepEqual([cv.width, cv.height, r.W, r.H], [1200, 750, LW, 400]);
  assert.deepEqual(cv.g.m, [1200 / 640, 0, 0, 750 / 400, 0, 0]);
  r = fitCanvas(cv, { width: 600, height: 200 }); assert.equal(r.H, 376);
  r = fitCanvas(cv, { width: 600, height: 900 }); assert.equal(r.H, 544);
});

test('the big G1000 in the aircraft: FLIGHT LAB\'s PFD and MFD drawn through fitCanvas say nothing of 教材 or 未実装', () => {
  // a canvas whose context records the text drawn (every other call does nothing)
  const texts = [], noop = () => {};
  const base = { fillText: (s) => texts.push(String(s)), measureText: (s) => ({ width: String(s).length * 6 }), createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }) };
  const g = new Proxy(base, { get: (t, k) => (k in t ? t[k] : typeof k === 'string' ? noop : undefined), set: (t, k, v) => { t[k] = v; return true; } });
  const cv = { width: 0, height: 0, getContext: () => g };
  const f = flyA1(L => L.step === 1 && L.st.t > 3), s = f.s, P = FL.physics, AV = FL.avionics;
  const d = { o: { ...s.out, onGround: s.onGround }, av: f.av, nav: AV.navSolve(f.av, P.ne(s), s.out, P.MAGVAR_W, P.LAB_RWY), varW: P.MAGVAR_W, qnh: s.qnh,
    eng: s.eng.map(e => ({ run: e.run, rpm: e.rpm, feather: e.feather })), V: s.A.v, fuelCap: s.A.fuelCap, pos: P.ne(s) };
  const draw = (fn) => { const a = fitCanvas(cv, { width: 640, height: 400 }); fn(a.g, a.W, a.H, d); };
  draw(AV.drawPFD); draw(AV.drawMFD); f.av.mfdPage = 'FPL'; draw(AV.drawMFD);
  assert.ok(texts.length > 100, `${texts.length} texts`);
  const meta = texts.filter(t => /教材|未実装|シミュレータ/.test(t));
  assert.deepEqual(meta, []);
  assert.ok(texts.some(t => /^G1000型 · NOT FOR NAVIGATION$/.test(t)) && texts.some(t => /架空訓練点 · NOT FOR NAVIGATION/.test(t)), 'the disclaimers stay');
  assert.ok(texts.includes('STBY 予備') && texts.includes('ACTIVE FLIGHT PLAN'));
  // without the context: the same rewriting, a text without those words is the same string
  assert.equal(panelText('飛行計画は教材用の架空訓練点です。実際の飛行計画には使えません。'), '飛行計画は架空の訓練点です。実際の飛行計画には使えません。');
  assert.equal(panelText('— = 未実装（架空値は出しません）'), '');
  const plain = 'HDG 090°'; assert.equal(panelText(plain), plain); assert.equal(panelText(42), 42);
});
