// CADET — aircraft/boeing.js : the 737NG-style display system for the first-officer phase's jet.
// The b737 used to fly behind the Archer's G1000 (the type-rating design's documented limit); this is its
// own glass, drawn the Boeing way: a PFD (attitude, speed and altitude tapes, the FMA's three columns),
// an ND (MAP arc and ROSE), upper and lower EICAS (N1 / EGT / FF, memos and warnings, fuel and oil), a
// standby ISFD, and an FMC CDU limited to the basic pages (IDENT / POS INIT / RTE, with the line
// operation's routes). Everything here only draws and keeps the display system's own state (the EFIS's
// ND mode and range, which DU shows what, the CDU's pages and scratchpad): the flying values come from
// the physics state, the modes from the avionics / autopilot the MCP is wired to (flight/autopilot.js),
// and nothing drawn is decorative — the cockpit's MCP / EFIS / DU / CDU controls all land somewhere real.
// The colours and formats follow the type: green active modes and readouts, magenta selected values,
// cyan memos, amber cautions, the sky blue over the brown earth. Not the full FMC (no performance
// database, no VNAV path): what is simplified is listed in the phase report, as with everything else.

import * as THREE from 'three';

const C = {
  green: '#3ae06a', magenta: '#ff4fd8', cyan: '#35d3e8', amber: '#ffb02e', red: '#ff3b30',
  white: '#e8f2f8', dim: '#8fa5b5', sky: '#2f7fd0', gnd: '#a06a28', tape: 'rgba(8,12,16,0.72)',
  line: '#cfe3ee', dark: '#05070a',
};
const KG_PER_GAL = 3.04;      // (the line phase's own conversion: a US gallon of jet fuel ≈ 3.04 kg)

