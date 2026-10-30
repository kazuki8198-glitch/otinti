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
// the gamepad axis map's rows (the padMap setting): the function, its standard axis (null = unmapped)
const AXIS_ROWS = [['pitch', 'ピッチ（昇降舵）', 1], ['roll', 'ロール（補助翼）', 0], ['yaw', 'ヨー（ラダー）', 2], ['trim', 'トリム', 3], ['thr', 'スロットル（共通）', null], ['thrL', 'スロットル 左', null], ['thrR', 'スロットル 右', null], ['brakeL', '左トーブレーキ', null], ['brakeR', '右トーブレーキ', null]];
const AXKEY = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space' };
// the held flight keys' rows (the heldBinds setting) and the discrete actions' rows (the keyBinds setting)
const HELD_ROWS = [['up', 'ピッチ下げ（機首下げ）', 'KeyW'], ['down', 'ピッチ上げ（機首上げ）', 'KeyS'], ['left', '左バンク', 'KeyA'], ['right', '右バンク', 'KeyD'], ['rudL', '左ラダー', 'KeyQ'], ['rudR', '右ラダー', 'KeyE'], ['thrUp', 'スロットル上げる', 'KeyR'], ['thrDn', 'スロットル下げる', 'KeyF'], ['brake', 'ブレーキ', 'KeyB']];
const ACT_ROWS = [['flaps', 'フラップ 下げる', 'KeyV'], ['flapsUp', 'フラップ 上げる', 'Shift+KeyV'], ['gear', '脚（ギア）', 'KeyG'], ['level', '水平に戻す', 'KeyL'], ['autoRud', '自動ラダー 切替', 'KeyU'], ['trim', 'トリム（速度に合わせる）', 'KeyT'], ['feather0', '左エンジン フェザー', 'BracketLeft'], ['feather1', '右エンジン フェザー', 'BracketRight']];
const codeName = (c) => AXKEY[c] || String(c || '').replace(/^Key/, '').replace(/^Digit/, '');

