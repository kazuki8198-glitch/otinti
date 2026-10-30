// FLIGHT LAB — build, flight model, school, record and textbook tests (node --test).
// The scripted test pilot (bot.mjs) flies the lessons with the same inputs a keyboard pilot has.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, CORE } from './load.mjs';
import { makeBot, runLesson } from './bot.mjs';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, MODELS, MAX_BYTES } from '../build.mjs';
const FL = load(...CORE, 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js', 'quiz.js', 'radio.js', 'ui.js');
const P = FL.physics, A = FL.avionics, SC = FL.school, SY = FL.syllabus, SF = FL.sanford, BK = FL.book, QZ = FL.quiz;
const DT = 1 / 120, clamp = P.clamp;
const run = (s, sec, fn) => { for (let i = 0; i < sec * 120; i++) { if (fn) fn(s); P.step(s, DT); } return s; };
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), get length() { return m.size; }, key: i => [...m.keys()][i], dump: () => [...m.values()].join('\n') }; };
const flightLessons = () => SC.lessonOrder().map(id => SC.lesson(id)).filter(l => l.steps);
// hands for the physics tests: the pitch hold (as W / S leave it) flown to a speed, the wings held level (A / D)
const hands = (s, kt, bank = 0) => { if (s.base == null) s.base = s.out.pitch; const e = s.out.ias - kt; s.base = clamp(s.base + e * 0.05 * DT, -15, 18); s.keyHold = true; s.pRate = 0; s.pTgt = clamp(s.base + 0.35 * e, -15, 18); s.rIn = clamp(0.045 * (bank - s.out.bank) - 0.012 * (-s.w[2] / P.DEG), -1, 1); };

// ------------------------------------------------------------------ the built single file
// Built on first use, by the build tests only: they need esbuild and ../cadet (npm ci); without them those four fail
// with build()'s message, and the flight, school, book, quiz and radio tests below still run.
// text: the page without its base64 payloads (CADET's textures and models, the Draco WebAssembly, the basic course's
// photos): random letters can spell anything, so the placeholder and key checks read the rest
const ASSETS_RE = /globalThis\.CADET_ASSETS = (\{[^}]*\});/;
let built_ = null;
const built = () => {
  if (!built_) {
    const B = build({ quiet: true }), html = B.html;
    const assets = JSON.parse((ASSETS_RE.exec(html) || [, '{}'])[1]);
    const text = html.replace(ASSETS_RE, 'globalThis.CADET_ASSETS = {};').replace(/FL\.DRACO_WASM_B64 = "[A-Za-z0-9+/=]*"/, 'FL.DRACO_WASM_B64 = ""').replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g, 'data:image/webp;base64,');
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    built_ = { B, html, assets, text, scripts };
  }
  return built_;
};

