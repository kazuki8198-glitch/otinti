// CADET — content/dialog/day1.js : what 早瀬 教官 says through the first day (M4), phase by phase (career/day.js), and
// the two questions he asks in the air: to the practice area and back — skip the transit, or fly it.
// The lines are his own words for CADET's parts of the day (FLIGHT LAB's lessons speak for themselves: flightLine).
export const PHASE_LINES = {
  prestart: 'では、エンジン始動前のチェックリストから始めます。右の一覧のとおり、ひとつずつ。目で見て確かめる項目は、確かめたら Enter です。',
  start: 'エンジンをかけます。ミクスチャー、スロットル、マスター……一覧の順に。わからないところは、私に任せてもいいですよ。',
  afterStart: 'かかりましたね。油圧も上がっています。始動後の点検をしましょう。',
  atis: 'ATIS を聞きます。今日は周波数を私が合わせます。よく聞いて、高度計の値を答えてください。',
  ground: '地上管制を呼びます。最初の呼び出しは、相手・自分・位置・ATIS・要求の順です。',
  taxiOut: 'パーキングブレーキを外して、ゆっくり進みます。向きは足のペダル、速さはスロットルとブレーキで。地面の線をたどって、誘導路 A を南へ、A1 の停止線の手前まで。',
  runup: 'ここでランナップです。止まったまま、パーキングブレーキをかけてから。',
  tower: '準備ができました。管制塔を呼びます。周波数は 118.3 です。',
  lineup: '停止線を越えて滑走路に入り、センターラインに合わせて止まってください。',
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
export const EVENT_LINES = {
  incursion: '止まって！ 停止線を越えています。滑走路に入る許可はまだです。',
  nostarter: 'マスター スイッチが OFF なので、スターターが回りません。',
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
  return { speakers: SPEAKERS, flags: [], hooks: ['look', 'nod', 'point', 'go'], dialogs: { transit: { start: 'ask', nodes: T }, return: { start: 'ask', nodes: R } } };
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
