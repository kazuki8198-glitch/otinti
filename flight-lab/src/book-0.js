// FLIGHT LAB — book-0.js : the front part, 序部「出発の前に（日本で準備する）」 (textbook/rewrite/combined/DESIGN.md 3.1・3.3).
// This file adds the part p0 in front of Part 1 (FL.book.addPart: a part is added by the file of its chapters, so no
// product has a part it does not read). It is not called 第 0 部: the syllabus's stages are numbered from 第 1 段階 (the
// ground school, Part 1), and 0 must not name two things (DESIGN 3.1, decision 8).
// The part's chapters, in this order: 'intro' (book-1.js, the book's first chapter: moved here by W09, DESIGN 6.2 rule 2,
// its id unchanged), the front part's new chapters written in this file ('basics', then 'english': W10, each put in with
// before: 'aero', so after 'intro' in this order) and 'sim' (book-5.js, put in front of 'aero' later, so that it closes
// the front part). Loaded after book-1.js (its chapters go in front of 'aero') and before book-5.js; all three products
// read it (CADET leaves the chapters 'intro', 'english' and 'sim' out of its book and shows 'basics': DESIGN 6.3).
(function (FL) {
  'use strict';
  const B = FL.book, R = B.R, bk = B.bk, FIG = FL.bookFigs;
  B.addPart({ id: 'p0', title: '序部　出発の前に（日本で準備する）', before: 'p1' });

  // ======================================================================= 序部 第 2 章 basics「飛行の基本量」
  // DESIGN 3.3 序部 chapter 2 and Appendix A (basics.alt). Written by W10 and revised by revise-basics after the fact check
  // and the beginner's two reads; registered in R1 P5 (the draft and its record: textbook/rewrite/combined/drafts/basics.js,
  // reports/W10-basics.md・factcheck-basics.md・reader-basics.md・revise-basics.md).
  //  - built from the basic course chapter 0 (kiso00.01・02・07〜16) plus kiso09.8 and kiso12.1 (basics.rules), rewritten
  //    in the textbook's voice (no sentence copied; `from` on every section), and the new material DESIGN 3.3 asks for
  //    (EST/EDT, inHg・SM・US gal・°F, the training flight, the Sanford case). The basic course's known errors are fixed
  //    here: K.overview.K2 (the three layers of 機長: basics.crew), K3 (inHg: basics.units), K4 (TAS 100 kt: basics.speed);
  //  - the US–Japan boxes are the four FL.jur gives these sections (alt.unit: basics.units, time: basics.time,
  //    alt.transition: basics.alt, ir.need: basics.rules), drawn from FL.jur; the US rules are in bk.us or a sentence that
  //    says 米国の, the Japanese articles only in bk.jp (CADET shows this chapter with the Japanese side left out);
  //  - basics.alt has the basic course's photo ch00-photo5 (Mt Fuji from an airliner: MSL and AGL), from book-photos-k.js
  //    (W22: the file byte for byte, its caption rewritten), placed after the 考えてみよう as in the draft (R2 integration);
  //  - the 説明してみよう rewritten from the basic course's written questions carry their from (kiso00.qN: PROVENANCE);
  //  - every claim (a number with a unit, an article, a rule) is in the ledger CLAIMS.json (from drafts/basics.claims.json).
  B.add({ id: 'basics', part: 'p0', before: 'aero', t: '飛行の基本量', en: 'Basic quantities of flight: the flight, the crew, units, time, speed, altitude and flight rules',
    summary: '一便と訓練の 1 回のフライトの流れ、職位・機長・PF と PM の違い、単位と換算、時刻と方位、速度の種類と風、高度の種類と高度計、飛行方式と気象状態、資料の確かめ方。数字を「何の・どの基準の値か」と一緒に受け渡す習慣を作ります。',
    secs: [
      // ------------------------------------------------------------------ 1
      { id: 'basics.flight', t: '一便の流れと、訓練の 1 回のフライト（予告）', scope: 'common', from: ['kiso00.01'], use: ['まとめ 1・まとめ 2'], h: () => `
${bk.aim('一便は、出発前・地上滑走（タキシー、taxi）と離陸（takeoff）・上昇と巡航・降下と進入・着陸と到着後の段階を通ります。段階ごとに何を確かめるかを知ると、あとの章で学ぶことの置き場所が見えます。')}
${FIG.basicsFlight()}
<p>巡航（cruise）は、決めた高度を保って目的地へ向かう段階です。進入（approach）は、着陸する滑走路へ向かって降りていく段階です。</p>
<p>パイロットの仕事は、出発前に立てた計画を、飛んでいる間も確かめ続けることです。天気も交通も変わるので、段階ごとに見る情報と忙しさが変わります。</p>
${bk.t(['段階', '主に確かめること'], [
  ['出発前', '天気・経路・機体の状態・積む重さ・燃料・うまくいかないときの案'],
  ['地上滑走と離陸', 'いまいる位置・管制の許可・周りの飛行機・機体の設定'],
  ['上昇（climb）と巡航', '経路・速度・高度・機体の状態・残りの燃料・天気'],
  ['降下（descent）と進入', '到着地の情報・進入のしかた・機体の設定・着陸復行（ゴーアラウンド、go-around：着陸をやめて上昇し、やり直すこと）の計画'],
  ['着陸（landing）と到着後', '滑走路と誘導路（taxiway：地上滑走のための道）の状況・駐機・機体の状態・記録'],
])}
<p>着陸できないと分かってから考えると、時間も高さも足りません。だから、降下と進入の前に、やり直すときの向き・高さ・機体の設定を決めておきます。</p>
<p>計画どおりにいかないときは、待つ・経路を変える・行き先を変える・出発をやめる、などの案を比べます。段階が変わるたびに、計画をこのまま続けてよいかを考え直します。</p>
<h4>訓練のフライトの流れ（全体の順番）</h4>
<p>訓練のフライトも、同じ流れです。その前と後に、操縦教員（教官、flight instructor）との時間が加わります。</p>
<ol><li><b>ブリーフィング（briefing）</b>：その日の課目・目標・天気・注意を、操縦教員と確かめます。</li>
<li><b>書類・天気・ノータム（NOTAM：施設の状態など、一時的な変更の知らせ）を確かめる</b>：飛んでよい機体か、飛んでよい天気かを見ます。</li>
<li><b>外部点検（飛行前点検、preflight inspection）</b>：チェックリスト（checklist）を使って、機体を外から確かめます。</li>
<li><b>エンジン始動・地上滑走・離陸</b>のあと、決めた空域で課目を練習します。</li>
<li><b>帰って着陸し、駐機します。</b></li>
<li><b>デブリーフィング（debriefing）</b>：できたことと直すことを、操縦教員とふり返ります。飛んだ記録を、ログブック（飛行の記録）に書きます。</li></ol>
<p>1 つずつの手順は、第 2 部の章でくわしく学びます。ここでは、全体の順番だけを覚えておきます。</p>
${bk.key('一便は「出発前 → 地上滑走と離陸 → 上昇と巡航 → 降下と進入 → 着陸と到着後」', '段階ごとに、確かめる情報と忙しさが変わる', '訓練のフライトは、ブリーフィングで始まりデブリーフィングで終わる')}
${bk.warn('<b>ここに注意：</b>表の項目は、考え方の例です。実際に確かめることは、その機体のチェックリストと学校の手順で決まります。')}
${bk.q('降下と進入の段階で、着陸をやめてやり直すときの計画を確かめておくのはなぜ？', '着陸できないと分かってから考えると、時間も高さも足りないからです。進入の前に、やり直すときの向き・高さ・機体の設定を決めておきます。')}` },

      // ------------------------------------------------------------------ 2
      { id: 'basics.crew', t: '職位・機長（PIC）・PF と PM', scope: 'common', from: ['kiso00.02'], use: ['まとめ 1・まとめ 6'], h: () => `
${bk.aim('操縦士の呼び方には、3 つの層があります。キャプテン（captain）や副操縦士は職位、機長（PIC：pilot in command）は法令上の役割です。PF（pilot flying）と PM（pilot monitoring）は操作の役割です。3 つを分けて言えるようにします。')}
${FIG.basicsCrew()}
<h4>3 つの層</h4>
<ul><li><b>職位</b>は、会社の中の立場です。エアラインのキャプテンと副操縦士（first officer）がこれです。</li>
<li><b>機長（PIC：pilot in command）</b>は、その飛行の運航と安全に、最終の権限と責任を持つ人です。ふつうは飛ぶ前に、誰が機長かを決めます。</li>
<li><b>PF（飛行経路を管理する操縦士、pilot flying）</b>は、いまの飛行経路を操る人です。<b>PM（監視する操縦士、pilot monitoring）</b>は、機体の状態と経路を監視します。期待した経路・高度・速度からのずれは、決まった言葉で声に出して知らせ（コール、callout）、要るときは介入します。</li></ul>
<p>日本語では、会社の職位も「機長」と呼びます（例：副操縦士から機長に昇格する）。この本では、職位をキャプテン、その飛行の法令上の役割を機長（PIC）と書き分けます。</p>
<p>エアラインでは、ふつうキャプテンが機長を務めます。それでも、副操縦士が PF、キャプテンが PM を受け持つ区間があります。3 つは別々に決まります。</p>
<p>訓練でひとりで飛ぶ単独飛行（ソロ、solo flight）のときは、機長も PF も自分です。操縦教員と一緒に飛ぶときは、ふつう操縦教員が機長です。誰が機長か、PF と PM をどう分けるかは、飛ぶ前に学校の決まりで確かめます。</p>
<p>自動操縦装置（オートパイロット、autopilot）で飛んでいるときも、PF は飛行経路の管理から離れません。PM は、期待した動きと実際の動きの違いを見つけて、声で伝えます。</p>
<h4>運航を支える人たち</h4>
<p>管制（ATC：air traffic control）は、空の交通の順番と間隔を整え、情報を出します。運航管理（ディスパッチ、dispatch）は、機長と一緒に飛行の計画を作り、飛んでいる間も便の進み具合を見守ります。整備（maintenance）は、機体の状態を確かめて直します。客室乗務員（flight attendant）は、客室の安全を受け持ちます。誰に何を確かめるかを知っておくと、判断が速く正確になります。</p>
<h4>最初から身に付ける確認の習慣</h4>
<ul><li>数字・単位・対象・いつやるかがあいまいなら、聞き直します。</li>
<li>相手の職位にかかわらず、大事な食い違いは早く言います。</li>
<li>自分の理解と相手の理解が同じかを、復唱（readback）で確かめます。</li></ul>
${bk.key('職位・機長（PIC）・PF と PM は、別々に決まる', '機長は、その飛行の最終の権限と責任を持つ人', 'PF は経路を管理し、PM は監視してずれを声で伝える', '単独飛行では、機長も PF も自分')}
${bk.warn('<b>ここに注意：</b>PF と PM の細かい分担は、会社と機種の標準運航手順（SOP：standard operating procedures）で決まります。訓練校では、学校の手順に従います。')}
${bk.us('<p>米国の 14 CFR 1.1 は、機長を「飛行の運航と安全に最終の権限と責任を持ち、飛ぶ前か飛行中に機長に指名された人」と定めています。この定義には、その飛行に要る資格を持つこと、という条件もあります。米国の 14 CFR 91.3 は、機長がその航空機の運航に直接の責任を持ち、最終の権限を持つと定めています。</p>')}
${bk.jp('<p>日本の航空法第 73 条は、機長が、その航空機に乗り組んで職務を行う者を指揮監督すると定めています。法の「機長」は、飛行ごとの役割です。会社の職位の「機長」と、どちらの意味かを区別して読みます。</p>')}
${bk.q('副操縦士が PF を受け持っている区間で、機長は誰？', 'ふつうはキャプテンのままです。PF と PM は操作の役割で、誰が機長かは別に決まっています。PF を交代しても、機長は替わりません。')}
<p>PF と PM の具体的なコールと介入は ${bk.see('crm.pm', '予告：PF と PM（第 6 部）')}、機長の責任の米国の規則は ${bk.see('law.pic', '予告：機長の責任と飛行前の準備（第 1 部）')} で学びます。</p>` },

      // ------------------------------------------------------------------ 3
      { id: 'basics.units', t: '単位と換算', scope: 'common', from: ['kiso00.07'], use: ['まとめ 1', 'JCAB 航空工学・空中航法'], jcab: ['ppl.1.1.1.1', 'cpl.1.1.1.1'], h: () => `
${bk.aim('航空で使う距離・速さ・高さ・気圧などの単位を知り、換算できるようにします。計算の前に単位をそろえる習慣を作ります。')}
${FIG.basicsUnits()}
<p>航空では、距離を海里（NM：nautical mile）、速さをノット（kt：knot）、高さをフィート（ft：foot）で表すのが基本です。距離と速さは、NM と kt のように組になる単位で計算します。下の換算は、米国の国立標準技術研究所（NIST）の換算係数によります。</p>
${bk.t(['量', '単位', '換算と意味'], [
  ['水平の距離', 'NM（海里）', '1 NM ＝ 1,852 m'],
  ['速さ', 'kt（ノット）', '1 kt ＝ 1 NM/h ＝ 1.852 km/h'],
  ['高さ', 'ft（フィート）', '1 ft ＝ 0.3048 m'],
  ['視程（visibility：目立つ物を見分けられる距離。米国）', '法定マイル（SM：statute mile）', '1 SM ＝ 5,280 ft ≈ 1.609 km'],
  ['昇降率（vertical speed）', 'ft/min（fpm：feet per minute）', '1 分あたりの高さの変化'],
  ['重さ', 'lb（ポンド）・kg', '1 lb ＝ 0.45359237 kg'],
  ['燃料の量', 'US gal（米ガロン）・L', '1 US gal ≈ 3.785 L'],
  ['気圧', 'inHg（インチ水銀柱。水銀の柱の高さで表す）・hPa', '1 inHg ≈ 33.86 hPa'],
  ['気温', '℃・°F', '℃ ＝（°F − 32）÷ 1.8、°F ＝ ℃ × 1.8 ＋ 32'],
])}
<h4>換算の例</h4>
<p>90 kt は、90 × 1.852 ＝ 166.68 km/h です。2,000 ft は、2,000 × 0.3048 ＝ 609.6 m です。換算しても、飛行機の状態は変わりません。同じ量を別の物差しで言い直しただけです。</p>
<p>計算の基準にする約束の大気を、国際標準大気（標準大気、International Standard Atmosphere）といいます。高さによって気圧と気温がどう変わるかを決めたもので、くわしくは ${bk.see('wx.atm', '予告：大気・気圧・気温（第 1 部）')} で学びます。国際標準大気の海面の気圧は 29.92 inHg（1013.25 hPa）です。海面の気温は 15℃ で、15 × 1.8 ＋ 32 ＝ 59°F です。</p>
<p>昇降率 700 ft/min で 3 分上昇すると、高さは 700 × 3 ＝ 2,100 ft 変わります。昇降率・始めの高度・着いた高度は、別の数です。始めの高度が分からなければ、着いた高度は決まりません。</p>
<h4>米国で会う単位</h4>
<p>米国では、視程を SM で、距離と速さを NM と kt で言います。対気速度計（速度計、airspeed indicator）の目盛りは、kt のもの・mph のもの・両方のものがあります。mph（miles per hour）は、1 時間に何 SM 進むかを表します。1 kt は約 1.15 mph です。速度計を見たら、まず単位を確かめます。燃料は US gal で量り、重さの計算は lb で行います。</p>
<h4>気圧の単位と規正値</h4>
<p>高度計（altimeter）は、知らされた気圧の値に合わせて使います。この値が高度計規正値（アルティメターセッティング、altimeter setting）です。空港などで測った気圧を、そのまま知らせるのではありません。海面の高さでの値に直して知らせます。なぜ直すのかは ${bk.see('basics.alt', '高度の種類と高度計の基準')} で学びます。</p>
<p>METAR（英語も METAR：aviation routine weather report）は、空港の天気を、決まった時刻ごとに観測して知らせる報告です。飛行場情報放送（ATIS：automatic terminal information service）は、空港の情報を録音して、くり返し流す放送です。規正値は、どちらでも知らされます。</p>
<p>METAR の中で規正値を書く欄は、hPa なら Q 群、inHg なら A 群です。Q1014 は 1014 hPa、A2997 は 29.97 inHg です。米国の METAR は A 群で書きます。日本の METAR は Q 群で書きます。国内だけに送る国内記事（RMK：remarks。METAR の最後に付ける欄）には、A 群も書きます（気象庁の航空気象通報式）。</p>
<p>日本の管制と ATIS が規正値をどの単位で言うかは、まだ確かめていません（下の日米の対照の〔要確認〕）。</p>
<h4>丸め方</h4>
<p>表の「＝」の値は、定義で決まった正確な値です（1 NM ＝ 1,852 m、1 ft ＝ 0.3048 m、1 lb ＝ 0.45359237 kg など）。「≈」の値は、けたを丸めて書いた値です。計算の途中ではけたを多めに残し、答えを使う場面に合わせて、最後に丸めます。たとえば 166.68 km/h は、約 167 km/h です。</p>
${bk.key('計算の前に単位をそろえる（NM と kt、ft と ft/min）', '1 NM ＝ 1,852 m、1 kt ＝ 1.852 km/h、1 ft ＝ 0.3048 m', '気圧は inHg と hPa。29.92 inHg は約 1013.2 hPa')}
${bk.warn('<b>よくある間違い：</b>SM と NM を取り違えることと、単位をそろえずに割ることです。60（km）を 120（kt）でそのまま割っても、正しい時間は出ません。先に km を NM に直してから、kt で割ります。60 km は約 32.4 NM なので、120 kt なら約 16 分です。')}
${bk.jur('alt.unit')}
${bk.q('100 kt は、1 時間に何 km 進む速さ？', '100 × 1.852 ＝ 185.2 km/h です。1 kt は 1 時間に 1 NM 進む速さで、1 NM は 1,852 m だからです。')}` },

      // ------------------------------------------------------------------ 4
      { id: 'basics.time', t: '時刻と方位', scope: 'common', from: ['kiso00.08'], use: ['まとめ 1', 'JCAB 空中航法'], jcab: ['ppl.3.1.1.2', 'cpl.3.1.1.2'], h: () => `
${bk.aim('航空の時刻は、世界で 1 つの基準の時刻で書きます。現地の時刻と、日付まで正しく換算できるようにします。方位の基準の真北（true north）と磁北（magnetic north）も区別します。')}
${FIG.basicsTime()}
<p>航空では、時刻を 24 時間制で書きます。午前 9 時は 0900、午後 1 時は 1300 です。管制の指示・気象の報告・到着の予定の時刻は、どれもこの書き方です。この本では、UTC は 1400Z のようにコロンなしで、現地の時刻は 10:00 EDT のようにコロンを付けて書き分けます。</p>
<p>国をまたいで飛んでも混乱しないように、<b>協定世界時（UTC：Coordinated Universal Time）</b>を使います。英国のグリニッジを通る経度（longitude）0° の線の時刻を基準にしたもので、Z を付けて 1400Z のように書きます。無線で文字を伝える言い方では、Z を Zulu（読みはズールー）と言います。英語では、1400Z を one four zero zero Zulu と 1 けたずつ読みます（${bk.see('comm.numbers', '予告：数字の言い方（第 1 部）')}）。</p>
<h4>現地の時刻との換算</h4>
<p>Sanford のあるフロリダ中部は、米国の東部時間です。冬は、東部標準時（EST：Eastern Standard Time）を使います。夏は、時計を 1 時間進める夏時間（daylight saving time）にして、東部夏時間（EDT：Eastern Daylight Time）を使います。日本は、日本標準時（JST：Japan Standard Time）です。</p>
<p>現地の時刻と UTC の差を、時差といいます。EST は UTC−5、EDT は UTC−4、JST は UTC＋9 です。</p>
${bk.f('UTC ＝ 現地の時刻 − 時差（EDT は −4、JST は ＋9）')}
<p>EDT（UTC−4）なら、4 時間を足すと UTC になります。JST（UTC＋9）なら、9 時間を引くと UTC になります。UTC から現地の時刻に直すときは、その逆にします。</p>
${bk.t(['元の時刻', '換算先', '答え'], [
  ['4 月 10 日 09:00 JST', 'UTC', '4 月 10 日 0000Z'],
  ['4 月 10 日 07:30 JST', 'UTC', '4 月 9 日 2230Z'],
  ['4 月 9 日 1800Z', 'JST', '4 月 10 日 03:00 JST'],
  ['7 月 1 日 10:00 EDT', 'UTC', '7 月 1 日 1400Z'],
  ['1 月 15 日 21:00 EST', 'UTC', '1 月 16 日 0200Z'],
])}
<p>いちばん間違えやすいのは、日付をまたぐ換算です。時刻と日付は、いつも組で書きます。夏と冬で時差が変わる国では、その日が夏時間かも確かめます。</p>
<h4>方位の基準</h4>
<p>方位は、北を 000°（360°）として、時計回りに測ります。東は 090°、南は 180°、西は 270° です。</p>
<p>北には、地図の北（真北）と、磁気コンパス（コンパス、magnetic compass）が指す北（磁北）があります。真北から測った向きが真方位（true direction）、磁北から測った向きが磁方位（magnetic direction）です。2 つの差を偏差（磁気偏差、magnetic variation）といい、場所と年で変わります。</p>
<p>機体のコンパスには、機体の電流や磁気を帯びた部品の影響で生じる、その機体だけの誤差もあります。これを自差（deviation）といいます。</p>
<p>どの情報がどちらの北で書かれているかは、決まっています。米国の決まりでは、次のとおりです。</p>
${bk.t(['情報', '北の基準'], [
  ['METAR・飛行場予報（TAF：terminal aerodrome forecast）の風、上空の風の予報', '真北'],
  ['ATIS などの声の放送の風、管制塔が言う風', '磁北'],
  ['滑走路の番号', '磁北（滑走路の向きの磁方位を 10° 単位に丸め、最後の 0 を取った数。183° なら 18。滑走路 27 は、磁方位で約 270° の向き）'],
  ['航空図に引いた線の向き', '真北（地図の経線から測る）'],
])}
<p>風向は、風が<b>吹いて来る</b>向きです。風向 360° の北風は、北から南へ吹く風です。</p>
${bk.key('時刻は UTC（Z）で書き、現地の時刻とは日付も一緒に換算する', 'UTC は現地の時刻から時差を引く。EDT は 4 時間足し、JST は 9 時間引く', '方位は北を 000° として時計回り。真北と磁北を区別する', '風向は吹いて来る向き。METAR の風は真北、ATIS の風は磁北（米国）')}
${bk.warn('<b>ここに注意：</b>偏差は場所と年で変わります。航法の計算では、その場所の新しい値を航空図で確かめます。')}
${bk.jur('time')}
${bk.q('Sanford で 7 月 3 日 20:30 EDT は、UTC で何日の何時？', 'EDT に 4 時間を足して、7 月 4 日 0030Z です。日付が 1 日進むことに気をつけます。')}` },

      // ------------------------------------------------------------------ 5
      { id: 'basics.speed', t: '速度の種類・風のベクトル・距離と時間', scope: 'common', from: ['kiso00.09', 'kiso00.10', 'kiso00.11'], use: ['課目 k1', 'まとめ 1', 'JCAB 航空工学・空中航法'], jcab: ['ppl.1.1.1.2', 'cpl.1.1.1.2'], h: () => `
${bk.aim('速度は「何に対する速さか」で区別します。速度計の値・空気に対する速さ・地面に対する速さを使い分け、風のある日の所要時間を計算できるようにします。')}
${FIG.basicsSpeedChain()}
<p>速度には、何を基準に測ったかの違いがあります。まず、次の 3 つを区別します。</p>
<ul><li><b>指示対気速度（IAS：indicated airspeed）</b>は、速度計が示す値です。機体の手引書に書かれた離陸・着陸・失速（stall）の速度は IAS で、ふつう高度や気温では変わりません。失速は、翼の上をなめらかに流れていた空気がはがれて、揚力（lift）を急に失う状態です。速度がなくなることではありません（${bk.see('aero.stall', '予告：失速（第 1 部）')}）。</li>
<li><b>真対気速度（TAS：true airspeed）</b>は、空気に対する本当の速さです。速度計は、正面からぶつかる空気の圧力と、まわりの空気の圧力の差で速さを示します。空気が薄い高い所では、同じ差になるまで速く飛ぶので、同じ IAS でも TAS が大きくなります。飛ぶ前の計画では、TAS に予報の風を足して GS を出し、その GS で時間を求めます（GS はすぐ下で説明します）。</li>
<li><b>対地速度（GS：groundspeed）</b>は、地面に対する速さです。TAS に風を足したもので、向かい風で小さく、追い風で大きくなります。所要時間と到着の時刻の計算に使います。</li></ul>
<p>このほかに 2 つの速度があります。<b>較正対気速度（CAS：calibrated airspeed）</b>は、IAS から、空気を取り込む部品の取り付け位置による誤差と、計器の誤差を直したものです。「較正」は目盛りを正しい値に合わせることで、読みは「こうせい」です。誤差は遅い速度で大きくなります。巡航では、IAS と CAS はほぼ同じ値です。</p>
<p><b>等価対気速度（EAS：equivalent airspeed）</b>は、CAS から、空気の圧縮性（押し縮められる性質）の影響を直したものです。この影響は、遅い速度ではほとんどなく、速く飛ぶほど大きくなります。訓練機の速さでは、EAS は CAS とほとんど同じです。だから訓練機の計算では、EAS を飛ばして、CAS を高度と気温で直して TAS を求めます。上の図の EAS の段の直しは、もっと速く飛ぶときに大きくなります。</p>
<p>TAS のおよその値は、CAS に 1,000 ft ごとに 2% を足して求められます。たとえば CAS 100 kt・高度 5,000 ft なら、2% × 5 ＝ 10% を足して、TAS は約 110 kt です。正確には、フライトコンピュータ（flight computer：航法の計算の道具。目盛りを回す形と電子式がある）で、高度と気温から求めます。</p>
<p>ジェット機は、高い所ではマッハ数（Mach number）でも速さを管理します。マッハ数は、TAS をその場所の音速で割った値です。音速は、主に気温で変わります。</p>
<p>追い風で GS が大きくなっても、IAS が同じなら、翼にとっての速さは同じです。GS が増えたことで、失速までの余裕が増えたとは言えません。</p>
<h4>風は速度の矢印として足す</h4>
<p>機首の向きを、針路（ヘディング、heading）といいます。地面の上を実際に進む向きが航跡（トラック、track）、進みたい線の向きが航路（コース、course）です。横から風を受けると、針路と航跡は同じになりません。</p>
<p>地面に対する速さと向きは、空気に対する飛行機の速度に、風の速度を矢印（ベクトル）として足して求めます。針路と航跡の差の角度を、偏流角（drift angle）といいます。</p>
${FIG.basicsWind()}
<p>図の例は、TAS 100 kt で機首を真東（090°）に向け、北から 20 kt の風を受けています。機首の矢印と風の矢印は直角なので、GS は三平方の定理で求めます。GS ＝ √（100² ＋ 20²）≈ 102 kt です。飛行機は南へ流され、航跡は約 101° になります。偏流角は約 11° です。角度は、風の速さと TAS の比の tan から求めます（20 ÷ 100 ＝ 0.2 で、約 11°）。</p>
<p>航跡を航路に合わせるには、機首を風上に向けて、流される分を打ち消します。これが偏流修正（wind correction）です。くわしい計算は、航法の章で学びます。</p>
${bk.t(['TAS 120 kt で飛ぶときの風', 'GS'], [
  ['無風', '120 kt'],
  ['正面から 20 kt（向かい風）', '100 kt'],
  ['真後ろから 20 kt（追い風）', '140 kt'],
  ['真横から 20 kt', '約 122 kt（√（120² ＋ 20²）。航跡が約 9° ずれる）'],
])}
<p>真横からの風の強さを、TAS から引いてはいけません。風は向きのある矢印として足します。</p>
<h4>距離・速さ・時間</h4>
${bk.f('時間（h）＝ 距離（NM）÷ GS（kt）　　時間（分）＝ 距離（NM）÷ GS（kt）× 60')}
<ul><li>50 NM を GS 100 kt で飛ぶと、50 ÷ 100 ＝ 0.5 時間で、30 分です。</li>
<li>同じ 50 NM を、TAS 100 kt・正面から 20 kt の風で飛ぶと、GS は 80 kt です。50 ÷ 80 × 60 ＝ 37.5 分で、無風より 7.5 分長くかかります。</li>
<li>15 NM を 9 分で飛んだなら、9 分は 0.15 時間なので、GS は 15 ÷ 0.15 ＝ 100 kt です。求めたのは、区間を通した平均の速さです。</li></ul>
<p>ここで出す時間は、決めた区間を一定の GS で飛ぶ時間です。地上滑走や、上昇・降下で速さが変わる時間は入っていません。</p>
${bk.key('IAS は速度計の値、TAS は空気に対する速さ、GS は地面に対する速さ', '所要時間は GS で計算する。風は向きのある矢印として足す', '追い風で GS が増えても、失速までの余裕は増えない')}
${bk.warn('<b>よくある間違い：</b>真横からの風の強さを TAS から引くことと、IAS で所要時間を計算することです。時間は GS で求めます。')}
${bk.q('地図の上で区間の時間を計算すると 25 分でした。エンジンを始動してから止めるまでの時間も、25 分と考えてよい？', 'よくありません。25 分は、決めた区間を一定の GS で飛ぶ時間だけです。地上滑走・上昇・降下・上空で待つ待機（holding）の時間は、別に足します。')}
${bk.sim('PFD（主な飛行表示、primary flight display）は、速度・高度・姿勢などを 1 つにまとめた画面です。PFD で、速度（IAS）の表示の位置を確かめましょう。課目は「G1000 型 PFD の読み方」です（G1000 は、計器を画面にまとめた表示装置の型の名前です）。', ['k1', 'G1000 型 PFD の読み方'])}` },

      // ------------------------------------------------------------------ 6
      { id: 'basics.alt', t: '高度の種類と高度計の基準', scope: 'common', from: ['kiso00.12', 'kiso00.13'], use: ['課目 k1', 'まとめ 1', 'JCAB 空中航法・航空工学'], jcab: ['ppl.3.1.1.4', 'cpl.3.1.1.4'], h: () => `
${bk.aim('高さには、平均海面（MSL：mean sea level）からと地面からの 2 つがあることと、高度計が気圧から高さを推し量る計器であることが分かるようにします。')}
${FIG.basicsAlt()}
<p>飛行機の高さには、基準の違う 2 つがあります。平均海面（MSL：mean sea level）からの高さは、海面を 0 にした高さです。航空図の山の高さ・空港の標高・管制が指示する高度は、ふつう MSL です（管制が指示する高度を、どう保つかは下で説明します）。AGL（Above Ground Level）は、真下の地面からの高さです。2 つは、地形の標高でつながります。</p>
${bk.f('AGL ＝ MSL の高度 − 真下の地形の標高')}
<p>例：MSL 5,000 ft で、真下の地形が 2,000 ft なら、AGL は 3,000 ft です。標高 500 ft の平地の上なら、4,500 ft です。高度を変えなくても、山に近づけば地面が近づきます。</p>
<p>MSL は、高さを測る基準の面の名前です。その面から本当にどれだけ上にいるかを、真高度（true altitude）といいます。高度計の表示は、計器高度（指示高度、indicated altitude）です。規正値（下で説明します）を合わせた高度計は、真高度に近い値を示します。それでも、気温などで差が出ます（下の「ここに注意」）。管制が指示する高度は、規正値を合わせた高度計の表示で保ちます。</p>
<h4>高度計は気圧を測る</h4>
<p>高度計は、高さを直接は測っていません。外の空気の圧力である静圧（static pressure）を測り、国際標準大気の関係で高さに直して表示します。ところが、海面の気圧は、天気によって日ごと・場所ごとに変わります。合わせないと、同じ高さを飛んでいても、高度計の表示がずれます。だから、基準にする気圧を合わせます。</p>
<p>この値が<b>高度計規正値（アルティメターセッティング、altimeter setting）</b>です。高度計の正面には、規正値を表示する小さな窓があります。下のつまみを回して、知らされた値に合わせます。</p>
<ul><li><b>QNH（英語も QNH。読みはキュー・エヌ・エイチ）</b>は、空港が平均海面の高さにあったら気圧はいくらかを計算した、高度計規正値です。QNH に合わせると、地上では空港の標高を、空中ではおよその MSL の高度を示します。この教材の LAB 空港の標高は 55 ft です（教材値。参考値：Sanford の空港は 54.8 ft）。地上で 55 ft 前後を指せば合っています。</li>
<li>標準の気圧（29.92 inHg、1013.2 hPa）に合わせると、<b>気圧高度（pressure altitude）</b>を示します。高い所では全員がこの共通の基準を使い、高さをフライトレベル（FL：flight level）で呼びます。全員が同じ基準なので、規正値を合わせ直さなくても、高度計の表示がそろいます。FL180 は、標準の気圧に合わせた高度計が 18,000 ft を示す高さです。英語では、flight level one eight zero と 1 けたずつ読みます。</li></ul>
<p>規正値を標準の気圧に切り替える高さを、転移高度（transition altitude）といいます。転移高度は、国によって違います（下の日米の対照）。</p>
<p>空気の薄さを表す密度高度（density altitude）は、飛んでいる高さではありません。離陸に要る距離や上昇の力など、性能の計算に使う数です。</p>
${bk.key('高さは MSL（海面から）と AGL（地面から）を区別する', '高度計は気圧を測る計器。規正値を合わせて初めて正しい', '規正値を標準の気圧に替える高さは国で違う')}
${bk.warn('<b>ここに注意：</b>気温が国際標準大気の値より低いと、高度計は実際より高く表示します。寒い空気は密度が大きく、同じ気圧になる高さが低くなるからです。寒い日は、思っているより低く飛んでいます。気圧の高い所から低い所へ、規正値を直さずに飛んだときも、高度計は実際より高く表示します。気圧の低い所では、同じ気圧になる高さが低いので、表示を保って飛ぶと、知らないうちに高さが下がるからです。つまり、実際は表示より低い所を飛んでいます。英語では「High to low, look out below（高い所から低い所へ行くときは、下に注意）」と覚えます。')}
${bk.jur('alt.transition')}
${bk.q('MSL 3,500 ft を飛んでいて、真下の地形の標高が 900 ft。AGL は？', '3,500 − 900 ＝ 2,600 ft です。ただし、高度計の値と真高度には差が出ます。木や塔の高さも入っていません。')}
${bk.photo('ch00-photo5')}
<p>密度高度の計算は ${bk.see('perf.da', '予告：密度高度（第 1 部）')} で学びます。</p>
${bk.sim('PFD の高度の表示と、規正値の表示の場所を、課目「G1000 型 PFD の読み方」で確かめましょう。', ['k1', 'G1000 型 PFD の読み方'])}` },

      // ------------------------------------------------------------------ 7
      { id: 'basics.rules', t: '飛行方式と気象状態は別の軸', scope: 'common', from: ['kiso00.14', 'kiso09.8', 'kiso12.1'], use: ['まとめ 1・まとめ 4'], h: () => `
${bk.aim('「どの決まりで飛ぶか（飛行方式）」と「いまの天気がどうか（気象状態）」は、別のものです。2 つを分けて考えられるようにします。')}
${FIG.basicsRules()}
<p><b>有視界飛行方式（VFR：visual flight rules）</b>は、外を見て、ほかの飛行機や地形を自分で避けながら飛ぶ方式です。<b>計器飛行方式（IFR：instrument flight rules）</b>は、決められた経路や管制の指示に従って飛ぶ方式です。</p>
<p><b>有視界気象状態（VMC：visual meteorological conditions）</b>は、決められた視程と雲からの距離を満たす天気です。満たさない天気が<b>計器気象状態（IMC：instrument meteorological conditions）</b>です。</p>
<p>方式は飛び方の決まり、気象状態は天気の区分です。だから、「晴れているから VFR」「IFR なら雲の中」とは言えません。</p>
<p>管制空域（controlled airspace）は、管制が、IFR の飛行機に管制の業務（ほかの飛行機と間隔を空けるなど）を行う空域です。VFR の飛行機にどこまで行うかは、空域の種類で決まります。管制空域でない空域もあります（${bk.see('law.airspace', '予告：空域の種類と入る条件（第 1 部）')}）。</p>
<p>管制承認（クリアランス、ATC clearance）は、管制空域の中を、決めた条件で進んでよいと管制が認めることです。IFR で管制空域を飛ぶ前には、飛行計画（flight plan：経路・高度・時刻などを書いて、管制などの機関に出す届け）を出し、管制承認を受けます。</p>
<ul><li>IFR は、VMC でも飛びます。そのときも見張り（see and avoid）を続け、ほかの飛行機を見て避けます。</li>
<li>VFR でも、計器は使います。空域によっては、管制との交信や許可が要ります。</li>
<li>VFR で飛ぶ人は、VMC を保ちます。雲が低くなってきたら、雲に入る前に、引き返す・降りる・経路を変える、を決めます。</li>
<li>IFR の管制承認があっても、どんな天気でも離着陸できるわけではありません。資格・装備・空港と進入の手順・最低気象条件を、それぞれ確かめます。</li></ul>
<p>最低気象条件（minimums）は、飛んでよい・離着陸してよいと決められた、天気の下限（視程・雲の高さなど）です。VFR で飛ぶための下限と、IFR で離着陸するための下限があります。</p>
<p>計器飛行（instrument flight）という言葉もあります。姿勢（機首の上げ下げと翼の傾き）・高度・位置・針路を、計器だけを見て決める飛び方のことです。飛び方の決まりの名前である IFR とは、別の言葉です。</p>
<p>VFR で守る視程と雲からの距離の数字は、${bk.see('law.vfr', '予告：VFR の気象条件（第 1 部）')} で学びます。</p>
${bk.key('VFR・IFR は飛び方の決まり、VMC・IMC は天気の区分', 'IFR は晴れた日にも飛ぶ。そのときも外を見張る', 'VFR は VMC を保つ。雲に入る前に引き返す')}
${bk.warn('<b>ここに注意：</b>計器飛行証明（instrument rating）があっても、管制空域では、飛行の途中で自由に IFR へ切り替えることはできません。管制空域を IFR で飛ぶには、技能証明（pilot certificate）と計器飛行証明のほかに、飛行計画を出して管制承認を受けます。')}
${bk.jur('ir.need')}
${bk.us('<p>米国の 14 CFR 91.113(b) は、IFR でも VFR でも、天気が許す限り、ほかの飛行機を見て避けるよう見張りを続けることを求めています。米国の 14 CFR 91.173 は、管制空域を IFR で飛ぶには、IFR の飛行計画を出し、管制の承認を受けることを求めています。</p>')}
${bk.jp('<p>日本の航空法第 2 条は、計器気象状態（第 15 項）・計器飛行（第 16 項）・計器飛行方式（第 17 項）を別々に定義しています。計器飛行は「航空機の姿勢、高度、位置及び針路の測定を計器にのみ依存して行う飛行」です。第 34 条は、計器飛行のほかに、位置と針路の測定だけを計器に頼る飛行を「計器航法による飛行」と呼んで区別しています。第 97 条第 1 項は、計器飛行方式の飛行計画を定めています。計器飛行方式で航空交通管制区・航空交通管制圏・航空交通情報圏を飛ぶときなどは、飛行計画を通報して承認を受けます。この 3 つは、第 2 条が定める空域の種類です。</p>')}
${bk.q('晴れた日に、IFR で飛ぶことはある？', 'あります。IFR は飛び方の決まりで、天気の名前ではありません。エアラインの便は、ふつう晴れていても IFR で飛びます。そのときも外を見張ります。')}` },

      // ------------------------------------------------------------------ 8
      { id: 'basics.docs', t: '資料と手順の確かめ方', scope: 'common', from: ['kiso00.15'], use: ['まとめ 1'], h: () => `
${bk.aim('飛ぶための数字と手順は、決まった資料から取ります。資料の種類と、使う前に確かめる 4 つのことを覚えます。')}
${FIG.basicsDocs()}
<p>同じ機種の名前でも、機体ごとに装備や改修が違います。資料は、その機体のものか・版は新しいか・単位は何かを確かめてから使います。</p>
${bk.t(['資料', '主な中身'], [
  ['飛行規程（AFM：airplane flight manual）と POH（操縦士用の機体の手引書、pilot\'s operating handbook）', 'その機体の運用限界（超えてはいけない速度・重さなどの限り）・性能・手順・重量（weight）と重心。国の承認を受けた部分がある。多くの小型機では、POH が飛行規程を兼ねる'],
  ['チェックリスト', '手順を抜かさずに行うための一覧'],
  ['学校・会社の SOP', '運航の方針・役割の分担・手順'],
  ['航空路誌（AIP：aeronautical information publication）', '空域・空港・飛び方の手順などの、長く使う航空情報（aeronautical information）。国ごとに出している'],
  ['ノータム', '施設の状態など、一時的な変更の知らせ'],
  ['気象の実況と予報', 'いまの天気とこれからの見込み。発表の時刻と、有効な時間がある'],
])}
<p>POH は、表紙に機体の製造番号と登録記号（国に登録した機体ごとの記号）が書かれたものを使います。番号の書かれていない手引書は、勉強のための資料です。</p>
<h4>この本より優先するもの</h4>
<p>国の航空法規と、その機体の飛行規程・POH、学校の SOP、操縦教員の指示は、どれもこの本より優先します。SOP は、学校や会社が決めた標準運航手順（standard operating procedures）です。この本の数字は学ぶための値で、実機の資料の代わりにはなりません。資料と操縦教員の指示が食い違うと気づいたら、飛ぶ前に操縦教員に聞きます。</p>
<h4>使う前の 4 つの確認</h4>
<ol><li><b>何の値か</b>：速度・高度・方位・時刻のどれかを確かめます。</li>
<li><b>どの基準か</b>：IAS か GS か、MSL か AGL か、真北か磁北かを確かめます。</li>
<li><b>いつの情報か</b>：発表の時刻・有効な時間・資料の版を確かめます。</li>
<li><b>誰に確かめるか</b>：操縦教員・管制・整備など、聞く相手を決めます。</li></ol>
<p>数字を、何の値か・どの基準かと一緒に伝える習慣は、操作を覚えるより先に作ります。人の注意には限りがあるので、互いに確かめ合う手順を、学び始めから使います。</p>
${bk.key('資料は「その機体の・新しい版の」ものを使う', '何の値・どの基準・いつ・誰に、の 4 つを確かめる', '実機では、POH・操縦教員・SOP・法規がこの本より優先')}
${bk.warn('<b>よくある間違い：</b>インターネットで見つけた同じ機種の古い性能表を、そのまま使うことです。機体・版・条件・単位が合っているかが分かりません。')}
${bk.us('<p>米国の 14 CFR 91.9 は、承認された飛行規程と、機体の標示（markings）・表示板（placard）にある運用限界を守って運航することを求めています。標示は速度計の色の帯など、表示板は機体に貼った札です。米国の AIP は FAA が出しています。</p>')}
${bk.q('ATIS で聞いた風と、METAR の風を比べるとき、まず何を確かめる？', '北の基準と時刻です。米国では ATIS の風は磁北、METAR の風は真北です。観測の時刻も同じか確かめます。')}` },

      // ------------------------------------------------------------------ 9
      { id: 'basics.case', t: '総合例題：Sanford 発と羽田発', scope: 'common', from: ['kiso00.16'], use: ['まとめ 1'], h: () => `
${bk.aim('これまでの単位・時刻・速度・高度・飛行方式を、1 つの場面で使います。計算できることと、情報が足りずにまだ決められないことを分けます。')}
${FIG.basicsCase()}
<p>学ぶための架空の区間です。出発の LAB 空港も架空の空港で、標高だけを Sanford の空港に近い値にしてあります。実際の空港・許可・燃料の計画ではありません。</p>
${bk.t(['条件', '値'], [
  ['出発', 'LAB 空港（この教材の架空の空港）を 7 月 10 日 10:00 EDT に出る。標高 55 ft（教材値。参考値：Sanford の空港は 54.8 ft）'],
  ['区間', '真東へ 60 NM'],
  ['TAS と風', 'TAS 110 kt、真東から 20 kt の一定の風（090° / 20 kt と書く）'],
  ['高度', '高度計（規正値 30.05 inHg）の表示 3,500 ft、真下の地形の標高 100 ft'],
  ['予定の方式と新しい情報', 'VFR の予定。目的地の方向で、雲が低くなる予報'],
])}
<h4>計算できること</h4>
<ul><li>風：真東へ飛ぶので、真東からの風は向かい風です。GS は 110 − 20 ＝ 90 kt です。</li>
<li>時間：60 ÷ 90 × 60 ＝ 40 分です。</li>
<li>時刻：7 月 10 日 10:00 EDT は、7 月 10 日 1400Z です。区間の終わりは 7 月 10 日 1440Z（10:40 EDT）です。地上滑走や上昇の時間は入っていません。</li>
<li>高さ：規正値を合わせた高度計が 3,500 ft なら、およその MSL は 3,500 ft です。真下の地形が 100 ft なら、AGL は約 3,400 ft です。</li>
<li>地上での確かめ：出発前に規正値 30.05 inHg に合わせ、高度計が 55 ft 前後を指していれば合っています。</li></ul>
<h4>まだ決められないこと</h4>
<p>「雲が低くなる予報」だけでは、VFR で行けるかは決まりません。予報の時刻と有効な時間・視程・雲の高さと地形・空域・VFR の気象条件・燃料・代わりの案を確かめます。</p>
<h4>操縦教員に伝える</h4>
<p>見たことと、次に確かめることを組にして伝えます。例：「目的地の方向の予報が悪くなりました。VFR の条件と代わりの案を、もう一度確かめたいです」。</p>
<p>英語なら、次のように言います。minimums は、最低気象条件（${bk.see('basics.rules', '飛行方式と気象状態は別の軸')} で学んだ、天気の下限）のことです。</p>
<p>“The forecast toward our destination has gotten worse. I'd like to recheck the VFR minimums and our options.”</p>
${bk.key('計算できることと、情報が足りないことを分ける', '時刻は日付と一緒に UTC にし、時間は GS で出す', '変化に気づいたら、見たことと次に確かめることを伝える')}
${bk.warn('<b>ここに注意：</b>この例の数字は練習用です。実際の飛行では、その日の天気・ノータム・機体の POH・学校の手順で計画します。')}
${bk.jp(`<p><b>羽田発の版</b>：日本で同じ練習をするときも、METAR などの航空の情報の時刻は UTC（Z）です。出発の予定の時刻（JST）は、日付と一緒に UTC に直します。</p>
<p>日本の METAR は、高度計規正値を Q 群（hPa）で書き、国内記事（RMK）に A 群（inHg）も書きます。管制・ATIS で言う単位は、${bk.see('basics.units', '単位と換算')} の日米の対照のとおり〔要確認〕です。</p>
<p>例として、羽田を 10 月 20 日 08:00 JST に出る区間を考えます。UTC では 10 月 19 日 2300Z で、日付が 1 日戻ります。規正値 1009 hPa は、約 29.80 inHg です。GS と時間の求め方は、上と同じです。規正値を切り替える高さは、${bk.see('basics.alt', '高度の種類と高度計の基準')} の日米の対照で確かめます。</p>`)}
${bk.q('上の区間で、向かい風が 30 kt に強まったら、区間の時間は？', 'GS は 110 − 30 ＝ 80 kt です。60 ÷ 80 × 60 ＝ 45 分で、5 分長くなります。燃料の計画も見直します。')}` },
    ],
    terms: [
      ['Pilot in command (PIC)', '機長', 'その飛行の最終の権限と責任を持つ人。職位のキャプテンとは別'],
      ['Pilot flying / pilot monitoring (PF / PM)', 'PF・PM', '飛行経路を管理する操縦士・監視する操縦士'],
      ['Nautical mile (NM) / knot (kt)', '海里・ノット', '1 NM ＝ 1,852 m、1 kt ＝ 1 NM/h'],
      ['Statute mile (SM)', '法定マイル', '米国の視程の単位。約 1.609 km'],
      ['Inches of mercury (inHg)', 'インチ水銀柱', '米国の高度計規正値の単位。1 inHg は約 33.86 hPa'],
      ['International Standard Atmosphere (ISA)', '国際標準大気', '計算の基準の大気。海面で 15℃・29.92 inHg（1013.25 hPa）'],
      ['METAR / ATIS', 'METAR・飛行場情報放送', '空港の天気の定時の報告・空港の情報の録音の放送'],
      ['Coordinated Universal Time (UTC, Z)', '協定世界時', '航空の時刻の基準。Z は Zulu（ズールー）と読む'],
      ['Magnetic variation / deviation', '偏差・自差', '真北と磁北の差・その機体の磁気コンパスだけの誤差'],
      ['Indicated / calibrated / true airspeed', '指示対気速度・較正対気速度・真対気速度', 'IAS・CAS・TAS'],
      ['Groundspeed (GS)', '対地速度', '地面に対する速さ。所要時間の計算に使う'],
      ['Stall', '失速', '翼の上の空気の流れがはがれ、揚力を急に失う状態'],
      ['Heading / track / course', '針路・航跡・航路', '機首の向き・実際に進む向き・進みたい線の向き'],
      ['Drift angle', '偏流角', '針路と航跡の差の角度'],
      ['MSL / AGL', '平均海面からの高さ・地面からの高さ', 'Mean Sea Level / Above Ground Level'],
      ['Altimeter setting', '高度計規正値', 'QNH など'],
      ['QNH', 'QNH', '地上では空港の標高を、空中ではおよその MSL の高度を示すように合わせる規正値'],
      ['Pressure altitude', '気圧高度', '標準の気圧（29.92 inHg）に合わせた高度計の表示'],
      ['Flight level (FL)', 'フライトレベル', 'FL180 は気圧高度 18,000 ft'],
      ['Transition altitude', '転移高度', '規正値を標準の気圧に切り替える高さ。国で違う'],
      ['Go-around', '着陸復行', '着陸をやめて上昇し、やり直すこと'],
      ['Visual / instrument flight rules (VFR / IFR)', '有視界飛行方式・計器飛行方式', '飛び方の決まり'],
      ['Visual / instrument meteorological conditions (VMC / IMC)', '有視界気象状態・計器気象状態', '天気の区分'],
      ['Instrument flight', '計器飛行', '姿勢・高度・位置・針路を計器だけを見て決める飛び方。IFR とは別の言葉'],
      ['Controlled airspace', '管制空域', '管制が IFR の飛行機に管制の業務を行う空域'],
      ['ATC clearance', '管制承認', '管制空域の中を、決めた条件で進んでよいと管制が認めること'],
      ['Flight plan', '飛行計画', '経路・高度・時刻などを書いて、管制などの機関に出す届け'],
      ['Minimums', '最低気象条件', '飛んでよい・離着陸してよいと決められた天気の下限'],
      ['NOTAM', 'ノータム', '施設の状態など、一時的な変更の知らせ'],
      ['Readback', '復唱', '聞いた指示を言い返して、理解が同じかを確かめること'],
      ['Airplane flight manual (AFM)', '飛行規程', 'POH と合わせて使う'],
    ],
    examples: [
      'Sanford の 7 月 1 日 10:00 EDT は 1400Z、同じ瞬間の日本は 23:00 JST。',
      '50 NM を TAS 100 kt・向かい風 20 kt で飛ぶと、GS 80 kt で 37.5 分。',
      'MSL 5,000 ft で、真下の地形が 2,000 ft なら AGL は 3,000 ft。',
      '晴れた日に IFR で飛ぶ便は、VMC の中を IFR で飛んでいる。',
    ],
    cautions: [
      'この章の数字の例は練習用です。実機の数値・手順は、その機体の POH・操縦教員・学校の手順・航空法規に従います。',
      '高度計の表示は、真高度とも、障害物からの高さとも同じではありません。航空図で地形と障害物を確かめます。',
      '時刻は日付と組で換算します。夏時間のある国では、その日の時差を確かめます。',
    ],
    quiz: [
      { q: '地図の上の区間の所要時間を計算するときに使う速度は？', choices: ['指示対気速度（IAS）', '対地速度（GS）', '較正対気速度（CAS）', '真対気速度（TAS）だけ'], answer: 1, why: '所要時間は、地面に対する速さである GS で求める。TAS に風を足したものが GS（「速度の種類・風のベクトル・距離と時間」の節。PHAK 第 16 章）。' },
      { q: '副操縦士が PF を受け持っているとき、正しいものは？', choices: ['副操縦士が機長になる', 'PM は必ず副操縦士', '機長は職位の名前なので、誰が機長かは決まらない', '誰が機長かは PF・PM の分担とは別に決まっている'], answer: 3, why: '職位・機長（法令上の役割）・PF と PM（操作の役割）は別々に決まる。PF を交代しても機長は替わらない（「職位・機長（PIC）・PF と PM」の節）。' },
      { q: '晴れた日（VMC）に IFR で飛ぶことについて、正しいものは？', choices: ['できる。そのときも外を見張って、ほかの飛行機を避ける', 'できない。IFR は雲の中だけの決まり', 'できるが、外を見る必要はない', 'VMC では自動的に VFR になる'], answer: 0, why: 'IFR は飛び方の決まり、VMC は天気の区分で、別の軸。IFR でも天気が許す限り見張りを続ける（「飛行方式と気象状態は別の軸」の節）。' },
      { q: '気温が標準より低い日に、高度計が 3,000 ft を示している。本当の高さは？', choices: ['高度計の表示より高い', '高度計の表示と同じ', '高度計の表示より低い', '気温は高度計に関係しない'], answer: 2, why: '寒い空気は密度が大きく、高度計は実際より高く表示する。寒い日は思っているより低い（「高度の種類と高度計の基準」の節。PHAK 第 8 章）。' },
    ],
    written: [
      ['出発前から到着後までを 5 つの段階に分けると、どうなりますか。段階ごとに、確かめる情報の例を 1 つずつ挙げてください。', `出発前は天気と燃料、地上滑走と離陸はいまいる位置と管制の許可、上昇と巡航は経路と残りの燃料、降下と進入は到着地の情報と着陸復行の計画、着陸と到着後は機体の状態と記録などです。${bk.see('basics.flight', '一便の流れ')}`, ['kiso00.q1']],
      ['「機長」と「PF」の違いを説明してください。副操縦士が PF を受け持つ区間では、誰が PM で、誰が機長ですか。', `機長はその飛行の法令上の役割、PF は飛行経路を操る操作の役割で、別々に決まります。副操縦士が PF なら、ふつうキャプテンが PM を受け持ち、機長もキャプテンのままです。${bk.see('basics.crew', '職位・機長・PF と PM')}`, ['kiso00.q2']],
      ['自動操縦装置を使って飛んでいる途中で、機体が思っていたのと違う方へ曲がり始めました。PF と PM は、それぞれ何をしますか。', `PF は、自動操縦装置を使っていても飛行経路の管理を続けます。PM は、経路と機体の状態、自動操縦装置の動き方を見張ります。ずれを声で伝え、要るときは介入します。${bk.see('basics.crew', '職位・機長・PF と PM')}`, ['kiso00.q15']],
      ['管制の指示の高度が、自分にも、隣の人にもはっきり聞き取れませんでした。どうしますか。', `推測で決めず、分からないことを 2 人で共有して、管制に聞き直します。何が分からないかを具体的に言います（例：高度の数字）。${bk.see('basics.crew', '確認の習慣')}`, ['kiso00.q19']],
      ['70 NM を km に、1,500 ft を m に直してください。', `70 × 1.852 ＝ 129.64 km、1,500 × 0.3048 ＝ 457.2 m です。${bk.see('basics.units', '単位と換算')}`, ['kiso00.q9', 'kiso00.q10']],
      ['400 ft/min で 5 分間上昇しました。高度の変化はいくらですか。上昇を終えた高度は、この情報だけで分かりますか。', `400 × 5 ＝ 2,000 ft 変わりました。上昇を始めた高度が分からないので、終えた高度は分かりません。${bk.see('basics.units', '単位と換算')}`, ['kiso00.q10']],
      ['11 月 3 日 06:15 JST を UTC に、11 月 2 日 1630Z を JST に直してください。日付も書いてください。', `11 月 2 日 2115Z と、11 月 3 日 01:30 JST です。JST から UTC へは 9 時間を引き、UTC から JST へは 9 時間を足します。どちらも日付が変わります。${bk.see('basics.time', '時刻と方位')}`, ['kiso00.q12']],
      ['速度計の値、空気に対する速さ、地面に対する速さは、それぞれ何と呼びますか。地図の上の区間の時間を出すのは、どの速さですか。', `IAS（指示対気速度）、TAS（真対気速度）、GS（対地速度）です。区間の時間は GS で求めます。${bk.see('basics.speed', '速度の種類')}`, ['kiso00.q6']],
      ['35 NM の区間を GS 105 kt で飛ぶと、何分かかりますか。', `35 ÷ 105 × 60 ＝ 20 分です。${bk.see('basics.speed', '距離・速さ・時間')}`, ['kiso00.q11']],
      ['TAS 110 kt で機首を 090° に向けて飛んでいます。南から 25 kt の風が吹いているとき、偏流修正をしないと、GS はおよそいくらですか。航跡は、機首の向きより北と南のどちらへずれますか。', `GS ＝ √（110² ＋ 25²）≈ 113 kt です。風が南から吹くので、航跡は北側にずれます（約 077°）。TAS から 25 を引くのは誤りです。${bk.see('basics.speed', '風のベクトル')}`, ['kiso00.q13']],
      ['MSL と AGL は、それぞれ何を 0 にした高さですか。真高度 4,000 ft で、真下の地形が 1,500 ft のときの AGL を求めてください。AGL が分かれば、近くの山や塔との間隔も分かりますか。', `MSL は平均海面、AGL は真下の地面を 0 にした高さです。4,000 − 1,500 ＝ 2,500 ft です。AGL は真下だけの高さで、近くの山や塔との間隔は表しません。地形と障害物も確かめます。${bk.see('basics.alt', '高度の種類')}`, ['kiso00.q7', 'kiso00.q14']],
      ['飛行方式の IFR と、気象状態の IMC は、何が違いますか。晴れた日に IFR で飛ぶ便はありますか。', `IFR は飛び方の決まり、IMC は天気の区分です。晴れた日（VMC）にも、IFR で飛ぶ便はあります。${bk.see('basics.rules', '飛行方式と気象状態')}`, ['kiso00.q8']],
      ['友だちが「VFR なら無線で話さなくてよい」「IFR の管制承認があれば、どんな天気でも着陸できる」と言いました。どこが足りないか、それぞれ説明してください。', `VFR でも、空域によっては交信や許可が要ります。IFR でも、操縦士の資格・機体の装備・空港と進入の手順・最低気象条件を満たす必要があります。${bk.see('basics.rules', '飛行方式と気象状態')}`, ['kiso00.q16']],
      ['ウェブで、同じ機種の名前が付いた古い性能表を見つけました。訓練で飛ぶ機体に使ってよいか判断する前に、何を確かめますか。', `その機体のものか（製造番号・装備・改修）、版と有効な日、計算の条件、単位、運用限界、学校の手順と合うかを確かめます。実際には、その機体の POH を使います。${bk.see('basics.docs', '資料と手順の確かめ方')}`, ['kiso00.q20']],
    ],
    refs: [R.phak, R.phak8, R.phak9, R.phak16, R.afh, R.afh15, R.cfr1, R.cfr91, R.cfr121, R.aim41, R.aim42, R.aim43, R.aim71, R.aim72, R.pcg, R.automation, R.nist811, R.usc260a, R.usAip, R.sfbData, R.egovKoku, R.jmaQnh, R.jmaCode],
    lessons: ['k1'] });

  // ======================================================================= 序部 第 3 章 english「英語で学ぶ準備」
  // DESIGN 3.3 序部 chapter 3 (★en.terms 用語の三つ組みと略語, ★en.class 英語の授業と教官との話し方). Written by W10 and
  // revised by revise-english after the fact check and the beginner's read; registered in R1 P5 (the draft and its
  // record: textbook/rewrite/combined/drafts/english.js, reports/W10-english.md・factcheck-english.md・reader-english.md・
  // revise-english.md). Both sections are new (no basic-course section: no `from`).
  //  - en.terms: every name in its tables is read from the table of terms FL.terms (book-terms.js) when the section is
  //    drawn (the ids below choose the entries), so the section follows the table; without FL.terms the tables are left
  //    out and a short line says where they are;
  //  - en.class: asking, saying again, unable, the numbers and units, power distance; the UK/US differences, where
  //    whether the London ground school writes the British (ICAO) way is not published (bk.est; UNVERIFIED U.london-icao);
  //  - one concept, one address: the radio words, numbers and phraseology (comm.*) and the authority gradient (crm.crm) are
  //    recalled in a line with a 「予告」 link;
  //  - CADET leaves this chapter out (cadet/src/content/book.js DROP_CHAPTERS, DESIGN 6.3), so its real names (Sanford,
  //    London) and FLIGHT LAB's lessons may be named (DESIGN 6.2 rule 10);
  //  - every claim (a number with a unit, a rule, a cited definition) is in the ledger CLAIMS.json (from
  //    drafts/english.claims.json).
  // The chapter's helpers are kept in a block of their own (not indented: the sections' bodies are template strings).
  {
  // ---- the table of terms (FL.terms) -------------------------------------------------------------------------------
  const TERMS = () => (FL.terms && typeof FL.terms.byId === 'function' ? FL.terms : null);
  const term = id => {
    const T = TERMS(); const e = T ? T.byId(id) : null;
    if (T && !e) throw new Error(`book-0.js (english): "${id}" is not an entry of FL.terms (book-terms.js)`);
    return e;
  };
  // the parenthesis of a first use: （通称、English） or （略語：English）
  const paren = e => `（${[e.common[0], e.en].filter(Boolean).join('、')}）`;
  // （通称、略語：English）. When the common name is the abbreviation in plain letters (Vmc for V<sub>MC</sub>), it is
  // written 「V<sub>MC</sub>。Vmc とも書く」 (DESIGN 3.5); the abbreviation is left out when it is the English itself (NOTAM)
  const plainOf = s => String(s || '').replace(/<[^>]+>/g, '');
  const parenAbbr = e => {
    const ab = e.abbr && plainOf(e.abbr) !== e.en ? e.abbr : null, com = e.common[0];
    if (ab && com && com.toLowerCase() === plainOf(ab).toLowerCase()) return `（${ab}。${com} とも書く、${e.en}）`;
    return `（${[com, ab ? `${ab}：${e.en}` : e.en].filter(Boolean).join('、')}）`;
  };
  const full = e => `${e.formal}${parenAbbr(e)}`;
  // which entries the section shows (the names come from FL.terms). Only entries whose three names name one and the same
  // thing, and whose first common name is an everyday or katakana name (the section's own definition of 通称): not
  // walk-around (外部点検 is one part of the preflight inspection: 施行規則第 164 条の 15 第 2 項・AFH ch.2), spin and
  // landing-gear (きりもみ・降着装置 are the law's own words: 施行規則第 197 条の 3・第 79 条), turn-coordinator (JCAB's
  // 旋回傾斜計 also names the turn-and-slip indicator: PHAK p.8-16) or aoa (迎え角・迎角 differ by one kana)
  const TRIPLE = ['aileron', 'elevator', 'rudder', 'mixture', 'airspeed-indicator', 'attitude-indicator', 'heading', 'ceiling', 'taxi', 'runup', 'traffic-pattern', 'go-around', 'holding', 'cross-country', 'call-sign', 'clearance', 'right-of-way', 'solo', 'flight-instructor', 'oei'];
  // pairs that name different things (a short note of the difference: the full explanation is at each term's address)
  const PAIRS = [
    ['instrument-flight', 'ifr', '計器だけを見て飛ぶ飛び方と、飛び方の決まりの名前'],
    ['vmc', 'vmc-speed', '天気の区分と、多発機で片方の発動機が止まったときに方向を保てる最小の速度'],
    ['pic', 'captain', 'その飛行の最終の権限と責任を持つ役割と、会社の職位'],
    ['go-around', 'missed-approach', '着陸をやめてやり直すことと、計器進入（計器を頼りに滑走路へ向かう、決められた飛び方）を着陸まで続けられないときの、決められた手順'],
    ['taxi', 'ground-roll', '自分の力で地上を動くことと、離着陸で滑走路を走る距離'],
    ['variation', 'deviation', '場所で決まる真北（true north）と磁北（magnetic north）の差と、その機体の磁気コンパス（magnetic compass）だけの誤差'],
    ['notam', 'ais', '施設や方式などの変更を急いで知らせるものと、AIP やノータムなどの総称'],
  ];
  // (not 'ils': its official name 計器着陸装置 holds 着陸装置, which the first-use check would count as landing gear's first use)
  const ABBR = ['ias', 'tas', 'groundspeed', 'vx', 'vy', 'va', 'vne', 'vfr', 'imc', 'taf', 'atis', 'aip', 'afm', 'eta'];
  const ASCII_NAMES = ['pf', 'pm', 'pfd', 'poh'];   // the official name is the abbreviation itself (PF before PFD: the first use)
  const SPELL = [['takeoff', e => e.en], ['urgency', e => e.common[0]], ['mapt', e => e.abbr]];   // US form → ICAO form (FL.terms icao)

  function tripleTable() {
    return bk.t(['正式名', '（通称、English）'], TRIPLE.map(id => { const e = term(id); return [e.formal, paren(e)]; }));
  }
  function pairTable() {
    return bk.t(['一方', 'もう一方', '違い'], PAIRS.map(([a, b, note]) => [full(term(a)), full(term(b)), note]));
  }
  function abbrTable() {
    return bk.t(['略語', '正式名（English）'], ABBR.map(id => { const e = term(id); return [e.abbr, `${e.formal}（${e.en}）`]; }));
  }
  // the PF・PM・PFD・POH entries keep a short meaning in `common` (not an everyday name), so the heading says 意味
  const asciiTable = () => bk.t(['正式名', '（意味、English）'], ASCII_NAMES.map(id => { const e = term(id); return [e.formal, paren(e)]; }));
  // one form for every item: 名前（English。米国の形／ICAO・英国の形）
  const SPELL_WHAT = { takeoff: '', urgency: '合図の言葉 ', mapt: '略語 ' };
  const spellItems = () => SPELL.map(([id, us]) => { const e = term(id), u = us(e); return `<li>${e.formal}（${e.en}${u === e.en ? '' : `。${SPELL_WHAT[id] || ''}${u}`}／${e.icao}）</li>`; }).join('');
  const unverifiedList = T => T.list.filter(e => e.status === 'unverified');
  const unverifiedItems = T => unverifiedList(T).map(e => `<li>${e.formal}（${e.common.join('・')}、${e.en}）</li>`).join('');

  B.add({ id: 'english', part: 'p0', before: 'aero', t: '英語で学ぶ準備', en: 'Getting ready to learn in English: one thing, three names, and talking with your instructors',
    summary: '同じものを指す 3 つの名前（日本の学科試験の資料と法令の正式名・ふだんの通称・米国の訓練の英語）を結びます。取り違えやすい語の組と、略語の書き方と読み方も学びます。後半は、英語の授業と、座学の教官・操縦教員との話し方です。聞き直す、分からない所を言う、できないと言う、数字と単位を言う、立場の差があっても言う、を練習します。',
    secs: [
      // ------------------------------------------------------------------ 1
      { id: 'en.terms', t: '用語の三つ組みと略語', scope: 'common', use: ['まとめ 1'], h: () => {
        const T = TERMS();
        const ail = term('aileron') || { formal: '補助翼', common: ['エルロン'], en: 'aileron' };
        const unv = T ? unverifiedList(T) : [];
        const unvMe = unv.length && unv.every(e => e.cat === 'me') ? `${unv.length === 2 ? 'どちら' : 'どれ'}も、多発機の章で学ぶ語です。` : '';
        const tables = T ? `
<h4>名前が大きく違う語</h4>
<p>通称と正式名が大きく違う語の例です。どの行も、3 つの名前が同じものを指します。意味は、それぞれの章で学びます。ここでは、名前の組に慣れておきます。</p>
${tripleTable()}
<h4>取り違えやすい組</h4>
<p>名前が似ている組や、ふだん同じ意味で使われがちな組です。どの組も、別のものを指します。片方だけを覚えると、取り違えます。違いの説明は、それぞれの章にあります。</p>
${pairTable()}
<p>ノータム（NOTAM）は、英語の Notice to Airmen の略です（米国の FAA の用語集 Pilot/Controller Glossary）。</p>
<h4>略語</h4>
<p>多くの略語は、英語の言葉の頭文字です。この本は、初めて出るところで「正式名（略語：English）」と開いて書きます。通称と略語の両方がある語は「正式名（通称、略語：English）」です。</p>
<p>速度の略語は、V の後ろに、速度の種類を表す小さな字を付けます（米国の 14 CFR 1.2 の一覧。V<sub>X</sub>・V<sub>Y</sub> など）。X・Y のように、英語の頭文字でない字もあります。</p>
${abbrTable()}
<p>略語の読み方は、2 通りあります。英国の CAP 413 は、よく使う略語を、無線でも文字のまま読んでよいと書いています。例に挙げる略語の 1 つは QNH（高度の基準に使う気圧の値の 1 つ。英語も QNH）で、Q・N・H と文字で読めます。一方で、CAP 413 は、天気の報告の略語 CAVOK を、CAV-O-KAY と 1 つの語のように読むと書いています。どちらで読むかは語によって違うので、初めて会う略語は、授業で読み方を聞いて確かめます（“How do you say this?”）。</p>
<p>略語がそのまま正式名になっている語もあります。</p>
${asciiTable()}
<h4>つづりと略語の違い</h4>
<p>米国（FAA）と ICAO・英国では、つづりや略語が違う語があります。この本は「米国の形／ICAO の形」の順に書きます。</p>
<ul>${spellItems()}
<li>飛行機（airplane／aeroplane。米国の 14 CFR 1.1、英国の CAP 413）</li>
<li>「待って」（stand by／standby。米国の FAA の用語集、英国の CAP 413）</li></ul>
<p>PAN-PAN は、緊急通信を知らせる、国際的な無線の合図の言葉です。緊急通信は、安全が心配で、すぐではないが早めの助けが要るときの通信です（米国の FAA の用語集）。MAP は地図（map）ではなく、進入復行点の略語です。</p>
<h4>この本の用語の表</h4>
<p>この本の専門用語は、1 つの用語の表（${T.list.length} 語）から取っています。部が変わっても、同じものを別の名前で呼びません。</p>
<p>用語の表には、日本語の名前を JCAB の資料でまだ確かめていない語が ${unv.length} つあります。${unvMe}この本は、確かめるまで用語の表の名前で書き、別名を並べます。</p>
<ul>${unverifiedItems(T)}</ul>` : `
<p>語の組の表は、この本の用語の表から作ります。用語の表を読み込む版では、ここに表が出ます。</p>`;
        return `
${bk.aim(`英語で習う訓練と、日本語で書かれた学科試験（knowledge test）の資料・法令の両方で、同じものを同じものと分かるようにします。たとえば${ail.formal}${paren(ail)}のように、1 つのものに 3 つの名前があります。`)}
${FIG.enTriple()}
<p>この本は、専門用語を 3 つの形で結びます。</p>
<ul><li><b>正式名</b>：日本の国土交通省航空局（JCAB）の学科試験の資料と、日本の法令の書き方です。本文はこの名前で書きます。</li>
<li><b>通称</b>：ふだんの会話や、カタカナで書かれた資料で使う言い方です。</li>
<li><b>英語</b>：米国の連邦航空局（FAA）の資料と、英語の授業で使う言葉です。</li></ul>
<p>各章で初めて出るところでは「正式名（通称、English）」と書きます。その章の 2 回目からは、正式名だけを書きます。通称のない語は「正式名（English）」です。</p>
<p>3 つが同じものだと分かっていないと、英語で習ったことを、日本語の問題で使えません。反対も同じです。</p>
<p>英語の言い方は、国によって違う語もあります。この章は、米国のほかに、国際的な決まりと英国の資料も引きます。</p>
<ul><li><b>ICAO</b>：国際民間航空機関（International Civil Aviation Organization）です。世界の航空の標準を決める、国際連合の専門機関です。</li>
<li><b>CAA</b>：英国の航空の規制機関、民間航空局（Civil Aviation Authority）です。</li>
<li><b>CAP 413</b>：CAA の無線の手引き（Radiotelephony Manual）です。ICAO の決まりと英国の規則をもとに、英国の無線の言い方をまとめています。</li></ul>
${tables}
${bk.key('1 つのものに 3 つの名前：正式名・通称・英語', '各章の初出は「正式名（通称、English）」、2 回目から正式名', '略語は初出で開く。取り違えやすい組は並べて覚える')}
${bk.warn('<b>ここに注意：</b>表の英語は、米国の FAA の言い方です。ICAO と英国の資料では、同じものを別の言い方やつづりで書くことがあります。分からなければ、授業の中で確かめます。')}
${bk.q(`${ail.en}・${ail.common[0]}・${ail.formal}。それぞれ、どこでよく会う名前？`, `${ail.en} は英語の授業と米国の資料、${ail.common[0]}はふだんの日本語の会話、${ail.formal}は日本の学科試験の資料と法令の名前です。3 つとも同じものを指します。`)}`;
      } },

      // ------------------------------------------------------------------ 2
      { id: 'en.class', t: '英語の授業と教官との話し方', scope: 'common', use: ['まとめ 1・まとめ 6'], h: () => `
${bk.aim('座学も飛行訓練も、英語で受けます。聞き取れない・意味が分からない・できない、を英語ではっきり言えるようにします。立場の差があっても、言うべきことを言います。')}
${FIG.enTalk()}
<p>${bk.fact('座学はロンドンで、授業はすべて英語で行うと公開されています。飛行訓練は米国の Sanford で、現地の操縦教員から受けます。')}くわしくは ${bk.see('intro.course', '公開されている訓練の流れ')} にあります。</p>
<p>この本は、座学で教える人を座学の教官（ground instructor）、飛行訓練で操縦を教える人を操縦教員と書き分けます。</p>
<h4>分かったふりをしない</h4>
<p>英語の授業でいちばん大切なのは、分かったふりをしないことです。分かっていないのに “Yes” や “OK” と答えると、相手は「伝わった」と受け取ります。その食い違いは、あとで操縦席で表に出ます。</p>
<p>分からないときは、どこが分からないかを言います。“I don't understand.” だけでは、相手はどこから説明し直せばよいか分かりません。</p>
${bk.t(['こんなとき', '言い方の例'], [
  ['聞き取れなかった', '“Sorry, could you say that again, please?”'],
  ['速くて追いつけない', '“Could you speak more slowly, please?”'],
  ['語の意味が分からない', '“What does ‘stabilator’ mean?”（stabilator は、知らない語の例）'],
  ['つづりを知りたい', '“How do you spell that?”'],
  ['一部だけ分からない', '“I didn\'t understand the part about the fuel system.”'],
  ['自分の理解を確かめたい', '“So, I check the fuel before I start the engine. Is that right?”（自分の言葉で言い直す）'],
  ['図で見たい', '“Could you show me on the diagram?”'],
])}
<p>自分の言葉で言い直すと、食い違いがその場で分かります。相手の言ったことを返して確かめる点は、無線の復唱（readback）と同じです。ただし、無線の復唱は自分の言葉にせず、受け取ったとおりに返します。</p>
<h4>操縦席で操縦教員と</h4>
<p>操縦席では、短く、はっきり言います。分からない指示を、推測で実行しません。飛行機はそのまま安定して飛ばしながら、すぐに聞き直します。</p>
<ul><li>聞こえなかった：“Sorry, say again?”</li>
<li>何をすればよいか分からない：“I'm not sure what you want me to do.”</li>
<li>自信がない・不安がある：“I'm not comfortable with this.”</li></ul>
<p>操縦を渡すときと受け取るときの決まった言い方は、第 2 部で学びます。</p>
<h4>無線では決まった言葉</h4>
<p>管制との無線では、意味の決まった言葉を使います。これを標準用語（phraseology）といいます。聞き取れなければ “Say again” と言います。ゆっくり話してほしければ “Speak slower” です。指示に従えなければ “Unable” と言い、理由を添えます。</p>
<p>この 3 つは、米国の FAA の用語集（Pilot/Controller Glossary）にも、英国の CAP 413 にもあります。“Speak slower” は、授業の表の “speak more slowly” と形が違います。無線では、この形のまま、決まった言葉として使います。</p>
<p>無線では、ていねいな言葉（please・thank you など）を重ねず、短く言います。英国の CAP 413 は、ていねいな言葉の使いすぎを避けるよう書いています。使ってはいけない、という意味ではありません。米国の AIM も、交信をできるだけ短くするよう求めています。</p>
<p>決まった言葉で言えないことは、ふつうの言葉（plain language）で、短く言います。米国の AIM は、交信でいちばん大切なのは理解だと書いています。決まった言い方で足りなければ、伝わるまで必要な言葉を使います。無線の聞き直し方は ${bk.see('comm.clarify', '予告：わからないとき・従えないとき（第 1 部）')} で学びます。</p>
<h4>数字と単位の言い方</h4>
<p>授業や会話では、数字をふつうの英語で読みます。無線では、聞き違えないように、決まった読み方をします。</p>
${bk.t(['書き方', '授業・会話の例', '米国の無線の読み方'], [
  ['100 kt', 'one hundred knots', 'one zero zero knots'],
  ['3,500 ft', 'three thousand five hundred feet', 'three thousand five hundred'],
  ['10,000 ft', 'ten thousand feet', 'one zero thousand'],
])}
<p>表の無線の読み方は、米国の AIM の次の決まりによります。</p>
<ul><li>速度：数字を 1 けたずつ言い、最後に knots を付けます（米国の AIM 4-2-11）。</li>
<li>18,000 ft 未満の高度：千の位から上を 1 けたずつ言い、thousand を付けます（米国の AIM 4-2-9）。百の位は、five hundred のように続けます。10,000 ft なら、1 と 0 を言って one zero thousand です。米国の AIM の高度の例は、feet を付けていません。</li></ul>
<p>無線の数字の読み方の決まりは、${bk.see('comm.numbers', '予告：数字の言い方（第 1 部）')} にまとめてあります。</p>
<p>単位も、英語の名前で言います。kt（ノット）は、1 時間に何海里（NM：nautical mile）進むかで表す速さの単位です。knot という語に「1 時間あたり」がもう入っているので、“knots per hour” とは言いません。</p>
${bk.t(['記号', '英語の言い方', '日本語'], [
  ['kt', 'knots', 'ノット'], ['ft', 'feet', 'フィート'], ['ft/min（fpm）', 'feet per minute', '1 分あたりのフィート'], ['NM', 'nautical miles', '海里'], ['SM', 'statute miles', '法定マイル'],
  ['inHg', 'inches of mercury', 'インチ水銀柱（mercury は水銀）'], ['hPa', 'hectopascals', 'ヘクトパスカル'], ['℃', 'degrees Celsius', 'セルシウス度（摂氏）'], ['lb', 'pounds', 'ポンド'], ['US gal', 'gallons', '米ガロン'],
])}
<h4>英国と米国の書き方</h4>
<p>米国と英国では、同じ英語でも書き方が違うものがあります。</p>
${bk.t(['項目', '米国', '英国'], [
  ['飛行機・離陸のつづり', 'airplane・takeoff', 'aeroplane・take-off'],
  ['「待って」のつづり', 'stand by', 'standby'],
  ['日付 7/4/2026 の意味', '7 月 4 日（月が先）', '4 月 7 日（日が先）'],
])}
<p>無線の言い方にも違いがあります。「はい」は、米国の FAA の用語集では affirmative、英国の CAP 413 では affirm です。周波数などの小数点は、米国の AIM では point、英国の CAP 413 では decimal と言います。ほかの違いは ${bk.see('comm.icao', '予告：FAA と ICAO（英国）の言い方の違い（第 1 部）')} にあります。</p>
<p>${bk.est('ロンドンの座学が、どちらの書き方と言い方で教えるかは、公開されていません。')}最初の授業で、どちらで書くか、どちらで言うかを確かめます。日付は、月を英語の名前（Jul など）で書くと、取り違えません。</p>
<h4>立場の差があっても言う</h4>
<p>上の立場の人に、質問や反対を言いにくいと感じる人がいます。その感じ方の強さは、国の文化によって違います。</p>
<p><b>権力格差（power distance）</b>は、上司と部下の力の差を、部下の側がどれだけ大きく感じるかの尺度です。航空の安全の知識を集めた資料集 SKYbrary は、研究者 Hofstede のこの定義を挙げています。そして、英国などの権力格差の小さい国の例として、部下が上司に話しかけ、必要なら反対することを気楽に感じる、と書いています。</p>
<p>権力格差は、国の文化の傾向を表す言葉です。これに対して、権威勾配（authority gradient）は、その場のチームの中で、決める力がどれだけ 1 人に集まっているかを表します。1 人に集まるほど、勾配は急になります（SKYbrary）。</p>
<p>この本は、国ごとの点数や日本の位置を書きません。どちらの感じ方がよい、という話でもありません。訓練では、分からないことと気になることを、言葉にして伝えます。操縦教員と訓練生の間の権威勾配と、懸念の伝え方は ${bk.see('crm.crm', '予告：権威勾配と懸念の伝え方（第 6 部）')} で学びます。</p>
<p>英語が得意でなくても、短い型で言えます。</p>
<ul><li>“Excuse me, I have a question.”（質問があります）</li>
<li>“I'm not sure about the clouds ahead.”（前の雲が大丈夫か分かりません）</li>
<li>“I'm concerned about our fuel.”（燃料が気になります）</li>
<li>“Can we turn back?”（引き返しませんか）</li></ul>
<p>気づいたことは、早く・短く・具体的に言います。言いにくいことほど、早く言います。</p>
${bk.key('分からないまま “Yes” と言わない。分からない所を言う', '授業はふつうの英語、無線は決まった言葉と読み方', '気になることは、立場の差があっても早く短く言う')}
${bk.warn('<b>ここに注意：</b>この節の英文は、言い方の例です。無線の言葉と数字の読み方は、その国の決まり（米国は FAA、英国は CAA の CAP 413）と、学校の手順で確かめます。')}
${bk.us('<p>米国の 14 CFR は、学生操縦士（student pilot）の資格と自家用操縦士（private pilot）の資格の条件の 1 つに、英語の力を挙げています。英語を読み・話し・書き・理解できることです（61.83(c)・61.103(c)）。</p><p>米国の FAA の手引きの文書（AC：Advisory Circular）60-28B は、米国の航空英語の基準（AELS：Aviation English Language Standard）を示しています。この基準は、ICAO の言語の力の評価で、実用レベル（レベル 4、Operational Level 4）以上です。ICAO の評価はレベル 1〜6 の 6 段階で、レベル 4 は無線電話の通信に要る最低のレベルです。</p><p>米国の AC 60-28B は、学生操縦士の申請・単独飛行の承認・実地試験（practical test）の前に、この英語の力を確かめるとしています。訓練の間も、操縦教員・座学の教官と訓練校が見続けます。基準の 1 つは、誤解に気づいたときに、確かめたり聞き直したりして解けることです。ログブックの承認や訓練の記録も、英語で書きます。</p>')}
${bk.q('授業の終わりに、座学の教官から “Any questions?” と聞かれた。説明の後半が分からなかった。何と言う？', '“Yes. I didn\'t understand the second part, about … . Could you explain it again?” のように、分からない所を具体的に言います。黙っていると、分かったと受け取られます。')}
${bk.sim('数字の読み方は課目「英語交信①：アルファベットと数字の言い方」で、英語の聞き取りは課目「英語交信④：聞き取り（音声）」で練習できます。', ['k3', '英語交信①'], ['k6', '英語交信④'])}` },
    ],
    terms: [
      ['Official name / common name', '正式名・通称', 'この本の用語の書き方。正式名は日本の学科試験の資料と法令の書き方、通称はふだんの言い方'],
      ['Abbreviation', '略語', '多くは英語の言葉の頭文字。この本は初出で「正式名（略語：English）」と開く'],
      ['Phraseology', '標準用語', '無線で使う、意味の決まった言葉（米国は Pilot/Controller Glossary、英国は CAP 413）'],
      ['Plain language', 'ふつうの言葉', '標準用語で言えないときに使う、短い英語'],
      ['Say again / Speak slower / Unable', 'もう一度・ゆっくり・従えない', '無線の標準用語。Unable には理由を添える'],
      ['Ground instructor / flight instructor', '座学の教官・操縦教員', '座学で教える人と、飛行訓練で操縦を教える人'],
      ['Power distance', '権力格差', '上司と部下の力の差を、部下の側がどれだけ大きく感じるか（Hofstede の定義）。国の文化の傾向'],
      ['Authority gradient', '権威勾配', 'その場のチームの中で、決める力がどれだけ 1 人に集まっているか'],
      ['Aviation English Language Standard (AELS)', '米国の航空英語の基準', 'FAA の AC 60-28B。ICAO の実用レベル（レベル 4）以上'],
    ],
    examples: [
      '補助翼（エルロン、aileron）：日本の学科試験の資料の名前・ふだんの言い方・英語の授業の言い方。',
      '聞き取れなかったとき：授業では “Could you say that again, please?”、無線では “Say again.”。',
      '速度 100 kt は、授業では one hundred knots、米国の無線では one zero zero knots と読む。',
    ],
    cautions: [
      'この章の英文は言い方の例です。無線の言葉と読み方は、その国の決まりと学校の手順で確かめます。',
      '分からないまま “Yes” と答えないでください。分からないことは、その場で聞き直します。',
    ],
    quiz: [
      { q: '「補助翼」「エルロン」「aileron」の関係で、正しいものは？', choices: ['3 つとも、同じものを指す名前', '補助翼は旅客機だけにある部品の名前', 'エルロンは英国だけで使う英語', 'aileron は ICAO の資料だけの言葉'], answer: 0, why: '正式名（日本の学科試験の資料と法令）・通称（ふだんの言い方）・英語（米国の FAA の資料と英語の授業）は、同じものの 3 つの名前（「用語の三つ組みと略語」の節。用語の表は国土交通省の学科試験の出題範囲参考などで確かめた）。' },
      { q: '授業で、座学の教官の説明の一部が分からなかった。いちばんよい言い方は？', choices: ['“Yes.” と答えて、あとで自分で調べる', '“I don\'t understand.” とだけ言う', '“I didn\'t understand the part about … . Could you explain it again?”', '黙ってうなずく'], answer: 2, why: '分かったふりをせず、分からない所を具体的に言う。“Yes” やうなずきは、伝わったと受け取られる（「英語の授業と教官との話し方」の節）。' },
      { q: '米国の無線で、速度 100 kt の読み方は？', choices: ['one hundred knots', 'one zero zero knots', 'one zero zero knots per hour', 'a hundred knots'], answer: 1, why: '米国の AIM 4-2-11 は、速度を 1 けたずつ言い、knots を付けるとしている。knot という語に「1 時間あたり」が入っているので、per hour は付けない（「英語の授業と教官との話し方」の節）。' },
      { q: '無線の標準用語 “Unable” の意味は？', choices: ['聞き取れなかった', '少し待って', '最後の送信を受け取った', '指示・要求・許可に従えない'], answer: 3, why: '米国の Pilot/Controller Glossary と英国の CAP 413 のどちらも、Unable を「指示・要求・許可に従えない」としている。CAP 413 は、ふつう理由を添えるとしている（「英語の授業と教官との話し方」の節）。' },
    ],
    written: [
      ['正式名・通称・英語の 3 つを、補助翼を例に説明し、それぞれどこで会う名前かを答えてください。', `正式名の補助翼は日本の学科試験の資料と法令、通称のエルロンはふだんの日本語の会話、英語の aileron は英語の授業と米国の FAA の資料の名前です。${bk.see('en.terms', '用語の三つ組みと略語')}`],
      ['指示対気速度を、その章で初めて書くときの形で書いてください。', `指示対気速度（IAS：indicated airspeed）。略語は、初めて出るところで「正式名（略語：English）」と開きます。${bk.see('en.terms', '略語')}`],
      ['着陸復行と進入復行は、同じものですか。', `違います。着陸復行（go-around）は、着陸をやめてやり直すことです。進入復行（missed approach）は、計器進入（計器を頼りに滑走路へ向かう、決められた飛び方）を着陸まで続けられないときの、決められた手順です。${bk.see('en.terms', '取り違えやすい組')}`],
      ['授業で分からないことがあったとき、“I don\'t understand.” だけでなく、何を言うとよいですか。例を 1 つ挙げてください。', `どこが分からないかを言います。例：“I didn't understand the part about the fuel system. Could you explain it again?” 自分の言葉で言い直して確かめるのもよい方法です。${bk.see('en.class', '英語の授業と教官との話し方')}`],
      ['授業と米国の無線で、数字の読み方が違うのはなぜですか。例を 1 つ挙げてください。', `無線では、聞き違えないように、決まった読み方をします。例：10,000 ft は、授業では ten thousand feet、米国の無線では one zero thousand です。${bk.see('en.class', '数字と単位の言い方')}`],
      ['英国と米国で違う書き方を 2 つ挙げてください。ロンドンの座学では、どうしますか。', `例：aeroplane と airplane、日付 7/4/2026（英国は 4 月 7 日、米国は 7 月 4 日）。座学がどちらで教えるかは公開されていないので、最初の授業で確かめます。${bk.see('en.class', '英国と米国の書き方')}`],
      ['飛行中に前の雲が気になりました。操縦教員に伝える短い英語を作ってください。', `例：“I'm not sure about the clouds ahead. Can we turn back?” 早く・短く・具体的に言います。${bk.see('en.class', '立場の差があっても言う')}`],
    ],
    refs: [R.mlitSyllabus, R.pcg, R.aim42, R.cap413, R.caaRole, R.unSystem, R.cfr61, R.cfr1, R.cfr12, R.ac6028b, R.jcabElp, R.ana1, R.afh, R.skySocio, R.skyAbout, R.authGrad, R.nist811, R.cambridgeDates, R.cambridgeMeas],
    lessons: ['k3', 'k6'] });
  }
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
