// Memory over a tour: the car put at each place in turn (LOOPS times round), the page left to settle, then what it holds:
// GPU-side estimates (textures, geometries), the photo files kept and the images still decoded, the near buildings and
// their parts, road chunks, the JS heap. A leak shows as a number that grows lap after lap at the same place.
// W/H the viewport, Q=?q=high (rendered: textures only reach the GPU when drawn), LOOPS=2
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const W = +(process.env.W || 640), H = +(process.env.H || 360), LOOPS = +(process.env.LOOPS || 2);
  const SPOTS = [['関内', 0, 0], ['東神奈川', -761.6, 3467.7], ['戸部', -1670.3, 555.0], ['元町', 693.4, -734.5], ['山下町', 750.2, -169.9], ['横浜駅', -1551.7, 1739.9]];
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2', '--enable-precise-memory-info', '--js-flags=--expose-gc'], proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: W, height: H } });
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, async route => { for (let i = 0; i < 5; i++) { try { const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r }); } catch (e) { await new Promise(r => setTimeout(r, 800 * (i + 1))); } } return route.abort(); });
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  await page.goto('http://127.0.0.1:8765/plateau-three.html' + (process.env.Q || '?q=high'), { waitUntil: 'load' });
  // (drawing here takes seconds a frame: the buildings' set-up, 5 ms a frame in the page, gets 400 ms; the old page has none)
  await page.waitForFunction(() => window.__three, null, { timeout: 120000 }).catch(() => {}); await page.evaluate(() => { if (window.__three.BLD) window.__three.BLD.jobMs = 400; });
  const busy = () => page.evaluate(() => { const T = window.__three; if (!T || !T.enuToWorld(0, 0, 0)) return 99; return Object.values(T.sets).reduce((a, t) => a + t.stats.downloading + t.stats.parsing, 0) + T.BLD.queue.length + T.BLD.jobs.length; });
  const settle = async (min) => { let calm = 0; for (let i = 0; i < min * 6; i++) { await page.waitForTimeout(10000); calm = (await busy()) === 0 ? calm + 1 : 0; if (calm >= 2) return true; } return false; };
  await settle(8);
  for (let lap = 0; lap < LOOPS; lap++) for (const [name, e, n] of SPOTS) {
    await page.evaluate(([e, n]) => { const T = window.__three, C = T.C, p = T.enuToWorld(e, n, 0); C.x = p.x; C.z = p.z; C.v = 0; C.y = T.groundAt(C.x, C.z, T.gridH(C.x, C.z) + 1.5); T.areaNear(); }, [e, n]);
    const ok = await settle(5); await page.waitForTimeout(6000);
    const m = await page.evaluate(() => {
      if (window.gc) window.gc();
      const T = window.__three, R = T.renderer.info, B = T.BLD, tm = T.texMem();
      let parts = 0, partMeshes = 0; B.group.traverse(o => { if (o.isInstancedMesh) { partMeshes++; parts += o.count; } });
      let tiles = 0; for (const t of Object.values(T.sets)) t.group.traverse(o => { if (o.isMesh && o.visible) tiles++; });
      return { tex: R.memory.textures, geo: R.memory.geometries, texGPU_MB: +T.texMB().toFixed(0), photoFiles_MB: +(tm.blob / 1e6).toFixed(0), decoded_MB: +(tm.dec / 1e6).toFixed(0),
        near: B.near.size, nearMeshes: B.idMeshes ? B.idMeshes.size : null, partMeshes, parts, chunks: T.AREA.chunks.filter(c => c.grp).length, areaMB: +(T.AREA.bytes / 1e6).toFixed(0), heapMB: Math.round(performance.memory.usedJSHeapSize / 1e6), meshes: tiles };
    });
    console.log(`MEM lap ${lap} ${name} settled=${ok} ` + JSON.stringify(m));
  }
  await browser.close();
})();
