// check-chapters.mjs — the conditions the products' tests put on every chapter (so a draft can be checked before it is
// registered: DESIGN 6.2 決まり 5), on each chapter checked:
//  FLIGHT LAB (flight-lab/test/flight.test.mjs): t, en, summary, ≥ 2 sections, each section's text > 200 characters,
//   ≥ 3 terms [English, 日本語, …], ≥ 1 example and caution, ≥ 2 questions with q, why, ≥ 3 choices and a valid answer,
//   ≥ 1 source and every source https, the lessons exist; every data-sec / data-lesson / data-calc resolves; no {ch:}
//   left and no「（別の章）」; no TODO / FIXME / TBD / lorem ipsum / PLACEHOLDER / XXX (base64 cut first).
//  TEXTBOOK (textbook/test/content.test.mjs): 4 choices per question; no <script>; <a> only in a photo's credit, each
//   https with target=_blank rel=noopener noreferrer; the same HTML each time it renders.
import { Result, cli } from './lib/report.mjs';
import { stripB64, textOf, clip } from './lib/html.mjs';
import { chaptersOf, sectionsOf, endStrings } from './lib/book.mjs';

export const meta = { id: 'chapters', title: '章のテストの条件（FLIGHT LAB と TEXTBOOK のテストと同じ）', criteria: [25] };

export const BANNED = [/\bTODO\b/, /\bFIXME\b/, /\bTBD\b/, /lorem ipsum/i, /PLACEHOLDER/, /\{\{\s*\w+\s*\}\}/, /XXX/];

export function checkChapter(r, env, ch) {
  const FL = env.FL, BK = FL.book, lessons = new Set(FL.school && FL.school.lessonOrder ? FL.school.lessonOrder() : []);
  const at = ch.id;
  if (!(ch.t && ch.en && ch.summary)) r.error('chapter-text', at, 't・en・summary のどれかがない');
  if (!Array.isArray(ch.secs) || ch.secs.length < 2) r.error('sections', at, `節が ${ch.secs ? ch.secs.length : 0}（2 以上）`);
  if (!Array.isArray(ch.terms) || ch.terms.length < 3 || !ch.terms.every(t => t && t[0] && t[1])) r.error('terms', at, `用語が ${(ch.terms || []).length}（3 以上、各 [English, 日本語]）`);
  if (!(ch.examples || []).length) r.error('examples', at, '例がない');
  if (!(ch.cautions || []).length) r.error('cautions', at, '注意がない');
  const quiz = ch.quiz || [];
  if (quiz.length < 2) r.error('questions', at, `確認問題が ${quiz.length}（2 以上）`);
  quiz.forEach((q, i) => {
    if (!(q && q.q && q.why && Array.isArray(q.choices) && q.choices.length >= 3)) r.error('question-shape', `${at}.quiz[${i}]`, 'q・why・choices（3 以上）');
    else if (q.choices.length !== 4) r.error('question-4-choices', `${at}.quiz[${i}]`, `選択肢が ${q.choices.length}（TEXTBOOK は 4）`);
    if (!(Number.isInteger(q && q.answer) && q.answer >= 0 && q.answer < ((q && q.choices) || []).length)) r.error('question-answer', `${at}.quiz[${i}]`, `answer ${q && q.answer} が選択肢の範囲外`);
  });
  if (!(ch.refs || []).length || !(ch.refs || []).every(x => x && /^https:\/\//.test(x.url))) r.error('refs', at, '出典がない、または https でない出典がある');
  for (const id of ch.lessons || []) if (!lessons.has(id)) r.error('lesson', at, `課目 ${id} がない`);
  for (const s of sectionsOf({ ...env, only: new Set([ch.id]) })) {
    if (s.err) { r.error('render', s.id, s.err); continue; }
    const t = textOf(s.html);
    if (t.length <= 200) r.error('section-short', s.id, `本文が ${t.length} 字（200 字を超えること）`);
    for (const m of s.html.matchAll(/data-sec="([^"]+)"/g)) if (!BK.findSection(m[1])) r.error('link-section', s.id, `→ ${m[1]} がない`);
    for (const m of s.html.matchAll(/data-lesson="([^"]+)"/g)) if (!lessons.has(m[1])) r.error('link-lesson', s.id, `→ 課目 ${m[1]} がない`);
    for (const m of s.html.matchAll(/data-calc="([^"]+)"/g)) if (typeof (FL.bookCalc || {})[m[1]] !== 'function') r.error('link-calc', s.id, `→ 計算機 ${m[1]} がない`);
    if (/\{ch:|（別の章）/.test(s.html)) r.error('chapter-link', s.id, '{ch:} が解決しない（「（別の章）」）');
    for (const re of BANNED) if (re.test(t)) r.error('placeholder', s.id, `${re} が本文にある`);
    if (/<script/i.test(s.html)) r.error('script', s.id, '<script> がある');
    if (/<a\s/i.test(s.html.replace(/<span class="bk-credit">[\s\S]*?<\/span>/g, ''))) r.error('link-outside-credit', s.id, '写真のクレジットの外に <a> がある（TEXTBOOK：URL は章の出典へ）');
    for (const m of s.html.matchAll(/<a\s[^>]*>/g)) if (!/^<a href="https:\/\/[^"]+" target="_blank" rel="noopener noreferrer">$/.test(m[0])) r.error('link-shape', s.id, clip(m[0], 60));
    try { if (stripB64(BK.html(s.sec)) !== s.html) r.error('unstable', s.id, '描くたびに HTML が変わる'); } catch (e) { /* reported above */ }
  }
  for (const [k, v] of endStrings(ch)) {
    if (/\{ch:([a-z0-9]+)\}/.test(v) && /（別の章）/.test(BK.fix(v))) r.error('chapter-link', `${at}.${k}`, '{ch:} が解決しない');
    for (const re of BANNED) if (re.test(v)) r.error('placeholder', `${at}.${k}`, `${re}`);
  }
}

export async function run(env) {
  const r = new Result(meta);
  const BK = env.FL.book;
  for (const ch of chaptersOf(env)) { r.count('chapters'); checkChapter(r, env, ch); }
  if (!env.only) {
    const all = BK.CHAPTERS.flatMap(c => c.secs.map(s => BK.text(s))).join(' ');
    if (!all.includes('本アプリは公開情報を基にした非公式の自主学習用教材です。')) r.error('disclaimer', 'book', '本に注意書きがない');
    for (const w of ['Vmc', 'METAR', '91.155', 'ゴーアラウンド', 'ILS', 'TEM', 'IMSAFE', '偏流修正']) if (!all.includes(w)) r.error('required-word', 'book', `FLIGHT LAB のテストが本文に求める語「${w}」がない`);
    const ids = BK.CHAPTERS.map(c => c.id), at = ids.indexOf('radio1');
    if (at < 0 || ids.slice(at, at + 6).join() !== 'radio1,radio2,radio3,radio4,radio5,hf') r.error('radio-order', 'book', 'radio1〜radio5 が hf の直前に並んでいない');
    BK.CHAPTERS.forEach((c, i) => { if (c.n !== i + 1) r.error('numbering', c.id, `番号 ${c.n} ≠ ${i + 1}`); });
  }
  return r;
}

await cli(import.meta.url, meta, run);
