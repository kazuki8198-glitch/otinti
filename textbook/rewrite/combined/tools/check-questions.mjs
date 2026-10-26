// check-questions.mjs — DESIGN 5 章 基準 18〜20 and 6.2 決まり 14, on the chapters' 4-choice questions (quiz), the
// ground-school test banks (FL.quiz.BANKS; the 14 banks CADET's written exams read, and the JCAB banks q_j* if loaded)
// and the chapters' written questions (written):
//  one answer: the answer index in range, no two choices the same, no choice that refers to the others (choices are
//  shuffled when shown); the answer positions spread (each position 15–35 % of a bank, and of all chapter questions);
//  a reason, with its basis (a {ch:} / section link or a named source); in the 14 banks no Japanese law (they are
//  CADET's), and a {ch:} only to a chapter CADET has; written questions without broken structure (a </b> with no <b>,
//  the next group's instructions run in). The original basic course's 376 questions are counted for information.
import { Result, cli } from './lib/report.mjs';
import { textOf, clip } from './lib/html.mjs';
import { chaptersOf, NOT_IN_CADET } from './lib/book.mjs';
import { findRules } from './check-jurisdiction.mjs';
import { kiso } from './lib/kiso.mjs';

export const meta = { id: 'questions', title: '問題（正解は 1 つ・正解の位置・理由と根拠・学科テストの範囲・記述問題の構造）', criteria: [18, 19, 20] };

export const SPREAD = { min: 0.15, max: 0.35 };
const REFERS = /(上の|以上の)?(すべて|全部|いずれも|どれも)(正しい|誤り|当てはまる|違う)?$|all of the above|none of the above|^(上記|以上)/i;
const SECTION_LINK = /\{ch:|data-sec=|bk\.see/;
const SOURCE = /PHAK|AFH|IFH|IPH|AWH|RMH|AIM|CFR|POH|AFM|ACS|AC\s?\d|チェックリスト|ハンドブック|Handbook|(?<![\d.])\d{2,3}\.\d+|第\s?\d+\s?条|航空法|施行規則|Part\s?\d+|教科書|本文|節/;
const norm = s => textOf(String(s)).replace(/\s+/g, '').toLowerCase();

function oneQuestion(r, where, q, choices, answer, why) {
  r.count('questions');
  if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) r.error('answer-index', where, `answer ${answer} が範囲外`);
  const seen = new Map();
  choices.forEach((c, i) => { const k = norm(c); if (seen.has(k)) r.error('duplicate-choice', where, `選択肢 ${seen.get(k) + 1} と ${i + 1} が同じ：「${clip(textOf(c), 30)}」`); else seen.set(k, i); if (REFERS.test(textOf(c).trim())) r.warn('choice-refers', where, `ほかの選択肢を指す選択肢（並べ替えると意味が崩れる）：「${clip(textOf(c), 30)}」`); });
  if (!why || !textOf(why).trim()) r.error('no-reason', where, '理由がない');
  else if (!SECTION_LINK.test(why) && !SOURCE.test(why)) r.warn('reason-no-basis', where, `理由に根拠（節へのリンクか出典）がない：「${clip(textOf(why), 50)}」`);
  else if (!SECTION_LINK.test(why)) r.count('reasons without a section link');
}

function spread(r, where, answers, nChoices = 4, level = 'warn', why = '') {
  if (answers.length < 8) return null;
  const c = Array(nChoices).fill(0); for (const a of answers) if (a >= 0 && a < nChoices) c[a]++;
  const share = c.map(x => x / answers.length);
  const bad = share.map((s, i) => [i, s]).filter(([, s]) => s < SPREAD.min || s > SPREAD.max);
  if (bad.length) r.add(level, 'answer-position', where, `正解の位置 ${share.map((s, i) => `${'ABCD'[i]} ${(s * 100).toFixed(0)}%`).join('・')}（各 15〜35%）${why}`);
  return share;
}

// the problems of a written question's HTML: 'unbalanced' (a </b> with no <b>), 'instructions' (the next group's text)
function structure(html) {
  const s = String(html || ''), opens = (s.match(/<b\b[^>]*>/g) || []).length, closes = (s.match(/<\/b>/g) || []).length, out = [];
  if (opens !== closes || /<p>[^<]*<\/b>/.test(s)) out.push('unbalanced');
  if (/本文を閉じて|各解説の〔節番号〕/.test(s)) out.push('instructions');
  return out;
}

