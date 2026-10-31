// check-volume.mjs — DESIGN 5 章 基準 22 (the amount of text) with the counting of DESIGN 1.2: a section's HTML less
// the figures' SVG, the tags and the white space, an entity counted as one character. The "read first" text of 序部〜第 6 部
// (not the summary chapters gN, not sim) may hold at most 1.4 × today's textbook (about 182,000 characters in 154 sections
// → 254,800). Part 7 is outside the limit.
// 「発展」 (DESIGN 3.2「読み方の 2 つの道」, the owner's decision 12) is a deep section (deep: true) and the folds inside
// a section — もっと深く (bk.deep) and 計算演習 (bk.drill), the <details> FL.book.bk's fold() draws, closed on the screen and
// skipped in CADET's classes: they are not read first, so they are counted apart (Wdeep, R3). 考えてみよう (bk.q) is a
// box of the read-first text (its answer was counted in today's textbook's 182,000 too).
// The part budgets (ledgers/VOLUME.json, Wdeep) share the limit among p0〜p6: a part over its budget is a warn, the
// book over the limit an error (with check-chapter: the chapters named, and the parts they are in).
// Also: by part and by chapter, and the read-first sections with less than 200 characters left out of their folds.
import fs from 'node:fs';
import path from 'node:path';
import { Result, cli } from './lib/report.mjs';
import { decode } from './lib/html.mjs';
import { sectionsOf } from './lib/book.mjs';
import { COMBINED } from './lib/paths.mjs';

export const meta = { id: 'volume', title: '本文の量（序部〜第 6 部の「まず読む」本文は今の教科書の 1.4 倍まで。発展の節と折りたたみは別に数える）', criteria: [22] };
export const BASE = 182000, FACTOR = 1.4, LIMIT = Math.round(BASE * FACTOR);
export const FOLDS = ['bk-deep', 'bk-drill'];
export const charsOf = html => [...decode(String(html).replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, '')].length;
// the HTML without its folds (a fold is cut to its own </details>, so a fold may hold another <details>)
export function cutFolds(html) {
  const src = String(html), re = new RegExp(`<details class="(?:${FOLDS.join('|')})">`, 'g');
  let out = '', at = 0, m;
  while ((m = re.exec(src))) {
    if (m.index < at) continue;
    out += src.slice(at, m.index);
    const tag = /<(\/?)details\b[^>]*>/g; tag.lastIndex = m.index;
    let depth = 0, end = src.length, t;
    while ((t = tag.exec(src))) { depth += t[1] ? -1 : 1; if (depth === 0) { end = tag.lastIndex; break; } }
    at = end; re.lastIndex = end;
  }
  return out + src.slice(at);
}
// what counts toward the limit: 序部〜第 6 部, not a summary chapter, not sim
export const counted = ch => ch.part !== 'p7' && !/^g\d+$/.test(ch.id) && ch.id !== 'sim';
// a section's characters: all, read first (0 for a deep section), in folds, in a deep section
export function measure(sec, html) {
  const all = charsOf(html);
  if (sec.deep) return { all, first: 0, folds: 0, deep: all };
  const first = charsOf(cutFolds(html));
  return { all, first, folds: all - first, deep: 0 };
}
// the part budgets (ledgers/VOLUME.json), or null
export function budgets(file = path.join(COMBINED, 'ledgers', 'VOLUME.json')) {
  try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); return Object.fromEntries(Object.entries(j.parts || {}).map(([k, v]) => [k, v.budget])); } catch { return null; }
}
const n = x => x.toLocaleString('en-US');

export async function run(env) {
  const r = new Result(meta);
  const B = budgets();
  const byPart = {}, byCh = new Map();
  let first = 0, deep = 0, folds = 0, all = 0;
  // the whole book, whatever check-chapter named (the limit and the budgets are the book's and the parts')
  for (const s of sectionsOf(env, { all: true })) {
    const m = measure(s.sec, s.html), p = s.ch.part;
    all += m.all;
    const P = byPart[p] ||= { all: 0, first: 0, folds: 0, deep: 0, outside: 0 };
    P.all += m.all;
    if (!counted(s.ch)) { P.outside += m.all; continue; }
    P.first += m.first; P.folds += m.folds; P.deep += m.deep;
    first += m.first; folds += m.folds; deep += m.deep;
    const C = byCh.get(s.ch.id) || { ch: s.ch, first: 0, all: 0, folds: 0, deep: 0, secs: 0, deepSecs: 0 };
    C.first += m.first; C.all += m.all; C.folds += m.folds; C.deep += m.deep; C.secs++; if (s.sec.deep) C.deepSecs++;
    byCh.set(s.ch.id, C);
    if (!s.sec.deep && m.first < 200 && (!env.only || env.only.has(s.ch.id))) r.info('thin-first', s.id, `折りたたみの外の本文が ${m.first} 字（全体 ${m.all} 字）`);
  }
  for (const s of sectionsOf(env)) r.count('sections');
  r.metric('characters (all sections)', n(all));
  r.metric('read-first of 序部〜第 6 部 / limit', `${n(first)} / ${n(LIMIT)}（今の教科書の ${(first / BASE).toFixed(2)} 倍）　発展：deep の節 ${n(deep)}・折りたたみ ${n(folds)}`);
  const parts = Object.keys(byPart).filter(p => p !== 'p7');
  r.metric('by part (read first / budget · deep sections · folds)', Object.fromEntries(parts.map(p => {
    const P = byPart[p], b = B && B[p];
    return [p, `${n(P.first)}${b ? ` / ${n(b)}` : ''} · ${n(P.deep)} · ${n(P.folds)}${P.outside ? `（数えない章 ${n(P.outside)}）` : ''}`];
  })));
  const chs = [...byCh.values()].filter(C => !env.only || env.only.has(C.ch.id));
  r.metric('by chapter (read first / all)', Object.fromEntries(chs.map(C => [C.ch.id, `${n(C.first)} / ${n(C.all)}${C.deepSecs ? `（発展の節 ${C.deepSecs}）` : ''}`])));
  if (!B) r.pending('no-budgets', 'ledgers/VOLUME.json', '部ごとの予算がない（Wdeep）');
  else {
    const sum = Object.values(B).reduce((a, x) => a + (x || 0), 0);
    if (sum !== LIMIT) r.warn('budget-sum', 'ledgers/VOLUME.json', `部の予算の合計 ${n(sum)} 字が上限 ${n(LIMIT)} 字と違う`);
    const watch = env.only ? new Set(chs.map(C => C.ch.part)) : new Set(parts);
    for (const p of parts) if (watch.has(p) && B[p] && byPart[p].first > B[p]) r.warn('over-budget', p, `「まず読む」本文が ${n(byPart[p].first)} 字（予算 ${n(B[p])} 字、${n(byPart[p].first - B[p])} 字多い）`);
  }
  if (!env.only && first > LIMIT) r.error('too-long', 'book', `「まず読む」本文が ${n(first)} 字（上限 ${n(LIMIT)} 字＝今の教科書 ${n(BASE)} 字 × ${FACTOR}）`);
  return r;
}

await cli(import.meta.url, meta, run);
