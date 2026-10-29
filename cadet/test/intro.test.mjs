// CADET — the first day's introductory flight (体験飛行), without a screen:
//  - the data: the air talks (content/dialog/intro.js) and the meeting that offers it pass the validator with their
//    English; every line, choice, in-air line, panel, card and the day's word is 2–120 characters, in the world's own
//    words, with no call sign of the textbook's;
//  - the flow: every way through each air talk ends with exactly one 'intro' hook, the one its step expects; the
//    exchange of the controls is taught before it is checked; a wrong answer comes back to its question; nothing is
//    scored; the meeting ends with done 'meet:fly' (flown) or 'meet' (declined), the second career's in short;
//  - the physics (FLIGHT LAB through flight/flight.js, Sorajima's Archer): the practice area's start, a cadet with hands
//    off, a scripted cadet, the cadet who watches (his hands win over a stick held), wild hands (taken back twice, then
//    he keeps them), random hands (never damaged, never low, always over);
//  - FLIGHT LAB's record untouched (discard, no finish); the logbook's line.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { introAirDialogs, INTRO_AIR, INTRO_HUD, INTRO_CARDS, INTRO_RIGHT, INTRO_SAMPLE, introPanel } from '../src/content/dialog/intro.js';
import { careerInstructorDialogs, CAREER_SAMPLE } from '../src/content/dialog/instructor-career.js';
import { instructorDialogs, sampleCtx } from '../src/content/dialog/instructor.js';
import { withEnglish, airEnglish } from '../src/content/dialog/en.js';
import { PROLOGUE_WORDS } from '../src/content/day-flow.js';
import { gameBook } from '../src/content/book.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { createFlight } from '../src/flight/flight.js';
import { createIntro, runIntroScripted, INTRO_STEPS, INTRO_LIMITS, INTRO_TASKS } from '../src/flight/intro-flight.js';
import { introEntry, cleanEntry, INSTRUCTOR_SIG, INTRO_SKIPPED_S } from '../src/career/logbook.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL, SC = FL.school, BOOK = gameBook(FL);
const LESSONS = FL.syllabus.STAGES.flatMap(s => s.lessons);
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), keys: () => [...m.keys()] }; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// what the cadet sees must be the world's own words
const BAN = /ゲーム|ソフト|プレイヤー|FLIGHT LAB|シミュレータ|キーボード|メニュー|教材|[{}<>]/, LEAK = /Seven Lima Alpha|7LA/;
// the meeting as the game has it: the briefing's talks and the career's, together (main.js instructorData)
const meeting = () => { const d = instructorDialogs(FL, { lessonId: 'a1' }), c = careerInstructorDialogs();
  return { speakers: { ...d.speakers, ...c.speakers }, flags: [...new Set([...d.flags, ...c.flags])], hooks: [...new Set([...d.hooks, ...c.hooks])], dialogs: { ...d.dialogs, ...c.dialogs } }; };
// every way through a talk: each choice taken (a node seen twice on one way goes on by its right answer, or its last
// choice — the wrong answers' loops, the meeting's questions) → [{ nodes, hooks }]
function ways(data, id, ctx, state0 = {}) {
  const out = [], todo = [[]];
  while (todo.length && out.length < 400) {
    const seq = todo.shift(), nodes = [], hooks = [], st = createDialogState(); Object.assign(st.flags, state0);
    const r = createRunner({ data, state: st, ctx, hooks: { onHook: (n, a) => hooks.push([n, a]) } });
    r.start(id);
    let k = 0, open = true;
    for (let n = 0; n < 80 && r.running; n++) {
      const v = r.view(); nodes.push(`${v.dialog}:${v.node}`);
      if (!v.choices.length) { r.next(); continue; }
      if (k < seq.length) { r.choose(seq[k++]); continue; }
      const seen = nodes.filter(x => x === nodes[nodes.length - 1]).length, right = INTRO_RIGHT[v.node] ? v.choices.findIndex(c => INTRO_RIGHT[v.node].test(c.text)) : v.choices.length - 1;
      for (let i = 0; i < v.choices.length; i++) if (seen < 2 || i === right) todo.push([...seq, i]);
      open = false; break;
    }
    if (open) { assert.equal(r.running, false, `${id}: a way that does not end (${nodes.join(' ')})`); out.push({ nodes, hooks }); }
  }
  return out;
}

