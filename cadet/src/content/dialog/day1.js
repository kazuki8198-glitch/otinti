// CADET — content/dialog/day1.js : what 早瀬 教官 says through a flying day (M4; M5: every day of chapter 2), step by
// step (career/day.js), and the questions he asks in the air: to the practice area and back, round the circuit to
// where the next lesson begins — skip the move, or fly it. On the first solo he is on the ground: the cadet's own
// reminders (SOLO_LINES) take his place.
// The lines are his own words for CADET's parts of the day (FLIGHT LAB's lessons speak for themselves: flightLine).
import { NOSTARTER } from '../../aircraft/systems.js';

export const PHASE_LINES = {
  prestart: 'では、エンジン始動前のチェックリストから始めます。右の一覧のとおり、ひとつずつ。目で見て確かめる項目は、確かめたら Enter です。',
  start: 'エンジンをかけます。スイッチ、ミクスチャー、スロットル……一覧の順に。わからないところは、私に任せてもいいですよ。',
  afterStart: 'かかりましたね。油圧も上がっています。始動後の点検をしましょう。',
  atis: 'ATIS を聞きます。今日は周波数を私が合わせます。よく聞いて、高度計の値を答えてください。',
  ground: '地上管制を呼びます。最初の呼び出しは、相手・自分・位置・ATIS・要求の順です。',
  taxiOut: 'パーキングブレーキを外して、ゆっくり進みます。向きは足のペダル、速さはスロットルとブレーキで。地面の線をたどって、誘導路 A を南へ、A1 の停止線の手前まで。',
  runup: 'ここでランナップです。止まったまま、パーキングブレーキをかけてから。',
  tower: '準備ができました。管制塔を呼びます。周波数は 118.3 です。',
  lineup: '停止線を越えて滑走路に入り、センターラインに合わせて止まってください。',
  takeoff: '管制塔から離陸の許可が出ます。復唱してから。今日の課目は、滑走を始めたところから始まります。',
  closed: '今日は場周経路で練習します。管制塔の指示を聞いて、復唱しましょう。',
  leave: '地上 1,000 ft。上昇を続けながら、管制塔に応答します。',
  back: 'お疲れさまでした。LAB に戻ります。管制塔を呼びましょう。',
  exit: 'よく止まりました。管制塔の指示を聞きましょう。',
  taxiOff: '右へ曲がって滑走路を出て、停止線を越えたところで止まります。',
  groundIn: '地上管制を呼びます。周波数は 121.7 です。',
  taxiIn: '誘導路 A を南へ。駐機場の線をたどって、いつもの場所へ戻ります。着陸後のチェックリストは、動きながらで構いません。',
  shutdown: '着きました。止まったら、エンジン停止のチェックリストです。',
};
// when the cadet leaves something to him (Y)
export const ASSIST_LINES = {
  list: 'わかりました、ここは私がやります。手元を見ていてください。',
  taxi: 'I have control。地上走行は私がやります。ペダルとブレーキの使い方を見ていてください。',
  taxiDone: 'You have control。ここからはお願いします。',
};
// after a lesson that ends in a field (the engine failure flown to the end): he takes it back to LAB
export const RECOVER_LINE = '不時着の場所までは十分です。本当の訓練では、地上 500 ft までに私が出力を戻して上昇します。I have control。このまま LAB に戻ります。';
// the first solo: what the cadet tells themselves (no one in the right seat)
export const SOLO_LINES = {
  prestart: '右の席は空いている。チェックリストは、ひとつずつ自分で。',
  atis: 'ATIS。高度計の値を聞き逃さない。',
  ground: '最初の呼び出し。“student pilot” を忘れずに。',
  taxiOut: 'ゆっくり。A1 の停止線の手前まで。',
  runup: 'ランナップ。数字を自分の目で確かめる。',
  tower: '管制塔へ。今日は “first solo” と伝える。',
  lineup: '滑走路に入って、センターラインに合わせる。',
  closed: '左場周。いつもの高さ、いつもの形で。',
  stopgo: '止まった。もう一度離陸の許可をもらう。',
  exit: '3 回目の着陸。管制塔の指示を聞く。',
  taxiIn: '駐機場へ。みんなが待っている。',
  shutdown: 'エンジン停止のチェックリストまで、気を抜かない。',
};
export const EVENT_LINES = {
  incursion: '止まって！ 停止線を越えています。滑走路に入る許可はまだです。',
  nostarter: NOSTARTER,                                      // (aircraft/systems.js: the starter without BATT MASTR)
  surge: 'スロットルが開きすぎです。かかった瞬間に回転が上がりすぎました。始動のときは少しだけ開けます。',
  stopped: (why) => `エンジンが止まりました（${why}）。`,
  noClear: '停止線の手前で止まってください。',
  walkFound: (n) => `乗る前に、機体の周りを私も見てきました。${n}`,
};

