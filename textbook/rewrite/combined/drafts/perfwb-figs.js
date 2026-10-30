// DRAFT (W16, R2) — the figures and the two calculators of Part 1's chapters 'perf'「性能」 and 'wb'「重量と重心」
// (textbook/rewrite/combined/DESIGN.md 3.3 第 1 部 第 8・9 章). No product reads this file: it is checked with the
// chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/perfwb-figs.js textbook/rewrite/combined/drafts/perfwb.js
// and, when the chapters are registered, its functions go into flight-lab/src/book-figs.js (FIG and CALC) as they are
// (same keys, same helpers there: C, svg, T, L, A, P, TL, frame, planeSide, PLANE, ARCHER_WB). Until then the few
// helpers they need are repeated here.
//
// What is here (one function per figure; the caption says what to look at, never where it was redrawn from):
//   new     perfChartRead  perf.chart — how a combined graph of the POH is read (a schematic of the Archer III POH
//                          Fig. 5-35 Landing Performance with its own example: 21 ℃, 2,500 ft, 2,240 lb, headwind
//                          5 kt → 1,290 ft over a 50 ft barrier). Only the example's inputs and result are numbers; the
//                          lines are schematic (not to scale). Same type as PHAK 25C Fig. 11-23.
//   new     climbGradient  perf.climb — the basic course's ch06-fig6-8 redrawn with the book's numbers: the same rate
//                          of climb 500 fpm gives 500 ft/NM at a groundspeed of 60 kt and 300 ft/NM at 100 kt
//                          (gradient = rate × 60 ÷ GS: the formula of the text).
//   new     rangeWind      perf.range — the basic course's ch06-fig6-9 redrawn with the Archer III POH's cruise
//                          tables (Fig. 5-20・5-20a・5-20b, 4,000 ft, ISA −15 ℃, 2,550 lb, wheel pants: 106・115・123
//                          KTAS at 8.2・9.5・11.0 GPH): NM per US gal with no wind and with a 20 kt headwind.
//   new     perfPlanChain  perf.plan — the checks of one flight in order (takeoff → climb → cruise and fuel → landing →
//                          go-around) with the numbers of the section's worked example.
//   new     wbChecks       perf.wb — the basic course's ch05-fig5-1 redrawn for the Archer: total weight, CG,
//                          and the limits of each place are three separate checks (POH 2.11・2.13・2.25・7.27).
//   new     wbLimits       wb.limits — the Archer III's weights on one bar (POH 1.11・1.19・2.11, Fig. 6-5・6-9;
//                          the empty weight 1,640 lb is the book's example of ARCHER_WB).
//   new     wbLoadingGraph wb.graph — the POH's Loading Graph (Fig. 6-13) drawn from the POH arms (front seats 80.5,
//                          fuel 95.0, rear seats 118.1, baggage 142.8 in; baggage to 200 lb, fuel to 48 gal = 288 lb).
//   new     wbShift        wb.shift — the basic course's ch05-fig5-8 redrawn with the book's example ① → ②: one rear
//                          passenger (170 lb) moved from 118.1 to 80.5 in moves the CG from 93.8 to 91.2 in.
//   redrawn takeoffDistance perf.tol — the same drawing as book-figs.js with the Archer III POH's own example in place of
//                          the Archer TX value (ground roll 1,073 ft: Fig. 5-11; over a 50 ft barrier 1,907 ft: Fig.
//                          5-7, both at 2,000 ft, 23 ℃, 2,400 lb, headwind 8 kt) and FL.terms' name 滑走距離 for the
//                          ground roll (「地上滑走」 is taxiing in JCAB's words).
//   redrawn densityAltitude perf.da — the same drawing as book-figs.js; the heading says 規正値 29.92 inHg (高度計's first
//                          use in the chapter is then in the text, with its English).
//   redrawn wbStations     perf.wb — the same drawing as book-figs.js; only the heading says アーム（arm）, so that the
//                          term's first use in the chapter has its English (check-style's first-use form reads figures).
// The calculators (book-figs.js CALC; DESIGN 3.3 perf.da・perf.wbex, 4.1「計算機 … da に hPa、wb に手荷物とランプ重量」):
//   da   the altimeter setting in inHg or hPa (a unit switch that converts the number), the formula said under it;
//   wb   the empty weight's arm can be changed (each airplane has its own), fuel in US gal (× 6 lb), the ramp weight,
//        the 8 lb of start/taxi/run-up fuel and the takeoff weight and CG (POH Fig. 6-9), and the checks one by one:
//        ramp ≤ 2,558, takeoff ≤ 2,550, baggage ≤ 200, fuel ≤ 48 gal, the takeoff CG in the envelope; the utility
//        category's conditions shown as a note. ARCHER_WB keeps its rows and functions (example(), fwd()) and gains
//        the POH's numbers it uses (ramp, taxi, bagMax, fuelMaxGal, utility).
// Every number drawn here is one the text gives with its source (perfwb.claims.json); text ≥ 12 (≥ 10 px at 390 px).
//
// revise-perfwb (2026-10-30; reports/revise-perfwb.md):
//   redrawn fuelPlan       perf.fuel — the climb from POH Fig. 5-17 (2 gal, 12 NM, start/taxi/takeoff fuel included) and
//                          the cruise over the remaining 108 NM (the text's new example); replaces book-figs.js's fuelPlan.
//   redrawn wbEnvelope     perf.wbex — ③ is the landing (② − 8 lb start/taxi fuel − 20 gal = 2,302 lb, 90.9 in), as the
//                          text and the written answers say; replaces book-figs.js's wbEnvelope. ARCHER_WB.example() is
//                          not changed (its ③ is ramp − 20 gal; nothing reads it now but the old perf.wbex).
//   perfChartRead          the reference lines drawn thick and labelled, a legend for them and the guide lines;
//   takeoffDistance        the midpoint labelled with its distance, the caption says AIM 7-6-8 is for unimproved airports;
//   perfPlanChain          ≒ 2,479 ft; ⑤ carburetor heat OFF (AFH ch. 9);
//   wbLimits               the caption says the example airplane cannot carry four 170 lb people and full fuel (POH 6.1
//                          adds maximum baggage); 地上で使う燃料 in place of 地上走行;
//   wbLoadingGraph         the fuel line's label moved off the dashed 340 lb reading line;
//   rangeWind              the caption opens ISA −15 ℃ (−8 ℃ at 4,000 ft) and says wheel pants;
//   densityAltitude        the 15 ℃ row rounds to 10 ft (約 70 ft, not 約 100 ft);
//   CALC.da                hPa to 0.1 (1013.2 for 29.92, not 1013);
//   CALC.wb                no CG range above 2,550 lb (the row shows —, not a forward limit extended past the POH's
//                          line); 地上滑走 (FL.terms) for taxi.
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  const DEG = Math.PI / 180;
  // the colours and helpers of book-figs.js (same values)
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''} ${o.rot ? `transform="rotate(${o.rot} ${x} ${y})"` : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const P = (pts, c, w = 2, fill = 'none', dash = '') => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}" stroke="${c}" stroke-width="${w}" fill="${fill}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const frame = (w, h, x0, x1, y0, y1, xt, yt, xl, yl, m = { l: 50, r: 14, t: 14, b: 36 }) => {
    const X = v => m.l + (v - x0) / (x1 - x0) * (w - m.l - m.r), Y = v => h - m.b - (v - y0) / (y1 - y0) * (h - m.t - m.b);
    let s = '';
    for (const v of xt) s += L(X(v), m.t, X(v), h - m.b, C.grid, 1) + T(X(v), h - m.b + 16, v, { c: C.mut, fs: 12 });
    for (const v of yt) s += L(m.l, Y(v), w - m.r, Y(v), C.grid, 1) + T(m.l - 6, Y(v) + 4, v.toLocaleString ? v.toLocaleString() : v, { c: C.mut, fs: 12, a: 'end' });
    s += T((m.l + w - m.r) / 2, h - 4, xl, { c: C.mut, fs: 12 }) + T(14, (m.t + h - m.b) / 2, yl, { c: C.mut, fs: 12, rot: -90 });
    return { X, Y, s };
  };
  const box = (x, y, w, h, c, title, lines = [], o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`
    + T(x + w / 2, y + 19, title, { c: o.tc || c, b: 1, fs: 13 }) + (lines.length ? TL(x + w / 2, y + 37, lines, { c: C.ink, fs: 12, lh: 15 }) : '');
  const PLANE = '#dfe6ee', PLANE2 = '#9fb3c8', GLASS = '#5d7fa3';
  const planeSide = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${-(o.pitch || 0)}) scale(${k})">`
    + `<path d="M50 -1 C48 -8 38 -11 26 -12 L14 -16 C2 -18 -10 -16 -18 -12 L-50 -5 L-50 1 L-14 6 C6 8 30 7 44 5 C49 4 51 2 50 -1 Z" fill="${PLANE}"/>`
    + `<path d="M12 -15 C4 -17 -6 -16 -14 -12 L-12 -9 L10 -9 Z" fill="${GLASS}"/><path d="M-38 -6 L-50 -27 L-57 -27 L-54 -3 Z" fill="${PLANE}"/>`
    + `<rect x="-60" y="-4" width="20" height="3.5" rx="1.5" fill="${PLANE2}"/><ellipse cx="6" cy="5" rx="19" ry="2.6" fill="${PLANE2}"/>`
    + `<path d="M2 7 L0 15 M40 5 L40 15" stroke="${PLANE2}" stroke-width="2"/><circle cx="0" cy="16" r="3.4" fill="#5b6b7e"/><circle cx="40" cy="16" r="3" fill="#5b6b7e"/>`
    + `<line x1="52" y1="-15" x2="52" y2="13" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;

  // ---------------------------------------------------------------- the Archer III's weight data (book-figs.js ARCHER_WB)
  // The rows, env, max, fwd() and example() stay as they are in book-figs.js (the worked example of perf.wbex and the
  // figures read them); the POH numbers the improved calculator and the wb chapter use are added: maximum ramp weight
  // 2,558 lb, start/taxi/run-up fuel 8 lb at 95.0 in, baggage 200 lb, usable fuel 48 US gal at 6 lb/gal (POH 1.11・2.11・
  // 2.21, Fig. 6-9), and the utility category (2,138 / 2,130 lb, no baggage or rear passengers, forward limit 83.0 in at
  // 2,130 lb: POH 2.11・2.13, Fig. 6-9).
  const CALC = FL.bookCalc || (FL.bookCalc = {});
  const W = CALC.ARCHER_WB;
  if (W) Object.assign(W, {
    ramp: 2558, taxiFuel: 8, bagMax: 200, fuelMaxGal: 48, lbPerGal: 6,
    utility: { ramp: 2138, max: 2130, bagMax: 0, fwd: w => (w <= 2050 ? 82.0 : 82.0 + (w - 2050) / 80 * 1.0) },
  });

  Object.assign(FL.bookFigs, {
    // perf.da — the same drawing as book-figs.js; only the heading says 規正値 … inHg (so that 高度計's first use in the
    // chapter is in the text with its English: check-style's first-use form reads the figures)
    densityAltitude() {
      const P = FL.physics, s = P.newState({ aircraft: 'pa28' }), vy = FL.physics.AIRCRAFT.find(a => a.id === 'pa28').v.y, elev = P.GROUND_FT, isa = 15 - 2 * elev / 1000;
      const rows = [15, 25, 33, 38].map(t => { const da = elev + 120 * (t - isa); return { t, da, fpm: P.steadyState(s, vy, null, { pwr: 'full', altFt: Math.max(da, 0) }).fpm }; });
      const X = ft => 96 + ft / 3000 * 160, r100 = v => (Math.round(v / 100) * 100).toLocaleString(), r10 = v => Math.round(v / 10) * 10;
      let s0 = T(12, 20, `同じ LAB（標高 ${elev} ft・規正値 29.92 inHg）で`, { c: C.ink, b: 1, a: 'start', fs: 13 });
      s0 += T(96, 44, '密度高度', { c: C.am, b: 1, a: 'start', fs: 12 }) + T(392, 44, '上昇率（fpm）', { c: C.cy, b: 1, a: 'end', fs: 12 });
      for (const v of [0, 1000, 2000, 3000]) s0 += L(X(v), 52, X(v), 238, C.grid, 1) + T(X(v), 254, v.toLocaleString(), { c: C.mut, fs: 12 });
      rows.forEach((r, i) => {
        const y = 62 + i * 44, w = Math.max(X(r.da) - X(0), 3), hot = r.t >= 33;
        s0 += T(12, y + 21, `気温 ${r.t}℃`, { c: hot ? C.rd : C.ink, b: 1, a: 'start', fs: 12 }) + `<rect x="${X(0)}" y="${y + 6}" width="${w.toFixed(1)}" height="22" rx="4" fill="${C.am}" fill-opacity="${0.25 + i * 0.18}"/>`;
        s0 += T(X(0) + w + 6, y + 22, `約 ${r.da < 500 ? r10(r.da).toLocaleString() : r100(r.da)} ft`, { c: C.ink, a: 'start', fs: 12 }) + T(392, y + 22, `約 ${r10(r.fpm)}`, { c: C.cy, a: 'end', fs: 12 });
      });
      s0 += T(196, 272, '密度高度（ft）＝空気の濃さが同じになる標準大気の高さ', { c: C.mut, fs: 12 });
      return svg(400, 284, s0, `図：暑い日ほど空気が薄く、密度高度が高くなり、上昇率が下がります。密度高度は本書の概算式、上昇率は教材モデル（${Math.round(s.AC.mass * 2.20462).toLocaleString()} lb・全開・Vy ${vy} KIAS）の計算値です`);
    },
    // perf.tol — the two distances of the Archer III POH's own example, on LAB RWY 36 (heights exaggerated); AIM 7-6-8's midpoint
    takeoffDistance() {
      const len = Math.round(FL.physics.LAB_RWY.len * 3.28084), roll = 1073, over50 = 1907, X = ft => 20 + ft / len * 372, yG = 176;
      let s = `<rect x="${X(0)}" y="${yG}" width="${X(len) - X(0)}" height="10" fill="#3a4656"/>` + L(X(0), yG + 5, X(len), yG + 5, '#f2f2f2', 1.5, '10 8');
      s += T(X(len / 2), yG + 30, `LAB RWY 36：${len.toLocaleString()} ft（${FL.physics.LAB_RWY.len.toLocaleString()} m）`, { c: C.ink, b: 1, fs: 12 });
      const xl = X(roll), xo = X(over50);
      s += A(X(0) + 4, yG - 8, xl - 2, yG - 8, C.am, 3) + T((X(0) + xl) / 2, yG - 16, `滑走 ${roll.toLocaleString()} ft`, { c: C.am, b: 1, fs: 12 });
      s += `<path d="M${xl} ${yG - 6} Q ${(xl + xo) / 2 + 10} ${yG - 8} ${xo} ${yG - 54} L ${xo + 12} ${yG - 62}" stroke="${C.cy}" stroke-width="3" fill="none"/>` + planeSide(xo + 19, yG - 67, 0.26, { pitch: 28 });
      s += `<rect x="${xo - 3}" y="${yG - 50}" width="6" height="50" fill="${C.rd}"/>` + T(xo - 8, yG - 58, '50 ft の高さ', { c: C.rd, a: 'end', fs: 12 });
      s += L(X(0), 66, X(0), yG, C.mut, 1, '3 3') + L(xo, 66, xo, yG - 50, C.mut, 1, '3 3') + A(X(0) + 2, 72, xo - 2, 72, C.cy, 2) + A(xo - 2, 72, X(0) + 2, 72, C.cy, 2);
      s += T((X(0) + xo) / 2, 64, `50 ft を越えるまで ${over50.toLocaleString()} ft`, { c: C.cy, b: 1, fs: 12 });
      const xm = X(len / 2);
      s += L(xm, 82, xm, yG + 12, C.vi, 2, '6 4') + L(xm, 86, xm + 32, 86, C.vi, 1.5) + TL(xm + 36, 90, [`中間点（約 ${(Math.round(len / 20) * 10).toLocaleString()} ft）：`, '浮揚速度の 70% に', '届かなければ中止'], { c: C.vi, a: 'start', fs: 12 });
      s = T(12, 22, '50 ft を越える距離は、滑走の分を含む', { c: C.ink, b: 1, a: 'start', fs: 13 }) + T(12, 40, `2 つの数字は足さない（${roll.toLocaleString()} ＋ ${over50.toLocaleString()} ではない）`, { c: C.am, a: 'start', fs: 12 }) + T(12, 58, '（高さは強調して描いています）', { c: C.mut, a: 'start', fs: 12 }) + `<g transform="translate(0 24)">${s}</g>`;
      return svg(400, 242, s, `図：POH の図の例（気圧高度 2,000 ft・23℃・2,400 lb・向かい風 8 kt）の 2 つの距離を、LAB の滑走路に重ねたもの。滑走は ${roll.toLocaleString()} ft、50 ft を越えるまでは ${over50.toLocaleString()} ft です。紫の線は滑走路の中間点で、米国の AIM 7-6-8 が舗装していない空港のために示す目安（浮くまでの距離だけを見る）を、説明のために重ねたものです`);
    },
    // perf.chart — reading a combined graph: OAT → pressure altitude → reference line → weight → reference line → wind → distance
    perfChartRead() {
      const yT = 62, yB = 236, p1 = [14, 150], p2 = [160, 262], p3 = [272, 352];
      const X1 = t => p1[0] + (t + 20) / 70 * (p1[1] - p1[0]), XW = w => p2[0] + (2550 - w) / 550 * (p2[1] - p2[0]), XK = k => p3[0] + k / 15 * (p3[1] - p3[0]);
      // schematic lines: pressure altitude (rising to the right), weight and wind guide lines (falling to the right)
      const pa = (k, x) => 200 - k * 34 - (x - p1[0]) * 0.45, guide = (y0, x, a, b, drop) => y0 + (x - a) / (b - a) * drop;
      let s = T(12, 20, '組み合わせの図は、線をたどって読む', { c: C.ink, b: 1, a: 'start', fs: 13 }) + T(12, 38, '（POH の着陸距離の図の例。線は模式図）', { c: C.mut, a: 'start', fs: 12 });
      for (const [a, b] of [p1, p2, p3]) s += `<rect x="${a}" y="${yT}" width="${b - a}" height="${yB - yT}" fill="${C.cy}" fill-opacity="0.05" stroke="${C.mut}" stroke-width="1"/>`;
      for (const k of [0, 1, 2]) s += L(p1[0] + 4, pa(k, p1[0] + 4).toFixed(1), p1[1] - 4, pa(k, p1[1] - 4).toFixed(1), C.am, k === 1 ? 2.5 : 1.2);
      s += TL(102, 198, ['太い線は', '2,500 ft'], { c: C.am, b: 1, a: 'start', fs: 12, lh: 15 }) + T(p1[0] + 6, yT + 14, '気圧高度の線', { c: C.am, a: 'start', fs: 12 });
      for (const y0 of [90, 125, 160, 195]) s += L(p2[0], y0, p2[1], guide(y0, p2[1], p2[0], p2[1], 40).toFixed(1), C.mut, 1, '4 3');
      for (const y0 of [110, 150, 190]) s += L(p3[0], y0, p3[1], guide(y0, p3[1], p3[0], p3[1], 48).toFixed(1), C.mut, 1, '4 3');
      // the example's path (POH Fig. 5-35: 21 ℃, 2,500 ft, 2,240 lb, headwind 5 kt → 1,290 ft)
      const x21 = X1(21), yPA = pa(1, x21), xw = XW(2240), yw = guide(yPA, xw, p2[0], p2[1], 40), xk = XK(5), yk = guide(yw, xk, p3[0], p3[1], 48);
      s += P([[x21, yB], [x21, yPA], [p2[0], yPA], [xw, yw], [p3[0], yw], [xk, yk], [p3[1], yk]], C.gr, 2.5) + A(p3[1] - 2, yk, p3[1] + 24, yk, C.gr, 2.5);
      s += `<circle cx="${x21.toFixed(1)}" cy="${yPA.toFixed(1)}" r="4" fill="${C.gr}"/><circle cx="${xw.toFixed(1)}" cy="${yw.toFixed(1)}" r="4" fill="${C.gr}"/><circle cx="${xk.toFixed(1)}" cy="${yk.toFixed(1)}" r="4" fill="${C.gr}"/>`;
      s += T(x21 - 6, yB - 12, '①', { c: C.gr, b: 1, a: 'end', fs: 13, halo: 1 }) + T(xw + 4, yw + 20, '②', { c: C.gr, b: 1, fs: 13, halo: 1 }) + T(xk + 4, yk + 20, '③', { c: C.gr, b: 1, fs: 13, halo: 1 });
      s += TL(394, yk - 26, ['距離', '1,290 ft'], { c: C.gr, b: 1, a: 'end', fs: 12, lh: 15, halo: 1 });
      s += T((p1[0] + p1[1]) / 2, yB + 18, '① 外気温 21℃', { c: C.ink, fs: 12 }) + T((p2[0] + p2[1]) / 2, yB + 18, '② 2,240 lb', { c: C.ink, fs: 12 }) + T((p3[0] + p3[1]) / 2, yB + 18, '③ 5 kt', { c: C.ink, fs: 12 });
      s += T((p1[0] + p1[1]) / 2, yB + 36, '外気温（℃）', { c: C.mut, fs: 12 }) + T((p2[0] + p2[1]) / 2, yB + 36, '重量（lb）', { c: C.mut, fs: 12 }) + T((p3[0] + p3[1]) / 2, yB + 36, '向かい風（kt）', { c: C.mut, fs: 12 });
      // the reference lines (the left edges of panels 2 and 3) drawn thick and labelled; a legend for them and the guide lines
      s += L(p2[0], yT, p2[0], yB, C.vi, 3) + L(p3[0], yT, p3[0], yB, C.vi, 3);
      s += T(p2[0] + 5, yT + 14, '基準の線', { c: C.vi, b: 1, a: 'start', fs: 12, halo: 1 }) + T(p3[0] + 5, yT + 14, '基準の線', { c: C.vi, b: 1, a: 'start', fs: 12, halo: 1 });
      s += L(18, 286, 18, 302, C.vi, 3) + T(28, 299, '基準の線：区画の左の縁の縦の線', { c: C.vi, a: 'start', fs: 12 });
      s += L(12, 324, 28, 312, C.mut, 1.5, '4 3') + T(36, 323, '案内線：斜めの点線。あいだは近い線と平行に進む', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 334, s, '図：POH の組み合わせの図の読み方（模式図）。外気温 21℃ から上へ、気圧高度 2,500 ft の線で右へ、基準の線（縦の線）から案内線（斜めの点線）と平行に重量 2,240 lb まで、また右へ、向かい風 5 kt まで平行に進むと、50 ft の高さから止まるまで 1,290 ft です（Archer III の POH の図 5-35 の例）');
    },
    // perf.climb — the same rate of climb, two groundspeeds: the gradient over the ground (ft per NM)
    climbGradient() {
      const f = frame(400, 270, 0, 2, 0, 1100, [0, 0.5, 1, 1.5, 2], [0, 250, 500, 750, 1000], '進んだ地面の距離（NM）', '高さ（ft）', { l: 54, r: 14, t: 52, b: 40 });
      let s = f.s + P([[f.X(0), f.Y(0)], [f.X(2), f.Y(1000)]], C.gr, 3) + P([[f.X(0), f.Y(0)], [f.X(2), f.Y(600)]], C.am, 3);
      s += `<rect x="${f.X(1.2) - 4}" y="${f.Y(450)}" width="8" height="${(f.Y(0) - f.Y(450)).toFixed(1)}" fill="${C.rd}"/>` + T(f.X(1.2) - 8, f.Y(170), '障害物', { c: C.rd, a: 'end', fs: 12 });
      s += T(f.X(1.05), f.Y(640), '向かい風：GS 60 kt', { c: C.gr, b: 1, a: 'end', fs: 12, halo: 1 }) + T(f.X(1.05), f.Y(640) + 16, '1 NM で 500 ft', { c: C.gr, a: 'end', fs: 12, halo: 1 });
      s += T(f.X(1.98), f.Y(390), '追い風：GS 100 kt', { c: C.am, b: 1, a: 'end', fs: 12, halo: 1 }) + T(f.X(1.98), f.Y(390) + 16, '1 NM で 300 ft', { c: C.am, a: 'end', fs: 12, halo: 1 });
      s += T(12, 20, 'どちらも上昇率は 500 fpm', { c: C.ink, b: 1, a: 'start', fs: 13 }) + T(12, 38, '勾配（ft/NM）＝上昇率 × 60 ÷ 対地速度', { c: C.cy, a: 'start', fs: 12 });
      return svg(400, 270, s, '図：同じ上昇率 500 fpm でも、対地速度が 60 kt なら 1 NM で 500 ft、100 kt なら 300 ft しか上がりません。地面の障害物を越えられるかは、上昇率ではなく地面に対する勾配で決まります');
    },
    // perf.range — NM per US gal at the POH's three cruise powers (4,000 ft, ISA −15 ℃), with no wind and with a 20 kt headwind
    rangeWind() {
      const rows = [['55%', 106, 8.2, 'best economy'], ['65%', 115, 9.5, 'best economy'], ['75%', 123, 11.0, 'best power']];
      const X = v => 96 + v / 14 * 280, wind = 20;
      let s = T(12, 20, '燃料 1 gal で進める距離（NM）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      for (const v of [0, 2, 4, 6, 8, 10, 12, 14]) s += L(X(v), 34, X(v), 238, C.grid, 1) + T(X(v), 254, v, { c: C.mut, fs: 12 });
      rows.forEach(([lab, tas, gph, mix], i) => {
        const y = 42 + i * 66, a = tas / gph, b = (tas - wind) / gph;
        s += T(12, y + 14, `出力 ${lab}`, { c: C.ink, b: 1, a: 'start', fs: 12 }) + TL(12, y + 30, [`${tas} kt`, `${gph.toFixed(1)} gph`], { c: C.mut, a: 'start', fs: 12, lh: 14 });
        s += `<rect x="${X(0)}" y="${y}" width="${(X(a) - X(0)).toFixed(1)}" height="20" rx="3" fill="${C.cy}" fill-opacity="0.55"/>` + T(X(a) + 6, y + 15, a.toFixed(1), { c: C.cy, b: 1, a: 'start', fs: 12 });
        s += `<rect x="${X(0)}" y="${y + 24}" width="${(X(b) - X(0)).toFixed(1)}" height="20" rx="3" fill="${C.am}" fill-opacity="0.55"/>` + T(X(b) + 6, y + 39, b.toFixed(1), { c: C.am, b: 1, a: 'start', fs: 12 });
        s += T(X(0) + 6, y + 15, mix, { c: C.bg, a: 'start', fs: 12 });
      });
      s += `<rect x="96" y="266" width="12" height="12" fill="${C.cy}" fill-opacity="0.55"/>` + T(112, 276, '無風', { c: C.ink, a: 'start', fs: 12 }) + `<rect x="170" y="266" width="12" height="12" fill="${C.am}" fill-opacity="0.55"/>` + T(186, 276, `向かい風 ${wind} kt`, { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 288, s, `図：Archer III の POH の巡航の表（気圧高度 4,000 ft・標準より 15℃ 低い日（約 −8℃）・2,550 lb・ホイールパンツ付き）の 3 つの出力で、燃料 1 US gal あたりに進める距離。速い出力ほど 1 gal で進める距離は短く、向かい風 ${wind} kt ではどれも短くなります（真対気速度 − 風 ＝ 対地速度で計算）`);
    },
    // perf.plan — the checks of one flight, in the order they are flown, with the section's worked example
    perfPlanChain() {
      const items = [
        ['① 離陸', ['1,907 × 1.3', '≒ 2,479 ft'], '3,900 ft'],
        ['② 上昇の勾配', ['487 × 60 ÷ 70', '≒ 417 ft/NM'], '300 ft/NM'],
        ['③ 巡航と燃料', ['時間 × 燃料流量', '＋予備'], '使える 48 gal'],
        ['④ 着陸', ['1,290 × 1.3', '＝ 1,677 ft'], '2,600 ft'],
        ['⑤ 着陸復行', ['全開・ヒーター OFF', 'フラップ 25°・64 KIAS'], '上昇できるか'],
      ];
      let s = T(12, 20, '1 つの数字で終わらず、飛ぶ順に全部確かめる', { c: C.ink, b: 1, a: 'start', fs: 13 });
      items.forEach(([t, lines, cmp], i) => {
        const col = i % 2, row = Math.floor(i / 2), x = 14 + col * 194, y = 36 + row * 84, w = 178;
        s += box(x, y, w, 72, i === 4 ? C.am : C.cy, t, lines) + T(x + w - 6, y + 66, `比べる：${cmp}`, { c: C.gr, a: 'end', fs: 12 });
        if (i < items.length - 1 && col === 0) s += A(x + w + 2, y + 36, x + w + 14, y + 36, C.mut, 2);
      });
      s += TL(208, 216, ['気温・風・重量が変わったら、', '①から順に計算し直す'], { c: C.am, a: 'start', fs: 12, lh: 16 });
      return svg(400, 290, s, '図：1 回の飛行の性能を、飛ぶ順に確かめる（この節の総合演習の数字。比べる値の滑走路の長さと勾配は仮の値）。離陸と着陸の距離は POH の図の例の値に、学校の決まりの例として 1.3 倍の余裕をかけています');
    },
    // perf.wb — three separate checks: the total weight, the CG, and each place's own limit
    wbChecks() {
      let s = T(12, 20, '重さ・重心・場所の決まりは、別々に確かめる', { c: C.ink, b: 1, a: 'start', fs: 13 });
      s += box(14, 34, 118, 112, C.cy, '① 重さの合計', ['離陸の重さは', '2,550 lb 以下', '（ランプは', '2,558 lb 以下）']);
      s += box(141, 34, 118, 112, C.gr, '② 重心の位置', ['重さに応じた', '範囲の中', '（82.0〜93.0 in', 'の間で決まる）']);
      s += box(268, 34, 118, 112, C.am, '③ 場所の決まり', ['手荷物は', '200 lb まで', 'ベルトで固定', '席は決まった所']);
      s += A(73, 150, 170, 190, C.mut, 2) + A(200, 150, 200, 186, C.mut, 2) + A(327, 150, 230, 190, C.mut, 2);
      s += `<rect x="110" y="194" width="180" height="40" rx="8" fill="${C.gr}" fill-opacity="0.18" stroke="${C.gr}" stroke-width="2"/>` + T(200, 219, '3 つともそろって OK', { c: C.gr, b: 1, fs: 13 });
      s += TL(200, 256, ['1 つが合っても、ほかが合うとは限らない', '（重心が範囲の中でも、重すぎることがある）'], { c: C.ink, fs: 12, lh: 16 });
      return svg(400, 286, s, '図：Archer III の積み方は、重さの合計・重心の位置・場所ごとの決まりの 3 つを別々に確かめます（数字は POH の値）。どれか 1 つが合っていても、ほかの 2 つが合っているとは限りません');
    },
    // wb.limits — the Archer III's weights on one bar
    wbLimits() {
      const X = lb => 20 + lb / 2700 * 360, bew = W ? W.rows[0][1] : 1640, ramp = 2558, tow = 2550, util = 2130;
      let s = T(12, 20, 'Archer III の重さの決まり（普通類）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      for (const v of [0, 500, 1000, 1500, 2000, 2500]) s += L(X(v), 112, X(v), 120, C.mut, 1.5) + T(X(v), 136, v.toLocaleString(), { c: C.mut, fs: 12 });
      s += L(X(0), 112, X(2700), 112, C.mut, 1.5) + T(390, 152, '重さ（lb）', { c: C.mut, a: 'end', fs: 12 });
      s += L(X(util), 62, X(util), 112, C.am, 2, '5 4') + T(X(util) - 4, 64, `実用類 ${util.toLocaleString()}`, { c: C.am, a: 'end', fs: 12 });
      s += `<rect x="${X(0)}" y="72" width="${(X(bew) - X(0)).toFixed(1)}" height="36" fill="${C.mut}" fill-opacity="0.45"/>` + T((X(0) + X(bew)) / 2, 95, `空虚重量（例）${bew.toLocaleString()}`, { c: C.ink, b: 1, fs: 12 });
      s += `<rect x="${X(bew).toFixed(1)}" y="72" width="${(X(ramp) - X(bew)).toFixed(1)}" height="36" fill="${C.cy}" fill-opacity="0.35"/>` + T((X(bew) + X(ramp)) / 2, 95, `有効搭載量 ${(ramp - bew).toLocaleString()}`, { c: C.ink, b: 1, fs: 12 });
      s += L(X(ramp), 50, X(ramp), 112, C.rd, 2) + T(X(ramp) - 3, 46, `ランプ ${ramp.toLocaleString()}・離陸 ${tow.toLocaleString()}`, { c: C.rd, b: 1, a: 'end', fs: 12 });
      s += TL(20, 176, ['ランプの重さ − 8 lb（地上で使う燃料）＝ 離陸の重さ', '手荷物は 200 lb まで（実用類では 0 lb・後席も不可）', `満タン 288 lb ＋ 170 lb × 4 人 ＝ 968 lb ＞ ${(ramp - bew).toLocaleString()} lb`], { c: C.ink, a: 'start', fs: 12, lh: 20 });
      return svg(400, 244, s, `図：Archer III の重さ（POH の値）。空虚重量（この本の例 ${bew.toLocaleString()} lb）から最大ランプ重量 ${ramp.toLocaleString()} lb までが、人・荷物・燃料に使える重さです。この例の機体では、170 lb の 4 人と満タンは同時に積めません`);
    },
    // wb.graph — the POH's Loading Graph: load weight against moment ÷ 1,000 for each place (lines from the POH arms)
    wbLoadingGraph() {
      const arms = W ? { front: W.rows[1][2], rear: W.rows[2][2], fuel: W.rows[3][2], bag: W.rows[4][2] } : { front: 80.5, rear: 118.1, fuel: 95.0, bag: 142.8 };
      const f = frame(400, 300, 0, 50, 0, 450, [0, 10, 20, 30, 40, 50], [0, 100, 200, 300, 400], 'モーメント ÷ 1,000（lb-in）', '積む重さ（lb）', { l: 56, r: 14, t: 40, b: 40 });
      const line = (arm, max, c, lab, dx, dy) => P([[f.X(0), f.Y(0)], [f.X(arm * max / 1000), f.Y(max)]], c, 2.5) + T(f.X(arm * max / 1000) + dx, f.Y(max) + dy, lab, { c, b: 1, a: 'start', fs: 12, halo: 1 });
      let s = f.s + line(arms.front, 450, C.gr, `前席 ${arms.front}`, -40, -8) + line(arms.fuel, 288, C.am, `燃料 ${arms.fuel.toFixed(1)}`, 10, 20) + line(arms.rear, 380, C.cy, `後席 ${arms.rear}`, -50, -8) + line(arms.bag, 200, C.vi, `手荷物 ${arms.bag}`, 4, 4);
      const m = arms.front * 340 / 1000;
      s += L(f.X(0), f.Y(340), f.X(m), f.Y(340), C.ink, 1.5, '5 4') + L(f.X(m), f.Y(340), f.X(m), f.Y(0), C.ink, 1.5, '5 4') + `<circle cx="${f.X(m).toFixed(1)}" cy="${f.Y(340).toFixed(1)}" r="4" fill="${C.ink}"/>`;
      s += T(f.X(m) + 6, f.Y(30), `例：前席 340 lb → 約 ${m.toFixed(1)}`, { c: C.ink, a: 'start', fs: 12, halo: 1 });
      s += T(12, 20, '重さから、その席のモーメントを読む', { c: C.ink, b: 1, a: 'start', fs: 13 });
      return svg(400, 300, s, `図：POH の搭載グラフ（Loading Graph）の形を、POH のアームから描いた図。席ごとの線で、積む重さからモーメント ÷ 1,000 を読みます。前席の 2 人で 340 lb なら約 ${m.toFixed(1)}（${Math.round(m * 1000).toLocaleString()} lb-in）です`);
    },
    // wb.shift — moving a load: the total weight stays, the moment and the CG change (the book's example ① → ②)
    wbShift() {
      const X = st => 30 + (st - 75) / 50 * 340, yR = 150, w0 = 2430, move = 170, a1 = 118.1, a2 = 80.5, cg1 = 93.8, dcg = move * (a2 - a1) / w0, cg2 = cg1 + dcg;
      let s = T(12, 20, '重さを移すと、合計は同じで重心だけが動く', { c: C.ink, b: 1, a: 'start', fs: 13 });
      s += L(X(75), yR, X(125), yR, C.mut, 2);
      for (const v of [80, 90, 100, 110, 120]) s += L(X(v), yR, X(v), yR + 6, C.mut, 1.5) + T(X(v), yR + 22, v, { c: C.mut, fs: 12 });
      s += T(X(125), yR + 40, '基準線からの距離（in）', { c: C.mut, a: 'end', fs: 12 });
      s += `<rect x="${X(82)}" y="${yR - 8}" width="${(X(93) - X(82)).toFixed(1)}" height="16" fill="${C.cy}" fill-opacity="0.18" stroke="${C.cy}"/>` + T((X(82) + X(93)) / 2, yR + 40, '重心の範囲（重さによる）', { c: C.cy, fs: 12 });
      s += A(X(a1), 62, X(a2) + 4, 62, C.am, 3) + T((X(a1) + X(a2)) / 2, 54, `後席の 1 人（${move} lb）を前席へ`, { c: C.am, b: 1, fs: 12 });
      s += `<circle cx="${X(a1)}" cy="62" r="6" fill="${C.am}"/>` + T(X(a1), 82, `${a1} in`, { c: C.am, fs: 12 }) + T(X(a2) + 8, 82, `${a2} in`, { c: C.am, a: 'start', fs: 12 });
      s += `<path d="M${X(cg1)} ${yR - 10} l-7 -14 h14 Z" fill="${C.rd}"/>` + T(X(cg1) + 10, yR - 28, `① ${cg1.toFixed(1)} in`, { c: C.rd, b: 1, a: 'start', fs: 12, halo: 1 });
      s += `<path d="M${X(cg2).toFixed(1)} ${yR - 10} l-7 -14 h14 Z" fill="${C.gr}"/>` + T(X(cg2) - 10, yR - 28, `② ${cg2.toFixed(1)} in`, { c: C.gr, b: 1, a: 'end', fs: 12, halo: 1 });
      s += TL(12, 214, [`重心の動き ＝ 移す重さ × 移す距離 ÷ 合計の重さ`, `＝ ${move} ×（${a2} − ${a1}）÷ ${w0.toLocaleString()} ≒ −${Math.abs(dcg).toFixed(1)} in`], { c: C.ink, a: 'start', fs: 12, lh: 18 });
      return svg(400, 252, s, `図：計算例 ① の積み方（${w0.toLocaleString()} lb・重心 ${cg1} in）で、後席の 1 人を前席へ移すと、合計の重さは同じまま、重心は約 ${Math.abs(dcg).toFixed(1)} in 前へ動いて ${cg2.toFixed(1)} in になります（アームは POH の値）`);
    },
    // perf.fuel — redrawn (revise-perfwb): the climb fuel from POH Fig. 5-17 (2 gal and 12 NM, start/taxi/takeoff included) and
    // the cruise over the remaining 108 NM at 105 kt and 9.5 gal/h (the POH's 65 % power), with the day / night reserve of the US
    // 14 CFR 91.151, against 48 gal usable — the same numbers as the text's example
    fuelPlan() {
      const gph = 9.5, climb = 2, cruise = (120 - 12) / 105 * gph, day = 0.5 * gph, night = 0.75 * gph, X = g => 70 + g / 50 * 316, usable = 48;
      const bar = (y, lab, res, resLab) => {
        let s = T(64, y + 19, lab, { c: C.ink, b: 1, a: 'end', fs: 12 }), x0 = X(0);
        for (const [g, c] of [[climb, C.mut], [cruise, C.cy], [res, C.am]]) { s += `<rect x="${x0.toFixed(1)}" y="${y}" width="${(X(g) - X(0)).toFixed(1)}" height="28" fill="${c}" fill-opacity="0.55" stroke="${C.bg}"/>`; x0 += X(g) - X(0); }
        return s + T(x0 + 6, y + 19, `計 約 ${(climb + cruise + res).toFixed(1)} gal`, { c: C.ink, b: 1, a: 'start', fs: 12 }) + T(X(climb + cruise + res / 2), y + 44, resLab, { c: C.am, fs: 12 });
      };
      let s = T(12, 20, '燃料は「上昇＋巡航＋予備」を積む', { c: C.ink, b: 1, a: 'start', fs: 13 });
      for (const v of [0, 10, 20, 30, 40, 50]) s += L(X(v), 40, X(v), 196, C.grid, 1) + T(X(v), 212, v, { c: C.mut, fs: 12 });
      s += bar(56, '昼', day, '予備 30 分') + bar(122, '夜', night, '予備 45 分');
      s += L(X(usable), 36, X(usable), 196, C.gr, 2.5) + T(X(usable) - 4, 34, `使える燃料 ${usable} gal`, { c: C.gr, b: 1, a: 'end', fs: 12 });
      s += T(228, 230, '燃料（US gal）', { c: C.mut, fs: 12 });
      s += `<rect x="70" y="244" width="12" height="12" fill="${C.mut}" fill-opacity="0.55"/>` + T(86, 254, '上昇（始動・地上滑走・離陸を含む）', { c: C.ink, a: 'start', fs: 12 });
      s += `<rect x="70" y="264" width="12" height="12" fill="${C.cy}" fill-opacity="0.55"/>` + T(86, 274, '巡航', { c: C.ink, a: 'start', fs: 12 }) + `<rect x="132" y="264" width="12" height="12" fill="${C.am}" fill-opacity="0.55"/>` + T(148, 274, '予備（米国の 91.151）', { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 286, s, `図：燃料計画の例。POH 図 5-17 の例の上昇（9 分・${climb} gal・12 NM。始動・地上滑走・離陸の燃料を含む）のあと、残りの 108 NM を対地速度 105 kt で巡航すると約 1 時間 2 分、9.5 gal/h（POH の 65% 出力の値）で約 ${cruise.toFixed(1)} gal です。予備は米国の 14 CFR 91.151 の昼 30 分・夜 45 分です`);
    },
    // perf.wbex — redrawn (revise-perfwb): the same envelope and points ① ② as book-figs.js; ③ is now the landing — ② less the
    // 8 lb of start/taxi fuel and 20 gal (both at the fuel arm 95.0 in: POH Fig. 6-9), 2,302 lb and 90.9 in, the text's number
    wbEnvelope() {
      const env = W.env, f = frame(400, 280, 80, 95, 1600, 2600, [80, 83, 86, 89, 92, 95], [1600, 1800, 2000, 2200, 2400, 2600], '重心位置（基準線から in）', '重量（lb）', { l: 56, r: 14, t: 16, b: 40 });
      const [a, b] = W.example(), fa = W.rows[3][2], lw = b.w - W.taxiFuel - 120, c = { w: lw, cg: (b.m - (W.taxiFuel + 120) * fa) / lw };
      const pt = (p, col) => `<circle cx="${f.X(p.cg).toFixed(1)}" cy="${f.Y(p.w).toFixed(1)}" r="6" fill="${col}" stroke="${C.bg}" stroke-width="1.5"/>`;
      let s = f.s + `<path d="${env.map((p, i) => (i ? 'L' : 'M') + f.X(p[0]).toFixed(1) + ' ' + f.Y(p[1]).toFixed(1)).join(' ')} Z" fill="rgba(95,212,255,.12)" stroke="${C.cy}" stroke-width="2"/>`;
      s += L(f.X(80), f.Y(W.max), f.X(95), f.Y(W.max), C.rd, 1.5, '6 4') + T(f.X(80) + 4, f.Y(W.max) - 6, `最大離陸重量 ${W.max.toLocaleString()} lb`, { c: C.rd, a: 'start', fs: 12 });
      s += T(f.X(88), f.Y(1800), '許容範囲', { c: C.cy, b: 1, fs: 13 }) + T(f.X(94.1), f.Y(1900), '後ろすぎ', { c: C.rd, fs: 12, rot: -90 }) + T(f.X(81.6), f.Y(2350), '前すぎ', { c: C.rd, fs: 12 });
      s += A(f.X(a.cg) - 6, f.Y(a.w), f.X(b.cg) + 8, f.Y(b.w), C.gr, 2) + A(f.X(b.cg), f.Y(b.w) + 7, f.X(c.cg) + 1, f.Y(c.w) - 9, C.gr, 2);
      s += pt(a, C.rd) + pt(b, C.gr) + pt(c, C.gr) + T(f.X(a.cg) - 2, f.Y(a.w) - 12, '①', { c: C.rd, b: 1, fs: 13, halo: 1 }) + T(f.X(b.cg) - 12, f.Y(b.w) - 8, '②', { c: C.gr, b: 1, fs: 13, halo: 1 }) + T(f.X(c.cg) - 14, f.Y(c.w) + 16, '③', { c: C.gr, b: 1, fs: 13, halo: 1 });
      return svg(400, 280, s, `図：Archer III の重量と重心の許容範囲（POH の値）と、計算例の 3 つの点。①後ろすぎ（${a.cg.toFixed(1)} in）→ ②後席の 1 人を前席へ（${b.cg.toFixed(1)} in）→ ③始動・地上滑走の 8 lb と燃料 20 gal を使った着陸（${c.w.toLocaleString()} lb・${c.cg.toFixed(1)} in）。① と ② はランプの重さです`);
    },
    // perf.wb — the Archer from the side over a ruler of stations: the same drawing as book-figs.js, only the heading's words
    wbStations() {
      const WB = W, k = 1.2, X = st => 34 + st * k, yR = 196, arm = i => WB.rows[i][2];
      let s = `<path d="M${X(2)} 132 C${X(6)} 124 ${X(20)} 118 ${X(50)} 116 L${X(62)} 106 C${X(72)} 96 ${X(86)} 92 ${X(104)} 92 L${X(150)} 94 L${X(168)} 108 L${X(250)} 122 L${X(262)} 92 L${X(282)} 92 L${X(286)} 126 L${X(276)} 136 L${X(150)} 146 L${X(60)} 148 C${X(30)} 147 ${X(10)} 142 ${X(2)} 132 Z" fill="${PLANE}" fill-opacity="0.85"/>`;
      s += `<path d="M${X(66)} 106 L${X(100)} 96 L${X(150)} 98 L${X(160)} 108 Z" fill="${GLASS}"/>` + `<path d="M${X(78.4)} 146 L${X(141)} 146 L${X(141)} 150 L${X(84)} 152 Z" fill="${PLANE2}"/>`;
      s += `<rect x="${X(250)}" y="124" width="${36 * k}" height="4" rx="2" fill="${PLANE2}"/>` + L(X(2), 116, X(2), 148, C.mut, 2.5) + `<circle cx="${X(31)}" cy="164" r="6" fill="#5b6b7e"/><circle cx="${X(110)}" cy="164" r="7" fill="#5b6b7e"/>` + L(X(31), 148, X(31), 160, PLANE2, 2) + L(X(110), 150, X(110), 158, PLANE2, 2);
      s += `<rect x="${X(82)}" y="${yR - 6}" width="${(93 - 82) * k}" height="12" fill="${C.cy}" fill-opacity="0.3" stroke="${C.cy}"/>` + L(X(0), yR, X(290), yR, C.mut, 1.5);
      for (const v of [0, 50, 100, 150, 200, 250]) s += L(X(v), yR, X(v), yR + 6, C.mut, 1.5) + T(X(v), yR + 20, v, { c: C.mut, fs: 12 });
      s = T(12, 18, 'アーム（arm）＝基準線（datum）からの距離（in）', { c: C.ink, b: 1, a: 'start', fs: 13 }) + s;
      s += L(X(0), 30, X(0), yR, C.vi, 2, '6 4') + T(X(0), yR + 40, '基準線＝主翼前縁の 78.4 in 前', { c: C.vi, a: 'start', fs: 12 });
      const mark = (st, y, lab, c, a = 'middle') => L(X(st), y + 4, X(st), yR - 6, c, 1.5, '3 3') + `<circle cx="${X(st)}" cy="${yR}" r="4" fill="${c}"/>` + T(X(st) + (a === 'end' ? 8 : a === 'start' ? -8 : 0), y, lab, { c, b: 1, fs: 12, a, halo: 1 });
      s += mark(arm(2), 46, `後席 ${arm(2)}`, C.gr) + mark(arm(3), 64, `燃料 ${arm(3).toFixed(1)}`, C.am, 'end') + mark(arm(1), 82, `前席 ${arm(1)}`, C.gr, 'end') + mark(arm(4), 82, `手荷物 ${arm(4)}`, C.gr, 'start');
      s += T(200, yR + 60, '重心の範囲 82.0〜93.0 in（重いほど前の限界が後ろへ）', { c: C.cy, fs: 12 });
      return svg(400, 268, s, '図：Archer III の基準線と、席・燃料（主翼の中のタンク）・手荷物のアーム（機体の手引書の値）。機体の形と脚の位置は模式図です');
    },
  });

  // ---------------------------------------------------------------- the calculators (book-figs.js CALC.da and CALC.wb)
  const num = x => (x === '' || x === null || !Number.isFinite(+x) ? null : +x);
  // da: elevation, temperature, altimeter setting in inHg or hPa (the switch converts the number: 1 inHg = 33.8639 hPa)
  CALC.da = function (el) {
    el.innerHTML = '<label>標高・高度 <input type="number" value="55" step="100"> ft</label> <label>気温 <input type="number" value="33"> ℃</label> '
      + '<label>高度計規正値 <input type="number" value="29.92" step="0.01"></label> <select aria-label="高度計規正値の単位"><option value="inHg">inHg</option><option value="hPa">hPa</option></select> <output></output>';
    const [h, t, q] = el.querySelectorAll('input'), u = el.querySelector('select'), out = el.querySelector('output');
    const f = () => {
      const H = num(h.value), Tc = num(t.value), Q = num(q.value);
      if (H === null || Tc === null || Q === null) { out.textContent = '3 つとも数字を入れてください'; return; }
      const hpa = u.value === 'hPa', pa = hpa ? H + (1013.25 - Q) * 27 : H + (29.92 - Q) * 1000, isa = 15 - 2 * pa / 1000, da = pa + 120 * (Tc - isa);
      out.innerHTML = `気圧高度 <b>${Math.round(pa).toLocaleString()} ft</b>・標準気温 ${isa.toFixed(0)}℃・密度高度 <b>${Math.round(da).toLocaleString()} ft</b>`
        + `（概算式：${hpa ? '気圧高度 ≒ 標高＋（1013.25 − 規正値）× 27 ft' : '気圧高度 ≒ 標高＋（29.92 − 規正値）× 1,000 ft'}、密度高度 ≒ 気圧高度＋120 ×（気温 − 標準気温））`;
    };
    u.addEventListener('change', () => {
      const Q = num(q.value);
      if (u.value === 'hPa') { q.step = '0.1'; if (Q !== null && Q < 40) q.value = (Q * 33.8639).toFixed(1); }
      else { q.step = '0.01'; if (Q !== null && Q > 40) q.value = (Q / 33.8639).toFixed(2); }
      f();
    });
    for (const e of [h, t, q]) e.addEventListener('input', f);
    f();
  };
  // wb: the Archer III's loading form (POH Fig. 6-11): ramp → start/taxi fuel → takeoff, and each limit checked on its own
  CALC.wb = function (el) {
    const R = W.rows, fwdAt = W.fwd, ok = b => (b ? '<span style="color:#5fd46a">○</span>' : '<span style="color:#ff6a5a">×</span>');
    const galDefault = R[3][1] / W.lbPerGal;
    el.innerHTML = '<table class="bk-t"><tr><th>項目</th><th>重さ</th><th>アーム in</th><th>モーメント</th></tr>'
      + `<tr><td>${R[0][0]}</td><td><input type="number" value="${R[0][1]}" min="0"> lb</td><td><input type="number" value="${R[0][2]}" step="0.1"></td><td class="m"></td></tr>`
      + `<tr><td>${R[1][0]}</td><td><input type="number" value="${R[1][1]}" min="0"> lb</td><td>${R[1][2]}</td><td class="m"></td></tr>`
      + `<tr><td>${R[2][0]}</td><td><input type="number" value="${R[2][1]}" min="0"> lb</td><td>${R[2][2]}</td><td class="m"></td></tr>`
      + `<tr><td>燃料（1 US gal ＝ ${W.lbPerGal} lb）</td><td><input type="number" value="${galDefault}" min="0"> gal</td><td>${R[3][2].toFixed(1)}</td><td class="m"></td></tr>`
      + `<tr><td>${R[4][0]}</td><td><input type="number" value="${R[4][1]}" min="0"> lb</td><td>${R[4][2]}</td><td class="m"></td></tr>`
      + '<tr><th>ランプ</th><th class="rw"></th><th class="rc"></th><th class="rm"></th></tr>'
      + `<tr><td>始動・地上滑走の燃料</td><td>−${W.taxiFuel} lb</td><td>${R[3][2].toFixed(1)}</td><td>−${Math.round(W.taxiFuel * R[3][2]).toLocaleString()}</td></tr>`
      + '<tr><th>離陸</th><th class="tw"></th><th class="tc"></th><th class="tm"></th></tr></table><output></output>';
    const ins = el.querySelectorAll('input'), out = el.querySelector('output'), ms = el.querySelectorAll('.m'), $ = c => el.querySelector(c);
    const f = () => {
      const v = [...ins].map(i => num(i.value));
      if (v.some(x => x === null || x < 0)) { out.textContent = '重さ・アーム・燃料に、0 以上の数字を入れてください'; return; }
      const [bew, bewArm, front, rear, gal, bag] = v, fuelLb = gal * W.lbPerGal;
      const items = [[bew, bewArm], [front, R[1][2]], [rear, R[2][2]], [fuelLb, R[3][2]], [bag, R[4][2]]];
      let rw = 0, rm = 0; items.forEach(([w, a], i) => { rw += w; rm += w * a; ms[i].textContent = Math.round(w * a).toLocaleString(); });
      const tw = rw - W.taxiFuel, tm = rm - W.taxiFuel * R[3][2], rcg = rm / rw, tcg = tm / tw;
      $('.rw').textContent = `${Math.round(rw).toLocaleString()} lb`; $('.rc').textContent = rcg.toFixed(1); $('.rm').textContent = Math.round(rm).toLocaleString();
      $('.tw').textContent = `${Math.round(tw).toLocaleString()} lb`; $('.tc').textContent = tcg.toFixed(1); $('.tm').textContent = Math.round(tm).toLocaleString();
      const checks = [
        [rw <= W.ramp, `ランプ重量 ${Math.round(rw).toLocaleString()} lb（最大 ${W.ramp.toLocaleString()}）`],
        [tw <= W.max, `離陸重量 ${Math.round(tw).toLocaleString()} lb（最大 ${W.max.toLocaleString()}）`],
        // above the maximum takeoff weight the POH gives no CG range (POH 2.13 stops at 2,550 lb; 5.3: no extrapolation)
        tw <= W.max ? [tcg >= fwdAt(tw) - 1e-9 && tcg <= 93.0 + 1e-9, `離陸の重心 ${tcg.toFixed(1)} in（この重さの範囲 ${fwdAt(tw).toFixed(1)}〜93.0）`]
          : [false, `離陸の重心 ${tcg.toFixed(1)} in（—：重さが ${W.max.toLocaleString()} lb を超えるので、重心の範囲がない）`],
        [bag <= W.bagMax, `手荷物 ${Math.round(bag)} lb（最大 ${W.bagMax}）`],
        [gal <= W.fuelMaxGal, `燃料 ${gal} gal（使える燃料は ${W.fuelMaxGal} gal まで）`],
      ];
      const all = checks.every(c => c[0]), U = W.utility, util = tw <= U.max && rear === 0 && bag === 0 && tcg >= U.fwd(tw) - 1e-9 && tcg <= 93.0 + 1e-9;
      out.innerHTML = `${all ? '<span style="color:#5fd46a">すべて範囲内</span>' : '<span style="color:#ff6a5a">範囲外の項目がある</span>'}：`
        + checks.map(c => `${ok(c[0])} ${c[1]}`).join('・')
        + `。実用類として飛ぶ条件（離陸 ${U.max.toLocaleString()} lb 以下・後席と手荷物なし・前の限界は 2,130 lb で 83.0 in）：${util ? '満たす' : '満たさない'}。`
        + '着陸のとき（燃料を使ったあと）も確かめます。数字は POH の値、空虚重量とそのアームは例（その機体の記録の値を入れる）';
    };
    ins.forEach(i => i.addEventListener('input', f));
    f();
  };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
