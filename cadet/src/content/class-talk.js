// CADET — content/class-talk.js : what ミラー 講師 says around the textbook in a class, so that no two days and no two
// sections sound the same (the brief's §7: a wording of the class's frame said 8 times or more in chapter 1 read in
// full is a frame repeating). Each list is said in turn: say(list, n) takes the n-th (n: where in chapter 1 it is said
// — the section's place among all of part 1's, and the k-th time within it), so that across the 59 sections each
// wording comes back at most about 6 times. Sentences are whole: each item is one sentence (a 。 inside would make its
// halves patterns of their own), and an item that names something puts it in the same sentence.
// Also here: each day's own start, its afternoon's preview and its goodbye (CLASS_DAY, by class), each training device
// lesson's start (FTD_DAY), each chapter's introduction (CHAPTER_INTRO), the questions read off the figures (FIG_ASKS)
// and the answers to choose from for 考えてみよう (THINK_CHOICES). Facts as the textbook says them (each figure's
// question is read off the figure and its caption on the screen).
export const say = (list, n) => list[((Math.floor(n) % list.length) + list.length) % list.length];

// ---- a section's title (t: the title in quotes)
export const TITLE = [
  (t) => `次は${t}です。`, (t) => `続いて${t}に進みます。`, (t) => `では${t}を見ていきましょう。`, (t) => `今度は${t}です。`,
  (t) => `${t}の節に入ります。`, (t) => `ここから${t}を読みます。`, (t) => `次の節、${t}。`, (t) => `${t}に移りましょう。`,
  (t) => `続けて${t}です。`, (t) => `さて、${t}です。`,
];
// 要点だけ: a section's title, said with its first key point (t: in quotes)
export const QUICK_TITLE = [
  (t) => `${t}、要点を言います。`, (t) => `${t}の要点です。`, (t) => `次は${t}。`, (t) => `${t}を短く。`, (t) => `続いて${t}。`,
  (t) => `${t}について。`, (t) => `${t}、ポイントだけ。`, (t) => `では${t}。`, (t) => `${t}のまとめです。`, (t) => `今度は${t}。`,
];
export const TITLE_FIRST = [(t) => `最初は${t}です。`, (t) => `まずは${t}から。`, (t) => `${t}から始めます。`];
export const TITLE_LAST = [(t) => `最後は${t}です。`, (t) => `最後の節、${t}に入ります。`, (t) => `締めくくりは${t}です。`];
// a heading inside a section (t: in quotes)
export const SUB = [(t) => `ここからは${t}です。`, (t) => `話は${t}に移ります。`, (t) => `次の小見出しは${t}。`];

