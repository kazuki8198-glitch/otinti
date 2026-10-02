/*
 * YouTube の字幕（英語）を取得する。外部ライブラリなし（Node 18 以上の fetch を使用）。
 *
 * 取得方法は youtube-transcript-api (Python) 1.2 系と同じ:
 *   1. 動画ページから INNERTUBE_API_KEY を取り出す
 *   2. Innertube の player API を ANDROID クライアントとして呼び、字幕トラック一覧を得る
 *   3. 字幕トラックの baseUrl（&fmt=srv3 を外す）から XML を取得して解析
 * うまくいかない場合、yt-dlp がインストールされていればそれで再挑戦する。
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const WATCH_URL = 'https://www.youtube.com/watch?v=';
const PLAYER_URL = 'https://www.youtube.com/youtubei/v1/player?key=';
const INNERTUBE_CONTEXT = { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } };
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const ERRORS = {
  INVALID_ID: [400, 'YouTube の URL を読み取れませんでした。動画ページの URL（https://www.youtube.com/watch?v=… や https://youtu.be/…）を貼り付けてください。'],
  VIDEO_UNAVAILABLE: [404, '動画が見つかりません。非公開・削除済み、または URL が間違っている可能性があります。'],
  AGE_RESTRICTED: [403, '年齢制限のある動画のため、字幕を自動取得できません。'],
  UNPLAYABLE: [403, 'この動画は再生できない設定のため、字幕を取得できません。'],
  NO_CAPTIONS: [404, 'この動画には字幕がありません（自動生成字幕もオフになっています）。'],
  NO_ENGLISH: [404, 'この動画には英語の字幕がありません。英語で話している動画を選んでください。'],
  BLOCKED: [429, 'YouTube に「ボットでは？」と判定され、字幕を取得できませんでした。少し時間をおくか、別のネットワークで試してください。クラウドサーバーやVPN経由だと起こりやすいです。'],
  PO_TOKEN: [502, 'YouTube の仕様により、この方法では字幕を取得できませんでした。yt-dlp をインストールすると取得できる場合があります。'],
  PARSE: [502, 'YouTube の応答を読み取れませんでした（YouTube 側の仕様変更の可能性があります）。'],
  NETWORK: [502, 'YouTube に接続できませんでした。インターネット接続を確認してください。'],
};

class TranscriptError extends Error {
  constructor(code, detail, extra) {
    const def = ERRORS[code] || [500, '字幕の取得中にエラーが発生しました。'];
    super(def[1]);
    this.code = code;
    this.status = def[0];
    this.detail = detail || '';
    Object.assign(this, extra || {});
  }
}

/* ------------------------------------------------------------------ *
 * 字幕データの解析（srv1 / srv3 / json3 の3形式に対応）
 * ------------------------------------------------------------------ */
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    const v = NAMED[e.toLowerCase()];
    return v === undefined ? m : v;
  });
}

function cleanText(s) {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function parseAttrs(s) {
  const out = {};
  const re = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = m[2];
  return out;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function parseTimedText(body) {
  const t = String(body || '').trim();
  if (!t) return [];
  if (t[0] === '{') return parseJson3(JSON.parse(t));
  if (/<p\b[^>]*\bt="/.test(t)) return parseSrv3(t);
  return parseSrv1(t);
}

function parseSrv1(xml) {
  const out = [];
  const re = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(xml))) {
    const a = parseAttrs(m[1]);
    // 本文は XML としてエスケープされた上に、さらに HTML エスケープされている（&amp;#39; など）
    const text = cleanText(decodeEntities(decodeEntities(m[2])));
    if (text) out.push({ start: round3(parseFloat(a.start) || 0), dur: round3(parseFloat(a.dur) || 0), text });
  }
  return out;
}

function parseSrv3(xml) {
  const out = [];
  const re = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(xml))) {
    const a = parseAttrs(m[1]);
    const text = cleanText(decodeEntities(decodeEntities(m[2].replace(/<br\s*\/?>/g, ' '))));
    if (text) out.push({ start: round3((parseFloat(a.t) || 0) / 1000), dur: round3((parseFloat(a.d) || 0) / 1000), text });
  }
  return out;
}

