// DRAFT (W17, R2) — the figures of Part 1's chapter 'wx'「航空気象」 (textbook/rewrite/combined/DESIGN.md 3.3 第 1 部
// 第 10 章). No product reads this file: it is checked with the chapter draft (this file first, so the chapter finds
// the figures)
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/sys-figs.js \
//     textbook/rewrite/combined/drafts/sys.js textbook/rewrite/combined/drafts/inst-figs.js \
//     textbook/rewrite/combined/drafts/inst.js textbook/rewrite/combined/drafts/wx-figs.js textbook/rewrite/combined/drafts/wx.js
// and, when the chapter is registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys,
// same helpers there: C, svg, T, L, A, P, TL, BOX, frame). Until then the few helpers they need are repeated here.
//
// What is here (one function per figure; the caption says what to look at, never where it was redrawn from):
//   new     wxWind         wx.wind — the basic course's ch07-fig7-2 redrawn on the dark board: aloft the pressure-gradient
//                          force and the Coriolis force balance and the wind blows along the isobars (geostrophic: AWH 10.4,
//                          figure 10-8); near the ground friction slows the wind and it crosses the isobars toward low
//                          pressure (AWH 10.5, figure 10-10). Northern Hemisphere; the angle drawn (about 30°) lies in
//                          the AWH's 10° (water) – 45° (rough land) range.
//   new     wxLocalWind    wx.wind — the basic course's ch07-fig7-3 redrawn as four small panels: sea breeze by day, land
//                          breeze at night, valley breeze by day, mountain breeze at night (AWH 10.6.1, 10.6.2, 10.6.4,
//                          10.6.6: the wind blows from the cooler, higher-pressure surface to the warmer one; the land
//                          breeze is the weaker).
//   new     wxParcel       wx.stab — the basic course's ch07-fig7-4 redrawn as a temperature–height diagram with the
//                          numbers of the section's worked example (wx.stab 計算演習): surface 30 °C / dewpoint 21 °C,
//                          dry adiabatic 3 °C and dewpoint 0.5 °C per 1,000 ft (AWH 12.2) to the lifted condensation level
//                          at 3,600 ft, then the AWH's example moist rate 2 °C per 1,000 ft (AWH 12.3); the surroundings
//                          cool 2.5 °C per 1,000 ft (a made-up day between the two rates: conditional instability, AWH
//                          13.3.4), so the parcel is colder up to the level of free convection at 7,200 ft and warmer above.
//   new     wxMountainWave wx.turb — the basic course's ch07-fig7-9 redrawn with what the understand report asked for
//                          (stable layer, wind, cap cloud, lenticular clouds at the wave crests, the rotor under the first
//                          crest near ridge level: AWH 16.2, 16.2.5, 16.2.7, figure 16-15). A schematic: heights and the
//                          number of waves are not to scale.
//   new     wxIcing        wx.ice — the basic course's ch07-fig7-10 redrawn: what icing needs (visible moisture, air at
//                          or below 0 °C — most icing between 0 and −20 °C: AWH 20.3.4 — and an airframe at or below 0 °C,
//                          which a cold-soaked airframe can be in air slightly above 0 °C: AWH 20.3.4) and the two shapes
//                          on a leading edge: rime grows forward, clear ice forms horns (AWH 20.3.1, 20.3.2).
//   new     wxInfoMap      wx.info — a made-up surface analysis chart (isobars, H and L, and the four kinds of fronts with
//                          NOAA JetStream's colours and symbols: cold = blue with triangles, warm = red with half-moons,
//                          stationary = alternating red and blue, occluded = purple with both; the symbols point the way the
//                          front moves). A schematic, no real day.
//   new     wxBriefChain   wx.brief — the basic course's ch07-fig7-1 redrawn as a table: departure, route, destination,
//                          alternate across; what was observed, what is forecast for the time you will be there, and what it
//                          does to the flight down (kiso07.1).
//   redrawn tafTimeline    wx.taf — the same made-up KSFB TAF as book-figs.js on a time line, now with three time scales
//                          under it (UTC, Florida summer time EDT = UTC − 4, Japan time JST = UTC + 9: FL.jur 'time'), as
//                          DESIGN 3.3 asks; the change groups as before (FM, TEMPO).
// Every number drawn here is one the text gives with its source (wx.claims.json); text ≥ 12 (≥ 10 px at 390 px).
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  // the colours and helpers of book-figs.js (same values)
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const CLOUD = '#dfe6ee', SEA = '#1d4a7a', LAND = '#3a3326', ROCK = '#5a4a38';
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''} ${o.rot ? `transform="rotate(${o.rot} ${x} ${y})"` : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3, dash = '') => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w, dash) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const P = (pts, c, w = 2, fill = 'none', dash = '') => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}" stroke="${c}" stroke-width="${w}" fill="${fill}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const BOX = (x, y, w, h, c, title = '', lines = [], o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${o.fill || c}" fill-opacity="${o.fill ? 1 : 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`
    + (title ? T(x + w / 2, y + (o.ty || 20), title, { c: o.tc || c, b: 1, fs: o.fs || 13 }) : '') + (lines.length ? TL(x + w / 2, y + (o.ly || (title ? 38 : 20)), lines, { c: o.lc || C.ink, fs: o.lfs || 12, lh: o.lh }) : '');
  const frame = (w, h, x0, x1, y0, y1, xt, yt, xl, yl, m = { l: 50, r: 14, t: 14, b: 36 }) => {
    const X = v => m.l + (v - x0) / (x1 - x0) * (w - m.l - m.r), Y = v => h - m.b - (v - y0) / (y1 - y0) * (h - m.t - m.b);
    let s = '';
    for (const v of xt) s += L(X(v), m.t, X(v), h - m.b, C.grid, 1) + T(X(v), h - m.b + 16, v, { c: C.mut, fs: 12 });
    for (const v of yt) s += L(m.l, Y(v), w - m.r, Y(v), C.grid, 1) + T(m.l - 6, Y(v) + 4, v.toLocaleString ? v.toLocaleString() : v, { c: C.mut, fs: 12, a: 'end' });
    s += T((m.l + w - m.r) / 2, h - 4, xl, { c: C.mut, fs: 12 }) + T(14, (m.t + h - m.b) / 2, yl, { c: C.mut, fs: 12, rot: -90 });
    return { X, Y, s };
  };
  // a small cumulus (x: centre, y: base, k: scale)
  const cu = (x, y, k = 1, op = 0.85) => `<path d="M${x - 22 * k} ${y} Q ${x - 26 * k} ${y - 14 * k} ${x - 12 * k} ${y - 16 * k} Q ${x - 8 * k} ${y - 30 * k} ${x + 6 * k} ${y - 26 * k} Q ${x + 20 * k} ${y - 30 * k} ${x + 20 * k} ${y - 14 * k} Q ${x + 28 * k} ${y - 10 * k} ${x + 22 * k} ${y} Z" fill="${CLOUD}" fill-opacity="${op}"/>`;
  const fmt = n => Number(n).toLocaleString('en-US');

  Object.assign(FL.bookFigs, {
    // ---------------------------------------------------------------- wx.wind (1) — ch07-fig7-2 redrawn
    wxWind() {
      const panel = (y0, title, surface) => {
        let s = `<rect x="8" y="${y0}" width="384" height="128" rx="10" fill="none" stroke="${C.grid}"/>` + T(18, y0 + 20, title, { c: C.ink, b: 1, a: 'start', fs: 13 });
        for (const [dy, lab] of [[40, '気圧が高い側（H）'], [76, ''], [112, '気圧が低い側（L）']]) {
          s += L(20, y0 + dy, 380, y0 + dy, C.mut, 1.2, '6 4');
          if (lab) s += T(374, y0 + dy - 5, lab, { c: dy === 40 ? C.am : C.cy, a: 'end', fs: 12, halo: 1 });
        }
        const cx = 200, cy = y0 + 76;
        if (!surface) {
          s += A(cx + 70, cy, cx - 70, cy, C.gr, 3.5) + T(cx - 78, cy + 4, '風', { c: C.gr, b: 1, a: 'end', fs: 13, halo: 1 });
          s += A(cx, cy - 4, cx, cy + 30, C.rd, 2.5) + T(cx + 8, cy + 26, '気圧傾度力', { c: C.rd, a: 'start', fs: 12, halo: 1 });
          s += A(cx, cy - 4, cx, cy - 30, C.vi, 2.5) + T(cx + 8, cy - 18, 'コリオリの力', { c: C.vi, a: 'start', fs: 12, halo: 1 });
        } else {
          const ang = 30 * Math.PI / 180, len = 74, ex = cx - len * Math.cos(ang), ey = cy + len * Math.sin(ang);
          s += A(cx + 40 * Math.cos(ang), cy - 40 * Math.sin(ang), ex, ey, C.gr, 3.5) + T(ex - 8, ey + 4, '風', { c: C.gr, b: 1, a: 'end', fs: 13, halo: 1 });
          s += A(cx, cy, cx, cy + 32, C.rd, 2.5) + T(cx + 8, cy + 30, '気圧傾度力', { c: C.rd, a: 'start', fs: 12, halo: 1 });
          s += A(cx, cy, cx - 13, cy - 22, C.vi, 2.5) + T(cx - 16, cy - 22, 'コリオリの力', { c: C.vi, a: 'end', fs: 12, halo: 1 });
          s += A(cx, cy, cx + 22, cy - 13, C.am, 2.5) + T(cx + 26, cy - 14, '摩擦', { c: C.am, a: 'start', fs: 12, halo: 1 });
        }
        return s;
      };
      const s = panel(6, '上空（摩擦が効かない）：等圧線に沿って吹く', false) + panel(142, '地面の近く（摩擦あり）：低い側へ横切る', true)
        + T(200, 290, '北半球。点線は等圧線。風下を向くと、高い側が右', { c: C.mut, fs: 12 });
      return svg(400, 300, s, '図：風を決める力（北半球の模式図）。上空では、気圧の高い側から低い側へ押す気圧傾度力と、風の向きの右へ曲げるコリオリの力がつり合い、風は等圧線に沿って吹きます。地面の近くでは摩擦で風が弱まり、風は等圧線を低い側へ横切ります');
    },
    // ---------------------------------------------------------------- wx.wind (2) — ch07-fig7-3 redrawn
    wxLocalWind() {
      const W = 188, H = 128;
      const panel = (x0, y0, title, body) => `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" rx="9" fill="none" stroke="${C.grid}"/>` + T(x0 + 10, y0 + 19, title, { c: C.ink, b: 1, a: 'start', fs: 12 }) + body;
      // sea breeze (day)
      let a = `<rect x="8" y="${6 + 100}" width="80" height="20" fill="${SEA}"/><rect x="88" y="${6 + 100}" width="104" height="20" fill="${LAND}"/>`;
      a += T(48, 6 + 94, '海（冷たい）', { c: C.cy, fs: 12 }) + T(140, 6 + 94, '陸（暖かい）', { c: C.am, fs: 12 });
      a += A(30, 6 + 80, 110, 6 + 80, C.cy, 3) + A(150, 6 + 50, 150, 6 + 32, C.am, 2) + A(110, 6 + 32, 40, 6 + 32, C.mut, 1.5) + cu(158, 6 + 34, 0.7);
      let b = `<rect x="204" y="${6 + 100}" width="80" height="20" fill="${SEA}"/><rect x="284" y="${6 + 100}" width="104" height="20" fill="${LAND}"/>`;
      b += T(244, 6 + 94, '海（暖かい）', { c: C.am, fs: 12 }) + T(336, 6 + 94, '陸（冷たい）', { c: C.cy, fs: 12 });
      b += A(330, 6 + 80, 252, 6 + 80, C.cy, 2.2) + A(236, 6 + 50, 236, 6 + 32, C.am, 2) + A(262, 6 + 32, 330, 6 + 32, C.mut, 1.5);
      // valley breeze (day) and mountain breeze (night)
      const vly = x0 => `<path d="M${x0} ${140 + 48} L${x0 + 74} ${140 + 108} L${x0 + 114} ${140 + 108} L${x0 + 188} ${140 + 48} L${x0 + 188} ${140 + 126} L${x0} ${140 + 126} Z" fill="${ROCK}"/>`;
      let c = vly(8) + A(82, 140 + 100, 36, 140 + 64, C.am, 2.6) + A(130, 140 + 100, 176, 140 + 64, C.am, 2.6) + cu(30, 140 + 44, 0.6) + cu(170, 140 + 44, 0.6) + T(102, 140 + 122, '谷', { c: C.ink, fs: 12 });
      let d = vly(204) + A(232, 140 + 64, 276, 140 + 100, C.cy, 2.6) + A(372, 140 + 64, 328, 140 + 100, C.cy, 2.6) + T(298, 140 + 122, '谷', { c: C.ink, fs: 12 });
      const s = panel(4, 6, '昼：海風（海 → 陸）', a) + panel(200, 6, '夜：陸風（陸 → 海）', b) + panel(4, 140, '昼：谷風（斜面を上る）', c) + panel(200, 140, '夜：山風（斜面を下りる）', d)
        + T(200, 290, '広い範囲の風が弱い日にはっきり現れる', { c: C.mut, fs: 12 });
      return svg(400, 300, s, '図：局地風の 4 つの型（模式図）。昼は暖まった陸や斜面へ、夜は冷えた陸や斜面から風が吹きます。陸風は海風より弱く、広い範囲の風が強い日にははっきりしません');
    },
    // ---------------------------------------------------------------- wx.stab (1) — ch07-fig7-4 redrawn
    wxParcel() {
      const f = frame(400, 300, 0, 35, 0, 9, [0, 10, 20, 30], [0, 2, 4, 6, 8], '温度（℃）', '高さ（1,000 ft）', { l: 50, r: 14, t: 14, b: 40 });
      const T0 = 30, D0 = 21, lcl = (T0 - D0) / 2.5, tl = T0 - 3 * lcl, env = h => T0 - 2.5 * h, parcel = h => h <= lcl ? T0 - 3 * h : tl - 2 * (h - lcl), lfc = lcl + (env(lcl) - tl) / 0.5;
      let s = f.s;
      s += P([[f.X(env(0)), f.Y(0)], [f.X(env(9)), f.Y(9)]], C.am, 3) + T(f.X(env(8.6)) + 6, f.Y(8.6), '周りの空気', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 });
      s += P([[f.X(T0), f.Y(0)], [f.X(tl), f.Y(lcl)]], C.cy, 3) + P([[f.X(tl), f.Y(lcl)], [f.X(parcel(9)), f.Y(9)]], C.cy, 3, 'none', '7 4');
      s += P([[f.X(D0), f.Y(0)], [f.X(tl), f.Y(lcl)]], C.gr, 2);
      s += L(f.X(0), f.Y(lcl), f.X(35), f.Y(lcl), C.ink, 1, '4 4') + T(f.X(1), f.Y(lcl) - 6, `雲の底（${fmt(lcl * 1000)} ft）`, { c: C.ink, a: 'start', fs: 12, halo: 1 });
      s += L(f.X(0), f.Y(lfc), f.X(35), f.Y(lfc), C.rd, 1, '4 4') + T(f.X(1), f.Y(lfc) - 6, `ここより上は空気塊が暖かい（${fmt(lfc * 1000)} ft）`, { c: C.rd, a: 'start', fs: 12, halo: 1 });
      s += T(f.X(D0) - 6, f.Y(0) - 8, `露点 ${D0}℃`, { c: C.gr, a: 'end', fs: 12, halo: 1 }) + T(f.X(T0) + 4, f.Y(0) - 8, `${T0}℃`, { c: C.cy, a: 'start', fs: 12, halo: 1 });
      s += TL(f.X(23), f.Y(5.6), ['空気塊：雲の外は', '1,000 ft で 3℃', '雲の中は 2℃（点線）'], { c: C.cy, a: 'start', fs: 12, lh: 15, halo: 1 });
      s += TL(f.X(1), f.Y(5.6), ['周りの空気は', '1,000 ft で 2.5℃'], { c: C.am, a: 'start', fs: 12, lh: 15, halo: 1 });
      return svg(400, 300, s, `図：持ち上げた空気塊と周りの空気の温度を比べる（計算演習と同じ仮の日）。雲の底は ${fmt(lcl * 1000)} ft です。約 ${fmt(lfc * 1000)} ft までは空気塊のほうが冷たいので戻ろうとし（安定）、それより上では暖かいので自分で上がります（不安定）。条件付き不安定の例です`);
    },
    // ---------------------------------------------------------------- wx.turb (1) — ch07-fig7-9 redrawn
    wxMountainWave() {
      const g = 236, ridge = 118, wl = 128;   // the ground, the ridge's x, the wavelength drawn
      let s = `<path d="M0 ${g} L60 ${g} L${ridge} ${g - 92} L176 ${g} L400 ${g} L400 ${g + 24} L0 ${g + 24} Z" fill="${ROCK}"/>`;
      s += A(8, 120, 64, 120, C.cy, 3) + A(8, 82, 64, 82, C.cy, 3) + T(10, 70, '強い風', { c: C.cy, b: 1, a: 'start', fs: 12 });
      // streamlines: lifted over the ridge (a crest over it), then waves downwind that slowly die out
      const lift = (x, amp) => x < ridge ? amp * Math.max(0, (x - 66) / (ridge - 66)) : amp * Math.cos(2 * Math.PI * (x - ridge) / wl) * Math.exp(-(x - ridge) / 420);
      for (const [base, amp] of [[124, 22], [86, 24], [50, 14]]) {
        const pts = [];
        for (let x = 70; x <= 396; x += 4) pts.push([x, base - lift(x, amp)]);
        s += P(pts, C.mut, 1.4);
      }
      const crest = ridge + wl, crest2 = ridge + 2 * wl;
      s += `<ellipse cx="${ridge}" cy="${g - 100}" rx="26" ry="9" fill="${CLOUD}" fill-opacity="0.85"/>` + T(ridge, g - 116, '笠雲', { c: C.ink, fs: 12, halo: 1 });
      for (const [x, y] of [[crest, 86 - 24 * Math.exp(-wl / 420) - 2], [crest2, 86 - 24 * Math.exp(-2 * wl / 420) - 2]]) s += `<ellipse cx="${x}" cy="${y.toFixed(1)}" rx="${x > 360 ? 20 : 28}" ry="7" fill="${CLOUD}" fill-opacity="0.8"/>`;
      s += T(crest + 64, 40, 'レンズ雲（波の山）', { c: C.ink, fs: 12, halo: 1 });
      // the rotor under the first crest, near ridge level
      const rx = crest, ry = g - 66;
      s += `<ellipse cx="${rx}" cy="${ry}" rx="24" ry="15" fill="none" stroke="${C.rd}" stroke-width="2.4"/>` + `<path d="M${rx + 6} ${ry - 15} l-10 -5 l0 10 Z" fill="${C.rd}"/>`;
      s += cu(rx, ry - 18, 0.55, 0.5);
      s += TL(rx + 30, ry + 2, ['ローター', '強い乱気流'], { c: C.rd, b: 1, a: 'start', fs: 12, lh: 15, halo: 1 });
      s += A(150, g - 70, 166, g - 34, C.am, 2.2) + T(172, g - 20, '下降気流', { c: C.am, a: 'start', fs: 12, halo: 1 });
      s += T(392, g + 17, '模式図（高さと波の数は縮尺どおりでない）', { c: C.mut, a: 'end', fs: 12 });
      s += T(10, 160, '安定な空気', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 262, s, '図：山岳波（模式図）。安定な空気が強い風で山を越えると、風下に波ができます。湿り気があれば、山頂に笠雲、波の山にレンズ雲ができ、尾根の高さのあたりのローターには強い乱気流があります。乾いていると雲はできません');
    },
    // ---------------------------------------------------------------- wx.ice (1) — ch07-fig7-10 redrawn
    wxIcing() {
      let s = BOX(8, 8, 120, 62, C.cy, '目に見える水分', ['雲・雨・霧雨'], { fs: 12 }) + T(140, 44, '＋', { c: C.ink, b: 1, fs: 16 });
      s += BOX(152, 8, 120, 62, C.vi, '0℃ 以下の空気', ['多くは 0〜−20℃'], { fs: 12 }) + T(284, 44, '＋', { c: C.ink, b: 1, fs: 16 });
      s += BOX(296, 8, 96, 62, C.am, '冷たい機体', ['0℃ 以下'], { fs: 12 });
      s += A(200, 76, 200, 96, C.ink, 2) + BOX(110, 100, 180, 30, C.rd, '過冷却水滴が当たって凍る', [], { fs: 12, ty: 20 });
      // two leading edges
      const edge = (x, y) => `<path d="M${x} ${y} C ${x - 4} ${y - 22} ${x + 30} ${y - 30} ${x + 120} ${y - 22} L${x + 150} ${y - 16} L${x + 150} ${y + 6} L${x + 120} ${y + 10} C ${x + 30} ${y + 18} ${x - 4} ${y + 14} ${x} ${y} Z" fill="#9fb3c8"/>`;
      s += edge(30, 196) + `<path d="M30 190 C 18 186 16 200 30 204 C 24 200 22 192 30 190 Z" fill="#f2f6fa"/><path d="M28 192 L12 196 L28 200 Z" fill="#f2f6fa"/>`;
      s += edge(226, 196) + `<path d="M232 176 L214 168 L224 182 Z M232 216 L214 224 L224 210 Z" fill="#cfe8ff" fill-opacity="0.9"/><path d="M226 182 C 218 190 218 202 226 210" stroke="#cfe8ff" stroke-width="5" fill="none"/>`;
      s += TL(96, 232, ['粗い氷（rime）', '小さな水滴がすぐ凍る', '前へ育つ'], { c: C.ink, fs: 12, lh: 15 }) + TL(292, 232, ['透明な氷（clear）', '大きな水滴が流れて凍る', '角（ホーン）ができる'], { c: C.ink, fs: 12, lh: 15 });
      return svg(400, 280, s, '図：着氷に要るもの（模式図）。目に見える水分・0℃ 以下の空気・冷たい機体がそろうと、過冷却水滴が当たって凍ります。粗い氷は前へ育ち、透明な氷は流れて角（ホーン）をつくり、空気の流れを大きく乱します');
    },
    // ---------------------------------------------------------------- wx.info (1) — a made-up surface analysis
    wxInfoMap() {
      let s = `<rect x="8" y="8" width="384" height="214" rx="10" fill="#0e1b2c" stroke="${C.grid}"/>`;
      // isobars around the low (L) and the high (H)
      for (const r of [28, 52, 76]) s += `<ellipse cx="146" cy="100" rx="${r * 1.35}" ry="${r}" fill="none" stroke="${C.mut}" stroke-width="1.2"/>`;
      for (const r of [24, 46]) s += `<ellipse cx="338" cy="168" rx="${r * 1.3}" ry="${r}" fill="none" stroke="${C.mut}" stroke-width="1.2"/>`;
      s += T(132, 100, 'L', { c: C.rd, b: 1, fs: 20, halo: 1 }) + T(338, 175, 'H', { c: C.bl, b: 1, fs: 20 });
      // the occluded front from the low's centre to the triple point, then the cold front (south-west) and the warm
      // front (east) from the triple point; the symbols on the side the front moves to
      const tp = [176, 124];
      s += P([[146, 100], [162, 112], tp], C.vi, 3) + `<path d="M150 104 L160 99 L158 110 Z" fill="${C.vi}"/><path d="M163 113 A6 6 0 0 1 171 119 Z" fill="${C.vi}"/>`;
      s += P([tp, [150, 152], [118, 180], [84, 206]], C.bl, 3);
      for (const [x, y] of [[164, 138], [134, 166], [100, 194]]) s += `<path d="M${x} ${y} l9 -10 l5 13 Z" fill="${C.bl}"/>`;
      s += P([tp, [214, 130], [256, 142]], C.rd, 3);
      for (const [x, y] of [[196, 127], [236, 136]]) s += `<path d="M${x - 8} ${y - 1} a8 8 0 0 1 16 2.5 Z" fill="${C.rd}"/>`;
      // stationary front (alternating red and blue)
      for (let i = 0; i < 4; i++) { const x = 250 + i * 32; s += L(x, 60, x + 32, 60, i % 2 ? C.rd : C.bl, 3); s += i % 2 ? `<path d="M${x + 10} 60 a7 7 0 0 1 12 0 Z" fill="${C.rd}"/>` : `<path d="M${x + 10} 60 l6 10 l6 -10 Z" fill="${C.bl}"/>`; }
      s += T(388, 30, '模式図（ある日の例ではない）', { c: C.mut, a: 'end', fs: 12 });
      // legend
      const leg = (x, y, c, lab) => L(x, y, x + 28, y, c, 3) + T(x + 34, y + 4, lab, { c: C.ink, a: 'start', fs: 12 });
      s += leg(14, 240, C.bl, '寒冷前線（青・三角）') + leg(206, 240, C.rd, '温暖前線（赤・半円）');
      s += leg(14, 262, C.vi, '閉塞前線（紫・両方）') + L(206, 262, 220, 262, C.rd, 3) + L(220, 262, 234, 262, C.bl, 3) + T(240, 266, '停滞前線（赤と青）', { c: C.ink, a: 'start', fs: 12 });
      s += T(200, 288, '三角と半円は前線の進む向き。細い線は等圧線', { c: C.mut, fs: 12 });
      return svg(400, 296, s, '図：地上天気図の読み方（模式図）。細い線は気圧の同じ所を結んだ等圧線、L は低気圧、H は高気圧です。寒冷前線は青い線と三角、温暖前線は赤い線と半円、閉塞前線は紫の線、停滞前線は赤と青が交互の線で描きます');
    },
    // ---------------------------------------------------------------- wx.brief (1) — ch07-fig7-1 redrawn
    wxBriefChain() {
      const cols = ['出発', '経路', '到着', '代わり'], rows = [
        ['観測', '（今）', C.cy, [['METAR'], ['PIREP', 'レーダー'], ['METAR'], ['METAR']]],
        ['予報', '（その時刻）', C.am, [['TAF', '出発の時刻'], ['GFA', 'AIRMET'], ['TAF', '着く時刻'], ['TAF', '着く時刻']]],
        ['影響', '（自分の飛行）', C.gr, [['風と', '滑走路'], ['雲と地形', '揺れ'], ['雲高・', '視程・風'], ['燃料と', '時間']]]];
      const x0 = 92, cw = 76, y0 = 36, rh = 58;
      let s = '';
      cols.forEach((c, i) => { s += T(x0 + i * cw + cw / 2, 22, c, { c: C.ink, b: 1, fs: 13 }); });
      s += A(x0 + 6, 30, x0 + 4 * cw - 6, 30, C.mut, 1.5);
      rows.forEach(([lab, sub, col, cells], r) => {
        const y = y0 + r * rh;
        s += `<rect x="6" y="${y + 4}" width="82" height="${rh - 8}" rx="8" fill="${col}" fill-opacity="0.12" stroke="${col}"/>` + T(47, y + rh / 2 - 2, lab, { c: col, b: 1, fs: 13 }) + T(47, y + rh / 2 + 15, sub, { c: col, fs: 12 });
        cells.forEach((lines, i) => { s += `<rect x="${x0 + i * cw + 3}" y="${y + 4}" width="${cw - 6}" height="${rh - 8}" rx="6" fill="none" stroke="${col}" stroke-opacity="0.6"/>` + TL(x0 + i * cw + cw / 2, y + rh / 2 - (lines.length - 1) * 8 + 4, lines, { c: C.ink, fs: 12, lh: 16 }); });
      });
      s += T(200, y0 + 3 * rh + 18, '同じ場所でも、時刻が違えば読む予報が違う', { c: C.mut, fs: 12 });
      return svg(400, y0 + 3 * rh + 28, s, '図：天気の情報を、場所と時刻に重ねて読む（模式図）。出発・経路・到着・代わりの空港ごとに、今の観測、その時刻の予報、自分の飛行への影響を分けて書き出します');
    },
    // ---------------------------------------------------------------- wx.taf (1) — book-figs.js tafTimeline, redrawn with three time scales
    tafTimeline() {
      const X = h => 46 + h * 13.5, row = 112, mono = (x, y, t, c) => `<text x="${x}" y="${y}" fill="${c}" font-size="12" font-family="ui-monospace, Menlo, Consolas, monospace">${t}</text>`;
      let s = mono(12, 20, 'TAF KSFB 141130Z 1412/1512 09010KT P6SM SCT040', C.ink) + mono(24, 38, 'TEMPO 1418/1422 3SM TSRA BKN030CB', C.am) + mono(24, 56, 'FM150200 VRB03KT P6SM SKC', C.gr);
      s += `<rect x="${X(0)}" y="${row - 28}" width="${X(14) - X(0)}" height="26" rx="4" fill="${C.cy}" fill-opacity="0.18" stroke="${C.cy}"/>` + T((X(0) + X(14)) / 2, row - 11, '東の風 10 kt・6 SM 超・SCT040', { c: C.cy, fs: 12 });
      s += `<rect x="${X(14)}" y="${row - 28}" width="${X(24) - X(14)}" height="26" rx="4" fill="${C.gr}" fill-opacity="0.18" stroke="${C.gr}"/>` + T((X(14) + X(24)) / 2, row - 11, 'FM：風が弱まり晴れ', { c: C.gr, fs: 12 });
      s += `<rect x="${X(6)}" y="${row + 2}" width="${X(10) - X(6)}" height="26" rx="4" fill="${C.am}" fill-opacity="0.25" stroke="${C.am}"/>` + T(X(10) + 6, row + 19, 'TEMPO：一時的に雷雨・3 SM', { c: C.am, b: 1, a: 'start', fs: 12 });
      s += L(X(0), row + 40, X(24), row + 40, C.mut, 1.5);
      const two = v => String(v).padStart(2, '0');
      // the clock and the day of each scale at hour h after 14 日 12Z (EDT = UTC − 4, JST = UTC + 9); the day is written
      // at the first tick and wherever it changed since the tick before
      const at = (h, off) => { const t = 12 + h + off; return { hh: ((t % 24) + 24) % 24, dd: 14 + Math.floor(t / 24) }; };
      const prev = {};
      for (let h = 0; h <= 24; h += 6) {
        s += L(X(h), row + 36, X(h), row + 44, C.mut, 1.5);
        for (const [k, off, y, c, suf] of [['z', 0, 60, C.ink, 'Z'], ['e', -4, 78, C.am, ':00'], ['j', 9, 96, C.vi, ':00']]) {
          const v = at(h, off), day = prev[k] !== v.dd ? `${v.dd}日 ` : '';
          prev[k] = v.dd;
          s += T(X(h), row + y, `${day}${two(v.hh)}${suf}`, { c, fs: 12 });
        }
      }
      s += T(200, row + 118, '上から UTC（Z）・EDT（フロリダの夏）・JST（日本）', { c: C.mut, fs: 12 });
      s += TL(12, row + 148, ['TEMPO：その時間に一時的に（1 回 1 時間未満、合わせて半分未満）', 'FM：その時刻から、天気がすっかり変わる'], { c: C.ink, a: 'start', fs: 12, lh: 17 });
      return svg(400, row + 172, s, '図：TAF を時間の帯にしたもの（架空の例）。14 日 12Z から 15 日 12Z までの予報で、14 日 18〜22Z（フロリダの夏時間で 14〜18 時、日本時間で 15 日 3〜7 時）に一時的な雷雨、15 日 02Z から晴れ');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
