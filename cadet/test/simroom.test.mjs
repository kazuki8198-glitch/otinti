// CADET — the training device in the sim room (node --test, Playwright like browser.test.mjs; skipped without
// it): the seat powers the device on and the room's screen lights; a lesson of today's plan runs at the device
// and is recorded as the lesson itself (the same record as the lecturer's path — the pass, the slot, the
// fatigue); a lesson that is not today's runs as a practice and records nothing; and a practice flight in the
// device leaves the cadet back at the desk in the room.
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../build.mjs';
import { loadChromium, openGame } from './shots.mjs';

const chromium = loadChromium();
describe('sim room device', { skip: !chromium && 'Playwright not found', timeout: 600000 }, () => {
  let g = null;
  const ev = (fn, arg) => g.page.evaluate(fn, arg);
  before(async () => {
    build({ quiet: true });
    g = await openGame(chromium, { q: 'low', w: 800, h: 450, t: 10 });
    await ev(() => window.__cadet.pause(true));
  });
  after(async () => { if (g) await g.browser.close(); });

  // the open card's choice labels (the DOM's buttons; __cadet.card() itself carries only title and text)
  const cardChoices = () => ev(() => [...document.querySelectorAll('#card .card-choices button')].map(b => b.textContent.replace(/^\d+/, '')));
  // drive the open dialog to its end, choosing the lesson's right answers (browser.test.mjs's talkThrough way)
  const runDialog = () => ev(() => {
    const C = window.__cadet;
    for (let k = 0; k < 600; k++) {
      const v = C.dialog(); if (!v) return true;
      if (v.choices.length) {
        const act = C.career.activity(), m = /^q(\d+)$/.exec(v.node); let i = 0;
        if (act && m && act.questions[+m[1]]) { const q = act.questions[+m[1]]; i = Math.max(0, v.choices.findIndex(c => c.text === q.opts[q.ok])); }
        C.dialogChoose(i);
      } else C.dialogNext();
      C.simulate(0.05);
    }
    return !C.dialog();
  });
  // stand at the device's station in the sim room and use it (its card opens, its screen lights)
  const openDeviceAtSeat = async () => {
    await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { polling: 100, timeout: 30000 });
    await ev(() => { const C = window.__cadet; C.placeWalker(617.1, 268.0, { a: 616.5, c: 268.0 }); C.lookAt(616.5, 268.0, 1.1); C.simulate(0.05); });
    assert.equal(await ev(() => window.__cadet.current()), 'ex:sim-station');
    await ev(() => { window.__cadet.use(); window.__cadet.simulate(0.05); });
    assert.equal(await ev(() => window.__cadet.career.device.page()), true);
  };

  test('a lesson of today\'s plan runs at the device and is recorded as the lesson itself', async () => {
    await ev(() => window.__cadet.career.set({ state: { chapter: 'ch1', day: 2, slot: 'pm', done: { prologue: 1 } }, flags: { met_instructor: true, has_tablet: true }, place: false }));
    await ev(() => window.__cadet.simulate(0.1));
    assert.equal(await ev(() => window.__cadet.career.device.due()), 'k1');
    const blank = await ev(() => window.__cadet.career.screen('sim'));
    assert.ok(Number.isInteger(blank));
    const beforeFatigue = (await ev(() => window.__cadet.career.state())).fatigue;
    await openDeviceAtSeat();
    const card = await ev(() => window.__cadet.card());
    assert.match(card.title, /訓練装置/);
    const top = await cardChoices();
    assert.ok(top.some(t => /課目/.test(t)) && top.some(t => /飛行練習/.test(t)), JSON.stringify(top));
    // (the room shows it too: the device's screen is lit, its face not the room's idle one)
    assert.equal(await ev(() => window.__cadet.career.device.lit()), true);
    assert.notEqual(await ev(() => window.__cadet.career.screen('sim')), blank);
    // the lessons page: k1 is today's, for real
    await ev(() => window.__cadet.career.device.choose(0));
    const lessons = await cardChoices();
    assert.ok(lessons.some(t => /^k1/.test(t) && /本番/.test(t)), JSON.stringify(lessons));
    await ev(() => window.__cadet.career.device.choose(0));
    assert.deepEqual(await ev(() => window.__cadet.career.activity()), { kind: 'ftd', id: 'k1' });
    const p = await ev(() => window.__cadet.player());
    assert.equal(p.place, '訓練装置室（FTD）');
    assert.ok(Math.abs(p.a - 624.2) < 1.5 && Math.abs(p.c - 267.2) < 1.5, `seated at the desk: ${JSON.stringify(p)}`);
    assert.ok(await runDialog());
    // recorded as the lesson itself: the pass in the flight record, the day's mark, the slot on, the fatigue
    const st = await ev(() => window.__cadet.career.state());
    assert.equal(st.done['ftd:k1'], 2);
    assert.equal(st.slot, 'evening');
    assert.ok(st.fatigue > beforeFatigue, `fatigue ${beforeFatigue} -> ${st.fatigue}`);
    assert.equal((await ev(() => window.__cadet.career.progress())).lessons.k1.pass, true);
    // and the device is off again: its screen back to the room's
    await ev(() => window.__cadet.simulate(0.1));
    assert.equal(await ev(() => window.__cadet.career.device.lit()), false);
    assert.equal(await ev(() => window.__cadet.career.screen('sim')), blank);
  });

  test('a lesson that is not today\'s runs as a practice and records nothing', async () => {
    await openDeviceAtSeat();
    await ev(() => window.__cadet.career.device.choose(0));       // the lessons page
    const lessons = await cardChoices();
    const i = lessons.findIndex(c => /^k2/.test(c.text));
    assert.ok(i >= 0 && /練習/.test(lessons[i]), JSON.stringify(lessons));
    await ev((i) => window.__cadet.career.device.choose(i), i);
    assert.deepEqual(await ev(() => window.__cadet.career.activity()), { kind: 'ftdP', id: 'k2' });
    assert.ok(await runDialog());
    const st = await ev(() => window.__cadet.career.state());
    assert.equal(st.done['ftd:k2'], undefined);
    assert.equal(st.slot, 'evening');                            // (a practice does not move the day on)
    const pr = await ev(() => window.__cadet.career.progress());
    assert.ok(!pr.lessons.k2 || !pr.lessons.k2.pass);
  });

  test('a practice flight in the device, and back to the desk', async () => {
    await openDeviceAtSeat();
    await ev(() => window.__cadet.career.device.choose(1));       // the flight page
    const free = await cardChoices();
    assert.ok(free.some(t => /滑走路から/.test(t)), JSON.stringify(free));
    await ev(() => window.__cadet.career.device.choose(0));       // from the runway, the Archer
    await g.page.waitForFunction(() => window.__cadet.mode() === 'fly' && window.__cadet.fly.status().active, null, { polling: 100, timeout: 30000 });
    assert.equal(await ev(() => window.__cadet.career.device.session()), true);
    await ev(() => window.__cadet.fly.leave());
    await g.page.waitForFunction(() => window.__cadet.mode() === 'walk', null, { polling: 100, timeout: 30000 });
    const p = await ev(() => window.__cadet.player());
    assert.equal(p.place, '訓練装置室（FTD）');
    assert.ok(Math.abs(p.a - 624.2) < 1.5 && Math.abs(p.c - 267.2) < 1.5, `back at the desk: ${JSON.stringify(p)}`);
    assert.equal(await ev(() => window.__cadet.career.device.session()), false);
    assert.equal(await ev(() => window.__cadet.career.device.lit()), false);
  });

  test('the powered device stands by when its card closes — lit, not dead — and やめる powers it down', async () => {
    const blank = await ev(() => window.__cadet.career.screen('sim'));
    await openDeviceAtSeat();
    assert.equal(await ev(() => window.__cadet.career.device.power()), true);
    // walk away from the desk: the card closes, the device stays ON at its standby face
    await ev(() => { window.__cadet.placeWalker(616.5, 264.5, { a: 616.5, c: 268.0 }); window.__cadet.simulate(0.2); });
    assert.equal(await ev(() => window.__cadet.career.device.page()), false);
    assert.equal(await ev(() => window.__cadet.career.device.power()), true, 'still powered');
    assert.equal(await ev(() => window.__cadet.career.device.standby()), true, 'at its standby face');
    assert.equal(await ev(() => window.__cadet.career.device.lit()), true, 'still lit');
    assert.notEqual(await ev(() => window.__cadet.career.screen('sim')), blank);
    // open it again and choose やめる： the power goes off and the screen is the room's again
    await openDeviceAtSeat();
    const top = await cardChoices();
    await ev((i) => window.__cadet.career.device.choose(i), top.length - 1);
    await ev(() => window.__cadet.simulate(0.1));
    assert.equal(await ev(() => window.__cadet.career.device.power()), false);
    assert.equal(await ev(() => window.__cadet.career.device.lit()), false);
    assert.equal(await ev(() => window.__cadet.career.screen('sim')), blank);
  });

  // stand at the full flight simulator's seat and use it
  const openFfsAtSeat = async () => {
    await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { polling: 100, timeout: 30000 });
    await ev(() => { const C = window.__cadet; C.placeWalker(626.5, 272.6, { a: 626.5, c: 274.4 }); C.lookAt(626.5, 273.2, 1.1); C.simulate(0.05); });
    assert.equal(await ev(() => window.__cadet.current()), 'ex:ffs-station');
    await ev(() => { window.__cadet.use(); window.__cadet.simulate(0.05); });
    assert.equal(await ev(() => window.__cadet.career.ffs.page()), true);
  };

  test('the full flight simulator: a 737 practice flight, and back to its own seat', async () => {
    await openFfsAtSeat();
    const card = await ev(() => window.__cadet.card());
    assert.match(card.title, /フルフライトシミュレーター/);
    const top = await cardChoices();
    assert.ok(top.some(t => /滑走路から（737/.test(t)), JSON.stringify(top));
    assert.ok(!top.some(t => /リハーサル/.test(t)), 'no rehearsal before graduation');
    await ev(() => window.__cadet.career.ffs.choose(0));       // from the runway, the 737
    await g.page.waitForFunction(() => window.__cadet.mode() === 'fly' && window.__cadet.fly.status().active, null, { polling: 100, timeout: 30000 });
    assert.equal(await ev(() => window.__cadet.career.ffs.session()), true);
    assert.equal((await ev(() => window.__cadet.fly.status())).flight.aircraft, 'b737');
    await ev(() => window.__cadet.fly.leave());
    await g.page.waitForFunction(() => window.__cadet.mode() === 'walk', null, { polling: 100, timeout: 30000 });
    const p = await ev(() => window.__cadet.player());
    assert.equal(p.place, '訓練装置室（FTD）');
    assert.ok(Math.abs(p.a - 626.5) < 1.5 && Math.abs(p.c - 272.4) < 1.5, `back at the FFS seat: ${JSON.stringify(p)}`);
    assert.equal(await ev(() => window.__cadet.career.ffs.session()), false);
    assert.equal(await ev(() => window.__cadet.career.ffs.lit()), false);
  });

  test('the full flight simulator: a graduated first officer rehearses a sector, and nothing is recorded', async () => {
    await ev(() => window.__cadet.career.set({ state: { chapter: 'fo2', day: 80, slot: 'morning', graduated: { day: 49, rank: '優秀' } }, flags: { met_instructor: true, has_tablet: true, epilogue_seen: true }, place: false }));
    await ev(() => window.__cadet.simulate(0.1));
    const before = JSON.stringify(await ev(() => window.__cadet.career.state()));
    await openFfsAtSeat();
    const top = await cardChoices();
    const i = top.findIndex(t => /リハーサル/.test(t));
    assert.ok(i >= 0, JSON.stringify(top));
    await ev((i) => window.__cadet.career.ffs.choose(i), i);
    await g.page.waitForFunction(() => window.__cadet.mode() === 'fly' && window.__cadet.fly.status().active, null, { polling: 100, timeout: 30000 });
    assert.equal(await ev(() => window.__cadet.career.ffs.session()), true);
    await ev(() => window.__cadet.fly.leave());
    await g.page.waitForFunction(() => window.__cadet.mode() === 'walk', null, { polling: 100, timeout: 30000 });
    assert.equal(JSON.stringify(await ev(() => window.__cadet.career.state())), before, 'the rehearsal leaves the career untouched');
    const p = await ev(() => window.__cadet.player());
    assert.ok(Math.abs(p.a - 626.5) < 1.5 && Math.abs(p.c - 272.4) < 1.5, `back at the FFS seat: ${JSON.stringify(p)}`);
  });
});
