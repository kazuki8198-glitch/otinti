// CADET — the epilogue in Node (M8): the right seat of SHOYO AIRWAYS' 737 at Haneda.
//  - the captain's talks (content/dialog/epilogue.js) pass the validator, every line has its English (and it is
//    English), no line talks about anything but the world (no game, no software), names no real airline or maker;
//  - played through: 'again' before 'meet' begins with his first words; 'meet' sets epilogue_met and ends on his nod; 'again' can stay (the talk ends, the epilogue goes
//    on), say goodbye (the hook that ends the epilogue: done 'epilogue'), or depart (done 'depart': the game acts
//    out the pushback, the taxi, the take-off and the climb — 'depart', whose lines for the air wait for the climb);
//  - the departure's choreography (epilogue/departure.js): a pose for every second — the gate, the pushback, the
//    lane, the centreline, the wheels up at the rotate speed, the climb turning out over the bay, and no end to it;
//  - the 737's model (assets/model/jet737.glb, tools/aircraft/build_737.py): one mesh, 'body', within its triangle
//    budget, the size of a 737-type airliner, its colours and baked shade in range.
// (The set itself, its draw calls and triangles in the picture: the browser test.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { epilogueDialogs, CAPTAIN, EPILOGUE_FLAGS, EPILOGUE_HOOKS } from '../src/content/dialog/epilogue.js';
import { withEnglish, missingEnglish } from '../src/content/dialog/en.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { departurePose, DEPARTURE_CUES, LIFT_OFF, ROLL_START } from '../src/epilogue/departure.js';
import { modelMeshes } from '../src/aircraft/archer-model.js';

const JA = /[ぁ-んァ-ヶ一-龯々]/;
const nodes = (data) => Object.entries(data.dialogs).flatMap(([d, dd]) => Object.entries(dd.nodes).map(([id, n]) => [`${d}:${id}`, n]));

test('epilogue: the captain\'s talks pass the validator; every line in English; nothing outside the world', () => {
  const data = epilogueDialogs();
  assert.equal(CAPTAIN.name_ja, '柏木 機長');
  assert.deepEqual(Object.keys(data.dialogs).sort(), ['again', 'depart', 'meet']);
  assert.deepEqual(data.flags, EPILOGUE_FLAGS);
  assert.deepEqual(data.hooks, EPILOGUE_HOOKS);
  const r = validateDialogs(data, {});
  assert.deepEqual(r.errors, []); assert.deepEqual(r.warnings, []);
  assert.deepEqual(missingEnglish(withEnglish(data, ['captain'])), [], 'every line of his has its English');
  for (const [id, n] of nodes(data)) {
    assert.ok(typeof n.en === 'string' && n.en.length > 4 && !JA.test(n.en), `${id}: English`);
    for (const t of [n.text, n.en, ...(n.choices || []).map(c => c.text)]) {
      assert.doesNotMatch(t, /ゲーム|ソフト|プレイ|アプリ|画面の外|\bgame\b|software|\bplay(er)?\b/i, `${id}: inside the world`);
      assert.doesNotMatch(t, /Boeing|ボーイング|Garmin|ガーミン|\bANA\b|\bJAL\b|全日空|日本航空/i, `${id}: no real airline or maker`);
    }
  }
  assert.deepEqual(validateDialogs(withEnglish(data), {}).errors, [], 'with the English mode on, still valid');
});

test('epilogue: played through — meet, then stay or say goodbye', () => {
  const hooks = [];
  const state = createDialogState();
  const run = createRunner({ data: epilogueDialogs(), state, hooks: { onHook: (name, arg) => hooks.push([name, arg ?? null]) } });
  // 'again' before his first words were heard: those first
  assert.ok(run.start('again'));
  assert.match(run.view().text, /機長の柏木です/); run.stop(); hooks.length = 0; delete state.flags.epilogue_met;
  assert.ok(run.start('meet'));
  for (let i = 0; i < 10 && run.running; i++) { const v = run.view(); if (v.choices && v.choices.length) run.choose(0); else run.next(); }
  assert.equal(run.running, false);
  assert.equal(state.flags.epilogue_met, true);
  assert.deepEqual(hooks.map(h => h[0]), ['look', 'point', 'nod']);
  // again: stay (no end hook), then goodbye (done 'epilogue')
  hooks.length = 0; run.start('again');
  assert.equal(run.view().choices.length, 3); run.choose(0);
  while (run.running) run.next();
  assert.ok(!hooks.some(h => h[0] === 'done'), 'staying does not end the epilogue');
  hooks.length = 0; run.start('again'); run.choose(2);
  while (run.running) run.next();
  assert.deepEqual(hooks.filter(h => h[0] === 'done'), [['done', 'epilogue']]);
});