function parseJson3(json) {
  const out = [];
  for (const ev of json.events || []) {
    if (!ev.segs) continue;
    const text = cleanText(ev.segs.map((s) => s.utf8 || '').join(''));
    if (text) out.push({ start: round3((ev.tStartMs || 0) / 1000), dur: round3((ev.dDurationMs || 0) / 1000), text });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 字幕トラックの選択
 * ------------------------------------------------------------------ */
function trackName(t) {
  if (!t.name) return t.languageCode;
  if (t.name.simpleText) return t.name.simpleText;
  if (t.name.runs) return t.name.runs.map((r) => r.text).join('');
  return t.languageCode;
}

/** 英語の手動字幕 > 英語の自動字幕 の順に選ぶ */
function pickEnglishTrack(tracks) {
  const isEn = (t) => /^en(\b|-|$)/i.test(t.languageCode || '');
  const score = (t) => {
    let s = 0;
    if (t.kind !== 'asr') s += 10;
    if (/^en$/i.test(t.languageCode)) s += 3;
    else if (/^en-(US|GB)$/i.test(t.languageCode)) s += 2;
    return s;
  };
  const en = tracks.filter(isEn).sort((a, b) => score(b) - score(a));
  return en[0] || null;
}

/* ------------------------------------------------------------------ *
 * 取得本体
 * ------------------------------------------------------------------ */
async function httpText(fetchImpl, url, init) {
  let res;
  try {
    res = await fetchImpl(url, init);
  } catch (e) {
    throw new TranscriptError('NETWORK', e && e.message);
  }
  if (res.status === 429) throw new TranscriptError('BLOCKED', 'HTTP 429');
  if (!res.ok) throw new TranscriptError(res.status === 404 ? 'VIDEO_UNAVAILABLE' : 'NETWORK', 'HTTP ' + res.status);
  return res.text();
}

async function fetchWatchHtml(fetchImpl, videoId) {
  const headers = { 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': USER_AGENT };
  let html = await httpText(fetchImpl, WATCH_URL + videoId, { headers });
  if (html.includes('action="https://consent.youtube.com/s"')) {
    // EU などで表示される同意画面: 同意済みクッキーを付けて取り直す
    const m = html.match(/name="v" value="(.*?)"/);
    if (!m) throw new TranscriptError('PARSE', 'consent cookie');
    html = await httpText(fetchImpl, WATCH_URL + videoId, { headers: { ...headers, Cookie: 'CONSENT=YES+' + m[1] } });
    if (html.includes('action="https://consent.youtube.com/s"')) throw new TranscriptError('PARSE', 'consent cookie');
  }
  return html;
}

function assertPlayable(status) {
  if (!status || !status.status || status.status === 'OK') return;
  const reason = status.reason || '';
  if (status.status === 'LOGIN_REQUIRED') {
    if (/not a bot/i.test(reason)) throw new TranscriptError('BLOCKED', reason);
    if (/inappropriate|age/i.test(reason)) throw new TranscriptError('AGE_RESTRICTED', reason);
  }
  if (status.status === 'ERROR' && /unavailable/i.test(reason)) throw new TranscriptError('VIDEO_UNAVAILABLE', reason);
  throw new TranscriptError('UNPLAYABLE', reason || status.status);
}

async function fetchViaInnertube(videoId, fetchImpl) {
  const html = await fetchWatchHtml(fetchImpl, videoId);
  const keyMatch = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);
  if (!keyMatch) {
    if (html.includes('class="g-recaptcha"')) throw new TranscriptError('BLOCKED', 'recaptcha');
    throw new TranscriptError('PARSE', 'INNERTUBE_API_KEY not found');
  }
  const body = await httpText(fetchImpl, PLAYER_URL + keyMatch[1], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': USER_AGENT },
    body: JSON.stringify({ context: INNERTUBE_CONTEXT, videoId }),
  });
  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    throw new TranscriptError('PARSE', 'player json');
  }
  assertPlayable(data.playabilityStatus);
  const details = data.videoDetails || {};
  const renderer = data.captions && data.captions.playerCaptionsTracklistRenderer;
  const tracks = (renderer && renderer.captionTracks) || [];
  if (!tracks.length) throw new TranscriptError('NO_CAPTIONS');
  const track = pickEnglishTrack(tracks);
  if (!track) {
    throw new TranscriptError('NO_ENGLISH', '', { available: tracks.map((t) => trackName(t) + ' (' + t.languageCode + ')') });
  }
  const url = String(track.baseUrl || '').replace('&fmt=srv3', '');
  if (!url) throw new TranscriptError('PARSE', 'baseUrl');
  if (url.includes('&exp=xpe')) throw new TranscriptError('PO_TOKEN', 'exp=xpe');
  const xml = await httpText(fetchImpl, url, { headers: { 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': USER_AGENT } });
  let segments;
  try {
    segments = parseTimedText(xml);
  } catch (e) {
    throw new TranscriptError('PARSE', 'timedtext');
  }
  if (!segments.length) throw new TranscriptError('PO_TOKEN', 'empty timedtext');
  const titleFromHtml = (html.match(/<meta name="title" content="([^"]*)"/) || [])[1];
  return {
    videoId,
    title: details.title || (titleFromHtml ? decodeEntities(titleFromHtml) : ''),
    author: details.author || '',
    lengthSeconds: parseInt(details.lengthSeconds, 10) || null,
    track: { languageCode: track.languageCode, name: trackName(track), isGenerated: track.kind === 'asr' },
    segments,
    via: 'innertube',
  };
}

/* ------------------------------------------------------------------ *
 * yt-dlp（インストールされている場合の予備手段）
 * ------------------------------------------------------------------ */
let ytDlpChecked = null;

function runCommand(cmd, args, timeoutMs) {
  return new Promise((resolve) => {
    let out = '';
    let err = '';
    let done = false;
    let child;
    try {
      child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    } catch (e) {
      resolve({ code: -1, out, err: String(e && e.message) });
      return;
    }
    const timer = setTimeout(() => {
      if (!done) child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => {
      done = true;
      clearTimeout(timer);
      resolve({ code: -1, out, err: String(e && e.message) });
    });
    child.on('close', (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ code, out, err });
    });
  });
}

async function ytDlpVersion(bin) {
  if (ytDlpChecked !== null && ytDlpChecked.bin === bin) return ytDlpChecked.version;
  const r = await runCommand(bin, ['--version'], 15000);
  const version = r.code === 0 ? r.out.trim() : '';
  ytDlpChecked = { bin, version };
  return version;
}

function subName(info, lang) {
  const list = (info.subtitles && info.subtitles[lang]) || (info.automatic_captions && info.automatic_captions[lang]) || [];
  return (list[0] && list[0].name) || lang;
}

async function fetchViaYtDlp(videoId, bin) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tubetan-'));
  try {
    const args = [
      '--skip-download', '--write-subs', '--write-auto-subs',
      // 英語の字幕だけ（"en-ja" のような他言語からの自動翻訳は除く。名前付き字幕は "en-<11文字のID>"）
      '--sub-langs', 'en,en-(?:US|GB|CA|AU|IN|IE|NZ|orig),en-[A-Za-z0-9_-]{11}', '--sub-format', 'json3',
      '--write-info-json', '--no-playlist', '--no-warnings',
      '-o', path.join(dir, '%(id)s.%(ext)s'),
      '--', WATCH_URL + videoId,
    ];
    const r = await runCommand(bin, args, 120000);
    const files = fs.readdirSync(dir);
    const infoFile = files.find((f) => f.endsWith('.info.json'));
    const subs = files
      .filter((f) => f.endsWith('.json3'))
      .map((f) => ({ file: f, lang: f.slice(0, -'.json3'.length).split('.').pop() }))
      .filter((s) => /^en/i.test(s.lang));
    if (r.code !== 0 && !infoFile && !subs.length) {
      if (/not a bot|sign in to confirm/i.test(r.err)) throw new TranscriptError('BLOCKED', 'yt-dlp: ' + r.err.slice(-300));
      if (/unavailable|private video|does not exist/i.test(r.err)) throw new TranscriptError('VIDEO_UNAVAILABLE', 'yt-dlp');
      throw new TranscriptError('PARSE', 'yt-dlp: ' + r.err.slice(-300));
    }
    const info = infoFile ? JSON.parse(fs.readFileSync(path.join(dir, infoFile), 'utf8')) : {};
    if (!subs.length) {
      const any = Object.keys(info.subtitles || {}).length + Object.keys(info.automatic_captions || {}).length;
      throw new TranscriptError(any ? 'NO_ENGLISH' : 'NO_CAPTIONS', 'yt-dlp');
    }
    // info.json が無い場合は「en / en-orig 以外＝手動字幕」とみなす
    const manual = info.subtitles ? new Set(Object.keys(info.subtitles)) : new Set(subs.map((s) => s.lang).filter((l) => l !== 'en' && l !== 'en-orig'));
    const score = (s) => (manual.has(s.lang) ? 10 : 0) + (s.lang === 'en' ? 3 : /^en-(US|GB)$/i.test(s.lang) ? 2 : s.lang === 'en-orig' ? 1 : 0);
    subs.sort((a, b) => score(b) - score(a));
    const chosen = subs[0];
    const segments = parseTimedText(fs.readFileSync(path.join(dir, chosen.file), 'utf8'));
    if (!segments.length) throw new TranscriptError('PARSE', 'yt-dlp empty');
    return {
      videoId,
      title: info.title || '',
      author: info.uploader || info.channel || '',
      lengthSeconds: info.duration ? Math.round(info.duration) : null,
      track: { languageCode: chosen.lang, name: subName(info, chosen.lang), isGenerated: !manual.has(chosen.lang) },
      segments,
      via: 'yt-dlp',
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ *
 * 公開 API
 * ------------------------------------------------------------------ */
const RETRY_WITH_YTDLP = new Set(['BLOCKED', 'PO_TOKEN', 'PARSE', 'NETWORK']);

/**
 * @param {string} videoId 11文字の動画ID
 * @param {{fetchImpl?: typeof fetch, ytDlp?: string|false}} [opts]
 */
async function fetchTranscript(videoId, opts) {
  opts = opts || {};
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '')) throw new TranscriptError('INVALID_ID');
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const ytDlpBin = opts.ytDlp === undefined ? process.env.YTDLP_PATH || 'yt-dlp' : opts.ytDlp;
  try {
    return await fetchViaInnertube(videoId, fetchImpl);
  } catch (e) {
    if (!(e instanceof TranscriptError) || !RETRY_WITH_YTDLP.has(e.code) || !ytDlpBin) throw e;
    if (!(await ytDlpVersion(ytDlpBin))) throw e;
    try {
      return await fetchViaYtDlp(videoId, ytDlpBin);
    } catch (e2) {
      if (e2 instanceof TranscriptError && !RETRY_WITH_YTDLP.has(e2.code)) throw e2;
      e.detail = (e.detail ? e.detail + ' / ' : '') + 'yt-dlp でも失敗: ' + (e2.detail || e2.message);
      throw e;
    }
  }
}

module.exports = {
  fetchTranscript,
  ytDlpVersion,
  parseTimedText,
  pickEnglishTrack,
  decodeEntities,
  TranscriptError,
  ERRORS,
  _resetYtDlpCache() {
    ytDlpChecked = null;
  },
};
