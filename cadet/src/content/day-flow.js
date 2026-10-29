// CADET — content/day-flow.js : what the day says around its work in chapter 1 — the morning's word (the toast after the
// day's card), the word after the class and after the training device, the guide's line once the plan is done, the
// dorm's card — each with the day's own: its chapters, its afternoon's lesson, its evening's event, what tomorrow
// brings, a question missed the day before (the brief's §7: no wording comes back on 3 days). main.js says them;
// tools/measure-ch1.mjs counts them the same way. Pure: it reads the career's state and today's plan.
import { CLASSES, CLASS_FTD, FTD_TITLES, CH1_EVENTS, CHAPTER_SHORT, classShort, isOff } from '../career/career.js';

// what each afternoon's lesson does with the morning's class
export const FTD_USE = { k1: '午前の 4 つの力が、計器でどう見えるかを見ます', k2: 'ピトー静圧から来る速度と高度を読みます', k3: '第 7 章の言い方で答えます',
  k4: 'LAB の初飛行の交信を、机の上で飛びます', k5: '第 8 章の復唱の型で答えます', k6: '英語の指示から、自分あてのものを聞き取ります' };
// (the class's chapters by their numbers alone: 第 2・3 章)
const N_OF = { aero: 1, sys: 2, perf: 3, wx: 4, law: 5, radio1: 6, radio2: 7, radio3: 8, radio4: 9, radio5: 10, hf: 11 };
const classNums = (i) => `第 ${(CLASSES[i] || []).map(id => N_OF[id]).join('・')} 章`;
// (…and by their names alone: 機体と装備・性能と重量・重心 — the day's words that must keep to one line)
const classWords = (i) => (CLASSES[i] || []).map(id => CHAPTER_SHORT[id]).join('・');
const classesDone = (st) => CLASSES.filter((_, i) => st.done && st.done[`class:${i}`]).length;
// the class today (of today's plan), or -1
const classToday = (sch) => { const c = (sch || []).find(x => x.kind === 'class'); return c ? +c.id : -1; };
// the device lesson of today's plan (the first not passed: after a lesson not passed, not the class's own), or null
const ftdToday = (sch) => { const f = (sch || []).find(x => x.kind === 'ftd'); return f ? f.id : null; };
const passed1 = (st) => !!(st.exams && st.exams.written1 && st.exams.written1.pass);

