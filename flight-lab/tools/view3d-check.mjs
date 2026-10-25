// FLIGHT LAB — tools/view3d-check.mjs : the three.js view checked on its own, whatever renderer the app chose.
// Builds, opens outputs/FLIGHT-LAB.html (file://, the network blocked except Google's tile host, which is answered
// with the offline fixture in test/fixtures: not Google data) in headless Chromium with software WebGL, and in the
// page makes a three.js scene in a container of its own over everything (FL.view3d.createScene). The app keeps
// flying its own lesson underneath (its own view hidden, so that it costs nothing); the check draws that lesson's
// state from free-flight starts, in the cockpit, outside and under the hood, with both aircraft, and checks:
//  - no page errors, no console errors, no WebGL errors after the frames; the scenery built (ready());
//  - the 3D G1000's own canvases drawn (lit pixels, as the browser test asks of the 2D panel);
//  - the camera in FLIGHT LAB's frame: the eye at the pilot's seat, project() of a label agreeing with camera().VP;
//  - a click on a control (aimed at by its aim point) reaching onAction, the wheel over a knob, a switch applied, and
//    a click while the right button holds the zoom; the zoom turning towards the cursor and back;
//  - the 3D G1000 drawing FLIGHT LAB's own notes (教材表示, （教材）, 未実装), the same ones as the 2D panel;
//  - the aircraft's outside lights following the cockpit's switches (the master first);
//  - the landmarks' labels hidden where the cockpit hides them from the eye (not in the chase view);
//  - a scene whose scenery cannot be built (a picture that will not decode): a plain ground, the error reported;
//  - Google's hook: a raw-GL triangle drawn by a stand-in extra() at a known place, seen where project() puts it;
//    then the real google3d.js with the fixture: tiles decoded, drawn through the hook (drawn > 0).
// Saves a PNG of each view. Software rendering: a frame takes a second or more; the pictures are right, the frame
// rate is not meaningful.
//   node tools/view3d-check.mjs [out-dir] [--size 960x540] [--quality low] [--only name,name]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from '../build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
let chromium = null;
for (const p of [process.env.PLAYWRIGHT, 'playwright', '/opt/node22/lib/node_modules/playwright'].filter(Boolean)) { try { ({ chromium } = require(p)); break; } catch (e) { /* try the next */ } }
if (!chromium) { console.error('Playwright not found (set PLAYWRIGHT to its module path)'); process.exit(1); }

const args = process.argv.slice(2), outDir = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : 'view3d-check');
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [W, H] = opt('--size', '960x540').split('x').map(Number);
const QUALITY = opt('--quality', 'low');
const only = opt('--only', '') ? opt('--only', '').split(',') : null;
const FX = path.join(here, '..', 'test', 'fixtures');
const KEY = ['AIza', 'FAKE_FIXTURE_KEY_', '0123456789abcdefgh'].join('');

// name, free-flight start, aircraft, view, hood
const VIEWS = [
  ['rwy-pa28-cockpit', 'rwy', 'pa28', 'cockpit', false],
  ['rwy-pa28-chase', 'rwy', 'pa28', 'chase', false],
  ['area-pa28-cockpit', 'area', 'pa28', 'cockpit', false],
  ['area-pa28-chase', 'area', 'pa28', 'chase', false],
  ['final-pa28-cockpit', 'final', 'pa28', 'cockpit', false],
  ['final-pa28-hood', 'final', 'pa28', 'chase', true],
  ['rwy-pa44-cockpit', 'rwy', 'pa44', 'cockpit', false],
  ['area-pa44-chase', 'area', 'pa44', 'chase', false],
  ['final-pa44-cockpit', 'final', 'pa44', 'cockpit', false],
];

