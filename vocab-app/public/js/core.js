/*
 * TubeTan core — 英単語の抽出・原形化・難易度判定・間隔反復(SRS)のロジック。
 * ブラウザ(window.TubeTanCore)・Node(require)の両方から使えるように UMD 形式で書いています。
 * DOM には一切触れません（テストとデータ生成ツールからも利用するため）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TubeTanCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 難易度レベル（単語の出現頻度順位にもとづく）
   * ------------------------------------------------------------------ */
  var LEVELS = [
    { lv: 1, min: 1, max: 1000, guide: '中学基礎' },
    { lv: 2, min: 1001, max: 2000, guide: '中学〜高1' },
    { lv: 3, min: 2001, max: 3000, guide: '高校基礎' },
    { lv: 4, min: 3001, max: 4000, guide: '高校標準' },
    { lv: 5, min: 4001, max: 5000, guide: '大学入試・英検2級' },
    { lv: 6, min: 5001, max: 6500, guide: '英検準1級' },
    { lv: 7, min: 6501, max: 8000, guide: '英検準1〜1級' },
    { lv: 8, min: 8001, max: 10000, guide: '英検1級' },
    { lv: 9, min: 10001, max: 14000, guide: 'ネイティブ並み' },
    { lv: 10, min: 14001, max: Infinity, guide: '専門的・まれな語' },
  ];

  /** 頻度順位 → レベル(1〜10)。順位なし(0/null)は最上位レベル扱い。 */
  function levelOfRank(rank) {
    if (!rank) return 10;
    for (var i = 0; i < LEVELS.length; i++) if (rank <= LEVELS[i].max) return LEVELS[i].lv;
    return 10;
  }

  /* ------------------------------------------------------------------ *
   * 原形化（lemmatize）
   *   1. 例外表(ovr)にあればそれを使う（went→go, studied→study など）
   *   2. 辞書の見出し語ならそのまま（interesting, building など）
   *   3. 規則変化を外した候補のうち、辞書にある最初のものを使う
   * 例外表はデータ生成時に「規則では正しく戻せない語」だけを収録しています。
   * ------------------------------------------------------------------ */
  var MONO_CVC = /^[^aeiouy]*[aeiou][^aeiouwxy]$/; // hop, car, us, writ …（-ing/-ed で子音を重ねない短い語幹）

  function isDoubled(s) {
    var n = s.length;
    return n >= 3 && s[n - 1] === s[n - 2] && !/[aeiou]/.test(s[n - 1]);
  }

  function stemCandidates(s, out) {
    if (s.length < 2) return;
    if (MONO_CVC.test(s)) out.push(s + 'e', s);
    else out.push(s, s + 'e');
    if (isDoubled(s)) out.push(s.slice(0, -1));
  }

  /** 規則変化から考えられる原形の候補（優先順）。 */
  function ruleCandidates(w) {
    var out = [];
    var n = w.length;
    if (n < 4) return out;
    if (/ies$/.test(w)) out.push(w.slice(0, -1), w.slice(0, -3) + 'y');
    else if (/ied$/.test(w)) out.push(w.slice(0, -1), w.slice(0, -2), w.slice(0, -3) + 'y');
    else if (/es$/.test(w)) {
      out.push(w.slice(0, -1), w.slice(0, -2));
      if (/ves$/.test(w)) out.push(w.slice(0, -3) + 'f', w.slice(0, -3) + 'fe');
    } else if (/s$/.test(w) && !/(ss|us|is)$/.test(w)) out.push(w.slice(0, -1));
    else if (/ing$/.test(w) && n >= 5) {
      if (/ying$/.test(w) && n >= 5) out.push(w.slice(0, -4) + 'ie');
      stemCandidates(w.slice(0, -3), out);
    } else if (/ed$/.test(w)) stemCandidates(w.slice(0, -2), out);
    else if (/(ier|iest)$/.test(w)) out.push(w.replace(/(ier|iest)$/, 'y'));
    else if (/est$/.test(w) && n >= 6) stemCandidates(w.slice(0, -3), out);
    else if (/er$/.test(w) && n >= 5) stemCandidates(w.slice(0, -2), out);
    else if (/ily$/.test(w)) out.push(w.slice(0, -3) + 'y');
    else if (/ally$/.test(w)) out.push(w.slice(0, -4), w.slice(0, -2));
    else if (/ly$/.test(w) && n >= 5) out.push(w.slice(0, -2), w.slice(0, -1) + 'e', w.slice(0, -2) + 'e');
    return out.filter(function (c) { return c.length >= 2 && c !== w; });
  }

  /**
   * @param {string} w 小文字の単語
   * @param {(w:string)=>boolean} has 辞書に見出し語があるか
   * @param {Map<string,string>} ovr 例外表
   * @returns {string|null} 原形（辞書で見つからなければ null）
   */
  function lemmatizeWith(w, has, ovr) {
    if (ovr && ovr.has(w)) return ovr.get(w);
    if (has(w)) return w;
    var cands = ruleCandidates(w);
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (has(c)) return ovr && ovr.has(c) ? ovr.get(c) : c;
    }
    return null;
  }

  /* ------------------------------------------------------------------ *
   * 辞書
   * データ形式（tools/build-dict.js が生成する public/data/dict.js）:
   *   entries: "word\t短い訳\tflags\t表記\n…"（先頭 ranked 行は頻度順。flags の P は固有名詞）
   *   詳しい訳は dict-detail.js に同じ順番で入っている（attachDetails で後から付ける）
   *   lemmas : "変化形\t原形\n…"
   * ------------------------------------------------------------------ */
  function Dictionary(raw) {
    this.map = new Map();
    this.list = [];
    this.ovr = new Map();
    this.version = (raw && raw.version) || '';
    this.hasDetails = false;
    if (!raw) return;
    var ranked = raw.ranked || 0;
    var lines = raw.entries ? raw.entries.split('\n') : [];
    for (var i = 0; i < lines.length; i++) {
      var f = lines[i].split('\t');
      var e = { w: f[0], s: f[1] || '', l: '', r: i < ranked ? i + 1 : 0, p: (f[2] || '').indexOf('P') >= 0, d: f[3] || f[0] };
      this.list.push(e);
      if (e.w && !this.map.has(e.w)) this.map.set(e.w, e);
    }
    var lm = raw.lemmas ? raw.lemmas.split('\n') : [];
    for (var j = 0; j < lm.length; j++) {
      var p = lm[j].split('\t');
      if (p.length === 2) this.ovr.set(p[0], p[1]);
    }
  }
  /** 詳細な訳（dict-detail.js）を後から読み込んで各項目に付ける */
  Dictionary.prototype.attachDetails = function (raw) {
    if (!raw || !raw.details) return;
    var lines = raw.details.split('\n');
    for (var i = 0; i < lines.length && i < this.list.length; i++) this.list[i].l = lines[i];
    this.hasDetails = true;
  };
  Dictionary.prototype.has = function (w) { return this.map.has(w); };
  Dictionary.prototype.get = function (w) { return this.map.get(w) || null; };
  Dictionary.prototype.lemmatize = function (w) {
    var self = this;
    return lemmatizeWith(w, function (x) { return self.map.has(x); }, this.ovr);
  };
  /** 入力語（変化形でも可）→ 原形の辞書項目 */
  Dictionary.prototype.lookup = function (word) {
    var w = normalizeWord(word);
    if (!w) return null;
    var lemma = this.lemmatize(w);
    return lemma ? this.get(lemma) : null;
  };
  Dictionary.prototype.size = function () { return this.map.size; };

  /* ------------------------------------------------------------------ *
   * テキスト処理
   * ------------------------------------------------------------------ */
  function stripAccents(s) {
    return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s;
  }

  /** 表記ゆれを吸収して小文字・ASCII に寄せる（辞書引き用） */
  function normalizeWord(s) {
    return stripAccents(String(s || '').trim().toLowerCase()).replace(/[’‘`]/g, "'");
  }

  /** YouTube の URL / 動画ID → 11文字の動画ID（不正なら null） */
  function parseVideoId(input) {
    var s = String(input || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    var m = s.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  /** URL に含まれる開始時刻 (?t=90, &t=1m30s, #t=…) → 秒 */
  function parseStartTime(input) {
    var m = String(input || '').match(/[?&#]t=(\d+h)?(\d+m)?(\d+)?s?(?:&|$)/);
    if (!m) return 0;
    return (parseInt(m[1], 10) || 0) * 3600 + (parseInt(m[2], 10) || 0) * 60 + (parseInt(m[3], 10) || 0);
  }

  /** 字幕テキストのノイズ除去（[Music] や >> など） */
  function cleanCaption(text) {
    return String(text || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\((?:[^)]*\b(?:music|applause|laughter|laughs|laughing|inaudible|cheering|cheers|silence|crosstalk|sighs|chuckles)\b[^)]*)\)/gi, ' ')
      .replace(/[♪♫♬]/g, ' ')
      .replace(/>>+|&gt;&gt;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatTime(sec) {
    if (sec == null || isNaN(sec)) return '';
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var ss = (s < 10 ? '0' : '') + s;
    return h ? h + ':' + (m < 10 ? '0' : '') + m + ':' + ss : m + ':' + ss;
  }

  function parseTimestamp(str) {
    var p = String(str).trim().replace(',', '.').split(':');
    if (p.length < 2 || p.length > 3) return null;
    var total = 0;
    for (var i = 0; i < p.length; i++) {
      var v = parseFloat(p[i]);
      if (isNaN(v)) return null;
      total = total * 60 + v;
    }
    return total;
  }

  /**
   * 貼り付けられた字幕/文章 → [{start, text}]
   * 対応: YouTube「文字起こし」をコピーした形式（0:03 の行 + テキスト行）、SRT / WebVTT、普通の文章
   */
  function parsePastedTranscript(text) {
    var src = String(text || '').replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    var lines = src.split('\n');
    var segs = [];
    var CUE = /^\s*((?:\d+:)?\d{1,2}:\d{2}(?:[.,]\d+)?)\s*-->\s*((?:\d+:)?\d{1,2}:\d{2}(?:[.,]\d+)?)/;
    var TS_LINE = /^\s*(\d{1,2}(?::\d{2}){1,2})\s*$/;
    var TS_PREFIX = /^\s*(\d{1,2}(?::\d{2}){1,2})\s+(.+)$/;
    var i, m;

    // SRT / WebVTT
    var cueCount = 0;
    for (i = 0; i < lines.length; i++) if (CUE.test(lines[i])) cueCount++;
    if (cueCount >= 2) {
      var cur = null;
      for (i = 0; i < lines.length; i++) {
        var line = lines[i];
        if ((m = line.match(CUE))) {
          if (cur && cur.text) segs.push(cur);
          cur = { start: parseTimestamp(m[1]), text: '' };
        } else if (cur) {
          if (!line.trim()) { if (cur.text) { segs.push(cur); } cur = null; continue; }
          cur.text += (cur.text ? ' ' : '') + line.trim();
        }
      }
      if (cur && cur.text) segs.push(cur);
      return dedupeVttRollup(segs);
    }

    // YouTube の文字起こしパネル形式
    var tsCount = 0;
    for (i = 0; i < lines.length; i++) if (TS_LINE.test(lines[i]) || TS_PREFIX.test(lines[i])) tsCount++;
    if (tsCount >= 2 && tsCount >= lines.filter(function (l) { return l.trim(); }).length * 0.2) {
      var pending = null;
      for (i = 0; i < lines.length; i++) {
        var l = lines[i].trim();
        if (!l) continue;
        if ((m = l.match(TS_LINE))) {
          if (pending && pending.text) segs.push(pending);
          pending = { start: parseTimestamp(m[1]), text: '' };
        } else if ((m = l.match(TS_PREFIX))) {
          if (pending && pending.text) segs.push(pending);
          pending = { start: parseTimestamp(m[1]), text: m[2].trim() };
        } else if (pending) {
          pending.text += (pending.text ? ' ' : '') + l;
        } else {
          segs.push({ start: null, text: l });
        }
      }
      if (pending && pending.text) segs.push(pending);
      return segs;
    }

    // 普通の文章: 段落・文ごとに区切る
    var paragraphs = src.split(/\n\s*\n/);
    for (i = 0; i < paragraphs.length; i++) {
      var p = paragraphs[i].replace(/\s+/g, ' ').trim();
      if (!p) continue;
      var sentences = p.match(/[^.!?。！？]+(?:[.!?。！？]+["'”’)\]]*|$)/g) || [p];
      for (var k = 0; k < sentences.length; k++) {
        var s = sentences[k].trim();
        if (s) segs.push({ start: null, text: s });
      }
    }
    return segs;
  }

  /** 自動字幕の WebVTT は前の行を繰り返す（ロールアップ）ので重複を除く */
  function dedupeVttRollup(segs) {
    var out = [];
    var prev = '';
    for (var i = 0; i < segs.length; i++) {
      var t = segs[i].text;
      if (t === prev) continue;
      if (prev && t.indexOf(prev) === 0) t = t.slice(prev.length).trim();
      prev = segs[i].text;
      if (t) out.push({ start: segs[i].start, text: t });
    }
    return out;
  }

  var TOKEN_RE = /[A-Za-zÀ-ɏ]+(?:['’][A-Za-z]+)*(?:-[A-Za-zÀ-ɏ]+(?:['’][A-Za-z]+)*)*/g;
  var CONTRACTION_RE = /'(?:t|re|ve|ll|d|m)$/;

  /**
   * 1トークン → 辞書引き用の語（ハイフン語は辞書になければ分割）
   * @returns {{w:string, off:number, len:number}[]}  off/len はトークン内の位置
   */
  function splitToken(raw, has) {
    var norm = normalizeWord(raw);
    if (norm.indexOf('-') >= 0) {
      if (has && has(norm)) return [{ w: norm, off: 0, len: raw.length }];
      var parts = [];
      var re = /[^-]+/g, m;
      while ((m = re.exec(norm))) parts = parts.concat(splitToken(raw.substr(m.index, m[0].length), has).map(function (p) {
        return { w: p.w, off: p.off + m.index, len: p.len };
      }));
      return parts;
    }
    if (norm.indexOf("'") >= 0) {
      if (/'s$/.test(norm)) { // 所有格 / is の短縮 → 語幹だけ使う
        norm = norm.slice(0, -2);
        return norm.indexOf("'") >= 0 ? [] : [{ w: norm, off: 0, len: norm.length }];
      }
      if (CONTRACTION_RE.test(norm)) return []; // don't, I'm などは機能語なので対象外
      return [];
    }
    return [{ w: norm, off: 0, len: raw.length }];
  }

  /* ------------------------------------------------------------------ *
   * 語彙抽出
   * ------------------------------------------------------------------ */
  var CONTEXT_MAX = 180;

  function findSentenceBounds(full) {
    // 文末記号で区切る。句読点の無い自動字幕では極端に長い「文」になるので後で窓を切る。
    var bounds = [];
    var re = /[.!?…]+["'”’)\]]*\s+|\s{2,}/g, m, start = 0;
    while ((m = re.exec(full))) {
      var end = m.index + m[0].length;
      bounds.push([start, end]);
      start = end;
    }
    if (start < full.length) bounds.push([start, full.length]);
    return bounds;
  }

  function bsearch(arr, pos, key) {
    var lo = 0, hi = arr.length - 1, ans = 0;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var v = key == null ? arr[mid] : arr[mid][key];
      if (v <= pos) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans;
  }

  function makeContext(full, bound, pos, len) {
    var a = bound[0], b = bound[1];
    var pre = '', post = '';
    if (b - a > CONTEXT_MAX) {
      var half = Math.floor((CONTEXT_MAX - len) / 2);
      var na = Math.max(a, pos - half), nb = Math.min(b, pos + len + half);
      if (na > a) { var sp = full.indexOf(' ', na); if (sp >= 0 && sp < pos) na = sp + 1; pre = '…'; }
      if (nb < b) { var sp2 = full.lastIndexOf(' ', nb); if (sp2 > pos + len) nb = sp2; post = '…'; }
      a = na; b = nb;
    }
    var slice = full.slice(a, b);
    var lead = slice.length - slice.replace(/^\s+/, '').length;
    var text = slice.trim();
    return { text: pre + text + post, hl: [pre.length + (pos - a - lead), len] };
  }

  /**
   * 字幕セグメントから語彙を抽出する。
   * @param {{start:number|null, text:string}[]} segments
   * @param {Dictionary} dict
   * @param {{maxContexts?:number, includeProper?:boolean}} [opts]
   */
  function extractVocabulary(segments, dict, opts) {
    opts = opts || {};
    var maxContexts = opts.maxContexts || 3;
    var has = function (w) { return dict.has(w); };

    var full = '';
    var segIndex = []; // {pos, start}
    for (var i = 0; i < segments.length; i++) {
      var t = cleanCaption(segments[i].text);
      if (!t) continue;
      segIndex.push({ pos: full.length, start: segments[i].start == null ? null : Number(segments[i].start) });
      full += t + ' ';
    }
    var bounds = findSentenceBounds(full);
    // 全部大文字の字幕（古いテレビ字幕など）では大文字＝固有名詞の手がかりにならない
    var caps = full.match(/\b[A-Z]{2,}\b/g) || [];
    var words = full.match(/\b[A-Za-z]{2,}\b/g) || [];
    var ignoreCase = words.length > 0 && caps.length / words.length > 0.5;
    // 句読点のほとんど無い自動字幕では、文頭が分からないので大文字＝固有名詞とはみなさない
    var punctuated = words.length > 0 && (full.match(/[.!?]/g) || []).length / words.length > 0.03;
    var items = new Map();
    var unknown = new Map();
    var totalTokens = 0;
    var order = 0;
    var m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(full))) {
      var raw = m[0];
      var pos = m.index;
      if (pos > 0 && /[0-9]/.test(full[pos - 1])) continue; // 1st, 2nd など
      var bIdx = bsearch(bounds, pos, 0);
      var bound = bounds[bIdx] || [0, full.length];
      var sentenceInitial = /^[\s"'“‘(\[\-–—]*$/.test(full.slice(bound[0], pos));
      var capitalized = !ignoreCase && /^[A-Z]/.test(raw);
      var parts = splitToken(raw, has);
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        if (p.w.length < 2 || !/^[a-z][a-z'-]*$/.test(p.w)) continue;
        totalTokens++;
        var lemma = dict.lemmatize(p.w);
        var seg = segIndex.length ? segIndex[bsearch(segIndex, pos, 'pos')] : null;
        var time = seg ? seg.start : null;
        if (!lemma) {
          if (capitalized && !sentenceInitial) continue; // 人名・地名など
          var u = unknown.get(p.w);
          if (!u) { u = { word: p.w, count: 0, time: time, context: makeContext(full, bound, pos + p.off, p.len) }; unknown.set(p.w, u); }
          u.count++;
          continue;
        }
        var entry = dict.get(lemma);
        if (entry.p && !opts.includeProper) continue;
        var item = items.get(lemma);
        if (!item) {
          item = { lemma: lemma, entry: entry, rank: entry.r, level: levelOfRank(entry.r), count: 0, forms: [], contexts: [], order: order++, firstTime: time, capitalizedOnly: true };
          items.set(lemma, item);
        }
        item.count++;
        if (!capitalized || sentenceInitial || !punctuated) item.capitalizedOnly = false;
        if (item.forms.indexOf(p.w) < 0) item.forms.push(p.w);
        if (item.contexts.length < maxContexts) {
          var ctx = makeContext(full, bound, pos + p.off, p.len);
          var dup = item.contexts.some(function (c) { return c.text === ctx.text; });
          if (!dup) { ctx.t = time; item.contexts.push(ctx); }
        }
      }
    }
    // 文中で常に大文字で始まる語は固有名詞の可能性が高い（Will, Bill など）
    var list = [];
    items.forEach(function (it) { list.push(it); });
    var unk = [];
    unknown.forEach(function (u) { unk.push(u); });
    unk.sort(function (a, b) { return b.count - a.count; });
    return { items: list, unknown: unk, totalTokens: totalTokens, stats: difficultyStats(list) };
  }

  /** 動画の難易度：トークンの何%を理解するのにどの順位までの語彙が必要か */
  function difficultyStats(items) {
    var byLevel = [];
    for (var i = 0; i < 10; i++) byLevel.push({ lv: i + 1, words: 0, tokens: 0 });
    var occ = [];
    var total = 0;
    items.forEach(function (it) {
      if (it.capitalizedOnly) return;
      byLevel[it.level - 1].words++;
      byLevel[it.level - 1].tokens += it.count;
      occ.push([it.rank || 1e9, it.count]);
      total += it.count;
    });
    occ.sort(function (a, b) { return a[0] - b[0]; });
    function rankFor(cov) {
      var acc = 0;
      for (var j = 0; j < occ.length; j++) {
        acc += occ[j][1];
        if (acc >= total * cov) return occ[j][0] >= 1e9 ? null : occ[j][0];
      }
      return null;
    }
    var r95 = total ? rankFor(0.95) : null;
    return { byLevel: byLevel, tokens: total, rank95: r95, level95: r95 ? levelOfRank(r95) : 10, rank98: total ? rankFor(0.98) : null };
  }

  /** 推定語彙数（順位）でこの語彙リストの何%をカバーできるか */
  function coverageForVocab(items, vocabRank, knownSet) {
    var total = 0, known = 0;
    items.forEach(function (it) {
      if (it.capitalizedOnly) return;
      total += it.count;
      if ((it.rank && it.rank <= vocabRank) || (knownSet && knownSet.has(it.lemma))) known += it.count;
    });
    return total ? known / total : 0;
  }

  /* ------------------------------------------------------------------ *
   * 間隔反復（SM-2 を簡略化したもの）
   *   grade: 0=もう一度 1=難しい 2=正解 3=簡単
   * ------------------------------------------------------------------ */
  var MIN = 60 * 1000, DAY = 24 * 60 * MIN;
  var LEARNING_STEPS = [1 * MIN, 10 * MIN];
  var MASTERED_DAYS = 21;

  function startOfDay(ts) {
    var d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function dayKey(ts) {
    var d = new Date(ts == null ? Date.now() : ts);
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function newSrs(now) {
    return { state: 'new', due: now || Date.now(), interval: 0, ease: 2.5, reps: 0, lapses: 0, step: 0, last: null };
  }

  function addDays(now, days) {
    return startOfDay(now) + Math.round(days) * DAY + 4 * 60 * MIN; // 翌日以降の午前4時に出題
  }

  /** 採点して次回の出題予定を計算（元のオブジェクトは変更しない） */
  function schedule(srs, grade, now) {
    now = now || Date.now();
    var s = Object.assign({}, srs || newSrs(now));
    s.reps = (s.reps || 0) + 1;
    s.last = now;
    if (s.state === 'new' || s.state === 'learning' || s.state === 'relearning') {
      var relearning = s.state === 'relearning';
      if (grade === 0) {
        s.state = relearning ? 'relearning' : 'learning';
        s.step = 0;
        s.due = now + LEARNING_STEPS[0];
      } else if (grade === 1) {
        s.state = relearning ? 'relearning' : 'learning';
        s.due = now + Math.max(LEARNING_STEPS[s.step || 0], 5 * MIN);
      } else if (grade === 2 && !relearning && (s.step || 0) < LEARNING_STEPS.length - 1 && s.state !== 'new') {
        s.step = (s.step || 0) + 1;
        s.due = now + LEARNING_STEPS[s.step];
      } else if (grade === 2 && s.state === 'new') {
        s.state = 'learning';
        s.step = 1;
        s.due = now + LEARNING_STEPS[1];
      } else {
        // 卒業 → 復習フェーズへ
        s.state = 'review';
        s.step = 0;
        s.interval = relearning ? Math.max(1, s.interval || 1) : grade === 3 ? 4 : 1;
        s.due = addDays(now, s.interval);
      }
      return s;
    }
    // review
    var ivl = s.interval || 1;
    if (grade === 0) {
      s.lapses = (s.lapses || 0) + 1;
      s.ease = Math.max(1.3, s.ease - 0.2);
      s.state = 'relearning';
      s.step = 0;
      s.interval = Math.max(1, Math.round(ivl * 0.3));
      s.due = now + LEARNING_STEPS[1];
      return s;
    }
    var late = Math.max(0, (now - s.due) / DAY); // 遅れて正解した分は少し加味
    if (grade === 1) {
      s.ease = Math.max(1.3, s.ease - 0.15);
      s.interval = Math.max(ivl + 1, ivl * 1.2);
    } else if (grade === 2) {
      s.interval = Math.max(ivl + 1, (ivl + late / 2) * s.ease);
    } else {
      s.ease = Math.min(3.2, s.ease + 0.15);
      s.interval = Math.max(ivl + 2, (ivl + late) * s.ease * 1.3);
    }
    s.interval = Math.min(Math.round(s.interval * 10) / 10, 3650);
    s.due = addDays(now, s.interval);
    return s;
  }

  function isDue(srs, now) {
    return !!srs && srs.state !== 'new' && srs.due <= (now || Date.now());
  }

  function isMastered(srs) {
    return !!srs && srs.state === 'review' && srs.interval >= MASTERED_DAYS;
  }

  /** 状態ラベル: new / learning / review / mastered */
  function cardStatus(srs) {
    if (!srs || srs.state === 'new') return 'new';
    if (isMastered(srs)) return 'mastered';
    if (srs.state === 'review') return 'review';
    return 'learning';
  }

  function humanizeInterval(ms) {
    if (ms < 60 * MIN) return Math.max(1, Math.round(ms / MIN)) + '分';
    if (ms < DAY) return Math.round(ms / (60 * MIN)) + '時間';
    var d = ms / DAY;
    if (d < 30) return Math.round(d) + '日';
    if (d < 365) return Math.round(d / 30) + 'か月';
    return (Math.round(d / 36.5) / 10) + '年';
  }

  /** 各ボタンを押した場合の次回までの間隔（表示用。1日以上はカレンダーの日数で数える） */
  function previewIntervals(srs, now) {
    now = now || Date.now();
    return [0, 1, 2, 3].map(function (g) {
      var s = schedule(srs, g, now);
      if (s.state === 'review' && s.interval >= 1) {
        var days = Math.round((startOfDay(s.due) - startOfDay(now)) / DAY);
        return humanizeInterval(Math.max(1, days) * DAY);
      }
      return humanizeInterval(Math.max(MIN, s.due - now));
    });
  }

  /* ------------------------------------------------------------------ *
   * 語彙力チェック
   * ------------------------------------------------------------------ */
  // 実在しない単語（「知ってる」と答えすぎた分を補正するため）
  var PSEUDOWORDS = ['flarnish', 'dobrify', 'plontic', 'grummet', 'vexilant', 'snorbid', 'trandle', 'cloverous', 'bimptious', 'quellard', 'spurnage', 'fendicate'];
  var BAND_SIZE = [1000, 1000, 1000, 1000, 1000, 1500, 1500, 2000, 4000, 6000];

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    rng = rng || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** レベルごとに perLevel 語ずつ出題語を選ぶ（+ 実在しない語を数個） */
  function sampleLevelTest(dict, perLevel, rng) {
    rng = rng || Math.random;
    perLevel = perLevel || 6;
    var byLevel = [];
    for (var i = 0; i < 10; i++) byLevel.push([]);
    dict.map.forEach(function (e) {
      if (!e.r || e.p || e.w.length < 3 || !/^[a-z]+$/.test(e.w) || !e.s) return;
      if (e.r < 300) return; // the, and などの機能語は除外
      if (e.r > 20000) return;
      byLevel[levelOfRank(e.r) - 1].push(e.w);
    });
    var items = [];
    for (var lv = 0; lv < 10; lv++) {
      shuffle(byLevel[lv], rng).slice(0, perLevel).forEach(function (w) { items.push({ word: w, lv: lv + 1 }); });
    }
    shuffle(PSEUDOWORDS, rng).slice(0, 4).forEach(function (w) { items.push({ word: w, lv: 0, fake: true }); });
    return shuffle(items, rng);
  }

  /**
   * @param {{lv:number, fake?:boolean, known:boolean}[]} answers
   * @returns {{size:number, perLevel:{lv:number, ratio:number}[], falseAlarm:number, recommendedLevel:number}}
   */
  function estimateVocabulary(answers) {
    var fakes = answers.filter(function (a) { return a.fake; });
    var fa = fakes.length ? fakes.filter(function (a) { return a.known; }).length / fakes.length : 0;
    var perLevel = [];
    var size = 0;
    for (var lv = 1; lv <= 10; lv++) {
      var qs = answers.filter(function (a) { return !a.fake && a.lv === lv; });
      if (!qs.length) { perLevel.push({ lv: lv, ratio: 0 }); continue; }
      var raw = qs.filter(function (a) { return a.known; }).length / qs.length;
      var adj = fa >= 1 ? 0 : Math.max(0, (raw - fa) / (1 - fa));
      perLevel.push({ lv: lv, ratio: adj });
      size += BAND_SIZE[lv - 1] * adj;
    }
    size = Math.round(size / 10) * 10;
    // 1レベル6語ではばらつくので、推定語彙数の8割の位置を「ここから先は知らない語が増える」境目とする
    var recommended = size < 500 ? 1 : levelOfRank(Math.round(size * 0.8) + 1);
    return { size: size, perLevel: perLevel, falseAlarm: fa, recommendedLevel: recommended };
  }

  return {
    LEVELS: LEVELS,
    levelOfRank: levelOfRank,
    ruleCandidates: ruleCandidates,
    lemmatizeWith: lemmatizeWith,
    Dictionary: Dictionary,
    normalizeWord: normalizeWord,
    parseVideoId: parseVideoId,
    parseStartTime: parseStartTime,
    cleanCaption: cleanCaption,
    formatTime: formatTime,
    parseTimestamp: parseTimestamp,
    parsePastedTranscript: parsePastedTranscript,
    splitToken: splitToken,
    extractVocabulary: extractVocabulary,
    difficultyStats: difficultyStats,
    coverageForVocab: coverageForVocab,
    newSrs: newSrs,
    schedule: schedule,
    isDue: isDue,
    isMastered: isMastered,
    cardStatus: cardStatus,
    previewIntervals: previewIntervals,
    humanizeInterval: humanizeInterval,
    startOfDay: startOfDay,
    dayKey: dayKey,
    DAY: DAY,
    MIN: MIN,
    PSEUDOWORDS: PSEUDOWORDS,
    sampleLevelTest: sampleLevelTest,
    estimateVocabulary: estimateVocabulary,
    shuffle: shuffle,
    mulberry32: mulberry32,
  };
});
