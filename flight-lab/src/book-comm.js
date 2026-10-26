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
  const B = FL.book, R = B.R, bk = B.bk, FIG = FL.bookFigs;
  const CS = 'Archer Seven Lima Alpha', CSS = 'Archer 7LA';
  // a pilot / ATC exchange as a small table: who, English, Japanese (and, under it, an optional note: why, and the source)
  const say = (rows) => `<table class="bk-t bk-radio"><tr><th>誰</th><th>英語（交信）</th><th>意味</th></tr>${rows.map(([w, en, jp, note]) => `<tr><td class="who ${w === 'P' ? 'p' : 'a'}">${w === 'P' ? 'あなた' : w}</td><td class="en">${en}</td><td>${[jp, note && `<span class="small mute">${note}</span>`].filter(Boolean).join('<br>')}</td></tr>`).join('')}</table>`;
  const fic = '<p class="small mute">LAB 空港・周波数・コールサイン「Archer Seven Lima Alpha（Archer 7LA）」は架空の練習用です。実際の周波数で使わないでください。</p>';

  // ======================================================================= radio 1
  B.add({ id: 'radio1', before: 'hf', part: 'p1', t: '無線交信のしくみと基本の技術', en: 'Radio communication: how it works and basic technique',
    summary: '1 回の飛行で誰と話すのか、無線機とオーディオパネルの使い方、「聞く → 考える → 話す」の順番、日本語を話す人が英語の交信を聞き取るコツ。',
    secs: [
      { id: 'radio.why', t: '交信とは何か・誰と話すのか', h: () => `
${bk.aim('無線交信は何のためにするのかと、1 回の飛行で、誰と、どの順番で話すのかを知ります。')}
${FIG.radioRelay()}
<p>飛行中の無線交信（radiotelephony）は、操縦士と管制官が、<b>同じ絵</b>（どこに・どの機が・次に何をするか）を持つための道具です。米国連邦航空局（FAA）の航空情報マニュアル（AIM）は、交信でいちばん大切なのは<b>「理解」（understanding）</b>だとしています。交信はできるだけ<b>短く</b>しますが、伝わらなければ必要な言葉を足して伝えます。答えるときは、自分のコールサインを言います。仲間うちの言葉や雑談は使いません（AIM 4-2-1）。</p>
<h4>1 回の飛行で話す、主な相手</h4>
<ul><li><b>ATIS</b>：空港の天気・使う滑走路・注意を、くり返し流す録音の放送です。話しかけることはできません。出発前と、帰って空港に近づく前に聞きます。</li>
<li><b>Ground（地上管制）</b>：誘導路を動く指示と、滑走路を横切る指示を出します。出発のときは、エンジンをかける前に呼ぶよう AIM は勧めています（AIM 4-3-14）。</li>
<li><b>Tower（飛行場管制）</b>：滑走路の使用（離陸・着陸・横断）と、場周経路を受け持ちます。</li>
<li><b>Departure / Approach（出発管制・進入管制）</b>：レーダーで、空港を出る機と入る機を誘導し、ほかの機の情報を伝えます。</li></ul>
${bk.t(['ほかの相手', 'していること'], [['Clearance Delivery', 'ATC の許可（clearance）を伝える。おもに IFR の出発に使い、空港によっては VFR の機にも出発の周波数やトランスポンダーのコードを伝える。ある空港だけ（AIM 4-3-14）'], ['Center（航空路管制）', '広い範囲をレーダーで見る。IFR の巡航を受け持つ'], ['Flight Service（「Radio」と呼ぶ）', '天気の情報、VFR の飛行計画を開く・閉じる'], ['CTAF', '管制塔のない空港（または管制塔が閉まっている時間）で使う共通の周波数。自分の位置とこれからすることを、まわりの機に知らせる。UNICOM などの周波数が CTAF に決められている（AIM 4-1-9・{ch:radio5}）'], ['UNICOM', '空港の運営会社などが置く、政府のものではない無線局。空港の情報を伝える（PCG）']])}
<p>相手は「<b>場所の名前＋局の種類</b>」で呼びます。たとえば Miami Ground、St. Louis Departure、Washington Center、Chicago Radio です（AIM 4-2-6）。言葉の意味は、FAA の Pilot/Controller Glossary（操縦士と管制官の用語集）で調べられます。</p>
${bk.key('交信は「理解」のため。短く、でも伝わらなければ言葉を足す', '地上を動くのは Ground、滑走路と場周は Tower、空港を離れたら Departure', '相手は「場所の名前＋局の種類」で呼ぶ')}
${bk.q('着陸して滑走路を出た。誘導路を駐機場まで動く指示は、誰からもらう？', '<b>Ground（地上管制）</b>です。ただし、管制塔に「contact ground」と言われてから周波数を変えます（AIM 4-3-14）。滑走路を出たら、管制官から別の指示がなければ、停止線を越えたところで止まります（AIM 4-3-21）。')}` },
      { id: 'radio.equip', t: '無線機・マイク・オーディオパネルの使い方', h: () => `
${bk.aim('周波数を合わせてから、相手に声が届くまでの操作を、実際の順番で覚えます。返事がないときの確かめ方も覚えます。')}
${FIG.radioAudioPanel()}
<p>航空機の通信（COM）は、VHF の 118.000〜136.975 MHz を使います。G1000 型の無線の窓には、<b>使用中（active）</b>と<b>予備（standby）</b>の 2 つの周波数が出ます。</p>
<ol><li><b>予備に合わせる</b>：次に使う周波数を、予備の側に入れます。</li>
<li><b>⇄ で入れ替える</b>：予備が使用中になります。前の周波数は予備に残るので、すぐ戻せます。</li>
<li><b>MIC を選ぶ</b>：オーディオパネルで、どの無線機で話すか（COM1 MIC か COM2 MIC）を選びます。聞く無線機も選びます。</li>
<li><b>聞いてから話す</b>：周波数を変えたら、少し聞いて、誰も話していないことを確かめます。送信ボタン（<b>PTT</b>：push-to-talk。操縦輪の親指のスイッチ）を押し、<b>一呼吸おいてから</b>話し始めます。最初の言葉が切れないためです。マイクは唇のすぐ近くで、<b>ふつうの会話の声</b>で話します（AIM 4-2-2）。</li>
<li><b>離して待つ</b>：管制官は書き取ったり、別の周波数で話していたりします。数秒待ってから、もう一度呼びます。</li></ol>
<p>PTT を押している間は、相手の声は聞こえません。2 機が同時に送信すると、聞く側には雑音か、強い方の声しか届きません。送った 2 機は、どちらもそれに気づけません。PTT が押しっぱなしになると（<b>スタックマイク</b>、stuck mike）、その周波数がずっと使えなくなります。</p>
<p>VHF の電波は光のようにまっすぐ進むので、山や地球の丸みの陰には届きません。<b>高く飛ぶほど、遠くまで届きます</b>（AIM 4-2-2）。</p>
${bk.key('予備に合わせる → ⇄ → MIC を選ぶ → 聞いてから PTT → 一呼吸 → 話す', '返事がないとき：音量・周波数（使用中の側か）・MIC の選択・ヘッドセット・スタックマイク', '高く飛ぶほど、無線は遠くまで届く')}
${bk.warn('<b>よくある間違い：</b>COM2 に新しい周波数を合わせたのに、オーディオパネルの MIC が COM1 のまま。話しても、相手には届きません。')}
${bk.q('出発管制の周波数を COM2 に合わせて呼んだのに、返事がない。オーディオパネルでまず確かめることは？', 'MIC が COM2 になっているか（送信の無線機の選択）と、COM2 の受信のボタンが入っているかです。そのあと、周波数が使用中の側にあるか、音量を確かめます。')}` },
      { id: 'radio.technique', t: '聞く → 考える → 話す', h: () => `
${bk.aim('送信の前に何をするか、操縦と交信のどちらを先にするか、学生操縦士はどう名乗るかを学びます。')}
<ol><li><b>聞く</b>：送信する前に、必ず聞きます。ほかの機が話している最中に送信すると、相手の受信をふさいでしまいます。ATIS や周波数を聞いているだけで、わかることもたくさんあります（AIM 4-2-2）。</li>
<li><b>考える</b>：言うことを先に決めます。長い内容は紙に書いておきます（AIM 4-2-2）。</li>
<li><b>話す</b>：決まった型で、短く、はっきり話します（${bk.see('comm.pattern', '呼び出しの型')}）。</li></ol>
<p>そして、<b>操縦がいちばん先</b>です（Aviate → Navigate → Communicate）。交信に気を取られて、高度や速度を外してはいけません。忙しいときは、管制に「Stand by」（少し待って）と言ってかまいません。管制官が「Stand by」と言ったときは、許可でも不許可でもありません。待って、長くかかるようなら、もう一度呼びます（PCG）。緊急のときの考え方は {ch:emg} で学びます。</p>
<h4>学生操縦士であることを伝える</h4>
<p>AIM 4-2-4 は、学生操縦士が最初の呼び出しで <b>“student pilot”</b> と名乗ることを勧めています（例：「Dayton tower, Fleetwing One Two Three Four, student pilot.」）。管制官は、必要なら手助けをしてくれます。Clearance Delivery・Ground・Tower・Approach・Departure・Flight Service の、それぞれ最初の交信で名乗るのがよいとされています。</p>
${say([['P', `LAB Ground, ${CS}, <b>student pilot</b>, at the west ramp with information Bravo, request taxi.`, 'LAB 地上管制へ。Archer 7LA、学生操縦士。西のエプロンにいて、ATIS の B を聞いた。タキシーを要求。']])}
${fic}
${bk.key('聞く → 考える → 話す。周波数を変えたら、まず聞く', '操縦がいちばん先。忙しければ「Stand by」', '学生操縦士は、最初の交信で student pilot と名乗る')}
${bk.q('離陸の前に Tower の周波数に変えた。すぐに「ready for departure」と呼んでよい？', 'まず少し聞きます。管制官がほかの機に質問していて、その答えの途中かもしれません（AIM 4-2-2）。周波数が空いていることを確かめてから呼びます。')}` },
      { id: 'radio.listen', t: '日本語を話す人のための聞き取りのコツ', h: () => `
${bk.aim('英語の交信は速く、雑音もあります。でも、言う内容の型は決まっています。型を知って、聞き取れる量を増やします。')}
${FIG.radioCallAnatomy()}
<p>この節は、教材としての学習のコツです。</p>
${bk.t(['コツ', 'やり方'], [
  ['① まず自分のコールサインを聞く', '管制官の指示は「あなたのコールサイン →（最初の交信では）局の名前 → 指示」の順です（JO 7110.65 2-4-8）。自分のコールサイン（Archer Seven Lima Alpha）が聞こえたら、そこから集中します。ほかの機への指示でも、同じ滑走路を使う機などは頭に入れておきます'],
  ['② 次に来る言葉を予想する', 'タキシーなら「滑走路・経路・hold short」、離陸なら「滑走路・風・cleared for takeoff」、帰りなら「入り方・報告する所・順番」。予想があると、聞きのがした所だけを「Say again」で聞き直せます'],
  ['③ 数字は書き取る', 'ひざ板（kneeboard）に、聞いた順に短い記号で書きます。周波数・コード・高度・針路は、覚えておこうとしません'],
  ['④ まぎらわしい言葉を知っておく', 'two（2）と to・too、four（4）と for、left と right、hold short（手前で止まる）と hold position（その場で止まる）。数字は 1 けたずつ言うことが多いですが、まとめて言うこともあります。自信がなければ聞き直します'],
  ['⑤ わからなければ聞き直す', '推測で動きません。「Say again」と言います。自分あての指示か不安なら「Verify clearance for Archer Seven Lima Alpha」（AIM 4-2-4）'],
  ['⑥ 声に出して練習する', '台本を見ながら、音声と同時に言います（パラレル・リーディング）。慣れたら台本を見ずに、少し遅れて追いかけて言います（シャドーイング）。1 回の飛行の交信を、最初から最後まで声に出してみます']])}
${bk.key('自分のコールサインのあとに、指示が来る', '次の言葉を予想して聞く。数字は書く', 'わからなければ「Say again」。推測で動かない')}
${bk.sim('場周経路の課目で、管制塔との交信を聞きながら飛びます。英語交信のページでは、1 回の飛行の交信を音声つきで最初から最後まで聞けます（メニュー → 英語交信）。', ['t2', '場周経路'])}
${bk.q('地上管制の指示の後半、出発周波数が聞き取れなかった。どうする？', '推測で合わせず、「Say again departure frequency, Archer Seven Lima Alpha」のように、聞き取れなかった所だけを聞き直します。わかった所まで復唱してもかまいません。')}` },
    ],
    terms: [['Radiotelephony', '無線電話（音声の交信）', ''], ['Air traffic control (ATC)', '航空交通管制', ''], ['ATIS', '飛行場情報の自動放送', 'AIM 4-1-13'], ['Clearance Delivery', 'ATC の許可の伝達（おもに IFR）', 'ある空港だけ'], ['Ground / Tower', '地上管制・飛行場管制', ''], ['Departure / Approach', '出発管制・進入管制', 'レーダー'], ['Center', '航空路管制', ''], ['Flight Service Station (FSS) / "Radio"', '飛行情報業務', ''], ['CTAF', '管制塔のない空港の共通の周波数', 'AIM 4-1-9'], ['UNICOM', '政府のものではない空港の無線局', 'PCG'], ['Active / Standby frequency', '使用中・予備の周波数', ''], ['PTT (push-to-talk)', '送信ボタン', ''], ['Stuck mike', '押しっぱなしのマイク', ''], ['Audio panel', 'オーディオパネル', 'MIC と受信の選択'], ['Student pilot', '学生操縦士（最初の交信で名乗る）', 'AIM 4-2-4'], ['Say again', 'もう一度言ってください', ''], ['Stand by', '少し待って', '']],
    examples: ['離陸前、周波数を Tower に変えた → 先に数秒聞いて、誰も話していないこと・管制官の質問の途中でないことを確かめてから「LAB Tower, Archer Seven Lima Alpha, holding short runway three six, ready for departure」。', '返事がない → 音量・周波数・MIC の選択・スタックマイクを確かめる → もう一度、短く呼ぶ。'],
    cautions: ['この章の周波数・LAB 空港・コールサインは架空の練習用。実際の周波数は、最新のチャートと Chart Supplement で確かめる。', 'この教材は実際の管制にはつながらず、音声を送信しない。'],
    quiz: [
      { q: '周波数を変えた直後に、まずすることは？（AIM 4-2-2）', choices: ['すぐに呼び出す', '少し聞いて、誰も話していないことを確かめる', '音量を下げる', 'トランスポンダーを 7600 にする'], answer: 1, why: 'Listen before you transmit。変えた直後は、ほかの交信の途中かもしれない。割り込むと、相手の受信をふさぐ。' },
      { q: '着陸して滑走路を出たあと、地上を動く指示をもらう相手は？', choices: ['ATIS', 'Ground', 'Departure', 'Center'], answer: 1, why: '地上（誘導路）の移動は Ground。ただし、管制塔に「contact ground」と言われてから切り替える（AIM 4-3-14）。' },
      { q: 'AIM が学生操縦士に勧めている名乗り方は？', choices: ['最初の交信で "student pilot" と言う', '交信の最後に "over" と言う', '名乗らない', 'コールサインを省く'], answer: 0, why: 'AIM 4-2-4：最初の呼び出しで student pilot と名乗ると、管制官が必要な手助けをしてくれる。' },
      { q: 'COM2 に出発管制の周波数を合わせて呼んだのに、返事がない。オーディオパネルでまず確かめるのは？', choices: ['NAV1 の音量', 'MIC が COM2 になっているか', 'トランスポンダーのコード', '高度計の規正値'], answer: 1, why: '話す無線機は、オーディオパネルの MIC で選ぶ。COM2 に合わせても、MIC が COM1 のままなら相手に届かない。' },
      { q: 'PTT を押して、すぐに話し始めると起きやすいことは？（AIM 4-2-2）', choices: ['声が大きくなりすぎる', '最初の言葉が切れて送られない', '周波数が変わる', 'ほかの機の声がよく聞こえる'], answer: 1, why: 'ボタンを押してから一呼吸おくと、最初の言葉まで送られる。' },
    ],
    refs: [R.aim42, R.aim43, R.aim41, R.pcg], lessons: ['t1', 't2'] });

  // ======================================================================= radio 2
  B.add({ id: 'radio2', before: 'hf', part: 'p1', t: '言葉の決まり：アルファベット・数字・標準用語', en: 'Standard words: the phonetic alphabet, numbers and phraseology',
    summary: 'フォネティックアルファベットと数字の発音、数字の言い方（1 けたずつが基本、高度と雲の高さは特別）、コールサインの決まり、標準用語（Roger・Wilco・Say again など）の正しい意味。',
    secs: [
      { id: 'comm.basic', t: 'フォネティックアルファベットと数字の発音', h: () => `
${bk.aim('雑音の中でも、文字や数字を 1 つずつ確実に伝えるための、決まった言い方を覚えます。')}
${FIG.phoneticBoard()}
<p>文字は、ICAO（国際民間航空機関）の<b>フォネティックアルファベット</b>で言います。最初の交信で自分のコールサインを名乗るとき、1 文字だけの言葉、聞き取りにくい言葉のつづりに使います（AIM 4-2-7）。</p>
<p>数字も、雑音の中で区別しやすい読み方が決まっています。3 は <b>TREE</b>、5 は <b>FIFE</b>、9 は <b>NIN-ER（niner）</b>です（AIM の表）。つづりは、AIM の表では Alfa・Juliett・Xray です（X-ray と書く資料もあります）。</p>
${bk.key('最初の交信では、コールサインをフォネティックで全部言う', '数字は 1 けたずつ。3 は tree、5 は fife、9 は niner', '発音は、カタカナでなく音声で確かめる')}
${bk.q('登録記号 N12AB の飛行機。文字と数字を 1 つずつ言うと？', '<b>November One Two Alfa Bravo</b>。機種名を言うときは N を省いて、たとえば「Archer One Two Alfa Bravo」と名乗ります（AIM 4-2-4）。')}` },
      { id: 'comm.numbers', t: '数字の言い方：高度・針路・速度・周波数・時刻・コード', h: () => `
${bk.aim('数字は 1 けたずつ言うのが基本です。高度と雲の高さは、特別な言い方をします。言い方の型を覚えて、聞きまちがいをなくします。')}
<h4>① 1 けたずつ言うもの（基本）</h4>
${bk.t(['種類', '書き方', '言い方', '出典'], [
  ['ふつうの数字', '10', 'one zero', 'AIM 4-2-8'],
  ['周波数', '121.7 / 119.75', 'one two one point seven / one one niner point seven five', 'AIM 4-2-8。小数点は point（ICAO の言い方は decimal）'],
  ['高度計規正値', '30.01', 'altimeter three zero zero one', 'JO 7110.65 2-4-17'],
  ['トランスポンダーのコード', '4271', 'squawk four two seven one', 'JO 7110.65 2-4-17'],
  ['針路・方位', '005 / 090 / 360', 'heading zero zero five / zero niner zero / three six zero', 'AIM 4-2-10。必ず 3 けた・磁方位（真方位のときは true を付ける）。北は 360（000 とは言わない）'],
  ['風', '220° 15 kt', 'wind two two zero at one five', 'JO 7110.65 2-4-17。3 kt 未満は calm（JO 7110.65 2-6-3）'],
  ['速度', '120 kt', 'one two zero knots', 'AIM 4-2-11'],
  ['滑走路', '36 / 9R / 27C', 'runway three six / runway niner right / runway two seven center', 'JO 7110.65 2-4-17'],
  ['時刻', '14:30 UTC', 'one four three zero Zulu', 'AIM 4-2-12']])}
<p>管制官は、周波数の小数点以下 3 けた目を言わない決まりです（135.275 → one three five point two seven）（JO 7110.65 2-4-17）。</p>
<h4>② 高度と雲の高さは「千・百」で言う</h4>
${bk.t(['高度', '言い方', '決まり'], [['500 ft', 'five hundred', '9,900 ft までの、きりのよい数（高度・雲の高さ）は「千・百」で言う（AIM 4-2-8）'], ['4,500 ft', 'four thousand five hundred', '同じ'], ['10,000 ft', 'one zero thousand', 'thousand の前の数字を 1 けたずつ（AIM 4-2-8）'], ['13,500 ft', 'one three thousand five hundred', '同じ'], ['FL190（19,000 ft）', 'flight level one niner zero', '米国では 18,000 ft MSL から flight level（AIM 4-2-9）']])}
<p>聞きまちがいを防ぐため、管制官が高度を「ten thousand」のようにまとめて言い直すこともあります（JO 7110.65 2-4-17・2-4-18）。</p>
<h4>③ そのほかの決まり</h4>
<ul><li><b>航空路</b>：V12 は「Victor twelve」と言います（AIM 4-2-8）。</li>
<li><b>Ground の周波数</b>：多くは 121.6〜121.9 MHz なので（AIM 4-3-14）、「Contact Ground point seven」（121.7）と短く言われることがあります。</li>
<li><b>時刻</b>：FAA は UTC を使います。フロリダ中部の標準時（EST）は UTC−5、夏時間（EDT）は UTC−4 です（AIM 4-2-12）。</li>
<li><b>交通情報の時計の方位</b>：「traffic, two o'clock, five miles」の時計の方位は、機首ではなく、<b>進んでいる方向（航跡）が 12 時</b>です。管制官のレーダーには航跡しか見えないからです。横風で機首をずらしているときは、言われた方位と、窓から見える方位がずれます（AIM 4-1-15）。</li></ul>
${bk.key('数字は 1 けたずつが基本。周波数の小数点は point', '高度と雲の高さは thousand・hundred。10,000 ft 以上は thousand の前を 1 けたずつ', '北は heading three six zero。時計の方位は航跡が 12 時')}
${bk.q('“Climb and maintain one zero thousand five hundred” は何 ft？ “heading three six zero” はどちら向き？', '<b>10,500 ft</b> と<b>北（360°）</b>です。10,000 ft 以上は thousand の前を 1 けたずつ言い、北は 360 と言います。')}` },
      { id: 'comm.callsign', t: 'コールサインの決まり', h: () => `
${bk.aim('コールサインは「誰への交信か」を決める、いちばん大切な部分です。省略してよいときと、いけないときを覚えます。')}
<ul><li><b>最初の交信では省略しない</b>：機種名・型式名かメーカー名のあとに、登録記号の数字と文字を言います。機種名を言うときは、<b>先頭の N を省きます</b>（例：Bonanza Six Five Five Golf）（AIM 4-2-4）。</li>
<li><b>省略は管制官から</b>：交信が確立したあと、管制官が「機種名＋最後の 3 文字」に省略して呼んだら、操縦士もそれを使ってかまいません（AIM 4-2-4）。例：Cessna One Two Three Four Five → Cessna Three Four Five。</li>
<li><b>似たコールサインがいるとき</b>は省略しません。自分への指示か疑わしいときは「<b>Verify clearance for</b>（完全なコールサイン）」と言います。似たコールサインの取りちがえは、ほかの機への許可を自分のものとして実行してしまう事故につながります（AIM 4-2-4）。</li>
<li><b>エアライン</b>は、会社の呼び名と便名を、数字をまとめた形で言います（例：United Twenty-Five Heavy）（AIM 4-2-4）。日本の ANA の呼び名は “All Nippon” です。</li></ul>
<p>この教材のコールサイン「<b>Archer Seven Lima Alpha</b>」は、練習用に決めた架空の機体（N7LA）のものです。同じ登録記号の実在の機とは関係ありません。登録記号の最後の 3 文字が 7LA なので、省略しても同じ言い方になります。本の中では「Archer 7LA」と短く書きますが、読み方は同じです。</p>
${fic}
${bk.key('最初の交信では、コールサインを省略しない', '省略してよいのは、管制官が先に省略してから', '自分あてか迷ったら「Verify clearance for（完全なコールサイン）」')}
${bk.q('交信が確立したあと、管制官が「Cessna Three Four Five」と呼んできた。自分は Cessna N12345。次の交信で自分も省略してよい？', 'はい。管制官が先に省略したので、そのあとの交信では「Cessna Three Four Five」と言ってかまいません（AIM 4-2-4）。ただし、似たコールサインの機がいるときは省略しません。')}` },
      { id: 'comm.words', t: '標準用語の正しい意味（Pilot/Controller Glossary）', h: () => `
${bk.aim('Roger・Wilco・Affirmative などの標準用語は、意味をまちがえると事故になります。正しい意味と使い方を覚えます。')}
<p>FAA の Pilot/Controller Glossary（PCG）は、管制官の方式基準（JO 7110.65）と同じ用語集です。</p>
<h4>受け答え</h4>
${bk.t(['用語', '意味（PCG）', '使い方の注意'], [
  ['Roger', '最後の送信を全部受け取った', '<b>「はい」の意味ではない</b>。はい・いいえで答える質問には使わない'],
  ['Wilco', '受け取り、理解し、従う（will comply）', '滑走路・高度・針路などの指示には、Wilco だけでなく<b>内容を復唱</b>する'],
  ['Affirmative / Negative', 'はい / いいえ（Negative は「許可しない」「それは違う」も）', ''],
  ['Unable', '指示・要求・許可に従えない', '理由や代わりの案を添える']])}
<h4>聞き直し・確かめ・待つ</h4>
${bk.t(['用語', '意味', '使い方の注意'], [
  ['Say again', 'もう一度言ってください', '聞き取れなければ、推測せずに使う。一部だけなら「Say again all after …」'],
  ['Verify', '確かめてください（PCG）', '例：Verify assigned altitude'],
  ['Read back', '私の言ったことを復唱して（PCG）', '言われたら全部を復唱する'],
  ['Words twice', '交信が悪いので、各句を 2 回言って / 言います（PCG）', ''],
  ['Stand by', '少し待って（PCG：許可でも不許可でもない）', '長く待たされたら、もう一度呼んでよい'],
  ['Go ahead', 'どうぞ話して（PCG：ほかの意味に使わない）', '「進んでよい」の意味ではない'],
  ['Over / Out', '送信終わり・返事を待つ / 交信終わり・返事は要らない（PCG）', 'ふつうの管制の交信では、ほとんど使わない']])}
<h4>指示の言葉</h4>
${bk.t(['用語', '意味', '使い方の注意'], [
  ['Contact / Monitor', '（相手と周波数）と交信を始めよ / その周波数を聞いて待て（自分からは呼ばない）（PCG）', 'Monitor と言われたら、呼ばずに聞く'],
  ['Immediately / Expedite', '危険を避けるため直ちに / 速やかに（PCG）', 'Immediately は、今すぐ動く'],
  ['Squawk / Ident', 'トランスポンダーのコードを入れよ / IDENT のボタンを押せ（PCG）', ''],
  ['Say altitude / Say heading', '今の高度を言え（上昇・降下中は、高度計の示す高度を 100 ft 単位に丸めて）/ 今の針路を言え（PCG）', ''],
  ['Traffic in sight / Negative contact', '言われた機が見えた / 見えない（PCG）', '見えるまで探す']])}
<h4>地上と滑走路</h4>
${bk.t(['用語', '意味', '使い方の注意'], [
  ['Hold short of …', '…の手前で止まれ（JO 7110.65 3-7-2）', '必ず復唱する（AIM 4-3-18）'],
  ['Hold position', 'その場で止まれ（JO 7110.65 3-7-2）', ''],
  ['Line up and wait', '滑走路に入って待て（例：runway three six, line up and wait）。<b>離陸の許可ではない</b>（PCG・AIM 5-2-5）', ''],
  ['Cleared for takeoff / Cleared to land', '離陸してよい / 着陸してよい', '“cleared” は許可の言葉。タキシーの指示には使わない'],
  ['Cleared for the option', 'タッチアンドゴー・ローアプローチ・ストップアンドゴー・フルストップなどを、操縦士が選んでよい（PCG）', 'ふつうは訓練で使う'],
  ['Go around', '進入をやめよ。VFR では、言われなければ滑走路の上を上昇して場周経路へ（PCG）', '']])}
${bk.key('Roger は「受け取った」だけ。「はい」は Affirmative、「従う」は Wilco', '滑走路・高度・針路・hold short は、Wilco だけでなく内容を復唱', 'line up and wait は離陸の許可ではない')}
${bk.warn('<b>よくある間違い：</b>はい・いいえで答える質問に「Roger」と答えること。Roger は「受け取った」という意味だけで、「はい」の意味はありません。仲間うちの言葉や、CB 無線のような言い方（Ten-four など）は使いません（AIM 4-2-1）。')}
${bk.q('管制官「Archer 7LA, say altitude.」。上昇中で、高度計は 3,480 ft。何と答える？', '「Archer 7LA, three thousand five hundred」のように、高度計の示す高度を 100 ft 単位に丸めて答えます（PCG：Say altitude）。Roger や Affirmative では答えになりません。')}` },
    ],
    terms: [['Phonetic alphabet', 'フォネティックアルファベット', 'AIM 4-2-7'], ['Niner / Tree / Fife', '9 / 3 / 5 の発音', ''], ['Flight level', 'フライトレベル', '米国は 18,000 ft MSL から'], ['Altimeter', '高度計規正値', 'JO 7110.65 2-4-17'], ['Squawk', 'トランスポンダーのコード（を入れよ）', '4 けた'], ['Zulu (UTC)', '協定世界時', 'AIM 4-2-12'], ['Call sign', 'コールサイン', ''], ['Abbreviated call sign', '省略したコールサイン', '管制官が先に省略してから'], ['Roger / Wilco', '受け取った / 理解して従う', ''], ['Affirmative / Negative', 'はい / いいえ', ''], ['Unable', '従えない', ''], ['Stand by', '少し待って', '許可でも不許可でもない'], ['Say again', 'もう一度言って', ''], ['Hold short of', '…の手前で止まれ', '必ず復唱'], ['Line up and wait', '滑走路に入って待て', '離陸の許可ではない'], ['Pilot/Controller Glossary', '操縦士と管制官の用語集', 'PCG']],
    examples: ['“Archer Seven Lima Alpha, fly heading one two zero, climb and maintain three thousand five hundred.” → 針路 120°・高度 3,500 ft。', '“Altimeter three zero zero one” → 30.01 inHg に合わせる。“Squawk zero four two five” → 0425。', '“Contact Ground point seven” → 121.7 MHz に変えて Ground を呼ぶ。'],
    cautions: ['発音のカタカナは目安にしかならない。実際の音は音声で確かめる。', '英国など ICAO の言い方とは、一部が違う（{ch:radio5}）。'],
    quiz: [
      { q: '高度 13,500 ft の正しい言い方は？（AIM 4-2-8）', choices: ['thirteen thousand five hundred', 'one three thousand five hundred', 'one three five zero zero', 'flight level one three five'], answer: 1, why: '10,000 ft 以上は、thousand の前の数字を 1 けたずつ言う。flight level は 18,000 ft MSL から。' },
      { q: '管制官「Archer 7LA, say altitude.」に対して正しいのは？', choices: ['Roger, Archer 7LA', 'Archer 7LA, three thousand five hundred', 'Wilco', 'Affirmative'], answer: 1, why: '質問には内容で答える。上昇・降下中は、高度計の示す高度を 100 ft 単位に丸めて言う（PCG：Say altitude）。' },
      { q: '“Stand by” の意味は？', choices: ['許可する', '許可しない', '少し待って（許可でも不許可でもない）', '周波数を変えよ'], answer: 2, why: 'PCG：Stand by は許可でも不許可でもない。長く待たされたら、もう一度呼んでよい。' },
      { q: '北（360°）へ向けという針路の、正しい言い方は？', choices: ['heading zero zero zero', 'heading three six zero', 'heading north', 'heading three sixty'], answer: 1, why: '針路は 3 けたを 1 けたずつ言い、北は 360 と言う（AIM 4-2-10・JO 7110.65 2-4-17）。' },
      { q: '管制官の「はい・いいえ」で答える質問に「はい」と答える言葉は？', choices: ['Roger', 'Wilco', 'Affirmative', 'Copy'], answer: 2, why: 'Affirmative が「はい」。Roger は「受け取った」だけで、はい・いいえの答えには使わない（PCG）。' },
    ],
    refs: [R.aim42, R.aim41, R.aim43, R.pcg, R.jo71], lessons: ['t1'] });

  // ======================================================================= radio 3
  B.add({ id: 'radio3', before: 'hf', part: 'p1', t: '交信の型：呼び出し・応答・復唱', en: 'How a call is built: initial contact, acknowledgement and readback',
    summary: '最初の呼び出しの型、管制官への応答と周波数の変え方、Class C 空域に入る前の交信の確立、必ず復唱するもの、わからないとき・従えないときの言い方、よくある間違い。',
    secs: [
      { id: 'comm.pattern', t: '最初の呼び出しの型', h: () => `
${bk.aim('管制官を最初に呼ぶときの決まった順番を覚えます。1 回の送信で、必要なことを短く伝えられるようにします。')}
${FIG.callupBlocks()}
<p><b>最初の呼び出し</b>（initial contact）とは、ある局（または同じ局の別の管制官）に初めてする送信のことです。航空情報マニュアル（AIM）4-2-3 は、次の順番を勧めています。</p>
<ol><li><b>呼ぶ相手の局の名前</b>（LAB Ground）</li>
<li><b>自分のコールサイン</b>。最初は省略しません（Archer Seven Lima Alpha）</li>
<li><b>地上にいるときは、いまいる場所</b>（at the west ramp）</li>
<li><b>このあと伝えることの種類。短ければ、要求そのもの</b>（request taxi）</li>
<li>必要なときだけ “Over”（ふつうは言いません）</li></ol>
<p>覚え方は「<b>誰を呼ぶ → 自分は誰 → どこにいる → 何をしたい</b>」です。</p>
${say([['P', `LAB Ground, ${CS}, student pilot, at the west ramp with information Bravo, VFR to the northeast practice area at three thousand five hundred, request taxi.`, 'LAB 地上管制へ。こちら Archer Seven Lima Alpha、学生操縦士。西のエプロンにいて、ATIS の B を聞きました。北東の訓練空域へ 3,500 ft で VFR。地上走行を要求します。']])}
${fic}
<p>この本では、コールサインを “Archer 7LA” と短く書くことがあります。声に出すときは、どちらも “Archer Seven Lima Alpha” と言います（{ch:radio2}）。</p>
<h3>1 回で言うか、短く呼ぶか</h3>
<p>相手に<b>届くことがほぼ確かなら</b>、最初の呼び出しに要求・位置（空中なら高度）・ATIS の記号まで入れます。やり取りの回数が減り、周波数の混雑が減るからです。ただし、必要のないことまで言わないようにします（AIM 4-2-3）。</p>
<p>返事がないときは、無線の設定を確かめてから、<b>次の呼び出しを短く</b>します（例：“LAB Approach, ${CS}.”）。相手が応えてから、要求を言います（AIM 4-2-3）。</p>
<h3>呼び出しに入れるもの</h3>
<ul><li><b>ATIS の記号</b>：ATIS を聞いたら、最初の交信で “with information Bravo” のように記号を言います（AIM 4-1-13）。</li>
<li><b>student pilot</b>：学生操縦士は、各局への最初の呼び出しで “student pilot” と名乗ります。管制官が必要な手助けをしてくれます（AIM 4-2-4・{ch:radio1}）。</li>
<li><b>空中では高度</b>：空中では場所の代わりに位置と高度を言います。レーダーの管制官を最初に呼ぶときは、いまの高度を 100 ft 単位で言います（AIM 4-1-20）。</li></ul>
<p><b>規則と推奨</b>：14 CFR（連邦航空規則）は守らなければならない法律です。AIM は法律ではありませんが、FAA が勧める手順で、法律で決まっていることも含みます。管制官の言い方は、FAA の指示書 JO 7110.65 に決められています。この章では、どれに書いてあるかを（ ）に示します。</p>
${bk.key('最初の呼び出し：相手 → 自分（省略しない）→ 地上なら場所 → 要求', '届くことが確かなら 1 回で全部言う。返事がなければ、短く呼び直す', 'ATIS の記号と student pilot を、最初の呼び出しに入れる')}
${bk.q('出発管制を最初に呼ぶ。地上で言った “at the west ramp” の代わりに、何を入れる？', 'いまの高度です。上昇中なら、目標の高度も言います。例：“LAB Departure, Archer Seven Lima Alpha, one thousand two hundred, climbing to three thousand five hundred.”（AIM 4-1-20・{ch:radio4}）')}` },
      { id: 'comm.ack', t: '応答と周波数の変更', h: () => `
${bk.aim('管制官からの呼び出しや指示への応え方、周波数の変え方、Class C 空域に入ってよい合図を覚えます。')}
<p>管制官からの呼び出しや許可には、<b>必ず応答</b>します（管制官が「応答は要らない」と言ったときを除きます）。応答には、自分のコールサインを最初か最後に付けます。そして Wilco・Roger・Affirmative・Negative などの言葉か、内容を言います（AIM 4-2-3）。言葉の意味は {ch:radio2} で確かめてください。</p>
${say([
  ['Departure', `${CS}, LAB Departure, radar contact two miles north of LAB. Resume own navigation.`, 'レーダーで確認した（LAB の北 2 マイル）。自分で航法を続けよ。'],
  ['P', `Resume own navigation, ${CSS}.`, '自分で航法を続けます。'],
  ['Tower', `${CSS}, report two mile final.`, '2 マイルの最終進入で報告せよ。'],
  ['P', `Wilco, ${CSS}.`, '従います。']])}
<p>Wilco は「受け取り、理解し、従う」です。滑走路・高度・針路の入った指示には、Wilco だけでなく内容を復唱します（{ch:radio2}・${bk.see('comm.readback', '復唱')}）。</p>
<p>2 回目からの交信では、呼び出しと用件を 1 回の送信で言います。答えがはっきりしていて誤解のおそれがなければ、局の名前は省いてかまいません（AIM 4-2-3）。</p>
<h3>周波数を変えるとき</h3>
<ol><li><b>まず応答する</b>（例：“Contact departure, ${CSS}.”）。黙って変えると、管制官は「指示が届いたのか、無線が壊れたのか」を区別できません（AIM 4-2-3）。</li>
<li><b>できるだけ早く変える</b>。時刻・地点・高度を決めて変えるよう言われたら、そこまでは今の周波数を聞き続けます（AIM 4-2-3）。</li>
<li><b>新しい周波数では、まず聞く</b>。誰も話していないことを確かめてから呼びます（AIM 4-2-2・{ch:radio1}）。</li></ol>
<p><b>Contact</b> と言われたら、新しい周波数で<b>呼び出します</b>。<b>Monitor</b> と言われたら、<b>呼ばずに聞いて</b>待ちます（PCG）。</p>
<p>レーダーの業務（VFR の交通情報など）を受けていて、区域を離れるときや周波数を変えたいときは、管制官に伝えてから交信を終えます（AIM 4-2-3）。</p>
${say([
  ['P', `LAB Departure, ${CSS}, entering the northeast practice area, request frequency change.`, '北東の訓練空域に入ります。周波数の変更を要求します。'],
  ['Departure', `${CSS}, radar service terminated, squawk VFR, frequency change approved.`, 'レーダー業務を終了。VFR のコード（1200）にせよ。周波数の変更を承認。'],
  ['P', `Squawk VFR, frequency change approved, ${CSS}.`, '']])}
<h3>Class C 空域に入る前の「交信の確立」</h3>
<p>Class C 空域には、入る前に管制機関との<b>双方向の交信</b>（two-way radio communications）を確立し、中にいる間は交信を続けなければなりません（14 CFR 91.130・{ch:law}）。境界の外で余裕をもって呼びます。確立したかどうかは、管制官の応答で決まります（AIM 3-2-4）。</p>
${bk.t(['管制官の応答', '交信は確立した？', 'あなたは'], [
  [`“${CS}, stand by.”`, '<b>確立した</b>（コールサインを言った）', 'Class C に入ってよい'],
  [`“${CS}, remain outside Charlie airspace and stand by.”`, '確立した。ただし入るなという指示', '外で待つ'],
  ['“Aircraft calling LAB Approach, stand by.”', '<b>確立していない</b>（コールサインがない）', '入ってはいけない']])}
<p>Class D 空域も同じ考え方です（14 CFR 91.129・AIM 3-2-5）。</p>
${bk.key('呼び出しと許可には必ず応答する。コールサインを付けて', '周波数は「応答してから」「できるだけ早く」変える', 'Contact は呼ぶ。Monitor は呼ばずに聞く', 'Class C：コールサイン付きの応答があれば、交信の確立')}` },
      { id: 'comm.readback', t: '復唱（readback）：何を・どの順に', h: () => `
${bk.aim('復唱（readback）で、何を・どの順に言うかを覚えます。復唱は、聞きまちがいをその場で見つけるための二重の確認です。')}
${FIG.readbackLoop()}
<p>あなたが指示を復唱し、管制官がそれを聞いて確かめます。違っていれば、管制官が直します（JO 7110.65 2-4-3）。この輪が、数字の聞きまちがいや言いまちがいを防ぎます（AIM 4-4-7）。</p>
<h3>必ず復唱するもの</h3>
<ul><li><b>空中</b>：高度の指定・高度の制限・針路の指示（vector）・滑走路の指定（AIM 4-4-7）。高度・高度の制限・針路は、<b>言われた順に</b>復唱します。</li>
<li><b>地上</b>：滑走路の指定・滑走路に入る許可・<b>滑走路の手前で止まれ（hold short）</b>・<b>line up and wait</b>（AIM 4-3-18）。管制官は hold short の復唱がないと、復唱を求めます（“read back hold instructions”。JO 7110.65 3-7-2）。</li>
<li><b>許可の最初の復唱</b>：タキシー・離陸・着陸の許可を最初に復唱するときは、滑走路の番号を入れます。L・R・C があれば、それも言います（AIM 4-4-7）。</li>
<li>すべての復唱と応答に、<b>自分のコールサイン</b>を付けます（AIM 4-4-7）。</li></ul>
<p><b>line up and wait</b>（LUAW）は、「滑走路に入り、離陸の向きにそろえて待て」という指示です。<b>離陸の許可ではありません</b>。“cleared for takeoff” を聞くまで離陸しません（AIM 5-2-5）。</p>
${say([
  ['Ground', `${CS}, LAB Ground, runway three six, taxi via Alpha, hold short of taxiway Charlie. Departure frequency one one niner point seven five, squawk four two seven one.`, '滑走路 36 へ。誘導路 A を通り、誘導路 C の手前で止まれ。出発管制は 119.75、コードは 4271。'],
  ['P', `Runway three six, taxi via Alpha, hold short of Charlie, departure one one niner point seven five, squawk four two seven one, ${CSS}.`, '言われた順に復唱し、最後にコールサイン。'],
  ['Tower', `${CS}, LAB Tower, runway three six, line up and wait. Traffic, a Cessna on five mile final.`, '滑走路 36 に入って待て（離陸の許可ではない）。5 マイルの最終進入に Cessna。'],
  ['P', `Runway three six, line up and wait, ${CSS}.`, '滑走路の番号を入れる。'],
  ['Tower', `${CS}, runway three six, wind three four zero at eight, cleared for takeoff. Fly runway heading. Traffic, a Cessna on four mile final.`, '滑走路 36、風 340° 8 kt、離陸を許可。滑走路の方位を保って上昇せよ。4 マイルの最終進入に Cessna。'],
  ['P', `Runway three six, cleared for takeoff, fly runway heading, ${CSS}.`, '滑走路の番号と、針路の指示を復唱。']])}
<p>出発の周波数やトランスポンダーのコードは、AIM が「必ず復唱する」としているものではありません。でも数字なので、復唱しておくと確かめになります。この本の例では復唱しています。</p>
<h4>別の場面の例：針路と高度</h4>
${say([
  ['Approach', `${CSS}, turn right heading zero niner zero, climb and maintain three thousand five hundred.`, '右に旋回して針路 090。3,500 ft まで上昇して、それを保て。'],
  ['P', `Right heading zero niner zero, climb and maintain three thousand five hundred, ${CSS}.`, '旋回の方向も入れ、言われた順に。']])}
<h3>復唱しなくてよいもの</h3>
${bk.t(['管制官が言うこと', 'あなたの応え方'], [
  [`交通情報 “${CSS}, traffic, one o'clock, four miles, westbound, a Cessna, two thousand five hundred.”`, `見えたら “Traffic in sight, ${CSS}.”。探しているなら “Looking, ${CSS}.”。見えないと伝えるなら “Negative contact, ${CSS}.”`],
  ['“Radar contact …”', `“${CSS}.” のように、受け取ったことを伝える`],
  ['風や高度計規正値だけの知らせ', `“${CSS}.”。数字を復唱して確かめてもよい`]])}
${bk.key('空中：高度・高度の制限・針路・滑走路の指定は必ず復唱', '地上：滑走路の指定・入る許可・hold short・line up and wait は必ず復唱', '言われた順に、コールサインを付けて。line up and wait は離陸の許可ではない')}
${bk.warn('<b>よくある間違い：</b>数字の入った指示に “Roger” だけで答えること。管制官は、あなたが数字を正しく聞いたかを確かめられません。')}
${bk.q('Ground「Archer 7LA, runway three six, taxi via Alpha, cross runway two seven.」。何を復唱する？', '滑走路の指定（runway three six）と、滑走路を横切る許可（cross runway two seven）です。言われた順に復唱し、コールサインを付けます：“Runway three six, taxi via Alpha, cross runway two seven, Archer 7LA.”（AIM 4-3-18）')}` },
      { id: 'comm.clarify', t: 'わからないとき・従えないとき', h: () => `
${bk.aim('聞き取れない・自分あてかわからない・従えない、というときの正しい言い方を覚えます。推測で動かないことが、いちばん大切です。')}
<p>規則（14 CFR 91.123）は、<b>許可の内容がはっきりしないときは、すぐに管制官に確かめる</b>ことを機長に求めています。AIM も、理解できない許可や指示は、理解できるまで確かめるよう勧めています（AIM 4-3-18）。機長は、自分の機の運航に最終的な責任を持つからです（14 CFR 91.3）。</p>
${bk.t(['場面', '言い方', 'ポイント'], [
  ['聞き取れなかった', `“Say again, ${CSS}.”<br>後半だけなら “Say again all after Charlie, ${CSS}.”`, '推測で復唱しない。推測で動かない'],
  ['自分あてかわからない（似たコールサインがいる）', `“Verify clearance for ${CS}.”`, 'コールサインは省略しない（AIM 4-2-4）'],
  ['地上で、経路がわからない', `“Request progressive taxi, ${CSS}.”`, '一区間ずつ案内してもらえる（AIM 4-3-18）'],
  ['指示に従えない', `“Unable, clouds ahead, ${CSS}.”`, '理由を添える。VFR で雲に入るような指示には従わない'],
  ['line up and wait のまま、長く待たされている', `“${CSS}, holding in position runway three six.”`, '離陸の許可が来なければ確かめる（AIM 5-2-5）'],
  ['操縦が忙しくて、すぐ答えられない', `“${CSS}, stand by.”`, '操縦が先。落ち着いたら呼ぶ']])}
<p>聞き直すことは、悪いことではありません。Say again・Verify・Unable は、PCG に決められた正しい言葉です。迷ったら、地上では止まって聞きます。空中では、安全な高度・針路を保ったまま聞きます。</p>
${bk.key('はっきりしない許可は、すぐ確かめる（14 CFR 91.123）', '聞こえない → Say again。自分あてか不明 → Verify。従えない → Unable', '迷ったら、地上では止まって聞く。空中では安全な状態を保って聞く')}
${bk.q('line up and wait で滑走路に入って、2 分たっても離陸の許可が来ない。遅れるという知らせもなく、最終進入の機も見えない。どうする？', '管制塔に “Archer 7LA, holding in position runway three six.” と伝えて確かめます。AIM 5-2-5 は、LUAW の指示から 2 分以上たってから事故やインシデントが起きていた、という FAA の分析を挙げて、遅れを知らされていないときは、待っている時間を考えて確かめるよう勧めています。')}` },
      { id: 'comm.mistakes', t: 'よくある間違い', h: () => `
${bk.aim('訓練生がよくする交信の間違いと、正しいやり方をまとめて確かめます。')}
${bk.photo('holdShort')}
${bk.t(['よくある間違い', '正しいやり方'], [
  ['hold short の指示に “Roger” だけで答える', `止まる所まで復唱する：“Hold short of runway three six, ${CSS}.”（AIM 4-3-18）`],
  ['line up and wait を離陸の許可と思う', '“cleared for takeoff” を待つ。LUAW を正しく復唱したのに、許可なしで離陸した例が多くあります（AIM 5-2-5）'],
  ['ほかの機への指示を、自分への指示と思う', 'コールサインを最後まで聞く。疑わしければ Verify（AIM 4-2-4）'],
  ['応答しないで周波数を変える', '応答してから変える（AIM 4-2-3）'],
  ['着陸のあと、言われる前に Ground に変える', '管制塔に “contact ground” と言われるまで変えない（AIM 4-3-14）'],
  ['最初の交信で、コールサインを省略する', '最初は省略しない。省略は、管制官が先にしてから（AIM 4-2-4）'],
  ['ほかの交信にかぶせて話す', '送信する前に聞く（AIM 4-2-2・{ch:radio1}）'],
  ['長すぎる呼び出し', '型どおりに。必要のないことは言わない（AIM 4-2-3）'],
  ['はい・いいえの質問に “Roger” と答える', '“Affirmative” か “Negative”（{ch:radio2}）']])}
<p>写真の黄色い線は、滑走路の手前の停止線です。実線の側で止まり、破線の側が滑走路です（AIM 2-3-5）。hold short と言われたら、機体のどこも、この線を越えないように止まります。</p>
${bk.key('hold short と line up and wait は、いつも復唱する。Roger だけでは足りない', '自分のコールサインを最後まで聞く。迷ったら Verify', '周波数は応答してから変える。着陸のあとは、言われてから Ground へ')}` },
    ],
    terms: [['Initial contact (initial callup)', '最初の呼び出し', 'AIM 4-2-3'], ['Acknowledge', '応答する', 'AIM 4-2-3'], ['Readback', '復唱', 'AIM 4-4-7・4-3-18'], ['Contact / Monitor', '交信せよ（呼ぶ）/ 聞いて待て（呼ばない）', 'PCG'], ['Two-way radio communications', '双方向の交信', 'Class C・D に入る条件（AIM 3-2-4）'], ['Line up and wait (LUAW)', '滑走路に入って待て', '離陸の許可ではない（AIM 5-2-5）'], ['Progressive taxi', '一区間ずつの地上走行の案内', 'AIM 4-3-18'], ['Holding in position', '滑走路の上で待っている', 'AIM 5-2-5'], ['Verify clearance for …', '…への許可か確かめてください', 'AIM 4-2-4'], ['Runway holding position marking', '滑走路の手前の停止線', 'AIM 2-3-5']],
    examples: ['“Archer 7LA, hold short of runway three six.” → “Hold short of runway three six, Archer 7LA.”（Roger だけでは足りない）', '“Aircraft calling LAB Approach, stand by.” → コールサインが言われていないので、Class C には入らない（AIM 3-2-4）。'],
    cautions: ['交信の例は米国（FAA）の言い方です。英国など ICAO の言い方とは一部が違います（{ch:radio5}）。', '実際の交信では、その空港の手順と管制官の指示が優先です。'],
    quiz: [
      { q: 'AIM 4-4-7 が、空中で復唱すべきとしているものは？', choices: ['交通情報', '高度・高度の制限・針路・滑走路の指定を含む指示', '風と気温', 'ATIS の内容'], answer: 1, why: 'AIM 4-4-7：高度・高度の制限・針路（vector）・滑走路の指定は、言われた順に、コールサインを付けて復唱する。' },
      { q: '管制官が「Aircraft calling LAB Approach, stand by.」と応えた。Class C 空域に入ってよい？', choices: ['入ってよい', '入ってはいけない（コールサインがない）', '高度を下げれば入ってよい', 'トランスポンダーを 7700 にして入る'], answer: 1, why: 'AIM 3-2-4：コールサインを付けて応答されたときだけ、交信が確立する。コールサインのない応答では確立していない。' },
      { q: '周波数を変えるよう指示された。正しいのは？', choices: ['黙ってすぐ変える', '応答してから、できるだけ早く変える', '変えずに待つ', '一度ほかの周波数を試す'], answer: 1, why: 'AIM 4-2-3：応答がないと、管制官は指示が届いたのか、無線が壊れたのかを区別できない。' },
      { q: 'Tower「Archer 7LA, runway three six, line up and wait.」の意味は？', choices: ['離陸してよい', '滑走路に入り、離陸の向きにそろえて待つ（離陸の許可ではない）', '滑走路の手前で待つ', '滑走路を横切ってよい'], answer: 1, why: 'AIM 5-2-5：LUAW は離陸の許可ではない。“cleared for takeoff” を聞いてから離陸する。' },
      { q: '管制官「Archer 7LA, monitor tower one one eight point three.」。正しいのは？', choices: ['118.3 に変えて、すぐ管制塔を呼ぶ', '応答してから 118.3 に変え、呼ばずに聞いて待つ', '今の周波数のまま待つ', '118.3 に変えて、ATIS の記号を言う'], answer: 1, why: 'Monitor は「その周波数を聞いて待て」で、自分からは呼ばない（PCG）。変える前に応答する（AIM 4-2-3）。' },
    ],
    refs: [R.aim42, R.aim44, R.aim43, R.aim41, R.aim52, R.aim32, R.aim23, R.cfr91, R.pcg, R.jo71], lessons: ['t1', 't2'] });

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
