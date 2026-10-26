// check-provenance.mjs — DESIGN 5 章 基準 10・11:
//  10: the original basic course does not change — git sees no change under flight-lab/kiso/ and every file's sha256
//      equals tools/data/kiso-sha256.json (the hashes at the start of R1; --write-hashes rewrites that file, only when
//      git shows flight-lab/kiso/ clean);
//  11: the provenance ledger PROVENANCE.json lists each of the basic course's 393 sections, 376 questions, 161 figures
//      and 85 photos exactly once, with where it goes (one or more places) or why it is left out; a section of the
//      book with `from` names basic-course ids that exist, and the ledger row of each names that section back.
// The ledger's shape is read loosely (W03 is writing it): a row's id in id/kiso/src, its places in to/dest/targets/
// sections/where, its reason in drop/excluded/reason/why.
import fs from 'node:fs';
import path from 'node:path';
import { Result, cli } from './lib/report.mjs';
import { readLedger, pick, asList } from './lib/ledgers.mjs';
import { kiso, kisoHashes, kisoGitStatus } from './lib/kiso.mjs';
import { toc } from './lib/design.mjs';
import { TOOLS } from './lib/paths.mjs';

export const meta = { id: 'provenance', title: '由来（原本は変わらない・由来表の網羅・節の from）', criteria: [10, 11] };
const HASHES = path.join(TOOLS, 'data', 'kiso-sha256.json');

export async function run(env) {
  const r = new Result(meta);
  // 10: the original
  const st = kisoGitStatus();
  if (st === null) r.warn('git', 'flight-lab/kiso', 'git status を読めなかった');
  else if (st) r.error('kiso-changed', 'flight-lab/kiso', `git が変更を見ている：${st.split('\n').slice(0, 5).join(' / ')}`);
  const now = kisoHashes();
  if (env.o && (env.o.args || []).includes('--write-hashes')) {
    if (st) r.error('write-hashes', 'flight-lab/kiso', '変更があるので書かない');
    else { fs.mkdirSync(path.dirname(HASHES), { recursive: true }); fs.writeFileSync(HASHES, JSON.stringify(now, null, 1) + '\n'); r.note(`wrote ${Object.keys(now).length} hashes to ${path.relative(TOOLS, HASHES)}`); }
  }
  if (!fs.existsSync(HASHES)) r.pending('hash-list', path.relative(TOOLS, HASHES), 'ハッシュの一覧がない（--write-hashes で作る）');
  else {
    const want = JSON.parse(fs.readFileSync(HASHES, 'utf8'));
    for (const [f, h] of Object.entries(want)) { r.count('original files'); if (!now[f]) r.error('kiso-file-gone', f, '原本のファイルがない'); else if (now[f] !== h) r.error('kiso-hash', f, 'sha256 が違う（原本が変わった）'); }
    for (const f of Object.keys(now)) if (!want[f]) r.error('kiso-file-new', f, '原本のフォルダに新しいファイル');
  }
  // 11: the ledger
  const K = kiso(), kinds = { section: K.sections, question: K.qa, figure: K.figures, photo: K.photos };
  r.metric('the basic course', Object.entries(kinds).map(([k, v]) => `${k} ${v.length}`).join(' · '));
  const L = readLedger('PROVENANCE.json');
  const seen = new Map();
  const book = new Set(env.FL.book.CHAPTERS.flatMap(c => [c.id, ...c.secs.map(s => s.id)])), plan = toc();
  let pendingDest = 0;
  if (!L.exists) r.pending('ledger', L.path, '由来表がまだない（W03）：全部を「行き先なし」として数えた');
  else if (L.error) r.error('ledger-unreadable', L.path, L.error);
  for (const row of L.rows) {
    const id = pick(row, ['id', 'kiso', 'src', 'source', 'k']);
    if (!id) { r.error('row-without-id', L.path, JSON.stringify(row).slice(0, 80)); continue; }
    seen.set(id, (seen.get(id) || 0) + 1);
    if (!K.all.has(id)) r.error('unknown-id', id, '基礎教材にない ID');
    const dests = asList(pick(row, ['to', 'dest', 'dests', 'destination', 'destinations', 'target', 'targets', 'sections', 'where', 'into']));
    const why = pick(row, ['drop', 'dropped', 'excluded', 'exclude', 'reason', 'why', 'out']);
    if (!dests.length && !why) r.error('no-destination', id, '行き先も外した理由もない');
    for (const d of dests.map(String)) {
      if (!/\./.test(d) || /^(p\d|g\d)/.test(d) && !d.includes('.')) continue;          // a part's door, a chapter, a box: not checked here
      if (book.has(d)) continue;
      if (plan.secs.has(d)) pendingDest++; else r.warn('unknown-destination', id, `行き先 "${d}" が本にも DESIGN 3.3 の目次にもない`);
    }
  }
  for (const [kind, ids] of Object.entries(kinds)) {
    const missing = ids.filter(id => !seen.has(id)), dup = ids.filter(id => seen.get(id) > 1);
    r.count('basic-course ids', ids.length);
    r.metric(`${kind}s in the ledger`, `${ids.length - missing.length} / ${ids.length}${dup.length ? `（2 回以上：${dup.length}）` : ''}`);
    if (L.exists) { for (const id of missing.slice(0, 400)) r.error('missing-row', id, `由来表にない（${kind}）`); for (const id of dup) r.error('duplicate-row', id, `由来表に ${seen.get(id)} 回`); }
  }
  if (pendingDest) r.info('destination-not-yet', L.path, `${pendingDest} の行き先は DESIGN 3.3 の目次にあるがまだ本にない`);
  // the book's `from`
  const byId = new Map(L.rows.map(row => [pick(row, ['id', 'kiso', 'src', 'source', 'k']), row]));
  for (const ch of env.only ? env.FL.book.CHAPTERS.filter(c => env.only.has(c.id)) : env.FL.book.CHAPTERS) for (const s of ch.secs) {
    if (!Array.isArray(s.from)) continue;
    r.count('sections with from');
    for (const id of s.from) {
      if (!K.all.has(id)) { r.error('from-unknown', s.id, `from の ${id} が基礎教材にない`); continue; }
      const row = byId.get(id);
      if (!row) { if (L.exists) r.error('from-not-in-ledger', s.id, `${id} が由来表にない`); continue; }
      const dests = asList(pick(row, ['to', 'dest', 'dests', 'destination', 'destinations', 'target', 'targets', 'sections', 'where', 'into'])).map(String);
      if (!dests.includes(s.id)) r.warn('ledger-misses-section', s.id, `由来表の ${id} の行き先に ${s.id} がない`);
    }
  }
  return r;
}

await cli(import.meta.url, meta, run, { usage: '[--write-hashes]' });
