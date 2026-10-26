// TEXTBOOK — page.js
// The DOM: the table of contents, one section at a time (#節ID) or the whole book (#all), the search (marks on the
// shown text nodes only), FLIGHT LAB's lesson buttons turned into tags, the calculators (FL.book.wire), the check
// questions, the read marks and the settings (this browser's localStorage only, keys "textbook.*"), the print.
(function () {
  'use strict';
  const FL = globalThis.FL, BK = FL.book, R = globalThis.TB.make(FL);
  const $ = id => document.getElementById(id);
  const view = $('tbView'), toc = $('tbToc'), search = $('tbSearch'), root = document.documentElement;
  const FIRST = BK.CHAPTERS[0].secs[0].id, TOTAL = R.flat().length;

  // ------------------------------------------------------------ saved in this browser only (may be refused)
  const KEY = { read: 'textbook.read', quiz: 'textbook.quiz', prefs: 'textbook.prefs', last: 'textbook.last' };
  function load(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* not allowed: keep it for this visit */ } }
  const S = {
    read: (a => Array.isArray(a) ? a.filter(id => BK.findSection(id)) : [])(load(KEY.read, [])),
    quiz: (o => o && typeof o === 'object' ? o : {})(load(KEY.quiz, {})),
    prefs: Object.assign({ theme: 'auto', size: 16 }, load(KEY.prefs, {})),
    last: load(KEY.last, null),
    mode: 'sec', cur: null, idx: null,
  };

  // ------------------------------------------------------------ the look: light / dark, the text size
  const THEMES = ['auto', 'light', 'dark'], THEME_JP = { auto: '自動', light: '明るい', dark: '暗い' };
  function applyPrefs() {
    if (!THEMES.includes(S.prefs.theme)) S.prefs.theme = 'auto';
    if (S.prefs.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = S.prefs.theme;
    $('tbTheme').textContent = '表示：' + THEME_JP[S.prefs.theme];
    S.prefs.size = Math.min(22, Math.max(13, +S.prefs.size || 16));
    root.style.setProperty('--fs', S.prefs.size + 'px');
  }
  $('tbTheme').addEventListener('click', () => { S.prefs.theme = THEMES[(THEMES.indexOf(S.prefs.theme) + 1) % THEMES.length]; applyPrefs(); save(KEY.prefs, S.prefs); });
  $('tbSmaller').addEventListener('click', () => { S.prefs.size--; applyPrefs(); save(KEY.prefs, S.prefs); });
  $('tbBigger').addEventListener('click', () => { S.prefs.size++; applyPrefs(); save(KEY.prefs, S.prefs); });

  // ------------------------------------------------------------ what only FLIGHT LAB (the app) has
  // a lesson button (in the "try it in the simulator" boxes and the chapter's lessons) becomes this page's own button:
  // it opens the lesson's goal, reason and standard (FL.school) and a link to FLIGHT LAB, where the lesson is flown
  const APP_URL = '../../flight-lab/outputs/FLIGHT-LAB.html';      // from textbook/outputs/ in the repository
  function lessonTag(id) {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'bk-lesson';
    t.dataset.lessonId = id;
    t.setAttribute('aria-expanded', 'false');
    t.textContent = `FLIGHT LAB の課目『${R.lessonTitle(id) || id}』`;
    return t;
  }
  function lessonInfo(id) {
    const l = FL.school && FL.school.lesson(id), box = document.createElement('div');
    box.className = 'bk-lesson-info';
    const row = (k, v) => { if (!v) return; const p = document.createElement('p'), b = document.createElement('b'); b.textContent = k + '：'; p.append(b, v); box.append(p); };
    if (l) { row('目的', l.goal); row('なぜ', l.why); row('合格の目安', l.std); }
    const p = document.createElement('p'), a = document.createElement('a');
    p.className = 'small';
    a.href = APP_URL; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'FLIGHT LAB（シミュレータ）を開く';
    p.append(a, '　この課目は FLIGHT LAB のメニュー「課程表」から始めます（このページでは飛べません）。');
    box.append(p);
    return box;
  }
  function toggleLesson(t) {
    const next = t.nextElementSibling;
    if (next && next.classList.contains('bk-lesson-info')) { next.remove(); t.setAttribute('aria-expanded', 'false'); return; }
    t.after(lessonInfo(t.dataset.lessonId)); t.setAttribute('aria-expanded', 'true');
  }
  function toTags(el) { for (const b of el.querySelectorAll('button[data-lesson]')) b.replaceWith(lessonTag(b.dataset.lesson)); }
  // wide tables scroll sideways (the weight-and-balance calculator scrolls as a whole: .bk-calc)
  function wrapTables(el) {
    for (const t of el.querySelectorAll('table')) {
      if (t.closest('.tb-scroll, .bk-calc')) continue;
      const w = document.createElement('div'); w.className = 'tb-scroll';
      t.replaceWith(w); w.append(t);
    }
  }
  function enhance(el) { toTags(el); wrapTables(el); if (BK.wire) BK.wire(el); }

  // ------------------------------------------------------------ search marks: the shown text nodes only
  const SKIP = 'svg, button, input, textarea, select, option, script, style, mark, .tb-pager';
  function mark(el, q) {
    const f = String(q || '').trim(); if (!f) return 0;
    const src = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), re = new RegExp(src, 'gi'), has = new RegExp(src, 'i');
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentElement && n.parentElement.closest(SKIP)) ? NodeFilter.FILTER_REJECT : (has.test(n.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
    });
    const nodes = []; for (let n = w.nextNode(); n; n = w.nextNode()) nodes.push(n);
    let count = 0;
    for (const n of nodes) {
      const frag = document.createDocumentFragment(), s = n.data; let at = 0;
      re.lastIndex = 0;
      for (let m = re.exec(s); m; m = re.exec(s)) {
        if (m.index > at) frag.append(s.slice(at, m.index));
        const mk = document.createElement('mark'); mk.className = 'tb-mark'; mk.textContent = m[0]; frag.append(mk);
        at = m.index + m[0].length; count++;
      }
      if (at < s.length) frag.append(s.slice(at));
      n.replaceWith(frag);
    }
    return count;
  }
  // a hit in the chapter's end matter opens its last section (search() says which section); a hit inside a closed
  // "考えてみよう" opens it
  function showMarks(el) {
    const ms = el.querySelectorAll('mark.tb-mark');
    for (const m of ms) { const d = m.closest('details'); if (d) d.open = true; }
    if (ms[0]) ms[0].scrollIntoView({ block: 'center' });
  }

  // ------------------------------------------------------------ the table of contents and the search results
  function drawToc() {
    const q = search.value.trim();
    if (q) {
      if (!S.idx) S.idx = R.index();
      toc.innerHTML = R.resultsHtml(q, R.search(q, S.idx));
    } else {
      toc.innerHTML = R.tocHtml(S.read, S.mode === 'sec' ? S.cur : null);
      const sel = toc.querySelector('.bk-item.sel'), side = $('tbNav');
      if (sel && side.scrollHeight > side.clientHeight) {
        const top = sel.offsetTop - side.offsetTop;
        if (top < side.scrollTop || top > side.scrollTop + side.clientHeight - 40) side.scrollTop = top - side.clientHeight / 3;
      }
    }
    $('tbProg').textContent = `読んだ節 ${S.read.length} / ${TOTAL}`;
  }
  search.addEventListener('input', drawToc);
  search.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = toc.querySelector('.tb-hit'); if (b) b.click(); } });
  $('tbReset').addEventListener('click', () => { if (!confirm('読んだ印（✓）をすべて消しますか？')) return; S.read = []; save(KEY.read, S.read); drawToc(); });
  $('tbTocBtn').addEventListener('click', () => {
    const hide = !document.body.classList.contains('tb-toc-hidden');
    document.body.classList.toggle('tb-toc-hidden', hide);
    $('tbTocBtn').setAttribute('aria-expanded', String(!hide));
  });

  // ------------------------------------------------------------ the views (never both in the DOM: ids and radio names)
  function setHash(h) { if (location.hash !== '#' + h) history.replaceState(null, '', '#' + h); }
  function showSection(id, { q = '', scroll = true } = {}) {
    if (!BK.findSection(id)) id = FIRST;
    S.mode = 'sec'; S.cur = id;
    document.body.classList.remove('tb-mode-all');
    $('tbAll').setAttribute('aria-pressed', 'false'); $('tbAll').textContent = '全文';
    view.innerHTML = R.sectionHtml(id, { nav: true, quizResults: S.quiz });
    enhance(view);
    if (!S.read.includes(id)) { S.read.push(id); save(KEY.read, S.read); }
    S.last = id; save(KEY.last, id);
    setHash(id);
    drawToc();
    if (q && mark(view, q)) showMarks(view);
    else if (scroll) $(id).scrollIntoView({ block: 'start' });
  }
  function showAll() {
    S.mode = 'all';
    document.body.classList.add('tb-mode-all');
    $('tbAll').setAttribute('aria-pressed', 'true'); $('tbAll').textContent = '1 節ずつ';
    view.innerHTML = R.allHtml({ quizResults: S.quiz });
    enhance(view);
    setHash('all');
    drawToc();
    window.scrollTo(0, 0);
  }
  function go(id, q) {
    if (S.mode === 'all' && !q) { const el = $(id); if (el) { el.scrollIntoView({ block: 'start' }); return; } }
    showSection(id, { q });
  }
  function route(first) {
    let h = ''; try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { h = ''; }
    if (h === 'all') return showAll();
    if (BK.findSection(h)) return showSection(h, { scroll: !first });
    showSection(BK.findSection(S.last) ? S.last : FIRST, { scroll: false });
  }
  window.addEventListener('hashchange', () => route(false));
  $('tbAll').addEventListener('click', () => { if (S.mode === 'all') showSection(S.cur || S.last || FIRST); else showAll(); });

  // ------------------------------------------------------------ the clicks (one listener: the views are redrawn)
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-go], button[data-sec], a[data-jump], .tb-check, button.bk-lesson'); if (!t) return;
    if (t.matches('button.bk-lesson')) { toggleLesson(t); return; }
    if (t.matches('a[data-jump]')) { e.preventDefault(); go(t.dataset.jump); return; }
    if (t.matches('[data-go]')) { go(t.dataset.go, t.dataset.q || ''); return; }
    if (t.matches('button[data-sec]')) { go(t.dataset.sec); return; }
    // a check question
    const box = t.closest('.quiz'), key = box.dataset.quiz, dot = key.lastIndexOf('.');
    const ch = BK.CHAPTERS.find(c => c.id === key.slice(0, dot)), qi = +key.slice(dot + 1);
    const res = box.querySelector('.res'), sel = box.querySelector('input[type="radio"]:checked');
    if (!sel) { res.className = 'res'; res.textContent = '選択肢を選んでください。'; return; }
    const r = R.quizResult(ch, qi, +sel.value);
    res.className = 'res ' + (r.ok ? 'ok' : 'ng'); res.textContent = r.text;
    S.quiz[key] = r.ok; save(KEY.quiz, S.quiz);
  });

  // ------------------------------------------------------------ print: the "考えてみよう" boxes open
  let opened = [];
  window.addEventListener('beforeprint', () => { opened = [...view.querySelectorAll('details:not([open])')]; for (const d of opened) d.open = true; });
  window.addEventListener('afterprint', () => { for (const d of opened) d.open = false; opened = []; });

  applyPrefs();
  route(true);
  globalThis.__tb = { ready: true, get mode() { return S.mode; }, get cur() { return S.cur; } };
})();
