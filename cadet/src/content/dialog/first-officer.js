// CADET — content/dialog/first-officer.js : the first-officer phase's own words (S1/S3).
//  - join: after the graduation, the chief instructor (真壁 主任教官) tells the cadet that SHOYO AIRWAYS
//    is taking them on as a first officer, and what comes next (the type rating at Haneda). Choosing
//    「入社する」 fires the hook { name: 'hook', arg: 'join' } — the game's cue to call
//    career.beginFirstOfficer() — in the dialogs' usual shape (a choice's hook effect, as
//    instructor-career.js's and day1.js's choices carry theirs). Choosing to wait ends the talk with
//    nothing decided; the offer stays. One line is the epilogue's, turned round: the right seat the
//    cadet once only sat in to look (content/dialog/epilogue.js) is theirs now.
//  - captainLines: the three line captains as plain data for the game's integration (main.js) — who
//    they are, how they speak, how strict their evaluation is, and a short briefing / debriefing line
//    each way (a good leg, a leg to improve). Their ids and names are flight/line.js's CAPTAINS' ids, so
//    a roster item's captain (career.js FO_CAPTAINS) resolves in both places. NOTE the two strict
//    scales: here `strict` is a strictness factor (1.1 the strictest, 1.0 standard, 0.9 the kindest —
//    bigger is stricter), while line.js's CAPTAINS.strict is the score multiplier it applies in its
//    summary (0.95 / 1.0 / 1.05 for the same three captains, in the same order). Whoever wires a
//    captainLines captain into createLineDuty should pass the captain by id, not by this number.
// Every line has its English (the crew's English mode: en), as the epilogue's lines do.
export const FO_FLAGS = ['fo_joined'];
export const FO_HOOKS = ['look', 'nod', 'hook'];
const SPEAKERS = { chief: { name_ja: '真壁 主任教官', color: '#ffb35c' }, instructor: { name_ja: '早瀬 教官', color: '#5cc8ff' }, player: { name_ja: 'あなた', color: '#f2b632' } };

export function joinDialogs() {
  const say = (text, en, more = {}) => ({ speaker: 'chief', text, en, ...more });
  const J = {
    // (already joined: the talk is a reminder, not an offer — the flag is set by the joining below)
    j1: say('翔洋航空への入社は、もう決まっています。型式移行の訓練は、予定表に出ていますよ。', 'Your joining SHOYO AIRWAYS is already settled. The type-rating training is on your schedule.', { if: { flag: 'fo_joined' }, else: 'j2', hook: { name: 'nod' }, end: true }),
    j2: say('卒業、おめでとう。……翔洋航空から知らせが来ています。副操縦士として、あなたを採用する、と。', 'Congratulations on your graduation. ...Word has come from SHOYO AIRWAYS. They are taking you on as a first officer.', { hook: { name: 'look', arg: 'player' }, next: 'j3' }),
    j3: say('行く先は羽田です。737 級の型式移行訓練——まず学科、それから j1 から j4 の課目、最後に型式限定チェック。受かれば、路線で右席に座ります。', 'You will be based at Haneda. The type-rating course on the 737 class — the written test first, then lessons j1 to j4, and the type-rating check at the end. Pass it, and you sit in the right seat on the line.', { next: 'j4' }),
    j4: say('覚えていますか。羽田で一度座った、あの 737 の右席。今度はあの席が、あなたの席になります。', 'Do you remember the right seat of that 737 you once sat in at Haneda? This time, that seat will be yours.', { hook: { name: 'look', arg: 'player' }, choices: [
      { text: '入社する', next: 'j:yes', effects: [{ hook: 'hook', arg: 'join' }] },
      { text: 'もう少し考えたい', next: 'j:wait' },
    ] }),
    'j:yes': say('決まりですね。ようこそ、翔洋航空へ。訓練は明日から。まずは学科の準備をしてください。', 'Then it is settled. Welcome to SHOYO AIRWAYS. Training starts tomorrow. Prepare for the written test first.', { effects: [{ set: 'fo_joined' }], hook: { name: 'nod' }, end: true }),
    'j:wait': say('急がなくて大丈夫です。空は逃げません。決めたら、また声をかけてください。席は、空けておきます。', 'There is no hurry. The sky is not going anywhere. Tell me when you have decided. We will keep the seat for you.', { hook: { name: 'nod' }, end: true }),
  };
  return { speakers: SPEAKERS, flags: [...FO_FLAGS], hooks: [...FO_HOOKS], dialogs: { join: { start: 'j1', nodes: J } } };
}

// the three line captains (S3): a short introduction each, their way of speaking, the strictness of
// their evaluation, and their briefing / debriefing lines — templates with {route} and {role} in them,
// filled by whoever shows them (captainLines.fill). debriefGood: a leg as it should be; debriefImprove:
// a leg with something to work on.
export const CAPTAINS_FO = [
  { id: 'kashiwagi', name_ja: '柏木 機長', name: '柏木', style: '厳格', strict: 1.1,
    intro: 'エピローグで右席を案内した機長。短く、正確に。手順の順序とコールアウトの言い切り方をよく見る。',
    tone: '短く断定的。ほめる言葉も短い。',
    brief: '柏木です。{route}、今日は{role}で。手順は声に出して、順序を崩さないこと。行きます。',
    debriefGood: '基準どおりだった。コールアウトも言い切れていた。この調子で。',
    debriefImprove: '手順の順序が崩れたところがあった。次は、声に出してから手を動かす。それだけで直る。' },
  { id: 'sakurai', name_ja: '桜井 機長', name: '桜井', style: '標準', strict: 1.0,
    intro: '標準的な物差しの機長。できたことと直すことを、半分ずつはっきり言う。',
    tone: '穏やかで具体的。理由まで言う。',
    brief: '桜井です。{route}、{role}でいきましょう。分からないことは、その場で聞いてください。それが一番安全です。',
    debriefGood: 'よくできていました。判断も手順も安定していましたよ。次もこの調子でいきましょう。',
    debriefImprove: '大きな問題ではありませんが、直すところは一つだけ言います。次はそこを意識してみてください。' },
  { id: 'ono', name_ja: '小野 機長', name: '小野', style: '温厚', strict: 0.9,
    intro: '温厚な機長。まず良いところを言ってから、直すところを一つだけ渡す。緊張をほぐすのが上手い。',
    tone: '柔らかく、ゆっくり。まずほめる。',
    brief: '小野です。{route}、{role}ですね。肩の力を抜いて。いつもどおりやれば大丈夫ですよ。',
    debriefGood: 'いいフライトでした。落ち着いていましたね。その調子で、楽しくいきましょう。',
    debriefImprove: 'よく頑張りました。直すところは一つだけ。焦らなくて大丈夫、次はできますよ。' },
];
// the captains and their lines, as one small data object with the lookups the game needs
export const captainLines = {
  captains: CAPTAINS_FO,
  // a captain by id (a roster item's captain field); an unknown id gets the standard captain
  byId: (id) => CAPTAINS_FO.find(c => c.id === id) || CAPTAINS_FO[1],
  // fill a template's {route} / {role} (left as they are when not given)
  fill: (text, { route = '', role = '' } = {}) => String(text || '').replaceAll('{route}', route || '{route}').replaceAll('{role}', role || '{role}'),
  // the briefing line before a leg, and the debriefing line after it (good: it went as it should)
  brief: (id, ctx = {}) => captainLines.fill(captainLines.byId(id).brief, ctx),
  debrief: (id, good, ctx = {}) => { const c = captainLines.byId(id); return captainLines.fill(good ? c.debriefGood : c.debriefImprove, ctx); },
};
