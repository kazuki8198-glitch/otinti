// calc-check.mjs — DESIGN 5 章 基準 5「計算の例はすべて検算済み」: each worked example written as a row
//   { id, sec, expr, vars?, data?, expect, tol?, show? }
// is computed again from its formula (expr, with vars; data: { name: 'physics.AIRCRAFT.0.v.y' } takes a value from FL,
// the teaching values), compared with expect (± tol, default 0.5 % of expect), and, with show, the section's text must
// hold that string (so the book shows the number that was checked). Rows: tools/data/calc-seed.json (W01's examples
// from today's book) and the ledger CALC.json (W03/W12 and each chapter's writer add the examples they write).
import fs from 'node:fs';
import path from 'node:path';
import { Result, cli } from './lib/report.mjs';
import { textOf } from './lib/html.mjs';
import { sectionsOf } from './lib/book.mjs';
import { evaluate } from './lib/expr.mjs';
import { readLedger, rowsOf } from './lib/ledgers.mjs';
import { TOOLS } from './lib/paths.mjs';

export const meta = { id: 'calc', title: '計算の例の検算（calc-check）', criteria: [5] };

const get = (obj, p) => String(p).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

export async function run(env) {
  const r = new Result(meta);
  const seed = rowsOf(JSON.parse(fs.readFileSync(path.join(TOOLS, 'data', 'calc-seed.json'), 'utf8')));
  const L = readLedger('CALC.json');
  if (!L.exists) r.pending('ledger', L.path, '計算の例の台帳がまだない：W01 の見本（tools/data/calc-seed.json）だけを調べた');
  else if (L.error) r.error('ledger-unreadable', L.path, L.error);
  const rows = [...seed.map(x => ({ ...x, _from: 'seed' })), ...L.rows.map(x => ({ ...x, _from: 'CALC.json' }))];
  const text = new Map(sectionsOf(env, { all: true }).map(s => [s.id, textOf(s.html.replace(/<svg[\s\S]*?<\/svg>/g, ''))]));
  const checking = env.only ? new Set(sectionsOf(env).map(s => s.id)) : null;
  const ids = new Set();
  for (const x of rows) {
    if (checking && !checking.has(x.sec)) continue;
    const at = `${x.id || '?'}（${x._from}）`;
    r.count('examples');
    if (x.id && ids.has(x.id)) r.warn('duplicate-id', at, '同じ id が 2 回'); ids.add(x.id);
    const vars = { ...(x.vars || {}) };
    for (const [k, p] of Object.entries(x.data || {})) { const v = get(env.FL, p); if (typeof v !== 'number') r.error('data-missing', at, `data の ${k}＝${p} が数でない（${v}）`); vars[k] = v; }
    let v;
    try { v = evaluate(x.expr, vars); } catch (e) { r.error('bad-expr', at, e.message); continue; }
    if (typeof x.expect === 'number') {
      const tol = typeof x.tol === 'number' ? x.tol : Math.abs(x.expect) * 0.005;
      if (!(Math.abs(v - x.expect) <= tol + 1e-9)) r.error('wrong-result', at, `${x.expr} ＝ ${+v.toFixed(4)}、本の値は ${x.expect}（許す差 ${tol}）`);
    } else r.warn('no-expect', at, `expect がない（計算した値 ${+v.toFixed(4)}）`);
    if (x.sec && !text.has(x.sec)) { r.pending('section-not-yet', at, `節 ${x.sec} がまだ本にない`); continue; }
    if (x.show && !text.get(x.sec).includes(x.show)) r.error('not-shown', at, `節 ${x.sec} に「${x.show}」が見つからない（本の数字が変わった？）`);
  }
  r.metric('rows (seed / CALC.json)', `${seed.length} / ${L.rows.length}`);
  return r;
}

await cli(import.meta.url, meta, run);
