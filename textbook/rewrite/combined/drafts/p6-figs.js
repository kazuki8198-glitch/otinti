// DRAFT (W32, R3) — the figures of Part 6's chapters 'crm'「TEM と CRM」, 'jet'「ジェット機の飛び方と自動化」and the new
// chapter 'tsys'「輸送機のシステムとジェットエンジン」(textbook/rewrite/combined/DESIGN.md 3.3 第 6 部 第 38〜40 章, 4.2 kiso02・
// kiso03・kiso05, 7.2 W32). No product reads this file: it is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p6-figs.js textbook/rewrite/combined/drafts/p6.js
// and, when the chapters are registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys;
// the helpers below are copied unchanged from book-figs.js, so the functions run the same way there).
//
// What is here (one function per figure; the caption says what to look at):
//   redrawn  thrustResponse   crm.jet — the same drawing (the course's Archer against a jet from idle, AFH chapter 16: "up
//                             to 10 seconds"); only the caption changed: 推力 first used in the FL.terms form 推力（thrust）
//                             (the caption is the chapter's first text after the aim).
//   new      dutchRoll        crm.jet — Dutch roll as two coupled oscillations out of phase, roll and yaw (PHAK chapter 5:
//                             "two oscillations (roll and yaw) … out of phase"), weakly damped without a yaw damper and
//                             damped quickly with one (schematic, no numbers).
//   new      machCrit         jet.speed — PHAK chapter 5's example values: at M 0.72 the fastest local flow over this wing
//                             reaches M 1.0 (critical Mach), at M 0.77 a supersonic region, a shock wave and separation behind
//                             it (PHAK figure 5-64); sweepback: TAS M 0.85, the component normal to the leading edge M 0.70
//                             (PHAK figure 5-68).
//   new      radarShadow      jet.fms — attenuation of an airborne weather radar (AWH chapter 15: most aircraft radars 3 cm;
//                             heavy precipitation close to the radar absorbs and scatters the energy, targets beyond may not
//                             be displayed).
//   new      careerPath       jet.next — the frame after the licences: MCC, type rating, line training, first officer
//                             (schematic; the content and order differ by country and company: DESIGN 3.6).
//   new      sysDepend        tsys.arch — the basic course's ch02-fig12「電気・油圧・空気の依存関係を学ぶ仮想機」redrawn: generator
//                             and battery → essential bus → electric hydraulic pump, displays, pitot heat; hydraulics → gear and
//                             brakes; the manual pressure source (dashed) → brakes only; bleed air → air conditioning and
//                             thermal anti-ice (kiso02.24).
//   new      hydCircuit       tsys.power — the basic course's ch02-fig5「複動シリンダーを持つ油圧の仮想例」redrawn: reservoir,
//                             pump, accumulator, relief valve, selector valve, double-acting cylinder; blue supply, grey return,
//                             green command (kiso02.09・02.10; PHAK chapter 7's basic hydraulic system).
//   new      cabinPress       tsys.env — the basic course's ch02-fig10「客室への供給と排気の機能モデル」redrawn: air supplied
//                             continuously, the outflow valve regulating what leaves, the controller, the safety valve, and
//                             the differential of the made-up absolute pressures 75 − 25 = 50 kPa (kiso02.18; PHAK chapter 7).
//   new      turbofanFlow     tsys.turbine — the basic course's ch03-fig3-7・3-8 redrawn as one: fan, bypass and core flows
//                             (400 and 50 kg/s, bypass ratio 8: kiso03.20; NASA's definition), compressor, combustor, turbine,
//                             nozzle, and the shaft by which the turbine drives the compressor and fan (PHAK chapter 7).
//   new      macPercent       tsys.wb — the basic course's ch05-fig5-7「MAC 前縁からの距離を MAC の長さで割る」redrawn with
//                             kiso05.13's made-up values: LEMAC 2.10 m, MAC 1.50 m, CG 2.392857 m → 19.5 %MAC (W&B handbook).
// Unchanged and not repeated here: tem (crm.tem), dc8・turbofan・crewCab are photos. Every number drawn here is one the text
// gives with its source (p6.claims.json); text ≥ 12 (≥ 10 px at 390 px).
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
  const frame = (w, h, x0, x1, y0, y1, xt, yt, xl, yl, m = { l: 50, r: 14, t: 14, b: 36 }) => {
    const X = v => m.l + (v - x0) / (x1 - x0) * (w - m.l - m.r), Y = v => h - m.b - (v - y0) / (y1 - y0) * (h - m.t - m.b);
    let s = '';
    for (const v of xt) s += L(X(v), m.t, X(v), h - m.b, C.grid, 1) + T(X(v), h - m.b + 16, v, { c: C.mut, fs: 12 });
    for (const v of yt) s += L(m.l, Y(v), w - m.r, Y(v), C.grid, 1) + T(m.l - 6, Y(v) + 4, v.toLocaleString ? v.toLocaleString() : v, { c: C.mut, fs: 12, a: 'end' });
    s += T((m.l + w - m.r) / 2, h - 4, xl, { c: C.mut, fs: 12 }) + T(14, (m.t + h - m.b) / 2, yl, { c: C.mut, fs: 12, rot: -90 });
    return { X, Y, s };
  };
  const PLANE = '#dfe6ee', PLANE2 = '#9fb3c8', GLASS = '#5d7fa3';
  const planeTop = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${k})">`
    + `<path d="M-68 -8 L68 -8 L66 6 L-66 6 Z" fill="${PLANE}"/><path d="M-22 38 L22 38 L21 45 L-21 45 Z" fill="${PLANE2}"/>`
    + `<path d="M0 -50 C5 -48 7 -40 7 -28 L5 30 L2 50 L-2 50 L-5 30 L-7 -28 C-7 -40 -5 -48 0 -50 Z" fill="${PLANE}"/><path d="M-5 -26 L5 -26 L4 -14 L-4 -14 Z" fill="${GLASS}"/>`
    + (o.twin ? `<rect x="-29" y="-24" width="10" height="26" rx="4" fill="${PLANE2}"/><rect x="19" y="-24" width="10" height="26" rx="4" fill="${PLANE2}"/><line x1="-36" y1="-26" x2="-12" y2="-26" stroke="${C.mut}" stroke-width="2.5"/><line x1="12" y1="-26" x2="36" y2="-26" stroke="${C.mut}" stroke-width="2.5"/>`
      : `<line x1="-12" y1="-52" x2="12" y2="-52" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/>`) + '</g>';
  // an airfoil (side view) from (x, y) to (x + len, y): the upper surface higher than the lower one
  const airfoil = (x, y, len, c = PLANE2) => `<path d="M${x} ${y} C${x + 0.08 * len} ${y - 0.15 * len} ${x + 0.55 * len} ${y - 0.12 * len} ${x + len} ${y} C${x + 0.6 * len} ${y + 0.045 * len} ${x + 0.12 * len} ${y + 0.07 * len} ${x} ${y} Z" fill="${c}"/>`;

  Object.assign(FL.bookFigs, {
    // ---------------------------------------------------------------- jet（ジェット機の飛び方と自動化）
    // crm.jet — redrawn with the caption's first use of 推力 in the FL.terms form; the drawing is book-figs.js's, unchanged.
    // How fast thrust follows the throttle: the course's Archer (physics.js: the propeller thrust is computed from the throttle
    // with no delay) against a jet from idle, which AFH 3C chapter 16 says "could take up to 10 seconds" to reach full power.
    // The jet curve is a schematic with that end point, not data of any type
    thrustResponse() {
      const f = frame(400, 290, 0, 12, 0, 100, [0, 2, 4, 6, 8, 10, 12], [0, 25, 50, 75, 100], '時間（秒）：0 秒でスロットルを全開に', '推力（thrust）：最大に対する %', { l: 52, r: 14, t: 20, b: 40 });
      const jet = t => t <= 0 ? 12 : 12 + 88 * (t >= 10 ? 1 : (1 - Math.cos(Math.PI * Math.min(1, t / 10) ** 1.25)) / 2);
      const pts = []; for (let t = 0; t <= 12.001; t += 0.25) pts.push([f.X(t), f.Y(jet(t))]);
      let s = f.s + `<path d="M${f.X(0)} ${f.Y(100)} ${pts.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')} L${f.X(12)} ${f.Y(100)} Z" fill="${C.am}" fill-opacity="0.12"/>`;
      s += P([[f.X(0), f.Y(12)], [f.X(0), f.Y(100)], [f.X(12), f.Y(100)]], C.cy, 3) + P(pts, C.am, 3);
      s += T(f.X(1.2), f.Y(100) - 8, 'プロペラ機（教材のモデルの Archer）：すぐ増える', { c: C.cy, b: 1, fs: 12, a: 'start' });
      s += TL(f.X(6.2), f.Y(46), ['ジェット機（アイドルから）：', '全開まで、長いと 10 秒ほど'], { c: C.am, b: 1, fs: 12, a: 'start', lh: 15 });
      s += TL(f.X(1.2), f.Y(76), ['この差の分だけ、', '早めに出力を使う'], { c: C.ink, fs: 12, a: 'start', lh: 15 });
      return svg(400, 290, s, '図：スロットルを全開にしてから推力（thrust）が増えるまで（模式図）。ジェットエンジンはアイドルからの加速が遅く、全開まで、長いと 10 秒ほどかかります（AFH 第 16 章）。だから、出力は早めに・先回りして使います');
    },
    // crm.jet — Dutch roll: roll and yaw oscillating together, out of phase (PHAK chapter 5); weakly damped without a yaw
    // damper, damped in a few swings with one. Schematic shapes, no numbers
    dutchRoll() {
      let s = '';
      const panel = (y0, title, k, c) => {
        const mid = y0 + 52, x0 = 40, x1 = 392, amp = 24, per = 108;
        let p = T(12, y0 + 12, title, { c, b: 1, a: 'start' }) + L(x0, mid, x1, mid, C.grid, 1) + L(x0, mid - 32, x0, mid + 32, C.mut, 1);
        const roll = [], yaw = [];
        for (let x = x0; x <= x1; x += 3) {
          const t = x - x0, e = Math.exp(-t / k);
          roll.push([x, mid - amp * e * Math.sin(2 * Math.PI * t / per)]);
          yaw.push([x, mid - amp * e * Math.sin(2 * Math.PI * t / per - Math.PI / 2)]);
        }
        return p + P(roll, C.cy, 2.5) + P(yaw, C.am, 2.5, 'none', '6 4');
      };
      s += panel(8, 'ヨーダンパーなし：揺れがなかなか収まらない', 520, C.rd);
      s += panel(122, 'ヨーダンパーあり：数回で収まる', 70, C.gr);
      s += L(20, 246, 44, 246, C.cy, 2.5) + T(50, 250, 'バンク（ロール）', { a: 'start' });
      s += L(170, 246, 194, 246, C.am, 2.5, '6 4') + T(200, 250, '機首の向き（ヨー）', { a: 'start' });
      s += T(392, 250, '時間 →', { c: C.mut, a: 'end' });
      return svg(400, 262, s, '図：ダッチロール（Dutch roll）の模式図。横の揺れ（ロール）と機首の左右の揺れ（ヨー）が、少しずれた時期で組になって繰り返します。ヨーダンパーは、この揺れを早く収めます（PHAK 第 5 章。形は模式）');
    },
    // jet.speed — critical Mach and sweepback with PHAK chapter 5's example values (figures 5-64 and 5-68)
    machCrit() {
      let s = '';
      // row A: M 0.72, the fastest local flow reaches M 1.0
      s += T(12, 52, '飛行マッハ数 0.72', { b: 1, a: 'start' }) + T(12, 70, '＝この翼の臨界マッハ数', { c: C.am, a: 'start' });
      s += A(150, 92, 194, 92, C.mut, 2) + airfoil(200, 92, 170);
      s += `<ellipse cx="262" cy="70" rx="7" ry="5" fill="${C.cy}" fill-opacity="0.8"/>` + T(285, 44, '翼の上の最も速い所：マッハ 1.0', { c: C.cy });
      // row B: M 0.77, a supersonic region, a shock wave and separation behind it
      s += T(12, 150, '飛行マッハ数 0.77', { b: 1, a: 'start' }) + T(12, 168, '臨界マッハ数を超えた', { c: C.rd, a: 'start' });
      s += A(150, 190, 194, 190, C.mut, 2) + airfoil(200, 190, 170);
      s += `<ellipse cx="262" cy="166" rx="40" ry="10" fill="${C.cy}" fill-opacity="0.3"/>` + L(304, 154, 304, 178, C.rd, 3);
      s += T(250, 146, '超音速の領域', { c: C.cy }) + T(314, 150, '衝撃波', { c: C.rd, b: 1, a: 'start' });
      s += T(296, 218, '衝撃波の後ろで流れがはがれる', { c: C.ink });
      s += L(8, 234, 392, 234, C.grid, 1);
      // bottom: a swept wing from above and the velocity components
      s += T(30, 252, '後退翼（上から見た図）', { b: 1, a: 'start' });
      s += `<path d="M30 262 L130 332 L130 350 L30 302 Z" fill="${PLANE2}"/>` + L(26, 256, 26, 356, C.mut, 2);
      const ox = 262, oy = 258, v = 80, nx = -Math.sin(35 * DEG), ny = Math.cos(35 * DEG), nl = v * Math.cos(35 * DEG);
      s += A(ox, oy, ox, oy + v, C.ink, 2.5) + A(ox, oy, +(ox + nx * nl).toFixed(1), +(oy + ny * nl).toFixed(1), C.cy, 2.5);
      s += TL(ox + 10, oy + 40, ['TAS', 'マッハ 0.85'], { a: 'start' });
      s += TL(ox - 52, oy + 74, ['直角な成分', 'マッハ 0.70'], { c: C.cy, a: 'middle' });
      return svg(400, 362, s, '図：臨界マッハ数と後退翼（PHAK 第 5 章の図の例の値）。上：この例の翼では、飛行マッハ数 0.72 で、翼の上の流れがマッハ 1.0 に届きます。0.77 では、超音速の領域と衝撃波ができます。下：後退翼では、翼の前縁（leading edge）に直角な成分（例：0.85 → 0.70）だけが効きます');
    },
    // jet.fms — attenuation of an airborne weather radar (AWH chapter 15)
    radarShadow() {
      let s = T(12, 22, '機上気象レーダー（多くは波長 約 3 cm）', { b: 1, a: 'start' });
      s += `<path d="M58 120 L392 44 L392 196 Z" fill="${C.cy}" fill-opacity="0.07"/>` + L(58, 120, 392, 44, C.cy, 1) + L(58, 120, 392, 196, C.cy, 1);
      s += planeTop(36, 120, 0.3, { rot: 90 });
      // the shadow behind the near cell
      s += `<path d="M178 92 L392 66 L392 174 L178 148 Z" fill="#000" fill-opacity="0.35"/>`;
      s += `<ellipse cx="178" cy="120" rx="32" ry="28" fill="${C.rd}" fill-opacity="0.55"/><ellipse cx="178" cy="120" rx="14" ry="12" fill="${C.rd}"/>`;
      s += `<ellipse cx="322" cy="120" rx="30" ry="24" fill="none" stroke="${C.am}" stroke-width="2" stroke-dasharray="5 4"/>`;
      s += T(178, 80, '手前の強い雨', { c: C.rd, b: 1 }) + T(322, 88, '奥の強い雨', { c: C.am, b: 1 });
      s += TL(290, 214, ['電波が吸われて弱まる（減衰）', '奥は暗く映るか、映らない'], { c: C.ink });
      return svg(400, 240, s, '図：機上気象レーダーの減衰（模式図）。手前の強い雨が電波を吸い、散らします。その奥の強い雨は、弱く映るか、まったく映りません（AWH 第 15 章）。暗い所を「何もない」と読みません');
    },
    // jet.next — the frame after the licences (schematic; DESIGN 3.6: no company's procedure)
    careerPath() {
      const rows = [['事業用・計器・多発の資格', 'この本の範囲', C.cy], ['多人数で操縦する訓練（MCC）など', 'シミュレーターで 2 人の役割分担', C.gr], ['型式の限定（type rating）', '機種ごとの資格（訓練と審査）', C.am], ['路線訓練', '実際の便で、教官役と飛ぶ', C.vi], ['副操縦士として乗務', '', C.bl]];
      let s = '';
      rows.forEach(([t, l, c], i) => {
        const y = 10 + i * 58;
        s += BOX(50, y, 300, 42, c, t, l ? [l] : [], { ty: l ? 17 : 26, ly: 34 });
        if (i < rows.length - 1) s += A(200, y + 43, 200, y + 56, C.mut, 2);
      });
      return svg(400, 296, s, '図：資格を取ったあとの一般的な流れ（模式図）。中身・順番・期間は、国と会社で違います');
    },
    // ---------------------------------------------------------------- tsys（輸送機のシステムとジェットエンジン）
    // tsys.arch — the basic course's ch02-fig12 redrawn (kiso02.24's made-up aircraft)
    sysDepend() {
      let s = '';
      s += BOX(10, 12, 112, 34, C.am, '発電源', [], { ty: 22 }) + BOX(134, 12, 112, 34, C.am, 'バッテリー', [], { ty: 22 });
      s += A(66, 46, 66, 72, C.am, 2) + A(190, 46, 190, 72, C.am, 2);
      s += BOX(10, 74, 236, 34, C.am, '重要母線', [], { ty: 22 });
      s += A(47, 108, 47, 136, C.am, 2) + A(128, 108, 128, 136, C.am, 2) + A(209, 108, 209, 136, C.am, 2);
      s += BOX(10, 138, 75, 34, C.cy, '電動ポンプ', [], { ty: 22 }) + BOX(91, 138, 75, 34, C.cy, '表示', [], { ty: 22 }) + BOX(172, 138, 75, 34, C.cy, 'ピトー加熱', [], { ty: 22 });
      s += L(47, 172, 47, 192, C.bl, 2) + L(47, 192, 128, 192, C.bl, 2) + A(47, 192, 47, 212, C.bl, 2) + A(128, 192, 128, 212, C.bl, 2) + T(87, 187, '油圧', { c: C.bl, b: 1 });
      s += BOX(10, 214, 75, 34, C.bl, '脚', [], { ty: 22 }) + BOX(91, 214, 75, 34, C.bl, 'ブレーキ', [], { ty: 22 }) + BOX(172, 214, 75, 34, C.mut, '手動圧力源', [], { ty: 22 });
      s += L(209, 248, 209, 262, C.mut, 2, '5 4') + L(209, 262, 128, 262, C.mut, 2, '5 4') + `<path d="M128 249 L123 259 L133 259 Z" fill="${C.mut}"/>` + L(128, 262, 128, 256, C.mut, 2, '5 4');
      s += T(128, 282, '手動圧力源はブレーキだけ（破線）', { c: C.mut });
      s += BOX(268, 12, 124, 34, C.vi, '抽気供給', [], { ty: 22 });
      s += A(298, 46, 298, 90, C.vi, 2) + A(362, 46, 362, 90, C.vi, 2);
      s += BOX(268, 92, 60, 46, C.vi, '空調', [], { ty: 28 }) + BOX(332, 92, 60, 46, C.vi, '熱空気式', ['防氷'], { ty: 19, ly: 36 });
      s += TL(330, 236, ['供給先をたどり、', '残る機能を考える'], { c: C.cy, b: 1 });
      return svg(400, 296, s, '図：電気・油圧・空気のつながりを学ぶ仮想の機体（基礎教材 第 2 章 図 12 を描き直し）。重要母線が止まると、電動ポンプ・表示・ピトー加熱が止まります。手動圧力源（破線）はブレーキだけにつながります');
    },
    // tsys.power — the basic course's ch02-fig5 redrawn (a made-up hydraulic circuit with a double-acting cylinder)
    hydCircuit() {
      let s = T(200, 20, '供給と戻りを切り替えて動く', { b: 1, fs: 13 });
      // supply: reservoir → pump → main line → selector
      s += BOX(16, 214, 96, 40, C.mut, 'リザーバー', [], { ty: 25 });
      s += A(64, 214, 64, 172, C.bl, 2.5) + `<circle cx="64" cy="150" r="21" fill="${C.bl}" fill-opacity="0.15" stroke="${C.bl}" stroke-width="1.5"/>` + T(64, 155, 'ポンプ', { c: C.bl, b: 1 });
      s += L(64, 129, 64, 92, C.bl, 2.5) + L(64, 92, 290, 92, C.bl, 2.5) + A(290, 92, 290, 118, C.bl, 2.5);
      s += L(132, 92, 132, 70, C.bl, 2) + BOX(96, 40, 72, 30, C.bl, '蓄圧器', [], { ty: 20 });
      s += L(212, 92, 212, 70, C.bl, 2) + BOX(176, 40, 72, 30, C.rd, '逃がし弁', [], { ty: 20 });
      // the selector valve and the double-acting cylinder
      s += BOX(240, 120, 100, 36, C.ink, '切替弁', [], { ty: 23 });
      s += A(262, 156, 262, 180, C.bl, 2.5) + L(318, 180, 318, 156, C.mut, 2.5);
      s += `<rect x="236" y="180" width="120" height="30" rx="4" fill="none" stroke="${C.ink}" stroke-width="1.5"/><rect x="286" y="182" width="8" height="26" fill="${C.ink}"/>` + L(286, 195, 206, 195, C.ink, 3);
      s += T(296, 228, '複動シリンダー', { c: C.ink });
      // return: selector → reservoir; the relief valve's discharge joins it (dashed)
      s += L(340, 138, 376, 138, C.mut, 2.5) + L(376, 55, 376, 240, C.mut, 2.5) + A(376, 240, 114, 240, C.mut, 2.5) + L(248, 55, 376, 55, C.mut, 2, '5 4');
      // command
      s += A(170, 138, 238, 138, C.gr, 2) + T(166, 142, '作動の指令', { c: C.gr, a: 'end' });
      // legend
      s += L(120, 268, 142, 268, C.bl, 3) + T(148, 272, '供給', { a: 'start' }) + L(196, 268, 218, 268, C.mut, 3) + T(224, 272, '戻り', { a: 'start' }) + L(272, 268, 294, 268, C.gr, 3) + T(300, 272, '指令', { a: 'start' });
      return svg(400, 282, s, '図：複動シリンダーを持つ油圧の仮想の例（基礎教材 第 2 章 図 5 を描き直し）。青は供給、灰は戻り、緑は指令です。切替弁が、作動油を送る側と戻す側を切り替えます');
    },
    // tsys.env — the basic course's ch02-fig10 redrawn (made-up absolute pressures)
    cabinPress() {
      let s = BOX(150, 14, 90, 30, C.vi, '制御器', [], { ty: 20 });
      s += `<rect x="70" y="70" width="240" height="96" rx="40" fill="${C.cy}" fill-opacity="0.1" stroke="${C.cy}" stroke-width="2"/>`;
      s += T(190, 104, '客室', { b: 1, fs: 13 }) + T(190, 124, '内圧 75 kPa') + T(190, 144, '（客室高度は 75 kPa に当たる高さ）', { c: C.mut });
      s += A(10, 118, 66, 118, C.gr, 3) + TL(10, 92, ['空気の', '供給'], { c: C.gr, a: 'start' });
      s += `<rect x="300" y="140" width="18" height="16" fill="${C.am}"/>` + A(320, 148, 382, 148, C.am, 3) + TL(392, 182, ['アウトフロー弁', '（出る量を調整）'], { c: C.am, a: 'end' });
      s += L(240, 29, 309, 29, C.vi, 1.5, '4 4') + L(309, 29, 309, 138, C.vi, 1.5, '4 4');
      s += `<rect x="110" y="63" width="16" height="9" fill="${C.rd}"/>` + T(118, 56, '安全弁', { c: C.rd });
      s += T(12, 204, '外気圧 25 kPa', { c: C.mut, a: 'start' });
      s += T(200, 234, '差圧 ＝ 75 − 25 ＝ 50 kPa', { c: C.cy, b: 1 });
      return svg(400, 248, s, '図：与圧のしくみ（仮想の値。基礎教材 第 2 章 図 10 を描き直し）。空気を入れ続け、出ていく量をアウトフロー弁で調整します。差圧は、同じ単位の内と外の気圧の差です');
    },
    // tsys.turbine — the basic course's ch03-fig3-7 and 3-8 redrawn as one (kiso03.19・03.20)
    turbofanFlow() {
      let s = T(70, 30, 'ファン', { b: 1 });
      s += P([[40, 40], [330, 40]], C.mut, 2) + P([[40, 200], [330, 200]], C.mut, 2);
      s += `<rect x="64" y="44" width="12" height="152" rx="3" fill="${PLANE2}"/>`;
      const box = (x, w, c, t) => `<rect x="${x}" y="90" width="${w}" height="60" fill="${c}" fill-opacity="0.18" stroke="${c}" stroke-width="1.5"/>` + T(x + w / 2, 114, t, { c, b: 1 });
      s += box(110, 70, C.cy, '圧縮機') + box(180, 50, C.rd, '燃焼室') + box(230, 54, C.am, 'タービン') + box(284, 46, C.mut, '排気口');
      s += L(255, 138, 70, 138, C.ink, 2, '5 3');
      s += A(84, 64, 392, 64, C.cy, 3) + A(84, 186, 392, 186, C.cy, 3) + T(200, 84, 'バイパス流 400 kg/s', { c: C.cy, b: 1 });
      s += A(82, 120, 108, 120, C.am, 3) + A(332, 120, 392, 120, C.am, 3);
      s += T(200, 170, '軸：タービンが圧縮機とファンを回す', { c: C.ink });
      s += T(200, 222, 'コア流 50 kg/s（圧縮 → 燃焼 → 膨張）', { c: C.am });
      s += T(200, 248, 'バイパス比 ＝ 400 ÷ 50 ＝ 8', { c: C.cy, b: 1, fs: 13 });
      return svg(400, 260, s, '図：ターボファンエンジンの空気の流れ（模式図。基礎教材 第 3 章 図 3-7・3-8 を描き直し）。ファンを通った空気の一部は、コアを通らずに後ろへ流れます。バイパス比は、バイパスの流れをコアの流れで割った値です');
    },
    // tsys.wb — the basic course's ch05-fig5-7 redrawn with kiso05.13's made-up values
    macPercent() {
      const X = m => 60 + (m - 2.0) * 320 / 1.8, le = X(2.10), te = X(3.60), cg = X(2.392857);
      let s = L(40, 170, 392, 170, C.mut, 1.5);
      [2.0, 2.5, 3.0, 3.5].forEach(m => { s += L(X(m), 166, X(m), 174, C.mut, 1.5) + T(X(m), 188, `${m.toFixed(1)} m`, { c: C.mut }); });
      s += airfoil(le, 110, te - le);
      s += L(le, 64, le, 170, C.cy, 1.5, '4 3') + L(te, 64, te, 170, C.cy, 1.5, '4 3') + L(cg, 98, cg, 170, C.am, 1.5, '4 3');
      s += L(le, 64, te, 64, C.cy, 1.5) + T((le + te) / 2, 56, 'MAC（代表の翼弦）1.50 m', { c: C.cy, b: 1 });
      s += `<circle cx="${cg.toFixed(1)}" cy="110" r="7" fill="${C.bg}" stroke="${C.am}" stroke-width="2"/>` + T(cg, 90, '重心 2.39 m', { c: C.am, b: 1 });
      s += T(le + 2, 152, 'LEMAC 2.10 m', { c: C.cy, a: 'start' }) + T(te, 152, 'TEMAC 3.60 m', { c: C.cy, a: 'end' });
      s += TL(200, 210, ['（2.39 − 2.10）÷ 1.50 × 100', '≒ 19.5%MAC'], { c: C.ink, b: 1 });
      return svg(400, 236, s, '図：%MAC の考え方（仮想の値。基礎教材 第 5 章 図 5-7 を描き直し）。MAC の前縁（LEMAC）から重心までの距離を、MAC の長さで割ります。この例では約 19.5%MAC です');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
