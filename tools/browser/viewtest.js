// screenshots at given places: VIEWS='name@east,north,headingDeg,cam;...' (metres from the Kannai spot; heading: 0 = north, 90 = east)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const W = +(process.env.W || 960), H = +(process.env.H || 540);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'], proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: W, height: H } });
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : p.endsWith('.jpg') ? 'image/jpeg' : p.endsWith('.webp') ? 'image/webp' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, async route => { for (let i = 0; i < 5; i++) { try { const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r }); } catch (e) { await new Promise(r => setTimeout(r, 800 * (i + 1))); } } return route.abort(); });
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE: ' + m.text().slice(0, 300)); });
  await page.goto('http://127.0.0.1:8765/plateau-three.html' + (process.env.Q || '?q=high'), { waitUntil: 'load' });
  const busy = () => page.evaluate(() => { const T = window.__three; if (!T || !T.enuToWorld(0, 0, 0)) return 99; return Object.values(T.sets).reduce((a, t) => a + t.stats.downloading + t.stats.parsing, 0); });
  const settle = async (min) => { let calm = 0; for (let i = 0; i < min * 6; i++) { await page.waitForTimeout(10000); const b = await busy(); calm = b === 0 ? calm + 1 : 0; if (calm >= 3) return true; } return false; };
  await settle(+(process.env.MAXMIN || 10));
  for (const v of (process.env.VIEWS || '').split(';').filter(Boolean)) {
    const [name, rest] = v.split('@'); const [e, n, hd, cam, h0] = rest.split(',').map(Number);
    await page.evaluate(([e, n, hd, cam, h0]) => { const T = window.__three, C = T.C, p = T.enuToWorld(e, n, 0), q = T.enuToWorld(e + Math.sin(hd * Math.PI / 180), n + Math.cos(hd * Math.PI / 180), 0); C.x = p.x; C.z = p.z; C.hdg = C.camYaw = Math.atan2(q.x - p.x, q.z - p.z); C.v = 0; C.cam = cam; C.y = T.groundAt(C.x, C.z, h0); C.h0 = h0; }, [e, n, hd, cam || 0, isNaN(h0) ? 40 : h0]);
    const ok = await settle(+(process.env.MAXMIN2 || 6));
    await page.evaluate(() => { const T = window.__three; T.C.y = T.groundAt(T.C.x, T.C.z, T.C.h0 < 40 ? T.C.y + 1.5 : T.C.y + 20); });
    await page.waitForTimeout(15000);
    await page.screenshot({ path: `v_${name}.png`, timeout: 600000 });
    const info = await page.evaluate(() => ({ hud: document.getElementById('hud').textContent.replace(/\n/g, ' | '), L3: window.__three.L3n, facades: window.__three.facades, texMB: window.__three.texMB().toFixed(0) }));
    console.log('SHOT ' + name + ' settled=' + ok + ' ' + JSON.stringify(info));
  }
  await browser.close();
})();
