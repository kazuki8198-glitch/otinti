// The signals over time (not a still): for junctions near the start, the page's own lamp colours sampled every 0.25 s
// through two cycles. Checked: each axis goes green -> amber (3 s) -> red; the two axes are never green or amber at
// once; between them all red for at least 1.5 s; a pedestrian green only while the traffic along its way has green
// (never with the crossing traffic); every head of an axis shows the same. Prints a timeline of one junction
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'], proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } }); const root = process.env.ROOT || path.resolve(__dirname, '../..');
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, async route => { for (let i = 0; i < 5; i++) { try { const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r }); } catch (e) { await new Promise(r => setTimeout(r, 800)); } } return route.abort(); });
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  await page.goto('http://127.0.0.1:8765/plateau-three.html?norender=1', { waitUntil: 'load' });
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(5000); if (await page.evaluate(() => __three.areaBuilt && __three.FURN.lamps && __three.FURN.lamps.n > 0)) break; }
  const r = await page.evaluate(() => {
    const T = __three, L = T.FURN.lamps, col = L.im.instanceColor.array, n = L.n, groups = new Map();
    for (let i = 0; i < n; i++) { const g = L.list[i * 6 + 4], role = L.list[i * 6 + 5], j = g >> 1; (groups.get(j) || groups.set(j, []).get(j)).push([i, g & 1, role]); }
    const lit = i => { const r = col[i * 3], g = col[i * 3 + 1], b = col[i * 3 + 2]; if (Math.max(r, g, b) < 1) return '-'; return g > r * 1.5 ? 'G' : r > g * 4 ? 'R' : 'Y'; };
    const res = { junctions: 0, samples: 0, errors: [], timeline: [] };
    const juncs = [...groups.entries()].filter(([, ls]) => new Set(ls.map(l => l[1])).size === 2 && ls.some(l => l[2] >= 3)).slice(0, 25);
    res.junctions = juncs.length;
    const T0 = 1e6;
    const hist = new Map();
    for (let k = 0; k <= 480; k++) {
      const now = T0 + k * 250; T.furnLamps(now); res.samples++;
      for (const [j, ls] of juncs) {
        const st = { v: [new Set(), new Set()], p: [new Set(), new Set()] };
        const heads = new Map();
        for (const [i, ax, role] of ls) {
          if (role < 3) { const c = lit(i); if (c !== '-') { const h = heads.get(Math.floor(i / 3) + ':' + ax) || []; h.push(['G', 'Y', 'R'][role]); heads.set(Math.floor(i / 3) + ':' + ax, h); st.v[ax].add(['G', 'Y', 'R'][role]); } }
          else { const c = lit(i); if (c !== '-') st.p[ax].add(role === 4 ? 'G' : 'R'); }
        }
        const v0 = [...st.v[0]].join('') || '(' + ['G', 'Y', 'R'][T.signalState(j * 2, now / 1000)] + ')', v1 = [...st.v[1]].join('') || '(' + ['G', 'Y', 'R'][T.signalState(j * 2 + 1, now / 1000)] + ')', p0 = [...st.p[0]].join(''), p1 = [...st.p[1]].join('');
        if (st.v[0].size > 1 || st.v[1].size > 1) res.errors.push(`t=${k / 4}s junction ${j}: heads of one axis differ (${v0}/${v1})`);
        if (/G|Y/.test(v0) && /G|Y/.test(v1)) res.errors.push(`t=${k / 4}s junction ${j}: both axes moving (${v0} ${v1})`);
        // (an axis without vehicle heads here, e.g. a T-junction's stem with no signalled crossing: its cycle itself)
        const vis = ax => st.v[ax].size ? [...st.v[ax]].join('') : ['G', 'Y', 'R'][T.signalState(j * 2 + ax, now / 1000)];
        for (const ax of [0, 1]) if (st.p[ax].has('G') && vis(ax) !== 'G') res.errors.push(`t=${k / 4}s junction ${j}: pedestrians along axis ${ax} green while its traffic shows ${vis(ax)}`);
        for (const ax of [0, 1]) if (st.p[ax].has('G') && (vis(1 - ax) === 'G' || vis(1 - ax) === 'Y')) res.errors.push(`t=${k / 4}s junction ${j}: pedestrians along axis ${ax} green while the crossing traffic moves`);
        (hist.get(j) || hist.set(j, []).get(j)).push(v0 + '|' + v1 + '|' + p0 + '|' + p1);
      }
    }
    // the sequence per axis: runs of G, Y, R; amber 3 s; all red at least 1.5 s between
    for (const [j, h] of hist) {
      const runs = []; for (const x of h) { if (!runs.length || runs[runs.length - 1][0] !== x) runs.push([x, 1]); else runs[runs.length - 1][1]++; }
      for (const ax of [0, 1]) {
        const seq = h.map(x => x.split('|')[ax].replace(/[()]/g, '')); const rr = []; for (const x of seq) { if (!rr.length || rr[rr.length - 1][0] !== x) rr.push([x, 1]); else rr[rr.length - 1][1]++; }
        for (let i = 1; i + 1 < rr.length; i++) { const [a] = rr[i - 1], [b, len] = rr[i], [c] = rr[i + 1];
          if (b === 'Y' && !(a === 'G' && c === 'R')) res.errors.push(`junction ${j} axis ${ax}: amber between ${a} and ${c}`);
          if (b === 'Y' && Math.abs(len / 4 - 3) > 0.3) res.errors.push(`junction ${j} axis ${ax}: amber ${len / 4} s`);
          if (b === 'G' && a !== 'R') res.errors.push(`junction ${j} axis ${ax}: green after ${a}`); }
      }
      const both = h.map(x => x.split('|')); let allRed = 0, minAllRed = 99;
      for (const [a0, a1] of both) { const v0 = a0.replace(/[()]/g, ''), v1 = a1.replace(/[()]/g, ''); if (v0 === 'R' && v1 === 'R') allRed++; else if (allRed) { minAllRed = Math.min(minAllRed, allRed / 4); allRed = 0; } }
      if (minAllRed < 1.5) res.errors.push(`junction ${j}: all red only ${minAllRed} s between the axes`);
      if (!res.timeline.length) { let last = null; h.forEach((x, k) => { if (x !== last) { res.timeline.push(`${(k / 4).toFixed(2)} s  車両(軸0) ${x.split('|')[0]}  車両(軸1) ${x.split('|')[1]}  歩行者(軸0) ${x.split('|')[2] || '-'}  歩行者(軸1) ${x.split('|')[3] || '-'}`); last = x; } }); }
    }
    return res;
  });
  console.log(`junctions ${r.junctions}, samples ${r.samples}, errors ${r.errors.length}`);
  for (const e of r.errors.slice(0, 20)) console.log('  ' + e);
  console.log('timeline of one junction (in brackets: an axis with no vehicle head here, its cycle):'); for (const t of r.timeline.slice(0, 30)) console.log('  ' + t);
  await browser.close();
  process.exit(r.errors.length ? 1 : 0);
})();
