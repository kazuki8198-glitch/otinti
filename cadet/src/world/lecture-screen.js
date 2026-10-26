// CADET — world/lecture-screen.js : the class's pages on briefing room 2's wall screen (a 1024×576 canvas) and its
// whiteboard (1024×503), drawn from one textbook section's lecture units (content/lecture-units.js). The screen is the
// textbook's dark page (#0b1422, its figures' palette): a title bar with the chapter, the section and the page, then
// the unit being read — its text as points, a list, a table with its header row, a box (ここが大切 / 注意 / 考えてみよう /
// 出典 / 関連), a formula, or a figure (its SVG, drawn as the instructor's screen draws one, with its caption). Type is
// as large as the page allows (a long table shrinks, then goes in two columns, then comes in parts the caller turns
// over), so it reads from across the room. The whiteboard holds the section's ここが大切 in marker. Plain canvas 2D: no
// three.
const JP = '"Hiragino Sans", "Yu Gothic UI", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", "Noto Sans JP", sans-serif';
const MONO = '"Consolas", "Menlo", "DejaVu Sans Mono", "Noto Sans Mono CJK JP", monospace';
const HAND = '"Klee One", "Hiragino Maru Gothic ProN", "Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", sans-serif';
// the textbook figures' colours (FLIGHT LAB book-figs.js C)
const PAGE = { bg: '#0b1422', bar: '#13233a', ink: '#e8f0fa', mut: '#92a5be', grid: 'rgba(150,176,206,.28)', cy: '#5fd4ff', gr: '#5fd46a', rd: '#ff6a5a', am: '#ffb23e', vi: '#c58cff', bl: '#3d8bff' };
const font = (px, wt = 500, fam = JP) => `${wt} ${Math.round(px)}px ${fam}`;

