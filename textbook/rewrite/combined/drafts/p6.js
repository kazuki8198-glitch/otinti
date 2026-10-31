// DRAFT (W32, R3) — Part 6's chapters 'crm'「TEM と CRM」, 'jet'「ジェット機の飛び方と自動化」and the new chapter
// 'tsys'「輸送機のシステムとジェットエンジン」(textbook/rewrite/combined/DESIGN.md 3.3 第 6 部 第 38〜40 章, 4.1 rows 25・26,
// 4.2 kiso02・kiso03・kiso04・kiso05・kiso06・kiso10・kiso12・kiso13, 7.2 W32). No product reads this file (DESIGN 6.2 rule 5,
// 7.4). It is a plain script like book-5.js: when the chapters are registered, the B.add(...) of 'crm' and 'jet' below
// replace the ones in flight-lab/src/book-5.js in place (same ids, same place: the first chapters of Part 6, after oei), and
// the B.add of 'tsys' goes right after 'jet' (before the B.add of 'sim', which sits in p0 with before: 'aero'); the figures
// of p6-figs.js go into book-figs.js (FIG; thrustResponse replaces the function of the same name), and the references in
// NEW_R go into book-core.js's R (then `NEW_R.x` → `R.x`). Check them with the figures:
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p6-figs.js textbook/rewrite/combined/drafts/p6.js
// The recalls of ground.crew (crm.pm) and ops.wake (crm.jet) point at Part 2's new sections, which are in W28's drafts
// (drafts/p2a.js, drafts/p2b.js): Part 2 is registered before Part 6 (DESIGN 6.2 rule 13). To check the links resolve:
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p2a-figs.js textbook/rewrite/combined/drafts/p2a.js textbook/rewrite/combined/drafts/p2b-figs.js textbook/rewrite/combined/drafts/p2b.js textbook/rewrite/combined/drafts/p6-figs.js textbook/rewrite/combined/drafts/p6.js
//
// What changed in 'crm' (4 sections: the 3 of the textbook kept with their ids and in their order — tem, crm, pm — and the
// new crm.case after them, DESIGN 3.3):
//  - crm.tem ← kiso10.23: TEM's first use in the FL.terms form, CRM's first use, the go-around's official name; the after-flight
//    review (threat, action, aircraft state, what worked) and kiso10.23's taxi example in a fold; ERRATA K.human.K2 (the
//    branched figure FIG.tem stands for kiso's straight-line TEM figure) and K.human.K3 (the UAS row of the table) closed;
//    考えてみよう before シミュレータ (the form);
//  - crm.crm: unchanged but for the first-use forms;
//  - crm.pm: the 3-step exchange of the flight controls replaced by a recall of its address ground.crew (C.control-handover,
//    DESIGN 3.2: 2 lines); intervention and subtle incapacitation (AC 120-71B 6.6.2.1: no response or correction after two
//    challenges); the US sterile flight deck rule (14 CFR 121.542: critical phases of flight); the FLIGHT LAB note on its
//    one-pilot lessons reworded without the app's words (DESIGN 6.2 rule 10);
//  - ★crm.case ← kiso10.28: one fictional training flight with poor sleep, a hurried passenger and an afternoon of worsening
//    weather — before, during and after the flight in TEM's words; the recalls of hf.self and hf.adm (IMSAFE, PAVE); lesson r1.
// What changed in 'jet' (6 sections: the 3 of the textbook kept with their ids and in their order — crm.jet, crm.auto,
// crm.upset — and the 3 new ones after them: jet.speed, jet.fms, jet.next):
//  - crm.jet: Dutch roll and the yaw damper (PHAK chapter 5, AC 61-107B; figure dutchRoll, new), the wake turbulence classes
//    for ATC (US P/CG: Super, Heavy ≥ 300,000 lb, Large > 41,000 lb, Small ≤ 41,000 lb) in a fold and a recall of ops.wake
//    (C.wake-turbulence); the wing and high-altitude rows of the table shortened, their detail moved to jet.speed;
//  - crm.auto ← kiso04.21・04.22・kiso12.26: the CADET-fixed sentences kept word for word (DESIGN 6.2 rule 9: 「この教材には…
//    自動操縦はありません」「G1000 の表示と手動の操縦で…」, removed by CADET's filter and checked by cadet/test/content.test.mjs);
//    FD / AP / autothrust, the VS mode with too little thrust (AC 120-71B 6.9.1), and what to check after a change; the recall
//    of inst.ap (C.autopilot-modes);
//  - crm.upset: the recall of adm.review (C.surprise-startle); the AC 120-111 paragraph of ERRATA T.overview.T1 kept;
//  - ★jet.speed ← kiso01.26 (latter half)・kiso04.9: Mach number (14 CFR 1.1), the speed of sound with temperature (PHAK
//    chapter 5: 661 kt at 15 °C, 574 kt at −55 °C; NASA: a = √(γRT)), VMO/MMO, critical Mach, shock waves, Mach tuck, Mach
//    buffet and the coffin corner (AFH chapter 16), sweepback (PHAK chapter 5); figure machCrit (new); a 計算演習;
//  - ★jet.fms ← kiso04.23・04.25・04.26: the FMS and its data checked before flight, TCAS I/II (US AIM 4-4-16, 14 CFR 91.123),
//    TAWS (14 CFR 91.223) and the radio altimeter, the airborne weather radar's attenuation (AWH chapter 15) and the age of
//    data-link NEXRAD (US AIM 7-1); figure radarShadow (new);
//  - ★jet.next ← kiso13.27: the frame of what comes after the licence (DESIGN 3.6: no airline SOP or ANA procedure): MCC
//    (UK CAA: 25 h + 20 h), type rating (US 14 CFR 61.31(a)), the ATP CTP (US 14 CFR 61.156), operating experience (US 14 CFR
//    121.434); V1 and V2 (14 CFR 1.2) are not carried over to a small twin; figure careerPath (new).
// The new chapter 'tsys' (5 sections, all new; DESIGN 3.3 第 40 章; no lesson; JCAB 事業用 航空工学 via jcab):
//  - ★tsys.arch ← kiso02.04・02.24・02.25: reading a system diagram, redundancy vs independence, isolation and alternates,
//    the dependency exercise (figure sysDepend = ch02-fig12 redrawn), photo ch02-photo2; MEL (US 14 CFR 91.213) in a box;
//  - ★tsys.power ← kiso02.05・02.07・02.09・02.10・02.12・02.13・02.15: command vs actuating energy (fly-by-wire), generation and
//    buses, hydraulics (figure hydCircuit = ch02-fig5 redrawn; up to 5,000 psi in large transports, AMT), the RAT, transfer and
//    crossfeed, fuel balance, anti-skid / autobrake / carbon brakes (AMT); photos ch02-photo3・ch02-photo5; two 計算演習;
//  - ★tsys.env ← kiso02.16〜02.22: bleed air and the air cycle pack, pressurization (PHAK chapter 7; US 14 CFR 25.841),
//    decompression and the time of useful consciousness (AC 61-107B; the recall of hf.altitude), oxygen (PHAK chapter 7, AMT),
//    anti-ice and deice (PHAK chapter 7), fire detection and extinguishing (AMT chapter 17); figure cabinPress (= ch02-fig10
//    redrawn); photos ch02-photo6・ch02-photo7; ERRATA K.systems.K3 closed (no airline source; the B787 sentence left out);
//  - ★tsys.turbine ← kiso03.19〜03.27: the gas turbine's sections and types, bypass ratio (NASA), instruments (EPR, EGT/ITT/TIT,
//    torque, N1/N2), FADEC, hot / hung start, compressor stall, flameout (PHAK chapter 7); figure turbofanFlow (= ch03-fig3-7・
//    3-8 redrawn); photos ch03-photo5・ch03-photo6; 計算演習;
//  - ★tsys.wb ← kiso05.13・05.7・05.22・kiso06.27: %MAC (W&B handbook; figure macPercent = ch05-fig5-7 redrawn), the weight limits
//    (ramp, takeoff, landing, zero fuel), floor loading and restraint, the runway condition codes (US AIM 4-3-9; UK CAA: GRF)
//    and re-checking performance when conditions change; photos ch05-photo4・ch06-photo6; 計算演習.
// Every section has scope (DESIGN 3.3: all common); US rules in a common section are in sentences that name the country or
// in bk.us. The end-of-chapter questions of crm and jet are in place and order, new ones after them (crm: D・A・C・D; jet:
// A・D・C・D; tsys: D・A・C・D・A). Written questions rewritten from the basic course's qa (crm: kiso10.q23・q28; jet: kiso04.q9・
// kiso12.q26・kiso13.q27; tsys: kiso02.q4・q19〜q24, kiso03.q19〜q27, kiso05.q13). Every claim (number, unit, rule) is in
// p6.claims.json with its tag and source.
(function (FL) {
  'use strict';
  const B = FL.book, R = B.R, bk = B.bk, FIG = FL.bookFigs;
  // jet.speed's 計算演習: the speed of sound a = √(γRT) for air (γ 1.4, R 287 J/(kg·K)) and the Mach number at a TAS
  const sound = T => Math.sqrt(1.4 * 287 * T);
  const f0 = n => Math.round(n).toLocaleString('en-US'), f2 = n => (Math.round(n * 100) / 100).toFixed(2);
  // new references (to be added to book-core.js's R when the chapters are registered; each URL opened on 2026-10-31)
  const NEW_R = {
    ac61107: { label: 'FAA AC 61-107B（Change 1）Aircraft Operations at Altitudes Above 25,000 Feet MSL and/or Mach Numbers Greater Than .75（2015。マッハの言葉・有効意識時間と急減圧のあとの時間・客室高度の警報・乱気流とヨーダンパー）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_61-107B_CHG_1.pdf' },
    cfr121542: { label: '14 CFR 121.542 Flight crewmember duties（大事な飛行の段階：地上滑走・離陸・着陸と、巡航を除く 10,000 ft より下の飛行）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-121/subpart-T/section-121.542' },
    cfr121434: { label: '14 CFR 121.434 Operating experience, operating cycles, and consolidation of knowledge and skills（型式ごとの路線での経験）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-121/subpart-O/section-121.434' },
    cfr25841: { label: '14 CFR 25.841 Pressurized cabins（通常の運航で客室の気圧高度 8,000 ft 以下・逃がし弁・負圧の逃がし弁・計器）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-25/subpart-D/subject-group-ECFRc61d71ee0787390/section-25.841' },
    nasaTurbofan: { label: 'NASA Glenn Research Center: Turbofan Engine（バイパス比 ＝ コアの外を回る空気 ÷ コアを通る空気）', url: 'https://www.grc.nasa.gov/www/k-12/airplane/aturbf.html' },
    nasaSound: { label: 'NASA Glenn Research Center: Speed of Sound（a ＝ √(γRT)。温度は絶対温度）', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/speed-of-sound-interactive/' },
    caaGrf: { label: 'UK Civil Aviation Authority: Contaminated runway reporting system（ICAO の GRF：滑走路を 3 つに分けた評価・RWYCC 6〜0・滑走路状態の報告）', url: 'https://www.caa.co.uk/commercial-industry/aerodromes/safety/runways/contaminated-runway-reporting-system/' },
    caaMcc: { label: 'UK Civil Aviation Authority: Multi-pilot type rating for aeroplanes（最初の多人数操縦の型式限定の前の MCC の課程：学科 25 時間以上・実技 20 時間以上）', url: 'https://www.caa.co.uk/commercial-industry/pilot-licences/ratings/aeroplane-ratings/multi-pilot-type-rating-for-aeroplanes/' },
  };

  // ======================================================================= 第 6 部 第 38 章
  B.add({ id: 'crm', part: 'p6', t: 'TEM と CRM：脅威とエラーを管理し、チームで飛ぶ', en: 'Threat and error management and crew resource management',
    summary: 'TEM（脅威・エラー・望ましくない機体の状態）、CRM（チームで飛ぶための技術と懸念の伝え方）、PF と PM の役割・介入・体調の急変・大事な場面で操縦に集中する決まり、人の要因を 1 つの飛行で通して考える事例。2 人で飛ぶ運航の基礎になる一般的な考え方。',
    secs: [
      { id: 'crm.tem', t: 'TEM：脅威とエラーの管理', scope: 'common', from: ['kiso10.23'], jcab: ['cpl.3.3.3.7', 'ppl.3.3.3.6'], h: () => `
${bk.aim('エラー（error）はゼロにはできません。だから、起きる前提で、脅威は予測して防ぎ、エラーは見つけて直し、望ましくない状態は立て直す仕組みを作ります。その考え方が TEM（スレット・アンド・エラー・マネージメント、threat and error management）です。')}
${FIG.tem()}
<p><b>TEM</b>（脅威とエラーの管理）は、運航の安全を 3 つの言葉で捉える考え方です。<b>脅威・エラー・望ましくない機体の状態</b>の 3 つで、それぞれを管理します（ICAO Doc 9683・SKYbrary）。テキサス大学の研究者が、1990 年代に作った枠組みです。実際の運航を観察する調査（LOSA、Line Operations Safety Audit）から生まれました。FAA も、パイロットのエラーはすべては防げないとしています。そして、エラーの管理を CRM（crew resource management）の訓練に入れています（AC 120-51E）。</p>
${bk.t(['言葉', '意味', '例'], [
  ['脅威（Threat）', '乗員の外から来て、運航を難しくするもの。管理が必要になる', '突風・雷雨（thunderstorm）などの天気・混雑・管制の変更・似たコールサイン・機体の不具合・時間のプレッシャー・慣れない空港'],
  ['エラー（Error）', '乗員の行動、または行動しなかったことで、意図や期待からずれたもの。脅威がなくても起きる', '操作の誤り・手順の誤り（チェックリスト（checklist）の項目の飛ばし）・交信の誤り（聞き違い）'],
  ['望ましくない機体の状態：UAS（undesired aircraft state）', '乗員が引き起こした、位置や速度のずれ・操縦の誤り・誤った形態で、安全の余裕が減った状態。多くは、管理しそこねたエラーの結果', '速度・高度・針路（heading）のずれ・誤った形態・不安定な進入']])}
<h3>対策：脅威は予測して防ぐ・エラーは見つけて直す・望ましくない状態は立て直す</h3>
<ul><li><b>脅威は予測して防ぐ</b>：出発前・進入前のブリーフィング（briefing）で、今日の脅威と「起きたらどうするか」を言葉にします。</li>
<li><b>エラーは見つけて直す</b>：モニター・クロスチェック・決まったコールで、エラーを早く見つけ、UAS になる前に直します。判断の<b>ゲート</b>（gate：判断の高さ）を決めておきます。例：地上 500 ft（VMC）で安定していなければ着陸復行（ゴーアラウンド、go-around）します（${bk.see('ops.landing', '安定した進入')}）。</li>
<li><b>望ましくない状態は立て直す</b>：エラーが UAS になったら、原因を探すより先に、まず機体を立て直します（例：着陸復行）。</li></ul>
<p>ICAO Doc 9683 は、エラーへの対策を 3 つの守りとして書いています。avoid（エラーを防ぐ）・trap（起きたエラーを見つける）・mitigate（見つけられなかったエラーの影響を小さくする）です。FAA の AC 120-51E も、エラーの管理を 3 つに分けます。「防ぐ・見つける・回復する」（error prevention, detection, and recovery）です。言い方は違いますが、考え方は上の 3 つと同じです。</p>
<h3>例：課目 r1 の流れ</h3>
<ol><li><b>出発前</b>：今日の脅威を挙げます。突風を伴う横風（crosswind）は、滑走路から 70°・10 kt です。横風成分（crosswind component）は約 9 kt です。場周のほかの訓練機 2 機と、自分の寝不足も脅威です。対策として、進入速度（approach speed）に突風分（ガストファクター）の半分を足します（AFH 第 9 章）。機体の POH（pilot's operating handbook）と教官の指示が優先です。安定しなければ、早めに着陸復行します。</li>
<li><b>ダウンウインド（downwind leg）</b>：管制が「runway 18」と言いました。使用中は 36 のはずです。管制の言い間違いなら脅威（管制のエラー）、自分の聞き違いならエラー（交信の誤り）です。どちらでも、“Say again the runway” で確かめれば管理できます。</li>
<li><b>ファイナル（final approach leg）</b>：地上 500 ft のゲートで、安定していれば着陸し、していなければ着陸復行します。</li></ol>
${bk.deep('飛行のあとに振り返る・地上の例', `<p>脅威が、そのままエラーや事故へ進むわけではありません。確かめる・知らせ合う・手順を守る・操縦の技量を保つ、という対策を重ねて止めます。</p>
<p>地上の例です。慣れない空港で交信が重なるのは脅威です。誘導路の経路を読み違えるのはエラーです。そのまま進んで、意図しない場所（滑走路の手前など）へ入るのが、望ましくない状態です。前もって空港の図を見て、忙しくなる場面を予測すれば防げます。疑いが出たら、止まれる所で止まって、位置と指示を確かめ直します。</p>
<p>飛んだあとは、4 つを分けて振り返ります。どんな脅威があったか、実際に何をしたか、機体はどんな状態になったか、どの対策が効いたかです。誰が悪いかではなく、どこで防げたか・どこで気づけたかを探し、次の準備と練習に生かします。</p>`)}
${bk.key('エラーはなくせない。脅威は予測して防ぐ・エラーは見つけて直す・UAS は立て直す', '食い違いは確かめる。管制の言い間違いは脅威、自分の聞き違いはエラー', 'UAS になったら、まず機体を立て直す。原因はそのあと')}
${bk.q('TEM で、「チェックリストの項目を飛ばした」「高度が 300 ft ずれた」「午後に雷雨の予報」は、それぞれ何にあたる？', '飛ばしはエラー、高度のずれは望ましくない機体の状態（UAS）、雷雨の予報は脅威です。脅威は外から来るもの、エラーは乗員の行動のずれ、UAS はその結果の機体の状態です。')}
${bk.sim('出発前に脅威を予測し、管制との食い違いに気づき、突風を伴う横風で着陸します。', ['r1', 'TEM：脅威を予測して管理する'])}` },
      { id: 'crm.crm', t: 'CRM：チームで飛ぶための技術', scope: 'common', jcab: ['cpl.3.3.3.4', 'ppl.3.3.3.4'], faa: ['PA.I.H.K4'], h: () => `
${bk.aim('チームで飛ぶときに、人・機械・情報をすべて使って安全に飛ぶ技術と、懸念のはっきりした伝え方を覚えます。')}
<p><b>CRM</b>（乗員の資源管理）は、使えるすべての資源（人・機械・情報）を有効に使うことです。目的は、安全で効率のよい運航です（SKYbrary・AC 120-51E）。はじめは cockpit resource management と呼ばれ、のちに乗員全体（crew）へ広がりました。</p>
<p>航空会社の事故とインシデントの 60〜80% には、人のエラーが関わっています。NASA の長い研究で、問題の多くは操縦の技術ではないとわかりました。集団で決めること・伝え合うこと・リーダーシップ・資源の管理の問題です（AC 120-51E）。NASA は 1979 年に、このテーマのワークショップを開いています（NASA CP-2120）。米国では、資源管理の訓練が規則で求められています（米国の 14 CFR 121.404）。対象は、エアラインの乗員と運航管理者です。乗員は CRM、運航管理者は DRM（運航管理者の資源管理、Dispatcher Resource Management）です。</p>
${bk.t(['技術', '例'], [
  ['コミュニケーション', '標準の用語・コールアウト（callout：決まった声かけ）・復唱（readback）・「わからない」を言える'],
  ['状況認識（situational awareness）', 'いま・この後どうなるかを、チームで同じ絵として持つ（ブリーフィング）'],
  ['意思決定（aeronautical decision-making）', `情報を集め、選択肢を挙げ、決めて、振り返る（${bk.see('hf.adm', '意思決定')}）`],
  ['リーダーシップとフォロワーシップ（followership）', '決める人が決める。支える人は、決める人を助け、懸念をはっきり伝える。どちらも必要'],
  ['仕事量の管理', '忙しくなる前に準備する。役割を分ける']])}
<h3>権威勾配（authority gradient）と、懸念の伝え方</h3>
<p>立場の上下の差を<b>権威勾配</b>と言います（用語は ICAO Doc 9683）。急すぎると、下の立場の人が気づいた危険を言い出せません。平らすぎると、なかなか決まらず、決めるのが遅れます（SKYbrary：Authority Gradients）。訓練生と教官の間にも勾配があります。訓練中でも、わからないこと・おかしいと思ったことは言葉にします。</p>
<p>時間に余裕がある場面では、よく教えられる型があります。<b>①呼びかける ②懸念を言う ③問題を具体的に ④解決案 ⑤同意を得る</b>の順で伝えます。この 5 段の型は、FAA の文書にあるものではありません。FAA の AC 120-51E は、懸念を伝える行動を 3 つにまとめています。「問いかけ・提唱・主張（Inquiry / Advocacy / Assertion）」です。そして、はっきり解決するまで、適切な粘り強さで言うことを求めています。例（巡航中）：「教官、目的地の雲が低くなってきています。予報では到着のころ 800 ft です。手前の空港へ変更しませんか。いかがですか？」</p>
<p>時間がない場面（地上 500 ft で進入が不安定など）では、長い説明はしません。短く、はっきりコールします（例：「ゴーアラウンド」）。</p>
${bk.key('立場より安全。言いにくいことほど早く・具体的に', '時間があれば 5 段の型、時間がなければ短いコール', 'CRM は「仲良くする」ことではなく、チームとしての誤りを減らす技術')}
${bk.q('権威勾配が「急すぎる」とき、起きやすいことは？', '下の立場の人が、気づいた懸念を言い出せなくなります。逆に平らすぎると、なかなか決まらず、決めるのが遅れます（SKYbrary：Authority Gradients）。')}` },
      { id: 'crm.pm', t: 'PF と PM：操縦する人と監視する人', scope: 'common', jcab: ['cpl.3.3.3.4'], h: () => `
${bk.aim('2 人で飛ぶときの役割の分け方と介入のしかた、体調の急変への備え、大事な場面で操縦に集中する決まりを覚えます。')}
<p>操縦士 2 人で飛ぶ運航（two-pilot operation）では、2 つの役割に分けます。<b>PF</b>（飛行経路を管理する操縦士、pilot flying）と、<b>PM</b>（監視する操縦士、pilot monitoring）です。古い資料では PM を PNF（Pilot Not Flying）と呼んでいます（AC 120-51E）。FAA は、役割を次のようにはっきり決めるよう勧めています（SAFO 15011・AC 120-71B）。</p>
<ul><li>いつでも、PF は 1 人、PM は 1 人です。</li>
<li>PF は、いまとこれからの飛行経路とエネルギーを管理します。PM は、それをいつも監視します。自動操縦で飛んでいるときも、機体を飛ばすことから気をそらしません。</li>
<li>PM は、管制の指示と機体の状態をいつも把握します。意図した経路からのずれ（ずれそうなこと）をコールし、必要なら介入します。</li>
<li>役割の交代は、声で渡し、声で受けます（機体の状態を短く伝える）。</li></ul>
${bk.photo('crewCab')}
${bk.t(['PF', 'PM'], [['機体の操縦（手動、または自動操縦の操作）', '飛行経路・速度・形態・自動操縦のモードを監視し、ずれをコールする（例：“Speed, plus 15”）'], ['決めた経路を飛ぶ', '無線・チェックリスト・計算'], ['PM のコールに応え、直す（“Correcting”＝いま直しています）', '2 回コールしても応答や修正がなければ、SOP に従って操縦を代わることを考える（AC 120-71B）']])}
<h3>介入と体調の急変</h3>
<p>標準運航手順（SOP、standard operating procedures）には、何を・どう・いつ言うかを決めておきます。PF が直さないときに、PM がいつ操縦を代わるかも決めます。代わるかどうかの判断には、気づきにくい体調の急変（subtle incapacitation）を入れます。2 回呼びかけても応答や修正がないことも、その手がかりです（AC 120-71B）。代わるときも、誰が PF かがはっきり分かる言い方で受け渡します。</p>
<h3>大事な場面で操縦に集中する</h3>
<p>米国のエアラインの規則は、大事な飛行の段階（critical phases of flight）を決めています。その段階では、運航の安全に要らない仕事と会話を禁じます（米国の 14 CFR 121.542）。この考え方は、操縦室を静かに保つ意味で sterile cockpit とも呼ばれます。米国のこの規則では、地上滑走（タキシー、taxi）・離陸（takeoff）・着陸が、大事な段階です。巡航を除く 10,000 ft より下の飛行も入ります。</p>
<p>1 人で飛ぶ訓練でも、自分で自分にコールします。PM の目を持つ練習です（例：「500 ft、安定」「速度プラス 10」。${bk.see('hf.srm', '1 人で操縦するときの資源管理')}）。</p>
${bk.key('PF は 1 人、PM は 1 人。役割の交代は声で渡し、声で受ける', 'PM はずれをコールする。2 回で直らなければ SOP に従って介入', '大事な飛行の段階では、運航に要らない仕事と会話をしない')}
${bk.recall('操縦は、声の 3 段階（You have → I have → You have）で受け渡します。', ['ground.crew', '操縦教員（flight instructor）と飛ぶ'])}
${bk.q('PM が速度のずれをコールしたが、PF が返事をせず、ずれも直らない。どうする？', 'もう一度はっきりコールします。2 回コールしても応答や修正がなければ、SOP に従って操縦を代わることを考えます（AC 120-71B）。PF の体調が急に悪くなっている可能性もあります。')}` },
      { id: 'crm.case', t: '人の要因を 1 つの飛行で通して考える', scope: 'common', from: ['kiso10.28'], use: ['課目 r1'], h: () => `
${bk.aim('寝不足・急ぐ同乗者・午後の天気の悪化が重なる架空の飛行で、出発前・飛行中・着陸後に何を確かめ、どう決めるかを、TEM の言葉で通して考えます。')}
<p>場面は架空です。慣れない空港へ向かう、昼の訓練の飛行です。操縦する人は、前の夜によく眠れていません。同乗者は、到着を急いでいます。機体は正常ですが、午後は天気が悪くなる予報です。</p>
${bk.t(['段階', '確かめること', '決め方'], [
  ['出発前', '自分の体調（IMSAFE）と、操縦士・機体・環境・外からの圧力（PAVE）。個人の最低基準（personal minimums）と比べる', '対策をしても余裕がなければ、延期か中止。出るなら、やめる条件・代わりの案・役割をブリーフィングで決める'],
  ['飛行中', '通報と表示から変化をつかみ、この先の燃料と、着くときの天気を予測する', '忙しくなったら仕事を分け、チェックリストと助けを使う。予測と違う事実を無視しない。早めに相談し、計画を見直す'],
  ['着陸後', '脅威・エラー・効いた対策を分けて振り返る', '休む・練習する・準備や手順を直す、のどれにつなげるかを決める']])}
<p>TEM の言葉で整理します。寝不足・同乗者の急ぎ・午後の天気・慣れない空港は、脅威です。急いでチェックリストを飛ばす、管制の指示を聞き違える、はエラーの例です。速すぎる進入や、予定より少ない燃料は、望ましくない状態の例です。</p>
<p>大切なのは、安全に着いたという結果だけではありません。その結果に至った判断と行動を、自分の言葉で説明できることです。自分の限界を認め、確かめ、計画を変え、助けを求める練習を重ねます（${bk.see('adm.risk', '個人の最低基準と早めの引き返し')}）。</p>
${bk.deep('振り返りの書き方', `<p>着陸後、次の 5 つを短く書きます。1 つ目は、出発前に挙げた脅威と、実際に会った脅威です。2 つ目は、自分がした判断と、そのときの理由です。3 つ目は、機体がどんな状態になったか（ずれ・余裕の減り）です。4 つ目は、効いた対策と、効かなかった対策です。5 つ目は、次に変えること（休み方・練習・準備・手順）です。</p>
<p>うまくいった飛行も振り返ります。助かったのが運なのか、準備なのかを分けると、次の準備が具体的になります。</p>`)}
${bk.judge('出発前に「やめる条件」を言葉にしてから出る', '予定より遅れたら、燃料と天気の余裕を確かめ直す', '同乗者の都合を、決める理由にしない')}
${bk.key('出発前に、やめる条件・代わりの案・役割を決めておく', '飛行中は、予測と違う事実を無視しない。早めに相談する', '着陸後は、結果でなく判断と行動を振り返る')}
${bk.recall('IMSAFE は自分の体調、PAVE は操縦士・機体・環境・外からの圧力の 4 つの見方です。', ['hf.self', '自分の体調：IMSAFE'], ['hf.adm', '危険の評価と判断'])}
${bk.q('同乗者が「急いで」と言い、午後の雷雨の予報もある。出発前に何をする？', '急ぎも雷雨も脅威として言葉にします。やめる条件（たとえば、何時までに出られなければ中止）と、代わりの空港を決めます。燃料に余裕を持ちます。自分の体調も IMSAFE で確かめ、余裕がなければ延期します。同乗者の都合は、決める理由にしません。')}
${bk.sim('課目 r1 では、寝不足を含む今日の脅威を出発前に挙げ、飛行中の管制との食い違いに気づき、突風を伴う横風で着陸します。', ['r1', 'TEM：脅威を予測して管理する'])}` },
    ],
    terms: [['TEM', 'TEM', 'Threat and Error Management。脅威とエラーの管理'], ['Threat', '脅威', '乗員の外から来て運航を難しくするもの'], ['Error', 'エラー', '乗員の行動・不作為による、意図や期待からのずれ'], ['Undesired Aircraft State (UAS)', '望ましくない機体の状態', '安全の余裕が減った状態'], ['Countermeasure', '対策', '脅威は予測して防ぐ・エラーは見つけて直す・UAS は立て直す'], ['Gate', 'ゲート（判断の高さ）', '例：地上 500 ft'], ['LOSA', '運航の観察調査', 'Line Operations Safety Audit'], ['CRM', 'CRM', 'Crew Resource Management。乗員の資源管理'], ['Situational awareness', '状況認識', ''], ['Authority gradient', '権威勾配', '急すぎても平らすぎてもよくない'], ['Assertiveness', '懸念をはっきり伝えること', ''], ['Followership', 'フォロワーシップ', 'リーダーを支え、意見を言う役割'], ['PF / PM', 'PF・PM', '飛行経路を管理する操縦士・監視する操縦士。古い資料では PNF'], ['Callout', 'コールアウト（決まった声かけ）', ''], ['Positive exchange of flight controls', '操縦の受け渡し', '3 段階（AFH 第 1 章）'], ['SOP', '標準運航手順', 'Standard Operating Procedures'], ['Subtle incapacitation', '気づきにくい体調の急変', '2 回呼びかけて応答がないことも手がかり（AC 120-71B）'], ['Critical phases of flight', '大事な飛行の段階', '米国の 14 CFR 121.542。sterile cockpit'], ['Debriefing', 'デブリーフィング', '飛んだあとの振り返り']],
    examples: ['脅威：午後の雷雨の予報 → 対策：出発を早める・代わりの空港を決めておく・燃料に余裕を持つ。', '食い違いを見つけた例：管制の「runway 18」→ 使用中は 36 のはず（管制の言い間違いなら脅威、自分の聞き違いならエラー）→ “Say again the runway” で確かめる（課目 r1）。', 'UAS の管理：ファイナルで速度 +15 kt・地上 500 ft で安定していない → 原因探しより先に着陸復行。', '操縦の受け渡し：教官「You have the flight controls.」→ 訓練生「I have the flight controls.」→ 教官「You have the flight controls.」。', '寝不足と急ぐ同乗者：出発前に「何時までに出られなければ中止」と決め、代わりの空港と燃料の余裕を確かめる（crm.case）。'],
    cautions: ['この章は一般的な TEM・CRM の考え方の入門で、特定の航空会社・訓練校の手順や訓練内容ではない。', 'コールアウトの言い方や役割の分け方は、運航者ごとの SOP が優先する。'],
    quiz: [
      { q: 'TEM で「脅威（Threat）」にあたるものは？', choices: ['チェックリストの項目を飛ばした', '午後の雷雨の予報', '高度を 300 ft 逸脱した', '周波数を間違えた'], answer: 1, why: '脅威は乗員の外から来るもの（天気・混雑・不具合など）。飛ばし・間違いはエラー、逸脱は UAS（ICAO Doc 9683。本文 crm.tem）。' },
      { q: 'TEM で、望ましくない機体の状態（UAS）になったときに、最優先することは？', choices: ['原因のエラーを探す', '報告書を書く', '機体を立て直す（UAS の管理）', 'チェックリストを最初から読む'], answer: 2, why: 'UAS は事故の一歩手前になりやすい。まず機体の状態を安全に戻し、その後で原因を考える（SKYbrary。本文 crm.tem）。' },
      { q: 'TEM の考え方として正しいものは？', choices: ['エラーは訓練すればゼロにできる', 'エラーは起きる前提で、脅威は予測して防ぎ、エラーは見つけて直し、UAS は立て直す', '脅威は自分では変えられないので考えない', 'エラーをした人を罰すればなくなる'], answer: 1, why: 'AC 120-51E：パイロットのエラーはすべては防げない（だから、防ぐ・見つける・回復する）。ICAO Doc 9683 は、エラーへの対策を avoid・trap・mitigate の 3 つの守りとする。' },
      { q: 'PM（Pilot Monitoring）の主な役割は？', choices: ['無線だけを担当し、計器は見ない', '飛行経路・速度・形態・モードを監視し、ずれをコールする', 'PF が忙しいときだけ計器を見る', 'PF と同時に操縦する'], answer: 1, why: 'SAFO 15011・AC 120-71B：PM は機体とシステムの状態を監視し、ずれをコールし、必要なら介入する。PF はいつも 1 人。' },
      { q: '訓練の飛行中、教官が “You have the flight controls.” と言った。訓練生の正しい返事は？', choices: ['“I have the flight controls.”', '“Roger.”', '“Wilco.”', '何も言わずに操縦桿を握る'], answer: 0, why: 'AFH 第 1 章の 3 段階：教官 “You have…” → 訓練生 “I have the flight controls.” → 教官がもう一度 “You have…”（本文 crm.pm・ground.crew）。' },
      { q: 'AC 120-71B が、PM が操縦を代わるかを考える手がかりとして挙げるのは？', choices: ['PF の飛行時間が少ないこと', '天気がよいこと', '管制が混んでいること', '2 回呼びかけても応答や修正がないこと'], answer: 3, why: 'AC 120-71B 6.6.2.1：代わる判断には、気づきにくい体調の急変や、2 回の呼びかけで応答・修正がないことを入れる（本文 crm.pm）。' },
      { q: '米国のエアラインの規則（14 CFR 121.542）で、運航に要らない会話をしない「大事な飛行の段階」に入るのは？', choices: ['巡航を除く 10,000 ft より下の飛行', '巡航中の 30,000 ft の飛行', '駐機場で止まっている間', '飛行機を降りたあと'], answer: 0, why: '米国の 14 CFR 121.542(c)：地上滑走・離陸・着陸と、巡航を除く 10,000 ft より下のすべての飛行（本文 crm.pm）。' },
      { q: '寝不足・急ぐ同乗者・午後の天気の悪化が重なる飛行で、出発前にすることとして正しいものは？', choices: ['同乗者に合わせて急いで出る', '天気は飛びながら考える', 'やめる条件・代わりの案・役割を決め、余裕がなければ延期する', 'チェックリストを短くして時間を作る'], answer: 2, why: '脅威を言葉にし、やめる条件と代わりの案を決めておく。対策をしても余裕がなければ延期か中止（本文 crm.case）。' },
      { q: 'TEM で、慣れない空港で誘導路の経路を読み違え、意図しない場所へ入りそうになった。「経路の読み違い」は何にあたる？', choices: ['脅威', '望ましくない機体の状態', '対策', 'エラー'], answer: 3, why: '読み違いは乗員の行動のずれでエラー。慣れない空港や交信の重なりは脅威、意図しない場所へ入るのは望ましくない状態（本文 crm.tem）。' },
    ],
    written: [
      ['慣れない空港で交信が重なり、誘導路を取り違えそうになりました。TEM の言葉で、脅威・エラー・望ましくない状態を分け、防ぎ方と気づいたあとの対応を説明してください。', `慣れない空港と交信の重なりは脅威、経路の読み違いはエラーです。そのまま進んで意図しない場所へ入るのが、望ましくない状態です。前もって空港の図を見て、忙しい場面を予測して防ぎます。疑いが出たら、止まれる所で止まって確かめ、状態が悪くなる前に直します。${bk.see('crm.tem', 'TEM：脅威とエラーの管理')}`, ['kiso10.q23']],
      ['寝不足で始まった架空の飛行で、到着の遅れと天気の悪化が重なりました。出発前・飛行中・着陸後に、人の要因をどう確かめ、判断と改善につなげますか。', `出発前は体調と飛ぶ条件、やめる条件を確かめ、余裕がなければ延期します。飛行中は変化をつかみ、仕事を分け、助けと代わりの案を使って早めに判断を見直します。着陸後は、判断の理由と見落としを振り返り、休み方・練習・準備や手順の改善につなげます。${bk.see('crm.case', '人の要因を 1 つの飛行で通して考える')}`, ['kiso10.q28']],
    ],
    refs: [R.tem, R.temOps, R.crm, R.authGrad, R.icaoTEM, R.ac12051, R.cfr121404, NEW_R.cfr121542, R.automation, R.safo15011, R.nasaCrm, R.afh, R.afh9, R.rmh], lessons: ['r1'] });

  // ======================================================================= 第 6 部 第 39 章
  B.add({ id: 'jet', part: 'p6', t: 'ジェット機の飛び方と自動化', en: 'Jet airplanes and automation',
    summary: 'プロペラ機とジェット機の違い（エンジンの反応・減速と降下の計画・ダッチロールとヨーダンパー・後方乱気流の区分）、自動操縦とモード、異常姿勢の防止と回復、高速飛行とマッハ数、FMS・TCAS・機上気象レーダー、資格を取ったあとの訓練の流れ。2 人で飛ぶジェット機へ進む前に知っておくと役立つ一般的な知識。',
    secs: [
      { id: 'crm.jet', t: 'プロペラ機とジェット機の違い', scope: 'common', h: () => `
${bk.aim('2 人で飛ぶジェット機へ進む人が、先に知っておくと役立つ、プロペラ機との一般的な違いを見ます。')}
${FIG.thrustResponse()}
<p>FAA の Airplane Flying Handbook（FAA-H-8083-3C）第 16 章は、プロペラ機からジェット機へ移るときの違いを説明しています。違いは多くありますが、「姿勢＋出力＝性能」という基本は同じです（${bk.see('ops.trim', '姿勢と出力')}）。</p>
${bk.t(['項目', 'プロペラ機（Archer・Seminole）', 'ジェット機（一般的に）'], [
  ['出力の反応', 'スロットルを動かすと、すぐ推力が変わる', 'アイドルからの加速（spool-up）が遅く、全開の推力まで、長いと 10 秒ほどかかる。<b>早めに・先回りして</b>使う'],
  ['プロペラの後流', '翼や尾翼に風が当たり、低速でも舵が効く。出力を足すと揚力（lift）も少し増える', '後流がない。出力ですぐに揚力を増やせないので、安定した進入がもっと大切'],
  ['減速', '出力を絞ると、プロペラの抗力（drag）ですぐ減速する', '抗力が小さく、アイドルでも前へ押す。水平飛行・アイドルで 10 kt 減らすのに約 1 NM。スポイラー（揚力を減らす板）やスピードブレーキ（抗力を増やす板）を使う'],
  ['エネルギーの管理（energy management）', '速度・高度・出力の組み合わせで考える（AFH 第 4 章）', '考え方は同じ。速くて重く、変化が遅いので、もっと早く計画する'],
  ['翼', 'まっすぐな翼。ふつうは付け根の方から失速（stall）する', `後退翼（swept wing）：高速に強いが、翼端から失速しやすい（${bk.see('jet.speed', '高速飛行とマッハ数')}）`],
  ['高い高度', 'ふつうはそこまで上がらない', 'マッハ数で決まる速度の上限と、低速側の限界が近づく（同じ節）']])}
${bk.photo('dc8')}
<h3>降下の計画</h3>
<p>ジェット機は減速しにくいので、降下を始める点（TOD、top of descent）を早めに計画します。AFH の目安は、<b>降りる高さ（千 ft）× 3 NM</b> に、水平飛行で減速する距離（アイドルで 1 NM に約 10 kt）を足すことです。例として、風のない、まっすぐの進入を考えます。空港の標高より 35,000 ft 上から降りるなら、35 × 3 ＝ 105 NM に約 15 NM を足します。だから、<b>約 120 NM 手前</b>から降り始めます（AFH 第 16 章）。</p>
<h3>ダッチロール（Dutch roll）とヨーダンパー</h3>
${FIG.dutchRoll()}
<p>ダッチロールは、横の揺れ（ロール）と機首の左右の揺れ（ヨー）が組になって繰り返す動きです。2 つの揺れは、時期が少しずれます。機首は、水平線の上で 8 の字を描きます（PHAK 第 5 章）。</p>
<p>多くの機体では、この揺れは数回で自然に収まります。高速の後退翼の機体では、揺れが収まりにくくなります。そこで、ヨーダンパー（yaw damper）を付けます。ジャイロで揺れを感じ取り、方向舵（ラダー、rudder）を自動で動かす装置です（PHAK 第 5 章）。強い乱気流（turbulence）の中を手で飛ぶときは、ヨーダンパーを入れておきます。入れる前に、方向舵を中立にします（AC 61-107B）。</p>
<h3>後方乱気流（wake turbulence）の区分</h3>
<p>米国の管制は、後方乱気流の間隔のために、機体を 4 つに分けます（米国の P/CG）。分け方は最大離陸重量（maximum takeoff weight）で、Super・Heavy・Large・Small です。Super と Heavy の機体は、無線の呼出符号に "super"・"heavy" を付けます（米国の AIM 7-4）。その言葉を聞いたら、渦が強い前の機を思い描きます。</p>
${bk.deep('区分の重さと、管制の間隔', `${bk.t(['区分', '中身（米国の P/CG）'], [['Super', 'Airbus A380-800'], ['Heavy', '300,000 lb 以上で離陸できる機体（そのときの重さによらない）'], ['Large', '最大離陸重量が 41,000 lb を超え、300,000 lb 未満'], ['Small', '最大離陸重量が 41,000 lb 以下']])}
<p>米国の管制は、IFR の機などに、Super・Heavy の後ろでは決められた最小の間隔をあけます。B757 の後ろの Small の機にも、同じように間隔をあけます（米国の AIM 7-4-9）。目で見て進入する許可を受けたら、渦からの間隔は自分で取ります。</p>`)}
${bk.photo('turbofan')}
${bk.key('ジェット機では「先回り」がさらに大切。出力・減速・降下を早めに計画する', '降下の目安：千 ft × 3 NM ＋ 減速の分', 'ダッチロールはロールとヨーの組の揺れ。ヨーダンパーが収める', 'それでも基本は同じ：姿勢＋出力＝性能、安定した進入、ゴーアラウンドの判断')}
${bk.recall('渦は沈んで横へ流れます。前の機の経路と同じ高さか上を飛び、着陸は前の機の接地点の先にします。', ['ops.wake', '後方乱気流：前の機の渦を避ける'])}
${bk.q('ジェット機で、着陸の進入中に速度が足りなくなってきた。プロペラ機と比べて、何に気をつけて出力を足す？', 'エンジンがアイドル近くから加速するのに時間がかかる（全開まで、長いと 10 秒ほど）ので、早めに足します。ジェット機では、出力ですぐに揚力を増やすこともできません。だから、速度が落ちる前に先回りします。進入では、出力をアイドルまで絞らず、一定に保ちます。そうすると、エンジンの反応もよくなります（AFH 第 16 章）。')}` },
      { id: 'crm.auto', t: '自動操縦とモード：自動化と付き合う', scope: 'common', from: ['kiso04.21', 'kiso04.22', 'kiso12.26'], jcab: ['cpl.3.3.3.6'], h: () => `
${bk.aim('自動化（自動操縦など）を道具として使いこなす考え方と、手で飛ぶ技量がその土台であることを覚えます。')}
<p><b>自動化</b>（automation）は、人の代わりに飛行経路や速度を保つ装置です。エアラインの機体では、自動化を使って飛ぶ時間が長くなります。1 つ目は自動操縦装置（オートパイロット、autopilot）です。2 つ目は自動推力（オートスロットル、autothrottle）です。3 つ目は飛行管理装置（FMS、flight management system）です。</p>
<h3>モードを読む</h3>
<p>自動操縦がいま、どのモードで何を保っているかは、<b>FMA</b>（飛行モードの表示、Flight Mode Annunciator）に出ます。FMA は「誰が（自動化か人か）何をしているか」を示す表示です。作動中のモードと、条件がそろうと作動する待機中（armed）のモードを区別して読みます。モードを変えたら、FMA を見て、声に出して確かめます。モードの確認は 2 人の仕事です（AC 120-71B。${bk.see('crm.pm', '操縦する人と監視する人')}）。モードの名前と声に出す言い方は、機種と運航者で違います。</p>
<p>自動操縦が舵を動かしていても、推力は人が決める機体も多くあります。昇降率を保つモードで上昇しているとき、推力が足りなければ速度は減っていきます。高度と針路（heading）が合っていても、エネルギーが足りているとは言えません。だから、モードを読むときは、使える推力と機体のエネルギーも一緒に見ます（AC 120-71B）。</p>
<h3>わからない・驚いたとき</h3>
<ul><li><b>3 つの問い</b>を自分にします。「自動化はいま何をしているか」「なぜか」「次に何をするか」です。自動化にとまどうパイロットの疑問として、NASA の研究（Wiener、1989 年）で知られています。</li>
<li>答えられないときや、思った動きをしないときは、自動化に驚かされた状態（automation surprise）です。まず機体を飛ばします（Aviate。${bk.see('hf.srm', '1 人で操縦するときの資源管理')}）。</li>
<li>より簡単な使い方に切り替えます。たとえば、FMS の経路をやめて、自動操縦の基本のモード（針路・高度・昇降率を保つ）にします。それでもだめなら、自動操縦と自動推力を切って、手で飛びます（フライトディレクター（flight director）を使うこともあります）。AC 120-123 は、決まった「段階」で考えません。その場に合った組み合わせを選び、手で飛ぶことも含めて、すばやく切り替えることを求めています。</li></ul>
${bk.deep('FD・AP・自動推力の役割と、設定を変えたあとの確かめ', `${bk.t(['機能', 'すること', 'それだけでは分からないこと'], [['フライトディレクター（FD）', '選んだモードに沿うためのピッチとロールの指示を見せる', '自動操縦が入っているか'], ['自動操縦（AP）', '舵を動かして、指示に沿って飛ぶ', '推力まで自動で合わせているか'], ['自動推力', 'モードに合わせて推力を調整する', 'すべての速度のずれを防ぐか']])}
<p>設定を変えたら、3 つを照らし合わせます。指示した中身、作動中と待機中のモード、実際の姿勢・速度・経路です。高度を選んだだけでは、その高度へ向かうモードが作動したことにはなりません。待機していたモードは、条件がそろうと作動し、別のモードに変わります。思った変化がなければ、同じスイッチを何度も押す前に、条件と情報の元を確かめます。</p>`)}
<h3>手で飛ぶ技量が土台</h3>
<p>FAA の SAFO 13002（運航者向けの安全情報、Safety Alert for Operators。2013 年）は、自動化の使いすぎに注意しています。自動操縦や自動推力をいつも使っていると、望ましくない状態からすばやく立て直す力が落ちるからです。そして、適切な場面で手で飛ぶ機会をつくるよう、運航者に勧めています。SAFO 17007（2017）は、エアラインの訓練に加わった項目を伝えています。手で飛ぶ低速飛行（slow flight）・異常姿勢からの回復・失速の防止と回復などです。そして、その技量を保つよう勧めています。AC 120-123（2022）は、手で飛ぶことを、ほかの操縦の技術の土台と位置づけています（SAFO 17007 も同じ考え方です）。</p>
<p>この教材には<b>針路・高度を保つ自動操縦はありません</b>（意図的）。G1000 の表示と手動の操縦で、計器を読み・自分で修正する力を練習するためです。</p>
${bk.key('モードを読み、声に出す。3 つの問いに答えられなければ、より簡単な使い方にする', '昇降率のモードでは、推力が足りないと速度が減る', '自動化に驚いたら、まず機体を飛ばす', '自動化は「仕事を減らす」道具。最後に頼れるのは手で飛ぶ技量')}
${bk.recall('フライトディレクターは指示を見せるだけで、自動操縦は舵を動かします。作動中と待機中のモードは表示で分けます。', ['inst.ap', '自動操縦の入口：モードの表示を読む'])}
${bk.q('自動操縦が、思った方向へ曲がらない。どうする？', 'まず機体を飛ばします。FMA でいまのモードを確かめ、「何をしている・なぜ・次は」に答えられなければ、より簡単なモード（例：針路を保つモード）に切り替えます。それでもだめなら自動操縦を切って、手で飛びます。')}` },
      { id: 'crm.upset', t: '異常な姿勢を防ぐ（UPRT の考え方）', scope: 'common', h: () => `
${bk.aim('異常な姿勢（upset）とは何か、なぜ大切か、どう防ぎ、どう立て直すかの考え方を覚えます。')}
<p>FAA は、<b>異常姿勢</b>（upset）を次のように説明しています。ふだんの飛行や訓練の範囲を、<b>意図せずに超えた</b>状態です（AFH 第 5 章・AC 120-111）。</p>
${bk.t(['異常姿勢の目安（AFH 第 5 章）', '値'], [['機首上げ', '25° を超える'], ['機首下げ', '10° を超える'], ['バンク', '45° を超える'], ['上の範囲の中でも', 'その状況に合わない速度（失速を含む）']])}
<p>異常姿勢は、<b>飛行中の操縦不能（LOC-I、Loss of Control In-flight）</b>の入口になりやすい状態です。LOC-I は、米国の一般航空と世界の商業航空の死亡事故で、いちばん多い原因です（AFH 第 5 章）。<b>UPRT</b>（Upset Prevention and Recovery Training）は、異常姿勢の防止と回復の訓練です。中心は防止です。</p>
${bk.t(['防止の考え方', '例'], [
  ['エネルギーを知る', '速度（運動のエネルギー）・高度（位置のエネルギー）・出力（足せる量）の余裕を、いつも把握する。低い・遅い・アイドルは余裕が少ない'],
  ['自動化のモードを確かめる', '思っていないモードで、速度が落ちたり、傾いたりすることがある'],
  ['驚きに備える', '突然のことに、とっさに体が反応し、心拍が上がる（startle）。予想と違うことで、考えがまとまらなくなる（surprise）。決めた手順を練習しておく'],
  ['早く気づく', '速度の減少・失速警報（stall warning）・バフェット（buffet：失速の前の振動）・思っていない姿勢の変化']])}
<h3>回復の 2 つの型（大型機：AC 120-111）</h3>
${bk.t(['機首上げ（Nose High）', '機首下げ（Nose Low）'], [
  ['状況を確かめ、「ノーズハイ」と声に出す（どちらの操縦士でも）', '状況を確かめ、「ノーズロー」と声に出す（どちらの操縦士でも）'],
  ['自動操縦・自動推力を切る', '自動操縦・自動推力を切る'],
  ['機首が下がる動きが出るまで、必要なだけ押す（いっぱいまで押すこともある）', '失速していれば、まず失速から回復する'],
  ['推力を調整する（必要なら）', '最短の向きに翼を水平にする（必要なら少し押して荷重を抜く）'],
  ['速度がはっきり増えてきたら、少し機首下げの姿勢へ戻す', '推力と抗力を調整し、水平へ戻す']])}
<p>機首上げで、押しても機首が下がる動きが出ないときは、機体を傾けて機首を下げる方法があります。バンクは、ふつう約 60° を超えないようにします。押し続けて迎え角（迎角、angle of attack）を小さく保てば、補助翼（エルロン、aileron）が効きます。傾けると、機首上げの動きが旋回に変わり、機首が下がっていきます。翼の下にエンジンがある機体では、推力を減らすと機首を上げる力が減り、機首を下げやすくなります。推力を減らすのは、機首を制御できるところまでです。昇降舵（エレベーター、elevator）とトリム（trim）で機首を制御できているときは、推力を減らすことはすすめられません（AC 120-111）。</p>
<p>回復の間、PM（監視する操縦士、pilot monitoring）は速度と姿勢を見続けます。ずれが続けば、声に出して伝えます（AC 120-111）。</p>
<p>どちらの型も、共通の芯は<b>「失速していれば、まず迎え角を減らす」「翼が水平に近づくまで、強く引かない」</b>ことです。引きすぎて荷重を大きくしたり、早く引き起こして失速したりしないようにします（AC 120-111）。</p>
<p>小型機の練習の順番は、POH（pilot's operating handbook）・IFH・AFH 第 5 章の手順で行います。関わる節は、${bk.see('ifr.upset', '異常姿勢からの回復')}・${bk.see('aero.stall', '失速のしくみと回復')}・${bk.see('ops.slow', '低速飛行')}・${bk.see('ops.stall', '失速と回復')} です。細かい順番は機体で違いますが、芯は同じです。Archer の制限荷重は、普通類（normal category）で +3.8 G です（実用類では +4.4 G。POH）。</p>
${bk.key('異常姿勢の中心は防止：エネルギーとモードを知り、早く気づく', '回復は、まず押して迎え角と荷重を減らす。傾いたまま強く引かない', '機首下げ・高速では、出力を足さずに減らす')}
${bk.recall('驚愕は体のとっさの反応、驚きは予想と違うことです。決めた手順を体で覚えておくと、立て直しが速くなります。', ['adm.review', '振り返り・驚きと驚愕の基礎'])}
${bk.q('機首下げ・速度が増えている・深く傾いている（スパイラル）。傾いたまま操縦桿を強く引くと、どうなる？', '旋回が締まって荷重が急に増え、高度もさらに失います。速度が大きいので、機体が壊れることもあります。出力を絞り、少し押して荷重を抜き、翼を水平にしてから、ゆっくり機首を上げます（AFH 第 5 章）。')}` },
      { id: 'jet.speed', t: '高速飛行とマッハ数', scope: 'common', from: ['kiso01.26', 'kiso04.9'], h: () => `
${bk.aim('ジェット機の速度の上限がマッハ数で決まる理由と、音速に近づくと翼の上で起きること、後退翼の働きを覚えます。')}
${FIG.machCrit()}
<p><b>マッハ数（Mach number）</b>は、真対気速度（true airspeed）を、その場所の音速で割った値です（米国の 14 CFR 1.1・AFH 第 16 章）。音速は気温で変わります。標準大気の海面（15 ℃）では 661 kt ですが、40,000 ft（−55 ℃）では 574 kt に下がります（PHAK 第 5 章）。だから、同じ真対気速度でも、高く寒い所ほどマッハ数は大きくなります。</p>
<p>ジェット機の速度の上限は、2 つで書きます。VMO はノットで書く最大運用速度、MMO はマッハ数で書く最大運用速度です（AFH 第 16 章）。低く暖かい所では指示対気速度（indicated airspeed）の VMO が先に効き、高く寒い所ではマッハ数の MMO が先に効きます。だから、ジェット機の速度計は、速度とマッハ数の両方を出します（AFH 第 16 章）。</p>
<h3>音速に近づくと</h3>
<p>翼の上の流れは、機体の速度より速くなります。だから、機体がマッハ 1 より遅くても、翼の上のどこかで流れがマッハ 1 に届きます。そのときの機体のマッハ数を、<b>臨界マッハ数</b>（critical Mach number）と言います（AFH 第 16 章）。それを超えると、流れが急に遅くなる所に衝撃波ができます。衝撃波は速度とともに強くなって後ろへ動き、その後ろで流れがはがれます（AFH 第 16 章）。</p>
<ul><li><b>マッハタック</b>（Mach tuck）：衝撃波が後ろへ動くと、圧力の中心も後ろへ動き、機首が下がる傾向が出ます（AFH 第 16 章）。</li>
<li><b>マッハバフェット</b>：衝撃波の後ろで流れがはがれて、機体が揺れます。速すぎても（高速側）、遅すぎて迎え角が大きくても（低速側）出ます（AFH 第 16 章）。</li></ul>
<p>高い所では、空気が薄く、同じ揚力に大きな迎え角が要ります。だから、高速側と低速側のバフェットの速度が近づきます。その狭い所を <b>coffin corner</b> と呼びます。荷重倍数（G、load factor）が増えると低速側のバフェットの速度が上がるので、旋回や乱気流のための余裕を残した高度と速度を選びます（AFH 第 16 章）。</p>
<h3>後退翼</h3>
<p>翼の圧力と衝撃波を決めるのは、前縁（leading edge）に直角に当たる流れの成分だけです。後退翼では、この成分が真対気速度より小さくなります。翼は実際より遅く飛んでいるように感じ、衝撃波ができるのが遅れます。だから、後退翼は臨界マッハ数を上げます（PHAK 第 5 章）。弱点は、境界層（boundary layer）が翼端へ流れて、翼端から先に失速しやすいことです。翼端は重心より後ろにあるので、翼端が失速すると機首がさらに上がります（PHAK 第 5 章）。</p>
${bk.drill('音速とマッハ数', `<p>気温 250 K（−23 ℃）の空気で、真対気速度 200 m/s のときのマッハ数を求めます。音速は a ＝ √(γRT) で、γ ≒ 1.4、R ≒ 287 J/(kg·K) とします（NASA）。</p>`, `<p>a ＝ √(1.4 × 287 × 250) ≒ ${f0(sound(250))} m/s です。M ＝ 200 ÷ ${f0(sound(250))} ≒ ${f2(200 / sound(250))} です。温度は、摂氏ではなく絶対温度（K）で入れます。気温が下がると音速も下がり、同じ真対気速度でもマッハ数は大きくなります。</p>`)}
${bk.deep('マッハ数の区分と、抗力が急に増える所', `<p>PHAK 第 5 章は、速度の範囲をおよそ次のように分けます。亜音速はマッハ 0.75 より下、遷音速は 0.75〜1.20、超音速は 1.20〜5.00、極超音速は 5.00 より上です。旅客機は、ふつうマッハ 0.7〜0.90 で巡航します（PHAK 第 5 章）。</p>
<p>臨界マッハ数を 5〜10% 超えると、抗力が急に増え始めます（抗力発散）。バフェット・トリムの変化・安定の変化・舵の効きの低下も一緒に出ます（PHAK 第 5 章）。後退翼は、この変化を遅らせ、変化の大きさも和らげます。</p>
<p>多くのジェット機は、マッハタックを打ち消す装置を持ちます。その装置が働かないと、最大のマッハ数が低く制限されます（AFH 第 16 章）。</p>`)}
${bk.key('マッハ数＝真対気速度÷音速。音速は寒いほど遅い', '低く暖かい所は VMO、高く寒い所は MMO が先に効く', '臨界マッハ数を超えると衝撃波。マッハタックとバフェット', '後退翼は臨界マッハ数を上げるが、翼端から失速しやすい')}
${bk.warn('<b>ここに注意：</b>高い高度では、高速側と低速側のバフェットの余裕が狭くなります。機体の最大の高度と、乱気流のときの速度は、AFM とメーカーの値で確かめます（AFH 第 16 章）。')}
${bk.recall('V-n 線図は、速度と荷重倍数の限界を 1 枚に描いた図です。構造の限界と失速の境界があります。', ['aero.vn', '速度の制限と V-n 線図'])}
${bk.q('同じ真対気速度で、高度 5,000 ft から 35,000 ft へ上がった。マッハ数はどう変わる？', '大きくなります。高い所は気温が低く、音速が遅いからです（PHAK 第 5 章）。だから、高い所では速度の上限はマッハ数の MMO で決まります（AFH 第 16 章）。')}` },
      { id: 'jet.fms', t: 'FMS・航法データ・TCAS・機上気象レーダー', scope: 'common', from: ['kiso04.23', 'kiso04.25', 'kiso04.26'], jcab: ['cpl.1.6.5.3', 'ir.2.5.2', 'ir.3.3.2.3'], h: () => `
${bk.aim('エアラインの機体の航法と警報の装置が、何を使って何を示すかと、それぞれの限界を覚えます。')}
${FIG.radarShadow()}
<h3>FMS と航法データ</h3>
<p>FMS は、センサー・受信機・航法データ・計算機を組み合わせて、位置と経路を管理します。入れた計画が誤っていれば、FMS はその誤った計画に正確に従います。だから、経路を入れたら、地点の名前だけでなく、位置・順番・区間・向き・制限を確かめます。似た名前の地点や、つながっていない区間にも気をつけます。航法データには有効期間があります。データが新しくても、その方式を飛ぶ承認と資格は別に要ります。</p>
<h3>TCAS：衝突を避ける装置</h3>
<p>TCAS（Traffic Alert and Collision Avoidance System）は、衝突のおそれを知らせる装置です。相手機のトランスポンダー（transponder）の応答を使います。TCAS I は交通の助言（TA）だけを出します。TCAS II は、TA に加えて、上昇か降下かの回避の指示（RA）を出します。米国では、輸送機と、31 席以上の大きなコミューター機・ビジネス機に TCAS II が要ります（米国の AIM 4-4-16）。</p>
<ul><li><b>TA</b>：相手を目で探します。TA だけで、管制の指示から外れません（米国の AIM 4-4-16）。</li>
<li><b>RA</b>：すぐに指示どおりに操縦します。RA で管制の指示から外れたら、できるだけ早く管制に伝えます（米国の AIM 4-4-16・14 CFR 91.123）。</li></ul>
<p>TCAS は、トランスポンダーのない機や、故障した機には反応しません。TCAS だけで、いつも間隔が保てるわけではありません（米国の AIM 4-4-16）。</p>
<h3>地形の警報と電波高度計（radio altimeter）</h3>
<p>TAWS（Terrain Awareness and Warning System）は、地形への接近を知らせる装置です。米国では、乗客の席が 6 席以上のタービン機に TAWS が要ります（米国の 14 CFR 91.223）。電波高度計は、電波の往復で、真下の地面までの高さを測ります。気圧の高度計とは基準が違い、海面からの高さは示しません。</p>
<h3>機上気象レーダー</h3>
<p>機上気象レーダーは、雨の粒からはね返る電波を映します。雲そのものや、乱気流そのものは映りません。多くの機のレーダーは波長が 3 cm で、強い雨に電波が吸われます（減衰）。だから、強いエコーの手前の縁だけが映り、奥は暗く見えます（AWH 第 15 章）。暗い所を「何もない」と読みません。</p>
<p>データ放送で届く地上のレーダーの画像は、少し前の天気です。米国の AIM 7-1 は、表示の時刻より 15〜20 分古いことがあるとし、雷雨（雷雲、thunderstorm）のすき間を抜けるためには使わないよう求めています。強い雷雨からは 20 マイル以上離れます（米国の AIM 7-1）。</p>
${bk.deep('TCAS の RA のあとと、地上のレーダー網との違い', `<p>米国の AIM 4-4-16 は、RA で外れる量は、RA を満たすのに要る最小にするとしています。RA に従ったあと、管制の IFR の間隔が戻るのは、次のどれかのときです（米国の AIM 4-4-16）。元の高度と経路に戻ったとき、管制が別の指示を出したとき、乗員が管制に「TCAS の操作を終えた」と伝えたときです。</p>
<p>地上の気象レーダー（WSR-88D）は波長が 10 cm で、雨による減衰が小さく、出力も大きいです。機上のレーダーは出力が 50 kW より小さいものが多く、小さな目標は映りにくいです。多くの機上のレーダーが距離による弱まりを補うのは、50〜75 NM までです（AWH 第 15 章）。</p>`)}
${bk.key('FMS は入れた計画に正確に従う。位置・順番・制限を確かめる', 'TCAS の TA は目で探す。RA はすぐに従い、管制に伝える', '機上レーダーは強い雨の奥が映らない。暗い所は安全ではない', '地上のレーダーの画像は古い。雷雨のすき間抜けに使わない')}
${bk.recall('機内に届く NEXRAD の画像は、天気があった所を映します。今ある所ではありません。', ['wx.info', '気象情報の種類と限界'])}
${bk.q('機上気象レーダーで、強いエコーの奥が暗く映っている。奥へ進んでよい？', 'よくありません。強い雨が電波を吸うと、奥まで電波が届かず、暗く映ります（AWH 第 15 章）。暗い所を安全と読まず、強いエコーの全体を大きく避けます。')}` },
      { id: 'jet.next', t: '資格を取ったあと：MCC・型式の限定・路線訓練', scope: 'common', from: ['kiso13.27'], h: () => `
${bk.aim('事業用・計器・多発の資格のあとに、エアラインの機体を飛ぶまでに何があるかの枠組みを知ります。会社ごとの手順は扱いません。')}
${FIG.careerPath()}
<p>この本の範囲は、事業用・計器・多発の資格までの知識です。エアラインの機体を飛ぶには、そのあとにも訓練と審査が続きます。中身と順番は、国と会社で違います。ここでは、公開されている決まりの例で枠組みを見ます。</p>
<ul><li><b>多人数で操縦する訓練（MCC、multi-crew cooperation）</b>：シミュレーターで練習します。2 人で飛ぶ役割分担と CRM（crew resource management）を身につけます。英国の規則では、2 人で操縦する機種の資格を初めて取る前に、学科 25 時間以上・実技 20 時間以上の MCC の課程を修めます（英国 CAA）。</li>
<li><b>型式の限定（type rating）</b>：機種ごとの資格です。米国では、12,500 lb を超える大型機とターボジェット機の機長（pilot in command）に要ります（米国の 14 CFR 61.31・1.1）。</li>
<li><b>路線訓練</b>：型式の訓練を終えたあと、実際の便で、教官役の機長と飛んで経験を積みます。米国のエアラインの規則は、型式と乗務の席ごとに、この経験を求めています（米国の 14 CFR 121.434）。</li></ul>
<p>米国では、多発の定期運送用操縦士（airline transport pilot）の学科試験（knowledge test）の前に、課程を 1 つ修めます。ATP CTP と呼ぶ課程で、学科 30 時間以上と、シミュレーター 10 時間以上です（米国の 14 CFR 61.156）。高高度の空気力学・タービンエンジン・自動化・CRM などを学びます。</p>
<h3>小型双発機と輸送機を分ける</h3>
<p>輸送機の離陸（takeoff）は、V<sub>1</sub>・V<sub>R</sub>・V<sub>2</sub> などの決められた速度で計画します。V<sub>1</sub> は、離陸をやめるときに最初の操作をする最大の速度です。同時に、臨界発動機（critical engine）が止まっても離陸を続けられる最小の速度でもあります。V<sub>2</sub> は離陸の安全速度です（米国の 14 CFR 1.2）。</p>
<p>こうした速度は、輸送機の認証と性能の資料が前提です。小型双発機に同じ資料がないのに、操縦士が自分で V<sub>1</sub> を決めてよいわけではありません。エンジンが 2 つという共通点だけで、速度とやめる・続けるの判断を移しません。共通の原理を学び、数値と手順はその機種の資料で確かめます（${bk.see('me.perf', '双発機の性能')}）。</p>
${bk.key('資格のあとも、MCC・型式の限定・路線訓練が続く', '型式の限定は機種ごとの資格。中身と順番は国と会社で違う', '輸送機の V1・V2 を、小型双発機へ当てはめない')}
${bk.warn('<b>ここに注意：</b>特定の航空会社の訓練の手順・順番・時間は、公開されていないものが多く、この本では書きません。決まりの数字は、ここでは米国と英国の例です。')}
${bk.q('小型双発機の訓練で、輸送機と同じように「V1 を決めておこう」と考えた。よい？', 'よくありません。V1 は輸送機の認証と性能の資料が前提の速度です（米国の 14 CFR 1.2）。小型双発機は、その機体の POH の速度と手順で、離陸をやめる・続ける判断を決めます。')}` },
    ],
    terms: [['Spool-up', 'エンジンの加速（ジェット）', '全開まで、長いと 10 秒ほど'], ['Propeller slipstream', 'プロペラの後流', ''], ['Spoiler / Speedbrake', 'スポイラー・スピードブレーキ', '揚力を減らす板・抗力を増やす板'], ['Energy management', 'エネルギーの管理', 'AFH 第 4 章'], ['Top of descent (TOD)', '降下開始点', '千 ft × 3 NM ＋ 減速の分'], ['Swept wing / Tip stall', '後退翼・翼端失速', ''], ['Mach number / MMO', 'マッハ数・最大運用マッハ数', '真対気速度 ÷ 音速'], ['Coffin corner', '高速側と低速側の限界が近づく高高度の領域', ''], ['Autopilot / Autothrottle / FMS', '自動操縦装置・自動推力・飛行管理装置', ''], ['Flight director (FD)', 'フライトディレクター', '操縦の指示を出す表示'], ['FMA', '飛行モードの表示', 'Flight Mode Annunciator'], ['Armed / Active', '待機中・作動中（モード）', ''], ['Automation surprise', '自動化に驚かされること', ''], ['Manual flight operations', '手で飛ぶこと', 'SAFO 13002・17007'], ['Upset', '異常姿勢', '機首上げ 25°・機首下げ 10°・バンク 45° を超える'], ['LOC-I', '飛行中の操縦不能', 'Loss of Control In-flight'], ['UPRT', '異常姿勢の防止と回復の訓練', 'Upset Prevention and Recovery Training'], ['Startle / Surprise', '驚愕（とっさの体の反応）・驚き（予想と違うこと）', 'AC 120-111'], ['SAFO', '運航者向けの安全情報', 'FAA'], ['Dutch roll', 'ダッチロール', 'ロールとヨーの組の揺れ'], ['Yaw damper', 'ヨーダンパー', '方向舵を自動で動かして揺れを収める'], ['Super / Heavy / Large / Small', '後方乱気流の区分', '米国の P/CG：最大離陸重量で分ける'], ['VMO', '最大運用速度（ノット）', ''], ['Critical Mach number', '臨界マッハ数', '翼の上のどこかで流れがマッハ 1 に届く機体のマッハ数'], ['Mach tuck', 'マッハタック', '機首が下がる傾向'], ['Mach buffet', 'マッハバフェット', '衝撃波の後ろの流れのはがれによる揺れ'], ['TCAS / TA / RA', '衝突を避ける装置・交通の助言・回避の指示', '米国の AIM 4-4-16'], ['TAWS', '地形への接近の警報装置', 'Terrain Awareness and Warning System'], ['Radio altimeter', '電波高度計', '真下の地面までの高さ'], ['Attenuation', '減衰', '強い雨が電波を吸い、奥が映らない'], ['MCC', '多人数で操縦する訓練', 'Multi-crew cooperation'], ['Type rating', '型式の限定', '機種ごとの資格'], ['V1 / V2', '離陸をやめる・続ける判断の速度・離陸の安全速度', '14 CFR 1.2。輸送機の考え方']],
    examples: ['空港の標高より 35,000 ft 上から降りる：35 × 3 ＝ 105 NM ＋ 段階的な減速の分 約 15 NM ＝ 約 120 NM 手前から降下（AFH 第 16 章の例。風や管制の指示で変わる）。', 'ジェット機は、水平飛行のまま出力をアイドルにしても、10 kt 減らすのに約 1 NM かかる → 減速は早めに計画する。', '自動操縦が思った方向へ曲がらない → まず機体を飛ばす → FMA でモードを確かめる → 3 つの問いに答えられない → 針路を保つモードへ。それでもだめなら手で飛ぶ。', '雲の中で速度が増え、高度が下がり、右に深く傾いている（機首下げ）→ 出力アイドル → 少し押して荷重を抜く → 翼を水平 → ゆっくり水平へ（AFH 第 5 章）。', '気温 250 K で真対気速度 200 m/s → 音速 約 317 m/s → マッハ 約 0.63（jet.speed）。', 'TCAS II の RA「Climb, climb」→ すぐに指示どおり上昇 → 管制に RA で外れたことを伝える → 衝突のおそれがなくなったら元の許可へ戻る（米国の AIM 4-4-16）。'],
    cautions: ['この章は一般的な入門。ジェット機の操作・自動操縦の使い方・回復の手順は、型式ごとの AFM と運航者の SOP が優先する。特定の航空会社の訓練内容ではない。', '異常姿勢・失速の実機の練習は、資格のある教官と、その練習に適した機体・高度で行う（AFH 第 5 章）。Archer では、背面になる操作とスピンは認められていない（POH）。普通類で飛ぶときは、60° を超えるバンクもしない。異常姿勢の回復の練習は、この範囲の中で、教官と行う。', '数値の目安（千 ft × 3 NM、1 NM で 10 kt、全開まで 10 秒ほどなど）は AFH の一般的な説明で、機種・重さ・風で変わる。', '資格・訓練の決まりの数字（MCC の時間・型式の限定・ATP CTP）は米国と英国の例で、日本や会社の制度とは違う。'],
    quiz: [
      { q: 'ジェット機で出力を使うときに大切なことは？（AFH 第 16 章の一般的な説明）', choices: ['プロペラ機と同じタイミングでよい', 'エンジンの反応に時間がかかるので、早めに先回りする', '出力は使わない', '必ず最大にする'], answer: 1, why: 'アイドル付近からの加速は遅く、全開まで、長いと 10 秒ほどかかる（AFH 第 16 章）。先回りして使う。' },
      { q: '自動操縦の動きが理解できないとき、正しい考え方は？', choices: ['別のモードを次々に試し、原因がわかるまで直さない', 'まず機体を飛ばし、モードを確かめ、わからなければより簡単な使い方にする', '自動操縦のまま、FMS の入力を見直し続ける', 'しばらく様子を見る'], answer: 1, why: 'まず機体を飛ばす。いま何をしている・なぜ・次は、に答えられなければ、より簡単なモードに切り替え、必要なら自動操縦と自動推力を切って手で飛ぶ（AC 120-123）。' },
      { q: 'FAA の説明で「異常姿勢（upset）」にあたるのは？', choices: ['バンク 30° のふつうの旋回', '意図せずにバンクが 45° を超えた', '機首上げ 10° で上昇している', '標準旋回で待機している'], answer: 1, why: 'AFH 第 5 章・AC 120-111：意図せずに機首上げ 25° 超・機首下げ 10° 超・バンク 45° 超、またはその範囲でも状況に合わない速度。' },
      { q: '機首下げ・速度が増えている・深く傾いている（スパイラル）。回復でやってはいけないことは？', choices: ['出力をアイドルにする', '傾いたまま操縦桿を強く引く', '翼を水平に戻す', '少し押して荷重を抜く'], answer: 1, why: '傾いたまま引くと旋回が締まり、荷重が急に増える。AFH 第 5 章：アイドル → 荷重を抜く → 翼を水平 → ゆっくり機首を上げる。' },
      { q: '空港の標高より 35,000 ft 上の巡航から降りる。AFH 第 16 章の目安で、降下を始めるのはおよそどこ？（無風・まっすぐの進入）', choices: ['約 35 NM 手前', '約 70 NM 手前', '約 120 NM 手前', '約 350 NM 手前'], answer: 2, why: '降りる高さ（千 ft）× 3 ＝ 105 NM に、水平飛行で減速する距離（1 NM に約 10 kt）約 15 NM を足す（AFH 第 16 章。本文 crm.jet）。' },
      { q: 'ダッチロールを収めるために、高速の後退翼の機体が付けている装置は？', choices: ['ヨーダンパー', 'スティックシェーカー', 'スポイラー', '電波高度計'], answer: 0, why: 'ダッチロールが続きやすい機体は、ジャイロで揺れを感じて方向舵を動かすヨーダンパーを付ける（PHAK 第 5 章。本文 crm.jet）。' },
      { q: '同じ真対気速度で高く上がると、マッハ数はどうなる？', choices: ['小さくなる', '変わらない', '高度だけで決まり、気温には関係しない', '大きくなる'], answer: 3, why: 'マッハ数は真対気速度 ÷ 音速。高い所は気温が低く、音速が遅いので、マッハ数は大きくなる（PHAK 第 5 章：海面 15 ℃ で 661 kt、−55 ℃ で 574 kt。本文 jet.speed）。' },
      { q: 'TCAS II の RA（回避の指示）が出た。米国の AIM 4-4-16 の考え方で正しいものは？', choices: ['管制の指示が優先なので、RA は無視する', 'TA と同じく、目で探すだけにする', 'すぐに指示どおりに操縦し、外れたらできるだけ早く管制に伝える', 'RA が消えるまで高度を変えない'], answer: 2, why: '米国の AIM 4-4-16：RA にはすぐに従う。管制の指示から外れたら、できるだけ早く管制に伝える（米国の 14 CFR 91.123 も同じ。本文 jet.fms）。' },
      { q: '機上気象レーダーで、強いエコーの奥が暗く映る理由として正しいものは？', choices: ['奥には雨がないから', '画面の明るさの設定が低いから', '奥の雷雨は弱いことが多いから', '手前の強い雨が電波を吸って、奥まで届かないから'], answer: 3, why: '多くの機上のレーダーは波長が 3 cm で、強い雨に電波が吸われる（減衰）。手前の縁しか映らないことがある（AWH 第 15 章。本文 jet.fms）。' },
    ],
    written: [
      ['気温 250 K、真対気速度 200 m/s のときの音速とマッハ数を求めてください。γ ≒ 1.4、R ≒ 287 J/(kg·K) とします。', `音速は √(1.4 × 287 × 250) ≒ 317 m/s、マッハ数は 200 ÷ 317 ≒ 0.63 です。温度は絶対温度（K）で入れます。同じ真対気速度でも、気温が下がると音速が下がり、マッハ数は大きくなります。${bk.see('jet.speed', '高速飛行とマッハ数')}`, ['kiso04.q9']],
      ['自動操縦の設定を変えたあと、何を照らし合わせますか。', `指示した中身、作動中と待機中のモード、実際の姿勢・速度・経路です。フライトディレクターの指示と、自動操縦が実際に動かしていることも分けて見ます。思ったとおりでなければ、その機体の手順で操縦を確保し、合った自動化の程度を選びます。${bk.see('crm.auto', '自動操縦とモード')}`, ['kiso12.q26']],
      ['大型の輸送機の V1 や V2 という考え方を、資料に書いていない小型双発機へ当てはめてよいですか。', `よくありません。認証・性能・運航の方式・訓練の前提が違います。推力と抗力の共通の原理は学びますが、速度の決め方・離陸の性能・故障のときの手順は、その機体の資料で確かめます。${bk.see('jet.next', '資格を取ったあと')}`, ['kiso13.q27']],
    ],
    refs: [R.afh15, R.afh4, R.afh5, R.phak5, NEW_R.ac61107, R.cfr1, R.cfr12, NEW_R.nasaSound, R.aim74, R.pcg, R.aim44, R.aim71, R.cfr91, R.wx, R.cfr61, NEW_R.cfr121434, NEW_R.caaMcc, R.automation, R.ac120123, R.safo, R.safo17007, R.upset, R.ifh, R.archerPoh], lessons: ['i2'] });

  // ======================================================================= 第 6 部 第 40 章（新）
  B.add({ id: 'tsys', part: 'p6', t: '輸送機のシステムとジェットエンジン', en: 'Transport-category aircraft systems and turbine engines',
    summary: '大きな機体の系統図の読み方と冗長性、操縦の指令と作動の力・電気・油圧・燃料・ブレーキ、空気・空調・与圧・酸素・防除氷・火災の防護、ガスタービンエンジンとその計器、輸送機の重量と重心（%MAC）と滑走路の状態。訓練機にない装置を、原理と「何が残るか」で考えられるようにする。',
    secs: [
      { id: 'tsys.arch', deep: true, t: '系統図・冗長性・つながり', scope: 'common', from: ['kiso02.04', 'kiso02.24', 'kiso02.25'], h: () => `
${bk.aim('大きな機体の系統図を、供給・分配・制御・使う所・表示と保護に分けて読み、1 つの故障で何が止まり何が残るかを考えられるようにします。')}
${FIG.sysDepend()}
<p>系統図は、部品の実際の位置を描いた地図ではありません。機能のつながりを読む図です。まず凡例で、線の種類・ふだんの状態・弁の開閉・破線の意味を確かめます。それから、次の順にたどります。</p>
${bk.t(['たどるもの', '確かめること'], [['供給源', '発電機（alternator）・バッテリー・ポンプ・空気の元。ふだん使う元と代わりの元'], ['分配', '母線・配管・弁。どこでほかの系統とつながるか'], ['制御', '指令を出す装置と、実際に切り替える装置'], ['使う所', 'モーター・作動筒・ヒーター・計器・灯火'], ['表示と保護', 'センサーの位置・警報の条件・遮断や逃がしの働き']])}
<h3>2 つあることと、独立していること</h3>
<p>冗長性（redundancy）は、要る機能を複数の手段で支える考え方です。ただし、ポンプが 2 つあっても、同じ電源や同じタンクを使えば、その共通の所が壊れると両方が止まります。数だけでなく、共通の頼り先を探します。隔離（isolation）は、影響が広がらないように系統を分けることです。代替（alternate）は、別の経路や動かし方を使うことです。代わりの経路では、速さ・時間・自動の制御に制限がつくこともあります。</p>
<h3>図で考える</h3>
<p>上の図の仮想の機体では、重要母線が止まると、電動ポンプ・表示・ピトー加熱が止まります。手動圧力源はブレーキだけにつながるので、脚は動かせません。油圧がすぐにゼロになるかは、蓄圧器と漏れによるので、図だけでは決められません。抽気が止まったら、空調と熱空気式の防氷を考えます。「図で分かること」と「資料で確かめること」を分けて話します。</p>
${bk.photo('ch02-photo2')}
${bk.deep('自分の機体で学ぶ・故障したまま出られるか', `<p>原理を、実際に飛ぶ機体の資料へ移します。AFM と POH（pilot's operating handbook）には、いろいろな内容があります。系統の説明・制限・通常と非常の手順・性能・重量（weight）と重心・補足で、互いにつながっています。系統を 1 つ選び、白い紙にふだんの流れを描きます。センサーと保護の装置を置き、ふだんの元が止まったときの経路を色で分けます。資料で確かめた所にはページを書き、推測で書いた所は残さず確かめ直します。最後に教官へ、何が残るか・どの制限が変わるか・どの手順を見るかを説明します。</p>
<p>装置が一部壊れたまま出られるかは、「原理では動く」という推測では決まりません。米国では、壊れた装置を積んだまま離陸（takeoff）するには、承認された最低装備のリスト（MEL）とその許可などが要ります（米国の 14 CFR 91.213）。自分で「要らない」と決めて飛びません。</p>`)}
${bk.key('系統図は機能のつながりの図。供給→分配→制御→使う所の順にたどる', '2 つあっても、共通の頼り先が壊れれば両方止まる', '何が止まり、何が残り、何に時間の制限があるかを分けて言う')}
${bk.recall('計器の情報は、センサーから計算機を通って表示に届きます。同じ元を使う表示は、同じように誤ります。', ['inst.flow', '計器が示すもの：情報の流れと依存'])}
${bk.q('電動ポンプが 2 つある。でも、2 つとも同じ母線から電気をもらい、同じリザーバーを使っている。独立した冗長系統と言える？', '言えません。片方のポンプの故障には備えられますが、母線の停電や作動油の喪失では、両方が止まります。数だけでなく、電源・作動油・配管・制御の共通の頼り先を調べます。')}` },
      { id: 'tsys.power', deep: true, t: '操縦の指令・電気・油圧・燃料・ブレーキ', scope: 'common', from: ['kiso02.05', 'kiso02.07', 'kiso02.09', 'kiso02.10', 'kiso02.12', 'kiso02.13', 'kiso02.15'], jcab: ['cpl.1.3.1.3', 'cpl.1.3.6.1', 'cpl.1.3.6.2', 'cpl.1.5.1.2', 'cpl.1.5.1.3'], h: () => `
${bk.aim('大きな機体で、舵を動かす指令と力の道を分けて考え、電気・油圧・燃料・ブレーキの役割と、止まったときに残るものを覚えます。')}
${FIG.hydCircuit()}
<h3>指令の道と、力の道</h3>
<p>操縦の入力が舵の動きになるまでには、2 つの道があります。指令を伝える道と、舵を動かす力の道です。小型機では、ケーブルやロッドで、操縦士の力で舵を動かします。大きな機体では、作動油の圧力で舵を動かす機体が多くあります。フライバイワイヤ（fly-by-wire）では、操縦の入力を計算機に入れ、計算機の出力が舵の作動筒を動かします（AMT ハンドブック）。名前だけで、すべての舵が電動とは決めません。故障したときに残る舵や制限は、機種で違います。</p>
<h3>電気</h3>
<p>発電機（オルタネーター）が作った電気は、母線（bus）を通って使う所へ配られます。バッテリーは、始動と予備の電源です。外部電源や APU から電気をもらえる機体もあります。電気が足りないときは、決めた順に負荷を切り離して、要る電気を守ります（load shedding）。非常の電源があることと、すべての装置がふだんどおり使えることは、別のことです。</p>
<h3>油圧</h3>
<p>油圧は、圧力を持った作動油で、力と動きを伝えます。基本の部品は、リザーバー・ポンプ・フィルター・切替弁・逃がし弁・作動筒です（PHAK 第 7 章）。大きな機体では、舵・フラップ（flaps）・スポイラーなどを油圧で動かします（PHAK 第 7 章）。作動の圧力は、小型機の数百 psi から、大型の輸送機の 5,000 psi まであります（AMT ハンドブック）。ふだんの動力をすべて失ったときに、機体の下に出して風で回し、油圧と電気を作るラムエアタービン（RAT）を持つ機体もあります（AMT ハンドブック）。</p>
${bk.photo('ch02-photo3')}
<h3>燃料</h3>
<p>タンクに燃料を入れる給油、タンクからタンクへ動かす移送、左右の供給の管をつなぐクロスフィード（crossfeed）は、目的も配管も違います。左右の量の差には、選んだタンク・移送・漏れ・計器の誤差など、いくつもの原因がありえます。漏れがあるのに左右をつなぐと、ほかのタンクの燃料まで漏れる側へ送ることがあります。だから、左右の差の手順と漏れの手順は分けて学びます。燃料計の残り・使った量の積算・最初の量を、同じ時刻で照らし合わせます。</p>
<h3>ブレーキ</h3>
<p>車輪のブレーキは、摩擦で運動のエネルギーを熱に変えます。大きな機体には、車輪が滑りそうになるとブレーキの圧力を自動で弱めるアンチスキッド（anti-skid）があります。決めた減速で自動でブレーキをかけるオートブレーキを持つ機体もあります（AMT ハンドブック）。エアラインの機体の多くは、炭素繊維の円盤を使うカーボンブレーキです。ふつうのブレーキより約 40% 軽く、高い温度に耐えます（AMT ハンドブック）。</p>
${bk.photo('ch02-photo5')}
${bk.drill('油圧の力と、燃料の収支', `<p>① 圧力の差 10 MPa が、面積 4.0 cm² のピストンに働くときの力を求めます。② 最初の使用可能な燃料 2,400 kg、いまの残り 1,550 kg、同じ時刻からの使用量の積算 650 kg のとき、収支の差を求めます。どちらも仮想の値です。</p>`, `<p>① 力 ＝ 圧力の差 × 面積です。10 MPa ＝ 10,000,000 Pa、4.0 cm² ＝ 0.00040 m² なので、10,000,000 × 0.00040 ＝ 4,000 N です。面積を cm² のまま入れないことが大切です。</p>
<p>② 使った量だけから考える残りは 2,400 − 650 ＝ 1,750 kg です。差は 2,400 −（1,550 ＋ 650）＝ 200 kg です。差があるだけで漏れとは決めません。最初の量・記録の時刻・積算の基準・計器の誤差を確かめ、差が広がるか、左右の量・流量・警報を照らし合わせます。</p>`)}
${bk.deep('ブレーキが吸うエネルギーと、油圧の表示の読み方', `<p>運動のエネルギーは、E ＝ ½ × 質量 × 速度² です。質量 1,200 kg・対地速度（groundspeed）30 m/s なら 540 kJ、36 m/s なら 777.6 kJ で、1.44 倍です（仮想の値）。速度が 2 割増えるだけで、ブレーキが熱に変えるエネルギーは 4 割以上増えます。熱くなったブレーキには、冷やす時間が要ります。</p>
<p>油圧の表示は、圧力・作動油の量・温度を分けて読みます。量が減り続けていれば、今の圧力が正常でも、いずれ供給できなくなります。ポンプが止まっても、蓄圧器で一部の機能が短い間だけ残る設計もあります。その回数や時間を、図があるだけで推測しません。作動油は決められたものを使い、色が似ていることを互換の理由にしません。</p>`)}
${bk.key('指令の道と、舵を動かす力の道を分けて考える', '非常の電源があっても、すべての装置が使えるわけではない', '移送とクロスフィードは別。漏れのときに左右をつながない', 'アンチスキッドは滑りを防ぎ、オートブレーキは自動で減速する')}
${bk.recall('Archer のブレーキは、足で踏んで油圧を作る方式です。運動のエネルギーを熱に変えて止めます。', ['sys.gear', '脚とブレーキ'])}
${bk.q('燃料の左右の量に差が出てきた。すぐにクロスフィードで左右をそろえてよい？', '原因を確かめる前には、よくありません。差の原因には、漏れ・移送・計器の誤差などがあります。漏れがあるのに左右をつなぐと、ほかのタンクの燃料まで漏れる側へ送ってしまいます。収支・流量・警報を照らし合わせ、その機体の左右の差の手順と漏れの手順に従います。')}` },
      { id: 'tsys.env', deep: true, t: '空気・空調・与圧・酸素・防除氷・防火', scope: 'common', from: ['kiso02.16', 'kiso02.17', 'kiso02.18', 'kiso02.19', 'kiso02.20', 'kiso02.21', 'kiso02.22'], jcab: ['cpl.1.3.3', 'cpl.1.3.4', 'cpl.1.3.5', 'ir.3.3.2.4'], h: () => `
${bk.aim('高い所を飛ぶ機体の空気・与圧・酸素と、氷と火から機体を守る装置の役割を、それぞれ別の機能として覚えます。')}
${FIG.cabinPress()}
<h3>空気と空調</h3>
<p>タービン機の多くは、エンジンの圧縮機から取り出した空気（抽気、bleed air）を使います。抽気は、空調・与圧・防氷などに配られます（AMT ハンドブック）。抽気はそのままでは熱すぎるので、空調の装置（パック）で冷やしてから客室へ送ります（AMT ハンドブック）。温度がちょうどよいことと、客室の気圧がちょうどよいことは、別のことです。</p>
<h3>与圧</h3>
<p>与圧は、客室を外より高い気圧に保つしくみです。空気を入れ続け、出ていく量をアウトフロー弁（outflow valve）で調整します（PHAK 第 7 章）。客室の気圧を、同じ気圧になる標準大気の高さで言ったものが<b>客室高度</b>（cabin altitude）です。客室と外の気圧の差が<b>差圧</b>（differential pressure）です（PHAK 第 7 章）。与圧の機体は、ふつう、設計の最大の巡航高度（cruising altitude）で客室高度を約 8,000 ft に保ちます（PHAK 第 7 章）。米国の輸送機の基準も、通常の運航で客室高度を 8,000 ft 以下とします（米国の 14 CFR 25.841）。</p>
<p>差圧には、胴体の強さで決まる上限があります。上限に達したあとさらに上がると、客室高度も上がります（PHAK 第 7 章）。安全弁は、差圧が上限を超えないように空気を逃がし、外の気圧が客室より高くならないように外の空気を入れます（PHAK 第 7 章）。</p>
<h3>減圧と酸素</h3>
<p>与圧が保てなくなるのが減圧です。0.5 秒より短い減圧は爆発的減圧と呼ばれ、霧・ほこり・飛ぶ物が出ます（PHAK 第 7 章）。急減圧のあとは、同じ高度でも有効意識時間（time of useful consciousness）が短くなります。AC 61-107B の表では、25,000 ft で 3〜5 分が、急減圧のあとは 1.5〜2.5 分です。客室高度の警報は、客室高度が 10,000 ft で鳴ります（米国の Part 23・25 の機体。AC 61-107B）。警報が鳴ったら、すぐ酸素マスクを着けます。</p>
<p>乗客用の酸素は、ふつう連続流（continuous flow）です。乗員用は、吸ったときだけ流れる希釈要求式（diluter-demand）や、圧力をかけて送る加圧要求式（pressure-demand）です（PHAK 第 7 章）。化学式の酸素発生器は、一度火が付くと止められず、ふつう 10〜20 分酸素を出し、熱を出します（AMT ハンドブック）。マスクが下りたこと・酸素が流れていること・客室の気圧が保たれていることは、別々に確かめます。</p>
${bk.photo('ch02-photo6')}
<h3>防氷と除氷</h3>
<p>防氷（anti-icing）は氷が付かないようにする働き、除氷（deicing）は付いた氷を取る働きです（PHAK 第 7 章）。熱い空気で翼の前縁（leading edge）を温める型は、氷の条件に入る前に入れます。ゴムのブーツをふくらませて氷を割る型は、今の機体では、氷が付いたのが見えたらすぐ動かしてかまいません（PHAK 第 7 章）。使い方は、その機体の AFM で確かめます。ピトー管（pitot tube）を温める装置があっても、翼の着氷（アイシング、icing）の中を飛んでよいことにはなりません（PHAK 第 7 章）。地上で除氷液をかけることと、飛行中の機体の防氷も、別のことです。</p>
${bk.photo('ch02-photo7')}
<h3>火災の防護</h3>
<p>火災の防護は、見つける・広がりを止める・消す、の 3 つに分けます。火や過熱を見つける装置には、熱で入るスイッチ・熱電対・区画を囲む連続のループがあります（AMT ハンドブック）。貨物室などでは、煙を見つける装置を使います。推力（thrust）の表示が正常でも、火災の警報を後回しにしません。警報が消えても、火が消えたとは限りません。検知の部分が焼けて、警報が出なくなることもあるからです。</p>
${bk.deep('与圧と酸素の計算・人への影響', `<p>差圧 ＝ 客室の気圧 − 外の気圧 です。仮想の値で、客室 75 kPa・外 25 kPa なら、差圧は 50 kPa です。客室高度は 75 kPa に当たる標準大気の高さで、外の 25 kPa に当たる高さではありません。</p>
<p>小さく見える差圧も、大きな力になります。力 ＝ 差圧 × 面積 なので、2.0 kPa が 0.60 m² の平らな面に働けば、2,000 × 0.60 ＝ 1,200 N です（仮想の値）。地上にいることやエンジンが止まっていることだけでは、差圧がゼロとは決めません。ドアは、訓練を受けた人が、その機体の手順で開けます。</p>
<p>米国の AC 61-107B の表は、有効意識時間を、18,000 ft で 20〜30 分、30,000 ft で 1〜2 分、35,000 ft で 30 秒〜1 分としています。急減圧のあとは、それぞれ 10〜15 分、30 秒〜1 分、15〜30 秒に縮みます。値は平均で、人による差が大きいので、短い方で考えます。</p>
<p>酸素は燃えませんが、ものが燃えるのを強く助けます。油や汚れ、火の元から離します。補給や点検は決められた方法で行い、自分のやり方で作業しません。</p>`)}
${bk.key('温度が合っていることと、客室の気圧が保たれていることは別', '客室高度はふつう約 8,000 ft。警報は 10,000 ft で、すぐマスク', '防氷は付かないように、除氷は付いた氷を取る', '火災の警報が消えても、火が消えたとは決めない')}
${bk.recall('低酸素症（hypoxia）は、少しずつ進むと自分では気づきにくい症状です。有効意識時間は高いほど短くなります。', ['hf.altitude', '高度と体：低酸素'])}
${bk.q('ピトー管を温める装置がある機体なら、主翼に氷が付く条件の中を飛んでよい？', 'よくありません。ピトー管を守ることと、主翼や尾翼の氷への能力・承認・制限は別です（PHAK 第 7 章）。その機体が氷の条件で飛ぶ承認を持つか、装置が正常か、AFM の使い方を確かめます。')}` },
      { id: 'tsys.turbine', deep: true, t: 'ガスタービンエンジンとその計器', scope: 'common', from: ['kiso03.19', 'kiso03.20', 'kiso03.21', 'kiso03.22', 'kiso03.23', 'kiso03.24', 'kiso03.25', 'kiso03.26', 'kiso03.27'], jcab: ['cpl.1.4.2.1', 'cpl.1.4.2.2', 'cpl.1.4.2.3'], h: () => `
${bk.aim('ガスタービンエンジンが空気から推力を作るしくみと種類、その計器、始動と飛行中の異常の見分け方を覚えます。')}
${FIG.turbofanFlow()}
<p>タービンエンジンは、空気の入口・圧縮機・燃焼室・タービン・排気口でできています。入った空気の速さを上げて、推力を作ります（PHAK 第 7 章）。圧縮機は軸の仕事で空気を押し縮めます。燃焼室は燃料を燃やして熱を加えます。タービンはガスから軸の仕事を取り出し、その仕事で圧縮機を回します。排気口は流れを速くします。流れを後ろへ速くする反作用が、機体を前へ押す推力です。</p>
${bk.t(['種類', 'しくみ（PHAK 第 7 章）'], [['ターボジェット', '圧縮機・燃焼室・タービン・排気口。速い排気で推力を作る。低い回転では、スロットルへの反応が遅い'], ['ターボファン', '前のファンを通った空気の一部が、燃焼室の外を回って後ろへ流れる（バイパス）。推力が増え、燃料が少なくて済み、音も小さい'], ['ターボプロップ', 'タービンが、減速ギアを通してプロペラを回す。プロペラは、エンジンよりずっと遅い回転で効率がよい'], ['ターボシャフト', 'タービンが、プロペラ以外の軸を回す。ヘリコプターや、大きな機体の APU に使う']])}
<p><b>バイパス比</b>は、コアの外を回る空気を、コアを通る空気で割った値です（NASA）。バイパスの流れ 400 kg/s・コアの流れ 50 kg/s なら、400 ÷ 50 ＝ 8 です。全部の流れ 450 kg/s を 50 で割った 9 ではありません。</p>
<h3>タービンの計器</h3>
${bk.t(['計器', '示すもの（PHAK 第 7 章）'], [['EPR', '排気側と入口の圧力の比。ターボジェット・ターボファンの出力を示す'], ['EGT・ITT・TIT・TOT', 'タービンのまわりのガスの温度。名前はセンサーの位置で違う。いちばん熱いのはタービンの入口'], ['トルク計', 'ターボプロップ・ターボシャフトの軸の出力'], ['N1・N2', '低圧と高圧の圧縮機の回転数を、設計の回転数に対する % で示す']])}
<p>名前が同じでも、どの軸を示すかは機種で違います。温度は、測る位置の違うエンジンどうしで、そのまま比べません。推力は空気の密度とともに変わり、気温が高いと減ります（PHAK 第 7 章）。</p>
<h3>FADEC</h3>
<p>FADEC（Full Authority Digital Engine Control）は、エンジン（とプロペラ）を計算機で制御する装置です（PHAK 第 7 章）。FADEC が止まると推力をすべて失うおそれがあるので、予備の電源と、同じ働きの 2 つのチャンネルを持ちます（PHAK 第 7 章）。FADEC があっても、すべての異常や過熱を防げるとは考えません。電源・センサー・チャンネル・配線と作動の装置・保護の働きの 5 つで、何に頼っているかを確かめます。</p>
<h3>始動と飛行中の異常</h3>
${bk.t(['名前', '起きること（PHAK 第 7 章）'], [['ホットスタート', '始動中に排気ガス温度（exhaust gas temperature）が限界を超える。燃料が多すぎるか、回転が足りない'], ['ハングスタート', '点火のあと、決められた回転まで加速しない。始動の電源の不足や燃料の制御の不具合'], ['圧縮機失速（compressor stall）', '圧縮機の羽根の迎え角（angle of attack）が大きすぎて、流れが乱れる。「バン」という音・回転の揺れ・排気ガス温度の上昇'], ['フレームアウト', 'エンジンの火が意図せずに消える。燃料と空気の比が濃すぎても薄すぎても起きる']])}
<p>圧縮機失速は、飛行機全体の失速（stall）とは別のものです。続く圧縮機失速では、すぐに出力を絞り、機体の迎え角を減らし、速度を増やします（PHAK 第 7 章）。そのあとの手順は、その機体の AFM に従います。大きな音だけで原因を決めず、回転・温度・振動・推力・警報を照らし合わせます。</p>
${bk.photo('ch03-photo5')}
${bk.drill('EPR・減速ギア・バイパス比', `<p>① 入口の全圧（total pressure）100 kPa・出口の全圧 180 kPa のときの EPR を求めます。② 入力 9,000 rpm を 3 対 1 の減速ギアで落とすときの、出力の回転とトルクを求めます。損失は考えません。</p>`, `<p>① EPR ＝ 180 ÷ 100 ＝ 1.80 です。決められた測る位置の全圧で比べます。</p>
<p>② 出力は 9,000 ÷ 3 ＝ 3,000 rpm です。軸の出力は同じなので、トルクは 3 倍になります。減速ギアがエネルギーを新しく作るわけではありません。同じトルクでも、回転が違えば軸の出力は違います。</p>`)}
${bk.deep('定格と応答・燃料の消費率・表示から考える', `<p>エンジンには、離陸や連続運転など、条件ごとの定格と制限があります。制限には、温度・トルク・回転数・時間があります。抽気や補機は、推力のほかに空気と軸の仕事を使います。レバーを動かした直後の要求と、実際の推力は同じではありません。回転部の慣性と燃料の制御で、応答に時間差があるからです（${bk.see('crm.jet', 'プロペラ機とジェット機の違い')}）。</p>
<p>燃料の消費率には、軸の出力で割るもの（BSFC）と、推力で割るもの（TSFC）があります。割る量も単位も違うので、2 つの数字をそのまま比べません。</p>
<p>表示が変わったら、いつ・どの条件で・どの表示が・どの順で変わったかを整理します。表示が戻っても、原因がなくなったのか、制御が補ったのか、測る系統が変わったのかは、戻った値だけでは分かりません。飛行中は、要る操縦と決められた異常の手順を先にします。</p>`)}
${bk.photo('ch03-photo6')}
${bk.key('タービンは空気を圧縮・燃焼・膨張させ、流れを速くして推力を作る', 'バイパス比はバイパスの流れ÷コアの流れ', 'ホットスタートは温度、ハングスタートは回転、圧縮機失速は流れの乱れ', 'FADEC があっても、電源とセンサーへの頼りを確かめる')}
${bk.recall('ピストンエンジン（reciprocating engine）は、吸入・圧縮・燃焼・排気の 4 つの行程を、シリンダーの中で順に繰り返します。', ['sys.piston', 'ピストンエンジンのしくみ'])}
${bk.q('タービンエンジンの始動中に、回転が途中で上がらなくなった。ホットスタートとハングスタートのどちら？', 'ハングスタートです。点火のあと、決められた回転まで加速しない状態です。ホットスタートは、排気ガス温度が限界を超える状態です（PHAK 第 7 章）。どちらも、その機体の手順で始動をやめるかを決めます。')}` },
      { id: 'tsys.wb', deep: true, t: '輸送機の重量と重心・滑走路の状態', scope: 'common', from: ['kiso05.13', 'kiso05.7', 'kiso05.22', 'kiso06.27'], jcab: ['cpl.1.7.1.1', 'cpl.1.7.1.2', 'cpl.1.7.2.1', 'cpl.1.7.2.4', 'ppl.1.3.1.1', 'ppl.1.3.1.2'], h: () => `
${bk.aim('輸送機が重心を %MAC で表す理由と計算、飛行の段階ごとの重量の限界、床の荷重、滑走路の状態の伝え方を覚えます。')}
${FIG.macPercent()}
<h3>重心を %MAC で表す</h3>
<p>空力平均翼弦（mean aerodynamic chord）は、翼の形を考えた、代表の翼弦です。MAC と書きます。メーカーは、MAC の長さと、その前縁（LEMAC）の位置を、基準面からの距離で示します。輸送機は、重心位置（重心、center of gravity）を、MAC の前縁からの距離が MAC の長さの何 % かで表します（W&B ハンドブック）。</p>
<p>%MAC ＝（重心のアーム（arm）− LEMAC のアーム）÷ MAC × 100 です（W&B ハンドブック）。ふつう、重心が MAC の 25% 付近にあると、飛び方がよいとされます（W&B ハンドブック）。重心のアームと LEMAC のアームは、同じ基準面・同じ単位でそろえます。</p>
<h3>段階ごとの重量の限界</h3>
<p>零燃料重量（zero fuel weight）は、燃料を除いた機体の重さです（W&B ハンドブック）。燃料を使うので、機体の重さは、出発前・離陸・着陸で変わります。だから、重さの上限は、次のように段階ごとに決められます（W&B ハンドブック）。</p>
<ul><li>ランプ重量（ramp weight）の上限</li><li>最大離陸重量（maximum takeoff weight）</li><li>最大着陸重量（maximum landing weight）</li><li>最大零燃料重量</li></ul>
<p>人や荷物を増やした分を、燃料を減らして埋めても、最大零燃料重量は守れません。構造の上限の内でも、滑走路・気温・標高・障害物で、性能の上限がさらに小さくなります。</p>
<h3>床の荷重と固定</h3>
<p>総重量と重心のほかに、荷物室ごとの上限・床が受け持てる荷重・固定の方法を、別々に確かめます。重さが上限の内でも、細い脚や角に荷重が集まると、床の一部に大きな力がかかります。床の荷重が範囲の内でも、固定は省けません。</p>
${bk.photo('ch05-photo4')}
<h3>滑走路の状態</h3>
<p>米国では、空港が滑走路を 3 つ（接地・中央・残り）に分けて評価します。そして、滑走路状態コード（RwyCC）を 6（乾いている）〜1（悪い）で伝えます（米国の AIM 4-3-9）。0 は、ブレーキが効かない NIL の報告を表します（米国の AIM 4-3-9）。ICAO の GRF（Global Reporting Format）も、滑走路を 3 つに分けて 6〜0 のコードで伝える、同じ考え方です（英国 CAA）。操縦士は、このコードを、機体の性能・重量・風・経験と合わせて使います（米国の AIM 4-3-9）。</p>
<p>計画のあとで、風・気温・荷物・滑走路が変われば、関わる計算をすべてやり直します。乾いた滑走路の表しかないのに、滑走路が濡れたとき、自分で決めた割合を足して済ませません（${bk.see('perf.tol', 'POH の性能の図')}）。</p>
${bk.photo('ch06-photo6')}
${bk.drill('%MAC と床の荷重', `<p>① 重心のアーム 2.392857 m、LEMAC のアーム 2.10 m、MAC 1.50 m のときの %MAC を求めます。② 荷物 30 kg が 0.20 m² に均等にかかるときの、床への荷重を求めます。どちらも仮想の値です。</p>`, `<p>① （2.392857 − 2.10）÷ 1.50 × 100 ≒ 19.52%MAC です。MAC の前縁から、MAC の長さの約 19.5% 後ろにあるという意味です。機体の全長の 19.5% ではありません。</p>
<p>② 30 ÷ 0.20 ＝ 150 kg/m² です。面積は、荷重が実際に広がる面積を使います。箱の外の形の面積だけで、細い脚に集まる荷重を見落としません。</p>`)}
${bk.deep('W&B ハンドブックの例と、条件が変わったときの見直し', `<p>W&B ハンドブックの例では、MAC は 144 in から 206 in（長さ 62 in）、重心は 161 in です。（161 − 144）÷ 62 × 100 ≒ 27.4%MAC になります。</p>
<p>条件が変わったら、その変化がほかの段階にも及ぶかを見ます。たとえば、上昇率が同じでも対地速度が増えると、地面に対する上昇の勾配は減ります。風・気温・重量・重心・路面のどれが変わっても、離陸と着陸の距離・上昇・燃料・着陸復行（ゴーアラウンド、go-around）の条件を見直し、古い計算を使いません。</p>`)}
${bk.key('輸送機の重心は %MAC：（重心−LEMAC）÷MAC×100', 'ランプ・離陸・着陸・零燃料の重量の限界を別々に守る', '床の荷重と固定は、総重量と重心と別に確かめる', '滑走路状態コードは 3 つに分けて 6〜0。性能の資料と合わせて使う')}
${bk.recall('重心の位置は、重さ × アームの合計を、重さの合計で割って求めます。', ['perf.wb', '重量と重心（Weight & Balance）'])}
${bk.q('重心が 22.4%MAC と言われた。機体の全長の 22.4% の位置という意味？', '違います。MAC の前縁（LEMAC）から後ろへ、MAC の長さの 22.4% の位置という意味です（W&B ハンドブック）。基準面からの距離をそのまま % にした値でもありません。')}` },
    ],
    terms: [['Redundancy', '冗長性', '要る機能を複数の手段で支える'], ['Isolation / Alternate', '隔離・代替', '影響を広げない・別の経路を使う'], ['Bus', '母線', '電気を配る共通のつなぎ目'], ['Load shedding', '負荷の切り離し', '電気が足りないとき、決めた順に切る'], ['Fly-by-wire', 'フライバイワイヤ', '操縦の入力を計算機に入れ、計算機が舵を動かす'], ['Ram air turbine (RAT)', 'ラムエアタービン', '風で回して油圧と電気を作る'], ['Crossfeed / Transfer', 'クロスフィード・移送', '供給の管をつなぐ・タンクからタンクへ動かす'], ['Anti-skid / Autobrake', 'アンチスキッド・オートブレーキ', '滑りを防ぐ・自動で減速する'], ['Bleed air', '抽気', 'エンジンの圧縮機から取り出した空気'], ['Cabin altitude', '客室高度', '客室の気圧を標準大気の高さで言ったもの'], ['Differential pressure', '差圧', '客室と外の気圧の差'], ['Outflow valve', 'アウトフロー弁', '客室から出る空気の量を調整する'], ['Time of useful consciousness', '有効意識時間', '酸素なしで正しく判断し行動できる時間'], ['Anti-icing / Deicing', '防氷・除氷', '付かないように・付いた氷を取る'], ['Turbofan / Bypass ratio', 'ターボファン・バイパス比', 'バイパスの流れ ÷ コアの流れ'], ['EPR / N1 / N2', 'エンジン圧力比・低圧と高圧の圧縮機の回転数', 'PHAK 第 7 章'], ['FADEC', 'エンジンを計算機で制御する装置', 'Full Authority Digital Engine Control'], ['Hot start / Hung start', 'ホットスタート・ハングスタート', '温度が限界を超える・加速しない'], ['Compressor stall / Flameout', '圧縮機失速・フレームアウト', '羽根の流れの乱れ・火が消える'], ['Mean aerodynamic chord (MAC) / LEMAC', '空力平均翼弦・その前縁', '%MAC の元'], ['Zero fuel weight', '零燃料重量', '燃料を除いた重さ'], ['Runway condition code (RwyCC)', '滑走路状態コード', '6〜0。滑走路を 3 つに分けて伝える']],
    examples: ['仮想の機体で重要母線が止まる → 電動ポンプ・表示・ピトー加熱が止まる → 手動圧力源はブレーキだけ → 脚は動かせない（tsys.arch）。', '燃料の収支：最初 2,400 kg − 使用量 650 kg ＝ 1,750 kg のはずが、残り 1,550 kg → 差 200 kg。漏れと決めつけず、時刻・積算の基準・左右の量・流量を照らし合わせる（tsys.power）。', '客室高度の警報が鳴った → すぐ酸素マスク → 減圧の手順（急減圧のあとの有効意識時間は短い。AC 61-107B）。', 'バイパスの流れ 400 kg/s・コアの流れ 50 kg/s → バイパス比 8（tsys.turbine）。', '重心のアーム 2.392857 m・LEMAC 2.10 m・MAC 1.50 m → 約 19.5%MAC（tsys.wb）。'],
    cautions: ['この章の図と計算は、原理を学ぶための仮想の例。特定の機体の配管・配線・制限・手順ではない。実機は AFM・POH と運航者の手順が優先する。', '輸送機の系統・エンジン・重量と重心の扱いは、型式の訓練で学ぶ。この章の言葉と原理は、その準備。', '酸素・与圧のドア・燃料の作業は、決められた資格と手順で行う。教材の説明から自分のやり方を作らない。'],
    quiz: [
      { q: '電動ポンプが 2 つあるが、同じ母線から電気をもらっている。この 2 つについて正しいものは？', choices: ['2 つあるので、どんな故障にも備えられる', '母線とポンプは関係ない', 'ポンプの数を増やせば、母線の停電にも備えられる', '片方のポンプの故障には備えられるが、母線の停電では両方止まる'], answer: 3, why: '冗長性は数だけでなく、共通の頼り先で決まる。同じ母線を使えば、その停電で両方が止まる（本文 tsys.arch）。' },
      { q: '与圧の機体で、設計の最大の巡航高度のときの客室高度は、ふつうどのくらい？（PHAK 第 7 章）', choices: ['約 8,000 ft', '海面と同じ 0 ft', '機体と同じ高度', '約 25,000 ft'], answer: 0, why: 'PHAK 第 7 章：与圧はふつう、最大の巡航高度で客室高度を約 8,000 ft に保つ。米国の 14 CFR 25.841 も通常の運航で 8,000 ft 以下（本文 tsys.env）。' },
      { q: 'ターボファンで、バイパスの流れ 400 kg/s、コアの流れ 50 kg/s のときのバイパス比は？', choices: ['9', '0.125', '8', '450'], answer: 2, why: 'バイパス比 ＝ バイパスの流れ ÷ コアの流れ ＝ 400 ÷ 50 ＝ 8。全部の流れを割った 9 ではない（NASA。本文 tsys.turbine）。' },
      { q: '始動中に排気ガス温度が限界を超えた。これを何と呼ぶ？', choices: ['ハングスタート', 'フレームアウト', '圧縮機失速', 'ホットスタート'], answer: 3, why: 'PHAK 第 7 章：排気ガス温度が限界を超えるのがホットスタート。燃料が多すぎるか、回転が足りないことで起きる（本文 tsys.turbine）。' },
      { q: '重心のアーム 161 in、LEMAC 144 in、MAC 62 in のとき、重心はおよそ何 %MAC？', choices: ['約 27%MAC', '約 11%MAC', '約 38%MAC', '約 62%MAC'], answer: 0, why: '（161 − 144）÷ 62 × 100 ≒ 27.4%MAC（W&B ハンドブックの例。本文 tsys.wb）。' },
    ],
    written: [
      ['電動ポンプが 2 つありますが、同じ母線と同じリザーバーにつながっています。2 つあれば、独立した冗長系統と言えますか。', `言えません。片方のポンプの故障には備えられますが、母線の停電や作動油の喪失では、両方が止まります。数だけでなく、電源・作動油・配管・制御の共通の頼り先を調べます。${bk.see('tsys.arch', '系統図・冗長性・つながり')}`, ['kiso02.q4']],
      ['客室の温度がちょうどよければ、客室高度と差圧もちょうどよいと言えますか。HEPA フィルターの役割も説明してください。', `言えません。温度の調整と気圧の制御は別の機能で、空気の供給がつながっていても、別の表示で確かめます。HEPA フィルターは、細かい粒を集める装置で、それだけで、すべてのガスやにおいを取るものではありません。${bk.see('tsys.env', '空気・空調・与圧')}`, ['kiso02.q19']],
      ['客室の気圧 72 kPa、外の気圧 30 kPa のときの差圧はいくらですか。別の地上の例で、差圧 1.5 kPa が 0.80 m² の面に働く力も求めてください。', `差圧は 72 − 30 ＝ 42 kPa です。地上の例の力は 1,500 × 0.80 ＝ 1,200 N です。2 つは別の条件の例です。地上にいるだけで差圧がゼロとは言えず、実際のドアは決められた手順で開けます。${bk.see('tsys.env', '空気・空調・与圧')}`, ['kiso02.q20']],
      ['酸素マスクを着けたこと、酸素が流れていること、客室の気圧が保たれていることは、同じことですか。酸素の供給源と供給の方式の例を 1 つずつ挙げてください。', `同じではありません。酸素の系統は呼吸の酸素を送るもので、客室の気圧の制御とは別です。供給源の例はボトルか化学式の発生器、方式の例は連続流か要求式です。マスクを着けたことと、実際に流れていること・設定も分けて確かめます。${bk.see('tsys.env', '空気・空調・与圧・酸素')}`, ['kiso02.q21']],
      ['ピトー管を温める装置がある機体なら、主翼に氷が付く条件で飛べると言えますか。防氷と除氷の違いも説明してください。', `言えません。ピトー管を守ることと、主翼などの氷への能力・承認・制限は別です。防氷は氷が付かないようにする働き、除氷は付いた氷を取る働きです。その機体の承認・装置の状態・AFM の使い方を確かめます。${bk.see('tsys.env', '防除氷')}`, ['kiso02.q22']],
      ['火災の警報が出ましたが、エンジンの推力の表示は正常でした。その後、警報が消えました。火災がないと決めてよいですか。', `決められません。推力の表示と火災の検知は、測るものも位置も違い、火災の初めでも推力の表示は正常に見えます。警報が消えたのは、検知の部分が焼けたためのこともあります。その機体の火災の手順に結び付け、警報が消えたことを消えた証拠にしません。${bk.see('tsys.env', '火災の防護')}`, ['kiso02.q23']],
      ['系統図の仮想の機体で、重要母線への電気がすべて止まりました。直接止まる電気の装置を 3 つ挙げてください。手動圧力源で脚も動かせますか。油圧はすぐにゼロになりますか。', `電動ポンプ・表示・ピトー加熱です。手動圧力源はブレーキだけにつながり、脚には届きません。油圧がすぐにゼロになるかは、蓄圧器と漏れによるので、図だけでは決められません。${bk.see('tsys.arch', '系統図・冗長性・つながり')}`, ['kiso02.q24']],
      ['ガスタービンの圧縮機・燃焼室・タービン・排気口の役割を説明してください。', `圧縮機は空気を押し縮め、燃焼室は燃料を燃やして熱を加え、タービンはガスから軸の仕事を取り出し、排気口は流れを速くします。${bk.see('tsys.turbine', 'ガスタービンエンジンとその計器')}`, ['kiso03.q19']],
      ['バイパスの流れ 400 kg/s、コアの流れ 50 kg/s のバイパス比を求めてください。', `400 ÷ 50 ＝ 8 です。全部の流れ 450 をコアの 50 で割った 9 ではありません。${bk.see('tsys.turbine', 'ガスタービンエンジンとその計器')}`, ['kiso03.q20']],
      ['入力 9,000 rpm を 3 対 1 の減速ギアで落としたときの出力の回転と、損失を考えないときのトルクの変化を求めてください。', `出力は 3,000 rpm です。損失を考えなければ、軸の出力は同じで、トルクは 3 倍になります。${bk.see('tsys.turbine', 'ガスタービンエンジンとその計器')}`, ['kiso03.q21']],
      ['入口の全圧 100 kPa、出口の全圧 180 kPa のときの EPR を求めてください。', `180 ÷ 100 ＝ 1.80 です。決められた位置の全圧で比べます。${bk.see('tsys.turbine', 'ガスタービンエンジンとその計器')}`, ['kiso03.q22']],
      ['FADEC で、何に頼っているかを確かめるべきものを 3 つ以上挙げてください。', `電源・センサー・チャンネル・配線と作動の装置・保護の働き、と、それらの共通の部分です。${bk.see('tsys.turbine', 'FADEC')}`, ['kiso03.q23']],
      ['ホットスタート・ハングスタート・着火しない始動を区別してください。', `ホットスタートは温度が限界を超えること、ハングスタートは加速が途中で止まること、着火しない始動は火が付かないことです。温度が上がらなくても、燃えていない燃料が残ることがあります。${bk.see('tsys.turbine', '始動と飛行中の異常')}`, ['kiso03.q24']],
      ['圧縮機失速・サージ・フレームアウトは同じ意味ですか。', `同じではありません。圧縮機失速は羽根の流れの乱れ、サージは圧縮機と流れの道全体の大きな不安定、フレームアウトは燃焼が止まることです。${bk.see('tsys.turbine', '始動と飛行中の異常')}`, ['kiso03.q25']],
      ['BSFC と TSFC の数字を、そのまま比べてよいですか。', `よくありません。BSFC は軸の出力で、TSFC は推力で割った値で、割る量も単位も違います。比べるなら条件もそろえます。${bk.see('tsys.turbine', 'ガスタービンエンジンとその計器')}`, ['kiso03.q26']],
      ['定速プロペラの機体で、回転数は一定のまま吸気圧が下がりました。出力は正常と言えますか。', `言えません。回転数を保っていても、トルクが下がれば軸の出力は減ります。吸気・燃料・温度・振動・飛行の状態も照らし合わせます。${bk.see('tsys.turbine', '表示から考える')}`, ['kiso03.q27']],
      ['重心 2.392857 m、LEMAC 2.10 m、MAC 1.50 m のとき、重心を %MAC で表してください。', `（2.392857 − 2.10）÷ 1.50 × 100 ≒ 19.52% です。分子は MAC の前縁から重心までの距離です。重心と LEMAC のアームは同じ基準面で測り、MAC は翼弦の長さとして使います。${bk.see('tsys.wb', '輸送機の重量と重心')}`, ['kiso05.q13']],
    ],
    refs: [R.phak7, R.amtAirframe2, R.cfr91, NEW_R.cfr25841, NEW_R.ac61107, R.phak17, NEW_R.nasaTurbofan, R.wb, R.aim43, NEW_R.caaGrf, R.afh15], lessons: [] });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
