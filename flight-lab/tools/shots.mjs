// FLIGHT LAB — tools/shots.mjs : the same views every time, for comparing the picture before and after a change.
// Opens outputs/FLIGHT-LAB.html (file://, network blocked) in headless Chromium, starts free flights from fixed places
// and saves the 3D view alone (everything else on the page hidden) and, for the first view, the whole page.
//   node tools/shots.mjs <out-dir> [--size 1280x720] [--only name,name] [--pref key=value ...]
// --pref sets a stored preference before the page starts (e.g. --pref render=legacy, --pref render=three --pref
// quality=low; true / false and numbers are stored as such, e.g. --pref panel2d=true).
// Software rendering (no GPU here): the pictures are right, the frame rate is not meaningful. With the three.js view a
// frame takes seconds, so the shot waits for the view to be ready (textures, world, shaders) and then for a few frames
// drawn after the view was set, instead of a time; the light renderer settles for the seconds given below.
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
const prefs = {}; args.forEach((a, i) => { if (a === '--pref') { const [k, v] = args[i + 1].split('='); prefs[k] = v === 'true' ? true : v === 'false' ? false : /^-?\d+(\.\d+)?$/.test(v) ? +v : v; } });
const FRAMES = 4;   // three.js view: frames drawn after the view is set before the shot (the chase camera eases in)

// name, free-flight start, aircraft, view, seconds to let it settle (the light renderer)
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
    const t0 = Date.now();
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.route(/^https?:/, r => r.abort());
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(p => {
      try { const k = 'flightlab-prefs-v2', o = JSON.parse(localStorage.getItem(k) || '{}'); Object.assign(o, { ack: true, tour: true }, p); localStorage.setItem(k, JSON.stringify(o)); } catch (e) { /* storage blocked */ }
    }, prefs);
    await page.goto('file://' + out);
    await page.waitForFunction(() => window.__lab && __lab.sceneOk(), null, { timeout: 120000 });
    const three = await page.evaluate(() => (__lab.renderer ? __lab.renderer() : 'legacy') === 'three');
    if (three) await page.waitForFunction(() => { const v = __lab.view3d(); return v && v.ready; }, null, { timeout: 300000, polling: 500 });
    await page.evaluate(([s, a]) => __lab.free(s, a), [st, ac]);
    for (let i = 0; i < 2 && await page.evaluate(() => __lab.state().view) !== view; i++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(200); }
    // frames, counted by the page's own animation frames (the app draws once in each)
    if (three) await page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), FRAMES);
    else await page.waitForTimeout(settle * 1000);
    // (a screenshot waits for the next frame the page presents: under the three.js view at the higher presets that
    // can take a minute in software WebGL, more than Playwright's 30 s)
    const shotTimeout = three ? 600000 : 30000;
    if (name === VIEWS[0][0] || (only && name === only[0])) await page.screenshot({ path: path.join(outDir, name + '-page.png'), timeout: shotTimeout });
    // the 3D view alone: hide everything that is not the 3D canvas or one of its ancestors
    await page.evaluate(() => {
      const keep = new Set(); let el = document.getElementById('view3d');
      while (el) { keep.add(el); el = el.parentElement; }
      for (const e of document.body.querySelectorAll('*')) if (!keep.has(e) && !e.contains(document.getElementById('view3d'))) e.style.visibility = 'hidden';
    });
    await page.waitForTimeout(300);
    const box = await page.locator('#view3d').boundingBox();
    await page.screenshot({ path: path.join(outDir, name + '.png'), clip: box, timeout: shotTimeout });
    console.log(`${name}: ${st} ${ac} ${view} ${three ? 'three.js' : 'light'} ${Math.round((Date.now() - t0) / 1000)} s${errors.length ? '  ERRORS ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
} finally { await browser.close(); }
