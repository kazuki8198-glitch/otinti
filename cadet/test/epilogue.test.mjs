// CADET — the epilogue in Node (M8): the right seat of SHOYO AIRWAYS' 737 at Haneda.
//  - the captain's talks (content/dialog/epilogue.js) pass the validator, every line has its English (and it is
//    English), no line talks about anything but the world (no game, no software), names no real airline or maker;
//  - played through: 'again' before 'meet' begins with his first words; 'meet' sets epilogue_met and ends on his nod; 'again' can stay (the talk ends, the epilogue goes
//    on) or say goodbye (the hook that ends the epilogue: done 'epilogue');
//  - the 737's model (assets/model/jet737.glb, tools/aircraft/build_737.py): one mesh, 'body', within its triangle
//    budget, the size of a 737-type airliner, its colours and baked shade in range.
// (The set itself, its draw calls and triangles in the picture: the browser test.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { epilogueDialogs, CAPTAIN, EPILOGUE_FLAGS, EPILOGUE_HOOKS } from '../src/content/dialog/epilogue.js';
import { withEnglish, missingEnglish } from '../src/content/dialog/en.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { modelMeshes } from '../src/aircraft/archer-model.js';

const JA = /[ぁ-んァ-ヶ一-龯々]/;
const nodes = (data) => Object.entries(data.dialogs).flatMap(([d, dd]) => Object.entries(dd.nodes).map(([id, n]) => [`${d}:${id}`, n]));

test('epilogue: the captain\'s talks pass the validator; every line in English; nothing outside the world', () => {
  const data = epilogueDialogs();
  assert.equal(CAPTAIN.name_ja, '柏木 機長');
  assert.deepEqual(Object.keys(data.dialogs).sort(), ['again', 'meet']);
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
  assert.equal(run.view().choices.length, 2); run.choose(0);
  while (run.running) run.next();
  assert.ok(!hooks.some(h => h[0] === 'done'), 'staying does not end the epilogue');
  hooks.length = 0; run.start('again'); run.choose(1);
  while (run.running) run.next();
  assert.deepEqual(hooks.filter(h => h[0] === 'done'), [['done', 'epilogue']]);
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
