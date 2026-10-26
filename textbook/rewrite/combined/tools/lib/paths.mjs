// tools/lib/paths.mjs — where things are (all absolute, from this file's place in the repo).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const COMBINED = path.resolve(TOOLS, '..');                 // textbook/rewrite/combined
export const ROOT = path.resolve(COMBINED, '..', '..', '..');       // the repository
export const FL_SRC = path.join(ROOT, 'flight-lab', 'src');
export const KISO = path.join(ROOT, 'flight-lab', 'kiso');          // the original basic course (never written)
export const LEDGERS = path.join(COMBINED, 'ledgers');              // W03's ledgers (may not exist yet)
export const DRAFTS = path.join(COMBINED, 'drafts');                // chapter drafts (no product reads them)
export const DESIGN = path.join(COMBINED, 'DESIGN.md');
export const EGOV = path.join(ROOT, 'textbook', 'rewrite', 'sources', 'egov');
export const PHOTO_CREDITS = path.join(ROOT, 'flight-lab', 'PHOTO-CREDITS.md');
export const rel = p => path.relative(ROOT, p) || '.';
