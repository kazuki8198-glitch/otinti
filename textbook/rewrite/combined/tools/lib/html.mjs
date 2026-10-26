// tools/lib/html.mjs — a small HTML walker for the book's own (trusted, simple) HTML: text runs with the stack of
// elements around them (tag + classes), blocks of text, and Japanese sentence splitting. The photos' base64 is cut out
// FIRST (data:image/webp;base64,… can hold "XXX" or "TBD" by chance: DESIGN 4.2).

export const stripB64 = s => String(s).replace(/data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+/g, m => m.slice(0, m.indexOf(',') + 1));

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', times: '×', minus: '−', deg: '°', middot: '·', hellip: '…', ndash: '–', mdash: '—', rarr: '→', larr: '←', uarr: '↑', darr: '↓', le: '≤', ge: '≥', plusmn: '±', micro: 'µ', sup2: '²', sup3: '³', frac12: '½', thinsp: ' ', ensp: ' ', emsp: ' ' };
export const decode = s => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] !== undefined ? ENT[e.toLowerCase()] : m;
});

const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'wbr', 'col', 'source', 'area', 'base', 'param', 'track', 'embed']);
export const BLOCK = new Set(['p', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'tr', 'table', 'div', 'summary', 'details', 'figcaption', 'figure', 'section', 'article', 'blockquote', 'dl', 'dt', 'dd', 'br', 'pre', 'svg', 'text', 'tspan', 'aside', 'header', 'footer']);

const attrOf = (attrs, name) => { const m = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')); return m ? (m[1] ?? m[2] ?? m[3]) : null; };
export { attrOf };

// walk(html) → nodes: { k: 'text', t, path } | { k: 'open', tag, attrs, path } | { k: 'close', tag, path }
// path: the open elements around (outermost first), each { tag, cls: Set, attrs }
export function walk(html) {
  const src = String(html), out = [], stack = [];
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  let last = 0, m;
  const snap = () => stack.slice();
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ k: 'text', t: decode(src.slice(last, m.index)), path: snap() });
    last = re.lastIndex;
    if (m[0].startsWith('<!--')) continue;
    const tag = m[1].toLowerCase(), attrs = m[2] || '';
    if (m[0][1] === '/') {
      const i = stack.map(f => f.tag).lastIndexOf(tag);
      if (i >= 0) { out.push({ k: 'close', tag, path: snap() }); stack.length = i; }
      continue;
    }
    const cls = new Set((attrOf(attrs, 'class') || '').split(/\s+/).filter(Boolean));
    const frame = { tag, cls, attrs };
    if (VOID.has(tag) || m[3] === '/') { out.push({ k: 'open', tag, attrs, path: snap(), self: true, frame }); continue; }
    stack.push(frame);
    out.push({ k: 'open', tag, attrs, path: snap(), frame });
  }
  if (last < src.length) out.push({ k: 'text', t: decode(src.slice(last)), path: snap() });
  return out;
}

export const inCls = (path, ...names) => path.some(f => names.some(n => f.cls.has(n)));
export const inTag = (path, ...tags) => path.some(f => tags.includes(f.tag));
export const clsList = path => path.flatMap(f => [...f.cls]);

// blocks(html, { skip(path) → true to leave a text run out }) → [{ text, path, runs: [{ start, end, path }] }]
// (path: the block's first kept run; runs: where each kept text run is in text, to find the elements around a match)
export function blocks(html, { skip = () => false } = {}) {
  const out = []; let cur = null;
  const flush = () => { if (cur && cur.text.replace(/\s+/g, '').length) out.push(cur); cur = null; };
  for (const n of walk(html)) {
    if (n.k === 'text') {
      if (skip(n.path)) continue;
      const t = n.t.replace(/\s+/g, ' ');
      if (!cur) cur = { text: '', path: n.path, runs: [] };
      cur.runs.push({ start: cur.text.length, end: cur.text.length + t.length, path: n.path });
      cur.text += t;
    } else if (BLOCK.has(n.tag)) flush();
  }
  flush();
  return out;
}
export const runAt = (block, i) => (block.runs.find(r => i >= r.start && i < r.end) || block.runs[block.runs.length - 1]).path;

// plain text (tags out, entities decoded, white space collapsed)
export const textOf = html => decode(String(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// Japanese sentences: split after 。！？ (and ?! before a non-ASCII character) outside 「」『』（）()“”【】
const OPEN = '「『（(“【［[', CLOSE = '」』）)”】］]';
export function sentences(text) {
  const s = String(text), out = []; let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) depth = Math.max(0, depth - 1);
    else if (depth === 0 && ('。！？'.includes(c) || ('?!'.includes(c) && (i + 1 >= s.length || /[^\x00-\x7f]|\s/.test(s[i + 1] || ' ') && !/[A-Za-z]/.test(s[i - 1] || '') )))) {
      let j = i + 1;
      while (j < s.length && CLOSE.includes(s[j])) j++;
      const raw = s.slice(start, j), t = raw.trim();
      if (t) out.push({ t, end: true, at: start + (raw.length - raw.trimStart().length) });
      start = j; i = j - 1;
    }
  }
  const raw = s.slice(start), rest = raw.trim();
  if (rest) out.push({ t: rest, end: false, at: start + (raw.length - raw.trimStart().length) });
  return out;
}

// the length of a sentence the way the style rule counts it: characters without white space
export const jlen = s => [...String(s).replace(/\s+/g, '')].length;
// mostly English (a quoted radio call, a source title) — left out of the Japanese style checks
export const isEnglish = s => { const t = String(s).replace(/\s+/g, ''); if (!t) return true; const ascii = (t.match(/[\x21-\x7e]/g) || []).length; return ascii / [...t].length > 0.6; };

// a short sample of a text around an index (for reports)
export function around(text, i, len = 0, pad = 24) { const s = String(text); const a = Math.max(0, i - pad), b = Math.min(s.length, i + len + pad); return (a > 0 ? '…' : '') + s.slice(a, b) + (b < s.length ? '…' : ''); }
export const clip = (s, n = 70) => { const t = String(s).replace(/\s+/g, ' ').trim(); return [...t].length > n ? [...t].slice(0, n).join('') + '…' : t; };