// ---- text: wrapped by width, never splitting a word of Latin letters or numbers; a closing mark that does not fit stays
// at the end of its line rather than starting the next
const NO_START = /^[、。，．）」』】〕・：；！？ー…,.)\]:;!?%]/;
function tokens(s) { return String(s).match(/[A-Za-z0-9][A-Za-z0-9.,'’\-/%°:+]*|\s+|./gu) || []; }
function wrap(g, text, maxW) {
  const out = [];
  for (const para of String(text ?? '').split('\n')) {
    let line = '';
    for (const t of tokens(para)) {
      if (g.measureText(line + t).width <= maxW || !line.trim()) {
        if (g.measureText(t).width > maxW && !line.trim()) {             // one token wider than the line: by characters
          for (const ch of t) { if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
        } else line += t;
        continue;
      }
      if (NO_START.test(t) && Array.from(t).length === 1) { line += t; continue; }     // (a closing mark hangs past the edge)
      out.push(line.trimEnd()); line = /^\s+$/.test(t) ? '' : t;
    }
    out.push(line.trimEnd());
  }
  return out;
}
// blocks of text [{ text, color, wt, mono, bullet, term, size (×), gap (× of the line before it) }] laid out in a box at
// the largest size from maxPx down to minPx that fits; → { px, lines: [{ x, y, text, color, wt, px, bullet, term }], height }
function fitBlocks(g, blocks, w, h, maxPx, minPx = 15) {
  let best = null;
  for (let px = maxPx; px >= minPx; px -= 1) {
    const lines = []; let y = 0;
    for (const b of blocks) {
      const p = px * (b.size || 1), lh = p * 1.42, ind = b.bullet ? p * 1.15 : 0;
      y += (b.gap || 0) * p;
      g.font = font(p, b.wt || 500, b.mono ? MONO : JP);
      wrap(g, b.text, w - ind).forEach((t, i) => { lines.push({ x: ind, y, text: t, color: b.color, wt: b.wt || 500, px: p, mono: b.mono, bullet: i === 0 ? b.bullet : null, term: i === 0 ? b.term : null }); y += lh; });
    }
    best = { px, lines, height: y };
    if (y <= h) return best;
  }
  return best;                                                              // (the smallest size: what fits is drawn)
}
function drawBlocks(g, fit, x, y, h) {
  g.textBaseline = 'top';
  for (const l of fit.lines) {
    if (l.y + l.px * 1.2 > h) break;
    g.font = font(l.px, l.wt, l.mono ? MONO : JP);
    if (l.bullet) { g.fillStyle = PAGE.cy; g.fillText(l.bullet, x, y + l.y); }
    // (a list item's term, at its head, in the textbook's colour)
    const term = l.term && l.text.startsWith(l.term) ? l.term : '';
    if (term) { g.fillStyle = PAGE.cy; g.fillText(term, x + l.x, y + l.y); }
    g.fillStyle = l.color || PAGE.ink; g.fillText(l.text.slice(term.length), x + l.x + (term ? g.measureText(term).width : 0), y + l.y);
  }
}
const roundRect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
// a box with a coloured edge and a label (ここが大切, 注意…), its text fitted inside; the box as tall as its text (at most h)
function box(g, x, y, w, h, { label, color, blocks, maxPx = 32 }) {
  const lp = 26, head = 18 + lp * 1.6, foot = 22;
  const fit = fitBlocks(g, blocks, w - 56, h - head - foot, maxPx), bh = Math.min(h, head + fit.height + foot);
  g.fillStyle = 'rgba(255,255,255,0.045)'; roundRect(g, x, y, w, bh, 14); g.fill();
  g.fillStyle = color; g.fillRect(x, y + 8, 7, bh - 16);
  g.font = font(lp, 800); g.fillStyle = color; g.textBaseline = 'top'; g.fillText(label, x + 28, y + 18);
  drawBlocks(g, fit, x + 28, y + head, bh - head - foot / 2);
}

// ---- tables
// the columns' widths: each its natural width while they fit, else the room shared (narrow columns keep theirs)
function widths(nat, room) {
  const n = nat.length, out = new Array(n).fill(0);
  if (nat.reduce((a, b) => a + b, 0) <= room) { const k = room / nat.reduce((a, b) => a + b, 0); return nat.map(v => v * Math.min(k, 1.6)); }
  let left = room, open = nat.map((_, i) => i);
  for (let pass = 0; pass < n && open.length; pass++) {
    const share = left / open.length, small = open.filter(i => nat[i] <= share);
    if (!small.length) { const tot = open.reduce((a, i) => a + nat[i], 0); for (const i of open) out[i] = left * nat[i] / tot; return out; }
    for (const i of small) { out[i] = nat[i]; left -= nat[i]; }
    open = open.filter(i => !small.includes(i));
  }
  return out;
}
// a cell's weight: the heading row bold, the first column (the row's name) half-bold, the rest plain
const cellWt = (isHead, c) => (isHead ? 700 : c === 0 ? 650 : 500);
function tableLayout(g, head, rows, w, { radio = false, px }) {
  const pad = px * 0.32, lh = px * 1.28, cols = Math.max(head ? head.length : 0, ...rows.map(r => r.length));
  const fam = (c, isHead) => (radio && c === 1 && !isHead ? MONO : JP);
  const nat = [];
  for (let c = 0; c < cols; c++) {
    let m = 0;
    for (const r of [head || [], ...rows]) { const hd = r === head; g.font = font(px, cellWt(hd, c), fam(c, hd)); m = Math.max(m, g.measureText(String(r[c] ?? '')).width); }
    nat.push(Math.min(m, w * 0.62) + pad * 2 + 1);
  }
  const cw = widths(nat, w);
  const lay = (r, hd) => {
    const cells = Array.from({ length: cols }, (_, c) => { g.font = font(px, cellWt(hd, c), fam(c, hd)); return wrap(g, String(r[c] ?? ''), Math.max(8, cw[c] - pad * 2)); });
    return { cells, h: Math.max(1, ...cells.map(x => x.length)) * lh + pad * 2 };
  };
  const H = head ? lay(head, true) : null, R = rows.map(r => lay(r, false));
  return { px, pad, lh, cw, head: H, rows: R, height: (H ? H.h : 0) + R.reduce((a, r) => a + r.h, 0), width: cw.reduce((a, b) => a + b, 0) };
}
// rows [from, to) of a laid-out table at (x, y)
function drawTableAt(g, L, x, y, { radio = false, from = 0, to = L.rows.length, n0 = 0 } = {}) {
  let yy = y;
  const row = (r, isHead, k) => {
    g.fillStyle = isHead ? '#1c3350' : k % 2 ? 'rgba(255,255,255,0.065)' : 'rgba(255,255,255,0.025)';
    g.fillRect(x, yy, L.width, r.h);
    let xx = x;
    r.cells.forEach((lines, c) => {
      g.font = font(L.px, cellWt(isHead, c), radio && c === 1 && !isHead ? MONO : JP);
      const who = radio && c === 0 && !isHead ? lines.join('') : '';
      g.fillStyle = isHead ? PAGE.ink : radio ? (c === 0 ? (who === 'あなた' ? PAGE.gr : PAGE.cy) : c === 2 ? PAGE.mut : PAGE.ink) : c === 0 ? PAGE.cy : PAGE.ink;
      lines.forEach((t, i) => g.fillText(t, xx + L.pad, yy + L.pad + i * L.lh + (L.lh - L.px) / 2));
      xx += L.cw[c];
    });
    g.strokeStyle = PAGE.grid; g.lineWidth = 1; g.strokeRect(x + 0.5, yy + 0.5, L.width - 1, r.h - 1);
    yy += r.h;
  };
  g.textBaseline = 'top';
  if (L.head) row(L.head, true, 0);
  for (let k = from; k < to; k++) row(L.rows[k], false, n0 + k);
}
// a table in the content area: the largest type that fits (down to MIN_PX), in two columns when that is what fits (a
// long table of short rows: the alphabet), else in parts of as many rows as fit at MIN_PX (part: which one to draw;
// the caller turns them over). → the number of parts
const MIN_PX = 16;
function drawTable(g, u, x, y, w, h, part = 0) {
  const head = u.head, rows = u.rows || [], s = h / 464;
  for (let px = 26; px >= MIN_PX - 2; px--) {
    const L = tableLayout(g, head, rows, w, { radio: u.radio, px });
    if (L.height <= h && px >= MIN_PX) { drawTableAt(g, L, x + (w - L.width) / 2, y, { radio: u.radio }); return 1; }
    if (rows.length >= 8 && !u.radio) {
      const half = Math.ceil(rows.length / 2), gap = w * 0.03, hw = (w - gap) / 2;
      const A = tableLayout(g, head, rows.slice(0, half), hw, { px }), B = tableLayout(g, head, rows.slice(half), hw, { px });
      if (A.height <= h && B.height <= h && A.width <= hw + 1 && B.width <= hw + 1) {
        drawTableAt(g, A, x, y); drawTableAt(g, B, x + hw + gap, y, { n0: half }); return 1;
      }
    }
  }
  // in parts: the heading on each, as many rows as fit under it
  const foot = 30 * s, L = tableLayout(g, head, rows, w, { radio: u.radio, px: MIN_PX }), room = h - foot - (L.head ? L.head.h : 0), parts = [];
  for (let k = 0, used = 0, from = 0; k <= rows.length; k++) {
    if (k === rows.length || (used + L.rows[k].h > room && k > from)) { parts.push([from, k]); from = k; used = 0; }
    if (k < rows.length) used += L.rows[k].h;
  }
  const [from, to] = parts[((part % parts.length) + parts.length) % parts.length];
  drawTableAt(g, L, x + (w - L.width) / 2, y, { radio: u.radio, from, to });
  g.font = font(17 * Math.min(1.1, s), 600); g.fillStyle = PAGE.am; g.textBaseline = 'top';
  g.fillText(parts.length > 1 ? `${from + 1}〜${to} 行目（全 ${rows.length} 行）　続きは画面が切り替わります` : '', x, y + h - foot + 6 * s);
  return parts.length;
}

// ---- figures: the section's SVG as an image (main.js loads it), fitted in the content area, its caption under it
// the SVG as a data: URL an Image can load (sized from its viewBox, at `px` wide)
export function figureSource(svg, px = 1600) {
  const s = String(svg || '');
  const vb = (/viewBox="([^"]*)"/.exec(s.slice(0, 400)) || [, ''])[1].trim().split(/[\s,]+/).map(Number);
  const ar = vb.length === 4 && vb[2] > 0 && vb[3] > 0 ? vb[3] / vb[2] : 0.6;
  // (in the sans-serif the textbook page sets on its figures: an image's own default is a serif, wider, that runs out
  // of the figures' boxes)
  const out = s.replace(/^<svg(?![^>]*xmlns=)/, '<svg xmlns="http://www.w3.org/2000/svg"')
    .replace(/^<svg /, `<svg width="${px}" height="${Math.round(px * ar)}" ${/^<svg[^>]*font-family=/.test(s) ? '' : `font-family="${JP.replace(/"/g, "'")}" `}`);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(out);
}
function drawFigure(g, u, img, x, y, w, h) {
  const s = h / 464, cap = String(u.caption || '').replace(/^図[：:]\s*/, '');
  g.font = font(19 * Math.min(1.1, s), 500);
  const capLines = cap ? wrap(g, cap, w).slice(0, 3) : [], ch = capLines.length * 19 * s * 1.4 + (cap ? 10 * s : 0);
  const fh = h - ch;
  if (img && img.width && img.height) {
    const k = Math.min(w / img.width, fh / img.height);
    g.drawImage(img, x + (w - img.width * k) / 2, y + (fh - img.height * k) / 2, img.width * k, img.height * k);
  } else { g.fillStyle = PAGE.mut; g.font = font(22 * s, 500); g.textBaseline = 'middle'; g.fillText('（図）', x + w / 2 - 30 * s, y + fh / 2); }
  g.textBaseline = 'top'; g.fillStyle = PAGE.mut; g.font = font(19 * Math.min(1.1, s), 500);
  capLines.forEach((t, i) => g.fillText(t, x, y + fh + 10 * s + i * 19 * s * 1.4));
}

// ---- the page
// page: { chapter: '第 1 章　飛行の原理', title, unit (a lecture unit, or null: the section's first page), k, n, summary,
// part (a long table: which of its parts) }; img: the figure's loaded Image (unit.k 'figure').
// → { parts }: how many parts the page has (more than one: a table too long for one screen, to be turned over)
export function drawLecturePage(g, w, h, page = {}, img = null) {
  const s = h / 576, u = page.unit || null, M = 40 * s;
  g.fillStyle = PAGE.bg; g.fillRect(0, 0, w, h);
  // the title bar: the chapter, the section, the page
  const bar = 78 * s;
  g.fillStyle = PAGE.bar; g.fillRect(0, 0, w, bar); g.fillStyle = PAGE.cy; g.fillRect(0, bar, w, 3 * s);
  g.textBaseline = 'top';
  let x = M, y = bar + 22 * s; const cw = w - 2 * M, bottom = h - 20 * s;
  if (!u) {                                                                  // the section's first page: its title, large
    g.font = font(30 * s, 700); g.fillStyle = PAGE.ink; g.fillText(String(page.chapter || ''), M, 22 * s, w - 2 * M);
    const fit = fitBlocks(g, [{ text: String(page.title || ''), wt: 800, size: 1.5 }, { text: String(page.summary || ''), color: PAGE.mut, gap: 0.9 }], cw, bottom - y - 30 * s, 32, 18);
    drawBlocks(g, fit, x, y + Math.max(0, (bottom - y - fit.height) / 2.4), bottom - y);
    return { parts: 1 };
  }
  const pg = page.n ? `${(page.k ?? 0) + 1} / ${page.n}` : '';
  g.font = font(18 * s, 600); const pw = pg ? g.measureText(pg).width + 20 * s : 0;
  g.fillStyle = PAGE.mut; g.fillText(String(page.chapter || ''), M, 10 * s, w - 2 * M - pw);
  if (pg) g.fillText(pg, w - M - pw + 20 * s, 10 * s);
  let tp = 32 * s; g.font = font(tp, 700);
  while (g.measureText(String(page.title || '')).width > w - 2 * M && tp > 18 * s) { tp -= 1; g.font = font(tp, 700); }
  g.fillStyle = PAGE.ink; g.fillText(String(page.title || ''), M, 36 * s);
  // a heading above the unit, and the line that leads into it
  const top = [];
  if (u.sub) top.push({ text: u.sub, color: PAGE.am, wt: 800 });
  if (u.lead) top.push({ text: u.lead, color: PAGE.ink, gap: top.length ? 0.3 : 0 });
  if (top.length) {
    const fit = fitBlocks(g, top, cw, (bottom - y) * 0.32, 26, 16);
    drawBlocks(g, fit, x, y, (bottom - y) * 0.32); y += fit.height + 14 * s;
  }
  const ch = bottom - y;
  const pts = (list, o = {}) => list.map((t, i) => ({ text: t, bullet: o.num ? `${i + 1}.` : '・', gap: i ? 0.35 : 0, ...o.more }));
  switch (u.k) {
    case 'para': drawBlocks(g, fitBlocks(g, u.heading ? [{ text: u.text, wt: 800, color: PAGE.am, size: 1.2 }] : pts(u.sentences), cw, ch, 40, 16), x, y, ch); break;
    case 'list': {
      const blocks = u.items.map((it, i) => ({ text: it.text, term: it.term, bullet: u.ordered ? `${i + 1}.` : '・', gap: i ? 0.35 : 0 }));
      drawBlocks(g, fitBlocks(g, blocks, cw, ch, 38, 15), x, y, ch);
      break;
    }
    case 'table': return { parts: drawTable(g, u, x, y, cw, ch, page.part || 0) };
    case 'key': box(g, x, y, cw, ch, { label: 'ここが大切', color: PAGE.gr, blocks: pts(u.items), maxPx: 38 }); break;
    case 'caution': box(g, x, y, cw, ch, { label: u.label ? `注意：${u.label}` : '注意', color: PAGE.am, blocks: [{ text: u.text }], maxPx: 38 }); break;
    case 'think': box(g, x, y, cw, ch, { label: '考えてみよう', color: PAGE.vi, blocks: [{ text: u.q, wt: 650 }], maxPx: 44 }); break;
    case 'source': box(g, x, y, cw, ch, { label: '出典', color: PAGE.mut, blocks: [{ text: u.text }], maxPx: 30 }); break;
    case 'see': box(g, x, y, cw, ch, { label: '関連する節（教科書）', color: PAGE.cy, blocks: u.to.map(t => ({ text: `→ ${t.label}`, color: PAGE.cy })), maxPx: 36 }); break;
    case 'formula': {
      const lines = u.lines && u.lines.length ? u.lines : [u.text], literal = !lines.some(l => /[＝=≒]/.test(l));
      g.fillStyle = 'rgba(255,255,255,0.045)'; roundRect(g, x, y, cw, ch, 14 * s); g.fill();
      // (each formula on one row when that leaves it at least 22 px: a formula broken in two reads badly)
      const top = literal ? 28 : 40, wt = literal ? 500 : 650;
      g.font = font(top, wt, literal ? MONO : JP);
      const one = Math.floor(top * (cw - 64 * s) / Math.max(1, ...lines.map(l => g.measureText(l).width)));
      const fit = fitBlocks(g, lines.map((t, i) => ({ text: t, mono: literal, color: literal ? '#9ef0c9' : PAGE.ink, wt, gap: i ? 0.6 : 0 })), cw - 60 * s, ch - 40 * s, one >= 22 ? Math.min(top, one) : top, 14);
      drawBlocks(g, fit, x + 30 * s, y + Math.max(20 * s, (ch - fit.height) / 2), ch - 20 * s);
      break;
    }
    case 'figure': drawFigure(g, u, img, x, y, cw, ch); break;
    default: drawBlocks(g, fitBlocks(g, [{ text: String(u.text || '') }], cw, ch, 30), x, y, ch);
  }
  return { parts: 1 };
}

// ---- the whiteboard: the section's ここが大切 (or, where the book has no such box, its first points) in marker
export function drawKeyBoard(g, w, h, { title = '', points = [], key = true } = {}) {
  g.fillStyle = '#f7f8f6'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(120,130,140,0.06)'; for (let i = 0; i < 6; i++) g.fillRect(w * (0.1 + i * 0.15), 0, w * 0.05, h);
  g.textBaseline = 'top';
  g.fillStyle = key ? '#1f7a45' : '#1d4e9e'; g.font = `700 ${Math.round(h * 0.085)}px ${HAND}`;
  const label = key ? 'ここが大切' : '要点'; g.fillText(label, w * 0.05, h * 0.05);
  const lw = g.measureText(label).width;
  let tp = h * 0.05; g.font = `600 ${Math.round(tp)}px ${HAND}`;
  while (g.measureText(title).width > w * 0.88 - lw - w * 0.04 && tp > 12) { tp -= 1; g.font = `600 ${Math.round(tp)}px ${HAND}`; }
  g.fillStyle = '#3b4248'; g.fillText(title, w * 0.05 + lw + w * 0.04, h * 0.05 + (h * 0.085 - tp) * 0.7);
  g.strokeStyle = '#c0392b'; g.lineWidth = h * 0.008; g.beginPath(); g.moveTo(w * 0.05, h * 0.17); g.lineTo(w * 0.62, h * 0.175); g.stroke();
  const blocks = points.map((t, i) => ({ text: t, bullet: '・', gap: i ? 0.4 : 0 }));
  // (the board's own hand, dark ink)
  let best = null;
  for (let px = Math.round(h * 0.068); px >= 12; px--) {
    g.font = `500 ${px}px ${HAND}`;
    const lines = []; let y = 0;
    blocks.forEach((b) => { y += (b.gap || 0) * px; wrap(g, b.text, w * 0.86).forEach((t, i) => { lines.push({ y, t, first: i === 0 }); y += px * 1.38; }); });
    best = { px, lines }; if (y <= h * 0.74) break;
  }
  g.font = `500 ${best.px}px ${HAND}`;
  for (const l of best.lines) {
    if (h * 0.22 + l.y + best.px > h * 0.98) break;
    if (l.first) { g.fillStyle = '#c0392b'; g.fillText('・', w * 0.05, h * 0.22 + l.y); }
    g.fillStyle = '#202426'; g.fillText(l.t, w * 0.05 + best.px * 1.1, h * 0.22 + l.y);
  }
}
