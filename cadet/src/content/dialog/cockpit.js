// CADET — content/dialog/cockpit.js : what 早瀬 教官 (fictional) says in the aircraft. 'board' runs once the player
// has sat down in the left seat: belts and door, today's lessons, then the choice — the whole day (the start, the
// radio, the taxi, t1 → a2 → t3, back to the stand: M4) at one of three levels, one lesson alone from the training
// area, a free flight from the apron, or getting out again. The choice reaches the game as the hook 'fly' (arg
// 'day:<level>' | '<level>' | 'free' | 'leave'); the game acts on it when the talk ends. The day's two questions in
// the air (to the practice area and back: content/dialog/day1.js) are in the same data ('transit', 'return').
// In flight the instructor speaks the lesson's own instructions (FLIGHT LAB's school) through flightLine(), which says
// the controls' names instead of the keyboard keys, and comments on the result with debriefLine().
import { INSTRUCTOR, speakable, polite } from './instructor.js';
import { dayDialogs } from './day1.js';

const SPEAKERS = { instructor: { name_ja: INSTRUCTOR.title_ja, color: '#5cc8ff' }, player: { name_ja: 'あなた', color: '#f2b632' } };
export const COCKPIT_FLAGS = ['briefed_today'];
export const COCKPIT_HOOKS = ['look', 'nod', 'point', 'fly', 'go'];
export const FLY_CHOICES = ['day:intro', 'day:basic', 'day:precision', 'intro', 'basic', 'precision', 'free', 'leave'];

const lessonsOf = (FL) => (FL.syllabus && Array.isArray(FL.syllabus.STAGES) ? FL.syllabus.STAGES.flatMap(s => s.lessons || []) : []);
const q = (s) => `「${s}」`;

// lessonId: the lesson flown on its own (from the practice area); day: today's lessons in order (the whole day)
export function cockpitDialogs(FL, { lessonId = 'a2', day = ['t1', 'a2', 't3'] } = {}) {
  const all = lessonsOf(FL), lesson = all.find(l => l.id === lessonId);
  if (!lesson) throw new Error(`cockpitDialogs: no lesson "${lessonId}" in FLIGHT LAB's syllabus`);
  const dayTitles = day.map(id => { const l = all.find(x => x.id === id); if (!l) throw new Error(`cockpitDialogs: no lesson "${id}"`); return l.title; });
  const levels = FL.school && Array.isArray(FL.school.LEVELS) ? FL.school.LEVELS : [];
  const lv = (id) => levels.find(l => l.id === id) || { name: id };
  const say = (text, more = {}) => ({ speaker: 'instructor', text, ...more });
  const levelChoices = (prefix, next) => [
    { text: `${lv('intro').name}（基準がゆるやか）`, next, effects: [{ hook: 'fly', arg: prefix + 'intro' }] },
    { text: `${lv('basic').name}`, next, effects: [{ hook: 'fly', arg: prefix + 'basic' }] },
    { text: `${lv('precision').name}（基準がきびしい）`, next, effects: [{ hook: 'fly', arg: prefix + 'precision' }] },
  ];
  const B = {};
  B.seat = say('シートベルトは締めましたか。……はい、ドアもロックしました。', { hook: { name: 'look', arg: 'player' }, next: 'today' });
  B.today = say(`今日は${dayTitles.map(q).join('、')}。離陸して訓練空域で練習し、戻って着陸します。ブリーフィングのとおりにやってみましょう。`, {
    if: { flag: 'briefed_today' }, else: 'today:new', hook: { name: 'nod' }, next: 'menu' });
  B['today:new'] = say(`ブリーフィングはまだでしたね。今日は${dayTitles.map(q).join('、')}です。離陸して訓練空域で練習し、戻って着陸します。飛びながら説明します。`, { next: 'menu' });
  B.menu = say('どうしますか。', { hook: { name: 'point', arg: 'panel' }, choices: [
    { text: '今日の 1 日を通して飛ぶ（エンジン始動から駐機まで）', next: 'day' },
    { text: `課目だけ飛ぶ（${q(lesson.title)}を訓練空域から）`, next: 'lesson' },
    { text: '駐機場から自由に飛ぶ', next: 'free', effects: [{ hook: 'fly', arg: 'free' }] },
    { text: 'やっぱり降ります', next: 'leave', effects: [{ hook: 'fly', arg: 'leave' }] },
  ] });
  B.day = say('基準のきびしさ（レベル）はどうしますか。3 つの課目とも、同じレベルで採点します。', { choices: levelChoices('day:', 'dayGo') });
  B.dayGo = say('わかりました。では、エンジン始動前の点検から始めましょう。', { hook: { name: 'nod' }, end: true });
  B.lesson = say('課目は、訓練空域に着いたところから始めます。レベルはどうしますか。', { choices: levelChoices('', 'go') });
  B.go = say('わかりました。では、訓練空域へ向かいます。', { hook: { name: 'nod' }, end: true });
  B.free = say('わかりました。エンジンをかけますね。', { next: 'free:2' });
  B['free:2'] = say('地上では、足のペダルで向きを変えます。止まるときはブレーキです。動き出す前に、パーキングブレーキを外してください。', { hook: { name: 'point', arg: 'pedals' }, next: 'free:3' });
  B['free:3'] = say('滑走路 36 から離陸して、場周を一周してみましょう。わからないことがあれば、いつでも聞いてください。', { hook: { name: 'look', arg: 'player' }, end: true });
  B.leave = say('わかりました。準備ができたら、また乗ってください。', { hook: { name: 'nod' }, end: true });
  const D = dayDialogs();
  return { speakers: SPEAKERS, flags: [...COCKPIT_FLAGS], hooks: [...COCKPIT_HOOKS], dialogs: { board: { start: 'seat', nodes: B }, ...D.dialogs } };
}

