/* engine.js — 仮想資金投資シミュレーション 共通エンジン
 * GAS (V8) とブラウザ/Node の両方で同一ファイルを使う。外部依存なし。
 * 発注機能は無い。実資金は扱わない。
 */
var Engine = (function () {
  'use strict';

  // ---------- 設定 ----------
  var PATTERNS = [
    { id: 'p10',   name: 'コア＋集中',       capital: 100000,   lot: 1,   w: { mom: 50, qual: 15, vol: 25, lowvol: 10 }, th: 70, maxPos: 4,  core: true,  sectorAdj: false },
    { id: 'p50',   name: 'モメンタム',       capital: 500000,   lot: 1,   w: { mom: 45, qual: 15, vol: 25, lowvol: 15 }, th: 65, maxPos: 6,  core: true,  sectorAdj: false },
    { id: 'p100',  name: 'バランス',         capital: 1000000,  lot: 100, w: { mom: 30, qual: 25, vol: 20, lowvol: 25 }, th: 55, maxPos: 8,  core: false, sectorAdj: false },
    { id: 'p500',  name: 'クオリティ・低ボラ', capital: 5000000,  lot: 100, w: { mom: 20, qual: 25, vol: 10, lowvol: 45 }, th: 45, maxPos: 12, core: false, sectorAdj: false },
    { id: 'p1000', name: '広分散',           capital: 10000000, lot: 100, w: { mom: 30, qual: 25, vol: 20, lowvol: 25 }, th: 40, maxPos: 16, core: false, sectorAdj: true }
  ];

  var RULES = {
    riskPct: 0.01,          // 1トレードの損失許容 = 資産の1%
    atrMult: 2,             // 損切り距離 = 2×ATR14
    singleCap: 0.25,        // 単一銘柄 25%
    coreCap: 0.70,          // コア(インデックスETF・投信) 70%（10万・50万のみ）
    sectorCap: 0.30,        // 業種 30%
    heatCap: 0.06,          // ポートフォリオヒート 6%
    trailTrigger: 0.10,     // 含み益+10%以降トレーリング
    trailAtrMult: 2,        // トレーリング幅 = 2×ATR
    rsiMin: 50, rsiMax: 75, // RSI14 の買い条件
    volRatioMin: 1.2,       // 出来高 20日平均比
    dd1: -0.10, dd2: -0.15, dd3: -0.20,
    tax: 0.20315,
    slipBase: 0.0005,       // 0.05%
    slipAtrK: 0.05,         // + ATR%×0.05
    fillCapVolPct: 0.01,    // 約定上限 20日平均出来高の1%
    earningsBlockDays: 2,
    sectorPenalty: 5,       // 広分散: 同業種保有1件ごとに −5
    sectorBonus: 3,         // 広分散: 未保有業種 +3
    fundUnit: 1000,
    staleMaxDays: 0         // 当日取得の価格以外では売買しない
  };

  var FACTOR_NAMES = { mom: 'モメンタム', qual: '品質', vol: '出来高', lowvol: '低ボラ' };

  // ---------- 数値ユーティリティ ----------
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function round(x, d) { var p = Math.pow(10, d || 0); return Math.round(x * p) / p; }
  function fmtYen(x) { return isNum(x) ? Math.round(x).toLocaleString('ja-JP') : '—'; }
  function fmtPx(x) { return isNum(x) ? (Math.abs(x) >= 100 ? Math.round(x).toLocaleString('ja-JP') : (Math.round(x * 10) / 10).toLocaleString('ja-JP')) : '—'; }
  function pct(x, d) { return isNum(x) ? (x * 100).toFixed(d === undefined ? 1 : d) + '%' : '—'; }

  // ---------- 呼値・値幅制限（東証の一般表。TOPIX500構成銘柄の細かい呼値は未反映） ----------
  function tickSize(p) {
    if (p <= 3000) return 1; if (p <= 5000) return 5; if (p <= 30000) return 10; if (p <= 50000) return 50;
    if (p <= 300000) return 100; if (p <= 500000) return 500; if (p <= 3000000) return 1000; if (p <= 5000000) return 5000;
    if (p <= 30000000) return 10000; if (p <= 50000000) return 50000; return 100000;
  }
  function roundTick(p, dir) { var t = tickSize(p); return dir > 0 ? Math.ceil(p / t - 1e-9) * t : Math.floor(p / t + 1e-9) * t; }
  function priceLimit(base) {
    var tbl = [[100, 30], [200, 50], [500, 80], [700, 100], [1000, 150], [1500, 300], [2000, 400], [3000, 500], [5000, 700], [7000, 1000],
      [10000, 1500], [15000, 3000], [20000, 4000], [30000, 5000], [50000, 7000], [70000, 10000], [100000, 15000], [150000, 30000],
      [200000, 40000], [300000, 50000], [500000, 70000], [700000, 100000], [1000000, 150000], [1500000, 300000], [2000000, 400000],
      [3000000, 500000], [5000000, 700000], [7000000, 1000000], [10000000, 1500000], [15000000, 3000000], [20000000, 4000000],
      [30000000, 5000000], [50000000, 7000000]];
    for (var i = 0; i < tbl.length; i++) if (base < tbl[i][0]) return tbl[i][1];
    return 10000000;
  }

  // ---------- カレンダー（JST） ----------
  var HOLIDAYS = {
    2026: ['01-01', '01-02', '01-03', '01-12', '02-11', '02-23', '03-20', '04-29', '05-04', '05-05', '05-06', '07-20', '08-11', '09-21', '09-22', '09-23', '10-12', '11-03', '11-23', '12-31'],
    2027: ['01-01', '01-02', '01-03', '01-11', '02-11', '02-23', '03-22', '04-29', '05-03', '05-04', '05-05', '07-19', '08-11', '09-20', '09-23', '10-11', '11-03', '11-23', '12-31']
  };
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  // JST の日付文字列 YYYY-MM-DD を返す（Date は UTC 基準で扱う）
  function jst(date) { return new Date(date.getTime() + 9 * 3600 * 1000); }
  function ymdJST(date) { var d = jst(date); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
  function hmJST(date) { var d = jst(date); return pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()); }
  function minutesJST(date) { var d = jst(date); return d.getUTCHours() * 60 + d.getUTCMinutes(); }
  function isBusinessDayYmd(ymd, extraHolidays) {
    var p = ymd.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    var dow = d.getUTCDay(); if (dow === 0 || dow === 6) return false;
    var hs = HOLIDAYS[+p[0]] || []; var md = p[1] + '-' + p[2];
    if (hs.indexOf(md) >= 0) return false;
    if (extraHolidays && extraHolidays.indexOf(ymd) >= 0) return false;
    return true;
  }
  function addDaysYmd(ymd, n) { var p = ymd.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return d.toISOString().slice(0, 10); }
  function nextBusinessDay(ymd, extra) { var y = addDaysYmd(ymd, 1); while (!isBusinessDayYmd(y, extra)) y = addDaysYmd(y, 1); return y; }
  function prevBusinessDay(ymd, extra) { var y = addDaysYmd(ymd, -1); while (!isBusinessDayYmd(y, extra)) y = addDaysYmd(y, -1); return y; }
  function businessDaysBetween(a, b, extra) { // a<b: a から b まで営業日数（a 当日を含まず b を含む）
    if (a >= b) return 0; var n = 0, y = a; while (y < b) { y = addDaysYmd(y, 1); if (isBusinessDayYmd(y, extra)) n++; } return n;
  }
  // スキャンスロット（分）: 9:05..11:05 +11:15, 12:35..15:05 +15:15 = 22回
  var SLOTS = (function () { var s = []; for (var m = 9 * 60 + 5; m <= 11 * 60 + 5; m += 15) s.push(m); s.push(11 * 60 + 15); for (m = 12 * 60 + 35; m <= 15 * 60 + 5; m += 15) s.push(m); s.push(15 * 60 + 15); return s; })();
  function slotLabel(m) { return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); }
  function inTradingHours(date) { var m = minutesJST(date); return (m >= 9 * 60 && m <= 11 * 60 + 30) || (m >= 12 * 60 + 30 && m <= 15 * 60 + 30); }
  function sessionFraction(date) { // 当日の取引時間のうち経過した割合（出来高の日中換算に使う）
    var m = minutesJST(date), total = 150 + 180; var e = 0;
    if (m >= 9 * 60) e += Math.min(150, Math.max(0, m - 9 * 60));
    if (m >= 12 * 60 + 30) e += Math.min(180, Math.max(0, m - (12 * 60 + 30)));
    return Math.max(0.05, Math.min(1, e / total));
  }
  function nextSlot(date, extra) { // 次のスキャン時刻 {ymd, minutes, date}
    var ymd = ymdJST(date), m = minutesJST(date);
    if (isBusinessDayYmd(ymd, extra)) for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i] > m) return mkSlot(ymd, SLOTS[i]);
    var y = nextBusinessDay(ymd, extra); return mkSlot(y, SLOTS[0]);
  }
  function mkSlot(ymd, m) { var p = ymd.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], Math.floor(m / 60) - 9, m % 60)); return { ymd: ymd, minutes: m, label: slotLabel(m), date: d }; }
  function currentSlot(date) { var m = minutesJST(date), best = null; for (var i = 0; i < SLOTS.length; i++) if (Math.abs(SLOTS[i] - m) <= 7) best = SLOTS[i]; return best; }

  // ---------- 指標（系列） ----------
  function sma(arr, n) { var out = new Array(arr.length), s = 0, cnt = 0; for (var i = 0; i < arr.length; i++) { var v = arr[i]; if (isNum(v)) { s += v; cnt++; } if (i >= n) { var o = arr[i - n]; if (isNum(o)) { s -= o; cnt--; } } out[i] = (i >= n - 1 && cnt === n) ? s / n : null; } return out; }
  function rsiWilder(c, n) { var out = new Array(c.length), ag = 0, al = 0; for (var i = 1; i < c.length; i++) { var d = c[i] - c[i - 1]; var g = d > 0 ? d : 0, l = d < 0 ? -d : 0; if (i <= n) { ag += g / n; al += l / n; out[i] = i === n ? (al === 0 ? 100 : 100 - 100 / (1 + ag / al)) : null; } else { ag = (ag * (n - 1) + g) / n; al = (al * (n - 1) + l) / n; out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); } } out[0] = null; return out; }
  function atrWilder(h, l, c, n) { var out = new Array(c.length), a = null; for (var i = 1; i < c.length; i++) { var tr = Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])); if (!isNum(tr)) { out[i] = a; continue; } if (i < n) { a = (a === null ? 0 : a) + tr / n; out[i] = null; } else if (i === n) { a += tr / n; out[i] = a; } else { a = (a * (n - 1) + tr) / n; out[i] = a; } } out[0] = null; return out; }
  function stdevReturns(c, n) { var out = new Array(c.length); for (var i = 0; i < c.length; i++) { if (i < n) { out[i] = null; continue; } var s = 0, s2 = 0; for (var k = i - n + 1; k <= i; k++) { var r = c[k] / c[k - 1] - 1; s += r; s2 += r * r; } var m = s / n; out[i] = Math.sqrt(Math.max(0, s2 / n - m * m)); } return out; }
  function maxDrawdown(c, n) { var out = new Array(c.length); for (var i = 0; i < c.length; i++) { if (i < n - 1) { out[i] = null; continue; } var pk = -Infinity, dd = 0; for (var k = i - n + 1; k <= i; k++) { if (c[k] > pk) pk = c[k]; var d = c[k] / pk - 1; if (d < dd) dd = d; } out[i] = dd; } return out; }
  function trendR2(c, n) { // log価格の時間回帰 R²×符号（上昇なら正）
    var out = new Array(c.length); var xs = 0, xx = 0; for (var k = 0; k < n; k++) { xs += k; xx += k * k; } var xm = xs / n;
    for (var i = 0; i < c.length; i++) { if (i < n - 1) { out[i] = null; continue; } var ys = 0, xy = 0, yy = 0; for (k = 0; k < n; k++) { var y = Math.log(c[i - n + 1 + k]); ys += y; xy += k * y; yy += y * y; } var ym = ys / n; var sxy = xy - n * xm * ym, sxx = xx - n * xm * xm, syy = yy - n * ym * ym; var r2 = sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0; out[i] = (sxy >= 0 ? 1 : -1) * r2; }
    return out;
  }

  function indicatorSeries(bars) {
    var c = bars.c, h = bars.h || bars.c, l = bars.l || bars.c, v = bars.v || [];
    var n = c.length;
    var s = { n: n, c: c, h: h, l: l, v: v, t: bars.t,
      sma25: sma(c, 25), sma75: sma(c, 75), rsi14: rsiWilder(c, 14), atr14: atrWilder(h, l, c, 14),
      vol20: sma(v, 20), vol60: sma(v, 60), sd60: stdevReturns(c, 60), dd120: maxDrawdown(c, 120), r2: trendR2(c, 120) };
    s.above75 = new Array(n); var cnt = 0; for (var i = 0; i < n; i++) { var a = isNum(s.sma75[i]) && c[i] > s.sma75[i] ? 1 : 0; cnt += a; if (i >= 120) cnt -= (isNum(s.sma75[i - 120]) && c[i - 120] > s.sma75[i - 120]) ? 1 : 0; s.above75[i] = i >= 119 ? cnt / 120 : null; }
    return s;
  }

  // 指標の断面（i 番目のバー時点）。volProj: 当日分の出来高を経過時間で換算する係数（1/経過割合）。
  function metricsAt(s, i, opt) {
    opt = opt || {};
    var c = s.c[i], prev = i > 0 ? s.c[i - 1] : null;
    var vRaw = s.v[i], vAdj = isNum(vRaw) ? vRaw * (opt.volProj || 1) : null;
    var vol20prev = (i > 0 && isNum(s.vol20[i - 1])) ? s.vol20[i - 1] : s.vol20[i]; // 当日を含めない20日平均
    var m = {
      close: c, prevClose: prev, chg: isNum(prev) && prev > 0 ? c / prev - 1 : null,
      sma25: s.sma25[i], sma75: s.sma75[i], rsi: s.rsi14[i], atr: s.atr14[i],
      atrPct: isNum(s.atr14[i]) && c > 0 ? s.atr14[i] / c : null,
      vol: vRaw, volAdj: vAdj, vol20: vol20prev, volRatio: isNum(vAdj) && isNum(vol20prev) && vol20prev > 0 ? vAdj / vol20prev : null,
      volProj: opt.volProj || 1,
      liq: isNum(vol20prev) ? vol20prev * c : null,
      ret20: i >= 20 ? c / s.c[i - 20] - 1 : null, ret60: i >= 60 ? c / s.c[i - 60] - 1 : null, ret120: i >= 120 ? c / s.c[i - 120] - 1 : null,
      sd60: s.sd60[i], dd120: s.dd120[i], r2: s.r2[i], above75: s.above75[i],
      bars: i + 1
    };
    m.trendUp = isNum(m.sma25) && isNum(m.sma75) && c > m.sma25 && m.sma25 > m.sma75;
    return m;
  }

  // ---------- 採点 ----------
  function pctRank(values) { // null は無視。0..100
    var idx = []; for (var i = 0; i < values.length; i++) if (isNum(values[i])) idx.push(i);
    idx.sort(function (a, b) { return values[a] - values[b]; });
    var out = new Array(values.length); var n = idx.length;
    for (i = 0; i < n; i++) out[idx[i]] = n > 1 ? 100 * i / (n - 1) : 50;
    return out;
  }
  // rows: [{code, type, m}] → 各行に factors {mom,qual,vol,lowvol} を付与（0..100）
  function computeFactors(rows) {
    function col(f) { return rows.map(function (r) { return r.m ? f(r.m) : null; }); }
    var r20 = pctRank(col(function (m) { return m.ret20; })), r60 = pctRank(col(function (m) { return m.ret60; })), r120 = pctRank(col(function (m) { return m.ret120; }));
    var rr2 = pctRank(col(function (m) { return m.r2; })), rdd = pctRank(col(function (m) { return isNum(m.dd120) ? -m.dd120 : null; })), rab = pctRank(col(function (m) { return m.above75; }));
    var rvr = pctRank(col(function (m) { return m.volRatio; })), rliq = pctRank(col(function (m) { return m.liq; }));
    var ratr = pctRank(col(function (m) { return isNum(m.atrPct) ? -m.atrPct : null; })), rsd = pctRank(col(function (m) { return isNum(m.sd60) ? -m.sd60 : null; }));
    function w(a, wa, b, wb, c, wc) { var s = 0, ws = 0; if (isNum(a)) { s += a * wa; ws += wa; } if (isNum(b)) { s += b * wb; ws += wb; } if (isNum(c)) { s += c * wc; ws += wc; } return ws > 0 ? s / ws : null; }
    rows.forEach(function (r, i) {
      if (!r.m) { r.f = null; return; }
      r.f = {
        mom: w(r60[i], 0.5, r20[i], 0.3, r120[i], 0.2),
        qual: w(rr2[i], 0.5, rdd[i], 0.3, rab[i], 0.2),
        vol: r.type === 'fund' ? 50 : w(rvr[i], 0.6, rliq[i], 0.4),
        lowvol: w(ratr[i], 0.5, rsd[i], 0.5)
      };
    });
    return rows;
  }
  function scoreFor(f, pat) { if (!f) return null; var s = 0, ws = 0; ['mom', 'qual', 'vol', 'lowvol'].forEach(function (k) { if (isNum(f[k])) { s += f[k] * pat.w[k]; ws += pat.w[k]; } }); return ws > 0 ? s / ws : null; }
  function scoreAll(f) { var o = {}; PATTERNS.forEach(function (p) { o[p.id] = scoreFor(f, p); }); return o; }

  // ---------- 状態 ----------
  function newState(pat) { return { id: pat.id, cash: pat.capital, positions: [], peak: pat.capital, halted: null, riskMult: 1, realized: 0, taxPaid: 0, startDate: null, lastEquity: pat.capital }; }
  function equityOf(st, priceOf) { var e = st.cash; st.positions.forEach(function (p) { var px = priceOf(p.code); e += (isNum(px) ? px : p.entry) * p.qty; }); return e; }
  function positionValue(st, priceOf, filter) { var v = 0; st.positions.forEach(function (p) { if (!filter || filter(p)) { var px = priceOf(p.code); v += (isNum(px) ? px : p.entry) * p.qty; } }); return v; }
  function heatOf(st, priceOf) { var h = 0; st.positions.forEach(function (p) { var px = priceOf(p.code); px = isNum(px) ? px : p.entry; h += Math.max(0, px - p.stop) * p.qty; }); return h; }

  // ---------- 判定 ----------
  /**
   * runScan: 1パターン分のスキャンを実行
   * ctx = { pat, state, rows:[{code,name,sector,type,unit,m,f,fresh,freshDate,limitUp,limitDown}], regime:{status:'bull'|'bear'|'unknown', text}, today:'YYYY-MM-DD', now:Date,
   *         earnings:{code:'YYYY-MM-DD'}, extraHolidays, isBacktest }
   * 返り値 { state, trades:[], judgments:{code:{...}}, notes:[] }
   */
  function runScan(ctx) {
    var pat = ctx.pat, st = JSON.parse(JSON.stringify(ctx.state)), rows = ctx.rows, today = ctx.today;
    var trades = [], notes = [], judg = {};
    var byCode = {}; rows.forEach(function (r) { byCode[r.code] = r; });
    function priceOf(code) { var r = byCode[code]; return r && r.m ? r.m.close : null; }
    function freshOk(r) { return ctx.isBacktest || (r.fresh === true); }
    if (!st.startDate) st.startDate = today;
    if (st.halted === today) { notes.push('本日は−20%到達により停止中'); st.lastEquity = equityOf(st, priceOf); return { state: st, trades: trades, judgments: judg, notes: notes }; }

    var eq0 = equityOf(st, priceOf);
    if (eq0 > st.peak) st.peak = eq0;
    var dd = eq0 / st.peak - 1;
    st.riskMult = dd <= RULES.dd1 ? 0.5 : 1;
    var noNewBuy = [];
    if (dd <= RULES.dd2) noNewBuy.push('ドローダウン' + pct(dd) + '≤−15%');
    if (ctx.regime.status !== 'bull') noNewBuy.push(ctx.regime.status === 'bear' ? 'レジーム弱気（TOPIX・日経とも75日線割れ）' : 'レジーム判定不能（フェイルクローズ）');

    // ---- 全売却（−20%） ----
    if (dd <= RULES.dd3) {
      st.positions.slice().forEach(function (p) { var r = byCode[p.code]; sellPosition(p, r, 'ドローダウン' + pct(dd) + '到達（−20%ガードレール）で全売却', 'guard'); });
      st.halted = today; notes.push('−20%到達: 全売却し当日停止');
      st.lastEquity = equityOf(st, priceOf);
      return { state: st, trades: trades, judgments: judg, notes: notes };
    }

    // ---- 売り判定（機械的ルールは常に継続） ----
    st.positions.slice().forEach(function (p) {
      var r = byCode[p.code]; if (!r || !r.m) { judg[p.code] = mkJ(p.code, 'hold', '価格データなし→保持', {}); return; }
      if (!freshOk(r)) { judg[p.code] = mkJ(p.code, 'hold', '価格が当日取得でないため判定保留（古いデータで売買しない）', {}); return; }
      var m = r.m, px = m.close;
      if (px > p.high) p.high = px;
      var gain = px / p.entry - 1;
      if (!p.trailing && gain >= RULES.trailTrigger) { p.trailing = true; }
      if (p.trailing && isNum(m.atr)) { var ts = roundTick(p.high - RULES.trailAtrMult * m.atr, -1); if (ts > p.stop) p.stop = ts; }
      var why = null, kind = null;
      if (px <= p.stop) { why = (p.trailing ? 'トレーリングストップ' : '損切り') + '到達: 現値' + fmtPx(px) + ' ≤ ストップ' + fmtPx(p.stop); kind = p.trailing ? 'trail' : 'stop'; }
      else if (r.type !== 'fund' && isNum(m.sma75) && px < m.sma75) { why = '75日線割れ: 現値' + fmtPx(px) + ' < 75日線' + fmtPx(m.sma75); kind = 'ma75'; }
      else if (r.type === 'fund' && isNum(m.sma75) && px < m.sma75) { why = '基準価額が75日線割れ: ' + fmtPx(px) + ' < ' + fmtPx(m.sma75); kind = 'ma75'; }
      if (why) sellPosition(p, r, why, kind);
      else judg[p.code] = mkJ(p.code, 'hold', '保持: ストップ' + fmtPx(p.stop) + '（距離' + pct((px - p.stop) / px) + '）' + (p.trailing ? '・トレーリング中' : '・+' + pct(RULES.trailTrigger, 0) + 'でトレーリング開始') + '、75日線' + fmtPx(m.sma75), { stop: p.stop, gain: gain });
    });

    // ---- 買い判定 ----
    var eq = equityOf(st, priceOf);
    if (noNewBuy.length) { notes.push('新規買い停止: ' + noNewBuy.join('、')); }
    else if (st.positions.length >= pat.maxPos) { notes.push('保有数上限（' + pat.maxPos + '）'); }
    else {
      var held = {}; st.positions.forEach(function (p) { held[p.code] = true; });
      var sectorCnt = {}; st.positions.forEach(function (p) { sectorCnt[p.sector] = (sectorCnt[p.sector] || 0) + 1; });
      var cands = [];
      rows.forEach(function (r) {
        if (held[r.code] || !r.m || !r.f) return;
        var m = r.m, s = scoreFor(r.f, pat); if (!isNum(s)) return;
        var sAdj = s, adjNote = '';
        if (pat.sectorAdj) { var n = sectorCnt[r.sector] || 0; var adj = n > 0 ? -RULES.sectorPenalty * n : RULES.sectorBonus; sAdj = s + adj; adjNote = '業種調整' + (adj >= 0 ? '+' : '') + adj + '（' + r.sector + (n > 0 ? '保有' + n + '件' : '未保有') + '）'; }
        var fails = [];
        if (!freshOk(r)) fails.push('価格が当日取得でない');
        if (!m.trendUp) fails.push('上昇トレンド不成立（終値' + fmtPx(m.close) + '/25日' + fmtPx(m.sma25) + '/75日' + fmtPx(m.sma75) + '）');
        if (!isNum(m.rsi) || m.rsi < RULES.rsiMin || m.rsi > RULES.rsiMax) fails.push('RSI' + (isNum(m.rsi) ? m.rsi.toFixed(0) : '—') + 'が' + RULES.rsiMin + '〜' + RULES.rsiMax + '外');
        if (r.type !== 'fund' && (!isNum(m.volRatio) || m.volRatio < RULES.volRatioMin)) fails.push('出来高' + (isNum(m.volRatio) ? m.volRatio.toFixed(2) + '倍' : '—') + '<' + RULES.volRatioMin + '倍');
        if (sAdj < pat.th) fails.push('スコア' + sAdj.toFixed(1) + '<閾値' + pat.th);
        if (m.bars < 80) fails.push('履歴不足（' + m.bars + '本）');
        if (ctx.earnings && ctx.earnings[r.code]) { var ed = ctx.earnings[r.code]; var bd = businessDaysBetween(today, ed, ctx.extraHolidays); if (ed >= today && bd <= RULES.earningsBlockDays) fails.push('決算発表' + ed + 'の2営業日前〜当日'); }
        if (r.type !== 'fund' && isNum(r.limitUp) && m.close >= r.limitUp) fails.push('ストップ高（約定不可）');
        var gate = fails.length === 0;
        judg[r.code] = mkJ(r.code, gate ? 'cand' : 'skip', gate ? '買い候補: スコア' + sAdj.toFixed(1) + '≥' + pat.th : '見送り: ' + fails.join('／'), { score: s, scoreAdj: sAdj, adjNote: adjNote, fails: fails });
        if (gate) cands.push({ r: r, s: sAdj, s0: s, adjNote: adjNote });
      });
      cands.sort(function (a, b) { return b.s - a.s; });
      var slots = pat.maxPos - st.positions.length;
      for (var i = 0; i < cands.length && slots > 0; i++) {
        var cd = cands[i], r = cd.r, m = r.m;
        var res = sizePosition(st, pat, r, eq, priceOf, sectorCnt);
        if (res.qty <= 0) { judg[r.code] = mkJ(r.code, 'skip', '見送り: ' + res.reason, { score: cd.s0, scoreAdj: cd.s, sizing: res }); continue; }
        var fill = r.type === 'fund' ? m.close : roundTick(m.close * (1 + slipOf(m)), +1);
        var cost = fill * res.qty;
        if (cost > st.cash) { res.qty = r.type === 'fund' ? Math.floor(st.cash / fill / RULES.fundUnit) * RULES.fundUnit : Math.floor(st.cash / fill / r.unit) * r.unit; cost = fill * res.qty; if (res.qty <= 0) { judg[r.code] = mkJ(r.code, 'skip', '見送り: 現金不足', { score: cd.s0, scoreAdj: cd.s, sizing: res }); continue; } }
        var stop = r.type === 'fund' ? round(fill - RULES.atrMult * m.atr, 0) : roundTick(fill - RULES.atrMult * m.atr, -1);
        var pos = { code: r.code, name: r.name, sector: r.sector, type: r.type, qty: res.qty, entry: fill, entryDate: today, stop: stop, high: fill, atrAtEntry: m.atr, core: res.core, trailing: false, unit: r.unit };
        st.cash -= cost; st.positions.push(pos); sectorCnt[r.sector] = (sectorCnt[r.sector] || 0) + 1; slots--;
        var expl = buyExplanation(pat, r, m, cd, res, fill, stop, ctx);
        trades.push({ ts: ctx.now ? ctx.now.toISOString() : today, date: today, pattern: pat.id, side: 'buy', code: r.code, name: r.name, sector: r.sector, type: r.type, qty: res.qty, price: fill, amount: cost, refPrice: m.close, slip: fill - m.close, stop: stop, score: cd.s, kind: 'entry', reasonShort: expl.short, reasonFull: expl.full, detail: expl.detail });
        judg[r.code] = mkJ(r.code, 'buy', expl.short, { score: cd.s0, scoreAdj: cd.s, sizing: res });
      }
    }
    st.lastEquity = equityOf(st, priceOf);
    if (st.lastEquity > st.peak) st.peak = st.lastEquity;
    return { state: st, trades: trades, judgments: judg, notes: notes };

    function sellPosition(p, r, why, kind) {
      var m = r.m, px = m.close;
      if (r.type !== 'fund' && isNum(r.limitDown) && px <= r.limitDown) { judg[p.code] = mkJ(p.code, 'hold', '売り条件成立だがストップ安で約定不可: ' + why, {}); return; }
      var fill = r.type === 'fund' ? px : roundTick(px * (1 - slipOf(m)), -1);
      var qty = p.qty;
      if (r.type !== 'fund' && isNum(m.vol20)) { var cap = Math.floor(m.vol20 * RULES.fillCapVolPct / r.unit) * r.unit; if (cap > 0 && qty > cap) qty = cap; }
      if (qty <= 0) { judg[p.code] = mkJ(p.code, 'hold', '売り条件成立だが約定上限（20日平均出来高の1%）が1単位未満', {}); return; }
      var proceeds = fill * qty, pnl = (fill - p.entry) * qty, tax = pnl > 0 ? round(pnl * RULES.tax, 0) : 0;
      st.cash += proceeds - tax; st.realized += pnl - tax; st.taxPaid += tax;
      p.qty -= qty; if (p.qty <= 0) st.positions.splice(st.positions.indexOf(p), 1);
      var full = why + '。参照値' + fmtPx(px) + '→約定' + fmtPx(fill) + '（スリッページ' + pct(slipOf(m), 2) + '＋呼値丸め）、' + qty + (r.type === 'fund' ? '円' : '株/口') + (qty < p.qty + qty ? '（約定上限により一部）' : '') + '、損益' + (pnl >= 0 ? '+' : '') + fmtYen(pnl) + '円、仮想税' + fmtYen(tax) + '円。取得' + fmtPx(p.entry) + '（' + p.entryDate + '）、最高値' + fmtPx(p.high) + '、ストップ' + fmtPx(p.stop) + '。';
      trades.push({ ts: ctx.now ? ctx.now.toISOString() : today, date: today, pattern: pat.id, side: 'sell', code: p.code, name: p.name, sector: p.sector, type: p.type, qty: qty, price: fill, amount: proceeds, refPrice: px, slip: px - fill, pnl: pnl, tax: tax, kind: kind, reasonShort: why, reasonFull: full, detail: { entry: p.entry, entryDate: p.entryDate, high: p.high, stop: p.stop, sma75: m.sma75, atr: m.atr } });
      judg[p.code] = mkJ(p.code, 'sell', why, { pnl: pnl });
    }
  }

  function slipOf(m) { return RULES.slipBase + RULES.slipAtrK * (isNum(m.atrPct) ? m.atrPct : 0.02); }
  function mkJ(code, action, text, extra) { var j = { code: code, action: action, text: text }; for (var k in extra) j[k] = extra[k]; return j; }

  function sizePosition(st, pat, r, eq, priceOf, sectorCnt) {
    var m = r.m, unit = r.type === 'fund' ? RULES.fundUnit : r.unit;
    var core = pat.core && (r.type === 'etf_index' || r.type === 'fund');
    var riskYen = eq * RULES.riskPct * st.riskMult;
    if (!isNum(m.atr) || m.atr <= 0) return { qty: 0, reason: 'ATRなし' };
    var stopDist = RULES.atrMult * m.atr;
    var qtyRisk = riskYen / stopDist; // 株数（投信は「円」換算なので別）
    var steps = [];
    var qty, maxVal;
    if (r.type === 'fund') {
      // 投信: 金額買付。損切り距離は基準価額比 → 金額 = リskYen / (stopDist/NAV)
      var amtRisk = riskYen / (stopDist / m.close);
      steps.push('リスク1%=' + fmtYen(riskYen) + '円 ÷ 損切り幅' + pct(stopDist / m.close, 2) + '（2×ATR） = ' + fmtYen(amtRisk) + '円');
      qty = amtRisk; unit = RULES.fundUnit;
    } else {
      steps.push('リスク' + (RULES.riskPct * st.riskMult * 100).toFixed(1) + '%=' + fmtYen(riskYen) + '円 ÷ 損切り幅' + fmtPx(stopDist) + '円（2×ATR ' + fmtPx(m.atr) + '） = ' + qtyRisk.toFixed(1) + '株');
      qty = qtyRisk;
    }
    // 上限: 単一銘柄 / コア
    var capPct = core ? RULES.coreCap : RULES.singleCap;
    maxVal = capPct * eq;
    if (core) { var coreVal = positionValue(st, priceOf, function (p) { return p.core; }); maxVal = Math.max(0, RULES.coreCap * eq - coreVal); steps.push('コア枠70%: 残り' + fmtYen(maxVal) + '円'); }
    else steps.push('単一銘柄25%: ' + fmtYen(maxVal) + '円');
    // 業種30%
    if (!core) { var secVal = positionValue(st, priceOf, function (p) { return p.sector === r.sector; }); var secRoom = Math.max(0, RULES.sectorCap * eq - secVal); if (secRoom < maxVal) { maxVal = secRoom; steps.push('業種30%（' + r.sector + '）: 残り' + fmtYen(secRoom) + '円'); } }
    // ヒート6%
    var heat = heatOf(st, priceOf); var heatRoom = Math.max(0, RULES.heatCap * eq - heat);
    steps.push('ヒート: 現在' + pct(heat / eq) + '、残り' + fmtYen(heatRoom) + '円');
    var qtyByVal = r.type === 'fund' ? maxVal : maxVal / m.close;
    var qtyByHeat = r.type === 'fund' ? heatRoom / (stopDist / m.close) : heatRoom / stopDist;
    var q = Math.min(qty, qtyByVal, qtyByHeat);
    var limiter = q === qty ? 'リスク1%' : q === qtyByVal ? '金額上限' : 'ヒート上限';
    if (r.type !== 'fund' && isNum(m.vol20)) { var fillCap = m.vol20 * RULES.fillCapVolPct; if (fillCap < q) { q = fillCap; limiter = '約定上限（20日平均出来高の1%）'; } }
    var qf = Math.floor(q / unit) * unit;
    steps.push('制約後' + (r.type === 'fund' ? fmtYen(q) + '円' : q.toFixed(1) + '株') + '（' + limiter + '）→ ' + unit + (r.type === 'fund' ? '円' : '株') + '単位に切り捨て ' + (r.type === 'fund' ? fmtYen(qf) + '円' : qf + '株'));
    if (qf <= 0) return { qty: 0, reason: (r.type === 'fund' ? '1,000円未満' : '1単位（' + unit + '株）未満') + '（' + steps.join('／') + '）', steps: steps, core: core };
    return { qty: qf, steps: steps, core: core, limiter: limiter, riskYen: riskYen, stopDist: stopDist };
  }

  function buyExplanation(pat, r, m, cd, res, fill, stop, ctx) {
    var f = r.f;
    var isFund = r.type === 'fund';
    var cond = (isFund ? '基準価額' : '終値') + fmtPx(m.close) + ' > 25日線' + fmtPx(m.sma25) + ' > 75日線' + fmtPx(m.sma75) + '、RSI' + m.rsi.toFixed(0) + '（' + RULES.rsiMin + '〜' + RULES.rsiMax + '）' + (isFund ? '' : '、出来高' + m.volRatio.toFixed(2) + '倍（20日平均比' + (m.volProj > 1 ? '・当日分は経過時間で換算' : '') + '）≥' + RULES.volRatioMin);
    var sc = 'スコア' + cd.s.toFixed(1) + ' ≥ 閾値' + pat.th + '［' + pat.name + ': モメ' + f.mom.toFixed(0) + '×' + pat.w.mom + '% 品質' + f.qual.toFixed(0) + '×' + pat.w.qual + '% 出来高' + f.vol.toFixed(0) + '×' + pat.w.vol + '% 低ボラ' + f.lowvol.toFixed(0) + '×' + pat.w.lowvol + '%' + (cd.adjNote ? '、' + cd.adjNote : '') + '］';
    var sz = res.steps.join('／');
    var ex = '出口: 損切り' + fmtPx(stop) + '（約定値−2×ATR）、75日線割れで売却、含み益+10%以降は最高値−2×ATRのトレーリングストップ';
    var fillTxt = isFund ? '基準価額' + fmtPx(fill) + 'で' + fmtYen(res.qty) + '円分（実際の約定は翌営業日基準価額になる点は未再現）' : '参照値' + fmtPx(m.close) + '→約定' + fmtPx(fill) + '（スリッページ' + pct(slipOf(m), 2) + '＋呼値切り上げ）×' + res.qty + '株 = ' + fmtYen(fill * res.qty) + '円';
    var short = '買い: スコア' + cd.s.toFixed(0) + '/' + pat.th + '、' + (isFund ? '基準価額' : '終値') + '>25日>75日、RSI' + m.rsi.toFixed(0) + (isFund ? '' : '、出来高' + m.volRatio.toFixed(1) + '倍') + '、' + (isFund ? fmtYen(res.qty) + '円' : res.qty + '株') + '（' + res.limiter + '）、損切り' + fmtPx(stop);
    var full = '【条件】' + cond + '\n【採点】' + sc + '\n【サイズ】' + sz + '\n【約定】' + fillTxt + '\n【' + ex.replace(': ', '】') + '\n【レジーム】' + (ctx.regime.text || ctx.regime.status);
    return { short: short, full: full, detail: { cond: cond, score: sc, size: sz, fill: fillTxt, exit: ex, regime: ctx.regime.text, factors: f, weights: pat.w, threshold: pat.th } };
  }

  // ---------- レジーム ----------
  function regimeOf(topixM, n225M, fresh) {
    if (!topixM || !n225M || !isNum(topixM.sma75) || !isNum(n225M.sma75) || !fresh) return { status: 'unknown', text: '判定不能: 指数の当日データまたは75日線が取得できていない（新規買い停止）', topix: topixM, n225: n225M };
    var tBelow = topixM.close < topixM.sma75, nBelow = n225M.close < n225M.sma75;
    var st = tBelow && nBelow ? 'bear' : 'bull';
    return { status: st, text: (st === 'bear' ? '弱気: ' : '強気/中立: ') + 'TOPIX代替' + fmtPx(topixM.close) + (tBelow ? ' < ' : ' ≥ ') + '75日線' + fmtPx(topixM.sma75) + '、日経代替' + fmtPx(n225M.close) + (nBelow ? ' < ' : ' ≥ ') + '75日線' + fmtPx(n225M.sma75), topix: topixM, n225: n225M };
  }

  // ---------- バックテスト（日次終値、過去 N 営業日） ----------
  /**
   * series: {code: {bars, meta:{name,sector,type,unit}}}, days: 200
   * 日中値動き・出来高の日中換算・決算日・ストップ高安は再現しない（終値ベース）。
   */
  function backtest(seriesMap, pat, opts) {
    opts = opts || {}; var days = opts.days || 200;
    var codes = Object.keys(seriesMap); var ind = {}; var tIndex = {};
    var allT = {}; codes.forEach(function (c) { var s = indicatorSeries(seriesMap[c].bars); ind[c] = s; var map = {}; for (var i = 0; i < s.n; i++) { map[s.t[i]] = i; allT[s.t[i]] = 1; } tIndex[c] = map; });
    var dates = Object.keys(allT).sort(); var start = Math.max(0, dates.length - days);
    var st = newState(pat); var trades = [], nav = [];
    var tp = opts.topix || '1306.T', np = opts.n225 || '1321.T';
    for (var d = start; d < dates.length; d++) {
      var today = dates[d]; var rows = [];
      codes.forEach(function (c) { var i = tIndex[c][today]; if (i === undefined) return; var meta = seriesMap[c].meta; rows.push({ code: c, name: meta.name, sector: meta.sector, type: meta.type, unit: meta.unit || 100, m: metricsAt(ind[c], i), fresh: true }); });
      computeFactors(rows);
      var tr = rows.filter(function (r) { return r.code === tp; })[0], nr = rows.filter(function (r) { return r.code === np; })[0];
      var reg = regimeOf(tr && tr.m, nr && nr.m, true);
      var out = runScan({ pat: pat, state: st, rows: rows, regime: reg, today: today, isBacktest: true });
      st = out.state; out.trades.forEach(function (t) { trades.push(t); });
      nav.push({ date: today, equity: round(st.lastEquity, 0), cash: round(st.cash, 0), dd: round(st.lastEquity / st.peak - 1, 4), positions: st.positions.length, regime: reg.status });
    }
    var eqs = nav.map(function (x) { return x.equity; }); var ret = eqs.length ? eqs[eqs.length - 1] / pat.capital - 1 : 0;
    var maxDD = 0; nav.forEach(function (x) { if (x.dd < maxDD) maxDD = x.dd; });
    var wins = trades.filter(function (t) { return t.side === 'sell' && t.pnl > 0; }).length, sells = trades.filter(function (t) { return t.side === 'sell'; }).length;
    return { pattern: pat.id, days: nav.length, from: nav.length ? nav[0].date : null, to: nav.length ? nav[nav.length - 1].date : null, ret: ret, maxDD: maxDD, trades: trades.length, sells: sells, winRate: sells ? wins / sells : null, finalEquity: eqs[eqs.length - 1], nav: nav, tradeLog: trades, limits: ['日次終値のみ（日中の値動き・スキャン時刻の価格は再現していない）', '出来高の日中換算・決算日ブロック・ストップ高安は未適用', '指標は取得できた履歴の範囲で計算（開始直後は75日線等が未成立で買いが出ない）', 'スリッページ・呼値丸め・仮想税はフォワードと同じモデル'] };
  }

  return {
    PATTERNS: PATTERNS, RULES: RULES, FACTOR_NAMES: FACTOR_NAMES, SLOTS: SLOTS, HOLIDAYS: HOLIDAYS,
    tickSize: tickSize, roundTick: roundTick, priceLimit: priceLimit,
    ymdJST: ymdJST, hmJST: hmJST, isBusinessDayYmd: isBusinessDayYmd, nextBusinessDay: nextBusinessDay, prevBusinessDay: prevBusinessDay, businessDaysBetween: businessDaysBetween, addDaysYmd: addDaysYmd,
    inTradingHours: inTradingHours, sessionFraction: sessionFraction, nextSlot: nextSlot, currentSlot: currentSlot, slotLabel: slotLabel,
    indicatorSeries: indicatorSeries, metricsAt: metricsAt, computeFactors: computeFactors, scoreFor: scoreFor, scoreAll: scoreAll,
    newState: newState, equityOf: equityOf, runScan: runScan, regimeOf: regimeOf, backtest: backtest,
    fmtYen: fmtYen, fmtPx: fmtPx, pct: pct
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