export function createMenu({ root = document.body, settings, presets = [], onResume = () => {}, onQuality = () => {}, onMode = () => {}, getMode = () => 'walk', getPreset = () => null, onResetProgress = null, onLogbook = null, version = '', ai = null, onBench = null, modeLabel = () => null, onFreeSetup = null }) {
  if (!document.getElementById('menu-css')) { const st = document.createElement('style'); st.id = 'menu-css'; st.textContent = CSS; document.head.appendChild(st); }
  const el = document.createElement('div'); el.id = 'menu'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '一時停止メニュー');
  root.appendChild(el);
  let tab = 'main', open = false;
  const TABS = [['main', '再開'], ['settings', '設定'], ['net', 'AI・マイク・英語'], ['keys', '操作'], ...(onFreeSetup ? [['free', '自由飛行']] : []), ['about', 'このゲームについて']];
  // the free-flight setup's working values (kept while the menu is open; the start hands them over whole)
  const freeCfg = { start: 'ramp', aircraft: 'pa28', hour: 10, wind: 'light', windRel: 40, windKt: 12, loading: 'std', fail: 'none', failWhen: 'now', failMin: 10, failAlt: 2000 };
  let keyMsg = '', keyBad = false;
  let bindMsg = '';                       // the rebind row's note (a duplicate warning included)
  // capture one key for a rebind: the next keydown while the menu is open becomes the binding (Esc cancels —
  // it still closes the menu afterwards, as Esc always does). A key already used by another flight key is
  // allowed but warned about, so a clash is seen rather than hidden
  let capture = null;                     // { kind: 'held'|'act', name }
  function startCapture(btn) {
    const [kind, name] = btn.dataset.rebind.split(':');
    capture = { kind, name };
    bindMsg = '割り当てたいキーを押してください（Esc でやめます）'; render();
    const btn2 = el.querySelector(`[data-rebind="${kind}:${name}"]`); if (btn2) btn2.focus();
  }
  function applyCapture(code) {
    if (!capture || !code || code === 'Escape') { capture = null; return; }
    const { kind, name } = capture; capture = null;
    const key = kind === 'held' ? 'heldBinds' : 'keyBinds';
    const cur = { ...(settings.get(key) || {}) };
    cur[name] = code;
    settings.set(key, cur);
    const usedBy = (kind === 'held' ? HELD_ROWS : ACT_ROWS).filter(([n, , d]) => n !== name && ((settings.get(key) || {})[n] || d.replace(/^Shift\+/, '')) === code).map(([, l]) => l);
    bindMsg = usedBy.length ? `注意：${codeName(code)} は「${usedBy.join('、')}」と重なっています` : `${codeName(code)} に割り当てました`;
    render();
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // one advanced quality switch (自動 / ON / OFF chips; 自動 = follow the preset)
  function advQ(k, label) {
    const v = settings.get(k);
    const chip = (val, text) => `<button data-qadv="${k}:${val}" aria-pressed="${String(v) === val}">${text}</button>`;
    return `<div class="m-row"><span>${label}</span><span></span><div class="m-chips" style="grid-column:1/-1">${chip('auto', '自動')}${chip('on', 'ON')}${chip('off', 'OFF')}</div></div>`;
  }
  // the gamepad axis map's editor: per function, an axis picker, an invert switch and a pad picker (−1 = any).
  // Unmapped functions (the toe brakes, a quadrant's levers) start as なし — the standard layout is FLIGHT LAB's
  function axisMapHtml(v) {
    const map = v.padMap || {};
    const rows = AXIS_ROWS.map(([fn, label, std]) => {
      const e = map[fn] !== undefined ? map[fn] : (std == null ? null : { axis: std, inv: false, pad: -1 });
      const opts = [`<option value="-1" ${!e ? 'selected' : ''}>なし</option>`]
        .concat(Array.from({ length: 12 }, (_, i) => `<option value="${i}" ${e && e.axis === i ? 'selected' : ''}>軸 ${i}</option>`)).join('');
      const padOpts = [`<option value="-1" ${!e || (e.pad ?? -1) === -1 ? 'selected' : ''}>どのパッドでも</option>`]
        .concat([0, 1, 2, 3].map(i => `<option value="${i}" ${e && e.pad === i ? 'selected' : ''}>パッド ${i + 1}</option>`)).join('');
      return `<div class="m-row"><span>${label}</span><span><select data-axis="${fn}" aria-label="${label}の軸">${opts}</select>
        <label><input type="checkbox" data-axisinv="${fn}" ${e && e.inv ? 'checked' : ''} ${!e ? 'disabled' : ''}> 反転</label>
        <select data-axispad="${fn}" aria-label="${label}のパッド">${padOpts}</select></span></div>`;
    }).join('');
    return `<h3>ゲームパッドの軸の割り当て</h3>${rows}<p class="m-note">ヨーク・スロットルクアドラント・ペダルを別々の機器でつないでも使えます（接続した全部のパッドを読みます）。「なし」はその機能をパッドで動かしません。トーブレーキはペダルの軸を割り当てると効きます。</p>
      <div class="m-big"><button data-act="pad-reset">軸の割り当てを標準に戻す</button></div>`;
  }

  // one rebind row: the function, the key it is on now (Shift+ shown for the actions that live there), 変える
  function bindRow(kind, name, label, code, shifted = false) {
    const busy = capture && capture.kind === kind && capture.name === name;
    return `<tr><td>${label}</td><td>${esc((shifted ? 'Shift+' : '') + codeName(code))}</td><td><button data-rebind="${kind}:${name}">${busy ? 'キーを押してください…' : '変える'}</button></td></tr>`;
  }

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
        + sw('pitchHold', 'ピッチ保持（キーボード）', 'ON：W / S で決めた機首の姿勢を、キーを離しても保ちます。OFF：姿勢はトリムで保つ練習になります')
        + sw('stickBoost', 'スティック補正を強く（旧感触）', '高速域でスティックの効きを自動で増やす補正の上限です。OFF：上限1.7倍（穏やか）。ON：上限2.6倍（以前の感触）')
        + sw('showPerf', '性能の表示', 'fps・描画回数・三角形の数を右上に表示')
        + `<h3>コントローラーとキーボードの感じ</h3>`
        + sw('subtitles', '字幕', '会話・教官の言葉・無線の字幕を出す')
        + range('padDz', 'ゲームパッドの遊び（デッドゾーン）', 0, 0.4, 0.01, x => x.toFixed(2), 'スティックの中心の無反応の幅。ドリフトするときは広げる')
        + range('holdSens', 'キーボードの姿勢保持の速さ', 0.5, 2, 0.25, x => `×${x.toFixed(2)}`, 'W/S・A/D を押し続けたとき、目標の姿勢が動く速さ')
        + `<details class="m-adv"><summary>高度な設定（画質の個別指定）</summary>`
        + advQ('qShadow', '影') + advQ('qAO', '環境光の遮蔽（AO）') + advQ('qBloom', 'ブルーム（光のにじみ）')
        + `<small>「自動」は画質プリセットに従います。個別に変えると、その項目だけプリセットより優先されます。</small></details>`
        + axisMapHtml(v);
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
        <tr><td>C</td><td>操縦席 ⇄ 外からの視点（オートパイロットや教官が飛ばしているときは固定視点も）</td></tr><tr><td>6〜9</td><td>固定視点（滑走路端・管制塔・最終進入 2 km・エプロン）— 他人が飛ばしているときと再生中</td></tr>
        <tr><td>P</td><td>直前の飛行の再生（デブリーフの「飛行を再生」からも。再生中は Space で一時停止、←→ で 5 秒移動、P で終了）</td></tr><tr><td>F7</td><td>シムレート（1× → 2× → 4×。巡航だけ：1,000 ft AGL 未満では自動で 1×）</td></tr><tr><td>F8</td><td>アクティブポーズ（物理を止めて、見回しとパネル操作だけ続ける）</td></tr><tr><td>F9</td><td>スクリーンショット（PNG で保存）</td></tr>
        <tr><td>Tab</td><td>画面の計器盤（PFD・MFD）</td></tr><tr><td>H</td><td>操作の説明</td></tr>
        <tr><td>Enter</td><td>チェックリストの項目を確かめた（◇ の項目）</td></tr><tr><td>Y</td><td>チェックリストや地上走行を教官に任せる</td></tr>
        <tr><td>1〜3</td><td>無線で答える（管制との交信）</td></tr><tr><td>M</td><td>無線の答えを声で言う（「マイクで交信」が ON のとき）</td></tr></table>
        <p class="m-note">ゲームパッドも使えます（FLIGHT LAB と同じ配置）。</p>
        <h3>キーの割り当てを変える（操縦席）</h3>
        ${bindMsg ? `<p class="m-note">${esc(bindMsg)}</p>` : ''}
        <table>${HELD_ROWS.map(([n, label, d]) => bindRow('held', n, label, (settings.get('heldBinds') || {})[n] || d)).join('')}</table>
        <table>${ACT_ROWS.map(([n, label, d]) => bindRow('act', n, label, (settings.get('keyBinds') || {})[n] || d.replace(/^Shift\+/, ''), /^Shift\+/.test(d))).join('')}</table>
        <p class="m-note">「変える」を押してから、割り当てたいキーを押します。矢印キーと Space は予備として常に効きます。重なったときは注意が出ます（そのまま使えます）。</p>
        <div class="m-big"><button data-act="keys-reset">キーの割り当てを標準に戻す</button></div>`;
    }
    if (tab === 'free' && onFreeSetup) {
      const sel = (k, label, opts) => `<label class="m-row"><span>${label}</span><select data-free="${k}" aria-label="${label}">${opts.map(([val, text]) => `<option value="${val}" ${String(freeCfg[k]) === String(val) ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`;
      return sel('start', '開始位置', [['ramp', 'ランプ（駐機・エンジンは自分で始動）'], ['rwy', '滑走路上（エンジン運転中）'], ['pattern', 'ダウンウインド 1,000 ft'], ['final', '最終進入 5 km'], ['area', '訓練空域 3,000 ft'], ['ils', 'ILS 開始点 2,000 ft']])
        + sel('aircraft', '機体', [['pa28', 'Archer（単発）'], ['pa44', 'Seminole（双発）']])
        + sel('hour', '時刻', [[6, '朝 6 時'], [9, '午前 9 時'], [12, '正午'], [15, '午後 3 時'], [18, '夕方 6 時'], [21, '夜 9 時'], [0, '深夜 0 時']])
        + sel('wind', '風', [['calm', '無風'], ['light', '軽い風（滑走路方向 5 kt）'], ['cross', '横風 10 kt'], ['strong', '強い風 16 kt・ガスト'], ['custom', 'カスタム']])
        + (freeCfg.wind === 'custom' ? `<label class="m-row"><span>カスタム風（滑走路から何度・何 kt）</span><span><input type="number" min="0" max="359" value="${freeCfg.windRel}" data-free-num="windRel" style="width:5em"> 度 <input type="number" min="0" max="40" value="${freeCfg.windKt}" data-free-num="windKt" style="width:4em"> kt</span></label>` : '')
        + sel('loading', '搭載（重量・重心）', [['std', '標準（前席 2 名）'], ['light', '軽い（前席 1 名）'], ['heavy', '重い（4 名＋荷物）']])
        + sel('fail', '故障（練習）', [['none', 'ランダム（シード付き：約2割の飛行で1つ）'], ['mag', 'マグネトー不良（ランナップで分かる）'], ['carb', 'キャブレター着氷（湿度の高い日）'], ['elec', 'オルタネーター故障（電圧低下）'], ['pitot', 'ピトー閉塞（着氷の経路）'], ['static', '静圧閉塞（高度計の凍結）'], ['gear', '脚の故障（双発）'], ['pump', '燃料ポンプ故障'], ['engine', 'エンジン停止（飛行中）'], ['engL', '左エンジン停止（双発）'], ['engR', '右エンジン停止（双発）'], ['ahrs', 'AHRS 故障（姿勢表示）'], ['gps', 'GPS 故障'], ['ppanel', '部分パネル（AHRS＋GPS 故障）']])
        + (freeCfg.fail !== 'none' ? sel('failWhen', '教官コンソール：故障の起き方', [['now', 'すぐ'], ['time', '指定した分が過ぎたら'], ['alt', '指定した高度以上で']]) : '')
        + (freeCfg.fail !== 'none' && freeCfg.failWhen === 'time' ? `<label class="m-row"><span>何分後（飛行時間）</span><span><input type="number" min="0" max="180" value="${freeCfg.failMin}" data-free-num="failMin" style="width:5em"> 分</span></label>` : '')
        + (freeCfg.fail !== 'none' && freeCfg.failWhen === 'alt' ? `<label class="m-row"><span>何 ft 以上で</span><span><input type="number" min="0" max="12000" step="100" value="${freeCfg.failAlt}" data-free-num="failAlt" style="width:6em"> ft</span></label>` : '')
        + `<div class="m-big"><button class="primary" data-act="free-start">この条件で飛ぶ</button></div>
        <p class="m-note">訓練の日とは別の、自由な飛行です。記録（飛行日誌）には数えません。故障は選んだものが 1 つだけ起きます（「ランダム」はセッションのシードで決まり、飛行中に起きます）。エンジン停止は飛行中に起きるので、高度のある開始位置がおすすめです。</p>`;
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
    if (b.dataset.qadv) {
      const [k, val] = b.dataset.qadv.split(':');
      settings.set(k, val === 'auto' ? null : val === 'on'); onQuality(); render(); return;
    }
    if (b.dataset.act === 'pad-reset') { settings.set('padMap', null); render(); return; }
    if (b.dataset.act === 'free-start' && onFreeSetup) {
      const WINDS = { calm: { rel: 0, kt: 0, gust: 0 }, light: { rel: 10, kt: 5, gust: 0.5 }, cross: { rel: 80, kt: 10, gust: 0.5 }, strong: { rel: 30, kt: 16, gust: 1 } };
      const LOADS = { std: { fuel: 'std', front: 2, rear: 0, bagKg: 0 }, light: { fuel: 'std', front: 1, rear: 0, bagKg: 0 }, heavy: { fuel: 'std', front: 2, rear: 2, bagKg: 25 } };
      const cfg = { start: freeCfg.start, aircraft: freeCfg.aircraft, hour: +freeCfg.hour,
        wind: freeCfg.wind === 'custom' ? { rel: +freeCfg.windRel || 0, kt: +freeCfg.windKt || 0, gust: 0.5 } : WINDS[freeCfg.wind] || WINDS.light,
        loading: LOADS[freeCfg.loading] || LOADS.std, fail: freeCfg.fail === 'none' ? null : freeCfg.fail,
        // the instructor console's reservation (a time / an altitude), and the session's seed
        // for the random roll when no failure was chosen (aircraft/failures.js)
        failAt: freeCfg.failWhen === 'time' ? { atMin: Math.max(0, +freeCfg.failMin || 0) } : freeCfg.failWhen === 'alt' ? { atAltFt: Math.max(0, +freeCfg.failAlt || 0) } : {},
        seed: Date.now() % 2147483647 };
      close(false); onFreeSetup(cfg); return;
    }
    if (b.dataset.act === 'keys-reset') { settings.set('keyBinds', null); settings.set('heldBinds', null); bindMsg = ''; render(); return; }
    if (b.dataset.rebind) { startCapture(b); return; }
    if (b.dataset.toggle) { const k = b.dataset.toggle; settings.set(k, !settings.get(k)); b.setAttribute('aria-checked', String(!!settings.get(k))); return; }
    if (b.dataset.quality) { settings.set('quality', b.dataset.quality); onQuality(b.dataset.quality); el.querySelectorAll('[data-quality]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.quality === b.dataset.quality))); }
  });
  // (M8) the model's name: kept when it looks like one, else the field goes back to the setting
  el.addEventListener('change', (e) => {
    const k = e.target.dataset && e.target.dataset.text; if (!k) return;
    if (!settings.set(k, e.target.value)) e.target.value = settings.get(k);
  });
  // the axis map's editors and the key rebindings (change = a select or a tick; the rebind capture is a click)
  el.addEventListener('change', (e) => {
    const d = e.target.dataset || {};
    if (d.free) { freeCfg[d.free] = e.target.value; render(); return; }
    if (d.freeNum) { freeCfg[d.freeNum] = e.target.value; return; }
    const patchAxis = (fn, patch) => {
      const cur = { ...(settings.get('padMap') || {}) };
      const std = AXIS_ROWS.find(r => r[0] === fn);
      const base = cur[fn] !== undefined ? cur[fn] : (std && std[2] != null ? { axis: std[2], inv: false, pad: -1 } : null);
      const next = patch(base);
      if (next === undefined) return;
      if (next === null) delete cur[fn]; else cur[fn] = next;
      settings.set('padMap', Object.keys(cur).length ? cur : null); render();
    };
    if (d.axis) {
      const a = parseInt(e.target.value, 10);
      patchAxis(d.axis, (base) => a < 0 ? null : { axis: a, inv: !!(base && base.inv), pad: base && typeof base.pad === 'number' ? base.pad : -1 });
    } else if (d.axispad) {
      const p = parseInt(e.target.value, 10);
      patchAxis(d.axispad, (base) => base ? { ...base, pad: p } : undefined);
    } else if (d.axisinv) {
      patchAxis(d.axisinv, (base) => base ? { ...base, inv: e.target.checked } : undefined);
    }
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
    if (out) out.textContent = k === 'sensitivity' ? v.toFixed(2) : k === 'fov' ? `${v}°` : k === 'textSpeed' || k === 'subSize' || k === 'holdSens' ? `×${v.toFixed(2)}` : k === 'padDz' ? v.toFixed(2) : `${Math.round(v * 100)}%`;
  });
  el.addEventListener('keydown', (e) => {
    if (capture) { e.preventDefault(); e.stopPropagation(); const code = e.code; applyCapture(code); return; }
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
