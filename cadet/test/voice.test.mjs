// CADET — the voice layer (node --test): ui/voice-params.js (each speaker's pitch and rate),
// ui/voicevox.js (the engine client: /speakers read by name, never by hardcoded id; the cast's
// resolution and its same-class fallbacks), ui/voice.js (the one layer every call site goes through:
// the per-line engine choice, the ordered queue and its cancel, the streamed answer sentence by
// sentence, the session cache), and the voiceEngine setting. No real engine exists here: fetch,
// speechSynthesis and Audio are stubs, and what they record is what is asserted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceParamsFor, VOICE_PARAMS } from '../src/ui/voice-params.js';
import { createVoicevox, normaliseSpeakers, resolveStyleId, VOICEVOX_CAST } from '../src/ui/voicevox.js';
import { createVoice, splitSentences } from '../src/ui/voice.js';
import { createSettings } from '../src/ui/settings.js';

const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
const flush = async (n = 8) => { for (let i = 0; i < n; i++) await tick(1); };

// ---- voice-params
test('voice params: the cast at their own pitch and rate; a stranger gets the neutral default', () => {
  assert.deepEqual(voiceParamsFor('chief'), { pitch: 0.8, rate: 0.92 });       // 真壁
  assert.deepEqual(voiceParamsFor('examiner'), { pitch: 0.7, rate: 0.85 });    // 黒田
  assert.deepEqual(voiceParamsFor('lecturer'), { pitch: 1.25, rate: 1.0 });    // ミラー
  assert.deepEqual(voiceParamsFor('dispatcher'), { pitch: 1.1, rate: 1.12 });  // 佐伯
  assert.deepEqual(voiceParamsFor('mechanic'), { pitch: 0.85, rate: 0.98 });   // 大城
  assert.deepEqual(voiceParamsFor('instructor'), { pitch: 1.0, rate: 1.0 });   // 早瀬
  assert.deepEqual(voiceParamsFor('no-such-person'), { pitch: 1, rate: 1.05 });
  assert.equal(VOICE_PARAMS.asahi.pitch, 1.35);
});

// ---- the VOICEVOX cast and its resolution
const SPEAKERS_RAW = [
  { name: 'ずんだもん', uuid: 'a', styles: [{ name: 'ノーマル', id: 3 }, { name: 'あまあま', id: 1 }, { name: 'ヒソヒソ', id: 22 }] },
  { name: '結月ゆかり', uuid: 'b', styles: [{ name: 'ノーマル', id: 40 }] },
  { name: '玄野武宏', uuid: 'c', styles: [{ name: 'ノーマル', id: 11 }] },
  { name: '四国めたん', uuid: 'd', styles: [{ name: 'ノーマル', id: 30 }] },
];
test('voicevox cast: every briefed character is cast by name and style', () => {
  assert.equal(VOICEVOX_CAST.instructor.name, 'ずんだもん');
  assert.equal(VOICEVOX_CAST.lecturer.name, '結月ゆかり');
  assert.equal(VOICEVOX_CAST.chief.name, '玄野武宏');
  assert.equal(VOICEVOX_CAST.examiner.name, '青山龍星');
  assert.equal(VOICEVOX_CAST.dispatcher.name, '春日部つむぎ');
  assert.equal(VOICEVOX_CAST.mechanic.name, '白上虎太郎');
  assert.equal(VOICEVOX_CAST.controller.name, '波音リツ');
  assert.equal(VOICEVOX_CAST.kiryu.name, '四国めたん');
  assert.deepEqual([VOICEVOX_CAST.asahi.name, VOICEVOX_CAST.asahi.style], ['ずんだもん', 'あまあま']);
  assert.deepEqual([VOICEVOX_CAST.mori.name, VOICEVOX_CAST.player.style], ['雨晴はう', 'ヒソヒソ']);
});
test('voicevox resolution: by name and style, from the engine’s own list (ids are the list’s, never hardcoded)', () => {
  const sp = normaliseSpeakers(SPEAKERS_RAW);
  assert.equal(resolveStyleId(sp, 'instructor'), 3);       // ずんだもん ノーマル
  assert.equal(resolveStyleId(sp, 'asahi'), 1);            // ずんだもん あまあま
  assert.equal(resolveStyleId(sp, 'player'), 22);          // ずんだもん ヒソヒソ
  assert.equal(resolveStyleId(sp, 'lecturer'), 40);        // 結月ゆかり
  assert.equal(resolveStyleId(sp, 'chief'), 11);           // 玄野武宏
  assert.equal(resolveStyleId(sp, 'kiryu'), 30);           // 四国めたん
});
test('voicevox resolution: a missing character falls back inside the broad class; an empty class gives null', () => {
  const sp = normaliseSpeakers(SPEAKERS_RAW);              // no ゆかり-less case here: examiner 青山龍星 is absent
  assert.equal(resolveStyleId(sp, 'examiner'), 11);        // → the installed male voice (玄野武宏)
  const noYukari = normaliseSpeakers(SPEAKERS_RAW.filter(s => s.name !== '結月ゆかり'));
  assert.equal(resolveStyleId(noYukari, 'lecturer'), 3);   // ミラー without ゆかり → a female voice, never silence
  const noMale = normaliseSpeakers(SPEAKERS_RAW.filter(s => s.name === 'ずんだもん'));
  assert.equal(resolveStyleId(noMale, 'chief'), null);     // no male voice installed at all → null (the browser speaks)
  assert.equal(resolveStyleId([], 'instructor'), null);
  assert.equal(resolveStyleId(sp, 'stranger'), 3);         // an uncast id is cast as the instructor
});

