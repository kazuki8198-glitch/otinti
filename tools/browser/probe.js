// One place, one question: the page loaded (?norender=1 unless NORENDER=0), the car put at E,N, the tiles and the
// buildings left to settle, then EXPR (a function body run in the page, with T = window.__three) and its result printed
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'], proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 480, height: 270 } });
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, async route => { for (let i = 0; i < 5; i++) { try { const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r }); } catch (e) { await new Promise(r => setTimeout(r, 800 * (i + 1))); } } return route.abort(); });
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 4).join(' < ')));
  await page.goto('http://127.0.0.1:8765/plateau-three.html' + (process.env.NORENDER === '0' ? '?q=high' : '?norender=1'), { waitUntil: 'load' });
  const busy = () => page.evaluate(() => { const T = window.__three; if (!T || !T.enuToWorld(0, 0, 0)) return 99; return Object.values(T.sets).reduce((a, t) => a + t.stats.downloading + t.stats.parsing, 0) + T.BLD.queue.length + T.BLD.jobs.length; });
  const settle = async (min) => { let calm = 0; for (let i = 0; i < min * 12; i++) { await page.waitForTimeout(5000); calm = (await busy()) === 0 ? calm + 1 : 0; if (calm >= 2) return true; } return false; };
  await settle(6);
  await page.evaluate(([e, n]) => { const T = window.__three, C = T.C, p = T.enuToWorld(e, n, 0); C.x = p.x; C.z = p.z; C.v = 0; C.y = T.groundAt(C.x, C.z, T.gridH(C.x, C.z) + 1.5); T.areaNear(); T.gatherHits(); }, [+process.env.E, +process.env.N]);
  await settle(4); await page.waitForTimeout(3000);
  console.log(JSON.stringify(await page.evaluate(src => new Function("T", src)(window.__three), process.env.EXPR).catch(e => 'ERR ' + e.message), null, 0));
  await browser.close();
})();
