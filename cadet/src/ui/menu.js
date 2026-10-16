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
#menu .m-note { margin-top: 12px; font-size: 12px; color: var(--ink-dim); line-height: 1.7; }
#menu p { line-height: 1.75; font-size: 14px; }
`;

export function createMenu({ root = document.body, settings, presets = [], onResume = () => {}, onQuality = () => {}, onMode = () => {}, getMode = () => 'walk', getPreset = () => null, onResetProgress = null, version = '' }) {
  if (!document.getElementById('menu-css')) { const st = document.createElement('style'); st.id = 'menu-css'; st.textContent = CSS; document.head.appendChild(st); }
  const el = document.createElement('div'); el.id = 'menu'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '一時停止メニュー');
  root.appendChild(el);
  let tab = 'main', open = false;
  const TABS = [['main', '再開'], ['settings', '設定'], ['keys', '操作'], ['about', 'このゲームについて']];
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function body() {
    if (tab === 'main') {
      const walk = getMode() === 'walk';
      return `<div class="m-big">
        <button class="primary" data-act="resume">再開する</button>
        <button data-act="mode">${walk ? '見学モードに切り替える（自由なカメラ・視点 1〜9・0）' : '歩くモードに戻る'}</button>
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
        + range('volume', '音量', 0, 1, 0.05, x => `${Math.round(x * 100)}%`)
        + `<div class="m-row"><span>画質</span><span></span><div class="m-chips" style="grid-column:1/-1">${presets.map(p => `<button data-quality="${p.id}" aria-pressed="${(v.quality || getPreset()) === p.id}">${esc(p.label)}${!v.quality && getPreset() === p.id ? '（自動）' : ''}</button>`).join('')}</div><small>最初は GPU に合わせて自動で選びます。カクつくときは下げてください</small></div>`
        + range('textSpeed', '字幕の速さ', 0.5, 3, 0.25, x => `×${x.toFixed(2)}`, '会話の文字が出る速さ')
        + sw('voice', '教官の声（読み上げ）', 'ブラウザの音声合成で教官の台詞を読み上げます（日本語の声がある場合）')
        + sw('showPerf', '性能の表示', 'fps・描画回数・三角形の数を右上に表示');
    }
    if (tab === 'keys') {
      return `<table>
        <tr><td>W A S D</td><td>移動</td></tr><tr><td>マウス</td><td>見回す（画面をクリックすると操作が始まります）</td></tr>
        <tr><td>Shift（押したまま）</td><td>走る</td></tr><tr><td>E / 左クリック</td><td>調べる・話しかける・扉を開け閉めする・カードを閉じる</td></tr>
        <tr><td>会話中</td><td>クリック・Space・Enter で次へ。1〜9 か ↑↓ と Enter で選ぶ。Esc で教科書を閉じる。話を切り上げるときは「また後で来ます」</td></tr>
        <tr><td>Esc</td><td>一時停止（このメニュー）</td></tr><tr><td>F</td><td>性能の表示</td></tr>
        <tr><td>見学モード</td><td>WASD・Space（上）・C（下）・G（地面に立つ）・1〜9・0（視点）・[ ]（時刻）</td></tr></table>
        <p class="m-note">操縦（W / S ピッチ・A / D ロール・Q / E ラダー・R / F スロットル など、FLIGHT LAB と同じキー）は、操縦席に座ってから使います（これから作ります）。</p>`;
    }
    return `<p><b>CADET</b>（パイロット訓練生シミュレーター）${version ? ` <span class="m-val">${esc(version)}</span>` : ''}</p>
      <p>公開情報を基にした非公式のゲームです。航空会社（翔洋航空）・訓練所・人物はすべて架空です。実機訓練の代わりにはならず、航法には使えません（NOT FOR NAVIGATION）。飛行モデル・課目・教科書は FLIGHT LAB（同じリポジトリの自主学習教材）を使っています。</p>
      <p class="m-note">使っているもの：three.js（MIT License）、ambientCG のテクスチャ（CC0）。家具・木・機体・標識などはプログラムで作っています。</p>`
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
    // erasing the record asks twice: the first press only arms the button
    if (b.dataset.act === 'reset') {
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'もう一度押すと記録を消します'; return; }
      onResetProgress(); b.removeAttribute('data-armed'); b.textContent = '記録を消しました'; b.disabled = true; return;
    }
    if (b.dataset.toggle) { const k = b.dataset.toggle; settings.set(k, !settings.get(k)); b.setAttribute('aria-checked', String(!!settings.get(k))); return; }
    if (b.dataset.quality) { settings.set('quality', b.dataset.quality); onQuality(b.dataset.quality); el.querySelectorAll('[data-quality]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.quality === b.dataset.quality))); }
  });
  el.addEventListener('input', (e) => {
    const k = e.target.dataset && e.target.dataset.set; if (!k) return;
    settings.set(k, parseFloat(e.target.value));
    const v = settings.get(k), out = el.querySelector(`[data-val="${k}"]`);
    if (out) out.textContent = k === 'sensitivity' ? v.toFixed(2) : k === 'fov' ? `${v}°` : k === 'textSpeed' ? `×${v.toFixed(2)}` : `${Math.round(v * 100)}%`;
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const t = e.target.closest('[role=tab]'); if (!t) return;
      const i = TABS.findIndex(([k]) => k === tab), j = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
      tab = TABS[j][0]; render(); el.querySelector(`[data-tab="${tab}"][role=tab]`)?.focus();
    }
  });
  function show(t = 'main') { tab = t; open = true; render(); el.hidden = false; setTimeout(() => el.querySelector('.m-big .primary, [role=tab][aria-selected=true]')?.focus(), 0); }
  function close(resume = false) { if (!open) return; open = false; el.hidden = true; if (resume) onResume(); }
  return { open: show, close, toggle: () => (open ? close(true) : show()), get isOpen() { return open; }, destroy() { el.remove(); } };
}
