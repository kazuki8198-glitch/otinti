// CADET — ui/chair-screen.js : k4's picture on the training device room's wall screen (a canvas, plain 2D): LAB's field
// from above — runway 36, taxiway Alpha and its connectors A1–A3, the east ramp, the way to the practice area — with
// the aircraft where the flight is now (its marker), and beside it the frequencies (LAB ATIS, Ground, Tower), COM1 as it
// is set, the ATIS noted on the kneeboard, and where the run is (its part, n of all, the stage). The field is fictional
// (as content/dialog/atc.js). Drawn large enough to read from the desks.
const JP = '"Hiragino Sans", "Yu Gothic UI", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", "Noto Sans JP", sans-serif';
const MONO = '"Consolas", "Menlo", "DejaVu Sans Mono", "Noto Sans Mono CJK JP", monospace';
const C = { bg: '#0b1422', bar: '#13233a', ink: '#e8f0fa', mut: '#92a5be', grass: '#163322', rwy: '#3b4350', twy: '#4b4636', line: '#f2d36b', cy: '#5fd4ff', am: '#ffb23e', gr: '#6fe3a0' };
const font = (px, wt = 600, fam = JP) => `${wt} ${Math.round(px)}px ${fam}`;
// where the aircraft is drawn for each part of the flight (x, y in 0–1 of the map; the heading in degrees, 0 north)
const AT = { ramp: [0.70, 0.55, 270], hold: [0.47, 0.88, 270], runway: [0.38, 0.86, 0], climb: [0.40, 0.08, 20], area: [0.86, 0.10, 45],
  final: [0.38, 0.99, 0], rollout: [0.38, 0.40, 0], clear: [0.52, 0.42, 90] };
const STAGE_JA = { 1: '① 台本を見ながら', 2: '② 自分の台詞を隠して', 3: '③ 本番（時間制限あり）' };

