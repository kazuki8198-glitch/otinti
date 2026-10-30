// DRAFT (W20, R2) — Part 1's chapter 'hf'「人間の能力と判断」(DESIGN 3.3 第 1 部 第 18 章) and the new chapter
// 'adm'「エラー・状況認識・リスク」(第 19 章), textbook/rewrite/combined/DESIGN.md 3.3, 4.1 row 12, 4.2 kiso10, 7.2 W20.
// No product reads this file (DESIGN 6.2 rule 5, 7.4). It is a plain script like book-2.js: when the chapters are
// registered, the first B.add(...) replaces the one of 'hf' in flight-lab/src/book-2.js in place (same id, same place:
// after radio1〜radio5, which book-comm.js puts before 'hf'), the second B.add(...) goes right after it in book-2.js
// (it carries before: 'ground', so it stands between 'hf' and the first chapter of Part 2 in any load order; the summary
// chapter g1 of W25 goes before 'ground' too, so after 'adm'), the figures of hfadm-figs.js go into book-figs.js, and
// the references in NEW_R go into book-core.js's R (then `NEW_R.x` → `R.x`). Check them with the figures:
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/hfadm-figs.js textbook/rewrite/combined/drafts/hfadm.js
//
// What changed in 'hf' (9 sections; the 7 of the textbook kept with their ids and in their order — self, body, altitude,
// vision, adm, attitude, srm — and the 2 new ones next to the sections DESIGN 3.3 puts them by: hf.fatigue after hf.self,
// hf.motion after hf.body. DESIGN 3.3's table lists hf.altitude before hf.body; the unit's rule "keep every existing
// section in place and order" wins here, and the report asks the integrator which order to register):
//  - hf.self ← kiso10.12・10.13: the IMSAFE table kept, how to use it (not a certificate; the medical's validity is not
//    today's fitness), medicines (PHAK: 48 h after a new medicine, five dosing intervals; Japan's guideline A〜D in a
//    bk.jp box), the alcohol words the safety review passed kept word for word (14 CFR 91.17・8 時間以内・0.04・12〜24 時間・
//    「この朝は飛びません」: flight.test.mjs and cadet/test/jur.test.mjs), bk.jur('alcohol', 'medical') as before;
//  - ★hf.fatigue ← kiso10.10・10.11 (figure fatigueFactors = ch10-fig10-5 redrawn): fatigue acute/chronic, the body
//    clock and jet lag (Japan → London → Florida is westward; FAA: eastward is worse; no hand-written UTC offsets: the
//    time-zone numbers are FL.jur's 'time' in basics.time, linked), stress and workload, dehydration and heatstroke
//    (moved here from hf.self), cold. No hypothermia paragraph: no primary source read (report: open);
//  - hf.altitude ← kiso10.2・10.3・10.4・10.9: oxygen's partial pressure (figure o2Partial = ch10-fig10-2 redrawn with
//    FL.physics.atmos), K.human.K4 (symptoms are the same each time in one person: the altitude chamber), the standard
//    actions K.human.K1 asks (100 % oxygen first; heater off and vents open, land, tell ATC; Valsalva; no flying with a
//    cold: R.cold-sick), the pulse oximeter's limit (CDC), altitude-induced DCS (PHAK, FAA brochure), photos
//    ch10-photo2・ch10-photo4 (W22's captions), bk.jur('oxygen');
//  - hf.body ← kiso10.6・10.7: the bold definition of the concept's address (C.spatial-disorientation), the trust-but-
//    cross-check of R.trust-instruments kept, the approach illusions with the go-around, the safety item ③ (VFR into
//    cloud) kept with every word flight.test.mjs fixes, and its sources settled: AFH chapter 18 (wings level, ≤ 10°,
//    one bar, no combined manoeuvres, autopilot, the 10-minute statistic, ATC's urgency) and, for the 180° turn, the
//    book's own ruling R.vfr-into-imc said as the book's choice (AFH does not prescribe a direction) plus PHAK
//    chapter 17's "decide early to turn 180° and land at an alternate" for the moment before the cloud;
//  - ★hf.motion ← kiso10.8・10.14 (new figure gLoad): motion sickness (PHAK), G (US AIM 8-1-7, FAA brochure), hearing
//    and noise (FAA brochure AM-400-98/3), sudden illness in flight and incapacitation;
//  - hf.vision ← kiso10.5 (figure nightEye = ch10-fig10-3 redrawn): cones and rods, the night blind spot, 5–10° off
//    centre, light adaptation and sunglasses (US AIM 8-1-6); the wake-turbulence paragraph stays, shortened, because its
//    address ops.wake (W28, R3) is not in the book yet (DESIGN 6.2 rule 13; ERRATA T.human.T8 stays open for W28);
//  - hf.adm ← kiso10.20: the 3P table kept, external pressures as PHAK words them, the 5P (PHAK) with its decision
//    points, PAVE is not a go-card; hf.attitude ← kiso10.19; hf.srm ← kiso10.24 (first half): how to ask for help, the
//    passenger as a resource with the limit R.passenger-resource gives, PHAK's sterile flight deck;
//  - every section scope 'common'; the AIM's paragraph numbers left the common sentences (check-jurisdiction): a source
//    line bk.src(...) under the paragraph, or a sentence that names the country (米国の AIM …);
//  - no {ch:} to a later part any more ({ch:tl}・{ch:emg}・{ch:jet}・{ch:crm} were warnings); the end-of-chapter 5
//    questions in place and order, 4 new ones after them; 17 written questions (16 rewritten from kiso10's qa).
// What 'adm' is (new, 5 sections in DESIGN 3.3's order, all scope 'common'):
//  - adm.error ← kiso10.1・10.15: information processing (figure infoProcess, UK CAA CAP 737 ch. 1), attention and the
//    order of tasks, the error types of CAP 737 (slip・lapse・mistake・violation), the Swiss cheese model (figure
//    swissCheese, FAA Risk Management Handbook), SHELL in a fold, marked 推測・要確認 (ICAO Doc 9859/9683 not readable
//    here: the report's open issues);
//  - adm.check ← kiso10.16 (figure checklistFlow = ch10-fig10-7 redrawn, photo ch10-photo5): AFH chapter 1, CAP 737;
//  - adm.sa ← kiso10.17・10.18 (figure saLevels = ch10-fig10-8 redrawn): RMH's definition, PHAK's obstacles, expectation
//    and confirmation bias (RMH), plan continuation (PHAK's get-there-itis, CAP 737);
//  - adm.risk ← kiso10.21・10.22・10.26 (new figure riskMatrix = PHAK figure 2-5, figure residualRisk = ch10-fig10-10
//    redrawn): hazard, risk, residual risk (RMH), the
//    bold definition of personal minimums (address of C.personal-minimums) with RMH's six steps and adjustments, a
//    worksheet, the early turn-back and go-around; the recall of TEM (C.tem-words) links crm.tem with「予告」;
//  - adm.review ← kiso10.27: debriefing, reporting and just culture (CAP 737), ASRS in a bk.us box (AC 00-46F, 14 CFR
//    91.25), VOICES and 技能発揮訓練 in a bk.jp box (no article number: 航空法第 71 条の 5 is not in the e-Gov copy),
//    the bold definitions of surprise and startle (address of C.surprise-startle; AC 120-111, CAP 737).
// FL.terms names with the first use in each chapter「正式名（通称、English）」; words the table does not have yet
// (状況認識・動揺病・個人の最低基準・確証のバイアス・残留リスク・驚き・驚愕 …) are written plainly and listed for W04
// (report). No FLIGHT LAB operation words and no real airline names in the bodies (DESIGN 6.2 rule 10). Every claim
// (number, unit, article, rule) is in hfadm.claims.json with its tag and source.
(function (FL) {
  'use strict';
  const B = FL.book, R = B.R, bk = B.bk, FIG = FL.bookFigs;
  // new references (to be added to book-core.js's R when the chapters are registered; each URL opened on 2026-10-30)
  const NEW_R = {
    phak2: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 2 章 Aeronautical Decision-Making（3P・PAVE・CARE・TEAM・5P・DECIDE・危険な態度・リスク・マトリックス・状況認識・外からの圧力）", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/04_phak_ch2.pdf' },
    phak17: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 17 章 Aeromedical Factors（低酸素症の 4 種類と有効意識時間・耳・空間識失調・動揺病・一酸化炭素・ストレス・疲労・脱水と熱中症・薬・減圧症・目）", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/19_phak_ch17.pdf' },
    afh18: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 18 章 Emergency Procedures（Inadvertent VFR Flight Into IMC：認める・操縦を保つ・助けを得る、p.18-17〜18-21）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/19_afh_ch18.pdf' },
    afh1: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 1 章 Introduction to Flight Training（Use of Checklists）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/02_afh_ch1.pdf' },
    aim74: { label: 'FAA AIM 7-4 Wake Turbulence（翼端渦の強さ・沈み方・大きな機の後ろでの離着陸）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap7_section_4.html' },
    faaCircadian: { label: 'FAA CAMI, Medical Facts for Pilots「Circadian Rhythm Disruption and Aviation」（OK-23-0080。時差ぼけは東へ向かう方が重い・時差を減らすこつ）', url: 'https://www.faa.gov/sites/faa.gov/files/Circadian_Rhythm_English_0.pdf' },
    faaHearing: { label: 'FAA CAMI, Medical Facts for Pilots「Hearing and Noise in Aviation」（AM-400-98/3。小型機の操縦席 70〜90 dB・90 dB を超える音と聴力・耳の守り方）', url: 'https://www.faa.gov/sites/faa.gov/files/pilots/safety/pilotsafetybrochures/hearing.pdf' },
    faaAccel: { label: 'FAA CAMI「Acceleration in Aviation: G-Force」（OK-24-1154。G に弱くなる条件：飲酒・疲労・脱水）', url: 'https://www.faa.gov/pilots/safety/pilotsafetybrochures/Acceleration.pdf' },
    faaDcs: { label: 'FAA CAMI「Altitude-Induced Decompression Sickness」（ダイビングをしていない健康な人では 18,000 ft より下ではまれ）', url: 'https://www.faa.gov/pilots/safety/pilotsafetybrochures/Altitude-Induced_Decompression_Sickness.pdf' },
    faaCo: { label: 'FAA CAMI「Carbon Monoxide: A Deadly Menace」（暖房を切る・換気・早めの着陸・管制に伝える・検知器）', url: 'https://www.faa.gov/pilots/safety/pilotsafetybrochures/CarbonMonoxide.pdf' },
    cdcCo: { label: 'CDC「Clinical Guidance for Carbon Monoxide (CO) Poisoning」（2 波長のパルスオキシメーターは一酸化炭素があると正しくない。2026-08-21 見直し）', url: 'https://www.cdc.gov/carbon-monoxide/hcp/clinical-guidance/index.html' },
    cap737: { label: 'UK Civil Aviation Authority, CAP 737 Flight-crew human factors handbook（第 2 版 2023。情報処理・注意・エラーの種類・驚きと驚愕・チェックリストの中断）', url: 'https://www.caa.co.uk/publication/download/14984' },
    ac120111: { label: 'FAA AC 120-111 Upset Prevention and Recovery Training（Change 1。startle と surprise の定義）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-111_CHG_1.pdf' },
    ac0046f: { label: 'FAA AC 00-46F Aviation Safety Reporting Program（2021。NASA の ASRS・報告者の秘匿・14 CFR 91.25）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_00-46F.pdf' },
    mlitAlcohol: { label: '国土交通省航空局長通達「航空機乗組員の飲酒による運航への影響について」（平成 31 年 1 月 31 日 国空航第 2278 号）', url: 'https://www.mlit.go.jp/common/001271263.pdf' },
    mlitMeds: { label: '国土交通省航空局「航空機乗組員の使用する医薬品の取扱いに関する指針」（令和 5 年 7 月 21 日一部改正。A〜D の 4 区分）', url: 'https://www.mlit.go.jp/common/001476614.pdf' },
    mlitHf: { label: '国土交通省「自家用操縦士等ヒューマンファクターズ訓練検討会 最終とりまとめ」（令和 8 年 2 月 24 日。技能発揮訓練の間隔 2 年・最低 3 時間・義務の適用は令和 10 年 6 月頃の見込み）', url: 'https://www.mlit.go.jp/koku/content/001994979.pdf' },
    voices: { label: '航空安全情報自発報告制度（VOICES）「VOICES について」（公益財団法人 航空輸送技術研究センター。平成 26 年 7 月 10 日開始・義務報告の代わりにならない）', url: 'https://jihatsu.jp/about/' },
  };

  // ======================================================================= 第 1 部 第 18 章
  B.add({ id: 'hf', part: 'p1', t: '人間の能力と判断（ADM）', en: 'Human factors and aeronautical decision-making',
    summary: '飛ぶ前と飛んでいる間に、自分の体と心の状態を確かめ、判断に生かせるようにします。自分の点検（IMSAFE と飲酒・薬）、疲労・時差・ストレス・暑さ、空間識失調と錯覚、動揺病・G・騒音・急な体調の変化、高度と体（低酸素・過呼吸・一酸化炭素・耳・減圧症）、見張りと夜の目、判断の型（3P・PAVE・CARE・TEAM・5P・DECIDE）、危険な態度、1 人で操縦するときの資源管理（SRM）を学びます。',
    secs: [
      // ------------------------------------------------------------------ 1
      { id: 'hf.self', t: '自分の体調：IMSAFE', scope: 'common', from: ['kiso10.12', 'kiso10.13'], jcab: ['ppl.3.3.2.5', 'ppl.3.3.3.7', 'cpl.3.3.2.5', 'cpl.3.3.3.8', 'ir.8.2.5'], faa: ['PA.I.H.K1', 'PA.I.H.K2', 'PA.I.H.K3', 'PA.II.A.K1'], h: () => `
${bk.aim('飛ぶ前に、機体だけでなく自分も点検します。その日、安全に飛べる体と心の状態か、つまり飛行への適合性（fitness for flight）を、自分で確かめます。')}
<p>米国の FAA が出す AIM（Aeronautical Information Manual）は、事故の統計を引いています。操縦士の不調が関わる事故は、機体の装置の故障による事故よりずっと多いのです。機体の点検にチェックリスト（checklist）を使うように、自分の点検にも型を使います。それが <b>IMSAFE</b>（IMSAFE checklist、「I'm safe」の頭文字）です。「私は安全に飛べる」と覚えます。</p>
${bk.t(['項目', '確かめること'], [
  ['I：Illness（病気）', '軽い病気でも、判断・記憶・注意が落ちます。いちばん安全なのは、病気のときは飛ばないことです'],
  ['M：Medication（薬）', '市販薬も含めます。眠くなる薬（かぜ薬・せき止め・アレルギーの薬・酔い止めなど）は判断を落とし、低酸素にもなりやすくします。米国の規則（14 CFR 91.17）では、安全に反する影響のある薬を使っている間は、乗務できません。いちばん安全なのは、FAA の承認がない限り、薬を飲んでいるときは飛ばないことです'],
  ['S：Stress（ストレス）', '仕事や家の心配ごとは、注意を奪います。いつもより困りごとが多いときは、飛ぶのを延ばします'],
  ['A：Alcohol（飲酒）', '米国の規則（14 CFR 91.17）：飲んでから 8 時間以内・酔っている間・アルコール濃度 0.04 以上は乗務できません。米国の AIM：ビール 1 本でも技量は落ち、少なくとも 3 時間は息や血液から検出されます。8 時間たっても影響が残ることがあるので、量に応じて 12〜24 時間あけます。二日酔いも危険です'],
  ['F：Fatigue（疲労）', '疲れは、大きな間違いをするまで自分では気づきにくい危険です。十分に眠ります'],
  ['E：Emotion（感情）', '大きなけんか・家族の死・別れ・失業などのあとは、気持ちが落ち着くまで飛びません']])}
${bk.src('米国の AIM 8-1-1・PHAK 第 2 章')}
<h4>薬は「眠くない」で決めない</h4>
<p>薬を使うときは、病気そのものの影響と、薬の作用・副作用を分けて考えます。眠気を感じないことは、安全に飛べる証拠になりません。PHAK は、新しい薬は飲み始めてから少なくとも 48 時間は飛ばずに、副作用がないかを確かめるよう勧めています（PHAK 第 17 章）。眠気などの副作用がある薬は、飲む間隔の長い方の 5 倍の時間をあけてから飛びます。5〜6 時間ごとに飲む薬なら、6 時間の 5 倍で 30 時間です（PHAK 第 17 章）。飛ぶために、自分の判断で薬をやめたり、飲んだことを隠したりしません。</p>
<p>米国の規則（14 CFR 61.53）は、病気や治療と、航空身体検査証明（medical certificate）の関係を決めています。その基準を満たさないと知っているときは、機長（PIC、pilot in command）にも、必要な乗員にもなれません。迷ったら、飛ぶ前に航空身体検査医に相談します。</p>
<h4>IMSAFE の使い方</h4>
<p>6 つの文字を唱えるだけでは、飛んでよい証明になりません。項目ごとに、症状・飲んだ薬と時刻・睡眠・気になる出来事を、具体的に思い出します。条件が重なるときは、重なった影響を考えます。たとえば、眠りの浅い日に、慣れない空港への訓練が重なるときです。気になることがあれば教官に伝え、相談・休養・延期から選びます。</p>
<p>点検の結果を、出発したい気持ちに合わせて書き換えません。航空身体検査証明が有効なことと、今日飛べる状態であることは、別に確かめます。飛んでいる間も体調は変わるので、着陸のあとに次の訓練への影響もふり返ります。</p>
${bk.key('飛ぶ前に IMSAFE：病気・薬・ストレス・飲酒・疲労・感情', '飲酒は米国の規則で 8 時間・0.04。米国の AIM は 12〜24 時間あけるよう勧める', '新しい薬は、飲み始めて 48 時間は飛ばずに様子を見る', '具合が悪いと言うのは、悪いことではない。教官に伝える')}
${bk.warn('<b>ここに注意：</b>薬と体調の最後の判断は、航空身体検査医と規則が決めます。IMSAFE は自分で気づくための型で、診断ではありません。')}
${bk.jur('alcohol', 'medical')}
${bk.jp('<p>日本では、国土交通省航空局の「航空機乗組員の使用する医薬品の取扱いに関する指針」が、医薬品を 4 つに分けています。A は、航空業務に当たり安全と考えられるものです。B は、指定航空身体検査医か乗員健康管理医の個別の確認が要るものです。C は国土交通大臣の判定が要るもの、D は航空業務に適さないものです。市販薬にも区分があるので、自分で決めずに確かめます。</p>')}
${bk.q('前の晩 21 時までビールを 2 本飲んだ。翌朝 6 時に飛んでよい？', '<b>この朝は飛びません。</b>21 時から 6 時までは 9 時間で、米国の規則の 8 時間（14 CFR 91.17）はぎりぎり過ぎます。でも米国の AIM は、8 時間たっても影響が残ることがあるとして、12〜24 時間あけるよう勧めています。9 時間は、その 12 時間に足りません。教官に伝えて、予定を変えます。')}` },
      // ------------------------------------------------------------------ 2 (new)
      { id: 'hf.fatigue', t: '疲労・睡眠・時差・ストレス・暑さと寒さ', scope: 'common', from: ['kiso10.10', 'kiso10.11'], jcab: ['ppl.3.3.2.5', 'cpl.3.3.2.5'], faa: ['PA.I.H.K1'], h: () => `
${bk.aim('疲れとストレスは、自分では気づきにくいまま判断を落とします。どんな条件で疲れが重なるかを知り、休む・延ばす・やめるを早く選べるようにします。')}
${FIG.fatigueFactors()}
<p>疲労（fatigue）は、睡眠の不足、長く起きていること、体と心の負担で、能力が落ちた状態です。注意と反応だけでなく、記憶・操作の調整・判断も落ちます。米国の AIM は、疲れは大きな間違いをするまで自分では気づきにくい、と書いています。</p>
<p>疲労には 2 つあります。急性の疲労は、強い運動・緊張・睡眠不足のあとの、ふつうの疲れです。休養と睡眠で治ります。慢性の疲労は、回復しきらないうちに次の疲れが重なった状態です。判断が落ち、余計な危険をとるようになり、治すには長い休養が要ります。</p>
${bk.src('米国の AIM 8-1-1・PHAK 第 17 章')}
<p>急性の疲労があるときは、飛びません。操縦席で疲れが出たら、訓練や経験では補えません。疲れを防ぐ方法は、十分に休むことだけです（PHAK 第 17 章）。眠気をコーヒーや気合いで抑えても、睡眠の不足は消えません。前の晩に眠れなかったときは、予定の難しさと長さに照らし、休養か延期を選びます。</p>
<h4>体内時計と時差</h4>
<p>人の体には、およそ 1 日の周期で眠気と目覚めをくり返す体内時計（概日リズム、circadian rhythm）があります。体内時計の時刻を合わせるいちばん分かりやすい手がかりは、目に入る日の光です。時差のある所へ速く移ると、体内時計と現地の時刻がずれます。これが時差ぼけ（jet lag）で、眠気・昼の注意の低下・疲れ・眠れない・頭痛などが出ます。</p>
<p>日本からロンドン、ロンドンからフロリダへは、どちらも西へ向かう移動です。FAA の資料は、時差ぼけは東へ向かうときの方が重いとしています。日本へ帰るときは、東へ向かうので重くなります。時差の数は${bk.see('basics.time', '時刻と方位')}で確かめます。</p>
<ul><li>出発の数日前から、寝る時刻を 1 日 1 時間ずつ行き先に近づけます。</li>
<li>機内で時計を行き先の時刻に合わせ、行き先が夜なら眠り、昼なら起きています。</li>
<li>着いたら日の光を浴び、昼寝をせずに体を動かし、現地の時刻で食事と睡眠をとります。</li>
<li>水を十分に飲み、機内ではアルコールとカフェインを控えます。</li></ul>
${bk.src('FAA の資料 Circadian Rhythm Disruption and Aviation')}
<h4>ストレスと作業の負荷</h4>
<p>ストレス（stress）は、体と心にかかる求めに対する体の反応です。騒音・振動・疲れ・難しい作業・家や仕事の心配が、ストレスのもとになります。すぐに来る急性のストレスと、長く続く慢性のストレスがあります。慢性のストレスが対処できる力を超えると、能力は急に落ちます。その状態では飛ばず、医師に相談します（PHAK 第 17 章）。</p>
<p>作業の負荷（workload）は、その時に処理する作業の量と難しさです。負荷が高いと、1 つのことに注意がかたより、ほかを見落とします。いっぱいになったら、止まって考え、速さを落とし、順番を決めます（PHAK 第 2 章）。操縦を保つ作業を先にし、待てる入力や話は後に回します。難しい作業が重なる場面は、地上で予想して準備しておきます。</p>
<h4>暑さ・脱水と寒さ</h4>
<p>フロリダの夏の操縦席や駐機場は暑く、知らないうちに水分が抜けます。脱水の最初のしるしは疲れで、頭痛・けいれん・眠気・めまいも出ます。のどが渇くのは、体重の約 2% の水分を失ってからで、それでは遅すぎます。のどが渇く前に、こまめに水を飲みます。コーヒー・お茶・アルコールは、水分を体の外へ出す方に働きます。</p>
<p>熱中症（heatstroke）は、体が温度を調節できなくなった状態で、倒れるまで気づかない例もあります。明るい色の通気のよい服と帽子、操縦席の換気で防ぎます。</p>
${bk.src('PHAK 第 17 章')}
<p>寒さも負担になります。寒いと、手足の血の流れが減ります（PHAK 第 17 章）。ひどい暑さや寒さ・熱・不安は、体が使う酸素を増やし、低酸素症（hypoxia）になりやすくします（米国の AIM 8-1-2）。冬の朝の外部点検（preflight inspection）は、防寒をして時間に余裕をとります。</p>
${bk.judge('前の晩の睡眠・起きている時間・時差を、予定の難しさと長さに照らしたか', '飛行中に疲れを感じたら、早く伝え、負荷を下げ、予定を短くする', '休んでも治らない疲れや眠りの問題は、医師に相談する')}
${bk.key('眠気を感じないことは、疲れていない証拠ではない', '疲れを直すのは睡眠と休養。コーヒーや気合いでは直らない', '時差ぼけは東へ向かうほど重い。着いた日は日の光と現地の時刻で過ごす', 'のどが渇く前に水を飲む。渇いたときにはもう脱水')}
${bk.warn('<b>よくある間違い：</b>「短い訓練だから大丈夫」と考えることです。帰ってくるころに疲れが強くなることまで考えます。')}
${bk.q('日本を出て 2 日後、フロリダで朝 7 時から初めての飛行。前の晩は 4 時間しか眠れなかった。どうする？', '教官に伝えて、予定を変えます。睡眠の不足と時差の疲れが重なっています。眠気を感じなくても、注意と判断は落ちています（PHAK 第 17 章）。休養をとり、体内時計が現地に合ってから、難しい課目を入れます。')}` },
      // ------------------------------------------------------------------ 3
      { id: 'hf.body', t: '空間識失調と錯覚', scope: 'common', from: ['kiso10.6', 'kiso10.7'], jcab: ['ppl.3.3.2.1', 'ppl.3.3.2.2', 'ppl.3.3.2.3', 'ppl.3.3.2.4', 'cpl.3.3.2.1', 'cpl.3.3.2.2', 'cpl.3.3.2.3', 'cpl.3.3.2.4', 'ir.8.2.1', 'ir.8.2.2', 'ir.8.2.3', 'ir.8.2.4'], faa: ['PA.I.H.K1', 'PA.VIII.E.K1', 'PA.XI.A.K8'], h: () => `
${bk.aim('外が見えないと、体の感覚はうそをつきます。なぜだまされるのかを知り、感覚でなく計器で飛ぶ理由を理解します。')}
${FIG.vestibular()}
<p>体は、<b>目</b>・<b>耳の奥の前庭器官</b>・<b>筋肉や皮膚の感覚</b>の 3 つで、自分の姿勢と動きを知ります（PHAK 第 17 章）。外が見えているうちは目が勝ちます。雲の中・夜・水平線の見えない海の上では、目が使えず、耳と体の感覚だけになります。</p>
<p>そのとき、自分の姿勢や動きを正しくわからなくなる状態が、<b>空間識失調（spatial disorientation）</b>です。体の感覚と計器が食い違うことで気づきます（PHAK 第 17 章）。防げるのは、外の確かな目標か計器を見ることだけです。計器も故障するので、1 つの計器だけをうのみにせず、計器どうしを比べて確かめます（${bk.see('sys.compass', 'コンパスと予備の計器')}）。</p>
${bk.src('米国の AIM 8-1-5・PHAK 第 17 章')}
<p>前庭器官の<b>三半規管</b>は、液で満ちた輪です。回転が始まると液が遅れて動き、毛が倒れて「回っている」と感じます。でも同じ速さで回り続けると、液が追いついて毛が戻り、「止まっている」と感じます。回り方の変わり方（角加速度）が小さいと、感じることができません。PHAK 第 17 章は、そのしきい値を「毎秒 2° 以下」と書いています。</p>
${bk.t(['錯覚', '起きること'], [
  ['リーンズ（the leans）', 'ゆっくり傾いたのに気づかず、<b>急に</b>翼を水平に戻すと、反対に傾いていると感じる。もとの傾きに戻してしまう'],
  ['墓場のスパイラル（graveyard spiral）', '長い旋回で回っている感じが消え、翼が水平なまま降りていると感じる。高度が下がるのを見て操縦輪を引くと、旋回がきつくなり、さらに降りる'],
  ['コリオリ錯覚（Coriolis illusion）', '長い旋回の途中で頭を大きく動かすと、まったく違う軸のまわりに回っていると感じる。いちばん強い錯覚。旋回中は頭を急に動かさない'],
  ['墓場のスピン（graveyard spin）', 'スピンから正しく回復しても、回転が止まったのを「反対へ回り始めた」と感じる。それを直そうとして、もとのスピンに戻してしまう'],
  ['体性重力錯覚（somatogravic illusion）', '離陸（takeoff）の強い加速で、機首が上がりすぎていると感じて機首を下げてしまう。急な減速では逆'],
  ['逆転錯覚（inversion illusion）', '上昇から急に水平飛行に移ると、後ろへ倒れていくように感じる。機首を急に下げてしまい、錯覚がさらに強まる'],
  ['エレベーター錯覚（elevator illusion）', '上昇気流で急に持ち上げられると、上昇していると感じて機首を下げてしまう。下降気流では逆に機首を上げてしまう'],
  ['にせの水平線（false horizon）', '傾いた雲や、地上の灯と星が混じった夜の景色を、水平線とまちがえる'],
  ['自動運動（autokinesis）', '暗い中で 1 つの灯をじっと見ていると、動いて見える']])}
${bk.src('米国の AIM 8-1-5')}
<p>着陸の進入でも、目がだまされます。<b>細い滑走路・上り坂の滑走路・水の上や暗い地域（目印のない地面）・風防の雨</b>は「高い」と感じさせ、低すぎる進入になりがちです。夜、明かりのない地域や海の上から進入するときのこの錯覚を、<b>ブラックホール錯覚</b>ともいいます。PHAK と米国の AIM はこれを featureless terrain illusion と呼び、PHAK は black hole approach とも呼ばれると書いています。広い滑走路・下り坂・明るい進入灯は、その逆です。</p>
<p>初めての空港は、滑走路の幅と傾き・まわりの地形と灯火を、前もって調べます。進入中は、見た目に合わせて経路を変えず、PAPI などの進入角の灯火と高度計（altimeter）で確かめます。安定した進入を保てないときは、着陸復行（ゴーアラウンド、go-around）を選びます。</p>
${bk.src('米国の AIM 8-1-5・PHAK 第 17 章')}
<p>いちばんの予防は、雲に入らないことです。有視界飛行方式（VFR：visual flight rules）で飛ぶ訓練中の人は、計器だけで長く飛べません。計器で飛ぶ訓練を受けていない操縦士は、計器だけに頼るようになってから約 10 分で機体の操縦を失う、と事故の統計は示しています（AFH 第 18 章）。天気で予定の高度を保てなくなったら、雲に入る前に早めに 180° 旋回し、天気のよい空港へ降りる判断をします（PHAK 第 17 章）。</p>
<p>それでも VFR で雲に入ってしまったら、緊急事態です。FAA の飛行機操縦ハンドブック（AFH）第 18 章は、状況を認める → 計器で操縦を保つ → 助けを得る、の順を教えます。最初にすることは、姿勢指示器（水平儀、attitude indicator）を見て翼を水平に保つことだけです。自動操縦装置（オートパイロット、autopilot）があれば使います。旋回はバンク 10° 以下、上昇は姿勢指示器の 1 目盛りまでにし、上昇と旋回を同時にしません（AFH 第 18 章）。近くに山や高い障害物があれば、まずそこから離れます。</p>
<p>AFH は、旋回する向きまでは決めていません。この本では、来た方が確実に晴れていて地形が許すときは、浅いバンクで 180° 旋回して雲から出ることを、1 つの手として教えます。管制に伝えて、助けを求めます。管制に急がされても、急な操作はしません（AFH 第 18 章）。</p>
${bk.key('外が見えないときは、体の感覚で操作しない。計器で飛ぶ', '旋回中に頭を急に動かさない。急に翼を水平に戻すと、逆に傾いた感じがする', 'VFR で雲に入らない（{ch:wx}）。入ってしまったら、まず計器で翼を水平に保ち、地形から離れる', '雲の中の 180° 旋回は浅く（10° 以下）、来た方が確実に晴れて地形が許すときだけ。管制に助けを求める')}
${bk.q('夜、暗い海の上から、ふだんより細い滑走路へ進入する。どんな錯覚に気をつける？', '水の上の暗い地域と細い滑走路は、どちらも「高い」と感じさせるので、低すぎる進入になりがちです（米国の AIM 8-1-5）。PAPI と高度計で進入角を確かめ、安定しなければ着陸復行を選びます。')}
${bk.sim('計器だけで異常な姿勢から回復します。', ['i2', '異常姿勢からの回復'])}` },
      // ------------------------------------------------------------------ 4 (new)
      { id: 'hf.motion', t: '動揺病・加速度（G）・聴覚・急な体調の変化', scope: 'common', from: ['kiso10.8', 'kiso10.14'], jcab: ['ppl.3.3.1.5', 'ppl.3.3.1.7', 'ppl.3.3.2.5', 'cpl.3.3.1.5', 'cpl.3.3.1.7', 'cpl.3.3.2.5', 'ir.8.2.5'], faa: ['PA.I.H.K1'], h: () => `
${bk.aim('飛行機の揺れ・G・騒音は、体に負担をかけます。気分が悪くなったときや、飛行中に急に体調が変わったときに、黙らずに伝えて負荷を下げる判断ができるようにします。')}
${FIG.gLoad()}
<h4>動揺病（飛行機酔い）</h4>
<p>動揺病（motion sickness）は、体の状態について、脳に食い違う知らせが届いて起きます。吐き気・めまい・顔が青くなる・汗・嘔吐が出ます。訓練の始めの不安と緊張も、酔いやすくします。多くは、最初の数回のレッスンでおさまります。酔うことは、操縦士としての力とは関係ありません（PHAK 第 17 章）。</p>
<ul><li>酔いやすいことを、先に教官に伝えます。揺れの強い日を避け、短いフライトから始めることもできます。</li>
<li>酔ってきたら、黙らずに伝えます。通気口を開け、外の遠くを見て、頭を大きく動かさないようにします。</li>
<li>酔い止めの薬は、眠気などが出るので、操縦する人には勧められていません。自分の判断で飲みません。</li></ul>
${bk.src('PHAK 第 17 章')}
<h4>加速度（G）</h4>
<p>G は、体にかかる加速度を、地上の重力の何倍かで表したものです。水平旋回の G は、荷重倍数（G、load factor）と同じで、バンクが深いほど大きくなります。引き起こしや急旋回（steep turn）で正の G がかかると、血が足の方へ下がります。脳と目への血が減り、視野が狭くなり、灰色に見え（グレーアウト）、見えなくなり（ブラックアウト）、意識を失います。急に機首を押す負の G では、血が頭の方へ上がり、頭痛やレッドアウトが起きます。</p>
${bk.src('米国の AIM 8-1-7')}
<p>G に耐える力は、人と日によって変わります。飲酒・疲れ・脱水で弱くなります。急旋回や、不良姿勢（異常姿勢、unusual attitude）からの回復でも、思いがけない大きな G がかかります。視野が狭くなってきたら、引く力をゆるめて G を減らします。引き続けると、すぐに意識を失います。</p>
${bk.src('FAA の資料 Acceleration in Aviation: G-Force')}
<h4>聴覚と騒音</h4>
<p>耳は、目の次に大事な情報を運ぶ感覚です。小型機の操縦席の騒音は、70〜90 dB です。90 dB を超える音に長く毎日さらされると、聴力が少しずつ落ちます。初めは会話の音より高い 4,000 Hz のあたりから落ちるので、自分では気づきにくいのです。騒音は気を散らし、疲れと間違いを増やします。ヘッドセットや耳栓で耳を守ると、雑音が減り、交信の声もかえって聞き取りやすくなります。</p>
${bk.src('FAA の資料 Hearing and Noise in Aviation')}
<h4>飛行中の急な体調の変化</h4>
<p>出発前に問題がなくても、飛んでいる間に、気圧・酸素・揺れ・暑さ・作業の負荷が変わります。頭痛・吐き気・注意の低下が出たら、原因が決まるのを待たずに伝えます。いつ始まったか、何を感じるか、今どの作業が難しいかを言います。教官と操縦の分担をはっきりさせ、負荷を下げる・課目をやめる・早めに着陸する、から選びます。</p>
<p>急に操縦を続けられなくなることを、インキャパシテーション（incapacitation）といいます。気を失うようなはっきりした形だけではありません。返事が遅い、いつもと違う、と感じたら、声をかけて確かめます。着陸後は、症状と経過・機体の状態・したことを記録し、医師の診察や整備につなげます。少し休んで気分がよくなっても、すぐに次の飛行に戻りません。</p>
${bk.key('酔ったら黙らずに伝える。通気口・遠くを見る・頭を動かさない', '正の G はまず目に出る。視野が狭くなったら、引く力をゆるめる', '耳は守る。ヘッドセットで雑音を減らすと、交信も聞きやすい', '具合が悪くなったら、原因を待たずに伝え、負荷を下げる')}
${bk.recall('水平旋回の荷重倍数は 1 ÷ cos（バンク角）で、60° では 2 です。', ['aero.turn', '旋回と荷重倍数'])}
${bk.q('旋回練習の途中で、だんだん気分が悪くなってきた。教官に迷惑をかけたくない。どうする？', 'すぐに教官に伝えます。黙っていると、教官は負荷を下げたり、早めに帰ったりする判断ができません。通気口を開け、外の遠くを見て、頭を大きく動かさないようにします（PHAK 第 17 章）。')}` },
      // ------------------------------------------------------------------ 5
      { id: 'hf.altitude', t: '高度と体：低酸素・一酸化炭素・耳・ダイビング', scope: 'common', from: ['kiso10.2', 'kiso10.3', 'kiso10.4', 'kiso10.9'], jcab: ['ppl.3.3.1.1', 'ppl.3.3.1.2', 'ppl.3.3.1.3', 'ppl.3.3.1.4', 'cpl.3.3.1.1', 'cpl.3.3.1.2', 'cpl.3.3.1.3', 'cpl.3.3.1.4', 'ir.8.1'], faa: ['PA.I.H.K1'], h: () => `
${bk.aim('高く上がると、気づかないうちに頭の働きが落ちます。酸素の決まりと、高度や機内の空気が体に与える影響を知り、決まった対処ができるようにします。')}
${FIG.hypoxiaAltitudes()}
<p><b>低酸素症（hypoxia）</b>は、脳などの体の組織に酸素が足りず、働きが落ちた状態です。空気の中の酸素の割合（約 21%）は、高く上がってもほぼ変わりません。気圧が下がるので、酸素の分圧（空気の圧力のうち酸素が受け持つ分）が下がるのです（米国の AIM 8-1-2）。</p>
${FIG.o2Partial()}
<ul><li>夜の目は、機内の高度 5,000 ft で、もう落ち始めます。健康な人では、ほかの大きな影響はふつう 12,000 ft より下では出ません。</li>
<li>12,000〜15,000 ft では、判断・記憶・注意・計算の力が落ちます。頭痛・眠気・めまいや、変に気分がよくなる多幸感も出ます。</li>
<li>低酸素は、少しずつ進むと、自分では気づきにくいのが怖いところです。症状は人によって違いますが、同じ人ではほぼ毎回同じです。だから、低圧室で自分の症状を一度体験しておくと、気づきやすくなります。FAA は、低圧室を使う生理の訓練を行っています。</li></ul>
${bk.src('米国の AIM 8-1-2・PHAK 第 17 章')}
${bk.photo('ch10-photo2')}
<ul><li>上の図の「対処できなくなるまでの時間」は米国の AIM 8-1-2 の値で、20,000 ft では 5〜12 分です。PHAK の有効意識時間（time of useful consciousness）の表（図 17-1）は、20,000 ft を「30 分以上」としていて、値が違います。どちらも目安で、人と状況で変わります。</li>
<li>PHAK は、1 オンス（約 30 mL）のアルコールで、体が感じる高度が約 2,000 ft 上がるとしています（PHAK 第 17 章）。</li></ul>
<p>低酸素症には、原因によって 4 つの種類があります（PHAK 第 17 章）。</p>
${bk.t(['種類', '原因'], [
  ['低酸素性（hypoxic hypoxia）', '高度で、吸える酸素が減る'],
  ['貧血性（hypemic hypoxia）', '血液が酸素を運べない。一酸化炭素や貧血'],
  ['停滞性（stagnant hypoxia）', '血の流れが悪い。強い G や寒さ'],
  ['組織毒性（histotoxic hypoxia）', '体が酸素を使えない。アルコールや薬']])}
${bk.t(['機内の気圧高度（pressure altitude）', '決まり・すすめ'], [
  ['5,000 ft を超える（夜）', '米国の AIM：夜は酸素を使うとよい'],
  ['10,000 ft を超える（昼）', '米国の AIM：昼も酸素を使うとよい'],
  ['12,500 ft を超え 14,000 ft まで', '米国の規則：その高さで 30 分を超える分は、乗員が酸素を使う（14 CFR 91.211）'],
  ['14,000 ft を超える', '米国の規則：乗員は、その高さにいる間ずっと酸素を使う'],
  ['15,000 ft を超える', '米国の規則：乗っている全員に酸素を用意する']])}
<h4>息が速くなりすぎたら</h4>
<p>過呼吸（hyperventilation）は、緊張して知らないうちに速く深く息をし、体の二酸化炭素が減りすぎることです。頭がふらふらし、手足がしびれ、さらに息が速くなります。過呼吸と低酸素症は、初めの症状が似ていて、同時に起きることもあります。だから自分で決めつけず、操縦を保って教官に伝えます。</p>
<p>酸素を使っているときは、まず酸素を 100% にし、装置が働いているかを確かめます。それから、息の速さと深さを意識してゆっくりにすると、数分でおさまります（米国の AIM 8-1-3）。声を出して話すのも、呼吸を整える助けになります（PHAK 第 17 章）。</p>
<h4>一酸化炭素</h4>
<p>一酸化炭素中毒（carbon monoxide poisoning）は、排気に含まれる一酸化炭素で、血液が酸素を運べなくなることです。一酸化炭素は色もにおいも味もなく、酸素の約 200 倍ヘモグロビンにつきやすい気体です（PHAK 第 17 章）。体から抜けるまでに、最大で 48 時間かかります（PHAK 第 17 章）。小型機の暖房は排気管の周りで空気を温めるので、排気管にひびがあると機内に入ります（米国の AIM 8-1-4）。</p>
<p>暖房を使っていて、排気のにおいや頭痛・眠気・めまいを感じたら、<b>すぐに暖房を切り、通気口を開けます</b>（米国の AIM 8-1-4）。FAA の資料は、できるだけ早く着陸し、管制に伝えて、近くの空港への誘導を頼むことも勧めています。においがしないことは、一酸化炭素がない証拠ではありません。ふつうの 2 波長のパルスオキシメーターは、一酸化炭素があると正しい値を示しません（米国の CDC）。</p>
${bk.photo('ch10-photo4')}
<p>一酸化炭素の検知器を積む機体もあります。検知器があっても、暖房と排気系を整備しておくことが、予防の基本です（FAA の資料 Carbon Monoxide）。</p>
<h4>耳と副鼻腔</h4>
<p>降下のときは、つばを飲む・あくびをする・鼻をつまんで口を閉じ、軽く息を押し出す（バルサルバ法）ことで、耳の中の圧力を合わせます（米国の AIM 8-1-2）。かぜや鼻のアレルギーがあると、耳管がふさがって合わせられません。強い痛みと聞こえにくさが出て、鼓膜が破れる例もあります（米国の AIM 8-1-2）。</p>
<p>予防は、かぜや鼻のアレルギーがあるときに飛ばないことです（米国の AIM 8-1-2・PHAK 第 17 章）。かぜのときは飛ばず、教官に伝えます。治りかけで飛ぶか迷うときは、医師に相談します。飲む鼻づまりの薬は、副作用で操縦の力を落とします（米国の AIM 8-1-2）。着陸のあとも耳の痛みが続くときは、医師に診てもらいます。</p>
<h4>高い所の窒素の泡とダイビング</h4>
<p>減圧症（decompression sickness）は、体に溶けている窒素が、気圧が下がって泡になって起きます。いちばん多い症状は関節の痛み（ベンズ）です（PHAK 第 17 章）。ダイビングをしていない健康な人では、18,000 ft より下で起きることはまれです。起きたら酸素を 100% にし、緊急降下をして、できるだけ早く着陸します。降下中に症状が消えても、着陸して診てもらいます（PHAK 第 17 章）。</p>
${bk.src('PHAK 第 17 章・FAA の資料 Altitude-Induced Decompression Sickness')}
<p>ダイビングのあとは、体に入った窒素が抜けるまで待ちます。減圧停止のいらないダイビングのあと、8,000 ft までの飛行は、少なくとも 12 時間あけます。減圧停止をしたダイビングのあとや、8,000 ft を超える飛行は、少なくとも 24 時間あけます（米国の AIM 8-1-2）。この高度は、与圧した機内の高度ではなく、実際の飛行高度（平均海面からの高さ）です。</p>
${bk.key('低酸素は気づきにくい。夜は 5,000 ft、昼は 10,000 ft を超えたら酸素がすすめ', '酸素を使っていて具合が悪くなったら、まず酸素を 100% にして装置を確かめる', '暖房中の頭痛・眠気・排気のにおい → 暖房を切り、通気口を開ける', 'かぜのときは飛ばない。ダイビングのあとは 12〜24 時間あける')}
${bk.jur('oxygen')}
${bk.q('冬の朝、暖房を入れて 20 分ほど飛んでいたら、頭が痛く、眠くなってきた。まず何をする？', '一酸化炭素を疑い、すぐに暖房を切って通気口を開けます（米国の AIM 8-1-4）。教官や管制に伝え、近くの空港に降りることも考えます。症状が続けば、着陸後に医師に診てもらいます。')}` },
      // ------------------------------------------------------------------ 6
      { id: 'hf.vision', t: '見ること：見張りと夜の目', scope: 'common', from: ['kiso10.5'], jcab: ['ppl.3.3.1.6', 'cpl.3.3.1.6'], faa: ['PA.I.H.K1', 'PA.XI.A.K1'], h: () => `
${bk.aim('ほかの機を見つけるための目の使い方と、夜の目の守り方を覚えます。')}
${FIG.nightEye()}
<p>目は一度に広い範囲（約 200°）を見られますが、はっきり見えるのは、まん中の小さな部分（中心窩）だけです。中心で見れば 7 マイル先で見つけられる機も、中心を外れると 0.7 マイルまで近づかないと気づけません。</p>
${bk.src('米国の AIM 8-1-6')}
<ul><li><b>見張り（see and avoid）のしかた</b>：空を区切って、<b>1 回の目の動きは 10° 以内</b>、それぞれの所を<b>少なくとも 1 秒</b>見ます。計器を見る時間は、外を見る時間の 1/4〜1/3 まで（外を 16 秒見るごとに、計器は 4〜5 秒まで）にします。</li>
<li>雲の上やもやの中で、外に見るものがないと、目は 3〜9 m（10〜30 ft）くらいに焦点を合わせてしまい、「見ているのに見えない」状態になります。英語では empty-field myopia といいます。</li>
<li><b>ぶつかる相手は、止まって見えます</b>。窓の中で同じ所にいて、だんだん大きくなる機は、衝突のコースです。すぐに避けます。</li>
<li>衝突は、天気のよい日に、空港の近くや航空路の VOR の近くで多く起きています。</li></ul>
${bk.src('米国の AIM 8-1-6・8-1-8')}
<h4>夜の目</h4>
<p>目には、明るい所で色と細かい所を見る錐体と、弱い光に強い桿体があります。錐体は中心窩に集まり、桿体はその周りに多くあります。暗い所では中心の感度が下がり、真ん中に見えにくい所（夜の盲点）ができます。夜は、見たい物の 5〜10° 横を見ます。横を見たまま 2〜3 秒より長く見続けると像が消えるので、少しずつ視線を動かします（PHAK 第 17 章）。</p>
<p>暗さに目が慣れることを、<b>暗順応（dark adaptation）</b>といいます。暗順応には、真っ暗な所で少なくとも 30 分かかります。暗い赤い灯の下なら、20 分である程度まで慣れます。ただし赤い灯は、航空図の色をひどくゆがめます。赤い灯は外の夜の目がいちばん要るときだけにし、地図や計器を読む白い灯も用意します。明るい光を見ると数秒で元に戻るので、灯を使うときは片目を閉じます。5,000 ft を超える機内の高度・一酸化炭素・たばこも、夜の目を悪くします。</p>
${bk.src('米国の AIM 8-1-6')}
${bk.photo('nightFlorida')}
<p>暗い所から明るい所へ出たときは、錐体がすぐに慣れます（明順応）（PHAK 第 17 章）。強いまぶしさには、目に入る光の 85% 以上をさえぎり、色を同じようにさえぎるサングラスを使います（米国の AIM 8-1-6）。</p>
<p>後方乱気流（wake turbulence）は、前を飛ぶ飛行機の翼端渦（wingtip vortices）です。重く、脚とフラップ（flaps）を上げた形態で、遅い飛行機ほど強くなります。渦は下へ沈み、風で横へ流されます。大きな飛行機の後ろでは、その飛行機の経路と同じ高さか、上を飛びます。着陸は大きな飛行機の接地点より先に、離陸は大きな飛行機が浮いた点より手前で浮きます。</p>
${bk.src('米国の AIM 7-4')}
${bk.key('見張りは 10° ずつ、1 か所 1 秒。外を長く、計器は短く', '止まって見えて大きくなる機は、衝突のコース', '夜の目は 30 分で慣れ、明るい光で数秒で戻る。暗い所では 5〜10° 横を見る')}
${bk.jur('lookout')}
${bk.q('前の窓の右側に、ずっと同じ位置に見える小さな機がいて、少しずつ大きくなってきた。どうする？', '衝突のコースです（米国の AIM 8-1-8）。すぐに避けます。避けたあとも相手を見続け、ほかの機がいないか見張りを再開します。')}` },
      // ------------------------------------------------------------------ 7
      { id: 'hf.adm', t: '危険の評価と判断（3P・PAVE・CARE・TEAM・DECIDE）', scope: 'common', from: ['kiso10.20'], jcab: ['ppl.3.3.3.3', 'cpl.3.3.3.3', 'ir.8.3.3'], faa: ['PA.I.H.K4'], h: () => `
${bk.aim('危険に気づき、評価し、対策をとるまでの考え方の型を覚えます。FAA は、航空事故の約 80% に人の要因が関わるとしています（PHAK 第 2 章）。')}
${FIG.threePLoop()}
<p>FAA が教える意思決定（ADM：Aeronautical Decision-Making）の基本は、<b>3P モデル</b>です。<b>Perceive</b>（危険に気づく）→ <b>Process</b>（どれくらい危ないか評価する）→ <b>Perform</b>（対策を実行する）の 3 段階です。出発前から飛行中まで、くり返し回します（PHAK 第 2 章）。</p>
${bk.t(['段階', '使う道具', '中身'], [
  ['Perceive（気づく）', '<b>PAVE</b>', 'Pilot（自分：IMSAFE・経験・最近の練習量）・Aircraft（機体：整備・燃料・性能）・enVironment（天気・空港・地形・夜）・External pressures（外からの圧力：予定・人の期待）'],
  ['Process（評価する）', '<b>CARE</b>', 'Consequences（どうなるか）・Alternatives（ほかの道）・Reality（本当の状況）・External factors（外の要因）'],
  ['Perform（実行する）', '<b>TEAM</b>', 'Transfer（人にゆだねる：教官に相談）・Eliminate（危険をなくす）・Accept（受け入れる価値があるか）・Mitigate（危険を減らす）']])}
<p>PAVE の <b>External pressures</b> は、飛行をやりとげたい気持ちを外から作る力です。空港で待つ人・がっかりさせたくない同乗者・腕を見せたい気持ち・「予定どおり行きたい」気持ち（get-there-itis）などです。PHAK は、外からの圧力の扱いを、危険の管理のいちばん大事な鍵としています。ほかの危険をすべて無視させてしまうからです（PHAK 第 2 章）。遅れを受け入れる準備をし、待つ人には遅れるかもしれないと先に伝えておきます。</p>
<p>PAVE は、全部の欄を埋めれば出発できる点検表ではありません。重なった条件の影響を考え、実行できる対策につなげます。法令や機体の制限の代わりにもなりません。飛行中に条件が変われば、選んだ行動が効いているかを確かめ、判断を更新します。</p>
<h4>5P：決める場面を先に決めておく</h4>
<p>1 人で飛ぶときの型に、<b>5P</b> があります。下の 5 つを、決めた場面で見直します（PHAK 第 2 章）。</p>
${bk.t(['5P', '見直すこと'], [['Plan（計画）', '天気・経路・燃料・時間'], ['Plane（機体）', '整備・装備・性能'], ['Pilot（自分）', 'IMSAFE と、今の疲れや腕'], ['Passengers（同乗者）', '同乗者の体調と期待'], ['Programming（設定）', '電子機器・自動操縦の設定']])}
<p>見直す場面は、出発前・離陸の前・飛行の中ほど・降下を始める前・場周経路（トラフィックパターン、traffic pattern）に入る前です。2 時間を超える飛行では、1 時間ごとにも見直します（PHAK 第 2 章）。天気で出発をやめるのにいちばん楽なのは、機体に乗る前です。</p>
<p>もう 1 つの型が <b>DECIDE</b> です。次の 6 段階を、やはり、くり返し回します（PHAK 第 2 章）。</p>
${bk.t(['段階', '中身'], [['Detect', '変化に気づく'], ['Estimate', '対応が必要か見積もる'], ['Choose', '望む結果を選ぶ'], ['Identify', '結果に向けた行動を決める'], ['Do', '実行する'], ['Evaluate', '結果を評価する']])}
${bk.key('3P：気づく（PAVE）→ 評価する（CARE）→ 実行する（TEAM）を、くり返す', '外からの圧力（予定・期待）が、いちばん判断を曲げる', '5P は決めた場面で見直す。2 時間を超える飛行は 1 時間ごと', '迷ったら、より安全な道（引き返す・待つ・やめる）を選ぶ')}
${bk.q('友だちを空港で待たせている。天気が少し悪くなってきた。PAVE のどれに当たる？', 'External pressures（外からの圧力）です。待たせている人がいると、天気（enVironment）の危険を小さく見てしまいます。いったん気づいたら、CARE で評価し、TEAM で「待つ・やめる」も選びます。')}` },
      // ------------------------------------------------------------------ 8
      { id: 'hf.attitude', t: '5 つの危険な態度', scope: 'common', from: ['kiso10.19'], jcab: ['ppl.3.3.3.5', 'cpl.3.3.3.5'], h: () => `
${bk.aim('判断を曲げる 5 つの危険な態度（hazardous attitudes）と、それぞれの「解毒剤」を覚えます。気づいたら、解毒剤を口に出します。')}
${bk.t(['危険な態度', '心の声', '解毒剤（antidote）'], [
  ['反権威（Anti-authority）', '“Don\'t tell me.”（指図するな）', '“Follow the rules. They are usually right.”（規則に従う。規則はたいてい正しい）'],
  ['衝動（Impulsivity）', '“Do it quickly.”（早くやれ）', '“Not so fast. Think first.”（あわてるな。まず考える）'],
  ['不死身（Invulnerability）', '“It won\'t happen to me.”（自分には起きない）', '“It could happen to me.”（自分にも起きる）'],
  ['マッチョ（Macho）', '“I can do it.”（自分ならできる）', '“Taking chances is foolish.”（危険を冒すのは愚か）'],
  ['あきらめ（Resignation）', '“What\'s the use?”（何をしても無駄）', '“I\'m not helpless. I can make a difference.”（自分は無力ではない。変えられる）']])}
<p>英語は PHAK 第 2 章の言葉です。危険な態度は、誰にでもあります。人を型に分けるためではなく、その時の自分の考え方に気づくための手がかりです。気づいたら、その態度の名前を心の中で言い、解毒剤を口に出します（PHAK 第 2 章）。規則が本当にまちがっていると思うときに質問するのは、反権威ではありません。</p>
<p>「前にもできたから今回も大丈夫」と考えたら、今回の天気・機体・体調・腕が前と同じかを、事実で確かめます。うまくいった経験をくり返すと、もともと要った余裕を少しずつ削ってしまいます。結果がよかったことは、判断がよかった証拠ではありません。余裕を失う前にやめる・変えるのも、腕の一部です。訓練のあとは、どんな考えが判断を後押ししたかを教官と話し、次に気づくための手がかりを決めます。</p>
${bk.key('危険な態度は誰にでもある。気づいたら、解毒剤を口に出す', '反権威 → 規則に従う。衝動 → まず考える。不死身 → 自分にも起きる', 'マッチョ → 危険を冒すのは愚か。あきらめ → 自分は無力ではない')}
${bk.q('「前もこの雲の下を飛べたから、今日も大丈夫」と思った。どの危険な態度で、解毒剤は？', '不死身（自分には起きない）です。解毒剤は「自分にも起きる」です（PHAK 第 2 章）。今日の天気・機体・体調・腕が前と同じかを、事実で確かめ直します。')}` },
      // ------------------------------------------------------------------ 9
      { id: 'hf.srm', t: '1 人で操縦するときの資源管理（SRM）とチェックリスト', scope: 'common', from: ['kiso10.24'], jcab: ['ppl.3.3.3.4', 'cpl.3.3.3.4'], faa: ['PA.I.H.K4', 'PA.II.B.K1'], h: () => `
${bk.aim('ひとりで飛ぶときも、使える助けを全部使って判断します。その考え方と、助けの求め方、作業の優先順位を覚えます。')}
<p><b>SRM（1 人で操縦するときの資源管理、single-pilot resource management）</b>は、ひとりで飛ぶときの考え方です。機内と機外の資源を全部使って、安全に飛びます（PHAK 第 2 章）。資源には、管制官・フライトサービス・チェックリスト・POH（機体の手引書、pilot's operating handbook）があります。自動化された装置（G1000 型の表示や自動操縦）・自分の知識・同乗者も資源です。複数の乗員で同じ考え方を使うのが CRM（crew resource management）で、あとの部で学びます。</p>
<ul><li><b>チェックリスト</b>：記憶に頼らず、決まった場面で必ず読みます（声に出す）。</li>
<li><b>作業の優先順位</b>：Aviate（飛ばす）→ Navigate（向かう）→ Communicate（伝える）の順にします。緊急のときも同じです。</li>
<li><b>自動化</b>：使いこなせば負担が減りますが、いま何をしているか（モード）をいつも確かめます。</li>
<li><b>状況認識</b>：自分の位置・高度・燃料・天気・ほかの機を、いつもつかんでおきます。</li>
<li><b>忙しい場面では話さない</b>：PHAK は、同乗者と余計な話をしない時間（sterile flight deck）を勧めています。出発から、最初の高度に上がって空港の空域を出るまでです。到着では、進入の始まりからです（PHAK 第 2 章）。同乗者には、先に頼んでおきます。</li></ul>
<h4>助けの求め方</h4>
<p>助けを求めるときは、今の状況・心配なこと・ほしい助けを、具体的に伝えます。「少し不安です」より、「位置が分からなくなりかけています。確かめる時間がほしい」と言う方が、相手は動けます。分からない指示や、できない条件は、そのままにせず伝えます。管制や教官の助けにも、範囲と時間の限りがあります。</p>
<p>同乗者に手伝いを頼むときは、その人にできることを、先に説明します。経験のある人と飛ぶときも、気づいた危険を黙って抱えません。人の情報や提案を使っても、最後に確かめて決める判断と責任は、機長に残ります。</p>
${bk.key('使える資源は全部使う：管制・チェックリスト・POH・自動化・同乗者', '迷ったら Aviate → Navigate → Communicate', '助けは具体的に頼む。判断と責任は機長に残る')}
${bk.src('PHAK 第 2 章・英国 CAA の CAP 737（Aviate・Navigate・Communicate）')}` },
    ],
    terms: [['IMSAFE', '自分の点検（病気・薬・ストレス・飲酒・疲労・感情）', 'AIM 8-1-1'], ['ADM (Aeronautical Decision-Making)', '意思決定（航空の意思決定）', 'PHAK 第 2 章'], ['3P (Perceive, Process, Perform)', '気づく・評価する・実行する', 'PHAK 第 2 章'], ['PAVE / CARE / TEAM', '危険に気づく・評価する・対策を選ぶための道具', 'PHAK 第 2 章'], ['DECIDE', '変化に対応する判断の 6 段階', 'PHAK 第 2 章'], ['Hazardous attitudes', '危険な態度', 'PHAK 第 2 章'], ['Spatial disorientation', '空間識失調', 'AIM 8-1-5'], ['Semicircular canals', '三半規管', 'PHAK 第 17 章'], ['The leans / Graveyard spiral', 'リーンズ / 墓場のスパイラル', 'AIM 8-1-5'], ['Coriolis / Somatogravic illusion', 'コリオリ錯覚 / 体性重力錯覚', 'AIM 8-1-5'], ['Hypoxia', '低酸素症（4 種類）', 'AIM 8-1-2・PHAK 第 17 章'], ['Hyperventilation', '過呼吸', 'AIM 8-1-3'], ['Carbon monoxide', '一酸化炭素（一酸化炭素中毒）', 'AIM 8-1-4'], ['Dark adaptation', '暗順応（暗さに目が慣れること）', 'AIM 8-1-6'], ['Empty-field myopia', '見る物がないときの焦点の近づき', 'AIM 8-1-6'], ['Get-there-itis', '予定どおり行きたい気持ち', 'PHAK 第 2 章'], ['SRM (Single-Pilot Resource Management)', 'SRM（1 人で操縦するときの資源管理）', 'PHAK 第 2 章'],
      ['Fitness for flight', '飛行への適合性', 'その日、安全に飛べる体と心の状態か'], ['Acute / Chronic fatigue', '急性の疲労 / 慢性の疲労', 'AIM 8-1-1・PHAK 第 17 章'], ['Circadian rhythm / Jet lag', '体内時計（概日リズム）/ 時差ぼけ', 'FAA の資料'], ['Workload', '作業の負荷', 'PHAK 第 2 章'], ['Dehydration / Heatstroke', '脱水 / 熱中症', 'PHAK 第 17 章'], ['Decompression sickness (DCS)', '減圧症', 'PHAK 第 17 章'], ['Motion sickness', '動揺病（飛行機酔い）', 'PHAK 第 17 章'], ['Load factor (G)', '荷重倍数', '水平旋回では 1 ÷ cos（バンク角）'], ['Gray-out / Black-out / Red-out', 'グレーアウト / ブラックアウト / レッドアウト', 'AIM 8-1-7'], ['Incapacitation', 'インキャパシテーション', '急に操縦を続けられなくなること'], ['Night blind spot / Off-center viewing', '夜の盲点 / 少し横を見る見方', 'PHAK 第 17 章'], ['5P (Plan, Plane, Pilot, Passengers, Programming)', '5P', 'PHAK 第 2 章']],
    examples: ['友だちを待たせているので急いで出発したい（外からの圧力・衝動）→ 「あわてるな。まず考える」。天気と燃料を確かめ直す。', '夜、暗い地域の空港へ進入：低く感じにくいので、PAPI と高度計を必ず確かめる。', '日本からフロリダに着いた翌朝の訓練：時差ぼけと睡眠の不足を教官に伝え、難しい課目は体が慣れてからにする。', '旋回練習で酔ってきた：すぐに伝え、通気口を開けて外の遠くを見る。教官は負荷を下げ、早めに帰る。'],
    cautions: ['薬・飲酒・体調の判断は、航空身体検査医（AME）と規則が優先です。', 'この章は要約です。米国の AIM 第 8 章・PHAK 第 2 章と第 17 章・Risk Management Handbook で詳しく学んでください。', 'この教材のシミュレータでは、体の感覚の錯覚・低酸素・G・酔い・疲れは体験できません。実機で教官と、または低圧室などの訓練で学びます。'],
    quiz: [
      { q: '「早くやらなきゃ」という衝動（impulsivity）の解毒剤は？', choices: ['規則に従う', '自分にも起きる', 'あわてるな。まず考える', '自分は無力ではない'], answer: 2, why: 'PHAK 第 2 章：衝動の解毒剤は “Not so fast. Think first.”（5 つの危険な態度の節）。' },
      { q: 'PAVE の E（External pressures）にあたるのは？', choices: ['エンジンの状態', '天気', '予定に間に合わせたい・人に見せたいという圧力', '自分の経験'], answer: 2, why: 'E は外からの圧力。ほかの危険をすべて無視させてしまう要因で、PHAK 第 2 章はその扱いを危険の管理のいちばん大事な鍵とする（危険の評価と判断の節）。' },
      { q: 'ゆっくり傾いたのに気づかず、急に翼を水平に戻すと、反対に傾いたように感じる錯覚は？', choices: ['リーンズ', 'ブラックホール錯覚', '体性重力錯覚', '墓場のスパイラル'], answer: 0, why: '米国の AIM 8-1-5：リーンズ（the leans）。ゆっくりした傾きは三半規管が感じないため。計器で確かめる（空間識失調と錯覚の節）。' },
      { q: '米国の 14 CFR 91.17 の飲酒の決まりとして正しいものは？', choices: ['飲んでから 4 時間あければよい', '飲んでから 8 時間以内と、アルコール濃度 0.04 以上は乗務できない', '0.08 未満ならよい', 'ビール 1 本ならよい'], answer: 1, why: '米国の 14 CFR 91.17：8 時間以内・酔っている間・0.04 以上は乗務できない。米国の AIM は 12〜24 時間あけるよう勧める（自分の体調の節）。' },
      { q: '暖房を入れていたら、頭が痛く眠くなってきた。まずすることは？', choices: ['暖房を強くする', '暖房を切り、通気口を開ける', '高度を上げる', 'そのまま様子を見る'], answer: 1, why: '米国の AIM 8-1-4：一酸化炭素を疑う。すぐに暖房を切り、通気口を開ける（高度と体の節）。' },
      { q: '夜、暗い所で小さな灯を探すときのよい見方は？', choices: ['灯をまっすぐじっと見続ける', '明るい白い灯で計器を照らしたまま外を見る', '赤い灯で航空図を読みながら探す', '見たい物の 5〜10° 横を見て、少しずつ視線を動かす'], answer: 3, why: 'PHAK 第 17 章：暗い所では目の中心の感度が下がり、夜の盲点ができる。5〜10° 横を見て、2〜3 秒より長く見続けない（見ることの節）。' },
      { q: '低酸素症の症状について正しいのは？', choices: ['同じ人では症状がほぼ毎回同じなので、低圧室で自分の症状を知っておくと気づきやすい', '高く上がると空気の中の酸素の割合（約 21%）が減るので起きる', '気分がよくなれば低酸素ではない', '12,000 ft より下では、夜の目にも影響がない'], answer: 0, why: '米国の AIM 8-1-2：症状は 1 人の中では変わらないので、低圧室で体験すると気づきやすい。酸素の割合は変わらず、気圧が下がる。夜の目は 5,000 ft で落ち始め、多幸感も症状の 1 つ（高度と体の節）。' },
      { q: '初めての旋回練習で吐き気がしてきた。正しい対応は？', choices: ['迷惑をかけないよう黙って課目を続ける', '自分の判断で酔い止めの薬を飲んで続ける', '頭を大きく動かして、景色を見回す', '教官に早く伝え、通気口を開けて外の遠くを見る'], answer: 3, why: 'PHAK 第 17 章：酔いやすいことは教官に伝える。通気口を開け、外を見て、余計に頭を動かさない。酔い止めは眠気が出るので操縦する人には勧めない（動揺病・加速度の節）。' },
      { q: '急な引き起こしや急旋回で強い正の G がかかったとき、最初に出やすいのは？', choices: ['顔に血が上ってレッドアウトになる', '耳が痛くなる', '視野が狭くなり、灰色に見える（グレーアウト）', '手足がしびれる'], answer: 2, why: '米国の AIM 8-1-7：正の G では血が足の方へ下がり、視野が狭まり、グレーアウト、ブラックアウト、失神と進む。レッドアウトは負の G（動揺病・加速度の節）。' },
    ],
    written: [
      ['航空身体検査証明は有効ですが、仕事の心配で眠りの浅い日が続いています。IMSAFE で何を点検し、その結果をどう出発の判断につなげますか。', `病気・薬・ストレス・飲酒・疲労・感情を、症状や時刻まで具体的に思い出します。唱えるだけで終えず、注意と判断への影響を、予定の飛行の難しさと長さに照らします。証明が有効なことと今日飛べることは別なので、気になることが残れば教官に伝え、休養か延期を選びます。${bk.see('hf.self', '自分の体調：IMSAFE')}`, ['kiso10.q13']],
      ['市販のかぜ薬を飲みました。眠くないので飛んでよいと考えています。病気そのもの、薬の影響、飛んでよいかの確かめ方を分けて説明してください。', `眠気がないことは、安全の証拠になりません。かぜそのものも判断を落とし、耳や副鼻腔の痛みのもとになります。薬は副作用と飲んだ時刻を確かめ、新しい薬は飲み始めて 48 時間は飛ばずに様子を見ます。迷ったら飛ぶ前に航空身体検査医に相談し、自分の判断で薬をやめて飛ぶこともしません。${bk.see('hf.self', '自分の体調：IMSAFE')}`, ['kiso10.q12']],
      ['前の晩はよく眠れませんでしたが、眠気はなく、コーヒーを飲めば予定どおり飛べると思っています。疲れの自覚と能力の関係と、出発前の判断を説明してください。', `眠気を感じなくても、睡眠の不足は注意・反応・記憶・判断を落とします。コーヒーでは睡眠の不足は直りません。最近の睡眠・時差・予定の難しさと長さを合わせて考え、休養や延期を選びます。${bk.see('hf.fatigue', '疲労・睡眠・時差')}`, ['kiso10.q10']],
      ['到着が遅れ、交信と計器の設定が重なって、いつもの確認を忘れました。ストレスと作業の負荷が注意に与える影響と、負荷を下げる方法を説明してください。', `負荷が高いと注意が 1 つのことにかたより、ほかの確認が抜けます。すべてを一度に片づけようとせず、止まって考え、速さを落とし、順番を決めます。操縦を保つ作業を先にし、待てる入力や話は後に回し、早めに助けや時間の余裕を求めます。${bk.see('hf.fatigue', 'ストレスと作業の負荷')}`, ['kiso10.q11']],
      ['高く上がっても空気の中の酸素の割合はあまり変わらないので、酸素は足りなくならない、という説明を聞きました。酸素の分圧と体への影響を使って、この説明を正してください。', `割合が約 21% のままでも、気圧が下がると酸素の分圧が下がり、体に入る酸素が減ります。低酸素症では判断や夜の目が落ち、少しずつ進むと自分では気づきにくくなります。酸素を使う高度と装置の使い方を、出発前に確かめます。${bk.see('hf.altitude', '高度と体')}`, ['kiso10.q2']],
      ['緊張して息が速くなり、手のしびれとめまいを感じました。過呼吸と決めつけてよいですか。原因の考え方と、安全のための行動を分けて説明してください。', `過呼吸は息のしすぎで体の二酸化炭素が減って起きますが、低酸素症と症状が似ているので、自分で決めつけません。操縦を保ち、教官に伝えます。酸素を使っているなら、まず酸素を 100% にして装置を確かめ、それから息の速さと深さを意識してゆっくりにします。${bk.see('hf.altitude', '高度と体：過呼吸')}`, ['kiso10.q3']],
      ['かぜで鼻がつまっていますが、地上では耳は痛くありません。短い訓練なら飛んでよいですか。上昇・降下の気圧の変化と、出発前にすることを説明してください。', `鼻がつまっていると耳管や副鼻腔の通りが悪く、とくに降下で圧力を合わせられず、強い痛みや聞こえにくさが出ます。短い訓練でも同じです。かぜのときは飛ばず、教官に伝えます。迷うときは医師に相談します。${bk.see('hf.altitude', '高度と体：耳と副鼻腔')}`, ['kiso10.q4']],
      ['暖房を使っていたら、頭痛とだるさが出てきました。排気のにおいはしません。一酸化炭素ではないと言えますか。体への作用と、判断で気をつけることを説明してください。', `言えません。一酸化炭素は色もにおいもなく、血液が酸素を運ぶのを妨げます。すぐに暖房を切って通気口を開け、教官や管制に伝えて、早めの着陸を考えます。ふつうのパルスオキシメーターの値は、一酸化炭素のときは当てになりません。${bk.see('hf.altitude', '高度と体：一酸化炭素')}`, ['kiso10.q9']],
      ['外の水平線が見えにくく、体は傾いていると感じるのに、姿勢指示器は水平を示しています。感覚の強さで姿勢を直してよいですか。錯覚のしくみと確かめ方を説明してください。', `直しません。体は目・耳の奥・筋肉や皮膚の感覚を合わせて姿勢を推し量りますが、外が見えないとだまされます。感覚が強いことは、正しさの根拠になりません。計器どうしを比べて確かめ、計器で操縦を保ち、助けを求めます。計器で飛ぶ資格と条件がないのに、雲に入るような飛び方をしないことが先です。${bk.see('hf.body', '空間識失調と錯覚')}`, ['kiso10.q6']],
      ['初めての滑走路へ進入すると、いつもと同じ高さのつもりでも見え方が違います。滑走路の形やまわりが高さの感じ方に与える影響と、見た目を補う確かめ方を説明してください。', `細い滑走路・上り坂・暗い地面や水の上は「高い」と感じさせ、低すぎる進入になりがちです。広い滑走路や下り坂は逆です。前もって滑走路の幅と傾きを調べ、進入角の灯火と高度計で確かめ、安定しなければ着陸復行を選びます。${bk.see('hf.body', '空間識失調と錯覚：進入の錯覚')}`, ['kiso10.q7']],
      ['訓練中に吐き気がしましたが、迷惑をかけたくないので黙っていました。動揺病が操縦と学習に与える影響と、訓練の前後に相談することを説明してください。', `吐き気が強いと、外を見ること・計器の確認・説明を聞く余裕が減ります。黙っていると、教官が負荷を下げたり訓練を早めに切り上げたりできません。酔いやすいことと当日の調子を先に伝え、短いフライトから慣らします。酔い止めは自分の判断で飲みません。${bk.see('hf.motion', '動揺病・加速度・聴覚')}`, ['kiso10.q8']],
      ['出発のときは問題がなかったのに、訓練の途中で頭痛と集中の低下に気づきました。予定の課目を終えることを優先してよいですか。伝えることと、続けるかの判断を説明してください。', `よくありません。出発前の点検は、そのあとも体調が変わらない保証ではありません。操縦を保ち、症状・始まった時刻・今できないことを早めに伝えます。原因が分かるのを待たずに、負荷を下げる・課目をやめる・早めに着陸することを相談し、着陸後に記録して診てもらいます。${bk.see('hf.motion', '飛行中の急な体調の変化')}`, ['kiso10.q14']],
      ['夜の準備で明るい画面を見続けたあと、外を見ると暗い目標が見えにくくなりました。暗順応と目のしくみを説明し、照明と見張りで気をつけることを挙げてください。', `暗さに目が慣れるには時間がかかり（真っ暗で少なくとも 30 分）、明るい光を見ると数秒で戻ります。暗い所では目の中心の感度が下がるので、見たい物の少し横を見ます。計器や地図が読める範囲で照明を暗くし、明るい光を見るときは片目を閉じ、区切って視線を動かして外を見ます。${bk.see('hf.vision', '見ること：夜の目')}`, ['kiso10.q5']],
      ['自分も機体も問題ありませんが、天気が悪くなりそうで、同乗者は早く着きたがっています。PAVE で条件を整理し、出発の判断につなげてください。', `Pilot（自分）・Aircraft（機体）・enVironment（天気など）・External pressures（外からの圧力）の 4 つを見ます。自分と機体がよくても、天気と予定の圧力は消えません。重なった影響と、待つ・延ばす・別の交通手段などの代わりの案を比べ、対策をしても心配が残るなら延期かやめるを選びます。${bk.see('hf.adm', '危険の評価と判断')}`, ['kiso10.q20']],
      ['前も同じ条件でうまくいったので、今回も自分なら大丈夫だと思いました。この考えが確認を妨げる理由と、危険な態度に気づいたときの直し方を説明してください。', `うまくいった経験は、今回の結果を約束しません。「自分には起きない」（不死身）や「自分ならできる」（マッチョ）の態度は、危険を小さく見せます。気づいたら態度の名前を心の中で言い、解毒剤（「自分にも起きる」「危険を冒すのは愚か」）を口に出し、今日の条件を事実で確かめ直します。${bk.see('hf.attitude', '5 つの危険な態度')}`, ['kiso10.q19']],
      ['1 人で飛ぶのだから、人の助けを使う CRM や SRM は関係ない、という意見がありました。使える人と情報、助けの求め方、自分に残る責任を挙げて説明してください。', `1 人でも、管制・教官・資料・チェックリスト・自動化した装置・同乗者を使えます。困ったら黙らず、今の状況・心配・ほしい助けを具体的に伝えます。同乗者に頼むなら、できることを先に説明します。人の情報を使っても、判断と責任は機長に残ります。${bk.see('hf.srm', '1 人で操縦するときの資源管理')}`, ['kiso10.q24']],
      ['急旋回の練習で、視野がだんだん狭く暗くなってきました。何が起きていて、どうしますか。', `正の G で血が足の方へ下がり、目への血が減っています（グレーアウトの始まり）。引く力をゆるめて G を減らし、バンクを浅くします。飲酒・疲れ・脱水は、G に耐える力を弱くします。${bk.see('hf.motion', '動揺病・加速度（G）')}`],
    ],
    refs: [R.aim81, NEW_R.aim74, R.phak, NEW_R.phak2, NEW_R.phak17, R.afh, NEW_R.afh18, R.rmh, R.cfr91, R.cfr61, NEW_R.faaCircadian, NEW_R.faaHearing, NEW_R.faaAccel, NEW_R.faaDcs, NEW_R.faaCo, NEW_R.cdcCo, NEW_R.cap737, R.acsP, R.egovKoku, NEW_R.mlitAlcohol, NEW_R.mlitMeds], lessons: ['i2', 'r1'] });

  // ======================================================================= 第 1 部 第 19 章（新）
  B.add({ id: 'adm', part: 'p1', before: 'ground', t: 'エラー・状況認識・リスク', en: 'Human error, situational awareness and risk management',
    summary: '人は必ず間違えます。その前提で、間違いに気づいて直せるしくみを使えるようにします。人が情報を処理するしくみとエラーの種類、チェックリストと中断からの再開、状況認識と思い込み、リスクの大きさ・個人の最低基準・早めの引き返し、振り返りと報告と安全文化、驚きと驚愕の基礎を学びます。',
    secs: [
      // ------------------------------------------------------------------ 1 (new)
      { id: 'adm.error', t: 'エラーと情報処理', scope: 'common', from: ['kiso10.1', 'kiso10.15'], jcab: ['ppl.3.3.3.1', 'ppl.3.3.3.2', 'cpl.3.3.3.1', 'cpl.3.3.3.2', 'ir.8.3.1', 'ir.8.3.2'], h: () => `
${bk.aim('人は、情報を受け取り、考え、動くまでのどの段階でも間違えます。そのしくみとエラー（error）の種類を知り、注意力だけに頼らずに、間違いを見つけて直せる備えを作れるようにします。')}
${FIG.infoProcess()}
<p>人の要因（human factors）は、人の体・考え方・行動の特性を、機械・環境・組織との関係で考える分野です。操縦がうまくなっても、一度に処理できる情報と、正しく覚えておける量には限りがあります。経験は判断を助けますが、その日の体調や注意の余裕までは約束しません。</p>
<p>上の図は、情報を処理する流れを簡単にしたものです。目や耳が受けた刺激は、知覚で意味がつけられます。そのあと、意識して考える処理と、慣れた手順で自動に進む処理に分かれ、反応（操作や発言）になります。反応の結果がまた目や耳に入り、輪になります（英国 CAA の CAP 737 第 1 章）。</p>
<p>意識して考える処理は、注意と作業記憶（短い間だけ情報を置いておく所）を使います。注意には限りがあります。交信と操縦のように、やさしく見える 2 つの作業も、注意を取り合います。作業を切り替えること自体にも、注意が要ります（CAP 737 第 6 章）。</p>
<h4>作業の順番</h4>
<p>進入中に航法装置の入力を間違えて画面を見続けると、高度・速度・まわりの確認が抜けます。入力を仕上げるより、安全な飛行経路を保つことを先にします。今すぐ要る作業と、後に回せる作業を分けます。迷ったら、Aviate（飛ばす）→ Navigate（向かう）→ Communicate（伝える）の順です（CAP 737）。忙しくなる前に資料を出しやすくし、作業を 1 つ終えたら、外と計器に目を戻します。</p>
<h4>エラーの種類</h4>
<p><b>ヒューマンエラー（human error）</b>は、意図した行動や期待された行動から外れることです。混乱を起こし、作業を増やし、注意を奪い、安全の余裕を減らします（FAA の Risk Management Handbook）。英国 CAA の CAP 737 は、安全でない行動を次のように分けます。</p>
${bk.t(['種類', 'どんな間違いか', '例'], [
  ['スリップ（slip）', '慣れた操作で、するつもりと違う操作をする', '脚を上げるつもりで、フラップ（flaps）のレバーを上げる'],
  ['ラプス（lapse）', '手順の一部を飛ばす・忘れる', '脚を上げ忘れる'],
  ['ミステイク（mistake）', '考えたとおりに行ったが、計画そのものが違っていた', '天気を読み違えて、行けない経路を選ぶ'],
  ['違反（violation）', '決まりに反すると分かっていて行う', '時間がないので、決まった確認をわざと飛ばす']])}
<p>スリップとラプスは意図しない間違いで、ミステイクと違反は意図した行動です（CAP 737 第 5 章）。ラプスは、チェックリスト（checklist）や、声に出す確かめで見つけやすくなります。違反の多くは悪意ではなく、「仕事を進めるため」に起きます（CAP 737 第 5 章）。</p>
<h4>スイスチーズのモデル</h4>
${FIG.swissCheese()}
<p>事故は、ふつう 1 つの間違いだけでは起きません。守りを何枚も重ねると、1 枚に穴があっても、次の 1 枚で止まります。チーズの 1 枚 1 枚が守りで、穴が弱いところです。腕を保ち、決まった手順を毎回使うと、穴がそろいにくくなります（FAA の Risk Management Handbook）。だから、間違いの原因を誰かの不注意だけにしません。手順・道具・環境のどこを直せば穴が小さくなるかを考えます。</p>
${bk.deep('SHELL モデル（JCAB の学科の範囲）', `<p>${bk.est('人と、まわりの要素との合わせ目でエラーを考えるモデルに、SHELL モデルがあります。S はソフトウェア（手順・チェックリスト・資料）、H はハードウェア（機体と装置）、E は環境（天気・騒音・時間など）、L はライブウェア（人）です。真ん中の L（自分）と、まわりの S・H・E・L（ほかの人）との合わせ目のずれが、エラーのもとになると考えます。')}</p>`)}
${bk.key('エラーはなくせない。見つけて直せる備えを重ねる', '注意には限りがある。迷ったら Aviate → Navigate → Communicate', 'スリップ・ラプスは意図しない間違い、ミステイク・違反は意図した行動')}
${bk.warn('<b>よくある間違い：</b>「次から気をつけます」で終えることです。何が穴だったか（手順・資料の置き方・時間）を見つけて、次の飛行で変えることを決めます。')}
${bk.q('ATIS で新しい高度計（altimeter）の規正値を聞いたのに、高度計には古い値が入ったままだった。どのエラーの種類？どう防ぐ？', 'すべきことを抜かしたラプスです（意図しない間違い）。チェックリストで規正値を声に出して読み、高度計の表示と照らすと見つけやすくなります（CAP 737 第 5 章）。')}` },
      // ------------------------------------------------------------------ 2 (new)
      { id: 'adm.check', t: 'チェックリストと中断からの再開', scope: 'common', from: ['kiso10.16'], jcab: ['ppl.3.3.3.4', 'cpl.3.3.3.4'], faa: ['PA.II.B.K2'], h: () => `
${bk.aim('チェックリストは、記憶だけに頼らずに、必要な操作と機体の状態を確かめるための道具です。使い方と、途中で邪魔が入ったときの戻り方を身につけます。')}
${FIG.checklistFlow()}
<p>チェックリスト（checklist）は、記憶を助け、安全に必要な項目を見落とさないための道具です（AFH 第 1 章）。離陸（takeoff）の前の確認のように、慣れた操作ほど、「いつもどおり終えた」と思い込みやすくなります。だから、機体と装備に合った版を使い、項目の意味と、確かめる表示を地上で覚えておきます。</p>
<p>使い方は 2 通りあります。1 つは、項目を読みながら操作する方法です。もう 1 つは、先に操作をして、あとでチェックリストで確かめる方法です。AFH は、チェックリストは「することの一覧」でなくてもよく、操作のあとの「チェック」に重みがあると書いています（AFH 第 1 章）。どちらでも、文を読み上げただけでは終わりではありません。操作した記憶と、実際の状態を確かめたことは別です。</p>
${bk.photo('ch10-photo5')}
<p>AFH は、少なくとも次の場面でチェックリストを使うよう勧めています（AFH 第 1 章）。</p>
<ul><li>外部点検（preflight inspection）・エンジン始動の前・エンジン始動・タキシーの前</li>
<li>離陸の前・離陸のあと・巡航・降下</li>
<li>着陸の前・着陸のあと・エンジンの停止と機体の固定</li></ul>
<h4>中断から戻る</h4>
<p>途中で交信が入り、どこまで確かめたか分からなくなったら、あいまいな記憶で先へ進みません。決められた戻り方に従い、確実に終えた所まで戻って、実際の状態を照らし直します。中断のあとに違う所へ戻ってしまう間違いは、多くの事故で起きています（英国 CAA の CAP 737 第 5 章）。少しでも疑いがわいたら、止まって確かめ直します（CAP 737）。同じ操作をただくり返すのではなく、表示を見て照らします。正しい設定を、かえって変えないためです。</p>
<p>急いでいると感じるときほど、項目を飛ばしやすくなります。その感じを合図に、止まって確かめ直します（CAP 737 第 5 章）。邪魔の多い場面（離陸の前など）では、同乗者にも静かにしてもらいます。チェックリストに気をとられて、操縦や外の確認を失ってはいけません。緊急のときは、訓練した優先の順に従います。</p>
${bk.judge('読んだだけでなく、スイッチの位置と表示を目で確かめたか', '中断のあと、確実に終えた所から照らし直したか', '自分で作った短い版や記憶で、正式の項目を飛ばしていないか')}
${bk.key('読み上げただけでは終わりではない。実際の状態を照らす', '中断されたら記憶で続けない。確実に終えた所へ戻る', '急いでいると感じたら、それを合図に止まって確かめ直す')}
${bk.warn('<b>よくある間違い：</b>自分で作った短い版や記憶だけで、正式の項目を飛ばすことです。分かりにくい項目は、地上で教官と確かめます。')}
${bk.q('エンジン始動前のチェックリストの途中で、管制に呼ばれた。答えたあと、どこから続ける？', '記憶で「たぶんここまで」と進めません。確実に終えた項目まで戻り、スイッチと表示を実際に見て照らし直してから、先へ進みます（CAP 737 第 5 章）。')}` },
      // ------------------------------------------------------------------ 3 (new)
      { id: 'adm.sa', t: '状況認識と思い込み', scope: 'common', from: ['kiso10.17', 'kiso10.18'], h: () => `
${bk.aim('自分の位置だけでなく、まわりで起きていることの意味と、この先どうなるかをつかみ続けます。思い込みが判断をゆがめるしくみを知り、それを防ぐ確かめ方を身につけます。')}
${FIG.saLevels()}
<p><b>状況認識（situational awareness）</b>は、まわりの状況に気づき、その意味を理解することです。さらに、近い将来どうなるかを予測することまで含みます（FAA の Risk Management Handbook）。PHAK は、飛行・操縦士・機体・環境・運航の種類の 5 つにわたって、安全に関わることを正しく知り、理解していることとしています（PHAK 第 2 章）。今の位置が分かるだけでは足りません。</p>
<p>例を見ます。向かい風が強くなり、対地速度（groundspeed）が落ちたことに気づきます（知覚）。着く時刻が遅れ、燃料と日没までの余裕が減ると分かります（理解）。このまま続ければ、着くときの余裕が足りなくなると見積もります（予測）。予測は決めつけではありません。新しい観測と通報で、くり返し更新します。表示の時刻・単位・対象の範囲も確かめます。</p>
<p>疲れ・ストレス・作業の多さは、1 つのことに注意を集めさせ、全体の状況認識を下げます。多くの事故で、計器の小さな不調などに気をとられ、計器の監視や外の見張り（see and avoid）がおろそかになっています（PHAK 第 2 章）。分からなくなったら、操縦を保ちながら、あいまいな点をはっきりさせ、助けを求めます。</p>
<h4>思い込み（バイアス）</h4>
<p>期待のバイアス（expectation bias）は、まちがった見方が、反対の証拠があっても続くことです。いつも同じ地上走行の指示をもらう空港では、今回も同じだと思い、実際の指示と違う道を思い浮かべがちです（FAA の Risk Management Handbook）。指示は、聞きたいことでなく言われたことを、復唱（readback）と資料で確かめます。確証のバイアス（confirmation bias）は、自分の見込みに合わない情報を、押さえこもうとする傾向です。どちらも、状況が思ったとおりでない手がかりがあるのに、計画を続けさせます。疲れていると確かめの手間をはぶきやすく、どちらにもかかりやすくなります（同じ資料）。</p>
<p>最初の計画をそのまま続けたくなる傾向もあります。PHAK は、最初の目的地にこだわり、ほかの道を考えなくなる傾向を get-there-itis と呼びます（PHAK 第 2 章）。作業が多いと、ほかの道を考えるために注意を移すこと自体が難しくなります（英国 CAA の CAP 737 第 6 章）。ここまで使った時間や費用は、この先が安全な根拠にはなりません。</p>
${bk.judge('計画をやめる理由になる情報を、わざと探したか', '情報の時刻と、どこの情報かを確かめたか', '判断の理由を人に話し、反対の見方を聞いたか', '決めておいた中止の条件と照らしたか')}
${bk.key('状況認識は 3 段階：気づく → 意味を理解する → 先を予測する', '予測は決めつけない。新しい情報でくり返し更新する', '聞きたいことでなく、言われたことを復唱と資料で確かめる')}
${bk.warn('<b>ここに注意：</b>画面に情報がたくさん出ていても、意味を理解していなければ、状況認識は十分ではありません。')}
${bk.q('目的地は天気のよい予報で、行けると思っていた。途中で「悪くなっている」という報告を聞いた。どう考える？', '自分の見込みに合わない情報を軽く見る、確証のバイアスに気をつけます（FAA の Risk Management Handbook）。報告の時刻と場所を確かめ、決めておいた中止の条件と照らします。合わなければ、引き返しや目的地変更（diversion）を選びます。')}` },
      // ------------------------------------------------------------------ 4 (new)
      { id: 'adm.risk', t: 'リスクの大きさ・個人の最低基準・早めの引き返し', scope: 'common', from: ['kiso10.21', 'kiso10.22', 'kiso10.26'], jcab: ['ppl.3.3.3.3', 'cpl.3.3.3.3'], faa: ['PA.I.H.K4', 'PA.II.A.K4'], h: () => `
${bk.aim('危険の起こりやすさと結果の重さから、リスクの大きさを見積もります。自分の最低基準を前もって決め、選べる道が多いうちに、引き返しや目的地変更を決められるようにします。')}
${FIG.riskMatrix()}
<p>事故などの望まない出来事につながりうる条件・出来事・物を、ハザード（hazard）といいます。リスク（risk）は、そのハザードをなくせなかったときの、将来の影響です（FAA の Risk Management Handbook）。</p>
<p>リスクは、起こりやすさと、結果の重大さを組み合わせて考えます。PHAK のリスク・マトリックスは、起こりやすさを 4 段階（何度も起きる・いつか起きる・起きにくい・まず起きない）に分けます。結果の重大さも 4 段階（壊滅的・重大・軽度・無視できる）に分けます（PHAK 第 2 章）。たとえば、計器で飛ぶ資格のない操縦士が雲に入る結果は、壊滅的です。その起こりやすさを「いつか起きる」と見積もると、リスクは高くなります。高いリスクのときは、飛ばないか、リスクをなくす・減らす・抑える方法を見つけてから飛びます（PHAK 第 2 章）。</p>
<p>「天気が悪い」と書くより、「雲が低くなり、経路の地形を避ける余裕がなくなる」と具体的に書くと、対策を考えやすくなります。起こりにくそうでも、結果が重大なら軽く扱いません。点数を足す評価表は、考えを整理する道具です。重大な危険を、ほかのよい条件や低い合計点で打ち消しません。</p>
<p>対策をとったあとにも残るリスクを、残留リスク（residual risk）といいます（FAA の Risk Management Handbook）。対策を決めただけで終えず、効いたかを確かめます。経路を変えたら、変えた先の天気と燃料も見積もります。許せるまで下がらなければ、さらに計画を変えるか、飛ぶのをやめます。</p>
${FIG.residualRisk()}
<h4>個人の最低基準</h4>
<p><b>個人の最低基準（personal minimums）</b>は、自分の経験と今の腕に合った余裕を保つため、規則より厳しく自分で決める基準です。規則は、すべての場面を決めてはいませんし、安全を約束もしません（FAA の Risk Management Handbook）。雲高（シーリング、ceiling）と視程・風と横風（crosswind）・夜・慣れない空港などについて、どの条件なら出発しないかを決めます。</p>
<p>FAA の Risk Management Handbook は、決め方を 6 つの段階で示します。天気の区分を知る、自分の経験と慣れを書き出す、風などのほかの条件を考える、基準の表にまとめる、その日の条件で上乗せする、決めたとおりに守る、です。</p>
${bk.t(['条件', '昼の自分の基準', '夜の自分の基準'], [['雲高', '　　　ft', '　　　ft'], ['視程', '　　　SM', '　　　SM'], ['地上の風・突風', '　　　kt', '　　　kt'], ['横風の成分', '　　　kt', '　　　kt'], ['滑走路の長さ', '　　　ft', '　　　ft']])}
<p>その日の条件が悪いときは、基準を厳しくします。下の表は、同じ資料の例です。</p>
${bk.t(['こんなときは', '基準をこう厳しくする（例）'], [
  ['自分：体調・薬・ストレス・疲れ、しばらく飛んでいない', '雲高に 500 ft 以上足す'],
  ['機体：慣れない機体や装置', '視程に 1/2 SM 以上足す'],
  ['環境：慣れない空港・空域・地形', '滑走路の長さに 500 ft 以上足す'],
  ['外からの圧力：必ず着きたい予定・同乗者の期待', '風の基準を 5 kt 以上下げる']])}
${bk.src('FAA の Risk Management Handbook（FAA-H-8083-2A）第 2 章・図 2-9')}
<p>決めた基準は、その日の予定に合わせて下げません。変えるのは、時間があり落ち着いて考えられるときです。変えるのは 1 つずつにし、大きく変える前に教官と相談します。書いておくと、同乗者に「今日は飛ばない」と説明しやすくなります（FAA の Risk Management Handbook）。法令・機体・学校の制限より緩い基準は作れません。PHAK は、夜の VFR の事故の率は、飛行時間が 100 時間になるまでに半分近くまで下がるとしています。そして、最初の 500 時間は、規則より高い個人の基準を勧めています（PHAK 第 2 章）。</p>
<h4>早めの引き返し</h4>
<p>続けるかどうかは、出発の時だけの判断ではありません。天気・燃料・日没・機体・体調の変化をとらえ、先の条件でも余裕が保てるかを考えます。問題がはっきりするまで待つと、選べる経路と着陸場所が減ります。目的地が近いという理由だけで進めず、今いる所から使える空港・燃料・天気・地形を比べます。来た道の天気も変わるので、引き返しをいつも一番の手とは決めつけません。</p>
<p>進入が安定しなければ、着陸許可（landing clearance）があっても、安全な着陸が約束されたわけではありません。訓練した基準で、着陸復行（ゴーアラウンド、go-around）を選びます。早く帰りたい気持ちや、変更を説明する気まずさと、飛行の条件を分けて考えます。</p>
${bk.judge('対策のあとに残るリスクを、もう一度見積もったか', '決めておいた個人の最低基準と中止の条件に照らしたか', '選べる道（引き返す・目的地変更・待つ）が、まだ多いうちに決めたか')}
${bk.key('リスク＝起こりやすさ×重大さ。重大な危険はほかの条件で打ち消さない', '個人の最低基準は規則より厳しく。当日の予定に合わせて下げない', '迷ったら早めに引き返す・降りる。ここまでの労力は続ける理由にならない')}
${bk.warn('<b>ここに注意：</b>評価表の点数は、安全の証明ではありません。経験したことのない条件を、知らないからといって小さく見積もりません。')}
${bk.recall('TEM（脅威とエラーの管理、threat and error management）は、スレット（脅威、threat）を予測して防ぎ、エラーを見つけて直す考え方です。直しきれずに生じた UAS（望ましくない航空機の状態、undesired aircraft state）は、立て直します。', ['crm.tem', '予告：TEM（脅威とエラーの管理）'])}
${bk.q('今日の天気は自分の最低基準ぎりぎり。同乗する友だちは「今日行きたい」と言っている。どうする？', '外からの圧力です。基準はその日の予定に合わせて下げません。待つ・延ばす・やめるを選び、書いておいた最低基準を見せて説明します（FAA の Risk Management Handbook）。')}` },
      // ------------------------------------------------------------------ 5 (new)
      { id: 'adm.review', t: '振り返り・報告・安全文化・驚きと驚愕の基礎', scope: 'common', from: ['kiso10.27'], h: () => `
${bk.aim('飛んだあとに、うまくいったことと直すことを具体的にふり返り、次の飛行で変える行動まで決めます。報告の制度と、驚いたときに立て直す基本の考え方を知ります。')}
<h4>飛行のあとのふり返り</h4>
<p>飛行の前のブリーフィング（briefing）に対して、飛行のあとのふり返りをデブリーフィング（debriefing）といいます。デブリーフィングでは、うまくできたことと直すことを、具体的な場面に結びつけてふり返ります。「注意が足りなかった」で終えると、次に何を変えるかが分かりません。その時に持っていた情報・判断の理由・実際の行動・結果を、順に並べます。</p>
<p>たとえば、チェックリストの途中で交信が入り、どこから続けるか迷ったとします。中断の時期・終えた項目のつかみ方・戻り方を見直します。結果として抜けがなくても、くり返せば危ない条件は残ります。早い相談や確かめ合いが役立った場面も、記録します。あとで分かった情報だけで、当時の判断を決めつけません。そのとき何が分かり、何を見落としたかを分けます。</p>
<p>ふり返りは、次の準備や練習で変える行動まで決めて、終わりにします。資料の置き方・確かめる時期・役割の分け方などを直し、次の飛行で効いたかを確かめます。</p>
<h4>報告と安全文化</h4>
<p>報告は、人を責めるためではなく、同じ穴をふさぐためにあります。安全にかかわる出来事を、すすんで報告できる組織の雰囲気を、安全文化といいます。公正な文化（just culture）は、うっかりの間違いと、わざと決まりを破る違反を分けて扱い、間違いには寛容です（英国 CAA の CAP 737 第 5 章）。決められた報告と、学ぶための自発的な報告は、別の制度です。報告するものと出し先を確かめ、事実と推測を分けて書きます。</p>
<h4>驚きと驚愕</h4>
<p><b>驚き（surprise）</b>は、予想と違う出来事で、そのあとの考え方に影響するものです。<b>驚愕（startle）</b>は、突然の強い出来事に対して、体が勝手に起こす反射です。筋肉がびくっとし、脈と血圧が上がります（FAA AC 120-111）。驚愕の反射だけなら、手の操作は 5〜10 秒ほどで元に戻ります（英国 CAA の CAP 737 第 7 章）。強い恐れが加わると、注意が 1 つのことに集まります。新しく覚えたことも、思い出しにくくなります（CAP 737 第 7 章）。</p>
<p>立て直しのいちばんの助けは、前もって用意した、短く単純な手順です。まず機体を飛ばすこと（Aviate）から始めます（CAP 737 第 7 章）。起こりうる場面（着陸復行など）を前もって頭の中で練習しておくと、驚きにくくなります。いろいろな場面を経験するほど、驚いても立て直しやすくなります（CAP 737 第 7 章）。</p>
${bk.key('振り返りは「誰が悪いか」でなく、次に変える行動まで決める', '報告は人を責めるためでなく、穴をふさぐため', '驚いたら、まず機体を飛ばす。用意した短い手順から始める')}
${bk.us('<p>米国では、NASA が運営する ASRS（Aviation Safety Reporting System）に、安全にかかわる出来事を自発的に報告できます。NASA は、報告者が分からないようにします。FAA は、ASRS に出された報告を、規則違反の処分に使いません（14 CFR 91.25。犯罪と事故の情報は除く。FAA AC 00-46F）。</p>')}
${bk.jp('<p>日本には、ヒヤリハットを自発的に報告する航空安全情報自発報告制度（VOICES）があります。平成 26 年 7 月 10 日に始まり、公益財団法人 航空輸送技術研究センターが運営します。航空法などで求められる義務報告の代わりにはなりません（VOICES の案内）。</p><p>また、改正航空法（令和 7 年 6 月 6 日公布）で、技能発揮訓練の決まりができました。修了していないと、航空交通管制圏（control zone）に係る空港で、離着陸の操縦や操縦練習の監督ができなくなります。国土交通省の検討会の最終とりまとめ（令和 8 年 2 月 24 日）は、訓練の間隔を 2 年、最低の訓練時間を 3 時間としています。この義務が始まるのは政令で決める日で、とりまとめは令和 10 年 6 月頃を見込んでいます。対象と時期は、最新の案内で確かめます。</p>')}
${bk.q('確認を 1 つ抜かしたが、何事もなく着陸できた。ふり返りは要らない？', '要ります。結果がよくても、同じ条件なら次も起こりえます。何が起き、いつ気づき、何が役に立ったかを、事実と考えを分けて記録し、次の飛行で変える行動を決めます。')}` },
    ],
    terms: [['Human factors', '人の要因（ヒューマンファクター）', '人の体・考え方・行動の特性と、機械・環境・組織との関係'], ['Human error', 'ヒューマンエラー', 'FAA Risk Management Handbook'], ['Slip / Lapse / Mistake / Violation', 'スリップ / ラプス / ミステイク / 違反', 'CAP 737 第 5 章'], ['Working memory', '作業記憶', '短い間だけ情報を置いておく所'], ['Swiss cheese model', 'スイスチーズのモデル', 'FAA Risk Management Handbook 図 6-1'], ['Checklist', 'チェックリスト', 'AFH 第 1 章'], ['Situational awareness', '状況認識', '知覚・理解・予測'], ['Expectation bias / Confirmation bias', '期待のバイアス / 確証のバイアス', 'FAA Risk Management Handbook'], ['Hazard / Risk', 'ハザード / リスク', 'FAA Risk Management Handbook'], ['Risk assessment matrix', 'リスク・マトリックス', 'PHAK 第 2 章 図 2-5'], ['Residual risk', '残留リスク', '対策のあとに残るリスク'], ['Personal minimums', '個人の最低基準', 'FAA Risk Management Handbook 第 2 章'], ['Debriefing', 'デブリーフィング（ふり返り）', ''], ['Just culture', '公正な文化', 'CAP 737'], ['Surprise / Startle', '驚き / 驚愕', 'FAA AC 120-111'], ['ASRS (Aviation Safety Reporting System)', '米国の自発報告の制度', 'FAA AC 00-46F']],
    examples: ['チェックリストの途中で管制に呼ばれた：答えたあと、確実に終えた項目まで戻って、スイッチと表示を照らし直す。', '向かい風で着く時刻が遅れてきた：燃料と日没の余裕が減ると理解し、このままの余裕を予測して、早めに目的地変更を決める。', '天気が自分の最低基準ぎりぎり：基準を下げずに待つ。同乗者には書いておいた基準を見せて説明する。', '飛行のあと、確認の抜けに気づいた：誰が悪いかでなく、戻り方と資料の置き方を直し、次の飛行で試す。'],
    cautions: ['この章の考え方は、操縦の手順や学校の規程の代わりではありません。実機は POH・学校の SOP・教官の指示が優先です。', '個人の最低基準の数字は人によって違います。この章の表の数字は資料の例で、自分の基準は教官と決めます。', 'この教材のシミュレータでは、驚愕や疲れのような体と心の反応は体験できません。'],
    quiz: [
      { q: 'ふだんは脚のレバーを上げるつもりが、フラップのレバーを上げてしまった。このエラーの種類は？', choices: ['スリップ（するつもりと違う操作）', 'ラプス（手順を飛ばす）', 'ミステイク（計画のまちがい）', '違反（わざと決まりを破る）'], answer: 0, why: '英国 CAA の CAP 737 第 5 章：慣れた操作で、するつもりと違う操作をするのがスリップ。この例は CAP 737 の例そのもの（エラーと情報処理の節）。' },
      { q: 'チェックリストの途中で管制に呼ばれ、どこまで確かめたか分からなくなった。正しいのは？', choices: ['覚えている所の次から続ける', '最初から全部の操作をもう一度くり返す', '確実に終えた所まで戻り、実際の状態と照らし直す', '飛行が終わってから確かめる'], answer: 2, why: 'CAP 737 第 5 章：中断のあとに違う所へ戻る間違いは多くの事故で起きている。記憶で続けず、確実に終えた所から表示を照らす（チェックリストと中断からの再開の節）。' },
      { q: '状況認識の 3 つの段階の順は？', choices: ['予測 → 理解 → 知覚', '知覚 → 理解 → 予測', '理解 → 知覚 → 予測', '知覚 → 予測 → 理解'], answer: 1, why: 'FAA の Risk Management Handbook：状況に気づき（知覚）、意味を理解し、近い将来を予測する（状況認識と思い込みの節）。' },
      { q: 'PHAK のリスク・マトリックスで、起こりやすさが「いつか起きる」、重大さが「壊滅的」のリスクは？', choices: ['低い', '中', '重い', '高い'], answer: 3, why: 'PHAK 第 2 章 図 2-5：occasional × catastrophic は high。飛ばないか、リスクを減らしてから飛ぶ（リスクの大きさの節）。' },
      { q: '個人の最低基準の決め方として正しいのは？', choices: ['その日の予定に合わせて少し下げる', '法令や機体の制限より緩くしてよい', '落ち着いて考えられるときに教官と経験を見直して決め、変えるときは 1 つずつ', '一般的な数字をそのまま使う'], answer: 2, why: 'FAA の Risk Management Handbook 第 2 章：飛ぶ圧力のあるときに変えない、1 つずつ変える、大きく変える前に教官と相談する（個人の最低基準の節）。' },
      { q: '目的地まであと少しの所で雲が低くなってきた。ここまで来た労力は、判断の中でどう扱う？', choices: ['この先の安全の根拠にはならない。選べる道が多いうちに引き返しや目的地変更を決める', '労力が大きいほど、続ける理由になる', '着陸許可があれば、安定しない進入でも続ける', '燃料が残っていれば、天気は考えなくてよい'], answer: 0, why: 'ここまで使った時間と労力は、この先が安全な根拠にならない（計画継続の傾向。PHAK 第 2 章の get-there-itis）。早めの引き返しの節。' },
    ],
    written: [
      ['経験を積んだ人が、慣れた経路なので疲れや確認の抜けは心配しなくてよい、と考えました。この考えの問題点と、人の特性をふまえて飛ぶ前に整える備えを説明してください。', `経験があっても、注意・記憶・体調の限界はなくなりません。慣れると確認をはぶきがちです。注意力に頼るだけでなく、チェックリスト・人との確かめ合い・中止の条件を用意し、間違いに気づいて直せる備えを重ねます。${bk.see('adm.error', 'エラーと情報処理')}`, ['kiso10.q1']],
      ['進入中に航法装置の入力をやり直すことになり、画面に注意が集まりました。すぐに入力を仕上げるべきですか。飛行の段階に合わせた順番と、作業の分け方を説明してください。', `入力で操縦や外の確認がおろそかになるなら、続けません。飛行経路を保つ作業を先にし、入力は後に回すか、助けを求めます。何を待たせられるかを見きわめ、必要なら進入をやり直して余裕を作ります。${bk.see('adm.error', 'エラーと情報処理：作業の順番')}`, ['kiso10.q15']],
      ['チェックリストの途中で交信が入り、どの項目まで確かめたかあいまいになりました。覚えているつもりで先へ進んでよいですか。操作と確かめ、中断からの戻り方を説明してください。', `進みません。操作をしたつもりと、実際の状態を確かめたことは別です。確実に終えた所まで戻り、スイッチと表示を見て照らし直します。読むだけで済ませず、抜けとやり直しすぎの両方を防ぎます。${bk.see('adm.check', 'チェックリストと中断からの再開')}`, ['kiso10.q16']],
      ['計画どおりの経路を飛んでいますが、風が強くなり、着く時刻が遅れています。今の位置が分かっていれば、状況認識は十分ですか。知覚・理解・予測の違いで説明してください。', `十分ではありません。風と着く時刻の変化に気づくのが知覚、それが燃料と日没の余裕を減らすと分かるのが理解、このまま続けたときの余裕を見積もるのが予測です。予測は新しい情報で更新し、要るなら経路や目的地を変えます。${bk.see('adm.sa', '状況認識と思い込み')}`, ['kiso10.q17']],
      ['目的地へ行けると思い、天気のよい情報ばかり集めていました。悪くなっているという報告を聞いたとき、気をつけるべき判断のかたよりと、反対の情報を取り入れる方法を説明してください。', `自分の見込みに合う情報を重く見る確証のバイアスと、最初の計画を続けたくなる傾向です。情報の時刻と場所を確かめ、計画を続けられない条件をわざと探します。決めておいた中止の条件と照らし、人の意見や代わりの案を使って判断を更新します。${bk.see('adm.sa', '状況認識と思い込み：思い込み')}`, ['kiso10.q18']],
      ['いくつかの条件を点数にしたら、合計は低くなりました。でも、重大な危険が 1 つだけ残っています。点数だけで出発を決めてよいですか。リスクの見積もりと対策を説明してください。', `よくありません。合計が低くても、重大な結果につながる危険を、ほかのよい条件で打ち消しません。起こりやすさと重大さを分けて考え、危険をなくすか影響を減らす対策を考えます。対策のあとに残るリスクを見積もり直し、許せなければ計画を変えるかやめます。${bk.see('adm.risk', 'リスクの大きさ')}`, ['kiso10.q21']],
      ['出発の日に予定がつまり、前に決めた自分の最低基準を少し緩めれば飛べそうです。最低基準の役割と、法令や機体の制限との関係、見直す時期を説明してください。', `個人の最低基準は、自分の経験と腕に合った余裕を保つためのもので、規則より厳しくします。当日の予定に合わせて下げません。見直すのは落ち着いて考えられるときで、1 つずつ、教官と経験をふり返ってから変えます。法令や機体の制限より緩くはできません。${bk.see('adm.risk', '個人の最低基準')}`, ['kiso10.q22']],
      ['目的地が近いのに天気が悪くなり、同乗者は早く着きたがっています。ここまで来た労力を理由に続けてよいですか。引き返しや目的地変更を選ぶ時期と条件を説明してください。', `ここまで使った時間と労力は、この先の飛行が安全な根拠になりません。天気・燃料・残りの時間・代わりの空港・自分の状態を見直し、選べる道が多いうちに、決めておいた中止の条件と照らします。必要な連絡をして、早めに引き返すか目的地を変えます。${bk.see('adm.risk', '早めの引き返し')}`, ['kiso10.q26']],
      ['飛行中に確認を 1 つ抜かしましたが、最後は問題なく着陸できました。結果がよければ、ふり返りは要りませんか。記録することと、次の飛行や報告への生かし方を説明してください。', `要ります。同じ条件なら、次も問題が起こりえます。何が起き、いつ気づき、何が役に立ったかを、事実と考えを分けて記録します。人を責めて終えず、準備や手順の直し方を決めます。決められた報告と、学ぶための自発的な報告を分けて、正しい窓口を使います。${bk.see('adm.review', '振り返り・報告・安全文化')}`, ['kiso10.q27']],
      ['巡航中に突然大きな音がして、体がびくっとし、頭が真っ白になりかけました。驚愕と驚きの違いと、立て直し方を説明してください。', `突然の強い出来事に体が勝手に反応するのが驚愕、予想と違う出来事で考え方が乱れるのが驚きです。まず機体を飛ばすことから始め、翼を水平にし、姿勢と速度を確かめます。前もって用意した短い手順に従うと、落ち着きを取り戻しやすくなります。${bk.see('adm.review', '驚きと驚愕')}`],
    ],
    refs: [NEW_R.phak2, R.rmh, NEW_R.afh1, NEW_R.cap737, NEW_R.ac120111, NEW_R.ac0046f, R.cfr91, NEW_R.voices, NEW_R.mlitHf, R.acsP], lessons: ['r1'] });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
