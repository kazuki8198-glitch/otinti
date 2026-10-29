// CADET — dialog tests (node --test): the conversation engine, the dialogue-data validator and the save.
//  - conditions, effects (trust starts at 50 and stays within 0–100), placeholders, skipped nodes (else / next),
//    jumps between dialogs (node ids may hold colons: 'ask:sec:aero.lift'), onChange, the cap on runaway skips;
//  - the validator passes good data and catches each kind of error on small crafted data;
//  - the save round-trips the state and treats other versions, broken data and failing storage as "nothing saved".
import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, MAX_HOPS, createDialogState, evalCond, applyEffects, fill, createRunner, resolveTarget, getPath } from '../src/dialog/engine.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createSave } from '../src/core/save.js';

// a small conversation shaped like the instructor's: first meeting vs later, a menu, a jump to 'ask' and back
const DATA = () => ({
  speakers: { instructor: { name_ja: '早瀬 教官', color: '#5cc8ff' }, player: { name_ja: 'あなた', color: '#f2b632' } },
  flags: ['met', 'done'],
  hooks: ['book', 'board', 'nod', 'point'],
  dialogs: {
    brief: { start: 'hello', nodes: {
      hello: { if: { not: { flag: 'met' } }, else: 'again', speaker: 'instructor', text: 'はじめまして。', effects: [{ set: 'met' }], next: 'menu' },
      again: { speaker: 'instructor', text: 'また会いましたね。', next: 'menu' },
      menu: { speaker: 'instructor', text: '今日は{lesson.title}です。', hook: { name: 'point', arg: 'board' }, choices: [
        { text: '質問があります', next: 'ask:root' },
        { text: '図を見せてください', next: 'fig', if: { trust: 'instructor', gte: 52 } },
        { text: '前回の続きを', next: 'again', if: { flag: 'done' } },
        { text: 'ありがとうございました', next: 'bye', effects: [{ trust: 'instructor', add: 2 }] },
      ] },
      fig: { speaker: 'instructor', text: 'これが揚力の図です。', hook: { name: 'board', arg: 'aero.lift' }, next: 'menu' },
      bye: { speaker: 'instructor', text: 'では{lesson.place}で。', effects: [{ set: 'done' }, { hook: 'nod' }], end: true },
    } },
    ask: { start: 'root', nodes: {
      root: { speaker: 'instructor', text: '何でもどうぞ。', choices: [
        { text: '揚力について', next: 'sec:aero.lift' },
        { text: '質問はもうありません', next: 'brief:menu' },
      ] },
      'sec:aero.lift': { speaker: 'instructor', text: '翼は空気を下に曲げて、その反作用で持ち上がります。', choices: [
        { text: '教科書で読む', next: 'root', effects: [{ hook: 'book', arg: 'aero.lift' }] },
        { text: 'ほかの質問', next: 'root' },
      ] },
    } },
  },
});
const CTX = { lesson: { title: '姿勢・出力・トリム', place: '駐機場', brief: ['一つ目', '二つ目'], n: 3 } };
const SECTIONS = new Set(['aero.lift', 'aero.drag']);
const OPTS = { sectionExists: (id) => SECTIONS.has(id), lessonExists: (id) => id === 'a1', sampleCtx: CTX };

function run(data = DATA(), state = createDialogState()) {
  const log = [], hooks = [], changes = [];
  const r = createRunner({ data, state, ctx: CTX, hooks: { onHook: (name, arg) => hooks.push([name, arg]) } });
  r.onChange((v) => changes.push(v));
  return { r, state, log, hooks, changes };
}

// ---------------------------------------------------------------- engine

test('engine: a fresh state, and a cleaned copy of a saved one', () => {
  assert.deepEqual(createDialogState(), { v: SAVE_VERSION, flags: {}, trust: {}, items: [], seen: {} });
  const saved = { v: 1, flags: { met: true, step: 2, name: 'x', bad: { o: 1 } }, trust: { instructor: 140, kaz: -5, nan: 'x' }, items: ['card', 'card', 3], seen: { 'brief:hello': true, 'brief:no': 0 } };
  const s = createDialogState(saved);
  assert.deepEqual(s, { v: 1, flags: { met: true, step: 2, name: 'x' }, trust: { instructor: 100, kaz: 0 }, items: ['card'], seen: { 'brief:hello': true } });
  s.flags.met = false; s.items.push('x');
  assert.equal(saved.flags.met, true, 'a copy, not the saved object');
  assert.deepEqual(saved.items, ['card', 'card', 3]);
  for (const bad of [null, undefined, 3, 'x', [], { v: 2, flags: {} }, { flags: {} }, { v: 1, flags: 'x' }, { v: 1, items: {} }, { v: 1, trust: [] }, { v: 1, seen: 3 }])
    assert.deepEqual(createDialogState(bad), createDialogState(), `fresh for ${JSON.stringify(bad)}`);
  // '__proto__' from JSON is an own key: it must not change the copy's prototype
  const p = createDialogState(JSON.parse('{"v":1,"flags":{"__proto__":{"polluted":true},"ok":true}}'));
  assert.deepEqual(p.flags, { ok: true }); assert.equal({}.polluted, undefined); assert.equal(p.flags.polluted, undefined);
});

