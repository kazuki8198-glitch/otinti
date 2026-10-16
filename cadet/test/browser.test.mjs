// CADET — browser test (node --test): opens outputs/CADET.html from file:// in headless Chromium (software WebGL,
// network blocked) and checks that the world starts with no errors and no requests; that every viewpoint, outdoors and
// in the academy, draws a real picture within the draw budget; that you can walk from briefing room 1 through the door,
// the corridor, the lobby and the automatic doors to today's aircraft on the apron (with the real colliders: a closed
// door stops you); that boards, the aircraft and locked doors answer E; that the instructor talks you through today's
// lesson, checks it, answers a question from the textbook and the record is saved; that the pause menu and the settings work;
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

  test('a door does not close onto you: it stops, and you are not pushed', async () => {
    // briefing room 1's door was opened into the corridor on the walk; stand in its swing on the corridor side
    await ev(() => window.__cadet.placeWalker(643.0, 261.5, { a: 643.1, c: 261.0 }));
    assert.equal(await ev(() => window.__cadet.lookAt(643.1, 261.0, 1.1)), 'door:d-brief-1');
    const before = await ev(() => window.__cadet.player());
    assert.equal(await ev(() => window.__cadet.use()), 'closed');
    await ev(() => window.__cadet.simulate(1.5));
    const d = (await ev(() => window.__cadet.doors())).find(x => x.id === 'd-brief-1'), after = await ev(() => window.__cadet.player());
    assert.ok(Math.abs(d.angle) > 0.4, `the door closed onto the player (angle ${d.angle})`);
    assert.ok(Math.hypot(after.a - before.a, after.c - before.c) < 0.01, `pushed ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    // step back out of its way and close it: now it shuts
    await ev(() => window.__cadet.placeWalker(644.6, 262.6, { a: 643.1, c: 261.0 }));
    assert.equal(await ev(() => window.__cadet.lookAt(643.1, 261.0, 1.1)), 'door:d-brief-1');
    assert.equal(await ev(() => window.__cadet.use()), 'closed');
    await ev(() => window.__cadet.simulate(1.5));
    assert.equal((await ev(() => window.__cadet.doors())).find(x => x.id === 'd-brief-1').angle, 0);
  });

  test('examine: a whiteboard opens its card; a locked door rattles and stays shut', async () => {
    const it = await ev(() => window.__cadet.spec.interactables.find(x => x.room === 'brief-1'));
    await ev((it) => window.__cadet.placeWalker(it.a + 1.6, it.c, { a: it.a, c: it.c }), it);
    assert.equal(await ev((it) => window.__cadet.lookAt(it.a, it.c, it.y), it), 'ex:' + it.id);
    assert.equal(await ev(() => window.__cadet.use()), 'examined');
    assert.equal((await ev(() => window.__cadet.card())).title, it.title_ja);
    // walking away (back into the room, clear of the instructor beside the board) closes the card
    await ev((it) => window.__cadet.walkRoute([{ a: it.a + 3.9, c: it.c }]), it);
    assert.equal(await ev(() => window.__cadet.card()), null);
    // the WC is closed for cleaning
    await ev(() => window.__cadet.placeWalker(633.5, 262.2, { a: 633.5, c: 263.6 }));
    assert.equal((await ev(() => window.__cadet.player())).place, '南の廊下');
    assert.equal(await ev(() => window.__cadet.lookAt(633.5, 263.6, 1.1)), 'door:d-wc');
    assert.equal(await ev(() => window.__cadet.use()), 'locked');
    await ev(() => window.__cadet.simulate(1));
    assert.equal((await ev(() => window.__cadet.doors())).find(d => d.id === 'd-wc').angle, 0);
  });

  test('talk: the instructor briefs today\'s lesson, checks it, answers from the textbook, and it is saved', async () => {
    await ev(() => { window.__cadet.setMode('walk'); window.__cadet.resetProgress(); });
    assert.equal(await ev(() => window.__cadet.savedState()), null, 'the record is erased');
    const ins = await ev(() => window.__cadet.instructor());
    assert.ok(ins.triangles > 1000 && ins.triangles < 20000, `${ins.triangles} triangles`);
    await ev((ins) => window.__cadet.placeWalker(ins.a + 2.4, ins.c - 0.6, { a: ins.a, c: ins.c }), ins);
    assert.equal(await ev((ins) => window.__cadet.lookAt(ins.a, ins.c, 1.5), ins), 'npc:instructor');
    await ev(() => window.__cadet.settings.set('textSpeed', 0.5));          // slow enough to click while it types
    assert.equal(await ev(() => window.__cadet.use()), 'talk');
    assert.equal(await ev(() => document.body.classList.contains('talking') && !!window.__cadet.dialog()), true);
    // a real click on the view while the line types shows the whole line (and only that); the next click goes on
    const d0 = await ev(() => window.__cadet.dialog());
    assert.match(d0.text, /はじめまして.*早瀬/);
    assert.equal(d0.typing, true, 'the first line types out');
    await g.page.mouse.click(400, 120);
    const d1 = await ev(() => window.__cadet.dialog());
    assert.deepEqual([d1.node, d1.typing], [d0.node, false], 'one click: the whole line, still the same line');
    await g.page.waitForTimeout(700);
    await g.page.mouse.click(400, 120);
    const d2 = await ev(() => window.__cadet.dialog());
    assert.notEqual(d2.node, d0.node, 'the next click goes to the next line');
    assert.equal(d2.typing, true, 'and that line types out too');
    await ev(() => window.__cadet.settings.set('textSpeed', 1));
    // one line after another (a single answer is given), until a list with `want` in it
    const until = async (want, max = 40) => {
      const said = [];
      let v = await ev(() => window.__cadet.dialog());
      for (let k = 0; k < max && v && !v.choices.some(c => want.test(c.text)); k++) {
        said.push(v.text);
        v = await ev(() => { const C = window.__cadet; C.simulate(0.2); return C.dialog().choices.length === 1 ? C.dialogChoose(0) : C.dialogNext(); });
      }
      assert.ok(v && v.choices.some(c => want.test(c.text)), `no "${want}" after ${JSON.stringify(said.slice(-3))}`);
      return { said, v };
    };
    await until(/今日の課目/);
    // today's lesson: its title, goal and standard from FLIGHT LAB's syllabus, the figure on the screen
    const lesson = await ev(() => window.__cadet.FL.syllabus.STAGES.flatMap(s => s.lessons).find(l => l.id === 'a1'));
    await ev(() => window.__cadet.dialogChoose('今日の課目'));
    const brief = await until(/./);
    const talk = brief.said.join('\n');
    assert.ok(talk.includes(lesson.title), 'the title'); assert.ok(talk.includes(lesson.std), 'the standard');
    assert.match(talk, /トリムを使い、操縦から手を離しても水平飛行が続く状態を作る/);
    // the check: the right answer raises trust
    assert.equal(brief.v.choices.length, 3);
    await ev(() => window.__cadet.dialogChoose('トリムを使い'));
    let st = await ev(() => window.__cadet.talkState());
    assert.equal(st.flags.brief_checked, true); assert.equal(st.trust.instructor, 53);
    // a question about the textbook: the section's key points, then the textbook opens on it
    await until(/質問があります/); await ev(() => window.__cadet.dialogChoose('質問があります'));
    await ev(() => window.__cadet.dialogChoose('飛行機に働く 4 つの力'));
    const ans = await until(/教科書で読む/);
    assert.match(ans.said[0], /飛行機に働く 4 つの力/);
    await ev(() => window.__cadet.dialogChoose('図を画面に映して'));
    assert.match((await until(/教科書で読む/)).said[0], /画面に映します/);
    await ev(() => window.__cadet.dialogChoose('教科書で読む'));
    assert.equal((await ev(() => window.__cadet.dialog())).bookOpen, true);
    assert.match(await ev(() => document.body.innerText), /重力（Weight）/);
    await ev(() => window.__cadet.closeBook());
    assert.equal((await ev(() => window.__cadet.dialog())).bookOpen, false);
    // thanks → back to the menu → the wrap-up and goodbye: the walk comes back
    await until(/ありがとうございました/); await ev(() => window.__cadet.dialogChoose('ありがとうございました'));
    await until(/このあとの流れ/); await ev(() => window.__cadet.dialogChoose('このあとの流れ'));
    const wrap = [];
    for (let k = 0; k < 12 && await ev(() => !!window.__cadet.dialog()); k++) wrap.push(await ev(() => { const t = window.__cadet.dialog().text; window.__cadet.dialogNext(); return t; }));
    assert.equal(await ev(() => window.__cadet.dialog()), null);
    assert.match(wrap.join('\n'), /運航管理[\s\S]*エプロン/);
    assert.equal(await ev(() => document.body.classList.contains('talking')), false);
    // the record is kept: met, briefed, checked; talking again starts from "again"
    st = await ev(() => window.__cadet.savedState());
    assert.deepEqual([st.flags.met_instructor, st.flags.briefed_today, st.flags.brief_checked], [true, true, true]);
    assert.equal(await ev((ins) => window.__cadet.lookAt(ins.a, ins.c, 1.5), ins), 'npc:instructor');
    assert.equal(await ev(() => window.__cadet.use()), 'talk');
    assert.doesNotMatch((await ev(() => window.__cadet.dialog())).text, /はじめまして/);
    await ev(() => window.__cadet.setMode('spectator'));
    assert.equal(await ev(() => window.__cadet.dialog()), null, 'leaving walk mode ends the talk');
    assert.equal(await ev(() => document.body.classList.contains('talking')), false);
    await ev(() => window.__cadet.setMode('walk'));
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
