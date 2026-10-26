// tools/lib/checks.mjs — the list of checks (one file each, each exporting meta and run(env)), and the summary table.
import { printResult, isStrict } from './report.mjs';

export const ALL = ['chapters', 'form', 'data', 'style', 'volume', 'jurisdiction', 'chapter-refs', 'claims', 'ledgers', 'questions', 'photos', 'figures', 'provenance', 'maps', 'concepts', 'jur', 'calc', 'path', 'egov'];
const FILE = { calc: 'calc-check.mjs' };
export const fileOf = id => FILE[id] || `check-${id}.mjs`;

export async function runChecks(ids, env) {
  const out = [];
  for (const id of ids) {
    const mod = await import(new URL(`../${fileOf(id)}`, import.meta.url).href);
    const t0 = Date.now();
    try { const r = await mod.run(env); r.ms = Date.now() - t0; out.push(r); }
    catch (e) { const { Result } = await import('./report.mjs'); const r = new Result(mod.meta || { id, title: id }); r.error('crashed', id, e.stack || String(e)); r.ms = Date.now() - t0; out.push(r); }
  }
  return out;
}

const w = s => [...String(s)].reduce((a, c) => a + (/[^\x00-\x7f]/.test(c) ? 2 : 1), 0);
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - w(s)));
const lpad = (s, n) => ' '.repeat(Math.max(0, n - w(s))) + String(s);

export function status(r, o) {
  if (r.n('error') && isStrict(o, r.id)) return 'FAIL';
  if (r.n('error')) return 'report';
  if (r.n('warn')) return 'warn';
  return r.n('pending') ? 'pending' : 'ok';
}

export function summary(results, o, { title = 'summary' } = {}) {
  const clipW = (s, n) => { let out = ''; for (const c of String(s)) { if (w(out + c) > n) return out + '…'; out += c; } return out; };
  const rows = results.map(r => [r.id, r.criteria.join('・') || '-', clipW(r.checkedText + (r.skipped ? '（一部省略）' : ''), 58), r.n('error'), r.n('warn'), r.n('pending'), r.n('info'), status(r, o)]);
  const head = ['check', '基準', 'checked', 'error', 'warn', 'pending', 'info', 'status'];
  const width = head.map((h, i) => Math.max(w(h), ...rows.map(x => w(x[i]))));
  const line = x => x.map((c, i) => (i >= 3 && i <= 6 ? lpad(c, width[i]) : pad(c, width[i]))).join('  ');
  const out = [`== ${title}${o.strict ? ' (strict' + (o.strict instanceof Set ? ': ' + [...o.strict].join(',') : '') + ')' : ' (report only: exit 0)'}`, line(head), width.map(n => '-'.repeat(n)).join('  '), ...rows.map(line)];
  const tot = k => results.reduce((a, r) => a + r.n(k), 0);
  out.push(width.map(n => '-'.repeat(n)).join('  '), line(['total', '', '', tot('error'), tot('warn'), tot('pending'), tot('info'), '']));
  return out.join('\n');
}

export function topCodes(results, n = 3) {
  return results.filter(r => r.items.some(x => x.level !== 'info')).map(r => `  ${pad(r.id, 13)} ${['error', 'warn', 'pending'].flatMap(l => r.codes(l).slice(0, n).map(([c, k]) => `${l === 'error' ? 'E' : l === 'warn' ? 'W' : 'P'}:${c}×${k}`)).slice(0, n + 2).join('  ')}`).join('\n');
}

export function details(results, o) { for (const r of results) { printResult(r, o); console.log(''); } }
