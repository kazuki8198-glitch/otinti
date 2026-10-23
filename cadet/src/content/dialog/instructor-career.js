// CADET — content/dialog/instructor-career.js : 早瀬 教官's talks outside the day's briefing (M5).
//  - meet: the prologue's afternoon — who he is, how the training goes, the cadet's first questions;
//  - ground: during chapter 1 (classes and the training device) — a word, the textbook to ask about;
//  - day: on a flying day, before the briefing: how the cadet feels (IMSAFE: tired or not — the honest answer is the
//    right one), then the day's briefing (instructorDialogs' 'brief');
//  - study: a day the weather keeps them on the ground — the next lesson's reading, its figure on the screen;
//  - solo: the morning of the first solo — what is allowed, what to do if anything is not right;
//  - celebrate: by the aircraft after the solo — the shirt tail, the logbook's endorsement;
//  - checkday: the morning of the check ride (the chief instructor briefs it);
//  - after: once the solo is behind them.
// Hooks: 'imsafe' ('fit' | 'tired': the game checks it against how tired the cadet is and answers through ctx), 'done'
// ('meet' | 'study'), 'board', 'logbook', 'solo' (the solo's day is signed off), 'look', 'nod', 'point'.
import { INSTRUCTOR } from './instructor.js';

export const CAREER_HOOKS = ['imsafe', 'done', 'board', 'logbook', 'solo', 'look', 'nod', 'point'];
export const CAREER_FLAGS = ['met_instructor', 'soloed'];
const SPEAKERS = { instructor: { name_ja: INSTRUCTOR.title_ja, color: '#5cc8ff' }, player: { name_ja: 'あなた', color: '#f2b632' }, kiryu: { name_ja: '桐生', color: '#c9b6ff' }, asahi: { name_ja: '朝日', color: '#ffc4a8' }, mori: { name_ja: '森', color: '#a8e3ff' } };
// the context: today { lessonTitle, studyTitle, studySection (a textbook section with a figure, or '') },
// imsafe { honest (true / false) }, career { tired }
export const CAREER_SAMPLE = { today: { lessonTitle: '「直線水平飛行」', studyTitle: '「場周経路」', studySection: 'ops.pattern' }, imsafe: { honest: true }, career: { tired: false } };

