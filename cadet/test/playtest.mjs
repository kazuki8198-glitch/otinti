// CADET — test/playtest.mjs : plays the game from a new start as a player does, and writes down what the screen says.
// Walking is the guide's way (followGuide: the path a player would take towards the arrow); everything else is a
// key pressed in the page (E, Tab, Space, 1–9, Enter, Esc). After each move it notes the guide's line, the toast, the
// subtitles and every pair of text boxes on the screen that overlap, to test-output/playtest-<name>.log.
//   node test/playtest.mjs [start|ch2|seminole|epilogue] [days=4]
// start: a new career, the prologue → chapter 1 → chapter 2's first flying day (until the cadet is in the seat).
// seminole: a chapter 5 day, from the walk-around to both engines running.
// epilogue (M8): the evening of the graduation — out of the front doors, the 737's right seat at Haneda, the captain
// (E to talk to him again, Esc for the menu), his goodbye, the academy's next morning.
// One browser; no pictures (the software renderer grows with every one) unless SHOT=1 (one, at the end).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium, openGame } from './shots.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [which = 'start', daysArg = '12'] = process.argv.slice(2);
const out = path.resolve(here, '../test-output'); fs.mkdirSync(out, { recursive: true });
const logF = path.join(out, `playtest-${which}.log`); fs.writeFileSync(logF, '');
const log = (...a) => { const s = a.join(' '); fs.appendFileSync(logF, s + '\n'); console.log(s); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const chromium = loadChromium();
const g = await openGame(chromium, { q: 'low', w: 960, h: 540, t: 9.6 });
const { page } = g;
const ev = (fn, arg) => page.evaluate(fn, arg);
await ev(() => window.__cadet.pause(true));
const issues = [];
const issue = (s) => { issues.push(s); log('  !! ' + s); };

// what the screen shows: the text boxes that are visible, and the pairs that overlap
const screen = () => ev(() => {
  const vis = (el) => { if (!el || el.hidden) return false; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
  const boxes = [], modal = [...document.querySelectorAll('.tb')].find(vis) || null;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
    if (el.closest('#boot, #menu, .cd, #views, #panel, #perf')) continue;
    if (!vis(el)) continue;
    // (a visible box of its own: a parent shown, a background or text)
    let p = el.parentElement, ok = true; while (p && p !== document.body) { if (!vis(p)) { ok = false; break; } p = p.parentElement; }
    if (!ok) continue;
    const txt = (el.innerText || '').trim().replace(/\s+/g, ' ');
    if (!txt) continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height > 0.5 * innerWidth * innerHeight) continue;          // (a layer over the whole screen, not a box)
    if (el.id === 'hint') continue;                                             // (the mouse is never captured here)
    if (modal && !modal.contains(el)) continue;                                  // (under the tablet: covered)
    boxes.push({ id: el.id || el.className || el.tagName, txt: txt.slice(0, 60), r: [r.left, r.top, r.right, r.bottom], el });
  }
  const pairs = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const w = Math.min(a.r[2], b.r[2]) - Math.max(a.r[0], b.r[0]), h = Math.min(a.r[3], b.r[3]) - Math.max(a.r[1], b.r[1]);
    if (w > 6 && h > 6) pairs.push(`${a.id}「${a.txt.slice(0, 24)}」× ${b.id}「${b.txt.slice(0, 24)}」`);
  }
  const t = (s) => { const e = document.querySelector(s); return e && vis(e) ? e.innerText.trim().replace(/\s+/g, ' ') : ''; };
  return { guide: t('#guide'), toast: t('#toast'), where: t('#where'), card: t('#card'), boxes: boxes.map(b => `${b.id}:${b.txt}`), overlap: pairs };
});
let lastToast = '', lastGuide = '';
async function look(tag) {
  const s = await screen();
  if (s.guide && s.guide !== lastGuide) { log(`  [案内] ${s.guide}`); lastGuide = s.guide; }
  if (s.toast && s.toast !== lastToast) { log(`  [表示] ${s.toast}`); lastToast = s.toast; }
  for (const o of s.overlap) issue(`重なり（${tag}）：${o}`);
  return s;
}
// a key as the player presses it, then a moment of the game
async function key(k, sim = 0.1) { await page.keyboard.press(k); await ev((s) => window.__cadet.simulate(s), sim); }
async function waitCards() { for (let i = 0; i < 60; i++) { if (!(await ev(() => window.__cadet.career.cards()))) return; await sleep(250); } }

