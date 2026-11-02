// CADET — the voice setting's contract (full voice, decided with the AI-instructor design): voice is ON
// by default; a voice:false stored before that was ever a choice (it was simply the old default) is
// migrated on ONCE; a voice:false stored after the migration is the player's own and stays off.
// (The play audit found this tree without the migration — the default was still false and no marker
// existed; these are the regression tests.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettings, DEFAULTS } from '../src/ui/settings.js';

const memStore = (seed) => {
  const m = new Map();
  if (seed !== undefined) m.set('cadet.settings', JSON.stringify(seed));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), map: m };
};

test('settings voice: a fresh store has the voice on', () => {
  const s = createSettings(DEFAULTS, memStore());
  assert.equal(s.get('voice'), true);
});

test('settings voice: a stored false from before the migration turns on once, and the marker is kept', () => {
  const store = memStore({ voice: false, volume: 0.5 });
  const s = createSettings(DEFAULTS, store);
  assert.equal(s.get('voice'), true, 'the old default is not a choice: migrated on');
  assert.equal(s.get('volume'), 0.5, 'nothing else is touched');
  const kept = JSON.parse(store.map.get('cadet.settings'));
  assert.equal(kept.voiceFullMigrated, true, 'the migration is recorded with the change');
  assert.equal(kept.voice, true);
});

test('settings voice: after the migration, a manual off is the player\u2019s own and persists', () => {
  const store = memStore({ voice: false });
  const s = createSettings(DEFAULTS, store);
  assert.equal(s.get('voice'), true, 'migrated on, once');
  s.set('voice', false);
  const again = createSettings(DEFAULTS, store);
  assert.equal(again.get('voice'), false, 'the marker is stored: off stays off');
});

test('settings voice: a store that already carries the marker is never migrated', () => {
  const s = createSettings(DEFAULTS, memStore({ voice: false, voiceFullMigrated: true }));
  assert.equal(s.get('voice'), false);
});
