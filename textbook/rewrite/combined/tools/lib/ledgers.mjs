// tools/lib/ledgers.mjs — reads W03's ledgers (textbook/rewrite/combined/ledgers/*.json) without knowing their exact
// shape yet: an array of rows, an object with one array field (rows/items/entries/…), or an object keyed by id. A
// missing ledger is not an error: the checks report "pending" and count everything as not yet covered.
import fs from 'node:fs';
import path from 'node:path';
import { LEDGERS, COMBINED, rel } from './paths.mjs';

const ARRAY_KEYS = ['rows', 'items', 'entries', 'data', 'list', 'records', 'claims', 'concepts', 'errata', 'rulings', 'map', 'headings', 'examples'];

// COMBINED_LEDGERS (an environment variable) points the checks at another folder of ledgers (selftest.mjs uses it)
export function readLedger(name) {
  const cands = process.env.COMBINED_LEDGERS ? [path.join(process.env.COMBINED_LEDGERS, name)] : [path.join(LEDGERS, name), path.join(COMBINED, name)];
  const file = cands.find(f => fs.existsSync(f));
  if (!file) return { exists: false, name, path: rel(cands[0]), rows: [], raw: null };
  try {
    const txt = fs.readFileSync(file, 'utf8');
    let raw;
    if (/\.jsonl$/.test(file)) raw = txt.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    else raw = JSON.parse(txt);
    return { exists: true, name, path: rel(file), rows: rowsOf(raw), raw };
  } catch (e) { return { exists: true, name, path: rel(file), rows: [], raw: null, error: e.message }; }
}

export function rowsOf(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    for (const k of ARRAY_KEYS) if (Array.isArray(raw[k])) return raw[k];
    const arrays = Object.values(raw).filter(Array.isArray);
    if (arrays.length === 1 && arrays[0].every(x => x && typeof x === 'object')) return arrays[0];
    const vals = Object.entries(raw).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v));
    if (vals.length && vals.length >= Object.keys(raw).length - 2) return vals.map(([k, v]) => ({ id: k, ...v }));
  }
  return [];
}

// the first field of a row that is set, among names
export const pick = (row, names) => { for (const n of names) if (row && row[n] !== undefined && row[n] !== null && row[n] !== '') return row[n]; return undefined; };
export const asList = v => v === undefined || v === null || v === '' ? [] : Array.isArray(v) ? v.flat() : typeof v === 'string' ? v.split(/[,、・\s]+/).filter(Boolean) : [v];
