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

  const FIG = {
    // ---------------------------------------------------------------- 第 1 章 intro（はじめに）
    courseMap() {
      // the six parts, top to bottom, with the chapters of each (counted from FL.book, so a new chapter keeps it right)
      const CH = (FL.book && FL.book.CHAPTERS) || [], rng = p => { const n = CH.filter(c => c.part === p).map(c => c.n); return n.length ? (n.length > 1 ? `第 ${n[0]}〜${n[n.length - 1]} 章` : `第 ${n[0]} 章`) : ''; };
      const rows = [['p1', '地上学科', '飛ぶ前に知ること：原理・機体・気象・規則・交信・人間', C.cy, 'book'], ['p2', '基礎操縦（Archer）', '点検・基本操縦・離着陸・緊急操作・ソロ', C.gr, 'single'],
        ['p3', '航法', '地図と飛行計画・電波航法と GPS・目的地変更', C.am, 'map'], ['p4', '計器飛行', '計器だけを見て飛ぶ・計器飛行方式（IFR）', C.vi, 'cloud'],
        ['p5', '多発（Seminole）', 'エンジン 2 つの飛行機・片発停止', C.bl, 'twin'], ['p6', 'チームで飛ぶ', 'TEM・CRM・ジェット機と自動化への準備', C.rd, 'crew']];
      const icon = (k, x, y, c) => k === 'book' ? `<path d="M${x - 16} ${y - 10} h14 v22 h-14 Z M${x + 2} ${y - 10} h14 v22 h-14 Z" fill="none" stroke="${c}" stroke-width="2"/>`
        : k === 'single' ? planeSide(x, y + 2, 0.34, { gear: false }) : k === 'twin' ? planeTop(x, y, 0.22, { twin: true })
          : k === 'map' ? `<path d="M${x - 16} ${y - 10} l10 4 l12 -4 l10 4 v20 l-10 -4 l-12 4 l-10 -4 Z" fill="none" stroke="${c}" stroke-width="2"/>${A(x - 6, y + 6, x + 8, y - 4, c, 2)}`
            : k === 'cloud' ? `<path d="M${x - 16} ${y + 8} a8 8 0 0 1 4 -15 a10 10 0 0 1 19 -2 a7 7 0 0 1 9 11 Z" fill="none" stroke="${c}" stroke-width="2"/>`
              : `<circle cx="${x - 8}" cy="${y - 4}" r="6" fill="none" stroke="${c}" stroke-width="2"/><circle cx="${x + 9}" cy="${y - 4}" r="6" fill="none" stroke="${c}" stroke-width="2"/><path d="M${x - 18} ${y + 12} q10 -12 20 0 M${x - 1} ${y + 12} q10 -12 20 0" fill="none" stroke="${c}" stroke-width="2"/>`;
      let s = '';
      rows.forEach(([p, t, sub, c, ic], i) => {
        const y = 8 + i * 56;
        s += `<rect x="8" y="${y}" width="384" height="46" rx="8" fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-width="1.5"/>`;
        s += T(22, y + 19, `第 ${i + 1} 部`, { c, b: 1, a: 'start', fs: 13 }) + T(84, y + 19, t, { c: C.ink, b: 1, a: 'start', fs: 13 }) + T(384, y + 19, rng(p), { c: C.mut, a: 'end', fs: 12 });
        s += T(22, y + 38, sub, { c: C.ink, a: 'start', fs: 12 });
        if (i < rows.length - 1) s += `<path d="M200 ${y + 47} l-6 0 l6 8 l6 -8 Z" fill="${C.mut}"/>`;
      });
      return svg(400, 342, s, '図：この教科書の 6 つの部。上から順に、地上で学ぶこと → 単発機の操縦 → 航法 → 計器飛行 → 双発機 → チームで飛ぶ準備、と進みます');
    },
    courseFlow() {
      // the published basic course, as the public articles describe it (a summary, not an official course chart)
      const st = [['座学（ロンドン）', '授業はすべて英語。管制通信の練習も', C.cy], ['単発機 Piper Archer（Sanford）', '1 回 90〜120 分のレッスン 12 回 → 審査 → ソロ', C.gr],
        ['航法（Navigation）', '地図と上空の風から針路を計算して飛ぶ', C.am], ['計器飛行', '計器だけを頼りに飛ぶ', C.vi], ['双発機 Piper Seminole', '片発停止や故障への対応 → 最後の審査', C.bl], ['ライセンス取得 → 副操縦士任用訓練へ', '', C.rd]];
      let s = L(28, 22, 28, 22 + 5 * 52, C.mut, 2);
      st.forEach(([t, sub, c], i) => {
        const y = 22 + i * 52;
        s += `<circle cx="28" cy="${y}" r="8" fill="${c}"/>` + T(48, y + 5, t, { c, b: 1, a: 'start', fs: 13 }) + (sub ? T(48, y + 24, sub, { c: C.ink, a: 'start', fs: 12 }) : '');
      });
      s += `<rect x="8" y="302" width="384" height="26" rx="6" fill="none" stroke="${C.mut}" stroke-dasharray="4 3"/>` + T(200, 320, '期間は全体で約 1 年半〜2 年（公開記事）', { c: C.mut, fs: 12 });
      return svg(400, 336, s, '図：公開されている記事から読み取れる基礎訓練の流れ（要約）。細かな内容・順番・基準は公開されていません');
    },
    certLadder() {
      // 14 CFR Part 61 (eCFR, checked 2026-10): the minimum ages, hours, tests and medical classes
      const steps = [['学生操縦士（Student Pilot）', '16 歳から・試験なし（申請）・第 3 種', '61.83'], ['自家用操縦士（Private Pilot）', '17 歳・40 時間以上・学科＋実地・第 3 種', '61.103'],
        ['計器飛行証明（Instrument Rating）', '機長の野外飛行 50 時間・計器飛行 40 時間など', '61.65'], ['事業用操縦士（Commercial Pilot）', '18 歳・250 時間以上・学科＋実地・第 2 種', '61.123'],
        ['多発の等級（Multiengine）', '資格に加える限定。実地試験だけ', '61.63'], ['定期運送用操縦士（ATP）', '23 歳・1,500 時間（R-ATP は短縮）・機長は第 1 種', '61.153']];
      let s = T(12, 18, '↑ 下から順に積み上げる', { c: C.gr, b: 1, a: 'start', fs: 13 }) + T(392, 18, '数字は規則の最低限', { c: C.mut, a: 'end', fs: 12 });
      steps.forEach(([t, sub, rule], i) => {
        const y = 300 - (i + 1) * 46, x = 12 + i * 12;
        s += `<rect x="${x}" y="${y}" width="${392 - x}" height="40" rx="6" fill="${C.cy}" fill-opacity="${0.06 + i * 0.03}" stroke="${C.cy}" stroke-width="1.2"/>`;
        s += T(x + 8, y + 17, t, { c: C.ink, b: 1, a: 'start', fs: 13 }) + T(x + 8, y + 34, sub, { c: C.ink, a: 'start', fs: 12 }) + T(386, y + 17, rule, { c: C.am, a: 'end', fs: 12 });
      });
      s += `<rect x="12" y="306" width="380" height="26" rx="6" fill="${C.am}" fill-opacity="0.12" stroke="${C.am}"/>` + T(202, 324, 'どの資格も：英語を読み・話し・書き・理解できること', { c: C.am, b: 1, fs: 12 });
      return svg(400, 340, s, '図：米国（FAA）の飛行機の操縦士の資格の段階（14 CFR Part 61 の要点）。年齢・飛行時間は Part 61 の最低限で、「第 N 種」はその資格の権利を使うのに必要な身体検査証明の等級です');
    },
    studyCycle() {
      const n = [['読む', '教科書の節', 200, 46, C.cy], ['答える', '確認問題・学科テスト', 338, 140, C.am], ['飛ぶ', 'シミュレータの課目', 200, 234, C.gr], ['振り返る', '講評とメモ', 62, 140, C.vi]];
      let s = ARC(200, 140, 74, -60, -30, C.mut, 2) + ARC(200, 140, 74, 30, 60, C.mut, 2) + ARC(200, 140, 74, 120, 150, C.mut, 2) + ARC(200, 140, 74, 210, 240, C.mut, 2);
      for (const [t, sub, x, y, c] of n) s += `<rect x="${x - 58}" y="${y - 24}" width="116" height="48" rx="10" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>` + T(x, y - 3, t, { c, b: 1, fs: 14 }) + T(x, y + 15, sub, { c: C.ink, fs: 12 });
      s += T(200, 136, 'くり返す', { c: C.mut, fs: 12 }) + T(200, 152, 'ごとに上達', { c: C.mut, fs: 12 });
      return svg(400, 280, s, '図：この教材での学び方。読む → 答える → 飛ぶ → 振り返る、をくり返します');
    },
    forces() {
      // the course's Archer in cruise (110 KIAS, sea level): lift = weight ≈ 10,300 N, drag ≈ 1,160 N — drawn about 9 : 1 would hide
      // thrust and drag, so they are drawn shorter but not to scale (the caption says so)
      let s = planeSide(200, 132, 1.5, { gear: false });
      s += A(206, 124, 206, 34, C.gr, 4) + T(214, 40, '揚力（Lift）', { c: C.gr, b: 1, a: 'start', fs: 14 }) + T(214, 58, '翼が空気から受ける上向きの力', { c: C.ink, a: 'start', fs: 12 });
      s += A(206, 140, 206, 230, C.mut, 4) + T(214, 222, '重力（Weight）', { c: C.mut, b: 1, a: 'start', fs: 14 }) + T(214, 240, '機体・燃料・人・荷物の重さ', { c: C.ink, a: 'start', fs: 12 });
      s += A(284, 132, 340, 132, C.am, 4) + T(392, 116, '推力（Thrust）', { c: C.am, b: 1, a: 'end', fs: 14 }) + T(392, 156, 'プロペラが前へ引く', { c: C.ink, a: 'end', fs: 12 });
      s += A(116, 132, 60, 132, C.rd, 4) + T(8, 116, '抗力（Drag）', { c: C.rd, b: 1, a: 'start', fs: 14 }) + T(8, 156, '空気の抵抗', { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 252, s, '図：飛んでいる飛行機に働く 4 つの力。高度も速度も変わらない水平飛行では、揚力＝重力、推力＝抗力でつり合っています（矢印の長さは模式的。巡航では揚力は抗力の約 9 倍）');
    },
    liftFlow() {
      // a cambered airfoil (NACA 2412 shape) at a small angle of attack; the air bends up a little ahead of it and is
      // turned downward behind it (drawn exaggerated so it can be seen)
      const t = 0.12, m = 0.02, pp = 0.4, aoa = 7 * DEG, x0 = 112, y0 = 128, ch = 180, dw = 13 * DEG;
      const yt = x => 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
      const yc = x => x < pp ? m / (pp * pp) * (2 * pp * x - x * x) : m / ((1 - pp) ** 2) * (1 - 2 * pp + 2 * pp * x - x * x);
      const tr = (x, y) => [x0 + x * ch * Math.cos(aoa) + y * ch * Math.sin(aoa), y0 + x * ch * Math.sin(aoa) - y * ch * Math.cos(aoa)];
      const up = [], lo = [];
      for (let i = 0; i <= 40; i++) { const x = (1 - Math.cos(Math.PI * i / 40)) / 2; up.push(tr(x, yc(x) + yt(x))); lo.push(tr(x, yc(x) - yt(x))); }
      const xTE = x0 + ch * Math.cos(aoa), yTE = y0 + ch * Math.sin(aoa);
      // the middle line of the flow: level far ahead, a little upwash before the leading edge, along the wing, downward behind
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
      s += T(150, 86, '上面：圧力が低い', { c: C.gr, b: 1, fs: 13, halo: 1 }) + T(150, 186, '下面：圧力が高い', { c: C.am, b: 1, fs: 13, halo: 1 });
      s += A(214, 126, 214, 58, C.gr, 4) + T(224, 62, '揚力', { c: C.gr, b: 1, a: 'start', fs: 15, halo: 1 });
      s += A(318, 166, 352, 206, C.vi, 3) + T(392, 226, '空気を下へ曲げる', { c: C.vi, b: 1, a: 'end', fs: 12, halo: 1 }) + T(392, 242, '（吹き下ろし）', { c: C.vi, a: 'end', fs: 12, halo: 1 });
      return svg(400, 252, s, '図：翼が揚力を生むしくみ。翼は前から来る空気を下へ曲げ、その反作用で上へ押されます。このとき上面の圧力は下がり、下面の圧力は上がります');
    },
    aoa() {
      // two panels: a climb and a descent with the same angle of attack (angles exaggerated so they can be seen)
      const wedge = (cx, cy, r, a0, a1, c, op) => { const p = a => [cx + r * Math.cos(-a * DEG), cy + r * Math.sin(-a * DEG)], [x0, y0] = p(a0), [x1, y1] = p(a1);
        return `<path d="M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 ${a1 > a0 ? 0 : 1} ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${c}" fill-opacity="${op}" stroke="${c}" stroke-width="1"/>`; };
      const panel = (oy, cyOff, path, aoaDeg, title, ly) => {
        const pitch = path + aoaDeg, cx = 120, cy = oy + cyOff, len = 262, end = (a, l = len) => [cx + l * Math.cos(-a * DEG), cy + l * Math.sin(-a * DEG)];
        let s = T(12, oy + 20, title, { c: C.ink, b: 1, a: 'start', fs: 13 }) + L(12, cy, 392, cy, C.mut, 1, '5 4');
        s += wedge(cx, cy, 236, 0, pitch, C.vi, 0.16) + wedge(cx, cy, 196, path, pitch, C.rd, 0.32);
        const [chx, chy] = end(pitch), n = [Math.sin(-path * DEG) * 15, Math.cos(-path * DEG) * 15], [ax, ay] = end(path, 60), [bx, by] = end(path), [rx, ry] = end(path, 236), [qx, qy] = end(path, 140);
        s += L(cx, cy, chx, chy, C.am, 1.6, '6 4') + A(ax, ay, bx, by, C.gr, 2.5) + A(rx + n[0], ry + n[1], qx + n[0], qy + n[1], C.cy, 2.5);
        s += planeSide(cx, cy, 0.8, { pitch, gear: false });
        s += T(12, oy + ly, `ピッチ角 ${pitch > 0 ? '+' : ''}${pitch}°`, { c: C.vi, b: 1, a: 'start', fs: 13 }) + T(12, oy + ly + 18, `迎え角 +${aoaDeg}°`, { c: C.rd, b: 1, a: 'start', fs: 13 });
        return s;
      };
      let s = panel(0, 126, 10, 6, '上昇中：機首は上を向いている', 44) + panel(158, 46, -10, 6, '降下中：機首が下を向いていても、迎え角はプラス', 92);
      s += `<line x1="16" y1="320" x2="40" y2="320" stroke="${C.am}" stroke-width="1.6" stroke-dasharray="6 4"/>` + T(46, 324, '翼弦線', { c: C.am, a: 'start', fs: 12 });
      s += A(106, 320, 136, 320, C.gr, 2.5) + T(142, 324, '進む向き', { c: C.gr, a: 'start', fs: 12 }) + A(250, 320, 220, 320, C.cy, 2.5) + T(256, 324, '相対風', { c: C.cy, a: 'start', fs: 12 });
      s += L(318, 320, 342, 320, C.mut, 1, '5 4') + T(348, 324, '水平', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 334, s, '図：迎え角（赤）は翼弦線と相対風の角度で、ピッチ角（紫：水平線と機首の角度）とは別のものです。上昇中も降下中も、迎え角は同じ 6° のことがあります（角度は見やすく大きくしています）');
    },
    liftCurve() {
      const p = ac('pa28').phys, W = 400, H = 260;
      const f = frame(W, H, -4, 22, -0.4, 2.4, [-4, 0, 4, 8, 12, 16, 20], [0, 0.5, 1, 1.5, 2], '迎え角 α（度）', '揚力係数 CL', { l: 50, r: 12, t: 14, b: 38 });
      const cl = (a, fl) => { const r = a * DEG, cl0 = p.CL0 + p.flapCL * fl, aS = p.aStall - p.flapStall * fl, sw = smoothstep(0, 0.07, r - aS); return lerp(cl0 + p.CLa * r, 1.15 * Math.sin(2 * r), sw); };
      const pts = fl => { const o = []; for (let a = -4; a <= 22; a += 0.25) o.push([f.X(a), f.Y(cl(a, fl))]); return o; };
      let s = f.s + P(pts(0), C.cy, 2.5) + P(pts(1), C.am, 2.5, 'none', '6 4');
      let pk = 0; for (let a = 0; a <= 22; a += 0.1) if (cl(a, 0) > cl(pk, 0)) pk = a;          // the peak of the flaps-up curve
      const cmax = cl(pk, 0);
      s += L(f.X(pk), f.Y(cmax) - 4, f.X(pk), f.Y(-0.4), C.rd, 1.2, '3 3') + T(f.X(pk) - 4, f.Y(2.25), `臨界迎え角 約 ${Math.round(pk)}°`, { c: C.rd, fs: 12, a: 'end', b: 1 });
      s += T(f.X(19.5), f.Y(1.32), '失速', { c: C.rd, fs: 12, b: 1, halo: 1 }) + A(f.X(19.5), f.Y(1.22), f.X(19.5), f.Y(0.95), C.rd, 2);
      s += T(f.X(1), f.Y(1.4), 'フラップ 40°', { c: C.am, fs: 12, b: 1, halo: 1 }) + T(f.X(7.5), f.Y(0.5), 'フラップ UP', { c: C.cy, fs: 12, b: 1, halo: 1 });
      return svg(W, H, s, '図：この教材の Archer の揚力曲線（教材値）。迎え角に比例して揚力係数が増え、臨界迎え角を超えると急に減ります（失速）。フラップを下げると曲線が上へずれ、臨界迎え角は少し小さくなります');
    },
    axes() {
      // the three axes through the centre of gravity, and the control surface that turns the airplane about each
      let s = T(12, 20, '上から見た図', { c: C.ink, b: 1, a: 'start', fs: 13 }) + T(392, 20, '横から見た図', { c: C.ink, b: 1, a: 'end', fs: 13 });
      const tx = 118, ty = 150, k = 1.35;
      s += planeTop(tx, ty, k);
      s += `<path d="M${tx - 66 * k} ${ty - 8 * k} L${tx - 36 * k} ${ty - 8 * k} L${tx - 36 * k} ${ty + 6 * k} L${tx - 66 * k} ${ty + 6 * k} Z M${tx + 36 * k} ${ty - 8 * k} L${tx + 66 * k} ${ty - 8 * k} L${tx + 66 * k} ${ty + 6 * k} L${tx + 36 * k} ${ty + 6 * k} Z" fill="${C.cy}" fill-opacity="0.85"/>`;
      s += `<path d="M${tx - 22 * k} ${ty + 38 * k} L${tx + 22 * k} ${ty + 38 * k} L${tx + 21 * k} ${ty + 45 * k} L${tx - 21 * k} ${ty + 45 * k} Z" fill="${C.am}" fill-opacity="0.9"/>`;
      s += L(tx, ty - 92, tx, ty + 92, C.cy, 1.8, '6 4') + L(tx - 112, ty, tx + 112, ty, C.am, 1.8, '6 4');
      s += T(tx + 8, ty - 80, '縦軸', { c: C.cy, b: 1, a: 'start', fs: 13, halo: 1 }) + T(tx + 8, ty - 64, '→ ロール', { c: C.cy, a: 'start', fs: 12, halo: 1 });
      s += T(tx - 112, ty - 10, '横軸 → ピッチ', { c: C.am, b: 1, a: 'start', fs: 13, halo: 1 });
      s += T(tx - 68, ty + 26, 'エルロン', { c: C.cy, b: 1, fs: 12, halo: 1 }) + T(tx + 68, ty + 26, 'エルロン', { c: C.cy, b: 1, fs: 12, halo: 1 }) + T(tx + 34, ty + 76, 'スタビレーター', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 });
      const sx = 312, sy = 160;
      s += planeSide(sx, sy, 1.15, { gear: false }) + `<path d="M${sx - 50 * 1.15} ${sy - 27 * 1.15} L${sx - 57 * 1.15} ${sy - 27 * 1.15} L${sx - 54 * 1.15} ${sy - 3 * 1.15} L${sx - 46 * 1.15} ${sy - 5 * 1.15} Z" fill="${C.gr}"/>`;
      s += L(sx, sy - 70, sx, sy + 56, C.gr, 1.8, '6 4') + T(sx + 6, sy - 58, '垂直軸', { c: C.gr, b: 1, a: 'start', fs: 13, halo: 1 }) + T(sx + 6, sy - 42, '→ ヨー', { c: C.gr, a: 'start', fs: 12, halo: 1 });
      s += T(sx - 66, sy - 40, 'ラダー', { c: C.gr, b: 1, fs: 12, halo: 1 });
      s += `<circle cx="${tx}" cy="${ty}" r="5" fill="${C.ink}"/><circle cx="${sx}" cy="${sy}" r="5" fill="${C.ink}"/>` + T(200, 286, '3 本の軸は重心（白い点）で交わる', { c: C.ink, fs: 12 });
      return svg(400, 296, s, '図：飛行機の 3 つの軸と操縦翼面。エルロンで縦軸まわりに傾き（ロール）、スタビレーターで横軸まわりに機首が上下し（ピッチ）、ラダーで垂直軸まわりに機首が左右に向きます（ヨー）');
    },
    coordBall() {
      // the inclinometer ("the ball") in a right turn: coordinated, slipping, skidding
      const tube = (x, off, title, sub, c) => `<path d="M${x - 52} 66 Q${x} 104 ${x + 52} 66" stroke="${C.mut}" stroke-width="20" fill="none" stroke-linecap="round"/>`
        + `<path d="M${x - 52} 66 Q${x} 104 ${x + 52} 66" stroke="#0b1422" stroke-width="15" fill="none" stroke-linecap="round"/>` + L(x - 9, 74, x - 9, 96, C.mut, 1.5) + L(x + 9, 74, x + 9, 96, C.mut, 1.5)
        + `<circle cx="${x + off}" cy="${85 - Math.abs(off) * 0.28}" r="7" fill="${C.ink}"/>` + T(x, 130, title, { c, b: 1, fs: 13 }) + TL(x, 148, sub, { c: C.ink, fs: 12, lh: 16 });
      let s = T(200, 22, '右旋回中のボール（横滑り計）', { c: C.ink, b: 1, fs: 13 });
      s += tube(68, 0, '釣り合い', ['ボールが中央'], C.gr) + tube(200, 22, '内滑り（slip）', ['ボールが内側へ', '→ 右ラダーを足す'], C.am) + tube(332, -22, '外滑り（skid）', ['ボールが外側へ', '→ 右ラダーを減らす'], C.rd);
      s += `<rect x="12" y="186" width="376" height="30" rx="6" fill="${C.cy}" fill-opacity="0.1" stroke="${C.cy}"/>` + T(200, 206, 'ボールが寄った側のラダーを踏む（「ボールを踏む」）', { c: C.cy, b: 1, fs: 13 });
      return svg(400, 224, s, '図：ボール（横滑り計）の見方。旋回が釣り合っていればボールは中央です。ボールが寄った側のラダーを踏むと中央に戻ります');
    },
    stallFlow() {
      // three angles of attack: the flow follows the wing, then (past the critical angle) breaks away from the top
      const t = 0.12, yt = x => 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
      const row = (y0, a, title, sub, c, stalled) => {
        const x0 = 120, ch = 130, r = a * DEG, xT = x0 + ch * Math.cos(r), yT = y0 + ch * Math.sin(r), dw = Math.min(a, 12) * DEG;
        const up = [], lo = [];
        for (let i = 0; i <= 30; i++) { const x = (1 - Math.cos(Math.PI * i / 30)) / 2; for (const [arr, sg] of [[up, 1], [lo, -1]]) arr.push([x0 + x * ch * Math.cos(r) + sg * yt(x) * ch * Math.sin(r), y0 + x * ch * Math.sin(r) - sg * yt(x) * ch * Math.cos(r)]); }
        const mid = x => x < x0 ? y0 - a * 0.8 * Math.exp(-(((x - x0) / 40) ** 2)) : x <= xT ? y0 - a * 0.8 * (1 - (x - x0) / (xT - x0)) + (x - x0) * Math.tan(r) : yT + (x - xT) * Math.tan(stalled ? 2 * DEG : dw) * Math.exp(-(x - xT) / 160);
        const th = x => { const u = clamp(((x - x0) / (ch * Math.cos(r)) + 0.12) / 1.12, 0, 1); return t * ch * 0.6 * Math.sin(Math.PI * u) ** 0.8; };
        let s = T(12, y0 - 40, title, { c, b: 1, a: 'start', fs: 13 }) + T(392, y0 - 40, sub, { c: C.ink, a: 'end', fs: 12 });
        for (const off of [-26, -10, 14, 28]) {
          const d = Math.exp(-Math.abs(off) / 60), pts = [];
          for (let x = 8; x <= 392; x += 4) {
            let yy = y0 + off + (mid(x) - y0) * d + (off < 0 ? -1 : 1) * th(x) * d;
            // stalled: the air near the top leaves the wing near its front and goes on almost straight
            if (stalled && off < 0 && x > x0 + 12) yy = Math.min(yy, y0 + off * 1.3 - 1 + (x - x0) * 0.04);
            pts.push([x, yy]);
          }
          s += P(pts, C.cy, 1.3);
        }
        s += P([...up, ...lo.reverse()], C.ink, 1.2, PLANE);
        if (stalled) for (let k = 0; k < 4; k++) { const cx = x0 + 42 + k * 25, cy = y0 - 4 + k * 8.5 + k * k * 0.6; s += `<path d="M${cx - 8} ${cy} a8 6 0 1 1 8 6 a4.5 3.5 0 1 1 -3.5 -4.5" stroke="${C.rd}" stroke-width="1.6" fill="none"/>`; }
        return s + T(x0 - 14, y0 + 5, `${a}°`, { c: C.am, b: 1, a: 'end', fs: 13 });
      };
      let s = row(64, 4, '迎え角が小さい', '空気は翼に沿って流れる', C.gr, false) + row(170, 15, '臨界迎え角の少し手前', '揚力が最大に近い', C.am, false) + row(276, 20, '臨界迎え角を超えた＝失速', '上面の流れがはがれ、揚力が急に減る', C.rd, true);
      return svg(400, 330, s, '図：迎え角と失速。迎え角を大きくすると揚力は増えますが、臨界迎え角を超えると翼の上面から空気の流れがはがれ、揚力が急に減ります。これが失速です（角度は模式的な例）');
    },
    dragCurve() {
      // the model's clean airframe drag at sea level and its teaching weight (no windmilling propeller)
      const p = ac('pa28').phys, W = 400, H = 260, Wt = p.mass * 9.81;
      const f = frame(W, H, 40, 140, 0, 3000, [40, 60, 80, 100, 120, 140], [0, 1000, 2000, 3000], '指示対気速度（kt）', '抗力（N）', { l: 56, r: 12, t: 14, b: 38 });
      const ind = [], par = [], tot = []; let best = null;
      for (let v = 44; v <= 140; v += 1) {
        const V = v / 1.94384, q = 0.5 * 1.225 * V * V, CL = Wt / (q * p.S), Dp = p.CD0 * q * p.S, Di = p.K * CL * CL * q * p.S;
        par.push([f.X(v), f.Y(Dp)]); ind.push([f.X(v), f.Y(Math.min(Di, 3000))]); tot.push([f.X(v), f.Y(Math.min(Dp + Di, 3000))]);
        if (!best || Dp + Di < best[1]) best = [v, Dp + Di];
      }
      let s = f.s + P(par, C.am, 2.2, 'none', '6 4') + P(ind, C.vi, 2.2, 'none', '6 4') + P(tot, C.cy, 3);
      s += `<circle cx="${f.X(best[0])}" cy="${f.Y(best[1])}" r="5" fill="${C.gr}"/>` + T(f.X(best[0]), f.Y(best[1]) + 22, `抗力が最小 約 ${best[0]} kt`, { c: C.gr, fs: 12, b: 1, halo: 1 });
      s += T(f.X(124), f.Y(2500), '有害抗力', { c: C.am, fs: 12, b: 1, halo: 1 }) + T(f.X(56), f.Y(2650), '誘導抗力', { c: C.vi, fs: 12, a: 'start', b: 1, halo: 1 }) + T(f.X(112), f.Y(1250), '全抗力', { c: C.cy, fs: 13, b: 1, halo: 1 });
      s += T(f.X(48), f.Y(180), '← 遅い：誘導抗力が大きい', { c: C.ink, fs: 12, a: 'start', halo: 1 }) + T(f.X(139), f.Y(180), '速い：有害抗力が大きい →', { c: C.ink, fs: 12, a: 'end', halo: 1 });
      return svg(W, H, s, '図：速度と抗力（この教材の Archer の機体だけの抗力・海面上・教材値）。遅いと誘導抗力、速いと有害抗力が増え、その間に抗力が最小の速度があります');
    },
    groundEffect() {
      // the wing seen from behind, high and near the ground: the tip vortices and the downwash get weaker near the ground
      const vortex = (x, y, r, dir, c) => { let d = `M${x} ${y}`; for (let a = 0; a <= 720; a += 15) { const rr = r * (1 - a / 900), t = a * DEG * dir; d += ` L${(x + rr * Math.cos(t)).toFixed(1)} ${(y + rr * Math.sin(t) * 0.8).toFixed(1)}`; } return `<path d="${d}" stroke="${c}" stroke-width="1.6" fill="none"/>`; };
      const wing = (y, k, title, sub, c) => {
        let s = T(12, y - 50, title, { c, b: 1, a: 'start', fs: 13 }) + TL(12, y - 33, sub, { c: C.ink, a: 'start', fs: 12, lh: 16 });
        s += planeFront(200, y, 1.35, { gear: false });
        s += vortex(110, y + 4, 22 * k, -1, C.cy) + vortex(290, y + 4, 22 * k, 1, C.cy);
        for (const x of [150, 200, 250]) s += A(x, y + 22, x, y + 22 + 46 * k, C.vi, 2.5);
        return s;
      };
      let s = wing(84, 1, '高い所', '翼端渦と吹き下ろしが大きい', C.cy) + wing(244, 0.45, '地面のすぐ近く（翼幅の 1/4 より低い）', ['地面が渦と吹き下ろしを', 'じゃまする', '→ 誘導抗力が減る'], C.gr);
      s += `<rect x="0" y="278" width="400" height="14" fill="${C.gr}" fill-opacity="0.25"/>` + T(392, 290, '地面', { c: C.gr, a: 'end', fs: 12 });
      return svg(400, 298, s, '図：地面効果。翼が地面のすぐ近くまで下りると、翼端の渦と吹き下ろしが弱まって誘導抗力が減ります。翼幅の高さではほとんど効かず、低いほど強く効きます。着陸のフレアで「浮く」のはこのため');
    },
    flaps() {
      // the Archer's flap settings (its detents from FL.physics), drawn on a wing section
      const labels = ac('pa28').flapLabels, deg = [0, 10, 25, 40];
      const foil = (x0, y0, ch, f) => {
        const t = 0.13, up = [], lo = [], yt = x => 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4), hinge = 0.72, r = f * DEG;
        const pt = (x, y) => { if (x <= hinge) return [x0 + x * ch, y0 - y * ch]; const dx = (x - hinge) * ch, dy = -y * ch; return [x0 + hinge * ch + dx * Math.cos(r) - dy * Math.sin(r) * -1 * 0 + dy * Math.sin(r) * 0, y0 + dx * Math.sin(r) + dy * Math.cos(r)]; };
        for (let i = 0; i <= 32; i++) { const x = (1 - Math.cos(Math.PI * i / 32)) / 2; up.push(pt(x, yt(x) + 0.02)); lo.push(pt(x, -yt(x) + 0.02)); }
        return P([...up, ...lo.reverse()], C.ink, 1.2, PLANE);
      };
      let s = '';
      deg.forEach((f, i) => {
        const y = 40 + i * 62;
        s += T(12, y + 4, labels[i] === 'UP' ? 'UP（0°）' : labels[i], { c: [C.cy, C.gr, C.am, C.rd][i], b: 1, a: 'start', fs: 14 }) + foil(84, y, 128, f);
        s += T(392, y - 4, ['ふつうの飛行', '揚力が増え、抗力は少し増える', '揚力も抗力も増える', '抗力が大きく増える'][i], { c: C.ink, a: 'end', fs: 12 }) + T(392, y + 13, ['', '例：場周のアビーム', '例：ベース・短距離離陸', '例：着陸（深い角度で降りられる）'][i], { c: C.mut, a: 'end', fs: 12 });
      });
      return svg(400, 272, s, '図：Archer のフラップの段階（UP・10°・25°・40°）。下げるほど翼の反りが大きくなり、揚力も抗力も増えます。使える速度は白い帯の中だけ');
    },
    asi() {
      // the Archer's airspeed indicator markings, drawn from the course's numbers (FL.physics: the teaching values)
      const v = ac('pa28').v, cx = 118, cy = 132, ang = k => (-90 + k / 180 * 320) * DEG, pt = (k, r) => [cx + r * Math.cos(ang(k)), cy + r * Math.sin(ang(k))];
      const band = (k0, k1, r, w, c) => { const [x0, y0] = pt(k0, r), [x1, y1] = pt(k1, r); return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${(k1 - k0) / 180 * 320 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${c}" stroke-width="${w}" fill="none"/>`; };
      let s = `<circle cx="${cx}" cy="${cy}" r="112" fill="#060c16" stroke="${C.mut}" stroke-width="2"/>`;
      s += band(v.s0, v.fe, 86, 7, '#f2f2f2') + band(v.s1, v.no, 97, 9, C.gr) + band(v.no, v.ne, 97, 9, '#ffd23e');
      const [r0x, r0y] = pt(v.ne, 84), [r1x, r1y] = pt(v.ne, 104); s += L(r0x, r0y, r1x, r1y, C.rd, 4);
      for (let k = 0; k <= 180; k += 10) { const [ax, ay] = pt(k, 104), [bx, by] = pt(k, k % 20 ? 98 : 94); s += L(ax, ay, bx, by, C.ink, 1.5); if (k % 20 === 0 && k >= 40) { const [tx, ty] = pt(k, 72); s += T(tx.toFixed(1), (ty + 4).toFixed(1), k, { c: C.ink, fs: 12 }); } }
      s += T(cx, cy - 38, 'KNOTS', { c: C.mut, fs: 12 }) + T(cx, cy - 22, 'IAS', { c: C.mut, fs: 12 });
      // the needle at the normal approach speed
      const [nx, ny] = pt(v.appr, 80); s += L(cx, cy, nx, ny, C.ink, 3) + `<circle cx="${cx}" cy="${cy}" r="5" fill="${C.ink}"/>`;
      const leg = [['#f2f2f2', '白い帯', 'フラップを使える範囲', `${v.s0}〜${v.fe} kt`], [C.gr, '緑の帯', '通常の範囲', `${v.s1}〜${v.no} kt`], ['#ffd23e', '黄色の帯', '穏やかな空気のときだけ', `${v.no}〜${v.ne} kt`], [C.rd, '赤い線', '超えてはいけない速度', `${v.ne} kt（Vne）`]];
      leg.forEach(([c, t, l1, l2], i) => { const y = 34 + i * 58; s += `<rect x="246" y="${y - 11}" width="16" height="10" fill="${c}"/>` + T(268, y, t, { c, b: 1, a: 'start', fs: 13 }) + T(246, y + 18, l1, { c: C.ink, a: 'start', fs: 12 }) + T(246, y + 34, l2, { c: C.ink, a: 'start', fs: 12 }); });
      return svg(400, 260, s, `図：速度計の色の帯（この教材の Archer の値）。白はフラップを使える範囲、緑は通常の範囲、黄色は穏やかな空気のときだけ使う範囲、赤い線は超えてはいけない速度です。針は進入速度 ${v.appr} kt`);
    },
    vn() {
      // a normal-category V-n diagram (+3.8 G / −1.52 G), the speeds from the course's Archer (FL.physics)
      const v = ac('pa28').v, W = 400, H = 280, nP = 3.8, nN = -1.52;
      const f = frame(W, H, 0, 170, -2, 4.6, [0, 40, 80, 120, 160], [-2, -1, 0, 1, 2, 3, 4], '指示対気速度（kt）', '荷重倍数 n（G）', { l: 44, r: 12, t: 30, b: 38 });
      const va = v.va, vs = va / Math.sqrt(nP), vsN = vs * 1.07;            // the stall line through Va (the maximum weight's), a schematic
      const up = []; for (let x = 0; x <= va; x += 1) up.push([f.X(x), f.Y(Math.min((x / vs) ** 2, nP))]);
      const xn = Math.sqrt(-nN) * vsN, dn = []; for (let x = 0; x <= xn; x += 1) dn.push([f.X(x), f.Y(-((x / vsN) ** 2))]);
      let s = f.s + L(f.X(0), f.Y(0), f.X(170), f.Y(0), C.mut, 1);
      s += `<path d="M${f.X(0)} ${f.Y(0)} ${up.map(p => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')} L${f.X(v.ne)} ${f.Y(nP)} L${f.X(v.ne)} ${f.Y(nN)} L${f.X(xn)} ${f.Y(nN)} ${dn.reverse().map(p => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')} Z" fill="rgba(95,212,255,.1)" stroke="${C.cy}" stroke-width="2"/>`;
      s += L(f.X(v.no), f.Y(nP), f.X(v.no), f.Y(nN), C.am, 1.4, '4 3') + T(f.X(v.no) - 4, 20, `Vno ${v.no}`, { c: C.am, fs: 12, b: 1, a: 'end' }) + T(f.X(v.ne) + 6, 20, `Vne ${v.ne}`, { c: C.rd, fs: 12, b: 1, a: 'end' });
      s += L(f.X(va), f.Y(nP), f.X(va), f.Y(0), C.gr, 1.4, '4 3') + T(f.X(va) - 4, f.Y(3.2), `Va ${va}`, { c: C.gr, fs: 12, b: 1, a: 'end', halo: 1 });
      s += T(f.X(22), f.Y(2.4), '失速', { c: C.ink, fs: 12, b: 1, halo: 1 }) + T(f.X(102), f.Y(1.6), '飛べる範囲', { c: C.cy, b: 1, fs: 13, halo: 1 }) + T(f.X(104), f.Y(nP) - 6, `+${nP} G（構造の限界）`, { c: C.rd, fs: 12, b: 1, halo: 1 }) + T(f.X(112), f.Y(nN) + 18, `${nN} G`, { c: C.rd, fs: 12, b: 1, halo: 1 });
      return svg(W, H, s, `図：V-n 線図（普通類の制限荷重倍数 +${nP} G／${nN} G。速度は Archer の POH の値）。曲線の左は失速、上と下の線を超えると機体が壊れるおそれがあります。失速の線は最大重量の Va ${v.va} kt から描いた模式図で、Va は軽いほど小さくなります`);
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
      s += T(lx + 6, ly - 6, `揚力（${n.toFixed(2)} 倍）`, { c: C.gr, b: 1, a: 'start', fs: 13, halo: 1 }) + T(cx - 8, ly + 22, '上向きの分', { c: C.gr, b: 1, a: 'end', fs: 12, halo: 1 }) + T(cx - 8, ly + 38, '＝重力を支える', { c: C.gr, a: 'end', fs: 12, halo: 1 });
      s += T(lx + 10, cy - 30, '横向きの分', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 }) + T(lx + 10, cy - 14, '＝旋回の中心へ引く力', { c: C.am, a: 'start', fs: 12, halo: 1 });
      s += T(cx + 8, cy + Wp - 4, '重力', { c: C.mut, b: 1, a: 'start', fs: 13, halo: 1 }) + T(392, cy + 20, '旋回の中心 →', { c: C.am, a: 'end', fs: 12 });
      s += `<rect x="12" y="282" width="376" height="30" rx="6" fill="${C.gr}" fill-opacity="0.1" stroke="${C.gr}"/>` + T(200, 302, `高度を保つには揚力を ${n.toFixed(2)} 倍に＝荷重倍数 ${n.toFixed(2)} G`, { c: C.gr, b: 1, fs: 13 });
      return svg(400, 320, s, `図：旋回の力。機体を傾けると揚力も傾き、その横向きの分で曲がります。上向きの分が減るので、高度を保つには揚力を増やします（30° バンクで ${n.toFixed(2)} 倍）`);
    },
    turnTable() {
      return table(['バンク角', '荷重倍数', '失速速度の増加', '100 kt での旋回率', '100 kt での旋回半径'], [10, 20, 30, 45, 60, 75].map(b => {
        const tn = Math.tan(b * DEG), n = 1 / Math.cos(b * DEG);
        return [`${b}°${n > 3.8 ? '（Archer の制限 3.8 G を超える）' : ''}`, `${n.toFixed(2)} G`, `×${Math.sqrt(n).toFixed(2)}（+${Math.round((Math.sqrt(n) - 1) * 100)}%）`, `${(1091 * tn / 100).toFixed(1)}°/秒`, `${Math.round(100 * 100 / (11.26 * tn)).toLocaleString()} ft`];
      }));
    },
    leftTurning() {
      // seen from above, nose up, at high power and low speed (a climb): why the nose goes left, and the right rudder that stops it
      const cx = 132, cy = 178, k = 1.35;
      let s = planeTop(cx, cy, k);
      const nose = cy - 50 * k, prop = nose - 3, tail = cy + 46 * k;
      // P-factor: the descending blade (pilot's right) makes more thrust at a high angle of attack
      s += A(cx + 12, prop, cx + 12, prop - 58, C.gr, 4) + A(cx - 12, prop, cx - 12, prop - 26, C.gr, 2.5);
      // the slipstream spiralling round the fuselage and striking the left side of the fin
      let d = `M${cx + 14} ${nose + 4}`; for (let t = 0; t <= 1.001; t += 0.05) { const y = nose + 4 + t * (tail - nose - 14), x = cx + 14 * Math.cos(t * Math.PI * 2.2); d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; }
      s += `<path d="${d}" stroke="${C.cy}" stroke-width="2" fill="none" stroke-dasharray="5 3"/>` + A(cx - 30, tail - 6, cx - 6, tail - 6, C.cy, 3);
      // the result: the nose yaws left; the right rudder (trailing edge to the right) holds it straight
      s += ARC(cx, cy, 98, -78, -110, C.rd, 3) + `<path d="M${cx} ${tail + 4} l9 15" stroke="${C.am}" stroke-width="4" stroke-linecap="round"/>`;
      s += T(cx - 40, 76, '機首は左へ', { c: C.rd, b: 1, a: 'end', fs: 13, halo: 1 });
      s += T(cx + 22, prop - 46, '推力 大', { c: C.gr, b: 1, a: 'start', fs: 12, halo: 1 }) + T(cx + 22, prop - 30, '（右側の下がるブレード）', { c: C.gr, a: 'start', fs: 12, halo: 1 });
      s += T(cx - 34, tail - 18, 'らせん後流が', { c: C.cy, a: 'end', fs: 12, halo: 1 }) + T(cx - 34, tail - 2, '尾翼の左に当たる', { c: C.cy, a: 'end', fs: 12, halo: 1 });
      s += T(cx + 16, tail + 22, '右ラダーで打ち消す', { c: C.am, b: 1, a: 'start', fs: 13, halo: 1 });
      const box = [['① P ファクター', '下がるブレードの推力が大きい'], ['② らせん後流（slipstream）', '後流が尾翼の左側を押す'], ['③ トルク', 'プロペラの反作用で左へ傾く'], ['④ ジャイロ効果', '機首の向きを変えたときに出る']];
      box.forEach(([t, sub], i) => { const y = 34 + i * 62; s += `<rect x="232" y="${y - 18}" width="160" height="50" rx="7" fill="${C.vi}" fill-opacity="0.1" stroke="${C.vi}"/>` + T(240, y, t, { c: C.vi, b: 1, a: 'start', fs: 12 }) + T(240, y + 20, sub, { c: C.ink, a: 'start', fs: 12 }); });
      s += T(312, 300, '高出力・低速・機首上げで強い', { c: C.am, b: 1, fs: 12 });
      return svg(400, 312, s, '図：左偏向傾向（上から見た図・上昇中）。操縦席から見て時計回りのプロペラでは、4 つの原因で機首が左へ向こうとするので、右ラダーで打ち消します（PHAK。ジャイロ効果は機首の向きを変えている間だけ働く）');
    },
    cgTail() {
      // longitudinal balance: the centre of gravity ahead of the wing's lift, the tail pushing down (a seesaw)
      const y = 132, cg = 214, cl = 188, tail = 92;            // the nose is to the right: the CG ahead (right) of the lift
      let s = planeSide(200, y, 1.9, { gear: false });
      s += `<circle cx="${cg}" cy="${y}" r="8" fill="#0b1422" stroke="${C.ink}" stroke-width="2"/><path d="M${cg} ${y - 8} A8 8 0 0 1 ${cg + 8} ${y} L${cg} ${y} Z M${cg} ${y + 8} A8 8 0 0 1 ${cg - 8} ${y} L${cg} ${y} Z" fill="${C.ink}"/>`;
      s += A(cl, y - 6, cl, y - 96, C.gr, 4) + T(cl - 8, y - 84, '揚力（主翼）', { c: C.gr, b: 1, a: 'end', fs: 13, halo: 1 });
      s += A(cg, y + 10, cg, y + 96, C.mut, 4) + T(cg - 8, y + 92, '重力（重心）', { c: C.mut, b: 1, a: 'end', fs: 13, halo: 1 });
      s += A(tail, y - 50, tail, y - 8, C.am, 4) + T(tail, y - 58, '尾翼の下向きの力', { c: C.am, b: 1, fs: 13, halo: 1 });
      s += L(cl, y + 24, cg, y + 24, C.ink, 1.5) + L(cl, y + 18, cl, y + 30, C.ink, 1.5) + T(cl - 6, y + 48, '重心は揚力より前（機首側）', { c: C.ink, fs: 12, a: 'end', halo: 1 });
      s += ARC(cl, y, 120, -24, 20, C.rd, 2.5) + T(392, y + 76, '重心が前なので', { c: C.rd, fs: 12, a: 'end', halo: 1 }) + T(392, y + 92, '機首は下がろうとする', { c: C.rd, fs: 12, a: 'end', halo: 1 });
      s += T(12, 22, '横から見た図（縦の釣り合い）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      return svg(400, 252, s, '図：縦の釣り合い。重心は主翼の揚力の中心より前にあり、機首は下がろうとします。それを水平尾翼の下向きの力が支えています。この形が、速度を一定に保とうとする性質（縦の安定）を生みます');
    },
    stability() {
      const cup = (x, lab, sub, path, ball, c) => `<path d="${path}" stroke="${C.cy}" stroke-width="2.5" fill="none"/><circle cx="${ball[0]}" cy="${ball[1]}" r="9" fill="${C.am}"/>` + T(x, 132, lab, { c, b: 1, fs: 13 }) + TL(x, 150, sub, { c: C.ink, fs: 12, lh: 16 });
      let s = cup(68, '正の静安定', ['ずれても', '元に戻る'], 'M16 46 Q68 128 120 46', [68, 78], C.gr) + cup(200, '中立', ['ずれた所に', 'とどまる'], 'M148 96 L252 96', [200, 87], C.am) + cup(332, '負の静安定', ['ずれが', 'どんどん大きく'], 'M280 106 Q332 26 384 106', [332, 57], C.rd);
      return svg(400, 186, s, '図：静安定のたとえ（くぼみ・平ら・山の上の玉）。飛行機は、縦（ピッチ）と方向（ヨー）に正の静安定を持つように作られています');
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
    // ---------------------------------------------------------------- 第 3 章 sys（機体と装備）
    stabilatorTab() {
      // the Archer's all-moving tail and its anti-servo tab (the tab moves the same way as the trailing edge, so the air
      // pushes back and the control feels heavier); the trim wheel moves the tab's neutral position
      const panel = (y, defl, title, sub) => {
        const px = 150, r = defl * DEG, cx = px + 120 * Math.cos(r), cy = y - 120 * Math.sin(r), tr = (defl * 2.2) * DEG;
        let s = T(12, y - 46, title, { c: C.ink, b: 1, a: 'start', fs: 13 }) + T(12, y - 29, sub, { c: C.mut, a: 'start', fs: 12 });
        s += `<path d="M10 ${y - 14} L120 ${y - 6} L120 ${y + 8} L10 ${y + 14} Z" fill="${PLANE}"/>` + T(40, y + 30, '胴体の後ろ', { c: C.mut, fs: 12 });
        s += `<path d="M${px - 30} ${y} L${px + 14} ${y - 5} L${px + 120} ${y} L${px + 14} ${y + 5} Z" transform="rotate(${-defl} ${px} ${y})" fill="${PLANE2}"/>`;
        const tx = cx + 34 * Math.cos(r + tr), ty = cy - 34 * Math.sin(r + tr);
        s += `<line x1="${cx}" y1="${cy}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="${C.am}" stroke-width="7" stroke-linecap="round"/>`;
        s += `<circle cx="${px}" cy="${y}" r="5" fill="${C.ink}"/>` + T(px, y + 26, '回転の軸', { c: C.ink, fs: 12 });
        s += T(px + 60, y + 26, 'スタビレーター', { c: C.cy, b: 1, a: 'start', fs: 12, halo: 1 }) + T(tx - 4, ty + 22, 'アンチサーボタブ', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 });
        if (defl) s += A(tx + 4, ty - 34, tx - 2, ty - 8, C.rd, 2.5) + T(392, ty - 52, '空気が押し返す', { c: C.rd, a: 'end', fs: 12, halo: 1 }) + T(392, ty - 36, '→ 操縦が重くなる', { c: C.rd, a: 'end', fs: 12, halo: 1 });
        return s;
      };
      let s = panel(86, 0, '中立', '水平尾翼全体（スタビレーター）が軸のまわりに動く') + panel(240, 10, '操縦輪を引いた（後ろの縁が上がる）', 'タブは同じ向きに、もっと大きく動く');
      s += `<rect x="12" y="300" width="376" height="30" rx="6" fill="${C.gr}" fill-opacity="0.1" stroke="${C.gr}"/>` + T(200, 320, 'トリムホイール（前席の間）でタブの位置を変え、力を消す', { c: C.gr, b: 1, fs: 12 });
      return svg(400, 338, s, '図：Archer の水平尾翼（スタビレーター）とアンチサーボタブ（横から見た模式図）。タブは尾翼の後ろの縁と同じ向きに動いて操縦を重くし、トリムの役目もします');
    },
    cockpitLayout() {
      // a schematic G1000-type Archer cockpit after the public POH's panel (Fig. 7-15 / 7-15A): most switches overhead; years and equipment differ
      let s = `<rect x="40" y="6" width="320" height="30" rx="6" fill="#141f30" stroke="${C.mut}"/>`;
      for (let i = 0; i < 5; i++) s += `<rect x="${50 + i * 12}" y="14" width="7" height="14" rx="2" fill="${C.mut}"/><rect x="${290 + i * 12}" y="14" width="7" height="14" rx="2" fill="${C.mut}"/>`;
      s += T(200, 26, '天井のスイッチパネル', { c: C.ink, b: 1, fs: 12 });
      s += `<rect x="170" y="42" width="60" height="20" rx="4" fill="#0b1422" stroke="${C.mut}"/>` + T(200, 56, 'コンパス', { c: C.ink, fs: 12 });
      s += `<rect x="8" y="68" width="384" height="112" rx="10" fill="#141f30" stroke="${C.mut}"/>`;
      const scr = (x, t, sub) => `<rect x="${x}" y="78" width="116" height="74" rx="6" fill="#06101c" stroke="${C.cy}" stroke-width="1.5"/>` + T(x + 58, 110, t, { c: C.cy, b: 1, fs: 14 }) + T(x + 58, 130, sub, { c: C.ink, fs: 12 });
      s += `<circle cx="32" cy="106" r="17" fill="#06101c" stroke="${C.am}" stroke-width="1.5"/>` + scr(56, 'PFD', '飛行の計器') + scr(226, 'MFD', '地図・エンジン');
      s += `<rect x="180" y="78" width="40" height="74" rx="4" fill="#06101c" stroke="${C.mut}"/>`;
      for (let i = 0; i < 4; i++) s += `<rect x="${186 + i * 8}" y="160" width="5" height="10" rx="1.5" fill="${C.mut}"/>`;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) s += `<circle cx="${356 + c * 11}" cy="${142 + r * 11}" r="3" fill="${C.mut}"/>`;
      s += L(32, 124, 32, 190, C.am, 1) + T(32, 202, '予備計器', { c: C.am, b: 1, fs: 12 }) + L(200, 152, 200, 190, C.mut, 1) + T(200, 202, 'オーディオパネル', { c: C.ink, fs: 12 }) + L(367, 170, 367, 190, C.mut, 1) + T(392, 202, 'ブレーカー', { c: C.ink, fs: 12, a: 'end' });
      for (const x of [70, 330]) s += `<path d="M${x - 32} 214 L${x - 32} 230 L${x + 32} 230 L${x + 32} 214" stroke="${C.ink}" stroke-width="5" fill="none" stroke-linecap="round"/><line x1="${x}" y1="230" x2="${x}" y2="244" stroke="${C.ink}" stroke-width="5"/>` + T(x, 262, '操縦輪', { c: C.mut, fs: 12 });
      s += `<rect x="176" y="212" width="48" height="58" rx="6" fill="#141f30" stroke="${C.mut}"/><circle cx="190" cy="230" r="7" fill="#2a2a2a" stroke="${C.mut}"/><circle cx="210" cy="230" r="7" fill="${C.rd}"/>`;
      s += `<rect x="230" y="222" width="12" height="16" rx="2" fill="${C.am}"/>` + TL(248, 228, ['キャブ', 'ヒート'], { c: C.am, a: 'start', fs: 12, lh: 15 });
      s += T(200, 288, '真ん中の台：スロットル（黒）・ミクスチャー（赤）', { c: C.ink, fs: 12 });
      s += `<rect x="168" y="300" width="26" height="9" rx="3" fill="${C.gr}"/><rect x="206" y="297" width="40" height="8" rx="3" fill="${C.gr}"/>` + T(200, 326, '前席の間の床：トリムホイール・フラップレバー', { c: C.gr, b: 1, fs: 12 });
      s += `<circle cx="22" cy="346" r="8" fill="none" stroke="${C.am}" stroke-width="2"/><line x1="22" y1="346" x2="17" y2="340" stroke="${C.am}" stroke-width="2"/>` + T(36, 351, '燃料セレクター（左の壁の下）', { c: C.am, b: 1, a: 'start', fs: 12 });
      s += T(392, 372, '模式図（年式・装備で違う）', { c: C.mut, a: 'end', fs: 12 });
      return svg(400, 380, s, '図：G1000 型の計器を付けた Archer の操縦席（模式図。公開されている POH の機体の例）。スターター・マスター・燃料ポンプ・マグネトー・灯火などのスイッチは天井のパネルにあります。年式や装備によって、スイッチや予備計器の形と位置は違います');
    },
    engineFlow() {
      // the carbureted O-360's air, fuel and ignition (a fuel-injected IO-360 has an injection system instead of the carburetor)
      let s = '';
      const box = (x, y, w, h, c, t, sub) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>` + T(x + w / 2, y + 19, t, { c, b: 1, fs: 13 }) + (sub ? TL(x + w / 2, y + 37, sub, { c: C.ink, fs: 12, lh: 15 }) : '');
      s += box(12, 14, 120, 34, C.cy, '外の空気') + A(72, 48, 72, 66, C.cy, 2);
      s += box(12, 66, 120, 34, C.cy, 'エアフィルター') + A(72, 100, 72, 118, C.cy, 2);
      s += box(12, 118, 120, 74, C.am, 'キャブレター', ['空気に燃料を', '混ぜる']) + A(132, 156, 162, 156, C.am, 2.5);
      s += T(72, 210, 'スロットル（黒）', { c: C.ink, fs: 12 }) + T(72, 226, 'ミクスチャー（赤）', { c: C.ink, fs: 12 });
      // the engine: 4 cylinders, 2 plugs each
      s += `<rect x="164" y="104" width="112" height="104" rx="10" fill="${PLANE2}" fill-opacity="0.25" stroke="${C.ink}"/>` + T(220, 98, 'シリンダー 4 つ', { c: C.ink, b: 1, fs: 13 });
      for (const [cx, cy] of [[192, 132], [248, 132], [192, 180], [248, 180]]) s += `<circle cx="${cx}" cy="${cy}" r="16" fill="#0b1422" stroke="${C.ink}"/><circle cx="${cx - 7}" cy="${cy}" r="3.5" fill="${C.cy}"/><circle cx="${cx + 7}" cy="${cy}" r="3.5" fill="${C.gr}"/>`;
      s += A(220, 208, 220, 236, C.mut, 2.5) + T(220, 252, '排気', { c: C.mut, b: 1, fs: 13 });
      // the magnetos, not connected to the battery
      s += `<rect x="290" y="96" width="102" height="120" rx="8" fill="none" stroke="${C.vi}" stroke-dasharray="5 4"/>`;
      s += box(298, 108, 86, 34, C.cy, '左マグネトー') + box(298, 156, 86, 34, C.gr, '右マグネトー');
      s += L(298, 125, 276, 125, C.cy, 1.5) + L(298, 173, 276, 173, C.gr, 1.5);
      s += TL(341, 232, ['バッテリーとは', 'つながっていない'], { c: C.vi, fs: 12, lh: 15 });
      s += T(12, 276, '● 点火プラグ：各シリンダーに 2 本（左右のマグネトーから別々に）', { c: C.ink, a: 'start', fs: 12 }) + T(12, 294, '燃料噴射式（IO-360）は、キャブレターの代わりに噴射装置', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 304, s, '図：キャブレター式のエンジン（O-360）の空気・燃料・点火の流れ（模式図）。点火はエンジンが回して発電するマグネトーで行い、左右 2 系統あります。電気系統が止まってもエンジンは止まりません');
    },
    carbIce() {
      // a float-type carburetor: the air speeds up in the venturi, the pressure falls and the fuel evaporates — the
      // temperature can drop as much as 60–70 °F (PHAK 25C ch. 7), so ice forms near the venturi and the throttle valve
      let s = `<path d="M150 300 L150 210 Q150 186 170 180 L170 150 Q150 144 150 120 L150 20 L250 20 L250 120 Q250 144 230 150 L230 180 Q250 186 250 210 L250 300" fill="#13233a" stroke="${C.ink}" stroke-width="2"/>`;
      s += A(200, 296, 200, 236, C.cy, 3) + T(200, 316, '外の空気（下から入る）', { c: C.cy, b: 1, fs: 12 });
      s += `<rect x="60" y="150" width="70" height="70" rx="6" fill="#13233a" stroke="${C.ink}"/><rect x="62" y="186" width="66" height="32" fill="${C.bl}" fill-opacity="0.5"/>` + T(95, 142, '燃料室', { c: C.ink, fs: 12 });
      s += `<path d="M130 200 L182 200 L192 168" stroke="${C.am}" stroke-width="3" fill="none"/>` + `<circle cx="196" cy="160" r="4" fill="${C.am}"/><circle cx="204" cy="152" r="3" fill="${C.am}"/><circle cx="196" cy="146" r="2.5" fill="${C.am}"/>`;
      s += `<line x1="160" y1="96" x2="240" y2="84" stroke="${C.ink}" stroke-width="4"/>` + T(262, 82, 'スロットル弁', { c: C.ink, a: 'start', fs: 12 });
      for (const [x, y] of [[170, 160], [230, 160], [168, 100], [234, 92]]) s += `<path d="M${x - 8} ${y} q4 -10 8 0 q4 -10 8 0" fill="#dff4ff" stroke="#9fd0f0"/>`;
      s += T(262, 156, '氷（ベンチュリーの', { c: '#9fd0f0', b: 1, a: 'start', fs: 12 }) + T(262, 172, '　くびれと弁のまわり）', { c: '#9fd0f0', b: 1, a: 'start', fs: 12 });
      s += A(200, 30, 200, 4, C.gr, 2.5) + T(214, 14, 'エンジンへ', { c: C.gr, a: 'start', fs: 12 });
      s += T(8, 244, 'くびれ（ベンチュリー）：', { c: C.ink, a: 'start', fs: 12 }) + T(8, 260, '空気が速くなり', { c: C.ink, a: 'start', fs: 12 }) + T(8, 276, '圧力が下がる＋燃料の', { c: C.ink, a: 'start', fs: 12 }) + T(8, 292, '気化で温度が下がる', { c: C.ink, a: 'start', fs: 12 });
      s += T(262, 214, '温度は最大で', { c: C.am, a: 'start', fs: 12 }) + T(262, 230, '約 33〜39℃ 下がる', { c: C.am, b: 1, a: 'start', fs: 12 });
      return svg(400, 324, s, '図：キャブレターアイス（フロート式キャブレターの断面の模式図）。晴れていても、湿った空気ならキャブレターの中で氷ができ、空気の通り道が狭くなって出力が落ちます（PHAK 第 7 章）');
    },
    fuelSystem() {
      // the low-wing Archer: a tank in each wing, the selector (LEFT / RIGHT / OFF, no BOTH), the pumps
      const cap = ac('pa28').fuelCap;
      let s = `<path d="M10 40 L170 40 L170 76 L10 70 Z M390 40 L230 40 L230 76 L390 70 Z" fill="${PLANE}" fill-opacity="0.2" stroke="${C.mut}"/>`;
      s += `<rect x="40" y="46" width="110" height="22" rx="4" fill="${C.bl}" fill-opacity="0.55" stroke="${C.cy}"/><rect x="250" y="46" width="110" height="22" rx="4" fill="${C.bl}" fill-opacity="0.55" stroke="${C.cy}"/>`;
      s += T(95, 61, `左タンク ${cap} gal`, { c: C.ink, b: 1, fs: 12 }) + T(305, 61, `右タンク ${cap} gal`, { c: C.ink, b: 1, fs: 12 }) + T(200, 26, '低翼：タンクは翼の中（重力では送れない）', { c: C.mut, fs: 12 });
      s += P([[95, 68], [95, 116], [160, 116]], C.cy, 2.5) + P([[305, 68], [305, 116], [200, 116]], C.cy, 2.5);
      s += `<circle cx="180" cy="116" r="20" fill="#13233a" stroke="${C.am}" stroke-width="2"/>` + `<line x1="180" y1="116" x2="166" y2="104" stroke="${C.am}" stroke-width="3"/>` + T(214, 92, '燃料セレクター', { c: C.am, b: 1, a: 'start', fs: 12 }) + T(214, 108, 'LEFT・RIGHT・OFF（BOTH はない）', { c: C.am, a: 'start', fs: 12 });
      const step = (y, t, c, note) => A(180, y - 22, 180, y - 4, C.cy, 2.5) + `<rect x="96" y="${y - 4}" width="168" height="26" rx="6" fill="${c}" fill-opacity="0.12" stroke="${c}"/>` + T(180, y + 13, t, { c, b: 1, fs: 12 }) + (note ? T(270, y + 13, note, { c: C.mut, a: 'start', fs: 12 }) : '');
      s += step(158, 'ストレーナー（ろ過）', C.cy, '← 抜き取り検査') + step(206, '電動燃料ポンプ（補助）', C.gr, '← 離着陸で ON') + step(254, 'エンジン駆動の燃料ポンプ', C.ink, '') + step(302, 'キャブレター → エンジン', C.am, '');
      s += T(12, 146, 'タンクの下でも', { c: C.mut, a: 'start', fs: 12 }) + T(12, 162, '抜き取り検査', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 336, s, `図：Archer の燃料系統（模式図）。左右の翼のタンク（使える燃料は片側 ${cap} US gal：教材値）から、セレクターで選んだ側の燃料をポンプで送ります`);
    },
    elecSystem() {
      // what runs on electricity and what does not (the engine's ignition, the magnetic compass, the mechanical standby gauges)
      const box = (x, y, w, h, c, t, sub) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>` + T(x + w / 2, y + 18, t, { c, b: 1, fs: 13 }) + (sub ? T(x + w / 2, y + 35, sub, { c: C.ink, fs: 12 }) : '');
      let s = box(12, 14, 120, 44, C.gr, 'オルタネーター', 'エンジンが回す') + box(12, 74, 120, 44, C.am, 'バッテリー', '始動・非常用');
      s += A(132, 36, 150, 66, C.gr, 2) + A(132, 96, 150, 84, C.am, 2) + box(150, 50, 72, 50, C.cy, 'マスター', 'BATT・ALTR');
      s += A(222, 75, 236, 75, C.cy, 2.5) + `<rect x="238" y="20" width="14" height="184" rx="4" fill="${C.cy}" fill-opacity="0.5"/>` + T(245, 220, 'バス', { c: C.cy, b: 1, fs: 12 });
      const loads = ['PFD・MFD', '無線', '灯火', 'ピトーヒーター', '電動燃料ポンプ', 'スターター'];
      loads.forEach((t, i) => { const y = 32 + i * 30; s += L(252, y, 266, y, C.cy, 1.5) + `<rect x="266" y="${y - 7}" width="10" height="14" rx="2" fill="${C.mut}"/>` + T(282, y + 4, t, { c: C.ink, a: 'start', fs: 12 }); });
      s += T(392, 220, '■＝ブレーカー', { c: C.mut, a: 'end', fs: 12 });
      s += `<rect x="12" y="236" width="376" height="66" rx="8" fill="none" stroke="${C.vi}" stroke-dasharray="5 4"/>` + T(200, 256, '電気がなくても動くもの', { c: C.vi, b: 1, fs: 13 });
      s += T(200, 276, 'エンジンの点火（マグネトー）・磁気コンパス', { c: C.ink, fs: 12 }) + T(200, 294, '機械式の予備の速度計・高度計（付いている機体）', { c: C.ink, fs: 12 });
      s += box(12, 136, 120, 44, C.rd, '非常用バッテリー', 'EMERG BATT') + A(72, 180, 72, 194, C.rd, 2) + TL(72, 208, ['予備計器・PFD など', '（30 分以上）'], { c: C.rd, fs: 12, lh: 14 });
      return svg(400, 310, s, '図：Archer の電気系統（模式図）。オルタネーターとバッテリーの電気がマスタースイッチからバスへ行き、ブレーカーを通って各装置へ届きます。エンジンの点火は電気系統とは別です');
    },
    pitotStatic() {
      // the Archer's pitot-static mast under the left wing, the pipes to the air data computer and the mechanical standby gauges
      let s = `<path d="M10 36 L250 36 L250 50 L10 46 Z" fill="${PLANE}" fill-opacity="0.25" stroke="${C.mut}"/>` + T(130, 28, '左の主翼（下から見る）', { c: C.mut, fs: 12 });
      s += `<path d="M150 50 L150 78 L104 82 L104 74 L144 72 L144 50 Z" fill="${PLANE2}"/>` + `<circle cx="104" cy="78" r="3.5" fill="#000" stroke="${C.cy}" stroke-width="1.5"/><circle cx="128" cy="76" r="2" fill="#000" stroke="${C.am}"/><circle cx="134" cy="76" r="2" fill="#000" stroke="${C.am}"/>`;
      s += T(10, 110, 'ピトー管の穴（全圧）', { c: C.cy, b: 1, a: 'start', fs: 12 }) + A(60, 100, 100, 82, C.cy, 1.5) + T(196, 100, '静圧孔（静圧）', { c: C.am, b: 1, a: 'start', fs: 12 }) + A(194, 94, 136, 80, C.am, 1.5);
      s += P([[147, 80], [147, 140], [210, 140]], C.cy, 2.5) + P([[141, 80], [141, 156], [210, 156]], C.am, 2.5);
      s += `<rect x="212" y="124" width="70" height="46" rx="7" fill="${C.vi}" fill-opacity="0.15" stroke="${C.vi}"/>` + T(247, 145, 'ADC', { c: C.vi, b: 1, fs: 13 }) + T(247, 161, '計算機', { c: C.ink, fs: 12 });
      s += A(282, 147, 300, 147, C.vi, 2) + `<rect x="302" y="112" width="90" height="72" rx="6" fill="#06101c" stroke="${C.cy}"/>` + T(347, 132, 'PFD', { c: C.cy, b: 1, fs: 13 }) + TL(347, 150, ['速度・高度', '昇降率'], { c: C.ink, fs: 12, lh: 15 });
      s += P([[141, 156], [141, 214], [230, 214]], C.am, 2) + P([[147, 140], [120, 140], [120, 230], [230, 230]], C.cy, 2);
      s += `<rect x="232" y="200" width="160" height="42" rx="6" fill="${C.ink}" fill-opacity="0.06" stroke="${C.mut}"/>` + T(312, 218, '予備の速度計・高度計', { c: C.ink, b: 1, fs: 12 }) + T(312, 234, '（機械式の機体）', { c: C.mut, fs: 12 });
      s += T(12, 268, '速度計：全圧と静圧の差で決まる', { c: C.ink, a: 'start', fs: 12 }) + T(12, 286, '高度計・昇降計：静圧だけで決まる', { c: C.ink, a: 'start', fs: 12 }) + T(12, 304, 'ほかに：ピトーヒーター・排水口・機内の代替静圧', { c: C.mut, a: 'start', fs: 12 });
      s += L(20, 190, 44, 190, C.cy, 2.5) + T(50, 194, '全圧', { c: C.cy, a: 'start', fs: 12 }) + L(20, 208, 44, 208, C.am, 2.5) + T(50, 212, '静圧', { c: C.am, a: 'start', fs: 12 });
      return svg(400, 314, s, '図：Archer のピトー静圧系統（模式図）。左の主翼の下の 1 本の柱に、前向きのピトー管の穴と横向きの静圧孔があり、管で計算機（ADC）と予備の計器へつながります');
    },
    compassErrors() {
      // northern hemisphere: turning error (UNOS) and acceleration error (ANDS); the roll-out lead from PHAK (15° + half the latitude)
      const card = (cx, cy, hdg, show, title, sub, note, c) => {
        let s = T(cx, cy - 66, title, { c, b: 1, fs: 13 }) + TL(cx, cy - 48, sub, { c: C.ink, fs: 12, lh: 15 });
        s += `<circle cx="${cx}" cy="${cy}" r="34" fill="#06101c" stroke="${C.mut}" stroke-width="1.5"/>`;
        for (const [d, l] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) { const a = (d - show) * DEG; s += T(cx + 24 * Math.sin(a), cy - 24 * Math.cos(a) + 4, l, { c: d === 0 ? C.rd : C.ink, b: 1, fs: 12 }); }
        s += `<line x1="${cx}" y1="${cy - 36}" x2="${cx}" y2="${cy - 28}" stroke="${C.am}" stroke-width="3"/>`;
        return s + TL(cx, cy + 52, note, { c, fs: 12, lh: 15 });
      };
      let s = T(12, 18, '北半球の磁気コンパスの誤差', { c: C.ink, b: 1, a: 'start', fs: 13 });
      s += card(70, 110, 0, 330, '北へ向かう旋回', ['コンパスが', '遅れる'], ['手前で止める', '（約 30° 前）'], C.cy);
      s += card(200, 110, 180, 210, '南へ向かう旋回', ['コンパスが', '先回りする'], ['行き過ぎて', 'から止める'], C.am);
      s += card(330, 110, 90, 60, '東・西で加速', ['北へ振れる'], ['減速すると', '南へ振れる'], C.gr);
      s += `<rect x="12" y="204" width="376" height="48" rx="6" fill="${C.cy}" fill-opacity="0.08" stroke="${C.cy}"/>` + T(200, 224, 'UNOS：北は手前、南は行き過ぎ', { c: C.cy, b: 1, fs: 12 }) + T(200, 242, 'ANDS：加速で北、減速で南', { c: C.gr, b: 1, fs: 12 });
      s += T(200, 272, 'どれだけ手前か：15° ＋ 緯度の半分（PHAK）。北緯 29° なら約 30°', { c: C.ink, fs: 12 });
      return svg(400, 282, s, '図：磁気コンパスの誤差（北半球）。旋回すると、北へ向かうときは遅れ、南へ向かうときは先回りします。東・西向きで速度を変えると北や南へ振れます。正しく読めるのは、まっすぐ・水平・一定の速度のときだけです');
    },
    positionLights() {
      // position lights: red on the left wingtip, green on the right, white on the tail; what another airplane's lights tell
      let s = planeTop(110, 120, 1.1) + T(110, 22, '上から見た図', { c: C.ink, b: 1, fs: 13 });
      const sector = (x, y, a0, a1, c) => { const r = 60, p = a => [x + r * Math.sin(a * DEG), y - r * Math.cos(a * DEG)], [x0, y0] = p(a0), [x1, y1] = p(a1); return `<path d="M${x} ${y} L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${c}" fill-opacity="0.18"/>`; };
      s = sector(35, 116, -110, 0, C.rd) + sector(185, 116, 0, 110, C.gr) + sector(110, 172, 110, 250, '#f2f2f2') + s;
      s += `<circle cx="35" cy="116" r="6" fill="${C.rd}"/><circle cx="185" cy="116" r="6" fill="${C.gr}"/><circle cx="110" cy="172" r="5" fill="#f2f2f2"/>`;
      s += T(30, 98, '左＝赤', { c: C.rd, b: 1, fs: 12 }) + T(190, 98, '右＝緑', { c: C.gr, b: 1, fs: 12 }) + T(110, 214, '尾＝白', { c: C.ink, b: 1, fs: 12 });
      const see = (y, l, r, t, c) => `<circle cx="252" cy="${y}" r="7" fill="${l}"/><circle cx="292" cy="${y}" r="7" fill="${r}"/>` + T(306, y - 2, t[0], { c, b: 1, a: 'start', fs: 12 }) + T(306, y + 14, t[1], { c: C.ink, a: 'start', fs: 12 });
      s += T(252, 46, '夜、相手の灯火が', { c: C.ink, b: 1, a: 'start', fs: 12 }) + T(252, 62, 'こう見えたら', { c: C.ink, b: 1, a: 'start', fs: 12 });
      s += see(96, C.rd, C.gr, ['左に赤・右に緑', '同じ向きへ'], C.ink) + see(140, C.gr, C.rd, ['左に緑・右に赤', 'こちらへ来る！'], C.rd) + `<circle cx="272" cy="184" r="7" fill="#f2f2f2"/>` + T(306, 182, '白だけ', { c: C.ink, b: 1, a: 'start', fs: 12 }) + T(306, 198, '遠ざかっている', { c: C.ink, a: 'start', fs: 12 });
      s += T(200, 238, '衝突防止灯（ビーコン・ストロボ）は、付いていれば', { c: C.am, fs: 12 }) + T(200, 254, 'いつも点灯（14 CFR 91.209）', { c: C.am, fs: 12 });
      return svg(400, 264, s, '図：航空灯（左の翼端が赤、右の翼端が緑、尾が白）。相手の灯火の見え方で、相手の向きがわかります（AFH 第 11 章）');
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
