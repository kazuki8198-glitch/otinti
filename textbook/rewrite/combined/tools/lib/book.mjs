// tools/lib/book.mjs — what the checks read from FL.book: the chapters to check (all, or the ones check-chapter named),
// their sections with the rendered (base64-free) HTML, the end matter's strings, and the parts' order.
import { stripB64 } from './html.mjs';
import { rawHtml } from './load.mjs';

export const allChapters = env => env.FL.book.CHAPTERS;
export const chaptersOf = env => env.only ? env.FL.book.CHAPTERS.filter(c => env.only.has(c.id)) : env.FL.book.CHAPTERS;

const cache = new WeakMap();
// each section once: { ch, sec, id, html (rendered, {ch:} fixed, base64 cut), raw (before {ch:} is fixed, base64 cut) }
export function sectionsOf(env, { all = false } = {}) {
  const out = [];
  for (const ch of all ? allChapters(env) : chaptersOf(env)) for (const sec of ch.secs) {
    let e = cache.get(sec);
    if (!e) {
      let html = '', raw = '', err = null;
      try { raw = stripB64(rawHtml(sec)); html = stripB64(env.FL.book.fix(raw)); } catch (x) { err = x.message; }
      e = { ch, sec, id: sec.id, html, raw, err };
      cache.set(sec, e);
    }
    out.push(e);
  }
  return out;
}

// the end matter's strings of a chapter, each with a label: summary, examples, cautions, quiz (q, choices, why), terms
export function endStrings(ch) {
  const out = [];
  if (ch.summary) out.push(['summary', ch.summary]);
  (ch.examples || []).forEach((s, i) => out.push([`examples[${i}]`, s]));
  (ch.cautions || []).forEach((s, i) => out.push([`cautions[${i}]`, s]));
  (ch.quiz || []).forEach((q, i) => { out.push([`quiz[${i}].q`, q.q]); (q.choices || []).forEach((c, k) => out.push([`quiz[${i}].choices[${k}]`, c])); out.push([`quiz[${i}].why`, q.why]); });
  (ch.terms || []).forEach((t, i) => out.push([`terms[${i}]`, (t || []).join(' / ')]));
  (ch.written || []).forEach((w, i) => { const q = Array.isArray(w) ? w : [w.q, w.a]; out.push([`written[${i}].q`, q[0] || '']); out.push([`written[${i}].a`, q[1] || '']); });
  return out.map(([k, v]) => [k, stripB64(String(v ?? ''))]);
}

export const partOrder = FL => FL.book.PARTS.map(p => p.id);
export function partIndexOf(FL, partId) { const i = partOrder(FL).indexOf(partId); return i < 0 ? Infinity : i; }
export function chapterOfSection(FL, secId) { const x = FL.book.findSection(secId); return x ? x.ch : null; }
export const SCOPES = ['common', 'us', 'jp', 'mixed'];
// the chapters CADET reads (it does not load book-gates.js / book-7.js, and drops intro, english, sim)
export const NOT_IN_CADET = id => /^(intro|english|sim|g\d+|jlaw|jair|jatc|jwx|jifr|jexam)$/.test(id);