test('engine: conditions', () => {
  const s = createDialogState({ v: 1, flags: { met: true, step: 2, off: false }, trust: { instructor: 60 }, items: [], seen: { 'brief:hello': true } });
  const t = (c, ctx = CTX) => evalCond(c, s, ctx);
  assert.equal(t(undefined), true); assert.equal(t(null), true);
  assert.equal(t({ flag: 'met' }), true); assert.equal(t({ flag: 'off' }), false); assert.equal(t({ flag: 'never' }), false);
  assert.equal(t({ flag: 'step', is: 2 }), true); assert.equal(t({ flag: 'step', is: '2' }), false);
  assert.equal(t({ flag: 'never', is: false }), true, 'a flag never set reads as false');
  assert.equal(t({ flag: 'never', is: true }), false);
  assert.equal(t({ not: { flag: 'met' } }), false); assert.equal(t({ not: { flag: 'never' } }), true);
  assert.equal(t({ all: [{ flag: 'met' }, { flag: 'step', is: 2 }] }), true); assert.equal(t({ all: [{ flag: 'met' }, { flag: 'off' }] }), false);
  assert.equal(t({ any: [{ flag: 'off' }, { flag: 'met' }] }), true); assert.equal(t({ any: [{ flag: 'off' }, { flag: 'never' }] }), false);
  assert.equal(t({ all: [] }), true); assert.equal(t({ any: [] }), false);
  assert.equal(t({ trust: 'instructor', gte: 60 }), true); assert.equal(t({ trust: 'instructor', gte: 61 }), false);
  assert.equal(t({ trust: 'instructor', lt: 60 }), false); assert.equal(t({ trust: 'instructor', lt: 61 }), true);
  assert.equal(t({ trust: 'nobody', gte: 50 }), true, 'trust starts at 50'); assert.equal(t({ trust: 'nobody', lt: 50 }), false);
  assert.equal(t({ trust: 'instructor', gte: 50, lt: 70 }), true, 'both: a range'); assert.equal(t({ trust: 'instructor', gte: 50, lt: 60 }), false);
  assert.equal(t({ seen: 'brief:hello' }), true); assert.equal(t({ seen: 'brief:menu' }), false);
  assert.equal(t({ ctx: 'lesson.title', is: '姿勢・出力・トリム' }), true); assert.equal(t({ ctx: 'lesson.title', is: 'x' }), false);
  assert.equal(t({ ctx: 'lesson.n', is: 3 }), true);
  assert.equal(t({ ctx: 'lesson.brief.1', exists: true }), true); assert.equal(t({ ctx: 'lesson.brief.2', exists: true }), false);
  assert.equal(t({ ctx: 'lesson.missing.deep', exists: false }), true); assert.equal(evalCond({ ctx: 'lesson.title', exists: true }, s, undefined), false);
  assert.equal(t({ ctx: 'lesson.constructor', exists: true }), false, 'Object.prototype members do not resolve');
  for (const bad of [{}, { flag: 'met', trust: 'x', gte: 1 }, { trust: 'instructor' }, { ctx: 'lesson.title' }, { not: undefined }, { all: 'x' }, { what: 1 }])
    assert.throws(() => t(bad), /unknown condition/, JSON.stringify(bad));
  // only the state's own keys count: Object.prototype's members are not set flags or seen nodes
  const fresh = createDialogState();
  for (const name of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
    assert.equal(evalCond({ flag: name }, fresh, {}), false, `flag ${name}`);
    assert.equal(evalCond({ flag: name, is: false }, fresh, {}), true, `flag ${name} is false`);
    assert.equal(evalCond({ seen: name }, fresh, {}), false, `seen ${name}`);
  }
  applyEffects({ set: 'constructor' }, fresh); assert.equal(evalCond({ flag: 'constructor' }, fresh, {}), true, 'once set, such a name works');
});

