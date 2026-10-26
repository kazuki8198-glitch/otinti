#!/usr/bin/env node
// ledgers/apply-patches.mjs — for the integrator: merges the units' patch files (reports/<UNIT>.ledger.json, format in
// README.md) into the ledgers, then runs validate.mjs. Without --write it only shows what would change.
//   node apply-patches.mjs                       every reports/*.ledger.json (dry run)
//   node apply-patches.mjs ../reports/W07a.ledger.json --write
// A patch row {id, status, where, by, note, …} sets those fields on the row with that id (op "set", the default);
// {op: "add", …} appends a new row (CLAIMS, CONCEPTS, JCAB-CALIBRATION, or any ledger when a unit splits a row).
// `note` is appended to the row's note; the other fields replace. A file is applied whole or not at all.
// Applying is idempotent: a patch file stays in reports/ after it is applied, so a row the ledger already holds as the
// patch writes it (an add already there, a set whose fields and note are already in the row) is left as it is.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FILES, REQUIRED, ledgerOfId, checkPatchFile, alreadyAdded, alreadySet } from './src/schema.mjs';
import { serialize } from './src/write.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPORTS = path.resolve(HERE, '..', 'reports');
const write = process.argv.includes('--write');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const files = args.length ? args.map(a => path.resolve(a)) : (fs.existsSync(REPORTS) ? fs.readdirSync(REPORTS).filter(f => /\.ledger\.json$/.test(f)).map(f => path.join(REPORTS, f)) : []);
const L = Object.fromEntries(FILES.map(f => [f.replace(/\.json$/, ''), JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'))]));
const changed = new Set();
let applied = 0, failed = 0, already = 0;
const today = new Date().toISOString().slice(0, 10);

for (const file of files) {
  const problems = checkPatchFile(file, L);
  if (problems.length) { failed++; console.log(`skip ${path.relative(process.cwd(), file)}:\n  ${problems.join('\n  ')}`); continue; }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.patches;
  for (const p of list) {
    const name = p.ledger || ledgerOfId(p.id), ledger = L[name];
    const { ledger: _l, op = 'set', ...fields } = p;
    const have = ledger.rows.find(r => r.id === p.id);
    if (op === 'add' ? alreadyAdded(have, p) : alreadySet(have, p)) { already++; continue; }
    if (op === 'add') {
      const missing = REQUIRED[name].filter(k => !(k in fields));
      if (missing.length) { console.log(`  ${name} ${p.id}: add without ${missing.join('・')} — skipped`); continue; }
      ledger.rows.push(fields);
      console.log(`  ${name} + ${p.id}`);
    } else {
      const row = ledger.rows.find(r => r.id === p.id);
      for (const [k, v] of Object.entries(fields)) {
        if (k === 'id') continue;
        if (k === 'note' && row.note) row.note = `${row.note} ／ ${v}`;
        else row[k] = v;
      }
      console.log(`  ${name} ${p.id}: ${Object.keys(fields).filter(k => k !== 'id').join('・')}${fields.status ? ' → ' + fields.status : ''}`);
    }
    ledger.updated = today;
    (ledger.applied = ledger.applied || []).includes(path.basename(file)) || ledger.applied.push(path.basename(file));
    changed.add(name);
    applied++;
  }
}
console.log(`${applied} patch row(s) from ${files.length - failed} file(s)${already ? ` (${already} already in the ledgers)` : ''}${failed ? `, ${failed} file(s) skipped` : ''}; ledgers touched: ${[...changed].join('・') || 'none'}`);
if (write && changed.size) {
  for (const name of changed) fs.writeFileSync(path.join(HERE, `${name}.json`), serialize(L[name]));
  try { execFileSync(process.execPath, [path.join(HERE, 'validate.mjs'), '--quiet', '--no-patches'], { stdio: 'inherit' }); }
  catch { console.log('validate.mjs found problems after applying: fix the patch or the ledger before committing'); process.exitCode = 1; }
} else if (!write && changed.size) console.log('(dry run — add --write to save)');
if (failed) process.exitCode = 1;