test('epilogue: the departure — his word begins it; the air\'s lines wait for the climb; the last line ends it', () => {
  const hooks = [];
  const state = createDialogState();
  let phase = 'taxi';                       // (the game's word of where the aircraft is: the runner's ctx)
  const run = createRunner({ data: epilogueDialogs(), state, ctx: () => ({ epi: { phase } }), hooks: { onHook: (name, arg) => hooks.push([name, arg ?? null]) } });
  state.flags.epilogue_met = true;
  // 'again' offers the departure between staying and the goodbye; his word for it fires done 'depart' (the talk
  // then closes, and the game begins the pushback) — and not the epilogue's own end
  run.start('again');
  assert.deepEqual(run.view().choices.map(c => c.text), ['もう少し見ています', '出発を見る', 'そろそろ行きます']);
  run.choose(1);
  assert.match(run.view().text, /出発しようか/);
  assert.deepEqual(hooks.filter(h => h[0] === 'done'), [['done', 'depart']]);
  while (run.running) run.next();
  // on the ground, the chain runs to the line-up, then a holding line closes the talk — no end, no farewell yet
  hooks.length = 0; run.start('depart');
  assert.equal(run.view().node, 'd1'); run.next(); assert.equal(run.view().node, 'd2'); run.next(); assert.equal(run.view().node, 'd3');
  run.next(); assert.equal(run.view().node, 'hold');
  while (run.running) run.next();
  assert.ok(!hooks.some(h => h[0] === 'done'), 'the holding line does not end the epilogue');
  // in the climb, the same lines are the air's: airborne, then the farewell (his nod, and done 'epilogue')
  phase = 'climb'; hooks.length = 0; run.start('depart', 'd4');
  assert.equal(run.view().node, 'd4'); assert.match(run.view().text, /東京湾/);
  run.next(); assert.equal(run.view().node, 'd5'); assert.match(run.view().text, /初めて一人で飛んだ/);
  while (run.running) run.next();
  assert.deepEqual(hooks.filter(h => h[0] === 'done'), [['done', 'epilogue']]);
  // (the rank heard of at the academy colours the farewell, as it colours his first words)
  assert.match(epilogueDialogs('優等').dialogs.depart.nodes.d5.text, /優等でアカデミーを出た君だ/);
  assert.doesNotMatch(epilogueDialogs().dialogs.depart.nodes.d5.text, /優等でアカデミーを出た/);
});

test('epilogue: the departure\'s choreography — gate, pushback, taxi, the roll, the climb over the bay', () => {
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  let p = departurePose(0);
  assert.deepEqual([p.x, p.y, p.z, p.yaw, p.phase], [0, 0, 0, 0, 'pushback'], 'at the gate');
  p = departurePose(10); assert.ok(p.z > 0 && p.z < 64 && p.yaw === 0, 'half-way back, still facing the terminal');
  p = departurePose(20); assert.ok(near(p.z, 64) && p.phase === 'taxi', 'pushed back, the taxi begins');
  p = departurePose(54); assert.ok(near(p.x, 330) && near(p.z, 92) && near(p.yaw, -Math.PI / 2), 'east along the lane');
  assert.ok(Math.abs(departurePose(44).roll) < 1e-9, 'straight on the lane: no bank');
  assert.ok(departurePose(27).roll < 0 && departurePose(27).roll > -0.15, 'the turn onto the lane: a little bank, to the right');
  p = departurePose(ROLL_START);
  assert.ok(near(p.x, 330) && near(p.z, 400) && p.y === 0 && p.phase === 'roll', 'lined up on the centreline');
  assert.equal(departurePose(100).pitch, 0, 'no pitch before the rotate speed');
  assert.ok(departurePose(LIFT_OFF - 0.5).y === 0 && departurePose(LIFT_OFF - 0.5).phase === 'roll', 'on the ground until the wheels leave');
  p = departurePose(LIFT_OFF + 12);
  assert.ok(p.y > 20 && p.phase === 'climb' && Math.abs(p.pitch - 0.2) < 1e-9, 'airborne, the nose up');
  let last = -Infinity;
  for (let t = 95; t <= 170; t += 5) { const q = departurePose(t); assert.ok(q.x > last, `x grows at t=${t}`); last = q.x; }
  assert.ok(departurePose(190).z > departurePose(150).z && departurePose(190).yaw < -Math.PI / 2 - 0.5, 'the climb turns out over the bay');
  assert.ok(departurePose(154).roll < -0.1, 'banked into the climb\'s turn');
  const late = departurePose(600);
  assert.ok(late.phase === 'climb' && late.y > departurePose(300).y && Number.isFinite(late.x) && Number.isFinite(late.z), 'the climb goes on (the pose has no end)');
  assert.deepEqual(DEPARTURE_CUES.map(c => c.node), ['d1', 'd2', 'd3', 'd4', 'd5']);
  for (let i = 1; i < DEPARTURE_CUES.length; i++) assert.ok(DEPARTURE_CUES[i].at > DEPARTURE_CUES[i - 1].at, 'the cues in their order');
  assert.ok(DEPARTURE_CUES[0].at < 20 && DEPARTURE_CUES[3].at >= LIFT_OFF, 'the first line in the pushback, the airborne line once he is up');
});

test('epilogue: the 737\'s model — one mesh, its budget, its size, its colours', () => {
  const M = modelMeshes('jet737');
  assert.ok(M, 'the model is there');
  assert.deepEqual([...M.keys()], ['body']);
  const b = M.get('body'), tris = b.count / 3;
  assert.ok(tris > 5000 && tris <= 12000, `${tris} triangles`);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < b.count; i++) for (let c = 0; c < 3; c++) { const v = b.pos[i * 3 + c]; if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; }
  const size = hi.map((h, c) => h - lo[c]);
  assert.ok(size[0] > 33 && size[0] < 38, `span ${size[0].toFixed(1)} m`);
  assert.ok(size[2] > 37 && size[2] < 42, `length ${size[2].toFixed(1)} m`);
  assert.ok(size[1] > 10 && size[1] < 14, `height ${size[1].toFixed(1)} m`);
  assert.ok(lo[1] > -0.2 && lo[1] < 0.2, 'standing on its wheels at y = 0');
  for (let i = 0; i < b.count; i++) {
    assert.ok(b.ao[i] >= 0 && b.ao[i] <= 1.0001);
    for (let c = 0; c < 3; c++) assert.ok(b.col[i * 3 + c] >= 0 && b.col[i * 3 + c] <= 1.0001);
  }
});
