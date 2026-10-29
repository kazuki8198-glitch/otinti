// CADET — ui/mic.js : the browser's speech recognition (M8): for the radio, in English, and for the AI instructor's
// question field (dictation, in the game's language — see MIC_DICTATE_REASON_JA). One phrase at a time: listen()
// resolves { ok, texts: [the recognizer's guesses, best first] } or { ok: false, reason } (no recognizer here, the
// microphone not allowed, nothing heard, no network for it, …). Used only when the player turns the microphone on in
// the settings and asks for it (M, or the field's own button): until then nothing is created (in Chrome the
// recognizer may send the voice to its provider's servers to turn it into text — the settings say so). The game
// itself never needs it: 1–3 still answer the radio, and a question can always be typed.
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

// (the same failures, said for the AI instructor's question field: what is heard only fills the field — it is not
// sent until the player reads it and sends it — so the way out is the keyboard, not an answer key)
export const MIC_DICTATE_REASON_JA = {
  none: 'このブラウザでは音声認識が使えません。そのまま文字で書いてください',
  'not-allowed': 'マイクが許可されていません（アドレス欄のマイクの印から許可できます）。そのまま文字でも書けます',
  'service-not-allowed': 'このブラウザでは音声認識が許可されていません。そのまま文字で書いてください',
  'no-speech': '声が聞き取れませんでした。もう一度「声で入れる」を押して、はっきり話してください',
  'audio-capture': 'マイクが見つかりません。そのまま文字で書いてください',
  network: '音声認識がネットにつながりませんでした。そのまま文字で書いてください',
  'language-not-supported': 'この言葉の音声認識が使えません。そのまま文字で書いてください',
  aborted: '止めました',
  start: '音声認識を始められませんでした。そのまま文字で書いてください',
};

export function createMic({ win = globalThis, lang = 'en-US' } = {}) {
  const Rec = () => win.SpeechRecognition || win.webkitSpeechRecognition || null;
  let rec = null, busy = false;
  function listen({ timeoutMs = 12000, lang: langOpt } = {}) {
    const R = Rec();
    if (!R) return Promise.resolve({ ok: false, reason: 'none' });
    if (busy) stop();
    return new Promise((resolve) => {
      let done = false, timer = 0;
      const end = (r) => { if (done) return; done = true; busy = false; clearTimeout(timer); rec = null; resolve(r); };
      try {
        rec = new R();
        rec.lang = langOpt || lang; rec.interimResults = false; rec.maxAlternatives = 4; rec.continuous = false;
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