export function createBoeingGlass(FL, makeCanvas) {
  const P = FL.physics, AV = FL.avionics, clamp = P.clamp;
  function unit(w, h) {
    const canvas = makeCanvas(w, h);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
    const g = canvas.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    return { canvas, g, texture, w, h };
  }
  const U = { pfd: unit(1024, 768), nd: unit(1024, 768), eicasU: unit(1024, 768), eicasL: unit(768, 576), cdu: unit(512, 640), stby: unit(384, 384) };
  const stats = { pfd: 0, nd: 0, eicasU: 0, eicasL: 0, cdu: 0, stby: 0 };
  const state = {
    efis: { ndMode: 'MAP', ndRange: 40 },
    du: { out: 'PFD', inb: 'ND', low: 'EICAS' },
    route: null,
    cdu: { page: 'IDENT', scratch: '', msg: '', from: '', to: '', ref: '', edited: false, pendingExec: false, active: false, posSet: false, dirty: true },
  };
  const txt = (g, str, x, y, size, col, align = 'left', bold = false) => {
    g.fillStyle = col; g.font = `${bold ? '700 ' : ''}${size}px "Segoe UI", Arial, sans-serif`;
    g.textAlign = align; g.textBaseline = 'middle'; g.fillText(str, x, y);
  };
  const fmtAlt = ft => { const v = Math.round(ft); const a = Math.abs(v); return (v < 0 ? '-' : '') + (a >= 1000 ? `${Math.floor(a / 1000)},${String(a % 1000).padStart(3, '0')}` : `${a}`); };

  // ================================================================ the PFD
  function drawPFD(g, s, av) {
    const o = s.out, W = 1024, H = 768;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const cx = 470, cy = 395, R = 238;
    // the attitude ball
    g.save();
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
    g.translate(cx, cy); g.rotate(-(o.bank || 0) * Math.PI / 180);
    const ppd = 4.6, py = clamp((o.pitch || 0) * ppd, -R * 1.2, R * 1.2);
    g.fillStyle = C.sky; g.fillRect(-R * 1.5, -R * 1.5 + py, R * 3, R * 1.5);
    g.fillStyle = C.gnd; g.fillRect(-R * 1.5, py, R * 3, R * 1.5);
    g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-R * 1.5, py); g.lineTo(R * 1.5, py); g.stroke();
    g.lineWidth = 2;
    for (const pd of [-20, -10, 10, 20]) {
      const y = py - pd * ppd, w = Math.abs(pd) === 10 ? 46 : 70;
      g.beginPath(); g.moveTo(-w, y); g.lineTo(w, y); g.stroke();
      if (pd !== 0) { txt(g, `${Math.abs(pd)}`, -w - 16, y, 17, '#fff', 'right'); txt(g, `${Math.abs(pd)}`, w + 16, y, 17, '#fff', 'left'); }
    }
    g.restore();
    // the bank scale and the fixed symbol
    g.strokeStyle = '#fff'; g.lineWidth = 2.5;
    for (const ba of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) {
      const a = (-90 + ba) * Math.PI / 180, r1 = R - 2, r2 = R - (ba % 30 === 0 ? 20 : 12);
      g.beginPath(); g.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)); g.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a)); g.stroke();
    }
    const bptr = (-90 - (o.bank || 0)) * Math.PI / 180;
    g.fillStyle = '#ffd94a';
    g.beginPath(); g.moveTo(cx + (R - 26) * Math.cos(bptr), cy + (R - 26) * Math.sin(bptr));
    g.lineTo(cx + (R - 2) * Math.cos(bptr - 0.045), cy + (R - 2) * Math.sin(bptr - 0.045));
    g.lineTo(cx + (R - 2) * Math.cos(bptr + 0.045), cy + (R - 2) * Math.sin(bptr + 0.045)); g.fill();
    g.strokeStyle = '#ffd94a'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(cx - 118, cy); g.lineTo(cx - 42, cy); g.lineTo(cx - 42, cy + 20); g.moveTo(cx + 118, cy); g.lineTo(cx + 42, cy); g.lineTo(cx + 42, cy + 20); g.stroke();
    g.fillStyle = '#ffd94a'; g.fillRect(cx - 4, cy - 4, 8, 8);
    // the flight director's bars (the same targets the G1000's FD shows: av.fd)
    if (av && av.fd && av.fd.on) {
      const fx = cx + clamp(-((av.fd.bank || 0) - (o.bank || 0)) * 3.4, -95, 95), fy = cy + clamp(((av.fd.pitch || 0) - (o.pitch || 0)) * ppd, -80, 80);
      g.strokeStyle = C.green; g.lineWidth = 4;
      g.beginPath(); g.moveTo(fx - 58, fy); g.lineTo(fx + 58, fy); g.stroke();
      g.beginPath(); g.moveTo(fx, fy - 52); g.lineTo(fx, fy + 52); g.stroke();
    }
    // the speed tape (left)
    const ias = Math.max(0, o.ias || 0), sx0 = 26, sx1 = 178, spdPx = 3.1;
    g.fillStyle = C.tape; g.fillRect(sx0, cy - 190, sx1 - sx0, 380);
    g.save(); g.beginPath(); g.rect(sx0, cy - 190, sx1 - sx0, 380); g.clip();
    for (let v = Math.max(0, Math.floor((ias - 66) / 10) * 10); v < ias + 68; v += 10) {
      const y = cy + (ias - v) * spdPx; if (y < cy - 196 || y > cy + 196) continue;
      g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(sx1 - 18, y); g.lineTo(sx1, y); g.stroke();
      if (v % 20 === 0) txt(g, `${v}`, sx1 - 26, y, 25, C.white, 'right', true);
    }
    if (s.onGround && s.A.v && s.A.v.rotate) {           // V1 / VR bugs on the ground roll
      for (const [vv, lab] of [[s.A.v.rotate - 5, 'V1'], [s.A.v.rotate, 'VR']]) {
        const y = cy + (ias - vv) * spdPx; if (y > cy - 190 && y < cy + 190) { g.fillStyle = C.cyan; g.fillRect(sx1 - 4, y - 2, 10, 4); txt(g, lab, sx1 + 16, y, 18, C.cyan, 'left', true); }
      }
    }
    g.restore();
    g.fillStyle = '#0a0e12'; g.fillRect(sx0 - 4, cy - 27, sx1 - sx0 + 14, 54);
    g.strokeStyle = C.line; g.lineWidth = 2; g.strokeRect(sx0 - 4, cy - 27, sx1 - sx0 + 14, 54);
    txt(g, `${Math.round(ias)}`, sx1 - 16, cy + 1, 36, C.green, 'right', true);
    const at = av && av.at;
    txt(g, at && at.arm ? `${at.spd}` : '---', sx1 - 16, cy - 216, 26, C.magenta, 'right', true);
    if ((o.mach || 0) >= 0.4) txt(g, `MACH ${(o.mach).toFixed(3).slice(1)}`, sx0 + 4, cy + 224, 22, C.green, 'left', true);
    // the altitude tape (right)
    const alt = AV && av ? AV.indicatedAlt(o.altTrue || 0, s.qnh, av.baro) : (o.altTrue || 0), ax0 = 776, ax1 = 968, altPx = 0.30;
    g.fillStyle = C.tape; g.fillRect(ax0, cy - 190, ax1 - ax0, 380);
    g.save(); g.beginPath(); g.rect(ax0, cy - 190, ax1 - ax0, 380); g.clip();
    for (let v = Math.max(-1000, Math.floor((alt - 660) / 100) * 100); v < alt + 680; v += 100) {
      const y = cy + (alt - v) * altPx; if (y < cy - 196 || y > cy + 196) continue;
      g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(ax0, y); g.lineTo(ax0 + 18, y); g.stroke();
      if (v % 200 === 0) txt(g, fmtAlt(v), ax0 + 26, y, 23, C.white, 'left', true);
    }
    g.restore();
    g.fillStyle = '#0a0e12'; g.fillRect(ax0 - 10, cy - 26, ax1 - ax0 + 14, 52);
    g.strokeStyle = C.green; g.lineWidth = 2; g.strokeRect(ax0 - 10, cy - 26, ax1 - ax0 + 14, 52);
    txt(g, fmtAlt(alt), ax1 - 8, cy + 1, 31, C.green, 'right', true);
    if (av) txt(g, fmtAlt(av.altSel || 0), ax1 - 8, cy - 216, 25, C.magenta, 'right', true);
    const stdSet = av && Math.abs(av.baro - 29.92) < 0.005 && alt > 14000;
    txt(g, stdSet ? 'STD' : av ? (av.baroUnit === 'HPA' ? `${Math.round(av.baro * 33.8639)} HPA` : `${av.baro.toFixed(2)} IN`) : '', ax1 - 8, cy + 216, 21, C.green, 'right', true);
    // the vertical speed (a small tape's number, right of the altitude window)
    txt(g, Math.abs(o.vsi || 0) >= 100 ? `${(o.vsi > 0 ? '+' : '−')}${Math.round(Math.abs(o.vsi) / 100) * 100}` : '', 976, cy + 1, 22, C.white, 'left');
    // the heading strip (bottom centre)
    const hdg = ((o.hdg || 0) % 360 + 360) % 360, hx = cx, hy = 716, hPx = 3.4;
    g.fillStyle = C.tape; g.fillRect(hx - 175, hy - 24, 350, 48);
    g.save(); g.beginPath(); g.rect(hx - 175, hy - 24, 350, 48); g.clip();
    for (let v = Math.floor((hdg - 55) / 10) * 10; v < hdg + 58; v += 10) {
      const x = hx + ((v - hdg + 540) % 360 - 180) * hPx; if (x < hx - 178 || x > hx + 178) continue;
      g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(x, hy + 8); g.lineTo(x, hy + 22); g.stroke();
      const vv = ((v % 360) + 360) % 360;
      if (vv % 30 === 0) txt(g, `${vv / 10 < 10 ? '0' : ''}${vv / 10}`, x, hy - 8, 19, C.white, 'center', true);
    }
    g.restore();
    if (av) { const bx = hx + ((av.hdgBug - hdg + 540) % 360 - 180) * hPx; if (bx > hx - 175 && bx < hx + 175) { g.fillStyle = C.magenta; g.beginPath(); g.moveTo(bx, hy + 24); g.lineTo(bx - 7, hy + 36); g.lineTo(bx + 7, hy + 36); g.fill(); } }
    txt(g, `${String(Math.round(hdg) || 360).padStart(3, '0')}°`, hx, hy + 52, 24, C.green, 'center', true);
    // radio altitude under the ball
    if ((o.agl || 0) < 2500) txt(g, `RA ${Math.max(0, Math.round(o.agl))}`, cx, cy + R + 34, 23, C.green, 'center', true);
    // the deviation scales (LOC / GS when the source is a localizer; a lateral bar for GPS / VOR)
    if (av) {
      const nav = AV.navSolve(av, { n: -s.pos[2], e: s.pos[0] }, o, P.MAGVAR_W, P.LAB_RWY);
      if (nav && !nav.flag && nav.dots != null) {
        const dy = 664;
        g.strokeStyle = C.line; g.lineWidth = 2;
        for (const ddx of [-56, -28, 28, 56]) { g.beginPath(); g.arc(cx + ddx, dy, 4.5, 0, Math.PI * 2); g.stroke(); }
        const dx = cx + clamp(nav.dots, -2.5, 2.5) * 28;
        g.fillStyle = nav.src === 'LOC1' ? C.green : C.magenta;
        g.beginPath(); g.moveTo(dx, dy - 13); g.lineTo(dx + 10, dy); g.lineTo(dx, dy + 13); g.lineTo(dx - 10, dy); g.fill();
        txt(g, nav.src === 'LOC1' ? 'LOC' : nav.src, cx - 130, dy, 19, C.dim, 'right');
      }
      if (nav && nav.gsDots != null && !nav.flag) {
        const gx = cx + R + 46;
        g.strokeStyle = C.line; g.lineWidth = 2;
        for (const ddy of [-56, -28, 28, 56]) { g.beginPath(); g.arc(gx, cy + ddy, 4.5, 0, Math.PI * 2); g.stroke(); }
        const gy = cy + clamp(nav.gsDots, -2.5, 2.5) * 28;
        g.fillStyle = C.green; g.beginPath(); g.moveTo(gx - 13, gy); g.lineTo(gx, gy - 10); g.lineTo(gx + 13, gy); g.lineTo(gx, gy + 10); g.fill();
        txt(g, 'G/S', gx, cy - R - 14, 19, C.dim, 'center');
      }
    }
    // the FMA (top): A/T | lateral | vertical, and the status at its left
    const ap = av && av.ap, fd = av && av.fd;
    g.fillStyle = 'rgba(5,8,11,0.85)'; g.fillRect(196, 10, 632, 62);
    g.strokeStyle = '#3a4750'; g.lineWidth = 1.5; g.strokeRect(196, 10, 632, 62);
    g.beginPath(); g.moveTo(406, 12); g.lineTo(406, 70); g.moveTo(618, 12); g.lineTo(618, 70); g.stroke();
    const atTxt = at ? (at.on ? 'SPD' : at.arm ? 'ARM' : '') : '';
    const latTxt = ap ? (ap.apr ? 'LOC' : ap.nav ? 'LNAV' : ap.hdg ? 'HDG SEL' : ap.on ? 'ROL' : '') : '';
    const vertTxt = ap ? (ap.apr && ap.gsCap ? 'G/S' : ap.lvlChg ? 'LVL CHG' : ap.vs ? `V/S` : ap.alt ? 'ALT' : ap.on ? 'PIT' : '') : '';
    txt(g, atTxt, 301, 41, 26, C.green, 'center', true);
    txt(g, latTxt, 512, 41, 26, C.green, 'center', true);
    txt(g, vertTxt, 723, 41, 26, C.green, 'center', true);
    txt(g, ap && ap.on ? 'CMD' : fd && fd.on ? 'FD' : '', 130, 41, 23, C.green, 'center', true);
    if (ap && ap.flash > 0 && (ap.flash * 2.2) % 1 < 0.58) txt(g, 'A/P', 130, 41, 25, C.amber, 'center', true);
    // the master warning the type shows on the PFD too: a stall
    if (o.stallWarn) { g.fillStyle = '#7a1610'; g.fillRect(cx - 62, 96, 124, 38); txt(g, 'STALL', cx, 115, 25, '#fff', 'center', true); }
  }

  // ================================================================ the ND
  function drawND(g, s, av) {
    const o = s.out, W = 1024, H = 768;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const pos = { n: -s.pos[2], e: s.pos[0] };
    const hdgM = (((o.hdg || 0) % 360) + 360) % 360, hdgRad = hdgM * Math.PI / 180;
    const rng = state.efis.ndRange, rose = state.efis.ndMode === 'ROSE';
    const cx = 512, cy = rose ? 400 : 596, R = rose ? 296 : 478;
    const scale = R / (rng * 1852);                        // pixels per metre
    const proj = (n, e) => {
      const dx = e - pos.e, dy = n - pos.n;
      const fwd = dx * Math.sin(hdgRad) + dy * Math.cos(hdgRad), rgt = dx * Math.cos(hdgRad) - dy * Math.sin(hdgRad);
      return [cx + rgt * scale, cy - fwd * scale];
    };
    // the compass (an arc in MAP, the full rose in ROSE)
    g.strokeStyle = '#5a6d7a'; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx, cy, R / 2, 0, Math.PI * 2); g.setLineDash([7, 7]); g.stroke(); g.setLineDash([]);
    const a0 = rose ? 0 : -65, a1 = rose ? 360 : 65;
    for (let a = a0; a <= a1; a += 5) {
      const brg = ((Math.round(hdgM / 5) * 5 + a + 360) % 360), rad = (brg - hdgM) * Math.PI / 180 - Math.PI / 2;
      const x1 = cx + R * Math.cos(rad), y1 = cy + R * Math.sin(rad);
      if (!rose && (y1 > cy + 6)) continue;
      const big = brg % 30 === 0;
      g.strokeStyle = C.line; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(cx + (R - (big ? 22 : 12)) * Math.cos(rad), cy + (R - (big ? 22 : 12)) * Math.sin(rad)); g.stroke();
      if (big) { const txp = cx + (R - 48) * Math.cos(rad), typ = cy + (R - 48) * Math.sin(rad); if (rose || typ < cy) txt(g, brg === 0 ? 'N' : brg === 90 ? 'E' : brg === 180 ? 'S' : brg === 270 ? 'W' : `${brg / 10}`, txp, typ, 21, C.white, 'center', true); }
    }
    txt(g, `${rng}`, cx - R - 6, cy - R / 2, 20, C.cyan, 'right');
    txt(g, `${rng / 2}`, cx - R - 6, cy - R / 4, 20, C.cyan, 'right');
    // the heading marker and the track line
    g.fillStyle = '#ffd94a';
    g.beginPath(); g.moveTo(cx, cy - R - 16); g.lineTo(cx - 9, cy - R + 4); g.lineTo(cx + 9, cy - R + 4); g.fill();
    const trk = (o.trk != null ? o.trk : o.hdg) || 0, trkRad = (trk - hdgM) * Math.PI / 180;
    g.strokeStyle = C.green; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + R * 0.92 * Math.sin(trkRad), cy - R * 0.92 * Math.cos(trkRad)); g.stroke();
    // the flight plan's legs (the avionics' own plan: magenta the active leg, white the rest)
    if (av && av.fpl && av.fpl.wps && AV.WAYPOINTS) {
      const pts = av.fpl.wps.map(id => { const w = AV.WAYPOINTS.find(q => q.id === id); return w ? { id, p: proj(w.n, w.e) } : null; });
      g.lineWidth = 3;
      for (let i = 1; i < pts.length; i++) {
        if (!pts[i] || !pts[i - 1]) continue;
        g.strokeStyle = i === av.fpl.active ? C.magenta : '#e8f2f8';
        g.beginPath(); g.moveTo(pts[i - 1].p[0], pts[i - 1].p[1]); g.lineTo(pts[i].p[0], pts[i].p[1]); g.stroke();
      }
      for (const q of pts) {
        if (!q) continue;
        const [x, y] = q.p; if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
        g.strokeStyle = C.magenta; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 9, y); g.lineTo(x, y + 9); g.lineTo(x - 9, y); g.closePath(); g.stroke();
        txt(g, q.id, x + 14, y - 6, 19, C.cyan, 'left');
      }
      const nx = pts[av.fpl.active];
      if (nx) {
        const w = AV.WAYPOINTS.find(q => q.id === nx.id);
        const dNm = Math.hypot(w.n - pos.n, w.e - pos.e) / 1852;
        txt(g, `${nx.id}  ${dNm.toFixed(1)} NM`, 780, 40, 23, C.magenta, 'right', true);
      }
    }
    // ROSE: the bearing pointer to the tuned VOR / the localizer's course deviation as a needle
    if (rose && av) {
      const aid = AV.NAVAIDS && AV.NAVAIDS.find(a => a.freq === (av.nav1 && av.nav1.act) && a.n != null);
      if (aid) {
        const brg = ((Math.atan2(aid.e - pos.e, aid.n - pos.n) * 180 / Math.PI - P.MAGVAR_W) % 360 + 360) % 360;
        const rad = (brg - hdgM) * Math.PI / 180 - Math.PI / 2;
        g.strokeStyle = C.green; g.lineWidth = 4;
        g.beginPath(); g.moveTo(cx + (R - 66) * Math.cos(rad), cy + (R - 66) * Math.sin(rad)); g.lineTo(cx + (R - 14) * Math.cos(rad), cy + (R - 14) * Math.sin(rad)); g.stroke();
        txt(g, `${aid.id} ${String(Math.round(brg)).padStart(3, '0')}°`, 40, H - 36, 21, C.green, 'left');
      }
      const nav = AV.navSolve(av, pos, o, P.MAGVAR_W, P.LAB_RWY);
      if (nav && !nav.flag && nav.dots != null) {
        const crsRad = ((nav.crs || 0) - hdgM) * Math.PI / 180 - Math.PI / 2;
        const dx = Math.cos(crsRad), dy = Math.sin(crsRad), off = clamp(nav.dots, -2.5, 2.5) * 34;
        const px = -dy, py = dx;
        g.strokeStyle = nav.src === 'LOC1' ? C.green : C.magenta; g.lineWidth = 4;
        g.beginPath(); g.moveTo(cx - dx * (R - 60) + px * off, cy - dy * (R - 60) + py * off); g.lineTo(cx + dx * (R - 60) + px * off, cy + dy * (R - 60) + py * off); g.stroke();
        txt(g, nav.src, 40, 40, 21, nav.src === 'LOC1' ? C.green : C.magenta, 'left');
      }
    }
    // the own ship and the header
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(cx, cy - 17); g.lineTo(cx + 12, cy + 13); g.lineTo(cx, cy + 6); g.lineTo(cx - 12, cy + 13); g.closePath(); g.fill();
    txt(g, `GS ${Math.round(o.gs || 0)}`, 40, 40, 24, C.green, 'left', true);
    txt(g, `${String(Math.round(hdgM) || 360).padStart(3, '0')}° MAG`, 40, 74, 21, C.green, 'left');
    txt(g, rose ? 'ROSE' : 'MAP', 984, 40, 23, C.cyan, 'right', true);
    txt(g, `RNG ${rng}`, 984, 74, 21, C.cyan, 'right');
  }

  // ================================================================ the EICAS
  function arcGauge(g, x, y, r, v, vMax, lab, unit, digits, warnAt) {
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;         // (a 270° gauge, the type's way)
    g.strokeStyle = '#54656f'; g.lineWidth = 5;
    g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke();
    if (warnAt != null) { g.strokeStyle = C.amber; g.beginPath(); g.arc(x, y, r, a0 + (a1 - a0) * warnAt / vMax, a1); g.stroke(); }
    const a = a0 + (a1 - a0) * clamp(v, 0, vMax) / vMax;
    g.strokeStyle = '#fff'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + r * 0.92 * Math.cos(a), y + r * 0.92 * Math.sin(a)); g.stroke();
    txt(g, digits, x, y + r * 0.52, 30, warnAt != null && v >= warnAt ? C.amber : C.green, 'center', true);
    txt(g, lab, x, y - r * 0.95, 20, C.white, 'center', true);
    txt(g, unit, x, y + r * 0.82, 16, C.dim, 'center');
  }
  let gearTransitT = 0;
  function drawEicasU(g, s, av, eng, dt) {
    const o = s.out, W = 1024, H = 768;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const e0 = s.eng[0] || {}, e1 = s.eng[1] || e0;
    const n1 = o.n1s && o.n1s.length > 1 ? o.n1s : [o.n1 || 0, o.n1 || 0], egt = o.egts && o.egts.length > 1 ? o.egts : [e0.egt || 0, e1.egt || 0];
    const n1Tgt = 20 + 84 * Math.pow(clamp(s.thr || 0, 0, 1), 1.15);
    arcGauge(g, 168, 178, 104, n1[0], 110, 'N1', '% RPM', (n1[0]).toFixed(1), null);
    arcGauge(g, 418, 178, 104, n1[1], 110, 'N1', '% RPM', (n1[1]).toFixed(1), null);
    for (const [x, v] of [[168, n1[0]], [418, n1[1]]]) {   // the target bug on each N1 arc
      const a = Math.PI * 0.75 + Math.PI * 1.5 * clamp(n1Tgt, 0, 110) / 110;
      g.fillStyle = C.magenta; g.beginPath();
      g.moveTo(x + 116 * Math.cos(a), 178 + 116 * Math.sin(a)); g.lineTo(x + 96 * Math.cos(a - 0.05), 178 + 96 * Math.sin(a - 0.05)); g.lineTo(x + 96 * Math.cos(a + 0.05), 178 + 96 * Math.sin(a + 0.05)); g.fill();
    }
    arcGauge(g, 652, 178, 104, egt[0], 1100, 'EGT', '°C', `${Math.round(egt[0])}`, 950);
    arcGauge(g, 892, 178, 104, egt[1], 1100, 'EGT', '°C', `${Math.round(egt[1])}`, 950);
    const ffKg = e => Math.round((e.ff || 0) * KG_PER_GAL / 10) * 10;
    txt(g, 'FF', 168, 330, 20, C.white, 'center'); txt(g, `${ffKg(e0)}`, 168, 360, 27, C.green, 'center', true);
    txt(g, 'FF', 418, 330, 20, C.white, 'center'); txt(g, `${ffKg(e1)}`, 418, 360, 27, C.green, 'center', true);
    txt(g, 'KG/H', 293, 360, 17, C.dim, 'center');
    const tw = eng && eng.twin;
    txt(g, 'OIL P', 652, 330, 19, C.white, 'center'); txt(g, tw ? `${Math.round(tw[0].oil)}` : '—', 652, 360, 25, C.green, 'center', true);
    txt(g, 'OIL P', 892, 330, 19, C.white, 'center'); txt(g, tw ? `${Math.round(tw[1].oil)}` : '—', 892, 360, 25, C.green, 'center', true);
    // the gear and flap position (the type's own graphic, right of the memo area's top)
    const gp = s.gearPos != null ? s.gearPos : 1;
    gearTransitT = gp > 0.02 && gp < 0.98 ? gearTransitT + dt : 0;
    for (let i = 0; i < 3; i++) {
      const x = 730 + i * 74, y = 452;
      g.strokeStyle = gp >= 0.999 ? C.green : gp <= 0.001 ? '#54656f' : C.amber; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, 24, 0, Math.PI * 2); g.stroke();
      if (gp > 0.001 && gp < 0.999) { g.fillStyle = C.amber; g.fillRect(x - 14, y - 3, 28, 6); }
      else if (gp >= 0.999) txt(g, 'DN', x, y, 17, C.green, 'center', true);
    }
    txt(g, 'GEAR', 804, 410, 19, C.white, 'center');
    const flapLab = (s.A.flapLabels || ['UP', '5', '15', '40'])[clamp(s.flapIdx | 0, 0, 3)];
    txt(g, `FLAP ${flapLab}`, 804, 502, 24, C.green, 'center', true);
    // warnings first (amber / red), then the memos (white), the way the type stacks them
    const warn = [], memo = [];
    if (o.stallWarn) warn.push(['STALL', C.red]);
    if (!s.onGround && (e0.on === false || e1.on === false)) warn.push(['ENG FAIL', C.amber]);
    if (gearTransitT > 5) warn.push(['GEAR DISAGREE', C.amber]);
    if (eng && eng.elec && eng.elec.altFail) warn.push(['ALTERNATOR', C.amber]);   // (the failure day's own flag, shown the Boeing way)
    if (s.fuel && s.fuel[0] + s.fuel[1] < 500) warn.push(['FUEL LOW QTY', C.amber]);
    if (eng && eng.parkBrake) memo.push('PARK BRAKE SET');
    if ((o.spoiler || 0) > 0.05) memo.push(s.onGround ? 'GND SPOILERS EXTENDED' : 'SPEEDBRAKE EXTENDED');
    if ((o.rev || 0) > 0.05) memo.push('REVERSER DEPLOYED');
    if (av && av.at && av.at.arm && !av.at.on) memo.push('A/T ARMED');
    if (av && av.ap && av.ap.on) memo.push('A/P ENGAGED');
    let y = 440;
    for (const [m, col] of warn) { txt(g, m, 44, y, 26, col, 'left', true); y += 38; }
    for (const m of memo) { txt(g, m, 44, y, 24, C.white, 'left'); y += 36; }
    txt(g, 'TOTAL FUEL', 44, 716, 20, C.white, 'left');
    txt(g, `${Math.round((s.fuel ? s.fuel[0] + s.fuel[1] : 0) * KG_PER_GAL)} KG`, 330, 716, 26, C.green, 'left', true);
  }
  function drawEicasL(g, s, av, eng) {
    const W = 768, H = 576;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const e0 = s.eng[0] || {}, e1 = s.eng[1] || e0;
    txt(g, 'FUEL', 60, 54, 24, C.white, 'left', true);
    const kg = v => `${Math.round(v * KG_PER_GAL)}`;
    txt(g, 'LEFT', 60, 104, 20, C.dim, 'left'); txt(g, kg(s.fuel ? s.fuel[0] : 0), 240, 104, 28, C.green, 'right', true);
    txt(g, 'RIGHT', 60, 146, 20, C.dim, 'left'); txt(g, kg(s.fuel ? s.fuel[1] : 0), 240, 146, 28, C.green, 'right', true);
    txt(g, 'TOTAL', 60, 196, 20, C.white, 'left'); txt(g, kg(s.fuel ? s.fuel[0] + s.fuel[1] : 0), 240, 196, 30, C.green, 'right', true);
    txt(g, 'KG', 262, 196, 18, C.dim, 'left');
    txt(g, 'USED', 60, 238, 20, C.dim, 'left'); txt(g, `${Math.round(((e0.ff || 0) + (e1.ff || 0)) * KG_PER_GAL)} KG/H FLOW`, 240, 238, 22, C.green, 'right');
    txt(g, 'OIL', 60, 308, 24, C.white, 'left', true);
    const tw = eng && eng.twin;
    for (const [i, lab] of [[0, 'ENG 1'], [1, 'ENG 2']]) {
      const y = 352 + i * 44;
      txt(g, lab, 60, y, 20, C.dim, 'left');
      txt(g, `P ${tw ? Math.round(tw[i].oil) : '—'} PSI`, 300, y, 23, C.green, 'right');
      txt(g, `T ${tw && tw[i].oilT != null ? Math.round(tw[i].oilT) : '—'} °C`, 470, y, 23, C.green, 'right');
      txt(g, `Q ${s.eng[i] ? (s.eng[i].oilQ || 0).toFixed(1) : '—'}`, 640, y, 23, C.green, 'right');
    }
    txt(g, 'FF TOTAL', 60, 478, 20, C.white, 'left');
    txt(g, `${Math.round(((e0.ff || 0) + (e1.ff || 0)) * KG_PER_GAL / 10) * 10} KG/H`, 300, 478, 26, C.green, 'right', true);
    txt(g, 'N1 SYNC — A/T SPD MODE', 60, 524, 17, C.dim, 'left');
    txt(g, state.efis.ndMode === 'ROSE' ? 'ND: ROSE' : 'ND: MAP', 470, 524, 17, C.dim, 'left');
  }

  // ================================================================ the standby (ISFD, simplified)
  function drawStby(g, s, av) {
    const o = s.out, W = 384;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, W);
    const cx = 192, cy = 150, R = 108;
    g.save();
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
    g.translate(cx, cy); g.rotate(-(o.bank || 0) * Math.PI / 180);
    const py = clamp((o.pitch || 0) * 2.6, -80, 80);
    g.fillStyle = C.sky; g.fillRect(-160, -160 + py, 320, 160);
    g.fillStyle = C.gnd; g.fillRect(-160, py, 320, 160);
    g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-160, py); g.lineTo(160, py); g.stroke();
    g.restore();
    g.strokeStyle = '#ffd94a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(cx - 52, cy); g.lineTo(cx + 52, cy); g.stroke();
    g.fillStyle = '#ffd94a'; g.fillRect(cx - 3, cy - 3, 6, 6);
    const alt = av ? AV.indicatedAlt(o.altTrue || 0, s.qnh, av.baro) : (o.altTrue || 0);
    txt(g, `${Math.round(Math.max(0, o.ias || 0))}`, 26, 316, 40, C.green, 'left', true);
    txt(g, 'KT', 26, 348, 16, C.dim, 'left');
    txt(g, fmtAlt(alt), 358, 316, 34, C.green, 'right', true);
    txt(g, 'FT', 358, 348, 16, C.dim, 'right');
    txt(g, av ? (av.baroUnit === 'HPA' ? `${Math.round(av.baro * 33.8639)} HPA` : `${av.baro.toFixed(2)} IN`) : '', cx, 372, 17, C.cyan, 'center');
  }

  // ================================================================ the FMC CDU (the basic pages)
  // pages: IDENT (the type and the data's state) / POS INIT (the reference airport, the position set) /
  // RTE (the route, from the line operation's data or typed in) / INDEX (the way between them).
  // The scratchpad works as the type's does: type, then a line key to put it in a field; DEL scrubs a
  // character, CLR clears; ACTIVATE waits for EXEC. Everything typed is kept in state.cdu, and the RTE
  // page prefers what the line operation handed over (update's route) until the pilot edits it.
  const CDU_PAGES = ['IDENT', 'POS', 'RTE', 'INDEX'];
  function cduKey(k) {
    const c = state.cdu;
    c.dirty = true;
    if (/^[A-Z0-9/.]$/.test(k)) { if (c.scratch.length < 14) c.scratch += k; c.msg = ''; return; }
    if (k === 'DEL') { c.scratch = c.scratch.slice(0, -1); return; }
    if (k === 'CLR') { if (c.scratch) c.scratch = ''; else c.msg = ''; return; }
    if (k === 'EXEC') { if (c.pendingExec) { c.pendingExec = false; c.active = true; c.msg = ''; } return; }
    if (k === 'INIT') { c.page = 'IDENT'; return; }
    if (k === 'RTE') { c.page = 'RTE'; return; }
    if (k === 'PREV' || k === 'NEXT') { const i = CDU_PAGES.indexOf(c.page); c.page = CDU_PAGES[(i + (k === 'NEXT' ? 1 : CDU_PAGES.length - 1)) % CDU_PAGES.length]; return; }
    const put = field => {
      const v = c.scratch.trim();
      if (/^[A-Z]{3,4}$/.test(v)) { c[field] = v; c.edited = true; c.scratch = ''; c.msg = ''; }
      else c.msg = 'INVALID ENTRY';
    };
    if (c.page === 'IDENT') {
      if (k === 'R6') c.page = 'POS';
      else if (k === 'L6') c.page = 'INDEX';
    } else if (c.page === 'INDEX') {
      if (k === 'L1') c.page = 'IDENT';
      else if (k === 'L2') c.page = 'POS';
      else if (k === 'R1') c.page = 'RTE';
    } else if (c.page === 'POS') {
      if (k === 'L1') put('ref');
      else if (k === 'R5') { c.posSet = true; c.msg = ''; }
      else if (k === 'R6') c.page = 'RTE';
    } else if (c.page === 'RTE') {
      if (k === 'L1') put('from');
      else if (k === 'R1') put('to');
      else if (k === 'R6') { if (c.from && c.to) { c.pendingExec = true; c.msg = ''; } else c.msg = 'ENTER FROM/TO'; }
    }
  }
  function drawCDU(g, s, av) {
    const c = state.cdu, W = 512, H = 640;
    g.fillStyle = '#10151a'; g.fillRect(0, 0, W, H);
    const X0 = 26, CW = 19.2, Y0 = 44, LH = 40;
    const cell = (str, col, row, colr, align = 'left', big = false) => {
      g.fillStyle = colr; g.font = `${big ? '600 ' : ''}${big ? 21 : 19}px "Consolas", "Courier New", monospace`;
      g.textAlign = align; g.textBaseline = 'middle';
      g.fillText(str, align === 'right' ? X0 + 24 * CW - 4 : X0 + col * CW, Y0 + row * LH);
    };
    const label = (str, col, row, align = 'left') => cell(str, col, row, '#9fb4c4', align);
    const data = (str, col, row, align = 'left') => cell(str, col, row, C.green, align, true);
    const prompt = (str, col, row, align = 'left') => cell(str, col, row, '#e8f2f8', align);
    const title = c.page === 'POS' ? 'POS INIT' : c.page === 'RTE' ? (c.active ? 'ACT RTE 1' : 'RTE 1') : c.page === 'INDEX' ? 'INDEX' : 'IDENT';
    g.fillStyle = '#e8f2f8'; g.font = '600 22px "Consolas", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(title, W / 2, 20);
    g.strokeStyle = '#3a4750'; g.lineWidth = 1; g.beginPath(); g.moveTo(10, 34); g.lineTo(W - 10, 34); g.stroke();
    if (c.page === 'IDENT') {
      label('MODEL', 0, 0); data('737-800', 0, 1);
      label('ENGINES', 0, 2); data('CFM56-7B', 0, 3);
      label('NAV DATA', 24, 0, 'right'); data('CADET OFFLINE', 24, 1, 'right');
      label('DRAG/FF', 24, 2, 'right'); data('+0.0/+0.0', 24, 3, 'right');
      label('PROGRAM', 0, 4); data('CADET FMC V1', 0, 5);
      prompt('<INDEX', 0, 13); prompt('POS INIT>', 24, 13, 'right');
    } else if (c.page === 'INDEX') {
      prompt('<IDENT', 0, 1); prompt('<POS INIT', 0, 3); prompt('RTE>', 24, 1, 'right');
      label('THE BASIC PAGES ONLY', 0, 6); label('PERF / VNAV: NOT IN SCOPE', 0, 7);
    } else if (c.page === 'POS') {
      label('REF AIRPORT', 0, 0); data(c.ref || (state.route ? state.route.from : '----'), 0, 1);
      label('GATE', 0, 2); data('---', 0, 3);
      label('IRS POSITION', 24, 7, 'right'); data(c.posSet ? 'SET (GPS)' : 'NOT SET', 24, 8, 'right');
      prompt('SET POS>', 24, 9, 'right');
      prompt('ROUTE>', 24, 13, 'right');
      label(c.posSet ? 'POSITION SET — READY' : 'SET THE POSITION BEFORE DEPARTURE', 0, 11);
    } else {
      const r = state.route;
      label('FROM', 0, 0); data(c.from || '----', 0, 1);
      label('TO', 24, 0, 'right'); data(c.to || '----', 24, 1, 'right');
      label('CO ROUTE', 0, 2); data(r && !c.edited ? r.id : '-------', 0, 3);
      label('ALTN', 24, 2, 'right'); data(r ? (r.alternate || '----') : '----', 24, 3, 'right');
      label('VIA', 0, 5); label('TO', 12, 5); label('CRZ ALT', 24, 5, 'right');
      data('DIRECT', 0, 6); data(c.to || '----', 12, 6);
      data(r ? `FL${r.cruiseFL}` : (av ? fmtAlt(av.altSel || 0) : '-----'), 24, 6, 'right');
      if (r) { label(`DIST ${r.distKm} KM  BLOCK ${r.blockMin} MIN`, 0, 8); }
      if (c.pendingExec) prompt('ACTIVATE + EXEC', 24, 12, 'right');
      else if (!c.active) prompt('ACTIVATE>', 24, 13, 'right');
      else data('ROUTE ACTIVE', 24, 13, 'right');
    }
    // the scratchpad and the message line
    g.fillStyle = '#05080b'; g.fillRect(10, H - 74, W - 20, 34);
    g.fillStyle = C.green; g.font = '600 21px "Consolas", monospace'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(c.scratch, 20, H - 57);
    if (c.msg) { g.fillStyle = C.amber; g.textAlign = 'right'; g.fillText(c.msg, W - 20, H - 57); }
    if (c.pendingExec) { g.fillStyle = C.amber; g.beginPath(); g.arc(W - 30, 20, 7, 0, Math.PI * 2); g.fill(); }
  }

  // ================================================================ the update (rates, power, the route)
  const t = { pfd: 1, nd: 1, eicas: 1, cdu: 1, stby: 1 };
  let blanked = false, routeSeen = undefined;
  function update(dt, o) {
    if (!o || !o.s) return;
    const s = o.s, av = o.av || null, eng = o.eng || null;
    if (o.route !== routeSeen) {
      routeSeen = o.route; state.route = o.route || null;
      if (o.route && !state.cdu.edited) { state.cdu.from = o.route.from || ''; state.cdu.to = o.route.to || ''; state.cdu.dirty = true; }
    }
    const power = o.elecPfd !== undefined ? !!o.elecPfd : true;
    if (!power) {
      if (!blanked) {
        blanked = true;
        for (const k of Object.keys(U)) { const u = U[k]; u.g.fillStyle = '#000'; u.g.fillRect(0, 0, u.w, u.h); u.texture.needsUpdate = true; }
      }
      return;
    }
    blanked = false;
    t.pfd += dt; t.nd += dt; t.eicas += dt; t.cdu += dt; t.stby += dt;
    if (t.pfd >= 1 / 30) {
      t.pfd = Math.min(t.pfd - 1 / 30, 1 / 30);
      const src = state.du.out === 'ND' ? 'nd' : 'pfd';
      if (src === 'pfd') drawPFD(U.pfd.g, s, av); else drawND(U.pfd.g, s, av);
      U.pfd.texture.needsUpdate = true; stats.pfd++;
    }
    if (t.nd >= 1 / 10) {
      t.nd = Math.min(t.nd - 1 / 10, 1 / 10);
      const src = state.du.inb === 'EICAS' ? 'eicasU' : 'nd';
      if (src === 'nd') drawND(U.nd.g, s, av); else drawEicasU(U.nd.g, s, av, eng, 1 / 10);
      U.nd.texture.needsUpdate = true; stats.nd++;
    }
    if (t.eicas >= 1 / 10) {
      t.eicas = Math.min(t.eicas - 1 / 10, 1 / 10);
      drawEicasU(U.eicasU.g, s, av, eng, 1 / 10);                       // (the centre upper DU is EICAS, always)
      if (state.du.low === 'ND') { const g2 = U.eicasL.g; g2.save(); g2.scale(768 / 1024, 576 / 768); drawND(g2, s, av); g2.restore(); }
      else drawEicasL(U.eicasL.g, s, av, eng);
      U.eicasU.texture.needsUpdate = true; U.eicasL.texture.needsUpdate = true; stats.eicasU++; stats.eicasL++;
    }
    if (t.stby >= 1 / 15) { t.stby = Math.min(t.stby - 1 / 15, 1 / 15); drawStby(U.stby.g, s, av); U.stby.texture.needsUpdate = true; stats.stby++; }
    if (state.cdu.dirty || t.cdu >= 1) { t.cdu = 0; state.cdu.dirty = false; drawCDU(U.cdu.g, s, av); U.cdu.texture.needsUpdate = true; stats.cdu++; }
  }
  let bytes = 0; for (const k of Object.keys(U)) bytes += Math.round(U[k].w * U[k].h * 4 / 3);
  return {
    units: U, state, stats, bytes, cduKey, update,
    setAnisotropy(n) { for (const k of Object.keys(U)) { U[k].texture.anisotropy = n; U[k].texture.needsUpdate = true; } },
    dispose() { for (const k of Object.keys(U)) U[k].texture.dispose(); },
  };
}
