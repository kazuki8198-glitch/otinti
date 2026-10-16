// CADET — content/dialog/cockpit.js : what 早瀬 教官 (fictional) says in the aircraft. 'board' runs once the player
// has sat down in the left seat: belts and door, today's lesson, then the choice — fly today's lesson (the transit to
// the training area is skipped), fly freely from the apron, or get out again. The choice reaches the game as the hook
// 'fly' (arg 'intro' | 'basic' | 'precision' | 'free' | 'leave'); the game acts on it when the talk ends.
// In flight the instructor speaks the lesson's own instructions (FLIGHT LAB's school) through flightLine(), which says
// the controls' names instead of the keyboard keys, and comments on the result with debriefLine().
import { INSTRUCTOR } from './instructor.js';
import { speakable } from './instructor.js';

const SPEAKERS = { instructor: { name_ja: INSTRUCTOR.title_ja, color: '#5cc8ff' }, player: { name_ja: 'あなた', color: '#f2b632' } };
export const COCKPIT_FLAGS = ['briefed_today'];
export const COCKPIT_HOOKS = ['look', 'nod', 'point', 'fly'];
export const FLY_CHOICES = ['intro', 'basic', 'precision', 'free', 'leave'];

const lessonsOf = (FL) => (FL.syllabus && Array.isArray(FL.syllabus.STAGES) ? FL.syllabus.STAGES.flatMap(s => s.lessons || []) : []);
const q = (s) => `「${s}」`;

export function cockpitDialogs(FL, { lessonId = 'a1' } = {}) {
  const lesson = lessonsOf(FL).find(l => l.id === lessonId);
  if (!lesson) throw new Error(`cockpitDialogs: no lesson "${lessonId}" in FLIGHT LAB's syllabus`);
  const levels = FL.school && Array.isArray(FL.school.LEVELS) ? FL.school.LEVELS : [];
  const lv = (id) => levels.find(l => l.id === id) || { name: id };
  const say = (text, more = {}) => ({ speaker: 'instructor', text, ...more });
  const B = {};
  B.seat = say('シートベルトは締めましたか。……はい、ドアもロックしました。', { hook: { name: 'look', arg: 'player' }, next: 'today' });
  B.today = say(`今日の課目は${q(lesson.title)}です。ブリーフィングのとおりにやってみましょう。`, {
    if: { flag: 'briefed_today' }, else: 'today:new', hook: { name: 'nod' }, next: 'menu' });
  B['today:new'] = say(`ブリーフィングはまだでしたね。今日の課目は${q(lesson.title)}です。飛びながら説明します。`, { next: 'menu' });
  B.menu = say('訓練空域までの移動は省いて、課目から始められます。どうしますか。', { hook: { name: 'point', arg: 'panel' }, choices: [
    { text: `課目を飛ぶ（${lv('intro').name}：基準がゆるやか）`, next: 'go', effects: [{ hook: 'fly', arg: 'intro' }] },
    { text: `課目を飛ぶ（${lv('basic').name}）`, next: 'go', effects: [{ hook: 'fly', arg: 'basic' }] },
    { text: `課目を飛ぶ（${lv('precision').name}：基準がきびしい）`, next: 'go', effects: [{ hook: 'fly', arg: 'precision' }] },
    { text: '駐機場から自由に飛ぶ', next: 'free', effects: [{ hook: 'fly', arg: 'free' }] },
    { text: 'やっぱり降ります', next: 'leave', effects: [{ hook: 'fly', arg: 'leave' }] },
  ] });
  B.go = say('わかりました。では、訓練空域へ向かいます。', { hook: { name: 'nod' }, end: true });
  B.free = say('わかりました。エンジンをかけますね。', { next: 'free:2' });
  B['free:2'] = say('地上では、足のペダルで向きを変えます。止まるときはブレーキです。', { hook: { name: 'point', arg: 'pedals' }, next: 'free:3' });
  B['free:3'] = say('滑走路 36 から離陸して、場周を一周してみましょう。わからないことがあれば、いつでも聞いてください。', { hook: { name: 'look', arg: 'player' }, end: true });
  B.leave = say('わかりました。準備ができたら、また乗ってください。', { hook: { name: 'nod' }, end: true });
  return { speakers: SPEAKERS, flags: [...COCKPIT_FLAGS], hooks: [...COCKPIT_HOOKS], dialogs: { board: { start: 'seat', nodes: B } } };
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
export function flightLine(text) {
  let s = String(text ?? '');
  for (const [re, to] of KEYWORD) s = s.replace(re, to);
  return speakable(s).replace(/\s+/g, ' ').trim();
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
