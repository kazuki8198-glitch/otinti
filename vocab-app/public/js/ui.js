/*
 * TubeTan の画面部品（エスケープ、トースト、シート、読み上げ、YouTube プレーヤー、グラフ）
 */
(function (root) {
  'use strict';
  var core = root.TubeTanCore;
  var Store = root.TubeTanStore;
  var doc = root.document;

  /* ---------------- 文字列 ---------------- */
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  }

  function icon(name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }

  function num(n) {
    return Number(n || 0).toLocaleString('ja-JP');
  }

  function lvBadge(lv) {
    return '<span class="lv lv-' + lv + '" title="' + esc(levelTitle(lv)) + '">Lv' + lv + '</span>';
  }

  function levelTitle(lv) {
    var L = core.LEVELS[lv - 1];
    if (!L) return '';
    return 'レベル' + lv + '（よく使われる順で ' + (L.max === Infinity ? num(L.min) + '位〜' : num(L.min) + '〜' + num(L.max) + '位') + '・目安: ' + L.guide + '）';
  }

  /** 例文の中の単語を <mark> で強調（本文はエスケープ） */
  function highlight(text, hl) {
    if (!hl || hl[0] < 0 || hl[1] <= 0 || hl[0] + hl[1] > text.length) return esc(text);
    return esc(text.slice(0, hl[0])) + '<mark>' + esc(text.substr(hl[0], hl[1])) + '</mark>' + esc(text.slice(hl[0] + hl[1]));
  }

  /** 例文の単語を空欄に */
  function blankOut(text, hl) {
    if (!hl || hl[0] < 0 || hl[1] <= 0) return esc(text);
    return esc(text.slice(0, hl[0])) + '<span class="blank" aria-label="空欄">&nbsp;</span>' + esc(text.slice(hl[0] + hl[1]));
  }

  function relativeDue(ts) {
    if (!ts) return '';
    var now = Date.now();
    if (ts <= now) return '今すぐ';
    var d0 = core.startOfDay(now), d1 = core.startOfDay(ts);
    var days = Math.round((d1 - d0) / core.DAY);
    if (days <= 0 || ts - now < 12 * 60 * core.MIN) {
      var mins = Math.max(1, Math.round((ts - now) / core.MIN));
      return mins < 60 ? mins + '分後' : Math.round(mins / 60) + '時間後';
    }
    if (days === 1) return '明日';
    if (days < 30) return days + '日後';
    if (days < 365) return Math.round(days / 30) + 'か月後';
    return Math.round(days / 36.5) / 10 + '年後';
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  }

  /* ---------------- 外部リンク ---------------- */
  function watchUrl(videoId, t) {
    return 'https://www.youtube.com/watch?v=' + encodeURIComponent(videoId) + (t ? '&t=' + Math.max(0, Math.floor(t)) + 's' : '');
  }

  function thumbUrl(videoId) {
    return 'https://i.ytimg.com/vi/' + encodeURIComponent(videoId) + '/mqdefault.jpg';
  }

  function dictLinks(word) {
    var w = encodeURIComponent(word);
    var links = [
      ['Weblio', 'https://ejje.weblio.jp/content/' + w],
      ['英辞郎', 'https://eow.alc.co.jp/search?q=' + w],
      ['Cambridge', 'https://dictionary.cambridge.org/dictionary/english-japanese/' + w],
      ['YouGlish（発音動画）', 'https://youglish.com/pronounce/' + w + '/english'],
    ];
    return '<div class="links">' + links.map(function (l) {
      return '<a class="btn sm" href="' + esc(l[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(l[0]) + icon('external') + '</a>';
    }).join('') + '</div>';
  }

  function translateUrl(sentence) {
    return 'https://translate.google.com/?sl=en&tl=ja&op=translate&text=' + encodeURIComponent(sentence);
  }

  /* ---------------- トースト ---------------- */
  function toast(message, opts) {
    opts = opts || {};
    var box = doc.getElementById('toast');
    var el = doc.createElement('div');
    el.className = 'toast';
    var span = doc.createElement('span');
    span.textContent = message;
    el.appendChild(span);
    var timer;
    var close = function () {
      clearTimeout(timer);
      if (el.parentNode) el.parentNode.removeChild(el);
    };
    if (opts.action) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.textContent = opts.action;
      b.addEventListener('click', function () {
        close();
        if (opts.onAction) opts.onAction();
      });
      el.appendChild(b);
    }
    box.appendChild(el);
    while (box.children.length > 2) box.removeChild(box.firstChild);
    timer = setTimeout(close, opts.duration || (opts.action ? 6000 : 3000));
    return close;
  }

  function clearToasts() {
    var box = doc.getElementById('toast');
    if (box) box.innerHTML = '';
  }

  /* ---------------- シート（モーダル） ---------------- */
  var openSheets = [];

  /**
   * @param {{title:string, titleHtml?:string, body:string, foot?:string, actions?:Object, onClose?:Function, label?:string}} o
   */
  function sheet(o) {
    var overlay = doc.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(o.label || o.title || '') + '">' +
      '<div class="sheet-head"><h2>' + (o.titleHtml || esc(o.title || '')) + '</h2>' +
      (o.headExtra || '') +
      '<button class="btn ghost icon-only" type="button" data-act="close" aria-label="閉じる">' + icon('x') + '</button></div>' +
      '<div class="sheet-body">' + (o.body || '') + '</div>' +
      (o.foot ? '<div class="sheet-foot">' + o.foot + '</div>' : '') +
      '</div>';
    var prevFocus = doc.activeElement;
    var api = {
      el: overlay.querySelector('.sheet'),
      body: overlay.querySelector('.sheet-body'),
      foot: overlay.querySelector('.sheet-foot'),
      close: function (result) {
        if (!overlay.parentNode) return;
        overlay.parentNode.removeChild(overlay);
        openSheets = openSheets.filter(function (s) { return s !== api; });
        if (!openSheets.length) doc.body.style.overflow = '';
        if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        if (o.onClose) o.onClose(result);
      },
    };
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) return api.close();
      var t = e.target.closest('[data-act]');
      if (!t || !overlay.contains(t)) return;
      var act = t.getAttribute('data-act');
      if (act === 'close') return api.close();
      if (o.actions && o.actions[act]) o.actions[act](t, e, api);
    });
    overlay.addEventListener('submit', function (e) {
      var f = e.target.closest('form[data-submit]');
      if (!f) return;
      e.preventDefault();
      var fn = o.actions && o.actions[f.getAttribute('data-submit')];
      if (fn) fn(f, e, api);
    });
    overlay.addEventListener('input', function (e) {
      var t = e.target.closest('[data-input]');
      if (t && o.actions && o.actions[t.getAttribute('data-input')]) o.actions[t.getAttribute('data-input')](t, e, api);
    });
    doc.body.appendChild(overlay);
    doc.body.style.overflow = 'hidden';
    openSheets.push(api);
    var first = overlay.querySelector('[autofocus]') || overlay.querySelector('.sheet-head [data-act="close"]');
    if (first) first.focus({ preventScroll: true });
    return api;
  }

  function closeTopSheet() {
    var s = openSheets[openSheets.length - 1];
    if (s) {
      s.close();
      return true;
    }
    return false;
  }

  function hasOpenSheet() {
    return openSheets.length > 0;
  }

  function confirmDialog(message, okLabel, danger) {
    return new Promise(function (resolve) {
      var done = false;
      var s = sheet({
        title: '確認',
        body: '<p>' + esc(message).replace(/\n/g, '<br>') + '</p>',
        foot: '<button class="btn" type="button" data-act="close">キャンセル</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" type="button" data-act="ok" autofocus>' + esc(okLabel || 'OK') + '</button>',
        actions: {
          ok: function (el, e, api) {
            done = true;
            api.close();
            resolve(true);
          },
        },
        onClose: function () {
          if (!done) resolve(false);
        },
      });
      var ok = s.el.querySelector('[data-act="ok"]');
      if (ok) ok.focus();
    });
  }

  /* ---------------- 読み上げ ---------------- */
  var voices = [];
  function loadVoices() {
    if (!('speechSynthesis' in root)) return [];
    voices = root.speechSynthesis.getVoices().filter(function (v) { return /^en([-_]|$)/i.test(v.lang); });
    return voices;
  }
  if ('speechSynthesis' in root) {
    loadVoices();
    try { root.speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch (e) { root.speechSynthesis.onvoiceschanged = loadVoices; }
  }

  function pickVoice() {
    if (!voices.length) loadVoices();
    var want = Store.settings.voice;
    var i;
    if (want) for (i = 0; i < voices.length; i++) if (voices[i].voiceURI === want) return voices[i];
    var prefs = [/Google US English/i, /Samantha/i, /(Aria|Jenny|Guy).*Online/i, /Microsoft (Aria|Jenny|Zira|David)/i];
    for (var p = 0; p < prefs.length; p++) for (i = 0; i < voices.length; i++) if (prefs[p].test(voices[i].name)) return voices[i];
    for (i = 0; i < voices.length; i++) if (/en[-_]US/i.test(voices[i].lang)) return voices[i];
    return voices[0] || null;
  }

  function canSpeak() {
    return 'speechSynthesis' in root && typeof root.SpeechSynthesisUtterance === 'function';
  }

  var warnedNoTts = false;
  function speak(text, rate) {
    if (!text) return;
    if (!canSpeak()) {
      if (!warnedNoTts) toast('このブラウザは音声の読み上げに対応していません');
      warnedNoTts = true;
      return;
    }
    try {
      root.speechSynthesis.cancel();
      var u = new root.SpeechSynthesisUtterance(text);
      var v = pickVoice();
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      } else u.lang = 'en-US';
      u.rate = rate || Store.settings.rate || 0.9;
      root.speechSynthesis.speak(u);
    } catch (e) { /* 読み上げに失敗しても続行 */ }
  }

  function voiceList() {
    return loadVoices();
  }

  /* ---------------- スクリプトの遅延読み込み ---------------- */
  var scriptPromises = {};
  function loadScript(src, timeoutMs) {
    if (scriptPromises[src]) return scriptPromises[src];
    scriptPromises[src] = new Promise(function (resolve, reject) {
      var s = doc.createElement('script');
      s.src = src;
      s.async = true;
      var t = setTimeout(function () { reject(new Error('timeout')); }, timeoutMs || 20000);
      s.onload = function () { clearTimeout(t); resolve(); };
      s.onerror = function () {
        clearTimeout(t);
        delete scriptPromises[src];
        reject(new Error('load error: ' + src));
      };
      doc.head.appendChild(s);
    });
    return scriptPromises[src];
  }

  /* ---------------- YouTube プレーヤー ---------------- */
  var ytApi = null;
  function loadYouTubeApi() {
    if (root.YT && root.YT.Player) return Promise.resolve(root.YT);
    if (ytApi) return ytApi;
    ytApi = new Promise(function (resolve, reject) {
      var prev = root.onYouTubeIframeAPIReady;
      root.onYouTubeIframeAPIReady = function () {
        if (typeof prev === 'function') try { prev(); } catch (e) { /* ignore */ }
        resolve(root.YT);
      };
      loadScript('https://www.youtube.com/iframe_api', 15000).catch(function (e) {
        ytApi = null;
        reject(e);
      });
      setTimeout(function () { reject(new Error('YouTube API timeout')); }, 20000);
    });
    return ytApi;
  }

  /**
   * 動画プレーヤー。画面外にスクロールして再生中なら右下に小さく浮かせる。
   * file:// で開いた場合や読み込みに失敗した場合は、YouTube を開くリンクにする。
   */
  function VideoPlayer(slot, videoId, start) {
    this.slot = slot;
    this.videoId = videoId;
    this.player = null;
    this.ready = false;
    this.pending = null;
    this.fallback = false;
    this.visible = true;
    this.box = doc.createElement('div');
    this.box.className = 'player-box';
    var target = doc.createElement('div');
    this.box.appendChild(target);
    slot.appendChild(this.box);
    var self = this;
    if (root.location.protocol === 'file:') {
      this.showFallback();
      return;
    }
    loadYouTubeApi().then(function (YT) {
      if (!self.box.parentNode) return;
      self.player = new YT.Player(target, {
        videoId: videoId,
        playerVars: { playsinline: 1, rel: 0, start: Math.floor(start || 0) },
        events: {
          onReady: function () {
            self.ready = true;
            if (self.pending != null) self.seek(self.pending);
          },
          onStateChange: function () { self.updateFloat(); },
          onError: function () { self.showFallback(); },
        },
      });
    }).catch(function () { self.showFallback(); });
    if ('IntersectionObserver' in root) {
      this.io = new root.IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
        self.updateFloat();
      }, { threshold: 0.25 });
      this.io.observe(slot);
    }
  }

  VideoPlayer.prototype.showFallback = function () {
    this.fallback = true;
    this.box.classList.remove('floating');
    this.box.innerHTML = '<a class="player-fallback" target="_blank" rel="noopener noreferrer" href="' + esc(watchUrl(this.videoId)) + '" style="background-image:url(\'' + esc(thumbUrl(this.videoId)) + '\')"><span>' + icon('play') + 'YouTube で開く</span></a>';
  };

  VideoPlayer.prototype.state = function () {
    try {
      return this.player && this.player.getPlayerState ? this.player.getPlayerState() : -1;
    } catch (e) {
      return -1;
    }
  };

  VideoPlayer.prototype.updateFloat = function () {
    var st = this.state();
    var playing = st === 1 || st === 3;
    this.box.classList.toggle('floating', !this.fallback && !this.visible && playing);
  };

  VideoPlayer.prototype.seek = function (t) {
    if (this.fallback) {
      root.open(watchUrl(this.videoId, t), '_blank', 'noopener');
      return;
    }
    if (this.ready && this.player && this.player.seekTo) {
      this.player.seekTo(Math.max(0, t - 0.3), true);
      this.player.playVideo();
      var self = this;
      setTimeout(function () { self.updateFloat(); }, 400);
    } else {
      this.pending = t;
    }
  };

  VideoPlayer.prototype.destroy = function () {
    if (this.io) this.io.disconnect();
    try { if (this.player && this.player.destroy) this.player.destroy(); } catch (e) { /* ignore */ }
    if (this.box.parentNode) this.box.parentNode.removeChild(this.box);
  };

  /* ---------------- グラフ（縦棒・1系列） ---------------- */
  /**
   * @param {{items:{label:string, value:number, tip?:string, dim?:boolean, cap?:boolean}[], unit?:string, height?:number, caption:string, xEvery?:number}} o
   */
  function columnChart(o) {
    var unit = o.unit || '';
    var max = 0;
    o.items.forEach(function (it) { if (it.value > max) max = it.value; });
    var every = o.xEvery || 1;
    var cols = o.items.map(function (it, i) {
      var h = max ? (it.value / max) * 100 : 0;
      var label = it.tip || it.label;
      var cap = it.cap && it.value ? '<span class="cap" style="bottom:calc(' + h.toFixed(2) + '% + 2px)">' + num(it.value) + '</span>' : '';
      return '<div class="col" tabindex="0" role="img" aria-label="' + esc(label + ': ' + num(it.value) + unit) + '" data-tip-v="' + esc(num(it.value) + unit) + '" data-tip-l="' + esc(label) + '">' +
        cap + '<div class="bar' + (it.value ? '' : ' zero') + (it.dim ? ' dim' : '') + '" style="height:' + h.toFixed(2) + '%"></div></div>';
    }).join('');
    var xl = o.items.map(function (it, i) {
      return '<span>' + (i % every === 0 || i === o.items.length - 1 ? esc(it.label) : '') + '</span>';
    }).join('');
    var rows = o.items.map(function (it) {
      return '<tr><td>' + esc(it.tip || it.label) + '</td><td class="num">' + num(it.value) + esc(unit) + '</td></tr>';
    }).join('');
    return '<div class="chart" data-chart>' +
      (max === 0 && o.emptyText ? '<div class="empty-note">' + esc(o.emptyText) + '</div>' : '') +
      '<div class="plot" style="height:' + (o.height || 140) + 'px">' + cols + '</div>' +
      '<div class="xlabels" aria-hidden="true">' + xl + '</div>' +
      '<details class="table-view"><summary>表で見る</summary><table class="data"><caption class="sr-only">' + esc(o.caption) + '</caption><thead><tr><th>項目</th><th class="num">値</th></tr></thead><tbody>' + rows + '</tbody></table></details>' +
      '</div>';
  }

  // グラフのツールチップ（ホバー・フォーカス共通）
  function chartTip(e) {
    var col = e.target.closest && e.target.closest('.chart .col');
    var chart = col && col.closest('.chart');
    doc.querySelectorAll('.chart .tip').forEach(function (t) { if (!chart || t.parentNode !== chart) t.remove(); });
    if (!col) return;
    var tip = chart.querySelector('.tip');
    if (!tip) {
      tip = doc.createElement('div');
      tip.className = 'tip';
      tip.innerHTML = '<strong></strong><span></span>';
      chart.appendChild(tip);
    }
    tip.querySelector('strong').textContent = col.getAttribute('data-tip-v');
    tip.querySelector('span').textContent = col.getAttribute('data-tip-l');
    var cr = chart.getBoundingClientRect();
    var r = col.getBoundingClientRect();
    var bar = col.querySelector('.bar').getBoundingClientRect();
    var x = r.left - cr.left + r.width / 2;
    x = Math.max(60, Math.min(cr.width - 60, x));
    tip.style.left = x + 'px';
    tip.style.top = Math.max(0, bar.top - cr.top - 8) + 'px';
  }
  doc.addEventListener('pointerover', chartTip);
  doc.addEventListener('focusin', chartTip);
  doc.addEventListener('pointerleave', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('chart')) e.target.querySelectorAll('.tip').forEach(function (t) { t.remove(); });
  }, true);

  /* ---------------- ファイル保存 ---------------- */
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    doc.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1000);
  }

  function pickFile(accept) {
    return new Promise(function (resolve) {
      var input = doc.createElement('input');
      input.type = 'file';
      input.accept = accept || '';
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        if (!f) return resolve(null);
        var reader = new FileReader();
        reader.onload = function () { resolve({ name: f.name, text: String(reader.result) }); };
        reader.onerror = function () { resolve(null); };
        reader.readAsText(f);
      });
      input.click();
    });
  }

  root.TubeTanUI = {
    esc: esc,
    icon: icon,
    num: num,
    lvBadge: lvBadge,
    levelTitle: levelTitle,
    highlight: highlight,
    blankOut: blankOut,
    relativeDue: relativeDue,
    fmtDate: fmtDate,
    watchUrl: watchUrl,
    thumbUrl: thumbUrl,
    dictLinks: dictLinks,
    translateUrl: translateUrl,
    toast: toast,
    clearToasts: clearToasts,
    sheet: sheet,
    closeTopSheet: closeTopSheet,
    hasOpenSheet: hasOpenSheet,
    confirmDialog: confirmDialog,
    speak: speak,
    canSpeak: canSpeak,
    voiceList: voiceList,
    loadScript: loadScript,
    VideoPlayer: VideoPlayer,
    columnChart: columnChart,
    download: download,
    pickFile: pickFile,
  };
})(typeof self !== 'undefined' ? self : this);
