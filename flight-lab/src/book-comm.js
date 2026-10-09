// FLIGHT LAB — book-comm.js : radio communication, from the very beginning to a whole flight (five chapters, inserted
// before chapter 'hf' so they sit in Part 1 where the old single chapter was).
// Sources (read for this text): FAA AIM 4-1 (ATIS, CTAF, radar traffic information), 4-2 (phraseology and technique:
// contact procedures, call signs, the phonetic alphabet, figures, altitudes, directions, speeds, time, radio failure at a
// towered airport), 4-3 (operating control towers, communications, taxiing, exiting the runway, the option, light
// signals), 4-4-7 (readback), 5-2-5 (line up and wait), 3-2-4 (Class C: two-way communications), 6-1-2, 6-3 (distress
// and urgency), 6-4 (communications failure, 14 CFR 91.185); the Pilot/Controller Glossary; FAA Order JO 7110.65
// (controller phraseology: taxi, line up and wait, takeoff and landing clearances, sequencing, traffic, Class C,
// departure frequency and squawk, squawk VFR, radar contact, radar service terminated); FAA "From the Flight Deck: SFB";
// UK CAA CAP 413 (named for the ICAO / UK comparison only). The airport LAB, its frequencies and the call sign
// "Archer Seven Lima Alpha" are FICTIONAL training material: never use them on a real frequency.
(function (FL) {
  'use strict';
  const B = FL.book, R = B.R, bk = B.bk;
  const CS = 'Archer Seven Lima Alpha', CSS = 'Archer 7LA';
  // a pilot / ATC exchange as a small table: who, English, Japanese, note
  const say = (rows) => `<table class="bk-t bk-radio"><tr><th>誰</th><th>英語（交信）</th><th>意味</th></tr>${rows.map(([w, en, jp]) => `<tr><td class="who ${w === 'P' ? 'p' : 'a'}">${w === 'P' ? 'あなた' : w}</td><td class="en">${en}</td><td>${jp}</td></tr>`).join('')}</table>`;
  const fic = '<p class="small mute">LAB 空港・周波数・コールサイン「Archer Seven Lima Alpha（Archer 7LA）」は架空の練習用です。実際の周波数で使わないでください。</p>';

  // ======================================================================= radio 1
  B.add({ id: 'radio1', before: 'hf', part: 'p1', t: '無線交信のしくみと基本の技術', en: 'Radio communication: how it works and basic technique',
    summary: '誰と話すのか（管制の種類）、無線機とマイクの使い方、「聞く → 考える → 話す」の順番、日本語話者が英語の交信を聞き取るコツ。',
    secs: [
      { id: 'radio.why', t: '交信とは何か・誰と話すのか', h: () => `
<p>飛行中の無線交信（radiotelephony）は、パイロットと管制官が<b>同じ絵（どこに・どの機が・次に何をするか）</b>を持つための道具です。AIM（FAA の公式マニュアル）は、交信で最も大切なのは<b>「理解（understanding）」</b>であり、そのために<b>短く</b>、しかし伝わらなければ<b>必要な言葉を使ってでも</b>伝えること、そして俗語や無駄話（CB 無線のような言い方）は使わないことを求めています（AIM 4-2-1）。</p>
<h3>誰と話すのか：管制の種類と呼び方</h3>
${bk.t(['相手（英語の呼び方）', 'していること', 'いつ話すか'], [
  ['ATIS（例：LAB information Bravo）', '録音放送。風・視程・雲・気温・高度計規正値・使用滑走路・注意事項を繰り返し流す。話しかけることはできない', '出発前・到着前に必ず聞く'],
  ['Clearance Delivery（例：LAB Clearance Delivery）', '出発の許可・出発周波数・トランスポンダーのコードを出す（ある空港だけ）', 'エンジン始動の前後'],
  ['Ground（例：LAB Ground）', '地上管制。誘導路・滑走路の横断の指示', 'タキシーの前、着陸後に滑走路を出てから'],
  ['Tower（例：LAB Tower）', '飛行場管制。滑走路の使用（離陸・着陸・横断）と場周経路', '離陸の準備ができたら、到着の 15 NM ほど前から（AIM 4-3-2）'],
  ['Departure / Approach（例：LAB Departure）', 'レーダーで出発・到着の機を誘導し、交通情報を出す', '離陸後（管制塔に言われたら）、到着の前'],
  ['Center（例：Jacksonville Center）', '航空路管制。広い範囲をレーダーで見る', 'IFR の巡航、VFR の交通情報（余裕があれば）'],
  ['Flight Service（例：Orlando Radio）', '飛行情報業務。気象・飛行計画の受付', 'VFR 飛行計画を開く・閉じる、天気を聞く'],
  ['CTAF / UNICOM / MULTICOM', '管制塔のない空港の共通周波数。自分の位置と意図を全員に知らせる（自己通報）', '管制塔のない空港の周りで（{ch:radio5}）']])}
<p>AIM 4-2-6 の表のとおり、地上局は<b>「場所の名前＋局の種類」</b>で呼びます（例：Miami Ground、St. Louis Departure、Washington Center）。</p>
${bk.key('交信は「理解」のため。短く、でも伝わらなければ言葉を足す', '相手（局）によって仕事が違う。地上を動くのは Ground、滑走路と場周は Tower')}` },
      { id: 'radio.equip', t: '無線機・マイク・オーディオパネルの使い方', h: () => `
<ul><li><b>周波数</b>：航空機の通信（COM）は VHF 帯 118.000〜136.975 MHz。最近の無線機は 25 kHz 間隔で合わせる。G1000 では<b>使用中（active）</b>と<b>予備（standby）</b>の 2 つを表示し、予備を合わせてから ⇄ で入れ替える。</li>
<li><b>見通し距離</b>：VHF は光と同じでまっすぐ進む。山や地球の丸みの陰には届かない。<b>高いほど遠くまで届く</b>（AIM 4-2-2）。</li>
<li><b>同時に話せるのは 1 人</b>：送信ボタン（PTT：操縦輪の親指のスイッチ）を押している間は相手の声が聞こえない。2 機が同時に送信すると両方とも聞こえない（「ブロック」）。</li>
<li><b>話し方</b>（AIM 4-2-2）：マイクを唇のすぐ近くに。ボタンを押してから<b>一呼吸おいて</b>話し始める（最初の言葉が切れないように）。<b>ふつうの会話の声</b>で。離したら、相手が書き取ったり別の周波数で話していたりするので<b>数秒待つ</b>。</li>
<li><b>スタックマイク</b>：PTT が押しっぱなしになると周波数全体が使えなくなる（stuck mike）。返事がないときは、音量・周波数・マイクが押しっぱなしでないかを確かめる。</li></ul>
<h3>オーディオパネル</h3>
<p>どの無線機で<b>送信</b>するか（MIC：COM1 / COM2）と、どの無線機を<b>聞く</b>か（COM1・COM2・NAV1・NAV2 の受信ボタン）を選ぶ箱です。よくある失敗は「COM2 に周波数を合わせたのに MIC が COM1 のまま」。この教材の中央のオーディオパネルも同じ配置です（送信はできません）。</p>
${bk.key('返事がないときの確認：①音量 ②周波数（使用中の側か）③MIC の選択 ④ヘッドセットの差し込み ⑤スタックマイク ⑥もう一方の無線機', '高く上がると無線が届きやすい（迷ったとき・緊急時にも使う考え方）')}` },
      { id: 'radio.technique', t: '聞く → 考える → 話す', h: () => `
<ol><li><b>聞く</b>：送信する前に必ず聞く。周波数を変えた直後は特に、誰かが話していないか、ほかの機の交信が続いていないか（管制官の質問にパイロットが答える途中かもしれない）を確かめる。ATIS や周波数を聞いているだけでわかることも多い（AIM 4-2-2）。</li>
<li><b>考える</b>：言うことを先に決める。長い内容は紙に書いておく（AIM 4-2-2：think before keying, jot it down）。</li>
<li><b>話す</b>：決まった型（{ch:radio3}）で、短く、はっきり。</li></ol>
<p>そして、<b>操縦が最優先</b>です（Aviate → Navigate → Communicate）。無線に気を取られて高度や速度を外すのは本末転倒。忙しいときは「Stand by」（少し待って）と言ってよい。</p>
<h3>学生操縦士であることを伝える</h3>
<p>AIM 4-2-4 は、混雑した空域で手助けを受けるため、学生操縦士は最初の呼び出しで <b>“student pilot”</b> と名乗ることを勧めています（例：「Dayton tower, Fleetwing One Two Three Four, <b>student pilot</b>.」）。管制官はゆっくり話したり、指示を丁寧にしたりしてくれます。クリアランス・地上・管制塔・出発／進入管制のそれぞれ最初の交信で言うのがよい、とされています。</p>
${bk.key('「聞く」が 7 割。周波数を聞いていれば、自分の番・混み具合・ほかの機の位置がわかる', 'student pilot と名乗るのは恥ずかしいことではなく、安全のための決まった方法')}` },
      { id: 'radio.listen', t: '日本語話者のための聞き取りのコツ', h: () => `
<p>英語の交信は速く、雑音もあります。けれど<b>言う内容の型は決まっている</b>ので、型を知っていれば聞き取れる量が大きく増えます。（この節は教材としての学習のコツです。）</p>
${bk.t(['コツ', 'やり方'], [
  ['① まずコールサインだけを聞く', '交信は「相手のコールサイン → 指示」の順。自分のコールサイン（Archer Seven Lima Alpha）が聞こえたら、そこから全集中。ほかの機の指示は聞き流してよいが、自分に関係する交通（同じ滑走路など）は頭に入れる'],
  ['② 次に来る言葉を予想する', 'タキシーなら「滑走路・経路・hold short」、離陸なら「滑走路・風・cleared for takeoff」、到着なら「入り方・報告点・順番」。予想があると、聞き逃した部分を「Say again」で正確に聞き直せる'],
  ['③ 数字は書き取る', 'ひざ板（kneeboard）やメモに、聞いた順に書く。周波数・コード・高度・針路は記憶に頼らない'],
  ['④ 紛らわしい言葉を知っておく', 'two（2）と to・too、four（4）と for、left と right（L と R の発音）、hold short（手前で止まる）と hold position（その場で止まる）。管制は 15 を「one five」と 1 桁ずつ言うので「fifteen / fifty」の混同は起きにくい'],
  ['⑤ わからなければ聞き直す', '推測で動かない。「Say again」。速すぎるなら「Say again, slowly」と添えてよい。自分宛てか不安なら「Verify, was that for Archer Seven Lima Alpha?」'],
  ['⑥ 声に出して練習する', 'この教材の「英語交信」ページの台本を、音声に合わせて同時に言う（シャドーイング）。椅子に座って 1 回の飛行の交信を最初から最後まで言ってみる']])}
${bk.sim('英語交信のページで、1 回の飛行の交信を音声つきで最初から最後まで聞けます（メニュー → 英語交信）。', ['t2', '場周経路'])}` },
    ],
    terms: [['Radiotelephony', '無線電話（音声の交信）', ''], ['Air traffic control (ATC)', '航空交通管制', ''], ['ATIS', '飛行場情報の自動放送', ''], ['Clearance Delivery', '出発許可の伝達', ''], ['Ground / Tower', '地上管制・飛行場管制', ''], ['Departure / Approach', '出発管制・進入管制', 'レーダー'], ['Center', '航空路管制', ''], ['Flight Service Station (FSS) / "Radio"', '飛行情報業務', ''], ['PTT (push-to-talk)', '送信ボタン', ''], ['Stuck mike', '押しっぱなしのマイク', ''], ['Audio panel', 'オーディオパネル', ''], ['Student pilot', '学生操縦士（最初の交信で名乗る）', 'AIM 4-2-4']],
    examples: ['離陸前、周波数を Tower に変えた → 先に 5 秒ほど聞いて、誰も話していないこと・管制官の質問の途中でないことを確かめてから「LAB Tower, Archer Seven Lima Alpha, holding short runway three six, ready for departure」。', '返事がない → 音量・周波数・MIC の選択・スタックマイクを確認 → もう一度、短く呼ぶ。'],
    cautions: ['この章の周波数・LAB 空港・コールサインは架空の練習用。実際の周波数は最新のチャート・Chart Supplement で確認する。', 'この教材は実際の管制にはつながらず、音声を送信しない。'],
    quiz: [
      { q: '周波数を変えた直後にまずすることは？（AIM 4-2-2）', choices: ['すぐに呼び出す', '少し聞いて、誰も話していないことを確かめる', '音量を下げる', 'トランスポンダーを 7600 にする'], answer: 1, why: 'Listen before you transmit。直後はほかの交信の途中かもしれない。割り込むと相手の受信をふさぐ。' },
      { q: '着陸して滑走路を出たあと、地上走行の指示をもらう相手は？', choices: ['ATIS', 'Ground', 'Departure', 'Center'], answer: 1, why: '地上（誘導路）の移動は Ground。ただし管制塔に「contact ground」と言われてから切り替える（AIM 4-3-21）。' },
      { q: 'AIM が学生操縦士に勧めている名乗り方は？', choices: ['最初の交信で "student pilot" と言う', '交信の最後に "over" と言う', '名乗らない', 'コールサインを省略する'], answer: 0, why: 'AIM 4-2-4：最初の呼び出しで student pilot と名乗ると、管制官が必要な手助けをしてくれる。' },
    ],
    refs: [R.aim42, R.aim43, R.pcg, R.ana1], lessons: ['t1', 't2'] });

  // ======================================================================= radio 2
  B.add({ id: 'radio2', before: 'hf', part: 'p1', t: '言葉の決まり：アルファベット・数字・標準用語', en: 'Standard words: the phonetic alphabet, numbers and phraseology',
    summary: 'フォネティックアルファベットと数字の発音、高度・針路・速度・周波数・時刻・高度計規正値・コードの言い方、コールサインの決まり、標準用語（Roger・Wilco・Say again など）の正しい意味。',
    secs: [
      { id: 'comm.basic', t: 'フォネティックアルファベットと数字の発音', h: () => `
<p>雑音の中でも 1 文字ずつ確実に伝えるため、文字は ICAO のフォネティックアルファベットで言います。最初の交信のコールサイン、1 文字だけの言葉、聞き取りにくい言葉のつづりに使います（AIM 4-2-7）。発音は AIM の表の読み方とカタカナの目安です。</p>
${bk.t(['文字', '言い方', '発音（AIM）', '目安'], [
  ['A', 'Alfa', 'AL-FAH', 'アルファ'], ['B', 'Bravo', 'BRAH-VOH', 'ブラボー'], ['C', 'Charlie', 'CHAR-LEE / SHAR-LEE', 'チャーリー'], ['D', 'Delta', 'DELL-TAH', 'デルタ'],
  ['E', 'Echo', 'ECK-OH', 'エコー'], ['F', 'Foxtrot', 'FOKS-TROT', 'フォックストロット'], ['G', 'Golf', 'GOLF', 'ゴルフ'], ['H', 'Hotel', 'HOH-TEL', 'ホテル'],
  ['I', 'India', 'IN-DEE-AH', 'インディア'], ['J', 'Juliett', 'JEW-LEE-ETT', 'ジュリエット'], ['K', 'Kilo', 'KEY-LOH', 'キロ'], ['L', 'Lima', 'LEE-MAH', 'リーマ'],
  ['M', 'Mike', 'MIKE', 'マイク'], ['N', 'November', 'NO-VEM-BER', 'ノベンバー'], ['O', 'Oscar', 'OSS-CAH', 'オスカー'], ['P', 'Papa', 'PAH-PAH', 'パパ'],
  ['Q', 'Quebec', 'KEH-BECK', 'ケベック'], ['R', 'Romeo', 'ROW-ME-OH', 'ロミオ'], ['S', 'Sierra', 'SEE-AIR-RAH', 'シエラ'], ['T', 'Tango', 'TANG-GO', 'タンゴ'],
  ['U', 'Uniform', 'YOU-NEE-FORM', 'ユニフォーム'], ['V', 'Victor', 'VIK-TAH', 'ビクター'], ['W', 'Whiskey', 'WISS-KEY', 'ウィスキー'], ['X', 'X-ray', 'ECKS-RAY', 'エックスレイ'],
  ['Y', 'Yankee', 'YANG-KEY', 'ヤンキー'], ['Z', 'Zulu', 'ZOO-LOO', 'ズールー']])}
${bk.t(['数字', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], [['発音（AIM）', 'WUN', 'TOO', 'TREE', 'FOW-ER', 'FIFE', 'SIX', 'SEV-EN', 'AIT', 'NIN-ER', 'ZEE-RO']])}
<p><b>9 は「niner」</b>（ドイツ語の nein と区別するため、と説明されることが多い）。<b>3 は「tree」、5 は「fife」</b>のように、雑音の中でも区別しやすい発音にしています。</p>
${bk.key('最初の交信ではコールサインをフォネティックで全部言う', '数字は原則 1 桁ずつ（10 は one zero）')}` },
      { id: 'comm.numbers', t: '数字の言い方：高度・針路・速度・周波数・時刻・コード', h: () => `
${bk.t(['種類', '書き方', '言い方', '決まり（出典）'], [
  ['一般の数字', '10', 'one zero', '1 桁ずつ（AIM 4-2-8）'],
  ['高度（9,900 ft まで）', '500 / 4,500', 'five hundred / four thousand five hundred', '「千・百」で言う（AIM 4-2-8）'],
  ['高度（10,000 ft 以上）', '10,000 / 13,500', 'one zero thousand / one three thousand five hundred', '千の位より上は 1 桁ずつ（AIM 4-2-8・4-2-9）'],
  ['フライトレベル（18,000 ft 以上）', 'FL190', 'flight level one niner zero', '米国は 18,000 ft から（AIM 4-2-9）'],
  ['針路・方位・コース', '090 / 005', 'heading zero niner zero / zero zero five', '3 桁・磁方位（真方位なら “true” を付ける）（AIM 4-2-10）'],
  ['風', '220° 15 kt / 2 kt', 'wind two two zero at one five / wind calm', '風向は 3 桁・磁方位（AIM 4-2-10）。管制の型は “wind (風向) at (風速)”、3 kt 未満は “calm”（JO 7110.65）'],
  ['速度', '120 kt', 'one two zero knots', '1 桁ずつ＋knots（AIM 4-2-11）'],
  ['周波数', '121.7 / 119.75', 'one two one point seven / one one niner point seven five', '小数点は “point”（ICAO は “decimal”）（AIM 4-2-8）'],
  ['地上管制の周波数（121 MHz 台）', '121.7', 'ground point seven', '管制官が 121 を省くことがある（AIM 4-3-14）'],
  ['高度計規正値', '29.92 inHg', 'altimeter two niner niner two', '1 桁ずつ'],
  ['トランスポンダーのコード', '4271', 'squawk four two seven one', '1 桁ずつ'],
  ['時刻', '14:30 UTC', 'one four three zero Zulu', 'FAA は UTC を使う。フロリダの標準時（EST）は UTC−5、夏時間（EDT）は UTC−4（AIM 4-2-12）'],
  ['滑走路', '36 / 9R / 27C', 'runway three six / runway niner right / runway two seven center', '1 桁ずつ＋left / right / center'],
  ['距離・時計の方位', '5 NM・2 時の方向', 'five miles / two o\'clock', '時計の方位は機首（12 時）が基準'],
  ['航空路', 'V12', 'Victor twelve', 'AIM 4-2-8']])}
${bk.key('高度だけは「thousand・hundred」を使う。ほかの数字は 1 桁ずつ', '針路は必ず 3 桁（heading zero niner zero）。090 を「ninety」と言わない')}
${bk.q('“Climb and maintain one zero thousand five hundred” は何 ft？', '10,500 ft。10,000 ft 以上は千の位より上を 1 桁ずつ（one zero）言う。')}` },
      { id: 'comm.callsign', t: 'コールサインの決まり', h: () => `
<ul><li><b>最初の交信では省略しない</b>：機種名・型式名またはメーカー名のあとに登録記号の数字と文字。機種名を言うときは<b>先頭の N を省く</b>（例：Bonanza Six Five Five Golf）（AIM 4-2-4）。この教材の「Archer Seven Lima Alpha」は架空。</li>
<li><b>省略は管制官から</b>：交信が確立したあと、管制官が「機種名＋最後の 3 文字」に省略して呼んだら、パイロットもそれを使ってよい（AIM 4-2-4）。例：「Archer Seven Lima Alpha」→「Archer Seven Lima Alpha（3 文字なのでそのまま）」、「Cessna One Two Three Four Five」→「Cessna Three Four Five」。</li>
<li><b>似たコールサインがいるとき</b>は省略しない。自分への指示か疑わしいときは「<b>Verify clearance for</b>（完全なコールサイン）」（AIM 4-2-4）。似たコールサインの取り違えは、ほかの機への許可を自分のものとして実行してしまう事故につながる。</li>
<li><b>エアライン</b>は会社の呼出符号と便名を「まとまった数」で言う（例：United Twenty-Five Heavy。ANA の呼出符号は “All Nippon”）。</li></ul>
${bk.key('コールサインは「誰への交信か」を決める一番大切な部分。最初は省略しない', '省略してよいのは、管制官が先に省略してから')}` },
      { id: 'comm.words', t: '標準用語の正しい意味（Pilot/Controller Glossary）', h: () => `
<p>FAA の Pilot/Controller Glossary（PCG）は、管制官の方式基準（JO 7110.65）と同じ用語集です。意味をまちがえると事故になるものがあります。</p>
${bk.t(['用語', '意味（PCG の定義の要約）', '使い方の注意'], [
  ['Roger', '最後の送信を全部受信した', '<b>「はい」の意味ではない</b>。はい / いいえで答える質問に Roger は使わない'],
  ['Wilco', '受信し、理解し、従う（will comply）', '滑走路・高度・針路の指示には Wilco ではなく<b>内容を復唱</b>する'],
  ['Affirmative / Negative', 'はい / いいえ（Negative は「許可しない」「それは違う」も）', '「Yes / No」より聞き取りやすい'],
  ['Say again', '直前の送信をもう一度（部分なら “say again all after …”）', '聞き取れないときは推測せずに使う'],
  ['Stand by', '少し待って（「許可」でも「不許可」でもない）', '待つ時間が長ければ、もう一度呼んでよい'],
  ['Unable', '指示・要求・許可に従えない', '理由（雲・性能など）や代わりの案を添える'],
  ['Verify', '確認してください', '例：Verify assigned altitude'],
  ['Correction', '言いまちがえた。正しくは次のとおり', '自分の言いまちがいを直すとき'],
  ['Read back', '私の言ったことを復唱して', '管制官から言われたら全部を復唱'],
  ['I say again / Words twice', 'もう一度言う / 交信状態が悪いので各句を 2 回言って（言う）', ''],
  ['Immediately / Expedite', '直ちに（危険を避けるため）/ 速やかに', 'Immediately は今すぐ動く'],
  ['Go ahead', 'どうぞ話して（PCG：ほかの意味に使わない）', '「どうぞ進んで」の意味ではない'],
  ['Over / Out', '送信終わり・返事を待つ / 交信終わり・返事不要', 'ふつうの管制交信ではほとんど使わない。“Over and out” は矛盾'],
  ['Contact / Monitor', '交信を始めよ / 聞いて待て（こちらからは呼ばない）', 'Monitor と言われたら呼び出さない'],
  ['Traffic in sight / Negative contact', '言われた他機が見えた / 見えない', '見えるまで探す。見えなければ Negative contact'],
  ['Squawk / Ident', 'トランスポンダーのコードを設定 / IDENT ボタンを押す', ''],
  ['Say altitude / Say heading', 'いまの高度（上昇・降下中は 100 ft 単位）/ いまの針路を言え', ''],
  ['Line up and wait', '滑走路に入って待て（<b>離陸許可ではない</b>）', 'AIM 5-2-5'],
  ['Hold short of … / Hold position', '…の手前で止まれ / その場で止まれ', '必ず復唱'],
  ['Cleared for takeoff / Cleared to land / Cleared for the option', '離陸許可 / 着陸許可 / タッチアンドゴー・ローアプローチ・ストップアンドゴー・フルストップなどを任意に', 'Cleared は許可。タキシーには “cleared” を使わない（AIM 4-3-18）'],
  ['Go around', '進入をやめてやり直せ', 'VFR はふつう滑走路の上を上昇して場周へ（PCG）']])}
${bk.key('Roger は「受け取った」だけ。「はい」は Affirmative、「従う」は Wilco、数字や滑走路は復唱', '俗語・あいまいな言い方（“Ten-four”、“Copy that” など）は使わない（AIM 4-2-1：jargon・CB slang は使わない）')}` },
    ],
    terms: [['Phonetic alphabet', 'フォネティックアルファベット', 'AIM 4-2-7'], ['Niner / Tree / Fife', '9 / 3 / 5 の発音', ''], ['Flight level', 'フライトレベル', '18,000 ft 以上'], ['Altimeter', '高度計規正値', ''], ['Squawk', 'トランスポンダーのコード', ''], ['Zulu (UTC)', '協定世界時', ''], ['Call sign', 'コールサイン', ''], ['Abbreviated call sign', '省略したコールサイン', '管制官から'], ['Roger / Wilco', '受信した / 了解し従う', ''], ['Affirmative / Negative', 'はい / いいえ', ''], ['Unable', '従えない', ''], ['Stand by', '待て', ''], ['Pilot/Controller Glossary', '管制用語集', 'PCG']],
    examples: ['“Archer Seven Lima Alpha, fly heading one two zero, climb and maintain three thousand five hundred.” → 針路 120°・高度 3,500 ft。', '“Altimeter three zero zero one” → 30.01 inHg に合わせる。“Squawk zero four two five” → 0425。'],
    cautions: ['発音のカタカナは目安。実際の音は音声で確かめる。', '英国など ICAO の言い方とは一部違う（{ch:radio5}）。'],
    quiz: [
      { q: '高度 13,500 ft の正しい言い方は？（AIM 4-2-8）', choices: ['thirteen thousand five hundred', 'one three thousand five hundred', 'one three five zero zero', 'flight level one three five'], answer: 1, why: '10,000 ft 以上は千の位より上を 1 桁ずつ言う。フライトレベルは 18,000 ft 以上。' },
      { q: '管制官「Archer 7LA, say altitude.」に対して正しいのは？', choices: ['Roger, Archer 7LA', 'Archer 7LA, three thousand five hundred', 'Wilco', 'Affirmative'], answer: 1, why: '質問には内容で答える。上昇・降下中は 100 ft 単位に丸めた指示高度を言う（PCG：Say altitude）。' },
      { q: '"Stand by" の意味は？', choices: ['許可する', '許可しない', '少し待って（許可でも不許可でもない）', '周波数を変えよ'], answer: 2, why: 'PCG：Stand by は許可でも拒否でもない。長く待たされたらもう一度呼んでよい。' },
      { q: '周波数 119.75 の言い方は？', choices: ['one nineteen seventy-five', 'one one niner point seven five', 'one one niner seven five', 'eleven nine point seventy-five'], answer: 1, why: '1 桁ずつ、小数点は point（ICAO は decimal）。9 は niner。' },
    ],
    refs: [R.aim42, R.pcg, R.jo71], lessons: ['t1'] });

  // ======================================================================= radio 3
  B.add({ id: 'radio3', before: 'hf', part: 'p1', t: '交信の型：呼び出し・応答・復唱', en: 'How a call is built: initial contact, acknowledgement and readback',
    summary: '最初の呼び出しの型、管制官の呼び出しへの応え方、周波数の変更、復唱しなければならないもの・しなくてよいもの、わからないとき・従えないときの言い方、よくある間違い。',
    secs: [
      { id: 'comm.pattern', t: '最初の呼び出しの型', h: () => `
<p>AIM 4-2-3 の決まった順番：</p>
<ol><li><b>相手の局の名前</b>（LAB Ground）</li><li><b>自分のコールサイン（省略しない）</b>（Archer Seven Lima Alpha）</li><li><b>地上ではいる場所</b>（at the west ramp）</li><li><b>要求（短ければ）</b>（request taxi）</li><li>必要なら “Over”（ふつうは省く）</li></ol>
<p>覚え方：<b>Who you are calling → Who you are → Where you are → What you want</b>。ATIS を聞いたら “<b>with information Bravo</b>” を入れる（AIM 4-1-13）。AIM の例：</p>
${bk.f('"Columbia Ground, Cessna Three One Six Zero Foxtrot, south ramp, I-F-R Memphis."<br>"Miami Center, Baron Five Six Three Hotel, request V-F-R traffic advisories."')}
${say([['P', `LAB Ground, ${CS}, student pilot, at the west ramp with information Bravo, VFR to the northeast practice area, request taxi.`, 'LAB 地上管制へ。こちら Archer 7LA、学生操縦士。西のエプロンにいます。ATIS の B を聞きました。北東の訓練空域へ VFR で。地上走行を要求します。']])}
${fic}
<h3>混んでいるとき</h3>
<p>周波数が混んでいて、相手が自分の呼び出しを聞けるか分からないときは、まず短く呼ぶ（「LAB Approach, ${CS}」）。管制官が「${CS}, LAB Approach」と応えたら、要求を言う。受信が確かなら最初から要求まで言う方が周波数の節約になる（AIM 4-2-3）。</p>
<h3>管制官から呼ばれたとき・周波数を変えるとき</h3>
<ul><li>すべての呼び出し・許可に応答する。コールサインを最初か最後に付けて、Wilco・Roger・Affirmative・Negative など（AIM 4-2-3）。</li>
<li>周波数を変えるよう言われたら<b>必ず応答してから</b>変える（黙って変えると、管制官には無線の故障と区別できない）。そしてできるだけ早く変える（AIM 4-2-3）。</li>
<li><b>Contact</b>（交信せよ）なら新しい周波数で呼び出す。<b>Monitor</b>（聞いて待て）なら呼び出さずに聞く（PCG）。</li></ul>
<h3>Class C 空域に入る前の「交信の確立」</h3>
<p>Class C は入る前に双方向の交信を確立する必要があります（{ch:law}）。AIM 3-2-4：管制官が<b>こちらのコールサインを言って</b>「${CS}, stand by」と応えたら確立（入ってよい）。<b>コールサインなし</b>の「Aircraft calling LAB Approach, stand by」は確立していない。「remain outside Charlie airspace and stand by」なら外で待つ（JO 7110.65）。</p>
${bk.key('最初の呼び出し：相手 → 自分 → 場所 → 要求（＋ATIS の記号）', '周波数の変更は「応答してから」変える', 'Class C：コールサイン付きの応答があれば交信確立')}` },
      { id: 'comm.readback', t: '復唱（readback）：何を・どの順に', h: () => `
<p>復唱は、聞きまちがい・言いまちがいを<b>その場で見つける</b>ための二重確認です。AIM の決まり：</p>
<ul><li><b>高度・高度の制限・針路（vector）・滑走路の指定</b>を含む指示は復唱する（AIM 4-4-7）。</li>
<li><b>与えられた順番どおり</b>に復唱し、<b>すべての復唱と応答にコールサイン</b>を付ける（AIM 4-4-7）。</li>
<li>タキシー・離陸・着陸の許可の最初の復唱には、<b>滑走路（L・R・C も）</b>を必ず入れる（AIM 4-4-7）。</li>
<li>地上走行では <b>滑走路の指定・滑走路に入る許可・hold short・line up and wait</b> を必ず復唱（AIM 4-3-18）。管制官は hold short の復唱がないと求める決まりになっている。</li></ul>
${say([
  ['Ground', `${CSS}, runway three six, taxi via Alpha, hold short of taxiway Charlie.`, '滑走路 36 へ、誘導路 A 経由で地上走行。誘導路 C の手前で止まれ。'],
  ['P', `Runway three six, taxi via Alpha, hold short of Charlie, ${CSS}.`, '（滑走路・経路・手前停止＋コールサイン）'],
  ['Tower', `${CSS}, runway three six, line up and wait.`, '滑走路 36 に入って待て（離陸許可ではない）。'],
  ['P', `Runway three six, line up and wait, ${CSS}.`, ''],
  ['Departure', `${CSS}, turn right heading zero niner zero, climb and maintain three thousand five hundred.`, '右旋回で針路 090、3,500 ft まで上昇してそれを保て。'],
  ['P', `Right heading zero niner zero, climb and maintain three thousand five hundred, ${CSS}.`, '（旋回方向も・言われた順に）'],
  ['Tower', `${CSS}, contact departure one one niner point seven five.`, '出発管制 119.75 と交信せよ。'],
  ['P', `One one niner point seven five, ${CSS}.`, '（周波数を復唱して応答してから変える）']])}
<h3>復唱しなくてよいもの（内容で応える）</h3>
${bk.t(['管制官', 'あなた'], [
  ['交通情報 “Traffic, two o\'clock, three miles, eastbound, Cessna, two thousand five hundred.”', '見えたら “Traffic in sight, ' + CSS + '.”、探しているなら “Looking, ' + CSS + '.”、見えなければ “Negative contact, ' + CSS + '.”'],
  ['“Radar contact, five miles north of LAB.”', `“${CSS}.”（受け取ったことをコールサインで）`],
  ['風や高度計規正値の通知', `“${CSS}.” または必要なら数字を確認`]])}
${bk.key('数字（高度・針路・周波数・コード）と滑走路は必ず復唱。「Roger」だけでは足りない', '言われた順に、最後にコールサイン')}` },
      { id: 'comm.clarify', t: 'わからないとき・従えないとき', h: () => `
${bk.t(['場面', '言い方', 'ポイント'], [
  ['聞き取れなかった', '“Say again, ' + CSS + '.”／一部だけなら “Say again all after Charlie.”', '推測で復唱・行動しない（PCG）'],
  ['自分宛てか分からない', '“Verify clearance for Archer Seven Lima Alpha.”', '似たコールサインに注意（AIM 4-2-4）'],
  ['経路が分からない', '“Request progressive taxi.”', '一区間ずつ案内してもらえる（AIM 4-3-18）'],
  ['指示に従えない', '“Unable, clouds ahead, ' + CSS + '.”（理由と代わりの案）', 'VFR は雲に入れない。無理に従わない'],
  ['LUAW のまま待たされている', '“' + CSS + ', holding in position runway three six.”', '長く待たされたら確認（AIM 5-2-5）'],
  ['自分の言いまちがい', '“Correction, …”', 'PCG'],
  ['少し待ってほしい（操縦が忙しい）', '“Stand by.”', '操縦が最優先']])}
<p>AIM 4-3-18 は、機長は自分の機の運航に最終的な責任があるので、<b>理解できない指示は理解できるまで確認する</b>よう求めています。迷ったら止まって聞く（地上）、または安全な状態を保って聞く（空中）。</p>
${bk.key('Say again・Verify・Unable は、安全のための正しい言葉。使うのをためらわない')}` },
      { id: 'comm.mistakes', t: 'よくある間違い', h: () => `
${bk.t(['間違い', '正しくは'], [
  ['hold short の指示に “Roger” だけ', '滑走路名まで復唱：“Hold short of runway three six, ' + CSS + '.”'],
  ['line up and wait を離陸許可と思う', 'cleared for takeoff を待つ（AIM 5-2-5：LUAW を正しく復唱したのに許可なしで離陸した例が多い）'],
  ['ほかの機への指示を自分のものと思う', 'コールサインを聞く。疑わしければ Verify'],
  ['応答せずに周波数を変える', '応答してから変える（AIM 4-2-3）'],
  ['着陸後、言われる前に Ground に変える', '管制塔に “contact ground” と言われるまで変えない（AIM 4-3-14・4-3-21）'],
  ['最初の交信でコールサインを省略する', '最初は完全に。省略は管制官が先に（AIM 4-2-4）'],
  ['ほかの交信にかぶせて話す（ブロック）', '聞いてから話す（AIM 4-2-2）'],
  ['長すぎる呼び出し', '型どおりに短く。不要なことは言わない（AIM 4-2-3）'],
  ['“Roger” で「はい」と答える', '“Affirmative”'],
  ['管制塔のない空港で “active runway” と言う', '滑走路の番号を言う（AIM 4-1-9）']])}` },
    ],
    terms: [['Initial contact (callup)', '最初の呼び出し', 'AIM 4-2-3'], ['Readback', '復唱', 'AIM 4-4-7'], ['Acknowledge', '応答する', ''], ['Contact / Monitor', '交信せよ / 聞いて待て', ''], ['Two-way radio communication', '双方向の交信', 'Class C の条件'], ['Progressive taxi', '一区間ずつの地上走行の案内', ''], ['Holding in position', '滑走路上で待機中', 'LUAW'], ['Verify clearance for …', '…への許可か確認', '']],
    examples: ['“Archer 7LA, cross runway two seven, hold short of runway three six.” → “Cross runway two seven, hold short of runway three six, Archer 7LA.”（横断と手前停止の両方）', '“Aircraft calling LAB Approach, stand by.” → コールサインが言われていないので Class C には入らない。'],
    cautions: ['交信例は FAA（米国）の言い方。英国などでは一部違う（{ch:radio5}）。', '実際の交信は、その空港の手順・管制官の指示が優先。'],
    quiz: [
      { q: 'AIM 4-4-7 が復唱すべきとしているものは？', choices: ['交通情報', '高度・針路・滑走路の指定を含む指示', '天気', 'ATIS の内容'], answer: 1, why: '高度・高度の制限・針路（vector）・滑走路の指定は、言われた順に、コールサイン付きで復唱する。' },
      { q: '管制官が「Aircraft calling LAB Approach, stand by.」と応えた。Class C に入ってよい？', choices: ['入ってよい', '入ってはいけない（コールサインがない）', '高度を下げれば入ってよい', 'トランスポンダーを 7700 にして入る'], answer: 1, why: 'AIM 3-2-4：コールサイン付きで応答されたときだけ交信確立。コールサインなしは確立していない。' },
      { q: '周波数の変更を指示された。正しいのは？', choices: ['黙ってすぐ変える', '応答してから、できるだけ早く変える', '変えずに待つ', '一度ほかの周波数を試す'], answer: 1, why: 'AIM 4-2-3：応答がないと、管制官は無線の故障と区別できない。' },
    ],
    refs: [R.aim42, R.aim43, R.pcg, R.jo71, R.aim], lessons: ['t1', 't2'] });

  // ======================================================================= radio 4
  B.add({ id: 'radio4', before: 'hf', part: 'p1', t: '1 回の飛行の交信：出発から到着まで', en: 'A whole flight on the radio: from the ramp to the ramp',
    summary: '管制塔とレーダー管制のある空港（Class C を想定した架空の LAB）で、ATIS → 地上 → 管制塔 → 出発管制 → 訓練空域 → 進入管制 → 管制塔（場周・着陸）→ 地上 までの全部の交信を、日本語の意味と理由つきで順に。',
    secs: [
      { id: 'comm.atis', t: '① ATIS を聞いて書き取る', h: () => `
<p>ATIS は、ふつうの情報を録音で繰り返し流して管制の周波数の混雑を減らす放送です（AIM 4-1-13）。内容：空港名・<b>情報の記号（Alpha, Bravo…）</b>・観測時刻（UTC）・風・視程・天気・雲・気温・露点・<b>高度計規正値</b>・使用滑走路・注意事項。雲高 5,000 ft 以上・視程 5 SM 以上なら雲と視程は省くことがある。</p>
${say([['ATIS', 'LAB information Bravo. One four five three Zulu. Wind three four zero at eight. Visibility one zero. Few clouds at three thousand five hundred. Temperature three one, dew point two two. Altimeter three zero zero one. Landing and departing runway three six. Advise on initial contact you have information Bravo.', 'LAB の情報 B。14:53 UTC。風 340° 8 kt。視程 10 SM。3,500 ft に少しの雲。気温 31℃・露点 22℃。高度計 30.01。使用滑走路 36。最初の交信で B を聞いたと伝えよ。']])}
${bk.t(['書き取る欄（ひざ板の例）', '値'], [['記号', 'B'], ['風', '340/08'], ['視程・雲', '10・FEW035'], ['温度・露点', '31/22'], ['高度計', '30.01 → すぐ合わせる'], ['滑走路', '36']])}
<p>最初の交信で “<b>with information Bravo</b>” と言うと、管制官は ATIS の内容を繰り返さなくてよくなる（AIM 4-1-13）。“have numbers”（風・滑走路・高度計だけ聞いた）は ATIS を聞いた意味にはならない。</p>
${fic}` },
      { id: 'comm.dep', t: '② 地上：タキシーの許可（出発周波数とコードも）', h: () => `
<p>出発する機は、エンジン始動前後に地上管制（または Clearance Delivery）と交信し、タキシーとランナップの間はその周波数にいて、<b>離陸の準備ができたら管制塔に変える</b>（AIM 4-3-14）。レーダー業務を受ける VFR 機には、離陸前に<b>出発周波数とトランスポンダーのコード</b>が伝えられる（JO 7110.65：“departure frequency …, squawk …”）。</p>
${say([
  ['P', `LAB Ground, ${CS}, student pilot, at the west ramp with information Bravo, VFR to the northeast practice area at three thousand five hundred, request taxi.`, '（相手・自分・場所・ATIS・行き先と高度・要求）'],
  ['Ground', `${CS}, LAB Ground, runway three six, taxi via Alpha, hold short of taxiway Charlie. Departure frequency one one niner point seven five, squawk four two seven one.`, '滑走路 36 へ。誘導路 A 経由、誘導路 C の手前で止まれ。出発管制 119.75、コード 4271。'],
  ['P', `Runway three six, taxi via Alpha, hold short of Charlie, departure one one niner point seven five, squawk four two seven one, ${CSS}.`, '（滑走路・経路・手前停止・周波数・コードを言われた順に）'],
  ['Ground', `${CSS}, continue via Alpha to runway three six.`, '誘導路 A をそのまま滑走路 36 へ。'],
  ['P', `Continue via Alpha to runway three six, ${CSS}.`, '']])}
${bk.warn('「Runway three six, taxi via Alpha」は滑走路 36 の<b>手前まで</b>行ってよいという意味で、<b>滑走路に入ってよい・横切ってよいという意味ではない</b>（AIM 4-3-18）。滑走路の手前の停止線（黄色の実線と破線）で必ず止まる。地上走行の指示に “cleared” という言葉は使われない。')}
<p>ランナップ（{ch:ground}）は滑走路の近くの決められた場所で。終わったら滑走路の手前で管制塔に変える。</p>` },
      { id: 'comm.tower', t: '③ 管制塔：離陸', h: () => `
${say([
  ['P', `LAB Tower, ${CS}, holding short runway three six, ready for departure, VFR northeast.`, '滑走路 36 の手前で待機中。出発準備よし。北東へ VFR。'],
  ['Tower', `${CS}, LAB Tower, runway three six, line up and wait. Traffic, a Cessna on five mile final.`, '滑走路 36 に入って待て。5 マイルの最終進入に Cessna。'],
  ['P', `Runway three six, line up and wait, ${CSS}.`, '（離陸許可ではない。滑走路に入り、センターラインに合わせて止まる）'],
  ['Tower', `${CS}, runway three six, wind three four zero at eight, cleared for takeoff. Fly runway heading. Traffic, a Cessna on four mile final.`, '滑走路 36、風 340° 8 kt、離陸を許可。滑走路の方位を保って上昇せよ。4 マイルの最終進入に Cessna。'],
  ['P', `Runway three six, cleared for takeoff, fly runway heading, ${CSS}.`, '（滑走路＋cleared for takeoff＋追加の指示）'],
  ['Tower', `${CS}, contact departure.`, '出発管制と交信せよ（周波数はタキシー前にもらった 119.75）。'],
  ['P', `Contact departure, ${CSS}.`, '']])}
<ul><li>LUAW と離陸許可のときには、同じ滑走路の最終進入（6 マイル以内）にいる一番近い機が伝えられる（JO 7110.65 3-9-4・3-9-10）。</li>
<li>LUAW は「すぐ離陸させたいが、まだ許可を出せない」ときの指示（AIM 5-2-5）。管制方式では LUAW のまま 90 秒を超えて待たせないことになっている（JO 7110.65）。理由（着陸機など）がなくなったのに何も言われないときは確認する。</li>
<li>離陸許可の復唱には必ず滑走路番号を入れる（AIM 4-4-7）。平行滑走路では L・R・C まで。</li>
<li>管制官は、パイロットが知っていると思えば周波数を省くことがある（AIM 4-3-14）。分からなければ聞く。</li></ul>
${bk.sim('課目「通常離陸と上昇」は、この離陸許可の復唱から始まります。', ['t1', '通常離陸と上昇'])}` },
      { id: 'comm.radar', t: '④ 出発管制・レーダー：交通情報と、別れ方', h: () => `
${say([
  ['P', `LAB Departure, ${CS}, one thousand two hundred, climbing to three thousand five hundred.`, '出発管制へ。いま 1,200 ft、3,500 ft へ上昇中。'],
  ['Departure', `${CS}, LAB Departure, radar contact two miles north of LAB. Resume own navigation.`, 'レーダーで確認した（LAB の北 2 マイル）。自分で航法を続けよ。'],
  ['P', `Resume own navigation, ${CSS}.`, ''],
  ['Departure', `${CSS}, traffic, one o'clock, four miles, westbound, a Cessna, two thousand five hundred.`, '1 時の方向・4 マイル・西向き・Cessna・2,500 ft に他機。'],
  ['P', `Looking, ${CSS}.`, '探している。'],
  ['P', `Traffic in sight, ${CSS}.`, '見えた。'],
  ['P', `LAB Departure, ${CSS}, entering the northeast practice area, request frequency change.`, '北東の訓練空域に入る。周波数の変更を要求。'],
  ['Departure', `${CSS}, radar service terminated, squawk VFR, frequency change approved.`, 'レーダー業務を終了。VFR コード（1200）に。周波数の変更を承認。'],
  ['P', `Squawk VFR, frequency change approved, ${CSS}.`, '（コードを 1200 に）']])}
<ul><li>交通情報の型（AIM 4-1-15・JO 7110.65）：<b>時計の方位・距離・進む方向・機種・高度</b>。時計の方位は<b>機首</b>が 12 時。風で機首と進む方向がずれているときは、言われた方位から少しずれた所を探す。</li>
<li>VFR のレーダー業務は、見張りの責任をなくすものではない。業務を受けている間は周波数を聞き続ける。やめるときは管制官に伝えてから周波数を変え、コードを 1200 にする（AIM 4-1-15）。</li></ul>` },
      { id: 'comm.arrive', t: '⑤ 帰り：進入管制 → 管制塔 → 着陸 → 地上', h: () => `
${say([
  ['P', '（LAB の ATIS “information Charlie” を聞き、高度計を合わせる）', ''],
  ['P', `LAB Approach, ${CS}, one five miles northeast, three thousand five hundred, with information Charlie, landing LAB.`, '進入管制へ。北東 15 マイル、3,500 ft、ATIS の C を聞いた、LAB に着陸したい。'],
  ['Approach', `${CS}, LAB Approach, squawk zero four two five and ident.`, 'コード 0425 にして IDENT ボタンを押せ。'],
  ['P', `Squawk zero four two five, ${CSS}.`, '（コードを入れて IDENT を押す）'],
  ['Approach', `${CSS}, radar contact one four miles northeast of LAB. Enter left downwind runway three six. Contact LAB Tower one one eight point three.`, 'レーダーで確認。滑走路 36 の左ダウンウインドに入れ。LAB 管制塔 118.3 と交信せよ。'],
  ['P', `Left downwind runway three six, Tower one one eight point three, ${CSS}.`, ''],
  ['P', `LAB Tower, ${CS}, one zero miles northeast, two thousand, with Charlie, for left downwind runway three six.`, '管制塔へ。北東 10 マイル・2,000 ft・ATIS C・左ダウンウインドへ向かう。'],
  ['Tower', `${CSS}, LAB Tower, report midfield left downwind runway three six.`, '左ダウンウインドの中央で報告せよ。'],
  ['P', `Report midfield left downwind runway three six, ${CSS}.`, ''],
  ['P', `LAB Tower, ${CSS}, midfield left downwind.`, '（報告）'],
  ['Tower', `${CSS}, number two, follow the Cessna on left base. Runway three six, cleared to land.`, '着陸順 2 番。左ベースの Cessna に続け。滑走路 36、着陸を許可。'],
  ['P', `Number two, traffic in sight, runway three six, cleared to land, ${CSS}.`, '（前の機が見えたことも伝える）'],
  ['Tower', `${CSS}, turn right at Charlie, contact Ground point seven.`, '誘導路 C で右に出よ。地上管制 121.7 と交信せよ。'],
  ['P', `Right at Charlie, Ground point seven, ${CSS}.`, ''],
  ['P', `LAB Ground, ${CS}, clear of runway three six at Charlie, taxi to the west ramp.`, '滑走路 36 を誘導路 C で出た。西のエプロンへ。'],
  ['Ground', `${CSS}, taxi to the west ramp via Charlie, Alpha.`, '誘導路 C・A 経由で西のエプロンへ。'],
  ['P', `Taxi to the west ramp via Charlie, Alpha, ${CSS}.`, '']])}
<ul><li>到着の最初の呼び出しは空港から 15 マイルほど（AIM 4-3-2）。Class C なら空域に入る前に交信を確立する（AIM 3-2-4）。</li>
<li>着陸後は、最初の使える誘導路から速やかに出て、停止線を越えたら止まる。<b>管制塔に言われるまで Ground に変えない</b>。Ground の指示は滑走路の横断を許すものではない（AIM 4-3-21）。</li>
<li>着陸の順番の指示は「<b>Number（番号）, follow（前の機）</b>」。ほかに「Extend downwind（ダウンウインドを延ばせ）」「Make short approach（短い進入をせよ）」（JO 7110.65）。</li></ul>
${fic}` },
      { id: 'comm.option', t: '⑥ 場周経路での練習（タッチアンドゴー）', h: () => `
${say([
  ['P', `LAB Tower, ${CSS}, request closed traffic.`, '場周経路での離着陸の練習を要求。'],
  ['Tower', `${CSS}, left closed traffic approved, report midfield downwind.`, '左回りの場周を承認。ダウンウインドの中央で報告せよ。'],
  ['P', `Left closed traffic, report midfield downwind, ${CSS}.`, ''],
  ['P', `LAB Tower, ${CSS}, midfield left downwind, request the option.`, '（ダウンウインドに入ったところで要求する：AIM 4-3-23）'],
  ['Tower', `${CSS}, runway three six, cleared for the option.`, '滑走路 36 でタッチアンドゴー・ローアプローチ・ストップアンドゴー・フルストップのどれでもよい。'],
  ['P', `Runway three six, cleared for the option, ${CSS}.`, ''],
  ['Tower', `${CSS}, go around.`, 'ゴーアラウンドせよ。'],
  ['P', `Going around, ${CSS}.`, '（まず操縦：全開・姿勢・形態。そのあとで応答）']])}
<ul><li>Cleared for the option は訓練のための許可で、教官が学生の判断を見るのに使う（AIM 4-3-23・PCG）。滑走路に止まる・遅れるときはすぐに伝える。</li>
<li>Go around と言われたら、すぐに操作を始める。VFR は、ほかに指示がなければ滑走路の上を上昇して場周へ（PCG）。{ch:tl}</li></ul>
${bk.sim('課目「場周経路」「ゴーアラウンド」で、管制の指示に復唱しながら飛びます。', ['t2', '場周経路'], ['t4', 'ゴーアラウンド'])}` },
    ],
    terms: [['Information (letter)', 'ATIS の記号', ''], ['Taxi via …', '…を経由して地上走行', ''], ['Departure frequency / Squawk', '出発周波数 / コード', ''], ['Ready for departure', '出発準備よし', ''], ['Fly runway heading', '滑走路の方位で上昇', ''], ['Radar contact', 'レーダーで識別した', ''], ['Resume own navigation', '自分で航法を続けよ', ''], ['Radar service terminated', 'レーダー業務終了', ''], ['Squawk VFR', 'コード 1200 に', ''], ['Enter left downwind', '左ダウンウインドに入れ', ''], ['Number two, follow …', '着陸順 2 番、…に続け', ''], ['Closed traffic', '場周経路での離着陸の練習', ''], ['Cleared for the option', 'オプションの許可', '訓練用']],
    examples: ['ATIS の高度計 30.01 → 地上で高度計を合わせ、表示が空港の標高（LAB は 55 ft）に近いことを確かめる。', '“Number two, follow the Cessna on left base” → 見えたら “traffic in sight”。見えなければ “negative contact” と言って探す。前の機の後ろに付く。'],
    cautions: ['この章の交信は FAA の言い方と方式を参考にした架空の練習用台本。実際の空港の手順・周波数・管制官の言い方は場所と状況で違う。', 'Sanford など実際の空港の手順は、FAA の最新資料と管制官の指示で確かめる。'],
    quiz: [
      { q: '地上管制の「Runway three six, taxi via Alpha」で、滑走路 36 に入ってよい？', choices: ['入ってよい', '入ってはいけない（手前で止まる）', '横断ならよい', 'LUAW と同じ'], answer: 1, why: 'AIM 4-3-18：出発滑走路の指定とタキシーの指示は、その滑走路に入る・横切る許可ではない。' },
      { q: '着陸して滑走路を出た。Ground に変えるのはいつ？', choices: ['接地したらすぐ', '滑走路を出たらすぐ', '管制塔に「contact ground」と言われてから', '駐機場に着いてから'], answer: 2, why: 'AIM 4-3-14・4-3-21：着陸した機は、管制官に言われるまで管制塔の周波数にいる。' },
      { q: '交通情報「traffic, one o\'clock, four miles, westbound」の「one o\'clock」の基準は？', choices: ['北', '機首の方向', '進んでいる方向（航跡）', '滑走路の方向'], answer: 1, why: '時計の方位は機首（12 時）が基準。風で機首と航跡がずれているときは注意。' },
    ],
    refs: [R.aim41, R.aim43, R.aim42, R.aim52, R.jo71, R.pcg], lessons: ['t1', 't2', 't4'] });

  // ======================================================================= radio 5
  B.add({ id: 'radio5', before: 'hf', part: 'p1', t: '管制塔のない空港・緊急・無線の故障・Sanford・FAA と ICAO の違い', en: 'Non-towered airports, emergencies, radio failure, Sanford, FAA and ICAO',
    summary: 'CTAF での自己通報、トランスポンダーと MAYDAY・PAN-PAN、無線が使えないときの手順と灯火信号、Sanford で気をつけること、英国（ICAO）との言い方の違い、上達の練習法。',
    secs: [
      { id: 'comm.ctaf', t: '管制塔のない空港：CTAF で自己通報', h: () => `
<p>管制塔のない空港（または管制塔が閉まっている時間）では、全員が<b>共通の周波数（CTAF）</b>で、自分の位置と意図を知らせ合います（AIM 4-1-9）。CTAF は UNICOM・MULTICOM（122.9）・時間外の管制塔の周波数などで、チャートと Chart Supplement に載っています。</p>
${bk.t(['いつ（AIM 4-1-9 の表）', '例'], [
  ['出発：タキシーの前・滑走路に入る前', '“Strawn traffic, Queen Air Seven One Five Five Bravo, (場所) taxiing to runway two six, Strawn.”'],
  ['出発：離陸・場周を離れる', '“Strawn traffic, Queen Air Seven One Five Five Bravo, departing runway two six, departing the pattern to the (方向), climbing to (高度), Strawn.”'],
  ['到着：10 マイル手前', '“Strawn traffic, Apache Two Two Five Zulu, (位置), (高度), (descending), Strawn.”'],
  ['到着：ダウンウインド・ベース・ファイナルに入るとき', '“Strawn traffic, Apache Two Two Five Zulu, entering downwind runway one seven, full stop, Strawn.”'],
  ['滑走路を出たとき', '“Strawn traffic, Apache Two Two Five Zulu, clear of runway one seven, Strawn.”']])}
<ul><li><b>空港名を最初と最後に</b>言う（近くの別の空港も同じ周波数を使うことがある）。</li>
<li>“active runway” ではなく<b>滑走路の番号</b>を言う。</li>
<li>“Traffic in the area, please advise” は決まった言い方ではなく、使わない（AIM 4-1-9）。</li>
<li>10 マイル以内では CTAF を聞く。VFR の直進着陸（straight-in）は空中衝突の危険が増えるので FAA は勧めていない（AIM 4-1-9）。</li></ul>` },
      { id: 'comm.xpdr', t: 'トランスポンダー・MAYDAY と PAN-PAN', h: () => `
${bk.t(['コード', '意味'], [['1200', 'VFR（管制から指定がないとき）'], ['7700', '緊急'], ['7600', '無線の故障'], ['7500', 'ハイジャック（不法な干渉）']])}
<p>AIM 6-1-2：<b>位置・燃料・天気などに不安を感じた時点で、少なくとも「緊急（urgency）」の状態</b>です。危険になってからではなく、<b>その時に助けを求める</b>。「遅れが事故を起こしてきた」と AIM は書いています。</p>
${bk.t(['', '遭難（distress）', '緊急（urgency）'], [['意味', '重大な危険が迫り、直ちに助けが必要', '直ちにではないが、安全に関わる状態'], ['言葉', '<b>MAYDAY</b> を 3 回', '<b>PAN-PAN</b> を 3 回'], ['優先', 'すべての交信より優先。その周波数は静かにする', '遭難以外より優先']])}
<p><b>伝える順番</b>（AIM 6-3-2。必要なものを、できればこの順に）：①MAYDAY ×3 / PAN-PAN ×3 ②相手の局 ③コールサインと機種 ④状況 ⑤天気 ⑥意図と要求 ⑦現在位置と針路（迷ったら最後に分かった位置・時刻・針路） ⑧高度 ⑨残りの燃料（分） ⑩乗っている人数 ⑪その他。</p>
${say([['P', `Mayday, Mayday, Mayday, LAB Tower, ${CS}, Piper Archer, engine failure, landing in a field five miles north of LAB, two thousand feet, two persons on board.`, '遭難。LAB 管制塔へ。Archer 7LA、パイパー・アーチャー。エンジン故障。LAB の北 5 マイルの畑に着陸する。2,000 ft。搭乗 2 名。'],
  ['P', `Pan-pan, Pan-pan, Pan-pan, LAB Approach, ${CS}, unsure of position, one hour fuel remaining, three thousand five hundred, request assistance.`, '緊急。現在位置が不確か。燃料 1 時間分。3,500 ft。助けを求める。']])}
<ul><li>ふだん使っている周波数でよい。つながらなければ <b>121.5 MHz</b>（緊急周波数）や “<b>Any station</b>” への呼びかけ（AIM 6-3-1）。</li>
<li>管制と交信中なら、もらっているコードのまま。交信できなければ <b>7700</b>（AIM 6-3-2）。</li>
<li>できれば上昇すると、無線もレーダーも届きやすい（AIM 6-3-2）。</li>
<li>それでも<b>最優先は操縦</b>（Aviate → Navigate → Communicate）。{ch:emg}</li></ul>
${bk.sim('エンジン故障の課目で、正しい遭難通報を選びます。', ['e3', '上空でのエンジン故障'])}` },
      { id: 'comm.nordo', t: '無線が使えないとき・灯火信号', h: () => `
<p>まず故障か操作の誤りかを確かめる：音量・スケルチ・周波数（使用中の側か）・MIC の選択・ヘッドセットの差し込み・スタックマイク・もう一方の無線機（{ch:radio1}）。</p>
${bk.t(['状況', 'すること（AIM 4-2-13・6-4・14 CFR 91.185）'], [
  ['VFR で無線が故障', '<b>VFR のまま飛び、できるだけ早く（as soon as practicable）着陸</b>。トランスポンダー <b>7600</b>'],
  ['管制塔のある空港へ・受信機が故障', 'Class D の地表区域の外か上で、交通の流れ（使用滑走路）を見てから、管制塔に「機種・位置・高度・着陸したい・灯火信号で管制してほしい」と送信（聞こえていなくても）。3〜5 マイルで位置を送信して場周に入り、灯火信号を見る'],
  ['送信機が故障', '外か上で流れを見てから場周に入る。管制塔の周波数を聞き、灯火信号を探す'],
  ['送信も受信も故障', '外か上で流れを見てから場周に入り、管制塔を見て灯火信号を受ける'],
  ['応答のしかた', '<b>昼は翼を振る</b>（地上ではエルロンやラダーを動かす）、<b>夜は着陸灯や航空灯を点滅</b>'],
  ['出発前に無線が故障', '直す。直せなければ管制塔に電話して、無線なしで出発してよいか許可を得る']])}
<h3>管制塔の灯火信号（AIM 4-3-13）</h3>
${bk.t(['信号', '地上の航空機', '飛行中の航空機'], [['緑の連続', '離陸してよい', '着陸してよい'], ['緑の点滅', 'タキシーしてよい', '着陸のために戻れ（後で緑の連続）'], ['赤の連続', '止まれ', '他機に進路を譲り、旋回を続けよ'], ['赤の点滅', '使用中の滑走路から出よ', '空港は危険、着陸するな'], ['白の点滅', '出発点に戻れ', '—'], ['赤と緑の交互', '十分に注意せよ', '十分に注意せよ']])}
${bk.key('故障を疑ったら：7600、VFR を保つ、早めに降りる、灯火信号を見る', '「緑の点滅」は空中では「戻れ」、地上では「タキシーしてよい」')}` },
      { id: 'comm.sfb', t: 'Sanford（KSFB）で気をつけること', h: () => `
<p>FAA の「From the Flight Deck: Sanford」は、次のことを説明しています。</p>
<ul><li>訓練生から旅客機まで経験の違う多くの操縦者が同じ空港を使う。</li>
<li>9L/27R・9C/27C・9R/27L の平行滑走路と、交差する 18/36。<b>滑走路の取り違え</b>が起きやすい。</li>
<li>Hot Spot HS1：誘導路 C と滑走路 27C の取り違え（滑走路 18 から出て誘導路 C へ右折するはずが 27C へ）。</li>
<li>Line Up and Wait を使う。<b>滑走路の指定・誘導路・hold short の指示は、コールサイン付きで同じ送信の中で復唱</b>する。足りなければ言い直しを求められる。</li>
<li>空域は Class C、その上に Orlando の Class B。訓練の場周は upwind・crosswind・base を約 1 マイルで。</li></ul>
${bk.key('平行滑走路では L・C・R まで復唱し、入る前に標識と方位で確かめる', '詳しくはメニューの「Sanford の資料」と「英語交信」の練習へ')}` },
      { id: 'comm.icao', t: 'FAA と ICAO（英国）の言い方の違い・上達の練習法', h: () => `
<p>公開情報では、ANA の座学はロンドンで英語で行い、航空管制通信のシミュレーションもあります。英国の無線の言い方は ICAO に沿った英国の手引き（CAA の <b>CAP 413</b>）にまとめられています。米国（FAA）の言い方と違うところがあるので、両方を知っておくと混乱しません（どちらで教わるかは<span class="tag unk">推測・要確認</span>）。代表的な例：</p>
${bk.t(['', 'FAA（米国：AIM・PCG）', 'ICAO・英国'], [
  ['小数点', 'point（one two one point seven）', 'decimal（AIM 4-2-8 の注記）'],
  ['高度計規正値', 'altimeter two niner niner two（inHg）', 'QNH one zero one three（hPa）'],
  ['はい', 'affirmative', 'affirm'],
  ['「どうぞ話して」', 'go ahead', 'pass your message'],
  ['滑走路の手前の待機', 'hold short of runway …', 'holding point（taxi to holding point runway …）'],
  ['フライトレベルに変わる高度', '18,000 ft（全国共通）', '英国は空域ごとに決められていて、ずっと低い']])}
<p>どちらでも共通：フォネティックアルファベット、数字の発音（niner など）、MAYDAY・PAN-PAN、line up and wait、復唱の考え方。</p>
<h3>上達の練習法（この教材の使い方）</h3>
<ol><li><b>型を覚える</b>：この部の表を見ずに、最初の呼び出しと復唱を言えるようにする。</li>
<li><b>台本で声に出す</b>：「英語交信」ページの「1 回の飛行」を音声に合わせて言う。次にパイロットの言葉を隠して、自分で言ってから答えを見る。</li>
<li><b>数字の練習</b>：同じページの「数字とアルファベット」と「聞き取り」で、聞いて書き取る。</li>
<li><b>本物を聞く</b>：インターネットで公開されている管制交信のライブ配信（例：LiveATC.net）を、空港図とチャートを見ながら聞く。</li>
<li><b>チェアフライング</b>：椅子に座り、1 回の飛行の交信と操作を最初から最後まで声に出す。</li></ol>` },
    ],
    terms: [['CTAF', '共通の交通情報周波数', '管制塔のない空港'], ['UNICOM / MULTICOM (122.9)', '空港の地上局 / 局のない空港の周波数', ''], ['Self-announce', '自己通報', ''], ['Straight-in', '直進着陸', ''], ['Mayday / Pan-pan', '遭難 / 緊急', ''], ['121.5 MHz', '緊急周波数', ''], ['Any station', '聞いているどの局でも', ''], ['NORDO / Radio failure', '無線の故障', '7600'], ['Light gun signals', '灯火信号', ''], ['Hot spot', '事故の起きやすい場所', ''], ['QNH / Affirm / Pass your message', 'ICAO・英国の言い方', ''], ['CAP 413', '英国の無線電話の手引き', 'UK CAA']],
    examples: ['管制塔のない空港へ 10 マイル：“Strawn traffic, Archer Seven Lima Alpha, ten miles north, three thousand five hundred, descending, will enter left downwind runway one seven, full stop, Strawn.”（AIM の型。空港名・コールサインは例）', '無線が聞こえない → 7600 → 空港の外側で使用滑走路を確かめてから場周に入り、管制塔の緑の連続光で着陸。昼は翼を振って応答。'],
    cautions: ['CTAF の空港名（Strawn など）は AIM の例。実際の空港の周波数と手順は Chart Supplement で確認する。', '英国・ICAO の言い方は代表例のみ。詳しくは CAP 413 など各国の公式資料で。'],
    quiz: [
      { q: '管制塔のない空港での自己通報で、AIM が勧めていないものは？', choices: ['空港名を最初と最後に言う', '滑走路の番号を言う', '“Traffic in the area, please advise” と言う', '10 マイル手前で位置を知らせる'], answer: 2, why: 'AIM 4-1-9：“Traffic in the area, please advise” は決まった言い方ではなく使わない。' },
      { q: 'AIM 6-1-2 が「少なくとも緊急の状態」とする時点は？', choices: ['エンジンが止まったとき', '位置・燃料・天気などに不安を感じた時点', '着陸できないとき', '管制に言われたとき'], answer: 1, why: '不安を感じた時点で助けを求める。危険になってからでは遅い。' },
      { q: 'VFR で無線が故障した。14 CFR 91.185 の考え方は？', choices: ['IFR に切り替える', 'VFR のまま飛び、できるだけ早く着陸する', '出発地に必ず戻る', '高度を上げ続ける'], answer: 1, why: 'VFR 状態なら VFR を続けて、できるだけ早く（as soon as practicable）着陸する。トランスポンダーは 7600。' },
      { q: '飛行中、管制塔から緑の点滅の灯火信号。意味は？', choices: ['着陸してよい', '着陸のために戻れ（後で緑の連続）', '空港は危険', '旋回を続けよ'], answer: 1, why: 'AIM 4-3-13：飛行中の緑の点滅は「戻れ」。着陸の許可は緑の連続。地上の緑の点滅は「タキシーしてよい」。' },
    ],
    refs: [R.aim41, R.aim63, R.aim64, R.aim43, R.sfb, R.cap413, R.ana1], lessons: ['e3', 't2'] });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