test('data: the air talks and the meeting pass the validator with their English; every line short, in the world\'s words, no textbook call sign', () => {
  const air = withEnglish(introAirDialogs());
  assert.deepEqual(validateDialogs(air, { sampleCtx: INTRO_SAMPLE }), { errors: [], warnings: [] });
  for (const id of Object.keys(air.dialogs)) assert.ok(!id.includes(':'), id);
  const r = validateDialogs(withEnglish(meeting()), { sectionExists: BOOK.sectionExists, lessonExists: (id) => LESSONS.some(l => l.id === id), sampleCtx: { ...CAREER_SAMPLE, ...sampleCtx(FL) } });
  // (the meeting's own: the career's talks have a board hook main.js reads for the day — 'study' — that is not a section)
  assert.deepEqual(r.errors.filter(e => /meet|fly:|intro/.test(e)), []);
  assert.deepEqual(r.warnings.filter(w => /meet|fly:|intro/.test(w)), []);
  const texts = [];
  for (const d of [introAirDialogs(), careerInstructorDialogs()]) for (const [did, dd] of Object.entries(d.dialogs)) {
    if (did !== 'meet' && did !== 'meetAgain' && !/^intro/.test(did)) continue;          // (the air talks, the meeting)
    for (const [nid, n] of Object.entries(dd.nodes)) { texts.push([`${did}:${nid}`, n.text]); for (const c of n.choices || []) texts.push([`${did}:${nid} (choice)`, c.text]); }
  }
  assert.ok(texts.length > 90, `${texts.length} lines`);
  for (const [k, v] of Object.entries(INTRO_AIR)) texts.push([k, v]);
  for (const [k, h] of Object.entries(INTRO_HUD)) texts.push([`hud ${k}`, h.title], [`hud ${k}`, h.text]);
  texts.push(['hud toward', introPanel('toward', { brg: 230 }).text], ...introPanel('level').keys.map(([a, b]) => ['hud keys', `${a} ${b}`]));
  for (const [k, c] of Object.entries(INTRO_CARDS)) texts.push([`card ${k}`, c.title], [`card ${k}`, c.sub]);
  for (const t of PROLOGUE_WORDS.intro) texts.push(['the day\'s word', t]);
  for (const [k, t] of texts) {
    const n = Array.from(t).length;
    assert.ok(n >= 2 && n <= 120, `${k}: ${n} characters`);
    assert.doesNotMatch(t, BAN, k); assert.doesNotMatch(t, LEAK, k);
  }
  // (his in-air lines in English too; the day's word short as the meeting's)
  for (const [k, v] of Object.entries(INTRO_AIR)) assert.ok(airEnglish(v), k);
  assert.equal(PROLOGUE_WORDS.intro[1], PROLOGUE_WORDS.meet[1]);
  assert.match(introPanel('toward', { brg: 230 }).text, /針路 約 230/);
});

test('flow: every way through each air talk ends with one \'intro\' hook, its step\'s; the calls taught before they are checked; wrong answers asked again; nothing scored', () => {
  const data = introAirDialogs();
  const ctxs = [];
  for (const watch of [false, true]) for (const level of ['good', 'drift', 'took', 'watch']) for (const turn of ['good', 'low', 'high', 'nolook', 'none', 'took', 'watch'])
    for (const labSide of ['r', 'rb', 'f', 'l', 'lb']) for (const toward of ['good', 'time', 'watch']) if (turn === 'good' || labSide === 'r') ctxs.push({ intro: { watch, level, turn, labSide, toward } });
  const want = { intro: ['level', 'watch'], introB: ['look'], introC: ['toward'], introD: ['back'], introTake: ['resume'], introEnd: ['back'] };
  const seen = new Set();
  for (const [id, gos] of Object.entries(want)) for (const ctx of ctxs.slice(0, id === 'intro' || id === 'introTake' || id === 'introEnd' ? 2 : ctxs.length)) for (const short of [false, true]) {
    for (const w of ways(data, id, ctx, short ? { prologue_short: true } : {})) {
      const h = w.hooks.filter(x => x[0] === 'intro');
      assert.equal(h.length, 1, `${id}: ${w.nodes.join(' ')}`);
      assert.ok(gos.includes(h[0][1]), `${id} ends with ${h[0][1]}`);
      for (const n of w.nodes) seen.add(n);
    }
  }
  // (every node of every air talk on some way)
  for (const [did, d] of Object.entries(data.dialogs)) for (const nid of Object.keys(d.nodes)) assert.ok(seen.has(`${did}:${nid}`), `${did}:${nid} never reached`);
  // the steps: the talks are INTRO_STEPS's, the takeovers' two besides
  assert.deepEqual(INTRO_STEPS.filter(s => s.talk).map(s => s.talk), ['intro', 'introB', 'introC', 'introD']);
  // wrong answers come back to their question; nothing scored, no answer kept
  const N = (d, n) => data.dialogs[d].nodes[n];
  assert.equal(N('introD', 'd:ng').next, 'd:ihc:ck'); assert.equal(N('introTake', 'tk:ng').next, 'tk:ck');
  assert.equal(data.questions, undefined);
  const all = JSON.stringify(data) + JSON.stringify(careerInstructorDialogs().dialogs.meet);
  assert.doesNotMatch(all, /"hook":"ans"/);
  // (the right answers are among the choices)
  for (const [node, re] of Object.entries(INTRO_RIGHT)) {
    const n = Object.values(data.dialogs).map(d => d.nodes[node]).find(Boolean) || careerInstructorDialogs().dialogs.meet.nodes[node];
    assert.equal(n.choices.filter(c => re.test(c.text)).length, 1, node);
  }
});