test('build: one HTML file, no external scripts or stylesheets, everything inline; the only remote host is Google\'s tile host', () => {
  const { html } = built();
  assert.doesNotMatch(html, /<script[^>]*\bsrc\s*=/i, 'no <script src>');
  assert.doesNotMatch(html, /<link[^>]*rel=["']?stylesheet/i, 'no external stylesheet');
  assert.doesNotMatch(html, /import\s*\(\s*['"]https?:/, 'no remote import()');
  assert.doesNotMatch(html, /importScripts\s*\(/, 'no importScripts from the network');
  assert.ok((html.match(/<script>/g) || []).length >= 15, 'inline scripts');
  assert.match(html, /FL\.DRACO_WASM_B64 = "AGFzbQ/, 'the Draco WebAssembly is embedded (base64 of \\0asm)');
  const fetchHosts = [...html.matchAll(/fetch\(\s*['"`](https?:\/\/[^/'"`]+)/g)].map(m => m[1]);
  assert.ok(fetchHosts.every(h => h === 'https://tile.googleapis.com'), JSON.stringify(fetchHosts));
});

test('build: no placeholders, no template markers, no API keys', () => {
  const { html, text, assets } = built();
  assert.ok(text.length < html.length / 3 && Object.keys(assets).length > 0, 'the base64 payloads were found and set aside');
  for (const re of [/\bTODO\b/, /\bFIXME\b/, /\bTBD\b/, /lorem ipsum/i, /PLACEHOLDER/, /<!--BUILD:/, /\{\{\s*\w+\s*\}\}/, /XXX/]) assert.doesNotMatch(text, re, String(re));
  assert.doesNotMatch(text, /sk-ant-api/); assert.doesNotMatch(text, /AIza[0-9A-Za-z_-]{30,}/);
});

test('build: the three.js view — one bundle, one three.js, CADET\'s 12 textures and 4 aircraft models, the licences, under the size limit', () => {
  const { B, html, assets, scripts } = built();
  // every inline script parses (the escaping of "</script" and "<!--" kept them valid)
  for (const sc of scripts) new vm.Script(sc);
  // the bundle: a classic script after acmesh.js and before scene.js / app.js, defining FL.view3d (and nothing at load)
  const at = k => html.indexOf(k);
  const b = at('/* ---- the three.js view (src3d');
  assert.ok(b > 0 && at('/* ---- acmesh.js ---- */') < b && b < at('/* ---- scene.js ---- */') && at('/* ---- scene.js ---- */') < at('/* ---- google3d.js ---- */') && at('/* ---- pages.js ---- */') < at('/* ---- app.js ---- */'), 'script order');
  assert.ok(at('/* ---- CADET\'s assets') > 0 && at('/* ---- CADET\'s assets') < at('/* ---- physics.js ---- */'), 'the assets before the modules');
  const bundle = scripts.find(sc => sc.includes('/* ---- the three.js view (src3d'));
  assert.match(bundle, /\.view3d\s*=/, 'FL.view3d defined');
  // loading it only defines FL.view3d: run here with no DOM at all, it needs none
  const box = vm.createContext({ console, FL: {} });
  vm.runInContext(bundle, box);
  const V = box.FL.view3d;
  assert.deepEqual(Object.keys(box.FL), ['view3d']);
  assert.equal(typeof V.createScene, 'function'); assert.equal(typeof V.probe, 'function');
  assert.deepEqual([...V.ORDER], ['low', 'medium', 'high', 'ultra']); assert.ok(V.ORDER.every(k => V.PRESETS[k]));
  assert.equal(V.guessPreset('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))'), 'low');
  assert.equal(V.probe().webgl2, false, 'no canvas here: probe() says so instead of throwing');
  // exactly one three.js (the bundle's own check, and one copy of the core in the text)
  assert.deepEqual(B.three.roots, ['node_modules/three']);
  assert.equal((html.match(/Multiple instances of Three\.js being imported/g) || []).length, 1, 'one copy of three.core');
  // CADET's assets in CADET's own format: the textures as data URLs, the models as bare base64 GLB
  const tex = Object.keys(assets).filter(k => k.startsWith('tex/')), models = Object.keys(assets).filter(k => k.startsWith('model/'));
  assert.deepEqual(tex.sort(), ['asphalt_c', 'asphalt_n', 'asphalt_r', 'concrete2_c', 'concrete2_nr', 'concrete_c', 'concrete_n', 'concrete_r', 'grass_c', 'grass_nr', 'plaster_c', 'plaster_nr'].map(n => 'tex/' + n));
  for (const k of tex) assert.match(assets[k], /^data:image\/webp;base64,UklGR/, k);
  assert.deepEqual(models.sort(), MODELS.map(m => 'model/' + m).sort());
  for (const k of models) assert.equal(Buffer.from(assets[k].slice(0, 8), 'base64').toString('latin1', 0, 4), 'glTF', k);
  // three.js's licence: at the end of the file and for the About page; the assets' credits
  assert.match(html, /<!--\nthree\.js licence:\n[\s\S]*Copyright © 2010-\d{4} three\.js authors[\s\S]*-->\n<\/html>/);
  assert.match(html, /FL\.THREE_LICENSE = "The MIT License/);
  assert.match(html, /FL\.ASSET_CREDITS = "[^"]*ambientCG[^"]*CC0[^"]*Blender/);
  assert.ok(B.bytes < MAX_BYTES, `${(B.bytes / 1048576).toFixed(2)} MiB (limit ${MAX_BYTES / 1048576} MiB)`);
});

test('build: the displays, the instructor panel, the control strip and the required notices are on the page', () => {
  const { html } = built();
  for (const id of ['pfd', 'mfd', 'audio', 'view3d', 'sch-panel', 'ctl-strip', 'keyhelp', 'menu', 'school', 'debrief', 'page', 'ack', 'gattr']) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /本アプリは公開情報を基にした非公式の自主学習用教材です。実機訓練、教官の指示、POH\/AFM、SOP、航空法規を優先してください。/);
  assert.match(html, /G1000型配置と基本概念を学ぶ教材/); assert.match(html, /NOT FOR NAVIGATION/); assert.match(html, /模式図/); assert.match(html, /正式な飛行日誌ではありません/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]), seen = new Set(), dup = [];
  for (const i of ids) { if (seen.has(i)) dup.push(i); seen.add(i); }
  assert.deepEqual(dup, [], 'no duplicate element ids');
});

// ------------------------------------------------------------------ the basic course (kiso/: Japan's aviation law, a separate book)
// kiso/kiso-data.js is generated (never edited here): read in its own context, as the page reads it (window.FL.kiso),
// and copied into this one (plain data: the other context's arrays are not this one's for deepEqual)
const KISO_JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'kiso', 'kiso-data.js');
const KZ = (() => { const box = {}; box.window = box; vm.runInNewContext(fs.readFileSync(KISO_JS, 'utf8'), box, { filename: 'kiso-data.js' }); return JSON.parse(JSON.stringify(box.FL.kiso)); })();

test('build: the basic course (kiso/kiso-data.js) inline as it is, after the textbook and before the tests', () => {
  const { html } = built(), at = k => html.indexOf(k);
  assert.ok(at('/* ---- book-5.js ---- */') < at('/* ---- kiso/kiso-data.js ---- */') && at('/* ---- kiso/kiso-data.js ---- */') < at('/* ---- quiz.js ---- */'), 'script order');
  assert.ok(html.includes(fs.readFileSync(KISO_JS, 'utf8')), 'kiso-data.js unchanged in the page');
});

test('basic course: chapters 0–13, the counts its README gives, every figure and photo placed once with its caption and credit, apart from the textbook', () => {
  assert.deepEqual(KZ.chapters.map(c => c.no), [...Array(14).keys()]);
  assert.deepEqual(KZ.chapters.map(c => c.qa.length), [20, 24, 24, ...Array(11).fill(28)]);
  assert.equal(KZ.chapters.reduce((a, c) => a + c.glossary.length, 0), 555);
  const figs = KZ.chapters.flatMap(c => c.figures), photos = KZ.chapters.flatMap(c => c.photos), used = { fig: [], photo: [] };
  assert.equal(figs.length, 161); assert.equal(photos.length, 85);
  assert.deepEqual(Object.keys(KZ.figs).sort(), figs.map(f => f.id).sort()); assert.deepEqual(Object.keys(KZ.photos).sort(), photos.map(p => p.id).sort());
  const book = new Set(BK.CHAPTERS.flatMap(c => [c.id, ...c.secs.map(s => s.id)])), ids = new Set();
  for (const c of KZ.chapters) {
    assert.match(c.id, /^kiso\d\d$/); assert.ok(c.label && c.title && c.sections.length && c.sourcesHtml && c.photoCreditsHtml, c.id);
    for (const s of c.sections) {
      assert.ok(s.id.startsWith(c.id + '.') && !ids.has(s.id) && !book.has(s.id), s.id); ids.add(s.id); assert.ok(s.title && s.html, s.id);
      for (const m of s.html.matchAll(/<div class="kiso-(fig|photo)" data-\1="([^"]+)"><\/div>/g)) used[m[1]].push(m[2]);
    }
    for (const q of c.qa) assert.ok(Number.isInteger(q.n) && q.q && q.a, `${c.id} q${q.n}`);
    assert.ok(c.glossaryHeader.length >= 2 && c.glossary.every(r => r.length === c.glossaryHeader.length && r[0]), `${c.id} glossary`);
  }
  assert.deepEqual(used.fig.sort(), figs.map(f => f.id).sort(), 'every figure placed once');
  assert.deepEqual(used.photo.sort(), photos.map(p => p.id).sort(), 'every photo placed once');
  for (const f of figs) { assert.match(KZ.figs[f.id], /^<svg[\s\S]*<\/svg>$/, f.id); assert.ok(f.caption, f.id); }
  for (const p of photos) { assert.match(KZ.photos[p.id], /^data:image\/webp;base64,UklGR/, p.id); assert.ok(p.caption && p.w && p.h, p.id); assert.match(p.credit, /CC BY|CC0|パブリックドメイン|Attribution/, `${p.id} credit`); }
  // shown with innerHTML: only the tags its README names, no scripts, no handlers
  const all = KZ.chapters.flatMap(c => [...c.sections.map(s => s.html), ...c.qa.flatMap(q => [q.q, q.a]), ...c.glossaryHeader, ...c.glossary.flat(), c.sourcesHtml, c.photoCreditsHtml, ...c.figures.map(f => f.caption), ...c.photos.flatMap(p => [p.caption, p.credit])]).join('\n');
  assert.deepEqual([...new Set([...all.matchAll(/<([a-z0-9]+)/g)].map(m => m[1]))].filter(t => !['p', 'b', 'sub', 'sup', 'a', 'br', 'ul', 'li', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div'].includes(t)), []);
  for (const x of [all, ...Object.values(KZ.figs)]) assert.doesNotMatch(x, /<script|<style|<iframe|<foreignObject|\son[a-z]+\s*=|javascript:/i);
  assert.ok(BK.CHAPTERS.every(c => !/^kiso/.test(c.id)), 'the textbook has no basic-course chapter');
});

test('basic course progress: its own fields (kisoRead, kisoQa) through the sanitiser, the export and the merge, apart from the textbook\'s read', () => {
  const p = SC.sanitizeProgress({ read: ['aero.forces'], kisoRead: ['kiso05.11', 'kiso05.11', 'aero.forces', 'kiso<x>', 5], kisoQa: ['kiso05.q1', 'kiso' + 'x'.repeat(80)] });
  assert.deepEqual(p.read, ['aero.forces']); assert.deepEqual(p.kisoRead, ['kiso05.11']); assert.deepEqual(p.kisoQa, ['kiso05.q1']);
  assert.deepEqual([SC.sanitizeProgress({}).kisoRead, SC.sanitizeProgress({}).kisoQa], [[], []]);
  const j = SC.importJSON(SC.exportJSON([], p)); assert.deepEqual([j.progress.kisoRead, j.progress.kisoQa], [['kiso05.11'], ['kiso05.q1']]);
  const m = SC.mergeProgress(p, { kisoRead: ['kiso00.cover'], kisoQa: ['kiso05.q1', 'kiso00.q2'] });
  assert.deepEqual([m.read, m.kisoRead, m.kisoQa], [['aero.forces'], ['kiso05.11', 'kiso00.cover'], ['kiso05.q1', 'kiso00.q2']]);
  // the whole course fits: every section and every question
  const secs = KZ.chapters.flatMap(c => c.sections.map(s => s.id)), qa = KZ.chapters.flatMap(c => c.qa.map(q => `${c.id}.q${q.n}`));
  const all = SC.sanitizeProgress({ kisoRead: secs, kisoQa: qa });
  assert.deepEqual([all.kisoRead.length, all.kisoQa.length], [secs.length, 376]);
});

test('progress: a lesson keeps its best score (noteLesson, the sanitiser, the merge)', () => {
  // (the score is endLesson's 0..1, kept as a percent; an old save without one reads as 0)
  const prog = SC.sanitizeProgress({});
  SC.noteLesson(prog, { id: 'a1', done: true, passed: true, grade: 'A', score: 0.72, level: { id: 'basic' } });
  assert.equal(prog.lessons.a1.score, 72);
  SC.noteLesson(prog, { id: 'a1', done: true, passed: false, grade: 'C', score: 0.4, level: { id: 'basic' } });
  assert.equal(prog.lessons.a1.score, 72, 'a worse try does not lower the best score');
  SC.noteLesson(prog, { id: 'a1', done: true, passed: true, grade: 'S', score: 0.95, level: { id: 'basic' } });
  assert.equal(prog.lessons.a1.score, 95);
  assert.equal(SC.sanitizeProgress({ lessons: { a1: { tries: 1, best: 'A', pass: true } } }).lessons.a1.score, 0, 'no score in the save, none invented');
  assert.equal(SC.sanitizeProgress({ lessons: { a1: { score: 250 } } }).lessons.a1.score, 100, 'clamped to a percent');
  const m = SC.mergeProgress({ lessons: { a1: { tries: 1, best: 'A', pass: true, score: 60 } } }, { lessons: { a1: { tries: 2, best: 'B', pass: true, score: 88 } } });
  assert.equal(m.lessons.a1.score, 88, 'the merge keeps the larger score');
});

// ------------------------------------------------------------------ the flight model (Sorajima's, with the Archer and Seminole data)
test('physics: the Archer trimmed in level flight holds altitude and speed hands-off for a minute', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100), a0 = s.out.altTrue;
  run(s, 60);
  assert.ok(!s.crashed && Math.abs(s.out.altTrue - a0) < 100, `altitude ${s.out.altTrue.toFixed(0)} from ${a0.toFixed(0)}`);
  assert.ok(Math.abs(s.out.ias - 100) < 6, `ias ${s.out.ias}`);
  assert.ok(s.out.tas > s.out.ias, 'TAS > IAS at 3,000 ft');
});

test('physics: performance near the published training numbers (Archer Vy climb, cruise; Seminole climb and one engine at Vyse)', () => {
  const pa28 = P.newState({ aircraft: 'pa28' }), pa44 = P.newState({ aircraft: 'pa44' }), V = pa28.A.v, W = pa44.A.v;
  const climb = P.steadyState(pa28, V.y, null, { pwr: 'full', altFt: 100 });
  assert.ok(climb.fpm > 650 && climb.fpm < 900, `Archer Vy climb ${climb.fpm.toFixed(0)} fpm (teaching value ~700–800)`);
  const cruise = P.steadyState(pa28, V.cruise, 0, { altFt: 3000 });
  assert.ok(Math.abs(cruise.thr - V.cruiseThr) < 0.06 && cruise.rpm > 2250 && cruise.rpm < 2550, `cruise ${V.cruise} kt: thr ${cruise.thr.toFixed(2)} rpm ${cruise.rpm | 0}`);
  const both = P.steadyState(pa44, W.y, null, { pwr: 'full', altFt: 100 }), oei = P.steadyState(pa44, W.yse, null, { pwr: 'full', oei: true, altFt: 100 });
  assert.ok(both.fpm > 1000 && both.fpm < 1500, `Seminole both engines ${both.fpm.toFixed(0)} fpm`);
  assert.ok(oei.fpm > 180 && oei.fpm < 400, `Seminole one engine at Vyse ${oei.fpm.toFixed(0)} fpm`);
  assert.ok(oei.fpm < both.fpm * 0.3, 'one engine loses far more than half the climb (AFH: often 80 % or more)');
  // the dynamic model agrees with the estimate: full power at Vy with the pitch hold
  const s = P.placeInAir(P.newState(), 0, -40000, 2000, 354, V.y, 0, 0, 1), vs = [];
  s.opts.autoRud = true;
  run(s, 40, x => { hands(x, V.y); if (x.t > 15) vs.push(x.out.vsi); });
  const avg = vs.reduce((a, b) => a + b, 0) / vs.length, est = P.steadyState(s, V.y, null, { pwr: 'full', altFt: 2500 }).fpm;
  assert.ok(Math.abs(avg - est) < est * 0.3, `dynamic ${avg.toFixed(0)} fpm vs estimate ${est.toFixed(0)}`);
});

test('physics: rigged straight at cruise — hands and feet off for two minutes the wings stay within 5° (no roll input at all)', () => {
  for (const ac of ['pa28', 'pa44']) {
    const s = P.placeInAir(P.newState({ aircraft: ac }), 0, -40000, 3000, 354, P.newState({ aircraft: ac }).A.v.cruise);
    s.wind = { fromDeg: 0, kt: 0, gust: 0 }; s.keyHold = true; s.pTgt = P.attitude(s).pitch;
    let worst = 0; run(s, 120, x => { x.rIn = 0; worst = Math.max(worst, Math.abs(P.attitude(x).bank)); });
    assert.ok(worst < 5, `${ac}: bank reached ${worst.toFixed(1)}°`);
  }
});

test('physics: a side force on the fin rolls as well as yaws (the slipstream on the fin, the fin offset, the rudder) — no runaway left roll in a full-power climb', () => {
  const s0 = P.newState(); assert.ok(s0.AC.el.finYZ > 0.15 && s0.AC.el.finYZ < 0.4, `fin height / arm ${s0.AC.el.finYZ}`);
  const climb = (o) => {
    const s = P.placeInAir(P.newState(), 0, -40000, 2000, 354, s0.A.v.y, 4, 0, 1);
    s.wind = { fromDeg: 0, kt: 0, gust: 0 }; s.keyHold = true; s.pTgt = P.attitude(s).pitch; s.opts.autoRud = o.autoRud; s.rollHold = o.rollHold;
    const b = []; run(s, 60, (x) => { x.rIn = 0; if (Math.round(x.t * 120) % 1200 === 0) b.push(P.attitude(x).bank); });
    return b;
  };
  // the ball centred (auto rudder) and hands off: the torque and the rudder's roll still lean it left, but slowly (as in a real climb: a little right aileron)
  const free = climb({ autoRud: true, rollHold: false });
  assert.ok(free[1] < 0 && free[1] > -7, `after 10 s ${free[1].toFixed(1)}° (left, gentle)`);
  // the keyboard's bank hold (A / D released) keeps the wings level for the whole minute
  const held = climb({ autoRud: true, rollHold: true });
  assert.ok(held.every(x => Math.abs(x) < 3), `held: ${held.map(x => x.toFixed(1)).join(' ')}`);
  // and holds a 25° turn
  const t = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100); t.q = P.qFromHPB(354, P.attitude(t).pitch, 25);
  t.wind = { fromDeg: 0, kt: 0, gust: 0 }; t.keyHold = true; t.pTgt = P.attitude(t).pitch; t.opts.autoRud = true; t.rollHold = true;
  run(t, 30, x => { x.rIn = 0; }); assert.ok(Math.abs(P.attitude(t).bank - 25) < 3, `turn ${P.attitude(t).bank.toFixed(1)}°`);
});

test('physics: lateral stability — a dutch roll dies out, a 15° bank released with no rudder comes back toward level (dihedral)', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 110); s.wind = { fromDeg: 0, kt: 0, gust: 0 }; s.keyHold = true; s.pTgt = P.attitude(s).pitch;
  const beta = []; run(s, 12, x => { x.ovr = { elev: x.elev, ail: 0, rud: x.t < 0.5 ? 0.5 : 0 }; beta.push(Math.abs(x.out.beta)); });
  const early = Math.max(...beta.slice(0, 240)), late = Math.max(...beta.slice(-240));
  assert.ok(late < early * 0.2, `sideslip ${early.toFixed(1)}° → ${late.toFixed(2)}°`);
  const r = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100); r.wind = { fromDeg: 0, kt: 0, gust: 0 }; r.keyHold = true;
  r.q = P.qFromHPB(354, P.attitude(r).pitch, 15); r.pTgt = P.attitude(r).pitch;
  run(r, 40, x => { x.rIn = 0; }); assert.ok(Math.abs(P.attitude(r).bank) < 6, `bank after 40 s ${P.attitude(r).bank.toFixed(1)}°`);
});

test('physics: the stall warning sounds at a high angle of attack before the critical angle', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 70);
  s.thr = 0; s.ovr = { elev: 0.85, ail: 0, rud: 0 }; let warned = null;
  run(s, 25, x => { x.ovr.ail = clamp(-0.05 * x.out.bank, -1, 1); if (x.out.stallWarn && warned == null) warned = x.out.alpha; });
  assert.ok(warned != null, 'warned'); assert.ok(warned < s.out.aStall, `warned at ${warned.toFixed(1)}° < ${s.out.aStall.toFixed(1)}°`);
});

test('physics: an engine failure in the Archer gives a glide near the best-glide speed (ratio about 8–11)', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 76, 0, 0, 0);
  s.eng[0].failed = true; s.opts.autoRud = true; const vs = [], gs = [];
  run(s, 50, x => { hands(x, 76); if (x.t > 20) { vs.push(x.out.vsi); gs.push(x.out.gs); } });
  assert.ok(!P.engineRunning(s), 'the engine is stopped');
  const v = vs.reduce((a, b) => a + b, 0) / vs.length, g = gs.reduce((a, b) => a + b, 0) / gs.length, ratio = g * 101.3 / -v;
  assert.ok(Math.abs(s.out.ias - 76) < 8, `ias ${s.out.ias.toFixed(0)}`); assert.ok(ratio > 7 && ratio < 12, `glide ratio ${ratio.toFixed(1)} (${v.toFixed(0)} fpm)`);
});

test('physics: Seminole one engine out — the rudder needed grows as the speed falls and reaches full rudder at the red line (Vmc 56 kt, 5° bank)', () => {
  const hold = kias => {
    const s = P.newState({ aircraft: 'pa44' }); P.placeInAir(s, 0, -40000, 1000, 354, kias + 10, 0, 0, 1);
    s.gearDown = false; s.gearPos = 0; s.eng[0].failed = true; s.thr = 1; s.ovr = { elev: 0, ail: 0, rud: 0 };
    let eI = 0, pT = s.out.pitch, drift = 0, rud = 0;
    for (let i = 0; i < 120 * 40 && !s.crashed; i++) {
      const o = s.out, tgt = i < 120 * 15 ? kias + 10 - 10 * i / (120 * 15) : kias;
      pT = clamp(pT + (o.ias - tgt) * 0.5 / 120, -10, 30); eI = clamp(eI + (pT - o.pitch) * 0.02 / 12, -1, 1);
      s.ovr.elev = clamp(0.06 * (pT - o.pitch) - 0.03 * s.w[0] / P.DEG + eI, -1, 1);
      s.ovr.ail = clamp(0.06 * (5 - o.bank) + 0.02 * s.w[2] / P.DEG, -1, 1);
      s.ovr.rud = clamp(-0.25 * P.wrap180(o.hdgTrue - 354) + 0.5 * s.w[1] / P.DEG + (s.rudNeed || 0), -1, 1);
      P.step(s, DT);
      if (i > 120 * 15) { drift = Math.max(drift, Math.abs(P.wrap180(s.out.hdgTrue - 354))); rud = Math.max(rud, Math.abs(s.ovr.rud)); }
    }
    return { drift, rud };
  };
  const h70 = hold(70), h62 = hold(62), h56 = hold(56);
  assert.ok(h70.drift < 10 && h70.rud < 0.75, `70 kt: heading held with ${h70.rud.toFixed(2)} rudder`);
  assert.ok(h62.rud > h70.rud + 0.08, `62 kt: more rudder ${h62.rud.toFixed(2)}`);
  assert.ok(h56.rud > 0.97, `56 kt: full rudder ${h56.rud.toFixed(2)} — no margin left (the red line)`);
});

test('physics: Vmc at the certification bank (2.5°) — the rudder saturates at the 56 kt red line, not before or after', () => {
  // the audit's measurement, as a standing check: left engine failed, right at full power, only 2.5° of bank
  // into the live engine (the least help the rules allow credit for), slowed in steps; the speed where the
  // heading hold's rudder demand saturates and the heading goes is the model's Vmc
  const hold = kias => {
    const s = P.newState({ aircraft: 'pa44' }); P.placeInAir(s, 0, -40000, 1000, 354, kias + 10, 0, 0, 1);
    s.gearDown = false; s.gearPos = 0; s.eng[0].failed = true; s.thr = 1; s.ovr = { elev: 0, ail: 0, rud: 0 };
    let eI = 0, pT = s.out.pitch, drift = 0, rudSum = 0, n = 0;
    for (let i = 0; i < 120 * 40 && !s.crashed; i++) {
      const o = s.out, tgt = i < 120 * 15 ? kias + 10 - 10 * i / (120 * 15) : kias;
      pT = clamp(pT + (o.ias - tgt) * 0.5 / 120, -10, 30); eI = clamp(eI + (pT - o.pitch) * 0.02 / 12, -1, 1);
      s.ovr.elev = clamp(0.06 * (pT - o.pitch) - 0.03 * s.w[0] / P.DEG + eI, -1, 1);
      s.ovr.ail = clamp(0.06 * (2.5 - o.bank) + 0.02 * s.w[2] / P.DEG, -1, 1);
      s.ovr.rud = clamp(-0.25 * P.wrap180(o.hdgTrue - 354) + 0.5 * s.w[1] / P.DEG + (s.rudNeed || 0), -1, 1);
      P.step(s, DT);
      if (i > 120 * 30) { drift = Math.max(drift, Math.abs(P.wrap180(s.out.hdgTrue - 354))); rudSum += Math.abs(s.ovr.rud); n++; }
    }
    return { drift, rud: rudSum / n };
  };
  const h66 = hold(66), h58 = hold(58), h52 = hold(52);
  assert.ok(h66.drift < 10 && h66.rud < 0.85, `66 kt: held with ${h66.rud.toFixed(2)} rudder — margin above the line`);
  assert.ok(h58.rud > 0.88 && h58.drift < 10, `58 kt: nearly out of rudder (${h58.rud.toFixed(2)}) but still held`);
  assert.ok(h52.rud > 0.97 && h52.drift > 10, `52 kt: rudder saturated (${h52.rud.toFixed(2)}), heading lost by ${h52.drift.toFixed(0)}° — saturation falls between 58 and 52 kt, i.e. at the 56 kt red line ±6`);
});

test('physics: feathering the dead engine\'s propeller reduces drag (better climb or less descent at Vyse)', () => {
  const fly = feather => { const s = P.newState({ aircraft: 'pa44' }); P.placeInAir(s, 0, -40000, 4000, 354, 88, 0, 0, 1); s.gearDown = false; s.gearPos = 0; s.eng[0].failed = true; s.eng[0].feather = feather; s.opts.autoRud = true; const vs = [];
    run(s, 40, x => { hands(x, 88, s.eng[0].failed ? 3 : 0); if (x.t > 20) vs.push(x.out.vsi); }); return vs.reduce((a, b) => a + b, 0) / vs.length; };
  const f = fly(true), w = fly(false);
  assert.ok(f > w + 100, `feathered ${f.toFixed(0)} fpm vs windmilling ${w.toFixed(0)} fpm`);
});

test('physics: the engine systems — a fresh engine is in the running configuration, and the instruments read it', () => {
  const s = P.newState({}); P.placeOnRunway(s); run(s, 1);
  assert.ok(P.engineRunning(s), 'running from the start, as the lessons begin');
  assert.equal(s.eng[0].mag, 'BOTH'); assert.equal(s.eng[0].mix, 1); assert.equal(s.eng[0].sel, 'L'); assert.equal(s.eng[0].on, true);
  assert.equal(s.out.mag, 'BOTH'); assert.equal(s.out.mix, 1); assert.equal(s.out.fuelSel, 'L');
  assert.deepEqual(s.out.mags, ['BOTH']); assert.deepEqual(s.out.mixs, [1]); assert.deepEqual(s.out.fuelSels, ['L']);
  assert.equal(s.out.cranking, false);
  const t = P.newState({ aircraft: 'pa44' }); P.placeOnRunway(t); run(t, 1);
  assert.deepEqual(t.out.fuelSels, ['L', 'R'], 'the twin: each engine on its own tank');
  assert.ok(P.engineRunning(t));
});

test('physics: the magnetos — OFF stops the engine (and says so), BOTH alone does not restart it, START cranks and catches, one magneto still runs it', () => {
  const s = P.newState({}); P.placeOnRunway(s); run(s, 1);
  s.eng[0].mag = 'OFF'; run(s, 0.5);
  assert.ok(!P.engineRunning(s) && s.dead, 'magnetos OFF: stopped');
  assert.ok(s.events.some(e => e.type === 'engine_stop' && e.why === 'マグネトー OFF'), 'the stop is told as the magnetos');
  s.eng[0].mag = 'BOTH'; run(s, 2);
  assert.ok(!P.engineRunning(s), 'back to BOTH is not a start: it has to be cranked');
  s.eng[0].mag = 'START'; run(s, 0.5);
  assert.ok(!P.engineRunning(s) && s.out.cranking, 'cranking, not yet caught');
  run(s, 1.5);
  assert.ok(P.engineRunning(s), 'caught at START');
  s.eng[0].mag = 'L'; run(s, 1); assert.ok(P.engineRunning(s), 'the left magneto alone runs it');
  s.eng[0].mag = 'R'; run(s, 1); assert.ok(P.engineRunning(s), 'the right magneto alone runs it');
});

test('physics: the mixture — idle cut-off stops it (in the air too), a lean mixture will not catch, full rich will', () => {
  const s = P.newState({}); P.placeInAir(s, 0, -40000, 4000, 354, 100); run(s, 2);
  assert.ok(P.engineRunning(s));
  s.eng[0].mix = 0; run(s, 0.5);
  assert.ok(!P.engineRunning(s) && s.dead, 'mixture at idle cut-off: stopped in flight');
  assert.ok(s.events.some(e => e.type === 'engine_stop' && e.why === 'ミクスチャー カットオフ'), 'the stop is told as the mixture');
  s.eng[0].mag = 'START'; run(s, 3);
  assert.ok(!P.engineRunning(s), 'no catch at cut-off, however long it cranks');
  s.eng[0].mix = 0.4; run(s, 3);
  assert.ok(!P.engineRunning(s), 'no catch leaned out (a start needs it rich)');
  s.eng[0].mix = 1; run(s, 0.5);
  assert.ok(!P.engineRunning(s) && s.out.cranking, 'rich again: cranking');
  run(s, 1.5);
  assert.ok(P.engineRunning(s), 'caught rich');
});

test('physics: the fuel selector — OFF stops the engine only after the fuel in the lines, an empty selected tank starves it, the other tank restarts it, and each tank burns only its own engine\'s share', () => {
  const s = P.newState({}); P.placeOnRunway(s); run(s, 1);
  s.eng[0].sel = 'OFF'; run(s, 3);
  assert.ok(P.engineRunning(s), 'still running on the fuel in the lines');
  run(s, 5);
  assert.ok(!P.engineRunning(s), 'starved once the lines are used');
  assert.ok(s.events.some(e => e.type === 'engine_stop' && e.why === '燃料セレクター OFF'), 'the stop is told as the selector');
  s.eng[0].sel = 'R'; s.eng[0].mag = 'START'; run(s, 2.5);
  assert.ok(P.engineRunning(s), 'cranked back on the other tank');
  // the burn comes out of the selected tank only
  const b = P.newState({}); P.placeInAir(b, 0, -40000, 4000, 354, 110, 0, 0, 0.79); const f0 = b.fuel[0], f1 = b.fuel[1];
  run(b, 60, x => hands(x, 110));
  assert.ok(b.fuel[0] < f0 - 0.05, `the left tank burned (${f0} → ${b.fuel[0]})`);
  assert.equal(b.fuel[1], f1, 'the right tank untouched on the left selector');
  b.eng[0].sel = 'R'; const g0 = b.fuel[0], g1 = b.fuel[1]; run(b, 60, x => hands(x, 110));
  assert.ok(b.fuel[1] < g1 - 0.05, 'and the right tank burns once it is selected');
  assert.equal(b.fuel[0], g0, 'the left tank untouched on the right selector');
  // an empty selected tank starves the engine although the other is full
  const c = P.newState({}); P.placeOnRunway(c); c.fuel[0] = 0; run(c, 3);
  assert.ok(P.engineRunning(c), 'the lines again');
  run(c, 5);
  assert.ok(!P.engineRunning(c) && c.fuel[1] > 0, 'starved on the empty tank with fuel in the other');
});

// ------------------------------------------------------------------ the school (Sorajima's instructor engine)
test('syllabus: the lessons follow the published course order, each says what, why, how (keys) and the standard', () => {
  const L = flightLessons();
  assert.ok(L.length >= 30, `${L.length} flight lessons`);
  assert.deepEqual(SY.STAGES.map(s => s.phase).slice(0, 6), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);   // (next-wave item 6: a seventh stage, the complex/CFI endorsement, rides on the p6 phase)
  for (const l of L) {
    assert.ok(l.title && l.goal && l.why && l.std && Array.isArray(l.brief) && l.brief.length >= 1, `${l.id} brief`);
    assert.ok(['pa28', 'pa44', 'pa28r'].includes(l.aircraft), `${l.id} aircraft`);
    assert.ok(l.steps.length >= 1 && l.steps.every(S => S.say || S.checklist || S.atc || S.name), `${l.id} steps`);
    assert.ok(l.steps.some(S => S.keys), `${l.id}: at least one step says which keys to use`);
    for (const b of l.book || []) assert.ok(BK.findSection(b), `${l.id} book ${b}`);
  }
  assert.ok(L.filter(l => l.aircraft === 'pa44').length >= 5, 'Seminole lessons');
});

test('school: every flight lesson starts at all three levels and runs without NaN', () => {
  for (const l of flightLessons()) for (const lv of SC.LEVELS) {
    const L = SC.startLesson(l.id, lv.id);
    for (let i = 0; i < 120 * 3 && !L.done; i++) { P.step(L.s, DT); SC.update(L, DT); }
    const c = L.last;
    for (const k of ['alt', 'kias', 'hdg', 'vs', 'pitch', 'bank']) assert.ok(Number.isFinite(c[k]), `${l.id} ${lv.id} ${k}=${c[k]}`);
    assert.ok(!L.done || L.def.steps.length === 0, `${l.id} ${lv.id} ended at once: ${L.reason}`);
    assert.ok(L.sayText || L.atc || L.check, `${l.id} the instructor says something`);
  }
});

test('levels: 導入 widens the tolerances and halves the hold, 精度 narrows them and hides the hints', () => {
  const [a, b, c] = SC.LEVELS;
  assert.deepEqual([a.name, b.name, c.name], ['導入', '基礎', '精度']);
  assert.ok(a.k > b.k && b.k > c.k && b.k === 1); assert.ok(a.holdK < b.holdK && b.holdK < c.holdK);
  assert.ok(a.hints && b.hints && !c.hints);
});

test('continuous hold: the timer counts only while every target is inside, and resets to zero when one goes out', () => {
  const L = SC.startLesson('a2', 'basic'), bot = makeBot(FL);
  while (!L.def.steps[L.step].hold) { bot.fly(L, DT); P.step(L.s, DT); SC.update(L, DT); }
  for (let i = 0; i < 120 * 60 && L.st.holdT < 4; i++) { bot.fly(L, DT); P.step(L.s, DT); SC.update(L, DT); }
  const before = L.st.holdT; assert.ok(before > 3, `held ${before.toFixed(1)} s`);
  L.s.pos[1] += 400 / P.FT; P.derive(L.s);                                 // 400 ft too high: out of ±100
  P.step(L.s, DT); SC.update(L, DT);
  assert.equal(L.st.holdT, 0, 'reset when out'); assert.ok(L.st.holdBest >= before - 0.1, 'the best hold is remembered');
});

test('grading: ≥ 85 % of the time inside and the largest deviation within 1.6 × the tolerance; S / A / B / C', () => {
  const L = runLesson(FL, 'a2', 'basic', 400);
  assert.ok(L.done && L.passed, `a2 passed: ${JSON.stringify(L.results.flatMap(r => r.rows).filter(r => !r.pass))}`);
  assert.ok(['S', 'A', 'B'].includes(L.grade));
  const rows = L.results.flatMap(r => r.rows);
  assert.ok(rows.some(r => /連続保持/.test(r.name)), 'the continuous hold is graded');
  // a step flown badly fails: the same lesson with the throttle left at idle
  const bad = runLesson(FL, 'a2', 'basic', 400, Lx => { Lx.s.thr = 0; });
  assert.ok(bad.done && !bad.passed && bad.grade !== 'S', `idle: ${bad.grade}`);
});

test('the scripted pilot flies and passes the lessons a script can fly (Archer, Seminole, instruments, navigation)', () => {
  const fails = [];
  for (const id of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't1', 't3', 't4', 'e1', 'e2', 'e3', 'c1', 'x3', 'n1', 'n2', 'n3', 'i3', 'i4', 'i5', 'i6', 'i7', 'm1', 'm2', 'm3', 'm4']) {
    const L = runLesson(FL, id, 'basic', 1200);
    if (!(L.done && L.passed)) fails.push(`${id}: ${L.grade} ${L.reason} ${L.results.flatMap(r => r.rows).filter(r => !r.pass).map(r => r.name + ' ' + r.val).join(' / ')}`);
  }
  assert.deepEqual(fails, []);
});

