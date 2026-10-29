// CADET — ui/menu.js : the pause menu (Esc): resume, the visit / walk switch, settings, the keys, about.
// A dimmed overlay with a glass panel in the page's own style; works with the keyboard (Tab, Enter, Esc) and on a
// phone-width screen. Settings apply live through the settings store.
const CSS = `
#menu { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(4, 8, 14, 0.55); backdrop-filter: blur(3px); }
#menu[hidden] { display: none; }
#menu .m-panel { width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto; padding: 22px; border-radius: 18px;
  background: rgba(10, 18, 28, 0.86); border: 1px solid var(--glass-line); box-shadow: 0 24px 70px rgba(0,0,0,.5); color: var(--ink); font-family: var(--font); }
#menu h2 { margin: 0 0 4px; font-size: 22px; letter-spacing: .06em; }
#menu .m-sub { margin: 0 0 16px; color: var(--ink-dim); font-size: 13px; }
#menu .m-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
#menu .m-tabs button { font: inherit; font-size: 13px; padding: 7px 12px; border-radius: 99px; border: 1px solid var(--glass-line); background: rgba(255,255,255,.06); color: var(--ink); cursor: pointer; }
#menu .m-tabs button[aria-selected="true"] { background: var(--accent); color: var(--accent-ink); border-color: transparent; font-weight: 700; }
#menu .m-big { display: grid; gap: 10px; }
#menu .m-big button { font: inherit; font-size: 15px; padding: 13px; border-radius: 12px; border: 1px solid var(--glass-line); background: rgba(255,255,255,.07); color: var(--ink); cursor: pointer; text-align: left; }
#menu .m-big button.primary { background: var(--accent); color: var(--accent-ink); border: 0; font-weight: 800; text-align: center; font-size: 17px; }
#menu .m-big button:hover, #menu .m-tabs button:hover { filter: brightness(1.15); }
#menu button:focus-visible, #menu input:focus-visible { outline: 2px solid #ffd479; outline-offset: 2px; }
#menu .m-row { display: grid; grid-template-columns: 1fr auto; gap: 6px 14px; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.07); font-size: 14px; }
#menu .m-row small { grid-column: 1 / -1; color: var(--ink-dim); font-size: 12px; }
#menu .m-row input[type=range] { grid-column: 1 / -1; width: 100%; accent-color: var(--accent); }
#menu .m-val { color: var(--accent); font-variant-numeric: tabular-nums; }
#menu .m-switch { width: 46px; height: 26px; border-radius: 99px; border: 1px solid var(--glass-line); background: rgba(255,255,255,.12); position: relative; cursor: pointer; }
#menu .m-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #dfe8f0; transition: left .15s; }
#menu .m-switch[aria-checked="true"] { background: var(--accent); }
#menu .m-switch[aria-checked="true"]::after { left: 23px; background: #fff; }
#menu .m-chips { display: flex; gap: 6px; flex-wrap: wrap; }
#menu .m-chips button { font: inherit; font-size: 13px; padding: 6px 12px; border-radius: 99px; border: 1px solid var(--glass-line); background: rgba(255,255,255,.07); color: var(--ink); cursor: pointer; }
#menu .m-chips button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); font-weight: 700; border-color: transparent; }
#menu table { width: 100%; border-collapse: collapse; font-size: 14px; }
#menu td { padding: 7px 4px; border-bottom: 1px solid rgba(255,255,255,.07); vertical-align: top; }
#menu td:first-child { white-space: nowrap; color: var(--ink-dim); width: 40%; }
#menu h3 { margin: 16px 0 6px; font-size: 14px; color: var(--ink-dim); font-weight: 600; letter-spacing: .04em; }
#menu .m-note { margin-top: 12px; font-size: 12px; color: var(--ink-dim); line-height: 1.7; }
#menu p { line-height: 1.75; font-size: 14px; }
#menu .m-field { grid-column: 1 / -1; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
#menu .m-field input[type=text], #menu .m-field input[type=password] { flex: 1 1 200px; min-width: 0; font: inherit; font-size: 14px; padding: 8px 10px; border-radius: 10px;
  border: 1px solid var(--glass-line); background: rgba(255,255,255,.06); color: var(--ink); }
#menu .m-field button { font: inherit; font-size: 13px; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--glass-line); background: rgba(255,255,255,.08); color: var(--ink); cursor: pointer; }
#menu .m-field label { font-size: 13px; color: var(--ink-dim); display: flex; gap: 6px; align-items: center; }
#menu .m-state { grid-column: 1 / -1; font-size: 13px; color: var(--accent); }
#menu .m-state.bad { color: #ff9a8a; }
`;

