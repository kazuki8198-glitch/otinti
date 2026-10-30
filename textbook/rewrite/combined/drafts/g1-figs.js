// DRAFT (W25, R2) — the figures of the summary chapter 'g1'「第 1 部のまとめ」 (textbook/rewrite/combined/DESIGN.md
// 3.2「部のまとめの章 gN」, 3.3 第 1 部 第 20 章). No product reads this file: it is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/g1-figs.js \
//     textbook/rewrite/combined/drafts/g1.js
// and, when the chapter is registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys;
// the helpers they need are repeated here with the same values as book-figs.js).
//
// What is here (one function per figure; the caption says what to look at):
//   new  g1Map   g1.review — Part 1's four groups of chapters (DESIGN 3.2: 原理と機体／計器・性能・重量／気象と航法の基礎／
//                規則・交信・人間) on the front part's basic quantities, and the way on to Part 2 (Sanford). No number in it.
//   new  g1Jur3  g1.japan — DESIGN 3.4「3 回会わせる」: an item of FL.jur is met in the box of the section where the US number
//                is taught, in the part's summary table, and in Part 7. The number of Part 1 items is read from FL.jur
//                (FL.jur.ofGate('g1')), not written by hand; without FL.jur the line leaves the number out.
// Both on the dark board, viewBox 400 wide, text 12 px or more (DESIGN 5 criterion 16), no word of the FL.terms table
// in the figures' text (so the chapter's first use of a term is in the body, written「正式名（通称、English）」).
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  // the colours and helpers of book-figs.js (same values)
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const box = (x, y, w, h, c, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${c}" fill-opacity="${o.op ?? 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;

  Object.assign(FL.bookFigs, {
    // g1.review — Part 1's four groups on the front part's basic quantities, and the way on to Part 2
    g1Map() {
      let s = T(200, 20, '第 1 部の 4 つのまとまり', { b: 1, fs: 13 });
      // the way on: Part 2
      s += box(70, 32, 260, 30, C.gr, { op: 0.14 }) + T(200, 52, '第 2 部：Sanford・Archer で飛ぶ', { b: 1 });
      s += A(200, 82, 200, 66, C.gr, 2.5);
      // the four groups (DESIGN 3.2)
      const groups = [
        [8, 86, '原理と機体', ['飛行の原理', '機体・エンジン・系統'], C.cy],
        [204, 86, '計器・性能・重さ', ['計器と表示', '性能', '重さと重心'], C.am],
        [8, 172, '気象と航法の基礎', ['空の天気', '航法の基礎'], C.vi],
        [204, 172, '規則・交信・人間', ['米国の規則と空域', '英語の交信', '人間の能力と判断'], C.bl],
      ];
      for (const [x, y, head, lines, c] of groups) {
        s += box(x, y, 188, 78, c) + T(x + 94, y + 20, head, { b: 1, c });
        s += TL(x + 94, y + 40, lines, { lh: 16 });
      }
      // the front part's basic quantities under them
      s += A(200, 278, 200, 256, C.mut, 2.5);
      s += box(8, 282, 384, 54, C.mut, { op: 0.16 }) + T(200, 302, '序部：基本の量', { b: 1 });
      s += T(200, 322, '単位・時刻と方位・速さ・高さ・飛び方と天気の区分', { fs: 12 });
      s += T(200, 356, '問いの 3 分の 1 は序部から、残りは 4 つのまとまりから', { c: C.mut, fs: 12 });
      return svg(400, 366, s, '図：第 1 部の 4 つのまとまり（原理と機体・計器と性能と重さ・気象と航法の基礎・規則と交信と人間）は、序部で学んだ基本の量の上に立ち、第 2 部の Sanford での飛行につながります。この節の問いは、その両方から出します');
    },
    // g1.japan — the three places an item of FL.jur is met (DESIGN 3.4「3 回会わせる」); the count comes from FL.jur
    g1Jur3() {
      const n = FL.jur && typeof FL.jur.ofGate === 'function' ? FL.jur.ofGate('g1').length : 0;
      let s = T(200, 20, '日米の違いに 3 回会う', { b: 1, fs: 13 });
      const steps = [
        [34, '① 章の節の囲み', ['米国の数字を習うその場で、', '日本の数字と並べる'], C.cy],
        [116, '② 部のまとめ（この節）', [n ? `第 1 部の ${n} 項目を、` : '第 1 部の項目を、', 'まとまりごとの表に集める'], C.am],
        [198, '③ 第 7 部', ['日本の決まりの本文で、', '条文と一緒に詳しく学ぶ'], C.vi],
      ];
      for (const [y, head, lines, c] of steps) {
        s += box(20, y, 360, 66, c) + T(36, y + 22, head, { b: 1, c, a: 'start' });
        s += TL(36, y + 42, lines, { a: 'start', lh: 16 });
      }
      s += A(200, 100, 200, 114, C.ink, 2) + A(200, 182, 200, 196, C.ink, 2);
      s += L(20, 278, 380, 278, C.grid, 1);
      s += box(20, 288, 172, 52, C.cy, { op: 0.1 }) + TL(106, 308, ['Sanford で飛ぶとき', '→ 米国の欄'], { lh: 18 });
      s += box(208, 288, 172, 52, C.rd, { op: 0.1 }) + TL(294, 308, ['日本の学科と日本の空', '→ 日本の欄'], { lh: 18 });
      s += T(200, 362, '数字はデータから描く。〔要確認〕は推測で埋めない', { c: C.mut });
      return svg(400, 372, s, `図：日米の違いには 3 回会います。章の節の囲みで米国の数字と並べて見て、部のまとめの表で集め直し、第 7 部の日本の本文で詳しく学びます。${n ? `第 1 部の項目は ${n} です。` : ''}Sanford で飛ぶときは米国の欄、日本の学科と日本の空では日本の欄で答えます`);
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
