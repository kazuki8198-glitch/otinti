// CADET — content/dialog/instructor-career.js : 早瀬 教官's talks outside the day's briefing (M5).
//  - meet: the prologue's afternoon — who he is, how the training goes, the cadet's first questions;
//  - early: the prologue's morning, before the meeting — where to go first (the welcome, the tour);
//  - ground: during chapter 1 (classes and the training device) — a word, the textbook to ask about;
//  - day: on a flying day, before the briefing: how the cadet feels (IMSAFE: tired or not — the honest answer is the
//    right one), then the day's briefing (instructorDialogs' 'brief');
//  - study: a day the weather keeps them on the ground — the next lesson's reading, its figure on the screen;
//  - solo: the morning of the first solo — what is allowed, what to do if anything is not right;
//  - celebrate: by the aircraft after the solo — the shirt tail, the logbook's endorsement;
//  - checkday: the morning of the check ride (the chief instructor briefs it);
//  - after: once the solo is behind them.
// M6: the first flying day of each later chapter starts with what the chapter is (intro, before 'day');
//  - xc: the afternoon of the solo cross-country — what to do alone, the diversion that may come;
//  - checkday: the morning of a check (the chief instructor's, or the examiner's for the final);
//  - grad: the graduation morning; graduated: after it.
// (M6) TEM: from chapter 3 on, after the IMSAFE question (and before the cross-country) the cadet names today's threat
// from three (career/tem.js: hook 'tem' with the index; ctx tem.right says whether it was today's).
// Hooks: 'imsafe' ('fit' | 'tired': the game checks it against how tired the cadet is and answers through ctx), 'done'
// ('meet' | 'study'), 'board', 'logbook', 'solo' (the solo's day is signed off), 'look', 'nod', 'point'.
import { INSTRUCTOR } from './instructor.js';

export const CAREER_HOOKS = ['imsafe', 'done', 'board', 'logbook', 'solo', 'look', 'nod', 'point', 'tem'];
export const CAREER_FLAGS = ['met_instructor', 'soloed', 'briefed_today', 'prologue_short'];
const SPEAKERS = { instructor: { name_ja: INSTRUCTOR.title_ja, color: '#5cc8ff' }, player: { name_ja: 'あなた', color: '#f2b632' }, kiryu: { name_ja: '桐生', color: '#c9b6ff' }, asahi: { name_ja: '朝日', color: '#ffc4a8' }, mori: { name_ja: '森', color: '#a8e3ff' } };
// the context: today { lessonTitle, studyTitle, studySection (a textbook section with a figure, or '') },
// imsafe { honest (true / false) }, career { tired }
export const CAREER_SAMPLE = { today: { lessonTitle: '「直線水平飛行」', studyTitle: '「場周経路」', studySection: 'ops.pattern', intro: '', checkTitle: 'ソロ前の審査', checkWho: '真壁さん', checkId: 'c1', en: { checkTitle: 'pre-solo check', checkWho: 'Mr. Makabe' } }, imsafe: { honest: true }, career: { tired: false, slot: 'morning', chapter: 'ch2' },
  tem: { on: true, o0: '午後の雷雨', o1: '場周の混雑（ほかの訓練機）', o2: '朝の霧', right: true, threat: '場周の混雑（ほかの訓練機）', why: '今日は天気が良く、ほかの訓練機もたくさん飛んでいます', plan: '見張りを続ける', not: '',
    en: { threat: 'a busy pattern (other trainers)', why: 'The weather is good today and many other trainers are flying', plan: 'keep looking out', not: '' } } };
