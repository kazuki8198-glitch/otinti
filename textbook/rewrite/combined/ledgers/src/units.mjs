// ledgers/src/units.mjs — which work unit (DESIGN 7.2) writes each chapter, figure and photo of the combined book,
// so every ledger row can name the unit that will close it.
import { plannedBook } from './design.mjs';

export const DATE = '2026-10-26';

// DESIGN 7.2: the unit that writes (or fixes) each chapter
export const CHAPTER_UNIT = {
  // 序部（R1）
  intro: 'W10', basics: 'W10', english: 'W10', sim: 'W09',
  // 第 1 部（R2）
  aero: 'W13', sys: 'W14', inst: 'W15', perf: 'W16', wb: 'W16', wx: 'W17', navb: 'W18',
  law: 'W19', radio1: 'W19', radio2: 'W19', radio3: 'W19', radio4: 'W19', radio5: 'W19', hf: 'W20', adm: 'W20', g1: 'W25',
  // 第 2〜6 部（R3）
  ground: 'W28', ops: 'W28', tl: 'W28', emg: 'W28', solo: 'W28', g2: 'W35',
  navp: 'W29', navr: 'W29', navd: 'W29', night: 'W29', g3: 'W35',
  ifr: 'W30', ifrp: 'W30', g4: 'W35',
  me: 'W31', oei: 'W31', g5: 'W35',
  crm: 'W32', jet: 'W32', tsys: 'W32', g6: 'W35',
  // 第 7 部（R4）
  jlaw: 'W38', jair: 'W38', jatc: 'W39', jwx: 'W40', jifr: 'W41', jexam: 'W42', g7: 'W42',
};
// the textbook's existing chapters and who fixes their known errors in R1 (W07a: part 1, W07b: parts 2-3, W07c: parts 4-6)
export const FIX_UNIT = {
  intro: 'W10', sim: 'W10',
  aero: 'W07a', sys: 'W07a', perf: 'W07a', wx: 'W07a', law: 'W07a', radio1: 'W07a', radio2: 'W07a', radio3: 'W07a', radio4: 'W07a', radio5: 'W07a', hf: 'W07a',
  ground: 'W07b', ops: 'W07b', tl: 'W07b', emg: 'W07b', solo: 'W07b', navp: 'W07b', navr: 'W07b', navd: 'W07b',
  ifr: 'W07c', ifrp: 'W07c', me: 'W07c', oei: 'W07c', crm: 'W07c', jet: 'W07c',
};
const DOOR_UNIT = { p0: 'W10', p1: 'W25', p2: 'W35', p3: 'W35', p4: 'W35', p5: 'W35', p6: 'W35', p7: 'W38' };
const WRITTEN_UNIT = part => (part === 'p0' ? 'W10' : part === 'p1' ? 'W23' : part === 'p7' ? 'W42' : 'W34');
const FIGURE_UNIT = part => (part === 'p0' ? 'W10' : part === 'p1' ? 'W21' : part === 'p7' ? 'W43' : 'W33');
const PHOTO_UNIT = part => (part === 'p0' || part === 'p1' ? 'W22' : part === 'p7' ? CHAPTER_UNIT : 'W33');

const BOOK = plannedBook();
const CH_PART = Object.fromEntries(BOOK.chapters.map(c => [c.id, c.part]));
export const partOfChapter = ch => CH_PART[ch] || null;
export const chapterOf = sec => (BOOK.secs.get(sec) || {}).chapter || null;

// a destination token → the unit: a section id, door:pN, summary:<chapter>, written:<chapter>
export function unitForDest(d) {
  if (!d) return null;
  let m;
  if ((m = d.match(/^door:(p\d)$/))) return DOOR_UNIT[m[1]];
  if ((m = d.match(/^summary:([a-z0-9]+)$/))) return CHAPTER_UNIT[m[1]];
  if ((m = d.match(/^written:([a-z0-9]+)$/))) return WRITTEN_UNIT(partOfChapter(m[1]));
  const ch = chapterOf(d);
  return ch ? CHAPTER_UNIT[ch] : null;
}
const partOfDest = d => {
  if (!d) return null;
  let m;
  if ((m = d.match(/^door:(p\d)$/))) return m[1];
  if ((m = d.match(/^(?:summary|written):([a-z0-9]+)$/))) return partOfChapter(m[1]);
  return partOfChapter(chapterOf(d));
};
export const unitForFigure = d => FIGURE_UNIT(partOfDest(d) || 'p1');
export function unitForPhoto(d) {
  const p = partOfDest(d);
  if (!p) return 'W22';
  const u = PHOTO_UNIT(p);
  return typeof u === 'string' ? u : u[chapterOf(d)];
}
