// check-maps.mjs — DESIGN 5 章 基準 12・13 and 3.6: the JCAB map (JCAB-MAP.json: every heading of the JCAB 出題範囲
// 参考 for 事業用操縦士（飛行機）and 計器飛行証明, 自家用 too) and the ACS map (ACS-MAP.json: the knowledge elements of
// the Private 6C, Instrument 8C and the multi-engine part of Commercial 7B) — each row maps to sections of the book or
// says「対象外（理由）」; "未対応ゼロ". A section a row names must exist (a section DESIGN 3.3 plans but the book does
// not have yet counts as pending); the sections' own jcab/faa data must name rows of the maps.
// Read loosely: a row's id in id/code/heading/no, its sections in sections/secs/to/where/book, its reason in
// excluded/out/reason/why/na, its group in subject/acs/doc/area.
import { Result, cli } from './lib/report.mjs';
import { readLedger, pick, asList } from './lib/ledgers.mjs';
import { toc } from './lib/design.mjs';

export const meta = { id: 'maps', title: 'JCAB の出題範囲と ACS の対応表（未対応ゼロ）', criteria: [12, 13] };

function oneMap(r, env, name, field, label) {
  const L = readLedger(name), plan = toc().secs, book = new Set(env.FL.book.CHAPTERS.flatMap(c => c.secs.map(s => s.id)));
  if (!L.exists) { r.pending('ledger', L.path, `${label}の対応表がまだない（W03 が枠を作り、W42 が完成）`); return new Set(); }
  if (L.error) { r.error('ledger-unreadable', L.path, L.error); return new Set(); }
  const ids = new Set(), groups = {};
  let mapped = 0, excluded = 0, unmapped = 0, pending = 0;
  for (const row of L.rows) {
    const id = String(pick(row, ['id', 'code', 'heading', 'no', 'key']) ?? '');
    if (!id) { r.error('row-without-id', L.path, JSON.stringify(row).slice(0, 80)); continue; }
    if (ids.has(id)) r.error('duplicate-row', `${name} ${id}`, '同じ見出しが 2 回'); ids.add(id);
    r.count(`${label}の見出し`);
    const g = String(pick(row, ['subject', 'acs', 'doc', 'area', 'group']) ?? '—');
    groups[g] = groups[g] || { n: 0, open: 0 }; groups[g].n++;
    const secs = asList(pick(row, ['sections', 'secs', 'to', 'where', 'book', 'targets'])).map(String);
    const why = pick(row, ['excluded', 'out', 'reason', 'why', 'na', '対象外']);
    if (secs.length) mapped++; else if (why) excluded++; else { unmapped++; groups[g].open++; r.error('unmapped', `${name} ${id}`, `${pick(row, ['title', 't', 'name']) || ''}：節も「対象外（理由）」もない`); }
    for (const s of secs) {
      if (book.has(s)) continue;
      if (plan.has(s)) pending++; else r.warn('unknown-section', `${name} ${id}`, `節 "${s}" が本にも DESIGN 3.3 の目次にもない`);
    }
  }
  r.metric(`${label}：mapped / 対象外 / 未対応`, `${mapped} / ${excluded} / ${unmapped}（行 ${L.rows.length}）`);
  r.metric(`${label}：by group`, Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, `${v.n}（未対応 ${v.open}）`])));
  if (pending) r.info('section-not-yet', name, `${pending} の行き先は DESIGN 3.3 の目次にあるがまだ本にない`);
  // the sections' own data
  for (const ch of env.FL.book.CHAPTERS) for (const s of ch.secs) for (const x of asList(s[field]).map(String)) if (!ids.has(x)) r.warn('section-names-unknown-row', s.id, `${field} の "${x}" が ${name} にない`);
  return ids;
}

export async function run(env) {
  const r = new Result(meta);
  oneMap(r, env, 'JCAB-MAP.json', 'jcab', 'JCAB');
  oneMap(r, env, 'ACS-MAP.json', 'faa', 'ACS');
  let jc = 0, fa = 0; for (const ch of env.FL.book.CHAPTERS) for (const s of ch.secs) { if (s.jcab) jc++; if (s.faa) fa++; }
  r.metric('sections with jcab / faa data', `${jc} / ${fa}`);
  return r;
}

await cli(import.meta.url, meta, run);
