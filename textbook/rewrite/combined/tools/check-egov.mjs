// check-egov.mjs — DESIGN 5 章 基準 4 (and 3.4「日本の条文は e-Gov の版を決めて引く」): the Japanese articles the book
// cites are in the e-Gov copies (textbook/rewrite/sources/egov/, W05), and the numbers written with them are in them.
//  1. the copies themselves: W05's check.mjs runChecks() (files, versions, dates, URLs, sha256, the text rebuilt from
//     e-Gov's element, the 47 items' Japanese column) — each failure is an error, each warning a warn;
//  2. the book: every citation of 航空法・施行規則 (「航空法施行規則第 178 条」「第 180〜186 条」; a bare「第 n 条」takes the
//     law named before it in the same block, as parseCitations does) in the sections and the end matter names an article
//     that has a copy (error: not copied — add it to manifest.json and run fetch.mjs); a number with a unit (m, ft, kt,
//     hPa, 分, 時間, 日 …) in the same sentence as a citation must be in one of the articles that sentence cites (warn:
//     the value may be wrong, or it comes from elsewhere — a 告示, AIP Japan — and should say so). An article of another
//     law (電波法第 40 条) is noted (info), not checked.
// Report-only like the other checks. In R1 the book has no Japanese citations yet (W06・W08 bring them).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Result, cli } from './lib/report.mjs';
import { blocks, sentences, textOf, clip } from './lib/html.mjs';
import { sectionsOf, chaptersOf, endStrings } from './lib/book.mjs';
import { EGOV, rel } from './lib/paths.mjs';

export const meta = { id: 'egov', title: '日本の条文と e-Gov の写し（写しの検査・本文の条番号と数）', criteria: [4] };

// a number with a unit as the book writes it → the unit key of the copies' tool (egov/lib.mjs UNITS)
const UNIT_OF = [
  [/^\s?(?:km|キロメートル)/, 'km'], [/^\s?(?:m|メートル)(?![a-zA-Z])/, 'm'], [/^\s?(?:ft|フィート|フート)(?![a-zA-Z])/, 'ft'],
  [/^\s?(?:kt|KIAS|ノット)(?![a-zA-Z])/, 'kt'], [/^\s?hPa/, 'hPa'], [/^\s?(?:分間|分)/, 'min'], [/^\s?時間/, 'h'],
  [/^\s?(?:日間|日)(?!本)/, 'd'], [/^\s?(?:か月|ヶ月|箇月)/, 'mo'], [/^\s?年(?!度)/, 'yr'], [/^\s?歳/, 'age'],
  [/^\s?(?:°|度)/, '°'], [/^\s?(?:%|％|パーセント)/, '%'],
];
const NUM = /(?<![\d.,])(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?/g;
export function bookNumbers(text) {
  const out = [];
  for (const m of String(text).matchAll(NUM)) {
    const after = text.slice(m.index + m[0].length);
    const u = UNIT_OF.find(([re]) => re.test(after));
    if (u) out.push({ value: Number((m[1] + (m[2] || '')).replace(/,/g, '')), unit: u[1], raw: m[0] + after.match(u[0])[0] });
  }
  return out;
}

let EG = null;
async function egov() {
  if (EG !== null) return EG;
  const f = path.join(EGOV, 'check.mjs');
  EG = fs.existsSync(f) ? await import(pathToFileURL(f).href) : false;
  return EG;
}

// the problems of one block of text: [{ level, code, msg }]
export function citationProblems(E, text) {
  const out = [];
  let law = null;
  for (const s of sentences(text)) {
    const cites = E.parseCitations(s.t, { defaultLaw: law });
    const refs = [];
    for (const c of cites) {
      const before = s.t.slice(0, s.t.indexOf(c.raw));
      if (!/(?:航空法施行規則|施行規則|航空法)\s*$/.test(before)) {
        if (/[一-鿿]法\s*$/.test(before)) { out.push({ level: 'info', code: 'other-law', msg: `${clip(before.slice(-8) + c.raw, 30)}（航空法・施行規則でない法令：写しの対象外）` }); continue; }
        if (/法\s*$/.test(before)) { out.push({ level: 'warn', code: 'bare-law-name', msg: `「法${c.raw}」：法令名を書く（航空法・航空法施行規則）` }); continue; }
      }
      if (!c.law) { out.push({ level: 'warn', code: 'citation-without-law', msg: `「${c.raw}」：どの法令の条か書いていない` }); continue; }
      law = c.law;
      for (const ref of c.refs) {
        if (!E.loadArticle(ref)) out.push({ level: 'error', code: 'article-not-copied', msg: `「${c.raw}」→ ${ref}：e-Gov の写しにない（manifest.json に足して fetch.mjs）` });
        else refs.push(ref);
      }
    }
    if (!refs.length) continue;
    for (const n of bookNumbers(s.t)) {
      if (refs.some(ref => E.articleHasNumber(ref, n.value, n.unit))) continue;
      out.push({ level: 'warn', code: 'number-not-in-article', msg: `${n.raw}：${refs.join('・')} の条文にない（別の資料の値なら出典を書く）— ${clip(s.t, 60)}` });
    }
  }
  return out;
}

export async function run(env) {
  const r = new Result(meta);
  const E = await egov();
  if (!E) { r.pending('no-copies', rel(EGOV), 'e-Gov の写しがまだない（W05）'); return r; }
  if (!env.only) {
    const c = E.runChecks();
    r.count('copy checks', c.passed + c.failed);
    for (const f of c.failures) r.error('copy-check', rel(EGOV), f);
    for (const w of c.warnings) r.warn('copy-warn', rel(EGOV), w);
    const idx = E.loadIndex();
    r.metric('copies', idx.laws.map(l => `${l.title || l.key}：${l.versionLabel || l.version}・確認 ${l.checked}`).join(' ／ '));
    r.metric('articles copied', idx.articles.length);
  }
  let cites = 0;
  const add = (where, text) => {
    for (const b of blocks(text)) for (const p of citationProblems(E, b.text)) r.add(p.level, p.code, where, p.msg);
    cites += (textOf(text).match(/第\s?[0-9０-９]+\s?条/g) || []).length;
  };
  for (const s of sectionsOf(env)) { r.count('sections'); add(s.id, s.html); }
  for (const ch of chaptersOf(env)) for (const [k, v] of endStrings(ch)) { r.count('end-matter strings'); add(`${ch.id}.${k}`, v); }
  r.metric('「第 n 条」in the book', cites);
  return r;
}

await cli(import.meta.url, meta, run);
