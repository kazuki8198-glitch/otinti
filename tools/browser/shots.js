// Screenshots at fixed places and views, for before/after comparisons. SHOTS=file.json: [{ name, e, n, hdg, cam } |
// { name, e, n, cam: 'free', at: [e, n, up above ground], look: [e, n, up above ground], fov }, each with an optional
// pre: a function body run in the page first, T = window.__three] (east/north metres from
// the Kannai spot; hdg in degrees from north, clockwise; cam 0 behind the car, 1 the driver's seat, 2 high behind).
// OUT=dir, W/H the viewport (the page's internal size at 100 %), Q=?q=high, ROOT=the checkout to serve (another commit's
// worktree for "before"). Each shot: the page settled (tiles loaded), then a frame; its HUD line logged with it
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const W = +(process.env.W || 1280), H = +(process.env.H || 720), out = process.env.OUT || '.';
  const shots = JSON.parse(fs.readFileSync(process.env.SHOTS, 'utf8'));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'], proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: W, height: H } });
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.jpg') ? 'image/jpeg' : p.endsWith('.webp') ? 'image/webp' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, async route => { for (let i = 0; i < 5; i++) { try { const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r }); } catch (e) { await new Promise(r => setTimeout(r, 800 * (i + 1))); } } return route.abort(); });
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE: ' + m.text().slice(0, 200)); });
  await page.goto('http://127.0.0.1:8765/plateau-three.html' + (process.env.Q || '?q=high'), { waitUntil: 'load' });
  // (drawing here takes seconds a frame: the buildings' set-up, 5 ms a frame in the page, gets 400 ms; the old page has none)
  await page.waitForFunction(() => window.__three, null, { timeout: 120000 }).catch(() => {}); await page.evaluate(() => { if (window.__three.BLD) window.__three.BLD.jobMs = 3000; });
  const busy = () => page.evaluate(() => { const T = window.__three; if (!T || !T.enuToWorld(0, 0, 0)) return 99; return Object.values(T.sets).reduce((a, t) => a + t.stats.downloading + t.stats.parsing, 0) + (T.BLD ? T.BLD.queue.length + (T.BLD.jobs ? T.BLD.jobs.length : 0) : 0); });
  const settle = async (min) => { let calm = 0; for (let i = 0; i < min * 6; i++) { await page.waitForTimeout(10000); calm = (await busy()) === 0 ? calm + 1 : 0; if (calm >= 2) return true; } return false; };
  await settle(+(process.env.MAXMIN || 8));
  let last = null;
  for (const s of shots) {
    await page.evaluate(s => {
      const T = window.__three, C = T.C, p = T.enuToWorld(s.e, s.n, 0), hd = (s.hdg || 0) * Math.PI / 180, q = T.enuToWorld(s.e + Math.sin(hd), s.n + Math.cos(hd), 0);
      C.x = p.x; C.z = p.z; C.hdg = C.camYaw = Math.atan2(q.x - p.x, q.z - p.z); C.v = 0; C.cam = s.cam === 'free' ? 0 : s.cam || 0; C.y = T.groundAt(C.x, C.z, T.gridH ? T.gridH(C.x, C.z) + 1.5 : 30);
      if (s.cam === 'free') { const a = T.enuToWorld(s.at[0], s.at[1], 0), b = T.enuToWorld(s.look[0], s.look[1], 0); const ga = T.groundAt(a.x, a.z, C.y + 3), gb = T.groundAt(b.x, b.z, C.y + 3); window.__camAt = [a.x, ga + s.at[2], a.z, b.x, gb + s.look[2], b.z, s.fov || 55]; }
      else window.__camAt = null;
      if (s.pre) new Function('T', s.pre)(T);
      T.areaNear();
    }, s);
    const moved = !last || Math.hypot(s.e - last.e, s.n - last.n) > 60;
    const ok = await settle(moved ? +(process.env.MAXMIN2 || 5) : 1);
    // the ground again, now the place's roads and DEM are in (measured before they came, a far move put the camera under it)
    await page.evaluate(s => {
      const T = window.__three, C = T.C; C.y = T.groundAt(C.x, C.z, T.gridH ? T.gridH(C.x, C.z) + 1.5 : 30);
      if (s.cam === 'free') { const a = T.enuToWorld(s.at[0], s.at[1], 0), b = T.enuToWorld(s.look[0], s.look[1], 0); const ga = T.groundAt(a.x, a.z, T.gridH(a.x, a.z) + 3), gb = T.groundAt(b.x, b.z, T.gridH(b.x, b.z) + 3); window.__camAt = [a.x, ga + s.at[2], a.z, b.x, gb + s.look[2], b.z, s.fov || 55]; }
    }, s);
    await page.waitForTimeout(8000);
    await page.screenshot({ path: path.join(out, s.name + '.png'), timeout: 600000 });
    const info = await page.evaluate(() => ({ hud: document.getElementById('hud').textContent.replace(/\n/g, ' | '), near: window.__three.BLD ? window.__three.BLD.near.size : null }));
    console.log('SHOT ' + s.name + ' settled=' + ok + ' ' + JSON.stringify({ ...s, ...info }));
    last = s;
  }
  await browser.close();
})();
