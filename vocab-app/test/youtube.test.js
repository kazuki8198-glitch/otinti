'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const yt = require('../lib/youtube');

const VID = 'dQw4w9WgXcQ';
const WATCH_HTML = `<html><head><meta name="title" content="Test &amp; Video"></head><body><script>var cfg = {"INNERTUBE_API_KEY": "AIzaFAKEKEY_123","X":1};</script></body></html>`;
const SRV1 = `<?xml version="1.0" encoding="utf-8" ?><transcript><text start="0.5" dur="2.1">Hello &amp;amp; welcome</text><text start="2.6" dur="1.5">It&amp;#39;s a &lt;font color=&quot;#E5E5E5&quot;&gt;test&lt;/font&gt;</text><text start="4" dur="1"></text></transcript>`;

function player(overrides) {
  return {
    playabilityStatus: { status: 'OK' },
    videoDetails: { title: 'Real Title', author: 'Some Channel', lengthSeconds: '212' },
    captions: {
      playerCaptionsTracklistRenderer: {
        captionTracks: [
          { baseUrl: 'https://www.youtube.com/api/timedtext?v=x&lang=ja&fmt=srv3', languageCode: 'ja', name: { runs: [{ text: 'Japanese' }] } },
          { baseUrl: 'https://www.youtube.com/api/timedtext?v=x&lang=en&kind=asr&fmt=srv3', languageCode: 'en', kind: 'asr', name: { runs: [{ text: 'English (auto-generated)' }] } },
          { baseUrl: 'https://www.youtube.com/api/timedtext?v=x&lang=en-GB&fmt=srv3', languageCode: 'en-GB', name: { runs: [{ text: 'English (United Kingdom)' }] } },
        ],
      },
    },
    ...overrides,
  };
}

/** URL ごとに応答を返す偽の fetch。呼び出し履歴も記録する。 */
function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: String(url), init: init || {} });
    for (const [prefix, handler] of routes) {
      if (String(url).startsWith(prefix)) {
        const r = typeof handler === 'function' ? handler(String(url), init || {}, calls) : handler;
        const body = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
        return { ok: (r.status || 200) < 400, status: r.status || 200, text: async () => body };
      }
    }
    throw new Error('unexpected url ' + url);
  };
  fn.calls = calls;
  return fn;
}

function standardRoutes(playerJson, timedtext) {
  return [
    ['https://www.youtube.com/watch', { body: WATCH_HTML }],
    ['https://www.youtube.com/youtubei/v1/player', { body: playerJson }],
    ['https://www.youtube.com/api/timedtext', { body: timedtext === undefined ? SRV1 : timedtext }],
  ];
}

test('英語の手動字幕を優先して取得し、本文をデコードする', async () => {
  const f = fakeFetch(standardRoutes(player()));
  const t = await yt.fetchTranscript(VID, { fetchImpl: f, ytDlp: false });
  assert.equal(t.title, 'Real Title');
  assert.equal(t.author, 'Some Channel');
  assert.equal(t.lengthSeconds, 212);
  assert.deepEqual(t.track, { languageCode: 'en-GB', name: 'English (United Kingdom)', isGenerated: false });
  assert.deepEqual(t.segments, [
    { start: 0.5, dur: 2.1, text: 'Hello & welcome' },
    { start: 2.6, dur: 1.5, text: "It's a test" },
  ]);
  const playerCall = f.calls.find((c) => c.url.includes('/player'));
  assert.ok(playerCall.url.endsWith('key=AIzaFAKEKEY_123'));
  assert.deepEqual(JSON.parse(playerCall.init.body).context.client.clientName, 'ANDROID');
  const ttCall = f.calls.find((c) => c.url.includes('timedtext'));
  assert.ok(ttCall.url.includes('lang=en-GB'));
  assert.ok(!ttCall.url.includes('fmt=srv3'), 'fmt=srv3 は外す');
});

test('手動字幕がなければ自動生成字幕を使う', async () => {
  const p = player();
  p.captions.playerCaptionsTracklistRenderer.captionTracks.pop();
  const t = await yt.fetchTranscript(VID, { fetchImpl: fakeFetch(standardRoutes(p)), ytDlp: false });
  assert.equal(t.track.languageCode, 'en');
  assert.equal(t.track.isGenerated, true);
});

test('EU の同意画面ではクッキーを付けて取り直す', async () => {
  let n = 0;
  const f = fakeFetch([
    ['https://www.youtube.com/watch', (url, init) => {
      n++;
      if (n === 1) return { body: '<form action="https://consent.youtube.com/s"><input name="v" value="cb.2021-p0.en+FX+417"></form>' };
      assert.equal(init.headers.Cookie, 'CONSENT=YES+cb.2021-p0.en+FX+417');
      return { body: WATCH_HTML };
    }],
    ...standardRoutes(player()).slice(1),
  ]);
  const t = await yt.fetchTranscript(VID, { fetchImpl: f, ytDlp: false });
  assert.equal(n, 2);
  assert.equal(t.segments.length, 2);
});

