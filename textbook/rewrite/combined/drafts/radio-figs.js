// DRAFT (W19, R2) — the figures of Part 1's chapters 'radio1'〜'radio5'「英語の交信」 (textbook/rewrite/combined/DESIGN.md
// 3.3 第 1 部 第 13〜17 章). No product reads this file: it is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/radio-figs.js \
//     textbook/rewrite/combined/drafts/radio1-5.js
// and, when the chapters are registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys,
// same helpers there: C, svg, T, L, A, P, TL, BOX, NFN). Until then the few helpers they need are repeated here.
//
// What is here (one function per figure; the caption says what to look at, never where it was redrawn from).
//   REDRAWN readbackLoop comm.readback — book-figs.js's FIG.readbackLoop under the SAME name: the drawing and the call are
//                        unchanged (radio.js gnd1's taxi instruction; AIM 4-4-7 airborne, AIM 4-3-18 on the ground); the
//                        third bubble now names the controller's check ヒアバック（hearback）and says what the controller
//                        must make sure of (JO 7110.65 2-4-3: "Ensure that items read back are correct"), and the caption
//                        says the pilot listens to the answer after the readback (kiso09.19). When registered, it
//                        replaces the function in book-figs.js.
//   new  runwayEntry     comm.runway — a taxiway A meeting runway 36/18 (plan view, 模式図): the runway holding position
//                        marking (two solid and two dashed yellow lines, the solid ones on the side where the aircraft
//                        holds: AIM 2-3-5), the runway holding position sign (red, white "18-36": the threshold of runway
//                        18 to the left, of 36 to the right, seen from the hold line: AIM 2-3-8) with the taxiway location
//                        sign (black, yellow "A": AIM 2-3-9), and what each instruction lets the pilot do: a taxi
//                        instruction to the runway → up to the hold line (AIM 4-3-18), crossing the line → a clearance
//                        to enter / cross / take off (14 CFR 91.129(i), AIM 4-3-18); the red runway entrance lights (REL)
//                        at the hold line → stop, call ATC (AIM 2-1-6). Content: kiso09.21; AIM 2-3-5・2-3-8・2-3-9・
//                        2-1-6・4-3-18.
//   new  xpdrCodes       comm.xpdr — a transponder face drawn plainly (code 4271, the mode knob OFF・SBY・ON・ALT・TST and
//                        the IDENT button), the four codes of AIM 4-1-20・6-2-2・6-3-4・6-4-2 (1200 VFR, 7500, 7600, 7700) and the
//                        change 2700 → 7200 made through 2200, not through 7700 (AIM 4-1-20). A drawing, not a photo of an
//                        instrument screen (STYLE「写真」); the photo ch04-photo5 comes after it.
// Every number drawn here is one the text gives with its source (radio.claims.json); text ≥ 12 (≥ 10 px at 390 px).
// Revised by revise-radio (2026-10-30): readbackLoop's chips no longer touch the viewBox edge and say「いつも復唱するもの
// （AIM）」(AIM says "should always read back"); runwayEntry's REL lights start at the hold line (AIM 2-1-6), the arrow from
// ① goes above and right of the signs, the enhanced taxiway centerline is drawn (AIM 2-3-4) and the sign note says
// 進入端 (threshold, AIM 2-3-8); xpdrCodes says the mode knob is normally ALT, on the ground too (AIM 4-1-20).
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  // the colours and helpers of book-figs.js (same values)
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''} ${o.rot ? `transform="rotate(${o.rot} ${x} ${y})"` : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3, dash = '') => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w, dash) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const P = (pts, c, w = 2, fill = 'none', dash = '') => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}" stroke="${c}" stroke-width="${w}" fill="${fill}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const NFN = (x, y, a = 'end') => T(x, y, '模式図・NOT FOR NAVIGATION', { c: C.am, fs: 12, a, b: 1 });

  Object.assign(FL.bookFigs, {
    // ---------------------------------------------------------------- comm.readback — REDRAWN (same name as book-figs.js)
    readbackLoop() {
      // the readback loop with radio.js gnd1's taxi instruction, and what must be read back (AIM 4-4-7 airborne, AIM 4-3-18 on the ground)
      const bub = (x, y, w, h, c, head, lines) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`
        + T(x + 12, y + 20, head, { c, b: 1, a: 'start', fs: 13 }) + TL(x + 12, y + 40, lines, { c: C.ink, a: 'start', fs: 12, lh: 17 });
      let s = bub(36, 8, 356, 66, C.cy, '① 管制官の指示', ['Archer Seven Lima Alpha, runway three six,', 'taxi via Alpha, hold short of taxiway Charlie.']);
      s += bub(36, 88, 356, 66, C.gr, '② あなたの復唱', ['Runway three six, taxi via Alpha,', 'hold short of Charlie, Archer 7LA.']);
      s += `<rect x="36" y="168" width="356" height="62" rx="10" fill="${C.am}" fill-opacity="0.12" stroke="${C.am}" stroke-width="1.5"/>` + T(48, 188, '③ 管制官が聞いて確かめる（ヒアバック）', { c: C.am, b: 1, a: 'start', fs: 13 });
      s += T(48, 210, '合っている → 次へ', { c: C.gr, a: 'start', fs: 12 }) + T(196, 210, '違う → 管制官が直す（① へ）', { c: C.rd, a: 'start', fs: 12 });
      s += A(214, 74, 214, 86, C.ink, 2) + A(214, 154, 214, 166, C.ink, 2);
      // back to ① when it was wrong
      s += P([[36, 220], [18, 220], [18, 40]], C.rd, 2, 'none', '5 4') + A(18, 40, 34, 40, C.rd, 2);
      // what must be read back
      s += T(8, 256, 'いつも復唱するもの（AIM）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      // a row of rounded labels, laid out left to right (width from the text: CJK ≈ 12 px, latin ≈ 7 px at size 12)
      const chips = (x, y, list, c) => list.map(tx => { const w = [...tx].reduce((a, ch) => a + (ch > '　' ? 12 : 7), 14), r = `<rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="${c}" fill-opacity="0.18" stroke="${c}"/>` + T(x + w / 2, y + 15, tx, { c: C.ink, fs: 12 }); x += w + 4; return r; }).join('');
      s += T(8, 282, '空中', { c: C.cy, b: 1, a: 'start', fs: 12 }) + T(8, 298, 'AIM 4-4-7', { c: C.mut, a: 'start', fs: 12 });
      s += chips(80, 268, ['高度', '高度の制限', '針路（vector）', '滑走路の指定'], C.cy);
      s += T(8, 330, '地上', { c: C.gr, b: 1, a: 'start', fs: 12 }) + T(8, 346, 'AIM 4-3-18', { c: C.mut, a: 'start', fs: 12 });
      s += chips(80, 316, ['滑走路の指定', '滑走路に入る許可'], C.gr) + chips(80, 346, ['滑走路の hold short', 'line up and wait'], C.gr);
      s += T(8, 392, '“Roger” だけ → 管制官「read back hold instructions」', { c: C.rd, a: 'start', fs: 12 });
      return svg(400, 404, s, '図：復唱の輪。指示を言われた順に復唱し、管制官が聞いて確かめます（ヒアバック）。復唱したら、管制官の返事を最後まで聞きます。下は、AIM がいつも復唱するよう求めているもの。hold short に Roger だけで答えると、管制官は復唱を求めます（JO 7110.65 3-7-2）');
    },

    // ---------------------------------------------------------------- comm.runway (new) — the hold line and what each word allows
    runwayEntry() {
      // the runway (north up): 36 at its south end, 18 at its north end
      let s = `<rect x="282" y="8" width="62" height="176" fill="#26303d" stroke="${C.mut}" stroke-width="1.2"/>`;
      s += L(313, 34, 313, 158, C.ink, 2, '12 9');
      s += T(313, 176, '36', { c: C.ink, fs: 15, b: 1 }) + T(313, 18, '18', { c: C.ink, fs: 15, b: 1, rot: 180 });
      // taxiway A from the west, its yellow centreline
      s += `<rect x="8" y="118" width="274" height="40" fill="#1e2733"/>` + L(8, 138, 282, 138, C.am, 2);
      // the enhanced taxiway centerline: dashes on both sides of the centreline before the hold line (AIM 2-3-4)
      s += L(156, 133, 238, 133, C.am, 1.5, '6 4') + L(156, 143, 238, 143, C.am, 1.5, '6 4');
      // the runway holding position marking: two solid lines (the side where the aircraft holds) and two dashed lines
      s += L(240, 118, 240, 158, C.am, 2.6) + L(245, 118, 245, 158, C.am, 2.6) + L(251, 118, 251, 158, C.am, 2.6, '5 4') + L(256, 118, 256, 158, C.am, 2.6, '5 4');
      // the signs on the left of the taxiway (north side): taxiway location sign "A" (outboard) and runway holding position sign "18-36"
      s += `<rect x="160" y="84" width="24" height="24" fill="#000" stroke="${C.am}" stroke-width="1.5"/>` + T(172, 101, 'A', { c: C.am, fs: 14, b: 1 });
      s += `<rect x="186" y="84" width="54" height="24" fill="#c8102e"/>` + T(213, 101, '18-36', { c: '#ffffff', fs: 13, b: 1 });
      s += L(212, 108, 212, 116, C.mut, 1.5);
      // the runway entrance lights at the hold line (red when the runway is busy)
      for (const x of [256, 264, 272, 280]) s += `<circle cx="${x}" cy="138" r="3" fill="${C.rd}"/>`;
      // the airplane taxiing east on A
      s += L(84, 138, 126, 138, C.cy, 4) + L(108, 122, 108, 154, C.cy, 4) + L(88, 130, 88, 146, C.cy, 3);
      s += T(60, 110, '誘導路 A', { c: C.ink, fs: 12, b: 1 });
      // what each part means
      s += T(14, 30, '① 地上滑走の指示', { c: C.gr, fs: 13, b: 1, a: 'start' }) + T(14, 48, '（runway 36, taxi via A）', { c: C.gr, fs: 12, a: 'start' });
      s += T(14, 66, '→ 停止線の手前まで', { c: C.gr, fs: 12, a: 'start' });
      s += L(132, 62, 246, 62, C.gr, 2) + A(246, 62, 246, 114, C.gr, 2);
      s += T(14, 204, '② 停止線を越える → 入る・横切る・離陸の許可が要る', { c: C.am, fs: 12, a: 'start' });
      s += T(14, 224, '実線の側で止まる。機体のどこも線を越えない', { c: C.ink, fs: 12, a: 'start' });
      s += T(14, 244, '赤地に白：滑走路の標識（左に 18、右に 36 の進入端）', { c: C.ink, fs: 12, a: 'start' });
      s += T(14, 264, '黒地に黄：いま居る誘導路（A）', { c: C.ink, fs: 12, a: 'start' });
      s += T(14, 284, '停止線の赤い灯（REL）がついたら、止まって管制に確かめる', { c: C.rd, fs: 12, a: 'start' });
      s += T(14, 304, '中心線の両側の黄色の破線：停止線が近い合図', { c: C.am, fs: 12, a: 'start' });
      s += NFN(392, 332);
      return svg(400, 342, s, '図：誘導路が滑走路に出会う所（模式図）。地上滑走の指示で行けるのは停止線の手前までです。黄色の 4 本の線の実線の側で止まり、入る・横切る許可をもらうまで越えません（AIM 2-3-5・4-3-18）。赤地に白の標識は滑走路の名前、黒地に黄は今いる誘導路です（AIM 2-3-8・2-3-9）。中心線の両側の破線は、停止線が近い合図です（AIM 2-3-4）');
    },

    // ---------------------------------------------------------------- comm.xpdr (new) — the transponder and its four codes
    xpdrCodes() {
      // a plain transponder face: the code window, the mode knob, the IDENT button
      let s = `<rect x="10" y="12" width="210" height="96" rx="8" fill="#141d2a" stroke="${C.mut}" stroke-width="1.5"/>`;
      s += `<rect x="24" y="28" width="96" height="36" rx="4" fill="#06100a" stroke="${C.gr}" stroke-width="1"/>` + T(72, 54, '4271', { c: C.gr, fs: 20, b: 1 });
      s += T(72, 82, 'コード（4 けた）', { c: C.mut, fs: 12 });
      s += `<circle cx="160" cy="48" r="20" fill="#0b1422" stroke="${C.ink}" stroke-width="1.5"/>` + L(160, 48, 172, 34, C.am, 3);
      s += T(160, 84, 'OFF・SBY・ON', { c: C.mut, fs: 12 }) + T(160, 100, 'ALT・TST', { c: C.mut, fs: 12 });
      s += `<rect x="190" y="22" width="24" height="16" rx="3" fill="${C.cy}" fill-opacity="0.25" stroke="${C.cy}"/>` + T(202, 34, 'ID', { c: C.cy, fs: 12, b: 1 });
      s += T(115, 124, 'Ident と言われたときだけ ID を押す', { c: C.cy, fs: 12 });
      // the four codes
      const rows = [['1200', 'VFR（指定がないとき）', C.gr], ['7500', '不法な干渉（ハイジャック）', C.rd], ['7600', '無線の故障', C.am], ['7700', '緊急', C.rd]];
      rows.forEach(([code, what, c], i) => {
        const y = 150 + i * 26;
        s += `<rect x="10" y="${y - 16}" width="62" height="22" rx="4" fill="${c}" fill-opacity="0.16" stroke="${c}"/>` + T(41, y, code, { c, fs: 14, b: 1 });
        s += T(82, y, what, { c: C.ink, fs: 13, a: 'start' });
      });
      // changing 2700 → 7200: through 2200, not through 7700
      s += T(236, 30, 'コードを変えるとき', { c: C.ink, fs: 13, b: 1, a: 'start' });
      s += T(236, 52, '例：2700 → 7200', { c: C.ink, fs: 12, a: 'start' });
      s += T(250, 78, '2700', { c: C.ink, fs: 13, b: 1, a: 'start' }) + A(288, 74, 314, 74, C.gr, 2) + T(318, 78, '2200', { c: C.gr, fs: 13, b: 1, a: 'start' });
      s += A(334, 84, 334, 104, C.gr, 2) + T(318, 120, '7200', { c: C.gr, fs: 13, b: 1, a: 'start' });
      s += T(250, 146, '7700 を通らない', { c: C.rd, fs: 12, a: 'start' });
      s += T(250, 166, '（警報が出てしまう）', { c: C.rd, fs: 12, a: 'start' });
      s += T(250, 196, 'つまみ：ふつうは ALT', { c: C.am, fs: 12, a: 'start' }) + T(250, 214, '（高度を送る。地上でも）', { c: C.am, fs: 12, a: 'start' });
      return svg(400, 238, s, '図：トランスポンダーの表示（模式図）と決まったコード。VFR は 1200、7500・7600・7700 は特別なコードです。コードを変える途中で、7500・7600・7700 を通らないようにします。つまみは、ふつう高度を送る位置（ALT）にします（AIM 4-1-20）');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
