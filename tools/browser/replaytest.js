// The flight recorder and the replay: a landing flown by the scripted pilot (as flighttest.js) on the test bench,
// then the replay started as from the result screen and run by the page's own frames. Checks: the record covers the
// flight; the replayed aircraft is where the record says (the start, the touchdown); the speed keys and the jump;
// Esc puts the aircraft back where the flight ended and shows the result again. A picture of the replay: SHOT=file.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, route => route.abort());
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.goto('http://127.0.0.1:8765/flight-sim.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ft && typeof game !== 'undefined' && game.state !== 'loading', null, { timeout: 180000 });
  const results = [];
  const check = (name, ok, got) => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}  ${JSON.stringify(got)}`); };
  const fl = await page.evaluate(() => {
    window.__ft.setup({ ac: 'c172', mode: 'landing' });
    const big = false, flareH = 22, vref = ACFT.v.appr; let thr = sim.thr, pI = 0, prevBank = 0, prevPitch = 0; const w180 = a => ((a + 540) % 360) - 180;
    const pilot = (s, c, dt) => { const aim = -c.len / 2 + 300, dist = aim - c.u, tgt = Math.max(0, Math.tan(3 * Math.PI / 180) * dist * 3.28084);
      const hdgCmd = c.rwyHdg + Math.max(-15, Math.min(15, -c.v * 1.2 - c.latV * 3)), bl = c.aglR < 60 ? 4 : 15, bankCmd = c.onGround ? 0 : Math.max(-bl, Math.min(bl, w180(hdgCmd - c.hdg) * 2));
      const ail = (bankCmd - c.bank) * 0.05 - (c.bank - prevBank) / dt * 0.02; prevBank = c.bank;
      let vsCmd = -c.gs * 101.27 * Math.tan(3 * Math.PI / 180) + (tgt - c.aglR) * 6; if (c.aglR < flareH && !c.onGround) vsCmd = Math.max(vsCmd, -Math.max(60, c.aglR * 6));
      pI += (vsCmd - c.vs) * dt * 0.0001; pI = Math.max(-0.3, Math.min(0.3, pI));
      let elev = (vsCmd - c.vs) * 0.0015 + pI - (c.pitch - prevPitch) / dt * 0.05; prevPitch = c.pitch; if (c.onGround) elev = 0.1, pI = 0;
      if (c.aglR < flareH * 0.5 || c.onGround) thr = 0; else thr = Math.max(0.05, Math.min(1, thr + (vref - c.kias) * dt * 0.05));
      s.ovr = { elev, ail, rud: c.onGround ? Math.max(-1, Math.min(1, w180(c.rwyHdg - c.hdg) * 0.08 - c.v * 0.05)) : 0 }; s.thr = thr; s.brake = c.onGround && c.gs < 55; };
    const r = window.__ft.run(220, pilot);
    window.__ft.end();
    const L = REC.list, td = L.findIndex(x => x.gnd);
    game.lastResult = { eyebrow: 'TEST', title: 'test', rows: [['a', 'b']] }; game.state = 'result';
    return { n: L.length, span: +(L[L.length - 1].t - L[0].t).toFixed(1), flight: r.t, td, end: sim.pos.map(v => +v.toFixed(1)), tdRec: L[td] && recPos(L[td]).map(v => +v.toFixed(1)), start: recPos(L[0]).map(v => +v.toFixed(1)) };
  });
  check('the record covers the flight (10 a second)', fl.n > 0 && Math.abs(fl.span - fl.flight) < 1 && fl.n > fl.span * 9, fl);
  // the replay at its start, then at the touchdown
  let a = await page.evaluate(() => { replayStart(); REPLAY.pause = true; replayApply(0); return { st: game.state, pos: sim.pos.map(v => +v.toFixed(1)) }; });
  check('replay starts at the start of the record', a.st === 'replay' && Math.hypot(a.pos[0] - fl.start[0], a.pos[1] - fl.start[1], a.pos[2] - fl.start[2]) < 0.5, { a, start: fl.start });
  a = await page.evaluate((i) => { REPLAY.t = REC.list[i].t; replayApply(0); return sim.pos.map(v => +v.toFixed(1)); }, fl.td);
  check('replay at the touchdown: where the record has it', Math.hypot(a[0] - fl.tdRec[0], a[1] - fl.tdRec[1], a[2] - fl.tdRec[2]) < 0.5, { a, rec: fl.tdRec });
  // the page's own frames play it; the keys
  await page.evaluate(() => { REPLAY.t = REC.list[0].t; REPLAY.pause = false; });
  const t0 = await page.evaluate(() => REPLAY.t); await page.waitForTimeout(3000); const t1 = await page.evaluate(() => REPLAY.t);
  check('the frames play the replay', t1 > t0 + 0.1, { t0, t1 }   // (frames are slow here: a fraction of a second in 3 s));
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  a = await page.evaluate(() => REPLAY.speed);
  check('→ twice: ×4', a === 4, a);
  const tj = await page.evaluate(() => REPLAY.t); await page.keyboard.press('ArrowUp'); const tj2 = await page.evaluate(() => REPLAY.t);
  check('↑: 10 s on', tj2 - tj >= 9.9, { tj, tj2 });
  if (process.env.SHOT) { await page.evaluate((i) => { REPLAY.t = REC.list[Math.max(0, i - 40)].t; REPLAY.pause = true; REPLAY.speed = 1; }, fl.td); await page.waitForTimeout(4000); await page.screenshot({ path: process.env.SHOT, timeout: 120000 }); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  a = await page.evaluate(() => ({ st: game.state, res: !$('result').hidden, pos: sim.pos.map(v => +v.toFixed(1)) }));
  check('Esc: back to the result, the aircraft where the flight ended', a.st === 'result' && a.res && Math.hypot(a.pos[0] - fl.end[0], a.pos[2] - fl.end[2]) < 0.5, { a, end: fl.end });
  console.log(`${results.filter(x => x).length}/${results.length} passed`);
  await browser.close();
  process.exit(results.every(x => x) ? 0 : 1);
})();
