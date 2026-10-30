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
  // a tinted box (o: fo fill opacity, dash, rx, sw, fill) and the small arrowheads down and up (the chapter intro's figures)
  const rect = (x, y, w, h, c, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 7}" fill="${o.fill || c}" fill-opacity="${o.fill ? 1 : (o.fo === undefined ? 0.12 : o.fo)}" stroke="${c}" stroke-width="${o.sw || 1.4}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
  const down = (x, y, c = C.mut) => `<path d="M${x - 5} ${y} l5 6 l5 -6 Z" fill="${c}"/>`;
  const up = (x, y, c = C.mut) => `<path d="M${x - 5} ${y} l5 -6 l5 6 Z" fill="${c}"/>`;
  // the chapter basics' figures: the side view without the gear (pitch: nose up +), numbers with thousands separators, a
  // heading of three figures
  const plane = (x, y, k = 1, pitch = 0) => planeSide(x, y, k, { pitch, gear: false });
  const fmt = n => n.toLocaleString('en-US');
  const pad3 = n => String(Math.round(n)).padStart(3, '0');
  // the chapter english's figures: text escaped for SVG, and the three names of one entry of FL.terms (the official name,
  // the first common name, the English; FL.terms is read when the figure is drawn, and a product without it gets the same names)
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const names = id => {
    const e = FL.terms && typeof FL.terms.byId === 'function' ? FL.terms.byId(id) : null;
    if (e) return { formal: e.formal, common: e.common[0] || '', en: e.en };
    return { aileron: { formal: '補助翼', common: 'エルロン', en: 'aileron' } }[id];
  };

  const FIG = {
    // ---------------------------------------------------------------- intro（はじめに。序部 第 1 章：R1・W10）
    // ---------------------------------------------------------------- intro.use：8 つの部
    courseMap() {
      const B = FL.book || {}, PARTS = B.PARTS || [], CH = B.CHAPTERS || [];
      // [part id, the label, the title when the part is not in the book, what it holds, colour]
      const rows = [
        ['p0', '序部', '出発の前に（日本で準備する）', 'この本の使い方・資格と試験・基本の量', C.am],
        ['p1', '第 1 部', '地上学科（英語の座学）', '原理・機体・気象・規則・交信・人間', C.cy],
        ['p2', '第 2 部', 'Sanford・Piper Archer の基礎操縦', '点検・基本操縦・離着陸・緊急操作・ソロ', C.gr],
        ['p3', '第 3 部', '航法・目的地変更', '地図・航法の計算・電波航法と GPS', C.am],
        ['p4', '第 4 部', '計器飛行', '計器だけを見て飛ぶ・IFR の決まりと進入', C.vi],
        ['p5', '第 5 部', 'Piper Seminole・多発', 'エンジン 2 つの飛行機・エンジン 1 つの停止', C.bl],
        ['p6', '第 6 部', 'CRM・TEM・ジェットと自動化への準備', 'チームで飛ぶ・エアラインへの準備', C.rd],
        ['p7', '第 7 部', '日本の空と JCAB 学科', '日本の法令・空域・管制・学科試験', C.am],
      ];
      let s = '';
      rows.forEach(([id, label, fallback, sub, c], i) => {
        const p = PARTS.find(x => x.id === id), n = CH.filter(x => x.part === id).length, y = 6 + i * 46;
        const title = p ? String(p.title).replace(/^(?:序部|第\s?\d+\s?部)\s*/, '') : fallback;
        s += rect(8, y, 384, 40, c, p ? {} : { fo: 0.04, dash: '5 4' });
        s += T(18, y + 17, label, { c, b: 1, a: 'start', fs: 13 }) + T(76, y + 17, title, { c: p ? C.ink : C.mut, b: 1, a: 'start', fs: 13 });
        s += T(18, y + 34, sub, { c: p ? C.ink : C.mut, a: 'start', fs: 12 });
        s += T(384, y + 34, p ? `${n} 章` : 'この版にはまだない', { c: C.mut, a: 'end', fs: 12 });
        if (i < rows.length - 1) s += down(200, y + 40);
      });
      return svg(400, 374, s, '図：この教科書の 8 つの部。日本で準備する序部から始め、地上学科 → 単発機 → 航法 → 計器飛行 → 双発機 → チームで飛ぶ準備と進みます。第 7 部は日本の制度と JCAB の学科のための部で、どの時点からでも読めます（右の数は、この版の章の数）');
    },
    // ---------------------------------------------------------------- intro.course：公開されている訓練の流れ
    courseFlow() {
      // the published basic course, as the public articles describe it (a summary, not an official course chart):
      // R.ana1 (ANA Phase2, read again 2026-10-27 by the fact check) and R.ana2 (ANA HD: the two licences)
      const st = [['座学（ロンドン）', '授業はすべて英語。航空管制の交信の練習も', C.cy], ['単発機 Piper Archer（Sanford）', '1 回 90〜120 分のレッスン 12 回 → 審査 → ソロ', C.gr],
        ['航法（Navigation）', '地図と上空の風から飛ぶ向きを計算して飛ぶ', C.am], ['計器飛行', '計器だけを頼りに飛ぶ', C.vi], ['双発機 Piper Seminole', 'エンジン 1 つの停止や故障への対応 → 最後の審査', C.bl],
        ['ライセンス取得 → 副操縦士になる訓練へ', '', C.rd]];
      let s = `<line x1="28" y1="22" x2="28" y2="${22 + 5 * 52}" stroke="${C.mut}" stroke-width="2"/>`;
      st.forEach(([t, sub, c], i) => {
        const y = 22 + i * 52;
        s += `<circle cx="28" cy="${y}" r="8" fill="${c}"/>` + T(48, y + 5, t, { c, b: 1, a: 'start', fs: 13 }) + (sub ? T(48, y + 24, sub, { c: C.ink, a: 'start', fs: 12 }) : '');
      });
      s += rect(8, 302, 384, 26, C.mut, { rx: 6, fo: 0, dash: '4 3' }) + T(200, 320, '期間は全体で約 1 年半〜2 年（公開記事）', { c: C.mut, fs: 12 });
      return svg(400, 336, s, '図：公開されている記事から読み取れる基礎訓練の流れ（要約）。細かな内容・順番・基準は公開されていません');
    },
    // ---------------------------------------------------------------- intro.cert：日米の資格の段階
    certLadder() {
      const us = [['学生操縦士（Student）', '16 歳・申請で取る'], ['自家用操縦士（PPL）', '17 歳・40 時間など'], ['計器飛行証明（IR）', '機長の野外飛行 50 時間など'],
        ['事業用操縦士（CPL）', '18 歳・250 時間など'], ['多発の等級（AMEL）', '教官の裏書き＋実地試験'], ['定期運送用（ATP）', '23 歳・1,500 時間など']];
      const jp = [['操縦練習許可', '国の許可・教員の監督'], ['自家用操縦士', '17 歳・40 時間など'], ['事業用操縦士', '18 歳・200 時間など'],
        ['計器飛行証明', '機長の野外飛行 50 時間など'], ['陸上多発の等級（限定）', '実地試験の飛行機で決まる'], ['定期運送用操縦士', '21 歳・1,500 時間など']];
      const col = (x, head, steps, c) => {
        let s = T(x + 92, 20, head, { c, b: 1, fs: 13 });
        steps.forEach(([t, sub], i) => {
          const y = 262 - i * 46;
          s += rect(x, y, 184, 40, c, { fo: 0.06 + i * 0.025 }) + T(x + 8, y + 16, t, { b: 1, a: 'start', fs: 12 }) + T(x + 8, y + 33, sub, { a: 'start', fs: 12 });
          if (i < steps.length - 1) s += up(x + 92, y - 1, c);
        });
        return s;
      };
      let s = col(10, '米国（FAA）', us, C.cy) + col(206, '日本（JCAB）', jp, C.gr);
      s += T(200, 322, '下から上へ積み上げる一例。取る順は国と道によって違う', { c: C.mut, fs: 12 });
      s += rect(10, 330, 380, 24, C.am) + T(200, 347, 'どちらも、資格に限定（種類・等級・型式）が付く', { c: C.am, b: 1, fs: 12 });
      return svg(400, 360, s, '図：飛行機の操縦士の資格の段階の一例。左は米国（FAA、米国の 14 CFR Part 61）、右は日本（国土交通省航空局、JCAB）。年齢と飛行時間は最低限の例で、実際の訓練ではもっと多くかかるのが普通です。米国の学生操縦士の資格は申請で取れますが、単独飛行の前に教官の行う知識の試験と裏書きが要ります。日本の事業用操縦士の 200 時間は、指定養成施設の課程では飛行訓練 150 時間です。日本の Integrated System では、事業用操縦士（多発）と計器飛行証明を一連の訓練でまとめて取ります');
    },
    // ---------------------------------------------------------------- intro.japan：日本の資格への主な 4 つの道
    jpRoutes() {
      const R = [
        ['1　ふつうの道（資格ごとに国の試験）', ['国の学科試験 → 飛行訓練 → 国の実地試験', '自家用・事業用・計器飛行証明を 1 つずつ取る'], C.mut, ''],
        ['2　指定養成施設の課程', ['学科教育 → 国の学科試験 → 実技教育 → 施設の技能審査', '修了すると、国の実地試験の全部か一部がない'], C.cy, ''],
        ['3　Integrated System（指定養成施設だけ）', ['事業用（多発）と計器飛行証明を一連の訓練で', '実地試験は施設の中で 1 回。単発の事業用はない'], C.gr, 'この訓練はここと考えられる（推測）'],
        ['4　外国の資格の切替（外切）', ['国内航空法規の学科試験は、ふつう受ける', 'ほかの学科と実地は、全部か一部がない'], C.am, ''],
      ];
      let s = '', y = 6;
      R.forEach(([t, lines, c, est]) => {
        const h = est ? 78 : 62;
        s += rect(8, y, 384, h, c, { fo: est ? 0.16 : 0.08, sw: est ? 2.2 : 1.4 });
        s += T(18, y + 19, t, { c, b: 1, a: 'start', fs: 13 }) + TL(18, y + 38, lines, { a: 'start', fs: 12, lh: 17 });
        if (est) s += T(382, y + 72, est, { c: C.am, b: 1, a: 'end', fs: 12 });
        y += h + 10;
      });
      return svg(400, y - 4, s, '図：日本の操縦士の資格（技能証明）を取る主な 4 つの道。2 と 3 は国が指定した養成施設の課程で、国の学科試験には合格が要ります。このほか、独立行政法人航空大学校の課程を終えた人も、国の実地試験が行われません。この教材が扱う訓練は 3 の道と考えられますが、公開情報からの推測です');
    },
    // ---------------------------------------------------------------- intro.exams：試験の地図
    examMap() {
      const R = [
        ['日本：国土交通省航空局（JCAB）', ['学科試験：事業用 5 科目＋計器飛行一般', '実地試験：養成施設の中で 1 回（推測）', '航空英語能力証明（取るか・時期は未公表）'], C.gr],
        ['日本：総務省', ['航空無線通信士（無線の資格。取るか・時期は未公表）'], C.cy],
        ['米国：FAA', ['単独飛行の前に学生操縦士の資格（訓練生は推測）', '学科試験 PAR・IRA・CAX（受けるか未公表）'], C.bl],
        ['この教材（練習用）', ['学科テスト（80% で合格）・確認問題'], C.am],
      ];
      let s = '', y = 6;
      for (const [t, lines, c] of R) {
        const h = 30 + lines.length * 18;
        s += rect(8, y, 384, h, c, { fo: 0.08 }) + T(18, y + 19, t, { c, b: 1, a: 'start', fs: 13 }) + TL(28, y + 38, lines, { a: 'start', fs: 12, lh: 18 });
        y += h + 8;
      }
      return svg(400, y, s, '図：訓練生が受ける試験の地図。日本の試験は国土交通省航空局（技能証明・航空英語能力証明）と総務省（無線の資格）が行い、米国の試験は FAA が行います。学生操縦士の資格は米国の規則で、訓練生が持つかは推測です。どれをいつ受けるかは、多くが公表されていません');
    },
    // ---------------------------------------------------------------- intro.study：1 回の学び方
    studyCycle() {
      const n = [['読む', '教科書の節', 200, 40, C.cy], ['答える', '確認問題・学科テスト', 332, 130, C.am], ['飛ぶ', 'シミュレータの課目', 282, 252, C.gr],
        ['ふり返る', '結果の画面とメモ', 118, 252, C.vi], ['思い出す', '間隔をあけて', 68, 130, C.bl]];
      let s = '';
      const pts = n.map(([, , x, y]) => [x, y]);
      for (let i = 0; i < n.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n.length], k1 = 0.42, k2 = 0.58;
        const ax = x1 + (x2 - x1) * k1, ay = y1 + (y2 - y1) * k1, bx = x1 + (x2 - x1) * k2, by = y1 + (y2 - y1) * k2, a = Math.atan2(by - ay, bx - ax), hh = 8;
        s += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${C.mut}" stroke-width="2"/>`
          + `<path d="M${bx.toFixed(1)} ${by.toFixed(1)} L${(bx - hh * Math.cos(a - 0.45)).toFixed(1)} ${(by - hh * Math.sin(a - 0.45)).toFixed(1)} L${(bx - hh * Math.cos(a + 0.45)).toFixed(1)} ${(by - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${C.mut}"/>`;
      }
      for (const [t, sub, x, y, c] of n) s += rect(x - 60, y - 24, 120, 48, c, { rx: 10 }) + T(x, y - 3, t, { c, b: 1, fs: 14 }) + T(x, y + 15, sub, { fs: 12 });
      s += T(200, 140, 'この 5 つを', { c: C.mut, fs: 12 }) + T(200, 158, 'くり返す', { c: C.mut, fs: 12 });
      return svg(400, 286, s, '図：この教材での 1 回の学び方。読む → 答える → 飛ぶ → ふり返る → 間隔をあけて思い出す、をくり返します');
    },
    // ---------------------------------------------------------------- basics（飛行の基本量。序部 第 2 章：R1・W10）
    // basics.flight — ch00-fig1 redrawn: the phases of one flight and what each one checks (schematic: no real heights)
    basicsFlight() {
      const ph = [
        [['出発前'], ['天気・燃料', '代わりの案'], C.cy],
        [['地上滑走', 'と離陸'], ['位置・許可', '周りの機体'], C.gr],
        [['上昇と', '巡航'], ['経路・高度', '燃料・天気'], C.am],
        [['降下と', '進入'], ['到着地の情報', 'やり直しの計画'], C.vi],
        [['着陸と', '到着後'], ['駐機・機体', '記録'], C.bl],
      ];
      const G = 140, x0 = 8, w = 72, gap = 6;
      let s = L(8, G, 392, G, C.mut, 2);
      // the path: on the ground, take off, climb, cruise, descend, land, taxi in
      const pts = [[14, G], [128, G], [196, 46], [248, 46], [328, G], [390, G]];
      s += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ')}" stroke="${C.cy}" stroke-width="2.5" fill="none" stroke-dasharray="7 4"/>`;
      s += plane(222, 40, 0.34) + plane(160, 98, 0.3, 30);
      for (let i = 1; i < 5; i++) { const x = x0 + i * (w + gap) - gap / 2; s += L(x, 22, x, G, C.grid, 1.5, '3 3'); }
      ph.forEach(([title, items, c], i) => {
        const x = x0 + i * (w + gap), cx = x + w / 2;
        s += `<rect x="${x}" y="${G + 12}" width="${w}" height="48" rx="8" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`;
        s += TL(cx, G + 32 - (title.length - 1) * 8, title, { c, b: 1, fs: 12, lh: 16 });
        s += TL(cx, G + 80, items, { c: C.ink, fs: 12, lh: 16 });
      });
      s += T(200, 16, '各段階の終わりは、計画を見直す機会', { c: C.mut, fs: 12 });
      return svg(400, 244, s, '図：一便の流れ（模式図）。5 つの段階と、それぞれで主に確かめることの例です。高さと距離は実際の比ではありません');
    },

    // basics.crew — the three layers: position (job title), the legal role (PIC), the operating roles (PF/PM)
    basicsCrew() {
      const band = (y, c, head, sub, chips) => {
        let t = `<rect x="8" y="${y}" width="384" height="62" rx="8" fill="${c}" fill-opacity="0.08" stroke="${c}" stroke-width="1.5"/>`;
        t += T(20, y + 24, head, { c, b: 1, a: 'start', fs: 13 }) + T(20, y + 46, sub, { c: C.mut, a: 'start', fs: 12 });
        chips.forEach(([label, x, wd]) => { t += `<rect x="${x}" y="${y + 13}" width="${wd}" height="36" rx="18" fill="${c}" fill-opacity="0.16" stroke="${c}"/>` + T(x + wd / 2, y + 36, label, { c: C.ink, b: 1, fs: 12 }); });
        return t;
      };
      let s = band(8, C.cy, '職位', '会社の中の立場', [['キャプテン', 178, 96], ['副操縦士', 284, 96]]);
      s += band(78, C.am, '法令上の役割', '飛行ごとに決める', [['機長（PIC）：最終の権限と責任', 140, 240]]);
      s += band(148, C.gr, '操作の役割', '場面ごとに決める', [['PF：経路を管理', 150, 112], ['PM：監視・コール', 268, 112]]);
      s += T(200, 232, '3 つは別々に決まる', { c: C.ink, b: 1, fs: 13 });
      s += T(200, 252, '例：副操縦士が PF、キャプテンが PM（機長はキャプテン）', { c: C.ink, fs: 12 });
      s += T(200, 272, '例：訓練のソロでは、機長も PF も自分', { c: C.ink, fs: 12 });
      return svg(400, 284, s, '図：操縦士の呼び方の 3 つの層。職位（キャプテン・副操縦士）、法令上の役割（機長）、操作の役割（PF・PM）は、別々に決まります');
    },

    // basics.units — the lengths to one scale (1 km, 1 SM, 1 NM: NIST SP 811 B.9) and the inHg / hPa scale (conventional inHg)
    basicsUnits() {
      const KM = 1000, SM = 1609.344, NM = 1852, HPA_PER_INHG = 33.86389;
      const k = 230 / NM, x0 = 64;
      let s = T(12, 18, '長さ（同じ縮尺）', { c: C.mut, b: 1, a: 'start', fs: 12 });
      [['1 km', KM, '1,000 m', C.mut], ['1 SM', SM, '約 1,609 m', C.am], ['1 NM', NM, '1,852 m', C.cy]].forEach(([n, m, v, c], i) => {
        const y = 40 + i * 26, len = m * k;
        s += T(12, y + 4, n, { c, b: 1, a: 'start', fs: 12 }) + `<rect x="${x0}" y="${y - 8}" width="${len.toFixed(1)}" height="14" rx="3" fill="${c}" fill-opacity="0.55"/>` + T(x0 + len + 8, y + 4, v, { c: C.ink, a: 'start', fs: 12 });
      });
      s += T(12, 132, '高さ：1 ft ＝ 0.3048 m（1,000 ft は約 305 m）', { c: C.ink, a: 'start', fs: 12 });
      // the pressure scale: inHg above, hPa below, aligned by the factor
      const p0 = 997, p1 = 1035, X = p => 30 + (p - p0) / (p1 - p0) * 340, y = 196;
      s += T(12, 158, '気圧：上は inHg、下は hPa（同じ位置は同じ気圧）', { c: C.mut, b: 1, a: 'start', fs: 12 });
      s += L(X(p0), y, X(p1), y, C.mut, 2);
      for (const inhg of [29.5, 29.8, 30.1, 30.4]) { const x = X(inhg * HPA_PER_INHG); s += L(x, y - 8, x, y, C.am, 2) + T(x, y - 14, inhg.toFixed(2), { c: C.am, fs: 12 }); }
      for (const hpa of [1000, 1010, 1020, 1030]) { const x = X(hpa); s += L(x, y, x, y + 8, C.cy, 2) + T(x, y + 22, String(hpa), { c: C.cy, fs: 12 }); }
      s += T(388, y - 14, 'inHg', { c: C.am, a: 'end', fs: 12 }) + T(388, y + 22, 'hPa', { c: C.cy, a: 'end', fs: 12 });
      // the standard pressure as PHAK writes it (29.92 "Hg = 1,013.2 mb (hPa)); the same value as the text
      const xs = X(1013.2);
      s += L(xs, y - 26, xs, y + 30, C.gr, 2) + T(xs, y + 46, '標準気圧 29.92 inHg ≈ 1013.2 hPa', { c: C.gr, b: 1, fs: 12 });
      return svg(400, 252, s, '図：長さの単位を同じ縮尺で比べたもの（1 km・1 SM・1 NM）と、気圧の inHg と hPa の目盛り（NIST の換算係数で描いた）。1 inHg は約 33.86 hPa です');
    },

    // basics.time — one moment in three clocks (a July day: Sanford on EDT = UTC−4, Japan on JST = UTC+9)
    basicsTime() {
      const rows = [['UTC（Z）', '', 0, C.cy], ['EDT', 'UTC−4', -4, C.am], ['JST', 'UTC＋9', 9, C.gr]];
      const x = i => 100 + i * 54, hours = [12, 13, 14, 15, 16, 17];
      let s = '';
      rows.forEach(([name, off, d, c], r) => {
        const y = 40 + r * 62;
        s += T(10, y + 4, name, { c, b: 1, a: 'start', fs: 13 }) + (off ? T(10, y + 22, off, { c: C.mut, a: 'start', fs: 12 }) : '');
        s += L(x(0) - 22, y + 10, x(5) + 22, y + 10, C.grid, 1.5);
        hours.forEach((h, i) => {
          const lh = ((h + d) % 24 + 24) % 24, day = 1 + Math.floor((h + d) / 24);
          s += T(x(i), y + 4, d === 0 ? `${String(lh).padStart(2, '0')}00Z` : `${String(lh).padStart(2, '0')}:00`, { c: C.ink, fs: 12 });
          s += T(x(i), y + 24, `7/${day}`, { c: day > 1 ? C.rd : C.mut, fs: 12, b: day > 1 ? 1 : 0 });   // the date on every row
        });
      });
      // the moment of the example (1400Z) and the date line in Japan (1500Z = 00:00 JST): the line is the left edge of
      // the 1500Z column, and the label says from which hour the date changes (not a time between two columns)
      s += `<rect x="${x(2) - 26}" y="22" width="52" height="150" rx="6" fill="none" stroke="${C.vi}" stroke-width="2"/>`;
      const edge = x(3) - 27;
      s += L(edge, 150, edge, 198, C.rd, 2, '4 3') + T(edge, 214, '1500Z（00:00 JST）から日本の日付が 1 日進む', { c: C.rd, fs: 12 });
      s += T(200, 238, '同じ瞬間：1400Z ＝ 10:00 EDT ＝ 23:00 JST', { c: C.vi, b: 1, fs: 13 });
      return svg(400, 250, s, '図：同じ瞬間を 3 つの時刻で表したもの（7 月の例。Sanford の夏は EDT、日本は JST）。紫の枠は同じ瞬間です。日本の日付は 1500Z で 1 日進みます');
    },

    // basics.speed (1) — the speeds in order, and what is corrected between them (14 CFR 1.1, PHAK ch. 8)
    basicsSpeedChain() {
      const rows = [['IAS', '速度計が示す値', C.cy], ['CAS', '誤差を直した対気速度', C.cy], ['EAS', '圧縮性を直した対気速度', C.cy], ['TAS', '空気に対する本当の速さ', C.am], ['GS', '地面に対する速さ', C.gr]];
      // the compressibility step is tiny at a trainer's speeds (PHAK ch. 5: about 260 kt or less, air can be treated as
      // incompressible), so the text goes from CAS to TAS; the figure says so on that step
      const fix = ['取り付け位置と計器の誤差を直す', '空気の圧縮性を直す（訓練機ではごく小さい）', '空気の密度（高度と気温）を直す', '風を矢印として足す'];
      let s = '';
      rows.forEach(([ab, note, c], i) => {
        const y = 10 + i * 52;
        s += `<rect x="12" y="${y}" width="76" height="34" rx="8" fill="${c}" fill-opacity="0.14" stroke="${c}" stroke-width="1.5"/>` + T(50, y + 22, ab, { c, b: 1, fs: 14 });
        s += T(100, y + 22, note, { c: C.ink, a: 'start', fs: 12 });
        if (i < fix.length) s += A(50, y + 36, 50, y + 50, C.mut, 2) + T(70, y + 47, fix[i], { c: C.am, a: 'start', fs: 12 });
      });
      return svg(400, 262, s, '図：速度の 5 つの種類と、順に直すもの。速度計の値から始めて、誤差・圧縮性・空気の密度を直すと空気に対する本当の速さに、風を足すと地面に対する速さになります。訓練機の速さでは、圧縮性の直しはごく小さく、EAS は CAS とほとんど同じです');
    },

    // basics.speed (2) — ch00-fig5 redrawn: TAS 100 kt heading 090°, wind from the north 20 kt (drawn to scale)
    basicsWind() {
      const tas = 100, ws = 20, k = 2.5, O = [50, 74];
      const H = [O[0] + tas * k, O[1]], G = [H[0], H[1] + ws * k];
      const gs = Math.hypot(tas, ws), drift = Math.atan2(ws, tas) / DEG;
      let s = A(O[0], O[1], H[0], H[1], C.cy, 3) + A(H[0], H[1], G[0], G[1], C.am, 3) + A(O[0], O[1], G[0], G[1], C.gr, 3);
      s += T((O[0] + H[0]) / 2, O[1] - 12, `TAS ${tas} kt・針路 090°（機首の向き）`, { c: C.cy, b: 1, fs: 12, halo: 1 });
      s += TL(H[0] + 10, H[1] + 18, ['北からの風', `${ws} kt`], { c: C.am, b: 1, a: 'start', fs: 12, lh: 16 });
      s += T(166, G[1] + 26, `GS 約 ${Math.round(gs)} kt・航跡 約 ${pad3(90 + drift)}°`, { c: C.gr, b: 1, fs: 12 });
      s += `<path d="M ${O[0] + 70} ${O[1]} A 70 70 0 0 1 ${(O[0] + 70 * Math.cos(drift * DEG)).toFixed(1)} ${(O[1] + 70 * Math.sin(drift * DEG)).toFixed(1)}" stroke="${C.rd}" stroke-width="2.5" fill="none"/>`;
      s += T(O[0] + 2, O[1] + 40, `偏流角 約 ${Math.round(drift)}°`, { c: C.rd, b: 1, a: 'start', fs: 12, halo: 1 });
      s += A(370, 60, 370, 26, C.mut, 2) + T(370, 74, '北', { c: C.mut, fs: 12 });
      s += T(200, 196, `GS ＝ √（${tas}² ＋ ${ws}²）≈ ${Math.round(gs)} kt（${tas} − ${ws} ではない）`, { c: C.ink, fs: 12 });
      return svg(400, 208, s, `図：真東（090°）に機首を向け、TAS ${tas} kt で飛ぶ飛行機が、北から ${ws} kt の風を受けたときの速度の矢印（縮尺どおり）。地面の上では南へ流されます`);
    },

    // basics.alt — ch00-fig6 redrawn: one altitude (5,000 ft MSL) over two heights of the terrain
    basicsAlt() {
      const SEA = 240, k = 0.038, Y = ft => SEA - ft * k, alt = 5000, lowT = 500, highT = 2000;
      let s = L(8, SEA, 392, SEA, C.cy, 2);
      const yl = Y(lowT), yh = Y(highT);
      s += `<path d="M8 ${SEA} L8 ${yl} L170 ${yl} C210 ${yl} 220 ${yh} 262 ${yh} L392 ${yh} L392 ${SEA} Z" fill="${C.am}" fill-opacity="0.18" stroke="${C.am}" stroke-width="1.5"/>`;
      s += L(8, Y(alt), 392, Y(alt), C.mut, 1.5, '6 4') + T(12, Y(alt) - 22, `高度 MSL ${fmt(alt)} ft（左右とも同じ）`, { c: C.ink, b: 1, a: 'start', fs: 12 });
      s += plane(110, Y(alt), 0.36) + plane(310, Y(alt), 0.36);
      // AGL and elevation on each side
      const dim = (x, y1, y2, c) => A(x, y1 + 6, x, y2 - 1, c, 2) + A(x, y2 - 6, x, y1 + 1, c, 2);
      s += dim(92, Y(alt) + 8, yl, C.gr) + T(100, (Y(alt) + yl) / 2 + 4, `AGL ${fmt(alt - lowT)} ft`, { c: C.gr, b: 1, a: 'start', fs: 12, halo: 1 });
      s += dim(292, Y(alt) + 8, yh, C.gr) + T(300, (Y(alt) + yh) / 2 + 4, `AGL ${fmt(alt - highT)} ft`, { c: C.gr, b: 1, a: 'start', fs: 12, halo: 1 });
      s += T(60, SEA - 6, `標高 ${fmt(lowT)} ft`, { c: C.am, fs: 12 }) + T(330, (yh + SEA) / 2 + 4, `標高 ${fmt(highT)} ft`, { c: C.am, b: 1, fs: 12 });
      s += T(200, SEA + 18, '平均海面（MSL の 0 ft）', { c: C.cy, fs: 12 });
      s += T(200, SEA + 38, 'AGL ＝ MSL の高度 − 真下の地形の標高', { c: C.ink, b: 1, fs: 12 });
      return svg(400, 286, s, `図：MSL ${fmt(alt)} ft を保って飛んでも、真下の地形の標高が変わると AGL が変わります（標高 ${fmt(lowT)} ft の上で ${fmt(alt - lowT)} ft、${fmt(highT)} ft の上で ${fmt(alt - highT)} ft）`);
    },

    // basics.rules — the two axes: the rules a flight follows (VFR/IFR) and the weather (VMC/IMC)
    basicsRules() {
      const cx = [76, 238], cw = 156, ry = [58, 152], rh = 88;
      let s = T(40, 30, '方式＼天気', { c: C.mut, fs: 12 });
      s += BOX(cx[0], 8, cw, 42, C.mut, 'VMC', [], { ty: 18 }) + T(cx[0] + cw / 2, 40, '外がよく見える天気', { c: C.ink, fs: 12 });
      s += BOX(cx[1], 8, cw, 42, C.mut, 'IMC', [], { ty: 18 }) + T(cx[1] + cw / 2, 40, '雲の中・視程が悪い', { c: C.ink, fs: 12 });
      s += BOX(8, ry[0], 62, rh, C.cy, 'VFR', [], { ty: rh / 2 + 5 }) + BOX(8, ry[1], 62, rh, C.vi, 'IFR', [], { ty: rh / 2 + 5 });
      const cell = (i, j, c, title, lines) => BOX(cx[j], ry[i], cw, rh, c, title, lines, { ty: 26, ly: 50 });
      s += cell(0, 0, C.gr, 'ふつうの VFR', ['外を見て、ほかの機と', '地形を自分で避ける']);
      s += cell(0, 1, C.rd, 'してはいけない', ['VFR で雲に入らない。', '入る前に引き返す']);
      s += cell(1, 0, C.cy, 'できる', ['IFR でも晴れていれば', '外を見張って避ける']);
      s += cell(1, 1, C.vi, 'できる（条件つき）', ['資格・装備・承認が要る。', '最低気象条件もある']);
      return svg(400, 250, s, '図：飛行方式（VFR・IFR）と気象状態（VMC・IMC）は別の軸です。IFR は晴れた日にも飛び、VFR で雲に入ってはいけません');
    },

    // basics.docs — the four questions to ask before using a number from a document
    basicsDocs() {
      const q = [['① 何の値か', ['速度・高度・方位・時刻', 'のどれか'], C.cy], ['② どの基準か', ['IAS か GS か', 'MSL か AGL か・真か磁か'], C.am],
        ['③ いつの情報か', ['発表の時刻・有効な時間', '資料の版'], C.gr], ['④ 誰に確かめるか', ['教官・管制・整備', '学校の手順'], C.vi]];
      let s = T(200, 22, '資料は「その機体の・新しい版の」ものを使う', { c: C.ink, b: 1, fs: 13 });
      q.forEach(([t, lines, c], i) => { const x = 8 + (i % 2) * 196, y = 38 + Math.floor(i / 2) * 92; s += BOX(x, y, 188, 82, c, t, lines, { ty: 24, ly: 48 }); });
      return svg(400, 226, s, '図：資料の数字を使う前の 4 つの確認。何の値か・どの基準か・いつの情報か・誰に確かめるか');
    },

    // basics.case — the worked case (fictional: the LAB airport and a point 60 NM east of it)
    basicsCase() {
      const dist = 60, tas = 110, wind = 20, gs = tas - wind, min = dist / gs * 60;
      // departure 10:00 EDT = 1400Z (EDT = UTC−4); the arrival's hour and minute are computed from the minutes
      const p2 = n => String(n).padStart(2, '0'), dep = 14 * 60, arr = dep + Math.round(min), EDT = -4;
      const zulu = m => `${p2(Math.floor(m / 60) % 24)}${p2(m % 60)}Z`, edt = m => `${(Math.floor(m / 60) + EDT + 24) % 24}:${p2(m % 60)} EDT`;
      const A0 = [56, 96], B0 = [344, 96];
      let s = NFN(392, 18);
      s += L(A0[0], A0[1], B0[0], B0[1], C.cy, 2.5, '7 4');
      s += `<circle cx="${A0[0]}" cy="${A0[1]}" r="9" fill="${C.cy}" fill-opacity="0.3" stroke="${C.cy}" stroke-width="2"/>` + T(A0[0], A0[1] + 28, 'LAB（出発）', { c: C.cy, b: 1, fs: 12 });
      s += `<circle cx="${B0[0]}" cy="${B0[1]}" r="9" fill="${C.gr}" fill-opacity="0.3" stroke="${C.gr}" stroke-width="2"/>` + T(B0[0], B0[1] + 28, '目的地', { c: C.gr, b: 1, fs: 12 });
      s += T(200, 88, `真東へ ${dist} NM`, { c: C.cy, b: 1, fs: 12, halo: 1 });
      s += A(300, 54, 220, 54, C.am, 3) + T(260, 42, `風 090° / ${wind} kt（向かい風）`, { c: C.am, b: 1, fs: 12 });
      s += `<path d="M232 150 a10 10 0 0 1 6 -18 a13 13 0 0 1 25 -3 a9 9 0 0 1 12 13 Z" fill="${C.mut}" fill-opacity="0.35" stroke="${C.mut}"/>` + T(254, 168, '雲が低くなる予報', { c: C.mut, fs: 12 });
      s += BOX(8, 176, 384, 70, C.vi, '', []);
      s += T(20, 198, `TAS ${tas} kt − 向かい風 ${wind} kt → GS ${gs} kt`, { c: C.ink, a: 'start', fs: 12 });
      s += T(20, 218, `${dist} ÷ ${gs} × 60 ＝ ${min} 分`, { c: C.ink, a: 'start', fs: 12 });
      s += T(20, 238, `${zulu(dep)}（${edt(dep)}）に出ると、${zulu(arr)}（${edt(arr)}）`, { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 256, s, `図：総合例題の区間（架空）。LAB から真東へ ${dist} NM、真東からの風 ${wind} kt。計算できるのは GS と時間と時刻で、雲の予報だけでは VFR で行けるかは決まりません`);
    },
    // ---------------------------------------------------------------- english（英語で学ぶ準備。序部 第 3 章：R1・W10）
    // en.terms — one part (the aileron, coloured) and its three names: the official name (JCAB's written tests and the
    // law), the common name (everyday talk, katakana material) and the English (FAA material, the English classes)
    enTriple() {
      const n = names('aileron');
      // the right wing seen from above (leading edge at the top: the title says 上が前), the aileron at the outer trailing
      // edge. The flap is not drawn (revise-english: the reader asked what the unnamed grey part was)
      const wing = `<path d="M64 62 L336 62 L352 70 L352 104 L64 104 Z" fill="${PLANE}"/>`
        + `<rect x="40" y="58" width="26" height="50" rx="6" fill="${PLANE2}"/>`
        + `<path d="M262 104 L352 104 L352 92 L262 92 Z" fill="${C.am}"/>`;
      let s = T(200, 18, '色を付けた部分の名前（右の主翼を上から見た図。上が前）', { c: C.mut, fs: 12 });
      s += wing + T(53, 50, '胴体', { c: C.mut, fs: 12 }) + T(200, 87, '主翼', { c: '#0b1422', fs: 12, b: 1 });
      // three boxes and their lines from the coloured part
      const bx = [
        { x: 8, c: C.cy, h: '正式名', name: n.formal, sub: ['日本の学科試験', 'と法令の書き方'] },
        { x: 139, c: C.gr, h: '通称', name: n.common, sub: ['ふだんの会話や', 'カタカナの資料'] },
        { x: 270, c: C.vi, h: '英語', name: n.en, sub: ['英語の授業と', '米国の FAA の資料'] },
      ];
      const top = 150, w = 122, hgt = 94;
      for (const b of bx) {
        s += L(307, 104, b.x + w / 2, top, b.c, 1.5, '4 3');
        s += BOX(b.x, top, w, hgt, b.c);
        s += T(b.x + w / 2, top + 20, b.h, { c: b.c, fs: 12, b: 1 });
        s += T(b.x + w / 2, top + 44, esc(b.name), { c: C.ink, fs: 16, b: 1 });
        s += TL(b.x + w / 2, top + 64, b.sub, { c: C.mut, fs: 12, lh: 16 });
      }
      s += `<circle cx="307" cy="104" r="4" fill="${C.am}"/>`;
      const cap = `図：1 つのものに 3 つの名前。色を付けた部分は、日本の学科試験と法令では「${esc(n.formal)}」、ふだんの言い方では「${esc(n.common)}」、英語の授業では「${esc(n.en)}」です。この本は、各章で初めて出るところで${esc(n.formal)}（${esc(n.common)}、${esc(n.en)}）と書きます`;
      return svg(400, 252, s, cap);
    },

    // en.class — three places and the way of speaking in each (examples), from the class to the radio
    enTalk() {
      const rows = [
        { c: C.cy, place: ['授業', '（教室）'], how: ['ふつうの英語', 'ていねいに'], ex: ['“Could you say that', 'again, please?”'] },
        { c: C.gr, place: ['操縦席で', '操縦教員と'], how: ['短く', 'はっきり'], ex: ['“Sorry, say again?”', '“Can you show me?”'] },
        { c: C.am, place: ['無線で', '管制と'], how: ['意味の決まった', '言葉'], ex: ['“Say again.”', '従えないときは “Unable.”'] },
      ];
      let s = T(62, 18, '相手と場面', { c: C.mut, fs: 12 }) + T(176, 18, '話し方', { c: C.mut, fs: 12 }) + T(314, 18, '言い方の例', { c: C.mut, fs: 12 });
      const y0 = 28, hgt = 64, gap = 8;
      rows.forEach((r, i) => {
        const y = y0 + i * (hgt + gap);
        s += BOX(8, y, 108, hgt, r.c) + TL(62, y + 27, r.place, { c: r.c, fs: 13, b: 1, lh: 18 });
        s += BOX(122, y, 108, hgt, r.c) + TL(176, y + 27, r.how, { c: C.ink, fs: 12, lh: 18 });
        s += BOX(236, y, 156, hgt, r.c) + TL(314, y + 27, r.ex.map(esc), { c: C.ink, fs: 12, lh: 18 });
      });
      const yb = y0 + 3 * (hgt + gap) + 6;
      s += T(200, yb + 12, '下へ行くほど短く、使う言葉が決まっている', { c: C.mut, fs: 12 });
      return svg(400, yb + 22, s, '図：3 つの場面と話し方の例。授業ではふつうの英語でていねいに、操縦席の操縦教員には短くはっきり、管制との無線では意味の決まった言葉で話します。どの場面でも、分からないときは推測せずに聞き直します');
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
      s += T(tx - 112, ty - 26, '横軸 → ピッチ', { c: C.am, b: 1, a: 'start', fs: 13, halo: 1 });
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
      return svg(400, 340, s, '図：迎え角と失速。迎え角を大きくすると揚力は増えますが、臨界迎え角を超えると翼の上面から空気の流れがはがれ、揚力が急に減ります。これが失速です（角度は模式的な例）');
    },
    dragCurve() {
      // the model's clean airframe drag at sea level and its teaching weight (no windmilling propeller)
      const p = ac('pa28').phys, W = 400, H = 260, Wt = p.mass * 9.81;
      const f = frame(W, H, 40, 140, 0, 3000, [40, 60, 80, 100, 120, 140], [0, 1000, 2000, 3000], '指示対気速度（kt）', '抗力（N）', { l: 56, r: 22, t: 14, b: 38 });
      const ind = [], par = [], tot = []; let best = null;
      for (let v = 44; v <= 140; v += 1) {
        const V = v / 1.94384, q = 0.5 * 1.225 * V * V, CL = Wt / (q * p.S), Dp = p.CD0 * q * p.S, Di = p.K * CL * CL * q * p.S;
        par.push([f.X(v), f.Y(Dp)]); ind.push([f.X(v), f.Y(Math.min(Di, 3000))]); tot.push([f.X(v), f.Y(Math.min(Dp + Di, 3000))]);
        if (!best || Dp + Di < best[1]) best = [v, Dp + Di];
      }
      let s = f.s + P(par, C.am, 2.2, 'none', '6 4') + P(ind, C.vi, 2.2, 'none', '6 4') + P(tot, C.cy, 3);
      s += `<circle cx="${f.X(best[0])}" cy="${f.Y(best[1])}" r="5" fill="${C.gr}"/>` + T(f.X(best[0]), f.Y(best[1]) - 14, `抗力が最小 約 ${best[0]} kt`, { c: C.gr, fs: 12, b: 1, halo: 1 });
      // the legend: line samples and what each drag does with speed (the empty band above 2,000 N)
      const key = (y, c, dash, w, t) => L(f.X(44), y - 4, f.X(51), y - 4, c, w, dash) + T(f.X(52.5), y, t, { c, fs: 12, a: 'start', b: 1, halo: 1 });
      s += key(f.Y(2780), C.vi, '6 4', 2.2, '誘導抗力：遅い（迎え角が大きい）ほど大きい') + key(f.Y(2520), C.am, '6 4', 2.2, '有害抗力：速いほど大きい') + key(f.Y(2260), C.cy, '', 3, '全抗力＝2 つの和');
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
    turnTable() {
      return table(['バンク角', '荷重倍数', '失速速度の増加', '100 kt での旋回率', '100 kt での旋回半径'], [10, 20, 30, 45, 60, 75].map(b => {
        const tn = Math.tan(b * DEG), n = 1 / Math.cos(b * DEG);
        return [`${b}°${n > 3.8 ? '（Archer の制限 3.8 G を超える）' : ''}`, `${n.toFixed(2)} G`, `×${Math.sqrt(n).toFixed(2)}（+${Math.round((Math.sqrt(n) - 1) * 100)}%）`, `${(1091 * tn / 100).toFixed(1)}°/秒`, `${Math.round(100 * 100 / (11.26 * tn)).toLocaleString()} ft`];
      }));
    },
    leftTurning() {
      // seen from above, nose up, at high power and low speed (a climb): why the nose goes left, and the right rudder that stops it
      const cx = 118, cy = 178, k = 1.3;
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
      s += T(cx + 24, prop - 48, '推力 大', { c: C.gr, b: 1, a: 'start', fs: 12, halo: 1 }) + TL(cx + 24, prop - 32, ['右側の下がる', 'ブレード'], { c: C.gr, a: 'start', fs: 12, lh: 15, halo: 1 });
      s += TL(cx - 24, tail - 36, ['らせん後流が', '尾翼の左へ'], { c: C.cy, a: 'end', fs: 12, lh: 16, halo: 1 });
      s += TL(cx + 16, tail + 22, ['右ラダーで', '打ち消す'], { c: C.am, b: 1, a: 'start', fs: 13, lh: 17, halo: 1 });
      const box = [['① P ファクター', ['下がるブレードの', '推力が大きい']], ['② らせん後流', ['（slipstream）', '後流が尾翼の左を押す']], ['③ トルク', ['プロペラの反作用で', '左へ傾く']], ['④ ジャイロ効果', ['機首の向きを', '変えたときに出る']]];
      box.forEach(([t, sub], i) => { const y = 30 + i * 66; s += `<rect x="226" y="${y - 17}" width="168" height="60" rx="7" fill="${C.vi}" fill-opacity="0.1" stroke="${C.vi}"/>` + T(234, y, t, { c: C.vi, b: 1, a: 'start', fs: 12 }) + TL(234, y + 18, sub, { c: C.ink, a: 'start', fs: 12, lh: 16 }); });
      s += T(310, 300, '高出力・低速・機首上げで強い', { c: C.am, b: 1, fs: 12 });
      return svg(400, 312, s, '図：左偏向傾向（上から見た図・上昇中）。操縦席から見て時計回りのプロペラでは、4 つの原因で機首が左へ向こうとするので、右ラダーで打ち消します（PHAK。ジャイロ効果は機首の向きを変えている間だけ働く）');
    },
    stability() {
      const cup = (x, lab, sub, path, ball, c) => `<path d="${path}" stroke="${C.cy}" stroke-width="2.5" fill="none"/><circle cx="${ball[0]}" cy="${ball[1]}" r="9" fill="${C.am}"/>` + T(x, 132, lab, { c, b: 1, fs: 13 }) + TL(x, 150, sub, { c: C.ink, fs: 12, lh: 16 });
      let s = cup(68, '正の静安定', ['ずれても', '元に戻る'], 'M16 46 Q68 128 120 46', [68, 78], C.gr) + cup(200, '中立', ['ずれた所に', 'とどまる'], 'M148 96 L252 96', [200, 87], C.am) + cup(332, '負の静安定', ['ずれが', 'どんどん大きく'], 'M280 106 Q332 26 384 106', [332, 57], C.rd);
      return svg(400, 186, s, '図：静安定のたとえ（くぼみ・平ら・山の上の玉）。飛行機は、縦（ピッチ）と方向（ヨー）に正の静安定を持つように作られています');
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
      s += `<rect x="52" y="284" width="10" height="10" fill="${C.vi}" fill-opacity="0.55"/>` + T(66, 293, '上層 16,500〜40,000 ft', { c: C.ink, a: 'start', fs: 12 });
      s += TL(52, 314, ['高さは中緯度（温帯）の目安（AWH 表 12-3）。', '極地では低く、熱帯では高くなります'], { c: C.mut, a: 'start', fs: 12, lh: 16 });
      return svg(400, 340, s, '図：雲の高さの目安（中緯度・温帯の値。地上からの雲の底の高さ）と主な雲。積乱雲（CB）は下層から上層までのびます。METAR では、雲の種類のうち CB と TCU（そびえ立つ積雲）だけが書かれます');
    },
    seaBreeze() {
      // a west–east cross-section of the Florida peninsula: sea breezes from both coasts meet inland and lift the air (AWH 10.6.1)
      let s = `<rect x="0" y="190" width="90" height="26" fill="#1d4a7a"/><rect x="310" y="190" width="90" height="26" fill="#1d4a7a"/><rect x="90" y="190" width="220" height="26" fill="#3a3326"/>`;
      s += T(52, 236, 'メキシコ湾（西）', { c: C.cy, fs: 12 }) + T(355, 236, '大西洋（東）', { c: C.cy, fs: 12 }) + T(200, 236, '陸（オーランドなど内陸）', { c: C.ink, fs: 12 });
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
      return table(['条件と要因（米国の旧 14 CFR 23.149 で Vmc を決めた条件と、Vmc を変える要因）', 'Vmc への影響', '理由'], [
        ['生きているエンジンが最大出力', '高くなる', '非対称の推力が最大'], ['止まった側のプロペラが風車状態（フェザーしていない）', '高くなる', '止まった側の抗力が大きい'],
        ['重心が後方（後方の限界）', '高くなる', '重心からラダーまでの腕が短くなる'], ['重量が軽い', '高くなる', 'バンクしたときの揚力の横向きの助けが小さい'],
        ['脚 UP', '高くなる', '脚の「竜骨」のような安定の助けがない'], ['フラップは離陸の位置', '決める条件の 1 つ', '機体によって影響が違う'],
        ['生きている側へバンク（5° まで）', '低くなる', '揚力の横向きの成分がラダーの横向きの力とつり合い、ラダーを助ける（横滑りが減る）。翼を水平にすると、1° あたり 3 kt 以上、20 kt 近く高くなることがある'],
        ['密度高度が高い（高い所・暑い日）', '低くなる（自然吸気のエンジン）', '出力が減る（ただし失速速度に近づく）']])
        + '<p class="bk-src">出典：FAA Airplane Flying Handbook（FAA-H-8083-3C）第 13 章。米国の今の 14 CFR 23.2135(c) は性能基準の書き方で、表の条件は米国の旧 23.149 のもの。旧 23.149 では、Vmc は最も不利な重量と重心の位置で決める（CAR 3 や初期の Part 23 で認証された機体では、Vmc を決める重量は決められていない）。軽いほど Vmc は高い。密度高度は認証の条件ではなく、いろいろな高度で試験した結果を海面の 1 つの値に直して公表する。数値・条件は機体の AFM が優先。</p>';
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
      s += TL(8, 334, ['緑＝操作の計器（姿勢・出力）：これで飛行機を動かす', '水色＝性能の計器（速度・高度・昇降・方位・旋回率）：', '　　　結果を確かめる', '橙の矢印：姿勢 → 1 つの計器 → 姿勢 → 次の計器 …'], { c: C.ink, a: 'start', fs: 12, lh: 17 });
      return svg(400, 402, s, '図：G1000 型 PFD の配置（模式図）と、放射状のクロスチェック（IFH 第 6 章）。中央の姿勢表示から各計器へ目を動かし、いつも姿勢に戻ります。出力（回転計）は、実機の G1000 型では MFD に出ます');
    },
    tem() {
      // the TEM framework as ICAO Doc 9683 (Part 2, chapter 2: 2.3.15 errors, 2.3.16 undesired aircraft states, 2.4.1 most flights
      // end safely) and SKYbrary define it: threats and errors are managed most of the time and lead nowhere; an unmanaged error can
      // become an undesired aircraft state (UAS), which can still be recovered. On the left, the three countermeasures in the book's one wording (threats predicted and avoided, errors found and fixed, UAS recovered)
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
      const d = [[8, '予測して防ぐ', ['脅威：', 'ブリーフィング・', '計画・準備']], [118, '見つけて直す', ['エラー：', 'モニター・クロス', 'チェック・コール']], [228, '立て直す', ['UAS：', 'ゴーアラウンド']]];
      d.forEach(([y, t, l]) => { s += BOX(6, y, 122, y === 228 ? 96 : 102, C.cy, t, l, { fs: 12, ty: 19, ly: 38, lfs: 12 }); });
      s += TL(200, 346, ['乗員の対策（countermeasures）', '脅威は予測して防ぐ・エラーは見つけて直す・UAS は立て直す'], { c: C.cy, b: 1, fs: 12, lh: 16 });
      return svg(400, 372, s, '図：TEM（脅威とエラーの管理）の考え方。脅威とエラーは、ほとんどの場合管理されて何も起きません。管理しそこねたエラーが、望ましくない機体の状態（UAS）になることがあり、そこから立て直します（ICAO Doc 9683・SKYbrary にもとづく模式図）');
    },
    standardRate() {
      // the bank for a standard-rate turn (3°/s): tan φ = 3 · V / 1091 (V true airspeed in kt), and the two rules of thumb in the IFH
      return table(['真対気速度', '標準旋回（3°/秒）のバンク（計算）', '目安①「速度 ÷ 10 ＋ 7」（IFH 第 4 章）', '目安②「速度の 15%」（IFH 第 7 章）'], [70, 90, 100, 120, 150].map(v => [`${v} kt`, `${(Math.atan(3 * v / 1091) / DEG).toFixed(0)}°`, `${Math.round(v / 10 + 7)}°`, `${Math.round(v * 0.15)}°`]));
    },
    // ---------------------------------------------------------------- sys（機体と装備）
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
    // ---------------------------------------------------------------- wx（航空気象）
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
      s += panel(266, '③ 消散期', ['雨の中に強い', '下降気流（まだ危険）', 'やがてかなとこが残る'], db);
      s += T(200, g + 72, '1 つの雷雨の一生は全体で約 30 分（AWH）', { c: C.am, b: 1, fs: 12 });
      return svg(400, 286, s, '図：雷雨（1 つのセル）の一生（模式図）。積雲期は上昇気流だけ、成熟期は雨が地面に届いて上昇と下降の流れがそろい、危険が最も大きくなります。消散期は上昇気流がなくなりますが、雨の中には強い下降気流があります。やがて雨がやみ、かなとこ雲が残ります（AWH 22.3）');
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
    flightCategory() {
      // ceiling × visibility: the flight categories with the colours of aviation weather websites (AWH ch. 3)
      const f = frame(400, 290, 0, 10, 0, 5000, [0, 1, 3, 5, 10], [0, 500, 1000, 3000, 5000], '視程（SM）', '雲高（ft）', { l: 56, r: 14, t: 16, b: 40 });
      const R = (x0, x1, y0, y1, c) => `<rect x="${f.X(x0).toFixed(1)}" y="${f.Y(y1).toFixed(1)}" width="${(f.X(x1) - f.X(x0)).toFixed(1)}" height="${(f.Y(y0) - f.Y(y1)).toFixed(1)}" fill="${c}"/>`;
      const G = '#1e4a2c', B2 = '#1c3a66', R2 = '#5c2428', V = '#4a2b68';
      let s = R(0, 10, 0, 5000, G) + R(0, 5, 0, 5000, B2) + R(0, 10, 0, 3000, B2) + R(0, 3, 0, 5000, R2) + R(0, 10, 0, 1000, R2) + R(0, 1, 0, 5000, V) + R(0, 10, 0, 500, V) + f.s;
      s += T(f.X(7.5), f.Y(4200), 'VFR', { c: C.ink, b: 1, fs: 14 }) + T(f.X(7.5), f.Y(2100), 'MVFR', { c: C.ink, b: 1, fs: 13 }) + T(f.X(7.5), f.Y(760), 'IFR', { c: C.ink, b: 1, fs: 12 }) + T(f.X(7.5), f.Y(140), 'LIFR', { c: C.ink, b: 1, fs: 12 });
      const pt = (v, c, lab, dx) => `<circle cx="${f.X(v[0]).toFixed(1)}" cy="${f.Y(v[1]).toFixed(1)}" r="5" fill="${C.ink}" stroke="${C.bg}" stroke-width="1.5"/>` + T(f.X(v[0]) + dx, f.Y(v[1]) + 4, lab, { c, b: 1, fs: 12, a: dx < 0 ? 'end' : 'start', halo: 1 });
      s += pt([4, 1200], C.ink, '例 B：BKN012・4SM', 8) + pt([9, 4500], C.ink, '例 A', -8);
      return svg(400, 290, s, '図：天気の区分（雲高と視程）。航空気象のサイトは、LIFR を紫、IFR を赤、MVFR を青、VFR を緑で表示します（AWH 第 3 章）。この区分は、米国の 14 CFR 91.155 の VFR の最低気象条件とは別のものです');
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
      const leg = [['R', '制限空域（Restricted）：使用中は許可なしで入らない', C.bl], ['MOA', '軍の訓練空域：入れるが、ATC に交通情報を求める', C.vi], ['A', '警戒空域（Alert）：訓練機などが多い。注意して飛ぶ', C.am], ['W', '警告空域（Warning）：海岸から 3 NM より沖の危険な空域', C.bl], ['TFR', '一時的な飛行制限：NOTAM で出る。飛ぶ前に確かめる', C.rd]];
      leg.forEach(([k, t, c], i) => { s += T(12, 222 + i * 17, k, { c, b: 1, a: 'start', fs: 12 }) + T(50, 222 + i * 17, t, { c: C.ink, a: 'start', fs: 12 }); });
      s += T(8, 194, '模式図・NOT FOR NAVIGATION', { c: C.mut, a: 'start', fs: 12, halo: 1 });
      return svg(400, 306, s, '図：特別な空域と TFR（上から見た模式図。名前と位置は架空で、実際の地図とは違います）。運用中の制限空域や TFR には、許可なしに入りません（AIM 3-4・3-5）');
    },
    // ---------------------------------------------------------------- radio1（無線交信のしくみ）
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
    // ---------------------------------------------------------------- radio2（言葉の決まり）
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
    // ---------------------------------------------------------------- radio3（交信の型）
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
    // ---------------------------------------------------------------- radio4（1 回の飛行の交信）
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
    // ---------------------------------------------------------------- radio5（管制塔のない空港・緊急・Sanford）
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
      return svg(400, 456, s, '図：管制塔のない架空の空港 Lakeside の滑走路 18 の左場周（模式図）と、CTAF で自己通報する所（AIM 4-1-9）。場周高度はプロペラ機で地上 1,000 ft（AIM 4-3-3）。出発のときは、タキシーの前と滑走路に入る前にも言います');
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
    // ---------------------------------------------------------------- hf（人間の能力と判断）
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
      s += T(8, 396, '規則：米国の 14 CFR 91.211　すすめ・影響：米国の AIM 8-1-2', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 406, s, '図：高度と酸素（機内の高度）。夜は 5,000 ft、昼は 10,000 ft を超えたら酸素がすすめ（米国の AIM 8-1-2）。米国の規則では、12,500 ft を超えると乗員の酸素が必要になります（14,000 ft までは 30 分を超える分。14 CFR 91.211）。対処できなくなるまでの時間は米国の AIM 8-1-2 の値で、PHAK の有効意識時間の表（図 17-1）とは違う目安です');
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
    // ---------------------------------------------------------------- ground（飛行前の準備・地上での操作）
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
    // ---------------------------------------------------------------- ops（基本操縦）
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
        s1 += TL(x + 10, y + 103, [`ピッチ ${pitch}`, `スロットル ${pwr}`, `約 ${(Math.round(r.rpm / 50) * 50).toLocaleString('en-US')} rpm`, `→ ${r.kt} kt・${fpm}`], { c: C.ink, a: 'start', fs: 12, lh: 16 });
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
    // ---------------------------------------------------------------- tl（離陸・場周経路・着陸）
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
        for (let j = 0; j < 4; j++) s += `<circle cx="${236 + j * 12}" cy="${y}" r="5.5" fill="${j < w ? '#f2f2f2' : '#ff4a3a'}"/>`;
        s += T(284, y + 4, lab, { c: w === 2 ? C.gr : C.ink, b: w === 2 ? 1 : 0, a: 'start', fs: 12 });
      });
      return svg(400, g + 42, s, '図：ファイナル（横から見た模式図。高さは横より大きく描いてあり、滑走路の部分は縮尺どおりではありません）。3° の線で目標点へまっすぐ降り、地上 500 ft までに安定していなければゴーアラウンドします（AFH 第 9 章）。接地はフレアのぶん目標点より少し先になります。右上は PAPI の見え方（米国の AIM 2-1-2）');
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
      const key = [['①', C.am, ['Power：決めたらすぐ、なめらかに全開', 'キャブレターヒートは OFF']], ['②', C.cy, ['Attitude：機首が上がり左へ向くので、', '押さえて上昇の姿勢に。右ラダー']],
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
    // ---------------------------------------------------------------- emg（緊急操作）
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
    // ---------------------------------------------------------------- solo（ソロ）
    soloRoadmap() {
      // the road to the first solo and beyond under 14 CFR part 61 (61.83, 61.23, 61.87(a)(b)(c)(d)(n)(o)(p), 61.93, 61.95) and,
      // at a part 141 school, the stage checks of 141.85
      const steps = [
        ['前提：学生操縦士証明と航空身体検査証明', ['16 歳以上・英語を読み・話し・書き・理解できる', 'ふつうは第 3 種以上の航空身体検査証明も', '（米国の 61.83・61.23）'], C.mut],
        ['ソロ前の学科テスト', ['規則・空域・機体の特性。間違いは教官と見直す', '（米国の 61.87(b)）'], C.cy],
        ['15 項目の飛行訓練と、教官が認める技量', ['離着陸・失速・緊急・ゴーアラウンドなど', '（米国の 61.87(c)(d)）'], C.cy],
        ['段階審査（訓練校）', ['学校の課程で決めた審査（米国の Part 141：141.85）'], C.cy],
        ['ログブックへの承認（endorsement）', ['型式ごと・訓練をした教官が・90 日以内（米国の 61.87(n)）'], C.am],
        ['初めてのソロ', ['乗っているのは自分 1 人（米国の 61.87(a)）'], C.gr],
        ['90 日ごとに承認を更新', ['教官がログブックに書き足す（米国の 61.87(p)）'], C.am],
        ['その先のソロ（それぞれ別の承認）', ['25 NM 以内のほかの空港・クロスカントリー（米国の 61.93）', '夜（米国の 61.87(o)）・Class B 空域（米国の 61.95）'], C.vi]];
      let s = '', y = 6;
      steps.forEach(([title, lines, c], i) => {
        const h = 30 + lines.length * 16;
        s += `<rect x="4" y="${y}" width="392" height="${h}" rx="8" fill="${c}" fill-opacity="${i === 5 ? 0.22 : 0.1}" stroke="${c}" stroke-width="${i === 5 ? 2.5 : 1.5}"/>`;
        s += `<circle cx="24" cy="${y + 19}" r="11" fill="${c}"/>` + T(24, y + 23.5, i + 1, { c: C.bg, b: 1, fs: 12 });
        s += T(44, y + 23, title, { c: i === 5 ? C.gr : C.ink, b: 1, a: 'start', fs: 13 }) + TL(44, y + 41, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 });
        y += h;
        if (i < steps.length - 1) { s += A(200, y + 1, 200, y + 13, C.mut, 2); y += 14; }
      });
      return svg(400, y + 6, s, '図：初めてのソロまでの道のりと、その先（米国の 14 CFR Part 61 の要点。訓練校の段階審査は Part 141）。承認は学生操縦士証明ではなく、ログブックに書きます（米国の 61.87(n)）');
    },
    // ---------------------------------------------------------------- navp（地図・飛行計画）
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
      const key = [['①', ['空港の記号。青は管制塔あり（マゼンタはなし）。', '上の ★ は回転灯台']], ['②', ['CT – 118.3：管制塔の周波数', '（CT の後に ★ があれば、管制塔は時間を限って運用）']],
        ['③', [`${elev}：標高（ft）・L：夜の滑走路灯・${rwy}：最長の滑走路`, `（${(Math.round(lenFt / 10) * 10).toLocaleString('en-US')} ft を百 ft 単位で）・122.95：UNICOM`]], ['④', [`マゼンタの実線：Class C 空域。上が上限、下が下限`, `（百 ft・MSL。${top}＝${(top * 100).toLocaleString('en-US')} ft、SFC＝地表）`]],
        ['⑤', [`障害物（LAB-A の塔）：${elev + 330} は海面から、`, '(330) は地面からの高さ（ft）']], ['⑥', ['MEF：その区画でいちばん高いものに余裕を足した高さ', '（2⁵ ＝ 2,500 ft MSL。図の外に高い塔がある想定）']], ['⑦', ['VOR のコンパスローズ（0° が磁北）と、名前・周波数・識別符号']], ['⑧', [`等偏差線：真北と磁北の差（この教材は ${PH.MAGVAR_W}°W）`]]];
      let y = 372;
      for (const [n, lines] of key) { s += tag(14, y - 4, n) + TL(30, y, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 }); y += lines.length * 16 + 5; }
      return svg(400, y + 4, s, '図：セクショナルチャートの記号（架空の LAB 空港のまわりを描いた模式図。記号は FAA Chart Users\' Guide のもの）。本物のチャートは 56 日ごとに改訂されるので、いつも最新の版を使います');
    },
    // ---------------------------------------------------------------- navr（電波航法）
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
    // ---------------------------------------------------------------- navd（目的地変更）
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
    // ---------------------------------------------------------------- ifrp（計器飛行方式）
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
      return svg(400, 396, s, '図：待機経路（課目 i4：LAB VOR へインバウンド 090°・右回り。北が上の模式図）。インバウンドはフィックスで終わります。入り方は、フィックスに着いたときの機首方位で 3 つの区域から選びます（米国の AIM 5-3-8）。大きさは無風・100 kt の 1 分と標準旋回');
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
      // false courses (IFH Addendum B): a false null near 12° that looks like a steeper glide path, and a signal reversal near 9°
      const fd = (h, a) => (h - R.elevFt) / (Math.tan(a * DEG) * 1852 * PH.FT) - gp0, f12 = fd(2150, 12), f9 = fd(1700, 9);
      s += L(X(-gp0), H(R.elevFt), X(f12), H(2150), C.rd, 1.5, '6 4') + T(X(f12) - 4, H(2150) + 2, '12° 付近：本物に似た偽の道', { c: C.rd, fs: 12, a: 'end', halo: 1 });
      s += L(X(-gp0), H(R.elevFt), X(f9), H(1700), C.rd, 1.2, '2 4') + T(X(f9) - 4, H(1700) + 4, '9° 付近：指示が逆になる', { c: C.rd, fs: 12, a: 'end', halo: 1 });
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
      return svg(400, 614, s, '図：ILS（計器着陸装置）を上と横から見た模式図と、針の読み方。ローカライザーは左右、グライドスロープは上下のずれを示します。グライドスロープの上には約 6°〜12° に偽のコースができ、9° 付近では指示が逆になり、12° 付近では本物に似た急な道になります（6° 付近は両方。IFH 追補 B）。チャートの高度で下から会合すれば出会いません。数字は架空の I-LAB（シミュレータのデータ）と課目 i5 の値');
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
    // ---------------------------------------------------------------- me（Seminole と双発機の基礎）
    counterRotation() {
      // AFH chapter 13 (critical engine, P-factor, counter-rotating engines): seen from above, nose up. The descending blade of each
      // propeller gives more thrust at a positive angle of attack, so each engine's thrust acts a little to one side of its centre.
      // Seminole (physics.js pa44: counterRotating): left engine clockwise and right engine counter-clockwise seen from behind, both
      // descending blades inboard, equal arms. A conventional twin (both clockwise): the right engine's descending blade is outboard,
      // so losing the left engine leaves the longest arm: the left engine is critical
      const panel = (cy, k, title, cw, lines) => {
        const ex = 24 * k, pr = 12 * k, py = cy - 26 * k, ya = py - 34 * k - 6;
        let s = T(200, cy - 62 * k - 34, title, { c: C.ink, b: 1, fs: 13 }) + planeTop(200, cy, k, { twin: true });
        // per engine: the rotation seen from behind and the side of the descending blade (where the thrust line sits)
        [[-1, 1], [1, cw ? -1 : 1]].forEach(([side, rot]) => {
          const x = 200 + side * ex, tx = x + rot * pr * 0.55;
          s += A(tx, py + 6, tx, py - 30 * k, C.gr, 3) + `<circle cx="${tx.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" fill="${C.gr}"/>`;
          // the arm: from the centre line to this engine's thrust line (a gap at the centre, a tick at each end)
          s += L(200 + side * 3, ya, tx, ya, C.am, 2) + L(tx, ya - 5, tx, ya + 5, C.am, 2);
          s += TL(200 + side * (ex + 36 * k), py - 4, [rot > 0 ? '右回り' : '左回り', '（後ろから）'], { c: C.cy, b: 1, fs: 12, lh: 15 });
        });
        s += L(200, ya - 9, 200, ya + 9, C.mut, 1.5) + T(200, ya - 12, cw ? '推力の腕：左右同じ' : '推力の腕：右が長い', { c: C.am, b: 1, fs: 12 });
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
    // ---------------------------------------------------------------- oei（片発停止）
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
    // ---------------------------------------------------------------- jet（ジェット機と自動化への準備）
    thrustResponse() {
      // how fast thrust follows the throttle. The course's Archer (physics.js: the propeller thrust is computed from the throttle with
      // no delay; only the rpm needle lags, at 1.8 /s) against a jet from idle, which AFH 3C chapter 16 says "could take up to 10
      // seconds" to reach full power. The jet curve is a schematic with that end point, not data of any type
      const f = frame(400, 290, 0, 12, 0, 100, [0, 2, 4, 6, 8, 10, 12], [0, 25, 50, 75, 100], '時間（秒）：0 秒でスロットルを全開に', '推力（最大に対する %）', { l: 52, r: 14, t: 20, b: 40 });
      const jet = t => t <= 0 ? 12 : 12 + 88 * (t >= 10 ? 1 : (1 - Math.cos(Math.PI * Math.min(1, t / 10) ** 1.25)) / 2);
      const pts = []; for (let t = 0; t <= 12.001; t += 0.25) pts.push([f.X(t), f.Y(jet(t))]);
      let s = f.s + `<path d="M${f.X(0)} ${f.Y(100)} ${pts.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')} L${f.X(12)} ${f.Y(100)} Z" fill="${C.am}" fill-opacity="0.12"/>`;
      s += P([[f.X(0), f.Y(12)], [f.X(0), f.Y(100)], [f.X(12), f.Y(100)]], C.cy, 3) + P(pts, C.am, 3);
      s += T(f.X(1.2), f.Y(100) - 8, 'プロペラ機（教材のモデルの Archer）：すぐ増える', { c: C.cy, b: 1, fs: 12, a: 'start' });
      s += TL(f.X(6.2), f.Y(46), ['ジェット機（アイドルから）：', '全開まで、長いと 10 秒ほど'], { c: C.am, b: 1, fs: 12, a: 'start', lh: 15 });
      s += TL(f.X(1.2), f.Y(76), ['この差の分だけ、', '早めに出力を使う'], { c: C.ink, fs: 12, a: 'start', lh: 15 });
      return svg(400, 290, s, '図：スロットルを全開にしてから推力が増えるまで（模式図）。ジェットエンジンはアイドルからの加速が遅く、全開まで、長いと 10 秒ほどかかります（AFH 第 16 章）。だから、出力は早めに・先回りして使います');
    },
  };
  // ---- the figures of Part 1's summary chapter 'g1' (R2: drafts/g1-figs.js by W25, registered in R2C): g1Map (g1.review:
  // Part 1's four groups on the front part's basic quantities) and g1Jur3 (g1.japan: the three places an item of FL.jur is met;
  // the count of Part 1's items is read from FL.jur.ofGate('g1')). No word of the FL.terms table in their text.
  {
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''}>${s}</text>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const box = (x, y, w, h, c, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${c}" fill-opacity="${o.op ?? 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;

  Object.assign(FIG, {
    // g1.review — Part 1's four groups on the front part's basic quantities, and the way on to Part 2
    g1Map() {
      let s = T(200, 20, '第 1 部の 4 つのまとまり', { b: 1, fs: 13 });
      // the way on: Part 2
      s += box(70, 32, 260, 30, C.gr, { op: 0.14 }) + T(200, 52, '第 2 部：Sanford・Archer で飛ぶ', { b: 1 });
      s += A(200, 82, 200, 66, C.gr, 2.5);
      // the four groups (DESIGN 3.2)
      const groups = [
        [8, 86, '原理と機体', ['飛行の原理', '機体・エンジン・系統'], C.cy],
        [204, 86, '計器・性能・重さ', ['計器と表示', '性能', '重さと重心'], C.am],
        [8, 172, '気象と航法の基礎', ['空の天気', '航法の基礎'], C.vi],
        [204, 172, '規則・交信・人間', ['米国の規則と空域', '英語の交信', '人間の能力と判断'], C.bl],
      ];
      for (const [x, y, head, lines, c] of groups) {
        s += box(x, y, 188, 78, c) + T(x + 94, y + 20, head, { b: 1, c });
        s += TL(x + 94, y + 40, lines, { lh: 16 });
      }
      // the front part's basic quantities under them
      s += A(200, 278, 200, 256, C.mut, 2.5);
      s += box(8, 282, 384, 54, C.mut, { op: 0.16 }) + T(200, 302, '序部：基本の量', { b: 1 });
      s += T(200, 322, '単位・時刻と方位・速さ・高さ・飛び方と天気の区分', { fs: 12 });
      s += T(200, 356, '問いの 3 分の 1 は序部から、残りは 4 つのまとまりから', { c: C.mut, fs: 12 });
      return svg(400, 366, s, '図：第 1 部の 4 つのまとまり（原理と機体・計器と性能と重さ・気象と航法の基礎・規則と交信と人間）は、序部で学んだ基本の量の上に立ち、第 2 部の Sanford での飛行につながります。この節の問いは、その両方から出します');
    },
    // g1.japan — the three places an item of FL.jur is met (DESIGN 3.4「3 回会わせる」); the count comes from FL.jur
    g1Jur3() {
      const n = FL.jur && typeof FL.jur.ofGate === 'function' ? FL.jur.ofGate('g1').length : 0;
      let s = T(200, 20, '日米の違いに 3 回会う', { b: 1, fs: 13 });
      const steps = [
        [34, '① 章の節の囲み', ['米国の数字を習うその場で、', '日本の数字と並べる'], C.cy],
        [116, '② 部のまとめ（この節）', [n ? `第 1 部の ${n} 項目を、` : '第 1 部の項目を、', 'まとまりごとの表に集める'], C.am],
        [198, '③ 第 7 部', ['日本の決まりの本文で、', '条文と一緒に詳しく学ぶ'], C.vi],
      ];
      for (const [y, head, lines, c] of steps) {
        s += box(20, y, 360, 66, c) + T(36, y + 22, head, { b: 1, c, a: 'start' });
        s += TL(36, y + 42, lines, { a: 'start', lh: 16 });
      }
      s += A(200, 100, 200, 114, C.ink, 2) + A(200, 182, 200, 196, C.ink, 2);
      s += L(20, 278, 380, 278, C.grid, 1);
      s += box(20, 288, 172, 52, C.cy, { op: 0.1 }) + TL(106, 308, ['Sanford で飛ぶとき', '→ 米国の欄'], { lh: 18 });
      s += box(208, 288, 172, 52, C.rd, { op: 0.1 }) + TL(294, 308, ['日本の学科と日本の空', '→ 日本の欄'], { lh: 18 });
      s += T(200, 362, '数字はデータから描く。〔要確認〕は推測で埋めない', { c: C.mut });
      return svg(400, 372, s, `図：日米の違いには 3 回会います。章の節の囲みで米国の数字と並べて見て、部のまとめの表で集め直し、第 7 部の日本の本文で詳しく学びます。${n ? `第 1 部の項目は ${n} です。` : ''}Sanford で飛ぶときは米国の欄、日本の学科と日本の空では日本の欄で答えます`);
    },
  });
  }
  // ---- the figures of Part 1's chapters 'hf' and 'adm' (R2: drafts/hfadm-figs.js by W20 and revise-hfadm, registered in R2B):
  // fatigueFactors, o2Partial, gLoad, nightEye, infoProcess, swissCheese, checklistFlow, saLevels, riskMatrix, residualRisk.
  {
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const box = (x, y, w, h, c, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${c}" fill-opacity="${o.op ?? 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
  const fmt = n => Math.round(n).toLocaleString('en-US');

  Object.assign(FIG, {
    // hf.fatigue — six conditions narrow the margin of attention, reaction and judgement (ch10-fig10-5 redrawn)
    fatigueFactors() {
      let s = T(200, 20, '疲れを作る条件は重なる', { c: C.ink, b: 1, fs: 13 });
      const cells = [[0, 0, '睡眠の不足', C.am], [1, 0, '眠りの質の低下', C.am], [0, 1, '長く起きている', C.am], [1, 1, '体内時計のずれ', C.vi], [0, 2, '続けての作業', C.cy], [1, 2, '緊張・暑さ', C.cy]];
      for (const [cx, cy, label, c] of cells) {
        const x = 8 + cx * 128, y = 34 + cy * 52;
        s += box(x, y, 120, 40, c) + T(x + 60, y + 25, label, { c: C.ink, fs: 12 });
      }
      s += A(262, 112, 282, 112, C.ink, 2.5);
      s += box(286, 58, 106, 108, C.rd, { op: 0.16 }) + TL(339, 84, ['注意・反応・', '判断の余裕が', '小さくなる'], { c: C.ink, b: 1, fs: 12, lh: 18 });
      s += L(8, 196, 392, 196, C.grid, 1);
      s += T(10, 220, '・眠気を感じないことは、能力が落ちていない証拠ではない', { c: C.ink, a: 'start', fs: 12 });
      s += T(10, 244, '・直すのは休養と睡眠。コーヒーや気合いでは直らない', { c: C.ink, a: 'start', fs: 12 });
      s += T(10, 268, '・体内時計のずれは、時差・早朝・夜の飛行で大きくなる', { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 282, s, '図：疲れを作る条件（模式図）。睡眠の不足・眠りの質・長く起きていること・体内時計のずれ・続けての作業・緊張や暑さが重なると、注意・反応・判断の余裕が小さくなります。眠気を感じないことは、能力が落ちていない証拠ではありません。枠の色は、だいだいが睡眠、むらさきが体内時計、水色が作業と環境です');
    },
    // hf.altitude — the share of oxygen stays about 21 %, its partial pressure falls with the pressure (ch10-fig10-2 redrawn)
    o2Partial() {
      const P = FL.physics, alts = [[0, '海面（0 ft）'], [10000, '10,000 ft'], [18000, '18,000 ft']];
      const p0 = P.atmos(0).p / 100, H = 210, base = 268;
      let s = T(200, 20, '酸素の割合は同じ、気圧が下がる', { c: C.ink, b: 1, fs: 13 });
      alts.forEach(([ft, label], i) => {
        const p = P.atmos(ft / P.FT).p / 100, h = H * p / p0, o2 = 0.21 * p, ho = H * o2 / p0, x = 34 + i * 126;
        s += `<rect x="${x}" y="${base - h}" width="80" height="${h}" rx="4" fill="${C.mut}" fill-opacity="0.22" stroke="${C.mut}" stroke-width="1.2"/>`;
        s += `<rect x="${x}" y="${base - ho}" width="80" height="${ho}" rx="4" fill="${C.cy}" fill-opacity="0.55"/>`;
        s += T(x + 40, base - h - 8, `${fmt(p)} hPa`, { c: C.ink, b: 1, fs: 12 });
        s += T(x + 40, base - ho / 2 + 4, `${fmt(o2)}`, { c: C.bg, b: 1, fs: 13 });
        s += T(x + 40, base + 18, label, { c: C.ink, fs: 12 });
      });
      s += L(20, base, 380, base, C.ink, 1.5);
      s += `<rect x="24" y="${base + 30}" width="14" height="12" fill="${C.mut}" fill-opacity="0.4"/>` + T(44, base + 41, '空気全体の圧力（気圧）', { c: C.ink, a: 'start', fs: 12 });
      s += `<rect x="214" y="${base + 30}" width="14" height="12" fill="${C.cy}" fill-opacity="0.7"/>` + T(234, base + 41, '酸素の分圧（約 21%）', { c: C.ink, a: 'start', fs: 12 });
      s += T(200, base + 64, '標準大気で計算。数字は hPa', { c: C.mut, fs: 12 });
      return svg(400, base + 74, s, '図：高度が上がっても、空気の中の酸素の割合（約 21%）は変わりません。気圧が下がるので、酸素の分圧が下がります。数字は標準大気で計算した気圧と、その 21% の酸素の分圧（hPa）で、18,000 ft では海面の約半分です');
    },
    // hf.motion — the load factor of a level turn (n = 1 / cos bank) and what positive and negative G do (US AIM 8-1-7)
    gLoad() {
      let s = T(100, 20, '水平旋回の G', { c: C.ink, b: 1, fs: 13 });
      const banks = [0, 30, 45, 60], base = 200, k = 70;
      banks.forEach((b, i) => {
        const n = 1 / Math.cos(b * Math.PI / 180), h = n * k, x = 18 + i * 44;
        s += `<rect x="${x}" y="${base - h}" width="32" height="${h}" rx="3" fill="${b >= 60 ? C.am : C.cy}" fill-opacity="0.5"/>`;
        s += T(x + 16, base - h - 6, `${n.toFixed(2)}`, { c: C.ink, b: 1, fs: 12 }) + T(x + 16, base + 16, `${b}°`, { c: C.mut, fs: 12 });
      });
      s += L(12, base, 194, base, C.ink, 1.5) + T(100, base + 36, 'バンク角（G ＝ 1 ÷ cos バンク）', { c: C.mut, fs: 12 });
      s += L(206, 30, 206, 250, C.grid, 1);
      s += T(304, 20, '体に起きること', { c: C.ink, b: 1, fs: 13 });
      s += box(214, 32, 180, 120, C.am) + T(304, 52, '＋G（引き起こし・深い旋回）', { c: C.am, b: 1, fs: 12 });
      s += TL(304, 74, ['血が足の方へ下がる', '視野が狭くなる', '→ グレーアウト', '→ ブラックアウト → 失神'], { c: C.ink, fs: 12, lh: 18 });
      s += box(214, 164, 180, 76, C.rd) + T(304, 184, '−G（急に押す）', { c: C.rd, b: 1, fs: 12 });
      s += TL(304, 206, ['血が頭の方へ上がる', '頭痛・レッドアウト'], { c: C.ink, fs: 12, lh: 18 });
      return svg(400, 254, s, '図：左は水平旋回の荷重倍数（G、load factor）で、1 ÷ cos（バンク角）で計算しました。60° では 2 G です。右は G が体に与える影響で、正の G では血が足の方へ下がります。ゆっくりかかると、目から先に影響が出ます（米国の AIM 8-1-7）。急に強くかかると、見え方の変化なしに意識を失うこともあります（FAA の資料）');
    },
    // hf.vision — by day the centre sees, by night look 5–10° to the side (ch10-fig10-3 redrawn; PHAK chapter 17)
    nightEye() {
      const panel = (x, dark) => {
        const cx = x + 96, cy = 120;
        let s = `<rect x="${x}" y="34" width="192" height="178" rx="10" fill="${dark ? '#05080f' : C.cy}" fill-opacity="${dark ? 0.9 : 0.06}" stroke="${C.grid}"/>`;
        s += `<circle cx="${cx}" cy="${cy}" r="70" fill="none" stroke="${C.mut}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
        s += `<circle cx="${cx}" cy="${cy}" r="16" fill="${dark ? '#000' : C.cy}" fill-opacity="${dark ? 1 : 0.35}" stroke="${dark ? C.rd : C.cy}" stroke-width="1.5"/>`;
        if (!dark) s += T(cx + 4, cy - 2, '★', { c: C.am, fs: 14 }) + T(cx, cy + 34, '中心で見る', { c: C.ink, b: 1, fs: 12 });
        else s += T(cx + 44, cy + 5, '★', { c: C.am, fs: 14 }) + L(cx, cy, cx + 36, cy, C.gr, 1.5, '3 3') + T(cx, cy + 4, '＋', { c: C.mut, fs: 12 }) + T(cx, cy - 24, '見る所', { c: C.ink, b: 1, fs: 12 }) + T(cx, cy + 34, '中心は見えにくい', { c: C.rd, b: 1, fs: 12 }) + T(cx + 44, cy - 14, '5〜10°', { c: C.gr, b: 1, fs: 12 });
        return s;
      };
      let s = T(100, 22, '明るい所', { c: C.ink, b: 1, fs: 13 }) + T(300, 22, '暗い所', { c: C.ink, b: 1, fs: 13 });
      s += panel(4, false) + panel(204, true);
      s += TL(100, 236, ['中心（錐体）が', '色と細かい所を見る'], { c: C.ink, fs: 12, lh: 16 });
      s += TL(300, 236, ['星の 5〜10° 横を見ると、', '周り（桿体）で星が見える'], { c: C.ink, fs: 12, lh: 16 });
      return svg(400, 268, s, '図：明るい所では、目の中心（錐体の集まる中心窩）で色と細かい所を見ます。暗い所では中心の感度が低く、見えにくい所ができます。夜は、見たい物の 5〜10° 横を見て（右の「見る所」）、周りの桿体で見ます（PHAK 第 17 章）');
    },
    // adm.error — the simplified information-processing model (UK CAA CAP 737, chapter 1, figure 3)
    infoProcess() {
      let s = '';
      s += box(6, 40, 74, 70, C.mut) + TL(43, 66, ['感覚', '目・耳'], { c: C.ink, fs: 12, lh: 18 });
      s += A(80, 75, 98, 75, C.ink, 2);
      s += box(100, 40, 82, 70, C.cy) + TL(141, 66, ['知覚', '意味をつかむ'], { c: C.ink, fs: 12, lh: 18 });
      s += A(182, 75, 200, 75, C.ink, 2);
      s += box(202, 24, 112, 92, C.vi, { op: 0.08, dash: '6 4' }) + T(258, 40, '注意（限りがある）', { c: C.vi, b: 1, fs: 12 });
      s += box(210, 50, 96, 58, C.am) + TL(258, 72, ['考える', '（作業記憶）'], { c: C.ink, fs: 12, lh: 17 });
      s += box(210, 128, 96, 58, C.gr) + TL(258, 150, ['慣れた手順', '（長期記憶）'], { c: C.ink, fs: 12, lh: 17 });
      s += A(182, 100, 208, 150, C.ink, 2) + T(176, 146, '自動', { c: C.gr, b: 1, fs: 12 });
      s += A(314, 84, 330, 96, C.ink, 2) + A(306, 160, 330, 132, C.ink, 2);
      s += box(332, 74, 62, 68, C.rd) + TL(363, 100, ['反応', '操作・発言'], { c: C.ink, fs: 12, lh: 18 });
      s += `<path d="M363 142 L363 214 L43 214 L43 112" fill="none" stroke="${C.mut}" stroke-width="1.8" stroke-dasharray="6 4"/>` + `<path d="M43 110 L38 120 L48 120 Z" fill="${C.mut}"/>`;
      s += T(200, 232, '結果を見て、また感覚から始まる', { c: C.mut, fs: 12 });
      s += T(200, 254, 'どの段階でもエラーは起こる（聞き落とし・思い込み・押し間違い）', { c: C.ink, fs: 12 });
      return svg(400, 266, s, '図：人が情報を受け取り、処理し、反応するまでの簡単な模式図（英国 CAA の CAP 737 第 1 章の図をもとにした）。考える作業は注意（点線の枠）を使い、注意には限りがあります。慣れた手順は、注意をほとんど使わずに自動で進みます');
    },
    // adm.error — the Swiss cheese model (FAA Risk Management Handbook, figure 6-1)
    swissCheese() {
      const slices = [['設計と装備', C.cy, [60, 150]], ['手順と', C.gr, [60, 118]], ['自分の確かめ', C.am, [60, 132]], ['教官・管制', C.vi, [60, 104]]];
      let s = T(200, 18, '守りは何枚も重ねる', { c: C.ink, b: 1, fs: 13 });
      slices.forEach(([label, c, holes], i) => {
        const x = 98 + i * 72;
        s += `<rect x="${x}" y="36" width="44" height="150" rx="6" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="1.5"/>`;
        for (const hy of holes) s += `<ellipse cx="${x + 22}" cy="${hy}" rx="12" ry="9" fill="${C.bg}"/>`;
        s += T(x + 22, 204, label, { c, b: 1, fs: 12 });
        if (i === 1) s += T(x + 22, 220, 'チェックリスト', { c, b: 1, fs: 12 });
      });
      s += A(14, 60, 380, 60, C.rd, 2.5) + T(386, 50, '事故', { c: C.rd, b: 1, fs: 12, a: 'end' });
      s += A(14, 150, 168, 150, C.gr, 2.5);
      s += T(12, 50, '危険・エラー', { c: C.ink, a: 'start', fs: 12 });
      s += T(200, 244, '緑の矢印：穴がそろわなければ、次の 1 枚で止まる', { c: C.gr, fs: 12 });
      s += T(200, 262, '穴＝守りの弱いところ。腕と習慣を保つと穴は小さくなる', { c: C.mut, fs: 12 });
      return svg(400, 274, s, '図：スイスチーズのモデル（FAA の Risk Management Handbook の図 6-1 をもとにした模式図。層の名前はこの本の例）。1 枚 1 枚が守りで、穴はその弱いところです。穴が全部そろったときだけ、危険やエラーが事故まで通り抜けます');
    },
    // adm.check — the four steps of a checklist and the branch for an interruption (ch10-fig10-7 redrawn)
    checklistFlow() {
      const step = (y, n, text, c) => box(10, y, 230, 40, c) + T(26, y + 25, n, { c, b: 1, fs: 13 }) + T(134, y + 25, text, { c: C.ink, fs: 12 });
      let s = step(10, '①', '使う手順と版を確かめる', C.cy);
      s += A(125, 50, 125, 66, C.ink, 2) + step(68, '②', '項目を実行し、状態と照らす', C.cy);
      s += A(125, 108, 125, 124, C.ink, 2) + step(126, '③', '終えた所をはっきりさせる', C.cy);
      s += A(125, 166, 125, 182, C.ink, 2) + step(184, '④', '次の段階へ進む', C.gr);
      s += A(240, 88, 262, 88, C.rd, 2.5);
      s += box(264, 44, 130, 150, C.rd, { op: 0.12 }) + TL(329, 68, ['中断が入ったら', '', '記憶で続けない', '確実に終えた所', 'へ戻って、実際', 'の状態を照らす'], { c: C.ink, fs: 12, lh: 18 });
      s += T(329, 68, '中断が入ったら', { c: C.rd, b: 1, fs: 12 });
      s += T(200, 248, '読んだことと、確かめたことは別', { c: C.mut, fs: 12 });
      return svg(400, 260, s, '図：チェックリストの使い方（模式図）。項目を実行したら、実際の状態と照らして確かめます。途中で中断が入ったら、記憶で先へ進まず、確実に終えた所へ戻って照らし直します');
    },
    // adm.sa — perceive → comprehend → project, with the textbook's headwind example (ch10-fig10-8 redrawn)
    saLevels() {
      const col = (x, c, n, head, lines) => box(x, 30, 116, 168, c) + T(x + 58, 52, `${n} ${head}`, { c, b: 1, fs: 13 }) + TL(x + 58, 80, lines, { c: C.ink, fs: 12, lh: 18 });
      let s = col(4, C.cy, '①', '知覚', ['何が起きて', 'いるか', '', '向かい風が', '強くなり、', '地面に対する', '速さが落ちた']);
      s += col(142, C.am, '②', '理解', ['自分の飛行に', 'どう効くか', '', '着く時刻が遅れ', '燃料と日没の', '余裕が減る']);
      s += col(280, C.gr, '③', '予測', ['この先', 'どうなるか', '', 'このままなら', '余裕が足りない', '→ 早めに決める']);
      s += A(121, 114, 140, 114, C.ink, 2.5) + A(259, 114, 278, 114, C.ink, 2.5);
      s += `<path d="M338 198 L338 222 L62 222 L62 204" fill="none" stroke="${C.mut}" stroke-width="1.8" stroke-dasharray="6 4"/>` + `<path d="M62 200 L57 210 L67 210 Z" fill="${C.mut}"/>`;
      s += T(200, 240, '新しい観測と通報で、くり返し更新する', { c: C.mut, fs: 12 });
      return svg(400, 252, s, '図：状況認識の 3 つの段階（模式図）。何が起きているかに気づき（知覚）、自分の飛行への影響を理解し、この先を予測します。予測は、新しい情報でくり返し更新します');
    },
    // adm.risk — the risk assessment matrix of PHAK chapter 2, figure 2-5
    riskMatrix() {
      const sev = ['壊滅的', '重大', '軽い', 'ごく小さい'], lik = ['何度も起きる', 'いつか起きる', '起きにくい', 'まず起きない'];
      const cells = [['高い', '高い', 'やや高い', '中'], ['高い', 'やや高い', '中', '低い'], ['やや高い', '中', '中', '低い'], ['中', '中', '中', '低い']];
      const colr = { '高い': C.rd, 'やや高い': C.am, '中': '#d8c23a', '低い': C.mut };
      const x0 = 114, y0 = 56, w = 70, h = 40;
      let s = T(254, 18, '重大さ（結果の大きさ）', { c: C.ink, b: 1, fs: 12 }) + T(10, 18, '起こりやすさ', { c: C.ink, b: 1, a: 'start', fs: 12 });
      sev.forEach((t, j) => { s += T(x0 + j * w + w / 2, 44, t, { c: C.ink, fs: 12 }); });
      lik.forEach((t, i) => {
        s += T(x0 - 6, y0 + i * h + 25, t, { c: C.ink, a: 'end', fs: 12 });
        cells[i].forEach((v, j) => {
          const c = colr[v];
          s += `<rect x="${x0 + j * w + 1}" y="${y0 + i * h + 1}" width="${w - 2}" height="${h - 2}" rx="4" fill="${c}" fill-opacity="${v === '低い' ? 0.18 : 0.42}"/>` + T(x0 + j * w + w / 2, y0 + i * h + 25, v, { c: C.ink, b: 1, fs: 13 });
        });
      });
      s += `<rect x="${x0 + 1}" y="${y0 + h + 1}" width="${w - 2}" height="${h - 2}" rx="4" fill="none" stroke="${C.ink}" stroke-width="2.5"/>`;
      s += TL(10, y0 + 4 * h + 26, ['太い枠：PHAK の例。計器で飛ぶ資格のない操縦士が雲に入る', 'ことを「いつか起きる」「壊滅的」と見積もると、高いリスク', 'リスクの順：高い ＞ やや高い ＞ 中 ＞ 低い'], { c: C.ink, a: 'start', fs: 12, lh: 17 });
      return svg(400, y0 + 4 * h + 84, s, '図：リスク・マトリックス（PHAK 第 2 章の図 2-5 をもとにした）。起こりやすさと結果の重大さの組み合わせで、リスクを高い・やや高い・中・低いに分けます。高いときは飛ばないか、リスクを減らす手を打ってから飛びます');
    },
    // adm.risk — the residual risk after the measures (ch10-fig10-10 redrawn)
    residualRisk() {
      const step = (y, n, text, c) => box(34, y, 226, 34, c) + T(50, y + 22, n, { c, b: 1, fs: 13 }) + T(160, y + 22, text, { c: C.ink, fs: 12 });
      let s = step(8, '①', 'ハザードを具体的に書く', C.cy);
      s += A(147, 42, 147, 54, C.ink, 2) + step(56, '②', '起こりやすさ × 重大さで見積もる', C.cy);
      s += A(147, 90, 147, 102, C.ink, 2) + step(104, '③', 'なくす・減らす・抑える対策', C.am);
      s += A(147, 138, 147, 150, C.ink, 2) + step(152, '④', '残るリスクを見積もり直す', C.am);
      s += A(147, 186, 147, 198, C.ink, 2) + box(72, 200, 150, 30, C.vi) + T(147, 220, '許せる大きさか', { c: C.vi, b: 1, fs: 12 });
      s += A(222, 215, 272, 215, C.gr, 2) + T(247, 207, 'はい', { c: C.gr, fs: 12 });
      s += box(274, 190, 120, 50, C.gr, { op: 0.12 }) + TL(334, 210, ['出発・続ける', '効いたか見続ける'], { c: C.ink, fs: 12, lh: 18 });
      s += A(147, 230, 147, 252, C.rd, 2) + T(156, 246, 'いいえ', { c: C.rd, fs: 12, a: 'start' });
      s += box(72, 254, 150, 30, C.rd, { op: 0.12 }) + T(147, 274, '計画を変える・飛ばない', { c: C.ink, fs: 12 });
      s += `<path d="M72 269 L18 269 L18 121 L28 121" fill="none" stroke="${C.rd}" stroke-width="1.6" stroke-dasharray="6 4"/>` + `<path d="M34 121 L25 116 L25 126 Z" fill="${C.rd}"/>`;
      s += T(200, 306, '点数を足しても、重大な危険は打ち消さない', { c: C.mut, fs: 12 });
      return svg(400, 316, s, '図：対策のあとに残るリスクを確かめる（模式図）。対策を決めただけで終えず、残るリスク（残留リスク）を見積もり直します。許せなければ、対策に戻って計画を変えるか、飛びません');
    },
  });
  }
  // ---- the figures of Part 1's chapters 'radio1'〜'radio5' (R2: drafts/radio-figs.js by W19 and revise-radio, registered in
  // R2B); redrawn under its name (the old function removed above): readbackLoop.
  {
  const A = (x1, y1, x2, y2, c, w = 3, dash = '') => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w, dash) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  Object.assign(FIG, {
    // ---------------------------------------------------------------- comm.readback — REDRAWN (same name as book-figs.js)
    readbackLoop() {
      // the readback loop with radio.js gnd1's taxi instruction, and what must be read back (AIM 4-4-7 airborne, AIM 4-3-18 on the ground)
      const bub = (x, y, w, h, c, head, lines) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`
        + T(x + 12, y + 20, head, { c, b: 1, a: 'start', fs: 13 }) + TL(x + 12, y + 40, lines, { c: C.ink, a: 'start', fs: 12, lh: 17 });
      let s = bub(36, 8, 356, 66, C.cy, '① 管制官の指示', ['Archer Seven Lima Alpha, runway three six,', 'taxi via Alpha, hold short of taxiway Charlie.']);
      s += bub(36, 88, 356, 66, C.gr, '② あなたの復唱', ['Runway three six, taxi via Alpha,', 'hold short of Charlie, Archer 7LA.']);
      s += `<rect x="36" y="168" width="356" height="62" rx="10" fill="${C.am}" fill-opacity="0.12" stroke="${C.am}" stroke-width="1.5"/>` + T(48, 188, '③ 管制官が聞いて確かめる（ヒアバック）', { c: C.am, b: 1, a: 'start', fs: 13 });
      s += T(48, 210, '合っている → 次へ', { c: C.gr, a: 'start', fs: 12 }) + T(196, 210, '違う → 管制官が直す（① へ）', { c: C.rd, a: 'start', fs: 12 });
      s += A(214, 74, 214, 86, C.ink, 2) + A(214, 154, 214, 166, C.ink, 2);
      // back to ① when it was wrong
      s += P([[36, 220], [18, 220], [18, 40]], C.rd, 2, 'none', '5 4') + A(18, 40, 34, 40, C.rd, 2);
      // what must be read back
      s += T(8, 256, 'いつも復唱するもの（AIM）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      // a row of rounded labels, laid out left to right (width from the text: CJK ≈ 12 px, latin ≈ 7 px at size 12)
      const chips = (x, y, list, c) => list.map(tx => { const w = [...tx].reduce((a, ch) => a + (ch > '　' ? 12 : 7), 14), r = `<rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="${c}" fill-opacity="0.18" stroke="${c}"/>` + T(x + w / 2, y + 15, tx, { c: C.ink, fs: 12 }); x += w + 4; return r; }).join('');
      s += T(8, 282, '空中', { c: C.cy, b: 1, a: 'start', fs: 12 }) + T(8, 298, 'AIM 4-4-7', { c: C.mut, a: 'start', fs: 12 });
      s += chips(80, 268, ['高度', '高度の制限', '針路（vector）', '滑走路の指定'], C.cy);
      s += T(8, 330, '地上', { c: C.gr, b: 1, a: 'start', fs: 12 }) + T(8, 346, 'AIM 4-3-18', { c: C.mut, a: 'start', fs: 12 });
      s += chips(80, 316, ['滑走路の指定', '滑走路に入る許可'], C.gr) + chips(80, 346, ['滑走路の hold short', 'line up and wait'], C.gr);
      s += T(8, 392, '“Roger” だけ → 管制官「read back hold instructions」', { c: C.rd, a: 'start', fs: 12 });
      return svg(400, 404, s, '図：復唱の輪。指示を言われた順に復唱し、管制官が聞いて確かめます（ヒアバック）。復唱したら、管制官の返事を最後まで聞きます。下は、AIM がいつも復唱するよう求めているもの。hold short に Roger だけで答えると、管制官は復唱を求めます（JO 7110.65 3-7-2）');
    },

    // ---------------------------------------------------------------- comm.runway (new) — the hold line and what each word allows
    runwayEntry() {
      // the runway (north up): 36 at its south end, 18 at its north end
      let s = `<rect x="282" y="8" width="62" height="176" fill="#26303d" stroke="${C.mut}" stroke-width="1.2"/>`;
      s += L(313, 34, 313, 158, C.ink, 2, '12 9');
      s += T(313, 176, '36', { c: C.ink, fs: 15, b: 1 }) + T(313, 18, '18', { c: C.ink, fs: 15, b: 1, rot: 180 });
      // taxiway A from the west, its yellow centreline
      s += `<rect x="8" y="118" width="274" height="40" fill="#1e2733"/>` + L(8, 138, 282, 138, C.am, 2);
      // the enhanced taxiway centerline: dashes on both sides of the centreline before the hold line (AIM 2-3-4)
      s += L(156, 133, 238, 133, C.am, 1.5, '6 4') + L(156, 143, 238, 143, C.am, 1.5, '6 4');
      // the runway holding position marking: two solid lines (the side where the aircraft holds) and two dashed lines
      s += L(240, 118, 240, 158, C.am, 2.6) + L(245, 118, 245, 158, C.am, 2.6) + L(251, 118, 251, 158, C.am, 2.6, '5 4') + L(256, 118, 256, 158, C.am, 2.6, '5 4');
      // the signs on the left of the taxiway (north side): taxiway location sign "A" (outboard) and runway holding position sign "18-36"
      s += `<rect x="160" y="84" width="24" height="24" fill="#000" stroke="${C.am}" stroke-width="1.5"/>` + T(172, 101, 'A', { c: C.am, fs: 14, b: 1 });
      s += `<rect x="186" y="84" width="54" height="24" fill="#c8102e"/>` + T(213, 101, '18-36', { c: '#ffffff', fs: 13, b: 1 });
      s += L(212, 108, 212, 116, C.mut, 1.5);
      // the runway entrance lights at the hold line (red when the runway is busy)
      for (const x of [256, 264, 272, 280]) s += `<circle cx="${x}" cy="138" r="3" fill="${C.rd}"/>`;
      // the airplane taxiing east on A
      s += L(84, 138, 126, 138, C.cy, 4) + L(108, 122, 108, 154, C.cy, 4) + L(88, 130, 88, 146, C.cy, 3);
      s += T(60, 110, '誘導路 A', { c: C.ink, fs: 12, b: 1 });
      // what each part means
      s += T(14, 30, '① 地上滑走の指示', { c: C.gr, fs: 13, b: 1, a: 'start' }) + T(14, 48, '（runway 36, taxi via A）', { c: C.gr, fs: 12, a: 'start' });
      s += T(14, 66, '→ 停止線の手前まで', { c: C.gr, fs: 12, a: 'start' });
      s += L(132, 62, 246, 62, C.gr, 2) + A(246, 62, 246, 114, C.gr, 2);
      s += T(14, 204, '② 停止線を越える → 入る・横切る・離陸の許可が要る', { c: C.am, fs: 12, a: 'start' });
      s += T(14, 224, '実線の側で止まる。機体のどこも線を越えない', { c: C.ink, fs: 12, a: 'start' });
      s += T(14, 244, '赤地に白：滑走路の標識（左に 18、右に 36 の進入端）', { c: C.ink, fs: 12, a: 'start' });
      s += T(14, 264, '黒地に黄：いま居る誘導路（A）', { c: C.ink, fs: 12, a: 'start' });
      s += T(14, 284, '停止線の赤い灯（REL）がついたら、止まって管制に確かめる', { c: C.rd, fs: 12, a: 'start' });
      s += T(14, 304, '中心線の両側の黄色の破線：停止線が近い合図', { c: C.am, fs: 12, a: 'start' });
      s += NFN(392, 332);
      return svg(400, 342, s, '図：誘導路が滑走路に出会う所（模式図）。地上滑走の指示で行けるのは停止線の手前までです。黄色の 4 本の線の実線の側で止まり、入る・横切る許可をもらうまで越えません（AIM 2-3-5・4-3-18）。赤地に白の標識は滑走路の名前、黒地に黄は今いる誘導路です（AIM 2-3-8・2-3-9）。中心線の両側の破線は、停止線が近い合図です（AIM 2-3-4）');
    },

    // ---------------------------------------------------------------- comm.xpdr (new) — the transponder and its four codes
    xpdrCodes() {
      // a plain transponder face: the code window, the mode knob, the IDENT button
      let s = `<rect x="10" y="12" width="210" height="96" rx="8" fill="#141d2a" stroke="${C.mut}" stroke-width="1.5"/>`;
      s += `<rect x="24" y="28" width="96" height="36" rx="4" fill="#06100a" stroke="${C.gr}" stroke-width="1"/>` + T(72, 54, '4271', { c: C.gr, fs: 20, b: 1 });
      s += T(72, 82, 'コード（4 けた）', { c: C.mut, fs: 12 });
      s += `<circle cx="160" cy="48" r="20" fill="#0b1422" stroke="${C.ink}" stroke-width="1.5"/>` + L(160, 48, 172, 34, C.am, 3);
      s += T(160, 84, 'OFF・SBY・ON', { c: C.mut, fs: 12 }) + T(160, 100, 'ALT・TST', { c: C.mut, fs: 12 });
      s += `<rect x="190" y="22" width="24" height="16" rx="3" fill="${C.cy}" fill-opacity="0.25" stroke="${C.cy}"/>` + T(202, 34, 'ID', { c: C.cy, fs: 12, b: 1 });
      s += T(115, 124, 'Ident と言われたときだけ ID を押す', { c: C.cy, fs: 12 });
      // the four codes
      const rows = [['1200', 'VFR（指定がないとき）', C.gr], ['7500', '不法な干渉（ハイジャック）', C.rd], ['7600', '無線の故障', C.am], ['7700', '緊急', C.rd]];
      rows.forEach(([code, what, c], i) => {
        const y = 150 + i * 26;
        s += `<rect x="10" y="${y - 16}" width="62" height="22" rx="4" fill="${c}" fill-opacity="0.16" stroke="${c}"/>` + T(41, y, code, { c, fs: 14, b: 1 });
        s += T(82, y, what, { c: C.ink, fs: 13, a: 'start' });
      });
      // changing 2700 → 7200: through 2200, not through 7700
      s += T(236, 30, 'コードを変えるとき', { c: C.ink, fs: 13, b: 1, a: 'start' });
      s += T(236, 52, '例：2700 → 7200', { c: C.ink, fs: 12, a: 'start' });
      s += T(250, 78, '2700', { c: C.ink, fs: 13, b: 1, a: 'start' }) + A(288, 74, 314, 74, C.gr, 2) + T(318, 78, '2200', { c: C.gr, fs: 13, b: 1, a: 'start' });
      s += A(334, 84, 334, 104, C.gr, 2) + T(318, 120, '7200', { c: C.gr, fs: 13, b: 1, a: 'start' });
      s += T(250, 146, '7700 を通らない', { c: C.rd, fs: 12, a: 'start' });
      s += T(250, 166, '（警報が出てしまう）', { c: C.rd, fs: 12, a: 'start' });
      s += T(250, 196, 'つまみ：ふつうは ALT', { c: C.am, fs: 12, a: 'start' }) + T(250, 214, '（高度を送る。地上でも）', { c: C.am, fs: 12, a: 'start' });
      return svg(400, 238, s, '図：トランスポンダーの表示（模式図）と決まったコード。VFR は 1200、7500・7600・7700 は特別なコードです。コードを変える途中で、7500・7600・7700 を通らないようにします。つまみは、ふつう高度を送る位置（ALT）にします（AIM 4-1-20）');
    },
  });
  }
  // ---- the figures of Part 1's chapter 'law' (R2: drafts/law-figs.js by W19 and revise-law, registered in R2B): lawSources,
  // lawCurrency, vfrTwoViews; redrawn under their names (the old functions removed above): preflightInfo, rightOfWay.
  {
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const planeSide = (x, y, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})">`
    + `<path d="M50 -1 C48 -8 38 -11 26 -12 L14 -16 C2 -18 -10 -16 -18 -12 L-50 -5 L-50 1 L-14 6 C6 8 30 7 44 5 C49 4 51 2 50 -1 Z" fill="${PLANE}"/>`
    + `<path d="M12 -15 C4 -17 -6 -16 -14 -12 L-12 -9 L10 -9 Z" fill="${GLASS}"/><path d="M-38 -6 L-50 -27 L-57 -27 L-54 -3 Z" fill="${PLANE}"/>`
    + `<rect x="-60" y="-4" width="20" height="3.5" rx="1.5" fill="${PLANE2}"/><ellipse cx="6" cy="5" rx="19" ry="2.6" fill="${PLANE2}"/>`
    + `<path d="M2 7 L0 15 M40 5 L40 15" stroke="${PLANE2}" stroke-width="2"/><circle cx="0" cy="16" r="3.4" fill="#5b6b7e"/><circle cx="40" cy="16" r="3" fill="#5b6b7e"/>`
    + `<line x1="52" y1="-15" x2="52" y2="13" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const planeTop = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${k})">`
    + `<path d="M-68 -8 L68 -8 L66 6 L-66 6 Z" fill="${PLANE}"/><path d="M-22 38 L22 38 L21 45 L-21 45 Z" fill="${PLANE2}"/>`
    + `<path d="M0 -50 C5 -48 7 -40 7 -28 L5 30 L2 50 L-2 50 L-5 30 L-7 -28 C-7 -40 -5 -48 0 -50 Z" fill="${PLANE}"/><path d="M-5 -26 L5 -26 L4 -14 L-4 -14 Z" fill="${GLASS}"/>`
    + `<line x1="-12" y1="-52" x2="12" y2="-52" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  // a cloud centred at (x, y), w wide
  const cloud = (x, y, w) => { const h = w * 0.36, l = x - w / 2, r = x + w / 2, b = y + h / 2, t = y - h / 2;
    return `<path d="M${l} ${b} Q ${l - 6} ${y} ${l + w * 0.18} ${y - h * 0.15} Q ${l + w * 0.24} ${t - 2} ${l + w * 0.46} ${t + h * 0.1} Q ${l + w * 0.62} ${t - h * 0.35} ${l + w * 0.78} ${t + h * 0.2} Q ${r + 6} ${y - h * 0.1} ${r} ${b} Z" fill="#dfe6ee" fill-opacity="0.85"/>`; };

  Object.assign(FIG, {
    // law.basis — one flight, three kinds of documents laid over it, the pilot in command, and the clearance on top
    lawSources() {
      let s = T(200, 20, '1 つの飛行に、3 つの資料を重ねて当てはめる', { c: C.ink, b: 1, fs: 13 });
      const card = (x, c, head, lines, foot) => `<rect x="${x}" y="32" width="122" height="122" rx="9" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.6"/>`
        + T(x + 61, 52, head, { c, b: 1, fs: 13 }) + TL(x + 61, 74, lines, { c: C.ink, fs: 12, lh: 16 }) + T(x + 61, 142, foot, { c: C.mut, fs: 12 });
      s += card(8, C.cy, '規則', ['誰が・どの', '条件で', '飛べるか'], '14 CFR');
      s += card(139, C.gr, '空港と空域', ['どこを・いつ・', 'どう使えるか', ''], 'チャート・NOTAM');
      s += card(270, C.am, '機体の資料', ['その機体で', '何ができるか', ''], 'AFM の運用限界');
      for (const x of [69, 200, 331]) s += A(x, 158, x === 200 ? 200 : (x < 200 ? 120 : 280), 184, C.mut, 2);
      s += `<rect x="40" y="188" width="320" height="32" rx="16" fill="${C.vi}" fill-opacity="0.18" stroke="${C.vi}" stroke-width="1.6"/>`
        + T(200, 209, '機長が、3 つを全部満たすかを確かめる', { c: C.ink, b: 1, fs: 13 });
      s += `<rect x="40" y="234" width="320" height="52" rx="9" fill="none" stroke="${C.rd}" stroke-width="1.6" stroke-dasharray="6 4"/>`
        + T(200, 254, '＋ 管制承認：決めた条件で進んでよいという許可', { c: C.rd, b: 1, fs: 12 })
        + T(200, 274, '規則や安全から外れてよい許可ではない', { c: C.ink, fs: 12 });
      return svg(400, 296, s, '図：1 つの飛行に、3 つの資料を重ねて当てはめます。規則は誰がどの条件で飛べるか、空港と空域の情報はどこをいつどう使えるか、機体の資料はその機体で何ができるかを決めます。3 つを全部満たすかを確かめるのは機長で、管制承認はその上での「決めた条件で進んでよい」という許可です');
    },
    // law.pilot — counted by calendar months (to the end of the month) or by days (back from the day of the flight)
    lawCurrency() {
      let s = T(12, 20, '① 暦月で数える：その月の終わりまで', { c: C.cy, b: 1, a: 'start', fs: 13 });
      const x0 = 30, mo = 13.6, mx = m => +(x0 + m * mo).toFixed(1);        // month 0 = March 2026; month 25 = April 2028 (the end of March 2028)
      s += L(x0, 72, mx(25) + 6, 72, C.mut, 1.5);
      [[0, '2026/3'], [6, '2026/9'], [12, '2027/3'], [18, '2027/9'], [24, '2028/3']].forEach(([m, t]) => { s += L(mx(m), 66, mx(m), 78, C.mut, 1.5) + T(mx(m) + 4, 94, t, { c: C.mut, fs: 12, a: m ? 'middle' : 'start' }); });
      const b0 = mx(10 / 31), b1 = mx(25);
      s += `<rect x="${b0}" y="42" width="${(b1 - b0).toFixed(1)}" height="18" rx="4" fill="${C.cy}" fill-opacity="0.25" stroke="${C.cy}"/>`;
      s += T(b0 + 4, 56, '3 月 10 日に受けた', { c: C.ink, fs: 12, a: 'start' }) + T(b1 - 4, 56, '2028 年 3 月 31 日まで', { c: C.ink, b: 1, fs: 12, a: 'end' });
      s += T(12, 116, '例：フライトレビュー（24 暦月）', { c: C.ink, fs: 12, a: 'start' });
      s += L(12, 132, 388, 132, C.grid, 1);
      s += T(12, 156, '② 日で数える：飛ぶ日からさかのぼる', { c: C.am, b: 1, a: 'start', fs: 13 });
      const d0 = 30, dd = 3.4, dx = d => +(d0 + d * dd).toFixed(1);           // day 0 = 90 days before the flight; day 90 = the day of the flight
      s += L(d0, 214, dx(100), 214, C.mut, 1.5);
      [[0, '90 日前'], [30, '60 日前'], [60, '30 日前'], [90, '飛ぶ日']].forEach(([d, t]) => { s += L(dx(d), 208, dx(d), 220, C.mut, 1.5) + T(dx(d), 236, t, { c: d === 90 ? C.ink : C.mut, b: d === 90, fs: 12 }); });
      s += A(dx(90), 176, dx(0), 176, C.am, 2) + T(dx(45), 170, 'さかのぼって 90 日', { c: C.am, b: 1, fs: 12 });
      for (const d of [22, 41, 57]) s += `<circle cx="${dx(d)}" cy="200" r="6" fill="${C.gr}"/>`;
      s += T(dx(57) + 12, 204, '離陸と着陸 3 回', { c: C.gr, b: 1, fs: 12, a: 'start' });
      s += T(12, 262, '例：人を乗せる前の最近の飛行経験（90 日に 3 回）', { c: C.ink, fs: 12, a: 'start' });
      s += T(12, 282, '暦月の決まりは月の終わりまで延びる。日の決まりは延びない', { c: C.mut, fs: 12, a: 'start' });
      return svg(400, 292, s, '図：期限の 2 つの数え方。暦月で数える決まり（フライトレビューの 24 暦月など）は、その月の終わりまで有効です。日で数える決まり（人を乗せる前の 90 日に 3 回の離着陸）は、飛ぶ日からさかのぼって数えます。身体検査証明も月の終わりまで数えますが、長さは年齢で違います（下の表）');
    },
    // law.vfr — one cloud clearance said two ways: from the cloud (91.155) and from the aircraft
    vfrTwoViews() {
      let s = T(100, 16, '雲から離れる距離で言う', { c: C.ink, b: 1, fs: 13 }) + T(300, 16, '機体のまわりの範囲で言う', { c: C.ink, b: 1, fs: 13 });
      s += L(200, 26, 200, 286, C.grid, 1.5);
      // 50 px for 500 ft, 100 px for 1,000 ft; the airplane takes py ± 8
      const py = 130, top = py - 8 - 50, bot = py + 8 + 100;
      // left: a cloud above the airplane (the airplane is 500 ft below it) and one below (the airplane is 1,000 ft above it)
      s += cloud(100, top - 21.6, 120) + cloud(100, bot + 21.6, 120).replace('fill-opacity="0.85"', 'fill-opacity="0.6"');
      s += planeSide(100, py, 0.42);
      s += A(46, top + 1, 46, py - 8, C.am, 2) + A(46, py - 8, 46, top + 1, C.am, 2) + T(54, top + 20, '雲の下', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 }) + T(54, top + 35, '500 ft', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 });
      s += A(46, py + 10, 46, bot - 1, C.cy, 2) + A(46, bot - 1, 46, py + 10, C.cy, 2) + T(54, py + 50, '雲の上', { c: C.cy, b: 1, a: 'start', fs: 12, halo: 1 }) + T(54, py + 65, '1,000 ft', { c: C.cy, b: 1, a: 'start', fs: 12, halo: 1 });
      // right: the airplane at the centre of a box that must hold no cloud: 500 ft above, 1,000 ft below, 2,000 ft to the side
      const bx0 = 218, bx1 = 382;
      s += `<rect x="${bx0}" y="${top}" width="${bx1 - bx0}" height="${bot - top}" rx="6" fill="${C.gr}" fill-opacity="0.06" stroke="${C.gr}" stroke-width="1.6" stroke-dasharray="6 4"/>`;
      s += planeSide(300, py, 0.42);
      s += A(300, py - 10, 300, top + 2, C.am, 2) + T(308, top + 24, '上 500 ft', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 });
      s += A(300, py + 12, 300, bot - 2, C.cy, 2) + T(308, py + 70, '下 1,000 ft', { c: C.cy, b: 1, a: 'start', fs: 12, halo: 1 });
      s += A(276, py + 30, bx0 + 2, py + 30, C.gr, 2) + A(324, py + 30, bx1 - 2, py + 30, C.gr, 2) + T(250, py + 22, '横 2,000 ft', { c: C.gr, b: 1, fs: 12, halo: 1 });
      s += T(300, bot + 18, 'この範囲に雲がない', { c: C.gr, b: 1, fs: 12 });
      s += T(200, 304, '「雲の下」の数字が、機体の「上」の数字になる', { c: C.ink, b: 1, fs: 13 });
      return svg(400, 314, s, '図：同じ決まりの 2 つの言い方。左は雲を中心に「雲の下 500 ft・雲の上 1,000 ft」、右は機体を中心に「機体の上 500 ft・下 1,000 ft・横 2,000 ft の範囲に雲がない」と言います。上と下の言葉が入れかわります（数字は米国の 14 CFR 91.155 の Class C・D と 10,000 ft MSL 未満の Class E。縦は縮尺どおりで、横は縮めて描いています）');
    },
    // redrawn under the same name (W19): the caption says「離陸と着陸の距離」(the terms 離陸距離・着陸距離 have their first
    // use, with English, in the text: STYLE「用語」; check-style reads the figures too); otherwise as book-figs.js
    preflightInfo() {
      // 14 CFR 91.103: all available information; for every flight, runway lengths and takeoff / landing distances; for IFR or away from the airport, weather, fuel, alternatives, ATC delays
      let s = `<rect x="8" y="8" width="384" height="236" rx="12" fill="none" stroke="${C.mut}" stroke-dasharray="5 4"/>` + T(200, 30, 'その飛行に関する、入手できるすべての情報', { c: C.ink, b: 1, fs: 13 });
      s += `<rect x="26" y="42" width="348" height="190" rx="10" fill="${C.cy}" fill-opacity="0.06" stroke="${C.cy}"/>` + T(200, 62, 'IFR・空港の近くを離れる飛行（クロスカントリー）', { c: C.cy, b: 1, fs: 12 }) + TL(200, 80, ['天気の報告と予報・必要な燃料', '行けないときの代わり・ATC から聞いた遅れ'], { c: C.ink, fs: 12, lh: 16 });
      s += `<rect x="62" y="116" width="276" height="104" rx="9" fill="${C.gr}" fill-opacity="0.08" stroke="${C.gr}"/>` + T(200, 136, 'すべての飛行', { c: C.gr, b: 1, fs: 12 }) + TL(200, 154, ['使う空港の滑走路の長さ', '離陸と着陸の距離（POH など）'], { c: C.ink, fs: 12, lh: 16 });
      s += `<rect x="140" y="188" width="120" height="24" rx="12" fill="${C.am}" fill-opacity="0.2" stroke="${C.am}"/>` + T(200, 205, '機長（PIC）', { c: C.am, b: 1, fs: 12 });
      return svg(400, 252, s, '図：飛行前の準備（米国の 14 CFR 91.103）。機長は出発前に、その飛行に関する入手できるすべての情報を知っておきます。すべての飛行で滑走路の長さと離陸・着陸の距離を、IFR や空港の近くを離れる飛行では天気・燃料・代わりの計画・ATC の遅れも確かめます');
    },
    // redrawn under the same name (W19): 進路権 (FL.terms) for 優先, and the country of 91.113 in the caption; otherwise as book-figs.js
    rightOfWay() {
      // 91.113: converging (the one on the right has the right-of-way), head-on (both turn right), overtaking (pass on the right); the order of categories (91.113(d); its wording amended by Amdt. 91-381, 90 FR 35034, published 2025-07-24, effective 2025-10-22 — the order itself did not change)
      let s = '';
      const box = (x, t1, t2) => `<rect x="${x}" y="8" width="124" height="150" rx="8" fill="none" stroke="${C.grid}"/>` + T(x + 62, 26, t1, { c: C.ink, b: 1, fs: 12 }) + T(x + 62, 150, t2, { c: C.mut, fs: 12 });
      s += box(4, '① 交わる', '右の機に進路権');
      s += planeTop(50, 104, 0.28, { rot: 0 }) + planeTop(104, 60, 0.28, { rot: 270 }) + `<path d="M50 86 Q 60 72 92 76 Q 122 78 130 56" stroke="${C.gr}" stroke-width="2" fill="none"/>` + T(104, 88, '相手', { c: C.am, fs: 12 }) + T(22, 130, '自分', { c: C.cy, fs: 12 });
      s += box(138, '② 正面', '両方とも右へ');
      s += planeTop(200, 120, 0.26, { rot: 0 }) + planeTop(200, 50, 0.26, { rot: 180 }) + `<path d="M200 104 Q 204 92 222 86" stroke="${C.gr}" stroke-width="2" fill="none"/><path d="M200 66 Q 196 78 178 84" stroke="${C.gr}" stroke-width="2" fill="none"/>`;
      s += box(272, '③ 追い越し', '右へ離れて抜く');
      s += planeTop(334, 64, 0.26, { rot: 0 }) + planeTop(334, 126, 0.26, { rot: 0 }) + `<path d="M334 110 Q 360 92 358 66" stroke="${C.gr}" stroke-width="2" fill="none"/>` + T(306, 66, '前', { c: C.am, fs: 12 });
      s += T(8, 184, '進路権の順（左ほど先・91.113(c)(d)）', { c: C.ink, b: 1, a: 'start', fs: 12 });
      [['遭難機', '気球', '滑空機'], ['曳航・給油中の機', '飛行船', 'ほかの動力機']].forEach((row, r) => {
        let x = 8; const y = 194 + r * 32;
        row.forEach((t, i) => { const w = t.length * 12 + 14, c = r === 0 && i === 0 ? C.rd : C.cy; s += `<rect x="${x}" y="${y}" width="${w}" height="24" rx="12" fill="${c}" fill-opacity="0.15" stroke="${c}"/>` + T(x + w / 2, y + 16, t, { c: C.ink, fs: 12 }); x += w; if (r === 0 || i < 2) { s += T(x + 9, y + 16, '＞', { c: C.mut, fs: 12 }); } x += 18; });
      });
      s += TL(8, 266, ['着陸の最終進入中・着陸中の機に進路権。2 機が着陸に向かうときは', '低いほうに進路権（ただし、最終進入中の機の前に割り込まない）'], { c: C.ink, a: 'start', fs: 12, lh: 16 });
      return svg(400, 292, s, '図：衝突を避ける進路権の決まり（米国の 14 CFR 91.113）。進路権のある機の上・下・前を、十分に離れずに横切ってはいけません。進路権があっても、ほかの機を見て避ける義務はみんなにあります');
    },
  });
  }
  // ---- the figures of Part 1's chapter 'navb' (R2: drafts/navb-figs.js by W18 and revise-navb, registered in R2B); redrawn under
  // its name (the old function removed above): windTriangle (nav.plan draws it too).
  {
  const A = (x1, y1, x2, y2, c, w = 3, dash = '') => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w, dash) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const BOX = (x, y, w, h, c, title = '', lines = [], o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${o.fill || c}" fill-opacity="${o.fill ? 1 : 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`
    + (title ? T(x + w / 2, y + (o.ty || 20), title, { c: o.tc || c, b: 1, fs: o.fs || 13 }) : '') + (lines.length ? TL(x + w / 2, y + (o.ly || (title ? 38 : 20)), lines, { c: o.lc || C.ink, fs: o.lfs || 12, lh: o.lh }) : '');
  const pad3 = n => String(Math.round(((n % 360) + 360) % 360)).padStart(3, '0');
  const ell = (cx, cy, rx, ry, c, w = 1.2, dash = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  // an arc around (cx, cy) between two compass directions (degrees, 0 = up, clockwise), radius r
  const arcDir = (cx, cy, r, d0, d1, c, w = 2) => {
    const p = d => [cx + r * Math.sin(d * DEG), cy - r * Math.cos(d * DEG)], [x0, y0] = p(d0), [x1, y1] = p(d1);
    return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 ${d1 > d0 ? 1 : 0} ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
  };

  Object.assign(FIG, {
    // ---------------------------------------------------------------- navb.earth (1) — ch08-fig8-2 redrawn
    navbLatLon() {
      const cx = 100, cy = 150, R = 82;
      let s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.bl}" fill-opacity="0.08" stroke="${C.mut}" stroke-width="1.5"/>`;
      // meridians (wire ellipses) and the prime meridian
      for (const lon of [35, 65]) s += ell(cx, cy, R * Math.sin(lon * DEG), R, C.mut, 1);
      s += L(cx, cy - R, cx, cy + R, C.gr, 2.2);
      // parallels and the equator
      for (const lat of [30, 60, -30]) s += ell(cx, cy - R * Math.sin(lat * DEG), R * Math.cos(lat * DEG), 13 * Math.cos(lat * DEG), C.cy, 1.3);
      s += ell(cx, cy, R, 13, C.am, 2.2);
      s += `<circle cx="${cx}" cy="${cy - R}" r="3" fill="${C.ink}"/>` + T(cx, cy - R - 8, '北極（90°N）', { c: C.ink, fs: 12, b: 1 });
      s += T(cx + 4, cy - 28, '本初子午線（経度 0°）', { c: C.gr, fs: 12, a: 'start', b: 1, halo: 1 });
      s += T(cx - 30, cy - R * Math.sin(30 * DEG) - 8, '緯線', { c: C.cy, fs: 12, b: 1, halo: 1 });
      s += T(cx + 26, cy + 30, '赤道（緯度 0°）', { c: C.am, fs: 12, b: 1, halo: 1 });
      s += T(cx, cy + R + 20, '経線（子午線）', { c: C.mut, fs: 12, b: 1 });
      s += L(cx + 30, cy + R + 6, (cx + R * Math.sin(35 * DEG) * 0.5).toFixed(1), (cy + R * 0.866).toFixed(1), C.mut, 1);   // leader to the 35° meridian (revise-navb: reader E12)
      // a one-degree square: 28°N–29°N, 82°W–81°W (west longitudes grow to the left)
      const x0 = 250, x1 = 390, y0 = 60, y1 = 200, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      s += T(320, 40, '緯度と経度の格子（例）', { c: C.ink, fs: 12, b: 1 });
      s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${C.mut}" stroke-width="1.5"/>`;
      s += L(xm, y0, xm, y1, C.mut, 1, '4 4') + L(x0, ym, x1, ym, C.mut, 1, '4 4');
      s += T(x0 - 4, y0 + 4, '29°N', { c: C.cy, fs: 12, a: 'end' }) + T(x0 - 4, ym + 4, '28°30′N', { c: C.cy, fs: 12, a: 'end' }) + T(x0 - 4, y1 + 4, '28°N', { c: C.cy, fs: 12, a: 'end' });
      s += T(x0, y1 + 18, '82°W', { c: C.gr, fs: 12 }) + T(xm, y1 + 18, '81°30′W', { c: C.gr, fs: 12 }) + T(x1, y1 + 18, '81°W', { c: C.gr, fs: 12, a: 'end' });
      s += `<circle cx="${xm}" cy="${ym}" r="5" fill="${C.am}"/>` + T(xm + 10, ym - 8, 'P', { c: C.am, fs: 13, b: 1, a: 'start' });
      s += T(316, y1 + 38, '← 西ほど経度の数が大きい', { c: C.mut, fs: 12 });
      s += T(200, 278, '28°30′N ＝ 28.5°N（28.30°N ではない）', { c: C.ink, fs: 13, b: 1 });
      s += T(200, 300, '経度 1′ の長さ：赤道で約 1 NM・緯度 60° で約 0.5 NM', { c: C.ink, fs: 12 });
      return svg(400, 312, s, '図：緯度は赤道から南北へ、経度は本初子午線から東西へ測る角度です。右の格子の点 P は 28°30′N・81°30′W で、小数の度では 28.5°N・81.5°W です（模式図）');
    },
    // ---------------------------------------------------------------- navb.earth (2) — two projections
    navbProjections() {
      let s = T(98, 20, 'ランベルト正角円錐図法', { c: C.ink, fs: 12, b: 1 }) + T(302, 20, 'メルカトル図法', { c: C.ink, fs: 12, b: 1 });
      s += L(200, 30, 200, 270, C.grid, 1);
      // left: meridians converge toward an apex above the chart, parallels are arcs around it
      const ax = 98, ay = -300, top = 36, bot = 222;
      for (let k = -3; k <= 3; k++) { const bx = ax + 30 * k, f = y => ax + 30 * k * (y - ay) / (bot - ay); s += L(f(top).toFixed(1), top, bx, bot, k === 0 ? C.gr : C.mut, k === 0 ? 2 : 1); }
      for (const r of [360, 430, 500]) { const pts = []; for (let x = 8; x <= 188; x += 6) pts.push([x, ay + Math.sqrt(r * r - (x - ax) * (x - ax))]); s += P(pts, C.cy, 1); }
      s += A(28, 196, 168, 70, C.am, 2.5);
      s += T(22, 212, 'A', { c: C.am, fs: 13, b: 1 }) + T(176, 66, 'B', { c: C.am, fs: 13, b: 1 });
      s += `<circle cx="98" cy="133" r="4" fill="${C.gr}"/>` + T(104, 150, '中ほどの経線', { c: C.gr, fs: 12, a: 'start', b: 1, halo: 1 });
      s += T(98, 246, '直線 ≈ 大圏（最短に近い）', { c: C.cy, fs: 12, b: 1 }) + T(98, 266, '向きは中ほどの経線で測る', { c: C.gr, fs: 12 });
      // right: meridians parallel, parallels spread toward the pole
      for (let i = 0; i < 6; i++) s += L(216 + 34 * i, top, 216 + 34 * i, bot, C.mut, 1);
      for (const y of [56, 116, 168, 212]) s += L(210, y, 392, y, C.cy, 1);
      s += A(226, 200, 382, 80, C.am, 2.5);
      s += `<path d="M226 200 Q 292 64 382 80" stroke="${C.cy}" stroke-width="2.5" fill="none" stroke-dasharray="6 4"/>`;
      s += T(220, 216, 'A', { c: C.am, fs: 13, b: 1 }) + T(388, 74, 'B', { c: C.am, fs: 13, b: 1, a: 'end' });
      s += T(302, 246, '直線 ＝ 航程線（向きが一定）', { c: C.am, fs: 12, b: 1 }) + T(302, 266, '点線 ＝ 大圏（最短）は曲線', { c: C.cy, fs: 12 });
      s += NFN(392, 294) + T(8, 294, '↑ 上が北', { c: C.mut, fs: 12, a: 'start' });
      return svg(400, 304, s, '図：同じ 2 点 A・B を、2 つの投影法の図に描いたもの。ランベルト正角円錐図法では直線が大圏にとても近く、メルカトル図法では直線が航程線になります。メルカトル図法の緯線の間隔は、上（高緯度）ほど広くなります（模式図）');
    },
    // ---------------------------------------------------------------- navb.north — ch08-fig8-3 redrawn
    navbNorths() {
      const VAR = FL.physics.MAGVAR_W, DEV = 2, O = [110, 236];
      const tip = (d, len) => [O[0] + len * Math.sin(d * DEG), O[1] - len * Math.cos(d * DEG)];
      const dVar = -24, dCn = -16;                 // drawn angles (exaggerated): magnetic north 24° left, compass north 8° right of it
      const tn = tip(0, 170), mn = tip(dVar, 160), cn = tip(dCn, 140);
      let s = A(O[0], O[1], tn[0], tn[1], C.ink, 2.5) + A(O[0], O[1], mn[0].toFixed(1), mn[1].toFixed(1), C.cy, 2.5) + A(O[0], O[1], cn[0].toFixed(1), cn[1].toFixed(1), C.vi, 2.5);
      s += T(tn[0], tn[1] - 10, '真北', { c: C.ink, fs: 13, b: 1 }) + T(36, 82, '磁北', { c: C.cy, fs: 13, b: 1 }) + T(84, 118, 'コンパスの北', { c: C.vi, fs: 12, b: 1, a: 'start', halo: 1 });
      s += arcDir(O[0], O[1], 150, dVar, 0, C.am, 2) + T(58, 60, `偏差 ${VAR}°W`, { c: C.am, fs: 12, b: 1 });
      s += arcDir(O[0], O[1], 110, dVar, dCn, C.rd, 2) + T(56, 150, `自差 ${DEV}°E`, { c: C.rd, fs: 12, b: 1, a: 'end', halo: 1 });
      s += A(O[0], O[1], 222, O[1], C.gr, 3) + T(166, O[1] + 20, '機首の向き', { c: C.gr, fs: 12, b: 1 });
      s += arcDir(O[0], O[1], 40, 0, 90, C.gr, 1.5) + T(O[0] + 34, O[1] - 32, '090°', { c: C.gr, fs: 12, a: 'start', halo: 1 });
      // the chain at the right
      const bx = 238, bw = 154, rows = [['TH', 90, '真北から測る'], ['MH', 90 + VAR, '磁北から測る'], ['CH', 90 + VAR - DEV, 'コンパスで合わせる']];
      rows.forEach(([n, v, sub], i) => {
        const y = 30 + i * 74;
        s += BOX(bx, y, bw, 46, i === 0 ? C.ink : i === 1 ? C.cy : C.vi, `${n} ${pad3(v)}°`, [sub], { fs: 14, ty: 20, ly: 38 });
        if (i < 2) s += A(bx + bw / 2, y + 47, bx + bw / 2, y + 72, C.mut, 2) + T(bx + bw / 2 - 8, y + 64, i === 0 ? `＋${VAR}°（W は足す）` : `−${DEV}°（E は引く）`, { c: i === 0 ? C.am : C.rd, fs: 12, b: 1, a: 'end' });
      });
      s += T(315, 270, '角度は大きく描いています', { c: C.mut, fs: 12 });
      return svg(400, 284, s, `図：3 つの北と、機首の向きの直し方。真北から 090° の向きは、磁北からは ${pad3(90 + VAR)}°、コンパスでは ${pad3(90 + VAR - DEV)}° です（偏差 ${VAR}°W はこの教材の値、自差 ${DEV}°E は例。コンパスの北が磁北の東にあるので E。真 → 磁 → コンパスでは W は足し、E は引く）`);
    },
    // ---------------------------------------------------------------- navb.wind (1) — ch08-fig8-5 and 8-6 redrawn, to scale
    navbWindFix() {
      const k = 2.3, tas = 100, ws = 20, wca = Math.asin(ws / tas) / DEG, gsFix = tas * Math.cos(wca * DEG), gsNo = Math.hypot(tas, ws), drift = Math.atan2(ws, tas) / DEG;
      let s = T(8, 18, 'A　機首を 090° に向けたまま（修正しない）', { c: C.ink, fs: 12, b: 1, a: 'start' });
      s += A(384, 48, 384, 20, C.mut, 2) + T(384, 62, '北', { c: C.mut, fs: 12 });
      // A: heading east, the wind blows the air south
      const OA = [24, 70], HA = [OA[0] + tas * k, OA[1]], GA = [HA[0], HA[1] + ws * k];
      s += A(OA[0], OA[1], HA[0], HA[1], C.cy, 3) + A(HA[0], HA[1], GA[0], GA[1], C.am, 3) + A(OA[0], OA[1], GA[0], GA[1], C.gr, 3);
      s += T(140, OA[1] - 10, `TAS ${tas} kt・機首 090°`, { c: C.cy, fs: 12, b: 1 });
      s += TL(HA[0] + 10, HA[1] + 20, [`風 360°/${ws} kt`, '（北から）'], { c: C.am, fs: 12, b: 1, a: 'start', lh: 15 });
      s += arcDir(OA[0], OA[1], 64, 90, 90 + drift, C.rd, 2) + T(30, 104, `流される角 約 ${Math.round(drift)}°`, { c: C.rd, fs: 12, b: 1, a: 'start' });
      s += T(160, 136, `航跡 約 ${pad3(90 + drift)}°・GS 約 ${Math.round(gsNo)} kt`, { c: C.gr, fs: 12, b: 1 });
      s += T(200, 160, '東へ進みたいのに、南へ流される', { c: C.mut, fs: 12 });
      s += L(8, 174, 392, 174, C.grid, 1);
      // B: heading into the wind keeps the course 090°
      s += T(8, 196, 'B　機首を風上へ向ける（航路 090° を保つ）', { c: C.ink, fs: 12, b: 1, a: 'start' });
      const OB = [24, 306], HB = [OB[0] + tas * k * Math.cos(wca * DEG), OB[1] - tas * k * Math.sin(wca * DEG)], GB = [HB[0], OB[1]];
      s += L(OB[0], OB[1], 392, OB[1], C.mut, 1.2, '5 4') + T(390, OB[1] - 8, '航路 090°', { c: C.mut, fs: 12, a: 'end' });
      s += A(OB[0], OB[1], HB[0].toFixed(1), HB[1].toFixed(1), C.cy, 3) + A(HB[0].toFixed(1), HB[1].toFixed(1), GB[0].toFixed(1), GB[1], C.am, 3) + A(OB[0], OB[1], GB[0].toFixed(1), GB[1], C.gr, 3);
      s += T(170, 244, `TAS ${tas} kt・機首 約 ${(90 - wca).toFixed(1).padStart(5, '0')}°`, { c: C.cy, fs: 12, b: 1 });
      s += T(HB[0] + 10, 282, `風 360°/${ws} kt`, { c: C.am, fs: 12, b: 1, a: 'start' });
      s += arcDir(OB[0], OB[1], 74, 90 - wca, 90, C.rd, 2) + T(30, 274, `風上へ 約 ${wca.toFixed(1)}°`, { c: C.rd, fs: 12, b: 1, a: 'start' });
      s += T(140, 326, `GS 約 ${Math.round(gsFix)} kt（東へ）`, { c: C.gr, fs: 12, b: 1 });
      s += T(200, 350, `真横からの ${ws} kt を TAS から引いた ${tas - ws} kt ではない`, { c: C.mut, fs: 12 });
      return svg(400, 360, s, `図：同じ北からの風 ${ws} kt で、A は機首を 090° に向けたまま飛んだとき、B は機首を風上へ向けて東向きの線を保ったときの速度の矢印です（縮尺どおり。水色は空気に対する速度、黄色は風、緑は地面に対する速度）`);
    },
    // ---------------------------------------------------------------- navb.wind (2) — the wind split along and across the course
    navbComponents() {
      const wd = 30, ws = 15, tc = 90, k = 8, th = (tc - wd) * DEG, head = ws * Math.cos(th), cross = ws * Math.sin(th);
      const W0 = [262, 32], W1 = [W0[0] + ws * k * Math.sin((wd + 180) * DEG), W0[1] - ws * k * Math.cos((wd + 180) * DEG)];
      let s = A(30, 52, 30, 22, C.mut, 2) + T(30, 66, '北', { c: C.mut, fs: 12 });
      s += A(30, 170, 372, 170, C.gr, 3) + T(372, 160, `航路 ${pad3(tc)}°（進む向き）`, { c: C.gr, fs: 12, b: 1, a: 'end' });
      s += A(W0[0], W0[1], W1[0].toFixed(1), W1[1].toFixed(1), C.am, 3);
      s += A(W0[0], W0[1], W0[0] - head * k, W0[1], C.rd, 2.5, '5 3') + A(W0[0] - head * k, W0[1], W1[0].toFixed(1), W1[1].toFixed(1), C.cy, 2.5, '5 3');
      s += T(W0[0] - head * k / 2, W0[1] - 10, `向かい風成分 ${head.toFixed(1)} kt`, { c: C.rd, fs: 12, b: 1 });
      s += T(W0[0] - head * k - 8, 92, `横風成分 約 ${Math.round(cross)} kt`, { c: C.cy, fs: 12, b: 1, a: 'end' });
      s += T(W0[0] - 12, 100, `風 ${pad3(wd)}°/${ws} kt`, { c: C.am, fs: 12, b: 1, a: 'start', halo: 1 });
      s += T(200, 200, `風と航路の角度 θ ＝ ${pad3(tc)}° − ${pad3(wd)}° ＝ ${tc - wd}°`, { c: C.ink, fs: 12 });
      s += T(200, 220, `${ws} × cos ${tc - wd}° ＝ ${head.toFixed(1)} kt・${ws} × sin ${tc - wd}° ≈ ${Math.round(cross)} kt`, { c: C.ink, fs: 12 });
      return svg(400, 232, s, `図：風 ${pad3(wd)}°/${ws} kt を、航路 ${pad3(tc)}° に沿う向かい風成分と、航路を横切る横風成分に分けたもの（縮尺どおり）。風の矢印は、風が流れて行く向きに描きます`);
    },
    // ---------------------------------------------------------------- navb.wind (3) — REDRAWN under its own name: FIG.windTriangle
    // (book-figs.js; nav.plan uses it too). The same triangle; W18 and revise-navb named the boxes TC・TH・MH・CH, wrote the steps
    // as「偏差 6°W ＋6°」(MAGVAR_W)「自差 2°W ＋2°」, added the MC line, and the caption uses FL.terms' official name「風力三角形」(wind-triangle).
    // nav.plan's text reads the same way (TC → TH → MH → CH, W is added, MC ＝ TC ＋ variation): checked when it was registered (R2B).
    windTriangle() {
      // the wind triangle drawn to scale for the wca calculator's default case (true course 090°, TAS 105 kt, wind 030° / 15 kt), and
      // the chain from true course to compass heading with the course's variation (MAGVAR_W) and an example deviation of 2°W (added, like a west variation)
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
      const vals = [['真航路', 'TC', tc], ['真針路', 'TH', th], ['磁針路', 'MH', th + VAR], ['コンパス針路', 'CH', th + VAR + dev]], steps = [`風 −${Math.round(Math.abs(wca))}°`, `偏差 ${VAR}°W ＋${VAR}°`, `自差 ${dev}°W ＋${dev}°`];
      vals.forEach(([n, ab, v], i) => { const x = 4 + i * 100; s += `<rect x="${x}" y="182" width="86" height="50" rx="8" fill="${C.cy}" fill-opacity="0.1" stroke="${C.cy}"/>` + T(x + 43, 202, n, { c: C.ink, fs: 12 }) + T(x + 43, 222, `${ab} ${String(Math.round(v)).padStart(3, '0')}°`, { c: C.ink, b: 1, fs: 14 }); if (i < 3) s += A(x + 88, 207, x + 102, 207, C.ink, 2) + T(x + 93, 250, steps[i], { c: C.am, b: 1, fs: 12 }); });
      s += T(200, 276, `磁航路 MC ＝ 真航路 ＋ 偏差 ＝ ${String(tc + VAR).padStart(3, '0')}°（米国の VFR の巡航高度に使う）`, { c: C.mut, fs: 12 });
      return svg(400, 288, s, `図：風力三角形（真航路 ${String(tc).padStart(3, '0')}°・真対気速度 ${tas} kt・風 ${String(wd).padStart(3, '0')}°/${ws} kt の例を縮尺どおりに描いたもの）と、真航路からコンパス針路までの計算の順番。偏差の ${VAR}°W はこの教材の値、自差の ${dev}°W は例です（真 → 磁 → コンパスでは、偏差も自差も W は足し、E は引く）`);
    },
    // ---------------------------------------------------------------- navb.calc — time and fuel on one leg
    navbTimeFuel() {
      const dist = 60, ff = 9.0, rows = [[90, C.cy], [72, C.am]], m = 4;   // m: px per minute
      let s = L(40, 48, 360, 48, C.ink, 2.5);
      for (let i = 0; i <= dist / 10; i++) { const x = 40 + i * (320 / (dist / 10)); s += L(x, 42, x, 54, C.ink, 1.5); }
      s += T(40, 34, 'A', { c: C.ink, fs: 13, b: 1 }) + T(360, 34, 'B', { c: C.ink, fs: 13, b: 1 }) + T(200, 34, `区間 ${dist} NM`, { c: C.ink, fs: 12, b: 1 });
      s += T(80, 72, '帯の長さ ＝ かかる時間', { c: C.mut, fs: 12, a: 'start' });
      rows.forEach(([gs, c], i) => {
        const y = 86 + i * 36, min = dist / gs * 60, gal = ff * min / 60;
        s += T(8, y + 5, `GS ${gs} kt`, { c, fs: 12, b: 1, a: 'start' });
        s += `<rect x="80" y="${y - 9}" width="${min * m}" height="16" rx="4" fill="${c}" fill-opacity="0.35" stroke="${c}"/>`;
        s += T(80 + min * m + 8, y + 5, `${min} 分 → ${gal.toFixed(1)} gal`, { c, fs: 12, b: 1, a: 'start' });
      });
      s += BOX(8, 146, 188, 60, C.cy, '時間（分）', ['距離（NM）÷ GS（kt）× 60'], { fs: 13, ty: 20, ly: 42 });
      s += BOX(204, 146, 188, 60, C.am, '区間の燃料（gal）', ['燃料消費率 × 時間（分）÷ 60'], { fs: 13, ty: 20, ly: 42 });
      s += T(200, 232, '小数の時間は 60 を掛けて分に', { c: C.ink, fs: 12, b: 1 });
      [['0.5 時間 ＝ 30 分', 68], ['0.3 時間 ＝ 18 分', 200], ['0.67 時間 ≈ 40 分', 332]].forEach(([t, x]) => { s += `<rect x="${x - 62}" y="242" width="124" height="26" rx="13" fill="${C.vi}" fill-opacity="0.15" stroke="${C.vi}"/>` + T(x, 259, t, { c: C.ink, fs: 12 }); });
      s += T(200, 290, `燃料消費率 ${ff.toFixed(1)} gal/h は例題の値`, { c: C.mut, fs: 12 });
      return svg(400, 300, s, `図：同じ ${dist} NM の区間でも、GS が ${rows[0][0]} kt から ${rows[1][0]} kt に下がると、時間は 40 分から 50 分に延び、燃料も増えます（帯の長さは時間。燃料消費率 ${ff.toFixed(1)} gal/h の例題）`);
    },
  });
  }
  // ---- the figures of Part 1's chapter 'wx' (R2: drafts/wx-figs.js by W17 and revise-wx, registered in R2B); redrawn under its
  // name (the old function removed above): tafTimeline (UTC, EDT and JST).
  {
  const CLOUD = '#dfe6ee', SEA = '#1d4a7a', LAND = '#3a3326', ROCK = '#5a4a38';
  const A = (x1, y1, x2, y2, c, w = 3, dash = '') => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w, dash) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const BOX = (x, y, w, h, c, title = '', lines = [], o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${o.fill || c}" fill-opacity="${o.fill ? 1 : 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`
    + (title ? T(x + w / 2, y + (o.ty || 20), title, { c: o.tc || c, b: 1, fs: o.fs || 13 }) : '') + (lines.length ? TL(x + w / 2, y + (o.ly || (title ? 38 : 20)), lines, { c: o.lc || C.ink, fs: o.lfs || 12, lh: o.lh }) : '');
  // a small cumulus (x: centre, y: base, k: scale)
  const cu = (x, y, k = 1, op = 0.85) => `<path d="M${x - 22 * k} ${y} Q ${x - 26 * k} ${y - 14 * k} ${x - 12 * k} ${y - 16 * k} Q ${x - 8 * k} ${y - 30 * k} ${x + 6 * k} ${y - 26 * k} Q ${x + 20 * k} ${y - 30 * k} ${x + 20 * k} ${y - 14 * k} Q ${x + 28 * k} ${y - 10 * k} ${x + 22 * k} ${y} Z" fill="${CLOUD}" fill-opacity="${op}"/>`;
  const fmt = n => Number(n).toLocaleString('en-US');

  Object.assign(FIG, {
    // ---------------------------------------------------------------- wx.wind (1) — ch07-fig7-2 redrawn
    wxWind() {
      const panel = (y0, title, surface) => {
        let s = `<rect x="8" y="${y0}" width="384" height="128" rx="10" fill="none" stroke="${C.grid}"/>` + T(18, y0 + 20, title, { c: C.ink, b: 1, a: 'start', fs: 13 });
        for (const [dy, lab] of [[40, '気圧が高い側（H）'], [76, ''], [112, '気圧が低い側（L）']]) {
          s += L(20, y0 + dy, 380, y0 + dy, C.mut, 1.2, '6 4');
          if (lab) s += T(374, y0 + dy - 5, lab, { c: dy === 40 ? C.am : C.cy, a: 'end', fs: 12, halo: 1 });
        }
        const cx = 200, cy = y0 + 76;
        if (!surface) {
          s += A(cx + 70, cy, cx - 70, cy, C.gr, 3.5) + T(cx - 78, cy + 4, '風', { c: C.gr, b: 1, a: 'end', fs: 13, halo: 1 });
          s += A(cx, cy - 4, cx, cy + 30, C.rd, 2.5) + T(cx + 8, cy + 26, '気圧傾度力', { c: C.rd, a: 'start', fs: 12, halo: 1 });
          s += A(cx, cy - 4, cx, cy - 30, C.vi, 2.5) + T(cx + 8, cy - 18, 'コリオリの力', { c: C.vi, a: 'start', fs: 12, halo: 1 });
        } else {
          const ang = 30 * Math.PI / 180, len = 74, ex = cx - len * Math.cos(ang), ey = cy + len * Math.sin(ang);
          s += A(cx + 40 * Math.cos(ang), cy - 40 * Math.sin(ang), ex, ey, C.gr, 3.5) + T(ex - 8, ey + 4, '風', { c: C.gr, b: 1, a: 'end', fs: 13, halo: 1 });
          s += A(cx, cy, cx, cy + 32, C.rd, 2.5) + T(cx + 8, cy + 30, '気圧傾度力', { c: C.rd, a: 'start', fs: 12, halo: 1 });
          s += A(cx, cy, cx - 13, cy - 22, C.vi, 2.5) + T(cx - 16, cy - 22, 'コリオリの力', { c: C.vi, a: 'end', fs: 12, halo: 1 });
          s += A(cx, cy, cx + 22, cy - 13, C.am, 2.5) + T(cx + 26, cy - 14, '摩擦', { c: C.am, a: 'start', fs: 12, halo: 1 });
        }
        return s;
      };
      const s = panel(6, '上空（摩擦が効かない）：等圧線に沿って吹く', false) + panel(142, '地面の近く（摩擦あり）：低い側へ横切る', true)
        + T(200, 290, '北半球。点線は等圧線。風下を向くと、高い側が右', { c: C.mut, fs: 12 });
      return svg(400, 300, s, '図：風を決める力（北半球の模式図）。上空では、気圧の高い側から低い側へ押す気圧傾度力と、風の向きの右へ曲げるコリオリの力がつり合い、風は等圧線に沿って吹きます。地面の近くでは摩擦で風が弱まり、風は等圧線を低い側へ横切ります');
    },
    // ---------------------------------------------------------------- wx.wind (2) — ch07-fig7-3 redrawn
    wxLocalWind() {
      const W = 188, H = 128;
      const panel = (x0, y0, title, body) => `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" rx="9" fill="none" stroke="${C.grid}"/>` + T(x0 + 10, y0 + 19, title, { c: C.ink, b: 1, a: 'start', fs: 12 }) + body;
      // sea breeze (day)
      let a = `<rect x="8" y="${6 + 100}" width="80" height="20" fill="${SEA}"/><rect x="88" y="${6 + 100}" width="104" height="20" fill="${LAND}"/>`;
      a += T(48, 6 + 94, '海（冷たい）', { c: C.cy, fs: 12 }) + T(140, 6 + 94, '陸（暖かい）', { c: C.am, fs: 12 });
      a += A(30, 6 + 80, 110, 6 + 80, C.cy, 3) + A(150, 6 + 50, 150, 6 + 32, C.am, 2) + A(110, 6 + 32, 40, 6 + 32, C.mut, 1.5) + cu(158, 6 + 34, 0.7);
      let b = `<rect x="204" y="${6 + 100}" width="80" height="20" fill="${SEA}"/><rect x="284" y="${6 + 100}" width="104" height="20" fill="${LAND}"/>`;
      b += T(244, 6 + 94, '海（暖かい）', { c: C.am, fs: 12 }) + T(336, 6 + 94, '陸（冷たい）', { c: C.cy, fs: 12 });
      b += A(330, 6 + 80, 252, 6 + 80, C.cy, 2.2) + A(236, 6 + 50, 236, 6 + 32, C.am, 2) + A(262, 6 + 32, 330, 6 + 32, C.mut, 1.5);
      // valley breeze (day) and mountain breeze (night)
      const vly = x0 => `<path d="M${x0} ${140 + 48} L${x0 + 74} ${140 + 108} L${x0 + 114} ${140 + 108} L${x0 + 188} ${140 + 48} L${x0 + 188} ${140 + 126} L${x0} ${140 + 126} Z" fill="${ROCK}"/>`;
      let c = vly(8) + A(82, 140 + 100, 36, 140 + 64, C.am, 2.6) + A(130, 140 + 100, 176, 140 + 64, C.am, 2.6) + cu(30, 140 + 44, 0.6) + cu(170, 140 + 44, 0.6) + T(102, 140 + 122, '谷', { c: C.ink, fs: 12 });
      let d = vly(204) + A(232, 140 + 64, 276, 140 + 100, C.cy, 2.6) + A(372, 140 + 64, 328, 140 + 100, C.cy, 2.6) + T(298, 140 + 122, '谷', { c: C.ink, fs: 12 });
      const s = panel(4, 6, '昼：海風（海 → 陸）', a) + panel(200, 6, '夜：陸風（陸 → 海）', b) + panel(4, 140, '昼：谷風（斜面を上る）', c) + panel(200, 140, '夜：山風（斜面を下りる）', d)
        + T(200, 290, '広い範囲の風が弱い日にはっきり現れる', { c: C.mut, fs: 12 });
      return svg(400, 300, s, '図：局地風の 4 つの型（模式図）。昼は暖まった陸や斜面へ、夜は冷えた陸や斜面から風が吹きます。陸風は海風より弱く、広い範囲の風が強い日にははっきりしません');
    },
    // ---------------------------------------------------------------- wx.stab (1) — ch07-fig7-4 redrawn
    wxParcel() {
      const f = frame(400, 300, 0, 35, 0, 9, [0, 10, 20, 30], [0, 2, 4, 6, 8], '温度（℃）', '高さ（1,000 ft）', { l: 50, r: 14, t: 14, b: 40 });
      const T0 = 30, D0 = 21, lcl = (T0 - D0) / 2.5, tl = T0 - 3 * lcl, env = h => T0 - 2.5 * h, parcel = h => h <= lcl ? T0 - 3 * h : tl - 2 * (h - lcl), lfc = lcl + (env(lcl) - tl) / 0.5;
      let s = f.s;
      // shaded: below the level of free convection the parcel is colder (blue, returns); above it warmer (red: the CAPE area)
      s += `<path d="M${f.X(T0)} ${f.Y(0)} L${f.X(tl).toFixed(1)} ${f.Y(lcl).toFixed(1)} L${f.X(env(lfc)).toFixed(1)} ${f.Y(lfc).toFixed(1)} Z" fill="${C.cy}" fill-opacity="0.22"/>`;
      s += `<path d="M${f.X(env(lfc)).toFixed(1)} ${f.Y(lfc).toFixed(1)} L${f.X(parcel(9)).toFixed(1)} ${f.Y(9).toFixed(1)} L${f.X(env(9)).toFixed(1)} ${f.Y(9).toFixed(1)} Z" fill="${C.rd}" fill-opacity="0.8"/>`;
      s += P([[f.X(env(0)), f.Y(0)], [f.X(env(9)), f.Y(9)]], C.am, 3) + T(f.X(env(8.6)) + 6, f.Y(8.6), '周りの空気', { c: C.am, b: 1, a: 'start', fs: 12, halo: 1 });
      s += P([[f.X(T0), f.Y(0)], [f.X(tl), f.Y(lcl)]], C.cy, 3) + P([[f.X(tl), f.Y(lcl)], [f.X(parcel(9)), f.Y(9)]], C.cy, 3, 'none', '7 4');
      s += P([[f.X(D0), f.Y(0)], [f.X(tl), f.Y(lcl)]], C.gr, 2);
      s += L(f.X(0), f.Y(lcl), f.X(35), f.Y(lcl), C.ink, 1, '4 4') + T(f.X(1), f.Y(lcl) - 6, `雲の底（${fmt(lcl * 1000)} ft）`, { c: C.ink, a: 'start', fs: 12, halo: 1 });
      s += L(f.X(0), f.Y(lfc), f.X(35), f.Y(lfc), C.rd, 1, '4 4') + T(f.X(1), f.Y(lfc) - 6, `ここより上は空気塊が暖かい（${fmt(lfc * 1000)} ft）`, { c: C.rd, a: 'start', fs: 12, halo: 1 });
      s += T(f.X(D0) - 6, f.Y(0) - 8, `露点 ${D0}℃`, { c: C.gr, a: 'end', fs: 12, halo: 1 }) + T(f.X(T0) + 4, f.Y(0) - 8, `${T0}℃`, { c: C.cy, a: 'start', fs: 12, halo: 1 });
      s += TL(f.X(23), f.Y(5.6), ['空気塊：雲の外は', '1,000 ft で 3℃', '雲の中は 2℃（点線）'], { c: C.cy, a: 'start', fs: 12, lh: 15, halo: 1 });
      s += TL(f.X(1), f.Y(5.6), ['周りの空気は', '1,000 ft で 2.5℃'], { c: C.am, a: 'start', fs: 12, lh: 15, halo: 1 });
      return svg(400, 300, s, `図：断熱図を簡単にしたもの（気温と高さの図。計算演習と同じ仮の日）。持ち上げた空気塊の線（青）と、周りの空気の線（橙）を比べます。雲の底は ${fmt(lcl * 1000)} ft です。約 ${fmt(lfc * 1000)} ft までは空気塊のほうが冷たいので戻ろうとし（安定、青く塗った所）、それより上では暖かいので自分で上がります（不安定）。その上で 2 本の線にはさまれた部分（赤）の面積が CAPE です。条件付き不安定の例です`);
    },
    // ---------------------------------------------------------------- wx.turb (1) — ch07-fig7-9 redrawn
    wxMountainWave() {
      const g = 236, ridge = 118, wl = 128;   // the ground, the ridge's x, the wavelength drawn
      let s = `<path d="M0 ${g} L60 ${g} L${ridge} ${g - 92} L176 ${g} L400 ${g} L400 ${g + 24} L0 ${g + 24} Z" fill="${ROCK}"/>`;
      s += A(8, 120, 64, 120, C.cy, 3) + A(8, 82, 64, 82, C.cy, 3) + T(10, 70, '強い風', { c: C.cy, b: 1, a: 'start', fs: 12 });
      // streamlines: lifted over the ridge (a crest over it), then waves downwind that slowly die out
      const lift = (x, amp) => x < ridge ? amp * Math.max(0, (x - 66) / (ridge - 66)) : amp * Math.cos(2 * Math.PI * (x - ridge) / wl) * Math.exp(-(x - ridge) / 420);
      for (const [base, amp] of [[124, 22], [86, 24], [50, 14]]) {
        const pts = [];
        for (let x = 70; x <= 396; x += 4) pts.push([x, base - lift(x, amp)]);
        s += P(pts, C.mut, 1.4);
      }
      const crest = ridge + wl, crest2 = ridge + 2 * wl;
      s += `<ellipse cx="${ridge}" cy="${g - 100}" rx="26" ry="9" fill="${CLOUD}" fill-opacity="0.85"/>` + T(ridge, g - 116, '笠雲', { c: C.ink, fs: 12, halo: 1 });
      for (const [x, y] of [[crest, 86 - 24 * Math.exp(-wl / 420) - 2], [crest2, 86 - 24 * Math.exp(-2 * wl / 420) - 2]]) s += `<ellipse cx="${x}" cy="${y.toFixed(1)}" rx="${x > 360 ? 20 : 28}" ry="7" fill="${CLOUD}" fill-opacity="0.8"/>`;
      s += T(crest + 64, 40, 'レンズ雲（波の山）', { c: C.ink, fs: 12, halo: 1 });
      // the rotor under the first crest, near ridge level
      const rx = crest, ry = g - 66;
      s += `<ellipse cx="${rx}" cy="${ry}" rx="24" ry="15" fill="none" stroke="${C.rd}" stroke-width="2.4"/>` + `<path d="M${rx + 6} ${ry - 15} l-10 -5 l0 10 Z" fill="${C.rd}"/>`;
      s += cu(rx, ry - 18, 0.55, 0.5);
      s += TL(rx + 30, ry + 2, ['ローター', '強い乱気流'], { c: C.rd, b: 1, a: 'start', fs: 12, lh: 15, halo: 1 });
      s += A(150, g - 70, 166, g - 34, C.am, 2.2) + T(172, g - 20, '下降気流', { c: C.am, a: 'start', fs: 12, halo: 1 });
      s += T(392, g + 17, '模式図（高さと波の数は縮尺どおりでない）', { c: C.mut, a: 'end', fs: 12 });
      s += T(10, 160, '安定な空気', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 262, s, '図：山岳波（模式図）。安定な空気が強い風で山を越えると、風下に波ができます。湿り気があれば、山頂に笠雲、波の山にレンズ雲ができ、尾根の高さのあたりのローターには強い乱気流があります。乾いていると雲はできません');
    },
    // ---------------------------------------------------------------- wx.ice (1) — ch07-fig7-10 redrawn
    wxIcing() {
      let s = BOX(8, 8, 150, 76, C.cy, '目に見える水分', ['雲・雨・霧雨', '（過冷却水滴）'], { fs: 12 }) + T(171, 51, '＋', { c: C.ink, b: 1, fs: 16 });
      s += BOX(184, 8, 208, 76, C.am, '0℃ より冷たい機体の表面', ['ふつうは氷点下の空気の中', '冷えた機体は 0℃ 少し上でも'], { fs: 12 });
      s += A(200, 88, 200, 104, C.ink, 2) + BOX(110, 108, 180, 30, C.rd, '過冷却水滴が当たって凍る', [], { fs: 12, ty: 20 });
      s += T(200, 156, '空気の流れ →', { c: C.mut, fs: 12 });
      // two leading edges
      const edge = (x, y) => `<path d="M${x} ${y} C ${x - 4} ${y - 22} ${x + 30} ${y - 30} ${x + 120} ${y - 22} L${x + 150} ${y - 16} L${x + 150} ${y + 6} L${x + 120} ${y + 10} C ${x + 30} ${y + 18} ${x - 4} ${y + 14} ${x} ${y} Z" fill="#9fb3c8"/>`;
      s += edge(30, 196) + `<path d="M30 187 C 13 183 11 203 30 207 C 22 201 20 193 30 187 Z" fill="#f2f6fa"/><path d="M28 190 L5 196 L28 202 Z" fill="#f2f6fa"/>`;
      s += edge(226, 196) + `<path d="M232 176 L214 168 L224 182 Z M232 216 L214 224 L224 210 Z" fill="#cfe8ff" fill-opacity="0.9"/><path d="M226 182 C 218 190 218 202 226 210" stroke="#cfe8ff" stroke-width="5" fill="none"/>`;
      s += TL(96, 232, ['rime ice（白く粗い）', '小さな水滴がすぐ凍る', '前へ育つ'], { c: C.ink, fs: 12, lh: 15 }) + TL(292, 232, ['clear ice（透明）', '大きな水滴が流れて凍る', '角（ホーン）ができる'], { c: C.ink, fs: 12, lh: 15 });
      return svg(400, 280, s, '図：着氷に要るもの（模式図）。目に見える水分の中で、過冷却水滴が 0℃ より冷たい機体の表面に当たると凍ります。ふつうは氷点下の空気の中ですが、冷えた機体なら空気が 0℃ より少し高くても付くので、運航では雲や雨の中で外気温 +2℃ 以下なら着氷を予想します。rime ice は前へ育ち、clear ice は流れて角（ホーン）をつくり、空気の流れを大きく乱します');
    },
    // ---------------------------------------------------------------- wx.info (1) — a made-up surface analysis
    wxInfoMap() {
      let s = `<rect x="8" y="8" width="384" height="214" rx="10" fill="#0e1b2c" stroke="${C.grid}"/>`;
      // isobars around the low (L) and the high (H)
      for (const r of [28, 52, 76]) s += `<ellipse cx="146" cy="100" rx="${r * 1.35}" ry="${r}" fill="none" stroke="${C.mut}" stroke-width="1.2"/>`;
      for (const r of [24, 46]) s += `<ellipse cx="338" cy="168" rx="${r * 1.3}" ry="${r}" fill="none" stroke="${C.mut}" stroke-width="1.2"/>`;
      s += T(132, 100, 'L', { c: C.rd, b: 1, fs: 20, halo: 1 }) + T(338, 175, 'H', { c: C.bl, b: 1, fs: 20 });
      // the occluded front from the low's centre to the triple point, then the cold front (south-west) and the warm
      // front (east) from the triple point; the symbols on the side the front moves to
      const tp = [176, 124];
      s += P([[146, 100], [162, 112], tp], C.vi, 3) + `<path d="M150 104 L160 99 L158 110 Z" fill="${C.vi}"/><path d="M163 113 A6 6 0 0 1 171 119 Z" fill="${C.vi}"/>`;
      s += P([tp, [150, 152], [118, 180], [84, 206]], C.bl, 3);
      for (const [x, y] of [[164, 138], [134, 166], [100, 194]]) s += `<path d="M${x} ${y} l9 -10 l5 13 Z" fill="${C.bl}"/>`;
      s += P([tp, [214, 130], [256, 142]], C.rd, 3);
      for (const [x, y] of [[196, 127], [236, 136]]) s += `<path d="M${x - 8} ${y - 1} a8 8 0 0 1 16 2.5 Z" fill="${C.rd}"/>`;
      // stationary front (alternating red and blue)
      for (let i = 0; i < 4; i++) { const x = 250 + i * 32; s += L(x, 60, x + 32, 60, i % 2 ? C.rd : C.bl, 3); s += i % 2 ? `<path d="M${x + 10} 60 a7 7 0 0 1 12 0 Z" fill="${C.rd}"/>` : `<path d="M${x + 10} 60 l6 10 l6 -10 Z" fill="${C.bl}"/>`; }
      s += T(388, 30, '模式図（ある日の例ではない）', { c: C.mut, a: 'end', fs: 12 });
      // legend
      const leg = (x, y, c, lab) => L(x, y, x + 28, y, c, 3) + T(x + 34, y + 4, lab, { c: C.ink, a: 'start', fs: 12 });
      s += leg(14, 240, C.bl, '寒冷前線（青・三角）') + leg(206, 240, C.rd, '温暖前線（赤・半円）');
      s += leg(14, 262, C.vi, '閉塞前線（紫・両方）') + L(206, 262, 220, 262, C.rd, 3) + L(220, 262, 234, 262, C.bl, 3) + T(240, 266, '停滞前線（赤と青）', { c: C.ink, a: 'start', fs: 12 });
      s += T(200, 288, '三角と半円は前線の進む向き。細い線は等圧線', { c: C.mut, fs: 12 });
      return svg(400, 296, s, '図：地上天気図の読み方（模式図）。細い線は気圧の同じ所を結んだ等圧線、L は低気圧、H は高気圧です。寒冷前線は青い線と三角、温暖前線は赤い線と半円、閉塞前線は紫の線、停滞前線は赤と青が交互の線で描きます');
    },
    // ---------------------------------------------------------------- wx.brief (1) — ch07-fig7-1 redrawn
    wxBriefChain() {
      const cols = ['出発', '経路', '到着', '代わり'], rows = [
        ['観測', '（今）', C.cy, [['METAR'], ['PIREP', 'レーダー'], ['METAR'], ['METAR']]],
        ['予報', '（その時刻）', C.am, [['TAF', '出発の時刻'], ['GFA', 'AIRMET'], ['TAF', '着く時刻'], ['TAF', '着く時刻']]],
        ['影響', '（自分の飛行）', C.gr, [['風と', '滑走路'], ['雲と地形', '揺れ'], ['雲高・', '視程・風'], ['燃料と', '時間']]]];
      const x0 = 92, cw = 76, y0 = 36, rh = 58;
      let s = '';
      cols.forEach((c, i) => { s += T(x0 + i * cw + cw / 2, 22, c, { c: C.ink, b: 1, fs: 13 }); });
      s += A(x0 + 6, 30, x0 + 4 * cw - 6, 30, C.mut, 1.5);
      rows.forEach(([lab, sub, col, cells], r) => {
        const y = y0 + r * rh;
        s += `<rect x="6" y="${y + 4}" width="82" height="${rh - 8}" rx="8" fill="${col}" fill-opacity="0.12" stroke="${col}"/>` + T(47, y + rh / 2 - 2, lab, { c: col, b: 1, fs: 13 }) + T(47, y + rh / 2 + 15, sub, { c: col, fs: 12 });
        cells.forEach((lines, i) => { s += `<rect x="${x0 + i * cw + 3}" y="${y + 4}" width="${cw - 6}" height="${rh - 8}" rx="6" fill="none" stroke="${col}" stroke-opacity="0.6"/>` + TL(x0 + i * cw + cw / 2, y + rh / 2 - (lines.length - 1) * 8 + 4, lines, { c: C.ink, fs: 12, lh: 16 }); });
      });
      s += T(200, y0 + 3 * rh + 18, '同じ場所でも、時刻が違えば読む予報が違う', { c: C.mut, fs: 12 });
      return svg(400, y0 + 3 * rh + 28, s, '図：天気の情報を、場所と時刻に重ねて読む（模式図）。出発・経路・到着・代わりの空港ごとに、今の観測、その時刻の予報、自分の飛行への影響を分けて書き出します');
    },
    // ---------------------------------------------------------------- wx.taf (1) — book-figs.js tafTimeline, redrawn with three time scales
    tafTimeline() {
      const X = h => 46 + h * 13.5, row = 112, mono = (x, y, t, c) => `<text x="${x}" y="${y}" fill="${c}" font-size="12" font-family="ui-monospace, Menlo, Consolas, monospace">${t}</text>`;
      let s = mono(12, 20, 'TAF KSFB 141130Z 1412/1512 09010KT P6SM SCT040', C.ink) + mono(24, 38, 'TEMPO 1418/1422 3SM TSRA BKN030CB', C.am) + mono(24, 56, 'FM150200 VRB03KT P6SM SKC', C.gr);
      s += `<rect x="${X(0)}" y="${row - 28}" width="${X(14) - X(0)}" height="26" rx="4" fill="${C.cy}" fill-opacity="0.18" stroke="${C.cy}"/>` + T((X(0) + X(14)) / 2, row - 11, '東の風 10 kt・6 SM 超・SCT040', { c: C.cy, fs: 12 });
      s += `<rect x="${X(14)}" y="${row - 28}" width="${X(24) - X(14)}" height="26" rx="4" fill="${C.gr}" fill-opacity="0.18" stroke="${C.gr}"/>` + T((X(14) + X(24)) / 2, row - 11, 'FM：風が弱まり晴れ', { c: C.gr, fs: 12 });
      s += `<rect x="${X(6)}" y="${row + 2}" width="${X(10) - X(6)}" height="26" rx="4" fill="${C.am}" fill-opacity="0.25" stroke="${C.am}"/>` + T(X(10) + 6, row + 19, 'TEMPO：一時的に雷雨・3 SM', { c: C.am, b: 1, a: 'start', fs: 12 });
      s += L(X(0), row + 40, X(24), row + 40, C.mut, 1.5);
      const two = v => String(v).padStart(2, '0');
      // the clock and the day of each scale at hour h after 14 日 12Z (EDT = UTC − 4, JST = UTC + 9); the day is written
      // at the first tick and wherever it changed since the tick before
      const at = (h, off) => { const t = 12 + h + off; return { hh: ((t % 24) + 24) % 24, dd: 14 + Math.floor(t / 24) }; };
      const prev = {};
      for (let h = 0; h <= 24; h += 6) {
        s += L(X(h), row + 36, X(h), row + 44, C.mut, 1.5);
        for (const [k, off, y, c, suf] of [['z', 0, 60, C.ink, 'Z'], ['e', -4, 78, C.am, ':00'], ['j', 9, 96, C.vi, ':00']]) {
          const v = at(h, off), day = prev[k] !== v.dd ? `${v.dd}日 ` : '';
          prev[k] = v.dd;
          s += T(X(h), row + y, `${day}${two(v.hh)}${suf}`, { c, fs: 12 });
        }
      }
      s += T(200, row + 118, '上から UTC（Z）・EDT（フロリダの夏）・JST（日本）', { c: C.mut, fs: 12 });
      s += TL(12, row + 148, ['TEMPO：その時間に一時的に（1 回 1 時間未満、合わせて半分未満）', 'FM：その時刻から、天気がすっかり変わる'], { c: C.ink, a: 'start', fs: 12, lh: 17 });
      return svg(400, row + 172, s, '図：TAF を時間の帯にしたもの（架空の例）。14 日 12Z から 15 日 12Z までの予報で、14 日 18〜22Z（フロリダの夏時間で 14〜18 時、日本時間で 15 日 3〜7 時）に一時的な雷雨、15 日 02Z から晴れ');
    },
  });
  }
  // ---- the figures of Part 1's chapters 'perf' and 'wb' (R2: drafts/perfwb-figs.js by W16 and revise-perfwb, registered in R2B);
  // redrawn under their names (the old functions removed above): densityAltitude, takeoffDistance, fuelPlan, wbEnvelope,
  // wbStations. The draft's two calculators are CALC.da and CALC.wb below (ARCHER_WB gained the POH's numbers they use).
  {
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const box = (x, y, w, h, c, title, lines = [], o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`
    + T(x + w / 2, y + 19, title, { c: o.tc || c, b: 1, fs: 13 }) + (lines.length ? TL(x + w / 2, y + 37, lines, { c: C.ink, fs: 12, lh: 15 }) : '');
  const planeSide = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${-(o.pitch || 0)}) scale(${k})">`
    + `<path d="M50 -1 C48 -8 38 -11 26 -12 L14 -16 C2 -18 -10 -16 -18 -12 L-50 -5 L-50 1 L-14 6 C6 8 30 7 44 5 C49 4 51 2 50 -1 Z" fill="${PLANE}"/>`
    + `<path d="M12 -15 C4 -17 -6 -16 -14 -12 L-12 -9 L10 -9 Z" fill="${GLASS}"/><path d="M-38 -6 L-50 -27 L-57 -27 L-54 -3 Z" fill="${PLANE}"/>`
    + `<rect x="-60" y="-4" width="20" height="3.5" rx="1.5" fill="${PLANE2}"/><ellipse cx="6" cy="5" rx="19" ry="2.6" fill="${PLANE2}"/>`
    + `<path d="M2 7 L0 15 M40 5 L40 15" stroke="${PLANE2}" stroke-width="2"/><circle cx="0" cy="16" r="3.4" fill="#5b6b7e"/><circle cx="40" cy="16" r="3" fill="#5b6b7e"/>`
    + `<line x1="52" y1="-15" x2="52" y2="13" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;

  Object.assign(FIG, {
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
      const X = lb => 20 + lb / 2700 * 360, bew = ARCHER_WB ? ARCHER_WB.rows[0][1] : 1640, ramp = 2558, tow = 2550, util = 2130;
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
      const arms = ARCHER_WB ? { front: ARCHER_WB.rows[1][2], rear: ARCHER_WB.rows[2][2], fuel: ARCHER_WB.rows[3][2], bag: ARCHER_WB.rows[4][2] } : { front: 80.5, rear: 118.1, fuel: 95.0, bag: 142.8 };
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
      const env = ARCHER_WB.env, f = frame(400, 280, 80, 95, 1600, 2600, [80, 83, 86, 89, 92, 95], [1600, 1800, 2000, 2200, 2400, 2600], '重心位置（基準線から in）', '重量（lb）', { l: 56, r: 14, t: 16, b: 40 });
      const [a, b] = ARCHER_WB.example(), fa = ARCHER_WB.rows[3][2], lw = b.w - ARCHER_WB.taxiFuel - 120, c = { w: lw, cg: (b.m - (ARCHER_WB.taxiFuel + 120) * fa) / lw };
      const pt = (p, col) => `<circle cx="${f.X(p.cg).toFixed(1)}" cy="${f.Y(p.w).toFixed(1)}" r="6" fill="${col}" stroke="${C.bg}" stroke-width="1.5"/>`;
      let s = f.s + `<path d="${env.map((p, i) => (i ? 'L' : 'M') + f.X(p[0]).toFixed(1) + ' ' + f.Y(p[1]).toFixed(1)).join(' ')} Z" fill="rgba(95,212,255,.12)" stroke="${C.cy}" stroke-width="2"/>`;
      s += L(f.X(80), f.Y(ARCHER_WB.max), f.X(95), f.Y(ARCHER_WB.max), C.rd, 1.5, '6 4') + T(f.X(80) + 4, f.Y(ARCHER_WB.max) - 6, `最大離陸重量 ${ARCHER_WB.max.toLocaleString()} lb`, { c: C.rd, a: 'start', fs: 12 });
      s += T(f.X(88), f.Y(1800), '許容範囲', { c: C.cy, b: 1, fs: 13 }) + T(f.X(94.1), f.Y(1900), '後ろすぎ', { c: C.rd, fs: 12, rot: -90 }) + T(f.X(81.6), f.Y(2350), '前すぎ', { c: C.rd, fs: 12 });
      s += A(f.X(a.cg) - 6, f.Y(a.w), f.X(b.cg) + 8, f.Y(b.w), C.gr, 2) + A(f.X(b.cg), f.Y(b.w) + 7, f.X(c.cg) + 1, f.Y(c.w) - 9, C.gr, 2);
      s += pt(a, C.rd) + pt(b, C.gr) + pt(c, C.gr) + T(f.X(a.cg) - 2, f.Y(a.w) - 12, '①', { c: C.rd, b: 1, fs: 13, halo: 1 }) + T(f.X(b.cg) - 12, f.Y(b.w) - 8, '②', { c: C.gr, b: 1, fs: 13, halo: 1 }) + T(f.X(c.cg) - 14, f.Y(c.w) + 16, '③', { c: C.gr, b: 1, fs: 13, halo: 1 });
      return svg(400, 280, s, `図：Archer III の重量と重心の許容範囲（POH の値）と、計算例の 3 つの点。①後ろすぎ（${a.cg.toFixed(1)} in）→ ②後席の 1 人を前席へ（${b.cg.toFixed(1)} in）→ ③始動・地上滑走の 8 lb と燃料 20 gal を使った着陸（${c.w.toLocaleString()} lb・${c.cg.toFixed(1)} in）。① と ② はランプの重さです`);
    },
    // perf.wb — the Archer from the side over a ruler of stations: the same drawing as book-figs.js, only the heading's words
    wbStations() {
      const WB = ARCHER_WB, k = 1.2, X = st => 34 + st * k, yR = 196, arm = i => WB.rows[i][2];
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
  }
  // ---- the figures of Part 1's chapter 'inst' (R2: drafts/inst-figs.js by W15 and revise-inst, registered in R2B); redrawn under
  // their names (the old functions removed above): pitotStatic, compassErrors.
  {
  const MAG = '#ff4fd8';
  const A = (x1, y1, x2, y2, c, w = 3, dash = '') => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w, dash) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const BOX = (x, y, w, h, c, title = '', lines = [], o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${o.fill || c}" fill-opacity="${o.fill ? 1 : 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`
    + (title ? T(x + w / 2, y + (o.ty || 20), title, { c: o.tc || c, b: 1, fs: o.fs || 13 }) : '') + (lines.length ? TL(x + w / 2, y + (o.ly || (title ? 38 : 20)), lines, { c: o.lc || C.ink, fs: o.lfs || 12, lh: o.lh }) : '');
  const planeSide = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${-(o.pitch || 0)}) scale(${k})">`
    + `<path d="M50 -1 C48 -8 38 -11 26 -12 L14 -16 C2 -18 -10 -16 -18 -12 L-50 -5 L-50 1 L-14 6 C6 8 30 7 44 5 C49 4 51 2 50 -1 Z" fill="${PLANE}"/>`
    + `<path d="M12 -15 C4 -17 -6 -16 -14 -12 L-12 -9 L10 -9 Z" fill="${GLASS}"/><path d="M-38 -6 L-50 -27 L-57 -27 L-54 -3 Z" fill="${PLANE}"/>`
    + `<rect x="-60" y="-4" width="20" height="3.5" rx="1.5" fill="${PLANE2}"/><ellipse cx="6" cy="5" rx="19" ry="2.6" fill="${PLANE2}"/>`
    + `<line x1="52" y1="-15" x2="52" y2="13" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const num = (x, y, n, c = C.am) => `<circle cx="${x}" cy="${y}" r="9" fill="${C.bg}" stroke="${c}" stroke-width="1.5"/>` + T(x, y + 4, n, { c, b: 1, fs: 12 });

  Object.assign(FIG, {
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
  }
  // ---- the figures of Part 1's chapter 'sys' (R2: drafts/sys-figs.js by W14 and revise-sys, registered in R2B). New: sysAirframe,
  // sysFourStroke and the others the new sections draw; redrawn under their names (the old functions removed above):
  // fuelSystem, cockpitLayout, elecSystem, engineFlow, carbIce, positionLights.
  {
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const box = (x, y, w, h, c, t, sub, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`
    + T(x + w / 2, y + (sub ? 19 : h / 2 + 5), t, { c: o.tc || c, b: 1, fs: 13 }) + (sub ? TL(x + w / 2, y + 37, sub, { c: C.ink, fs: 12, lh: 15 }) : '');
  const planeTop = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${k})">`
    + `<path d="M-68 -8 L68 -8 L66 6 L-66 6 Z" fill="${PLANE}"/><path d="M-22 38 L22 38 L21 45 L-21 45 Z" fill="${PLANE2}"/>`
    + `<path d="M0 -50 C5 -48 7 -40 7 -28 L5 30 L2 50 L-2 50 L-5 30 L-7 -28 C-7 -40 -5 -48 0 -50 Z" fill="${PLANE}"/><path d="M-5 -26 L5 -26 L4 -14 L-4 -14 Z" fill="${GLASS}"/>`
    + `<line x1="-12" y1="-52" x2="12" y2="-52" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  Object.assign(FIG, {
    // sys.airframe — the wing's members (spars, ribs, stringers, skin) and the fuselage's (frames, stringers, skin)
    sysAirframe() {
      let s = T(12, 18, '翼の中（上から見た模式図）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      const x0 = 36, x1 = 372, LE = x => 40 + (x - x0) * 22 / (x1 - x0), TE = x => 150 - (x - x0) * 22 / (x1 - x0), at = (x, f) => LE(x) + f * (TE(x) - LE(x));
      s += `<path d="M${x0} ${LE(x0)} L${x1} ${LE(x1)} L${x1} ${TE(x1)} L${x0} ${TE(x0)} Z" fill="${PLANE}" fill-opacity="0.10" stroke="${C.mut}" stroke-width="2"/>`;
      for (const x of [76, 128, 180, 232, 284, 336]) s += L(x, LE(x).toFixed(1), x, TE(x).toFixed(1), C.cy, 2.5);
      for (const f of [0.5, 0.87]) s += L(x0, at(x0, f).toFixed(1), x1, at(x1, f).toFixed(1), C.ink, 1, '4 3');
      s += L(x0, at(x0, 0.3).toFixed(1), x1, at(x1, 0.3).toFixed(1), C.am, 6) + L(x0, at(x0, 0.72).toFixed(1), x1, at(x1, 0.72).toFixed(1), C.am, 4);
      s += T(102, (at(102, 0.3) - 6).toFixed(1), '主桁', { c: C.am, b: 1, halo: 1 }) + T(154, (at(154, 0.72) - 6).toFixed(1), '後桁', { c: C.am, b: 1, halo: 1 });
      s += T(258, (at(258, 0.5) + 14).toFixed(1), '縦通材', { c: C.ink, halo: 1 });
      s += L(232, TE(232) + 3, 232, 152, C.cy, 1) + T(232, 166, '小骨（リブ）', { c: C.cy, b: 1 });
      s += L(340, TE(340) + 3, 340, 152, C.mut, 1) + T(340, 166, '外板（skin）', { c: C.ink });
      s += T(12, 166, '← 付け根は胴体へ', { c: C.mut, a: 'start' });
      // the fuselage, from the side
      s += L(12, 180, 388, 180, C.grid, 1) + T(12, 200, '胴体の中（横から見た模式図）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      s += `<path d="M64 226 L356 226 Q372 226 372 242 L372 300 Q372 316 356 316 L64 316 Q36 316 36 271 Q36 226 64 226 Z" fill="${PLANE}" fill-opacity="0.10" stroke="${C.mut}" stroke-width="2"/>`;
      for (const y of [238, 255, 287, 304]) s += L(50, y, 364, y, C.ink, 1.2);
      for (const x of [80, 130, 180, 230, 280, 330]) s += `<path d="M${x} 228 A10 43 0 0 1 ${x} 314" stroke="${C.cy}" stroke-width="2.5" fill="none"/><path d="M${x} 228 A10 43 0 0 0 ${x} 314" stroke="${C.cy}" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>`;
      s += L(330, 227, 330, 214, C.mut, 1) + T(330, 209, '外板（skin）', { c: C.ink });
      s += L(130, 315, 120, 330, C.cy, 1) + T(110, 344, 'フレーム（frame）', { c: C.cy, b: 1 });
      s += L(250, 304, 260, 330, C.ink, 1) + T(270, 344, '縦通材（stringer）', { c: C.ink, b: 1 });
      s += T(200, 368, 'セミモノコック：外板も骨組みと一緒に力を受ける', { c: C.gr, b: 1 });
      return svg(400, 378, s, '図：翼と胴体の中の主な部材（模式図）。翼は桁・小骨・縦通材と外板で、胴体はフレーム・縦通材と外板でできています。外板も骨組みと一緒に力を受けるので、外板の傷も構造の傷です（PHAK 第 3 章）');
    },
    // sys.gear — the Archer's hydraulic brakes and the nose wheel steering (POH 7.7)
    sysGearBrake() {
      let s = box(110, 12, 180, 34, C.vi, 'ブレーキ液のタンク（共用）');
      s += box(14, 74, 170, 50, C.ink, 'トーブレーキ', ['左右のペダルの上'], { tc: C.ink }) + box(216, 74, 170, 50, C.ink, 'ハンドブレーキ', ['パーキングにもなる'], { tc: C.ink });
      s += box(14, 148, 170, 34, C.am, 'マスターシリンダー') + box(216, 148, 170, 34, C.am, 'マスターシリンダー');
      s += A(99, 124, 99, 146, C.ink, 2) + A(301, 124, 301, 146, C.ink, 2);
      s += P([[110, 29], [7, 29], [7, 165], [14, 165]], C.vi, 1.5, 'none', '4 3') + P([[290, 29], [393, 29], [393, 165], [386, 165]], C.vi, 1.5, 'none', '4 3');
      // the hydraulic lines to the two main wheels (left pedal → left wheel, right pedal → right wheel; the hand brake → both)
      s += P([[64, 182], [64, 236]], C.am, 3) + P([[150, 182], [150, 204], [336, 204], [336, 236]], C.am, 3);
      s += P([[360, 182], [360, 220], [64, 220]], C.am, 2, 'none', '6 3') + `<circle cx="64" cy="220" r="3.5" fill="${C.am}"/><circle cx="336" cy="220" r="3.5" fill="${C.am}"/>`;
      const wheel = (cx, t) => `<rect x="${cx - 16}" y="238" width="32" height="56" rx="8" fill="#141f30" stroke="${C.ink}" stroke-width="2"/>`
        + `<rect x="${cx - 3}" y="248" width="6" height="36" fill="${C.mut}"/><rect x="${cx + 3}" y="258" width="10" height="16" rx="2" fill="${C.am}"/>` + T(cx, 312, t, { c: C.ink, b: 1 });
      s += wheel(64, '左の主輪') + wheel(336, '右の主輪') + T(200, 300, '実線：ペダル　点線：ハンドブレーキ', { c: C.mut }) + T(200, 317, '紫の点線：タンクと結ぶ管', { c: C.vi });
      s += TL(200, 256, ['主輪の円盤（ディスク）を', 'キャリパーではさむ'], { c: C.am, fs: 12, lh: 16 });
      s += L(14, 326, 386, 326, C.grid, 1) + T(200, 346, '前輪：ペダルとブレーキで左右 20° まで', { c: C.cy, b: 1 }) + T(200, 364, 'シミー（前輪の振れ）を抑えるダンパー付き', { c: C.ink });
      return svg(400, 374, s, '図：Archer のブレーキと前輪（模式図）。ペダルの上のトーブレーキとハンドブレーキは、それぞれのマスターシリンダーで油の圧力を作り、主輪の円盤をはさんで止めます。ブレーキ液のタンクは 1 つを共用します（POH 7.7）');
    },
    // sys.piston — the four strokes (two turns of the crankshaft for one cycle)
    sysFourStroke() {
      // pistonY: the piston's top, from the panel's top (head at 40, bottom dead centre 86, top dead centre 50); up: moving up
      const panel = (x0, y0, title, pistonY, up, inOpen, exOpen, gas, note, spark) => {
        const cx = x0 + 94, wl = x0 + 54, wr = x0 + 134, head = y0 + 40, py = y0 + pistonY, crankY = y0 + 122;
        let s = `<rect x="${x0}" y="${y0}" width="188" height="164" rx="8" fill="none" stroke="${C.grid}" stroke-width="1.5"/>` + T(x0 + 10, y0 + 18, title, { c: C.ink, b: 1, a: 'start', fs: 13 });
        s += `<rect x="${wl}" y="${head}" width="${wr - wl}" height="${py - head}" fill="${gas}" fill-opacity="0.35"/>`;
        s += L(wl, head, wl, y0 + 110, C.ink, 3) + L(wr, head, wr, y0 + 110, C.ink, 3) + L(wl, head, x0 + 66, head, C.ink, 3) + L(x0 + 84, head, x0 + 104, head, C.ink, 3) + L(x0 + 122, head, wr, head, C.ink, 3);
        const valve = (vx, open) => { const vy = open ? head + 9 : head; return L(vx, y0 + 26, vx, vy, C.mut, 2.5) + `<path d="M${vx - 9} ${vy} L${vx + 9} ${vy} L${vx + 5} ${vy + 4} L${vx - 5} ${vy + 4} Z" fill="${C.mut}"/>`; };
        s += valve(x0 + 75, inOpen) + valve(x0 + 113, exOpen) + L(cx, y0 + 30, cx, head + 4, C.am, 2);
        s += T(x0 + 30, y0 + 38, '吸気弁', { c: C.mut }) + T(x0 + 160, y0 + 38, '排気弁', { c: C.mut });
        s += `<rect x="${wl + 3}" y="${py}" width="${wr - wl - 6}" height="12" rx="2" fill="${PLANE2}"/>`;
        const pinY = crankY + Math.max(-9, Math.min(9, (pistonY - 68) / 2));
        s += L(cx, py + 12, cx, pinY, C.mut, 3) + `<circle cx="${cx}" cy="${crankY}" r="10" fill="none" stroke="${C.mut}" stroke-width="2"/><circle cx="${cx}" cy="${pinY}" r="3" fill="${C.mut}"/>`;
        if (inOpen) s += A(x0 + 68, y0 + 22, x0 + 68, y0 + 58, C.cy, 2);          // the mixture comes in past the intake valve
        if (exOpen) s += A(x0 + 120, y0 + 58, x0 + 120, y0 + 22, C.mut, 2);       // the burnt gas goes out past the exhaust valve
        if (spark) s += `<path d="M${cx} ${head + 4} l4 6 l7 -2 l-4 6 l5 5 l-7 0 l-2 7 l-3 -7 l-7 0 l5 -5 l-4 -6 l7 2 Z" fill="${C.am}"/>`;
        s += A(x0 + 172, up ? y0 + 104 : y0 + 66, x0 + 172, up ? y0 + 70 : y0 + 100, C.gr, 2);
        return s + T(x0 + 94, y0 + 154, note, { c: C.ink });
      };
      let s = panel(8, 8, '① 吸入', 80, false, true, false, C.cy, '吸気弁が開き、混合気を吸う', false);
      s += panel(204, 8, '② 圧縮', 54, true, false, false, C.bl, '両方の弁を閉じて押し縮める', false);
      s += panel(8, 182, '③ 膨張（燃焼）', 84, false, false, false, C.am, '火花で燃え、ピストンを押す', true);
      s += panel(204, 182, '④ 排気', 66, true, false, true, C.mut, '排気弁が開き、ガスを出す', false);
      s += T(200, 364, '緑の矢印＝ピストンの動き。4 つでクランク軸は 2 回転', { c: C.gr });
      return svg(400, 372, s, '図：四行程エンジンの 4 つの行程（模式図）。吸入・圧縮・膨張・排気をくり返し、4 つの行程でクランク軸は 2 回転します。実際の弁は、ピストンがいちばん上やいちばん下に来る少し前後で開け閉めします（PHAK 第 7 章）');
    },
    // sys.eis — what each engine indication measures and where; the Archer's oil pressure bands (POH 2.9) to scale
    sysEis() {
      let s = T(12, 18, 'MFD の左の帯（EIS）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      const items = [['①', '回転（RPM）', C.gr], ['②', '油圧（OIL PSI）', C.am], ['③', '油温（OIL °F）', C.am], ['④', 'EGT（°F）', C.rd], ['⑤', '燃料消費率（GPH）', C.cy], ['⑥', '燃料の量（L・R）', C.cy]];
      items.forEach(([n, t, c], i) => { const y = 30 + i * 30; s += `<rect x="10" y="${y}" width="140" height="24" rx="5" fill="#06101c" stroke="${c}" stroke-width="1.2"/>` + T(20, y + 17, n, { c, b: 1, a: 'start' }) + T(38, y + 17, t, { c: C.ink, a: 'start' }); });
      s += T(80, 222, 'ほかに電圧・電流も', { c: C.mut });
      // the engine, from the side (propeller on the left)
      const num = (x, y, n, c) => T(x, y, n, { c, b: 1, fs: 13, halo: 1 });
      s += L(166, 82, 166, 168, C.mut, 5) + `<ellipse cx="174" cy="125" rx="8" ry="14" fill="${C.mut}"/>`;
      s += `<rect x="184" y="96" width="140" height="62" rx="8" fill="${PLANE2}" fill-opacity="0.22" stroke="${C.ink}" stroke-width="1.5"/>` + T(254, 132, 'エンジン', { c: C.ink, b: 1 });
      for (const x of [198, 262]) { s += `<rect x="${x}" y="66" width="48" height="30" rx="4" fill="${PLANE2}" fill-opacity="0.3" stroke="${C.ink}" stroke-width="1.2"/>`; for (let k = 1; k < 5; k++) s += L(x + 2, 66 + k * 6, x + 46, 66 + k * 6, C.mut, 1); }
      s += P([[286, 66], [286, 50], [388, 50]], C.mut, 4) + `<circle cx="340" cy="50" r="4" fill="${C.rd}"/>` + num(340, 38, '④', C.rd) + T(366, 70, '排気', { c: C.mut });
      s += `<circle cx="198" cy="125" r="4" fill="${C.gr}"/>` + num(206, 118, '①', C.gr);
      s += `<rect x="204" y="158" width="100" height="22" rx="5" fill="${C.am}" fill-opacity="0.25" stroke="${C.am}" stroke-width="1.2"/>` + T(254, 174, 'オイル', { c: C.am, b: 1 });
      s += `<circle cx="222" cy="180" r="4" fill="${C.am}"/><circle cx="286" cy="180" r="4" fill="${C.am}"/>` + num(222, 198, '②', C.am) + num(286, 198, '③', C.am);
      s += P([[388, 132], [324, 132]], C.cy, 3) + `<circle cx="356" cy="132" r="4" fill="${C.cy}"/>` + num(356, 120, '⑤', C.cy) + T(370, 150, '燃料', { c: C.cy });
      s += T(388, 222, '⑥ は左右のタンクの浮き', { c: C.cy, a: 'end' });
      // the Archer's oil pressure bands (POH 2.9), 0–120 psi to scale
      const X = p => 24 + p * 352 / 120, yb = 282;
      s += L(12, 236, 388, 236, C.grid, 1) + T(12, 256, '例：Archer の油圧の帯（psi。POH 2.9）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      s += `<rect x="${X(25)}" y="${yb}" width="${(X(55) - X(25)).toFixed(1)}" height="14" fill="${C.am}"/><rect x="${X(55)}" y="${yb}" width="${(X(95) - X(55)).toFixed(1)}" height="14" fill="${C.gr}"/><rect x="${X(95)}" y="${yb}" width="${(X(115) - X(95)).toFixed(1)}" height="14" fill="${C.am}"/>`;
      s += L(X(0), yb + 14, X(120), yb + 14, C.mut, 1.5);
      for (const p of [25, 115]) s += L(X(p), yb - 6, X(p), yb + 20, C.rd, 3);
      for (const p of [0, 25, 55, 95, 115]) s += T(X(p).toFixed(1), yb + 36, String(p), { c: p === 25 || p === 115 ? C.rd : C.ink, b: p === 25 || p === 115 });
      s += T(X(40).toFixed(1), yb - 6, 'アイドル', { c: C.am }) + T(X(75).toFixed(1), yb - 6, 'ふつうの範囲', { c: C.gr }) + T(X(105).toFixed(1), yb - 10, '暖機', { c: C.am });
      s += T(200, 352, '黄：注意（色が変わる）　赤：警報（点滅）', { c: C.ink });
      return svg(400, 362, s, '図：G1000 型の Archer のエンジンの表示（EIS）と、それぞれを測る場所（模式図）。下は油圧の色の帯の例です。赤い線（25 psi・115 psi）の外に出ると警報になります（POH 2.9・7.13）');
    },
    // sys.radio — how radio waves travel: ground wave (LF・MF), sky wave (HF), space wave (VHF, line of sight)
    sysRadioWaves() {
      let s = `<path d="M0 64 Q200 30 400 64 L400 92 Q200 58 0 92 Z" fill="${C.vi}" fill-opacity="0.18"/>` + T(200, 62, '電離層', { c: C.vi, b: 1 });
      s += `<path d="M0 258 Q200 214 400 258 L400 300 L0 300 Z" fill="#1d2b1f" stroke="${C.gr}" stroke-width="1.5"/>`;
      s += L(40, 248, 40, 196, C.ink, 3) + `<path d="M30 248 L40 214 L50 248" fill="none" stroke="${C.ink}" stroke-width="1.5"/>` + T(40, 274, '送信所', { c: C.ink, b: 1 });
      s += `<path d="M48 243 Q200 220 384 249" fill="none" stroke="${C.gr}" stroke-width="2.5" stroke-dasharray="7 4"/>` + T(230, 268, '地上波（LF・MF）：地面に沿う', { c: C.gr, b: 1 });
      s += P([[42, 196], [200, 78], [356, 248]], C.am, 2.5) + T(140, 118, '電離層波（HF）', { c: C.am, b: 1, halo: 1, a: 'end' });
      s += A(44, 198, 286, 150, C.cy, 2.5) + `<path d="M296 146 l14 -4 l-6 6 l8 6 l-6 0 l-6 -4 l-6 6 l-2 -2 l4 -6 Z" fill="${PLANE}"/>` + T(232, 196, '空間波（VHF）', { c: C.cy, b: 1, halo: 1 });
      s += T(388, 130, '見通しの範囲だけ', { c: C.cy, a: 'end' });
      s += T(200, 292, 'VHF の無線：118.000〜136.975 MHz・AM', { c: C.ink, b: 1 });
      return svg(400, 302, s, '図：電波の伝わり方（模式図）。低い周波数の地上波は地面に沿って、HF の電離層波は電離層で曲がって遠くまで届きます。VHF の空間波は見通しの範囲だけで、航空の無線の多くはこれを使います（FAA の整備士のハンドブック）');
    },
    // sys.fuel — redrawn under the same name: the low-wing Archer, a tank in each wing, the selector (LEFT / RIGHT /
    // OFF, no BOTH), the pumps; the sump of each tank marked (R1V's nit: the old note had no pointer)
    fuelSystem() {
      const cap = ac('pa28').fuelCap;
      let s = `<path d="M10 40 L170 40 L170 76 L10 70 Z M390 40 L230 40 L230 76 L390 70 Z" fill="${PLANE}" fill-opacity="0.2" stroke="${C.mut}"/>`;
      s += `<rect x="40" y="46" width="110" height="22" rx="4" fill="${C.bl}" fill-opacity="0.55" stroke="${C.cy}"/><rect x="250" y="46" width="110" height="22" rx="4" fill="${C.bl}" fill-opacity="0.55" stroke="${C.cy}"/>`;
      s += T(95, 61, `左タンク ${cap} US gal`, { c: C.ink, b: 1, fs: 12 }) + T(305, 61, `右タンク ${cap} US gal`, { c: C.ink, b: 1, fs: 12 }) + T(200, 26, '低翼：タンクは翼の中（重力では送れない）', { c: C.mut, fs: 12 });
      for (const x of [142, 258]) s += `<path d="M${x - 6} 72 L${x + 6} 72 L${x} 82 Z" fill="${C.rd}"/>`;
      s += T(200, 96, '▼＝各タンクの抜き取り口', { c: C.rd, fs: 12 });
      s += P([[95, 68], [95, 116], [160, 116]], C.cy, 2.5) + P([[305, 68], [305, 116], [200, 116]], C.cy, 2.5);
      s += `<circle cx="180" cy="116" r="20" fill="#13233a" stroke="${C.am}" stroke-width="2"/>` + `<line x1="180" y1="116" x2="166" y2="104" stroke="${C.am}" stroke-width="3"/>` + L(180, 136, 180, 160, C.cy, 2.5);
      s += T(206, 140, '燃料セレクター', { c: C.am, b: 1, a: 'start', fs: 12 }) + TL(206, 156, ['LEFT・RIGHT・OFF', '（BOTH はない）'], { c: C.am, a: 'start', fs: 12, lh: 15 });
      const step = (y, t, c, note) => A(180, y - 22, 180, y - 4, C.cy, 2.5) + `<rect x="96" y="${y - 4}" width="168" height="26" rx="6" fill="${c}" fill-opacity="0.12" stroke="${c}"/>` + T(180, y + 13, t, { c, b: 1, fs: 12 }) + (note ? T(270, y + 13, note, { c: C.mut, a: 'start', fs: 12 }) : '');
      s += step(198, 'ストレーナー（ろ過）', C.cy, '← 抜き取り検査') + step(246, '電動燃料ポンプ（補助）', C.gr, '← 離着陸で ON') + step(294, 'エンジン駆動の燃料ポンプ', C.ink, '') + step(342, '気化器 → エンジン', C.am, '');
      return svg(400, 376, s, `図：Archer の燃料系統（模式図）。左右の翼のタンク（使える燃料は片側 ${cap} US gal：教材値）から、セレクターで選んだ側の燃料をポンプで送ります。▼ は各タンクの下の抜き取り口です`);
    },
    // redrawn under the same name (W14): the caption names the ignition switches「点火」(the term マグネトー is
    // introduced in the text with its English, FL.terms); the drawing is the same as book-figs.js
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
      for (const x of [70, 362]) s += `<path d="M${x - 32} 214 L${x - 32} 230 L${x + 32} 230 L${x + 32} 214" stroke="${C.ink}" stroke-width="5" fill="none" stroke-linecap="round"/><line x1="${x}" y1="230" x2="${x}" y2="244" stroke="${C.ink}" stroke-width="5"/>` + T(x, 262, '操縦輪', { c: C.mut, fs: 12 });
      s += `<rect x="176" y="212" width="48" height="58" rx="6" fill="#141f30" stroke="${C.mut}"/><circle cx="190" cy="230" r="7" fill="#2a2a2a" stroke="${C.mut}"/><circle cx="210" cy="230" r="7" fill="${C.rd}"/>`;
      s += `<rect x="230" y="222" width="12" height="16" rx="2" fill="${C.am}"/>` + TL(246, 228, ['キャブレター', 'ヒーター'], { c: C.am, a: 'start', fs: 12, lh: 15 });
      s += T(200, 288, '真ん中の台：スロットル（黒）・ミクスチャー（赤）', { c: C.ink, fs: 12 });
      s += `<rect x="168" y="300" width="26" height="9" rx="3" fill="${C.gr}"/><rect x="206" y="297" width="40" height="8" rx="3" fill="${C.gr}"/>` + T(200, 326, '前席の間の床：トリムホイール・フラップレバー', { c: C.gr, b: 1, fs: 12 });
      s += `<circle cx="22" cy="346" r="8" fill="none" stroke="${C.am}" stroke-width="2"/><line x1="22" y1="346" x2="17" y2="340" stroke="${C.am}" stroke-width="2"/>` + T(36, 351, '燃料セレクター（左の壁の下）', { c: C.am, b: 1, a: 'start', fs: 12 });
      s += T(392, 372, '模式図（年式・装備で違う）', { c: C.mut, a: 'end', fs: 12 });
      return svg(400, 380, s, '図：G1000 型の計器を付けた Archer の操縦席（模式図。公開されている POH の機体の例）。スターター・マスター・燃料ポンプ・点火・灯火などのスイッチは天井のパネルにあります。年式や装備によって、スイッチや予備計器の形と位置は違います');
    },
    // redrawn under the same name (W14): the alternator is named with its official name 発電機（オルタネーター） and the
    // standby gauges as「予備の計器」(the instruments themselves are the chapter inst's); otherwise as book-figs.js
    elecSystem() {
      // what runs on electricity and what does not (the engine's ignition, the magnetic compass, the mechanical standby gauges)
      const box = (x, y, w, h, c, t, sub) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>` + T(x + w / 2, y + 18, t, { c, b: 1, fs: 13 }) + (sub ? T(x + w / 2, y + 35, sub, { c: C.ink, fs: 12 }) : '');
      let s = box(12, 14, 120, 44, C.gr, '発電機', 'オルタネーター') + box(12, 74, 120, 44, C.am, 'バッテリー', '始動・非常用');
      s += A(132, 36, 150, 66, C.gr, 2) + A(132, 96, 150, 84, C.am, 2) + box(150, 50, 72, 50, C.cy, 'マスター', 'BATT・ALTR');
      s += A(222, 75, 236, 75, C.cy, 2.5) + `<rect x="238" y="20" width="14" height="184" rx="4" fill="${C.cy}" fill-opacity="0.5"/>` + T(245, 220, 'バス', { c: C.cy, b: 1, fs: 12 });
      const loads = ['PFD・MFD', '無線', '灯火', 'ピトーヒーター', '電動燃料ポンプ'];
      loads.forEach((t, i) => { const y = 36 + i * 32; s += L(252, y, 266, y, C.cy, 1.5) + `<rect x="266" y="${y - 7}" width="10" height="14" rx="2" fill="${C.mut}"/>` + T(282, y + 4, t, { c: C.ink, a: 'start', fs: 12 }); });
      s += T(392, 220, '■＝ブレーカー', { c: C.mut, a: 'end', fs: 12 });
      // the starter: the battery's large current through the starter contactor (solenoid), only while START is held (PHAK ch. 7, POH 7.17)
      s += A(186, 100, 186, 124, C.am, 2) + box(140, 126, 92, 60, C.am, 'スターター', '') + TL(186, 162, ['接触器を通る', 'START の間だけ'], { c: C.ink, fs: 12, lh: 15 });
      s += `<rect x="12" y="236" width="376" height="66" rx="8" fill="none" stroke="${C.vi}" stroke-dasharray="5 4"/>` + T(200, 256, '電気がなくても動くもの', { c: C.vi, b: 1, fs: 13 });
      s += T(200, 276, 'エンジンの点火（マグネトー）・磁気コンパス', { c: C.ink, fs: 12 }) + T(200, 294, '機械式の予備の計器（付いている機体）', { c: C.ink, fs: 12 });
      s += box(12, 136, 120, 44, C.rd, '非常用バッテリー', 'EMERG BATT') + A(72, 180, 72, 194, C.rd, 2) + TL(72, 208, ['予備計器・PFD など', '（30 分以上）'], { c: C.rd, fs: 12, lh: 14 });
      return svg(400, 310, s, '図：Archer の電気系統（模式図）。発電機（オルタネーター）とバッテリーの電気がマスタースイッチからバスへ行き、ブレーカーを通って各装置へ届きます。スターターの大きな電流は、START スイッチを押している間だけ、接触器（ソレノイド）を通して送られます。エンジンの点火は電気系統とは別です');
    },
    // redrawn under the same name (revise-sys): the same drawing as book-figs.js; only words change — the device is
    // called 気化器 (FL.terms; reader-sys C4) and the caption no longer names FADEC before the text explains it (E6)
    engineFlow() {
      // the carbureted O-360's air, fuel and ignition (a fuel-injected IO-360 has an injection system instead of the carburetor)
      let s = '';
      const box = (x, y, w, h, c, t, sub) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>` + T(x + w / 2, y + 19, t, { c, b: 1, fs: 13 }) + (sub ? TL(x + w / 2, y + 37, sub, { c: C.ink, fs: 12, lh: 15 }) : '');
      s += box(12, 14, 120, 34, C.cy, '外の空気') + A(72, 48, 72, 66, C.cy, 2);
      s += box(12, 66, 120, 34, C.cy, 'エアフィルター') + A(72, 100, 72, 118, C.cy, 2);
      s += box(12, 118, 120, 74, C.am, '気化器', ['空気に燃料を', '混ぜる']) + A(132, 156, 162, 156, C.am, 2.5);
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
      s += T(12, 276, '● 点火プラグ：各シリンダーに 2 本（左右のマグネトーから別々に）', { c: C.ink, a: 'start', fs: 12 }) + T(12, 294, '燃料噴射式（IO-360）は、気化器の代わりに噴射装置', { c: C.mut, a: 'start', fs: 12 });
      return svg(400, 304, s, '図：気化器式のエンジン（O-360）の空気・燃料・点火の流れ（模式図）。点火はエンジンが回して発電するマグネトーで行い、左右 2 系統あります。2 つのマグネトーで点火する Archer では、電気系統が止まってもエンジンは止まりません（電子制御の点火の機体は違います）');
    },
    // redrawn under the same name (revise-sys): the same drawing as book-figs.js; only words change (気化器, the float
    // explained: reader-sys C4・CB4). The drop of 60–70 °F is a difference, about 33–39 ℃ (PHAK 25C ch. 7)
    carbIce() {
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
      return svg(400, 324, s, '図：気化器着氷（燃料室の浮きで燃料の高さを保つ、フロート式の気化器の断面の模式図）。晴れていても、湿った空気なら気化器の中で氷ができ、空気の通り道が狭くなって出力が落ちます（PHAK 第 7 章）');
    },
    // redrawn under the same name (W14): the note on the anti-collision lights says「安全のために消してよいときを除く」
    // (the pilot in command, 機長, is named in the text with its English); otherwise as book-figs.js
    positionLights() {
      // position lights: red on the left wingtip, green on the right, white on the tail; what another airplane's lights tell
      const px = 118, py = 118, wt = 68, tl = py + 50;           // the airplane (k = 1): wingtips at px ± 68, the tail light at py + 50
      let s = planeTop(px, py, 1) + T(px, 22, '上から見た図', { c: C.ink, b: 1, fs: 13 });
      const sector = (x, y, a0, a1, c) => { const r = 46, p = a => [x + r * Math.sin(a * DEG), y - r * Math.cos(a * DEG)], [x0, y0] = p(a0), [x1, y1] = p(a1); return `<path d="M${x} ${y} L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${c}" fill-opacity="0.18"/>`; };
      s = sector(px - wt, py - 1, -110, 0, C.rd) + sector(px + wt, py - 1, 0, 110, C.gr) + sector(px, tl, 110, 250, '#f2f2f2') + s;
      s += `<circle cx="${px - wt}" cy="${py - 1}" r="6" fill="${C.rd}"/><circle cx="${px + wt}" cy="${py - 1}" r="6" fill="${C.gr}"/><circle cx="${px}" cy="${tl}" r="5" fill="#f2f2f2"/>`;
      s += T(px - wt - 4, py - 22, '左＝赤', { c: C.rd, b: 1, fs: 12, halo: 1 }) + T(px + wt + 4, py - 22, '右＝緑', { c: C.gr, b: 1, fs: 12, halo: 1 }) + T(px, tl + 30, '尾＝白', { c: C.ink, b: 1, fs: 12, halo: 1 });
      const see = (y, l, r, t, c) => `<circle cx="252" cy="${y}" r="7" fill="${l}"/><circle cx="292" cy="${y}" r="7" fill="${r}"/>` + T(306, y - 2, t[0], { c, b: 1, a: 'start', fs: 12 }) + T(306, y + 14, t[1], { c: C.ink, a: 'start', fs: 12 });
      s += T(252, 46, '夜、相手の灯火が', { c: C.ink, b: 1, a: 'start', fs: 12 }) + T(252, 62, 'こう見えたら', { c: C.ink, b: 1, a: 'start', fs: 12 });
      s += see(96, C.rd, C.gr, ['左に赤・右に緑', '同じ向き'], C.ink) + see(140, C.gr, C.rd, ['左に緑・右に赤', 'こちらへ来る！'], C.rd) + `<circle cx="272" cy="184" r="7" fill="#f2f2f2"/>` + T(306, 182, '白だけ', { c: C.ink, b: 1, a: 'start', fs: 12 }) + T(306, 198, '相手の後ろ', { c: C.ink, a: 'start', fs: 12 });
      s += T(200, 224, '同じ向きや後ろでも、こちらが速ければ近づく', { c: C.ink, b: 1, fs: 12 });
      s += TL(200, 248, ['衝突防止灯（ビーコン・ストロボ）は、付いていれば', 'いつも点灯（米国の 14 CFR 91.209。', '安全のために消してよいときを除く）'], { c: C.am, fs: 12, lh: 16 });
      return svg(400, 292, s, '図：航空灯（左の翼端が赤、右の翼端が緑、尾が白）。相手の灯火の並び方で、相手の向きがわかります。同じ向きでも、こちらが速ければ近づくので、間隔を保ちます（AFH 第 11 章）');
    },
  });
  }
  // ---- the figures of Part 1's chapter 'aero' (R2: drafts/aero-figs.js by W13 and revise-aero, registered in R2B). New: wingTerms,
  // boundaryLayer, climbForces, powerCurve, glideTriangle, bankLoad, dynStability, spinSpiral, gustEnvelope, dihedralSlip;
  // redrawn under their names (the old functions removed above): forces, turnForces, cgTail, liftFlow, vn. The block holds
  // the helpers that differ from the ones at the top of this file (as the draft drew with them).
  {
  // the draft's own helpers where they differ from the ones at the top of this file
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const planeSide = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${-(o.pitch || 0)}) scale(${k})">`
    + `<path d="M50 -1 C48 -8 38 -11 26 -12 L14 -16 C2 -18 -10 -16 -18 -12 L-50 -5 L-50 1 L-14 6 C6 8 30 7 44 5 C49 4 51 2 50 -1 Z" fill="${PLANE}"/>`
    + `<path d="M12 -15 C4 -17 -6 -16 -14 -12 L-12 -9 L10 -9 Z" fill="${GLASS}"/><path d="M-38 -6 L-50 -27 L-57 -27 L-54 -3 Z" fill="${PLANE}"/>`
    + `<rect x="-60" y="-4" width="20" height="3.5" rx="1.5" fill="${PLANE2}"/><ellipse cx="6" cy="5" rx="19" ry="2.6" fill="${PLANE2}"/>`
    + (o.gear === false ? '' : `<path d="M2 7 L0 15 M40 5 L40 15" stroke="${PLANE2}" stroke-width="2"/><circle cx="0" cy="16" r="3.4" fill="#5b6b7e"/><circle cx="40" cy="16" r="3" fill="#5b6b7e"/>`)
    + `<line x1="52" y1="-15" x2="52" y2="13" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
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

  Object.assign(FIG, {
    // ---------------------------------------------------------------- redrawn under the same name (重力 → 重量)
    forces() {
      // the course's Archer in cruise (110 KIAS, sea level): lift = weight ≈ 10,300 N, drag ≈ 1,160 N — drawn about 9 : 1 would hide
      // thrust and drag, so they are drawn shorter but not to scale (the caption says so)
      let s = planeSide(200, 132, 1.5, { gear: false });
      s += A(206, 124, 206, 34, C.gr, 4) + T(214, 40, '揚力（Lift）', { c: C.gr, b: 1, a: 'start', fs: 14 }) + T(214, 58, '翼が空気から受ける上向きの力', { c: C.ink, a: 'start', fs: 12 });
      s += A(206, 140, 206, 230, C.mut, 4) + T(214, 222, '重量（Weight）', { c: C.mut, b: 1, a: 'start', fs: 14 }) + T(214, 240, '機体・燃料・人・荷物の重さ', { c: C.ink, a: 'start', fs: 12 });
      s += A(284, 132, 340, 132, C.am, 4) + T(392, 116, '推力（Thrust）', { c: C.am, b: 1, a: 'end', fs: 14 }) + T(392, 156, 'プロペラが前へ引く', { c: C.ink, a: 'end', fs: 12 });
      s += A(116, 132, 60, 132, C.rd, 4) + T(8, 116, '抗力（Drag）', { c: C.rd, b: 1, a: 'start', fs: 14 }) + T(8, 156, '空気の抵抗', { c: C.ink, a: 'start', fs: 12 });
      return svg(400, 252, s, '図：飛んでいる飛行機に働く 4 つの力。高度も速度も変わらない水平飛行では、揚力＝重量、推力＝抗力でつり合っています（矢印の長さは模式的。巡航では揚力は抗力の約 9 倍：教材値）');
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
      const Pr = v => v ** 3 + 1 / v, vs = 0.56, vmp = 3 ** -0.25, avail = v => 4.6 - 1.3 * (v - 1.25) ** 2;   // revise-aero: lower, so it clears the labels; its excess over Pr is largest between VMP and L/D max
      let s = L(m.l, H - m.b, W - m.r, H - m.b, C.mut, 1.5) + L(m.l, m.t, m.l, H - m.b, C.mut, 1.5);
      s += T((m.l + W - m.r) / 2, H - 10, '速度 →', { c: C.mut, fs: 12 }) + T(16, (m.t + H - m.b) / 2, '必要パワー（＝抗力×速度）→', { c: C.mut, fs: 12, rot: -90 });
      // the region of reversed command (stall → minimum power) and the normal region
      s += `<rect x="${X(vs).toFixed(1)}" y="${m.t}" width="${(X(vmp) - X(vs)).toFixed(1)}" height="${H - m.b - m.t}" fill="${C.rd}" fill-opacity="0.13"/>`;
      s += L(X(vs), m.t, X(vs), H - m.b, C.rd, 1.4, '4 3') + T(X(vs) - 3, H - m.b + 15, '失速', { c: C.rd, fs: 12, a: 'middle' });
      const curve = []; for (let v = vs; v <= 1.66; v += 0.01) curve.push([X(v), Y(Pr(v))]);
      const av = []; for (let v = 0.5; v <= 1.74; v += 0.02) av.push([X(v), Y(avail(v))]);
      s += P(av, C.am, 2, 'none', '7 4') + T(X(1.05), Y(avail(1.05)) - 10, '使えるパワー（利用馬力）', { c: C.am, b: 1, fs: 12, halo: 1 });
      s += P(curve, C.cy, 3);
      // tangent from the origin: L/D max (power/speed least = drag least)
      s += L(X(0), Y(0), X(1.32), Y(2.64), C.gr, 1.4, '5 4') + `<circle cx="${X(1).toFixed(1)}" cy="${Y(2).toFixed(1)}" r="5" fill="${C.gr}"/>`;
      s += T(X(1) + 8, Y(2) + 22, '揚抗比が最大', { c: C.gr, b: 1, a: 'start', fs: 12, halo: 1 }) + T(X(1) + 8, Y(2) + 38, '（最も遠くへ滑空）', { c: C.gr, a: 'start', fs: 12, halo: 1 });
      s += `<circle cx="${X(vmp).toFixed(1)}" cy="${Y(Pr(vmp)).toFixed(1)}" r="5" fill="${C.vi}"/>`;
      s += T(X(vmp), Y(Pr(vmp)) - 34, '必要パワーが最小', { c: C.vi, b: 1, fs: 12, halo: 1 }) + T(X(vmp), Y(Pr(vmp)) - 18, '（最も長く飛べる）', { c: C.vi, fs: 12, halo: 1 });
      s += T(X((vs + vmp) / 2), m.t + 16, '逆操作域', { c: C.rd, b: 1, fs: 12 }) + T(X((vs + vmp) / 2), m.t + 32, '遅いほど多くのパワー', { c: C.ink, fs: 12 });
      s += T(X(1.42), m.t + 16, '通常の操作域', { c: C.cy, b: 1, fs: 12 }) + T(X(1.42), m.t + 32, '速いほど多くのパワー', { c: C.ink, fs: 12 });
      s += T(X(1.5), Y(Pr(1.5)) + 26, '必要パワー', { c: C.cy, b: 1, a: 'start', fs: 12, halo: 1 });
      return svg(W, H, s, '図：速度と必要パワー（模式図。数値は特定の機体のものではない）。水平飛行を続けるのに要るパワーは、ある速度で最小になります。それより遅い側（赤い帯）では、遅くするほど多くのパワーが要ります（逆操作域）。原点からの線が曲線に接する点が、揚抗比が最大の速度です（線の傾き＝パワー ÷ 速度＝抗力が最小）。破線は使えるパワーで、2 本の差が余剰パワーです');
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
    // aero.vn — redrawn by revise-aero as a SCHEMATIC (expert-aero E-M1): the POH's VO lies at or left of the corner where the
    // stall line meets +3.8 G (old 14 CFR 23.1507: VO ≤ VS√n; VS is a computed stalling speed, so the corner is not drawn from the
    // 50 KIAS indicated value and the speed axis has no scale). Load factors are the POH's normal category (+3.8 / −1.5).
    vn() {
      const W = 400, H = 280, m = { l: 44, r: 12, t: 30, b: 38 }, v1 = 3.1, nLo = -2, nHi = 4.6, nP = 3.8, nN = -1.5;
      const X = v => m.l + v / v1 * (W - m.l - m.r), Y = n => H - m.b - (n - nLo) / (nHi - nLo) * (H - m.t - m.b);
      const vs = 1, corner = vs * Math.sqrt(nP), vo = 1.85, vno = 2.4, vne = 2.95, vsN = 1.07, vn = vsN * Math.sqrt(-nN);
      let s = L(m.l, Y(0), W - m.r, Y(0), C.mut, 1.2) + L(m.l, m.t, m.l, H - m.b, C.mut, 1.2);
      for (const [n, t] of [[0, '0'], [1, '1'], [nP, '+3.8'], [nN, '−1.5']]) s += T(m.l - 6, Y(n) + 4, t, { c: C.mut, fs: 12, a: 'end' });
      s += T(14, (m.t + H - m.b) / 2, '荷重倍数 n（G）', { c: C.mut, fs: 12, rot: -90 }) + T((m.l + W - m.r) / 2, H - 8, '速度 →（模式図。目盛りなし）', { c: C.mut, fs: 12 });
      // guides from the axis to the limit lines
      s += L(m.l, Y(nP), X(corner), Y(nP), C.rd, 1, '3 4') + L(m.l, Y(nN), X(vn), Y(nN), C.rd, 1, '3 4');
      // the envelope: the stall line up to the corner, +3.8 to VNE, −1.5 back to the negative stall line
      const up = []; for (let v = 0; v <= corner; v += 0.02) up.push([X(v), Y((v / vs) ** 2)]);
      up.push([X(corner), Y(nP)]);
      const dn = []; for (let v = vn; v >= 0; v -= 0.02) dn.push([X(v), Y(-((v / vsN) ** 2))]);
      const env = [...up, [X(vne), Y(nP)], [X(vne), Y(nN)], [X(vn), Y(nN)], ...dn, [X(0), Y(0)]];
      s += P(env, C.cy, 2, 'rgba(95,212,255,.10)');
      // the operating speeds (POH): VO left of the corner, VNO, VNE
      for (const [v, t, c] of [[vo, 'VO', C.gr], [vno, 'VNO', C.am], [vne, 'VNE', C.rd]]) s += L(X(v), Y(nP) - 4, X(v), Y(nN), c, 1.4, '4 3') + T(X(v), 22, t, { c, b: 1, fs: 12 });
      // the corner and 1 G at VS1
      s += `<circle cx="${X(corner).toFixed(1)}" cy="${Y(nP).toFixed(1)}" r="4" fill="${C.ink}"/>` + T(X(corner) - 14, Y(nP) + 12, '失速速度 × √3.8 の角 →', { c: C.ink, fs: 12, a: 'end', halo: 1 });
      s += `<circle cx="${X(vs).toFixed(1)}" cy="${Y(1).toFixed(1)}" r="3.5" fill="${C.ink}"/>` + T(X(vs) + 7, Y(1) + 16, '1 G で失速（VS1）', { c: C.ink, fs: 12, a: 'start', halo: 1 });
      s += T(m.l + 6, Y(nP) - 7, '制限荷重倍数（POH の普通類）', { c: C.rd, b: 1, fs: 12, a: 'start', halo: 1 }) + T(X(2.15), Y(nN) + 16, '−の制限荷重倍数', { c: C.rd, b: 1, fs: 12, halo: 1 });
      s += T(X(0.45), Y(2.4), '失速', { c: C.ink, b: 1, fs: 12, halo: 1 }) + T(X(2.13), Y(1.3), '飛べる範囲', { c: C.cy, b: 1, fs: 13, halo: 1 });
      return svg(W, H, s, '図：V-n 線図の模式図（Archer III の POH の普通類の制限荷重倍数 +3.8 G／−1.5 G）。曲線の左は失速です。失速の線は、失速速度 × √3.8 の角で +3.8 G の線に届きます。POH の VO（最大運用運動速度）は、この角より左（遅い側）にあります。上と下の線を超えると、機体が変形・損傷する危険があります');
    },
    // aero.stab — new (reader-aero B1; DESIGN 3.3 names ch01-fig13 for this section): dihedral works through the sideslip
    dihedralSlip() {
      const cx = 200, cy = 118, bank = 20;
      let s = T(12, 22, '後ろから見た図（突風で右へ傾いた）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      s += planeFront(cx, cy, 1.6, { bank, gear: false });
      // the sideslip toward the lower (right) wing: the air comes from the right
      for (const y of [146, 166]) s += A(392, y, 334, y, C.cy, 2.5);
      s += T(392, 132, '横滑りの風', { c: C.cy, b: 1, a: 'end', fs: 12, halo: 1 });
      // lift: more on the lower wing, less on the upper wing
      s += A(270, 142, 262, 70, C.gr, 4) + T(258, 64, '揚力が増える', { c: C.gr, b: 1, a: 'end', fs: 12, halo: 1 });
      s += A(132, 100, 136, 64, C.gr, 2.5) + T(132, 52, '揚力が減る', { c: C.gr, b: 1, fs: 12, halo: 1 });
      s += T(300, 196, '下がった翼', { c: C.ink, fs: 12, halo: 1 }) + T(300, 212, '迎え角が大きくなる', { c: C.ink, fs: 12, halo: 1 }) + T(132, 140, '上がった翼', { c: C.ink, fs: 12, halo: 1 });
      // the airplane rolls back toward wings level
      s += ARC(cx, cy, 150, 206, 186, C.vi, 2.5) + T(14, 124, '水平へ戻る', { c: C.vi, b: 1, a: 'start', fs: 12, halo: 1 });
      s += `<rect x="12" y="222" width="376" height="28" rx="6" fill="${C.gr}" fill-opacity="0.1" stroke="${C.gr}"/>` + T(200, 241, '横滑りで、下がった翼の迎え角が増え、水平へ戻る', { c: C.gr, b: 1, fs: 12 });
      return svg(400, 258, s, '図：上反角が横安定を生むしくみ（後ろから見た模式図）。機体が右へ傾くと、下がった右の翼の側へ横滑りし、横から風が当たります。上反角があると、下がった翼の迎え角が大きくなって揚力が増え、上がった翼は揚力が減るので、機体は水平へ戻ります（PHAK 第 5 章）');
    },
    // aero.spin — new: spin and spiral dive side by side (AFH 3C chapter 5)
    spinSpiral() {
      let s = T(104, 22, 'スピン', { c: C.rd, b: 1, fs: 14 }) + T(296, 22, 'スパイラル', { c: C.am, b: 1, fs: 14 });
      // the paths: a tight corkscrew nearly straight down, and a wide descending turn that tightens
      const cork = [], wide = [];
      for (let t = 0; t <= 3.2; t += 0.02) { cork.push([104 + 16 * Math.sin(t * 2 * Math.PI), 40 + t * 30 + 5 * Math.cos(t * 2 * Math.PI)]); wide.push([296 + (52 - t * 10) * Math.sin(t * 1.6 * Math.PI), 40 + t * 30 + 12 * Math.cos(t * 1.6 * Math.PI)]); }
      s += P(cork, C.rd, 2.2) + P(wide, C.am, 2.2);
      s += A(104, 128, 104, 142, C.rd, 2.5) + A(296, 128, 296, 142, C.am, 2.5);
      const rows = [['翼', '下がる翼がより深く失速', '失速していない'], ['速度', '低く、ほぼ一定', 'どんどん増える'], ['回復の最初', '方向舵を回転と反対へ', '出力を絞り、少し押す']];
      rows.forEach(([k, a, b], i) => {
        const y = 168 + i * 30;
        s += `<rect x="8" y="${y - 16}" width="384" height="26" rx="5" fill="${i % 2 ? C.bg : 'rgba(150,176,206,.08)'}"/>`;
        s += T(200, y + 1, k, { c: C.mut, b: 1, fs: 12 }) + T(104, y + 1, a, { c: C.ink, fs: 12 }) + T(296, y + 1, b, { c: C.ink, fs: 12 });
      });
      s += `<rect x="8" y="${168 + 3 * 30 - 12}" width="384" height="26" rx="6" fill="${C.cy}" fill-opacity="0.1" stroke="${C.cy}"/>` + T(200, 168 + 3 * 30 + 6, '回る向きは旋回傾斜計で見る（すべり計の玉は使わない）', { c: C.cy, b: 1, fs: 12 });
      return svg(400, 276, s, '図：スピンとスパイラルの違い（AFH 第 5 章・AC 61-67C と Archer の POH から。スピンの回復の最初は Archer の POH の手順、スパイラルは AFH の型）。スピンは少なくとも片方の翼が失速したまま、速度が低く一定のまま回って落ちます。スパイラルは翼が失速しておらず、速度と荷重倍数がどんどん増えます。回復の手順が違うので、まず見分けます');
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
      s += T(W - m.r, 18, '模式図（数値は目安）', { c: C.am, b: 1, a: 'end', fs: 12 }) + T((m.l + W - m.r) / 2 - 30, H - 6, '速度（等価対気速度）→', { c: C.mut, fs: 12 });
      return svg(W, H, s, '図：運動包囲線図（青）と突風の線（橙の破線）の模式図。運動包囲線図は、失速の線と制限荷重倍数の線で囲まれた、操縦でかかる荷重の範囲です。突風の線は、決めた強さの上向き・下向きの突風を受けたときの荷重倍数で、速いほど大きくなります。設計は両方を囲む範囲で強さを確かめます。VA は設計運動速度、VC は設計巡航速度、VD は設計急降下速度です');
    },
  });
  }

  // ---------------------------------------------------------------- calculators inside the text
  const ARCHER_WB = {
    // the Archer III POH's arms (inches aft of the datum) and CG envelope; the basic empty weight and its arm are an example (each airplane has its own)
    rows: [['空虚重量（BEW：Basic Empty Weight）', 1640, 87.0], ['前席（操縦士・同乗者）', 340, 80.5], ['後席', 150, 118.1], ['燃料（40 gal × 6 lb）', 240, 95.0], ['手荷物', 50, 142.8]],
    env: [[82.0, 1600], [82.0, 2050], [88.6, 2550], [93.0, 2550], [93.0, 1600]],
    max: 2550,
    // the POH's numbers the weight-and-balance form and the chapter wb use (R2, drafts/perfwb-figs.js): maximum ramp weight
    // 2,558 lb, start/taxi/run-up fuel 8 lb at 95.0 in, baggage 200 lb, usable fuel 48 US gal at 6 lb/gal (POH 1.11・2.11・2.21,
    // Fig. 6-9), and the utility category (2,138 / 2,130 lb, no baggage or rear passengers, forward limit 83.0 in at 2,130 lb:
    // POH 2.11・2.13, Fig. 6-9)
    ramp: 2558, taxiFuel: 8, bagMax: 200, fuelMaxGal: 48, lbPerGal: 6,
    utility: { ramp: 2138, max: 2130, bagMax: 0, fwd: w => (w <= 2050 ? 82.0 : 82.0 + (w - 2050) / 80 * 1.0) },
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
  // a number from an input, or null when it is empty or not a number (the calculators da and wb: R2, drafts/perfwb-figs.js)
  const num = x => (x === '' || x === null || !Number.isFinite(+x) ? null : +x);
  const CALC = {
    turn(el) {
      el.innerHTML = '<label>速度 <input type="number" value="100" min="40" max="300"> kt</label> <label>バンク <input type="number" value="30" min="5" max="75"> °</label> <output></output>';
      const [v, b] = el.querySelectorAll('input'), out = el.querySelector('output');
      const f = () => { const V = +v.value, B = +b.value * DEG, tn = Math.tan(B); out.innerHTML = `荷重倍数 <b>${(1 / Math.cos(B)).toFixed(2)} G</b>・旋回率 <b>${(1091 * tn / V).toFixed(1)}°/秒</b>・半径 <b>${Math.round(V * V / (11.26 * tn)).toLocaleString()} ft</b>・失速速度 ×${Math.sqrt(1 / Math.cos(B)).toFixed(2)}`; };
      v.addEventListener('input', f); b.addEventListener('input', f); f();
    },
    // da: elevation, temperature, altimeter setting in inHg or hPa (the switch converts the number: 1 inHg = 33.8639 hPa)
    da(el) {
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
    // wb: the Archer III's loading form (POH Fig. 6-11): ramp → start/taxi fuel → takeoff, and each limit checked on its own
    wb(el) {
      const W = ARCHER_WB;   // the POH numbers this form uses: ramp, taxiFuel, bagMax, fuelMaxGal, lbPerGal, utility
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
