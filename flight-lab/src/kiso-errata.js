// FLIGHT LAB — kiso-errata.js : FL.kisoErrata, what the basic course's page (pages.js renderKiso) shows over the original
// 「パイロット基礎教材」第 3 版 (kiso/kiso-data.js: never edited, kept byte for byte; textbook/rewrite/combined/DESIGN.md
// 6.1「基礎教材（原本）のページ」, 6.2 rule 12, 5 章の基準 10, 10.2).
//   items       the corrections shown over the original (訂正の重ね表示): the safety and Japanese-law rows of DESIGN 10.2
//               (ledger textbook/rewrite/combined/ledgers/ERRATA.json, the rows with `overlay`). Each one names the
//               ledger rows it comes from (rows), the places it is shown at (at: a section id 'kiso06.18', a written
//               question by its record key 'kiso08.q11', a chapter's sources tab 'kiso11.src'), what the original says
//               (says), the correction (fix: one paragraph each) and its primary sources (src), read on CHECKED.
//               A Japanese rule's number is the e-Gov copy's (textbook/rewrite/sources/egov/, the versions pinned there);
//               what could not be read in a primary source says 〔要確認〕 and gives no number (DESIGN 3.4).
//               jur names the FL.jur rows (book-jur.js) that hold the same rule, so a test can hold the two together.
//               The page draws them outside the original's text (.kz-body): the original is never rewritten.
//               Every correction, these and the rest of DESIGN 10.2, is listed for the owner's Word original in
//               textbook/rewrite/combined/ERRATA-FOR-WORD.md.
//   HELD        the overlay rows that are not drawn, each with the reason (nothing checked to put over the original).
//   questions(c) the chapter's written questions rebuilt from its questionsHtml / answersHtml (the original's own
//               question pages), because the per-question data (c.qa) lost its headings in conversion: 188 of the 376
//               questions start with a stray </b> and the title's number and <b> gone (kiso01・02・03・06・08・10・11),
//               and the next group's instructions sit at the end of the question before (DESIGN 10.2 overview K1・aero
//               K-1). The numbers, the count and the record keys stay those of c.qa ("kiso05.q1"): the rebuild is
//               checked against c.qa and returns null (the page then shows c.qa as it is) when they do not agree.
// Plain text only in items (the page escapes it). Data and pure functions: no DOM, nothing else read, so the Node tests
// load it on its own (flight-lab/test/flight.test.mjs). FLIGHT LAB only: TEXTBOOK and CADET do not have the basic
// course's page.
(function (FL) {
  'use strict';
  const CHECKED = '2026-10-27';

  // ---- the primary sources --------------------------------------------------------------------------------------
  const EGOV_LAW = 'https://laws.e-gov.go.jp/law/327AC0000000231/20251201_507AC0000000055';      // 航空法 令和 7 年 12 月 1 日施行
  const EGOV_RULE = 'https://laws.e-gov.go.jp/law/327M50000800056/20261001_508M60000800082';     // 航空法施行規則 令和 8 年 10 月 1 日施行
  const law = (label, anchor) => ({ t: `航空法${label}（e-Gov、令和 7 年 12 月 1 日施行の版）`, url: `${EGOV_LAW}#${anchor}` });
  const rule = (label, anchor) => ({ t: `航空法施行規則${label}（e-Gov、令和 8 年 10 月 1 日施行の版）`, url: `${EGOV_RULE}#${anchor}` });
  const ecfr = s => ({ t: `14 CFR ${s}（eCFR）`, url: `https://www.ecfr.gov/current/title-14/section-${s}` });
  const AIM = ch => `https://www.faa.gov/air_traffic/publications/atpubs/aim_html/${ch}.html`;
  const AFH13 = { t: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 13 章', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/14_afh_ch13.pdf' };
  const JMA_CODE = { t: '気象庁「航空気象通報式」第 3 版（改正第 17 号、令和 7 年 8 月 7 日）', url: 'https://www.jma.go.jp/jma/kishou/books/tsuhoshiki/koukuu/koukuu3_17.pdf' };
  const JMA_HND_P = { t: '気象庁 東京航空地方気象台「WEATHER TOPICS 第 54 号 気圧の観測について」（2015 年）', url: 'https://www.data.jma.go.jp/haneda-airport/weather_topics/file/rjtt_wt20151030.pdf' };

  const KINDS = Object.freeze({ safety: '〔安全〕', law: '日本の法令', system: '日本の制度・情報', source: '出典' });

  const ITEMS = [
    // ---------------------------------------------------------------- 〔安全〕
    { id: 'fuel-vfr', rows: ['K.wb-perf.K4', 'K.navigation.K1'], kind: 'safety', jur: ['fuel.vfr'],
      at: ['kiso06.18', 'kiso08.11', 'kiso08.q11', 'kiso08.q25'],
      title: '法定の予備燃料があるのは一部の飛行だけです',
      says: '「法定予備燃料は別に扱う」「法定予備燃料などは別に評価」と書き、自家用・訓練の有視界飛行方式（VFR）にも法定の量があるように読めます。',
      fix: [
        '日本の航空法第 63 条が燃料の量を決めているのは、航空運送事業の飛行と計器飛行方式（IFR）の飛行だけです。量は航空法施行規則第 153 条の表にあります。',
        '自家用・訓練の VFR には、法令で決めた最低の量がありません。機長は出発前に、燃料の搭載量と品質を確かめます（航空法第 73 条の 2・施行規則第 164 条の 15）。訓練では学校の決まりにも従います。',
        '米国では VFR にも最低の量があります。最初の着陸予定地まで飛び、さらに通常の巡航速度で昼は 30 分、夜は 45 分飛べる燃料です（14 CFR 91.151）。',
      ],
      src: [law('第 63 条', 'Mp-Ch_6-Se_1-At_63'), rule('第 153 条', 'Mp-Ch_6-At_153'), law('第 73 条の 2', 'Mp-Ch_6-Se_1-At_73_2'), rule('第 164 条の 15', 'Mp-Ch_6-At_164_15'), ecfr('91.151')] },
    { id: 'alcohol', rows: ['K.human.K5'], kind: 'safety', jur: ['alcohol'],
      at: ['kiso10.12'],
      title: '飲酒の決まり（航空法第 70 条と国の基準）',
      says: '「適用法令と運航者の基準を守り」とだけ書き、日本の条文と数値を示していません。',
      fix: [
        '航空法第 70 条：航空機乗組員は、アルコールや薬物の影響で正常な運航ができないおそれがある間は、航空業務を行ってはいけません。',
        '国土交通省の通達（平成 31 年 1 月 31 日 国空航第 2278 号）は、原則として、体内にアルコールがある状態では航空業務を行わないとしています。',
        '血液 1 L あたり 0.2 g 以上、または呼気 1 L あたり 0.09 mg 以上は、正常な運航ができないおそれがある状態の目安です（同じ通達）。',
        'この基準は、自家用操縦士を含むすべての航空機乗組員に当てはまります。通達のその後の改正は〔要確認〕です。',
      ],
      src: [law('第 70 条', 'Mp-Ch_6-Se_1-At_70'), { t: '国土交通省 航空局「航空法に基づく操縦士の飲酒基準を設けました」（2019 年 2 月 4 日）', url: 'https://www.mlit.go.jp/common/001271835.pdf' }, { t: '国土交通省 報道発表「航空局所属の操縦士に対する不利益処分について」（令和 2 年 4 月 28 日。通達の名前と番号）', url: 'https://www.mlit.go.jp/report/press/kouku10_hh_000191.html' }] },
    { id: 'circling-lost-visual', rows: ['K.ifr.K-2'], kind: 'safety',
      at: ['kiso12.25', 'kiso12.q25'],
      title: '周回進入で目視物標を失ったら',
      says: '「図を見ずに一律の旋回方向を覚えるのは危険です」とだけ書き、共通の原則を書いていません。',
      fix: [
        '周回進入（circling approach）の途中で目視物標を失ったら、その方式の進入復行（missed approach）に従います。',
        '進入復行のコースに乗るため、まず着陸する滑走路へ向かって上昇旋回し、コースに乗るまで旋回を続けます（米国の AIM 5-4-21）。',
        '周回はどちら回りでもできるので、そのあとの経路は、見失った位置で変わります。左右の向きを決めて覚えるのではない、というのはこの意味です。',
        '日本の AIP での書き方は〔要確認〕です。',
      ],
      src: [{ t: 'FAA Aeronautical Information Manual 5-4-21 Missed Approach', url: AIM('chap5_section_4') }] },
    { id: 'engine-id', rows: ['K.multi.K-1'], kind: 'safety',
      at: ['kiso13.3', 'kiso13.22', 'kiso13.q22'],
      title: '止まったエンジンの特定は、まず足で',
      says: '「足にかかる力や機首の偏りは手掛かりになりますが、それだけで停止するエンジンを決めません」「計器と機体の反応を照合します」と書き、計器を先に見るように読めます。',
      fix: [
        '小型のピストン双発機では、止まったエンジンは、まっすぐ飛ぶのに要る操舵で特定します。エンジン計器では特定しません（AFH 13-32）。',
        '方向を保つために踏んでいる足の側が、生きているエンジンです。遊んでいる足の側が、止まったエンジンです（dead foot, dead engine。AFH 13-33）。',
        '止まり方によっては、エンジン計器では早く確実には特定できません（AFH 13-33）。',
        '特定したら、止まったと思うエンジンのスロットルを絞ります。性能が変わらなければ、特定が正しいと確かめられます。そのあとで、そのプロペラをフェザーします（AFH 13-32）。',
      ],
      src: [AFH13] },
    { id: 'zero-sideslip', rows: ['K.multi.K-2'], kind: 'safety',
      at: ['kiso13.8'],
      title: 'ボールを中央に置いても、横滑りはゼロになりません',
      says: '「ボールを中央に置けば、片発時にも必ず横滑りがゼロになるとは限りません」「ボールがわずかに中央を外れる機体があります」と弱く書いています。',
      fix: [
        '片発で翼を水平にしてボールを中央に置くと、止まったエンジンの側へ中くらいの横滑りが残ります。上昇性能が下がり、最小操縦速度（Vmc）も公表の値よりかなり高くなります（AFH 13-28）。',
        '横滑りがゼロで上昇性能がいちばんよいのは、生きているエンジンの側へ約 2° バンクし、ボールを生きている側へ 1/3〜1/2 ずらした状態です（AFH 13-29）。',
        'バンクの角度は機種で 1.5〜2.5° と違います。これは VYSE で飛び、止まったプロペラをフェザーしたピストン双発機の目安です。POH の指示が優先します（AFH 13-29）。',
      ],
      src: [AFH13] },
    { id: 'hf-hyperventilation', rows: ['K.human.K1'], kind: 'safety',
      at: ['kiso10.3'],
      title: '過呼吸の定番の対処',
      says: '「訓練した方法で対応します」とだけ書き、覚えておく行動を書いていません。',
      fix: [
        '過呼吸（過換気、hyperventilation）は、呼吸の速さと深さを意識して整えると、数分で治まります（米国の AIM 8-1-3）。',
        '酸素を使っているときは、過呼吸と低酸素症の区別がつきません。まず酸素を 100% にし、装置が働いているかを確かめてから、呼吸を整えます（AIM 8-1-3）。',
      ],
      src: [{ t: 'FAA Aeronautical Information Manual 8-1-3 Hyperventilation in Flight', url: AIM('chap8_section_1') }] },
    { id: 'hf-ear', rows: ['K.human.K1'], kind: 'safety',
      at: ['kiso10.4'],
      title: '耳の圧力を合わせる定番の方法',
      says: '耳の痛みについて、圧力を合わせる方法を書いていません。',
      fix: [
        '降下中は、つばを飲む・あくびをする・のどの筋肉に力を入れるなどで、耳管を開きます（米国の AIM 8-1-2）。',
        'それでもだめなら、口を閉じて鼻をつまみ、鼻から息を出そうとします（バルサルバ法。AIM 8-1-2）。',
      ],
      src: [{ t: 'FAA Aeronautical Information Manual 8-1-2 Effects of Altitude（Ear Block）', url: AIM('chap8_section_1') }] },
    { id: 'hf-disorientation', rows: ['K.human.K1'], kind: 'safety',
      at: ['kiso10.6'],
      title: '空間識失調を防ぐのは、外の目標か計器だけです',
      says: '「訓練に沿って姿勢計などを相互に確認し」と書き、何に頼るかをはっきり書いていません。',
      fix: [
        '錯覚による空間識失調（spatial disorientation）を防げるのは、地上の確かな目標か飛行計器を見ることだけです（米国の AIM 8-1-5）。',
        '外が見えないときは、体の感覚ではなく、飛行計器に合わせて操縦します。',
      ],
      src: [{ t: 'FAA Aeronautical Information Manual 8-1-5 Illusions in Flight', url: AIM('chap8_section_1') }] },
    { id: 'hf-co', rows: ['K.human.K1'], kind: 'safety',
      at: ['kiso10.9'],
      title: '一酸化炭素を疑ったら、暖房を切って換気',
      says: '「対象機で定められた手順に従います」とだけ書き、すぐにする行動を書いていません。',
      fix: [
        '暖房を使っていて、排気のにおい・頭痛・眠気・めまいがあれば、一酸化炭素中毒を疑います（米国の AIM 8-1-4）。',
        'すぐに暖房を切り、通気口を開けます。症状が重いか、着陸後も続くときは、医療を受けます（AIM 8-1-4）。',
      ],
      src: [{ t: 'FAA Aeronautical Information Manual 8-1-4 Carbon Monoxide Poisoning in Flight', url: AIM('chap8_section_1') }] },
    // ---------------------------------------------------------------- 日本の法令
    { id: 'pic', rows: ['K.overview.K2'], kind: 'law',
      at: ['kiso00.02'],
      title: '機長は職位だけでなく、法令上の役割です',
      says: '「機長と副操縦士は職位です」と書き、法令上の役割としての機長（PIC）を説明していません。',
      fix: [
        '航空法では、機長は、その航空機に乗り組んで職務を行う者を指揮監督します（第 73 条）。出発前には、航空機が航行に支障がないことなどを確かめます（第 73 条の 2）。',
        '米国の 14 CFR では、機長（pilot in command）は飛行の前か途中で指名された人で、その飛行の運航と安全に最終の権限と責任を持ちます（1.1・91.3）。',
        'だから、職位（キャプテン・副操縦士）、法令上の役割（機長）、操作の役割（PF・PM）の 3 つを分けて考えます。',
      ],
      src: [law('第 73 条', 'Mp-Ch_6-Se_1-At_73'), law('第 73 条の 2', 'Mp-Ch_6-Se_1-At_73_2'), ecfr('1.1'), ecfr('91.3')] },
    { id: 'vmc', rows: ['K.law.kiso09-9'], kind: 'law', jur: ['vmc', 'vmc.ad', 'svfr'],
      at: ['kiso09.9', 'kiso00.14'],
      title: '有視界気象状態の全部の区分と、特別有視界飛行方式',
      says: '数値を 3,000 m 以上の 1 区分だけ書き、特別有視界飛行方式を扱っていません（第 0 章 14 節は「法規と運航方式の章で扱います」と予告しています）。',
      fix: [
        '航空法施行規則第 5 条の有視界気象状態は、次の区分ごとに決まっています。地表か水面から 300 m 以下の区分と、離着陸の区分に当たるときは、そちらの条件です。',
        '3,000 m 以上：飛行視程 8,000 m 以上。上方と下方に各 300 m、水平に 1,500 m の範囲に雲がない。',
        '3,000 m 未満で管制区・管制圏・情報圏を飛ぶとき：飛行視程 5,000 m 以上。上方 150 m・下方 300 m・水平 600 m の範囲に雲がない。',
        '3,000 m 未満でそれ以外の空域：飛行視程 1,500 m 以上。雲との距離は上と同じ。',
        '管制区・管制圏・情報圏の外で、地表か水面から 300 m 以下：飛行視程 1,500 m 以上。雲から離れて飛べ、地表か水面を見続けられる（ヘリコプターなどの扱いは条文で確かめる）。',
        '管制圏・情報圏の空港等（ほかに告示で指定した空港等）で離着陸するとき：地上視程 5,000 m 以上・雲高 300 m 以上。管制圏の空港等で告示で指定したものは 8,000 m・450 m です（どの空港かは〔要確認〕）。',
        '特別有視界飛行方式（航空法第 94 条ただし書・施行規則第 198 条の 4）：許可を受けて管制区・管制圏・情報圏を飛ぶときは、雲から離れ、飛行視程 1,500 m 以上を保ち、地表か水面を見続け、管制機関などと常時連絡を保ちます。許可に別の条件が付いたときは、それに従います。',
      ],
      src: [rule('第 5 条', 'Mp-Ch_1-At_5'), law('第 94 条', 'Mp-Ch_6-Se_1-At_94'), rule('第 198 条の 4', 'Mp-Ch_6-At_198_4')] },
    { id: 'atc-services', rows: ['K.law.kiso09-16'], kind: 'law',
      at: ['kiso09.16'],
      title: '管制業務は 5 種類です',
      says: '飛行場管制業務・ターミナル・レーダー管制業務・航空路管制業務の 3 つで説明しています。',
      fix: [
        '航空法施行規則第 199 条の管制業務は 5 種類です：航空路管制業務・飛行場管制業務・進入管制業務・ターミナル・レーダー管制業務・着陸誘導管制業務。',
        '進入管制業務は、計器飛行方式などで離陸後に上昇する機や、着陸のために降下する機への管制業務です。同じ機にレーダーを使って行うのがターミナル・レーダー管制業務です。',
        '着陸誘導管制業務は、計器飛行方式の機をレーダーで着陸へ誘導する管制業務です。',
      ],
      src: [rule('第 199 条', 'Mp-Ch_6-At_199')] },
    { id: 'nordo', rows: ['K.law.kiso09-26'], kind: 'law', jur: ['nordo.vfr', 'nordo.ifr', 'light'],
      at: ['kiso09.26'],
      title: '通信機が故障したときの航行',
      says: '「航空法施行規則第 206 条と航空情報にある手順を…学びます」とだけ書き、中身を書いていません。',
      fix: [
        '管制区・管制圏・情報圏で通信機が故障し、有視界気象状態にあるとき：有視界気象状態を保って飛び続け、安全に着陸できると思われる最寄りの空港等に着陸し、直ちに管制業務を行う機関に通報します（航空法施行規則第 206 条第 1 号）。',
        '計器飛行方式で飛んでいて最寄りの空港等への着陸が難しいときや、計器気象状態のときは、同じ条の第 2 号〜第 4 号の方法です（承認を受けた航路・高度・待機・降下を始める時刻）。',
        'トランスポンダーのコード 7600 と灯火信号は、航空法と施行規則の本文にありません。日本の扱いは〔要確認〕（AIP Japan）です。',
      ],
      src: [rule('第 206 条', 'Mp-Ch_6-At_206')] },
    { id: 'min-safe-alt', rows: ['K.law.kiso09-14'], kind: 'law',
      at: ['kiso09.14'],
      title: '最低安全高度の数値（施行規則第 174 条）',
      says: '仕組みは正しく説明していますが、地域ごとの数値を書いていません。',
      fix: [
        'VFR の最低安全高度は、動力装置だけが止まったときに地上・水上の人や物件に危険を及ぼさずに着陸できる高度と、次の高度のうち、高いほうです（航空法第 81 条・施行規則第 174 条）。',
        '人や家屋の密集している地域：航空機を中心に水平 600 m の範囲で、最も高い障害物の上端から 300 m。',
        '人や家屋のない地域と広い水面：地上・水上の人や物件から 150 m 以上離れて飛べる高度。',
        'それ以外の地域：地表か水面から 150 m 以上。IFR は告示で定める高度です。',
      ],
      src: [law('第 81 条', 'Mp-Ch_6-Se_1-At_81'), rule('第 174 条', 'Mp-Ch_6-At_174')] },
    { id: 'ifr-recency', rows: ['K.ifr.K-3'], kind: 'law', jur: ['ir.recent'],
      at: ['kiso12.2'],
      title: '計器飛行の最近の飛行経験は第 69 条です',
      says: '第 34 条（計器飛行証明）の話の中で「最近の飛行経験など」と書き、根拠の条と中身を示していません。',
      fix: [
        '最近の飛行経験は、航空法第 69 条と施行規則第 161 条です。',
        '計器飛行を行う人は、操縦する日からさかのぼって 180 日までの間に、6 時間以上の計器飛行（模擬計器飛行を含む）の経験が要ります。',
        '模擬飛行装置や飛行訓練装置を、国土交通大臣の指定する方式で操作した経験も、計器飛行の経験とみなします。',
      ],
      src: [law('第 69 条', 'Mp-Ch_6-Se_1-At_69'), rule('第 161 条', 'Mp-Ch_6-At_161'), law('第 34 条', 'Mp-Ch_4-At_34')] },
    { id: 'ifr-fuel', rows: ['K.ifr.K-5'], kind: 'law', jur: ['fuel.ifr'],
      at: ['kiso12.3'],
      title: '一般の飛行機の IFR の燃料は、日本も 45 分です',
      says: '「米国の予備燃料の数値を日本の基準へ流用しません」と書き、日米で数値が違うように読めます。',
      fix: [
        '航空運送事業でない飛行機が計器飛行方式で飛ぶとき：着陸地まで（代替空港等を飛行計画に書くときはそこまで）飛ぶ燃料に、巡航高度で 45 分飛べる燃料を足します（航空法施行規則第 153 条の表の六）。',
        '米国も、最初の着陸予定地まで（要るときは代替空港まで）飛び、さらに通常の巡航速度で 45 分飛べる燃料です（14 CFR 91.167）。',
        '数字が同じでも、根拠はそれぞれの国の条文で確かめます。航空運送事業の飛行機の量は、同じ表の別の行です。',
      ],
      src: [rule('第 153 条', 'Mp-Ch_6-At_153'), ecfr('91.167')] },
    { id: 'alt-setting-japan', rows: ['K.instruments.gap-1'], kind: 'law', jur: ['alt.transition'],
      at: ['kiso04.6', 'kiso04.7'],
      title: '日本の高度計規正（14,000 ft）と、METAR の inHg',
      says: '規正値を hPa だけで扱い、日本の 14,000 ft の決まりと、METAR の inHg の併記に触れていません。',
      fix: [
        '平均海面から 14,000 ft 未満で飛ぶときは、経路上の地点の QNH で規正します。出発時に出発地の QNH が得られないときは、出発点の標高で合わせます（航空法施行規則第 178 条）。',
        'それ以外は、標準気圧値 1013.2 hPa で規正します（同じ条）。',
        '日本の METAR は QNH を Q の群（hPa）で報じます。国内向けの国内記事（RMK の後）には、A の群（inHg。例 A2991＝29.91 inHg）も付きます（気象庁 航空気象通報式）。',
      ],
      src: [rule('第 178 条', 'Mp-Ch_6-At_178'), JMA_CODE, JMA_HND_P] },
    // ---------------------------------------------------------------- 日本の制度・情報
    { id: 'msas', rows: ['K.instruments.gap-2'], kind: 'system',   // FL.jur sbas holds MSAS with the magnetic variation
      at: ['kiso04.20'],
      title: '日本の SBAS は MSAS です',
      says: '「SBAS は補強情報を提供し、WAAS はその実装例です」と、米国の WAAS だけを挙げています。',
      fix: [
        '日本の SBAS（Satellite Based Augmentation System）は、国土交通省 航空局の MSAS です。',
        '補強の信号は、準天頂衛星システム「みちびき」3 号機（静止衛星）から送ります。WAAS は米国の SBAS です。',
      ],
      src: [{ t: '国土交通省 報道発表「航空用の衛星航法サービスに利用する『みちびき 3 号機』の打ち上げが成功しました!!」（平成 29 年 8 月 25 日）', url: 'https://www.mlit.go.jp/report/press/kouku16_hh_000008.html' }, { t: '国土交通省 航空局「MSAS（衛星航法補強システム）」（技術の紹介の資料 3-10）', url: 'https://www.mlit.go.jp/koku/cidai/assets/pdf/3-10_JPN.pdf' }] },
    { id: 'taf-format', rows: ['K.weather.K1'], kind: 'system',
      at: ['kiso07.21', 'kiso07.26', 'kiso07.q21'],
      title: '日本の TAF の型（6 時間ごと・30 時間）',
      says: '架空の例「TAF RJTT 150200Z 1503/1609」を、03 UTC から 30 時間の予報として説明しています。',
      fix: [
        '日本の運航用飛行場予報（TAF）は、6 時間ごと（00・06・12・18 UTC）に発表し、有効期間は 30 時間です（気象庁）。',
        '例：TAF RJBB 170505Z 1706/1812（気象庁 関西航空地方気象台の例）。06 UTC に始まる予報を、05:05 UTC に発信しています。',
        '03 UTC に始まる 30 時間の定時の TAF は、この型にありません。発表時刻と有効期間を分けて読む、という説明はそのまま正しいです。',
      ],
      src: [{ t: '気象庁 関西航空地方気象台「飛行場予報（航空気象予報業務）」', url: 'https://www.data.jma.go.jp/kansai-airport/works/yoho/taf/taf.html' }] },
    { id: 'metar-trend-rmk', rows: ['K.weather.K2'], kind: 'system',
      at: ['kiso07.19', 'kiso07.20'],
      title: '日本の METAR の着陸用飛行場予報と国内記事',
      says: '架空の METAR に、着陸用飛行場予報（NOSIG など）と国内記事（RMK）がありません。',
      fix: [
        '日本の METAR には、着陸用飛行場予報（TREND）を付けることがあります。NOSIG（大きな変化なし）か、BECMG・TEMPO で始まる変化を報じます（気象庁 航空気象通報式）。関西国際空港の TREND の有効期間は 2 時間です。',
        '例：METAR RJTT 270230Z 08005KT 040V110 9999 FEW013 SCT040 BKN160 19/16 Q1005 NOSIG（2026 年 10 月 27 日の羽田）。',
        '国内向けには、RMK の後に国内記事が続きます。雲ごとの量・雲形・高さや、A の群（inHg）の QNH などです。例：RMK 1CU025 A2997（気象庁 羽田の資料）。',
      ],
      src: [JMA_CODE, { t: '気象庁 関西航空地方気象台「飛行場予報（航空気象予報業務）」', url: 'https://www.data.jma.go.jp/kansai-airport/works/yoho/taf/taf.html' }, { t: 'aviationweather.gov（NOAA）の RJTT の METAR（2026-10-27 に取得）', url: 'https://aviationweather.gov/api/data/metar?ids=RJTT&hours=2' }, JMA_HND_P] },
    { id: 'llws-japan', rows: ['K.weather.K4'], kind: 'system',
      at: ['kiso07.13'],
      title: '日本の空港のウィンドシャーの情報',
      says: '「空港の検出情報や警報」とだけ書き、どんな仕組みがあるかを書いていません。',
      fix: [
        '日本の空港では、空港気象ドップラーレーダー（DRAW）や空港気象ドップラーライダー（LIDAR）で、低層ウィンドシャー（ウィンドシアー）とマイクロバーストを探知します（気象庁）。',
        '低層ウィンドシャーは、地表からおおむね 500 m（1,600 ft）までのウィンドシャーです（気象庁 中部航空地方気象台）。',
        '羽田空港では、空港低層風情報（ALWIN）が「WS/MB xxKT xNM RWYxx FNA」の形の情報を出します（気象庁 東京航空地方気象台）。',
        'METAR では、WS の群（例 WS R34R・WS ALL RWY）で低層のウィンドシャーを報じます（気象庁 航空気象通報式）。',
      ],
      src: [{ t: '気象庁 中部航空地方気象台「空港気象ドップラーレーダー」', url: 'https://www.data.jma.go.jp/chubu-airport/ymyx/draw.html' }, { t: '気象庁 東京航空地方気象台「WEATHER TOPICS 第 102 号 強風乱流時に発生するマイクロバーストについて」（2026 年 3 月）', url: 'https://www.data.jma.go.jp/haneda-airport/weather_topics/file/rjtt_wt20260324.pdf' }, JMA_CODE] },
    { id: 'swim', rows: ['K.navigation.K2'], kind: 'system',
      at: ['kiso08.16', 'kiso08.src'],
      title: 'AIS JAPAN は終わり、SWIM へ移りました',
      says: '出典 [6] で「AIS JAPAN を SWIM へ統合する旨を案内」と書いています。',
      fix: [
        '国土交通省は、SWIM による情報サービスを 2026 年 3 月 4 日から順に始め、AIS JAPAN を終了しました。AIS JAPAN のノータム検索は 3 月 4 日に終わり、ほかの機能は 3 月 10 日までの案内でした。「統合」ではありません。',
        'インターネットで飛行計画などを扱う SAT サービスも、2026 年 9 月 30 日に終了すると案内されました。入口は SWIM portal です。',
      ],
      src: [{ t: '国土交通省 報道発表「航空情報共有基盤（SWIM）による情報サービスの提供を開始します」（令和 8 年 2 月 24 日）', url: 'https://www.mlit.go.jp/report/press/content/001982794.pdf' }, { t: '国土交通省 航空局からのお知らせ No.108（令和 8 年 1 月 27 日）', url: 'https://www.mlit.go.jp/koku/content/001978778.pdf' }] },
    { id: 'hf-training', rows: ['K.human.K6'], kind: 'law',
      at: ['kiso10.27'],
      title: '技能発揮訓練の義務（日本）',
      says: '出典 [7] に検討会の最終取りまとめを挙げながら、その結論である技能発揮訓練の義務を、本文で説明していません。',
      fix: [
        '航空法の一部改正で、技能発揮訓練を修了していないパイロットは、航空交通管制圏に係る空港等での離着陸等ができなくなります。適用の時期は〔要確認〕です。',
        '技能発揮訓練は、航空機の航行中に管理技能を確実に活用・発揮できるようにするための訓練です。',
        '検討会の最終とりまとめ（令和 8 年 2 月 24 日）の方針は、訓練の間隔 2 年、最低訓練時間 3 時間です。施行規則などの内容は〔要確認〕です。',
      ],
      src: [{ t: '国土交通省 航空局「自家用操縦士等ヒューマンファクターズ訓練検討会 最終とりまとめ（概要）」', url: 'https://www.mlit.go.jp/koku/content/001994977.pdf' }] },
    // ---------------------------------------------------------------- 出典
    { id: 'jcab-syllabus-name', rows: ['K.vfr.E3'], kind: 'source',
      at: ['kiso11.src'],
      title: '出典 [11] の文書の名前',
      says: '出典 [11] を「国土交通省 自家用操縦士 飛行機 学科試験シラバス」と書いています。この名前の文書はありません。',
      fix: [
        '正式な名前は「航空従事者技能証明学科試験出題範囲参考 自家用操縦士（飛行機）」です（国土交通省 航空局）。',
        'この資料は、学科試験の出題範囲を限定するものではないと、自ら書いています。',
      ],
      src: [{ t: '国土交通省 航空局「航空従事者技能証明学科試験出題範囲参考 自家用操縦士（飛行機）」', url: 'https://www.mlit.go.jp/koku/content/001761074.pdf' }] },
    { id: 'struct-part23', rows: ['K.aero.K-2'], kind: 'source',
      at: ['kiso01.26'],
      title: '小型機の制限荷重の出典は Part 23',
      says: '制限荷重と終極荷重の出典 [25] が、輸送機の 14 CFR Part 25 だけです。',
      fix: [
        '小型機の制限荷重と終極荷重は、米国では 14 CFR Part 23 の 23.2230 です。終極荷重は、別の決めがなければ、制限荷重に安全率 1.5 を掛けた荷重です。',
        '日本の基準（航空法施行規則の附属書第一と耐空性審査要領）の値は〔要確認〕です。',
      ],
      src: [ecfr('23.2230')] },
  ];
  // the ledger rows marked for the overlay that are not drawn, and why (〔要確認〕: nothing checked to put over the original).
  // They are in ERRATA-FOR-WORD.md like every other row.
  const HELD = Object.freeze({
    'K.ifr.K-4': '待機の脚の時間（14,000 ft MSL 以下 1 分・それより上 1 分 30 秒）は米国の AIM 5-3-8 で確かめたが、米国が決めているのはインバウンドの脚の時間で、ICAO の PANS-OPS（Doc 8168）の本文と AIP Japan は読めていない。「時間は ICAO と FAA で同じ」とは書けず、原本の「国の規則によって異なる」も誤りと言い切れない〔要確認〕',
    'K.law.kiso09-17': '管制・ATIS が高度計規正値を言う単位は、AIP Japan で確かめられない（UNVERIFIED.json U.qnh-unit）。原本の「単位も含めて確認し」は正しく、重ねて書ける確かな事実がない〔要確認〕',
  });
  for (const it of ITEMS) it.checked = CHECKED;
  const items = Object.freeze(ITEMS.map(it => Object.freeze({ ...it, rows: Object.freeze(it.rows), at: Object.freeze(it.at), fix: Object.freeze(it.fix), src: Object.freeze(it.src.map(s => Object.freeze(s))), jur: Object.freeze(it.jur || []) })));
  const at = place => items.filter(it => it.at.includes(place));
  const places = () => new Set(items.flatMap(it => it.at));

  // ---- the written questions, rebuilt from questionsHtml / answersHtml --------------------------------------------
  // Each block of those pages is one line (h4 or p). A question starts with its number in one of the original's forms:
  //   <p><b>問題 1</b></p>   <p><b>01 翼面積の定義</b></p>   <p><b>1.　</b>本文</p>   <p><b>問 1　</b>本文</p>
  //   <p><b>問 1</b>　本文</p>   <p><b>問 1</b></p>   <p>問 1　本文</p>
  // The number is shown by the page (問 N), so it is taken off; a title in bold stays bold; the rest is kept as written.
  // A number must be the next one expected (1, 2, 3 …), so a line of text that happens to start with a number is text.
  const START = [
    [/^<p><b>問題 (\d+)<\/b><\/p>$/, () => ''],
    [/^<p><b>(\d{1,2}) (.+?)<\/b><\/p>$/, m => `<p><b>${m[2]}</b></p>`],
    [/^<p><b>(\d+)\.　<\/b>(.*)$/, m => `<p>${m[2]}`],
    [/^<p><b>問 (\d+)　<\/b>(.*)$/, m => `<p>${m[2]}`],
    [/^<p><b>問 (\d+)<\/b>　(.*)$/, m => `<p>${m[2]}`],
    [/^<p><b>問 (\d+)<\/b><\/p>$/, () => ''],
    [/^<p>問 (\d+)　(.*)$/, m => `<p>${m[2]}`],
  ];
  // the blocks of one page: { h } a group's heading, { p } a text block outside a question, { n, lines } a question
  function blocks(html) {
    const out = [];
    let next = 1, cur = null;
    for (const line of String(html || '').split('\n')) {
      if (!line.trim()) continue;
      const hm = /^<h4>(.*)<\/h4>$/.exec(line);
      if (hm) { cur = null; out.push({ h: hm[1] }); continue; }
      let started = false;
      for (const [re, keep] of START) {
        const m = re.exec(line);
        if (m && Number(m[1]) === next) { const first = keep(m); cur = { n: next++, lines: first ? [first] : [] }; out.push(cur); started = true; break; }
      }
      if (started) continue;
      if (cur) cur.lines.push(line); else out.push({ p: line });
    }
    return out;
  }
  // { items: [{ kind: 'group', h, html } | { kind: 'q', n, key, q, a, pre, post }] } in the original's order, or null
  //   group  a question group's heading and its instructions (or a note of the question pages, such as 計算の記録)
  //   q      a question; pre / post: the answer pages' notes that go with its answer ([{ h, html }]): a group's opening
  //          words go before the group's first answer, a note group without answers (計算問題の確認基準) after the
  //          answer before it. The answer pages' own group headings (解答と解説 1 …) mirror the question groups and
  //          are not repeated.
  function questions(c) {
    if (!c || !Array.isArray(c.qa) || !c.questionsHtml || !c.answersHtml) return null;
    const Q = blocks(c.questionsHtml), A = blocks(c.answersHtml);
    const qs = Q.filter(b => b.n), as = A.filter(b => b.n);
    const nums = c.qa.map(q => q.n);
    if (qs.length !== nums.length || as.length !== nums.length || qs.some((b, i) => b.n !== nums[i]) || as.some((b, i) => b.n !== nums[i])) return null;
    if (qs.some(b => !b.lines.length) || as.some(b => !b.lines.length)) return null;
    // the answers and the answer pages' notes
    const ans = new Map(as.map(b => [b.n, { a: b.lines.join('\n'), pre: [], post: [] }]));
    let group = null, last = null;
    const flush = () => {
      if (!group) return;
      const html = group.lines.join('\n');
      if (group.first != null && html) ans.get(group.first).pre.push({ h: '', html });
      else if (group.first == null && (html || group.h)) {
        const to = last != null ? ans.get(last).post : (ans.get(nums[0]) || { pre: [] }).pre;
        to.push({ h: group.h || '', html });
      }
      group = null;
    };
    for (const b of A) {
      if (b.h != null) { flush(); group = { h: b.h, lines: [], first: null }; }
      else if (b.p != null) { if (!group) group = { h: '', lines: [], first: null }; if (group.first == null) group.lines.push(b.p); }
      else { if (!group) group = { h: '', lines: [], first: null }; if (group.first == null) group.first = b.n; last = b.n; }
    }
    flush();
    // the question pages in order
    const items = [];
    let g = null;
    const close = () => { if (g) { items.push({ kind: 'group', h: g.h, html: g.lines.join('\n') }); g = null; } };
    for (const b of Q) {
      if (b.h != null) { close(); g = { h: b.h, lines: [] }; }
      else if (b.p != null) { if (!g) g = { h: '', lines: [] }; g.lines.push(b.p); }
      else {
        close();
        const x = ans.get(b.n);
        items.push({ kind: 'q', n: b.n, key: `${c.id}.q${b.n}`, q: b.lines.join('\n'), a: x.a, pre: x.pre, post: x.post });
      }
    }
    close();
    return { items };
  }

  FL.kisoErrata = Object.freeze({ CHECKED, KINDS, HELD, items, at, places, questions, blocks });
})(globalThis.FL = globalThis.FL || {});
