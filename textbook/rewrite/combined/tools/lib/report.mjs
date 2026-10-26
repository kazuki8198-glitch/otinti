// tools/lib/report.mjs — one result per check, the command line, and the printing.
// REPORT-ONLY by default: a check prints its counts and the offending places and the process exits 0. With --strict
// (every check) or --strict=style,figures (those checks) a check with level-"error" problems makes the exit code 1.
// Levels: error (breaks the rule), warn (likely wrong, or a rule the release has not reached), pending (the place the
// rule points at does not exist yet: a chapter, a ledger), info (a count or a note).
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export class Result {
  constructor(meta) { this.id = meta.id; this.title = meta.title; this.criteria = meta.criteria || []; this.items = []; this.metrics = {}; this.checked = {}; this.notes = []; this.skipped = null; }
  add(level, code, where, msg) { this.items.push({ level, code, where: where || '', msg: msg || '' }); return this; }
  error(code, where, msg) { return this.add('error', code, where, msg); }
  warn(code, where, msg) { return this.add('warn', code, where, msg); }
  pending(code, where, msg) { return this.add('pending', code, where, msg); }
  info(code, where, msg) { return this.add('info', code, where, msg); }
  count(unit, n = 1) { this.checked[unit] = (this.checked[unit] || 0) + n; }
  metric(k, v) { this.metrics[k] = v; }
  note(s) { this.notes.push(s); }
  skip(why) { this.skipped = why; }
  n(level) { return this.items.filter(x => x.level === level).length; }
  codes(level) { const m = new Map(); for (const x of this.items) if (!level || x.level === level) m.set(x.code, (m.get(x.code) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); }
  get checkedText() { return Object.entries(this.checked).map(([u, n]) => `${n} ${u}`).join(' / ') || '-'; }
  toJSON() { return { id: this.id, title: this.title, criteria: this.criteria, checked: this.checked, metrics: this.metrics, notes: this.notes, skipped: this.skipped, counts: { error: this.n('error'), warn: this.n('warn'), pending: this.n('pending'), info: this.n('info') }, items: this.items }; }
}

export function parseArgs(argv = process.argv.slice(2)) {
  const o = { strict: false, json: null, all: false, limit: 8, browser: true, quiet: false, out: null, outs: {}, details: false, args: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--strict') o.strict = true;
    else if (a.startsWith('--strict=')) o.strict = new Set(a.slice(9).split(',').filter(Boolean));
    else if (a === '--json') o.json = argv[++i];
    else if (a.startsWith('--json=')) o.json = a.slice(7);
    else if (a === '--out') o.out = argv[++i];
    else if (a.startsWith('--out=')) o.out = a.slice(6);
    else if (/^--[a-z]+-out=/.test(a)) o.outs[a.slice(2, a.indexOf('-out='))] = a.slice(a.indexOf('=') + 1);
    else if (a === '--all') { o.all = true; o.limit = Infinity; }
    else if (a.startsWith('--limit=')) o.limit = Number(a.slice(8)) || 8;
    else if (a === '--no-browser') o.browser = false;
    else if (a === '--quiet' || a === '-q') o.quiet = true;
    else if (a === '--details') o.details = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else o.args.push(a);
  }
  return o;
}
// where a check writes its extra output: --out in a single check's own run, --<id>-out=FILE under check-all/check-chapter
export const outOf = (env, id) => (env.o ? (env.o.single ? env.o.out : (env.o.outs || {})[id]) : null) || null;
export const isStrict = (o, id) => o.strict === true || (o.strict instanceof Set && o.strict.has(id));

const LV = { error: 'ERROR', warn: 'warn', pending: 'pending', info: 'info' };
export function printResult(r, o = {}) {
  const limit = o.limit ?? 8;
  const lines = [];
  lines.push(`== ${r.id}: ${r.title}${r.criteria.length ? `（DESIGN 5 章の基準 ${r.criteria.join('・')}）` : ''}`);
  if (r.skipped) lines.push(`   skipped: ${r.skipped}`);
  lines.push(`   checked: ${r.checkedText}   error ${r.n('error')} · warn ${r.n('warn')} · pending ${r.n('pending')} · info ${r.n('info')}`);
  for (const [k, v] of Object.entries(r.metrics)) lines.push(`   ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  for (const s of r.notes) lines.push(`   note: ${s}`);
  if (!o.quiet) for (const level of ['error', 'warn', 'pending', 'info']) {
    for (const [code, n] of r.codes(level)) {
      const xs = r.items.filter(x => x.level === level && x.code === code);
      lines.push(`   [${LV[level]}] ${code} ×${n}`);
      for (const x of xs.slice(0, limit)) lines.push(`      ${x.where ? x.where + ': ' : ''}${x.msg}`);
      if (xs.length > limit) lines.push(`      … ${xs.length - limit} more (--all)`);
    }
  }
  console.log(lines.join('\n'));
}

// run one check from its own file: node check-x.mjs [--strict] [--all] [--json file] …
export async function cli(importMetaUrl, meta, run, { needsBook = true, usage = '' } = {}) {
  if (!process.argv[1] || path.resolve(process.argv[1]) !== fileURLToPath(importMetaUrl)) return;
  const o = parseArgs();
  if (o.help) { console.log(`usage: node ${path.basename(fileURLToPath(importMetaUrl))} [--strict] [--all|--limit=N] [--json FILE] [--no-browser] ${usage}`); return; }
  const { loadBook } = await import('./load.mjs');
  o.single = true;
  const env = { o, book: needsBook ? await loadBook() : null };
  env.FL = env.book && env.book.FL;
  const r = await run(env);
  printResult(r, o);
  if (o.json) fs.writeFileSync(o.json, JSON.stringify(r.toJSON(), null, 1));
  process.exitCode = isStrict(o, r.id) && r.n('error') ? 1 : 0;
}
