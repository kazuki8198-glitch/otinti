// CADET — world/boards.js : what is written on the academy's boards and screens, drawn on canvases.
// A board shows the same words as the examine card of the interactable next to it (so reading it close up and
// opening the card agree). The map wall is drawn from FLIGHT LAB's own world: the runway, the lakes, the LAB VOR
// and the training points (fictional; NOT FOR NAVIGATION).
const JP = '"Hiragino Sans", "Yu Gothic UI", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", "Noto Sans JP", sans-serif';
const HAND = '"Klee One", "Hiragino Maru Gothic ProN", "Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", sans-serif';

function wrap(g, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of para) { if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
    out.push(line);
  }
  return out;
}
function fitLines(g, font, px, lines, maxW, maxH, lh = 1.35) {
  let size = px, wrapped;
  for (; size > 10; size -= 2) {
    g.font = font.replace('PX', size);
    wrapped = lines.flatMap(l => wrap(g, l, maxW));
    if (wrapped.length * size * lh <= maxH) break;
  }
  return { size, wrapped };
}

// a whiteboard with marker writing
export function drawWhiteboard(title, text) {
  return (g, w, h) => {
    g.fillStyle = '#f7f8f6'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,130,140,0.06)'; for (let i = 0; i < 6; i++) g.fillRect(w * (0.1 + i * 0.15), 0, w * 0.05, h);     // faint ghosting
    g.fillStyle = '#1d4e9e'; g.font = `700 ${Math.round(h * 0.09)}px ${HAND}`; g.textBaseline = 'top';
    g.fillText(title, w * 0.05, h * 0.06);
    g.strokeStyle = '#c0392b'; g.lineWidth = h * 0.008; g.beginPath(); g.moveTo(w * 0.05, h * 0.18); g.lineTo(w * 0.6, h * 0.185); g.stroke();
    const { size, wrapped } = fitLines(g, `500 PXpx ${HAND}`, Math.round(h * 0.065), String(text).split('\n'), w * 0.9, h * 0.72);
    wrapped.forEach((l, i) => { g.fillStyle = /基準|標準|±/.test(l) ? '#c0392b' : '#202426'; g.fillText(l, w * 0.05, h * 0.23 + i * size * 1.35); });
  };
}
// a screen (dark, glowing): a header bar and monospaced or Japanese lines
export function drawScreen(title, text, { mono = false } = {}) {
  return (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b1a2b'); gr.addColorStop(1, '#06101b');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#16324f'; g.fillRect(0, 0, w, h * 0.13);
    g.fillStyle = '#f2b632'; g.fillRect(0, h * 0.13, w, h * 0.008);
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.font = `700 ${Math.round(h * 0.065)}px ${JP}`;
    g.fillText(title, w * 0.03, h * 0.066);
    g.textBaseline = 'top';
    const font = mono ? 'PXpx "Consolas", "Menlo", "DejaVu Sans Mono", monospace' : `500 PXpx ${JP}`;
    const { size, wrapped } = fitLines(g, font, Math.round(h * 0.06), String(text).split('\n'), w * 0.94, h * 0.8);
    wrapped.forEach((l, i) => { g.fillStyle = /^(METAR|TAF|KLAB)/.test(l) ? '#9ef0c9' : '#d8e6f2'; g.fillText(l, w * 0.03, h * 0.17 + i * size * 1.35); });
  };
}
// the lobby's flight status board: rows of today's flights
export function drawStatusBoard(title, text) {
  return (g, w, h) => {
    g.fillStyle = '#05080c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2b632'; g.font = `700 ${Math.round(h * 0.075)}px ${JP}`; g.textBaseline = 'middle';
    g.fillText(title, w * 0.03, h * 0.07);
    const rows = String(text).split('\n').filter(Boolean);
    const rh = Math.min(h * 0.095, (h * 0.84) / Math.max(1, rows.length));
    rows.forEach((r, i) => {
      const y = h * 0.16 + i * rh;
      g.fillStyle = i % 2 ? '#0c1520' : '#0a121b'; g.fillRect(0, y, w, rh);
      g.fillStyle = /完了|済/.test(r) ? '#7fd1a8' : /待|遅|中止/.test(r) ? '#ffb86b' : '#e9f1f8';
      let px = Math.round(rh * 0.55); g.font = `500 ${px}px ${JP}`;
      while (g.measureText(r).width > w * 0.95 && px > 10) { px -= 1; g.font = `500 ${px}px ${JP}`; }
      g.fillText(r, w * 0.03, y + rh / 2);
    });
  };
}
// a cork board with pinned notes
export function drawBulletin(title, text) {
  return (g, w, h) => {
    g.fillStyle = '#b98a57'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${80 + (i % 7) * 10},${50 + (i % 5) * 6},20,0.12)`; g.fillRect((i * 97) % w, (i * 61) % h, 2, 2); }
    const notes = String(text).split('\n').filter(Boolean);
    const cols = 3, nw = w / cols - w * 0.04, nh = h * 0.36;
    g.textBaseline = 'top';
    notes.slice(0, 6).forEach((t, i) => {
      const x = w * 0.02 + (i % cols) * (nw + w * 0.04), y = h * 0.12 + Math.floor(i / cols) * (nh + h * 0.06);
      g.save(); g.translate(x + nw / 2, y + nh / 2); g.rotate(((i * 37) % 7 - 3) * 0.012); g.translate(-nw / 2, -nh / 2);
      g.fillStyle = ['#fff7c2', '#ffffff', '#d9f0ff', '#ffe0e0', '#e4ffd9', '#fff'][i % 6]; g.fillRect(0, 0, nw, nh);
      g.fillStyle = '#c0392b'; g.beginPath(); g.arc(nw / 2, 8, 6, 0, 6.29); g.fill();
      const { size, wrapped } = fitLines(g, `500 PXpx ${JP}`, Math.round(nh * 0.12), [t], nw * 0.88, nh * 0.8);
      g.fillStyle = '#222'; wrapped.forEach((l, k) => g.fillText(l, nw * 0.06, nh * 0.12 + k * size * 1.3));
      g.restore();
    });
    g.fillStyle = '#16324f'; g.fillRect(0, 0, w, h * 0.08); g.fillStyle = '#fff'; g.font = `700 ${Math.round(h * 0.05)}px ${JP}`; g.textBaseline = 'middle'; g.fillText(title, w * 0.02, h * 0.04);
  };
}

// the sectional-chart-like map of FLIGHT LAB's teaching world
export function drawAreaMap(FL, L) {
  return (g, w, h) => {
    const P = FL.physics, A = FL.avionics;
    g.fillStyle = '#e8ecd9'; g.fillRect(0, 0, w, h);
    // the map: 50 km × 30 km around the field, north up
    const cx = P.LAB_RWY.e + 6000, cn = P.LAB_RWY.n + 4000, kmPx = w / 50;
    const X = (e) => w / 2 + (e - cx) / 1000 * kmPx, Y = (n) => h / 2 - (n - cn) / 1000 * kmPx;
    g.strokeStyle = 'rgba(80,100,120,0.25)'; g.lineWidth = 1;
    for (let k = -30; k <= 30; k += 5) { g.beginPath(); g.moveTo(X(cx + k * 1000), 0); g.lineTo(X(cx + k * 1000), h); g.stroke(); g.beginPath(); g.moveTo(0, Y(cn + k * 1000)); g.lineTo(w, Y(cn + k * 1000)); g.stroke(); }
    // woods tint and lakes
    g.fillStyle = 'rgba(120,160,110,0.25)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 211) % w, (i * 137) % h, 18 + (i % 5) * 9, 0, 6.29); g.fill(); }
    g.fillStyle = '#7fb6d9'; g.strokeStyle = '#2f6f9a'; g.lineWidth = 1.5;
    for (const k of L.lakes) { g.beginPath(); k.ring.forEach((p, i) => { const { n, e } = L.fromLocal(p[0], p[2]); (i ? g.lineTo : g.moveTo).call(g, X(e), Y(n)); }); g.closePath(); g.fill(); g.stroke(); }
    // the training area (a magenta boundary) and the points
    g.strokeStyle = '#b0228e'; g.setLineDash([10, 6]); g.lineWidth = 3;
    g.strokeRect(X(P.LAB_RWY.e + 2500), Y(P.LAB_RWY.n + 16000), 16 * kmPx, 13 * kmPx); g.setLineDash([]);
    g.font = '700 15px sans-serif'; g.fillStyle = '#b0228e'; g.fillText('LAB TRAINING AREA (FICTIONAL)', X(P.LAB_RWY.e + 2800), Y(P.LAB_RWY.n + 15200));
    for (const id of ['LABEA', 'LABEB', 'LABEC', 'LABED', 'LABEF']) { const p = A.wpt(id); if (!p) continue; g.strokeStyle = '#1b3e7a'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(p.e), Y(p.n) - 8); g.lineTo(X(p.e) + 7, Y(p.n) + 6); g.lineTo(X(p.e) - 7, Y(p.n) + 6); g.closePath(); g.stroke(); g.fillStyle = '#1b3e7a'; g.fillText(id, X(p.e) + 9, Y(p.n) + 4); }
    for (const nv of A.NAVAIDS || []) if (nv.type === 'VOR') {
      const x = X(nv.e), y = Y(nv.n); g.strokeStyle = '#1b3e7a'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(x, y, kmPx * 4, 0, 6.29); g.stroke();
      for (let d = 0; d < 360; d += 10) { const a = (d - 90) * Math.PI / 180, r0 = kmPx * 4, r1 = r0 + (d % 30 ? 5 : 10); g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke(); }
      g.fillStyle = '#e8ecd9'; g.fillRect(x + 14, y - 34, 128, 36); g.strokeRect(x + 14, y - 34, 128, 36);
      g.fillStyle = '#1b3e7a'; g.font = '700 13px sans-serif'; g.fillText(`LAB VOR ${(nv.freq / 1000).toFixed(2)}`, x + 20, y - 18); g.fillText('LBV (FICTIONAL)', x + 20, y - 4);
    }
    // the airfield
    const [n1, e1] = P.rwyToNE(P.LAB_RWY, 0, 0), [n2, e2] = P.rwyToNE(P.LAB_RWY, P.LAB_RWY.len, 0);
    g.strokeStyle = '#b0228e'; g.lineWidth = 5; g.beginPath(); g.moveTo(X(e1), Y(n1)); g.lineTo(X(e2), Y(n2)); g.stroke();
    g.beginPath(); g.arc((X(e1) + X(e2)) / 2, (Y(n1) + Y(n2)) / 2, 16, 0, 6.29); g.lineWidth = 2; g.stroke();
    g.fillStyle = '#b0228e'; g.font = '700 16px sans-serif'; g.fillText('LAB FIELD  RWY 36/18  55 ft', X(e1) + 22, Y(n1) + 10);
    // title block
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(w - 330, h - 92, 316, 80); g.strokeStyle = '#333'; g.lineWidth = 1; g.strokeRect(w - 330, h - 92, 316, 80);
    g.fillStyle = '#222'; g.font = `700 18px ${JP}`; g.fillText('LAB 訓練空域図（架空）', w - 318, h - 66);
    g.font = '600 13px sans-serif'; g.fillText('NOT FOR NAVIGATION · teaching map', w - 318, h - 44);
    g.fillText('north up · grid 5 km', w - 318, h - 26);
  };
}
