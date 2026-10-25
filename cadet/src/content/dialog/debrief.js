// CADET — content/dialog/debrief.js : 早瀬 教官's debrief at the end of a flying day (M4; M5: every day of chapter 2;
// on the check ride the chief instructor gives it), in the aircraft on the stand
// with the engine stopped. It is made from the day's summary (career/day.js): the walk-around (what was found, what
// was missed, what was left undone), the radio (right the first time), the taxiing (the hold-short line), the three
// lessons (FLIGHT LAB's grades and the row furthest outside its standard), then one thing to work on, the trust
// earned, and the logbook (hook 'logbook': the game opens it, signed).
// (M6) TEM: when the cadet named a threat this morning (sum.tem: { threat, named }), a line after the lessons: today's
// threat again, and the day's errors (career/tem.js errorsOf) — seen and caught, or not.
import { INSTRUCTOR } from './instructor.js';
import { errorsOf } from '../../career/tem.js';

const SPEAKERS = { instructor: { name_ja: INSTRUCTOR.title_ja, color: '#5cc8ff' }, player: { name_ja: 'あなた', color: '#f2b632' } };
export const DEBRIEF_FLAGS = ['day1_done'];
export const DEBRIEF_HOOKS = ['look', 'nod', 'logbook', 'ai'];
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

