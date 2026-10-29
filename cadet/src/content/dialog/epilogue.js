// CADET — content/dialog/epilogue.js : the epilogue (M8): a few months after the graduation, the right seat of SHOYO
// AIRWAYS' 737 at a gate at Haneda, and the training captain in the left seat — 柏木 機長 (fictional), who will take
// the cadet through the type rating. His first words when the cadet sits down ('meet'), then, when the cadet turns
// to him again, a word on what is out there and the goodbye ('again') — or the departure ('again' → 'go' → the game
// acts out the pushback, the taxi, the take-off and the first climb: 'depart', whose lines the game starts at their
// moments on the way out, epilogue/departure.js; the two that belong in the air wait for the climb — their `if`,
// on the game's word of where the aircraft is — and are a holding line until then). Hooks the game acts out: look,
// nod, point ('outside'), done ('epilogue': the epilogue is over, back to the academy; 'depart': the talk is over,
// the departure begins). Every line has its English (the crew's English mode: en). ('again' before 'meet' was heard
// to its end — the talk closed early — begins with 'meet'.)
export const CAPTAIN = { id: 'captain', name_ja: '柏木 機長', color: '#ffd27a' };
const SPEAKERS = { captain: { name_ja: CAPTAIN.name_ja, color: CAPTAIN.color }, player: { name_ja: 'あなた', color: '#f2b632' } };
export const EPILOGUE_FLAGS = ['epilogue_met'];
export const EPILOGUE_HOOKS = ['look', 'nod', 'point', 'done'];

