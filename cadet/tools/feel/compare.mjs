// CADET — tools/feel/compare.mjs : the same keys on both, the same numbers out. 空島フライト (Sorajima: flight-sim.html
// on the branch claude/what-is-this-db5aue, its own code running in headless Chromium) and CADET (flight/sorajima.js
// with flight/controls.js, in Node) fly the Archer from the same trimmed level flight (2,000 ft, 100 KIAS, no wind, no
// turbulence, the automatic rudder on, the stick sensitivity 'low', no assist); each scenario holds keys for set times
// (W 1 s, A 2 s, …) and the pitch, the pitch rate, the bank and the roll rate are read at set times.
//   node tools/feel/compare.mjs [--md]        (needs git and Playwright; prints a table, or Markdown with --md)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { installSorajima } from '../../src/flight/sorajima.js';
import { createControls } from '../../src/flight/controls.js';
import { loadChromium } from '../../test/shots.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
export const SCENARIOS = [
  { id: 'W1', ja: 'W を 1 秒（機首下げ）', keys: [['KeyW', 0, 1]], T: 6 },
  { id: 'S1', ja: 'S を 1 秒（機首上げ）', keys: [['KeyS', 0, 1]], T: 6 },
  { id: 'S3', ja: 'S を 3 秒', keys: [['KeyS', 0, 3]], T: 6 },
  { id: 'A2', ja: 'A を 2 秒（左ロール）', keys: [['KeyA', 0, 2]], T: 6 },
  { id: 'D03', ja: 'D を 0.3 秒（軽く右）', keys: [['KeyD', 0, 0.3]], T: 4 },
];
export const AT = [0.5, 1, 1.5, 2, 3, 4, 6];
const ALT_M = 2000 / 3.28084, KIAS = 100;

// one run in the page (Sorajima's own functions: setAircraft, placeAircraft, updateControls, physicsStep)
function soraRun({ sc, AT, ALT_M, KIAS, thr }) {
  /* global setAircraft, placeAircraft, updateControls, physicsStep, sim, game, keys, SCHOOL, SYS, qrot, atmos */
  setAircraft('pa28', false);
  Object.assign(game, { assist: false, autoRud: true, sens: 'low', invert: false, ap: false, levelT: 0, state: 'flying', mode: 'free' });
  SCHOOL.active = { id: 'feel' }; SCHOOL.wind = [0, 0, 0]; SCHOOL.gust = 0;
  Object.assign(SYS, { run: true, pf: 1, bus: true });
  Object.assign(sim, { crashed: false, pIn: 0, rIn: 0, pKey: 0, rKey: 0, rud: 0, elev: 0, ail: 0, dead: false, trimHold: 0 });
  const sig = Math.sqrt(atmos(ALT_M).rho / 1.225), spd = () => Math.hypot(...sim.vel);
  // (its own power for level flight at that speed: the throttle where the speed holds over the first second)
  if (thr == null) {
    let lo = 0, hi = 1;
    for (let k = 0; k < 18; k++) {
      const m = (lo + hi) / 2; placeAircraft([0, ALT_M, 0], 0, KIAS / sig, 0, 0, m); const v0 = spd();
      for (let i = 0; i < 120; i++) physicsStep(1 / 120, 0);
      if (spd() < v0) lo = m; else hi = m;
    }
    thr = (lo + hi) / 2;
  }
  placeAircraft([0, ALT_M, 0], 0, KIAS / sig, 0, 0, thr);
  for (const k of Object.keys(keys)) delete keys[k];
  const dt = 1 / 60, out = [], att = () => {
    const f = qrot(sim.q, [0, 0, -1]), r = qrot(sim.q, [1, 0, 0]), u = qrot(sim.q, [0, 1, 0]);
    return { pitch: Math.asin(f[1]) * 180 / Math.PI, bank: Math.atan2(-r[1], u[1]) * 180 / Math.PI, q: sim.w[0] * 180 / Math.PI, p: -sim.w[2] * 180 / Math.PI, elev: sim.elev, ail: sim.ail };
  };
  const a0 = att(); let t = 0, j = 0;
  for (let i = 0; i < sc.T * 60 + 1; i++) {
    for (const [code, t0, t1] of sc.keys) keys[code] = t >= t0 && t < t1;
    updateControls(dt);
    physicsStep(1 / 120, game.t = (game.t || 0) + 1 / 120); physicsStep(1 / 120, game.t += 1 / 120);
    t += dt;
    while (j < AT.length && t >= AT[j] - 1e-9) { const a = att(); out.push({ t: AT[j], dPitch: a.pitch - a0.pitch, q: a.q, bank: a.bank, p: a.p, elev: a.elev, ail: a.ail }); j++; }
  }
  game.state = 'menu'; for (const k of Object.keys(keys)) delete keys[k];
  return out;
}

