// CADET — the view and the walk while talking (node --test): opens outputs/CADET.html in headless Chromium (software
// WebGL, network blocked), as test/browser.test.mjs does, and plays talks with the real mouse and keys:
//  - walking: the view turns to the one talked to when the talk begins, for a moment; a drag on the view (the right
//    button, Alt, the left button past a few pixels) looks round and the look stays, and does not go on to the next
//    line; the turn is stopped by the mouse, and by a step (also a turn to a point: the lecture's screen, autoFace);
//  - W A S D walk with the line still up, no further than 3 m from where the talk began;
//  - E and a click during a talk only go on (the door in front stays shut, captured mouse or not);
//  - the choices are still picked with 1–9 and with a click (the mouse is let go for them);
//  - another person's line (the cadets after the first solo) turns the view to them, and a drag stops that turn;
//  - the tablet's practice test: the view stays free;
//  - in the cockpit: the head turns to the instructor when his talk begins and looks round with the mouse while the
//    flight stays paused and R does not open the throttle;
//  - the epilogue: the captain's talk turns the head to him, and the mouse looks round while he talks.
// Needs Playwright (PLAYWRIGHT=its module path if it is not installed next to this project); skipped otherwise.
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../build.mjs';
import { loadChromium, openGame } from './shots.mjs';