// v: the runner's view (dialog/chair-flight.js), atis: { letter, wind, alt } noted so far, exit: 'A2' | 'A3'
export function drawChairScreen(g, w, h, { v = null, atis = {}, exit = 'A2', freq = {} } = {}) {
  g.fillStyle = C.bg; g.fillRect(0, 0, w, h);
  g.fillStyle = C.bar; g.fillRect(0, 0, w, h * 0.1);
  g.textBaseline = 'middle'; g.fillStyle = C.ink; g.font = font(h * 0.045, 700);
  g.fillText('k4 交信のチェアフライト　LAB 飛行場（架空）', w * 0.025, h * 0.05);
  if (v) { g.textAlign = 'right'; g.fillStyle = C.cy; g.font = font(h * 0.036); g.fillText(`${STAGE_JA[v.stage] || ''}　${v.n} / ${v.of}`, w * 0.975, h * 0.05); g.textAlign = 'left'; }
  // ---- the map (left two thirds)
  const mx = w * 0.025, my = h * 0.13, mw = w * 0.6, mh = h * 0.84, X = (x) => mx + x * mw, Y = (y) => my + y * mh;
  g.fillStyle = C.grass; g.fillRect(mx, my, mw, mh);
  // the practice area, to the north-east
  g.strokeStyle = C.gr; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(X(0.5), Y(0.15)); g.lineTo(X(0.9), Y(0.04)); g.stroke(); g.setLineDash([]);
  g.fillStyle = C.gr; g.font = font(h * 0.034); g.fillText('訓練空域 LAB-A（北東）', X(0.55), Y(0.15) + h * 0.03);
  // runway 36 (north up), its numbers
  g.fillStyle = C.rwy; g.fillRect(X(0.34), Y(0.18), mw * 0.08, mh * 0.72);
  g.strokeStyle = '#d8dde4'; g.lineWidth = 2; g.setLineDash([12, 10]); g.beginPath(); g.moveTo(X(0.38), Y(0.2)); g.lineTo(X(0.38), Y(0.88)); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#d8dde4'; g.font = font(h * 0.04, 800, MONO); g.textAlign = 'center'; g.fillText('36', X(0.38), Y(0.86)); g.fillText('18', X(0.38), Y(0.22)); g.textAlign = 'left';
  // taxiway Alpha (east of the runway) and its connectors, the east ramp
  g.fillStyle = C.twy; g.fillRect(X(0.55), Y(0.2), mw * 0.04, mh * 0.7);
  for (const [n, y] of [['A1', 0.88], ['A2', 0.6], ['A3', 0.34]]) {
    g.fillStyle = C.twy; g.fillRect(X(0.42), Y(y) - mh * 0.018, mw * 0.13, mh * 0.036);
    g.strokeStyle = C.line; g.lineWidth = 3; g.beginPath(); g.moveTo(X(0.455), Y(y) - mh * 0.02); g.lineTo(X(0.455), Y(y) + mh * 0.02); g.stroke();   // (the hold line)
    g.fillStyle = n === exit ? C.am : C.line; g.font = font(h * 0.032, 700, MONO); g.fillText(n, X(0.6), Y(y));
  }
  g.fillStyle = C.line; g.font = font(h * 0.032, 700, MONO); g.fillText('A', X(0.565), Y(0.17));
  g.fillStyle = '#2c3440'; g.fillRect(X(0.62), Y(0.46), mw * 0.3, mh * 0.18);
  g.fillStyle = C.mut; g.font = font(h * 0.032); g.fillText('東エプロン', X(0.66), Y(0.55));
  g.fillStyle = C.mut; g.font = font(h * 0.028); g.fillText('N↑', X(0.02), Y(0.04));
  // the aircraft where the flight is now
  const at = v && AT[(v.part && PART_AT[v.part]) || ''];
  if (at) {
    const [x, y, hdg] = at, a = hdg * Math.PI / 180, r = h * 0.03, px = X(x), py = Y(Math.min(0.97, y));
    g.save(); g.translate(px, py); g.rotate(a); g.fillStyle = C.am; g.beginPath(); g.moveTo(0, -r * 1.3); g.lineTo(r * 0.8, r); g.lineTo(0, r * 0.5); g.lineTo(-r * 0.8, r); g.closePath(); g.fill(); g.restore();
  }
  // ---- the side: the frequencies, COM1, the kneeboard, where the run is
  const sx = w * 0.65, sw = w * 0.33;
  let y = h * 0.15;
  const row = (k, val, col = C.ink, px = h * 0.04) => { g.fillStyle = C.mut; g.font = font(px * 0.8); g.fillText(k, sx, y); g.fillStyle = col; g.font = font(px, 700, MONO); g.fillText(val, sx + sw * 0.5, y); y += px * 1.45; };
  g.fillStyle = C.cy; g.font = font(h * 0.036, 700); g.fillText('周波数（LAB・架空）', sx, y); y += h * 0.055;
  row('ATIS', freq.atis || '127.65'); row('Ground', freq.ground || '121.7'); row('Tower', freq.tower || '118.3');
  y += h * 0.02;
  row('COM1', v && v.com ? v.com : '—', C.gr, h * 0.05);
  y += h * 0.02;
  g.fillStyle = C.cy; g.font = font(h * 0.036, 700); g.fillText('ひざ板（ATIS）', sx, y); y += h * 0.055;
  row('記号', atis.letter || '—'); row('風', atis.wind || '—'); row('高度計', atis.alt || '—');
  if (v) {
    y += h * 0.03;
    g.fillStyle = C.ink; g.font = font(h * 0.036, 700);
    for (const l of wrapText(g, v.partJa || '', sw)) { g.fillText(l, sx, y); y += h * 0.05; }
  }
}
// the parts of the flight (content/chair-flight.js PART) → where the marker goes
const PART_AT = { atis: 'ramp', ground: 'ramp', tower: 'hold', takeoff: 'runway', leave: 'climb', back: 'area', final: 'final', exit: 'rollout', groundIn: 'clear' };
function wrapText(g, text, maxW) {
  const out = []; let line = '';
  for (const ch of Array.from(String(text))) { if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
  if (line) out.push(line);
  return out;
}
