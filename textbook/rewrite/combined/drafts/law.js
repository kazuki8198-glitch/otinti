// DRAFT (W19, R2) — Part 1's chapter 'law'「規則と空域」 (textbook/rewrite/combined/DESIGN.md 3.3 第 1 部 第 12 章).
// No product reads this file (DESIGN 6.2 rule 5, 7.4). It is a plain script like book-2.js: when the chapter is
// registered, the B.add(...) below replaces the one in flight-lab/src/book-2.js in place (same id 'law', same place
// between 'wx' and 'radio1'), the figures of law-figs.js go into book-figs.js, and the references in NEW_R go into
// book-core.js's R (then `NEW_R.x` → `R.x`). Check it with the figures:
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/law-figs.js textbook/rewrite/combined/drafts/law.js
//
// What changed from the chapter in book-2.js (DESIGN 3.3 chapter 12, 4.1 row 6, 4.2 kiso09, 7.2 W19 — the law part):
//  - 8 sections: the 6 sections of the textbook kept with their ids and in their order (law.pic, law.aircraft,
//    law.airspace, law.vfr, law.special, law.rules) and the 2 new ones DESIGN 3.3 names, in its order:
//    law.basis (first: how to read the rules — which documents bind, a permission's conditions, which version and
//    where; from kiso09.1・09.2・09.8, rewritten for the US body, with the Japanese layers in a bk.jp box) and
//    law.pilot (after law.pic: the pilot's own rules — documents, the medical's duration, the flight review, recent
//    experience, the three "nights", NTSB Part 830, and the student pilot limitations moved here from law.rules);
//  - every section scope 'us' (the US rules are the body: DESIGN 3.4); Japan only in boxes: the FL.jur boxes DESIGN
//    3.4 / FL.jur's `boxes` put in this chapter — preflight (law.pic), accident and night (law.pilot), docs
//    (law.aircraft), vmc and vmc.ad (law.vfr), svfr (law.special), row, msa, speed, fuel.vfr (law.rules) — and three
//    bk.jp boxes of my own words without hand-written FL.jur numbers (law.basis: the Japanese layers; law.airspace:
//    Japan names its airspace, 航空法第 2 条; law.vfr: 施行規則第 5 条 is written from the aircraft). DESIGN 3.3 also
//    lists `medical` for law.pilot, but FL.jur's medical.boxes is intro.cert・hf.self, and jur.test.mjs ① fails on a
//    box outside `boxes`: not placed (reports/W19.md, needs from others);
//  - law.vfr has the new figure DESIGN asks for (vfrTwoViews: the cloud's way and the aircraft's way of saying one
//    clearance); law.basis has the basic course's ch09-fig9-2 redrawn (lawSources); law.pilot has lawCurrency;
//    rightOfWay is redrawn under its name with FL.terms' 進路権;
//  - JCAB's names from FL.terms with the first use in this chapter「正式名（通称、English）」: 機長・管制承認・飛行規程・POH・
//    ノータム・航空路誌・離陸・単独飛行・操縦教員・出発前の確認・野外飛行・学生操縦士・技能証明・航空身体検査証明・夜間・
//    右舷灯・左舷灯・尾灯・有視界飛行方式・計器飛行方式・有視界気象状態・計器気象状態・飛行視程・地上視程・雲高・特別有視界飛行方式・
//    航空情報・進路権・見張り・最低安全高度・指示対気速度・場周経路 …; 優先権 (the textbook's word) becomes 進路権;
//  - the written questions (説明してみよう) rewritten from kiso09's qa (q1・q2・q7・q9・q11・q12・q13・q14, for the US
//    body), two new ones last; the existing 5 end-of-chapter questions in place and order (wording only: 進路権), 6 new
//    ones after them;
//  - no FLIGHT LAB operation words and no real airline names in the body (DESIGN 6.2 rule 10); law.special keeps「架空」
//    (CADET's KEEP, rule 9); law.rules keeps「米国の VFR の燃料（91.151）は、最初の着陸予定地まで」(flight.test.mjs);
//  - links to a later part carry「予告」(DESIGN 5 criterion 23); no {ch:} to a later part; no link to Part 7 / g1;
//  - every claim (number, unit, article, rule) is in law.claims.json with its tag and source.
//
// revise-law (2026-10-30; reports/revise-law.md) applied factcheck-law, reader-law and expert-law:
//  - law.basis: 91.113 published 2025-07-24 / in force 2025-10-22 (90 FR 35034); 14 CFR chapter I; AIM "may be";
//    91.13(a); 91.703(a)(3); a sentence tying the figure to the table; the Japan/US table of document levels in the
//    bk.jp box (DESIGN 3.3); 有視界気象状態・計器気象状態 now really in first-use form in the recall;
//  - law.pic: the 91.123(d) addressee; speak up to the instructor; PA.I.A.K4 moved to law.pilot only;
//  - law.pilot: NTSB and 暦月 glossed at first use; 61.15(e); category/class; 61.57(c) "IFR or below VFR minimums";
//    incident (830.2); 830.10 split; civil twilight (USNO) and the order of the three "nights"; key and 61.57(b) wording;
//  - law.aircraft: documents with where and how long (21.181, 47.40), standard/special certificates (21.175), special
//    flight permit (21.197/199), who does what (91.403, 91.7, 43.3(g), 43.9), AD vs SAIB (39.3, 91.417), night VFR
//    equipment (91.205(c)), transponder/ADS-B Out in a sentence each, the four conditions of 91.213(d)(2) with KOEL and
//    AD, the 100-hour row (annual or 100-hour; "the instructor or school provides"), the question fixed;
//  - law.airspace: 管制承認 throughout, 61.95 details, part-time Class D, Class C shelf above the airport, "未満",
//    空港等 and その付近 in the bk.jp box; law.vfr: 3-152 in the order 3-1-5-2, flight vs ground visibility,
//    91.155(c) for the pattern, special VFR limits (91.157(a)) and a caution; PA.I.E.K4 moved here;
//  - law.special: P vs R, NSA/MTR/SFRA/ADIZ, parachute areas, flights to and from U.S. airspace, interception (identity,
//    reasons, conflicting instructions, signals, 121.5 watch); the svfr box explained; "LAB RWY 36" dropped;
//  - law.rules: 滑空機（グライダー、glider）; the order "（米国の 91.113(d)）"; airports with an operating tower; turns;
//  - end matter: quiz 1 管制承認, quiz 5 滑空機, quiz 6 "may be", quiz 9 stem, section names in the reasons; written 6
//    link to law.rules, written 7 stem rewritten (kiso09.q7), written 10 keeps the airplane on the ground (91.7).
(function (FL) {
  'use strict';
  const B = FL.book, R = B.R, bk = B.bk, FIG = FL.bookFigs;
  // new references (to be added to book-core.js's R when the chapter is registered; each URL opened on 2026-10-30)
  const NEW_R = {
    ntsb830: { label: '49 CFR Part 830 Notification and Reporting of Aircraft Accidents or Incidents（事故・重大インシデントの定義、すぐに知らせるもの、残骸の保存、報告書）', url: 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-VIII/part-830' },
    cfr4787: { label: '47 CFR 87.18 Station license required（航空機の無線局の免許：国際の飛行・交信をしなければ規則による免許）', url: 'https://www.ecfr.gov/current/title-47/chapter-I/subchapter-D/part-87/subpart-B/section-87.18' },
    aim56: { label: 'FAA AIM 5-6 National Security and Interception Procedures（5-6-13 迎撃されたときにすること）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap5_section_6.html' },
    aimPdf: { label: 'FAA Aeronautical Information Manual（Basic with Change 1, 2 and 3、2026-07-09 有効の版の PDF。Flight Information Publication Policy・Code of Federal Regulations and Advisory Circulars・Publication Schedule）', url: 'https://www.faa.gov/air_traffic/publications/media/AIM_Basic_w_Chg_1_and_2_and_3_dtd_7-9-26_FINAL.pdf' },
    phak1: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 1 章 Introduction to Flying（14 CFR・AC・AIM・NOTAM と FDC NOTAM）", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/03_phak_ch1.pdf' },
    aipGen17: { label: 'FAA United States AIP GEN 1.7 Differences From ICAO Standards, Recommended Practices and Procedures（米国と ICAO の標準の違いの一覧）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aip_html/part1_gen_section_1.7.html' },
    faaVfrCharts: { label: 'FAA Aeronautical Information Services：VFR Raster Charts（VFR のチャートは 56 日ごとの版）', url: 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/vfr/' },
    faaChartSupp: { label: 'FAA Aeronautical Information Services：Chart Supplements（56 日ごとに出す空港と施設の案内）', url: 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/dafd/' },
    phak15: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 15 章 Airspace（管制空域と非管制空域・Class E の下限・特別な空域）", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/17_phak_ch15.pdf' },
    // revise-law (2026-10-30): each URL opened that day; the eCFR and Federal Register pages were read through their APIs
    faaAtPubs: { label: 'FAA Air Traffic Publications（AIM・P/CG などの今の版の入口。AIM の PDF は版が変わると URL が変わる）', url: 'https://www.faa.gov/air_traffic/publications/' },
    frMosaic: { label: 'Federal Register 90 FR 35034 Modernization of Special Airworthiness Certification（2025-07-24 公布、2025-10-22 施行。14 CFR 91.113 の改正を含む）', url: 'https://www.federalregister.gov/documents/2025/07/24/2025-13972/modernization-of-special-airworthiness-certification' },
    cfr21: { label: '14 CFR Part 21 Certification Procedures for Products and Articles（21.175 耐空証明の区分・21.181 有効な期間・21.197 特別飛行許可）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-21' },
    cfr39: { label: '14 CFR Part 39 Airworthiness Directives（39.3 AD は守る義務のある規則・39.7）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-39' },
    cfr43: { label: '14 CFR Part 43 Maintenance, Preventive Maintenance, Rebuilding, and Alteration（43.3(g) 操縦士の予防整備・付録 A (c) 予防整備の一覧・43.9 記録）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-43' },
    cfr47: { label: '14 CFR Part 47 Aircraft Registration（47.40 登録証明の期限：出た月の最後の日から 7 年）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-47' },
    cfr71: { label: '14 CFR Part 71 Designation of Class A, B, C, D, and E Airspace Areas（71.1：空域の指定は FAA Order JO 7400.11 を規則に取り込む）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-E/part-71' },
    cfr99: { label: '14 CFR Part 99 Security Control of Air Traffic（ADIZ・99.7 特別保安指示）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-99' },
    faaSaib: { label: 'FAA Special Airworthiness Information Bulletins（SAIB は規則ではない情報。AD の基準に当たらないもの）', url: 'https://www.faa.gov/aircraft/safety/alerts/SAIB' },
    usnoTwilight: { label: 'U.S. Naval Observatory：Rise, Set, and Twilight Definitions（市民薄明は太陽の中心が地平線の下 6°）。日ごとの値は USNO の Sun and Moon Data for One Day（28.78°N 81.24°W、2026 年の各月 15 日で計算）', url: 'https://aa.usno.navy.mil/faq/RST_defs' },
  };
  const ahead = (id, label) => bk.see(id, `予告：${label}`);   // a link to a later part (DESIGN 5 criterion 23)

  // ======================================================================= 第 1 部 第 12 章
  B.add({ id: 'law', part: 'p1', t: '規則と空域（14 CFR と米国の空域）', en: 'Regulations and airspace',
    summary: '米国の規則を、予定する飛行に当てはめて確かめられるようにします。まず、規則の読み方と、機長・操縦士・機体の決まり（出発前の確認・期限・事故の報告・書類と点検）を学びます。次に、空域と VFR の気象条件、特別な空域、進路権・高度・速度・燃料の決まりを学びます。',
    secs: [
      // ------------------------------------------------------------------ 1
      { id: 'law.basis', t: '規則の読み方：資料の格・承認と条件・適用の時点', scope: 'us', from: ['kiso09.1', 'kiso09.2', 'kiso09.8'], h: () => `
${bk.aim('どの資料が守る義務のある決まりかを見分け、管制承認（クリアランス、ATC clearance）のような許可の条件と、規則の版を確かめる読み方を学びます。最後に確かめるのは、機長（PIC：pilot in command）です。')}
${FIG.lawSources()}
<p>飛ぶ前に、「誰が・どの機体で・どこを・どの方式で・いつ」飛ぶかを決めます。これが決まると、当てはまる決まりが決まります。同じ空港へ飛ぶ日でも、機体・資格・天気・時刻が変われば、確かめることも変わります。</p>
<p>決まりを覚えるだけでは足りません。その決まりを、予定する飛行に当てはめて確かめることが目的です。</p>
<h4>資料の格：守る義務があるものと、助けになるもの</h4>
<p>米国の飛行の決まりの中心は、連邦規則集の第 14 編（14 CFR）です。その第 I 章（Part 1〜199）は、連邦の法律（合衆国法典の第 49 編）にもとづいて FAA が定める規則です（PHAK 第 1 章・Part 91 の頭の根拠の法律の欄）。操縦士の資格は Part 61、飛び方は Part 91 にあります。</p>
<p>上の図は「何を決めるか」で、下の表は「守る義務があるか」で、資料を分けています。図にない AIM と AC は、表の「指針と情報」に入ります。</p>
${bk.t(['資料', '例', '守る義務'], [
  ['規則', '14 CFR（Part 61・Part 91 など）', 'ある。守らなければ違反'],
  ['機体の運用限界', '飛行規程（AFM：airplane flight manual）と POH（操縦士用の機体の手引書、pilot\'s operating handbook）の限界、機体の標示と表示板', 'ある（91.9）'],
  ['一時的な規制', 'ノータム（NOTAM）で出る一時的な飛行制限（TFR）など', 'ある（91.137〜91.145）'],
  ['管制の承認と指示', '管制承認・管制の指示', 'ある（91.123。緊急のときは機長が必要な範囲で外れてよい）'],
  ['指針と情報', 'AIM・AC（advisory circular）・FAA のハンドブック', '規則ではない。規則を守るための手順と方法の例']])}
<p>AIM は、自分を「規則ではない」と書いています。そのうえで、ほかの規則で求められることがある手順の例を示す、と書いています（AIM の前書きの方針）。AC も、規則が名指しして取り込んでいなければ、守る義務はありません（AIM の前書き）。</p>
<p>それでも、AIM の手順を軽く見てよいわけではありません。たとえば、Class C 空域（空域の種類の 1 つ。${bk.see('law.airspace', '空域の種類と入る条件')}）に入る前に交信を確立する決まりは、米国の 14 CFR 91.130 にあります。その確立のしかたを、AIM 3-2-4 が具体的な言い方で説明しています。また、ほかの人の命や財産を危険にする、不注意な飛び方や無謀な飛び方は、規則で禁じられています（91.13(a)）。</p>
<p>国際民間航空条約（Convention on International Civil Aviation）と附属書は、各国の決まりの共通の土台です。附属書は、条約に付いた、国際の標準と勧告をまとめた文書です。米国の Part 91 も、根拠の 1 つにこの条約を挙げています。それでも、各国の決まりは同じではありません。米国は、ICAO の標準と違う所を一覧にしています。その一覧は、米国の航空路誌（AIP：aeronautical information publication）の GEN 1.7 にあります。</p>
<p>空港と空域を使うための情報を、まとめて航空情報（aeronautical information）と呼びます。チャート・Chart Supplement（空港と施設の案内）・AIP・ノータムは、どれも航空情報です。</p>
<h4>承認と条件：許可は「その条件の中」でだけ有効</h4>
<p>管制承認は、管制が知っている交通を前提に、決めた条件で管制空域を進んでよいという許可です（14 CFR 1.1・AIM 4-4-1）。規則や最低高度から外れてよい許可でも、危ない飛び方をしてよい許可でもありません（AIM 4-4-1）。</p>
<p>承認に従うと規則を破る、または危ないと思ったら、変えた承認を求めます（AIM 4-4-1）。承認の中身が分からないときは、すぐに管制に聞きます（91.123(a)）。</p>
<p>管制から離陸（takeoff）の許可が出ても、燃料・重量（weight）・天気・自分の資格の条件を満たしたことにはなりません。それを確かめるのは機長です。</p>
<p>操縦教員（教官、flight instructor）がログブックに書く裏書き（endorsement）も、条件つきの許可です。機種・期間・空域のほか、操縦教員が書いた制限があり、その中でだけ有効です（61.87・61.89・61.95）。</p>
${bk.judge('許可が出たら、その許可が何を認めたか（どこまで・どの条件で）を言えるか確かめます', '許可が認めていないこと（燃料・重量と重心位置（center of gravity）・天気・自分の資格と最近の経験）を、自分で確かめます', '出発が遅れた・天気が変わったなど、条件が変わったら、前に確かめたことを取り直します')}
<h4>適用の時点：いつの版か・どこで飛ぶか</h4>
<p>規則は改正されます。たとえば米国の進路権（優先権、right-of-way）の決まり（91.113）は、2025 年に改正されました。改正は 7 月 24 日に公布され、10 月 22 日から新しい文になりました（Federal Register 90 FR 35034）。公布の日と、守る日（施行の日）が違うことがあります。古い教本を使うときは、今の規則と同じかを確かめます。</p>
<p>チャートにも有効な期間があります。FAA の VFR のチャートと Chart Supplement は、56 日ごとに新しい版になります（FAA のチャートの案内）。AIM も、ほぼ半年ごとに改訂の版が出ます（AIM の改訂の予定）。</p>
<p>ノータムは、決まった時刻から決まった時刻までの、一時的な情報です。時刻は協定世界時（UTC）で書かれます（PHAK 第 1 章）。</p>
<p>場所も確かめます。米国の 14 CFR Part 91 は、米国の中（海岸から 3 NM までの海の上を含む）を飛ぶ航空機に当てはまります（91.1(a)）。米国で登録した機体でも、外国ではその国の決まりに従います。そのうえで、その国の決まりと食い違わない限り、米国の Part 91 も守ります（91.703(a)）。</p>
${bk.dont(bk.t(['取り違えやすい組', '違い'], [
  ['規則（14 CFR）と指針（AIM・AC）', '規則は守る義務がある。指針は、規則を守る手順と方法の例'],
  ['管制承認と規則', '管制承認は、決めた条件で進んでよいという許可。規則から外れてよい許可ではない'],
  ['運用限界と性能の数字', '運用限界は超えてはいけない限り（91.9）。性能の数字は、決まった条件での見込み']]))}
${bk.key('守る義務は規則・運用限界・一時的な規制・管制の承認と指示', 'AIM と AC は規則ではないが、規則を守る手順を示す', '管制承認は条件つきの許可。規則や安全から外れてよい許可ではない', '規則・チャート・ノータムは、版と時刻を確かめて使う')}
${bk.warn('<b>ここに注意：</b>インターネットの解説や古い版の教本は、改正の前の決まりのことがあります。数字は、その日の 14 CFR と、最新のチャート・ノータムで確かめます。')}
${bk.jp('<p>日本の空では、日本の決まりで飛びます。日本の航空法は、国際民間航空条約と、その附属書の標準・方式・手続に準拠すると、目的の条に書いています。日本と米国の資料の格を並べると、次のようになります。</p>' + bk.t(['格', '日本', '米国'], [
  ['法律', '航空法', '合衆国法典の第 49 編'],
  ['政令・省令・規則', '航空法施行令（政令）・航空法施行規則（国土交通省令）', '14 CFR（FAA の規則）'],
  ['空域の指定', '国土交通大臣の告示', '14 CFR Part 71 が取り込む FAA の文書'],
  ['航空情報', '日本の AIP・ノータム', '米国の AIP・ノータム・チャート・Chart Supplement']]))}
${bk.recall('VFR と IFR は飛び方の決まりで、有視界気象状態（VMC：visual meteorological conditions）は天気の区分の 1 つです。もう 1 つの区分が、計器気象状態（IMC：instrument meteorological conditions）です。晴れた日にも IFR で飛び、VFR で雲に入ってはいけません。', ['basics.rules', '飛行方式と気象状態は別の軸'])}
${bk.q('管制から「この高度を保て」と言われた。その高度では雲に入り、VFR の雲からの距離を守れない。どうする？', 'その指示に従うと、規則（91.155）を守れません。「unable」と伝え、雲を避けられる高度や針路（ヘディング、heading）を求めます。管制承認と指示は、規則から外れてよい許可ではありません（AIM 4-4-1）。緊急のときは、機長が必要な範囲で行動し、すぐに管制に知らせます（91.3・91.123）。')}` },
      // ------------------------------------------------------------------ 2
      { id: 'law.pic', t: '機長の責任と飛行前の準備', scope: 'us', faa: ['PA.VI.C.K2', 'IR.III.A.K2'], h: () => `
${bk.aim('飛行機の安全の最後の責任は、機長にあります。機長が飛ぶ前に何を知り、何を判断するのかを学びます。')}
${FIG.preflightInfo()}
<ul><li><b>91.3 機長の責任</b>：機長は、その飛行機の運航に直接の責任を持ち、最終的な権限があります。すぐに行動しなければならない飛行中の緊急事態では、その緊急事態に必要な範囲で、Part 91 の規則から外れてよいことになっています。外れたときは、FAA に求められたら、書面で報告します。</li>
<li><b>誰が機長か</b>：ひとりで飛ぶ単独飛行（ソロ、solo flight）では自分です。操縦教員と一緒に飛ぶ訓練では、ふつう操縦教員が機長です。誰が機長かは、飛ぶ前に決めておきます（学校の決まりで確かめます）。</li>
<li><b>91.103 出発前の確認（preflight action）</b>：機長は出発前に、その飛行に関する<b>入手できるすべての情報</b>を知っておきます。すべての飛行で、使う空港の滑走路の長さを確かめます。離陸距離（takeoff distance）と着陸距離（landing distance）も確かめます（91.103(b)）。</li>
<li>IFR の飛行と、空港の近くを離れる飛行では、天気の報告と予報、必要な燃料を確かめます。計画どおり行けないときの代わりと、ATC から知らされた遅れも確かめます（91.103(a)）。野外飛行（クロスカントリー、cross-country）は、空港の近くを離れる飛行の代表です。</li>
<li><b>91.7 耐空性</b>：安全に飛べる状態でない飛行機は飛ばせません。安全に飛べる状態かを判断するのは機長です。飛行中に、機械・電気・構造の不具合が起きたら、飛行をやめます。</li></ul>
<h4>ほかの人の準備と、機長の確認</h4>
<p>給油や整備をほかの人がしても、機長の責任は変わりません。報告を聞いたら、何を確かめたのか、まだ確かめていないことは何かを聞きます。記録と機体を、自分の目でも確かめます。</p>
<p>操縦教員が機長の訓練でも、安全でないと思ったら、すぐに操縦教員に言います。</p>
<h4>緊急のときと、管制の指示から外れたとき</h4>
<p>緊急で管制の承認や指示から外れたら、できるだけ早く管制に知らせます（91.123(c)）。緊急で管制から優先して扱われたら、管制に求められたときは、48 時間以内に、その管制の施設の長へ報告を出します（91.123(d)）。</p>
${bk.key('最終的な判断は機長。操縦教員や管制の指示でも、安全でなければ「unable（できない）」と伝える', '飛ぶ前に、その飛行に関するすべての情報を知る（91.103）', '安全に飛べる状態かを決めるのは機長。不具合が起きたら飛行をやめる（91.7）')}
${bk.jur('preflight')}
${bk.q('ひとりで飛んでいるとき、エンジンの調子が悪く、規則で決められた高度より低い所に不時着（forced landing）しなければならない。規則を破ってよい？', 'はい。すぐに行動しなければならない緊急事態では、機長はその緊急事態に必要な範囲で規則から外れてよいことになっています（91.3(b)）。FAA に求められたら、あとで書面で報告します（91.3(c)）。')}` },
      // ------------------------------------------------------------------ 3
      { id: 'law.pilot', t: '操縦士の決まり：フライトレビュー・最近の経験・事故の報告', scope: 'us', faa: ['PA.I.A.K1', 'PA.I.A.K2', 'PA.I.A.K3', 'PA.I.A.K4', 'PA.I.H.K2', 'PA.III.A.K8'], h: () => `
${bk.aim('操縦士として飛び続けるには、資格を持つだけでなく、期限と最近の経験を保ちます。事故やインシデントが起きたときに、誰がどこへ知らせるかも学びます。')}
${FIG.lawCurrency()}
<h4>持つもの・見せるもの・記録するもの</h4>
<ul><li>技能証明（pilot certificate）と航空身体検査証明（medical certificate）を持って飛びます。学生は、学生操縦士（student pilot）の証明です。</li>
<li>写真つきの身分証明書も要ります。どれも、身につけているか、機内のすぐ取り出せる所に置きます（61.3）。</li>
<li>FAA・国家運輸安全委員会（NTSB：事故を調べる米国の機関）・警察から求められたら、証明書とログブックを見せます（61.51(i)(1)）。</li>
<li>ログブック（飛行の記録、logbook）には、資格や審査に使う訓練と経験、最近の飛行経験を記録します（61.51(a)）。操縦教員の裏書きも、ログブックに書かれます。</li>
<li>学生が単独で野外飛行をするときは、ログブックと学生操縦士の証明を機内に持ちます（61.51(i)(2)）。</li>
<li>お酒や薬物の影響で車を運転して有罪になったときや、それを理由に運転免許の停止などを受けたときは、60 日以内に FAA へ書面で報告します（61.15(e)）。</li></ul>
<h4>航空身体検査証明の期限（第 3 種）</h4>
<p>米国で、自家用と学生の資格で飛ぶには、第 3 種以上の航空身体検査証明が要ります（61.23(a)(3)）。期限は、検査を受けた日の年齢で決まります（61.23(d)）。米国の運転免許を使う BasicMed という例外もありますが、前に航空身体検査証明を受けたことが条件の 1 つです（61.23(c)(3)）。</p>
${bk.t(['検査を受けた日の年齢', '第 3 種が切れるとき（61.23(d)）'], [['40 歳未満', '検査の月の 60 か月後の月の、最後の日の終わり'], ['40 歳以上', '検査の月の 24 か月後の月の、最後の日の終わり']])}
<p>2016 年 4 月 1 日より後に出た学生操縦士の証明には、期限がありません（61.19(c)(1)）。体調・薬・飲酒で飛べないときの決まりは、${bk.see('hf.self', '自分の体調を確かめる')} で学びます。</p>
<h4>フライトレビュー（flight review）</h4>
<p>機長として飛ぶには、24 暦月（月で数えて 24 か月。その月の終わりまで）の間にフライトレビューを受けている必要があります（61.56(c)）。フライトレビューは、地上 1 時間以上と飛行 1 時間以上の訓練です（61.56(a)）。Part 91 の規則と、操縦教員が選んだ操作と手順を見直し、終わるとログブックに裏書きを受けます。</p>
<p>その期間に資格の実地試験に合格した人は、フライトレビューを受けなくてよいことになっています（61.56(d)）。訓練中の学生も、単独飛行の裏書きが有効なら要りません（61.56(g)）。</p>
<h4>最近の飛行経験（recent flight experience）</h4>
${bk.t(['したいこと', '前に必要な経験', '規則'], [
  ['人を乗せて機長をする', '90 日以内に、離陸と着陸を 3 回ずつ（同じカテゴリー（飛行機など）・クラス（単発・多発、陸上・水上など）の機体で、自分で操縦）', '61.57(a)'],
  ['日没の 1 時間後から日の出の 1 時間前までに、人を乗せて機長をする', '90 日以内に、その時間帯に、離陸と、完全に止まるまでの着陸を 3 回ずつ', '61.57(b)'],
  ['計器飛行方式（IFR：instrument flight rules）か、VFR の最低気象条件より悪い天気で機長をする', '6 暦月以内に、計器進入 6 回・待機（ホールディング、holding）・航法の装置でコースに乗って沿って飛ぶこと（コースの会合と追跡）', '61.57(c)']])}
<p>90 日は日で数えます。24 暦月や 6 暦月は月で数え、その月の終わりまで有効です（61.56(c)・61.57(c)）。上の図のように、数え方を取り違えないようにします。</p>
${bk.drill('期限を数える', '<p>自家用操縦士の資格を持つ 30 歳の人が、2026 年 3 月 10 日に第 3 種の航空身体検査を受け、同じ日にフライトレビューも終えました。① 身体検査証明は、いつまで使えますか。② フライトレビューで、いつまで機長として飛べますか。</p>', '<p>① 検査の月（2026 年 3 月）の 60 か月後の月は、2031 年 3 月です。2031 年 3 月 31 日の終わりまで使えます（61.23(d)）。</p><p>② 2028 年 3 月に飛ぶとき、その月の 24 暦月前は 2026 年 3 月なので、間に合います。2028 年 4 月からは受け直しが要るので、2028 年 3 月 31 日までです（61.56(c)）。</p>')}
<h4>学生操縦士の制限（61.89）</h4>
<p>学生操縦士は、機長として次の飛び方ができません。</p>
<ul><li>人を乗せる、報酬のために物を運ぶ、報酬を受けて飛ぶ、仕事のために飛ぶ</li>
<li>外国へ飛ぶ（一部の例外を除く）</li>
<li>飛行視程（flight visibility）か地上視程（ground visibility）が、昼は 3 SM 未満、夜は 5 SM 未満のときに飛ぶ（2 つの視程の違いは ${bk.see('law.vfr', '有視界飛行（VFR）の気象条件')}）</li>
<li>地面を見ながら飛べないときに飛ぶ</li>
<li>操縦教員がログブックに書いた制限に反して飛ぶ</li></ul>
<p>フロリダからバハマへの飛行も、外国への飛行です。単独飛行の裏書きは、機種ごとに 90 日以内のものが要ります。くわしくは ${ahead('solo.req', '単独飛行の条件')} で学びます。</p>
<h4>事故とインシデントの報告（NTSB）</h4>
<p>米国で航空機の事故を調べるのは、NTSB です。インシデント（incident）は、事故には当たらないが、運航の安全にかかわるか、かかわるおそれのある出来事です（830.2）。事故とインシデントの報告のしかたは、米国の 49 CFR Part 830 にあります。</p>
<ul><li><b>事故（aircraft accident）</b>：人が死亡するか、重いけがをしたものです。機体が大きな損傷（substantial damage）を受けたものも、事故です（830.2）。</li>
<li>エンジン 1 基だけの故障や損傷、外板のへこみ、脚・車輪・タイヤ・フラップ（flaps）・ブレーキ・翼端の損傷は、大きな損傷に入りません（830.2）。</li>
<li><b>すぐに知らせるもの</b>：事故と、決められた重大インシデントです（830.5）。たとえば、操縦系統の故障、病気やけがで乗員が仕事をできないこと、飛行中の火災、空中での衝突です。</li>
<li>行方が分からず、事故が疑われる機体も、すぐに知らせます（830.5(b)）。</li>
<li><b>誰が</b>：運航者（operator：持ち主や借りている人など、機体を運航させる人）が、最寄りの NTSB へ、いちばん早い方法で知らせます（830.2・830.5）。</li>
<li><b>そのあと</b>：残骸は、けが人を助けるときなどのほかは動かさず、記録も残します（830.10）。事故から 10 日以内に、NTSB の書式で報告を出します（830.15）。</li></ul>
<p>訓練中に何かが起きたら、まず操縦教員と学校に知らせ、学校の手順に従います。</p>
<h4>規則の 3 つの「夜」</h4>
<p>市民薄明（civil twilight）は、日没のあとも空がまだ明るい時間です。太陽の中心が地平線の下 6° になると終わります（USNO）。フロリダ中部では、日没の約 25 分後です（USNO の 2026 年の計算で、月ごとに 23〜27 分）。</p>
<p>だから夕方は、日没 → 市民薄明の終わり → 日没の 1 時間後、の順に来ます。下の 3 つの「夜」は、この 3 つの時刻から始まります。</p>
${bk.dont(bk.t(['規則の「夜」', '時間', '使う所'], [
  ['夜間（night）の定義（14 CFR 1.1）', '夕方の市民薄明の終わりから、朝の市民薄明の始まりまで', '夜の燃料の予備（91.151）・夜の VFR の装備（91.205(c)。' + bk.see('law.aircraft', '機体の書類・装備・点検') + '）など'],
  ['人を乗せる夜の最近の経験（61.57(b)）', '日没の 1 時間後から、日の出の 1 時間前まで', '人を乗せる前の、夜の 3 回の着陸'],
  ['右舷灯・左舷灯・尾灯（航空灯、position lights）をつける時間（91.209）', '日没から日の出まで', '航空灯の点灯']]))}
${bk.key('機長として飛ぶには、24 暦月の間のフライトレビュー（学生は単独飛行の裏書きが有効なら不要）', '人を乗せるには、90 日以内に離陸と着陸を 3 回ずつ', '第 3 種の身体検査証明は、40 歳未満は 60 か月目、40 歳以上は 24 か月目の月の終わりまで', '事故はすぐ最寄りの NTSB へ。報告書は 10 日以内')}
${bk.warn('<b>ここに注意：</b>期限は、自分の証明書とログブックで確かめます。友人と同じ資格でも、年齢や受けた日が違えば、期限は同じではありません。')}
${bk.jur('accident', 'night')}
${bk.q('自家用の資格を持つ人が、2 か月前に 3 回の離着陸をした。全部が昼だった。今夜、日没の 2 時間後に友人を乗せて飛べる？', '飛べません。日没の 1 時間後から日の出の 1 時間前までに人を乗せるには、90 日以内に、その時間帯の離陸と完全に止まるまでの着陸が 3 回ずつ要ります（61.57(b)）。昼の 3 回は、昼に人を乗せる条件（61.57(a)）を満たすだけです。')}` },
      // ------------------------------------------------------------------ 4
      { id: 'law.aircraft', t: '機体の書類・装備・点検', scope: 'us', faa: ['PA.I.B.K1', 'PA.I.B.K2', 'PA.I.B.K3', 'PA.I.B.K4', 'PA.II.A.K2', 'PA.XII.A.K2', 'IR.II.C.K2', 'IR.II.C.K3'], h: () => `
${bk.aim('飛行機が法律上も飛んでよい状態かを、書類・装備・点検の 3 つで確かめます。飛行前の点検の最初にすることです。')}
<h4>機内に必要な書類</h4>
${bk.t(['書類', '置く場所', '有効な期間・決まり'], [
  ['耐空証明（airworthiness certificate）：その機体が型式の設計に合い、安全に飛べる状態にあると FAA が認めた証明', '客室か操縦席の入口に、乗る人が読めるように掲示する（91.203）', '米国に登録され、整備と点検を Part 43・91 のとおりに続ける限り有効（21.181）'],
  ['登録証明（registration certificate）：国に登録した機体であることの証明', '機内（91.203）', '出た月の最後の日から 7 年で切れる（47.40）'],
  ['飛行規程と運用限界（POH・標示・表示板）', '機内（91.9）', 'その限界を守る（91.9）'],
  ['重量と重心の資料：その機体の空虚重量（empty weight）と重心位置', '機内', 'POH の重量と重心の章にある、その機体の値を使う']])}
<p>覚え方として <b>ARROW</b>（Airworthiness・Registration・Radio station license・Operating limitations・Weight and balance）が広く使われます。無線局の免許（Radio station license）は、米国の外へ飛ぶときや、国際の交信をするときに要ります（米国の 47 CFR 87.18）。</p>
<p>耐空証明には、標準（standard）と特別（special）の 2 種類があります（21.175）。この教材の Archer のような普通類・実用類の機体は、標準の耐空証明です。実験機・軽スポーツ機・特別飛行許可の機体などは、特別の耐空証明です。</p>
<p>特別飛行許可（special flight permit）は、今は耐空性の基準を満たさないかもしれないが、安全に飛べる機体に出る許可です。たとえば、修理をする場所まで機体を飛ばすときに使います（21.197）。目的・経路・乗員・基準に合わない点などを FAA に書いて申し込みます（21.199）。有効なのは、許可に書いた期間だけです（21.181(a)(2)）。</p>
<h4>誰が何をするか</h4>
${bk.t(['人', 'すること'], [
  ['持ち主か運航者', '機体を耐空の状態に保つ第一の責任がある。AD を守ることも含む（91.403(a)）'],
  ['機長', '飛ぶ前に、安全に飛べる状態かを決める（91.7）'],
  ['操縦士の資格を持つ人（スポーツ操縦士を除く）', '自分が持つか運航する機体の予防整備（preventive maintenance）ができる（43.3(g)）。タイヤの交換や、分解の要らない注油など、Part 43 の付録 A の一覧のものだけ。したら、整備の記録に書く（43.9）'],
  ['整備士など、資格のある人', 'それ以外の整備と点検（Part 43）']])}
<p>耐空性改善通報（AD：Airworthiness Directive）は、FAA が出す、守る義務のある規則です（39.3）。SAIB（Special Airworthiness Information Bulletin）は、AD の基準に当たらない、規則ではない情報と勧めです（FAA）。AD に従っているかは、機体の整備の記録で確かめます（91.417(a)(2)(v)）。</p>
<h4>装備</h4>
<p>昼の VFR には、対気速度計（速度計、airspeed indicator）と高度計（altimeter）が必要です。磁気コンパス（コンパス、magnetic compass）・回転計・油圧計・油温計・燃料計なども要ります（91.205(b)）。</p>
<p>夜の VFR には、昼の装備に加えて、次のものが要ります（91.205(c)）。夜がいつからかは、${bk.see('law.pilot', '規則の 3 つの「夜」')} で学びました。</p>
<ul><li>右舷灯・左舷灯・尾灯（航空灯）</li>
<li>衝突防止灯（ビーコン、anti-collision light）</li>
<li>有償で飛ぶときは、電気の着陸灯 1 つ</li>
<li>付けた電気と無線の装置に十分な電源</li>
<li>飛行中に手の届く予備のヒューズ（1 組か、種類ごとに 3 本）</li></ul>
<p>Class A・B・C などでは、トランスポンダー（transponder）と ADS-B Out も必要です（91.215・91.225。${bk.see('law.airspace', '空域の種類と入る条件')}）。トランスポンダーは、地上のレーダーの問い合わせに、4 けたのコードと高度で答える装置です。ADS-B Out は、GPS の位置などを自分から送り続ける装置です。使い方は ${bk.see('comm.xpdr', 'トランスポンダーとコード')} で学びます。IFR の装備（91.205(d)）は、${ahead('ifr.rules', 'IFR の規則')} で学びます。</p>
<h4>動かない装備があるとき</h4>
<p>MEL（Minimum Equipment List）は、動かなくても飛べる装備と、その条件の一覧です。承認された MEL のない小型機では、91.213(d) の順で判断します。まず、その装備が次のどれかで要るものかを確かめます。どれかに当たれば、飛べません（91.213(d)(2)）。</p>
<ol><li>型式証明（その機種の設計を FAA が認めた証明）の、昼の VFR の装備</li>
<li>機体の装備の一覧か、その飛び方の KOEL（Kinds of Operations Equipment List：飛び方ごとに要る装備の一覧）</li>
<li>91.205 など、Part 91 の規則で要るもの</li>
<li>AD で、動くことが求められているもの</li></ol>
<p>どれにも当たらなければ、外すか、動かないようにします。外したときは操縦席の操作部に札を付けて、整備の記録に書きます。動かないようにしたときは、「INOPERATIVE」の札を付けます。そのうえで、危険がないと操縦士か整備士が判断します（91.213(d)(3)(4)）。飛行中に見つけた不具合は、学校の手順で記録して報告します。</p>
<h4>点検の期限</h4>
${bk.t(['点検', '期限', '規則'], [['年次点検（annual inspection）', '12 暦月ごと', '91.409(a)'], ['100 時間点検', '有償で人を乗せるときと、操縦教員や学校が用意した機体で有償の飛行訓練をするとき（訓練機に多い）：最後の年次点検か 100 時間点検から 100 時間以内。点検の場所へ行くためだけなら 10 時間まで超えてよい（超えた分は次の 100 時間に数える）', '91.409(b)'], ['ELT（Emergency Locator Transmitter：航空機用救命無線機）', '12 暦月ごと。電池は、使った時間が合わせて 1 時間を超えたときか、寿命の半分で替える', '91.207'], ['トランスポンダー', '24 暦月ごと', '91.413'], ['静圧系統・高度計・高度の自動報告装置（トランスポンダーに高度を伝える装置）', '管制空域を IFR で飛ぶなら 24 暦月ごと', '91.411']])}
<p>点検の記録は、機体のログブック（整備の記録）で確かめます。</p>
${bk.key('耐空証明は掲示、登録証明・POH・重量重心の資料は機内に', '訓練機は、最後の年次点検か 100 時間点検から 100 時間以内', 'AD は守る義務のある規則。SAIB は情報', '動かない装備は 91.213 で判断。AD で要る装備なら飛ばない')}
${bk.jur('docs')}
${bk.q('訓練機は 10 か月前に年次点検を受け、そのあとの 100 時間点検から 104 時間飛んでいた。この機体で有償の飛行訓練をしてよい？', 'いけません。有償の飛行訓練に使う機体（操縦教員や学校が用意した機体）は、最後の年次点検か 100 時間点検から 100 時間以内でなければなりません（91.409(b)）。年次点検も 100 時間点検の代わりになりますが、この年次点検は 100 時間点検より前なので、どちらからも 100 時間を超えています。点検の場所へ行くためだけなら、10 時間まで超えてよい例外があります（91.409(b)）。')}` },
      // ------------------------------------------------------------------ 5
      { id: 'law.airspace', t: '空域の種類と入る条件', scope: 'us', faa: ['PA.I.D.K1', 'PA.I.E.K1'], h: () => `
${bk.aim('空はいくつかの「空域」に分かれていて、それぞれ入るための条件が違います。断面図で、空域の形と、入るのに要るもの（管制承認か交信か）を覚えます。')}
${FIG.airspace()}
<p>まず、言葉を 3 つ覚えます。</p>
<ul><li>管制空域（controlled airspace）は、管制のサービスがある空域です（Class A・B・C・D・E）。非管制空域（uncontrolled airspace）は Class G です。</li>
<li>MSL（mean sea level）は平均海面からの高さ、AGL（above ground level）は地面からの高さです。チャートの空域の高さは、ふつう MSL で書かれています。</li>
<li>入るのに管制承認か交信が要る空域は、2 種類に分かれます。Class B は管制承認、Class C と D は入る前の<b>双方向の無線交信の確立</b>です。</li></ul>
${bk.t(['空域', '形（代表的な例）', 'VFR で入る条件'], [
  ['Class A', '18,000 ft MSL〜FL600', 'IFR だけ（VFR では入れない）'],
  ['Class B', '大きな空港のまわり。上ほど広い、さかさまのウエディングケーキの形。ふつう 10,000 ft MSL まで', '<b>管制承認</b>（「cleared to enter Bravo airspace」など。Bravo は B の読み方）が要る。トランスポンダー・ADS-B Out。学生がひとりで入るには、その Class B の区域での訓練と、90 日以内の操縦教員の裏書きが要る（61.95）'],
  ['Class C', '中くらいの空港。半径 5 NM で地表から空港の標高の上 4,000 ft までの中心部と、半径 10 NM で、空港の標高の上 1,200〜4,000 ft の棚', '<b>入る前に双方向の無線交信を確立</b>する。トランスポンダー・ADS-B Out'],
  ['Class D', '管制塔のある空港。ふつう地表から空港の標高の上 2,500 ft まで。管制塔が時間を決めて運用する所は、ほかの時間は Class E か G になる（Chart Supplement に書いてある）', '<b>入る前に双方向の無線交信を確立</b>する'],
  ['Class E', 'A〜D 以外の管制空域。多くは地上 700 ft か 1,200 ft から上。14,500 ft MSL から 18,000 ft 未満は、ほぼどこでも Class E。ただし、地上 1,500 ft 未満（高い山の上の、地面に近い所）などは除く', '管制承認も交信も要らない（気象条件は 91.155）。ただし 10,000 ft MSL 以上（地上 2,500 ft 以下を除く）では、トランスポンダーと ADS-B Out が要る'],
  ['Class G', '非管制空域。多くは地上 1,200 ft より下', '管制承認も交信も要らない']])}
<p>Class C・D の高さは、空港の標高から測ります。チャートには、MSL に直した値が書かれます。</p>
<p>このほか、14 CFR Part 91 の付録 D に載る主な空港のまわりでも、装備が要ります。その空港から 30 NM 以内で、地表から 10,000 ft MSL までは、どの空域でも同じです（91.215・91.225）。要るのは、高度を報告するトランスポンダーと ADS-B Out です。オーランド国際空港のまわりも、この範囲です。</p>
${bk.src('AIM 3-2、14 CFR 91.129〜91.131・Part 91 付録 D')}
<h4>「交信の確立」とは</h4>
<p>Class C や D に入る前に管制を呼び、管制官が<b>自分の無線呼出符号（コールサイン、call sign）を言って</b>答えたら、交信は確立しています。「（自分のコールサイン）, standby」でも確立です。</p>
<p>コールサインのない「Aircraft calling, standby」では確立していないので、入ってはいけません。「remain outside the Class Charlie airspace（外で待て。Charlie は C の読み方）」と言われたら、入りません（AIM 3-2-4）。言い方の練習は ${bk.see('comm.ack', 'Class C 空域に入る前の交信の確立')} にあります。</p>
<p>実在の Orlando Sanford（KSFB）は Class C で、その上に Orlando の Class B がかぶっています（FAA の空港案内 From the Flight Deck）。この教材の LAB 空域は架空です。</p>
${bk.key('Class B は「管制承認」、Class C・D は「交信の確立」', '管制官が自分のコールサインで答えたら、交信は確立', '空域の高さは MSL で書かれることが多い。AGL と取り違えない')}
${bk.jp('<p>日本の航空法は、空域を Class の文字ではなく、名前で定めます。航空交通管制区（管制区、control area）は、地表か水面から 200 m 以上の空域のうち、告示で指定したものです（航空法第 2 条第 12 項）。空港等（空港、airport）は、空港その他の飛行場のことです（同条第 6 項）。航空交通管制圏（管制圏、control zone）は、告示で指定した空港等とその付近の上空の空域です（同条第 13 項）。航空交通情報圏（情報圏、information zone）は、管制圏のほかの、告示で指定した空港等とその付近の上空の空域です（同条第 14 項）。米国の Class と日本の空域の対応は〔要確認〕です。</p>')}
${bk.q('Class C の手前で LAB Approach（空港のまわりで出発と到着の機を受け持つ管制の呼び名）を呼んだら、「Aircraft calling LAB Approach, standby」と答えがあった。Class C に入ってよい？', 'いけません。コールサインを言わない答えでは、交信は確立していません（AIM 3-2-4）。Class C の外で待ち、もう一度呼んで、自分のコールサインで答えてもらってから入ります。')}` },
      // ------------------------------------------------------------------ 6
      { id: 'law.vfr', t: '有視界飛行（VFR）の気象条件：14 CFR 91.155', scope: 'us', faa: ['PA.I.E.K1', 'PA.I.E.K4'], h: () => `
${bk.aim('VFR で飛ぶには、決められた視程と、雲からの距離を守ります。いちばんよく使う「3-152」から覚えます。')}
${FIG.vfrCloudClearance()}
<p>有視界飛行方式（VFR：visual flight rules）は、外を見て、ほかの飛行機や地形を自分で避けながら飛ぶ方式です。そのため、前がよく見えること（視程）と、雲から十分に離れていることが決められています。</p>
<p>Class C・D と、10,000 ft MSL 未満の Class E では、<b>飛行視程 3 SM、雲の上 1,000 ft・下 500 ft・横 2,000 ft</b> です。この順に数字を拾って、「3-152」と覚えます。SM（statute mile：法定マイル）は約 1.6 km です。</p>
<p>飛行視程は、飛んでいる操縦席から前に見通せる距離です。地上視程は、空港の気象の観測が報告する、地面の近くの視程です（14 CFR 1.1）。VFR の気象条件は飛行視程で決めます。空港のまわりの離着陸は地上視程で決め、地上視程が報告されない空港では飛行視程を使います（91.155(d)）。</p>
<h4>空港のまわりの決まり</h4>
<p>空港のために地表まで設定された管制空域（Class B・C・D・E の地表区域）では、さらに次の決まりがあります（91.155(c)(d)）。</p>
<ul><li>雲高（シーリング、ceiling）が 1,000 ft 未満なら、VFR で雲の下を飛べません。離着陸も場周経路（トラフィックパターン、traffic pattern）も雲の下を飛ぶので、できません（91.155(c)）。雲高は、BKN（ブロークン）か OVC（オーバーキャスト）と報告された、いちばん低い雲の層の高さです（14 CFR 1.1）。</li>
<li>地上視程が 3 SM 未満なら、VFR で離着陸できません。場周経路にも入れません（91.155(d)）。</li></ul>
<p>この条件を満たさないときも、管制承認を受ければ、特別有視界飛行方式（special VFR）で飛べます。飛べるのは、その地表区域の中の 10,000 ft MSL 未満です（91.157(a)。Part 91 の付録 D の Section 3 の空港を除く）。雲に入らず、飛行視程 1 SM 以上で飛びます。日の出から日没までのほかは、IFR で飛べる資格と、IFR の装備が要ります（91.157(b)）。</p>
<p>学生の単独飛行には、もっと厳しい視程の決まりがあります（${bk.see('law.pilot', '学生操縦士の制限')}）。</p>
<h4>空域ごとの全部の表</h4>
${FIG.vfrMinima()}
<h4>同じ決まりを、機体を中心に言い直す</h4>
<p>91.155 は、雲から離れる距離で書いています。同じことを、機体を中心に言い直せます。「雲の下 500 ft」は、「機体の上 500 ft の中に雲がない」と同じです。「雲の上 1,000 ft」は、「機体の下 1,000 ft の中に雲がない」と同じです。</p>
${FIG.vfrTwoViews()}
<p>雲の「下」と機体の「上」で、上下の言葉が入れかわります。国によって書き方が違うので、どちらの言い方かを先に確かめます。</p>
${bk.key('3-152：飛行視程 3 SM、雲の上 1,000・下 500・横 2,000 ft（Class C・D・10,000 ft 未満の E）', '空港の地表区域では、雲高 1,000 ft・地上視程 3 SM 以上でないと VFR で離着陸できない', '「雲の下 500 ft」と「機体の上 500 ft に雲がない」は同じ決まり')}
${bk.warn('<b>ここに注意：</b>特別有視界飛行方式は、規則の上では飛べても、雲が低く視程の悪い中を飛ぶ、危険の大きい飛び方です。学生が単独で使ってよいかは、学校の決まりと操縦教員の指示に従います（この本の判断）。')}
${bk.jur('vmc', 'vmc.ad')}
${bk.jp('<p>日本の航空法施行規則第 5 条は、前の図の右の言い方（機体の上方・下方・水平の範囲に雲がない）で書いています。だから、日本の「上方」の数字は、米国の「雲の下」の数字に当たります。数字そのものは、上の日米の対照にあります。</p>')}
${bk.q('Class D の空港の METAR（定時の飛行場の実況、METAR）が「BKN008 5SM」。VFR で場周経路に入れる？', '入れません。雲高が 800 ft で、1,000 ft 未満です。空港の地表区域の中では、VFR で雲の下を飛べません（91.155(c)）。場周経路も、この雲の下を飛ぶことになります。視程は 5 SM でも、雲高の条件を満たしていません。管制承認があれば、特別有視界飛行方式で飛べることがあります（91.157）。')}` },
      // ------------------------------------------------------------------ 7
      { id: 'law.special', t: '特別な空域・ノータム・TFR', scope: 'us', faa: ['PA.I.D.K6', 'PA.I.E.K3'], h: () => `
${bk.aim('軍の訓練やロケットの打ち上げなどのために、特別な決まりのある空域があります。種類と、入ってよいかを学びます。')}
${FIG.specialUseAirspace()}
${bk.t(['種類', '内容'], [['Prohibited Area（P：飛行禁止区域）', '国の安全などのために、飛ぶことが禁止されている（AIM 3-4-2）'], ['Restricted Area（R：制限空域）', '全面の禁止ではないが、射撃・ミサイルなど、見えない危険がある。使っている時間は、使う機関か管理する機関の許可なしに入らない（AIM 3-4-3）'], ['Warning Area（W：警告空域）', '米国の海岸から 3 NM より沖にある、参加しない機に危険な活動がある空域。その危険を知らせるための空域'], ['MOA（Military Operations Area：軍の訓練空域）', 'VFR で入れるが、使っているときはよく注意する。入る前に、管理する機関に交通情報を求める'], ['Alert Area（A：警戒空域）', '訓練機などが多い。注意して飛ぶ'], ['NSA（National Security Area：国家安全区域）', '地上の施設を守るための空域。自分から避けるように求められている。ノータムで一時的に飛行禁止になることもある（AIM 3-4-8、14 CFR 99.7）'], ['MTR（Military Training Route：軍の訓練経路）', '軍機が 250 kt を超える速さで低く飛ぶ経路。多くは 10,000 ft MSL 未満で、VFR のチャートに描かれる（AIM 3-5-2）'], ['SFRA（Special Flight Rules Area）', '14 CFR Part 93 の特別な飛び方の決まりに従う空域（例：ワシントン DC のまわり）。チャートに描かれる（AIM 3-5-7）'], ['ADIZ（Air Defense Identification Zone：防空識別圏）', '米国の空域の境のあたりで、機体を早く見分けるための区域。出入りには、飛行計画（flight plan）・管制か FSS（飛行サービス局、Flight Service Station）からもらう個別のトランスポンダーのコード（1200 は使えない）・双方向の無線交信が要る（14 CFR 99、AIM 5-6-4）'], ['TFR（Temporary Flight Restriction：一時的な飛行制限）', '要人の移動・災害・大きな催し・ロケットの打ち上げなど。ノータムで知らされる']])}
${bk.src('AIM 3-4・3-5・5-6、14 CFR 91.133・91.137〜91.145・Part 99')}
<p><b>ノータム（NOTAM：Notice to Airmen）</b>は、滑走路や誘導路の閉鎖、航法施設の停止、TFR などの、一時的な情報の知らせです。ノータムは航空情報（aeronautical information）の 1 つで、航空情報は AIP やノータムなどをまとめた呼び名です。飛ぶ前に、必ず最新のノータムを確かめます。</p>
<p>フロリダの東海岸では、ロケットの打ち上げに合わせた飛行の制限が、ノータムで出ます（91.143）。パラシュート降下の場所は、Chart Supplement に一覧があります（AIM 3-5-4）。</p>
<p>米国の領空へ出入りする飛行（たとえばバハマへの飛行）では、有効な飛行計画が要ります。高度を報告するトランスポンダーで管制が指定したコードを出し、管制と双方向の無線交信を保ちます。米国の税関の決まりにも従います（AIM 5-6-5）。</p>
<h4>迎撃されたら</h4>
<p>米国では、国の安全のために、軍の機体が民間機を迎撃（interception）することがあります。機体を確かめる・追う・調べる・向きを変えさせる・交信する、などのためです（AIM 5-6-13）。迎撃されたら、すぐに次のことをします。</p>
<ul><li>迎撃機の合図と指示に従います。</li>
<li>迎撃機か管制機関を 121.5 MHz（緊急の周波数）で呼び、機体の識別（コールサイン）・位置・飛行の内容を伝えます。</li>
<li>トランスポンダーを 7700（緊急を知らせるコード）にします（管制から別の指示がなければ）。</li>
<li>ほかの機関の指示が、迎撃機の指示と食い違ったら、すぐに確かめます。放されるまで、迎撃機の合図と指示に従い続けます。</li></ul>
${bk.t(['迎撃機の合図（昼）', '意味', 'こちらがすること'], [['前の少し上（ふつう左）で翼を振り、ゆっくり旋回する（ふつう左へ）', '迎撃した。ついて来い', '翼を振って、ついて行く'], ['90° 以上の上昇旋回で、急に離れていく', '行ってよい', '翼を振る']])}
${bk.src('AIM 5-6-13・5-6-14（ICAO の合図）')}
<p>米国の空を飛ぶ機は、121.5 MHz を聞いておくことを強く勧められています（AIM 5-6-13）。</p>
<p>下の日米の対照の「特別有視界」は、特別な空域の決まりではありません。VFR の気象条件の例外で、${bk.see('law.vfr', '有視界飛行（VFR）の気象条件')} で学びました。</p>
<p>この教材の LAB 空域・訓練の地点は架空です。実際の空域の判断には使いません。</p>
${bk.key('飛行禁止区域（P）は入れない。制限空域（R）は、使っている時間は許可なしに入らない', 'TFR はノータムで知らされる。飛ぶ前に必ず確かめる', '迎撃されたら、迎撃機に従い、121.5 MHz で呼び、7700', 'この教材の空域は架空。実際の判断には最新のチャートとノータムを使う')}
${bk.jur('svfr')}
${bk.q('飛ぶ予定の経路の近くで、今日の午後にロケットの打ち上げがあると聞いた。何を確かめる？', '打ち上げの TFR（一時的な飛行制限）が出ていないかを、ノータムで確かめます（91.143・91.137〜）。TFR の範囲と時間を確かめ、その中に入らない経路と時間で計画します。')}` },
      // ------------------------------------------------------------------ 8
      { id: 'law.rules', t: '飛び方の主な規則：進路権・高度・速度・燃料', scope: 'us', faa: ['PA.I.D.K2', 'PA.III.B.K3'], h: () => `
${bk.aim('ぶつからないための進路権の決まり、低く飛びすぎないための高度、速度の制限、燃料の予備を学びます。')}
${FIG.rightOfWay()}
<h4>進路権の決まり（91.113）</h4>
<p>天気が許す限り（外が見える限り）、IFR でも VFR でも、全員が見張り（see and avoid）を続けます。ほかの飛行機を見て避けます（91.113(b)）。進路権のある機に対しては、十分に離れない限り、その上・下・前を横切ってはいけません。</p>
<ul><li>遭難している機が、すべての機より先です。</li>
<li>同じ種類の機が同じくらいの高さで交わるときは、<b>右にいる機</b>に進路権があります。</li>
<li>種類が違うときは、気球 ＞ 滑空機（グライダー、glider） ＞ 曳航・空中給油をしている機 ＞ 飛行船 ＞ ほかの動力機 の順です（米国の 91.113(d)）。曳航・空中給油をしている機とは、ほかの機を引いている機と、ほかの機に空中で給油している機です。</li>
<li>正面から近づいたら、<b>両方とも右へ</b>よけます。追い越すときは、前の機に進路権があり、追い越す機は<b>右へ</b>十分に離れて抜きます。</li>
<li>着陸の最終進入（着陸の直前に、滑走路へまっすぐ向かう部分）中の機や着陸中の機は、飛んでいる機や地上の機より先です。2 機が着陸に向かうときは、低いほうが先です（ただし、それを使って前に割り込んではいけません）。</li></ul>
<h4>低く飛びすぎない高さ（91.119）</h4>
<p>離着陸に必要なとき以外は、次の高さより低く飛びません。これを最低安全高度（minimum safe altitudes）といいます。</p>
<ul><li><b>どこでも</b>：エンジンが止まっても、地上の人や物に大きな危険なく不時着できる高さです。</li>
<li><b>人の多い町や、屋外の集まりの上</b>：半径 2,000 ft 以内のいちばん高い障害物から、1,000 ft 上です。</li>
<li><b>それ以外</b>：地上から 500 ft です。海の上や人の少ない所では、人・船・車・建物から 500 ft 離れます。</li></ul>
<h4>速度の制限（91.117）</h4>
<p>10,000 ft MSL 未満では、指示対気速度（IAS：indicated airspeed）で 250 kt 以下です。Class C・D の主な空港から 4 NM 以内で地上 2,500 ft 以下と、Class B の下では、200 kt 以下です。訓練機の Archer は、巡航でもこの制限よりずっと遅く飛びます。</p>
<h4>燃料の予備（91.151）</h4>
<p>VFR では、風と予報を考えて、燃料を計算します。最初の着陸予定地まで飛び、そのあと普通の巡航速度で<b>昼は 30 分、夜は 45 分</b>飛べる燃料が要ります。足りなければ出発できません。計算のしかたは ${bk.see('perf.fuel', '燃料の計画と予備')} にあります。</p>
<h4>管制塔のある空港・管制塔のない空港</h4>
<p>管制塔が運用中の空港では、地上滑走（タキシー、taxi）・離陸・着陸のたびに、管制塔の許可が要ります（91.129(i)）。Class D の空港では、入る前に管制塔と交信を確立し、その空域にいる間は保ちます（91.129(c)）。</p>
<p>管制塔のない空港（Class G・E）に着陸するときは、場周経路の旋回はすべて左回りです（91.126(b)・91.127(a)）。ただし、右回りを示す灯火や地上の標示があれば、右回りです。</p>
<p>学生操縦士の制限は、${bk.see('law.pilot', '操縦士の決まり')} にまとめました。</p>
${bk.key('進路権があっても、見張りと衝突を避ける義務はみんなにある（91.113(b)）', '交わるときは右の機に進路権。正面は両方右へ。追い越しは右へ', '米国の VFR の燃料（91.151）は、最初の着陸予定地まで＋昼 30 分・夜 45 分')}
${bk.jur('row', 'msa', 'speed', 'fuel.vfr')}
${bk.q('同じ高さで、自分の右前から別の単発機が近づいてきて、進路が交わりそう。どちらに進路権がある？ 自分はどうする？', '右にいる相手に進路権があります（91.113(d)）。自分は相手の上・下・前を横切らず、たとえば右へ曲がって相手の後ろを通ります。相手が気づいていないこともあるので、早めに動きます。')}` },
    ],
    terms: [['Pilot in command (PIC)', '機長', '91.3。単独飛行では自分'], ['Preflight action', '出発前の確認', '91.103'], ['Airworthiness / Registration certificate', '耐空証明・登録証明', '91.203'], ['Annual / 100-hour inspection', '年次点検・100 時間点検', '91.409'], ['Controlled / Uncontrolled airspace', '管制空域・非管制空域', 'Class A〜E・Class G'], ['MSL / AGL', '平均海面からの高さ・地面からの高さ', ''], ['Class A–G airspace', '空域の種類', ''], ['Clearance', '管制承認', 'Class B に入るには管制承認が要る'], ['Two-way radio communications', '双方向の無線交信', 'Class C・D'], ['Transponder / ADS-B Out', 'トランスポンダー・ADS-B Out', '91.215・91.225'], ['VFR weather minimums', 'VFR の気象条件', '91.155'], ['Ceiling', '雲高', '14 CFR 1.1。BKN か OVC のいちばん低い雲の層'], ['Flight / Ground visibility', '飛行視程・地上視程', '14 CFR 1.1。飛行視程は操縦席から前に見える距離、地上視程は地上の観測'], ['Special VFR', '特別有視界飛行方式', '91.157'], ['Prohibited / Restricted Area / MOA / Warning / Alert', '飛行禁止区域・制限空域・軍の訓練空域・警告空域・警戒空域', 'AIM 3-4'], ['NSA / MTR / SFRA / ADIZ', '国家安全区域・軍の訓練経路・SFRA・防空識別圏', 'AIM 3-4-8・3-5・5-6-4'], ['NOTAM (Notice to Airmen) / TFR', 'ノータム・一時的な飛行制限', '「航空情報」は AIP や NOTAM などをまとめた呼び名で、NOTAM の訳ではない'], ['Right-of-way', '進路権', '91.113。通称は優先権'], ['Glider', '滑空機', '通称はグライダー。91.113(d)'], ['Minimum safe altitudes', '最低安全高度', '91.119'], ['VFR fuel reserve', 'VFR の燃料の予備', '昼 30 分・夜 45 分'], ['Student pilot limitations', '学生操縦士の制限', '61.89'],
      ['Advisory circular (AC)', 'FAA の指針（アドバイザリーサーキュラー）', '規則に取り込まれていなければ、守る義務はない'], ['Endorsement', '裏書き', '操縦教員がログブックに書く承認。機種・期間などの条件つき'], ['Flight review', 'フライトレビュー', '61.56。24 暦月の間に 1 回'], ['Recent flight experience', '最近の飛行経験', '61.57。人を乗せるには 90 日に 3 回'], ['Calendar month', '暦月', '月で数え、その月の終わりまで'], ['Medical certificate', '航空身体検査証明', '61.23。自家用と学生は第 3 種以上'], ['Aircraft accident / Incident', '事故・インシデント', '49 CFR 830.2'], ['National Transportation Safety Board (NTSB)', '国家運輸安全委員会', '事故をすぐ知らせる先（830.5）'], ['Interception', '迎撃', 'AIM 5-6-13：指示に従い、121.5 MHz で呼び、7700'], ['Airworthiness Directive (AD) / SAIB', '耐空性改善通報・SAIB', 'AD は守る義務のある規則（39.3）。SAIB は規則ではない情報'], ['Special flight permit', '特別飛行許可', '21.197'], ['Preventive maintenance', '予防整備', '43.3(g)・Part 43 付録 A'], ['MEL / KOEL', 'MEL・KOEL', '91.213。動かない装備があっても飛べるかを決める一覧'], ['Civil twilight', '市民薄明', '太陽の中心が地平線の下 6° まで（USNO）']],
    examples: ['LAB（架空の Class C）へ戻る：境界の手前で LAB Approach を呼び、自分のコールサインで答えがあってから入る。コールサインのない「standby」では入らない。', '左前から同じ高さの機が近づく：右にいる自分に進路権があるが、相手が気づかないこともあるので、見張りを続けて早めに避ける。', '目的地の METAR が BKN008：雲高 1,000 ft 未満なので、VFR では雲の下の地表区域に入れない。', '自家用の資格を持つ人が、昼の離着陸を 90 日以内に 3 回していても、日没の 1 時間後に人を乗せて飛ぶには、その時間帯の着陸が 3 回要る（61.57(b)）。', '管制から高度の指示があったが、その高度では雲に入る：「unable」と伝え、雲を避けられる高度を求める。管制承認は規則から外れてよい許可ではない（AIM 4-4-1）。'],
    cautions: ['規則は改正される。実際の運航では、最新の 14 CFR・AIM・チャート・Chart Supplement・NOTAM で確かめる。', 'この章は要約。規則の全文と例外は原文で。', 'この教材の LAB 空域は架空。実際の空域の判断には使わない。', '期限（身体検査・フライトレビュー・最近の経験・裏書き）は、自分のログブックと証明書で確かめる。友人の期限と同じとは考えない。'],
    quiz: [
      { q: 'Class C 空域に VFR で入るための条件は？', choices: ['管制承認（cleared to enter Bravo airspace など）', '入る前に双方向の無線交信を確立する', '計器飛行証明', '何も要らない'], answer: 1, why: 'Class C・D は、入る前の交信の確立（管制官が自分のコールサインで答える）。「remain outside」と言われたら入らない（AIM 3-2-4）。明確な管制承認が要るのは Class B（AIM 3-2-3。節「空域の種類と入る条件」）。' },
      { q: 'Class C・D と 10,000 ft MSL 未満の Class E で、VFR の最低の気象条件は？', choices: ['1 SM・雲に入らない', '3 SM・雲の下 500 ft・上 1,000 ft・横 2,000 ft', '5 SM・雲の下と上 1,000 ft・横 1 SM', '3 SM・雲に入らない'], answer: 1, why: '14 CFR 91.155：飛行視程 3 SM、雲の上 1,000 ft・下 500 ft・横 2,000 ft（3-152）。「3 SM・雲に入らない」は Class B（節「有視界飛行（VFR）の気象条件」）。' },
      { q: '昼の VFR で、最初の着陸予定地に着いたあと、普通の巡航速度で何分飛べる燃料が必要？（91.151）', choices: ['10 分', '30 分', '45 分', '1 時間'], answer: 1, why: '最初の着陸予定地まで飛び、そのあと昼は 30 分、夜は 45 分（普通の巡航速度で、風と予報を考えて。14 CFR 91.151。節「飛び方の主な規則」）。' },
      { q: '同じ高さで、自分の右側から別の飛行機が近づき、進路が交わりそう。進路権（優先権）があるのは？', choices: ['自分', '右にいる相手', '速いほう', '高いほう'], answer: 1, why: '91.113(d)：同じ種類の機が交わるときは、右にいる機に進路権。自分は相手の上・下・前を横切らない（節「飛び方の主な規則」）。' },
      { q: '2025 年に改正された 91.113 で、次のうち進路権の順が最も先なのは？', choices: ['飛行船', '滑空機（グライダー）', '曳航中の飛行機', '単発の飛行機'], answer: 1, why: '順番は、気球 ＞ 滑空機 ＞ 曳航・給油中の機 ＞ 飛行船 ＞ ほかの動力機。この中では滑空機（91.113(d)。節「飛び方の主な規則」）。' },
      { q: 'AIM（Aeronautical Information Manual）は、どういう資料？', choices: ['規則ではないが、規則が求める手順の例を示す FAA の資料', '14 CFR と同じく、守らないと違反になる規則', '機体ごとの運用限界を決める資料', '一時的な飛行制限を知らせる資料'], answer: 0, why: 'AIM の前書きの方針（Flight Information Publication Policy）は、AIM を「規則ではない」とし、ほかの規則で求められることがある手順の例を示すと書いている。運用限界は飛行規程（91.9）、一時的な制限はノータム（91.137〜91.145。節「規則の読み方」）。' },
      { q: '自家用の資格を持つ 30 歳の人。最後のフライトレビューは 2024 年 5 月 20 日。2026 年 5 月 31 日に機長として飛べる？', choices: ['飛べない（2 年を過ぎている）', '飛べない（フライトレビューは 12 暦月ごと）', '飛べる（24 暦月目の月の終わりまで有効）', '飛べる（フライトレビューは一度受ければよい）'], answer: 2, why: '61.56(c)：飛ぶ月の 24 暦月前の月の初めから後に、フライトレビューを受けていればよい。2026 年 5 月に飛ぶなら、2024 年 5 月 1 日から後に受けていればよいので、5 月 20 日は間に合う（節「操縦士の決まり」）。' },
      { q: '人を乗せて機長として飛ぶための、昼の最近の飛行経験は？', choices: ['30 日以内に離陸と着陸を 1 回', '6 暦月以内に計器進入 6 回', '24 暦月の間にフライトレビュー', '90 日以内に離陸と着陸を 3 回ずつ'], answer: 3, why: '61.57(a)：90 日以内に、同じカテゴリー・クラスの機体で、自分で操縦して離陸と着陸を 3 回ずつ。計器進入 6 回は IFR の経験（61.57(c)）、フライトレビューは別の決まり（61.56。節「操縦士の決まり」）。' },
      { q: '米国で事故（人の重いけが、または機体の大きな損傷）が起きた。規則で決まっている、運航者の最初の報告は？', choices: ['すぐに、いちばん早い方法で最寄りの NTSB に知らせる', '30 日以内に FAA に手紙を出す', '機体を片づけて、次の飛行に備える', '報告は要らない'], answer: 0, why: '49 CFR 830.5：事故と決められた重大インシデントは、すぐに最寄りの NTSB へ。残骸は、けが人を助けるときなどのほかは動かさない（830.10）。報告書は 10 日以内（830.15。節「操縦士の決まり」）。' },
      { q: 'ATC から管制承認をもらった。正しいのは？', choices: ['承認があれば、燃料や天気の確かめは要らない', '承認は、規則や最低高度から外れてよい許可でもある', '承認に従うと危ないと思ったら、変えた承認を求める', '承認が分からなくても、まず従ってから聞く'], answer: 2, why: 'AIM 4-4-1：管制承認は決めた条件で進む許可で、規則・最低高度から外れる許可でも、危ない飛び方の許可でもない。危ないと思ったら変えた承認を求める。分からないときはすぐに聞く（91.123(a)。節「規則の読み方」）。' },
      { q: '人を乗せるための夜の着陸 3 回（61.57(b)）を数える時間帯は？', choices: ['日没から日の出まで', '夕方の市民薄明の終わりから朝の市民薄明の始まりまで', '日没の 30 分後から日の出の 30 分前まで', '日没の 1 時間後から日の出の 1 時間前まで'], answer: 3, why: '61.57(b)：日没の 1 時間後から日の出の 1 時間前まで。航空灯は日没から日の出まで（91.209）、14 CFR 1.1 の夜間の定義は市民薄明で区切る（節「操縦士の決まり」）。' },
    ],
    written: [
      ['出発の準備で、自分の資格に問題がなく、機体の点検も済みました。この 2 つだけで出発を決めてよいですか。規則・空港と空域の情報・管制との関係を含めて説明してください。', `まだ決められません。予定する飛行方式・天気・経路の空域・空港の運用・最新のチャートとノータムを照らします。管制承認が要る空域なら、それも確かめます。規則の条件と、機体と自分の能力を合わせて、実行できる計画かを機長が決めます。${bk.see('law.basis', '規則の読み方')}`, ['kiso09.q1']],
      ['日本の教本で見た空域の図や数字を、フロリダの訓練でもそのまま使えると考えました。この考えを、国際的な枠組み・その国の規則・AIP の役割に分けて検討してください。', `そのままは使えません。国際民間航空条約と附属書は共通の土台ですが、各国の決まりと空域は同じではありません。米国では 14 CFR が規則で、空域と空港の具体的なことはチャート・Chart Supplement・AIP・ノータムで確かめます。米国も、ICAO と違う所を AIP の GEN 1.7 に書いています。資料の国・対象・有効な日をそろえてから使います。${bk.see('law.basis', '規則の読み方')}`, ['kiso09.q2']],
      ['給油と点検をした人が「準備はできています」と言いました。機長は、自分でも確かめる必要がありますか。', `要ります。ほかの人の作業や報告を使っても、機長の責任は変わりません（91.3）。記録・燃料・重さ・天気・ノータムなどを自分でも確かめ、まだ確かめていない点がないかを聞きます。安全に飛べる状態かを決めるのは機長です（91.7）。${bk.see('law.pic', '機長の責任と飛行前の準備')}`, ['kiso09.q7']],
      ['目的地が見えるほど視程がよいので、雲のすぐ下の高度でも VFR で飛べると考えました。この判断を検討し、確かめることを説明してください。', `視程だけでは決められません。今いる空域と高度の区分を選び、その区分の視程と、雲からの下・上・横の距離を確かめます。Class C・D なら、飛行視程 3 SM と、雲の下 500 ft・上 1,000 ft・横 2,000 ft です（91.155）。空港の地表区域では、雲高と地上視程の条件もあります。経路の全部で保てるかも見通します。${bk.see('law.vfr', '有視界飛行（VFR）の気象条件')}`, ['kiso09.q9']],
      ['チャートの上で、経路がある空域の線の内側に入りました。これだけで、その空域に入ると判断できますか。', `できません。空域には横の範囲と、上限・下限があります。予定の高度を上限・下限と比べ、高さが MSL か AGL かも確かめます。使っている時間、入る条件（管制承認か交信の確立か）、ノータムで出た一時的な変更も調べます。${bk.see('law.airspace', '空域の種類と入る条件')}`, ['kiso09.q11']],
      ['飛行計画を出したので、管制塔のある空港での離陸の許可も済んだと考えました。この理解を検討してください。', `飛行計画を出したことは、管制塔の許可をもらったことになりません。管制塔が運用中の空港では、地上滑走・離陸・着陸の許可を、その都度もらいます（91.129(i)）。許可が出たら、その中身（どの滑走路か、どこまでか）を確かめます。${bk.see('law.rules', '飛び方の主な規則')}`, ['kiso09.q12']],
      ['管制と交信しているので、ほかの飛行機の見張りは管制に任せてよいと考えました。この判断を検討してください。', `任せられません。天気が許す限り、IFR でも VFR でも、全員がほかの機を見て避けます（91.113(b)）。管制が知らない VFR の機体も飛んでいます（AIM 4-4-1）。交通情報を受けたら、見つけたかどうかを正しく伝え、見つけるまで探し続けます（言い方は ${bk.see('comm.words', '標準用語の正しい意味')}）。${bk.see('law.rules', '飛び方の主な規則')}`, ['kiso09.q13']],
      ['地形が平らで人家も少ないので、好きな低い高度で飛んでよいと考えました。最低安全高度の決まりで、この考えを検討してください。', `よくありません。どこでも、エンジンが止まっても地上に危険なく不時着できる高度が要ります（91.119(a)）。人家のまばらな所でも、人・船・車・建物から 500 ft 離れます（91.119(c)）。町の上では、もっと高く飛びます。特別な空域や TFR の制限も重ねて確かめます。${bk.see('law.rules', '飛び方の主な規則')}`, ['kiso09.q14']],
      ['航空身体検査証明・フライトレビュー・最近の飛行経験の 3 つを、何を確かめる決まりか、どう数えるかで説明してください。', `航空身体検査証明は体の条件で、第 3 種は検査の日の年齢で 60 か月か 24 か月です（月の終わりまで。61.23）。フライトレビューは知識と操縦の見直しで、24 暦月の間に 1 回です（61.56）。最近の飛行経験は、人を乗せる前の 90 日以内の 3 回の離着陸などで、日で数えます（61.57）。${bk.see('law.pilot', '操縦士の決まり')}`],
      ['訓練中に、着陸で翼端を少しこすりました。けが人はいません。誰に何を知らせますか。事故に当たるかも説明してください。', `まず操縦教員と学校に知らせ、学校の手順で記録します。その機体は、整備士が点検して飛べると判断するまで飛ばしません（91.7）。翼端だけの損傷は、49 CFR 830.2 の「大きな損傷」に入らないので、それだけでは事故に当たりません。事故や決められた重大インシデントなら、運航者がすぐに最寄りの NTSB に知らせます（830.5）。${bk.see('law.pilot', '操縦士の決まり')}`],
    ],
    refs: [R.cfr91, R.cfr61, R.cfr1, NEW_R.ntsb830, NEW_R.cfr4787, R.aim31, R.aim32, R.aim34, R.aim35, R.aim44, R.aim51, NEW_R.aim56, NEW_R.aimPdf, NEW_R.phak1, NEW_R.phak15, R.phak, R.jo71, R.nist811, NEW_R.aipGen17, NEW_R.faaVfrCharts, NEW_R.faaChartSupp, R.acsP, R.sfb, R.egovKoku, R.egovKokuKisoku], lessons: ['t2', 'n2'] });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
