// DRAFT (W13, R2) — the figures of Part 1's chapter 'aero'「飛行の原理」 (textbook/rewrite/combined/DESIGN.md 3.3 第 1 部
// 第 5 章, 4.2「図」). No product reads this file: it is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/aero-figs.js textbook/rewrite/combined/drafts/aero.js
// and, when the chapter is registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys;
// the same helpers are there: C, svg, T, L, A, P, TL, BOX, ARC, planeSide, planeFront). Until then the few helpers they
// need are repeated here (same values as book-figs.js).
//
// What is here (W13 draws the figures DESIGN 3.3 names for this chapter's sections; W21 may refine them):
//  NEW (9) — the basic course's figures redrawn on the dark board (DESIGN 4.2: same content, text ≥ 12, viewBox 400 wide;
//  the original figure and the source are recorded: the basic course's figures are its own drawings, not FAA figures),
//  and figures the new sections need:
//    wingTerms      aero.wing    ch01-fig1 redrawn (airfoil section and planform: leading/trailing edge, chord line, mean camber
//                                line, span, chord, wing area, aspect ratio b²/S — NASA Glenn "Wing Geometry Definitions")
//    boundaryLayer  aero.wing    ch01-fig4 redrawn (velocity profile in the boundary layer; separation at a high angle of attack)
//    climbForces    aero.forces  ch01-fig12 redrawn (steady climb: L = W cos γ, T = D + W sin γ; angles drawn large)
//    powerCurve     aero.power   new (PHAK 25C fig. 11-14 as a schematic: power required, minimum power, L/D max tangent,
//                                the region of reversed command; no numbers — no type's curve)
//    glideTriangle  aero.power   ch01-fig8 redrawn (forces in a power-off glide; d ÷ h = L ÷ D in still air)
//    bankLoad       aero.turn    ch01-fig11 redrawn (n = 1/cos φ and √n against bank, computed; the POH's normal-category +3.8)
//    dynStability   aero.stab    ch01-fig13 redrawn (damped / neutral / divergent oscillation: arbitrary units)
//    spinSpiral     aero.spin    new (spin and spiral dive side by side: AFH 3C chapter 5「Spin Awareness」「Spiral Dive」)
//    gustEnvelope   aero.struct  new (maneuvering envelope and gust lines, schematic; old 14 CFR 23.333 shape, no numbers)
//  REDRAWN under the same name (4) — the existing figures with the word the chapter now uses for weight: 重量 (FL.terms
//  'weight'; RULINGS R.weight-unit: 「重量（Weight）」に統一) instead of 重力:
//    forces         aero.forces  (label 重量（Weight）; caption 揚力＝重量)
//    turnForces     aero.turn    (重量, ＝重量を支える)
//    cgTail         aero.stab    (重量（重心）)
//    liftFlow       aero.lift    (ERRATA T.aero.T-10 in the figure too: 「下面の圧力は上がる」 → 上面の圧力が下面より低い — the
//                                text was fixed in R1 (W07a), the label and the caption were not)
// Figures before a term's definition use the word only where the chapter's first use 「正式名（通称、English）」 comes earlier
// in the text (STYLE「用語」: the checker reads the figures' words too).
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
  const ARC = (cx, cy, r, a0, a1, c, w = 2, head = true) => {
    const p = a => [cx + r * Math.cos(a * DEG), cy + r * Math.sin(a * DEG)], [x0, y0] = p(a0), [x1, y1] = p(a1), big = Math.abs(a1 - a0) > 180 ? 1 : 0, sw = a1 > a0 ? 1 : 0;
    let s = `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${big} ${sw} ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
    if (head) { const t = (a1 + (a1 > a0 ? 90 : -90)) * DEG, hh = 8; s += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${(x1 - hh * Math.cos(t - 0.45)).toFixed(1)} ${(y1 - hh * Math.sin(t - 0.45)).toFixed(1)} L${(x1 - hh * Math.cos(t + 0.45)).toFixed(1)} ${(y1 - hh * Math.sin(t + 0.45)).toFixed(1)} Z" fill="${c}"/>`; }
    return s;
  };
  const PLANE = '#dfe6ee', PLANE2 = '#9fb3c8', GLASS = '#5d7fa3';
  const planeSide = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${-(o.pitch || 0)}) scale(${k})">`
    + `<path d="M50 -1 C48 -8 38 -11 26 -12 L14 -16 C2 -18 -10 -16 -18 -12 L-50 -5 L-50 1 L-14 6 C6 8 30 7 44 5 C49 4 51 2 50 -1 Z" fill="${PLANE}"/>`
    + `<path d="M12 -15 C4 -17 -6 -16 -14 -12 L-12 -9 L10 -9 Z" fill="${GLASS}"/><path d="M-38 -6 L-50 -27 L-57 -27 L-54 -3 Z" fill="${PLANE}"/>`
    + `<rect x="-60" y="-4" width="20" height="3.5" rx="1.5" fill="${PLANE2}"/><ellipse cx="6" cy="5" rx="19" ry="2.6" fill="${PLANE2}"/>`
    + (o.gear === false ? '' : `<path d="M2 7 L0 15 M40 5 L40 15" stroke="${PLANE2}" stroke-width="2"/><circle cx="0" cy="16" r="3.4" fill="#5b6b7e"/><circle cx="40" cy="16" r="3" fill="#5b6b7e"/>`)
    + `<line x1="52" y1="-15" x2="52" y2="13" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const planeFront = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${o.bank || 0}) scale(${k})">`
    + `<path d="M-6 6 L-68 -2 L-68 2 L-6 11 Z M6 6 L68 -2 L68 2 L6 11 Z" fill="${PLANE2}"/><path d="M-2 -10 L-3 -34 L3 -34 L2 -10 Z" fill="${PLANE}"/>`
    + `<path d="M-20 -14 L20 -14 L19 -11 L-19 -11 Z" fill="${PLANE2}"/><ellipse cx="0" cy="0" rx="10" ry="11" fill="${PLANE}"/><circle cx="0" cy="0" r="3" fill="${C.mut}"/>`
    + (o.gear === false ? '' : `<path d="M-14 9 L-16 20 M14 9 L16 20 M0 11 L0 20" stroke="${PLANE2}" stroke-width="2"/><circle cx="-16" cy="22" r="3" fill="#5b6b7e"/><circle cx="16" cy="22" r="3" fill="#5b6b7e"/><circle cx="0" cy="22" r="2.6" fill="#5b6b7e"/>`) + '</g>';
  // a cambered four-digit airfoil (NACA 24xx-like shape, camber m at p, thickness t): upper and lower surface points and
  // the mean camber line, for a chord from (x0, y0) of length ch, nose up by a degrees (screen: y down)
  const airfoil = (x0, y0, ch, a = 0, m = 0.04, p = 0.4, t = 0.12, n = 40) => {
    // chord direction (cos r, sin r) and the airfoil's "up" (sin r, −cos r) on the screen (y down): nose up by a degrees
    const r = a * DEG, at = (x, y) => [x0 + ch * (x * Math.cos(r) + y * Math.sin(r)), y0 + ch * (x * Math.sin(r) - y * Math.cos(r))];
    const up = [], lo = [], mean = [];
    for (let i = 0; i <= n; i++) {
      const x = (1 - Math.cos(Math.PI * i / n)) / 2;
      const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
      const yc = x < p ? m / (p * p) * (2 * p * x - x * x) : m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x);
      up.push(at(x, yc + yt)); lo.push(at(x, yc - yt)); mean.push(at(x, yc));
    }
    const camber = x => (x < p ? m / (p * p) * (2 * p * x - x * x) : m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x));
    return { up, lo, mean, le: at(0, 0), te: at(1, 0), point: at, camber };
  };

  Object.assign(FL.bookFigs, {
    // ---------------------------------------------------------------- redrawn under the same name (重力 → 重量)
    forces() {
      // the course's Archer in cruise (110 KIAS, sea level): lift = weight ≈ 10,300 N, drag ≈ 1,160 N — drawn about 9 : 1 would hide
      // thrust and drag, so they are drawn shorter but not to scale (the caption says so)
      let s = planeSide(200, 132, 1.5, { gear: false });
      s += A(206, 124, 206, 34, C.gr, 4) + T(214, 40, '揚力（Lift）', { c: C.gr, b: 1, a: 'start', fs: 14 }) + T(214, 58, '翼が空気から受ける上向きの力', { c: C.ink, a: 'start', fs: 12 });
      s += A(206, 140, 206, 230, C.mut, 4) + T(214, 222, '重量（Weight）', { c: C.mut, b: 1, a: 'start', fs: 14 }) + T(214, 240, '機体・燃料・人・荷物の重さ', { c: C.ink, a: 'start', fs: 12 });
      s += A(284, 132, 340, 132, C.am, 4) + T(392, 116, '推力（Thrust）', { c: C.am, b: 1, a: 'end', fs: 14 }) + T(392, 156, 'プロペラが前へ引く', { c: C.ink, a: 'end', fs: 12 });
      s += A(116, 132, 60, 132, C.rd, 4) + T(8, 116, '抗力（Drag）', { c: C.rd, b: 1, a: 'start', fs: 14 }) + T(8, 156, '空気の抵抗', { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 252, s, '図：飛んでいる飛行機に働く 4 つの力。高度も速度も変わらない水平飛行では、揚力＝重量、推力＝抗力でつり合っています（矢印の長さは模式的。巡航では揚力は抗力の約 9 倍）');
    },
    turnForces() {
      // seen from behind, banked 30° to the right: the lift tilts with the wings; its upward part holds the weight up,
      // its sideways part pulls the airplane round the turn
      const bank = 30, n = 1 / Math.cos(bank * DEG), Wp = 96, Lp = Wp * n, cx = 160, cy = 172;
      const lx = cx + Lp * Math.sin(bank * DEG), ly = cy - Lp * Math.cos(bank * DEG);
      let s = T(12, 22, '後ろから見た図（右へ 30° バンク）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      s += planeFront(cx, cy, 1.5, { bank, gear: false });
      s += L(cx, cy, cx, ly, C.gr, 1.5, '5 4') + L(cx, ly, lx, ly, C.gr, 1.5, '5 4');
      s += A(cx, cy, lx, ly, C.gr, 4) + A(cx, cy, cx, cy + Wp, C.mut, 4) + A(cx, cy + 1, lx, cy + 1, C.am, 3.5);
      s += ARC(cx, cy, 64, -90, -90 + bank, C.vi, 2, false) + T(cx + 22, cy - 70, `${bank}°`, { c: C.vi, b: 1, fs: 13, halo: 1 });
      s += T(lx + 6, ly - 6, `揚力（${n.toFixed(2)} 倍）`, { c: C.gr, b: 1, a: 'start', fs: 13, halo: 1 }) + T(cx - 8, ly + 22, '上向きの分', { c: C.gr, b: 1, a: 'end', fs: 12, halo: 1 }) + T(cx - 8, ly + 38, '＝重量を支える', { c: C.gr, a: 'end', fs: 12, halo: 1 });
      s += T(lx + 10, cy - 30, '横向きの分', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 }) + T(lx + 10, cy - 14, '＝旋回の中心へ引く力', { c: C.am, a: 'start', fs: 12, halo: 1 });
      s += T(cx + 8, cy + Wp - 4, '重量', { c: C.mut, b: 1, a: 'start', fs: 13, halo: 1 }) + T(392, cy + 20, '旋回の中心 →', { c: C.am, a: 'end', fs: 12 });
      s += `<rect x="12" y="282" width="376" height="30" rx="6" fill="${C.gr}" fill-opacity="0.1" stroke="${C.gr}"/>` + T(200, 302, `高度を保つには揚力を ${n.toFixed(2)} 倍に＝荷重倍数 ${n.toFixed(2)} G`, { c: C.gr, b: 1, fs: 13 });
      return svg(400, 320, s, `図：旋回の力。機体を傾けると揚力も傾き、その横向きの分で曲がります。上向きの分が減るので、高度を保つには揚力を増やします（30° バンクで ${n.toFixed(2)} 倍）`);
    },
    cgTail() {
      // longitudinal balance: the centre of gravity ahead of the wing's lift, the tail pushing down (a seesaw)
      const y = 132, cg = 214, cl = 188, tail = 92;            // the nose is to the right: the CG ahead (right) of the lift
      let s = planeSide(200, y, 1.9, { gear: false });
      s += `<circle cx="${cg}" cy="${y}" r="8" fill="#0b1422" stroke="${C.ink}" stroke-width="2"/><path d="M${cg} ${y - 8} A8 8 0 0 1 ${cg + 8} ${y} L${cg} ${y} Z M${cg} ${y + 8} A8 8 0 0 1 ${cg - 8} ${y} L${cg} ${y} Z" fill="${C.ink}"/>`;
      s += A(cl, y - 6, cl, y - 96, C.gr, 4) + T(cl - 8, y - 84, '揚力（主翼）', { c: C.gr, b: 1, a: 'end', fs: 13, halo: 1 });
      s += A(cg, y + 10, cg, y + 96, C.mut, 4) + T(cg - 8, y + 92, '重量（重心）', { c: C.mut, b: 1, a: 'end', fs: 13, halo: 1 });
      s += A(tail, y - 50, tail, y - 8, C.am, 4) + T(tail, y - 58, '尾翼の下向きの力', { c: C.am, b: 1, fs: 13, halo: 1 });
      s += L(cl, y + 24, cg, y + 24, C.ink, 1.5) + L(cl, y + 18, cl, y + 30, C.ink, 1.5) + T(cl - 6, y + 48, '重心は揚力より前（機首側）', { c: C.ink, fs: 12, a: 'end', halo: 1 });
      s += ARC(cl, y, 120, -24, 20, C.rd, 2.5) + T(392, y + 76, '重心が前なので', { c: C.rd, fs: 12, a: 'end', halo: 1 }) + T(392, y + 92, '機首は下がろうとする', { c: C.rd, fs: 12, a: 'end', halo: 1 });
      s += T(12, 22, '横から見た図（縦の釣り合い）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      return svg(400, 252, s, '図：縦の釣り合い。重心は主翼の揚力の中心より前にあり、機首は下がろうとします。それを水平尾翼の下向きの力が支えています。この形が、速度を一定に保とうとする性質（縦の安定）を生みます');
    },

    liftFlow() {
      // a cambered airfoil (NACA 2412 shape) at a small angle of attack; the air bends up a little ahead of it and is
      // turned downward behind it (drawn exaggerated so it can be seen)
      const t = 0.12, m = 0.02, pp = 0.4, aoa = 7 * DEG, x0 = 112, y0 = 128, ch = 180, dw = 13 * DEG;
      const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
      const yt = x => 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
      const yc = x => x < pp ? m / (pp * pp) * (2 * pp * x - x * x) : m / ((1 - pp) ** 2) * (1 - 2 * pp + 2 * pp * x - x * x);
      const tr = (x, y) => [x0 + x * ch * Math.cos(aoa) + y * ch * Math.sin(aoa), y0 + x * ch * Math.sin(aoa) - y * ch * Math.cos(aoa)];
      const up = [], lo = [];
      for (let i = 0; i <= 40; i++) { const x = (1 - Math.cos(Math.PI * i / 40)) / 2; up.push(tr(x, yc(x) + yt(x))); lo.push(tr(x, yc(x) - yt(x))); }
      const xTE = x0 + ch * Math.cos(aoa), yTE = y0 + ch * Math.sin(aoa);
      const mid = x => x < x0 ? y0 - 10 * Math.exp(-(((x - x0) / 40) ** 2)) : x <= xTE ? y0 - 10 * (1 - (x - x0) / (xTE - x0)) + (x - x0) * Math.tan(aoa) : yTE + (x - xTE) * Math.tan(dw) * Math.exp(-(x - xTE) / 220);
      const thick = x => { const u = clamp(((x - x0) / (ch * Math.cos(aoa)) + 0.12) / 1.12, 0, 1); return t * ch * 0.55 * Math.sin(Math.PI * u) ** 0.8; };
      let s = '';
      for (const off of [-78, -50, -24, 26, 52, 80]) {
        const d = Math.exp(-Math.abs(off) / 70), pts = [];
        for (let x = 6; x <= 394; x += 4) pts.push([x, y0 + off * 0.9 + (mid(x) - y0) * d + (off < 0 ? -1 : 1) * thick(x) * d * 0.9]);
        s += P(pts, C.cy, 1.4);
      }
      s += P([...up, ...lo.reverse()], C.ink, 1.2, PLANE);
      s += A(10, 22, 70, 22, C.cy, 2) + T(76, 27, '相対風（前から来る空気）', { c: C.cy, a: 'start', fs: 12, halo: 1 });
      s += T(150, 86, '上面：圧力が低い', { c: C.gr, b: 1, fs: 13, halo: 1 }) + T(150, 186, '下面：上面より圧力が高い', { c: C.am, b: 1, fs: 13, halo: 1 });
      s += A(214, 126, 214, 58, C.gr, 4) + T(224, 62, '揚力', { c: C.gr, b: 1, a: 'start', fs: 15, halo: 1 });
      s += A(318, 166, 352, 206, C.vi, 3) + T(392, 226, '空気を下へ曲げる', { c: C.vi, b: 1, a: 'end', fs: 12, halo: 1 }) + T(392, 242, '（吹き下ろし）', { c: C.vi, a: 'end', fs: 12, halo: 1 });
      return svg(400, 252, s, '図：翼が揚力を生むしくみ。翼は前から来る空気を下へ曲げ、その反作用で上へ押されます。このとき上面の圧力が下面より低くなり、その差が翼を押し上げます。2 つは同じ力の別の見方です');
    },

    // ---------------------------------------------------------------- new: the basic course's figures redrawn, and new figures
    // aero.forces — ch01-fig12 redrawn: a steady climb (the angle drawn large so the parts can be seen)
    climbForces() {
      const g = 12, r = g * DEG, cx = 190, cy = 132, Wl = 102, Ll = Wl * Math.cos(r), Dl = 34, Ws = Wl * Math.sin(r);
      const fx = Math.cos(r), fy = -Math.sin(r);             // forward along the path (screen: up to the right)
      let s = T(12, 22, '一定の速さで上昇しているとき（角度は大きく描いた）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      // the path through the centre of gravity, a horizontal line forward from it, and the climb angle between them
      s += L(cx - 176 * fx, cy - 176 * fy, cx + 200 * fx, cy + 200 * fy, C.cy, 1.5, '6 4') + L(cx, cy, cx + 176, cy, C.mut, 1, '4 4');
      s += ARC(cx, cy, 128, -g, 0, C.vi, 2, false) + T(cx + 134, cy - 10, 'γ', { c: C.vi, b: 1, a: 'start', fs: 13, halo: 1 });
      s += planeSide(cx, cy, 1.05, { pitch: g, gear: false });
      // lift ⟂ path, weight down and its part ⟂ path; along the path: drag and the rearward part of weight behind the tail,
      // thrust ahead of the nose
      const lx = cx - Ll * Math.sin(r), ly = cy - Ll * Math.cos(r);
      s += A(cx, cy, lx.toFixed(1), ly.toFixed(1), C.gr, 4) + T(lx + 10, ly + 6, '揚力 L ＝ W cos γ', { c: C.gr, b: 1, a: 'start', fs: 13, halo: 1 });
      s += A(cx, cy, cx, cy + Wl, C.mut, 4) + T(cx - 8, cy + Wl, '重量 W', { c: C.mut, b: 1, a: 'end', fs: 13, halo: 1 });
      const wcx = cx + Ll * Math.sin(r), wcy = cy + Ll * Math.cos(r);
      s += L(cx, cy, wcx.toFixed(1), wcy.toFixed(1), C.mut, 1.6, '5 3') + L(cx, cy + Wl, wcx.toFixed(1), wcy.toFixed(1), C.mut, 1, '2 3') + T(wcx + 8, wcy + 2, 'W cos γ', { c: C.mut, a: 'start', fs: 12, halo: 1 });
      const bx = cx - 72 * fx, by = cy - 72 * fy, dx = bx - Dl * fx, dy = by - Dl * fy, sx = dx - Ws * fx, sy = dy - Ws * fy;
      s += A(bx.toFixed(1), by.toFixed(1), dx.toFixed(1), dy.toFixed(1), C.rd, 4) + A(dx.toFixed(1), dy.toFixed(1), sx.toFixed(1), sy.toFixed(1), C.am, 4);
      s += T((bx + dx) / 2 + 6, (by + dy) / 2 + 26, '抗力 D', { c: C.rd, b: 1, fs: 12, halo: 1 }) + T(sx + 4, sy + 30, 'W sin γ', { c: C.am, b: 1, a: 'middle', fs: 12, halo: 1 }) + T(sx + 4, sy + 46, '（後ろ向きの分）', { c: C.am, a: 'middle', fs: 12, halo: 1 });
      const tl = Dl + Ws, t0x = cx + 58 * fx, t0y = cy + 58 * fy, tx = t0x + tl * fx, ty = t0y + tl * fy;
      s += A(t0x.toFixed(1), t0y.toFixed(1), tx.toFixed(1), ty.toFixed(1), C.am, 4) + T(t0x + 6, t0y + 30, '推力 T', { c: C.am, b: 1, a: 'start', fs: 13, halo: 1 }) + T(t0x + 6, t0y + 46, '＝ D ＋ W sin γ', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 });
      s += `<rect x="12" y="258" width="376" height="30" rx="6" fill="${C.cy}" fill-opacity="0.1" stroke="${C.cy}"/>` + T(200, 278, '揚力は重量より少し小さい。推力が後ろ向きの分も引き受ける', { c: C.cy, b: 1, fs: 12 });
      return svg(400, 296, s, '図：一定の速さで上昇しているときの力（角度は大きく描いた模式図）。重量を、経路に直角の分（W cos γ）と経路に沿って後ろ向きの分（W sin γ）に分けます。揚力は直角の分とつり合い、推力は抗力と後ろ向きの分の両方とつり合います');
    },
    // aero.wing — ch01-fig1 redrawn: the airfoil section and the planform
    wingTerms() {
      const x0 = 70, y0 = 92, ch = 260, f = airfoil(x0, y0, ch, 0, 0.05, 0.4, 0.13);
      let s = T(12, 22, '翼型（翼を前後に切った断面）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      s += P([...f.up, ...f.lo.slice().reverse()], C.ink, 1.3, PLANE + '33');
      s += L(x0 - 6, y0, x0 + ch + 6, y0, C.am, 2, '7 4') + P(f.mean, C.cy, 2, 'none', '2 3');
      s += `<circle cx="${x0}" cy="${y0}" r="3.5" fill="${C.ink}"/><circle cx="${x0 + ch}" cy="${y0}" r="3.5" fill="${C.ink}"/>`;
      s += T(x0 - 10, y0 + 5, '前縁', { c: C.ink, b: 1, a: 'end', fs: 12 }) + T(x0 + ch + 10, y0 + 5, '後縁', { c: C.ink, b: 1, a: 'start', fs: 12 });
      const mp = f.point(0.62, f.camber(0.62));
      s += L(mp[0], mp[1], mp[0] + 30, 50, C.cy, 1) + T(mp[0] + 32, 46, '平均キャンバー線', { c: C.cy, b: 1, a: 'start', fs: 12 });
      s += T(x0 + 90, y0 + 22, '翼弦線（chord line）', { c: C.am, b: 1, a: 'middle', fs: 12 });
      s += A(x0 + 2, y0 + 44, x0 + ch - 2, y0 + 44, C.mut, 1.5) + A(x0 + ch - 2, y0 + 44, x0 + 2, y0 + 44, C.mut, 1.5) + T(x0 + ch / 2, y0 + 60, '翼弦長 c', { c: C.ink, fs: 12 });
      // the planform: a straight inner part and tapered outer parts (a semi-tapered wing like the Archer's; not to scale)
      const yt = 186, top = 200, le = (x) => top + (Math.abs(x - 200) > 60 ? (Math.abs(x - 200) - 60) * 0.05 : 0), te = (x) => top + 46 - (Math.abs(x - 200) > 60 ? (Math.abs(x - 200) - 60) * 0.11 : 0);
      s += T(12, yt, '平面形（上から見た翼）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      const xs = [36, 140, 260, 364], pts = [...xs.map(x => [x, le(x)]), ...xs.slice().reverse().map(x => [x, te(x)])];
      s += P([...pts, pts[0]], C.cy, 1.6, 'rgba(95,212,255,.12)');
      s += A(150, top + 3, 150, top + 43, C.mut, 1.4) + A(150, top + 43, 150, top + 3, C.mut, 1.4) + T(142, top + 28, 'c', { c: C.ink, a: 'end', fs: 12 });
      s += T(262, top + 28, 'S＝翼面積（上から見た面積）', { c: C.cy, b: 1, fs: 12 });
      s += A(38, 268, 362, 268, C.mut, 1.5) + A(362, 268, 38, 268, C.mut, 1.5) + T(200, 286, '翼幅 b（翼端から翼端まで）', { c: C.ink, fs: 12 });
      s += `<rect x="12" y="298" width="376" height="28" rx="6" fill="${C.gr}" fill-opacity="0.1" stroke="${C.gr}"/>` + T(200, 317, 'アスペクト比（aspect ratio）＝ b² ÷ S', { c: C.gr, b: 1, fs: 13 });
      return svg(400, 334, s, '図：翼を表す言葉。上は翼型（断面）で、前縁と後縁を結ぶ直線が翼弦線、上面と下面のまん中を結ぶ線が平均キャンバー線です。下は平面形で、翼面積は上から見た面積です（上面と下面の合計ではありません）。長方形の翼なら、b² ÷ S は b ÷ c と同じです。形は説明のための模式図');
    },
    // aero.wing — ch01-fig4 redrawn: the boundary layer and separation
    boundaryLayer() {
      let s = T(12, 22, '境界層：表面に近いほど空気は遅い', { c: C.ink, b: 1, a: 'start', fs: 13 });
      const sy = 136, d = 80, x0 = 30, len = 168;
      s += `<rect x="18" y="${sy}" width="214" height="9" fill="#5b6b7e"/>` + T(124, sy + 28, '翼の表面（空気の速さはほぼ 0）', { c: C.ink, fs: 12 });
      const tips = [];
      for (const h of [4, 14, 28, 44, 62, 80]) { const u = 1 - (1 - Math.min(h, d) / d) ** 2, y = sy - h; tips.push([x0 + 6 + u * len, y]); s += A(x0, y, x0 + 6 + u * len, y, C.gr, 2); }
      s += P([[x0, sy], ...tips], C.cy, 2);
      s += L(18, sy - d, 232, sy - d, C.mut, 1, '4 3');
      s += L(244, sy - d, 244, sy, C.am, 1.5) + L(240, sy - d, 248, sy - d, C.am, 1.5) + L(240, sy, 248, sy, C.am, 1.5) + T(254, sy - 46, '境界層', { c: C.am, b: 1, a: 'start', fs: 13 }) + T(254, sy - 28, '（厚さは大きく', { c: C.ink, a: 'start', fs: 12 }) + T(254, sy - 12, '描いた）', { c: C.ink, a: 'start', fs: 12 });
      s += T(254, sy - d - 4, '外の流れの速さ', { c: C.ink, a: 'start', fs: 12 });
      // separation at a high angle of attack
      const y1 = 196, x1 = 70, ch = 176, a = 15, f = airfoil(x1, 286, ch, a, 0.04, 0.4, 0.12);
      s += T(12, y1, 'はく離：迎え角が大きいと、流れが表面から離れる', { c: C.ink, b: 1, a: 'start', fs: 13 });
      const sp = f.up[12];
      for (const off of [10, 22, 34]) {
        const pts = [[16, f.up[0][1] - off + 6]];
        for (let i = 3; i <= 12; i++) pts.push([f.up[i][0], f.up[i][1] - off]);
        pts.push([sp[0] + 70, sp[1] - off - 8], [392, sp[1] - off - 20]);
        s += P(pts, C.cy, 1.5);
      }
      s += P([[16, f.lo[0][1] + 14], [x1 + 10, f.lo[2][1] + 14], [f.lo[20][0], f.lo[20][1] + 13], [f.lo[40][0], f.lo[40][1] + 12], [392, f.lo[40][1] + 22]], C.cy, 1.5);
      s += P([...f.up, ...f.lo.slice().reverse()], C.ink, 1.3, PLANE);
      for (let k = 0; k < 3; k++) { const cx = sp[0] + 26 + k * 34, cy = sp[1] + 2 + k * 11; s += `<path d="M${(cx - 8).toFixed(1)} ${cy.toFixed(1)} a8 6 0 1 1 8 6 a4.5 3.5 0 1 1 -3.5 -4.5" stroke="${C.rd}" stroke-width="1.6" fill="none"/>`; }
      s += `<circle cx="${sp[0].toFixed(1)}" cy="${sp[1].toFixed(1)}" r="4.5" fill="${C.rd}"/>` + L(sp[0], sp[1] - 5, sp[0] - 18, y1 + 22, C.rd, 1.2) + T(sp[0] - 20, y1 + 20, 'はく離点', { c: C.rd, b: 1, a: 'end', fs: 12 });
      s += T(16, 352, '後ろに渦ができ、揚力が減る', { c: C.rd, a: 'start', fs: 12 });
      return svg(400, 362, s, '図：境界層とはく離（模式図。厚さや位置は大きく描いた）。上：翼の表面では空気がほとんど止まり、表面から離れるほど外の流れの速さに近づきます。下：迎え角が大きいと、境界層の流れが上面から離れ（はく離）、揚力が減ります');
    },
    // aero.power — a schematic power-required curve (PHAK 25C chapter 11, figure 11-14): no type's numbers
    powerCurve() {
      const W = 400, H = 290, m = { l: 46, r: 16, t: 26, b: 40 }, vmax = 1.78, pmax = 6.2;
      const X = v => m.l + v / vmax * (W - m.l - m.r), Y = p => H - m.b - p / pmax * (H - m.t - m.b);
      const Pr = v => v ** 3 + 1 / v, vs = 0.56, vmp = 3 ** -0.25, avail = v => 5.1 - 0.5 * (v - 0.9) ** 2;
      let s = L(m.l, H - m.b, W - m.r, H - m.b, C.mut, 1.5) + L(m.l, m.t, m.l, H - m.b, C.mut, 1.5);
      s += T((m.l + W - m.r) / 2, H - 10, '速度 →', { c: C.mut, fs: 12 }) + T(16, (m.t + H - m.b) / 2, '必要パワー（＝抗力×速度）→', { c: C.mut, fs: 12, rot: -90 });
      // the region of reversed command (stall → minimum power) and the normal region
      s += `<rect x="${X(vs).toFixed(1)}" y="${m.t}" width="${(X(vmp) - X(vs)).toFixed(1)}" height="${H - m.b - m.t}" fill="${C.rd}" fill-opacity="0.13"/>`;
      s += L(X(vs), m.t, X(vs), H - m.b, C.rd, 1.4, '4 3') + T(X(vs) - 3, H - m.b + 15, '失速', { c: C.rd, fs: 12, a: 'middle' });
      const curve = []; for (let v = vs; v <= 1.72; v += 0.01) curve.push([X(v), Y(Pr(v))]);
      const av = []; for (let v = 0.5; v <= 1.74; v += 0.02) av.push([X(v), Y(avail(v))]);
      s += P(av, C.am, 2, 'none', '7 4') + T(X(1.7), Y(avail(1.6)) + 20, '使えるいちばん大きいパワー', { c: C.am, fs: 12, a: 'end', halo: 1 });
      s += P(curve, C.cy, 3);
      // tangent from the origin: L/D max (power/speed least = drag least)
      s += L(X(0), Y(0), X(1.32), Y(2.64), C.gr, 1.4, '5 4') + `<circle cx="${X(1).toFixed(1)}" cy="${Y(2).toFixed(1)}" r="5" fill="${C.gr}"/>`;
      s += T(X(1) + 8, Y(2) + 22, '揚抗比が最大', { c: C.gr, b: 1, a: 'start', fs: 12, halo: 1 }) + T(X(1) + 8, Y(2) + 38, '（最も遠くへ滑空）', { c: C.gr, a: 'start', fs: 12, halo: 1 });
      s += `<circle cx="${X(vmp).toFixed(1)}" cy="${Y(Pr(vmp)).toFixed(1)}" r="5" fill="${C.vi}"/>`;
      s += T(X(vmp), Y(Pr(vmp)) - 34, '必要パワーが最小', { c: C.vi, b: 1, fs: 12, halo: 1 }) + T(X(vmp), Y(Pr(vmp)) - 18, '（最も長く飛べる）', { c: C.vi, fs: 12, halo: 1 });
      s += T(X((vs + vmp) / 2), m.t + 16, '逆操作域', { c: C.rd, b: 1, fs: 12 }) + T(X((vs + vmp) / 2), m.t + 32, '遅いほど多くのパワー', { c: C.ink, fs: 12 });
      s += T(X(1.42), m.t + 16, '通常の操作域', { c: C.cy, b: 1, fs: 12 }) + T(X(1.42), m.t + 32, '速いほど多くのパワー', { c: C.ink, fs: 12 });
      s += T(X(1.5), Y(Pr(1.5)) + 26, '必要パワー', { c: C.cy, b: 1, a: 'start', fs: 12, halo: 1 });
      return svg(W, H, s, '図：速度と必要パワー（模式図。数値は特定の機体のものではない）。水平飛行を続けるのに要るパワーは、ある速度で最小になります。それより遅い側（赤い帯）では、遅くするほど多くのパワーが要ります（逆操作域）。原点からの線が曲線に接する点が、揚抗比が最大の速度です');
    },
    // aero.power — ch01-fig8 redrawn: the forces in a power-off glide and the glide triangle (angles drawn large)
    glideTriangle() {
      const g = 14, r = g * DEG, cx = 112, cy = 112;
      let s = T(12, 22, '推力のない滑空（角度は大きく描いた）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      s += L(20, cy - 92 * Math.tan(r), 216, cy + 104 * Math.tan(r), C.cy, 1.5, '6 4');
      s += planeSide(cx, cy, 0.85, { pitch: -g + 4, gear: false });
      const lx = cx + 78 * Math.sin(r), ly = cy - 78 * Math.cos(r), bx = cx - 56 * Math.cos(r), by = cy - 56 * Math.sin(r), dx = bx - 36 * Math.cos(r), dy = by - 36 * Math.sin(r);
      s += A(cx, cy, lx.toFixed(1), ly.toFixed(1), C.gr, 4) + T(lx + 6, ly + 4, '揚力 L', { c: C.gr, b: 1, a: 'start', fs: 13, halo: 1 });
      s += A(bx.toFixed(1), by.toFixed(1), dx.toFixed(1), dy.toFixed(1), C.rd, 4) + T(dx + 8, dy + 26, '抗力 D', { c: C.rd, b: 1, a: 'start', fs: 13, halo: 1 });
      s += A(cx, cy, cx, cy + 82, C.mut, 4) + T(cx + 8, cy + 80, '重量 W', { c: C.mut, b: 1, a: 'start', fs: 13, halo: 1 });
      s += T(20, 222, '重量の前向きの分が、', { c: C.ink, a: 'start', fs: 12 }) + T(20, 238, '抗力とつり合う', { c: C.ink, a: 'start', fs: 12 });
      // the triangle: height lost h and distance d
      const tx0 = 244, ty0 = 64, tx1 = 384, ty1 = 186;
      s += P([[tx0, ty0], [tx1, ty1], [tx0, ty1], [tx0, ty0]], C.cy, 1.6, 'rgba(95,212,255,.08)');
      s += T(tx0 - 6, (ty0 + ty1) / 2 - 4, '高度差', { c: C.ink, a: 'end', fs: 12 }) + T(tx0 - 6, (ty0 + ty1) / 2 + 12, 'h', { c: C.ink, a: 'end', fs: 12 }) + T((tx0 + tx1) / 2, ty1 + 18, '水平距離 d', { c: C.ink, fs: 12 });
      s += T((tx0 + tx1) / 2 + 22, (ty0 + ty1) / 2 - 10, '滑空の経路', { c: C.cy, a: 'start', fs: 12, halo: 1 });
      s += `<rect x="236" y="214" width="156" height="28" rx="6" fill="${C.gr}" fill-opacity="0.1" stroke="${C.gr}"/>` + T(314, 233, '無風なら d ÷ h ＝ L ÷ D', { c: C.gr, b: 1, fs: 12 });
      return svg(400, 250, s, '図：推力のない滑空（角度は大きく描いた模式図）。重量の前向きの分が抗力とつり合い、飛行機は経路に沿って一定の速さで降ります。風がなければ、進む距離と失う高度の比（d ÷ h）は揚抗比（L ÷ D）と同じです');
    },
    // aero.turn — ch01-fig11 redrawn: the load factor and the stall speed ratio against bank (level, coordinated turn; computed)
    bankLoad() {
      const W = 400, H = 270, m = { l: 44, r: 16, t: 34, b: 40 }, b0 = 0, b1 = 80, n0 = 1, n1 = 5;
      const X = b => m.l + (b - b0) / (b1 - b0) * (W - m.l - m.r), Y = n => H - m.b - (n - n0) / (n1 - n0) * (H - m.t - m.b);
      let s = '';
      for (const b of [0, 15, 30, 45, 60, 75]) s += L(X(b), m.t, X(b), H - m.b, C.grid, 1) + T(X(b), H - m.b + 16, `${b}°`, { c: C.mut, fs: 12 });
      for (const n of [1, 2, 3, 4, 5]) s += L(m.l, Y(n), W - m.r, Y(n), C.grid, 1) + T(m.l - 6, Y(n) + 4, n, { c: C.mut, fs: 12, a: 'end' });
      s += T((m.l + W - m.r) / 2, H - 6, 'バンク角（高度を保つ釣り合い旋回）', { c: C.mut, fs: 12 }) + T(14, (m.t + H - m.b) / 2, '倍', { c: C.mut, fs: 12 });
      const nn = [], sq = [];
      for (let b = 0; b <= 79.5; b += 0.5) { const n = 1 / Math.cos(b * DEG); if (n <= n1) nn.push([X(b), Y(n)]); if (Math.sqrt(n) <= n1) sq.push([X(b), Y(Math.sqrt(n))]); }
      s += L(m.l, Y(3.8), W - m.r, Y(3.8), C.rd, 1.5, '5 4') + T(m.l + 6, Y(3.8) - 6, 'POH の普通類の制限 +3.8 G', { c: C.rd, b: 1, a: 'start', fs: 12, halo: 1 });
      s += P(sq, C.am, 2.5) + P(nn, C.cy, 3);
      const bx = Math.acos(1 / 3.8) / DEG;
      s += `<circle cx="${X(bx).toFixed(1)}" cy="${Y(3.8).toFixed(1)}" r="4" fill="${C.rd}"/>` + T(X(bx) - 8, Y(3.8) + 18, `約 ${Math.round(bx)}°`, { c: C.rd, b: 1, a: 'end', fs: 12, halo: 1 });
      for (const b of [30, 45, 60]) { const n = 1 / Math.cos(b * DEG); s += `<circle cx="${X(b)}" cy="${Y(n).toFixed(1)}" r="3.5" fill="${C.cy}"/><circle cx="${X(b)}" cy="${Y(Math.sqrt(n)).toFixed(1)}" r="3.5" fill="${C.am}"/>`; }
      s += T(X(60) - 6, Y(2) - 6, '60° で 2.00', { c: C.cy, b: 1, a: 'end', fs: 12, halo: 1 }) + T(X(60) + 6, Y(Math.SQRT2) + 18, '1.41', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 });
      s += L(m.l + 8, 16, m.l + 30, 16, C.cy, 3) + T(m.l + 34, 20, '荷重倍数 n ＝ 1 ÷ cos（バンク角）', { c: C.cy, b: 1, a: 'start', fs: 12 });
      s += L(m.l + 8, Y(4.6), m.l + 30, Y(4.6), C.am, 2.5) + T(m.l + 34, Y(4.6) + 4, '失速速度の倍率 √n', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 });
      return svg(W, H, s, '図：バンク角と荷重倍数・失速速度の倍率（高度を保つ釣り合い旋回の式から計算）。60° で荷重倍数は 2、失速速度は約 1.41 倍です。約 75° で、POH の普通類の制限 +3.8 G に届きます。おすすめのバンク角を示す図ではありません');
    },
    // aero.stab — ch01-fig13 redrawn: dynamic stability (arbitrary units: not a measured airplane)
    dynStability() {
      let s = '';
      const panel = (x, title, sub, c, amp) => {
        let t = `<rect x="${x}" y="8" width="124" height="166" rx="8" fill="${c}" fill-opacity="0.06" stroke="${c}" stroke-opacity="0.5"/>`;
        t += T(x + 62, 28, title, { c, b: 1, fs: 13 }) + T(x + 62, 46, sub, { c: C.ink, fs: 12 });
        t += L(x + 8, 108, x + 116, 108, C.mut, 1, '4 3');
        const pts = []; for (let k = 0; k <= 100; k++) { const tt = k / 100; pts.push([x + 10 + tt * 104, 108 - amp(tt) * Math.cos(tt * 4.2 * Math.PI)]); }
        return t + P(pts, c, 2.4) + T(x + 62, 164, '時間 →', { c: C.mut, fs: 12 });
      };
      s += panel(8, '減衰する', '正の動安定', C.gr, t => 40 * Math.exp(-3.2 * t)) + panel(138, '続く', '中立', C.am, () => 32) + panel(268, '発散する', '負の動安定', C.rd, t => 12 * Math.exp(1.25 * t));
      s += T(200, 196, '3 つとも、最初は元へ戻る向きに動く（正の静安定）', { c: C.ink, fs: 12 });
      return svg(400, 206, s, '図：動安定（ずれたあとの揺れが、時間とともにどうなるか。数学の例で、実際の機体の測定ではない）。3 つとも最初は元へ戻る向きに動きますが、揺れが小さくなるのは左の「減衰する」だけです');
    },
    // aero.spin — new: spin and spiral dive side by side (AFH 3C chapter 5)
    spinSpiral() {
      let s = T(104, 22, 'スピン', { c: C.rd, b: 1, fs: 14 }) + T(296, 22, 'スパイラル', { c: C.am, b: 1, fs: 14 });
      // the paths: a tight corkscrew nearly straight down, and a wide descending turn that tightens
      const cork = [], wide = [];
      for (let t = 0; t <= 3.2; t += 0.02) { cork.push([104 + 16 * Math.sin(t * 2 * Math.PI), 40 + t * 30 + 5 * Math.cos(t * 2 * Math.PI)]); wide.push([296 + (52 - t * 10) * Math.sin(t * 1.6 * Math.PI), 40 + t * 30 + 12 * Math.cos(t * 1.6 * Math.PI)]); }
      s += P(cork, C.rd, 2.2) + P(wide, C.am, 2.2);
      s += A(104, 128, 104, 142, C.rd, 2.5) + A(296, 128, 296, 142, C.am, 2.5);
      const rows = [['翼', 'どちらかが失速している', '失速していない'], ['速度', '低く、ほぼ一定', 'どんどん増える'], ['回復の最初', '方向舵を回転と反対へ', '出力を絞り、少し押す']];
      rows.forEach(([k, a, b], i) => {
        const y = 168 + i * 30;
        s += `<rect x="8" y="${y - 16}" width="384" height="26" rx="5" fill="${i % 2 ? C.bg : 'rgba(150,176,206,.08)'}"/>`;
        s += T(200, y + 1, k, { c: C.mut, b: 1, fs: 12 }) + T(104, y + 1, a, { c: C.ink, fs: 12 }) + T(296, y + 1, b, { c: C.ink, fs: 12 });
      });
      s += `<rect x="8" y="${168 + 3 * 30 - 12}" width="384" height="26" rx="6" fill="${C.cy}" fill-opacity="0.1" stroke="${C.cy}"/>` + T(200, 168 + 3 * 30 + 6, '回る向きは旋回傾斜計で見る（すべり計の玉は使わない）', { c: C.cy, b: 1, fs: 12 });
      return svg(400, 276, s, '図：スピンとスパイラルの違い（AFH 第 5 章から）。スピンは少なくとも片方の翼が失速したまま、速度が低く一定のまま回って落ちます。スパイラルは翼が失速しておらず、速度と荷重倍数がどんどん増えます。回復の手順が違うので、まず見分けます');
    },
    // aero.struct — new: the maneuvering envelope and the gust lines (schematic; the shape of the old 14 CFR 23.333, no numbers)
    gustEnvelope() {
      const W = 400, H = 300, m = { l: 40, r: 16, t: 30, b: 42 }, v1 = 3.7, nLo = -2.2, nHi = 4.6;
      const X = v => m.l + v / v1 * (W - m.l - m.r), Y = n => H - m.b - (n - nLo) / (nHi - nLo) * (H - m.t - m.b);
      const nP = 3.8, nN = -1.52, va = Math.sqrt(nP), vc = 2.7, vd = 3.45, vsN = 1.15;
      let s = L(m.l, Y(0), W - m.r, Y(0), C.mut, 1.2) + L(m.l, m.t, m.l, H - m.b, C.mut, 1.2);
      for (const n of [-1, 1, 2, 3, 4]) s += T(m.l - 6, Y(n) + 4, n, { c: C.mut, fs: 12, a: 'end' });
      s += T(m.l - 6, Y(0) + 4, '0', { c: C.mut, fs: 12, a: 'end' }) + T(14, (m.t + H - m.b) / 2, '荷重倍数 n', { c: C.mut, fs: 12, rot: -90 });
      // maneuvering envelope: stall curves, +limit to VD, −limit at VC rising to 0 at VD (normal category)
      const up = []; for (let v = 0; v <= va; v += 0.02) up.push([X(v), Y(v * v)]);
      const vn = Math.sqrt(-nN) * vsN, dn = []; for (let v = vn; v >= 0; v -= 0.02) dn.push([X(v), Y(-((v / vsN) ** 2))]);
      const env = [...up, [X(va), Y(nP)], [X(vd), Y(nP)], [X(vd), Y(0)], [X(vc), Y(nN)], [X(vn), Y(nN)], ...dn];
      s += P([...env, env[0]], C.cy, 2.2, 'rgba(95,212,255,.10)');
      // gust lines from n = 1 at zero speed: the stronger gust to VC, the weaker one to VD, and the envelope they make
      const g1 = 0.72, g2 = g1 * 0.5;
      const gp = [[X(0), Y(1)], [X(vc), Y(1 + g1 * vc)], [X(vd), Y(1 + g2 * vd)], [X(vd), Y(1 - g2 * vd)], [X(vc), Y(1 - g1 * vc)], [X(0), Y(1)]];
      s += P(gp, C.am, 2, 'none', '6 4');
      for (const [v, t, c] of [[va, 'VA', C.gr], [vc, 'VC', C.ink], [vd, 'VD', C.rd]]) s += L(X(v), Y(0), X(v), H - m.b + 4, c, 1, '3 3') + T(X(v), H - m.b + 18, t, { c, b: 1, fs: 12 });
      s += T(X(1.9), Y(nP) - 8, '＋制限荷重倍数', { c: C.cy, b: 1, fs: 12, halo: 1 }) + T(X(2.2), Y(nN) + 18, '－制限荷重倍数', { c: C.cy, b: 1, fs: 12, halo: 1 });
      s += T(X(0.5), Y(2.6), '失速', { c: C.ink, b: 1, fs: 12, halo: 1 });
      s += T(X(2.0), Y(1.55), '運動包囲線図', { c: C.cy, b: 1, fs: 12, halo: 1 }) + T(X(3.05), Y(-1.1), '突風の線', { c: C.am, b: 1, fs: 12, halo: 1 });
      s += T(W - m.r, 18, '模式図（数値なし）', { c: C.am, b: 1, a: 'end', fs: 12 }) + T((m.l + W - m.r) / 2 - 30, H - 6, '速度（等価対気速度）→', { c: C.mut, fs: 12 });
      return svg(W, H, s, '図：運動包囲線図（青）と突風の線（橙の破線）の模式図。運動包囲線図は、失速の線と制限荷重倍数の線で囲まれた、操縦でかかる荷重の範囲です。突風の線は、決めた強さの上向き・下向きの突風を受けたときの荷重倍数で、速いほど大きくなります。設計は両方を囲む範囲で強さを確かめます');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