test('engine: effects (set, trust clamped 0–100 from 50, give, hook)', () => {
  const s = createDialogState(), calls = [];
  const hooks = { onHook: (n, a) => calls.push([n, a]) };
  applyEffects([{ set: 'met' }, { set: 'step', to: 3 }, { set: 'off', to: false }], s, hooks);
  assert.deepEqual(s.flags, { met: true, step: 3, off: false });
  applyEffects([{ trust: 'instructor', add: 3 }], s); assert.equal(s.trust.instructor, 53);
  applyEffects([{ trust: 'instructor', add: -10 }], s); assert.equal(s.trust.instructor, 43);
  applyEffects([{ trust: 'instructor', add: 500 }], s); assert.equal(s.trust.instructor, 100);
  applyEffects([{ trust: 'instructor', add: -500 }], s); assert.equal(s.trust.instructor, 0);
  applyEffects([{ trust: 'kaz', add: -60 }], s); assert.equal(s.trust.kaz, 0);
  applyEffects([{ give: 'checklist' }, { give: 'checklist' }, { give: 'card' }], s); assert.deepEqual(s.items, ['checklist', 'card']);
  applyEffects([{ hook: 'nod' }, { hook: 'book', arg: 'aero.lift' }], s, hooks);
  assert.deepEqual(calls, [['nod', undefined], ['book', 'aero.lift']]);
  applyEffects(undefined, s); applyEffects([], s); applyEffects([{ hook: 'nod' }], s);                     // no hooks object: fine
  applyEffects({ set: 'single' }, s); assert.equal(s.flags.single, true, 'a single effect object works too');
  // a hook that throws does not stop the effects after it
  const quiet = console.error; console.error = () => {};
  try { applyEffects([{ hook: 'nod' }, { set: 'after' }], s, { onHook: () => { throw new Error('boom'); } }); } finally { console.error = quiet; }
  assert.equal(s.flags.after, true);
  assert.throws(() => applyEffects([{ trust: 'instructor', add: 'x' }], s), /trust effect/);
  assert.throws(() => applyEffects([{ what: 1 }], s), /unknown effect/);
  assert.throws(() => applyEffects([{ set: 'x', give: 'y' }], s), /unknown effect/);
  // only values a save keeps: anything else would quietly change after a reload
  for (const bad of [{ set: 'x', to: { a: 1 } }, { set: 'x', to: null }, { set: 'x', to: NaN }, { set: '' }, { set: 3 }, { set: '__proto__', to: true }])
    assert.throws(() => applyEffects(bad, s), /bad set effect/, JSON.stringify(bad));
  for (const bad of [{ give: 3 }, { give: '' }]) assert.throws(() => applyEffects(bad, s), /give without an item/, JSON.stringify(bad));
  assert.equal(Object.getPrototypeOf(s.flags), Object.prototype);
});

test('engine: fill placeholders from the context', () => {
  assert.equal(fill('今日は{lesson.title}です。', CTX), '今日は姿勢・出力・トリムです。');
  assert.equal(fill('{lesson.n} 回目、{lesson.brief.0}', CTX), '3 回目、一つ目');
  assert.equal(fill('{ これは } {x-y} {1a} 置き換えない', CTX), '{ これは } {x-y} {1a} 置き換えない');
  assert.equal(fill('{yes}', { yes: true }), 'true'); assert.equal(fill('{z}', { z: 0 }), '0');
  const missing = [];
  assert.equal(fill('[{lesson.nope}][{nothing}][{lesson}][{lesson.constructor}][{lesson.title.x}]', CTX, (p) => missing.push(p)), '[][][][][]');
  assert.deepEqual(missing, ['lesson.nope', 'nothing', 'lesson', 'lesson.constructor', 'lesson.title.x']);
  assert.equal(fill('{a}', undefined), ''); assert.equal(fill(undefined, CTX), '');
  assert.equal(getPath({ a: { b: [5, 6] } }, 'a.b.1'), 6); assert.equal(getPath({ a: null }, 'a.b'), undefined);
});

test('engine: targets — same dialog first, then dialog:node split at the first colon', () => {
  const d = DATA();
  assert.deepEqual(resolveTarget(d, 'brief', 'menu'), { dialog: 'brief', node: 'menu' });
  assert.deepEqual(resolveTarget(d, 'brief', 'ask:root'), { dialog: 'ask', node: 'root' });
  assert.deepEqual(resolveTarget(d, 'ask', 'sec:aero.lift'), { dialog: 'ask', node: 'sec:aero.lift' });
  assert.deepEqual(resolveTarget(d, 'brief', 'ask:sec:aero.lift'), { dialog: 'ask', node: 'sec:aero.lift' });
  assert.equal(resolveTarget(d, 'brief', 'end'), 'end');
  for (const bad of ['nope', 'ask:nope', 'nope:root', '', ':root', undefined, 3]) assert.equal(resolveTarget(d, 'brief', bad), null, String(bad));
});

