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
// (…and by their names alone: 機体と装備・性能と重量・重心)
const classWords = (i) => (CLASSES[i] || []).map(id => CHAPTER_SHORT[id]).join('と');
const classesDone = (st) => CLASSES.filter((_, i) => st.done && st.done[`class:${i}`]).length;
// the class today (of today's plan), or -1
const classToday = (sch) => { const c = (sch || []).find(x => x.kind === 'class'); return c ? +c.id : -1; };

// the morning: the day's chapters and its afternoon's lesson; the question missed the day before, asked again first
// (short: the cadet skips the ways — G — so the day's words are short too)
export function dayToast(st, sch, { missed = 0, short = false } = {}) {
  if (st.chapter !== 'ch1') return null;
  if (short) {
    const i = classToday(sch), off = (sch || []).some(x => x.kind === 'off');
    if (off) return (sch || []).some(x => x.kind === 'event') ? '日曜、休み。朝日さんが復習に誘っています' : '日曜、休み';
    if (i >= 0) return `今日は${classWords(i)}、午後は ${CLASS_FTD[i]}${missed ? `、前の間違い ${missed} 問` : ''}`;
    if ((sch || []).some(x => x.kind === 'exam')) return '今日は学科試験、明日は初飛行';
  }
  if ((sch || []).some(x => x.kind === 'off')) return (sch || []).some(x => x.kind === 'event')
    ? '今日は日曜、休みです。ラウンジの朝日さんが、今週の復習に誘っています（しなくてもいい）。正面入口から寮に帰れば明日になります'
    : '今日は日曜、休みです。正面入口から寮に帰れば明日になります';
  const i = classToday(sch);
  if (i >= 0) {
    const k = CLASS_FTD[i], again = missed ? `　前に間違えた ${missed} 問は、授業の最初にもう一度` : '';
    return `今日は${classShort(i)}。午後は ${k}「${FTD_TITLES[k]}」${again}（Tab で今日の予定）`;
  }
  if ((sch || []).some(x => x.kind === 'exam')) return '今日は第 1 章の学科試験（28 問、80% で合格）。明日は、いよいよ初飛行です（Tab で今日の予定）';
  if ((sch || []).some(x => x.kind === 'ftd')) { const f = sch.find(x => x.kind === 'ftd'); return `今日は訓練装置 ${f.id}「${FTD_TITLES[f.id]}」のやり直しから（Tab で今日の予定）`; }
  return null;
}
// after the class: the afternoon's lesson, and what of the morning it uses
export function afterClassToast(i) {
  const k = CLASS_FTD[i];
  return k ? `午後：訓練装置室で ${k}「${FTD_TITLES[k]}」。${FTD_USE[k]}` : '午後：訓練装置室へ';
}
// after the training device: passed, and the evening's event (or the day's end)
export function afterFtdToast(k, sch) {
  const ev = (sch || []).find(x => x.kind === 'event');
  return ev ? `${k} 合格。夜：${ev.title}` : `${k} 合格。今日の予定は終わりです`;
}
// what tomorrow brings (from what is done so far)
export function tomorrowText(st) {
  const n = classesDone(st), next = st.day + 1;
  if (st.chapter !== 'ch1') return '';
  if (isOff(next)) return '明日は日曜、休みです';
  if (n < CLASSES.length) return `明日は${classShort(n)}、午後は ${CLASS_FTD[n]}`;
  if (!(st.exams && st.exams.written1 && st.exams.written1.pass)) return '明日は学科試験、そして次の日が初飛行です';
  return '明日は、いよいよ初飛行（a1）です';
}
// (tomorrow in a few words: the skipping cadet's dorm card)
function shortTomorrow(st) {
  const n = classesDone(st);
  if (st.chapter !== 'ch1') return '';
  if (isOff(st.day + 1)) return '明日は休み';
  if (n < CLASSES.length) return `明日は${classWords(n)}`;
  return (st.exams && st.exams.written1 && st.exams.written1.pass) ? '明日は初飛行' : '明日は学科試験';
}
// the guide once today's plan is done (chapter 1): tomorrow, and the way home
export function doneLine(st) {
  const t = tomorrowText(st);
  return t ? `今日の予定は終わり。${t}。正面入口から寮に帰ると次の日になります` : null;
}
// the dorm's card: the day said back, and what the evening's study is
export function dormCard(st, sch, { short = false } = {}) {
  const i = classToday(sch), t = tomorrowText(st);
  if (short) return { title: '寮へ帰る', text: shortTomorrow(st), choices: [{ k: 1, text: 'すぐに寝る', act: 'early' }, { k: 2, text: '自習してから寝る（3 問）', act: 'late' }, { k: 3, text: 'やっぱり残る', act: 'stay' }] };
  const today = i >= 0 ? `今日は${classShort(i)}と ${CLASS_FTD[i]}。` : (sch || []).some(x => x.kind === 'exam') ? '学科試験、おつかれさまでした。' : '';
  const text = st.chapter === 'ch1' ? `${today}${t ? `${t}。` : ''}自習なら、間違えた問題と期限が来た問題を 3 問（約 3 分）。` : '今日の訓練はここまで。寮に帰って休みます。';
  return { title: '寮へ帰る', text, choices: [{ k: 1, text: 'すぐに寝る', act: 'early' }, { k: 2, text: '少し自習してから寝る（3 問・疲れが少し残る）', act: 'late' }, { k: 3, text: 'やっぱり残る', act: 'stay' }] };
}
// the evening's event of the day's plan (career/career.js CH1_EVENTS), if any
export const eventOf = (sch) => { const e = (sch || []).find(x => x.kind === 'event'); return e ? CH1_EVENTS.find(x => x.id === e.id) || null : null; };
