// The autopilot's approach mode (APR): an aircraft put 16 km out on the approach to a runway, 2 km to the side of
// the centre line, heading 30 degrees across it, gear and flaps as the landing mode sets them; the autopilot on,
// APR armed. The physics stepped headless (the test bench); nobody touches the controls (the C172 has no
// autothrottle: a throttle loop holds its approach speed, as its pilot would). Printed per case: when the
// localizer and the glideslope were captured, and where the aircraft was when the autopilot let go at 100 ft
// (off the centre line, off the glide path, speed, descent). Exits 1 if any case missed.
// CASES=c172,b738 AP=RJTT WIND=east,north (m/s) SIDE=2000 (m; negative: the other side)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  const cases = (process.env.CASES || 'c172,b738').split(',');
  const wind = process.env.WIND ? process.env.WIND.split(',').map(Number) : null, side = +(process.env.SIDE || 2000);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, route => route.abort());
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.goto('http://127.0.0.1:8765/flight-sim.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ft && typeof game !== 'undefined' && game.state !== 'loading', null, { timeout: 180000 });
  let bad = 0;
  for (const ac of cases) {
    const info = await page.evaluate(o => window.__ft.setup(o), { ac, ap: process.env.AP || 'RJTT', mode: 'landing', wind });
    const r = await page.evaluate(([side]) => {
      const s = sim, aim = -RWY.len / 2 + 300, u0 = aim - 16000, h0 = 2500 / FT, hdg = (RWY.hdg + (side > 0 ? -30 : 30) + 360) % 360, v = ACFT.v.appr / KTS * 1.15;   // (not sim.ias: the previous case's until the next step)
      const p = rwyToWorld(u0, side, RWY.elev + h0 - WHEEL_BOTTOM);
      s.pos = p; s.q = qFromHPB(hdg, 2, 0); s.vel = [Math.sin(hdg * DEG) * v, 0, -Math.cos(hdg * DEG) * v]; s.w = [0, 0, 0]; s.airTime = 30; s.onGround = false; s.agl = h0;
      game.ap = false; doAction('ap'); doAction('apr'); game.apHdg = hdg;
      const ev = [], vref = ACFT.v.appr;
      let last = { loc: false, gs: false }, at = null;
      const pilot = (s, c) => {
        s.ovr = null;                                                       // (hands off: the autopilot flies)
        const A = game.apr || {};
        if (A.loc && !last.loc) ev.push(['LOC', +c.t.toFixed(1), Math.round(c.u), +c.v.toFixed(0)]);
        if (A.gs && !last.gs) ev.push(['G/S', +c.t.toFixed(1), Math.round(c.u), Math.round(c.aglR)]);
        last = { loc: !!A.loc, gs: !!A.gs };
        if (ACFT.v.cruise <= 150) s.thr = clamp(s.thr + (vref + 5 - c.kias) * 0.0006 - c.vs * 0.000002, 0.05, 1);   // (the C172's pilot on the throttle)
        if (!game.ap && !at) at = { t: +c.t.toFixed(1), u: Math.round(c.u), v: +c.v.toFixed(1), aglR: Math.round(c.aglR), gpErr: +((c.aglR / FT) - Math.tan(3 * DEG) * (aim - c.u)).toFixed(1), kias: Math.round(c.kias), fpm: Math.round(c.vs), bank: +c.bank.toFixed(1) };
      };
      const out = window.__ft.run(700, (s, c, dt) => { pilot(s, c); if (at) s.ovr = { elev: 0, ail: 0, rud: 0 }; }, 0);
      return { ev, at, crashed: out.crashed, reason: out.reason, apOn: game.ap, state: apAprState() };
    }, [side]);
    const ok = r.at && Math.abs(r.at.v) < 10 && Math.abs(r.at.gpErr) < 8 && r.at.fpm > -1100;   // (after the autopilot lets go nobody flares: what happens then is not this test's)
    if (!ok) bad++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${ac} ${JSON.stringify(info)}`);
    console.log('  captures: ' + r.ev.map(e => `${e[0]} at ${e[1]} s (u ${e[2]} m, ${e[0] === 'LOC' ? 'v ' + e[3] + ' m' : e[3] + ' ft'})`).join(', '));
    console.log('  at 100 ft: ' + (r.at ? `${r.at.v} m off the centre line, ${r.at.gpErr} m off the glide path, ${r.at.kias} kt, ${r.at.fpm} fpm, bank ${r.at.bank}, ${r.at.t} s` : `not reached (AP ${r.apOn ? 'still on: ' + r.state : 'off'}) crashed ${r.crashed} ${r.reason || ''}`));
    await page.evaluate(() => window.__ft.end());
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
