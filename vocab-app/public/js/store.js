/*
 * TubeTan のデータ保存（すべてブラウザの localStorage に保存。サーバーには送りません）
 */
(function (root) {
  'use strict';
  var core = root.TubeTanCore;
  var PREFIX = 'tubetan:';
  var HISTORY_MAX = 12;

  var DEFAULT_SETTINGS = {
    newPerDay: 10, // 1日に新しく学ぶ単語数
    direction: 'en-ja', // カードの向き en-ja / ja-en
    autoSpeak: true, // カードを出すときに発音する
    voice: '', // 音声（空なら自動）
    rate: 0.9, // 読み上げの速さ
    level: 3, // 抽出時に表示する最低レベル
    showAdded: true, // 抽出結果に登録済みの単語も出す
    showKnown: false, // 「知ってる」にした単語も出す
    showProper: false, // 固有名詞っぽい語も出す
    sort: 'recommended',
    theme: 'auto',
    apiBase: '', // 字幕サーバーの URL（空なら同じサーバー）
    vocabSize: null, // 語彙力チェックの結果
  };

  var mem = {};
  var persistent = true;
  var listeners = {};

  function storageGet(key) {
    try {
      var v = root.localStorage.getItem(PREFIX + key);
      return v == null && mem[key] != null ? mem[key] : v;
    } catch (e) {
      persistent = false;
      return mem[key] == null ? null : mem[key];
    }
  }

  function isQuota(e) {
    return e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
  }

  /** 保存を試す。成功なら true、失敗ならエラーオブジェクトを返す */
  function trySet(key, str) {
    try {
      root.localStorage.setItem(PREFIX + key, str);
      delete mem[key];
      return true;
    } catch (e) {
      return e || new Error('storage');
    }
  }

  function storageSet(key, str) {
    var r = trySet(key, str);
    if (r === true) return true;
    if (isQuota(r) && key !== 'history' && trimHistoryForSpace() && trySet(key, str) === true) return true;
    mem[key] = str;
    persistent = false;
    emit('storage-error', r);
    return false;
  }

  function load(key, fallback) {
    var s = storageGet(key);
    if (s == null) return fallback;
    try {
      return JSON.parse(s);
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    return storageSet(key, JSON.stringify(value));
  }

  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
  }

  function emit(evt, data) {
    (listeners[evt] || []).forEach(function (fn) {
      try { fn(data); } catch (e) { console.error(e); }
    });
  }

  var Store = {
    settings: Object.assign({}, DEFAULT_SETTINGS),
    cards: {},
    known: new Set(),
    history: [],
    activity: {},
    on: on,
    emit: emit,
    isPersistent: function () { return persistent; },
  };

  Store.init = function () {
    // localStorage が使えるか確認
    try {
      root.localStorage.setItem(PREFIX + '_probe', '1');
      root.localStorage.removeItem(PREFIX + '_probe');
    } catch (e) {
      persistent = false;
    }
    Store.settings = Object.assign({}, DEFAULT_SETTINGS, load('settings', {}));
    Store.cards = load('cards', {}) || {};
    Store.known = new Set(load('known', []) || []);
    Store.history = load('history', []) || [];
    Store.activity = load('activity', {}) || {};
  };

  /* ---------------- 設定 ---------------- */
  Store.saveSettings = function (patch) {
    if (patch) Object.assign(Store.settings, patch);
    save('settings', Store.settings);
    emit('settings', Store.settings);
  };

  /* ---------------- 単語カード ---------------- */
  function saveCards() {
    save('cards', Store.cards);
    emit('cards');
  }
  Store.saveCards = saveCards;

  Store.getCard = function (w) {
    return Store.cards[w] || null;
  };
  Store.hasCard = function (w) {
    return Object.prototype.hasOwnProperty.call(Store.cards, w);
  };
  Store.allCards = function () {
    return Object.keys(Store.cards).map(function (k) { return Store.cards[k]; });
  };

  /**
   * 単語を追加（既にあれば例文だけ足す）
   * @param {{w:string, d?:string, m?:string, note?:string, ex?:object[], src?:string}} data
   */
  Store.addCard = function (data, opts) {
    var w = data.w;
    var existing = Store.cards[w];
    var now = Date.now();
    if (existing) {
      (data.ex || []).forEach(function (x) { addExample(existing, x); });
      if (!existing.m && data.m) existing.m = data.m;
    } else {
      var card = {
        w: w,
        d: data.d || w,
        m: data.m || '',
        note: data.note || '',
        ex: [],
        src: data.src || 'manual',
        added: now,
        srs: core.newSrs(now),
        ok: 0,
        ng: 0,
      };
      (data.ex || []).forEach(function (x) { addExample(card, x); });
      Store.cards[w] = card;
      Store.known.delete(w);
      logActivity('a', 1);
    }
    if (!opts || !opts.batch) {
      saveCards();
      save('known', Array.from(Store.known));
    }
    return Store.cards[w];
  };

  function addExample(card, x) {
    if (!x || !x.s) return;
    if (card.ex.some(function (e) { return e.s === x.s; })) return;
    card.ex.push({ s: x.s, hl: x.hl || null, v: x.v || null, t: x.t == null ? null : x.t, title: x.title || '' });
    if (card.ex.length > 5) card.ex.shift();
  }

  Store.updateCard = function (w, patch) {
    var c = Store.cards[w];
    if (!c) return null;
    Object.assign(c, patch);
    saveCards();
    return c;
  };

  Store.deleteCard = function (w) {
    var c = Store.cards[w];
    delete Store.cards[w];
    saveCards();
    return c;
  };

  /** 削除の取り消し用：カードをそのまま戻す */
  Store.restoreCard = function (card) {
    Store.cards[card.w] = card;
    saveCards();
  };

  Store.resetProgress = function (w) {
    var c = Store.cards[w];
    if (!c) return;
    c.srs = core.newSrs(Date.now());
    c.ok = 0;
    c.ng = 0;
    saveCards();
  };

  /* ---------------- 知ってる単語 ---------------- */
  Store.isKnown = function (w) {
    return Store.known.has(w);
  };
  Store.markKnown = function (w) {
    Store.known.add(w);
    save('known', Array.from(Store.known));
    emit('known');
  };
  Store.markKnownMany = function (words) {
    words.forEach(function (w) { Store.known.add(w); });
    save('known', Array.from(Store.known));
    emit('known');
  };
  Store.unmarkKnown = function (w) {
    Store.known.delete(w);
    save('known', Array.from(Store.known));
    emit('known');
  };
  Store.clearKnown = function () {
    Store.known = new Set();
    save('known', []);
    emit('known');
  };

  /* ---------------- 取り込み履歴 ---------------- */
  Store.addHistory = function (entry) {
    Store.history = Store.history.filter(function (h) { return h.id !== entry.id; });
    Store.history.unshift(entry);
    if (Store.history.length > HISTORY_MAX) Store.history.length = HISTORY_MAX;
    saveHistory();
    emit('history');
  };

  function saveHistory() {
    // 容量オーバーなら古いものから字幕本文を外していく
    var list = Store.history;
    for (var i = list.length; i > 0; i--) {
      var r = trySet('history', JSON.stringify(list));
      if (r === true) return true;
      if (!isQuota(r)) break;
      if (list[i - 1] && list[i - 1].segments) delete list[i - 1].segments;
    }
    return save('history', list);
  }

  function trimHistoryForSpace() {
    for (var i = Store.history.length - 1; i >= 0; i--) {
      if (Store.history[i].segments) {
        delete Store.history[i].segments;
        if (trySet('history', JSON.stringify(Store.history)) === true) return true;
      }
    }
    return false;
  }

  Store.getHistory = function (id) {
    for (var i = 0; i < Store.history.length; i++) if (Store.history[i].id === id) return Store.history[i];
    return null;
  };

  Store.removeHistory = function (id) {
    Store.history = Store.history.filter(function (h) { return h.id !== id; });
    saveHistory();
    emit('history');
  };

  /* ---------------- 学習の記録 ---------------- */
  // activity[YYYY-MM-DD] = { r: 復習した数, n: 新しく学んだ数, q: クイズ解答数, c: クイズ正解数, a: 追加した数 }
  function logActivity(kind, n) {
    var key = core.dayKey(Date.now());
    var day = Store.activity[key] || (Store.activity[key] = {});
    day[kind] = (day[kind] || 0) + (n == null ? 1 : n);
    // 古い記録（400日より前）は削除
    var keys = Object.keys(Store.activity);
    if (keys.length > 400) {
      keys.sort();
      for (var i = 0; i < keys.length - 400; i++) delete Store.activity[keys[i]];
    }
    save('activity', Store.activity);
    emit('activity');
  }
  Store.logActivity = logActivity;

  Store.today = function () {
    return Store.activity[core.dayKey(Date.now())] || {};
  };

  /** 連続学習日数（今日まだ学習していなくても、昨日まで続いていれば数える） */
  Store.streak = function () {
    var d = new Date();
    var count = 0;
    var studied = function (key) {
      var a = Store.activity[key];
      return !!a && ((a.r || 0) + (a.q || 0) > 0);
    };
    if (!studied(core.dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
    while (studied(core.dayKey(d.getTime()))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  };

  /** 直近 n 日分の [{key, date, r, q, total}] */
  Store.recentDays = function (n) {
    var out = [];
    var d = new Date();
    d.setDate(d.getDate() - (n - 1));
    for (var i = 0; i < n; i++) {
      var key = core.dayKey(d.getTime());
      var a = Store.activity[key] || {};
      out.push({ key: key, date: new Date(d.getTime()), r: a.r || 0, q: a.q || 0, n: a.n || 0, a: a.a || 0, total: (a.r || 0) + (a.q || 0) });
      d.setDate(d.getDate() + 1);
    }
    return out;
  };

  /* ---------------- 出題 ---------------- */
  Store.dueCards = function (now) {
    now = now || Date.now();
    return Store.allCards().filter(function (c) { return core.isDue(c.srs, now); });
  };

  Store.newCards = function () {
    return Store.allCards()
      .filter(function (c) { return !c.srs || c.srs.state === 'new'; })
      .sort(function (a, b) { return a.added - b.added; });
  };

  Store.newRemainingToday = function () {
    return Math.max(0, (Store.settings.newPerDay || 0) - (Store.today().n || 0));
  };

  Store.counts = function () {
    var c = { total: 0, new: 0, learning: 0, review: 0, mastered: 0, due: 0, weak: 0 };
    var now = Date.now();
    Store.allCards().forEach(function (card) {
      c.total++;
      c[core.cardStatus(card.srs)]++;
      if (core.isDue(card.srs, now)) c.due++;
      if (isWeak(card)) c.weak++;
    });
    c.newToday = Math.min(c.new, Store.newRemainingToday());
    return c;
  };

  function isWeak(card) {
    var s = card.srs || {};
    return (s.lapses || 0) >= 2 || ((card.ng || 0) >= 2 && (card.ng || 0) > (card.ok || 0) / 2);
  }
  Store.isWeak = isWeak;

  /* ---------------- バックアップ ---------------- */
  Store.exportData = function () {
    return {
      app: 'TubeTan',
      format: 1,
      exportedAt: new Date().toISOString(),
      settings: Store.settings,
      cards: Store.allCards(),
      known: Array.from(Store.known),
      history: Store.history.map(function (h) {
        var c = Object.assign({}, h);
        delete c.segments;
        return c;
      }),
      activity: Store.activity,
    };
  };

  /** @returns {{cards:number, known:number}} */
  Store.importData = function (data, mode) {
    if (!data || data.app !== 'TubeTan' || !Array.isArray(data.cards)) throw new Error('TubeTan のバックアップファイルではありません');
    if (mode === 'replace') {
      Store.cards = {};
      Store.known = new Set();
      Store.activity = {};
    }
    var added = 0;
    data.cards.forEach(function (c) {
      if (!c || typeof c.w !== 'string' || !c.w) return;
      var cur = Store.cards[c.w];
      // 同じ単語があれば、より最近学習した方を残す
      if (!cur || ((c.srs && c.srs.last) || 0) > ((cur.srs && cur.srs.last) || 0)) {
        Store.cards[c.w] = {
          w: c.w, d: c.d || c.w, m: c.m || '', note: c.note || '', ex: Array.isArray(c.ex) ? c.ex.slice(0, 5) : [],
          src: c.src || 'manual', added: c.added || Date.now(), srs: c.srs || core.newSrs(Date.now()), ok: c.ok || 0, ng: c.ng || 0,
        };
        if (!cur) added++;
      }
    });
    (data.known || []).forEach(function (w) { if (typeof w === 'string') Store.known.add(w); });
    if (data.activity && typeof data.activity === 'object') {
      Object.keys(data.activity).forEach(function (k) {
        var a = data.activity[k], b = Store.activity[k] || {};
        var merged = {};
        ['r', 'n', 'q', 'c', 'a'].forEach(function (f) { merged[f] = Math.max(a[f] || 0, b[f] || 0); });
        Store.activity[k] = merged;
      });
    }
    if (mode === 'replace' && data.settings) Store.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
    save('cards', Store.cards);
    save('known', Array.from(Store.known));
    save('activity', Store.activity);
    save('settings', Store.settings);
    emit('cards');
    return { cards: added, known: (data.known || []).length };
  };

  Store.clearAll = function () {
    ['settings', 'cards', 'known', 'history', 'activity'].forEach(function (k) {
      try { root.localStorage.removeItem(PREFIX + k); } catch (e) { /* ignore */ }
      delete mem[k];
    });
    Store.init();
    emit('cards');
  };

  Store.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  root.TubeTanStore = Store;
})(typeof self !== 'undefined' ? self : this);
