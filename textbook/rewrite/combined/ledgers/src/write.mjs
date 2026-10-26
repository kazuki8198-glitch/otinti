// ledgers/src/write.mjs — writes a ledger: the head fields pretty-printed, then `rows` with one row per line
// (so a diff shows the rows that changed). Refuses to overwrite an existing ledger without --force: after the
// bootstrap the JSON file is the record and units change it with patches (README.md「パッチ」).
import fs from 'node:fs';
import path from 'node:path';

export function serialize(obj) {
  const { rows, ...head } = obj;
  const lines = Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v, null, 1).replace(/\n\s*/g, ' ')}`);
  const body = (rows || []).map(r => '    ' + JSON.stringify(r));
  return `{\n${lines.join(',\n')}${lines.length ? ',\n' : ''}  "rows": [\n${body.join(',\n')}\n  ]\n}\n`;
}

export function writeLedger(file, obj, argv = process.argv) {
  if (!argv.includes('--write')) { console.log(`(dry run) ${path.basename(file)}: ${(obj.rows || []).length} rows — add --write to write`); return false; }
  if (fs.existsSync(file) && !argv.includes('--force')) { console.error(`${path.basename(file)} exists: not overwritten (--force only for a re-bootstrap; it loses every patch applied since)`); process.exitCode = 1; return false; }
  fs.writeFileSync(file, serialize(obj));
  JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`wrote ${path.basename(file)}: ${(obj.rows || []).length} rows, ${fs.statSync(file).size} bytes`);
  return true;
}
