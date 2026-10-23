// CADET — content/dialog/debrief.js : 早瀬 教官's debrief at the end of the first day (M4), in the aircraft on the stand
// with the engine stopped. It is made from the day's summary (career/day.js): the walk-around (what was found, what
// was missed, what was left undone), the radio (right the first time), the taxiing (the hold-short line), the three
// lessons (FLIGHT LAB's grades and the row furthest outside its standard), then one thing to work on, the trust
// earned, and the logbook (hook 'logbook': the game opens it, signed).
import { INSTRUCTOR } from './instructor.js';

const SPEAKERS = { instructor: { name_ja: INSTRUCTOR.title_ja, color: '#5cc8ff' }, player: { name_ja: 'あなた', color: '#f2b632' } };
export const DEBRIEF_FLAGS = ['day1_done'];
export const DEBRIEF_HOOKS = ['look', 'nod', 'logbook'];
const GRADE = { S: 'S（とても良い）', A: 'A（良い）', B: 'B（合格）', C: 'C（もう一度）', '―': '途中まで' };
const q = (s) => `「${s}」`;

// the line about one lesson: its grade and the worst row (or the best thing about it)
function lessonLine(l) {
  if (!l.done) return `${q(l.title)}は、今日は飛べませんでした。`;
  if (l.crashed) return `${q(l.title)}で、機体を壊してしまいました。何が起きたか、あとで記録を一緒に見ましょう。`;
  const bad = (l.rows || []).filter(r => !r.pass);
  const g = GRADE[l.grade] || l.grade;
  if (!bad.length) return `${q(l.title)}は ${g}。${l.grade === 'S' ? '基準の真ん中を、しっかり保てていました。' : 'すべての項目が基準の中でした。'}`;
  const r = bad[0];
  return `${q(l.title)}は ${g}。${r.name}が基準の外でした（${r.val}、基準は ${r.std}）。`;
}

export function debriefDialogs(sum) {
  const N = {}, say = (text, more = {}) => ({ speaker: 'instructor', text, ...more });
  const w = sum.walk, r = sum.radio;
  const order = ['open', 'walk', 'radio', 'taxi', ...sum.lessons.map(l => 'lesson:' + l.id), 'next', 'trust', 'sign'];
  const nx = (k) => order[order.indexOf(k) + 1];
  N.open = say('エンジン停止、お疲れさまでした。今日の 1 日を、順番に振り返りましょう。', { if: { not: { flag: 'day1_done' } }, else: 'again', hook: { name: 'look', arg: 'player' }, next: nx('open') });
  N.again = say('お疲れさまでした。今日の飛行も、順番に振り返りましょう。', { hook: { name: 'look', arg: 'player' }, next: nx('open') });
  // the walk-around
  const found = w.found, missed = w.missed.length, left = w.tasksLeft.length;
  let wl = w.anomalies === 0 ? '外部点検では、今日は異常はありませんでした。' : found === w.anomalies ? `外部点検では、${w.anomalies} つの異常を全部見つけましたね。よく見ています。` : `外部点検の異常は ${w.anomalies} つのうち ${found} つ見つけました。`;
  if (missed) wl += `見落としたのは${w.missed.map(m => q(m.name.replace(/^.*?：/, ''))).join('と')}です。小さな異常が、空の上では大きな問題になります。`;
  if (left) wl += '外し忘れたもの（係留ロープ・輪止め・カバー・ロック）もありました。最後にもう一度、機体の周りを一周して確かめましょう。';
  if (!missed && !left && w.anomalies > 0) wl += '迷わずに報告できたのも良かったです。';
  N.walk = say(wl, { hook: { name: found === w.anomalies && !missed ? 'nod' : 'look', arg: 'player' }, next: nx('walk') });
  // the radio
  const rl = r.n === 0 ? '無線は今日は使いませんでした。' : r.first === r.n ? `無線は ${r.n} 回のやりとりを、全部 1 回で正しく言えました。` :
    `無線は ${r.n} 回のうち ${r.first} 回を 1 回で正しく言えました。${r.wrong ? '言い直しになったものは、管制官の言い直しをよく聞いて覚えましょう。' : ''}${r.late ? '答えが遅れたこともありました。言うことを先に頭の中で組み立てておきます。' : ''}`;
  N.radio = say(rl, { next: nx('radio') });
  N.taxi = say(sum.crash ? `地上で、機体を障害物に当ててしまいました（${sum.crash}）。タキシーは歩くくらいの速さで、翼の先と周りをよく見て。` : sum.incursion ? 'ひとつ大事なこと。許可の前に、A1 の停止線を越えました。滑走路に入る許可がないときは、停止線の手前で必ず止まります。これは今日いちばんの反省点です。'
    : 'タキシーでは、許可のとおりに A1 の停止線の手前で止まれていました。', { hook: { name: sum.incursion ? 'look' : 'nod', arg: 'player' }, next: nx('taxi') });
  // one line a lesson (the first with the word that the lessons come now)
  sum.lessons.forEach((l, k) => { const id = 'lesson:' + l.id; N[id] = say((k ? '' : '課目です。') + lessonLine(l), { next: nx(id) }); });
  // one thing for next time
  const weak = sum.lessons.find(l => l.done && !l.passed);
  const nextTxt = sum.incursion ? '次は、停止線の前で止まる。それだけは、毎回必ず。' : weak ? `次は${q(weak.title)}をもう一度やりましょう。` : missed ? '次は、外部点検をもっとゆっくり、ひとつずつ。' : r.first < r.n ? '次は、無線の復唱を、声に出して練習しておきましょう。' : '次は、今日の課目を少し厳しい基準で飛んでみましょう。';
  N.next = say(nextTxt, { next: nx('next') });
  const t = sum.trust;
  N.trust = say(t >= 6 ? '今日はとても良い 1 日でした。この調子で行きましょう。' : t >= 0 ? '最初の 1 日としては十分です。少しずつ慣れていきましょう。' : '今日は反省点の多い 1 日でしたね。でも、ここで気づけたことが大事です。', {
    effects: [{ trust: 'instructor', add: t }, { set: 'day1_done', to: true }], hook: { name: 'nod' }, next: nx('trust') });
  N.sign = say('航空日誌に今日の飛行を書いて、署名しておきます。', { choices: [
    { text: '航空日誌を見る', next: 'bye', effects: [{ hook: 'logbook' }] },
  ] });
  N.bye = say('今日はここまで。ゆっくり休んでください。', { end: true });
  return { speakers: SPEAKERS, flags: [...DEBRIEF_FLAGS], hooks: [...DEBRIEF_HOOKS], dialogs: { debrief: { start: 'open', nodes: N } } };
}
