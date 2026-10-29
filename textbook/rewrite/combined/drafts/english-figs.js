// DRAFT (W10, R1) — the figures of the front part's chapter 'english'「英語で学ぶ準備」 (textbook/rewrite/combined/DESIGN.md
// 3.3 序部 第 3 章). No product reads this file: it is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/english-figs.js textbook/rewrite/combined/drafts/english.js
// and, when the chapter is registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys,
// same helpers there: C, svg, T, L, TL, BOX). Until then the few helpers they need are repeated here (same values as
// book-figs.js and drafts/basics-figs.js).
//  - enTriple (en.terms): one part, three names. The names are read from the table of terms (FL.terms, book-terms.js:
//    the entry 'aileron') when the figure is drawn, so the figure follows the table; without FL.terms (a product that
//    does not load it: CADET, which leaves the chapter out anyway) it falls back to the same three names.
//  - enTalk (en.class): three places, three ways of speaking (the class, the instructor in the cockpit, ATC on the radio).
//    The radio words are the standard words of the FAA Pilot/Controller Glossary and the UK CAA CAP 413 (SAY AGAIN,
//    UNABLE); the other sentences are examples of plain English, not rules.
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  // the colours and helpers of book-figs.js (same values)
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const BOX = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const PLANE = '#dfe6ee', PLANE2 = '#9fb3c8';

  // the three names of one entry of FL.terms (the official name, the first common name, the English)
  const names = id => {
    const e = FL.terms && typeof FL.terms.byId === 'function' ? FL.terms.byId(id) : null;
    if (e) return { formal: e.formal, common: e.common[0] || '', en: e.en };
    return { aileron: { formal: '補助翼', common: 'エルロン', en: 'aileron' } }[id];
  };

  Object.assign(FL.bookFigs, {
    // en.terms — one part (the aileron, coloured) and its three names: the official name (JCAB's written tests and the
    // law), the common name (everyday talk, katakana material) and the English (FAA material, the English classes)
    enTriple() {
      const n = names('aileron');
      // the right wing seen from above (leading edge at the top), the aileron at the outer trailing edge
      const wing = `<path d="M64 62 L336 62 L352 70 L352 104 L64 104 Z" fill="${PLANE}"/>`
        + `<rect x="40" y="58" width="26" height="50" rx="6" fill="${PLANE2}"/>`
        + `<path d="M262 104 L352 104 L352 92 L262 92 Z" fill="${C.am}"/>`
        + `<path d="M110 104 L186 104 L186 94 L110 94 Z" fill="${PLANE2}"/>`;
      let s = T(200, 18, '色を付けた部分の名前（翼を上から見た図）', { c: C.mut, fs: 12 });
      s += wing + T(53, 50, '胴体', { c: C.mut, fs: 12 }) + T(200, 87, '主翼', { c: '#0b1422', fs: 12, b: 1 });
      // three boxes and their lines from the coloured part
      const bx = [
        { x: 8, c: C.cy, h: '正式名', name: n.formal, sub: ['日本の学科試験', 'と法令の書き方'] },
        { x: 139, c: C.gr, h: '通称', name: n.common, sub: ['ふだんの会話や', 'カタカナの資料'] },
        { x: 270, c: C.vi, h: '英語', name: n.en, sub: ['英語の授業と', '米国の FAA の資料'] },
      ];
      const top = 150, w = 122, hgt = 94;
      for (const b of bx) {
        s += L(307, 104, b.x + w / 2, top, b.c, 1.5, '4 3');
        s += BOX(b.x, top, w, hgt, b.c);
        s += T(b.x + w / 2, top + 20, b.h, { c: b.c, fs: 12, b: 1 });
        s += T(b.x + w / 2, top + 44, esc(b.name), { c: C.ink, fs: 16, b: 1 });
        s += TL(b.x + w / 2, top + 64, b.sub, { c: C.mut, fs: 12, lh: 16 });
      }
      s += `<circle cx="307" cy="104" r="4" fill="${C.am}"/>`;
      const cap = `図：1 つのものに 3 つの名前。色を付けた部分は、日本の学科試験と法令では「${esc(n.formal)}」、ふだんの言い方では「${esc(n.common)}」、英語の授業では「${esc(n.en)}」です。この本は、各章で初めて出るところで ${esc(n.formal)}（${esc(n.common)}、${esc(n.en)}）と書きます`;
      return svg(400, 252, s, cap);
    },

    // en.class — three places and the way of speaking in each (examples), from the class to the radio
    enTalk() {
      const rows = [
        { c: C.cy, place: ['授業', '（教室）'], how: ['ふつうの英語', 'ていねいに'], ex: ['“Could you say that', 'again, please?”'] },
        { c: C.gr, place: ['操縦席で', '教官と'], how: ['短く', 'はっきり'], ex: ['“Sorry, say again?”', '“Can you show me?”'] },
        { c: C.am, place: ['無線で', '管制と'], how: ['意味の決まった', '言葉（標準用語）'], ex: ['“Say again.”', '従えないときは “Unable.”'] },
      ];
      let s = T(62, 18, '相手と場面', { c: C.mut, fs: 12 }) + T(176, 18, '話し方', { c: C.mut, fs: 12 }) + T(314, 18, '聞き直す言い方の例', { c: C.mut, fs: 12 });
      const y0 = 28, hgt = 64, gap = 8;
      rows.forEach((r, i) => {
        const y = y0 + i * (hgt + gap);
        s += BOX(8, y, 108, hgt, r.c) + TL(62, y + 27, r.place, { c: r.c, fs: 13, b: 1, lh: 18 });
        s += BOX(122, y, 108, hgt, r.c) + TL(176, y + 27, r.how, { c: C.ink, fs: 12, lh: 18 });
        s += BOX(236, y, 156, hgt, r.c) + TL(314, y + 27, r.ex.map(esc), { c: C.ink, fs: 12, lh: 18 });
      });
      const yb = y0 + 3 * (hgt + gap) + 6;
      s += T(200, yb + 12, '下へ行くほど短く、使う言葉が決まっている', { c: C.mut, fs: 12 });
      return svg(400, yb + 22, s, '図：3 つの場面と話し方の例。授業ではふつうの英語でていねいに、操縦席の教官には短くはっきり、管制との無線では意味の決まった言葉（標準用語）で話します。どの場面でも、分からないときは推測せずに聞き直します');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
