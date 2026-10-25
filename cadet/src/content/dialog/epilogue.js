// CADET — content/dialog/epilogue.js : the epilogue (M8): a few months after the graduation, the right seat of SHOYO
// AIRWAYS' 737 at a gate at Haneda, and the training captain in the left seat — 柏木 機長 (fictional), who will take
// the cadet through the type rating. His first words when the cadet sits down ('meet'), then, when the cadet turns
// to him again, a word on what is out there and the goodbye ('again'). Hooks the game acts out: look, nod, point
// ('outside'), done ('epilogue': the epilogue is over, back to the academy). Every line has its English (the crew's
// English mode: en). ('again' before 'meet' was heard to its end — the talk closed early — begins with 'meet'.)
export const CAPTAIN = { id: 'captain', name_ja: '柏木 機長', color: '#ffd27a' };
const SPEAKERS = { captain: { name_ja: CAPTAIN.name_ja, color: CAPTAIN.color }, player: { name_ja: 'あなた', color: '#f2b632' } };
export const EPILOGUE_FLAGS = ['epilogue_met'];
export const EPILOGUE_HOOKS = ['look', 'nod', 'point', 'done'];

export function epilogueDialogs() {
  const say = (text, en, more = {}) => ({ speaker: 'captain', text, en, ...more });
  const M = {
    m1: say('おはよう。今日からこの機体の型式の訓練に入る、右席の訓練生だね。機長の柏木です。', 'Good morning. You\'re the trainee starting the type rating on this aircraft, in the right seat. I\'m Captain Kashiwagi.',
      { hook: { name: 'look', arg: 'player' }, effects: [{ set: 'epilogue_met' }], next: 'm2' }),
    m2: say('ここは羽田。訓練センターのシミュレーターで型式限定を取る前に、まず本物の操縦席に座ってもらうことにしている。', 'This is Haneda. Before the simulator and the type rating at the training centre, we have you sit in a real flight deck first.', { next: 'm3' }),
    m3: say('画面は大きいのが 6 枚、エンジンはジェットが 2 つ。でも、やることはアカデミーと同じだよ。点検し、確かめ、声に出す。', 'Six big display units, two jet engines. But the work is the same as at the academy. Check, confirm, say it out loud.', { hook: { name: 'point', arg: 'panel' }, next: 'm4' }),
    m4: say('早瀬さんから聞いている。毎日の点検を、一度も省かなかったそうだね。', 'I\'ve heard from Mr. Hayase. He says you never once skipped your daily checks.', { choices: [
      { text: 'はい', next: 'm5' }, { text: 'まだまだです', next: 'm5' },
    ] }),
    m5: say('それが、いちばん大事なことだ。……さあ、外を見てごらん。ここが、これからの君の職場だ。', 'That is what matters most. ...Now, look outside. This is where you\'ll be working from now on.', { hook: { name: 'nod' }, end: true }),
  };
  const A = {
    a1: say('見えるかい。正面がターミナル、右の奥が滑走路と海。天気のいい朝は、君の側の窓の遠くに富士山も見える。', 'Can you see? The terminal ahead, the runway and the sea far to the right. On a clear morning you can see Mt Fuji far off through your side window.',
      { if: { flag: 'epilogue_met' }, else: 'meet:m1', hook: { name: 'point', arg: 'outside' }, choices: [
        { text: 'もう少し見ています', next: 'stay' }, { text: 'そろそろ行きます', next: 'bye' },
      ] }),
    stay: say('ゆっくりでいい。急がなくて大丈夫だ。', 'Take your time. There\'s no hurry.', { end: true }),
    bye: say('次は、シミュレーターで会おう。……ようこそ、翔洋航空へ。', 'See you in the simulator next. ...Welcome to SHOYO AIRWAYS.', { hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'epilogue' }], end: true }),
  };
  return { speakers: SPEAKERS, flags: [...EPILOGUE_FLAGS], hooks: [...EPILOGUE_HOOKS], dialogs: { meet: { start: 'm1', nodes: M }, again: { start: 'a1', nodes: A } } };
}