// a talk, read and answered with the keys: Space for the next line, the number of a choice (the right answer where a
// lesson asks, else one that goes on with the day)
const AVOID = /また後で|あとで|やめ|戻る|今はいい/;
async function talk(maxLines = 3000) {
  let n = 0, last = ''; const chosen = new Set();
  for (; n < maxLines; n++) {
    const v = await ev(() => { const C = window.__cadet, v = C.dialog(); if (!v) return null; const act = C.career.activity(); return { ...v, act }; });
    if (!v) break;
    const line = `${v.name}：${v.text}`;
    if (line !== last) { log(`    ${line.replace(/\n/g, ' ')}`); last = line; }
    if (v.bookOpen) { await key('Escape'); continue; }
    if (v.typing) { await key('Space', 0.05); }
    if (v.choices.length) {
      const m = /^q(\d+)$/.exec(v.node || ''); let i = -1;
      if (v.act && m && v.act.questions[+m[1]]) { const q = v.act.questions[+m[1]]; i = v.choices.findIndex(c => c.text === q.opts[q.ok]); }
      if (i < 0) i = v.choices.findIndex(c => !AVOID.test(c.text) && !chosen.has(c.text));
      if (i < 0) i = v.choices.findIndex(c => !chosen.has(c.text));
      if (v.choices[Math.max(0, i)].text !== '次へ') chosen.add(v.choices[Math.max(0, i)].text);   // (the class's 次へ, at every section's end)
      if (i < 0) i = 0;
      log(`      > ${i + 1}. ${v.choices[i].text}　（ほか：${v.choices.filter((_, j) => j !== i).map(c => c.text).join('／')}）`);
      await key(`Digit${i + 1}`, 0.05);
      const s = await look('会話'); void s;
    } else await key('Space', 0.05);
  }
  if (n >= maxLines) issue('会話が終わらない');
  await ev(() => window.__cadet.simulate(0.6));
  await sleep(650);                         // (the E that ended a talk does not start another for half a second)
}

