// check-jurisdiction.mjs — DESIGN 3.4「決まり」and 5 章 基準 8: every section has a scope (common・us・jp・mixed);
//  US rule words (14 CFR, Part 91, 91.155, AIM, FAR) only in a `us` section, in a US box (bk-us, the US column of
//  bk-jur: jur-us) or in a sentence that names the country (米国・アメリカ); Japanese rule words (航空法, 施行規則,
//  第 n 条, 電波法, 告示, 通達) only in a `jp` section or a Japanese box (bk-jp, bk-same, the JP column jur-jp: the
//  boxes CADET removes). "共通の節に国を書かない規則の数字はゼロ". Sources (bk-src), photo credits and links are left
//  out. The chapters' end matter (summary, examples, cautions, questions) is checked as well (warn).
import { Result, cli } from './lib/report.mjs';
import { blocks, sentences, runAt, inCls, inTag, clip } from './lib/html.mjs';
import { sectionsOf, chaptersOf, endStrings, SCOPES } from './lib/book.mjs';
import { toc } from './lib/design.mjs';

export const meta = { id: 'jurisdiction', title: '管轄の言葉（米国の規則は us の範囲、日本の規則は jp の範囲だけ）', criteria: [8] };

const FREQ_CTX = /周波数|MHz|kHz|frequency|point|ポイント/i;
export const US_RES = [
  [/14\s?CFR(?:\s?(?:Part\s?)?\d+(?:\.\d+)?(?:\([a-z0-9]+\))*)?/g, 'CFR'],
  [/(?<![A-Za-z])Part\s?(?:1|23|43|61|67|91|97|121|135|141|830)\b/g, 'Part'],
  [/(?<![\d.,])(?:43|61|67|91|97|121|135|141)\.\d{1,4}[a-z]?(?:\([a-z0-9]+\))*(?![\d.])(?!\s?(?:in|lb|gal|kt|ft|%|％|°|G|倍|inHg|hPa|NM|SM|m|km|MHz|kHz|秒|分)(?![A-Za-z]))/g, '§'],
  [/(?<![A-Za-z])AIM(?![A-Za-z])(?:\s?\d+-\d+(?:-\d+)?)?/g, 'AIM'],
  [/(?<![A-Za-z])FARs?(?![A-Za-z])/g, 'FAR'],
];
export const JP_RES = [
  [/航空法(?!規)/g, '航空法'], [/施行規則/g, '施行規則'], [/第\s?\d+\s?条(?:の\s?\d+)?/g, '条'], [/電波法/g, '電波法'], [/告示/g, '告示'], [/通達/g, '通達'],
];
const COUNTRY_US = /米国|アメリカ/;

export function findRules(text) {
  const us = [], jp = [];
  for (const [re, kind] of US_RES) for (const m of text.matchAll(re)) {
    if (kind === '§') {
      const v = parseFloat(m[0]);
      if (/^\s*(?:MHz|kHz)/.test(text.slice(m.index + m[0].length)) || (v >= 118 && v < 137 && FREQ_CTX.test(text))) continue;
      if (/^121\.5(?:0*)$/.test(m[0])) continue;
    }
    if (us.some(x => m.index >= x.i && m.index < x.i + x.s.length)) continue;   // inside a longer match (14 CFR 91.155)
    us.push({ i: m.index, s: m[0], kind });
  }
  for (const [re, kind] of JP_RES) for (const m of text.matchAll(re)) jp.push({ i: m.index, s: m[0], kind });
  return { us, jp };
}

const exempt = path => inCls(path, 'bk-src', 'bk-credit') || inTag(path, 'a');
const usBox = path => inCls(path, 'bk-us', 'jur-us');
const jpBox = path => inCls(path, 'bk-jp', 'bk-same', 'jur-jp');
const jurBoxNoColumn = path => inCls(path, 'bk-jur') && !inCls(path, 'jur-us', 'jur-jp');

