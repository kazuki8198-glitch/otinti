// One flight under fixed conditions, the same every run: flight-sim.html's test bench (window.__ft) puts an aircraft
// on a 3-degree final at an airport and steps the physics without drawing; a scripted pilot (below) flies the
// glide path and the centreline, flares, closes the throttle, holds the centreline with the rudder and brakes to a
// stop. Printed per case: the touchdown record (descent rate before the wheels pushed back, speed, attitude, drift,
// where, which wheel first, bounces), the landing grade the game gives, and the flight's log.
// A case 'ac:takeoff' starts on the runway instead: full power, rotation at Vr, a climb at a fixed attitude, the gear
// and the flaps up; printed: the take-off run, the speed at lift-off, the climb rate, the phases of the flight.
// CASES=c172,b738 (or c172:takeoff,...) AP=RJTT WIND=east,north (m/s) SEC=150 JSON=out.json ROOT=checkout to serve
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  const cases = (process.env.CASES || 'c172,b738').split(',');
  const wind = process.env.WIND ? process.env.WIND.split(',').map(Number) : null;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 640, height: 360 } });
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, route => route.abort());          // (offline: the embedded terrain and airports only, the same every run)
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.goto('http://127.0.0.1:8765/flight-sim.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ft && typeof game !== 'undefined' && game.state !== 'loading', null, { timeout: 180000 });
  const out = [];
  for (const cs of cases) {
    const [ac, kind] = cs.split(':');
    if (kind === 'takeoff') {
      const info = await page.evaluate(o => window.__ft.setup(o), { ac, ap: process.env.AP || 'RJTT', mode: 'runway', wind });
      const r = await page.evaluate(() => {
        const big = ACFT.v.appr > 100, vr = ACFT.v.rotate, th = big ? 14 : 9;
        let pv = 0, u0 = null, lift = null, at500 = null;
        SYS.run = true; SYS.pbrake = false;
        const pilot = (s, c, dt) => {
          if (u0 === null) u0 = c.u;
          let elev = 0;
          if (c.kias >= vr || !c.onGround) elev = (th - c.pitch) * 0.06 - (c.pitch - pv) / dt * (big ? 0.06 : 0.03);
          pv = c.pitch;
          if (!c.onGround && lift === null) lift = { dist: Math.round(c.u - u0), kias: Math.round(c.kias), t: +c.t.toFixed(1) };
          if (!c.onGround && c.aglR > 100 && c.vs > 0) s.gearDown = false;
          if (c.aglR > 1000 && s.flapIdx > 0) s.flapIdx = 0;
          if (at500 === null && c.aglR >= 500) at500 = { fpm: Math.round(c.vs), kias: Math.round(c.kias), t: +c.t.toFixed(1) };
          const hdgErr = ((c.rwyHdg - c.hdg + 540) % 360) - 180;
          s.ovr = { elev, ail: -c.bank * 0.04, rud: c.onGround ? Math.max(-1, Math.min(1, hdgErr * 0.1 - c.v * 0.05)) : 0 }; s.thr = 1; s.brake = false;
        };
        const res = window.__ft.run(90, pilot);
        return { ...res, lift, at500 };
      });
      console.log(`CASE ${ac} takeoff ${JSON.stringify(info)}`);
      console.log(`  lift-off: ${r.lift ? `${r.lift.dist} m, ${r.lift.kias} kt, ${r.lift.t} s` : 'none'}; at 500 ft: ${r.at500 ? `${r.at500.fpm} fpm, ${r.at500.kias} kt, ${r.at500.t} s` : 'not reached'}; crashed ${r.crashed} ${r.reason || ''}`);
      console.log('  phases: ' + r.phases.map(p => `${p[0]}s ${p[1]}→${p[2]}`).join(', '));
      out.push({ ac, kind, info, ...r });
      await page.evaluate(() => window.__ft.end());
      continue;
    }
    const info = await page.evaluate(o => window.__ft.setup(o), { ac, ap: process.env.AP || 'RJTT', mode: 'landing', wind });
    const r = await page.evaluate(([sec]) => {
      // the scripted pilot: glide path and centreline by attitude targets, speed by throttle, a flare from a height
      // that suits the aircraft, idle, then rudder on the centreline and the brakes
      const big = ACFT.v.appr > 100, flareH = big ? 40 : 22, vref = ACFT.v.appr;
      let thr = sim.thr, pI = 0, prevBank = 0, prevPitch = 0;
      const w180 = a => ((a + 540) % 360) - 180;
      const pilot = (s, c, dt) => {
        const aim = -c.len / 2 + 300, dist = aim - c.u;
        const tgt = Math.max(0, Math.tan(3 * Math.PI / 180) * dist * 3.28084);          // (ft above the runway on the glide path)
        // lateral: a heading toward the centreline, a bank toward that heading, ailerons toward the bank
        const hdgCmd = c.rwyHdg + Math.max(-15, Math.min(15, big ? -c.v * 0.5 - c.latV * 2 : -c.v * 1.2 - c.latV * 3));
        const bl = c.aglR < 60 ? 4 : 15, bankCmd = c.onGround ? 0 : Math.max(-bl, Math.min(bl, w180(hdgCmd - c.hdg) * (big ? 1.0 : 2)));   // (wings nearly level in the last 60 ft)
        const ail = (bankCmd - c.bank) * (big ? 0.025 : 0.05) - (c.bank - prevBank) / dt * (big ? 0.04 : 0.02); prevBank = c.bank;
        // vertical: a descent rate for the glide path, a pitch for the descent rate
        let vsCmd = -c.gs * 101.27 * Math.tan(3 * Math.PI / 180) + (tgt - c.aglR) * 6;
        if (c.aglR < flareH && !c.onGround) vsCmd = Math.max(vsCmd, -Math.max(big ? 160 : 60, c.aglR * (big ? 9 : 6)));
        pI += (vsCmd - c.vs) * dt * (big ? 0.00004 : 0.0001); pI = Math.max(-0.3, Math.min(0.3, pI));
        let elev = (vsCmd - c.vs) * (big ? 0.0006 : 0.0015) + pI - (c.pitch - prevPitch) / dt * 0.05; prevPitch = c.pitch;
        if (c.onGround) elev = big ? -0.05 : 0.1, pI = 0;
        // speed: throttle on the approach, idle in the flare and after
        if (c.aglR < flareH * 0.5 || c.onGround) thr = 0;
        else thr = Math.max(0.05, Math.min(1, thr + (vref - c.kias) * dt * 0.05));
        const rud = c.onGround ? Math.max(-1, Math.min(1, w180(c.rwyHdg - c.hdg) * 0.08 - c.v * 0.05)) : 0;
        s.ovr = { elev, ail, rud }; s.thr = thr; s.brake = c.onGround && c.gs < (big ? 120 : 55);
      };
      return window.__ft.run(sec, pilot);
    }, [+(process.env.SEC || 220)]);
    const td = r.first || r.td;
    console.log(`CASE ${ac} ${JSON.stringify(info)}`);
    console.log(td ? `  touchdown: ${td.fpm} fpm (the old measure: ${td.fpmAfter}), ${Math.round(td.kias)} kt (Vref ${td.vref}), pitch ${td.pitch.toFixed(1)}, bank ${td.bank.toFixed(1)}, drift ${td.latV.toFixed(2)} m/s, crab ${td.crab.toFixed(1)}, u ${Math.round(td.u)} m, v ${td.v.toFixed(1)} m, ${td.paved ? 'runway' : 'off the runway'}, nose first ${td.noseFirst}, bounces ${td.bounces}, tail ${td.tail}` : '  no touchdown');
    console.log(`  crashed ${r.crashed} ${r.reason || ''} stopped ${r.stopped} t ${r.t} s at u ${r.pos[0]} v ${r.pos[1]}`);
    if (r.result) console.log('  grade: ' + r.result.join(' | '));
    console.log('  phases: ' + r.phases.map(p => `${p[0]}s ${p[1]}→${p[2]}`).join(', '));
    out.push({ ac, info, ...r });
    await page.evaluate(() => window.__ft.end());
  }
  if (process.env.JSON) fs.writeFileSync(process.env.JSON, JSON.stringify(out, null, 1));
  await browser.close();
})();
