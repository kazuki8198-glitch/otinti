// CADET — ui/mic.js : the browser's speech recognition for the radio (M8), in English. One phrase at a time: listen()
// resolves { ok, texts: [the recognizer's guesses, best first] } or { ok: false, reason } (no recognizer here, the
// microphone not allowed, nothing heard, no network for it, …). Used only when the player turns the microphone on in
// the settings and presses M: until then nothing is created (in Chrome the recognizer may send the voice to its
// provider's servers to turn it into text — the settings say so). The game itself never needs it: 1–3 still answer.
export const MIC_REASON_JA = {
  none: 'このブラウザでは音声認識が使えません。1〜3 キーで答えてください',
  'not-allowed': 'マイクが許可されていません（アドレス欄のマイクの印から許可できます）。1〜3 キーでも答えられます',
  'service-not-allowed': 'このブラウザでは音声認識が許可されていません。1〜3 キーで答えてください',
  'no-speech': '声が聞き取れませんでした。もう一度 M を押して、はっきり英語で',
  'audio-capture': 'マイクが見つかりません。1〜3 キーで答えてください',
  network: '音声認識がネットにつながりませんでした。1〜3 キーで答えてください',
  'language-not-supported': '英語の音声認識が使えません。1〜3 キーで答えてください',
  aborted: '止めました',
  start: '音声認識を始められませんでした。1〜3 キーで答えてください',
};

export function createMic({ win = globalThis, lang = 'en-US' } = {}) {
  const Rec = () => win.SpeechRecognition || win.webkitSpeechRecognition || null;
  let rec = null, busy = false;
  function listen({ timeoutMs = 12000 } = {}) {
    const R = Rec();
    if (!R) return Promise.resolve({ ok: false, reason: 'none' });
    if (busy) stop();
    return new Promise((resolve) => {
      let done = false, timer = 0;
      const end = (r) => { if (done) return; done = true; busy = false; clearTimeout(timer); rec = null; resolve(r); };
      try {
        rec = new R();
        rec.lang = lang; rec.interimResults = false; rec.maxAlternatives = 4; rec.continuous = false;
        rec.onresult = (e) => {
          const res = e.results && e.results[0];
          const texts = []; if (res) for (let k = 0; k < res.length; k++) if (res[k] && res[k].transcript) texts.push(String(res[k].transcript));
          end(texts.length ? { ok: true, texts } : { ok: false, reason: 'no-speech' });
        };
        rec.onerror = (e) => end({ ok: false, reason: (e && e.error) || 'no-speech' });
        rec.onend = () => end({ ok: false, reason: 'no-speech' });
        busy = true;
        rec.start();
        timer = setTimeout(() => { try { if (rec) rec.stop(); } catch (e) { /* gone */ } }, timeoutMs);
      } catch (e) { end({ ok: false, reason: 'start' }); }
    });
  }
  function stop() { try { if (rec) rec.abort(); } catch (e) { /* gone */ } }
  return { listen, stop, get available() { return !!Rec(); }, get busy() { return busy; } };
}
