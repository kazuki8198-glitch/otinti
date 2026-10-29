// CADET — content/lecture-units.js : one textbook section's HTML cut into the units a lecture goes through, in the
// book's reading order (pure JS, regex only: no DOM). Read the game's filtered HTML (content/book.js section().html),
// never FLIGHT LAB's own: the filter has already taken out what names the real airline or FLIGHT LAB's own pages.
// The book's markup never nests a tag inside itself (no div in a div, no table in a table, no list in a list, no p in
// an li), so one pattern finds each top-level block whole; figure and details are taken whole before the p inside
// them is seen, and the \b keeps an SVG <path> from reading as a <p>.
// units(html) → [{ k, … }] with k one of
//   para    { text, sentences }               a paragraph
//   list    { ordered, items: [{ text, term }] } term: the item's leading <b>term</b>：, else null
//   table   { radio, head, rows }             head: the first row when it is all th (every table in the book has one);
//                                             radio: an exchange [誰, 英語, 意味] (bk-radio)
//   head    { level, text }                   h3 / h4
//   key     { items }                         ここが大切
//   think   { q, a }                          考えてみよう (details.bk-q: the summary is the question, its p the answer)
//   caution { label, text }                   bk-warn (label: a leading <b>…：</b>, else null)
//   formula { text, lines }                   bk-f: a formula, or a literal string (a METAR, example calls)
//   figure  { svg, viewBox, caption }         every figure, not only the first
//   source  { text }                          p.bk-src (出典：…)
//   see     { to: [{ sec, label }] }          a paragraph that is only links to other sections (sec null: not in this book)
//   note    { text }                          p.mute (a note on the examples, as the book prints it)
//   sim / calc                                FLIGHT LAB's own boxes (only in its unfiltered HTML)
//   other / loose                             anything else (none in the book today: kept so nothing is lost silently)
import { plain, sentences } from './book.js';

const BLOCK = /<(p|ul|ol|h3|h4|table|div|figure|details)\b([^>]*)>([\s\S]*?)<\/\1>/g;
const attr = (a, n) => { const m = new RegExp(`\\b${n}="([^"]*)"`).exec(a || ''); return m ? m[1] : ''; };
const cells = (row) => [...row.matchAll(/<t([hd])\b[^>]*>([\s\S]*?)<\/t\1>/g)].map(c => ({ th: c[1] === 'h', text: plain(c[2]) }));
// a paragraph that is only links: FLIGHT LAB's buttons, or the game book's span.bk-see that replaced them
const LINKS = /^\s*(?:<(button|span)\b[^>]*(?:data-sec|class="bk-see")[^>]*>[\s\S]*?<\/\1>\s*)+$/;
const linksIn = (inner) => [...inner.matchAll(/<(button|span)\b([^>]*)>([\s\S]*?)<\/\1>/g)]
  .map(x => ({ sec: attr(x[2], 'data-sec') || null, label: plain(x[3]).replace(/^→\s*/, '') }));
// a formula box holds one or more formulas, set apart by a line break or a wide gap
// (split before plain(), which folds every run of spaces into one)
const formulaLines = (inner) => inner.split(/<br\s*\/?>|\u3000{2,}/).map(plain).filter(Boolean);