test('engine: a first meeting, the menu, a choice with effects, the end', () => {
  const { r, state, hooks, changes } = run();
  assert.equal(r.running, false); assert.equal(r.view(), null);
  assert.equal(r.start('brief'), true);
  assert.equal(r.running, true);
  let v = r.view();
  assert.deepEqual(v, { dialog: 'brief', node: 'hello', speaker: 'instructor', name: '早瀬 教官', color: '#5cc8ff', text: 'はじめまして。', choices: [], ends: false });
  assert.equal(state.flags.met, true, 'effects apply when the node is shown');
  assert.equal(state.seen['brief:hello'], true);
  assert.equal(r.choose(0), false, 'no choices here');
  assert.equal(r.next(), true);
  v = r.view();
  assert.equal(v.node, 'menu'); assert.equal(v.text, '今日は姿勢・出力・トリムです。');
  assert.deepEqual(v.choices, [{ i: 0, text: '質問があります' }, { i: 1, text: 'ありがとうございました' }], 'hidden: the trust and done choices');
  assert.deepEqual(hooks, [['point', 'board']], 'the node hook ran when shown');
  assert.equal(r.next(), false, 'next() waits for a choice'); assert.equal(r.view().node, 'menu');
  assert.equal(r.choose(5), false); assert.equal(r.choose(-1), false); assert.equal(r.choose(1.5), false);
  assert.equal(r.choose(1), true);                                              // ありがとうございました → bye
  v = r.view();
  assert.equal(v.node, 'bye'); assert.equal(v.text, 'では駐機場で。'); assert.equal(v.ends, true);
  assert.equal(state.trust.instructor, 52); assert.equal(state.flags.done, true);
  assert.deepEqual(hooks.at(-1), ['nod', undefined]);
  assert.equal(r.next(), true);
  assert.equal(r.running, false); assert.equal(r.view(), null);
  assert.equal(r.next(), false, 'nothing to advance after the end');
  assert.deepEqual(changes.map(c => c && c.node), ['hello', 'menu', 'bye', null], 'onChange: after every change, then null');
  assert.deepEqual(Object.keys(state.seen).sort(), ['brief:bye', 'brief:hello', 'brief:menu']);
});

test('engine: later meetings skip to else; choices gated by trust and flags appear', () => {
  const state = createDialogState({ v: 1, flags: { met: true, done: true }, trust: { instructor: 52 }, items: [], seen: {} });
  const { r } = run(DATA(), state);
  r.start('brief');
  assert.equal(r.view().node, 'again', 'hello is skipped: its else');
  assert.equal(state.seen['brief:hello'], undefined, 'a skipped node is not seen');
  r.next();
  assert.deepEqual(r.view().choices.map(c => c.text), ['質問があります', '図を見せてください', '前回の続きを', 'ありがとうございました']);
  r.choose(1);
  assert.equal(r.view().node, 'fig');
  // without else, a skipped node follows its next
  const d = DATA(); delete d.dialogs.brief.nodes.hello.else;
  const b = run(d, createDialogState({ v: 1, flags: { met: true }, trust: {}, items: [], seen: {} }));
  b.r.start('brief');
  assert.equal(b.r.view().node, 'menu');
});

test('engine: jumps between dialogs and back, and node ids with colons', () => {
  const { r, hooks } = run();
  r.start('brief', 'menu');
  r.choose(0);                                                                  // 質問があります → ask:root
  let v = r.view(); assert.equal(v.dialog, 'ask'); assert.equal(v.node, 'root');
  r.choose(0);                                                                  // → sec:aero.lift (inside ask)
  v = r.view(); assert.equal(v.node, 'sec:aero.lift'); assert.equal(r.state.seen['ask:sec:aero.lift'], true);
  r.choose(0);                                                                  // 教科書で読む: book hook, back to root
  assert.deepEqual(hooks.at(-1), ['book', 'aero.lift']);
  assert.equal(r.view().node, 'root');
  r.choose(1);                                                                  // → brief:menu
  v = r.view(); assert.equal(v.dialog, 'brief'); assert.equal(v.node, 'menu');
  // start anywhere, also straight into a node whose id holds a colon
  r.start('ask', 'sec:aero.lift'); assert.equal(r.view().node, 'sec:aero.lift');
  r.start('brief', 'ask:sec:aero.lift'); assert.equal(r.view().dialog, 'ask');
  assert.throws(() => r.start('nope'), /unknown dialog/);
  assert.throws(() => r.start('brief', 'nope'), /does not exist/);
});

