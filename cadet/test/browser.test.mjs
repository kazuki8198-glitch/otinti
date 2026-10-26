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
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runLesson } from './helpers/bot.mjs';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's, as in the page)
const FL = globalThis.FL;
// FLIGHT LAB's scripted pilot, to run in the page
const BOT_SRC = fs.readFileSync(path.join(here, './helpers/bot.mjs'), 'utf8').replace(/^export /gm, '');
// the circuit's shape for the bot in t2 (test/helpers/pattern-hook.mjs), to run in the page too
const HOOK_SRC = fs.readFileSync(path.join(here, 'helpers/pattern-hook.mjs'), 'utf8').replace(/^export /gm, '');
// (M8) the stand-in for the Claude API, to run in the page (the AI instructor's tests: nothing goes out)
const FAKE_SRC = fs.readFileSync(path.join(here, 'helpers/fake-claude.mjs'), 'utf8').replace(/^export /gm, '');

const chromium = loadChromium();
// the picture's contrast (standard deviation of the luminance, 0–255) and its mean
const analyse = (page, url) => page.evaluate(async (url) => {
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement('canvas'); c.width = 160; c.height = 90; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 160, 90);
  const d = g.getImageData(0, 0, 160, 90).data; let s = 0, s2 = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += y; s2 += y * y; n++; }
  return { mean: s / n, sd: Math.sqrt(s2 / n - (s / n) ** 2) };
}, url);

