// check-style.mjs — the writing rules of DESIGN 5 章 基準 21 (and STYLE.md), on the section bodies:
//  です・ます (no plain form), no 体言止め in the body, sentence length (average ≤ 40, longest ≤ 80 characters without
//  white space; tables and「ここが大切」left out), hedges (とは限りません・場合があります …) at most once per section
//  outside「ここに注意」(bk-warn), a space between a number and its unit (STYLE), and — when FL.terms exists — the
//  first use of a term in a chapter written「正式名（通称、English）」.
// Left out of the Japanese checks: figures and their captions, photos, tables, ここが大切, formulas, calculators,
// sources, buttons, tags, headings, the「考えてみよう」question line, and mostly-English sentences.
import { Result, cli } from './lib/report.mjs';
import { blocks, sentences, jlen, isEnglish, inCls, inTag, clip, textOf } from './lib/html.mjs';
import { sectionsOf, chaptersOf } from './lib/book.mjs';

export const meta = { id: 'style', title: '文体（です・ます・体言止め・文の長さ・留保の言い方）', criteria: [21] };

export const LIMITS = { avg: 40, max: 80, hedgesPerSection: 1 };
export const HEDGES = ['とは限りません', 'とは限らない', '場合があります', '場合もあります', 'ことがあります', 'こともあります', 'かもしれません', '可能性があります', '必ずしも', '一概に', 'と考えられます', 'とされています', 'と言われています', 'おそれがあります'];
const HEDGE_RE = new RegExp(HEDGES.join('|'), 'g');
const POLITE = /(です|ます|ました|でした|ません|ましょう|でしょう|ください|下さい|ませんか|ですか|ますか|でしょうか|ましょうか|ませんでした|ですね|ますね|ですよ|ますよ|ません)$/;
const PLAIN = /(である|であった|だ|だった|ない|なかった|る|た|う|く|す|つ|ぬ|む|ぶ|ぐ|い|れる|られる|せる|よう|だろう)$/;
const UNIT_RE = /(?<![A-Za-z0-9.,])\d[\d,]*(?:\.\d+)?(kt|KIAS|KTAS|KCAS|ft|fpm|NM|SM|inHg|hPa|lb|lbs|gal|rpm|MHz|kHz)(?![A-Za-z])/g;

export const skipForStyle = path => inTag(path, 'figure', 'svg', 'table', 'summary', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'a')
  || inCls(path, 'bk-key', 'bk-src', 'bk-f', 'bk-calc', 'bk-credit', 'tag', 'bk-photo', 'bk-t');

