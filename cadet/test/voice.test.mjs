// CADET — voice tests (node --test): full voice (AI-instructor design §10) —
//  - the settings: voice defaults ON now, and a stored voice:false from before the change (when false was the
//    default, so it may never have been a choice) is migrated to true ONCE, marked by voiceFullMigrated; a
//    voice:false stored after that migration — the player's own switch-off — stays off;
//  - ui/voice-params.js: each speaker's pitch/rate, the neutral default for a speaker with no entry, and the
//    clamping to what SpeechSynthesisUtterance accepts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettings, DEFAULTS } from '../src/ui/settings.js';
import { VOICE_PARAMS, voiceParamsFor } from '../src/ui/voice-params.js';

const memStore = (seed) => {
  const m = new Map();
  if (seed !== undefined) m.set('cadet.settings', JSON.stringify(seed));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), map: m };
};
const stored = (store) => JSON.parse(store.map.get('cadet.settings'));

// ---------------------------------------------------------------- settings

test('voice: the default is on, and a fresh player has the migration marked done', () => {
  assert.equal(DEFAULTS.voice, true);
  const s = createSettings(DEFAULTS, memStore());
  assert.equal(s.get('voice'), true);
  assert.equal(s.get('voiceFullMigrated'), true, 'nothing to migrate, but the one-time pass has run');
});

test('voice: a stored false from before full voice (no marker) is the old default — migrated to true once', () => {
  const store = memStore({ voice: false, volume: 0.5 });
  const s = createSettings(DEFAULTS, store);
  assert.equal(s.get('voice'), true, 'treated as the old default, not a choice');
  assert.equal(s.get('voiceFullMigrated'), true);
  assert.equal(s.get('volume'), 0.5, 'the other stored values are untouched');
  assert.equal(stored(store).voice, true, 'the migration is saved, marker and all');
  assert.equal(stored(store).voiceFullMigrated, true);
});

test('voice: turned off after the migration, it stays off across loads', () => {
  const store = memStore({ voice: false });                       // pre-migration storage
  const s = createSettings(DEFAULTS, store);
  assert.equal(s.get('voice'), true, 'migrated on the first load');
  assert.equal(s.set('voice', false), true);                       // the player's own choice now
  const again = createSettings(DEFAULTS, store);
  assert.equal(again.get('voice'), false, 'the marker is stored, so no second migration');
  assert.equal(again.get('voiceFullMigrated'), true);
});

test('voice: a stored false that already carries the marker was never migrated and stays off', () => {
  const store = memStore({ voice: false, voiceFullMigrated: true });
  const s = createSettings(DEFAULTS, store);
  assert.equal(s.get('voice'), false);
  assert.equal(createSettings(DEFAULTS, store).get('voice'), false);
});

test('voice: a stored true stays true, with or without the marker', () => {
  assert.equal(createSettings(DEFAULTS, memStore({ voice: true })).get('voice'), true);
  assert.equal(createSettings(DEFAULTS, memStore({ voice: true, voiceFullMigrated: true })).get('voice'), true);
});

// ---------------------------------------------------------------- voice params

test('voice params: every speaker at their designed pitch and rate (§10.3)', () => {
  const want = {
    instructor: { pitch: 1.0, rate: 1.0 },
    chief: { pitch: 0.8, rate: 0.92 },
    examiner: { pitch: 0.7, rate: 0.85 },
    lecturer: { pitch: 1.25, rate: 1.0 },
    dispatcher: { pitch: 1.1, rate: 1.12 },
    mechanic: { pitch: 0.85, rate: 0.98 },
    controller: { pitch: 1.05, rate: 1.05 },
    kiryu: { pitch: 1.05, rate: 1.05 },
    asahi: { pitch: 1.35, rate: 1.05 },
    mori: { pitch: 1.15, rate: 1.0 },
    player: { pitch: 1.0, rate: 1.0 },
  };
  assert.deepEqual(Object.keys(VOICE_PARAMS).sort(), Object.keys(want).sort(), 'no speaker missing, none extra');
  for (const [id, p] of Object.entries(want)) assert.deepEqual(voiceParamsFor(id), p, id);
});

test('voice params: an unknown speaker gets the neutral default, and the result is a copy', () => {
  for (const id of ['narrator', 'captain', '', undefined, null, 3, 'constructor', 'toString', '__proto__'])
    assert.deepEqual(voiceParamsFor(id), { pitch: 1, rate: 1.05 }, String(id));
  const p = voiceParamsFor('chief');
  p.pitch = 9;
  assert.equal(voiceParamsFor('chief').pitch, 0.8, 'mutating a result does not touch the table');
  assert.equal(VOICE_PARAMS.chief.pitch, 0.8);
});

test('voice params: pitch is clamped to 0–2 and rate to 0.5–2, broken values fall back', () => {
  VOICE_PARAMS.__wild = { pitch: 99, rate: 0.01 };
  VOICE_PARAMS.__flat = { pitch: -3, rate: 99 };
  VOICE_PARAMS.__broken = { pitch: NaN, rate: 'fast' };
  try {
    assert.deepEqual(voiceParamsFor('__wild'), { pitch: 2, rate: 0.5 });
    assert.deepEqual(voiceParamsFor('__flat'), { pitch: 0, rate: 2 });
    assert.deepEqual(voiceParamsFor('__broken'), { pitch: 1, rate: 1.05 });
  } finally {
    delete VOICE_PARAMS.__wild; delete VOICE_PARAMS.__flat; delete VOICE_PARAMS.__broken;
  }
  // the shipped table itself is already inside the clamps
  for (const [id, p] of Object.entries(VOICE_PARAMS)) {
    assert.ok(p.pitch >= 0 && p.pitch <= 2, `${id} pitch`);
    assert.ok(p.rate >= 0.5 && p.rate <= 2, `${id} rate`);
  }
});