// the same in CADET (Node)
function cadetFL() {
  const FL = {}, g = { FL };
  vm.createContext(g);
  for (const m of ['physics.js']) vm.runInContext(fs.readFileSync(path.join(root, '../flight-lab/src', m), 'utf8'), g, { filename: m });
  installSorajima(g.FL);
  return g.FL;
}
export function cadetRun(FL, sc, thr = null) {
  const P = FL.physics, s = P.newState({ aircraft: 'pa28' });
  s.opts.autoRud = true; s.opts.sens = 'low'; s.opts.assist = false; s.wind = { fromDeg: 0, kt: 0, gust: 0 };
  P.placeInAir(s, 0, -40000, 2000, 0, KIAS, 0, 0, thr);
  const ctl = createControls(FL, { prefs: { autoRud: true } }), L = { s };
  const dt = 1 / 60, out = [], held = new Set(), keys = { has: (c) => held.has(c), shift: false };
  const att = () => { const a = P.attitude(s); return { pitch: a.pitch, bank: a.bank, q: s.w[0] * 180 / Math.PI, p: -s.w[2] * 180 / Math.PI, elev: s.elev, ail: s.ail }; };
  const a0 = att(); let t = 0, j = 0;
  for (let i = 0; i < sc.T * 60 + 1; i++) {
    held.clear(); for (const [code, t0, t1] of sc.keys) if (t >= t0 && t < t1) held.add(code);
    ctl.update(L, dt, keys, true);
    P.step(s, 1 / 120); P.step(s, 1 / 120);
    t += dt;
    while (j < AT.length && t >= AT[j] - 1e-9) { const a = att(); out.push({ t: AT[j], dPitch: a.pitch - a0.pitch, q: a.q, bank: a.bank, p: a.p, elev: a.elev, ail: a.ail }); j++; }
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const md = process.argv.includes('--md');
  const FL = cadetFL(), P = FL.physics;
  // (each at its own power for level flight there: Sorajima's engine is stronger than the one CADET flies)
  const thr = null;
  const html = path.join(os.tmpdir(), 'sorajima-flight-sim.html');
  if (!fs.existsSync(html)) fs.writeFileSync(html, execSync('git show origin/claude/what-is-this-db5aue:flight-sim.html', { cwd: root, maxBuffer: 64 << 20 }));
  const chromium = loadChromium();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 480, height: 270 } })).newPage();
  await page.context().route(/^https?:/, r => r.abort());
  const rows = [];
  for (const sc of SCENARIOS) {
    // (a fresh page for each: its menu keeps flying the aircraft between runs)
    await page.goto('file://' + html);
    await page.waitForFunction(() => typeof physicsStep === 'function' && typeof game !== 'undefined' && game.state !== 'loading', null, { timeout: 300000 });
    const a = await page.evaluate(`(${soraRun.toString()})(${JSON.stringify({ sc, AT, ALT_M, KIAS, thr })})`);
    const b = cadetRun(FL, sc, thr);
    rows.push({ sc, a, b });
  }
  await browser.close();
  const f = (x, n = 1) => (x >= 0 ? ' ' : '') + x.toFixed(n);
  if (md) {
    for (const { sc, a, b } of rows) {
      const ang = sc.id.startsWith('A') || sc.id.startsWith('D') ? 'bank' : 'dPitch', rate = ang === 'bank' ? 'p' : 'q';
      console.log(`\n**${sc.ja}**（${ang === 'bank' ? 'バンク角 °／ロールの速さ °/s' : 'ピッチ角の変化 °／ピッチの速さ °/s'}。空島フライト → CADET）\n`);
      console.log(`| 時刻 | ${b.map(r => `${r.t} 秒`).join(' | ')} |`); console.log(`|---|${b.map(() => '---').join('|')}|`);
      console.log(`| 角度 空島 | ${a.map(r => r[ang].toFixed(1)).join(' | ')} |`); console.log(`| 角度 CADET | ${b.map(r => r[ang].toFixed(1)).join(' | ')} |`);
      console.log(`| 速さ 空島 | ${a.map(r => r[rate].toFixed(1)).join(' | ')} |`); console.log(`| 速さ CADET | ${b.map(r => r[rate].toFixed(1)).join(' | ')} |`);
    }
  } else {
    for (const { sc, a, b } of rows) {
      console.log(`\n${sc.id} ${sc.ja}   t | dPitch(sora cadet) | q | bank | p | elev | ail`);
      for (let i = 0; i < a.length; i++) console.log(`  ${String(a[i].t).padStart(3)} | ${f(a[i].dPitch)} ${f(b[i].dPitch)} | ${f(a[i].q)} ${f(b[i].q)} | ${f(a[i].bank)} ${f(b[i].bank)} | ${f(a[i].p)} ${f(b[i].p)} | ${f(a[i].elev, 3)} ${f(b[i].elev, 3)} | ${f(a[i].ail, 3)} ${f(b[i].ail, 3)}`);
    }
  }
  let worst = 0; for (const { a, b } of rows) for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i].dPitch - b[i].dPitch), Math.abs(a[i].bank - b[i].bank));
  console.log(`\nthe largest difference in an angle: ${worst.toFixed(2)}°`);
}