test('checklists and ATC: an item that is not set is refused until it is set; a wrong read-back is graded as wrong', () => {
  const L = SC.startLesson('t1', 'basic');
  assert.ok(L.check, 't1 starts with the before-takeoff checklist');
  L.s.flapIdx = 2;                                                          // flaps not up
  let refused = null;
  for (let n = 0; n < 20 && L.check; n++) { const it = SC.checklistItem(L), r = SC.checklistNext(L); if (!r.ok) { refused = it[0]; L.s.flapIdx = 0; L.s.trim = 0; L.s.thr = 0; } }
  assert.equal(refused, 'フラップ'); assert.equal(L.check, null, 'the checklist is complete');
  P.step(L.s, DT); SC.update(L, DT);
  assert.ok(L.atc, 'then the read-back to the tower');
  const r = SC.answerAtc(L, (L.atc.ok + 1) % L.atc.opts.length);
  assert.equal(r.ok, false); assert.match(L.results.at(-1).rows[0].val, /誤り/);
  const I = SC.startLesson('i5', 'basic'); assert.ok(I.atc, 'the ILS starts with the approach clearance'); assert.equal(SC.answerAtc(I, I.atc.ok).ok, true);
});

test('diversion estimate (n2): within the tolerance passes, far off fails', () => {
  const L = SC.startLesson('n2', 'basic'), t = SY.estimateTruth(L);
  SY.submitEstimate(L, { hdg: t.brg + 5, dist: t.dist * 1.1, eteMin: t.eteMin * 0.9 });
  assert.ok(SY.estimateRows(L).every(r => r.pass), JSON.stringify(SY.estimateRows(L)));
  SY.submitEstimate(L, { hdg: t.brg + 60, dist: t.dist * 2, eteMin: '' });
  assert.ok(SY.estimateRows(L).some(r => !r.pass));
});

