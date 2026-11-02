// CADET — ui/voice.js : the ONE voice layer every spoken line goes through (the dialogue UI's lines, the
// day mode's instructor callouts and controllers, the chair flight's and the radio lessons' English, the AI
// instructor's streamed answers). It picks the engine per line:
//  - English lines always use the browser's English voice (VOICEVOX cannot speak English);
//  - Japanese lines use VOICEVOX (ui/voicevox.js: the engine on the player's own machine) when the setting
//    allows it and the engine is there, and the browser's Japanese voice otherwise — per line, so a
//    VOICEVOX that stops mid-session costs one line's fallback, not the game's voice.
// The setting (voiceEngine): 'auto' (the default: VOICEVOX when it answers, the browser when it does not),
// 'browser' (never VOICEVOX), 'voicevox' (VOICEVOX, with the browser as the fallback when it fails).
// Detection is lazy and happens at most once per session: the first Japanese line starts the probe and is
// itself said with the browser's voice, so a missing VOICEVOX adds no wait anywhere; the settings screen's
// test button is the one way to probe again. Playback is a queue, in order (the browser is handed one
// utterance at a time, so a cancel stops the line being said, not just the ones waiting); a dialog line
// interrupts what is pending, the radio's lines queue behind each other. Synthesised VOICEVOX audio is
// cached per (voice, speed, pitch, text) for the session, so a repeated line is not synthesised twice.
import { voiceParamsFor } from './voice-params.js';
import { createVoicevox, resolveStyleId } from './voicevox.js';

// a text into its sentences: 。！？… and newlines end a Japanese sentence (closers stay with it); a '.'
// ends an English one only after a word, never inside a number (118.3) — the radio's phraseology is safe.
export function sentenceEnds(s) {
  const ends = [];
  const term = (c) => c === '。' || c === '！' || c === '？' || c === '!' || c === '?' || c === '…';
  const closer = (c) => c === '」' || c === '』' || c === '）' || c === ')' || c === '】';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\n') { ends.push(i + 1); continue; }
    if (term(c)) {
      let j = i + 1;
      while (j < s.length && (term(s[j]) || closer(s[j]))) j++;
      ends.push(j); i = j - 1; continue;
    }
    if (c === '.') {
      const next = s[i + 1];
      if (next === undefined || next === ' ' || next === '　') ends.push(i + 1);   // (a digit after the dot — 118.3 — is no boundary)
    }
  }
  if (s.length && ends[ends.length - 1] !== s.length) ends.push(s.length);
  return ends;
}
export function splitSentences(text) {
  const s = String(text ?? '');
  const out = [];
  let at = 0;
  for (const e of sentenceEnds(s)) { const t = s.slice(at, e).replace(/\s+/g, ' ').trim(); if (t) out.push(t); at = e; }
  return out;
}
const endsTerminated = (s) => /[。！？!?…」』）)】]\s*$/.test(s) || /\n\s*$/.test(s);