async function stepOnce() {
  const before = await ev(() => { const C = window.__cadet, g = C.guide(); return { g, mode: C.mode(), st: C.career.state(), plane: C.walk.open() }; });
  if (!before.g) { issue('案内が出ていない'); return 'stuck'; }
  const r = await ev(() => window.__cadet.followGuide({ maxT: 240 }));
  log(`- 歩く → ${r.place || ''}（${r.t ?? '?'} 秒）　狙い：${r.step ? r.step.at : ''} ${r.reached ? '' : '着かない ' + (r.why || '')}`);
  if (!r.reached) { issue(`案内の所に着かない：${before.g.text}（${JSON.stringify(r.at)} → ${JSON.stringify(r.firstWay)}）`); }
  await look('歩いたあと');
  const cur = await ev(() => window.__cadet.current());
  if ((r.step || before.g).at === 'entrance') {
    const c = await ev(() => window.__cadet.current());
    if (c !== 'home') issue(`正面入口で E の対象が「寮へ帰る」でない（${c}）`);
    await key('KeyE', 0.15); await sleep(300);                     // (the prompt's fade)
    const card = await ev(() => window.__cadet.card()); log(`    [カード] ${card ? card.title + '：' + card.text.replace(/\n/g, ' ') : 'なし'}`);
    await look('寮へ帰る');
    await key('Digit1', 0.2); await sleep(400); await waitCards(); await sleep(1500); await look('次の朝');
    return 'home';
  }
  if (!cur) { issue(`E で使える物が照準にない（${(r.step || before.g).text}）`); }
  await key('KeyE', 0.15);
  await sleep((r.step || before.g).at === 'board' ? 1600 : 300);         // (boarding: the screen fades first; else the prompt's fade)
  const after = await ev(() => { const C = window.__cadet; return { mode: C.mode(), dialog: !!C.dialog(), card: C.card(), walk: C.walk.open(), tablet: C.career.tablet.isOpen() }; });
  if (after.dialog) { await talk(); await sleep(1500); if (await ev(() => window.__cadet.mode()) === 'fly') return 'fly'; }
  else if (after.walk) {
    const ch = await ev(() => ({ choices: window.__cadet.walk.choices(), planted: window.__cadet.walk.planted(), card: window.__cadet.card() }));
    log(`    [点検] ${ch.card ? ch.card.title + '：' + ch.card.text.slice(0, 90) : ''}`);
    const bad = ch.planted.includes(after.walk);
    for (const act of (ch.choices.includes('task') ? ['task'] : []).concat([bad ? 'report' : 'ok'])) {
      const choices = await ev(() => window.__cadet.walk.choices());
      if (!choices) break;
      const i = choices.indexOf(act); if (i < 0) { issue(`点検のカードに ${act} がない（${choices}）`); break; }
      await key(`Digit${i + 1}`, 0.1);
      await look('点検');
    }
    const still = await ev(() => window.__cadet.walk.choices());
    if (still) { const i = still.indexOf('fix'); if (i >= 0) await key(`Digit${i + 1}`, 0.1); const s2 = await ev(() => window.__cadet.walk.choices()); if (s2) { const j = s2.indexOf('close'); await key(j >= 0 ? `Digit${j + 1}` : 'KeyE', 0.1); } }
  } else if (after.card) { log(`    [カード] ${after.card.title}：${after.card.text.slice(0, 100)}`); await key('KeyE', 0.1); }
  else if (after.mode === 'fly') return 'fly';
  else {
    const why = await ev(() => { const C = window.__cadet; return { current: C.current(), mode: C.mode(), cards: C.career.cards(), menu: C.menu.isOpen(), active: document.activeElement && (document.activeElement.id || document.activeElement.className || document.activeElement.tagName) }; });
    issue(`E のあと何も起きない：${before.g.text}（${JSON.stringify(why)}）`);
  }
  await waitCards();
  await ev(() => window.__cadet.simulate(0.3));
  return 'ok';
}

// in the seat: the board talk, then the checklists as a player works them — the ring's control clicked, Enter on an
// item to look at — until both engines run (or the radio's turn comes)
async function cockpit() {
  for (let k = 0; k < 40; k++) {
    await sleep(400); await ev(() => window.__cadet.simulate(0.2));
    if (await ev(() => !!window.__cadet.dialog())) await talk();
    if (await ev(() => !!window.__cadet.fly.day())) break;
  }
  let last = '', same = 0;
  for (let k = 0; k < 300; k++) {
    const st = await ev(() => window.__cadet.fly.status());
    const d = st.day; if (!d) { issue('機体の中で 1 日が始まらない'); break; }
    if (await ev(() => !!window.__cadet.dialog())) { await talk(); continue; }
    const cur = d.items && d.items.items.find(x => x.cur);
    const tag = `${d.phase}:${cur ? cur.name : ''}`;
    if (tag !== last) { log(`- [${d.label}] ${cur ? `${cur.name} — ${cur.what}${cur.note ? '（' + cur.note + '）' : ''}` : ''}　輪：${st.guide || 'なし'}　回転：${Math.round(st.engine.rpm)}`); last = tag; same = 0; await look('操縦席'); }
    else if (++same > 25) { issue(`進まない：${tag}（輪 ${st.guide}）`); break; }
    if (!['prestart', 'start', 'afterStart'].includes(d.phase)) { log(`== ${d.phase} まで来た`); break; }
    if (cur && cur.confirm) await ev(() => window.__cadet.fly.key('Enter'));
    else if (st.guide) await ev((id) => window.__cadet.fly.act(id), st.guide);
    else if (cur) issue(`輪が出ない：${cur.name}`);
    await ev(() => window.__cadet.simulate(0.5, 1 / 30));
    const tw = await ev(() => window.__cadet.fly.flight && window.__cadet.fly.status().engine);
    void tw;
  }
  const eng = await ev(() => ({ twin: window.__cadet.fly.status().engine, sys: null }));
  log(`エンジン：${JSON.stringify(eng.twin)}`);
}

