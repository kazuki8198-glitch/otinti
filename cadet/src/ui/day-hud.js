// CADET — ui/day-hud.js : the first day's panels (M4), in the flight HUD's glass style and inside its columns.
//  - The task panel (left, on top): where the day is (the phase, its number of the day's), what to do now, the keys
//    for it (Enter: confirm the item; Y: leave it to the instructor), and in the free part of the flight the basic
//    readings come from the flight HUD's own panel below it.
//  - The checklist (right): CADET's own (content/checklists-archer.js): the items tick as the switches are set; the
//    current one says what to look at and why.
//  - The radio (right): the station and its frequency, what was heard and said (the English, with the Japanese under
//    it), the question, the three choices (1–3, or a click), the clock, and what was right or wrong about the answer.
//  - The logbook (a page in the middle): the cadet's logbook with today's line, the totals and the instructor's
//    signature written in.
// None of it takes a key: the game routes them (fly-mode). update calls write only what changed.
const CSS = `
#fhud .dh-task { flex: none; padding: 9px 12px 10px; font-size: 13px; line-height: 1.5; }
#fhud .dh-task .dh-k { font-size: 11.5px; color: var(--accent, #5cc8ff); font-weight: 800; letter-spacing: .04em; }
#fhud .dh-task h3 { margin: 1px 0 3px; font-size: 15.5px; line-height: 1.4; }
#fhud .dh-task p { margin: 0 0 6px; color: #d7e4f2; }
#fhud .dh-flow { display: flex; gap: 3px; margin: 2px 0 6px; }
#fhud .dh-flow i { flex: 1; height: 4px; border-radius: 2px; background: transparent; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .3); }
#fhud .dh-flow i.done { background: var(--fh-ok, #6fe3a0); box-shadow: none; } #fhud .dh-flow i.cur { background: var(--accent, #5cc8ff); box-shadow: none; height: 7px; margin-top: -1.5px; }
#fhud .dh-flow i.lesson { height: 6px; margin-top: -1px; }
#fhud .dh-keys { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12px; color: #cfe3f5; }
#fhud .dh-keys span { display: inline-flex; gap: 4px; align-items: center; }
#fhud .dh-check li .dh-note { display: block; margin-top: 2px; font-size: 11.5px; color: #cfe3f5; }
#fhud .dh-check li.cf b::before { content: '◇ '; color: var(--fh-amber, #ffb547); }
#fhud .dh-radio .dh-st { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
#fhud .dh-radio .dh-st b { font-size: 13.5px; color: var(--accent, #5cc8ff); }
#fhud .dh-radio .dh-st span { font: 12px var(--fh-mono); color: #9fe0c4; }
#fhud .dh-lines { display: grid; gap: 5px; margin-bottom: 6px; }
#fhud .dh-line { padding: 5px 8px; border-radius: 6px; background: rgba(0, 0, 0, .35); }
#fhud .dh-line.p { background: rgba(242, 182, 50, .1); border-left: 3px solid #f2b632; }
#fhud .dh-line .w { display: inline-block; min-width: 3.4em; margin-right: 6px; font: 700 11px var(--fh-mono); color: #8fd3ff; }
#fhud .dh-line.p .w { color: #f2b632; }
#fhud .dh-line .en { font: 600 12.5px/1.5 var(--fh-mono); color: #e1f4ff; }
#fhud .dh-line .ja { display: block; margin-top: 2px; font-size: 11.5px; color: var(--ink-dim, #a9b7c6); }
#fhud .dh-mic { margin: 4px 0 2px; padding: 5px 8px; border-radius: 6px; font-size: 12px; line-height: 1.55; background: rgba(92, 200, 255, .1); border-left: 3px solid var(--accent, #5cc8ff); }
#fhud .dh-mic.on { animation: dh-mic 1.2s ease-in-out infinite; }
#fhud .dh-mic.ng { background: rgba(255, 181, 71, .1); border-left-color: var(--fh-amber, #ffb547); }
#fhud .dh-mic .heard { display: block; font: 600 12px/1.5 var(--fh-mono); color: #e1f4ff; }
#fhud .dh-mic .miss { display: block; color: var(--fh-amber, #ffb547); font-weight: 700; }
@keyframes dh-mic { 50% { background: rgba(92, 200, 255, .22); } }
@media (prefers-reduced-motion: reduce) { #fhud .dh-mic.on { animation: none; } }
#fhud .dh-clock { height: 4px; margin: 6px 0 2px; border-radius: 2px; background: rgba(255, 255, 255, .12); overflow: hidden; }
#fhud .dh-clock i { display: block; height: 100%; background: var(--accent, #5cc8ff); transition: width .12s linear; }
#fhud .dh-clock.low i { background: var(--fh-amber, #ffb547); }
.dh-book { position: fixed; inset: 0; z-index: 26; display: grid; place-items: center; padding: 16px; background: rgba(4, 8, 14, .55); backdrop-filter: blur(3px); }
.dh-book[hidden] { display: none; }
.dh-page { width: min(1060px, 100%); max-height: calc(100vh - 32px); overflow: auto; padding: 22px 26px 18px; border-radius: 6px; color: #23262b;
  background: linear-gradient(#fbf8f0, #f4efe2); box-shadow: 0 24px 70px rgba(0, 0, 0, .5), inset 0 0 0 1px #d9d0bd; font-family: var(--font, system-ui, sans-serif); }
.dh-page header { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; border-bottom: 2px solid #1d3b5c; padding-bottom: 6px; margin-bottom: 10px; }
.dh-page h2 { margin: 0; font-size: 20px; letter-spacing: .08em; color: #1d3b5c; }
.dh-page header small { color: #6b6457; font-size: 12px; letter-spacing: .06em; }
.dh-page table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.dh-page th { white-space: nowrap; padding: 5px 6px; font-size: 11px; font-weight: 700; color: #1d3b5c; background: rgba(29, 59, 92, .07); border: 1px solid #c9bfa9; text-align: center; }
.dh-page td { padding: 6px; border: 1px solid #d6ccb6; vertical-align: top; }
.dh-page td.n, .dh-page td.nw { white-space: nowrap; }
.dh-page td.n { text-align: right; font-variant-numeric: tabular-nums; font-family: ui-monospace, Consolas, monospace; }
.dh-page tr.new td { background: rgba(255, 230, 150, .25); }
.dh-page tfoot td { font-weight: 700; background: rgba(29, 59, 92, .05); }
.dh-page .dh-end { margin-top: 4px; padding: 3px 6px; border-left: 3px solid #b8892a; font-size: 11.5px; color: #5b4a22; background: rgba(184, 137, 42, .08); }
.dh-page .dh-ana { margin-top: 10px; padding: 8px 10px; border-top: 1px solid #c9d4e2; font-size: 12.5px; color: #243447; } .dh-page .dh-ana h3 { margin: 0 0 4px; font-size: 13.5px; } .dh-page .dh-ana p { margin: 2px 0; }
.dh-page .g { display: inline-block; margin-right: 6px; white-space: nowrap; }
.dh-page .g b { display: inline-block; min-width: 1.4em; text-align: center; margin-left: 2px; border-radius: 4px; color: #fff; background: #2f6f4f; }
.dh-page .g b.c { background: #a0473d; }
.dh-sig { position: relative; display: inline-block; min-width: 120px; font: 22px/1.1 "Segoe Script", "Bradley Hand", "Snell Roundhand", "Yu Mincho", cursive; color: #1f3f8f; transform: rotate(-4deg); }
.dh-sig small { display: block; font: 9.5px var(--font, sans-serif); color: #6b6457; transform: rotate(4deg); }
.dh-sig.write span { clip-path: inset(0 100% 0 0); animation: dh-write 1.6s .4s ease-out forwards; display: inline-block; }
@keyframes dh-write { to { clip-path: inset(0 0 0 0); } }
.dh-page footer { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-top: 12px; font-size: 12px; color: #6b6457; }
.dh-page footer button { font: inherit; font-size: 14px; font-weight: 700; padding: 9px 18px; border-radius: 10px; border: 0; cursor: pointer; color: #fff; background: #1d3b5c; }
.dh-page footer button:focus-visible { outline: 2px solid #ffd479; outline-offset: 2px; }
@media (max-width: 760px) { .dh-page { padding: 14px; } .dh-page table { font-size: 11px; } .dh-page th:nth-child(3), .dh-page td:nth-child(3), .dh-page th:nth-child(4), .dh-page td:nth-child(4) { display: none; } }
@media (prefers-reduced-motion: reduce) { .dh-sig.write span { animation: none; clip-path: none; } }
/* (k4, the chair flight in the training device room: the radio and the task panel alone, the flight's own hidden) */
#fhud.k4 > :not(.fh-left):not(.fh-right), #fhud.k4 .fh-left > :not(.dh-task), #fhud.k4 .fh-right > :not(.dh-radio) { display: none !important; }
#fhud .fh-ao button.script { box-shadow: inset 0 0 0 2px #f2b632; }
#fhud .fh-ao button.script::after { content: '台本'; margin-left: auto; padding: 0 6px; border-radius: 4px; font-size: 11px; color: #1b1f22; background: #f2b632; }
#fhud .dh-why { margin-top: 4px; padding: 5px 8px; border-radius: 6px; font-size: 12.5px; color: #e8f0fa; background: rgba(95, 212, 255, .12); border-left: 3px solid #5fd4ff; }
`;
import { landingHistory, landingStats, sparkline } from '../flight/analysis.js';
const WHO = { ATIS: 'ATIS', GND: 'GND', TWR: 'TWR', DEP: 'DEP', APP: 'APP', P: 'あなた' };
const STATION = { ATIS: 'LAB ATIS', GND: 'LAB Ground', TWR: 'LAB Tower', DEP: 'LAB Departure', APP: 'LAB Approach', OPS: '操作（COM1・高度計・トランスポンダー）' };