const SPEAKERS = { instructor: { name_ja: '早瀬 教官', color: '#5cc8ff' }, player: { name_ja: 'あなた', color: '#f2b632' } };
// the two questions (dialog data for the cockpit's runner; the choice reaches the game as the hook 'go': 'skip' | 'fly')
export function dayDialogs() {
  const say = (text, more = {}) => ({ speaker: 'instructor', text, ...more });
  const T = {
    ask: say('訓練空域は、ここから北北東へ約 4 マイル、地図の LAB-A の手前です。高度は 3,000 ft。移動は省いて、空域に着いたところから始めますか。それとも、自分で飛んで行きますか。', { hook: { name: 'look', arg: 'player' }, choices: [
      { text: '移動は省く（訓練空域に着いたところから）', next: 'skip', effects: [{ hook: 'go', arg: 'skip' }] },
      { text: '自分で飛んで行く（北北東へ 4 マイル・3,000 ft）', next: 'fly', effects: [{ hook: 'go', arg: 'fly' }] },
    ] }),
    skip: say('わかりました。では、空域に着いたところから始めます。', { hook: { name: 'nod' }, end: true }),
    fly: say('では、針路 030 で 3,000 ft まで上昇して向かってください。MFD の地図にも出ています。空域に入ったら私が言います。', { hook: { name: 'point', arg: 'pfd' }, end: true }),
  };
  const R = {
    ask: say('LAB へ戻ります。滑走路 36 への直線進入、最終進入の 5 km の地点から着陸の課目です。そこまでの移動は省きますか。', { hook: { name: 'look', arg: 'player' }, choices: [
      { text: '移動は省く（最終進入 5 km から）', next: 'skip', effects: [{ hook: 'go', arg: 'skip' }] },
      { text: '自分で飛んで行く（滑走路 36 の南 5 km へ、1,000 ft）', next: 'fly', effects: [{ hook: 'go', arg: 'fly' }] },
    ] }),
    skip: say('わかりました。最終進入から始めます。', { hook: { name: 'nod' }, end: true }),
    fly: say('では、滑走路 36 の延長線上、南 5 km の地点へ。高度は 1,000 ft くらいまで下げておきましょう。', { hook: { name: 'point', arg: 'pfd' }, end: true }),
  };
  const C = {
    ask: say('もう一度、場周を回ります。次の課目は、場周経路の途中から始まります。そこまでの移動は省きますか。', { hook: { name: 'look', arg: 'player' }, choices: [
      { text: '移動は省く（次の課目の始まるところから）', next: 'skip', effects: [{ hook: 'go', arg: 'skip' }] },
      { text: '自分で場周を回って行く（左場周・地上 1,000 ft）', next: 'fly', effects: [{ hook: 'go', arg: 'fly' }] },
    ] }),
    skip: say('わかりました。そこから始めます。', { hook: { name: 'nod' }, end: true }),
    fly: say('では、左旋回でクロスウインド、ダウンウインドへ。地上 1,000 ft・90 kt です。課目の始まるところで私が言います。', { hook: { name: 'point', arg: 'pfd' }, end: true }),
  };
  // (M7) the run-up's fault: the left magneto drops beyond the limit (the hook 'go': 'return' | 'burn' | 'go'); asked
  // again (fault2) when a lean run-up did not clear it
  const F = {
    ask: say('左のマグネトーで、回転の下がり方が制限の 175 rpm を超えました。エンジンも少し荒れていますね。どうしますか。', { hook: { name: 'point', arg: 'pfd' }, choices: [
      { text: '離陸はやめて、駐機場へ戻り整備に報告する', next: 'ret', effects: [{ hook: 'go', arg: 'return' }] },
      { text: 'ミクスチャーを絞って回し、プラグの汚れを焼き切ってから、もう一度確かめる', next: 'burn', effects: [{ hook: 'go', arg: 'burn' }] },
      { text: '少しなので、このまま離陸する', next: 'go', effects: [{ hook: 'go', arg: 'go' }] },
    ] }),
    ret: say('いい判断です。制限を超えたら、飛ばない。地上管制には私が連絡します。駐機場へ戻りましょう。大城さんに見てもらいます。', { hook: { name: 'nod' }, end: true }),
    burn: say('それも手順のひとつです。1,800 rpm くらいで、ミクスチャーを少し絞って 30 秒。そのあと、もう一度、左右のマグネトーを 1 つずつ確かめてください。', { hook: { name: 'point', arg: 'pfd' }, end: true }),
    go: say('いいえ、それはだめです。制限を超えたマグネトーで離陸すると、上空で片方の点火が止まったとき、もう余裕がありません。今日は戻ります。', { hook: { name: 'look', arg: 'player' }, end: true }),
  };
  const F2 = {
    ask: say('焼いても、まだ制限を超えて落ちますね。プラグの汚れではなく、マグネトーそのものかもしれません。', { hook: { name: 'look', arg: 'player' }, choices: [
      { text: '駐機場へ戻って、整備に報告する', next: 'ret', effects: [{ hook: 'go', arg: 'return' }] },
      { text: 'このまま離陸する', next: 'go', effects: [{ hook: 'go', arg: 'go' }] },
    ] }),
    ret: F.ret, go: F.go,
  };
  return { speakers: SPEAKERS, flags: [], hooks: ['look', 'nod', 'point', 'go'], dialogs: { transit: { start: 'ask', nodes: T }, return: { start: 'ask', nodes: R }, pattern: { start: 'ask', nodes: C }, fault: { start: 'ask', nodes: F }, fault2: { start: 'ask', nodes: F2 } } };
}

// at the aircraft before the flight (the walk-around): what he asks of the cadet
export function apronDialogs() {
  const say = (text, more = {}) => ({ speaker: 'instructor', text, ...more });
  const N = {
    hi: say('来ましたね。では、外部点検をお願いします。機体の周りを、操縦席・右の翼・機首・左の翼・尾部の順に回ります。', { hook: { name: 'look', arg: 'player' }, next: 'hi:2' }),
    'hi:2': say('おかしいと思ったら、その場で「報告する」を選んでください。整備に連絡します。迷ったときも、遠慮なく。', { next: 'hi:3' }),
    'hi:3': say('終わったら、右の翼の上のドアから乗ってください。私もすぐに乗ります。', { hook: { name: 'nod' }, choices: [{ text: 'わかりました', next: 'ok' }] }),
    ok: say('焦らなくて大丈夫です。ひとつずつ、見て、触って、確かめましょう。', { end: true }),
  };
  return { speakers: SPEAKERS, flags: [], hooks: ['look', 'nod'], dialogs: { apron: { start: 'hi', nodes: N } } };
}
