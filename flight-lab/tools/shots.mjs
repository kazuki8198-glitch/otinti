// FLIGHT LAB — tools/shots.mjs : the same views every time, for comparing the picture before and after a change.
// Opens outputs/FLIGHT-LAB.html (file://, network blocked) in headless Chromium, starts free flights from fixed places
// and saves the 3D view alone (everything else on the page hidden) and, for the first view, the whole page.
//   node tools/shots.mjs <out-dir> [--size 1280x720] [--only name,name] [--pref key=value ...]
// --pref sets a stored preference before the page starts (e.g. --pref render=legacy).
// Software rendering (no GPU here): the pictures are right, the frame rate is not meaningful.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from '../build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
let chromium = null;
for (const p of [process.env.PLAYWRIGHT, 'playwright', '/opt/node22/lib/node_modules/playwright'].filter(Boolean)) { try { ({ chromium } = require(p)); break; } catch (e) { /* try the next */ } }
if (!chromium) { console.error('Playwright not found (set PLAYWRIGHT to its module path)'); process.exit(1); }

const args = process.argv.slice(2), outDir = path.resolve(args[0] || 'shots');
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [W, H] = opt('--size', '1280x720').split('x').map(Number);
const only = opt('--only', '') ? opt('--only', '').split(',') : null;
const prefs = {}; args.forEach((a, i) => { if (a === '--pref') { const [k, v] = args[i + 1].split('='); prefs[k] = v; } });

// name, free-flight start, aircraft, view, seconds to let it settle
export const VIEWS = [
  ['01-rwy-cockpit', 'rwy', 'pa28', 'cockpit', 2],
  ['02-rwy-chase', 'rwy', 'pa28', 'chase', 2],
  ['03-pattern-cockpit', 'pattern', 'pa28', 'cockpit', 2],
  ['04-final-cockpit', 'final', 'pa28', 'cockpit', 2],
  ['05-area-chase', 'area', 'pa28', 'chase', 2],
  ['06-area-cockpit', 'area', 'pa28', 'cockpit', 2],
  ['07-final-pa44-cockpit', 'final', 'pa44', 'cockpit', 2],
  ['08-area-pa44-chase', 'area', 'pa44', 'chase', 2],
];

const { out } = build({ quiet: true });
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const [name, st, ac, view, settle] of VIEWS) {
    if (only && !only.includes(name)) continue;
    // a fresh page per view (software WebGL grows the browser's memory over many frames)
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.route(/^https?:/, r => r.abort());
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(p => {
      try { const k = 'flightlab-prefs-v2', o = JSON.parse(localStorage.getItem(k) || '{}'); Object.assign(o, { ack: true, tour: true }, p); localStorage.setItem(k, JSON.stringify(o)); } catch (e) { /* storage blocked */ }
    }, prefs);
    await page.goto('file://' + out);
    await page.waitForFunction(() => window.__lab && __lab.sceneOk(), null, { timeout: 120000 });
    await page.evaluate(([s, a]) => __lab.free(s, a), [st, ac]);
    for (let i = 0; i < 2 && await page.evaluate(() => __lab.state().view) !== view; i++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(200); }
    await page.waitForTimeout(settle * 1000);
    if (name === VIEWS[0][0] || (only && name === only[0])) await page.screenshot({ path: path.join(outDir, name + '-page.png') });
    // the 3D view alone: hide everything that is not the 3D canvas or one of its ancestors
    await page.evaluate(() => {
      const keep = new Set(); let el = document.getElementById('view3d');
      while (el) { keep.add(el); el = el.parentElement; }
      for (const e of document.body.querySelectorAll('*')) if (!keep.has(e) && !e.contains(document.getElementById('view3d'))) e.style.visibility = 'hidden';
    });
    await page.waitForTimeout(300);
    const box = await page.locator('#view3d').boundingBox();
    await page.screenshot({ path: path.join(outDir, name + '.png'), clip: box });
    console.log(`${name}: ${st} ${ac} ${view}${errors.length ? '  ERRORS ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
} finally { await browser.close(); }