test('engine: stop(), onChange unsubscribe, narrator, ends, every choice hidden', () => {
  const d = DATA();
  d.dialogs.brief.nodes.n1 = { speaker: 'narrator', text: '静かな部屋。', next: 'n2' };
  d.dialogs.brief.nodes.n2 = { speaker: 'player', text: 'よろしくお願いします。', next: 'n3' };
  d.dialogs.brief.nodes.n3 = { if: { flag: 'never' }, speaker: 'instructor', text: '…', next: 'end' };
  d.dialogs.brief.nodes.n4 = { speaker: 'instructor', text: '…', choices: [{ text: 'a', next: 'end', if: { flag: 'never' } }] };
  const { r, changes } = run(d);
  r.start('brief', 'n1');
  assert.deepEqual([r.view().name, r.view().color, r.view().ends], ['', null, false]);
  r.next();
  assert.deepEqual([r.view().name, r.view().color], ['あなた', '#f2b632']);
  assert.equal(r.view().ends, true, 'n2 → n3 is skipped → end');
  r.next(); assert.equal(r.running, false);
  // a node whose choices are all hidden: no choices, ends, next() closes it
  r.start('brief', 'n4');
  assert.deepEqual(r.view().choices, []); assert.equal(r.view().ends, true);
  r.next(); assert.equal(r.running, false);
  // stop() and unsubscribe
  const seen = []; const off = r.onChange((v) => seen.push(v));
  r.start('brief', 'n1'); r.stop();
  assert.equal(r.running, false); assert.deepEqual(seen.map(v => v && v.node), ['n1', null]);
  off(); r.start('brief', 'n1'); r.stop();
  assert.equal(seen.length, 2, 'no calls after unsubscribing');
  assert.equal(changes.at(-1), null);
  // a start where everything is skipped to the end shows nothing
  assert.equal(r.start('brief', 'n3'), false); assert.equal(r.running, false);
});

test('engine: a runaway loop of skipped nodes throws a clear error instead of hanging', () => {
  const loop = { speakers: { instructor: { name_ja: '教官' } }, flags: ['x'], hooks: [], dialogs: { d: { start: 'a', nodes: {
    a: { if: { flag: 'x' }, speaker: 'instructor', text: 'a', next: 'b' },
    b: { if: { flag: 'x' }, speaker: 'instructor', text: 'b', next: 'a' },
    c: { speaker: 'instructor', text: 'c', next: 'a' },
  } } } };
  const r = createRunner({ data: loop, state: createDialogState() });
  assert.throws(() => r.start('d'), new RegExp(`more than ${MAX_HOPS} skipped nodes`));
  assert.equal(r.running, false);
  const closed = [];
  r.onChange((v) => closed.push(v));
  r.start('d', 'c');
  assert.equal(r.running, true);
  assert.throws(() => r.next(), /skipped nodes in a row/);
  assert.equal(r.running, false, 'the broken step closes the conversation'); assert.equal(closed.at(-1), null);
  // a start that fails while another conversation runs closes that one too
  r.start('d', 'c'); assert.equal(r.running, true);
  assert.throws(() => r.start('d'), /skipped nodes in a row/);
  assert.equal(r.running, false, 'the failed start closes the running conversation'); assert.equal(closed.at(-1), null);
  // a long chain within the cap is fine
  const chain = { speakers: { i: { name_ja: 'i' } }, flags: ['x'], hooks: [], dialogs: { d: { start: 'n0', nodes: {} } } };
  for (let k = 0; k < MAX_HOPS; k++) chain.dialogs.d.nodes['n' + k] = { if: { flag: 'x' }, speaker: 'i', text: 't', next: 'n' + (k + 1) };
  chain.dialogs.d.nodes['n' + MAX_HOPS] = { speaker: 'i', text: 'last', end: true };
  const c = createRunner({ data: chain, state: createDialogState() });
  c.start('d'); assert.equal(c.view().node, 'n' + MAX_HOPS);
});

test('engine: skips that cross dialogs (else into another dialog, then a skipped next back)', () => {
  const d = DATA();
  d.flags.push('x');
  d.dialogs.side = { start: 'a', nodes: {
    a: { if: { flag: 'x' }, else: 'brief:gate', speaker: 'instructor', text: 'a', next: 'end' },
    b: { speaker: 'instructor', text: 'b', end: true },
  } };
  d.dialogs.brief.nodes.gate = { if: { flag: 'x' }, speaker: 'instructor', text: 'gate', next: 'side:b' };
  const { r } = run(d);
  r.start('side');                                                              // a skipped → brief:gate skipped → side:b
  assert.deepEqual([r.view().dialog, r.view().node, r.view().ends], ['side', 'b', true]);
  assert.equal(r.state.seen['side:a'], undefined); assert.equal(r.state.seen['brief:gate'], undefined);
  const s = createDialogState({ v: 1, flags: { x: true } });
  const q = run(d, s); q.r.start('side');
  assert.equal(q.r.view().node, 'a', 'shown when its if holds');
});

test('engine: a hook that stops the talk while a node is shown', () => {
  const d = DATA();
  let r = null; const heard = [];
  r = createRunner({ data: d, state: createDialogState(), ctx: CTX, hooks: { onHook: (name) => { if (name === 'point') r.stop(); } } });
  r.onChange((v) => heard.push(v && v.node));
  assert.equal(r.start('brief', 'again'), true);
  assert.equal(r.next(), true);                                                 // → menu, whose point hook stops the talk
  assert.equal(r.running, false);
  assert.deepEqual(heard, ['again', null], 'null is heard once');
  assert.equal(r.start('brief', 'menu'), false, 'start reports that nothing is running');
  assert.deepEqual(heard, ['again', null], 'nothing was shown, so nothing to close');
});

