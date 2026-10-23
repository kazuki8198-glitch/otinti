// CADET — content/dialog/people.js : what the academy's other people say (M5), all fictional (content/people.js).
// One dialog each; its first nodes pick the talk by the context the game keeps up to date (ctx):
//   career { chapter: 'prologue' | 'ch1' | 'ch2', slot, day, tired (true / false), solo (done: true / false) },
//   today { flight (the lesson flown today: its id, or ''), checkride, solo, exam, decided (the go / no-go given) },
//   weather { ja, metarAm, metarPm, taf, why }.
// Hooks to the game: 'done' (a part of the day done: 'ceremony' | 'tour'), 'decide' (the go / no-go: 'go' | 'wait' |
// 'early' | 'cancel'), 'tablet' (the dispatcher hands it over), 'help' (an evening spent on a friend's studies: it
// tires), 'checkride' (to the aircraft with the chief instructor), 'look', 'nod', 'point'.
// Spoken to a cadet: polite Japanese, the staff a little formal, the cadets among themselves casual. No talk of games.
import { PEOPLE } from '../people.js';

// the context the talks read (the game fills it every time one starts; a sample for the checks)
export const SAMPLE_CTX = {
  career: { chapter: 'ch2', slot: 'am', day: 12, dayMod3: 0, tired: false, solo: false },
  today: { flight: 'a3', flightTitle: '「上昇・降下・レベルオフ」の飛行', checkride: false, solo: false, exam: false, needsDecision: true, decided: false, decisionRight: true },
  weather: { ja: '晴れ', metarAm: 'KLAB 121353Z 00405KT 10SM FEW035 19/12 A2992', metarPm: 'KLAB 121853Z 00405KT 10SM SCT045 22/12 A2992', taf: 'TAF KLAB … 01005KT P6SM FEW035', why: '視程・雲・風とも基準内です。' },
};
export const PEOPLE_HOOKS = ['done', 'decide', 'tablet', 'help', 'checkride', 'look', 'nod', 'point'];
export const PEOPLE_FLAGS = ['met_chief', 'met_dispatcher', 'met_mechanic', 'met_kiryu', 'met_asahi', 'met_mori', 'helped_mori', 'kiryu_tip', 'asahi_imsafe', 'has_tablet', 'tour_done', 'welcome_done', 'c1_briefed'];
// the flags set here that the game reads (the tablet, the people met for the prologue's end, the check ride's brief)
export const GAME_READS = ['met_chief', 'met_dispatcher', 'asahi_imsafe', 'has_tablet', 'c1_briefed'];

const SPEAKERS = Object.fromEntries([...Object.entries(PEOPLE).map(([id, p]) => [id, { name_ja: p.title, color: p.color }]), ['player', { name_ja: 'あなた', color: '#f2b632' }]]);
const ch = (c) => ({ ctx: 'career.chapter', is: c });
const flag = (f, is) => (is === undefined ? { flag: f } : { flag: f, is });