export async function run(env) {
  const r = new Result(meta);
  const FL = env.FL, chapterIds = new Set(FL.book.CHAPTERS.map(c => c.id));
  // the chapters' questions
  const chAnswers = [];
  for (const ch of chaptersOf(env)) (ch.quiz || []).forEach((q, i) => { oneQuestion(r, `${ch.id}.quiz[${i}]`, q.q, q.choices || [], q.answer, q.why); chAnswers.push(q.answer); });
  const share = spread(r, 'chapters (all)', chAnswers, 4, 'warn', '。章末の確認問題は並べ替えずに出す（FLIGHT LAB・TEXTBOOK）');
  if (share) r.metric('chapter questions: answer positions', share.map((s, i) => `${'ABCD'[i]} ${(s * 100).toFixed(1)}%`).join(' · '));
  // the banks
  const banks = [...((FL.quiz && FL.quiz.BANKS) || []), ...(((FL.quizJcab || FL.quizJCAB || {}).BANKS) || [])];
  if (!env.only) {
    const cadetBanks = banks.filter(b => !/^q_j/.test(b.id)), jcabBanks = banks.filter(b => /^q_j/.test(b.id));
    for (const b of banks) {
      const jcab = /^q_j/.test(b.id);
      b.qs.forEach((q, i) => {
        const where = `${b.id}[${i}]`;
        oneQuestion(r, where, q[0], q[1] || [], q[2], q[3]);
        if ((q[1] || []).length !== 4) r.error('choices-4', where, `選択肢が ${(q[1] || []).length}`);
        if (jcab) return;
        for (const [k, v] of [['q', q[0]], ...(q[1] || []).map((c, j) => [`choice ${j + 1}`, c]), ['why', q[3]]]) {
          for (const m of findRules(textOf(v)).jp) r.error('jp-law-in-cadet-bank', where, `今の 14 分野（CADET の筆記試験が読む）に日本の法令「${m.s}」（${k}）：${clip(textOf(v), 40)}`);
          for (const m of String(v).matchAll(/\{ch:([a-z0-9]+)\}/g)) {
            if (!chapterIds.has(m[1])) r.error('bank-chapter-missing', where, `{ch:${m[1]}} の章がない`);
            else if (NOT_IN_CADET(m[1])) r.error('bank-chapter-not-in-cadet', where, `{ch:${m[1]}} は CADET にない章（english・まとめ・第 7 部・intro・sim）`);
          }
        }
      });
      spread(r, b.id, b.qs.map(q => q[2]), 4, 'info', '。表示のときに並べ替える（FLIGHT LAB pages.js・CADET school.js）');
    }
    r.metric('banks (CADET-read / JCAB)', `${cadetBanks.length} / ${jcabBanks.length}`);
    r.metric('bank questions (CADET-read / JCAB)', `${cadetBanks.reduce((a, b) => a + b.qs.length, 0)} / ${jcabBanks.reduce((a, b) => a + b.qs.length, 0)}`);
    if (!jcabBanks.length) r.pending('jcab-banks', 'quiz-jcab.js', 'JCAB 形式の問題（W44）はまだない');
  }
  // written questions in the chapters
  let nWritten = 0;
  for (const ch of chaptersOf(env)) (ch.written || []).forEach((w, i) => {
    nWritten++; const [q, a] = Array.isArray(w) ? w : [w.q, w.a];
    for (const [k, v] of [['q', q], ['a', a]]) for (const bad of structure(v)) r.error(bad === 'unbalanced' ? 'written-broken-bold' : 'written-instructions', `${ch.id}.written[${i}].${k}`, bad === 'unbalanced' ? '開きタグのない </b>（見出しの崩れ）' : '次の問題群の案内文が混入');
    if (!SECTION_LINK.test(String(a || ''))) r.warn('written-no-link', `${ch.id}.written[${i}]`, '答えに根拠の節へのリンクがない');
  });
  r.metric('written questions in the chapters', nWritten);
  // the original basic course (never changed): how many of its questions the rewrite must not copy as they are
  if (!env.only) {
    let broken = 0, instr = 0;
    for (const c of kiso().chapters) for (const q of c.qa) { const b = [...structure(q.q), ...structure(q.a)]; if (b.includes('unbalanced')) broken++; if (b.includes('instructions')) instr++; }
    r.metric('the original basic course (unchanged, for reference): questions with a broken heading / with the next group\'s instructions', `${broken} / ${instr}（計 ${kiso().qa.length} 問）`);
  }
  return r;
}

await cli(import.meta.url, meta, run);
