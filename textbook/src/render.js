// TEXTBOOK — render.js
// Chapters and sections → HTML strings (no DOM here, so the Node tests can run it in vm). The section bodies are
// FLIGHT LAB's (FL.book.html, unchanged); the chapter's end matter (terms, examples, cautions, the check questions,
// the lessons, the sources) is plain text in FLIGHT LAB's data, so it is escaped here (the same as textContent); the
// chapter's 日米の違い table is FLIGHT LAB's own HTML (FL.book.jurTable, drawn from FL.jur and escaped there), and so are
// the section's marks beside its title (FL.book.secMarks: the scope badge, 発展, the provenance line, the line 使う場面
// and the notes on the exams — this page has no test banks, so no 学科テスト in the line; its lessons, summary chapters
// and the road 「JCAB 学科の道」 are its links: page.js) and the chapter's 説明してみよう (FL.book.writtenHtml: its answers
// open with their buttons, page.js) — the same HTML as FLIGHT LAB's.
// Lessons are written as FLIGHT LAB writes them (button[data-lesson]); page.js turns every one into a tag.
// The pages of the book that are not sections — a part's door (FL.book.doorHtml) and the appendix 「JCAB 学科の道」
// (FL.book.jcabRoadHtml, book-gates.js) — are FLIGHT LAB's HTML too: pageHtml('door:p1') / pageHtml('jcab'), opened
// from the contents (button[data-page], not a section: no number, no read mark) and printed in the whole book.
(function (G) {
  'use strict';
  const NOTE = '本文は公開情報に基づく要約と教材の説明です。数値は仮想教材値または出典のある参考値（機体ごとに要確認）。実機訓練・教官・POH/AFM・SOP・航空法規を優先してください。';
  const APP_NOTE = 'この節は FLIGHT LAB（アプリ）の使い方の説明です。このページでは操作できません。';
  const APP_SECTIONS = ['intro.study'];        // and every section of the chapter 'sim'
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function make(FL) {
    const BK = FL.book;
    const flat = () => BK.CHAPTERS.flatMap(c => c.secs.map(s => s.id));
    const isApp = (ch, sec) => ch.id === 'sim' || APP_SECTIONS.includes(sec.id);
    const partOf = ch => BK.PARTS.find(p => p.id === ch.part);
    const lessonTitle = id => { const l = FL.school && FL.school.lesson(id); return l ? l.title : null; };
    const num = (ch, k) => `${ch.n}.${k + 1}`;
    // a deep section (発展: DESIGN 3.2「節のデータ」) has its badge in the contents
    const deepTag = sec => (sec.deep ? ' <span class="tag bk-deep-tag">発展</span>' : '');
    const plainOf = html => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // the chapter's end matter (on its last section)
    function endHtml(ch, quizResults) {
      let s = '<div class="tb-end">';
      if (ch.terms && ch.terms.length) s += '<h3>英語の用語（English terms）</h3><div class="tb-scroll"><table class="terms"><tr><th>English</th><th>日本語</th><th>補足</th></tr>'
        + ch.terms.map(([en, jp, note]) => `<tr><td class="en">${esc(en)}</td><td>${esc(jp)}</td><td class="mute">${esc(note || '')}</td></tr>`).join('') + '</table></div>';
      if (ch.examples && ch.examples.length) s += '<h3>例</h3><ul class="tb-ex">' + ch.examples.map(t => `<li>${esc(BK.fix(t))}</li>`).join('') + '</ul>';
      if (ch.cautions && ch.cautions.length) s += '<h3>注意</h3><ul class="tb-cau">' + ch.cautions.map(t => `<li>${esc(BK.fix(t))}</li>`).join('') + '</ul>';
      if (ch.quiz && ch.quiz.length) {
        s += '<h3>確認問題</h3>';
        ch.quiz.forEach((q, qi) => {
          const name = `q_${ch.id}_${qi}`, key = `${ch.id}.${qi}`, prev = quizResults && quizResults[key];
          s += `<div class="quiz" data-quiz="${esc(key)}"><div><b>問 ${qi + 1}. </b>${esc(BK.fix(q.q))}</div>`
            + q.choices.map((c, k) => `<label class="ch"><input type="radio" name="${esc(name)}" value="${k}"> ${esc(BK.fix(c))}</label>`).join('')
            + `<button type="button" class="tb-check">答え合わせ</button>`
            + (prev != null ? ` <span class="small mute tb-prev">前回：${prev ? '正解' : '不正解'}</span>` : '')
            + '<div class="res" aria-live="polite"></div></div>';
        });
      }
      // 説明してみよう (DESIGN 3.2「章末」): after the check questions (FLIGHT LAB's HTML; no table before the terms')
      if (BK.writtenHtml) s += BK.writtenHtml(ch);
      // the chapter's 日米の違い: the FL.jur items of the boxes in its sections, in reading order (DESIGN 3.2「章末」:
      // drawn from the data; a chapter without a box has none). After the terms: content.test.mjs reads the terms table
      // as the end matter's first table
      const jt = BK.jurTable ? BK.jurTable(ch.id) : '';
      if (jt) s += jt;
      if (ch.lessons && ch.lessons.length) s += '<h3>この章に対応する飛行課目</h3><div class="row tb-lessons">'
        + ch.lessons.map(id => `<button type="button" data-lesson="${esc(id)}">${esc(lessonTitle(id) || id)}</button>`).join('') + '</div>';
      if (ch.refs && ch.refs.length) s += '<h3>出典・参考資料（外部リンク・オンライン時）</h3><ul class="bk-src">'
        + ch.refs.map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.label)}</a>${r.note ? ` — ${esc(r.note)}` : ''}</li>`).join('') + '</ul>';
      return s + '</div>';
    }

    // what the check of a question shows (the same words as FLIGHT LAB)
    function quizResult(ch, qi, k) {
      const q = ch.quiz[qi], ok = k === q.answer;
      return { ok, text: `${ok ? '正解' : '不正解'}（正答：${BK.fix(q.choices[q.answer])}）— ${BK.fix(q.why)}` };
    }

    // one section: the chapter's line, the title, the chapter's English title and summary (first section), the note on
    // FLIGHT LAB's own pages, FLIGHT LAB's body, the end matter (last section), the note under every section
    function sectionHtml(id, { nav = false, quizResults = null, level = 2 } = {}) {
      const x = BK.findSection(id); if (!x) return '';
      const { ch, sec } = x, k = ch.secs.indexOf(sec), last = k === ch.secs.length - 1;
      const h = 'h' + level;
      let s = `<section class="tb-sec" id="${esc(sec.id)}" data-sec-id="${esc(sec.id)}">`;
      s += `<div class="bk-chap">${esc(partOf(ch) ? partOf(ch).title : '')}　／　第 ${ch.n} 章　${esc(ch.t)}（${k + 1} / ${ch.secs.length}）</div>`;
      // the title with the section's marks beside it (DESIGN 3.2「節のデータ」: FLIGHT LAB's HTML, the same as its page's)
      s += `<div class="bk-head"><${h} class="bk-title"><span class="tb-num">${num(ch, k)}</span> ${esc(sec.t)}</${h}>${BK.secMarks ? BK.secMarks(sec) : ''}</div>`;
      if (k === 0 && ch.en) s += `<div class="bk-en">${esc(ch.en)}</div>`;
      if (k === 0 && ch.summary) s += `<p class="tb-summary"><b>この章で学ぶこと：</b>${esc(BK.fix(ch.summary))}</p>`;
      if (isApp(ch, sec)) s += `<p class="tb-appnote" role="note">${esc(APP_NOTE)}</p>`;
      s += `<div class="tb-body">${BK.html(sec)}</div>`;            // FLIGHT LAB's static textbook content (trusted)
      if (last) s += endHtml(ch, quizResults);
      if (nav) {
        const f = flat(), i = f.indexOf(id), prev = f[i - 1], next = f[i + 1], first = ch.secs[0].id;
        const t = sid => { const y = BK.findSection(sid); return `${num(y.ch, y.ch.secs.indexOf(y.sec))} ${esc(y.sec.t)}`; };
        s += '<nav class="tb-pager" aria-label="前後の節">'
          + (prev ? `<button type="button" data-go="${esc(prev)}">← 前の節：${t(prev)}</button>` : '')
          + (k > 0 ? `<button type="button" data-go="${esc(first)}">↑ 第 ${ch.n} 章のはじめへ</button>` : '')
          + (next ? `<button type="button" class="primary" data-go="${esc(next)}">次の節：${t(next)} →</button>` : '')
          + '</nav>';
      }
      s += `<p class="note tb-note">${esc(NOTE)}</p>`;
      return s + '</section>';
    }

    // a page that is not a section: 'door:<part id>' (the part's door) or 'jcab' (the appendix); '' when the book has none
    const PAGE_KEY = /^(?:door:p\d+|jcab)$/;
    function pageBody(key) {
      if (key === 'jcab') return BK.jcabRoadHtml ? BK.jcabRoadHtml() : '';
      const m = /^door:(p\d+)$/.exec(key || '');
      return m && BK.doorHtml ? BK.doorHtml(m[1]) : '';
    }
    function pageHtml(key) {
      if (!PAGE_KEY.test(String(key || ''))) return '';
      const body = pageBody(key); if (!body) return '';
      return `<section class="tb-page-view" data-page-id="${esc(key)}"><div class="bk-chap">${key === 'jcab' ? '付録' : '部の扉'}</div>`
        + `<div class="tb-body">${body}</div><p class="note tb-note">${esc(NOTE)}</p></section>`;
    }
    // the pages the book has now, in the contents' order (the doors under their parts' titles, the appendix at the end)
    const pages = () => [...BK.PARTS.filter(p => p.door && pageBody(`door:${p.id}`)).map(p => `door:${p.id}`), ...(BK.jcabRoadHtml ? ['jcab'] : [])];

    // the whole book on one page (to print): a table of contents, then every chapter (each from a new page)
    function allHtml({ quizResults = null } = {}) {
      let s = '<div class="tb-all"><h1 class="tb-all-title">FLIGHT LAB 教科書（全文）</h1><nav class="tb-all-toc" aria-label="全文の目次">';
      for (const p of BK.PARTS) {
        const chs = BK.CHAPTERS.filter(c => c.part === p.id); if (!chs.length) continue;
        s += `<h2>${esc(p.title)}</h2><ol class="tb-toc-ch">`;
        for (const c of chs) s += `<li><a href="#${esc(c.secs[0].id)}" data-jump="${esc(c.secs[0].id)}">第 ${c.n} 章　${esc(c.t)}</a><ol>`
          + c.secs.map((x, k) => `<li><a href="#${esc(x.id)}" data-jump="${esc(x.id)}">${num(c, k)} ${esc(x.t)}</a>${deepTag(x)}</li>`).join('') + '</ol></li>';
        s += '</ol>';
      }
      s += '</nav>';
      for (const c of BK.CHAPTERS) {
        // a part's door before its first chapter (printed as the part's first page)
        const p = partOf(c);
        if (p && p.door && BK.CHAPTERS.find(x => x.part === p.id) === c) { const d = pageBody(`door:${p.id}`); if (d) s += `<article class="tb-door" data-part="${esc(p.id)}">${d}</article>`; }
        s += `<article class="tb-chapter" data-chapter="${esc(c.id)}"><h2 class="tb-chapter-title">第 ${c.n} 章　${esc(c.t)}</h2>`
          + c.secs.map(x => sectionHtml(x.id, { quizResults, level: 3 })).join('') + '</article>';
      }
      // the appendix pages after the chapters
      if (BK.jcabRoadHtml) s += `<article class="tb-appendix" data-page="jcab">${BK.jcabRoadHtml()}</article>`;
      return s + '</div>';
    }

    // the table of contents (parts → chapters → sections)
    function tocHtml(read, cur) {
      const r = new Set(read || []), page = key => `<button type="button" class="tb-page${key === cur ? ' sel' : ''}" data-page="${esc(key)}"${key === cur ? ' aria-current="true"' : ''}>${key === 'jcab' ? 'JCAB 学科の道' : '扉：この部の目標と読み方'}</button>`;
      let s = '';
      for (const p of BK.PARTS) {
        const chs = BK.CHAPTERS.filter(c => c.part === p.id); if (!chs.length) continue;
        s += `<h3 class="tb-part">${esc(p.title)}</h3>`;
        if (p.door && pageBody(`door:${p.id}`)) s += page(`door:${p.id}`);
        for (const c of chs) {
          s += `<div class="tb-toc-chap"><div class="tb-toc-ct">第 ${c.n} 章　${esc(c.t)}</div>`;
          s += c.secs.map((x, k) => `<button type="button" class="bk-item${r.has(x.id) ? ' done' : ''}${x.id === cur ? ' sel' : ''}" data-go="${esc(x.id)}"${x.id === cur ? ' aria-current="true"' : ''}><span class="bk-num">${num(c, k)}</span><span>${esc(x.t)}${deepTag(x)}</span></button>`).join('');
          s += '</div>';
        }
      }
      if (BK.jcabRoadHtml) s += `<h3 class="tb-appx">付録</h3>${page('jcab')}`;
      return s;
    }

    // what the search looks in: the section's title and body (FL.book.text: the figures' words too), the chapter's
    // English title and summary on its first section, the end matter on its last
    function endText(ch) {
      return [].concat(
        (ch.terms || []).map(t => t.filter(Boolean).join(' ')),
        (ch.examples || []).map(BK.fix), (ch.cautions || []).map(BK.fix),
        (ch.quiz || []).map(q => [q.q, ...q.choices, q.why].map(BK.fix).join(' ')),
        (BK.writtenItems ? BK.writtenItems(ch) : []).map(w => plainOf(w.q + ' ' + w.a)),
        (ch.lessons || []).map(id => lessonTitle(id) || id),
        (ch.refs || []).map(r => r.label + (r.note ? ' ' + r.note : '')),
      ).join(' ');
    }
    function index() {
      const out = [];
      for (const ch of BK.CHAPTERS) ch.secs.forEach((sec, k) => {
        const head = sec.t + ' ' + (k === 0 ? (ch.en || '') + ' ' + BK.fix(ch.summary || '') : '');
        out.push({ id: sec.id, ch, k, body: head + ' ' + BK.text(sec), end: k === ch.secs.length - 1 ? endText(ch) : '' });
      });
      return out;
    }
    function search(q, idx) {
      const f = String(q || '').trim().toLowerCase(); if (!f) return [];
      const hits = [];
      for (const e of idx || index()) {
        const b = e.body.toLowerCase().indexOf(f), n = b < 0 ? e.end.toLowerCase().indexOf(f) : -1;
        if (b < 0 && n < 0) continue;
        const src = b >= 0 ? e.body : e.end, at = b >= 0 ? b : n;
        hits.push({ id: e.id, inEnd: b < 0, snippet: (at > 30 ? '…' : '') + src.slice(Math.max(0, at - 30), at + f.length + 40).trim() + '…' });
      }
      return hits;
    }
    function resultsHtml(q, hits) {
      if (!hits.length) return `<p class="mute small">「${esc(q)}」は見つかりませんでした。</p>`;
      return `<p class="small mute">「${esc(q)}」：${hits.length} 節</p>` + hits.map(hh => {
        const y = BK.findSection(hh.id);
        return `<button type="button" class="bk-item tb-hit" data-go="${esc(hh.id)}" data-q="${esc(q)}"><span class="bk-num">${num(y.ch, y.ch.secs.indexOf(y.sec))}</span><span>${esc(y.sec.t)}${hh.inEnd ? '<span class="tag">章末</span>' : ''}<br><span class="small mute">${esc(hh.snippet)}</span></span></button>`;
      }).join('');
    }

    return { NOTE, APP_NOTE, esc, flat, isApp, lessonTitle, sectionHtml, endHtml, quizResult, pageHtml, pages, allHtml, tocHtml, endText, index, search, resultsHtml };
  }
  G.TB = { make, NOTE, APP_NOTE, esc };
})(globalThis);