describe('browser', { skip: !chromium && 'Playwright not found', timeout: 3600000 }, () => {
  let g = null;
  const ev = (fn, arg) => g.page.evaluate(fn, arg);
  before(async () => {
    build({ quiet: true });
    g = await openGame(chromium, { q: 'high', w: 800, h: 450, t: 10 });
    await ev(() => window.__cadet.pause(true));
  });
  after(async () => { if (g) await g.browser.close(); });
  // a new browser on the same file (the software renderer here keeps every shader and picture it has made: a few
  // chapters in one page grow past the machine's memory), at the medium preset (the budget is checked at 'high' above;
  // the first picture at 'high' alone takes some 9 GB in the software renderer); the errors and requests so far are
  // kept for the last test
  const seen = { errors: [], requests: [] };
  const restart = async () => {
    seen.errors.push(...g.errors); seen.requests.push(...g.requests);
    await g.browser.close(); g = null;
    g = await openGame(chromium, { q: 'medium', w: 800, h: 450, t: 10 });
    await ev(() => window.__cadet.pause(true));
  };

  // a talk run to its end in the page: the right answer where a lesson or a test asks, else the first choice matching
  // one of `picks` (or the first choice); who: someone to talk to (or null: the talk already open)
  const talkThrough = (who, picks = []) => ev(({ who, picks }) => {
    const C = window.__cadet; const r = who ? C.career.talkTo(who) : 'talk';
    if (r !== 'talk') return { r, lines: [] };
    const lines = [];
    for (let k = 0; k < 3000; k++) {                         // (a class read in full is a few hundred lines)
      const v = C.dialog(); if (!v) break; lines.push(`${v.name}：${v.text}`);
      if (v.choices.length) {
        const act = C.career.activity(), m = /^q(\d+)$/.exec(v.node); let i = 0;
        if (act && m && act.questions[+m[1]]) { const q = act.questions[+m[1]]; i = v.choices.findIndex(c => c.text === q.opts[q.ok]); }
        else for (const p of picks) { const j = v.choices.findIndex(c => new RegExp(p).test(c.text)); if (j >= 0) { i = j; break; } }
        lines.push(`  > ${v.choices[i].text}`); C.dialogChoose(i);
      } else C.dialogNext();
      C.simulate(0.05);
    }
    return { r, lines, open: !!C.dialog() };
  }, { who, picks });
  const career = () => ev(() => window.__cadet.career.state());
  const GROUND_OK = Object.fromEntries(['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].map(k => [k, { tries: 1, best: 'S', pass: true, levels: [] }]));
  const passed = (ids) => ({ lessons: { ...GROUND_OK, ...Object.fromEntries(ids.map(id => [id, { tries: 1, best: 'S', pass: true, levels: ['basic'] }])) } });

  test('the first morning: inside the academy\'s front doors, the first day\'s plan', async () => {
    assert.equal(await ev(() => window.__cadet.mode()), 'walk');
    const p = await ev(() => window.__cadet.player());
    assert.equal(p.place, 'ロビー');
    const st = await career();
    assert.deepEqual([st.day, st.slot, st.chapter], [1, 'morning', 'prologue']);
    assert.deepEqual((await ev(() => window.__cadet.career.schedule())).map(x => x.kind), ['ceremony', 'tour', 'brief']);
    const a = await analyse(g.page, await ev(() => window.__cadet.snapshot(2)));
    assert.ok(a.sd > 8 && a.mean > 40 && a.mean < 235, `start: mean ${a.mean.toFixed(0)} sd ${a.sd.toFixed(1)}`);
    // (M7) the first minutes' help: look first, then walk — each step gone once done
    await ev(() => window.__cadet.simulate(0.1));
    assert.equal(await ev(() => window.__cadet.coach()), 'look');
    assert.match(await ev(() => document.getElementById('coach').textContent), /見回す/);
    await ev(() => { const C = window.__cadet, p = C.player(); C.placeWalker(p.a, p.c, { a: p.a - 5, c: p.c + 5 }); C.simulate(0.2); });
    assert.equal(await ev(() => window.__cadet.coach()), 'walk');
    await ev(() => { const C = window.__cadet, p = C.player(); C.walkRoute([{ a: p.a - 3, c: p.c }, { a: p.a - 3, c: p.c - 2.5 }]); });
    assert.equal(await ev(() => window.__cadet.coach()), 'guide');
    await ev(() => { const C = window.__cadet; C.placeWalker(C.spec.start.a, C.spec.start.c, C.spec.start.yawToward); });
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
    // the walk ends by the door (getting in comes later); on the aircraft's left side, look at it and examine it
    assert.equal(await ev(() => { const t = window.__cadet.spec.target; return window.__cadet.lookAt(t.a + 1.0, t.c, 1.25); }), 'aircraft:board');
    const info = await ev(() => window.__cadet.targets().find(t => t.id === 'aircraft:today'));
    await ev((p) => window.__cadet.placeWalker(p.a - 2.6, p.c, { a: p.a, c: p.c }), info);
    assert.equal(await ev((p) => window.__cadet.lookAt(p.a, p.c, p.y), info), 'aircraft:today');
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
    // (the board shows today's plan: on the first morning, no flight yet, just the board)
    assert.equal((await ev(() => window.__cadet.card())).title, 'ホワイトボード');
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

  // the next step played as a player plays it: where the guide at the top of the screen points (walked round the walls,
  // doors opened with E), what is there looked at, and E; a talk then answered (picks) to its end
  const playGuide = async (picks = [], expect = null) => {
    const r = await ev(() => window.__cadet.followGuide());
    assert.ok(r.reached, `walked to the guide's place: ${JSON.stringify(r)}`);
    if (expect) assert.equal(r.current, expect, `looking at ${expect}: ${JSON.stringify(r)}`);
    const u = await ev(() => window.__cadet.use());
    const t = u === 'talk' ? await talkThrough(null, picks) : { lines: [] };
    return { ...r, use: u, lines: t.lines };
  };

  test('the prologue, played as the guide says (walk there, E): the welcome, the tour and the tablet, the instructor, the cadets in the lounge, home and the next morning', async () => {
    await ev(() => window.__cadet.setMode('walk'));
    // an older game's conversations (the M2–M4 briefing) left met_instructor: it must not skip the meeting
    await ev(() => { localStorage.setItem('cadet.save', JSON.stringify({ ...JSON.parse(localStorage.getItem('cadet.save') || '{}'), flags: { met_instructor: true } })); });
    await ev(() => window.__cadet.career.set({ flags: { met_instructor: true }, place: true }));
    assert.equal((await ev(() => window.__cadet.career.flags())).met_instructor, undefined, 'the stale flag is put right by the career');
    for (const id of ['chief', 'lecturer', 'kiryu', 'asahi', 'mori']) { const w = await ev((id) => window.__cadet.career.where(id), id); assert.ok(w && w.a > 646 && w.a < 664, `${id} in the lobby: ${JSON.stringify(w)}`); }
    // the morning: 早瀬 教官 is met in the afternoon — before then he says where to go first, and the day stays as it is
    let t = await talkThrough('instructor');
    assert.match(t.lines.join('\n'), /顔合わせは午後/);
    assert.equal((await career()).slot, 'morning');
    // the chief instructor's welcome (the guide: the lobby)
    t = await playGuide([], 'npc:chief');
    assert.match(t.step.text, /真壁/); assert.match(t.lines.join('\n'), /ようこそ/);
    assert.equal((await career()).slot, 'am');
    // the dispatcher's tour and the tablet (the guide: through the double doors into dispatch)
    t = await playGuide([], 'npc:dispatcher');
    assert.match(t.lines.join('\n'), /タブレット/);
    assert.ok((await ev(() => window.__cadet.career.flags())).has_tablet);
    assert.equal((await career()).slot, 'pm');
    // the tablet: Tab opens it on today's page; Tab closes it (once the first day's card has gone: keys wait for it)
    await g.page.waitForFunction(() => !window.__cadet.career.cards());
    await g.page.keyboard.press('Tab');
    assert.equal(await ev(() => window.__cadet.career.tablet.isOpen()), true);
    assert.match(await ev(() => document.querySelector('.tb').innerText), /今日の予定[\s\S]*入社の式[\s\S]*天気/);
    await g.page.keyboard.press('Tab');
    assert.equal(await ev(() => window.__cadet.career.tablet.isOpen()), false);
    // the instructor in briefing room 1 (the guide: down the south corridor, his door opened with E)
    t = await playGuide(['今は大丈夫'], 'npc:instructor');
    assert.match(t.lines.join('\n'), /担当教官になる、早瀬/);
    let st = await career();
    assert.deepEqual([st.slot, !!st.done.prologue], ['evening', true]);
    assert.equal((await ev(() => window.__cadet.career.flags())).met_instructor, true);
    // the evening: the cadets in the lounge; the instructor and the staff gone home
    for (const id of ['kiryu', 'asahi', 'mori']) { const w = await ev((id) => window.__cadet.career.where(id), id); assert.ok(w && w.a > 688, `${id} in the lounge`); t = await talkThrough(id); assert.ok(t.lines.length, id); }
    assert.equal(await ev(() => window.__cadet.career.where('dispatcher')), null);
    // home through the front door (the guide: the entrance): the night, the card, the next morning — chapter 1
    t = await playGuide([], 'home');
    assert.equal(t.use, 'examined');
    await ev(() => window.__cadet.career.homeChoose(0));
    await g.page.waitForTimeout(4200);
    st = await career();
    assert.deepEqual([st.day, st.slot, st.chapter], [2, 'morning', 'ch1']);
    assert.equal((await ev(() => window.__cadet.player())).place, 'ロビー');
    assert.deepEqual((await ev(() => window.__cadet.career.schedule())).map(x => `${x.slot} ${x.kind} ${x.id}`), ['am class 0', 'pm ftd k1']);
  });

  test('chapter 1: a class (the textbook read in full, its pages on the classroom\'s screen, left midway and taken up again), the training device (k2: the PFD on its screen), the written test', async () => {
    // (in a new browser: the second morning, chapter 1, as the prologue left it)
    await restart();
    await ev(() => window.__cadet.career.set({ state: { chapter: 'ch1', day: 2, slot: 'morning', done: { prologue: 1 } }, flags: { met_instructor: true, has_tablet: true }, place: false }));
    // the class: the lecturer at the whiteboard of briefing room 2
    const w = await ev(() => window.__cadet.career.where('lecturer'));
    assert.ok(w.a > 621 && w.a < 633.6 && w.c < 261, `the lecturer in briefing room 2: ${JSON.stringify(w)}`);
    // read in full (じっくり) into the second section: the book's pages on the screen (the first section's figure among
    // them), its place kept; then the class left midway (the talk ended) and taken up again where it was
    const part = await ev(() => {
      const C = window.__cadet, lines = [], pages = []; C.career.talkTo('lecturer');
      for (let k = 0; k < 400; k++) {
        const v = C.dialog(); if (!v) break; lines.push(v.text);
        const p = C.career.lecture().page; if (p && pages[pages.length - 1] !== p) pages.push(p);
        if (/揚力はどうやって/.test(v.text) && !v.choices.length) break;
        if (v.choices.length) C.dialogChoose(0); else C.dialogNext();
        C.simulate(0.05);
      }
      return { lines, pages };
    });
    assert.match(part.lines[0], /Good morning/);
    assert.match(part.lines[1], /教科書を全部、順に読んでいきますか/);
    assert.ok(part.pages.includes('aero.forces') && part.pages.includes('aero.forces#1') && part.pages.includes('aero.lift'), `the pages shown: ${part.pages.join(' ')}`);
    assert.ok(part.lines.some(l => /^画面の図を見てください。/.test(l)), 'the figure, said');
    const shot = await ev(() => { const C = window.__cadet; C.placeWalker(625.2, 258.0, { a: 621.1, c: 258.4 }); return C.snapshot(2); });
    assert.ok((await analyse(g.page, shot)).sd > 8, 'the classroom with its screen');
    assert.equal((await career()).done['lecture:0'], 1, 'the class\'s place: the second section');
    await ev(() => { window.__cadet.setMode('spectator'); window.__cadet.setMode('walk'); });
    assert.equal(await ev(() => window.__cadet.dialog()), null, 'the class left midway');
    let st = await career();
    assert.deepEqual([st.slot, st.done['class:0'], st.done['lecture:0']], ['am', undefined, 1], 'not done; its place kept');
    const again = await ev(() => { const C = window.__cadet; C.career.talkTo('lecturer'); C.dialogNext(); return C.dialog(); });
    assert.deepEqual(again.choices.map(c => c.text), ['続きから（第 1 章「揚力はどうやって生まれるか」から）', '最初から', '要点だけ']);
    let t = await talkThrough(null);
    assert.match(t.lines.join('\n'), /では、「揚力はどうやって生まれるか」から続けます。/); assert.match(t.lines.join('\n'), /See you tomorrow/);
    assert.ok(!t.lines.some(l => /最初は「飛行機に働く 4 つの力」です。/.test(l)), 'not from the start');
    st = await career();
    assert.deepEqual([st.slot, st.done['class:0'], st.done['lecture:0']], ['pm', 2, undefined], 'done: its place forgotten');
    // the device (k2 as the next one: k1 passed): ten PFD pictures to read, every one right — passed
    await ev((p) => window.__cadet.career.set({ progress: { lessons: { k1: p.k1 } }, place: false }), GROUND_OK);
    await ev(() => window.__cadet.career.advance('pm'));
    assert.deepEqual((await ev(() => window.__cadet.career.schedule())).find(x => x.kind === 'ftd').id, 'k2');
    t = await talkThrough('lecturer');
    assert.match(t.lines.join('\n'), /10 \/ 10 問、100%/);
    assert.ok((await ev(() => window.__cadet.career.progress())).lessons.k2.pass);
    const sim = await ev(() => { const C = window.__cadet; C.placeWalker(624.0, 270.6, { a: 629.9, c: 270.6 }); return C.snapshot(2); });
    const a = await analyse(g.page, sim);
    assert.ok(a.sd > 8, `the device room with its screen: sd ${a.sd.toFixed(1)}`);
    // the written test (all the classes and the device done): in the planning room, 28 questions, passed
    const done = Object.fromEntries([0, 1, 2, 3, 4, 5].map(i => [`class:${i}`, 2]));
    await ev(({ p, done }) => window.__cadet.career.set({ state: { day: 9, slot: 'morning', done: { prologue: 1, ...done } }, progress: { lessons: p }, place: false }), { p: GROUND_OK, done });
    assert.deepEqual((await ev(() => window.__cadet.career.schedule())).map(x => `${x.kind} ${x.id}`), ['exam written1']);
    // out of the front doors before the test: a word, the day goes on; back in
    // (the toast read in the same step as the walk: the day's greeting may come over it a moment later)
    const out = () => ev(() => { const C = window.__cadet; C.placeWalker(655.0, 273.5, { a: 655.0, c: 285 }); const r = C.walkRoute([{ a: 655.0, c: 276.5 }, { a: 655.0, c: 281.0 }]); return { ...r, toast: document.querySelector('#toast').textContent }; });
    await g.page.waitForFunction(() => !window.__cadet.career.cards());
    await g.page.waitForTimeout(500);                               // (the day's greeting comes just after its card)
    let r = await out();
    assert.ok(r.reached && r.at.c > 280, `out of the front doors: ${JSON.stringify(r.at)}`);
    st = await career();
    assert.deepEqual([st.day, st.chapter], [9, 'ch1'], 'the test still to take: the day goes on');
    assert.match(r.toast, /予定が残っています/);
    await ev(() => window.__cadet.walkRoute([{ a: 655.0, c: 276.5 }, { a: 655.0, c: 272.0 }]));
    t = await talkThrough('lecturer');
    assert.match(t.lines.join('\n'), /28 \/ 28 問、100%/);
    st = await career();
    assert.ok(st.exams.written1.pass);
    // (M7) the day's plan done before the evening: the guide says to go home, and the front doors agree — walking out is
    // enough (no E, no card): the next morning, chapter 2
    await g.page.waitForTimeout(700);
    assert.match(await ev(() => { const C = window.__cadet; C.followGuide({ maxT: 0.1 }); return C.guide().text; }), /正面入口から寮に帰ると/);
    assert.equal(await ev(() => { const C = window.__cadet; C.placeWalker(655.0, 273.8, { a: 655.0, c: 285 }); C.lookAt(655.0, 276.2, 1.3); return C.current(); }), 'home');
    assert.match(await ev(() => document.querySelector('#prompt').textContent), /寮へ帰る/);
    r = await out();
    assert.equal(await ev(() => window.__cadet.card()), null, 'no card to answer');
    await g.page.waitForTimeout(4200);
    st = await career();
    assert.deepEqual([st.chapter, st.day], ['ch2', 10]);
    assert.deepEqual((await ev(() => window.__cadet.career.schedule())).map(x => `${x.kind} ${x.id}`), ['flight a1']);
    assert.deepEqual((await ev(() => window.__cadet.career.schedule())).map(x => `${x.kind} ${x.id}`), ['flight a1']);
  });

  test('talk: a morning of chapter 2 — how the cadet feels, then today\'s lesson briefed, checked, a question from the textbook, and it is saved', async () => {
    await ev(() => { window.__cadet.setMode('walk'); window.__cadet.resetProgress(); });
    assert.equal(await ev(() => window.__cadet.savedState()), null, 'the record is erased');
    assert.equal((await career()).chapter, 'prologue', 'a new career');
    // (the new career's card — after any still queued from the night before: no card for a whole second)
    await g.page.waitForFunction(() => { const C = window.__cadet; if (C.career.cards()) window.__noCard = 0; else window.__noCard = (window.__noCard || 0) + 1; return window.__noCard > 10; }, null, { polling: 100, timeout: 30000 });
    // day 12 of the career (a Monday; a weather seed with a day to fly), a1 flown: today a2
    await ev((p) => window.__cadet.career.set({ state: { seed: 2, chapter: 'ch2', day: 12, slot: 'morning', done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true } } }, progress: p, flags: { met_instructor: true, has_tablet: true }, place: false }), passed(['a1']));
    assert.deepEqual((await ev(() => window.__cadet.career.schedule())).map(x => `${x.kind} ${x.id}`), ['flight a2']);
    const ins = await ev(() => window.__cadet.instructor());
    assert.ok(ins.triangles > 1000 && ins.triangles < 20000, `${ins.triangles} triangles`);
    await ev((ins) => window.__cadet.placeWalker(ins.a + 2.4, ins.c - 0.6, { a: ins.a, c: ins.c }), ins);
    assert.equal(await ev((ins) => window.__cadet.lookAt(ins.a, ins.c, 1.5), ins), 'npc:instructor');
    await ev(() => window.__cadet.settings.set('textSpeed', 0.5));          // slow enough to click while it types
    assert.equal(await ev(() => window.__cadet.use()), 'talk');
    assert.equal(await ev(() => document.body.classList.contains('talking') && !!window.__cadet.dialog()), true);
    // a real click on the view while the line types shows the whole line (and only that); the next click goes on
    // IMSAFE first: rested, said so; then the clicks on the line that follows
    assert.match((await ev(() => window.__cadet.dialog())).text, /今日の体調/);
    await ev(() => window.__cadet.dialogChoose('問題ありません'));
    const d0 = await ev(() => window.__cadet.dialog());
    assert.match(d0.text, /それならよかった/);
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
    // today's lesson (a2, the middle of the day): its title, goal and standard from FLIGHT LAB's syllabus
    const lesson = await ev(() => window.__cadet.FL.syllabus.STAGES.flatMap(s => s.lessons).find(l => l.id === 'a2'));
    await ev(() => window.__cadet.dialogChoose('今日の課目'));
    const brief = await until(/./);
    const talk = brief.said.join('\n');
    assert.ok(talk.includes(lesson.title), 'the title'); assert.ok(talk.includes(lesson.std), 'the standard');
    assert.ok(talk.includes(lesson.goal), 'the goal');
    assert.match(talk, /1 日の飛行の中で/, 'where it sits in the day');
    // the check: the right answer raises trust
    assert.equal(brief.v.choices.length, 3);
    await ev((g) => window.__cadet.dialogChoose(g), lesson.goal.slice(0, 8));
    let st = await ev(() => window.__cadet.talkState());
    assert.equal(st.flags.brief_checked, true); assert.equal(st.trust.instructor, 53);
    // a question about the textbook: the section's key points, then the textbook opens on it
    await until(/質問があります/); await ev(() => window.__cadet.dialogChoose('質問があります'));
    // (today's section first in the list)
    const sec = (await ev(() => window.__cadet.dialog())).choices.find(c => /（今日の課目）/.test(c.text)).text.replace('（今日の課目）', '');
    await ev(() => window.__cadet.dialogChoose('今日の課目'));
    const ans = await until(/教科書で読む/);
    assert.ok(ans.said[0].includes(sec), `${sec}: ${ans.said[0]}`);
    if (ans.v.choices.some(c => /図を画面に映して/.test(c.text))) {
      await ev(() => window.__cadet.dialogChoose('図を画面に映して'));
      assert.match((await until(/教科書で読む/)).said[0], /画面に映します/);
    }
    await ev(() => window.__cadet.dialogChoose('教科書で読む'));
    assert.equal((await ev(() => window.__cadet.dialog())).bookOpen, true);
    assert.ok((await ev(() => document.body.innerText)).includes(sec), 'the textbook opens on it');
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

  test('fly: in today\'s Archer with the instructor beside you (not ready for today\'s flight: a practice), a lesson alone to a pass from the cockpit, a1 — FLIGHT LAB\'s score for the same inputs', async () => {
    // (in a new browser: day 12 as the talk left it — a1 flown, a2 briefed and checked, no go / no-go yet)
    await restart();
    await ev((p) => window.__cadet.career.set({ state: { seed: 2, chapter: 'ch2', day: 12, slot: 'morning', done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true } } }, progress: p, flags: { met_instructor: true, has_tablet: true, briefed_today: true, brief_checked: true }, place: false }), passed(['a1']));
    const tg = await ev(() => window.__cadet.spec.target);
    await ev((tg) => { const C = window.__cadet; C.setMode('walk'); C.placeWalker(tg.a + 2.6, tg.c + 1.0, { a: tg.a + 1.0, c: tg.c }); }, tg);
    assert.equal(await ev((tg) => window.__cadet.lookAt(tg.a + 1.0, tg.c, 1.25), tg), 'aircraft:board');
    assert.equal(await ev(() => window.__cadet.use()), 'board');
    await g.page.waitForTimeout(900);                                          // the fade
    await ev(() => window.__cadet.simulate(0.3));
    let fs = await ev(() => window.__cadet.fly.status());
    assert.equal(await ev(() => window.__cadet.mode()), 'fly');
    assert.deepEqual([fs.active, fs.phase, fs.view, fs.talking], [true, 'board', 'cockpit', true]);
    // the instructor in the right seat: his head right of yours, about as high, not ahead of the panel
    const [hx, hy, hz] = fs.seatAt, [ex, ey, ez] = fs.eye;
    assert.ok(hx - ex > 0.4 && hx - ex < 0.8 && Math.abs(hy - ey) < 0.2 && Math.abs(hz - ez) < 0.25, `his head at ${fs.seatAt} (your eye ${fs.eye})`);
    assert.match((await ev(() => window.__cadet.dialog())).text, /シートベルト/);
    // the cockpit, drawn within budget
    const a = await analyse(g.page, await ev(() => window.__cadet.snapshot(2)));
    assert.ok(a.sd > 8 && a.mean > 30 && a.mean < 235, `cockpit: mean ${a.mean.toFixed(0)} sd ${a.sd.toFixed(1)}`);
    let st = await ev(() => window.__cadet.stats());
    assert.ok(st.calls < 400 && st.triangles < 900000, `cockpit: ${st.calls} calls, ${st.triangles} triangles`);
    // his talk: briefed, but no go / no-go given at the counter yet — not today's flight: a practice flight or out again
    const said = [];
    let v = await ev(() => window.__cadet.dialog());
    for (let k = 0; k < 8 && v && !v.choices.length; k++) { said.push(v.text); v = await ev(() => { window.__cadet.dialogReveal(); return window.__cadet.dialogNext(); }); }
    said.push(v.text);
    assert.match(said.join('\n'), /天気の判断がまだ/);
    assert.deepEqual(v.choices.map(c => c.text), ['駐機場から少しだけ飛ぶ（練習）', '降ります']);
    await ev(() => window.__cadet.dialogChoose('練習'));
    await ev(() => { window.__cadet.dialogReveal(); window.__cadet.dialogNext(); });
    assert.equal(await ev(() => window.__cadet.dialog()), null);
    // a lesson alone (a2, from the training area), at the basic level
    await ev(() => window.__cadet.fly.lesson('basic', 'a2'));
    await ev(() => window.__cadet.simulate(0.1));
    fs = await ev(() => window.__cadet.fly.status());
    assert.deepEqual([fs.phase, fs.flight.mode, fs.flight.id, fs.flight.level, fs.flight.step], ['lesson', 'lesson', 'a2', 'basic', 0]);
    assert.ok(Math.abs(fs.yaw) < 1e-9, 'the head turned back to the front');
    // real time, hands off (FLIGHT LAB holds the attitude when the keys are let go): the lesson runs to its end
    for (let k = 0; k < 70 && !(fs.flight && fs.flight.done); k++) fs = await ev(() => { window.__cadet.simulate(1); return window.__cadet.fly.status(); });
    assert.deepEqual([fs.flight.done, fs.flight.passed, fs.flight.grade], [true, true, 'S'], JSON.stringify(fs.flight.results));
    await g.page.waitForTimeout(900);
    await ev(() => window.__cadet.simulate(0.1));
    assert.equal((await ev(() => window.__cadet.fly.status())).debrief, true);
    const card = await ev(() => document.body.innerText);
    assert.ok(/課目の結果/.test(card) && /合格/.test(card) && /直線水平飛行（基礎）/.test(card), card);
    // FLIGHT LAB's scripted pilot (bot.mjs) through the same bridge, in the page: bit for bit FLIGHT LAB's own loop
    // (bot.mjs runLesson) in the same page; and the same grade, score and time as in node (another JavaScript engine
    // may round a sine or a power differently in the last bit, so the positions are compared to the millimetre there)
    await ev((src) => { (0, eval)(src + '\nwindow.makeBot = makeBot; window.runLesson = runLesson;'); }, BOT_SRC);
    for (const [lv, hook] of [['intro', ''], ['basic', ''], ['precision', ''], ['basic', 'noseUp']]) {
      const { got, lab } = await ev(({ lv, hook }) => {
        const C = window.__cadet, h = hook === 'noseUp' ? (L) => { if (L.step === 1 && L.st.t < 15) L.s.pTgt = 5; } : undefined;
        const pick = (L) => ({ grade: L.grade, passed: L.passed, score: L.score, t: L.t, pos: L.s.pos, q: L.s.q, rows: L.results });
        C.fly.lesson(lv, 'a1');
        C.fly.runScripted(window.makeBot(C.FL).fly, 900, h);
        return { got: pick(C.fly.flight.L), lab: pick(window.runLesson(C.FL, 'a1', lv, 900, h)) };
      }, { lv, hook });
      assert.deepEqual(got, lab, `a1 ${lv} ${hook}: CADET and FLIGHT LAB in the same page`);
      const ref = runLesson(FL, 'a1', lv, 900, hook === 'noseUp' ? (L) => { if (L.step === 1 && L.st.t < 15) L.s.pTgt = 5; } : undefined);
      assert.deepEqual([got.grade, got.passed, got.score.toFixed(6), got.t.toFixed(3)], [ref.grade, ref.passed, ref.score.toFixed(6), ref.t.toFixed(3)], `a1 ${lv} ${hook}: as in node`);
      assert.deepEqual(got.rows.flatMap(r => r.rows.map(x => [x.name, x.val, x.pass])), ref.results.flatMap(r => r.rows.map(x => [x.name, x.val, x.pass])), `a1 ${lv} ${hook}: the rows as in node`);
      for (let i = 0; i < 3; i++) assert.ok(Math.abs(got.pos[i] - ref.s.pos[i]) < 1e-3, `a1 ${lv} ${hook}: position ${got.pos} vs ${ref.s.pos}`);
    }
    await g.page.waitForTimeout(900);
    await ev(() => window.__cadet.simulate(0.1));
    // the chase view (C) and a lever in the cockpit
    await ev(() => window.__cadet.fly.view('chase'));
    const ch = await analyse(g.page, await ev(() => window.__cadet.snapshot(2)));
    st = await ev(() => window.__cadet.stats());
    assert.ok(ch.sd > 8 && st.calls < 400 && st.triangles < 900000, `chase: sd ${ch.sd.toFixed(1)}, ${st.calls} calls, ${st.triangles} triangles`);
    await ev(() => window.__cadet.fly.view('cockpit'));
    // a lesson again (from the debrief's button): the keys fly it — R holds the throttle forward — and the flap lever
    // under the hand moves the flaps
    await g.page.getByRole('button', { name: /もう一度/ }).click();
    await g.page.waitForTimeout(900);
    await ev(() => window.__cadet.simulate(0.1));
    assert.deepEqual(await ev(() => { const s = window.__cadet.fly.status(); return [s.debrief, s.flight.done, s.flight.level]; }), [false, false, 'basic']);
    const thr0 = await ev(() => window.__cadet.fly.flight.s.thr);
    await g.page.keyboard.down('KeyR'); await ev(() => window.__cadet.simulate(0.5)); await g.page.keyboard.up('KeyR');
    assert.ok(await ev(() => window.__cadet.fly.flight.s.thr) > thr0 + 0.05, 'R: more throttle');
    const f0 = await ev(() => window.__cadet.fly.flight.s.flapIdx);
    await ev(() => window.__cadet.fly.act('flaps', 1));
    assert.equal(await ev(() => window.__cadet.fly.flight.s.flapIdx), f0 + 1, 'the flap lever moves the flaps');
    // getting out while the lesson runs is not offered; it ends from the debrief (the bot finishes this one)
    assert.equal(await ev(() => window.__cadet.fly.status().flight.done), false);
    await ev(() => { const C = window.__cadet; C.fly.lesson('basic', 'a1'); C.fly.runScripted(window.makeBot(C.FL).fly, 900); });
    await g.page.waitForTimeout(900);
    await ev(() => window.__cadet.simulate(0.1));
    // back to the apron from the debrief: walking beside the aircraft
    await g.page.getByRole('button', { name: '駐機場へ戻る' }).click();
    await g.page.waitForTimeout(900);
    await ev(() => window.__cadet.simulate(0.2));
    assert.equal(await ev(() => window.__cadet.mode()), 'walk');
    assert.equal((await ev(() => window.__cadet.fly.status())).active, false);
    assert.equal((await ev(() => window.__cadet.player())).place, '駐機場（エプロン）');
    assert.equal(await ev((tg) => window.__cadet.lookAt(tg.a + 1.0, tg.c, 1.25), tg), 'aircraft:board');
    // briefed already: he is back by the aircraft, behind its right wing
    const ins = await ev(() => window.__cadet.instructor()), wi = await ev(() => window.__cadet.walk.instructor());
    assert.equal(wi.at, 'apron');
    assert.ok(Math.hypot(ins.at.a - wi.a, ins.at.c - wi.c) < 0.01, `the instructor is at ${JSON.stringify(ins.at)}`);
  });

  test('a flying day: the go / no-go, the walk-around by hand, the start, the radio, the taxi, t1 → a2 → t3 by FLIGHT LAB\'s bot, the debrief and the logbook', async () => {
    const C = (fn, a) => ev(fn, a);
    await ev((src) => { if (!window.makeBot) (0, eval)(src + '\nwindow.makeBot = makeBot; window.runLesson = runLesson;'); }, BOT_SRC);
    await C(() => { window.__cadet.setMode('walk'); });
    // the go / no-go at the dispatch counter: the right call for today's weather
    const wx = await C(() => window.__cadet.career.weather());
    const call = { go: '予定どおり', wait: '午後まで待ちます', early: '早めに出て', cancel: '今日は飛びません' }[wx.decision];
    const dt = await talkThrough('dispatcher', [call]);
    assert.match(dt.lines.join('\n'), /私もそう思います/);
    assert.match(await C(() => window.__cadet.career.readiness()), /ready/);
    // the walk-around: every place from where a cadet stands, E, then the decision (1–4); anomalies reported
    const targets = await C(() => window.__cadet.walk.targets()), planted = await C(() => window.__cadet.walk.planted());
    assert.equal(targets.length, 15);
    const props0 = await C(() => window.__cadet.walk.props());
    assert.ok(props0.pitot && props0.tieL && props0.tieR && props0.tieT && props0.chocks, 'the cover, the ropes and the chocks are there');
    for (const t of targets) {
      const got = await C(({ t }) => {
        const W = window.__cadet, st = W.walk.stand(t.id);
        W.placeWalker(st.a, st.c, { a: t.a, c: t.c });
        return W.lookAt(t.a, t.c, t.y);
      }, { t });
      assert.equal(got, 'walk:' + t.id, `${t.id}: seen from where one stands`);
      assert.equal(await C(() => window.__cadet.use()), 'examined');
      for (let k = 0; k < 4; k++) {
        const ch = await C(() => window.__cadet.walk.choices()); if (!ch) break;
        const i = ch.indexOf('task') >= 0 ? ch.indexOf('task') : ch.indexOf('fix') >= 0 ? ch.indexOf('fix') : planted.includes(t.id) && ch.indexOf('report') >= 0 ? ch.indexOf('report') : ch.indexOf('ok');
        if (i < 0) break;
        await g.page.keyboard.press(`Digit${i + 1}`);
      }
      if (await C(() => window.__cadet.card())) await C(() => window.__cadet.use());
    }
    const ws = await C(() => window.__cadet.walk.summary());
    assert.equal(ws.done, 15, JSON.stringify(ws.rows.filter(r => !r.done)));
    assert.equal(ws.found, ws.anomalies); assert.equal(ws.missed.length, 0);
    const props1 = await C(() => window.__cadet.walk.props());
    assert.ok(!props1.pitot && !props1.tieL && !props1.tieR && !props1.tieT && !props1.chocks && !props1.capOpen, 'all taken away');
    // in the seat: the aircraft cold (the M3 tachometer: 0 rpm until it is started), the whole day at the basic level
    const tg = await C(() => window.__cadet.spec.target);
    await C((tg) => { const W = window.__cadet; W.placeWalker(tg.a + 2.6, tg.c + 1.0, { a: tg.a + 1.0, c: tg.c }); W.lookAt(tg.a + 1.0, tg.c, 1.25); return W.use(); }, tg);
    await g.page.waitForTimeout(900); await C(() => window.__cadet.simulate(0.3));
    let fs = await C(() => window.__cadet.fly.status());
    assert.deepEqual([fs.engine.running, Math.round(fs.engine.rpm), fs.engine.sw.master, fs.engine.sw.mag], [false, 0, false, 'OFF'], 'cold on the stand');
    for (let i = 0; i < 12; i++) {
      const d = await C(() => window.__cadet.dialog()); if (!d) break;
      if (d.choices.length) await C((re) => window.__cadet.dialogChoose(re), '^基礎');
      else await C(() => window.__cadet.dialogNext());
    }
    let day = await C(() => window.__cadet.fly.day());
    assert.equal(day.phase, 'prestart');
    // the start by hand: the switches clicked as the checklist asks (the ring shows each), the key to START
    const act = (id, dir = 1, wheel = false) => C(({ id, dir, wheel }) => window.__cadet.fly.act(id, dir, wheel), { id, dir, wheel });
    const tick = (s = 0.5) => C((s) => window.__cadet.simulate(s, 1 / 30), s);
    await C(() => window.__cadet.fly.key('Enter')); await C(() => window.__cadet.fly.key('Enter'));         // seat and door, breakers (looked at)
    // the parking brake: set on the stand already (a click would release it — and at 1,000 rpm the Archer rolls)
    assert.equal(await C(() => window.__cadet.fly.flight.controls.parkBrake), true, 'the parking brake set on the stand');
    await tick();
    day = await C(() => window.__cadet.fly.day());
    assert.equal(day.phase, 'start', JSON.stringify(day.items));
    assert.equal((await C(() => window.__cadet.fly.status())).guide, 'mixture', 'the ring round the mixture');
    await act('mixture'); await act('throttle', 1, true); await act('sw.master'); await act('sw.beacon'); await act('sw.fuelPump');
    await act('primer'); await act('primer'); await act('primer'); await tick();
    await C(() => window.__cadet.fly.key('Enter'));                                                          // the propeller clear
    for (let k = 0; k < 4; k++) await act('mag');                                                            // OFF → R → L → BOTH → START
    await tick(0.1);                                                                                         // (the starter engages on the next frame)
    fs = await C(() => window.__cadet.fly.status());
    assert.ok(fs.engine.cranking, 'the starter turns it');
    await tick(3);
    fs = await C(() => window.__cadet.fly.status());
    assert.ok(fs.engine.running && fs.engine.sw.mag === 'BOTH', 'it caught, the key sprang back');
    assert.ok(fs.engine.rpm > 500, `rpm ${fs.engine.rpm}`);
    // from here the instructor's hands, the radio answered right, the taxi by the instructor, the lessons by the bot
    // (seen from outside: the cockpit's screens are not drawn, which keeps the software renderer quick)
    await C(() => window.__cadet.fly.view('chase'));
    // (M8) the AI instructor on for this day's debrief, with a stand-in for the API
    await C((src) => { (0, eval)(`${src}\nwindow.__fakeClaude = fakeClaude;`); window.__calls = []; const W = window.__cadet; W.ai.useFetch(window.__fakeClaude({ calls: window.__calls })); W.ai.keys.set('sk-ant-api03-DEBRIEF-0123456789'); W.settings.set('aiTutor', true); }, FAKE_SRC);
    let askedDebrief = false;
    // (M8) the microphone on, with a stand-in for the browser's speech recognition: it "hears" window.__micSay
    await C(() => {
      window.__micSay = '';
      window.SpeechRecognition = class { start() { setTimeout(() => { const t = window.__micSay; if (t) { if (this.onresult) this.onresult({ results: [[{ transcript: t }]] }); } else if (this.onerror) this.onerror({ error: 'no-speech' }); if (this.onend) this.onend(); }, 30); } stop() {} abort() {} };
      window.__cadet.settings.set('micRadio', true);
    });
    const micSaid = [];
    const log = [];
    for (let k = 0; k < 700; k++) {
      day = await C(() => window.__cadet.fly.day()); if (!day) break;
      if (!log.length || log[log.length - 1] !== day.phase) log.push(day.phase);
      if (day.phase === 'done') break;
      const dlg = await C(() => window.__cadet.dialog());
      // (M8) at the debrief, by the logbook: a free question about the day — the day's results go with it
      if (dlg && dlg.node === 'sign' && !askedDebrief && dlg.choices.some(c => /今日の飛行について質問/.test(c.text))) {
        askedDebrief = true;
        await C(() => window.__cadet.dialogChoose('今日の飛行について質問'));
        await g.page.waitForFunction(() => window.__cadet.ai.asking(), null, { timeout: 5000 });
        await C(() => window.__cadet.ai.ask('今日の a2 の速度はどうでしたか'));
        await g.page.waitForFunction(() => { const v = window.__cadet.dialog(); return v && v.dialog === 'ai' && v.choices.length >= 2; }, null, { timeout: 15000 });
        const q = await C(() => window.__calls.at(-1).body.messages.at(-1).content);
        assert.match(q, /飛行のあとの講評/); assert.match(q, /今日の結果[\s\S]*課目 a2/);
        await C(() => window.__cadet.dialogChoose('ありがとうございました'));
        assert.equal((await C(() => window.__cadet.dialog())).node, 'sign', 'back to the logbook');
        continue;
      }
      if (dlg) { if (dlg.choices.length) await C((re) => window.__cadet.dialogChoose(re), dlg.choices.some(c => /省く/.test(c.text)) ? '省く' : dlg.choices.some(c => /航空日誌/.test(c.text)) ? '航空日誌' : dlg.choices[0].text); else await C(() => window.__cadet.dialogNext()); continue; }
      const lb = await C(() => window.__cadet.logbook());
      if (lb.open) { await g.page.getByRole('button', { name: '閉じる' }).click(); continue; }
      fs = await C(() => window.__cadet.fly.status());
      if (fs.flight && fs.flight.mode === 'lesson' && !fs.flight.done) {
        await C(() => { const W = window.__cadet; W.fly.runScripted(window.makeBot(W.FL).fly, 900, () => { W.fly.radioTick(1 / 120); W.fly.answer(true); }); });
        continue;
      }
      // (M8) the taxi instruction's read-back said into the microphone: first with the hold-short left out (not taken,
      // the missing words shown), then whole (taken, right the first time)
      if (day.radio && day.radio.phase === 'choose' && day.radio.id === 'gnd_rb' && micSaid.length < 2) {
        const say = micSaid.length ? 'runway 36 taxi via alpha hold short of runway 36 at alpha one archer 8 sierra yankee' : 'runway 36 taxi via alpha archer 8 sierra yankee';
        await C((t) => { window.__micSay = t; window.__cadet.fly.key('KeyM'); }, say);
        await g.page.waitForFunction(() => { const m = window.__cadet.fly.mic(); return m && !m.on; }, null, { timeout: 5000 });
        const m = await C(() => window.__cadet.fly.mic());
        micSaid.push(m);
        if (micSaid.length === 1) {
          assert.deepEqual(m.missing, ['誘導路 A1', '“hold short”'], JSON.stringify(m));
          await C(() => window.__cadet.simulate(0.05));
          assert.match(await C(() => document.querySelector('#fhud .dh-mic').textContent), /足りない言葉：誘導路 A1・“hold short”/);
          assert.equal((await C(() => window.__cadet.fly.day())).radio.phase, 'choose', 'not taken: still waiting for the answer');
        }
        continue;
      }
      if (day.radio && day.radio.phase === 'choose') await C(() => window.__cadet.fly.answer(true));
      if (day.items && !day.assisting) await C(() => window.__cadet.fly.assist());
      if (['taxiOut', 'lineup', 'taxiOff', 'taxiIn'].includes(day.phase) && !day.assisting) await C(() => window.__cadet.fly.key('KeyY'));
      await tick(4);
    }
    assert.deepEqual(log, ['afterStart', 'atis', 'ground', 'taxiOut', 'runup', 'tower', 'lineup', 't1', 'leave', 'transit', 'a2', 'back', 'return', 't3', 'exit', 'taxiOff', 'groundIn', 'taxiIn', 'shutdown', 'debrief', 'done'], `the day's phases (${day && day.st && day.st.crash ? 'damaged: ' + day.st.crash + ' ' + JSON.stringify(day.st.obstacle) : 'not damaged'})`);
    assert.equal(day.phase, 'done', log.join(' '));
    assert.ok(!day.st.incursion);
    assert.ok(askedDebrief, 'the debrief offered the free question');
    assert.equal(micSaid.length, 2, 'the read-back by voice');
    await C(() => { window.__cadet.settings.set('micRadio', false); delete window.SpeechRecognition; });
    await C(() => { const W = window.__cadet; W.settings.set('aiTutor', false); W.ai.keys.clear(); W.ai.useFetch(null); });
    // the lessons in the logbook: FLIGHT LAB's grades for the same inputs (its bot in node)
    const lb = await C(() => window.__cadet.logbook());
    const e = lb.entries[lb.entries.length - 1];
    assert.deepEqual(e.lessons.map(l => [l.id, l.grade]), ['t1', 'a2', 't3'].map(id => [id, runLesson(FL, id, 'basic', 900).grade]));
    assert.equal(e.reg, 'N738SY'); assert.equal(e.landings, 1); assert.ok(e.sig.name === '早瀬 航' && e.total > 0);
    fs = await C(() => window.__cadet.fly.status());
    assert.ok(!fs.engine.running && !fs.engine.sw.master, 'shut down');
    await C(() => window.__cadet.fly.view('cockpit'));
    // out through the door: the day's flight is done (the afternoon now), the next one is a new walk-around
    await act('door'); await g.page.waitForTimeout(900); await C(() => window.__cadet.simulate(0.3));
    assert.equal(await C(() => window.__cadet.mode()), 'walk');
    assert.equal((await C(() => window.__cadet.walk.summary())).done, 0);
    const st = await career();
    assert.deepEqual([st.done['flight:a2'], st.slot], [12, 'pm']);
    assert.equal(e.date, '2027-04-12');
    assert.match(await C(() => window.__cadet.career.readiness()), /終わりました/);
  });

  test('the check ride with the chief instructor in the right seat; the first solo — no one in the right seat, three circuits by FLIGHT LAB\'s bot, the celebration and the endorsement', async () => {
    await restart();
    const C = (fn, a) => ev(fn, a);
    await ev((src) => { if (!window.makeBot) (0, eval)(src + '\nwindow.makeBot = makeBot; window.runLesson = runLesson;'); }, BOT_SRC);
    await ev((src) => { if (!window.patternHook) (0, eval)(src + '\nwindow.patternHook = patternHook;'); }, HOOK_SRC);
    const CH2 = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't2', 't4', 'e1', 'e2', 'e3', 't1', 't3'];
    const exams = { written1: { tries: 1, best: 90, pass: true }, presolo: { tries: 1, best: 95, pass: true } };
    // the first day after day 25 that can be flown and has `kind` planned
    const dayWith = (kind, prog) => C(({ kind, prog, exams }) => {
      const K = window.__cadet.career;
      for (let d = 26; d < 60; d++) { K.set({ state: { chapter: 'ch2', day: d, slot: 'morning', done: { prologue: 1 }, exams, solo: null }, progress: prog, flags: { met_instructor: true, has_tablet: true }, trust: { instructor: 72 }, place: false }); if (K.schedule().some(x => x.kind === kind)) return d; }
      return -1;
    }, { kind, prog, exams });
    // ---- the check ride: the chief instructor's brief in his room, then by the aircraft; in the right seat
    const d1 = await dayWith('checkride', passed(CH2));
    assert.ok(d1 > 0);
    await C(() => window.__cadet.setMode('walk'));
    let t = await talkThrough('chief', ['よろしくお願いします']);
    assert.match(t.lines.join('\n'), /ソロ前の審査です/);
    const cw = await C(() => window.__cadet.career.where('chief'));
    assert.ok(cw && cw.c < 230, `the chief instructor by the aircraft: ${JSON.stringify(cw)}`);
    const wx = await C(() => window.__cadet.career.weather());
    await talkThrough('dispatcher', [{ go: '予定どおり', wait: '午後まで', early: '早めに出て', cancel: '今日は飛びません' }[wx.decision]]);
    assert.equal(await C(() => window.__cadet.career.readiness()), 'checkride');
    const tg = await C(() => window.__cadet.spec.target);
    const board = async () => { await C((tg) => { const W = window.__cadet; W.placeWalker(tg.a + 2.6, tg.c + 1.0, { a: tg.a + 1.0, c: tg.c }); W.lookAt(tg.a + 1.0, tg.c, 1.25); return W.use(); }, tg); await g.page.waitForTimeout(900); await C(() => window.__cadet.simulate(0.3)); };
    await board();
    let fs = await C(() => window.__cadet.fly.status());
    assert.equal(await C(() => window.__cadet.fly.crew()), 'chief');
    assert.ok(fs.seatAt, 'someone in the right seat');
    let d = await C(() => window.__cadet.dialog());
    assert.equal(d.name, '真壁 主任教官'); assert.match(d.text, /ソロ前の審査を始めます/);
    t = await talkThrough(null, ['一度降ります']);
    await g.page.waitForTimeout(900); await C(() => window.__cadet.simulate(0.3));
    assert.equal(await C(() => window.__cadet.mode()), 'walk');
    assert.ok((await C(() => window.__cadet.career.where('chief'))).c < 230, 'back by the aircraft');
    // ---- c1 passed: the solo (good weather, the instructor's trust 72)
    const d2 = await dayWith('solo', passed([...CH2, 'c1']));
    assert.ok(d2 > 0);
    await talkThrough('dispatcher', ['予定どおり']);
    t = await talkThrough('instructor', ['行ってきます']);
    assert.match(t.lines.join('\n'), /ファーストソロです/);
    assert.equal(await C(() => window.__cadet.career.readiness()), 'ready');
    await board();
    fs = await C(() => window.__cadet.fly.status());
    assert.deepEqual([await C(() => window.__cadet.fly.crew()), fs.seatAt, fs.talking, await C(() => window.__cadet.fly.solo())], [null, null, false, true], 'alone: no one to talk to, the day begins');
    let day = await C(() => window.__cadet.fly.day());
    assert.equal(day.phase, 'prestart');
    await C(() => window.__cadet.fly.view('chase'));
    const tick = (s = 0.5) => C((s) => window.__cadet.simulate(s, 1 / 30), s);
    const log = [];
    for (let k = 0; k < 1200; k++) {
      day = await C(() => window.__cadet.fly.day()); if (!day) break;
      if (!log.length || log[log.length - 1] !== day.phase) log.push(day.phase);
      if (day.phase === 'done') break;
      fs = await C(() => window.__cadet.fly.status());
      if (fs.flight && fs.flight.mode === 'lesson' && !fs.flight.done) {
        await C(() => { const W = window.__cadet, h = W.fly.flight.L.id === 't2' ? window.patternHook(W.FL) : null; W.fly.runScripted(window.makeBot(W.FL).fly, 900, (L, t) => { W.fly.radioTick(1 / 120); W.fly.answer(true); if (h) h(L, t); }); });
        continue;
      }
      if (await C(() => window.__cadet.fly.asking())) { await C(() => window.__cadet.fly.key('Digit2')); continue; }
      if (day.radio && day.radio.phase === 'choose') await C(() => window.__cadet.fly.answer(true));
      if (day.items && !day.assisting) await C(() => window.__cadet.fly.assist());
      if (['taxiOut', 'lineup', 'taxiOff', 'taxiIn'].includes(day.phase) && !day.assisting) await C(() => window.__cadet.fly.taxi());
      await tick(4);
    }
    // (no debrief to sit through alone: that step passes at once, between two looks)
    assert.deepEqual(log.filter(p => /^t[12]$|closed|pattern|stopgo|recycle|exit|done/.test(p)), ['t1', 'closed', 'pattern', 't2', 'stopgo', 'recycle', 't2', 'stopgo', 'recycle', 't2', 'exit', 'done']);
    // signed off outside: the logbook's line (solo time, three landings, the endorsement); they wait by the aircraft
    const lb = await C(() => window.__cadet.logbook()), e = lb.entries[lb.entries.length - 1];
    assert.ok(e.solo > 0 && e.dual === 0, `solo ${e.solo}`); assert.equal(e.landings, 3); assert.match(e.endorsement, /単独飛行/);
    assert.deepEqual(e.lessons.map(l => l.id), ['t1', 't2', 't2', 't2']);
    assert.ok(e.lessons.every(l => l.passed));
    await C(() => window.__cadet.fly.view('cockpit'));
    await C(() => window.__cadet.fly.act('door')); await g.page.waitForTimeout(900); await C(() => window.__cadet.simulate(0.3));
    assert.equal(await C(() => window.__cadet.mode()), 'walk');
    assert.equal(await C(() => window.__cadet.career.celebrate()), true);
    for (const id of ['kiryu', 'asahi', 'mori']) assert.ok((await C((id) => window.__cadet.career.where(id), id)).c < 230, `${id} by the aircraft`);
    t = await talkThrough('instructor', ['航空日誌を見る']);
    assert.match(t.lines.join('\n'), /ファーストソロ、おめでとう[\s\S]*シャツの裾/);
    if ((await C(() => window.__cadet.logbook())).open) await g.page.getByRole('button', { name: '閉じる' }).click();
    const st = await career();
    assert.ok(st.solo && st.solo.day === d2);
    assert.equal(st.slot, 'evening');
    assert.deepEqual(await C(() => window.__cadet.career.gate()), [], 'chapter 2 done');
  });

  // ---- M6: chapters 3–6, a representative day of each (each in a new browser: a whole day is heavy for the software
  // renderer). The career set to that morning; the day flown as in chapter 2's tests (the radio answered right, the
  // instructor's hands for the checklists and the taxi, FLIGHT LAB's bot for the lessons, the moves skipped)
  const ALL2 = [...['k1', 'k2', 'k3', 'k4', 'k5', 'k6'], 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't2', 't4', 'e1', 'e2', 'e3', 't1', 't3', 'c1'];
  const CH3L = ['x3', 'x1', 'x2', 'n1', 'n2', 'n3'], CH4L = ['i1', 'i2', 'i3', 'i4', 'i5'], CH5L = ['m1', 'm2', 'm3', 'm4', 'm5'];
  const EX = (...ids) => Object.fromEntries(['written1', 'presolo', ...ids].map(id => [id, { tries: 1, best: 90, pass: true }]));
  const CHK = (...ids) => Object.fromEntries(ids.map(id => [id, { tries: 1, pass: true, day: 40 }]));
  // the first day from day 40 with `kind` planned (a flying day: good, or as the chapter makes it)
  const m6Day = (o) => ev((o) => {
    const K = window.__cadet.career;
    for (let d = 40; d < 120; d++) {
      K.set({ state: { chapter: o.chapter, day: d, slot: 'morning', done: { prologue: 1 }, exams: o.exams, solo: { day: 30 }, checks: o.checks || {} }, progress: o.prog, flags: { met_instructor: true, has_tablet: true, ...(o.flags || {}) }, trust: { instructor: 75 }, place: false });
      if (K.schedule().some(x => x.kind === o.kind)) return d;
    }
    return -1;
  }, o);
  const flyDay = async ({ hooks = {}, onLesson = null } = {}) => {
    const C = (fn, a) => ev(fn, a), log = [];
    await C(() => window.__cadet.fly.view('chase'));
    for (let k = 0; k < 1200; k++) {
      const day = await C(() => window.__cadet.fly.day()); if (!day) break;
      if (!log.length || log[log.length - 1] !== day.phase) log.push(day.phase);
      if (day.phase === 'done') break;
      const dlg = await C(() => window.__cadet.dialog());
      if (dlg) { if (dlg.choices.length) await C((re) => window.__cadet.dialogChoose(re), dlg.choices.some(c => /省く/.test(c.text)) ? '省く' : dlg.choices.some(c => /航空日誌/.test(c.text)) ? '航空日誌' : dlg.choices[0].text); else await C(() => window.__cadet.dialogNext()); continue; }
      if ((await C(() => window.__cadet.logbook())).open) { await g.page.getByRole('button', { name: '閉じる' }).click(); continue; }
      const fs = await C(() => window.__cadet.fly.status());
      if (fs.flight && fs.flight.mode === 'lesson' && !fs.flight.done) {
        if (onLesson) await onLesson(await C(() => window.__cadet.fly.flight.L.id));
        await C((hooked) => { const W = window.__cadet, id = W.fly.flight.L.id, h = hooked.includes(id) ? window.patternHook(W.FL) : null; W.fly.runScripted(window.makeBot(W.FL).fly, 1500, (L, t) => { W.fly.radioTick(1 / 120); W.fly.answer(true); if (h) h(L, t); }); }, Object.keys(hooks));
        continue;
      }
      if (await C(() => window.__cadet.fly.asking())) { await C(() => window.__cadet.fly.key('Digit2')); continue; }
      if (day.radio && day.radio.phase === 'choose') await C(() => window.__cadet.fly.answer(true));
      if (day.items && !day.assisting) await C(() => window.__cadet.fly.assist());
      if (['taxiOut', 'lineup', 'taxiOff', 'taxiIn'].includes(day.phase) && !day.assisting) await C(() => window.__cadet.fly.taxi());
      await C(() => window.__cadet.simulate(4, 1 / 30));
    }
    return log;
  };
  const boardToday = async () => {
    const tg = await ev(() => window.__cadet.spec.target);
    const r = await ev((tg) => { const W = window.__cadet; W.placeWalker(tg.a + 2.6, tg.c + 1.0, { a: tg.a + 1.0, c: tg.c }); W.lookAt(tg.a + 1.0, tg.c, 1.25); return W.use(); }, tg);
    await g.page.waitForTimeout(900); await ev(() => window.__cadet.simulate(0.3));
    return r;
  };
  const goNoGo = async () => { const wx = await ev(() => window.__cadet.career.weather()); return talkThrough('dispatcher', [{ go: '予定どおり', wait: '午後まで', early: '早めに出て', cancel: '今日は飛びません' }[wx.decision]]); };
  const loadBot = async () => {
    await ev((src) => { if (!window.makeBot) (0, eval)(src + '\nwindow.makeBot = makeBot; window.runLesson = runLesson;'); }, BOT_SRC);
    await ev((src) => { if (!window.patternHook) (0, eval)(src + '\nwindow.patternHook = patternHook;'); }, HOOK_SRC);
  };

  test('chapter 3: the navigation log on the whiteboard, then the solo cross-country — alone, n2 and its diversion by FLIGHT LAB\'s bot; the logbook\'s cross-country line; chapter 4\'s card the next morning', async () => {
    await restart(); await loadBot();
    const d = await m6Day({ chapter: 'ch3', kind: 'xc', exams: EX('nav'), prog: passed([...ALL2, ...CH3L]) });
    assert.ok(d > 0);
    await ev(() => window.__cadet.setMode('walk'));
    assert.deepEqual((await ev(() => window.__cadet.career.schedule())).map(x => `${x.slot} ${x.kind}`), ['am navlog', 'pm xc']);
    // the navigation log: the planned leg worked out with the instructor (the right answers), drawn on the whiteboard
    let t = await talkThrough('instructor');
    assert.match(t.lines.join('\n'), /航法ログを作りましょう[\s\S]*磁方位のコース[\s\S]*磁針路[\s\S]*対地速度[\s\S]*所要時間[\s\S]*燃料/);
    assert.match(t.lines.join('\n'), /5 \/ 5 問、100%/);
    assert.equal((await career()).slot, 'pm');
    await goNoGo();
    t = await talkThrough('instructor', ['行ってきます']);
    assert.match(t.lines.join('\n'), /単独の野外飛行です[\s\S]*目的地の変更/);
    assert.equal(await ev(() => window.__cadet.career.readiness()), 'ready');
    assert.equal(await boardToday(), 'board');
    assert.deepEqual([await ev(() => window.__cadet.fly.crew()), await ev(() => window.__cadet.fly.solo())], [null, true], 'alone');
    const log = await flyDay();
    assert.deepEqual(log.filter(p => /^[tn][1-3]$|^done$/.test(p)), ['t1', 'n2', 't3', 'done']);
    const lb = await ev(() => window.__cadet.logbook()), e = lb.entries[lb.entries.length - 1];
    assert.ok(e.solo > 0 && e.xc > 0 && e.dual === 0, JSON.stringify(e)); assert.match(e.endorsement, /野外飛行/);
    assert.deepEqual(e.lessons.map(l => l.id), ['t1', 'n2', 't3']);
    let st = await career();
    assert.ok(st.checks.xc && st.checks.xc.pass, 'the cross-country passed');
    assert.deepEqual(await ev(() => window.__cadet.career.gate()), [], 'chapter 3 done');
    // the night: chapter 4, its card first
    await ev(() => window.__cadet.fly.view('cockpit')); await ev(() => window.__cadet.fly.act('door')); await g.page.waitForTimeout(900);
    await ev(() => { window.__cadet.career.sleep(); });             // (not awaited: the cards are what is looked at)
    await g.page.waitForTimeout(1200);
    assert.match(await ev(() => document.querySelector('.cd').innerText), /新しい章[\s\S]*第 4 章　計器/);
    await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { timeout: 20000 });
    st = await career();
    assert.equal(st.chapter, 'ch4');
  });

  test('chapter 3 (M7): the run-up finds the left magneto beyond its limit — the instructor asks, the cadet goes back to the stand, the debrief says why', async () => {
    await restart(); await loadBot();
    await ev(() => window.__cadet.career.fault('mag'));
    const d = await m6Day({ chapter: 'ch3', kind: 'flight', exams: EX('nav'), prog: passed([...ALL2, 'x3']), flags: { briefed_today: true, brief_checked: true } });
    assert.ok(d > 0);
    await goNoGo();
    assert.equal(await boardToday(), 'board');
    for (let i = 0; i < 12; i++) { const dd = await ev(() => window.__cadet.dialog()); if (!dd) break; if (dd.choices.length) await ev((re) => window.__cadet.dialogChoose(re), '^基礎'); else await ev(() => window.__cadet.dialogNext()); }
    await ev(() => window.__cadet.fly.view('chase'));
    let asked = null, log = [];
    for (let k = 0; k < 400; k++) {
      const day = await ev(() => window.__cadet.fly.day()); if (!day) break;
      if (!log.length || log[log.length - 1] !== day.phase) log.push(day.phase);
      if (day.phase === 'debrief' || day.phase === 'done') break;
      const dlg = await ev(() => window.__cadet.dialog());
      if (dlg) {
        if (/マグネトー/.test(dlg.text) && dlg.choices.length) { asked = dlg.text; await ev(() => window.__cadet.dialogChoose('整備に報告')); continue; }
        if (dlg.choices.length) await ev((t) => window.__cadet.dialogChoose(t), dlg.choices[0].text); else await ev(() => window.__cadet.dialogNext());
        continue;
      }
      if (day.radio && day.radio.phase === 'choose') await ev(() => window.__cadet.fly.answer(true));
      if (day.items && !day.assisting) await ev(() => window.__cadet.fly.assist());
      if (['taxiOut', 'taxiIn'].includes(day.phase) && !day.assisting) await ev(() => window.__cadet.fly.key('KeyY'));
      await ev(() => window.__cadet.simulate(2, 1 / 30));
    }
    assert.match(asked || '', /制限の 175 rpm を超えました/, log.join(' '));
    assert.ok(log.includes('runup') && log.includes('taxiIn') && !log.includes('tower') && !log.includes('t1'), log.join(' '));
    assert.ok(log.includes('debrief') || log.includes('done'), log.join(' '));
    await ev(() => window.__cadet.career.fault(undefined));
  });

  test('chapter 4: the instrument check in low cloud with the chief instructor — his brief, the right seat, t1 → i3 → i5 → t3 under the hood (inside the cloud at 2,000 ft), signed by him', async () => {
    await restart(); await loadBot();
    const d = await m6Day({ chapter: 'ch4', kind: 'checkride', exams: EX('nav', 'instr'), checks: CHK('xc'), prog: passed([...ALL2, ...CH3L, ...CH4L]) });
    assert.ok(d > 0);
    assert.equal((await ev(() => window.__cadet.career.weather())).kind, 'lowCloud');
    assert.equal(await ev(() => window.__cadet.career.haze()), 'lowCloud');
    await ev(() => window.__cadet.setMode('walk'));
    let t = await talkThrough('chief', ['よろしくお願いします']);
    assert.match(t.lines.join('\n'), /計器飛行の審査です[\s\S]*ILS/);
    assert.ok((await ev(() => window.__cadet.career.where('chief'))).c < 230, 'the chief instructor by the aircraft');
    t = await goNoGo();
    assert.match(t.lines.join('\n'), /計器飛行方式の飛行計画/, 'low cloud: a go with an instructor');
    assert.equal(await ev(() => window.__cadet.career.readiness()), 'checkride');
    assert.equal(await boardToday(), 'board');
    assert.equal(await ev(() => window.__cadet.fly.crew()), 'chief');
    const dd = await ev(() => window.__cadet.dialog());
    assert.equal(dd.name, '真壁 主任教官'); assert.match(dd.text, /計器飛行の審査を始めます/);
    await talkThrough(null, ['始めます']);
    const clouds = {};
    const log = await flyDay({ onLesson: async (id) => { await ev(() => window.__cadet.simulate(3)); clouds[id] = { cloud: await ev(() => window.__cadet.career.cloud()), agl: await ev(() => window.__cadet.fly.status().flight.agl ?? null) }; } });
    assert.deepEqual(log.filter(p => /^[ti][1-5]$|^done$/.test(p)), ['t1', 'i3', 'i5', 't3', 'done']);
    assert.ok(clouds.i5 && clouds.i5.cloud > 0.85, `inside the cloud on the ILS: ${JSON.stringify(clouds)}`);
    const lb = await ev(() => window.__cadet.logbook()), e = lb.entries[lb.entries.length - 1];
    assert.equal(e.sig.name, '真壁 恭一'); assert.ok(e.inst > 0, `instrument time ${e.inst}`);
    assert.ok(e.lessons.every(l => l.passed), JSON.stringify(e.lessons));
    // out of the aircraft: the check counts
    await ev(() => window.__cadet.fly.view('cockpit')); await ev(() => window.__cadet.fly.act('door')); await g.page.waitForTimeout(900); await ev(() => window.__cadet.simulate(0.3));
    const st = await career();
    assert.ok(st.checks.ir && st.checks.ir.pass, 'the instrument check passed');
  });

  test('chapter 5: the Seminole N452SY on stand 19 (its own walk-around), m1 → m2 → m5 with its two engines started one after the other; chapter 6: the examiner\'s brief and the right seat, the graduation in the lobby', async () => {
    await restart(); await loadBot();
    const d = await m6Day({ chapter: 'ch5', kind: 'flight', exams: EX('nav', 'instr'), checks: CHK('xc', 'ir'), prog: passed([...ALL2, ...CH3L, ...CH4L, 'm1']), flags: { briefed_today: true, brief_checked: true } });
    assert.ok(d > 0);
    assert.equal(await ev(() => window.__cadet.career.aircraft()), 'pa44');
    const targets = await ev(() => window.__cadet.walk.targets());
    assert.equal(targets.length, 17);
    for (const id of ['r_eng', 'l_prop', 'static']) {
      const tt = targets.find(x => x.id === id);
      const got = await ev(({ tt }) => { const W = window.__cadet, st = W.walk.stand(tt.id); W.placeWalker(st.a, st.c, { a: tt.a, c: tt.c }); return W.lookAt(tt.a, tt.c, tt.y); }, { tt });
      assert.equal(got, 'walk:' + id, `${id} seen from where one stands`);
    }
    // (M7, found playing) from the wing's trailing edge — as near as one can walk — the cabin's mark is in reach, and a
    // mark not yet looked at wins over the door beside it (E used to board instead)
    const near = await ev(() => {
      const W = window.__cadet, T = W.walk.targets(), cab = T.find(x => x.id === 'cabin'), docs = T.find(x => x.id === 'docs');
      W.placeWalker(cab.a + 6, cab.c + 6, { a: cab.a, c: cab.c });
      const r = W.walkRoute([W.walk.stand('cabin')], { maxT: 20 });
      return { at: r.at, cabin: W.lookAt(cab.a, cab.c, cab.y), docs: W.lookAt(docs.a, docs.c, docs.y) };
    });
    assert.deepEqual([near.cabin, near.docs], ['walk:cabin', 'walk:docs'], JSON.stringify(near));
    const a = await analyse(g.page, await ev(() => window.__cadet.snapshot(2)));
    assert.ok(a.sd > 8, 'the Seminole drawn');
    await goNoGo();
    assert.equal(await boardToday(), 'board');
    for (let i = 0; i < 12; i++) { const dd = await ev(() => window.__cadet.dialog()); if (!dd) break; if (dd.choices.length) await ev((re) => window.__cadet.dialogChoose(re), '^基礎'); else await ev(() => window.__cadet.dialogNext()); }
    let fs = await ev(() => window.__cadet.fly.status());
    assert.equal(fs.flight.aircraft || (await ev(() => window.__cadet.fly.flight.s.A.id)), 'pa44');
    const log = await flyDay();
    assert.deepEqual(log.filter(p => /^m[1-5]$|^done$/.test(p)), ['m1', 'm2', 'm5', 'done']);
    const lb = await ev(() => window.__cadet.logbook()), e = lb.entries[lb.entries.length - 1];
    assert.deepEqual([e.aircraft, e.reg], ['PA-44-180', 'N452SY']); assert.ok(e.me > 0);
    await ev(() => window.__cadet.fly.view('cockpit')); await ev(() => window.__cadet.fly.act('door')); await g.page.waitForTimeout(900);
    // ---- chapter 6: the final check's morning — the examiner in the instructors' room, his brief, then the right seat
    const d6 = await m6Day({ chapter: 'ch6', kind: 'checkride', exams: EX('nav', 'instr', 'multi', 'final'), checks: CHK('xc', 'ir', 'me'), prog: passed([...ALL2, ...CH3L, ...CH4L, ...CH5L, 'r1']) });
    assert.ok(d6 > 0);
    await ev(() => window.__cadet.setMode('walk'));
    const xw = await ev(() => window.__cadet.career.where('examiner'));
    assert.ok(xw && xw.a > 670 && xw.c > 264, `the examiner in the instructors' room: ${JSON.stringify(xw)}`);
    let t = await talkThrough('examiner', ['よろしくお願いします']);
    assert.match(t.lines.join('\n'), /審査官の黒田です[\s\S]*何も言いません/);
    assert.ok((await ev(() => window.__cadet.career.where('examiner'))).c < 230, 'by the aircraft');
    await goNoGo();
    assert.equal(await ev(() => window.__cadet.career.aircraft()), 'pa44');
    assert.equal(await boardToday(), 'board');
    assert.equal(await ev(() => window.__cadet.fly.crew()), 'examiner');
    const dd = await ev(() => window.__cadet.dialog());
    assert.equal(dd.name, '黒田 審査官'); assert.match(dd.text, /最終審査（Check Flight）を始めます/);
    await talkThrough(null, ['一度降ります']);
    await g.page.waitForTimeout(900); await ev(() => window.__cadet.simulate(0.3));
    assert.equal(await ev(() => window.__cadet.mode()), 'walk');
    // ---- the check passed (flown as chapter 5's day was): the graduation the next morning, everyone in the lobby
    await ev((o) => window.__cadet.career.set({ state: { ...window.__cadet.career.state(), slot: 'morning', checks: o }, place: true }), CHK('xc', 'ir', 'me', 'final'));
    await talkThrough('kiryu');                                      // (talking to someone first does not end the morning)
    assert.deepEqual((await ev(() => window.__cadet.career.schedule())).map(x => x.kind), ['graduation']);
    for (const id of ['chief', 'kiryu', 'asahi', 'mori', 'lecturer', 'dispatcher', 'mechanic', 'examiner']) { const w = await ev((id) => window.__cadet.career.where(id), id); assert.ok(w && w.a > 649 && w.a < 661 && w.c > 260, `${id} in the lobby: ${JSON.stringify(w)}`); }
    t = await talkThrough('chief', ['ありがとうございました']);
    assert.match(t.lines.join('\n'), /すべて修了しました[\s\S]*修了証[\s\S]*エアラインの訓練で会おう/);
    await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { timeout: 30000 });
    const st = await career();
    assert.ok(st.graduated, 'graduated');
    assert.equal(st.slot, 'evening');
  });

  // (M8) the epilogue: the night after the graduation, going home — a few months later, the right seat of SHOYO
  // AIRWAYS' 737 at Haneda (its own set, far from the LAB airfield), the training captain in the left seat
  test('(M8) the epilogue: after the graduation, going home — the right seat of the 737 at Haneda and the captain\'s first words; the view within budget all round; his goodbye, then the academy\'s next morning', async () => {
    assert.ok((await career()).graduated);
    const day = (await career()).day;
    ev(() => { window.__cadet.career.sleep(); });                  // (not awaited: the cards are what is looked at)
    await g.page.waitForFunction(() => window.__cadet.epilogue.state().on && !window.__cadet.career.cards() && window.__cadet.dialog(), null, { timeout: 30000 });
    let s = await ev(() => window.__cadet.epilogue.state());
    assert.equal(s.mode, 'epilogue');
    assert.ok(s.triangles > 50000, `the set: ${s.triangles} triangles`);
    assert.equal((await ev(() => window.__cadet.dialog())).name, '柏木 機長');
    assert.deepEqual(await ev(() => [getComputedStyle(document.getElementById('panel')).display, document.getElementById('hint').textContent]),
      ['none', 'クリックで始めるマウスで見回す · E で機長と話す · Esc で一時停止（終章を終える）'], 'no visit panel; the hint for this place');
    let t = await talkThrough(null, ['はい']);
    assert.match(t.lines.join('\n'), /機長の柏木です[\s\S]*羽田[\s\S]*点検し、確かめ、声に出す[\s\S]*外を見てごらん/);
    assert.equal(t.open, false);
    // the view: ahead (the terminal), to the left (the captain, the other gates), to the right (the runway, Mt Fuji), up
    for (const [yaw, pitch] of [[0, -5], [70, 0], [-75, 0], [0, 35]]) {
      const st = await ev(([y, p]) => { window.__cadet.epilogue.look(y, p); return window.__cadet.frame(2); }, [yaw, pitch]);
      assert.ok(st.calls < 400 && st.triangles < 900000, `look ${yaw}°/${pitch}°: ${st.calls} calls, ${st.triangles} triangles`);
      assert.ok(st.calls > 10, `look ${yaw}°/${pitch}°: something drawn (${st.calls} calls)`);
    }
    // E: to him again; 'stay' keeps the epilogue, the goodbye ends it
    t = await ev(() => window.__cadet.epilogue.talk('again'));
    assert.equal(t, 'talk');
    t = await talkThrough(null, ['もう少し見ています']);
    assert.match(t.lines.join('\n'), /富士山/);
    assert.equal((await ev(() => window.__cadet.epilogue.state())).on, true);
    await ev(() => window.__cadet.simulate(0.6));
    assert.equal(await ev(() => window.__cadet.epilogue.talk('again')), 'talk');
    t = await talkThrough(null, ['そろそろ行きます']);
    assert.match(t.lines.join('\n'), /ようこそ、翔洋航空へ/);
    await g.page.waitForFunction(() => !window.__cadet.epilogue.state().on && !window.__cadet.career.cards(), null, { timeout: 30000 });
    s = await ev(() => window.__cadet.epilogue.state());
    assert.deepEqual([s.mode, s.seen], ['walk', true]);
    assert.match(await ev(() => document.getElementById('hint').textContent), /WASD で歩く/, 'the walking hint back');
    const st = await career();
    assert.deepEqual([st.slot, st.day > day], ['morning', true], JSON.stringify(st));
    const back = await ev(() => window.__cadet.frame(2));
    assert.ok(back.calls < 400 && back.triangles < 900000 && back.calls > 10, `back at the academy: ${JSON.stringify(back)}`);
    // going home again: the next morning as before (the epilogue once; again from the tablet)
    await ev(() => window.__cadet.career.tablet.open('today'));
    assert.ok(await ev(() => [...document.querySelectorAll('.tb button')].some(b => /終章：羽田の 737（もう一度）/.test(b.textContent))), 'the tablet offers the epilogue again');
    await ev(() => window.__cadet.career.tablet.close());
  });

  // (M8) the AI instructor, with a stand-in for the API in the page (nothing goes out: the last test counts requests)
  test('(M8) the AI instructor: off, not offered; on with a key set in the menu — a free question, the answer in the subtitles, its textbook section; an error falls back to the textbook\'s questions; the key stays in its one place', async () => {
    const KEY = 'sk-ant-api03-BROWSERTEST-0123456789abcdef';
    await ev((src) => { (0, eval)(`${src}\nwindow.__fakeClaude = fakeClaude;`); window.__calls = []; }, FAKE_SRC);
    // (career.set merges into the state: the graduation and the checks of the tests before are taken away)
    await ev((p) => window.__cadet.career.set({ state: { seed: 2, chapter: 'ch2', day: 12, slot: 'morning', done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true } }, checks: {}, solo: null, graduated: null }, progress: p, flags: { met_instructor: true, has_tablet: true }, place: false }), passed(['a1']));
    const ins = await ev(() => window.__cadet.instructor());
    const toMenu = async () => {
      await ev((ins) => { const C = window.__cadet; C.setMode('walk'); C.placeWalker(ins.a + 2.4, ins.c - 0.6, { a: ins.a, c: ins.c }); C.lookAt(ins.a, ins.c, 1.5); }, ins);
      assert.equal(await ev(() => window.__cadet.use()), 'talk');
      for (let k = 0; k < 30; k++) {
        const v = await ev(() => window.__cadet.dialog());
        if (v.choices.some(c => /また後で来ます|準備に向かいます/.test(c.text))) return v;
        await ev((v) => { const C = window.__cadet; C.simulate(0.1); if (v.choices.length) C.dialogChoose(v.choices.findIndex(c => /問題ありません/.test(c.text)) >= 0 ? '問題ありません' : 0); else C.dialogNext(); }, v);
      }
      throw new Error('no menu');
    };
    // off (as it starts): not offered, nothing to call
    assert.equal(await ev(() => window.__cadet.settings.get('aiTutor')), false);
    let v = await toMenu();
    assert.ok(!v.choices.some(c => /自由に質問/.test(c.text)), 'off: not offered');
    await ev(() => window.__cadet.dialogChoose('また後で来ます|準備に向かいます')); await ev(() => { const C = window.__cadet; while (C.dialog()) C.dialogNext(); });
    // on, and the key given in the menu's own field (not remembered first)
    await ev(() => { window.__cadet.settings.set('aiTutor', true); window.__cadet.menu.open('net'); });
    assert.match(await ev(() => document.querySelector('#menu .m-body').innerText), /保存する場所[\s\S]*cadet\.secret\.anthropic[\s\S]*消し方/);
    // (the menu scrolls inside a small window: the controls are clicked as the page's own, not at a point on the screen)
    const press = (sel) => g.page.$eval(sel, (b) => b.click());
    await g.page.fill('#m-key', KEY); await press('#menu [data-act="key-save"]');
    const state = await ev(() => document.getElementById('m-key-state').textContent);
    assert.match(state, /設定済み/); assert.ok(!state.includes(KEY), 'shown masked');
    assert.equal(await ev(() => document.getElementById('m-key').value), '', 'the field is emptied');
    await ev(() => window.__cadet.menu.close());
    await ev(() => { window.__cadet.ai.useFetch(window.__fakeClaude({ calls: window.__calls, chunks: 5, answer: 'いい質問です。迎え角が大きくなりすぎると、翼の上の流れがはがれて揚力が急に減ります。それが失速です。\n根拠：aero.stall' })); window.__cadet.settings.set('textSpeed', 3); });
    v = await toMenu();
    assert.ok(v.choices.some(c => /自由に質問/.test(c.text)), 'on: offered');
    await ev(() => window.__cadet.dialogChoose('自由に質問'));
    await g.page.waitForFunction(() => window.__cadet.ai.open() && window.__cadet.ai.asking(), null, { timeout: 5000 });
    assert.match((await ev(() => window.__cadet.dialog())).text, /何でも聞いてください/);
    // typed into the field, sent with Enter
    await g.page.fill('#dlg .dlg-ask input', '失速はなぜ起きるのですか');
    await g.page.press('#dlg .dlg-ask input', 'Enter');
    await g.page.waitForFunction(() => { const v = window.__cadet.dialog(); return v && v.speaker === 'instructor' && v.choices.length === 3; }, null, { timeout: 15000 });
    v = await ev(() => window.__cadet.dialog());
    assert.match(v.text, /^いい質問です。迎え角/); assert.doesNotMatch(v.text, /根拠/);
    await g.page.waitForFunction(() => !window.__cadet.dialog().typing, null, { timeout: 15000 });
    assert.match(await ev(() => document.querySelector('#dlg .dlg-text').textContent), /それが失速です/);
    const call = await ev(() => window.__calls.at(-1));
    assert.match(call.url, /^https:\/\/api\.anthropic\.com\/v1\/messages/);
    assert.equal(call.headers['x-api-key'], KEY);
    assert.equal(call.body.model, 'claude-opus-5-5');
    assert.ok(!JSON.stringify(call.body).includes(KEY), 'the key is not in the body');
    assert.match(call.body.messages.at(-1).content, /訓練生の質問：失速はなぜ起きるのですか/);
    assert.match(call.body.messages.at(-1).content, /今日の課目：a2/);
    // its source: the textbook opens there
    await ev(() => window.__cadet.dialogChoose('教科書の'));
    assert.equal((await ev(() => window.__cadet.dialog())).bookOpen, true);
    await ev(() => window.__cadet.closeBook());
    await ev(() => window.__cadet.dialogChoose('ありがとうございました'));
    assert.equal((await ev(() => window.__cadet.dialog())).node, 'thanks', 'back to the scripted talk');
    assert.equal(await ev(() => window.__cadet.ai.open()), false);
    // an error (the key refused): his own words, the reason as a notice, then the textbook's questions
    await ev(() => window.__cadet.ai.useFetch(window.__fakeClaude({ status: 401 })));
    for (let k = 0; k < 10 && !(await ev(() => window.__cadet.dialog())).choices.some(c => /自由に質問/.test(c.text)); k++) await ev(() => window.__cadet.dialogNext());
    await ev(() => window.__cadet.dialogChoose('自由に質問'));
    await g.page.waitForFunction(() => window.__cadet.ai.asking(), null, { timeout: 5000 });
    await ev(() => window.__cadet.ai.ask('今日の天気は'));
    await g.page.waitForFunction(() => /まとまりません/.test(window.__cadet.dialog().text), null, { timeout: 15000 });
    assert.match(await ev(() => document.getElementById('toast').textContent), /API キーが受け付けられませんでした/);
    await ev(() => window.__cadet.dialogChoose('はい'));
    assert.equal((await ev(() => window.__cadet.dialog())).node, 'root', 'the textbook\'s questions');
    await ev(() => { const C = window.__cadet; C.setMode('spectator'); C.setMode('walk'); });
    assert.equal(await ev(() => window.__cadet.dialog()), null);
    // turned off while the question field is open: the AI talk ends at once, nothing more is sent, the offer is gone
    await ev(() => window.__cadet.ai.useFetch(window.__fakeClaude({ calls: window.__calls })));
    v = await toMenu();
    await ev(() => window.__cadet.dialogChoose('自由に質問'));
    await g.page.waitForFunction(() => window.__cadet.ai.asking(), null, { timeout: 5000 });
    const sent = await ev(() => window.__calls.length);
    await ev(() => window.__cadet.settings.set('aiTutor', false));
    assert.equal(await ev(() => window.__cadet.ai.open()), false, 'the AI talk closed');
    v = await ev(() => window.__cadet.dialog());
    assert.match(v.node, /^menu/, 'back to his menu');
    assert.ok(!v.choices.some(c => /自由に質問/.test(c.text)), 'the offer gone');
    assert.equal(await ev(() => window.__calls.length), sent, 'nothing more sent');
    await ev(() => { const C = window.__cadet; C.setMode('spectator'); C.setMode('walk'); });
    assert.equal(await ev(() => window.__cadet.dialog()), null);
    // turned off while his menu offers the question: the offer goes, the line is not typed (or said) again
    await ev(() => window.__cadet.settings.set('aiTutor', true));
    v = await toMenu();
    assert.ok(v.choices.some(c => /自由に質問/.test(c.text)));
    await g.page.waitForFunction(() => !window.__cadet.dialog().typing, null, { timeout: 15000 });
    await ev(() => window.__cadet.settings.set('aiTutor', false));
    v = await ev(() => window.__cadet.dialog());
    assert.ok(!v.choices.some(c => /自由に質問/.test(c.text)) && !v.typing, JSON.stringify(v));
    assert.ok(!(await ev(() => [...document.querySelectorAll('#dlg .dlg-ch')].some(b => /自由に質問/.test(b.textContent)))), 'not on screen');
    await ev(() => { const C = window.__cadet; C.setMode('spectator'); C.setMode('walk'); });
    // the key: nowhere in this browser unless remembered; then only in its one place; erased from the menu
    const where = () => ev((k) => Object.keys(localStorage).filter(x => String(localStorage.getItem(x)).includes(k)), KEY);
    assert.deepEqual(await where(), []);
    await ev(() => window.__cadet.menu.open('net'));
    await press('#m-key-remember');
    assert.deepEqual(await where(), ['cadet.secret.anthropic']);
    await press('#menu [data-act="key-clear"]');
    assert.deepEqual(await where(), []);
    assert.equal(await ev(() => window.__cadet.ai.keys.has()), false);
    await ev(() => window.__cadet.menu.close());
    assert.ok(![...seen.errors, ...g.errors].some(e => e.includes(KEY)), 'the key in no message');
    await ev(() => { const C = window.__cadet; C.settings.set('aiTutor', false); C.ai.useFetch(null); });
    // (M8) the crew in English: his line in English, the Japanese under it (or not, when that is off)
    await ev(() => window.__cadet.settings.set('crewEnglish', true));
    await ev((ins) => { const C = window.__cadet; C.placeWalker(ins.a + 2.4, ins.c - 0.6, { a: ins.a, c: ins.c }); C.lookAt(ins.a, ins.c, 1.5); }, ins);
    assert.equal(await ev(() => window.__cadet.use()), 'talk');
    await g.page.waitForFunction(() => !window.__cadet.dialog().typing, null, { timeout: 15000 });
    const shown = await ev(() => ({ en: document.querySelector('#dlg .dlg-text').textContent, ja: document.querySelector('#dlg .dlg-ja').textContent, jaShown: !document.querySelector('#dlg .dlg-ja').hidden, view: window.__cadet.dialog() }));
    assert.ok(shown.view.en && shown.en === shown.view.en, `the English on screen: ${shown.en}`);
    assert.doesNotMatch(shown.en, /[ぁ-ん]/);
    assert.ok(shown.jaShown && shown.ja === shown.view.text, 'the Japanese under it');
    await ev(() => window.__cadet.settings.set('crewEnglishJa', false));
    await ev(() => window.__cadet.dialogChoose(0));
    await g.page.waitForFunction(() => !window.__cadet.dialog().typing, null, { timeout: 15000 });
    assert.equal(await ev(() => document.querySelector('#dlg .dlg-ja').hidden), true, 'no Japanese when that is off');
    await ev(() => { const C = window.__cadet; C.setMode('spectator'); C.setMode('walk'); C.settings.set('crewEnglish', false); C.settings.set('crewEnglishJa', true); C.settings.set('textSpeed', 1); });
  });

  test('the pause menu opens and closes; settings apply at once', async () => {
    await ev(() => window.__cadet.setMode('walk'));
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
    // (M7) the subtitles' size, the colour assist, the three volumes: at once, and in the menu
    await ev(() => window.__cadet.menu.open('settings'));
    const rows = await ev(() => [...document.querySelectorAll('#menu .m-row span:first-child')].map(x => x.textContent));
    for (const k of ['字幕の大きさ', '色の組み合わせ（色覚に配慮）', 'エンジンと風切り音', '周りの音と足音', '無線（雑音と管制官の声）', 'はじめての操作の案内']) assert.ok(rows.includes(k), k);
    await ev(() => window.__cadet.menu.close());
    await ev(() => { window.__cadet.settings.set('subSize', 1.4); window.__cadet.settings.set('colorAssist', true); });
    assert.equal(await ev(() => document.documentElement.style.getPropertyValue('--sub-k')), '1.4');
    assert.ok(await ev(() => document.body.classList.contains('cvd')));
    assert.ok(await ev(() => parseFloat(getComputedStyle(document.querySelector('#guide b')).fontSize)) > 18);
    await ev(() => { window.__cadet.settings.set('subSize', 1); window.__cadet.settings.set('colorAssist', false); });
    assert.ok(!(await ev(() => document.body.classList.contains('cvd'))));
    // (M8) the new features: all off as the game starts (nothing goes out unless the player turns them on)
    assert.deepEqual(await ev(() => ['aiTutor', 'micRadio', 'crewEnglish'].map(k => window.__cadet.settings.get(k))), [false, false, false]);
  });

  test('(M8) the tablet\'s notes: written, kept in this browser with where and when, taken away as text', async () => {
    // (a card still on from the tests before — the screen covered — goes first)
    const card = await ev(() => (window.__cadet.career.cards() ? document.querySelector('.cd').innerText.replace(/\s+/g, ' ') : ''));
    if (card) console.log(`# notes: waiting for the card "${card}" (${JSON.stringify(await career())})`);
    await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { timeout: 90000 });
    await ev(() => { window.__cadet.setMode('walk'); window.__cadet.career.tablet.open('notes'); });
    assert.equal(await ev(() => window.__cadet.career.tablet.page()), 'notes');
    await g.page.fill('.tb .tb-note-in', '運航管理の場所がわからなかった。');
    await g.page.getByRole('button', { name: '保存する' }).click();
    const notes = await ev(() => window.__cadet.notes());
    assert.equal(notes.length, 1);
    assert.equal(notes[0].text, '運航管理の場所がわからなかった。');
    assert.match(notes[0].where, /^第 \d 章|^序章/);
    assert.match(await ev(() => localStorage.getItem('cadet.notes')), /運航管理の場所/);
    await g.page.getByRole('button', { name: '文字で書き出す（コピー用）' }).click();
    const rep = await ev(() => window.__cadet.report());
    assert.ok(rep && /CADET の感想/.test(rep.text) && /\[1\] .*\n運航管理の場所がわからなかった。/.test(rep.text), JSON.stringify(rep));
    await ev(() => { window.__cadet.closeReport(); window.__cadet.career.tablet.close(); });
  });

  test('dusk, presets and the bench', async () => {
    await restart();                         // (a fresh page: after the later chapters the software renderer is near its memory)
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
    // (M8) its result as text for README's table of real machines
    await ev((r) => window.__cadet.benchReport(r), r);
    const rep = await ev(() => window.__cadet.report());
    assert.equal(rep.title, '性能の計測結果');
    assert.equal(rep.text.split('\n').filter(l => /^\| \d{4}-/.test(l)).length, 10, rep.text);
    await ev(() => window.__cadet.closeReport());
  });

  test('no page errors, no network requests', () => {
    assert.deepEqual([...seen.errors, ...g.errors].filter(e => !/KHR_parallel_shader_compile/.test(e)), [], 'page errors');
    assert.deepEqual([...seen.requests, ...g.requests], [], 'network requests');
  });
});
