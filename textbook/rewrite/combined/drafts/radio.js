// DRAFT (W19, R2) — Part 1's chapters 'radio1'〜'radio5'「英語の交信」 (textbook/rewrite/combined/DESIGN.md 3.3 第 1 部
// 第 13〜17 章, 4.1 rows 7〜11, 4.2 kiso09, 7.2 W19). No product reads this file (DESIGN 6.2 rule 5, 7.4). It is a plain
// script like book-comm.js: when the chapters are registered, the five B.add(...) below replace the five chapters of
// flight-lab/src/book-comm.js (same ids, same place: before: 'hf'), the figures of radio-figs.js go into book-figs.js
// (readbackLoop replaces the function of the same name), and the references in NEW_R go into book-core.js's R (then
// `NEW_R.x` → `R.x`). Check it with its figures:
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/radio-figs.js \
//     textbook/rewrite/combined/drafts/radio.js
//
// What these chapters are (DESIGN 3.3 chapters 13〜17, 4.1, 4.2 kiso09, 7.2 W19):
//  - every existing section kept by id, in place and in order, and every end-of-chapter question kept in place and in
//    order (new questions only at the end; reasons that had no basis now name it). One new section, ★comm.runway
//    (滑走路に入る許可と誤進入の防ぎ方), at the end of radio3 as DESIGN 3.3 lists it;
//  - the basic course chapter 9's radio sections rewritten in the textbook's voice — no sentence copied, `from` on every
//    section built from them: kiso09.15 → radio.why (the services of air traffic service: control, flight information,
//    alerting; information is not a clearance), kiso09.19 → comm.readback (the controller's hearback, listen after the
//    readback), kiso09.20 → comm.clarify (clearance・instruction・information) and comm.runway, kiso09.21・09.22 →
//    comm.runway, kiso09.25・09.27 → comm.flow (traffic information and the limits of surveillance; tell ATC early when
//    the plan stops working). kiso09.16〜09.18・09.23・09.24・09.26 are Part 7's (jatc: W39), not used here. The basic
//    course is Japan-based: every rule here is the US one (FAA: AIM, P/CG, JO 7110.65, 14 CFR), the UK one is named as
//    the UK's (CAP 413), and Japan is only in the boxes CADET leaves out;
//  - the written questions (説明してみよう) rewritten from kiso09.q15・q19・q20・q21・q22・q25・q27 with US numbers and
//    words, and a few new ones (no `from`); every answer links the section it rests on;
//  - scope on every section: 'us' (DESIGN 3.3「米国」for radio1〜5: the FAA's words and rules, as Sanford flies them);
//  - the US–Japan boxes DESIGN 3.4 places here, drawn from FL.jur (no number written by hand): english.radio
//    (radio.equip), words (comm.words, comm.icao), readback (comm.readback), xpdr (comm.xpdr), nordo.vfr and light
//    (comm.nordo). comm.icao's table has three columns, FAA / ICAO・英国 / 日本, the 日本 column drawn from FL.jur words
//    and readback (class jur-jp: CADET leaves it out, like bk.jur's 日本 column);
//  - CADET's fixed wording (DESIGN 6.2 rule 9) kept as it is: comm.callsign whole, comm.icao's first paragraph (the real
//    name sentence and「両方を知っておくと混乱しません。代表的な例」, CAP 413). RD.FLIGHT's sections and comm.numbers are
//    unchanged (DESIGN 6.1「英語交信」): comm.numbers gets its scope and nothing else;
//  - the basic course's photos placed by id (reports/W22.md 4): ch09-photo3 (comm.runway), ch04-photo5 (comm.xpdr: its
//    code 7000 is said to be the UK's VFR code, not the US one). ch09-photo2 and ch09-photo6 are not used (faces: W22);
//    comm.nordo keeps its drawing of the light signals (FIG.lightGunSignals) instead of a photo;
//  - JCAB's names from FL.terms at each chapter's first use「正式名（通称、English）」(地上滑走・離陸・無線呼出符号・
//    復唱・管制承認・着陸復行・停止線 …); names the table does not hold yet (航空交通業務・警急業務・滑走路誤進入・ヒアバック
//    ・ホットスポット) are asked of W04 (reports/W19-radio.md);
//  - no FLIGHT LAB operation words in the body (DESIGN 6.2 rule 10): the bk.sim boxes are as before; a later part is
//    linked only with「予告」(DESIGN 5 criterion 23);
//  - every claim (number, unit, rule) is in radio.claims.json with its tag and source.
(function (FL) {
  'use strict';
  const B = FL.book, R = B.R, bk = B.bk, FIG = FL.bookFigs;
  const CS = 'Archer Seven Lima Alpha', CSS = 'Archer 7LA';
  // a pilot / ATC exchange as a small table: who, English, Japanese (and, under it, an optional note: why, and the source)
  const say = (rows) => `<table class="bk-t bk-radio"><tr><th>誰</th><th>英語（交信）</th><th>意味</th></tr>${rows.map(([w, en, jp, note]) => `<tr><td class="who ${w === 'P' ? 'p' : 'a'}">${w === 'P' ? 'あなた' : w}</td><td class="en">${en}</td><td>${[jp, note && `<span class="small mute">${note}</span>`].filter(Boolean).join('<br>')}</td></tr>`).join('')}</table>`;
  const fic = '<p class="small mute">LAB 空港・周波数・コールサイン「Archer Seven Lima Alpha（Archer 7LA）」は架空の練習用です。実際の周波数で使わないでください。</p>';
  // comm.icao's 日本 column: drawn from FL.jur (never written by hand: DESIGN 3.4), class jur-jp so that CADET leaves the
  // cell out (cadet/src/content/book.js JAPAN_SIDE) and the jurisdiction check reads it as the Japanese side. No data-jur
  // (the item's box is bk.jur: flight-lab/test/jur.test.mjs ①). Empty when FL.jur is not loaded.
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const jpCell = (id, rows = 1) => {
    const it = FL.jur && typeof FL.jur.byId === 'function' ? FL.jur.byId(id) : null;
    const txt = it ? esc(it.jp).replace(/〔要確認〕/g, '<span class="jur-unk">〔要確認〕</span>') : '';
    return `<td class="jur-jp"${rows > 1 ? ` rowspan="${rows}"` : ''}>${txt}</td>`;
  };
  const ahead = (id, label) => bk.see(id, `予告：${label}`);   // a link to a later part (DESIGN 5 criterion 23)
  // new references (to be added to book-core.js's R when the chapters are registered; each URL opened on 2026-10-30)
  const NEW_R = {
    faaRI: { label: 'FAA Runway Safety「Runway Incursions」（滑走路誤進入の定義・4 つの区分・原因の 3 つの種類）', url: 'https://www.faa.gov/airports/runway_safety/resources/runway_incursions' },
    aim45: { label: 'FAA AIM 4-5 Surveillance Systems（4-5-1 レーダーの限界・4-5-7 ADS-B・4-5-8 TIS-B）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_5.html' },
  };

  // ======================================================================= radio 1（第 1 部 第 13 章）
  B.add({ id: 'radio1', before: 'hf', part: 'p1', t: '無線交信のしくみと基本の技術', en: 'Radio communication: how it works and basic technique',
    summary: '1 回の飛行で誰と話すのか、相手がしている業務（管制・情報・警急）と「情報は許可ではない」こと、無線機とオーディオパネルの使い方、「聞く → 考える → 話す」の順番、日本語を話す人が英語の交信を聞き取るコツ。相手と業務を区別し、周波数を合わせて声を届け、聞き取れないときに推測で動かないようにします。',
    secs: [
      { id: 'radio.why', t: '交信とは何か・誰と話すのか', scope: 'us', from: ['kiso09.15'], faa: ['PA.VIII.F.K3'], h: () => `
${bk.aim('無線交信は何のためにするのかと、1 回の飛行で、誰と、どの順番で話すのかを知ります。地上滑走（タキシー、taxi）から離陸（takeoff）、着陸までの相手を、順に見ていきます。相手の言葉が許可なのか、情報なのかも区別します。')}
${FIG.radioRelay()}
<p>飛行中の無線交信（radiotelephony）は、操縦士と管制官が、<b>同じ絵</b>（どこに・どの機が・次に何をするか）を持つための道具です。米国連邦航空局（FAA）は、操縦士への手引きを AIM（Aeronautical Information Manual）にまとめています。AIM は、交信でいちばん大切なのは<b>「理解」（understanding）</b>だとしています。交信はできるだけ<b>短く</b>しますが、伝わらなければ必要な言葉を足して伝えます。答えるときは、自分の無線呼出符号（コールサイン、call sign）を言います。仲間うちの言葉や雑談は使いません（AIM 4-2-1）。</p>
<h4>1 回の飛行で話す、主な相手</h4>
<ul><li><b>ATIS</b>：飛行場情報放送（飛行場情報の自動放送、ATIS：automatic terminal information service）です。空港の天気・使う滑走路・注意を、録音でくり返し流します。話しかけることはできません。出発前と、帰って空港に近づく前に聞きます。</li>
<li><b>Ground（地上管制）</b>：誘導路を動く指示と、滑走路を横切る指示を出します。出発のときは、エンジンをかける前に呼ぶよう AIM は勧めています（AIM 4-3-14）。</li>
<li><b>Tower（飛行場管制）</b>：滑走路の使用（離陸・着陸・横断）と、場周経路（トラフィックパターン、traffic pattern）を受け持ちます。</li>
<li><b>Departure / Approach（出発管制・進入管制）</b>：レーダーで、空港を出る機と入る機を誘導し、ほかの機の情報を伝えます。</li></ul>
${bk.t(['ほかの相手', 'していること'], [['Clearance Delivery', '管制承認（クリアランス、ATC clearance）を伝える。おもに IFR の出発に使い、空港によっては VFR の機にも出発の周波数やトランスポンダー（transponder）のコードを伝える。ある空港だけ（AIM 4-3-14）'], ['Center（航空路管制）', '広い範囲をレーダーで見る。IFR の巡航を受け持つ'], ['Flight Service（「Radio」と呼ぶ）', '天気の情報、VFR の飛行計画（flight plan）を開く・閉じる'], ['CTAF（共通交通情報周波数）', '管制塔のない空港（または管制塔が閉まっている時間）で使う共通の周波数。自分の位置とこれからすることを、まわりの機に知らせる。UNICOM などの周波数が CTAF に決められている（AIM 4-1-9・{ch:radio5}）'], ['UNICOM', '空港の運営会社などが置く、政府のものではない無線局。空港の情報を伝える（PCG）']])}
<p>相手は「<b>場所の名前＋局の種類</b>」で呼びます。たとえば Miami Ground、St. Louis Departure、Washington Center、Chicago Radio です（AIM 4-2-6）。言葉の意味は、FAA の Pilot/Controller Glossary（操縦士と管制官の用語集、PCG）で調べられます。</p>
<h4>相手がしている業務を知る</h4>
<p>無線の相手の仕事を、まとめて航空交通業務（air traffic service）と呼びます。PCG は、その中に飛行情報業務（flight information service）・警急業務・航空交通助言業務・航空交通管制業務を挙げています。このうち 3 つの働きを見ておきます。</p>
${bk.t(['業務', 'していること（PCG）', '例'], [
  ['航空交通管制業務（air traffic control service）', '航空交通を、安全に、順序よく、速やかに流す', 'Ground・Tower・Approach・Center の許可と指示'],
  ['飛行情報業務（flight information service）', '安全で効率のよい飛行に役立つ、助言と情報を伝える', '管制の指示ではない情報。ATIS の放送や、FSS（飛行サービス局、Flight Service Station）の気象情報など'],
  ['警急業務（alerting service）', '捜索救難の助けが要る機を、関係する機関に知らせ、助ける', 'VFR の飛行計画を閉じないと、到達予定時刻（到着予定時刻、estimated time of arrival）の 30 分後に捜索救難の手続きが始まる（AIM 5-1-14）']])}
<p>同じ無線から聞こえても、言葉の働きは違います。<b>許可と指示</b>は、あなたの機の動きを決めます。<b>情報</b>は、判断の材料です。情報をもらっても、許可をもらったことにはなりません。たとえば UNICOM が伝えるのは空港の情報で、管制の許可ではありません（PCG）。聞き分け方は ${bk.see('comm.clarify', 'わからないとき・従えないとき')} で練習します。</p>
<p>出発の前に、その空港の周波数と、管制塔が開いている時間を、チャートと Chart Supplement で調べます。管制塔が閉まっている時間は、管制塔のない空港と同じように、CTAF で自己通報します（AIM 4-1-9）。</p>
${bk.key('交信は「理解」のため。短く、でも伝わらなければ言葉を足す', '地上を動くのは Ground、滑走路と場周は Tower、空港を離れたら Departure', '相手は「場所の名前＋局の種類」で呼ぶ', '許可・指示は動きを決め、情報は判断の材料。情報は許可ではない')}
${bk.q('着陸して滑走路を出た。誘導路を駐機場まで動く指示は、誰からもらう？', '<b>Ground（地上管制）</b>です。ただし、管制塔に「contact ground」と言われてから周波数を変えます（AIM 4-3-14）。滑走路を出たら、管制官から別の指示がなければ、停止線（runway holding position marking）を越えて止まります（AIM 4-3-21）。')}` },
      { id: 'radio.equip', t: '無線機・マイク・オーディオパネルの使い方', scope: 'us', jcab: ['ppl.1.2.8', 'cpl.1.5.3.2'], faa: ['PA.III.A.K1', 'PA.III.A.K6', 'PA.VIII.F.K1'], h: () => `
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
${bk.warn('<b>よくある間違い：</b>COM2 に新しい周波数を合わせたのに、オーディオパネルの MIC が COM1 のままになっていることです。話しても、相手には届きません。')}
${bk.jur('english.radio')}
${bk.q('出発管制の周波数を COM2 に合わせて呼んだのに、返事がない。オーディオパネルでまず確かめることは？', 'MIC が COM2 になっているか（送信の無線機の選択）と、COM2 の受信のボタンが入っているかです。そのあと、周波数が使用中の側にあるか、音量を確かめます。')}` },
      { id: 'radio.technique', t: '聞く → 考える → 話す', scope: 'us', h: () => `
${bk.aim('送信の前に何をするか、操縦と交信のどちらを先にするか、学生操縦士（student pilot）はどう名乗るかを学びます。')}
<ol><li><b>聞く</b>：送信する前に、必ず聞きます。ほかの機が話している最中に送信すると、相手の受信をふさいでしまいます。ATIS や周波数を聞いているだけで、わかることもたくさんあります（AIM 4-2-2）。</li>
<li><b>考える</b>：言うことを先に決めます。長い内容は紙に書いておきます（AIM 4-2-2）。</li>
<li><b>話す</b>：決まった型で、短く、はっきり話します（${bk.see('comm.pattern', '呼び出しの型')}）。</li></ol>
<p>そして、<b>操縦がいちばん先</b>です（Aviate → Navigate → Communicate）。交信に気を取られて、高度や速度を外してはいけません。忙しいときは、管制に「Stand by」（少し待って）と言ってかまいません。管制官が「Stand by」と言ったときは、許可でも不許可でもありません。待って、長くかかるようなら、もう一度呼びます（PCG）。緊急のときの考え方は、第 2 部で学びます（${ahead('emg.basic', '緊急時の考え方')}）。</p>
<h4>学生操縦士であることを伝える</h4>
<p>AIM 4-2-4 は、学生操縦士が最初の呼び出しで <b>“student pilot”</b> と名乗ることを勧めています（例：「Dayton tower, Fleetwing One Two Three Four, student pilot.」）。管制官は、必要なら手助けをしてくれます。Clearance Delivery・Ground・Tower・Approach・Departure・Flight Service の、それぞれ最初の交信で名乗ります。</p>
${say([['P', `LAB Ground, ${CS}, <b>student pilot</b>, at the west ramp with information Bravo, request taxi.`, 'LAB 地上管制へ。Archer 7LA、学生操縦士。西のエプロンにいて、ATIS の B を聞いた。地上滑走を要求。']])}
${fic}
${bk.key('聞く → 考える → 話す。周波数を変えたら、まず聞く', '操縦がいちばん先。忙しければ「Stand by」', '学生操縦士は、最初の交信で student pilot と名乗る')}
${bk.q('離陸の前に Tower の周波数に変えた。すぐに「ready for departure」と呼んでよい？', 'まず少し聞きます。管制官がほかの機に質問していて、その答えの途中かもしれません（AIM 4-2-2）。周波数が空いていることを確かめてから呼びます。')}` },
      { id: 'radio.listen', t: '日本語を話す人のための聞き取りのコツ', scope: 'us', h: () => `
${bk.aim('英語の交信は速く、雑音もあります。でも、言う内容の型は決まっています。型を知って、聞き取れる量を増やします。')}
${FIG.radioCallAnatomy()}
<p>この節は、教材としての学習のコツです。</p>
${bk.t(['コツ', 'やり方'], [
  ['① まず自分のコールサインを聞く', '管制官の指示は「あなたのコールサイン →（最初の交信では）局の名前 → 指示」の順です（JO 7110.65 2-4-8）。自分のコールサイン（Archer Seven Lima Alpha）が聞こえたら、そこから集中します。ほかの機への指示でも、同じ滑走路を使う機などは頭に入れておきます'],
  ['② 次に来る言葉を予想する', '地上滑走なら「滑走路・経路・hold short」、離陸なら「滑走路・風・cleared for takeoff」、帰りなら「入り方・報告する所・順番」。予想があると、聞きのがした所だけを「Say again」で聞き直せます'],
  ['③ 数字は書き取る', 'ひざ板（kneeboard）に、聞いた順に短い記号で書きます。周波数・コード・高度・針路（ヘディング、heading）は、覚えておこうとしません'],
  ['④ まぎらわしい言葉を知っておく', 'two（2）と to・too、four（4）と for、left と right、hold short（手前で止まる）と hold position（その場で止まる）。数字は 1 けたずつ言うことが多いですが、まとめて言う所もあります。自信がなければ聞き直します'],
  ['⑤ わからなければ聞き直す', '推測で動きません。「Say again」と言います。自分あての指示か不安なら「Verify clearance for Archer Seven Lima Alpha」（AIM 4-2-4）'],
  ['⑥ 声に出して練習する', '台本を見ながら、音声と同時に言います（パラレル・リーディング）。慣れたら台本を見ずに、少し遅れて追いかけて言います（シャドーイング）。1 回の飛行の交信を、最初から最後まで声に出してみます']])}
<p>まわりの機への指示も聞いておくと、自分の番や、滑走路の様子が先にわかります。ただし、ほかの機への許可や指示に従って動いてはいけません（${bk.see('comm.clarify', 'わからないとき・従えないとき')}）。</p>
${bk.key('自分のコールサインのあとに、指示が来る', '次の言葉を予想して聞く。数字は書く', 'わからなければ「Say again」。推測で動かない')}
${bk.q('地上管制の指示の後半、出発周波数が聞き取れなかった。どうする？', '推測で合わせません。聞き取れなかった所だけを聞き直します（例：「Say again departure frequency, Archer Seven Lima Alpha」）。わかった所まで復唱（readback）してもかまいません。')}
${bk.sim('場周経路の課目で、管制塔との交信を聞きながら飛びます。英語交信のページでは、1 回の飛行の交信を音声つきで最初から最後まで聞けます（メニュー → 英語交信）。', ['t2', '場周経路'])}` },
    ],
    terms: [['Radiotelephony', '無線電話（音声の交信）', ''], ['Air traffic control (ATC)', '航空交通管制', ''], ['ATIS', '飛行場情報放送', '飛行場情報の自動放送。AIM 4-1-13'], ['Clearance Delivery', '管制承認（クリアランス）の伝達（おもに IFR）', 'ある空港だけ'], ['Ground / Tower', '地上管制・飛行場管制', ''], ['Departure / Approach', '出発管制・進入管制', 'レーダー'], ['Center', '航空路管制', ''], ['Flight Service Station (FSS) / "Radio"', 'FSS（飛行サービス局）', '業務の名前は飛行情報業務'], ['CTAF (Common Traffic Advisory Frequency)', '共通交通情報周波数', '管制塔のない空港（または管制塔が閉まっている時間）の共通の周波数。AIM 4-1-9'], ['UNICOM', '政府のものではない空港の無線局', 'PCG'], ['Active / Standby frequency', '使用中・予備の周波数', ''], ['PTT (push-to-talk)', '送信ボタン', ''], ['Stuck mike', '押しっぱなしのマイク', ''], ['Audio panel', 'オーディオパネル', 'MIC と受信の選択'], ['Student pilot', '学生操縦士（最初の交信で名乗る）', 'AIM 4-2-4'], ['Say again', 'もう一度言ってください', ''], ['Stand by', '少し待って', ''], ['Air traffic service', '航空交通業務', '管制・飛行情報・警急などをまとめた言葉（PCG）'], ['Flight information service', '飛行情報業務', '飛行に役立つ助言と情報（PCG）'], ['Alerting service', '警急業務', '捜索救難の助けが要る機を知らせる（PCG）']],
    examples: ['離陸前、周波数を Tower に変えた → 先に数秒聞いて、誰も話していないこと・管制官の質問の途中でないことを確かめてから「LAB Tower, Archer Seven Lima Alpha, holding short runway three six, ready for departure」。', '返事がない → 音量・周波数・MIC の選択・スタックマイクを確かめる → もう一度、短く呼ぶ。', 'UNICOM が「風は 360° 8 kt、使っている滑走路は 36」と伝えた → 空港の情報で、管制の許可ではない。管制塔のない空港なら、自分で見て、CTAF で自己通報する。'],
    cautions: ['この章の周波数・LAB 空港・コールサインは架空の練習用。実際の周波数は、最新のチャートと Chart Supplement で確かめる。', 'この教材は実際の管制にはつながらず、音声を送信しない。'],
    quiz: [
      { q: '周波数を変えた直後に、まずすることは？（AIM 4-2-2）', choices: ['すぐに呼び出す', '少し聞いて、誰も話していないことを確かめる', '音量を下げる', 'トランスポンダーを 7600 にする'], answer: 1, why: 'Listen before you transmit（AIM 4-2-2）。変えた直後は、ほかの交信の途中かもしれない。割り込むと、相手の受信をふさぐ。' },
      { q: '着陸して滑走路を出たあと、地上を動く指示をもらう相手は？', choices: ['ATIS', 'Ground', 'Departure', 'Center'], answer: 1, why: '地上（誘導路）の移動は Ground。ただし、管制塔に「contact ground」と言われてから切り替える（AIM 4-3-14）。' },
      { q: 'AIM が学生操縦士に勧めている名乗り方は？', choices: ['最初の交信で "student pilot" と言う', '交信の最後に "over" と言う', '名乗らない', 'コールサインを省く'], answer: 0, why: 'AIM 4-2-4：最初の呼び出しで student pilot と名乗ると、管制官が必要な手助けをしてくれる。' },
      { q: 'COM2 に出発管制の周波数を合わせて呼んだのに、返事がない。オーディオパネルでまず確かめるのは？', choices: ['NAV1 の音量', 'MIC が COM2 になっているか', 'トランスポンダーのコード', '高度計の規正値'], answer: 1, why: '話す無線機は、オーディオパネルの MIC で選ぶ。COM2 に合わせても、MIC が COM1 のままなら相手に届かない（無線機・マイク・オーディオパネルの使い方の節）。' },
      { q: 'PTT を押して、すぐに話し始めると起きやすいことは？（AIM 4-2-2）', choices: ['声が大きくなりすぎる', '最初の言葉が切れて送られない', '周波数が変わる', 'ほかの機の声がよく聞こえる'], answer: 1, why: 'ボタンを押してから一呼吸おくと、最初の言葉まで送られる（AIM 4-2-2）。' },
      { q: '同じ周波数で聞こえた言葉のうち、許可ではなく「情報」なのは？', choices: ['cleared for takeoff', 'cross runway two seven', "traffic, two o'clock, four miles", 'cleared to land'], answer: 2, why: '交通情報は判断の材料で、動いてよいという許可ではない（PCG：Advisory。交信とは何か・誰と話すのかの節）。ほかの 3 つは、管制が動きを認める許可。' },
    ],
    written: [
      ['航空交通業務は「管制官が進路や離着陸の許可を出す仕事」だけだ、と説明されました。足りないところを、3 つの業務の働きで説明してください。', `それだけではありません。航空交通管制業務は、許可と指示で交通を安全に、順序よく流します。飛行情報業務は、天気や交通など、判断に役立つ情報を伝えます。警急業務は、捜索救難の助けが要る機を関係機関に知らせます。いま受けているのがどの業務かを知り、情報を許可と取り違えません。${bk.see('radio.why', '交信とは何か・誰と話すのか')}`, ['kiso09.q15']],
      ['周波数を変えて呼んだのに、返事がありません。何を、どの順で確かめますか。', `数秒待って、もう一度短く呼びます。それでも返事がなければ、音量、周波数が使用中の側にあるか、オーディオパネルの MIC の選択、ヘッドセット、スタックマイクを確かめます。もう一方の無線機も試します。${bk.see('radio.equip', '無線機・マイク・オーディオパネルの使い方')}`],
      ['管制官の指示の一部が聞き取れませんでした。推測で動かずに、どう言いますか。自分あてかどうかわからないときは？', `聞き取れなかった所だけを “Say again” で聞き直します（例：“Say again departure frequency, Archer Seven Lima Alpha.”）。自分あてか不安なら、コールサインを省略せずに “Verify clearance for Archer Seven Lima Alpha” と言います。${bk.see('radio.listen', '日本語を話す人のための聞き取りのコツ')}`],
    ],
    refs: [R.aim42, R.aim43, R.aim41, R.aim51, R.pcg], lessons: ['t1', 't2'] });

  // ======================================================================= radio 2（第 1 部 第 14 章）
  B.add({ id: 'radio2', before: 'hf', part: 'p1', t: '言葉の決まり：アルファベット・数字・標準用語', en: 'Standard words: the phonetic alphabet, numbers and phraseology',
    summary: 'フォネティックアルファベットと数字の発音、数字の言い方（1 けたずつが基本、高度と雲の高さは特別）、コールサインの決まり、標準用語（Roger・Wilco・Say again など）の正しい意味。聞いた数字を正しく書き取り、標準用語で誤解なく答えられるようにします。',
    secs: [
      { id: 'comm.basic', t: 'フォネティックアルファベットと数字の発音', scope: 'us', faa: ['PA.III.A.K2'], h: () => `
${bk.aim('雑音の中でも、文字や数字を 1 つずつ確実に伝えるための、決まった言い方を覚えます。')}
${FIG.phoneticBoard()}
<p>文字は、ICAO（国際民間航空機関）の<b>フォネティックアルファベット</b>で言います。使うのは、最初の交信で自分の無線呼出符号（コールサイン、call sign）を名乗るときです。1 文字だけの言葉や、聞き取りにくい言葉のつづりにも使います（AIM 4-2-7）。</p>
<p>数字も、雑音の中で区別しやすい読み方が決まっています。3 は <b>TREE</b>、5 は <b>FIFE</b>、9 は <b>NIN-ER（niner）</b>です（AIM の表）。つづりは、AIM の表では Alfa・Juliett・Xray です（X-ray と書く資料もあります）。</p>
<p>数字は、交信のあらゆる所に出てきます。種類ごとの言い方は、次の節で学びます。</p>
<ul><li>高さ：高度計（気圧高度計、altimeter）が示す高度</li>
<li>気圧：高度計に合わせる高度計規正値（アルティメターセッティング、altimeter setting）</li>
<li>向き：針路（ヘディング、heading）は、ふつう磁方位（magnetic direction）で言います。真方位（true direction）のときは、そう付け加えます（AIM 4-2-10）。</li>
<li>交通情報の時計の方位：航跡（トラック、track）が 12 時です。横風（crosswind）の日は、窓から見える方位とずれます（AIM 4-1-15）。</li>
<li>そのほか：周波数・時刻・速度・トランスポンダー（transponder）のコード</li></ul>
${bk.key('最初の交信では、コールサインをフォネティックで全部言う', '数字は 1 けたずつ。3 は tree、5 は fife、9 は niner', '発音は、カタカナでなく音声で確かめる')}
${bk.q('登録記号 N12AB の飛行機。文字と数字を 1 つずつ言うと？', '<b>November One Two Alfa Bravo</b>。機種名を言うときは N を省いて、たとえば「Archer One Two Alfa Bravo」と名乗ります（AIM 4-2-4）。')}` },
      { id: 'comm.numbers', t: '数字の言い方：高度・針路・速度・周波数・時刻・コード', scope: 'us', jcab: ['ppl.4.2.2.7', 'cpl.4.2.2.7'], faa: ['PA.III.A.K2'], h: () => `
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
      { id: 'comm.callsign', t: 'コールサインの決まり', scope: 'us', h: () => `
${bk.aim('コールサインは「誰への交信か」を決める、いちばん大切な部分です。省略してよいときと、いけないときを覚えます。')}
<ul><li><b>最初の交信では省略しない</b>：機種名・型式名かメーカー名のあとに、登録記号の数字と文字を言います。機種名を言うときは、<b>先頭の N を省きます</b>（例：Bonanza Six Five Five Golf）（AIM 4-2-4）。</li>
<li><b>省略は管制官から</b>：交信が確立したあと、管制官が「機種名＋最後の 3 文字」に省略して呼んだら、操縦士もそれを使ってかまいません（AIM 4-2-4）。例：Cessna One Two Three Four Five → Cessna Three Four Five。</li>
<li><b>似たコールサインがいるとき</b>は省略しません。自分への指示か疑わしいときは「<b>Verify clearance for</b>（完全なコールサイン）」と言います。似たコールサインの取りちがえは、ほかの機への許可を自分のものとして実行してしまう事故につながります（AIM 4-2-4）。</li>
<li><b>エアライン</b>は、会社の呼び名と便名を、数字をまとめた形で言います（例：United Twenty-Five Heavy）（AIM 4-2-4）。日本の ANA の呼び名は “All Nippon” です。</li></ul>
<p>この教材のコールサイン「<b>Archer Seven Lima Alpha</b>」は、練習用に決めた架空の機体（N7LA）のものです。同じ登録記号の実在の機とは関係ありません。登録記号の最後の 3 文字が 7LA なので、省略しても同じ言い方になります。本の中では「Archer 7LA」と短く書きますが、読み方は同じです。</p>
${fic}
${bk.key('最初の交信では、コールサインを省略しない', '省略してよいのは、管制官が先に省略してから', '自分あてか迷ったら「Verify clearance for（完全なコールサイン）」')}
${bk.q('交信が確立したあと、管制官が「Cessna Three Four Five」と呼んできた。自分は Cessna N12345。次の交信で自分も省略してよい？', 'はい。管制官が先に省略したので、そのあとの交信では「Cessna Three Four Five」と言ってかまいません（AIM 4-2-4）。ただし、似たコールサインの機がいるときは省略しません。')}` },
      { id: 'comm.words', t: '標準用語の正しい意味（Pilot/Controller Glossary）', scope: 'us', faa: ['PA.III.A.K2'], h: () => `
${bk.aim('Roger・Wilco・Affirmative などの標準用語（phraseology）は、意味をまちがえると事故になります。正しい意味と使い方を覚えます。')}
<p>FAA の Pilot/Controller Glossary（PCG）は、管制官の方式基準（JO 7110.65）と同じ用語集です。</p>
<h4>受け答え</h4>
${bk.t(['用語', '意味（PCG）', '使い方の注意'], [
  ['Roger', '最後の送信を全部受け取った', '<b>「はい」の意味ではない</b>。はい・いいえで答える質問には使わない'],
  ['Wilco', '受け取り、理解し、従う（will comply）', '滑走路・高度・針路などの指示には、Wilco だけでなく<b>内容を復唱（readback）</b>する'],
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
  ['Line up and wait', '滑走路に入って待て（例：runway three six, line up and wait）。<b>離陸（takeoff）の許可ではない</b>（PCG・AIM 5-2-5）', ''],
  ['Cleared for takeoff / Cleared to land', '離陸してよい / 着陸してよい', '“cleared” は許可の言葉。地上滑走（タキシー、taxi）の指示には使わない'],
  ['Cleared for the option', 'タッチアンドゴー・ローアプローチ・ストップアンドゴー・フルストップなどを、操縦士が選んでよい（PCG）', 'ふつうは訓練で使う'],
  ['Go around', '進入をやめよ。VFR では、言われなければ滑走路の上を上昇して場周経路（トラフィックパターン、traffic pattern）へ（PCG）', '']])}
${bk.key('Roger は「受け取った」だけ。「はい」は Affirmative、「従う」は Wilco', '滑走路・高度・針路・hold short は、Wilco だけでなく内容を復唱', 'line up and wait は離陸の許可ではない')}
${bk.warn('<b>よくある間違い：</b>はい・いいえで答える質問に「Roger」と答えることです。Roger は「受け取った」という意味だけで、「はい」の意味はありません。仲間うちの言葉や、CB 無線のような言い方（Ten-four など）は使いません（AIM 4-2-1）。')}
${bk.jur('words')}
${bk.q('管制官「Archer 7LA, say altitude.」。上昇中で、高度計は 3,480 ft。何と答える？', '「Archer 7LA, three thousand five hundred」のように、高度計の示す高度を 100 ft 単位に丸めて答えます（PCG：Say altitude）。Roger や Affirmative では答えになりません。')}` },
    ],
    terms: [['Phonetic alphabet', 'フォネティックアルファベット', 'AIM 4-2-7'], ['Niner / Tree / Fife', '9 / 3 / 5 の発音', ''], ['Flight level', 'フライトレベル', '米国は 18,000 ft MSL から'], ['Altimeter setting', '高度計規正値', 'JO 7110.65 2-4-17'], ['Squawk', 'スコーク（トランスポンダーのコードを入れよ）', '4 けた'], ['Zulu (UTC)', '協定世界時', 'AIM 4-2-12'], ['Call sign', '無線呼出符号', 'コールサイン'], ['Abbreviated call sign', '省略したコールサイン', '管制官が先に省略してから'], ['Roger / Wilco', '受け取った / 理解して従う', ''], ['Affirmative / Negative', 'はい / いいえ', ''], ['Unable', '従えない', ''], ['Stand by', '少し待って', '許可でも不許可でもない'], ['Say again', 'もう一度言って', ''], ['Hold short of', '…の手前で止まれ', '必ず復唱'], ['Line up and wait', '滑走路に入って待て', '離陸の許可ではない'], ['Pilot/Controller Glossary', '操縦士と管制官の用語集', 'PCG'], ['Phraseology', '標準用語', '意味の決まった言葉']],
    examples: ['“Archer Seven Lima Alpha, fly heading one two zero, climb and maintain three thousand five hundred.” → 針路 120°・高度 3,500 ft。', '“Altimeter three zero zero one” → 30.01 inHg に合わせる。“Squawk zero four two five” → 0425。', '“Contact Ground point seven” → 121.7 MHz に変えて Ground を呼ぶ。'],
    cautions: ['発音のカタカナは目安にしかならない。実際の音は音声で確かめる。', '英国など ICAO の言い方とは、一部が違う（{ch:radio5}）。'],
    quiz: [
      { q: '高度 13,500 ft の正しい言い方は？（AIM 4-2-8）', choices: ['thirteen thousand five hundred', 'one three thousand five hundred', 'one three five zero zero', 'flight level one three five'], answer: 1, why: '10,000 ft 以上は、thousand の前の数字を 1 けたずつ言う（AIM 4-2-8）。flight level は 18,000 ft MSL から（AIM 4-2-9）。' },
      { q: '管制官「Archer 7LA, say altitude.」に対して正しいのは？', choices: ['Roger, Archer 7LA', 'Archer 7LA, three thousand five hundred', 'Wilco', 'Affirmative'], answer: 1, why: '質問には内容で答える。上昇・降下中は、高度計の示す高度を 100 ft 単位に丸めて言う（PCG：Say altitude。標準用語の正しい意味の節）。' },
      { q: '“Stand by” の意味は？', choices: ['許可する', '許可しない', '少し待って（許可でも不許可でもない）', '周波数を変えよ'], answer: 2, why: 'PCG：Stand by は許可でも不許可でもない。長く待たされたら、もう一度呼んでよい（標準用語の正しい意味の節）。' },
      { q: '北（360°）へ向けという針路の、正しい言い方は？', choices: ['heading zero zero zero', 'heading three six zero', 'heading north', 'heading three sixty'], answer: 1, why: '針路は 3 けたを 1 けたずつ言い、北は 360 と言う（AIM 4-2-10・JO 7110.65 2-4-17）。' },
      { q: '管制官の「はい・いいえ」で答える質問に「はい」と答える言葉は？', choices: ['Roger', 'Wilco', 'Affirmative', 'Copy'], answer: 2, why: 'Affirmative が「はい」。Roger は「受け取った」だけで、はい・いいえの答えには使わない（PCG。標準用語の正しい意味の節）。' },
    ],
    written: [
      ['Roger・Wilco・Affirmative の違いを説明してください。滑走路や高度の指示に、Wilco だけで答えてはいけないのはなぜですか。', `Roger は「最後の送信を全部受け取った」、Wilco は「受け取り、理解し、従う」、Affirmative は「はい」です。滑走路・高度・針路・hold short は、聞きまちがいがそのまま事故になるので、内容を復唱して、管制官に確かめてもらいます。${bk.see('comm.words', '標準用語の正しい意味（Pilot/Controller Glossary）')}`],
      ['13,500 ft、FL190、周波数 119.75、北向きの針路を、AIM の言い方で言ってください。', `one three thousand five hundred、flight level one niner zero、one one niner point seven five、heading three six zero です。10,000 ft 以上は thousand の前を 1 けたずつ、周波数の小数点は point、北は 360 と言います。${bk.see('comm.numbers', '数字の言い方')}`],
      ['コールサインを省略してよいのは、どんなときですか。似たコールサインの機がいるときは、どうしますか。', `最初の交信では省略せず、管制官が先に省略してからだけ省略します。似たコールサインの機がいるときは省略しません。自分あてか疑わしければ “Verify clearance for（完全なコールサイン）” と確かめます。${bk.see('comm.callsign', 'コールサインの決まり')}`],
    ],
    refs: [R.aim42, R.aim41, R.aim43, R.pcg, R.jo71], lessons: ['t1'] });

  // ======================================================================= radio 3（第 1 部 第 15 章）
  B.add({ id: 'radio3', before: 'hf', part: 'p1', t: '交信の型：呼び出し・応答・復唱', en: 'How a call is built: initial contact, acknowledgement and readback',
    summary: '最初の呼び出しの型、管制官への応答と周波数の変え方、Class C 空域に入る前の交信の確立、必ず復唱するものと管制官のヒアバック、許可・指示・情報の聞き分けと、わからないとき・従えないときの言い方、よくある間違い、滑走路に入る許可と誤進入の防ぎ方。1 回の送信で必要なことを伝え、復唱で確かめ合い、許可のない滑走路に入らないようにします。',
    secs: [
      { id: 'comm.pattern', t: '最初の呼び出しの型', scope: 'us', faa: ['PA.III.A.K2'], h: () => `
${bk.aim('管制官を最初に呼ぶときの決まった順番を覚えます。1 回の送信で、必要なことを短く伝えられるようにします。学生操縦士（student pilot）の名乗り方も、ここで確かめます。')}
${FIG.callupBlocks()}
<p><b>最初の呼び出し</b>（initial contact）とは、ある局（または同じ局の別の管制官）に初めてする送信のことです。AIM 4-2-3 は、次の順番を勧めています。</p>
<ol><li><b>呼ぶ相手の局の名前</b>（LAB Ground）</li>
<li><b>自分の無線呼出符号（コールサイン、call sign）</b>：最初は省略しません（Archer Seven Lima Alpha）。</li>
<li><b>地上にいるときは、いまいる場所</b>（at the west ramp）</li>
<li><b>このあと伝えることの種類</b>：短ければ、要求そのものを言います（request taxi）。</li>
<li>必要なときだけ “Over”（ふつうは言いません）</li></ol>
<p>覚え方は「<b>誰を呼ぶ → 自分は誰 → どこにいる → 何をしたい</b>」です。</p>
${say([['P', `LAB Ground, ${CS}, student pilot, at the west ramp with information Bravo, VFR to the northeast practice area at three thousand five hundred, request taxi.`, 'LAB 地上管制へ。こちら Archer Seven Lima Alpha、学生操縦士。西のエプロンにいて、ATIS の B を聞きました。北東の訓練空域へ 3,500 ft で VFR。地上滑走（タキシー、taxi）を要求します。']])}
${fic}
<p>この本では、コールサインを “Archer 7LA” と短く書くことがあります。声に出すときは、どちらも “Archer Seven Lima Alpha” と言います（{ch:radio2}）。</p>
<h3>1 回で言うか、短く呼ぶか</h3>
<p>相手に<b>届くことがほぼ確かなら</b>、最初の呼び出しに要求・位置（空中なら高度）・ATIS の記号まで入れます。やり取りの回数が減り、周波数の混雑が減るからです。ただし、必要のないことまで言わないようにします（AIM 4-2-3）。</p>
<p>返事がないときは、無線の設定を確かめてから、<b>次の呼び出しを短く</b>します（例：“LAB Approach, ${CS}.”）。相手が応えてから、要求を言います（AIM 4-2-3）。</p>
<h3>呼び出しに入れるもの</h3>
<ul><li><b>ATIS の記号</b>：ATIS を聞いたら、最初の交信で “with information Bravo” のように記号を言います（AIM 4-1-13）。</li>
<li><b>student pilot</b>：学生操縦士は、各局への最初の呼び出しで “student pilot” と名乗ります。管制官が必要な手助けをしてくれます（AIM 4-2-4・{ch:radio1}）。</li>
<li><b>空中では高度</b>：空中では場所の代わりに位置と高度を言います。レーダーの管制官を最初に呼ぶときは、いまの高度を 100 ft 単位で言います（AIM 4-1-20）。</li></ul>
<p><b>規則と推奨</b>：14 CFR（米国の連邦航空規則）は守らなければならない法律です。AIM は法律ではありませんが、FAA が勧める手順で、法律で決まっていることも含みます。管制官の言い方は、FAA の指示書 JO 7110.65 に決められています。この章では、どれに書いてあるかを（ ）に示します。</p>
${bk.key('最初の呼び出し：相手 → 自分（省略しない）→ 地上なら場所 → 要求', '届くことが確かなら 1 回で全部言う。返事がなければ、短く呼び直す', 'ATIS の記号と student pilot を、最初の呼び出しに入れる')}
${bk.q('出発管制を最初に呼ぶ。地上で言った “at the west ramp” の代わりに、何を入れる？', 'いまの高度です。上昇中なら、目標の高度も言います。例：“LAB Departure, Archer Seven Lima Alpha, student pilot, one thousand two hundred, climbing to three thousand five hundred.”（AIM 4-1-20・{ch:radio4}）')}` },
      { id: 'comm.ack', t: '応答と周波数の変更', scope: 'us', h: () => `
${bk.aim('管制官からの呼び出しや指示への応え方、周波数の変え方、Class C 空域に入ってよい合図を覚えます。')}
<p>管制官からの呼び出しや許可には、<b>必ず応答</b>します（管制官が「応答は要らない」と言ったときを除きます）。応答には、自分のコールサインを最初か最後に付けます。そして Wilco・Roger・Affirmative・Negative などの言葉か、内容を言います（AIM 4-2-3）。言葉の意味は {ch:radio2} で確かめてください。</p>
${say([
  ['Departure', `${CS}, LAB Departure, radar contact two miles north of LAB. Resume own navigation.`, 'レーダーで確認した（LAB の北 2 マイル）。自分で航法を続けよ。'],
  ['P', `Resume own navigation, ${CSS}.`, '自分で航法を続けます。'],
  ['Tower', `${CSS}, report two mile final.`, '2 マイルの最終進入で報告せよ。'],
  ['P', `Wilco, ${CSS}.`, '従います。']])}
<p>Wilco は「受け取り、理解し、従う」です。滑走路・高度・針路（ヘディング、heading）の入った指示には、Wilco だけでなく内容を復唱（readback）します（{ch:radio2}・${bk.see('comm.readback', '復唱')}）。</p>
<p>2 回目からの交信では、呼び出しと用件を 1 回の送信で言います。答えがはっきりしていて誤解のおそれがなければ、局の名前は省いてかまいません（AIM 4-2-3）。</p>
<h3>周波数を変えるとき</h3>
<ol><li><b>まず応答します</b>（例：“Contact departure, ${CSS}.”）。黙って変えると、管制官は「指示が届いたのか、無線が壊れたのか」を区別できません（AIM 4-2-3）。</li>
<li><b>できるだけ早く変えます</b>。時刻・地点・高度を決めて変えるよう言われたら、そこまでは今の周波数を聞き続けます（AIM 4-2-3）。</li>
<li><b>新しい周波数では、まず聞きます</b>。誰も話していないことを確かめてから呼びます（AIM 4-2-2・{ch:radio1}）。</li></ol>
<p><b>Contact</b> と言われたら、新しい周波数で<b>呼び出します</b>。<b>Monitor</b> と言われたら、<b>呼ばずに聞いて</b>待ちます（PCG）。</p>
<p>レーダーの業務（VFR の交通情報など）を受けていて、区域を離れるときや周波数を変えたいときは、管制官に伝えてから交信を終えます（AIM 4-2-3）。</p>
${say([
  ['P', `LAB Departure, ${CSS}, entering the northeast practice area, request frequency change.`, '北東の訓練空域に入ります。周波数の変更を要求します。'],
  ['Departure', `${CSS}, radar service terminated, squawk VFR, frequency change approved.`, 'レーダー業務を終了。VFR のコード（1200）にせよ。周波数の変更を承認。'],
  ['P', `Squawk VFR, frequency change approved, ${CSS}.`, '']])}
<h3>Class C 空域に入る前の「交信の確立」</h3>
<p>Class C 空域に入る前には、管制機関との<b>双方向の交信</b>（two-way radio communications）を確立します。中にいる間は、交信を続けなければなりません（14 CFR 91.130・{ch:law}）。境界の外で余裕をもって呼びます。確立したかどうかは、管制官の応答で決まります（AIM 3-2-4）。</p>
${bk.t(['管制官の応答', '交信は確立した？', 'あなたは'], [
  [`“${CS}, stand by.”`, '<b>確立した</b>（コールサインを言った）', 'Class C に入ってよい'],
  [`“${CS}, remain outside Charlie airspace and stand by.”`, '確立した。ただし入るなという指示', '外で待つ'],
  ['“Aircraft calling LAB Approach, stand by.”', '<b>確立していない</b>（コールサインがない）', '入ってはいけない']])}
<p>Class D 空域も同じ考え方です（14 CFR 91.129・AIM 3-2-5）。</p>
${bk.key('呼び出しと許可には必ず応答する。コールサインを付けて', '周波数は「応答してから」「できるだけ早く」変える', 'Contact は呼ぶ。Monitor は呼ばずに聞く', 'Class C：コールサイン付きの応答があれば、交信の確立')}` },
      { id: 'comm.readback', t: '復唱（readback）：何を・どの順に', scope: 'us', from: ['kiso09.19'], h: () => `
${bk.aim('復唱（readback）で、何を・どの順に言うかを覚えます。復唱は、聞きまちがいをその場で見つけるための二重の確認です。')}
${FIG.readbackLoop()}
<p>あなたが指示を復唱すると、管制官はその復唱が正しいかを確かめます（JO 7110.65 2-4-3）。この管制官の確かめを、<b>ヒアバック</b>（hearback）と呼びます。復唱とヒアバックの二重の確認が、数字の聞きまちがいや言いまちがいを防ぎます（AIM 4-4-7）。</p>
<h3>必ず復唱するもの</h3>
<ul><li><b>空中</b>：高度の指定・高度の制限・針路の指示（vector）・滑走路の指定を復唱します（AIM 4-4-7）。高度・高度の制限・針路は、<b>言われた順に</b>復唱します。</li>
<li><b>地上</b>：滑走路の指定・滑走路に入る許可・<b>滑走路の手前で止まれ（hold short）</b>・<b>line up and wait</b> を復唱します（AIM 4-3-18）。管制官は hold short の復唱がないと、復唱を求めます（“read back hold instructions”。JO 7110.65 3-7-2）。</li>
<li><b>許可の最初の復唱</b>：地上滑走・離陸（takeoff）・着陸の許可を最初に復唱するときは、滑走路の番号を入れます。L・R・C があれば、それも言います（AIM 4-4-7）。</li>
<li>すべての復唱と応答に、<b>自分のコールサイン</b>を付けます（AIM 4-4-7）。</li></ul>
<p><b>line up and wait</b>（LUAW）は、「滑走路に入り、離陸の向きにそろえて待て」という指示です。<b>離陸の許可ではありません</b>。“cleared for takeoff” を聞くまで離陸しません（AIM 5-2-5）。</p>
${say([
  ['Ground', `${CS}, LAB Ground, runway three six, taxi via Alpha, hold short of taxiway Charlie. Departure frequency one one niner point seven five, squawk four two seven one.`, '滑走路 36 へ。誘導路 A を通り、誘導路 C の手前で止まれ。出発管制は 119.75、コードは 4271。'],
  ['P', `Runway three six, taxi via Alpha, hold short of Charlie, departure one one niner point seven five, squawk four two seven one, ${CSS}.`, '言われた順に復唱し、最後にコールサイン。'],
  ['Tower', `${CS}, LAB Tower, runway three six, line up and wait. Traffic, a Cessna on five mile final.`, '滑走路 36 に入って待て（離陸の許可ではない）。5 マイルの最終進入に Cessna。'],
  ['P', `Runway three six, line up and wait, ${CSS}.`, '滑走路の番号を入れる。'],
  ['Tower', `${CS}, runway three six, wind three four zero at eight, cleared for takeoff. Fly runway heading. Traffic, a Cessna on four mile final.`, '滑走路 36、風 340° 8 kt、離陸を許可。滑走路の方位を保って上昇せよ。4 マイルの最終進入に Cessna。'],
  ['P', `Runway three six, cleared for takeoff, fly runway heading, ${CSS}.`, '滑走路の番号と、針路の指示を復唱。']])}
<p>出発の周波数とトランスポンダー（transponder）のコードは、AIM が「必ず復唱する」としているものではありません。高度計（気圧高度計、altimeter）に合わせる高度計規正値（アルティメターセッティング、altimeter setting）も同じです。でも数字なので、復唱しておくと確かめになります。この本の例では復唱しています。</p>
<h4>復唱のあとも聞く</h4>
<p>復唱したら、すぐに次の長い送信を続けません。管制官が直すことがあるからです。返事を最後まで聞きます。</p>
<p>ヒアバックがあっても、正しく聞く責任はあなたにあります。許可を受けるか断るかは、操縦士の責任です（AIM 4-4-7）。管制官が何も言わなかったことは、復唱が正しかった証明にはなりません。少しでも疑いがあれば、確かめます（14 CFR 91.123）。</p>
<h4>別の場面の例：針路と高度</h4>
${say([
  ['Approach', `${CSS}, turn right heading zero niner zero, climb and maintain three thousand five hundred.`, '右に旋回して針路 090。3,500 ft まで上昇して、それを保て。'],
  ['P', `Right heading zero niner zero, climb and maintain three thousand five hundred, ${CSS}.`, '旋回の方向も入れ、言われた順に。']])}
<h3>復唱しなくてよいもの</h3>
${bk.t(['管制官が言うこと', 'あなたの応え方'], [
  [`交通情報 “${CSS}, traffic, one o'clock, four miles, westbound, a Cessna, two thousand five hundred.”`, `見えたら “Traffic in sight, ${CSS}.”。探しているなら “Looking, ${CSS}.”。見えないと伝えるなら “Negative contact, ${CSS}.”`],
  ['“Radar contact …”', `“${CSS}.” のように、受け取ったことを伝える`],
  ['風や規正値だけの知らせ', `“${CSS}.”。数字を復唱して確かめてもよい`]])}
${bk.key('空中：高度・高度の制限・針路・滑走路の指定は必ず復唱', '地上：滑走路の指定・入る許可・hold short・line up and wait は必ず復唱', '言われた順に、コールサインを付けて。復唱のあとは返事を最後まで聞く')}
${bk.warn('<b>よくある間違い：</b>数字の入った指示に “Roger” だけで答えることです。管制官は、あなたが数字を正しく聞いたかを確かめられません。')}
${bk.jur('readback')}
${bk.q('Ground「Archer 7LA, runway three six, taxi via Alpha, cross runway two seven.」。何を復唱する？', '滑走路の指定（runway three six）と、滑走路を横切る許可（cross runway two seven）です。言われた順に復唱し、コールサインを付けます：“Runway three six, taxi via Alpha, cross runway two seven, Archer 7LA.”（AIM 4-3-18）')}` },
      { id: 'comm.clarify', t: 'わからないとき・従えないとき', scope: 'us', from: ['kiso09.20'], h: () => `
${bk.aim('聞き取れない・自分あてかわからない・従えない、というときの正しい言い方を覚えます。許可・指示・情報を聞き分け、推測で動かないことが、いちばん大切です。')}
<p>米国の規則（14 CFR 91.123）は、機長（PIC：pilot in command）に、次のことを求めています。許可の内容がはっきりしないときは、<b>すぐに管制官に確かめる</b>ことです。AIM も、理解できない許可や指示は、理解できるまで確かめるよう勧めています（AIM 4-3-18）。機長は、自分の機の運航に最終的な責任を持つからです（14 CFR 91.3）。</p>
<h4>許可・指示・情報を聞き分ける</h4>
${bk.t(['種類', '意味（PCG）', '例'], [
  ['管制承認（クリアランス、ATC clearance）', '管制が、決めた条件のもとで、こう動いてよいと認めること', 'cleared for takeoff・cleared to land・cross runway two seven'],
  ['指示（ATC instructions）', '管制が、操縦士に決まった動きを求めること', 'turn left heading two five zero・go around・hold short of runway two seven'],
  ['情報・助言（advisory）', '安全な飛行と地上の動きに役立つ助言と情報', "traffic, two o'clock・wind three four zero at eight・number two"]])}
<p>許可をもらったら、新しい許可がない限り、その許可から外れて飛びません（緊急のときなどを除く）。管制が行われている所では、緊急のときを除いて、指示に反して飛ぶこともできません（14 CFR 91.123）。管制が認めない限り、ほかの機に出されたレーダーの管制の許可や指示で飛ぶこともできません（14 CFR 91.123）。</p>
<p>順番や見込みの言葉は、情報です。「number two」「まもなく離陸できる」と聞いても、滑走路に入る許可や離陸の許可にはなりません。“ready for departure” も、準備ができたという知らせで、許可ではありません（${bk.see('comm.runway', '滑走路に入る許可と誤進入の防ぎ方')}）。</p>
${bk.t(['場面', '言い方', 'ポイント'], [
  ['聞き取れなかった', `“Say again, ${CSS}.”<br>後半だけなら “Say again all after Charlie, ${CSS}.”`, '推測で復唱しない。推測で動かない'],
  ['自分あてかわからない（似たコールサインがいる）', `“Verify clearance for ${CS}.”`, 'コールサインは省略しない（AIM 4-2-4）'],
  ['地上で、経路がわからない', `“Request progressive taxi, ${CSS}.”`, '一区間ずつ案内してもらえる（AIM 4-3-18）'],
  ['指示に従えない', `“Unable, clouds ahead, ${CSS}.”`, '理由を添える。VFR で雲に入るような指示には従わない'],
  ['line up and wait のまま、長く待たされている', `“${CSS}, holding in position runway three six.”`, '離陸の許可が来なければ確かめる（AIM 5-2-5）'],
  ['操縦が忙しくて、すぐ答えられない', `“${CSS}, stand by.”`, '操縦が先。落ち着いたら呼ぶ']])}
<p>聞き直すことは、悪いことではありません。Say again・Verify・Unable は、PCG に決められた正しい言葉です。迷ったら、地上では止まって聞きます。空中では、安全な高度・針路を保ったまま聞きます。</p>
<p>従えない指示には、“Unable” と理由と、代わりの希望を言います（PCG：Unable）。復唱してから、黙って別のことをしてはいけません。管制官の予想と、あなたの機の動きが離れてしまうからです。緊急で許可や指示から外れたときは、できるだけ早く管制に伝えます（14 CFR 91.123）。</p>
${bk.key('はっきりしない許可は、すぐ確かめる（14 CFR 91.123）', '許可・指示は動きを決め、情報は判断の材料。見込みの言葉で動かない', '聞こえない → Say again。自分あてか不明 → Verify。従えない → Unable と理由', '迷ったら、地上では止まって聞く。空中では安全な状態を保って聞く')}
${bk.q('line up and wait で滑走路に入って、2 分たっても離陸の許可が来ない。遅れるという知らせもなく、最終進入の機も見えない。どうする？', '管制塔に “Archer 7LA, holding in position runway three six.” と伝えて確かめます。AIM 5-2-5 は、LUAW の指示から 2 分以上たってから事故やインシデントが起きていた、という FAA の分析を挙げています。そして、遅れを知らされていないときは、待っている時間を考えて確かめるよう勧めています。')}` },
      { id: 'comm.mistakes', t: 'よくある間違い', scope: 'us', h: () => `
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
      { id: 'comm.runway', t: '滑走路に入る許可と誤進入の防ぎ方', scope: 'us', from: ['kiso09.20', 'kiso09.21', 'kiso09.22'], faa: ['PA.II.D.K2', 'PA.II.D.K3', 'PA.II.D.K6', 'PA.III.A.K9'], h: () => `
${bk.aim('滑走路は、許可のない機がいてはいけない場所です。地上滑走（タキシー、taxi）の指示と、滑走路に入る・横切る許可を聞き分けます。離陸（takeoff）と着陸の許可も区別して、滑走路誤進入（runway incursion）を防ぎます。')}
${FIG.runwayEntry()}
<p>FAA は、滑走路誤進入を「空港で、離着陸に使う面の守られた区域に、いてはいけない航空機・車両・人がいること」としています（FAA Runway Safety）。原因の 1 つは操縦士の誤りで、FAA は「許可なしで滑走路を横切る」を例に挙げています。</p>
<h4>許可がないと越えない線</h4>
<p>管制塔が運用している空港では、滑走路や誘導路の上を動く・離陸する・着陸するのに、管制の許可が要ります（14 CFR 91.129(i)）。滑走路を横切るときも、許可が要ります。管制官は、横切る滑走路ごとに、はっきりと許可を出します（AIM 4-3-18）。</p>
<p>その境目が、停止線です。停止線は黄色の 4 本の線で、実線の 2 本がある側で止まります。hold short と言われたら、機体のどこも線を越えないように止まります（AIM 2-3-5）。線の横には、赤地に白の文字の標識があり、その滑走路の名前を示します。「18-36」なら、左が滑走路 18 の端、右が 36 の端です（AIM 2-3-8）。</p>
<p>滑走路を出るときも、機体の全部が停止線を越えるまでは、滑走路を出たことになりません（AIM 2-3-5）。</p>
<h4>言葉ごとに、してよいこと</h4>
${bk.t(['管制官の言葉', 'してよいこと'], [
  ['“Runway three six, taxi via Alpha.”', '誘導路 A を通り、滑走路 36 の停止線の手前まで。滑走路 36 に入る・横切る許可ではない（AIM 4-3-18）'],
  ['“Hold short of runway two seven.”', '滑走路 27 の停止線の手前で止まる（AIM 2-3-5）'],
  ['“Cross runway two seven at Alpha.”', '言われた所で、滑走路 27 を横切る。ほかの滑走路は、また別の許可が要る（AIM 4-3-18・JO 7110.65 3-7-2）'],
  ['“Runway three six, line up and wait.”', '滑走路 36 に入り、離陸の向きにそろえて待つ。離陸はまだ（AIM 5-2-5）'],
  ['“Runway three six, cleared for takeoff.”', '滑走路 36 から離陸してよい（PCG）'],
  ['“Continue, expect landing clearance two mile final.”', '進入を続ける。着陸はまだ許可されていない（JO 7110.65 3-10-1）'],
  ['“Runway three six, cleared to land.”', '滑走路 36 に着陸してよい（PCG）']])}
<p>滑走路に関わる許可と hold short は、滑走路の番号を入れて復唱します（AIM 4-3-18・4-4-7）。</p>
<h4>許可を先取りしない</h4>
<p>前の機が動いた、着陸機が見えなくなった、自分だけが待っている、ということも、新しい許可にはなりません。次に許可されそうなことを、もう許可されたことにしません。</p>
<p>着陸許可（landing clearance）も、安全に着陸できるという保証ではありません。管制の許可は、管制官が知っている交通と空港の状態をもとに出されます（PCG：Cleared to land）。進入が安定しなければ、許可をもらっていても着陸復行（ゴーアラウンド、go-around）します。着陸許可をもらったかわからないまま滑走路が近づいたら、着陸せずに着陸復行して確かめます。</p>
${bk.judge('地上滑走の前に、空港の図で経路と、滑走路を横切る所・ホットスポット（hot spot）を確かめます。ホットスポットは、衝突や誤進入の危険が起きてきた、特に注意する場所です（PCG）', '停止線の前で、言われた滑走路の番号と、もらった許可を声に出して確かめます。標識の番号と機首の方位も見ます', '位置や経路がわからなくなったら、進みながら考えず、安全に止まって管制に聞きます。“Request progressive taxi” で、一区間ずつ案内してもらえます（AIM 4-3-18）', '滑走路に入る許可をもらったら、1 人で操縦する機は、管制の交信だけを聞きます。外もよく見ます（AIM 4-3-18）', '停止線の赤い灯（REL：runway entrance lights）がついていたら止まり、許可と食い違うときは管制官に確かめます。灯は自動のしくみで、許可の代わりになりません（AIM 2-1-6）', 'line up and wait で待つとき、前の赤い灯（THL：takeoff hold lights）がついたら離陸しません。灯が消えても、離陸の許可ではありません（AIM 2-1-6）')}
<p>誘導路の標識も、迷わないための手がかりです。黒地に黄色の文字は、いまいる誘導路を示します（AIM 2-3-9）。黄色地に黒の文字と矢印は、交差点から出ていく誘導路と、その向きを示します（AIM 2-3-10）。</p>
${bk.photo('ch09-photo3')}
${bk.key('地上滑走の指示は、停止線の手前まで。越えるには入る・横切る許可', '滑走路は 1 本ずつ、はっきり許可をもらってから横切る', '見込みの言葉は情報。line up and wait は離陸の許可ではない', '停止線の赤い灯がついたら止まり、管制に確かめる')}
${bk.warn('<b>ここに注意：</b>管制塔が閉まっている空港では、許可は出ません。停止線の前で止まり、自分で滑走路と最終進入を見て、ほかの機・車両・人と十分に離れていることを確かめてから越えます（AIM 2-3-5）。')}
${bk.recall('line up and wait と離陸の許可の聞き分けは、復唱の節で学びました。滑走路の指定と hold short は、いつも復唱します。', ['comm.readback', '復唱（readback）：何を・どの順に'])}
${bk.q('地上管制「Archer 7LA, runway three six, taxi via Alpha.」。誘導路 A の途中で、滑走路 27 を横切ります。そのまま横切ってよい？', 'いいえ。滑走路は 1 本ずつ、はっきりした横切る許可が要ります（AIM 4-3-18）。この指示には滑走路 27 を横切る許可がないので、滑走路 27 の停止線の手前で止まり、管制官に確かめます。')}` },
    ],
    terms: [['Initial contact (initial callup)', '最初の呼び出し', 'AIM 4-2-3'], ['Acknowledge', '応答する', 'AIM 4-2-3'], ['Readback', '復唱', 'AIM 4-4-7・4-3-18'], ['Contact / Monitor', '交信せよ（呼ぶ）/ 聞いて待て（呼ばない）', 'PCG'], ['Two-way radio communications', '双方向の交信', 'Class C・D に入る条件（AIM 3-2-4）'], ['Line up and wait (LUAW)', '滑走路に入って待て', '離陸の許可ではない（AIM 5-2-5）'], ['Progressive taxi', '一区間ずつの地上滑走の案内', 'AIM 4-3-18'], ['Holding in position', '滑走路の上で待っている', 'AIM 5-2-5'], ['Verify clearance for …', '…への許可か確かめてください', 'AIM 4-2-4'], ['Runway holding position marking', '停止線', '滑走路の手前の停止線。AIM 2-3-5'], ['Hearback', 'ヒアバック', '管制官が復唱を聞いて確かめること（JO 7110.65 2-4-3）'], ['ATC clearance', '管制承認', 'クリアランス。決めた条件で動いてよいという許可（PCG）'], ['ATC instructions', '管制の指示', '決まった動きを求める（PCG）'], ['Advisory', '助言・情報', '判断の材料で、許可ではない（PCG）'], ['Runway incursion', '滑走路誤進入', 'FAA Runway Safety'], ['Runway holding position sign', '滑走路の手前の標識', '赤地に白。AIM 2-3-8'], ['Hot spot', 'ホットスポット', '衝突や誤進入の危険が起きてきた場所（PCG）'], ['Runway entrance lights (REL)', '停止線の赤い灯', 'AIM 2-1-6']],
    examples: ['“Archer 7LA, hold short of runway three six.” → “Hold short of runway three six, Archer 7LA.”（Roger だけでは足りない）', '“Aircraft calling LAB Approach, stand by.” → コールサインが言われていないので、Class C には入らない（AIM 3-2-4）。', '“Runway three six, taxi via Alpha.” で、途中に滑走路 27 がある → 滑走路 27 の停止線の手前で止まり、横切る許可を確かめる（AIM 4-3-18）。'],
    cautions: ['交信の例は米国（FAA）の言い方です。英国など ICAO の言い方とは一部が違います（{ch:radio5}）。', '実際の交信では、その空港の手順と管制官の指示が優先です。'],
    quiz: [
      { q: 'AIM 4-4-7 が、空中で復唱すべきとしているものは？', choices: ['交通情報', '高度・高度の制限・針路・滑走路の指定を含む指示', '風と気温', 'ATIS の内容'], answer: 1, why: 'AIM 4-4-7：高度・高度の制限・針路（vector）・滑走路の指定は、言われた順に、コールサインを付けて復唱する。' },
      { q: '管制官が「Aircraft calling LAB Approach, stand by.」と応えた。Class C 空域に入ってよい？', choices: ['入ってよい', '入ってはいけない（コールサインがない）', '高度を下げれば入ってよい', 'トランスポンダーを 7700 にして入る'], answer: 1, why: 'AIM 3-2-4：コールサインを付けて応答されたときだけ、交信が確立する。コールサインのない応答では確立していない。' },
      { q: '周波数を変えるよう指示された。正しいのは？', choices: ['黙ってすぐ変える', '応答してから、できるだけ早く変える', '変えずに待つ', '一度ほかの周波数を試す'], answer: 1, why: 'AIM 4-2-3：応答がないと、管制官は指示が届いたのか、無線が壊れたのかを区別できない。' },
      { q: 'Tower「Archer 7LA, runway three six, line up and wait.」の意味は？', choices: ['離陸してよい', '滑走路に入り、離陸の向きにそろえて待つ（離陸の許可ではない）', '滑走路の手前で待つ', '滑走路を横切ってよい'], answer: 1, why: 'AIM 5-2-5：LUAW は離陸の許可ではない。“cleared for takeoff” を聞いてから離陸する。' },
      { q: '管制官「Archer 7LA, monitor tower one one eight point three.」。正しいのは？', choices: ['118.3 に変えて、すぐ管制塔を呼ぶ', '応答してから 118.3 に変え、呼ばずに聞いて待つ', '今の周波数のまま待つ', '118.3 に変えて、ATIS の記号を言う'], answer: 1, why: 'Monitor は「その周波数を聞いて待て」で、自分からは呼ばない（PCG）。変える前に応答する（AIM 4-2-3）。' },
      { q: '地上管制「Runway three six, taxi via Alpha.」。経路の途中に滑走路 27 がある。正しいのは？', choices: ['そのまま滑走路 27 を横切る', '滑走路 27 の上で止まって待つ', '滑走路 27 の停止線の手前で止まり、横切る許可を確かめる', '滑走路 36 に入って待つ'], answer: 2, why: 'AIM 4-3-18：滑走路を横切るには、滑走路ごとにはっきりした許可が要る。地上滑走の指示だけでは横切れない（滑走路に入る許可と誤進入の防ぎ方）。' },
      { q: '停止線に近づくと、停止線の赤い灯（REL）がついた。地上滑走の指示では、滑走路に入ってよいと言われている。どうする？', choices: ['止まって、管制官に確かめる', '許可があるので、そのまま入る', '急いで入って、早く滑走路を出る', '灯火信号を待たずに離陸する'], answer: 0, why: 'AIM 2-1-6：REL の赤は、滑走路に入る・横切るのが危ないという合図。止まり、許可と灯が食い違うときは管制に確かめる。' },
      { q: 'hold short と言われた。機体はどこで止める？', choices: ['停止線の破線の側', '滑走路のセンターライン', '滑走路の端の白い線', '停止線の実線の側で、機体のどこも線を越えない'], answer: 3, why: 'AIM 2-3-5：実線は止まる側にある。hold short では、機体のどこも停止線を越えない。' },
    ],
    written: [
      ['滑走路の手前で止まる指示に、操縦士は “Roger” とだけ答えました。確認は十分ですか。復唱・管制官の確かめ・聞き直しの役割を説明してください。', `十分ではありません。hold short は必ず、滑走路の番号を入れて復唱します。管制官はその復唱を聞いて、正しいかを確かめます（ヒアバック）。聞き取れなければ “Say again” で聞き直し、わからないまま動きません。${bk.see('comm.readback', '復唱（readback）：何を・どの順に')}`, ['kiso09.q19']],
      ['離陸の順番の情報を聞いて、自分の番が近いので滑走路へ進んでよいと考えました。情報・許可・指示をどう区別し、何を確かめればよいですか。', `順番や見込みは情報で、滑走路に入る許可にはなりません。誰に、どこで、何をするよう言われたかを確かめ、“line up and wait” か “cleared for takeoff” をはっきり受けてから動きます。わからなければ、動く前に管制官に確かめます。${bk.see('comm.clarify', 'わからないとき・従えないとき')}`, ['kiso09.q20']],
      ['指示された地上滑走の経路の先に、別の滑走路があります。経路を言われたことで、その滑走路も横切ってよいですか。空港の図・標識・停止線・許可の範囲で説明してください。', `横切ってはいけません。滑走路は 1 本ずつ、はっきりした横切る許可が要ります。空港の図と標識で位置を確かめ、赤地に白の標識と停止線の手前で止まります。横切る許可がわからなければ、入らずに確かめます。${bk.see('comm.runway', '滑走路に入る許可と誤進入の防ぎ方')}`, ['kiso09.q21']],
      ['滑走路 36 で “line up and wait” と言われました。離陸を始めてよいですか。また、“continue” と言われた到着機は、それを着陸許可と考えてよいですか。', `どちらもいけません。line up and wait は、滑走路に入って待つ指示で、離陸の許可ではありません。“continue” も、進入を続けてよいというだけで、着陸許可ではありません。“cleared for takeoff”・“cleared to land” を、滑走路の番号とともに受けてから離陸・着陸します。${bk.see('comm.runway', '滑走路に入る許可と誤進入の防ぎ方')}`, ['kiso09.q22']],
    ],
    refs: [R.aim42, R.aim44, R.aim43, R.aim41, R.aim52, R.aim32, R.aim23, R.aim21, R.cfr91, R.pcg, R.jo71, NEW_R.faaRI], lessons: ['t1', 't2'] });

  // ======================================================================= radio 4（第 1 部 第 16 章）
  B.add({ id: 'radio4', before: 'hf', part: 'p1', t: '1 回の飛行の交信：出発から到着まで', en: 'A whole flight on the radio: from the ramp to the ramp',
    summary: '管制塔とレーダーの進入管制がある架空の空港 LAB（Class C を想定）で、ATIS → 地上 → 管制塔 → 出発管制 → 訓練空域 → 進入管制 → 管制塔（場周・着陸）→ 地上 までの交信を、意味と理由つきで順にたどる。交通情報と監視の限界、計画どおりに飛べないときに早く伝えること、最後に、場周経路での練習の交信。',
    secs: [
      { id: 'comm.flow', t: 'この章の飛行：全体の流れと周波数', scope: 'us', from: ['kiso09.25', 'kiso09.27'], h: () => `
${bk.aim('この章でたどる 1 回の訓練飛行の全体を、地図と周波数の表で先に見ておきます。地上滑走（タキシー、taxi）・離陸（takeoff）・訓練空域・帰りの順です。帰りは、左回りの場周経路（トラフィックパターン、traffic pattern）のダウンウインド（downwind leg）に入ります。飛行の全体を通して気をつけることも、ここでまとめます。')}
${FIG.flightOverviewMap()}
<p>LAB は、管制塔とレーダーの進入管制がある架空の空港です。Class C 空域を想定しています。Class C 空域は、ふつう 2 つの部分でできています（AIM 3-2-4・{ch:law}）。空港から半径 5 NM の部分は、地上から空港の標高＋4,000 ft までです。半径 10 NM までの棚は、空港の標高＋1,200 ft から＋4,000 ft までです。</p>
<p>この章の飛行は、北東の訓練空域へ行って帰ってくるものです。番号 ①〜⑦ は、この章の見出しの番号です。</p>
${bk.t(['段階', '局', '周波数（架空）', 'すること'], [
  ['①', 'LAB ATIS', '127.65', '聞いて書き取る（話しかけない）'],
  ['②', 'LAB Ground', '121.7', '地上滑走の許可。出発の周波数とコードをもらう'],
  ['③', 'LAB Tower', '118.3', '離陸'],
  ['④', 'LAB Departure', '119.75', 'レーダーの業務・交通情報。訓練空域で別れる'],
  ['⑤', 'LAB ATIS → LAB Approach', '127.65 → チャートで確かめる', '帰りの最初の呼び出し'],
  ['⑥', 'LAB Tower', '118.3', '場周経路と着陸'],
  ['⑦', 'LAB Ground', '121.7', '駐機場へ']])}
<p>トランスポンダー（transponder）のコードは、出発が 4271、訓練空域が 1200（VFR）、帰りが 0425 です。どれも管制官から言われる架空の値で、1200 だけは VFR の決まったコードです。</p>
${fic}
<h4>飛行の全体を通して：交通情報の限界と、計画が変わるとき</h4>
<p>レーダーの管制官は、画面に見えた機のうち、あなたの近くの機や経路の先の機を知らせます。この知らせは、見張り（see and avoid）の代わりにはなりません（AIM 4-1-15）。</p>
${bk.judge('言われた機が見えたら “traffic in sight”、見えなければ “negative contact” と、そのまま伝えます（PCG）。似た位置の別の機を見て、見えたと思い込みません', '山に隠れた機や、レーダーの電波より低い所の機は、レーダーに映りません（AIM 4-5-1）。トランスポンダーのない機は、機内の交通の表示（TIS-B）に出ません（AIM 4-5-8）。表示に機がないことは、まわりに機がいない証明ではありません', '機内の交通の表示は、衝突をよける装置ではありません。見張りの責任は変わりません（AIM 4-5-7）', '雲・風・燃料・機体の具合で、計画どおりに飛べないとわかったら、早めに理由と希望（経路・高度・行き先）を伝えます。要求は、管制の返事があるまで承認ではありません（AIM 4-4-10）', 'VFR の飛行計画（flight plan）は、管制塔が自動では閉じません。着いたら自分で閉じます。閉じないと、到達予定時刻（到着予定時刻、estimated time of arrival）の 30 分後に捜索救難の手続きが始まります（AIM 5-1-14）')}
${bk.key('地上は Ground、滑走路と場周は Tower、離れたら Departure、帰りは ATIS のあと Approach', '周波数とコードは、ひざ板に書いておく', '交通情報や表示があっても、見張りは自分の責任', '計画どおりに飛べないとわかったら、早めに理由と希望を伝える')}` },
      { id: 'comm.atis', t: '① ATIS を聞いて書き取る', scope: 'us', faa: ['PA.III.A.K1', 'PA.III.B.K4'], h: () => `
${bk.aim('ATIS を聞き、必要な数字を書き取って、最初の交信の準備をします。')}
<p>飛行場情報放送（飛行場情報の自動放送、automatic terminal information service）は、ATIS と略します。管制の指示ではない決まった情報を、録音でくり返し流す放送です。管制官が同じことを何度も言わなくてよくなり、周波数の混雑が減ります（AIM 4-1-13）。</p>
<p>ATIS で特に大切なのは、<b>情報の記号（Alpha, Bravo…）</b>です。もう 1 つは、高度計（気圧高度計、altimeter）に合わせる<b>高度計規正値</b>（アルティメターセッティング、altimeter setting）です。ほかに、空港の名前・観測の時刻（UTC）・風・視程・天気・雲・気温・露点・使う滑走路・注意を伝えます。雲と視程は、省くことがあります（AIM 4-1-13）。雲高（シーリング、ceiling）が 5,000 ft を超え、視程が 5 マイルを超えるときです。</p>
<p>ATIS は、毎時の観測と特別な観測のたびに、新しく録音されます。滑走路などが変わったときも同じです。そのたびに、記号が次の文字に変わります（AIM 4-1-13）。</p>
${say([['ATIS', 'LAB information Bravo. One four five three Zulu. Wind three four zero at eight. Visibility one zero. Few clouds at five thousand. Temperature three one, dew point two two. Altimeter three zero zero one. Landing and departing runway three six. Advise on initial contact you have information Bravo.',
  'LAB の情報 B。14:53 UTC。風 340° 8 kt。視程 10 SM。5,000 ft に少しの雲。気温 31℃・露点 22℃。高度計 30.01。離着陸の滑走路 36。最初の交信で B を聞いたと伝えよ。', '書き取り：B ／ 1453Z ／ 340/08 ／ 10 ／ FEW050 ／ 31/22 ／ 30.01 ／ RWY 36（AIM 4-1-13）']])}
${bk.t(['ひざ板に書く欄', '値', 'すること'], [['記号・時刻', 'B・1453Z', '最初の交信で言う'], ['風', '340/08', '滑走路 36 との角度を見る'], ['視程・雲', '10・FEW050', 'VFR で飛べるか確かめる'], ['気温・露点', '31/22', '密度高度（density altitude）を考える（{ch:perf}）'], ['高度計', '30.01', 'すぐ合わせる'], ['滑走路', '36', '地上滑走の経路を考える']])}
<p>聞いたら、すぐに高度計を 30.01 に合わせ、表示が空港の標高（LAB は 55 ft。教材値。参考値：Sanford の空港は 54.8 ft）に近いことを確かめます。次に、Ground の周波数を無線機の予備に入れます。</p>
<p>最初の交信では “<b>with information Bravo</b>” と言います。管制官は、ATIS の内容をくり返さずにすみます（AIM 4-1-13）。“have numbers”（風・滑走路・高度計だけ聞いた）は、ATIS を聞いたという意味にはなりません（AIM 4-1-8）。</p>
${bk.key('ATIS は聞くだけ。記号・風・雲・高度計・滑走路を書く', '高度計はすぐ合わせ、空港の標高に近いか確かめる', '最初の交信で “with information Bravo”')}
${bk.q('ATIS で “Few clouds at five thousand”。北東の訓練空域へ 3,500 ft で行ってよい？', 'はい。雲の下 1,500 ft なので、VFR の決まりを満たします。Class C・E 空域の決まりは、雲の下 500 ft・上 1,000 ft・横 2,000 ft です（14 CFR 91.155）。雲が 3,500 ft にあると、雲の下 500 ft を守れません。その高さで飛ぶなら、雲から横に 2,000 ft 以上離れます（{ch:law}）。')}` },
      { id: 'comm.dep', t: '② 地上：タキシーの許可（出発周波数とコードも）', scope: 'us', h: () => `
${bk.aim('Ground に地上滑走を頼み、滑走路・経路・止まる所・出発の周波数・コードを聞き取って、復唱（readback）します。')}
<p>出発する機は、Ground（または Clearance Delivery）を呼んで地上滑走の許可をもらいます。AIM は、エンジンをかける前に呼ぶよう勧めています。地上滑走と試運転（ランナップ、run-up）の間は、Ground の周波数にいます。<b>離陸の準備ができたら、Tower に変えます</b>（AIM 4-3-14）。LAB のようにレーダーの出発管制がある空港では、Ground が出発の周波数とトランスポンダーのコードも伝えます。</p>
${say([
  ['P', `LAB Ground, ${CS}, student pilot, at the west ramp with information Bravo, VFR to the northeast practice area at three thousand five hundred, request taxi.`, 'LAB 地上管制へ。こちら Archer Seven Lima Alpha、学生操縦士（student pilot）。西のエプロンにいて ATIS B を聞いた。北東の訓練空域へ 3,500 ft で VFR。地上滑走を要求。', '型：相手 → 自分（最初は省略しない）→ 位置 → ATIS → 行き先 → 要求（AIM 4-2-3・4-2-4）'],
  ['Ground', `${CS}, LAB Ground, runway three six, taxi via Alpha, hold short of taxiway Charlie. Departure frequency one one niner point seven five, squawk four two seven one.`, '滑走路 36 へ。誘導路 A 経由、誘導路 C の手前で止まれ。出発管制 119.75、コード 4271。', '「滑走路 36 へ」は、滑走路に入る・横切る許可ではない（AIM 4-3-18）'],
  ['P', `Runway three six, taxi via Alpha, hold short of Charlie, departure one one niner point seven five, squawk four two seven one, ${CSS}.`, '滑走路 36・A 経由・C の手前で停止・出発 119.75・コード 4271、Archer 7LA。', '滑走路の指定と hold short は必ず復唱（AIM 4-3-18）。コールサインを付ける（AIM 4-4-7・{ch:radio3}）'],
  ['Ground', `${CSS}, continue via Alpha to runway three six.`, '誘導路 A をそのまま滑走路 36 へ。', ''],
  ['P', `Continue via Alpha to runway three six, ${CSS}.`, '誘導路 A で滑走路 36 へ、Archer 7LA。', '']])}
<p>復唱したら、トランスポンダーに 4271、無線機の予備に 119.75 を入れておきます。誘導路 A を走り、C の手前で止まります。</p>
<p>試運転は、滑走路の近くの決められた場所でします（${ahead('ground.runup', 'ランナップと離陸前の確認')}）。終わったら滑走路 36 の手前の停止線（runway holding position marking）で止まり、Tower 118.3 に変えます（AIM 4-3-14）。</p>
${bk.key('地上滑走の許可は、滑走路に入る許可ではない', '出発の周波数とコードは、復唱してすぐ機械に入れる', '試運転が終わり、準備ができたら Tower に変える')}
${bk.warn('<b>よくある間違い：</b>「Runway three six, taxi via Alpha」を、滑走路 36 に入ってよいと思うことです。これは滑走路 36 の<b>手前まで</b>行ってよいという意味です。滑走路に入る・横切る許可ではありません（AIM 4-3-18）。滑走路の手前の停止線で必ず止まります。地上滑走の指示に “cleared” という言葉は使われません。')}` },
      { id: 'comm.tower', t: '③ 管制塔：離陸', scope: 'us', faa: ['PA.III.A.K2'], h: () => `
${bk.aim('Tower に離陸の準備ができたことを伝えます。line up and wait と離陸許可（takeoff clearance）を、正しく聞き分けます。')}
${bk.photo('towerCab')}
<p>周波数を変えたら、まず数秒聞きます。誰も話していないことを確かめてから呼びます（AIM 4-2-2）。</p>
${say([
  ['P', `LAB Tower, ${CS}, student pilot, holding short runway three six, ready for departure, VFR northeast.`, 'LAB 管制塔へ。学生操縦士。滑走路 36 の手前で止まっている、出発の準備よし。北東へ VFR。', 'student pilot は、各局への最初の呼び出しで言う（AIM 4-2-4）'],
  ['Tower', `${CS}, LAB Tower, runway three six, line up and wait. Traffic, a Cessna on five mile final.`, '滑走路 36 に入って待て。5 マイルの最終進入に Cessna。', 'LUAW は離陸の許可ではない（AIM 5-2-5）。同じ滑走路へ向かう 6 マイル以内の一番近い機が伝えられる（JO 7110.65 3-9-4）'],
  ['P', `Runway three six, line up and wait, ${CSS}.`, '滑走路 36、入って待つ、Archer 7LA。', ''],
  ['Tower', `${CS}, runway three six, wind three four zero at eight, cleared for takeoff. Fly runway heading. Traffic, a Cessna on four mile final.`, '滑走路 36、風 340° 8 kt、離陸を許可。滑走路の方位を保って上昇せよ。4 マイルの最終進入に Cessna。', '離陸の許可の復唱には、必ず滑走路の番号（AIM 4-4-7）'],
  ['P', `Runway three six, cleared for takeoff, fly runway heading, ${CSS}.`, '滑走路 36、離陸許可、滑走路の方位、Archer 7LA。', ''],
  ['Tower', `${CS}, contact departure.`, '出発管制と交信せよ（周波数は地上滑走の前にもらった 119.75）。', '前に伝えた出発の周波数は、管制官が省いてよい（JO 7110.65 2-1-17）'],
  ['P', `Contact departure, ${CSS}.`, '出発管制へ、Archer 7LA。', '応答してから、できるだけ早く変える（AIM 4-2-3）']])}
<ul><li><b>line up and wait</b>（LUAW）では、滑走路に入ってセンターラインに合わせて止まり、最終進入の機を目で確かめます。管制官は、ほかの指示なしに LUAW のまま 90 秒を超えて待たせないようにしています（JO 7110.65 3-9-4）。長く待たされたら確かめます（AIM 5-2-5・{ch:radio3}）。</li>
<li><b>fly runway heading</b> は、滑走路のセンターラインの延長の磁方位（magnetic direction）で飛べ、という意味です。風で流されても、方位を直しません（PCG）。</li>
<li>離陸して上昇したら、高度・速度・方位が先です。無線は操縦のあとです（Aviate → Navigate → Communicate）。</li></ul>
${bk.key('line up and wait は「入って待つ」。cleared for takeoff を聞いてから離陸', '離陸の許可は、滑走路の番号を入れて復唱', 'contact departure で周波数がなければ、前にもらった周波数')}
${bk.sim('課目「通常離陸と上昇」では、離陸前点検のあと、離陸の許可を復唱してから離陸します。課目の許可は “wind …, runway 36, cleared for takeoff.” です。line up and wait と fly runway heading は出てきません。', ['t1', '通常離陸と上昇'])}` },
      { id: 'comm.radar', t: '④ 出発管制・レーダー：交通情報と、別れ方', scope: 'us', faa: ['PA.III.A.K7', 'PA.VI.B.K3', 'PA.VI.D.K2', 'PA.VIII.F.K3', 'IR.V.B.K2'], h: () => `
${bk.aim('レーダーで見てもらいながら上昇し、交通情報を聞いて他機を探し、訓練空域で業務を終えるまでの交信を学びます。')}
${say([
  ['P', `LAB Departure, ${CS}, student pilot, one thousand two hundred, climbing to three thousand five hundred.`, 'LAB 出発管制へ。学生操縦士。いま 1,200 ft、3,500 ft へ上昇中。', '空中での最初の呼び出しは、いまの高度を言う（AIM 4-1-20）。高度は thousand・hundred で（AIM 4-2-9）'],
  ['Departure', `${CS}, LAB Departure, radar contact two miles north of LAB. Resume own navigation.`, 'レーダーで確認（LAB の北 2 マイル）。自分で航法を続けよ。', 'Radar contact：レーダーで識別した。業務の終わりまで情報をもらえる（PCG）'],
  ['P', `Resume own navigation, ${CSS}.`, '自分で航法、Archer 7LA。', ''],
  ['Departure', `${CSS}, traffic, one o'clock, four miles, westbound, a Cessna, two thousand five hundred.`, '1 時の方向・4 マイル・西向き・Cessna・2,500 ft。', '時計の方位は、航跡（トラック、track）が 12 時（AIM 4-1-15）'],
  ['P', `Looking, ${CSS}.`, '探している、Archer 7LA。', '見えなければ、あとで “negative contact” と伝えてよい（PCG）'],
  ['P', `Traffic in sight, ${CSS}.`, '見えた、Archer 7LA。', 'Traffic in sight：伝えられた交通が見えた（PCG）'],
  ['P', `LAB Departure, ${CSS}, entering the northeast practice area, request frequency change.`, '北東の訓練空域に入る。周波数の変更を要求。', 'レーダーの業務をやめるときは、先に管制官に伝える（AIM 4-1-15）'],
  ['Departure', `${CSS}, radar service terminated, squawk VFR, frequency change approved.`, 'レーダー業務を終了。VFR のコード（1200）に。周波数の変更を承認。', ''],
  ['P', `Squawk VFR, frequency change approved, ${CSS}.`, 'VFR コード、周波数変更了解、Archer 7LA。', 'トランスポンダーを 1200 にする']])}
${bk.photo('asrRadar')}
<ul><li><b>交通情報の型</b>：時計の方位・距離（NM）・進む方向・機種と高度（わかれば）の順に言われます（AIM 4-1-15）。</li>
<li><b>時計の方位は航跡が基準</b>：管制官のレーダーに見えるのは、機の進む方向（航跡）だけです。横風（crosswind）の日は、機首を風上に向けて（クラブして）飛びます。すると、他機は言われた方位から少しずれて見えます（AIM 4-1-15）。言われた方位だけでなく、その左右も探します。</li>
<li>レーダーの業務を受けていても、<b>見張りの責任はなくなりません</b>（AIM 4-1-15）。業務を受けている間は、周波数を聞き続けます。やめるときは管制官に伝えてから周波数を変え、コードを 1200 にします。</li></ul>
${bk.key('交通情報：時計の方位・距離・方向・機種・高度', '12 時は航跡。クラブしているときは、言われた方位の左右も探す', 'レーダーの業務を受けていても、見張りは自分の責任')}
${bk.q('右からの横風で、機首を航跡より 10° 右に向けて飛んでいる。「traffic, twelve o\'clock」と言われた。機首から見て、どちらを探す？', '少し左です。12 時は航跡の方向で、機首は航跡より 10° 右を向いているので、他機は機首から見て 10° ほど左に見えます（AIM 4-1-15）。')}` },
      { id: 'comm.arrive', t: '⑤〜⑦ 帰り：進入管制 → 管制塔 → 着陸 → 地上', scope: 'us', h: () => `
${bk.aim('帰りに ATIS を聞き直し、Approach・Tower・Ground と順に交信して、駐機場まで戻ります。ファイナル（final approach leg）の前に、着陸許可（landing clearance）をもらう流れをたどります。')}
${FIG.patternCalls()}
<p>図のダウンウインドの高さと速さは、教材値です。場周高度は、プロペラ機でふつう地上 1,000 ft です（参考値：AIM 4-3-3）。実際の速さは、POH（操縦士用の機体の手引書、pilot's operating handbook）と学校の手順に従います。</p>
<h3>⑤ ATIS と進入管制</h3>
<p>帰る前に、LAB の ATIS を聞き直します。記号が B から C に変わっていれば、内容が新しくなっています。</p>
${say([['ATIS', 'LAB information Charlie. One five five three Zulu. Wind three six zero at one zero. Visibility one zero. Scattered clouds at four thousand. Temperature three two, dew point two two. Altimeter three zero zero zero. Landing and departing runway three six. Advise on initial contact you have information Charlie.',
  'LAB の情報 C。15:53 UTC。風 360° 10 kt。視程 10 SM。4,000 ft に散在する雲。気温 32℃・露点 22℃。高度計 30.00。滑走路 36。最初の交信で C を聞いたと伝えよ。', '記号が B → C に変わった。新しい高度計 30.00 に合わせる']])}
<p>帰りは南西へ飛びます。地上 3,000 ft を超える高さで水平に飛ぶときは、高度が決まっています（14 CFR 91.159）。磁航路（magnetic course）180〜359° の南西向きなら、偶数千 ft＋500 ft（4,500 ft など）です。この例では、雲の下に十分に離れて、地上 3,000 ft より低い 2,500 ft で帰ります。</p>
${say([
  ['P', `LAB Approach, ${CS}, student pilot, one five miles northeast, two thousand five hundred, squawking one two zero zero, with information Charlie, landing LAB.`, 'LAB 進入管制へ。学生操縦士。北東 15 マイル、2,500 ft、コード 1200、ATIS C を聞いた、LAB に着陸したい。', '位置・高度・コード・行き先を言う（AIM 3-2-4 は、Class C の業務を頼むことも挙げている）。Class C の境界より十分手前で呼ぶ'],
  ['Approach', `${CS}, LAB Approach, squawk zero four two five and ident.`, 'コード 0425 にして IDENT ボタンを押せ。', 'コールサインを付けて応えたので、交信が確立した（AIM 3-2-4）。Ident：トランスポンダーの識別の機能（PCG）'],
  ['P', `Squawk zero four two five, ${CSS}.`, 'コード 0425、Archer 7LA。', 'コードを入れて IDENT を押す'],
  ['Approach', `${CSS}, radar contact one four miles northeast of LAB. Enter left downwind runway three six. Contact LAB Tower one one eight point three.`, 'レーダーで確認（LAB の北東 14 マイル）。滑走路 36 の左ダウンウインドに入れ。LAB 管制塔 118.3 と交信せよ。', ''],
  ['P', `Left downwind runway three six, Tower one one eight point three, ${CSS}.`, '滑走路 36 の左ダウンウインド、管制塔 118.3、Archer 7LA。', '左右と滑走路の番号を必ず入れる']])}
<h3>⑥ 管制塔：場周経路と着陸</h3>
${say([
  ['P', `LAB Tower, ${CS}, student pilot, one zero miles northeast, two thousand, with Charlie, for left downwind runway three six.`, 'LAB 管制塔へ。学生操縦士。北東 10 マイル・2,000 ft・ATIS C。滑走路 36 の左ダウンウインドへ向かう。', ''],
  ['Tower', `${CSS}, LAB Tower, report midfield left downwind runway three six.`, '滑走路 36 の左ダウンウインドの中央で報告せよ。', ''],
  ['P', `Report midfield left downwind runway three six, ${CSS}.`, '左ダウンウインドの中央で報告する、Archer 7LA。', ''],
  ['P', `LAB Tower, ${CSS}, midfield left downwind.`, '（報告）左ダウンウインドの中央。', ''],
  ['Tower', `${CSS}, number two, follow the Cessna on left base. Runway three six, cleared to land.`, '着陸の順番は 2 番。左ベースの Cessna に続け。滑走路 36、着陸を許可。', '“Number (n), follow (traffic)” は管制官の決まった言い方（JO 7110.65）'],
  ['P', `Number two, traffic in sight, runway three six, cleared to land, ${CSS}.`, '2 番、前の機が見えた、滑走路 36 着陸許可、Archer 7LA。', '見えなければ “negative contact” と言って探す'],
  ['Tower', `${CSS}, turn right at Charlie, contact Ground point seven.`, '誘導路 C で右に出よ。地上管制 121.7 と交信せよ。', '“Ground point seven” は 121.7（AIM 4-3-14）'],
  ['P', `Right at Charlie, Ground point seven, ${CSS}.`, '右に C、地上管制 121.7、Archer 7LA。', '着陸した機は、言われるまで管制塔の周波数にいる（AIM 4-3-14）']])}
<p>前の Cessna の後ろに付いてベースへ曲がります。着陸したら、言われた誘導路（言われなければ最初に使える誘導路）からすぐに滑走路を出ます。管制官から別の指示がなければ、機体の全部が停止線を越えたところで止まります（AIM 4-3-21）。</p>
<h3>⑦ 地上管制：駐機場へ</h3>
${say([
  ['P', `LAB Ground, ${CS}, student pilot, clear of runway three six at Charlie, taxi to the west ramp.`, 'LAB 地上管制へ。学生操縦士。滑走路 36 を誘導路 C で出た。西のエプロンへ行きたい。', ''],
  ['Ground', `${CSS}, taxi to the west ramp via Charlie, Alpha.`, '誘導路 C・A 経由で西のエプロンへ。', ''],
  ['P', `Taxi to the west ramp via Charlie, Alpha, ${CSS}.`, 'C・A 経由で西のエプロンへ、Archer 7LA。', '']])}
<p>途中で滑走路を横切るときは、横切る許可が要ります（AIM 4-3-18）。駐機場で止まり、チェックリスト（checklist）でエンジンを止めます。交信はここまでです。</p>
${bk.key('帰る前に ATIS を聞き直し、新しい高度計に合わせる', 'Approach への最初の呼び出し：位置・高度・コード・ATIS・行き先', '着陸のあとは停止線を越えて止まり、言われてから Ground へ')}` },
      { id: 'comm.option', t: '⑧ 別の日の練習：場周経路でのタッチアンドゴー', scope: 'us', h: () => `
${bk.aim('別の日の練習で、場周経路を回りながら離着陸をくり返すときの交信を学びます。着陸復行（ゴーアラウンド、go-around）を言われたときの応え方も学びます。')}
${say([
  ['P', `LAB Tower, ${CS}, student pilot, holding short runway three six, request closed traffic.`, 'LAB 管制塔へ。学生操縦士。滑走路 36 の手前で止まっている。場周経路での離着陸の練習を要求。', 'Closed traffic：場周経路から出ずに、離着陸をくり返すこと（PCG）'],
  ['Tower', `${CSS}, left closed traffic approved.`, '左回りの場周を承認。', ''],
  ['P', `Left closed traffic, ${CSS}.`, '', ''],
  ['P', `LAB Tower, ${CSS}, entering left downwind, request the option.`, '左ダウンウインドに入る。オプションを要求。', 'VFR の場周では、ダウンウインドに入るときに頼む（AIM 4-3-23）'],
  ['Tower', `${CSS}, runway three six, cleared for the option.`, '滑走路 36、オプションを許可。', 'タッチアンドゴー・ローアプローチ・ミストアプローチ・ストップアンドゴー・フルストップのどれでもよい（AIM 4-3-23）'],
  ['P', `Runway three six, cleared for the option, ${CSS}.`, '', ''],
  ['Tower', `${CSS}, go around.`, '着陸復行せよ。', ''],
  ['P', `Going around, ${CSS}.`, '着陸復行する、Archer 7LA。', 'まず操縦（出力・姿勢・形態）。そのあとで応答']])}
<ul><li><b>cleared for the option</b> は、ふつう訓練で使う許可で、教官が学生の判断を見るのに役立ちます（AIM 4-3-23・PCG）。滑走路で止まる・遅れるときは、すぐに伝えます。</li>
<li><b>go around</b> と言われたら、すぐに着陸復行を始めます。VFR の機は、ほかに指示がなければ、滑走路の上を上昇しながら場周高度まで上がります。そして、クロスウインド（crosswind leg）から場周に入ります（PCG）。操作は第 2 部で学びます（${ahead('ops.goaround', 'ゴーアラウンド')}）。</li></ul>
${bk.key('closed traffic は、場周経路での離着陸のくり返し', 'option はダウンウインドに入るときに頼む', 'go around は、操縦が先、応答はあと')}
${bk.sim('課目「場周経路」は、着陸許可の復唱から始まります。', ['t2', '場周経路'])}` },
    ],
    terms: [['Information (letter)', 'ATIS の記号', 'AIM 4-1-13'], ['Have numbers', '風・滑走路・高度計だけ聞いた（ATIS を聞いた意味ではない）', 'AIM 4-1-8'], ['Taxi via … / Hold short of …', '…を経由して地上滑走せよ / …の手前で止まれ', 'JO 7110.65 3-7-2'], ['Departure frequency … squawk …', '出発の周波数とトランスポンダーのコード', ''], ['Ready for departure', '出発の準備ができた', ''], ['Fly runway heading', '滑走路のセンターラインの磁方位で飛べ（風の修正をしない）', 'PCG'], ['Radar contact', 'レーダーで識別した', 'PCG'], ['Resume own navigation', '自分で航法を続けよ', 'PCG'], ['Radar service terminated', 'レーダーの業務の終了', ''], ['Squawk VFR', 'コードを 1200 に', ''], ['Ident', 'トランスポンダーの IDENT ボタンを押せ', 'PCG'], ['Enter left downwind', '左ダウンウインドに入れ', ''], ['Number two, follow …', '着陸の順番は 2 番、…に続け', 'JO 7110.65'], ['Closed traffic', '場周経路での離着陸のくり返し', 'PCG'], ['Cleared for the option', 'オプションの許可', 'AIM 4-3-23'], ['Go around', '着陸復行せよ（進入をやめよ）', 'PCG'], ['Traffic information service – broadcast (TIS-B)', '機内に送られる交通の情報', 'トランスポンダーのない機は出ない（AIM 4-5-8）'], ['See and avoid', '見張り', '交通情報があっても操縦士の責任（AIM 4-1-15）']],
    examples: ['ATIS の高度計 30.01 → 地上で高度計を合わせ、表示が空港の標高（LAB は 55 ft）に近いことを確かめる。', '“Number two, follow the Cessna on left base” → 見えたら “traffic in sight”。見えなければ “negative contact” と言って探し、前の機の後ろに付く。', '帰りの経路に雲が広がってきた → 早めに Approach に「雲を避けて南から帰りたい」と理由と希望を伝え、返事を待ってから経路を変える。'],
    cautions: ['この章の交信は、FAA の言い方と方式をもとにした架空の練習用の台本です。実際の空港の手順・周波数・管制官の言い方は、場所と状況で違います。', '実際の空港の手順は、FAA の最新の資料と管制官の指示で確かめてください。'],
    quiz: [
      { q: '地上管制の「Runway three six, taxi via Alpha」で、滑走路 36 に入ってよい？', choices: ['入ってよい', '入ってはいけない（手前で止まる）', '横切るだけならよい', 'line up and wait と同じ'], answer: 1, why: 'AIM 4-3-18：出発の滑走路の指定と地上滑走の指示は、その滑走路に入る・横切る許可ではない。' },
      { q: '着陸して滑走路を出た。Ground に変えるのはいつ？', choices: ['接地したらすぐ', '滑走路を出たらすぐ', '停止線を越えて止まり、管制塔に「contact ground」と言われてから', '駐機場に着いてから'], answer: 2, why: 'AIM 4-3-14・4-3-21：着陸した機は、言われるまで管制塔の周波数にいる。滑走路を出たら、別の指示がなければ停止線を越えて止まる。' },
      { q: '交通情報「traffic, one o\'clock, four miles, westbound」の「one o\'clock」の基準は？', choices: ['北', '機首の方向', '進んでいる方向（航跡）', '滑走路の方向'], answer: 2, why: 'AIM 4-1-15：管制官のレーダーに見えるのは航跡だけなので、航跡が 12 時。クラブしていると、他機は言われた方位からずれて見える。' },
      { q: 'ATIS の information Bravo を聞いた。最初の交信で何と言う？', choices: ['have numbers', 'with information Bravo', 'ATIS の内容を全部読み上げる', '何も言わない'], answer: 1, why: 'AIM 4-1-13：ATIS の記号を言うと、管制官は内容をくり返さずにすむ。“have numbers” は ATIS を聞いた意味にならない。' },
      { q: '南西へ向かう VFR で、地上 3,000 ft を超える高さを水平に飛ぶ。正しい高度は？（地面は海面の高さとする）', choices: ['3,500 ft', '4,500 ft', '4,000 ft', '5,000 ft'], answer: 1, why: '14 CFR 91.159：磁航路 180〜359° は偶数千 ft＋500 ft。3,500 ft は 0〜179° の高度。' },
      { q: '交通情報をもらったあと、機内の交通の表示から、その機が消えた。正しい考え方は？', choices: ['まわりに他機はいないと決める', '表示はすべての機を映すので安心する', '交通情報は忘れてよい', '表示に出ない機もいるので、見張りを続ける'], answer: 3, why: 'AIM 4-5-8：トランスポンダーのない機は TIS-B に出ない。AIM 4-5-7：機内の交通の表示は衝突をよける装置ではなく、見張りの責任は変わらない（この章の飛行：全体の流れと周波数）。' },
    ],
    written: [
      ['交通情報を受けたあと、機内の画面から他機が消えました。まわりに他機はいないと考えてよいですか。監視の範囲・表示の限界・見張りとの関係で説明してください。', `考えてはいけません。山に隠れた機やレーダーより低い機はレーダーに映らず、トランスポンダーのない機は機内の表示（TIS-B）に出ません。表示は衝突をよける装置ではなく、交通情報があっても見張りは自分の責任です。言われた方位とその左右を探し、見えなければ “negative contact” と伝えます。${bk.see('comm.flow', 'この章の飛行：全体の流れと周波数')}`, ['kiso09.q25']],
      ['帰りの経路の天気が悪くなり、管制に言われたとおりでは安全に飛べなくなりました。もらった許可だから、そのまま続けるべきですか。伝えることと、計画の見直しを説明してください。', `続けません。いまの位置・高度、天気や機体の事情、残りの燃料、希望する経路・高度・行き先を、早めに伝えます。要求は、返事があるまで承認ではないので、新しい許可を確かめてから変えます。行き先を変えたら、飛行計画の到着の予定も見直します。${bk.see('comm.flow', 'この章の飛行：全体の流れと周波数')}`, ['kiso09.q27']],
      ['ATIS を聞いて、ひざ板に書く欄を挙げてください。聞いたあと、すぐにすることは何ですか。', `記号・時刻・風・視程と雲・気温と露点・高度計・滑走路を書きます。聞いたらすぐに高度計を合わせて空港の標高に近いことを確かめ、Ground の周波数を予備に入れます。最初の交信では “with information（記号）” と言います。${bk.see('comm.atis', 'ATIS を聞いて書き取る')}`],
    ],
    refs: [R.aim41, R.aim42, R.aim43, R.aim44, R.aim32, R.aim52, R.aim51, R.jo71, R.pcg, R.cfr91, NEW_R.aim45], lessons: ['t1', 't2', 't4'] });

  // ======================================================================= radio 5（第 1 部 第 17 章）
  B.add({ id: 'radio5', before: 'hf', part: 'p1', t: '管制塔のない空港・緊急・無線の故障・Sanford・FAA と ICAO の違い', en: 'Non-towered airports, emergencies, radio failure, Sanford, FAA and ICAO',
    summary: '管制塔のない空港での自己通報、トランスポンダーとコード、MAYDAY と PAN-PAN、無線が使えないときの手順と灯火信号、Sanford（KSFB）で気をつけること、米国・英国（ICAO）・日本の言い方の違い、上達の練習法。困ったときに遅れずに助けを求め、無線が使えなくても安全に降りられるようにします。',
    secs: [
      { id: 'comm.ctaf', t: '管制塔のない空港：CTAF で自己通報', scope: 'us', faa: ['PA.III.B.K1'], h: () => `
${bk.aim('管制塔のない空港では、誰も指示を出しません。自分の位置とすることを、自分で知らせる言い方を覚えます。場周経路（トラフィックパターン、traffic pattern）では、どの辺にいるかを言います。辺の名前は、ダウンウインド（downwind leg）・ベース・ファイナル（final approach leg）です。')}
${FIG.ctafCalls()}
<p>管制塔のない空港（または管制塔が閉まっている時間の空港）では、みんなが同じ周波数で、自分の位置と意図を知らせ合います。これを<b>自己通報</b>（self-announce）といい、その周波数を <b>CTAF</b>（共通交通情報周波数）といいます。返事は来ないものと考えて、まわりの機に向けて言います（AIM 4-1-9）。</p>
<ul><li>CTAF には、UNICOM・MULTICOM・FSS（飛行サービス局、Flight Service Station）の周波数が使われます。管制塔が閉まっている時間は、Tower の周波数も使われます（AIM 4-1-9）。UNICOM は、政府のものではない空港の無線局で、管制はしません（PCG）。地上局のない空港では、MULTICOM の <b>122.9</b> を使います（AIM 4-1-9）。周波数は、セクショナルチャートと Chart Supplement に載っています。</li>
<li>場周経路は、決められていなければ<b>左回り</b>です。プロペラ機の場周高度は、ふつう<b>地上 1,000 ft</b> です。ダウンウインドの中央の横から、場周高度で水平に入ります（AIM 4-3-3）。</li></ul>
${bk.t(['いつ（AIM 4-1-9）', '例（架空の Lakeside 空港・滑走路 18）'], [
  ['出発：地上滑走（タキシー、taxi）の前・滑走路に入る前', `“Lakeside traffic, ${CS}, west ramp, taxiing to runway one eight, Lakeside.”`],
  ['出発：離陸（takeoff）して場周を離れる', `“Lakeside traffic, ${CSS}, departing runway one eight, departing the pattern to the south, climbing to two thousand five hundred, Lakeside.”`],
  ['到着：10 マイル手前', `“Lakeside traffic, ${CS}, one zero miles northeast, two thousand five hundred, descending, Lakeside.”`],
  ['到着：ダウンウインド・ベース・ファイナルに入るとき', `“Lakeside traffic, ${CS}, entering left downwind runway one eight, full stop, Lakeside.”`],
  ['滑走路を出たとき', `“Lakeside traffic, ${CSS}, clear of runway one eight, Lakeside.”`]])}
<ul><li><b>空港の名前を最初と最後に</b>言います。近くの別の空港が、同じ周波数を使っていることがあるからです。</li>
<li>“active runway” ではなく、<b>滑走路の番号</b>を言います。</li>
<li>“Traffic in the area, please advise” は決まった言い方ではなく、使いません（AIM 4-1-9）。</li>
<li>到着の機は 10 マイル手前から、出発の機はエンジンをかけてから 10 マイル離れるまで、CTAF を聞いて必要なことを言います（AIM 4-1-9）。</li>
<li>VFR の直進着陸（straight-in）は、空中衝突の危険が増えるので FAA は勧めていません。直進で入る機に優先はありません（AIM 4-1-9・14 CFR 91.113）。</li></ul>
<p class="small mute">Lakeside 空港とコールサイン「Archer Seven Lima Alpha（Archer 7LA）」は架空の練習用です。実際の周波数で使わないでください。</p>
${bk.key('管制塔がない＝自分で言う。空港名を最初と最後に', '言う所：地上滑走の前・滑走路に入る前・10 マイル手前・ダウンウインド・ベース・ファイナル・滑走路を出たとき', '“active runway” でなく番号。“Traffic in the area, please advise” は使わない')}
${bk.q('Lakeside 空港へ向かう途中、CTAF で「Lakeside traffic, Cessna … left base runway one eight」と聞こえた。何がわかる？', '別の機が、滑走路 18 の左場周のベース（ファイナルの手前）にいることです。自分が場周に入るときは、その機の後ろに付けるよう、位置と順番を考えて見張り（see and avoid）を続けます。')}` },
      { id: 'comm.xpdr', t: 'トランスポンダーとコード', scope: 'us', jcab: ['ppl.1.2.5.6', 'cpl.1.6.5.3', 'ir.2.5.2'], faa: ['PA.III.A.K4', 'PA.VI.B.K4'], h: () => `
${bk.aim('管制のレーダーに自分の機を知らせる装置、トランスポンダー（transponder）と、その決まったコードを覚えます。')}
${FIG.xpdrCodes()}
<p>トランスポンダーは、地上のレーダーの問い合わせに、<b>4 けたのコード</b>と<b>高度</b>（Mode C）で答える装置です。管制官の画面に、自分の機がコードと高度つきで映ります。<b>ADS-B Out</b> は、GPS の位置などを自分から送り続ける装置です。Class B・C 空域や、その上などでは、どちらも必要です（14 CFR 91.215・91.225・{ch:law}）。</p>
<ul><li>“<b>Squawk</b> four two seven one” と言われたら、コードを 4271 にします。</li>
<li>“<b>Ident</b>” と言われたら、IDENT のボタンを押します。言われたときだけ押します（AIM 4-1-20）。</li></ul>
${bk.t(['コード', '意味', '出典'], [['1200', 'VFR（管制から指定がないとき）', 'AIM 4-1-20'], ['7500', '不法な干渉（ハイジャック）', 'AIM 6-3-4'], ['7600', '無線の故障', 'AIM 6-4-2'], ['7700', '緊急（遭難・緊急のとき）', 'AIM 6-2-2']])}
<p>コードを変えるときは、途中で 7500・7600・7700 を通らないようにします。たとえば 2700 から 7200 に変えるときは、2700 → 2200 → 7200 の順にします（7700 を通らない。AIM 4-1-20）。地上の設備で警報が出てしまうからです。</p>
<p>写真の無線機のトランスポンダーは、コード 7000 を表示しています。英国では、7000 と 2000 が目立たせるためのコード（conspicuity code）で、VFR の機は 7000 を使います（CAP 413 5.8・8.9 と交信の例）。米国の VFR は 1200 なので、国によってコードが違うことに気をつけます。</p>
${bk.photo('ch04-photo5')}
${bk.key('Squawk ＝コードを入れる。Ident ＝言われたときだけボタンを押す', 'VFR は 1200。7500・7600・7700 は特別なコード', 'コードを変える途中で 7500・7600・7700 を通らない')}
${bk.jur('xpdr')}` },
      { id: 'comm.mayday', t: 'MAYDAY と PAN-PAN：助けを求める', scope: 'us', jcab: ['ppl.4.1.2.4', 'cpl.4.1.2.4'], faa: ['PA.IX.B.K6'], h: () => `
${bk.aim('困ったときに、遅れずに助けを求める言い方を覚えます。遭難通信（メーデー、distress communications）と緊急通信（PAN-PAN、urgency communications）の違いを学びます。伝える順番と、燃料の言い方も学びます。')}
<p>AIM 6-1-2 は、<b>位置・燃料・天気などに不安を感じた時点で、少なくとも「緊急」（urgency）の状態</b>だとしています。危険になってからではなく、<b>そのときに助けを求めます</b>。AIM は「遅れが事故を起こし、命を奪ってきた」と書いています。</p>
${bk.t(['', '遭難（distress）', '緊急（urgency）'], [
  ['どんなとき', '重大で差し迫った危険があり、すぐに助けが必要（エンジン故障・火災など）', 'すぐではないが、安全に関わる状態（位置がわからない・燃料が心配など）'],
  ['言葉', '<b>MAYDAY</b> を 3 回', '<b>PAN-PAN</b> を 3 回（英国のつづりは PAN PAN）'],
  ['優先', 'すべての交信より優先。その周波数のほかの局は、送信をやめる', '遭難の交信のほかは、すべてより優先']])}
<p><b>伝える順番</b>（AIM 6-3-2。必要なものを、できればこの順に）：</p>
<ol><li>MAYDAY ×3 か PAN-PAN ×3</li><li>呼ぶ相手の局</li><li>コールサインと機種</li><li>何が起きたか</li><li>天気</li><li>意図と要求</li><li>いまの位置と針路（ヘディング、heading）：迷ったら、最後にわかっていた位置・時刻と、そこからの針路</li><li>高度</li><li><b>残りの燃料（分で言う）</b></li><li>乗っている人数</li><li>そのほか役に立つこと</li></ol>
${say([
  ['P', `Mayday, Mayday, Mayday, LAB Approach, ${CS}, engine failure, forced landing in a field, one zero miles northeast of LAB, two thousand five hundred, two people on board.`, '遭難。LAB 進入管制へ。Archer 7LA。エンジン故障。畑に不時着（forced landing）する。LAB の北東 10 マイル。2,500 ft。搭乗 2 名。', 'まず操縦：最良滑空速度（最良滑空、best glide speed）と着陸する場所。それから通報'],
  ['P', `Pan-pan, Pan-pan, Pan-pan, LAB Approach, ${CS}, uncertain of position, request assistance, last known position one five miles northeast of LAB at one six two zero Zulu, heading two two zero, two thousand five hundred, six zero minutes of fuel remaining, two people on board.`, '緊急。位置が不確か。助けを求める。最後にわかった位置は 16:20 UTC に LAB の北東 15 マイル、そこから針路 220、2,500 ft、燃料は残り 60 分、搭乗 2 名。', '燃料は分で（AIM 6-3-2・PCG：Fuel remaining）']])}
<ul><li>ふだん交信している周波数で言います。返事がなければ <b>121.5 MHz</b>（緊急の周波数）で、または “<b>Any station</b>” と呼びかけて言います（AIM 6-3-1）。</li>
<li>管制と交信しているなら、もらっているコードのままにします。交信できないときは <b>7700</b> にします（AIM 6-3-2）。</li>
<li>できれば上昇します。無線もレーダーも届きやすくなります（AIM 6-3-2）。ただし、IFR の気象状態の管制空域では、許可なく上昇・降下してはいけません（緊急のときの 14 CFR 91.3(b) の場合を除く。AIM 6-3-2）。</li>
<li>それでも、<b>いちばん先は操縦</b>です（Aviate → Navigate → Communicate）。緊急の操作は、第 2 部で学びます（${ahead('emg.basic', '緊急時の考え方')}）。</li></ul>
${bk.key('不安を感じたら、その時点で助けを求める（AIM 6-1-2）', '差し迫った危険は MAYDAY、安全に関わる状態は PAN-PAN。どちらも 3 回', '燃料は分で言う。交信できなければ 7700')}
${bk.sim('エンジン故障の課目で、正しい遭難通報を選びます。', ['e3', '上空でのエンジン故障'])}` },
      { id: 'comm.nordo', t: '無線が使えないとき・灯火信号', scope: 'us', faa: ['PA.III.A.K3', 'PA.III.A.K5', 'PA.III.A.K6'], h: () => `
${bk.aim('無線が使えなくなったときの順番と、管制塔の灯火信号の意味を覚えます。')}
${FIG.lightGunSignals()}
<p>まず、本当に故障か、操作の誤りかを確かめます。音量・スケルチ・周波数（使用中の側か）・MIC の選択を見ます。ヘッドセットの差し込み・スタックマイク・もう一方の無線機も確かめます（${bk.see('radio.equip', '無線機・マイク・オーディオパネルの使い方')}）。</p>
<p>それでも交信できなければ、トランスポンダーを <b>7600</b> にします（AIM 6-4-2）。有視界気象状態（VMC：visual meteorological conditions）なら、VFR のまま飛びます。そして、<b>無理のない範囲で早めに</b>（as soon as practicable）着陸します。これは IFR の機の規則（14 CFR 91.185(b)）と同じ考え方です。AIM 6-4-1 は、これは「すぐに」という意味ではないと説明しています。ふさわしくない空港に降りたり、目的地の数分手前で降りたりしなくてよい、ということです。何をするかは、最後は機長（PIC：pilot in command）が判断します。</p>
<p>無線が壊れても、次の条件がそろえば、Class D・C の空港に着陸できます。VFR の気象条件で、管制塔が見えていて、灯火信号で着陸の許可をもらえることです（14 CFR 91.129(d)・91.130）。</p>
${bk.t(['状況', 'すること（AIM 4-2-13）'], [
  ['受信機が故障（聞こえない）', 'Class D の地表区域の外か上で、使われている滑走路と流れを見きわめる。管制塔に「機種・位置・高度・着陸したい・灯火信号で管制してほしい」と送信する。3〜5 マイルで位置を送信して場周に入り、灯火信号を見る'],
  ['送信機が故障（話せない）', '外か上で流れを見きわめてから場周に入る。管制塔の周波数を聞き、自分への灯火信号を探す'],
  ['送信も受信も故障', '外か上で流れを見きわめてから場周に入り、管制塔を見続けて灯火信号を受ける'],
  ['出発の前に故障', '直す。直せなければ管制塔に電話して、無線なしで出発してよいか許可をもらう']])}
<p><b>応え方</b>：飛行中は、昼は<b>翼を振り</b>、夜は<b>着陸灯か航空灯を点滅</b>させます（AIM 4-2-13）。地上では、昼は補助翼（エルロン、aileron）か方向舵（ラダー、rudder）を動かします。夜は着陸灯か航空灯を点滅させます（AIM 4-3-13）。灯火信号の意味は、米国の規則（14 CFR 91.125）に決められています。</p>
${bk.key('故障を疑ったら：操作を確かめる → 7600 → VFR を保ち、適した空港に早めに着陸', '管制塔のある空港へは、外か上で流れを見てから場周に入り、灯火信号を見る', '緑の点滅は、空中では「戻れ」、地上では「タキシーしてよい」')}
${bk.jur('nordo.vfr', 'light')}` },
      { id: 'comm.sfb', t: 'Sanford（KSFB）で気をつけること', scope: 'us', h: () => `
${bk.aim('平行な滑走路が 3 本ある Sanford（KSFB）で、取り違えやすい所と、管制塔が求めていることを知ります。')}
${FIG.sfbLayout()}
<p>FAA の「From the Flight Deck: Orlando Sanford（SFB）」（2026 年 6 月 2 日更新）は、次のことを説明しています。</p>
<ul><li>訓練生からエアラインの機長まで、経験の違う多くの操縦者が同じ空港を使います。空港の周りは鳥が多く、バードストライクに注意します。</li>
<li>滑走路は 9L/27R・9C/27C・9R/27L の平行な 3 本（進入端の位置がずれている）と、交差する 18/36 です。<b>違う滑走路に並んでしまう</b>危険が大きい空港です。目で見る進入も、計器進入や GPS で確かめます。</li>
<li><b>Hot Spot HS1</b>：誘導路 C と滑走路 27C の標示が取り違えられやすい場所です。滑走路 18 に着陸した機が、誘導路 C へ右に曲がるはずが、滑走路 27C へ右に曲がってしまう誤進入が起きています。9L/27R に着陸して 18 に出るよう言われた機も同じです。迷ったら、止まるか進むかを管制官に確かめます。</li>
<li>滑走路の標示は白、離着陸に使わない所（誘導路の標示など）は黄色です。</li>
<li>9L/27R はおもな運用の滑走路、9R/27L はおもな飛行訓練の滑走路です。</li>
<li><b>滑走路の指定・誘導路・hold short の指示は、コールサインを付けて、同じ送信の中で復唱（readback）</b>します。足りなければ、周波数にほかの機がいなくても言い直しを求められます。</li>
<li>Line Up and Wait を使います。離陸の許可ではありません（{ch:radio3}）。</li>
<li>訓練の場周では、upwind・crosswind・base をそれぞれ約 1 マイルで飛びます。</li>
<li>ソロのときは、そう伝えます。LAHSO（着陸して、交差する滑走路などの手前で止まる許可）が出ることがあります。学生操縦士（student pilot）は LAHSO を受けないことになっているので、“unable” と伝えます（AIM 4-3-11）。</li>
<li>管制塔の運用は 6:30〜23:00（現地時間）です。空域は Class C で、その上に Orlando の Class B があります（{ch:law}）。</li></ul>
<p>管制塔が閉まっている時間は、CTAF で自己通報します（周波数は Chart Supplement で確かめる）。図の配置は FAA の空港データ（2026 年 10 月）によるものです。同じデータでは、滑走路の長さは 9L/27R が 11,002 ft、9C/27C が 3,578 ft、9R/27L が 5,839 ft、18/36 が 6,002 ft です。場周は、9L/27R が北側で、9L は左回り・27R は右回りです。9R/27L と 9C/27C は南側で、9R・9C は右回り、27L・27C は左回りです。18/36 は東側で、18 は左回り・36 は右回りです。</p>
${bk.key('平行な滑走路では L・C・R まで復唱し、入る前に標識と方位で確かめる', 'HS1：滑走路 18 から誘導路 C へ出るとき、27C と取り違えない', '学生操縦士は LAHSO を受けない（unable）')}
${bk.sim('課目「英語交信③：復唱と応答」の場面には、Sanford の場面も入っています。', ['k5', '英語交信③：復唱と応答'])}` },
      { id: 'comm.icao', t: 'FAA と ICAO（英国）の言い方の違い', scope: 'us', h: () => `
${bk.aim('米国（FAA）と英国（ICAO に沿った言い方）で、違う言葉と同じ言葉を知っておきます。')}
<p>米国と英国では、同じことを違う言葉で言う所があります。たとえば、高度計（気圧高度計、altimeter）に合わせる値です。米国では高度計規正値（アルティメターセッティング、altimeter setting）として、inHg で言います。英国では QNH（QNH）として、hPa で言います。</p>
<p>公開情報では、ANA の座学はロンドンで英語で行い、航空管制通信のシミュレーションもあります。英国の無線の言い方は ICAO に沿った英国の手引き（CAA の <b>CAP 413</b>）にまとめられています。米国（FAA）の言い方と違うところがあるので、両方を知っておくと混乱しません（どちらで教わるかは<span class="tag unk">推測・要確認</span>）。代表的な例：</p>
<table class="bk-t"><tr><th></th><th>FAA（米国：AIM・PCG）</th><th>ICAO・英国（CAP 413）</th><th class="jur-jp">日本</th></tr>
<tr><td>小数点</td><td>point（one two one point seven）</td><td>decimal（one two one decimal seven。AIM 4-2-8 の注記にも）</td><td class="jur-jp">—</td></tr>
<tr><td>高度計の値</td><td>altimeter two niner niner two（inHg）</td><td>QNH one zero one three（hPa）</td><td class="jur-jp">—</td></tr>
<tr><td>フライトレベルに変わる高度</td><td>18,000 ft（全国共通）</td><td>空域ごとに決められていて、米国よりずっと低い（英国の AIP で確かめる）</td><td class="jur-jp">—</td></tr>
<tr><td>はい</td><td>affirmative</td><td>affirm</td>${jpCell('words', 3)}</tr>
<tr><td>確かめてください</td><td>verify</td><td>confirm</td></tr>
<tr><td>滑走路の手前で止まる所</td><td>hold short of runway …</td><td>ふつうは holding point（taxi holding point runway …）。hold short は、決まった停止位置がないときや、限界を強めるときだけ</td></tr>
<tr><td>「どうぞ話して」</td><td>go ahead</td><td>pass your message</td><td class="jur-jp">—</td></tr>
<tr><td>滑走路に入って待つ</td><td>line up and wait</td><td>line up and wait（理由を添える）、または line up だけ。「着陸機のあとに line up」という条件つきの言い方もある</td><td class="jur-jp">—</td></tr>
<tr><td>必ず復唱するもの</td><td>高度・高度の制限・針路・滑走路の指定。地上では滑走路に関わる許可と hold short。周波数とコードは必須でない（AIM 4-4-7・4-3-18）</td><td>地上滑走の指示・高度・針路・速度・経路・進入の許可・滑走路に関わる許可・トランスポンダーの指示・高度計の値・周波数の変更など（CAP 413 2.69）</td>${jpCell('readback')}</tr>
<tr><td>復唱が違っていたとき</td><td>管制官が、復唱が正しいかを確かめる（JO 7110.65 2-4-3）</td><td>管制官が “negative” と言い、正しい内容を言い直す（CAP 413 2.71）</td><td class="jur-jp">—</td></tr></table>
<p class="small mute jur-jp">日本の列は、この本の日米の対照データ（言い方・復唱の範囲）から描いています。「—」の所は、まだ確かめていません。</p>
<p>どちらでも共通なのは、フォネティックアルファベット、数字の発音（niner など）、MAYDAY・PAN-PAN です。PAN-PAN のつづりは、米国が PAN-PAN、英国が PAN PAN です。復唱の考え方も同じですが、必ず復唱する項目は英国の方が多くあります（表の下から 2 行目）。</p>
${bk.key('point ↔ decimal、altimeter（inHg）↔ QNH（hPa）、affirmative ↔ affirm', '英国では hold short をあまり使わず、holding point を使う', '必ず復唱する項目は英国の方が多い。どちらで飛ぶかで言い方を切り替える')}
${bk.jur('words')}` },
      { id: 'comm.practice', t: '上達の練習法', scope: 'us', h: () => `
${bk.aim('英語の交信を、地上で、ひとりで上達させる方法をまとめます。')}
<ol><li><b>型を覚える</b>：最初の呼び出し（{ch:radio3}）と、1 回の飛行の交信（{ch:radio4}）を、表を見ずに言えるようにします。</li>
<li><b>声に出す</b>：台本を音声に合わせて言います。次にパイロットの言葉を隠し、自分で言ってから答えを見ます。</li>
<li><b>数字を書き取る</b>：周波数・高度・針路・コードを聞いて、ひざ板の記号で書く練習をします。書き方は {ch:radio1}、数字の言い方は {ch:radio2} にあります。</li>
<li><b>本物を聞く</b>：インターネットで公開されている管制交信のライブ配信（例：LiveATC.net）を聞きます。空港の図とチャートを見ながら聞くと、どこの話かがわかります。</li>
<li><b>チェアフライング</b>：椅子に座り、1 回の飛行の交信と操作を、最初から最後まで声に出してたどります。</li></ol>
${bk.key('型を覚え、声に出し、数字を書く', '本物の交信を、図とチャートを見ながら聞く', '椅子に座って、1 回の飛行を声に出してたどる')}
${bk.sim('課目「英語交信②」で 1 回の飛行の交信を通して聞き、「英語交信④」で音声の聞き取りを練習できます。チェアフライングと、この教材を使った練習の組み立ては {ch:sim} にあります。', ['k4', '英語交信②：1 回の飛行'], ['k6', '英語交信④：聞き取り'])}` },
    ],
    terms: [['CTAF (Common Traffic Advisory Frequency)', '共通交通情報周波数', 'AIM 4-1-9'], ['UNICOM', '政府のものではない空港の無線局', 'PCG'], ['MULTICOM 122.9', '地上局のない空港の自己通報の周波数', 'AIM 4-1-9'], ['Self-announce', '自己通報（返事を期待しない通報）', 'AIM 4-1-9'], ['Traffic pattern altitude', '場周高度（プロペラ機は地上 1,000 ft）', 'AIM 4-3-3'], ['Straight-in', '直進着陸', 'AIM 4-1-9'], ['Squawk / Ident', 'コードを入れよ / IDENT を押せ', 'AIM 4-1-20'], ['ADS-B Out', '位置を自分から送る装置', '14 CFR 91.225'], ['Mayday / Pan-pan', '遭難通信 / 緊急通信', 'AIM 6-3-1。英国のつづりは PAN PAN'], ['Fuel remaining', '残りの燃料（分で言う）', 'AIM 6-3-2'], ['121.5 MHz', '緊急の周波数', ''], ['Any station', '聞いているどの局でも', 'AIM 6-3-1'], ['Light gun signals', '灯火信号', '14 CFR 91.125'], ['Hot spot', '衝突や滑走路への誤進入の危険が起きてきた、特に注意する場所', 'PCG'], ['LAHSO', '着陸して、交差する滑走路・誘導路などの手前で止まる許可（学生は受けない）', 'AIM 4-3-11'], ['QNH / Affirm / Pass your message', 'ICAO・英国の言い方', 'CAP 413'], ['CAP 413', '英国の無線電話の手引き', 'UK CAA'], ['Conspicuity code', '英国で VFR の機が使うコード 7000 など', 'CAP 413']],
    examples: ['管制塔のない空港へ 10 マイル：“Lakeside traffic, Archer Seven Lima Alpha, one zero miles northeast, two thousand five hundred, descending, Lakeside.”（AIM 4-1-9 の型。空港名とコールサインは架空）', '無線が聞こえない → 操作を確かめる → 7600 → 空港の外側で使っている滑走路を見きわめ、管制塔に「機種・位置・高度・着陸したい・灯火信号で管制してほしい」と送信 → 3〜5 マイルで位置を送信して場周に入り、管制塔の緑の連続光で着陸。昼は翼を振って応える。', 'コードを 2700 から 7200 に変える → 2700 → 2200 → 7200（7700 を通らない。AIM 4-1-20）。'],
    cautions: ['Lakeside 空港は架空です。実際の空港の周波数と手順は、Chart Supplement で確かめてください。', 'Sanford の情報は 2026 年の FAA の資料によります。変わることがあるので、飛ぶ前に最新の資料・NOTAM・管制官の指示で確かめてください。', '英国・ICAO の言い方は代表的な例だけです。詳しくは CAP 413 など、その国の公式の資料で確かめてください。'],
    quiz: [
      { q: '管制塔のない空港での自己通報で、AIM が勧めていないものは？', choices: ['空港の名前を最初と最後に言う', '滑走路の番号を言う', '“Traffic in the area, please advise” と言う', '10 マイル手前で位置を知らせる'], answer: 2, why: 'AIM 4-1-9：“Traffic in the area, please advise” は決まった言い方ではなく、使わない。' },
      { q: 'AIM 6-1-2 が「少なくとも緊急の状態」とする時点は？', choices: ['エンジンが止まったとき', '位置・燃料・天気などに不安を感じた時点', '着陸できないとき', '管制に言われたとき'], answer: 1, why: '不安を感じた時点で助けを求める。危険になってからでは遅い（AIM 6-1-2）。' },
      { q: 'VFR の天気で、無線がまったく使えなくなった。正しい対応は？', choices: ['7700 にして雲の中を急ぐ', '7600 にし、VFR のまま飛んで、適した空港に早めに着陸する', 'そのまま予定どおり 2 時間飛ぶ', 'トランスポンダーを切る'], answer: 1, why: 'AIM 6-4-2：無線の故障は 7600。VFR の天気なら VFR を続けて、無理のない範囲で早めに（as soon as practicable）着陸する（IFR の規則 14 CFR 91.185(b) と同じ考え方。AIM 6-4-1）。' },
      { q: '飛行中、管制塔から緑の点滅の灯火信号。意味は？', choices: ['着陸してよい', '着陸のために戻れ（あとで緑の連続）', '空港は危険', '旋回を続けよ'], answer: 1, why: '14 CFR 91.125・AIM 4-3-13：飛行中の緑の点滅は「戻れ」。着陸の許可は緑の連続。地上の緑の点滅は「タキシーしてよい」。' },
      { q: 'PAN-PAN の通報で、残りの燃料はどう言う？', choices: ['時間で（one hour）', '分で（six zero minutes）', 'ガロンで', 'ポンドで'], answer: 1, why: 'AIM 6-3-2 と PCG（Fuel remaining）：残りの燃料は、分で言う。' },
      { q: 'コードを 2700 から 7200 に変える。AIM が勧める順は？', choices: ['2700 → 7700 → 7200', '2700 → 7500 → 7200', '2700 → 2200 → 7200', '2700 → 7600 → 7200'], answer: 2, why: 'AIM 4-1-20：7500・7600・7700 を途中で通ると、地上の設備で警報が出てしまう（トランスポンダーとコード）。' },
    ],
    written: [
      ['VFR の天気で、送信も受信もできなくなりました。管制塔のある空港に降りるまでの順番を説明してください。', `まず、音量・周波数・MIC の選択などの操作の誤りを確かめます。直らなければトランスポンダーを 7600 にし、VFR を保ちます。空港の地表区域の外か上で、使われている滑走路と流れを見きわめてから場周に入り、管制塔の灯火信号を見ます。緑の連続光で着陸し、昼は翼を振って応えます。${bk.see('comm.nordo', '無線が使えないとき・灯火信号')}`],
      ['MAYDAY と PAN-PAN の違いを説明してください。通報で、残りの燃料はどう言いますか。', `MAYDAY は、重大で差し迫った危険があり、すぐに助けが要る遭難のときです。PAN-PAN は、すぐではないが安全に関わる緊急のときです。どちらも 3 回言います。残りの燃料は、分で言います（例：six zero minutes）。${bk.see('comm.mayday', 'MAYDAY と PAN-PAN：助けを求める')}`],
      ['管制塔のない空港で自己通報するときの決まりを、3 つ挙げてください。', `空港の名前を最初と最後に言う、“active runway” でなく滑走路の番号を言う、“Traffic in the area, please advise” は使わない、の 3 つです。到着は 10 マイル手前から、ダウンウインド・ベース・ファイナルでも位置を言います。${bk.see('comm.ctaf', '管制塔のない空港：CTAF で自己通報')}`],
    ],
    refs: [R.aim41, R.aim43, R.aim42, R.aim61, R.aim62, R.aim63, R.aim64, R.cfr91, R.sfb, R.sfbData, R.cap413, R.pcg, R.ana1], lessons: ['e3', 't2'] });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