// ---- the prediction at a section's start (the lecturer's check moved there: not scored, answered at the end)
export const PRED = [
  '読む前に、予想してみてください。', 'まず予想です。', '始める前に、あなたの考えを聞かせてください。', '直感でかまいません。',
  '先に考えてから読みましょう。', 'ここで一つ、予想です。', '答えは節の最後に言います。', '当てずっぽうでも大丈夫です。',
  '読む前に、一つ聞きます。', '最初に予想を立てましょう。',
];
// "I don't know" (praised: 真壁 主任教官's first promise)
export const DUNNO = [
  'わかりません', 'まだわかりません', '今はわかりません', '見当がつきません', 'わかりません、教えてください',
  '正直、わかりません', 'うーん、わかりません', 'わからないです', 'ちょっとわかりません', '考えたけれど、わかりません',
];
export const ACK = [
  'OK. 答えは節の最後で確かめましょう。', 'わかりました、答え合わせはこの節の終わりにします。', 'その予想を覚えておいてください。',
  'なるほど、では読みながら確かめていきましょう。', 'いいですね、合っているかどうかは最後にわかります。', 'Good. 理由を考えながら聞いてください。',
  'その考えで、聞いてみてください。', 'はい、答えは節の終わりで。', '覚えておきますね、では始めます。', 'では、本文で確かめましょう。',
];
export const PRAISE = [
  'わからないと言えるのは大事なことです、真壁 主任教官の約束どおりですね。', '正直でいいですね、わからないところが今日覚えるところです。',
  'それでいいんです、空の上でもわからないときは「わからない」と言います。', 'Good. わからないと言えるのは、パイロットの大事な力です。',
  'ありがとう、知らないことを知っているのが安全の始まりです。', 'わからないままにしなければ大丈夫、最後に答えを言います。',
  '素直でいいですね、この節でわかるようになります。', 'わかったふりより、ずっといい答えです。',
  'いい答えです、知らないと言える人はすぐ覚えます。', 'わからないことを、わからないと言う、それで十分です。',
];
// the answer at the section's end (x: the right answer in quotes), by what was chosen
export const REVEAL_OK = [
  (x) => `予想どおり、答えは${x}でした。`, (x) => `さっきの予想は当たりで、${x}です。`, (x) => `最初の問いの答えは${x}、合っていましたね。`,
  (x) => `Nice. 予想した${x}が正解です。`, (x) => `答え合わせをすると、${x}で正解でした。`, (x) => `そうです、${x}でした。`,
  (x) => `あなたの予想の${x}で合っています。`, (x) => `正解は${x}、最初から見えていましたね。`, (x) => `${x}と予想したのは正しかったです。`,
  (x) => `Exactly. 答えは${x}です。`,
];
export const REVEAL_NG = [
  (x) => `最初の問いの答えは${x}です。`, (x) => `予想は外れましたが、答えは${x}です。`, (x) => `答え合わせをすると、正しくは${x}でした。`,
  (x) => `さっきの問いは、${x}が正解です。`, (x) => `答えは${x}、ここで覚え直しましょう。`, (x) => `惜しい、正解は${x}です。`,
  (x) => `本当は${x}なんです。`, (x) => `${x}が答えでした、外れたところこそ覚えやすいところです。`, (x) => `予想と違いましたね、答えは${x}です。`,
  (x) => `正しい答えは${x}でした。`,
];
export const REVEAL_DK = [
  (x) => `さっきわからなかった問いの答えは${x}です。`, (x) => `最初の問いの答えは${x}でした、いまはわかりますね。`,
  (x) => `答えは${x}、これでわからないが一つ減りました。`, (x) => `わからないと言った問いの答えは${x}です。`, (x) => `では答えです、${x}。`,
  (x) => `節の初めの問いは、${x}が正解でした。`, (x) => `お待たせしました、答えは${x}です。`, (x) => `${x}、これが最初の問いの答えです。`,
  (x) => `わからなかったところは${x}でした。`, (x) => `答えを言いますね、${x}です。`,
];
// the classmates (P1): 桐生 says his answer to the prediction first (x: in quotes) — the lecturer then asks the cadet; when
// he was wrong, a word at the answer; 森 asks a beginner's question before the lecturer's note on a common mistake
export const KIRYU_GUESS = [
  (x) => `${x}、ですね。`, (x) => `${x}だと思います。`, (x) => `たぶん${x}です。`, (x) => `${x}。迷いませんでした。`, (x) => `答えは${x}でしょう。`,
  (x) => `${x}……のはずです。`, (x) => `俺は${x}だと思う。`, (x) => `${x}に決まってますよ。`,
];
export const PRED_YOU = ['あなたはどう思いますか？', '桐生さんの答えを聞いて、あなたは？', 'では、あなたの予想は？', '同じですか、違いますか？', 'あなたも選んでください。', 'あなたなら、どれにしますか？'];
export const KIRYU_MISS = ['……そっちか。', 'くそ、引っかかった。', '……次は外さない。', 'なるほど、そういうことか。', '逆だったか。', '今のは悔しいな。'];
// (b: what the note says is done wrong, as the cadet's friend would say it; x: a belief in quotes)
export const MORI_DO = [(b) => `先生、${b}のは、だめなんですか？`, (b) => `あの……${b}のって、まずいんでしょうか？`, (b) => `僕、${b}かもしれません……。それって、いけないんですか？`, (b) => `すみません、${b}のは間違いなんですか？`];
export const MORI_THINK = [(x) => `${x}……じゃないんですか？`, (x) => `僕、${x}と思っていました。違うんですか？`];
// the end of a section (t: its title in quotes; R / B / Q then say: again, the textbook, a break)
export const END = [
  (t) => `${t}はここまでです。`, (t) => `${t}は、これでおしまいです。`, (t) => `これで${t}は終わりです。`, (t) => `${t}はここまで。`,
  (t) => `以上が${t}です。`, (t) => `${t}を読み終えました。`, (t) => `ここまでが${t}でした。`, (t) => `${t}は以上です。`,
  (t) => `${t}、終わりです。`, (t) => `はい、${t}はここまでにします。`,
];
// ここが大切 (said before the box's first point)
export const KEY = [
  'ここが大切です。', '大事なところです。', 'ここは覚えてください。', 'ここは、しっかり押さえてください。', '一番大切なのは、ここです。',
  'ポイントをまとめます。', 'ここが要点です。', 'これだけは覚えて帰ってください。', '要点です。', '大切なことを言います。',
];