test('failures: the AHRS lesson fails the AHRS, the Seminole lessons fail an engine, and auto-rudder is off for one engine', () => {
  const i3 = runLesson(FL, 'i3', 'basic', 12);
  assert.equal(i3.av.fail.ahrs, true);
  const m2 = runLesson(FL, 'm2', 'basic', 60);
  assert.ok(m2.s.eng.some(e => e.failed), 'an engine failed'); assert.equal(m2.s.opts.autoRud, false, 'no automatic rudder with one engine');
});

// ------------------------------------------------------------------ the record (localStorage + JSON)
test('record: saved fields, the "not a logbook" note, and no key or token — even pasted into the memo', () => {
  const st = memStore(), KEY = ['AIza', 'FAKE', '-TEST-KEY-not-a-real-key-0123456789'].join('');   // built at run time: no key-like literal in the source
  const L = runLesson(FL, 'a1', 'intro', 200);
  const rec = SC.addRecord(st, SC.recordFromLesson(L, `メモ ${KEY} と token=abcdefghijklmnop`));
  for (const f of ['lessonId', 'datetime', 'level', 'aircraft', 'result', 'grade', 'passPct', 'steps', 'altHist', 'spdHist', 'events', 'memo', 'note']) assert.ok(f in rec, f);
  assert.match(rec.note, /正式な飛行日誌（logbook）ではなく/);
  assert.ok(!st.dump().includes(KEY) && !st.dump().includes('abcdefghijklmnop'), 'no key in storage');
  assert.ok(!SC.exportJSON(SC.loadRecords(st), {}).includes(KEY), 'no key in the export');
  assert.ok(!('flightHours' in rec) && !('pilotName' in rec) && !('email' in rec));
});

