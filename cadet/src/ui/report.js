// CADET — ui/report.js : a panel with text to take away (M8): the bench's results (to paste into README), the notes
// a player wrote about the game (the tablet's 感想). The text is in a read-only box, selected at once; コピー puts it
// on the clipboard (or selects it, where the browser does not allow that), 保存 saves it as a .txt file (made in the
// page: nothing is sent anywhere). Esc, 閉じる or a click outside close it.
const CSS = `
#report { position: fixed; inset: 0; z-index: 32; display: grid; place-items: center; background: rgba(4, 8, 14, 0.6); backdrop-filter: blur(3px); }
#report[hidden] { display: none; }
#report .r-panel { width: min(760px, calc(100vw - 32px)); max-height: calc(100vh - 32px); display: flex; flex-direction: column; gap: 10px; padding: 20px;
  border-radius: 16px; background: rgba(10, 18, 28, 0.94); border: 1px solid var(--glass-line); color: var(--ink); font-family: var(--font); box-shadow: 0 24px 70px rgba(0,0,0,.5); }
#report h2 { margin: 0; font-size: 19px; }
#report p { margin: 0; font-size: 13px; line-height: 1.7; color: var(--ink-dim); }
#report textarea { flex: 1 1 auto; min-height: 220px; width: 100%; box-sizing: border-box; resize: vertical; padding: 10px; border-radius: 10px; border: 1px solid var(--glass-line);
  background: rgba(255,255,255,.05); color: var(--ink); font: 12.5px/1.6 ui-monospace, "SF Mono", Menlo, Consolas, monospace; white-space: pre; }
#report .r-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; align-items: center; }
#report .r-row span { margin-right: auto; font-size: 13px; color: var(--accent); }
#report button { font: inherit; font-size: 14px; padding: 9px 16px; border-radius: 10px; border: 1px solid var(--glass-line); background: rgba(255,255,255,.08); color: var(--ink); cursor: pointer; }
#report button.primary { background: var(--accent); color: var(--accent-ink); border: 0; font-weight: 800; }
#report button:focus-visible, #report textarea:focus-visible { outline: 2px solid #ffd479; outline-offset: 2px; }
`;

export function createReport({ root = document.body, onClose = () => {} } = {}) {
  if (!document.getElementById('report-css')) { const st = document.createElement('style'); st.id = 'report-css'; st.textContent = CSS; document.head.appendChild(st); }
  const el = document.createElement('div'); el.id = 'report'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = '<div class="r-panel"><h2></h2><p class="r-intro"></p><textarea readonly spellcheck="false" aria-label="書き出す文字"></textarea>'
    + '<div class="r-row"><span class="r-msg" aria-live="polite"></span><button data-act="copy" class="primary">コピー</button><button data-act="save">保存（.txt）</button><button data-act="close">閉じる</button></div></div>';
  root.appendChild(el);
  const ta = el.querySelector('textarea'), msg = el.querySelector('.r-msg');
  let open = false, file = 'cadet.txt';
  function show({ title = '', intro = '', text = '', filename = 'cadet.txt' } = {}) {
    el.querySelector('h2').textContent = title; el.querySelector('.r-intro').textContent = intro;
    ta.value = text; msg.textContent = ''; file = filename;
    el.setAttribute('aria-label', title);
    el.hidden = false; open = true;
    setTimeout(() => { try { ta.focus({ preventScroll: true }); ta.select(); } catch (e) { /* focus is a nicety */ } }, 30);
  }
  function hide() { if (!open) return; open = false; el.hidden = true; onClose(); }
  async function copy() {
    ta.focus(); ta.select();
    try { await navigator.clipboard.writeText(ta.value); msg.textContent = 'コピーしました'; return; } catch (e) { /* not allowed here: the selection */ }
    try { msg.textContent = document.execCommand && document.execCommand('copy') ? 'コピーしました' : '選んであります（Ctrl+C でコピー）'; } catch (e) { msg.textContent = '選んであります（Ctrl+C でコピー）'; }
  }
  function save() {
    try {
      const url = URL.createObjectURL(new Blob([ta.value], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = file; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      msg.textContent = `${file} を保存しました`;
    } catch (e) { msg.textContent = '保存できませんでした。コピーを使ってください'; }
  }
  el.addEventListener('click', (e) => {
    if (e.target === el) { hide(); return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'copy') copy(); else if (b.dataset.act === 'save') save(); else hide();
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(); } });
  return { show, hide, get isOpen() { return open; }, get text() { return ta.value; }, el };
}
