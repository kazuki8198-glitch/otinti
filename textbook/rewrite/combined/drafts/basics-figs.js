// DRAFT (W10, R1) — the figures of the front part's chapter 'basics'「飛行の基本量」 (textbook/rewrite/combined/DESIGN.md
// 3.3, Appendix A). No product reads this file: it is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/basics-figs.js textbook/rewrite/combined/drafts/basics.js
// and, when the chapter is registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys,
// same helpers there: C, svg, T, L, A, TL, BOX, planeSide, NFN). Until then the few helpers they need are repeated here.
// The basic course's figures are redrawn on the dark board (STYLE「図」; DESIGN 4.2): ch00-fig1 → basicsFlight,
// ch00-fig5 → basicsWind, ch00-fig6 → basicsAlt (same content, text ≥ 12, viewBox 400 wide). The numbers are computed
// here from the values the text uses (NIST SP 811 factors; the worked examples' numbers), so the figures and the text
// agree. Figures that come before a term's definition use the abbreviation only (IAS, GS …): the
// chapter's first use of an official name is written in the text, 「正式名（通称、English）」 (STYLE「用語」).
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  const DEG = Math.PI / 180;
  // the colours and helpers of book-figs.js (same values)
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const BOX = (x, y, w, h, c, title = '', lines = [], o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`
    + (title ? T(x + w / 2, y + (o.ty || 20), title, { c: o.tc || c, b: 1, fs: o.fs || 13 }) : '') + (lines.length ? TL(x + w / 2, y + (o.ly || (title ? 38 : 20)), lines, { c: o.lc || C.ink, fs: 12 }) : '');
  const NFN = (x, y, a = 'end') => T(x, y, '模式図・NOT FOR NAVIGATION', { c: C.am, fs: 12, a, b: 1 });
  const PLANE = '#dfe6ee', PLANE2 = '#9fb3c8', GLASS = '#5d7fa3';
  // the side view of book-figs.js (nose to the right), without the gear
  const plane = (x, y, k = 1, pitch = 0) => `<g transform="translate(${x} ${y}) rotate(${-pitch}) scale(${k})">`
    + `<path d="M50 -1 C48 -8 38 -11 26 -12 L14 -16 C2 -18 -10 -16 -18 -12 L-50 -5 L-50 1 L-14 6 C6 8 30 7 44 5 C49 4 51 2 50 -1 Z" fill="${PLANE}"/>`
    + `<path d="M12 -15 C4 -17 -6 -16 -14 -12 L-12 -9 L10 -9 Z" fill="${GLASS}"/><path d="M-38 -6 L-50 -27 L-57 -27 L-54 -3 Z" fill="${PLANE}"/>`
    + `<rect x="-60" y="-4" width="20" height="3.5" rx="1.5" fill="${PLANE2}"/><ellipse cx="6" cy="5" rx="19" ry="2.6" fill="${PLANE2}"/>`
    + `<line x1="52" y1="-15" x2="52" y2="13" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const fmt = n => n.toLocaleString('en-US');
  const pad3 = n => String(Math.round(n)).padStart(3, '0');

  Object.assign(FL.bookFigs, {
    // basics.flight — ch00-fig1 redrawn: the phases of one flight and what each one checks (schematic: no real heights)
    basicsFlight() {
      const ph = [
        [['出発前'], ['天気・燃料', '代わりの案'], C.cy],
        [['地上滑走', 'と離陸'], ['位置・許可', '周りの機体'], C.gr],
        [['上昇と', '巡航'], ['経路・高度', '燃料・天気'], C.am],
        [['降下と', '進入'], ['到着の情報', 'やり直しの計画'], C.vi],
        [['着陸と', '到着後'], ['駐機・機体', '記録'], C.bl],
      ];
      const G = 140, x0 = 8, w = 72, gap = 6;
      let s = L(8, G, 392, G, C.mut, 2);
      // the path: on the ground, take off, climb, cruise, descend, land, taxi in
      const pts = [[14, G], [128, G], [196, 46], [248, 46], [328, G], [390, G]];
      s += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ')}" stroke="${C.cy}" stroke-width="2.5" fill="none" stroke-dasharray="7 4"/>`;
      s += plane(222, 40, 0.34) + plane(160, 98, 0.3, 30);
      for (let i = 1; i < 5; i++) { const x = x0 + i * (w + gap) - gap / 2; s += L(x, 22, x, G, C.grid, 1.5, '3 3'); }
      ph.forEach(([title, items, c], i) => {
        const x = x0 + i * (w + gap), cx = x + w / 2;
        s += `<rect x="${x}" y="${G + 12}" width="${w}" height="48" rx="8" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`;
        s += TL(cx, G + 32 - (title.length - 1) * 8, title, { c, b: 1, fs: 12, lh: 16 });
        s += TL(cx, G + 80, items, { c: C.ink, fs: 12, lh: 16 });
      });
      s += T(200, 16, '各段階の終わりは、計画を見直す機会', { c: C.mut, fs: 12 });
      return svg(400, 244, s, '図：一便の流れ（模式図）。5 つの段階と、それぞれで主に確かめることの例です。高さと距離は実際の比ではありません');
    },

    // basics.crew — the three layers: position (job title), the legal role (PIC), the operating roles (PF/PM)
    basicsCrew() {
      const band = (y, c, head, sub, chips) => {
        let t = `<rect x="8" y="${y}" width="384" height="62" rx="8" fill="${c}" fill-opacity="0.08" stroke="${c}" stroke-width="1.5"/>`;
        t += T(20, y + 24, head, { c, b: 1, a: 'start', fs: 13 }) + T(20, y + 46, sub, { c: C.mut, a: 'start', fs: 12 });
        chips.forEach(([label, x, wd]) => { t += `<rect x="${x}" y="${y + 13}" width="${wd}" height="36" rx="18" fill="${c}" fill-opacity="0.16" stroke="${c}"/>` + T(x + wd / 2, y + 36, label, { c: C.ink, b: 1, fs: 12 }); });
        return t;
      };
      let s = band(8, C.cy, '職位', '会社の中の立場', [['キャプテン', 178, 96], ['副操縦士', 284, 96]]);
      s += band(78, C.am, '法令上の役割', '飛行ごとに決める', [['機長（PIC）：最終の権限と責任', 140, 240]]);
      s += band(148, C.gr, '操作の役割', '場面ごとに決める', [['PF：経路を管理', 150, 112], ['PM：監視・コール', 268, 112]]);
      s += T(200, 232, '3 つは別々に決まる', { c: C.ink, b: 1, fs: 13 });
      s += T(200, 252, '例：副操縦士が PF、キャプテンが PM（機長はキャプテン）', { c: C.ink, fs: 12 });
      s += T(200, 272, '例：訓練のソロでは、機長も PF も自分', { c: C.ink, fs: 12 });
      return svg(400, 284, s, '図：操縦士の呼び方の 3 つの層。職位（キャプテン・副操縦士）、法令上の役割（機長）、操作の役割（PF・PM）は、別々に決まります');
    },

    // basics.units — the lengths to one scale (1 km, 1 SM, 1 NM: NIST SP 811 B.9) and the inHg / hPa scale (conventional inHg)
    basicsUnits() {
      const KM = 1000, SM = 1609.344, NM = 1852, HPA_PER_INHG = 33.86389;
      const k = 230 / NM, x0 = 64;
      let s = T(12, 18, '長さ（同じ縮尺）', { c: C.mut, b: 1, a: 'start', fs: 12 });
      [['1 km', KM, '1,000 m', C.mut], ['1 SM', SM, '約 1,609 m', C.am], ['1 NM', NM, '1,852 m', C.cy]].forEach(([n, m, v, c], i) => {
        const y = 40 + i * 26, len = m * k;
        s += T(12, y + 4, n, { c, b: 1, a: 'start', fs: 12 }) + `<rect x="${x0}" y="${y - 8}" width="${len.toFixed(1)}" height="14" rx="3" fill="${c}" fill-opacity="0.55"/>` + T(x0 + len + 8, y + 4, v, { c: C.ink, a: 'start', fs: 12 });
      });
      s += T(12, 132, '高さ：1 ft ＝ 0.3048 m（1,000 ft は約 305 m）', { c: C.ink, a: 'start', fs: 12 });
      // the pressure scale: inHg above, hPa below, aligned by the factor
      const p0 = 997, p1 = 1035, X = p => 30 + (p - p0) / (p1 - p0) * 340, y = 196;
      s += T(12, 158, '気圧：上は inHg、下は hPa（同じ位置は同じ気圧）', { c: C.mut, b: 1, a: 'start', fs: 12 });
      s += L(X(p0), y, X(p1), y, C.mut, 2);
      for (const inhg of [29.5, 29.8, 30.1, 30.4]) { const x = X(inhg * HPA_PER_INHG); s += L(x, y - 8, x, y, C.am, 2) + T(x, y - 14, inhg.toFixed(2), { c: C.am, fs: 12 }); }
      for (const hpa of [1000, 1010, 1020, 1030]) { const x = X(hpa); s += L(x, y, x, y + 8, C.cy, 2) + T(x, y + 22, String(hpa), { c: C.cy, fs: 12 }); }
      s += T(388, y - 14, 'inHg', { c: C.am, a: 'end', fs: 12 }) + T(388, y + 22, 'hPa', { c: C.cy, a: 'end', fs: 12 });
      // the standard pressure as PHAK writes it (29.92 "Hg = 1,013.2 mb (hPa)); the same value as the text
      const xs = X(1013.2);
      s += L(xs, y - 26, xs, y + 30, C.gr, 2) + T(xs, y + 46, '標準気圧 29.92 inHg ≈ 1013.2 hPa', { c: C.gr, b: 1, fs: 12 });
      return svg(400, 252, s, '図：長さの単位を同じ縮尺で比べたもの（1 km・1 SM・1 NM）と、気圧の inHg と hPa の目盛り（NIST の換算係数で描いた）。1 inHg は約 33.86 hPa です');
    },

    // basics.time — one moment in three clocks (a July day: Sanford on EDT = UTC−4, Japan on JST = UTC+9)
    basicsTime() {
      const rows = [['UTC（Z）', '', 0, C.cy], ['EDT', 'UTC−4', -4, C.am], ['JST', 'UTC＋9', 9, C.gr]];
      const x = i => 100 + i * 54, hours = [12, 13, 14, 15, 16, 17];
      let s = '';
      rows.forEach(([name, off, d, c], r) => {
        const y = 40 + r * 62;
        s += T(10, y + 4, name, { c, b: 1, a: 'start', fs: 13 }) + (off ? T(10, y + 22, off, { c: C.mut, a: 'start', fs: 12 }) : '');
        s += L(x(0) - 22, y + 10, x(5) + 22, y + 10, C.grid, 1.5);
        hours.forEach((h, i) => {
          const lh = ((h + d) % 24 + 24) % 24, day = 1 + Math.floor((h + d) / 24);
          s += T(x(i), y + 4, d === 0 ? `${String(lh).padStart(2, '0')}00Z` : `${String(lh).padStart(2, '0')}:00`, { c: C.ink, fs: 12 });
          s += T(x(i), y + 24, `7/${day}`, { c: day > 1 ? C.rd : C.mut, fs: 12, b: day > 1 ? 1 : 0 });   // the date on every row
        });
      });
      // the moment of the example (1400Z) and the date line in Japan (1500Z = 00:00 JST): the line is the left edge of
      // the 1500Z column, and the label says from which hour the date changes (not a time between two columns)
      s += `<rect x="${x(2) - 26}" y="22" width="52" height="150" rx="6" fill="none" stroke="${C.vi}" stroke-width="2"/>`;
      const edge = x(3) - 27;
      s += L(edge, 150, edge, 198, C.rd, 2, '4 3') + T(edge, 214, '1500Z（00:00 JST）から日本の日付が 1 日進む', { c: C.rd, fs: 12 });
      s += T(200, 238, '同じ瞬間：1400Z ＝ 10:00 EDT ＝ 23:00 JST', { c: C.vi, b: 1, fs: 13 });
      return svg(400, 250, s, '図：同じ瞬間を 3 つの時刻で表したもの（7 月の例。Sanford の夏は EDT、日本は JST）。紫の枠は同じ瞬間です。日本の日付は 1500Z で 1 日進みます');
    },

    // basics.speed (1) — the speeds in order, and what is corrected between them (14 CFR 1.1, PHAK ch. 8)
    basicsSpeedChain() {
      const rows = [['IAS', '速度計が示す値', C.cy], ['CAS', '誤差を直した対気速度', C.cy], ['EAS', '圧縮性を直した対気速度', C.cy], ['TAS', '空気に対する本当の速さ', C.am], ['GS', '地面に対する速さ', C.gr]];
      const fix = ['取り付け位置と計器の誤差を直す', '空気の圧縮性の影響を直す', '空気の密度（高度と気温）を直す', '風を矢印として足す'];
      let s = '';
      rows.forEach(([ab, note, c], i) => {
        const y = 10 + i * 52;
        s += `<rect x="12" y="${y}" width="76" height="34" rx="8" fill="${c}" fill-opacity="0.14" stroke="${c}" stroke-width="1.5"/>` + T(50, y + 22, ab, { c, b: 1, fs: 14 });
        s += T(100, y + 22, note, { c: C.ink, a: 'start', fs: 12 });
        if (i < fix.length) s += A(50, y + 36, 50, y + 50, C.mut, 2) + T(70, y + 47, `↓ ${fix[i]}`, { c: C.am, a: 'start', fs: 12 });
      });
      return svg(400, 262, s, '図：速度の 5 つの種類と、順に直すもの。速度計の値から始めて、誤差・圧縮性・空気の密度を直すと空気に対する本当の速さに、風を足すと地面に対する速さになります');
    },

    // basics.speed (2) — ch00-fig5 redrawn: TAS 100 kt heading 090°, wind from the north 20 kt (drawn to scale)
    basicsWind() {
      const tas = 100, ws = 20, k = 2.5, O = [50, 74];
      const H = [O[0] + tas * k, O[1]], G = [H[0], H[1] + ws * k];
      const gs = Math.hypot(tas, ws), drift = Math.atan2(ws, tas) / DEG;
      let s = A(O[0], O[1], H[0], H[1], C.cy, 3) + A(H[0], H[1], G[0], G[1], C.am, 3) + A(O[0], O[1], G[0], G[1], C.gr, 3);
      s += T((O[0] + H[0]) / 2, O[1] - 12, `TAS ${tas} kt・針路 090°（機首の向き）`, { c: C.cy, b: 1, fs: 12, halo: 1 });
      s += TL(H[0] + 10, H[1] + 18, ['北からの風', `${ws} kt`], { c: C.am, b: 1, a: 'start', fs: 12, lh: 16 });
      s += T(166, G[1] + 26, `GS 約 ${Math.round(gs)} kt・航跡 約 ${pad3(90 + drift)}°`, { c: C.gr, b: 1, fs: 12 });
      s += `<path d="M ${O[0] + 70} ${O[1]} A 70 70 0 0 1 ${(O[0] + 70 * Math.cos(drift * DEG)).toFixed(1)} ${(O[1] + 70 * Math.sin(drift * DEG)).toFixed(1)}" stroke="${C.rd}" stroke-width="2.5" fill="none"/>`;
      s += T(O[0] + 2, O[1] + 40, `偏流角 約 ${Math.round(drift)}°`, { c: C.rd, b: 1, a: 'start', fs: 12, halo: 1 });
      s += A(370, 60, 370, 26, C.mut, 2) + T(370, 74, '北', { c: C.mut, fs: 12 });
      s += T(200, 196, `GS ＝ √（${tas}² ＋ ${ws}²）≈ ${gs.toFixed(1)} kt（${tas} − ${ws} ではない）`, { c: C.ink, fs: 12 });
      return svg(400, 208, s, `図：真東（090°）に機首を向け、TAS ${tas} kt で飛ぶ飛行機が、北から ${ws} kt の風を受けたときの速度の矢印（縮尺どおり）。地面の上では南へ流されます`);
    },

    // basics.alt — ch00-fig6 redrawn: one altitude (5,000 ft MSL) over two heights of the terrain
    basicsAlt() {
      const SEA = 240, k = 0.038, Y = ft => SEA - ft * k, alt = 5000, lowT = 500, highT = 2000;
      let s = L(8, SEA, 392, SEA, C.cy, 2);
      const yl = Y(lowT), yh = Y(highT);
      s += `<path d="M8 ${SEA} L8 ${yl} L170 ${yl} C210 ${yl} 220 ${yh} 262 ${yh} L392 ${yh} L392 ${SEA} Z" fill="${C.am}" fill-opacity="0.18" stroke="${C.am}" stroke-width="1.5"/>`;
      s += L(8, Y(alt), 392, Y(alt), C.mut, 1.5, '6 4') + T(12, Y(alt) - 22, `高度 MSL ${fmt(alt)} ft（左右とも同じ）`, { c: C.ink, b: 1, a: 'start', fs: 12 });
      s += plane(110, Y(alt), 0.36) + plane(310, Y(alt), 0.36);
      // AGL and elevation on each side
      const dim = (x, y1, y2, c) => A(x, y1 + 6, x, y2 - 1, c, 2) + A(x, y2 - 6, x, y1 + 1, c, 2);
      s += dim(92, Y(alt) + 8, yl, C.gr) + T(100, (Y(alt) + yl) / 2 + 4, `AGL ${fmt(alt - lowT)} ft`, { c: C.gr, b: 1, a: 'start', fs: 12, halo: 1 });
      s += dim(292, Y(alt) + 8, yh, C.gr) + T(300, (Y(alt) + yh) / 2 + 4, `AGL ${fmt(alt - highT)} ft`, { c: C.gr, b: 1, a: 'start', fs: 12, halo: 1 });
      s += T(60, SEA - 6, `標高 ${fmt(lowT)} ft`, { c: C.am, fs: 12 }) + T(330, (yh + SEA) / 2 + 4, `標高 ${fmt(highT)} ft`, { c: C.am, b: 1, fs: 12 });
      s += T(200, SEA + 18, '平均海面（MSL の 0 ft）', { c: C.cy, fs: 12 });
      s += T(200, SEA + 38, 'AGL ＝ MSL の高度 − 真下の地形の標高', { c: C.ink, b: 1, fs: 12 });
      return svg(400, 286, s, `図：MSL ${fmt(alt)} ft を保って飛んでも、真下の地形の標高が変わると AGL が変わります（標高 ${fmt(lowT)} ft の上で ${fmt(alt - lowT)} ft、${fmt(highT)} ft の上で ${fmt(alt - highT)} ft）`);
    },

    // basics.rules — the two axes: the rules a flight follows (VFR/IFR) and the weather (VMC/IMC)
    basicsRules() {
      const cx = [76, 238], cw = 156, ry = [58, 152], rh = 88;
      let s = T(40, 30, '方式＼天気', { c: C.mut, fs: 12 });
      s += BOX(cx[0], 8, cw, 42, C.mut, 'VMC', [], { ty: 18 }) + T(cx[0] + cw / 2, 40, '外がよく見える天気', { c: C.ink, fs: 12 });
      s += BOX(cx[1], 8, cw, 42, C.mut, 'IMC', [], { ty: 18 }) + T(cx[1] + cw / 2, 40, '雲の中・視程が悪い', { c: C.ink, fs: 12 });
      s += BOX(8, ry[0], 62, rh, C.cy, 'VFR', [], { ty: rh / 2 + 5 }) + BOX(8, ry[1], 62, rh, C.vi, 'IFR', [], { ty: rh / 2 + 5 });
      const cell = (i, j, c, title, lines) => BOX(cx[j], ry[i], cw, rh, c, title, lines, { ty: 26, ly: 50 });
      s += cell(0, 0, C.gr, 'ふつうの VFR', ['外を見て、ほかの機と', '地形を自分で避ける']);
      s += cell(0, 1, C.rd, 'してはいけない', ['VFR で雲に入らない。', '入る前に引き返す']);
      s += cell(1, 0, C.cy, 'できる', ['IFR でも晴れていれば', '外を見張って避ける']);
      s += cell(1, 1, C.vi, 'できる（条件つき）', ['資格・装備・承認が要る。', '最低気象条件もある']);
      return svg(400, 250, s, '図：飛行方式（VFR・IFR）と気象状態（VMC・IMC）は別の軸です。IFR は晴れた日にも飛び、VFR で雲に入ってはいけません');
    },

    // basics.docs — the four questions to ask before using a number from a document
    basicsDocs() {
      const q = [['① 何の値か', ['速度・高度・方位・時刻', 'のどれか'], C.cy], ['② どの基準か', ['IAS か GS か', 'MSL か AGL か・真か磁か'], C.am],
        ['③ いつの情報か', ['発表の時刻・有効な時間', '資料の版'], C.gr], ['④ 誰に確かめるか', ['教官・管制・整備', '学校の手順'], C.vi]];
      let s = T(200, 22, '資料は「その機体の・新しい版の」ものを使う', { c: C.ink, b: 1, fs: 13 });
      q.forEach(([t, lines, c], i) => { const x = 8 + (i % 2) * 196, y = 38 + Math.floor(i / 2) * 92; s += BOX(x, y, 188, 82, c, t, lines, { ty: 24, ly: 48 }); });
      return svg(400, 226, s, '図：資料の数字を使う前の 4 つの確認。何の値か・どの基準か・いつの情報か・誰に確かめるか');
    },

    // basics.case — the worked case (fictional: the LAB airport and a point 60 NM east of it)
    basicsCase() {
      const dist = 60, tas = 110, wind = 20, gs = tas - wind, min = dist / gs * 60;
      // departure 10:00 EDT = 1400Z (EDT = UTC−4); the arrival's hour and minute are computed from the minutes
      const p2 = n => String(n).padStart(2, '0'), dep = 14 * 60, arr = dep + Math.round(min), EDT = -4;
      const zulu = m => `${p2(Math.floor(m / 60) % 24)}${p2(m % 60)}Z`, edt = m => `${(Math.floor(m / 60) + EDT + 24) % 24}:${p2(m % 60)} EDT`;
      const A0 = [56, 96], B0 = [344, 96];
      let s = NFN(392, 18);
      s += L(A0[0], A0[1], B0[0], B0[1], C.cy, 2.5, '7 4');
      s += `<circle cx="${A0[0]}" cy="${A0[1]}" r="9" fill="${C.cy}" fill-opacity="0.3" stroke="${C.cy}" stroke-width="2"/>` + T(A0[0], A0[1] + 28, 'LAB（出発）', { c: C.cy, b: 1, fs: 12 });
      s += `<circle cx="${B0[0]}" cy="${B0[1]}" r="9" fill="${C.gr}" fill-opacity="0.3" stroke="${C.gr}" stroke-width="2"/>` + T(B0[0], B0[1] + 28, '目的地', { c: C.gr, b: 1, fs: 12 });
      s += T(200, 88, `真東へ ${dist} NM`, { c: C.cy, b: 1, fs: 12, halo: 1 });
      s += A(300, 54, 220, 54, C.am, 3) + T(260, 42, `風 090° / ${wind} kt（向かい風）`, { c: C.am, b: 1, fs: 12 });
      s += `<path d="M232 150 a10 10 0 0 1 6 -18 a13 13 0 0 1 25 -3 a9 9 0 0 1 12 13 Z" fill="${C.mut}" fill-opacity="0.35" stroke="${C.mut}"/>` + T(254, 168, '雲が低くなる予報', { c: C.mut, fs: 12 });
      s += BOX(8, 176, 384, 70, C.vi, '', []);
      s += T(20, 198, `TAS ${tas} kt − 向かい風 ${wind} kt → GS ${gs} kt`, { c: C.ink, a: 'start', fs: 12 });
      s += T(20, 218, `${dist} ÷ ${gs} × 60 ＝ ${min} 分`, { c: C.ink, a: 'start', fs: 12 });
      s += T(20, 238, `${zulu(dep)}（${edt(dep)}）に出ると、${zulu(arr)}（${edt(arr)}）`, { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 256, s, `図：総合例題の区間（架空）。LAB から真東へ ${dist} NM、真東からの風 ${wind} kt。計算できるのは GS と時間と時刻で、雲の予報だけでは VFR で行けるかは決まりません`);
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