// ---- in flight ----

// FLIGHT LAB's keys → what the instructor calls the control (the panel on screen still shows the keys)
const KEYWORD = [
  [/\s*[（(]\s*R\s*長押し\s*[）)]/g, ''],
  [/W\s*[/／]\s*S\s*で/g, '機首の上げ下げで'], [/S\s*[/／]\s*W\s*で/g, '機首の上げ下げで'],
  [/A\s*[/／]\s*D\s*で/g, '操縦輪を傾けて'], [/Q\s*[/／]\s*E\s*で/g, 'ラダーで'],
  [/R\s*[/／]\s*F\s*で/g, 'スロットルで'],
  [/(?<![A-Za-z0-9-])B\s*を押したまま/g, 'ブレーキを踏んだまま'], [/(?<![A-Za-z0-9-])B\s*を/g, 'ブレーキを'],
  [/[（(][^（）()]*\b[WASDQERFTVBGLUZX]\b[^（）()]*を(?:軽く|少し)?[^（）()]*[）)]/g, ''],   // （W を軽く）
];
// said, as everything he says, with です / ます (保つ → 保ちます); a sentence that ends in an action (…10 秒観察) is
// something to do (観察します), not a name
const ACT_END = /(観察|確認|上昇|降下|旋回|減速|加速|離陸|着陸|接地|復唱|点検|保持)です。$/;
export function flightLine(text) {
  let s = String(text ?? '');
  for (const [re, to] of KEYWORD) s = s.replace(re, to);
  s = speakable(s).replace(/\s+/g, ' ').trim();
  return s.split(/(?<=[。！？])/).map(x => x.trim()).filter(Boolean)
    .map(x => polite(/[。！？]$/.test(x) ? x : x + '。').replace(ACT_END, '$1します。')).join('');
}

// the first words after a lesson, by its result (a summary from the flight bridge's status())
export function debriefLine(st) {
  if (!st) return '';
  if (st.crashed) return '……大丈夫ですか。今日はここまでにしましょう。何が起きたか、地上で一緒に振り返りましょう。';
  if (!st.done) return '';
  if (st.grade === '―') return '今日はここまでにしましょう。続きは、また次に。';
  if (st.passed && st.grade === 'S') return 'お見事です。基準の中に、しっかり収まっていました。';
  if (st.passed) return '合格です。よくできました。次は、もう少し基準の真ん中を狙ってみましょう。';
  return '惜しかったですね。どこでずれたか、結果を一緒に見てみましょう。';
}