// ---- the screen: a table (read row by row), the radio's examples, a figure
export const TABLE_ANN = ['画面の表を見てください。', '表を画面に出します。', '表にまとめてあります。', '画面に表があります。', '表で整理しましょう。'];
export const RADIO_ANN = ['画面の交信の例を聞いてください。', '交信の例を、順に流します。', '例の交信を聞いてみましょう。'];
export const FIG_ANN = ['画面の図を見てください。', '図で見てみましょう。', '画面に図を出します。', '図を使って説明します。'];
export const EX_ANN = ['画面の例を聞いてください。', '例を声に出してみます。'];
// a question read off the table on the screen (r: the row's name, h: the column's, both in quotes)
export const TABLE_ASK = [
  (r, h) => `画面の表で、${r}の${h}は何ですか？`, (r, h) => `表の${r}の行、${h}の列には何とありますか？`,
  (r, h) => `表から読み取ってください、${r}の${h}は？`, (r, h) => `画面の表の${r}は、${h}が何になっていますか？`,
  (r, h) => `表の中で${r}を探してください、その${h}は？`, (r, h) => `表を使って答えてください、${r}の${h}はどれですか？`,
  (r, h) => `${r}の行を見て、${h}を答えてください。`, (r, h) => `表で確かめます、${r}について${h}は？`,
  (r, h) => `画面の表を読んで、${r}の${h}を選んでください。`, (r, h) => `${h}の列で、${r}に当たるのはどれですか？`,
];
// the other way round: which row says this (v: the cell in quotes, h: the first column's name in quotes, or '')
export const TABLE_WHICH = [
  (v, h) => `画面の表で、${v}とあるのは${h || 'どの行'}ですか？`, (v, h) => `表を見てください、${v}に当たる${h || 'もの'}は？`,
  (v, h) => `${v}と書いてあるのは、表のどの${h || '行'}でしょう？`, (v, h) => `表から探してください、${v}はどれのことですか？`,
  (v, h) => `表の中で${v}になっている${h || 'もの'}を選んでください。`, (v, h) => `画面の表によると、${v}なのはどれですか？`,
];
// what a call of the example just heard meant (e: the English in quotes)
export const RADIO_ASK = [
  (e) => `いまの例で、${e}は何という意味でしたか？`, (e) => `聞いた交信のうち、${e}の意味は？`, (e) => `画面の例の${e}、何と言っていましたか？`,
];
// right and wrong at a question of the screen or a check (v: the right answer, said plainly in the sentence — a word, a
// phrase or a sentence: so after は or a colon; a particle after it spaced only after a Latin word or a number)
const sp = (v) => (/[A-Za-z0-9”"]$/.test(String(v)) ? ' ' : '');
export const RIGHT = [
  (v) => `そうです、答えは ${v}。`, (v) => `合っています、正解は ${v}。`, (v) => `Good. 正解：${v}。`, (v) => `正解です、${v}。`,
  (v) => `That's it. 答え：${v}。`, (v) => `はい、正解は ${v}。`, (v) => `Right. 答えは ${v}。`, (v) => `そのとおり、${v}。`,
];
export const WRONG = [
  (v) => `正しくは、${v}。`, (v) => `ここは、答えは ${v}。`, (v) => `ここの答えは ${v}。`, (v) => `答えは ${v}${sp(v)}でした。`,
  (v) => `惜しいですね、正解は ${v}。`, (v) => `正しい答えは ${v}。`, (v) => `覚えておいてください、答えは ${v}。`, (v) => `違います、正解は ${v}。`,
];
// (read off the screen: said so)
export const SEEN_RIGHT = [
  (v) => `正しく読めています、答えは ${v}。`, (v) => `よく見ていますね、答えは ${v}。`, (v) => `画面のとおり、${v}。`, (v) => `読み取れましたね、${v}。`,
  (v) => `そうです、画面では ${v}。`, (v) => `Good. 画面の答えは ${v}。`,
];
export const SEEN_WRONG = [
  (v) => `よく見ると、答えは ${v}。`, (v) => `もう一度見てください、答えは ${v}。`, (v) => `画面では、${v}${sp(v)}になっています。`, (v) => `見直すと、答えは ${v}。`,
  (v) => `惜しい、画面の答えは ${v}。`, (v) => `画面をよく見ると ${v}${sp(v)}です。`,
];
// a check in the middle of a section, on what was just said (not scored)
export const CHECK = [
  'いまのところを確かめます。', 'ここで一つ聞きます。', '聞いたばかりのことです。', '忘れないうちに、一問。', 'では、あなたに聞きます。',
  '今の話から一つ。', 'ちょっと確認させてください。', '少し止まって、思い出してみましょう。', 'ここまでのところで質問です。',
  '一つ答えてみてください。', '今のは大事なので、聞きますね。', 'すぐに使う話です。', 'ここで手を止めて、一問。', 'さっきの話を確かめましょう。',
];
// a question from a section heard earlier (where this one has none to ask yet)
export const RECALL = ['少し前の話を思い出してください。', 'ここで、前の節から一問。', '前に習ったことを確かめます。', '前の話とつながります。', '思い出せますか。', '覚えているか確かめます。'];
// 考えてみよう
export const THINK = ['考えてみましょう。', 'ここで考えてみてください。', '少し考えてみましょう。'];
export const THINK_PICK = ['どれだと思いますか？', 'では、答えを選んでみてください。', '候補から選んでください。'];
export const THINK_ANSWER = ['答えです。', '答えを言います。', '考え方を言いますね。'];

// ---- the chapters' questions (scored)
export const QUIZ_HEAD = [(k, n) => `${n} 問のうち ${k} 問目。`, (k, n) => `第 ${k} 問（${n} 問中）。`, (k, n) => `問題 ${k}。`, (k, n) => `${k} つ目の問題です。`];
export const QUIZ_OK = ['正解です。', 'Correct. ', 'That\'s right. ', '合っています。'];
export const QUIZ_NG = [(x) => `正しくは${x}です。`, (x) => `答えは${x}です。`, (x) => `ここは${x}が正解です。`, (x) => `${x}が正しい答えでした。`];
export const CHECK_HEAD = [(n, m) => `第 ${n} 章の確認に、${m} 問答えてください。`, (n, m) => `ここで第 ${n} 章から ${m} 問です。`,
  (n, m) => `第 ${n} 章が終わったので、確認の ${m} 問をします。`, (n, m) => `では、第 ${n} 章について ${m} 問。`];
export const CHECK_NONE = [(n) => `第 ${n} 章はここまでです。`, (n) => `第 ${n} 章は以上です。`];

// ---- a chapter's start (c: { n, title in quotes }, s: how many sections)
export const CHAPTER_INTRO = {
  aero: (c, s) => `第 ${c.n} 章${c.title}、${s} 節で、飛行機が飛ぶ理由から失速、旋回、速度の制限まで見ます。`,
  sys: (c, s) => `まず第 ${c.n} 章${c.title}、${s} 節、これから毎日乗る Archer の中身です。`,
  perf: (c, s) => `続く第 ${c.n} 章は${c.title}、${s} 節、暑い日や重い日に機体の何が変わるかを見ます。`,
  radio1: (c, s) => `今日は第 ${c.n} 章${c.title}から、${s} 節で誰とどうやって話すのかを見ます。`,
  radio2: (c, s) => `Next, 第 ${c.n} 章${c.title}、${s} 節、k3 の数字とアルファベットはここから出ます。`,
  radio3: (c, s) => `第 ${c.n} 章${c.title}、${s} 節、どの交信にも使う型です。`,
  radio4: (c, s) => `次は第 ${c.n} 章${c.title}で、${s} 節が 1 回の飛行の順に並んでいます。`,
  wx: (c, s) => `第 ${c.n} 章${c.title}、${s} 節、飛ぶか飛ばないかを決める材料です。`,
  radio5: (c, s) => `後半は第 ${c.n} 章${c.title}の ${s} 節、ふだんと違うときの交信です。`,
  law: (c, s) => `第 ${c.n} 章${c.title}、${s} 節で、守る規則と入ってよい空域を確かめます。`,
  hf: (c, s) => `最後の第 ${c.n} 章は${c.title}、${s} 節、パイロット自身の話です。`,
};

// ---- each class's day: its own start (the day's purpose and the afternoon's lesson), the review's lead, the pace's
// question, the afternoon's preview, the goodbye. (By class: the classes come on their days, career/career.js CLASSES)
export const CLASS_DAY = [
  { hello: ['Good morning. 今日から授業です、第 1 章で飛行機がなぜ飛ぶのかを見ていきます。', '今日の 4 つの力は、午後の k1「G1000 型 PFD の読み方」で、画面の姿勢と速度と高度として見えてきます。'],
    pace: '最初に、進め方を選んでください。時間は、読む速さの目安です。',
    preview: ['午後は訓練装置室で k1 です。今日の 4 つの力のつり合いが、PFD の姿勢表示と速度でどう見えるか確かめてください。', '初飛行の a1 も、この 4 つの力から始まります。'],
    bye: 'Good job. 授業の初日、おつかれさまでした。午後の訓練装置室で会いましょう。' },
  { hello: ['おはようございます。今日は機体の中身と性能、第 2 章と第 3 章です。', '午後の k2 は PFD の読み取りです。今日のピトー管と静圧孔の節で、速度と高度がどこから来るのかがわかります。'],
    review: '始める前に、昨日の第 1 章を少し思い出しましょう。',
    pace: '今日はどのくらいの速さで進めましょうか？ 時間は目安です。',
    preview: ['午後の k2 では、PFD の画面を 10 枚読みます。左が速度、右が高度、今日のピトー静圧から来る数字です。'],
    bye: 'That\'s it for today. 数字の多い日でしたね。午後、訓練装置室で待っています。' },
  { hello: ['Hello, everyone. 今日から無線です、第 6 章で交信のしくみ、第 7 章でアルファベットと数字の言い方を習います。', '午後の k3 は、その数字とアルファベットの言い方の 10 問です。'],
    review: '無線の前に、機体と性能の復習を少し。',
    pace: '進め方はどうしますか？ 午後の課目に要るところだけでも大丈夫です。',
    preview: ['午後の k3 は 10 問です。高度、針路、周波数、それにアルファベット、今日の言い方のとおりに答えてください。'],
    bye: 'Nice work. Alfa、Bravo、Charlie、帰り道に口に出してみてください。' },
  { hello: ['Morning! 今日は交信の型と、1 回の飛行の交信の流れ、第 8 章と第 9 章です。', '午後の k4 では、あなたがパイロット、わたしが管制官になって、初飛行と同じ交信を机の上で飛びます。'],
    review: '最初に、昨日の言い方を覚えているか確かめます。',
    pace: '今日の 2 章、どのペースで行きますか？',
    preview: ['午後の k4 は交信のチェアフライトです。ATIS、Ground、Tower、今日の第 9 章の流れを LAB の初飛行で練習します。', '教科書の例の空港は、名前が同じでも配置が違います（西のエプロン）。この訓練所では東エプロンと誘導路 Alpha を使います。'],
    bye: 'Well done. 交信は声に出すと身につきます、午後にまた。' },
  { hello: ['おはようございます。今日は第 4 章の天気と、第 10 章の管制塔のない空港や緊急の交信です。', '午後の k5 は復唱と応答の 10 問、これまでに習った場面から出ます。'],
    review: '天気の前に、交信の型を一つ二つ思い出しましょう。',
    pace: 'どう進めましょうか？ 時間は、話を聞く速さの目安です。',
    preview: ['午後の k5 は復唱と応答の 10 問です。第 8 章の復唱の型を思い出しながら答えてください。'],
    bye: 'Great. 明日の朝は、タブレットの天気を自分で読んでから来てください。' },
  { hello: ['Good morning. 座学の最後は、第 5 章の規則と空域、第 11 章の人間の能力と判断です。', '午後の k6 は英語の聞き取りです。座学が終わったら学科試験、そのあとが初飛行です。'],
    review: '最後の授業の前に、これまでの問題から少し。',
    pace: '最後の授業です。進め方を選んでください。',
    preview: ['午後の k6 は聞き取りの 10 問です。そのあとに学科試験の 30 問、そして初飛行。今日の IMSAFE は、その朝にも使います。'],
    bye: 'That\'s the end of ground school. 座学はこれでおしまいです、学科試験は落ち着いていきましょう。' },
];
// the review's lines: a question missed before asked again first (said so)
export const REVIEW_MISSED = ['前に間違えた問題から始めます。', 'この前つまずいた問題を、もう一度。', '前回の間違いから一つ。'];
export const REVIEW_NEXT = ['次の問題です。', 'もう一問。', '続けてもう一つ。'];
export const REVIEW_DONE = ['振り返りはここまでです、では今日の授業に入ります。', 'OK、思い出せましたね、今日の章に進みます。', '振り返りはここまでにして、今日の内容に入りましょう。'];

// ---- each training device lesson's start: the morning's class it uses, and what it is for
export const FTD_DAY = {
  k1: 'Welcome to the training device room. 午前の 4 つの力が計器でどう見えるか、k1 で G1000 型の PFD を一つずつ見ます。',
  k2: '午前はピトー静圧の話でしたね。k2 では、その速度と高度を PFD の画面から読み取ります。',
  k3: 'さあ、午前に習った言い方を口に出す番です。k3 は数字とアルファベットの 10 問です。',
  k5: '今日の k5 は復唱と応答です。第 8 章の型で、どう返すかを 10 の場面で選びます。',
  k6: '座学の最後の午後です。k6 では英語を聞いて、自分に関係する指示を聞き取ります。',
};

// (the end of each lesson's ten questions, before the score)
export const FTD_END = { k2: '10 枚、読み終わりました。採点します。', k3: 'ここまでで 10 問です。数えますね。', k5: '10 の場面、おつかれさまでした。結果です。', k6: '聞き取りは以上です。何問聞き取れたか見ます。' };

// ---- the questions read off a figure on the screen (by the section's figure, in order: content/lecture-units.js), the
// right one first (shuffled when asked)
export const FIG_ASKS = {
  'aero.forces#0': { q: '図で、上向きの揚力とつり合っている力はどれですか？', opts: ['重力', '推力', '抗力'], why: '水平飛行では、揚力と重力、推力と抗力がつり合っています。' },
  'aero.aoa#0': { q: '図の迎え角は、どの 2 つの間の角度ですか？', opts: ['翼弦線と相対風', '機首の向きと地平線', '翼弦線と地平線'], why: '迎え角は翼弦線と相対風の角度で、機首の向き（ピッチ角）とは別ものです。' },
  'aero.aoa#1': { q: '図の揚力曲線で、臨界迎え角を超えると揚力はどうなりますか？', opts: ['急に減る', 'そのまま増え続ける', '変わらない'], why: '臨界迎え角を超えると揚力は急に減ります、これが失速です。' },
  'aero.drag#0': { q: '図で、抗力が一番小さくなるのはどこですか？', opts: ['遅い速度と速い速度の間', '一番遅いとき', '一番速いとき'], why: '遅いと誘導抗力、速いと有害抗力が増え、その間に抗力が最小になる速度があります。' },
  'aero.stab#0': { q: '図の説明で、飛行機が正の静安定を持つように作られているのは、どの向きですか？', opts: ['縦（ピッチ）と方向（ヨー）', 'ロールだけ', 'どの向きにも持たない'], why: '縦と方向に正の静安定を持つよう設計されています。' },
  'aero.left#0': { q: '図で、機首上げのとき推力が大きくなるのは、どちら側のブレードですか？', opts: ['右側の下がるブレード', '左側の上がるブレード', 'どちらも同じ'], why: '右側の下がるブレードの迎え角が大きくなり、右の推力が大きくなって機首が左を向きます。' },
  'aero.vn#0': { q: '図の V-n 線図の例で、普通類の正の制限荷重倍数はいくつですか？', opts: ['+3.8 G', '+2.0 G', '+6.0 G'], why: '普通類は +3.8 G、負は -1.52 G です。' },
  'perf.da#0': { q: '図の国際標準大気で、海面の気温は何度ですか？', opts: ['15℃', '0℃', '25℃'], why: 'ISA の海面は 15℃、29.92 inHg です。' },
  'perf.wb#0': { q: '図の数値は、実際の機体でどう使いますか？', opts: ['形の例なので、実機はその機体の POH で確かめる', 'どの機体でもこの数値を使う', '重心は使わず、重量だけ見る'], why: '図は形の例です、実機は必ずその機体の POH と重量重心表で確かめます。' },
  'wx.atm#0': { q: '図で、高度が上がると気温と気圧はどうなりますか？', opts: ['どちらも下がる', 'どちらも上がる', '気温だけ上がる'], why: '国際標準大気では、上に行くほど気温も気圧も下がります。' },
  'wx.ts#0': { q: '図の説明で、METAR に特記される雲はどれですか？', opts: ['CB と TCU', 'すべての雲', '層雲だけ'], why: 'METAR で特記されるのは CB と TCU だけです。' },
  'wx.ts#1': { q: '図で、夏の午後に雷雨が発達しやすいのはどこですか？', opts: ['両側からの海風がぶつかる内陸', '海の上', '海岸から遠い沖'], why: '両側の海から来る海風がぶつかる内陸で、雷雨が発達しやすくなります。' },
  'law.airspace#0': { q: '図の説明で、Class B に入るのに要るものは何ですか？', opts: ['管制の許可（cleared into the Class Bravo）', '無線交信の確立だけ', '何もいらない'], why: 'Class B は許可が必要です、Class C と D は双方向の無線交信の確立が必要です。' },
  'hf.adm#0': { q: '図の TEM で、脅威とエラーを早く見つけて管理するのは、何に進ませないためですか？', opts: ['望ましくない状態（UAS）', '次の訓練', '離陸の準備'], why: '脅威とエラーを管理して、望ましくない状態（UAS）に進ませないためです。' },
};
// 考えてみよう's answers to choose from (the right one first; by the section)
export const THINK_CHOICES = {
  'aero.forces': { opts: ['パワーを上げ、機首を少し下げて、トリムを取り直す', '機首を下げるだけ（パワーはそのまま）', 'パワーを上げるだけ（機首はそのまま）'],
    why: ['機首を下げるだけでは、速度と一緒に高度も下がります。', 'パワーだけ上げると、速度とともに揚力が増えて上昇してしまいます。'] },
  'aero.lift': { opts: ['約 0.40', '約 0.82', '約 4.0'], why: ['0.82 は 70 kt のときの値です。', '4.0 では揚力が大きすぎます、桁を確かめてください。'] },
  'comm.numbers': { opts: ['10,500 ft', '1,500 ft', '15,000 ft'], why: ['“one zero thousand” は 10,000 です。', '“one zero” は 1 と 0、15 ではありません。'] },
};
