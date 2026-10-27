// ledgers/src/schema.mjs — what each ledger may contain (README.md): the fields a row needs, the statuses, which
// statuses need two signatures, the ledger an id belongs to, and the check of a patch list. Used by ../validate.mjs
// and ../apply-patches.mjs.
import fs from 'node:fs';
import path from 'node:path';

export const STATUS = {
  ERRATA: { open: [], fixed: ['where'], 'not-error': ['reason'], wontfix: ['reason'] },
  RULINGS: { open: [], fixed: ['where'], 'not-error': ['reason'] },
  UNVERIFIED: { open: [], resolved: ['value', 'sourceUrl', 'checkedOn'], unresolvable: ['reason'] },
  CONCEPTS: { open: [], done: ['where'] },
  PROVENANCE: { open: [], done: ['where'], dropped: ['reason'] },
  'JCAB-MAP': { open: [], mapped: [], confirmed: ['where'], excluded: ['excluded'] },
  'ACS-MAP': { open: [], mapped: [], confirmed: ['where'], excluded: ['excluded'] },
  'JCAB-CALIBRATION': null, CLAIMS: null, COUNTS: null,
};
export const OPEN_LIKE = new Set(['open', 'mapped']);
// the statuses that need two signatures (the row is closed by the fixer and confirmed by someone else)
export const SIGNED = { ERRATA: ['fixed', 'not-error', 'wontfix'], RULINGS: ['fixed', 'not-error'], UNVERIFIED: ['resolved', 'unresolvable'], CONCEPTS: ['done'], PROVENANCE: ['done', 'dropped'], 'JCAB-MAP': ['confirmed', 'excluded'], 'ACS-MAP': ['confirmed'] };
export const REQUIRED = {
  ERRATA: ['id', 'ref', 'book', 'design', 'places', 'problem', 'correction', 'confidence', 'safety', 'source', 'unit', 'status', 'verified'],
  RULINGS: ['id', 'topic', 'class', 'classes', 'ruling', 'treatment', 'unit', 'status'],
  UNVERIFIED: ['id', 'item', 'says', 'sections', 'source', 'unit', 'status'],
  CONCEPTS: ['id', 'kind', 'name', 'address', 'recalls', 'status'],
  PROVENANCE: ['id', 'kind', 'chapter', 'to', 'plan', 'status'],
  'JCAB-MAP': ['id', 'doc', 'label', 'path', 'title', 'sections', 'status'],
  'ACS-MAP': ['id', 'acs', 'task', 'text', 'sections', 'status'],
  'JCAB-CALIBRATION': ['id', 'subject', 'source', 'by'],
  CLAIMS: ['id', 'sec', 'tag', 'by'],
  COUNTS: ['id', 'what', 'design', 'recount', 'source'],
};
export const FILES = Object.keys(REQUIRED).map(k => `${k}.json`);
// which ledger an id belongs to (so a patch may leave `ledger` out)
export function ledgerOfId(id) {
  if (/^(T|K)\.[a-z-]+\./.test(id) || /^(APP|SYNC)\./.test(id)) return 'ERRATA';
  if (/^R\./.test(id)) return 'RULINGS';
  if (/^U\./.test(id)) return 'UNVERIFIED';
  if (/^C\./.test(id)) return 'CONCEPTS';
  if (/^CAL\./.test(id)) return 'JCAB-CALIBRATION';
  if (/^kiso\d\d\.|^ch\d\d-(fig|photo)/.test(id)) return 'PROVENANCE';
  if (/^(cpl|ir|ppl)\.\d/.test(id)) return 'JCAB-MAP';
  if (/^(PA|IR|CA)\.[IVX]+\./.test(id)) return 'ACS-MAP';
  if (/#[0-9a-f]{8}$/.test(id)) return 'CLAIMS';
  if (/^(toc|origin|kiso|prov|errata|rulings|jur|book)\./.test(id)) return 'COUNTS';
  return null;
}
export const UNIT = /^W\d\d[a-f]?$/;


// a patch row's fields (without op and ledger) as a row would hold them
export const patchFields = p => { const { ledger: _l, op: _o, ...fields } = p; return fields; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// a patch row with a note (the notes are what tell the patches of several units on one row apart)
const hasNote = p => typeof p.note === 'string' && p.note.trim() !== '';
// an add was applied before when its row is there. An add with a note is known by its note, which starts the row's note
// (later patches only append to it): a later unit's patch may have set the row's other fields since (status, where, by…:
// W07a closing W02's APP.cadet-comm-practice-ch-sim, W11 writing notes on W06's rows), and that must not make the add
// look like a second row with the same id. An add without a note: when the row holds every field as the patch has it
export const alreadyAdded = (row, p) => !!row && (hasNote(p)
  ? String(row.note || '').startsWith(p.note)
  : Object.entries(patchFields(p)).every(([k, v]) => same(row[k], v)));
// a set was applied before when the row already holds it. A set with a note is known by its note (already part of the
// row's note): a later unit's patch may have set the same row's other fields since (by, status…), and applying the
// earlier patch again must not turn them back nor add its note twice (several units write notes on one row: W05, W04
// and W06 on U.check-standards). A set without a note: when the row holds every field as the patch has it
export const alreadySet = (row, p) => !!row && (hasNote(p)
  ? String(row.note || '').includes(p.note)
  : Object.entries(patchFields(p)).every(([k, v]) => k === 'id' || same(row[k], v)));

export function checkPatchFile(file, ledgers) {
  const out = [];
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return [`${path.basename(file)}: JSON として読めない：${e.message}`]; }
  const list = Array.isArray(raw) ? raw : raw.patches;
  if (!Array.isArray(list)) return [`${path.basename(file)}: patches の配列がない`];
  if (!Array.isArray(raw) && raw.unit && !UNIT.test(raw.unit)) out.push(`${path.basename(file)}: unit "${raw.unit}"`);
  for (const [i, p] of list.entries()) {
    const at = `${path.basename(file)} #${i} ${p && p.id}`;
    if (!p || typeof p.id !== 'string') { out.push(`${at}: id がない`); continue; }
    const name = p.ledger || ledgerOfId(p.id);
    if (!name || !ledgers[name]) { out.push(`${at}: どの台帳か分からない（ledger を書く）`); continue; }
    const exists = ledgers[name].rows.some(r => r.id === p.id);
    // an add whose row is already there as written was applied before (a patch file stays in reports/): not an error
    if ((p.op || 'set') === 'add') { if (exists && !alreadyAdded(ledgers[name].rows.find(r => r.id === p.id), p)) out.push(`${at}: add なのに同じ id の行がある（中身も違う）`); }
    else if (!exists) out.push(`${at}: ${name} にない id`);
    const st = STATUS[name];
    if (p.status !== undefined && st && !(p.status in st)) out.push(`${at}: status "${p.status}" は ${name} で使えない`);
    if (!p.by && !p.checkedBy) out.push(`${at}: by（直した・書いた単位）も checkedBy（確かめた単位）もない`);
    if (p.checkedBy && p.checkedBy === p.by) out.push(`${at}: by と checkedBy が同じ`);
    const row = exists ? ledgers[name].rows.find(r => r.id === p.id) : null;
    if (p.checkedBy && !p.by && row && row.by === p.checkedBy) out.push(`${at}: checkedBy が行の by（${row.by}）と同じ`);
  }
  return out;
}
