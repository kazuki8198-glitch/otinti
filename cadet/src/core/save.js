// CADET — core/save.js : the cadet's progress (the dialogue state: flags, trust, items, nodes seen) in localStorage
// ('cadet.save') when the browser allows it. Versioned (state.v === SAVE_VERSION): data of an unknown version or broken
// data loads as null, so the game starts fresh instead of half-reading it. Every storage access is guarded: a private
// window, blocked site data or a full quota just means the progress is not remembered.
// (A later version adds a step here that reads the older saves and converts them.)
import { createDialogState, isDialogState } from '../dialog/engine.js';

const defaultStorage = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };

export function createSave(storage = defaultStorage(), key = 'cadet.save') {
  return {
    // → a cleaned copy of the saved state, or null (nothing saved, another version, broken, or no storage)
    load() {
      try {
        const raw = storage && storage.getItem(key);
        if (!raw) return null;
        const o = JSON.parse(raw);
        return isDialogState(o) ? createDialogState(o) : null;
      } catch (e) { return null; }
    },
    // → true when written; a state of another version is refused rather than written over good progress
    save(state) {
      if (!storage || !isDialogState(state)) return false;
      try { storage.setItem(key, JSON.stringify(createDialogState(state))); return true; } catch (e) { return false; }
    },
    clear() {
      try { if (storage) storage.removeItem(key); return !!storage; } catch (e) { return false; }
    },
  };
}