test('engine: a context given as a function is read when needed', () => {
  let title = 'A';
  const d = DATA();
  const r = createRunner({ data: d, state: createDialogState(), ctx: () => ({ lesson: { title, place: 'x' } }) });
  r.start('brief', 'menu'); assert.equal(r.view().text, '今日はAです。');
  title = 'B'; assert.equal(r.view().text, '今日はBです。');
  // a partial state is completed in place (the caller keeps and saves that same object)
  const part = { v: 1, flags: { met: true } };
  const p = createRunner({ data: DATA(), state: part, ctx: CTX });
  assert.equal(p.state, part);
  p.start('brief'); p.next(); p.choose(1);
  assert.deepEqual(part.trust, { instructor: 52 }); assert.equal(part.seen['brief:bye'], true);
});

// ---------------------------------------------------------------- validator

const check = (d, opts = OPTS) => validateDialogs(d, opts);
// mutate a fresh copy of the good data; the validator must report an error matching `re`
function expectError(name, mutate, re) {
  const d = DATA(); mutate(d);
  const { errors } = check(d);
  assert.ok(errors.some(e => re.test(e)), `${name}: expected an error like ${re}, got ${JSON.stringify(errors)}`);
}

test('validate: the good data passes with no errors and no warnings', () => {
  const { errors, warnings } = check(DATA());
  assert.deepEqual(errors, []); assert.deepEqual(warnings, []);
  assert.deepEqual(validateDialogs(DATA(), { sampleCtx: CTX }).errors, [], 'defaults: every section and lesson exists');
});

