// DRAFT (W15, R2) — the figures of Part 1's new chapter 'inst'「計器と表示」 (textbook/rewrite/combined/DESIGN.md
// 3.3 第 1 部 第 7 章). No product reads this file: it is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/sys-figs.js \
//     textbook/rewrite/combined/drafts/sys.js textbook/rewrite/combined/drafts/inst-figs.js textbook/rewrite/combined/drafts/inst.js
// and, when the chapter is registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys,
// same helpers there: C, svg, T, L, A, P, TL, BOX, planeSide). Until then the few helpers they need are repeated here.
//
// What is here (one function per figure; the caption says what to look at, never where it was redrawn from):
//   new  instChain     inst.flow — the basic course's ch04-fig4-1 redrawn on the dark board: measure → compute → display →
//                      use, with the question to ask at each step (content: kiso04.1; PHAK 25C ch. 8 Electronic Flight
//                      Display / ADC).
//   new  instShared    inst.flow — the basic course's ch04-fig4-8 redrawn for the course's G1000-type Archer: one pitot-
//                      static mast feeds the air data computer and the standby instrument (Archer III POH VB-2266 7.21),
//                      the AHRS uses GPS and the ADC's true airspeed as helping inputs (Garmin G1000 Cockpit Reference Guide
//                      for the PA-28-181, GRS 77 / GMU 44 messages: "AHRS utilizes GPS inputs during normal operation",
//                      "not receiving true airspeed from the air data computer"), the standby instrument runs on the
//                      emergency bus too (POH 3.5d).
//   redrawn pitotStatic sys.g1000 — the same drawing as book-figs.js; the standby box no longer says「機械式の機体」(the
//                      Archer III POH's standby is an electronic instrument fed by its own lines from the same mast, 7.21),
//                      and the bottom line names the alternate static source with FL.terms' word (代替静圧源).
//   new  instAsi       inst.speed — how an airspeed indicator works: total pressure into the diaphragm, static pressure in
//                      the case, the difference (dynamic pressure, q = ½ρV²: PHAK 25C ch. 5 and ch. 8) moves the needle.
//   new  instAltErrors inst.alt — the two altimeter errors side by side (PHAK 25C ch. 8: high to low and cold — the
//                      airplane is lower than indicated); a schematic with the differences exaggerated.
//   new  instVsi       inst.alt — the basic course's ch04-fig4-5 redrawn: the diaphragm takes static pressure directly, the
//                      case through a calibrated leak, so the needle lags (6–9 s for the conventional VSI: PHAK 25C ch. 8).
//                      The lag curve is a drawing of that sentence (time constant chosen so it settles in about 7 s).
//   new  instGyros     inst.gyro — rigidity in space and precession, and the three gyro instruments of a conventional
//                      panel with what drives them in many airplanes (PHAK 25C ch. 8: vacuum for the attitude and heading
//                      indicators, electricity for the turn coordinator).
//   new  instPitchPath inst.gyro — the basic course's ch04-fig4-6 redrawn: nose 5° up, angle of attack 8°, flight path 3°
//                      down (θ = α + γ with the wing's incidence taken as 0); angles drawn larger than they are.
//   new  instPfd       inst.pfd — a G1000-type PFD with numbered parts: airspeed tape and TAS, trend vectors (6 s: Garmin
//                      G1000 Pilot's Guide 190-00498-07 and PHAK 25C ch. 8), attitude and the slip trapezoid (one width = one
//                      ball: Archer III POH 7.13), altitude tape with the selected altitude and the altimeter setting, VSI,
//                      HSI with the turn-rate trend (standard rate at the second tick: POH 7.13), the CDI's navigation
//                      source, the red X (G1000 Cockpit Reference Guide).
//   new  instApBand    inst.ap — the basic course's ch04-fig4-10 redrawn as the mode band of a G1000-type autopilot (GFC
//                      700 type: lateral modes left, AP status centre, vertical modes right; active green, armed white; an
//                      armed mode that becomes active moves to the green field and flashes for 10 s; a flashing yellow
//                      mode = lost sensor or navigation data — Garmin G1000 Pilot's Guide 190-00498-07, AFCS) and the flight
//                      director against the autopilot (FD shows commands, AP moves the controls through servos).
//   new  instApLoop    inst.ap — the basic course's ch04-fig4-11 and ch10-fig10-12 redrawn as one loop: intention →
//                      action → read the mode → check the airplane's path; if they do not agree, keep control and
//                      disconnect (Archer III POH Supplement 2, S-TEC System 55X: "anytime the autopilot is not performing
//                      as expected or commanded … AP DISC").
//   new  instFaces     inst.gyro — the faces of the three gyro instruments (revise-inst, reader-inst Y1): the attitude
//                      indicator's bank scale (10・20・30・45・60°: PHAK 25C fig. 8-24 / IFH 5-30), the heading indicator's card,
//                      the turn coordinator's level and standard-rate marks with "2 MIN" and the inclinometer (PHAK 25C fig. 8-21).
//   redrawn compassErrors sys.compass — the same drawing as book-figs.js with FL.terms' word 方向指示器 in its three places
//                      (reader-inst C2) and one clause on the orange mark in the caption (reader-inst M1).
// revise-inst (2026-10-30) also changed: instApBand (lateral armed LEFT of active, "500FPM": Garmin Pilot's Guide ch. 7 —
// factcheck M2, N10), instGyros (precession drawn as a push into the page that shows 90° later in the same direction: PHAK fig.
// 8-19 — factcheck S3; 方位 for the heading column), instPfd (wings level, so the turn-rate line is drawn as its marks only;
// bank scale and a number for the VSI — factcheck N9, reader P6), instShared (the standby box: its own attitude sensor, what it
// shows as the text says — reader F7), instPitchPath (ピッチ角 and aero.aoa's form of the relation — reader C6, expert E-S12),
// pitotStatic (the forward arrow and 代替静圧源 — reader G6, G7).
// Every number drawn here is one the text gives with its source (inst.claims.json); text ≥ 12 (≥ 10 px at 390 px).
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  const DEG = Math.PI / 180;
  // the colours and helpers of book-figs.js (same values)
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const MAG = '#ff4fd8';
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''} ${o.rot ? `transform="rotate(${o.rot} ${x} ${y})"` : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3, dash = '') => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w, dash) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const P = (pts, c, w = 2, fill = 'none', dash = '') => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}" stroke="${c}" stroke-width="${w}" fill="${fill}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const BOX = (x, y, w, h, c, title = '', lines = [], o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${o.fill || c}" fill-opacity="${o.fill ? 1 : 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`
    + (title ? T(x + w / 2, y + (o.ty || 20), title, { c: o.tc || c, b: 1, fs: o.fs || 13 }) : '') + (lines.length ? TL(x + w / 2, y + (o.ly || (title ? 38 : 20)), lines, { c: o.lc || C.ink, fs: o.lfs || 12, lh: o.lh }) : '');
  const PLANE = '#dfe6ee', PLANE2 = '#9fb3c8', GLASS = '#5d7fa3';
  const planeSide = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${-(o.pitch || 0)}) scale(${k})">`
    + `<path d="M50 -1 C48 -8 38 -11 26 -12 L14 -16 C2 -18 -10 -16 -18 -12 L-50 -5 L-50 1 L-14 6 C6 8 30 7 44 5 C49 4 51 2 50 -1 Z" fill="${PLANE}"/>`
    + `<path d="M12 -15 C4 -17 -6 -16 -14 -12 L-12 -9 L10 -9 Z" fill="${GLASS}"/><path d="M-38 -6 L-50 -27 L-57 -27 L-54 -3 Z" fill="${PLANE}"/>`
    + `<rect x="-60" y="-4" width="20" height="3.5" rx="1.5" fill="${PLANE2}"/><ellipse cx="6" cy="5" rx="19" ry="2.6" fill="${PLANE2}"/>`
    + `<line x1="52" y1="-15" x2="52" y2="13" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const num = (x, y, n, c = C.am) => `<circle cx="${x}" cy="${y}" r="9" fill="${C.bg}" stroke="${c}" stroke-width="1.5"/>` + T(x, y + 4, n, { c, b: 1, fs: 12 });

  Object.assign(FL.bookFigs, {
    // ---------------------------------------------------------------- inst.flow (1) — ch04-fig4-1 redrawn
    instChain() {
      const rows = [
        [C.cy, '入力（測る）', ['全圧・静圧・外気温', '回転・地磁気・電波'], ['何を、どこで', '測っているか']],
        [C.vi, '処理（計算する）', ['ADC・AHRS', 'GPS の受信機'], ['何を前提に', '計算しているか']],
        [C.gr, '表示（見せる）', ['テープ・針・数字', '地図・警報'], ['単位・基準・情報源は', '何か。値は有効か']],
        [C.am, '利用（使う）', ['操縦士の操作', '自動操縦'], ['どの機能が', 'その値を使うか']],
      ];
      let s = T(286, 18, '読むときの問い', { c: C.mut, b: 1, fs: 12 });
      rows.forEach(([c, t, sub, q], i) => {
        const y = 26 + i * 80;
        s += BOX(8, y, 160, 62, c, t, sub, { fs: 13, ty: 19, ly: 37, lh: 16 });
        s += TL(286, y + 26, q, { c: C.ink, fs: 12, lh: 17 }) + L(176, y + 31, 196, y + 31, C.grid, 1.5);
        if (i < rows.length - 1) s += A(88, y + 63, 88, y + 78, C.mut, 2);
      });
      s += T(200, 352, '表示がおかしいときは、入力から順にたどる', { c: C.am, b: 1, fs: 13 });
      return svg(400, 364, s, '図：計器の情報は、測る → 計算する → 表示する → 使う、の順に流れます。表示だけを見ず、各段で右の問いを確かめます（模式図）');
    },
    // ---------------------------------------------------------------- inst.flow (2) — ch04-fig4-8 redrawn for the course Archer
    instShared() {
      const col = [8, 146, 282], w = 110;
      let s = '';
      // row 1: sources
      s += BOX(col[0], 10, w, 50, C.cy, '', ['ピトー静圧の柱', '（左の主翼の下）'], { ly: 30, lh: 16 });
      s += BOX(col[1], 10, w, 50, C.vi, '', ['回転と加速度の', 'センサー・地磁気'], { ly: 30, lh: 16 });
      s += BOX(col[2], 10, w, 50, C.gr, '', ['GPS の受信機', '（衛星の電波）'], { ly: 30, lh: 16 });
      // row 2: computers
      s += BOX(col[0], 112, w, 46, C.cy, 'ADC', ['速度・高度を計算'], { fs: 13, ty: 19, ly: 37 });
      s += BOX(col[1], 112, w, 46, C.vi, 'AHRS', ['姿勢・方位を計算'], { fs: 13, ty: 19, ly: 37 });
      // row 3: displays
      s += BOX(col[0], 214, w, 64, C.cy, '', ['PFD の速度', '高度・昇降率'], { ly: 32, lh: 16 });
      s += BOX(col[1], 214, w, 64, C.vi, '', ['PFD の姿勢', '方位'], { ly: 32, lh: 16 });
      s += BOX(col[2] - 8, 214, w + 16, 64, C.am, '', ['予備計器', '速度・高度・方位', '姿勢は別のセンサー'], { ly: 32, lh: 16 });
      // main inputs (solid)
      s += A(40, 61, 40, 110, C.cy, 2.5) + A(40, 159, 40, 212, C.cy, 2.5);
      s += A(201, 61, 201, 110, C.vi, 2.5) + A(201, 159, 201, 212, C.vi, 2.5);
      // the shared mast: the same pressures go to the standby instrument by its own pipes (amber)
      s += P([[96, 61], [96, 84], [384, 84], [384, 200]], C.am, 2.5) + A(384, 196, 384, 212, C.am, 2.5);
      s += TL(330, 128, ['同じ柱から', '別の管で'], { c: C.am, b: 1, fs: 12, lh: 16 });
      // helping inputs (dashed): GPS → AHRS, the ADC's TAS → AHRS
      s += A(300, 61, 248, 108, C.gr, 2, '5 4') + A(119, 135, 144, 135, C.cy, 2, '5 4');
      s += TL(200, 300, ['実線：主の入力　点線：補助の入力（GPS と ADC の TAS）', '橙：主の表示と予備計器が共有している部分'], { c: C.ink, fs: 12, lh: 17 });
      s += TL(200, 338, ['電源（バス・ブレーカー）も共有する部分', '予備計器は非常用の電源でも動く'], { c: C.mut, fs: 12, lh: 17 });
      return svg(400, 366, s, '図：G1000 型の Archer の計器の情報の流れ（模式図）。ピトー静圧の柱は、主の表示と予備計器の両方に空気の圧力を送ります。予備計器の姿勢は、主の AHRS とは別のセンサーから出ます。AHRS は、GPS と ADC の真対気速度を補助に使います');
    },
    // ---------------------------------------------------------------- sys.g1000 — the same drawing as book-figs.js, two labels changed
    pitotStatic() {
      // the Archer's pitot-static mast under the left wing, the pipes to the air data computer and to the standby instrument
      let s = `<path d="M10 36 L250 36 L250 50 L10 46 Z" fill="${PLANE}" fill-opacity="0.25" stroke="${C.mut}"/>` + T(130, 28, '左の主翼（下から見る）', { c: C.mut, fs: 12 });
      s += `<path d="M150 50 L150 78 L104 82 L104 74 L144 72 L144 50 Z" fill="${PLANE2}"/>` + `<circle cx="104" cy="78" r="3.5" fill="#000" stroke="${C.cy}" stroke-width="1.5"/><circle cx="128" cy="76" r="2" fill="#000" stroke="${C.am}"/><circle cx="134" cy="76" r="2" fill="#000" stroke="${C.am}"/>`;
      s += T(12, 68, '← 前（飛ぶ向き）', { c: C.mut, a: 'start', fs: 12 }) + T(10, 110, 'ピトー管の穴（全圧）', { c: C.cy, b: 1, a: 'start', fs: 12 }) + A(60, 100, 100, 82, C.cy, 1.5) + T(196, 100, '静圧孔（静圧）', { c: C.am, b: 1, a: 'start', fs: 12 }) + A(194, 94, 136, 80, C.am, 1.5);
      s += P([[147, 80], [147, 140], [210, 140]], C.cy, 2.5) + P([[141, 80], [141, 156], [210, 156]], C.am, 2.5);
      s += `<rect x="212" y="124" width="70" height="46" rx="7" fill="${C.vi}" fill-opacity="0.15" stroke="${C.vi}"/>` + T(247, 145, 'ADC', { c: C.vi, b: 1, fs: 13 }) + T(247, 161, '計算機', { c: C.ink, fs: 12 });
      s += A(282, 147, 300, 147, C.vi, 2) + `<rect x="302" y="112" width="90" height="72" rx="6" fill="#06101c" stroke="${C.cy}"/>` + T(347, 132, 'PFD', { c: C.cy, b: 1, fs: 13 }) + TL(347, 150, ['速度・高度', '昇降率'], { c: C.ink, fs: 12, lh: 15 });
      s += P([[141, 156], [141, 214], [230, 214]], C.am, 2) + P([[147, 140], [120, 140], [120, 230], [230, 230]], C.cy, 2);
      s += `<rect x="232" y="200" width="160" height="42" rx="6" fill="${C.ink}" fill-opacity="0.06" stroke="${C.mut}"/>` + T(312, 218, '予備計器', { c: C.ink, b: 1, fs: 12 }) + T(312, 234, '（別の管で同じ柱から）', { c: C.mut, fs: 12 });
      s += T(12, 268, '速度計：全圧と静圧の差で決まる', { c: C.ink, a: 'start', fs: 12 }) + T(12, 286, '高度計・昇降計：静圧だけで決まる', { c: C.ink, a: 'start', fs: 12 }) + T(12, 304, 'ほかに：ピトーヒーター・排水口と、機内の', { c: C.mut, a: 'start', fs: 12 }) + T(12, 322, '代替静圧源（代替静圧、alternate static source）', { c: C.mut, a: 'start', fs: 12 });
      s += L(20, 190, 44, 190, C.cy, 2.5) + T(50, 194, '全圧', { c: C.cy, a: 'start', fs: 12 }) + L(20, 208, 44, 208, C.am, 2.5) + T(50, 212, '静圧', { c: C.am, a: 'start', fs: 12 });
      return svg(400, 332, s, '図：Archer のピトー静圧系統（模式図）。左の主翼の下の 1 本の柱に、前向きのピトー管の穴と横向きの静圧孔があり、管で計算機（ADC）と予備計器へつながります');
    },
    // ---------------------------------------------------------------- inst.speed — how the airspeed indicator works
    instAsi() {
      let s = '';
      // the case (static pressure) with the diaphragm (total pressure) and the dial
      s += `<rect x="170" y="26" width="222" height="88" rx="8" fill="${C.am}" fill-opacity="0.07" stroke="${C.am}" stroke-width="1.5"/>` + T(178, 42, 'ケース（静圧）', { c: C.am, b: 1, a: 'start', fs: 12 });
      // diaphragm: an accordion between x 200 and 250
      const d = [[200, 52], [212, 50], [218, 56], [226, 50], [234, 56], [242, 50], [250, 52], [250, 88], [242, 90], [234, 84], [226, 90], [218, 84], [212, 90], [200, 88], [200, 52]];
      s += P(d, C.cy, 2, 'rgba(95,212,255,0.18)') + T(225, 106, 'ダイヤフラム', { c: C.cy, fs: 12 });
      // lever to the dial and the dial
      s += L(250, 70, 300, 70, C.ink, 2) + `<circle cx="336" cy="70" r="32" fill="#060c16" stroke="${C.mut}" stroke-width="1.5"/>`;
      for (let k = 0; k < 9; k++) { const a = (-210 + k * 30) * DEG; s += L(336 + 26 * Math.cos(a), 70 + 26 * Math.sin(a), 336 + 31 * Math.cos(a), 70 + 31 * Math.sin(a), C.ink, 1.2); }
      s += L(336, 70, 336 + 24 * Math.cos(-40 * DEG), 70 + 24 * Math.sin(-40 * DEG), C.ink, 2.5) + `<circle cx="336" cy="70" r="3" fill="${C.ink}"/>` + T(336, 92, 'IAS', { c: C.mut, fs: 12 });
      // the two pipes
      s += T(12, 56, 'ピトー管から（全圧）', { c: C.cy, b: 1, a: 'start', fs: 12 }) + A(12, 70, 198, 70, C.cy, 3);
      s += T(12, 146, '静圧孔から（静圧）', { c: C.am, b: 1, a: 'start', fs: 12 }) + P([[12, 132], [276, 132]], C.am, 3) + A(276, 132, 276, 116, C.am, 3);
      // the relation
      s += `<rect x="8" y="160" width="384" height="34" rx="7" fill="${C.cy}" fill-opacity="0.08" stroke="${C.cy}"/>` + T(200, 182, '全圧 − 静圧 ＝ 動圧（q ＝ ½ρV²）', { c: C.cy, b: 1, fs: 13 });
      s += TL(200, 214, ['針は、ダイヤフラムが膨らむ量（動圧）を速さの目盛りで示す', '空気が薄い所では、同じ指示でも空気に対する速さが大きい'], { c: C.ink, fs: 12, lh: 18 });
      return svg(400, 238, s, '図：速度計のしくみ（模式図）。ダイヤフラムの中にピトー管の全圧、ケースに静圧が入り、その差（動圧）で針が動きます');
    },
    // ---------------------------------------------------------------- inst.alt (1) — the two errors of the altimeter
    instAltErrors() {
      const xs = [8, 138, 268], w = 124, G = 196, TRUE = 96;
      const panels = [
        ['標準の日', '表示＝実際の高さ', TRUE, '差はない', C.gr],
        ['気圧が低い所', '規正値を直さない', TRUE + 44, '実際は低い', C.rd],
        ['標準より寒い日', '規正値は正しい', TRUE + 34, '実際は低い', C.rd],
      ];
      let s = '';
      panels.forEach(([t, sub, yInd, note, c], i) => {
        const x = xs[i], cx = x + w / 2;
        s += `<rect x="${x}" y="6" width="${w}" height="${G + 30}" rx="8" fill="none" stroke="${C.grid}" stroke-width="1.5"/>`;
        s += T(cx, 26, t, { c: C.ink, b: 1, fs: 13 }) + T(cx, 44, sub, { c: C.mut, fs: 12 });
        s += `<rect x="${x + 1}" y="${G}" width="${w - 2}" height="12" fill="#3a3326"/>`;
        s += L(x + 6, TRUE, x + w - 6, TRUE, C.gr, 2, '6 4');
        s += L(x + 6, yInd, x + w - 6, yInd, C.am, 3);
        s += planeSide(cx, yInd - 6, 0.34);
        if (yInd > TRUE) s += A(x + 14, TRUE + 3, x + 14, yInd - 4, C.rd, 2.5);
        s += T(cx, G + 26, note, { c, b: 1, fs: 12 });
      });
      s += L(20, 254, 52, 254, C.gr, 2, '6 4') + T(58, 258, '本当の 3,000 ft（MSL からの高さ）', { c: C.gr, a: 'start', fs: 12 });
      s += L(20, 276, 52, 276, C.am, 3) + T(58, 280, '高度計が 3,000 ft を示す高さ', { c: C.am, a: 'start', fs: 12 });
      return svg(400, 292, s, '図：高度計が 3,000 ft を示していても、気圧の低い所で規正値を直さないときと、標準より寒い日には、本当の高さは低くなります（模式図。差は大きく描いた）');
    },
    // ---------------------------------------------------------------- inst.alt (2) — ch04-fig4-5 redrawn: the VSI and its lag
    instVsi() {
      let s = '';
      // mechanism (left)
      s += T(20, 30, 'ケース（遅れて静圧が入る）', { c: C.ink, b: 1, a: 'start', fs: 12 });
      s += `<rect x="20" y="38" width="160" height="100" rx="8" fill="${C.am}" fill-opacity="0.06" stroke="${C.mut}" stroke-width="1.5"/>`;
      s += `<ellipse cx="74" cy="84" rx="26" ry="22" fill="rgba(255,178,62,0.18)" stroke="${C.am}" stroke-width="2"/>` + T(74, 124, 'ダイヤフラム', { c: C.am, fs: 12 });
      s += L(100, 84, 128, 70, C.ink, 2) + L(128, 70, 160, 52, C.ink, 2.5) + `<circle cx="128" cy="70" r="3" fill="${C.ink}"/>`;
      // static pressure: straight into the diaphragm, and into the case through the calibrated leak
      s += P([[8, 170], [140, 170], [140, 152]], C.am, 2.5) + A(140, 154, 140, 140, C.am, 2.5) + A(60, 170, 60, 108, C.am, 2.5);
      s += `<circle cx="140" cy="158" r="4" fill="${C.rd}"/>` + T(150, 162, '細い穴', { c: C.rd, b: 1, a: 'start', fs: 12 });
      s += T(8, 188, '静圧', { c: C.am, b: 1, a: 'start', fs: 12 });
      // the lag (right): the real climb rate steps to 500 fpm at t = 1 s; the needle follows with a lag of several seconds
      const X = t => 220 + t * 14, Y = f => 170 - f * 0.2;
      s += L(220, 170, 390, 170, C.mut, 1.5) + L(220, 170, 220, 54, C.mut, 1.5);
      for (const t of [0, 4, 8, 12]) s += L(X(t), 170, X(t), 174, C.mut, 1.5) + T(X(t), 186, t, { c: C.mut, fs: 12 });
      s += T(214, Y(500) + 4, '500', { c: C.mut, a: 'end', fs: 12 }) + T(304, 204, '時間（秒）', { c: C.mut, fs: 12 });
      s += P([[X(0), Y(0)], [X(1), Y(0)], [X(1), Y(500)], [X(12), Y(500)]], C.gr, 2.5);
      const pts = []; for (let t = 0; t <= 12; t += 0.25) pts.push([X(t), Y(t < 1 ? 0 : 500 * (1 - Math.exp(-(t - 1) / 2.2)))]);
      s += P(pts, C.cy, 2.5);
      s += T(304, 62, '実際の上昇率 500 fpm', { c: C.gr, b: 1, fs: 12 }) + T(316, 142, '昇降計の針（遅れる）', { c: C.cy, b: 1, fs: 12 });
      s += TL(200, 228, ['上昇を始めると、ダイヤフラムの中はすぐに、', 'ケースの中は細い穴から遅れて気圧が下がる'], { c: C.ink, fs: 12, lh: 17 });
      return svg(400, 254, s, '図：従来型の昇降計のしくみ（模式図）。ダイヤフラムには静圧がすぐ入り、ケースには細い穴から遅れて入るので、その差で針が動きます。安定した値を示すまでに数秒遅れます');
    },
    // ---------------------------------------------------------------- inst.gyro (1) — the gyro's two properties and the three instruments
    instGyros() {
      let s = '';
      // rigidity: a spinning wheel keeps its axis while the base tilts
      s += `<rect x="8" y="6" width="188" height="122" rx="8" fill="none" stroke="${C.grid}" stroke-width="1.5"/>` + T(102, 26, '剛性：向きを保つ', { c: C.cy, b: 1, fs: 13 });
      const wheel = (cx, cy) => `<ellipse cx="${cx}" cy="${cy}" rx="10" ry="24" fill="rgba(95,212,255,0.15)" stroke="${C.cy}" stroke-width="2"/>` + L(cx - 26, cy, cx + 26, cy, C.cy, 2);
      s += wheel(56, 66) + L(30, 96, 82, 96, C.mut, 3) + wheel(148, 66) + `<path d="M120 102 L176 88" stroke="${C.mut}" stroke-width="3"/>`;
      s += TL(102, 112, ['台が傾いても、軸は同じ向き'], { c: C.ink, fs: 12 });
      // precession: a force on the rim acts 90° later in the direction of rotation
      s += `<rect x="204" y="6" width="188" height="122" rx="8" fill="none" stroke="${C.grid}" stroke-width="1.5"/>` + T(298, 26, '歳差：90° 先に出る', { c: C.am, b: 1, fs: 13 });
      // the wheel seen face-on; ⊗ = into the page. A push into the page at the top shows up 90° later in the direction of
      // rotation (clockwise here), at the right, in the same direction (PHAK 25C fig. 8-19: plane of force / plane of precession)
      const into = (x, y, c) => `<circle cx="${x}" cy="${y}" r="7" fill="${C.bg}" stroke="${c}" stroke-width="2"/>` + L(x - 4.5, y - 4.5, x + 4.5, y + 4.5, c, 2) + L(x + 4.5, y - 4.5, x - 4.5, y + 4.5, c, 2);
      s += `<circle cx="298" cy="72" r="28" fill="rgba(255,178,62,0.10)" stroke="${C.am}" stroke-width="2"/><circle cx="298" cy="72" r="2.5" fill="${C.am}"/>`;
      s += `<path d="M285.7 105.8 A36 36 0 0 1 263.4 81.9" stroke="${C.ink}" stroke-width="2" fill="none"/>` + A(263.4, 81.9, 262.5, 78.3, C.ink, 2) + T(256, 100, '回る向き', { c: C.mut, a: 'end', fs: 12 });
      s += into(298, 44, C.rd) + into(326, 72, C.gr);
      s += T(286, 48, '押す（奥へ）', { c: C.rd, b: 1, a: 'end', fs: 12 }) + T(338, 76, '奥へ傾く', { c: C.gr, b: 1, a: 'start', fs: 12 });
      s += T(298, 122, '回る向きに 90° 進んだ所に出る', { c: C.ink, fs: 12 });
      // the three instruments of a conventional panel
      const cols = [8, 110, 164, 300], head = ['計器', '原理', '示すもの', '動力の例'];
      const rows = [['姿勢指示器', '剛性', 'ピッチとバンク', '真空'], ['方向指示器', '剛性', '機首の方位（ずれる）', '真空'], ['旋回傾斜計', '歳差', '向きと率・ロール', '電気']];
      s += `<rect x="8" y="140" width="384" height="26" fill="${C.cy}" fill-opacity="0.10"/>`;
      head.forEach((h, j) => { s += T(cols[j] + 6, 158, h, { c: C.cy, b: 1, a: 'start', fs: 12 }); });
      rows.forEach((r, i) => { const y = 188 + i * 28; s += L(8, y - 20, 392, y - 20, C.grid, 1); r.forEach((v, j) => { s += T(cols[j] + 6, y, v, { c: j === 0 ? C.ink : C.mut, b: j === 0 ? 1 : 0, a: 'start', fs: 12 }); }); });
      s += TL(200, 266, ['従来型の計器の機体の例。G1000 型は、', '姿勢と方位を AHRS（電子のセンサー）で出す'], { c: C.ink, fs: 12, lh: 17 });
      return svg(400, 290, s, '図：ジャイロ（回るこま）の 2 つの性質と、従来型の 3 つのジャイロ計器（模式図）。姿勢と方位は、向きを保つ性質（剛性）で、旋回は歳差で示します。歳差の小図の ⊗ は、紙の奥へ向かう向きです');
    },
    // ---------------------------------------------------------------- inst.gyro (1b) — the faces of the three gyro instruments (new, revise-inst)
    instFaces() {
      const R = 50, cy = 96, xs = [68, 200, 332];
      const ring = cx => `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#06101c" stroke="${C.mut}" stroke-width="1.5"/>`;
      let s = '';
      ['姿勢指示器', '方向指示器', '旋回傾斜計'].forEach((h, i) => { s += T(xs[i], 24, h, { c: C.cy, b: 1, fs: 13 }); });
      // attitude indicator: sky and ground, the bank scale (10・20・30 short, 45・60 long), the sky pointer, the little airplane
      { const cx = xs[0];
        s += ring(cx) + `<path d="M${cx - R + 2} ${cy} A${R - 2} ${R - 2} 0 0 1 ${cx + R - 2} ${cy} Z" fill="#1d3550"/><path d="M${cx - R + 2} ${cy} A${R - 2} ${R - 2} 0 0 0 ${cx + R - 2} ${cy} Z" fill="#4a3a26"/>` + L(cx - R + 2, cy, cx + R - 2, cy, C.ink, 1.5);
        for (const b of [0, 10, 20, 30, 45, 60]) for (const sg of b ? [-1, 1] : [1]) { const a = sg * b * DEG, r0 = b > 30 || b === 0 ? 36 : 40; s += L(cx + r0 * Math.sin(a), cy - r0 * Math.cos(a), cx + 47 * Math.sin(a), cy - 47 * Math.cos(a), C.ink, 1.5); }
        s += `<path d="M${cx} ${cy - 34} L${cx - 5} ${cy - 25} L${cx + 5} ${cy - 25} Z" fill="${C.am}"/>`;
        s += L(cx - 26, cy, cx - 8, cy, C.am, 3) + L(cx + 8, cy, cx + 26, cy, C.am, 3) + `<circle cx="${cx}" cy="${cy}" r="3" fill="${C.am}"/>`;
        s += TL(cx, 168, ['上の目盛りで', 'バンクを読む', '（10〜60°）'], { c: C.ink, fs: 12, lh: 16 }); }
      // heading indicator: the card (N・E・S・W and a tick every 30°), the fixed index at the top, the airplane seen from above
      { const cx = xs[1];
        s += ring(cx);
        for (let d = 0; d < 360; d += 30) { const a = d * DEG, r0 = d % 90 ? 40 : 37; s += L(cx + r0 * Math.sin(a), cy - r0 * Math.cos(a), cx + 47 * Math.sin(a), cy - 47 * Math.cos(a), C.ink, 1.5); }
        for (const [d, l] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) { const a = d * DEG; s += T(cx + 28 * Math.sin(a), cy - 28 * Math.cos(a) + 4, l, { c: d ? C.ink : C.rd, b: 1, fs: 12 }); }
        s += `<path d="M${cx} ${cy - 50} L${cx - 5} ${cy - 58} L${cx + 5} ${cy - 58} Z" fill="${C.am}"/>`;
        s += L(cx, cy - 12, cx, cy + 12, C.am, 3) + L(cx - 11, cy - 2, cx + 11, cy - 2, C.am, 3) + L(cx - 5, cy + 10, cx + 5, cy + 10, C.am, 2.5);
        s += TL(cx, 168, ['機首の方位を', '上の印で読む'], { c: C.ink, fs: 12, lh: 16 }); }
      // turn coordinator: the level marks, the standard-rate marks (L・R) about 20° below, "2 MIN", the airplane in a standard-rate
      // right turn (its right wing on the R mark), and the inclinometer with the ball in the middle
      { const cx = xs[2], bank = 20 * DEG;
        s += ring(cx);
        for (const sg of [-1, 1]) {
          s += L(cx + sg * 38, cy, cx + sg * 47, cy, C.ink, 2);
          s += L(cx + sg * 38 * Math.cos(bank), cy + 38 * Math.sin(bank), cx + sg * 47 * Math.cos(bank), cy + 47 * Math.sin(bank), C.ink, 2);
        }
        s += T(cx - 38, cy + 34, 'L', { c: C.ink, b: 1, fs: 12 }) + T(cx + 38, cy + 34, 'R', { c: C.ink, b: 1, fs: 12 });
        s += T(cx, cy - 22, '2 MIN', { c: C.ink, fs: 12 });
        const wx = 34 * Math.cos(bank), wy = 34 * Math.sin(bank);
        s += L(cx - wx, cy - wy, cx + wx, cy + wy, C.am, 3) + `<circle cx="${cx}" cy="${cy}" r="4" fill="${C.am}"/>` + L(cx + 6 * Math.sin(bank), cy - 6 * Math.cos(bank), cx + 12 * Math.sin(bank), cy - 12 * Math.cos(bank), C.am, 2.5);
        s += `<path d="M${cx - 18} ${cy + 26} Q${cx} ${cy + 34} ${cx + 18} ${cy + 26}" stroke="${C.mut}" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="${cx}" cy="${cy + 30}" r="4" fill="${C.ink}"/>`;
        s += TL(cx, 168, ['2 つめの印に翼で', '1 秒に 3° の旋回', '下の球：横滑り'], { c: C.ink, fs: 12, lh: 16 }); }
      return svg(400, 226, s, '図：3 つのジャイロ計器の顔（模式図）。姿勢指示器は上の目盛りでバンクを、方向指示器は上の印で方位を読みます。旋回傾斜計は、小さな飛行機の翼を左右の 2 つめの印に合わせると、1 秒に 3° の旋回です。右の例は、その旋回で右へ回っていて、球は真ん中です');
    },
    // ---------------------------------------------------------------- inst.gyro (2) — ch04-fig4-6 redrawn: nose up, path down
    instPitchPath() {
      const O = [150, 112], th = 15, ga = -9;   // drawn angles (the labels give the example's 5°, 8°, −3°)
      const ray = (deg, len) => [O[0] + len * Math.cos(-deg * DEG), O[1] + len * Math.sin(-deg * DEG)];
      let s = L(8, O[1], 392, O[1], C.mut, 1.5, '6 4') + T(12, O[1] - 8, '水平線', { c: C.mut, a: 'start', fs: 12 });
      const [px, py] = ray(th, 230), [gx, gy] = ray(ga, 230);
      s += L(O[0], O[1], px, py, C.cy, 2, '5 4') + A(O[0], O[1], gx, gy, C.gr, 3);
      s += planeSide(O[0], O[1], 0.9, { pitch: th });
      s += T(372, py - 6, 'ピッチ角 θ ＝ 5°', { c: C.cy, b: 1, a: 'end', fs: 12, halo: 1 });
      s += T(372, gy + 22, '飛行経路 γ ＝ −3°', { c: C.gr, b: 1, a: 'end', fs: 12, halo: 1 });
      // the angle of attack between the path and the nose
      const r = 150, a0 = ga, a1 = th, p0 = ray(a0, r), p1 = ray(a1, r);
      s += `<path d="M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${r} ${r} 0 0 0 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}" stroke="${C.am}" stroke-width="2" fill="none"/>`;
      s += T(ray(3, r + 34)[0], ray(3, r + 34)[1] + 4, 'α ＝ 8°', { c: C.am, b: 1, fs: 13, halo: 1 });
      s += T(200, 196, 'α ＝ θ − γ（取付角 0）→ γ ＝ 5° − 8° ＝ −3°', { c: C.ink, b: 1, fs: 13 });
      s += T(200, 218, '機首が水平線より上でも、降下している', { c: C.am, b: 1, fs: 12 });
      return svg(400, 230, s, '図：機首が水平線より 5° 上（ピッチ角 5°）でも、迎え角が 8° なら、飛行経路は 3° 下向きです（取付角を 0 とした模式図。角度は大きくして描いた）');
    },
    // ---------------------------------------------------------------- sys.compass — book-figs.js's compassErrors with 方向指示器 (FL.terms)
    compassErrors() {
      // northern hemisphere: turning error (UNOS) and acceleration error (ANDS); the roll-out lead from PHAK (15° + half the latitude)
      const card = (cx, cy, hdg, show, title, sub, note, c) => {
        let s = T(cx, cy - 66, title, { c, b: 1, fs: 13 }) + TL(cx, cy - 48, sub, { c: C.ink, fs: 12, lh: 15 });
        s += `<circle cx="${cx}" cy="${cy}" r="34" fill="#06101c" stroke="${C.mut}" stroke-width="1.5"/>`;
        for (const [d, l] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) { const a = (d - show) * DEG; s += T(cx + 24 * Math.sin(a), cy - 24 * Math.cos(a) + 4, l, { c: d === 0 ? C.rd : C.ink, b: 1, fs: 12 }); }
        s += `<line x1="${cx}" y1="${cy - 36}" x2="${cx}" y2="${cy - 28}" stroke="${C.am}" stroke-width="3"/>`;
        return s + TL(cx, cy + 52, note, { c, fs: 12, lh: 15 });
      };
      let s = T(12, 18, '北半球の磁気コンパスの誤差（模式図）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      s += card(70, 110, 0, 330, '北へ向かう旋回', ['コンパスが', '遅れる'], ['手前で止める', '（約 30° 前）'], C.cy);
      s += card(200, 110, 180, 210, '南へ向かう旋回', ['コンパスが', '先回りする'], ['行き過ぎて', 'から止める'], C.am);
      s += card(330, 110, 90, 60, '東・西で加速', ['北へ振れる'], ['減速すると', '南へ振れる'], C.gr);
      s += `<rect x="12" y="204" width="376" height="48" rx="6" fill="${C.cy}" fill-opacity="0.08" stroke="${C.cy}"/>` + T(200, 224, 'UNOS：北は手前、南は行き過ぎ', { c: C.cy, b: 1, fs: 12 }) + T(200, 242, 'ANDS：加速で北、減速で南', { c: C.gr, b: 1, fs: 12 });
      s += T(200, 272, 'どれだけ手前か：15° ＋ 緯度の半分（PHAK）。北緯 29° なら約 30°', { c: C.ink, fs: 12 });
      // the real compass: the card is read from behind through a window, so its marks run the other way (PHAK ch. 8: flying north,
      // "33" is to the right of N). The strip shows the window while flying north; 50 px = 30°
      s += L(12, 290, 388, 290, C.grid, 1) + T(12, 310, '実物のコンパスの見え方（北へ飛んでいるとき）', { c: C.ink, b: 1, a: 'start', fs: 12 });
      s += `<rect x="40" y="320" width="320" height="40" rx="6" fill="#06101c" stroke="${C.mut}" stroke-width="1.5"/>`;
      for (let d = -90; d <= 90; d += 10) { const x = 200 - d * 50 / 30; if (x > 44 && x < 356) s += L(x, 322, x, d % 30 ? 328 : 332, C.ink, 1); }
      for (const [d, l] of [[90, 'E'], [60, '6'], [30, '3'], [0, 'N'], [-30, '33'], [-60, '30'], [-90, 'W']]) { const x = 200 - d * 50 / 30; if (x > 44 && x < 356) s += T(x, 350, l, { c: d === 0 ? C.rd : C.ink, b: 1, fs: 13 }); }
      s += L(200, 316, 200, 336, C.am, 2.5) + L(200, 355, 200, 364, C.am, 2.5);
      s += T(200, 382, '目盛りは方向指示器と逆の並び（N の右に 33、左に 3）', { c: C.am, fs: 12 });
      return svg(400, 392, s, '図：磁気コンパスの誤差（北半球）。上の 3 つの円は、動きを説明するために方向指示器のように描いた模式図で、円の上の橙の線が、そのときコンパスが示す向きです。旋回すると、北へ向かうときは遅れ、南へ向かうときは先回りします。東・西向きで速度を変えると北や南へ振れます。正しく読めるのは、まっすぐ・水平・一定の速度のときだけです。実物のコンパスは目盛りを裏から見るので、並びが方向指示器と逆に見えます（PHAK 第 8 章）');
    },
    // ---------------------------------------------------------------- inst.pfd — a G1000-type PFD with numbered parts
    instPfd() {
      let s = `<rect x="6" y="6" width="388" height="232" rx="10" fill="#070d16" stroke="${C.grid}"/>`;
      // attitude: sky, ground, horizon, airplane symbol, roll pointer and slip trapezoid
      s += `<rect x="72" y="14" width="246" height="150" fill="#1d3550"/><rect x="72" y="96" width="246" height="68" fill="#4a3a26"/>` + L(72, 96, 318, 96, C.ink, 2);
      s += `<path d="M150 92 L182 92 L186 98 L150 98 Z M240 92 L208 92 L204 98 L240 98 Z M195 92 L182 104 L195 98 L208 104 Z" fill="#ffd400" stroke="#000"/>`;
      s += `<path d="M195 22 L189 32 L201 32 Z" fill="${C.ink}"/><path d="M188 34 L202 34 L204 39 L186 39 Z" fill="${C.ink}"/>`;
      // the bank scale: 10°, 20°, 30° (short) and 45°, 60° (long) each side of the roll pointer
      for (const b of [10, 20, 30, 45, 60]) for (const sg of [-1, 1]) { const a = sg * b * DEG, r0 = b > 30 ? 70 : 74; s += L(195 + r0 * Math.sin(a), 104 - r0 * Math.cos(a), 195 + 80 * Math.sin(a), 104 - 80 * Math.cos(a), C.ink, 1.5); }
      // airspeed tape, TAS box, airspeed trend
      s += `<rect x="14" y="14" width="52" height="150" fill="#2a3442" fill-opacity="0.8" stroke="${C.mut}"/>` + `<rect x="14" y="80" width="46" height="22" fill="#000" stroke="${C.ink}"/>` + T(37, 96, '100', { c: C.ink, b: 1, fs: 13 });
      s += L(62, 91, 62, 64, MAG, 4);
      s += `<rect x="14" y="168" width="52" height="20" fill="#000" stroke="${C.mut}"/>` + T(40, 182, 'TAS', { c: C.ink, fs: 12 });
      // altitude tape, selected altitude, altimeter setting, altitude trend, VSI
      s += `<rect x="324" y="30" width="46" height="134" fill="#2a3442" fill-opacity="0.8" stroke="${C.mut}"/>` + `<rect x="324" y="80" width="46" height="22" fill="#000" stroke="${C.ink}"/>` + T(347, 96, '3000', { c: C.ink, b: 1, fs: 12 });
      s += `<rect x="324" y="12" width="46" height="16" fill="#000" stroke="${C.cy}"/>` + T(347, 25, '3500', { c: C.cy, fs: 12 });
      s += L(328, 80, 328, 58, MAG, 4);
      s += `<rect x="324" y="168" width="66" height="20" fill="#000" stroke="${C.mut}"/>` + T(357, 182, '30.02IN', { c: C.cy, fs: 12 });
      s += `<rect x="374" y="40" width="14" height="116" fill="#2a3442" stroke="${C.mut}"/>`;
      // HSI with the turn-rate trend above it
      s += `<path d="M120 238 A75 75 0 0 1 270 238 Z" fill="#000" stroke="${C.mut}"/>` + T(195, 196, '090', { c: C.ink, b: 1, fs: 12 });
      // the turn-rate marks (the magenta line is not drawn: the example's wings are level, so there is no turn)
      s += L(213, 164, 214, 171, C.ink, 1.5) + L(231, 167, 232, 175, C.ink, 1.5) + L(177, 164, 176, 171, C.ink, 1.5) + L(159, 167, 158, 175, C.ink, 1.5);
      s += `<rect x="92" y="212" width="44" height="20" fill="#000" stroke="${C.vi}"/>` + T(114, 226, 'GPS', { c: C.vi, b: 1, fs: 12 }) + L(195, 210, 195, 236, C.vi, 3);
      // a red X on a failed field (example: inset)
      s += `<rect x="298" y="196" width="88" height="36" fill="#000" stroke="${C.mut}"/>` + L(302, 200, 382, 228, C.rd, 2.5) + L(382, 200, 302, 228, C.rd, 2.5);
      // numbers
      s += num(37, 130, '1') + num(76, 60, '2') + num(218, 52, '3') + num(240, 132, '4') + num(352, 130, '5') + num(270, 182, '6') + num(150, 222, '7') + num(342, 214, '8') + num(381, 24, '9');
      const leg = ['① 速度テープ：IAS。下の TAS は計算した値', '② マゼンタの線：6 秒先の速度・高度（トレンド）', '③ 上の台形：すべり（1 つ分のずれ ＝ 球 1 個）', '④ 姿勢：AHRS が出す。地平線と飛行機の印', '⑤ 高度テープ。上は選択高度、下は高度計規正値', '⑥ 旋回率の目盛り：線がここまで伸びたら標準旋回', '⑦ CDI の航法源（GPS・VOR・LOC）を確かめる', '⑧ 赤い ×：その表示は使えない', '⑨ 昇降計（高度テープの右の細い帯）'];
      s += TL(12, 260, leg, { c: C.ink, a: 'start', fs: 12, lh: 17 });
      return svg(400, 410, s, '図：G1000 型の PFD の読み方（模式図。数字は例）。速度・姿勢・高度・方位の位置と、トレンド・すべり・航法源・赤い × を見る場所。例は翼が水平で旋回していないので、旋回率の線は出ていません');
    },
    // ---------------------------------------------------------------- inst.ap (1) — the mode band, FD and AP
    instApBand() {
      let s = T(200, 16, 'モードの表示の帯（GFC 700 型の例）', { c: C.ink, b: 1, fs: 13 });
      const lab = [[40, '横の待ち'], [110, '横の作動'], [200, 'AP の状態'], [262, '縦の作動'], [314, '基準'], [366, '縦の待ち']];
      lab.forEach(([x, t]) => { s += T(x, 38, t, { c: C.mut, fs: 12 }); });
      s += `<rect x="6" y="46" width="388" height="34" rx="4" fill="#000" stroke="${C.mut}"/>` + L(148, 46, 148, 80, C.mut, 1) + L(234, 46, 234, 80, C.mut, 1);
      s += T(40, 69, 'GPS', { c: C.ink, b: 1, fs: 14 }) + T(110, 69, 'HDG', { c: C.gr, b: 1, fs: 14 }) + T(200, 69, 'AP', { c: C.gr, b: 1, fs: 14 });
      s += T(262, 69, 'VS', { c: C.gr, b: 1, fs: 14 }) + T(314, 69, '500FPM', { c: C.gr, fs: 12 }) + T(366, 69, 'ALTS', { c: C.ink, b: 1, fs: 14 });
      s += TL(12, 104, ['緑：いま作動しているモード（active）', '白：条件がそろうのを待つモード（armed）。緑の外側', '条件がそろうと、緑の欄へ移り 10 秒点滅', '黄色の点滅：計算に要るデータを失った'], { c: C.ink, a: 'start', fs: 12, lh: 18 });
      s += BOX(8, 182, 186, 82, C.cy, 'FD（フライトディレクター）', ['操縦の指示をバーで', '見せる。操縦は人'], { fs: 12, ty: 20, ly: 42, lh: 17 });
      s += BOX(206, 182, 186, 82, C.gr, 'AP（自動操縦）', ['サーボで舵を動かす。', 'Archer の出力は人'], { fs: 12, ty: 20, ly: 42, lh: 17 });
      return svg(400, 276, s, '図：自動操縦のモードの表示の例（G1000 と一体の型の模式図）。横のモードは左、縦のモードは右に出て、作動中は緑、条件を待つモードは白です。例では、針路を保ちながら GPS のコースを待ち、毎分 500 ft で上昇しながら選んだ高度を待っています');
    },
    // ---------------------------------------------------------------- inst.ap (2) — ch04-fig4-11 and ch10-fig10-12 redrawn as one loop
    instApLoop() {
      let s = '';
      s += BOX(130, 8, 140, 50, C.cy, '', ['① 意図', '何をさせたいか'], { ly: 28, lh: 16 });
      s += BOX(252, 92, 140, 50, C.vi, '', ['② 操作', 'キー・つまみ'], { ly: 28, lh: 16 });
      s += BOX(130, 176, 140, 50, C.gr, '', ['③ 表示', 'モードの帯を読む'], { ly: 28, lh: 16 });
      s += BOX(8, 92, 140, 50, C.am, '', ['④ 動き', '姿勢・速度・高度'], { ly: 28, lh: 16 });
      s += A(272, 40, 312, 88, C.mut, 2) + A(312, 146, 272, 192, C.mut, 2) + A(128, 194, 88, 146, C.mut, 2) + A(88, 88, 128, 40, C.mut, 2);
      s += TL(200, 104, ['予想と', '比べる'], { c: C.ink, b: 1, fs: 12, lh: 16 });
      s += TL(200, 252, ['合わなければ、まず機体の姿勢と経路を保つ', '分からないモードを選び直し続けない', 'Archer の POH：思うように動かなければ AP を切る'], { c: C.am, fs: 12, lh: 17 });
      return svg(400, 300, s, '図：自動操縦を使うときの確かめの輪（模式図）。何をさせたいかを決め、操作し、モードの表示を読み、機体の動きが予想と合うかを確かめます');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
