// CADET — ui/cards.js : the title cards between days and chapters (M5): the screen goes dark, a line or two (the
// chapter, the date and the time of day), then the world again. show() resolves when the card has faded out; the work
// behind it (the day changed, the cadet moved) is done by the caller while it is dark (onDark).
const CSS = `
.cd { position: fixed; inset: 0; z-index: 29; display: grid; place-items: center; background: #05080c; color: #e8f0fa; opacity: 0; pointer-events: none;
  transition: opacity .6s ease; font-family: var(--font, system-ui, sans-serif); text-align: center; }
.cd.on { opacity: 1; pointer-events: auto; }
.cd .k { font-size: 13px; letter-spacing: .3em; color: #8fd3ff; }
.cd h1 { margin: 10px 0 6px; font-size: clamp(24px, 4.2vw, 44px); font-weight: 700; letter-spacing: .12em; }
.cd p { margin: 0; font-size: 15px; color: #b9c8d6; letter-spacing: .06em; }
@media (prefers-reduced-motion: reduce) { .cd { transition: none; } }
`;
export function createCards({ doc = document } = {}) {
  if (!doc.getElementById('cd-css')) { const st = doc.createElement('style'); st.id = 'cd-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const el = doc.createElement('div'); el.className = 'cd'; el.setAttribute('aria-live', 'polite');
  doc.body.appendChild(el);
  let busy = null;
  // { kicker, title, sub, ms (shown), onDark (while dark), fade (ms in and out: a way skipped is quicker) } → a promise
  function show({ kicker = '', title = '', sub = '', ms = 2200, onDark = null, fade = 650 } = {}) {
    const run = async () => {
      el.innerHTML = ''; el.style.transitionDuration = fade === 650 ? '' : `${fade}ms`;
      const k = doc.createElement('div'); k.className = 'k'; k.textContent = kicker;
      const h = doc.createElement('h1'); h.textContent = title;
      const p = doc.createElement('p'); p.textContent = sub;
      el.append(k, h, p);
      el.classList.add('on');
      await new Promise(r => setTimeout(r, fade));
      try { if (onDark) onDark(); } catch (e) { console.error(e); }
      await new Promise(r => setTimeout(r, ms));
      el.classList.remove('on');
      await new Promise(r => setTimeout(r, fade));
    };
    busy = (busy || Promise.resolve()).then(run);
    const p = busy; p.then(() => { if (busy === p) busy = null; });
    return p;
  }
  return { show, get showing() { return el.classList.contains('on'); } };
}
