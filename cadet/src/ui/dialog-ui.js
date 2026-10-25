// CADET — ui/dialog-ui.js : the conversation on screen: subtitles with a typewriter reveal, numbered choices, and the
// textbook overlay (a paper-like tablet that shows one FLIGHT LAB section with its tables and figures).
// Input: click / Space / Enter / E reveal the rest of a line, then go on; 1–9, ↑↓ + Enter or the mouse pick a choice;
// Esc closes the textbook (and only the textbook: otherwise it is left to the game's pause menu); while it is open, Tab
// stays inside it and the line underneath waits. Keys are read in the capture phase and stopped there, so the game does
// not also act on them; keys the conversation does not use (WASD, F, Esc without the book) still reach the game.
// (M8) A line may ask for a question (view.input: a text field above the subtitle, Enter or 聞く sends it to onAsk) and
// a line may grow while it shows (view.stream: the same node with more text — the AI instructor's answer as it comes;
// view.pending: more is coming, so no choices and no "next" yet).
// Works with a mouse, a keyboard or a touch screen, at phone width. The CSS is injected once and scoped under #dlg, so
// it cannot leak into the game's HUD.
const CSS = `
#dlg { position: fixed; inset: 0; z-index: 25; pointer-events: none; font-family: var(--font, system-ui, sans-serif); color: var(--ink, #eef3f8); }
#dlg [hidden] { display: none !important; }
#dlg .dlg-wrap { position: absolute; left: 50%; bottom: 34px; transform: translateX(-50%); width: min(900px, calc(100vw - 24px));
  max-height: calc(100% - 46px); display: flex; flex-direction: column; gap: 8px; }
#dlg .dlg-wrap.in { animation: dlg-in .16s ease-out; }
@keyframes dlg-in { from { opacity: 0; transform: translate(-50%, 8px); } }
/* on a short screen (a phone held sideways) the choices give way and scroll, so the top of the list is never cut off */
#dlg .dlg-choices { flex: 0 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 6px; max-height: 46vh; overflow-y: auto;
  padding: 4px; pointer-events: auto; overscroll-behavior: contain; }
/* a long list (the textbook's parts) in two columns on a wide screen, read down the left one first */
@media (min-width: 701px) {
  #dlg .dlg-choices.many { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(var(--rows, 6), auto); grid-auto-flow: column; }
}
#dlg .dlg-ch { flex: none; display: flex; gap: 10px; align-items: baseline; width: 100%; margin: 0; padding: 9px 14px; text-align: left;
  overflow-wrap: anywhere; font: inherit; font-size: calc(16px * var(--sub-k, 1)); line-height: 1.55; color: var(--ink, #eef3f8); background: rgba(10, 18, 28, 0.88);
  border: 1px solid var(--glass-line, rgba(255,255,255,.12)); border-radius: 12px; cursor: pointer; transition: background .12s, border-color .12s; }
#dlg .dlg-ch:hover { background: rgba(26, 44, 64, 0.9); border-color: rgba(92, 200, 255, .45); }
#dlg .dlg-ch.sel { background: rgba(22, 50, 74, 0.94); border-color: var(--accent, #5cc8ff); box-shadow: inset 0 0 0 1px var(--accent, #5cc8ff); }
#dlg .dlg-ch:focus-visible { outline: 2px solid #ffd479; outline-offset: 2px; }
#dlg .dlg-n { flex: none; display: inline-grid; place-items: center; min-width: 1.75em; height: 1.75em; padding: 0 4px; border-radius: 7px;
  font-size: 13px; font-weight: 800; color: var(--accent-ink, #04121c); background: var(--accent, #5cc8ff); font-variant-numeric: tabular-nums; }
#dlg .dlg-ch.far .dlg-n { color: var(--ink, #eef3f8); background: rgba(255, 255, 255, .14); }
#dlg .dlg-box { flex: none; position: relative; max-height: 50vh; overflow-y: auto; overscroll-behavior: contain; padding: 12px 20px 10px;
  border-radius: 16px; background: rgba(10, 18, 28, 0.84); border: 1px solid var(--glass-line, rgba(255,255,255,.12));
  box-shadow: 0 16px 50px rgba(0, 0, 0, .42); backdrop-filter: blur(8px); pointer-events: auto; cursor: pointer;
  user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
#dlg .dlg-chip { display: inline-block; max-width: 100%; margin: 0 0 6px; padding: 2px 12px; border-radius: 99px; font-size: calc(14px * var(--sub-k, 1)); font-weight: 800;
  letter-spacing: .05em; overflow-wrap: anywhere; color: var(--sp-ink, #04121c); background: var(--sp, var(--accent, #5cc8ff)); }
#dlg .dlg-text { margin: 0; min-height: 1.7em; font-size: calc(19px * var(--sub-k, 1)); line-height: 1.7; white-space: pre-line; overflow-wrap: anywhere;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .35); }
#dlg .dlg-text .off { visibility: hidden; }
/* (M8) the crew in English: the Japanese under the English line */
#dlg .dlg-ja { margin: 4px 0 0; font-size: calc(14px * var(--sub-k, 1)); line-height: 1.6; color: var(--ink-dim, #a9b7c6); white-space: pre-line; overflow-wrap: anywhere; }
#dlg .dlg-box.narr .dlg-text { color: var(--ink-dim, #a9b7c6); font-style: italic; }
#dlg .dlg-cue { min-height: 1.5em; margin-top: 2px; text-align: right; font-size: 12px; color: var(--ink-dim, #a9b7c6); }
#dlg .dlg-cue.wait { animation: dlg-pulse 1.6s ease-in-out infinite; }
@keyframes dlg-pulse { 50% { opacity: .45; } }
/* (M8) the question typed to the AI instructor: a field over the subtitle */
#dlg .dlg-ask { flex: none; display: flex; gap: 8px; padding: 0 4px; pointer-events: auto; }
#dlg .dlg-ask input { flex: 1 1 auto; min-width: 0; font: inherit; font-size: calc(17px * var(--sub-k, 1)); padding: 10px 14px; border-radius: 12px;
  border: 1px solid var(--accent, #5cc8ff); background: rgba(10, 18, 28, 0.94); color: var(--ink, #eef3f8); }
#dlg .dlg-ask input:focus-visible { outline: 2px solid #ffd479; outline-offset: 2px; }
#dlg .dlg-ask button { flex: none; font: inherit; font-weight: 800; padding: 0 18px; border-radius: 12px; border: 0; cursor: pointer;
  background: var(--accent, #5cc8ff); color: var(--accent-ink, #04121c); }
#dlg .dlg-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; overflow: hidden;
  clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }

#dlg .dlg-book { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px;
  background: rgba(4, 8, 14, 0.55); backdrop-filter: blur(3px); pointer-events: auto; }
#dlg .dlg-paper { display: flex; flex-direction: column; width: min(860px, 100%); max-height: 100%; overflow: hidden; border-radius: 16px;
  background: rgba(250, 248, 242, 0.98); color: #1d2329; box-shadow: 0 24px 70px rgba(0, 0, 0, .5); }
#dlg .dlg-bk-head { display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px 10px 22px; border-bottom: 3px solid #f2b632; }
#dlg .dlg-bk-ht { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
#dlg .dlg-bk-kicker { font-size: 12px; font-weight: 700; letter-spacing: .04em; color: #5f6b77; }
#dlg .dlg-bk-title { margin: 2px 0 0; font-size: 21px; line-height: 1.4; font-weight: 800; color: #16324f; }
#dlg .dlg-x { flex: none; margin-left: auto; width: 38px; height: 38px; border-radius: 50%; border: 1px solid #d3d9e0; background: #fff;
  color: #16324f; font: inherit; font-size: 17px; line-height: 1; cursor: pointer; }
#dlg .dlg-x:hover { background: #eef3f8; }
#dlg .dlg-x:focus-visible, #dlg .dlg-bk-body summary:focus-visible { outline: 2px solid #1b6fa8; outline-offset: 2px; }
#dlg .dlg-bk-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 4px 22px 24px; font-size: 15.5px;
  line-height: 1.85; overflow-wrap: break-word; overscroll-behavior: contain; user-select: text; -webkit-user-select: text; }
#dlg .dlg-bk-body:focus { outline: none; }
#dlg .dlg-bk-foot { padding: 7px 18px; border-top: 1px solid #e4e0d4; font-size: 12px; color: #5f6b77; text-align: right; }

/* FLIGHT LAB's textbook classes (its style.css), redrawn for a light page */
#dlg .dlg-bk-body h3 { margin: 22px 0 6px; padding-bottom: 2px; font-size: 17px; font-weight: 800; color: #16324f; border-bottom: 1px solid #d9dee4; }
#dlg .dlg-bk-body h4 { margin: 16px 0 4px; font-size: 15px; font-weight: 800; color: #24476b; }
#dlg .dlg-bk-body p { margin: 8px 0; }
#dlg .dlg-bk-body ul, #dlg .dlg-bk-body ol { margin: 6px 0; padding-left: 1.4em; }
#dlg .dlg-bk-body li { margin: 3px 0; }
#dlg .dlg-bk-body b { color: #0f3456; }
#dlg .dlg-bk-body code { padding: 0 4px; border-radius: 4px; background: #ebeff4; font: 600 .92em ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
#dlg .dlg-bk-body .mute { color: #5f6b77; } #dlg .dlg-bk-body .small { font-size: 12.5px; }
#dlg .dlg-bk-body .tag { display: inline-block; margin: 0 4px 0 0; padding: 0 6px; border-radius: 9px; border: 1px solid #c9d1da;
  background: transparent; color: #5f6b77; font-size: 11px; font-weight: 700; line-height: 1.6; vertical-align: 1px; }
#dlg .dlg-bk-body .tag.fact { border-color: #7fbf98; color: #1f6b43; } #dlg .dlg-bk-body .tag.sum { border-color: #8fb3d6; color: #24476b; }
#dlg .dlg-bk-body .tag.unk { border-color: #d9b45a; color: #7a5a06; }
/* "→ section" cross-references: .bk-see from content/book.js, .bk-ref from a button tidied here */
#dlg .dlg-bk-body .bk-ref, #dlg .dlg-bk-body .bk-see { display: inline-block; margin: 2px 4px 2px 0; padding: 0 8px; border-radius: 6px;
  background: #e9eff6; color: #24476b; font-size: 13px; }
#dlg .bk-key { margin: 14px 0; padding: 10px 14px; border-left: 4px solid #2f9e62; border-radius: 4px; background: #e8f5ed; }
#dlg .bk-key b { color: #1d7346; } #dlg .bk-key ul { margin: 4px 0 0; }
#dlg .bk-warn { margin: 14px 0; padding: 10px 14px; border-left: 4px solid #e0a020; border-radius: 4px; background: #fdf2dc; }
#dlg .bk-f { margin: 12px 0; padding: 8px 14px; border: 1px solid #cfd8e3; border-radius: 8px; background: #eef2f7; color: #13283f;
  text-align: center; font: 600 14.5px/1.7 ui-monospace, "SF Mono", Menlo, Consolas, monospace; overflow-x: auto; }
#dlg .bk-q { margin: 12px 0; padding: 10px 14px; border: 1px solid #d5dbe2; border-radius: 8px; background: #f3f5f8; }
#dlg .bk-q summary { cursor: pointer; color: #1b6fa8; font-size: 14px; font-weight: 700; }
#dlg .bk-q p { margin: 8px 0 2px; }
#dlg .dlg-tw { margin: 10px 0; overflow-x: auto; }
#dlg .bk-t { width: 100%; margin: 0; border-collapse: collapse; font-size: 13.5px; line-height: 1.6; }
#dlg .bk-t th, #dlg .bk-t td { padding: 5px 8px; border: 1px solid #cdd5de; vertical-align: top; text-align: left; }
#dlg .bk-t th { background: #e6eef7; color: #16324f; }
#dlg .bk-radio td.who { width: 4.5em; white-space: nowrap; font-size: 12px; font-weight: 800; }
#dlg .bk-radio td.who.p { color: #1d7346; } #dlg .bk-radio td.who.a { color: #1b6fa8; }
#dlg .bk-radio td.en { width: 46%; color: #13283f; font: 600 13.5px/1.55 ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
#dlg .bk-fig { margin: 14px 0; padding: 10px 10px 8px; border-radius: 12px; background: #0b1422; text-align: center; }
#dlg .bk-fig svg { display: block; width: 100%; height: auto; margin: 0 auto; font-family: var(--font, system-ui, sans-serif); }
#dlg .bk-fig figcaption { margin-top: 6px; font-size: 12px; line-height: 1.6; color: #a9b7c6; }
#dlg .bk-src { font-size: 12.5px; color: #5f6b77; } #dlg .bk-src li { margin: 2px 0; }

@media (max-width: 700px) {
  #dlg .dlg-wrap { bottom: 54px; width: calc(100vw - 16px); max-height: calc(100% - 62px); }
  #dlg .dlg-box { padding: 10px 14px 8px; }
  #dlg .dlg-text { font-size: 18px; }
  #dlg .dlg-ch { font-size: 15px; padding: 8px 12px; }
  #dlg .dlg-book { padding: 8px; }
  #dlg .dlg-bk-head { padding: 12px 12px 8px 16px; }
  #dlg .dlg-bk-title { font-size: 18px; }
  #dlg .dlg-bk-body { padding: 2px 16px 20px; font-size: 15px; }
  #dlg .bk-radio td.en { width: auto; font-size: 12.5px; }
}
@media (prefers-reduced-motion: reduce) { #dlg .dlg-wrap.in, #dlg .dlg-cue.wait { animation: none; } }
`;

