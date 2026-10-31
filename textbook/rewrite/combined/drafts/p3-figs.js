// DRAFT (W29, R3) — the figures of Part 3's chapters 'navp'・'navr'・'navd' and the new chapter 'night'「夜間の飛行」
// (textbook/rewrite/combined/DESIGN.md 3.3 第 3 部 第 27〜30 章, 4.2 kiso08・kiso11, 7.2 W29). No product reads this file: it
// is checked with the chapter draft
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p3-figs.js textbook/rewrite/combined/drafts/p3.js
// and, when the chapters are registered, its functions go into flight-lab/src/book-figs.js (FIG) as they are (same keys;
// the helpers below are copied unchanged from book-figs.js, so the functions run the same way there).
//
// What is here (one function per figure; the caption says what to look at):
//   redrawn  sectionalSymbols  nav.chart — the same drawing and numbers. Two changes: the stamp「模式図（LAB は架空）・NOT FOR
//                              NAVIGATION」now sits on its own dark plate, so the outer Class C ring no longer runs over it
//                              (R1V nit 8, PROGRESS「第 2〜6 部だけが使う図」: W33 → done here, the chapter's own figure); the
//                              caption opens with FL.terms' first-use form 区分航空図（セクショナルチャート、sectional chart）(a
//                              figure is read before the text, so the chapter's first use is here: check-style).
//   new      dmeSlant          nav.dme — the basic course's ch08-fig8-9「局の真上でも高度差があれば距離はゼロにならない」redrawn
//                              (PROVENANCE ch08-fig8-9, plan redraw): a side view, the station on the ground, one airplane right
//                              above it 6,000 ft up (DME ≈ 1.0 NM), one 5.0 NM out at the same height (DME ≈ 5.1 NM). The
//                              numbers are computed here (1 NM = 6,076.12 ft, Pythagoras): AIM 1-1-7 (slant range), IFH ch. 9.
//   new      etpPnr            nav.pnr — new: one line A → B (200 NM), a headwind out / tailwind back (GS 80 / 120 kt), the
//                              equal-time point ETP (AC 120-42B appendix 1's definition) and 最大進出距離 for a usable time of
//                              3.0 h, both computed here from the formulas the section derives (an example: 例題).
//   new      nightLights       ops.night — new from AFH chapter 11 and AIM 2-1-4・2-1-9・2-1-10: a lighted runway from above
//                              (white edge lights, yellow for the last 2,000 ft of an instrument runway, green threshold / red end
//                              lights, PAPI at the left), a blue-edged taxiway with green centre lights, the beacon (white and
//                              green: a lighted land airport) and a red obstruction light. A schematic (NOT FOR NAVIGATION).
//   new      nightClimb        ops.nightld — new from AFH chapter 11 figure 11-5「Establish a positive climb」: after lift-off
//                              over the dark area beyond the runway the outside cues are gone; the attitude indicator, the
//                              vertical speed indicator and the altimeter must all show a climb. No number.
// Unchanged and not repeated here: windTriangle (nav.plan: navb.wind's figure, W18/W21), vorRadials (nav.vor: its full-size
// fill is a known warn of check-figures, W21), diversionGeometry (nav.divert). Their words are FL.terms' names already.
// Every number drawn here is one the text gives with its source (p3.claims.json); text ≥ 12 (≥ 10 px at 390 px).
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
  const BOX = (x, y, w, h, c, title = '', lines = [], o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 8}" fill="${o.fill || c}" fill-opacity="${o.fill ? 1 : 0.12}" stroke="${c}" stroke-width="${o.sw || 1.5}"/>`
    + (title ? T(x + w / 2, y + (o.ty || 20), title, { c: o.tc || c, b: 1, fs: o.fs || 13 }) : '') + (lines.length ? TL(x + w / 2, y + (o.ly || (title ? 38 : 20)), lines, { c: o.lc || C.ink, fs: o.lfs || 12 }) : '');
  const PLANE = '#dfe6ee', PLANE2 = '#9fb3c8', GLASS = '#5d7fa3';
  const planeSide = (x, y, k = 1, o = {}) => `<g transform="translate(${x} ${y}) rotate(${-(o.pitch || 0)}) scale(${k})">`
    + `<path d="M50 -1 C48 -8 38 -11 26 -12 L14 -16 C2 -18 -10 -16 -18 -12 L-50 -5 L-50 1 L-14 6 C6 8 30 7 44 5 C49 4 51 2 50 -1 Z" fill="${PLANE}"/>`
    + `<path d="M12 -15 C4 -17 -6 -16 -14 -12 L-12 -9 L10 -9 Z" fill="${GLASS}"/><path d="M-38 -6 L-50 -27 L-57 -27 L-54 -3 Z" fill="${PLANE}"/>`
    + `<rect x="-60" y="-4" width="20" height="3.5" rx="1.5" fill="${PLANE2}"/><ellipse cx="6" cy="5" rx="19" ry="2.6" fill="${PLANE2}"/>`
    + (o.flap ? `<path d="M-12 5 l${(-9 * Math.cos(o.flap * DEG)).toFixed(1)} ${(9 * Math.sin(o.flap * DEG)).toFixed(1)}" stroke="${C.am}" stroke-width="3" stroke-linecap="round"/>` : '')
    + (o.gear === false ? '' : `<path d="M2 7 L0 15 M40 5 L40 15" stroke="${PLANE2}" stroke-width="2"/><circle cx="0" cy="16" r="3.4" fill="#5b6b7e"/><circle cx="40" cy="16" r="3" fill="#5b6b7e"/>`)
    + `<line x1="52" y1="-15" x2="52" y2="13" stroke="${C.mut}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const NFN = (x, y, a = 'end') => T(x, y, '模式図・NOT FOR NAVIGATION', { c: C.am, fs: 12, a, b: 1 });
  // W29: the numbers of the figures that the text also gives (one place for both)
  const NM_FT = 6076.12;                                   // 1 NM in feet (1,852 m ÷ 0.3048 m)
  const P3 = {   // the same formulas as p3.js's (kept local: FL gets no new name)
    dme: (hFt, nm) => Math.sqrt(nm * nm + (hFt / NM_FT) ** 2),          // slant range (NM) at a height hFt above the station and nm out
    etp: (D, gsOut, gsHome) => D * gsHome / (gsOut + gsHome),             // the equal-time point, NM from the departure point
    pnrT: (E, gsOut, gsHome) => E * gsHome / (gsOut + gsHome),            // time (h) out to the farthest point one can still return from
  };

  Object.assign(FL.bookFigs, {
    // ---------------------------------------------------------------- navp（地図・計画）
    sectionalSymbols() {
      // a schematic sectional around the fictional LAB (north up), drawn with the symbols of the FAA Chart Users' Guide (2026-07-09):
      // positions from the app's waypoints and navaids (avionics.js), LAB's elevation (GROUND_FT), runway length (LAB_RWY, charted in
      // hundreds of feet with 70 as the rounding point) and the Class C rings of the radio chapters (5 / 10 NM, 4,000 ft above the field).
      // W29: the stamp at the bottom sits on its own dark plate (the outer ring passed over it: R1V nit 8); the caption's first use.
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
      // W29: the stamp on its own plate (drawn after the rings, so nothing crosses it)
      s += `<rect x="2" y="330" width="290" height="19" rx="3" fill="#13202f"/>` + A(380, 330, 380, 300, C.mut, 2) + T(380, 344, '北', { c: C.mut, fs: 12 }) + T(8, 344, '模式図（LAB は架空）・NOT FOR NAVIGATION', { c: C.mut, a: 'start', fs: 12 });
      const key = [['①', ['空港の記号。青は管制塔あり（マゼンタはなし）。', '上の ★ は回転灯台']], ['②', ['CT – 118.3：管制塔の周波数', '（CT の後に ★ があれば、管制塔は時間を限って運用）']],
        ['③', [`${elev}：標高（ft）・L：夜の滑走路灯・${rwy}：最長の滑走路`, `（${(Math.round(lenFt / 10) * 10).toLocaleString('en-US')} ft を百 ft 単位で）・122.95：UNICOM`]], ['④', [`マゼンタの実線：Class C 空域。上が上限、下が下限`, `（百 ft・MSL。${top}＝${(top * 100).toLocaleString('en-US')} ft、SFC＝地表）`]],
        ['⑤', [`障害物（LAB-A の塔）：${elev + 330} は海面から、`, '(330) は地面からの高さ（ft）']], ['⑥', ['MEF：その区画でいちばん高いものに余裕を足した高さ', '（2⁵ ＝ 2,500 ft MSL。図の外に高い塔がある想定）']], ['⑦', ['VOR のコンパスローズ（0° が磁北）と、名前・周波数・識別符号']], ['⑧', [`等偏差線：真北と磁北の差（この教材は ${PH.MAGVAR_W}°W）`]]];
      let y = 372;
      for (const [n, lines] of key) { s += tag(14, y - 4, n) + TL(30, y, lines, { c: C.ink, a: 'start', fs: 12, lh: 16 }); y += lines.length * 16 + 5; }
      return svg(400, y + 4, s, '図：区分航空図（セクショナルチャート、sectional chart）の記号（架空の LAB 空港のまわりを描いた模式図。記号は FAA Chart Users\' Guide のもの）。本物の図は 56 日ごとに改訂されるので、いつも最新の版を使います');
    },
    // ---------------------------------------------------------------- navr（電波航法）
    dmeSlant() {
      // AIM 1-1-7: DME gives the slant range, not the horizontal distance. A side view (heights exaggerated): the station, an airplane
      // right above it and one 5 NM out, both 6,000 ft above the station. The numbers are computed (P3.dme).
      const h = 6000, x0 = 70, gy = 196, top = 76, k = 56;      // k: px per NM along the ground
      const over = P3.dme(h, 0), far = P3.dme(h, 5);
      let s = `<rect x="0" y="0" width="400" height="250" fill="${C.bg}"/>`;
      s += L(10, gy, 390, gy, C.mut, 2);
      // the station (an antenna on a small building)
      s += `<rect x="${x0 - 12}" y="${gy - 14}" width="24" height="14" fill="#2a3b52" stroke="${C.cy}"/>` + L(x0, gy - 14, x0, gy - 30, C.cy, 2) + `<circle cx="${x0}" cy="${gy - 32}" r="3" fill="${C.cy}"/>`;
      s += T(x0, gy + 20, 'VOR／DME の局', { c: C.cy });
      // the airplane over the station, and the one 5 NM out
      const x5 = x0 + 5 * k;
      s += planeSide(x0, top, 0.45, { gear: false }) + planeSide(x5, top, 0.45, { gear: false });
      s += L(x0, top + 6, x0, gy - 34, C.am, 2, '5 4') + TL(x0 + 10, 118, ['局からの高さ', '6,000 ft ≒ 1 NM'], { c: C.am, a: 'start', lh: 16 });
      s += T(x0, top - 22, `DME 約 ${over.toFixed(1)} NM`, { c: C.am, b: 1 });
      s += L(x0, gy - 32, x5, top + 6, C.gr, 2.5) + T(x5 - 40, top - 22, `DME 約 ${far.toFixed(1)} NM`, { c: C.gr, b: 1 });
      s += T(250, 100, '斜めの距離（DME の表示）', { c: C.gr, halo: 1 });
      s += A(x0 + 4, gy + 38, x5, gy + 38, C.ink, 1.5) + A(x5 - 4, gy + 38, x0, gy + 38, C.ink, 1.5) + T((x0 + x5) / 2, gy + 32, '地図の上の水平の距離 5.0 NM', { c: C.ink, halo: 1 });
      s += T(390, 20, '模式図（高さは拡大）', { c: C.mut, a: 'end' });
      return svg(400, 250, s, `図：距離測定装置（DME：distance measuring equipment）が出すのは、局のアンテナまでの斜めの距離です。局の真上でも、局からの高さの分（6,000 ft で約 ${over.toFixed(1)} NM）が出ます。局から離れるほど、水平の距離との差は小さくなります（米国の AIM 1-1-7）`);
    },
    // ---------------------------------------------------------------- navp（発展：最大進出距離と等時点）
    etpPnr() {
      // an example (例題): A → B 200 NM, TAS 100 kt, a 20 kt headwind on the way out (GS out 80 kt, GS home 120 kt), usable time 3.0 h.
      // ETP from A = D × GSh ÷ (GSo + GSh); time to the farthest point = E × GSh ÷ (GSo + GSh), its distance = that time × GSo.
      const D = 200, go = 80, gh = 120, E = 3.0, etp = P3.etp(D, go, gh), t = P3.pnrT(E, go, gh), pnr = t * go;
      const x0 = 30, x1 = 370, y = 110, X = d => x0 + (x1 - x0) * d / D;
      let s = `<rect x="0" y="0" width="400" height="262" fill="${C.bg}"/>`;
      s += L(x0, y, x1, y, C.ink, 3);
      s += `<circle cx="${x0}" cy="${y}" r="7" fill="${C.cy}"/><circle cx="${x1}" cy="${y}" r="7" fill="${C.cy}"/>` + T(x0, y + 26, '出発地 A', { c: C.cy, a: 'start' }) + T(x1, y + 26, '目的地 B', { c: C.cy, a: 'end' });
      s += T((x0 + x1) / 2, y - 64, `A → B ${D} NM・真対気速度 100 kt・往きは向かい風 20 kt`, { c: C.mut });
      s += A(230, y - 50, 170, y - 50, C.mut, 2) + T(250, y - 46, '風', { c: C.mut });
      // the ETP
      const xe = X(etp), xp = X(pnr);
      s += L(xe, y - 18, xe, y + 18, C.am, 3) + T(xe, y + 46, `等時点 ${etp} NM`, { c: C.am, b: 1 }) + TL(xe, y + 64, ['A へ戻るのと B へ進むのが', '同じ時間'], { c: C.am, lh: 16 });
      s += L(xp, y - 18, xp, y + 18, C.gr, 3) + T(xp, y - 24, `最大進出距離 ${pnr} NM`, { c: C.gr, b: 1 });
      s += TL(x0, 222, [`往き ${go} kt・帰り ${gh} kt・飛べる時間 ${E.toFixed(1)} 時間（予備を除く）`, `ここまで ${t.toFixed(1)} 時間で進み、${(E - t).toFixed(1)} 時間で A へ戻れる`], { c: C.ink, a: 'start', lh: 17 });
      return svg(400, 262, s, `図：等時点と最大進出距離（例題の数。風の向きで、等時点は真ん中の ${D / 2} NM からずれます）。どちらも、往きと帰りの対地速度から計算します`);
    },
    // ---------------------------------------------------------------- night（夜間の飛行）
    nightLights() {
      // AFH chapter 11 and AIM 2-1-4 (runway edge, threshold and end lights), 2-1-2 (PAPI), 2-1-9 (beacon colours), 2-1-10 (taxiway
      // edge blue, centreline green). A lighted runway seen from above, landing from the left (a schematic).
      const W = '#f4f1e6', Y = '#ffd34d', G = '#46e06a', R = '#ff4b3e', B = '#4f8dff';
      const x0 = 60, x1 = 360, yT = 70, yB = 110, dot = (x, y, c, r = 3.2) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${c}"/>`;
      let s = `<rect x="0" y="0" width="400" height="330" fill="#060b14"/>`;
      s += `<rect x="${x0}" y="${yT}" width="${x1 - x0}" height="${yB - yT}" fill="#141c28"/>`;
      // edge lights: white, the last stretch yellow (an instrument runway, seen landing from the left)
      for (let x = x0 + 10; x <= x1 - 10; x += 20) { const c = x > x1 - 80 ? Y : W; s += dot(x, yT - 4, c) + dot(x, yB + 4, c); }
      // threshold (green toward the landing airplane) and the far end (red toward the airplane on the runway)
      for (let y = yT + 2; y <= yB - 2; y += 8) s += dot(x0 - 4, y, G) + dot(x1 + 4, y, R);
      // PAPI at the left of the runway, near the touchdown zone: 2 white and 2 red
      [W, W, R, R].forEach((c, i) => { s += dot(x0 + 40 + i * 10, yT - 22, c, 3.6); });
      // the taxiway: blue edge lights, green centreline
      const tx = 210;
      for (let y = yB + 22; y <= 230; y += 16) s += dot(tx - 16, y, B) + dot(tx + 16, y, B) + dot(tx, y + 8, G, 2.6);
      s += `<rect x="${tx - 10}" y="${yB + 8}" width="20" height="${230 - yB - 8}" fill="#141c28" opacity="0.6"/>`;
      // the beacon and an obstruction
      s += dot(330, 240, W, 5) + dot(344, 240, G, 5) + T(337, 262, '空港の灯台', { c: C.ink }) + T(337, 278, '白と緑：陸上の空港', { c: C.mut });
      s += L(40, 250, 40, 210, C.mut, 2) + dot(40, 206, R, 4.5) + T(40, 272, '障害物：赤', { c: C.ink });
      // labels
      s += A(x0 - 10, yB + 40, x0 - 6, yB - 6, G, 1.5) + T(x0 - 6, yB + 54, '進入端：緑', { c: G, a: 'start' });
      s += T(x1 - 10, yT - 30, '終わりの側：黄（計器進入の滑走路）', { c: Y, a: 'end' }) + T((x0 + x1) / 2, yB + 22, '滑走路の縁：白', { c: W });
      s += T(x1 + 2, yB + 30, '止まる側の端：赤', { c: R, a: 'end' });
      s += T(x0 + 55, yT - 34, 'PAPI（左側）', { c: C.ink });
      s += T(tx + 26, 200, '誘導路の縁：青', { c: B, a: 'start' }) + T(tx + 26, 216, '中心：緑', { c: G, a: 'start' });
      s += A(20, 150, 50, 150, C.mut, 2) + T(16, 140, '着陸', { c: C.mut, a: 'start' });
      s += NFN(392, 320);
      return svg(400, 330, s, '図：夜の空港の灯火（上から見た模式図）。滑走路の縁は白で、計器進入の滑走路では終わりの 2,000 ft が黄です。進入端は緑、止まる側の端は赤、誘導路の縁は青です。空港の灯台は白と緑が交互に光ります（AFH 第 11 章・米国の AIM 2-1）');
    },
    nightClimb() {
      // AFH chapter 11 figure 11-5: after lift-off into the dark, the attitude indicator, the VSI and the altimeter must all show a climb.
      let s = `<rect x="0" y="0" width="400" height="250" fill="#060b14"/>`;
      // the runway with its edge lights, then the dark area
      s += L(10, 200, 170, 200, '#3a4a5e', 6);
      for (let x = 14; x <= 166; x += 16) s += `<circle cx="${x}" cy="196" r="2.6" fill="#f4f1e6"/>`;
      s += L(170, 200, 390, 200, '#1a2433', 6) + T(280, 224, '滑走路の先は暗い（目印がない）', { c: C.mut });
      s += `<path d="M120 196 Q 200 170 300 112" stroke="${C.gr}" stroke-width="2.5" fill="none" stroke-dasharray="6 5"/>`;
      s += planeSide(300, 110, 0.5, { pitch: 10, gear: false });
      s += BOX(12, 14, 230, 112, C.am, '外が見えないので、計器で確かめる', ['姿勢：上昇の姿勢', '昇降率：上昇（＋）', '高度：増えている', '速度：上昇の速度'], { lc: C.ink, ly: 44 });
      return svg(400, 250, s, '図：暗い所への離陸。浮揚すると外の目印がなくなります。姿勢指示器・昇降計（昇降率計、vertical speed indicator）・高度計（altimeter）が、どれも上昇を示していることを確かめます（AFH 第 11 章の図 11-5 をもとにした模式図）');
    },
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
