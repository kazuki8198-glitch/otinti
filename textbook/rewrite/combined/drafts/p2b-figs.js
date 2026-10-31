// DRAFT (W28-p2b, R3) — the figures of Part 2's chapters 'tl'「離陸・場周経路・着陸・着陸復行」, 'emg'「緊急操作（単発機）」 and
// 'solo'「単独飛行（ソロ）への準備と審査」 (textbook/rewrite/combined/DESIGN.md 3.3 第 2 部 第 23〜25 章, 7.2 W28). No product
// reads this file: it is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p2b-figs.js textbook/rewrite/combined/drafts/p2b.js
// and, when the chapters are registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys,
// same helpers there: the helpers below are copied unchanged from book-figs.js so the functions run the same way here).
//
// What is here (one function per figure; the caption says what to look at):
//   new      wakeVortex      ops.wake — DESIGN 3.3「新しい図：渦の沈みと流れ」: ① from the side, the larger airplane's final
//                            approach path, its vortices sinking behind and below it (US AIM 7-4-4: several hundred fpm), the
//                            small airplane at or above the path and touching down beyond the larger one's touchdown point
//                            (AIM 7-4-6); ② from ahead near the ground, a light crosswind of 1–5 kt keeps the upwind vortex
//                            over the runway and hastens the downwind one (AIM 7-4-4); no wind: 2–3 kt sideways.
//   new      imcSteps        emg.imc — the order the book teaches (DESIGN 3.3): wings level on the attitude indicator →
//                            away from terrain → a shallow 180° only when the way back is surely VMC and the terrain allows →
//                            help from ATC. The limits are AFH chapter 18's; the 180° turn's condition is the book's ruling
//                            (RULINGS R.vfr-into-imc). A first figure for CADET's classroom screen.
//   redrawn  pattern         ops.pattern — the same drawing; the leg「ベース」→「ベースレグ」(FL.terms base-leg) in the label
//                            and in the key ④ (W21's report 7.3 left Part 2's figures to their units).
//   redrawn  approachProfile ops.landing — 「ゴーアラウンド」→「着陸復行」in the two gate notes, and the caption's first use
//                            「着陸復行（ゴーアラウンド）」(FL.terms go-around).
//   redrawn  goAroundProfile ops.goaround — 「右ラダー」→「右の方向舵」, 「キャブレターヒート」→「キャブレターヒーター」,
//                            the caption's「着陸復行（ゴーアラウンド）」(W21 7.3: ラダー).
//   redrawn  crabWingLow     ops.xwind — 「左ラダー」「反対のラダー」→「左の方向舵」「反対の方向舵」, the caption's
//                            「方向舵（ラダー）」(W21 7.3).
//   redrawn  soloRoadmap     solo.req — 「ソロ」→「単独飛行」, 「教官」→「操縦教員」, 「クロスカントリー」→「野外飛行」,
//                            「ゴーアラウンド」→「着陸復行」; two long lines split so each fits the 390 px phone (W21 7.3).
//   redrawn  emgTurnback     emg.engine — 「標準旋回」→「毎秒 3° の旋回」in the note and the caption (the chapter's first use of
//                            標準旋回 is then the text's「標準旋回（標準率旋回、standard-rate turn）」). Numbers unchanged.
//   redrawn  glideRange      emg.glide — the label「滑空比 約 8.5：1」→「1,000 ft ごとに約 1.4 NM」(the same model number said as the
//                            text first says it; the text then gives「滑空比（glide ratio）」). The curves are unchanged.
// Unchanged and not repeated here: xwindTable (a table).
// Every number drawn here is one the text gives with its source (p2b.claims.json); text ≥ 12 (≥ 10 px at 390 px).
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  // ---- the helpers of book-figs.js (copied unchanged)
  const DEG = Math.PI / 180;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  // text; o: c colour, fs size, a anchor, b bold, rot degrees, halo (a dark outline so it stays readable over lines)
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''} ${o.rot ? `transform="rotate(${o.rot} ${x} ${y})"` : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${x2 - hh * Math.cos(a - 0.45)} ${y2 - hh * Math.sin(a - 0.45)} L${x2 - hh * Math.cos(a + 0.45)} ${y2 - hh * Math.sin(a + 0.45)} Z" fill="${c}"/>`; };
  const P = (pts, c, w = 2, fill = 'none', dash = '') => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}" stroke="${c}" stroke-width="${w}" fill="${fill}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const frame = (w, h, x0, x1, y0, y1, xt, yt, xl, yl, m = { l: 50, r: 14, t: 14, b: 36 }) => {
    const X = v => m.l + (v - x0) / (x1 - x0) * (w - m.l - m.r), Y = v => h - m.b - (v - y0) / (y1 - y0) * (h - m.t - m.b);
    let s = '';
    for (const v of xt) s += L(X(v), m.t, X(v), h - m.b, C.grid, 1) + T(X(v), h - m.b + 16, v, { c: C.mut, fs: 12 });
    for (const v of yt) s += L(m.l, Y(v), w - m.r, Y(v), C.grid, 1) + T(m.l - 6, Y(v) + 4, v.toLocaleString ? v.toLocaleString() : v, { c: C.mut, fs: 12, a: 'end' });
    s += T((m.l + w - m.r) / 2, h - 4, xl, { c: C.mut, fs: 12 }) + T(14, (m.t + h - m.b) / 2, yl, { c: C.mut, fs: 12, rot: -90 });
    return { X, Y, s };
  };
  const ac = id => FL.physics.AIRCRAFT.find(a => a.id === id);
  const table = (head, rows) => `<table class="bk-t"><tr>${head.map(x => `<th>${x}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</table>`;
  // ---- drawing helpers for the figures (the rewritten book: readable on a 390 px phone — viewBox ≈ 360–440 wide, text ≥ 12)
  // several lines of text: lines is an array (or a string with \n); o as T (+ lh: line height in px)
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  // a rounded box tinted with its colour, with an optional title and lines under it
  const BOX = (x, y, w, h, c, title = '', lines = [], o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${o.fill || c}" fill-opacity="${o.fill ? 1 : 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"/>`
    + (title ? T(x + w / 2, y + (o.ty || 20), title, { c: o.tc || c, b: 1, fs: o.fs || 13 }) : '') + (lines.length ? TL(x + w / 2, y + (o.ly || (title ? 38 : 20)), lines, { c: o.lc || C.ink, fs: o.lfs || 12 }) : '');
  // a circular arc around (cx, cy) from angle a0 to a1 (degrees, 0 = right, clockwise on screen), with an arrowhead at a1
  const ARC = (cx, cy, r, a0, a1, c, w = 2, head = true) => {
    const p = a => [cx + r * Math.cos(a * DEG), cy + r * Math.sin(a * DEG)], [x0, y0] = p(a0), [x1, y1] = p(a1), big = Math.abs(a1 - a0) > 180 ? 1 : 0, sw = a1 > a0 ? 1 : 0;
    let s = `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${big} ${sw} ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
    if (head) { const t = (a1 + (a1 > a0 ? 90 : -90)) * DEG, hh = 8; s += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${(x1 - hh * Math.cos(t - 0.45)).toFixed(1)} ${(y1 - hh * Math.sin(t - 0.45)).toFixed(1)} L${(x1 - hh * Math.cos(t + 0.45)).toFixed(1)} ${(y1 - hh * Math.sin(t + 0.45)).toFixed(1)} Z" fill="${c}"/>`; }
    return s;
  };
  const PLANE = '#dfe6ee', PLANE2 = '#9fb3c8', GLASS = '#5d7fa3';
  // the course's airplanes as simple silhouettes (not to scale for any real type). k = size (1 ≈ 100 px nose to tail).
  // side view, nose to the right; o.pitch rotates it (degrees, nose up +), o.flap draws the flap down (degrees)
  const planeSide = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${-(o.pitch || 0)}) scale(${k})">`
    + `<path d="M50 -1 C48 -8 38 -11 26 -12 L14 -16 C2 -18 -10 -16 -18 -12 L-50 -5 L-50 1 L-14 6 C6 8 30 7 44 5 C49 4 51 2 50 -1 Z" fill="${PLANE}"/>`
    + `<path d="M12 -15 C4 -17 -6 -16 -14 -12 L-12 -9 L10 -9 Z" fill="${GLASS}"/><path d="M-38 -6 L-50 -27 L-57 -27 L-54 -3 Z" fill="${PLANE}"/>`
    + `<rect x="-60" y="-4" width="20" height="3.5" rx="1.5" fill="${PLANE2}"/><ellipse cx="6" cy="5" rx="19" ry="2.6" fill="${PLANE2}"/>`
    + (o.flap ? `<path d="M-12 5 l${(-9 * Math.cos(o.flap * DEG)).toFixed(1)} ${(9 * Math.sin(o.flap * DEG)).toFixed(1)}" stroke="${C.am}" stroke-width="3" stroke-linecap="round"/>` : '')
    + (o.gear === false ? '' : `<path d="M2 7 L0 15 M40 5 L40 15" stroke="${PLANE2}" stroke-width="2"/><circle cx="0" cy="16" r="3.4" fill="#5b6b7e"/><circle cx="40" cy="16" r="3" fill="#5b6b7e"/>`)
    + `<line x1="52" y1="-15" x2="52" y2="13" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  // top view, nose up (north); o.rot turns it clockwise (degrees, = heading on a north-up drawing); o.twin: two engines on the wings
  const planeTop = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${k})">`
    + `<path d="M-68 -8 L68 -8 L66 6 L-66 6 Z" fill="${PLANE}"/><path d="M-22 38 L22 38 L21 45 L-21 45 Z" fill="${PLANE2}"/>`
    + `<path d="M0 -50 C5 -48 7 -40 7 -28 L5 30 L2 50 L-2 50 L-5 30 L-7 -28 C-7 -40 -5 -48 0 -50 Z" fill="${PLANE}"/><path d="M-5 -26 L5 -26 L4 -14 L-4 -14 Z" fill="${GLASS}"/>`
    + (o.twin ? `<rect x="-29" y="-24" width="10" height="26" rx="4" fill="${PLANE2}"/><rect x="19" y="-24" width="10" height="26" rx="4" fill="${PLANE2}"/><line x1="-36" y1="-26" x2="-12" y2="-26" stroke="${C.mut}" stroke-width="2.5"/><line x1="12" y1="-26" x2="36" y2="-26" stroke="${C.mut}" stroke-width="2.5"/>`
      : `<line x1="-12" y1="-52" x2="12" y2="-52" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/>`) + '</g>';
  // front view (seen from ahead), low wing with dihedral; o.bank rotates it (degrees, right wing down +)
  const planeFront = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${o.bank || 0}) scale(${k})">`
    + `<path d="M-6 6 L-68 -2 L-68 2 L-6 11 Z M6 6 L68 -2 L68 2 L6 11 Z" fill="${PLANE2}"/><path d="M-2 -10 L-3 -34 L3 -34 L2 -10 Z" fill="${PLANE}"/>`
    + `<path d="M-20 -14 L20 -14 L19 -11 L-19 -11 Z" fill="${PLANE2}"/><ellipse cx="0" cy="0" rx="10" ry="11" fill="${PLANE}"/><circle cx="0" cy="0" r="3" fill="${C.mut}"/>`
    + (o.gear === false ? '' : `<path d="M-14 9 L-16 20 M14 9 L16 20 M0 11 L0 20" stroke="${PLANE2}" stroke-width="2"/><circle cx="-16" cy="22" r="3" fill="#5b6b7e"/><circle cx="16" cy="22" r="3" fill="#5b6b7e"/><circle cx="0" cy="22" r="2.6" fill="#5b6b7e"/>`) + '</g>';
  // a stamp for schematic maps and charts
  const NFN = (x, y, a = 'end') => T(x, y, '模式図・NOT FOR NAVIGATION', { c: C.am, fs: 12, a, b: 1 });

  Object.assign(FL.bookFigs, {
    // ops.wake — new (DESIGN 3.3「新しい図：渦の沈みと流れ」): US AIM 7-4-4・7-4-6. ① from the side: the larger airplane's
    // final approach path, its vortices sinking below and behind it (several hundred fpm), the small airplane staying at or
    // above the path and touching down beyond the larger one's touchdown point; ② from ahead, near the ground: with a light
    // crosswind (1–5 kt) the upwind vortex stays over the runway and the downwind one drifts away (AIM 7-4-4). Not to scale.
    wakeVortex() {
      const vort = (x, y, c, cw) => `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="3 2"/>` + ARC(x, y, 9, cw ? -150 : -30, cw ? 60 : -240, c, 2);
      let s = `<rect x="4" y="4" width="392" height="196" rx="8" fill="${C.ink}" fill-opacity="0.04" stroke="${C.grid}"/>` + T(14, 24, '① 横から見た進入', { c: C.cy, b: 1, a: 'start', fs: 13 });
      // the ground and the runway
      s += L(8, 172, 392, 172, C.mut, 1.5) + `<rect x="236" y="169" width="156" height="6" fill="#3a4658" stroke="${C.mut}"/>`;
      // the larger airplane's path to its touchdown point (x 290) and the airplane on it (drawn larger than the small one)
      const pY = x => 70 + (x - 20) * (172 - 70) / (290 - 20);
      s += L(20, pY(20), 290, 172, C.mut, 2, '7 4') + planeSide(225, pY(225) - 6, 0.62, { pitch: -4, flap: 30 });
      s += T(14, 58, '大きな機の進入経路', { c: C.mut, a: 'start', fs: 12 });
      // its vortices: behind and below the path, lower (against the path) the farther back
      [[160, 14], [118, 26], [76, 38]].forEach(([x, d]) => { s += vort(x, pY(x) + d, C.am, true); });
      s += T(14, 166, '渦は後ろで下へ沈む（毎分数百 ft）', { c: C.am, a: 'start', fs: 12 });
      // the small airplane above the path, landing beyond the touchdown point
      s += planeSide(110, pY(110) - 34, 0.4, { pitch: -3, flap: 40 }) + `<path d="M132 ${(pY(110) - 32).toFixed(1)} Q 250 ${(pY(250) - 32).toFixed(1)} 336 170" stroke="${C.gr}" stroke-width="2.5" fill="none"/>`;
      s += T(392, 46, '経路と同じ高さか上を飛ぶ', { c: C.gr, b: 1, a: 'end', fs: 12 });
      s += L(290, 160, 290, 186, C.mut, 1.5) + T(290, 196, '大きな機の接地点', { c: C.mut, fs: 12 });
      s += `<circle cx="336" cy="170" r="4.5" fill="${C.gr}"/>` + T(392, 148, 'その先に接地', { c: C.gr, b: 1, a: 'end', fs: 12 });
      // ② from ahead, near the ground, with a light crosswind from the left
      s += `<rect x="4" y="208" width="392" height="150" rx="8" fill="${C.ink}" fill-opacity="0.04" stroke="${C.grid}"/>` + T(14, 228, '② 前から見た地面の近く（弱い横風）', { c: C.cy, b: 1, a: 'start', fs: 13 });
      s += L(8, 320, 392, 320, C.mut, 1.5) + `<rect x="130" y="317" width="140" height="6" fill="#3a4658" stroke="${C.mut}"/>` + T(200, 340, '滑走路（接地帯）', { c: C.mut, fs: 12 });
      s += A(20, 262, 70, 262, C.am, 3) + TL(20, 250, ['横風 1〜5 kt'], { c: C.am, b: 1, a: 'start', fs: 12 });
      s += vort(180, 298, C.am, true) + A(194, 298, 204, 298, C.am, 2) + TL(176, 274, ['風上の渦は', '残りやすい'], { c: C.ink, a: 'end', fs: 12, lh: 15 });
      s += vort(300, 298, C.am, false) + A(314, 298, 352, 298, C.am, 2.5) + TL(300, 274, ['風下の渦は', '早く流れる'], { c: C.ink, a: 'start', fs: 12, lh: 15 });
      s += T(200, 354, '無風なら、地面近くの渦は 2〜3 kt で左右へ広がる', { c: C.mut, fs: 12 });
      return svg(400, 362, s, '図：後方乱気流（wake turbulence）の渦の動き方（模式図。縮尺どおりではありません）。① 渦は大きな機の後ろで下へ沈むので、その機の進入経路と同じ高さか上を飛び、その機の接地点の先に接地します。② 地面の近くでは渦は横へ広がり、弱い横風では風上の渦が接地帯に残ることがあります（米国の AIM 7-4-4・7-4-6）');
    },
    // emg.imc — new: the order the book teaches when a VFR flight enters cloud (DESIGN 3.3: wings level on the instruments →
    // away from terrain → a shallow 180° only when the way back is surely VMC and the terrain allows → help); the manoeuvre
    // limits are AFH chapter 18's (p.18-17〜18-21: wings level first, bank ≤ 10°, pitch one bar width, no climbing turns,
    // descents ≤ 500 fpm, ask ATC to slow down); the 180° turn's conditions are the book's ruling (RULINGS R.vfr-into-imc)
    imcSteps() {
      const steps = [
        ['1', '翼を水平に保つ（計器で）', ['姿勢指示器（attitude indicator）を見る', '外をのぞかない。トリム（trim）を取る'], C.cy],
        ['2', '地形から離れる', ['上げ下げは横棒の太さ 1 本分まで', '上昇と旋回を同時にしない'], C.am],
        ['3', '浅いバンクで 180° 旋回', ['来た方が確実に晴れて地形が許すときだけ', 'バンク 10° 以下。少し回っては水平に'], C.gr],
        ['4', '管制に助けを求める', ['計器飛行の資格がないことと天気を伝える', '急がされても急な操作はしない'], C.vi]];
      let s = `<rect x="4" y="6" width="392" height="44" rx="8" fill="${C.rd}" fill-opacity="0.12" stroke="${C.rd}" stroke-width="1.5"/>`
        + T(200, 25, 'いちばんよいのは、雲に入る前に', { c: C.ink, b: 1, fs: 13 }) + T(200, 43, '引き返すか、近くの空港に降りること', { c: C.ink, b: 1, fs: 13 });
      let y = 62;
      s += T(200, y + 8, 'それでも VFR で雲に入ったら、この順番で', { c: C.mut, fs: 12 });
      y += 18;
      for (const [n, title, lines, c] of steps) {
        const h = 36 + lines.length * 16;
        s += `<rect x="4" y="${y}" width="392" height="${h}" rx="8" fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-width="1.5"/>`;
        s += `<circle cx="24" cy="${y + 19}" r="11" fill="${c}"/>` + T(24, y + 23.5, n, { c: C.bg, b: 1, fs: 12 });
        s += T(44, y + 23, title, { c: C.ink, b: 1, a: 'start', fs: 13 }) + TL(44, y + 41, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 });
        y += h;
        if (n !== '4') { s += A(200, y + 1, 200, y + 11, C.mut, 2); y += 12; }
      }
      return svg(400, y + 8, s, '図：VFR で雲に入ってしまったときの順番（この本のまとめ）。翼を水平に保つ・バンク 10° 以下・上昇と旋回を同時にしないは AFH 第 18 章の言い方です。180° 旋回の条件は、AFH が向きを決めていないので、この本の判断です');
    },
    pattern() {
      // LAB RWY 36 (fictional) from above, north up: the left traffic pattern of AFH 3C chapter 8, AIM 4-3-2/4-3-3 and AC 90-66C
      // with the course Archer's numbers (lesson t2's brief, AR). Not to scale: the base turn is drawn where the approach end is 45° behind
      const v = ac('pa28').v, rx = 292, r0 = 150, r1 = 250, dx = 150, top = 64, bot = r1 + (rx - dx), mid = (r0 + r1) / 2, rr = 22;
      const tag = (x, y, n, c) => `<circle cx="${x}" cy="${y}" r="11" fill="${c}" stroke="${C.bg}" stroke-width="2"/>` + T(x, y + 4.5, n, { c: C.bg, b: 1, fs: 12 });
      let s = `<rect x="${rx - 7}" y="${r0}" width="14" height="${r1 - r0}" fill="#3a4658" stroke="${C.mut}"/>` + T(rx + 12, r1 - 4, '36', { c: C.ink, b: 1, a: 'start', fs: 12 }) + T(rx + 12, r0 + 14, '18', { c: C.mut, a: 'start', fs: 12 });
      // abeam the approach end, and the 45° look back to it from the base turn
      s += L(dx, r1, rx - 7, r1, C.am, 1.5, '3 4') + L(dx, bot, rx, r1, C.gr, 1.5, '3 4');
      s += P([[rx, r1 - 24], [rx, top + rr], [rx - rr, top], [dx + rr, top], [dx, top + rr], [dx, bot - rr], [dx + rr, bot], [rx - rr, bot], [rx, bot - rr], [rx, r1 + 2]], C.cy, 2.5);
      s += A(rx, 140, rx, 122, C.cy, 2.5) + A(232, top, 212, top, C.cy, 2.5) + A(dx, 318, dx, 336, C.cy, 2.5) + A(206, bot, 226, bot, C.cy, 2.5) + A(rx, 362, rx, 344, C.cy, 2.5);
      // the 45° entry from outside the pattern, level at pattern altitude, to abeam midfield
      s += `<path d="M ${dx - 96} ${mid - 96} L ${dx - 8} ${mid - 8}" stroke="${C.vi}" stroke-width="2.5" stroke-dasharray="7 5" fill="none"/>` + A(dx - 16, mid - 16, dx - 3, mid - 3, C.vi, 2.5);
      // the distance between the downwind and the runway
      s += A(222, 196, dx + 5, 196, C.mut, 1.5) + A(222, 196, rx - 12, 196, C.mut, 1.5) + T(222, 186, '約 1/2〜1 マイル', { c: C.ink, fs: 12 }) + T(222, 214, '（この教材 約 1.6 km）', { c: C.mut, fs: 12 });
      s += T(222, 116, '旋回はすべて左', { c: C.mut, fs: 12 }) + T(222, 134, '場周高度 地上 1,000 ft', { c: C.mut, fs: 12 });
      // leg names
      s += T(dx - 16, 300, 'ダウンウインド', { c: C.cy, fs: 12, rot: -90 }) + T(222, top - 10, 'クロスウインド', { c: C.cy, fs: 12 }) + T(222, bot + 22, 'ベースレグ', { c: C.cy, fs: 12 });
      s += T(rx + 12, 330, 'ファイナル', { c: C.cy, a: 'start', fs: 12 }) + TL(rx + 12, 104, ['離陸上昇', '（Departure）'], { c: C.cy, a: 'start', fs: 12, lh: 15 });
      s += A(380, 30, 380, 76, C.am, 3) + T(380, 22, '風', { c: C.am, b: 1, fs: 12 }) + A(22, 60, 22, 30, C.mut, 2) + T(22, 76, '北', { c: C.mut, fs: 12 });
      s += tag(dx - 48, mid - 48, '①', C.vi) + tag(dx, 116, '②', C.cy) + tag(dx, r1, '③', C.am) + tag(dx + 6, bot - 6, '④', C.gr) + tag(rx, 296, '⑤', C.cy) + tag(rx - 6, top + 6, '⑥', C.cy);
      s += T(200, bot + 46, '模式図（LAB 空港は架空）・NOT FOR NAVIGATION', { c: C.mut, fs: 12 });
      // the key under the drawing
      const key = [['①', C.vi, ['45° で、滑走路の中央の真横へ入る（場周高度で水平に）']], ['②', C.cy, [`ダウンウインド：約 90 kt・着陸前の点検`]],
        ['③', C.am, ['進入端の真横：出力を絞り、フラップ 10°、降下を始める']], ['④', C.gr, ['進入端が斜め後ろ 45° に見えたらベースレグへ', 'フラップ 25°・75 kt']],
        ['⑤', C.cy, [`ファイナル：フラップ 40°・${v.appr} kt・3°`, '旋回は、滑走路から 1/4 マイルより遠くで終える']], ['⑥', C.cy, [`離陸上昇は ${v.y} kt。滑走路の端を越え、`, '場周高度の 300 ft 下まで上がったらクロスウインドへ']]];
      let y = bot + 78;
      for (const [n, c, lines] of key) { s += tag(16, y - 4, n, c) + TL(34, y, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 }); y += lines.length * 16 + 6; }
      s += T(8, y + 4, '速度などは、この教材の Archer の目安（課目 t2）', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, y + 14, s, '図：LAB 空港（架空）の滑走路 36 の左回りの場周経路（上から見た模式図）。形と高さは AFH 第 8 章・米国の AIM 4-3-3・AC 90-66C の目安です。場周高度や回る向きは空港ごとに決まりがあるので、Chart Supplement で確かめます');
    },
    approachProfile() {
      // the final approach from the side (heights drawn ≈ 14 × the horizontal scale): the 3° path to the aiming point, the AFH 3C chapter 9
      // gates (stable by 500 ft in VMC; below 300 ft, unstable → go around at once) and the course Archer's numbers (AR.appr, flaps 40°,
      // ≈ AR.appr × 5.3 fpm as the lessons fly); top right, the PAPI of AIM 2-1-2 (FIG 2-1-2: > 3.5°, 3.2°, 3°, 2.8°, < 2.5°)
      const v = ac('pa28').v, fpm = Math.round(v.appr * 5.3 / 10) * 10, g = 262, ax = 290, k = 0.2, hx = (ax - 12) / (1000 / Math.tan(3 * DEG));
      const P3 = ft => [ax - ft / Math.tan(3 * DEG) * hx, g - ft * k], [x1, y1] = P3(1000), [x5, y5] = P3(500), [x3, y3] = P3(300), [xf, yf] = P3(18);
      let s = L(0, g, 400, g, C.mut, 1.5) + `<rect x="250" y="${g - 3}" width="150" height="6" fill="#3a4658" stroke="${C.mut}"/>` + T(392, g - 10, '滑走路', { c: C.mut, a: 'end', fs: 12 });
      s += L(x1, y1, ax, g, C.cy, 2.5) + `<path d="M ${xf.toFixed(1)} ${yf.toFixed(1)} Q ${ax + 6} ${g - 1} 334 ${g - 3}" stroke="${C.cy}" stroke-width="2" stroke-dasharray="4 3" fill="none"/>`;
      s += `<rect x="${ax - 6}" y="${g - 3}" width="12" height="6" fill="${C.am}"/>` + T(ax, g + 18, '目標点', { c: C.am, b: 1, fs: 12 }) + T(ax, g + 34, '（進入端から約 300 m）', { c: C.mut, fs: 12 });
      s += `<circle cx="334" cy="${g - 3}" r="4" fill="${C.gr}"/>` + T(334, g - 12, '接地', { c: C.gr, fs: 12 });
      // the 500 ft and 300 ft gates
      s += L(x5, y5, x5, g, C.am, 1.5, '4 4') + `<circle cx="${x5.toFixed(1)}" cy="${y5.toFixed(1)}" r="5" fill="${C.am}"/>`;
      s += TL(12, 182, ['地上 500 ft までに安定', 'していなければ', '着陸復行'], { c: C.am, a: 'start', fs: 12, lh: 16 });
      s += L(x3, y3, x3, g, C.rd, 1.5, '4 4') + `<circle cx="${x3.toFixed(1)}" cy="${y3.toFixed(1)}" r="4" fill="${C.rd}"/>`;
      s += TL(12, g + 18, ['地上 300 ft より下で不安定に', 'なったら、すぐに着陸復行'], { c: C.rd, a: 'start', fs: 12, lh: 16 });
      const [px, py] = P3(820);
      s += planeSide(px, py - 1, 0.45, { pitch: -3, flap: 40 }) + T(x1 + 2, y1 - 8, '1,000 ft', { c: C.mut, a: 'start', fs: 12 });
      s += TL(96, 24, ['この教材の Archer', `${v.appr} kt・フラップ 40°`, `降下率 約 ${fpm} fpm`, '3°（PAPI 白 2・赤 2）'], { c: C.ink, a: 'start', fs: 12, lh: 16 });
      // PAPI: red lights grow from the runway side
      s += `<rect x="228" y="8" width="170" height="150" rx="8" fill="${C.ink}" fill-opacity="0.05" stroke="${C.grid}"/>` + T(313, 27, 'PAPI（滑走路の左の灯）', { c: C.ink, b: 1, fs: 12 });
      [[4, '高い（3.5° 超）'], [3, 'やや高い（3.2°）'], [2, '正しい（3°）'], [1, 'やや低い（2.8°）'], [0, '低い（2.5° 未満）']].forEach(([w, lab], i) => {
        const y = 50 + i * 22;
        for (let j = 0; j < 4; j++) s += `<circle cx="${236 + j * 12}" cy="${y}" r="5.5" fill="${j < w ? '#f2f2f2' : '#ff4a3a'}"/>`;
        s += T(284, y + 4, lab, { c: w === 2 ? C.gr : C.ink, b: w === 2 ? 1 : 0, a: 'start', fs: 12 });
      });
      return svg(400, g + 42, s, '図：ファイナル（横から見た模式図。高さは横より大きく描いてあり、滑走路の部分は縮尺どおりではありません）。3° の線で目標点へまっすぐ降り、地上 500 ft までに安定していなければ着陸復行（ゴーアラウンド）します（AFH 第 9 章）。接地はフレア（ラウンドアウト、flare）のぶん目標点より少し先になります。右上は PAPI の見え方（米国の AIM 2-1-2）');
    },
    goAroundProfile() {
      // a go-around from short final (side view, not to scale): AFH 3C chapter 9 Power → Attitude → Configuration with the published
      // Archer III checklist's BALKED LANDING (flaps 25°, 64 kt, 76 kt after the obstacle); the climb rates from the flight model (500 ft)
      const v = ac('pa28').v, PH = FL.physics, s0 = PH.newState({ aircraft: 'pa28' });
      const cl = f => Math.round(PH.steadyState(s0, v.ga, null, { altFt: 500, pwr: 'full', flaps: f }).fpm / 10) * 10, c40 = cl(3), c25 = cl(2);
      const cub = t => { const u = 1 - t, p = [[110, 100], [150, 124], [190, 128], [240, 104]]; return [0, 1].map(i => u * u * u * p[0][i] + 3 * u * u * t * p[1][i] + 3 * u * t * t * p[2][i] + t * t * t * p[3][i]); };
      const tag = (x, y, n, c) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="${c}" stroke="${C.bg}" stroke-width="2"/>` + T(x.toFixed(1), (y + 4.5).toFixed(1), n, { c: C.bg, b: 1, fs: 12 });
      let s = L(0, 176, 400, 176, C.mut, 1.5) + `<rect x="200" y="173" width="200" height="6" fill="#3a4658" stroke="${C.mut}"/>` + T(392, 196, '滑走路', { c: C.mut, a: 'end', fs: 12 });
      s += L(8, 40, 110, 100, C.cy, 2.5) + `<path d="M110 100 C150 124 190 128 240 104 L392 38" stroke="${C.gr}" stroke-width="2.5" fill="none"/>` + A(381, 42.8, 392, 38, C.gr, 2.5);
      s += planeSide(56, 62, 0.42, { pitch: -3, flap: 40 }) + planeSide(338, 55, 0.42, { pitch: 8, flap: 25 });
      s += T(8, 24, `${v.appr} kt・フラップ 40°`, { c: C.mut, a: 'start', fs: 12 }) + T(392, 22, `${v.y} kt・フラップを少しずつ UP`, { c: C.mut, a: 'end', fs: 12 });
      s += T(118, 88, '判断！', { c: C.am, b: 1, a: 'start', fs: 13 }) + T(172, 152, '沈みを小さく', { c: C.mut, fs: 12 });
      const [x2, y2] = cub(0.3), [x3, y3] = cub(0.62), y4 = 104 - (290 - 240) * 66 / 152;
      s += tag(110, 100, '①', C.am) + tag(x2, y2, '②', C.cy) + tag(x3, y3, '③', C.vi) + tag(290, y4, '④', C.gr);
      const key = [['①', C.am, ['Power：決めたらすぐ、なめらかに全開', 'キャブレターヒーター（carburetor heat）は OFF']], ['②', C.cy, ['Attitude：機首が上がり左へ向くので、', '押さえて上昇の姿勢に。右の方向舵']],
        ['③', C.vi, [`Configuration：降下が止まったら、`, `フラップを 25° に。${v.ga} kt`]], ['④', C.gr, [`上昇を確かめ、障害物を越えたら ${v.y} kt`, 'フラップを少しずつ上げる']]];
      let y = 222;
      for (const [n, c, lines] of key) { s += tag(16, y - 4, n, c) + TL(34, y, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 }); y += lines.length * 16 + 6; }
      s += TL(8, y + 6, [`${v.ga} kt・全開の上昇（この教材のフライトモデル）：`, `フラップ 40° のまま 約 +${c40} fpm → 25° で 約 +${c25} fpm`], { c: C.mut, a: 'start', fs: 12, lh: 16 });
      return svg(400, y + 32, s, '図：着陸復行（ゴーアラウンド。横から見た模式図）。AFH 第 9 章の 3 つの原則（Power → Attitude → Configuration）と、公開されている訓練校の Archer III チェックリストの BALKED LANDING（フラップ 25°・64 kt、障害物を越えたら 76 kt）。フラップを一度に上げると沈みます');
    },
    crabWingLow() {
      // the two crosswind methods of AFH 3C chapter 9 (Figures 9-15 and 9-16) from above, the wind from the right, and the wings seen from ahead
      const panel = (x0, title, crab) => {
        const cx = x0 + 96, py = 176, c = crab ? C.cy : C.gr;
        let s = `<rect x="${x0}" y="4" width="192" height="346" rx="8" fill="${C.ink}" fill-opacity="0.04" stroke="${C.grid}"/>` + T(cx, 25, title, { c, b: 1, fs: 13 });
        s += `<rect x="${cx - 9}" y="38" width="18" height="86" fill="#3a4658" stroke="${C.mut}"/>` + L(cx, 124, cx, 252, C.ink, 1.5, '6 5');
        s += A(x0 + 186, 62, x0 + 130, 62, C.am, 3) + T(x0 + 160, 52, '風', { c: C.am, b: 1, fs: 12 });
        s += A(cx, 250, cx, 222, C.gr, 2.5) + T(cx + 8, 248, '進む向き', { c: C.gr, a: 'start', fs: 12 });
        s += planeTop(cx, py, 0.6, { rot: crab ? 15 : 0 });
        if (crab) s += L(cx + Math.sin(15 * DEG) * 32, py - Math.cos(15 * DEG) * 32, cx + Math.sin(15 * DEG) * 64, py - Math.cos(15 * DEG) * 64, C.cy, 2, '4 3') + T(cx + 22, py - 66, '機首', { c: C.cy, a: 'start', fs: 12 });
        else s += A(cx + 38, py - 30, cx + 38, py - 8, C.rd, 2.5) + T(cx + 46, py - 30, '下げる', { c: C.rd, b: 1, a: 'start', fs: 12 }) + T(cx - 12, py + 40, '左の方向舵', { c: C.am, b: 1, a: 'end', fs: 12 });
        s += planeFront(cx, 274, 0.5, { bank: crab ? 0 : 10 }) + T(x0 + 186, 296, '後ろから', { c: C.mut, a: 'end', fs: 12 });
        s += TL(x0 + 10, 316, crab ? ['翼は水平。機首を風上へ向けて、', '進む向きを滑走路に合わせる'] : ['風上の翼を下げて流れを止め、', '反対の方向舵で機首をまっすぐ'], { c: C.ink, a: 'start', fs: 12, lh: 16 });
        return s;
      };
      const s = panel(4, '① クラブ（crab）', true) + panel(204, '② ウイングロー（wing-low）', false);
      return svg(400, 354, s, '図：横風の進入の 2 つのやり方（上から見た模式図。風は右から。下の小さな絵は後ろから見た翼）。① クラブは、接地の直前に方向舵（ラダー）で機首を滑走路と平行にします。② ウイングローは、風上の翼を下げたまま、風上の主輪から接地します。AFH 第 9 章は、多くの場合ウイングローをすすめています');
    },
    soloRoadmap() {
      // the road to the first solo and beyond under 14 CFR part 61 (61.83, 61.23, 61.87(a)(b)(c)(d)(n)(o)(p), 61.93, 61.95) and,
      // at a part 141 school, the stage checks of 141.85
      const steps = [
        ['前提：2 つの証明', ['学生操縦士（student pilot）証明：16 歳以上・英語', '航空身体検査証明（medical certificate）：ふつう', '第 3 種以上（米国の 61.83・61.23）'], C.mut],
        ['単独飛行の前の学科テスト', ['規則・空域・機体の特性。間違いは', '操縦教員（flight instructor）と見直す（米国の 61.87(b)）'], C.cy],
        ['15 項目の飛行訓練と、操縦教員が認める技量', ['離着陸・空中操作・緊急の操作など', '（米国の 61.87(c)(d)）'], C.cy],
        ['段階審査（訓練校）', ['学校の課程で決めた審査（米国の Part 141：141.85）'], C.cy],
        ['ログブックへの承認（endorsement）', ['型式ごと・訓練をした操縦教員が・90 日以内', '（米国の 61.87(n)）'], C.am],
        ['初めての単独飛行', ['乗っているのは自分 1 人（米国の 61.87(a)）'], C.gr],
        ['90 日ごとに承認を更新', ['操縦教員がログブックに書き足す（米国の 61.87(p)）'], C.am],
        ['その先の単独飛行（それぞれ別の承認）', ['25 NM 以内のほかの空港（米国の 61.93）', '野外飛行（cross-country。米国の 61.93）', '夜（米国の 61.87(o)）・Class B 空域（米国の 61.95）'], C.vi]];
      let s = '', y = 6;
      steps.forEach(([title, lines, c], i) => {
        const h = 30 + lines.length * 16;
        s += `<rect x="4" y="${y}" width="392" height="${h}" rx="8" fill="${c}" fill-opacity="${i === 5 ? 0.22 : 0.1}" stroke="${c}" stroke-width="${i === 5 ? 2.5 : 1.5}"/>`;
        s += `<circle cx="24" cy="${y + 19}" r="11" fill="${c}"/>` + T(24, y + 23.5, i + 1, { c: C.bg, b: 1, fs: 12 });
        s += T(44, y + 23, title, { c: i === 5 ? C.gr : C.ink, b: 1, a: 'start', fs: 13 }) + TL(44, y + 41, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 });
        y += h;
        if (i < steps.length - 1) { s += A(200, y + 1, 200, y + 13, C.mut, 2); y += 14; }
      });
      return svg(400, y + 6, s, '図：初めての単独飛行（ソロ）までの道のりと、その先（米国の 14 CFR Part 61 の要点。訓練校の段階審査は Part 141）。承認は学生操縦士証明ではなく、ログブックに書きます（米国の 61.87(n)）');
    },
    emgTurnback() {
      // an engine failure at 300 ft AGL just after takeoff, from above: A, land within about ±30° of straight ahead (the course's lesson e2);
      // B, the AFH 3C chapter 18 turn-back example (Figure 18-5): 4 s to react, a standard-rate turn (3°/s) at 65 kt (radius 2,100 ft),
      // 225° in all, 1,000 fpm → the 300 ft are used up after 300 / (1000 / 60) = 18 s, i.e. 14 s (42°) into the turn
      const agl = 300, fpm = 1000, react = 4, rate = 3, t0 = agl / (fpm / 60), turned = (t0 - react) * rate, below = Math.floor((react + 225 / rate) * fpm / 60) - agl;
      const pane = (x0, title, c) => `<rect x="${x0}" y="4" width="192" height="420" rx="8" fill="${C.ink}" fill-opacity="0.04" stroke="${C.grid}"/>` + T(x0 + 96, 25, title, { c, b: 1, fs: 13 });
      const rwy = (x, y) => `<rect x="${x - 7}" y="${y}" width="14" height="66" fill="#3a4658" stroke="${C.mut}"/>`;
      const stop = (x, y) => `<circle cx="${x}" cy="${y}" r="6" fill="${C.am}" stroke="${C.bg}" stroke-width="2"/>`;
      // A: straight ahead
      let s = pane(4, 'A：正面へ降りる', C.gr) + rwy(100, 250) + L(100, 250, 100, 190, C.cy, 2.5);
      const fan = (cx, cy, r, a) => `<path d="M${cx} ${cy} L${(cx - r * Math.sin(a * DEG)).toFixed(1)} ${(cy - r * Math.cos(a * DEG)).toFixed(1)} A${r} ${r} 0 0 1 ${(cx + r * Math.sin(a * DEG)).toFixed(1)} ${(cy - r * Math.cos(a * DEG)).toFixed(1)} Z" fill="${C.gr}" fill-opacity="0.18" stroke="${C.gr}" stroke-width="1.5"/>`;
      s += fan(100, 190, 130, 30) + A(100, 190, 100, 92, C.gr, 2.5) + T(100, 76, '±30°', { c: C.gr, b: 1, fs: 12 }) + stop(100, 190) + TL(112, 206, [`地上 ${agl} ft で`, 'エンジン停止'], { c: C.am, a: 'start', fs: 12, lh: 15 });
      s += TL(14, 344, ['機首を下げて滑空の速度。', '正面からおよそ ±30° の', '範囲に降りる場所を選ぶ。', '浅い旋回だけで障害物を', '避ける'], { c: C.ink, a: 'start', fs: 12, lh: 16 });
      // B: the turn back, 4,200 ft wide drawn 120 px (radius 60 px)
      const rx = 334, fy = 190, ry = fy - 12, R = 60, cx = rx - R, P = a => [cx + R * Math.cos(a * DEG), ry + R * Math.sin(a * DEG)], [gx, gy] = P(-turned), [ex, ey] = P(-225);
      s += pane(204, 'B：引き返す（危険）', C.rd) + rwy(rx, 250) + L(rx, 250, rx, fy, C.cy, 2.5) + L(rx, fy, rx, ry, C.rd, 2.5);
      s += ARC(cx, ry, R, 0, -turned, C.rd, 2.5, false) + ARC(cx, ry, R, -turned, -225, C.mut, 1.5, true).replace('stroke-width="1.5"', 'stroke-width="1.5" stroke-dasharray="4 4"');
      s += stop(rx, fy) + TL(rx - 8, fy + 18, [`${agl} ft で`, 'エンジン停止'], { c: C.am, a: 'end', fs: 12, lh: 15 });
      s += `<path d="M${(gx - 7).toFixed(1)} ${(gy - 7).toFixed(1)} L${(gx + 7).toFixed(1)} ${(gy + 7).toFixed(1)} M${(gx + 7).toFixed(1)} ${(gy - 7).toFixed(1)} L${(gx - 7).toFixed(1)} ${(gy + 7).toFixed(1)}" stroke="${C.rd}" stroke-width="3.5"/>` + TL(gx + 4, gy - 30, ['約 ' + Math.round(t0) + ' 秒で', '地面'], { c: C.rd, b: 1, a: 'start', fs: 12, lh: 15 });
      s += T(ex - 4, ey + 22, '計画した旋回', { c: C.mut, fs: 12 });
      s += TL(214, 344, ['AFH の例：反応 4 秒、', '毎秒 3° の旋回・65 kt（半径', '2,100 ft）、降下 1,000 fpm。', `225° 回り終えると、`, `滑走路より ${below.toLocaleString('en-US')} ft 下`], { c: C.ink, a: 'start', fs: 12, lh: 16 });
      return svg(400, 428, s, `図：離陸直後、地上 ${agl} ft でエンジンが止まったとき（上から見た模式図）。A：正面へ降りるのが、ふつうはいちばん危険が少ない方法です（±30° はこの教材の課目 e2 の目安）。B：AFH 第 18 章の例のとおり毎秒 3° の旋回で引き返すと、旋回を終える前に地面に着いてしまいます（約 ${Math.round(t0)} 秒・${Math.round(turned)}° 回ったところ）`);
    },
    glideRange() {
      // how far the course Archer glides at the checklist's 76 KIAS from 1,000 / 2,000 / 3,000 ft AGL with the engine stopped (propeller
      // windmilling): the flight model's steady glide (FL.physics.steadyState, pwr 'dead') summed in 50 ft steps with the true airspeed
      // from the density, in still air and with a 10 kt headwind or tailwind
      const PH = FL.physics, s0 = PH.newState({ aircraft: 'pa28' }), kt = ac('pa28').v.glide;
      const dist = (agl, wind) => { let d = 0; for (let h = agl; h > 0; h -= 50) { const r = PH.steadyState(s0, kt, 0, { pwr: 'dead', altFt: h - 25 }), tas = kt / Math.sqrt(PH.atmos((h - 25) / PH.FT).sigma); d += (tas + wind) * (50 / -r.fpm) / 60; } return d; };
      const f = frame(400, 300, 0, 5, 0, 3000, [0, 1, 2, 3, 4, 5], [0, 1000, 2000, 3000], '距離（NM）', '高さ（ft、地面から）', { l: 62, r: 14, t: 24, b: 36 });
      let s = f.s;
      const ends = [];
      for (const agl of [1000, 2000, 3000]) { const d = dist(agl, 0); ends.push([d, C.cy]); s += L(f.X(0), f.Y(agl), f.X(d), f.Y(0), C.cy, 2.5); }
      const dh = dist(3000, -10), dt = dist(3000, 10);
      s += L(f.X(0), f.Y(3000), f.X(dh), f.Y(0), C.am, 2, '6 4') + L(f.X(0), f.Y(3000), f.X(dt), f.Y(0), C.gr, 2, '2 3');
      ends.push([dh, C.am], [dt, C.gr]);
      for (const [d, c] of ends) s += `<circle cx="${f.X(d).toFixed(1)}" cy="${f.Y(0)}" r="3.5" fill="${c}"/>` + T(f.X(d).toFixed(1), f.Y(0) - 8, d.toFixed(1), { c, b: 1, fs: 12, halo: 1 });
      s += L(214, 40, 236, 40, C.cy, 2.5) + T(242, 44, '無風', { c: C.ink, a: 'start', fs: 12 }) + L(214, 60, 236, 60, C.am, 2, '6 4') + T(242, 64, '向かい風 10 kt', { c: C.ink, a: 'start', fs: 12 }) + L(214, 80, 236, 80, C.gr, 2, '2 3') + T(242, 84, '追い風 10 kt', { c: C.ink, a: 'start', fs: 12 });
      s += T(206, 108, `${kt} kt・1,000 ft で約 ${dist(1000, 0).toFixed(1)} NM`, { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 300, s, `図：この教材の Archer が ${kt} kt（チェックリストの最良滑空速度）で滑空したときに届く距離（エンジンが止まり、プロペラは風車の状態。教材のフライトモデルで計算した値）。地面から 1,000 ft ごとに約 ${dist(1000, 0).toFixed(1)} NM。向かい風では短く、追い風では長くなります。実機の値は POH で確かめます`);
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
