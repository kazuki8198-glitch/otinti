// check-claims.mjs — DESIGN 5 章 基準 3 (主張の台帳): pulls out every sentence of the bodies that holds a number with
// a unit, an article number (第 n 条, 14 CFR, Part 91, 91.155, AIM 4-3-3, AC 61-65K) or a law's name (航空法, 施行規則,
// 告示, 通達), gives each a stable id (<section>#<8 hex of the normalised sentence>), and compares them with the ledger
// CLAIMS.json (rows with the id, or the section and the sentence, and a tag: 教材値・参考値・条文・推測/要確認).
// "札のない未確認の主張ゼロ" is the goal; until W03/W12 fill the ledger every claim counts as untagged (warn, per section).
//   --out FILE   writes all the claims (id, section, sentence, kinds, matched strings, the label the text gives itself)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Result, cli, outOf } from './lib/report.mjs';
import { blocks, sentences, inCls, inTag, clip } from './lib/html.mjs';
import { sectionsOf } from './lib/book.mjs';
import { readLedger, pick } from './lib/ledgers.mjs';
import { findRules } from './check-jurisdiction.mjs';

export const meta = { id: 'claims', title: '主張の抜き出し（数字と単位・条番号・法令名）と主張の台帳', criteria: [3] };

const UNIT = String.raw`(?:kt|KIAS|KCAS|KTAS|ft\/min|fpm|ft|NM|SM|nm|km\/h|km|mm|cm|m|hPa|inHg|mb|°C|℃|°F|℉|°|％|%|G|lb|lbs|kg|US gal|gal|L|rpm|MHz|kHz|Hz|V|A|psi|in|MPH|mph|mg\/L|g\/L|g\/dL|分|秒|時間|日|か月|暦月|年|歳|回|倍|人|マイル|ノット|フィート|メートル)`;
const NUM_UNIT = new RegExp(String.raw`(?<![A-Za-z])[−\-+±]?\d[\d,]*(?:\.\d+)?(?:\s?[〜~–\-]\s?\d[\d,]*(?:\.\d+)?)?\s?${UNIT}(?![A-Za-z])`, 'g');
const AC = /(?<![A-Za-z])AC\s?\d{2,3}-\d+[A-Z]?/g;
const TAGS = /教材値|参考値|条文|推測|要確認|teaching|reference|article|estimate|unverified/i;

export const claimId = (sec, text) => `${sec}#${crypto.createHash('sha1').update(String(text).replace(/\s+/g, '')).digest('hex').slice(0, 8)}`;

export function extract(env) {
  const out = [];
  for (const s of sectionsOf(env)) {
    const html = s.html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<\/t[dh]>/g, ' ｜ ').replace(/<t[dh]\b[^>]*>/g, '');
    for (const b of blocks(html, { skip: p => inCls(p, 'bk-src', 'bk-credit') || inTag(p, 'a', 'button') })) for (const x of sentences(b.text)) {
      const kinds = new Set(), hits = [];
      for (const m of x.t.matchAll(NUM_UNIT)) { kinds.add('number'); hits.push(m[0].trim()); }
      const { us, jp } = findRules(x.t);
      for (const m of us) { kinds.add(m.kind === 'AIM' ? 'AIM' : '14 CFR'); hits.push(m.s); }
      for (const m of jp) { kinds.add('日本の法令'); hits.push(m.s); }
      for (const m of x.t.matchAll(AC)) { kinds.add('AC'); hits.push(m[0]); }
      if (!kinds.size) continue;
      const self = /教材値|この教材の/.test(x.t) ? '教材値' : /参考値/.test(x.t) ? '参考値' : inCls(b.runs[0].path, 'unk') || /推測|要確認/.test(x.t) ? '推測・要確認' : null;
      out.push({ id: claimId(s.id, x.t), sec: s.id, text: x.t, kinds: [...kinds], hits, self });
    }
  }
  return out;
}

export async function run(env) {
  const r = new Result(meta);
  const claims = extract(env);
  const L = readLedger('CLAIMS.json');
  if (!L.exists) r.pending('ledger', L.path, '主張の台帳がまだない（W03）：全部を「札なし」として数えた');
  else if (L.error) r.error('ledger-unreadable', L.path, L.error);
  const byId = new Map();
  for (const row of L.rows) {
    const id = pick(row, ['id', 'claim', 'key']) || (pick(row, ['sec', 'section', 'where']) && pick(row, ['text', 'sentence', 's']) ? claimId(pick(row, ['sec', 'section', 'where']), pick(row, ['text', 'sentence', 's'])) : null);
    if (id) byId.set(id, row);
  }
  const perSec = new Map(), kinds = {};
  let tagged = 0, self = 0;
  for (const c of claims) {
    r.count('claims');
    c.kinds.forEach(k => { kinds[k] = (kinds[k] || 0) + 1; });
    if (c.self) self++;
    const row = byId.get(c.id), tag = row && pick(row, ['tag', 'label', 'kind', 'type', 'status']);
    if (row && tag && TAGS.test(String(tag))) { tagged++; continue; }
    const e = perSec.get(c.sec) || { n: 0, sample: c.text }; e.n++; perSec.set(c.sec, e);
  }
  // 基準 6: where a teaching value (教材値) is given, the reference value (参考値) stands beside it
  for (const s of sectionsOf(env)) if (/教材値/.test(s.html) && !/参考値/.test(s.html)) r.info('teaching-value-alone', s.id, '「教材値」があるのに「参考値」がない（モデルの値と POH・AFH の値が違う所は両方を書く：基準 6）');
  for (const [sec, e] of perSec) r.warn('claim-untagged', sec, `札のない主張 ${e.n} 文（例：${clip(e.sample, 50)}）`);
  if (L.exists) { const ids = new Set(claims.map(c => c.id)); for (const [id] of byId) if (!ids.has(id)) r.info('ledger-row-not-in-book', id, '台帳の行の文が本に見つからない（文が書き換えられた？）'); }
  r.metric('kinds', kinds);
  r.metric('tagged in CLAIMS.json / untagged', `${tagged} / ${claims.length - tagged}`);
  r.metric('labelled in the text itself (教材値・参考値・推測)', self);
  if (outOf(env, 'claims')) { fs.writeFileSync(outOf(env, 'claims'), JSON.stringify(claims, null, 1)); r.note(`wrote ${claims.length} claims to ${outOf(env, 'claims')}`); }
  return r;
}

await cli(import.meta.url, meta, run, { usage: '[--out claims.json]' });