const CPS = 40;                                   // characters per second at text speed ×1
const MASH_MS = 250;                              // Enter on fresh choices waits this long, so a key held from the line before does not pick
const ACT_MS = 600;                               // one next / choose per shown line (a double click or two keys do not skip two)

// a short pause after punctuation, in characters, so the reveal reads like speech
function pauseAfter(ch) {
  if (ch === '。' || ch === '！' || ch === '？' || ch === '!' || ch === '?') return 6;
  if (ch === '、' || ch === '，' || ch === ',' || ch === '：') return 3;
  if (ch === '\n') return 4;
  if (ch === '…' || ch === '―' || ch === '—') return 1.5;
  return 0;
}
// the readable ink on a speaker's colour chip (#rgb(a) / #rrggbb(aa) / rgb(a)(); alpha ignored); null keeps the default
function inkOn(color) {
  const s = String(color || '').trim();
  let rgb = null;
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
  if (m) {
    const h = m[1].length <= 4 ? m[1].slice(0, 3).replace(/./g, c => c + c) : m[1].slice(0, 6);
    rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  } else {
    const r = /^rgba?\(\s*([\d.]+)(%?)[\s,]+([\d.]+)(%?)[\s,]+([\d.]+)(%?)/i.exec(s);
    if (r) rgb = [1, 3, 5].map(k => Number(r[k]) * (r[k + 1] ? 2.55 : 1));
  }
  if (!rgb || !rgb.every(Number.isFinite)) return null;
  const lin = (v) => { const c = Math.min(1, Math.max(0, v / 255)); return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]) > 0.2 ? '#04121c' : '#ffffff';
}
// a speaker's colour goes into a CSS custom property: only a plain colour value (hex, rgb()/hsl(), a name) is let through
const COLOR = /^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgb|hsl)a?\([0-9a-z\s.,%/+-]*\)|[a-z]{3,24})$/i;
const safeColor = (c) => (typeof c === 'string' && COLOR.test(c.trim()) ? c.trim() : null);
function chapterLabel(ch) {
  if (!ch) return '';
  if (typeof ch === 'string') return ch;
  if (typeof ch !== 'object') return '';
  const t = String(ch.title || ch.t || ''), n = ch.n != null && ch.n !== '' ? `第 ${ch.n} 章` : '';
  return n && t ? `${n}　${t}` : n || t;
}
const sameView = (a, b) => !!a && !!b && a.dialog === b.dialog && a.node === b.node && a.text === b.text && a.name === b.name && a.color === b.color
  && a.choices.length === b.choices.length && a.choices.every((c, k) => c.text === b.choices[k].text && c.i === b.choices[k].i);