// the morning: the day's chapters and its afternoon's lesson; the question missed the day before, asked again first
// (short: the cadet skips the ways — G — so the day's words are short too)
export function dayToast(st, sch, { missed = 0, short = false } = {}) {
  if (st.chapter !== 'ch1') return null;
  if (short) {
    const i = classToday(sch), off = (sch || []).some(x => x.kind === 'off');
    if (off) return (sch || []).some(x => x.kind === 'event') ? '日曜、休み。朝日さんが復習に誘っています' : '日曜、休み';
    if (i >= 0) { const k = ftdToday(sch); return `今日は${classWords(i)}${k ? `、午後は ${k}` : ''}${missed ? `、前の間違い ${missed} 問` : ''}`; }
    if ((sch || []).some(x => x.kind === 'exam')) return `今日は学科試験、${isOff(st.day + 1) ? '初飛行は休みの次の日' : '明日は初飛行'}`;
  }
  if ((sch || []).some(x => x.kind === 'off')) return (sch || []).some(x => x.kind === 'event')
    ? '今日は日曜、休みです。ラウンジの朝日さんが、今週の復習に誘っています（しなくてもいい）。正面入口から寮に帰れば明日になります'
    : '今日は日曜、休みです。正面入口から寮に帰れば明日になります';
  const i = classToday(sch);
  if (i >= 0) {
    // (a question missed before: said instead of the tablet's hint — one line still; the afternoon's the plan's)
    const k = ftdToday(sch), pm = k ? `午後は ${k}「${FTD_TITLES[k]}」` : '';
    // (the hints — Tab for the plan — on the first days only: after them the cadet knows)
    return missed ? `今日は${classWords(i)}${pm ? `、${pm}` : ''}。前の間違い ${missed} 問は、授業の最初に` : `今日は${classShort(i)}。${pm || '午後の訓練装置はありません'}${st.day <= 3 ? '（Tab で今日の予定）' : ''}`;
  }
  if ((sch || []).some(x => x.kind === 'exam')) return `今日は第 1 章の学科試験（30 問、80% で合格）。${isOff(st.day + 1) ? '合格すれば、休みの次の日が初飛行です' : '明日は、いよいよ初飛行です'}（Tab で今日の予定）`;
  if ((sch || []).some(x => x.kind === 'ftd')) { const f = sch.find(x => x.kind === 'ftd'); return `今日は訓練装置 ${f.id}「${FTD_TITLES[f.id]}」のやり直しから（Tab で今日の予定）`; }
  return null;
}
// after the class: the afternoon's lesson of today's plan (sch), and what of the morning it uses when it is the class's
// own; none, the evening's event
export function afterClassToast(i, sch) {
  const k = sch ? ftdToday(sch) : CLASS_FTD[i], ev = (sch || []).find(x => x.kind === 'event');
  if (!k) return ev ? `午後の訓練装置はありません。夜：${ev.title}` : '今日の予定は、授業までです';
  return k === CLASS_FTD[i] ? `午後：訓練装置室で ${k}「${FTD_TITLES[k]}」。${FTD_USE[k]}` : `午後：訓練装置室で ${k}「${FTD_TITLES[k]}」をもう一度`;
}
// after the training device: passed, and the evening's event (or the day's end)
export function afterFtdToast(k, sch) {
  const ev = (sch || []).find(x => x.kind === 'event');
  return ev ? `${k} 合格。夜：${ev.title}` : `${k} 合格。今日の予定は終わりです`;
}
// what tomorrow brings (from what is done so far). nextFtd: the first device lesson not passed (career/career.js
// schedule() gives it tomorrow) — null: all passed; left out: the next class's own
export function tomorrowText(st, { nextFtd } = {}) {
  const n = classesDone(st), next = st.day + 1, k = nextFtd === undefined ? CLASS_FTD[n] : nextFtd;
  if (st.chapter !== 'ch1') return '';
  if (isOff(next)) return '明日は日曜、休みです';
  if (n < CLASSES.length) return `明日は${classWords(n)}${k ? `、午後は ${k}` : ''}`;
  if (k) return `明日は訓練装置 ${k} のやり直し、そのあとが学科試験です`;
  if (!passed1(st)) return isOff(st.day + 2) ? '明日は学科試験です' : '明日は学科試験、そして次の日が初飛行です';
  return '明日は、いよいよ初飛行（a1）です';
}
// the first day's words (the prologue: its morning, then after the welcome, the tour and the meeting); short: the
// cadet skips the ways, or begins a career after another
export const PROLOGUE_WORDS = {
  morning: ['入社の日です。ロビーで、主任教官の話が始まります', '入社の日。ロビーで主任教官の話'],
  ceremony: ['運航管理の佐伯さんが、訓練所を案内してくれます（ロビーの北、運航管理）', '案内：運航管理へ'],
  tour: ['午後：ブリーフィング室 1 で、担当の早瀬 教官と顔合わせです', '午後：ブリーフィング室 1'],
  meet: ['夕方です。ラウンジで同期と話してみましょう。今日を終えるときは、正面入口から寮へ', '夕方：寮へは正面入口から'],
  // (back from the introductory flight, at the lobby's apron doors)
  intro: ['空から戻りました。夕方です。ラウンジで同期と話せます。今日を終えるときは、正面入口から寮へ', '夕方：寮へは正面入口から'],
};
export const prologueWord = (k, { short = false } = {}) => PROLOGUE_WORDS[k][short ? 1 : 0];
// (tomorrow in a few words: the skipping cadet's dorm card)
function shortTomorrow(st, { nextFtd } = {}) {
  const n = classesDone(st);
  if (st.chapter === 'prologue') return `明日から座学（${classWords(0)}）`;
  if (st.chapter !== 'ch1') return '';
  if (isOff(st.day + 1)) return '明日は休み';
  if (n < CLASSES.length) return `明日は${classWords(n)}`;
  if (nextFtd) return `明日は ${nextFtd} のやり直し`;
  return passed1(st) ? '明日は初飛行' : '明日は学科試験';
}
// the guide once today's plan is done (chapter 1): tomorrow, and the way home — the way said on the first two days
// only (the guide's mark shows it after them: the same sentence every evening is the repetition the cadet tires of)
export function doneLine(st, o = {}) {
  const t = tomorrowText(st, o);
  if (!t) return null;
  return st.day <= 2 ? `今日の予定は終わり。${t}。正面入口から寮に帰ると次の日になります` : `今日の予定は終わり、${t}`;
}
// the dorm's card: the day said back, and what the evening's study is
export function dormCard(st, sch, { short = false, nextFtd } = {}) {
  const i = classToday(sch), t = tomorrowText(st, { nextFtd }), k = ftdToday(sch);
  // (no class done yet — the first day — nothing to study: to bed, or stay)
  if (!classesDone(st) && (st.chapter === 'prologue' || st.chapter === 'ch1')) return { title: '寮へ帰る', text: short ? shortTomorrow(st) : `${t || '明日から座学です'}。今日はゆっくり休みましょう。`, choices: [{ k: 1, text: '寝る', act: 'early' }, { k: 2, text: 'やっぱり残る', act: 'stay' }] };
  if (short) return { title: '寮へ帰る', text: shortTomorrow(st, { nextFtd }) || '今日の訓練はここまで', choices: [{ k: 1, text: 'すぐに寝る', act: 'early' }, { k: 2, text: st.chapter === 'ch1' ? '自習してから寝る（3 問）' : '自習してから寝る', act: 'late' }, { k: 3, text: 'やっぱり残る', act: 'stay' }] };
  const today = i >= 0 ? `今日は${classWords(i)}${k ? `と ${k}` : ''}。` : (sch || []).some(x => x.kind === 'exam') ? '学科試験、おつかれさまでした。' : '';
  // (what the study is: said the first two evenings with a class done — not on Sunday's; then the choice's own words
  // say it)
  const study = classesDone(st) <= 2 && !isOff(st.day) ? '自習なら、間違えた問題と期限が来た問題を 3 問（約 3 分）。' : '';
  const text = st.chapter === 'ch1' ? `${today}${t ? `${t}。` : ''}${study}` : '今日の訓練はここまで。寮に帰って休みます。';
  // (the study's 3 questions are chapter 1's; after it, a late night, as before)
  return { title: '寮へ帰る', text, choices: [{ k: 1, text: 'すぐに寝る', act: 'early' }, { k: 2, text: st.chapter === 'ch1' ? '少し自習してから寝る（3 問・疲れが少し残る）' : '少し自習してから寝る（疲れが残る）', act: 'late' }, { k: 3, text: 'やっぱり残る', act: 'stay' }] };
}
// the evening's event of the day's plan (career/career.js CH1_EVENTS), if any
export const eventOf = (sch) => { const e = (sch || []).find(x => x.kind === 'event'); return e ? CH1_EVENTS.find(x => x.id === e.id) || null : null; };
