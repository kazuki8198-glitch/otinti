// FLIGHT LAB — book-figs.js
// The textbook's figures (inline SVG, drawn from the flight model's own data where they show numbers, so the book
// and the simulator agree) and its small calculators. Figures and tables of 空島フライト carried over and moved to
// the FAA world (feet, knots, inHg, the US airspace classes, 14 CFR 91.155), plus new ones for multi-engine flying,
// instruments and TEM. Teaching drawings, not charts: NOT FOR NAVIGATION.
(function (FL) {
  'use strict';
  const DEG = Math.PI / 180;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''} ${o.rot ? `transform="rotate(${o.rot} ${x} ${y})"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${x2 - hh * Math.cos(a - 0.45)} ${y2 - hh * Math.sin(a - 0.45)} L${x2 - hh * Math.cos(a + 0.45)} ${y2 - hh * Math.sin(a + 0.45)} Z" fill="${c}"/>`; };
  const P = (pts, c, w = 2, fill = 'none', dash = '') => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}" stroke="${c}" stroke-width="${w}" fill="${fill}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const frame = (w, h, x0, x1, y0, y1, xt, yt, xl, yl, m = { l: 50, r: 14, t: 14, b: 36 }) => {
    const X = v => m.l + (v - x0) / (x1 - x0) * (w - m.l - m.r), Y = v => h - m.b - (v - y0) / (y1 - y0) * (h - m.t - m.b);
    let s = '';
    for (const v of xt) s += L(X(v), m.t, X(v), h - m.b, C.grid, 1) + T(X(v), h - m.b + 15, v, { c: C.mut, fs: 11 });
    for (const v of yt) s += L(m.l, Y(v), w - m.r, Y(v), C.grid, 1) + T(m.l - 6, Y(v) + 4, v.toLocaleString ? v.toLocaleString() : v, { c: C.mut, fs: 11, a: 'end' });
    s += T((m.l + w - m.r) / 2, h - 4, xl, { c: C.mut, fs: 11 }) + T(12, (m.t + h - m.b) / 2, yl, { c: C.mut, fs: 11, rot: -90 });
    return { X, Y, s };
  };
  const ac = id => FL.physics.AIRCRAFT.find(a => a.id === id);
  const table = (head, rows) => `<table class="bk-t"><tr>${head.map(x => `<th>${x}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</table>`;

  const FIG = {
    forces() {
      let s = '<g transform="translate(170 110)"><ellipse cx="0" cy="0" rx="70" ry="10" fill="#dfe6ee"/><rect x="-66" y="-26" width="12" height="18" fill="#dfe6ee"/><rect x="-14" y="-4" width="40" height="5" fill="#9fb3c8"/>';
      s += A(0, 0, 0, -80, C.gr) + T(0, -88, '揚力（Lift）', { c: C.gr, b: 1 }) + A(0, 0, 0, 80, C.mut) + T(0, 100, '重力（Weight）', { c: C.mut, b: 1 });
      s += A(70, 0, 140, 0, C.am) + T(140, -10, '推力（Thrust）', { c: C.am, b: 1, a: 'end' }) + A(-70, 0, -140, 0, C.rd) + T(-140, -10, '抗力（Drag）', { c: C.rd, b: 1, a: 'start' }) + '</g>';
      return svg(340, 220, s, '図：水平飛行中の 4 つの力。速度も高度も一定なら、揚力＝重力、推力＝抗力でつり合っている');
    },
    aoa() {
      let s = `<g transform="translate(60 120) rotate(-12)"><path d="M0 0 C 30 -22, 120 -20, 200 0 C 120 8, 30 8, 0 0 Z" fill="#dfe6ee"/>${L(-30, 0, 240, 0, C.am, 1.5, '6 4')}${T(250, 4, '翼弦線（chord line）', { c: C.am, a: 'start', fs: 11 })}</g>`;
      s += A(20, 160, 290, 160, C.cy, 2) + T(150, 180, '相対風（relative wind：飛行機が進む向きの反対から来る空気）', { c: C.cy, fs: 11 });
      s += `<path d="M 260 160 A 200 200 0 0 0 256 118" stroke="${C.rd}" stroke-width="2" fill="none"/>` + T(282, 140, '迎え角 α（AOA）', { c: C.rd, b: 1, a: 'start' });
      return svg(420, 190, s, '図：迎え角は「翼弦線」と「相対風」の角度。機首の向き（ピッチ角）とは別もの');
    },
    liftCurve() {
      const p = ac('pa28').phys, W = 440, H = 250;
      const f = frame(W, H, -4, 22, -0.4, 2.4, [-4, 0, 4, 8, 12, 16, 20], [0, 0.5, 1, 1.5, 2], '迎え角 α（度）', '揚力係数 CL');
      const cl = (a, fl) => { const r = a * DEG, cl0 = p.CL0 + p.flapCL * fl, aS = p.aStall - p.flapStall * fl, sw = smoothstep(0, 0.07, r - aS); return lerp(cl0 + p.CLa * r, 1.15 * Math.sin(2 * r), sw); };
      const pts = fl => { const o = []; for (let a = -4; a <= 22; a += 0.25) o.push([f.X(a), f.Y(cl(a, fl))]); return o; };
      let s = f.s + P(pts(0), C.cy, 2.5) + P(pts(1), C.am, 2.5, 'none', '6 4');
      const aS = p.aStall / DEG, cmax = cl(aS + 1.2, 0);
      s += L(f.X(aS + 1.2), f.Y(cmax) - 4, f.X(aS + 1.2), f.Y(-0.4), C.rd, 1, '3 3') + T(f.X(aS + 1.2) + 4, f.Y(cmax) - 10, `臨界迎え角 約 ${Math.round(aS + 1)}°`, { c: C.rd, fs: 11, a: 'start' });
      s += T(f.X(2), f.Y(1.25), 'フラップ 40°', { c: C.am, fs: 11 }) + T(f.X(6.5), f.Y(0.45), 'フラップ UP', { c: C.cy, fs: 11 });
      return svg(W, H, s, '図：Archer（教材モデル）の揚力曲線。迎え角に比例して揚力が増え、臨界迎え角を超えると急に減る＝失速。フラップを下げると曲線が上へずれ、臨界迎え角は少し小さくなる');
    },
    dragCurve() {
      const p = ac('pa28').phys, W = 440, H = 250, Wt = p.mass * 9.81;
      const f = frame(W, H, 40, 140, 0, 3000, [40, 60, 80, 100, 120, 140], [0, 1000, 2000, 3000], '指示対気速度（kt）', '抗力（N）');
      const ind = [], par = [], tot = []; let best = null;
      for (let v = 44; v <= 140; v += 1) {
        const V = v / 1.94384, q = 0.5 * 1.225 * V * V, CL = Wt / (q * p.S), Dp = p.CD0 * q * p.S, Di = p.K * CL * CL * q * p.S;
        par.push([f.X(v), f.Y(Dp)]); ind.push([f.X(v), f.Y(Math.min(Di, 3000))]); tot.push([f.X(v), f.Y(Math.min(Dp + Di, 3000))]);
        if (!best || Dp + Di < best[1]) best = [v, Dp + Di];
      }
      let s = f.s + P(par, C.am, 2, 'none', '6 4') + P(ind, C.vi, 2, 'none', '6 4') + P(tot, C.cy, 2.8);
      s += `<circle cx="${f.X(best[0])}" cy="${f.Y(best[1])}" r="5" fill="${C.gr}"/>` + T(f.X(best[0]), f.Y(best[1]) + 20, `最小抗力 約 ${best[0]} kt`, { c: C.gr, fs: 11 });
      s += T(f.X(128), f.Y(2350), '有害抗力', { c: C.am, fs: 11 }) + T(f.X(52), f.Y(2500), '誘導抗力', { c: C.vi, fs: 11, a: 'start' }) + T(f.X(116), f.Y(1350), '全抗力', { c: C.cy, fs: 11, b: 1 });
      return svg(W, H, s, '図：速度と抗力（Archer 教材モデル・海面上・プロペラ停止の影響は含まない）。遅いと誘導抗力、速いと有害抗力が増え、その間に抗力が最小（揚抗比が最大）になる速度がある。チェックリストの最良滑空 76 kt は、風車状態のプロペラの抗力などを含む実機の値');
    },
    vn() {
      const v = ac('pa28').v, W = 440, H = 260, nP = 3.8, nN = -1.52;
      const f = frame(W, H, 0, 170, -2, 4.5, [0, 40, 80, 120, 160], [-2, -1, 0, 1, 2, 3, 4], '指示対気速度（kt）', '荷重倍数 n（G）');
      const vs = v.s1, va = Math.round(vs * Math.sqrt(nP)), vsN = 62;
      const up = []; for (let x = 0; x <= va; x += 1) up.push([f.X(x), f.Y(Math.min((x / vs) ** 2, nP))]);
      const xn = Math.sqrt(-nN) * vsN, dn = []; for (let x = 0; x <= xn; x += 1) dn.push([f.X(x), f.Y(-((x / vsN) ** 2))]);
      let s = f.s + L(f.X(0), f.Y(0), f.X(170), f.Y(0), C.mut, 1);
      s += `<path d="M${f.X(0)} ${f.Y(0)} ${up.map(p => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')} L${f.X(v.ne)} ${f.Y(nP)} L${f.X(v.ne)} ${f.Y(nN)} L${f.X(xn)} ${f.Y(nN)} ${dn.reverse().map(p => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')} Z" fill="rgba(95,212,255,.1)" stroke="${C.cy}" stroke-width="2"/>`;
      s += L(f.X(v.no), f.Y(nP), f.X(v.no), f.Y(nN), C.am, 1.2, '4 3') + T(f.X(v.no), f.Y(4.2), `Vno ${v.no}`, { c: C.am, fs: 11 }) + T(f.X(v.ne), f.Y(4.2), `Vne ${v.ne}`, { c: C.rd, fs: 11 });
      s += L(f.X(va), f.Y(nP), f.X(va), f.Y(0), C.gr, 1.2, '4 3') + T(f.X(va), f.Y(4.2), `Va 約 ${va}`, { c: C.gr, fs: 11 });
      s += T(f.X(30), f.Y(2.6), '失速', { c: C.mut, fs: 11 }) + T(f.X(100), f.Y(1.5), '飛べる範囲', { c: C.cy, b: 1 }) + T(f.X(145), f.Y(-1.2), '構造の限界', { c: C.rd, fs: 11 });
      return svg(W, H, s, `図：V-n 線図（普通類 +${nP} G／${nN} G の例・教材の Archer）。曲線の左は失速、上下の線を超えると構造が壊れるおそれ。チェックリストの Va は最大重量で ${v.va} kt（重量が軽いほど小さい）`);
    },
    turnTable() {
      return table(['バンク角', '荷重倍数', '失速速度の増加', '100 kt での旋回率', '100 kt での旋回半径'], [10, 20, 30, 45, 60, 75].map(b => {
        const tn = Math.tan(b * DEG), n = 1 / Math.cos(b * DEG);
        return [`${b}°`, `${n.toFixed(2)} G`, `×${Math.sqrt(n).toFixed(2)}（+${Math.round((Math.sqrt(n) - 1) * 100)}%）`, `${(1091 * tn / 100).toFixed(1)}°/秒`, `${Math.round(100 * 100 / (11.26 * tn)).toLocaleString()} ft`];
      }));
    },
    leftTurning() {
      let s = '<g transform="translate(170 150)"><rect x="-8" y="-70" width="16" height="130" rx="8" fill="#dfe6ee"/><rect x="-90" y="-20" width="180" height="22" rx="6" fill="#dfe6ee"/><rect x="-36" y="46" width="72" height="12" rx="4" fill="#dfe6ee"/>';
      s += L(-46, -76, 46, -76, C.mut, 4) + A(24, -70, 40, -60, C.am, 2) + A(-24, -82, -40, -92, C.am, 2);
      s += T(50, -46, '下がるブレード（右）', { c: C.am, fs: 11, a: 'start' }) + T(-50, -100, '上がるブレード（左）', { c: C.am, fs: 11, a: 'end' });
      s += A(40, -80, 40, -126, C.gr, 3) + A(-40, -80, -40, -100, C.gr, 2) + T(48, -118, '推力 大', { c: C.gr, fs: 11, a: 'start' }) + T(-34, -112, '推力 小', { c: C.gr, fs: 11, a: 'start' });
      s += `<path d="M 60 70 A 70 70 0 0 1 -60 70" stroke="${C.rd}" stroke-width="2.5" fill="none"/>` + A(-50, 77, -62, 68, C.rd, 2.5) + T(0, 100, '機首は左へ振られる → 右ラダーで打ち消す', { c: C.rd, fs: 12, b: 1 }) + '</g>';
      return svg(340, 270, s, '図：P ファクター（上から見た図）。機首上げ（大きな迎え角）で右側の下がるブレードの迎え角が大きくなり、右側の推力が大きくなって機首が左を向く（操縦席から見て時計回りのプロペラ）');
    },
    stability() {
      const cup = (x, lab, sub, path, ball) => `<path d="${path}" stroke="${C.cy}" stroke-width="2.5" fill="none"/><circle cx="${ball[0]}" cy="${ball[1]}" r="9" fill="${C.am}"/>` + T(x, 150, lab, { c: C.ink, b: 1 }) + T(x, 166, sub, { c: C.mut, fs: 10 });
      const s = cup(70, '正の静安定', '元に戻ろうとする', 'M20 60 Q70 150 120 60', [70, 96]) + cup(210, '中立', 'その場にとどまる', 'M160 105 L260 105', [210, 96]) + cup(350, '負の静安定', 'ずれがどんどん大きくなる', 'M300 120 Q350 30 400 120', [350, 66]);
      return svg(420, 180, s, '図：静安定のたとえ。飛行機は縦（ピッチ）と方向（ヨー）に正の静安定を持つよう設計されている');
    },
    pattern() {
      // LAB RWY 36: the runway vertical (north up), a LEFT pattern on its west side
      let s = `<rect x="300" y="40" width="16" height="200" fill="#3a4658" stroke="${C.mut}"/>` + T(308, 254, '36', { c: C.ink, fs: 12, b: 1 }) + T(308, 32, '18', { c: C.mut, fs: 11 });
      const pts = [[308, 30], [308, 10], [280, 0], [110, 0], [80, 20], [80, 270], [110, 300], [280, 300], [308, 290], [308, 245]];
      s += P(pts, C.cy, 2.5) + A(308, 270, 308, 252, C.cy, 2.5) + A(150, 300, 200, 300, C.cy, 2);
      s += T(330, 18, '離陸・上昇（upwind）', { c: C.cy, fs: 11, a: 'start' }) + T(190, -8, 'クロスウインド', { c: C.cy, fs: 11 });
      s += T(64, 150, 'ダウンウインド：地上 1,000 ft・90 kt・方位 180°', { c: C.cy, fs: 11, rot: -90 }) + T(190, 318, 'ベース：方位 090°・フラップ 25°・75 kt', { c: C.cy, fs: 11 }) + T(330, 276, `ファイナル：70 kt・フラップ 40°`, { c: C.cy, fs: 11, a: 'start' });
      s += `<circle cx="80" cy="240" r="6" fill="${C.am}"/>` + T(92, 236, 'アビーム：パワーを絞りフラップ 10°・降下開始', { c: C.am, fs: 10, a: 'start' });
      s += `<circle cx="96" cy="292" r="6" fill="${C.gr}"/>` + T(110, 282, '進入端が斜め後ろ 45° でベースへ', { c: C.gr, fs: 10, a: 'start' });
      s += T(200, 150, '旋回はすべて左（反時計回り）', { c: C.mut, fs: 11 }) + T(200, 168, '約 1.6 km（1 NM）離れて滑走路と平行', { c: C.mut, fs: 10 });
      return svg(520, 330, `<g transform="translate(20 10)">${s}</g>`, '図：LAB RWY 36（架空）の左場周経路と、この教材の Archer の目安。場周高度は AIM の推奨（プロペラ機は地上 1,000 ft）が一般的だが、空港ごとに決まりがある（Chart Supplement で確認）');
    },
    windTriangle() {
      let s = A(60, 220, 260, 40, C.cy, 3) + T(120, 110, '機首方位・真対気速度（TAS）', { c: C.cy, fs: 11, rot: -42 });
      s += A(260, 40, 330, 90, C.am, 3) + T(330, 60, '風', { c: C.am, fs: 12, b: 1, a: 'start' });
      s += A(60, 220, 330, 90, C.gr, 3) + T(220, 190, '実際の航跡（track）・対地速度（GS）', { c: C.gr, fs: 11, rot: -26 });
      s += `<path d="M 118 168 A 80 80 0 0 1 130 184" stroke="${C.rd}" stroke-width="2" fill="none"/>` + T(144, 196, '偏流修正角（WCA）', { c: C.rd, fs: 11, a: 'start' });
      return svg(400, 240, s, '図：風の三角形。「行きたい航跡」を飛ぶには、風上側に機首を向ける（偏流修正）');
    },
    holding() {
      let s = `<circle cx="120" cy="120" r="6" fill="${C.am}"/>` + T(120, 142, 'フィックス（VOR 等）', { c: C.am, fs: 11 });
      s += `<path d="M120 120 L320 120 A 45 45 0 0 1 320 210 L120 210 A 45 45 0 0 1 120 120" stroke="${C.cy}" stroke-width="2.5" fill="none"/>`;
      s += A(200, 120, 215, 120, C.cy) + A(240, 210, 225, 210, C.cy) + T(220, 110, 'アウトバウンド（1 分）', { c: C.cy, fs: 11 }) + T(220, 230, 'インバウンド（1 分・14,000 ft 以下）', { c: C.cy, fs: 11 });
      s += L(120, 30, 120, 290, C.mut, 1, '5 4') + L(120, 120, 200, 30, C.mut, 1, '5 4');
      s += T(70, 60, 'パラレル', { c: C.gr, fs: 12, b: 1 }) + T(70, 78, 'エントリー', { c: C.gr, fs: 11 }) + T(175, 50, 'ティアドロップ', { c: C.vi, fs: 12, b: 1 }) + T(60, 250, 'ダイレクト', { c: C.rd, fs: 12, b: 1 }) + T(60, 268, 'エントリー', { c: C.rd, fs: 11 });
      return svg(400, 300, s, '図：右回りの標準待機経路と 3 つの入り方（どの方向からフィックスに来たかで決まる。AIM 5-3-8）');
    },
    wbEnvelope() {
      const W = 440, H = 260, env = FL.bookCalc.ARCHER_WB.env;
      const f = frame(W, H, 80, 95, 1600, 2600, [80, 83, 86, 89, 92, 95], [1700, 2000, 2300, 2600], '重心位置（基準線から in）', '重量（lb）');
      let s = f.s + `<path d="${env.map((p, i) => (i ? 'L' : 'M') + f.X(p[0]).toFixed(1) + ' ' + f.Y(p[1]).toFixed(1)).join(' ')} Z" fill="rgba(95,212,255,.12)" stroke="${C.cy}" stroke-width="2"/>`;
      s += T(f.X(89.5), f.Y(1900), '許容範囲', { c: C.cy, b: 1 }) + T(f.X(81.5), f.Y(2450), '前すぎ', { c: C.rd, fs: 11 }) + T(f.X(94), f.Y(2100), '後ろすぎ', { c: C.rd, fs: 11, rot: -90 });
      return svg(W, H, s, '図：重量・重心の許容範囲（エンベロープ）の形の例。数値は教材用近似で、実機は必ずその機体の POH / 重量重心表で');
    },
    clouds() {
      const band = (y, hh, lab, col) => `<rect x="60" y="${y}" width="400" height="${hh}" fill="${col}"/>` + T(56, y + hh / 2 + 4, lab, { c: C.mut, fs: 10, a: 'end' });
      let s = band(20, 80, '上層', 'rgba(197,140,255,.07)') + band(100, 70, '中層', 'rgba(95,212,255,.07)') + band(170, 90, '下層', 'rgba(95,212,110,.07)');
      const c = (x, y, lab, sub) => T(x, y, lab, { c: C.ink, fs: 12, b: 1 }) + T(x, y + 14, sub, { c: C.mut, fs: 10 });
      s += c(120, 50, 'Cirrus（CI）', '巻雲') + c(230, 50, 'Cirrocumulus', '巻積雲') + c(350, 50, 'Cirrostratus', '巻層雲');
      s += c(140, 130, 'Altocumulus（AC）', '高積雲') + c(300, 130, 'Altostratus', '高層雲');
      s += c(110, 205, 'Stratocumulus（SC）', '層積雲') + c(210, 222, 'Stratus（ST）', '層雲') + c(300, 205, 'Cumulus（CU）', '積雲') + c(380, 228, 'Nimbostratus', '乱層雲');
      s += `<path d="M 440 255 L 440 60 Q 410 30 480 30" stroke="${C.rd}" stroke-width="2" fill="none"/>` + T(478, 70, 'Cumulonimbus（CB）', { c: C.rd, fs: 12, b: 1, a: 'end' }) + T(478, 84, '雷・乱気流・ひょう・着氷', { c: C.rd, fs: 10, a: 'end' });
      return svg(490, 270, s, '図：主な雲と高さの目安（METAR では CB・TCU だけが特記される）。操縦士が最も警戒するのは積乱雲（CB）と、視界を奪う層雲・霧');
    },
    seaBreeze() {
      let s = `<rect x="0" y="150" width="200" height="40" fill="rgba(61,139,255,.35)"/><rect x="200" y="150" width="240" height="40" fill="rgba(95,212,110,.25)"/>` + T(100, 176, '海（大西洋・メキシコ湾）', { c: C.ink, fs: 11 }) + T(320, 176, '陸（午後に熱せられる）', { c: C.ink, fs: 11 });
      s += A(60, 135, 240, 135, C.cy, 3) + T(150, 126, '海風（sea breeze）', { c: C.cy, fs: 11 }) + A(320, 130, 320, 40, C.am, 3) + A(240, 30, 60, 30, C.mut, 2);
      s += `<path d="M 300 60 Q 310 20 340 30 Q 370 10 380 40 Q 400 50 380 70 L 300 70 Z" fill="rgba(223,230,238,.35)" stroke="${C.ink}"/>` + T(345, 92, '上昇気流 → 積乱雲', { c: C.am, fs: 11 });
      return svg(440, 200, s, '図：海風と午後の積乱雲。フロリダ半島では夏の午後、両側の海から来る海風がぶつかる内陸で雷雨が発達しやすい（Aviation Weather Handbook の局地風の説明を図にした教材の模式図）');
    },
    atm() {
      const W = 400, H = 240, f = frame(W, H, -60, 20, 0, 40, [-60, -40, -20, 0, 20], [0, 10, 20, 30, 40], '気温（℃）', '高度（1,000 ft）');
      let s = f.s + P([[f.X(15), f.Y(0)], [f.X(-56.5), f.Y(36.09)], [f.X(-56.5), f.Y(40)]], C.cy, 2.5);
      s += T(f.X(-8), f.Y(14), '1,000 ft あたり約 −2℃', { c: C.cy, fs: 11, a: 'start' }) + T(f.X(-8), f.Y(11), '気圧は 1,000 ft あたり約 1 inHg 下がる', { c: C.mut, fs: 10, a: 'start' });
      s += L(f.X(-60), f.Y(36.09), f.X(20), f.Y(36.09), C.am, 1, '4 3') + T(f.X(-20), f.Y(37.6), '対流圏界面（ISA 36,089 ft）', { c: C.am, fs: 10 });
      return svg(W, H, s, '図：国際標準大気（ISA）。海面 15℃・29.92 inHg（1013.25 hPa）、上に行くほど気温も気圧も下がる');
    },
    vfrMinima() {
      return table(['空域', '飛行視程', '雲からの距離（下 / 上 / 水平）'], [
        ['Class A', '—（VFR 不可）', '—'], ['Class B', '3 SM', '雲に入らない（Clear of clouds）'], ['Class C', '3 SM', '500 ft 下 / 1,000 ft 上 / 2,000 ft 水平'], ['Class D', '3 SM', '500 ft 下 / 1,000 ft 上 / 2,000 ft 水平'],
        ['Class E（10,000 ft MSL 未満）', '3 SM', '500 ft 下 / 1,000 ft 上 / 2,000 ft 水平'], ['Class E（10,000 ft MSL 以上）', '5 SM', '1,000 ft 下 / 1,000 ft 上 / 1 SM 水平'],
        ['Class G（地上 1,200 ft 以下）昼', '1 SM', '雲に入らない'], ['Class G（地上 1,200 ft 以下）夜', '3 SM', '500 / 1,000 / 2,000 ft（場周経路の特例あり）'],
        ['Class G（地上 1,200 ft 超・10,000 ft MSL 未満）昼', '1 SM', '500 ft 下 / 1,000 ft 上 / 2,000 ft 水平'], ['Class G（同）夜', '3 SM', '500 ft 下 / 1,000 ft 上 / 2,000 ft 水平'],
        ['Class G（地上 1,200 ft 超・10,000 ft MSL 以上）', '5 SM', '1,000 ft 下 / 1,000 ft 上 / 1 SM 水平']]) + '<p class="bk-src">出典：14 CFR 91.155(a)。このほか、地表まで設定された管制空域（Class B・C・D・E の地表区域）では、雲高 1,000 ft 未満では雲の下を VFR で飛べず（91.155(c)）、地上視程 3 SM 以上でないと VFR で離着陸・場周経路に入れない（91.155(d)）。特別有視界飛行方式（91.157）は別。</p>';
    },
    airspace() {
      // a schematic cross-section of US airspace (heights are typical, not universal)
      const W = 520, H = 260, y = ft => 230 - ft / 18000 * 210;
      let s = `<rect x="0" y="${y(18000)}" width="${W}" height="${y(14500) - y(18000) + 0}" fill="rgba(197,140,255,.12)"/>` + T(W - 8, y(18000) + 14, 'Class A：18,000 ft MSL 以上（IFR のみ）', { c: C.vi, fs: 11, a: 'end' });
      s += `<path d="M150 ${y(10000)} L370 ${y(10000)} L370 ${y(6000)} L420 ${y(6000)} L420 ${y(3000)} L330 ${y(3000)} L330 230 L190 230 L190 ${y(3000)} L100 ${y(3000)} L100 ${y(6000)} L150 ${y(6000)} Z" fill="rgba(61,139,255,.18)" stroke="${C.bl}"/>` + T(260, y(8500), 'Class B（大空港・逆ウエディングケーキ形）', { c: C.bl, fs: 11 });
      s += `<path d="M20 ${y(4000)} L70 ${y(4000)} L70 230 L46 230 L46 ${y(1200)} L20 ${y(1200)} Z" fill="rgba(255,90,79,.0)" stroke="${C.rd}"/>`;
      s += `<path d="M440 ${y(4000)} L510 ${y(4000)} L510 ${y(1200)} L490 ${y(1200)} L490 230 L460 230 L460 ${y(1200)} L440 ${y(1200)} Z" fill="rgba(255,90,79,.15)" stroke="${C.rd}"/>` + T(475, y(4600), 'Class C', { c: C.rd, fs: 11, b: 1 }) + T(475, y(5600), '5 NM / 10 NM', { c: C.mut, fs: 10 });
      s += `<rect x="20" y="${y(2500)}" width="40" height="${230 - y(2500)}" fill="rgba(95,212,255,.18)" stroke="${C.cy}" stroke-dasharray="4 3"/>` + T(40, y(3100), 'Class D', { c: C.cy, fs: 11, b: 1 });
      s += T(260, y(14000), 'Class E（管制空域。多くは地上 700 / 1,200 ft から上）', { c: C.gr, fs: 11 }) + T(260, 222, 'Class G（非管制空域・地表付近）', { c: C.am, fs: 11 });
      s += L(0, 230, W, 230, C.mut, 1.5);
      return svg(W, H, s, '図：米国の空域の断面（模式図・高さは代表例）。Class B は許可（cleared into the Class Bravo）が必要、Class C・D は管制との双方向の無線交信の確立が必要（14 CFR 91.129〜91.131、AIM 3-2）');
    },
    xwindTable() {
      return table(['風と滑走路の角度', '横風成分', '向かい風成分', '風 15 kt なら'], [10, 20, 30, 45, 60, 90].map(a => [`${a}°`, `${Math.round(Math.sin(a * DEG) * 100)}%`, `${Math.round(Math.cos(a * DEG) * 100)}%`, `横 ${Math.round(15 * Math.sin(a * DEG))} kt・向かい ${Math.round(15 * Math.cos(a * DEG))} kt`]));
    },
    stableApproach() {
      return table(['項目', '安定進入の目安（この教材の Archer・フラップ 40°）'], [['進入角', '3°（PAPI 白 2・赤 2）'], ['速度', '70 kt（+10／−5 kt 以内）'], ['降下率', '約 370 fpm（1,000 fpm を超えない）'], ['形態', 'フラップ・チェックリスト完了'], ['コース', 'センターラインの延長上。大きな修正が要らない'], ['判断', '地上 500 ft（VMC の目安）で満たさなければ<b>ゴーアラウンド</b>']]);
    },
    papi() {
      const row = (y, cols, lab) => cols.map((c, i) => `<circle cx="${90 + i * 34}" cy="${y}" r="11" fill="${c ? '#f2f2f2' : '#ff4a3a'}"/>`).join('') + T(250, y + 4, lab, { c: C.ink, fs: 12, a: 'start' });
      const s = row(30, [1, 1, 1, 1], '高すぎる（3.5° 以上）') + row(70, [1, 1, 1, 0], 'やや高い') + row(110, [1, 1, 0, 0], '正しい（3°）') + row(150, [1, 0, 0, 0], 'やや低い') + row(190, [0, 0, 0, 0], '低すぎる（2.5° 以下）');
      return svg(460, 210, s, '図：PAPI（精密進入角指示灯）の見え方。滑走路の左側に 4 つ並ぶ（LAB RWY 36 も同じ）。白が多いと高い、赤が多いと低い（AIM 2-1-2）');
    },
    oeiForces() {
      let s = '<g transform="translate(200 150)"><rect x="-6" y="-80" width="12" height="150" rx="6" fill="#dfe6ee"/><rect x="-150" y="-12" width="300" height="20" rx="6" fill="#dfe6ee"/><rect x="-50" y="56" width="100" height="10" rx="4" fill="#dfe6ee"/>';
      s += `<rect x="-78" y="-40" width="18" height="44" rx="6" fill="#9fb3c8"/><rect x="60" y="-40" width="18" height="44" rx="6" fill="#9fb3c8"/>` + L(-92, -44, -46, -44, C.rd, 4) + T(-69, -52, '停止', { c: C.rd, fs: 11 });
      s += A(69, -44, 69, -110, C.gr, 4) + T(69, -118, '推力（右エンジン）', { c: C.gr, fs: 11 }) + A(-69, -40, -69, 20, C.rd, 3) + T(-110, 34, '風車状態のプロペラの抗力', { c: C.rd, fs: 10 });
      s += `<path d="M 40 -90 A 90 90 0 0 0 -60 -70" stroke="${C.am}" stroke-width="3" fill="none"/>` + A(-50, -78, -64, -66, C.am, 3) + T(-10, -100, '機首は止まった側（左）へ', { c: C.am, fs: 12, b: 1 });
      s += A(0, 70, 30, 70, C.cy, 3) + T(60, 92, 'ラダー（右を踏む）の力', { c: C.cy, fs: 11 });
      s += '</g>';
      return svg(400, 260, s, '図：片発停止（左エンジン停止）の力。生きている右エンジンの推力と止まった左のプロペラの抗力で、機首は左へ回ろうとする。右ラダー（生きている側の足）で止め、生きている側へ 2〜5° バンクすると横滑りが最小になる（Airplane Flying Handbook 第 13 章）');
    },
    vmcFactors() {
      return table(['条件（14 CFR 23 の Vmc 決定条件の考え方）', 'Vmc への影響', '理由'], [
        ['生きているエンジンが最大出力', '高くなる', '非対称推力が最大'], ['止まった側のプロペラが風車状態（フェザーしていない）', '高くなる', '止まった側の抗力が大きい'],
        ['重心が後方（後方限界）', '高くなる', 'ラダーの腕（重心から舵まで）が短くなる'], ['重量が軽い', '高くなる（Vmc の定義上）', 'バンクによる横向きの揚力の助けが小さい'],
        ['脚 UP・フラップ離陸位置', '一般に高くなる', '脚の「竜骨効果」がない（機体による）'], ['バンク 5° まで生きている側へ', '低くなる', '揚力の横成分が非対称推力を助ける'],
        ['密度高度が高い（高い・暑い）', '低くなる', '出力が減る（ただし失速速度に近づく）'], ['臨界発動機の停止', '最も高い', 'P ファクター等で生きている側の推力線が外側（Seminole は左右逆回転なので臨界発動機なし）']])
        + '<p class="bk-src">出典：FAA Airplane Flying Handbook（FAA-H-8083-3C）第 13 章、14 CFR 23.2135（旧 23.149）。数値・条件は機体の AFM が優先。</p>';
    },
    ils() {
      let s = `<rect x="360" y="150" width="120" height="10" fill="#3a4658"/>` + T(420, 176, '滑走路', { c: C.mut, fs: 11 });
      s += L(40, 150 - Math.tan(3 * DEG) * 340, 380, 150, C.gr, 2.5) + T(120, 112, 'グライドスロープ（3°）', { c: C.gr, fs: 11 });
      s += L(40, 150 - Math.tan(3.7 * DEG) * 340, 380, 150, C.gr, 1, '4 3') + L(40, 150 - Math.tan(2.3 * DEG) * 340, 380, 150, C.gr, 1, '4 3');
      s += `<circle cx="300" cy="${150 - Math.tan(3 * DEG) * 80}" r="5" fill="${C.am}"/>` + T(300, 112, '決心高度（DA）', { c: C.am, fs: 11 }) + T(300, 126, 'ここで滑走路が見えなければ進入復行', { c: C.am, fs: 10 });
      s += T(60, 160, 'ローカライザー：横方向（左右のずれ）', { c: C.cy, fs: 11, a: 'start' });
      return svg(500, 190, s, '図：ILS（計器着陸装置）。ローカライザーが左右、グライドスロープが上下のずれを示し、PFD の CDI と菱形（GS）に表示される（AIM 1-1-9）');
    },
    scan() {
      const c = (x, y, lab) => `<rect x="${x - 36}" y="${y - 18}" width="72" height="36" rx="6" fill="rgba(95,212,255,.08)" stroke="${C.cy}"/>` + T(x, y + 4, lab, { c: C.ink, fs: 12, b: 1 });
      let s = c(200, 100, '姿勢') + c(80, 100, '速度') + c(320, 100, '高度') + c(200, 190, '方位') + c(80, 190, '旋回率') + c(320, 190, '昇降率');
      for (const [x, y] of [[80, 100], [320, 100], [200, 190], [80, 190], [320, 190]]) s += L(200 + (x - 200) * 0.25, 100 + (y - 100) * 0.25, 200 + (x - 200) * 0.6, 100 + (y - 100) * 0.6, C.am, 2);
      s += T(200, 40, '放射状クロスチェック（radial scan）：姿勢 → 他の計器 → 姿勢 → …', { c: C.am, fs: 12 });
      return svg(400, 230, s, '図：計器のスキャン。いつも姿勢に戻ってから次の計器へ。G1000 では中央の姿勢表示の周りに速度・高度・昇降率・方位が並ぶ（Instrument Flying Handbook 第 6 章）');
    },
    tem() {
      let s = `<rect x="20" y="30" width="140" height="60" rx="8" fill="rgba(255,178,62,.12)" stroke="${C.am}"/>` + T(90, 56, '脅威（Threat）', { c: C.am, b: 1 }) + T(90, 74, '天気・他機・不具合…', { c: C.mut, fs: 10 });
      s += `<rect x="190" y="30" width="140" height="60" rx="8" fill="rgba(255,106,90,.12)" stroke="${C.rd}"/>` + T(260, 56, 'エラー（Error）', { c: C.rd, b: 1 }) + T(260, 74, '操作・手順・交信の誤り', { c: C.mut, fs: 10 });
      s += `<rect x="360" y="30" width="140" height="60" rx="8" fill="rgba(197,140,255,.12)" stroke="${C.vi}"/>` + T(430, 52, '望ましくない', { c: C.vi, b: 1 }) + T(430, 68, '機体の状態（UAS）', { c: C.vi, b: 1 }) + T(430, 84, '高度・速度の逸脱…', { c: C.mut, fs: 10 });
      s += A(160, 60, 188, 60, C.ink, 2) + A(330, 60, 358, 60, C.ink, 2);
      s += `<rect x="20" y="120" width="480" height="44" rx="8" fill="rgba(95,212,110,.1)" stroke="${C.gr}"/>` + T(260, 147, '管理（Manage）：予測（ブリーフィング）→ 気づく（モニター・クロスチェック）→ 対処（立て直す）', { c: C.gr, fs: 12 });
      return svg(520, 180, s, '図：TEM（Threat and Error Management）の流れ。脅威とエラーを早く見つけて管理し、望ましくない状態（UAS）に進ませない（SKYbrary の TEM の説明を図にしたもの）');
    },
    standardRate() {
      return table(['真対気速度', '標準旋回（3°/秒）のバンク', '目安「速度 ÷ 10 ＋ 7」'], [70, 90, 100, 120, 150].map(v => [`${v} kt`, `${(Math.atan(3 * v / 1091) / DEG).toFixed(0)}°`, `${Math.round(v / 10 + 7)}°`]));
    },
  };

  // ---------------------------------------------------------------- calculators inside the text
  const ARCHER_WB = {
    // teaching approximations (教材用近似・機体ごとに要確認): arms in inches from the datum, the envelope's shape
    rows: [['空虚重量（BEW）', 1640, 87.0], ['前席（操縦士・同乗者）', 340, 80.5], ['後席', 150, 118.1], ['燃料（40 gal × 6 lb）', 240, 95.0], ['手荷物', 50, 142.8]],
    env: [[82.0, 1600], [82.0, 2050], [88.6, 2550], [93.0, 2550], [93.0, 1600]],
    max: 2550,
  };
  const CALC = {
    turn(el) {
      el.innerHTML = '<label>速度 <input type="number" value="100" min="40" max="300"> kt</label> <label>バンク <input type="number" value="30" min="5" max="75"> °</label> <output></output>';
      const [v, b] = el.querySelectorAll('input'), out = el.querySelector('output');
      const f = () => { const V = +v.value, B = +b.value * DEG, tn = Math.tan(B); out.innerHTML = `荷重倍数 <b>${(1 / Math.cos(B)).toFixed(2)} G</b>・旋回率 <b>${(1091 * tn / V).toFixed(1)}°/秒</b>・半径 <b>${Math.round(V * V / (11.26 * tn)).toLocaleString()} ft</b>・失速速度 ×${Math.sqrt(1 / Math.cos(B)).toFixed(2)}`; };
      v.addEventListener('input', f); b.addEventListener('input', f); f();
    },
    da(el) {
      el.innerHTML = '<label>標高・高度 <input type="number" value="55" step="100"> ft</label> <label>気温 <input type="number" value="33"> ℃</label> <label>高度計規正値 <input type="number" value="29.92" step="0.01"> inHg</label> <output></output>';
      const [h, t, q] = el.querySelectorAll('input'), out = el.querySelector('output');
      const f = () => { const pa = +h.value + (29.92 - +q.value) * 1000, isa = 15 - 2 * pa / 1000, da = pa + 120 * (+t.value - isa); out.innerHTML = `気圧高度 <b>${Math.round(pa).toLocaleString()} ft</b>・標準気温 ${isa.toFixed(0)}℃・密度高度 <b>${Math.round(da).toLocaleString()} ft</b>（概算式：気圧高度＋120×（気温−標準気温））`; };
      for (const e of [h, t, q]) e.addEventListener('input', f); f();
    },
    xwind(el) {
      el.innerHTML = '<label>滑走路 <input type="number" value="36" min="1" max="36"> （番号）</label> <label>風向 <input type="number" value="060" step="10"> °</label> <label>風速 <input type="number" value="12"> kt</label> <output></output>';
      const [r, d, s] = el.querySelectorAll('input'), out = el.querySelector('output');
      const f = () => { const a = ((+d.value - +r.value * 10) % 360 + 540) % 360 - 180, x = +s.value * Math.sin(a * DEG), hw = +s.value * Math.cos(a * DEG);
        out.innerHTML = `角度 <b>${Math.abs(Math.round(a))}°</b>・横風 <b>${Math.abs(x).toFixed(0)} kt（${x >= 0 ? '右' : '左'}から）</b>・${hw >= 0 ? '向かい風' : '<span style="color:#ff6a5a">追い風</span>'} <b>${Math.abs(hw).toFixed(0)} kt</b>${Math.abs(x) > 17 ? '　<span style="color:#ff6a5a">Archer の実証横風成分 17 kt を超える</span>' : ''}`; };
      for (const e of [r, d, s]) e.addEventListener('input', f); f();
    },
    wca(el) {
      el.innerHTML = '<label>真航路 <input type="number" value="090"> °</label> <label>真対気速度 <input type="number" value="105"> kt</label> <label>風向 <input type="number" value="030"> °</label> <label>風速 <input type="number" value="15"> kt</label> <output></output>';
      const [c, v, wd, ws] = el.querySelectorAll('input'), out = el.querySelector('output');
      const f = () => { const tc = +c.value * DEG, tas = +v.value, a = (+wd.value) * DEG - tc, w = +ws.value, xw = w * Math.sin(a), wca = Math.asin(clamp(xw / tas, -1, 1)), gs = tas * Math.cos(wca) - w * Math.cos(a);
        out.innerHTML = `偏流修正角 <b>${xw >= 0 ? '右' : '左'}へ ${Math.abs(wca / DEG).toFixed(0)}°</b>・真針路 <b>${String(Math.round((((tc + wca) / DEG) % 360 + 360) % 360)).padStart(3, '0')}°</b>・対地速度 <b>${Math.round(gs)} kt</b>`; };
      for (const e of [c, v, wd, ws]) e.addEventListener('input', f); f();
    },
    wb(el) {
      const R = ARCHER_WB.rows;
      el.innerHTML = '<table class="bk-t"><tr><th>項目</th><th>重量 lb</th><th>アーム in</th><th>モーメント</th></tr>' + R.map(r => `<tr><td>${r[0]}</td><td><input type="number" value="${r[1]}"></td><td>${r[2]}</td><td class="m"></td></tr>`).join('') + '<tr><th>合計</th><th class="tw"></th><th class="cg"></th><th class="tm"></th></tr></table><output></output>';
      const ins = el.querySelectorAll('input'), out = el.querySelector('output');
      const fwdAt = w => w <= 2050 ? 82.0 : 82.0 + (w - 2050) / 500 * 6.6;
      const f = () => { let tw = 0, tm = 0; ins.forEach((inp, i) => { const w = +inp.value, m = w * R[i][2]; tw += w; tm += m; el.querySelectorAll('.m')[i].textContent = Math.round(m).toLocaleString(); });
        const cg = tm / tw, ok = tw <= ARCHER_WB.max && cg >= fwdAt(tw) && cg <= 93.0;
        el.querySelector('.tw').textContent = Math.round(tw).toLocaleString(); el.querySelector('.tm').textContent = Math.round(tm).toLocaleString(); el.querySelector('.cg').textContent = cg.toFixed(2);
        out.innerHTML = ok ? `<span style="color:#5fd46a">範囲内</span>：重量 ${Math.round(tw)} lb（最大 ${ARCHER_WB.max}）・重心 ${cg.toFixed(1)} in（許容 ${fwdAt(tw).toFixed(1)}〜93.0、教材用近似）` : `<span style="color:#ff6a5a">範囲外</span>：重量 ${Math.round(tw)} lb・重心 ${cg.toFixed(1)} in。荷物や燃料を減らす・積む位置を変える`; };
      ins.forEach(i => i.addEventListener('input', f)); f();
    },
    fuel(el) {
      el.innerHTML = '<label>距離 <input type="number" value="120"> NM</label> <label>対地速度 <input type="number" value="105"> kt</label> <label>燃料消費 <input type="number" value="9.5" step="0.5"> gal/h</label> <label>予備 <input type="number" value="30"> 分</label> <output></output>';
      const [d, g, b, r] = el.querySelectorAll('input'), out = el.querySelector('output');
      const f = () => { const t = +d.value / +g.value, need = (t + +r.value / 60) * +b.value; out.innerHTML = `飛行時間 <b>${Math.floor(t)} 時間 ${Math.round(t % 1 * 60)} 分</b>・必要燃料 <b>${need.toFixed(1)} gal</b>（予備を含む。タキシー・上昇の分は別に足す）`; };
      for (const e of [d, g, b, r]) e.addEventListener('input', f); f();
    },
    rule60(el) {
      el.innerHTML = '<label>飛んだ距離 <input type="number" value="20"> NM</label> <label>航路から外れた距離 <input type="number" value="2" step="0.1"> NM</label> <label>残りの距離 <input type="number" value="40"> NM</label> <output></output>';
      const [a, b, c] = el.querySelectorAll('input'), out = el.querySelector('output');
      const f = () => { const off = 60 * +b.value / +a.value, close = 60 * +b.value / +c.value; out.innerHTML = `外れた角度 <b>${off.toFixed(0)}°</b>・目的地へ向けるには <b>${(off + close).toFixed(0)}°</b> 修正（平行に戻すだけなら ${off.toFixed(0)}°）`; };
      for (const e of [a, b, c]) e.addEventListener('input', f); f();
    },
  };
  FL.bookFigs = FIG;
  FL.bookCalc = Object.assign(CALC, { ARCHER_WB });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
