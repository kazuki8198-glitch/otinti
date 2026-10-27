// CADET — the academy's people (M5) without a screen: who they are and where they stand at each time of day
// (content/people.js); what they say (content/dialog/people.js) — valid dialog data, every talk reachable and runnable
// in every chapter, the go / no-go answered right and wrong, the friend helped; polite, in the world's own words.
import test from 'node:test';
import { NOT_SPOKEN } from '../src/content/dialog/instructor.js';
import assert from 'node:assert/strict';
import { PEOPLE, PEERS, placeOf } from '../src/content/people.js';
import { peopleDialogs, PEOPLE_HOOKS, SAMPLE_CTX, GAME_READS } from '../src/content/dialog/people.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { careerInstructorDialogs } from '../src/content/dialog/instructor-career.js';

const REAL = /(?<![A-Za-z])ANA(?![A-Za-z])|ＡＮＡ|all\s*nippon|全日空|acron|garmin/i;
const ctxFor = (chapter, o = {}) => ({
  career: { chapter, slot: 'am', day: 5, dayMod3: 2, tired: false, solo: false, ...(o.career || {}) },
  today: { flight: '', flightTitle: '今日の飛行', checkride: false, solo: false, exam: false, needsDecision: false, decided: false, decisionRight: true, ...(o.today || {}) },
  weather: { ja: '晴れ', metarAm: 'KLAB 011353Z 36005KT 10SM FEW035 18/10 A2992', metarPm: 'KLAB 011853Z 36005KT 10SM SCT045 21/10 A2992', taf: 'TAF KLAB …', why: '基準内です。', ...(o.weather || {}) },
});
// one talk from its start to the end (the first choice, or the one matching `pick`) → the lines and the hooks
function talk(data, state, id, ctx, pick) {
  const hooks = [], lines = [];
  const r = createRunner({ data, state, ctx, hooks: { onHook: (n, a) => hooks.push([n, a]) } });
  r.start(id);
  for (let k = 0; k < 40 && r.running; k++) {
    const v = r.view(); lines.push(v.text);
    if (v.choices.length) { const i = pick ? Math.max(0, v.choices.findIndex(c => pick.test(c.text))) : 0; r.choose(i); } else r.next();
  }
  assert.equal(r.running, false, `${id}: the talk ends`);
  return { lines, hooks };
}

test('people: nine of them (the examiner with M6), each with a look and a place for each time of day', () => {
  assert.deepEqual(Object.keys(PEOPLE).sort(), ['asahi', 'chief', 'dispatcher', 'examiner', 'instructor', 'kiryu', 'lecturer', 'mechanic', 'mori']);
  assert.deepEqual(PEERS, ['kiryu', 'asahi', 'mori']);
  for (const [id, p] of Object.entries(PEOPLE)) { assert.ok(p.name && p.title && p.role, id); assert.ok(!REAL.test(JSON.stringify(p)), id); }
  // the evening: the cadets in the lounge, the staff gone
  for (const id of PEERS) assert.ok(placeOf(id, 'evening', 'ch1').a > 688, id);
  for (const id of ['dispatcher', 'mechanic', 'chief', 'lecturer']) assert.equal(placeOf(id, 'evening', 'ch2'), null, id);
  // (Sunday in chapter 1: 朝日 in the lounge for the week's review, as the morning's word says; the others as any day)
  const sunday = [{ slot: 'am', kind: 'off' }, { slot: 'am', kind: 'event', id: 'week', who: 'asahi' }];
  for (const slot of ['morning', 'am', 'pm']) assert.ok(placeOf('asahi', slot, 'ch1', sunday).a > 688, `asahi in the lounge on Sunday ${slot}`);
  assert.ok(placeOf('kiryu', 'am', 'ch1', sunday).a < 688, 'kiryu not');
  // the welcome: the chief, the lecturer and the cadets in the lobby
  for (const id of ['chief', 'lecturer', ...PEERS]) { const p = placeOf(id, 'morning', 'prologue'); assert.ok(p.a > 646 && p.a < 664, `${id} in the lobby`); }
  // a class: the lecturer at the whiteboard of briefing room 2, the cadets there too; the device: the sim room
  const cls = [{ slot: 'am', kind: 'class' }], ftd = [{ slot: 'pm', kind: 'ftd' }];
  assert.ok(placeOf('lecturer', 'am', 'ch1', cls).a < 633.6 && placeOf('lecturer', 'am', 'ch1', cls).a > 621);
  assert.ok(placeOf('mori', 'am', 'ch1', cls).a < 633.6);
  assert.ok(placeOf('lecturer', 'pm', 'ch1', ftd).c > 263.6, 'the device room');
  assert.ok(placeOf('dispatcher', 'am', 'ch2').a > 664 && placeOf('mechanic', 'am', 'ch2').c < 230, 'the counter, the apron');
});