test('ボット判定・字幕なし・英語なし・年齢制限・PO トークンをエラーコードで返す', async () => {
  const cases = [
    [{ playabilityStatus: { status: 'LOGIN_REQUIRED', reason: 'Sign in to confirm you’re not a bot' } }, 'BLOCKED', 429],
    [{ playabilityStatus: { status: 'LOGIN_REQUIRED', reason: 'This video may be inappropriate for some users.' } }, 'AGE_RESTRICTED', 403],
    [{ playabilityStatus: { status: 'ERROR', reason: 'This video is unavailable' } }, 'VIDEO_UNAVAILABLE', 404],
    [{ captions: undefined }, 'NO_CAPTIONS', 404],
    [{ captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ baseUrl: 'https://www.youtube.com/api/timedtext?lang=ja', languageCode: 'ja', name: { simpleText: 'Japanese' } }] } } }, 'NO_ENGLISH', 404],
    [{ captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ baseUrl: 'https://www.youtube.com/api/timedtext?lang=en&exp=xpe', languageCode: 'en' }] } } }, 'PO_TOKEN', 502],
  ];
  for (const [over, code, status] of cases) {
    await assert.rejects(
      yt.fetchTranscript(VID, { fetchImpl: fakeFetch(standardRoutes(player(over))), ytDlp: false }),
      (e) => {
        assert.equal(e.code, code);
        assert.equal(e.status, status);
        assert.ok(/[ぁ-んァ-ン]/.test(e.message), '日本語のメッセージ');
        if (code === 'NO_ENGLISH') assert.deepEqual(e.available, ['Japanese (ja)']);
        return true;
      },
    );
  }
});

test('字幕本文が空なら PO_TOKEN、reCAPTCHA なら BLOCKED、不正な ID は INVALID_ID', async () => {
  await assert.rejects(yt.fetchTranscript(VID, { fetchImpl: fakeFetch(standardRoutes(player(), '')), ytDlp: false }), { code: 'PO_TOKEN' });
  const captcha = fakeFetch([['https://www.youtube.com/watch', { body: '<div class="g-recaptcha"></div>' }]]);
  await assert.rejects(yt.fetchTranscript(VID, { fetchImpl: captcha, ytDlp: false }), { code: 'BLOCKED' });
  await assert.rejects(yt.fetchTranscript('not-an-id', { fetchImpl: captcha, ytDlp: false }), { code: 'INVALID_ID' });
  const down = async () => { throw new Error('ECONNREFUSED'); };
  await assert.rejects(yt.fetchTranscript(VID, { fetchImpl: down, ytDlp: false }), { code: 'NETWORK' });
});

test('srv3 / json3 形式も読める', () => {
  const srv3 = '<?xml version="1.0" encoding="utf-8" ?><timedtext format="3"><body><p t="1200" d="2500">Hello <s t="300">world</s></p><p t="4000" d="10"></p><p t="5000" d="900">it&#39;s<br/>fine</p></body></timedtext>';
  assert.deepEqual(yt.parseTimedText(srv3), [
    { start: 1.2, dur: 2.5, text: 'Hello world' },
    { start: 5, dur: 0.9, text: "it's fine" },
  ]);
  const json3 = JSON.stringify({ events: [{ tStartMs: 0, dDurationMs: 1000 }, { tStartMs: 1500, dDurationMs: 2000, segs: [{ utf8: 'so ' }, { utf8: 'today' }] }, { tStartMs: 3600, segs: [{ utf8: '\n' }] }] });
  assert.deepEqual(yt.parseTimedText(json3), [{ start: 1.5, dur: 2, text: 'so today' }]);
});

test('ブロックされたら yt-dlp（あれば）で取り直す', { skip: process.platform === 'win32' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-ytdlp-'));
  const bin = path.join(dir, 'yt-dlp');
  fs.writeFileSync(bin, `#!${process.execPath}
const fs = require('fs'); const path = require('path');
const args = process.argv.slice(2);
if (args[0] === '--version') { console.log('2026.09.01'); process.exit(0); }
const out = args[args.indexOf('-o') + 1];
const id = args[args.length - 1].split('v=')[1];
const base = out.replace('%(id)s.%(ext)s', id);
fs.writeFileSync(base + '.info.json', JSON.stringify({ title: 'From yt-dlp', uploader: 'Uploader', duration: 61.4, subtitles: {}, automatic_captions: { en: [] } }));
fs.writeFileSync(base + '.en.json3', JSON.stringify({ events: [{ tStartMs: 1000, dDurationMs: 900, segs: [{ utf8: 'fallback works' }] }] }));
`);
  fs.chmodSync(bin, 0o755);
  yt._resetYtDlpCache();
  try {
    const blocked = player({ playabilityStatus: { status: 'LOGIN_REQUIRED', reason: 'Sign in to confirm you’re not a bot' } });
    const t = await yt.fetchTranscript(VID, { fetchImpl: fakeFetch(standardRoutes(blocked)), ytDlp: bin });
    assert.equal(t.via, 'yt-dlp');
    assert.equal(t.title, 'From yt-dlp');
    assert.equal(t.lengthSeconds, 61);
    assert.deepEqual(t.track, { languageCode: 'en', name: 'en', isGenerated: true });
    assert.deepEqual(t.segments, [{ start: 1, dur: 0.9, text: 'fallback works' }]);
    // 字幕が無い動画のエラー（NO_CAPTIONS）は yt-dlp を試さずにそのまま返す
    await assert.rejects(
      yt.fetchTranscript(VID, { fetchImpl: fakeFetch(standardRoutes(player({ captions: undefined }))), ytDlp: bin }),
      { code: 'NO_CAPTIONS' },
    );
  } finally {
    yt._resetYtDlpCache();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('yt-dlp が無ければ元のエラーを返す', async () => {
  yt._resetYtDlpCache();
  const blocked = player({ playabilityStatus: { status: 'LOGIN_REQUIRED', reason: 'Sign in to confirm you’re not a bot' } });
  await assert.rejects(
    yt.fetchTranscript(VID, { fetchImpl: fakeFetch(standardRoutes(blocked)), ytDlp: '/nonexistent/yt-dlp-binary' }),
    { code: 'BLOCKED' },
  );
  yt._resetYtDlpCache();
});