// ---- M5: the talk on sitting down, in the career ----
// opts: { lessons (today's: career/day.js planFor), ready (the day can be flown now) or reason (why not: 'brief' — not
// briefed yet; 'weather' — no go / no-go given at the counter; 'none' — nothing to fly today; 'tired' — grounded by the
// IMSAFE question), checkride (the chief instructor in the right seat) }. The choice reaches the game as the hook 'fly'
// ('day:<level>' | 'free' | 'leave'), as in M4.
export function careerBoardDialogs(FL, { lessons = [], ready = false, reason = 'none', checkride = false, who = INSTRUCTOR.title_ja, color = '#5cc8ff' } = {}) {
  const all = lessonsOf(FL);
  const titles = lessons.map(id => { const l = all.find(x => x.id === id); return l ? q(l.title) : id; });
  const levels = FL.school && Array.isArray(FL.school.LEVELS) ? FL.school.LEVELS : [];
  const lv = (id) => levels.find(l => l.id === id) || { name: id };
  const say = (text, more = {}) => ({ speaker: 'instructor', text, ...more });
  const B = {};
  const speakers = { instructor: { name_ja: who, color }, player: SPEAKERS.player };
  if (checkride) {
    B.seat = say('シートベルト、ドア、よし。……では、ソロ前の審査を始めます。', { hook: { name: 'look', arg: 'player' }, next: 'c2' });
    B.c2 = say(`内容は${titles.join('、')}。ここから先、私は手伝いません。いつもどおりに、チェックリストから。`, { choices: [
      { text: '始めます（エンジン始動前の点検から）', next: 'go', effects: [{ hook: 'fly', arg: 'day:basic' }] },
      { text: '一度降ります', next: 'leave', effects: [{ hook: 'fly', arg: 'leave' }] },
    ] });
    B.go = say('どうぞ。', { end: true });
    B.leave = say('わかりました。準備ができたら、また。', { end: true });
    return { speakers, flags: [], hooks: [...COCKPIT_HOOKS], dialogs: { board: { start: 'seat', nodes: B } } };
  }
  const why = { brief: 'まだブリーフィングをしていませんね。先に、ブリーフィング室 1 で今日の課目を確かめましょう。', weather: '今日の天気の判断がまだです。運航管理で METAR と TAF を見て、佐伯さんと決めてきてください。',
    tired: '今日は飛ばないと決めましたね。その判断を守りましょう。', none: '今日は飛ぶ予定はありません。', done: '今日の飛行は終わりましたね。' }[reason] || '今日は飛ぶ予定はありません。';
  B.seat = say('シートベルトは締めましたか。……はい、ドアもロックしました。', { hook: { name: 'look', arg: 'player' }, next: ready ? 'today' : 'not' });
  if (ready) {
    B.today = say(`今日は${titles.join('、')}。ブリーフィングのとおりに、エンジン始動前の点検から始めましょう。基準のきびしさ（レベル）はどうしますか。`, { hook: { name: 'point', arg: 'panel' }, choices: [
      { text: `${lv('basic').name}`, next: 'go', effects: [{ hook: 'fly', arg: 'day:basic' }] },
      { text: `${lv('intro').name}（基準がゆるやか：課目の合格には数えません）`, next: 'go', effects: [{ hook: 'fly', arg: 'day:intro' }] },
      { text: `${lv('precision').name}（基準がきびしい）`, next: 'go', effects: [{ hook: 'fly', arg: 'day:precision' }] },
      { text: 'やっぱり降ります', next: 'leave', effects: [{ hook: 'fly', arg: 'leave' }] },
    ] });
    B.go = say('わかりました。では、始めましょう。', { hook: { name: 'nod' }, end: true });
  } else {
    B.not = say(why, { choices: [
      { text: '駐機場から少しだけ飛ぶ（練習）', next: 'free', effects: [{ hook: 'fly', arg: 'free' }] },
      { text: '降ります', next: 'leave', effects: [{ hook: 'fly', arg: 'leave' }] },
    ] });
    B.free = say('わかりました。エンジンをかけますね。場周を一周して戻りましょう。', { end: true });
  }
  B.leave = say('わかりました。準備ができたら、また乗ってください。', { hook: { name: 'nod' }, end: true });
  return { speakers, flags: [], hooks: [...COCKPIT_HOOKS], dialogs: { board: { start: 'seat', nodes: B } } };
}
