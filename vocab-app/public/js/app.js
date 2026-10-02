/*
 * TubeTan アプリ本体（画面とルーティング）
 *   #/            ホーム
 *   #/import      取り込み（YouTube / 貼り付け / レベル別）
 *   #/study       学習（復習カード・クイズ）
 *   #/words       単語帳
 *   #/settings    設定
 *   #/check       語彙力チェック
 *   #/history/ID  取り込み履歴を開く
 */
(function () {
  'use strict';
  const core = window.TubeTanCore;
  const Store = window.TubeTanStore;
  const UI = window.TubeTanUI;
  const { esc, icon, num } = UI;
  const $view = document.getElementById('view');
  // プレビュー版（claude.ai の Artifact など、外部への通信や埋め込みができない環境）
  const PREVIEW = !!(window.TUBETAN_CONFIG && window.TUBETAN_CONFIG.preview);
  // YouTube プレーヤーを埋め込めるか（file:// やプレビュー版では YouTube へのリンクにする）
  const CAN_EMBED = location.protocol !== 'file:' && !PREVIEW;

  let dict = null;
  let actions = {};
  let cleanup = null;
  let keyHandler = null;

  const state = {
    server: null, // null: 確認中 / false: 使えない / {ok, ytDlp}
    current: null, // 表示中の取り込み結果
    itemIndex: new Map(),
    selected: new Set(),
    expanded: new Set(),
    query: '',
    limit: 150,
    player: null,
    importTab: 'youtube',
    draft: { url: '', text: '' },
    lastUrl: '',
    fetching: null,
    list: { level: 4, seed: 1, items: [] },
    words: { filter: 'all', sort: 'new', q: '' },
    study: { scope: 'all', count: 10 },
    review: null,
    quiz: null,
    check: null,
  };

  const SAMPLE_TEXT = [
    '0:00 Hi everyone, and welcome back. Today I want to talk about something that changed my life: building a learning habit.',
    '0:08 A few years ago, I was struggling. I wanted to learn English, but I kept procrastinating.',
    '0:14 Every time I opened a textbook, I felt overwhelmed by the sheer number of words I didn\'t know.',
    '0:21 Then I stumbled upon a simple idea. Instead of memorizing random lists, I started collecting words from videos I genuinely enjoyed.',
    '0:31 It sounds obvious, but the difference was remarkable. The words came with context, emotion, and a voice attached to them.',
    '0:40 Here\'s the thing: our brains are wired to remember stories, not isolated facts.',
    '0:46 So my first tip is to be consistent rather than intense. Ten minutes a day beats a three-hour session once a month.',
    '0:55 My second tip is to review at the right moment. If you review a word just before you forget it, the memory becomes far more durable.',
    '1:05 This technique is called spaced repetition, and it\'s surprisingly effective.',
    '1:11 Finally, don\'t be afraid of making mistakes. Mistakes are evidence that you\'re pushing beyond your comfort zone.',
    '1:19 Be patient with yourself. Progress feels invisible at first, but it accumulates quietly, day after day.',
    '1:27 If you found this helpful, try it for one week and let me know how it goes. See you next time!',
  ].join('\n');

  /* ================================================================== *
   * 起動
   * ================================================================== */
  function boot() {
    Store.init();
    applyTheme();
    try {
      if (!window.TUBETAN_DICT) throw new Error('no dict');
      dict = new core.Dictionary(window.TUBETAN_DICT);
      window.TUBETAN_DICT = null;
    } catch (e) {
      $view.innerHTML = `<div class="notice error">${icon('alert')}<div><b>辞書データ（data/dict.js）を読み込めませんでした。</b><br>ファイルが揃っているか確認してください。</div></div>`;
      return;
    }
    $view.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || !$view.contains(t)) return;
      const fn = actions[t.getAttribute('data-act')];
      if (fn) fn(t, e);
    });
    $view.addEventListener('submit', (e) => {
      const f = e.target.closest('form[data-submit]');
      if (!f) return;
      e.preventDefault();
      const fn = actions[f.getAttribute('data-submit')];
      if (fn) fn(f, e);
    });
    ['input', 'change'].forEach((type) => {
      $view.addEventListener(type, (e) => {
        const t = e.target.closest('[data-' + type + ']');
        if (!t) return;
        const fn = actions[t.getAttribute('data-' + type)];
        if (fn) fn(t, e);
      });
    });
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', route);
    Store.on('cards', updateBadges);
    Store.on('activity', updateBadges);
    let warned = false;
    Store.on('storage-error', () => {
      if (warned) return;
      warned = true;
      UI.toast('ブラウザに保存できませんでした（容量不足・プライベートモードなど）。設定からバックアップを保存してください。', { duration: 8000 });
    });
    updateBadges();
    route();
    checkServer();
    setTimeout(ensureDetails, 5000);
  }

  function applyTheme() {
    const t = Store.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }

  function apiBase() {
    return String(Store.settings.apiBase || '').trim().replace(/\/+$/, '');
  }

  function checkServer() {
    if (PREVIEW || (location.protocol === 'file:' && !apiBase())) {
      state.server = false;
      refreshServerStatus();
      return Promise.resolve(false);
    }
    state.server = null;
    refreshServerStatus();
    return fetch(apiBase() + '/api/health', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        state.server = j && j.ok ? j : false;
      })
      .catch(() => {
        state.server = false;
      })
      .then(() => {
        refreshServerStatus();
        return state.server;
      });
  }

  function refreshServerStatus() {
    const el = document.getElementById('server-status');
    if (el) el.innerHTML = serverStatusHtml();
  }

  /** dict-detail.js（詳しい訳）を必要になったら読み込む */
  let detailsPromise = null;
  function ensureDetails() {
    if (dict.hasDetails) return Promise.resolve(true);
    if (window.TUBETAN_DICT_DETAIL) {
      // ページに同梱されている場合（プレビュー版）
      dict.attachDetails(window.TUBETAN_DICT_DETAIL);
      window.TUBETAN_DICT_DETAIL = null;
      return Promise.resolve(true);
    }
    if (!detailsPromise) {
      detailsPromise = UI.loadScript('data/dict-detail.js', 30000)
        .then(() => {
          dict.attachDetails(window.TUBETAN_DICT_DETAIL);
          window.TUBETAN_DICT_DETAIL = null;
          return true;
        })
        .catch(() => {
          detailsPromise = null;
          return false;
        });
    }
    return detailsPromise;
  }

  /* ================================================================== *
   * ルーティング
   * ================================================================== */
  const routes = {
    '': viewHome,
    import: viewImport,
    study: viewStudy,
    words: viewWords,
    settings: viewSettings,
    check: viewCheck,
    history: viewHistory,
  };

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const qi = h.indexOf('?');
    const path = qi >= 0 ? h.slice(0, qi) : h;
    const parts = path.split('/').filter(Boolean).map((p) => {
      try { return decodeURIComponent(p); } catch (e) { return p; }
    });
    return { name: parts[0] || '', args: parts.slice(1), query: new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : '') };
  }

  function route() {
    if (cleanup) {
      try { cleanup(); } catch (e) { console.error(e); }
    }
    cleanup = null;
    keyHandler = null;
    setSession(false);
    destroyPlayer();
    UI.clearToasts();
    while (UI.closeTopSheet()) { /* 開いているシートを閉じる */ }
    const r = parseHash();
    const fn = routes[r.name] || viewHome;
    const tab = r.name === 'check' || r.name === 'history' ? (r.name === 'check' ? 'settings' : 'import') : r.name || 'home';
    document.querySelectorAll('#tabs a').forEach((a) => {
      if (a.getAttribute('data-tab') === tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    fn(r);
    window.scrollTo(0, 0);
    try { $view.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function setView(html, acts, opts) {
    actions = acts || {};
    $view.className = opts && opts.wide ? 'wide' : '';
    $view.innerHTML = html;
  }

  /** 復習・クイズ中は（スマホで）下部メニューを隠す */
  function setSession(on) {
    document.body.classList.toggle('in-session', !!on);
  }

  function destroyPlayer() {
    if (state.player) {
      state.player.destroy();
      state.player = null;
    }
  }

  function onKey(e) {
    if (e.key === 'Escape' && UI.hasOpenSheet()) {
      UI.closeTopSheet();
      e.preventDefault();
      return;
    }
    if (UI.hasOpenSheet() || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (e.target && e.target.isContentEditable)) return;
    if (keyHandler) keyHandler(e);
  }

  function updateBadges() {
    const c = Store.counts();
    const badge = document.getElementById('due-badge');
    const n = c.due + c.newToday;
    if (badge) {
      badge.hidden = n <= 0;
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.setAttribute('aria-label', '今日の学習 ' + n + '語');
    }
    const st = document.getElementById('streak');
    if (st) {
      const s = Store.streak();
      st.querySelector('span').textContent = s;
      st.classList.toggle('off', s === 0);
      st.title = '連続学習日数: ' + s + '日';
    }
  }

  /* ================================================================== *
   * 共通部品
   * ================================================================== */
  function greeting() {
    const h = new Date().getHours();
    return h >= 4 && h < 10 ? 'おはようございます' : h >= 10 && h < 18 ? 'こんにちは' : 'こんばんは';
  }

  function speakBtn(word, cls) {
    return `<button type="button" class="btn ghost icon-only ${cls || ''}" data-act="speak" data-say="${esc(word)}" aria-label="「${esc(word)}」の発音を聞く" title="発音を聞く">${icon('speaker')}</button>`;
  }

  function statusTag(card) {
    if (Store.isWeak(card)) return '<span class="tag weak">苦手</span>';
    const st = core.cardStatus(card.srs);
    return {
      new: '<span class="tag new">未学習</span>',
      learning: '<span class="tag learning">学習中</span>',
      review: '<span class="tag review">復習中</span>',
      mastered: '<span class="tag mastered">習得</span>',
    }[st];
  }

  function entryOf(w) {
    return dict.get(w);
  }

  function levelOfWord(w) {
    const e = dict.get(w);
    return core.levelOfRank(e ? e.r : 0);
  }

  function footerNote() {
    return `<p class="footer-note">英和辞書: <a href="https://github.com/kujirahand/EJDict" target="_blank" rel="noopener noreferrer">EJDict-hand</a>（パブリックドメイン）・頻度: <a href="https://github.com/rspeer/wordfreq" target="_blank" rel="noopener noreferrer">wordfreq</a>（CC BY-SA 4.0）<br>学習データはこのブラウザ内にだけ保存されます。</p>`;
  }

  function commonActions(extra) {
    return Object.assign(
      {
        speak: (el) => UI.speak(el.getAttribute('data-say')),
      },
      extra || {},
    );
  }

  /* ================================================================== *
   * ホーム
   * ================================================================== */
  function viewHome() {
    const c = Store.counts();
    const streak = Store.streak();
    const todo = c.due + c.newToday;
    let html = `<div class="page-head"><div><h1>${greeting()}</h1><p>${homeSubtitle(c, streak)}</p></div></div>`;
    if (!Store.isPersistent()) html += `<div class="notice warn" style="margin-bottom:16px">${icon('alert')}<div>このブラウザではデータを保存できません（プライベートモードなど）。ページを閉じると学習記録が消えます。</div></div>`;
    html += '<div class="stack">';
    if (!c.total) html += onboardingCard();
    else html += heroCard(c, todo);
    html += `<div class="grid cols-4">
      ${statTile('登録した単語', num(c.total), '語')}
      ${statTile('学習中', num(c.learning + c.review), '語')}
      ${statTile('習得済み', num(c.mastered), '語')}
      ${statTile('連続学習', num(streak), '日')}
    </div>`;
    html += activityCard();
    html += recentCard();
    if (!Store.settings.vocabSize) {
      html += `<div class="card"><div class="row spread"><div><h2>あなたの語彙力は？</h2><p class="muted">約2分のチェックで推定語彙数を出し、動画から表示する単語のレベルを自動で合わせます。</p></div><a class="btn" href="#/check">${icon('target')}語彙力チェック</a></div></div>`;
    }
    html += '</div>' + footerNote();
    setView(html, commonActions({ sample: loadSample }));
  }

  function homeSubtitle(c, streak) {
    if (!c.total) return 'YouTube の動画から、あなたに必要な英単語を集めましょう。';
    if (streak > 0) return `${streak}日連続で学習中です。この調子！`;
    return '今日も少しだけ単語を覚えましょう。';
  }

  function statTile(label, value, unit) {
    return `<div class="card stat"><div class="label">${esc(label)}</div><div class="value">${value}<small>${esc(unit)}</small></div></div>`;
  }

  function onboardingCard() {
    return `<div class="card">
      <h2>YouTube で英単語を増やそう</h2>
      <ol class="steps">
        <li><div><b>好きな英語の動画の URL を貼る</b><br><span class="muted small">字幕から単語を抜き出し、あなたのレベルに合った単語だけを表示します。</span></div></li>
        <li><div><b>知らない単語を単語帳に追加</b><br><span class="muted small">動画の中の例文と時刻つきで保存。タップでその場面を再生できます。</span></div></li>
        <li><div><b>毎日少しずつ復習</b><br><span class="muted small">忘れかけた頃に出題する「間隔反復」で、効率よく覚えられます。</span></div></li>
      </ol>
      <div class="row" style="margin-top:16px">
        <a class="btn primary lg" href="#/import">${icon('import')}YouTube から単語を集める</a>
        <a class="btn lg" href="#/check">${icon('target')}語彙力チェック</a>
        <button type="button" class="btn ghost" data-act="sample">サンプルで試す</button>
      </div>
    </div>`;
  }

  function nextDueInfo() {
    const now = Date.now();
    let next = Infinity;
    let countNext = 0;
    Store.allCards().forEach((c) => {
      if (!c.srs || c.srs.state === 'new' || c.srs.due <= now) return;
      const day = core.startOfDay(c.srs.due);
      if (day < next) {
        next = day;
        countNext = 1;
      } else if (day === next) countNext++;
    });
    if (next === Infinity) return '';
    return `次の復習: ${UI.relativeDue(Math.max(next, now + 1))}（${countNext}語）`;
  }

  function heroCard(c, todo) {
    if (!todo) {
      const info = nextDueInfo();
      return `<div class="card hero"><div><div class="label">今日の学習</div><div class="figure">完了<small>🎉</small></div>
        <div class="sub">今日の復習はすべて終わりました。${esc(info)}</div></div>
        <div class="row"><a class="btn lg" href="#/import">${icon('import')}単語を集める</a><a class="btn lg" href="#/study">${icon('study')}クイズ</a></div></div>`;
    }
    return `<div class="card hero"><div><div class="label">今日の学習</div><div class="figure">${num(todo)}<small>語</small></div>
      <div class="sub">復習 ${num(c.due)}語 ・ 新しい単語 ${num(c.newToday)}語</div></div>
      <a class="btn primary lg" href="#/study/review">${icon('study')}学習を始める</a></div>`;
  }

  function activityCard() {
    const days = Store.recentDays(14);
    const wd = ['日', '月', '火', '水', '木', '金', '土'];
    let maxI = 0;
    days.forEach((d, i) => { if (d.total > days[maxI].total) maxI = i; });
    const items = days.map((d, i) => ({
      label: d.date.getMonth() + 1 + '/' + d.date.getDate(),
      tip: `${d.date.getMonth() + 1}月${d.date.getDate()}日（${wd[d.date.getDay()]}）・復習 ${d.r}・クイズ ${d.q}`,
      value: d.total,
      cap: i === maxI || i === days.length - 1,
    }));
    const total = days.reduce((s, d) => s + d.total, 0);
    return `<div class="card"><div class="card-head"><h2>学習の記録</h2><span class="muted small">直近14日の復習＋クイズの回数（合計 ${num(total)}回）</span></div>
      ${UI.columnChart({ items, unit: '回', caption: '直近14日の学習回数', xEvery: 2, height: 120, emptyText: 'まだ記録がありません。復習やクイズをするとここに表示されます。' })}</div>`;
  }

  function recentCard() {
    const list = Store.history.slice(0, 5);
    if (!list.length) return '';
    return `<div class="card"><div class="card-head"><h2>最近の取り込み</h2><a class="btn sm ghost" href="#/import">${icon('plus')}新しく取り込む</a></div>
      <div class="video-list">${list.map(historyItemHtml).join('')}</div></div>`;
  }

  function historyItemHtml(h) {
    const thumb = h.videoId && !PREVIEW
      ? `<div class="thumb" style="background-image:url('${esc(UI.thumbUrl(h.videoId))}')"></div>`
      : `<div class="thumb">${icon('text')}</div>`;
    const meta = [UI.fmtDate(h.date), h.total ? '異なり語 ' + num(h.total) : '', h.level95 ? '難易度 Lv' + h.level95 : ''].filter(Boolean).join(' ・ ');
    return `<a class="video-item" href="#/history/${encodeURIComponent(h.id)}">${thumb}<div style="min-width:0"><div class="title">${esc(h.title || '（タイトルなし）')}</div><div class="small muted">${esc(meta)}</div></div></a>`;
  }

  /* ================================================================== *
   * 取り込み
   * ================================================================== */
  function viewImport(r) {
    let tab = r.args[0] || state.importTab || 'youtube';
    if (['youtube', 'text', 'list'].indexOf(tab) < 0) tab = 'youtube';
    state.importTab = tab;
    const seg = (id, label) => `<button type="button" data-act="tab" data-tab="${id}" aria-pressed="${tab === id}">${label}</button>`;
    let html = `<div class="page-head"><div><h1>単語を取り込む</h1><p>動画や英文から、あなたが知らなさそうな単語を見つけます。</p></div></div>
      <div class="seg" role="group" aria-label="取り込み方法">${seg('youtube', 'YouTube')}${seg('text', '英文・字幕を貼る')}${seg('list', 'レベル別の単語')}</div>
      <div style="margin-top:12px">${tab === 'youtube' ? ytFormHtml() : tab === 'text' ? textFormHtml() : listFormHtml()}</div>
      <div id="results"></div>`;
    setView(html, importActions(), { wide: true });
    if (tab === 'list') renderLevelList();
    else if (state.current) renderResults();
    cleanup = () => {
      if (state.fetching) {
        state.fetching.abort();
        state.fetching = null;
      }
    };
  }

  function ytFormHtml() {
    return `<form class="card import-form" data-submit="fetchYt" autocomplete="off">
      <label class="field" for="yt-url"><span>YouTube の動画 URL</span></label>
      <div class="input-row">
        <input class="input" id="yt-url" name="url" type="text" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" value="${esc(state.lastUrl)}" spellcheck="false" autocapitalize="off">
        <button class="btn primary" type="submit">${icon('search')}単語を抽出</button>
      </div>
      <div id="server-status" style="margin-top:12px">${serverStatusHtml()}</div>
    </form>`;
  }

  function previewNoticeHtml() {
    return `<div class="notice info">${icon('info')}<div>
      <b>このプレビュー版では、YouTube の字幕の自動取得は使えません。</b>
      <p>パソコンでアプリ（vocab-app の <code>node server.js</code>）を起動すると、URL を貼るだけで字幕から単語を集められます。ここでは、YouTube の「文字起こし」や英文を貼り付ける方法・サンプル・レベル別の単語で試せます。</p>
      <div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-act="tab" data-tab="text">${icon('text')}英文・字幕を貼る</button><button type="button" class="btn sm ghost" data-act="sample">サンプルで試す</button></div>
    </div></div>`;
  }

  function serverStatusHtml() {
    if (PREVIEW) return previewNoticeHtml();
    if (state.server === null) return '<div class="row small muted"><div class="spinner" style="width:16px;height:16px;border-width:2px"></div>字幕サーバーを確認しています…</div>';
    if (state.server && state.server.ok) {
      return `<div class="small muted">${icon('check')} 字幕の自動取得が使えます${state.server.ytDlp ? '（yt-dlp ' + esc(state.server.ytDlp) + ' も利用できます）' : ''}。英語の字幕（自動生成を含む）がある動画に対応しています。</div>`;
    }
    return `<div class="notice warn">${icon('alert')}<div>
      <b>字幕を自動で取得するには、このアプリのサーバーを起動してください。</b>
      <ol><li><a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer">Node.js</a>（18 以上）をインストール</li>
      <li><code>vocab-app</code> フォルダで <code>node server.js</code> を実行</li>
      <li>表示される <code>http://localhost:3000</code> をブラウザで開く</li></ol>
      <p>サーバーなしでも、YouTube の「文字起こし」をコピーして貼り付ければ使えます。</p>
      <div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-act="tab" data-tab="text">${icon('text')}貼り付けで使う</button><button type="button" class="btn sm ghost" data-act="recheck">${icon('undo')}再確認</button></div>
    </div></div>`;
  }

  function textFormHtml() {
    return `<form class="card import-form" data-submit="fromText">
      <label class="field"><span>字幕や英文を貼り付け</span>
        <textarea class="textarea" name="text" placeholder="例）YouTube の「文字起こしを表示」でコピーしたもの、SRT/VTT 字幕、英語の記事、歌詞など" spellcheck="false">${esc(state.draft.text)}</textarea></label>
      <label class="field" style="margin-top:10px"><span>動画の URL（任意：あると例文から該当シーンを再生できます）</span>
        <input class="input" name="url" type="text" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" value="${esc(state.draft.url)}" spellcheck="false" autocapitalize="off"></label>
      <div class="row" style="margin-top:12px"><button class="btn primary" type="submit">${icon('search')}単語を抽出</button><button type="button" class="btn ghost" data-act="sample">サンプル文で試す</button></div>
      <details style="margin-top:12px"><summary class="small muted" style="cursor:pointer">YouTube の字幕（文字起こし）をコピーする方法</summary>
        <div class="small" style="margin-top:6px"><ol style="padding-left:1.3em;margin:0">
          <li>パソコンのブラウザで動画を開き、説明欄の下のほうにある「文字起こしを表示」を押す</li>
          <li>右側に出た文字起こしを、最初から最後までドラッグして選択してコピー（Ctrl+C / ⌘+C）</li>
          <li>ここに貼り付けて「単語を抽出」。時刻（0:12 など）が入っていれば、例文から該当シーンへ飛べます</li>
        </ol><p class="muted">SRT / VTT 形式の字幕ファイルの中身も、そのまま貼り付けられます。</p></div></details>
    </form>`;
  }

  function listFormHtml() {
    const opts = core.LEVELS.map((L) => `<option value="${L.lv}"${L.lv === state.list.level ? ' selected' : ''}>Lv${L.lv}（${esc(L.guide)}）</option>`).join('');
    return `<div class="card"><h2>レベル別の単語</h2><p class="muted small">よく使われる順に区切ったレベルから、まだ登録していない単語を表示します。動画がなくても単語を増やせます。</p>
      <div class="row" style="margin-top:10px"><select class="select" data-change="listLevel" aria-label="レベル">${opts}</select>
      <button type="button" class="btn" data-act="reshuffle">${icon('shuffle')}別の単語を表示</button></div></div>`;
  }

  function importActions() {
    return commonActions({
      tab: (el) => go('#/import/' + el.getAttribute('data-tab')),
      recheck: () => checkServer(),
      sample: loadSample,
      fetchYt: (form) => fetchYoutube(form.url.value.trim()),
      fromText: (form) => {
        const text = form.text.value;
        const url = form.url.value.trim();
        state.draft = { text, url };
        if (!text.trim()) return UI.toast('英文を貼り付けてください');
        const segments = core.parsePastedTranscript(text);
        if (!segments.length) return UI.toast('英文が見つかりませんでした');
        const videoId = url ? core.parseVideoId(url) : null;
        if (url && !videoId) UI.toast('動画の URL は読み取れませんでしたが、英文から抽出します');
        const res = buildResult({
          type: 'text',
          id: 'tx:' + hashString(text),
          videoId,
          title: textTitle(text),
          segments,
        });
        state.current = res;
        saveToHistory(res);
        resetResultState();
        renderResults();
        scrollToResults();
      },
      retry: () => fetchYoutube(state.lastUrl),
      toPaste: () => {
        state.draft.url = state.lastUrl;
        go('#/import/text');
      },
      listLevel: (el) => {
        state.list.level = parseInt(el.value, 10) || 4;
        state.list.seed++;
        renderLevelList();
      },
      reshuffle: () => {
        state.list.seed++;
        renderLevelList();
      },
      // 結果リスト
      level: (el) => {
        Store.saveSettings({ level: parseInt(el.value, 10) || 1 });
        state.limit = 150;
        renderResults(true);
      },
      sort: (el) => {
        Store.saveSettings({ sort: el.value });
        renderWordList();
      },
      q: (el) => {
        state.query = el.value.trim().toLowerCase();
        renderWordList();
      },
      showAdded: (el) => { Store.saveSettings({ showAdded: el.checked }); renderWordList(); },
      showKnown: (el) => { Store.saveSettings({ showKnown: el.checked }); renderWordList(); },
      showProper: (el) => { Store.saveSettings({ showProper: el.checked }); renderWordList(); },
      more: (el) => {
        const w = rowWord(el);
        state.expanded.add(w);
        rerenderRow(w);
      },
      showMore: () => {
        state.limit += 200;
        renderWordList();
      },
      sel: (el) => {
        const w = rowWord(el);
        if (el.checked) state.selected.add(w);
        else state.selected.delete(w);
        updateBulkBar();
      },
      selectAll: () => {
        (state.visible || []).forEach((it) => { if (!Store.hasCard(it.lemma)) state.selected.add(it.lemma); });
        renderWordList();
      },
      selectNone: () => {
        state.selected.clear();
        renderWordList();
      },
      addSelected: addSelected,
      add: (el) => addItem(itemFor(rowWord(el))),
      remove: (el) => removeItem(rowWord(el)),
      known: (el) => markKnownItem(rowWord(el), el.closest('.word-row')),
      unknown: (el) => {
        const w = rowWord(el);
        Store.unmarkKnown(w);
        rerenderRow(w);
      },
      detail: (el) => openWordSheet(itemFor(rowWord(el)), currentSource()),
      seek: (el) => seekTo(parseFloat(el.getAttribute('data-t'))),
      addUnknown: (el) => {
        const w = el.getAttribute('data-w');
        const u = (state.current && state.current.unknown.find((x) => x.word === w)) || null;
        openAddSheet({ w, ex: u ? [exampleFromContext(u.context, u.time, state.current)] : [], src: state.current ? state.current.type : 'manual' });
      },
      openSource: () => {
        if (state.current && state.current.videoId) window.open(UI.watchUrl(state.current.videoId), '_blank', 'noopener');
      },
      clearResult: () => {
        state.current = null;
        resetResultState();
        destroyPlayer();
        const box = document.getElementById('results');
        if (box) box.innerHTML = '';
      },
    });
  }

  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function textTitle(text) {
    const first = core.cleanCaption(text.replace(/^\s*\d{1,2}:\d{2}(:\d{2})?\s*/gm, '').replace(/^WEBVTT.*$/m, '')).slice(0, 48);
    return first ? '貼り付けた英文: ' + first + (first.length >= 48 ? '…' : '') : '貼り付けた英文';
  }

  function resetResultState() {
    state.selected.clear();
    state.expanded.clear();
    state.query = '';
    state.limit = 150;
  }

  function scrollToResults() {
    const box = document.getElementById('results');
    if (box) setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function loadSample() {
    const segments = core.parsePastedTranscript(SAMPLE_TEXT);
    state.current = buildResult({ type: 'text', id: 'sample', title: 'サンプル: 学習習慣についての短いトーク', segments });
    resetResultState();
    state.draft.text = SAMPLE_TEXT;
    if (location.hash !== '#/import/text') go('#/import/text');
    else {
      renderResults();
    }
    setTimeout(scrollToResults, 80);
  }

  function fetchYoutube(input) {
    const box = document.getElementById('results');
    if (!box) return;
    state.lastUrl = input;
    if (PREVIEW) {
      state.draft.url = input;
      box.innerHTML = '<div style="margin-top:16px">' + previewNoticeHtml() + '</div>';
      return;
    }
    const id = core.parseVideoId(input);
    if (!id) {
      box.innerHTML = `<div class="notice error" style="margin-top:16px">${icon('alert')}<div><b>YouTube の URL を読み取れませんでした。</b><br>https://www.youtube.com/watch?v=… や https://youtu.be/… の形の URL を貼り付けてください。</div></div>`;
      return;
    }
    if (state.fetching) state.fetching.abort();
    const ctrl = new AbortController();
    state.fetching = ctrl;
    destroyPlayer();
    box.innerHTML = `<div class="card loading" style="margin-top:16px"><div class="spinner"></div><div><b>字幕を取得しています…</b><div class="small muted">ふつうは数秒、yt-dlp を使う場合は 10〜20 秒ほどかかります。</div></div></div>`;
    const btn = $view.querySelector('form[data-submit="fetchYt"] button[type="submit"]');
    if (btn) btn.disabled = true;
    fetch(apiBase() + '/api/transcript?url=' + encodeURIComponent(input), { signal: ctrl.signal })
      .then((r) => r.json().catch(() => ({ ok: false, code: 'BAD_RESPONSE', message: 'サーバーの応答を読み取れませんでした。' })))
      .then((j) => {
        if (!j.ok) return renderFetchError(j);
        if (state.server === false) state.server = { ok: true };
        const res = buildResult({
          type: 'youtube',
          id: 'yt:' + j.videoId,
          videoId: j.videoId,
          title: j.title,
          author: j.author,
          lengthSeconds: j.lengthSeconds,
          track: j.track,
          segments: j.segments,
          start: core.parseStartTime(input),
        });
        state.current = res;
        saveToHistory(res);
        resetResultState();
        renderResults();
      })
      .catch((err) => {
        if (err && err.name === 'AbortError') return;
        state.server = false;
        refreshServerStatus();
        renderFetchError({ code: 'SERVER_DOWN', message: 'アプリのサーバーに接続できませんでした。' });
      })
      .then(() => {
        if (state.fetching === ctrl) state.fetching = null;
        const b = $view.querySelector('form[data-submit="fetchYt"] button[type="submit"]');
        if (b) b.disabled = false;
      });
  }

  function renderFetchError(j) {
    const box = document.getElementById('results');
    if (!box) return;
    let tips = '';
    if (j.code === 'SERVER_DOWN') {
      tips = '<p>字幕の自動取得には、このアプリのサーバー（<code>node server.js</code>）が起動している必要があります。サーバーなしで使う場合は、字幕を貼り付けてください。</p>';
    } else if (j.code === 'BLOCKED' || j.code === 'PO_TOKEN' || j.code === 'PARSE') {
      tips = '<p>うまくいかない場合は <a href="https://github.com/yt-dlp/yt-dlp#installation" target="_blank" rel="noopener noreferrer">yt-dlp</a> をインストールしてからサーバーを起動し直すと、取得できることがあります（<code>yt-dlp -U</code> で最新版に更新）。</p>';
    } else if (j.code === 'NO_CAPTIONS' || j.code === 'NO_ENGLISH') {
      tips = '<p>字幕のない動画は使えません。YouTube の検索で「フィルタ → 字幕」を選ぶと、字幕つきの動画だけを探せます。</p>';
    }
    box.innerHTML = `<div class="notice error" style="margin-top:16px">${icon('alert')}<div>
      <b>${esc(j.message || '字幕を取得できませんでした。')}</b>
      ${j.available && j.available.length ? '<div class="small">この動画の字幕: ' + esc(j.available.join(', ')) + '</div>' : ''}
      ${tips}
      ${j.detail ? '<div class="small muted">詳細: ' + esc(j.detail) + '</div>' : ''}
      <div class="row" style="margin-top:10px"><button type="button" class="btn sm" data-act="retry">${icon('undo')}もう一度</button><button type="button" class="btn sm" data-act="toPaste">${icon('text')}字幕を貼り付けて使う</button></div>
    </div></div>`;
  }

  function buildResult(src) {
    const ex = core.extractVocabulary(src.segments, dict);
    return Object.assign({}, src, {
      id: src.id || 'tx:' + Date.now().toString(36),
      items: ex.items,
      unknown: ex.unknown,
      totalTokens: ex.totalTokens,
      stats: ex.stats,
    });
  }

  function saveToHistory(res) {
    if (res.id === 'sample') return;
    Store.addHistory({
      id: res.id,
      type: res.type,
      videoId: res.videoId || null,
      title: res.title || '',
      author: res.author || '',
      lengthSeconds: res.lengthSeconds || null,
      track: res.track || null,
      start: res.start || 0,
      date: Date.now(),
      total: res.items.length,
      level95: res.stats.level95,
      segments: res.segments,
    });
  }

  function currentSource() {
    const c = state.current;
    return c ? { type: c.type, videoId: c.videoId || null, title: c.title || '' } : { type: 'list', videoId: null, title: '' };
  }

  function rowWord(el) {
    const row = el.closest('[data-w]');
    return row ? row.getAttribute('data-w') : '';
  }

  function itemFor(w) {
    return state.itemIndex.get(w) || makeItem(w);
  }

  /** 辞書の単語から（抽出結果がない場合の）表示用アイテムを作る */
  function makeItem(w) {
    const e = dict.get(w) || { w, d: w, s: '', r: 0 };
    return { lemma: e.w, entry: e, rank: e.r, level: core.levelOfRank(e.r), count: 0, forms: [], contexts: [] };
  }

  function seekTo(t) {
    if (state.player) state.player.seek(t);
    else if (state.current && state.current.videoId) window.open(UI.watchUrl(state.current.videoId, t), '_blank', 'noopener');
  }

  function visibleItems() {
    const res = state.current;
    if (!res) return [];
    const s = Store.settings;
    const q = state.query;
    const list = res.items.filter((it) => {
      if (it.level < s.level) return false;
      if (it.lemma.length < 2) return false;
      if (!s.showKnown && Store.isKnown(it.lemma)) return false;
      if (!s.showAdded && Store.hasCard(it.lemma)) return false;
      if (!s.showProper && it.capitalizedOnly) return false;
      if (q && it.lemma.indexOf(q) < 0 && (it.entry.s || '').indexOf(q) < 0 && !it.forms.some((f) => f.indexOf(q) === 0)) return false;
      return true;
    });
    const rank = (it) => it.rank || 1e9;
    const sorters = {
      recommended: (a, b) => rank(a) - rank(b) || b.count - a.count,
      order: (a, b) => a.order - b.order,
      count: (a, b) => b.count - a.count || rank(a) - rank(b),
      hard: (a, b) => rank(b) - rank(a),
      abc: (a, b) => (a.lemma < b.lemma ? -1 : a.lemma > b.lemma ? 1 : 0),
    };
    return list.sort(sorters[s.sort] || sorters.recommended);
  }

  function renderResults(keepScroll) {
    const box = document.getElementById('results');
    const res = state.current;
    if (!box || !res) return;
    const scrollY = window.scrollY;
    destroyPlayer();
    state.itemIndex = new Map(res.items.map((it) => [it.lemma, it]));
    const s = Store.settings;
    const hasVideo = !!res.videoId;
    const levelOpts = core.LEVELS.map((L) => `<option value="${L.lv}"${L.lv === s.level ? ' selected' : ''}>Lv${L.lv} 以上</option>`).join('');
    const sortOpts = [['recommended', 'おすすめ順（よく使う語から）'], ['order', '出てきた順'], ['count', 'よく出る順'], ['hard', '難しい順'], ['abc', 'ABC順']]
      .map(([v, l]) => `<option value="${v}"${s.sort === v ? ' selected' : ''}>${l}</option>`).join('');
    const targetCount = res.items.filter((it) => it.level >= s.level && !Store.isKnown(it.lemma) && !it.capitalizedOnly && it.lemma.length >= 2).length;

    let side = '<div class="card">';
    if (hasVideo) side += '<div class="player-slot" id="player-slot"></div>';
    side += `<div class="video-meta"><div class="title">${esc(res.title || '（タイトルなし）')}</div><div class="small muted">${esc(sourceMeta(res))}</div>
      <div class="row" style="margin-top:8px">${hasVideo ? `<a class="btn sm" href="${esc(UI.watchUrl(res.videoId))}" target="_blank" rel="noopener noreferrer">${icon('external')}YouTube で開く</a>` : ''}<button type="button" class="btn sm ghost" data-act="clearResult">${icon('x')}閉じる</button></div></div>`;
    side += `<div class="summary-grid"><div><b>${num(res.totalTokens)}</b><span>総語数</span></div><div><b>${num(res.items.length)}</b><span>異なる単語</span></div><div><b>${num(targetCount)}</b><span>Lv${s.level}以上</span></div></div>`;
    side += difficultyHtml(res);
    side += levelChartHtml(res);
    side += '</div>';

    const main = `<div class="card flat" style="padding:12px 14px">
        <div class="filters">
          <select class="select" data-change="level" aria-label="表示するレベル">${levelOpts}</select>
          <select class="select" data-change="sort" aria-label="並び順">${sortOpts}</select>
          <input class="input grow" type="search" placeholder="絞り込み（英語・日本語）" data-input="q" value="${esc(state.query)}" aria-label="絞り込み">
        </div>
        <div class="filters" style="margin-top:8px">
          <label class="check"><input type="checkbox" data-change="showAdded"${s.showAdded ? ' checked' : ''}>登録済みも表示</label>
          <label class="check"><input type="checkbox" data-change="showKnown"${s.showKnown ? ' checked' : ''}>「知ってる」も表示</label>
          <label class="check"><input type="checkbox" data-change="showProper"${s.showProper ? ' checked' : ''}>固有名詞っぽい語も表示</label>
        </div>
        <div class="bulkbar" id="bulkbar" style="margin-top:10px"></div>
      </div>
      <div id="word-list" class="word-list" style="margin-top:10px"></div>
      ${unknownHtml(res)}`;

    box.innerHTML = `<div class="results${hasVideo ? ' has-video' : ''}"><div class="side">${side}</div><div class="main-col">${main}</div></div>`;
    if (hasVideo) state.player = new UI.VideoPlayer(document.getElementById('player-slot'), res.videoId, res.start || 0, { embed: CAN_EMBED, thumb: !PREVIEW });
    renderWordList();
    if (keepScroll) window.scrollTo(0, scrollY);
  }

  function sourceMeta(res) {
    const parts = [];
    if (res.author) parts.push(res.author);
    if (res.lengthSeconds) parts.push(core.formatTime(res.lengthSeconds));
    if (res.track) parts.push('字幕: ' + (res.track.isGenerated ? '自動生成' : '投稿者・コミュニティ') + (res.track.name ? '（' + res.track.name + '）' : ''));
    if (res.type === 'text') parts.push('貼り付けた英文・' + res.segments.length + '行');
    return parts.join(' ・ ');
  }

  function difficultyHtml(res) {
    const st = res.stats;
    const lines = [];
    if (st.rank95) {
      const approx = Math.max(100, Math.round(st.rank95 / 100) * 100);
      lines.push(`95% の語を理解するのに必要な語彙: <b>約${num(approx)}語</b> ${UI.lvBadge(st.level95)}`);
    }
    if (Store.settings.vocabSize) {
      const cov = core.coverageForVocab(res.items, Store.settings.vocabSize, Store.known);
      lines.push(`あなたの推定語彙（約${num(Store.settings.vocabSize)}語）で分かる割合: <b>${Math.round(cov * 100)}%</b>`);
    }
    return lines.length ? `<div class="small" style="margin:4px 0 10px;display:grid;gap:4px">${lines.map((l) => '<div>' + l + '</div>').join('')}</div>` : '';
  }

  function levelChartHtml(res) {
    const s = Store.settings;
    const items = res.stats.byLevel.map((b) => ({
      label: 'Lv' + b.lv,
      tip: 'Lv' + b.lv + '（' + core.LEVELS[b.lv - 1].guide + '）・' + (b.lv >= s.level ? '表示中' : '非表示'),
      value: b.words,
      dim: b.lv < s.level,
      cap: b.lv >= s.level,
    }));
    return `<div><div class="small" style="font-weight:700;margin-bottom:4px">レベル別の単語数</div>
      ${UI.columnChart({ items, unit: '語', caption: 'レベル別の単語数', height: 110 })}
      <div class="chart-legend"><span><i></i>表示中（Lv${s.level}以上）</span><span><i class="dim"></i>非表示</span></div></div>`;
  }

  function unknownHtml(res) {
    const list = res.unknown.filter((u) => u.word.length >= 3).slice(0, 80);
    if (!list.length) return '';
    return `<details class="card" style="margin-top:16px"><summary style="cursor:pointer"><b>辞書にない語（${list.length}）</b> <span class="muted small">人名・新語・つづり違いなど</span></summary>
      <div class="word-list" style="margin-top:10px">${list.map((u) => `<div class="word-row" data-w="${esc(u.word)}" style="grid-template-columns:1fr auto">
        <div class="main"><div class="head"><span class="word en">${esc(u.word)}</span>${speakBtn(u.word, 'sm')}${u.count > 1 ? '<span class="count">×' + u.count + '</span>' : ''}</div>
        ${ctxHtml(u.context ? Object.assign({ t: u.time }, u.context) : null, res)}</div>
        <div class="actions"><button type="button" class="btn sm" data-act="addUnknown" data-w="${esc(u.word)}">${icon('plus')}意味を入れて追加</button></div></div>`).join('')}</div></details>`;
  }

  function ctxHtml(ctx, res) {
    if (!ctx || !ctx.text) return '';
    let ts = '';
    if (ctx.t != null) {
      if (res && res.videoId && CAN_EMBED) ts = `<button type="button" class="ts" data-act="seek" data-t="${esc(ctx.t)}" title="この場面を再生">${icon('play')}${core.formatTime(ctx.t)}</button>`;
      else if (res && res.videoId) ts = `<a class="ts" href="${esc(UI.watchUrl(res.videoId, ctx.t))}" target="_blank" rel="noopener noreferrer" title="YouTube でこの場面を開く">${icon('play')}${core.formatTime(ctx.t)}</a>`;
      else ts = `<span class="ts" style="cursor:default">${core.formatTime(ctx.t)}</span>`;
    }
    return `<div class="ctx">${ts}<span class="en">${UI.highlight(ctx.text, ctx.hl)}</span></div>`;
  }

  function rowHtml(it, src) {
    const w = it.lemma;
    const e = it.entry;
    const added = Store.hasCard(w);
    const known = Store.isKnown(w);
    const ctxs = it.contexts || [];
    const expanded = state.expanded.has(w);
    const shown = expanded ? ctxs : ctxs.slice(0, 1);
    const forms = (it.forms || []).filter((f) => f !== w);
    return `<div class="word-row${added ? ' done' : ''}" data-w="${esc(w)}">
      <label class="sel"><input type="checkbox" data-act="sel"${state.selected.has(w) && !added ? ' checked' : ''}${added ? ' disabled' : ''} aria-label="${esc(e.d)} を選択"></label>
      <div class="main">
        <div class="head">
          <button type="button" class="word en" data-act="detail" title="詳しく見る">${esc(e.d)}</button>
          ${speakBtn(e.d, 'sm')}
          ${UI.lvBadge(it.level)}
          ${it.count > 1 ? '<span class="count">×' + it.count + '</span>' : ''}
          ${forms.length ? '<span class="forms en">' + esc(forms.slice(0, 4).join(', ')) + '</span>' : ''}
          ${known ? '<span class="tag">知ってる</span>' : ''}
          ${it.capitalizedOnly ? '<span class="tag" title="文の途中でいつも大文字で始まっていた語">固有名詞?</span>' : ''}
        </div>
        <div class="meaning">${esc(e.s || '（辞書に訳がありません）')}</div>
        ${shown.map((c) => ctxHtml(c, src)).join('')}
        ${ctxs.length > 1 && !expanded ? '<button type="button" class="more-ctx" data-act="more">他の例文（' + (ctxs.length - 1) + '）</button>' : ''}
      </div>
      <div class="actions">
        ${added
          ? `<button type="button" class="btn sm added" data-act="remove" title="単語帳から外す">${icon('check')}追加済み</button>`
          : `<button type="button" class="btn sm primary" data-act="add">${icon('plus')}単語帳へ</button>`}
        ${known
          ? '<button type="button" class="btn sm ghost" data-act="unknown">「知ってる」を解除</button>'
          : `<button type="button" class="btn sm ghost" data-act="known" title="今後の抽出で表示しない">${icon('known')}知ってる</button>`}
      </div>
    </div>`;
  }

  function renderWordList() {
    const list = document.getElementById('word-list');
    if (!list || !state.current) return;
    const items = visibleItems();
    state.visible = items;
    const src = currentSource();
    if (!items.length) {
      list.innerHTML = `<div class="card empty">${icon('search')}<p>条件に合う単語はありません。</p><p class="small">レベルを下げるか、「登録済みも表示」「知ってるも表示」をオンにしてみてください。</p></div>`;
    } else {
      const shown = items.slice(0, state.limit);
      list.innerHTML = shown.map((it) => rowHtml(it, src)).join('') +
        (items.length > shown.length ? `<button type="button" class="btn block" data-act="showMore">もっと表示（残り ${num(items.length - shown.length)}語）</button>` : '');
    }
    updateBulkBar();
  }

  function rerenderRow(w) {
    const row = $view.querySelector('.word-row[data-w="' + cssEscape(w) + '"]');
    const it = state.itemIndex.get(w) || (state.importTab === 'list' ? state.list.items.find((x) => x.lemma === w) : null);
    if (!row || !it) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = rowHtml(it, currentSourceForRow());
    row.replaceWith(tmp.firstElementChild);
    updateBulkBar();
  }

  function currentSourceForRow() {
    return state.importTab === 'list' && !document.getElementById('word-list') ? { type: 'list', videoId: null } : currentSource();
  }

  function cssEscape(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
  }

  function updateBulkBar() {
    const bar = document.getElementById('bulkbar');
    if (!bar) return;
    const visible = state.visible || [];
    const selectable = visible.filter((it) => !Store.hasCard(it.lemma)).length;
    const n = Array.from(state.selected).filter((w) => !Store.hasCard(w)).length;
    bar.innerHTML = `<span class="small muted">表示中 ${num(visible.length)}語</span>
      ${selectable ? `<button type="button" class="btn sm ghost" data-act="selectAll">表示中をすべて選択</button>` : ''}
      ${n ? `<button type="button" class="btn sm ghost" data-act="selectNone">選択を解除</button><button type="button" class="btn sm primary" data-act="addSelected">${icon('plus')}選択した ${n}語を単語帳へ</button>` : ''}`;
  }

  function exampleFromContext(ctx, t, src) {
    if (!ctx || !ctx.text) return null;
    return { s: ctx.text, hl: ctx.hl || null, v: (src && src.videoId) || null, t: t == null ? (ctx.t == null ? null : ctx.t) : t, title: (src && src.title) || '' };
  }

  function cardDataFromItem(it, src) {
    return {
      w: it.lemma,
      d: it.entry.d || it.lemma,
      m: it.entry.s || '',
      src: src.type,
      ex: (it.contexts || []).slice(0, 3).map((c) => exampleFromContext(c, c.t, src)).filter(Boolean),
    };
  }

  function addItem(it, silent) {
    if (!it) return;
    const src = state.importTab === 'list' && !state.itemIndex.has(it.lemma) ? { type: 'list', videoId: null, title: '' } : currentSource();
    Store.addCard(cardDataFromItem(it, src));
    state.selected.delete(it.lemma);
    rerenderRow(it.lemma);
    updateBadges();
    if (!silent) {
      UI.toast(`「${it.entry.d}」を単語帳に追加しました`, {
        action: '元に戻す',
        onAction: () => {
          Store.deleteCard(it.lemma);
          rerenderRow(it.lemma);
          updateBadges();
        },
      });
    }
  }

  function removeItem(w) {
    const card = Store.deleteCard(w);
    rerenderRow(w);
    updateBadges();
    if (card) {
      UI.toast(`「${card.d}」を単語帳から外しました`, {
        action: '元に戻す',
        onAction: () => {
          Store.restoreCard(card);
          rerenderRow(w);
          updateBadges();
        },
      });
    }
  }

  function markKnownItem(w, row) {
    Store.markKnown(w);
    state.selected.delete(w);
    const hide = !Store.settings.showKnown;
    const finish = () => {
      if (hide && row && row.parentNode) {
        row.remove();
        state.visible = (state.visible || []).filter((it) => it.lemma !== w);
        updateBulkBar();
      } else rerenderRow(w);
    };
    if (hide && row) {
      row.classList.add('leaving');
      setTimeout(finish, 200);
    } else finish();
    const e = dict.get(w);
    UI.toast(`「${e ? e.d : w}」を「知ってる」にしました（今後は表示しません）`, {
      action: '元に戻す',
      onAction: () => {
        Store.unmarkKnown(w);
        if (state.importTab === 'list') renderLevelList(true);
        else renderWordList();
      },
    });
  }

  function addSelected() {
    const words = Array.from(state.selected).filter((w) => !Store.hasCard(w));
    if (!words.length) return;
    words.forEach((w) => {
      const it = itemFor(w);
      const src = state.itemIndex.has(w) ? currentSource() : { type: 'list', videoId: null, title: '' };
      Store.addCard(cardDataFromItem(it, src), { batch: true });
    });
    Store.saveCards();
    state.selected.clear();
    if (state.importTab === 'list') renderLevelList(true);
    else renderWordList();
    updateBadges();
    UI.toast(`${words.length}語を単語帳に追加しました`, {
      action: '元に戻す',
      onAction: () => {
        words.forEach((w) => delete Store.cards[w]);
        Store.saveCards();
        if (state.importTab === 'list') renderLevelList(true);
        else renderWordList();
        updateBadges();
      },
    });
  }

  /* ---- レベル別の単語 ---- */
  function renderLevelList(keep) {
    const box = document.getElementById('results');
    if (!box) return;
    const lv = state.list.level;
    if (!keep || !state.list.items.length) {
      const L = core.LEVELS[lv - 1];
      const pool = [];
      for (let r = L.min; r <= Math.min(L.max === Infinity ? 20000 : L.max, dict.list.length); r++) {
        const e = dict.list[r - 1];
        if (!e || e.r !== r || e.p || !e.s || !/^[a-z][a-z-]+$/.test(e.w)) continue;
        if (Store.hasCard(e.w) || Store.isKnown(e.w)) continue;
        pool.push(e);
      }
      const rng = core.mulberry32(state.list.seed * 7919 + lv);
      state.list.items = core.shuffle(pool, rng).slice(0, 30).sort((a, b) => a.r - b.r).map((e) => makeItem(e.w));
      state.list.poolSize = pool.length;
    }
    state.itemIndex = new Map();
    const items = state.list.items.filter((it) => !Store.isKnown(it.lemma));
    state.visible = items;
    const src = { type: 'list', videoId: null };
    box.innerHTML = `<div style="margin-top:16px">
      <div class="card flat" style="padding:10px 14px;margin-bottom:10px"><div class="bulkbar" id="bulkbar"></div>
      <p class="small muted" style="margin:6px 0 0">Lv${lv} のまだ登録していない単語: ${num(state.list.poolSize || 0)}語（ここではランダムに30語を表示）</p></div>
      <div class="word-list">${items.length ? items.map((it) => rowHtml(it, src)).join('') : '<div class="card empty"><p>このレベルの単語はすべて登録済みか「知ってる」です。すごい！</p></div>'}</div></div>`;
    updateBulkBar();
  }

  /* ---- 単語の詳細シート ---- */
  function openWordSheet(it, src) {
    if (!it) return;
    const e = it.entry;
    const w = it.lemma;
    const rankText = e.r ? `よく使われる順で ${num(e.r)}位` : '頻度データなし（まれな語）';
    const forms = (it.forms || []).filter((f) => f !== w);
    const body = `
      <div class="row">${UI.lvBadge(it.level)}<span class="small muted">${esc(rankText)}</span></div>
      <p style="font-size:1.15rem;font-weight:750;margin:10px 0 4px">${esc(e.s || '（辞書に訳がありません）')}</p>
      <div class="def-block" id="long-def"><span class="muted small">詳しい意味を読み込んでいます…</span></div>
      ${forms.length ? `<div class="section-title">この${src.videoId ? '動画' : '英文'}での形</div><p class="en">${esc(forms.join(', '))}</p>` : ''}
      ${(it.contexts || []).length ? `<div class="section-title">例文</div>${it.contexts.map((c) => `<div class="ex-item">${ctxHtmlSheet(c, src)}</div>`).join('')}` : ''}
      ${PREVIEW ? '' : `<div class="section-title">英英辞典</div>
      <div id="en-def"><button type="button" class="btn sm" data-act="enDef">${icon('search')}英英辞典で調べる（Free Dictionary）</button></div>`}
      <div class="section-title">ほかの辞書で調べる</div>
      ${UI.dictLinks(e.d)}`;
    const sh = UI.sheet({
      title: e.d,
      titleHtml: `<span class="en">${esc(e.d)}</span>`,
      headExtra: speakBtn(e.d),
      body,
      foot: sheetFootFor(w),
      actions: {
        speak: (el) => UI.speak(el.getAttribute('data-say')),
        enDef: () => loadEnglishDef(e.d, sh.body.querySelector('#en-def')),
        playAudio: (el) => playAudio(el.getAttribute('data-src')),
        seek: (el) => {
          seekTo(parseFloat(el.getAttribute('data-t')));
          sh.close();
        },
        add: () => {
          if (state.itemIndex.has(w) || state.list.items.some((x) => x.lemma === w)) addItem(it);
          else {
            Store.addCard(cardDataFromItem(it, src));
            UI.toast(`「${e.d}」を単語帳に追加しました`);
          }
          updateBadges();
          sh.foot.innerHTML = sheetFootFor(w);
        },
        known: () => {
          sh.close();
          const row = $view.querySelector('.word-row[data-w="' + cssEscape(w) + '"]');
          markKnownItem(w, row);
        },
        openCard: () => {
          sh.close();
          openCardSheet(w);
        },
      },
    });
    if (Store.settings.autoSpeak) UI.speak(e.d);
    fillLongDef(w, sh.body.querySelector('#long-def'));
  }

  function sheetFootFor(w) {
    if (Store.hasCard(w)) return `<button type="button" class="btn" data-act="openCard">${icon('edit')}単語帳で編集</button><span class="btn added" style="cursor:default">${icon('check')}登録済み</span>`;
    return `<button type="button" class="btn ghost" data-act="known">${icon('known')}知ってる</button><button type="button" class="btn primary" data-act="add">${icon('plus')}単語帳に追加</button>`;
  }

  function ctxHtmlSheet(c, src) {
    const sentence = c.text || c.s || '';
    const hl = c.hl;
    const t = c.t;
    let ts = '';
    if (t != null) {
      if (src && src.videoId && state.player && state.current && state.current.videoId === src.videoId) ts = `<button type="button" class="ts" data-act="seek" data-t="${esc(t)}">${icon('play')}${core.formatTime(t)}</button>`;
      else if (src && src.videoId) ts = `<a class="ts" href="${esc(UI.watchUrl(src.videoId, t))}" target="_blank" rel="noopener noreferrer">${icon('play')}${core.formatTime(t)}</a>`;
    }
    return `${ts}<div style="flex:1;min-width:0"><span class="en">${UI.highlight(sentence, hl)}</span> <a class="small" href="${esc(UI.translateUrl(sentence))}" target="_blank" rel="noopener noreferrer">訳</a></div>`;
  }

  function fillLongDef(w, box) {
    if (!box) return;
    ensureDetails().then((ok) => {
      const e = dict.get(w);
      if (!box.isConnected) return;
      if (ok && e && e.l) box.textContent = e.l;
      else if (ok) box.innerHTML = '<span class="muted small">（これ以上の説明はありません）</span>';
      else box.innerHTML = '<span class="muted small">詳しい意味を読み込めませんでした。</span>';
    });
  }

  function loadEnglishDef(word, box) {
    if (!box) return;
    box.innerHTML = '<div class="row small muted"><div class="spinner" style="width:16px;height:16px;border-width:2px"></div>調べています…</div>';
    fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        const entries = Array.isArray(data) ? data : [];
        let phon = '';
        let audio = '';
        const meanings = [];
        entries.forEach((en) => {
          if (!phon && en.phonetic) phon = en.phonetic;
          (en.phonetics || []).forEach((p) => {
            if (!phon && p.text) phon = p.text;
            if (!audio && p.audio && /^https:\/\//.test(p.audio)) audio = p.audio;
          });
          (en.meanings || []).forEach((m) => meanings.push(m));
        });
        if (!meanings.length) throw new Error('none');
        let html = '<div class="row">' + (phon ? `<span class="en">${esc(phon)}</span>` : '') + (audio ? `<button type="button" class="btn sm" data-act="playAudio" data-src="${esc(audio)}">${icon('speaker')}ネイティブ音声</button>` : '') + '</div>';
        meanings.slice(0, 4).forEach((m) => {
          html += `<div class="small" style="margin-top:8px"><b>${esc(m.partOfSpeech || '')}</b><ol class="def-list">` +
            (m.definitions || []).slice(0, 3).map((d) => `<li class="en">${esc(d.definition)}${d.example ? '<div class="ex">' + esc(d.example) + '</div>' : ''}</li>`).join('') +
            '</ol></div>';
        });
        html += '<p class="small muted">出典: Free Dictionary API（Wiktionary）</p>';
        box.innerHTML = html;
      })
      .catch(() => {
        box.innerHTML = '<p class="small muted">英英辞典に見つかりませんでした（またはオフラインです）。</p>';
      });
  }

  function playAudio(src) {
    if (!src || !/^https:\/\//.test(src)) return;
    try {
      new Audio(src).play().catch(() => UI.toast('音声を再生できませんでした'));
    } catch (e) {
      UI.toast('音声を再生できませんでした');
    }
  }

  /* ================================================================== *
   * 履歴
   * ================================================================== */
  function viewHistory(r) {
    const id = r.args.join('/');
    const h = Store.getHistory(id);
    if (!h) {
      UI.toast('履歴が見つかりませんでした');
      location.replace('#/import');
      return;
    }
    if (!h.segments || !h.segments.length) {
      if (h.videoId) {
        state.lastUrl = UI.watchUrl(h.videoId);
        location.replace('#/import/youtube');
        setTimeout(() => fetchYoutube(state.lastUrl), 50);
      } else {
        UI.toast('この履歴の本文は保存されていません');
        location.replace('#/import');
      }
      return;
    }
    state.current = buildResult(h);
    resetResultState();
    if (h.videoId) state.lastUrl = UI.watchUrl(h.videoId);
    location.replace(h.type === 'youtube' ? '#/import/youtube' : '#/import/text');
  }

  /* ================================================================== *
   * 学習
   * ================================================================== */
  function viewStudy(r) {
    const sub = r.args[0];
    if (sub === 'review') return startReview();
    if (sub === 'quiz') return startQuiz(r.args[1]);
    studyMenu();
  }

  const QUIZ_MODES = {
    'en-ja': { title: '4択：英語 → 日本語', desc: '単語を見て、意味を選ぶ', icon: 'layers' },
    'ja-en': { title: '4択：日本語 → 英語', desc: '意味を見て、英単語を選ぶ', icon: 'shuffle' },
    listen: { title: 'リスニング', desc: '発音を聞いて、意味を選ぶ', icon: 'ear' },
    spell: { title: 'スペリング', desc: '意味を見て、つづりを入力', icon: 'keyboard' },
    cloze: { title: '例文の穴埋め', desc: '動画の例文の空欄に入る単語を選ぶ', icon: 'quote' },
  };

  function studyMenu() {
    const c = Store.counts();
    const todo = c.due + c.newToday;
    const sc = state.study;
    const scopeBtn = (v, l) => `<button type="button" data-act="scope" data-v="${v}" aria-pressed="${sc.scope === v}">${l}</button>`;
    const countBtn = (v) => `<button type="button" data-act="count" data-v="${v}" aria-pressed="${sc.count === v}">${v}問</button>`;
    let html = `<div class="page-head"><div><h1>学習</h1><p>毎日の復習で記憶を定着させ、クイズで覚えたか確かめましょう。</p></div></div><div class="stack">`;
    if (!c.total) {
      html += `<div class="notice info">${icon('info')}<div>単語帳がまだ空です。まずは<a href="#/import">動画から単語を取り込み</a>ましょう。</div></div>`;
    }
    html += `<div class="card hero"><div><div class="label">今日の復習（フラッシュカード）</div><div class="figure">${num(todo)}<small>語</small></div>
      <div class="sub">復習 ${num(c.due)}語 ・ 新しい単語 ${num(c.newToday)}語（1日 ${num(Store.settings.newPerDay)}語まで）</div></div>
      ${todo ? `<a class="btn primary lg" href="#/study/review">${icon('study')}復習を始める</a>` : `<div class="muted small">${esc(nextDueInfo() || '単語を追加すると出題されます')}</div>`}</div>`;
    html += `<div class="section-title">クイズ</div>
      <div class="card flat" style="padding:12px 14px"><div class="filters">
        <span class="small muted">出題範囲</span><div class="seg">${scopeBtn('all', 'すべて')}${scopeBtn('notMastered', '習得前')}${scopeBtn('weak', '苦手')}${scopeBtn('recent', '最近追加')}</div>
        <span class="small muted">問題数</span><div class="seg">${countBtn(10)}${countBtn(20)}${countBtn(30)}</div>
      </div></div>
      <div class="mode-grid">${Object.keys(QUIZ_MODES).map((m) => {
        const n = quizPool(sc.scope, m).length;
        const M = QUIZ_MODES[m];
        return `<button type="button" class="mode-card" data-act="quiz" data-mode="${m}"${n ? '' : ' disabled aria-disabled="true"'}>
          <span class="t">${icon(M.icon)}${esc(M.title)}</span><span class="d">${esc(M.desc)}</span><span class="small muted">出題できる単語: ${num(n)}語</span></button>`;
      }).join('')}</div>
      <p class="small muted">クイズで間違えた単語は、今日の復習に自動で追加されます。</p>`;
    html += '</div>';
    setView(html, commonActions({
      scope: (el) => { state.study.scope = el.getAttribute('data-v'); studyMenu(); },
      count: (el) => { state.study.count = parseInt(el.getAttribute('data-v'), 10); studyMenu(); },
      quiz: (el) => {
        if (el.disabled) return UI.toast('この範囲には出題できる単語がありません');
        go('#/study/quiz/' + el.getAttribute('data-mode'));
      },
    }));
  }

  function cardDirection() {
    const d = Store.settings.direction;
    if (d === 'mixed') return Math.random() < 0.5 ? 'en-ja' : 'ja-en';
    return d === 'ja-en' ? 'ja-en' : 'en-ja';
  }

  /* ---- フラッシュカード ---- */
  function startReview() {
    const now = Date.now();
    const due = Store.dueCards(now);
    const learning = due.filter((c) => c.srs.state !== 'review').sort((a, b) => a.srs.due - b.srs.due);
    const reviews = core.shuffle(due.filter((c) => c.srs.state === 'review'));
    const news = Store.newCards().slice(0, Store.newRemainingToday());
    const queue = learning.map((c) => c.w);
    let ri = 0;
    let ni = 0;
    while (ri < reviews.length || ni < news.length) {
      for (let k = 0; k < 3 && ri < reviews.length; k++) queue.push(reviews[ri++].w);
      if (ni < news.length) queue.push(news[ni++].w);
    }
    if (!queue.length) {
      setView(`<div class="session"><div class="card empty">${icon('check')}<h2>今は復習する単語がありません</h2>
        <p>${esc(nextDueInfo() || '単語帳に単語を追加すると、ここで出題されます。')}</p>
        <div class="row" style="justify-content:center;margin-top:10px"><a class="btn primary" href="#/study">クイズをする</a><a class="btn" href="#/import">単語を集める</a></div></div></div>`, {});
      return;
    }
    state.review = { queue, initial: queue.length, graded: 0, counts: [0, 0, 0, 0], card: null, revealed: false, dir: 'en-ja' };
    setSession(true);
    keyHandler = (e) => {
      const s = state.review;
      if (!s || !s.card) return;
      if (!s.revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        reveal();
      } else if (s.revealed && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        gradeCard(parseInt(e.key, 10) - 1);
      } else if (e.key === 'p' || e.key === 'P') {
        UI.speak(s.card.d);
      }
    };
    cleanup = () => {
      state.review = null;
    };
    nextCard();
  }

  function nextCard() {
    const s = state.review;
    if (!s) return;
    let card = null;
    while (s.queue.length && !card) card = Store.getCard(s.queue.shift());
    if (!card) return finishReview();
    s.card = card;
    s.revealed = false;
    s.dir = cardDirection();
    renderFlash();
    if (Store.settings.autoSpeak && s.dir === 'en-ja') UI.speak(card.d);
  }

  function reveal() {
    const s = state.review;
    if (!s || s.revealed) return;
    s.revealed = true;
    renderFlash();
    if (Store.settings.autoSpeak && s.dir === 'ja-en') UI.speak(s.card.d);
  }

  function exampleOf(card) {
    return (card.ex || []).find((x) => x.s) || null;
  }

  function renderFlash() {
    const s = state.review;
    const c = s.card;
    const ex = exampleOf(c);
    const remaining = s.queue.length + 1;
    const pct = Math.min(100, Math.round((s.graded / Math.max(1, s.graded + remaining)) * 100));
    const isNew = !c.srs || c.srs.state === 'new';
    let front;
    if (s.dir === 'en-ja') {
      front = `${isNew ? '<span class="tag new">新しい単語</span>' : ''}<div class="big en">${esc(c.d)}</div>${speakBtn(c.d)}
        ${ex ? `<div class="example en">${UI.highlight(ex.s, ex.hl)}</div>` : ''}`;
    } else {
      front = `${isNew ? '<span class="tag new">新しい単語</span>' : ''}<div class="prompt muted small">この意味の英単語は？</div><div class="big ja">${esc(c.m || '（意味が未入力）')}</div>
        ${ex && ex.hl ? `<div class="example en">${UI.blankOut(ex.s, ex.hl)}</div>` : ''}`;
    }
    let answer = '';
    if (s.revealed) {
      const exLink = ex && ex.v && ex.t != null ? `<a class="ts" href="${esc(UI.watchUrl(ex.v, ex.t))}" target="_blank" rel="noopener noreferrer" title="${esc(ex.title || '動画')}">${icon('play')}${core.formatTime(ex.t)}</a>` : '';
      answer = `<div class="answer">
        ${s.dir === 'en-ja' ? `<div class="meaning">${esc(c.m || '（意味が未入力）')}</div>` : `<div class="row" style="justify-content:center"><div class="big en">${esc(c.d)}</div>${speakBtn(c.d)}</div>`}
        ${c.note ? `<div class="muted">${esc(c.note)}</div>` : ''}
        ${ex && s.dir === 'ja-en' ? `<div class="example en">${UI.highlight(ex.s, ex.hl)}</div>` : ''}
        ${exLink ? `<div class="row small" style="justify-content:center">${exLink}<span class="muted">${esc(ex.title || '')}</span></div>` : ''}
        <div><button type="button" class="btn sm ghost" data-act="detail">${icon('book')}詳しく・編集</button></div>
      </div>`;
    }
    const p = s.revealed ? core.previewIntervals(c.srs, Date.now()) : null;
    const html = `<div class="session">
      <div class="session-top"><a class="btn ghost sm" href="#/study">${icon('x')}終了</a><div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><span class="count">残り ${remaining}</span></div>
      <div class="card flash"><div class="front">${front}</div>${answer}
        ${s.revealed ? '' : `<button type="button" class="btn primary lg block" data-act="reveal" style="margin-top:18px">答えを見る <span class="kbd" style="color:inherit;border-color:currentColor">Space</span></button>`}
      </div>
      ${s.revealed ? `<div class="grade" role="group" aria-label="覚えていた度合い">
        <button type="button" class="again" data-act="grade" data-g="0">もう一度<small>${p[0]}</small></button>
        <button type="button" data-act="grade" data-g="1">難しい<small>${p[1]}</small></button>
        <button type="button" class="good" data-act="grade" data-g="2">正解<small>${p[2]}</small></button>
        <button type="button" data-act="grade" data-g="3">簡単<small>${p[3]}</small></button></div>` : ''}
      <p class="hint-keys">${s.revealed ? '<span class="kbd">1</span>〜<span class="kbd">4</span> で評価' : '<span class="kbd">Space</span> で答え'} ・ <span class="kbd">P</span> で発音</p>
    </div>`;
    setView(html, commonActions({
      reveal: reveal,
      grade: (el) => gradeCard(parseInt(el.getAttribute('data-g'), 10)),
      detail: () => openCardSheet(c.w, () => { if (state.review && state.review.card) { state.review.card = Store.getCard(c.w) || state.review.card; renderFlash(); } }),
    }));
    const focusEl = $view.querySelector(s.revealed ? '.grade .good' : '[data-act="reveal"]');
    if (focusEl) focusEl.focus({ preventScroll: true });
  }

  function gradeCard(g) {
    const s = state.review;
    if (!s || !s.revealed || !(g >= 0 && g <= 3)) return;
    const card = Store.getCard(s.card.w);
    if (!card) return nextCard();
    const now = Date.now();
    const wasNew = !card.srs || card.srs.state === 'new';
    card.srs = core.schedule(card.srs, g, now);
    Store.saveCards();
    Store.logActivity('r');
    if (wasNew) Store.logActivity('n');
    s.counts[g]++;
    s.graded++;
    if (card.srs.due - now < 20 * core.MIN) {
      s.queue.splice(Math.min(s.queue.length, g === 0 ? 3 : 6), 0, card.w);
    }
    nextCard();
  }

  function finishReview() {
    const s = state.review;
    const ok = s.counts[2] + s.counts[3];
    setView(`<div class="session"><div class="card" style="text-align:center;padding:30px 20px">
      <div class="result-big">${icon('check')}</div>
      <h2 style="margin-top:6px">お疲れさまでした！</h2>
      <p>${num(s.graded)}回 復習しました（正解・簡単 ${num(ok)} ／ 難しい ${num(s.counts[1])} ／ もう一度 ${num(s.counts[0])}）</p>
      <p class="muted">${esc(nextDueInfo())}</p>
      <div class="row" style="justify-content:center;margin-top:14px"><a class="btn primary" href="#/">ホームへ</a><a class="btn" href="#/study">クイズで確認</a><a class="btn" href="#/import">単語を集める</a></div>
    </div></div>`, {});
    state.review = null;
    keyHandler = null;
    setSession(false);
    updateBadges();
  }

  /* ---- クイズ ---- */
  function quizPool(scope, mode) {
    let cards = Store.allCards();
    if (scope === 'notMastered') cards = cards.filter((c) => core.cardStatus(c.srs) !== 'mastered');
    else if (scope === 'weak') cards = cards.filter(Store.isWeak);
    else if (scope === 'recent') cards = cards.slice().sort((a, b) => b.added - a.added).slice(0, 50);
    if (mode === 'cloze') cards = cards.filter((c) => (c.ex || []).some((x) => x.s && x.hl));
    if (mode === 'en-ja' || mode === 'listen' || mode === 'ja-en' || mode === 'spell') cards = cards.filter((c) => c.m);
    return cards;
  }

  /** ダミーの選択肢を、単語帳の他の単語→辞書の近いレベルの単語の順で集める */
  function distractors(card, kind, n) {
    const out = [];
    const seen = new Set([card.w]);
    const answerText = kind === 'meaning' ? card.m : card.d;
    const pushVal = (w, val) => {
      if (!val || seen.has(w) || val === answerText || out.some((o) => o.val === val)) return;
      seen.add(w);
      out.push({ w, val });
    };
    core.shuffle(Store.allCards()).forEach((c) => {
      if (out.length < n) pushVal(c.w, kind === 'meaning' ? c.m : c.d);
    });
    if (out.length < n) {
      const e = dict.get(card.w);
      const r = e && e.r ? e.r : 3000;
      const lo = Math.max(1, r - 1500);
      const hi = Math.min(dict.list.length, r + 1500);
      let guard = 0;
      while (out.length < n && guard++ < 500) {
        const cand = dict.list[lo - 1 + Math.floor(Math.random() * (hi - lo + 1))];
        if (!cand || cand.p || !cand.s || !/^[a-z]{3,}$/.test(cand.w)) continue;
        pushVal(cand.w, kind === 'meaning' ? cand.s : cand.d);
      }
    }
    return out.slice(0, n);
  }

  function makeQuestion(card, mode) {
    const q = { card, mode, ex: null, options: null, answer: null };
    if (mode === 'cloze') q.ex = core.shuffle((card.ex || []).filter((x) => x.s && x.hl))[0];
    if (mode === 'spell') {
      q.ex = (card.ex || []).find((x) => x.s && x.hl) || null;
      return q;
    }
    const kind = mode === 'en-ja' || mode === 'listen' ? 'meaning' : 'word';
    const correct = kind === 'meaning' ? card.m : card.d;
    const opts = distractors(card, kind, 3).map((d) => d.val);
    opts.push(correct);
    q.options = core.shuffle(opts);
    q.answer = q.options.indexOf(correct);
    return q;
  }

  function startQuiz(mode) {
    if (!QUIZ_MODES[mode]) {
      location.replace('#/study');
      return;
    }
    const pool = quizPool(state.study.scope, mode);
    if (!pool.length) {
      setView(`<div class="session"><div class="card empty">${icon('info')}<p>この範囲には出題できる単語がありません。</p><a class="btn" href="#/study">戻る</a></div></div>`, {});
      return;
    }
    const qs = core.shuffle(pool).slice(0, state.study.count).map((c) => makeQuestion(c, mode));
    state.quiz = { mode, qs, i: 0, answered: false, correct: 0, wrong: [], hint: 0 };
    setSession(true);
    keyHandler = (e) => {
      const z = state.quiz;
      if (!z) return;
      if (!z.answered && z.mode !== 'spell' && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        answerChoice(parseInt(e.key, 10) - 1);
      } else if (z.answered && e.key === 'Enter') {
        e.preventDefault();
        nextQuestion();
      } else if ((e.key === 'p' || e.key === 'P') && (z.answered || z.mode === 'listen' || z.mode === 'en-ja')) {
        UI.speak(z.qs[z.i].card.d);
      }
    };
    cleanup = () => {
      state.quiz = null;
    };
    renderQuiz();
  }

  function renderQuiz() {
    const z = state.quiz;
    const q = z.qs[z.i];
    const c = q.card;
    const pct = Math.round((z.i / z.qs.length) * 100);
    let prompt = '';
    if (z.mode === 'en-ja') prompt = `<div class="prompt">この単語の意味は？</div><div class="big en">${esc(c.d)}</div>${speakBtn(c.d)}`;
    else if (z.mode === 'ja-en') prompt = `<div class="prompt">この意味の英単語は？</div><div class="big ja">${esc(c.m)}</div>`;
    else if (z.mode === 'listen') prompt = `<div class="prompt">聞こえた単語の意味は？</div><button type="button" class="big-speak" data-act="speak" data-say="${esc(c.d)}" aria-label="もう一度聞く">${icon('speaker')}</button><div class="small muted">ボタンを押すともう一度聞けます</div>`;
    else if (z.mode === 'cloze') prompt = `<div class="prompt">空欄に入る単語は？</div><div class="sentence en">${UI.blankOut(q.ex.s, q.ex.hl)}</div><div class="small muted">ヒント: ${esc(c.m)}</div>`;
    else if (z.mode === 'spell') {
      prompt = `<div class="prompt">この意味の英単語をつづってください</div><div class="big ja">${esc(c.m)}</div>
        ${q.ex ? `<div class="sentence en small">${UI.blankOut(q.ex.s, q.ex.hl)}</div>` : ''}
        <form data-submit="spell" style="margin-top:12px" autocomplete="off"><input class="input spell-input en" name="a" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="つづり" placeholder="${z.hint ? esc(c.d.slice(0, z.hint)) + '…' : 'type here'}"${z.answered ? ' disabled' : ''}>
        ${z.answered ? '' : `<div class="row" style="justify-content:center;margin-top:10px"><button type="button" class="btn ghost sm" data-act="hint">ヒント（${z.hint ? 'もう1文字' : '最初の文字'}）</button><button class="btn primary" type="submit">答え合わせ</button></div>`}</form>`;
    }
    const choices = q.options
      ? `<div class="choices">${q.options.map((o, i) => `<button type="button" class="choice" data-act="choose" data-i="${i}"><span class="n">${i + 1}</span><span class="${z.mode === 'ja-en' || z.mode === 'cloze' ? 'en' : ''}">${esc(o)}</span><span class="mark"></span></button>`).join('')}</div>`
      : '';
    const html = `<div class="session">
      <div class="session-top"><a class="btn ghost sm" href="#/study">${icon('x')}終了</a><div class="progress"><i style="width:${pct}%"></i></div><span class="count">${z.i + 1} / ${z.qs.length}</span></div>
      <div class="card quiz-q">${prompt}</div>${choices}<div id="feedback"></div>
      <p class="hint-keys">${q.options ? '<span class="kbd">1</span>〜<span class="kbd">4</span> で回答 ・ ' : ''}<span class="kbd">Enter</span> で次へ</p>
    </div>`;
    setView(html, commonActions({
      choose: (el) => answerChoice(parseInt(el.getAttribute('data-i'), 10)),
      spell: (form) => answerSpell(form.a.value),
      hint: () => {
        z.hint = Math.min(c.d.length - 1, z.hint + 1);
        const input = $view.querySelector('.spell-input');
        const val = input ? input.value : '';
        renderQuiz();
        const inp = $view.querySelector('.spell-input');
        if (inp) {
          inp.value = val;
          inp.focus();
        }
      },
      next: nextQuestion,
    }));
    if (z.mode === 'listen' || (z.mode === 'en-ja' && Store.settings.autoSpeak)) UI.speak(c.d);
    const inp = $view.querySelector('.spell-input');
    if (inp && !z.answered) inp.focus();
  }

  function recordAnswer(card, ok) {
    const c = Store.getCard(card.w);
    if (c) {
      if (ok) c.ok = (c.ok || 0) + 1;
      else {
        c.ng = (c.ng || 0) + 1;
        if (c.srs && c.srs.state === 'review') c.srs = Object.assign({}, c.srs, { due: Date.now() });
      }
      Store.saveCards();
    }
    Store.logActivity('q');
    if (ok) Store.logActivity('c');
  }

  function showFeedback(ok, correctText, isEn) {
    const z = state.quiz;
    z.answered = true;
    const fb = document.getElementById('feedback');
    if (!fb) return;
    fb.innerHTML = `<div class="feedback"><span class="res ${ok ? 'ok' : 'ng'}">${icon(ok ? 'check' : 'x')}${ok ? '正解！' : '不正解'}</span>
      ${ok ? '' : `<span>正解: <b class="${isEn ? 'en' : ''}">${esc(correctText)}</b></span>`}
      <button type="button" class="btn primary" data-act="next">${z.i + 1 >= z.qs.length ? '結果を見る' : '次へ'} <span class="kbd" style="color:inherit;border-color:currentColor">Enter</span></button></div>`;
    const b = fb.querySelector('[data-act="next"]');
    if (b) b.focus({ preventScroll: true });
    fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function answerChoice(i) {
    const z = state.quiz;
    if (!z || z.answered) return;
    const q = z.qs[z.i];
    if (!q.options || i < 0 || i >= q.options.length) return;
    const ok = i === q.answer;
    const btns = $view.querySelectorAll('.choice');
    btns.forEach((b, j) => {
      b.disabled = true;
      if (j === q.answer) {
        b.classList.add('correct');
        b.querySelector('.mark').innerHTML = icon('check') + '正解';
      } else if (j === i) {
        b.classList.add('wrong');
        b.querySelector('.mark').innerHTML = icon('x') + 'あなたの回答';
      }
    });
    if (ok) z.correct++;
    else z.wrong.push(q.card);
    recordAnswer(q.card, ok);
    showFeedback(ok, q.options[q.answer], z.mode === 'ja-en' || z.mode === 'cloze');
    if (z.mode !== 'listen' || !ok) UI.speak(q.card.d);
  }

  function answerSpell(value) {
    const z = state.quiz;
    if (!z || z.answered) return;
    const q = z.qs[z.i];
    const want = q.card.d;
    const got = String(value || '').trim();
    if (!got) return UI.toast('つづりを入力してください');
    const norm = (s) => core.normalizeWord(s).replace(/\s+/g, ' ');
    const ok = norm(got) === norm(want) || (dict.lemmatize(norm(got)) === q.card.w && norm(got).length >= want.length - 1);
    if (ok) z.correct++;
    else z.wrong.push(q.card);
    recordAnswer(q.card, ok);
    const inp = $view.querySelector('.spell-input');
    if (inp) inp.disabled = true;
    const row = $view.querySelector('form[data-submit="spell"] .row');
    if (row) row.remove();
    showFeedback(ok, want, true);
    if (!ok) {
      const fb = document.getElementById('feedback');
      if (fb) fb.insertAdjacentHTML('afterbegin', `<p class="en" style="text-align:center;font-size:1.1rem">あなた: ${diffHtml(got, want)}</p>`);
    }
    UI.speak(want);
  }

  /** 入力したつづりのうち、正しい位置の文字と違う文字を色＋下線で区別 */
  function diffHtml(got, want) {
    let out = '';
    for (let i = 0; i < got.length; i++) {
      const ch = got[i];
      const ok = want[i] && want[i].toLowerCase() === ch.toLowerCase();
      out += ok ? `<span class="diff-ok">${esc(ch)}</span>` : `<span class="diff-ng">${esc(ch)}</span>`;
    }
    return out;
  }

  function nextQuestion() {
    const z = state.quiz;
    if (!z || !z.answered) return;
    z.i++;
    z.answered = false;
    z.hint = 0;
    if (z.i >= z.qs.length) return finishQuiz();
    renderQuiz();
  }

  function finishQuiz() {
    const z = state.quiz;
    const n = z.qs.length;
    const rate = Math.round((z.correct / n) * 100);
    const wrongList = z.wrong.map((c) => `<div class="ex-item"><span class="en" style="font-weight:800;min-width:7em">${esc(c.d)}</span>${speakBtn(c.d, 'sm')}<span>${esc(c.m)}</span></div>`).join('');
    setView(`<div class="session"><div class="card" style="text-align:center;padding:28px 20px">
        <div class="prompt muted">${esc(QUIZ_MODES[z.mode].title)}</div>
        <div class="result-big">${z.correct} / ${n}</div>
        <p>${rate >= 90 ? 'すばらしい！ほぼ完璧です。' : rate >= 70 ? 'よくできました！' : rate >= 50 ? 'あと少し。間違えた単語を復習しましょう。' : '間違えた単語は今日の復習に入れました。何度も見れば覚えられます！'}</p>
        <div class="row" style="justify-content:center;margin-top:12px"><button type="button" class="btn primary" data-act="again">${icon('undo')}もう一度</button><a class="btn" href="#/study">学習メニュー</a>${Store.counts().due ? '<a class="btn" href="#/study/review">復習へ</a>' : ''}</div>
      </div>
      ${z.wrong.length ? `<div class="card" style="margin-top:12px"><h3>間違えた単語（${z.wrong.length}）</h3><p class="small muted">今日の復習に追加しました。</p>${wrongList}</div>` : ''}
    </div>`, commonActions({ again: () => startQuiz(z.mode) }));
    keyHandler = null;
    state.quiz = null;
    setSession(false);
    updateBadges();
  }

  /* ================================================================== *
   * 単語帳
   * ================================================================== */
  function viewWords() {
    const f = state.words;
    const c = Store.counts();
    const chip = (v, l, n) => `<button type="button" class="chip" data-act="filter" data-v="${v}" aria-pressed="${f.filter === v}">${l}<span class="count">${num(n)}</span></button>`;
    const sortOpts = [['new', '追加が新しい順'], ['old', '追加が古い順'], ['abc', 'ABC順'], ['due', '次の復習が近い順'], ['level', 'レベル順'], ['weak', '間違いが多い順']]
      .map(([v, l]) => `<option value="${v}"${f.sort === v ? ' selected' : ''}>${l}</option>`).join('');
    const html = `<div class="page-head"><div><h1>単語帳</h1><p>${num(c.total)}語を登録しています。</p></div>
        <button type="button" class="btn primary" data-act="addWord">${icon('plus')}単語を追加</button></div>
      <div class="card flat" style="padding:12px 14px">
        <div class="filters"><input class="input grow" type="search" placeholder="検索（英語・日本語）" value="${esc(f.q)}" data-input="wq" aria-label="検索">
          <select class="select" data-change="wsort" aria-label="並び順">${sortOpts}</select></div>
        <div class="chips" style="margin-top:10px">${chip('all', 'すべて', c.total)}${chip('new', '未学習', c.new)}${chip('learning', '学習中', c.learning + c.review)}${chip('mastered', '習得', c.mastered)}${chip('weak', '苦手', c.weak)}</div>
      </div>
      <div id="wlist" class="list" style="margin-top:12px"></div>
      <div class="row spread" style="margin-top:16px">
        <button type="button" class="btn ghost sm" data-act="knownList">${icon('known')}「知ってる」単語（${num(Store.known.size)}語）</button>
        ${PREVIEW ? '' : `<button type="button" class="btn ghost sm" data-act="csv">${icon('download')}CSV で書き出し（Anki 等）</button>`}
      </div>`;
    setView(html, commonActions({
      addWord: () => openAddSheet({}),
      wq: (el) => { f.q = el.value.trim().toLowerCase(); renderWordsList(); },
      wsort: (el) => { f.sort = el.value; renderWordsList(); },
      filter: (el) => { f.filter = el.getAttribute('data-v'); viewWords(); },
      open: (el) => openCardSheet(el.getAttribute('data-w'), renderWordsList),
      knownList: openKnownSheet,
      csv: exportCsv,
    }));
    renderWordsList();
  }

  function renderWordsList() {
    const box = document.getElementById('wlist');
    if (!box) return;
    const f = state.words;
    let cards = Store.allCards();
    if (f.filter === 'new') cards = cards.filter((c) => core.cardStatus(c.srs) === 'new');
    else if (f.filter === 'learning') cards = cards.filter((c) => { const s = core.cardStatus(c.srs); return s === 'learning' || s === 'review'; });
    else if (f.filter === 'mastered') cards = cards.filter((c) => core.cardStatus(c.srs) === 'mastered');
    else if (f.filter === 'weak') cards = cards.filter(Store.isWeak);
    if (f.q) cards = cards.filter((c) => c.w.indexOf(f.q) >= 0 || (c.d || '').toLowerCase().indexOf(f.q) >= 0 || (c.m || '').indexOf(f.q) >= 0 || (c.note || '').indexOf(f.q) >= 0);
    const due = (c) => (!c.srs || c.srs.state === 'new' ? Infinity : c.srs.due);
    const sorters = {
      new: (a, b) => b.added - a.added,
      old: (a, b) => a.added - b.added,
      abc: (a, b) => (a.w < b.w ? -1 : a.w > b.w ? 1 : 0),
      due: (a, b) => due(a) - due(b),
      level: (a, b) => levelOfWord(a.w) - levelOfWord(b.w) || (a.w < b.w ? -1 : 1),
      weak: (a, b) => ((b.ng || 0) + ((b.srs && b.srs.lapses) || 0)) - ((a.ng || 0) + ((a.srs && a.srs.lapses) || 0)),
    };
    cards.sort(sorters[f.sort] || sorters.new);
    if (!Store.allCards().length) {
      box.innerHTML = `<div class="card empty">${icon('book')}<p>単語帳はまだ空です。</p><div class="row" style="justify-content:center"><a class="btn primary" href="#/import">YouTube から集める</a><a class="btn" href="#/import/list">レベル別の単語から選ぶ</a></div></div>`;
      return;
    }
    if (!cards.length) {
      box.innerHTML = '<div class="card empty"><p>該当する単語はありません。</p></div>';
      return;
    }
    const LIMIT = 400;
    box.innerHTML = cards.slice(0, LIMIT).map((c) => `<button type="button" class="list-item" data-act="open" data-w="${esc(c.w)}">
        <div style="min-width:0"><div class="w en">${esc(c.d)}</div><div class="m">${esc(c.m || '（意味が未入力）')}</div></div>
        <div class="meta">${UI.lvBadge(levelOfWord(c.w))}${statusTag(c)}<span class="due">${c.srs && c.srs.state !== 'new' ? esc(UI.relativeDue(c.srs.due)) : ''}</span></div></button>`).join('') +
      (cards.length > LIMIT ? `<p class="small muted">ほか ${num(cards.length - LIMIT)}語（検索で絞り込んでください）</p>` : '');
  }

  function openCardSheet(w, onChange) {
    const c = Store.getCard(w);
    if (!c) return;
    const e = dict.get(w);
    const st = core.cardStatus(c.srs);
    const stLabel = { new: '未学習', learning: '学習中', review: '復習中', mastered: '習得' }[st];
    const exHtml = (c.ex || []).map((x, i) => `<div class="ex-item">${ctxHtmlSheet({ text: x.s, hl: x.hl, t: x.t }, { videoId: x.v })}
        <button type="button" class="btn ghost sm icon-only" data-act="delEx" data-i="${i}" aria-label="この例文を削除">${icon('x')}</button></div>`).join('');
    const body = `<form data-submit="save" id="card-form">
        <label class="field"><span>意味</span><input class="input" name="m" value="${esc(c.m)}"></label>
        <label class="field" style="margin-top:10px"><span>メモ</span><textarea class="textarea" name="note" style="min-height:70px" placeholder="覚え方、関連語、自分で作った例文など">${esc(c.note || '')}</textarea></label>
      </form>
      ${exHtml ? `<div class="section-title">例文</div>${exHtml}` : ''}
      <div class="section-title">学習の状況</div>
      <dl class="kv">
        <dt>状態</dt><dd>${esc(stLabel)}${Store.isWeak(c) ? '（苦手）' : ''}</dd>
        <dt>次の復習</dt><dd>${c.srs && c.srs.state !== 'new' ? esc(UI.relativeDue(c.srs.due)) + '（間隔 ' + esc(c.srs.interval ? Math.round(c.srs.interval) + '日' : '学習中') + '）' : '未学習'}</dd>
        <dt>クイズ</dt><dd>正解 ${num(c.ok || 0)} ・ 不正解 ${num(c.ng || 0)}</dd>
        <dt>追加</dt><dd>${esc(UI.fmtDate(c.added))}（${esc({ youtube: 'YouTube', text: '貼り付けた英文', list: 'レベル別リスト', manual: '手入力', check: '語彙力チェック' }[c.src] || c.src)}）</dd>
        ${e ? `<dt>レベル</dt><dd>${UI.lvBadge(core.levelOfRank(e.r))} <span class="small muted">${e.r ? 'よく使われる順で ' + num(e.r) + '位' : '頻度データなし'}</span></dd>` : ''}
      </dl>
      ${e ? `<div class="section-title">辞書</div><div class="def-block" id="long-def">${esc(e.s)}</div>` : ''}
      <div class="section-title">ほかの辞書で調べる</div>${UI.dictLinks(c.d)}`;
    let changed = false;
    const sh = UI.sheet({
      title: c.d,
      titleHtml: `<span class="en">${esc(c.d)}</span>`,
      headExtra: speakBtn(c.d),
      body,
      foot: `<button type="button" class="btn danger" data-act="del">${icon('trash')}削除</button><button type="button" class="btn ghost" data-act="reset">学習をリセット</button><button type="button" class="btn primary" data-act="saveBtn">保存</button>`,
      onClose: () => { if (changed && onChange) onChange(); },
      actions: {
        speak: (el) => UI.speak(el.getAttribute('data-say')),
        save: () => saveCard(),
        saveBtn: () => saveCard(),
        delEx: (el) => {
          const i = parseInt(el.getAttribute('data-i'), 10);
          c.ex.splice(i, 1);
          Store.saveCards();
          changed = true;
          el.closest('.ex-item').remove();
        },
        del: () => {
          UI.confirmDialog(`「${c.d}」を単語帳から削除しますか？`, '削除する', true).then((ok) => {
            if (!ok) return;
            const card = Store.deleteCard(w);
            changed = true;
            sh.close();
            updateBadges();
            UI.toast(`「${card.d}」を削除しました`, { action: '元に戻す', onAction: () => { Store.restoreCard(card); if (onChange) onChange(); updateBadges(); } });
          });
        },
        reset: () => {
          UI.confirmDialog(`「${c.d}」の学習記録をリセットして、未学習に戻しますか？`, 'リセット').then((ok) => {
            if (!ok) return;
            Store.resetProgress(w);
            changed = true;
            sh.close();
            updateBadges();
            UI.toast('学習記録をリセットしました');
          });
        },
        seek: (el) => window.open(UI.watchUrl((c.ex.find((x) => x.t === parseFloat(el.getAttribute('data-t'))) || {}).v, parseFloat(el.getAttribute('data-t'))), '_blank', 'noopener'),
      },
    });
    function saveCard() {
      const form = sh.body.querySelector('#card-form');
      Store.updateCard(w, { m: form.m.value.trim(), note: form.note.value.trim() });
      changed = true;
      sh.close();
      UI.toast('保存しました');
    }
    if (e) fillLongDef(w, sh.body.querySelector('#long-def'));
  }

  function openAddSheet(pre) {
    pre = pre || {};
    let auto = true;
    let target = null;
    const body = `<form data-submit="add" id="add-form" autocomplete="off">
        <label class="field"><span>英単語</span><input class="input en" name="w" value="${esc(pre.w || '')}" data-input="lookup" autocapitalize="off" autocorrect="off" spellcheck="false" autofocus placeholder="例: procrastinate"></label>
        <div id="lookup-res" class="small" style="margin-top:6px;min-height:1.6em"></div>
        <label class="field" style="margin-top:8px"><span>意味</span><input class="input" name="m" value="${esc(pre.m || '')}" data-input="manual" placeholder="辞書にあれば自動で入ります"></label>
        <label class="field" style="margin-top:10px"><span>メモ（任意）</span><textarea class="textarea" name="note" style="min-height:70px"></textarea></label>
        ${pre.ex && pre.ex[0] ? `<p class="small muted" style="margin-top:8px">例文: <span class="en">${UI.highlight(pre.ex[0].s, pre.ex[0].hl)}</span></p>` : ''}
        <button type="submit" hidden></button>
      </form>`;
    const sh = UI.sheet({
      title: '単語を追加',
      body,
      foot: '<button type="button" class="btn" data-act="close">キャンセル</button><button type="button" class="btn primary" data-act="addBtn">追加</button>',
      actions: {
        lookup: () => lookup(),
        manual: () => { auto = false; },
        add: () => doAdd(),
        addBtn: () => doAdd(),
        open: () => { sh.close(); openCardSheet(target); },
      },
    });
    const form = sh.body.querySelector('#add-form');
    const res = sh.body.querySelector('#lookup-res');
    function lookup() {
      const raw = form.w.value.trim();
      target = null;
      if (!raw) { res.innerHTML = ''; return; }
      const e = dict.lookup(raw);
      const norm = core.normalizeWord(raw);
      if (e) {
        target = e.w;
        const lemmaNote = e.w !== norm ? ` <span class="muted">（原形 <b class="en">${esc(e.d)}</b> で登録します）</span>` : '';
        res.innerHTML = Store.hasCard(e.w)
          ? `${icon('info')} <b class="en">${esc(e.d)}</b> は登録済みです。 <button type="button" class="btn sm" data-act="open">開く</button>`
          : `${UI.lvBadge(core.levelOfRank(e.r))} <span>${esc(e.s)}</span>${lemmaNote}`;
        if (auto) form.m.value = e.s;
      } else {
        target = /^[a-z][a-z' -]*$/.test(norm) ? norm : null;
        res.innerHTML = target ? '<span class="muted">辞書にない単語です。意味を入力してください。</span>' : '<span class="muted">英単語を入力してください。</span>';
        if (auto) form.m.value = '';
      }
    }
    function doAdd() {
      lookup();
      if (!target) return UI.toast('英単語を入力してください');
      if (Store.hasCard(target)) return UI.toast('この単語は登録済みです');
      const e = dict.get(target);
      Store.addCard({ w: target, d: e ? e.d : form.w.value.trim(), m: form.m.value.trim(), note: form.note.value.trim(), ex: (pre.ex || []).filter(Boolean), src: pre.src || 'manual' });
      updateBadges();
      sh.close();
      UI.toast(`「${e ? e.d : target}」を追加しました`);
      if (parseHash().name === 'words') renderWordsList();
      if (state.itemIndex.has(target)) rerenderRow(target);
    }
    if (pre.w) lookup();
  }

  function openKnownSheet() {
    const words = Array.from(Store.known).sort();
    const sh = UI.sheet({
      title: '「知ってる」単語',
      body: `<p class="small muted">ここにある単語は、動画から抽出するときに表示されません（${num(words.length)}語）。</p>
        <div class="chips" style="margin-top:10px">${words.length ? words.slice(0, 600).map((w) => `<button type="button" class="chip" data-act="unmark" data-w="${esc(w)}" title="解除">${esc(w)} ${icon('x')}</button>`).join('') : '<span class="muted">まだありません</span>'}</div>
        ${words.length > 600 ? '<p class="small muted">（先頭 600 語のみ表示）</p>' : ''}`,
      foot: words.length ? `<button type="button" class="btn danger" data-act="clear">${icon('trash')}すべて解除</button><button type="button" class="btn" data-act="close">閉じる</button>` : '<button type="button" class="btn" data-act="close">閉じる</button>',
      actions: {
        unmark: (el) => {
          Store.unmarkKnown(el.getAttribute('data-w'));
          el.remove();
        },
        clear: () => {
          UI.confirmDialog('「知ってる」単語をすべて解除しますか？', 'すべて解除', true).then((ok) => {
            if (!ok) return;
            Store.clearKnown();
            sh.close();
            if (parseHash().name === 'words') viewWords();
          });
        },
      },
      onClose: () => { if (parseHash().name === 'words') viewWords(); },
    });
  }

  function csvCell(s) {
    s = String(s == null ? '' : s);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportCsv() {
    const cards = Store.allCards().sort((a, b) => a.added - b.added);
    if (!cards.length) return UI.toast('単語帳が空です');
    const rows = [['word', 'meaning', 'note', 'example', 'video', 'status']];
    cards.forEach((c) => {
      const ex = exampleOf(c);
      rows.push([c.d, c.m, c.note || '', ex ? ex.s : '', ex && ex.v ? UI.watchUrl(ex.v, ex.t) : '', core.cardStatus(c.srs)]);
    });
    UI.download('tubetan-words-' + core.dayKey(Date.now()) + '.csv', '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }

  /* ================================================================== *
   * 設定
   * ================================================================== */
  function viewSettings() {
    const s = Store.settings;
    const sel = (name, options, value) => `<select class="select" data-change="set" data-name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const voices = UI.voiceList();
    const voiceOpts = [['', '自動（おすすめ）']].concat(voices.map((v) => [v.voiceURI, v.name + '（' + v.lang + '）']));
    const server = state.server && state.server.ok
      ? `<span class="tag mastered">${icon('check')}接続中</span>${state.server.ytDlp ? ' <span class="small muted">yt-dlp ' + esc(state.server.ytDlp) + '</span>' : ' <span class="small muted">yt-dlp なし</span>'}`
      : state.server === null ? '<span class="small muted">確認中…</span>' : '<span class="tag weak">未接続</span>';
    const html = `<div class="page-head"><div><h1>設定</h1></div></div>
      <div class="stack">
      <div class="card"><h2>学習</h2>
        <div class="setting"><div><div class="t">1日に学ぶ新しい単語</div><div class="d">復習カードに出す新しい単語の数</div></div>${sel('newPerDay', [[5, '5語'], [10, '10語'], [15, '15語'], [20, '20語'], [30, '30語'], [50, '50語']], s.newPerDay)}</div>
        <div class="setting"><div><div class="t">カードの向き</div><div class="d">復習カードで最初に見せる面</div></div>${sel('direction', [['en-ja', '英語 → 日本語'], ['ja-en', '日本語 → 英語'], ['mixed', 'ランダム']], s.direction)}</div>
        <div class="setting"><div><div class="t">自動で発音</div><div class="d">カードやクイズで単語を読み上げる</div></div><label class="check"><input type="checkbox" data-change="toggle" data-name="autoSpeak"${s.autoSpeak ? ' checked' : ''}>オン</label></div>
      </div>
      <div class="card"><h2>音声</h2>
        ${UI.canSpeak() ? `<div class="setting"><div><div class="t">声</div><div class="d">ブラウザ・OS に入っている英語の音声</div></div>${sel('voice', voiceOpts, s.voice)}</div>
        <div class="setting"><div><div class="t">速さ</div></div>${sel('rate', [[0.7, 'ゆっくり'], [0.85, 'やや遅め'], [0.9, 'ふつう'], [1, '速め'], [1.15, '速い']], s.rate)}</div>
        <div class="setting"><div><div class="t">テスト</div></div><button type="button" class="btn" data-act="testVoice">${icon('speaker')}再生</button></div>`
        : '<p class="muted">このブラウザは音声の読み上げに対応していません。</p>'}
      </div>
      <div class="card"><h2>単語の抽出</h2>
        <div class="setting"><div><div class="t">表示する難易度</div><div class="d">これより易しい単語は抽出結果に出しません</div></div>${sel('level', core.LEVELS.map((L) => [L.lv, 'Lv' + L.lv + ' 以上（' + L.guide + '）']), s.level)}</div>
        <div class="setting"><div><div class="t">語彙力チェック</div><div class="d">${s.vocabSize ? '推定語彙: 約' + num(s.vocabSize) + '語' : 'まだ受けていません'}</div></div><a class="btn" href="#/check">${icon('target')}チェックする</a></div>
        <div class="setting"><div><div class="t">「知ってる」単語</div><div class="d">${num(Store.known.size)}語</div></div><button type="button" class="btn" data-act="knownList">一覧</button></div>
      </div>
      <div class="card"><h2>表示</h2>
        <div class="setting"><div><div class="t">テーマ</div></div>${sel('theme', [['auto', '端末に合わせる'], ['light', 'ライト'], ['dark', 'ダーク']], s.theme)}</div>
      </div>
      <div class="card"><h2>データ</h2>
        <p class="small muted">学習データはこのブラウザの中だけに保存されています。別の端末へ移すときや、念のためにバックアップを保存してください。</p>
        ${PREVIEW ? '<p class="small muted">プレビュー版ではファイルの保存（バックアップ・CSV）はできません。</p>' : `<div class="setting"><div><div class="t">バックアップ</div><div class="d">単語帳・学習記録・設定を JSON ファイルに保存</div></div><button type="button" class="btn" data-act="backup">${icon('download')}保存</button></div>
        <div class="setting"><div><div class="t">CSV で書き出し</div><div class="d">Anki やスプレッドシート用</div></div><button type="button" class="btn" data-act="csv">${icon('download')}CSV</button></div>`}
        <div class="setting"><div><div class="t">復元</div><div class="d">バックアップファイルから読み込む（今のデータと統合）</div></div><button type="button" class="btn" data-act="restore">${icon('upload')}読み込む</button></div>
        <div class="setting"><div><div class="t">すべて削除</div><div class="d">単語帳と学習記録をすべて消します</div></div><button type="button" class="btn danger" data-act="wipe">${icon('trash')}削除</button></div>
      </div>
      ${PREVIEW ? '' : `<div class="card"><h2>字幕サーバー</h2>
        <div class="setting"><div><div class="t">状態</div><div class="d">YouTube の字幕を自動で取得するためのサーバー（server.js）</div></div><div class="row">${server}<button type="button" class="btn sm ghost" data-act="recheck">${icon('undo')}再確認</button></div></div>
        <details style="margin-top:8px"><summary class="small muted" style="cursor:pointer">詳細設定（別の場所でサーバーを動かしている場合）</summary>
          <form data-submit="saveApi" class="input-row" style="margin-top:8px"><input class="input" name="api" placeholder="例: http://192.168.0.10:3000（空欄＝このページと同じ）" value="${esc(s.apiBase)}" spellcheck="false" autocapitalize="off"><button class="btn" type="submit">保存</button></form>
          <p class="small muted">別のサーバーを使う場合は、そのサーバーを <code>ALLOW_ORIGIN=このページのURL</code> を付けて起動してください。</p>
        </details>
      </div>`}
      <div class="card"><h2>このアプリについて</h2>
        <p class="small">TubeTan は、YouTube の字幕から英単語を集めて覚えるための単語帳アプリです。</p>
        <ul class="small" style="padding-left:1.2em;margin:6px 0">
          <li>英和辞書: <a href="https://github.com/kujirahand/EJDict" target="_blank" rel="noopener noreferrer">EJDict-hand</a>（パブリックドメイン / CC0）＋ 現代語の補足訳</li>
          <li>単語の頻度順位: <a href="https://github.com/rspeer/wordfreq" target="_blank" rel="noopener noreferrer">wordfreq</a> のデータから算出（CC BY-SA 4.0）</li>
          <li>英英辞典: <a href="https://dictionaryapi.dev/" target="_blank" rel="noopener noreferrer">Free Dictionary API</a></li>
          <li>レベルの「目安」は単語の頻度順位から機械的に区切ったもので、試験の公式な基準ではありません。</li>
        </ul>
      </div>
      </div>`;
    setView(html, commonActions({
      set: (el) => {
        const name = el.getAttribute('data-name');
        let v = el.value;
        if (name === 'newPerDay' || name === 'level') v = parseInt(v, 10);
        if (name === 'rate') v = parseFloat(v);
        Store.saveSettings({ [name]: v });
        if (name === 'theme') applyTheme();
        if (name === 'newPerDay') updateBadges();
        if (name === 'voice' || name === 'rate') UI.speak('This is how I sound.');
        UI.toast('設定を保存しました');
      },
      toggle: (el) => {
        Store.saveSettings({ [el.getAttribute('data-name')]: el.checked });
        UI.toast('設定を保存しました');
      },
      testVoice: () => UI.speak('Welcome to TubeTan. Let\'s learn some new words!'),
      knownList: openKnownSheet,
      csv: exportCsv,
      backup: () => {
        UI.download('tubetan-backup-' + core.dayKey(Date.now()) + '.json', JSON.stringify(Store.exportData(), null, 1), 'application/json');
      },
      restore: () => {
        UI.pickFile('.json,application/json').then((f) => {
          if (!f) return;
          try {
            const data = JSON.parse(f.text);
            const r = Store.importData(data, 'merge');
            UI.toast(`復元しました（新しく ${r.cards}語を追加）`);
            updateBadges();
            viewSettings();
          } catch (e) {
            UI.toast('読み込めませんでした: ' + (e.message || e));
          }
        });
      },
      wipe: () => {
        UI.confirmDialog('単語帳・学習記録・設定をすべて削除します。元に戻せません。\n先にバックアップを保存することをおすすめします。', 'すべて削除', true).then((ok) => {
          if (!ok) return;
          Store.clearAll();
          applyTheme();
          state.current = null;
          updateBadges();
          UI.toast('すべてのデータを削除しました');
          go('#/');
        });
      },
      recheck: () => checkServer().then(() => viewSettings()),
      saveApi: (form) => {
        Store.saveSettings({ apiBase: form.api.value.trim() });
        UI.toast('保存しました');
        checkServer().then(() => viewSettings());
      },
    }));
    if (UI.canSpeak() && !voices.length) {
      // 音声一覧は後から届くことがある
      setTimeout(() => { if (parseHash().name === 'settings' && UI.voiceList().length) viewSettings(); }, 800);
    }
  }

  /* ================================================================== *
   * 語彙力チェック
   * ================================================================== */
  function viewCheck() {
    const ch = state.check;
    if (!ch || ch.phase === 'intro') {
      setView(`<div class="session"><div class="card" style="padding:24px">
          <h1>語彙力チェック</h1>
          <p>易しい単語から難しい単語まで、約60語が表示されます。<b>意味がだいたい分かる単語</b>をタップして選んでください。</p>
          <ul class="small muted" style="padding-left:1.2em"><li>約2分で終わります</li><li>あやふやな単語は選ばないでください</li><li>実在しない単語も少し混ざっています（正直に答えるほど正確になります）</li></ul>
          <div class="row" style="margin-top:14px"><button type="button" class="btn primary lg" data-act="start">${icon('target')}はじめる</button><a class="btn lg" href="#/settings">戻る</a></div>
          ${Store.settings.vocabSize ? `<p class="small muted" style="margin-top:12px">前回の結果: 約${num(Store.settings.vocabSize)}語</p>` : ''}
        </div></div>`, {
        start: () => {
          state.check = { phase: 'test', items: core.sampleLevelTest(dict, 6), picked: new Set() };
          viewCheck();
        },
      });
      return;
    }
    if (ch.phase === 'test') {
      const html = `<div class="session" style="max-width:820px"><div class="page-head"><div><h1>知っている単語をタップ</h1><p>意味がだいたい分かれば OK です。</p></div></div>
        <div class="card"><div class="check-grid">${ch.items.map((it, i) => `<button type="button" class="check-word en" data-act="pick" data-i="${i}" aria-pressed="${ch.picked.has(i)}">${icon('check')}${esc(it.word)}</button>`).join('')}</div></div>
        <div class="row" style="margin-top:14px;justify-content:flex-end"><span class="muted small" id="pick-count">${ch.picked.size}語を選択</span><button type="button" class="btn primary lg" data-act="done">結果を見る</button></div></div>`;
      setView(html, {
        pick: (el) => {
          const i = parseInt(el.getAttribute('data-i'), 10);
          if (ch.picked.has(i)) ch.picked.delete(i);
          else ch.picked.add(i);
          el.setAttribute('aria-pressed', String(ch.picked.has(i)));
          const pc = document.getElementById('pick-count');
          if (pc) pc.textContent = ch.picked.size + '語を選択';
        },
        done: () => {
          const answers = ch.items.map((it, i) => Object.assign({}, it, { known: ch.picked.has(i) }));
          ch.result = core.estimateVocabulary(answers);
          ch.answers = answers;
          ch.phase = 'result';
          Store.saveSettings({ vocabSize: ch.result.size });
          viewCheck();
        },
      });
      return;
    }
    const r = ch.result;
    const fakeHit = ch.answers.filter((a) => a.fake && a.known).map((a) => a.word);
    const knownWords = ch.answers.filter((a) => !a.fake && a.known).map((a) => a.word);
    const meters = r.perLevel.map((p) => `<div class="meter-row"><span>${UI.lvBadge(p.lv)}</span><div class="meter" role="img" aria-label="Lv${p.lv}: ${Math.round(p.ratio * 100)}%"><i style="width:${Math.round(p.ratio * 100)}%"></i></div><span class="num">${Math.round(p.ratio * 100)}%</span></div>`).join('');
    const rec = r.recommendedLevel;
    setView(`<div class="session"><div class="stack">
        <div class="card" style="text-align:center;padding:24px"><div class="muted" style="font-weight:700">あなたの推定語彙数</div>
          <div class="hero"><div style="grid-column:1/-1"><div class="figure">約${num(r.size)}<small>語</small></div></div></div>
          <p class="small muted" style="margin-top:8px">よく使われる英単語のうち、知っていると推定される数です（目安）。</p></div>
        ${fakeHit.length ? `<div class="notice warn">${icon('alert')}<div>実在しない単語（<span class="en">${esc(fakeHit.join(', '))}</span>）も選ばれていたので、その分を割り引いて計算しました。</div></div>` : ''}
        <div class="card"><h2>レベル別の正答率</h2><p class="small muted">各レベルで「知っている」と答えた割合</p><div class="meters" style="margin-top:10px">${meters}</div></div>
        <div class="card"><h2>おすすめの設定</h2><p>動画から単語を抽出するときに <b>Lv${rec} 以上</b>を表示すると、あなたにちょうどいい単語が並びます。</p>
          <div class="row" style="margin-top:10px"><button type="button" class="btn primary" data-act="apply">${icon('check')}Lv${rec} 以上に設定する</button>
          ${knownWords.length ? `<button type="button" class="btn" data-act="markKnown">知っていた ${knownWords.length}語を「知ってる」に登録</button>` : ''}</div></div>
        <div class="row" style="justify-content:center"><button type="button" class="btn" data-act="again">${icon('undo')}もう一度</button><a class="btn" href="#/import">単語を取り込む</a></div>
      </div></div>`, {
      apply: () => {
        Store.saveSettings({ level: rec });
        UI.toast(`抽出レベルを Lv${rec} 以上にしました`);
      },
      markKnown: (el) => {
        Store.markKnownMany(knownWords.filter((w) => !Store.hasCard(w)));
        el.disabled = true;
        UI.toast(`${knownWords.length}語を「知ってる」に登録しました`);
      },
      again: () => {
        state.check = { phase: 'intro' };
        viewCheck();
      },
    });
  }

  /* ================================================================== */
  boot();
})();