test('people: what they say — valid, every node reachable, runnable in every chapter, polite and in the world\'s own words', () => {
  const data = peopleDialogs();
  const { errors, warnings } = validateDialogs(data, { sampleCtx: SAMPLE_CTX });
  assert.deepEqual(errors, []);
  const left = warnings.filter(w => !GAME_READS.some(f => w.includes(`"${f}" is declared but never read`)));
  assert.ok(left.every(w => !/never|unreach/.test(w)), left.join('\n'));
  for (const h of data.hooks) assert.ok(PEOPLE_HOOKS.includes(h));
  const all = [];
  for (const chapter of ['prologue', 'ch1', 'ch2']) for (const solo of [false, true]) for (const tired of [false, true]) {
    if (solo && chapter !== 'ch2') continue;
    for (const id of Object.keys(data.dialogs)) {
      const st = createDialogState();
      for (let n = 0; n < 3; n++) all.push(...talk(data, st, id, ctxFor(chapter, { career: { solo, tired, slot: n === 2 ? 'evening' : 'am' } })).lines);
    }
  }
  for (const l of all) {
    assert.ok(!REAL.test(l), l);
    assert.ok(!/ゲーム|ソフト|プレイヤー|FLIGHT LAB/.test(l), `talks about the game: ${l}`);
    assert.ok(!/\{|\}/.test(l), `a placeholder left: ${l}`);
  }
  // every line written (not only the ones these walks reach): no keys, menus or software in what people say
  for (const d of Object.values(data.dialogs)) for (const [id, n] of Object.entries(d.nodes)) {
    for (const t of [n.text, ...(n.choices || []).map(c => c.text)]) if (t) assert.ok(!NOT_SPOKEN.test(t) && !/ゲーム|ソフト|プレイヤー|クリック/.test(t), `${id}: ${t}`);
  }
  // the first meeting, then what comes after it
  const st = createDialogState();
  assert.match(talk(data, st, 'kiryu', ctxFor('ch1')).lines[0], /桐生です/);
  assert.match(talk(data, st, 'kiryu', ctxFor('ch1')).lines[0], /学科試験/);
});

test('people: the welcome and the tour finish the prologue\'s parts; the dispatcher hands over the tablet', () => {
  const data = peopleDialogs(), st = createDialogState();
  const w = talk(data, st, 'chief', ctxFor('prologue'));
  assert.match(w.lines.join(''), /ようこそ/); assert.deepEqual(w.hooks.filter(h => h[0] === 'done'), [['done', 'ceremony']]);
  assert.ok(st.flags.welcome_done && st.flags.met_chief);
  const t = talk(data, st, 'dispatcher', ctxFor('prologue'));
  assert.ok(t.hooks.some(h => h[0] === 'tablet') && t.hooks.some(h => h[0] === 'done' && h[1] === 'tour'));
  assert.ok(st.items.includes('tablet') && st.flags.has_tablet);
  assert.doesNotMatch(talk(data, st, 'chief', ctxFor('prologue')).lines[0], /ようこそ/, 'once');
});

test('people: the go / no-go at the counter — the right call agreed (trust up), the wrong one put right (the reason said)', () => {
  const data = peopleDialogs();
  for (const [right, add] of [[true, 2], [false, -1]]) {
    const st = createDialogState(), ctx = ctxFor('ch2', { today: { needsDecision: true, flightTitle: 'a3 の飛行', decisionRight: right }, weather: { why: '朝は霧で視程 1/2 SM。' } });
    const r = talk(data, st, 'dispatcher', ctx, /午後まで待ちます/);
    assert.deepEqual(r.hooks.filter(h => h[0] === 'decide'), [['decide', 'wait']]);
    assert.match(r.lines.join(''), /霧で視程/);
    assert.equal(st.trust.dispatcher, 50 + add);
  }
});

test('people: the friend who struggles — helped in the evening (it tires), thanked afterwards and on the day of the solo', () => {
  const data = peopleDialogs(), st = createDialogState();
  talk(data, st, 'mori', ctxFor('ch1'));                                       // the first meeting
  // (after the weather class: the 5th — ctx career.cls 5; he asks, the cadet explains)
  assert.ok(!talk(data, createDialogState(), 'mori', ctxFor('ch1', { career: { slot: 'evening', cls: 2 } })).lines.some(l => /教えてくれないかな/.test(l)), 'not before the weather class');
  const ev = talk(data, st, 'mori', ctxFor('ch1', { career: { slot: 'evening', cls: 5 } }), /一緒にやろう/);
  assert.ok(ev.lines.some(l => /BKN って、どういう意味/.test(l)), 'the cadet explains');
  assert.ok(st.flags.helped_mori); assert.ok(ev.hooks.some(h => h[0] === 'help')); assert.equal(st.trust.mori, 58);
  assert.match(talk(data, st, 'mori', ctxFor('ch1')).lines[0], /ありがとう/);
  assert.match(talk(data, st, 'mori', ctxFor('ch2', { career: { solo: true } })).lines[0], /助けてもらった/);
});

test('people: a career begun after another — the welcome in full or its three promises alone; then the tour and the meeting short too', () => {
  const data = peopleDialogs(), st = createDialogState();
  const v = ctxFor('prologue', { career: { slot: 'morning', veteran: true } });
  const w = talk(data, st, 'chief', v, /大事なところだけ/);
  assert.ok(w.lines.some(l => /約束は 3 つだけ/.test(l)) && w.hooks.some(h => h[0] === 'done' && h[1] === 'ceremony'), 'the promises, the welcome done');
  assert.ok(st.flags.prologue_short && st.flags.welcome_done);
  const t = talk(data, st, 'dispatcher', ctxFor('prologue', { career: { slot: 'am' } }));
  assert.ok(t.lines.length === 1 && t.hooks.some(h => h[0] === 'tablet') && t.hooks.some(h => h[0] === 'done' && h[1] === 'tour'), 'the tablet handed over in a line');
  const m = careerInstructorDialogs(), r = createRunner({ data: m, state: st, ctx: {}, hooks: { onHook: () => {} } });
  r.start('meet'); assert.match(r.view().text, /明日から座学/); 
  // (the first career: no such choice)
  const first = talk(data, createDialogState(), 'chief', ctxFor('prologue', { career: { slot: 'morning', veteran: false } }));
  assert.ok(!first.lines.some(l => /大事なところだけ/.test(l)));
});
