// CADET — the M5 screenshots (docs/m5): the career's places and people, at 1280×720 (the page itself, HUD included).
//   node test/m5-shots.mjs [quality] [outDir] [01,05…]   (only those)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium, openGame } from './shots.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [q = 'high', outDir = path.resolve(here, '../docs/m5')] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const g = await openGame(loadChromium(), { q, w: 1280, h: 720, t: 0 });
const ev = (fn, a) => g.page.evaluate(fn, a);
const cdp = await g.page.context().newCDPSession(g.page);
// the frame drawn by the game (the loop paused), laid under the HUD as a picture, then the page's screenshot
const shot = (name, frames = 2) => { if (ONLY && !ONLY.some(p => name.startsWith(p))) return Promise.resolve(); let tm; return Promise.race([shotNow(name, frames).finally(() => clearTimeout(tm)), new Promise((r) => { tm = setTimeout(() => { console.log('skipped (too slow)', name); r(); }, 480000); })]); };
const shotNow = async (name, frames) => {
  console.log('  shooting', name, new Date().toISOString().slice(11, 19));
  await ev((n) => {
    const url = window.__cadet.snapshot(n);
    const im = document.createElement('img'); im.id = 'shotbg'; im.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none';
    document.getElementById('view').after(im);
    return new Promise((done) => { im.onload = () => done(); im.src = url; });
  }, frames);
  const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 86 });
  fs.writeFileSync(path.join(outDir, name), Buffer.from(r.data, 'base64'));
  await ev(() => { document.getElementById('shotbg')?.remove(); });
  console.log(name);
};
await ev(() => window.__cadet.pause(true));
const sim = (s, dt = 1 / 30) => ev(({ s, dt }) => window.__cadet.simulate(s, dt), { s, dt });
const K = (o) => ev((o) => window.__cadet.career.set(o), o);
const place = (a, c, look) => ev(({ a, c, look }) => { const W = window.__cadet; W.placeWalker(a, c, look); W.setMode('walk'); }, { a, c, look });
// a talk opened and moved on to the line that matches `re` (choices: the first, or `pick`)
const talkTo = async (who, re, pick) => ev(({ who, re, pick }) => {
  const C = window.__cadet; C.career.talkTo(who);
  for (let k = 0; k < 200; k++) {
    const v = C.dialog(); if (!v) return null;
    if (re && new RegExp(re).test(v.text)) { C.dialogReveal(); return v.text; }
    if (v.choices.length) { const i = pick ? Math.max(0, v.choices.findIndex(c => new RegExp(pick).test(c.text))) : 0; C.dialogChoose(i); } else C.dialogNext();
    C.simulate(0.05);
  }
  return null;
}, { who, re, pick });
const closeTalk = () => ev(() => { const C = window.__cadet; for (let k = 0; k < 300 && C.dialog(); k++) { const v = C.dialog(); if (v.choices.length) C.dialogChoose(0); else C.dialogNext(); } });
const ground = Object.fromEntries(['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].map(k => [k, { tries: 1, best: 'S', pass: true, levels: [] }]));

// 01 the welcome: the lobby on the first morning
await K({ state: { chapter: 'prologue', day: 1, slot: 'morning', done: {} }, place: false });
await place(659.6, 269.8, { a: 654.0, c: 265.0 }); await sim(0.5);
await talkTo('chief', 'ここでの約束'); await sim(0.3);
await shot('01-welcome.jpg'); await closeTalk();
// 02 the dispatch counter: the go / no-go on a morning of fog
await K({ state: { chapter: 'ch2', day: 16, slot: 'morning', done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true } } }, progress: { lessons: { ...ground, a1: { tries: 1, best: 'S', pass: true, levels: ['basic'] } } }, flags: { met_instructor: true, has_tablet: true, met_dispatcher: true }, place: false });
await place(670.0, 258.6, { a: 670.0, c: 254.7 }); await sim(0.5);
await talkTo('dispatcher', 'どうしますか'); await shot('02-dispatch.jpg'); await closeTalk();
// 03 a class: the lecturer and a figure on briefing room 2's screen
await K({ state: { chapter: 'ch1', day: 2, slot: 'am', done: { prologue: 1 } }, progress: { lessons: {} }, place: false });
await place(628.6, 257.6, { a: 621.8, c: 255.5 }); await sim(0.5);
await talkTo('lecturer', '揚力はどうやって'); await sim(1.2); await shot('03-class.jpg'); await closeTalk();
// 04 the training device: k1, the PFD's parts on the room's screen
await K({ state: { chapter: 'ch1', day: 2, slot: 'pm', done: { prologue: 1, 'class:0': 2 } }, progress: { lessons: {} }, place: false });
await place(624.6, 271.6, { a: 629.9, c: 270.2 }); await sim(0.5);
await talkTo('lecturer', '左のテープが速度'); await sim(0.5); await shot('04-ftd.jpg'); await closeTalk();
// 05 the lounge in the evening: the three cadets
await K({ state: { chapter: 'ch1', day: 3, slot: 'evening', done: { prologue: 1 } }, place: false });
await place(698.6, 258.4, { a: 693.0, c: 253.0 }); await sim(0.5);
await talkTo('mori', '学科、少し教えて'); await shot('05-lounge.jpg'); await closeTalk();
// 06 the tablet: today's page
await K({ state: { chapter: 'ch2', day: 13, slot: 'am', done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true } } }, progress: { lessons: { ...ground, a1: { tries: 1, best: 'S', pass: true, levels: ['basic'] }, a2: { tries: 1, best: 'A', pass: true, levels: ['basic'] } } }, flags: { met_instructor: true, has_tablet: true }, place: false });
await place(650.0, 266.0, { a: 655.0, c: 250.0 }); await sim(0.3);
await ev(() => window.__cadet.career.tablet.open('today')); await shot('06-tablet.jpg');
await ev(() => window.__cadet.career.tablet.open('progress')); await shot('07-progress.jpg');
await ev(() => window.__cadet.career.tablet.close());
// 08 the apron on a morning of fog; 09 an afternoon of storms
const findDay = (kind) => ev((kind) => { const K = window.__cadet.career; for (let d = 12; d < 200; d++) { if (new Date(Date.UTC(2027, 3, d)).getUTCDay() === 0) continue; K.set({ state: { day: d }, place: false }); if (K.weather().kind === kind) return d; } return -1; }, kind);
await findDay('amFog'); await ev(() => window.__cadet.career.advance('am'));
await place(646.0, 222.0, { a: 636.5, c: 208.0 }); await sim(0.5); await shot('08-fog.jpg');
await findDay('pmStorm'); await ev(() => window.__cadet.career.advance('pm'));
await place(655.0, 244.5, { a: 620.0, c: 200.0 }); await sim(0.5); await shot('09-storm.jpg');
// 10 the check ride: the chief instructor in the right seat
const CH2 = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't2', 't4', 'e1', 'e2', 'e3', 't1', 't3'];
const passed = (ids) => ({ lessons: { ...ground, ...Object.fromEntries(ids.map(id => [id, { tries: 1, best: 'S', pass: true, levels: ['basic'] }])) } });
await ev(({ prog }) => { const K = window.__cadet.career; for (let d = 26; d < 80; d++) { K.set({ state: { chapter: 'ch2', day: d, slot: 'am', done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true }, presolo: { tries: 1, best: 95, pass: true } } }, progress: prog, flags: { met_instructor: true, has_tablet: true, c1_briefed: true }, trust: { instructor: 70 }, place: false }); if (K.schedule().some(x => x.kind === 'checkride')) return d; } return -1; }, { prog: passed(CH2) });
await ev(() => window.__cadet.fly.board(true)); await sim(0.5);
await ev(() => window.__cadet.fly.look(38, -6)); await sim(0.2);
await shot('10-checkride.jpg');
await ev(() => window.__cadet.fly.leave()); await sim(0.5);
// 11 after the first solo: everyone by the aircraft
await ev(() => window.__cadet.career.stageCelebrate());
await place(641.6, 216.4, { a: 637.6, c: 212.4 }); await sim(0.5);
await talkTo('instructor', 'シャツの裾'); await shot('11-celebrate.jpg');
console.log('errors:', JSON.stringify(g.errors || []));
await g.browser.close();
