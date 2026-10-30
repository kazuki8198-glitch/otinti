// DRAFT (W19, R2) — the figures of Part 1's chapter 'law'「規則と空域」 (textbook/rewrite/combined/DESIGN.md 3.3 第 1 部
// 第 12 章). No product reads this file: it is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/law-figs.js textbook/rewrite/combined/drafts/law.js
// and, when the chapter is registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys,
// same helpers there: C, svg, T, L, A, TL, planeSide, planeTop). Until then the few helpers they need are repeated here.
//
// What is here (one function per figure; the caption says what to look at):
//   new     lawSources    law.basis — the basic course's ch09-fig9-2「資料の役割を分けて必要な条件を確認する」redrawn for
//                         the US body on the dark board: one flight, three kinds of documents laid over it (the rules,
//                         14 CFR: who may fly and on what conditions; the airport and airspace information — charts, Chart
//                         Supplement, NOTAM: where, when and how; the aircraft's documents — AFM: what this airplane can
//                         do), the pilot in command who checks all three, and the ATC clearance as a permission on top
//                         (14 CFR 91.3・91.103・91.9・91.123, AIM 4-4-1). No number is drawn.
//   new     lawCurrency   law.pilot — the two ways a deadline is counted: by calendar months, to the end of the month
//                         (the flight review, 14 CFR 61.56(c): a review on 2026-03-10 serves through 2028-03-31; the
//                         third-class medical is also counted to the end of a month, but its length depends on age: the
//                         figure shows the flight review only — factcheck-law S3), and by days, back from the day of the flight (61.57(a): three
//                         takeoffs and landings within the preceding 90 days). The month axis is drawn to scale
//                         (13.6 px a month), the day axis too (3.4 px a day).
//   new     vfrTwoViews   law.vfr — the figure DESIGN 3.3 asks for (「上方に雲がない」と「雲の下」が同じ考え): one VFR cloud
//                         clearance said two ways — from the cloud (US 14 CFR 91.155(a): 500 ft below, 1,000 ft above,
//                         2,000 ft horizontal) and from the aircraft (no cloud within 500 ft above, 1,000 ft below and
//                         2,000 ft to the side). The words above and below swap. Only the US numbers are drawn: the
//                         Japanese ones are FL.jur's (the bk.jur box of the section) and are not written by hand
//                         (STYLE「囲みの数字は手で書きません」); the bk.jp box under it says that 施行規則第 5 条 uses the
//                         aircraft's way. The vertical gaps are proportional (50 px for 500 ft, 100 px for 1,000 ft); the
//                         horizontal is not (the caption says so: factcheck-law N9).
//   redrawn preflightInfo law.pic — the same drawing as book-figs.js; only the caption: 「離陸と着陸の距離」for「離着陸距離」
//                         (the terms' first use is in the text) and the country of 14 CFR 91.103.
//   redrawn rightOfWay    law.rules — the same drawing as book-figs.js; the words follow FL.terms: 進路権 (right-of-way;
//                         the textbook's 優先 / 優先権 is its common name, the term's note says to fix it), and the caption
//                         names the country of 14 CFR 91.113 (DESIGN 3.4). Its order is that of 91.113(d) (the wording was
//                         amended by Amdt. 91-381, 90 FR 35034, published 2025-07-24 and effective 2025-10-22; the order is the same).
//                         revise-law: 滑空機 (the Civil Aeronautics Act's word, DECISIONS 3) for グライダー.
// Every number drawn here is one the text gives with its source (law.claims.json); text ≥ 12 (≥ 10 px at 390 px).
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  // the colours and helpers of book-figs.js (same values)
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const PLANE = '#dfe6ee', PLANE2 = '#9fb3c8', GLASS = '#5d7fa3';
  // the side view and the top view of book-figs.js (same paths)
  const planeSide = (x, y, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})">`
    + `<path d="M50 -1 C48 -8 38 -11 26 -12 L14 -16 C2 -18 -10 -16 -18 -12 L-50 -5 L-50 1 L-14 6 C6 8 30 7 44 5 C49 4 51 2 50 -1 Z" fill="${PLANE}"/>`
    + `<path d="M12 -15 C4 -17 -6 -16 -14 -12 L-12 -9 L10 -9 Z" fill="${GLASS}"/><path d="M-38 -6 L-50 -27 L-57 -27 L-54 -3 Z" fill="${PLANE}"/>`
    + `<rect x="-60" y="-4" width="20" height="3.5" rx="1.5" fill="${PLANE2}"/><ellipse cx="6" cy="5" rx="19" ry="2.6" fill="${PLANE2}"/>`
    + `<path d="M2 7 L0 15 M40 5 L40 15" stroke="${PLANE2}" stroke-width="2"/><circle cx="0" cy="16" r="3.4" fill="#5b6b7e"/><circle cx="40" cy="16" r="3" fill="#5b6b7e"/>`
    + `<line x1="52" y1="-15" x2="52" y2="13" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const planeTop = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${k})">`
    + `<path d="M-68 -8 L68 -8 L66 6 L-66 6 Z" fill="${PLANE}"/><path d="M-22 38 L22 38 L21 45 L-21 45 Z" fill="${PLANE2}"/>`
    + `<path d="M0 -50 C5 -48 7 -40 7 -28 L5 30 L2 50 L-2 50 L-5 30 L-7 -28 C-7 -40 -5 -48 0 -50 Z" fill="${PLANE}"/><path d="M-5 -26 L5 -26 L4 -14 L-4 -14 Z" fill="${GLASS}"/>`
    + `<line x1="-12" y1="-52" x2="12" y2="-52" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  // a cloud centred at (x, y), w wide
  const cloud = (x, y, w) => { const h = w * 0.36, l = x - w / 2, r = x + w / 2, b = y + h / 2, t = y - h / 2;
    return `<path d="M${l} ${b} Q ${l - 6} ${y} ${l + w * 0.18} ${y - h * 0.15} Q ${l + w * 0.24} ${t - 2} ${l + w * 0.46} ${t + h * 0.1} Q ${l + w * 0.62} ${t - h * 0.35} ${l + w * 0.78} ${t + h * 0.2} Q ${r + 6} ${y - h * 0.1} ${r} ${b} Z" fill="#dfe6ee" fill-opacity="0.85"/>`; };

  Object.assign(FL.bookFigs, {
    // law.basis — one flight, three kinds of documents laid over it, the pilot in command, and the clearance on top
    lawSources() {
      let s = T(200, 20, '1 つの飛行に、3 つの資料を重ねて当てはめる', { c: C.ink, b: 1, fs: 13 });
      const card = (x, c, head, lines, foot) => `<rect x="${x}" y="32" width="122" height="122" rx="9" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.6"/>`
        + T(x + 61, 52, head, { c, b: 1, fs: 13 }) + TL(x + 61, 74, lines, { c: C.ink, fs: 12, lh: 16 }) + T(x + 61, 142, foot, { c: C.mut, fs: 12 });
      s += card(8, C.cy, '規則', ['誰が・どの', '条件で', '飛べるか'], '14 CFR');
      s += card(139, C.gr, '空港と空域', ['どこを・いつ・', 'どう使えるか', ''], 'チャート・NOTAM');
      s += card(270, C.am, '機体の資料', ['その機体で', '何ができるか', ''], 'AFM の運用限界');
      for (const x of [69, 200, 331]) s += A(x, 158, x === 200 ? 200 : (x < 200 ? 120 : 280), 184, C.mut, 2);
      s += `<rect x="40" y="188" width="320" height="32" rx="16" fill="${C.vi}" fill-opacity="0.18" stroke="${C.vi}" stroke-width="1.6"/>`
        + T(200, 209, '機長が、3 つを全部満たすかを確かめる', { c: C.ink, b: 1, fs: 13 });
      s += `<rect x="40" y="234" width="320" height="52" rx="9" fill="none" stroke="${C.rd}" stroke-width="1.6" stroke-dasharray="6 4"/>`
        + T(200, 254, '＋ 管制承認：決めた条件で進んでよいという許可', { c: C.rd, b: 1, fs: 12 })
        + T(200, 274, '規則や安全から外れてよい許可ではない', { c: C.ink, fs: 12 });
      return svg(400, 296, s, '図：1 つの飛行に、3 つの資料を重ねて当てはめます。規則は誰がどの条件で飛べるか、空港と空域の情報はどこをいつどう使えるか、機体の資料はその機体で何ができるかを決めます。3 つを全部満たすかを確かめるのは機長で、管制承認はその上での「決めた条件で進んでよい」という許可です');
    },
    // law.pilot — counted by calendar months (to the end of the month) or by days (back from the day of the flight)
    lawCurrency() {
      let s = T(12, 20, '① 暦月で数える：その月の終わりまで', { c: C.cy, b: 1, a: 'start', fs: 13 });
      const x0 = 30, mo = 13.6, mx = m => +(x0 + m * mo).toFixed(1);        // month 0 = March 2026; month 25 = April 2028 (the end of March 2028)
      s += L(x0, 72, mx(25) + 6, 72, C.mut, 1.5);
      [[0, '2026/3'], [6, '2026/9'], [12, '2027/3'], [18, '2027/9'], [24, '2028/3']].forEach(([m, t]) => { s += L(mx(m), 66, mx(m), 78, C.mut, 1.5) + T(mx(m) + 4, 94, t, { c: C.mut, fs: 12, a: m ? 'middle' : 'start' }); });
      const b0 = mx(10 / 31), b1 = mx(25);
      s += `<rect x="${b0}" y="42" width="${(b1 - b0).toFixed(1)}" height="18" rx="4" fill="${C.cy}" fill-opacity="0.25" stroke="${C.cy}"/>`;
      s += T(b0 + 4, 56, '3 月 10 日に受けた', { c: C.ink, fs: 12, a: 'start' }) + T(b1 - 4, 56, '2028 年 3 月 31 日まで', { c: C.ink, b: 1, fs: 12, a: 'end' });
      s += T(12, 116, '例：フライトレビュー（24 暦月）', { c: C.ink, fs: 12, a: 'start' });
      s += L(12, 132, 388, 132, C.grid, 1);
      s += T(12, 156, '② 日で数える：飛ぶ日からさかのぼる', { c: C.am, b: 1, a: 'start', fs: 13 });
      const d0 = 30, dd = 3.4, dx = d => +(d0 + d * dd).toFixed(1);           // day 0 = 90 days before the flight; day 90 = the day of the flight
      s += L(d0, 214, dx(100), 214, C.mut, 1.5);
      [[0, '90 日前'], [30, '60 日前'], [60, '30 日前'], [90, '飛ぶ日']].forEach(([d, t]) => { s += L(dx(d), 208, dx(d), 220, C.mut, 1.5) + T(dx(d), 236, t, { c: d === 90 ? C.ink : C.mut, b: d === 90, fs: 12 }); });
      s += A(dx(90), 176, dx(0), 176, C.am, 2) + T(dx(45), 170, 'さかのぼって 90 日', { c: C.am, b: 1, fs: 12 });
      for (const d of [22, 41, 57]) s += `<circle cx="${dx(d)}" cy="200" r="6" fill="${C.gr}"/>`;
      s += T(dx(57) + 12, 204, '離陸と着陸 3 回', { c: C.gr, b: 1, fs: 12, a: 'start' });
      s += T(12, 262, '例：人を乗せる前の最近の飛行経験（90 日に 3 回）', { c: C.ink, fs: 12, a: 'start' });
      s += T(12, 282, '暦月の決まりは月の終わりまで延びる。日の決まりは延びない', { c: C.mut, fs: 12, a: 'start' });
      return svg(400, 292, s, '図：期限の 2 つの数え方。暦月で数える決まり（フライトレビューの 24 暦月など）は、その月の終わりまで有効です。日で数える決まり（人を乗せる前の 90 日に 3 回の離着陸）は、飛ぶ日からさかのぼって数えます。身体検査証明も月の終わりまで数えますが、長さは年齢で違います（下の表）');
    },
    // law.vfr — one cloud clearance said two ways: from the cloud (91.155) and from the aircraft
    vfrTwoViews() {
      let s = T(100, 16, '雲から離れる距離で言う', { c: C.ink, b: 1, fs: 13 }) + T(300, 16, '機体のまわりの範囲で言う', { c: C.ink, b: 1, fs: 13 });
      s += L(200, 26, 200, 286, C.grid, 1.5);
      // 50 px for 500 ft, 100 px for 1,000 ft; the airplane takes py ± 8
      const py = 130, top = py - 8 - 50, bot = py + 8 + 100;
      // left: a cloud above the airplane (the airplane is 500 ft below it) and one below (the airplane is 1,000 ft above it)
      s += cloud(100, top - 21.6, 120) + cloud(100, bot + 21.6, 120).replace('fill-opacity="0.85"', 'fill-opacity="0.6"');
      s += planeSide(100, py, 0.42);
      s += A(46, top + 1, 46, py - 8, C.am, 2) + A(46, py - 8, 46, top + 1, C.am, 2) + T(54, top + 20, '雲の下', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 }) + T(54, top + 35, '500 ft', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 });
      s += A(46, py + 10, 46, bot - 1, C.cy, 2) + A(46, bot - 1, 46, py + 10, C.cy, 2) + T(54, py + 50, '雲の上', { c: C.cy, b: 1, a: 'start', fs: 12, halo: 1 }) + T(54, py + 65, '1,000 ft', { c: C.cy, b: 1, a: 'start', fs: 12, halo: 1 });
      // right: the airplane at the centre of a box that must hold no cloud: 500 ft above, 1,000 ft below, 2,000 ft to the side
      const bx0 = 218, bx1 = 382;
      s += `<rect x="${bx0}" y="${top}" width="${bx1 - bx0}" height="${bot - top}" rx="6" fill="${C.gr}" fill-opacity="0.06" stroke="${C.gr}" stroke-width="1.6" stroke-dasharray="6 4"/>`;
      s += planeSide(300, py, 0.42);
      s += A(300, py - 10, 300, top + 2, C.am, 2) + T(308, top + 24, '上 500 ft', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 });
      s += A(300, py + 12, 300, bot - 2, C.cy, 2) + T(308, py + 70, '下 1,000 ft', { c: C.cy, b: 1, a: 'start', fs: 12, halo: 1 });
      s += A(276, py + 30, bx0 + 2, py + 30, C.gr, 2) + A(324, py + 30, bx1 - 2, py + 30, C.gr, 2) + T(250, py + 22, '横 2,000 ft', { c: C.gr, b: 1, fs: 12, halo: 1 });
      s += T(300, bot + 18, 'この範囲に雲がない', { c: C.gr, b: 1, fs: 12 });
      s += T(200, 304, '「雲の下」の数字が、機体の「上」の数字になる', { c: C.ink, b: 1, fs: 13 });
      return svg(400, 314, s, '図：同じ決まりの 2 つの言い方。左は雲を中心に「雲の下 500 ft・雲の上 1,000 ft」、右は機体を中心に「機体の上 500 ft・下 1,000 ft・横 2,000 ft の範囲に雲がない」と言います。上と下の言葉が入れかわります（数字は米国の 14 CFR 91.155 の Class C・D と 10,000 ft MSL 未満の Class E。縦は縮尺どおりで、横は縮めて描いています）');
    },
    // redrawn under the same name (W19): the caption says「離陸と着陸の距離」(the terms 離陸距離・着陸距離 have their first
    // use, with English, in the text: STYLE「用語」; check-style reads the figures too); otherwise as book-figs.js
    preflightInfo() {
      // 14 CFR 91.103: all available information; for every flight, runway lengths and takeoff / landing distances; for IFR or away from the airport, weather, fuel, alternatives, ATC delays
      let s = `<rect x="8" y="8" width="384" height="236" rx="12" fill="none" stroke="${C.mut}" stroke-dasharray="5 4"/>` + T(200, 30, 'その飛行に関する、入手できるすべての情報', { c: C.ink, b: 1, fs: 13 });
      s += `<rect x="26" y="42" width="348" height="190" rx="10" fill="${C.cy}" fill-opacity="0.06" stroke="${C.cy}"/>` + T(200, 62, 'IFR・空港の近くを離れる飛行（クロスカントリー）', { c: C.cy, b: 1, fs: 12 }) + TL(200, 80, ['天気の報告と予報・必要な燃料', '行けないときの代わり・ATC から聞いた遅れ'], { c: C.ink, fs: 12, lh: 16 });
      s += `<rect x="62" y="116" width="276" height="104" rx="9" fill="${C.gr}" fill-opacity="0.08" stroke="${C.gr}"/>` + T(200, 136, 'すべての飛行', { c: C.gr, b: 1, fs: 12 }) + TL(200, 154, ['使う空港の滑走路の長さ', '離陸と着陸の距離（POH など）'], { c: C.ink, fs: 12, lh: 16 });
      s += `<rect x="140" y="188" width="120" height="24" rx="12" fill="${C.am}" fill-opacity="0.2" stroke="${C.am}"/>` + T(200, 205, '機長（PIC）', { c: C.am, b: 1, fs: 12 });
      return svg(400, 252, s, '図：飛行前の準備（米国の 14 CFR 91.103）。機長は出発前に、その飛行に関する入手できるすべての情報を知っておきます。すべての飛行で滑走路の長さと離陸・着陸の距離を、IFR や空港の近くを離れる飛行では天気・燃料・代わりの計画・ATC の遅れも確かめます');
    },
    // redrawn under the same name (W19): 進路権 (FL.terms) for 優先, and the country of 91.113 in the caption; otherwise as book-figs.js
    rightOfWay() {
      // 91.113: converging (the one on the right has the right-of-way), head-on (both turn right), overtaking (pass on the right); the order of categories (91.113(d); its wording amended by Amdt. 91-381, 90 FR 35034, published 2025-07-24, effective 2025-10-22 — the order itself did not change)
      let s = '';
      const box = (x, t1, t2) => `<rect x="${x}" y="8" width="124" height="150" rx="8" fill="none" stroke="${C.grid}"/>` + T(x + 62, 26, t1, { c: C.ink, b: 1, fs: 12 }) + T(x + 62, 150, t2, { c: C.mut, fs: 12 });
      s += box(4, '① 交わる', '右の機に進路権');
      s += planeTop(50, 104, 0.28, { rot: 0 }) + planeTop(104, 60, 0.28, { rot: 270 }) + `<path d="M50 86 Q 60 72 92 76 Q 122 78 130 56" stroke="${C.gr}" stroke-width="2" fill="none"/>` + T(104, 88, '相手', { c: C.am, fs: 12 }) + T(22, 130, '自分', { c: C.cy, fs: 12 });
      s += box(138, '② 正面', '両方とも右へ');
      s += planeTop(200, 120, 0.26, { rot: 0 }) + planeTop(200, 50, 0.26, { rot: 180 }) + `<path d="M200 104 Q 204 92 222 86" stroke="${C.gr}" stroke-width="2" fill="none"/><path d="M200 66 Q 196 78 178 84" stroke="${C.gr}" stroke-width="2" fill="none"/>`;
      s += box(272, '③ 追い越し', '右へ離れて抜く');
      s += planeTop(334, 64, 0.26, { rot: 0 }) + planeTop(334, 126, 0.26, { rot: 0 }) + `<path d="M334 110 Q 360 92 358 66" stroke="${C.gr}" stroke-width="2" fill="none"/>` + T(306, 66, '前', { c: C.am, fs: 12 });
      s += T(8, 184, '進路権の順（左ほど先・91.113(c)(d)）', { c: C.ink, b: 1, a: 'start', fs: 12 });
      [['遭難機', '気球', '滑空機'], ['曳航・給油中の機', '飛行船', 'ほかの動力機']].forEach((row, r) => {
        let x = 8; const y = 194 + r * 32;
        row.forEach((t, i) => { const w = t.length * 12 + 14, c = r === 0 && i === 0 ? C.rd : C.cy; s += `<rect x="${x}" y="${y}" width="${w}" height="24" rx="12" fill="${c}" fill-opacity="0.15" stroke="${c}"/>` + T(x + w / 2, y + 16, t, { c: C.ink, fs: 12 }); x += w; if (r === 0 || i < 2) { s += T(x + 9, y + 16, '＞', { c: C.mut, fs: 12 }); } x += 18; });
      });
      s += TL(8, 266, ['着陸の最終進入中・着陸中の機に進路権。2 機が着陸に向かうときは', '低いほうに進路権（ただし、最終進入中の機の前に割り込まない）'], { c: C.ink, a: 'start', fs: 12, lh: 16 });
      return svg(400, 292, s, '図：衝突を避ける進路権の決まり（米国の 14 CFR 91.113）。進路権のある機の上・下・前を、十分に離れずに横切ってはいけません。進路権があっても、ほかの機を見て避ける義務はみんなにあります');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
