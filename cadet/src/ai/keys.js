// CADET — ai/keys.js : the player's own API key for the AI instructor (M8), kept apart from everything else.
// The key is the player's secret: it is never in the repository, the built page, the settings ('cadet.settings'), the
// career's save ('cadet.save', 'cadet.career') or the exported archive. It lives in memory for this page; only when the
// player asks for it to be remembered is it written to this browser's localStorage under KEY_NAME (one place, said on
// the settings screen, erased by the settings' "キーを消す" or by clearing the site's data in the browser).
// Every storage access is guarded (a private window, blocked site data).
export const KEY_NAME = 'cadet.secret.anthropic';
// what a key looks like (only checked loosely: a typo is caught by the API's own answer)
const OK = /^[\x21-\x7e]{8,300}$/;
export const looksLikeKey = (k) => typeof k === 'string' && OK.test(k.trim());
// the key shown on screen: its start and its last four characters only
export const maskKey = (k) => (looksLikeKey(k) ? `${k.trim().slice(0, 7)}…${k.trim().slice(-4)}` : '');

const defaultStorage = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };

export function createKeyStore(storage = defaultStorage()) {
  let mem = '';
  try { const v = storage && storage.getItem(KEY_NAME); if (looksLikeKey(v)) mem = v.trim(); } catch (e) { /* unreadable: none */ }
  const stored = () => { try { return !!(storage && looksLikeKey(storage.getItem(KEY_NAME))); } catch (e) { return false; } };
  return {
    get: () => mem,
    has: () => !!mem,
    // remember: also written to this browser's storage (else only for this page)
    set(k, { remember = false } = {}) {
      if (!looksLikeKey(k)) return false;
      mem = k.trim();
      try {
        if (storage) { if (remember) storage.setItem(KEY_NAME, mem); else storage.removeItem(KEY_NAME); }
      } catch (e) { /* not remembered */ }
      return true;
    },
    clear() { mem = ''; try { if (storage) storage.removeItem(KEY_NAME); } catch (e) { /* nothing there */ } },
    get remembered() { return stored(); },
    masked: () => maskKey(mem),
  };
}