export function createDialogUI({ root = document.body, onNext = () => {}, onChoose = () => {}, onBookClose = () => {}, onAsk = () => {}, settings = null } = {}) {
  const doc = root.ownerDocument || document;
  const win = doc.defaultView || globalThis;
  if (!doc.getElementById('dlg-css')) { const st = doc.createElement('style'); st.id = 'dlg-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const now = () => (win.performance || globalThis.performance || Date).now();
  const raf = typeof win.requestAnimationFrame === 'function' ? win.requestAnimationFrame.bind(win) : null;
  const caf = raf && typeof win.cancelAnimationFrame === 'function' ? win.cancelAnimationFrame.bind(win) : null;
  const coarse = (() => { try { return !!(win.matchMedia && win.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; } })();
  const make = (tag, cls, attrs) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };

  // ---- the DOM: one root; the subtitle (choices stacked above the line) and the textbook overlay above both
  const el = make('div', '', { id: 'dlg' });
  const wrap = make('div', 'dlg-wrap', { role: 'dialog', 'aria-label': '会話' });
  const list = make('div', 'dlg-choices', { role: 'group', 'aria-label': '返事を選ぶ' });
  const box = make('div', 'dlg-box');
  const chip = make('div', 'dlg-chip', { 'aria-hidden': 'true' });
  const line = make('p', 'dlg-text', { 'aria-hidden': 'true' });
  const onSpan = make('span', 'on'), offSpan = make('span', 'off');
  const onText = doc.createTextNode(''), offText = doc.createTextNode('');
  onSpan.appendChild(onText); offSpan.appendChild(offText); line.appendChild(onSpan); line.appendChild(offSpan);
  // the whole line at once, for screen readers: a live region that is always rendered (outside the subtitle, which is
  // display:none between talks), so the first line of a talk is announced too
  const sr = make('p', 'dlg-sr', { 'aria-live': 'polite' });
  const cue = make('div', 'dlg-cue', { 'aria-hidden': 'true' });
  const jaLine = make('p', 'dlg-ja', { lang: 'ja' }); jaLine.hidden = true;
  box.appendChild(chip); box.appendChild(line); box.appendChild(jaLine); box.appendChild(cue);
  const askRow = make('div', 'dlg-ask');
  const askInput = make('input', '', { type: 'text', 'aria-label': '教官への質問', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'send' });
  const askBtn = make('button', '', { type: 'button' }); askBtn.textContent = '聞く';
  askRow.appendChild(askInput); askRow.appendChild(askBtn); askRow.hidden = true;
  wrap.appendChild(list); wrap.appendChild(askRow); wrap.appendChild(box);
  const book = make('div', 'dlg-book', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dlg-book-title' });
  const paper = make('article', 'dlg-paper');
  const head = make('header', 'dlg-bk-head');
  const headText = make('div', 'dlg-bk-ht');
  const kicker = make('div', 'dlg-bk-kicker');
  const bkTitle = make('h2', 'dlg-bk-title', { id: 'dlg-book-title' });
  const xBtn = make('button', 'dlg-x', { type: 'button', 'aria-label': '教科書を閉じる', title: '閉じる（Esc）' });
  xBtn.textContent = '✕';
  headText.appendChild(kicker); headText.appendChild(bkTitle); head.appendChild(headText); head.appendChild(xBtn);
  const bkBody = make('div', 'dlg-bk-body', { tabindex: '-1' });
  const foot = make('div', 'dlg-bk-foot');
  foot.textContent = coarse ? '✕ か外側をタップで閉じる' : 'Esc・✕・外側のクリックで閉じる';
  paper.appendChild(head); paper.appendChild(bkBody); paper.appendChild(foot); book.appendChild(paper);
  el.appendChild(sr); el.appendChild(wrap); el.appendChild(book);
  wrap.hidden = true; book.hidden = true; list.hidden = true;
  root.appendChild(el);

  // ---- state
  let open = false, bookOpen = false, destroyed = false;
  let cur = null, gen = 0, actedGen = -1, actedAt = 0;
  let chars = [], at = [], shown = 0, progress = 0, last = 0, typing = false, timer = 0, timerIsRaf = false;
  let buttons = [], sel = -1, choicesAt = 0;
  let armed = false, bookDown = false, prevFocus = null, spoke = false;

  const speed = () => {
    const v = settings && typeof settings.get === 'function' ? Number(settings.get('textSpeed')) : 1;
    return Number.isFinite(v) && v > 0 ? v : 1;
  };
  const choicesShown = () => open && !typing && !!cur && cur.choices.length > 0;
  const acting = () => actedGen === gen && now() - actedAt < ACT_MS;
  const markActed = () => { actedGen = gen; actedAt = now(); };

  // ---- the typewriter: the whole line is laid out from the start (the unrevealed part invisible), so the box never jumps.
  // It waits while the textbook is open (the line is under it) and goes on from there when the book closes.
  function paint() { onText.data = chars.slice(0, shown).join(''); offText.data = chars.slice(shown).join(''); }
  function schedule() {
    if (timer || !typing || bookOpen || destroyed) return;
    timerIsRaf = !!raf; timer = raf ? raf(tick) : setTimeout(tick, 16);
  }
  function unschedule() { if (!timer) return; if (timerIsRaf) { if (caf) caf(timer); } else clearTimeout(timer); timer = 0; }
  function tick() {
    timer = 0;
    if (!typing || destroyed || bookOpen) return;
    const t = now(), dt = Math.min(0.25, Math.max(0, (t - last) / 1000)); last = t;   // a paused tab resumes where it was
    progress += dt * CPS * speed();
    let n = shown;
    while (n < chars.length && at[n] <= progress) n++;
    if (n !== shown) { shown = n; paint(); follow(); }
    if (shown >= chars.length) finishTyping(); else schedule();
  }
  // a line taller than its box (a long one on a short screen) scrolls inside it: keep the revealed end in view as it types
  function follow() {
    const h = box.clientHeight;
    if (!(box.scrollHeight > h + 1)) return;
    const bottom = onSpan.offsetTop + onSpan.offsetHeight + 4;                // the box is the offsetParent (position: relative)
    if (Number.isFinite(bottom) && bottom > box.scrollTop + h) box.scrollTop = bottom - h;
  }
  function startTyping(text) {
    unschedule();
    chars = Array.from(String(text ?? ''));
    at = new Array(chars.length);
    for (let k = 0, t = 0; k < chars.length; k++) { at[k] = t; t += 1 + pauseAfter(chars[k]); }
    shown = chars.length ? 1 : 0; progress = 0; last = now();
    typing = chars.length > 1;
    paint();
    if (typing) schedule(); else finishTyping();
  }
  function finishTyping() {
    unschedule();
    typing = false; shown = chars.length; paint();
    if (!cur) return;
    if (cur.pending) { cue.textContent = cur.cue || '…'; cue.classList.add('wait'); return; }
    if (cur.choices.length) {
      list.hidden = false; choicesAt = now();
      const n = Math.min(9, cur.choices.length);
      cue.textContent = coarse ? 'タップして選ぶ' : `${n > 1 ? `1〜${n}` : '1'} キー・↑↓ と Enter・クリックで選ぶ`;
      cue.classList.remove('wait');
    } else {
      cue.textContent = coarse ? `▶ タップで${cur.ends ? '閉じる' : '次へ'}` : `▶ クリック / Space で${cur.ends ? '閉じる' : '次へ'}`;
      cue.classList.add('wait');
    }
  }
  function reveal() { if (typing) finishTyping(); }

  // ---- choices
  function buildChoices(choices) {
    list.textContent = ''; buttons = []; sel = -1;
    choices.forEach((c, k) => {
      const b = make('button', k < 9 ? 'dlg-ch' : 'dlg-ch far', { type: 'button', 'data-k': String(k) });
      const num = make('span', 'dlg-n', { 'aria-hidden': 'true' }); num.textContent = String(k + 1);
      const txt = make('span'); txt.textContent = String(c.text ?? '');
      b.appendChild(num); b.appendChild(txt);
      list.appendChild(b); buttons.push(b);
    });
    list.classList.toggle('many', choices.length > 6);
    list.style.setProperty('--rows', String(Math.ceil(choices.length / 2)));
    list.hidden = true;
  }
  function highlight(k) {
    if (!buttons.length) return;
    sel = (k + buttons.length) % buttons.length;
    buttons.forEach((b, j) => b.classList.toggle('sel', j === sel));
    try { buttons[sel].focus({ preventScroll: false }); } catch (e) { /* focus is a nicety */ }
  }
  // the choice button a node belongs to (walks up instead of closest(), so it works on any element)
  function choiceOf(node) {
    for (let n = node; n && n !== wrap; n = n.parentNode) if (n.parentNode === list) return buttons.indexOf(n);
    return -1;
  }
  function pick(k) {
    if (!choicesShown() || acting()) return;
    const c = cur.choices[k];
    if (!c) return;
    markActed();
    onChoose(c.i);
  }
  function advance() {
    if (!open || !cur) return;
    if (typing) { reveal(); return; }
    if (cur.pending) return;
    if (cur.choices.length || acting()) return;
    markActed();
    onNext();
  }

  // ---- the instructor's voice (settings.voice): the browser's speech synthesis, only with a Japanese voice (M8: an
  // English one for the crew's English lines)
  function jaVoice(lang = 'ja') {
    try {
      const vs = win.speechSynthesis.getVoices() || [], re = lang === 'en' ? /^en([-_]|$)/i : /^ja([-_]|$)/i;
      return vs.find(v => re.test(v.lang) && v.localService) || vs.find(v => re.test(v.lang)) || null;
    } catch (e) { return null; }
  }
  function hush() { if (!spoke) return; spoke = false; try { win.speechSynthesis.cancel(); } catch (e) { /* nothing to stop */ } }
  function speak(v) {
    hush();
    if (!settings || typeof settings.get !== 'function' || !settings.get('voice')) return;
    if (!v || v.pending || v.speaker === 'player' || v.speaker === 'narrator' || !win.speechSynthesis || typeof win.SpeechSynthesisUtterance !== 'function') return;
    const voice = jaVoice(v.lang === 'en' ? 'en' : 'ja');
    if (!voice) return;
    try {
      const u = new win.SpeechSynthesisUtterance(String(v.text).replace(/\s+/g, ' '));
      u.voice = voice; u.lang = voice.lang; u.rate = 1.05;
      const vol = settings.get('volume'); if (typeof vol === 'number') u.volume = Math.min(1, Math.max(0, vol));
      win.speechSynthesis.speak(u); spoke = true;
    } catch (e) { /* no voice this time */ }
  }
  try { if (win.speechSynthesis) win.speechSynthesis.getVoices(); } catch (e) { /* starts loading the voice list */ }
  const offSettings = settings && typeof settings.onChange === 'function' ? settings.onChange((k, v) => { if (k === 'voice' && !v) hush(); }) : null;

  // ---- show / hide the subtitle
  function show(view) {
    if (destroyed) return;
    if (!view) { hide(); return; }
    // (M8) the crew in English: the line's English shown (and spoken), its Japanese under it when asked for; a line
    // that is English already (the AI instructor's in that mode: view.lang) spoken and marked as English
    const english = !!(settings && typeof settings.get === 'function' && settings.get('crewEnglish') && typeof view.en === 'string' && view.en);
    const v = { dialog: view.dialog, node: view.node, speaker: view.speaker, name: String(view.name || ''), color: safeColor(view.color),
      text: String((english ? view.en : view.text) ?? ''), ja: english && settings.get('crewEnglishJa') !== false ? String(view.text ?? '') : '', lang: english || view.lang === 'en' ? 'en' : 'ja',
      choices: Array.isArray(view.choices)
        ? view.choices.map((c, k) => ({ i: Number.isInteger(c && c.i) ? c.i : k, text: String((c && c.text) ?? '') })) : [],
      ends: !!view.ends, stream: !!view.stream, pending: !!view.pending, cue: view.cue ? String(view.cue) : '',
      input: view.input && typeof view.input === 'object' ? { max: Number(view.input.max) || 300, placeholder: String(view.input.placeholder || '') } : null };
    // (M8) more of a line that is still coming in: added to what is already shown
    if (open && cur && v.stream && cur.dialog === v.dialog && cur.node === v.node && v.text.startsWith(cur.text)) { extend(v); return; }
    // the same line again with nothing done in between (a second call for one change): keep the reveal where it is
    if (open && actedGen !== gen && sameView(cur, v)) { cur = v; return; }
    gen++; cur = v;
    const narr = v.speaker === 'narrator' || !v.name;
    box.classList.toggle('narr', narr);
    chip.hidden = narr; chip.textContent = v.name;
    const ink = v.color ? inkOn(v.color) : null;
    if (v.color) chip.style.setProperty('--sp', v.color); else chip.style.removeProperty('--sp');
    if (ink) chip.style.setProperty('--sp-ink', ink); else chip.style.removeProperty('--sp-ink');
    sr.textContent = narr ? v.text : `${v.name}：${v.text}`;
    jaLine.textContent = v.ja; jaLine.hidden = !v.ja; line.setAttribute('lang', v.lang);
    cue.textContent = ''; cue.classList.remove('wait');
    if (list.contains(doc.activeElement)) try { doc.activeElement.blur(); } catch (e) { /* the old buttons go anyway */ }
    buildChoices(v.choices);
    if (!open) {
      open = true; wrap.hidden = false;
      wrap.classList.remove('in'); void wrap.offsetWidth; wrap.classList.add('in');   // restart the entrance
    }
    box.scrollTop = 0;                                                        // a very long line scrolls inside the box: start at its top
    showAsk(v.input);
    startTyping(v.text);
    speak(v);
  }
  // (M8) the line grows (the same node, more text): the new characters join the typewriter; the choices come when it is done
  function extend(v) {
    const was = cur; cur = v;
    const add = Array.from(v.text).slice(chars.length);
    let t = chars.length ? at[chars.length - 1] + 1 + pauseAfter(chars[chars.length - 1]) : 0;
    for (const c of add) { at.push(t); chars.push(c); t += 1 + pauseAfter(c); }
    const sameChoices = was.choices.length === v.choices.length && was.choices.every((c, k) => c.text === v.choices[k].text);
    if (!sameChoices) buildChoices(v.choices);
    if (shown < chars.length) {
      if (!typing) { typing = true; last = now(); progress = Math.max(progress, at[shown] || 0); cue.textContent = ''; cue.classList.remove('wait'); list.hidden = true; }
      paint(); schedule();
    } else if (!typing) finishTyping();
    if (was.pending && !v.pending) { sr.textContent = `${v.name}：${v.text}`; speak(v); }
  }
  function showAsk(inp) {
    askRow.hidden = !inp;
    if (!inp) { if (askRow.contains(doc.activeElement)) try { doc.activeElement.blur(); } catch (e) { /* nothing focused */ } return; }
    askInput.maxLength = inp.max; askInput.placeholder = inp.placeholder; askInput.value = '';
    setTimeout(() => { if (!askRow.hidden && !bookOpen) try { askInput.focus({ preventScroll: true }); } catch (e) { /* focus is a nicety */ } }, 30);
  }
  function sendAsk() {
    const t = askInput.value.trim();
    if (!t || askRow.hidden || !cur || !cur.input) return;
    askInput.value = ''; askRow.hidden = true;
    try { askInput.blur(); } catch (e) { /* gone */ }
    onAsk(t);
  }
  askInput.addEventListener('keydown', (e) => {
    // Enter sends (not the Enter that ends a kana-kanji conversion); Esc only leaves the field
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); e.stopPropagation(); sendAsk(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); try { askInput.blur(); } catch (err) { /* gone */ } }
  });
  askBtn.addEventListener('click', (e) => { e.stopPropagation(); sendAsk(); });
  function hide() {
    unschedule(); hush();
    typing = false; armed = false;
    if (!open) { cur = null; return; }
    open = false; cur = null; gen++;
    if (wrap.contains(doc.activeElement)) try { doc.activeElement.blur(); } catch (e) { /* nothing focused */ }
    wrap.hidden = true; list.hidden = true; list.textContent = ''; buttons = []; sel = -1; askRow.hidden = true; askInput.value = '';
    chars = []; at = []; shown = 0; paint(); cue.textContent = ''; sr.textContent = ''; jaLine.textContent = ''; jaLine.hidden = true;
  }

  // ---- the textbook overlay
  // The textbook is static, trusted content (FLIGHT LAB's own HTML), parsed in an inert <template> and tidied for the
  // game: its simulator boxes / calculators and buttons do nothing here, wide tables scroll inside their own box, and
  // a figure does not grow past 1.5× its drawn size.
  function tidy(node) {
    if (typeof node.querySelectorAll !== 'function') return;
    try {
      for (const n of node.querySelectorAll('script, style, iframe, object, embed, link, meta, .bk-sim, .bk-calc')) n.remove();
      for (const n of node.querySelectorAll('*')) for (const a of Array.from(n.attributes || [])) if (/^on/i.test(a.name)) n.removeAttribute(a.name);
      for (const b of node.querySelectorAll('button')) {
        const s = doc.createElement('span'); s.className = 'bk-ref'; s.textContent = b.textContent; b.replaceWith(s);
      }
      for (const n of node.querySelectorAll('input, select, textarea, form')) n.remove();
      for (const a of node.querySelectorAll('a[href]')) {
        if (/^\s*javascript:/i.test(a.getAttribute('href'))) a.removeAttribute('href');
        else { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      }
      for (const t of node.querySelectorAll('table')) {
        if (t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('dlg-tw')) continue;
        const w = doc.createElement('div'); w.className = 'dlg-tw'; t.replaceWith(w); w.appendChild(t);
      }
      for (const s of node.querySelectorAll('svg')) {
        const vb = String(s.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
        if (vb.length === 4 && vb[2] > 0) s.style.maxWidth = `${Math.round(vb[2] * 1.5)}px`;
      }
    } catch (e) { /* left as it came: still readable */ }
  }
  function fillBook(html) {
    const tpl = doc.createElement('template');
    if (tpl.content) {
      tpl.innerHTML = html; tidy(tpl.content);
      bkBody.textContent = ''; bkBody.appendChild(tpl.content);
    } else { bkBody.innerHTML = html; tidy(bkBody); }
  }
  function showBook(sec = {}) {
    if (destroyed) return;
    const { title = '', chapter = null, html = '' } = sec || {};
    kicker.textContent = chapterLabel(chapter); kicker.hidden = !kicker.textContent;
    bkTitle.textContent = String(title || '');
    fillBook(String(html || ''));
    bkBody.scrollTop = 0;
    if (!bookOpen) prevFocus = doc.activeElement;
    bookOpen = true; book.hidden = false; armed = false; bookDown = false;
    unschedule();                                                             // the line underneath waits (see schedule)
    try { bkBody.focus({ preventScroll: true }); } catch (e) { /* the keys still scroll it (see onKey) */ }
  }
  function closeBook(reason) {
    if (!bookOpen) return;
    bookOpen = false; book.hidden = true; bookDown = false;
    if (typing) { last = now(); schedule(); }
    if (book.contains(doc.activeElement)) try { doc.activeElement.blur(); } catch (e) { /* nothing focused */ }
    const p = prevFocus; prevFocus = null;
    if (p && p !== doc.body && p.isConnected && typeof p.focus === 'function' && (open || !wrap.contains(p))) {
      try { p.focus({ preventScroll: true }); } catch (e) { /* stays on the page */ }
    }
    bkBody.textContent = '';                                                  // the figures go with it
    onBookClose(reason);
  }

  // ---- input
  const inside = (node, t) => !!t && t.nodeType === 1 && node.contains(t);    // contains() throws on a non-node (window)
  const isField = (t) => !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  const isControl = (t) => !!t && (isField(t) || t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'SUMMARY');
  // another modal panel (the pause menu) has the keyboard and the mouse: leave its events alone. A closed one does not
  // count, even when focus was left on one of its (now hidden) buttons. An open one counts even when focus is still in
  // the textbook under it (it sits above #dlg), so Esc and Tab go to it and not to the book behind.
  const unhidden = (n) => { for (let x = n; x && x.nodeType === 1; x = x.parentNode) if (x.hidden) return false; return true; };
  function otherModal(t) {
    if (!inside(el, t)) {
      for (let n = t; n && n.nodeType === 1; n = n.parentNode) {
        if (n.getAttribute && (n.getAttribute('aria-modal') === 'true' || n.getAttribute('role') === 'dialog')) { if (unhidden(n)) return true; break; }
      }
    }
    if (typeof doc.querySelectorAll === 'function') {
      for (const m of doc.querySelectorAll('[aria-modal="true"]')) if (!el.contains(m) && unhidden(m)) return true;
    }
    return false;
  }
  const digitOf = (e) => { const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || ''); if (m) return +m[1]; return /^[1-9]$/.test(e.key || '') ? +e.key : 0; };
  const SCROLL = { ArrowUp: -48, ArrowDown: 48, PageUp: -0.85, PageDown: 0.85, Space: 0.85, Home: -Infinity, End: Infinity };
  // the textbook is modal: Tab goes round its own controls (✕, the questions' <summary>, links) instead of leaving it
  function bookStops() {
    const out = [];
    try {
      for (const n of paper.querySelectorAll('button, summary, a[href], [tabindex]:not([tabindex="-1"])')) {
        if (!n.disabled && (typeof n.getClientRects !== 'function' || n.getClientRects().length)) out.push(n);   // not inside a closed <details>
      }
    } catch (e) { /* the ✕ is enough */ }
    return out.length ? out : [xBtn];
  }
  function bookTab(e) {
    e.stopPropagation();
    const f = bookStops(), a = doc.activeElement, i = f.indexOf(a), out = !inside(paper, a);
    const wrapAround = out || (e.shiftKey ? i === 0 : i === f.length - 1) || (a === bkBody && !e.shiftKey && !f.some(n => bkBody.contains(n)));
    if (!wrapAround) return;                                                  // the browser moves on inside the page
    e.preventDefault();
    try { (e.shiftKey ? f[f.length - 1] : f[0]).focus(); } catch (err) { /* stays where it is */ }
  }
  function bookKey(e) {
    const code = e.code || e.key;
    if (code === 'Escape' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); held.add(e.code); closeBook('esc'); return; }
    if (code === 'Tab' || e.key === 'Tab') { bookTab(e); return; }
    const inBook = inside(book, e.target);
    if (code in SCROLL) {
      e.stopPropagation();
      // focus inside the page: the browser scrolls it (Space still opens a <details> or presses ✕); elsewhere scroll it here
      if (inBook && !(e.target === xBtn && code !== 'Space')) return;
      e.preventDefault();
      let d = SCROLL[code];
      if (code === 'Space' && e.shiftKey) d = -d;
      const h = bkBody.clientHeight || 400;
      if (d === Infinity) bkBody.scrollTop = bkBody.scrollHeight || 1e9;
      else if (d === -Infinity) bkBody.scrollTop = 0;
      else bkBody.scrollTop += Math.abs(d) < 1 ? d * h : d;
      return;
    }
    // the dialogue keys wait while the book is open (Enter still works on the book's own controls)
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'KeyE' || digitOf(e)) { e.stopPropagation(); if (!inBook) e.preventDefault(); }
  }
  // keys whose press the conversation used: their auto-repeat, when the key is held past the line (or the book) it
  // closed, is not a new press for the game (a held E would otherwise start the talk again, a held Esc open the menu)
  const held = new Set();
  function onKey(e) {
    if (destroyed) return;
    if (e.repeat && e.code && held.has(e.code)) { e.preventDefault(); e.stopPropagation(); return; }
    held.delete(e.code);                                                      // a fresh press (the key was let go)
    if (!open && !bookOpen) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    if (otherModal(e.target)) return;
    if (bookOpen) { bookKey(e); return; }
    if (isField(e.target)) return;
    const code = e.code || '', key = e.key || '';
    const confirm = code === 'Enter' || code === 'NumpadEnter' || (!code && key === 'Enter');
    const space = code === 'Space' || (!code && key === ' ');
    const eKey = code === 'KeyE';
    const arrow = code === 'ArrowUp' || code === 'ArrowDown' ? (code === 'ArrowUp' ? -1 : 1) : 0;
    const d = digitOf(e);
    if (!confirm && !space && !eKey && !arrow && !d) return;
    // a focused control elsewhere on the page keeps its own Enter / Space
    const t = e.target, mine = inside(wrap, t);
    if ((confirm || space) && !mine && t !== doc.body && t !== doc.documentElement && isControl(t) && unhidden(t)) return;
    if (arrow && !choicesShown()) return;                                     // nothing to move through: the game keeps its arrows
    if (d && !typing && !choicesShown()) return;
    e.preventDefault(); e.stopPropagation(); held.add(e.code);
    if (e.repeat) return;                                                     // a held key does not race through the conversation
    if (typing) { reveal(); return; }
    if (!choicesShown()) { if (confirm || space || eKey) advance(); return; }
    if (d) { if (d <= buttons.length) pick(d - 1); return; }
    if (arrow) { highlight(sel < 0 ? (arrow > 0 ? 0 : buttons.length - 1) : sel + arrow); return; }
    const focused = choiceOf(doc.activeElement);
    if ((confirm || space) && focused >= 0) { pick(focused); return; }
    if (confirm && now() - choicesAt >= MASH_MS) { if (sel >= 0) pick(sel); else highlight(0); }
    // Space / E with nothing chosen: nothing (mashing the "next" keys never picks an answer)
  }
  // A click goes on only when it also began while the subtitle was up (the click that started the talk does not skip
  // the first line). Clicks elsewhere count only on the bare 3D view (with the pointer locked, the canvas gets them).
  function onDown(e) { armed = open && !bookOpen && !destroyed && !otherModal(e.target); }
  function onWorldClick(e) {
    if (!open || bookOpen || destroyed || (e.button !== undefined && e.button !== 0)) return;
    const t = e.target;
    if (inside(el, t)) return;                                                // the subtitle's own listener has it
    if (!(t === doc.body || t === doc.documentElement || t === doc || t === win || (t && t.tagName === 'CANVAS'))) return;
    if (!armed) return;
    armed = false;
    advance();
  }
  function onWrapClick(e) {
    if (!open || bookOpen) return;
    e.stopPropagation();
    const k = choiceOf(e.target);
    // a click from a screen reader or another assistive tool has no pointer press before it (detail 0): it counts on a
    // choice and on the subtitle box (the click that started the talk never lands here: it began before the box was up)
    if (!armed && e.detail !== 0) return;
    armed = false;
    if (k >= 0) { pick(k); return; }
    if (inside(box, e.target)) advance();
  }
  wrap.addEventListener('click', onWrapClick);
  xBtn.addEventListener('click', (e) => { e.stopPropagation(); closeBook('button'); });
  book.addEventListener('pointerdown', (e) => { bookDown = e.target === book; });
  book.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target === book && bookDown) closeBook('outside');                  // a text selection dragged out of the page does not close it
    bookDown = false;
  });
  win.addEventListener('keydown', onKey, true);
  win.addEventListener('pointerdown', onDown, true);
  win.addEventListener('click', onWorldClick, true);

  return {
    show,
    hide,
    get isOpen() { return open; },
    showBook,
    hideBook() { closeBook('api'); },
    get bookOpen() { return bookOpen; },
    get typing() { return typing; },
    reveal,
    // (M8) the question field: what is typed in it, and sending it (tests; the field's own Enter does the same)
    get asking() { return !askRow.hidden; },
    ask(text) { askInput.value = String(text ?? ''); sendAsk(); },
    get el() { return el; },
    destroy() {
      if (destroyed) return;
      hide();
      bookOpen = false; book.hidden = true; bkBody.textContent = '';
      destroyed = true;
      win.removeEventListener('keydown', onKey, true);
      win.removeEventListener('pointerdown', onDown, true);
      win.removeEventListener('click', onWorldClick, true);
      if (offSettings) offSettings();
      el.remove();
    },
  };
}