test('record import: unknown fields (an API key, map data) are dropped; malformed files are refused', () => {
  const evil = JSON.stringify({ app: 'FLIGHT LAB', kind: 'learning-record', records: [{ id: 'r1', lessonId: 'a4', level: 'basic', aircraft: 'pa28', datetime: '2026-01-02T03:04:05Z', result: 'pass', grade: 'A', apiKey: 'AI' + 'zaSECRETSECRETSECRETSECRET123', googleTiles: [1, 2, 3], altHist: [1, 'x', 3], memo: 'ok' }, { lessonId: 'nope' }], progress: { quiz: { q_aero: 90, 'bad key!': 5 }, read: ['aero.forces', 'x'.repeat(80)], atc: { luaw: true, 'bad key!': true } } });
  const j = SC.importJSON(evil);
  assert.equal(j.records.length, 1);
  const r = j.records[0]; assert.ok(!('apiKey' in r) && !('googleTiles' in r)); assert.deepEqual(r.altHist, [1, 3]);
  assert.ok(!JSON.stringify(j).includes('SECRET'));
  assert.deepEqual(j.progress.read, ['aero.forces']); assert.deepEqual(j.progress.quiz, { q_aero: 90 }); assert.deepEqual(Object.keys(j.progress.atc), ['luaw']);
  assert.throws(() => SC.importJSON('{"app":"other"}'), /学習記録ファイルではありません/);
  assert.throws(() => SC.importJSON('not json'), /JSON/);
});

test('works without Google: every lesson runs and its record is written with no Google module and no network', () => {
  assert.equal(FL.google3d, undefined, 'google3d.js not loaded here');
  const st = memStore();
  for (const l of flightLessons()) { const L = SC.startLesson(l.id, 'intro'); for (let i = 0; i < 120; i++) { P.step(L.s, DT); SC.update(L, DT); } SC.addRecord(st, SC.recordFromLesson(L, '')); }
  assert.equal(SC.loadRecords(st).length, flightLessons().length);
});

