'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

// ブラウザの localStorage を真似る（容量制限つき）
function fakeStorage(limitBytes) {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
      const total = [...data.entries()].reduce((n, [key, val]) => n + (key === k ? 0 : val.length), 0) + String(v).length;
      if (limitBytes && total > limitBytes) {
        const e = new Error('quota');
        e.name = 'QuotaExceededError';
        throw e;
      }
      data.set(k, String(v));
    },
    removeItem: (k) => data.delete(k),
    _data: data,
  };
}

globalThis.self = globalThis;
globalThis.TubeTanCore = require('../public/js/core');
globalThis.localStorage = fakeStorage();
require('../public/js/store.js');
const Store = globalThis.TubeTanStore;
const core = globalThis.TubeTanCore;

test('単語の追加・例文の統合・削除と復元', () => {
  globalThis.localStorage = fakeStorage();
  Store.init();
  const c = Store.addCard({ w: 'abandon', d: 'abandon', m: '捨てる', src: 'youtube', ex: [{ s: 'They abandon it.', hl: [5, 7], v: 'dQw4w9WgXcQ', t: 12 }] });
  assert.equal(c.srs.state, 'new');
  Store.addCard({ w: 'abandon', ex: [{ s: 'Never abandon hope.', hl: [6, 7] }, { s: 'They abandon it.' }] });
  assert.equal(Store.getCard('abandon').ex.length, 2, '同じ例文は重複させない');
  assert.equal(Store.today().a, 1);
  const saved = JSON.parse(globalThis.localStorage.getItem('tubetan:cards'));
  assert.ok(saved.abandon);
  const removed = Store.deleteCard('abandon');
  assert.ok(!Store.hasCard('abandon'));
  Store.restoreCard(removed);
  assert.ok(Store.hasCard('abandon'));
});

test('今日の出題数・新しい単語の上限・連続日数', () => {
  globalThis.localStorage = fakeStorage();
  Store.init();
  Store.saveSettings({ newPerDay: 2 });
  ['alpha', 'beta', 'gamma'].forEach((w) => Store.addCard({ w, m: 'x' }));
  let c = Store.counts();
  assert.equal(c.total, 3);
  assert.equal(c.new, 3);
  assert.equal(c.newToday, 2);
  // 1語学習する
  const card = Store.getCard('alpha');
  card.srs = core.schedule(card.srs, 0, Date.now() - 5 * core.MIN);
  Store.saveCards();
  Store.logActivity('r');
  Store.logActivity('n');
  c = Store.counts();
  assert.equal(c.learning, 1);
  assert.equal(c.due, 1, '「もう一度」は1分後に出題');
  assert.equal(c.newToday, 1);
  assert.equal(Store.streak(), 1);
  const days = Store.recentDays(14);
  assert.equal(days.length, 14);
  assert.equal(days[13].r, 1);
  // 昨日まで続いていれば今日まだでも途切れない
  const y = new Date();
  y.setDate(y.getDate() - 1);
  Store.activity = {};
  Store.activity[core.dayKey(y.getTime())] = { r: 3 };
  assert.equal(Store.streak(), 1);
});

test('バックアップの書き出しと統合読み込み', () => {
  globalThis.localStorage = fakeStorage();
  Store.init();
  Store.addCard({ w: 'one', m: '1' });
  Store.markKnownMany(['the', 'and']);
  const backup = JSON.parse(JSON.stringify(Store.exportData()));
  assert.equal(backup.app, 'TubeTan');
  assert.equal(backup.cards.length, 1);
  globalThis.localStorage = fakeStorage();
  Store.init();
  Store.addCard({ w: 'two', m: '2' });
  const r = Store.importData(backup, 'merge');
  assert.equal(r.cards, 1);
  assert.ok(Store.hasCard('one') && Store.hasCard('two'));
  assert.ok(Store.isKnown('the'));
  assert.throws(() => Store.importData({ foo: 1 }), /バックアップ/);
  Store.importData(backup, 'replace');
  assert.ok(Store.hasCard('one') && !Store.hasCard('two'));
});

test('容量が足りないときは古い履歴の本文から削る', () => {
  globalThis.localStorage = fakeStorage(60000);
  Store.init();
  const segs = Array.from({ length: 300 }, (_, i) => ({ start: i, text: 'segment number ' + i + ' with some words in it' }));
  for (let i = 0; i < 6; i++) Store.addHistory({ id: 'yt:' + i, type: 'youtube', title: 'v' + i, date: Date.now(), segments: segs });
  const stored = JSON.parse(globalThis.localStorage.getItem('tubetan:history'));
  assert.equal(stored.length, 6, '履歴の項目そのものは残す');
  assert.ok(stored[0].segments, '最新の本文は残る');
  assert.ok(!stored[5].segments, '古い本文は削除');
  assert.ok(Store.isPersistent());
});
