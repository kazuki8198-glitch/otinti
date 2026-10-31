// DRAFT (W28-p2a, R3) — the figures of Part 2's chapters 'ground'「飛ぶ前と飛んだあと」and 'ops'「基本操縦」
// (textbook/rewrite/combined/DESIGN.md 3.3 第 2 部 第 21・22 章, 4.2 kiso11, 7.2 W28). No product reads this file: it is
// checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p2a-figs.js textbook/rewrite/combined/drafts/p2a.js
// and, when the chapters are registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys;
// the helpers below are copied unchanged from book-figs.js, so the functions run the same way there).
//
// What is here (one function per figure; the caption says what to look at):
//   new      dayFlow          ground.day — new (the basic course's door figure ch11-fig11-1 is not used: PROVENANCE): the six
//                             steps of one training flight, from the briefing to the debriefing and the record, with the
//                             bar「どの段階でも、やめる・変える判断がある」(kiso11.1・11.2, AFH chapter 2). No number.
//   new      controlHandover  ground.crew — new: the three-step exchange of flight controls of AFH chapter 1 (You have / I have /
//                             You have, and the look that checks it), and「応答がなければ、操縦を続けて、もう一度言う」.
//   new      energyFlow       ops.energy — the basic course's ch11-fig11-7「高度と速度をエネルギーの配分として捉える」redrawn
//                             with AFH chapter 4's reservoir analogy (figure 4-3): the throttle adds or takes total energy,
//                             the elevator moves it between the height and the speed, drag takes it away. No number.
//   new      energyErrors     ops.energy — new from AFH chapter 4 figures 4-11 and 4-12: the 3 × 3 table of altitude (high /
//                             on / low) × airspeed (slow / on / fast) and the control to use first: the same direction = total
//                             energy (throttle), opposite directions = distribution (elevator), one off = both.
//   new      crabTrack        ops.ground — the basic course's ch11-fig11-9「横風では機首の向きと地上航跡を分ける」redrawn:
//                             from above, a road (the ground track), the wind from the left, the airplane headed into the wind,
//                             the three arrows heading + wind = track (a schematic, not to scale).
//   redrawn  walkaroundRoute  ground.walk — the same drawing; the label「スタビレーター・ラダー」→「スタビレーター（stabilator）」
//                             and「ピトー・静圧管」→「ピトー管（pitot tube）」(the old name ラダー out; the rudder is in the text's fold;
//                             a figure is read first, so the terms' first uses are here. W21 7.3 left Part 2's figures to their units).
//   redrawn  taxiWind         ground.taxi — the same drawing; the caption's「タキシー」→「地上滑走」and「エルロン」→「補助翼」
//                             (FL.terms taxi, aileron), the first use in the caption with the common name and English.
//   redrawn  stallRecovery    ops.stall — the same drawing; 「ボールはラダーで中央」「左への向きはラダーで」→「方向舵」, the box ④
//                             and the caption name 二次失速（secondary stall）and 失速からの回復（stall recovery）: a figure is
//                             read before the text, so the first use of a term in the chapter is there (check-style).
//   redrawn  turnsAroundPoint ops.ground — the same drawing; the caption's first use 対地速度（groundspeed）(check-style).
// Unchanged and not repeated here: magCheck (ground.runup) and attitudePower (ops.trim): their words are FL.terms' names
// already and their numbers come from the flight model and the checklist.
// The basic course's ch11-fig11-5 (Vx and Vy: the same distance / the same time) is not redrawn here: perf.climb's figure
// (R2) already draws it from the flight model's numbers; reports/W28-p2a.md asks W33 to mark it dropped for that reason.
// Every number drawn here is one the text gives with its source (p2a.claims.json); text ≥ 12 (≥ 10 px at 390 px).
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
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  // a circular arc around (cx, cy) from angle a0 to a1 (degrees, 0 = right, clockwise on screen), with an arrowhead at a1
  const ARC = (cx, cy, r, a0, a1, c, w = 2, head = true) => {
    const p = a => [cx + r * Math.cos(a * DEG), cy + r * Math.sin(a * DEG)], [x0, y0] = p(a0), [x1, y1] = p(a1), big = Math.abs(a1 - a0) > 180 ? 1 : 0, sw = a1 > a0 ? 1 : 0;
    let s = `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${big} ${sw} ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
    if (head) { const t = (a1 + (a1 > a0 ? 90 : -90)) * DEG, hh = 8; s += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${(x1 - hh * Math.cos(t - 0.45)).toFixed(1)} ${(y1 - hh * Math.sin(t - 0.45)).toFixed(1)} L${(x1 - hh * Math.cos(t + 0.45)).toFixed(1)} ${(y1 - hh * Math.sin(t + 0.45)).toFixed(1)} Z" fill="${c}"/>`; }
    return s;
  };
  const PLANE = '#dfe6ee', PLANE2 = '#9fb3c8', GLASS = '#5d7fa3';
  const planeTop = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${k})">`
    + `<path d="M-68 -8 L68 -8 L66 6 L-66 6 Z" fill="${PLANE}"/><path d="M-22 38 L22 38 L21 45 L-21 45 Z" fill="${PLANE2}"/>`
    + `<path d="M0 -50 C5 -48 7 -40 7 -28 L5 30 L2 50 L-2 50 L-5 30 L-7 -28 C-7 -40 -5 -48 0 -50 Z" fill="${PLANE}"/><path d="M-5 -26 L5 -26 L4 -14 L-4 -14 Z" fill="${GLASS}"/>`
    + (o.twin ? `<rect x="-29" y="-24" width="10" height="26" rx="4" fill="${PLANE2}"/><rect x="19" y="-24" width="10" height="26" rx="4" fill="${PLANE2}"/><line x1="-36" y1="-26" x2="-12" y2="-26" stroke="${C.mut}" stroke-width="2.5"/><line x1="12" y1="-26" x2="36" y2="-26" stroke="${C.mut}" stroke-width="2.5"/>`
      : `<line x1="-12" y1="-52" x2="12" y2="-52" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/>`) + '</g>';
  // a rounded box tinted with its colour (o: op fill opacity, sw, dash)
  const box = (x, y, w, h, c, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${c}" fill-opacity="${o.op === undefined ? 0.12 : o.op}" stroke="${c}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;

  Object.assign(FL.bookFigs, {
    // ---------------------------------------------------------------- ground（飛ぶ前と飛んだあと）
    // ground.day — one training flight in six steps, and the decision that stays open at every step (kiso11.1・11.2)
    dayFlow() {
      const steps = [
        ['① ブリーフィング（briefing）', '課目・目標・天気・やめる条件・受け渡しの約束', C.cy],
        ['② 書類と情報', '書類と整備の記録・天気・ノータム（NOTAM）・燃料', C.cy],
        ['③ 外部点検（preflight inspection）', '機体そのものをチェックリスト（checklist）で', C.gr],
        ['④ 始動・地上滑走（taxi）・試運転（run-up）', 'いつもと違えば、止まって確かめる', C.gr],
        ['⑤ 課目', '決めた空域で練習して帰る', C.vi],
        ['⑥ 着陸・駐機・デブリーフィング（debriefing）', '不具合を記録し、ふり返り、記録を書く', C.am],
      ];
      let s = T(8, 18, '訓練の 1 回のフライト（例）', { c: C.ink, b: 1, a: 'start', fs: 13 });
      steps.forEach(([head, note, c], i) => {
        const y = 28 + i * 48;
        s += box(8, y, 346, 40, c) + T(18, y + 17, head, { c, b: 1, a: 'start', fs: 12 }) + T(18, y + 33, note, { c: C.ink, a: 'start', fs: 12 });
        if (i < steps.length - 1) s += A(180, y + 40, 180, y + 48, C.mut, 2);
      });
      s += L(370, 32, 370, 312, C.rd, 3) + L(364, 32, 370, 32, C.rd, 3) + L(364, 312, 370, 312, C.rd, 3);
      s += T(388, 172, 'どの段階でも、やめる・変える判断がある', { c: C.rd, b: 1, fs: 12, rot: -90 });
      return svg(400, 322, s, '図：訓練の 1 回のフライトの流れ（例）。ブリーフィングで始まり、デブリーフィングと記録で終わります。どの段階でも、条件が変われば、やめるか計画を変えます');
    },
    // ground.crew — the exchange of flight controls in three steps (AFH chapter 1)
    controlHandover() {
      const bubble = (x, y, w, who, line, c, right) => box(x, y, w, 38, c, { rx: 12 }) + T(right ? x + w + 6 : x - 6, y + 24, who, { c, b: 1, a: right ? 'start' : 'end', fs: 12 })
        + T(x + w / 2, y + 24, line, { c: C.ink, fs: 13 });
      let s = '';
      s += T(10, 22, '①', { c: C.cy, b: 1, a: 'start', fs: 13 }) + bubble(84, 6, 250, '渡す人', 'You have the flight controls.', C.cy, true);
      s += T(10, 78, '②', { c: C.gr, b: 1, a: 'start', fs: 13 }) + bubble(84, 62, 250, '受ける人', 'I have the flight controls.', C.gr, true);
      s += T(10, 134, '③', { c: C.cy, b: 1, a: 'start', fs: 13 }) + bubble(84, 118, 250, '渡す人', 'You have the flight controls.', C.cy, true);
      s += T(209, 176, '相手が操縦していることを目で確かめる', { c: C.ink, fs: 12 });
      s += L(10, 192, 390, 192, C.grid, 1);
      s += T(200, 214, '応答がなければ、手を離さずに操縦を続け、もう一度言う', { c: C.am, b: 1, fs: 12 });
      s += T(200, 234, '返すときも同じ 3 段階', { c: C.mut, fs: 12 });
      return svg(400, 244, s, '図：操縦の受け渡しの 3 段階（AFH 第 1 章）。渡す人が言い、受ける人が答え、渡す人がもう一度言って、目で確かめます');
    },
    // ground.walk — the Archer from above and the walk-around route of the published Archer III checklist (2025): cabin →
    // right wing → nose → left wing → fuselage and tail, with the few numbers it gives (struts 4.5 / 3.25 in, oil 6 qt).
    // Redrawn (W28): 「スタビレーター・ラダー」→「スタビレーター（stabilator）」, 「ピトー・静圧管」→「ピトー管（pitot tube）」
    // (the first uses in the chapter; one pitot head gives both pressures: POH 7.21, in the text). Otherwise the same as book-figs.js
    walkaroundRoute() {
      const cx = 200, cy = 180, k = 2.1, dash = d => `<path d="${d}" fill="none" stroke="${C.am}" stroke-width="2.5" stroke-dasharray="6 5"/>`;
      let s = planeTop(cx, cy, k);
      const tag = (x, y, n, c) => `<circle cx="${x}" cy="${y}" r="13" fill="${c}" stroke="${C.bg}" stroke-width="2"/>` + T(x, y + 5, n, { c: C.bg, b: 1, fs: 13 });
      s += dash(`M ${cx + 20} ${cy + 4} Q ${cx + 110} ${cy + 40} ${cx + 152} ${cy + 52}`) + A(cx + 140, cy + 49, cx + 152, cy + 52, C.am, 2.5);
      s += dash(`M ${cx + 172} ${cy + 36} Q ${cx + 176} ${cy - 120} ${cx + 34} ${cy - 136}`) + A(cx + 46, cy - 135, cx + 34, cy - 136, C.am, 2.5);
      s += dash(`M ${cx - 34} ${cy - 136} Q ${cx - 176} ${cy - 120} ${cx - 172} ${cy + 36}`) + A(cx - 172, cy + 24, cx - 172, cy + 36, C.am, 2.5);
      s += dash(`M ${cx - 150} ${cy + 120} Q ${cx - 110} ${cy + 156} ${cx - 34} ${cy + 158}`) + A(cx - 46, cy + 158, cx - 34, cy + 158, C.am, 2.5);
      s += tag(cx, cy - 30, '①', C.cy) + T(cx + 18, cy - 26, '操縦席', { c: C.cy, b: 1, a: 'start', fs: 12, halo: 1 });
      s += tag(cx + 162, cy + 52, '②', C.gr) + TL(cx + 160, cy + 82, ['右翼', '燃料・サンプ', '主脚 4.5 in'], { c: C.ink, fs: 12, lh: 15 });
      s += tag(cx, cy - 140, '③', C.gr) + T(cx - 20, cy - 136, '機首', { c: C.ink, a: 'end', fs: 12, halo: 1 }) + TL(cx + 22, cy - 166, ['オイル最少 6 qt', 'プロペラ・前脚 3.25 in'], { c: C.ink, a: 'start', fs: 12, lh: 15 });
      s += tag(cx - 162, cy + 52, '④', C.gr) + TL(cx - 190, cy + 82, ['左翼', '燃料・サンプ', 'ピトー管（pitot tube）'], { c: C.ink, a: 'start', fs: 12, lh: 15 });
      s += tag(cx, cy + 158, '⑤', C.gr) + TL(cx, cy + 188, ['胴体・尾翼', 'スタビレーター（stabilator）'], { c: C.ink, fs: 12, lh: 15 });
      s += T(392, 384, 'ドアは右側', { c: C.mut, a: 'end', fs: 12 });
      return svg(400, 392, s, '図：Archer の外部点検の順番（上から見た模式図）。公開されている訓練校のチェックリスト（2025 年版）の順で、操縦席 → 右翼 → 機首 → 左翼 → 胴体と尾翼と回ります。数字はそのチェックリストの値');
    },
    // ground.taxi — control positions while taxiing in a wind (AFH 3C chapter 2, Figure 2-15): the airplane from above, wind
    // from four quarters. Redrawn (W28): the caption says 地上滑走 and 補助翼 (FL.terms taxi, aileron)
    taxiWind() {
      let s = planeTop(200, 168, 1.15);
      const bx = (x, y, w, title, lines, c) => `<rect x="${x}" y="${y}" width="${w}" height="74" rx="8" fill="${c}" fill-opacity="0.12" stroke="${c}"/>` + T(x + w / 2, y + 19, title, { c, b: 1, fs: 12 }) + TL(x + w / 2, y + 38, lines, { c: C.ink, fs: 12, lh: 15 });
      s += bx(4, 6, 150, '左前からの風', ['操縦輪を左（風の方）へ', '昇降舵は中立'], C.cy) + bx(246, 6, 150, '右前からの風', ['操縦輪を右（風の方）へ', '昇降舵は中立'], C.cy);
      s += bx(4, 256, 150, '左後ろからの風', ['操縦輪を右（風と反対）へ', '前へ押す'], C.am) + bx(246, 256, 150, '右後ろからの風', ['操縦輪を左（風と反対）へ', '前へ押す'], C.am);
      s += A(96, 92, 136, 122, C.cy, 3) + A(304, 92, 264, 122, C.cy, 3) + A(96, 244, 136, 214, C.am, 3) + A(304, 244, 264, 214, C.am, 3);
      s += T(200, 352, '向かい風：風の方へ　追い風：風と反対へ・前へ', { c: C.ink, b: 1, fs: 12 });
      return svg(400, 364, s, '図：風があるときの地上滑走の操縦輪の位置（AFH 第 2 章の図 2-15 をもとにした模式図。前輪式）。矢印は風の向き。向かい風では風上の補助翼を上げ、追い風では風上の補助翼を下げて昇降舵を下げます');
    },
    // ---------------------------------------------------------------- ops（基本操縦）
    // ops.energy — the throttle fills or drains the total, the elevator moves energy between height and speed, drag drains it
    // (ch11-fig11-7 redrawn with AFH chapter 4 figure 4-3, the reservoir analogy)
    energyFlow() {
      let s = '';
      s += box(122, 8, 156, 40, C.cy) + T(200, 25, 'スロットル', { c: C.cy, b: 1, fs: 13 }) + T(200, 41, 'エンジンの推力（thrust）', { c: C.ink, fs: 12 });
      s += A(200, 48, 200, 84, C.cy, 3) + T(210, 70, '全体を増やす・減らす', { c: C.cy, a: 'start', fs: 12 });
      // the two reservoirs
      s += box(30, 88, 340, 120, C.mut, { op: 0.05 });
      const tank = (x, label, sub, level, c) => `<rect x="${x}" y="100" width="120" height="96" rx="6" fill="none" stroke="${c}" stroke-width="1.5"/>`
        + `<rect x="${x + 2}" y="${196 - level}" width="116" height="${level - 2}" rx="4" fill="${c}" fill-opacity="0.35"/>` + T(x + 60, 122, label, { c: C.ink, b: 1, fs: 13 }) + T(x + 60, 140, sub, { c: C.ink, fs: 12 });
      s += tank(42, '高さ', '（位置エネルギー）', 50, C.gr) + tank(238, '速さ', '（運動エネルギー）', 62, C.am);
      s += A(170, 166, 230, 166, C.ink, 2.5) + A(230, 180, 170, 180, C.ink, 2.5);
      s += T(200, 156, '昇降舵', { c: C.ink, b: 1, fs: 12 });
      s += T(200, 202, '配分を変える', { c: C.ink, fs: 12 });
      s += A(200, 208, 200, 240, C.rd, 3) + T(210, 230, '抗力（drag）がいつも減らす', { c: C.rd, a: 'start', fs: 12 });
      s += L(10, 250, 390, 250, C.grid, 1);
      s += T(200, 270, '機首を下げるだけでは、高さが速さに変わるだけ', { c: C.ink, b: 1, fs: 12 });
      return svg(400, 280, s, '図：高度と速度を、エネルギーの量と配分として見る（パイロット基礎教材の図 11-7 を、AFH 第 4 章の図 4-3 の考え方で描き直した模式図）。スロットルが全体の量を、昇降舵が配分を変えます');
    },
    // ops.energy — which control first, from where the altitude and the airspeed are against the target (AFH ch. 4, 4-11・4-12)
    energyErrors() {
      const x0 = 70, y0 = 46, cw = 108, ch = 72;
      const cells = [
        // row: 高い
        [['配分のずれ', 'まず機首を下げる'], C.gr], [['出力を減らし、', '機首を下げる'], C.cy], [['全体が多い', 'まず出力を減らす'], C.am],
        // row: ちょうど
        [['出力を足し、', '機首で高さを保つ'], C.cy], [['目標'], C.mut], [['出力を減らし、', '機首で高さを保つ'], C.cy],
        // row: 低い
        [['全体が少ない', 'まず出力を足す'], C.am], [['出力を足し、', '機首を少し上げる'], C.cy], [['配分のずれ', 'まず機首を上げる'], C.gr],
      ];
      let s = T(x0 + 1.5 * cw, 16, '速度', { c: C.mut, b: 1, fs: 12 });
      ['遅い', 'ちょうど', '速い'].forEach((t, i) => { s += T(x0 + (i + 0.5) * cw, 36, t, { c: C.ink, b: 1, fs: 12 }); });
      s += T(14, y0 + 1.5 * ch, '高度', { c: C.mut, b: 1, fs: 12, rot: -90 });
      ['高い', 'ちょうど', '低い'].forEach((t, i) => { s += T(62, y0 + (i + 0.5) * ch + 4, t, { c: C.ink, b: 1, a: 'end', fs: 12 }); });
      cells.forEach(([lines, c], k) => {
        const x = x0 + (k % 3) * cw, y = y0 + Math.floor(k / 3) * ch;
        s += box(x + 2, y + 2, cw - 4, ch - 4, c, { rx: 6 }) + TL(x + cw / 2, y + (lines.length > 1 ? 32 : 41), lines, { c: C.ink, fs: 12, lh: 17 });
      });
      const ly = y0 + 3 * ch + 22;
      s += box(10, ly - 12, 14, 14, C.am, { rx: 3 }) + T(30, ly, '同じ向きのずれ：全体の量（スロットル）', { c: C.ink, a: 'start', fs: 12 });
      s += box(10, ly + 8, 14, 14, C.gr, { rx: 3 }) + T(30, ly + 20, '逆の向きのずれ：配分（昇降舵）', { c: C.ink, a: 'start', fs: 12 });
      s += box(10, ly + 28, 14, 14, C.cy, { rx: 3 }) + T(30, ly + 40, '片方だけのずれ：両方を使う', { c: C.ink, a: 'start', fs: 12 });
      s += T(200, ly + 64, 'とても遅いときは、出力を足す前に機首を下げる', { c: C.rd, b: 1, fs: 12 });
      return svg(400, ly + 74, s, '図：高度と速度のずれと、先に使う操作（AFH 第 4 章の図 4-11・4-12 をもとにした模式図）。同じ向きのずれはまずスロットル、逆の向きのずれはまず機首で直します');
    },
    // ops.ground — heading into the wind keeps the ground track (ch11-fig11-9 redrawn; a schematic, not to scale)
    crabTrack() {
      const cx = 220, cy = 150, crab = 14;
      let s = `<rect x="${cx - 9}" y="8" width="18" height="250" fill="${C.mut}" fill-opacity="0.25"/>` + L(cx, 8, cx, 258, C.mut, 1.5, '8 6');
      s += T(cx + 16, 24, '道路（地面の上の目印）', { c: C.mut, a: 'start', fs: 12 });
      for (const y of [70, 150, 230]) s += A(24, y, 84, y, C.am, 3);
      s += T(54, 56, '風', { c: C.am, b: 1, fs: 12 });
      s += planeTop(cx, cy + 6, 0.55, { rot: -crab });
      // heading (air), wind (drift) and track (ground) arrows from the airplane
      const hx = cx - 92 * Math.sin(crab * DEG), hy = cy - 92 * Math.cos(crab * DEG);
      s += A(cx, cy, hx, hy, C.cy, 3) + A(hx, hy, cx, hy - 2, C.am, 2.5) + A(cx, cy, cx, hy - 2, C.gr, 3);
      s += TL(hx - 8, hy - 20, ['針路（ヘディング、heading）', '空気に対する進み方'], { c: C.cy, a: 'end', fs: 12, lh: 15 });
      s += TL(cx + 14, hy + 34, ['航跡（トラック、track）', '地面に対する進み方'], { c: C.gr, a: 'start', fs: 12, lh: 15 });
      s += T(cx - 26, hy + 12, '風で流れる', { c: C.am, a: 'end', fs: 12 });
      s += T(200, 282, '風上へ機首を向けて、地面の上の経路を保つ', { c: C.ink, b: 1, fs: 12 });
      return svg(400, 292, s, '図：横風の中で道路に沿って飛ぶ（上から見た模式図。左からの風）。機首を少し風上へ向けると、地面に対する進み方（航跡）が道路に重なります');
    },
    // ops.ground — turns around a point in a 10 kt wind, the AFH 3C chapter 7 example: 90 kt airspeed, 890 ft radius, 45° bank
    // downwind; the bank at the other points from tan φ = GS² / (11.26 · r) (r in ft, GS in kt). Redrawn (W28): the caption's
    // first use 対地速度（groundspeed）. Otherwise the same as book-figs.js
    turnsAroundPoint() {
      const tas = 90, w = 10, r = 890, bank = gs => Math.atan(gs * gs / (11.26 * r)) / DEG;
      const cx = 200, cy = 190, R = 84;
      let s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${C.cy}" stroke-width="2.5"/>` + `<circle cx="${cx}" cy="${cy}" r="5" fill="${C.am}"/>` + T(cx, cy + 20, '目印の点', { c: C.am, fs: 12 });
      s += ARC(cx, cy, R, 300, 330, C.cy, 2.5) + ARC(cx, cy, R, 120, 150, C.cy, 2.5);
      s += A(14, 40, 74, 40, C.mut, 3) + T(14, 26, `風 ${w} kt`, { c: C.mut, b: 1, a: 'start', fs: 12 });
      const pts = [[0, '風下へ（追い風）', tas + w], [90, '横風', Math.sqrt(tas * tas - w * w)], [180, '風上へ（向かい風）', tas - w], [270, '横風', Math.sqrt(tas * tas - w * w)]];
      const pos = [[cx, cy - R, 'middle', -16], [cx + R, cy, 'start', 0], [cx, cy + R, 'middle', 30], [cx - R, cy, 'end', 0]];
      pts.forEach(([, t, gs], i) => {
        const [x, y, a, dy] = pos[i], b = Math.round(bank(gs)), xo = a === 'start' ? 12 : a === 'end' ? -12 : 0;
        s += `<circle cx="${x}" cy="${y}" r="5" fill="${C.ink}"/>` + TL(x + xo, y + dy - (a === 'middle' && dy < 0 ? 16 : a === 'middle' ? 0 : 15), a === 'middle' ? [t, `対地 ${Math.round(gs)} kt・バンク 約 ${b}°`] : [t, `対地 ${Math.round(gs)} kt`, `バンク 約 ${b}°`], { c: i === 0 ? C.rd : i === 2 ? C.gr : C.ink, a, fs: 12, lh: 15 });
      });
      s += T(200, 366, `速度 ${tas} kt・半径 ${r} ft（AFH 第 7 章の例）`, { c: C.mut, fs: 12 });
      return svg(400, 376, s, '図：風の中で 1 点の周りを同じ半径で回る（上から見た模式図。時計回り）。対地速度（groundspeed）が速い風下でバンクがいちばん深く、風上でいちばん浅くなります。バンクの値は、AFH 第 7 章の例と同じ条件で計算したもの');
    },
    // ops.stall — the stall recovery of AFH 3C chapter 5 (Figure 5-10) as used in a single-engine trainer without an autopilot:
    // 4 of the 6 steps. Redrawn (W28): 「ラダー」→「方向舵」(FL.terms rudder). Otherwise the same as book-figs.js
    stallRecovery() {
      const bx = (x, y, n, head, lines, c) => `<rect x="${x}" y="${y}" width="190" height="96" rx="8" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`
        + `<circle cx="${x + 20}" cy="${y + 22}" r="12" fill="${c}"/>` + T(x + 20, y + 27, n, { c: C.bg, b: 1, fs: 13 }) + T(x + 40, y + 27, head, { c, b: 1, a: 'start', fs: 13 }) + TL(x + 12, y + 50, lines, { c: C.ink, a: 'start', fs: 12, lh: 15 });
      let s = bx(4, 6, '1', '迎え角を減らす', ['機首を下げる。', '失速警報が止まるまで', '（いちばん大切）'], C.rd);
      s += bx(206, 6, '2', '翼を水平に', ['迎え角を減らしてから。', 'ボールは方向舵で中央'], C.am);
      s += bx(4, 118, '3', '出力', ['必要なだけ足す。機首の', '上がりは操縦輪、左への', '向きは方向舵で押さえる'], C.cy);
      s += bx(206, 118, '4', '元の経路へ', ['なめらかに戻す。急に', '引くと二次失速', '（secondary stall）'], C.gr);
      s += A(196, 54, 204, 54, C.ink, 2.5) + A(300, 104, 110, 116, C.ink, 2) + A(196, 166, 204, 166, C.ink, 2.5);
      s += T(200, 236, '自動操縦のない単発の練習機の場合（AFH の 6 段階のうち 4 つ）', { c: C.mut, fs: 12 });
      return svg(400, 246, s, '図：失速からの回復（stall recovery）の順番（AFH 第 5 章の図 5-10 をもとにしたもの）。最初はいつも、機首を下げて迎え角を減らすことです');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
