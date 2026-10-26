// check-ledgers.mjs — DESIGN 5 章 基準 1・2 on W03's ledgers:
//  ERRATA.json (the known errors, about 130: the textbook 79, the basic course 53): every row closed — "fixed" with
//   the place, or "not an error" with the reason — and signed by the fixer and a different checker;
//  RULINGS.json (the 74 disagreements, class A/B/C): every row closed the same way; an A row (a national difference)
//   names its Japan/US item (it must become a box), a C row (words) names its term (it goes in the term table);
//  UNVERIFIED.json (the things not written as facts until checked): counted.
// Read loosely: id; status/state (open・fixed・not-error・closed…); where/location/fixedIn; reason/why; fixedBy/by;
// checkedBy/checker/reviewer; class/kind; jur/item; term.
import { Result, cli } from './lib/report.mjs';
import { readLedger, pick } from './lib/ledgers.mjs';
import { jurItems } from './lib/design.mjs';

export const meta = { id: 'ledgers', title: '誤りと食い違いの台帳（全行が閉じて、別の人が確かめた）', criteria: [1, 2] };
const CLOSED = /^(fixed|closed|done|not[-_ ]?(an[-_ ]?)?error|wontfix|resolved|直した|誤りではない|閉)/i;
const NOT_ERROR = /not[-_ ]?(an[-_ ]?)?error|誤りではない/i;

function rowsCheck(r, name, label, { expect, extra } = {}) {
  const L = readLedger(name);
  if (!L.exists) { r.pending('ledger', L.path, `${label}の台帳がまだない（W03）`); return; }
  if (L.error) { r.error('ledger-unreadable', L.path, L.error); return; }
  let open = 0, closed = 0; const ids = new Set();
  for (const row of L.rows) {
    const id = String(pick(row, ['id', 'key', 'no']) ?? '');
    if (!id) { r.error('row-without-id', L.path, JSON.stringify(row).slice(0, 60)); continue; }
    if (ids.has(id)) r.error('duplicate-row', `${name} ${id}`, '同じ ID が 2 回'); ids.add(id);
    r.count(`${label}の行`);
    const st = String(pick(row, ['status', 'state']) ?? 'open');
    if (!CLOSED.test(st)) { open++; r.error('open', `${name} ${id}`, `まだ閉じていない（${st}）`); }
    else {
      closed++;
      if (NOT_ERROR.test(st)) { if (!pick(row, ['reason', 'why', 'note'])) r.error('no-reason', `${name} ${id}`, '「誤りではない」の理由がない'); }
      else if (!pick(row, ['where', 'location', 'fixedIn', 'place', 'at'])) r.error('no-place', `${name} ${id}`, '直した場所がない');
      const by = pick(row, ['fixedBy', 'by', 'fixer']), ck = pick(row, ['checkedBy', 'checker', 'reviewer', 'verifiedBy']);
      if (!by || !ck) r.error('unsigned', `${name} ${id}`, '直した人か確かめた人の署名がない');
      else if (String(by) === String(ck)) r.error('same-signer', `${name} ${id}`, '直した人と確かめた人が同じ');
    }
    if (extra) extra(r, name, id, row);
  }
  r.metric(`${label}：rows / closed / open`, `${L.rows.length} / ${closed} / ${open}${expect ? `（設計の見込み 約 ${expect}）` : ''}`);
}

export async function run(env) {
  const r = new Result(meta);
  if (env.only) { r.skip('章の検査では調べない（本全体の台帳）'); return r; }
  const items = new Set([...(Array.isArray(env.FL.jur) ? env.FL.jur.map(x => x.id) : []), ...jurItems().map(x => x.id)]);
  rowsCheck(r, 'ERRATA.json', '誤り', { expect: 130 });
  rowsCheck(r, 'RULINGS.json', '食い違い', {
    expect: 74,
    extra: (rr, name, id, row) => {
      const cls = String(pick(row, ['class', 'kind', 'type']) ?? '').toUpperCase();
      if (!/^[ABC]/.test(cls)) { rr.error('no-class', `${name} ${id}`, '扱いの分類（A・B・C）がない'); return; }
      if (cls[0] === 'A') { const it = pick(row, ['jur', 'item', 'jurId']); if (!it) rr.warn('a-without-item', `${name} ${id}`, 'A（国の違い）なのに日米の項目 ID がない（囲みにする）'); else if (!items.has(String(it))) rr.warn('a-unknown-item', `${name} ${id}`, `日米の項目 "${it}" が FL.jur にも DESIGN 3.4 にもない`); }
      if (cls[0] === 'C' && !pick(row, ['term', 'terms', 'word'])) rr.warn('c-without-term', `${name} ${id}`, 'C（言葉の違い）なのに用語がない（用語の表へ）');
      if (cls[0] === 'C' && env.FL.terms && pick(row, ['term'])) { const t = String(pick(row, ['term'])); if (!JSON.stringify(env.FL.terms).includes(t)) rr.warn('c-term-not-in-table', `${name} ${id}`, `用語「${t}」が FL.terms にない`); }
    },
  });
  const U = readLedger('UNVERIFIED.json');
  if (!U.exists) r.pending('ledger', U.path, '要確認の一覧がまだない（W03）');
  else r.metric('UNVERIFIED rows', U.rows.length);
  return r;
}

await cli(import.meta.url, meta, run);
