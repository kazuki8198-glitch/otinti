#!/usr/bin/env node
/*
 * TubeTan のローカルサーバー（外部ライブラリなし / Node.js 18 以上）
 *
 *   node server.js            → http://localhost:3000 で起動（このPCからのみ）
 *   node server.js --lan      → 同じWi-Fiのスマホからも開けるようにする
 *   node server.js --open     → 起動後にブラウザを開く
 *   PORT=8080 node server.js  → ポート番号を変える
 *
 * public/ の画面を配信し、/api/transcript で YouTube の字幕を取得します。
 * 学習データはブラウザ（localStorage）に保存され、サーバーには残りません。
 */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawn } = require('child_process');
const youtube = require('./lib/youtube');
const core = require('./public/js/core');

const PUBLIC_DIR = path.join(__dirname, 'public');
const VERSION = require('./package.json').version;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, status, obj, extraHeaders) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders });
  res.end(body);
}

/** 静的ファイル（gzip 済みのものをメモリにキャッシュ） */
function createStatic(rootDir) {
  const cache = new Map();
  return function serveStatic(req, res, pathname) {
    let rel;
    try {
      rel = decodeURIComponent(pathname);
    } catch (e) {
      res.writeHead(400).end('Bad Request');
      return;
    }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(rootDir, path.normalize(rel));
    if (!file.startsWith(rootDir + path.sep) && file !== rootDir) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found');
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      const etag = '"' + st.size.toString(16) + '-' + Math.floor(st.mtimeMs).toString(16) + '"';
      const headers = { 'Content-Type': type, ETag: etag, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers).end();
        return;
      }
      const gzipOk = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && /^(text|application\/(json|manifest)|image\/svg)/.test(type);
      const key = file + '|' + etag + '|' + (gzipOk ? 'gz' : '');
      let body = cache.get(key);
      if (!body) {
        body = fs.readFileSync(file);
        if (gzipOk) body = zlib.gzipSync(body, { level: 9 });
        cache.set(key, body);
      }
      if (gzipOk) headers['Content-Encoding'] = 'gzip';
      headers['Content-Length'] = body.length;
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : body);
    });
  };
}

/**
 * @param {{fetchImpl?: typeof fetch, ytDlp?: string|false, allowOrigin?: string}} [opts]
 */
function createApp(opts) {
  opts = opts || {};
  const serveStatic = createStatic(PUBLIC_DIR);
  const cache = new Map(); // videoId -> transcript（直近 30 件）
  const inflight = new Map();

  async function getTranscript(videoId) {
    if (cache.has(videoId)) return cache.get(videoId);
    if (inflight.has(videoId)) return inflight.get(videoId);
    const p = youtube
      .fetchTranscript(videoId, { fetchImpl: opts.fetchImpl, ytDlp: opts.ytDlp })
      .then((t) => {
        cache.set(videoId, t);
        if (cache.size > 30) cache.delete(cache.keys().next().value);
        return t;
      })
      .finally(() => inflight.delete(videoId));
    inflight.set(videoId, p);
    return p;
  }

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const cors = opts.allowOrigin ? { 'Access-Control-Allow-Origin': opts.allowOrigin } : {};
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '600' }).end();
        return;
      }
      if (req.method !== 'GET') {
        sendJson(res, 405, { ok: false, code: 'METHOD', message: 'GET のみ対応しています。' }, cors);
        return;
      }
      if (url.pathname === '/api/health') {
        const ytDlp = opts.ytDlp === false ? '' : await youtube.ytDlpVersion(opts.ytDlp || process.env.YTDLP_PATH || 'yt-dlp');
        sendJson(res, 200, { ok: true, app: 'TubeTan', version: VERSION, ytDlp: ytDlp || null }, cors);
        return;
      }
      if (url.pathname === '/api/transcript') {
        const input = url.searchParams.get('url') || url.searchParams.get('v') || '';
        const videoId = core.parseVideoId(input);
        if (!videoId) {
          const e = new youtube.TranscriptError('INVALID_ID');
          sendJson(res, e.status, { ok: false, code: e.code, message: e.message }, cors);
          return;
        }
        try {
          const t = await getTranscript(videoId);
          sendJson(res, 200, { ok: true, ...t }, cors);
        } catch (e) {
          if (e instanceof youtube.TranscriptError) {
            console.warn(`[transcript] ${videoId}: ${e.code} ${e.detail || ''}`);
            sendJson(res, e.status, { ok: false, code: e.code, message: e.message, detail: e.detail || undefined, available: e.available }, cors);
          } else {
            console.error('[transcript]', e);
            sendJson(res, 500, { ok: false, code: 'INTERNAL', message: 'サーバー内部でエラーが発生しました。' }, cors);
          }
        }
        return;
      }
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'API が見つかりません。' }, cors);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    serveStatic(req, res, url.pathname);
  };
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  }
  return out;
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch (e) {
    /* ブラウザを開けなくても動作には影響しない */
  }
}

function main() {
  const argv = process.argv.slice(2);
  const lan = argv.includes('--lan') || process.env.HOST === '0.0.0.0';
  const host = process.env.HOST || (lan ? '0.0.0.0' : '127.0.0.1');
  const basePort = parseInt(process.env.PORT, 10) || 3000;
  const handler = createApp({ allowOrigin: process.env.ALLOW_ORIGIN });
  if (typeof fetch !== 'function') {
    console.error('Node.js 18 以上が必要です（現在: ' + process.version + '）。https://nodejs.org/ から最新版を入れてください。');
    process.exit(1);
  }

  let port = basePort;
  const server = http.createServer((req, res) => {
    handler(req, res).catch((e) => {
      console.error(e);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && port < basePort + 10) {
      port++;
      server.listen(port, host);
    } else {
      console.error('サーバーを起動できませんでした:', e.message);
      process.exit(1);
    }
  });
  server.on('listening', () => {
    const local = `http://localhost:${port}`;
    console.log('');
    console.log('  TubeTan（YouTube で英単語）を起動しました');
    console.log(`  → ブラウザで開く: ${local}`);
    if (lan) for (const ip of lanAddresses()) console.log(`  → スマホから（同じWi-Fi）: http://${ip}:${port}`);
    else console.log('  （スマホからも使うには: node server.js --lan）');
    console.log('  終了するには Ctrl + C');
    console.log('');
    if (argv.includes('--open')) openBrowser(local);
  });
  server.listen(port, host);
}

if (require.main === module) main();
module.exports = { createApp };
