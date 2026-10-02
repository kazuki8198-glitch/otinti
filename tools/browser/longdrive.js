// A long drive with the page's own physics and collisions; a route follower presses the keys (pure pursuit, its
// speed planned from the route's curvature ahead, backing up when it is stuck). ROUTES=a.json,b.json (looped; ONCE=1 drives it once and stops, for a stretch), MIN=minutes,
// TELEPORT=1 lets it put the car back on the route after 25 s stuck (counted apart: a drive "without help" has none).
// Logged: each stop (under 0.5 m/s for 2 s) and each height off the way's profile by more than 1 m, with where (east,
// north, route point, way id and kind), the car's height, every surface under it, what it hit, what was still loading,
// the keys and the steering. NORENDER=0 draws the frames (SwiftShader here: slow)
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
  // start: put at the route's start and let the tiles round it load
  await page.evaluate(([pts, teleport, once]) => {
    const T = __three, C = T.C, W = pts.map(([e, n, h]) => { const p = T.enuToWorld(e, n, h); return [p.x, p.y, p.z]; });
    const p0 = W[0], p1 = W[3]; C.x = p0[0]; C.z = p0[2]; C.hdg = C.camYaw = Math.atan2(p1[0] - p0[0], p1[2] - p0[2]); C.v = 0; T.areaNear(); T.gatherHits(); C.y = T.groundAt(C.x, C.z, p0[1] + 1);
    const A = window.__auto = { W, pts, i: 0, laps: 0, dist: 0, lastX: C.x, lastZ: C.z, slowT: 0, backUntil: 0, stops: [], dy: [], recov: 0, teleports: 0, stuckSince: 0, hold: true, maxOff: 0 };
    const busy = () => Object.values(T.sets).reduce((a, t) => a + t.stats.downloading + t.stats.parsing, 0);
    const snap = (why, now) => {
      const k = Math.min(A.i, W.length - 1), q = A.pts[k];
      return { why, t: +(now / 1000).toFixed(1), i: k, e: +q[0].toFixed(1), n: +q[1].toFixed(1), way: q[3], hw: q[4], kind: q[5], carY: +C.y.toFixed(2), wayY: +W[k][1].toFixed(2), off: +Math.hypot(W[k][0] - C.x, W[k][2] - C.z).toFixed(2),
        surfaces: T.surfacesAt(C.x, C.z, C.y), hit: C.hitAt && now - C.hitAt < 3000 ? C.hitBy : null, busy: busy(), bvhQueue: T.bvhQueueLen(),
        keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].filter(x => T.keys[x]).join('+'), steer: +C.steer.toFixed(2), v: +C.v.toFixed(2), err: +A.err.toFixed(2), target: +A.target.toFixed(1) };
    };
    A.err = 0; A.target = 0;
    window.__autodrive = () => {
      const now = performance.now(), K = T.keys;
      if (A.hold) { K.ArrowUp = K.ArrowDown = K.ArrowLeft = K.ArrowRight = false; return; }
      let best = A.i, bd = 1e9;
      for (let k = A.i; k < Math.min(W.length, A.i + 40); k++) { const d = Math.hypot(W[k][0] - C.x, W[k][2] - C.z); if (d < bd) { bd = d; best = k; } }
      A.i = best; A.maxOff = Math.max(A.maxOff, bd); if (A.i >= W.length - 4) { if (once) { A.hold = true; A.done = true; return; } A.i = 0; A.laps++; }
      A.dist += Math.hypot(C.x - A.lastX, C.z - A.lastZ); A.lastX = C.x; A.lastZ = C.z;
      const ld = Math.min(14, Math.max(5, 4 + 0.6 * Math.abs(C.v)));
      let j = A.i, run = 0; while (j < W.length - 1 && run < ld) { run += Math.hypot(W[j + 1][0] - W[j][0], W[j + 1][2] - W[j][2]); j++; }
      const want = Math.atan2(W[j][0] - C.x, W[j][2] - C.z); const err = ((want - C.hdg + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; A.err = err;
      // the speed: from the turning over the next 30 m (3 m/s² sideways at most), 13 m/s at most; slow while far off the heading
      let turn = 0, d0 = 0, h0 = null;
      for (let k = A.i; k < Math.min(W.length - 1, A.i + 40) && d0 < 30; k++) { const h = Math.atan2(W[k + 1][0] - W[k][0], W[k + 1][2] - W[k][2]); if (h0 !== null) turn = Math.max(turn, Math.abs(((h - h0 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) / Math.max(d0, 4)); else h0 = h; d0 += Math.hypot(W[k + 1][0] - W[k][0], W[k + 1][2] - W[k][2]); }
      A.target = Math.min(13, Math.sqrt(3 / Math.max(turn, 1e-3)), Math.abs(err) > 0.5 ? 3 : 13);
      if (now < A.backUntil) { K.ArrowUp = false; K.ArrowDown = true; K.ArrowLeft = err < 0; K.ArrowRight = err > 0; return; }
      K.ArrowLeft = err > 0.03; K.ArrowRight = err < -0.03; K.ArrowUp = C.v < A.target; K.ArrowDown = C.v > A.target + 2;
      // stuck: back up 1.5 s (steering the other way), counted; after 25 s still stuck, put on the route if allowed
      if (Math.abs(C.v) < 0.5) { if (!A.slowT) A.slowT = now; if (!A.stuckSince) A.stuckSince = now; } else { A.slowT = 0; if (Math.abs(C.v) > 2) A.stuckSince = 0; }
      if (A.slowT && now - A.slowT > 2000) { A.stops.push(snap('止まった', now)); A.recov++; A.backUntil = now + 1500; A.slowT = 0; }
      if (teleport && A.stuckSince && now - A.stuckSince > 25000) { const k = Math.min(W.length - 2, A.i + 10); A.stops.push(snap('位置を戻した', now)); C.x = W[k][0]; C.z = W[k][2]; C.y = W[k][1]; C.vy = 0; C.v = 0; C.hdg = Math.atan2(W[k + 1][0] - W[k][0], W[k + 1][2] - W[k][2]); A.i = k; A.teleports++; A.stuckSince = 0; }
      const dy = C.y - W[A.i][1];
      if (Math.abs(dy) > 1.0 && bd < 3 && (!A.dyLast || now - A.dyLast > 3000)) { A.dyLast = now; A.dy.push(snap('高さのずれ ' + dy.toFixed(2) + ' m', now)); }
    };
  }, [pts, process.env.TELEPORT === '1', process.env.ONCE === '1']);
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(3000); if (await page.evaluate(() => Object.values(__three.sets).reduce((a, t) => a + t.stats.downloading + t.stats.parsing, 0)) === 0) break; }
  await page.evaluate(() => { window.__auto.hold = false; });
  const t0 = Date.now(), MIN = +(process.env.MIN || 10);
  while (Date.now() - t0 < MIN * 60000) {
    await page.waitForTimeout(30000);
    if (await page.evaluate(() => window.__auto.done)) { console.log('END of the route (ONCE=1)'); break; }
    const s = await page.evaluate(() => { const A = window.__auto, AR = __three.AREA, C = __three.C;
      return { i: A.i, laps: A.laps, km: +(A.dist / 1000).toFixed(2), kmh: Math.round(Math.abs(C.v) * 3.6), stops: A.stops.length, backups: A.recov, teleports: A.teleports, heightEvents: A.dy.length, maxOff: +A.maxOff.toFixed(1),
        chunks: AR.chunks.filter(c => c.grp).length, areaMB: +(AR.bytes / 1e6).toFixed(1), heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(0) : null, fps: document.getElementById('hud').textContent.split('\n')[0] }; });
    console.log('T+' + Math.round((Date.now() - t0) / 1000) + 's ' + JSON.stringify(s));
    await page.evaluate(() => { window.__auto.maxOff = 0; });
  }
  const fin = await page.evaluate(() => ({ stops: window.__auto.stops, dy: window.__auto.dy, km: window.__auto.dist / 1000, teleports: window.__auto.teleports, backups: window.__auto.recov, pf: __three.PF }));
  console.log(`SUMMARY km ${fin.km.toFixed(2)}, stops ${fin.stops.length} (backed up ${fin.backups}), put back on the route ${fin.teleports}, height events ${fin.dy.length}`);
  for (const e of fin.stops) console.log('STOP ' + JSON.stringify(e));
  for (const e of fin.dy) console.log('HEIGHT ' + JSON.stringify(e));
  // the frames' JS time by part (mean per frame), and the frames over 50 ms with where their time went
  const pf = fin.pf; console.log('JS per frame (mean ms): ' + Object.entries(pf.sum).map(([k, v]) => `${k} ${(v / pf.frames).toFixed(2)}`).join(', ') + ` (${pf.frames} frames)`);
  console.log(`frames over 50 ms: ${pf.stalls.length}` + (pf.stalls.length >= 300 ? ' (the first 300 kept)' : ''));
  for (const e of pf.stalls.slice().sort((a, b) => b.js - a.js).slice(0, 15)) console.log('STALL ' + JSON.stringify(e));
  await browser.close();
})();