export function createDayHUD({ doc = document, settings = null } = {}) {
  if (!doc.getElementById('dhud-css')) { const st = doc.createElement('style'); st.id = 'dhud-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const make = (tag, cls, text) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const put = (p, ...k) => { for (const c of k) p.appendChild(c); return p; };
  const kbd = (k) => make('kbd', '', k);
  const fhud = doc.getElementById('fhud');
  const left = fhud && fhud.querySelector('.fh-left'), right = fhud && fhud.querySelector('.fh-right');
  const last = new WeakMap();
  const same = (n, v) => { if (last.get(n) === v) return true; last.set(n, v); return false; };

  // ---- the task panel
  const task = make('section', 'fh-panel dh-task'); task.setAttribute('aria-label', '今日の流れ');
  const tK = make('div', 'dh-k'), tH = make('h3'), tFlow = make('div', 'dh-flow'), tP = make('p'), tKeys = make('div', 'dh-keys');
  put(task, tK, tH, tFlow, tP, tKeys); task.hidden = true;
  if (left) left.insertBefore(task, left.firstChild);
  // ---- the checklist
  const check = make('section', 'fh-panel fh-dlg fh-check dh-check'); check.setAttribute('aria-label', 'チェックリスト');
  const cT = make('div', 'fh-dt'), cL = make('ol'), cF = make('div', 'fh-df');
  put(check, cT, cL, cF); check.hidden = true;
  // ---- the radio
  const radio = make('section', 'fh-panel fh-dlg fh-atc dh-radio'); radio.setAttribute('aria-label', '無線');
  const rSt = make('div', 'dh-st'), rStB = make('b'), rStF = make('span');
  put(rSt, rStB, rStF);
  const rLines = make('div', 'dh-lines'), rQ = make('div', 'fh-aq'), rOpts = make('div', 'fh-ao'), rClock = make('div', 'dh-clock'), rClockI = make('i'), rRes = make('div', 'fh-ar');
  const rMic = make('div', 'dh-mic'); rMic.hidden = true; rMic.setAttribute('aria-live', 'polite');   // (M8) the microphone
  put(rClock, rClockI);
  const rWhy = make('div', 'dh-why'); rWhy.hidden = true;           // (k4: the reason, when asked)
  put(radio, rSt, rLines, rQ, rOpts, rMic, rClock, rRes, rWhy); radio.hidden = true;
  if (right) { right.insertBefore(radio, right.firstChild); right.insertBefore(check, right.firstChild); }
  let onRadioPick = null, onCheckClick = null;
  rOpts.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && onRadioPick) onRadioPick(+b.dataset.k); });
  check.addEventListener('click', () => { if (onCheckClick) onCheckClick(); });

  // t: { n, of, title, text, keys: [[key, what]…], flow: [{ lesson, done, cur }…] } | null
  function setTask(t) {
    task.hidden = !t;
    if (!t) return;
    const sig = JSON.stringify(t); if (same(task, sig)) return;
    tK.textContent = t.kicker || ''; tH.textContent = t.title; tP.textContent = t.text || ''; tP.hidden = !t.text;
    tFlow.textContent = '';
    for (const f of t.flow || []) put(tFlow, make('i', [f.done ? 'done' : f.cur ? 'cur' : '', f.lesson ? 'lesson' : ''].join(' ').trim()));
    tKeys.textContent = '';
    for (const [k, w] of t.keys || []) put(tKeys, put(make('span'), kbd(k), doc.createTextNode(w)));
  }
  // c: day.items() | null
  function setChecklist(c, flash = '') {
    check.hidden = !c;
    if (!c) return;
    const sig = `${c.id}:${c.i}:${flash}`; if (same(check, sig)) return;
    cT.textContent = c.title; cL.textContent = '';
    c.items.forEach((it) => {
      const li = make('li', [it.ok ? 'ok' : it.cur ? 'cur' : '', it.confirm ? 'cf' : ''].join(' ').trim());
      put(li, make('b', '', it.name), make('span', '', it.what));
      if (it.cur && it.note) put(li, make('span', 'dh-note', it.note));
      put(cL, li);
    });
    const cur = c.items[c.i];
    cF.className = 'fh-df' + (flash ? ' ng' : '');
    cF.textContent = flash || (cur ? (cur.confirm ? 'Enter：確認した（◇ は目で見て確かめる項目）　Y：教官に任せる' : '操縦席のスイッチやレバーを操作すると、自動で ✓ が付きます　Y：教官に任せる') : '完了');
    const curEl = cL.children[c.i]; if (curEl && curEl.scrollIntoView) curEl.scrollIntoView({ block: 'nearest' });
  }
  // v: atc.view() | null; ja: show the Japanese
  // (M8) mic: the microphone is on (M answers by voice)
  function setRadio(v, { mic = false } = {}) {
    radio.hidden = !v;
    if (!v) return;
    const ja = !settings || settings.get('radioJa') !== false;
    const sig = JSON.stringify([v.id, v.phase, v.lines.length, v.lines.length ? v.lines[v.lines.length - 1].en : '', v.choices.length, v.last && v.last.en, ja, mic, v.script, v.why, v.n]);
    if (!same(radio, sig)) {
      rStB.textContent = STATION[v.station] || v.station; rStF.textContent = v.freq;
      rLines.textContent = '';
      for (const l of v.lines) {
        const d = make('div', 'dh-line' + (l.who === 'P' ? ' p' : ''));
        put(d, make('span', 'w', WHO[l.who] || l.who), make('span', 'en', l.en));
        if (ja && l.ja) put(d, make('span', 'ja', l.ja));
        put(rLines, d);
      }
      rQ.textContent = v.phase === 'choose' ? `${v.q}　1〜3 キーで選ぶ${mic && v.kind !== 'op' ? '・M を押して声で言う' : ''}${v.n ? '・H：なぜ？' : ''}` : v.phase === 'hear' ? '聞いています…' : '';
      rQ.hidden = !rQ.textContent;
      rOpts.textContent = '';
      for (const c of v.choices) {
        const b = Object.assign(make('button', c.k === v.script ? 'script' : ''), { type: 'button', tabIndex: -1 }); b.dataset.k = String(c.k);
        put(rOpts, put(b, make('i', '', String(c.k + 1)), make('span', '', c.en)));
      }
      const L = v.last;
      rRes.hidden = !L || (!L.why && L.ok);
      if (L) { rRes.className = 'fh-ar ' + (L.ok ? 'ok' : 'ng'); rRes.textContent = ''; put(rRes, make('b', '', L.ok ? 'OK。' : 'もう一度。'), doc.createTextNode(L.why || '')); }
      rWhy.hidden = !v.why; rWhy.textContent = v.why ? `なぜ？　${v.why}` : '';
    }
    rClock.hidden = v.phase !== 'choose' || v.clock === false;
    const k = v.time ? Math.max(0, v.timeLeft / v.time) : 0;
    rClockI.style.width = `${(k * 100).toFixed(1)}%`; rClock.classList.toggle('low', k < 0.3);
  }

  // (M8) what the microphone heard: { on (listening), heard, missing: [the right answer's key words not heard], msg } | null
  function setMic(m) {
    const sig = JSON.stringify(m || null); if (same(rMic, sig)) return;
    rMic.hidden = !m;
    if (!m) return;
    rMic.className = 'dh-mic' + (m.on ? ' on' : m.missing && m.missing.length ? ' ng' : '');
    rMic.textContent = '';
    put(rMic, make('b', '', m.on ? 'マイク：聞いています（英語で答えを言ってください）' : 'マイク'));
    if (m.heard) put(rMic, make('span', 'heard', `聞こえた：“${m.heard}”`));
    if (m.missing && m.missing.length) put(rMic, make('span', 'miss', `足りない言葉：${m.missing.join('・')}`));
    if (m.msg) put(rMic, make('span', '', m.msg));
  }

  // ---- the logbook
  const book = make('div', 'dh-book'); book.hidden = true;
  book.setAttribute('role', 'dialog'); book.setAttribute('aria-modal', 'true'); book.setAttribute('aria-label', '航空日誌');
  doc.body.appendChild(book);
  let bookClose = null;
  const fmtH = (h) => h.toFixed(1);
  // entries (career/logbook.js), totals; opts { fresh: the index just written (its signature is written in),
  // onClose, exports: [{ label, onClick }] — extra footer buttons (the last flight's CSV / GPX, when kept) }
  function showLogbook(entries, totals, { fresh = -1, onClose = null, exports: exps = [] } = {}) {
    bookClose = onClose;
    book.textContent = '';
    const page = make('section', 'dh-page');
    const head = put(make('header'), make('h2', '', '航空日誌　PILOT LOGBOOK'), make('small', '', '翔洋航空 フライトアカデミー　訓練生'));
    const tbl = make('table'), thead = make('thead'), tr = make('tr');
    for (const h of ['日付', '機種', '登録記号', '出発 → 到着', '飛行時間', '同乗教育', '単独', '野外', '計器', '双発', '着陸', '課目と評価', '所見', '署名']) put(tr, make('th', '', h));
    put(tbl, put(thead, tr));
    const tb = make('tbody');
    entries.forEach((e, i) => {
      const r = make('tr', i === fresh ? 'new' : '');
      const les = make('td'); for (const l of e.lessons) put(les, put(make('span', 'g', `${l.id} ${l.title}`), make('b', l.passed ? '' : 'c', l.grade)));
      const rem = make('td', '', e.remarks + (e.skipped ? `（移動 約 ${e.skipped} 分は省略）` : ''));
      if (e.endorsement) put(rem, make('div', 'dh-end', `裏書き：${e.endorsement}`));
      const sig = make('td'), s = make('span', 'dh-sig' + (i === fresh ? ' write' : ''));
      put(s, make('span', '', e.sig.name), make('small', '', e.sig.cert)); put(sig, s);
      put(r, make('td', 'n', e.date), make('td', 'nw', e.aircraft), make('td', 'nw', e.reg), make('td', 'nw', `${e.from} → ${e.to}`), make('td', 'n', fmtH(e.total)),
        make('td', 'n', fmtH(e.dual)), make('td', 'n', fmtH(e.solo || 0)), make('td', 'n', fmtH(e.xc || 0)), make('td', 'n', fmtH(e.inst || 0)), make('td', 'n', fmtH(e.me || 0)), make('td', 'n', String(e.landings)), les, rem, sig);
      put(tb, r);
    });
    if (!entries.length) put(tb, put(make('tr'), Object.assign(make('td', '', 'まだ記入はありません。'), { colSpan: 14 })));
    const tf = put(make('tfoot'), put(make('tr'), Object.assign(make('td', '', `合計（${totals.days} 日）`), { colSpan: 4 }), make('td', 'n', fmtH(totals.total)), make('td', 'n', fmtH(totals.dual)), make('td', 'n', fmtH(totals.solo || 0)), make('td', 'n', fmtH(totals.xc || 0)), make('td', 'n', fmtH(totals.inst || 0)), make('td', 'n', fmtH(totals.me || 0)), make('td', 'n', String(totals.landings)), Object.assign(make('td'), { colSpan: 3 })));
    put(tbl, tb, tf);
    // (next wave item 1) the landing analysis history under the book: every recorded touchdown's scatter,
    // sink and centreline, with a one-line trend per measure (only when a landing has been analysed)
    const hist = landingHistory(entries), hs = landingStats(hist);
    let anaSec = null;
    if (hs) {
      anaSec = make('section', 'dh-ana');
      put(anaSec, make('h3', '', '着陸分析の履歴（リプレイ記録から）'),
        make('p', '', `着陸 ${hs.n} 回：接地位置 平均 ${hs.alongMean} m（目標点 300 m・ばらつき σ ${hs.alongSd} m・接地帯内 ${hs.inZonePct}%）／沈下 平均 ${hs.sinkMean} fpm（最大 ${hs.sinkMax}）／センターライン偏差 平均 ${hs.crossAbsMean} m／フロート 平均 ${hs.floatMean} m${hs.gateStablePct == null ? '' : `／500 ft ゲート STABLE ${hs.gateStablePct}%`}`),
        make('p', '', `接地位置の推移 ${sparkline(hist.map(x => x.along))}　沈下の推移 ${sparkline(hist.map(x => x.sink), { invert: true })}　センターラインの推移 ${sparkline(hist.map(x => Math.abs(x.cross || 0)), { invert: true })}`));
    }
    const btn = Object.assign(make('button', '', '閉じる'), { type: 'button' });
    btn.addEventListener('click', () => hideLogbook());
    const foot = put(make('footer'), make('span', '', '飛行時間は 1/10 時間（6 分）単位。訓練所の記録です。'));
    for (const x of exps || []) {
      const b = Object.assign(make('button', '', x.label), { type: 'button' });
      b.addEventListener('click', () => x.onClick());
      put(foot, b);
    }
    put(foot, btn);
    put(page, head, tbl); if (anaSec) put(page, anaSec); put(page, foot); put(book, page);
    book.hidden = false;
    setTimeout(() => btn.focus(), 0);
  }
  function hideLogbook() { if (book.hidden) return; book.hidden = true; const f = bookClose; bookClose = null; if (f) f(); }
  book.addEventListener('keydown', (e) => { if (e.code === 'Escape' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); hideLogbook(); } });

  return {
    setTask, setChecklist, setRadio, setMic, showLogbook, hideLogbook,
    onRadioPick(fn) { onRadioPick = fn; }, onChecklistClick(fn) { onCheckClick = fn; },
    get logbookOpen() { return !book.hidden; },
    hideAll() { setTask(null); setChecklist(null); setRadio(null); setMic(null); },
  };
}
