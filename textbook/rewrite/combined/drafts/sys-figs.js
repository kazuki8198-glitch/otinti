// DRAFT (W14, R2) — the figures of Part 1's chapter 'sys'「機体・エンジン・系統」 (textbook/rewrite/combined/DESIGN.md
// 3.3 第 1 部 第 6 章). No product reads this file: it is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/sys-figs.js textbook/rewrite/combined/drafts/sys.js
// and, when the chapter is registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys,
// same helpers there: C, svg, T, L, A, P, TL, PLANE, PLANE2, GLASS, planeTop, ac). Until then the few helpers they need are repeated here.
//
// What is here (one function per figure; the caption says what to look at, never where it was redrawn from):
//   new  sysAirframe   sys.airframe — the basic course's ch02-fig1 redrawn on the dark board (the members of the wing
//                      and the fuselage; semimonocoque). Source of the content: PHAK 25C ch. 3 (spars, ribs, stringers,
//                      skin; bulkheads/formers, stringers, stressed skin) and the Archer III POH 7.3 (spar box carry-through).
//   new  sysGearBrake  sys.gear — the Archer's hydraulic brakes (toe brakes and the hand brake each with their master
//                      cylinders, one shared reservoir, a caliper and disc on each main wheel) and the nose wheel steering
//                      (20° each side, shimmy dampener): Archer III POH 7.7.
//   new  sysFourStroke sys.piston — the basic course's ch03-fig3-2 redrawn (the four strokes, two turns of the crankshaft):
//                      PHAK 25C ch. 7 (four-stroke cycle).
//   new  sysEis        sys.eis — what the engine indications of the G1000-type Archer measure and where (POH 7.13 Fig. 7-2:
//                      RPM, OIL PSI, OIL °F, EGT, FFLOW GPH, FUEL QTY L/R) and the oil pressure bands of POH 2.9 drawn to
//                      scale (red line 25 and 115 psi, yellow 25–55 at idle and 95–115 ground warm-up, green 55–95).
//   new  sysRadioWaves sys.radio — ground wave (LF・MF), sky wave (HF) and space wave (VHF, line of sight) after the FAA
//                      Aviation Maintenance Technician Handbook — Airframe (FAA-H-8083-31A) ch. 11; the VHF COM band
//                      118.000–136.975 MHz, AM (same source).
//   redrawn fuelSystem sys.fuel — the same figure as book-figs.js with the reader's nit fixed (R1V 2.4: the note「タンクの
//                      下でも抜き取り検査」had no pointer): the sump of each tank is marked ▼ and named once, centred.
//   redrawn cockpitLayout, elecSystem, positionLights — the same drawings as book-figs.js; only words change so that a
//                      term's first use in the chapter is in the text with its English (STYLE「用語」; check-style's
//                      first-use form reads the figures too): the caption of cockpitLayout says「点火」for the magneto
//                      switches, elecSystem names the alternator 発電機（オルタネーター） and the standby gauges「予備の計器」,
//                      positionLights says「安全のために消してよいときを除く」(91.209(b): the pilot in command may turn them off).
// Every number drawn here is one the text gives with its source (sys.claims.json); text ≥ 12 (≥ 10 px at 390 px).
(function (FL) {
  'use strict';
  FL.bookFigs = FL.bookFigs || {};
  const DEG = Math.PI / 180;
  // the colours and helpers of book-figs.js (same values)
  const C = { ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.18)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff', bg: '#0b1422' };
  const svg = (w, h, body, cap = '') => `<figure class="bk-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cap}">${body}</svg>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || C.ink}" font-size="${o.fs || 12}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''}${o.halo ? ` stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
  const L = (x1, y1, x2, y2, c = C.ink, w = 1.5, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const A = (x1, y1, x2, y2, c, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), hh = 9; return L(x1, y1, x2, y2, c, w) + `<path d="M${x2} ${y2} L${(x2 - hh * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - hh * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - hh * Math.sin(a + 0.45)).toFixed(1)} Z" fill="${c}"/>`; };
  const P = (pts, c, w = 2, fill = 'none', dash = '') => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}" stroke="${c}" stroke-width="${w}" fill="${fill}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const TL = (x, y, lines, o = {}) => { const a = Array.isArray(lines) ? lines : String(lines).split('\n'), lh = o.lh || Math.round((o.fs || 12) * 1.35); return a.map((s, i) => T(x, y + i * lh, s, o)).join(''); };
  const box = (x, y, w, h, c, t, sub, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5"/>`
    + T(x + w / 2, y + (sub ? 19 : h / 2 + 5), t, { c: o.tc || c, b: 1, fs: 13 }) + (sub ? TL(x + w / 2, y + 37, sub, { c: C.ink, fs: 12, lh: 15 }) : '');
  const PLANE = '#dfe6ee', PLANE2 = '#9fb3c8', GLASS = '#5d7fa3';
  // the top view of book-figs.js (nose up), for positionLights
  const planeTop = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${k})">`
    + `<path d="M-68 -8 L68 -8 L66 6 L-66 6 Z" fill="${PLANE}"/><path d="M-22 38 L22 38 L21 45 L-21 45 Z" fill="${PLANE2}"/>`
    + `<path d="M0 -50 C5 -48 7 -40 7 -28 L5 30 L2 50 L-2 50 L-5 30 L-7 -28 C-7 -40 -5 -48 0 -50 Z" fill="${PLANE}"/><path d="M-5 -26 L5 -26 L4 -14 L-4 -14 Z" fill="${GLASS}"/>`
    + `<line x1="-12" y1="-52" x2="12" y2="-52" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const ac = id => FL.physics.AIRCRAFT.find(a => a.id === id);

  Object.assign(FL.bookFigs, {
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
      s += box(14, 148, 170, 34, C.am, 'マスターシリンダー ×2') + box(216, 148, 170, 34, C.am, 'マスターシリンダー');
      s += A(99, 124, 99, 146, C.ink, 2) + A(301, 124, 301, 146, C.ink, 2);
      s += P([[110, 29], [7, 29], [7, 165], [14, 165]], C.vi, 1.5, 'none', '4 3') + P([[290, 29], [393, 29], [393, 165], [386, 165]], C.vi, 1.5, 'none', '4 3');
      // the hydraulic lines to the two main wheels (left pedal → left wheel, right pedal → right wheel; the hand brake → both)
      s += P([[64, 182], [64, 236]], C.am, 3) + P([[150, 182], [150, 204], [336, 204], [336, 236]], C.am, 3);
      s += P([[360, 182], [360, 220], [64, 220]], C.am, 2, 'none', '6 3') + `<circle cx="64" cy="220" r="3.5" fill="${C.am}"/><circle cx="336" cy="220" r="3.5" fill="${C.am}"/>`;
      const wheel = (cx, t) => `<rect x="${cx - 16}" y="238" width="32" height="56" rx="8" fill="#141f30" stroke="${C.ink}" stroke-width="2"/>`
        + `<rect x="${cx - 3}" y="248" width="6" height="36" fill="${C.mut}"/><rect x="${cx + 3}" y="258" width="10" height="16" rx="2" fill="${C.am}"/>` + T(cx, 312, t, { c: C.ink, b: 1 });
      s += wheel(64, '左の主輪') + wheel(336, '右の主輪') + T(200, 300, '実線：ペダル　点線：ハンドブレーキ', { c: C.mut });
      s += TL(200, 256, ['主輪の円盤（ディスク）を', 'キャリパーではさむ'], { c: C.am, fs: 12, lh: 16 });
      s += L(14, 326, 386, 326, C.grid, 1) + T(200, 346, '前輪：ペダルで左右 20° まで向きが変わる', { c: C.cy, b: 1 }) + T(200, 364, 'シミー（前輪の振れ）を抑えるダンパー付き', { c: C.ink });
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
      const items = [['①', '回転（RPM）', C.gr], ['②', '油圧（OIL PSI）', C.am], ['③', '油温（OIL °F）', C.am], ['④', 'EGT（°F）', C.rd], ['⑤', '燃料流量（GPH）', C.cy], ['⑥', '燃料の量（L・R）', C.cy]];
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
      s += T(95, 61, `左タンク ${cap} gal`, { c: C.ink, b: 1, fs: 12 }) + T(305, 61, `右タンク ${cap} gal`, { c: C.ink, b: 1, fs: 12 }) + T(200, 26, '低翼：タンクは翼の中（重力では送れない）', { c: C.mut, fs: 12 });
      for (const x of [142, 258]) s += `<path d="M${x - 6} 72 L${x + 6} 72 L${x} 82 Z" fill="${C.rd}"/>`;
      s += T(200, 96, '▼＝各タンクの抜き取り口', { c: C.rd, fs: 12 });
      s += P([[95, 68], [95, 116], [160, 116]], C.cy, 2.5) + P([[305, 68], [305, 116], [200, 116]], C.cy, 2.5);
      s += `<circle cx="180" cy="116" r="20" fill="#13233a" stroke="${C.am}" stroke-width="2"/>` + `<line x1="180" y1="116" x2="166" y2="104" stroke="${C.am}" stroke-width="3"/>` + L(180, 136, 180, 160, C.cy, 2.5);
      s += T(206, 140, '燃料セレクター', { c: C.am, b: 1, a: 'start', fs: 12 }) + TL(206, 156, ['LEFT・RIGHT・OFF', '（BOTH はない）'], { c: C.am, a: 'start', fs: 12, lh: 15 });
      const step = (y, t, c, note) => A(180, y - 22, 180, y - 4, C.cy, 2.5) + `<rect x="96" y="${y - 4}" width="168" height="26" rx="6" fill="${c}" fill-opacity="0.12" stroke="${c}"/>` + T(180, y + 13, t, { c, b: 1, fs: 12 }) + (note ? T(270, y + 13, note, { c: C.mut, a: 'start', fs: 12 }) : '');
      s += step(198, 'ストレーナー（ろ過）', C.cy, '← 抜き取り検査') + step(246, '電動燃料ポンプ（補助）', C.gr, '← 離着陸で ON') + step(294, 'エンジン駆動の燃料ポンプ', C.ink, '') + step(342, 'キャブレター → エンジン', C.am, '');
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
      for (const x of [70, 330]) s += `<path d="M${x - 32} 214 L${x - 32} 230 L${x + 32} 230 L${x + 32} 214" stroke="${C.ink}" stroke-width="5" fill="none" stroke-linecap="round"/><line x1="${x}" y1="230" x2="${x}" y2="244" stroke="${C.ink}" stroke-width="5"/>` + T(x, 262, '操縦輪', { c: C.mut, fs: 12 });
      s += `<rect x="176" y="212" width="48" height="58" rx="6" fill="#141f30" stroke="${C.mut}"/><circle cx="190" cy="230" r="7" fill="#2a2a2a" stroke="${C.mut}"/><circle cx="210" cy="230" r="7" fill="${C.rd}"/>`;
      s += `<rect x="230" y="222" width="12" height="16" rx="2" fill="${C.am}"/>` + TL(248, 228, ['キャブ', 'ヒート'], { c: C.am, a: 'start', fs: 12, lh: 15 });
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
      s += see(96, C.rd, C.gr, ['左に赤・右に緑', '同じ向きへ'], C.ink) + see(140, C.gr, C.rd, ['左に緑・右に赤', 'こちらへ来る！'], C.rd) + `<circle cx="272" cy="184" r="7" fill="#f2f2f2"/>` + T(306, 182, '白だけ', { c: C.ink, b: 1, a: 'start', fs: 12 }) + T(306, 198, '遠ざかっている', { c: C.ink, a: 'start', fs: 12 });
      s += TL(200, 236, ['衝突防止灯（ビーコン・ストロボ）は、付いていれば', 'いつも点灯（米国の 14 CFR 91.209。', '安全のために消してよいときを除く）'], { c: C.am, fs: 12, lh: 16 });
      return svg(400, 280, s, '図：航空灯（左の翼端が赤、右の翼端が緑、尾が白）。相手の灯火の見え方で、相手の向きがわかります（AFH 第 11 章）');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