test('flow: the meeting offers the flight — taken: done \'meet:fly\' once (the calls taught, then checked); declined: done \'meet\'; the second career\'s in short; offered again', () => {
  const data = meeting();
  const run = (pick, flags = {}, start = 'meet') => {
    const st = createDialogState(); Object.assign(st.flags, flags);
    const hooks = [], nodes = [], r = createRunner({ data, state: st, ctx: CAREER_SAMPLE, hooks: { onHook: (n, a) => hooks.push([n, a]) } });
    r.start(start);
    for (let k = 0; k < 60 && r.running; k++) {
      const v = r.view(); nodes.push(v.node);
      if (!v.choices.length) { r.next(); continue; }
      // (pick: the first of a list that matches, or a node's own)
      const res = Array.isArray(pick) ? pick : [pick[v.node] || /^/], i = res.map(p => v.choices.findIndex(c => p.test(c.text))).find(j => j >= 0);
      r.choose(i >= 0 ? i : 0);
    }
    assert.equal(r.running, false);
    return { done: hooks.filter(h => h[0] === 'done').map(h => h[1]), nodes, st };
  };
  let r = run([/今は大丈夫/, /^乗ります$/]);
  assert.deepEqual(r.done, ['meet:fly']); assert.ok(r.st.flags.met_instructor);
  assert.ok(r.nodes.indexOf('fly:ex:ck') > r.nodes.indexOf('fly:x2') && r.nodes.indexOf('fly:x2') > 0, r.nodes.join(' '));
  r = run({ m4: /ソロまで/, m4b: /ありがとう/, 'fly:ask': /^乗ります$/ });     // (a question first: m4b's last choice offers it too)
  assert.deepEqual(r.done, ['meet:fly']);
  r = run([/今は大丈夫/, /やめておきます/]);
  assert.deepEqual(r.done, ['meet']); assert.ok(r.nodes.includes('fly:ask') && r.nodes.at(-1) === 'm:end');
  // (whatever is answered at the check, the flight goes on)
  for (const a of [/^OK です$/, /^わかりません$/]) assert.deepEqual(run([/今は大丈夫/, /^乗ります$/, a]).done, ['meet:fly']);
  // the second career: its own short meeting, then the offer; the calls in one line, no check
  const st = createDialogState(); st.flags.prologue_short = true;
  const v = createRunner({ data, state: st, ctx: CAREER_SAMPLE, hooks: {} }); v.start('meet');
  assert.match(v.view().text, /明日から座学/); v.next(); assert.equal(v.view().node, 'fly:s:ask');
  r = run([/^乗ります$/], { prologue_short: true });
  assert.deepEqual(r.done, ['meet:fly']); assert.ok(r.nodes.includes('fly:s') && !r.nodes.includes('fly:ex:ck'));
  assert.deepEqual(run([/やめておきます/], { prologue_short: true }).done, ['meet']);
  // fly:ex:ck only ever after the calls were taught
  for (const w of ways(data, 'meet', CAREER_SAMPLE)) { const i = w.nodes.indexOf('meet:fly:ex:ck'); if (i >= 0) assert.ok(w.nodes.slice(0, i).some(n => /^meet:fly:(x2|s)$/.test(n)), w.nodes.join(' ')); }
  // offered again after a reload in the air
  assert.deepEqual(run([/^乗ります$/], {}, 'meetAgain').done, ['meet:fly']);
  assert.deepEqual(run([/やめておきます/], {}, 'meetAgain').done, ['meet']);
});