// the end of a sentence: 'polite' | 'plain' | 'noun' (体言止め) | 'skip'
export function ending(sentence) {
  let t = sentence.replace(/[。！？!?\s]+$/, '').trim();
  for (let k = 0; k < 4 && /[）)]$/.test(t); k++) {      // drop a trailing (balanced) parenthesis: …です（14 CFR 23.2005(d)）。
    let d = 0, j = t.length - 1;
    for (; j >= 0; j--) { if ('）)'.includes(t[j])) d++; else if ('（('.includes(t[j]) && --d === 0) break; }
    if (j <= 0) break; t = t.slice(0, j).trim();
  }
  if (!t) return 'skip';
  if (/[：:、,]$/.test(t)) return 'skip';
  if (/[」』”"】]$/.test(t)) return 'skip';
  if (/^(はい|いいえ|いや|ええ|OK)$/.test(t)) return 'skip';
  if (POLITE.test(t)) return 'polite';
  if (PLAIN.test(t)) return 'plain';
  return 'noun';
}

function termsOf(FL) {
  const T = FL.terms; if (!T) return null;
  const list = Array.isArray(T) ? T : Array.isArray(T.list) ? T.list : Object.values(T);
  return list.map(t => Array.isArray(t) ? { formal: t[0], en: t[2] || t[1] } : { formal: t.formal || t.name || t.ja || t.t, en: t.en || t.english || t.faa })
    .filter(t => t.formal && t.en && String(t.formal).length >= 2);
}

export async function run(env) {
  const r = new Result(meta);
  let nSent = 0, nChars = 0, longest = { n: 0 }, hedgesAll = 0, warnHedges = 0;
  const perSection = [];
  for (const s of sectionsOf(env)) {
    r.count('sections');
    if (s.err) { r.error('render', s.id, s.err); continue; }
    const bl = blocks(s.html, { skip: skipForStyle });
    let sn = 0, sc = 0, hedges = [], warnH = 0;
    for (const b of bl) {
      const inLi = inTag(b.path, 'li', 'td', 'th', 'dd'), inWarn = inCls(b.path, 'bk-warn');
      const hs = [...b.text.matchAll(HEDGE_RE)].map(m => m[0]);
      if (inWarn) warnH += hs.length; else hedges.push(...hs);
      for (const m of b.text.matchAll(UNIT_RE)) r.warn('unit-space', s.id, `数字と単位の間に空白がない：「${clip(b.text.slice(Math.max(0, m.index - 12), m.index + m[0].length + 8), 40)}」`);
      for (const x of sentences(b.text)) {
        if (isEnglish(x.t)) continue;
        const n = jlen(x.t);
        sn++; sc += n; nSent++; nChars += n;
        if (n > longest.n) longest = { n, where: s.id, t: x.t };
        if (n > LIMITS.max) r.warn('long-sentence', s.id, `${n} 字：「${clip(x.t, 60)}」`);
        if (!x.end && inLi) continue;                       // a list item or table cell without 。 is a fragment
        const e = ending(x.t);
        if (e === 'plain' && inLi) r.warn('not-polite-list', s.id, `箇条書きの常体の文末：「${clip(x.t.slice(-40), 40)}」`);
        else if (e === 'plain') r.error('not-polite', s.id, `常体の文末：「${clip(x.t.slice(-40), 40)}」`);
        else if (e === 'noun' && inLi) r.warn('taigen-dome-list', s.id, `箇条書きの体言止め：「${clip(x.t.slice(-40), 40)}」`);
        else if (e === 'noun' && /^[^。、]{1,14}[：:]/.test(x.t)) r.warn('taigen-dome-label', s.id, `見出しつきの文の体言止め：「${clip(x.t, 50)}」`);
        else if (e === 'noun') r.error('taigen-dome', s.id, `${x.end ? '体言止め' : '文末がない'}：「${clip(x.t.slice(-40), 40)}」`);
      }
    }
    hedgesAll += hedges.length; warnHedges += warnH;
    if (hedges.length > LIMITS.hedgesPerSection) r.warn('hedges', s.id, `留保の言い方 ${hedges.length} 回（1 節 ${LIMITS.hedgesPerSection} 回まで。「ここに注意」へ）：${[...new Set(hedges)].join('・')}`);
    const avg = sn ? sc / sn : 0;
    perSection.push([s.id, avg, sn]);
    if (avg > LIMITS.avg) r.warn('avg-length', s.id, `1 文の平均 ${avg.toFixed(1)} 字（${sn} 文。上限 ${LIMITS.avg}）`);
  }
  // the first use of a term in a chapter: 正式名（通称、English）
  const terms = termsOf(env.FL);
  if (!terms) r.pending('terms-table', 'FL.terms', '用語の表（W04 の FL.terms）がまだ読み込まれていない：初出の形「正式名（通称、English）」は調べていない');
  else for (const ch of chaptersOf(env)) {
    const body = ch.secs.map(sec => textOf(sectionsOf(env).find(x => x.sec === sec)?.html || '')).join(' ');
    for (const t of terms) {
      const i = body.indexOf(t.formal); if (i < 0) continue;
      r.count('term uses');
      const after = body.slice(i + t.formal.length, i + t.formal.length + 80);
      const m = after.match(/^\s*[（(]([^）)]*)[）)]/);
      if (!m || !m[1].toLowerCase().includes(String(t.en).toLowerCase())) r.warn('first-use-form', ch.id, `「${t.formal}」の初出に（通称、${t.en}）がない`);
    }
  }
  r.count('sentences', nSent);
  r.metric('average sentence length', nSent ? +(nChars / nSent).toFixed(1) : 0);
  r.metric('longest sentence', longest.n ? `${longest.n} 字（${longest.where}）` : '—');
  r.metric('sentences over 80', r.items.filter(x => x.code === 'long-sentence').length);
  r.metric('hedges (outside ここに注意 / inside)', `${hedgesAll} / ${warnHedges}`);
  return r;
}

await cli(import.meta.url, meta, run);
