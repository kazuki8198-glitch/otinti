// How sharp the photo-textured buildings can be up close: at each place, for every photo-textured building within R m
// of the car, its walls' texels per metre at the photo's full size (sqrt(UV area x W x H / wall area)); 1 m of wall
// filling ~150 px of a 1080p screen at 10 m, anything under ~30 px/m is soft up close and under ~12 px/m a smear.
// Printed: per place the spread (10/50/90 %) and the share under 12 / 30 px/m, the nearest few with their gml_id.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const R = +(process.env.R || 120);
  const SPOTS = JSON.parse(process.env.SPOTS || '[["関内",0,0],["桜木町",-907,422],["馬車道",-381,344],["中華街",435,-433],["野毛",-1107,11],["横浜駅東",-1515,2041],["横浜駅西",-1923,2119],["横浜駅北",-1651,2563],["東神奈川",-761.6,3467.7]]');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'], proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 480, height: 270 } });
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, async route => { for (let i = 0; i < 5; i++) { try { const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r }); } catch (e) { await new Promise(r => setTimeout(r, 800 * (i + 1))); } } return route.abort(); });
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  await page.goto('http://127.0.0.1:8765/plateau-three.html?norender=1', { waitUntil: 'load' });
  const busy = () => page.evaluate(() => { const T = window.__three; if (!T || !T.enuToWorld(0, 0, 0)) return 99; return Object.values(T.sets).reduce((a, t) => a + t.stats.downloading + t.stats.parsing, 0); });
  const settle = async (min) => { let calm = 0; for (let i = 0; i < min * 12; i++) { await page.waitForTimeout(5000); calm = (await busy()) === 0 ? calm + 1 : 0; if (calm >= 2) return true; } return false; };
  await settle(6);
  for (const [name, e, n] of SPOTS) {
    await page.evaluate(([e, n]) => { const T = window.__three, C = T.C, p = T.enuToWorld(e, n, 0); C.x = p.x; C.z = p.z; C.v = 0; C.y = T.groundAt(C.x, C.z, T.gridH(C.x, C.z) + 1.5); T.areaNear(); }, [e, n]);
    const ok = await settle(5);
    const r = await page.evaluate(([R]) => {
      const T = window.__three, C = T.C, by = new Map(), v = new T.THREE.Vector3();
      for (const t of Object.values(T.sets)) t.group.traverse(o => {
        if (!o.isMesh || !o.material || !o.material.map || !o.geometry.attributes.uv || !o.geometry.attributes._batchid) return;
        const im = o.material.map.image, src = im && im.__src; const W = src ? src.W : im && im.width, H = src ? src.H : im && im.height; if (!W) return;
        const g = o.geometry, P = g.attributes.position, U = g.attributes.uv, B = g.attributes._batchid, I = g.index ? g.index.array : null, nt = I ? I.length / 3 : P.count / 3;
        const ids = o.userData.l2 ? o.userData.l2.ids : null, m = o.matrixWorld, p = [0, 1, 2].map(() => new T.THREE.Vector3());
        for (let k = 0; k < nt; k++) {
          const ii = [0, 1, 2].map(j => I ? I[k * 3 + j] : k * 3 + j);
          ii.forEach((i, j) => p[j].fromBufferAttribute(P, i).applyMatrix4(m));
          const dx = p[0].x - C.x, dz = p[0].z - C.z; if (dx * dx + dz * dz > R * R) continue;
          const a = new T.THREE.Vector3().subVectors(p[1], p[0]), b = new T.THREE.Vector3().subVectors(p[2], p[0]), c = a.clone().cross(b), area = c.length() / 2;
          if (area < 1e-3 || Math.abs(c.y / (2 * area)) > 0.3) continue;   // (walls only)
          const u0 = U.getX(ii[0]), v0 = U.getY(ii[0]), uvA = Math.abs((U.getX(ii[1]) - u0) * (U.getY(ii[2]) - v0) - (U.getX(ii[2]) - u0) * (U.getY(ii[1]) - v0)) / 2;
          const bid = B.getX(ii[0]), key = (ids && ids[bid]) || (o.uuid + ':' + bid);
          let q = by.get(key); if (!q) by.set(key, q = { area: 0, px: 0, d: 1e9 }); q.area += area; q.px += uvA * W * H; q.d = Math.min(q.d, Math.sqrt(dx * dx + dz * dz));
        }
      });
      const L = [...by.entries()].filter(([, q]) => q.area > 20).map(([k, q]) => ({ id: String(k).slice(0, 13), d: Math.round(q.d), area: Math.round(q.area), ppm: +Math.sqrt(q.px / q.area).toFixed(1) }));
      L.sort((a, b) => a.ppm - b.ppm); const pc = f => L.length ? L[Math.min(L.length - 1, Math.floor(f * L.length))].ppm : null;
      const near = L.slice().sort((a, b) => a.d - b.d).slice(0, 6);
      return { n: L.length, p10: pc(0.1), p50: pc(0.5), p90: pc(0.9), under12: L.filter(x => x.ppm < 12).length, under30: L.filter(x => x.ppm < 30).length, near };
    }, [R]);
    console.log(`DENSITY ${name} settled=${ok} ` + JSON.stringify(r));
  }
  await browser.close();
})();
