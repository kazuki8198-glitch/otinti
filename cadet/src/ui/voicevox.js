// CADET — ui/voicevox.js : the VOICEVOX ENGINE's local API (http://127.0.0.1:50021), and who of the academy
// speaks in whose voice. VOICEVOX is a separate free program the player runs on their own machine; the game
// only ever talks to the engine on localhost, and only when the voice engine setting allows it (ui/voice.js
// decides that, line by line). Speaker ids differ between VOICEVOX versions and installs, so nothing here
// hardcodes an id: the cast is named (character + style), and the style id is resolved from GET /speakers
// every session. A character the player's VOICEVOX does not have falls back to another installed voice of
// the same broad class (female / male), and if there is none, resolution returns null and the caller says
// the line with the browser's voice instead — never a crash, never silence.
// Pure apart from the fetch it is handed: the tests drive it with a stub.
export const VOICEVOX_URL = 'http://127.0.0.1:50021';

// the cast: speaker id (the dialogues') → the VOICEVOX character and style, and the broad class the
// fallback stays inside. (Styles are named too: ずんだもん's あまあま for 朝日, ヒソヒソ for the cadet.)
export const VOICEVOX_CAST = {
  instructor: { name: 'ずんだもん', style: 'ノーマル', cls: 'female' },     // 早瀬 教官
  lecturer: { name: '結月ゆかり', style: 'ノーマル', cls: 'female' },       // ミラー 講師
  chief: { name: '玄野武宏', style: 'ノーマル', cls: 'male' },               // 真壁 主任教官
  examiner: { name: '青山龍星', style: 'ノーマル', cls: 'male' },           // 黒田 査察官
  dispatcher: { name: '春日部つむぎ', style: 'ノーマル', cls: 'female' },   // 佐伯 運航管理
  mechanic: { name: '白上虎太郎', style: 'ノーマル', cls: 'male' },         // 大城 整備士
  controller: { name: '波音リツ', style: 'ノーマル', cls: 'female' },       // 高嶺 管制官
  kiryu: { name: '四国めたん', style: 'ノーマル', cls: 'female' },          // 桐生
  asahi: { name: 'ずんだもん', style: 'あまあま', cls: 'female' },          // 朝日
  mori: { name: '雨晴はう', style: 'ノーマル', cls: 'female' },             // 森
  player: { name: 'ずんだもん', style: 'ヒソヒソ', cls: 'female' },        // the cadet's own lines
  captain: { name: '玄野武宏', style: 'ノーマル', cls: 'male' },            // (the line captains share one id)
};
// installed voices of each broad class, in the order the fallback prefers them (well-known VOICEVOX
// characters; an install may carry any subset, and other characters besides — the class lists only steer
// the fallback, they never gate the named cast above)
export const VOICEVOX_CLASS_NAMES = {
  female: ['ずんだもん', '結月ゆかり', '春日部つむぎ', '四国めたん', '雨晴はう', '波音リツ', '小夜/SAYO', 'ナースロボ＿タイプＴ', 'もち子さん', '冥鳴ひまり', '桜乃そら', '琴詠ニア', '東北きりたん', '東北ずん子'],
  male: ['玄野武宏', '青山龍星', '白上虎太郎', '雀松朱司', '麒ヶ島宗麟', '黒沢冴白', '栗田まろん', 'あいえるたん'],
};
// a speaker id with no cast entry of its own is cast as the instructor (the game's reference voice)
export const castFor = (id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(VOICEVOX_CAST, id) ? VOICEVOX_CAST[id] : VOICEVOX_CAST.instructor);

// the engine's speaker list, normalised: [{ name, styles: [{ name, id }] }] (the raw list also carries a
// uuid and a version per speaker, which nothing here needs)
export function normaliseSpeakers(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const s of raw) {
    if (!s || typeof s.name !== 'string' || !Array.isArray(s.styles)) continue;
    const styles = s.styles.filter(st => st && typeof st.name === 'string' && Number.isFinite(st.id)).map(st => ({ name: st.name, id: st.id }));
    if (styles.length) out.push({ name: s.name, styles });
  }
  return out;
}

// the style id a speaker id speaks with, from the normalised list: the named character and style first,
// then the named character's first style, then any installed voice of the same broad class (the class
// list's order first, then the engine's own order); null when the class has no voice installed at all
export function resolveStyleId(speakers, speakerId) {
  const cast = castFor(speakerId);
  const named = speakers.find(s => s.name === cast.name);
  if (named) {
    const st = named.styles.find(s => s.name === cast.style) || named.styles[0];
    if (st) return st.id;
  }
  const byName = new Map(speakers.map(s => [s.name, s]));
  for (const n of VOICEVOX_CLASS_NAMES[cast.cls] || []) {
    const s = byName.get(n);
    if (s) return s.styles[0].id;
  }
  return null;
}

// the engine client: probe() reads /speakers (and keeps it), synth() runs one sentence through
// /audio_query + /synthesis and hands back the WAV bytes. Every call carries a timeout: a VOICEVOX that
// is not running refuses at once, but a half-started one must not hang a line.
export function createVoicevox({ fetchImpl, baseUrl = VOICEVOX_URL, timeoutMs = 1500, synthTimeoutMs = 10000 } = {}) {
  const doFetch = fetchImpl || (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null);
  let speakers = null;                       // the last good probe's list (null: never probed successfully)
  const timed = (url, opts, ms) => {
    if (!doFetch) return Promise.reject(new Error('no fetch'));
    const c = typeof AbortController === 'function' ? new AbortController() : null;
    // the timeout always wins the race (and aborts the fetch where it can): a half-started engine
    // that never answers must not hang a line
    return Promise.race([
      doFetch(url, c ? { ...opts, signal: c.signal } : opts),
      new Promise((_, no) => setTimeout(() => { if (c) { try { c.abort(); } catch (e) { /* already gone */ } } no(new Error('timeout')); }, ms)),
    ]);
  };
  async function probe() {
    const r = await timed(`${baseUrl}/speakers`, { method: 'GET' }, timeoutMs);
    if (!r || !r.ok) throw new Error(`VOICEVOX /speakers: ${r ? r.status : 'no response'}`);
    speakers = normaliseSpeakers(await r.json());
    return speakers;
  }
  // one sentence → WAV bytes (a Blob where the response offers one, else an ArrayBuffer)
  async function synth(text, styleId, { speedScale = 1, pitchScale = 0, volumeScale = 1 } = {}) {
    const q = await timed(`${baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${styleId}`, { method: 'POST' }, synthTimeoutMs);
    if (!q || !q.ok) throw new Error(`VOICEVOX /audio_query: ${q ? q.status : 'no response'}`);
    const query = await q.json();
    query.speedScale = speedScale; query.pitchScale = pitchScale; query.volumeScale = volumeScale;
    const s = await timed(`${baseUrl}/synthesis?speaker=${styleId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query),
    }, synthTimeoutMs);
    if (!s || !s.ok) throw new Error(`VOICEVOX /synthesis: ${s ? s.status : 'no response'}`);
    return typeof s.blob === 'function' ? s.blob() : s.arrayBuffer();
  }
  return { probe, synth, get speakers() { return speakers; }, get baseUrl() { return baseUrl; } };
}