const results = [], fail = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); if (!ok) fail.push(name); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`); };

const { out } = build({ quiet: true });
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const t0 = Date.now();
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const requests = [];
  await ctx.route(/^https?:/, r => {
    const u = r.request().url(); requests.push(u);
    if (u.startsWith('https://tile.googleapis.com/v1/3dtiles/root.json')) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(path.join(FX, 'root.json')) });
    if (u.startsWith('https://tile.googleapis.com/v1/3dtiles/datasets/FIXTURE/files/tile.glb')) return r.fulfill({ status: 200, contentType: 'model/gltf-binary', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(path.join(FX, 'tile.glb')) });
    return r.abort();
  });
  const page = await ctx.newPage(), errors = [], warnings = [];
  page.on('pageerror', e => errors.push('page: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
  await page.addInitScript(() => {
    try { const k = 'flightlab-prefs-v2', o = JSON.parse(localStorage.getItem(k) || '{}'); Object.assign(o, { ack: true, tour: true, render: 'legacy' }); localStorage.setItem(k, JSON.stringify(o)); } catch (e) { /* storage blocked */ }
  });
  await page.goto('file://' + out);
  await page.waitForFunction(() => window.__lab && __lab.sceneOk(), null, { timeout: 120000 });
  check('FL.view3d defined', await page.evaluate(() => !!(FL.view3d && FL.view3d.createScene && FL.view3d.PRESETS && FL.view3d.ORDER)));
  const probe = await page.evaluate(() => FL.view3d.probe());
  check('probe()', probe.webgl2 && typeof probe.gpu === 'string', probe);
  check('guessPreset(software) is low', await page.evaluate(g => FL.view3d.guessPreset(g), probe.gpu) === 'low');

  // the check's own scene, over everything; the app's view hidden (its canvas then 1 × 1)
  const made = await page.evaluate((quality) => {
    document.getElementById('fly').style.display = 'none';
    const box = document.createElement('div');
    box.id = 'v3check'; box.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:100000;background:#000;overflow:hidden';
    const old = document.createElement('canvas'); old.id = 'v3old'; box.appendChild(old);
    document.body.appendChild(box);
    const t = performance.now(), actions = [];
    const scene = FL.view3d.createScene(box, { replace: old, quality, onAction: (d, c) => actions.push({ d, id: c.id }), canAct: () => true });
    const V = window.__v3 = { scene, actions, gl: scene.gl, glErrors: [], extra: null, hole: null, G: null };
    V.frame = (view, hood) => {
      const L = __lab.lesson();
      V.drawnState = { pos: L.s.pos.slice(), q: L.s.q.slice(), id: L.s.A.id };      // (the app's flight goes on between frames)
      scene.render({ s: L.s, L, view, hood, screen: 'fly', hole: V.hole ? V.hole() : null, extra: V.extra });
      if (V.G && V.G.active()) { V.G.update(scene.camera(), L.s); }
      const e = V.gl.getError(); if (e) V.glErrors.push(e);
      return scene.info();
    };
    return { ms: Math.round(performance.now() - t), domOk: !document.getElementById('v3old') && box.querySelector('canvas#view3d') !== null, info: scene.info() };
  }, QUALITY);
  check('createScene() (sync part)', made.domOk, made);
  // until the textures and the scenery are in (each frame draws what exists)
  let frames = 0;
  const tReady = Date.now();
  while (!(await page.evaluate(() => __v3.scene.ready())) && Date.now() - tReady < 240000) { await page.evaluate(() => __v3.frame('chase', false)); frames++; await page.waitForTimeout(50); }
  const info0 = await page.evaluate(() => __v3.scene.info());
  check('ready() (ground, airfield, buildings, academy, parked aircraft, shaders)', info0.ready, { frames, seconds: Math.round((Date.now() - tReady) / 1000), info: info0, buildMs: await page.evaluate(() => __v3.scene.__test.buildMs()) });

  const shot = async (name) => { await page.screenshot({ path: path.join(outDir, name + '.png') }); };
  const lit = (which) => page.evaluate((w) => {
    const cv = __v3.scene.glass()[w]; if (!cv) return -1;
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0, m = 0;
    for (let i = 0; i < d.length; i += 16) { m++; if (d[i] + d[i + 1] + d[i + 2] > 60) n++; }
    return n / m;
  }, which);
  for (const [name, st, ac, view, hood] of VIEWS) {
    if (only && !only.includes(name)) continue;
    await page.evaluate(([s, a]) => { __lab.free(s, a); __v3.scene.resetLook(); }, [st, ac]);
    let info = null;
    for (let i = 0; i < 4; i++) info = await page.evaluate(([v, h]) => __v3.frame(v, h), [view, hood]);
    await shot(name);
    const extraInfo = { view: info.view, hood: info.hood, calls: info.calls, triangles: info.triangles, fps: info.fps, dpr: info.dpr };
    check(`${name}: drawn`, info.view === (hood ? 'cockpit' : view) && info.calls > 0, extraInfo);
    if (view === 'cockpit' || hood) {
      const pfd = await lit('pfd'), mfd = await lit('mfd');
      check(`${name}: the 3D G1000 drawn (PFD ${pfd.toFixed(2)}, MFD ${mfd.toFixed(2)})`, pfd > 0.2 && mfd > 0.05);
      // the eye at the pilot's seat: FLIGHT LAB's own eye point for this aircraft, within the cockpit's offset
      const eye = await page.evaluate(() => {
        const s = __v3.drawnState, c = __v3.scene.camera(), e = FL.physics.qrot(s.q, [-0.3, 0.62, -0.4]);
        return { d: Math.hypot(c.eye[0] - s.pos[0] - e[0], c.eye[1] - s.pos[1] - e[1], c.eye[2] - s.pos[2] - e[2]) };
      });
      check(`${name}: camera().eye at the seat (${eye.d.toFixed(2)} m from the Archer's eye point)`, eye.d < 0.4);
    }
  }

  // ---- the apron from taxiway A2: the hangars, the tower, the academy, the parked aircraft (the aircraft put there)
  if (!only) {
    await page.evaluate(() => {
      __lab.free('rwy', 'pa28'); __v3.scene.resetLook(); __v3.scene.__test.orbit(95, 0.12, 2.2);
      const P = FL.physics, s = __lab.lesson().s, [n, e] = P.rwyToNE(P.LAB_RWY, 600, 60); s.pos[0] = e; s.pos[2] = -n;
    });
    for (let i = 0; i < 4; i++) await page.evaluate(() => __v3.frame('chase', false));
    await shot('apron-from-a2-chase');
  }

  // ---- the labels and the frames: project() against camera().VP, both in FLIGHT LAB's frame
  await page.evaluate(() => { __lab.free('area', 'pa28'); __v3.scene.resetLook(); });
  for (let i = 0; i < 2; i++) await page.evaluate(() => __v3.frame('chase', false));
  const proj = await page.evaluate(() => {
    const sc = __v3.scene, c = sc.camera(), out = [];
    for (const lab of sc.labels) {
      const p = sc.project(lab.pos), m = c.VP, x = lab.pos;
      const v = [0, 1, 2, 3].map(r => m[r] * x[0] + m[4 + r] * x[1] + m[8 + r] * x[2] + m[12 + r]);
      const euclid = Math.hypot(x[0] - c.eye[0], x[1] - c.eye[1], x[2] - c.eye[2]);
      const W = sc.gl.canvas.clientWidth, H = sc.gl.canvas.clientHeight;
      out.push({ id: lab.id, p, ref: v[3] > 0.5 ? { x: (v[0] / v[3] * 0.5 + 0.5) * W, y: (1 - (v[1] / v[3] * 0.5 + 0.5)) * H, dist: v[3] } : null, euclid });
    }
    return out;
  });
  const agree = proj.every(o => (!o.p && !o.ref) || (o.p && o.ref && Math.abs(o.p.x - o.ref.x) < 0.5 && Math.abs(o.p.y - o.ref.y) < 0.5 && o.p.dist <= o.euclid + 1));
  const seen = proj.filter(o => o.p);
  check(`labels: ${proj.length} (the legacy ids), project() agrees with camera().VP`, proj.length === 6 && agree && seen.length > 0, seen.map(o => ({ id: o.id, x: Math.round(o.p.x), y: Math.round(o.p.y), nm: +(o.p.dist / 1852).toFixed(1) })));
  // the cockpit hides a label under the glareshield (in the chase view it is shown): a landmark 1.4 NM ahead, the
  // aircraft level at 3,000 ft (17° below the eye: on the panel), then 7 NM ahead (3.5° below: over the cowling)
  const hid = await page.evaluate(() => {
    const P = FL.physics, sc = __v3.scene, L = __lab.lesson(), s = L.s, lab = sc.labels[0], out = { id: lab.id };
    const put = (d) => { s.pos[0] = lab.pos[0]; s.pos[1] = 914; s.pos[2] = lab.pos[2] + d; s.q = P.qFromHPB(0, 0, 0); };
    const screen = (p) => { const c = sc.camera(), m = c.VP, x = p; const v = [0, 1, 2, 3].map(r => m[r] * x[0] + m[4 + r] * x[1] + m[8 + r] * x[2] + m[12 + r]); const W = sc.gl.canvas.clientWidth, H = sc.gl.canvas.clientHeight; return v[3] > 0.5 ? { x: Math.round((v[0] / v[3] * 0.5 + 0.5) * W), y: Math.round((1 - (v[1] / v[3] * 0.5 + 0.5)) * H), on: Math.abs(v[0] / v[3]) < 1 && Math.abs(v[1] / v[3]) < 1 } : null; };
    for (const [k, d, view] of [['near', 2593, 'cockpit'], ['far', 12964, 'cockpit'], ['nearChase', 2593, 'chase']]) {
      put(d); __v3.frame(view, false);
      out[k] = { p: sc.project(lab.pos), raw: screen(lab.pos) };
    }
    return out;
  });
  check('labels: hidden where the cockpit hides them (on the panel), shown above the cowling and in the chase view',
    hid.near.raw && hid.near.raw.on && hid.near.p === null && hid.far.p && hid.nearChase.p, hid);
  await page.evaluate(() => { __lab.free('area', 'pa28'); __v3.scene.resetLook(); });
  // the legacy view's own labels, from a legacy scene made on a canvas of its own
  const same = await page.evaluate(() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 16;
    const leg = FL.scene.createScene(cv), a = leg.labels, b = __v3.scene.labels;
    const lose = leg.gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    return { n: a.length, ok: a.length === b.length && a.every((l, i) => l.id === b[i].id && l.label === b[i].label && l.pos.every((v, k) => Math.abs(v - b[i].pos[k]) < 1e-6)) };
  });
  check('labels: the legacy view\'s ids, texts and places', same.ok, same);

  // ---- a click on a control, the wheel over a knob (on the runway, the head at rest)
  await page.evaluate(() => { __lab.free('rwy', 'pa28'); __v3.scene.resetLook(); });
  for (let i = 0; i < 3; i++) await page.evaluate(() => __v3.frame('cockpit', false));
  const aim = async (id) => page.evaluate((i) => __v3.scene.__test.aimAt(i), id);
  const a1 = await aim('pfd.hdg');
  if (a1) { await page.mouse.move(a1.x, a1.y); await page.waitForTimeout(50); await page.evaluate(() => __v3.frame('cockpit', false)); }
  const hover = await page.evaluate(() => ({ id: __v3.scene.__test.hover(), tip: (document.querySelector('#v3check .view3d-tip') || {}).textContent || '', shown: (document.querySelector('#v3check .view3d-tip') || { style: {} }).style.display, cursor: __v3.gl.canvas.style.cursor }));
  check('hover: the control under the cursor, its label by the cursor, a hand', hover.id === 'pfd.hdg' && hover.shown === 'block' && /HDG/.test(hover.tip) && hover.cursor === 'pointer', hover);
  await shot('click-hover-tooltip');
  if (a1) await page.mouse.click(a1.x, a1.y);
  let acts = await page.evaluate(() => __v3.actions.splice(0));
  check('click: pfd.hdg → onAction HDG_SYNC', acts.length === 1 && acts[0].id === 'pfd.hdg' && acts[0].d.type === 'av' && acts[0].d.what === 'HDG_SYNC', acts);
  const a2 = await aim('pfd.alt.outer');
  if (a2) { await page.mouse.move(a2.x, a2.y); await page.mouse.wheel(0, -100); await page.waitForTimeout(50); }
  acts = await page.evaluate(() => __v3.actions.splice(0));
  check('wheel: pfd.alt.outer → onAction ALT +1 (1000 ft)', acts.length === 1 && acts[0].d.what === 'ALT' && acts[0].d.dir === 1 && acts[0].d.big === true, acts);
  await page.evaluate(() => __v3.frame('cockpit', false));
  const a3 = await aim('sw.landing');
  if (a3) await page.mouse.click(a3.x, a3.y);
  acts = await page.evaluate(() => __v3.actions.splice(0));
  const sw = await page.evaluate(() => __v3.scene.__test.switches());
  check('click: sw.landing → a switch result, applied to the cockpit\'s switches', acts.length === 1 && acts[0].d.type === 'switch' && acts[0].d.on === true && sw.landing === true, { acts, landing: sw.landing });
  // the outside lights follow the switches (CADET's mapping): the landing light now on; the master off puts all out
  const lights = await page.evaluate(() => {
    const T = __v3.scene.__test, sw = T.parts().cockpit.switches;
    __v3.frame('cockpit', false);
    const on = T.lights();
    sw.master = false; __v3.frame('cockpit', false);
    const off = T.lights();
    sw.master = true; sw.landing = false; __v3.frame('cockpit', false);
    return { on, off, back: T.lights() };
  });
  check('lights: the outside lights follow the switches (landing on with its switch; master off → all out)',
    lights.on.landing && lights.on.nav && lights.on.beacon && lights.on.strobe && !lights.on.taxi && Object.values(lights.off).every(v => v === false) && lights.back.nav && !lights.back.landing, lights);
  // FLIGHT LAB's own notes on the 3D G1000, as on the 2D panel (CADET's screens would take them out): every text the
  // screens draw over a few frames, read through the context's fillText; the app's own 2D panel (drawn underneath
  // meanwhile, hidden) for comparison
  const notes = await page.evaluate(async () => {
    const proto = CanvasRenderingContext2D.prototype, orig = proto.fillText, g = __v3.scene.glass(), seen = { pfd: new Set(), mfd: new Set(), pfd2: new Set(), mfd2: new Set() };
    const p2 = document.getElementById('pfd'), m2 = document.getElementById('mfd');
    proto.fillText = function (t, ...a) {
      const k = this.canvas === g.pfd ? 'pfd' : this.canvas === g.mfd ? 'mfd' : this.canvas === p2 ? 'pfd2' : this.canvas === m2 ? 'mfd2' : null;
      if (k && typeof t === 'string') seen[k].add(t);
      return orig.call(this, t, ...a);
    };
    try { for (let i = 0; i < 5; i++) { __v3.frame('cockpit', false); await new Promise(r => setTimeout(r, 150)); } } finally { proto.fillText = orig; }
    const own = { pfd: Object.getOwnPropertyDescriptor(g.pfd.getContext('2d'), 'fillText') };
    const pick = k => [...seen[k]].filter(t => /教材|未実装|架空訓練点/.test(t));
    return { pfd: pick('pfd'), mfd: pick('mfd'), pfd2: pick('pfd2'), mfd2: pick('mfd2'), n: { pfd: seen.pfd.size, mfd: seen.mfd.size, pfd2: seen.pfd2.size }, accessor: !!(own.pfd && own.pfd.get && own.pfd.set) };
  });
  const in3d = new Set([...notes.pfd, ...notes.mfd]), missing = [...notes.pfd2, ...notes.mfd2].filter(t => !in3d.has(t));
  check('3D G1000: FLIGHT LAB\'s own notes, as the 2D panel draws them (教材表示, （教材）, 未実装)',
    notes.accessor && notes.pfd.some(t => t.includes('教材表示')) && notes.pfd.some(t => t.includes('（教材）')) && notes.mfd.some(t => t.includes('未実装')) && notes.mfd.includes('— = 未実装（架空値は出しません）') && notes.pfd2.length > 0 && missing.length === 0,
    { pfd: notes.pfd, mfd: notes.mfd, missing, n: notes.n });
  // a drag looks round (no act), a double-click looks ahead again
  await page.mouse.move(480, 200); await page.mouse.down(); await page.mouse.move(380, 180, { steps: 4 }); await page.mouse.up();
  const looked = await page.evaluate(() => ({ n: __v3.actions.length }));
  await page.evaluate(() => __v3.frame('cockpit', false));
  await shot('cockpit-looked-right');
  await page.mouse.dblclick(480, 200);
  check('drag: looks round without acting', looked.n === 0);

  // ---- the right button held (the zoom): a left click still works a control (Chrome reports that press and release
  // as pointermove), and the zoom turns the head towards what the cursor was on, then back
  await page.evaluate(() => { __v3.scene.resetLook(); __v3.frame('cockpit', false); });
  const head0 = await page.evaluate(() => __v3.scene.__test.head());
  const c1 = await aim('pfd.hdg');
  await page.mouse.move(c1.x, c1.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.down(); await page.mouse.up();
  acts = await page.evaluate(() => __v3.actions.splice(0));
  check('click while the right button holds the zoom: pfd.hdg → onAction once', acts.length === 1 && acts[0].id === 'pfd.hdg' && acts[0].d.what === 'HDG_SYNC', acts);
  for (let i = 0; i < 6; i++) await page.evaluate(() => __v3.frame('cockpit', false));
  const zin = await page.evaluate(() => ({ at: __v3.scene.__test.aimAt('pfd.hdg'), head: __v3.scene.__test.head(), W: innerWidth, H: innerHeight }));
  await shot('cockpit-zoom-on-pfd');
  check('zoom: towards the cursor (the HDG knob, under the cursor when pressed, near the middle; the view 30°)',
    zin.at && Math.abs(zin.at.x - zin.W / 2) < zin.W * 0.08 && Math.abs(zin.at.y - zin.H / 2) < zin.H * 0.08 && zin.head.fov < 34 && zin.head.zoom > 0.95, zin);
  await page.mouse.up({ button: 'right' });
  for (let i = 0; i < 6; i++) await page.evaluate(() => __v3.frame('cockpit', false));
  const zout = await page.evaluate(() => __v3.scene.__test.head());
  check('zoom: let go, the head turns back to where it looked', Math.abs(zout.yaw - head0.yaw) < 0.5 && Math.abs(zout.pitch - head0.pitch) < 0.5 && zout.fov > 70 && zout.zoom < 0.05, { before: head0, after: zout });

  // ---- Google's hook with a stand-in: a raw-GL triangle 60 m ahead of the aircraft, in FLIGHT LAB's frame
  await page.evaluate(() => { __lab.free('area', 'pa28'); __v3.scene.resetLook(); });
  for (let i = 0; i < 2; i++) await page.evaluate(() => __v3.frame('cockpit', false));
  const tri = await page.evaluate(() => {
    const gl = __v3.gl, s = __lab.lesson().s, P = FL.physics;
    const f = P.qrot(s.q, [0, 0, -1]), u = P.qrot(s.q, [0, 1, 0]), r = P.qrot(s.q, [1, 0, 0]);
    const c0 = [0, 1, 2].map(k => s.pos[k] + f[k] * 60 + u[k] * 2);
    const vtx = [[-14, -9], [14, -9], [0, 14]].map(([a, b]) => [0, 1, 2].map(k => c0[k] + r[k] * a + u[k] * b));
    const sh = (t, src) => { const h = gl.createShader(t); gl.shaderSource(h, src); gl.compileShader(h); if (!gl.getShaderParameter(h, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(h)); return h; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, '#version 300 es\nlayout(location=0) in vec3 p; uniform mat4 uVP; void main(){ gl_Position = uVP * vec4(p, 1.0); }'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, '#version 300 es\nprecision highp float; out vec4 o; uniform float uGain; void main(){ o = vec4(vec3(1.0, 0.0, 1.0) * uGain, 1.0); }'));
    gl.linkProgram(prog);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vtx.flat()), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    const uVP = gl.getUniformLocation(prog, 'uVP'), uGain = gl.getUniformLocation(prog, 'uGain');
    let calls = 0, lastC = null;
    __v3.extra = (g, c) => { calls++; lastC = { gain: c.gain, eye: Array.from(c.eye), fog: c.fog, fogD: c.fogD }; g.useProgram(prog); g.uniformMatrix4fv(uVP, false, c.VP); g.uniform1f(uGain, c.gain); g.bindVertexArray(vao); g.drawArrays(g.TRIANGLES, 0, 3); };
    const centre = [0, 1, 2].map(k => (vtx[0][k] + vtx[1][k] + vtx[2][k]) / 3);
    __v3.frame('cockpit', false);
    // the pixel where project() puts the triangle's centre, read back at once (the frame not yet shown)
    const p = __v3.scene.project(centre), cv = gl.canvas, k = cv.width / cv.clientWidth;
    const px = new Uint8Array(4); gl.readPixels(Math.round(p.x * k), Math.round(cv.height - p.y * k), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return { calls, lastC, p, px: Array.from(px), err: gl.getError() };
  });
  check('Google hook: the stand-in extra() called once per frame with { VP, eye, fog, fogD, gain }', tri.calls === 1 && tri.lastC && tri.lastC.fogD === 0 && tri.lastC.gain > 0, tri.lastC);
  // (magenta through the tone mapping, the haze and the windshield's reflections: red and blue well above green)
  check('Google hook: the triangle seen where project() puts it (magenta)', tri.px[0] - tri.px[1] > 40 && tri.px[2] - tri.px[1] > 40 && tri.err === 0, { px: tri.px, at: tri.p });
  await shot('google-hook-triangle');
  // the hood hides it (and the outside); the chase view still draws it
  const hooded = await page.evaluate(() => { const n0 = __v3.scene.__test.hookCalls(); __v3.frame('cockpit', true); return __v3.scene.__test.hookCalls() - n0; });
  check('Google hook: not drawn under the hood', hooded === 0);
  await page.evaluate(() => { __v3.extra = null; });

  // ---- the real google3d.js with the fixture: Sanford, through the hook
  await page.evaluate((k) => {
    const G = __v3.G = FL.google3d.create(__v3.gl, { srgb: true });
    __v3.hole = () => G.hole();
    __v3.extra = (gl, c) => G.draw(gl, c);
    G.setKey(k); G.start(); __lab.free('sfb', 'pa28'); __v3.scene.resetLook();
  }, KEY);
  let g = null;
  for (let i = 0; i < 40; i++) {
    g = await page.evaluate(() => { __v3.extra = __v3.G.active() ? (gl, c) => __v3.G.draw(gl, c) : null; __v3.frame('chase', false); return __v3.G.status(); });
    if (g.drawn > 0) break;
    await page.waitForTimeout(250);
  }
  for (let i = 0; i < 3; i++) await page.evaluate(() => __v3.frame('chase', false));
  g = await page.evaluate(() => __v3.G.status());
  check('google3d.js + fixture: tiles drawn through the hook', g.state === 'on' && g.drawn > 0 && /test fixture/.test(g.credits), { state: g.state, drawn: g.drawn, tiles: g.tiles, worker: g.worker, offset: g.offset, credits: g.credits, msg: g.msg });
  await shot('google-fixture-sfb-chase');
  for (let i = 0; i < 3; i++) await page.evaluate(() => __v3.frame('cockpit', false));
  await shot('google-fixture-sfb-cockpit');
  const keyed = requests.filter(u => u.includes('key='));
  check('google3d.js: keyed requests only to tile.googleapis.com', keyed.length >= 2 && keyed.every(u => u.startsWith('https://tile.googleapis.com/')), keyed.length);
  await page.evaluate(() => { __v3.G.stop(true); __v3.extra = null; __v3.hole = null; });

  // ---- a quality change live, then the frame again
  const q = await page.evaluate(() => { __v3.scene.setQuality('medium'); __v3.frame('chase', false); const i = __v3.scene.info(); __v3.scene.setQuality('low'); __v3.frame('chase', false); return { mid: i.preset, now: __v3.scene.quality() }; });
  check('setQuality(): medium, then back to low', q.mid === 'medium' && q.now === 'low', q);

  // ---- a scene whose scenery cannot be built (no picture decodes): it goes on with a plain ground and says so
  const nog = await page.evaluate(async (quality) => {
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:0;top:0;width:240px;height:150px;z-index:100001';
    const old = document.createElement('canvas'); box.appendChild(old); document.body.appendChild(box);
    const proto = HTMLImageElement.prototype, dec = proto.decode;
    proto.decode = function () { return Promise.reject(new Error('view3d-check: a picture that will not decode')); };
    let sc = null;
    try {
      sc = FL.view3d.createScene(box, { replace: old, quality });
      for (let i = 0; i < 200 && !sc.info().error; i++) await new Promise(r => setTimeout(r, 50));
    } finally { proto.decode = dec; }
    const L = __lab.lesson();
    sc.render({ s: L.s, L, view: 'chase', hood: false, screen: 'fly', hole: null, extra: null });
    const w = sc.__test.world(), i = sc.info(), g = w.ground && w.ground.group;
    const out = { error: i.error, ready: i.ready, ground: g ? g.name : null, inScene: !!(g && g.parent), calls: i.calls };
    const lose = sc.gl.getExtension('WEBGL_lose_context'); box.remove(); if (lose) lose.loseContext();
    return out;
  }, QUALITY);
  check('scenery that cannot be built: a plain ground, info().error, the frame drawn, not ready', nog.error && !nog.ready && nog.ground === 'ground-plain' && nog.inScene && nog.calls > 0, nog);

  // ---- a scene that fails half-way (the cockpit cannot be built) throws, and leaves the page as it was
  const broken = await page.evaluate((quality) => {
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:120px';
    const old = document.createElement('canvas'); box.appendChild(old); document.body.appendChild(box);
    const before = box.innerHTML, W = FL.avionics.WAYPOINTS;
    let msg = null;
    FL.avionics.WAYPOINTS = null;
    try { FL.view3d.createScene(box, { replace: old, quality }); } catch (e) { msg = String(e.message || e); } finally { FL.avionics.WAYPOINTS = W; }
    const same = box.innerHTML === before && box.firstChild === old;
    box.remove();
    return { msg, same };
  }, QUALITY);
  // (the error is the build's own, not one of the clean-up's: dispose() runs before the per-frame state exists)
  check('createScene() that fails: throws its own error, no change to the page', broken.msg && !/before initialization/.test(broken.msg) && broken.same, broken);

  const glErrors = await page.evaluate(() => __v3.glErrors);
  check('no WebGL errors after the frames', glErrors.length === 0, glErrors);
  check('no page or console errors', errors.length === 0, errors);
  check('no app errors (__lab.errors)', (await page.evaluate(() => __lab.errors)).length === 0, await page.evaluate(() => __lab.errors));
  if (warnings.length) console.log('warnings:', [...new Set(warnings)].slice(0, 8).join(' | '));
} finally { await browser.close(); }
console.log(`${results.length - fail.length}/${results.length} passed in ${Math.round((Date.now() - t0) / 1000)} s; pictures in ${outDir}`);
fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 1));
if (fail.length) process.exit(1);