// ---- the engine client over a stub fetch
function vvFetch({ speakers = SPEAKERS_RAW, fail = false, hang = false, log = [] } = {}) {
  return async (url, opts = {}) => {
    log.push(String(url));
    if (fail) throw new Error('connect refused');
    if (hang) return new Promise(() => {});
    if (String(url).endsWith('/speakers')) return { ok: true, status: 200, json: async () => speakers };
    if (String(url).includes('/audio_query')) return { ok: true, status: 200, json: async () => ({ text: 'x', speedScale: 1, pitchScale: 0, volumeScale: 1 }) };
    if (String(url).includes('/synthesis')) return { ok: true, status: 200, blob: async () => ({ wav: String(url) }) };
    throw new Error('unexpected ' + url);
  };
}
test('voicevox client: probe normalises; synth runs query then synthesis with the scales set', async () => {
  const log = [];
  const vv = createVoicevox({ fetchImpl: vvFetch({ log }) });
  const list = await vv.probe();
  assert.deepEqual(list.map(s => s.name), ['ずんだもん', '結月ゆかり', '玄野武宏', '四国めたん']);
  const body = [];
  const vv2 = createVoicevox({ fetchImpl: async (url, opts = {}) => {
    if (String(url).includes('/synthesis')) { body.push(JSON.parse(opts.body)); return { ok: true, status: 200, blob: async () => ({}) }; }
    return { ok: true, status: 200, json: async () => ({ speedScale: 1, pitchScale: 0, volumeScale: 1 }) };
  } });
  await vv2.synth('テストです', 3, { speedScale: 0.92, pitchScale: -0.03, volumeScale: 1 });
  assert.equal(body[0].speedScale, 0.92); assert.equal(body[0].pitchScale, -0.03);
});
test('voicevox client: a probe that never answers times out instead of hanging', async () => {
  const vv = createVoicevox({ fetchImpl: vvFetch({ hang: true }), timeoutMs: 25 });
  await assert.rejects(vv.probe(), /timeout/);
});