export function peopleDialogs() {
  const D = {};
  // ---------------------------------------------------------------- 真壁 主任教官
  {
    const say = (text, more = {}) => ({ speaker: 'chief', text, ...more });
    D.chief = { start: 'w1', nodes: {
      w1: say('みなさん、翔洋航空の自社養成パイロット訓練所へようこそ。主任教官の真壁です。', { if: { all: [ch('prologue'), flag('welcome_done', false)] }, else: 'c1', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'met_chief' }], next: 'w2' }),
      w2: say('今日からここで、空を飛ぶための基礎を一から身に付けてもらいます。最初は座学、それから単発機の Archer。ひとりで空へ上がる日、ファーストソロが、最初の大きな目標です。', { next: 'w3' }),
      w3: say('ここでの約束は 3 つだけです。わからないことは、わからないと言う。決められた手順は、省かない。疲れているとき、体調がよくないときは、正直に言う。', { hook: { name: 'nod' }, next: 'w4' }),
      w4: say('上手に飛ぶことより、正直であることのほうが、ずっと大事です。空では、自分をごまかした分だけ危なくなります。', { next: 'w5' }),
      w5: say('このあと運航管理の佐伯さんが、訓練所の中を案内してくれます。午後は、担当の早瀬教官と顔合わせです。', { hook: { name: 'point', arg: 'dispatch' }, next: 'w6' }),
      w6: say('同期の 3 人とも、よく話してください。ここでは、助け合える人から上手になります。……では、始めましょう。', { effects: [{ set: 'welcome_done' }, { hook: 'done', arg: 'ceremony' }], end: true }),
      c1: say('今日はソロ前の審査です。私が右の席に座ります。', { if: { ctx: 'today.checkride', is: true }, else: 'after', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'c1_briefed' }], next: 'c1:2' }),
      'c1:2': say('審査の間、私は手伝いません。何も言わないのは、あなたの判断を見るためです。いつもどおり、チェックリストと交信を省かずに。', { next: 'c1:3' }),
      'c1:3': say('離陸、上昇、水平、急旋回、失速からの回復、そして模擬のエンジン故障。最後まで、自分の言葉で操縦してください。', { choices: [
        { text: 'よろしくお願いします', next: 'c1:go' },
        { text: '少し準備してから行きます', next: 'c1:later' },
      ] }),
      'c1:go': say('機体で待っています。外部点検から、いつもどおりに。', { hook: { name: 'nod' }, effects: [{ hook: 'checkride' }], end: true }),
      'c1:later': say('わかりました。焦らなくていい。準備ができたら来てください。', { end: true }),
      after: say('ソロの日のことは、ずっと覚えているはずです。でも、明日の飛行も、同じように丁寧に。それがいちばん難しい。', { if: { ctx: 'career.solo', is: true }, else: 'ch2', hook: { name: 'nod' }, end: true }),
      ch1: say('座学はどうですか。教科書の数字は、覚えるより、なぜその数字なのかを考えると残ります。ミラー講師に、遠慮なく聞いてください。', { end: true }),
      ch2: say('早瀬教官から聞いています。毎日の点検と交信、手を抜かずに続けてください。審査では、そこを見ます。', { if: ch('ch2'), else: 'pro', hook: { name: 'look', arg: 'player' }, end: true }),
      pro: say('訓練所の中は、佐伯さんが案内します。午後は早瀬教官との顔合わせです。今日は、名前と顔を覚えるだけで十分ですよ。', { if: ch('prologue'), else: 'ch1', end: true }),
    } };
  }
  // ---------------------------------------------------------------- 佐伯さん（運航管理）
  {
    const say = (text, more = {}) => ({ speaker: 'dispatcher', text, ...more });
    const me = (text, next, more = {}) => ({ text, next, ...more });
    D.dispatcher = { start: 't1', nodes: {
      t1: say('運航管理の佐伯です。ここは、その日の予定と機体と天気を決める場所です。訓練生のみなさんも、飛ぶ前に必ず寄ってください。', { if: { all: [ch('prologue'), flag('tour_done', false)] }, else: 'wx1', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'met_dispatcher' }], next: 't2' }),
      t2: say('右の壁が今日の割り当て、隣の画面が天気です。METAR は今の天気、TAF はこれからの予報。飛ぶかどうかは、教官と、ここで一緒に決めます。', { hook: { name: 'point', arg: 'board' }, next: 't3' }),
      t3: say('それから、これを。訓練生用のタブレットです。予定、天気、航空日誌、教科書、学科の練習問題が入っています。Tab キーで開けます。', { effects: [{ give: 'tablet' }, { set: 'has_tablet' }, { hook: 'tablet' }], next: 't4' }),
      t4: say('隣のパイロットルームにヘッドセットとニーボード、北の廊下の奥がラウンジです。機体のことは、駐機場の大城さんへ。', { next: 't5' }),
      t5: say('案内はここまでです。午後は早瀬教官との顔合わせ、ブリーフィング室 1 ですね。いってらっしゃい。', { hook: { name: 'nod' }, effects: [{ set: 'tour_done' }, { hook: 'done', arg: 'tour' }], end: true }),
      wx1: say('今日の天気です。いまの METAR は「{weather.metarAm}」。午後は「{weather.metarPm}」の見込みで、TAF は「{weather.taf}」です。', { if: { all: [{ ctx: 'today.needsDecision', is: true }, { ctx: 'today.decided', is: false }] }, else: 'info:ch2', hook: { name: 'point', arg: 'weather' }, next: 'wx2' }),
      wx2: say('{today.flightTitle}の予定ですね。どうしますか。', { choices: [
        me('予定どおり行きます', 'wx:right', { effects: [{ hook: 'decide', arg: 'go' }] }),
        me('午後まで待ちます（天気の回復を待つ）', 'wx:right', { effects: [{ hook: 'decide', arg: 'wait' }] }),
        me('早めに出て、午前のうちに戻ります', 'wx:right', { effects: [{ hook: 'decide', arg: 'early' }] }),
        me('今日は飛びません', 'wx:right', { effects: [{ hook: 'decide', arg: 'cancel' }] }),
      ] }),
      'wx:right': say('私もそう思います。{weather.why}早瀬教官にも伝えておきますね。', { if: { ctx: 'today.decisionRight', is: true }, else: 'wx:wrong', hook: { name: 'nod' }, effects: [{ trust: 'dispatcher', add: 2 }], end: true }),
      'wx:wrong': say('うーん、私は違う判断です。{weather.why}今日はそれで予定を組み直します。', { effects: [{ trust: 'dispatcher', add: -1 }], end: true }),
      'info:ch2': say('今日の予定はタブレットにも出ています。機体はいつもの N738SY、19 番の場所です。天気は「{weather.ja}」。', { if: ch('ch2'), else: 'info:ch1', end: true }),
      'info:ch1': say('座学の間は、こちらに用事は少ないですね。でも天気の読み方は、今のうちに慣れておくと楽ですよ。画面の METAR、読んでみてください。', { end: true }),
    } };
  }
  // ---------------------------------------------------------------- 大城さん（整備士）
  {
    const say = (text, more = {}) => ({ speaker: 'mechanic', text, ...more });
    D.mechanic = { start: 'm1', nodes: {
      m1: say('整備の大城です。……あんたが新しい訓練生か。', { if: flag('met_mechanic', false), else: 'tip:0', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'met_mechanic' }], next: 'm2' }),
      m2: say('ひとつだけ。おかしいと思ったら、言ってくれ。勘違いでいい。言わないで飛ぶのが、いちばん困る。', { hook: { name: 'nod' }, end: true }),
      pre: say('飛ぶのはまだ先か。機体を見に来るのはいいことだ。外部点検の順番、見て覚えていくといい。', { end: true }),
      'tip:0': say('燃料のサンプは、透明な容器で光に透かして見る。水は青い燃料の下に、丸い玉になって沈む。', { if: { all: [ch('ch2'), { ctx: 'career.dayMod3', is: 0 }] }, else: 'tip:1', end: true }),
      'tip:1': say('タイヤは、空気の量だけじゃない。溝と、ひび割れ。それから、ブレーキの配管から油が漏れていないか。', { if: { all: [ch('ch2'), { ctx: 'career.dayMod3', is: 1 }] }, else: 'tip:2', end: true }),
      'tip:2': say('オイルの量は、エンジンが冷えているうちに。ゲージを拭いてから差し直して、もう一度。6 クォートを切っていたら言ってくれ。', { if: ch('ch2'), else: 'pre', end: true }),
    } };
  }
  // ---------------------------------------------------------------- 同期：桐生
  {
    const say = (text, more = {}) => ({ speaker: 'kiryu', text, ...more });
    D.kiryu = { start: 'k1', nodes: {
      k1: say('桐生です。……よろしく。', { if: flag('met_kiryu', false), else: 'solo', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'met_kiryu' }], next: 'k2' }),
      k2: say('先に言っておくけど、ソロは誰より早く出るつもりだから。競争じゃないって言われても、目標は高いほうがいい。', { end: true }),
      solo: say('ソロ、おめでとう。……正直、悔しい。でも、あの 3 回目の着陸はきれいだった。次は航法だな。負けないから。', { if: { ctx: 'career.solo', is: true }, else: 'tip', hook: { name: 'nod' }, end: true }),
      ch1: say('学科試験は、問題集を丸暗記しても駄目だよ。選択肢の「なぜ」を読む。そこに理由が全部書いてある。', { end: true }),
      tip: say('着陸のフレア、ひとつ教えとく。地面じゃなくて、滑走路の先の端を見るんだ。近くを見ると、引くのが早すぎる。', { if: { all: [ch('ch2'), flag('kiryu_tip', false)] }, else: 'ch2b', effects: [{ set: 'kiryu_tip' }], next: 'tip:2' }),
      'tip:2': say('……俺も早瀬教官に言われたんだけどね。', { end: true }),
      ch2b: say('今日の課目、どうだった？ 評価が S じゃなくても、どこが外れたかを自分で言えれば、次は直せる。', { if: ch('ch2'), else: 'ch1', end: true }),
    } };
  }
  // ---------------------------------------------------------------- 同期：朝日
  {
    const say = (text, more = {}) => ({ speaker: 'asahi', text, ...more });
    D.asahi = { start: 'a1', nodes: {
      a1: say('朝日さくらです！ よろしくね。わからないことがあったら、一緒に考えよう。', { if: flag('met_asahi', false), else: 't1', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'met_asahi' }], next: 'a2' }),
      a2: say('ここ、ラウンジのコーヒーがけっこうおいしいんだって。夜はだいたいみんなここにいるから、寄ってね。', { end: true }),
      t1: say('ねえ、顔色よくないよ。昨日も遅くまで起きてたでしょ。', { if: { ctx: 'career.tired', is: true }, else: 'solo', next: 't2' }),
      t2: say('IMSAFE の F、Fatigue。疲れてるときに飛ぶのがいちばん危ないって、真壁さんも言ってた。今日は早く寝なよ。', { effects: [{ set: 'asahi_imsafe' }], end: true }),
      solo: say('ソロおめでとう！ シャツの裾、ちゃんと壁に貼ってあったよ。私もすぐ追いつくからね。', { if: { ctx: 'career.solo', is: true }, else: 'ch2', hook: { name: 'nod' }, end: true }),
      ch1: say('英語の交信、最初は速くて全然聞き取れなかったけど、数字の言い方を覚えたら急にわかるようになったよ。niner って、かわいいよね。', { end: true }),
      ch2: say('飛ぶ日の朝、運航管理の天気、ちゃんと見てる？ 佐伯さんに「どうする？」って聞かれたとき、理由まで言えると、信頼されるんだって。', { if: ch('ch2'), else: 'ch1', end: true }),
    } };
  }
  // ---------------------------------------------------------------- 同期：森（学科で苦戦している：手伝うと CRM のできごと）
  {
    const say = (text, more = {}) => ({ speaker: 'mori', text, ...more });
    D.mori = { start: 'm1', nodes: {
      m1: say('あ、森です。よろしく……。実は、英語があんまり得意じゃなくて。ついていけるか、ちょっと不安なんだ。', { if: flag('met_mori', false), else: 'solo', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'met_mori' }], next: 'm2' }),
      m2: say('でも、飛ぶのはずっと夢だったから。がんばるよ。', { end: true }),
      solo: say('ソロ、すごいね……！ 学科のとき、助けてもらったのを思い出したよ。今度は僕の番だね。', { if: { all: [{ ctx: 'career.solo', is: true }, flag('helped_mori')] }, else: 'solo:b', end: true }),
      'solo:b': say('ソロ、おめでとう。僕も、あとに続けるようにがんばる。', { if: { ctx: 'career.solo', is: true }, else: 'ask', end: true }),
      ask: say('ねえ……もし時間があったら、学科、少し教えてくれないかな。気象のところが、どうしても頭に入らなくて。', { if: { all: [ch('ch1'), flag('helped_mori', false), { ctx: 'career.slot', is: 'evening' }] }, else: 'helped', choices: [
        { text: '今夜、一緒にやろう', next: 'yes', effects: [{ set: 'helped_mori' }, { trust: 'mori', add: 8 }, { hook: 'help' }] },
        { text: 'ごめん、今日は自分の復習で手一杯なんだ', next: 'no' },
      ] }),
      yes: say('ほんとに！？ ありがとう……！ METAR の雲の書き方から、お願いします。', { hook: { name: 'nod' }, next: 'yes:2' }),
      'yes:2': say('（ふたりで遅くまで教科書を読んだ。人に説明すると、自分のわかっていないところもよく見えた。）', { speaker: 'player', end: true }),
      no: say('そうだよね、ごめん。自分でやってみるよ。', { end: true }),
      helped: say('この前はありがとう。おかげで、気象の問題はだいぶ解けるようになったよ。', { if: flag('helped_mori'), else: 'ch1', end: true }),
      ch1: say('気象の問題、まだ半分くらいしか解けないんだ……。夜、ラウンジで復習してるよ。', { if: ch('ch1'), else: 'ch2', end: true }),
      ch2: say('失速の課目、明日なんだ……。機首を上げていくとき、手に汗かいちゃって。きみはどうだった？', { end: true }),
    } };
  }
  // ---------------------------------------------------------------- ミラー講師（授業の外で：content/dialog/school.js が授業）
  {
    const say = (text, more = {}) => ({ speaker: 'lecturer', text, ...more });
    D.lecturer = { start: 'p1', nodes: {
      p1: say('Hello! 座学を担当するミラーです。英語と日本語、半分ずつで話しますね。Don\'t worry、すぐに慣れます。', { if: ch('prologue'), else: 'ch1', hook: { name: 'look', arg: 'player' }, end: true }),
      ch1: say('授業は午前、ブリーフィング室 2。訓練装置は午後、訓練装置室で。Any questions? ……なければ、また教室で。', { if: ch('ch1'), else: 'ch2', end: true }),
      ch2: say('Good to see you! もう飛んでいるんですね。交信、教室で練習したとおりにできていますか？ Read back, always.', { end: true }),
    } };
  }
  return { speakers: SPEAKERS, flags: [...PEOPLE_FLAGS], hooks: [...PEOPLE_HOOKS], dialogs: D };
}
