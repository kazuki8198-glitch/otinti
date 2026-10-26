// check-all.mjs — runs every check of textbook/rewrite/combined/tools on the current book (the book is loaded once)
// and prints one summary table (and the most frequent problem of each check). REPORT-ONLY: exit 0, unless --strict
// (any check with errors → exit 1) or --strict=style,figures (only those checks).
//   node textbook/rewrite/combined/tools/check-all.mjs [--details] [--all|--limit=N] [--json FILE] [--no-browser]
//        [--only=style,photos] [--strict[=ids]]
//   --details   also prints each check's problems (grouped, --limit per group; --all for every one)
//   --json FILE writes every result (counts, metrics, every problem) as JSON
//   --claims-out=FILE --photos-out=FILE --figures-out=DIR: the extra output of those checks (claims, photo hashes, PNGs)
import fs from 'node:fs';
import { parseArgs } from './lib/report.mjs';
import { loadBook } from './lib/load.mjs';
import { ALL, runChecks, summary, topCodes, details } from './lib/checks.mjs';

const o = parseArgs();
if (o.help) { console.log('usage: node check-all.mjs [--details] [--all|--limit=N] [--json FILE] [--no-browser] [--only=ids] [--strict[=ids]]\nchecks: ' + ALL.join(', ')); process.exit(0); }
const onlyArg = o.args.find(a => a.startsWith('--only='));
const ids = onlyArg ? onlyArg.slice(7).split(',').filter(x => ALL.includes(x)) : ALL;
const book = await loadBook();
const env = { o, book, FL: book.FL };
const t0 = Date.now();
const results = await runChecks(ids, env);
console.log(`book: ${book.FL.book.PARTS.length} parts · ${book.FL.book.CHAPTERS.length} chapters · ${book.FL.book.CHAPTERS.reduce((a, c) => a + c.secs.length, 0)} sections — modules from ${book.from}${book.unlisted.length ? ` — NOT loaded: ${book.unlisted.join(', ')}` : ''}${book.notShared && book.notShared.length ? ` — not in flight-lab/src/modules.mjs: ${book.notShared.join(', ')}` : ''}`);
if (o.details) details(results, o);
console.log(summary(results, o, { title: `check-all (${((Date.now() - t0) / 1000).toFixed(1)} s)` }));
if (!o.quiet) { const t = topCodes(results); if (t) console.log('most frequent (E error · W warn · P pending):\n' + t); }
if (o.json) fs.writeFileSync(o.json, JSON.stringify({ when: new Date().toISOString(), modules: book.modules, results: results.map(r => r.toJSON()) }, null, 1));
process.exitCode = results.some(r => r.n('error') && (o.strict === true || (o.strict instanceof Set && o.strict.has(r.id)))) ? 1 : 0;
