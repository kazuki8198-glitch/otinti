// CADET — career/archive.js : everything the cadet has done, as one file to keep or to move to another browser (M5):
// the career (career/career.js), the conversations' state (flags, trust), the logbook, and FLIGHT LAB's own record of
// the lessons (its progress and its flight records, school.js's shapes). Written as JSON; read back cleaned, part by
// part (a part that is not right is refused with the reason, nothing is half-read).
// Pure logic: no DOM (the game saves and opens the file).
import { cleanCareer, CAREER_VERSION } from './career.js';
import { createDialogState, isDialogState } from '../dialog/engine.js';
import { cleanEntry } from './logbook.js';

export const ARCHIVE_KIND = 'cadet-save';
export const ARCHIVE_V = 1;

// parts: { career, talk, logbook: [entries], progress (FLIGHT LAB's), records (FLIGHT LAB's) }
export function exportArchive(parts, { now = new Date() } = {}) {
  return JSON.stringify({
    app: 'CADET', kind: ARCHIVE_KIND, v: ARCHIVE_V, exported: now.toISOString(),
    note: '架空の訓練生の記録です（実在の訓練や資格とは関係ありません）。',
    career: parts.career || null, talk: parts.talk || null, logbook: parts.logbook || [], progress: parts.progress || null, records: parts.records || [],
  }, null, 1);
}
// → { career, talk, logbook, progress, records } cleaned; throws an Error with a Japanese reason when it cannot be read
export function importArchive(text, FL) {
  let j;
  try { j = JSON.parse(text); } catch (e) { throw new Error('JSON として読めません'); }
  if (!j || j.app !== 'CADET' || j.kind !== ARCHIVE_KIND) throw new Error('CADET の記録のファイルではありません');
  if (j.v !== ARCHIVE_V) throw new Error(`記録の版（${j.v}）がこの版（${ARCHIVE_V}）と違います`);
  const career = cleanCareer(j.career);
  if (!career) throw new Error(`キャリアの記録（版 ${CAREER_VERSION}）が読めません`);
  if (j.talk != null && !isDialogState(j.talk)) throw new Error('会話の記録が読めません');
  const SC = FL && FL.school;
  const progress = SC && SC.sanitizeProgress ? SC.sanitizeProgress(j.progress) : (j.progress && typeof j.progress === 'object' ? j.progress : null);
  const records = Array.isArray(j.records) ? (SC && SC.sanitizeRecord ? j.records.map(SC.sanitizeRecord).filter(Boolean) : j.records) : [];
  return { career, talk: createDialogState(j.talk), logbook: (Array.isArray(j.logbook) ? j.logbook : []).map(cleanEntry).filter(Boolean), progress, records };
}