test('validate: catches each kind of error', () => {
  const nodes = (d, id = 'brief') => d.dialogs[id].nodes;
  expectError('unknown speaker', d => { nodes(d).again.speaker = 'captain'; }, /again: unknown speaker "captain"/);
  expectError('empty text', d => { nodes(d).again.text = '  '; }, /again: empty text/);
  expectError('missing text', d => { delete nodes(d).again.text; }, /again: empty text/);
  expectError('empty choice text', d => { nodes(d).menu.choices[0].text = ''; }, /menu choice 1: empty text/);
  expectError('no way on', d => { delete nodes(d).again.next; }, /again: no way on/);
  expectError('two ways on', d => { nodes(d).again.end = true; }, /again: more than one way on/);
  expectError('next and choices', d => { nodes(d).menu.next = 'bye'; }, /menu: more than one way on/);
  expectError('missing next target', d => { nodes(d).again.next = 'menuu'; }, /again: next "menuu" does not exist/);
  expectError('missing choice target', d => { nodes(d).menu.choices[0].next = 'ask:nope'; }, /menu choice 1: next "ask:nope" does not exist/);
  expectError('missing dialog', d => { nodes(d).menu.choices[0].next = 'quiz:root'; }, /next "quiz:root" does not exist/);
  expectError('missing else target', d => { nodes(d).hello.else = 'gone'; }, /hello: else "gone" does not exist/);
  expectError('missing start', d => { d.dialogs.ask.start = 'nope'; }, /dialog ask: start "nope" is not a node/);
  expectError('unreachable node', d => { nodes(d).lost = { speaker: 'instructor', text: '…', end: true }; }, /brief:lost: cannot be reached/);
  expectError('unreachable section', d => { nodes(d, 'ask').root.choices[0].next = 'root'; nodes(d, 'ask').root.choices[0].text = 'もう一度'; }, /ask:sec:aero\.lift: cannot be reached/);
  expectError('undeclared flag read', d => { nodes(d).again.if = { flag: 'briefed' }; nodes(d).again.else = 'menu'; }, /flag "briefed" is read but not declared/);
  expectError('undeclared flag read (is)', d => { nodes(d).menu.choices[2].if = { any: [{ flag: 'x', is: 2 }] }; }, /flag "x" is read but not declared/);
  expectError('undeclared flag set', d => { nodes(d).bye.effects.push({ set: 'briefed_today' }); }, /flag "briefed_today" is set but not declared/);
  expectError('undeclared flag set by a choice', d => { nodes(d).menu.choices[0].effects = [{ set: 'asked' }]; }, /menu choice 1 effect 1: flag "asked" is set but not declared/);
  expectError('undeclared hook (node)', d => { nodes(d).again.hook = { name: 'wave' }; }, /again hook: hook "wave" is used but not declared/);
  expectError('undeclared hook (effect)', d => { nodes(d).bye.effects.push({ hook: 'shrug' }); }, /hook "shrug" is used but not declared/);
  expectError('book hook: no such section', d => { nodes(d, 'ask')['sec:aero.lift'].choices[0].effects[0].arg = 'aero.lifts'; }, /book hook: "aero\.lifts" is not a textbook section/);
  expectError('board hook: no such section', d => { nodes(d).fig.hook.arg = 'whiteboard'; }, /board hook: "whiteboard" is not a textbook section/);
  expectError('board hook: no arg', d => { delete nodes(d).fig.hook.arg; }, /board hook: .* is not a textbook section/);
  expectError('no choices', d => { nodes(d, 'ask')['sec:aero.lift'].choices = []; }, /sec:aero\.lift: 0 choices/);
  expectError('13 choices', d => { for (let i = 0; i < 9; i++) nodes(d).menu.choices.push({ text: `質問 ${i + 1}`, next: 'menu' }); }, /menu: 13 choices/);
  expectError('placeholder in a node', d => { nodes(d).again.text = '今日は{lesson.titel}です。'; }, /again: placeholder \{lesson\.titel\} does not resolve/);
  expectError('placeholder in a choice', d => { nodes(d).menu.choices[0].text = '{who}に質問'; }, /menu choice 1: placeholder \{who\} does not resolve/);
  expectError('if without else or next', d => { nodes(d).menu.if = { flag: 'met' }; }, /menu: an if node needs else or next/);
  expectError('duplicate choice texts', d => { nodes(d).menu.choices[2].text = '質問があります'; }, /menu: duplicate choice text "質問があります"/);
  // beyond the list: data that the engine would throw on
  expectError('unknown condition', d => { nodes(d).menu.choices[1].if = { trust: 'instructor', over: 3 }; }, /trust condition needs gte or lt/);
  expectError('unknown condition kind', d => { nodes(d).menu.choices[1].if = { mood: 'good' }; }, /unknown condition/);
  expectError('unknown effect', d => { nodes(d).bye.effects.push({ take: 'x' }); }, /unknown effect/);
  expectError('trust add not a number', d => { nodes(d).menu.choices[3].effects[0].add = '2'; }, /trust effect needs add as a number/);
  expectError('seen of a missing node', d => { nodes(d).menu.choices[2].if = { seen: 'brief:nope' }; }, /seen "brief:nope"/);
  expectError('ctx lesson that does not exist', d => { nodes(d).menu.choices[2].if = { ctx: 'lesson.id', is: 'z9' }; }, /lesson "z9" does not exist/);
  expectError('a node called end', d => { nodes(d).end = { speaker: 'instructor', text: '…', end: true }; nodes(d).again.next = 'menu'; }, /"end" is reserved/);
  expectError('end not true', d => { nodes(d).bye.end = 'yes'; }, /end must be true/);
  expectError('colon in a dialog id', d => { d.dialogs['a:b'] = { start: 'x', nodes: { x: { speaker: 'instructor', text: '…', end: true } } }; }, /must not contain ':'/);
  expectError('set to a value a save drops', d => { nodes(d).bye.effects[0].to = { step: 2 }; }, /effect 1: set "done" to .* what a save keeps/);
  expectError('flag compared with an object', d => { nodes(d).menu.choices[2].if = { flag: 'done', is: [1] }; }, /flag "done" is compared with/);
  expectError('ctx compared with an object', d => { nodes(d).menu.choices[2].if = { ctx: 'lesson.title', is: {} }; }, /ctx "lesson\.title" is compared with an object/);
  expectError('a reserved flag name', d => { d.flags.push('__proto__'); }, /"__proto__" is reserved/);
  // never throws, whatever it is given
  for (const junk of [null, 3, 'x', [], {}, { dialogs: { d: null } }, { dialogs: { d: { start: 'a', nodes: { a: null, b: 3 } } }, speakers: {}, flags: [], hooks: [] },
    { dialogs: { d: { start: 'a', nodes: { a: { speaker: 'x', text: 'y', choices: 'z' } } } }, speakers: {}, flags: [], hooks: [] }]) {
    const r = validateDialogs(junk);
    assert.ok(r.errors.length > 0, `junk ${JSON.stringify(junk)} reports errors`);
  }
  assert.doesNotThrow(() => validateDialogs(DATA(), null), 'null options: the defaults');
  // a sectionExists that throws counts as "no such section"
  const r = validateDialogs(DATA(), { ...OPTS, sectionExists: () => { throw new Error('x'); } });
  assert.ok(r.errors.some(e => /not a textbook section/.test(e)));
});

