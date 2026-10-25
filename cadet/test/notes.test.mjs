// CADET — M8's two ways to take things away as text, in Node: the player's notes (core/notes.js: written on the
// tablet, kept in this browser only, exported with where and when) and the bench's result for README's table of
// measurements on real machines (core/bench-report.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotes, NOTES_KEY, DRAFT_KEY } from '../src/core/notes.js';
import { benchText, README_HEAD } from '../src/core/bench-report.js';

const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), map: m }; };

test('notes: written, kept in this browser, read back by a new page, exported oldest first, erased', () => {
  const store = memStore();
  let t = new Date(2026, 9, 25, 14, 3);
  const n = createNotes(store, { now: () => t });
  assert.equal(n.add('   '), null, 'nothing written');
  n.setDraft('書きかけ');
  assert.equal(createNotes(store).draft, '書きかけ', 'the draft survives a reload');
  const a = n.add('運航管理の場所がわからなかった。', '第 1 章　座学・4 月 3 日・午前・ロビー');
  assert.deepEqual([a.at, a.where], ['2026-10-25 14:03', '第 1 章　座学・4 月 3 日・午前・ロビー']);
  assert.equal(n.draft, '', 'saving clears the draft');
  t = new Date(2026, 9, 25, 15, 30);
  n.add('着陸のフレアが気持ちよかった。', '第 2 章　ソロまで・4 月 12 日・午後・駐機場（エプロン）');
  assert.deepEqual(n.list().map(x => x.text), ['着陸のフレアが気持ちよかった。', '運航管理の場所がわからなかった。'], 'newest first');
  const again = createNotes(store, { now: () => t });
  assert.equal(again.count, 2, 'a new page reads them back');
  const txt = again.exportText({ build: 'build 2026-10-25 · abc1234', ua: 'Test/1.0' });
  assert.match(txt, /^CADET の感想（build 2026-10-25 · abc1234・2 件・書き出し 2026-10-25 15:30）\nブラウザ：Test\/1\.0\n\n\[1\] 2026-10-25 14:03　第 1 章　座学・4 月 3 日・午前・ロビー\n運航管理の場所がわからなかった。\n\n\[2\] 2026-10-25 15:30/);
  assert.equal(again.remove(again.list()[0].id), true); assert.equal(createNotes(store).count, 1);
  again.clear();
  assert.equal(store.getItem(NOTES_KEY), null); assert.equal(store.getItem(DRAFT_KEY), null); assert.equal(createNotes(store).count, 0);
  // broken or blocked storage: notes for this page only
  store.setItem(NOTES_KEY, '{not json'); assert.equal(createNotes(store).count, 0);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const b = createNotes(blocked); assert.ok(b.add('メモ')); assert.equal(b.count, 1);
});

test('the bench\'s result as README\'s table: the GPU, the preset, one row a viewpoint, the heaviest named', () => {
  const r = { preset: 'high', dpr: 1, gpu: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)', views: [
    { view: 'apron', label: '駐機場（人の目線）', avgMs: 14.2, p95Ms: 19.8, calls: 210, triangles: 530000 },
    { view: 'lobby', label: 'ロビー', avgMs: 16.9, p95Ms: 24.1, calls: 280, triangles: 650000 }] };
  const t = benchText(r, { build: 'build 2026-10-25 · abc1234', ua: 'Chrome/150', date: '2026-10-25', size: '1920×1080' });
  const lines = t.split('\n');
  assert.equal(lines[0], 'CADET の計測（build 2026-10-25 · abc1234）　画面 1920×1080');
  assert.match(lines[2], /いちばん重い視点：ロビー（95% 24\.1 ms ≒ 41 fps）/);
  assert.ok(lines.includes(README_HEAD));
  assert.ok(lines.includes('| 2026-10-25 | Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0 | high ×1.00 | 駐機場（人の目線） | 14.2 | 19.8 | 70 | 210 | 530k |'), t);
  assert.equal(benchText(null), '');
});
