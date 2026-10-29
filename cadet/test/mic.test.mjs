// CADET — the microphone (ui/mic.js) in Node, against a stand-in for the browser's speech recognition:
//  - nothing here: the reason is 'none', and nothing is created;
//  - what it hears: the best guess first; the language asked for is the recognizer's (the radio's English by
//    default, the game's language for the AI instructor's dictation when listen() is told one);
//  - a failure keeps its reason (the screens turn it into words: MIC_REASON_JA for the radio,
//    MIC_DICTATE_REASON_JA for the question field — every reason has words in both);
//  - stop() ends a listen at once, and what it might have heard after that never resolves as heard.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMic, MIC_REASON_JA, MIC_DICTATE_REASON_JA } from '../src/ui/mic.js';

// a stand-in recognizer: says FakeRec.say (nothing heard when it is empty), or fails with FakeRec.err
class FakeRec {
  constructor() { FakeRec.last = this; }
  start() {
    const say = FakeRec.say, err = FakeRec.err, slow = FakeRec.slow;
    setTimeout(() => {
      if (say) { if (this.onresult) this.onresult({ results: [[{ transcript: say }, { transcript: `${say}…` }]] }); }
      else if (this.onerror) this.onerror({ error: err || 'no-speech' });
      if (this.onend) this.onend();
    }, slow ? 60 : 5);
  }
  stop() {}
  abort() { if (this.onend) this.onend(); }
}
const win = () => ({ SpeechRecognition: FakeRec });
const reset = () => { FakeRec.say = ''; FakeRec.err = ''; FakeRec.slow = false; FakeRec.last = null; };

test('no recognizer in this browser: the reason, and the microphone is not available', async () => {
  const mic = createMic({ win: {} });
  assert.equal(mic.available, false);
  assert.deepEqual(await mic.listen(), { ok: false, reason: 'none' });
  assert.equal(mic.busy, false);
});

test('what it hears, best first; the language it is told, the radio\'s English by default', async () => {
  reset();
  const mic = createMic({ win: win() });
  assert.equal(mic.available, true);
  FakeRec.say = 'archer eight sierra yankee, holding short';
  const r = await mic.listen();
  assert.equal(r.ok, true);
  assert.deepEqual(r.texts, ['archer eight sierra yankee, holding short', 'archer eight sierra yankee, holding short…']);
  assert.equal(FakeRec.last.lang, 'en-US', 'the radio: English, as it was');
  assert.equal(mic.busy, false);
  // (dictation: the game's language, told per listen)
  FakeRec.say = '失速はなぜ起きるのですか';
  const d = await mic.listen({ lang: 'ja-JP' });
  assert.equal(d.ok, true); assert.equal(d.texts[0], '失速はなぜ起きるのですか');
  assert.equal(FakeRec.last.lang, 'ja-JP');
});

test('a failure keeps its reason; every reason has words for the radio and for the question field', async () => {
  reset();
  const mic = createMic({ win: win() });
  FakeRec.err = 'network';
  assert.deepEqual(await mic.listen(), { ok: false, reason: 'network' });
  FakeRec.err = 'not-allowed';
  assert.deepEqual(await mic.listen({ lang: 'ja-JP' }), { ok: false, reason: 'not-allowed' });
  assert.deepEqual(Object.keys(MIC_DICTATE_REASON_JA).sort(), Object.keys(MIC_REASON_JA).sort(), 'the same reasons, both wordings');
  for (const k of Object.keys(MIC_REASON_JA)) assert.ok(MIC_DICTATE_REASON_JA[k] && !/1〜3/.test(MIC_DICTATE_REASON_JA[k]), k);
});

test('stop() ends a listen at once: it resolves as not heard, and the microphone is free again', async () => {
  reset();
  const mic = createMic({ win: win() });
  FakeRec.say = 'too late'; FakeRec.slow = true;
  const p = mic.listen({ lang: 'ja-JP' });
  assert.equal(mic.busy, true);
  mic.stop();
  const r = await p;
  assert.equal(r.ok, false, 'a stopped listen hears nothing');
  assert.equal(mic.busy, false);
});