test('physics: the practice area\'s start; hands off holds it; a scripted cadet flies the turn and finds LAB; the one who watches; wild hands taken back twice', () => {
  const f = createFlight(FL, { store: memStore() });
  const L = f.startFree('area', 'pa28', { sens: 'low', autoRud: true, assist: false, wind: { rel: -350, kt: 5, gust: 0.5 } }), c = L.last;
  assert.ok(Math.abs(c.alt - 3000) <= 20 && Math.abs(c.hdg - 90) <= 2 && Math.abs(c.kias - 115) <= 3, JSON.stringify({ alt: c.alt, hdg: c.hdg, kias: c.kias }));
  const task = (r, id) => r.steps.find(s => s.task === id);
  // hands off: the trim and the pitch hold keep it level for the 20 s; no takeover; it ends
  let r = runIntroScripted(FL, createFlight, { hands: 'none', store: memStore() });
  assert.equal(task(r, 'level').result, 'good'); assert.equal(r.sum.takes, 0); assert.ok(r.sum && !r.sum.cut);
  assert.equal(task(r, 'look').result, 'time'); assert.equal(task(r, 'turn').result, 'none');
  // the scripted cadet
  let lastHdg = null;
  r = runIntroScripted(FL, createFlight, { hands: 'cadet', store: memStore(), onFrame: (cc, v) => { if (v.task === 'turn') lastHdg = cc.hdg; } });
  const t = task(r, 'turn');
  assert.equal(t.result, 'good'); assert.ok(t.secs <= INTRO_TASKS.turn.max && Math.abs(lastHdg - 180) <= 10, `${t.secs} s, ${lastHdg}`);
  assert.ok(t.peak >= 10 && t.peak <= 25, `peak bank ${t.peak}`);
  assert.equal(r.sum.labSide, 'r'); assert.ok(r.sum.labRel >= 30 && r.sum.labRel <= 70, `LAB at ${r.sum.labRel}`);
  assert.equal(task(r, 'toward').result, 'good'); assert.equal(task(r, 'level').result, 'good'); assert.equal(task(r, 'look').result, 'ok');
  assert.ok(r.sum.handsS >= 70 && r.sum.handsS <= 150, `${r.sum.handsS} s at the controls`);
  assert.deepEqual(r.steps.filter(s => s.talk).map(s => s.id), ['intro', 'introB', 'introC', 'introD']);
  // (the talks' context as the steps had it)
  assert.deepEqual(r.steps.find(s => s.id === 'introC').ctx, { level: 'good', watch: false, turn: 'good', labSide: 'r', toward: null });
  // the one who watches: he flies the same; a stick held (KeyD all along) does not move his 15°
  let maxBank = 0;
  r = runIntroScripted(FL, createFlight, { hands: 'watch', store: memStore(), onFrame: (cc) => { maxBank = Math.max(maxBank, Math.abs(cc.bank)); } });
  assert.ok(r.sum.watched && ['level', 'look', 'turn', 'toward'].every(id => task(r, id).result === 'watch'), JSON.stringify(r.steps));
  assert.ok(maxBank >= 12 && maxBank <= 18, `his bank ${maxBank}`);
  assert.equal(r.sum.handsS, 0);
  // wild hands: taken back before the speed, the height or the bank get away; levelled within 6 s; the second time he keeps them
  let worst = { kias: 0, alt: 9999, bank: 0 };
  r = runIntroScripted(FL, createFlight, { hands: 'wild', store: memStore(), onFrame: (cc) => { worst = { kias: Math.max(worst.kias, cc.kias), alt: Math.min(worst.alt, cc.alt), bank: Math.max(worst.bank, Math.abs(cc.bank)) }; } });
  assert.equal(r.sum.takes, 2);
  const takes = r.steps.filter(s => s.task === 'take');
  assert.equal(takes.length, 2); for (const k of takes) assert.ok(k.secs < INTRO_LIMITS.recoverMax, `recovered in ${k.secs} s`);
  assert.ok(worst.kias <= 140 && worst.alt >= 2600 && worst.bank <= 45, JSON.stringify(worst));
  assert.deepEqual(r.steps.filter(s => s.talk).map(s => s.id).slice(-2), ['introTake', 'introEnd']);
  assert.ok(r.says.some(s => s.key === 'X_take'));
});

