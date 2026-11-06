#!/usr/bin/env node
/* run.js — 仮想資金投資シミュレーション（GitHub Actions 実行用バックエンド）
 * 実資金は使わず、発注機能はない。価格は Yahoo Finance（遅延あり）のスナップショット。
 * 使い方: node run.js [scan|warmup|backtest|build]   環境変数 DATA_DIR（既定 ./data）, SITE_DIR（既定 ./site）
 */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const E = require('./engine.js');

const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SITE = process.env.SITE_DIR || path.join(__dirname, '..', 'site');
const CFG = {
  JPX_XLSX: 'https://www.jpx.co.jp/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_j.xlsx',
  TOPIX_PROXY: '1306.T', N225_PROXY: '1321.T',
  ETFS: [['1306.T', 'NEXT FUNDS TOPIX連動型', true], ['1321.T', 'NEXT FUNDS 日経225連動型', true], ['1348.T', 'MAXIS トピックス', true], ['1329.T', 'iShares Core 日経225', true],
    ['1475.T', 'iShares Core TOPIX', true], ['1591.T', 'NEXT FUNDS JPX日経400', true], ['1343.T', 'NEXT FUNDS 東証REIT指数', true], ['1489.T', 'NEXT FUNDS 日経高配当株50', true],
    ['1478.T', 'iShares MSCI日本高配当', true], ['1477.T', 'iShares MSCI日本最小分散', true], ['1655.T', 'iShares S&P500（為替ヘッジなし）', true], ['2558.T', 'MAXIS 米国株式(S&P500)', true],
    ['2559.T', 'MAXIS 全世界株式(オール・カントリー)', true], ['1545.T', 'NEXT FUNDS NASDAQ-100', true], ['1540.T', '純金上場信託', false], ['2516.T', '東証グロース市場250指数ETF', true]],
  FUNDS: [['F0331418A', 'eMAXIS Slim 全世界株式(オール・カントリー)', 'JP90C000H1T1', '0331418A'], ['F03311187', 'eMAXIS Slim 米国株式(S&P500)', 'JP90C000GKC6', '03311187'],
    ['F03319172', 'eMAXIS Slim 先進国株式インデックス', 'JP90C000ENC5', '03319172'], ['F0331C177', 'eMAXIS Slim 新興国株式インデックス', 'JP90C000F7H5', '0331C177'],
    ['F03317172', 'eMAXIS Slim 国内株式(TOPIX)', 'JP90C000ENA9', '03317172'], ['F03311182', 'eMAXIS Slim 国内株式(日経平均)', 'JP90C000FXV1', '03311182'],
    ['F03316183', 'eMAXIS Slim 全世界株式(除く日本)', 'JP90C000G631', '03316183'], ['F03312175', 'eMAXIS Slim バランス(8資産均等型)', 'JP90C000EWV6', '03312175']],
  BATCH: 20, BATCH_GAP_MS: 1500, FAIL_GAP_MS: 8000,
  SCAN_BUDGET: +(process.env.SCAN_BUDGET || 420),   // 1スキャンの取得銘柄数（優先分を含む）。22回で約5周
  WARMUP_BUDGET: 5000, MAX_BARS: 400, EARNINGS_PER_SCAN: 40,
  UA: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();
const log = m => { const line = `${nowIso()} ${m}`; console.log(line); try { fs.appendFileSync(path.join(DATA, 'log.txt'), line + '\n'); } catch (e) { } };

// ---------- ストア（ファイル） ----------
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function readJson(p, dflt) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return dflt; } }
function writeJson(p, o) { ensureDir(path.dirname(p)); fs.writeFileSync(p, JSON.stringify(o)); }
function appendJsonl(p, rows) { if (!rows.length) return; ensureDir(path.dirname(p)); fs.appendFileSync(p, rows.map(r => JSON.stringify(r)).join('\n') + '\n'); }
function readJsonl(p) { try { return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); } catch (e) { return []; } }
const P = { universe: path.join(DATA, 'universe.json'), hist: path.join(DATA, 'hist'), state: path.join(DATA, 'state.json'), trades: path.join(DATA, 'trades.jsonl'), nav: path.join(DATA, 'nav.jsonl'), scans: path.join(DATA, 'scans.jsonl'), judg: path.join(DATA, 'judg.json'), earnings: path.join(DATA, 'earnings.json'), meta: path.join(DATA, 'meta.json'), backtest: path.join(DATA, 'backtest'), intraday: path.join(DATA, 'intraday'), long: path.join(DATA, 'long'), news: path.join(DATA, 'news'), holidays: path.join(DATA, 'holidays.json') };
function loadHist(code) { return readJson(path.join(P.hist, code + '.json'), null); }
function saveHist(code, h) { writeJson(path.join(P.hist, code + '.json'), h); }
function loadAllHist() { const o = {}; try { fs.readdirSync(P.hist).forEach(f => { if (f.endsWith('.json')) { const h = readJson(path.join(P.hist, f), null); if (h) o[f.slice(0, -5)] = h; } }); } catch (e) { } return o; }
function extraHolidays() { return readJson(P.holidays, []); }
function loadStates() { const s = readJson(P.state, {}); E.PATTERNS.forEach(p => { if (!s[p.id]) s[p.id] = E.newState(p); }); return s; }

