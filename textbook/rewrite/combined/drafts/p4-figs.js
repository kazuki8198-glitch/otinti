// DRAFT (W30, R3) — the figures of Part 4's chapters 'ifr'「計器による飛行」and 'ifrp'「計器飛行方式」
// (textbook/rewrite/combined/DESIGN.md 3.3 第 4 部 第 32・33 章, 4.2 kiso04・kiso12, 7.2 W30). No product reads this file: it is
// checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p4-figs.js textbook/rewrite/combined/drafts/p4.js
// and, when the chapters are registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys;
// the helpers below are copied unchanged from book-figs.js, so the functions run the same way there).
//
// What is here (one function per figure; the caption says what to look at):
//   new      vacuumSixPack    ifr.vacuum — the six classic instruments and what drives each: the attitude and heading
//                             indicators spun by the engine-driven vacuum pump, the turn coordinator by electricity, the
//                             airspeed indicator, altimeter and vertical speed indicator by the pitot-static pressures
//                             (PHAK chapter 8: vacuum usually 4.5–5.5 "Hg; at least two power sources for bank). kiso04.10.
//   new      navReadout       ifr.auto — heading, track and deviation are three different things (kiso12.10): a top view with
//                             the selected course, the wind, the nose, the track and the deviation, and the CDI that shows the
//                             deviation from the selected navigation source (G1000-type: GPS / LOC, the flight phase TERM).
//   new      climbGradient    ifr.dep — the basic course's ch12-fig12-7「上昇勾配を対地速度で上昇率へ換算する」redrawn: the
//                             gradient in ft/NM, the rate in ft/min = gradient × groundspeed ÷ 60, computed for 60/90/120 kt at
//                             200 ft/NM (AIM 5-2-9's standard) and 300 ft/NM (the basic course's practice figure).
//   new      enrouteAlts      ifr.enr — an airway between two VORs seen from the side (schematic, made-up numbers): MEA, MOCA
//                             (usable below the MEA only within 22 NM of the VOR: 14 CFR 91.177(a)(1)) and an MRA at a fix.
//   new      procTurn         ifr.pt — a 45° procedure turn from above (AIM 5-4-9): outbound, 45°, the turn back, inbound;
//                             「10 NM 以内」「200 KIAS 以下」and the procedure turn altitude kept until established inbound.
//   new      pbnCorridor      ifr.pbn — RNAV and RNP (AIM 1-2-1・1-2-2): the lateral accuracy kept 95 % of the flight time,
//                             and RNP's on-board performance monitoring and alerting.
//   new      circleArea       ifr.circle — the circling area from above (AIM 5-4-20, IPH chapter 4: arcs from each runway end,
//                             category A 1.3 NM on the standard criteria) and, in red, the safety item ②: visual reference lost
//                             on the downwind → an initial climbing turn toward the landing runway, continued until
//                             established on the missed approach course (AIM 5-4-21).
//   new      missedTwoTasks   ifr.np — the basic course's ch12-fig12-11「進入復行では機体と経路を同時に管理する」redrawn: fly the
//                             airplane (power, attitude, configuration) and keep the path (to the MAP on the approach course,
//                             the published turn, 200 ft/NM); an early decision is not an early turn (AIM 5-4-21).
//   redrawn  ils              ifr.ils — the same drawing; the DA label moved below the ground line so no line runs over it
//                             (R1V's nit), the caption shortened (decision 12: a caption is read first).
// Unchanged and not repeated here: scan, standardRate (ifr.scan), holding (ifr.hold), labIlsChart (ifr.chart), npProfile
// (ifr.np): their words are FL.terms' names already and their numbers come from the simulator's data.
// Every number drawn here is one the text gives with its source (p4.claims.json); text ≥ 12 (≥ 10 px at 390 px).
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  // ---- the helpers of book-figs.js (copied unchanged)
  const DEG = Math.PI / 180;
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''} ${o.rot ? `transform="rotate(${o.rot} ${x} ${y})"` : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${x2 - hh * Math.cos(a - 0.45)} ${y2 - hh * Math.sin(a - 0.45)} L${x2 - hh * Math.cos(a + 0.45)} ${y2 - hh * Math.sin(a + 0.45)} Z" fill="${c}"/>`; };
  const P = (pts, c, w = 2, fill = 'none', dash = '') => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}" stroke="${c}" stroke-width="${w}" fill="${fill}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const BOX = (x, y, w, h, c, title = '', lines = [], o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${o.fill || c}" fill-opacity="${o.fill ? 1 : 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"/>`
    + (title ? T(x + w / 2, y + (o.ty || 20), title, { c: o.tc || c, b: 1, fs: o.fs || 13 }) : '') + (lines.length ? TL(x + w / 2, y + (o.ly || (title ? 38 : 20)), lines, { c: o.lc || C.ink, fs: o.lfs || 12 }) : '');
  const PLANE = '#dfe6ee', PLANE2 = '#9fb3c8', GLASS = '#5d7fa3';
  const planeSide = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${-(o.pitch || 0)}) scale(${k})">`
    + `<path d="M50 -1 C48 -8 38 -11 26 -12 L14 -16 C2 -18 -10 -16 -18 -12 L-50 -5 L-50 1 L-14 6 C6 8 30 7 44 5 C49 4 51 2 50 -1 Z" fill="${PLANE}"/>`
    + `<path d="M12 -15 C4 -17 -6 -16 -14 -12 L-12 -9 L10 -9 Z" fill="${GLASS}"/><path d="M-38 -6 L-50 -27 L-57 -27 L-54 -3 Z" fill="${PLANE}"/>`
    + `<rect x="-60" y="-4" width="20" height="3.5" rx="1.5" fill="${PLANE2}"/><ellipse cx="6" cy="5" rx="19" ry="2.6" fill="${PLANE2}"/>`
    + (o.flap ? `<path d="M-12 5 l${(-9 * Math.cos(o.flap * DEG)).toFixed(1)} ${(9 * Math.sin(o.flap * DEG)).toFixed(1)}" stroke="${C.am}" stroke-width="3" stroke-linecap="round"/>` : '')
    + (o.gear === false ? '' : `<path d="M2 7 L0 15 M40 5 L40 15" stroke="${PLANE2}" stroke-width="2"/><circle cx="0" cy="16" r="3.4" fill="#5b6b7e"/><circle cx="40" cy="16" r="3" fill="#5b6b7e"/>`)
    + `<line x1="52" y1="-15" x2="52" y2="13" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const planeTop = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${k})">`
    + `<path d="M-68 -8 L68 -8 L66 6 L-66 6 Z" fill="${PLANE}"/><path d="M-22 38 L22 38 L21 45 L-21 45 Z" fill="${PLANE2}"/>`
    + `<path d="M0 -50 C5 -48 7 -40 7 -28 L5 30 L2 50 L-2 50 L-5 30 L-7 -28 C-7 -40 -5 -48 0 -50 Z" fill="${PLANE}"/><path d="M-5 -26 L5 -26 L4 -14 L-4 -14 Z" fill="${GLASS}"/>`
    + (o.twin ? `<rect x="-29" y="-24" width="10" height="26" rx="4" fill="${PLANE2}"/><rect x="19" y="-24" width="10" height="26" rx="4" fill="${PLANE2}"/><line x1="-36" y1="-26" x2="-12" y2="-26" stroke="${C.mut}" stroke-width="2.5"/><line x1="12" y1="-26" x2="36" y2="-26" stroke="${C.mut}" stroke-width="2.5"/>`
      : `<line x1="-12" y1="-52" x2="12" y2="-52" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/>`) + '</g>';
  const NFN = (x, y, a = 'end') => T(x, y, '模式図・NOT FOR NAVIGATION', { c: C.am, fs: 12, a, b: 1 });
  // the magenta of a G1000-type course line (the colour scan() uses for the turn-rate trend)
  const MAG = '#ff4fd8';

  Object.assign(FL.bookFigs, {
    // ---------------------------------------------------------------- ifr（計器による飛行）
    // ifr.vacuum — the six classic instruments and their power (PHAK chapter 8; IFH chapters 5 and 11). kiso04.10
    vacuumSixPack() {
      const inst = [
        [70, 92, '速度計', 'ピトー静圧', C.cy], [200, 92, '姿勢指示器', '真空', C.am], [330, 92, '高度計', 'ピトー静圧', C.cy],
        [70, 196, '旋回傾斜計', '電気', C.gr], [200, 196, '方向指示器', '真空', C.am], [330, 196, '昇降計', 'ピトー静圧', C.cy],
      ];
      let s = T(200, 22, '六つの計器と、動かすもの（昔からの小型機の例）', { c: C.ink, b: 1, fs: 13 });
      s += `<rect x="10" y="38" width="380" height="210" rx="10" fill="#070d16" stroke="${C.grid}"/>`;
      for (const [x, y, name, src, c] of inst) {
        s += `<circle cx="${x}" cy="${y}" r="44" fill="${C.bg}" stroke="${c}" stroke-width="3"/>`;
        s += T(x, y - 2, name, { c: C.ink, b: 1, fs: 12 }) + T(x, y + 17, src, { c, b: 1, fs: 12 });
      }
      const leg = [[C.am, '橙：エンジンで回す真空ポンプのジャイロ'], [C.gr, '緑：電気で回すジャイロ'], [C.cy, '水色：ピトー管と静圧孔の空気の圧力']];
      leg.forEach(([c, t], i) => { const y = 272 + i * 20; s += `<rect x="16" y="${y - 11}" width="14" height="14" rx="3" fill="${c}"/>` + T(38, y, t, { c: C.ink, a: 'start', fs: 12 }); });
      s += T(16, 340, '真空が落ちると、橙の 2 つがゆっくり狂う', { c: C.rd, b: 1, a: 'start', fs: 12 });
      s += T(16, 360, '緑の旋回傾斜計と比べて見つける', { c: C.rd, b: 1, a: 'start', fs: 12 });
      return svg(400, 372, s, '図：昔からの小型機の六つの計器と、動かすもの（模式図）。姿勢指示器と方向指示器は真空、旋回傾斜計は電気、ほかの 3 つは空気の圧力で動きます');
    },
    // ifr.auto — heading, track and deviation, and the CDI that shows the deviation from the selected source (kiso12.10)
    navReadout() {
      let s = T(12, 20, '上から見る（模式図）', { c: C.mut, a: 'start', fs: 12 });
      // the selected course (magenta), 360°
      s += L(130, 34, 130, 300, MAG, 3) + T(122, 50, 'コース 360°', { c: MAG, b: 1, a: 'end', fs: 12 });
      // the wind from the west
      s += A(18, 200, 70, 200, C.cy, 2.5) + T(18, 222, '風（西から）', { c: C.cy, b: 1, a: 'start', fs: 12 });
      // the airplane east of the course, nose 360°, moving toward 010°
      const ax = 220, ay = 210;
      s += planeTop(ax, ay, 0.34);
      s += A(ax, ay - 22, ax, ay - 112, C.ink, 2.5) + T(ax - 8, ay - 118, '針路 360°', { c: C.ink, b: 1, a: 'end', fs: 12 }) + T(ax - 8, ay - 102, '（機首の向き）', { c: C.ink, a: 'end', fs: 12 });
      const tx = ax + 108 * Math.sin(10 * DEG), ty = ay - 22 - 108 * Math.cos(10 * DEG);
      s += A(ax, ay - 22, tx.toFixed(1), ty.toFixed(1), C.gr, 2.5) + T(tx + 6, ty + 4, '航跡 010°', { c: C.gr, b: 1, a: 'start', fs: 12 }) + T(tx + 6, ty + 20, '（進む向き）', { c: C.gr, a: 'start', fs: 12 });
      // the deviation
      s += L(130, ay + 40, ax, ay + 40, C.am, 1.5, '4 3') + L(130, ay + 34, 130, ay + 46, C.am, 2) + L(ax, ay + 34, ax, ay + 46, C.am, 2);
      s += T((130 + ax) / 2, ay + 60, '偏位：コースの右', { c: C.am, b: 1, fs: 12 });
      // the CDI
      const bx = 262, by = 236;
      s += `<rect x="${bx}" y="${by}" width="128" height="104" rx="8" fill="${C.bg}" stroke="${C.mut}"/>` + T(bx + 64, by + 18, 'CDI', { c: C.ink, b: 1, fs: 12 });
      for (const d of [-2, -1, 1, 2]) s += `<circle cx="${bx + 64 + d * 18}" cy="${by + 46}" r="3" fill="none" stroke="${C.ink}"/>`;
      s += L(bx + 64 - 26, by + 30, bx + 64 - 26, by + 62, MAG, 4) + L(bx + 61, by + 46, bx + 67, by + 46, C.mut, 1);
      s += T(bx + 64, by + 80, '針は左＝コースは左', { c: C.ink, fs: 12 }) + T(bx + 64, by + 96, '航法源 GPS・TERM', { c: MAG, b: 1, fs: 12 });
      return svg(400, 350, s, '図：針路・航跡・偏位は別のもの（模式図）。西風で、機首を 360° に向けても東へ流されます。CDI は、選んだ航法源とコースからのずれを示します');
    },
    // ---------------------------------------------------------------- ifrp（計器飛行方式）
    // ifr.dep — ch12-fig12-7 redrawn: gradient (ft/NM) and rate (ft/min) = gradient × groundspeed ÷ 60, computed here
    climbGradient() {
      let s = T(12, 20, '上昇勾配：1 NM 進むあいだに上がる高さ', { c: C.ink, b: 1, a: 'start', fs: 13 });
      // the triangle
      s += P([[30, 140], [250, 140], [250, 70], [30, 140]], C.cy, 2, 'rgba(95,212,255,0.08)');
      s += T(140, 158, '水平に 1 NM', { c: C.ink, fs: 12 }) + T(258, 110, '200 ft', { c: C.cy, b: 1, a: 'start', fs: 12 });
      s += T(258, 126, '＝ 200 ft/NM', { c: C.cy, b: 1, a: 'start', fs: 12 });
      s += T(12, 186, '上昇率（ft/min）＝ 勾配（ft/NM）× 対地速度（kt）÷ 60', { c: C.am, b: 1, a: 'start', fs: 12 });
      // the table, computed
      const gs = [60, 90, 120], grads = [200, 300], x0 = 12, y0 = 200, cw = [128, 84, 84, 84];
      const cell = (i, j, t, o = {}) => T(x0 + cw.slice(0, i).reduce((a, b) => a + b, 0) + cw[i] / 2, y0 + 20 + j * 26, t, o);
      s += `<rect x="${x0}" y="${y0}" width="${cw.reduce((a, b) => a + b, 0)}" height="${26 * 3 + 4}" rx="6" fill="none" stroke="${C.grid}"/>`;
      s += cell(0, 0, '対地速度 →', { c: C.mut, fs: 12 }) + gs.map((g, i) => cell(i + 1, 0, `${g} kt`, { c: C.mut, b: 1, fs: 12 })).join('');
      grads.forEach((g, j) => {
        s += cell(0, j + 1, `${g} ft/NM`, { c: j ? C.am : C.cy, b: 1, fs: 12 });
        gs.forEach((v, i) => { s += cell(i + 1, j + 1, `${Math.round(g * v / 60)} ft/min`, { c: C.ink, fs: 12 }); });
      });
      s += T(12, 312, '速く進むほど、同じ勾配に要る上昇率は大きい', { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 324, s, '図：上昇勾配（ft/NM）と上昇率（ft/min）。同じ勾配でも、対地速度が大きいほど要る上昇率は大きくなります（計算の例）');
    },
    // ifr.enr — MEA, MOCA (22 NM of the VOR: 14 CFR 91.177(a)(1)) and an MRA at a fix, from the side; made-up numbers
    enrouteAlts() {
      const xA = 40, xB = 360, nm = (xB - xA) / 80, y = ft => 236 - ft * 0.04;
      let s = T(12, 20, '航空路を横から見る（模式図・架空の値）', { c: C.mut, a: 'start', fs: 12 });
      // terrain
      s += P([[12, 236], [70, 228], [110, 214], [150, 196], [185, 184], [215, 190], [250, 204], [300, 220], [388, 230], [388, 240], [12, 240]], '#4a3a26', 1, '#4a3a26');
      // the 22 NM zones near each VOR
      s += `<rect x="${xA}" y="${y(5200)}" width="${22 * nm}" height="${236 - y(5200)}" fill="${C.am}" fill-opacity="0.08"/><rect x="${xB - 22 * nm}" y="${y(5200)}" width="${22 * nm}" height="${236 - y(5200)}" fill="${C.am}" fill-opacity="0.08"/>`;
      s += T(xA + 11 * nm, y(1700), '22 NM', { c: C.am, b: 1, fs: 12 }) + T(xB - 11 * nm, y(1700), '22 NM', { c: C.am, b: 1, fs: 12 });
      // MEA and MOCA
      s += L(xA, y(4000), xB, y(4000), C.gr, 3) + T(200, y(4000) - 8, 'MEA 4,000：信号と障害物の両方', { c: C.gr, b: 1, fs: 12, halo: 1 });
      s += L(xA, y(3000), xB, y(3000), C.am, 2, '7 4') + T(200, y(3000) + 18, 'MOCA 3,000：障害物だけ', { c: C.am, b: 1, fs: 12, halo: 1 });
      // the VORs
      for (const x of [xA, xB]) s += `<path d="M${x - 7} 236 L${x} 224 L${x + 7} 236 Z" fill="${C.bl}"/>`;
      s += T(xA, 256, 'VOR', { c: C.bl, b: 1, fs: 12 }) + T(xB, 256, 'VOR', { c: C.bl, b: 1, fs: 12 });
      // a fix with an MRA
      const xf = 200;
      s += L(xf, y(4000) + 6, xf, y(5000), C.vi, 1.5, '3 3') + `<path d="M${xf} ${y(5000) - 6} l6 6 l-6 6 l-6 -6 Z" fill="${C.vi}"/>`;
      s += T(xf + 10, y(5000) + 4, 'フィックスの MRA 5,000', { c: C.vi, b: 1, a: 'start', fs: 12 });
      s += T(12, 282, 'MOCA まで下りてよいのは、VOR から 22 NM 以内だけ', { c: C.ink, a: 'start', fs: 12 }) + NFN(388, 300);
      return svg(400, 310, s, '図：航空路の最低の高度（横から見た模式図・架空の値）。MEA は信号と障害物の両方、MOCA は障害物だけを守ります。MRA はフィックスを決める電波が受かる最低の高度です');
    },
    // ifr.pt — a 45° procedure turn from above (AIM 5-4-9)
    procTurn() {
      let s = T(12, 20, '45° の方式旋回（上から見た模式図）', { c: C.mut, a: 'start', fs: 12 });
      const cx = 150, fy = 70;
      // the final approach course and the runway
      s += `<rect x="${cx - 4}" y="22" width="8" height="26" fill="${C.ink}"/>` + T(cx + 10, 40, '滑走路', { c: C.ink, a: 'start', fs: 12 });
      s += L(cx, 50, cx, 330, C.gr, 2) + `<circle cx="${cx}" cy="${fy}" r="5" fill="${C.am}"/>` + T(cx - 10, fy + 4, 'フィックス', { c: C.am, b: 1, a: 'end', fs: 12 });
      // outbound, 45°, 1 minute, the turn back, inbound
      const p1 = [cx, 200], d45 = 70, p2 = [cx - d45 * Math.sin(45 * DEG), 200 + d45 * Math.cos(45 * DEG)];
      s += A(cx + 0, fy + 8, p1[0], p1[1], C.cy, 2.5) + T(cx + 8, 140, '外向き', { c: C.cy, b: 1, a: 'start', fs: 12 });
      s += A(p1[0], p1[1], p2[0].toFixed(1), p2[1].toFixed(1), C.cy, 2.5) + T(p2[0] - 8, p2[1] + 4, '45°', { c: C.cy, b: 1, a: 'end', fs: 12 });
      const q = [p2[0] - 24, p2[1] + 30], r = [cx - 18, 262];
      s += `<path d="M${p2[0].toFixed(1)} ${p2[1].toFixed(1)} C${q[0].toFixed(1)} ${(q[1] + 30).toFixed(1)} ${(q[0] + 70).toFixed(1)} ${(q[1] + 40).toFixed(1)} ${r[0]} ${r[1]}" stroke="${C.vi}" stroke-width="2.5" fill="none"/>`;
      s += A(r[0], r[1], cx, r[1] - 20, C.vi, 2.5) + T(p2[0] - 30, p2[1] + 66, '旋回して戻る', { c: C.vi, b: 1, a: 'start', fs: 12 });
      s += A(cx - 12, 186, cx - 12, 120, C.gr, 2) + T(cx - 18, 168, '内向き', { c: C.gr, b: 1, a: 'end', fs: 12 });
      // the notes
      const nx = 214;
      s += BOX(nx, 70, 178, 196, C.mut, '', [], { rx: 8 });
      s += TL(nx + 10, 94, ['決まり（米国の AIM 5-4-9）', '・断面図の距離の内で', '　（ふつう 10 NM）', '・200 KIAS 以下', '・方式旋回の高度は、', '　内向きに乗るまで', '　最低高度', '・NoPT・誘導・時間の', '　進入では、しない'], { c: C.ink, a: 'start', fs: 12, lh: 20 });
      s += NFN(392, 330);
      return svg(400, 340, s, '図：45° の方式旋回（上から見た模式図）。フィックスから外向きに飛び、45° 曲がり、旋回して戻って内向きのコースに乗ります。決められた距離の内で回ります');
    },
    // ifr.pbn — RNAV and RNP: the lateral accuracy 95 % of the time, and RNP's monitoring and alerting (AIM 1-2-1・1-2-2)
    pbnCorridor() {
      let s = T(12, 20, '経路と、守る幅（模式図）', { c: C.mut, a: 'start', fs: 12 });
      const pts = [[20, 120], [150, 80], [290, 110], [388, 70]];
      // the corridor (± accuracy)
      const band = pts.map(([x, y]) => [x, y - 24]).concat(pts.slice().reverse().map(([x, y]) => [x, y + 24]));
      s += P(band.concat([band[0]]), C.cy, 1, 'rgba(95,212,255,0.10)', '4 3');
      s += P(pts, MAG, 3);
      for (const [x, y] of pts.slice(1, 3)) s += `<path d="M${x} ${y - 7} l7 7 l-7 7 l-7 -7 Z" fill="none" stroke="${C.ink}" stroke-width="1.5"/>`;
      s += planeTop(86, 104, 0.22, { rot: 74 });
      s += T(200, 150, '数字の幅（NM）の中を、飛ぶ時間の 95% 以上', { c: C.cy, b: 1, fs: 12 });
      s += BOX(12, 172, 184, 98, C.cy, 'RNAV 1・RNAV 2', ['決まった精度で飛ぶ', '（数字は幅の NM）'], { fs: 13 });
      s += BOX(204, 172, 184, 98, C.am, 'RNP（例 RNP APCH）', ['精度 ＋ 機上の監視と警報', '守れない → 警報が出る'], { fs: 13 });
      s += T(200, 292, '画面に線が出ることと、飛んでよいことは別', { c: C.rd, b: 1, fs: 12 });
      return svg(400, 304, s, '図：RNAV と RNP（模式図）。どちらも数字の幅の中を、飛ぶ時間の 95% 以上保ちます。RNP は、それを機上で監視し、守れないときに警報を出します');
    },
    // ifr.circle — the circling area (AIM 5-4-20, IPH chapter 4) and the safety item ② (AIM 5-4-21)
    circleArea() {
      const cx = 170, ry1 = 150, ry2 = 196, R = 82;
      let s = T(12, 20, '周回進入（上から見た模式図）', { c: C.mut, a: 'start', fs: 12 });
      // the protected area: arcs of radius R from each runway end, joined by tangents
      s += `<path d="M${cx - R} ${ry1} A${R} ${R} 0 0 1 ${cx + R} ${ry1} L${cx + R} ${ry2} A${R} ${R} 0 0 1 ${cx - R} ${ry2} Z" fill="${C.gr}" fill-opacity="0.08" stroke="${C.gr}" stroke-width="1.5" stroke-dasharray="6 4"/>`;
      s += T(cx - R - 4, ry2 + 56, '周回進入の区域', { c: C.gr, b: 1, a: 'start', fs: 12 });
      s += A(cx, ry1, cx - R + 14, ry1 - 44, C.gr, 1.5) + T(cx - 34, ry1 - 12, '半径', { c: C.gr, fs: 12, a: 'end' });
      // the runway 18/36 and the instrument approach course from the south
      s += `<rect x="${cx - 5}" y="${ry1}" width="10" height="${ry2 - ry1}" fill="${C.ink}"/>` + T(cx - 10, ry2 - 4, '着陸する滑走路', { c: C.ink, b: 1, a: 'end', fs: 12, halo: 1 });
      s += L(cx, ry2 + 4, cx, 340, C.mut, 1.5, '5 4') + T(cx - 6, 334, '計器進入のコース', { c: C.mut, a: 'end', fs: 12 });
      // the circling path on the east side and the point where the reference is lost
      const lx = cx + 56, ly = 210;
      s += `<path d="M${cx} 286 C${cx + 20} 268 ${lx} 250 ${lx} ${ly}" stroke="${C.cy}" stroke-width="2.5" fill="none"/>`;
      s += `<circle cx="${lx}" cy="${ly}" r="6" fill="${C.rd}"/>` + T(lx + 12, ly + 4, '目視を失った', { c: C.rd, b: 1, a: 'start', fs: 12 });
      // the climbing turn toward the landing runway, continued onto the missed approach course (north)
      s += `<path d="M${lx} ${ly - 6} C${lx} ${ly - 70} ${cx + 14} ${ry1 - 40} ${cx + 2} ${ry1 - 74}" stroke="${C.rd}" stroke-width="3" fill="none"/>`;
      s += A(cx + 2, ry1 - 74, cx, ry1 - 120, C.rd, 3);
      s += TL(lx + 12, ly - 70, ['① 着陸する滑走路へ', '　向かって上昇旋回'], { c: C.rd, b: 1, a: 'start', fs: 12, lh: 16 });
      s += TL(cx + 10, 30, ['② 進入復行のコースに', '　乗るまで旋回を続ける'], { c: C.rd, b: 1, a: 'start', fs: 12, lh: 16 });
      s += NFN(392, 360);
      return svg(400, 370, s, '図：周回進入の区域と、目視を失ったとき（上から見た模式図）。着陸する滑走路へ向かって上昇旋回し、進入復行のコースに乗るまで旋回を続けます（米国の AIM 5-4-21）');
    },
    // ifr.np — ch12-fig12-11 redrawn: the airplane and the path, at once (AIM 5-4-21)
    missedTwoTasks() {
      let s = T(200, 22, '進入復行：2 つを同時に', { c: C.ink, b: 1, fs: 13 });
      s += BOX(10, 36, 184, 112, C.cy, '機体を動かす', ['出力 → 姿勢 → 形態', '上昇に移る', 'ゴーアラウンドと同じ型'], { fs: 13 });
      s += BOX(206, 36, 184, 112, C.gr, '経路を守る', ['MAP までは進入のコース', '決められた旋回と高度', '上昇勾配 200 ft/NM 以上'], { fs: 13 });
      s += `<rect x="10" y="160" width="380" height="44" rx="8" fill="${C.rd}" fill-opacity="0.10" stroke="${C.rd}" stroke-width="1.5"/>`;
      s += T(200, 179, '早く進入復行を決めても、早く旋回してよいわけではない', { c: C.rd, b: 1, fs: 12 });
      s += T(200, 196, '（管制の別の指示がなければ、MAP まで進入のコースを飛ぶ）', { c: C.ink, fs: 12 });
      return svg(400, 212, s, '図：進入復行では、機体を上昇へ移すことと、決められた経路を守ることを同時にします。早く決めても、MAP までは進入のコースを飛びます');
    },
    // ifr.ils — redrawn: the same drawing as book-figs.js, the DA label moved below the ground line (R1V's nit) and the caption
    // shortened. The ILS in two views (AIM 1-1-9, IFH chapter 9) and how the needles read. Plan (north up): the localizer from its
    // antenna past the far end of runway 36 (avionics.js: ±2.5° full scale, 1.25°/dot), the 30° intercept of lesson i5 (heading
    // 330 from the east). Profile (heights exaggerated): the glide path 3° ± 0.7° (0.35°/dot) from 300 m past the threshold, met
    // from below at 2,000 ft (school.js) about 5.9 NM out, DA 255 ft (touchdown zone 55 ft + 200 ft, syllabus i5) and a false
    // course at a steeper angle
    ils() {
      const PH = FL.physics, R = PH.LAB_RWY, gsNm = Math.tan(3 * DEG) * 1852 * PH.FT, gp0 = 300 / 1852, faf = (2000 - R.elevFt) / gsNm - gp0, daNm = (255 - R.elevFt) / gsNm - gp0;
      let s = T(14, 18, '上から見る（ローカライザー：左右）', { c: C.gr, b: 1, a: 'start', fs: 12 });
      const rx = 150, ay = 36, ry = 50, fan = 10, by = 196;
      s += `<path d="M${rx} ${ay} L${(rx - (by - ay) * Math.tan(fan * DEG)).toFixed(1)} ${by} L${(rx + (by - ay) * Math.tan(fan * DEG)).toFixed(1)} ${by} Z" fill="${C.gr}" fill-opacity="0.12" stroke="${C.gr}" stroke-dasharray="4 3"/>`;
      s += L(rx, ay, rx, by, C.gr, 1.5, '6 4') + `<rect x="${rx - 4}" y="${ry}" width="8" height="30" fill="${C.ink}"/>` + L(rx - 14, ay, rx + 14, ay, C.gr, 4);
      s += T(rx + 20, ay + 4, 'アンテナ（滑走路の先）', { c: C.gr, fs: 12, a: 'start' }) + T(rx + 10, ry + 22, 'RWY 36', { c: C.ink, b: 1, fs: 12, a: 'start' });
      s += T(rx, by + 16, '±2.5°（角度は誇張）', { c: C.gr, b: 1, fs: 12 });
      const jx = rx, jy = 108, sx = jx + 26, sy = jy + 30, ex = sx + 56 * Math.sin(30 * DEG), ey = sy + 56 * Math.cos(30 * DEG);
      s += `<path d="M${ex.toFixed(1)} ${ey.toFixed(1)} L${sx.toFixed(1)} ${sy.toFixed(1)} Q${jx} ${jy + 8} ${jx} ${jy - 14}" stroke="${C.cy}" stroke-width="2.5" fill="none"/>` + A(jx, jy - 4, jx, jy - 22, C.cy, 2.5);
      s += planeTop(ex + 8, ey + 14, 0.24, { rot: -30 }) + TL(ex + 26, ey - 4, ['針路 330°', '30° で会合'], { c: C.cy, b: 1, fs: 12, a: 'start', lh: 15 });
      s += TL(sx + 18, sy - 8, ['針が動き出したら', '360° へ旋回して乗る'], { c: C.ink, fs: 12, a: 'start', lh: 15 });
      // profile view
      const y0 = 236, X = d => 374 - d * 42, H = h => y0 + 138 - h * 0.052;
      s += T(14, y0, '横から見る（グライドスロープ：上下。高さは誇張）', { c: C.gr, b: 1, a: 'start', fs: 12 });
      s += L(X(0), H(R.elevFt), 394, H(R.elevFt), C.ink, 4) + T(394, H(R.elevFt) + 16, '滑走路', { c: C.mut, fs: 12, a: 'end' });
      const gp = (ang, d) => R.elevFt + Math.tan(ang * DEG) * (d + gp0) * 1852 * PH.FT;
      for (const [a, w, dsh] of [[3.7, 1.2, '4 3'], [2.3, 1.2, '4 3'], [3, 2.5, '']]) { const dm = a === 3 ? faf : Math.min(faf, (2050 - R.elevFt) / (Math.tan(a * DEG) * 1852 * PH.FT) - gp0); s += L(X(-gp0), H(R.elevFt), X(dm), H(gp(a, dm)), C.gr, w, dsh); }
      const fd = (h, a) => (h - R.elevFt) / (Math.tan(a * DEG) * 1852 * PH.FT) - gp0, f12 = fd(2150, 12), f9 = fd(1700, 9);
      s += L(X(-gp0), H(R.elevFt), X(f12), H(2150), C.rd, 1.5, '6 4') + T(X(f12) - 4, H(2150) + 2, '12° 付近：本物に似た偽の道', { c: C.rd, fs: 12, a: 'end', halo: 1 });
      s += L(X(-gp0), H(R.elevFt), X(f9), H(1700), C.rd, 1.2, '2 4') + T(X(f9) - 4, H(1700) + 4, '9° 付近：指示が逆になる', { c: C.rd, fs: 12, a: 'end', halo: 1 });
      s += L(14, H(2000), X(faf), H(2000), C.ink, 2) + planeSide(44, H(2000) - 4, 0.3) + `<circle cx="${X(faf).toFixed(1)}" cy="${H(2000).toFixed(1)}" r="4.5" fill="${C.am}"/>`;
      s += TL(X(faf) - 6, H(2000) + 20, ['2,000 ft・' + faf.toFixed(1) + ' NM', 'ここで下から会合'], { c: C.am, b: 1, fs: 12, a: 'end', lh: 15 });
      s += T(X(4.2), H(gp(2.3, 4.2)) + 18, '3°（上下 ±0.7°）', { c: C.gr, b: 1, fs: 12 });
      // the DA: the point on the path, and its label below the ground line with a short leader (no line crosses it)
      const dx = X(daNm), dy = H(255), gy = H(R.elevFt);
      s += `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="4.5" fill="${C.rd}"/>` + L(dx, dy + 5, dx - 22, gy + 14, C.rd, 1.2);
      s += T(dx - 26, gy + 18, 'DA 255 ft（接地帯から 200 ft）', { c: C.rd, b: 1, fs: 12, a: 'end' });
      // how the needles read: the CDI bar and the glide slope diamond point to where the path is
      const y1 = 418, cases = [[1, -1, 'コースは右・自分は高い', '→ 右へ 2〜5°・降下率を少し増やす'], [-1, 1, 'コースは左・自分は低い', '→ 左へ 2〜5°・降下率を少し減らす'], [0, -1, 'コースに乗っている・自分は高い', '→ 針路はそのまま・降下率を少し増やす'], [1, 0, 'コースは右・高さは正しい', '→ 右へ 2〜5°・降下率はそのまま']];
      s += T(14, y1, '針の読み方：針と菱形は「行くべき道」のある方を指す', { c: C.ink, b: 1, a: 'start', fs: 12 });
      cases.forEach(([lc, gc, a, b], i) => {
        const x = 10, y = y1 + 10 + i * 50, cx = x + 34, cy = y + 23;
        let u = `<rect x="${x}" y="${y}" width="380" height="44" rx="6" fill="${C.bg}" stroke="${C.grid}"/>`;
        for (const d of [-2, -1, 1, 2]) u += `<circle cx="${cx + d * 8}" cy="${cy}" r="2.2" fill="none" stroke="${C.ink}"/>` + `<circle cx="${x + 72}" cy="${cy + d * 8}" r="2.2" fill="none" stroke="${C.ink}"/>`;
        u += L(cx + lc * 8, cy - 15, cx + lc * 8, cy + 15, C.gr, 3) + L(cx - 3, cy, cx + 3, cy, C.mut, 1);
        const gy2 = cy - gc * 8;
        u += `<path d="M${x + 72} ${gy2 - 6} L${x + 77} ${gy2} L${x + 72} ${gy2 + 6} L${x + 67} ${gy2} Z" fill="${C.gr}"/>`;
        s += u + TL(x + 90, y + 18, [a, b], { c: C.ink, fs: 12, a: 'start', lh: 17 });
      });
      s += NFN(392, 222);
      return svg(400, 632, s, '図：計器着陸装置（ILS、instrument landing system）を上と横から見た模式図と、針の読み方。上にできる偽のコースには、チャートの高度で下から会合すれば出会いません（IFH 追補 B）');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
