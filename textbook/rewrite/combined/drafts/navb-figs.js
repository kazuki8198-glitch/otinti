// DRAFT (W18, R2) — the figures of Part 1's new chapter 'navb'「航法の基礎」 (textbook/rewrite/combined/DESIGN.md
// 3.3 第 1 部 第 11 章). No product reads this file: it is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/navb-figs.js \
//     textbook/rewrite/combined/drafts/navb.js
// and, when the chapter is registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys,
// same helpers there: C, svg, T, L, A, P, TL, BOX, NFN, pad3). Until then the few helpers they need are repeated here.
//
// What is here (one function per figure; the caption says what to look at, never where it was redrawn from).
//   REDRAWN windTriangle navb.wind (and nav.plan, which uses it now) — book-figs.js's FIG.windTriangle under the SAME
//                        name (DESIGN 3.3 navb.wind「T nav.plan の図 windTriangle」): the drawing is unchanged (it already
//                        writes the deviation with E/W: RULINGS R.deviation-sign, W07f); only the caption says
//                        「風力三角形」, FL.terms' official name (wind-triangle), for「風の三角形」. When registered, it
//                        replaces the function in book-figs.js.
//   new  navbLatLon      navb.earth — the basic course's ch08-fig8-2 redrawn on the dark board: a wire globe (equator,
//                        parallels, meridians, the prime meridian, the pole) and a one-degree latitude–longitude square
//                        with a point P at 28°30′N 81°30′W (= 28.5°N 81.5°W; west longitudes grow to the left). The
//                        bottom lines: 28°30′ is not 28.30°, and one minute of longitude is about 1 NM at the equator,
//                        about 0.5 NM at 60° (cos 60° = 0.5). Content: kiso08.2; PHAK 25C ch. 16 (latitude and
//                        longitude); NGA Pub. 9 Bowditch 2024 vol. I §105–106 (coordinates, the nautical mile).
//   new  navbProjections navb.earth — two charts side by side: a Lambert conformal conic chart (meridians converge, a
//                        straight line is almost a great circle, measure the course at the middle meridian) and a
//                        Mercator chart (meridians parallel, a straight line is a rhumb line, the great circle curves
//                        toward the pole). Content: kiso08.4; Bowditch §501, §502–513 (Mercator: rhumb lines plot as
//                        straight lines; Lambert: "a straight line on this projection so nearly approximates a great
//                        circle"), §3419 (measure at the mid meridian); PHAK 25C ch. 16 (measure the course at a
//                        meridian near the midpoint).
//   new  navbNorths      navb.north — the basic course's ch08-fig8-3 redrawn: true north, magnetic north and compass
//                        north from one point (angles drawn larger than they are), the airplane's heading 090° true,
//                        and the chain TH 090° → +variation (W, the course's teaching value FL.physics.MAGVAR_W) → MH →
//                        −deviation (2°E, an example) → CH. Content: kiso08.5; PHAK 25C ch. 16 (variation and
//                        deviation, "east is least, west is best", deviation card).
//   new  navbWindFix     navb.wind — the basic course's ch08-fig8-5 and ch08-fig8-6 redrawn as one figure in two panels
//                        drawn to scale (2.3 px per kt): A heading 090°, TAS 100 kt, wind 360°/20 kt, no correction →
//                        track ≈ 101°, GS ≈ 102 kt, drift ≈ 11°; B the same wind with the course 090° kept → heading
//                        ≈ 078.5° (WCA = asin(20/100) ≈ 11.5° left), GS ≈ 98 kt. The basic course's ch08-fig8-4 is not
//                        used (ERRATA K.navigation.K3: it shows an under-correction without saying so). Content:
//                        kiso08.6, 08.7, 08.9; PHAK 25C ch. 16 (drift angle, WCA).
//   new  navbComponents  navb.wind — the wind 030°/15 kt split along and across the course 090°: headwind component
//                        15 × cos 60° = 7.5 kt, crosswind component 15 × sin 60° ≈ 13 kt from the left (the same case as
//                        FIG.windTriangle, which then solves it). Content: kiso08.8.
//   new  navbTimeFuel    navb.calc — one 60 NM leg flown at GS 90 kt (40 min) and 72 kt (50 min), the fuel at an example
//                        rate of 9.0 gal/h (6.0 gal and 7.5 gal), the two formulas, and decimal hours turned into minutes
//                        (0.5 h = 30 min, 0.3 h = 18 min, 0.67 h ≈ 40 min). Content: kiso08.3, 08.10, 08.11 (litres
//                        changed to US gallons); PHAK 25C ch. 16 (time, fuel consumption, converting minutes to hours).
// Every number drawn here is one the text gives with its source (navb.claims.json); text ≥ 12 (≥ 10 px at 390 px).
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  const DEG = Math.PI / 180;
  // the colours and helpers of book-figs.js (same values)
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''} ${o.rot ? `transform="rotate(${o.rot} ${x} ${y})"` : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3, dash = '') => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w, dash) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const P = (pts, c, w = 2, fill = 'none', dash = '') => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}" stroke="${c}" stroke-width="${w}" fill="${fill}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const BOX = (x, y, w, h, c, title = '', lines = [], o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${o.fill || c}" fill-opacity="${o.fill ? 1 : 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`
    + (title ? T(x + w / 2, y + (o.ty || 20), title, { c: o.tc || c, b: 1, fs: o.fs || 13 }) : '') + (lines.length ? TL(x + w / 2, y + (o.ly || (title ? 38 : 20)), lines, { c: o.lc || C.ink, fs: o.lfs || 12, lh: o.lh }) : '');
  const NFN = (x, y, a = 'end') => T(x, y, '模式図・NOT FOR NAVIGATION', { c: C.am, fs: 12, a, b: 1 });
  const pad3 = n => String(Math.round(((n % 360) + 360) % 360)).padStart(3, '0');
  const ell = (cx, cy, rx, ry, c, w = 1.2, dash = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  // an arc around (cx, cy) between two compass directions (degrees, 0 = up, clockwise), radius r
  const arcDir = (cx, cy, r, d0, d1, c, w = 2) => {
    const p = d => [cx + r * Math.sin(d * DEG), cy - r * Math.cos(d * DEG)], [x0, y0] = p(d0), [x1, y1] = p(d1);
    return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 ${d1 > d0 ? 1 : 0} ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
  };

  Object.assign(FL.bookFigs, {
    // ---------------------------------------------------------------- navb.earth (1) — ch08-fig8-2 redrawn
    navbLatLon() {
      const cx = 100, cy = 150, R = 82;
      let s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.bl}" fill-opacity="0.08" stroke="${C.mut}" stroke-width="1.5"/>`;
      // meridians (wire ellipses) and the prime meridian
      for (const lon of [35, 65]) s += ell(cx, cy, R * Math.sin(lon * DEG), R, C.mut, 1);
      s += L(cx, cy - R, cx, cy + R, C.gr, 2.2);
      // parallels and the equator
      for (const lat of [30, 60, -30]) s += ell(cx, cy - R * Math.sin(lat * DEG), R * Math.cos(lat * DEG), 13 * Math.cos(lat * DEG), C.cy, 1.3);
      s += ell(cx, cy, R, 13, C.am, 2.2);
      s += `<circle cx="${cx}" cy="${cy - R}" r="3" fill="${C.ink}"/>` + T(cx, cy - R - 8, '北極（90°N）', { c: C.ink, fs: 12, b: 1 });
      s += T(cx + 4, cy - 28, '本初子午線（経度 0°）', { c: C.gr, fs: 12, a: 'start', b: 1, halo: 1 });
      s += T(cx - 30, cy - R * Math.sin(30 * DEG) - 8, '緯線', { c: C.cy, fs: 12, b: 1, halo: 1 });
      s += T(cx + 26, cy + 30, '赤道（緯度 0°）', { c: C.am, fs: 12, b: 1, halo: 1 });
      s += T(cx, cy + R + 20, '経線（子午線）', { c: C.mut, fs: 12, b: 1 });
      // a one-degree square: 28°N–29°N, 82°W–81°W (west longitudes grow to the left)
      const x0 = 250, x1 = 390, y0 = 60, y1 = 200, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      s += T(320, 40, '緯度と経度の格子（例）', { c: C.ink, fs: 12, b: 1 });
      s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${C.mut}" stroke-width="1.5"/>`;
      s += L(xm, y0, xm, y1, C.mut, 1, '4 4') + L(x0, ym, x1, ym, C.mut, 1, '4 4');
      s += T(x0 - 4, y0 + 4, '29°N', { c: C.cy, fs: 12, a: 'end' }) + T(x0 - 4, ym + 4, '28°30′N', { c: C.cy, fs: 12, a: 'end' }) + T(x0 - 4, y1 + 4, '28°N', { c: C.cy, fs: 12, a: 'end' });
      s += T(x0, y1 + 18, '82°W', { c: C.gr, fs: 12 }) + T(xm, y1 + 18, '81°30′W', { c: C.gr, fs: 12 }) + T(x1, y1 + 18, '81°W', { c: C.gr, fs: 12, a: 'end' });
      s += `<circle cx="${xm}" cy="${ym}" r="5" fill="${C.am}"/>` + T(xm + 10, ym - 8, 'P', { c: C.am, fs: 13, b: 1, a: 'start' });
      s += T(316, y1 + 38, '← 西ほど経度の数が大きい', { c: C.mut, fs: 12 });
      s += T(200, 278, '28°30′N ＝ 28.5°N（28.30°N ではない）', { c: C.ink, fs: 13, b: 1 });
      s += T(200, 300, '経度 1′ の長さ：赤道で約 1 NM・緯度 60° で約 0.5 NM', { c: C.ink, fs: 12 });
      return svg(400, 312, s, '図：緯度は赤道から南北へ、経度は本初子午線から東西へ測る角度です。右の格子の点 P は 28°30′N・81°30′W で、小数の度では 28.5°N・81.5°W です（模式図）');
    },
    // ---------------------------------------------------------------- navb.earth (2) — two projections
    navbProjections() {
      let s = T(98, 20, 'ランベルト正角円錐図法', { c: C.ink, fs: 12, b: 1 }) + T(302, 20, 'メルカトル図法', { c: C.ink, fs: 12, b: 1 });
      s += L(200, 30, 200, 270, C.grid, 1);
      // left: meridians converge toward an apex above the chart, parallels are arcs around it
      const ax = 98, ay = -300, top = 36, bot = 222;
      for (let k = -3; k <= 3; k++) { const bx = ax + 30 * k, f = y => ax + 30 * k * (y - ay) / (bot - ay); s += L(f(top).toFixed(1), top, bx, bot, k === 0 ? C.gr : C.mut, k === 0 ? 2 : 1); }
      for (const r of [360, 430, 500]) { const pts = []; for (let x = 8; x <= 188; x += 6) pts.push([x, ay + Math.sqrt(r * r - (x - ax) * (x - ax))]); s += P(pts, C.cy, 1); }
      s += A(28, 196, 168, 70, C.am, 2.5);
      s += T(22, 212, 'A', { c: C.am, fs: 13, b: 1 }) + T(176, 66, 'B', { c: C.am, fs: 13, b: 1 });
      s += `<circle cx="98" cy="133" r="4" fill="${C.gr}"/>` + T(104, 150, '中ほどの経線', { c: C.gr, fs: 12, a: 'start', b: 1, halo: 1 });
      s += T(98, 246, '直線 ≈ 大圏（最短に近い）', { c: C.cy, fs: 12, b: 1 }) + T(98, 266, '向きは中ほどの経線で測る', { c: C.gr, fs: 12 });
      // right: meridians parallel, parallels spread toward the pole
      for (let i = 0; i < 6; i++) s += L(216 + 34 * i, top, 216 + 34 * i, bot, C.mut, 1);
      for (const y of [56, 116, 168, 212]) s += L(210, y, 392, y, C.cy, 1);
      s += A(226, 200, 382, 80, C.am, 2.5);
      s += `<path d="M226 200 Q 292 64 382 80" stroke="${C.cy}" stroke-width="2.5" fill="none" stroke-dasharray="6 4"/>`;
      s += T(220, 216, 'A', { c: C.am, fs: 13, b: 1 }) + T(388, 74, 'B', { c: C.am, fs: 13, b: 1, a: 'end' });
      s += T(302, 246, '直線 ＝ 航程線（向きが一定）', { c: C.am, fs: 12, b: 1 }) + T(302, 266, '点線 ＝ 大圏（最短）は曲線', { c: C.cy, fs: 12 });
      s += NFN(392, 294);
      return svg(400, 304, s, '図：同じ 2 点 A・B を、2 つの投影法の図に描いたもの。ランベルト正角円錐図法では直線が大圏にとても近く、メルカトル図法では直線が航程線になります（模式図）');
    },
    // ---------------------------------------------------------------- navb.north — ch08-fig8-3 redrawn
    navbNorths() {
      const VAR = FL.physics.MAGVAR_W, DEV = 2, O = [110, 236];
      const tip = (d, len) => [O[0] + len * Math.sin(d * DEG), O[1] - len * Math.cos(d * DEG)];
      const dVar = -24, dCn = -16;                 // drawn angles (exaggerated): magnetic north 24° left, compass north 8° right of it
      const tn = tip(0, 170), mn = tip(dVar, 160), cn = tip(dCn, 140);
      let s = A(O[0], O[1], tn[0], tn[1], C.ink, 2.5) + A(O[0], O[1], mn[0].toFixed(1), mn[1].toFixed(1), C.cy, 2.5) + A(O[0], O[1], cn[0].toFixed(1), cn[1].toFixed(1), C.vi, 2.5);
      s += T(tn[0], tn[1] - 10, '真北', { c: C.ink, fs: 13, b: 1 }) + T(36, 82, '磁北', { c: C.cy, fs: 13, b: 1 }) + T(84, 118, 'コンパスの北', { c: C.vi, fs: 12, b: 1, a: 'start', halo: 1 });
      s += arcDir(O[0], O[1], 150, dVar, 0, C.am, 2) + T(58, 60, `偏差 ${VAR}°W`, { c: C.am, fs: 12, b: 1 });
      s += arcDir(O[0], O[1], 110, dVar, dCn, C.rd, 2) + T(56, 150, `自差 ${DEV}°E`, { c: C.rd, fs: 12, b: 1, a: 'end', halo: 1 });
      s += A(O[0], O[1], 222, O[1], C.gr, 3) + T(166, O[1] + 20, '機首の向き', { c: C.gr, fs: 12, b: 1 });
      s += arcDir(O[0], O[1], 40, 0, 90, C.gr, 1.5) + T(O[0] + 34, O[1] - 32, '090°', { c: C.gr, fs: 12, a: 'start', halo: 1 });
      // the chain at the right
      const bx = 238, bw = 154, rows = [['TH', 90, '真北から測る'], ['MH', 90 + VAR, '磁北から測る'], ['CH', 90 + VAR - DEV, 'コンパスで合わせる']];
      rows.forEach(([n, v, sub], i) => {
        const y = 30 + i * 74;
        s += BOX(bx, y, bw, 46, i === 0 ? C.ink : i === 1 ? C.cy : C.vi, `${n} ${pad3(v)}°`, [sub], { fs: 14, ty: 20, ly: 38 });
        if (i < 2) s += A(bx + bw / 2, y + 47, bx + bw / 2, y + 72, C.mut, 2) + T(bx + bw / 2 - 8, y + 64, i === 0 ? `＋${VAR}°（W は足す）` : `−${DEV}°（E は引く）`, { c: i === 0 ? C.am : C.rd, fs: 12, b: 1, a: 'end' });
      });
      s += T(315, 270, '角度は大きく描いています', { c: C.mut, fs: 12 });
      return svg(400, 284, s, `図：3 つの北と、機首の向きの直し方。真北から 090° の向きは、磁北からは ${pad3(90 + VAR)}°、コンパスでは ${pad3(90 + VAR - DEV)}° です（偏差 ${VAR}°W はこの教材の値、自差 ${DEV}°E は例。W は足し、E は引く）`);
    },
    // ---------------------------------------------------------------- navb.wind (1) — ch08-fig8-5 and 8-6 redrawn, to scale
    navbWindFix() {
      const k = 2.3, tas = 100, ws = 20, wca = Math.asin(ws / tas) / DEG, gsFix = tas * Math.cos(wca * DEG), gsNo = Math.hypot(tas, ws), drift = Math.atan2(ws, tas) / DEG;
      let s = T(8, 18, 'A　機首を 090° に向けたまま（修正しない）', { c: C.ink, fs: 12, b: 1, a: 'start' });
      s += A(384, 48, 384, 20, C.mut, 2) + T(384, 62, '北', { c: C.mut, fs: 12 });
      // A: heading east, the wind blows the air south
      const OA = [24, 70], HA = [OA[0] + tas * k, OA[1]], GA = [HA[0], HA[1] + ws * k];
      s += A(OA[0], OA[1], HA[0], HA[1], C.cy, 3) + A(HA[0], HA[1], GA[0], GA[1], C.am, 3) + A(OA[0], OA[1], GA[0], GA[1], C.gr, 3);
      s += T(140, OA[1] - 10, `TAS ${tas} kt・機首 090°`, { c: C.cy, fs: 12, b: 1 });
      s += TL(HA[0] + 10, HA[1] + 20, [`風 360°/${ws} kt`, '（北から）'], { c: C.am, fs: 12, b: 1, a: 'start', lh: 15 });
      s += arcDir(OA[0], OA[1], 64, 90, 90 + drift, C.rd, 2) + T(30, 104, `流される角 約 ${Math.round(drift)}°`, { c: C.rd, fs: 12, b: 1, a: 'start' });
      s += T(160, 136, `航跡 約 ${pad3(90 + drift)}°・GS 約 ${Math.round(gsNo)} kt`, { c: C.gr, fs: 12, b: 1 });
      s += T(200, 160, '東へ進みたいのに、南へ流される', { c: C.mut, fs: 12 });
      s += L(8, 174, 392, 174, C.grid, 1);
      // B: heading into the wind keeps the course 090°
      s += T(8, 196, 'B　機首を風上へ向ける（航路 090° を保つ）', { c: C.ink, fs: 12, b: 1, a: 'start' });
      const OB = [24, 306], HB = [OB[0] + tas * k * Math.cos(wca * DEG), OB[1] - tas * k * Math.sin(wca * DEG)], GB = [HB[0], OB[1]];
      s += L(OB[0], OB[1], 392, OB[1], C.mut, 1.2, '5 4') + T(390, OB[1] - 8, '航路 090°', { c: C.mut, fs: 12, a: 'end' });
      s += A(OB[0], OB[1], HB[0].toFixed(1), HB[1].toFixed(1), C.cy, 3) + A(HB[0].toFixed(1), HB[1].toFixed(1), GB[0].toFixed(1), GB[1], C.am, 3) + A(OB[0], OB[1], GB[0].toFixed(1), GB[1], C.gr, 3);
      s += T(170, 244, `TAS ${tas} kt・機首 約 ${(90 - wca).toFixed(1)}°`, { c: C.cy, fs: 12, b: 1 });
      s += T(HB[0] + 10, 282, `風 360°/${ws} kt`, { c: C.am, fs: 12, b: 1, a: 'start' });
      s += arcDir(OB[0], OB[1], 74, 90 - wca, 90, C.rd, 2) + T(30, 274, `風上へ 約 ${wca.toFixed(1)}°`, { c: C.rd, fs: 12, b: 1, a: 'start' });
      s += T(140, 326, `GS 約 ${Math.round(gsFix)} kt（東へ）`, { c: C.gr, fs: 12, b: 1 });
      s += T(200, 350, `真横からの ${ws} kt を TAS から引いた ${tas - ws} kt ではない`, { c: C.mut, fs: 12 });
      return svg(400, 360, s, `図：同じ北からの風 ${ws} kt で、A は機首を 090° に向けたまま飛んだとき、B は機首を風上へ向けて東向きの線を保ったときの速度の矢印です（縮尺どおり。水色は空気に対する速度、黄色は風、緑は地面に対する速度）`);
    },
    // ---------------------------------------------------------------- navb.wind (2) — the wind split along and across the course
    navbComponents() {
      const wd = 30, ws = 15, tc = 90, k = 8, th = (tc - wd) * DEG, head = ws * Math.cos(th), cross = ws * Math.sin(th);
      const W0 = [262, 32], W1 = [W0[0] + ws * k * Math.sin((wd + 180) * DEG), W0[1] - ws * k * Math.cos((wd + 180) * DEG)];
      let s = A(30, 52, 30, 22, C.mut, 2) + T(30, 66, '北', { c: C.mut, fs: 12 });
      s += A(30, 170, 372, 170, C.gr, 3) + T(372, 160, `航路 ${pad3(tc)}°（進む向き）`, { c: C.gr, fs: 12, b: 1, a: 'end' });
      s += A(W0[0], W0[1], W1[0].toFixed(1), W1[1].toFixed(1), C.am, 3);
      s += A(W0[0], W0[1], W0[0] - head * k, W0[1], C.rd, 2.5, '5 3') + A(W0[0] - head * k, W0[1], W1[0].toFixed(1), W1[1].toFixed(1), C.cy, 2.5, '5 3');
      s += T(W0[0] - head * k / 2, W0[1] - 10, `向かい風の成分 ${head.toFixed(1)} kt`, { c: C.rd, fs: 12, b: 1 });
      s += T(W0[0] - head * k - 8, 92, `横風の成分 約 ${Math.round(cross)} kt`, { c: C.cy, fs: 12, b: 1, a: 'end' });
      s += T(W0[0] - 12, 100, `風 ${pad3(wd)}°/${ws} kt`, { c: C.am, fs: 12, b: 1, a: 'start', halo: 1 });
      s += T(200, 200, `風と航路の角度 θ ＝ ${pad3(tc)}° − ${pad3(wd)}° ＝ ${tc - wd}°`, { c: C.ink, fs: 12 });
      s += T(200, 220, `${ws} × cos ${tc - wd}° ＝ ${head.toFixed(1)} kt・${ws} × sin ${tc - wd}° ≈ ${Math.round(cross)} kt`, { c: C.ink, fs: 12 });
      return svg(400, 232, s, `図：風 ${pad3(wd)}°/${ws} kt を、航路 ${pad3(tc)}° に沿う向かい風の成分と、航路を横切る横風の成分に分けたもの（縮尺どおり）。風の矢印は、風が流れて行く向きに描きます`);
    },
    // ---------------------------------------------------------------- navb.wind (3) — REDRAWN under its own name: FIG.windTriangle
    // (book-figs.js; nav.plan uses it too). The same drawing, word for word; only the caption names the triangle with FL.terms'
    // official name「風力三角形」(wind-triangle) instead of「風の三角形」.
    windTriangle() {
      // the wind triangle drawn to scale for the wca calculator's default case (true course 090°, TAS 105 kt, wind 030° / 15 kt), and
      // the chain from true course to compass heading with the course's variation (MAGVAR_W) and an example deviation of 2°W (added, like a west variation)
      const tc = 90, tas = 105, wd = 30, ws = 15, dev = 2, VAR = FL.physics.MAGVAR_W, a = (wd - tc) * DEG, wca = Math.asin(ws * Math.sin(a) / tas) / DEG, gs = tas * Math.cos(wca * DEG) - ws * Math.cos(a);
      const th = tc + wca, k = 2.6, O = [36, 128], dir = h => [Math.sin(h * DEG), -Math.cos(h * DEG)];
      const H = [O[0] + tas * k * dir(th)[0], O[1] + tas * k * dir(th)[1]], G = [H[0] + ws * k * dir(wd + 180)[0], H[1] + ws * k * dir(wd + 180)[1]];
      let s = A(O[0], O[1], H[0], H[1], C.cy, 3) + A(H[0], H[1], G[0], G[1], C.am, 3) + A(O[0], O[1], G[0], G[1], C.gr, 3);
      s += T(170, 84, `真対気速度 ${tas} kt・真針路 ${String(Math.round(th)).padStart(3, '0')}°`, { c: C.cy, b: 1, fs: 12, halo: 1 });
      s += TL(H[0] + 8, H[1] + 4, ['風', `${String(wd).padStart(3, '0')}°/${ws} kt`], { c: C.am, b: 1, a: 'start', fs: 12, lh: 15 });
      s += T(150, O[1] + 22, `対地速度 ${Math.round(gs)} kt・真航路 ${String(tc).padStart(3, '0')}°`, { c: C.gr, b: 1, fs: 12 });
      s += `<path d="M ${O[0] + 120} ${O[1]} A 120 120 0 0 0 ${(O[0] + 120 * dir(th)[0]).toFixed(1)} ${(O[1] + 120 * dir(th)[1]).toFixed(1)}" stroke="${C.rd}" stroke-width="2.5" fill="none"/>` + L(O[0] + 120, O[1] - 7, O[0] + 112, O[1] + 30, C.rd, 1);
      s += T(O[0], O[1] + 44, `偏流修正角 ${Math.round(Math.abs(wca))}°（機首を風上の左へ）`, { c: C.rd, b: 1, a: 'start', fs: 12, halo: 1 });
      s += A(380, 62, 380, 30, C.mut, 2) + T(380, 76, '北', { c: C.mut, fs: 12 });
      // the chain: true course → true heading → magnetic heading → compass heading
      const vals = [['真航路 TC', tc], ['真針路 TH', th], ['磁針路 MH', th + VAR], ['コンパス針路', th + VAR + dev]], steps = [`風 −${Math.round(Math.abs(wca))}°`, `西偏 ＋${VAR}°`, `自差 ${dev}°W`];
      vals.forEach(([n, v], i) => { const x = 4 + i * 100; s += `<rect x="${x}" y="182" width="86" height="50" rx="8" fill="${C.cy}" fill-opacity="0.1" stroke="${C.cy}"/>` + T(x + 43, 202, n, { c: C.ink, fs: 12 }) + T(x + 43, 222, `${String(Math.round(v)).padStart(3, '0')}°`, { c: C.ink, b: 1, fs: 14 }); if (i < 3) s += A(x + 88, 207, x + 102, 207, C.ink, 2) + T(x + 93, 250, steps[i], { c: C.am, b: 1, fs: 12 }); });
      s += T(200, 276, `磁航路 MC ＝ 真航路 ＋ 西偏 ＝ ${String(tc + VAR).padStart(3, '0')}°（VFR の巡航高度の規則に使う）`, { c: C.mut, fs: 12 });
      return svg(400, 288, s, `図：風力三角形（真航路 ${String(tc).padStart(3, '0')}°・真対気速度 ${tas} kt・風 ${String(wd).padStart(3, '0')}°/${ws} kt の例を縮尺どおりに描いたもの）と、真航路からコンパス針路までの計算の順番。偏差の ${VAR}°W はこの教材の値、自差の ${dev}°W は例です（偏差も自差も W は足し、E は引く）`);
    },
    // ---------------------------------------------------------------- navb.calc — time and fuel on one leg
    navbTimeFuel() {
      const dist = 60, ff = 9.0, rows = [[90, C.cy], [72, C.am]], m = 4;   // m: px per minute
      let s = L(40, 48, 360, 48, C.ink, 2.5);
      for (let i = 0; i <= dist / 10; i++) { const x = 40 + i * (320 / (dist / 10)); s += L(x, 42, x, 54, C.ink, 1.5); }
      s += T(40, 34, 'A', { c: C.ink, fs: 13, b: 1 }) + T(360, 34, 'B', { c: C.ink, fs: 13, b: 1 }) + T(200, 34, `区間 ${dist} NM`, { c: C.ink, fs: 12, b: 1 });
      rows.forEach(([gs, c], i) => {
        const y = 86 + i * 36, min = dist / gs * 60, gal = ff * min / 60;
        s += T(8, y + 5, `GS ${gs} kt`, { c, fs: 12, b: 1, a: 'start' });
        s += `<rect x="80" y="${y - 9}" width="${min * m}" height="16" rx="4" fill="${c}" fill-opacity="0.35" stroke="${c}"/>`;
        s += T(80 + min * m + 8, y + 5, `${min} 分 → ${gal.toFixed(1)} gal`, { c, fs: 12, b: 1, a: 'start' });
      });
      s += BOX(8, 146, 188, 60, C.cy, '時間（分）', ['距離（NM）÷ GS（kt）× 60'], { fs: 13, ty: 20, ly: 42 });
      s += BOX(204, 146, 188, 60, C.am, '区間の燃料（gal）', ['燃料消費率 × 時間（分）÷ 60'], { fs: 13, ty: 20, ly: 42 });
      s += T(200, 232, '小数の時間は 60 を掛けて分に', { c: C.ink, fs: 12, b: 1 });
      [['0.5 時間 ＝ 30 分', 68], ['0.3 時間 ＝ 18 分', 200], ['0.67 時間 ≈ 40 分', 332]].forEach(([t, x]) => { s += `<rect x="${x - 62}" y="242" width="124" height="26" rx="13" fill="${C.vi}" fill-opacity="0.15" stroke="${C.vi}"/>` + T(x, 259, t, { c: C.ink, fs: 12 }); });
      s += T(200, 290, `燃料消費率 ${ff.toFixed(1)} gal/h は例題の値`, { c: C.mut, fs: 12 });
      return svg(400, 300, s, `図：同じ ${dist} NM の区間でも、GS が ${rows[0][0]} kt から ${rows[1][0]} kt に下がると、時間は 40 分から 50 分に延び、燃料も増えます（燃料消費率 ${ff.toFixed(1)} gal/h の例題）`);
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
