// check-volume.mjs — DESIGN 5 章 基準 22 (the amount of text) with the counting of DESIGN 1.2: a section's HTML less
// the figures' SVG, the tags and the white space, an entity counted as one character. The "read first" sections of
// 序部〜第 6 部 (not deep; not the summary chapters gN, not sim) may hold at most 1.4 × today's textbook (about 182,000
// characters in 154 sections → 254,800). Part 7 is outside the limit. Also: characters by part, and the sections
// with less than 200 characters of body (the FLIGHT LAB test's floor is checked by check-chapters).
import { Result, cli } from './lib/report.mjs';
import { decode } from './lib/html.mjs';
import { sectionsOf } from './lib/book.mjs';

export const meta = { id: 'volume', title: '本文の量（序部〜第 6 部の「まず読む節」は今の教科書の 1.4 倍まで）', criteria: [22] };
export const BASE = 182000, FACTOR = 1.4;
export const charsOf = html => [...decode(String(html).replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, '')].length;

export async function run(env) {
  const r = new Result(meta);
  const byPart = {}; let first = 0, deep = 0, all = 0;
  for (const s of sectionsOf(env)) {
    r.count('sections');
    const n = charsOf(s.html), p = s.ch.part;
    all += n; byPart[p] = (byPart[p] || 0) + n;
    if (p === 'p7') continue;
    if (/^g\d$/.test(s.ch.id) || s.ch.id === 'sim') continue;
    if (s.sec.deep) deep += n; else first += n;
  }
  const limit = Math.round(BASE * FACTOR);
  r.metric('characters (all sections)', all.toLocaleString('en-US'));
  r.metric('by part', Object.fromEntries(Object.entries(byPart).map(([k, v]) => [k, v.toLocaleString('en-US')])));
  r.metric('read-first sections of 序部〜第 6 部 / limit', `${first.toLocaleString('en-US')} / ${limit.toLocaleString('en-US')}（${(first / BASE).toFixed(2)} 倍）　deep: ${deep.toLocaleString('en-US')}`);
  if (!env.only && first > limit) r.error('too-long', 'book', `「まず読む節」が ${first} 字（上限 ${limit} 字＝今の教科書 ${BASE} 字 × ${FACTOR}）`);
  return r;
}

await cli(import.meta.url, meta, run);
