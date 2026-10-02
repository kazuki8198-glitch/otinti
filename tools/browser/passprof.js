// Where a frame's drawing time goes, pass by pass, here (SwiftShader: the CPU draws; the ratios between passes, not
// the milliseconds, say something about a real GPU, and even they only roughly: a GPU's costs differ by kind). Each
// composer pass and the shadow map's render are followed by gl.finish() and timed; FRAMES frames at a place, VARIANTS
// toggled in turn (none, no shadows, no AO, no near parts...). Also the draw calls and triangles per pass.
// E, N, HDG, CAM (0 behind, 1 driver), W, H, Q=?q=high
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const W = +(process.env.W || 960), H = +(process.env.H || 540), FR = +(process.env.FRAMES || 4);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'], proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: W, height: H } });
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, async route => { for (let i = 0; i < 5; i++) { try { const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r }); } catch (e) { await new Promise(r => setTimeout(r, 800 * (i + 1))); } } return route.abort(); });
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  await page.goto('http://127.0.0.1:8765/plateau-three.html' + (process.env.Q || '?q=high'), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__three, null, { timeout: 120000 }).catch(() => {}); await page.evaluate(() => { if (window.__three.BLD) window.__three.BLD.jobMs = 400; });
  const busy = () => page.evaluate(() => { const T = window.__three; if (!T || !T.enuToWorld(0, 0, 0)) return 99; return Object.values(T.sets).reduce((a, t) => a + t.stats.downloading + t.stats.parsing, 0) + (T.BLD ? T.BLD.queue.length + T.BLD.jobs.length : 0); });
  const settle = async (min) => { let calm = 0; for (let i = 0; i < min * 6; i++) { await page.waitForTimeout(10000); calm = (await busy()) === 0 ? calm + 1 : 0; if (calm >= 2) return true; } return false; };
  await settle(8);
  await page.evaluate(([e, n, hdg, cam]) => {
    const T = window.__three, C = T.C, p = T.enuToWorld(e, n, 0), hd = hdg * Math.PI / 180, q = T.enuToWorld(e + Math.sin(hd), n + Math.cos(hd), 0);
    C.x = p.x; C.z = p.z; C.hdg = C.camYaw = Math.atan2(q.x - p.x, q.z - p.z); C.v = 0; C.cam = cam; C.y = T.groundAt(C.x, C.z, T.gridH(C.x, C.z) + 1.5); T.areaNear();
  }, [+(process.env.E || -827.8), +(process.env.N || 3379.7), +(process.env.HDG || 217), +(process.env.CAM || 0)]);
  await settle(5); await page.waitForTimeout(5000);
  // the timing hooks: each pass, then the shadow map inside the first
  await page.evaluate(() => {
    const T = window.__three, R = T.renderer, gl = R.getContext(), P = window.__pp = { on: false, t: {}, calls: {}, tris: {} };
    const wrap = (name, fn) => (...a) => { if (!P.on) return fn(...a); gl.finish(); const c0 = R.info.render.calls, t0 = R.info.render.triangles, s = performance.now(); const r = fn(...a); gl.finish(); P.t[name] = (P.t[name] || 0) + performance.now() - s; P.calls[name] = (P.calls[name] || 0) + R.info.render.calls - c0; P.tris[name] = (P.tris[name] || 0) + R.info.render.triangles - t0; return r; };
    const names = { RenderPass: 'シーン描画', GTAOPass: 'AO', UnrealBloomPass: '光のにじみ', OutputPass: '出力' };
    for (const p of T.composer.passes) { const n = names[p.constructor.name]; if (n) p.render = wrap(n, p.render.bind(p)); }
    const sm = R.shadowMap; sm.render = wrap('影の描画', sm.render.bind(sm));
  });
  const VARIANTS = (process.env.VARIANTS || 'all,noshadow,noao,noparts').split(',');
  for (const v of VARIANTS) {
    const res = await page.evaluate(async ([v, FR]) => {
      const T = window.__three, P = window.__pp, R = T.renderer, sm = R.shadowMap.enabled, ao = T.ao.enabled, pv = T.BLD.group.visible;
      if (v === 'noshadow') R.shadowMap.enabled = false; if (v === 'noao') T.ao.enabled = false; if (v === 'noparts') T.BLD.group.visible = false;
      if (v === 'noshadow') T.scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      P.t = {}; P.calls = {}; P.tris = {}; P.on = true;
      for (let i = 0; i < FR; i++) await new Promise(r => requestAnimationFrame(r));
      P.on = false;
      R.shadowMap.enabled = sm; T.ao.enabled = ao; T.BLD.group.visible = pv;
      if (v === 'noshadow') T.scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
      const out = {}; for (const k in P.t) out[k] = { ms: +(P.t[k] / FR).toFixed(0), calls: Math.round(P.calls[k] / FR), ktris: Math.round(P.tris[k] / FR / 1000) };
      return out;
    }, [v, FR]);
    const tot = Object.values(res).reduce((a, x) => a + x.ms, 0);
    console.log(`PASS ${v} total ${tot} ms ` + JSON.stringify(res));
  }
  await browser.close();
})();