// ------------------------------------------------------------------ the textbook, the tests, Sanford
test('textbook: ≥ 16 chapters in the six parts, each with sections, English terms, examples, cautions, ≥ 2 questions with reasons and sources', () => {
  assert.ok(BK.CHAPTERS.length >= 16, `${BK.CHAPTERS.length} chapters`);
  assert.deepEqual([...new Set(BK.CHAPTERS.map(c => c.part))], ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  const ids = new Set();
  for (const c of BK.CHAPTERS) {
    assert.ok(c.t && c.en && c.summary && c.secs.length >= 2, `${c.id} text`);
    for (const s of c.secs) { assert.ok(!ids.has(s.id), `duplicate section ${s.id}`); ids.add(s.id); assert.ok(BK.text(s).length > 200, `${s.id} too short`); }
    assert.ok(c.terms.length >= 3 && c.terms.every(t => t[0] && t[1]), `${c.id} terms`);
    assert.ok(c.examples.length >= 1 && c.cautions.length >= 1, `${c.id} examples / cautions`);
    assert.ok(c.quiz.length >= 2, `${c.id} questions`);
    for (const q of c.quiz) { assert.ok(q.q && q.why && q.choices.length >= 3); assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length); }
    assert.ok(c.refs.length >= 1 && c.refs.every(r => r && /^https:\/\//.test(r.url)), `${c.id} refs`);
    for (const id of c.lessons || []) assert.ok(SC.lesson(id), `${c.id} lesson ${id}`);
  }
  assert.ok(ids.size >= 80, `${ids.size} sections`);
});

test('textbook: every cross-link resolves (sections, lessons, calculators) and the disclaimer is in the book', () => {
  const lessons = new Set(SC.lessonOrder());
  for (const c of BK.CHAPTERS) for (const s of c.secs) {
    const h = BK.html(s);
    for (const m of h.matchAll(/data-sec="([^"]+)"/g)) assert.ok(BK.findSection(m[1]), `${s.id} → ${m[1]}`);
    for (const m of h.matchAll(/data-lesson="([^"]+)"/g)) assert.ok(lessons.has(m[1]), `${s.id} → lesson ${m[1]}`);
    for (const m of h.matchAll(/data-calc="([^"]+)"/g)) assert.equal(typeof FL.bookCalc[m[1]], 'function', `${s.id} → calc ${m[1]}`);
  }
  const all = BK.CHAPTERS.flatMap(c => c.secs.map(s => BK.text(s))).join(' ');
  assert.match(all, /本アプリは公開情報を基にした非公式の自主学習用教材です。/);
  for (const w of ['Vmc', 'METAR', '91.155', 'ゴーアラウンド', 'ILS', 'TEM', 'IMSAFE', '偏流修正']) assert.ok(all.includes(w), w);
});

test('ground-school tests: ≥ 12 banks of 4-choice questions with reasons, linked to the textbook', () => {
  assert.ok(QZ.BANKS.length >= 12);
  const lessons = new Set(SC.lessonOrder());
  let n = 0;
  for (const b of QZ.BANKS) {
    assert.ok(b.title && BK.findSection(b.book), `${b.id} book link`); assert.ok(!lessons.has(b.id), `${b.id} collides with a lesson id`);
    assert.ok(b.qs.length >= 8, `${b.id} questions`);
    for (const q of b.qs) { n++; assert.equal(q[1].length, 4, q[0]); assert.equal(new Set(q[1]).size, 4, q[0]); assert.ok(Number.isInteger(q[2]) && q[2] >= 0 && q[2] < 4 && q[3], q[0]); }
  }
  assert.ok(n >= 120, `${n} questions`);
});

test('Sanford: the four runways, the hot spot, the airspace, a schematic labelled NOT FOR NAVIGATION, ≥ 4 ATC scenes', () => {
  assert.deepEqual(SF.RUNWAYS.map(r => r.id), ['09L/27R', '09C/27C', '09R/27L', '18/36']);
  const facts = SF.FACTS.map(f => f.t).join(' ');
  for (const w of ['HS1', '27C', 'Class C', 'Class B', 'Line Up and Wait']) assert.ok(facts.includes(w), w);
  const svg = SF.diagramSvg(); assert.match(svg, /NOT FOR NAVIGATION/); assert.match(svg, /模式図/);
  assert.ok(SF.SCENES.length >= 4);
  for (const s of SF.SCENES) { assert.ok(s.atc && s.why && s.clarify && s.options.length >= 3); assert.ok(s.answer >= 0 && s.answer < s.options.length); }
});

// ------------------------------------------------------------------ English radio (the textbook's five chapters and the practice page)
const RD = FL.radio;
test('radio textbook: five chapters before "human factors", numbered in order; every {ch:} reference resolves; no hard-coded chapter number is wrong', () => {
  const ids = BK.CHAPTERS.map(c => c.id), at = ids.indexOf('radio1');
  assert.deepEqual(ids.slice(at, at + 6), ['radio1', 'radio2', 'radio3', 'radio4', 'radio5', 'hf']);
  BK.CHAPTERS.forEach((c, i) => assert.equal(c.n, i + 1, c.id));
  const every = [...BK.CHAPTERS.flatMap(c => [c.summary, ...(c.examples || []), ...(c.cautions || []), ...c.quiz.flatMap(q => [q.q, q.why]), ...c.secs.map(s => BK.html(s))]), ...QZ.BANKS.flatMap(b => b.qs.flatMap(q => [BK.fix(q[0]), BK.fix(q[3])]))].join('\n');
  assert.doesNotMatch(BK.fix(every), /\{ch:|（別の章）/);
  assert.equal(BK.fix('{ch:crm}'), `第 ${BK.CHAPTERS.find(c => c.id === 'crm').n} 章`);
  const radio = BK.CHAPTERS.filter(c => /^radio/.test(c.id)), text = radio.flatMap(c => c.secs.map(s => BK.text(s))).join(' ');
  assert.ok(radio.reduce((a, c) => a + c.secs.length, 0) >= 20, 'sections');
  for (const w of ['AIM 4-2-3', 'AIM 4-3-18', 'AIM 4-4-7', 'AIM 3-2-4', 'AIM 4-1-9', 'AIM 6-3', '91.185', 'line up and wait', 'cleared for takeoff', 'Say again', 'Wilco', 'Unable', 'MAYDAY', 'PAN-PAN', '7600', 'CTAF', 'decimal', 'QNH', 'student pilot']) assert.ok(text.includes(w), w);
  assert.doesNotMatch(text, /gusts/i, 'gust phraseology was not verified');
});

test('radio: numbers are said as the AIM shows (4-2-8 … 4-2-12) and the controller phrases as JO 7110.65', () => {
  const S = RD.SAY;
  for (const [ft, w] of [[500, 'five hundred'], [4500, 'four thousand five hundred'], [10000, 'one zero thousand'], [13500, 'one three thousand five hundred'], [12000, 'one two thousand'], [12500, 'one two thousand five hundred'], [19000, 'flight level one niner zero'], [27500, 'flight level two seven five']]) assert.equal(S.altitude(ft), w, ft);
  assert.equal(S.freq('122.1'), 'one two two point one');
  assert.equal(S.freq('119.75'), 'one one niner point seven five');
  assert.equal(S.heading(5), 'heading zero zero five'); assert.equal(S.heading(100), 'heading one zero zero'); assert.equal(S.heading(0), 'heading three six zero');
  assert.equal(S.speed(250), 'two five zero knots'); assert.equal(S.speed(190), 'one niner zero knots');
  assert.equal(S.time('0920'), 'zero niner two zero Zulu');
  assert.equal(S.digits('10'), 'one zero');
  assert.equal(S.altimeter('30.01'), 'altimeter three zero zero one');
  assert.equal(S.squawk('0425'), 'squawk zero four two five');
  assert.equal(S.runway('9R'), 'runway niner right'); assert.equal(S.runway('27C'), 'runway two seven center'); assert.equal(S.runway('36'), 'runway three six');
  assert.equal(S.wind(220, 15), 'wind two two zero at one five'); assert.equal(S.wind(100, 2), 'wind calm');
  assert.equal(S.spell('N7LA'), 'November seven Lima Alfa');
  assert.equal(RD.ALPHA.length, 26); assert.equal(RD.DIGW[9], 'niner');
});

test('radio: a whole flight in order (ATIS → ground → tower → departure → approach → tower → ground), every call with its meaning', () => {
  assert.deepEqual(RD.FLIGHT.map(p => p.id), ['atis', 'gnd1', 'twr1', 'dep', 'app', 'twr2', 'gnd2']);
  const lines = RD.FLIGHT.flatMap(p => p.lines), said = lines.filter(l => l[0] !== 'ACT');
  assert.ok(said.length >= 30, `${said.length} calls`);
  for (const p of RD.FLIGHT) assert.ok(BK.findSection(p.sec), p.sec);
  for (const [who, en, jp] of lines) { assert.ok(RD.WHO[who], who); assert.ok(jp && jp.length > 3, en); if (who !== 'ACT') assert.ok(en.length > 8); }
  // every read-back carries the call sign; the first call to each facility uses the full call sign
  for (const [who, en] of said) if (who === 'P') assert.match(en, /Archer (Seven Lima Alpha|7LA)/, en);
  const seen = new Set();
  for (const [who, en] of said) { const m = who === 'P' && /^LAB (Ground|Tower|Departure|Approach),/.exec(en); if (m && !seen.has(m[1])) { seen.add(m[1]); assert.match(en, /Archer Seven Lima Alpha/, en); } }
  assert.equal(seen.size, 4);
  const all = said.map(l => l[1]).join(' ');
  for (const w of ['information Bravo', 'hold short of taxiway Charlie', 'line up and wait', 'cleared for takeoff', 'radar contact', 'squawk VFR', 'cleared to land', 'contact Ground point seven']) assert.ok(all.includes(w), w);
  assert.equal(RD.tts('Contact departure, Archer 7LA.'), 'Contact departure, Archer Seven Lima Alpha.');
});

test('radio: ≥ 30 read-back / response scenes in every phase (the six Sanford scenes kept by id), each with one right answer, a reason and sources', () => {
  assert.ok(RD.SCENES.length >= 30, `${RD.SCENES.length}`);
  const ids = new Set(); for (const sc of RD.SCENES) { assert.ok(!ids.has(sc.id), sc.id); ids.add(sc.id); assert.match(sc.id, /^[a-z0-9_]{1,20}$/); }
  for (const s of SF.SCENES) assert.ok(ids.has(s.id), s.id);
  for (const [g] of RD.GROUPS) assert.ok(RD.SCENES.filter(s => s.g === g).length >= 2, g);
  for (const sc of RD.SCENES) {
    assert.equal(sc.options.length, 4, sc.id); assert.equal(new Set(sc.options).size, 4, sc.id);
    assert.ok(Number.isInteger(sc.answer) && sc.answer >= 0 && sc.answer < 4, sc.id);
    assert.ok(sc.title && sc.situation && sc.q && sc.why && sc.clarify, sc.id);
    assert.ok(sc.refs.length && sc.refs.every(k => RD.ref(k) && /^https:\/\//.test(RD.ref(k).url)), sc.id);
  }
  // the progress keeps a scene id (the same rule as the record)
  const p = SC.sanitizeProgress({ atc: Object.fromEntries(RD.SCENES.map(s => [s.id, true])) });
  assert.equal(Object.keys(p.atc).length, RD.SCENES.length);
});

test('radio drills and listening: four different choices, the right one among them, for every kind (1,000 draws)', () => {
  const rng = RD.mulberry(42);
  for (let k = 0; k < 100; k++) for (const [set] of RD.DRILL_SETS) for (const q of RD.drill(10, rng, set)) {
    assert.equal(q.opts.length, 4, q.q); assert.equal(new Set(q.opts).size, 4, q.q); assert.ok(q.opts.includes(q.ok), q.q); assert.ok(q.why, q.q);
  }
  for (let k = 0; k < 100; k++) for (const q of RD.listen(10, rng)) { assert.equal(new Set(q.opts).size, 4, q.q); assert.ok(q.opts.includes(q.ok)); assert.ok(q.say.length > 10); }
  assert.ok(RD.GLOSSARY.length >= 50);
  for (const g of RD.GLOSSARY) assert.ok(g[0] && g[1] && g[3] && g[4], g[0]);
  // the ground-school stage has the four radio lessons, and the practical test bank exists
  for (const id of ['k3', 'k4', 'k5', 'k6']) assert.ok(SC.lesson(id) && SC.lesson(id).radio, id);
  assert.ok(QZ.BANKS.find(b => b.id === 'q_radio'));
});

test('ui: key chips are made from every lesson\'s key text, and the keyboard map has every key a lesson names', () => {
  const U = FL.ui;
  assert.deepEqual(U.parseKeys('S＝機首上げ・W＝機首下げ（離すとその姿勢を保つ）　A / D＝左右に傾ける').map(p => p.keys), [['S'], ['W'], ['A', 'D']]);
  assert.deepEqual(U.keysUsed('[＝左のプロペラをフェザー・]＝右のプロペラをフェザー　B / Space＝ブレーキ'), ['[', ']', 'B', 'Space']);
  assert.match(U.keyChips('R＝スロットル増'), /<kbd>R<\/kbd><span>スロットル増<\/span>/);
  const onMap = new Set(U.KB.map(k => k[0].toUpperCase()));
  for (const l of SC.lessonOrder().map(id => SC.lesson(id)).filter(l => l.steps)) for (const st of l.steps) {
    const kt = st.keys || '';
    for (const p of U.parseKeys(kt)) { if (!p.keys.length) continue; assert.ok(p.what.length > 1, `${l.id}: "${kt}" has a key with no meaning`); for (const k of p.keys) assert.ok(onMap.has(k.replace(/^Shift\+/, '').toUpperCase()), `${l.id}: key ${k} is not on the keyboard map`); }
  }
  const svg = U.keyboardSvg(['W', 'S']); assert.match(svg, /^<svg/); assert.equal((svg.match(/filter="url\(#kbglow\)"/g) || []).length, 2, 'two keys lit');
});

// ------------------------------------------------------------------ the powerplant model (mixture, tanks, carburettor ice, manifold pressure)
const airAt = (ac, altFt, kias, thr) => { const s = P.placeInAir(P.newState({ aircraft: ac }), 0, -40000, altFt, 354, kias, 0, 0, thr); s.wind = { fromDeg: 0, kt: 0, gust: 0 }; return s; };

test('powerplant: leaning toward peak EGT raises the EGT and cuts the fuel flow; over-leaning runs rough and loses power', () => {
  const fly = mix => { const s = airAt('pa28', 3000, 100, 0.72); s.mix = mix; return run(s, 20); };
  const rich = fly(1), peak = fly(0.86), lean = fly(0.7), over = fly(0.5);
  assert.ok(peak.out.egt > rich.out.egt + 80, `EGT rises toward the peak (${rich.out.egt} → ${peak.out.egt})`);
  assert.ok(peak.fuelFlow < rich.fuelFlow - 0.5, `the flow falls (${rich.fuelFlow.toFixed(1)} → ${peak.fuelFlow.toFixed(1)} gal/h)`);
  assert.ok(lean.out.egt < peak.out.egt - 50, `past the peak the EGT falls again (${lean.out.egt})`);
  assert.ok(over.out.rough > 0.5 && over.out.powerPct < peak.out.powerPct - 20, `over-lean: rough (${over.out.rough}) and weak (${over.out.powerPct}%)`);
  // up high, full rich is over-rich: leaning back to the plateau recovers the power the density took
  const hi = mix => { const s = airAt('pa28', 8000, 95, 0.85); s.mix = mix; return run(s, 20); };
  const hiRich = hi(1), hiLean = hi(0.8);
  assert.ok(hiLean.eng[0].mixK > hiRich.eng[0].mixK + 0.005, `leaning recovers the mixture factor (${hiRich.eng[0].mixK.toFixed(3)} → ${hiLean.eng[0].mixK.toFixed(3)})`);
  assert.ok(hiLean.out.egt > hiRich.out.egt + 100 && hiLean.fuelFlow < hiRich.fuelFlow, 'and the EGT and the flow agree');
});

test('powerplant: idle cut-off stops the engine', () => {
  const s = airAt('pa28', 3000, 100, 0.7); s.mix = 0.05; run(s, 3);
  assert.equal(s.eng[0].run, false);
  assert.ok(s.events.some(e => e.type === 'engine_stop'), 'the stop is an event, as before');
});

test('powerplant: the engine drinks from the selected tank only, and a dry selected tank stops it', () => {
  const burn = sel => { const s = P.placeOnRunway(P.newState(), P.LAB_RWY, 30); s.brake = true; s.thr = 0.5; s.fuelSel = sel; const f = [...s.fuel]; run(s, 60); return { f, now: [...s.fuel] }; };
  const r = burn('R'); assert.equal(r.now[0], r.f[0], 'the left tank is untouched'); assert.ok(r.now[1] < r.f[1] - 0.05, 'the right tank falls');
  const l = burn('L'); assert.equal(l.now[1], l.f[1]); assert.ok(l.now[0] < l.f[0] - 0.05, 'the left tank falls');
  const dry = airAt('pa28', 3000, 100, 0.7); dry.fuel = [5, 0]; dry.fuelSel = 'R'; run(dry, 10);
  assert.equal(dry.eng[0].run, false, 'the engine stops with the other tank still holding 5 gal');
  assert.equal(dry.fuel[0], 5);
  assert.ok(dry.events.some(e => e.type === 'engine_stop' && /燃料切れ/.test(e.why || '')), 'and the log says why');
  const off = airAt('pa28', 3000, 100, 0.7); off.fuelSel = 'OFF'; run(off, 3);
  assert.equal(off.eng[0].run, true, 'the fuel in the lines keeps it running a few seconds');
  run(off, 8); assert.equal(off.eng[0].run, false, 'then it stops');
});

test('powerplant: carburettor ice builds on a humid day, sags the rpm, and the heat melts it (the injected twin is immune)', () => {
  const mk = risk => { const s = airAt('pa28', 3000, 95, 0.6); s.carbRisk = risk; return s; };
  const iced = mk(1), clean = mk(0); run(iced, 200); run(clean, 200);
  assert.equal(clean.eng[0].carbIce, 0, 'a dry day never ices');
  assert.ok(iced.eng[0].carbIce > 0.45, `ice builds (${iced.eng[0].carbIce.toFixed(2)})`);
  assert.ok(iced.events.some(e => e.type === 'carb_ice'), 'it is noted once, for the debrief');
  assert.ok(iced.rpm < clean.rpm - 40, `the rpm sags (${Math.round(clean.rpm)} → ${Math.round(iced.rpm)}) — the only announcement`);
  const sagged = iced.rpm; iced.carbHeat = true; run(iced, 30);
  assert.ok(iced.eng[0].carbIce < 0.05, 'the heat melts it');
  assert.ok(iced.rpm > sagged + 40, 'and the rpm comes back');
  const twin = airAt('pa44', 3000, 110, 0.6); twin.carbRisk = 1; run(twin, 120);
  assert.equal(twin.eng[0].carbIce, 0, 'fuel injection has no venturi to ice');
});

test('powerplant: manifold pressure is plausible, and % power comes from the shaft, not the lever', () => {
  const mp = (altFt, thr, sec = 5) => { const s = airAt('pa44', altFt, 100, thr); run(s, sec); return s; };
  const slFull = mp(60, 1), slIdle = mp(60, 0), hiFull = mp(8000, 1);
  assert.ok(slFull.out.manIn > 27 && slFull.out.manIn < 30, `sea level, full throttle ≈ ambient (${slFull.out.manIn})`);
  assert.ok(slIdle.out.manIn < 14, `idle is low (${slIdle.out.manIn})`);
  assert.ok(hiFull.out.manIn < 24 && hiFull.out.manIn < slFull.out.manIn - 4, `it falls with altitude (${hiFull.out.manIn})`);
  assert.equal(slFull.out.powerPct, 100, 'sea level, full rich, full throttle is 100 %');
  assert.ok(hiFull.out.powerPct < 85, `% power falls with altitude too (${hiFull.out.powerPct})`);
  const dead = mp(3000, 0.3); dead.eng[0].failed = true; run(dead, 3);
  assert.ok(dead.out.manIns[0] > dead.out.manIns[1] + 3, `a stopped engine's gauge reads ambient (${dead.out.manIns[0]} vs ${dead.out.manIns[1]})`);
});

// ---------------------------------------------------------------- weight and balance
test('wb: the standard load is the reference mass exactly; a solo load is one instructor lighter', () => {
  const P = FL.physics;
  for (const id of ['pa28', 'pa44']) {
    const A = P.AIRCRAFT.find(a => a.id === id), std = P.computeWB(A, P.stdLoading());
    assert.equal(std.kg, A.phys.mass, `${id}: the standard load is the model's reference mass`);
    assert.ok(std.ok && std.lb < std.mtowLb, `${id}: the standard load is inside the limits (${Math.round(std.lb)} lb)`);
    assert.ok(std.cgIn > std.fwdIn && std.cgIn < std.aftIn, `${id}: its CG is inside (${std.cgIn.toFixed(1)} in)`);
    const solo = P.computeWB(A, { front: 1 });
    assert.equal(std.kg - solo.kg, P.PERSON_KG, `${id}: solo is lighter by exactly one standard adult`);
    assert.ok(solo.ok, `${id}: solo is still inside the limits`);
    const full = P.computeWB(A, { fuel: 'full' }), tabs = P.computeWB(A, { fuel: 'tabs' }), half = P.computeWB(A, { fuel: 'half' });
    assert.ok(full.kg > std.kg && tabs.kg < std.kg && half.kg < tabs.kg, `${id}: the fuel choices order the weight (full > std > tabs > half)`);
    assert.equal(P.cleanLoading(A, { fuel: 'bogus', front: 9, rear: -1, bagKg: 999 }).bagKg, P.WB[id].bagMaxKg, `${id}: a nonsense load is clamped, not trusted`);
    assert.equal(P.cleanLoading(A, { fuel: 'bogus' }).fuel, 'std');
  }
});

test('wb: out-of-envelope loads are named — overweight, tail-heavy', () => {
  const P = FL.physics, AR = P.AIRCRAFT[0], SM = P.AIRCRAFT[1];
  const over = P.computeWB(AR, { fuel: 'full', rear: 2, bagKg: 30 });
  assert.ok(!over.ok && over.problems.includes('over'), `an Archer with everyone and everything is overweight (${Math.round(over.lb)} lb)`);
  assert.ok(P.computeWB(SM, { fuel: 'full', rear: 2, bagKg: 30 }).problems.includes('over'), 'the Seminole too, fuller still');
  const tail = P.computeWB(AR, { front: 1, rear: 2, bagKg: 90 }, [2, 2]);
  assert.deepEqual(tail.problems, ['tail'], `a light nose and a heavy tail is tail-heavy only (${tail.cgIn.toFixed(1)} in)`);
  assert.ok(P.computeWB(AR, { front: 1, rear: 2, bagKg: 15 }).ok, 'the same people with a sane baggage load are fine');
});

test('wb: applyLoading — the default changes nothing; a chosen load re-derives the state and fills the tanks', () => {
  const P = FL.physics;
  const s = P.newState({ aircraft: 'pa28' }), before = { mass: s.AC.mass, Cm0: s.AC.Cm0, I: s.AC.I.slice() };
  const wb = P.applyLoading(s);
  assert.equal(s.AC.mass, before.mass); assert.equal(s.AC.Cm0, before.Cm0); assert.deepEqual(s.AC.I, before.I);
  assert.equal(wb.kg, s.A.phys.mass); assert.equal(s.wb, wb);
  const solo = P.newState({ aircraft: 'pa28' }); P.applyLoading(solo, { front: 1 });
  assert.equal(solo.AC.mass, solo.A.phys.mass - P.PERSON_KG);
  assert.ok(solo.AC.I[0] < before.I[0], 'the inertia follows the mass');
  const full = P.newState({ aircraft: 'pa28' }); P.applyLoading(full, { fuel: 'full' });
  assert.deepEqual(full.fuel, [full.A.fuelCap, full.A.fuelCap]);
  const half = P.newState({ aircraft: 'pa44' }); P.applyLoading(half, { fuel: 'half' });
  assert.deepEqual(half.fuel, [half.A.fuelCap / 2, half.A.fuelCap / 2]);
  // the stall speeds the instruments quote scale with √weight
  const heavy = P.newState({ aircraft: 'pa28' }); P.applyLoading(heavy, { fuel: 'full', rear: 1 });
  P.derive(s); P.derive(heavy);
  assert.ok(heavy.out.vs0 > s.out.vs0 + 1.5, `Vs0 ${s.out.vs0} → ${heavy.out.vs0} kt at the heavier weight`);
  // an aft CG asks for a different trim (Cm0 moves, a little, and only a little)
  const aft = P.newState({ aircraft: 'pa28' }); P.applyLoading(aft, { front: 1, rear: 2, bagKg: 30 });
  assert.ok(aft.AC.Cm0 > before.Cm0 && aft.AC.Cm0 - before.Cm0 <= 0.015, `the CG's trim shift (${before.Cm0} → ${aft.AC.Cm0})`);
});

// a takeoff and a Vy climb flown the bot's way (the nose holds the speed), at the weight's own speeds:
// the roll to liftoff (m past the threshold) and the climb that follows (fpm at Vy)
function wbFlight(P, id, loading) {
  const DEG = Math.PI / 180, dt = 1 / 120, s = P.newState({ aircraft: id, seed: 7 });
  s.wind = { fromDeg: P.LAB_RWY.trueHdg + 10, kt: 5, gust: 0.5 };
  P.applyLoading(s, loading);
  const wS = Math.sqrt(s.AC.mass / s.A.phys.mass);
  P.placeOnRunway(s);
  let lift = null, pBase = null, lastIas = null, vsSum = 0, n = 0;
  for (let i = 0; i < 120 * 100; i++) {
    const o = s.out, a = P.attitude(s), rc = P.rwyCoords(P.LAB_RWY, -s.pos[2], s.pos[0]);
    s.thr = 1; s.opts.autoRud = true;
    if (lift == null) {
      s.pIn = o.ias > s.A.v.rotate * wS - 1 ? 0.65 : 0;
      s.rud = P.clamp(-0.06 * P.wrap180(a.hdg - P.LAB_RWY.trueHdg) - 0.02 * rc.cross, -1, 1);
      if (!s.onGround && o.agl > 3) lift = rc.along;
    } else {
      const kt = s.A.v.y * wS, dv = lastIas == null ? 0 : (o.ias - lastIas) / dt;
      if (pBase == null) pBase = a.pitch;
      pBase = P.clamp(pBase + (o.ias - kt) * 0.05 * dt, -15, 18);
      s.keyHold = true; s.pTgt = pBase + 0.35 * (o.ias - kt) + 1.5 * dv; s.pRate = 0; s.pIn = 0;
      const p = -s.w[2] / DEG; s.rIn = P.clamp(0.045 * (0 - o.bank) - 0.012 * p, -1, 1);
      lastIas = o.ias;
    }
    P.step(s, dt);
    assert.ok(!s.crashed, `no crash at this load (${s.crashReason})`);
    if (lift != null) return { lift, mass: s.AC.mass };
  }
  throw new Error('never lifted off');
}
function wbClimb(P, id, loading) {
  const DEG = Math.PI / 180, dt = 1 / 120, s = P.newState({ aircraft: id, seed: 7 });
  s.wind = { fromDeg: P.LAB_RWY.trueHdg + 10, kt: 5, gust: 0.5 };
  P.applyLoading(s, loading);
  const wS = Math.sqrt(s.AC.mass / s.A.phys.mass), kt = s.A.v.y * wS;
  P.placeInAir(s, 7000, -37500, 3000, 90, kt, 0, 0, null);
  s.thr = 1; s.opts.autoRud = true;
  let pBase = null, lastIas = null, vsSum = 0, n = 0;
  for (let i = 0; i < 120 * 35; i++) {
    const o = s.out, a = P.attitude(s), dv = lastIas == null ? 0 : (o.ias - lastIas) / dt;
    if (pBase == null) pBase = a.pitch;
    pBase = P.clamp(pBase + (o.ias - kt) * 0.05 * dt, -15, 18);
    s.keyHold = true; s.pTgt = pBase + 0.35 * (o.ias - kt) + 1.5 * dv; s.pRate = 0;
    const p = -s.w[2] / DEG; s.rIn = P.clamp(0.045 * (0 - o.bank) - 0.012 * p, -1, 1);
    lastIas = o.ias;
    P.step(s, dt);
    assert.ok(!s.crashed, `no crash at this load (${s.crashReason})`);
    if (s.t > 10) { vsSum += s.out.vsi; n++; }
  }
  return vsSum / n;
}

test('wb: the mass reaches the flight — heavier rolls further and climbs slower, solo climbs better', () => {
  const P = FL.physics;
  const std = wbFlight(P, 'pa28'), solo = wbFlight(P, 'pa28', { front: 1 }), heavy = wbFlight(P, 'pa28', { fuel: 'full', rear: 1 });
  assert.ok(solo.lift < std.lift - 15, `liftoff: solo ${Math.round(solo.lift)} m < standard ${Math.round(std.lift)} m`);
  assert.ok(heavy.lift > std.lift + 40, `liftoff: heavy ${Math.round(heavy.lift)} m > standard ${Math.round(std.lift)} m`);
  const cStd = wbClimb(P, 'pa28'), cSolo = wbClimb(P, 'pa28', { front: 1 }), cHeavy = wbClimb(P, 'pa28', { fuel: 'full', rear: 1 });
  assert.ok(cSolo > cStd + 50, `climb at Vy: solo ${Math.round(cSolo)} > standard ${Math.round(cStd)} fpm`);
  assert.ok(cHeavy < cStd - 80, `climb at Vy: heavy ${Math.round(cHeavy)} < standard ${Math.round(cStd)} fpm`);
  const tStd = wbClimb(P, 'pa44', undefined), tSolo = wbClimb(P, 'pa44', { front: 1 });
  assert.ok(tSolo > tStd + 50, `the twin too: solo ${Math.round(tSolo)} > dual ${Math.round(tStd)} fpm`);
});

test('wb: the centre of gravity moves the stability itself — aft is less stable in pitch, and the trim follows', () => {
  const P = FL.physics, A = P.AIRCRAFT[0];
  const mk = ld => { const s = P.newState({}); P.placeOnRunway(s); P.applyLoading(s, ld); return s; };
  const fwd = mk({ fuel: 'tabs', front: 2, rear: 0, bagKg: 0 }), std = mk(P.stdLoading()), aft = mk({ fuel: 'half', front: 1, rear: 2, bagKg: 0 });
  assert.ok(Math.abs(std.AC.Cma - A.phys.Cma) < 1e-12 && Math.abs(std.AC.Cm0 - A.phys.Cm0) < 1e-12, 'the standard load keeps the reference stability and trim, exactly');
  assert.ok(fwd.wb.cgIn < std.wb.cgIn && aft.wb.cgIn > std.wb.cgIn + 3, `cg: fwd ${fwd.wb.cgIn.toFixed(1)} / std ${std.wb.cgIn.toFixed(1)} / aft ${aft.wb.cgIn.toFixed(1)} in`);
  assert.ok(fwd.AC.Cma < std.AC.Cma && aft.AC.Cma > std.AC.Cma + 0.2, `Cma: fwd ${fwd.AC.Cma.toFixed(2)} / std ${std.AC.Cma.toFixed(2)} / aft ${aft.AC.Cma.toFixed(2)} — the static margin shrinks as the CG moves aft`);
  assert.ok(aft.AC.I[0] > std.AC.I[0] * 1.15, `the spread load is harder to pitch: I ${Math.round(aft.AC.I[0])} vs ${Math.round(std.AC.I[0])}`);
  // the free response: trimmed at 90 kt, the nose pushed 5° up and the elevator then frozen — the restoring
  // angular acceleration in the first moments is the stability itself, and it is much weaker aft
  const kick = s => {
    P.placeInAir(s, 0, -40000, 3000, 354, 90, 0, 0, null);
    const trim = s.trim, att = P.attitude(s);
    s.q = P.qFromHPB(354, att.pitch + 5, 0); s.w = [0, 0, 0]; s.keyHold = false; s.ovr = { elev: 0, ail: 0, rud: 0 };
    const w0 = s.w[0]; run(s, 0.15); s.ovr = null;
    return { trim, acc: (s.w[0] - w0) / 0.15 };
  };
  const ks = kick(std), ka = kick(aft);
  assert.ok(ks.acc < 0 && ka.acc < 0, `both restore (${ks.acc.toFixed(2)}, ${ka.acc.toFixed(2)} rad/s²)`);
  assert.ok(Math.abs(ks.acc) > Math.abs(ka.acc) * 1.3, `the aft CG restores far more weakly: ${ks.acc.toFixed(2)} vs ${ka.acc.toFixed(2)} rad/s²`);
  assert.ok(Math.abs(ks.trim - ka.trim) > 0.03, `and the trim differs: std ${ks.trim.toFixed(3)} vs aft ${ka.trim.toFixed(3)}`);
});

test('physics: density altitude — a hot day thins the air the flight and the instructor\'s numbers both breathe', () => {
  const P = FL.physics;
  const isa = P.newState({}), hot = P.newState({}); hot.oatDev = 20;
  const cIsa = P.steadyState(isa, 76, null, { pwr: 'full', altFt: 55 }).fpm, cHot = P.steadyState(hot, 76, null, { pwr: 'full', altFt: 55 }).fpm;
  assert.ok(cHot < cIsa - 60, `full-power climb at Vy from the field: ISA ${Math.round(cIsa)} fpm vs ISA+20 ${Math.round(cHot)} fpm`);
  const zero = P.newState({}); zero.oatDev = 0;
  assert.equal(JSON.stringify(P.steadyState(zero, 76, null, { pwr: 'full', altFt: 55 })), JSON.stringify(P.steadyState(isa, 76, null, { pwr: 'full', altFt: 55 })), 'no deviation said, standard air — bit-identical');
  // and the flight itself: the same field, the same day, thinner air on the gauge the physics integrates with
  const f = (s) => { P.placeOnRunway(s); run(s, 1); return s.rho; };
  assert.ok(f(hot) < f(isa) * 0.95, `density at the field: ${f(isa).toFixed(3)} vs ${f(hot).toFixed(3)} kg/m³`);
});

test('physics: the brakes are a travel — part brake stops longer, a wet runway locks a stomped wheel, rudder splits them', () => {
  const P = FL.physics;
  const stop = (brake, wet, extra = {}) => {
    const s = P.newState({}); P.placeOnRunway(s); Object.assign(s, extra);
    s.surfaceWet = wet; s.thr = 0; s.brake = brake;
    const fwd = P.qrot(s.q, [0, 0, -1]); s.vel = [fwd[0] * 35, 0, fwd[2] * 35];
    const p0 = s.pos.slice(); let lock = 0, n = 0;
    for (let i = 0; i < 120 * 60; i++) { P.step(s, DT); n++; if (s.wheelLock) lock++; if (Math.hypot(s.vel[0], s.vel[2]) < 0.05 && i > 240) break; }
    return { d: Math.hypot(s.pos[0] - p0[0], s.pos[2] - p0[2]), lock: lock / n };
  };
  const dryFull = stop(true, 0), dryFloat = stop(1, 0), dryHalf = stop(0.5, 0);
  assert.ok(Math.abs(dryFull.d - dryFloat.d) < 1e-9, `a boolean brake is full brake, exactly (${dryFull.d.toFixed(1)} m)`);
  assert.ok(dryHalf.d > dryFull.d * 1.4, `half brake stops much longer: ${dryHalf.d.toFixed(0)} m vs ${dryFull.d.toFixed(0)} m`);
  const wetSoft = stop(0.7, 1), wetStomp = stop(1, 1);
  assert.ok(wetSoft.lock < 0.05, 'a measured application on a wet runway does not lock');
  assert.ok(wetStomp.lock > 0.5 && wetStomp.d > wetSoft.d + 8, `a stomp locks the wheels and stops longer: ${wetStomp.d.toFixed(0)} m locked vs ${wetSoft.d.toFixed(0)} m rolling`);
  // differential braking: the rudder held with the brakes at taxi pace turns the aircraft — unless refused
  const turn = diff => {
    const s = P.newState({}); P.placeOnRunway(s); s.opts.diffBrake = diff;
    const fwd = P.qrot(s.q, [0, 0, -1]); s.vel = [fwd[0] * 5, 0, fwd[2] * 5]; s.thr = 0.25; s.brake = 0.6; s.rud = 0.8;
    const h0 = s.out.hdgTrue; run(s, 3); return Math.abs(P.wrap180(s.out.hdgTrue - h0));
  };
  assert.ok(turn(true) > turn(false) + 5, `rudder + brake turns tighter (${turn(true).toFixed(0)}° vs ${turn(false).toFixed(0)}° in 3 s)`);
});

test('wb: the before-takeoff checklist refuses an out-of-envelope load, and passes the standard one', () => {
  const SC = FL.school;
  const passAll = L => { let guard = 0; while (L.check && guard++ < 30) { const r = SC.checklistNext(L); assert.ok(r.ok, `item refused: ${r.item} (${L.hint})`); } assert.equal(L.check, null, 'the checklist completes'); };
  passAll(SC.startLesson('t1', 'intro'));
  const L = SC.startLesson('t1', 'intro', { loading: { fuel: 'full', rear: 2, bagKg: 30 } });
  assert.ok(L.s.wb && !L.s.wb.ok && L.s.AC.mass > L.s.A.phys.mass, 'the lesson starts with the chosen load on board');
  let refused = null, guard = 0;
  while (L.check && guard++ < 30) { const r = SC.checklistNext(L); if (!r.ok) { refused = r; break; } }
  assert.ok(refused && refused.item === '重量と重心', `the load is the item that refuses (got ${refused && refused.item})`);
  assert.ok(/超過/.test(L.hint), `the refusal names the problem: ${L.hint}`);
  assert.ok(!SC.checklistNext(L).ok, 'and it keeps refusing until the load is fixed');
  const M = SC.startLesson('m1', 'intro', { loading: { fuel: 'full', rear: 2, bagKg: 30 } });
  assert.ok(M.s.wb && !M.s.wb.ok, 'the twin lesson carries the load too');
});

// ------------------------------------------------------------------ (next-wave item 6) the complex aircraft
test('complex: the Arrow is a retractable, governed-propeller single; the standard load is in its envelope', () => {
  const AW = P.AIRCRAFT.find(a => a.id === 'pa28r');
  assert.ok(AW && AW.complex && AW.propCtrl && AW.cs && !AW.gear.fixed && !AW.carb, 'the complex flags');
  const wb = P.computeWB(AW, P.stdLoading());
  assert.ok(wb && wb.ok && Math.abs(wb.kg - AW.phys.mass) < 1e-9, `the standard load is the reference mass (${wb && wb.kg})`);
  const s = P.newState({ aircraft: 'pa28r' });
  assert.equal(s.A.id, 'pa28r'); assert.equal(s.prop, 1, 'the prop lever starts full forward');
});

test('complex: the prop lever governs the rpm, the manifold pressure creeps up, the power falls (measured)', () => {
  const meas = (prop, thr) => {
    const s = P.newState({ aircraft: 'pa28r' }); P.placeInAir(s, 7000, -37500, 3000, 90, 110, 0, 0, thr);
    s.prop = prop; s.thr = thr; run(s, 6);
    return { rpm: s.out.rpm, manIn: s.out.manIn, propK: s.out.propK, gov: s.out.govRpm };
  };
  const fwd = meas(1, 0.75), cruise = meas(0.625, 0.75), low = meas(0, 0.75), full = meas(1, 1), lowFull = meas(0, 1);
  assert.ok(Math.abs(fwd.rpm - 2700) < 60 && Math.abs(cruise.rpm - 2400) < 60 && Math.abs(low.rpm - 1900) < 60, `the governor holds the set rpm at cruise power (${fwd.rpm} / ${cruise.rpm} / ${low.rpm})`);
  assert.equal(cruise.gov, 2400, 'the governed setting the instruments quote');
  assert.ok(cruise.manIn > fwd.manIn + 0.3 && low.manIn > cruise.manIn + 0.3, `MAN IN creeps up as the rpm comes back (${fwd.manIn} → ${cruise.manIn} → ${low.manIn} inHg)`);
  assert.ok(Math.abs(cruise.propK - 0.94) < 0.02 && Math.abs(low.propK - 0.82) < 0.02, `the power factor at 2,400 / 1,900 rpm (${cruise.propK} / ${low.propK})`);
  assert.ok(Math.abs(full.rpm - 2700) < 30 && Math.abs(lowFull.rpm - 1900) < 30, 'and at full power');
  // the existing types never take the prop branch: the Seminole's rpm formula and the Archer's are untouched
  const SM = P.AIRCRAFT.find(a => a.id === 'pa44');
  assert.equal(P.rpmFor(SM, 0.75, 50), 2250 + 450 * Math.sqrt(0.75), 'the Seminole rpm is the old formula');
  const s2 = P.newState({ aircraft: 'pa44' }); s2.prop = 0; P.placeInAir(s2, 7000, -37500, 3000, 90, 110, 0, 0, 0.75); run(s2, 3);
  assert.ok(Math.abs(s2.out.rpm - (2250 + 450 * Math.sqrt(0.75))) < 80, 'moving s.prop does nothing on the twin');
});

test('complex: gear up climbs much better than gear down (measured at Vy, full power)', () => {
  const climb = gear => {
    const s = P.newState({ aircraft: 'pa28r' }); P.placeInAir(s, 7000, -37500, 1200, 90, 90, 0, 0, 1);
    s.gearDown = gear; s.gearPos = gear ? 1 : 0; s.thr = 1;
    let vs = 0, n = 0;
    run(s, 20, () => { hands(s, 90); if (s.t > 12) { vs += s.out.vsi; n++; } });
    return vs / Math.max(1, n);
  };
  const down = climb(true), up = climb(false);
  assert.ok(up > down + 200, `gear up ${Math.round(up)} fpm vs gear down ${Math.round(down)} fpm`);
  assert.ok(down > 150, `gear down still climbs (${Math.round(down)} fpm)`);
});

test('complex + CFI: the endorsement lessons and the CFI prototype pass with the scripted pilot', () => {
  for (const id of ['cx1', 'cx2', 'cx3', 'cf1']) {
    const L = runLesson(FL, id, 'intro', 900);
    assert.ok(L.done, `${id} finishes`);
    assert.ok(L.passed, `${id} passes (grade ${L.grade}): ${L.results.flatMap(r => r.rows.filter(x => !x.pass).map(x => `${r.step}/${x.name}=${x.val}`)).join('; ')}`);
  }
  // the CFI trainee really made its seeded mistake (the deviation was recorded, not scripted into the grade)
  const L = runLesson(FL, 'cf1', 'intro', 900);
  assert.ok(L.cfiDev >= 40, `the trainee's deviation was measured (${L.cfiDev} ft)`);
});
