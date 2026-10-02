// a long drive with the page's own driving (keys pressed by a route follower): ROUTES=a.json,b.json (looped), MIN=minutes.
// Logs each 30 s: where, speed, off the route, the car's height against the way's profile, chunks held / MB, JS heap,
// frame times. NORENDER=1 skips drawing (the CPU side only); without it the frames are drawn (SwiftShader here: slow)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2', '--enable-precise-memory-info'], proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 640, height: 360 } });
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, async route => { for (let i = 0; i < 5; i++) { try { const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r }); } catch (e) { await new Promise(r => setTimeout(r, 800 * (i + 1))); } } return route.abort(); });
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  await page.goto('http://127.0.0.1:8765/plateau-three.html' + (process.env.NORENDER === '0' ? '?q=high' : '?norender=1'), { waitUntil: 'load' });
  for (let i = 0; i < 90; i++) { await page.waitForTimeout(5000); if (await page.evaluate(() => __three.areaBuilt)) break; }
  const pts = process.env.ROUTES.split(',').flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  await page.evaluate(pts => {
    const T = __three, C = T.C, W = pts.map(([e, n, h]) => { const p = T.enuToWorld(e, n, h); return [p.x, p.y, p.z]; });
    const p0 = W[0], p1 = W[3]; C.x = p0[0]; C.z = p0[2]; C.hdg = C.camYaw = Math.atan2(p1[0] - p0[0], p1[2] - p0[2]); C.v = 0; T.areaNear(); T.gatherHits(); C.y = T.groundAt(C.x, C.z, p0[1] + 1);
    const A = window.__auto = { i: 0, laps: 0, stuck: 0, teleports: 0, maxOff: 0, maxDy: 0, lastI: 0, lastT: performance.now(), log: [] };
    window.__autodrive = () => {
      const K = T.keys; let best = A.i, bd = 1e9;
      for (let k = A.i; k < Math.min(W.length, A.i + 40); k++) { const d = Math.hypot(W[k][0] - C.x, W[k][2] - C.z); if (d < bd) { bd = d; best = k; } }
      A.i = best; if (A.i >= W.length - 4) { A.i = 0; A.laps++; }
      let j = A.i, run = 0; while (j < W.length - 1 && run < 12) { run += Math.hypot(W[j + 1][0] - W[j][0], W[j + 1][2] - W[j][2]); j++; }
      const want = Math.atan2(W[j][0] - C.x, W[j][2] - C.z); let err = ((want - C.hdg + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      K.ArrowLeft = err > 0.04; K.ArrowRight = err < -0.04;
      const target = Math.abs(err) > 0.3 ? 6 : 13; K.ArrowUp = C.v < target; K.ArrowDown = C.v > target + 3;
      A.maxOff = Math.max(A.maxOff, bd); A.maxDy = Math.max(A.maxDy, Math.abs(C.y - W[A.i][1]));
      const now = performance.now();
      if (A.i !== A.lastI) { A.lastI = A.i; A.lastT = now; }
      else if (now - A.lastT > 15000) {                                  // (stuck 15 s: put back on the route further on, counted)
        const k = Math.min(W.length - 2, A.i + 10); C.x = W[k][0]; C.z = W[k][2]; C.y = W[k][1]; C.vy = 0; C.v = 0; C.hdg = Math.atan2(W[k + 1][0] - W[k][0], W[k + 1][2] - W[k][2]);
        A.i = k; A.teleports++; A.lastT = now;
      }
    };
  }, pts);
  const t0 = Date.now(), MIN = +(process.env.MIN || 10);
  while (Date.now() - t0 < MIN * 60000) {
    await page.waitForTimeout(30000);
    const s = await page.evaluate(() => {
      const T = __three, A = window.__auto, AR = T.AREA, fr = []; const C = T.C;
      return { t: Math.round(performance.now() / 1000), i: A.i, laps: A.laps, kmh: Math.round(Math.abs(C.v) * 3.6), maxOff: +A.maxOff.toFixed(1), maxDy: +A.maxDy.toFixed(2), teleports: A.teleports,
        chunks: AR.chunks.filter(c => c.grp).length, made: AR.made, freed: AR.freed, areaMB: +(AR.bytes / 1e6).toFixed(1), heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(0) : null, hud: document.getElementById('hud').textContent.split('\n')[0] };
    });
    console.log('T+' + Math.round((Date.now() - t0) / 1000) + 's ' + JSON.stringify(s));
    await page.evaluate(() => { window.__auto.maxOff = 0; window.__auto.maxDy = 0; });
  }
  await browser.close();
})();
