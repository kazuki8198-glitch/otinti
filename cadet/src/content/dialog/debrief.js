// CADET — content/dialog/debrief.js : 早瀬 教官's debrief at the end of a flying day (M4; M5: every day of chapter 2;
// on the check ride the chief instructor gives it), in the aircraft on the stand
// with the engine stopped. It is made from the day's summary (career/day.js): the walk-around (what was found, what
// was missed, what was left undone), the radio (right the first time), the taxiing (the hold-short line), the three
// lessons (FLIGHT LAB's grades and the row furthest outside its standard), then one thing to work on, the trust
// earned, and the logbook (hook 'logbook': the game opens it, signed).
// (M6) TEM: when the cadet named a threat this morning (sum.tem: { threat, named }), a line after the lessons: today's
// threat again, and the day's errors (career/tem.js errorsOf) — seen and caught, or not.
import { INSTRUCTOR } from './instructor.js';
import { errorsOf, errorsOfEn } from '../../career/tem.js';

const SPEAKERS = { instructor: { name_ja: INSTRUCTOR.title_ja, color: '#5cc8ff' }, player: { name_ja: 'あなた', color: '#f2b632' } };
export const DEBRIEF_FLAGS = ['day1_done'];
export const DEBRIEF_HOOKS = ['look', 'nod', 'logbook', 'ai'];
const GRADE = { S: 'S（とても良い）', A: 'A（良い）', B: 'B（合格）', C: 'C（もう一度）', '―': '途中まで' };
const q = (s) => `「${s}」`;
// (M8) the crew in English: every line here has its English too (en), the course's own words kept in quotes
const GRADE_EN = { S: 'S (excellent)', A: 'A (good)', B: 'B (pass)', C: 'C (again)', '―': 'partway' };
const qe = (s) => `“${s}”`;
function lessonLineEn(l) {
  if (!l.done) return `${qe(l.title)} couldn't be flown today.`;
  if (l.crashed) return `In ${qe(l.title)} the aircraft was damaged. We'll look at the record together later to see what happened.`;
  const bad = (l.rows || []).filter(r => !r.pass);
  const g = GRADE_EN[l.grade] || l.grade;
  if (!bad.length) return `${qe(l.title)}: ${g}. ${l.grade === 'S' ? 'You held the middle of the standard well.' : 'Every item was within the standard.'}`;
  const r = bad[0];
  // (the value and the standard as the course writes them: FLIGHT LAB's rows say them in Japanese)
  return `${qe(l.title)}: ${g}. ${qe(r.name)} was outside the standard (${qe(r.val)}${r.std ? `; the standard is ${qe(r.std)}` : ''}).`;
}

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
    en: {
      open: 'Here is the check debrief. Before the result, we go through it in order, as always.',
      tem: (th, named) => `TEM. Today's threat was ${qe(th)}. ${named ? 'You named it yourself this morning. People who can say that on a check don\'t fall apart.' : 'Your answer this morning was different. On a check day above all, put the threat into words first.'}`,
      errs: (e) => `The errors: ${e}. I look less at how many than at how quickly you notice them and put them right.`,
      noErr: 'I saw no errors to speak of.',
      next: (x) => `I'll pass it on to Mr. Hayase. ${x}`,
      trust: (t) => (t >= 6 ? 'You meet the standard. No hesitation in your procedures.' : t >= 0 ? 'You meet the standard. But there is still little margin.' : 'From today\'s flight, there are parts I can\'t call a pass yet. Once more, with Mr. Hayase.'),
      sign: 'I\'ll write the check in your logbook and sign it.',
      bye: 'Well done. Rest well today.',
    },
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
    en: {
      open: 'The examiner\'s debrief. The result comes last, in your logbook. First, what I saw, in order.',
      tem: (th, named) => `TEM. Today's threat: ${qe(th)}. ${named ? 'You named it before departure. Noted.' : 'Before departure you named something else. That is noted too.'}`,
      errs: (e) => `Errors: ${e}. All of them go on the record.`,
      noErr: 'No errors to record.',
      next: (x) => { const y = x.replace(/^Next time, /, ''); return `Just one thing. ${y.charAt(0).toUpperCase()}${y.slice(1)}`; },
      trust: (t) => (t >= 6 ? 'The flight was steady, within the standard.' : t >= 0 ? 'Within the standard. There were a few places with little margin.' : 'There were places outside the standard. They go on the record as they are.'),
      sign: 'I\'ll write the check result in your logbook. I\'ll sign it.',
      bye: 'That is all. Thank you.',
    },
  },
};
export function debriefDialogs(sum, { voice = 'instructor' } = {}) {
  const V = VOICES[voice] || null, VE = V ? V.en : null;
  const N = {}, say = (text, en, more = {}) => ({ speaker: 'instructor', text, en, ...more });
  const w = sum.walk, r = sum.radio;
  const order = ['open', 'walk', 'radio', 'taxi', ...(sum.fault ? ['fault'] : []), ...sum.lessons.map(l => 'lesson:' + l.id), ...(sum.tem ? ['tem'] : []), 'next', 'trust', 'sign'];
  const nx = (k) => order[order.indexOf(k) + 1];
  N.open = say('エンジン停止、お疲れさまでした。今日の 1 日を、順番に振り返りましょう。', 'Engine off. Well done. Let\'s go over today, step by step.', { if: { not: { flag: 'day1_done' } }, else: 'again', hook: { name: 'look', arg: 'player' }, next: nx('open') });
  N.again = say('お疲れさまでした。今日の飛行も、順番に振り返りましょう。', 'Well done. Let\'s go over today\'s flight, step by step.', { hook: { name: 'look', arg: 'player' }, next: nx('open') });
  if (V) { N.open = say(V.open, VE.open, { hook: { name: 'look', arg: 'player' }, next: nx('open') }); delete N.again; }
  // the walk-around
  const found = w.found, missed = w.missed.length, left = w.tasksLeft.length;
  let wl = w.anomalies === 0 ? '外部点検では、今日は異常はありませんでした。' : found === w.anomalies ? `外部点検では、${w.anomalies} つの異常を全部見つけましたね。よく見ています。` : `外部点検の異常は ${w.anomalies} つのうち ${found} つ見つけました。`;
  let we = w.anomalies === 0 ? 'On the walk-around there was nothing wrong today.' : found === w.anomalies ? `On the walk-around you found all ${w.anomalies} problems. You look carefully.` : `On the walk-around you found ${found} of the ${w.anomalies} problems.`;
  if (missed) {
    wl += `見落としたのは${w.missed.map(m => q(m.name.replace(/^.*?：/, ''))).join('と')}です。小さな異常が、空の上では大きな問題になります。`;
    we += ` You missed ${w.missed.map(m => qe(m.name.replace(/^.*?：/, ''))).join(' and ')}. A small problem on the ground becomes a big one in the air.`;
  }
  if (left) { wl += '外し忘れたもの（係留ロープ・輪止め・カバー・ロック）もありました。最後にもう一度、機体の周りを一周して確かめましょう。'; we += ' Some things were left on (tie-downs, chocks, covers, locks). Walk round the aircraft once more at the end.'; }
  if (!missed && !left && w.anomalies > 0) { wl += '迷わずに報告できたのも良かったです。'; we += ' Reporting without hesitating was good too.'; }
  N.walk = say(wl, we, { hook: { name: found === w.anomalies && !missed ? 'nod' : 'look', arg: 'player' }, next: nx('walk') });
  // the radio
  const rl = r.n === 0 ? '無線は今日は使いませんでした。' : r.first === r.n ? `無線は ${r.n} 回のやりとりを、全部 1 回で正しく言えました。` :
    `無線は ${r.n} 回のうち ${r.first} 回を 1 回で正しく言えました。${r.wrong ? '言い直しになったものは、管制官の言い直しをよく聞いて覚えましょう。' : ''}${r.late ? '答えが遅れたこともありました。言うことを先に頭の中で組み立てておきます。' : ''}`;
  const re = r.n === 0 ? 'We didn\'t use the radio today.' : r.first === r.n ? `On the radio you got all ${r.n} exchanges right the first time.` :
    `On the radio you got ${r.first} of ${r.n} right the first time.${r.wrong ? ' For the ones you had to say again, listen to how the controller put it, and learn it.' : ''}${r.late ? ' Some answers were late. Put together what you\'ll say in your head first.' : ''}`;
  N.radio = say(rl, re, { next: nx('radio') });
  N.taxi = say(sum.crash ? `地上で、機体を障害物に当ててしまいました（${sum.crash}）。タキシーは歩くくらいの速さで、翼の先と周りをよく見て。` : sum.incursion ? 'ひとつ大事なこと。許可の前に、A1 の停止線を越えました。滑走路に入る許可がないときは、停止線の手前で必ず止まります。これは今日いちばんの反省点です。'
    : 'タキシーでは、許可のとおりに A1 の停止線の手前で止まれていました。',
  sum.crash ? `On the ground, the aircraft hit an obstacle (${qe(sum.crash)}). Taxi at walking pace, and watch your wingtips and around you.` : sum.incursion ? 'One important thing: you crossed the hold line at A1 before you were cleared. Without a clearance onto the runway, always stop short of the hold line. That is today\'s biggest lesson.'
    : 'On the taxi you stopped short of the hold line at A1, as cleared.', { hook: { name: sum.incursion ? 'look' : 'nod', arg: 'player' }, next: nx('taxi') });
  // (M7) the run-up's fault: what the cadet decided
  if (sum.fault) {
    const f = sum.fault, burnt = f.tries > 0 ? 'ミクスチャーを絞ってプラグを焼き、もう一度確かめたのも、手順どおりでした。' : '';
    const burntEn = f.tries > 0 ? 'Leaning to burn the plugs clean and checking again was by the book, too. ' : '';
    N.fault = say(f.decided === 'return'
      ? `ランナップで、左のマグネトーの回転の下がり方が制限を超えていました。${burnt}離陸をやめて戻ったのは、正しい判断です。大城さんが、プラグとマグネトーを見てくれます。今日は課目を飛べませんでしたが、これも大事な訓練です。`
      : `ランナップで、左のマグネトーが制限を超えていました。${burnt}それでも離陸しようとしたのは、いけません。制限は、上空で何か起きたときの余裕を残すためにあります。超えたら、飛ばない。`,
    f.decided === 'return'
      ? `At the run-up, the left magneto's rpm drop was past its limit. ${burntEn}Stopping and coming back was the right decision. Mr. Oshiro will check the plugs and the magneto. We couldn't fly the lessons today, but this is important training too.`
      : `At the run-up, the left magneto was past its limit. ${burntEn}Still trying to take off was wrong. Limits leave a margin for when something happens up there. Past a limit, we don't fly.`,
    { hook: { name: f.decided === 'return' ? 'nod' : 'look', arg: 'player' }, next: nx('fault') });
  }
  // one line a lesson (the first with the word that the lessons come now)
  sum.lessons.forEach((l, k) => { const id = 'lesson:' + l.id; N[id] = say((k ? '' : '課目です。') + lessonLine(l), (k ? '' : 'The lessons. ') + lessonLineEn(l), { next: nx(id) }); });
  // TEM: the threat, the errors
  if (sum.tem) {
    const errs = errorsOf(sum), errsEn = errorsOfEn(sum), th = sum.tem.threat, thEn = (th.en && th.en.threat) || th.ja;
    if (V) N.tem = say(V.tem(th.ja, sum.tem.named) + (errs.length ? V.errs(errs.join('、')) : V.noErr), `${VE.tem(thEn, sum.tem.named)} ${errsEn.length ? VE.errs(errsEn.join(', ')) : VE.noErr}`, { hook: { name: 'look', arg: 'player' }, next: nx('tem') });
    else {
      N.tem = say(`TEM の振り返りです。今日の脅威は${q(th.ja)}でした。${sum.tem.named ? '朝、自分で挙げられましたね。だから、慌てずに対処できていました。' : '朝は別のものを挙げましたが、次は天気と自分の状態から、先に考えてみましょう。'}`
        + (errs.length ? `エラーは、${errs.join('、')}。エラーはなくせません。早く気づいて、直すことが大事です。` : 'エラーも、今日は目立つものはありませんでした。'),
      `TEM review. Today's threat was ${qe(thEn)}. ${sum.tem.named ? 'You named it yourself this morning, so you could deal with it calmly.' : 'This morning you named something else; next time, think first from the weather and how you feel.'}`
        + (errsEn.length ? ` The errors: ${errsEn.join(', ')}. Errors can't be eliminated; noticing them early and putting them right is what matters.` : ' No errors stood out today either.'), { hook: { name: 'look', arg: 'player' }, next: nx('tem') });
    }
  }
  // one thing for next time
  const weak = sum.lessons.find(l => l.done && !l.passed);
  const nextTxt = sum.fault ? (sum.fault.decided === 'return' ? '次は、整備が終わった機体で、今日の課目を。' : '次は、制限を超えたら、迷わず止める。') : sum.incursion ? '次は、停止線の前で止まる。それだけは、毎回必ず。' : weak ? `次は${q(weak.title)}をもう一度やりましょう。` : missed ? '次は、外部点検をもっとゆっくり、ひとつずつ。' : r.first < r.n ? '次は、無線の復唱を、声に出して練習しておきましょう。' : '次は、今日の課目を少し厳しい基準で飛んでみましょう。';
  const nextEn = sum.fault ? (sum.fault.decided === 'return' ? 'Next time, today\'s lessons, on an aircraft maintenance has signed off.' : 'Next time, past a limit, stop without a second thought.') : sum.incursion ? 'Next time, stop before the hold line. Every time, without fail.' : weak ? `Next time, let's fly ${qe(weak.title)} again.` : missed ? 'Next time, the walk-around more slowly, one item at a time.' : r.first < r.n ? 'Next time, practise your read-backs out loud beforehand.' : 'Next time, let\'s fly today\'s lesson to a stricter standard.';
  N.next = say(V ? V.next(nextTxt) : nextTxt, V ? VE.next(nextEn) : nextEn, { next: nx('next') });
  const t = sum.trust;
  N.trust = say(V ? V.trust(t) : t >= 6 ? '今日はとても良い 1 日でした。この調子で行きましょう。' : t >= 0 ? '大事なところは押さえられています。少しずつ、余裕を増やしていきましょう。' : '今日は反省点の多い 1 日でしたね。でも、ここで気づけたことが大事です。',
    V ? VE.trust(t) : t >= 6 ? 'A very good day today. Keep it up.' : t >= 0 ? 'You have the important things down. Let\'s build a little more margin, step by step.' : 'A day with a lot to think about. But noticing it here is what matters.', {
      effects: [{ trust: 'instructor', add: t }, { set: 'day1_done', to: true }], hook: { name: 'nod' }, next: nx('trust') });
  N.sign = say(V ? V.sign : '航空日誌に今日の飛行を書いて、署名しておきます。', V ? VE.sign : 'I\'ll write today\'s flight in your logbook and sign it.', { choices: [
    { text: '航空日誌を見る', next: 'bye', effects: [{ hook: 'logbook' }] },
    // (M8) a free question about the day, to the AI instructor (only while the setting is on: ctx ai.on); his own
    // debrief only (the AI instructor is 早瀬 教官: the chief and the examiner do not take it)
    ...(V ? [] : [{ text: '今日の飛行について質問したい', if: { ctx: 'ai.on', is: true }, next: 'free' }]),
  ] });
  if (!V) N.free = say('いいですよ。今日の飛行のことなら、何でも。', 'Sure. Anything about today\'s flight.', { hook: { name: 'ai', arg: 'debrief' }, next: 'sign' });
  N.bye = say(V ? V.bye : '今日はここまで。ゆっくり休んでください。', V ? VE.bye : 'That\'s all for today. Get some good rest.', { end: true });
  return { speakers: SPEAKERS, flags: [...DEBRIEF_FLAGS], hooks: DEBRIEF_HOOKS.filter(h => !V || h !== 'ai'), dialogs: { debrief: { start: 'open', nodes: N } } };
}