export function createVoice({ settings = null, win = globalThis, fetchImpl = null, AudioImpl = null, voicevox = null } = {}) {
  const synth = win && win.speechSynthesis ? win.speechSynthesis : null;
  const Utt = win && typeof win.SpeechSynthesisUtterance === 'function' ? win.SpeechSynthesisUtterance : null;
  const AudioCtor = AudioImpl || (win && typeof win.Audio === 'function' ? win.Audio : (typeof globalThis.Audio === 'function' ? globalThis.Audio : null));
  const urlApi = (win && win.URL) || globalThis.URL || null;
  const vv = voicevox || createVoicevox({ fetchImpl: fetchImpl || (win && typeof win.fetch === 'function' ? win.fetch.bind(win) : undefined) });
  try { if (synth) synth.getVoices(); } catch (e) { /* starts loading the voice list */ }

  const get = (k) => (settings && typeof settings.get === 'function' ? settings.get(k) : undefined);
  const mode = () => { const m = get('voiceEngine'); return m === 'browser' || m === 'voicevox' ? m : 'auto'; };
  const volume = () => { const v = get('volume'); return typeof v === 'number' ? Math.min(1, Math.max(0, v)) : 0.8; };

  // ---- VOICEVOX detection: at most one automatic probe per session (the test button may force another)
  let vvState = 'unknown';                  // 'unknown' | 'probing' | 'ok' | 'down'
  let vvCount = 0;
  const resolutions = new Map();            // speaker id → style id | null (per probe)
  function probe(force = false) {
    if (vvState === 'probing') return null;
    if (!force && vvState !== 'unknown') return null;
    vvState = 'probing';
    return vv.probe().then((list) => { vvState = 'ok'; vvCount = list.length; resolutions.clear(); return { ok: true, count: vvCount }; },
      () => { vvState = 'down'; vvCount = 0; return { ok: false, count: 0 }; });
  }
  function styleFor(speaker) {
    if (!resolutions.has(speaker)) resolutions.set(speaker, vv.speakers ? resolveStyleId(vv.speakers, speaker) : null);
    return resolutions.get(speaker);
  }

  // ---- the playback queue. One job is said at a time; a job's player returns a stop handle, or null
  // when the job cannot start at all (no voice for it: it is simply over). done() is token-guarded, so
  // a late finish (a synthesis that lands after a cancel) can never disturb the job that replaced it.
  const queue = [];
  let current = null;                       // { token, stop() }
  let lastActivity = 0;
  const cache = new Map();                  // `${styleId}|${speed}|${pitch}|${text}` → { blob, url }
  const CACHE_MAX = 240;
  function cachePut(key, blob) {
    if (cache.size >= CACHE_MAX) { const k0 = cache.keys().next().value, old = cache.get(k0); if (old && old.url && urlApi) { try { urlApi.revokeObjectURL(old.url); } catch (e) { /* gone */ } } cache.delete(k0); }
    cache.set(key, { blob, url: null });
  }
  function pickVoice(lang) {
    if (!synth) return null;
    try {
      const vs = synth.getVoices() || [];
      if (lang === 'en') return vs.find(v => /^en(-|_)US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
      return vs.find(v => /^ja([-_]|$)/i.test(v.lang) && v.localService) || vs.find(v => /^ja([-_]|$)/i.test(v.lang)) || null;
    } catch (e) { return null; }
  }
  function playBrowser(job, done) {
    if (!synth || !Utt) return null;
    const v = pickVoice(job.lang);
    if (!v && job.requireVoice) return null;                    // (a line with no voice of its language stays silent, as before)
    if (!v && !(synth.getVoices() || []).length) return null;
    try {
      const u = new Utt(job.text);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = job.lang === 'en' ? 'en-US' : 'ja-JP';
      u.pitch = job.pitch; u.rate = job.rate;
      u.volume = Math.min(1, Math.max(0, volume() * job.volumeScale));
      let off = false;
      const fin = () => { if (off) return; off = true; done(); };
      u.onend = fin; u.onerror = fin;
      synth.speak(u);
      return { stop() { off = true; try { synth.cancel(); } catch (e) { /* nothing to stop */ } } };
    } catch (e) { return null; }
  }
  function playAudio(job, done) {
    if (!AudioCtor || !urlApi || typeof urlApi.createObjectURL !== 'function') return playBrowser(job, done);
    try {
      const hit = cache.get(job.cacheKey);
      if (!hit.url) hit.url = urlApi.createObjectURL(hit.blob);
      const a = new AudioCtor(hit.url);
      a.volume = Math.min(1, Math.max(0, volume() * job.volumeScale));
      let off = false;
      const fin = () => { if (off) return; off = true; done(); };
      a.onended = fin; a.onerror = fin;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(fin);
      return { stop() { off = true; try { a.pause(); } catch (e) { /* gone */ } } };
    } catch (e) { return playBrowser(job, done); }
  }
  function playVv(job, done, start) {
    const speed = job.rate, pitch = Math.round((job.pitch - 1) * 0.15 * 1000) / 1000;
    job.cacheKey = `${job.styleId}|${speed}|${pitch}|${job.text}`;
    if (cache.has(job.cacheKey)) { start(playAudio(job, done)); return; }
    let stopped = false, inner = null;
    vv.synth(job.text, job.styleId, { speedScale: speed, pitchScale: pitch, volumeScale: 1 }).then((blob) => {
      if (stopped) { done(); return; }
      cachePut(job.cacheKey, blob);
      inner = playAudio(job, done); start(inner);
    }, () => {
      // the engine went away mid-session: this line falls back to the browser, and later lines go
      // straight there (the settings test button is the way to look again)
      vvState = 'down';
      if (stopped) { done(); return; }
      inner = playBrowser(job, done); start(inner);
    });
    start({ stop() { stopped = true; if (inner) inner.stop(); } });
  }
  function pump() {
    if (current || !queue.length) return;
    const job = queue.shift();
    lastActivity = Date.now();
    const token = {};
    let finished = false;
    const done = () => {
      if (finished) return; finished = true;
      if (current && current.token === token) current = null;
      lastActivity = Date.now();
      pump();
    };
    const start = (handle) => { if (handle) current = { token, stop: handle.stop }; else done(); };
    // English is always the browser's; Japanese is VOICEVOX's when the setting allows and it is there
    if (job.lang !== 'en' && mode() !== 'browser') {
      if (vvState === 'unknown') probe();
      if (vvState === 'ok') {
        const styleId = styleFor(job.speaker);
        if (styleId != null) { job.styleId = styleId; playVv(job, done, start); return; }
      }
    }
    start(playBrowser(job, done));
  }
  function enqueue(job) { queue.push(job); lastActivity = Date.now(); pump(); }
  function saySentences({ speaker, text, lang, kind, pitch, rate, volumeScale }) {
    const vp = voiceParamsFor(speaker);
    for (const t of splitSentences(text)) enqueue({
      speaker, text: t, lang, kind,
      pitch: typeof pitch === 'number' ? pitch : vp.pitch,
      rate: typeof rate === 'number' ? rate : vp.rate,
      volumeScale: typeof volumeScale === 'number' ? volumeScale : 1,
      requireVoice: kind === 'line',
    });
  }

  // a line of dialogue (or an instructor's callout): by default it interrupts what is still pending —
  // the dialog's rule, that a new line replaces the one being said
  function sayLine({ speaker = 'instructor', text, lang = 'ja', interrupt = true, pitch, rate, volumeScale } = {}) {
    if (text == null || !String(text).trim()) return;
    if (interrupt) cancel();
    stream = null;
    saySentences({ speaker, text: String(text), lang, kind: 'line', pitch, rate, volumeScale });
  }
  // the radio's lines (the controllers, the pilot's readback, the ATIS): queued behind each other,
  // never interrupting; English, so always the browser's voice
  function sayRadio({ text, lang = 'en', pitch, rate, volumeScale } = {}) {
    if (text == null || !String(text).trim()) return;
    saySentences({ speaker: 'controller', text: String(text), lang, kind: 'radio', pitch, rate, volumeScale });
  }
  // a streamed line (the AI instructor's answer as it comes): each completed sentence is said as it
  // lands; the rest waits for the next piece, and `final` says whatever is left
  let stream = null;                        // { speaker, lang, said (the text already queued) }
  function sayStream({ speaker = 'instructor', text, lang = 'ja', final = false } = {}) {
    const full = String(text ?? '');
    if (!stream || stream.speaker !== speaker || stream.lang !== lang || !full.startsWith(stream.said)) {
      cancel();
      stream = { speaker, lang, said: '' };
    }
    const rest = full.slice(stream.said.length);
    if (!rest && !final) return;
    const ends = sentenceEnds(rest);
    const complete = final ? ends.length : (endsTerminated(rest) ? ends.length : Math.max(0, ends.length - 1));
    let at = 0;
    const vp = voiceParamsFor(speaker);
    for (let k = 0; k < complete; k++) {
      const t = rest.slice(at, ends[k]).replace(/\s+/g, ' ').trim();
      if (t) enqueue({ speaker, text: t, lang, kind: 'line', pitch: vp.pitch, rate: vp.rate, volumeScale: 1, requireVoice: true });
      at = ends[k];
    }
    stream.said = full.slice(0, stream.said.length + at);
    if (final) stream = null;
  }
  function cancel() {
    queue.length = 0; stream = null;
    if (current) { const c = current; current = null; try { c.stop(); } catch (e) { /* gone */ } }
    lastActivity = Date.now();
  }
  if (settings && typeof settings.onChange === 'function') settings.onChange((k, v) => { if (k === 'voice' && !v) cancel(); });

  return {
    sayLine, sayRadio, sayStream, cancel,
    busy: () => !!(current || queue.length),
    pending: () => queue.length + (current ? 1 : 0),
    lastActivityAt: () => lastActivity,
    // the settings screen's connection test: probes again (the one re-probe a session allows itself),
    // and reports whether the engine answered and how many speakers it carries
    testVoicevox: () => probe(true) || Promise.resolve({ ok: vvState === 'ok', count: vvCount }),
    voicevoxInfo: () => ({ state: vvState, count: vvCount }),
    // (the tests' window on the cache's workings)
    _cacheSize: () => cache.size,
  };
}
