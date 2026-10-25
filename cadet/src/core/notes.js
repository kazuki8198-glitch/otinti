// CADET — core/notes.js : what a player noticed while playing (M8: the first players' feedback), written on the tablet
// (感想). Kept in this browser's localStorage ('cadet.notes': the notes; 'cadet.notes.draft': the one being written),
// never sent anywhere; taken away as text (exportText) to hand to whoever made the game. Every storage access is
// guarded: a private window or blocked site data just means the notes last as long as the page. Pure (no DOM).
export const NOTES_KEY = 'cadet.notes', DRAFT_KEY = 'cadet.notes.draft', NOTE_MAX = 2000, NOTES_MAX = 200;
const defaultStorage = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };

export function createNotes(storage = defaultStorage(), { now = () => new Date() } = {}) {
  let notes = [], draft = '', seq = 0;
  try {
    const o = JSON.parse((storage && storage.getItem(NOTES_KEY)) || '[]');
    if (Array.isArray(o)) notes = o.filter(n => n && typeof n.text === 'string' && typeof n.at === 'string').map(n => ({ id: String(n.id || ''), at: n.at, where: String(n.where || ''), text: n.text.slice(0, NOTE_MAX) })).slice(-NOTES_MAX);
    const d = storage && storage.getItem(DRAFT_KEY); if (typeof d === 'string') draft = d.slice(0, NOTE_MAX);
  } catch (e) { notes = []; }
  for (const n of notes) { const k = +String(n.id).replace(/^n/, ''); if (k > seq) seq = k; if (!n.id) n.id = `n${++seq}`; }
  const save = () => { try { if (storage) storage.setItem(NOTES_KEY, JSON.stringify(notes)); return true; } catch (e) { return false; } };
  const stamp = (d) => { const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  return {
    list: () => notes.slice().reverse(),                    // newest first
    get count() { return notes.length; },
    // → the note, or null (nothing written)
    add(text, where = '') {
      const t = String(text || '').trim().slice(0, NOTE_MAX);
      if (!t) return null;
      const n = { id: `n${++seq}`, at: stamp(now()), where: String(where).slice(0, 200), text: t };
      notes.push(n); if (notes.length > NOTES_MAX) notes.shift();
      save(); this.setDraft('');
      return n;
    },
    remove(id) { const k = notes.findIndex(n => n.id === id); if (k < 0) return false; notes.splice(k, 1); save(); return true; },
    clear() { notes = []; try { if (storage) { storage.removeItem(NOTES_KEY); storage.removeItem(DRAFT_KEY); } } catch (e) { /* nothing there */ } draft = ''; },
    get draft() { return draft; },
    setDraft(t) { draft = String(t || '').slice(0, NOTE_MAX); try { if (storage) { if (draft) storage.setItem(DRAFT_KEY, draft); else storage.removeItem(DRAFT_KEY); } } catch (e) { /* not kept */ } },
    // all of them as text, oldest first (to paste into a message)
    exportText({ build = '', ua = '' } = {}) {
      const head = [`CADET の感想（${build || 'build ?'}・${notes.length} 件・書き出し ${stamp(now())}）`, ua ? `ブラウザ：${String(ua).slice(0, 160)}` : ''].filter(Boolean);
      return [...head, '', ...notes.map((n, i) => `[${i + 1}] ${n.at}　${n.where}\n${n.text}\n`)].join('\n').trim() + '\n';
    },
  };
}