const chromium = loadChromium();
const GROUND_OK = Object.fromEntries(['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].map(k => [k, { tries: 1, best: 'S', pass: true, levels: [] }]));
const passed = (ids) => ({ lessons: { ...GROUND_OK, ...Object.fromEntries(ids.map(id => [id, { tries: 1, best: 'S', pass: true, levels: ['basic'] }])) } });
const PX = 1.6 * 0.0022;                    // a drag's look: 1.6 × the pixels (core/input.js) × the walker's 0.0022 rad (sensitivity 1)

describe('talk view', { skip: !chromium && 'Playwright not found', timeout: 1800000 }, () => {
  let g = null;
  const ev = (fn, arg) => g.page.evaluate(fn, arg);
  const open = async () => {
    g = await openGame(chromium, { q: 'medium', w: 800, h: 450, t: 10 });
    await ev(() => window.__cadet.pause(true));
    await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { timeout: 30000 });
  };
  before(async () => { build({ quiet: true }); await open(); });
  after(async () => { if (g) await g.browser.close(); });
  const errors = [];
  const restart = async () => { errors.push(...g.errors); await g.browser.close(); g = null; await open(); };
  const sim = (s) => ev((s) => window.__cadet.simulate(s), s);
  // the mouse let go as the game lets it go (a drag looks round only when it is free), and waited for
  // (a lock still on its way — the bridge's steps take the mouse back as a click would — arrives first)
  const unlock = async () => {
    await g.page.waitForTimeout(200);
    await g.page.waitForFunction(() => { const L = window.__cadet.lock; if (L.on()) L.release(); return !L.on(); }, null, { polling: 100, timeout: 10000 });
  };
  // a drag on the 3D view (the mouse free): dx pixels across, with the right button (or the left, or Alt + the left)
  const drag = async (dx, { button = 'right', alt = false, x = 300, y = 90 } = {}) => {
    assert.equal(await ev(([x, y]) => document.elementFromPoint(x, y).tagName, [x, y]), 'CANVAS', 'the drag begins on the 3D view');
    if (alt) await g.page.keyboard.down('Alt');
    await g.page.mouse.move(x, y); await g.page.mouse.down({ button }); await g.page.mouse.move(x + dx, y, { steps: 8 }); await g.page.mouse.up({ button });
    if (alt) await g.page.keyboard.up('Alt');
  };
  const dialog = () => ev(() => window.__cadet.dialog());
  const yaw = () => ev(() => window.__cadet.player().yaw);
  // lines gone on (the bridge's next) until one with choices
  const toChoices = (max = 40) => ev((max) => { const C = window.__cadet; for (let k = 0; k < max; k++) { const v = C.dialog(); if (!v || v.choices.length) return v; C.dialogNext(); } return C.dialog(); }, max);

  test('walking: the view turns to the instructor when the talk begins, then a drag looks round and the look stays; a drag does not go on; a step stops a turn', async () => {
    // day 12 of chapter 2 (as browser.test's talk): 早瀬 教官 in briefing room 1, today's briefing to hear
    await ev((p) => window.__cadet.career.set({ state: { seed: 2, chapter: 'ch2', day: 12, slot: 'morning', done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true } } }, progress: p, flags: { met_instructor: true, has_tablet: true }, place: false }), passed(['a1']));
    const ins = await ev(() => window.__cadet.instructor());
    // 2.4 m from him, looking away (into the room)
    await ev((ins) => { const C = window.__cadet; C.setMode('walk'); C.placeWalker(ins.a + 2.4, ins.c - 0.6, { a: ins.a + 8, c: ins.c - 0.6 }); }, ins);
    assert.ok(await ev(() => window.__cadet.aim('instructor')) > 120, 'looking away before the talk');
    await ev(() => window.__cadet.settings.set('textSpeed', 0.5));              // (slow: a line is still typing when it is looked at)
    assert.equal(await ev(() => window.__cadet.career.talkTo('instructor')), 'talk');
    assert.deepEqual(await ev(() => window.__cadet.talkView()), { face: 'person', out: 0 });
    await sim(1);
    let aim = await ev(() => window.__cadet.aim('instructor'));
    assert.ok(aim < 4, `turned to his face: ${aim.toFixed(1)}° off`);
    assert.equal((await ev(() => window.__cadet.talkView())).face, null, 'the turn is over after a moment');
    // the first line (how the cadet feels) answered; the next one types
    await ev(() => window.__cadet.dialogChoose('問題ありません'));
    await unlock();
    let d0 = await dialog();
    assert.match(d0.text, /それならよかった/);
    // the right button: the view goes with the mouse, and stays there; the talk goes on as it was
    let y0 = await yaw();
    await drag(120);
    await sim(0.1);
    let y1 = await yaw();
    assert.ok(Math.abs(y1 - (y0 - 120 * PX)) < 1e-6, `a right drag of 120 px: yaw ${y0.toFixed(4)} → ${y1.toFixed(4)}`);
    await sim(1.5);
    assert.equal(await yaw(), y1, 'the look stays: nothing turns it back');
    aim = await ev(() => window.__cadet.aim('instructor'));
    assert.ok(aim > 15, `looking past him: ${aim.toFixed(1)}°`);
    let d1 = await dialog();
    assert.equal(d1.node, d0.node, 'the same line');
    // the left button past a few pixels, and Alt with it: a look, not a click (the line does not go on)
    for (const opt of [{ button: 'left' }, { button: 'left', alt: true }]) {
      y0 = await yaw(); d0 = await dialog();
      await drag(-90, opt);
      assert.equal(await ev(() => window.__cadet.lock.dragged()), true, `${JSON.stringify(opt)}: a drag`);
      await sim(0.1);
      assert.ok(await yaw() > y0 + 0.1, `${JSON.stringify(opt)}: looked to the left (${y0.toFixed(3)} → ${(await yaw()).toFixed(3)})`);
      await g.page.waitForTimeout(650);                                        // (past the one-action-per-line guard)
      d1 = await dialog();
      assert.equal(d1.node, d0.node, `${JSON.stringify(opt)}: the same line`);
    }
    // (the line typed out: the next click goes on to the next one)
    await ev(() => window.__cadet.dialogReveal());
    d0 = await dialog();
    // a plain click on the view still is a click: on to the next line
    await g.page.mouse.click(300, 90);
    d1 = await dialog();
    assert.notEqual(d1.node, d0.node, `a click goes on: ${JSON.stringify([d0.node, d0.text, d1.node])}`);
    // the lecture's turn to a point (autoFace): the view goes there for a moment …
    const pt = { a: ins.a + 1.2, c: ins.c + 3.5, y: 1.6 };
    assert.equal(await ev((p) => window.__cadet.faceTo(p.a, p.c, p.y), pt), true);
    assert.equal((await ev(() => window.__cadet.talkView())).face, 'point');
    await sim(1);
    aim = await ev((p) => window.__cadet.aim(p), pt);
    assert.ok(aim < 3, `turned to the point: ${aim.toFixed(1)}° off`);
    // … and a step stops it where it is
    await ev((ins) => window.__cadet.lookAt(ins.a, ins.c, 1.5), ins);
    await ev((p) => window.__cadet.faceTo(p.a, p.c, p.y), pt);
    await g.page.keyboard.down('KeyD'); await sim(0.3); await g.page.keyboard.up('KeyD');
    assert.equal((await ev(() => window.__cadet.talkView())).face, null, 'a step stops the turn');
    aim = await ev((p) => window.__cadet.aim(p), pt);
    assert.ok(aim > 30, `not turned to the point: ${aim.toFixed(1)}°`);
    assert.ok(await dialog(), 'still talking');
    await ev(() => window.__cadet.settings.set('textSpeed', 1));
  });

  test('walking: W A S D walk with the line still up, no further than 3 m from where the talk began; E and a click only go on', async () => {
    const ins = await ev(() => window.__cadet.instructor());
    const p0 = await ev(() => window.__cadet.player());
    assert.ok(await dialog(), 'the talk of the test before');
    await g.page.keyboard.down('KeyW'); await sim(1); await g.page.keyboard.up('KeyW');
    let p1 = await ev(() => window.__cadet.player());
    assert.ok(Math.hypot(p1.a - p0.a, p1.c - p0.c) > 0.8, `walked ${Math.hypot(p1.a - p0.a, p1.c - p0.c).toFixed(2)} m`);
    assert.equal(await ev(() => document.body.classList.contains('talking') && !!window.__cadet.dialog()), true, 'the talk goes on');
    // away from him for 6 s (some 9 m of walking): held at the leash's rim
    await ev((ins) => { const C = window.__cadet, p = C.player(); C.lookAt(p.a + (p.a - ins.a), p.c + (p.c - ins.c), 1.5); }, ins);
    let out = 0;
    await g.page.keyboard.down('KeyW');
    for (let k = 0; k < 12; k++) { await sim(0.5); out = Math.max(out, (await ev(() => window.__cadet.talkView())).out); }
    await g.page.keyboard.up('KeyW');
    assert.ok(out <= 3 + 1e-6, `${out.toFixed(3)} m from where the talk began`);
    assert.ok(out > 2.5, `walked out to ${out.toFixed(3)} m`);
    assert.ok(await dialog(), 'still talking');
    // ←→ walk too; then back towards him
    p1 = await ev(() => window.__cadet.player());
    await g.page.keyboard.down('ArrowLeft'); await sim(0.6); await g.page.keyboard.up('ArrowLeft');
    let p2 = await ev(() => window.__cadet.player());
    assert.ok(Math.hypot(p2.a - p1.a, p2.c - p1.c) > 0.3, `← walked ${Math.hypot(p2.a - p1.a, p2.c - p1.c).toFixed(2)} m`);
    // E and a click: the conversation's only. Briefing room 1's door in front, looked at (with no talk, E would open it)
    await ev(() => { const C = window.__cadet; C.setMode('spectator'); C.setMode('walk'); C.placeWalker(643.1, 259.6, { a: 643.1, c: 261.0 }); });
    assert.equal(await ev(() => window.__cadet.lookAt(643.1, 261.0, 1.1)), 'door:d-brief-1');
    const shut = async () => (await ev(() => window.__cadet.doors())).find(d => d.id === 'd-brief-1').angle;
    assert.equal(await shut(), 0);
    assert.equal(await ev(() => window.__cadet.career.talkTo('instructor')), 'talk');
    await sim(1);
    assert.equal(await ev(() => window.__cadet.lookAt(643.1, 261.0, 1.1)), 'door:d-brief-1', 'the door in front again');
    await ev(() => window.__cadet.dialogChoose('問題ありません'));
    let d0 = await dialog();
    await g.page.keyboard.press('KeyE'); await sim(0.5);
    let d1 = await dialog();
    assert.ok(d1.node !== d0.node || d0.typing !== d1.typing, 'E went on with the talk');
    assert.equal(await shut(), 0, 'E did not open the door');
    assert.equal(await ev(() => window.__cadet.card()), null);
    // (on to today's lesson: line after line of it, the door still in front)
    await toChoices();
    await ev(() => window.__cadet.dialogChoose('今日の課目'));
    assert.equal(await ev(() => window.__cadet.lookAt(643.1, 261.0, 1.1)), 'door:d-brief-1');
    await g.page.waitForTimeout(650);
    // a click on the view: the mouse captured again (for looking round), the line goes on; and with it captured, a
    // click is still only the conversation's (its press reaches the game as Mouse0: not the door's)
    d0 = await dialog();
    assert.equal(d0.choices.length, 0, 'a line');
    await g.page.mouse.click(300, 90); await sim(0.3);
    await g.page.waitForFunction(() => window.__cadet.lock.on(), null, { timeout: 5000 });
    d1 = await dialog();
    assert.ok(d1.node !== d0.node || d0.typing !== d1.typing, 'the click went on with the talk');
    await g.page.waitForTimeout(650);
    d0 = await dialog();
    assert.deepEqual([d0.choices.length, await ev(() => window.__cadet.lock.on())], [0, true], 'a line, the mouse captured');
    await g.page.mouse.click(300, 90); await sim(0.5);
    d1 = await dialog();
    assert.ok(d1.node !== d0.node || d0.typing !== d1.typing, 'a captured click goes on');
    assert.equal(await shut(), 0, 'no click opened the door');
    assert.equal(await ev(() => window.__cadet.card()), null);
    assert.equal((await ev(() => window.__cadet.player())).place, 'ブリーフィング室 1');
  });

  test('walking: the choices are still picked with 1–9 and with a click (the mouse let go for them, captured again after)', async () => {
    let v = await toChoices();
    assert.ok(v && v.choices.length > 1, `a list: ${JSON.stringify(v && v.choices)}`);
    await ev(() => window.__cadet.dialogReveal());
    await sim(0.1);                                                            // (a frame: the mouse let go for the choices)
    await g.page.waitForFunction(() => !window.__cadet.lock.on(), null, { timeout: 5000 });
    await g.page.waitForTimeout(300);                                          // (fresh choices: Enter waits; the digits do not)
    await g.page.keyboard.press('Digit1');
    let w = await dialog();
    assert.notEqual(w.node, v.node, `1 picked "${v.choices[0].text}"`);
    // the next list: a click on its first choice
    v = await toChoices();
    assert.ok(v && v.choices.length, 'another list');
    await ev(() => window.__cadet.dialogReveal());
    await sim(0.1);
    await g.page.waitForFunction(() => !window.__cadet.lock.on(), null, { timeout: 5000 });
    const box = await g.page.locator('#dlg .dlg-ch').first().boundingBox();
    await g.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    w = await dialog();
    assert.ok(!w || w.node !== v.node, `the click picked "${v.choices[0].text}"`);
    // (the talk closed by leaving the walk: nothing of it left)
    await ev(() => { const C = window.__cadet; C.setMode('spectator'); C.setMode('walk'); });
    assert.equal(await dialog(), null);
  });

  test('walking: another person\'s line turns the view to them (the cadets after the first solo), and a drag stops that turn', async () => {
    await ev((p) => window.__cadet.career.set({ state: { chapter: 'ch2', day: 30, slot: 'am', done: { prologue: 1 } }, progress: p, flags: { met_instructor: true, has_tablet: true }, place: false }), { lessons: GROUND_OK });
    // (stood where the instructor and 朝日 are well apart in the view: off the line between them, away from the aircraft)
    await ev(() => {
      const C = window.__cadet; C.career.stageCelebrate(); C.setMode('walk');
      const i = C.walk.instructor(), s = C.career.where('asahi'), tg = C.spec.target;
      const ma = (i.a + s.a) / 2, mc = (i.c + s.c) / 2, da = s.a - i.a, dc = s.c - i.c, l = Math.hypot(da, dc);
      const side = [[-dc / l, da / l], [dc / l, -da / l]].sort((u, w) => Math.hypot(ma + w[0] - tg.a, mc + w[1] - tg.c) - Math.hypot(ma + u[0] - tg.a, mc + u[1] - tg.c))[0];
      const p = { a: ma + side[0] * 2.4, c: mc + side[1] * 2.4 };
      C.placeWalker(p.a, p.c, { a: p.a + side[0], c: p.c + side[1] }); C.simulate(0.2);
    });
    assert.equal(await ev(() => window.__cadet.career.talkTo('instructor')), 'talk');
    await sim(1);
    assert.ok(await ev(() => window.__cadet.aim('instructor')) < 4, 'turned to the instructor');
    // his lines: the view stays (the same speaker); then 朝日's — it turns to her
    const next = () => ev(() => { const C = window.__cadet; C.dialogNext(); return C.dialog(); });
    let v = await dialog();
    while (v && v.speaker === 'instructor') { v = await next(); if (v && v.speaker === 'instructor') { await sim(0.2); assert.equal((await ev(() => window.__cadet.talkView())).face, null, 'the same speaker: no turn'); } }
    assert.equal(v.speaker, 'asahi');
    assert.equal((await ev(() => window.__cadet.talkView())).face, 'person');
    const off = await ev(() => window.__cadet.aim('asahi'));
    await sim(1);
    const aim = await ev(() => window.__cadet.aim('asahi'));
    assert.ok(aim < 4 && off > 8, `turned to 朝日: ${off.toFixed(1)}° → ${aim.toFixed(1)}°`);
    // 森's line: the turn begins, a drag stops it where the drag leaves the view (the mouse let go after the step on,
    // which takes it back as a click would)
    v = await next();
    assert.equal(v.speaker, 'mori');
    assert.equal((await ev(() => window.__cadet.talkView())).face, 'person');
    await unlock();
    const y0 = await yaw();
    await drag(-100);
    await sim(1);
    const y1 = await yaw();
    assert.ok(Math.abs(y1 - (y0 + 100 * PX)) < 1e-6, `the drag alone moved the view, no turn to 森: ${y0.toFixed(4)} → ${y1.toFixed(4)}`);
    assert.equal((await ev(() => window.__cadet.talkView())).face, null);
    await ev(() => { const C = window.__cadet; C.setMode('spectator'); C.setMode('walk'); });
  });

  test('walking: the tablet\'s practice test keeps the view free (no one to turn to)', async () => {
    await ev(() => { const C = window.__cadet; C.placeWalker(655.0, 266.0, { a: 650.0, c: 266.0 }); C.career.tablet.open('practice'); });
    await g.page.locator('.tb button', { hasText: '練習する' }).first().click();
    await g.page.waitForFunction(() => !!window.__cadet.dialog(), null, { timeout: 5000 });
    assert.equal((await ev(() => window.__cadet.talkView())).face, null, 'nothing to turn to');
    await sim(0.1);
    await unlock();
    const y0 = await yaw();
    await drag(80);
    await sim(0.5);
    assert.ok(Math.abs(await yaw() - (y0 - 80 * PX)) < 1e-6, 'the drag looked round');
    await g.page.keyboard.down('KeyS'); await sim(0.5); await g.page.keyboard.up('KeyS');
    assert.ok((await ev(() => window.__cadet.talkView())).out > 0.2, 'and S walked back');
    assert.ok(await dialog(), 'the practice goes on');
    await ev(() => { const C = window.__cadet; C.setMode('spectator'); C.setMode('walk'); });
  });

  test('cockpit: the head turns to the instructor when his talk begins, then looks round with the mouse while the flight stays paused and R does not open the throttle', async () => {
    await restart();
    await ev((p) => window.__cadet.career.set({ state: { seed: 2, chapter: 'ch2', day: 12, slot: 'morning', done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true } } }, progress: p, flags: { met_instructor: true, has_tablet: true, briefed_today: true, brief_checked: true }, place: false }), passed(['a1']));
    const tg = await ev(() => window.__cadet.spec.target);
    await ev((tg) => { const C = window.__cadet; C.setMode('walk'); C.placeWalker(tg.a + 2.6, tg.c + 1.0, { a: tg.a + 1.0, c: tg.c }); }, tg);
    assert.equal(await ev((tg) => window.__cadet.lookAt(tg.a + 1.0, tg.c, 1.25), tg), 'aircraft:board');
    assert.equal(await ev(() => window.__cadet.use()), 'board');
    await g.page.waitForTimeout(900);                                          // the fade
    let fs = await ev(() => window.__cadet.fly.status());
    assert.deepEqual([fs.phase, fs.talking, fs.facing], ['board', true, true]);
    const off = await ev(() => window.__cadet.aim('instructor'));
    await sim(1);
    fs = await ev(() => window.__cadet.fly.status());
    const aim = await ev(() => window.__cadet.aim('instructor'));
    assert.ok(off > 20 && aim < 4 && !fs.facing, `turned to him: ${off.toFixed(1)}° → ${aim.toFixed(1)}°`);
    // the mouse: the head looks round and stays; nothing under the crosshair works while he talks
    await unlock();
    const pose0 = await ev(() => window.__cadet.fly.pose()), thr0 = await ev(() => window.__cadet.fly.flight.s.thr);
    await drag(150);
    await sim(0.1);
    const yawA = (await ev(() => window.__cadet.fly.status())).yaw;
    assert.ok(Math.abs(yawA - (fs.yaw - 150 * PX)) < 1e-6, `the head with the drag: ${fs.yaw.toFixed(3)} → ${yawA.toFixed(3)}`);
    await g.page.keyboard.down('KeyR'); await sim(1); await g.page.keyboard.up('KeyR');
    fs = await ev(() => window.__cadet.fly.status());
    assert.equal(fs.yaw, yawA, 'the look stays');
    assert.deepEqual([fs.phase, fs.talking, fs.hover], ['board', true, null], 'still his talk; no switch under the crosshair');
    assert.equal(await ev(() => window.__cadet.fly.flight.s.thr), thr0, 'R did not open the throttle');
    assert.deepEqual((await ev(() => window.__cadet.fly.pose())).pos, pose0.pos, 'the aircraft has not moved');
    assert.match((await dialog()).text, /シートベルト|。/);
    await ev(() => window.__cadet.fly.leave());
    await g.page.waitForTimeout(300); await sim(0.3);
  });

  test('epilogue: the captain\'s talk turns the head to him, and the mouse looks round while he talks', async () => {
    await restart();
    await ev(() => window.__cadet.epilogue.enter());
    await sim(0.1);
    assert.equal((await ev(() => window.__cadet.epilogue.state())).mode, 'epilogue');
    const off = await ev(() => window.__cadet.aim('captain'));
    assert.equal(await ev(() => window.__cadet.epilogue.talk('again')), 'talk');
    assert.equal((await dialog()).name, '柏木 機長');
    await sim(1);
    const aim = await ev(() => window.__cadet.aim('captain'));
    assert.ok(off > 20 && aim < 4, `turned to him: ${off.toFixed(1)}° → ${aim.toFixed(1)}°`);
    await unlock();
    const s0 = await ev(() => window.__cadet.epilogue.state());
    await drag(-200);
    await sim(1);
    const s1 = await ev(() => window.__cadet.epilogue.state());
    assert.ok(Math.abs(s1.yaw - Math.min(2.2, s0.yaw + 200 * PX)) < 1e-6, `looked round while he talks: yaw ${s0.yaw.toFixed(3)} → ${s1.yaw.toFixed(3)}`);
    assert.ok(await ev(() => window.__cadet.aim('captain')) > 15, 'away from him');
    assert.equal((await dialog()).name, '柏木 機長', 'his talk goes on');
    errors.push(...g.errors);
    assert.deepEqual(errors.filter(e => !/KHR_parallel_shader_compile/.test(e)), [], 'no errors in the page');
    assert.deepEqual(g.requests, [], 'nothing asked of the network');
  });
});