export function careerInstructorDialogs() {
  const say = (text, more = {}) => ({ speaker: 'instructor', text, ...more });
  const M = {
    m1: say('はじめまして。今日からあなたの担当教官になる、早瀬 航です。', { hook: { name: 'look', arg: 'player' }, next: 'm2' }),
    m2: say('最初の 1 週間ほどは座学です。教室でミラー講師の授業、午後は訓練装置で計器と交信の練習。学科試験に受かったら、Archer で飛び始めます。', { next: 'm3' }),
    m3: say('飛ぶ日は毎回、この部屋でブリーフィングをして、外部点検、エンジン始動、交信、離陸、課目、着陸、講評。全部の課目を終えて審査に受かったら、ファーストソロです。', { hook: { name: 'point', arg: 'board' }, next: 'm4' }),
    m4: say('急がなくて大丈夫。一日ずつ、できることを増やしていきましょう。何か聞いておきたいことはありますか。', { choices: [
      { text: 'ソロまで、どのくらいかかりますか', next: 'm:q1' },
      { text: '疲れているときは、どうすればいいですか', next: 'm:q2' },
      { text: '今は大丈夫です。よろしくお願いします', next: 'm:end' },
    ] }),
    'm:q1': say('人によりますが、天気がよければ、飛び始めてから 3 週間くらいです。日数より、毎回の飛行の中身が大事ですよ。', { next: 'm4b' }),
    'm:q2': say('正直に言ってください。疲れているのに飛ぶのが、いちばん危ない。言ってくれたら、その日は地上の勉強に切り替えます。それは減点ではありません。', { hook: { name: 'nod' }, next: 'm4b' }),
    m4b: say('ほかには？', { choices: [
      { text: 'ソロまで、どのくらいかかりますか', next: 'm:q1' },
      { text: '疲れているときは、どうすればいいですか', next: 'm:q2' },
      { text: 'ありがとうございます。よろしくお願いします', next: 'm:end' },
    ] }),
    'm:end': say('こちらこそ。夕方はラウンジで同期と話してみてください。今日はゆっくり休んで、明日の授業に備えましょう。', { effects: [{ set: 'met_instructor' }, { hook: 'done', arg: 'meet' }], hook: { name: 'nod' }, end: true }),
  };
  const G = {
    g1: say('座学、がんばっていますね。教科書でわからないところがあれば、聞いてください。', { hook: { name: 'look', arg: 'player' }, choices: [
      { text: '質問があります', next: 'ask:root' },
      { text: '大丈夫です', next: 'g2' },
    ] }),
    g2: say('数字の言い方と、交信の型。今のうちに体に入れておくと、飛び始めてから楽になります。', { end: true }),
  };
  const D = {
    d1: say('おはようございます。始める前に、ひとつ聞きます。今日の体調はどうですか。昨日はよく眠れましたか。', { hook: { name: 'look', arg: 'player' }, choices: [
      { text: '問題ありません。よく眠れました', next: 'd:fit', effects: [{ hook: 'imsafe', arg: 'fit' }] },
      { text: '正直、少し疲れています', next: 'd:tired', effects: [{ hook: 'imsafe', arg: 'tired' }] },
    ] }),
    'd:fit': say('それならよかった。では、今日の課目です。', { if: { ctx: 'imsafe.honest', is: true }, else: 'd:fit:no', hook: { name: 'nod' }, next: 'brief:menu' }),
    'd:fit:no': say('……そうですか？ 顔に疲れが出ていますよ。疲れは、自分ではいちばん気づきにくいものです。今日は飛ぶのをやめて、地上で復習にしましょう。', { effects: [{ trust: 'instructor', add: -3 }], end: true }),
    'd:tired': say('言ってくれてありがとう。それがいちばん大事な判断です。今日は飛ばずに、地上で次の課目の予習をしましょう。今夜は早く寝てください。', { if: { ctx: 'imsafe.honest', is: true }, else: 'd:tired:ok', effects: [{ trust: 'instructor', add: 2 }], hook: { name: 'nod' }, end: true }),
    'd:tired:ok': say('わかりました。無理はしないでおきましょう。今日は地上で予習にします。言ってくれたこと、よかったですよ。', { effects: [{ trust: 'instructor', add: 1 }], end: true }),
  };
  const S = {
    s1: say('今日は天気のせいで飛べませんね。こういう日は、次の課目の予習をしましょう。次は{today.studyTitle}です。', { hook: { name: 'look', arg: 'player' }, next: 's2' }),
    s2: say('教科書のこの節の図を、画面に出します。', { if: { ctx: 'today.studySection', exists: true }, else: 's3', hook: { name: 'board', arg: 'study' }, next: 's3' }),
    s3: say('飛ぶ前に、頭の中で一度飛んでおく。「チェアフライト」と言います。手順を声に出して、手を動かしてみてください。', { next: 's4' }),
    s4: say('それと、天気が悪い日に飛ばない判断も、立派な操縦の一部です。今日はここまでにしましょう。', { effects: [{ hook: 'done', arg: 'study' }], hook: { name: 'nod' }, end: true }),
  };
  const O = {
    o1: say('今日は、ファーストソロです。', { hook: { name: 'look', arg: 'player' }, next: 'o2' }),
    o2: say('私は乗りません。離陸して、左場周を回って、止まるまで着陸。それを 3 回。管制塔には、初めてのソロだと伝えてください。', { hook: { name: 'point', arg: 'board' }, next: 'o3' }),
    o3: say('何かおかしいと思ったら、迷わずゴーアラウンド。それでも変なら、着陸して止まって、管制塔に言えばいい。私は地上で無線を聞いています。', { next: 'o4' }),
    o4: say('いつもどおりの点検、いつもどおりの交信。あなたはもう、それができます。……いってらっしゃい。', { choices: [{ text: '行ってきます', next: 'o5' }] }),
    o5: say('外部点検から。機体で待っていたりはしませんよ。今日は全部、あなたの手で。', { hook: { name: 'nod' }, end: true }),
  };
  const C = {
    c1: say('おかえりなさい。……ファーストソロ、おめでとう。', { hook: { name: 'look', arg: 'player' }, next: 'c2' }),
    c2: say('3 回とも、落ち着いていましたね。交信も、場周の形も、着陸も。ずっと見ていました。', { hook: { name: 'nod' }, next: 'c3' }),
    c3: say('みんな、ちょっと。……ここの訓練所の伝統です。初めてのソロのあとは、シャツの裾を切る。もう教官の手は要らない、という意味です。', { hook: { name: 'point', arg: 'player' }, next: 'c4' }),
    c4: { speaker: 'asahi', text: 'はさみ、持ってきました！ 名前と日付、書いておくね。', next: 'c5' },
    c5: { speaker: 'mori', text: 'すごいなあ……。おめでとう。', next: 'c6' },
    c6: { speaker: 'kiryu', text: '……先を越されたな。おめでとう。', next: 'c7' },
    c7: say('航空日誌に、今日の飛行と、ソロの裏書きを書いておきます。', { choices: [{ text: '航空日誌を見る', next: 'c8', effects: [{ hook: 'logbook' }] }] }),
    c8: say('ここからが本当の始まりです。次は航法。もっと遠くまで飛びますよ。今日は、ゆっくり休んでください。', { effects: [{ set: 'soloed' }, { hook: 'solo' }], hook: { name: 'nod' }, end: true }),
  };
  const K = {
    k1: say('今日はソロ前の審査ですね。真壁さんが教官室で待っています。審査の前に、真壁さんのブリーフィングを受けてください。', { hook: { name: 'look', arg: 'player' }, next: 'k2' }),
    k2: say('特別なことはしなくていい。毎日やってきたとおりに。……いってらっしゃい。', { hook: { name: 'nod' }, end: true }),
  };
  const A = {
    a1: say('ソロのあとの飛行こそ、丁寧に。慣れたころがいちばん危ない、とよく言われます。', { hook: { name: 'look', arg: 'player' }, choices: [
      { text: '質問があります', next: 'ask:root' },
      { text: 'はい、気をつけます', next: 'a2' },
    ] }),
    a2: say('次の段階の予定は、まだ運航管理から出ていません。それまでは、教科書の第 3 部を読んでおくといいですよ。', { end: true }),
  };
  return {
    speakers: SPEAKERS, flags: [...CAREER_FLAGS], hooks: [...CAREER_HOOKS],
    dialogs: { meet: { start: 'm1', nodes: M }, ground: { start: 'g1', nodes: G }, day: { start: 'd1', nodes: D }, study: { start: 's1', nodes: S },
      solo: { start: 'o1', nodes: O }, checkday: { start: 'k1', nodes: K }, celebrate: { start: 'c1', nodes: C }, after: { start: 'a1', nodes: A } },
  };
}