// ---- the layer, over stub speech + fetch + Audio
function fakeSynth() {
  const said = [];
  let cancels = 0;
  const synth = {
    getVoices: () => [{ lang: 'ja-JP', localService: true }, { lang: 'en-US', localService: true }],
    speak(u) { said.push(u); setTimeout(() => { if (u.onend) u.onend(); }, 0); },
    cancel() { cancels++; },
  };
  class Utt { constructor(text) { this.text = text; } }
  return { synth, Utt, said, cancels: () => cancels };
}
function fakeAudio() {
  const played = [];
  class A {
    constructor(src) { this.src = src; played.push(this); }
    play() { setTimeout(() => { if (this.onended) this.onended(); }, 0); return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  return { A, played };
}
const stubSettings = (vals = {}) => ({ get: (k) => (k in vals ? vals[k] : { voice: true, volume: 0.8, voiceEngine: 'auto' }[k]), onChange: () => () => {} });
function layer({ fetchImpl, settings, voicevox } = {}) {
  const fs = fakeSynth(), fa = fakeAudio();
  const win = { speechSynthesis: fs.synth, SpeechSynthesisUtterance: fs.Utt, Audio: fa.A, URL: { createObjectURL: (b) => 'blob:fake', revokeObjectURL: () => {} } };
  const v = createVoice({ settings: settings || stubSettings(), win, fetchImpl, voicevox });
  return { v, fs, fa };
}

test('voice layer, engine off (browser setting): exactly today’s path — pitch/rate per speaker, no fetch at all', async () => {
  let fetches = 0;
  const { v, fs } = layer({ settings: stubSettings({ voiceEngine: 'browser' }), fetchImpl: async () => { fetches++; throw new Error('x'); } });
  v.sayLine({ speaker: 'chief', text: '基準を見ます。次へ進みなさい。' });
  await flush();
  assert.equal(fs.said.length, 2);                                   // sentence by sentence, in order
  assert.equal(fs.said[0].text, '基準を見ます。');
  assert.equal(fs.said[0].pitch, 0.8); assert.equal(fs.said[0].rate, 0.92);
  assert.equal(fs.said[0].volume, 0.8);
  assert.equal(fetches, 0);
  assert.deepEqual(v.voicevoxInfo(), { state: 'unknown', count: 0 });   // never even probed
});
test('voice layer: the first line starts the one probe and is said by the browser; later lines are VOICEVOX’s', async () => {
  const log = [];
  const { v, fs, fa } = layer({ fetchImpl: vvFetch({ log }) });
  v.sayLine({ speaker: 'instructor', text: '最初の行です。' });
  await flush();
  assert.equal(log.filter(u => u.endsWith('/speakers')).length, 1);  // probed once
  assert.equal(fs.said.length, 1);                                    // the first line: the browser's voice
  assert.equal(fa.played.length, 0);
  v.sayLine({ speaker: 'instructor', text: '二行目です。' });
  await flush();
  assert.equal(log.filter(u => u.endsWith('/speakers')).length, 1);  // still once — no re-probe
  assert.equal(log.filter(u => u.includes('/synthesis')).length, 1);
  assert.equal(fa.played.length, 1);                                  // the second line: VOICEVOX audio
  assert.equal(fs.said.length, 1);
  assert.deepEqual(v.voicevoxInfo(), { state: 'ok', count: 4 });
});
test('voice layer: detection failure costs nothing — every line the browser’s, the probe attempted once', async () => {
  const log = [];
  const { v, fs, fa } = layer({ fetchImpl: vvFetch({ fail: true, log }) });
  v.sayLine({ speaker: 'instructor', text: '一行目。' });
  await flush();
  v.sayLine({ speaker: 'instructor', text: '二行目。' });
  await flush();
  assert.equal(log.filter(u => u.endsWith('/speakers')).length, 1);
  assert.equal(fs.said.length, 2);
  assert.equal(fa.played.length, 0);
  assert.equal(v.voicevoxInfo().state, 'down');
  // and the settings test button is the one way to look again: it re-probes (and still fails here)
  const r = await v.testVoicevox();
  assert.deepEqual(r, { ok: false, count: 0 });
  assert.equal(log.filter(u => u.endsWith('/speakers')).length, 2);
});
test('voice layer: a hung engine times out and the line is still said at once, by the browser', async () => {
  const vv = createVoicevox({ fetchImpl: vvFetch({ hang: true }), timeoutMs: 25 });
  const { v, fs } = layer({ voicevox: vv });
  v.sayLine({ speaker: 'instructor', text: '待たせません。' });
  await flush();
  assert.equal(fs.said.length, 1);                                    // said without waiting for the probe
  await tick(60);
  assert.equal(v.voicevoxInfo().state, 'down');
});
test('voice layer: English is always the browser’s, even with VOICEVOX up', async () => {
  const log = [];
  const { v, fs, fa } = layer({ fetchImpl: vvFetch({ log }) });
  v.sayLine({ speaker: 'instructor', text: '準備して。' });
  await flush();                                                      // (probe lands)
  const synthBefore = log.filter(u => u.includes('/synthesis')).length;
  v.sayLine({ speaker: 'lecturer', text: 'Cleared for takeoff.', lang: 'en' });
  v.sayRadio({ text: 'LAB Tower, wind calm.' });
  await flush();
  assert.equal(log.filter(u => u.includes('/synthesis')).length, synthBefore);   // no VOICEVOX for English
  assert.equal(fs.said.at(-1).voice.lang, 'en-US');
  assert.equal(fa.played.length, 0);
});
test('voice layer: the queue is in order, and a cancel stops the line being said and clears the rest', async () => {
  const { v, fs } = layer({ settings: stubSettings({ voiceEngine: 'browser' }) });
  v.sayLine({ speaker: 'instructor', text: '一つ目。', interrupt: false });
  v.sayLine({ speaker: 'instructor', text: '二つ目。', interrupt: false });
  v.sayLine({ speaker: 'instructor', text: '三つ目。', interrupt: false });
  assert.equal(v.pending(), 3);
  v.cancel();
  assert.equal(v.pending(), 0);
  assert.ok(fs.cancels() >= 1);
  await flush();
  assert.equal(fs.said.length, 1);                                    // only the one already handed over was started
  // a dialog line interrupts: what is pending goes away
  v.sayLine({ speaker: 'instructor', text: '前の行。', interrupt: false });
  v.sayLine({ speaker: 'chief', text: '割り込む行。' });
  await flush();
  assert.equal(fs.said.at(-1).text, '割り込む行。');
});
test('voice layer: a repeated line is not synthesised twice (the session cache)', async () => {
  const log = [];
  const { v, fa } = layer({ fetchImpl: vvFetch({ log }) });
  v.sayLine({ speaker: 'instructor', text: '合言葉です。' });
  await flush();                                                      // probe + browser for the first line
  v.sayLine({ speaker: 'instructor', text: '同じ行です。' });
  await flush();
  v.sayLine({ speaker: 'instructor', text: '同じ行です。' });
  await flush();
  assert.equal(log.filter(u => u.includes('/synthesis')).length, 1);  // synthesised once…
  assert.equal(fa.played.length, 2);                                  // …played twice
  assert.equal(v._cacheSize(), 1);
});
test('voice layer: a VOICEVOX that dies mid-session falls back per line, then stays with the browser', async () => {
  const log = [];
  let dead = false;
  const fetchImpl = async (url, opts) => {
    if (dead) throw new Error('gone');
    return vvFetch({ log })(url, opts);
  };
  const { v, fs, fa } = layer({ fetchImpl });
  v.sayLine({ speaker: 'instructor', text: '一行目。' });
  await flush();
  dead = true;
  v.sayLine({ speaker: 'instructor', text: '二行目。' });              // synthesis fails → the browser says this line
  await flush();
  assert.equal(fs.said.at(-1).text, '二行目。');
  assert.equal(v.voicevoxInfo().state, 'down');
  const synthCalls = log.length;
  v.sayLine({ speaker: 'instructor', text: '三行目。' });              // and no further synthesis is attempted
  await flush();
  assert.equal(log.length, synthCalls);
  assert.equal(fs.said.at(-1).text, '三行目。');
  assert.equal(fa.played.length, 0);
});
test('voice layer: a streamed answer is said sentence by sentence as it lands, the rest at the end', async () => {
  const { v, fs } = layer({ settings: stubSettings({ voiceEngine: 'browser' }) });
  v.sayStream({ speaker: 'instructor', text: '一文目です。二文目はまだ途中', final: false });
  await flush();
  assert.deepEqual(fs.said.map(u => u.text), ['一文目です。']);        // only the completed sentence
  v.sayStream({ speaker: 'instructor', text: '一文目です。二文目はまだ途中です。三文目も来ました。', final: false });
  await flush();
  assert.deepEqual(fs.said.map(u => u.text), ['一文目です。', '二文目はまだ途中です。', '三文目も来ました。']);
  v.sayStream({ speaker: 'instructor', text: '一文目です。二文目はまだ途中です。三文目も来ました。最後は締め', final: true });
  await flush();
  assert.equal(fs.said.at(-1).text, '最後は締め');                     // the unterminated rest, at the end
});
test('splitSentences: Japanese terminators and closers; an English decimal is not a boundary', () => {
  assert.deepEqual(splitSentences('行きましょう。次は「確認」です！本当ですか？'), ['行きましょう。', '次は「確認」です！', '本当ですか？']);
  assert.deepEqual(splitSentences('Wind 270 at 10. Visibility 10 kilometers.'), ['Wind 270 at 10.', 'Visibility 10 kilometers.']);
  assert.deepEqual(splitSentences('118.3 に合わせます'), ['118.3 に合わせます']);
  assert.deepEqual(splitSentences(''), []);
});

// ---- the setting
test('settings: voiceEngine defaults to auto, keeps a stored choice, and refuses anything else', () => {
  const mem = (seed) => { const m = new Map(); if (seed) m.set('cadet.settings', JSON.stringify(seed)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
  assert.equal(createSettings(undefined, mem()).get('voiceEngine'), 'auto');
  assert.equal(createSettings(undefined, mem({ voiceEngine: 'voicevox' })).get('voiceEngine'), 'voicevox');
  assert.equal(createSettings(undefined, mem({ voiceEngine: 'loud' })).get('voiceEngine'), 'auto');
  const s = createSettings(undefined, mem());
  assert.equal(s.set('voiceEngine', 'browser'), true);
  assert.equal(s.get('voiceEngine'), 'browser');
  s.set('voiceEngine', 'shout');
  assert.equal(s.get('voiceEngine'), 'browser');
});