// (M6) TEM's three nodes: the question (skipped when ctx tem.on is false: on to `next`), today's threat named, or not
const temNodes = (say, p, next) => ({
  [p]: say('飛ぶ前に、TEM です。今日の「脅威」をひとつ挙げてください。今日いちばん気をつけることは、何ですか。', { if: { ctx: 'tem.on', is: true }, else: next, hook: { name: 'look', arg: 'player' }, choices: [
    { text: '{tem.o0}', next: p + ':a', effects: [{ hook: 'tem', arg: '0' }] },
    { text: '{tem.o1}', next: p + ':a', effects: [{ hook: 'tem', arg: '1' }] },
    { text: '{tem.o2}', next: p + ':a', effects: [{ hook: 'tem', arg: '2' }] },
  ] }),
  [p + ':a']: say('そのとおり。{tem.why}。対策は、{tem.plan}。脅威は、先に言葉にしておくと、慌てずに済みます。', { if: { ctx: 'tem.right', is: true }, else: p + ':b', effects: [{ trust: 'instructor', add: 1 }], hook: { name: 'nod' }, next }),
  [p + ':b']: say('{tem.not}。今日いちばんの脅威は「{tem.threat}」です。{tem.why}。対策は、{tem.plan}。', { next }),
});

export function careerInstructorDialogs() {
  const say = (text, more = {}) => ({ speaker: 'instructor', text, ...more });
  const M = {
    // (a career begun after another, its welcome taken in short: the meeting in short too)
    ms: say('はじめまして。担当教官の早瀬 航です。明日から座学、ブリーフィング室 2 で。急がなくて大丈夫、わからないことは、いつでも聞いてください。', { if: { flag: 'prologue_short' }, else: 'm1', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'met_instructor' }, { hook: 'done', arg: 'meet' }], end: true }),
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
  // (the prologue's morning: the meeting is in the afternoon; the welcome and the tour come first)
  const E = {
    e1: say('おはようございます。担当教官の早瀬です。顔合わせは午後、この部屋でしましょう。', { hook: { name: 'look', arg: 'player' }, next: 'e2' }),
    e2: say('まずはロビーで、真壁さんの歓迎の話を聞いてきてください。もうすぐ始まりますよ。', { if: { ctx: 'career.slot', is: 'morning' }, else: 'e3', hook: { name: 'nod' }, end: true }),
    e3: say('午前は、運航管理の佐伯さんが訓練所を案内してくれます。ロビーの北の部屋です。また午後に。', { hook: { name: 'nod' }, end: true }),
  };
  const G_ASK = [{ text: '質問があります', next: 'ask:root' }, { text: '大丈夫です', next: 'g2' }];
  const G = {
    // (a line for each number of classes done: ctx career.cls)
    'g1': say('4 つの力のつり合いは、初飛行の a1 でそのまま使います。上昇するか降下するかは、主にパワー。覚えておいてください。', { if: { ctx: 'career.cls', is: 1 }, else: 'g1:2', hook: { name: 'look', arg: 'player' }, choices: G_ASK }),
    'g1:2': say('ピトー静圧の話、外部点検でピトー管のカバーを外すときに思い出してください。', { if: { ctx: 'career.cls', is: 2 }, else: 'g1:3', hook: { name: 'look', arg: 'player' }, choices: G_ASK }),
    'g1:3': say('数字の言い方は、管制の指示を復唱するときに使います。高度と周波数は、とくに丁寧に。', { if: { ctx: 'career.cls', is: 3 }, else: 'g1:4', hook: { name: 'look', arg: 'player' }, choices: G_ASK }),
    'g1:4': say('チェアフライトで交信の流れが頭に入れば、初飛行の交信は半分できたようなものです。', { if: { ctx: 'career.cls', is: 4 }, else: 'g1:5', hook: { name: 'look', arg: 'player' }, choices: G_ASK }),
    'g1:5': say('初飛行の朝は、運航管理で天気を見てから飛ぶかを決めます。今日の METAR の読み方を、そのまま使います。', { if: { ctx: 'career.cls', is: 5 }, else: 'g1:x1', hook: { name: 'look', arg: 'player' }, choices: G_ASK }),
    // (the written test's day, and once it is passed: ctx career.exam1)
    'g1:x1': say('今日は学科試験ですね。明日が初飛行です。今夜はよく寝ること。IMSAFE の F ですね。', { if: { all: [{ ctx: 'career.cls', is: 6 }, { ctx: 'career.exam1', is: 1 }] }, else: 'g1:x2', hook: { name: 'look', arg: 'player' }, choices: G_ASK }),
    'g1:x2': say('学科試験、合格おめでとう。明日は初飛行、a1 です。朝の天気の判断から、一つずつ確かめていきましょう。', { if: { all: [{ ctx: 'career.cls', is: 6 }, { ctx: 'career.exam1', is: 2 }] }, else: 'g1:6', hook: { name: 'look', arg: 'player' }, choices: G_ASK }),
    'g1:6': say('明後日が初飛行です。前の晩はよく寝ること。IMSAFE の F ですね。わからないところがあれば、今のうちに。', { if: { ctx: 'career.cls', is: 6 }, else: 'g1:0', hook: { name: 'look', arg: 'player' }, choices: G_ASK }),
    'g1:0': say('座学、がんばっていますね。初飛行で使う節は、今日の訓練に要るところのペースでも全部読みます。わからないところがあれば、聞いてください。', { hook: { name: 'look', arg: 'player' }, choices: G_ASK }),
    g2: say('数字の言い方と、交信の型。今のうちに体に入れておくと、飛び始めてから楽になります。', { end: true }),
  };
  // (M6) a later chapter's first day: what it is, then the day as always
  const I = {
    i3: say('今日から第 3 章、航法です。場周経路の外へ、もっと遠くへ。横風、短い滑走路、VOR、それから地図と時計で飛ぶ推測航法。', { if: { ctx: 'today.intro', is: 'ch3' }, else: 'i4', hook: { name: 'look', arg: 'player' }, next: 'i3:2' }),
    'i3:2': say('最後は、ひとりでの野外飛行です。航法ログを自分で作って、ひとりで飛んで、帰ってくる。途中で目的地が変わることもあります。', { hook: { name: 'point', arg: 'board' }, next: 'd1' }),
    i4: say('今日から第 4 章、計器飛行です。フードをかぶると、外は見えません。見えるのは計器だけ。', { if: { ctx: 'today.intro', is: 'ch4' }, else: 'i5', hook: { name: 'look', arg: 'player' }, next: 'i4:2' }),
    'i4:2': say('体の感覚は、雲の中ではうそをつきます。姿勢、高度、姿勢、方位、姿勢、速度。目を止めずに、計器を信じてください。最後は真壁さんの審査、雲の中の ILS です。', { next: 'd1' }),
    i5: say('今日から第 5 章、双発機の Seminole です。重くて、速くて、エンジンが 2 つ。', { if: { ctx: 'today.intro', is: 'ch5' }, else: 'i6', hook: { name: 'look', arg: 'player' }, next: 'i5:2' }),
    'i5:2': say('エンジンが 2 つあるのは、片方が止まっても飛べるからです。でも、止まった瞬間は強く片側へ引かれる。足で方向を保つ練習を、何度もします。', { hook: { name: 'point', arg: 'board' }, next: 'd1' }),
    i6: say('第 6 章、最後の章です。TEM、脅威とエラーの管理。飛ぶ前に「今日の危ないところ」を言葉にする練習をします。', { if: { ctx: 'today.intro', is: 'ch6' }, else: 'd1', hook: { name: 'look', arg: 'player' }, next: 'i6:2' }),
    'i6:2': say('それが終わったら、最終審査。外から来る審査官が、あなたの隣に座ります。ここで覚えたこと、全部を見せてください。', { next: 'd1' }),
  };
  const D = {
    d1: say('おはようございます。始める前に、ひとつ聞きます。今日の体調はどうですか。昨日はよく眠れましたか。', { hook: { name: 'look', arg: 'player' }, choices: [
      { text: '問題ありません。よく眠れました', next: 'd:fit', effects: [{ hook: 'imsafe', arg: 'fit' }] },
      { text: '正直、少し疲れています', next: 'd:tired', effects: [{ hook: 'imsafe', arg: 'tired' }] },
    ] }),
    'd:fit': say('それならよかった。では、今日の課目です。', { if: { ctx: 'imsafe.honest', is: true }, else: 'd:fit:no', hook: { name: 'nod' }, next: 'd:tem' }),
    ...temNodes(say, 'd:tem', 'brief:menu'),
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
    o5: say('外部点検から。機体で待っていたりはしませんよ。今日は全部、あなたの手で。', { hook: { name: 'nod' }, effects: [{ set: 'briefed_today' }], end: true }),
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
    k1: say('今日は{today.checkTitle}ですね。{today.checkWho}が教官室で待っています。審査の前に、ブリーフィングを受けてください。', { hook: { name: 'look', arg: 'player' }, next: 'k2' }),
    k2: say('特別なことはしなくていい。毎日やってきたとおりに。……いってらっしゃい。', { hook: { name: 'nod' }, end: true }),
  };
  const A = {
    a1: say('ソロのあとの飛行こそ、丁寧に。慣れたころがいちばん危ない、とよく言われます。', { hook: { name: 'look', arg: 'player' }, choices: [
      { text: '質問があります', next: 'ask:root' },
      { text: 'はい、気をつけます', next: 'a2' },
    ] }),
    a2: say('今日の予定は、タブレットと運航管理の予定表に出ています。わからないところは、いつでも聞いてください。', { end: true }),
  };
  // (M6) the solo cross-country's afternoon
  const X = {
    x1: say('航法ログは、ちゃんとできていましたね。では、単独の野外飛行です。', { hook: { name: 'look', arg: 'player' }, next: 'x2' }),
    x2: say('離陸したら、LAB-A へ。そこから先は、管制か私から目的地の変更を言うかもしれません。言われたら、新しい針路と距離と時間を、落ち着いて見積もってください。', { hook: { name: 'point', arg: 'board' }, next: 'x3' }),
    x3: say('迷ったら、最後に確かだった場所から考える。VOR と DME もあります。それでもわからなければ、正直に管制に聞く。それは恥ずかしいことではありません。', { next: 'x4' }),
    x4: say('燃料と時間に余裕を。帰ってきたら、航空日誌に「野外飛行」と書きましょう。', { next: 'x:tem' }),
    ...temNodes(say, 'x:tem', 'x4b'),
    x4b: say('……いってらっしゃい。', { choices: [{ text: '行ってきます', next: 'x5' }] }),
    x5: say('外部点検から。今日も、全部あなたの手で。', { hook: { name: 'nod' }, effects: [{ set: 'briefed_today' }], end: true }),
  };
  // (M6) the graduation morning, and after it
  const GR = {
    g1: say('おはようございます。今日は修了式です。ロビーで、真壁さんが待っています。……少し、緊張しますね。私もです。', { if: { ctx: 'career.graduated', is: false }, else: 'g2', hook: { name: 'look', arg: 'player' }, end: true }),
    g2: say('修了、おめでとう。あなたの担当になれて、よかったです。……次に会うのは、どこかの空港かもしれませんね。', { hook: { name: 'nod' }, end: true }),
  };
  return {
    speakers: SPEAKERS, flags: [...CAREER_FLAGS], hooks: [...CAREER_HOOKS],
    dialogs: { meet: { start: 'ms', nodes: M }, early: { start: 'e1', nodes: E }, ground: { start: 'g1', nodes: G }, day: { start: 'i3', nodes: { ...I, ...D } }, study: { start: 's1', nodes: S },
      xc: { start: 'x1', nodes: X }, grad: { start: 'g1', nodes: GR },
      solo: { start: 'o1', nodes: O }, checkday: { start: 'k1', nodes: K }, celebrate: { start: 'c1', nodes: C }, after: { start: 'a1', nodes: A } },
  };
}
