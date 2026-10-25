// CADET — content/dialog/people.js : what the academy's other people say (M5), all fictional (content/people.js).
// One dialog each; its first nodes pick the talk by the context the game keeps up to date (ctx):
//   career { chapter: 'prologue' | 'ch1' … 'ch6', slot, day, tired (true / false), solo (done: true / false), flying (chapter 2
//   on), graduated },
//   today { flight (the lesson flown today: its id, or ''), checkride, checkId ('c1' | 'ir' | 'me' | 'final'), checkTitle,
//   solo, xc (the solo cross-country), exam, decided (the go / no-go given), reg / type (today's aircraft) },
//   weather { ja, metarAm, metarPm, taf, why }.
// Hooks to the game: 'done' (a part of the day done: 'ceremony' | 'tour'), 'decide' (the go / no-go: 'go' | 'wait' |
// 'early' | 'cancel'), 'tablet' (the dispatcher hands it over), 'help' (an evening spent on a friend's studies: it
// tires), 'checkride' (to the aircraft with the chief instructor), 'look', 'nod', 'point'.
// Spoken to a cadet: polite Japanese, the staff a little formal, the cadets among themselves casual. No talk of games.
import { PEOPLE } from '../people.js';

// the context the talks read (the game fills it every time one starts; a sample for the checks)
export const SAMPLE_CTX = {
  career: { chapter: 'ch2', slot: 'am', day: 12, dayMod3: 0, tired: false, solo: false, flying: true, graduated: false },
  today: { flight: 'a3', flightTitle: '「上昇・降下・レベルオフ」の飛行', checkride: false, checkId: '', checkTitle: '', graduation: false, solo: false, xc: false, exam: false, needsDecision: true, decided: false, decisionRight: true, reg: 'N738SY', type: 'Archer', stand: 19 },
  weather: { ja: '晴れ', metarAm: 'KLAB 121353Z 00405KT 10SM FEW035 19/12 A2992', metarPm: 'KLAB 121853Z 00405KT 10SM SCT045 22/12 A2992', taf: 'TAF KLAB … 01005KT P6SM FEW035', why: '視程・雲・風とも基準内です。' },
  tem: { on: true, o0: '午後の雷雨', o1: '審査の緊張', o2: '朝の霧', right: true, threat: '審査の緊張', why: '今日は審査です。緊張すると、いつもの手順が抜けます', plan: '毎日の手順のとおりに', not: '' },
};
export const PEOPLE_HOOKS = ['done', 'decide', 'tablet', 'help', 'checkride', 'look', 'nod', 'point', 'tem'];
// ('done' also takes 'graduation': the ceremony's speech heard)
export const PEOPLE_FLAGS = ['met_chief', 'met_dispatcher', 'met_mechanic', 'met_kiryu', 'met_asahi', 'met_mori', 'helped_mori', 'kiryu_tip', 'asahi_imsafe', 'has_tablet', 'tour_done', 'welcome_done', 'c1_briefed'];
// the flags set here that the game reads (the tablet, the people met for the prologue's end, the check ride's brief)
export const GAME_READS = ['met_chief', 'met_dispatcher', 'asahi_imsafe', 'has_tablet', 'c1_briefed'];

const SPEAKERS = Object.fromEntries([...Object.entries(PEOPLE).map(([id, p]) => [id, { name_ja: p.title, color: p.color }]), ['player', { name_ja: 'あなた', color: '#f2b632' }]]);
const ch = (c) => ({ ctx: 'career.chapter', is: c });
const flag = (f, is) => (is === undefined ? { flag: f } : { flag: f, is });

