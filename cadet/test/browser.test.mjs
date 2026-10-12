// CADET — browser test (node --test): opens outputs/CADET.html from file:// in headless Chromium (software WebGL,
// network blocked) and checks that the world starts with no errors and no requests; that every viewpoint, outdoors and
// in the academy, draws a real picture within the draw budget; that you can walk from briefing room 1 through the door,
// the corridor, the lobby and the automatic doors to today's aircraft on the apron (with the real colliders: a closed
// door stops you); that boards, the aircraft and locked doors answer E; that the pause menu and the settings work;
// that the time of day and the presets switch; and that the bench reports.
// Needs Playwright (PLAYWRIGHT=its module path if it is not installed next to this project); skipped otherwise.
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../build.mjs';
import { loadChromium, openGame } from './shots.mjs';

const chromium = loadChromium();
// the picture's contrast (standard deviation of the luminance, 0–255) and its mean
const analyse = (page, url) => page.evaluate(async (url) => {
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement('canvas'); c.width = 160; c.height = 90; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 160, 90);
  const d = g.getImageData(0, 0, 160, 90).data; let s = 0, s2 = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += y; s2 += y * y; n++; }
  return { mean: s / n, sd: Math.sqrt(s2 / n - (s / n) ** 2) };
}, url);

describe('browser', { skip: !chromium && 'Playwright not found', timeout: 1800000 }, () => {
  let g = null;
  const ev = (fn, arg) => g.page.evaluate(fn, arg);
  before(async () => {
    build({ quiet: true });
    g = await openGame(chromium, { q: 'high', w: 800, h: 450, t: 10 });
    await ev(() => window.__cadet.pause(true));
  });
  after(async () => { if (g) await g.browser.close(); });

  test('it starts walking in briefing room 1', async () => {
    assert.equal(await ev(() => window.__cadet.mode()), 'walk');
    const p = await ev(() => window.__cadet.player());
    assert.equal(p.place, 'ブリーフィング室 1');
    const a = await analyse(g.page, await ev(() => window.__cadet.snapshot(2)));
    assert.ok(a.sd > 8 && a.mean > 40 && a.mean < 235, `start: mean ${a.mean.toFixed(0)} sd ${a.sd.toFixed(1)}`);
  });

  test('every viewpoint, outdoors and inside, draws a picture within budget', async () => {
    const views = await ev(() => window.__cadet.VIEWS.map(v => v.id));
    assert.equal(views.length, 10);
    for (let i = 0; i < views.length; i++) {
      const url = await ev((i) => { window.__cadet.setView(i); return window.__cadet.snapshot(2); }, i);
      const a = await analyse(g.page, url), st = await ev(() => window.__cadet.stats());
      assert.ok(a.sd > 8, `${views[i]}: the picture has no contrast (sd ${a.sd.toFixed(1)})`);
      assert.ok(a.mean > 40 && a.mean < 235, `${views[i]}: too dark or too bright (mean ${a.mean.toFixed(0)})`);
      assert.ok(st.calls < 400, `${views[i]}: ${st.calls} draw calls`);
      assert.ok(st.triangles < 900000, `${views[i]}: ${st.triangles} triangles`);
    }
  });

  test('walk: a closed door stops you; opened with E, the route leads to today\'s aircraft', async () => {
    await ev(() => { const C = window.__cadet; C.setMode('walk'); C.placeWalker(C.spec.start.a, C.spec.start.c, C.spec.start.yawToward); });
    // into the closed door of briefing room 1 without opening it: still in the room, on its side of the wall
    const blocked = await ev(() => window.__cadet.walkRoute([{ a: 643.1, c: 259.5 }, { a: 643.1, c: 262.3 }], { openDoors: false, maxT: 15 }));
    assert.equal(blocked.reached, false);
    assert.ok(blocked.at.c < 261 - 0.045 - 0.28 + 0.01, `went through the closed door: c ${blocked.at.c}`);   // the closed leaf blocks ±4.5 cm
    assert.equal(blocked.place, 'ブリーフィング室 1');
    // the whole route, opening doors the way a player does (look at the door, E)
    await ev(() => { const C = window.__cadet; C.placeWalker(C.spec.start.a, C.spec.start.c, C.spec.start.yawToward); });
    const r = await ev(() => window.__cadet.walkRoute(window.__cadet.spec.route));
    const n = await ev(() => window.__cadet.spec.route.length);
    assert.ok(r.reached, `stopped at ${JSON.stringify(r.at)} (${r.place}) after ${JSON.stringify(r.log.map(l => l.i))}`);
    assert.equal(r.log.length, n);
    assert.deepEqual(r.doors.map(d => [d.door, d.result]), [['d-brief-1', 'opened']]);
    assert.equal(r.place, '駐機場（エプロン）');
    assert.ok(r.t < 120, `the walk took ${r.t} s`);
    assert.ok((await ev(() => window.__cadet.doors())).find(d => d.id === 'd-brief-1').angle !== 0, 'the door stays open');
    // look at the aircraft and examine it
    assert.equal(await ev(() => { const t = window.__cadet.spec.target; return window.__cadet.lookAt(t.a + 0.9, t.c, 1.0); }), 'aircraft:today');
    assert.equal(await ev(() => window.__cadet.use()), 'examined');
    const card = await ev(() => window.__cadet.card());
    assert.match(card.title, /Archer/);
    assert.match(card.text, /KIAS/);
    assert.doesNotMatch(card.title + card.text, /ANA|Acron/);
    assert.equal(await ev(() => window.__cadet.use()), 'closed');
    assert.equal(await ev(() => window.__cadet.card()), null);
    const a = await analyse(g.page, await ev(() => window.__cadet.snapshot(2)));
    assert.ok(a.sd > 8 && a.mean > 40, `by the aircraft: mean ${a.mean.toFixed(0)} sd ${a.sd.toFixed(1)}`);
  });

  test('examine: a whiteboard opens its card; a locked door rattles and stays shut', async () => {
    const it = await ev(() => window.__cadet.spec.interactables.find(x => x.room === 'brief-1'));
    await ev((it) => window.__cadet.placeWalker(it.a + 1.6, it.c, { a: it.a, c: it.c }), it);
    assert.equal(await ev((it) => window.__cadet.lookAt(it.a, it.c, it.y), it), 'ex:' + it.id);
    assert.equal(await ev(() => window.__cadet.use()), 'examined');
    assert.equal((await ev(() => window.__cadet.card())).title, it.title_ja);
    // walking away closes the card
    await ev((it) => window.__cadet.walkRoute([{ a: it.a + 1.6, c: 258.0 }]), it);
    assert.equal(await ev(() => window.__cadet.card()), null);
    // the WC is closed for cleaning
    await ev(() => window.__cadet.placeWalker(633.5, 262.2, { a: 633.5, c: 263.6 }));
    assert.equal((await ev(() => window.__cadet.player())).place, '南の廊下');
    assert.equal(await ev(() => window.__cadet.lookAt(633.5, 263.6, 1.1)), 'door:d-wc');
    assert.equal(await ev(() => window.__cadet.use()), 'locked');
    await ev(() => window.__cadet.simulate(1));
    assert.equal((await ev(() => window.__cadet.doors())).find(d => d.id === 'd-wc').angle, 0);
  });

  test('the pause menu opens and closes; settings apply at once', async () => {
    await ev(() => window.__cadet.menu.open('settings'));
    assert.equal(await ev(() => window.__cadet.menu.isOpen()), true);
    assert.equal(await ev(() => !document.getElementById('menu').hidden), true);
    assert.ok(await ev(() => document.querySelectorAll('#menu input[type=range]').length) >= 3);
    await ev(() => window.__cadet.settings.set('fov', 90));
    await ev(() => window.__cadet.menu.close());
    await ev(() => window.__cadet.simulate(0.1));
    assert.equal(await ev(() => window.__cadet.camera.fov), 90);
    await ev(() => window.__cadet.settings.set('fov', 75));
    assert.equal(await ev(() => window.__cadet.menu.isOpen()), false);
  });

  test('dusk, presets and the bench', async () => {
    // dusk: the sun goes down, the airfield lights come on, still a picture
    await ev(() => { window.__cadet.setView(0); window.__cadet.setTime(19.4); });
    const dusk = await analyse(g.page, await ev(() => window.__cadet.snapshot(2)));
    assert.ok(dusk.sd > 3 && dusk.mean < 160, `dusk: mean ${dusk.mean.toFixed(0)} sd ${dusk.sd.toFixed(1)}`);
    // presets switch without errors (by day: the first frame after a switch must already be a full picture)
    await ev(() => window.__cadet.setTime(10));
    for (const q of ['low', 'ultra', 'high']) {
      await ev((q) => window.__cadet.setQuality(q), q);
      const a = await analyse(g.page, await ev(() => window.__cadet.snapshot(1)));
      assert.ok(a.sd > 8 && a.mean > 40, `preset ${q}: mean ${a.mean.toFixed(0)} sd ${a.sd.toFixed(1)}`);
      assert.equal(await ev(() => window.__cadet.stats().preset), q);
    }
    // the bench: one result per viewpoint
    await ev(() => window.__cadet.pause(false));
    const r = await ev(() => window.__cadet.runBench(1, 1));
    assert.equal(r.views.length, 10);
    for (const v of r.views) assert.ok(v.avgMs > 0 && v.calls > 0 && v.triangles > 0, JSON.stringify(v));
  });

  test('no page errors, no network requests', () => {
    assert.deepEqual(g.errors.filter(e => !/KHR_parallel_shader_compile/.test(e)), [], 'page errors');
    assert.deepEqual(g.requests, [], 'network requests');
  });
});