test('validate: warnings — a declared flag never read, a dialog that cannot end', () => {
  let d = DATA(); d.flags.push('unused');
  let r = check(d);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some(w => /flag "unused" is declared but never read/.test(w)), JSON.stringify(r.warnings));
  d = DATA();
  d.dialogs.loop = { start: 'a', nodes: { a: { speaker: 'instructor', text: 'a', next: 'b' }, b: { speaker: 'instructor', text: 'b', choices: [{ text: 'もう一度', next: 'a' }] } } };
  r = check(d);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, ['dialog loop: no end can be reached (every path loops forever)']);
  // 'ask' itself has no end node, but it reaches one through brief:menu: no warning for it
  assert.ok(!r.warnings.some(w => /dialog ask/.test(w)));
  // if-nodes whose skip ways lead round in a ring: the runner would give up after MAX_HOPS skips
  d = DATA();
  d.dialogs.brief.nodes.again.if = { flag: 'done' }; d.dialogs.brief.nodes.again.else = 'hello';
  r = check(d);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some(w => /^brief:(hello|again): if-nodes skip to each other in a ring/.test(w)), JSON.stringify(r.warnings));
  // a brace that is not a placeholder reaches the player as it is
  d = DATA(); d.dialogs.brief.nodes.again.text = '今日は{lesson title}です。';
  r = check(d);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some(w => /^brief:again: a brace that is not a/.test(w)), JSON.stringify(r.warnings));
});

test('validate: nodes reached only through another dialog count as reachable', () => {
  const d = DATA();
  d.dialogs.quiz = { start: 'q', nodes: {
    q: { speaker: 'instructor', text: '問題です。', choices: [{ text: 'はい', next: 'end' }] },
    hint: { speaker: 'instructor', text: 'ヒントです。', next: 'brief:menu' },
  } };
  let r = check(d);
  assert.ok(r.errors.some(e => /^quiz:hint: cannot be reached/.test(e)), JSON.stringify(r.errors));
  d.dialogs.ask.nodes.root.choices.push({ text: 'ヒントを', next: 'quiz:hint' });  // only 'ask' leads to it
  r = check(d);
  assert.deepEqual(r.errors, []);
});

// ---------------------------------------------------------------- save

function memory() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('save: round trip, a clean copy, clear', () => {
  const store = memory(), save = createSave(store);
  assert.equal(save.load(), null, 'nothing saved yet');
  const s = createDialogState();
  applyEffects([{ set: 'met_instructor' }, { trust: 'instructor', add: 3 }, { give: 'checklist' }], s);
  s.seen['brief:hello'] = true;
  assert.equal(save.save(s), true);
  assert.ok(store.m.has('cadet.save'));
  const back = save.load();
  assert.deepEqual(back, s); assert.notEqual(back, s);
  assert.equal(JSON.parse(store.m.get('cadet.save')).v, SAVE_VERSION);
  // the loaded state drives a runner like a fresh one
  const r = createRunner({ data: DATA(), state: back, ctx: CTX });
  r.start('brief'); assert.equal(r.view().node, 'hello', 'met is not the flag this data reads');
  assert.equal(save.clear(), true); assert.equal(save.load(), null);
  // another key
  const other = createSave(store, 'cadet.test');
  other.save(s); assert.ok(store.m.has('cadet.test')); assert.equal(save.load(), null);
});

test('save: other versions and broken data load as null; bad states are not written', () => {
  const store = memory(), save = createSave(store);
  for (const raw of ['', '{', 'null', '3', '"x"', '[]', '{}', '{"v":2,"flags":{}}', '{"v":"1"}', '{"v":1,"flags":"x"}', '{"v":1,"items":{}}', '{"v":1,"seen":[]}']) {
    store.m.set('cadet.save', raw);
    assert.equal(save.load(), null, `load ${raw}`);
  }
  store.m.set('cadet.save', '{"v":1,"flags":{"met":true,"bad":{"x":1}},"trust":{"instructor":250}}');
  assert.deepEqual(save.load(), { v: 1, flags: { met: true }, trust: { instructor: 100 }, items: [], seen: {} }, 'cleaned on load');
  store.m.set('cadet.save', 'keep');
  for (const bad of [null, undefined, {}, { v: 2, flags: {} }, { v: 1, flags: 'x' }, 'state']) assert.equal(save.save(bad), false, `save ${JSON.stringify(bad)}`);
  assert.equal(store.m.get('cadet.save'), 'keep', 'nothing written over the old data');
});

test('save: storage that is missing, blocked or full just means "not remembered"', () => {
  const s = createDialogState();
  for (const storage of [null, undefined]) {
    const save = createSave(storage);                                           // undefined → the default (none in node)
    assert.equal(save.load(), null); assert.equal(typeof save.save(s), 'boolean'); assert.doesNotThrow(() => save.clear());
  }
  const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); }, removeItem() { throw new Error('SecurityError'); } };
  const b = createSave(blocked);
  assert.equal(b.load(), null); assert.equal(b.save(s), false); assert.equal(b.clear(), false);
  const full = memory(); full.setItem = () => { throw new Error('QuotaExceededError'); };
  const f = createSave(full);
  assert.equal(f.save(s), false); assert.equal(f.load(), null);
});