export function units(html) {
  const out = [], h = String(html ?? '');
  let at = 0;
  for (const m of h.matchAll(BLOCK)) {
    const gap = plain(h.slice(at, m.index)); if (gap) out.push({ k: 'loose', text: gap });
    at = m.index + m[0].length;
    const [, tag, a, inner] = m, cls = attr(a, 'class');
    if (tag === 'h3' || tag === 'h4') out.push({ k: 'head', level: +tag[1], text: plain(inner) });
    else if (tag === 'p' && /\bbk-src\b/.test(cls)) out.push({ k: 'source', text: plain(inner).replace(/^出典[：:]\s*/, '') });
    else if (tag === 'p' && /\bmute\b/.test(cls)) out.push({ k: 'note', text: plain(inner) });
    else if (tag === 'p' && LINKS.test(inner)) out.push({ k: 'see', to: linksIn(inner) });
    else if (tag === 'p') { const text = plain(inner); out.push({ k: 'para', text, sentences: sentences(text) }); }
    else if (tag === 'ul' || tag === 'ol') {
      out.push({ k: 'list', ordered: tag === 'ol', items: [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(x => {
        const lead = /^\s*<b>([\s\S]*?)<\/b>\s*[：:]/.exec(x[1]);
        return { text: plain(x[1]), term: lead ? plain(lead[1]) : null };
      }) });
    } else if (tag === 'table') {
      const rows = [...inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(r => cells(r[1]));
      const head = rows[0] && rows[0].length && rows[0].every(c => c.th) ? rows.shift().map(c => c.text) : null;
      out.push({ k: 'table', radio: /\bbk-radio\b/.test(cls), head, rows: rows.map(r => r.map(c => c.text)) });
    } else if (tag === 'figure') {
      const cap = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/.exec(inner);
      const svg = (/<svg\b[\s\S]*?<\/svg>/.exec(inner) || [''])[0], open = (/<svg\b[^>]*>/.exec(svg) || [''])[0];
      out.push({ k: 'figure', svg, viewBox: attr(open, 'viewBox'), caption: cap ? plain(cap[1]) : attr(open, 'aria-label') });
    } else if (tag === 'details') {
      const s = /<summary\b[^>]*>([\s\S]*?)<\/summary>/.exec(inner), ans = /<p\b[^>]*>([\s\S]*?)<\/p>/.exec(inner);
      out.push({ k: 'think', q: plain(s ? s[1] : '').replace(/^考えてみよう[：:]\s*/, ''), a: plain(ans ? ans[1] : '') });
    } else if (/\bbk-key\b/.test(cls)) out.push({ k: 'key', items: [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(x => plain(x[1])).filter(Boolean) });
    else if (/\bbk-warn\b/.test(cls)) {
      const lab = /^\s*<b>([^<]*?)[：:]<\/b>/.exec(inner);
      out.push({ k: 'caution', label: lab ? lab[1] : null, text: plain(lab ? inner.slice(lab[0].length) : inner) });
    } else if (/\bbk-f\b/.test(cls)) out.push({ k: 'formula', text: plain(inner), lines: formulaLines(inner) });
    else if (/\bbk-sim\b/.test(cls)) out.push({ k: 'sim', text: plain(inner.replace(/<button[\s\S]*?<\/button>/g, '')).replace(/^✈\s*シミュレータで体験：/, ''), lessons: [...inner.matchAll(/data-lesson="([^"]+)"/g)].map(x => x[1]) });
    else if (/\bbk-calc\b/.test(cls)) out.push({ k: 'calc', name: attr(a, 'data-calc') });
    else out.push({ k: 'other', tag, cls, text: plain(inner) });
  }
  const tail = plain(h.slice(at)); if (tail) out.push({ k: 'loose', text: tail });
  return out;
}

// what a lecture says and shows, unit by unit: a heading goes with the unit under it (sub: said first, shown above it on
// the screen), a paragraph that ends in "：" leads into the unit it introduces (原因は 4 つ（PHAK）： → the list); the
// notes on the book's own examples, FLIGHT LAB's boxes and anything unknown are left out (the textbook overlay still
// shows them). Kept per section: the screen's pages ('page' hooks, secId#k) index into this list.
const TAUGHT = new Set(['para', 'list', 'table', 'key', 'think', 'caution', 'formula', 'figure', 'source', 'see']);
const CACHE = new Map();
export function lectureUnits(sec) {
  if (!sec || typeof sec.html !== 'string') return [];
  const hit = CACHE.get(sec.id);
  if (hit && hit.html === sec.html) return hit.units;
  const raw = units(sec.html).filter(u => u.k === 'head' || TAUGHT.has(u.k)), out = [];
  for (let i = 0; i < raw.length; i++) {
    const u = { ...raw[i] };
    if (u.k === 'head') {
      const next = raw[i + 1];
      if (next && next.k !== 'head') { raw[i + 1] = { ...next, sub: next.sub ? `${u.text}　${next.sub}` : u.text }; continue; }
      out.push({ k: 'para', text: u.text, sentences: [u.text], heading: true }); continue;   // a heading with nothing under it
    }
    const next = raw[i + 1];
    if (u.k === 'para' && /[：:]$/.test(u.text) && next && TAUGHT.has(next.k) && next.k !== 'para' && !next.lead && !next.sub) {
      raw[i + 1] = { ...next, lead: u.text, ...(u.sub ? { sub: u.sub } : {}) }; continue;
    }
    out.push(u);
  }
  CACHE.set(sec.id, { html: sec.html, units: out });
  return out;
}

// a section's prose, the sentences a lecture must say in order (paragraphs, list items and the lines that lead into
// a unit, their "：" left off as the lecture says them; not tables, figures, cautions, sources or the boxes): what the
// tests check the class against
export const leadText = (t) => String(t || '').replace(/[：:]\s*$/, '');
export function proseOf(sec) {
  const out = [];
  for (const u of lectureUnits(sec)) {
    if (u.lead) out.push(...sentences(leadText(u.lead)));
    if (u.k === 'para' && !u.heading) out.push(...u.sentences);
    if (u.k === 'list') for (const it of u.items) out.push(...sentences(it.text));
  }
  return out;
}
