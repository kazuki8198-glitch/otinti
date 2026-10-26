// check-data.mjs — the section data of DESIGN 3.2 (kept outside the text; CADET does not show it) and the ids of
// DESIGN 6.2 決まり 1:
//  section id /^[a-z0-9_.\-]{1,40}$/ not starting with kiso, chapter id [a-z0-9]+, every chapter in a part of PARTS;
//  from: basic-course section ids that exist (required on a new ★ section DESIGN 3.3 builds from K…);
//  deep: true/false; use: strings; jcab: strings; faa: ACS knowledge codes (PA.I.C.K3); no unknown fields.
// (scope is checked by check-jurisdiction.)
import { Result, cli } from './lib/report.mjs';
import { chaptersOf } from './lib/book.mjs';
import { toc } from './lib/design.mjs';
import { kiso, kisoId } from './lib/kiso.mjs';

export const meta = { id: 'data', title: '節のデータ（from・deep・use・jcab・faa）と ID の形', criteria: [11] };

export const SEC_FIELDS = new Set(['id', 't', 'h', 'scope', 'from', 'deep', 'use', 'jcab', 'faa', '_txt']);
export const CH_FIELDS = new Set(['id', 'part', 't', 'en', 'summary', 'secs', 'terms', 'examples', 'cautions', 'quiz', 'refs', 'lessons', 'n', 'before', 'written']);
const ACS = /^(PA|IR|CA|CM|ATP|AM)\.[IVX]+\.[A-Z]{1,2}\.[KRS]\d+[a-z]?$/;
const strs = v => Array.isArray(v) && v.every(x => typeof x === 'string' && x);

export async function run(env) {
  const r = new Result(meta);
  const plan = toc().secs, K = kiso(), parts = new Set(env.FL.book.PARTS.map(p => p.id));
  const all = new Set();
  let withFrom = 0, plannedT = 0, plannedTWith = 0;
  for (const ch of env.FL.book.CHAPTERS) for (const s of ch.secs) { if (all.has(s.id)) r.error('duplicate-id', s.id, '同じ節 ID が 2 回'); all.add(s.id); }
  for (const ch of chaptersOf(env)) {
    r.count('chapters');
    if (!/^[a-z0-9]+$/.test(ch.id)) r.error('chapter-id', ch.id, '章 ID は英小文字と数字だけ（{ch:id} のため）');
    if (/^kiso/.test(ch.id)) r.error('chapter-id', ch.id, '章 ID が kiso で始まる（原本とぶつかる）');
    if (!parts.has(ch.part)) r.error('part', ch.id, `部 "${ch.part}" が PARTS にない`);
    const planned = toc().chapters.get(ch.id);
    if (planned && planned !== ch.part) r[parts.has(planned) ? 'warn' : 'info']('part-differs', ch.id, `DESIGN 3.3 ではこの章は ${planned}（今は ${ch.part}）${parts.has(planned) ? '' : `。${planned} はまだ PARTS にない（W09 の addPart）`}`);
    for (const k of Object.keys(ch)) if (!CH_FIELDS.has(k)) r.info('unknown-chapter-field', ch.id, `章のデータに知らない項目 "${k}"`);
    for (const s of ch.secs) {
      r.count('sections');
      if (!/^[a-z0-9_.\-]{1,40}$/.test(s.id) || /^kiso/.test(s.id)) r.error('section-id', s.id, '節 ID の形（/^[a-z0-9_.\\-]{1,40}$/、kiso で始めない）');
      for (const k of Object.keys(s)) if (!SEC_FIELDS.has(k)) r.warn('unknown-field', s.id, `節のデータに知らない項目 "${k}"`);
      if (s.from !== undefined) {
        if (!strs(s.from)) r.error('from-shape', s.id, 'from は基礎教材の節 ID の列');
        else { withFrom++; for (const id of s.from) if (!K.all.has(id)) r.error('from-unknown', s.id, `from の "${id}" は基礎教材にない`); else if (!K.sections.includes(id)) r.warn('from-not-section', s.id, `from の "${id}" は節ではない（問題・図・写真）`); }
      }
      const p = plan.get(s.id);
      if (p && p.kFrom.length) {
        const want = p.kFrom.map(kisoId).filter(Boolean);
        if (p.isNew && s.from === undefined) r.warn('from-missing', s.id, `DESIGN 3.3 でこの新しい節は ${want.join('・')} から書く：from がない`);
        if (!p.isNew) { plannedT++; if (s.from !== undefined) plannedTWith++; }
        if (strs(s.from)) for (const id of want) if (!s.from.includes(id)) r.info('from-differs', s.id, `DESIGN 3.3 の元 ${id} が from にない`);
      }
      if (s.deep !== undefined && typeof s.deep !== 'boolean') r.error('deep-shape', s.id, 'deep は true か false');
      if (s.use !== undefined && !strs(s.use)) r.error('use-shape', s.id, 'use は文字列の列');
      if (s.jcab !== undefined && !strs(s.jcab)) r.error('jcab-shape', s.id, 'jcab は出題範囲の見出しの番号の列');
      if (s.faa !== undefined) { if (!strs(s.faa)) r.error('faa-shape', s.id, 'faa は ACS の項目の列'); else for (const x of s.faa) if (!ACS.test(x)) r.warn('faa-code', s.id, `ACS の項目の形でない："${x}"（例 PA.I.C.K3）`); }
    }
  }
  // the planned sections not in the book yet (by part), so a release can see how far it is
  const missing = {};
  for (const [id, p] of plan) if (!all.has(id)) missing[p.part] = (missing[p.part] || 0) + 1;
  r.metric('sections with from', withFrom);
  r.metric('existing sections DESIGN merges basic-course content into / with from', `${plannedT} / ${plannedTWith}`);
  r.metric('DESIGN 3.3 sections not in the book yet, by part', missing);
  return r;
}

await cli(import.meta.url, meta, run);