// ---------- HTTP ----------
async function get(url, opt) { opt = opt || {}; const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), opt.timeout || 25000); try { const r = await fetch(url, { headers: Object.assign({ 'User-Agent': CFG.UA, 'Accept': '*/*' }, opt.headers || {}), redirect: 'follow', signal: ctl.signal }); return r; } finally { clearTimeout(t); } }
function yahooUrl(sym, range, interval) { return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}&includePrePost=false`; }
function rd(x) { return x === null || x === undefined ? null : Math.round(x * 100) / 100; }
function parseChart(j, tfmt) { try { const r = j && j.chart && j.chart.result && j.chart.result[0]; if (!r || !r.timestamp) return null; const q = r.indicators.quote[0]; const b = { t: [], o: [], h: [], l: [], c: [], v: [] };
  for (let i = 0; i < r.timestamp.length; i++) { if (q.close[i] === null || q.close[i] === undefined) continue; const d = new Date(r.timestamp[i] * 1000); b.t.push(tfmt ? tfmt(d) : E.ymdJST(d)); b.o.push(rd(q.open[i])); b.h.push(rd(q.high[i])); b.l.push(rd(q.low[i])); b.c.push(rd(q.close[i])); b.v.push(q.volume[i]); }
  return { bars: b, meta: { price: r.meta.regularMarketPrice, prevClose: r.meta.chartPreviousClose, time: r.meta.regularMarketTime } }; } catch (e) { return null; } }
async function fetchChart(sym, range, interval, tfmt) { try { const r = await get(yahooUrl(sym, range, interval)); if (r.status !== 200) return null; const j = await r.json(); const p = parseChart(j, tfmt); return p && p.bars.c.length ? p : null; } catch (e) { return null; } }
// 並列バッチ（最大20）・失敗が多いバッチの後は間隔を空ける
async function fetchBatches(items, stats, deadline) { const out = {}, failed = [];
  for (let i = 0; i < items.length; i += CFG.BATCH) { if (deadline && Date.now() > deadline) break; const chunk = items.slice(i, i + CFG.BATCH);
    const res = await Promise.all(chunk.map(it => fetchChart(it.code, it.range, it.interval))); let nf = 0;
    res.forEach((p, k) => { out[chunk[k].code] = p; if (!p) { failed.push(chunk[k]); nf++; } }); if (stats) { stats.requests += chunk.length; stats.failed += nf; }
    await sleep(nf >= Math.ceil(chunk.length / 2) ? CFG.FAIL_GAP_MS : CFG.BATCH_GAP_MS); }
  return { out, failed }; }
function mergeBars(oldB, newB) { if (!oldB) return trimBars(newB); const idx = {}; oldB.t.forEach((t, i) => idx[t] = i); const r = { t: oldB.t.slice(), o: oldB.o.slice(), h: oldB.h.slice(), l: oldB.l.slice(), c: oldB.c.slice(), v: oldB.v.slice() };
  newB.t.forEach((t, i) => { const j = idx[t]; if (j === undefined) { r.t.push(t); r.o.push(newB.o[i]); r.h.push(newB.h[i]); r.l.push(newB.l[i]); r.c.push(newB.c[i]); r.v.push(newB.v[i]); } else { r.o[j] = newB.o[i]; r.h[j] = newB.h[i]; r.l[j] = newB.l[i]; r.c[j] = newB.c[i]; r.v[j] = newB.v[i]; } });
  const order = r.t.map((t, i) => i).sort((a, b) => r.t[a] < r.t[b] ? -1 : 1); const s = { t: [], o: [], h: [], l: [], c: [], v: [] }; order.forEach(i => { s.t.push(r.t[i]); s.o.push(r.o[i]); s.h.push(r.h[i]); s.l.push(r.l[i]); s.c.push(r.c[i]); s.v.push(r.v[i]); }); return trimBars(s); }
function trimBars(b) { const n = b.t.length; if (n <= CFG.MAX_BARS) return b; const k = n - CFG.MAX_BARS; return { t: b.t.slice(k), o: b.o.slice(k), h: b.h.slice(k), l: b.l.slice(k), c: b.c.slice(k), v: b.v.slice(k) }; }

// ---------- 投信（投信協会CSV） ----------
async function fetchFundNav(isin, assoc) { try { const r = await get(`https://toushin-lib.fwg.ne.jp/FdsWeb/FDST030000/csv-file-download?isinCd=${isin}&associFundCd=${assoc}`); if (r.status !== 200) return null; const buf = Buffer.from(await r.arrayBuffer()); let txt = buf.toString('utf8'); if (txt.indexOf('年月日') < 0) { try { txt = new TextDecoder('shift_jis').decode(buf); } catch (e) { } } if (txt.indexOf('年月日') < 0) return null;
  const b = { t: [], o: [], h: [], l: [], c: [], v: [] }; txt.split(/\r?\n/).slice(1).forEach(ln => { const f = ln.split(','); const m = f[0] && f[0].match(/(\d{4})年(\d{2})月(\d{2})日/); if (!m) return; const nav = +f[1]; if (!isFinite(nav)) return; b.t.push(`${m[1]}-${m[2]}-${m[3]}`); b.o.push(nav); b.h.push(nav); b.l.push(nav); b.c.push(nav); b.v.push(null); }); return b.t.length ? trimBars(b) : null; } catch (e) { return null; } }
async function fetchFunds(uni) { let n = 0; for (const u of uni.filter(u => u.type === 'fund')) { const b = await fetchFundNav(u.isin, u.assoc); if (b) { saveHist(u.code, { bars: b, asof: b.t[b.t.length - 1], lastFull: nowIso() }); u.lastFetch = nowIso(); u.lastFull = nowIso(); u.status = 'ok'; n++; } else u.status = 'fail'; await sleep(500); } const meta = readJson(P.meta, {}); meta.fundsDate = E.ymdJST(new Date()); writeJson(P.meta, meta); log(`投信基準価額 ${n}/${CFG.FUNDS.length}`); return n; }

