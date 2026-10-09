// FLIGHT LAB — ui.js : small shared pieces of the interface (pure functions that return HTML / SVG strings):
// line icons, key chips made from a lesson's key text ("S＝機首上げ・W＝機首下げ" → [S] 機首上げ [W] 機首下げ),
// and a keyboard map (every key the trainer uses, coloured by what it moves, the keys of this step lit up).
(function (FL) {
  'use strict';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // ---------------------------------------------------------------- icons (24 × 24, drawn with the current colour)
  const ICONS = {
    school: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.2 9 2.2 12 0v-5"/><path d="M22 9v6"/>',
    plane: '<path d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 00-3 0V8.5l-8 5v2l8-2.5V19l-2 1.5v1.5l3.5-1 3.5 1v-1.5L13 19v-6z"/>',
    book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21h15M8 7h7M8 10h5"/>',
    radio: '<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.2"/><rect x="17" y="14" width="4" height="6" rx="1.2"/>',
    quiz: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 12l3 3 5-6"/>',
    gauge: '<circle cx="12" cy="13" r="8"/><path d="M12 13l4-4M8 5.5L7 4M16 5.5l1-1.5"/>',
    keys: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 00-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 014.8.8c0 1.8-2.4 2.1-2.4 3.8M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
    pause: '<path d="M9 5v14M15 5v14"/>', eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    sound: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.5a3.5 3.5 0 010 5M18 7a7 7 0 010 10"/>', layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 13h18M10 13v7"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  };
  const ico = (name, size = 22) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  // ---------------------------------------------------------------- key chips from a lesson's key text
  // parts are separated by "　"; inside a part, "・" starts a new key when a key name and "＝" follow
  const KEYNAME = '(?:Shift\\+)?(?:[A-Z0-9\\[\\]]|Space|Enter)';
  const SPLIT = new RegExp(`・(?=${KEYNAME}(?:\\s*\\/\\s*${KEYNAME})*＝)`);
  function parseKeys(text) {
    const out = [];
    for (const part of String(text || '').split('　').filter(Boolean)) for (const it of part.split(SPLIT)) {
      const m = /^(.+?)＝(.*)$/.exec(it);
      if (m && m[1].length <= 16 && new RegExp(`^${KEYNAME}(\\s*\\/\\s*${KEYNAME})*$`).test(m[1].trim())) out.push({ keys: m[1].split(/\s*\/\s*/).map(k => k.trim()), what: m[2] });
      else out.push({ keys: [], what: it });
    }
    return out;
  }
  const keyChips = text => parseKeys(text).map(p => `<span class="kc">${p.keys.map(k => `<kbd>${esc(k)}</kbd>`).join('')}<span>${esc(p.what)}</span></span>`).join('');
  const keysUsed = text => [...new Set(parseKeys(text).flatMap(p => p.keys).map(k => k.replace(/^Shift\+/, '')))];

  // ---------------------------------------------------------------- the keyboard map
  const GROUPS = { pitch: ['#5fd4ff', '機首・傾き'], rud: ['#ffb547', 'ラダー'], pwr: ['#58e08c', '出力'], cfg: ['#c58cff', 'トリム・フラップ・脚・フェザー'], brk: ['#ff6a5a', 'ブレーキ'], sys: ['#92a5be', 'そのほか'] };
  // [key, x (key widths), row, width, group, label]
  const KB = [
    ['Esc', 0, 0, 1.2, 'sys', '一時停止'], ['1', 1.6, 0, 1, 'sys', '管制①'], ['2', 2.6, 0, 1, 'sys', '管制②'], ['3', 3.6, 0, 1, 'sys', '管制③'],
    ['Q', 1.5, 1, 1, 'rud', 'ラダー\n左'], ['W', 2.5, 1, 1, 'pitch', '機首\n下げ'], ['E', 3.5, 1, 1, 'rud', 'ラダー\n右'], ['R', 4.5, 1, 1, 'pwr', '出力\n＋'], ['T', 5.5, 1, 1, 'cfg', 'トリム'],
    ['Y', 6.5, 1, 1, '', ''], ['U', 7.5, 1, 1, 'sys', '自動\nラダー'], ['I', 8.5, 1, 1, '', ''], ['O', 9.5, 1, 1, '', ''], ['P', 10.5, 1, 1, 'sys', '一時\n停止'], ['[', 11.5, 1, 1, 'cfg', 'フェザー\n左'], [']', 12.5, 1, 1, 'cfg', 'フェザー\n右'],
    ['A', 1.75, 2, 1, 'pitch', '左に\n傾ける'], ['S', 2.75, 2, 1, 'pitch', '機首\n上げ'], ['D', 3.75, 2, 1, 'pitch', '右に\n傾ける'], ['F', 4.75, 2, 1, 'pwr', '出力\n－'], ['G', 5.75, 2, 1, 'cfg', '脚'],
    ['H', 6.75, 2, 1, 'sys', 'キー\n一覧'], ['J', 7.75, 2, 1, '', ''], ['K', 8.75, 2, 1, '', ''], ['L', 9.75, 2, 1, 'sys', '水平\n(自由)'], ['Enter', 12.0, 2, 1.9, 'sys', 'チェック\nリスト'],
    ['Shift', 0, 3, 2.1, 'pwr', '＋R / F で\n一気に'], ['Z', 2.25, 3, 1, 'rud', 'ラダー\nトリム左'], ['X', 3.25, 3, 1, 'rud', 'ラダー\nトリム右'], ['C', 4.25, 3, 1, 'sys', '視点'], ['V', 5.25, 3, 1, 'cfg', 'フラップ'],
    ['B', 6.25, 3, 1, 'brk', 'ブレーキ'], ['N', 7.25, 3, 1, '', ''], ['M', 8.25, 3, 1, '', ''],
    ['Space', 3.6, 4, 5.4, 'brk', 'ブレーキ（押している間）'],
  ];
  function keyboardSvg(hl = [], o = {}) {
    const U = 50, G = 4, W = 14.1 * U, Hh = 5 * U + (o.legend === false ? 6 : 34), lit = new Set(hl.map(k => String(k).toUpperCase()));
    let s = `<svg class="kbmap" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="キーボードの配置：使うキーと動かすもの"><defs><filter id="kbglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    for (const [k, x, row, w, g, lab] of KB) {
      const col = g ? GROUPS[g][0] : '#2a3a50', on = lit.has(k.toUpperCase()), dim = lit.size && !on && g;
      const X = x * U + G / 2, Y = row * U + G / 2, Wk = w * U - G, Hk = U - G;
      s += `<g opacity="${!g ? 0.35 : dim ? 0.45 : 1}"${on ? ' filter="url(#kbglow)"' : ''}>`;
      s += `<rect x="${X}" y="${Y}" width="${Wk}" height="${Hk}" rx="7" fill="${g ? col + (on ? '55' : '22') : '#0f1a29'}" stroke="${on ? '#ffffff' : g ? col : '#2a3a50'}" stroke-width="${on ? 2.6 : 1.2}"/>`;
      s += `<text x="${X + 7}" y="${Y + 17}" fill="${g ? '#ffffff' : '#56677d'}" font-size="${k.length > 2 ? 12 : 15}" font-weight="700" font-family="system-ui,sans-serif">${esc(k)}</text>`;
      if (lab) lab.split('\n').forEach((t, i) => { s += `<text x="${X + Wk / 2}" y="${Y + 30 + i * 10.5}" fill="${col}" font-size="9.2" text-anchor="middle" font-family="system-ui,sans-serif">${esc(t)}</text>`; });
      s += '</g>';
    }
    if (o.legend !== false) {
      let lx = 4; const ly = 5 * U + 20;
      for (const [, [c, name]] of Object.entries(GROUPS)) { s += `<circle cx="${lx + 6}" cy="${ly - 4}" r="5.5" fill="${c}"/><text x="${lx + 15}" y="${ly}" fill="#c9d7e8" font-size="12" font-family="system-ui,sans-serif">${esc(name)}</text>`; lx += 24 + name.length * 12.2; }
    }
    return s + '</svg>';
  }
  FL.ui = { esc, ico, ICONS, parseKeys, keyChips, keysUsed, keyboardSvg, KB, GROUPS };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