// ai: { keys (ai/keys.js), keyName, defaultModel } — the M8 tab's API key field
// modeLabel() → the mode button's own words for now (the introductory flight's), or null
export function createMenu({ root = document.body, settings, presets = [], onResume = () => {}, onQuality = () => {}, onMode = () => {}, getMode = () => 'walk', getPreset = () => null, onResetProgress = null, onLogbook = null, version = '', ai = null, onBench = null, modeLabel = () => null }) {
  if (!document.getElementById('menu-css')) { const st = document.createElement('style'); st.id = 'menu-css'; st.textContent = CSS; document.head.appendChild(st); }
  const el = document.createElement('div'); el.id = 'menu'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '一時停止メニュー');
  root.appendChild(el);
  let tab = 'main', open = false;
  const TABS = [['main', '再開'], ['settings', '設定'], ['net', 'AI・マイク・英語'], ['keys', '操作'], ['about', 'このゲームについて']];
  let keyMsg = '', keyBad = false;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function body() {
    if (tab === 'main') {
      const walk = getMode() === 'walk';
      return `<div class="m-big">
        <button class="primary" data-act="resume">再開する</button>
        <button data-act="mode">${walk ? '見学モードに切り替える（自由なカメラ・視点 1〜9・0）' : getMode() === 'fly' ? modeLabel() || '機体を降りる（機体は駐機場に戻ります）' : getMode() === 'epilogue' ? '終章を終える（アカデミーに戻ります）' : '歩くモードに戻る'}</button>
        ${onLogbook ? '<button data-act="logbook">航空日誌を見る</button>' : ''}
        <button data-tab="settings">設定</button><button data-tab="keys">操作</button><button data-tab="about">このゲームについて</button></div>`;
    }
    if (tab === 'settings') {
      const v = settings.all();
      const range = (k, label, min, max, step, fmt, note = '') => `<label class="m-row"><span>${label}</span><span class="m-val" data-val="${k}">${fmt(v[k])}</span>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${v[k]}" data-set="${k}" aria-label="${label}">${note ? `<small>${note}</small>` : ''}</label>`;
      const sw = (k, label, note = '') => `<div class="m-row"><span>${label}</span><button class="m-switch" role="switch" aria-checked="${!!v[k]}" aria-label="${label}" data-toggle="${k}"></button>${note ? `<small>${note}</small>` : ''}</div>`;
      return range('sensitivity', 'マウスの感度', 0.2, 3, 0.05, x => x.toFixed(2))
        + sw('invertY', '上下反転', 'マウスを前に動かすと下を向く')
        + range('fov', '視野角', 60, 100, 1, x => `${x}°`, '広いほど周りが見えます。酔いやすい人は 70〜80° がおすすめ')
        + sw('headBob', '頭の揺れ', '歩くときの小さな上下の揺れ。酔いやすい人は OFF に')
        + sw('guide', '次にすることの案内', '画面の上に、次にすることとその方向を出す')
        + sw('firstHelp', 'はじめての操作の案内', '左下に、見回す・歩く・E・Tab・Esc の使い方を 1 つずつ出す（全部済むと消えます。ON でもう一度最初から）')
        + range('volume', '音量（全体）', 0, 1, 0.05, x => `${Math.round(x * 100)}%`)
        + range('volEngine', 'エンジンと風切り音', 0, 1, 0.05, x => `${Math.round(x * 100)}%`)
        + range('volAmb', '周りの音と足音', 0, 1, 0.05, x => `${Math.round(x * 100)}%`)
        + range('volRadio', '無線（雑音と管制官の声）', 0, 1, 0.05, x => `${Math.round(x * 100)}%`)
        + `<div class="m-row"><span>画質</span><span></span><div class="m-chips" style="grid-column:1/-1">${presets.map(p => `<button data-quality="${p.id}" aria-pressed="${(v.quality || getPreset()) === p.id}">${esc(p.label)}${!v.quality && getPreset() === p.id ? '（自動）' : ''}</button>`).join('')}</div><small>最初は GPU に合わせて自動で選びます。カクつくときは下げてください</small></div>`
        + range('textSpeed', '字幕の速さ', 0.5, 3, 0.25, x => `×${x.toFixed(2)}`, '会話の文字が出る速さ')
        + range('subSize', '字幕の大きさ', 0.85, 1.6, 0.05, x => `×${x.toFixed(2)}`, '会話・教官の言葉・案内・お知らせの文字の大きさ')
        + sw('colorAssist', '色の組み合わせ（色覚に配慮）', '良い・悪いを示す緑と赤を、青と橙にします。どちらの色でも ✓ △ ✕ の印が付きます')
        + sw('voice', '教官の声（読み上げ）', 'ブラウザの音声合成で教官の台詞を読み上げます（日本語の声がある場合）')
        + sw('atcVoice', '管制官の声（英語の読み上げ）', 'ブラウザの音声合成で管制官の英語を読み上げます（英語の声がある場合）')
        + sw('radioJa', '無線の日本語訳', '無線の画面で、英語の下に日本語の意味を出します')
        + sw('autoRud', '自動ラダー', 'ON：ボールを自動で中央に保ちます。飛んでいる間は U で切り替え')
        + sw('showPerf', '性能の表示', 'fps・描画回数・三角形の数を右上に表示');
    }
    if (tab === 'net') {
      const v = settings.all();
      const sw = (k, label, note = '') => `<div class="m-row"><span>${label}</span><button class="m-switch" role="switch" aria-checked="${!!v[k]}" aria-label="${label}" data-toggle="${k}"></button>${note ? `<small>${note}</small>` : ''}</div>`;
      const has = ai && ai.keys.has(), mem = ai && ai.keys.remembered;
      return `<p class="m-note" style="margin-top:0">ここの機能は、どれも最初は OFF です。OFF のあいだは、外への通信を一切しません。ネットにつながなくても、最初から最後まで遊べます。</p>
        <h3>AI 教官（Claude API）</h3>`
        + sw('aiTutor', 'AI 教官に自由に質問する', 'ブリーフィング室と飛行のあとの講評で、早瀬 教官に日本語で自由に質問できます（答えは字幕で）。ON にして API キーを入れたときだけ、質問のたびに Anthropic の API（api.anthropic.com）へ送ります。キーがない・つながらない・エラーのときは、いつもの会話（ブリーフィング室では教科書の質問、講評では航空日誌の記入）に戻ります。')
        + `<div class="m-row"><span>モデル</span><span></span><div class="m-field"><input type="text" data-text="aiModel" value="${esc(v.aiModel)}" aria-label="モデル名" spellcheck="false" autocomplete="off"></div>
          <small>既定は ${esc(ai ? ai.defaultModel : 'claude-opus-5-5')}。返事の速さと料金を優先するなら claude-sonnet-5-5 や claude-haiku-5-5 も使えます。</small></div>`
        + `<div class="m-row"><span>API キー</span><span></span>
          <div class="m-field"><input type="password" id="m-key" aria-label="API キー" autocomplete="off" spellcheck="false" placeholder="sk-ant-…"><button data-act="key-save">保存</button></div>
          <div class="m-field"><label><input type="checkbox" id="m-key-remember"${mem ? ' checked' : ''}> このブラウザに覚えておく（OFF なら、このページを閉じると消えます）</label></div>
          <div class="m-state${keyBad ? ' bad' : ''}" id="m-key-state">${esc(keyMsg || (has ? `設定済み：${ai.keys.masked()}（${mem ? 'このブラウザに保存' : 'このページを閉じるまで'}）` : '未設定'))}</div>
          <div class="m-field"><button data-act="key-clear"${has || mem ? '' : ' disabled'}>キーを消す</button></div>
          <small>キーは自分で <b>Anthropic Console</b> で作ったものを使います。料金はキーの持ち主のアカウントにかかります。<br>
          <b>保存する場所</b>：「覚えておく」を選んだときだけ、このブラウザの localStorage の「${esc(ai ? ai.keyName : 'cadet.secret.anthropic')}」に保存します（このパソコンのこのブラウザの中だけ。ほかの記録・設定・書き出しには入りません）。ほかの人も使うサイト（raw.githack など：同じサイトのほかのページからも読めます）や、ほかの HTML ファイルも開くブラウザでは、「覚えておく」を OFF のまま使うのが安全です。<br>
          <b>消し方</b>：上の「キーを消す」。または、ブラウザの設定でこのページ（ファイル）のサイトデータを消去します。<br>
          <b>送るもの</b>：質問・直前のやり取り（3 往復まで）・今日の場所と訓練の段階と日付と課目と天気（METAR）・その日の結果（講評のとき）・教科書の目次と要約と近い節・教官の話し方の決まり。OFF にすると、開いている質問の欄も閉じます。キーは通信の見出しにだけ入れ、ブラウザから直接 API に送られます。自分の PC で、自分だけが使ってください。</small></div>
        <h3>マイク（交信と質問）</h3>`
        + sw('micRadio', 'マイクで復唱・質問する', '管制への答えを声で言えます（操縦席で M を押してから話す）。コールサイン・滑走路・高度・周波数・スコーク・指示の言葉を照らし合わせ、足りない言葉を字幕に出します。マイクや音声認識が使えないときは、いつもの 1〜3 キーのまま。AI 教官への質問も、質問の欄の「声で入れる」（欄が出ているときは M でも）で声で入れられます。声で入れた文字は、そのままでは送られません。欄の中で確かめ、直してから「聞く」で送ります。質問の音声認識は、ゲームの言葉に合わせます（日本語。英語のモードでは英語）。ブラウザの音声認識は、声を提供元のサーバーで文字にすることがあります（ON のときだけ。マイクの許可はブラウザが聞きます）。')
        + `<h3>教官が英語で話す</h3>`
        + sw('crewEnglish', '教官・主任教官・審査官の台詞を英語にする', '訓練所の 3 人の教官が英語で話します。教材（課目の説明・教科書）を読み上げる行は、日本語のままです。')
        + sw('crewEnglishJa', '英語の字幕に日本語訳を付ける', '英語の台詞の下に、もとの日本語を小さく出します。')
        + (onBench ? `<h3>性能の計測</h3><div class="m-big"><button data-act="bench">性能を計測して結果を書き出す</button></div><p class="m-note">10 か所の視点で描画の時間を測り、結果をコピーできる文字で出します（約 30 秒）。README の「実機での計測」に貼ってください。</p>` : '');
    }
    if (tab === 'keys') {
      return `<table>
        <tr><td>W A S D</td><td>移動</td></tr><tr><td>マウス</td><td>見回す（画面をクリックすると操作が始まります）</td></tr>
        <tr><td>Shift（押したまま）</td><td>走る</td></tr><tr><td>E / 左クリック</td><td>調べる・話しかける・扉を開け閉めする・カードを閉じる</td></tr>
        <tr><td>会話中</td><td>クリック・Space・Enter・E で次へ。マウスで見回し、W A S D で歩ける（話し始めた場所から 3 m まで）。1〜9 か ↑↓ と Enter で選ぶ（マウスが自由なときは、画面のドラッグで見回す）。Esc で教科書を閉じる。話を切り上げるときは「また後で来ます」（説明を聞き終えたあとは「準備に向かいます」、授業は節の終わりの「ここで休憩する」）</td></tr>
        <tr><td>Esc</td><td>一時停止（このメニュー）</td></tr><tr><td>F</td><td>性能の表示</td></tr>
        <tr><td>見学モード</td><td>WASD・Space（上）・C（下）・G（地面に立つ）・1〜9・0（視点）・[ ]（時刻）</td></tr></table>
        <h3>操縦席で（FLIGHT LAB と同じキー）</h3>
        <table>
        <tr><td>W / S</td><td>機首を下げる / 上げる（離すとその姿勢を保つ）</td></tr><tr><td>A / D</td><td>左右に傾ける（離すとその傾きを保つ）</td></tr>
        <tr><td>Q / E</td><td>ラダー（地上では前輪の向き）</td></tr><tr><td>R / F</td><td>スロットル（Shift+R で全開・Shift+F でアイドル）</td></tr>
        <tr><td>T</td><td>いまの速度でトリム（Shift+T で戻す）</td></tr><tr><td>V / Shift+V</td><td>フラップを下げる / 上げる</td></tr>
        <tr><td>B / Space（押したまま）</td><td>ブレーキ</td></tr><tr><td>Shift+B</td><td>パーキングブレーキ（かける・外す）</td></tr>
        <tr><td>G</td><td>脚の上げ下げ（Seminole：緑のランプ 3 つで DOWN、赤は作動中）</td></tr><tr><td>Z / X</td><td>ラダートリム 左 / 右</td></tr><tr><td>U</td><td>自動ラダー</td></tr><tr><td>L</td><td>翼を水平に戻す（自由飛行だけ）</td></tr>
        <tr><td>Enter / 1〜3</td><td>チェックリストを進める / 無線の復唱を選ぶ</td></tr>
        <tr><td>マウス</td><td>見回す。右ボタンを押したままで近くを見る</td></tr><tr><td>左クリック / ホイール</td><td>照準の先のスイッチ・レバー・つまみを操作する</td></tr>
        <tr><td>C</td><td>操縦席 ⇄ 外からの視点</td></tr><tr><td>Tab</td><td>画面の計器盤（PFD・MFD）</td></tr><tr><td>H</td><td>操作の説明</td></tr>
        <tr><td>Enter</td><td>チェックリストの項目を確かめた（◇ の項目）</td></tr><tr><td>Y</td><td>チェックリストや地上走行を教官に任せる</td></tr>
        <tr><td>1〜3</td><td>無線で答える（管制との交信）</td></tr><tr><td>M</td><td>無線の答えを声で言う（「マイクで交信」が ON のとき）</td></tr></table>
        <p class="m-note">ゲームパッドも使えます（FLIGHT LAB と同じ配置）。</p>`;
    }
    return `<p><b>CADET</b>（パイロット訓練生シミュレーター）${version ? ` <span class="m-val">${esc(version)}</span>` : ''}</p>
      <p>公開情報を基にした非公式のゲームです。航空会社（翔洋航空）・訓練所・人物はすべて架空です。実機訓練の代わりにはならず、航法には使えません（NOT FOR NAVIGATION）。飛行モデル・課目・教科書は FLIGHT LAB（同じリポジトリの自主学習教材）を使っています。</p>
      <p class="m-note">使っているもの：three.js（MIT License）、Anthropic TypeScript SDK（MIT License。AI 教官を ON にしたときだけ使う）、ambientCG のテクスチャ（CC0）。機体（737 型を含む）と人物の模型は Blender で自作し、家具・木・標識・終章の空港などはプログラムで作っています。音（エンジン・風・足音・無線など）は、音のファイルを使わずにブラウザの中で作っています。終章の羽田空港の形は架空で、実際の空港を写していません。くわしくは assets/CREDITS.md。</p>
      <p class="m-note">外への通信：AI 教官（Anthropic の API）とマイクで交信（ブラウザの音声認識）は、設定で ON にしたときだけ使います。初めはどちらも OFF で、OFF のあいだはどこにも通信しません。</p>`
      + (onResetProgress ? `<div class="m-big"><button data-act="reset">訓練の記録を消す（教官との会話を最初から）</button></div>
      <p class="m-note">記録はこのブラウザの中だけに保存されています。設定は消えません。</p>` : '');
  }
  function render() {
    el.innerHTML = `<div class="m-panel"><h2>一時停止</h2><p class="m-sub">Esc で閉じる</p>
      <div class="m-tabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div class="m-body">${body()}</div></div>`;
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) { if (e.target === el) close(true); return; }
    if (b.dataset.tab) { tab = b.dataset.tab; render(); el.querySelector(`[data-tab="${tab}"][role=tab]`)?.focus(); return; }
    if (b.dataset.act === 'resume') return close(true);
    if (b.dataset.act === 'mode') { onMode(getMode() === 'walk' ? 'spectator' : 'walk'); return close(true); }
    if (b.dataset.act === 'logbook') { close(false); onLogbook(); return; }
    // erasing the record asks twice: the first press only arms the button
    if (b.dataset.act === 'reset') {
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'もう一度押すと記録を消します'; return; }
      onResetProgress(); b.removeAttribute('data-armed'); b.textContent = '記録を消しました'; b.disabled = true; return;
    }
    if (b.dataset.act === 'key-save' && ai) {
      const inp = el.querySelector('#m-key'), rem = el.querySelector('#m-key-remember');
      const ok = ai.keys.set(inp ? inp.value : '', { remember: !!(rem && rem.checked) });
      if (inp) inp.value = '';
      keyBad = !ok; keyMsg = ok ? '' : 'キーの形ではないようです（空白や改行がないか確かめてください）';
      render(); return;
    }
    if (b.dataset.act === 'key-clear' && ai) { ai.keys.clear(); keyMsg = 'キーを消しました（このブラウザからも）'; keyBad = false; render(); return; }
    if (b.dataset.act === 'bench' && onBench) { close(false); onBench(); return; }
    if (b.dataset.toggle) { const k = b.dataset.toggle; settings.set(k, !settings.get(k)); b.setAttribute('aria-checked', String(!!settings.get(k))); return; }
    if (b.dataset.quality) { settings.set('quality', b.dataset.quality); onQuality(b.dataset.quality); el.querySelectorAll('[data-quality]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.quality === b.dataset.quality))); }
  });
  // (M8) the model's name: kept when it looks like one, else the field goes back to the setting
  el.addEventListener('change', (e) => {
    const k = e.target.dataset && e.target.dataset.text; if (!k) return;
    if (!settings.set(k, e.target.value)) e.target.value = settings.get(k);
  });
  // (the remember box alone: the key already given is kept, or forgotten, in this browser)
  el.addEventListener('change', (e) => {
    if (e.target.id !== 'm-key-remember' || !ai || !ai.keys.has()) return;
    ai.keys.set(ai.keys.get(), { remember: e.target.checked }); keyMsg = ''; render();
  });
  el.addEventListener('input', (e) => {
    const k = e.target.dataset && e.target.dataset.set; if (!k) return;
    settings.set(k, parseFloat(e.target.value));
    const v = settings.get(k), out = el.querySelector(`[data-val="${k}"]`);
    if (out) out.textContent = k === 'sensitivity' ? v.toFixed(2) : k === 'fov' ? `${v}°` : k === 'textSpeed' || k === 'subSize' ? `×${v.toFixed(2)}` : `${Math.round(v * 100)}%`;
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const t = e.target.closest('[role=tab]'); if (!t) return;
      const i = TABS.findIndex(([k]) => k === tab), j = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
      tab = TABS[j][0]; render(); el.querySelector(`[data-tab="${tab}"][role=tab]`)?.focus();
    }
  });
  function show(t = 'main') { tab = t; open = true; keyMsg = ''; keyBad = false; render(); el.hidden = false; setTimeout(() => el.querySelector('.m-big .primary, [role=tab][aria-selected=true]')?.focus(), 0); }
  function close(resume = false) { if (!open) return; open = false; el.hidden = true; if (resume) onResume(); }
  return { open: show, close, toggle: () => (open ? close(true) : show()), get isOpen() { return open; }, destroy() { el.remove(); } };
}
