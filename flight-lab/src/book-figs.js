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
    windTriangle() {
      // the wind triangle drawn to scale for the wca calculator's default case (true course 090°, TAS 105 kt, wind 030° / 15 kt), and
      // the chain from true course to compass heading with the course's variation (MAGVAR_W) and an example deviation of +2°
      const tc = 90, tas = 105, wd = 30, ws = 15, dev = 2, VAR = FL.physics.MAGVAR_W, a = (wd - tc) * DEG, wca = Math.asin(ws * Math.sin(a) / tas) / DEG, gs = tas * Math.cos(wca * DEG) - ws * Math.cos(a);
      const th = tc + wca, k = 2.6, O = [36, 128], dir = h => [Math.sin(h * DEG), -Math.cos(h * DEG)];
      const H = [O[0] + tas * k * dir(th)[0], O[1] + tas * k * dir(th)[1]], G = [H[0] + ws * k * dir(wd + 180)[0], H[1] + ws * k * dir(wd + 180)[1]];
      let s = A(O[0], O[1], H[0], H[1], C.cy, 3) + A(H[0], H[1], G[0], G[1], C.am, 3) + A(O[0], O[1], G[0], G[1], C.gr, 3);
      s += T(170, 84, `真対気速度 ${tas} kt・真針路 ${String(Math.round(th)).padStart(3, '0')}°`, { c: C.cy, b: 1, fs: 12, halo: 1 });
      s += TL(H[0] + 8, H[1] + 4, ['風', `${String(wd).padStart(3, '0')}°/${ws} kt`], { c: C.am, b: 1, a: 'start', fs: 12, lh: 15 });
      s += T(150, O[1] + 22, `対地速度 ${Math.round(gs)} kt・真航路 ${String(tc).padStart(3, '0')}°`, { c: C.gr, b: 1, fs: 12 });
      s += `<path d="M ${O[0] + 120} ${O[1]} A 120 120 0 0 0 ${(O[0] + 120 * dir(th)[0]).toFixed(1)} ${(O[1] + 120 * dir(th)[1]).toFixed(1)}" stroke="${C.rd}" stroke-width="2.5" fill="none"/>` + L(O[0] + 120, O[1] - 7, O[0] + 112, O[1] + 30, C.rd, 1);
      s += T(O[0], O[1] + 44, `偏流修正角 ${Math.round(Math.abs(wca))}°（機首を風上の左へ）`, { c: C.rd, b: 1, a: 'start', fs: 12, halo: 1 });
      s += A(380, 62, 380, 30, C.mut, 2) + T(380, 76, '北', { c: C.mut, fs: 12 });
      // the chain: true course → true heading → magnetic heading → compass heading
      const vals = [['真航路 TC', tc], ['真針路 TH', th], ['磁針路 MH', th + VAR], ['コンパス針路', th + VAR + dev]], steps = [`風 −${Math.round(Math.abs(wca))}°`, `西偏 ＋${VAR}°`, `自差 ＋${dev}°`];
      vals.forEach(([n, v], i) => { const x = 4 + i * 100; s += `<rect x="${x}" y="182" width="86" height="50" rx="8" fill="${C.cy}" fill-opacity="0.1" stroke="${C.cy}"/>` + T(x + 43, 202, n, { c: C.ink, fs: 12 }) + T(x + 43, 222, `${String(Math.round(v)).padStart(3, '0')}°`, { c: C.ink, b: 1, fs: 14 }); if (i < 3) s += A(x + 88, 207, x + 102, 207, C.ink, 2) + T(x + 93, 250, steps[i], { c: C.am, b: 1, fs: 12 }); });
      s += T(200, 276, `磁航路 MC ＝ 真航路 ＋ 西偏 ＝ ${String(tc + VAR).padStart(3, '0')}°（VFR の巡航高度の規則に使う）`, { c: C.mut, fs: 12 });
      return svg(400, 288, s, `図：風の三角形（真航路 ${String(tc).padStart(3, '0')}°・真対気速度 ${tas} kt・風 ${String(wd).padStart(3, '0')}°/${ws} kt の例を縮尺どおりに描いたもの）と、真航路からコンパス針路までの計算の順番。偏差の ${VAR}°W はこの教材の値、自差の ＋${dev}° は例です`);
    },
    clouds() {
      // cloud levels (AWH Table 12-3, temperate regions) and the main cloud types; CB reaches through all levels
      const Y = ft => 250 - ft / 40000 * 220;
      let s = '';
      for (const v of [0, 10000, 20000, 30000, 40000]) s += L(44, Y(v), 300, Y(v), C.grid, 1) + T(40, Y(v) + 4, (v / 1000) + 'k', { c: C.mut, fs: 12, a: 'end' });
      const bar = (x, a, b, c) => `<rect x="${x}" y="${Y(b)}" width="12" height="${Y(a) - Y(b)}" rx="3" fill="${c}" fill-opacity="0.55"/>`;
      s += bar(52, 0, 6500, C.gr) + bar(68, 6500, 23000, C.cy) + bar(84, 16500, 40000, C.vi);
      const name = (y, t, c) => T(108, y, t, { c, a: 'start', fs: 12 });
      s += name(Y(33000), '巻雲（CI）・巻層雲（CS）', C.vi) + name(Y(29000), '巻積雲（CC）', C.vi);
      s += name(Y(15000), '高積雲（AC）・高層雲（AS）', C.cy) + name(Y(11000), '乱層雲（NS）：雨や雪を降らせる厚い雲', C.cy);
      s += name(Y(5200), '層積雲（SC）・積雲（CU）', C.gr) + name(Y(1700), '層雲（ST）', C.gr);
      s += `<path d="M318 ${Y(1500)} Q 312 ${Y(9000)} 330 ${Y(15000)} Q 326 ${Y(26000)} 340 ${Y(33000)} L312 ${Y(36500)} L398 ${Y(37500)} L372 ${Y(33000)} Q 384 ${Y(24000)} 376 ${Y(14000)} Q 392 ${Y(7000)} 382 ${Y(1500)} Z" fill="${C.rd}" fill-opacity="0.22" stroke="${C.rd}"/>`;
      s += TL(350, Y(20000), ['積乱雲', '（CB）'], { c: C.rd, b: 1, fs: 12, lh: 15 }) + T(350, Y(0) + 16, '雷雨', { c: C.rd, fs: 12 });
      s += `<rect x="52" y="266" width="10" height="10" fill="${C.gr}" fill-opacity="0.55"/>` + T(66, 275, '下層 0〜6,500 ft', { c: C.ink, a: 'start', fs: 12 }) + `<rect x="190" y="266" width="10" height="10" fill="${C.cy}" fill-opacity="0.55"/>` + T(204, 275, '中層 6,500〜23,000 ft', { c: C.ink, a: 'start', fs: 12 });
      s += `<rect x="52" y="284" width="10" height="10" fill="${C.vi}" fill-opacity="0.55"/>` + T(66, 293, '上層 16,500〜40,000 ft（温帯の目安・AWH）', { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 302, s, '図：雲の高さの目安（地上からの雲の底の高さ）と主な雲。積乱雲（CB）は下層から上層までのびます。METAR では、雲の種類のうち CB と TCU（そびえ立つ積雲）だけが書かれます');
    },
    seaBreeze() {
      // a west–east cross-section of the Florida peninsula: sea breezes from both coasts meet inland and lift the air (AWH 10.6.1)
      let s = `<rect x="0" y="190" width="90" height="26" fill="#1d4a7a"/><rect x="310" y="190" width="90" height="26" fill="#1d4a7a"/><rect x="90" y="190" width="220" height="26" fill="#3a3326"/>`;
      s += T(45, 236, 'メキシコ湾（西）', { c: C.cy, fs: 12 }) + T(355, 236, '大西洋（東）', { c: C.cy, fs: 12 }) + T(200, 236, '陸（オーランドなど内陸）', { c: C.ink, fs: 12 });
      s += A(40, 176, 170, 176, C.cy, 3) + A(360, 176, 230, 176, C.cy, 3) + T(105, 166, '海風', { c: C.cy, b: 1, fs: 12 }) + T(295, 166, '海風', { c: C.cy, b: 1, fs: 12 });
      s += A(200, 170, 200, 92, C.am, 3) + T(214, 150, '上昇', { c: C.am, b: 1, a: 'start', fs: 12 });
      s += `<path d="M150 96 Q 146 70 166 62 Q 164 34 186 28 L176 20 L232 18 L226 28 Q 248 36 244 62 Q 258 74 250 96 Z" fill="#dfe6ee" fill-opacity="0.85"/>`;
      s += A(150, 40, 60, 60, C.mut, 1.8) + A(250, 40, 340, 60, C.mut, 1.8) + L(50, 66, 50, 150, C.mut, 1.5, '4 3') + L(350, 66, 350, 150, C.mut, 1.5, '4 3');
      s += T(200, 120, '昼前〜午後に積乱雲', { c: C.rd, b: 1, fs: 12, halo: 1 });
      s += T(200, 260, '晴れた夏の日：陸が先に温まり、両側の海から海風が入る', { c: C.ink, fs: 12 });
      return svg(400, 270, s, '図：フロリダ半島の東西の断面（模式図）。夏の晴れた日、両側の海から来た海風が内陸でぶつかり、空気が持ち上げられて、昼前から午後に雷雨が発達しやすくなります（AWH 10.6.1）');
    },
    atm() {
      // the International Standard Atmosphere: temperature against height, with the ISA pressure at a few heights (computed)
      const W = 400, H = 260, f = frame(W, H, -60, 20, 0, 40, [-60, -40, -20, 0, 20], [0, 10, 20, 30, 40], '気温（℃）', '高度（1,000 ft）');
      const isaT = k => k < 36.089 ? 15 - 1.98 * k : -56.5, isaP = k => 29.92 * Math.pow(1 - 6.8756e-6 * k * 1000, 5.2559);
      let s = f.s + P([[f.X(15), f.Y(0)], [f.X(-56.5), f.Y(36.089)], [f.X(-56.5), f.Y(40)]], C.cy, 2.5);
      for (const [k, lab] of [[0, '海面'], [5, '5,000 ft'], [10, '10,000 ft'], [18, '18,000 ft']]) {
        const x = f.X(isaT(k)), y = f.Y(k);
        s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${C.cy}"/>` + T(x - 8, y - (k ? 0 : 6), `${lab}：${String(Math.round(isaT(k))).replace('-', '−')}℃・${isaP(k).toFixed(k ? 1 : 2)} inHg`, { c: C.ink, a: 'end', fs: 12, halo: 1 });
      }
      s += L(f.X(-60), f.Y(36.089), f.X(20), f.Y(36.089), C.am, 1, '4 3') + T(f.X(-50), f.Y(36.089) - 6, '対流圏界面（約 36,000 ft）：−56.5℃', { c: C.am, a: 'start', fs: 12, halo: 1 });
      s += T(210, 62, '気温：1,000 ft で約 2℃ 下がる', { c: C.cy, a: 'start', fs: 12, halo: 1 }) + TL(210, 80, ['気圧：低い所では 1,000 ft で', '約 1 inHg 下がる'], { c: C.mut, a: 'start', fs: 12, halo: 1, lh: 16 });
      return svg(W, H, s, '図：国際標準大気（ISA）。海面で 15℃・29.92 inHg（1013.25 hPa）。上へ行くほど気温も気圧も下がります（数値は ISA の式で計算）');
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
      // a schematic cross-section of US airspace for an airport near sea level (heights are typical; each area is drawn on the charts)
      const W = 400, g = 252, y = ft => ft <= 4000 ? g - ft / 1000 * 20 : ft <= 10000 ? g - 80 - (ft - 4000) / 1000 * 10 : ft <= 18000 ? g - 140 - (ft - 10000) / 1000 * 7.5 : g - 200 - 22;
      let s = `<rect x="0" y="${y(60000)}" width="${W}" height="${y(18000) - y(60000)}" fill="${C.vi}" fill-opacity="0.2"/>` + T(200, y(18000) - 8, 'Class A：18,000 ft MSL〜FL600（IFR だけ）', { c: C.ink, b: 1, fs: 12 });
      s += `<rect x="0" y="${y(18000)}" width="${W}" height="${y(1200) - y(18000)}" fill="${C.gr}" fill-opacity="0.08"/>` + T(392, y(16000), 'Class E（管制空域）', { c: C.gr, b: 1, a: 'end', fs: 12 });
      s += L(0, y(14500), W, y(14500), C.gr, 1, '5 4') + T(392, y(14500) + 14, '14,500 ft MSL から上は E', { c: C.gr, a: 'end', fs: 12 });
      s += `<rect x="0" y="${y(1200)}" width="${W}" height="${g - y(1200)}" fill="${C.am}" fill-opacity="0.12"/>` + T(135, g - 6, 'Class G', { c: C.am, b: 1, fs: 12 });
      const B = [[170, 230, 0], [140, 260, 3000], [110, 290, 6000]];
      let pb = `M${B[2][0]} ${y(10000)} L${B[2][1]} ${y(10000)}`;
      pb += ` L${B[2][1]} ${y(6000)} L${B[1][1]} ${y(6000)} L${B[1][1]} ${y(3000)} L${B[0][1]} ${y(3000)} L${B[0][1]} ${g} L${B[0][0]} ${g} L${B[0][0]} ${y(3000)} L${B[1][0]} ${y(3000)} L${B[1][0]} ${y(6000)} L${B[2][0]} ${y(6000)} Z`;
      s += `<path d="${pb}" fill="${C.bl}" fill-opacity="0.3" stroke="${C.bl}" stroke-width="1.5"/>` + T(200, y(8000), 'Class B', { c: C.ink, b: 1, fs: 13 }) + T(200, y(8000) + 16, '許可が要る', { c: C.ink, fs: 12 });
      s += `<path d="M330 ${y(4000)} L392 ${y(4000)} L392 ${y(1200)} L374 ${y(1200)} L374 ${g} L348 ${g} L348 ${y(1200)} L330 ${y(1200)} Z" fill="${C.rd}" fill-opacity="0.22" stroke="${C.rd}" stroke-width="1.5"/>` + T(361, y(4000) - 20, 'Class C', { c: C.ink, b: 1, fs: 12 }) + T(361, y(4000) - 6, '交信の確立', { c: C.ink, fs: 12 });
      s += `<rect x="56" y="${y(2500)}" width="44" height="${g - y(2500)}" fill="${C.cy}" fill-opacity="0.18" stroke="${C.cy}" stroke-dasharray="4 3"/>` + T(78, y(2500) - 20, 'Class D', { c: C.ink, b: 1, fs: 12 }) + T(78, y(2500) - 6, '交信の確立', { c: C.ink, fs: 12 });
      for (const [ft, t] of [[2500, '2,500'], [4000, '4,000'], [10000, '10,000'], [18000, '18,000']]) s += T(4, y(ft) + 4, t, { c: C.mut, fs: 12, a: 'start', halo: 1 });
      s += L(0, g, W, g, C.mut, 1.5) + T(200, g + 18, '模式図・NOT FOR NAVIGATION（高さの目盛りは一様でない）', { c: C.mut, fs: 12 });
      return svg(W, 278, s, '図：米国の空域の断面（模式図・高さは代表例）。目盛りは MSL で、Class C・D の高さ（2,500・4,000 ft）は空港の標高からの高さです（図は標高 0 ft の空港の例）。Class G は多くの場所で地上 1,200 ft（空港の近くでは 700 ft）より下です。Class B は許可、Class C・D は入る前に双方向の無線交信の確立が必要です（14 CFR 91.129〜91.131、AIM 3-2）');
    },
    vmcFactors() {
      return table(['条件と要因（旧 14 CFR 23.149 で Vmc を決めた条件と、Vmc を変える要因）', 'Vmc への影響', '理由'], [
        ['生きているエンジンが最大出力', '高くなる', '非対称の推力が最大'], ['止まった側のプロペラが風車状態（フェザーしていない）', '高くなる', '止まった側の抗力が大きい'],
        ['重心が後方（後方の限界）', '高くなる', '重心からラダーまでの腕が短くなる'], ['重量が軽い', '高くなる', 'バンクしたときの揚力の横向きの助けが小さい'],
        ['脚 UP', '高くなる', '脚の「竜骨」のような安定の助けがない'], ['フラップは離陸の位置', '決める条件の 1 つ', '機体によって影響が違う'],
        ['生きている側へバンク（5° まで）', '低くなる', '揚力の横向きの成分がラダーの横向きの力とつり合い、ラダーを助ける（横滑りが減る）。翼を水平にすると、1° あたり 3 kt 以上、20 kt 近く高くなることがある'],
        ['密度高度が高い（高い所・暑い日）', '低くなる（自然吸気のエンジン）', '出力が減る（ただし失速速度に近づく）']])
        + '<p class="bk-src">出典：FAA Airplane Flying Handbook（FAA-H-8083-3C）第 13 章。今の 14 CFR 23.2135(c) は性能基準の書き方で、表の条件は旧 23.149 のもの。重量と密度高度は認証の条件ではなく、Vmc を変える要因（古い規則では、Vmc を決める重量は決められていなかった）。数値・条件は機体の AFM が優先。</p>';
    },
    scan() {
      // a G1000-type PFD (speed tape left, attitude centre, altitude tape and vertical speed right, HSI below with the turn-rate trend
      // above it; engine rpm on the MFD. The course's display in avionics.js has the same tapes and HSI but no turn-rate trend, and it
      // also shows rpm at the PFD's lower left) and the radial cross-check of
      // IFH chapter 6: out from the attitude indicator to one instrument and back. Green = control instruments, cyan = performance
      const box = (x, y, w, h, c, lab, sub) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${C.bg}" stroke="${c}" stroke-width="2"/>` + T(x + w / 2, y + 18, lab, { c, b: 1, fs: 12 }) + (sub ? T(x + w / 2, y + 36, sub, { c: C.ink, fs: 12 }) : '');
      let s = `<rect x="6" y="6" width="388" height="306" rx="10" fill="#070d16" stroke="${C.grid}"/>`;
      // the attitude indicator: sky, ground, horizon, the yellow airplane symbol
      s += `<rect x="78" y="18" width="244" height="164" fill="#1d3550"/><rect x="78" y="104" width="244" height="78" fill="#4a3a26"/>` + L(78, 104, 322, 104, C.ink, 2);
      s += `<path d="M150 100 L186 100 L190 106 L150 106 Z M250 100 L214 100 L210 106 L250 106 Z M200 100 L186 112 L200 106 L214 112 Z" fill="#ffd400" stroke="#000"/>`;
      s += `<rect x="78" y="18" width="244" height="164" fill="none" stroke="${C.gr}" stroke-width="2.5"/>` + T(200, 38, '姿勢（いちばん大事）', { c: C.gr, b: 1, fs: 12, halo: 1 });
      s += box(18, 40, 52, 120, C.cy, '速度', '100') + box(330, 40, 46, 120, C.cy, '高度', '3000') + `<rect x="378" y="60" width="10" height="80" fill="${C.bg}" stroke="${C.cy}" stroke-width="1.5"/>` + T(383, 172, '昇降', { c: C.cy, b: 1, fs: 12 });
      // the HSI and the turn-rate trend (magenta) above it
      s += `<circle cx="200" cy="250" r="50" fill="${C.bg}" stroke="${C.cy}" stroke-width="2"/>` + T(200, 255, '方位（HSI）', { c: C.cy, b: 1, fs: 12 });
      s += `<path d="M 200 200 A 50 50 0 0 1 228 208" stroke="#ff4fd8" stroke-width="4" fill="none"/>` + T(238, 204, '旋回率', { c: '#ff4fd8', b: 1, a: 'start', fs: 12 });
      // power: the engine rpm on the MFD
      s += box(296, 236, 88, 50, C.gr, '出力（回転計）', 'MFD に表示');
      // the radial scan
      for (const [x, y] of [[72, 100], [328, 100], [377, 128], [200, 198], [294, 252]]) { const d = Math.hypot(x - 200, y - 112), ux = (x - 200) / d, uy = (y - 112) / d; s += A(200 + ux * 30, 112 + uy * 30, x - ux * 3, y - uy * 3, C.am, 2); }
      s += TL(8, 334, ['緑＝操作の計器（姿勢・出力）：これで飛行機を動かす', '水色＝性能の計器（速度・高度・昇降・方位・旋回率）：結果を確かめる', '橙の矢印：姿勢 → 1 つの計器 → 姿勢 → 次の計器 …'], { c: C.ink, a: 'start', fs: 12, lh: 17 });
      return svg(400, 386, s, '図：G1000 型 PFD の配置（模式図）と、放射状のクロスチェック（IFH 第 6 章）。中央の姿勢表示から各計器へ目を動かし、いつも姿勢に戻ります。出力（回転計）は、実機の G1000 型では MFD に出ます');
    },
    tem() {
      // the TEM framework as ICAO Doc 9683 (Part 2, chapter 2: 2.3.15 errors, 2.3.16 undesired aircraft states, 2.4.1 most flights
      // end safely) and SKYbrary define it: threats and errors are managed most of the time and lead nowhere; an unmanaged error can
      // become an undesired aircraft state (UAS), which can still be recovered. On the left, the three defences (avoid, trap, mitigate)
      let s = '';
      const box = (x, y, w, h, c, title, lines) => BOX(x, y, w, h, c, title, lines, { fs: 13, ty: 19, ly: 37 });
      s += BOX(136, 8, 112, 70, C.am, '脅威（Threat）', ['天気・混雑・管制の', '変更・機体の不具合'], { fs: 13, ty: 19, ly: 37, lfs: 12 });
      s += BOX(280, 8, 112, 70, C.rd, 'エラー（Error）', ['操作・手順・交信の', '誤り'], { fs: 13, ty: 19, ly: 37, lfs: 12 });
      // a threat can lead to an error
      s += A(250, 43, 278, 43, C.ink, 2);
      // managed → no consequence (from both boxes)
      s += A(192, 80, 192, 108, C.ink, 2) + A(300, 80, 300, 108, C.ink, 2) + T(246, 98, '管理する', { c: C.ink, fs: 12 });
      s += BOX(136, 110, 180, 50, C.gr, '管理できた → 影響なし', ['ほとんどの飛行はここで終わる'], { fs: 13, ty: 19, ly: 37, lfs: 12 });
      // not managed → UAS (beside the managed branch, not through it)
      s += A(360, 80, 360, 188, C.ink, 2) + T(352, 180, '管理できなかった', { c: C.ink, fs: 12, a: 'end' });
      s += box(136, 190, 256, 70, C.vi, '望ましくない機体の状態（UAS）', ['速度・高度・針路のずれ・誤った形態・', '不安定な進入']);
      s += A(204, 262, 204, 286, C.gr, 2) + A(324, 262, 324, 286, C.rd, 2) + T(198, 280, '立て直す', { c: C.gr, fs: 12, a: 'end' }) + T(330, 280, 'できない', { c: C.rd, fs: 12, a: 'start' });
      s += box(136, 288, 124, 36, C.gr, '安全な状態へ', []) + box(268, 288, 124, 36, C.rd, '事故・インシデント', []);
      // the three defences
      const d = [[8, '防ぐ（avoid）', ['ブリーフィング', '計画・準備']], [118, '見つける（trap）', ['モニター', 'クロスチェック', 'コール']], [228, '小さくする', ['（mitigate）', '立て直す・', 'ゴーアラウンド']]];
      d.forEach(([y, t, l]) => { s += BOX(6, y, 122, y === 228 ? 96 : 102, C.cy, t, l, { fs: 12, ty: 19, ly: 38, lfs: 12 }); });
      s += T(200, 346, '乗員の対策（countermeasures）：防ぐ・見つける・小さくする', { c: C.cy, b: 1, fs: 12 });
      return svg(400, 356, s, '図：TEM（脅威とエラーの管理）の考え方。脅威とエラーは、ほとんどの場合管理されて何も起きません。管理しそこねたエラーが、望ましくない機体の状態（UAS）になることがあり、そこから立て直します（ICAO Doc 9683・SKYbrary にもとづく模式図）');
    },
    standardRate() {
      // the bank for a standard-rate turn (3°/s): tan φ = 3 · V / 1091 (V true airspeed in kt), and the two rules of thumb in the IFH
      return table(['真対気速度', '標準旋回（3°/秒）のバンク（計算）', '目安①「速度 ÷ 10 ＋ 7」（IFH 第 4 章）', '目安②「速度の 15%」（IFH 第 7 章）'], [70, 90, 100, 120, 150].map(v => [`${v} kt`, `${(Math.atan(3 * v / 1091) / DEG).toFixed(0)}°`, `${Math.round(v / 10 + 7)}°`, `${Math.round(v * 0.15)}°`]));
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
    // ---------------------------------------------------------------- 第 4 章 perf（性能と重量・重心）
    densityAltitude() {
      // the same field (LAB, 55 ft, altimeter 29.92) on four days: the density altitude by the book's rule of thumb, the model's climb at that density
      const P = FL.physics, s = P.newState({ aircraft: 'pa28' }), vy = ac('pa28').v.y, elev = P.GROUND_FT, isa = 15 - 2 * elev / 1000;
      const rows = [15, 25, 33, 38].map(t => { const da = elev + 120 * (t - isa); return { t, da, fpm: P.steadyState(s, vy, null, { pwr: 'full', altFt: Math.max(da, 0) }).fpm }; });
      const X = ft => 96 + ft / 3000 * 160, r100 = v => (Math.round(v / 100) * 100).toLocaleString(), r10 = v => Math.round(v / 10) * 10;
      let s0 = T(12, 20, `同じ LAB（標高 ${elev} ft・高度計 29.92）で`, { c: C.ink, b: 1, a: 'start', fs: 13 });
      s0 += T(96, 44, '密度高度', { c: C.am, b: 1, a: 'start', fs: 12 }) + T(392, 44, '上昇率（fpm）', { c: C.cy, b: 1, a: 'end', fs: 12 });
      for (const v of [0, 1000, 2000, 3000]) s0 += L(X(v), 52, X(v), 238, C.grid, 1) + T(X(v), 254, v.toLocaleString(), { c: C.mut, fs: 12 });
      rows.forEach((r, i) => {
        const y = 62 + i * 44, w = Math.max(X(r.da) - X(0), 3), hot = r.t >= 33;
        s0 += T(12, y + 21, `気温 ${r.t}℃`, { c: hot ? C.rd : C.ink, b: 1, a: 'start', fs: 12 }) + `<rect x="${X(0)}" y="${y + 6}" width="${w.toFixed(1)}" height="22" rx="4" fill="${C.am}" fill-opacity="${0.25 + i * 0.18}"/>`;
        s0 += T(X(0) + w + 6, y + 22, `約 ${r100(r.da)} ft`, { c: C.ink, a: 'start', fs: 12 }) + T(392, y + 22, `約 ${r10(r.fpm)}`, { c: C.cy, a: 'end', fs: 12 });
      });
      s0 += T(196, 272, '密度高度（ft）＝空気の濃さが同じになる標準大気の高さ', { c: C.mut, fs: 12 });
      return svg(400, 284, s0, `図：暑い日ほど空気が薄く、密度高度が高くなり、上昇率が下がります。密度高度は本書の概算式、上昇率は教材モデル（${Math.round(s.AC.mass * 2.20462).toLocaleString()} lb・全開・Vy ${vy} KIAS）の計算値です`);
    },
    takeoffDistance() {
      // LAB RWY 36 drawn to scale along the ground (heights exaggerated); the published distance over a 50 ft obstacle; the midpoint check of AIM 7-6-8
      const len = Math.round(FL.physics.LAB_RWY.len * 3.28084), over50 = 1608, X = ft => 20 + ft / len * 372, yG = 176;
      let s = `<rect x="${X(0)}" y="${yG}" width="${X(len) - X(0)}" height="10" fill="#3a4656"/>` + L(X(0), yG + 5, X(len), yG + 5, '#f2f2f2', 1.5, '10 8');
      s += T(X(len / 2), yG + 30, `LAB RWY 36：${len.toLocaleString()} ft（${FL.physics.LAB_RWY.len.toLocaleString()} m）`, { c: C.ink, b: 1, fs: 12 });
      const lo = over50 * 0.66, xl = X(lo), xo = X(over50);
      s += A(X(0) + 4, yG - 8, xl - 2, yG - 8, C.am, 3) + T((X(0) + xl) / 2, yG - 16, '地上滑走', { c: C.am, b: 1, fs: 12 });
      s += `<path d="M${xl} ${yG - 6} Q ${(xl + xo) / 2 + 10} ${yG - 8} ${xo} ${yG - 54} L ${xo + 12} ${yG - 62}" stroke="${C.cy}" stroke-width="3" fill="none"/>` + planeSide(xo + 19, yG - 67, 0.26, { pitch: 28 });
      s += `<rect x="${xo - 3}" y="${yG - 50}" width="6" height="50" fill="${C.rd}"/>` + T(xo - 8, yG - 58, '50 ft の障害物', { c: C.rd, a: 'end', fs: 12 });
      s += L(X(0), 66, X(0), yG, C.mut, 1, '3 3') + L(xo, 66, xo, yG - 50, C.mut, 1, '3 3') + A(X(0) + 2, 72, xo - 2, 72, C.cy, 2) + A(xo - 2, 72, X(0) + 2, 72, C.cy, 2);
      s += T((X(0) + xo) / 2, 64, `約 ${over50.toLocaleString()} ft（公開値の例）`, { c: C.cy, b: 1, fs: 12 });
      const xm = X(len / 2);
      s += L(xm, 82, xm, yG + 12, C.vi, 2, '6 4') + TL(xm + 6, 92, ['中間点：浮揚速度の', '70% に届かなければ', '中止（浮くまでの目安）'], { c: C.vi, a: 'start', fs: 12 });
      s += T(12, 22, '離陸距離＝地上滑走＋50 ft の高さまで', { c: C.ink, b: 1, a: 'start', fs: 13 }) + T(12, 40, '（高さは強調して描いています）', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 218, s, `図：離陸距離の 2 つの数字と、滑走路の中間点での確かめ（AIM 7-6-8 の目安。浮くまでの距離だけを見るもので、障害物を越えられるかは別に考えます）。${over50.toLocaleString()} ft は Piper が公開している Archer TX の値で、実際の距離はその日の条件で POH の表から読みます`);
    },
    windEffect() {
      // takeoff distance against wind as a share of the lift-off speed: (1 − w)², which gives PHAK's −19 % / +21 % at 10 %
      const f = frame(400, 260, -30, 30, 0.4, 1.8, [-30, -20, -10, 0, 10, 20, 30], [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8], '風の強さ（浮揚速度に対する %）', '離陸距離（無風＝1）', { l: 50, r: 14, t: 34, b: 40 });
      const pts = []; for (let w = -30; w <= 30; w += 2) pts.push([f.X(w), f.Y((1 - w / 100) ** 2)]);
      let s = f.s + `<rect x="${f.X(-30)}" y="34" width="${f.X(0) - f.X(-30)}" height="${f.Y(0.4) - 34}" fill="${C.rd}" fill-opacity="0.07"/>` + L(f.X(0), 34, f.X(0), f.Y(0.4), C.mut, 1.5);
      s += T(f.X(-15), 26, '← 追い風', { c: C.rd, b: 1, fs: 12 }) + T(f.X(15), 26, '向かい風 →', { c: C.gr, b: 1, fs: 12 }) + P(pts, C.cy, 3);
      for (const [w, c, lab, dx, a] of [[-10, C.rd, '＋21%', 8, 'start'], [10, C.gr, '−19%', 8, 'start']]) { const y = f.Y((1 - w / 100) ** 2); s += `<circle cx="${f.X(w)}" cy="${y}" r="5" fill="${c}"/>` + T(f.X(w) + dx, y - 8, lab, { c, b: 1, fs: 13, a, halo: 1 }); }
      s += TL(f.X(0) + 8, f.Y(1.62), ['Archer の浮揚速度は約 60 kt', '10% は約 6 kt'], { c: C.ink, a: 'start', fs: 12, halo: 1 });
      return svg(400, 260, s, '図：風と離陸距離。浮揚速度の 10% の向かい風で約 19% 短く、10% の追い風で約 21% 長くなります（PHAK 第 11 章の数字。曲線はその数字に合う近似を描いた模式図）');
    },
    climbVxVy() {
      // one minute at full power from the same point: Vx and Vy in the teaching model (near sea level)
      const PH = FL.physics, s = PH.newState({ aircraft: 'pa28' }), V = ac('pa28').v, sig = PH.atmos(100 / PH.FT).sigma;
      const run = kt => { const fpm = PH.steadyState(s, kt, null, { pwr: 'full', altFt: 100 }).fpm, nm = kt / Math.sqrt(sig) / 60; return { kt, fpm, nm, perNm: fpm / nm }; };
      const x = run(V.x), y = run(V.y), r10 = v => Math.round(v / 10) * 10;
      const f = frame(400, 270, 0, 1.4, 0, 900, [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4], [0, 300, 600, 900], '進んだ距離（NM）', '高さ（ft）', { l: 50, r: 14, t: 16, b: 40 });
      let s0 = f.s + P([[f.X(0), f.Y(0)], [f.X(x.nm), f.Y(x.fpm)]], C.am, 3) + P([[f.X(0), f.Y(0)], [f.X(y.nm), f.Y(y.fpm)]], C.cy, 3);
      const yAtX = y.perNm * x.nm;
      s0 += L(f.X(x.nm), f.Y(0), f.X(x.nm), f.Y(x.fpm), C.mut, 1, '4 3') + `<circle cx="${f.X(x.nm)}" cy="${f.Y(x.fpm)}" r="5" fill="${C.am}"/><circle cx="${f.X(y.nm)}" cy="${f.Y(y.fpm)}" r="5" fill="${C.cy}"/><circle cx="${f.X(x.nm)}" cy="${f.Y(yAtX)}" r="4" fill="none" stroke="${C.cy}" stroke-width="2"/>`;
      s0 += T(f.X(x.nm) - 9, f.Y(x.fpm) - 6, 'Vx', { c: C.am, b: 1, a: 'end', fs: 13, halo: 1 }) + T(f.X(y.nm) - 9, f.Y(y.fpm) - 6, 'Vy', { c: C.cy, b: 1, a: 'end', fs: 13, halo: 1 });
      s0 += T(62, 34, `● Vx ${V.x} kt：1 分で約 ${r10(x.fpm)} ft`, { c: C.am, b: 1, a: 'start', fs: 12 }) + T(62, 52, `● Vy ${V.y} kt：1 分で約 ${r10(y.fpm)} ft`, { c: C.cy, b: 1, a: 'start', fs: 12 });
      s0 += TL(62, 76, ['同じ時間なら Vy が高い', '同じ距離なら Vx が高い'], { c: C.ink, a: 'start', fs: 12, lh: 18 });
      return svg(400, 270, s0, `図：同じ地点から 1 分間、全開で上昇したとき（教材モデル・海面付近）。Vx は同じ距離でより高く（1 NM あたり約 ${r10(x.perNm)} ft。Vy は約 ${r10(y.perNm)} ft）、Vy は同じ時間でより高く上がります（1 分で約 ${r10(y.fpm)} ft。Vx は約 ${r10(x.fpm)} ft）`);
    },
    fuelPlan() {
      // the fuel calculator's example (120 NM, 105 kt, 9.5 gal/h = the POH's 65 % power) with the day / night reserve of 14 CFR 91.151, against 48 gal usable
      const gph = 9.5, trip = 120 / 105 * gph, taxi = 2, day = 0.5 * gph, night = 0.75 * gph, X = g => 70 + g / 50 * 316, usable = 48;
      const bar = (y, lab, res, resLab) => {
        let s = T(64, y + 19, lab, { c: C.ink, b: 1, a: 'end', fs: 12 }), x0 = X(0);
        for (const [g, c] of [[taxi, C.mut], [trip, C.cy], [res, C.am]]) { s += `<rect x="${x0.toFixed(1)}" y="${y}" width="${(X(g) - X(0)).toFixed(1)}" height="28" fill="${c}" fill-opacity="0.55" stroke="${C.bg}"/>`; x0 += X(g) - X(0); }
        return s + T(x0 + 6, y + 19, `計 約 ${(taxi + trip + res).toFixed(0)} gal`, { c: C.ink, b: 1, a: 'start', fs: 12 }) + T(X(taxi + trip + res / 2), y + 44, resLab, { c: C.am, fs: 12 });
      };
      let s = T(12, 20, '燃料は「使う分＋予備」を積む', { c: C.ink, b: 1, a: 'start', fs: 13 });
      for (const v of [0, 10, 20, 30, 40, 50]) s += L(X(v), 40, X(v), 196, C.grid, 1) + T(X(v), 212, v, { c: C.mut, fs: 12 });
      s += bar(56, '昼', day, '予備 30 分') + bar(122, '夜', night, '予備 45 分');
      s += L(X(usable), 36, X(usable), 196, C.gr, 2.5) + T(X(usable) - 4, 34, `使える燃料 ${usable} gal`, { c: C.gr, b: 1, a: 'end', fs: 12 });
      s += `<rect x="70" y="228" width="12" height="12" fill="${C.mut}" fill-opacity="0.55"/>` + T(86, 238, 'タキシー・上昇', { c: C.ink, a: 'start', fs: 12 }) + `<rect x="190" y="228" width="12" height="12" fill="${C.cy}" fill-opacity="0.55"/>` + T(206, 238, '巡航', { c: C.ink, a: 'start', fs: 12 }) + `<rect x="250" y="228" width="12" height="12" fill="${C.am}" fill-opacity="0.55"/>` + T(266, 238, '予備（91.151）', { c: C.ink, a: 'start', fs: 12 });
      s += T(228, 262, '燃料（US gal）', { c: C.mut, fs: 12 });
      return svg(400, 272, s, `図：燃料計画の例。120 NM を対地速度 105 kt で飛ぶと約 1 時間 9 分、9.5 gal/h（POH の 65% 出力の値）で巡航に約 ${trip.toFixed(1)} gal。タキシーと上昇の分（${taxi} gal）は例です`);
    },
    wbStations() {
      // the Archer from the side over a ruler of stations (inches aft of the datum): the POH's arms, the CG range, the example's empty-weight CG
      const W = ARCHER_WB, k = 1.2, X = st => 34 + st * k, yR = 196, arm = i => W.rows[i][2];
      let s = `<path d="M${X(2)} 132 C${X(6)} 124 ${X(20)} 118 ${X(50)} 116 L${X(62)} 106 C${X(72)} 96 ${X(86)} 92 ${X(104)} 92 L${X(150)} 94 L${X(168)} 108 L${X(250)} 122 L${X(262)} 92 L${X(282)} 92 L${X(286)} 126 L${X(276)} 136 L${X(150)} 146 L${X(60)} 148 C${X(30)} 147 ${X(10)} 142 ${X(2)} 132 Z" fill="${PLANE}" fill-opacity="0.85"/>`;
      s += `<path d="M${X(66)} 106 L${X(100)} 96 L${X(150)} 98 L${X(160)} 108 Z" fill="${GLASS}"/>` + `<path d="M${X(78.4)} 146 L${X(141)} 146 L${X(141)} 150 L${X(84)} 152 Z" fill="${PLANE2}"/>`;
      s += `<rect x="${X(250)}" y="124" width="${36 * k}" height="4" rx="2" fill="${PLANE2}"/>` + L(X(2), 116, X(2), 148, C.mut, 2.5) + `<circle cx="${X(31)}" cy="164" r="6" fill="#5b6b7e"/><circle cx="${X(110)}" cy="164" r="7" fill="#5b6b7e"/>` + L(X(31), 148, X(31), 160, PLANE2, 2) + L(X(110), 150, X(110), 158, PLANE2, 2);
      s += `<rect x="${X(82)}" y="${yR - 6}" width="${(93 - 82) * k}" height="12" fill="${C.cy}" fill-opacity="0.3" stroke="${C.cy}"/>` + L(X(0), yR, X(290), yR, C.mut, 1.5);
      for (const v of [0, 50, 100, 150, 200, 250]) s += L(X(v), yR, X(v), yR + 6, C.mut, 1.5) + T(X(v), yR + 20, v, { c: C.mut, fs: 12 });
      s += L(X(0), 30, X(0), yR, C.vi, 2, '6 4') + T(X(0), yR + 40, '基準線（datum）＝主翼前縁の 78.4 in 前', { c: C.vi, a: 'start', fs: 12 });
      const mark = (st, y, lab, c, a = 'middle') => L(X(st), y + 4, X(st), yR - 6, c, 1.5, '3 3') + `<circle cx="${X(st)}" cy="${yR}" r="4" fill="${c}"/>` + T(X(st) + (a === 'end' ? 8 : a === 'start' ? -8 : 0), y, lab, { c, b: 1, fs: 12, a, halo: 1 });
      s += mark(arm(2), 46, `後席 ${arm(2)}`, C.gr) + mark(arm(3), 64, `燃料 ${arm(3).toFixed(1)}`, C.am, 'end') + mark(arm(1), 82, `前席 ${arm(1)}`, C.gr, 'end') + mark(arm(4), 82, `手荷物 ${arm(4)}`, C.gr, 'start');
      s += T(200, yR + 60, '重心の許容範囲 82.0〜93.0 in（重いほど前の限界が後ろへ）', { c: C.cy, fs: 12 }) + T(12, 18, 'アーム＝基準線からの距離（in）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      return svg(400, 268, s, '図：Archer III の基準線と、席・燃料（主翼の中のタンク）・手荷物のアーム（POH の値）。機体の形と脚の位置は模式図です');
    },
    wbEnvelope() {
      // the Archer III's weight-CG envelope (POH) with the worked example: aft of the limit → one rear passenger to the front → after 20 gal burnt
      const W = ARCHER_WB, env = W.env, f = frame(400, 280, 80, 95, 1600, 2600, [80, 83, 86, 89, 92, 95], [1600, 1800, 2000, 2200, 2400, 2600], '重心位置（基準線から in）', '重量（lb）', { l: 56, r: 14, t: 16, b: 40 });
      const ex = W.example(), pt = (p, c) => `<circle cx="${f.X(p.cg).toFixed(1)}" cy="${f.Y(p.w).toFixed(1)}" r="6" fill="${c}" stroke="${C.bg}" stroke-width="1.5"/>`;
      let s = f.s + `<path d="${env.map((p, i) => (i ? 'L' : 'M') + f.X(p[0]).toFixed(1) + ' ' + f.Y(p[1]).toFixed(1)).join(' ')} Z" fill="rgba(95,212,255,.12)" stroke="${C.cy}" stroke-width="2"/>`;
      s += L(f.X(80), f.Y(W.max), f.X(95), f.Y(W.max), C.rd, 1.5, '6 4') + T(f.X(80) + 4, f.Y(W.max) - 6, `最大重量 ${W.max.toLocaleString()} lb`, { c: C.rd, a: 'start', fs: 12 });
      s += T(f.X(88), f.Y(1800), '許容範囲', { c: C.cy, b: 1, fs: 13 }) + T(f.X(94.1), f.Y(1900), '後ろすぎ', { c: C.rd, fs: 12, rot: -90 }) + T(f.X(81.6), f.Y(2350), '前すぎ', { c: C.rd, fs: 12 });
      const [a, b, c] = ex;
      s += A(f.X(a.cg) - 6, f.Y(a.w), f.X(b.cg) + 8, f.Y(b.w), C.gr, 2) + A(f.X(b.cg), f.Y(b.w) + 7, f.X(c.cg) + 1, f.Y(c.w) - 9, C.gr, 2);
      s += pt(a, C.rd) + pt(b, C.gr) + pt(c, C.gr) + T(f.X(a.cg) - 2, f.Y(a.w) - 12, '①', { c: C.rd, b: 1, fs: 13, halo: 1 }) + T(f.X(b.cg) - 12, f.Y(b.w) - 8, '②', { c: C.gr, b: 1, fs: 13, halo: 1 }) + T(f.X(c.cg) - 14, f.Y(c.w) + 16, '③', { c: C.gr, b: 1, fs: 13, halo: 1 });
      return svg(400, 280, s, `図：Archer III の重量と重心の許容範囲（POH の値）と、計算例の 3 つの点。①後ろすぎ（${a.cg.toFixed(1)} in）→ ②後席の 1 人を前席へ（${b.cg.toFixed(1)} in）→ ③燃料を 20 gal 使った着陸時（${c.cg.toFixed(1)} in）`);
    },
    // ---------------------------------------------------------------- 第 5 章 wx（航空気象）
    altimeterHighLow() {
      // flying from high to low pressure with the altimeter setting not updated: the airplane follows a pressure level that slopes down
      let s = `<rect x="0" y="214" width="400" height="22" fill="#3a3326"/>` + T(70, 30, '高気圧（High）', { c: C.am, b: 1, fs: 13 }) + T(330, 30, '低気圧（Low）', { c: C.cy, b: 1, fs: 13 });
      s += L(20, 64, 380, 64, C.gr, 1.5, '6 4') + T(380, 56, '本当の 3,000 ft', { c: C.gr, a: 'end', fs: 12 });
      s += P([[20, 64], [380, 132]], C.am, 3) + T(200, 116, '高度計が 3,000 ft を示す気圧の面', { c: C.am, fs: 12, rot: 10.7, halo: 1 });
      s += planeSide(52, 64, 0.32) + planeSide(350, 126, 0.32, { pitch: -4 });
      s += A(350, 72, 350, 112, C.rd, 2.5) + TL(340, 160, ['本当はこれだけ', '低くなっている'], { c: C.rd, b: 1, a: 'end', fs: 12 });
      s += `<path d="M300 214 L318 168 L336 214 Z" fill="#6b5a44"/>` + T(200, 196, '高度計の規正値を直さないで飛ぶと…', { c: C.ink, fs: 12 });
      s += T(200, 254, 'High to low, look out below（暖かい所から寒い所へも同じ）', { c: C.ink, b: 1, fs: 12 });
      return svg(400, 264, s, '図：気圧の高い所から低い所へ、規正値を直さないまま飛ぶと、高度計は同じ値でも本当の高さは下がっていきます（模式図）。寒い所へ飛んだときも、高度計は実際より高く表示します');
    },
    cloudBase() {
      // a lifted parcel: temperature −3 °C / 1,000 ft, dewpoint −0.5 °C / 1,000 ft (AWH 12.2) → they meet at spread ÷ 2.5 × 1,000 ft
      const t0 = 32, d0 = 23, base = (t0 - d0) / 2.5, f = frame(400, 270, 15, 35, 0, 5, [15, 20, 25, 30, 35], [0, 1, 2, 3, 4, 5], '温度（℃）', '高さ（1,000 ft）', { l: 50, r: 14, t: 16, b: 40 });
      const tb = t0 - 3 * base;
      let s = f.s + P([[f.X(t0), f.Y(0)], [f.X(tb), f.Y(base)]], C.am, 3) + P([[f.X(d0), f.Y(0)], [f.X(tb), f.Y(base)]], C.cy, 3);
      s += L(f.X(15), f.Y(base), f.X(tb), f.Y(base), C.ink, 1, '5 4') + `<circle cx="${f.X(tb).toFixed(1)}" cy="${f.Y(base).toFixed(1)}" r="5" fill="${C.ink}"/>`;
      const cx = f.X(tb), cy = f.Y(base);
      s += `<path d="M${cx - 62} ${cy - 2} Q ${cx - 66} ${cy - 30} ${cx - 36} ${cy - 34} Q ${cx - 26} ${cy - 62} ${cx + 4} ${cy - 56} Q ${cx + 30} ${cy - 74} ${cx + 46} ${cy - 42} Q ${cx + 70} ${cy - 36} ${cx + 64} ${cy - 2} Z" fill="#dfe6ee" fill-opacity="0.85"/>`;
      s += T(f.X(t0) - 6, f.Y(0) - 10, `気温 ${t0}℃`, { c: C.am, b: 1, a: 'end', fs: 12, halo: 1 }) + T(f.X(d0) - 6, f.Y(0) - 10, `露点 ${d0}℃`, { c: C.cy, b: 1, a: 'end', fs: 12, halo: 1 });
      s += T(f.X(tb) - 70, f.Y(base) + 18, `雲の底 約 ${(Math.round(base * 10) * 100).toLocaleString()} ft`, { c: C.ink, b: 1, a: 'start', fs: 12, halo: 1 });
      s += TL(228, 34, ['持ち上げると', '気温は 1,000 ft で約 3℃', '露点は約 0.5℃ 下がる'], { c: C.ink, a: 'start', fs: 12, halo: 1, lh: 16 });
      s += TL(228, 90, [`差 ${t0 - d0}℃ ÷ 2.5 × 1,000 ft`, `≒ ${(Math.round(base * 10) * 100).toLocaleString()} ft`], { c: C.gr, b: 1, a: 'start', fs: 12, halo: 1, lh: 16 });
      return svg(400, 270, s, `図：地上の気温と露点から、積雲の底の高さを見積もる（METAR の例 ${t0}/${d0}）。持ち上げられた空気が冷えて、気温と露点が同じになる高さに雲ができます（AWH 第 12 章）`);
    },
    frontsXsec() {
      // a cold front (steep, a narrow band of CB) above a warm front (gentle, wide stratiform cloud and steady rain); arrows: the front's motion
      const panel = (y0, cold) => {
        const g = y0 + 116;
        let s = `<rect x="0" y="${g}" width="400" height="8" fill="#3a3326"/>`;
        if (cold) {
          s += `<path d="M0 ${g} L214 ${g} Q 196 ${g - 34} 182 ${y0 + 46} Q 176 ${y0 + 40} 150 ${y0 + 40} L0 ${y0 + 40} Z" fill="${C.cy}" fill-opacity="0.16" stroke="${C.cy}" stroke-opacity="0.5"/>`;
          s += `<path d="M206 ${g - 50} Q 196 ${g - 74} 214 ${g - 84} Q 212 ${y0 + 22} 236 ${y0 + 16} L222 ${y0 + 8} L318 ${y0 + 6} L290 ${y0 + 18} Q 300 ${g - 82} 296 ${g - 50} Z" fill="#dfe6ee" fill-opacity="0.85"/>`;
          for (const x of [222, 238, 254, 270]) s += L(x, g - 48, x - 6, g - 4, C.cy, 1.5, '3 3');
          s += A(70, g - 46, 130, g - 46, C.cy, 2.5) + T(80, g - 18, '冷たい空気', { c: C.cy, b: 1, fs: 12 }) + T(350, g - 18, '暖かい空気', { c: C.am, b: 1, fs: 12 });
          s += T(12, y0 + 18, '寒冷前線（cold front）', { c: C.ink, b: 1, a: 'start', fs: 13 }) + TL(392, y0 + 40, ['急な傾き', '積乱雲の狭い帯', 'にわか雨・突風・雷'], { c: C.ink, a: 'end', fs: 12, lh: 15 });
        } else {
          const sy = x => g - (x - 120) * 0.29;
          s += `<path d="M120 ${g} L400 ${g} L400 ${sy(400).toFixed(1)} Z" fill="${C.cy}" fill-opacity="0.16" stroke="${C.cy}" stroke-opacity="0.5"/>`;
          s += `<path d="M126 ${g - 4} L400 ${sy(400) - 2} L400 ${sy(400) - 16} L240 ${sy(240) - 18} L140 ${g - 22} Z" fill="#dfe6ee" fill-opacity="0.7"/>`;
          for (const x of [136, 156, 176, 196, 216]) s += L(x, sy(x) - 4, x - 4, g - 2, C.cy, 1.5, '3 3');
          s += A(30, g - 36, 90, g - 36, C.am, 2.5) + T(56, g - 12, '暖かい空気', { c: C.am, b: 1, fs: 12 }) + T(340, g - 14, '冷たい空気', { c: C.cy, b: 1, fs: 12 });
          s += T(12, y0 + 18, '温暖前線（warm front）', { c: C.ink, b: 1, a: 'start', fs: 13 }) + TL(12, y0 + 38, ['ゆるい傾き・層状の雲が広い', '長い雨・低い雲と霧'], { c: C.ink, a: 'start', fs: 12, lh: 15 });
        }
        return s;
      };
      return svg(400, 262, panel(4, true) + panel(134, false), '図：寒冷前線と温暖前線の断面（模式図）。寒冷前線は傾きが急で、積乱雲の狭い帯をつくります。温暖前線は傾きがゆるく、層状の雲と長い雨が広がります（AWH 第 11 章）。矢印は前線の進む向き');
    },
    thunderstormLife() {
      // the three stages of a thunderstorm cell (AWH 22.3): towering cumulus → mature → dissipating, about 30 minutes in all
      const g = 206;
      const panel = (x, title, lines, body) => T(x + 64, 22, title, { c: C.ink, b: 1, fs: 13 }) + body + TL(x + 64, g + 22, lines, { c: C.ink, fs: 12, lh: 15 });
      let s = `<rect x="0" y="${g}" width="400" height="6" fill="#3a3326"/>` + L(132, 30, 132, g - 4, C.grid, 1) + L(266, 30, 266, g - 4, C.grid, 1);
      const cu = `<path d="M30 ${g - 70} Q 26 ${g - 110} 48 ${g - 118} Q 46 ${g - 160} 68 ${g - 166} Q 92 ${g - 168} 94 ${g - 130} Q 110 ${g - 118} 104 ${g - 70} Z" fill="#dfe6ee" fill-opacity="0.85"/>`;
      s += panel(0, '① 積雲期', ['上昇気流だけ', '3,000 fpm を', '超えることも'], cu + A(66, g - 40, 66, g - 150, C.am, 2.5) + A(50, g - 50, 52, g - 120, C.am, 2));
      const cb = `<path d="M150 ${g - 62} Q 146 ${g - 110} 168 ${g - 124} L164 ${g - 160} L148 ${g - 168} L250 ${g - 172} L232 ${g - 160} L222 ${g - 122} Q 246 ${g - 104} 240 ${g - 62} Z" fill="#dfe6ee" fill-opacity="0.85"/>`;
      let mb = cb + A(178, g - 50, 178, g - 150, C.am, 2.5) + A(212, g - 140, 212, g - 20, C.cy, 2.5);
      for (const x of [196, 206, 220, 230]) mb += L(x, g - 60, x - 4, g - 2, C.cy, 1.5, '3 3');
      mb += A(232, g - 6, 262, g - 6, C.cy, 2);
      s += panel(132, '② 成熟期', ['雨が地面に届く', '上昇と下降・突風'], mb);
      const an = `<path d="M282 ${g - 150} L392 ${g - 156} L374 ${g - 140} L300 ${g - 136} Z" fill="#dfe6ee" fill-opacity="0.6"/><path d="M300 ${g - 136} Q 296 ${g - 110} 312 ${g - 96} Q 350 ${g - 90} 362 ${g - 110} L374 ${g - 140} Z" fill="#dfe6ee" fill-opacity="0.45"/>`;
      let db = an + A(318, g - 100, 318, g - 30, C.cy, 2.5) + A(344, g - 100, 344, g - 30, C.cy, 2.5);
      for (const x of [328, 336]) db += L(x, g - 92, x - 3, g - 40, C.cy, 1.2, '2 4');
      s += panel(266, '③ 消散期', ['下降気流だけ', '雨がやみ、', 'かなとこが残る'], db);
      s += T(200, g + 72, '1 つの雷雨の一生は全体で約 30 分（AWH）', { c: C.am, b: 1, fs: 12 });
      return svg(400, 286, s, '図：雷雨（1 つのセル）の一生（模式図）。積雲期は上昇気流だけ、成熟期は雨が地面に届いて上昇と下降の流れがそろい、危険が最も大きくなります。消散期は下降気流だけになります（AWH 22.3）');
    },
    microburst() {
      // an approach through a microburst: headwind (above the path) → downdraft → tailwind (below the path); AWH 22.7 numbers
      const g = 222, gp = x => 70 + (x - 20) * (g - 70) / 370;
      let s = `<rect x="0" y="${g}" width="400" height="10" fill="#3a3326"/><rect x="330" y="${g - 3}" width="70" height="4" fill="#9aa7b6"/>` + T(365, g + 26, '滑走路', { c: C.mut, fs: 12 });
      s += `<path d="M140 52 Q 150 20 190 26 Q 220 10 250 28 Q 280 30 270 56 Z" fill="#dfe6ee" fill-opacity="0.7"/>`;
      for (const x of [184, 204, 224]) s += A(x, 60, x, g - 44, C.cy, 2.5);
      s += `<path d="M190 ${g - 30} Q 170 ${g - 6} 120 ${g - 8}" stroke="${C.cy}" stroke-width="2.5" fill="none"/><path d="M218 ${g - 30} Q 238 ${g - 6} 288 ${g - 8}" stroke="${C.cy}" stroke-width="2.5" fill="none"/>` + A(126, g - 8, 112, g - 8, C.cy, 2.5) + A(282, g - 8, 296, g - 8, C.cy, 2.5);
      s += L(20, gp(20), 390, g, C.gr, 1.5, '6 4') + T(22, gp(20) - 12, '正しい進入の経路', { c: C.gr, a: 'start', fs: 12 });
      s += `<path d="M20 ${gp(20)} Q 100 ${gp(100) - 4} 140 ${gp(140) - 22} Q 190 ${gp(190) - 26} 222 ${gp(222)} Q 250 ${gp(250) + 34} 286 ${g - 6}" stroke="${C.rd}" stroke-width="3" fill="none"/>`;
      s += `<circle cx="140" cy="${gp(140) - 22}" r="11" fill="${C.bg}" stroke="${C.am}" stroke-width="2"/>` + T(140, gp(140) - 18, '1', { c: C.am, b: 1, fs: 12 }) + `<circle cx="204" cy="${gp(204) - 70}" r="11" fill="${C.bg}" stroke="${C.cy}" stroke-width="2"/>` + T(204, gp(204) - 66, '2', { c: C.cy, b: 1, fs: 12 }) + `<circle cx="272" cy="${gp(272) + 10}" r="11" fill="${C.bg}" stroke="${C.rd}" stroke-width="2"/>` + T(272, gp(272) + 14, '3', { c: C.rd, b: 1, fs: 12 });
      s += TL(12, 248, ['1 向かい風：速度が増え、経路より上へ　2 強い下降気流', '3 追い風：速度が急に減り、沈む（墜落の危険）'], { c: C.ink, a: 'start', fs: 12, lh: 16 });
      s += T(12, 290, '直径 2.5 mi 未満・下降気流は最大 6,000 fpm・5〜15 分（AWH）', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 300, s, '図：進入中にマイクロバーストに入ったとき（模式図）。最初は向かい風で浮き上がるので、つい出力を絞りがちです。そのあと下降気流と追い風で急に沈みます');
    },
    fogTypes() {
      // radiation fog (clear, calm night; land) and advection fog (moist air over a colder surface; wind up to about 15 kt) — AWH 18.1
      const panel = (y0, title, lines, body) => T(12, y0 + 18, title, { c: C.ink, b: 1, a: 'start', fs: 13 }) + body + TL(392, y0 + 18, lines, { c: C.ink, a: 'end', fs: 12, lh: 15 });
      let s = `<rect x="0" y="0" width="400" height="128" fill="#071022"/>` + `<circle cx="80" cy="44" r="10" fill="#f2efd8"/><circle cx="86" cy="40" r="9" fill="#071022"/>`;
      for (const [x, y] of [[40, 50], [120, 36], [150, 58], [20, 30]]) s += `<circle cx="${x}" cy="${y}" r="1.5" fill="#f2efd8"/>`;
      s += `<path d="M0 108 Q 100 96 200 112 Q 280 120 400 104 L400 128 L0 128 Z" fill="#3a3326"/>` + `<path d="M120 112 Q 200 92 280 114 Q 200 120 120 112 Z" fill="#dfe6ee" fill-opacity="0.75"/>`;
      for (const x of [40, 330, 370]) s += A(x, 104, x, 84, C.am, 1.5);
      s += T(48, 80, '地面の熱が逃げる', { c: C.am, a: 'start', fs: 12 });
      s = panel(0, '放射霧（radiation fog）', ['晴れた夜・風が弱い', '地面が冷えて空気を冷やす', '低い所にたまり、朝に消える'], s);
      let a = `<rect x="0" y="136" width="400" height="128" fill="#0b1a2c"/><rect x="0" y="240" width="160" height="24" fill="#1d4a7a"/><rect x="160" y="240" width="240" height="24" fill="#3a3326"/>` + T(80, 256, '暖かく湿った空気', { c: C.ink, fs: 12 });
      a += A(30, 222, 150, 222, C.am, 3) + `<path d="M160 240 Q 250 214 400 226 L400 240 Z" fill="#dfe6ee" fill-opacity="0.75"/>` + T(290, 256, '冷たい地面（や海）', { c: C.ink, fs: 12 });
      s += panel(136, '移流霧（advection fog）', ['湿った空気が冷たい面の上へ', '風 15 kt くらいまでは濃くなる', '広く、昼でも夜でも来る'], a);
      return svg(400, 264, s, '図：放射霧と移流霧（模式図）。放射霧は晴れて風の弱い夜に陸の上でできます。移流霧は、湿った空気が冷たい地面や海の上へ流れてきてできます（AWH 18.1）');
    },
    metarDecode() {
      // the book's made-up METAR, split into its parts (AWH 24.4; AIM 7-1)
      const mono = (x, y, t, c) => `<text x="${x}" y="${y}" fill="${c}" font-size="13" font-family="ui-monospace, Menlo, Consolas, monospace" text-anchor="middle">${t}</text>`;
      const rows = [[['METAR', C.mut], ['KSFB', C.ink], ['141753Z', C.vi], ['09012G20KT', C.cy]], [['10SM', C.gr], ['SCT035', '#dfe6ee'], ['BKN050', '#dfe6ee'], ['32/23', C.am], ['A3001', C.rd]], [['RMK', C.mut], ['AO2', C.mut], ['SLP162', C.mut]]];
      let s = '', n = 0;
      const nums = ['①', '②', '③', '④', '⑤', '⑥', '⑥', '⑦', '⑧', '⑨', '⑨', '⑨'];
      rows.forEach((row, r) => {
        let x = 12; const y = 14 + r * 50;
        for (const [t, c] of row) {
          const w = t.length * 8 + 12;
          s += `<rect x="${x}" y="${y}" width="${w}" height="26" rx="4" fill="${c}" fill-opacity="0.12" stroke="${c}"/>` + mono(x + w / 2, y + 18, t, c) + T(x + w / 2, y + 42, nums[n++], { c, fs: 12 });
          x += w + 6;
        }
      });
      const legend = ['① 定時の観測（METAR）　② 空港（ICAO の 4 文字）', '③ 14 日 17:53 UTC（夏のフロリダは −4 時間）', '④ 風：真方位 090° から 12 kt、突風 20 kt', '⑤ 視程 10 SM（statute mile）', '⑥ 雲：3,500 ft に SCT、5,000 ft に BKN（＝雲高）', '⑦ 気温 32℃・露点 23℃　⑧ 高度計 30.01 inHg', '⑨ 備考：自動観測（降水を判別できる AO2）・海面気圧'];
      s += TL(12, 170, legend, { c: C.ink, a: 'start', fs: 12, lh: 18 }) + T(392, 306, '架空の例', { c: C.mut, a: 'end', fs: 12 });
      return svg(400, 314, s, '図：METAR の読み方（架空の例）。左から、種類・空港・日時・風・視程・（天気）・雲・気温と露点・高度計規正値・備考の順に並びます。この例では天気（雨や霧など）がないので、その部分がありません');
    },
    tafTimeline() {
      // the book's made-up TAF on a time line: UTC and Florida summer time (EDT = UTC − 4)
      const X = h => 34 + h * 14, row = 120;
      let s = `<text x="12" y="20" fill="${C.ink}" font-size="12" font-family="ui-monospace, Menlo, Consolas, monospace">TAF KSFB 141130Z 1412/1512 09010KT P6SM SCT040</text>` + `<text x="24" y="38" fill="${C.am}" font-size="12" font-family="ui-monospace, Menlo, Consolas, monospace">TEMPO 1418/1422 3SM TSRA BKN030CB</text>` + `<text x="24" y="56" fill="${C.gr}" font-size="12" font-family="ui-monospace, Menlo, Consolas, monospace">FM150200 VRB03KT P6SM SKC</text>`;
      s += `<rect x="${X(0)}" y="${row - 28}" width="${X(14) - X(0)}" height="26" rx="4" fill="${C.cy}" fill-opacity="0.18" stroke="${C.cy}"/>` + T((X(0) + X(14)) / 2, row - 11, '東の風 10 kt・6 SM 超・SCT040', { c: C.cy, fs: 12 });
      s += `<rect x="${X(14)}" y="${row - 28}" width="${X(24) - X(14)}" height="26" rx="4" fill="${C.gr}" fill-opacity="0.18" stroke="${C.gr}"/>` + T((X(14) + X(24)) / 2, row - 11, 'FM：風が弱まり晴れ', { c: C.gr, fs: 12 });
      s += `<rect x="${X(6)}" y="${row + 2}" width="${X(10) - X(6)}" height="26" rx="4" fill="${C.am}" fill-opacity="0.25" stroke="${C.am}"/>` + T(X(10) + 6, row + 19, 'TEMPO：一時的に雷雨・3 SM', { c: C.am, b: 1, a: 'start', fs: 12 });
      s += L(X(0), row + 40, X(24), row + 40, C.mut, 1.5);
      for (let h = 0; h <= 24; h += 6) { const z = (12 + h) % 24, l = (z + 20) % 24, d = h === 0 ? '14日 ' : h === 12 ? '15日 ' : ''; s += L(X(h), row + 36, X(h), row + 44, C.mut, 1.5) + T(X(h), row + 60, `${d}${String(z).padStart(2, '0')}Z`, { c: C.ink, fs: 12 }) + T(X(h), row + 78, `${String(l).padStart(2, '0')}:00`, { c: C.mut, fs: 12 }); }
      s += T(X(0) - 4, row + 100, '上：UTC（Z）　下：フロリダ中部の夏時間（EDT）', { c: C.mut, a: 'start', fs: 12 });
      s += TL(12, row + 138, ['TEMPO：その時間に一時的に（1 回 1 時間以内、合わせて半分未満）', 'FM：その時刻から、天気がすっかり変わる'], { c: C.ink, a: 'start', fs: 12, lh: 17 });
      return svg(400, 292, s, '図：TAF を時間の帯にしたもの（架空の例）。14 日 12Z から 15 日 12Z までの予報で、14 日 18〜22Z（夏時間で 14〜18 時）に一時的な雷雨、15 日 02Z から晴れ');
    },
    flightCategory() {
      // ceiling × visibility: the flight categories with the colours of aviation weather websites (AWH ch. 3)
      const f = frame(400, 290, 0, 10, 0, 5000, [0, 1, 3, 5, 10], [0, 500, 1000, 3000, 5000], '視程（SM）', '雲高（ft）', { l: 56, r: 14, t: 16, b: 40 });
      const R = (x0, x1, y0, y1, c) => `<rect x="${f.X(x0).toFixed(1)}" y="${f.Y(y1).toFixed(1)}" width="${(f.X(x1) - f.X(x0)).toFixed(1)}" height="${(f.Y(y0) - f.Y(y1)).toFixed(1)}" fill="${c}"/>`;
      const G = '#1e4a2c', B2 = '#1c3a66', R2 = '#5c2428', V = '#4a2b68';
      let s = R(0, 10, 0, 5000, G) + R(0, 5, 0, 5000, B2) + R(0, 10, 0, 3000, B2) + R(0, 3, 0, 5000, R2) + R(0, 10, 0, 1000, R2) + R(0, 1, 0, 5000, V) + R(0, 10, 0, 500, V) + f.s;
      s += T(f.X(7.5), f.Y(4200), 'VFR', { c: C.ink, b: 1, fs: 14 }) + T(f.X(7.5), f.Y(2100), 'MVFR', { c: C.ink, b: 1, fs: 13 }) + T(f.X(7.5), f.Y(760), 'IFR', { c: C.ink, b: 1, fs: 12 }) + T(f.X(7.5), f.Y(140), 'LIFR', { c: C.ink, b: 1, fs: 12 });
      const pt = (v, c, lab, dx) => `<circle cx="${f.X(v[0]).toFixed(1)}" cy="${f.Y(v[1]).toFixed(1)}" r="5" fill="${C.ink}" stroke="${C.bg}" stroke-width="1.5"/>` + T(f.X(v[0]) + dx, f.Y(v[1]) + 4, lab, { c, b: 1, fs: 12, a: dx < 0 ? 'end' : 'start', halo: 1 });
      s += pt([4, 1200], C.ink, '例 B：BKN012・4SM', 8) + pt([9, 4500], C.ink, '例 A', -8);
      return svg(400, 290, s, '図：天気の区分（雲高と視程）。航空気象のサイトは、LIFR を紫、IFR を赤、MVFR を青、VFR を緑で表示します（AWH 第 3 章）。この区分は、14 CFR 91.155 の VFR の最低気象条件とは別のものです');
    },
    // ---------------------------------------------------------------- 第 6 章 law（規則と空域）
    preflightInfo() {
      // 14 CFR 91.103: all available information; for every flight, runway lengths and takeoff / landing distances; for IFR or away from the airport, weather, fuel, alternatives, ATC delays
      let s = `<rect x="8" y="8" width="384" height="236" rx="12" fill="none" stroke="${C.mut}" stroke-dasharray="5 4"/>` + T(200, 30, 'その飛行に関する、入手できるすべての情報', { c: C.ink, b: 1, fs: 13 });
      s += `<rect x="26" y="42" width="348" height="190" rx="10" fill="${C.cy}" fill-opacity="0.06" stroke="${C.cy}"/>` + T(200, 62, 'IFR・空港の近くを離れる飛行（クロスカントリー）', { c: C.cy, b: 1, fs: 12 }) + TL(200, 80, ['天気の報告と予報・必要な燃料', '行けないときの代わり・ATC から聞いた遅れ'], { c: C.ink, fs: 12, lh: 16 });
      s += `<rect x="62" y="116" width="276" height="104" rx="9" fill="${C.gr}" fill-opacity="0.08" stroke="${C.gr}"/>` + T(200, 136, 'すべての飛行', { c: C.gr, b: 1, fs: 12 }) + TL(200, 154, ['使う空港の滑走路の長さ', '離陸と着陸の距離（POH など）'], { c: C.ink, fs: 12, lh: 16 });
      s += `<rect x="140" y="188" width="120" height="24" rx="12" fill="${C.am}" fill-opacity="0.2" stroke="${C.am}"/>` + T(200, 205, '機長（PIC）', { c: C.am, b: 1, fs: 12 });
      return svg(400, 252, s, '図：飛行前の準備（14 CFR 91.103）。機長は出発前に、その飛行に関する入手できるすべての情報を知っておきます。すべての飛行で滑走路の長さと離着陸距離を、IFR や空港の近くを離れる飛行では天気・燃料・代わりの計画・ATC の遅れも確かめます');
    },
    vfrCloudClearance() {
      // 91.155 "3-152": 3 SM visibility, 500 ft below, 1,000 ft above, 2,000 ft horizontal (Class C, D, and E below 10,000 ft MSL)
      const cx = 262, cy = 124;
      let s = `<path d="M${cx - 66} ${cy + 22} Q ${cx - 74} ${cy - 4} ${cx - 46} ${cy - 10} Q ${cx - 40} ${cy - 34} ${cx - 10} ${cy - 30} Q ${cx + 10} ${cy - 46} ${cx + 34} ${cy - 26} Q ${cx + 66} ${cy - 28} ${cx + 68} ${cy + 22} Z" fill="#dfe6ee" fill-opacity="0.85"/>`;
      s += A(cx, cy + 26, cx, cy + 86, C.am, 2.5) + A(cx, cy + 86, cx, cy + 26, C.am, 2.5) + T(cx + 8, cy + 62, '500 ft 下', { c: C.am, b: 1, a: 'start', fs: 13, halo: 1 });
      s += A(cx, cy - 40, cx, cy - 100, C.cy, 2.5) + A(cx, cy - 100, cx, cy - 40, C.cy, 2.5) + T(cx + 8, cy - 70, '1,000 ft 上', { c: C.cy, b: 1, a: 'start', fs: 13, halo: 1 });
      s += planeSide(70, cy, 0.42) + A(98, cy, cx - 72, cy, C.gr, 2.5) + A(cx - 72, cy, 98, cy, C.gr, 2.5) + T((98 + cx - 72) / 2, cy - 10, '2,000 ft 横', { c: C.gr, b: 1, fs: 13, halo: 1 });
      s += A(40, 236, 360, 236, C.vi, 2) + T(200, 228, '飛行視程 3 SM 以上', { c: C.vi, b: 1, fs: 13 });
      s += T(12, 22, '3-152（Class C・D・10,000 ft MSL 未満の E）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      s += TL(12, 262, ['Class B は 3 SM・雲に入らない', 'Class G（地上 1,200 ft 以下・昼）は 1 SM・雲に入らない'], { c: C.mut, a: 'start', fs: 12, lh: 16 });
      return svg(400, 290, s, '図：VFR で守る雲からの距離と視程（14 CFR 91.155）。Class C・D と 10,000 ft MSL 未満の Class E では、視程 3 SM、雲の下 500 ft・上 1,000 ft・横 2,000 ft（覚え方 3-152）');
    },
    specialUseAirspace() {
      // a made-up area seen from above: special use airspace and a TFR (names and places are invented; NOT FOR NAVIGATION)
      let s = `<rect x="0" y="0" width="400" height="200" fill="#10202f"/><path d="M300 0 Q 290 60 310 110 Q 330 160 316 200 L400 200 L400 0 Z" fill="#163a5e"/>` + T(372, 20, '海', { c: C.cy, fs: 12 });
      s += L(330, 0, 344, 200, C.cy, 1, '4 4') + T(346, 152, '3 NM', { c: C.cy, fs: 12, a: 'start' });
      s += `<rect x="350" y="40" width="44" height="90" fill="${C.bl}" fill-opacity="0.25" stroke="${C.bl}"/>` + T(372, 90, 'W', { c: C.ink, b: 1, fs: 13 });
      s += `<rect x="40" y="24" width="96" height="66" fill="${C.bl}" fill-opacity="0.25" stroke="${C.bl}" stroke-width="2"/>` + T(88, 62, 'R-LAB1', { c: C.ink, b: 1, fs: 13 });
      s += `<path d="M150 110 L260 100 L280 170 L170 186 Z" fill="${C.vi}" fill-opacity="0.15" stroke="${C.vi}" stroke-width="2"/>` + T(215, 148, 'LAB MOA', { c: C.ink, b: 1, fs: 13 });
      s += `<circle cx="210" cy="44" r="28" fill="${C.am}" fill-opacity="0.15" stroke="${C.am}" stroke-width="2"/>` + T(210, 48, 'A-LAB3', { c: C.ink, b: 1, fs: 12 });
      s += `<circle cx="70" cy="150" r="30" fill="${C.rd}" fill-opacity="0.18" stroke="${C.rd}" stroke-width="2" stroke-dasharray="6 3"/>` + T(70, 154, 'TFR', { c: C.ink, b: 1, fs: 13 });
      s += `<circle cx="268" cy="62" r="5" fill="none" stroke="${C.ink}" stroke-width="2"/>` + T(278, 66, 'LAB', { c: C.ink, fs: 12, a: 'start' });
      const leg = [['R', '制限空域（Restricted）：使っている時間は、許可なしに入らない', C.bl], ['MOA', '軍の訓練空域：入れるが、ATC に交通情報を求める', C.vi], ['A', '警戒空域（Alert）：訓練機などが多い。注意して飛ぶ', C.am], ['W', '警告空域（Warning）：海岸から 3 NM より沖の危険な空域', C.bl], ['TFR', '一時的な飛行制限：NOTAM で知らされる。飛ぶ前に必ず確かめる', C.rd]];
      leg.forEach(([k, t, c], i) => { s += T(12, 222 + i * 17, k, { c, b: 1, a: 'start', fs: 12 }) + T(50, 222 + i * 17, t, { c: C.ink, a: 'start', fs: 12 }); });
      s += T(8, 194, '模式図・NOT FOR NAVIGATION', { c: C.mut, a: 'start', fs: 12, halo: 1 });
      return svg(400, 306, s, '図：特別な空域と TFR（上から見た模式図。名前と位置は架空で、実際の地図とは違います）。運用中の制限空域や TFR には、許可なしに入りません（AIM 3-4・3-5）');
    },
    rightOfWay() {
      // 91.113: converging (the one on the right has the right-of-way), head-on (both turn right), overtaking (pass on the right); the order of categories (amended 2025)
      let s = '';
      const box = (x, t1, t2) => `<rect x="${x}" y="8" width="124" height="150" rx="8" fill="none" stroke="${C.grid}"/>` + T(x + 62, 26, t1, { c: C.ink, b: 1, fs: 12 }) + T(x + 62, 150, t2, { c: C.mut, fs: 12 });
      s += box(4, '① 交わる', '右の機が優先');
      s += planeTop(50, 104, 0.28, { rot: 0 }) + planeTop(104, 60, 0.28, { rot: 270 }) + `<path d="M50 86 Q 60 72 92 76 Q 122 78 130 56" stroke="${C.gr}" stroke-width="2" fill="none"/>` + T(104, 88, '相手', { c: C.am, fs: 12 }) + T(22, 130, '自分', { c: C.cy, fs: 12 });
      s += box(138, '② 正面', '両方とも右へ');
      s += planeTop(200, 120, 0.26, { rot: 0 }) + planeTop(200, 50, 0.26, { rot: 180 }) + `<path d="M200 104 Q 204 92 222 86" stroke="${C.gr}" stroke-width="2" fill="none"/><path d="M200 66 Q 196 78 178 84" stroke="${C.gr}" stroke-width="2" fill="none"/>`;
      s += box(272, '③ 追い越し', '右へ離れて抜く');
      s += planeTop(334, 64, 0.26, { rot: 0 }) + planeTop(334, 126, 0.26, { rot: 0 }) + `<path d="M334 110 Q 360 92 358 66" stroke="${C.gr}" stroke-width="2" fill="none"/>` + T(306, 66, '前', { c: C.am, fs: 12 });
      s += T(8, 184, '優先の順（左ほど優先・91.113(c)(d)）', { c: C.ink, b: 1, a: 'start', fs: 12 });
      [['遭難機', '気球', 'グライダー'], ['曳航・給油中の機', '飛行船', 'ほかの動力機']].forEach((row, r) => {
        let x = 8; const y = 194 + r * 32;
        row.forEach((t, i) => { const w = t.length * 12 + 14, c = r === 0 && i === 0 ? C.rd : C.cy; s += `<rect x="${x}" y="${y}" width="${w}" height="24" rx="12" fill="${c}" fill-opacity="0.15" stroke="${c}"/>` + T(x + w / 2, y + 16, t, { c: C.ink, fs: 12 }); x += w; if (r === 0 || i < 2) { s += T(x + 9, y + 16, '＞', { c: C.mut, fs: 12 }); } x += 18; });
      });
      s += TL(8, 266, ['着陸の最終進入中・着陸中の機が優先。2 機が着陸に向かうときは', '低いほうが優先（ただし、最終進入中の機の前に割り込まない）'], { c: C.ink, a: 'start', fs: 12, lh: 16 });
      return svg(400, 292, s, '図：衝突を避ける優先の決まり（14 CFR 91.113）。優先権のある機の上・下・前を、十分に離れずに横切ってはいけません。優先権があっても、見張りの義務はみんなにあります');
    },
    // ---------------------------------------------------------------- 第 7 章 radio1（無線交信のしくみ）
    radioRelay() {
      // one training flight at the fictional LAB: who you talk to, in order (frequencies from radio.js; made-up teaching values)
      const box = (x, y, n, st, fr, what, c) => `<rect x="${x}" y="${y}" width="88" height="70" rx="8" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`
        + T(x + 44, y + 18, `${n} ${st}`, { c, b: 1, fs: 12 }) + T(x + 44, y + 36, fr, { c: C.ink, fs: 12 }) + T(x + 44, y + 56, what, { c: C.mut, fs: 12 });
      let s = T(12, 20, '出発', { c: C.ink, b: 1, a: 'start', fs: 13 }) + T(12, 186, '帰り', { c: C.ink, b: 1, a: 'start', fs: 13 });
      s += box(8, 30, '①', 'ATIS', '聞くだけ', '出発前に', C.mut) + box(106, 30, '②', 'Ground', '121.7', 'タキシー', C.gr) + box(204, 30, '③', 'Tower', '118.3', '離陸', C.am) + box(302, 30, '④', 'Departure', '119.75', 'レーダー', C.cy);
      s += A(96, 65, 104, 65, C.ink, 2) + A(194, 65, 202, 65, C.ink, 2) + A(292, 65, 300, 65, C.ink, 2);
      s += A(346, 102, 346, 128, C.ink, 2) + `<rect x="250" y="130" width="142" height="26" rx="13" fill="none" stroke="${C.vi}" stroke-dasharray="5 4"/>` + T(321, 148, '訓練空域（VFR 1200）', { c: C.vi, fs: 12 });
      s += A(300, 156, 294, 196, C.ink, 2);
      s += box(204, 196, '⑤', 'Approach', 'ATIS のあと', '帰り', C.cy) + box(106, 196, '⑥', 'Tower', '118.3', '場周・着陸', C.am) + box(8, 196, '⑦', 'Ground', '121.7', '駐機場へ', C.gr);
      s += A(202, 231, 196, 231, C.ink, 2) + A(104, 231, 98, 231, C.ink, 2);
      s += T(392, 210, '周波数は', { c: C.mut, a: 'end', fs: 12 }) + T(392, 226, '架空の練習用', { c: C.mut, a: 'end', fs: 12 });
      s += L(8, 280, 392, 280, C.grid, 1) + T(8, 300, '周波数を変える合図', { c: C.ink, b: 1, a: 'start', fs: 12 });
      s += T(8, 320, '② Ground → ③ Tower：準備ができたら自分で変える', { c: C.ink, a: 'start', fs: 12 }) + T(8, 338, '（AIM 4-3-14）', { c: C.mut, a: 'start', fs: 12 });
      s += T(8, 358, 'ほか：管制官の “contact …” か、自分の要求のあと', { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 370, s, '図：架空の LAB での 1 回の訓練飛行で話す相手（局）の順番。地上は Ground、滑走路と場周は Tower、空港を離れたら Departure、帰りは ATIS を聞いてから Approach を呼びます');
    },
    radioAudioPanel() {
      // a G1000-type COM window and audio panel (the app's starting values in avionics.js; teaching frequencies)
      let s = `<rect x="8" y="30" width="384" height="66" rx="8" fill="#06101c" stroke="${C.mut}"/>`;
      const row = (y, name, act, stby, on) => T(22, y, name, { c: on ? C.cy : C.mut, b: 1, a: 'start', fs: 13 }) + T(150, y, act, { c: on ? C.gr : C.ink, b: 1, fs: 15 }) + T(214, y, '⇄', { c: C.mut, fs: 14 }) + T(280, y, stby, { c: on ? C.cy : C.mut, fs: 15 }) + (on ? `<rect x="236" y="${y - 18}" width="88" height="24" rx="4" fill="none" stroke="${C.cy}"/>` : '');
      s += row(56, 'COM1', '118.300', '121.700', true) + row(84, 'COM2', '126.950', '120.100', false) + T(150, 22, '使用中', { c: C.mut, fs: 12 }) + T(280, 22, '予備（ここを合わせる）', { c: C.mut, fs: 12 });
      s += `<rect x="8" y="108" width="384" height="96" rx="8" fill="#141f30" stroke="${C.mut}"/>` + T(22, 128, 'オーディオパネル', { c: C.ink, b: 1, a: 'start', fs: 13 });
      const btn = (x, y, t, on, c) => `<rect x="${x}" y="${y}" width="66" height="26" rx="5" fill="${on ? c : '#0b1422'}" fill-opacity="${on ? 0.35 : 1}" stroke="${on ? c : C.mut}"/>` + T(x + 33, y + 17, t, { c: on ? C.ink : C.mut, b: on ? 1 : 0, fs: 12 });
      s += T(22, 156, '送信', { c: C.ink, a: 'start', fs: 12 }) + btn(64, 140, 'COM1 MIC', true, C.am) + btn(136, 140, 'COM2 MIC', false, C.am);
      s += T(22, 190, '受信', { c: C.ink, a: 'start', fs: 12 }) + btn(64, 174, 'COM1', true, C.gr) + btn(136, 174, 'COM2', false, C.gr) + btn(208, 174, 'NAV1', false, C.gr) + btn(280, 174, 'NAV2', false, C.gr);
      s += TL(222, 158, ['MIC：どの無線機で話すか'], { c: C.am, a: 'start', fs: 12 });
      s += `<rect x="8" y="216" width="384" height="44" rx="8" fill="${C.rd}" fill-opacity="0.1" stroke="${C.rd}"/>` + TL(200, 234, ['よくある失敗：COM2 に周波数を合わせたのに、', 'MIC が COM1 のまま（相手に届かない）'], { c: C.ink, fs: 12, lh: 16 });
      s += T(12, 282, '手順：予備に合わせる → ⇄ → MIC を選ぶ → 聞いてから PTT', { c: C.ink, b: 1, a: 'start', fs: 12 });
      return svg(400, 292, s, '図：G1000 型の無線の窓とオーディオパネル（模式図。周波数は練習用）。予備の周波数を合わせてから ⇄ で使用中にし、オーディオパネルで送信（MIC）と受信の無線機を選びます');
    },
    radioCallAnatomy() {
      // one ground instruction from radio.js split into its parts, and the kneeboard shorthand
      const parts = [['Archer Seven Lima Alpha,', '自分', C.gr], ['LAB Ground,', '局の名前', C.mut], ['runway three six,', '滑走路', C.am], ['taxi via Alpha,', '経路', C.cy], ['hold short of taxiway Charlie.', '止まる所', C.rd], ['Departure frequency one one niner point seven five,', '出発周波数', C.vi], ['squawk four two seven one.', 'コード', C.bl]];
      let s = '', y = 22;
      parts.forEach(([en, jp, c]) => { s += `<rect x="8" y="${y - 15}" width="6" height="20" fill="${c}"/>` + T(22, y, en, { c: C.ink, a: 'start', fs: 12 }) + T(392, y, jp, { c, b: 1, a: 'end', fs: 12 }); y += 24; });
      s += `<rect x="8" y="${y + 2}" width="384" height="62" rx="8" fill="#e8e2c8" fill-opacity="0.95"/>` + T(20, y + 22, 'ひざ板のメモ', { c: '#2a2a2a', b: 1, a: 'start', fs: 12 });
      s += `<text x="20" y="${y + 48}" fill="#1a1a1a" font-size="17" font-family="ui-monospace, Menlo, Consolas, monospace">36  A  HS C  119.75  4271</text>`;
      return svg(400, y + 74, s, '図：地上管制の指示を部分に分けたもの（架空の LAB）。あなたのコールサイン → 局の名前（最初の交信だけ）→ 滑走路 → 経路 → 止まる所 → 出発周波数 → コードの順。出発周波数とコードを Ground が伝えるのは、LAB のようにレーダーの出発管制がある空港の例です。聞いた順に、短い記号でひざ板に書きます');
    },
    // ---------------------------------------------------------------- 第 8 章 radio2（言葉の決まり）
    phoneticBoard() {
      // the ICAO phonetic alphabet and the figures as the AIM's table spells and pronounces them (TBL 4-2-7)
      const AB = [['A', 'Alfa', 'AL-FAH'], ['B', 'Bravo', 'BRAH-VOH'], ['C', 'Charlie', 'CHAR-LEE'], ['D', 'Delta', 'DELL-TAH'], ['E', 'Echo', 'ECK-OH'], ['F', 'Foxtrot', 'FOKS-TROT'], ['G', 'Golf', 'GOLF'], ['H', 'Hotel', 'HOH-TEL'], ['I', 'India', 'IN-DEE-AH'], ['J', 'Juliett', 'JEW-LEE-ETT'], ['K', 'Kilo', 'KEY-LOH'], ['L', 'Lima', 'LEE-MAH'], ['M', 'Mike', 'MIKE'],
        ['N', 'November', 'NO-VEM-BER'], ['O', 'Oscar', 'OSS-CAH'], ['P', 'Papa', 'PAH-PAH'], ['Q', 'Quebec', 'KEH-BECK'], ['R', 'Romeo', 'ROW-ME-OH'], ['S', 'Sierra', 'SEE-AIR-RAH'], ['T', 'Tango', 'TANG-GO'], ['U', 'Uniform', 'YOU-NEE-FORM'], ['V', 'Victor', 'VIK-TAH'], ['W', 'Whiskey', 'WISS-KEY'], ['X', 'Xray', 'ECKS-RAY'], ['Y', 'Yankee', 'YANG-KEY'], ['Z', 'Zulu', 'ZOO-LOO']];
      let s = '';
      AB.forEach(([k, w, p], i) => {
        const col = i < 13 ? 0 : 1, x = 10 + col * 196, y = 22 + (i % 13) * 19;
        if ((i % 13) % 2 === 0) s += `<rect x="${x - 4}" y="${y - 13}" width="190" height="18" fill="${C.ink}" fill-opacity="0.04"/>`;
        s += T(x, y, k, { c: C.am, b: 1, a: 'start', fs: 13 }) + T(x + 20, y, w, { c: C.ink, b: 1, a: 'start', fs: 12 }) + T(x + 94, y, p, { c: C.mut, a: 'start', fs: 12 });
      });
      const D = [['1', 'WUN'], ['2', 'TOO'], ['3', 'TREE'], ['4', 'FOW-ER'], ['5', 'FIFE'], ['6', 'SIX'], ['7', 'SEV-EN'], ['8', 'AIT'], ['9', 'NIN-ER'], ['0', 'ZEE-RO']];
      s += L(10, 270, 390, 270, C.grid, 1);
      D.forEach(([k, p], i) => { const x = 10 + (i % 5) * 78, y = 292 + Math.floor(i / 5) * 20; s += T(x, y, k, { c: C.cy, b: 1, a: 'start', fs: 13 }) + T(x + 14, y, p, { c: C.ink, a: 'start', fs: 12 }); });
      s += T(10, 344, '例：N7LA → November Seven Lima Alfa', { c: C.gr, b: 1, a: 'start', fs: 12 });
      return svg(400, 354, s, '図：フォネティックアルファベットと数字の発音（AIM の表 TBL 4-2-7 のつづりと読み方）。C は SHAR-LEE、U は OO-NEE-FORM とも読みます。X は X-ray と書く資料もあります。AIM の例文には Alpha とつづるものもあり、この本のコールサインも Alpha と書きます');
    },
    // ---------------------------------------------------------------- 第 9 章 radio3（交信の型）
    callupBlocks() {
      // radio.js FLIGHT gnd1's first call, split into AIM 4-2-3's items: facility → call sign → position → request
      const rows = [['①', '相手', '誰を呼ぶ', ['LAB Ground,'], '局の名前', C.cy],
        ['②', '自分', '自分は誰', ['Archer Seven Lima Alpha,'], '＋ student pilot（学生操縦士）', C.gr],
        ['③', '場所', 'どこにいる', ['at the west ramp'], '＋ with information Bravo（ATIS の記号）', C.am],
        ['④', '要求', '何をしたい', ['VFR to the northeast practice area', 'at three thousand five hundred,', 'request taxi.'], '', C.vi]];
      let s = '', y = 8;
      rows.forEach(([n, jp, sub, en, add, c]) => {
        const h = en.length > 1 ? 74 : 56;
        s += `<rect x="8" y="${y}" width="384" height="${h}" rx="8" fill="${c}" fill-opacity="0.10" stroke="${c}" stroke-width="1.5"/>`
          + `<rect x="8" y="${y}" width="88" height="${h}" rx="8" fill="${c}" fill-opacity="0.30"/>`
          + T(52, y + h / 2 - 3, `${n} ${jp}`, { c: C.ink, b: 1, fs: 14 }) + T(52, y + h / 2 + 15, sub, { c: C.ink, fs: 12 });
        if (en.length > 1) s += TL(106, y + 22, en, { c: C.ink, b: 1, a: 'start', fs: 13, lh: 20 });
        else s += T(106, y + 24, en[0], { c: C.ink, b: 1, a: 'start', fs: 13 }) + T(106, y + 44, add, { c: n === '①' ? C.mut : c, a: 'start', fs: 12 });
        y += h + 8;
      });
      s += T(8, y + 14, '空中では ③ の代わりに、位置と高度を言う', { c: C.ink, a: 'start', fs: 12 });
      return svg(400, y + 24, s, '図：最初の呼び出しの型（AIM 4-2-3）。誰を呼ぶ → 自分は誰 → どこにいる → 何をしたい、の順に言います。例は架空の LAB の Ground への呼び出しです');
    },
    readbackLoop() {
      // the readback loop with radio.js gnd1's taxi instruction, and what must be read back (AIM 4-4-7 airborne, AIM 4-3-18 on the ground)
      const bub = (x, y, w, h, c, head, lines) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`
        + T(x + 12, y + 20, head, { c, b: 1, a: 'start', fs: 13 }) + TL(x + 12, y + 40, lines, { c: C.ink, a: 'start', fs: 12, lh: 17 });
      let s = bub(36, 8, 356, 66, C.cy, '① 管制官の指示', ['Archer Seven Lima Alpha, runway three six,', 'taxi via Alpha, hold short of taxiway Charlie.']);
      s += bub(36, 88, 356, 66, C.gr, '② あなたの復唱', ['Runway three six, taxi via Alpha,', 'hold short of Charlie, Archer 7LA.']);
      s += `<rect x="36" y="168" width="356" height="62" rx="10" fill="${C.am}" fill-opacity="0.12" stroke="${C.am}" stroke-width="1.5"/>` + T(48, 188, '③ 管制官が聞いて確かめる', { c: C.am, b: 1, a: 'start', fs: 13 });
      s += T(48, 210, '合っている → 次へ', { c: C.gr, a: 'start', fs: 12 }) + T(196, 210, '違う → 管制官が直す（① へ）', { c: C.rd, a: 'start', fs: 12 });
      s += A(214, 74, 214, 86, C.ink, 2) + A(214, 154, 214, 166, C.ink, 2);
      // back to ① when it was wrong
      s += P([[36, 220], [18, 220], [18, 40]], C.rd, 2, 'none', '5 4') + A(18, 40, 34, 40, C.rd, 2);
      // what must be read back
      s += T(8, 256, '必ず復唱するもの', { c: C.ink, b: 1, a: 'start', fs: 13 });
      // a row of rounded labels, laid out left to right (width from the text: CJK ≈ 12 px, latin ≈ 7 px at size 12)
      const chips = (x, y, list, c) => list.map(tx => { const w = [...tx].reduce((a, ch) => a + (ch > '\u3000' ? 12 : 7), 14), r = `<rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="${c}" fill-opacity="0.18" stroke="${c}"/>` + T(x + w / 2, y + 15, tx, { c: C.ink, fs: 12 }); x += w + 6; return r; }).join('');
      s += T(8, 282, '空中', { c: C.cy, b: 1, a: 'start', fs: 12 }) + T(8, 298, 'AIM 4-4-7', { c: C.mut, a: 'start', fs: 12 });
      s += chips(80, 268, ['高度', '高度の制限', '針路（vector）', '滑走路の指定'], C.cy);
      s += T(8, 330, '地上', { c: C.gr, b: 1, a: 'start', fs: 12 }) + T(8, 346, 'AIM 4-3-18', { c: C.mut, a: 'start', fs: 12 });
      s += chips(80, 316, ['滑走路の指定', '滑走路に入る許可'], C.gr) + chips(80, 346, ['滑走路の hold short', 'line up and wait'], C.gr);
      s += T(8, 392, '“Roger” だけ → 管制官「read back hold instructions」', { c: C.rd, a: 'start', fs: 12 });
      return svg(400, 404, s, '図：復唱の輪。指示を言われた順に復唱し、管制官が聞いて確かめます。下は、AIM が必ず復唱するとしているもの。hold short に Roger だけで答えると、管制官は復唱を求めます（JO 7110.65 3-7-2）');
    },
    // ---------------------------------------------------------------- 第 10 章 radio4（1 回の飛行の交信）
    flightOverviewMap() {
      // the whole training flight at the fictional LAB (a Class C-type airport): the usual Class C rings (AIM 3-2-4), the
      // way out to the northeast practice area and the way back, with the stations in order (radio.js FLIGHT; made-up frequencies)
      const cx = 150, cy = 214, k = 7.2, P2 = (brg, nm) => [cx + nm * k * Math.sin(brg * DEG), cy - nm * k * Math.cos(brg * DEG)];
      const f = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
      let s = `<circle cx="${cx}" cy="${cy}" r="${20 * k}" fill="none" stroke="${C.vi}" stroke-width="1.2" stroke-dasharray="5 5"/>`
        + `<circle cx="${cx}" cy="${cy}" r="${10 * k}" fill="${C.vi}" fill-opacity="0.06" stroke="${C.vi}" stroke-width="2"/>`
        + `<circle cx="${cx}" cy="${cy}" r="${5 * k}" fill="${C.vi}" fill-opacity="0.10" stroke="${C.vi}" stroke-width="2"/>`;
      s += L(cx, cy - 8, cx, cy + 8, C.ink, 4) + T(cx - 22, cy + 4, 'LAB', { c: C.ink, b: 1, a: 'end', fs: 12, halo: 1 });
      s += T(cx, cy + 5 * k + 16, '5 NM：地上から', { c: C.vi, fs: 12, halo: 1 }) + T(cx, cy + 10 * k + 16, '10 NM：標高＋1,200 ft から', { c: C.vi, fs: 12, halo: 1 });
      s += T(cx, cy + 20 * k - 6, '20 NM：外側の区域', { c: C.vi, fs: 12, halo: 1 });
      // the practice area, northeast, outside the 10 NM shelf
      const [px, py] = P2(45, 22);
      s += `<rect x="${(px - 50).toFixed(1)}" y="${(py - 24).toFixed(1)}" width="100" height="48" rx="12" fill="${C.gr}" fill-opacity="0.08" stroke="${C.gr}" stroke-dasharray="6 4"/>` + T(px, py - 4, '訓練空域', { c: C.gr, b: 1, fs: 12 }) + T(px, py + 13, 'VFR・1200', { c: C.gr, fs: 12 });
      // out: north on the runway heading, then a right turn to the northeast; back: from the northeast, round to the west and in at 45° to the left downwind
      const o1 = [cx + 2, cy - 12], o2 = [cx + 2, cy - 2.5 * k], o3 = P2(55, 9), o4 = [px - 20, py + 24];
      s += `<path d="M${f(o1)} L${f(o2)} Q${f([cx + 8, cy - 40])} ${f(o3)} L${f(o4)}" fill="none" stroke="${C.cy}" stroke-width="2.5"/>`;
      const r15 = P2(30, 15), r10 = P2(20, 10), e1 = P2(325, 4), dw = [cx - 16, cy - 4];
      s += `<path d="M${f([px - 50, py + 6])} L${f(r15)} L${f(r10)} L${f(e1)} L${f(dw)} L${f([cx - 16, cy + 16])}" fill="none" stroke="${C.am}" stroke-width="2.5" stroke-dasharray="7 4"/>`;
      s += A(cx - 16, cy + 6, cx - 16, cy + 20, C.am, 2.5);
      const dot = ([x, y], c) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${c}" stroke="${C.bg}" stroke-width="1.5"/>`;
      s += dot(r15, C.am) + dot(r10, C.am) + dot(P2(25, 4.5), C.cy);
      // the stations, in order
      const tag = (x, y, t, c, a = 'start') => T(x, y, t, { c, b: 1, a, fs: 12, halo: 1 });
      s += tag(cx - 26, cy + 22, '①ATIS ②Ground', C.ink, 'end') + tag(cx - 26, cy + 38, '③Tower', C.ink, 'end');
      s += tag(P2(25, 4.5)[0] + 8, P2(25, 4.5)[1] + 16, '④ Departure 119.75', C.cy);
      s += tag(r15[0] - 8, r15[1] + 4, '⑤ Approach（15 NM）', C.am, 'end') + tag(r10[0] - 8, r10[1] + 4, '⑥ Tower（10 NM）', C.am, 'end');
      s += tag(cx + 10, cy + 22, '⑦ Ground', C.am);
      // legend and the stamp
      s += L(12, 22, 36, 22, C.cy, 2.5) + T(42, 26, '行き', { c: C.ink, a: 'start', fs: 12 }) + L(12, 42, 36, 42, C.am, 2.5, '7 4') + T(42, 46, '帰り', { c: C.ink, a: 'start', fs: 12 });
      s += T(12, 66, 'N ↑', { c: C.mut, b: 1, a: 'start', fs: 12 }) + NFN(392, 392);
      return svg(400, 402, s, '図：この章の飛行の全体（架空の LAB。模式図）。紫の円は Class C 空域のふつうの形（半径 5 NM・10 NM と、外側の区域 20 NM。AIM 3-2-4）。行きは Ground → Tower → Departure、帰りは 15 NM で Approach、10 NM で Tower を呼び、左ダウンウインドに入ります');
    },
    patternCalls() {
      // the left traffic pattern to LAB runway 36 and where each call is made on the way in (radio.js FLIGHT app/twr2;
      // downwind 1,000 ft above the ground, 90 kt, about 1.6 km from the runway: the lesson t2's teaching values)
      const rx = 270, top = 120, thr = 270, dwx = 120, by = 330;
      let s = `<rect x="${rx - 7}" y="${top}" width="14" height="${thr - top}" fill="#3a4658" stroke="${C.mut}"/>` + T(rx, thr - 8, '36', { c: C.ink, b: 1, fs: 12 });
      // taxiway Charlie off to the right (east), and its hold line
      const cy0 = 210;
      s += `<rect x="${rx + 7}" y="${cy0 - 5}" width="60" height="10" fill="#2b3544"/>` + L(rx + 22, cy0 - 7, rx + 22, cy0 + 7, C.am, 2) + T(rx + 70, cy0 + 4, 'C', { c: C.am, b: 1, a: 'start', fs: 12 });
      // the pattern: crosswind, downwind (west), base, final
      s += P([[rx, top - 6], [rx, 96], [dwx, 96], [dwx, by], [rx, by], [rx, thr + 4]], C.cy, 2.5);
      s += A(dwx, 150, dwx, 172, C.cy, 2.5) + A(150, by, 174, by, C.cy, 2.5) + A(rx, 300, rx, 280, C.cy, 2.5);
      s += T(dwx - 8, 226, 'ダウンウインド', { c: C.cy, a: 'end', fs: 12 }) + T(dwx - 8, 242, '地上 1,000 ft', { c: C.mut, a: 'end', fs: 12 }) + T(dwx - 8, 258, '90 kt', { c: C.mut, a: 'end', fs: 12 });
      s += T(195, by + 18, 'ベース', { c: C.cy, fs: 12 }) + T(rx + 10, 300, 'ファイナル', { c: C.cy, a: 'start', fs: 12 });
      // the entry at 45° to midfield downwind
      s += A(36, 132, dwx - 4, 190, C.am, 2.5) + T(14, 120, '45° で入る', { c: C.am, a: 'start', fs: 12 });
      // the calls
      const pin = (x, y, n, c) => `<circle cx="${x}" cy="${y}" r="10" fill="${c}" stroke="${C.bg}" stroke-width="1.5"/>` + T(x, y + 4, n, { c: C.bg, b: 1, fs: 12 });
      s += pin(dwx, 196, '1', C.am) + pin(dwx, 292, '2', C.am) + pin(rx + 22, cy0, '3', C.gr);
      // the Cessna ahead on left base
      s += planeTop(222, by, 0.22, { rot: 90 }) + T(222, by - 16, '前の Cessna', { c: C.mut, fs: 12 });
      // the list
      const L3 = [['1', 'midfield で報告：“midfield left downwind”', C.am], ['2', '“number two, follow the Cessna … cleared to land”', C.am], ['3', '滑走路を出て停止線を越えたら止まる → “contact Ground”', C.gr]];
      L3.forEach(([n, t, c], i) => { s += pin(18, 380 + i * 26, n, c) + T(36, 384 + i * 26, t, { c: C.ink, a: 'start', fs: 12 }); });
      s += T(392, 22, '10 NM 手前で Tower を呼ぶ', { c: C.ink, a: 'end', fs: 12 }) + T(392, 40, '（北東から）', { c: C.mut, a: 'end', fs: 12 }) + A(352, 52, 306, 88, C.ink, 2);
      s += NFN(392, 456);
      return svg(400, 466, s, '図：LAB の滑走路 36 の左回りの場周経路と、どこで何を言うか（模式図）。ダウンウインドの高さと速さは教材値。中央（midfield）で報告し、着陸の許可と順番をもらい、着陸したら停止線を越えて止まってから Ground に変えます');
    },
    // ---------------------------------------------------------------- 第 11 章 radio5（管制塔のない空港・緊急・Sanford）
    ctafCalls() {
      // the left traffic pattern to runway 18 at the fictional non-towered Lakeside (radio.js r_ctaf_*), with the
      // self-announce points of AIM 4-1-9 (TBL 4-1-9) and the pattern altitude of AIM 4-3-3
      const rx = 150, top = 120, bot = 270, dwx = 290, by = 46, cwy = 300;
      let s = `<rect x="${rx - 7}" y="${top}" width="14" height="${bot - top}" fill="#3a4658" stroke="${C.mut}"/>` + T(rx, top + 18, '18', { c: C.ink, b: 1, fs: 12 }) + T(rx, bot - 6, '36', { c: C.mut, fs: 12 });
      s += T(rx - 14, 200, 'Lakeside', { c: C.ink, b: 1, a: 'end', fs: 12 }) + T(rx - 14, 216, '（架空）', { c: C.mut, a: 'end', fs: 12 });
      // the pattern: downwind north on the east side, base west, final south
      s += P([[rx, bot + 4], [rx, cwy], [dwx, cwy], [dwx, by], [rx, by], [rx, top - 4]], C.cy, 2.5);
      s += A(dwx, 170, dwx, 146, C.cy, 2.5) + A(240, by, 216, by, C.cy, 2.5) + A(rx, 80, rx, 102, C.cy, 2.5) + A(220, cwy, 244, cwy, C.cy, 2.5);
      s += T(dwx + 8, 120, 'ダウンウインド', { c: C.cy, a: 'start', fs: 12 }) + T(dwx + 8, 136, '地上 1,000 ft', { c: C.mut, a: 'start', fs: 12 });
      s += T(220, by - 10, 'ベース', { c: C.cy, fs: 12 }) + T(rx - 10, 84, 'ファイナル', { c: C.cy, a: 'end', fs: 12 });
      // the entry at 45° to midfield downwind, from the southeast
      s += A(386, 286, dwx + 4, 202, C.am, 2.5) + T(392, 304, '45° で入る', { c: C.am, a: 'end', fs: 12 });
      const pin = (x, y, n) => `<circle cx="${x}" cy="${y}" r="10" fill="${C.am}" stroke="${C.bg}" stroke-width="1.5"/>` + T(x, y + 4, n, { c: C.bg, b: 1, fs: 12 });
      s += `<rect x="${rx + 7}" y="226" width="30" height="8" fill="#2b3544"/>`;
      s += pin(370, 240, '1') + pin(dwx, 200, '2') + pin(250, by, '3') + pin(rx, 64, '4') + pin(rx + 24, 230, '5');
      const L5 = ['10 マイル手前：位置・高度', 'ダウンウインドに入る', 'ベースに入る', 'ファイナルに入る', '滑走路を出た'];
      L5.forEach((t, i) => { const x = i < 3 ? 8 : 204, y = 344 + (i % 3) * 24; s += pin(x + 10, y - 4, String(i + 1)) + T(x + 26, y, t, { c: C.ink, a: 'start', fs: 12 }); });
      s += T(8, 422, 'どの通報も：“Lakeside traffic, …, Lakeside.”', { c: C.ink, b: 1, a: 'start', fs: 12 }) + NFN(392, 446);
      return svg(400, 456, s, '図：管制塔のない架空の空港 Lakeside の滑走路 18 の左場周（模式図）と、CTAF で自己通報する所（AIM 4-1-9）。場周の高さはプロペラ機で地上 1,000 ft（AIM 4-3-3）。出発のときは、タキシーの前と滑走路に入る前にも言います');
    },
    lightGunSignals() {
      // the tower's light gun signals and what they mean (14 CFR 91.125, AIM 4-3-13 TBL 4-3-13); how to answer (AIM 4-2-13, 4-3-13)
      const G = '#38e07b', Rd = '#ff4d4d', W = '#f4f4f4';
      const rows = [[[G], 0, '緑の連続', ['離陸してよい'], ['着陸してよい']], [[G], 1, '緑の点滅', ['タキシーしてよい'], ['着陸のため戻れ', '（あとで緑の連続）']],
        [[Rd], 0, '赤の連続', ['止まれ'], ['ほかの機に譲り、', '旋回を続けよ']], [[Rd], 1, '赤の点滅', ['使っている滑走路', 'から出よ'], ['空港は危険。', '着陸するな']],
        [[W], 1, '白の点滅', ['出発した所へ', '戻れ'], ['—']], [[Rd, G], 2, '赤と緑の交互', ['十分に注意せよ'], ['十分に注意せよ']]];
      let s = T(140, 20, '地上の機', { c: C.mut, b: 1, a: 'start', fs: 12 }) + T(272, 20, '飛行中の機', { c: C.mut, b: 1, a: 'start', fs: 12 });
      rows.forEach(([cs, kind, name, g, f], i) => {
        const y = 34 + i * 44, cy = y + 18;
        if (i % 2 === 0) s += `<rect x="4" y="${y}" width="392" height="44" fill="${C.ink}" fill-opacity="0.04"/>`;
        if (kind === 0) s += `<circle cx="22" cy="${cy}" r="11" fill="${cs[0]}" fill-opacity="0.25"/><circle cx="22" cy="${cy}" r="7" fill="${cs[0]}"/>`;
        else if (kind === 1) s += `<circle cx="22" cy="${cy}" r="9" fill="none" stroke="${cs[0]}" stroke-width="3" stroke-dasharray="4 3"/><circle cx="22" cy="${cy}" r="3.5" fill="${cs[0]}"/>`;
        else s += `<path d="M22 ${cy - 8} A8 8 0 0 0 22 ${cy + 8} Z" fill="${cs[0]}"/><path d="M22 ${cy - 8} A8 8 0 0 1 22 ${cy + 8} Z" fill="${cs[1]}"/>`;
        s += T(40, cy + 4, name, { c: C.ink, b: 1, a: 'start', fs: 12 });
        s += TL(140, g.length > 1 ? cy - 3 : cy + 4, g, { c: C.ink, a: 'start', fs: 12, lh: 15 }) + TL(272, f.length > 1 ? cy - 3 : cy + 4, f, { c: C.ink, a: 'start', fs: 12, lh: 15 });
      });
      s += T(8, 316, '● は連続、破線の輪は点滅', { c: C.mut, a: 'start', fs: 12 });
      s += `<rect x="4" y="326" width="392" height="58" rx="8" fill="${C.cy}" fill-opacity="0.10" stroke="${C.cy}"/>` + T(14, 346, '応え方', { c: C.cy, b: 1, a: 'start', fs: 12 });
      s += T(14, 364, '飛行中：昼は翼を振る・夜は着陸灯か航空灯を点滅', { c: C.ink, a: 'start', fs: 12 }) + T(14, 380, '地上：昼はエルロンかラダーを動かす・夜は灯火を点滅', { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 392, s, '図：管制塔の灯火信号（14 CFR 91.125・AIM 4-3-13）と、応え方（AIM 4-2-13・4-3-13）。同じ色でも、地上と飛行中で意味が違います');
    },
    sfbLayout() {
      // Orlando Sanford (KSFB): the runways drawn from their ends' coordinates in the FAA's airport data (effective
      // 2026-10-01, as AirNav shows it); hot spot HS1 at runway 18 and 27C (FAA From the Flight Deck: SFB). Schematic.
      const ends = { '9L': [46.904128, 15.357287], '27R': [46.907332, 13.296698], '9C': [46.707225, 14.728423], '27C': [46.708125, 14.058365],
        '9R': [46.196700, 14.030183], '27L': [46.198235, 12.936635], '18': [46.997100, 14.087235], '36': [46.006722, 14.085012] };   // N 28° (min), W 081° (min)
      const kx = 1852 * Math.cos(28.78 * DEG), ky = 1852, sc = 0.085;                                    // metres per minute, px per metre
      const X = ([, lon]) => 30 + (15.357 - lon) * kx * sc, Y = ([lat]) => 30 + (47.0 - lat) * ky * sc;
      const rw = (a, b, w, c, la, lb) => { const p = ends[a], q = ends[b]; return `<line x1="${X(p).toFixed(1)}" y1="${Y(p).toFixed(1)}" x2="${X(q).toFixed(1)}" y2="${Y(q).toFixed(1)}" stroke="${c}" stroke-width="${w}"/>`
        + T(X(p) + la[0], Y(p) + la[1], a, { c: C.ink, b: 1, fs: 12, halo: 1 }) + T(X(q) + lb[0], Y(q) + lb[1], b, { c: C.ink, b: 1, fs: 12, halo: 1 }); };
      let s = rw('9L', '27R', 6, '#5d6b80', [-14, 4], [16, 4]) + rw('9C', '27C', 4, '#5d6b80', [-14, 4], [22, 20]) + rw('9R', '27L', 4, C.gr, [8, -10], [16, 4]) + rw('18', '36', 6, '#5d6b80', [0, -10], [0, 16]);
      s += T((X(ends['9L']) + X(ends['27R'])) / 2 - 40, Y(ends['9L']) - 10, '9L/27R：おもな運用', { c: C.mut, fs: 12, halo: 1 });
      s += T((X(ends['9R']) + X(ends['27L'])) / 2 + 20, Y(ends['9R']) + 20, '9R/27L：おもな飛行訓練', { c: C.gr, fs: 12, halo: 1 });
      const hx = X(ends['18']), hy = Y(ends['27C']);
      s += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="13" fill="none" stroke="${C.rd}" stroke-width="2.5"/>` + T(hx + 16, hy - 12, 'HS1', { c: C.rd, b: 1, a: 'start', fs: 12, halo: 1 });
      // scale and north
      const m1000 = 1000 * sc;
      s += L(14, 214, 14 + m1000, 214, C.ink, 2) + L(14, 209, 14, 219, C.ink, 2) + L(14 + m1000, 209, 14 + m1000, 219, C.ink, 2) + T(14 + m1000 + 6, 218, '1,000 m', { c: C.mut, a: 'start', fs: 12 });
      s += T(388, 24, 'N ↑', { c: C.mut, b: 1, a: 'end', fs: 12 });
      s += `<rect x="4" y="230" width="392" height="60" rx="8" fill="${C.rd}" fill-opacity="0.08" stroke="${C.rd}"/>` + T(14, 250, 'HS1（FAA）', { c: C.rd, b: 1, a: 'start', fs: 12 });
      s += T(14, 268, '滑走路 18 から誘導路 C へ右に出るはずが、', { c: C.ink, a: 'start', fs: 12 }) + T(14, 284, '滑走路 27C へ曲がってしまう取り違え', { c: C.ink, a: 'start', fs: 12 });
      s += NFN(392, 310);
      return svg(400, 320, s, '図：Orlando Sanford（KSFB）の滑走路の配置（模式図。FAA の空港データの滑走路端の位置から描いたもの。誘導路は省略）。平行な 3 本の進入端がずれていて、交差する 18/36 があります。赤い円は Hot Spot HS1');
    },
    // ---------------------------------------------------------------- 第 12 章 hf（人間の能力と判断）
    vestibular() {
      // a semicircular canal in four moments of a turn (PHAK chapter 17, Figure 17-4): the fluid lags, catches up, overshoots
      const panel = (px, py, n, title, turn, fluid, hair, feel, c) => {
        const cx = px + 52, cy = py + 74;
        let s = `<rect x="${px}" y="${py}" width="192" height="150" rx="8" fill="${C.ink}" fill-opacity="0.04" stroke="${C.grid}"/>`;
        s += T(px + 8, py + 18, `${n} ${title}`, { c: C.ink, b: 1, a: 'start', fs: 12 });
        s += `<circle cx="${cx}" cy="${cy}" r="30" fill="none" stroke="${C.mut}" stroke-width="9" stroke-opacity="0.45"/><circle cx="${cx}" cy="${cy}" r="30" fill="none" stroke="${C.cy}" stroke-width="5" stroke-opacity="0.5"/>`;
        // the hair cells (cupula) at the bottom of the ring, bent by the fluid
        s += `<line x1="${cx}" y1="${cy + 36}" x2="${cx + hair * 9}" y2="${cy + 22}" stroke="${C.am}" stroke-width="4" stroke-linecap="round"/>`;
        if (turn) s += ARC(cx, cy, 42, 285, 380, C.gr, 2.5);
        if (fluid) s += ARC(cx, cy, 18, fluid > 0 ? 120 : 60, fluid > 0 ? 20 : 160, C.cy, 2);
        s += TL(px + 106, py + 52, feel, { c, a: 'start', fs: 12, lh: 16 });
        return s;
      };
      let s = panel(4, 4, '①', '回っていない', 0, 0, 0, ['何も', '感じない'], C.mut);
      s += panel(204, 4, '②', '回り始め', 1, 1, 1, ['液が遅れて', '毛が倒れる', '→ 回っている', 'と感じる'], C.ink);
      s += panel(4, 160, '③', '同じ速さで回る', 1, 0, 0, ['液が追いつき', '毛が戻る', '→ 止まって', 'いると感じる'], C.am);
      s += panel(204, 160, '④', '回るのを止める', 0, -1, -1, ['液が進み続け', '毛が逆に倒れる', '→ 反対に回って', 'いると感じる'], C.rd);
      s += L(10, 324, 26, 324, C.gr, 2.5) + T(30, 328, '機体の回転', { c: C.gr, a: 'start', fs: 12 }) + L(110, 324, 126, 324, C.cy, 2) + T(130, 328, '耳の中の液', { c: C.cy, a: 'start', fs: 12 }) + L(210, 318, 214, 330, C.am, 4) + T(222, 328, '感じる毛', { c: C.am, a: 'start', fs: 12 });
      return svg(400, 340, s, '図：三半規管（耳の奥の、液で満ちた輪）が回転を感じるしくみ（PHAK 第 17 章の図 17-4 をもとにした模式図）。③ で「止まっている」と感じ、④ で「反対に回っている」と感じるのが、墓場のスパイラルやリーンズのもとです');
    },
    hypoxiaAltitudes() {
      // altitude and oxygen: the AIM 8-1-2 recommendations and effects, and the 14 CFR 91.211 rules (cabin pressure altitude)
      const Y = ft => 372 - ft / 20000 * 340;
      let s = '';
      s += `<rect x="60" y="${Y(14000)}" width="22" height="${Y(12500) - Y(14000)}" fill="${C.am}" fill-opacity="0.45"/>` + `<rect x="60" y="${Y(20000)}" width="22" height="${Y(14000) - Y(20000)}" fill="${C.rd}" fill-opacity="0.45"/>`;
      s += L(82, Y(0), 82, Y(20000), C.ink, 2);
      for (const ft of [0, 5000, 10000, 15000, 20000]) s += L(76, Y(ft), 88, Y(ft), C.ink, 1.5) + T(54, Y(ft) + 4, ft.toLocaleString('en-US'), { c: C.mut, a: 'end', fs: 12 });
      s += T(8, 22, '機内の高度（ft）', { c: C.mut, a: 'start', fs: 12 });
      const mark = (ft, ty, lines, c) => L(88, Y(ft), 104, ty - 4, c, 1) + `<circle cx="82" cy="${Y(ft)}" r="3.5" fill="${c}"/>` + TL(108, ty, lines, { c, a: 'start', fs: 12, lh: 15 });
      s += mark(20000, 42, ['20,000：5〜12 分で対処できなくなる'], C.rd);
      s += mark(18000, 70, ['18,000：20〜30 分で対処できなくなる'], C.rd);
      s += mark(15000, 102, ['15,000 を超える：全員に酸素を用意（規則）'], C.rd);
      s += mark(14000, 134, ['14,000 を超える：乗員はずっと酸素（規則）'], C.rd);
      s += mark(12500, 166, ['12,500〜14,000：30 分を超える分は', '乗員が酸素（規則）'], C.am);
      s += mark(10000, 214, ['10,000 を超える：昼も酸素がすすめ'], C.cy);
      s += mark(5000, 286, ['5,000：夜の目が落ち始める', '5,000 を超える夜は酸素がすすめ'], C.cy);
      s += mark(3500, 340, ['3,500：この本の訓練空域の高さ'], C.gr);
      s += T(8, 396, '規則：14 CFR 91.211　すすめ・影響：AIM 8-1-2', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 406, s, '図：高度と酸素（機内の高度）。夜は 5,000 ft、昼は 10,000 ft を超えたら酸素がすすめ（AIM 8-1-2）。12,500 ft を超えると、規則で乗員の酸素が必要になります（14,000 ft までは 30 分を超える分。14 CFR 91.211）。対処できなくなるまでの時間は AIM 8-1-2 の値');
    },
    threePLoop() {
      // the 3P model of ADM with its three checklists (PHAK chapter 2): Perceive (PAVE) → Process (CARE) → Perform (TEAM), again and again
      const node = (x, y, head, tool, items, c) => `<rect x="${x}" y="${y}" width="176" height="92" rx="10" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`
        + T(x + 88, y + 20, head, { c, b: 1, fs: 13 }) + T(x + 88, y + 40, tool, { c: C.ink, b: 1, fs: 13 }) + TL(x + 88, y + 58, items, { c: C.mut, fs: 12, lh: 15 });
      let s = node(112, 6, '① Perceive 気づく', 'PAVE', ['自分・機体・環境', '・外からの圧力'], C.cy);
      s += node(218, 188, '② Process 評価する', 'CARE', ['結果・ほかの道', '・本当の状況・外の要因'], C.am);
      s += node(6, 188, '③ Perform 実行する', 'TEAM', ['ゆだねる・なくす', '・受け入れる・減らす'], C.gr);
      s += A(292, 102, 318, 182, C.ink, 2.5) + A(214, 236, 186, 236, C.ink, 2.5) + A(84, 182, 110, 102, C.ink, 2.5);
      s += T(200, 150, 'くり返す', { c: C.ink, b: 1, fs: 13 }) + T(200, 168, '（結果を確かめる）', { c: C.mut, fs: 12 });
      s += T(200, 304, '出発前から着陸まで、何度も回す', { c: C.ink, fs: 12 });
      return svg(400, 316, s, '図：判断の 3P モデル（PHAK 第 2 章）。PAVE で危険に気づき、CARE で評価し、TEAM で対策を選んで実行し、また気づくところに戻ります');
    },
    // ---------------------------------------------------------------- 第 13 章 ground（飛行前の準備・地上での操作）
    walkaroundRoute() {
      // the Archer from above and the walk-around route of the published Archer III checklist (2025): cabin → right wing →
      // nose → left wing → fuselage and tail, with the few numbers it gives (struts 4.5 / 3.25 in, oil 6 qt)
      const cx = 200, cy = 180, k = 2.1, dash = d => `<path d="${d}" fill="none" stroke="${C.am}" stroke-width="2.5" stroke-dasharray="6 5"/>`;
      let s = planeTop(cx, cy, k);
      const tag = (x, y, n, c) => `<circle cx="${x}" cy="${y}" r="13" fill="${c}" stroke="${C.bg}" stroke-width="2"/>` + T(x, y + 5, n, { c: C.bg, b: 1, fs: 13 });
      // the route, counter-clockwise seen from above (right wing first)
      s += dash(`M ${cx + 20} ${cy + 4} Q ${cx + 110} ${cy + 40} ${cx + 152} ${cy + 52}`) + A(cx + 140, cy + 49, cx + 152, cy + 52, C.am, 2.5);
      s += dash(`M ${cx + 172} ${cy + 36} Q ${cx + 176} ${cy - 120} ${cx + 34} ${cy - 136}`) + A(cx + 46, cy - 135, cx + 34, cy - 136, C.am, 2.5);
      s += dash(`M ${cx - 34} ${cy - 136} Q ${cx - 176} ${cy - 120} ${cx - 172} ${cy + 36}`) + A(cx - 172, cy + 24, cx - 172, cy + 36, C.am, 2.5);
      s += dash(`M ${cx - 150} ${cy + 120} Q ${cx - 110} ${cy + 156} ${cx - 34} ${cy + 158}`) + A(cx - 46, cy + 158, cx - 34, cy + 158, C.am, 2.5);
      s += tag(cx, cy - 30, '①', C.cy) + T(cx + 18, cy - 26, '操縦席', { c: C.cy, b: 1, a: 'start', fs: 12, halo: 1 });
      s += tag(cx + 162, cy + 52, '②', C.gr) + TL(cx + 160, cy + 82, ['右翼', '燃料・サンプ', '主脚 4.5 in'], { c: C.ink, fs: 12, lh: 15 });
      s += tag(cx, cy - 140, '③', C.gr) + T(cx - 20, cy - 136, '機首', { c: C.ink, a: 'end', fs: 12, halo: 1 }) + TL(cx + 22, cy - 166, ['オイル最少 6 qt', 'プロペラ・前脚 3.25 in'], { c: C.ink, a: 'start', fs: 12, lh: 15 });
      s += tag(cx - 162, cy + 52, '④', C.gr) + TL(cx - 160, cy + 82, ['左翼', '燃料・サンプ', 'ピトー・静圧管'], { c: C.ink, fs: 12, lh: 15 });
      s += tag(cx, cy + 158, '⑤', C.gr) + TL(cx, cy + 188, ['胴体・尾翼', 'スタビレーター・ラダー'], { c: C.ink, fs: 12, lh: 15 });
      s += T(392, 384, 'ドアは右側', { c: C.mut, a: 'end', fs: 12 });
      return svg(400, 392, s, '図：Archer の外部点検の順番（上から見た模式図）。公開されている訓練校のチェックリスト（2025 年版）の順で、操縦席 → 右翼 → 機首 → 左翼 → 胴体と尾翼と回ります。数字はそのチェックリストの値');
    },
    taxiWind() {
      // control positions while taxiing in a wind (AFH 3C chapter 2, Figure 2-15): the airplane from above, wind from four quarters
      let s = planeTop(200, 168, 1.15);
      const box = (x, y, w, title, lines, c) => `<rect x="${x}" y="${y}" width="${w}" height="74" rx="8" fill="${c}" fill-opacity="0.12" stroke="${c}"/>` + T(x + w / 2, y + 19, title, { c, b: 1, fs: 12 }) + TL(x + w / 2, y + 38, lines, { c: C.ink, fs: 12, lh: 15 });
      s += box(4, 6, 150, '左前からの風', ['操縦輪を左（風の方）へ', '昇降舵は中立'], C.cy) + box(246, 6, 150, '右前からの風', ['操縦輪を右（風の方）へ', '昇降舵は中立'], C.cy);
      s += box(4, 256, 150, '左後ろからの風', ['操縦輪を右（風と反対）へ', '前へ押す'], C.am) + box(246, 256, 150, '右後ろからの風', ['操縦輪を左（風と反対）へ', '前へ押す'], C.am);
      s += A(96, 92, 136, 122, C.cy, 3) + A(304, 92, 264, 122, C.cy, 3) + A(96, 244, 136, 214, C.am, 3) + A(304, 244, 264, 214, C.am, 3);
      s += T(200, 352, '向かい風：風の方へ　追い風：風と反対へ・前へ', { c: C.ink, b: 1, fs: 12 });
      return svg(400, 364, s, '図：風があるときのタキシーの操縦輪の位置（AFH 第 2 章の図 2-15 をもとにした模式図。前輪式の飛行機）。矢印は風の向き。向かい風では風上のエルロンを上げ、追い風では風上のエルロンを下げて昇降舵を下げます');
    },
    magCheck() {
      // the run-up magneto check at 2,000 rpm with the published Archer III checklist's limits: drop ≤ 175 rpm, difference ≤ 50 rpm
      const X = rpm => 96 + (rpm - 1700) / 300 * 250, row = (y, label, rpm, c) => `<rect x="96" y="${y}" width="${X(rpm) - 96}" height="20" rx="3" fill="${c}" fill-opacity="0.75"/>` + T(88, y + 15, label, { c: C.ink, b: 1, a: 'end', fs: 12 }) + T(X(rpm) + 6, y + 15, rpm.toLocaleString('en-US'), { c: C.ink, a: 'start', fs: 12 });
      let s = '';
      for (const r of [1700, 1800, 1900, 2000]) s += L(X(r), 34, X(r), 280, C.grid, 1) + T(X(r), 296, r.toLocaleString('en-US'), { c: C.mut, fs: 12 });
      s += L(X(1825), 34, X(1825), 280, C.rd, 1.5, '5 4') + T(X(1825), 26, '2,000 − 175 = 1,825', { c: C.rd, fs: 12 });
      s += T(8, 54, 'よい例', { c: C.gr, b: 1, a: 'start', fs: 12 });
      s += row(62, 'BOTH', 2000, C.mut) + row(88, 'L だけ', 1880, C.gr) + row(114, 'R だけ', 1850, C.gr);
      s += T(392, 156, '落ち 120・150、差 30 → OK', { c: C.gr, a: 'end', fs: 12 });
      s += T(8, 182, '悪い例', { c: C.rd, b: 1, a: 'start', fs: 12 });
      s += row(190, 'BOTH', 2000, C.mut) + row(216, 'L だけ', 1900, C.gr) + row(242, 'R だけ', 1800, C.rd);
      s += T(8, 318, '悪い例：R の落ち 200（175 を超える）、差 100（50 を超える）', { c: C.rd, a: 'start', fs: 12 });
      s += T(8, 336, '落ちがゼロも異常（スイッチや配線の故障の疑い）', { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 346, s, '図：ランナップのマグネトーの点検（2,000 rpm）。公開されている訓練校の Archer III チェックリストの限度は、落ちが最大 175 rpm、左右の差が 50 rpm 以内。棒の長さは回転数（rpm）');
    },
    // ---------------------------------------------------------------- 第 14 章 ops（基本操縦）
    attitudePower() {
      // one airplane, four attitude + power pairs → four performances: the course Archer's steady states at 3,000 ft from
      // the flight model (FL.physics.steadyState), so the book shows what the lessons fly
      const PH = FL.physics, s = PH.newState({ aircraft: 'pa28' }), v = ac('pa28').v;
      const at = (name, kt, fpm, o, c) => ({ name, kt, c, full: o.pwr === 'full', ...PH.steadyState(s, kt, fpm, { altFt: 3000, ...o }) });
      const st = [at('巡航', v.cruise, 0, {}, C.cy), at('上昇（Vy）', v.y, null, { pwr: 'full' }, C.gr), at('降下', 90, -500, {}, C.am), at('進入（フラップ 40°）', v.appr, -370, { flaps: v.apprFlaps }, C.vi)];
      let s1 = '';
      st.forEach((r, i) => {
        const x = 4 + (i % 2) * 198, y = 6 + Math.floor(i / 2) * 176, cx = x + 96, cy = y + 76;
        s1 += `<rect x="${x}" y="${y}" width="194" height="168" rx="8" fill="${r.c}" fill-opacity="0.08" stroke="${r.c}"/>` + T(x + 10, y + 20, r.name, { c: r.c, b: 1, a: 'start', fs: 13 });
        s1 += L(x + 8, cy, x + 186, cy, C.mut, 1, '4 4') + planeSide(cx, cy, 0.62, { pitch: r.pitch * 2, flap: i === 3 ? 40 : 0, gear: true });
        const pitch = `${r.pitch >= 0 ? '+' : '−'}${Math.abs(r.pitch).toFixed(1)}°`, pwr = r.full ? '全開' : `約 ${Math.round(r.thr * 20) * 5}%`;
        const fpm = Math.abs(r.fpm) < 50 ? '水平' : `${r.fpm > 0 ? '+' : '−'}${Math.round(Math.abs(r.fpm) / 10) * 10} fpm`;
        s1 += TL(x + 10, y + 108, [`ピッチ ${pitch}`, `スロットル ${pwr}・約 ${(Math.round(r.rpm / 50) * 50).toLocaleString('en-US')} rpm`, `→ ${r.kt} kt・${fpm}`], { c: C.ink, a: 'start', fs: 12, lh: 17 });
      });
      return svg(400, 360, s1, '図：同じ Archer でも、姿勢（ピッチ）と出力の組み合わせで、速度と昇降率が決まります（この教材のフライトモデルの値・3,000 ft。スロットルの % はレバーの開きで、エンジンの出力の % ではありません。絵の傾きは見やすく 2 倍にしてあります）');
    },
    stallRecovery() {
      // the stall recovery of AFH 3C chapter 5 (Figure 5-10) as used in a single-engine trainer without an autopilot: 4 of the 6 steps
      const box = (x, y, n, head, lines, c) => `<rect x="${x}" y="${y}" width="190" height="96" rx="8" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`
        + `<circle cx="${x + 20}" cy="${y + 22}" r="12" fill="${c}"/>` + T(x + 20, y + 27, n, { c: C.bg, b: 1, fs: 13 }) + T(x + 40, y + 27, head, { c, b: 1, a: 'start', fs: 13 }) + TL(x + 12, y + 52, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 });
      let s = box(4, 6, '1', '迎え角を減らす', ['機首を下げる。', '失速警報が止まるまで', '（いちばん大切）'], C.rd);
      s += box(206, 6, '2', '翼を水平に', ['迎え角を減らしてから。', 'ボールはラダーで中央'], C.am);
      s += box(4, 118, '3', '出力', ['必要なだけ足す。機首の', '上がりは操縦輪、左への', '向きはラダーで押さえる'], C.cy);
      s += box(206, 118, '4', '元の経路へ', ['なめらかに戻す。', '急に引くと二次失速'], C.gr);
      s += A(196, 54, 204, 54, C.ink, 2.5) + A(300, 104, 110, 116, C.ink, 2) + A(196, 166, 204, 166, C.ink, 2.5);
      s += T(200, 236, '自動操縦のない単発の練習機の場合（AFH の 6 段階のうち 4 つ）', { c: C.mut, fs: 12 });
      return svg(400, 246, s, '図：失速からの回復の順番（AFH 第 5 章の図 5-10 をもとにしたもの）。最初はいつも、機首を下げて迎え角を減らすことです');
    },
    turnsAroundPoint() {
      // turns around a point in a 10 kt wind, the AFH 3C chapter 7 example: 90 kt airspeed, 890 ft radius, 45° bank downwind;
      // the bank at the other points from tan φ = GS² / (11.26 · r) (r in ft, GS in kt)
      const tas = 90, w = 10, r = 890, bank = gs => Math.atan(gs * gs / (11.26 * r)) / DEG;
      const cx = 200, cy = 190, R = 84;
      let s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${C.cy}" stroke-width="2.5"/>` + `<circle cx="${cx}" cy="${cy}" r="5" fill="${C.am}"/>` + T(cx, cy + 20, '目印の点', { c: C.am, fs: 12 });
      s += ARC(cx, cy, R, 300, 330, C.cy, 2.5) + ARC(cx, cy, R, 120, 150, C.cy, 2.5);
      // the wind from the left (west), the airplane going round clockwise
      s += A(14, 40, 74, 40, C.mut, 3) + T(14, 26, `風 ${w} kt`, { c: C.mut, b: 1, a: 'start', fs: 12 });
      const pts = [[0, '風下へ（追い風）', tas + w], [90, '横風', Math.sqrt(tas * tas - w * w)], [180, '風上へ（向かい風）', tas - w], [270, '横風', Math.sqrt(tas * tas - w * w)]];
      // positions on the circle: heading east (downwind) at the north point when flying clockwise
      const pos = [[cx, cy - R, 'middle', -16], [cx + R, cy, 'start', 0], [cx, cy + R, 'middle', 30], [cx - R, cy, 'end', 0]];
      pts.forEach(([, t, gs], i) => {
        const [x, y, a, dy] = pos[i], b = Math.round(bank(gs)), xo = a === 'start' ? 12 : a === 'end' ? -12 : 0;
        s += `<circle cx="${x}" cy="${y}" r="5" fill="${C.ink}"/>` + TL(x + xo, y + dy - (a === 'middle' && dy < 0 ? 16 : a === 'middle' ? 0 : 15), a === 'middle' ? [t, `対地 ${Math.round(gs)} kt・バンク 約 ${b}°`] : [t, `対地 ${Math.round(gs)} kt`, `バンク 約 ${b}°`], { c: i === 0 ? C.rd : i === 2 ? C.gr : C.ink, a, fs: 12, lh: 15 });
      });
      s += T(200, 366, `速度 ${tas} kt・半径 ${r} ft（AFH 第 7 章の例）`, { c: C.mut, fs: 12 });
      return svg(400, 376, s, '図：風の中で 1 点の周りを同じ半径で回る（上から見た模式図。時計回り）。対地速度が速い風下でバンクがいちばん深く、風上でいちばん浅くなります。バンクの値は、AFH 第 7 章の例と同じ条件で計算したもの');
    },
    // ---------------------------------------------------------------- 第 15 章 tl（離陸・場周経路・着陸）
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
      s += T(dx - 16, 300, 'ダウンウインド', { c: C.cy, fs: 12, rot: -90 }) + T(222, top - 10, 'クロスウインド', { c: C.cy, fs: 12 }) + T(222, bot + 22, 'ベース', { c: C.cy, fs: 12 });
      s += T(rx + 12, 330, 'ファイナル', { c: C.cy, a: 'start', fs: 12 }) + TL(rx + 12, 104, ['離陸上昇', '（Departure）'], { c: C.cy, a: 'start', fs: 12, lh: 15 });
      s += A(380, 30, 380, 76, C.am, 3) + T(380, 22, '風', { c: C.am, b: 1, fs: 12 }) + A(22, 60, 22, 30, C.mut, 2) + T(22, 76, '北', { c: C.mut, fs: 12 });
      s += tag(dx - 48, mid - 48, '①', C.vi) + tag(dx, 116, '②', C.cy) + tag(dx, r1, '③', C.am) + tag(dx + 6, bot - 6, '④', C.gr) + tag(rx, 296, '⑤', C.cy) + tag(rx - 6, top + 6, '⑥', C.cy);
      s += T(200, bot + 46, '模式図（LAB 空港は架空）・NOT FOR NAVIGATION', { c: C.mut, fs: 12 });
      // the key under the drawing
      const key = [['①', C.vi, ['45° で、滑走路の中央の真横へ入る（場周高度で水平に）']], ['②', C.cy, [`ダウンウインド：約 90 kt・着陸前の点検`]],
        ['③', C.am, ['進入端の真横：出力を絞り、フラップ 10°、降下を始める']], ['④', C.gr, ['進入端が斜め後ろ 45° に見えたらベースへ', 'フラップ 25°・75 kt']],
        ['⑤', C.cy, [`ファイナル：フラップ 40°・${v.appr} kt・3°`, '旋回は、滑走路から 1/4 マイルより遠くで終える']], ['⑥', C.cy, [`離陸上昇は ${v.y} kt。滑走路の端を越え、`, '場周高度の 300 ft 下まで上がったらクロスウインドへ']]];
      let y = bot + 78;
      for (const [n, c, lines] of key) { s += tag(16, y - 4, n, c) + TL(34, y, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 }); y += lines.length * 16 + 6; }
      s += T(8, y + 4, '速度などは、この教材の Archer の目安（課目 t2）', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, y + 14, s, '図：LAB 空港（架空）の滑走路 36 の左回りの場周経路（上から見た模式図）。形と高さは AFH 第 8 章・AIM 4-3-3・AC 90-66C の目安です。場周高度や回る向きは空港ごとに決まりがあるので、Chart Supplement で確かめます');
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
      s += TL(12, 182, ['地上 500 ft までに安定', 'していなければ', 'ゴーアラウンド'], { c: C.am, a: 'start', fs: 12, lh: 16 });
      s += L(x3, y3, x3, g, C.rd, 1.5, '4 4') + `<circle cx="${x3.toFixed(1)}" cy="${y3.toFixed(1)}" r="4" fill="${C.rd}"/>`;
      s += TL(12, g + 18, ['地上 300 ft より下で不安定に', 'なったら、すぐにゴーアラウンド'], { c: C.rd, a: 'start', fs: 12, lh: 16 });
      const [px, py] = P3(820);
      s += planeSide(px, py - 1, 0.45, { pitch: -3, flap: 40 }) + T(x1 + 2, y1 - 8, '1,000 ft', { c: C.mut, a: 'start', fs: 12 });
      s += TL(96, 24, ['この教材の Archer', `${v.appr} kt・フラップ 40°`, `降下率 約 ${fpm} fpm`, '3°（PAPI 白 2・赤 2）'], { c: C.ink, a: 'start', fs: 12, lh: 16 });
      // PAPI: red lights grow from the runway side
      s += `<rect x="228" y="8" width="170" height="150" rx="8" fill="${C.ink}" fill-opacity="0.05" stroke="${C.grid}"/>` + T(313, 27, 'PAPI（滑走路の左の灯）', { c: C.ink, b: 1, fs: 12 });
      [[4, '高い（3.5° 超）'], [3, 'やや高い（3.2°）'], [2, '正しい（3°）'], [1, 'やや低い（2.8°）'], [0, '低い（2.5° 未満）']].forEach(([w, lab], i) => {
        const y = 50 + i * 22;
        for (let j = 0; j < 4; j++) s += `<circle cx="${238 + j * 14}" cy="${y}" r="5.5" fill="${j < w ? '#f2f2f2' : '#ff4a3a'}"/>`;
        s += T(294, y + 4, lab, { c: w === 2 ? C.gr : C.ink, b: w === 2 ? 1 : 0, a: 'start', fs: 12 });
      });
      return svg(400, g + 42, s, '図：ファイナル（横から見た模式図。高さは横より大きく描いてあり、滑走路の部分は縮尺どおりではありません）。3° の線で目標点へまっすぐ降り、地上 500 ft までに安定していなければゴーアラウンドします（AFH 第 9 章）。接地はフレアのぶん目標点より少し先になります。右上は PAPI の見え方（AIM 2-1-2）');
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
      const key = [['①', C.am, ['Power：決めたらすぐ、なめらかに全開', 'キャブレターヒーターは OFF']], ['②', C.cy, ['Attitude：機首が上がり左へ向くので、', '押さえて上昇の姿勢に。右ラダー']],
        ['③', C.vi, [`Configuration：降下が止まったら、`, `フラップを 25° に。${v.ga} kt`]], ['④', C.gr, [`上昇を確かめ、障害物を越えたら ${v.y} kt`, 'フラップを少しずつ上げる']]];
      let y = 222;
      for (const [n, c, lines] of key) { s += tag(16, y - 4, n, c) + TL(34, y, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 }); y += lines.length * 16 + 6; }
      s += TL(8, y + 6, [`${v.ga} kt・全開の上昇（この教材のフライトモデル）：`, `フラップ 40° のまま 約 +${c40} fpm → 25° で 約 +${c25} fpm`], { c: C.mut, a: 'start', fs: 12, lh: 16 });
      return svg(400, y + 32, s, '図：ゴーアラウンド（横から見た模式図）。AFH 第 9 章の 3 つの原則（Power → Attitude → Configuration）と、公開されている訓練校の Archer III チェックリストの BALKED LANDING（フラップ 25°・64 kt、障害物を越えたら 76 kt）。フラップを一度に上げると沈みます');
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
        else s += A(cx + 38, py - 30, cx + 38, py - 8, C.rd, 2.5) + T(cx + 46, py - 30, '下げる', { c: C.rd, b: 1, a: 'start', fs: 12 }) + T(cx - 12, py + 40, '左ラダー', { c: C.am, b: 1, a: 'end', fs: 12 });
        s += planeFront(cx, 274, 0.5, { bank: crab ? 0 : 10 }) + T(x0 + 186, 296, '後ろから', { c: C.mut, a: 'end', fs: 12 });
        s += TL(x0 + 10, 316, crab ? ['翼は水平。機首を風上へ向けて、', '進む向きを滑走路に合わせる'] : ['風上の翼を下げて流れを止め、', '反対のラダーで機首をまっすぐ'], { c: C.ink, a: 'start', fs: 12, lh: 16 });
        return s;
      };
      const s = panel(4, '① クラブ（crab）', true) + panel(204, '② ウイングロー（wing-low）', false);
      return svg(400, 354, s, '図：横風の進入の 2 つのやり方（上から見た模式図。風は右から。下の小さな絵は後ろから見た翼）。① クラブは、接地の直前にラダーで機首を滑走路と平行にします。② ウイングローは、風上の翼を下げたまま、風上の主輪から接地します。AFH 第 9 章は、多くの場合ウイングローをすすめています');
    },
    xwindTable() {
      // the crosswind and headwind components (sin and cos of the angle between the wind and the runway), the clock rule of thumb,
      // and lesson x1's wind (12 kt at 60°)
      const w = 12, thumb = { 15: '約 1/4', 30: '約 1/2', 45: '約 3/4', 60: 'ほぼ全部', 90: '全部' };
      return table(['風と滑走路の角度', '横風成分', '向かい風成分', '覚え方（目安）', `風 ${w} kt なら`], [15, 30, 45, 60, 90].map(a => [`${a}°`, `${Math.round(Math.sin(a * DEG) * 100)}%`, `${Math.round(Math.cos(a * DEG) * 100)}%`, thumb[a], `横 ${Math.round(w * Math.sin(a * DEG))} kt・向かい ${Math.round(w * Math.cos(a * DEG))} kt`]));
    },
    // ---------------------------------------------------------------- 第 16 章 emg（緊急操作）
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
      s += TL(214, 344, ['AFH の例：反応 4 秒、', '標準旋回・65 kt（半径', '2,100 ft）、降下 1,000 fpm。', `225° 回り終えると、`, `滑走路より ${below.toLocaleString('en-US')} ft 下`], { c: C.ink, a: 'start', fs: 12, lh: 16 });
      return svg(400, 428, s, `図：離陸直後、地上 ${agl} ft でエンジンが止まったとき（上から見た模式図）。A：正面へ降りるのが、ふつうはいちばん危険が少ない方法です（±30° はこの教材の課目 e2 の目安）。B：AFH 第 18 章の例のとおり標準旋回で引き返すと、旋回を終える前に地面に着いてしまいます（約 ${Math.round(t0)} 秒・${Math.round(turned)}° 回ったところ）`);
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
      const ratio = dist(1000, 0) * 6076 / 1000;
      s += L(214, 40, 236, 40, C.cy, 2.5) + T(242, 44, '無風', { c: C.ink, a: 'start', fs: 12 }) + L(214, 60, 236, 60, C.am, 2, '6 4') + T(242, 64, '向かい風 10 kt', { c: C.ink, a: 'start', fs: 12 }) + L(214, 80, 236, 80, C.gr, 2, '2 3') + T(242, 84, '追い風 10 kt', { c: C.ink, a: 'start', fs: 12 });
      s += T(214, 108, `${kt} kt・滑空比 約 ${ratio.toFixed(1)}：1`, { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 300, s, `図：この教材の Archer が ${kt} kt（チェックリストの最良滑空速度）で滑空したときに届く距離（エンジンが止まり、プロペラは風車の状態。教材のフライトモデルで計算した値）。地面から 1,000 ft ごとに約 ${dist(1000, 0).toFixed(1)} NM。向かい風では短く、追い風では長くなります。実機の値は POH で確かめます`);
    },
    // ---------------------------------------------------------------- 第 17 章 solo（ソロ）
    soloRoadmap() {
      // the road to the first solo and beyond under 14 CFR part 61 (61.83, 61.23, 61.87(a)(b)(c)(d)(n)(o)(p), 61.93, 61.95) and,
      // at a part 141 school, the stage checks of 141.85
      const steps = [
        ['前提：学生操縦士証明と医療証明', ['16 歳以上・英語を読み・話し・書き・理解できる（61.83）', 'ふつうは第 3 種以上の医療証明も（61.23）'], C.mut],
        ['ソロ前の学科テスト', ['規則・空域・機体の特性。間違いは教官と見直す（61.87(b)）'], C.cy],
        ['15 項目の飛行訓練と、教官が認める技量', ['離着陸・失速・緊急・ゴーアラウンドなど（61.87(c)(d)）'], C.cy],
        ['段階審査（訓練校）', ['学校の課程で決めた審査（Part 141：141.85）'], C.cy],
        ['ログブックへの承認（endorsement）', ['型式ごと・訓練をした教官が・90 日以内（61.87(n)）'], C.am],
        ['初めてのソロ', ['乗っているのは自分 1 人（61.87(a)）'], C.gr],
        ['90 日ごとに承認を更新', ['教官がログブックに書き足す（61.87(p)）'], C.am],
        ['その先のソロ（それぞれ別の承認）', ['25 NM 以内のほかの空港・野外飛行（61.93）', '夜（61.87(o)）・Class B 空域（61.95）'], C.vi]];
      let s = '', y = 6;
      steps.forEach(([title, lines, c], i) => {
        const h = 30 + lines.length * 16;
        s += `<rect x="4" y="${y}" width="392" height="${h}" rx="8" fill="${c}" fill-opacity="${i === 5 ? 0.22 : 0.1}" stroke="${c}" stroke-width="${i === 5 ? 2.5 : 1.5}"/>`;
        s += `<circle cx="24" cy="${y + 19}" r="11" fill="${c}"/>` + T(24, y + 23.5, i + 1, { c: C.bg, b: 1, fs: 12 });
        s += T(44, y + 23, title, { c: i === 5 ? C.gr : C.ink, b: 1, a: 'start', fs: 13 }) + TL(44, y + 41, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 });
        y += h;
        if (i < steps.length - 1) { s += A(200, y + 1, 200, y + 13, C.mut, 2); y += 14; }
      });
      return svg(400, y + 6, s, '図：初めてのソロまでの道のりと、その先（14 CFR Part 61 の要点。訓練校の段階審査は Part 141）。承認は学生操縦士証明ではなく、ログブックに書きます（61.87(n)）');
    },
    // ---------------------------------------------------------------- 第 18 章 navp（地図・飛行計画）
    sectionalSymbols() {
      // a schematic sectional around the fictional LAB (north up), drawn with the symbols of the FAA Chart Users' Guide (2026-07-09):
      // positions from the app's waypoints and navaids (avionics.js), LAB's elevation (GROUND_FT), runway length (LAB_RWY, charted in
      // hundreds of feet with 70 as the rounding point) and the Class C rings of the radio chapters (5 / 10 NM, 4,000 ft above the field)
      const PH = FL.physics, AV = FL.avionics, M = '#e05ab4', BL = '#4aa3ff', k = 0.0081, LX = 170, LY = 190;
      const lab = AV.WAYPOINTS.find(w => w.id === 'LABRW'), P = (n, e) => [LX + (e - lab.e) * k, LY - (n - lab.n) * k];
      const elev = Math.round(PH.GROUND_FT), lenFt = PH.LAB_RWY.len * 3.2808, rwy = Math.floor((lenFt + 30) / 100), top = Math.round((elev + 4000) / 100), shelf = Math.round((elev + 1200) / 100);
      const NMk = 1852 * k, tag = (x, y, n) => `<circle cx="${x}" cy="${y}" r="10" fill="${C.am}" stroke="${C.bg}" stroke-width="2"/>` + T(x, y + 4.5, n, { c: C.bg, b: 1, fs: 12 });
      let s = `<rect x="0" y="0" width="400" height="350" fill="#13202f"/>`;
      // a lake, the isogonic line, the MEF
      s += `<ellipse cx="92" cy="276" rx="34" ry="18" fill="#2b5f8a" opacity="0.8"/>`;
      s += L(14, 4, 60, 346, M, 1.5, '8 6') + T(44, 214, `${PH.MAGVAR_W}°W`, { c: M, b: 1, a: 'start', fs: 12, halo: 1 });
      s += `<text x="336" y="64" fill="${C.ink}" font-size="34" font-weight="700" text-anchor="middle">2</text><text x="352" y="46" fill="${C.ink}" font-size="18" font-weight="700">5</text>`;
      // Class C: the 5 NM surface area and the 10 NM shelf, solid magenta, with ceiling / floor in hundreds of feet MSL
      s += `<circle cx="${LX}" cy="${LY}" r="${(5 * NMk).toFixed(1)}" fill="none" stroke="${M}" stroke-width="2.5"/><circle cx="${LX}" cy="${LY}" r="${(10 * NMk).toFixed(1)}" fill="none" stroke="${M}" stroke-width="2.5"/>`;
      const box = (x, y, a, b) => `<rect x="${x - 19}" y="${y - 15}" width="38" height="34" rx="3" fill="#13202f"/>` + T(x, y, a, { c: M, b: 1, fs: 12 }) + L(x - 13, y + 3, x + 13, y + 3, M, 1.2) + T(x, y + 15, b, { c: M, b: 1, fs: 12 });
      s += box(LX - 46, LY - 40, top, 'SFC') + box(LX - 92, LY - 92, top, shelf);
      // the VOR compass rose and its box
      const vor = AV.NAVAIDS.find(n => n.id === 'LBV'), [vx, vy] = P(vor.n, vor.e);
      s += `<circle cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="26" fill="none" stroke="${BL}" stroke-width="1.2"/>`;
      for (let a = 0; a < 360; a += 30) { const r0 = a % 90 ? 21 : 17, t = (a - PH.MAGVAR_W) * DEG; s += L((vx + r0 * Math.sin(t)).toFixed(1), (vy - r0 * Math.cos(t)).toFixed(1), (vx + 26 * Math.sin(t)).toFixed(1), (vy - 26 * Math.cos(t)).toFixed(1), BL, 1.2); }
      s += A(vx, vy, vx + 22 * Math.sin(-PH.MAGVAR_W * DEG), vy - 22 * Math.cos(-PH.MAGVAR_W * DEG), BL, 1.5) + `<circle cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="3" fill="${BL}"/>`;
      s += `<rect x="${(vx + 18).toFixed(1)}" y="${(vy + 18).toFixed(1)}" width="92" height="22" fill="#13202f" stroke="${BL}"/>` + T(vx + 64, vy + 33, `LAB ${(vor.freq / 1000).toFixed(1)} LBV`, { c: BL, b: 1, fs: 12 });
      // the obstacle at LAB-A (the red tower of lesson n2)
      const wa = AV.WAYPOINTS.find(w => w.id === 'LABEA'), [ax, ay] = P(wa.n, wa.e);
      s += `<path d="M${(ax - 5).toFixed(1)} ${(ay + 7).toFixed(1)} L${ax.toFixed(1)} ${(ay - 9).toFixed(1)} L${(ax + 5).toFixed(1)} ${(ay + 7).toFixed(1)}" fill="none" stroke="${C.ink}" stroke-width="1.6"/><circle cx="${ax.toFixed(1)}" cy="${(ay + 7).toFixed(1)}" r="1.8" fill="${C.ink}"/>`;
      const twr = 330;   // the scene's landmark tower at LAB-A is about 100 m tall (scene.js), ≈ 330 ft above the ground
      s += T(ax + 8, ay - 4, `${elev + twr}`, { c: C.ink, b: 1, a: 'start', fs: 12, halo: 1 }) + T(ax + 8, ay + 11, `(${twr})`, { c: C.ink, a: 'start', fs: 12, halo: 1 });
      // LAB: a towered airport (blue) with a hard-surfaced runway, a beacon (star on top) and its data block
      s += `<circle cx="${LX}" cy="${LY}" r="10" fill="${BL}"/>` + L(LX, LY - 8, LX, LY + 8, C.ink, 3) + `<path d="M${LX} ${LY - 21} l2.4 5 5.4 .6 -4 3.7 1.1 5.3 -4.9 -2.7 -4.9 2.7 1.1 -5.3 -4 -3.7 5.4 -.6 Z" fill="${BL}"/>`;
      s += TL(LX + 14, LY + 26, ['LAB', 'CT – 118.3', `${elev} L ${rwy} 122.95`], { c: BL, b: 1, a: 'start', fs: 12, lh: 16 });
      s += tag(LX + 22, LY - 14, '①') + tag(LX + 92, LY + 38, '②') + tag(LX + 122, LY + 54, '③') + tag(LX - 124, LY - 92, '④') + tag(ax - 16, ay - 2, '⑤') + tag(314, 30, '⑥') + tag(vx + 36, vy - 8, '⑦') + tag(46, 252, '⑧');
      s += A(380, 330, 380, 300, C.mut, 2) + T(380, 344, '北', { c: C.mut, fs: 12 }) + T(8, 344, '模式図（LAB は架空）・NOT FOR NAVIGATION', { c: C.mut, a: 'start', fs: 12, halo: 1 });
      const key = [['①', ['空港の記号。青は管制塔あり（マゼンタはなし）。上の ★ は回転灯台']], ['②', ['CT – 118.3：管制塔の周波数', '（CT の後に ★ があれば、管制塔は時間を限って運用）']],
        ['③', [`${elev}：標高（ft）・L：夜の滑走路灯・${rwy}：最長の滑走路`, `（${(Math.round(lenFt / 10) * 10).toLocaleString('en-US')} ft を百 ft 単位で）・122.95：UNICOM`]], ['④', [`マゼンタの実線：Class C 空域。上が上限、下が下限`, `（百 ft・MSL。${top}＝${(top * 100).toLocaleString('en-US')} ft、SFC＝地表）`]],
        ['⑤', [`障害物（LAB-A の塔）：${elev + 330} は海面から、(330) は地面からの高さ（ft）`]], ['⑥', ['MEF：その区画でいちばん高いものに余裕を足した高さ', '（2⁵ ＝ 2,500 ft MSL。図の外に高い塔がある想定）']], ['⑦', ['VOR のコンパスローズ（0° が磁北）と、名前・周波数・識別符号']], ['⑧', [`等偏差線：真北と磁北の差（この教材は ${PH.MAGVAR_W}°W）`]]];
      let y = 372;
      for (const [n, lines] of key) { s += tag(14, y - 4, n) + TL(30, y, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 }); y += lines.length * 16 + 5; }
      return svg(400, y + 4, s, '図：セクショナルチャートの記号（架空の LAB 空港のまわりを描いた模式図。記号は FAA Chart Users\' Guide のもの）。本物のチャートは 56 日ごとに改訂されるので、いつも最新の版を使います');
    },
    // ---------------------------------------------------------------- 第 19 章 navr（電波航法）
    vorRadials() {
      // radials leave the station; TO / FROM depends on where the airplane is, not where it points (PHAK chapter 16, AIM 1-1-3).
      // The fictional LAB VOR (avionics.js NAVAIDS), magnetic north up, the course 040 of lesson n1 and the half-planes it makes
      const AV = FL.avionics, vor = AV.NAVAIDS.find(n => n.id === 'LBV'), cx = 200, cy = 186, crs = 40, dir = h => [Math.sin(h * DEG), -Math.cos(h * DEG)];
      const P = (h, r) => [cx + r * dir(h)[0], cy + r * dir(h)[1]];
      // the TO half (the side the course comes from) and the FROM half, split by the line through the station at right angles to the course
      const [l0, l1] = [P(crs + 90, 400), P(crs - 90, 400)], [t0, t1] = [P(crs + 180, 400), P(crs, 400)];
      let s = `<defs><clipPath id="vorclip"><rect x="0" y="0" width="400" height="356"/></clipPath></defs>`;
      s += `<g clip-path="url(#vorclip)"><path d="M${l0[0].toFixed(0)} ${l0[1].toFixed(0)} L${(l0[0] + t0[0] - cx).toFixed(0)} ${(l0[1] + t0[1] - cy).toFixed(0)} L${(l1[0] + t0[0] - cx).toFixed(0)} ${(l1[1] + t0[1] - cy).toFixed(0)} L${l1[0].toFixed(0)} ${l1[1].toFixed(0)} Z" fill="${C.cy}" fill-opacity="0.08"/>`;
      s += `<path d="M${l0[0].toFixed(0)} ${l0[1].toFixed(0)} L${(l0[0] + t1[0] - cx).toFixed(0)} ${(l0[1] + t1[1] - cy).toFixed(0)} L${(l1[0] + t1[0] - cx).toFixed(0)} ${(l1[1] + t1[1] - cy).toFixed(0)} L${l1[0].toFixed(0)} ${l1[1].toFixed(0)} Z" fill="${C.am}" fill-opacity="0.08"/>`;
      s += L(l0[0], l0[1], l1[0], l1[1], C.mut, 1, '5 5') + '</g>';
      s += T(12, 232, 'CRS 040 なら TO の側', { c: C.cy, b: 1, a: 'start', fs: 12, halo: 1 }) + T(392, 24, 'CRS 040 なら FROM の側', { c: C.am, b: 1, a: 'end', fs: 12, halo: 1 });
      // the compass rose (magnetic north up) and four radials, drawn outward from the station
      s += `<circle cx="${cx}" cy="${cy}" r="44" fill="none" stroke="${C.bl}" stroke-width="1.5"/>`;
      for (let a = 0; a < 360; a += 30) { const [x0, y0] = P(a, a % 90 ? 38 : 32), [x1, y1] = P(a, 44); s += L(x0.toFixed(1), y0.toFixed(1), x1.toFixed(1), y1.toFixed(1), C.bl, 1.5); }
      s += T(cx, cy - 50, '磁北', { c: C.bl, b: 1, fs: 12 }) + `<circle cx="${cx}" cy="${cy}" r="4" fill="${C.bl}"/>`;
      [[40, 160], [130, 150], [220, 160], [310, 150]].forEach(([r, len]) => { const [x0, y0] = P(r, 48), [x1, y1] = P(r, len), [tx, ty] = P(r, len + 16); s += A(x0, y0, x1, y1, C.vi, 2.5) + T(tx.toFixed(1), (ty + 4).toFixed(1), `${String(r).padStart(3, '0')}`, { c: C.vi, b: 1, fs: 12, halo: 1 }); });
      // airplane A on the 220 radial, flying the course 040 to the station; airplane B on the 040 radial, flying 040 away from it
      const [ax, ay] = P(220, 112), [bx, by] = P(40, 96);
      s += planeTop(ax, ay, 0.34, { rot: crs }) + TL(ax + 30, ay + 20, ['A：TO', '（局へ近づく）'], { c: C.cy, b: 1, a: 'start', fs: 12, lh: 15 });
      s += planeTop(bx, by, 0.34, { rot: crs }) + TL(bx + 34, by + 2, ['B：FROM', '（局から離れる）'], { c: C.am, b: 1, a: 'start', fs: 12, lh: 15 });
      s += `<rect x="${cx + 14}" y="${cy + 18}" width="96" height="22" fill="${C.bg}" stroke="${C.bl}"/>` + T(cx + 62, cy + 33, `LAB ${(vor.freq / 1000).toFixed(1)} LBV`, { c: C.bl, b: 1, fs: 12 });
      s += TL(8, 376, ['紫の矢印＝ラジアル（局から外へ出る磁方位の線）', 'A も B も機首は 040°。表示が TO か FROM かは、位置で決まる', '220 ラジアルの上から局へ向かうコース ＝ 220 − 180 ＝ 040°'], { c: C.ink, a: 'start', fs: 12, lh: 17 });
      s += T(392, 350, '模式図（LAB VOR は架空）・NOT FOR NAVIGATION', { c: C.mut, a: 'end', fs: 12, halo: 1 });
      return svg(400, 430, s, '図：VOR のラジアルと TO / FROM（上から見た模式図・磁北が上）。コース（CRS）を 040 にしたとき、局の手前の側では TO、局を過ぎた側では FROM になります。機首の向きでは変わりません');
    },
    // ---------------------------------------------------------------- 第 20 章 navd（目的地変更）
    diversionGeometry() {
      // lesson n2's diversion, from above (north up): the planned route LAB RWY → LAB-A → LAB-B, weather beyond LAB-A, and the new leg
      // LAB-A → LAB-F (avionics.js WAYPOINTS, magnetic = true + MAGVAR_W) worked as PHAK chapter 16 does it: turn first, then estimate.
      // The estimate uses the lesson's wind (school.js: runway true heading + 270 = 264° true / 12 kt), 105 KIAS at 3,000 ft (TAS from
      // the density) and the model's 10.8 gal/h, worked in true degrees (winds aloft are true) and turned magnetic at the end
      const PH = FL.physics, AV = FL.avionics, V = PH.MAGVAR_W, g = id => AV.WAYPOINTS.find(w => w.id === id), k = 0.0155;
      const Q = (n, e) => [12 + (e + 42000) * k, 330 - (n + 4000) * k], ws = ['LABRW', 'LABEA', 'LABEB'].map(id => Q(g(id).n, g(id).e));
      const WA = g('LABEA'), WF = g('LABEF'), dn = WF.n - WA.n, de = WF.e - WA.e, nm = Math.hypot(dn, de) / 1852, tc = ((Math.atan2(de, dn) / DEG) % 360 + 360) % 360;
      const tas = 105 / Math.sqrt(PH.atmos(3000 / PH.FT).sigma), wd = (PH.LAB_RWY.trueHdg + 270) % 360, wk = 12, wa = (wd - tc) * DEG, wca = Math.asin(wk * Math.sin(wa) / tas) / DEG, gs = tas * Math.cos(wca * DEG) - wk * Math.cos(wa);
      const d3 = x => String(Math.round(((x % 360) + 360) % 360)).padStart(3, '0');
      const [ax, ay] = Q(WA.n, WA.e), [fx, fy] = Q(WF.n, WF.e), vor = AV.NAVAIDS.find(n => n.id === 'LBV'), [vx, vy] = Q(vor.n, vor.e);
      let s = `<rect x="0" y="0" width="400" height="344" fill="#13202f"/>`;
      s += P(ws, C.mut, 3) + ws.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${C.mut}"/>`).join('');
      // weather beyond LAB-A on the leg to LAB-B
      const [cx2, cy2] = [ws[1][0] + (ws[2][0] - ws[1][0]) * 0.55, ws[1][1] + (ws[2][1] - ws[1][1]) * 0.55];
      s += `<ellipse cx="${cx2.toFixed(1)}" cy="${cy2.toFixed(1)}" rx="52" ry="34" fill="${C.rd}" fill-opacity="0.18" stroke="${C.rd}" stroke-dasharray="5 4"/>` + T(cx2, cy2 + 5, '雷雨', { c: C.rd, b: 1, fs: 13 });
      // the VOR compass rose (to measure the course roughly)
      s += `<circle cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="20" fill="none" stroke="${C.bl}" stroke-width="1.2"/>`;
      for (let a = 0; a < 360; a += 30) { const t = (a - V) * DEG; s += L((vx + 15 * Math.sin(t)).toFixed(1), (vy - 15 * Math.cos(t)).toFixed(1), (vx + 20 * Math.sin(t)).toFixed(1), (vy - 20 * Math.cos(t)).toFixed(1), C.bl, 1.2); }
      s += T(vx + 24, vy + 4, 'LAB VOR', { c: C.bl, fs: 12, a: 'start', halo: 1 });
      // the diversion
      s += `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)} L${fx.toFixed(1)} ${fy.toFixed(1)}" stroke="${C.vi}" stroke-width="3" stroke-dasharray="8 5" fill="none"/>` + A(fx + (ax - fx) * 0.12, fy + (ay - fy) * 0.12, fx, fy + 4, C.vi, 3);
      s += `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="6" fill="none" stroke="${C.vi}" stroke-width="2.5"/>`;
      const lab = (x, y, t, c, a = 'start') => T(x, y, t, { c, b: 1, a, fs: 12, halo: 1 });
      s += lab(ws[0][0] + 10, ws[0][1] + 5, 'LAB RWY', C.mut) + lab(ax - 10, ay - 8, 'LAB-A', C.mut, 'end') + lab(ws[2][0] - 6, ws[2][1] - 10, 'LAB-B', C.mut, 'end') + lab(fx + 12, fy + 4, 'LAB-F（変更先）', C.vi);
      const tag = (x, y, n) => `<circle cx="${x}" cy="${y}" r="10" fill="${C.am}" stroke="${C.bg}" stroke-width="2"/>` + T(x, y + 4.5, n, { c: C.bg, b: 1, fs: 12 });
      s += tag(ax + 18, ay + 14, '①') + tag((ax + fx) / 2 + 18, (ay + fy) / 2, '②') + tag(fx - 22, fy - 18, '③');
      s += A(30, 44, 30 + 40 * Math.sin((wd + 180) * DEG), 44 - 40 * Math.cos((wd + 180) * DEG), C.am, 3) + T(30, 30, `風 ${d3(wd)}°（真）/${wk} kt`, { c: C.am, b: 1, a: 'start', fs: 12 }) + A(380, 330, 380, 300, C.mut, 2) + T(380, 344 - 2, '北', { c: C.mut, fs: 12 });
      s += T(8, 338, '模式図（訓練点は架空）・NOT FOR NAVIGATION', { c: C.mut, a: 'start', fs: 12, halo: 1 });
      const rows = [['①', ['まず向きを変える：おおよその向き（南）へすぐ旋回']], ['②', [`見積もる：真航路 ${d3(tc)}°・${nm.toFixed(1)} NM。右からの風で真針路 ${d3(tc + wca)}°`, `→ 磁針路 約 ${d3(tc + wca + V)}°・対地 約 ${Math.round(gs)} kt・約 ${(nm / gs * 60).toFixed(1)} 分・燃料 約 ${(nm / gs * 10.8).toFixed(1)} gal`]], ['③', ['確かめる：最初の目印・到着の時刻で直す。管制に伝える']]];
      let y = 368;
      for (const [n, lines] of rows) { s += tag(14, y - 4, n) + TL(30, y, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 }); y += lines.length * 16 + 6; }
      return svg(400, y + 2, s, '図：目的地変更（課目 n2 の LAB-A → LAB-F に、例として LAB-B への予定の航路と雷雨を描き足した、上から見た模式図）。まず向きを変え、コースに乗ってから時刻を記録し、針路・対地速度・到着の時刻・燃料を計算します（PHAK 第 16 章）。数字は課目の風・105 kt・この教材のフライトモデルの燃料消費で計算した値');
    },
    // ---------------------------------------------------------------- 第 22 章 ifrp（計器飛行方式）
    holding() {
      // AIM 5-3-8 for lesson i4's hold: the LAB VOR as the fix, inbound course 090 (flying east to the station), right turns, so the
      // racetrack lies west of the fix on the south side. Its size is the lesson's 100 kt in still air: 1-minute legs (1.67 NM) and
      // standard-rate turns (radius = V ÷ 3°/s ≈ 0.53 NM). The entry sectors are split by the inbound course extended through the fix
      // and the 70° line (070° from the inbound leg on the holding side, i.e. the 020–200 line): direct 180°, teardrop 70°, parallel 110°
      const kt = 100, leg = kt / 60, r = kt / 3600 / (3 * DEG), k = 62, fx = 230, fy = 112, Lp = leg * k, R = r * k;
      const pt = (b, d) => [fx + d * Math.sin(b * DEG), fy - d * Math.cos(b * DEG)];
      const wedge = (b0, b1, c, d = 190) => { const [x0, y0] = pt(b0, d), [x1, y1] = pt(b1, d); return `<path d="M${fx} ${fy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${d} ${d} 0 ${b1 - b0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${c}" fill-opacity="0.10"/>`; };
      let s = `<defs><clipPath id="holdclip"><rect x="0" y="0" width="400" height="236"/></clipPath></defs><g clip-path="url(#holdclip)">`;
      s += wedge(200, 380, C.gr) + wedge(20, 90, C.am) + wedge(90, 200, C.vi);
      const [a0, a1] = [pt(20, 190), pt(200, 190)];
      s += L(a0[0].toFixed(1), a0[1].toFixed(1), a1[0].toFixed(1), a1[1].toFixed(1), C.mut, 1.5, '6 4') + L(fx, fy, fx + 200, fy, C.mut, 1.5, '6 4') + '</g>';
      // the racetrack: inbound (north side) ends at the fix; right turn south; outbound west along the south side; right turn back
      const xw = fx - Lp, yS = fy + 2 * R;
      s += `<path d="M${xw.toFixed(1)} ${fy} L${fx} ${fy} A${R.toFixed(1)} ${R.toFixed(1)} 0 0 1 ${fx} ${yS.toFixed(1)} L${xw.toFixed(1)} ${yS.toFixed(1)} A${R.toFixed(1)} ${R.toFixed(1)} 0 0 1 ${xw.toFixed(1)} ${fy}" stroke="${C.cy}" stroke-width="3" fill="none"/>`;
      s += A(fx - Lp * 0.62, fy, fx - Lp * 0.38, fy, C.cy, 3) + A(xw + Lp * 0.62, yS, xw + Lp * 0.38, yS, C.cy, 3);
      // lesson i4 arrives from the west on the inbound course (a direct entry)
      s += A(10, fy, xw - 6, fy, C.gr, 2.5) + T(12, fy - 8, '課目 i4：西から 090° で', { c: C.gr, b: 1, a: 'start', fs: 12 });
      // the fix (the VOR) and abeam
      s += `<circle cx="${fx}" cy="${fy}" r="7" fill="${C.bg}" stroke="${C.bl}" stroke-width="2.5"/>` + T(fx + 10, fy - 24, 'LAB VOR（フィックス）', { c: C.bl, b: 1, a: 'start', fs: 12, halo: 1 });
      s += L(fx, yS - 7, fx, yS + 7, C.am, 2.5) + TL(fx + 4, yS + 22, ['真横：ここから', 'アウトバウンドの時間'], { c: C.am, a: 'end', fs: 12, lh: 15, halo: 1 });
      s += T(fx - Lp / 2, fy + 20, 'インバウンド 090°（1 分）', { c: C.cy, b: 1, fs: 12, halo: 1 }) + T(xw + Lp / 2, yS - 9, 'アウトバウンド 270°', { c: C.cy, b: 1, fs: 12, halo: 1 });
      // the sector names
      const lab = (b, d, lines, c) => { const [x, y] = pt(b, d); return TL(x, y, lines, { c, b: 1, fs: 12, lh: 15, halo: 1 }); };
      s += lab(56, 116, ['ティアドロップ', '70°'], C.am) + lab(118, 150, ['パラレル', '110°'], C.vi) + lab(300, 150, ['ダイレクト', '180°'], C.gr);
      s += T(394, fy - 6, 'コースの延長', { c: C.mut, fs: 12, a: 'end', halo: 1 }) + T(pt(20, 120)[0] + 6, 14, '70° の線', { c: C.mut, fs: 12, a: 'start', halo: 1 });
      s += A(22, 226, 22, 196, C.mut, 2) + T(36, 214, '北', { c: C.mut, fs: 12, a: 'start' }) + T(394, 230, '模式図・NOT FOR NAVIGATION', { c: C.mut, fs: 12, a: 'end', halo: 1 });
      // three small drawings of the entries (each fix on its right, the same racetrack, the entry path in its colour)
      const mini = (ox, c, title, path) => {
        const m = 0.36, X = x => ox + 104 + (x - fx) * m, Y = y => 290 + (y - fy) * m, rr = R * m;
        let t = `<rect x="${ox + 2}" y="250" width="128" height="80" rx="6" fill="${c}" fill-opacity="0.08" stroke="${c}"/>` + T(ox + 66, 268, title, { c, b: 1, fs: 12 });
        t += `<path d="M${X(xw).toFixed(1)} ${Y(fy).toFixed(1)} L${X(fx).toFixed(1)} ${Y(fy).toFixed(1)} A${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 1 ${X(fx).toFixed(1)} ${Y(yS).toFixed(1)} L${X(xw).toFixed(1)} ${Y(yS).toFixed(1)} A${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 1 ${X(xw).toFixed(1)} ${Y(fy).toFixed(1)}" stroke="${C.mut}" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>`;
        return t + path(X, Y, rr) + `<circle cx="${X(fx).toFixed(1)}" cy="${Y(fy).toFixed(1)}" r="3.5" fill="${C.bl}"/>`;
      };
      const pth = (d, c) => `<path d="${d}" stroke="${c}" stroke-width="2.5" fill="none"/>`;
      // the entry paths worked in NM from the fix (east, north) at the same 100 kt: e(x, y) gives the drawing's main coordinates
      const e = (x, y) => [fx + x * k, fy - y * k], f = v => v.toFixed(1);
      s += mini(4, C.gr, 'ダイレクト', (X, Y, rr) => A(X(fx - 150), Y(fy), X(fx) - 2, Y(fy), C.gr, 2.5) + pth(`M${X(fx)} ${Y(fy)} A${f(rr)} ${f(rr)} 0 0 1 ${X(fx)} ${f(Y(yS))} L${f(X(fx - Lp * 0.5))} ${f(Y(yS))}`, C.gr));
      s += mini(136, C.am, 'ティアドロップ', (X, Y, rr) => {
        // fly 240° (30° inside the outbound 270°) until a right turn of 210° rolls out on the inbound course: d = (1 + cos 30°) ÷ sin 30° × r
        const d = (1 + Math.cos(30 * DEG)) / Math.sin(30 * DEG) * r, p1 = [-d * Math.cos(30 * DEG), -d * Math.sin(30 * DEG)], cx = p1[0] - r * Math.sin(30 * DEG);
        const [ax, ay] = e(1.4 * Math.sin(50 * DEG), 1.4 * Math.cos(50 * DEG)), [x1, y1] = e(...p1), [x2, y2] = e(cx, 0);
        return A(X(ax), Y(ay), X(fx) + 2, Y(fy) - 2, C.am, 2.5) + pth(`M${X(fx)} ${Y(fy)} L${f(X(x1))} ${f(Y(y1))} A${f(rr)} ${f(rr)} 0 1 1 ${f(X(x2))} ${f(Y(y2))} L${X(fx) - 4} ${Y(fy)}`, C.am);
      });
      s += mini(268, C.vi, 'パラレル', (X, Y, rr) => {
        // 270° on the outside (north) for a minute, a left turn of 225° to 045°, back to the inbound course and the fix
        const off = 0.18, [ax, ay] = e(1.4 * Math.sin(140 * DEG), 1.4 * Math.cos(140 * DEG)), [x1, y1] = e(-leg, off), c = [-leg, off - r];
        const p2 = [c[0] + r * Math.sin(45 * DEG), c[1] - r * Math.cos(45 * DEG)], [x2, y2] = e(...p2), [x3, y3] = e(p2[0] - p2[1] - 0.25, -0.02), [x0, y0] = e(-0.3, off);
        return A(X(ax), Y(ay), X(fx) + 2, Y(fy) + 2, C.vi, 2.5) + pth(`M${X(fx)} ${Y(fy)} Q${f(X(fx - 0.12 * k))} ${f(Y(y0))} ${f(X(x0))} ${f(Y(y0))} L${f(X(x1))} ${f(Y(y1))} A${f(rr)} ${f(rr)} 0 1 0 ${f(X(x2))} ${f(Y(y2))} L${f(X(x3))} ${f(Y(y3))} L${X(fx) - 4} ${Y(fy)}`, C.vi);
      });
      s += TL(8, 352, ['ダイレクト：フィックスで右旋回してアウトバウンドへ', 'ティアドロップ：アウトバウンドから 30° 内側へ 1 分 → 右旋回', 'パラレル：外側をアウトバウンドと平行に 1 分 → 左旋回で戻る'], { c: C.ink, a: 'start', fs: 12, lh: 17 });
      return svg(400, 396, s, '図：待機経路（課目 i4：LAB VOR へインバウンド 090°・右回り。北が上の模式図）。インバウンドはフィックスで終わります。入り方は、フィックスに着いたときの機首方位で 3 つの区域から選びます（AIM 5-3-8）。大きさは無風・100 kt の 1 分と標準旋回');
    },
    labIlsChart() {
      // a schematic of a fictional approach chart for LAB RWY 36, laid out like the parts an approach chart has (IFH chapter 1):
      // the briefing strip, the plan view, the profile view and the minimums. Data: avionics.js NAVAIDS (I-LAB 109.90, LAB VOR 113.50),
      // physics.js LAB_RWY (elevation 55 ft, 354° true = 360° magnetic, 1,200 m), the glide path of avionics.js (3° from 300 m past the
      // threshold), school.js's 2,000 ft. The missed approach, the minimums and the MSA are made-up values for this drawing
      const PH = FL.physics, AV = FL.avionics, R = PH.LAB_RWY, vor = AV.NAVAIDS.find(n => n.id === 'LBV'), loc = AV.NAVAIDS.find(n => n.id === 'ILAB');
      const gsNm = Math.tan(3 * DEG) * 1852 * PH.FT, gp0 = 300 / 1852, faf = (2000 - R.elevFt) / gsNm - gp0, da = 255, daNm = (da - R.elevFt) / gsNm - gp0;
      const mda = 480, tch = Math.tan(3 * DEG) * 300 * PH.FT;
      let s = `<rect x="2" y="2" width="396" height="586" rx="6" fill="#101c2c" stroke="${C.mut}"/>`;
      // the briefing strip
      s += T(200, 24, '架空の LAB ILS RWY 36（模式図）', { c: C.ink, b: 1, fs: 14 });
      s += `<rect x="10" y="34" width="380" height="58" fill="none" stroke="${C.grid}"/>` + L(140, 34, 140, 92, C.grid, 1) + L(270, 34, 270, 92, C.grid, 1);
      s += TL(75, 54, ['LOC I-LAB', `${(loc.freq / 1000).toFixed(2)}`], { c: C.gr, b: 1, fs: 12, lh: 18 }) + TL(205, 54, ['最終進入コース', '360°'], { c: C.ink, b: 1, fs: 12, lh: 18 }) + TL(330, 54, ['GS 3.00°', `TCH ${Math.round(tch)} ft`], { c: C.ink, b: 1, fs: 12, lh: 18 });
      s += TL(14, 110, ['進入復行：まっすぐ 2,000 ft まで上昇し、LAB VOR へ直行して待機'], { c: C.am, a: 'start', fs: 12 });
      // the plan view (north up)
      const k = 22, ox = 96, oy = 200, Q = (e, n) => [ox + e * k, oy - n * k];
      s += `<rect x="10" y="120" width="380" height="226" fill="none" stroke="${C.grid}"/>` + T(16, 138, '平面図', { c: C.mut, a: 'start', fs: 12 });
      const [rx, ry] = Q(0, 0), rl = R.len / 1852 * k;
      s += `<rect x="${rx - 3}" y="${(ry - rl).toFixed(1)}" width="6" height="${rl.toFixed(1)}" fill="${C.ink}"/>`;
      // the localizer course (a long feather toward the runway) and the final approach fix
      const [fx0, fy0] = Q(0, -faf), [sx, sy] = Q(0, -6.5), [ax0, ay0] = Q(0, -3.6);
      s += `<path d="M${rx} ${sy.toFixed(1)} L${rx + 7} ${(sy - 14).toFixed(1)} L${rx + 7} ${(ry + 6).toFixed(1)} L${rx} ${(ry + 2).toFixed(1)} Z" fill="${C.gr}" fill-opacity="0.25" stroke="${C.gr}"/>` + A(rx - 12, ay0 + 24, rx - 12, ay0 - 24, C.gr, 2);
      s += T(rx - 18, (ay0 + 4).toFixed(1), '360°', { c: C.gr, b: 1, fs: 12, a: 'end' });
      s += `<circle cx="${rx}" cy="${fy0.toFixed(1)}" r="4" fill="${C.am}"/>` + TL(rx + 14, fy0 - 2, [`GS 会合 ${faf.toFixed(1)} NM`, '（2,000 ft）'], { c: C.am, a: 'start', fs: 12, lh: 15, halo: 1 });
      // the LAB VOR, the missed approach and its hold (the i4 hold: inbound 090, right turns, west of the station)
      const dE = (vor.e - R.e) / 1852, dN = (vor.n - R.n) / 1852, [vx, vy] = Q(dE, dN);
      const hk = k, hl = 100 / 60 * hk, hr = 100 / 3600 / (3 * DEG) * hk;
      s += `<path d="M${(vx - hl).toFixed(1)} ${vy.toFixed(1)} L${vx.toFixed(1)} ${vy.toFixed(1)} A${hr.toFixed(1)} ${hr.toFixed(1)} 0 0 1 ${vx.toFixed(1)} ${(vy + 2 * hr).toFixed(1)} L${(vx - hl).toFixed(1)} ${(vy + 2 * hr).toFixed(1)} A${hr.toFixed(1)} ${hr.toFixed(1)} 0 0 1 ${(vx - hl).toFixed(1)} ${vy.toFixed(1)}" stroke="${C.am}" stroke-width="2" stroke-dasharray="6 4" fill="none"/>`;
      const [mx, my] = Q(0, 2.6);
      s += `<path d="M${rx} ${(ry - rl - 4).toFixed(1)} L${rx} ${(my + 18).toFixed(1)} Q${rx} ${my.toFixed(1)} ${rx + 18} ${my.toFixed(1)} L${(vx - 12).toFixed(1)} ${(vy - 2).toFixed(1)}" stroke="${C.am}" stroke-width="2" stroke-dasharray="6 4" fill="none"/>` + A(vx - 30, vy - 2.5, vx - 10, vy - 1, C.am, 2);
      s += `<circle cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="12" fill="none" stroke="${C.bl}" stroke-width="1.5"/><circle cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="3.5" fill="${C.bl}"/>`;
      s += TL(vx - 6, vy + 2 * hr + 22, ['LAB VOR', `${(vor.freq / 1000).toFixed(2)}`], { c: C.bl, b: 1, fs: 12, lh: 15 });
      s += T(rx + 10, ry + 16, 'RWY 36', { c: C.ink, b: 1, fs: 12, a: 'start' });
      s += `<rect x="214" y="230" width="170" height="40" rx="4" fill="${C.bg}" stroke="${C.mut}"/>` + TL(299, 246, ['MSA（LAB VOR から 25 NM）', '1,600 ft'], { c: C.ink, fs: 12, lh: 16 });
      s += TL(382, 300, ['模式図・架空', 'NOT FOR NAVIGATION'], { c: C.am, b: 1, fs: 12, a: 'end', lh: 16 });
      // the profile view (distance from the threshold; heights not to scale)
      const y0 = 356, X = d => 360 - d * 46, H = h => y0 + 120 - h * 0.046;
      s += `<rect x="10" y="${y0}" width="380" height="138" fill="none" stroke="${C.grid}"/>` + T(16, y0 + 130, '断面図', { c: C.mut, a: 'start', fs: 12 });
      s += L(X(0), H(R.elevFt), 386, H(R.elevFt), C.ink, 4) + L(14, H(0) + 6, 386, H(0) + 6, C.grid, 1);
      s += L(18, H(2000), X(faf), H(2000), C.ink, 2.5) + L(X(faf), H(2000), X(-gp0), H(R.elevFt), C.gr, 2.5);
      s += `<circle cx="${X(faf).toFixed(1)}" cy="${H(2000).toFixed(1)}" r="4" fill="${C.am}"/>` + T(X(faf) - 4, H(2000) - 10, '2,000', { c: C.am, b: 1, fs: 12, a: 'end' }) + T(X(faf) + 8, H(2000) - 10, 'GS に会合', { c: C.ink, fs: 12, a: 'start' });
      s += `<circle cx="${X(daNm).toFixed(1)}" cy="${H(da).toFixed(1)}" r="4" fill="${C.rd}"/>` + T(X(daNm) - 8, H(da) - 12, `DA ${da}`, { c: C.rd, b: 1, fs: 12, a: 'end' });
      s += L(X(daNm), H(da), X(-0.4), H(1200), C.am, 2, '6 4') + A(X(-0.25), H(900), X(-0.42), H(1300), C.am, 2) + T(X(-0.1), H(1500) + 2, '進入復行', { c: C.am, b: 1, fs: 12, a: 'end' });
      s += L(X(faf) + 30, H(mda), X(0), H(mda), C.mut, 1.5, '4 4') + T(X(3.4), H(mda) - 6, `LOC だけなら MDA ${mda}`, { c: C.mut, fs: 12 });
      s += T(386, H(R.elevFt) + 18, `接地帯 ${R.elevFt} ft`, { c: C.mut, fs: 12, a: 'end' }) + T(X(faf / 2) - 20, H(1100) - 4, '3°', { c: C.gr, b: 1, fs: 12 });
      // the minimums
      const y1 = 502;
      s += `<rect x="10" y="${y1}" width="380" height="78" fill="none" stroke="${C.grid}"/>` + L(10, y1 + 26, 390, y1 + 26, C.grid, 1) + L(10, y1 + 52, 390, y1 + 52, C.grid, 1) + L(110, y1, 110, y1 + 78, C.grid, 1) + L(250, y1, 250, y1 + 78, C.grid, 1);
      s += T(60, y1 + 18, '最低気象条件', { c: C.mut, fs: 12 }) + T(180, y1 + 18, '高度（接地帯から）', { c: C.mut, fs: 12 }) + T(320, y1 + 18, '視程', { c: C.mut, fs: 12 });
      s += T(60, y1 + 44, 'ILS', { c: C.gr, b: 1, fs: 12 }) + T(180, y1 + 44, `DA ${da}（${da - R.elevFt}）`, { c: C.ink, b: 1, fs: 12 }) + T(320, y1 + 44, '3/4 SM', { c: C.ink, b: 1, fs: 12 });
      s += T(60, y1 + 70, 'LOC', { c: C.mut, b: 1, fs: 12 }) + T(180, y1 + 70, `MDA ${mda}（${mda - R.elevFt}）`, { c: C.ink, b: 1, fs: 12 }) + T(320, y1 + 70, '1 SM', { c: C.ink, b: 1, fs: 12 });
      return svg(400, 590, s, '図：進入図の読み方（架空の LAB ILS RWY 36 の模式図）。上から、ブリーフィングの欄・平面図・断面図・最低気象条件の欄。周波数と位置はシミュレータのデータ、進入復行・最低気象条件・MSA は説明のための架空の値です');
    },
    ils() {
      // the ILS in two views (AIM 1-1-9, IFH chapter 9) and how the needles read. Plan (north up): the localizer from its antenna past
      // the far end of runway 36 (avionics.js: ±2.5° full scale, 1.25°/dot), the 30° intercept of lesson i5 (heading 330 from the east).
      // Profile (heights exaggerated): the glide path 3° ± 0.7° (0.35°/dot) from 300 m past the threshold, met from below at 2,000 ft
      // (school.js) about 5.9 NM out, DA 255 ft (touchdown zone 55 ft + 200 ft, syllabus i5) and a false course at a steeper angle
      const PH = FL.physics, R = PH.LAB_RWY, gsNm = Math.tan(3 * DEG) * 1852 * PH.FT, gp0 = 300 / 1852, faf = (2000 - R.elevFt) / gsNm - gp0, daNm = (255 - R.elevFt) / gsNm - gp0;
      let s = T(14, 18, '上から見る（ローカライザー：左右）', { c: C.gr, b: 1, a: 'start', fs: 12 });
      // plan view: the runway at the top, the approach from the south; the fan drawn wider than ±2.5° so it can be seen
      const rx = 150, ay = 36, ry = 50, fan = 10, by = 196;
      s += `<path d="M${rx} ${ay} L${(rx - (by - ay) * Math.tan(fan * DEG)).toFixed(1)} ${by} L${(rx + (by - ay) * Math.tan(fan * DEG)).toFixed(1)} ${by} Z" fill="${C.gr}" fill-opacity="0.12" stroke="${C.gr}" stroke-dasharray="4 3"/>`;
      s += L(rx, ay, rx, by, C.gr, 1.5, '6 4') + `<rect x="${rx - 4}" y="${ry}" width="8" height="30" fill="${C.ink}"/>` + L(rx - 14, ay, rx + 14, ay, C.gr, 4);
      s += T(rx + 20, ay + 4, 'アンテナ（滑走路の先）', { c: C.gr, fs: 12, a: 'start' }) + T(rx + 10, ry + 22, 'RWY 36', { c: C.ink, b: 1, fs: 12, a: 'start' });
      s += T(rx, by + 16, '±2.5°（角度は誇張）', { c: C.gr, b: 1, fs: 12 });
      // the intercept on heading 330 from the east: straight, then a turn onto 360° as the needle comes alive
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
      const fd = (2150 - R.elevFt) / (Math.tan(9 * DEG) * 1852 * PH.FT) - gp0;
      s += L(X(-gp0), H(R.elevFt), X(fd), H(2150), C.rd, 1.5, '2 4') + T(X(fd) - 4, H(2150) + 2, '偽の道（例 9°）', { c: C.rd, fs: 12, a: 'end' });
      s += L(14, H(2000), X(faf), H(2000), C.ink, 2) + planeSide(44, H(2000) - 4, 0.3) + `<circle cx="${X(faf).toFixed(1)}" cy="${H(2000).toFixed(1)}" r="4.5" fill="${C.am}"/>`;
      s += TL(X(faf) - 6, H(2000) + 20, ['2,000 ft・' + faf.toFixed(1) + ' NM', 'ここで下から会合'], { c: C.am, b: 1, fs: 12, a: 'end', lh: 15 });
      s += T(X(4.2), H(gp(2.3, 4.2)) + 18, '3°（上下 ±0.7°）', { c: C.gr, b: 1, fs: 12 });
      s += `<circle cx="${X(daNm).toFixed(1)}" cy="${H(255).toFixed(1)}" r="4.5" fill="${C.rd}"/>` + TL(X(daNm) - 10, H(255) - 22, ['DA 255 ft', '（接地帯から 200 ft）'], { c: C.rd, b: 1, fs: 12, a: 'end', lh: 15 });
      // how the needles read: the CDI bar and the glide slope diamond point to where the path is
      const y1 = 400, cases = [[1, -1, 'コースは右・自分は高い', '→ 右へ 2〜5°・降下率を少し増やす'], [-1, 1, 'コースは左・自分は低い', '→ 左へ 2〜5°・降下率を少し減らす'], [0, -1, 'コースに乗っている・自分は高い', '→ 針路はそのまま・降下率を少し増やす'], [1, 0, 'コースは右・高さは正しい', '→ 右へ 2〜5°・降下率はそのまま']];
      s += T(14, y1, '針の読み方：針と菱形は「行くべき道」のある方を指す', { c: C.ink, b: 1, a: 'start', fs: 12 });
      cases.forEach(([lc, gc, a, b], i) => {
        const x = 10, y = y1 + 10 + i * 50, cx = x + 34, cy = y + 23;
        let u = `<rect x="${x}" y="${y}" width="380" height="44" rx="6" fill="${C.bg}" stroke="${C.grid}"/>`;
        for (const d of [-2, -1, 1, 2]) u += `<circle cx="${cx + d * 8}" cy="${cy}" r="2.2" fill="none" stroke="${C.ink}"/>` + `<circle cx="${x + 72}" cy="${cy + d * 8}" r="2.2" fill="none" stroke="${C.ink}"/>`;
        u += L(cx + lc * 8, cy - 15, cx + lc * 8, cy + 15, C.gr, 3) + L(cx - 3, cy, cx + 3, cy, C.mut, 1);
        const gy = cy - gc * 8;
        u += `<path d="M${x + 72} ${gy - 6} L${x + 77} ${gy} L${x + 72} ${gy + 6} L${x + 67} ${gy} Z" fill="${C.gr}"/>`;
        s += u + TL(x + 90, y + 18, [a, b], { c: C.ink, fs: 12, a: 'start', lh: 17 });
      });
      s += NFN(392, 222);
      return svg(400, 614, s, '図：ILS（計器着陸装置）を上と横から見た模式図と、針の読み方。ローカライザーは左右、グライドスロープは上下のずれを示します。数字は架空の I-LAB（シミュレータのデータ）と課目 i5 の値');
    },
    npProfile() {
      // a non-precision approach seen from the side (AIM 5-4-5, AC 120-108): from the final approach fix at 2,000 ft (5.9 NM, as on
      // the LAB chart) to an MDA of 480 ft, flown "dive and drive" (about 1,000 fpm at 90 kt, then level) or as a CDFA on a 3° angle
      // that meets the MDA at the VDP; the MAP at the threshold and the missed approach climb; an LPV's DA on the same 3° path for
      // comparison. Heights are made-up values for the drawing (touchdown zone 55 ft)
      const PH = FL.physics, z = PH.LAB_RWY.elevFt, gsNm = Math.tan(3 * DEG) * 1852 * PH.FT, gp0 = 300 / 1852, faf = (2000 - z) / gsNm - gp0;
      const mda = 480, vdp = (mda - z) / gsNm - gp0, da = 255, daNm = (da - z) / gsNm - gp0, dd = faf - (2000 - mda) / (1000 / (90 / 60));
      const X = d => 336 - d * 47, H = h => 286 - h * 0.115;
      let s = L(12, H(0) + 4, 392, H(0) + 4, C.grid, 1) + L(X(0), H(z), 392, H(z), C.ink, 4) + T(392, H(z) - 8, '滑走路', { c: C.mut, fs: 12, a: 'end' });
      for (const d of [0, 1, 2, 3, 4, 5, 6]) s += L(X(d), H(0) + 4, X(d), H(0) + 9, C.mut, 1) + T(X(d), H(0) + 22, d, { c: C.mut, fs: 12 });
      s += T(200, H(0) + 40, '滑走路端からの距離（NM）', { c: C.mut, fs: 12 });
      // the MDA band (+100 / -0 ft in the ACS)
      s += `<rect x="${X(faf)}" y="${H(mda + 100)}" width="${(X(0) - X(faf)).toFixed(1)}" height="${(H(mda) - H(mda + 100)).toFixed(1)}" fill="${C.am}" fill-opacity="0.12"/>` + L(X(faf), H(mda), X(0), H(mda), C.am, 1.5, '6 4');
      s += TL(X(faf) + 2, H(mda) + 18, [`MDA ${mda} ft`, 'ACS：＋100／−0 ft'], { c: C.am, b: 1, fs: 12, a: 'start', lh: 15 });
      // dive and drive (red) and CDFA (green)
      s += P([[16, H(2000)], [X(faf), H(2000)], [X(dd), H(mda)], [X(0), H(mda)]], C.rd, 2.5) + T(118, 170, 'dive and drive', { c: C.rd, b: 1, fs: 12, a: 'end' }) + T(124, 186, '早く降りて水平に', { c: C.rd, fs: 12, a: 'end' });
      s += P([[X(faf), H(2000)], [X(vdp), H(mda)]], C.gr, 3) + L(X(vdp), H(mda), X(-gp0), H(z), C.gr, 2, '3 3');
      s += TL(X(3.2), H(1500) - 22, ['CDFA：一定の角度（約 3°）で', '降り続ける'], { c: C.gr, b: 1, fs: 12, a: 'start', lh: 15 });
      s += `<circle cx="${X(faf).toFixed(1)}" cy="${H(2000).toFixed(1)}" r="4.5" fill="${C.ink}"/>` + T(X(faf), H(2000) - 12, `FAF 2,000 ft`, { c: C.ink, b: 1, fs: 12 });
      s += `<circle cx="${X(vdp).toFixed(1)}" cy="${H(mda).toFixed(1)}" r="4.5" fill="${C.gr}"/>` + T(X(vdp) - 6, H(mda) + 18, 'VDP', { c: C.gr, b: 1, fs: 12, a: 'end' });
      s += `<circle cx="${X(daNm).toFixed(1)}" cy="${H(da).toFixed(1)}" r="4" fill="${C.vi}"/>` + TL(X(daNm) + 6, H(da) + 30, [`LPV なら DA ${da} まで`], { c: C.vi, b: 1, fs: 12, a: 'end' });
      // the MAP and the missed approach
      s += L(X(0), H(mda) - 12, X(0), H(z) + 2, C.rd, 2) + T(X(0) - 4, H(mda) - 16, 'MAP', { c: C.rd, b: 1, fs: 12, a: 'end' });
      s += P([[X(0), H(mda)], [X(-0.38), H(1050)]], C.am, 2, 'none', '6 4') + A(X(-0.3), H(950), X(-0.4), H(1100), C.am, 2) + TL(394, H(1180) - 40, ['進入復行', '（200 ft/NM', '以上）'], { c: C.am, b: 1, fs: 12, a: 'end', lh: 15 });
      s += T(12, 18, '模式図（高さは架空の値・縦は誇張）', { c: C.mut, fs: 12, a: 'start' });
      return svg(400, 336, s, '図：非精密進入の 2 つの降り方（横から見た模式図）。FAF のあとすぐ MDA まで降りて水平に飛ぶ dive and drive と、一定の角度で MDA まで降り続ける CDFA。CDFA では、MDA に着く（VDP の近く）までに目印が見えなければ、水平にせずに進入復行します');
    },
    // ---------------------------------------------------------------- 第 23 章 me（Seminole と双発機の基礎）
    counterRotation() {
      // AFH chapter 13 (critical engine, P-factor, counter-rotating engines): seen from above, nose up. The descending blade of each
      // propeller gives more thrust at a positive angle of attack, so each engine's thrust acts a little to one side of its centre.
      // Seminole (physics.js pa44: counterRotating): left engine clockwise and right engine counter-clockwise seen from behind, both
      // descending blades inboard, equal arms. A conventional twin (both clockwise): the right engine's descending blade is outboard,
      // so losing the left engine leaves the longest arm: the left engine is critical
      const panel = (cy, k, title, cw, lines) => {
        const ex = 24 * k, pr = 12 * k, py = cy - 26 * k, ya = py - 34 * k - 6;
        let s = T(200, cy - 62 * k - 28, title, { c: C.ink, b: 1, fs: 13 }) + planeTop(200, cy, k, { twin: true });
        // per engine: the rotation seen from behind and the side of the descending blade (where the thrust line sits)
        [[-1, 1], [1, cw ? -1 : 1]].forEach(([side, rot]) => {
          const x = 200 + side * ex, tx = x + rot * pr * 0.55;
          s += A(tx, py + 6, tx, py - 30 * k, C.gr, 3) + `<circle cx="${tx.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" fill="${C.gr}"/>` + L(200, ya, tx, ya, C.am, 1.5, '3 3');
          s += TL(200 + side * (ex + 36 * k), py - 4, [rot > 0 ? '右回り' : '左回り', '（後ろから）'], { c: C.cy, b: 1, fs: 12, lh: 15 });
        });
        s += T(200, ya - 6, '推力の腕', { c: C.am, b: 1, fs: 12 });
        return s + TL(200, cy + 58 * k, lines, { c: C.ink, fs: 12, lh: 17 });
      };
      let s = panel(140, 1.45, 'Seminole：左右のプロペラが逆に回る', true, ['下がる羽根（推力が大きい側）が、左右とも内側', '→ どちらが止まっても、残った推力の腕は同じ', '→ 臨界発動機がない']);
      s += L(16, 270, 384, 270, C.grid, 1);
      s += panel(392, 1.2, 'ふつうの双発：どちらも同じ向きに回る', false, ['右エンジンの下がる羽根は外側（腕が長い）', '→ 左が止まると、残った右の推力で大きく振られる', '→ 左エンジンが臨界発動機']);
      s += T(8, 514, '緑の矢印：下がる羽根の側の推力（P ファクター）', { c: C.gr, a: 'start', fs: 12 });
      return svg(400, 522, s, '図：左右逆回転のプロペラと臨界発動機（上から見た模式図）。下がる羽根の側の推力が大きいので、推力は少し片寄って働きます。Seminole は左右とも内側なので、どちらのエンジンが止まっても同じです（AFH 第 13 章）');
    },
    twinAsi() {
      // the airspeed indicator of a light twin (AFH Figure 13-1) with the course's Seminole speeds (physics.js pa44.v: Vso, Vs1, Vfe,
      // Vno, Vne, Vmc, Vyse): white arc Vso–Vfe, green arc Vs1–Vno, yellow arc Vno–Vne, red radial at Vne, and the two marks only
      // twins have: the red radial at Vmc and the blue radial at Vyse
      const v = ac('pa44').v, cx = 208, cy = 172, R = 112, v0 = 40, v1 = 220, th = s => (-140 + (s - v0) / (v1 - v0) * 280) * DEG;
      const pt = (s, r) => [cx + r * Math.sin(th(s)), cy - r * Math.cos(th(s))];
      const arc = (a, b, r, c, w) => { const [x0, y0] = pt(a, r), [x1, y1] = pt(b, r); return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${(b - a) / (v1 - v0) * 280 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${c}" stroke-width="${w}" fill="none"/>`; };
      let s = `<circle cx="${cx}" cy="${cy}" r="${R + 14}" fill="#05080d" stroke="${C.mut}" stroke-width="2"/>`;
      s += arc(v.s0, v.fe, R - 22, '#f2f4f7', 7) + arc(v.s1, v.no, R - 10, C.gr, 8) + arc(v.no, v.ne, R - 10, '#ffd23e', 8);
      for (let k = v0; k <= v1; k += 10) { const [x0, y0] = pt(k, R + 2), [x1, y1] = pt(k, k % 20 ? R - 4 : R - 10); s += L(x0.toFixed(1), y0.toFixed(1), x1.toFixed(1), y1.toFixed(1), C.ink, k % 20 ? 1 : 2); }
      for (let k = 40; k <= 220; k += 20) { const [x, y] = pt(k, R - 44); s += T(x.toFixed(1), (y + 4).toFixed(1), k, { c: C.ink, fs: 12, b: 1 }); }
      const radial = (sp, c, w) => { const [x0, y0] = pt(sp, R - 30), [x1, y1] = pt(sp, R + 12); return L(x0.toFixed(1), y0.toFixed(1), x1.toFixed(1), y1.toFixed(1), c, w); };
      s += radial(v.ne, '#ff3b30', 4) + radial(v.mc, '#ff3b30', 4) + radial(v.yse, '#3d8bff', 5);
      s += T(cx, cy + 26, 'KNOTS', { c: C.mut, fs: 12 });
      // labels outside the dial with short leaders
      const tag = (sp, r, lines, c, a) => { const [x0, y0] = pt(sp, R + 14), [x1, y1] = pt(sp, r); return L(x0.toFixed(1), y0.toFixed(1), x1.toFixed(1), y1.toFixed(1), c, 1.5) + TL(x1 + (a === 'end' ? -4 : 4), y1 + 4, lines, { c, b: 1, fs: 12, a, lh: 15 }); };
      s += tag(v.mc, R + 34, ['赤い線', `Vmc ${v.mc} kt`], '#ff6a5a', 'end') + tag(v.yse, R + 30, ['青い線', `Vyse ${v.yse} kt`], '#5fa8ff', 'end') + tag(v.ne, R + 26, ['赤い線', `Vne ${v.ne}`], '#ff6a5a', 'start');
      const rows = [['#f2f4f7', `白い弧：${v.s0}〜${v.fe} kt（フラップを使える速度）`], [C.gr, `緑の弧：${v.s1}〜${v.no} kt（ふだん使う速度）`], ['#ffd23e', `黄の弧：${v.no}〜${v.ne} kt（穏やかな空気のときだけ）`]];
      rows.forEach(([c, t], i) => { s += `<rect x="20" y="${330 + i * 20}" width="18" height="6" fill="${c}"/>` + T(46, 337 + i * 20, t, { c: C.ink, fs: 12, a: 'start' }); });
      return svg(400, 392, s, '図：双発機の速度計（Seminole の速度の模式図）。赤い線（Vmc）は片発で方向を保てる最小の速度、青い線（Vyse）は片発で最もよく上昇できる速度です。双発機だけにある 2 つの目印です（AFH 第 13 章）');
    },
    // ---------------------------------------------------------------- 第 24 章 oei（片発停止）
    oeiForces() {
      // AFH chapter 13: the left engine has failed. The right engine's thrust (offset from the centre line) and the drag of the
      // windmilling left propeller turn the nose left (yaw) and the left wing goes down (roll: the right wing keeps the propwash).
      // Right rudder makes a sideways force on the fin to the LEFT, which swings the tail left and the nose back right
      const cx = 200, cy = 196, k = 1.75;
      let s = planeTop(cx, cy, k, { twin: true });
      const ex = 24 * k, py = cy - 26 * k;
      // the dead left engine: the windmilling propeller and its drag
      s += `<circle cx="${cx - ex}" cy="${py}" r="${12 * k}" fill="none" stroke="${C.rd}" stroke-width="2" stroke-dasharray="4 3"/>` + A(cx - ex, py + 6, cx - ex, py + 62, C.rd, 4);
      s += TL(14, py + 82, ['止まった左エンジン：', '風車状態のプロペラの抗力'], { c: C.rd, b: 1, fs: 12, a: 'start', lh: 15 });
      // the live right engine: thrust
      s += A(cx + ex, py - 4, cx + ex, py - 66, C.gr, 4) + TL(cx + ex + 14, py - 56, ['生きている右エンジン', 'の推力'], { c: C.gr, b: 1, fs: 12, a: 'start', lh: 15 });
      // the yaw (nose turns left)
      s += ARC(cx, cy, 100, -60, -112, C.am, 3) + T(cx, cy - 116, '機首が止まった側（左）へ回る', { c: C.am, b: 1, fs: 12 });
      // the fin force from right rudder: to the left, at the tail
      const ty = cy + 46 * k;
      s += A(cx + 6, ty + 4, cx - 48, ty + 4, C.cy, 4) + TL(cx - 54, ty + 26, ['右ラダー（生きている側の足）で', '尾翼に左向きの力 → 機首が右へ戻る'], { c: C.cy, b: 1, fs: 12, a: 'start', lh: 15 });
      // the roll seen from behind (small)
      s += `<g transform="rotate(-12 342 344)"><path d="M306 347 L378 347" stroke="${PLANE2}" stroke-width="4" stroke-linecap="round"/><ellipse cx="342" cy="344" rx="6" ry="7" fill="${PLANE}"/><path d="M340 337 L340 326 L344 326 L344 337 Z" fill="${PLANE}"/><circle cx="325" cy="348" r="4" fill="${PLANE2}"/><circle cx="359" cy="348" r="4" fill="${PLANE2}"/><circle cx="325" cy="348" r="8" fill="none" stroke="${C.rd}" stroke-dasharray="3 2"/><circle cx="359" cy="348" r="8" fill="none" stroke="${C.mut}"/></g>` + T(342, 376, '後ろから見ると：', { c: C.mut, fs: 12 }) + T(342, 392, '左の翼が下がる', { c: C.am, b: 1, fs: 12 });
      return svg(400, 404, s, '図：左エンジンが止まると、右エンジンの推力と止まった側のプロペラの抗力で、機首が左へ回り（ヨー）、左の翼が下がります（ロール）。右ラダーで尾翼に左向きの力をつくって止めます（AFH 第 13 章。上から見た模式図）');
    },
    vmcRudder() {
      // how much rudder the course's Seminole needs to hold the heading with the left engine failed (windmilling), the right engine at
      // full power, 5° of bank toward it and the gear up, as the speed falls: computed with FL.physics (pa44) by holding each speed for
      // 25 s with the method of flight.test.mjs ("the rudder needed grows … full rudder at the red line"). The stall warning (stallWarn)
      // came on at about 62 kt in both runs. Values in % of full rudder
      const D1 = [[90, 32], [85, 37], [80, 43], [75, 50], [70, 59], [66, 68], [64, 73], [62, 78], [60, 84], [58, 91], [56, 100]];
      const D5 = [[90, 25], [85, 29], [80, 34], [75, 40], [70, 47], [66, 55], [64, 59], [62, 64], [60, 69], [58, 75], [56, 82]];
      const v = ac('pa44').v, f = frame(400, 300, 50, 95, 0, 110, [50, 60, 70, 80, 90], [0, 25, 50, 75, 100], '指示対気速度（kt）', '必要なラダー（%）', { l: 52, r: 14, t: 34, b: 40 });
      let s = `<rect x="${f.X(50)}" y="34" width="${(f.X(62) - f.X(50)).toFixed(1)}" height="${(f.Y(0) - 34).toFixed(1)}" fill="${C.am}" fill-opacity="0.12"/>` + f.s;
      s += T(f.X(56), 28, '失速警報（約 62 kt 以下）', { c: C.am, fs: 12 });
      s += L(f.X(50), f.Y(100), f.X(95), f.Y(100), C.rd, 1.5, '6 4') + T(f.X(94), f.Y(100) - 6, 'ラダーいっぱい', { c: C.rd, fs: 12, a: 'end' });
      s += L(f.X(v.mc), f.Y(0), f.X(v.mc), f.Y(110), C.rd, 2.5) + T(f.X(v.mc) + 4, f.Y(10), `赤い線 Vmc ${v.mc}`, { c: C.rd, b: 1, fs: 12, a: 'start' });
      s += P(D1.map(([x, y]) => [f.X(x), f.Y(y)]), C.cy, 3) + P(D5.map(([x, y]) => [f.X(x), f.Y(y)]), C.gr, 3, 'none', '7 4');
      s += T(f.X(78), f.Y(52), '1,000 ft', { c: C.cy, b: 1, fs: 12 }) + T(f.X(84), f.Y(22), '5,000 ft', { c: C.gr, b: 1, fs: 12 });
      s += A(f.X(92), f.Y(70), f.X(80), f.Y(70), C.mut, 2) + T(f.X(86), f.Y(70) - 8, '速度が下がる', { c: C.mut, fs: 12 });
      return svg(400, 300, s, '図：速度が下がるほど、方向を保つのに必要なラダーが増え、いっぱいになる速度が Vmc です（教材のフライトモデルの Seminole：左エンジン停止・右は全開・バンク 5°）。どちらの高さでも、ラダーがいっぱいになる前に失速警報（約 62 kt）が鳴ります。高い所ほど出力が減り、必要なラダーは少なくなります');
    },
  };

  // ---------------------------------------------------------------- calculators inside the text
  const ARCHER_WB = {
    // the Archer III POH's arms (inches aft of the datum) and CG envelope; the basic empty weight and its arm are an example (each airplane has its own)
    rows: [['空虚重量（BEW）', 1640, 87.0], ['前席（操縦士・同乗者）', 340, 80.5], ['後席', 150, 118.1], ['燃料（40 gal × 6 lb）', 240, 95.0], ['手荷物', 50, 142.8]],
    env: [[82.0, 1600], [82.0, 2050], [88.6, 2550], [93.0, 2550], [93.0, 1600]],
    max: 2550,
  };
  // the book's worked example (perf.wbex): the empty weight above, the POH's arms; ① aft of the limit, ② one rear passenger moved to the
  // front seat, ③ ② after 20 gal burnt. Each: { w, m, cg, items: [[label, lb, arm]] }
  ARCHER_WB.fwd = w => w <= 2050 ? 82.0 : 82.0 + (w - 2050) / 500 * 6.6;
  ARCHER_WB.example = () => {
    const R = ARCHER_WB.rows, load = (front, rear, gal, bag) => {
      const items = [[R[0][0], R[0][1], R[0][2]], ['前席', front, R[1][2]], ['後席', rear, R[2][2]], [`燃料（${gal} gal）`, gal * 6, R[3][2]], ['手荷物', bag, R[4][2]]];
      const w = items.reduce((a, r) => a + r[1], 0), m = items.reduce((a, r) => a + r[1] * r[2], 0);
      return { w, m, cg: m / w, items };
    };
    return [load(170, 340, 30, 100), load(340, 170, 30, 100), load(340, 170, 10, 100)];
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
        out.innerHTML = ok ? `<span style="color:#5fd46a">範囲内</span>：重量 ${Math.round(tw)} lb（最大 ${ARCHER_WB.max}）・重心 ${cg.toFixed(1)} in（許容 ${fwdAt(tw).toFixed(1)}〜93.0 in は POH の値。空虚重量は例）` : `<span style="color:#ff6a5a">範囲外</span>：重量 ${Math.round(tw)} lb・重心 ${cg.toFixed(1)} in。荷物や燃料を減らす・積む位置を変える`; };
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
