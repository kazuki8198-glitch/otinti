// DRAFT (W31, R3) — the figures of Part 5's chapters 'me'「Piper Seminole と双発機の基礎」and 'oei'「片発停止の空力と操作」
// (textbook/rewrite/combined/DESIGN.md 3.3 第 5 部 第 35・36 章, 4.2 kiso02・kiso03・kiso13, 7.2 W31). No product reads this
// file: it is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p5-figs.js textbook/rewrite/combined/drafts/p5.js
// and, when the chapters are registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys;
// the helpers below are copied unchanged from book-figs.js, so the functions run the same way there).
//
// What is here (one function per figure; the caption says what to look at):
//   new      propGovernor     me.prop — the basic course's ch03-fig3-6「定速プロペラのフィードバック」redrawn: the propeller
//                             lever selects an rpm, the governor compares it with the rpm now and changes the blade angle,
//                             the load changes and the rpm comes back; nose up → flatter blades, nose down → coarser (AFH
//                             chapter 12); it does not hold the power or the thrust constant. kiso03.16.
//   new      twinSystems      me.sys — the basic course's ch13-fig13-9「冗長性を数だけで判断しない」redrawn with the Seminole
//                             of Piper's Information Manual (VB-1942, POH content): one 60 A alternator and one engine-driven
//                             fuel pump on each engine, one electrical system, the electrically driven hydraulic pump of the
//                             gear, the two electric fuel pumps; the common causes (fuel, water, maintenance) over both.
//   new      zeroSideslip     me.drag — the basic course's ch13-fig13-5「ラダーとバンクを組み合わせる理由」redrawn: seen from
//                             behind, left engine failed: wings level and ball centred = a sideslip toward the dead engine;
//                             about 2° toward the live engine with the ball 1/3–1/2 toward it = zero sideslip (AFH chapter 13;
//                             the POH: 2–3° and about 1/2 ball).
//   new      oeiClimbBars     me.perf — the climb with both engines and with one, in the same conditions: the POH's examples
//                             (figures 5-19 and 5-21: 1,250 ft, 8 °C, 3,430 lb, 88 KIAS, gear up: 1,505 and 285 ft/min) and
//                             the course's flight model (sea level, 88 kt: about 1,330 and 280 ft/min, the values me.perf and
//                             flight.test.mjs give); both lose about 8/10 (AFH chapter 13: 80–90 %).
//   new      oeiSteps         me.oei — the memory items in order (AFH chapter 13, the Information Manual 3.5a): safety item ①
//                             in its own colour: the feet identify, the throttle verifies, then feather.
//   new      oeiFlight        me.case — one failure through one flight (kiso13.28): before departure, the takeoff roll, gear
//                             up and climbing, not climbing, after landing; and in red the three things NTSB SA-081's cases
//                             show (below Vmc, a steep turn toward the dead engine, a takeoff with a known power problem).
//   redrawn  counterRotation  me.basics — the same drawing; its words with FL.terms' first-use forms (臨界発動機（critical
//                             engine）, P ファクター（P-factor）, 左右逆回転のプロペラ（counter-rotating propellers）), because the
//                             figure is the first text of the chapter after the aim.
//   redrawn  oeiForces        oei.what — the basic course's ch13-fig13-2「中心から離れた力がヨーを生む」merged in: the arm from
//                             the centre line to the live engine's thrust and「ヨーのモーメント ＝ 推力 × 腕」; the old name
//                             「右ラダー」→ 方向舵 (W21 7 の 3); thrust, drag and windmilling with their English (first use).
//   redrawn  vmcRudder        me.vmc — the same data (FL.physics pa44, 25 s at each speed); 「ラダー」→ 方向舵 (W21 7 の 3).
//   redrawn  vmcFactors       me.vmc — the same table; 「ラダー」→ 方向舵 (W21 7 の 3).
// Unchanged and not repeated here: twinAsi (me.speeds): its words are FL.terms' names already and its numbers come from the
// simulator's data. Every number drawn here is one the text gives with its source (p5.claims.json); text ≥ 12 (≥ 10 px at
// 390 px).
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
  // a tinted box (o: fo fill opacity, dash, rx, sw, fill) and the small arrowheads down and up (the chapter intro's figures)
  const rect = (x, y, w, h, c, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 7}" fill="${o.fill || c}" fill-opacity="${o.fill ? 1 : (o.fo === undefined ? 0.12 : o.fo)}" stroke="${c}" stroke-width="${o.sw || 1.4}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;

  Object.assign(FL.bookFigs, {
    // ---------------------------------------------------------------- me（双発機の基本）
    // me.basics — redrawn: the same drawing as book-figs.js; the words in FL.terms' first-use forms (the figure is the
    // chapter's first text after the aim). AFH chapter 13 (critical engine, P-factor, counter-rotating engines) and the
    // Seminole's Information Manual 7.5 (left clockwise, right counter-clockwise seen from the cockpit)
    counterRotation() {
      const panel = (cy, k, title, cw, lines) => {
        const ex = 24 * k, pr = 12 * k, py = cy - 26 * k, ya = py - 34 * k - 6;
        let s = T(200, cy - 62 * k - 34, title, { c: C.ink, b: 1, fs: 13 }) + planeTop(200, cy, k, { twin: true });
        [[-1, 1], [1, cw ? -1 : 1]].forEach(([side, rot]) => {
          const x = 200 + side * ex, tx = x + rot * pr * 0.55;
          s += A(tx, py + 6, tx, py - 30 * k, C.gr, 3) + `<circle cx="${tx.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" fill="${C.gr}"/>`;
          s += L(200 + side * 3, ya, tx, ya, C.am, 2) + L(tx, ya - 5, tx, ya + 5, C.am, 2);
          s += TL(200 + side * (ex + 36 * k), py - 4, [rot > 0 ? '右回り' : '左回り', '（後ろから）'], { c: C.cy, b: 1, fs: 12, lh: 15 });
        });
        s += L(200, ya - 9, 200, ya + 9, C.mut, 1.5) + T(200, ya - 12, cw ? '推力（thrust）の腕：左右同じ' : '推力の腕：右が長い', { c: C.am, b: 1, fs: 12 });
        return s + TL(200, cy + 58 * k, lines, { c: C.ink, fs: 12, lh: 17 });
      };
      let s = panel(140, 1.45, 'Seminole：左右のプロペラが逆に回る', true, ['下がる羽根（推力が大きい側）が、左右とも内側', '→ どちらが止まっても、残った推力の腕は同じ', '→ 臨界発動機（critical engine）がない']);
      s += L(16, 270, 384, 270, C.grid, 1);
      s += panel(392, 1.2, 'ふつうの双発：どちらも同じ向きに回る', false, ['右エンジンの下がる羽根は外側（腕が長い）', '→ 左が止まると、残った右の推力で大きく振られる', '→ 左エンジンが臨界発動機']);
      s += TL(8, 514, ['緑の矢印：P ファクター（P-factor）による、', '下がる羽根の側の大きな推力'], { c: C.gr, a: 'start', fs: 12, lh: 16 });
      return svg(400, 540, s, '図：左右逆回転のプロペラ（counter-rotating propellers）と推力の腕（上から見た模式図）。Seminole は下がる羽根が左右とも内側なので、どちらのエンジンが止まっても同じです（AFH 第 13 章）');
    },
    // me.prop — the basic course's ch03-fig3-6 redrawn: the governor's loop (AFH chapter 12: the propeller control sets the
    // governor; nose up → the engine slows → flatter blades; nose down → coarser; a constant-speed propeller does not hold the
    // power constant: kiso03.16)
    propGovernor() {
      let s = TL(200, 22, ['定速プロペラ（constant-speed propeller）が', '回転数を保つしくみ'], { c: C.ink, b: 1, fs: 13, lh: 18 });
      const bx = [[20, 66, 'プロペラレバー', ['回転数を選ぶ'], C.cy], [214, 66, 'ガバナー', ['選んだ回転数と', '今の回転数を比べる'], C.am],
        [214, 186, '羽根の角度', ['油圧で浅く・深く', '変える'], C.gr], [20, 186, 'エンジンの負荷', ['が変わり、', '回転数が戻る'], C.vi]];
      for (const [x, y, t, ls, c] of bx) s += BOX(x, y, 166, 84, c, t, ls, { lfs: 12 });
      s += A(188, 108, 210, 108, C.ink, 2.5) + A(297, 152, 297, 182, C.ink, 2.5) + A(212, 228, 190, 228, C.ink, 2.5);
      s += P([[103, 184], [103, 160], [256, 160], [256, 154]], C.ink, 2.5) + `<path d="M256 152 L251 161 L261 161 Z" fill="${C.ink}"/>`;
      s += T(150, 176, 'また比べる', { c: C.mut, fs: 12, halo: 1 });
      s += BOX(20, 290, 360, 92, C.cy, '', [], {});
      s += TL(32, 312, ['機首を上げて速度が落ちる → 羽根を浅く', '機首を下げて速度が上がる → 羽根を深く', '回転数が同じでも、出力はスロットルで変わる'], { c: C.ink, a: 'start', fs: 12, lh: 22 });
      s += T(200, 404, '出力や推力を一定にする装置ではない', { c: C.rd, b: 1, fs: 12 });
      return svg(400, 416, s, '図：定速プロペラが回転数を保つしくみ（模式図）。ガバナーが選んだ回転数と今の回転数を比べ、羽根の角度を変えて回転数を戻します（AFH 第 12 章）');
    },
    // me.sys — the basic course's ch13-fig13-9 redrawn with the Seminole of the Information Manual (VB-1942 7.9・7.15・7.17):
    // two 60 A alternators (one on each engine), one electrical system, the gear's electrically driven reversible hydraulic
    // pump, an engine-driven fuel pump on each engine and two electric fuel pumps; the common causes over both (kiso13.16)
    twinSystems() {
      let s = BOX(12, 10, 376, 50, C.rd, '共通の原因（両方のエンジンに効く）', ['燃料の誤り・水・整備の誤り'], { ly: 42 });
      // the engines
      s += BOX(12, 78, 150, 118, C.mut, '左エンジン（止まった）', [], {});
      s += BOX(238, 78, 150, 118, C.gr, '右エンジン（回っている）', [], {});
      const items = ['発電機（alternator）', '燃料ポンプ（エンジン）', 'プロペラガバナー'];
      items.forEach((t, i) => {
        s += T(87, 126 + i * 24, t, { c: C.mut, fs: 12 }) + T(313, 126 + i * 24, t, { c: C.ink, fs: 12 });
      });
      s += L(22, 112, 152, 190, C.rd, 2.5) + L(152, 112, 22, 190, C.rd, 2.5);
      // the electrical system in the middle
      s += BOX(110, 222, 180, 46, C.cy, '電気の系統', ['（バスと電池）'], { ly: 40 });
      s += P([[87, 196], [87, 245], [108, 245]], C.mut, 2, 'none', '5 4') + A(313, 196, 313, 236, C.gr, 2.5) + A(313, 236, 294, 245, C.gr, 2.5);
      s += T(60, 214, '電気が来ない', { c: C.rd, fs: 12, a: 'start' });
      s += T(322, 216, '1 つで全部', { c: C.gr, fs: 12, a: 'start' });
      // what the electrical system drives
      s += A(200, 268, 200, 290, C.cy, 2.5);
      s += BOX(30, 294, 340, 100, C.cy, '', [], {});
      s += TL(46, 316, ['脚の油圧ポンプ（電動）：どちらが止まっても動く', '電動燃料ポンプ（electric fuel pump）2 つ', '計器・無線', '発電機が 1 つなので、電気の負荷を減らす'], { c: C.ink, a: 'start', fs: 12, lh: 21 });
      s += TL(12, 418, ['数より「何が残り、何が使えなくなるか」', 'Seminole の例：Piper の Information Manual 第 7 章'], { c: C.am, a: 'start', fs: 12, lh: 18 });
      return svg(400, 448, s, '図：片方のエンジンが止まると失うものと残るもの（Seminole の例・模式図）。発電機と燃料ポンプは各エンジンに 1 つずつで、脚のポンプは電動です');
    },
    // me.perf — both engines and one engine in the same conditions: the Information Manual's examples (figures 5-19 and
    // 5-21: 1,250 ft, 8 °C, 3,430 lb, 88 KIAS, gear up) and the course's flight model (sea level, 88 kt; the values of
    // me.perf's table and flight.test.mjs's check)
    oeiClimbBars() {
      const X = v => 150 + v / 1800 * 230;
      let s = T(200, 20, '同じ条件で比べた上昇率（ft/min）', { c: C.ink, b: 1, fs: 13 });
      for (const v of [0, 600, 1200, 1800]) s += L(X(v), 34, X(v), 238, C.grid, 1) + T(X(v), 254, v.toLocaleString('en-US'), { c: C.mut, fs: 12 });
      const rows = [
        ['POH の図の例', '両発', 1505, C.cy, 54], ['（1,250 ft・3,430 lb）', '片方', 285, C.rd, 88],
        ['教材のモデル', '両発', 1330, C.cy, 150], ['（海面付近・88 kt）', '片方', 280, C.rd, 184],
      ];
      for (const [lab, kind, v, c, y] of rows) {
        s += `<rect x="${X(0)}" y="${y}" width="${(X(v) - X(0)).toFixed(1)}" height="24" rx="3" fill="${c}" fill-opacity="0.75"/>`;
        s += T(8, y + 17, lab, { c: C.ink, fs: 12, a: 'start' }) + T(X(0) - 4, y + 17, kind, { c, b: 1, fs: 12, a: 'end' });
        s += T(X(v) + 6, y + 17, v.toLocaleString('en-US'), { c: C.ink, b: 1, fs: 12, a: 'start' });
      }
      s += T(X(1000), 126, '約 81% 減る（参考値）', { c: C.am, b: 1, fs: 12 }) + T(X(1000), 222, '約 79% 減る（教材値）', { c: C.am, b: 1, fs: 12 });
      s += TL(8, 280, ['どちらも、出力は半分でも上昇率はおよそ 8 割減る', '（AFH：80〜90% 失われる）'], { c: C.ink, a: 'start', fs: 12, lh: 18 });
      return svg(400, 312, s, '図：両発と、片方のエンジンが止まったときの上昇率（同じ条件で比べる）。POH の図の例も教材のモデルも、上昇率はおよそ 8 割減ります');
    },
    // ---------------------------------------------------------------- oei（片発停止）
    // oei.what — redrawn, with the basic course's ch13-fig13-2 merged in: the left engine has failed (AFH chapter 13). The
    // right engine's thrust acts at an arm from the centre line (the yawing moment = thrust × arm) and the windmilling left
    // propeller adds drag: the nose turns left (yaw) and the left wing goes down (roll). Right rudder makes a sideways force
    // on the fin to the left, which swings the tail left and the nose back right
    oeiForces() {
      const cx = 200, cy = 206, k = 1.75;
      let s = planeTop(cx, cy, k, { twin: true });
      const ex = 24 * k, py = cy - 26 * k;
      // the dead left engine: the windmilling propeller and its drag
      s += `<circle cx="${cx - ex}" cy="${py}" r="${12 * k}" fill="none" stroke="${C.rd}" stroke-width="2" stroke-dasharray="4 3"/>` + A(cx - ex, py + 6, cx - ex, py + 62, C.rd, 4);
      s += TL(12, py + 80, ['止まった左エンジン：', '風車状態（windmilling）の', 'プロペラの抗力（drag）'], { c: C.rd, b: 1, fs: 12, a: 'start', lh: 15 });
      // the live right engine: thrust, and its arm from the centre line
      s += A(cx + ex, py - 4, cx + ex, py - 66, C.gr, 4) + TL(cx + ex + 12, py - 58, ['生きている右エンジン', 'の推力（thrust）'], { c: C.gr, b: 1, fs: 12, a: 'start', lh: 15 });
      s += L(cx, py - 30, cx, py + 4, C.mut, 1.5, '3 3') + L(cx + 2, py - 22, cx + ex - 2, py - 22, C.am, 2) + L(cx + ex, py - 28, cx + ex, py - 16, C.am, 2);
      s += T(cx + ex / 2 + 1, py - 27, '腕', { c: C.am, b: 1, fs: 12 });
      // the yaw (nose turns left)
      s += ARC(cx, cy, 100, -60, -112, C.am, 3) + T(cx, cy - 116, '機首が止まった側（左）へ回る（ヨー）', { c: C.am, b: 1, fs: 12 });
      s += T(cx, 18, 'ヨーのモーメント（moment）＝ 推力 × 腕', { c: C.ink, b: 1, fs: 13 });
      // the fin force from right rudder: to the left, at the tail
      const ty = cy + 46 * k;
      s += A(cx + 6, ty + 4, cx - 48, ty + 4, C.cy, 4) + TL(12, ty + 28, ['生きている側の足で右の方向舵（rudder）→', '尾翼に左向きの力 → 機首が右へ戻る'], { c: C.cy, b: 1, fs: 12, a: 'start', lh: 15 });
      // the roll seen from behind (small)
      s += `<g transform="rotate(-12 342 362)"><path d="M306 365 L378 365" stroke="${PLANE2}" stroke-width="4" stroke-linecap="round"/><ellipse cx="342" cy="362" rx="6" ry="7" fill="${PLANE}"/><path d="M340 355 L340 344 L344 344 L344 355 Z" fill="${PLANE}"/><circle cx="325" cy="366" r="4" fill="${PLANE2}"/><circle cx="359" cy="366" r="4" fill="${PLANE2}"/><circle cx="325" cy="366" r="8" fill="none" stroke="${C.rd}" stroke-dasharray="3 2"/><circle cx="359" cy="366" r="8" fill="none" stroke="${C.mut}"/></g>` + T(342, 394, '後ろから見ると：', { c: C.mut, fs: 12 }) + T(342, 410, '左の翼が下がる', { c: C.am, b: 1, fs: 12 });
      return svg(400, 420, s, '図：左エンジンが止まると、機首が左へ回り（ヨー）、左の翼が下がります。右の方向舵で止めます（AFH 第 13 章。上から見た模式図）');
    },
    // me.vmc — redrawn: the same data (the course's Seminole, left engine failed and windmilling, right engine at full
    // power, 5° of bank toward it, gear up, each speed held 25 s as flight.test.mjs does; % of full rudder). 「ラダー」→ 方向舵
    vmcRudder() {
      const D1 = [[90, 32], [85, 37], [80, 43], [75, 50], [70, 59], [66, 68], [64, 73], [62, 78], [60, 84], [58, 91], [56, 100]];
      const D5 = [[90, 25], [85, 29], [80, 34], [75, 40], [70, 47], [66, 55], [64, 59], [62, 64], [60, 69], [58, 75], [56, 82]];
      const v = ac('pa44').v, f = frame(400, 300, 50, 95, 0, 110, [50, 60, 70, 80, 90], [0, 25, 50, 75, 100], '指示対気速度（indicated airspeed、kt）', '必要な方向舵の量（%）', { l: 52, r: 14, t: 34, b: 40 });
      let s = `<rect x="${f.X(50)}" y="34" width="${(f.X(62) - f.X(50)).toFixed(1)}" height="${(f.Y(0) - 34).toFixed(1)}" fill="${C.am}" fill-opacity="0.12"/>` + f.s;
      s += T(f.X(50) + 2, 28, '失速警報（stall warning）：約 62 kt 以下', { c: C.am, fs: 12, a: 'start' });
      s += L(f.X(50), f.Y(100), f.X(95), f.Y(100), C.rd, 1.5, '6 4') + T(f.X(94), f.Y(100) - 6, '方向舵いっぱい', { c: C.rd, fs: 12, a: 'end' });
      s += L(f.X(v.mc), f.Y(0), f.X(v.mc), f.Y(110), C.rd, 2.5) + T(f.X(v.mc) + 4, f.Y(10), `赤い線 Vmc ${v.mc}`, { c: C.rd, b: 1, fs: 12, a: 'start' });
      s += P(D1.map(([x, y]) => [f.X(x), f.Y(y)]), C.cy, 3) + P(D5.map(([x, y]) => [f.X(x), f.Y(y)]), C.gr, 3, 'none', '7 4');
      s += T(f.X(78), f.Y(52), '1,000 ft', { c: C.cy, b: 1, fs: 12 }) + T(f.X(84), f.Y(22), '5,000 ft', { c: C.gr, b: 1, fs: 12 });
      s += A(f.X(92), f.Y(70), f.X(80), f.Y(70), C.mut, 2) + T(f.X(86), f.Y(70) - 8, '速度が下がる', { c: C.mut, fs: 12 });
      return svg(400, 300, s, '図：速度が下がるほど、方向を保つのに必要な方向舵が増え、いっぱいになる速度が Vmc です（教材のフライトモデルの Seminole：左エンジン停止・右は全開・バンク 5°）。どちらの高さでも、方向舵がいっぱいになる前に失速警報（約 62 kt）が鳴ります');
    },
    // me.vmc — redrawn: the same table (AFH chapter 13 and the old 14 CFR 23.149); 「ラダー」→ 方向舵
    vmcFactors() {
      return table(['条件と要因（米国の旧 14 CFR 23.149 で Vmc を決めた条件と、Vmc を変える要因）', 'Vmc への影響', '理由'], [
        ['生きているエンジンが最大出力', '高くなる', '非対称の推力が最大'], ['止まった側のプロペラが風車状態で、フェザー（feather）していない', '高くなる', '止まった側の抗力が大きい'],
        ['重心が後方（後方の限界）', '高くなる', '重心から方向舵までの腕が短くなる'], ['重量（weight）が軽い', '高くなる', 'バンクしたときの揚力（lift）の横向きの助けが小さい'],
        ['脚 UP', '高くなる', '脚の「竜骨」のような安定の助けがない'], ['フラップは離陸の位置', '決める条件の 1 つ', '機体によって影響が違う'],
        ['生きている側へバンク（5° まで）', '低くなる', '揚力の横向きの成分が方向舵の横向きの力とつり合い、方向舵を助ける（横滑りが減る）。翼を水平にすると、1° あたり 3 kt 以上、20 kt 近く高くなることがある'],
        ['密度高度（density altitude）が高い（高い所・暑い日）', '低くなる（自然吸気のエンジン）', '出力が減る（ただし失速速度に近づく）']])
        + '<p class="bk-src">出典：FAA Airplane Flying Handbook（FAA-H-8083-3C）第 13 章。米国の今の 14 CFR 23.2135(c) は性能基準の書き方で、表の条件は米国の旧 23.149 のもの。旧 23.149 では、Vmc は最も不利な重量と重心の位置で決める（CAR 3 や初期の Part 23 で認証された機体では、Vmc を決める重量は決められていない）。軽いほど Vmc は高い。密度高度は認証の条件ではなく、いろいろな高度で試験した結果を海面の 1 つの値に直して公表する。数値・条件は機体の AFM が優先。</p>';
    },
    // me.drag — the basic course's ch13-fig13-5 redrawn: seen from behind, the left engine failed (AFH chapter 13: wings
    // level with the ball centred = a moderate sideslip toward the dead engine; about 2° toward the live engine with the
    // ball 1/3–1/2 toward it = zero sideslip). The bank is drawn larger than it is
    zeroSideslip() {
      const rear = (x, y, bank, slip) => {
        let g = `<g transform="translate(${x} ${y}) rotate(${bank})">`;
        g += `<path d="M-92 4 L92 4 L92 9 L-92 9 Z" fill="${PLANE2}"/><ellipse cx="0" cy="0" rx="13" ry="14" fill="${PLANE}"/>`;
        g += `<path d="M-3 -12 L-3 -46 L3 -46 L3 -12 Z" fill="${PLANE}"/><path d="M-26 -46 L26 -46 L26 -42 L-26 -42 Z" fill="${PLANE2}"/>`;
        g += `<circle cx="-42" cy="8" r="9" fill="${PLANE2}"/><circle cx="42" cy="8" r="9" fill="${PLANE2}"/>`;
        g += `<path d="M-50 0 L-34 16 M-34 0 L-50 16" stroke="${C.rd}" stroke-width="2.5"/></g>`;
        // the relative wind seen from behind: from the side the airplane slips toward
        if (slip) g += A(x - 120, y - 2, x - 78, y - 2, C.am, 3) + T(x - 120, y - 12, '横から風', { c: C.am, b: 1, fs: 12, a: 'start' });
        return g;
      };
      const ball = (x, y, off) => `<path d="M${x - 46} ${y - 6} Q${x} ${y + 14} ${x + 46} ${y - 6}" stroke="${C.mut}" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.5"/>`
        + L(x - 9, y - 6, x - 9, y + 14, C.ink, 1.5) + L(x + 9, y - 6, x + 9, y + 14, C.ink, 1.5) + `<circle cx="${x + off}" cy="${y + 3 - Math.abs(off) * 0.12}" r="6" fill="${C.ink}"/>`;
      let s = T(200, 20, '後ろから見る（左エンジンが止まった・傾きは誇張）', { c: C.mut, fs: 12 });
      s += T(200, 46, '① 翼を水平・ボールを中央', { c: C.ink, b: 1, fs: 13 });
      s += rear(230, 96, 0, true) + ball(230, 140, 0);
      s += TL(200, 176, ['止まった側（左）へ横滑りする', '→ 抗力が増え、上昇が落ちる。Vmc も高くなる'], { c: C.rd, b: 1, fs: 12, lh: 17 });
      s += L(16, 214, 384, 214, C.grid, 1);
      s += T(200, 240, '② 生きている側（右）へ約 2° バンク', { c: C.ink, b: 1, fs: 13 });
      s += rear(200, 292, 8, false) + ball(200, 336, 7);
      s += T(264, 340, 'ボールは右へ 1/3〜1/2', { c: C.cy, fs: 12, a: 'start' });
      s += TL(200, 374, ['横滑りゼロ（zero sideslip）', '→ 抗力が最小。上昇がいちばんよい'], { c: C.gr, b: 1, fs: 12, lh: 17 });
      return svg(400, 404, s, '図：片方のエンジンが止まったときの横滑り（後ろから見た模式図）。生きている側へ約 2° バンクし、ボールを 1/3〜1/2 ずらすと、横滑りがなくなります（AFH 第 13 章）');
    },
    // me.oei — the memory items in order (AFH chapter 13's「engine failure after takeoff」checklist and its identify / verify:
    // primarily the control inputs, the gauges only a help; the Information Manual 3.5a: retard the throttle to verify,
    // feather above 950 rpm). Safety item ①: the feet identify, the throttle verifies
    oeiSteps() {
      const st = [
        ['1 操縦', '方向舵で偏揺れを止め、Vyse へ', C.cy], ['2 全部前へ', 'ミクスチャー・プロペラ・スロットル', C.cy], ['3 抗力を減らす', '脚 UP・フラップ UP', C.cy],
        ['4 特定', '遊んでいる足の側が止まった', C.am], ['5 確認', 'その側のスロットルをゆっくり絞る', C.am], ['6 フェザー', '変化がなければ、その側のプロペラ', C.gr],
        ['7 横滑りゼロ', '生きている側へ約 2°', C.cy], ['8 片付け', 'チェックリスト（checklist）で、急がず', C.mut],
      ];
      let s = '';
      st.forEach(([t, d, c], i) => {
        const y = 10 + i * 46;
        s += BOX(12, y, 376, 38, c, '', [], {}) + T(24, y + 24, t, { c, b: 1, fs: 13, a: 'start' }) + T(150, y + 24, d, { c: C.ink, fs: 12, a: 'start' });
      });
      s += T(200, 396, '特定は足、確認はスロットル。計器は補助', { c: C.am, b: 1, fs: 13 });
      return svg(400, 408, s, '図：片方のエンジンが止まったときの記憶項目の順番（模式図）。止まったエンジンは足で特定し、スロットルを絞って確かめてからフェザーします（AFH 第 13 章）');
    },
    // me.case — one failure through one flight (kiso13.28; AFH chapter 13's three takeoff cases; the Information Manual 3.5a),
    // and in red the three things NTSB SA-081's cases show
    oeiFlight() {
      const steps = [
        ['① 出発の前', '性能を調べ、止まる所と続ける所を決めて言う', C.cy],
        ['② 滑走中・脚 DOWN', '出力がおかしい → 両方のスロットルを閉じて止まる', C.am],
        ['③ 脚 UP・上昇できる', '方向 → 速度 → 全部前へ → 特定・確認・フェザー', C.gr],
        ['④ 上昇できない', '速度を守り、制御したまま正面に降りる', C.vi],
        ['⑤ 着陸のあと', '何に気づき、いつ決めたかをふり返る', C.mut],
      ];
      let s = '';
      steps.forEach(([t, d, c], i) => {
        const y = 12 + i * 62;
        s += BOX(12, y, 376, 50, c, '', [], {}) + T(24, y + 20, t, { c, b: 1, fs: 13, a: 'start' }) + T(24, y + 40, d, { c: C.ink, fs: 12, a: 'start' });
        if (i < steps.length - 1) s += `<path d="M200 ${y + 52} l-6 0 l6 8 l6 -8 Z" fill="${C.mut}"/>`;
      });
      s += BOX(12, 326, 376, 84, C.rd, '事故の事例が示すこと（NTSB SA-081）', [], {});
      s += TL(24, 362, ['× 速度を Vmc より下げる', '× 止まった側へ大きく旋回する', '× 出力の不具合を残したまま離陸する'], { c: C.ink, fs: 12, a: 'start', lh: 17 });
      return svg(400, 420, s, '図：1 つの故障から一便を考える（模式図）。決める点は、出発の前に決めておきます。事故の事例では、速度を失うこと、止まった側への旋回、不具合を残した離陸が繰り返されています');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