// (M7) who gives it: the instructor (every day), the chief instructor (his checks: brief and to the point, the
// standards), the examiner (the final check: the result first, few words, no praise but the facts). The lines about
// the walk-around, the radio, the taxiing and the lessons are the same facts; the opening, the TEM, the advice, the
// last word and the logbook are each one's own.
export const VOICES = {
  instructor: null,
  chief: {
    open: '審査の講評をします。結果の前に、いつもどおり、順番に見ていきます。',
    tem: (th, named) => `TEM。今日の脅威は${q(th)}。${named ? '朝、自分で挙げましたね。審査でも、それが言える人は崩れません。' : '朝の答えは違いました。審査の日ほど、脅威を先に言葉にしなさい。'}`,
    errs: (e) => `エラーは、${e}。数より、気づいてから直すまでの早さを見ています。`,
    noErr: 'エラーらしいエラーは、見当たりませんでした。',
    next: (x) => `早瀬教官に伝えておきます。${x}`,
    trust: (t) => (t >= 6 ? '基準を満たしています。手順に迷いがありませんでした。' : t >= 0 ? '基準は満たしています。ただ、余裕は、まだ少ない。' : '今日の内容では、まだ合格とは言えない所があります。早瀬教官と、もう一度。'),
    sign: '航空日誌に、審査の記録を書いて署名します。',
    bye: 'お疲れさま。今日は、よく休みなさい。',
  },
  examiner: {
    open: '審査官の講評です。結果は、最後に航空日誌で。まず、見たことを順に言います。',
    tem: (th, named) => `TEM。今日の脅威は${q(th)}。${named ? '出発前に、あなたはそれを挙げました。記録しておきます。' : '出発前の答えは違うものでした。それも記録しておきます。'}`,
    errs: (e) => `エラー：${e}。いずれも、記録に残します。`,
    noErr: '記録すべきエラーはありません。',
    next: (x) => `ひとつだけ。${x.replace(/^次は、?/, '')}`,
    trust: (t) => (t >= 6 ? '飛行は、基準の中で安定していました。' : t >= 0 ? '基準の中です。いくつか、余裕のない所がありました。' : '基準を外れた所がありました。それは、そのまま記録します。'),
    sign: '航空日誌に、審査の結果を書きます。署名は私が。',
    bye: '以上です。お疲れさまでした。',
  },
};
export function debriefDialogs(sum, { voice = 'instructor' } = {}) {
  const V = VOICES[voice] || null;
  const N = {}, say = (text, more = {}) => ({ speaker: 'instructor', text, ...more });
  const w = sum.walk, r = sum.radio;
  const order = ['open', 'walk', 'radio', 'taxi', ...(sum.fault ? ['fault'] : []), ...sum.lessons.map(l => 'lesson:' + l.id), ...(sum.tem ? ['tem'] : []), 'next', 'trust', 'sign'];
  const nx = (k) => order[order.indexOf(k) + 1];
  N.open = say('エンジン停止、お疲れさまでした。今日の 1 日を、順番に振り返りましょう。', { if: { not: { flag: 'day1_done' } }, else: 'again', hook: { name: 'look', arg: 'player' }, next: nx('open') });
  N.again = say('お疲れさまでした。今日の飛行も、順番に振り返りましょう。', { hook: { name: 'look', arg: 'player' }, next: nx('open') });
  if (V) { N.open = say(V.open, { hook: { name: 'look', arg: 'player' }, next: nx('open') }); delete N.again; }
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
  // (M7) the run-up's fault: what the cadet decided
  if (sum.fault) {
    const f = sum.fault, burnt = f.tries > 0 ? 'ミクスチャーを絞ってプラグを焼き、もう一度確かめたのも、手順どおりでした。' : '';
    N.fault = say(f.decided === 'return'
      ? `ランナップで、左のマグネトーの回転の下がり方が制限を超えていました。${burnt}離陸をやめて戻ったのは、正しい判断です。大城さんが、プラグとマグネトーを見てくれます。今日は課目を飛べませんでしたが、これも大事な訓練です。`
      : `ランナップで、左のマグネトーが制限を超えていました。${burnt}それでも離陸しようとしたのは、いけません。制限は、上空で何か起きたときの余裕を残すためにあります。超えたら、飛ばない。`,
    { hook: { name: f.decided === 'return' ? 'nod' : 'look', arg: 'player' }, next: nx('fault') });
  }
  // one line a lesson (the first with the word that the lessons come now)
  sum.lessons.forEach((l, k) => { const id = 'lesson:' + l.id; N[id] = say((k ? '' : '課目です。') + lessonLine(l), { next: nx(id) }); });
  // TEM: the threat, the errors
  if (sum.tem) {
    const errs = errorsOf(sum), th = sum.tem.threat;
    if (V) N.tem = say(V.tem(th.ja, sum.tem.named) + (errs.length ? V.errs(errs.join('、')) : V.noErr), { hook: { name: 'look', arg: 'player' }, next: nx('tem') });
    else N.tem = say(`TEM の振り返りです。今日の脅威は${q(th.ja)}でした。${sum.tem.named ? '朝、自分で挙げられましたね。だから、慌てずに対処できていました。' : '朝は別のものを挙げましたが、次は天気と自分の状態から、先に考えてみましょう。'}`
      + (errs.length ? `エラーは、${errs.join('、')}。エラーはなくせません。早く気づいて、直すことが大事です。` : 'エラーも、今日は目立つものはありませんでした。'), { hook: { name: 'look', arg: 'player' }, next: nx('tem') });
  }
  // one thing for next time
  const weak = sum.lessons.find(l => l.done && !l.passed);
  const nextTxt = sum.fault ? (sum.fault.decided === 'return' ? '次は、整備が終わった機体で、今日の課目を。' : '次は、制限を超えたら、迷わず止める。') : sum.incursion ? '次は、停止線の前で止まる。それだけは、毎回必ず。' : weak ? `次は${q(weak.title)}をもう一度やりましょう。` : missed ? '次は、外部点検をもっとゆっくり、ひとつずつ。' : r.first < r.n ? '次は、無線の復唱を、声に出して練習しておきましょう。' : '次は、今日の課目を少し厳しい基準で飛んでみましょう。';
  N.next = say(V ? V.next(nextTxt) : nextTxt, { next: nx('next') });
  const t = sum.trust;
  N.trust = say(V ? V.trust(t) : t >= 6 ? '今日はとても良い 1 日でした。この調子で行きましょう。' : t >= 0 ? '大事なところは押さえられています。少しずつ、余裕を増やしていきましょう。' : '今日は反省点の多い 1 日でしたね。でも、ここで気づけたことが大事です。', {
    effects: [{ trust: 'instructor', add: t }, { set: 'day1_done', to: true }], hook: { name: 'nod' }, next: nx('trust') });
  N.sign = say(V ? V.sign : '航空日誌に今日の飛行を書いて、署名しておきます。', { choices: [
    { text: '航空日誌を見る', next: 'bye', effects: [{ hook: 'logbook' }] },
    // (M8) a free question about the day, to the AI instructor (only while the setting is on: ctx ai.on)
    { text: '今日の飛行について質問したい', if: { ctx: 'ai.on', is: true }, next: 'free' },
  ] });
  N.free = say(V ? 'どうぞ。' : 'いいですよ。今日の飛行のことなら、何でも。', { hook: { name: 'ai', arg: 'debrief' }, next: 'sign' });
  N.bye = say(V ? V.bye : '今日はここまで。ゆっくり休んでください。', { end: true });
  return { speakers: SPEAKERS, flags: [...DEBRIEF_FLAGS], hooks: [...DEBRIEF_HOOKS], dialogs: { debrief: { start: 'open', nodes: N } } };
}