// (M7) TEM's three answers on a check's briefing (the hook 'tem' with the index, as the instructor's briefing)
const temChoices = (p) => [0, 1, 2].map(i => ({ text: `{tem.o${i}}`, next: p + ':a', effects: [{ hook: 'tem', arg: String(i) }] }));
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
      c1: say('今日はソロ前の審査です。私が右の席に座ります。', { if: { all: [{ ctx: 'today.checkride', is: true }, { ctx: 'today.checkId', is: 'c1' }] }, else: 'ir', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'c1_briefed' }], next: 'c1:2' }),
      'c1:2': say('審査の間、私は手伝いません。何も言わないのは、あなたの判断を見るためです。いつもどおり、チェックリストと交信を省かずに。', { next: 'c1:3' }),
      'c1:3': say('離陸、上昇、水平、急旋回、失速からの回復、そして模擬のエンジン故障。最後まで、自分の言葉で操縦してください。', { choices: [
        { text: 'よろしくお願いします', next: 'c1:go' },
        { text: '少し準備してから行きます', next: 'c1:later' },
      ] }),
      'c1:go': say('機体で待っています。外部点検から、いつもどおりに。', { hook: { name: 'nod' }, effects: [{ hook: 'checkride' }], end: true }),
      'c1:later': say('わかりました。焦らなくていい。準備ができたら来てください。', { end: true }),
      after: say('ソロの日のことは、ずっと覚えているはずです。でも、明日の飛行も、同じように丁寧に。それがいちばん難しい。', { if: { all: [{ ctx: 'career.solo', is: true }, ch('ch2')] }, else: 'ch6', hook: { name: 'nod' }, end: true }),
      // (M6) the later chapters' checks: the instrument check (ch4), the multi-engine check (ch5); the final check is the
      // examiner's
      ir: say('今日は計器飛行の審査です。私が右の席に座ります。外は雲の中、あなたはフードの下。見えるのは計器だけです。', { if: { all: [{ ctx: 'today.checkride', is: true }, { ctx: 'today.checkId', is: 'ir' }] }, else: 'me', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'c1_briefed' }], next: 'ir:2' }),
      'ir:2': say('離陸したら、部分パネル。主の姿勢表示が止まった想定で、予備の計器で飛んでもらいます。そのあと、ILS 進入。決心高度で滑走路が見えなければ、そこで判断を。', { next: 'ir:3' }),
      'ir:3': say('スキャンを止めないこと。ひとつの計器を見つめると、ほかが逃げていきます。', { choices: [
        { text: 'よろしくお願いします', next: 'chk:tem' },
        { text: '少し準備してから行きます', next: 'c1:later' },
      ] }),
      me: say('今日は双発の審査です。Seminole で、私が右の席に座ります。', { if: { all: [{ ctx: 'today.checkride', is: true }, { ctx: 'today.checkId', is: 'me' }] }, else: 'final', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'c1_briefed' }], next: 'me:2' }),
      'me:2': say('離陸の直後に、片方のエンジンを止めます。Identify、Verify、Feather。足で方向を保って、Vyse で上昇。上空でもう一度、そして片発のまま着陸です。', { next: 'me:3' }),
      'me:3': say('死んだ足は、死んだエンジン。踏んでいない側のエンジンが止まっています。……落ち着いて、声に出して確かめなさい。', { choices: [
        { text: 'よろしくお願いします', next: 'chk:tem' },
        { text: '少し準備してから行きます', next: 'c1:later' },
      ] }),
      // (M7) TEM on a later chapter's check too (ctx tem: career/tem.js, as the instructor's briefing): his own words
      'chk:tem': say('その前に、TEM を。審査の日の脅威を、ひとつ。今日いちばん気をつけることは？', { if: { ctx: 'tem.on', is: true }, else: 'chk:go', hook: { name: 'look', arg: 'player' }, choices: temChoices('chk:tem') }),
      'chk:tem:a': say('結構。{tem.why}。だから、{tem.plan}。それを言える人は、審査でも崩れません。', { if: { ctx: 'tem.right', is: true }, else: 'chk:tem:b', effects: [{ trust: 'chief', add: 1 }], hook: { name: 'nod' }, next: 'chk:go' }),
      'chk:tem:b': say('違いますね。{tem.not}。今日の脅威は「{tem.threat}」。{tem.why}。対策は、{tem.plan}。', { next: 'chk:go' }),
      'chk:go': say('機体で待っています。外部点検から、いつもどおりに。', { hook: { name: 'nod' }, effects: [{ hook: 'checkride' }], end: true }),
      final: say('今日は最終審査ですね。審査官の黒田さんが、教官室で待っています。私たちは、今日は何もしてあげられません。', { if: { all: [{ ctx: 'today.checkride', is: true }, { ctx: 'today.checkId', is: 'final' }] }, else: 'grad', hook: { name: 'look', arg: 'player' }, next: 'final:2' }),
      'final:2': say('ここで覚えたことを、全部、いつもどおりに。それで十分です。', { hook: { name: 'nod' }, end: true }),
      // the graduation (the lobby, the morning after the final check)
      grad: say('……では、始めます。今日、この訓練所での基礎訓練を、すべて修了しました。おめでとう。', { if: { ctx: 'today.graduation', is: true }, else: 'done', hook: { name: 'look', arg: 'player' }, next: 'grad:2' }),
      'grad:2': say('入社の日に、約束は 3 つだけだと言いました。わからないことは、わからないと言う。手順を省かない。疲れているときは、正直に言う。', { next: 'grad:3' }),
      'grad:3': say('あなたは、それを最後まで守りました。審査の結果より、そのことを誇りに思ってください。', { hook: { name: 'nod' }, next: 'grad:4' }),
      'grad:4': say('ここから先は、大きな機体と、もっと多くの人を乗せた空です。でも、やることは同じです。点検し、確かめ、声に出して、正直に飛ぶ。', { next: 'grad:5' }),
      'grad:5': say('修了証です。……いってらっしゃい。', { hook: { name: 'point', arg: 'player' }, choices: [{ text: 'ありがとうございました', next: 'grad:6' }] }),
      'grad:6': { speaker: 'instructor', text: 'おめでとう。最初の日、ブリーフィング室で「急がなくて大丈夫」と言ったのを覚えていますか。あなたは、一日ずつ、ちゃんと積み上げてきました。', next: 'grad:7' },
      'grad:7': { speaker: 'asahi', text: 'おめでとう！ みんなで、ここまで来れたね。', next: 'grad:8' },
      'grad:8': { speaker: 'mori', text: '最初の週、学科で泣きそうだったのが嘘みたいだ。……ありがとう。', next: 'grad:9' },
      'grad:9': { speaker: 'kiryu', text: '……次は、エアラインの訓練で会おう。そこでも、負けないから。', effects: [{ hook: 'done', arg: 'graduation' }], end: true },
      done: say('修了、おめでとう。ここでの毎日を、忘れないでください。', { if: { ctx: 'career.graduated', is: true }, else: 'after', hook: { name: 'nod' }, end: true }),
      ch6: say('最終審査が近いですね。審査官は何も言いません。でも、全部見ています。準備は、いつもどおりで十分です。', { if: { all: [ch('ch6'), { ctx: 'career.graduated', is: false }] }, else: 'ch5', hook: { name: 'look', arg: 'player' }, end: true }),
      ch5: say('Seminole は重く、速い。そして、エンジンが止まったときに、片方へ強く引かれます。Vmc の赤い線、絶対に忘れないように。', { if: ch('ch5'), else: 'ch4', end: true }),
      ch4: say('計器飛行で大事なのは、体の感覚を疑うことです。体が「傾いている」と言っても、姿勢表示が水平なら、水平です。', { if: ch('ch4'), else: 'ch3', end: true }),
      ch3: say('航法の段階ですね。地図、時計、コンパス。迷ったら、まず落ち着いて、最後に確かだった場所から考える。', { if: ch('ch3'), else: 'ch2', end: true }),
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
      t3: say('それから、これを。訓練生用のタブレットです。予定、天気、航空日誌、教科書、学科の練習問題が入っています。毎朝、まずこれで今日の予定を確かめてください。', { effects: [{ give: 'tablet' }, { set: 'has_tablet' }, { hook: 'tablet' }], next: 't4' }),
      t4: say('隣のパイロットルームにヘッドセットとニーボード、北の廊下の奥がラウンジです。機体のことは、駐機場の大城さんへ。', { next: 't5' }),
      t5: say('案内はここまでです。午後は早瀬教官との顔合わせ、ブリーフィング室 1 ですね。いってらっしゃい。', { hook: { name: 'nod' }, effects: [{ set: 'tour_done' }, { hook: 'done', arg: 'tour' }], end: true }),
      wx1: say('今日の天気です。いまの METAR は「{weather.metarAm}」。午後は「{weather.metarPm}」の見込みで、TAF は「{weather.taf}」です。', { if: { all: [{ ctx: 'today.needsDecision', is: true }, { ctx: 'today.decided', is: false }] }, else: 'info:grad', hook: { name: 'point', arg: 'weather' }, next: 'wx2' }),
      wx2: say('{today.flightTitle}の予定ですね。どうしますか。', { choices: [
        me('予定どおり行きます', 'wx:right', { effects: [{ hook: 'decide', arg: 'go' }] }),
        me('午後まで待ちます（天気の回復を待つ）', 'wx:right', { effects: [{ hook: 'decide', arg: 'wait' }] }),
        me('早めに出て、午前のうちに戻ります', 'wx:right', { effects: [{ hook: 'decide', arg: 'early' }] }),
        me('今日は飛びません', 'wx:right', { effects: [{ hook: 'decide', arg: 'cancel' }] }),
      ] }),
      'wx:right': say('私もそう思います。{weather.why}早瀬教官にも伝えておきますね。', { if: { ctx: 'today.decisionRight', is: true }, else: 'wx:wrong', hook: { name: 'nod' }, effects: [{ trust: 'dispatcher', add: 2 }], end: true }),
      'wx:wrong': say('うーん、私は違う判断です。{weather.why}今日はそれで予定を組み直します。', { effects: [{ trust: 'dispatcher', add: -1 }], end: true }),
      'info:ch2': say('今日の予定はタブレットにも出ています。機体は {today.reg}（{today.type}）、19 番の場所です。天気は「{weather.ja}」。', { if: { ctx: 'career.flying', is: true }, else: 'info:ch1', end: true }),
      'info:grad': say('修了、おめでとうございます。予定表から名前が消えるの、ちょっと寂しいですね。', { if: { ctx: 'career.graduated', is: true }, else: 'info:ch2', end: true }),
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
      'tip:0': say('燃料のサンプは、透明な容器で光に透かして見る。水は青い燃料の下に、丸い玉になって沈む。', { if: { all: [{ ctx: 'today.type', is: 'Archer' }, { ctx: 'career.flying', is: true }, { ctx: 'career.dayMod3', is: 0 }] }, else: 'tip:1', end: true }),
      'tip:1': say('タイヤは、空気の量だけじゃない。溝と、ひび割れ。それから、ブレーキの配管から油が漏れていないか。', { if: { all: [{ ctx: 'today.type', is: 'Archer' }, { ctx: 'career.flying', is: true }, { ctx: 'career.dayMod3', is: 1 }] }, else: 'tip:2', end: true }),
      'tip:2': say('オイルの量は、エンジンが冷えているうちに。ゲージを拭いてから差し直して、もう一度。6 クォートを切っていたら言ってくれ。', { if: { all: [{ ctx: 'today.type', is: 'Archer' }, { ctx: 'career.flying', is: true }] }, else: 'sem:0', end: true }),
      // (M6) the Seminole
      'sem:0': say('Seminole は、点検するところが倍だ。エンジン 2 つ、プロペラ 2 つ。それに、引っ込む脚。脚の収納部に、油や鳥の巣がないか、しゃがんで見てくれ。', { if: { all: [{ ctx: 'today.type', is: 'Seminole' }, { ctx: 'career.dayMod3', is: 0 }] }, else: 'sem:1', end: true }),
      'sem:1': say('左右のプロペラは、逆に回る。どっちのエンジンが止まっても、同じだけ曲がるようにな。……それでも、止まれば重い。', { if: { all: [{ ctx: 'today.type', is: 'Seminole' }, { ctx: 'career.dayMod3', is: 1 }] }, else: 'sem:2', end: true }),
      'sem:2': say('静圧孔のテープ、洗機のあとに貼りっぱなしのことがある。あれで高度計が狂って、何人も青くなってる。', { if: { ctx: 'today.type', is: 'Seminole' }, else: 'grad', end: true }),
      grad: say('修了か。……おめでとう。最後まで、点検で手を抜かなかったな。それがいちばんだ。', { if: { ctx: 'career.graduated', is: true }, else: 'pre', hook: { name: 'nod' }, end: true }),
    } };
  }
  // ---------------------------------------------------------------- 同期：桐生
  {
    const say = (text, more = {}) => ({ speaker: 'kiryu', text, ...more });
    D.kiryu = { start: 'k1', nodes: {
      k1: say('桐生です。……よろしく。', { if: flag('met_kiryu', false), else: 'solo', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'met_kiryu' }], next: 'k2' }),
      k2: say('先に言っておくけど、ソロは誰より早く出るつもりだから。競争じゃないって言われても、目標は高いほうがいい。', { end: true }),
      solo: say('ソロ、おめでとう。……正直、悔しい。でも、あの 3 回目の着陸はきれいだった。次は航法だな。負けないから。', { if: { all: [{ ctx: 'career.solo', is: true }, ch('ch2')] }, else: 'tip', hook: { name: 'nod' }, end: true }),
      ch1: say('学科試験は、問題集を丸暗記しても駄目だよ。選択肢の「なぜ」を読む。そこに理由が全部書いてある。', { end: true }),
      tip: say('着陸のフレア、ひとつ教えとく。地面じゃなくて、滑走路の先の端を見るんだ。近くを見ると、引くのが早すぎる。', { if: { all: [ch('ch2'), flag('kiryu_tip', false)] }, else: 'ch2b', effects: [{ set: 'kiryu_tip' }], next: 'tip:2' }),
      'tip:2': say('……俺も早瀬教官に言われたんだけどね。', { end: true }),
      ch2b: say('今日の課目、どうだった？ 評価が S じゃなくても、どこが外れたかを自分で言えれば、次は直せる。', { if: ch('ch2'), else: 'ch3', end: true }),
      ch3: say('野外飛行の航法ログ、風の計算を三角形で書くと間違えない。俺は 3 回、計算をやり直したよ。……完璧にしたいから。', { if: ch('ch3'), else: 'ch4', end: true }),
      ch4: say('フードの下だと、旋回のあと体がずっと傾いてる気がするんだ。姿勢表示を信じろって言われても、気持ち悪いよな。', { if: ch('ch4'), else: 'ch5', end: true }),
      ch5: say('Seminole の片発、Vmc のデモで機首が持っていかれたときは、さすがに声が出た。……あれは、本物の機体で絶対やりたくない。', { if: ch('ch5'), else: 'ch6', end: true }),
      ch6: say('最終審査か。お前とどっちが先かと思ってたけど、もう、そういうのはいいや。……ふたりとも受かればいい。', { if: { all: [ch('ch6'), { ctx: 'career.graduated', is: false }] }, else: 'grad', hook: { name: 'nod' }, end: true }),
      grad: say('修了おめでとう。……正直、最初は負けたくないってだけだった。今は、一緒に飛べたらいいと思ってる。', { if: { ctx: 'career.graduated', is: true }, else: 'ch1', end: true }),
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
      solo: say('ソロおめでとう！ シャツの裾、ちゃんと壁に貼ってあったよ。私もすぐ追いつくからね。', { if: { all: [{ ctx: 'career.solo', is: true }, ch('ch2')] }, else: 'ch3', hook: { name: 'nod' }, end: true }),
      ch3: say('野外飛行の途中で、目的地を変えろって言われたの！ 頭が真っ白になったけど、地図に線を引き直したら、ちゃんと着いたよ。落ち着けば、できるんだね。', { if: ch('ch3'), else: 'ch4', end: true }),
      ch4: say('雲の中の ILS、きれいだったよ……。決心高度の少し前で、ふっと滑走路の灯りが見えるの。あれは、ずっと覚えてると思う。', { if: ch('ch4'), else: 'ch5', end: true }),
      ch5: say('Seminole の右の席、教官がすっごく静かで逆に怖かった（笑）。双発は、手順を声に出すと落ち着くよ。', { if: ch('ch5'), else: 'ch6', end: true }),
      ch6: say('最終審査の前の夜は、早く寝ること！ IMSAFE の F、最後まで忘れないでね。', { if: { all: [ch('ch6'), { ctx: 'career.graduated', is: false }] }, else: 'grad', hook: { name: 'nod' }, end: true }),
      grad: say('修了おめでとう！ 写真、撮ろうよ。みんなで。ここに来た日のロビーで。', { if: { ctx: 'career.graduated', is: true }, else: 'ch2', end: true }),
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
      solo: say('ソロ、すごいね……！ 学科のとき、助けてもらったのを思い出したよ。今度は僕の番だね。', { if: { all: [{ ctx: 'career.solo', is: true }, flag('helped_mori'), ch('ch2')] }, else: 'solo:b', end: true }),
      'solo:b': say('ソロ、おめでとう。僕も、あとに続けるようにがんばる。', { if: { all: [{ ctx: 'career.solo', is: true }, ch('ch2')] }, else: 'grad', end: true }),
      // (M6) the later chapters: he catches up, and then helps
      grad: say('修了、おめでとう。……最初の夜、気象の問題を一緒にやってくれたこと、ずっと忘れない。', { if: { all: [{ ctx: 'career.graduated', is: true }, flag('helped_mori')] }, else: 'grad:b', end: true }),
      'grad:b': say('修了、おめでとう。……ここまで来られたなんて、まだ信じられないよ。', { if: { ctx: 'career.graduated', is: true }, else: 'ch3', end: true }),
      ch3: say('僕もソロに出られたよ！ ……3 週間遅れたけど。航法は、意外と得意みたい。地図を見るのは昔から好きだったんだ。', { if: ch('ch3'), else: 'ch4', end: true }),
      ch4: say('計器飛行、わりと好きなんだ。順番どおりに見て、順番どおりに直す。学科の勉強と同じだから。……教えようか？', { if: ch('ch4'), else: 'ch5', end: true }),
      ch5: say('Seminole の手順、カードにまとめてみたんだ。片発のときの順番、Mixture、Props、Throttles、Flaps、Gear……。よかったら使って。', { if: ch('ch5'), else: 'ch6', end: true }),
      ch6: say('最終審査、緊張するね。でも、きみが教えてくれたみたいに、ひとつずつやれば大丈夫だと思う。', { if: { all: [ch('ch6'), { ctx: 'career.graduated', is: false }] }, else: 'ask', end: true }),
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
      ch2: say('Good to see you! もう飛んでいるんですね。交信、教室で練習したとおりにできていますか？ Read back, always.', { if: { ctx: 'career.graduated', is: false }, else: 'grad', end: true }),
      grad: say('Congratulations! 最初の授業で、niner の言い方に苦労していたのを覚えています。今は、立派なパイロットの英語ですよ。', { hook: { name: 'nod' }, end: true }),
    } };
  }
  // ---------------------------------------------------------------- 黒田 審査官（M6：最終審査）
  {
    const say = (text, more = {}) => ({ speaker: 'examiner', text, ...more });
    D.examiner = { start: 'x1', nodes: {
      x1: say('審査官の黒田です。今日の最終審査を担当します。', { if: { all: [{ ctx: 'today.checkride', is: true }, { ctx: 'today.checkId', is: 'final' }] }, else: 'x9', hook: { name: 'look', arg: 'player' }, effects: [{ set: 'c1_briefed' }], next: 'x2' }),
      x2: say('機体は Seminole。離陸、上空での片発停止、そして片発のままの進入と着陸。管制との交信、チェックリスト、判断。全部を見ます。', { next: 'x3' }),
      x3: say('審査の間、私は何も言いません。手伝いもしません。私を乗客だと思ってください。', { next: 'x4' }),
      x4: say('ひとつだけ。わからないとき、迷ったときは、そう言って、安全なほうを選びなさい。それも審査のうちです。', { choices: [
        { text: 'よろしくお願いします', next: 'x:tem' },
        { text: '少し準備してから行きます', next: 'x:later' },
      ] }),
      // (M7) the examiner asks for the TEM too, and only notes the answer
      'x:tem': say('出発前に、TEM を聞きます。今日の脅威を、ひとつ挙げてください。', { if: { ctx: 'tem.on', is: true }, else: 'x:go', hook: { name: 'look', arg: 'player' }, choices: temChoices('x:tem') }),
      'x:tem:a': say('……「{tem.threat}」。記録しておきます。対策も、言葉にしてありますね。', { if: { ctx: 'tem.right', is: true }, else: 'x:tem:b', next: 'x:go' }),
      'x:tem:b': say('……そうですか。{tem.not}。私なら「{tem.threat}」を挙げます。{tem.why}。記録しておきます。', { next: 'x:go' }),
      'x:go': say('機体で待っています。', { hook: { name: 'nod' }, effects: [{ hook: 'checkride' }], end: true }),
      'x:later': say('わかりました。時間は十分にあります。', { end: true }),
      x9: say('……。', { if: { ctx: 'career.graduated', is: true }, else: 'x10', next: 'x9:2' }),
      'x9:2': say('審査の飛行は、よいものでした。……あなたの右の席に、いつか乗客として座る日を、楽しみにしています。', { hook: { name: 'nod' }, end: true }),
      x10: say('審査は終わりました。結果は真壁さんから聞いてください。', { end: true }),
    } };
  }
  return { speakers: SPEAKERS, flags: [...PEOPLE_FLAGS], hooks: [...PEOPLE_HOOKS], dialogs: D };
}
