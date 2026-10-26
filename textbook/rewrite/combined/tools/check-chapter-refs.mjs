// check-chapter-refs.mjs — DESIGN 6.2 決まり 2・3: no hand-written「第 N 章」for a chapter of this book (the numbers
// change when chapters are added: write {ch:id} or bk.see). A「第 N 章」is fine when a source names it just before
// (PHAK 第 11 章, AWH 第 3 章・第 24〜27 章, AIM 第 8 章, 基礎教材 第 5 章 …). Read from the sections BEFORE {ch:} is
// turned into 第 N 章, from the end matter, and from the ground-school test banks.
import { Result, cli } from './lib/report.mjs';
import { textOf, clip } from './lib/html.mjs';
import { sectionsOf, chaptersOf, endStrings } from './lib/book.mjs';

export const meta = { id: 'chapter-refs', title: '直書きの「第 N 章」（出典の前置きのないもの）', criteria: [] };

const CH_RE = /第\s?\d+(?:\s?[〜~–\-・、]\s?\d+)*\s?章/g;
export const PREFIX = /(PHAK|AFH|IFH|IPH|AWH|RMH|AIM|W&B|FAA-H-[\d-]+[A-Z]?|Handbook|ハンドブック|手引き|マニュアル|Manual|AC\s?\d|POH|AFM|基礎教材|第\s?3\s?版|Doc\s?\d+|Annex|附属書|ICAO|Chart Supplement|ACS|CFR|Order|JO\s?7110|CAP\s?\d+|報告書|PDF)/;

export function findHardRefs(text) {
  const out = [];
  for (const m of text.matchAll(CH_RE)) {
    const back = text.slice(Math.max(0, m.index - 40), m.index), cut = back.lastIndexOf('。');
    const look = cut >= 0 ? back.slice(cut + 1) : back;
    if (PREFIX.test(look)) continue;
    out.push({ i: m.index, s: m[0], ctx: clip(text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 10), 60) });
  }
  return out;
}

export async function run(env) {
  const r = new Result(meta);
  for (const s of sectionsOf(env)) {
    r.count('sections');
    for (const x of findHardRefs(textOf(s.raw))) r.error('hard-chapter-number', s.id, `「${x.s}」：${x.ctx}`);
  }
  for (const ch of chaptersOf(env)) for (const [k, v] of endStrings(ch)) {
    r.count('end-matter strings');
    for (const x of findHardRefs(textOf(v))) r.error('hard-chapter-number', `${ch.id}.${k}`, `「${x.s}」：${x.ctx}`);
  }
  const Q = env.FL.quiz;
  if (Q && Q.BANKS && !env.only) for (const b of Q.BANKS) b.qs.forEach((q, i) => {
    r.count('test questions');
    for (const [k, v] of [['q', q[0]], ...q[1].map((c, j) => [`choices[${j}]`, c]), ['why', q[3]]])
      for (const x of findHardRefs(textOf(v))) r.error('hard-chapter-number', `${b.id}[${i}].${k}`, `「${x.s}」：${x.ctx}`);
  });
  return r;
}

await cli(import.meta.url, meta, run);