test('physics: random hands (seeds 1–50) — never damaged, never below 2,400 ft, always over within 300 s', () => {
  const KEYS = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  for (let seed = 1; seed <= 50; seed++) {
    const rnd = rng(seed); let held = new Set(), until = 0, low = 9999;
    const r = runIntroScripted(FL, createFlight, { hands: 'cadet', store: memStore(), maxSec: 300,
      keys: (task, c, t) => { if (t >= until) { held = new Set(KEYS.filter(() => rnd() < 0.18)); until = t + 0.3 + rnd() * 3; } return held; },
      onFrame: (cc) => { low = Math.min(low, cc.alt); } });
    assert.ok(r.sum, `seed ${seed}: over within 300 s (${r.t.toFixed(0)} s)`);
    assert.ok(!r.flight.s.crashed, `seed ${seed}: damaged`);
    assert.ok(low > 2400, `seed ${seed}: down to ${low.toFixed(0)} ft`);
  }
});

test('FLIGHT LAB\'s record untouched: the intro\'s time dropped (discard, no finish) — no progress, no record, nothing in the store', () => {
  const store = memStore();
  const r = runIntroScripted(FL, createFlight, { hands: 'cadet', store });
  r.flight.discard();
  assert.deepEqual(r.flight.progress(), SC.sanitizeProgress({}));
  assert.deepEqual(r.flight.records(), []);
  assert.deepEqual(store.keys(), []);
  // (the free flight's own finish would have kept its time: the intro never calls it)
  const s2 = memStore(), f = createFlight(FL, { store: s2 }); f.startFree('area', 'pa28');
  for (let i = 0; i < 600; i++) f.frame(1 / 60, { has: () => false });
  f.finish(); assert.ok(f.progress().time > 9);
});

test('the logbook\'s line: 0.5 h dual with the 25 minutes he flew said, no landing, no lesson, his signature; cut and watched remarks; kept as written', () => {
  const e = introEntry({ date: '2027-04-01', dayN: 1, airSec: 150 });
  assert.equal(e.total, 0.5); assert.equal(e.dual, 0.5); assert.equal(e.solo, 0); assert.equal(e.landings, 0); assert.deepEqual(e.lessons, []);
  assert.equal(e.skipped, INTRO_SKIPPED_S / 60); assert.equal(e.skipped, 25); assert.deepEqual(e.sig, INSTRUCTOR_SIG);
  assert.match(e.remarks, /^体験飛行/); assert.equal(e.xc + e.inst + e.me, 0); assert.equal(e.aircraft, 'PA-28-181');
  assert.deepEqual(cleanEntry(JSON.parse(JSON.stringify(e))), e);
  assert.match(introEntry({ airSec: 40, cut: true }).remarks, /途中で切り上げ/);
  assert.match(introEntry({ airSec: 90, watched: true }).remarks, /見学/);
  for (const x of [e, introEntry({ cut: true }), introEntry({ watched: true })]) assert.ok(Array.from(x.remarks).length <= 120 && !BAN.test(x.remarks));
});

test('the intro alone: the events in order, its clocks physics seconds, the panel and the heading mark for each task', () => {
  const f = createFlight(FL, { store: memStore() });
  f.startFree('area', 'pa28', { sens: 'low', autoRud: true, assist: false });
  const I = createIntro({ FL, thr0: f.s.thr, alt0: f.L.alt0, hdg0: f.L.hdg0 });
  assert.deepEqual(I.begin(), [{ type: 'talk', id: 'intro' }]);
  assert.deepEqual(I.update(1, f.L.last, FL.physics.ne(f.s)), [], 'no task yet: nothing');
  const ev = I.onTalkEnd('level');
  assert.equal(ev[0].type, 'task'); assert.equal(ev[0].id, 'level'); assert.equal(ev[0].bug, 90); assert.match(ev[0].hud.title, /まっすぐ/);
  assert.ok(I.cadetHands);
  // (no frames flown: no time on its clock)
  assert.equal(I.view().t, 0); I.update(0, f.L.last, FL.physics.ne(f.s)); assert.equal(I.view().t, 0);
  // the pilot pins what is his: the throttle, the flaps, the trim, the automatic rudder; the cadet's yoke left alone
  const s = f.s, thr = s.thr; s.thr = 1; s.flapIdx = 2; s.opts.autoRud = false; s.opts.levelT = 3; s.rIn = 0.4;
  I.pilot(f.L);
  assert.deepEqual([s.thr, s.flapIdx, s.opts.autoRud, s.opts.levelT, s.opts.assist, s.rIn], [thr, 0, true, 0, false, 0.4]);
  // cut short: its summary says so; a crash: his word, the end after 2 s
  assert.equal(I.summary({ cut: true }).cut, true);
  const end = I.crashed('x');
  assert.deepEqual(end.map(e => e.type), ['say', 'hud', 'end']); assert.equal(end[0].key, 'X_crash'); assert.equal(end[2].delay, 2);
  assert.ok(I.done && !I.cadetHands);
});