// ---------- 監視対象（JPX xlsx） ----------
function unzip(buf) { // 最小限の zip 展開（deflate / stored）
  const files = {}; let eocd = buf.length - 22; while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--; if (eocd < 0) throw new Error('zip EOCD not found');
  const n = buf.readUInt16LE(eocd + 10); let off = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < n; i++) { if (buf.readUInt32LE(off) !== 0x02014b50) break; const method = buf.readUInt16LE(off + 10), csize = buf.readUInt32LE(off + 20), nlen = buf.readUInt16LE(off + 28), elen = buf.readUInt16LE(off + 30), clen = buf.readUInt16LE(off + 32), lho = buf.readUInt32LE(off + 42); const name = buf.slice(off + 46, off + 46 + nlen).toString('utf8');
    const lnlen = buf.readUInt16LE(lho + 26), lelen = buf.readUInt16LE(lho + 28); const start = lho + 30 + lnlen + lelen; const data = buf.slice(start, start + csize); files[name] = method === 8 ? zlib.inflateRawSync(data) : data; off += 46 + nlen + elen + clen; }
  return files; }
function decodeXml(s) { return s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'); }
function colIdx(s) { let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }
function parseXlsx(buf) { const files = unzip(buf); const shared = []; if (files['xl/sharedStrings.xml']) { const x = files['xl/sharedStrings.xml'].toString('utf8'); const re = /<si>([\s\S]*?)<\/si>/g; let m; while ((m = re.exec(x))) shared.push(decodeXml(m[1].replace(/<[^>]+>/g, ''))); }
  const sheet = (files['xl/worksheets/sheet1.xml'] || Buffer.alloc(0)).toString('utf8'); const rows = []; const rre = /<row[^>]*>([\s\S]*?)<\/row>/g; let rm;
  while ((rm = rre.exec(sheet))) { const row = []; const cre = /<c r="([A-Z]+)\d+"(?:[^>]*t="([a-z]+)")?[^>]*>(?:<v>([^<]*)<\/v>|<is><t>([^<]*)<\/t><\/is>)?<\/c>/g; let cm; while ((cm = cre.exec(rm[1]))) { let v = cm[3] !== undefined ? cm[3] : cm[4]; if (cm[2] === 's') v = shared[+v]; else if (v !== undefined && cm[2] !== 'str' && cm[2] !== 'inlineStr') v = isNaN(+v) ? decodeXml(v) : +v; else if (v !== undefined) v = decodeXml(v); row[colIdx(cm[1])] = v === undefined ? '' : v; } rows.push(row); }
  return rows; }
async function importUniverse() { const r = await get(CFG.JPX_XLSX, { timeout: 60000 }); if (r.status !== 200) throw new Error('JPX一覧 HTTP ' + r.status); const rows = parseXlsx(Buffer.from(await r.arrayBuffer())); const hdr = rows[0].map(h => String(h).trim()); const ci = {}; hdr.forEach((h, i) => ci[h] = i);
  const iCode = ci['コード'], iName = ci['銘柄名'], iMkt = ci['市場・商品区分'], iSec = ci['33業種区分']; if (iCode === undefined || iMkt === undefined) throw new Error('JPX一覧の列が想定外: ' + hdr.join(','));
  const old = {}; readJson(P.universe, []).forEach(u => old[u.code] = u); const out = [];
  rows.slice(1).forEach(r => { if (String(r[iMkt]).indexOf('プライム') !== 0) return; const code = String(r[iCode]).trim(); if (!/^[0-9][0-9A-Z]{3}$/.test(code)) return; const c = code + '.T'; const o = old[c] || {}; out.push({ code: c, name: r[iName], sector: r[iSec] || '不明', type: 'stock', unit: 100, lastFetch: o.lastFetch || '', lastFull: o.lastFull || '', status: o.status || '' }); });
  CFG.ETFS.forEach(e => { const o = old[e[0]] || {}; out.push({ code: e[0], name: e[1], sector: 'ETF', type: e[2] ? 'etf_index' : 'etf', unit: 1, lastFetch: o.lastFetch || '', lastFull: o.lastFull || '', status: o.status || '' }); });
  CFG.FUNDS.forEach(f => { const o = old[f[0]] || {}; out.push({ code: f[0], name: f[1], sector: '投信', type: 'fund', unit: 1000, isin: f[2], assoc: f[3], lastFetch: o.lastFetch || '', lastFull: o.lastFull || '', status: o.status || '' }); });
  writeJson(P.universe, out); const meta = readJson(P.meta, {}); meta.universeDate = E.ymdJST(new Date()); writeJson(P.meta, meta); log(`universe ${out.length}件（プライム ${out.length - CFG.ETFS.length - CFG.FUNDS.length}）`); return out; }

// ---------- 取得対象の選定: 保有→ETF/指数→最終取得が古い順 ----------
function pickFetchList(uni, hist, budget, states) { const held = {}; Object.values(states).forEach(st => st.positions.forEach(p => held[p.code] = true)); const pri = [], rest = [];
  uni.forEach(u => { if (u.type === 'fund') return; if (held[u.code] || u.type !== 'stock') pri.push(u); else rest.push(u); });
  rest.sort((a, b) => (a.lastFetch ? Date.parse(a.lastFetch) : 0) - (b.lastFetch ? Date.parse(b.lastFetch) : 0));
  return pri.concat(rest).slice(0, Math.max(budget, pri.length)).map(u => { const h = hist[u.code]; const needFull = !h || !h.bars || h.bars.t.length < 100 || !h.lastFull || Date.now() - Date.parse(h.lastFull) > 7 * 86400000; return { code: u.code, range: needFull ? '2y' : '5d', interval: '1d', full: needFull }; }); }
function applyFetched(uni, hist, items, out) { const by = {}; uni.forEach(u => by[u.code] = u); let full = 0, light = 0, fail = 0; const codes = [];
  items.forEach(it => { const p = out[it.code]; const u = by[it.code]; if (p === undefined) return; if (!p) { fail++; if (u) u.status = 'fail'; return; } const old = hist[it.code]; const bars = mergeBars(old && old.bars, p.bars); hist[it.code] = { bars, asof: bars.t[bars.t.length - 1], lastFull: it.full ? nowIso() : (old && old.lastFull) || '' }; saveHist(it.code, hist[it.code]); if (u) { u.lastFetch = nowIso(); if (it.full) u.lastFull = nowIso(); u.status = 'ok'; } codes.push(it.code); if (it.full) full++; else light++; });
  return { codes, full, light, fail }; }

// ---------- 決算日（Yahoo quoteSummary・取れない分は未知） ----------
let crumbCache = null;
async function yahooCrumb() { if (crumbCache) return crumbCache; try { const r1 = await get('https://fc.yahoo.com', { timeout: 15000 }); const sc = r1.headers.get('set-cookie'); if (!sc) return null; const cookie = sc.split(/,(?=\s*\w+=)/).map(s => s.split(';')[0].trim()).join('; '); const r2 = await get('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { Cookie: cookie } }); if (r2.status !== 200) return null; const crumb = await r2.text(); if (!crumb || crumb.length > 40) return null; crumbCache = { cookie, crumb }; return crumbCache; } catch (e) { return null; } }
async function fetchEarnings(codes) { const out = {}; if (!codes.length) return out; const ck = await yahooCrumb(); if (!ck) { log('決算日: crumb取得不可（未知として続行）'); return out; }
  for (let i = 0; i < codes.length; i += CFG.BATCH) { const chunk = codes.slice(i, i + CFG.BATCH); const rs = await Promise.all(chunk.map(async c => { try { const r = await get(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(c)}?modules=calendarEvents&crumb=${encodeURIComponent(ck.crumb)}`, { headers: { Cookie: ck.cookie } }); const j = await r.json(); const ed = j.quoteSummary.result[0].calendarEvents.earnings.earningsDate; return ed && ed.length ? E.ymdJST(new Date(ed[0].raw * 1000)) : ''; } catch (e) { return ''; } })); chunk.forEach((c, k) => out[c] = rs[k]); await sleep(CFG.BATCH_GAP_MS); }
  return out; }

// ---------- ニュース（Google News RSS → Bing） ----------
function parseRss(xml) { const items = []; const re = /<item>([\s\S]*?)<\/item>/g; let m; const tag = (s, t) => { const mm = s.match(new RegExp('<' + t + '[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/' + t + '>')); return mm ? decodeXml(mm[1]).replace(/<[^>]+>/g, '').trim() : ''; };
  while ((m = re.exec(xml))) { const it = m[1]; const pub = tag(it, 'pubDate'); const d = pub ? new Date(pub) : null; items.push({ title: tag(it, 'title'), link: tag(it, 'link'), source: tag(it, 'source') || tag(it, 'News:Source') || '', pub: d && !isNaN(d) ? d.toISOString() : pub }); }
  items.sort((a, b) => (b.pub || '').localeCompare(a.pub || '')); return items; }
async function fetchNews(q, n) { let items = [], src = ''; for (const [name, url] of [['Google News', `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ja&gl=JP&ceid=JP:ja`], ['Bing News', `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setlang=ja&cc=jp`]]) { try { const r = await get(url); if (r.status !== 200) continue; items = parseRss(await r.text()); src = name; if (items.length) break; } catch (e) { } }
  items = items.slice(0, n || 15); return { ok: true, q, source: src || 'なし', items, asof: nowIso(), note: items.length ? `見出しは${src}の検索結果（配信元は各記事のリンク先）。内容の真偽は未検証` : 'ニュースを取得できませんでした' }; }
async function updateNews(uni, states) { ensureDir(P.news); const keys = [['market', '日経平均 OR 東証 株式市場', 15], ['fx', 'ドル円 OR NYダウ OR 米国株', 12]]; const seen = {}; Object.values(states).forEach(st => st.positions.forEach(p => { if (!seen[p.code]) { seen[p.code] = 1; keys.push([p.code, String(p.name).replace(/[（(].*$/, '') + (p.type === 'fund' ? '' : ' 株'), 6]); } }));
  uni.filter(u => u.type !== 'stock' && u.type !== 'fund').slice(0, 4).forEach(u => { if (!seen[u.code]) { seen[u.code] = 1; keys.push([u.code, String(u.name).replace(/[（(].*$/, ''), 5]); } });
  for (const [k, q, n] of keys) { const prev = readJson(path.join(P.news, k + '.json'), null); if (prev && Date.now() - Date.parse(prev.asof) < 50 * 60000) continue; const r = await fetchNews(q, n); writeJson(path.join(P.news, k + '.json'), r); await sleep(800); } }

// ---------- スキャン ----------
async function scan(opts) { opts = opts || {}; const t0 = Date.now(); const now = new Date(); const today = E.ymdJST(now); const extra = extraHolidays();
  let uni = readJson(P.universe, null); if (!uni || !uni.length || (readJson(P.meta, {}).universeDate || '') < E.addDaysYmd(today, -7)) { try { uni = await importUniverse(); } catch (e) { log('JPX一覧取得失敗: ' + e.message); if (!uni) throw e; } }
  const states = loadStates(); const hist = loadAllHist(); const histEmpty = Object.keys(hist).length < 100;
  const inHours = E.isBusinessDayYmd(today, extra) && E.inTradingHours(now);
  if (!inHours && !opts.force) { if (histEmpty || opts.warmup) { log('取引時間外: 履歴の温め（売買判定はしない）'); return warmup(uni, hist, states); } appendJsonl(P.scans, [{ ts: nowIso(), date: today, slot: E.hmJST(now), refused: true, notes: '取引時間外のため拒否（売買判定なし）' }]); log('スキャン拒否: 取引時間外 ' + E.hmJST(now)); return 'refused'; }
  const slot = E.currentSlot(now); const slotLabel = slot ? E.slotLabel(slot) : E.hmJST(now); const deadline = t0 + 20 * 60000;
  // 1) 取得
  const items = pickFetchList(uni, hist, histEmpty ? CFG.WARMUP_BUDGET : CFG.SCAN_BUDGET, states); const stats = { requests: 0, failed: 0 };
  let r = await fetchBatches(items, stats, deadline); if (r.failed.length && Date.now() < deadline) { const r2 = await fetchBatches(r.failed, stats, deadline); Object.keys(r2.out).forEach(c => { if (r2.out[c]) r.out[c] = r2.out[c]; }); }
  const upd = applyFetched(uni, hist, items, r.out); writeJson(P.universe, uni);
  let fundsFetched = 0; if ((readJson(P.meta, {}).fundsDate || '') !== today) { fundsFetched = await fetchFunds(uni); uni.filter(u => u.type === 'fund').forEach(u => { const h = loadHist(u.code); if (h) hist[u.code] = h; }); writeJson(P.universe, uni); }
  // 2) 指標・採点
  const frac = E.sessionFraction(now); const rows = [], byCode = {};
  uni.forEach(u => { const h = hist[u.code]; if (!h || !h.bars || h.bars.c.length < 2) { rows.push({ code: u.code, name: u.name, sector: u.sector, type: u.type, unit: +u.unit, m: null, fresh: false, freshDate: null }); return; } const s = E.indicatorSeries(h.bars); const last = s.n - 1; const lastDate = h.bars.t[last]; const isToday = lastDate === today; const m = E.metricsAt(s, last, { volProj: isToday ? 1 / frac : 1 }); const fetchedToday = u.lastFetch && E.ymdJST(new Date(u.lastFetch)) === today; const fresh = u.type === 'fund' ? !!fetchedToday : (isToday && !!fetchedToday); const base = isToday ? m.prevClose : m.close; const lim = u.type === 'fund' || !base ? null : E.priceLimit(base); rows.push({ code: u.code, name: u.name, sector: u.sector, type: u.type, unit: +u.unit, m, fresh, freshDate: lastDate, limitUp: lim ? base + lim : null, limitDown: lim ? base - lim : null }); });
  E.computeFactors(rows); rows.forEach(r => byCode[r.code] = r); const tr = byCode[CFG.TOPIX_PROXY], nr = byCode[CFG.N225_PROXY]; const regime = E.regimeOf(tr && tr.m, nr && nr.m, !!(tr && nr && tr.fresh && nr.fresh));
  // 3) 決算日
  const earn = readJson(P.earnings, {}); const need = []; rows.forEach(r => { if (!r.m || !r.f || r.type === 'fund' || !r.m.trendUp) return; let mx = false; E.PATTERNS.forEach(p => { const s = E.scoreFor(r.f, p); if (s !== null && s >= p.th - 5) mx = true; }); if (!mx) return; const e = earn[r.code]; if (!e || !e.fetchedAt || E.ymdJST(new Date(e.fetchedAt)) !== today) need.push(r.code); });
  const got = await fetchEarnings(need.slice(0, CFG.EARNINGS_PER_SCAN)); Object.keys(got).forEach(c => earn[c] = { date: got[c], fetchedAt: nowIso() }); writeJson(P.earnings, earn); const earnMap = {}; Object.keys(earn).forEach(c => { if (earn[c].date) earnMap[c] = earn[c].date; });
  // 4) パターン別判定
  const allTrades = [], navRows = [], judgBy = {}, notes = [];
  E.PATTERNS.forEach(p => { const out = E.runScan({ pat: p, state: states[p.id], rows, regime, today, now, earnings: earnMap, extraHolidays: extra }); states[p.id] = out.state; out.trades.forEach(t => allTrades.push(t)); judgBy[p.id] = out.judgments; if (out.notes.length) notes.push(p.name + ': ' + out.notes.join('、')); navRows.push({ ts: nowIso(), date: today, pattern: p.id, equity: Math.round(out.state.lastEquity), cash: Math.round(out.state.cash), dd: Math.round((out.state.lastEquity / out.state.peak - 1) * 10000) / 10000, positions: out.state.positions.length }); });
  writeJson(P.state, states); appendJsonl(P.trades, allTrades); appendJsonl(P.nav, navRows);
  // 5) 判定シート
  const jrows = rows.map(r => { const m = r.m; const j = { fresh: r.fresh, asof: r.freshDate, regime: regime.status, ts: nowIso() }; if (m) { j.m = { c: m.close, pc: m.prevClose, chg: m.chg, s25: m.sma25, s75: m.sma75, rsi: m.rsi, atr: m.atr, atrp: m.atrPct, vr: m.volRatio, vol: m.vol, v20: m.vol20, r20: m.ret20, r60: m.ret60, r120: m.ret120, up: m.trendUp, bars: m.bars, liq: m.liq, hi: hist[r.code].bars.h[hist[r.code].bars.h.length - 1], lo: hist[r.code].bars.l[hist[r.code].bars.l.length - 1], o: hist[r.code].bars.o[hist[r.code].bars.o.length - 1] }; j.f = r.f; j.scores = E.scoreAll(r.f); j.earn = earnMap[r.code] || ''; } j.p = {}; E.PATTERNS.forEach(p => { const x = judgBy[p.id][r.code]; if (x) j.p[p.id] = { a: x.action, t: x.text, s: x.scoreAdj !== undefined ? x.scoreAdj : x.score }; }); return { code: r.code, name: r.name, sector: r.sector, type: r.type, j }; });
  writeJson(P.judg, { today, rows: jrows });
  const untouched = uni.filter(u => !u.lastFetch || E.ymdJST(new Date(u.lastFetch)) !== today).length;
  const scanRow = { ts: nowIso(), date: today, slot: slotLabel, regime: regime.status, full: upd.full, light: upd.light, fail: upd.fail, untouched, fundsFetched, durationSec: Math.round((Date.now() - t0) / 1000), notes: (notes.join(' / ') + (allTrades.length ? ' / 売買' + allTrades.length + '件' : '')).slice(0, 4000) };
  appendJsonl(P.scans, [scanRow]); const meta = readJson(P.meta, {}); meta.lastScan = nowIso(); meta.regime = { status: regime.status, text: regime.text, ts: nowIso() }; writeJson(P.meta, meta);
  // 6) 1日足・長期足（保有・ETF・指数のみ）、ニュース
  await updateIntradayLong(uni, states, hist); await updateNews(uni, states);
  log(`scan ${slotLabel} 完了 ${scanRow.durationSec}s: 全${upd.full}/軽${upd.light}/失敗${upd.fail}/未着手${untouched} 売買${allTrades.length} regime=${regime.status} req=${stats.requests}`);
  return scanRow; }

async function warmup(uni, hist, states) { const t0 = Date.now(); uni = uni || readJson(P.universe, null) || await importUniverse(); hist = hist || loadAllHist(); states = states || loadStates(); const items = pickFetchList(uni, hist, CFG.WARMUP_BUDGET, states); const stats = { requests: 0, failed: 0 };
  let r = await fetchBatches(items, stats, Date.now() + 40 * 60000); if (r.failed.length) { const r2 = await fetchBatches(r.failed, stats, Date.now() + 10 * 60000); Object.keys(r2.out).forEach(c => { if (r2.out[c]) r.out[c] = r2.out[c]; }); }
  const upd = applyFetched(uni, hist, items, r.out); writeJson(P.universe, uni); if ((readJson(P.meta, {}).fundsDate || '') !== E.ymdJST(new Date())) await fetchFunds(uni);
  await updateIntradayLong(uni, states, hist); await updateNews(uni, states);
  const msg = `warmup ${Math.round((Date.now() - t0) / 1000)}s: 全履歴${upd.full}/軽量${upd.light}/失敗${upd.fail}/未着手${uni.length - items.length}`; appendJsonl(P.scans, [{ ts: nowIso(), date: E.ymdJST(new Date()), slot: E.hmJST(new Date()), warmup: true, full: upd.full, light: upd.light, fail: upd.fail, untouched: uni.length - items.length, durationSec: Math.round((Date.now() - t0) / 1000), notes: '履歴の温め（売買判定なし）' }]); log(msg); return msg; }

async function updateIntradayLong(uni, states, hist) { ensureDir(P.intraday); ensureDir(P.long); const set = {}; uni.forEach(u => { if (u.type !== 'stock' && u.type !== 'fund') set[u.code] = 1; }); Object.values(states).forEach(st => st.positions.forEach(p => { if (p.type !== 'fund') set[p.code] = 1; })); const codes = Object.keys(set); const today = E.ymdJST(new Date());
  // 1日足（30分足、5日分）
  for (let i = 0; i < codes.length; i += CFG.BATCH) { const chunk = codes.slice(i, i + CFG.BATCH); const rs = await Promise.all(chunk.map(c => fetchChart(c, '5d', '30m', d => E.ymdJST(d) + ' ' + E.hmJST(d)))); rs.forEach((p, k) => { if (!p) return; const byDay = {}, order = []; p.bars.t.forEach((t, j) => { const ymd = t.slice(0, 10); if (!byDay[ymd]) { byDay[ymd] = { t: [], o: [], h: [], l: [], c: [], v: [] }; order.push(ymd); } const b = byDay[ymd]; b.t.push(t.slice(11)); b.o.push(p.bars.o[j]); b.h.push(p.bars.h[j]); b.l.push(p.bars.l[j]); b.c.push(p.bars.c[j]); b.v.push(p.bars.v[j]); }); const day = byDay[today] ? today : order[order.length - 1]; const pi = order.indexOf(day) - 1; const prevClose = pi >= 0 ? byDay[order[pi]].c.slice(-1)[0] : (p.meta.prevClose || null); writeJson(path.join(P.intraday, chunk[k] + '.json'), { ok: true, code: chunk[k], day, isToday: day === today, bars: byDay[day], prevClose, asof: nowIso() }); }); await sleep(CFG.BATCH_GAP_MS); }
  // 長期足（週足・月足）: 1日1回
  for (const c of codes) { for (const iv of ['1wk', '1mo']) { const f = path.join(P.long, `${c}_${iv}.json`); const prev = readJson(f, null); if (prev && prev.asof && prev.asof.slice(0, 10) === today) continue; const p = await fetchChart(c, 'max', iv); if (!p) continue; const s = E.indicatorSeries(p.bars); writeJson(f, { ok: true, code: c, interval: iv, bars: p.bars, sma25: s.sma25, sma75: s.sma75, asof: nowIso() }); await sleep(400); } } }

// ---------- バックテスト ----------
function runBacktest(pid) { const pat = E.PATTERNS.find(p => p.id === pid); const uni = readJson(P.universe, []); const hist = loadAllHist(); const series = {}; uni.forEach(u => { const h = hist[u.code]; if (!h || !h.bars || h.bars.c.length < 100) return; series[u.code] = { bars: h.bars, meta: { name: u.name, sector: u.sector, type: u.type, unit: +u.unit } }; });
  const res = E.backtest(series, pat, { days: 200, topix: CFG.TOPIX_PROXY, n225: CFG.N225_PROXY }); res.universeSize = Object.keys(series).length; res.ranAt = nowIso(); res.tradeLog = res.tradeLog.slice(-300); writeJson(path.join(P.backtest, pid + '.json'), res); log(`backtest ${pid}: ${res.days}日 ret ${(res.ret * 100).toFixed(2)}% maxDD ${(res.maxDD * 100).toFixed(2)}% trades ${res.trades}`); return res; }

// ---------- サイト生成（静的JSON） ----------
function buildSite() { ensureDir(SITE); fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(SITE, 'index.html')); const D = path.join(SITE, 'data'); fs.rmSync(D, { recursive: true, force: true }); ensureDir(D);
  const uni = readJson(P.universe, []); const meta = readJson(P.meta, {}); const states = loadStates(); const judg = readJson(P.judg, { rows: [] }); const jmap = {}; judg.rows.forEach(r => jmap[r.code] = r.j); const today = E.ymdJST(new Date()); const extra = extraHolidays();
  const fresh = { today: 0, older: 0, none: 0 }; uni.forEach(u => { const j = jmap[u.code]; if (!j || !j.m) fresh.none++; else if (j.asof === today) fresh.today++; else fresh.older++; });
  const sec = {}; uni.forEach(u => { const j = jmap[u.code]; const s = sec[u.sector] = sec[u.sector] || { n: 0, withData: 0, chgSum: 0, upCnt: 0, r20Sum: 0, scoreSum: {}, cand: 0 }; s.n++; if (j && j.m) { s.withData++; if (typeof j.m.chg === 'number') s.chgSum += j.m.chg; if (j.m.up) s.upCnt++; if (typeof j.m.r20 === 'number') s.r20Sum += j.m.r20; E.PATTERNS.forEach(p => { if (j.scores && typeof j.scores[p.id] === 'number') s.scoreSum[p.id] = (s.scoreSum[p.id] || 0) + j.scores[p.id]; if (j.p && j.p[p.id] && j.p[p.id].a === 'cand') s.cand++; }); } });
  const sectors = Object.keys(sec).map(k => { const s = sec[k]; const o = { sector: k, n: s.n, withData: s.withData, avgChg: s.withData ? s.chgSum / s.withData : null, upRatio: s.withData ? s.upCnt / s.withData : null, avgR20: s.withData ? s.r20Sum / s.withData : null, cand: s.cand, avgScore: {} }; E.PATTERNS.forEach(p => o.avgScore[p.id] = s.withData ? (s.scoreSum[p.id] || 0) / s.withData : null); return o; });
  const trades = readJsonl(P.trades); const nav = readJsonl(P.nav).slice(-5 * 22 * 60); const scans = readJsonl(P.scans).slice(-80);
  const positions = []; E.PATTERNS.forEach(p => states[p.id].positions.forEach(pos => { const j = jmap[pos.code]; const px = j && j.m ? j.m.c : null; positions.push({ pattern: p.id, code: pos.code, name: pos.name, sector: pos.sector, type: pos.type, qty: pos.qty, entry: pos.entry, entryDate: pos.entryDate, stop: pos.stop, high: pos.high, trailing: pos.trailing, core: pos.core, price: px, asof: j ? j.asof : null, fresh: j ? j.fresh : false, pnl: px !== null ? (px - pos.entry) * pos.qty : null, pnlPct: px !== null ? px / pos.entry - 1 : null, stopDist: px ? (px - pos.stop) / px : null, sma75: j && j.m ? j.m.s75 : null }); }));
  const quotes = {}; uni.forEach(u => { const j = jmap[u.code]; if (!j || !j.m) return; quotes[u.code] = { price: j.m.c, prev: j.m.pc, chg: j.m.c - j.m.pc, chgPct: j.m.chg, open: j.m.o, high: j.m.hi, low: j.m.lo, vol: j.m.vol, time: j.ts, asof: j.asof, fund: u.type === 'fund', name: u.name }; });
  const tj = jmap[CFG.TOPIX_PROXY], nj = jmap[CFG.N225_PROXY]; const ix = (j, code) => j ? { code, price: j.m && j.m.c, sma75: j.m && j.m.s75, sma25: j.m && j.m.s25, asof: j.asof, fresh: j.fresh } : null;
  const summary = { ok: true, now: nowIso(), today, regime: meta.regime ? meta.regime.status : 'unknown', regimeText: meta.regime ? meta.regime.text : 'まだスキャンが実行されていない', regimeAsOf: meta.regime ? meta.regime.ts : null, index: { topix: ix(tj, CFG.TOPIX_PROXY), n225: ix(nj, CFG.N225_PROXY) }, lastScan: meta.lastScan || null, nextSlot: E.nextSlot(new Date(), extra).date.toISOString(), fresh, universe: uni.length, universeDate: meta.universeDate, fundsDate: meta.fundsDate,
    patterns: E.PATTERNS.map(p => { const st = states[p.id]; return { id: p.id, name: p.name, capital: p.capital, w: p.w, th: p.th, maxPos: p.maxPos, lot: p.lot, core: p.core, sectorAdj: p.sectorAdj, cash: st.cash, equity: st.lastEquity, peak: st.peak, dd: st.lastEquity / st.peak - 1, riskMult: st.riskMult, halted: st.halted, realized: st.realized, taxPaid: st.taxPaid, startDate: st.startDate, nPos: st.positions.length }; }),
    positions, trades: trades.slice(-400), nav, scans, sectors, quotes, rules: E.RULES, slots: E.SLOTS.map(E.slotLabel), holidays: E.HOLIDAYS, extraHolidays: extra, inHours: E.inTradingHours(new Date()), isBizDay: E.isBusinessDayYmd(today, extra), static: true,
    delay: '価格は各スキャン時点（約15分間隔）の Yahoo Finance のスナップショット（東証は通常15〜20分遅延）。投信は前営業日の基準価額',
    limits: ['仮想資金のみ。発注機能はなく、実資金は一切使わない', '価格はスキャン時点（約15分間隔・GitHub Actionsの起動遅れで数分ずれる）のスナップショット。日中の値動きはスキャン間で見ていない', '価格の取得元は Yahoo Finance（遅延あり）、投信は投信協会の基準価額（前営業日分）', '全銘柄をローテーション取得。当日未取得の銘柄は「古いデータ」として売買対象外', '呼値は東証の一般表（TOPIX500構成銘柄の細かい呼値は未反映）。値幅制限は前日終値基準の一般表', '決算日は Yahoo から取得できた分のみ（取得不能時は未知として扱う）', '仮想税は実現益ごとに20.315%を差し引く簡易計算（損益通算・年次精算は未再現）', '投信は当日の基準価額で約定したと仮定（実際は翌営業日基準価額）', '品質スコアは価格系列から算出した代理指標（120日トレンドの決定係数・最大下落・75日線上の日数比率）で、財務指標は使っていない', '1日足（30分足）と週足・月足は保有銘柄・ETF・指数代替のみ事前取得。他の銘柄は日足のみ', 'ニュースは見出しのみ（Google News検索）。市場・為替・保有銘柄分を約1時間ごとに更新。売買判定には使わない'] };
  writeJson(path.join(D, 'summary.json'), summary); writeJson(path.join(D, 'judg.json'), judg);
  ensureDir(path.join(D, 'hist')); const histAll = loadAllHist(); Object.keys(histAll).forEach(c => { const h = histAll[c]; const s = E.indicatorSeries(h.bars); writeJson(path.join(D, 'hist', c + '.json'), { ok: true, code: c, bars: h.bars, sma25: s.sma25, sma75: s.sma75, asof: h.asof, lastFull: h.lastFull, barsAll: h.bars.t.length }); });
  for (const sub of ['intraday', 'long', 'news', 'backtest']) { const src = P[sub]; if (fs.existsSync(src)) { ensureDir(path.join(D, sub)); fs.readdirSync(src).forEach(f => fs.copyFileSync(path.join(src, f), path.join(D, sub, f))); } }
  // 業種インデックス
  ensureDir(path.join(D, 'sector')); const cal = histAll[CFG.TOPIX_PROXY]; if (cal) { const dates = cal.bars.t.slice(-260), d0 = dates[0]; Object.keys(sec).forEach(name => { const cons = uni.filter(u => u.sector === name); const sums = dates.map(() => 0), cnts = dates.map(() => 0); let used = 0; cons.forEach(u => { const h = histAll[u.code]; if (!h) return; const idx = {}; h.bars.t.forEach((t, i) => idx[t] = i); let i0 = idx[d0]; if (i0 === undefined) for (let k = 0; k < h.bars.t.length; k++) if (h.bars.t[k] >= d0) { i0 = k; break; } if (i0 === undefined) return; const base = h.bars.c[i0]; if (!base) return; used++; dates.forEach((d, j) => { const i = idx[d]; if (i === undefined) return; sums[j] += h.bars.c[i] / base; cnts[j]++; }); }); const c = dates.map((d, j) => cnts[j] ? Math.round(sums[j] / cnts[j] * 10000) / 100 : null); const bars = { t: dates, c, o: c, h: c, l: c, v: dates.map(() => null) }; const s = E.indicatorSeries(bars); writeJson(path.join(D, 'sector', encodeURIComponent(name) + '.json'), { ok: true, sector: name, bars, sma25: s.sma25, sma75: s.sma75, constituents: cons.length, used, method: `構成銘柄の等ウェイト指数（基準日${d0}=100、各銘柄の終値比の単純平均、キャッシュ履歴のある${used}/${cons.length}銘柄）` }); }); }
  // エクスポート
  const hdr = ['ts', 'date', 'pattern', 'side', 'code', 'name', 'sector', 'type', 'qty', 'price', 'amount', 'refPrice', 'slip', 'pnl', 'tax', 'stop', 'score', 'kind', 'reasonShort', 'reasonFull']; fs.writeFileSync(path.join(D, 'trades.csv'), '﻿' + [hdr.join(',')].concat(trades.map(t => hdr.map(h => '"' + String(t[h] === undefined || t[h] === null ? '' : t[h]).replace(/"/g, '""') + '"').join(','))).join('\n'));
  writeJson(path.join(D, 'export.json'), { exportedAt: nowIso(), trades, states, nav: readJsonl(P.nav) });
  fs.writeFileSync(path.join(SITE, '.nojekyll'), ''); log(`site built: hist ${Object.keys(histAll).length}, trades ${trades.length}`); }

// ---------- main ----------
(async () => { const mode = process.argv[2] || 'scan'; ensureDir(DATA); try {
  if (mode === 'scan') await scan({ force: process.env.FORCE === '1' });
  else if (mode === 'warmup') await warmup();
  else if (mode === 'backtest') { ensureDir(P.backtest); for (const p of E.PATTERNS) runBacktest(p.id); }
  else if (mode === 'import') await importUniverse();
  if (mode !== 'build' && process.env.NO_BUILD === '1') return; buildSite();
} catch (e) { log('ERROR ' + (e.stack || e)); try { buildSite(); } catch (e2) { log('build error ' + e2); } process.exitCode = 0; } finally { global.__runDone = true; } })();
