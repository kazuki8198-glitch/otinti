// CADET — the M4 screenshots (docs/m4): the first day, in one session at 1280×720 (the page itself, HUD included).
//   node test/m4-shots.mjs [quality] [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium, openGame } from './shots.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [q = 'high', outDir = path.resolve(here, '../docs/m4')] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const BOT_SRC = fs.readFileSync(path.join(here, '../../flight-lab/test/bot.mjs'), 'utf8').replace(/^export /gm, '');
const g = await openGame(loadChromium(), { q, w: 1280, h: 720, t: 9.8, extra: '&anomalies=r_sump,r_cap' });
const ev = (fn, a) => g.page.evaluate(fn, a);
// the frame drawn by the game (the loop paused), laid under the HUD as a picture, then the page's screenshot
const shot = async (name, frames = 2) => {
  await ev((n) => {
    const url = window.__cadet.snapshot(n);
    let im = document.getElementById('shotbg');
    if (!im) { im = document.createElement('img'); im.id = 'shotbg'; im.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none'; document.getElementById('view').after(im); }
    im.hidden = false; im.src = url; return im.decode();
  }, frames);
  await g.page.screenshot({ path: path.join(outDir, name), type: 'jpeg', quality: 86, timeout: 240000, animations: 'disabled', caret: 'hide' });
  await ev(() => { document.getElementById('shotbg').hidden = true; });
  console.log(name);
};
await ev(() => window.__cadet.pause(true));
await ev((src) => { (0, eval)(src + '\nwindow.makeBot = makeBot;'); }, BOT_SRC);
const day = () => ev(() => window.__cadet.fly.day());
const sim = (s, dt = 1 / 30) => ev(({ s, dt }) => window.__cadet.simulate(s, dt), { s, dt });
// the walk-around: the pitot cover, then the water in the right sump
const look = (id) => ev((id) => { const W = window.__cadet, t = W.walk.targets().find(x => x.id === id), st = W.walk.stand(id); W.placeWalker(st.a, st.c, { a: t.a, c: t.c }); W.lookAt(t.a, t.c, t.y); W.simulate(0.05); return W.use(); }, id);
await look('pitot'); await shot('01-pitot.jpg');
await ev(() => window.__cadet.use());
await look('r_sump'); await shot('02-sump.jpg');
for (const p of await ev(() => window.__cadet.walk.targets())) {
  await look(p.id);
  for (let k = 0; k < 4; k++) {
    const ch = await ev(() => window.__cadet.walk.choices()); if (!ch) break;
    const planted = await ev(() => window.__cadet.walk.planted());
    const i = ch.indexOf('task') >= 0 ? ch.indexOf('task') : ch.indexOf('fix') >= 0 ? ch.indexOf('fix') : planted.includes(p.id) && ch.indexOf('report') >= 0 ? ch.indexOf('report') : ch.indexOf('ok');
    if (i < 0) break; await ev((i) => window.__cadet.walk.choose(i), i);
  }
  if (await ev(() => window.__cadet.card())) await ev(() => window.__cadet.use());
}
// in: the day at the basic level
await ev(() => window.__cadet.fly.board(true)); await sim(0.3);
for (let i = 0; i < 12; i++) { const d = await ev(() => window.__cadet.dialog()); if (!d) break; if (d.choices.length) await ev((r) => window.__cadet.dialogChoose(r), d.choices.some(c => /通して/.test(c.text)) ? '通して' : '基礎'); else await ev(() => window.__cadet.dialogNext()); }
await sim(4);
await ev(() => { window.__cadet.fly.key('Enter'); window.__cadet.fly.key('Enter'); window.__cadet.fly.act('parkBrake'); });
await sim(9);                                                   // the instructor's lines
await ev(() => window.__cadet.fly.look(8, -22));
await shot('03-start.jpg');
// on through the start (the instructor's hands) to the ground call
async function until(phase, { stepS = 1, chase = false, max = 400 } = {}) {
  for (let k = 0; k < max; k++) {
    const d = await day(); if (d.phase === phase) return d;
    const dlg = await ev(() => window.__cadet.dialog());
    if (dlg) { if (dlg.choices.length) await ev((r) => window.__cadet.dialogChoose(r), dlg.choices.some(c => /省く/.test(c.text)) ? '省く' : dlg.choices.some(c => /航空日誌/.test(c.text)) ? '航空日誌' : dlg.choices[0].text); else await ev(() => window.__cadet.dialogNext()); continue; }
    if (d.radio && d.radio.phase === 'choose' && d.phase !== phase) await ev(() => window.__cadet.fly.answer(true));
    if (d.items && !d.assisting) await ev(() => window.__cadet.fly.assist());
    if (['taxiOut', 'lineup', 'taxiOff', 'taxiIn'].includes(d.phase) && !d.assisting) await ev(() => window.__cadet.fly.key('KeyY'));
    await sim(stepS);
  }
  throw new Error('never reached ' + phase);
}
await until('ground');
for (let k = 0; k < 30; k++) { const d = await day(); if (d.radio && d.radio.phase === 'choose') break; await sim(0.5); }
await ev(() => window.__cadet.fly.look(0, -10));
await shot('04-radio.jpg');
await ev(() => window.__cadet.fly.answer(true)); await sim(4);
await ev(() => window.__cadet.fly.answer(true)); await sim(3);
// taxiing (the way on the pavement), from outside
await until('taxiOut');
await ev(() => window.__cadet.fly.key('KeyY'));
await ev(() => window.__cadet.fly.view('chase'));
await sim(40);
await shot('05-taxi.jpg');
await until('runup', { stepS: 2 });
await ev(() => window.__cadet.fly.view('cockpit'));
for (let k = 0; k < 40; k++) { const d = await day(); if (d.items && d.items.i >= 3) break; await ev(() => window.__cadet.fly.assist()); await sim(0.7); }
await ev(() => window.__cadet.fly.look(4, -24));
await shot('06-runup.jpg');
await until('lineup', { stepS: 1 });
await until('t1', { stepS: 1 });
await ev(() => { const W = window.__cadet; W.fly.runScripted(window.makeBot(W.FL).fly, 24); });
await ev(() => window.__cadet.fly.view('chase')); await sim(0.05);
await shot('07-takeoff.jpg');
await ev(() => window.__cadet.fly.view('cockpit'));
// the rest of the day (the lessons by FLIGHT LAB's bot) to the debrief
for (let k = 0; k < 600; k++) {
  const d = await day(); if (d.phase === 'debrief') break;
  const fs = await ev(() => window.__cadet.fly.status());
  if (fs.flight && fs.flight.mode === 'lesson' && !fs.flight.done) { await ev(() => { const W = window.__cadet; W.fly.runScripted(window.makeBot(W.FL).fly, 900, () => { W.fly.radioTick(1 / 120); W.fly.answer(true); }); }); continue; }
  const dlg = await ev(() => window.__cadet.dialog());
  if (dlg) { if (dlg.choices.length) await ev((r) => window.__cadet.dialogChoose(r), dlg.choices.some(c => /省く/.test(c.text)) ? '省く' : dlg.choices[0].text); else await ev(() => window.__cadet.dialogNext()); continue; }
  if (d.radio && d.radio.phase === 'choose') await ev(() => window.__cadet.fly.answer(true));
  if (d.items && !d.assisting) await ev(() => window.__cadet.fly.assist());
  if (['taxiOut', 'lineup', 'taxiOff', 'taxiIn'].includes(d.phase) && !d.assisting) { await ev(() => window.__cadet.fly.key('KeyY')); await ev(() => window.__cadet.fly.view('chase')); }
  await sim(2);
}
await ev(() => window.__cadet.fly.view('cockpit')); await sim(0.5);
for (let k = 0; k < 4; k++) await ev(() => { window.__cadet.dialogReveal(); window.__cadet.dialogNext(); });
await ev(() => window.__cadet.dialogReveal());
await shot('08-debrief.jpg');
for (let k = 0; k < 12; k++) { const d = await ev(() => window.__cadet.dialog()); if (!d) break; if (d.choices.length) await ev(() => window.__cadet.dialogChoose('航空日誌')); else await ev(() => window.__cadet.dialogNext()); if ((await ev(() => window.__cadet.logbook())).open) break; }
await g.page.waitForTimeout(2600);                              // the signature written in
await shot('09-logbook.jpg', 1);
console.log('errors:', g.errors.filter(e => !/KHR_parallel/.test(e)).slice(0, 10));
await g.browser.close();
