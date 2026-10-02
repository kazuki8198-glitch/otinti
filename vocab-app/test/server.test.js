'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const zlib = require('zlib');
const { createApp } = require('../server');

const WATCH_HTML = '<script>{"INNERTUBE_API_KEY": "AIzaTEST"}</script>';
const PLAYER = {
  playabilityStatus: { status: 'OK' },
  videoDetails: { title: 'Server Test', author: 'Ch', lengthSeconds: '10' },
  captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ baseUrl: 'https://www.youtube.com/api/timedtext?lang=en&fmt=srv3', languageCode: 'en', name: { simpleText: 'English' } }] } },
};
const SRV1 = '<transcript><text start="1" dur="2">An unprecedented opportunity</text></transcript>';

let fetchCount = 0;
async function fakeFetch(url) {
  fetchCount++;
  const u = String(url);
  const body = u.includes('/watch') ? WATCH_HTML : u.includes('/player') ? JSON.stringify(PLAYER) : SRV1;
  return { ok: true, status: 200, text: async () => body };
}

function request(port, path, headers) {
  return new Promise((resolve, reject) => {
    http.get({ port, path, headers: headers || {} }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

test('サーバー: API と静的ファイル', async (t) => {
  const handler = createApp({ fetchImpl: fakeFetch, ytDlp: false });
  const server = http.createServer((req, res) => handler(req, res));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  t.after(() => server.close());

  await t.test('health', async () => {
    const r = await request(port, '/api/health');
    assert.equal(r.status, 200);
    const j = JSON.parse(r.body);
    assert.equal(j.ok, true);
    assert.equal(j.ytDlp, null);
  });

  await t.test('transcript: URL から取得し、2回目はキャッシュを使う', async () => {
    fetchCount = 0;
    const url = encodeURIComponent('https://youtu.be/dQw4w9WgXcQ?t=42');
    const r = await request(port, '/api/transcript?url=' + url);
    assert.equal(r.status, 200);
    const j = JSON.parse(r.body);
    assert.equal(j.ok, true);
    assert.equal(j.videoId, 'dQw4w9WgXcQ');
    assert.equal(j.title, 'Server Test');
    assert.deepEqual(j.segments, [{ start: 1, dur: 2, text: 'An unprecedented opportunity' }]);
    assert.equal(fetchCount, 3);
    await request(port, '/api/transcript?v=dQw4w9WgXcQ');
    assert.equal(fetchCount, 3, 'キャッシュ済み');
  });

  await t.test('transcript: 不正な URL は 400 と日本語メッセージ', async () => {
    const r = await request(port, '/api/transcript?url=' + encodeURIComponent('https://example.com/watch?v=abc'));
    assert.equal(r.status, 400);
    const j = JSON.parse(r.body);
    assert.equal(j.ok, false);
    assert.equal(j.code, 'INVALID_ID');
    assert.match(j.message, /URL/);
  });

  await t.test('静的ファイルと gzip', async () => {
    const r = await request(port, '/', { 'Accept-Encoding': 'gzip' });
    assert.equal(r.status, 200);
    assert.equal(r.headers['content-encoding'], 'gzip');
    assert.match(r.headers['content-type'], /text\/html/);
    assert.match(zlib.gunzipSync(r.body).toString(), /<!doctype html>/i);
    const js = await request(port, '/js/core.js');
    assert.equal(js.status, 200);
    assert.match(js.headers['content-type'], /javascript/);
    const again = await request(port, '/js/core.js', { 'If-None-Match': js.headers.etag });
    assert.equal(again.status, 304);
  });

  await t.test('public の外は読めない', async () => {
    for (const p of ['/../server.js', '/%2e%2e/server.js', '/..%2fserver.js', '/js/../../package.json']) {
      const r = await request(port, p);
      assert.ok([403, 404].includes(r.status), p + ' -> ' + r.status);
      assert.ok(!r.body.toString().includes('createApp'), p);
    }
    const missing = await request(port, '/nope.html');
    assert.equal(missing.status, 404);
  });
});
