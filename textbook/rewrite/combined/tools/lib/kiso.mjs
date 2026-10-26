// tools/lib/kiso.mjs — the original basic course (flight-lab/kiso/, read only): its ids from the chapter JSON files
// (393 sections, 376 questions, 161 figures, 85 photos), the K-reference resolver, and the hashes of its files.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { KISO, ROOT } from './paths.mjs';

let CACHE = null;
export function kiso() {
  if (CACHE) return CACHE;
  const dir = path.join(KISO, 'data'), chapters = [];
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^kiso\d\d\.json$/.test(f)).sort() : []) chapters.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  const sections = chapters.flatMap(c => c.sections.map(s => s.id));
  const qa = chapters.flatMap(c => c.qa.map(q => `${c.id}.q${q.n}`));
  const figures = chapters.flatMap(c => c.figures.map(f => f.id));
  const photos = chapters.flatMap(c => c.photos.map(p => p.id));
  const byNum = new Map();
  for (const id of sections) { const m = id.match(/^kiso(\d\d)\.(\d+)$/); if (m) byNum.set(`${m[1]}:${Number(m[2])}`, id); }
  CACHE = { chapters, sections, qa, figures, photos, all: new Set([...sections, ...qa, ...figures, ...photos]), byNum };
  return CACHE;
}
export const kisoId = ref => kiso().byNum.get(`${ref.ch}:${ref.n}`) || null;

// sha256 of every file under flight-lab/kiso (relative path → hex), and whether git sees a change there
export function kisoHashes() {
  const out = {};
  const walkDir = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walkDir(p); else out[path.relative(KISO, p)] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } };
  if (fs.existsSync(KISO)) walkDir(KISO);
  return out;
}
export function kisoGitStatus() {
  try { return execFileSync('git', ['status', '--porcelain', '--', 'flight-lab/kiso'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { return null; }
}