if (which === 'start') {
  await ev(() => window.__cadet.career.reset());
  await sleep(4000);                      // the first card and the greeting
  await look('はじめ');
  const s0 = await ev(() => window.__cadet.career.state()); log(`# ${s0.day} 日目 ${s0.slot} ${s0.chapter}`);
  // the tablet, once, as the guide says (Tab)
  let tabletSeen = false;
  for (let k = 0; k < +daysArg * 30; k++) {
    const st = await ev(() => window.__cadet.career.state());
    if (st.chapter === 'ch2' || st.chapter === 'basic') {
      const sch = await ev(() => window.__cadet.career.schedule());
      if (sch.some(x => ['flight'].includes(x.kind)) && !tabletSeen) { /* (keep going: the flying day) */ }
    }
    const flags = await ev(() => window.__cadet.career.flags());
    if (flags.has_tablet && !tabletSeen) {
      tabletSeen = true; await key('Tab', 0.1);
      const tb = await ev(() => ({ open: window.__cadet.career.tablet.isOpen(), page: window.__cadet.career.tablet.page }));
      log(`- Tab → タブレット ${tb.open ? '開いた' : '開かない'}`); await look('タブレット'); await key('Tab', 0.1);
      if (await ev(() => window.__cadet.career.tablet.isOpen())) issue('Tab でタブレットが閉じない');
    }
    const r = await stepOnce();
    const st2 = await ev(() => window.__cadet.career.state());
    if (st2.day !== st.day || st2.slot !== st.slot || st2.chapter !== st.chapter) log(`# ${st2.day} 日目 ${st2.slot} ${st2.chapter}`);
    if (r === 'fly') { log('== 機体に乗った'); break; }
    if (r === 'stuck') break;
  }
} else if (which === 'ch2' || which === 'seminole') {
  // a day from the morning, as the browser test sets one up (the chapter's first lessons passed for the Seminole)
  const d = await ev((which) => {
    const K = window.__cadet.career, G = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'];
    const P = (ids) => ({ lessons: Object.fromEntries(ids.map(id => [id, { tries: 1, best: 'S', pass: true, levels: G.includes(id) ? [] : ['basic'] }])) });
    const ALL2 = [...G, 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't2', 't4', 'e1', 'e2', 'e3', 't1', 't3', 'c1'];
    const EX = (...ids) => Object.fromEntries(['written1', 'presolo', ...ids].map(id => [id, { tries: 1, best: 90, pass: true }]));
    const o = which === 'ch2' ? { state: { chapter: 'ch2', exams: { written1: { tries: 1, best: 90, pass: true } } }, prog: P(G) }
      : { state: { chapter: 'ch5', exams: EX('nav', 'instr'), solo: { day: 30 }, checks: { xc: { tries: 1, pass: true, day: 40 }, ir: { tries: 1, pass: true, day: 40 } } }, prog: P([...ALL2, 'x3', 'x1', 'x2', 'n1', 'n2', 'n3', 'i1', 'i2', 'i3', 'i4', 'i5']) };
    for (let d = 10; d < 140; d++) {
      K.set({ state: { day: d, slot: 'morning', done: { prologue: 1 }, ...o.state }, progress: o.prog, flags: { met_instructor: true, has_tablet: true }, trust: { instructor: 70 } });
      if (K.schedule().some(x => x.kind === 'flight') && K.weather().fly.am) return d;
    }
    return -1;
  }, which);
  log(`# ${which}：${d} 日目の朝から`);
  await sleep(4000);
  for (let k = 0; k < 80; k++) { const r = await stepOnce(); if (r === 'fly' || r === 'stuck') { log('== ' + r); break; } }
  await cockpit();
} else if (which === 'epilogue') {
  // the graduation's evening (the final check passed, the ceremony done)
  await ev(() => {
    const K = window.__cadet.career, EX = Object.fromEntries(['written1', 'presolo', 'nav', 'instr', 'multi', 'final'].map(id => [id, { tries: 1, best: 90, pass: true }]));
    const C = { tries: 1, pass: true, day: 40 };
    K.set({ state: { chapter: 'ch6', day: 60, slot: 'evening', done: { prologue: 1, 'graduation:grad': 60 }, exams: EX, solo: { day: 30 }, checks: { xc: C, ir: C, me: C, final: C }, graduated: { day: 60 } }, flags: { met_instructor: true, has_tablet: true }, trust: { instructor: 70 } });
  });
  log('# 修了式の日の夕方から'); await sleep(3000); await waitCards();
  for (let k = 0; k < 6; k++) {
    const r = await stepOnce();
    if (await ev(() => window.__cadet.epilogue.state().on)) break;
    if (r === 'stuck') break;
  }
  for (let i = 0; i < 40 && !(await ev(() => window.__cadet.dialog())); i++) await sleep(250);
  const e0 = await ev(() => window.__cadet.epilogue.state());
  log(`== 終章：${e0.on ? '始まった' : '始まらない'}（${e0.mode}）`); if (!e0.on) issue('入口から出ても終章が始まらない');
  await look('終章のはじめ');
  await talk();
  await look('終章・機長のあと');
  // E: to him again (stay: the first choice), Esc: the menu (its main button ends the epilogue), E again: the goodbye
  await key('KeyE', 0.1); await talk();
  log(`- もう少し見る → ${(await ev(() => window.__cadet.epilogue.state())).on ? '終章のまま' : '終章が終わった'}`);
  await key('Escape', 0.1);
  const menuBtn = await ev(() => { const b = [...document.querySelectorAll('#menu button')].find(b => /終章を終える/.test(b.textContent)); return document.querySelector('#menu') && window.__cadet.menu.isOpen() ? (b ? b.textContent : '（ボタンなし）') : '（開かない）'; });
  log(`- Esc → メニュー：${menuBtn}`); if (!/終章を終える/.test(menuBtn)) issue('終章のメニューに「終章を終える」がない');
  await ev(() => window.__cadet.menu.close()); await ev(() => window.__cadet.simulate(0.6)); await sleep(650);
  await key('KeyE', 0.1);
  for (let n = 0; n < 20; n++) {
    const v = await ev(() => window.__cadet.dialog()); if (!v) break;
    log(`    ${v.name}：${v.text}`);
    if (v.typing) await key('Space', 0.05);
    if (v.choices.length) { const i = v.choices.findIndex(c => /そろそろ行きます/.test(c.text)); log(`      > ${i + 1}. ${v.choices[i].text}`); await key(`Digit${i + 1}`, 0.05); } else await key('Space', 0.05);
  }
  for (let i = 0; i < 80 && (await ev(() => window.__cadet.epilogue.state().on || window.__cadet.career.cards())); i++) { await look('終わりのカード'); await sleep(250); }
  const st = await ev(() => window.__cadet.career.state()), e1 = await ev(() => window.__cadet.epilogue.state());
  log(`== 終章のあと：${e1.mode}、${st.day} 日目 ${st.slot}、見た印 ${e1.seen}`);
  if (e1.on || e1.mode !== 'walk' || st.slot !== 'morning') issue('終章のあと、アカデミーの朝に戻らない');
  await look('アカデミーの朝');
}
log('\n## 気になった所');
for (const s of [...new Set(issues)]) log('- ' + s);
log('errors: ' + (g.errors.join(' | ') || 'none'));
if (process.env.SHOT) { const url = await ev(() => window.__cadet.snapshot(2)); fs.writeFileSync(path.join(out, `playtest-${which}.png`), Buffer.from(url.split(',')[1], 'base64')); }
await g.browser.close();