export async function run(env) {
  const r = new Result(meta);
  const scopes = {}, plan = toc().secs;
  let usAll = 0, jpAll = 0, planned = 0;
  for (const s of sectionsOf(env)) {
    r.count('sections');
    let scope = s.sec.scope;
    scopes[scope || '(none)'] = (scopes[scope || '(none)'] || 0) + 1;
    if (!scope) {
      const p = plan.get(s.id);
      r.error('missing-scope', s.id, `scope がない（common・us・jp・mixed のどれか）${p && p.scope ? `。DESIGN 3.3 の予定「${p.scopeText}」→ ${p.scope} として下の言葉を調べた` : ''}`);
      if (p && p.scope) { scope = p.scope; planned++; }
    } else if (!SCOPES.includes(scope)) r.error('bad-scope', s.id, `scope "${scope}" は common・us・jp・mixed のどれでもない`);
    for (const b of blocks(s.html, { skip: exempt })) for (const x of sentences(b.text)) {
      const { us, jp } = findRules(x.t);
      for (const m of us) {
        usAll++;
        const path = runAt(b, x.at + m.i), fig = inTag(path, 'figure', 'svg') ? '（図）' : '';
        if (scope === 'us' || usBox(path) || jurBoxNoColumn(path)) continue;
        if (inCls(path, 'jur-jp')) { r.warn('us-word-in-jp-column', s.id, `日本の列に米国の規則「${m.s}」${fig}：${clip(x.t, 60)}`); continue; }
        if (COUNTRY_US.test(x.t)) continue;
        if (/FAA/.test(x.t)) { r.warn('us-word-faa-only', s.id, `「${m.s}」の文に「米国」がない（FAA だけ）${fig}：${clip(x.t, 60)}`); continue; }
        r.error('us-rule-outside-us', s.id, `「${m.s}」が ${scope || 'scope なし'} の節の本文に（米国の囲みでも「米国の」と書いた文でもない）${fig}：${clip(x.t, 60)}`);
      }
      for (const m of jp) {
        jpAll++;
        const path = runAt(b, x.at + m.i), fig = inTag(path, 'figure', 'svg') ? '（図）' : '';
        if (scope === 'jp' || jpBox(path) || jurBoxNoColumn(path)) continue;
        if (inCls(path, 'jur-us')) { r.error('jp-word-in-us-column', s.id, `米国の列に日本の規則「${m.s}」${fig}：${clip(x.t, 60)}`); continue; }
        if (scope === 'mixed') { r.warn('jp-rule-in-mixed', s.id, `mixed の節で日本の囲みの外に「${m.s}」${fig}：${clip(x.t, 60)}`); continue; }
        r.error('jp-rule-outside-jp', s.id, `「${m.s}」が ${scope || 'scope なし'} の節の日本の囲みの外に（CADET に残る）${fig}：${clip(x.t, 60)}`);
      }
    }
  }
  // the end matter: no scope of its own; US words allowed when the chapter has a `us` section or the sentence names the country
  for (const ch of chaptersOf(env)) {
    const hasUs = ch.secs.some(s => s.scope === 'us'), hasJp = ch.secs.some(s => s.scope === 'jp');
    for (const [k, v] of endStrings(ch)) {
      if (k.startsWith('terms')) continue;
      r.count('end-matter strings');
      for (const x of sentences(v.replace(/<[^>]+>/g, ' '))) {
        const { us, jp } = findRules(x.t);
        for (const m of us) if (!hasUs && !COUNTRY_US.test(x.t)) r.warn('end-matter-us-word', `${ch.id}.${k}`, `「${m.s}」：${clip(x.t, 60)}`);
        for (const m of jp) if (!hasJp) r.error('end-matter-jp-word', `${ch.id}.${k}`, `「${m.s}」（日本の規則は章末に置けない：CADET に残る）：${clip(x.t, 60)}`);
      }
    }
  }
  r.metric('scope', scopes);
  if (planned) r.note(`scope のない ${planned} 節は DESIGN 3.3 の「範囲」の列（共通・日米 → common、米国 → us、日本 → jp）で調べた`);
  const secsWith = code => new Set(r.items.filter(x => x.code === code).map(x => x.where)).size;
  r.metric('US rule mentions in the bodies / outside the allowed places', `${usAll} / ${r.items.filter(x => x.code === 'us-rule-outside-us').length}（${secsWith('us-rule-outside-us')} 節）`);
  r.metric('JP rule mentions in the bodies / outside the allowed places', `${jpAll} / ${r.items.filter(x => x.code === 'jp-rule-outside-jp').length}`);
  return r;
}

await cli(import.meta.url, meta, run);
