// DRAFT (W20, R2) — the figures of Part 1's chapters 'hf'「人間の能力と判断」and 'adm'「エラー・状況認識・リスク」
// (textbook/rewrite/combined/DESIGN.md 3.3 第 1 部 第 18・19 章). No product reads this file: it is checked with the
// chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/hfadm-figs.js textbook/rewrite/combined/drafts/hfadm.js
// and, when the chapters are registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys,
// same helpers there: C, svg, T, L, A, TL). Until then the few helpers they need are repeated here.
//
// What is here (one function per figure — 10 new; the caption says what to look at). All new: the chapters keep the textbook's
// vestibular (hf.body), hypoxiaAltitudes (hf.altitude) and threePLoop (hf.adm) as they are in book-figs.js (no redrawn
// version here: their words and numbers are right and already name the country of 14 CFR 91.211 and the AIM).
//   new  fatigueFactors  hf.fatigue — the basic course's ch10-fig10-5「疲労に関係する条件をまとめて見直す」redrawn on the
//                        dark board: six conditions (too little sleep, poor sleep, long time awake, the body clock, long
//                        work, strain and heat) feed one box「注意・反応・判断の余裕が小さくなる」, with the two points the
//                        text teaches (the feeling of sleepiness is not the ability; only sleep repairs it). No number.
//   new  o2Partial       hf.altitude — the basic course's ch10-fig10-2「高度が上がると酸素の分圧が低下する」redrawn with
//                        numbers: three columns of air (sea level, 10,000 ft, 18,000 ft); each column's height is the
//                        standard-atmosphere pressure FL.physics.atmos gives (1,013 / 697 / 506 hPa), the cyan part is
//                        21 % of it (the oxygen's partial pressure: about 213 / 146 / 106 hPa). The share stays the same.
//   new  gLoad           hf.motion — new: the load factor of a level turn n = 1 / cos(bank) for 0・30・45・60° (1.00 /
//                        1.15 / 1.41 / 2.00, computed here), and what positive and negative G do to the body (US AIM
//                        8-1-7: narrowing, gray-out, black-out, unconsciousness; red-out).
//   new  nightEye        hf.vision — the basic course's ch10-fig10-3「明るさによる視覚の違いを見張りへ反映する」redrawn:
//                        the field of view by day (look straight at it: the cones of the centre see colour and detail)
//                        and by night (the centre is blind in dim light: look 5–10° to the side, PHAK chapter 17).
//   new  infoProcess     adm.error — new: the simplified information-processing model of UK CAA CAP 737 (2023)
//                        chapter 1, figure 3: senses → perception → (attention: conscious thinking in the working memory /
//                        learned routines from the long-term memory) → response, and the feedback loop.
//   new  swissCheese     adm.error — new: the Swiss cheese model (FAA Risk Management Handbook FAA-H-8083-2A, figure 6-1):
//                        four layers of defence with holes; one path passes all the holes to an accident, one is stopped.
//   new  checklistFlow   adm.check — the basic course's ch10-fig10-7「チェックリストで実施状態と再開位置を確かめる」
//                        redrawn: four steps and the branch for an interruption (go back to the last item surely done
//                        and check the real state again; CAP 737 chapter 5, AFH chapter 1).
//   new  saLevels        adm.sa — the basic course's ch10-fig10-8「状況認識を知覚と理解と予測に分けて確かめる」redrawn
//                        with the textbook's example (a stronger headwind): perceive → comprehend → project, updated.
//   new  riskMatrix      adm.risk — new: the risk assessment matrix of PHAK chapter 2, figure 2-5 (likelihood × severity
//                        → high / serious / medium / low, the cells as in the figure) with the PHAK example marked.
//   new  residualRisk    adm.risk — the basic course's ch10-fig10-10「対策を実施した後に残るリスクを確かめる」redrawn:
//                        hazard written concretely → likelihood × severity → eliminate / reduce / control → estimate the
//                        residual risk again (FAA Risk Management Handbook glossary) → acceptable? yes: go and keep checking
//                        that the measure works; no: change the plan or do not fly (back to the measures). No number.
// Every number drawn here is one the text gives with its source (hfadm.claims.json); text ≥ 12 (≥ 10 px at 390 px).
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  // the colours and helpers of book-figs.js (same values)
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const box = (x, y, w, h, c, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${c}" fill-opacity="${o.op ?? 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
  const fmt = n => Math.round(n).toLocaleString('en-US');

  Object.assign(FL.bookFigs, {
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
      return svg(400, 282, s, '図：疲れを作る条件（パイロット基礎教材の図 10-5 を描き直した模式図）。睡眠の不足・眠りの質・長く起きていること・体内時計のずれ・続けての作業・緊張や暑さが重なると、注意・反応・判断の余裕が小さくなります。眠気を感じないことは、能力が落ちていない証拠ではありません');
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
      return svg(400, 254, s, '図：左は水平旋回の荷重倍数（G、load factor）で、1 ÷ cos（バンク角）で計算しました。60° では 2 G です。右は G が体に与える影響で、正の G では血が足の方へ下がり、目から先に影響が出ます（米国の AIM 8-1-7）');
    },
    // hf.vision — by day the centre sees, by night look 5–10° to the side (ch10-fig10-3 redrawn; PHAK chapter 17)
    nightEye() {
      const panel = (x, dark) => {
        const cx = x + 96, cy = 120;
        let s = `<rect x="${x}" y="34" width="192" height="178" rx="10" fill="${dark ? '#05080f' : C.cy}" fill-opacity="${dark ? 0.9 : 0.06}" stroke="${C.grid}"/>`;
        s += `<circle cx="${cx}" cy="${cy}" r="70" fill="none" stroke="${C.mut}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
        s += `<circle cx="${cx}" cy="${cy}" r="16" fill="${dark ? '#000' : C.cy}" fill-opacity="${dark ? 1 : 0.35}" stroke="${dark ? C.rd : C.cy}" stroke-width="1.5"/>`;
        if (!dark) s += T(cx + 4, cy - 2, '★', { c: C.am, fs: 14 }) + T(cx, cy + 34, '中心で見る', { c: C.ink, b: 1, fs: 12 });
        else s += T(cx + 44, cy + 5, '★', { c: C.am, fs: 14 }) + A(cx + 18, cy, cx + 34, cy, C.gr, 2) + T(cx, cy + 34, '中心は見えにくい', { c: C.rd, b: 1, fs: 12 }) + T(cx + 44, cy - 14, '5〜10°', { c: C.gr, b: 1, fs: 12 });
        return s;
      };
      let s = T(100, 22, '明るい所', { c: C.ink, b: 1, fs: 13 }) + T(300, 22, '暗い所', { c: C.ink, b: 1, fs: 13 });
      s += panel(4, false) + panel(204, true);
      s += TL(100, 236, ['中心（錐体）が', '色と細かい所を見る'], { c: C.ink, fs: 12, lh: 16 });
      s += TL(300, 236, ['周り（桿体）が弱い光を', '見る：少し横を見る'], { c: C.ink, fs: 12, lh: 16 });
      return svg(400, 268, s, '図：明るい所では、目の中心（錐体の集まる中心窩）で色と細かい所を見ます。暗い所では中心の感度が低く、見えにくい所ができます。夜は、見たい物の 5〜10° 横を見て、周りの桿体で見ます（PHAK 第 17 章）');
    },
    // adm.error — the simplified information-processing model (UK CAA CAP 737, chapter 1, figure 3)
    infoProcess() {
      let s = '';
      s += box(6, 40, 74, 70, C.mut) + TL(43, 66, ['感覚', '目・耳'], { c: C.ink, fs: 12, lh: 18 });
      s += A(80, 75, 98, 75, C.ink, 2);
      s += box(100, 40, 82, 70, C.cy) + TL(141, 66, ['知覚', '意味をつかむ'], { c: C.ink, fs: 12, lh: 18 });
      s += A(182, 75, 200, 75, C.ink, 2);
      s += box(202, 24, 112, 168, C.vi, { op: 0.08, dash: '6 4' }) + T(258, 40, '注意（限りがある）', { c: C.vi, b: 1, fs: 12 });
      s += box(210, 50, 96, 58, C.am) + TL(258, 72, ['考える', '（作業記憶）'], { c: C.ink, fs: 12, lh: 17 });
      s += box(210, 122, 96, 58, C.gr) + TL(258, 144, ['慣れた手順', '（長期記憶）'], { c: C.ink, fs: 12, lh: 17 });
      s += A(314, 108, 330, 108, C.ink, 2);
      s += box(332, 74, 62, 68, C.rd) + TL(363, 100, ['反応', '操作・発言'], { c: C.ink, fs: 12, lh: 18 });
      s += `<path d="M363 142 L363 214 L43 214 L43 112" fill="none" stroke="${C.mut}" stroke-width="1.8" stroke-dasharray="6 4"/>` + `<path d="M43 110 L38 120 L48 120 Z" fill="${C.mut}"/>`;
      s += T(200, 232, '結果を見て、また感覚から始まる', { c: C.mut, fs: 12 });
      s += T(200, 254, 'どの段階でもエラーは起こる（聞き落とし・思い込み・押し間違い）', { c: C.ink, fs: 12 });
      return svg(400, 266, s, '図：人が情報を受け取り、処理し、反応するまでの簡単な模式図（英国 CAA の CAP 737 第 1 章の図をもとにした）。考える作業は注意を使い、注意には限りがあります。慣れた手順は、注意をあまり使わずに進みます');
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
      s += T(200, 244, '緑：穴がそろわなければ、次の 1 枚で止まる', { c: C.gr, fs: 12 });
      s += T(200, 262, '穴＝守りの弱いところ。腕と習慣を保つと穴は小さくなる', { c: C.mut, fs: 12 });
      return svg(400, 274, s, '図：スイスチーズのモデル（FAA の Risk Management Handbook の図 6-1 をもとにした模式図）。1 枚 1 枚が守りで、穴はその弱いところです。穴が全部そろったときだけ、危険やエラーが事故まで通り抜けます');
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
      return svg(400, 260, s, '図：チェックリストの使い方（パイロット基礎教材の図 10-7 を描き直した模式図）。項目を実行したら、実際の状態と照らして確かめます。途中で中断が入ったら、記憶で先へ進まず、確実に終えた所へ戻って照らし直します');
    },
    // adm.sa — perceive → comprehend → project, with the textbook's headwind example (ch10-fig10-8 redrawn)
    saLevels() {
      const col = (x, c, n, head, lines) => box(x, 30, 124, 168, c) + T(x + 62, 52, `${n} ${head}`, { c, b: 1, fs: 13 }) + TL(x + 62, 80, lines, { c: C.ink, fs: 12, lh: 18 });
      let s = col(4, C.cy, '①', '知覚', ['何が起きて', 'いるか', '', '向かい風が', '強くなり、', '地面に対する', '速さが落ちた']);
      s += col(138, C.am, '②', '理解', ['自分の飛行に', 'どう効くか', '', '着く時刻が遅れ', '燃料と日没の', '余裕が減る']);
      s += col(272, C.gr, '③', '予測', ['この先', 'どうなるか', '', 'このままなら', '余裕が足りない', '→ 早めに決める']);
      s += A(128, 114, 136, 114, C.ink, 2) + A(262, 114, 270, 114, C.ink, 2);
      s += `<path d="M334 198 L334 222 L66 222 L66 204" fill="none" stroke="${C.mut}" stroke-width="1.8" stroke-dasharray="6 4"/>` + `<path d="M66 200 L61 210 L71 210 Z" fill="${C.mut}"/>`;
      s += T(200, 240, '新しい観測と通報で、くり返し更新する', { c: C.mut, fs: 12 });
      return svg(400, 252, s, '図：状況認識の 3 つの段階（パイロット基礎教材の図 10-8 を描き直した模式図）。何が起きているかに気づき（知覚）、自分の飛行への影響を理解し、この先を予測します。予測は、新しい情報でくり返し更新します');
    },
    // adm.risk — the risk assessment matrix of PHAK chapter 2, figure 2-5
    riskMatrix() {
      const sev = ['壊滅的', '重大', '軽度', '無視できる'], lik = ['何度も起きる', 'いつか起きる', '起きにくい', 'まず起きない'];
      const cells = [['高い', '高い', '重い', '中'], ['高い', '重い', '中', '低い'], ['重い', '中', '中', '低い'], ['中', '中', '中', '低い']];
      const colr = { '高い': C.rd, '重い': C.am, '中': C.gr, '低い': C.mut };
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
      s += TL(10, y0 + 4 * h + 26, ['太い枠：PHAK の例。計器で飛ぶ資格のない操縦士が雲に入る', 'ことを「いつか起きる」「壊滅的」と見積もると、高いリスク'], { c: C.ink, a: 'start', fs: 12, lh: 17 });
      return svg(400, y0 + 4 * h + 66, s, '図：リスク・マトリックス（PHAK 第 2 章の図 2-5 をもとにした）。起こりやすさと結果の重大さの組み合わせで、リスクを高い・重い・中・低いに分けます。高いときは飛ばないか、リスクを減らす手を打ってから飛びます');
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
      return svg(400, 316, s, '図：対策のあとに残るリスクを確かめる（パイロット基礎教材の図 10-10 を描き直した模式図）。対策を決めただけで終えず、残るリスク（残留リスク）を見積もり直します。許せなければ、対策に戻って計画を変えるか、飛びません');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
