// check-path.mjs — DESIGN 5 章 基準 23 (the learner's path), from the data:
//  - each of the lessons' book sections (37 lessons, FL.syllabus) is in the lesson's part or an earlier one;
//  - a bk.see to a later part carries「予告」, and there are at most 40 of them in the whole book;
//  - each part's door (PARTS[].door) names ≥ 6 sections to recall, ≥ 2 of them from two or more parts before
//    (not for 序部 and 第 1 部);
//  - ≥ 30 % of a summary chapter's (gN) questions are on earlier parts.
// Also counted: {ch:} references to a chapter of a later part (they become「第 N 章」with no 予告).
import { Result, cli } from './lib/report.mjs';
import { textOf, clip } from './lib/html.mjs';
import { sectionsOf, partIndexOf } from './lib/book.mjs';
import { asList, pick } from './lib/ledgers.mjs';

export const meta = { id: 'path', title: '学ぶ人の道のり（課目の節・後ろへのリンク・部の扉・まとめの問い）', criteria: [23] };
export const LIMITS = { forwardSee: 40, doorRecall: 6, doorFar: 2, gateEarlier: 0.3 };

export async function run(env) {
  const r = new Result(meta);
  const FL = env.FL, BK = FL.book, pi = p => partIndexOf(FL, p), partOfSec = id => { const x = BK.findSection(id); return x ? x.ch.part : null; };
  // the lessons
  if (!env.only) for (const st of (FL.syllabus && FL.syllabus.STAGES) || []) for (const l of st.lessons || []) {
    if (!l.book) continue;
    r.count('lessons with book sections');
    for (const id of l.book) {
      const p = partOfSec(id);
      if (!p) { r.error('lesson-book-missing', `${l.id}`, `節 ${id} がない`); continue; }
      if (pi(p) > pi(st.phase)) r.error('lesson-book-later-part', l.id, `課目（${st.phase}）の節 ${id} が後ろの部 ${p} にある`);
    }
    for (const id of asList(l.review)) if (!partOfSec(id)) r.error('lesson-review-missing', l.id, `review の節 ${id} がない`);
  }
  // forward links
  let forward = 0;
  for (const s of sectionsOf(env)) {
    r.count('sections');
    const here = pi(s.ch.part);
    for (const m of s.html.matchAll(/<button type="button" data-sec="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)) {
      const p = partOfSec(m[1]); if (!p || pi(p) <= here) continue;
      forward++;
      if (!/予告/.test(textOf(m[2]))) r.error('forward-see-unlabelled', s.id, `後ろの部（${p}）の ${m[1]} へのリンクに「予告」がない：「${clip(textOf(m[2]), 30)}」`);
    }
    for (const m of s.raw.matchAll(/\{ch:([a-z0-9]+)\}/g)) { const c = BK.CHAPTERS.find(x => x.id === m[1]); if (c && pi(c.part) > here) r.warn('forward-ch-ref', s.id, `後ろの部（${c.part}）の章 ${m[1]} を「第 N 章」で指す（予告の札がない）`); }
  }
  if (!env.only && forward > LIMITS.forwardSee) r.error('forward-see-total', 'book', `後ろの部への bk.see が ${forward} 本（${LIMITS.forwardSee} 本まで）`);
  r.metric('bk.see to a later part', `${forward}（上限 ${LIMITS.forwardSee}）`);
  if (env.only) return r;
  // the doors
  const parts = BK.PARTS;
  parts.forEach((p, i) => {
    if (p.id === 'p0' || p.id === 'p7') return;
    const door = p.door;
    if (!door) { r.pending('door-not-yet', p.id, '部の扉（door）がまだない'); return; }
    const recall = asList(pick(door, ['recall', 'remember', 'review', 'recalls'])).map(String);
    for (const id of recall) if (!partOfSec(id)) r.error('door-recall-missing', p.id, `思い出す節 ${id} がない`);
    if (recall.length < LIMITS.doorRecall) r.error('door-recall-few', p.id, `思い出す節が ${recall.length}（${LIMITS.doorRecall} 以上）`);
    if (p.id !== 'p1') {
      const far = recall.filter(id => { const q = partOfSec(id); return q && pi(q) <= i - 2; }).length;
      if (far < LIMITS.doorFar) r.error('door-recall-near', p.id, `2 部以上前の節が ${far}（${LIMITS.doorFar} 以上）`);
    }
  });
  // the summary chapters
  for (const ch of BK.CHAPTERS.filter(c => /^g\d$/.test(c.id))) {
    const here = pi(ch.part), qs = ch.quiz || [];
    let known = 0, earlier = 0;
    for (const q of qs) {
      const basis = String(pick(q, ['sec', 'from', 'basis']) || '') || ((String(q.why || '').match(/data-sec="([^"]+)"/) || [])[1]) || '';
      const chRef = (String(q.why || '').match(/\{ch:([a-z0-9]+)\}/) || [])[1];
      const p = basis ? partOfSec(basis) : chRef ? (BK.CHAPTERS.find(c => c.id === chRef) || {}).part : null;
      if (!p) continue; known++; if (pi(p) < here) earlier++;
    }
    r.count('summary chapters');
    if (!known) r.warn('gate-questions-unlinked', ch.id, '問いの根拠の節が分からない（sec か理由のリンク）');
    else if (earlier / known < LIMITS.gateEarlier) r.error('gate-questions-earlier', ch.id, `前の部の問いが ${earlier}/${known}（30% 以上）`);
  }
  if (!BK.CHAPTERS.some(c => /^g\d$/.test(c.id))) r.pending('gates-not-yet', 'g1〜g7', '部のまとめの章はまだない');
  return r;
}

await cli(import.meta.url, meta, run);