export function epilogueDialogs(rank = '') {
  const say = (text, en, more = {}) => ({ speaker: 'captain', text, en, ...more });
  // (growth design v1 §4.6) what the captain has heard of the cadet depends on the graduation's rank
  const heard = rank === '優等' ? ['早瀬さんから聞いている。アカデミーを優等で出たそうだね。毎日の点検を、一度も省かなかった、とも。', 'I\'ve heard from Mr. Hayase. You finished the academy with honours, he says. And never once skipped your daily checks.']
    : rank === '優秀' ? ['早瀬さんから聞いている。アカデミーでは優秀な成績で、毎日の点検を一度も省かなかったそうだね。', 'I\'ve heard from Mr. Hayase. A fine record at the academy, and you never once skipped your daily checks.']
    : ['早瀬さんから聞いている。毎日の点検を、一度も省かなかったそうだね。', 'I\'ve heard from Mr. Hayase. He says you never once skipped your daily checks.'];
  const M = {
    m1: say('おはよう。今日からこの機体の型式の訓練に入る、右席の訓練生だね。機長の柏木です。', 'Good morning. You\'re the trainee starting the type rating on this aircraft, in the right seat. I\'m Captain Kashiwagi.',
      { hook: { name: 'look', arg: 'player' }, effects: [{ set: 'epilogue_met' }], next: 'm2' }),
    m2: say('ここは羽田。訓練センターのシミュレーターで型式限定を取る前に、まず本物の操縦席に座ってもらうことにしている。', 'This is Haneda. Before the simulator and the type rating at the training centre, we have you sit in a real flight deck first.', { next: 'm3' }),
    m3: say('画面は大きいのが 6 枚、エンジンはジェットが 2 つ。でも、やることはアカデミーと同じだよ。点検し、確かめ、声に出す。', 'Six big display units, two jet engines. But the work is the same as at the academy. Check, confirm, say it out loud.', { hook: { name: 'point', arg: 'panel' }, next: 'm4' }),
    m4: say(heard[0], heard[1], { choices: [
      { text: 'はい', next: 'm5' }, { text: 'まだまだです', next: 'm5' },
    ] }),
    m5: say('それが、いちばん大事なことだ。……さあ、外を見てごらん。ここが、これからの君の職場だ。', 'That is what matters most. ...Now, look outside. This is where you\'ll be working from now on.', { hook: { name: 'nod' }, end: true }),
  };
  const A = {
    a1: say('見えるかい。正面がターミナル、右の奥が滑走路と海。天気のいい朝は、君の側の窓の遠くに富士山も見える。', 'Can you see? The terminal ahead, the runway and the sea far to the right. On a clear morning you can see Mt Fuji far off through your side window.',
      { if: { flag: 'epilogue_met' }, else: 'meet:m1', hook: { name: 'point', arg: 'outside' }, choices: [
        { text: 'もう少し見ています', next: 'stay' }, { text: '出発を見る', next: 'go' }, { text: 'そろそろ行きます', next: 'bye' },
      ] }),
    stay: say('ゆっくりでいい。急がなくて大丈夫だ。', 'Take your time. There\'s no hurry.', { end: true }),
    go: say('では、出発しようか。ちょうど出発の時間だ。……右席からの出発を、見ていくといい。', 'Then let\'s be off. It is just departure time. ...Watch a departure from the right seat.', { effects: [{ hook: 'done', arg: 'depart' }], end: true }),
    bye: say('次は、シミュレーターで会おう。……ようこそ、翔洋航空へ。', 'See you in the simulator next. ...Welcome to SHOYO AIRWAYS.', { hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'epilogue' }], end: true }),
  };
  // the departure: his words on the way out (the game starts each at its moment; d4 and d5 belong in the air, so
  // until the aircraft is climbing they are a holding line and the talk closes — the game offers them again aloft)
  const farewell = rank === '優等' ? ['優等でアカデミーを出た君だ。……思い出すかい。初めて一人で飛んだ、あの朝を。あの日の場周経路の先に、今日の上昇があったんだ。ようこそ、本当の空へ。', 'You left the academy with honours. ...Do you remember the morning you first flew alone? Beyond that day\'s circuit lay today\'s climb. Welcome to the real sky.']
    : rank === '優秀' ? ['優秀な成績でアカデミーを出た君だ。……思い出すかい。初めて一人で飛んだ、あの朝を。あの日の場周経路の先に、今日の上昇があったんだ。ようこそ、本当の空へ。', 'You left the academy with a fine record. ...Do you remember the morning you first flew alone? Beyond that day\'s circuit lay today\'s climb. Welcome to the real sky.']
    : ['思い出すかい。初めて一人で飛んだ、あの朝を。あの日の場周経路の先に、今日の上昇があったんだ。……ようこそ、本当の空へ。', 'Do you remember the morning you first flew alone? Beyond that day\'s circuit lay today\'s climb. ...Welcome to the real sky.'];
  const D = {
    d1: say('プッシュバックだ。牽引車に押されて、機体が動き出す。地上の係員が、翼の先を見張ってくれている。', 'Pushback. The tug pushes, and the aircraft begins to move. The ground crew is watching our wingtips.', { next: 'd2' }),
    d2: say('タキシーに入る。中心の線から、外れないように。……アカデミーで君がしたことと、同じだ。止まるべきところでは、止まる。', 'We taxi now. Stay on the centreline. ...It is the same as what you did at the academy. Stop where you must stop.', { next: 'd3' }),
    d3: say('滑走路に入る許可が出た。……ここからは早いよ。心の準備を。', 'We are cleared to line up. ...From here it goes quickly. Ready yourself.', { next: 'd4' }),
    d4: say('浮いた。……車輪の上がる音が、聞こえたね。ほら、君の窓の外だ。東京湾が広がっている。', 'We are airborne. ...You heard the wheels come up. Look — out of your window. Tokyo Bay is opening out below.', { if: { ctx: 'epi.phase', is: 'climb' }, else: 'hold', next: 'd5' }),
    d5: say(farewell[0], farewell[1], { if: { ctx: 'epi.phase', is: 'climb' }, else: 'hold2', hook: { name: 'nod' }, effects: [{ hook: 'done', arg: 'epilogue' }], end: true }),
    hold: say('少し待ってくれ。……交信が入っている。', 'One moment. ...There is a call coming in.', { end: true }),
    hold2: say('もう少しだ。……上昇に入ったら、また話そう。', 'Not long now. ...We will talk again once we are climbing.', { end: true }),
  };
  return { speakers: SPEAKERS, flags: [...EPILOGUE_FLAGS], hooks: [...EPILOGUE_HOOKS], dialogs: { meet: { start: 'm1', nodes: M }, again: { start: 'a1', nodes: A }, depart: { start: 'd1', nodes: D } } };
}
