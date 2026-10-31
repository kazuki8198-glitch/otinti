// DRAFT (W30, R3) — Part 4's chapters 'ifr'「計器による飛行」and 'ifrp'「計器飛行方式」(textbook/rewrite/combined/DESIGN.md 3.3
// 第 4 部 第 32・33 章, 4.1 rows 21・22, 4.2 kiso04・kiso12, 7.2 W30). No product reads this file (DESIGN 6.2 rule 5, 7.4). It is
// a plain script like book-4.js: when the chapters are registered, the two B.add(...) below replace the ones of 'ifr' and
// 'ifrp' in flight-lab/src/book-4.js in place (same ids, same place: the first chapters of Part 4, after navd), the figures of
// p4-figs.js go into book-figs.js (FIG; ils replaces the function of the same name), and the references in NEW_R go into
// book-core.js's R (then `NEW_R.x` → `R.x`). Check them with the figures:
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p4-figs.js textbook/rewrite/combined/drafts/p4.js
//
// What changed in 'ifr' (6 sections: the 4 of the textbook kept with their ids and in their order — scan, instr, partial,
// upset — and the 2 new ones where DESIGN 3.3 puts them: ifr.vacuum and ifr.auto after ifr.partial):
//  - ifr.scan ← kiso12.4〜12.7・kiso04.11: RULINGS R.scan-pattern closed (the selected radial cross-check first, the others as
//    skill grows: IFH chapter 6), the set → trim → check → correct loop with the instruments' lag, the level-off lead (10 % of
//    the vertical speed: IFH chapter 7), 180° in 60 s; the scan types, errors, ACS table and bank table in a fold; the FLIGHT LAB
//    note on the PFD's missing turn-rate trend moved into bk.sim (DESIGN 6.2 rule 10); the recall of hf.body
//    (C.spatial-disorientation); 考えてみよう before シミュレータ (the form);
//  - ifr.instr ← kiso04.17・04.18・04.27・kiso12.9: information independence, not the number of displays (the same source
//    errs the same way; reversion does not mend a sensor; the autopilot uses the same data); the blockage table replaced by a
//    2-line recall of its address sys.g1000 (C.pitot-static-blockage); photo ch04-photo2 (one static port per seat); the
//    attitude-and-power table for an unreliable airspeed (teaching values from the flight model) in a fold;
//  - ifr.partial: the compass-error table replaced by a recall of sys.compass (C.compass-errors); FLIGHT LAB's i3 note in bk.sim;
//  - ★ifr.vacuum ← kiso04.10 (figure vacuumSixPack, new): the six classic instruments and their power (PHAK chapter 8), the
//    vacuum failure that shows slowly, compare with the turn coordinator and the VSI, cover the failed ones (IFH chapter 11);
//    the heading indicator's precession and the preflight checks in a fold (PHAK chapter 8, IFH chapter 5);
//  - ★ifr.auto ← kiso12.10 (figure navReadout, new): heading, track and deviation; the CDI's navigation source (GPS / LOC), the
//    flight phase and LNAV+V (G1000 pilot's guide); the Archer III POH supplement's autopilot approach (APR before the glide
//    path; no level-off at the DA; off at the DA or MAP, not below 200 ft AGL; lost signal → missed approach); the recall of
//    inst.ap (C.autopilot-modes);
//  - ifr.upset: 「Va（設計運動速度）」→ the POH's 最大運用運動速度（V<sub>O</sub>）113 KIAS at 2,550 lb, 98 KIAS at 1,917 lb (POH 2.3;
//    safety-R2 point 8), the AFH's definition of an upset (25° / 10° / 45°), the recall of adm.review (C.surprise-startle);
//    the link to crm.upset (a later part) taken out (the forward links: DESIGN 5 criterion 23).
// What changed in 'ifrp' (11 sections: the 5 of the textbook kept with their ids and in their order — rules, hold, chart, ils,
// np — and the 6 new ones where DESIGN 3.3 puts them: dep and enr after rules, pt after chart, pbn after ils, circle and case
// after np):
//  - ifr.rules ← kiso12.1〜12.3・12.13・12.22: IFR ≠ IMC (basics.rules, no second bold definition), pilot / aircraft / route and
//    weather checked apart, the clearance in five steps (91.123), visibility reports vs visual references (RVR); the alternate
//    weather, WAAS planning, the 91.185(c)(3) times and the IFR equipment and inspections in folds; 91.177 moved to ifr.enr;
//    RULINGS R.ifr-fuel and ERRATA K.ifr.K-5 closed by the box bk.same('fuel.ifr') (45 minutes both);
//  - ★ifr.dep ← kiso12.14 (figure climbGradient = ch12-fig12-7 redrawn): ODP and SID, the 35 ft / 400 ft / 200 ft/NM
//    assumptions (AIM 5-2-9), gradient → rate, the Archer worked example (POH 5: 487 ft/min) in a 計算演習, void times, low
//    close-in obstacles and engine failure in a fold; the box appr.ban (FL.jur places it here too);
//  - ★ifr.enr ← kiso12.15・12.17 (figure enrouteAlts, new): MEA, MOCA (22 NM), MRA, MCA (IPH chapter 2, 91.177), IFR cruising
//    altitudes (91.179), required reports (91.183・91.187, AIM 5-3-3) in a fold, STAR and "descend via" (AIM 5-4-1), descent
//    planning; the recall of comm.arrive for the VFR altitudes (answerable-R2 5: no second definition here);
//  - ifr.hold ← kiso12.16: the protected airspace assumes the speeds; fuel and the next option while holding; the maximum
//    speeds and the bank limits left to the box hold below (no hand-written duplicate: RULINGS R.hold-numbers); the holding
//    clearance, the DME / time rows, the ACS and i4 tolerances and photo ch12-photo2 in a fold; ERRATA K.ifr.K-4 left open (ICAO's timing not read: the box says 〔要確認〕);
//  - ifr.chart ← kiso12.12・12.18: the approach segments (14 CFR 97.3), the notes and the category line; MSA named
//    最低扇形別高度 (FL.terms msa) and told apart from 91.119's minimum safe altitude (STYLE: 必ず区別する語);
//  - ★ifr.pt (figure procTurn, new): the procedure turn, hold-in-lieu, NoPT (AIM 5-4-9, 91.175(j)); TAA and DME arcs in a fold;
//  - ifr.ils ← kiso12.19・12.23: check the facility, its ident and NOTAMs; the descent rate ≈ groundspeed × 5.3; the readback
//    example, the antennas, the ACS table and photo ch12-photo5 (approach lights) in a fold; the figure ils redrawn (R1V's nit), its caption shortened; ERRATA
//    K.ifr.K-1 closed (the textbook's photos stand for kiso12.19's missing images);
//  - ★ifr.pbn ← kiso12.11 (figure pbnCorridor, new): PBN, RNAV and RNP (AIM 1-2), the navigation specifications, RAIM and its
//    prediction (AIM 1-1-17; the satellites recalled from nav.gps), approvals and the database; the Archer III POH 1-18 and
//    2.23 and the RAIM flags in a fold;
//  - ifr.np ← kiso12.20・12.21・12.24 (second figure missedTwoTasks = ch12-fig12-11 redrawn): the CADET-fixed sentences kept word
//    for word (自動操縦（オートパイロット）があることが多いです。…実装していません), the circling paragraph and key point kept for
//    flight.test.mjs; the link to crm.auto (a later part) → ifr.auto (same part);
//  - ★ifr.circle ← kiso12.25 (figure circleArea, new): the safety item ② in the first-read text (AIM 5-4-21), categories (14 CFR
//    97.3; the Archer is A), the circling area (AIM 5-4-20, IPH chapter 4), keep the MDA, night and rain; ERRATA K.ifr.K-2 and
//    RULINGS R.circling-lost-visual closed; the box circle;
//  - ★ifr.case ← kiso12.28: one IFR flight in TEM words on the fictional LAB ILS RWY 36 (GS out → LOC MDA 480 ft); the recall of
//    adm.risk and the 予告 link to crm.tem (C.tem-words).
// Every section has scope (DESIGN 3.3: us for rules・dep・enr・chart・pt, common elsewhere — 日米 = common with boxes); US rules in a
// common section are in sentences that name the country. The end-of-chapter questions are in place and order, new ones after
// them (ifr: answers C・D・C; ifrp: D・D・D・C). Written questions rewritten from kiso12's qa and kiso04 q27 (7 + 18).
// Every claim (number, unit, rule) is in p4.claims.json with its tag and source.
(function (FL) {
  'use strict';
  const B = FL.book, R = B.R, bk = B.bk, FIG = FL.bookFigs;
  const AR = FL.physics.AIRCRAFT.find(a => a.id === 'pa28').v, DEG = Math.PI / 180;
  // ifr.instr's fold: the course Archer's four steady states at 3,000 ft (pitch and rpm from the flight model, the same
  // states as ops.trim's table and FIG.attitudePower): the pitch and power that give a known speed
  const att4 = () => {
    const PH = FL.physics, s = PH.newState({ aircraft: 'pa28' }), at = (name, kt, fpm, o) => ({ name, kt, ...PH.steadyState(s, kt, fpm, { altFt: 3000, ...o }) });
    return [at('巡航（水平）', AR.cruise, 0, {}), at('上昇（Vy・出力いっぱい）', AR.y, null, { pwr: 'full' }), at('降下（500 fpm）', 90, -500, {}), at('進入（フラップ 40°・370 fpm）', AR.appr, -370, { flaps: AR.apprFlaps })];
  };
  const f0 = n => Math.round(n).toLocaleString('en-US'), f1 = n => (Math.round(n * 10) / 10).toFixed(1);
  // new references (to be added to book-core.js's R when the chapters are registered; each URL opened on 2026-10-31)
  const NEW_R = {
    aim12: { label: 'FAA AIM 1-2 Performance-Based Navigation (PBN) and Area Navigation (RNAV)（1-2-1 RNAV と航法仕様・1-2-2 RNP と機上の監視と警報）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap1_section_2.html' },
    cfr97: { label: '14 CFR 97.3 Symbols and terms used in procedures（進入の区分・進入の区間）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-97/subpart-A/section-97.3' },
    iph1: { label: 'FAA Instrument Procedures Handbook（FAA-H-8083-16B）第 1 章 Departure Procedures（40:1 の面・200 ft/NM と 48 ft/NM の余裕）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/instrument_procedures_handbook/FAA-H-8083-16B_Chapter_1.pdf' },
    iph2: { label: 'FAA Instrument Procedures Handbook（FAA-H-8083-16B）第 2 章 En Route Operations（MEA・MOCA・MRA・MCA）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/instrument_procedures_handbook/FAA-H-8083-16B_Chapter_2.pdf' },
    iph4: { label: 'FAA Instrument Procedures Handbook（FAA-H-8083-16B）第 4 章 Approaches（進入の区分・周回の区域・DME アーク・TAA）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/instrument_procedures_handbook/FAA-H-8083-16B_Chapter_4.pdf' },
  };

  // ======================================================================= 第 4 部 第 32 章
  B.add({ id: 'ifr', part: 'p4', t: '計器による飛行：計器・スキャン・故障・自動操縦', en: 'Attitude instrument flying, scan, failures and automation',
    summary: '外が見えないときに計器だけで飛ぶ。姿勢と出力で飛ぶ考え方と計器の走査、計器の故障と情報の独立性、部分パネル、六つの計器と真空系統の故障、G1000 型の計器飛行の操作と自動操縦、不良姿勢からの回復。表示の数でなく、情報の元をたどって判断できるようにする。',
    secs: [
      { id: 'ifr.scan', t: '姿勢による計器飛行とスキャン', scope: 'common', from: ['kiso12.4', 'kiso12.5', 'kiso12.6', 'kiso12.7', 'kiso04.11'], jcab: ['cpl.3.1.3.5', 'ir.1.1.2.4'], faa: ['IR.IV.A.K1', 'IR.IV.A.K2'], h: () => `
${bk.aim('外が見えないときに、PFD（primary flight display）などの計器だけで姿勢と出力を決めて飛ぶ基本を覚えます。課目 i1 の内容です。')}
${FIG.scan()}
<p>雲の中など外が見えないと、体の感覚は当てになりません。計器飛行（instrument flight）では、<b>姿勢表示を中心に</b>目を動かし、姿勢と出力で飛行機を動かします。この飛び方が基本計器飛行（basic attitude instrument flying）です。</p>
<h3>操作の計器と性能の計器（IFH 第 6 章）</h3>
<ul><li><b>操作の計器（control instruments）</b>：姿勢指示器（水平儀、attitude indicator）と出力の計器です。これで動かします。</li>
<li><b>性能の計器（performance instruments）</b>：速度・高度・昇降率などです。結果を確かめます。</li>
<li><b>航法の計器（navigation instruments）</b>：コースの針・距離などです。</li></ul>
<p>姿勢と出力を決め、トリム（trim）で力を消し、性能の計器で結果を確かめて、小さく直します（IFH 第 6 章）。計器の動きには遅れがあるので、直したら変化を待ちます。初めは、姿勢表示から 1 つの計器へ行って戻る、放射状の計器の走査（スキャン、instrument scan）を使います。</p>
<h3>旋回の速さ</h3>
<p>標準旋回（標準率旋回、standard-rate turn）は、1 秒に 3°、1 分で 180° 回る旋回です。同じバンクでも、真対気速度（true airspeed）が大きいほど旋回率（rate of turn）は小さくなります。バンクの目安は真対気速度の 15% で、100 kt なら約 15° です（IFH 第 7 章）。</p>
${bk.deep('走査の型・よくある間違い・水平に移る先読み・許容幅', `<p>IFH 第 6 章は、走査の型を 3 つ挙げています。放射状（selected radial）では、時間の 80〜90% は姿勢指示器を見て、ほかはちらっと見るだけです。目はいつも姿勢指示器を通って動きます。逆 V 字（inverted-V）は、姿勢指示器と旋回傾斜計（ターンコーディネーター、turn coordinator）を行き来します。姿勢指示器と昇降計（vertical speed indicator）の間も行き来します。長方形（rectangular）は、上の 3 つと下の 3 つを順に回ります。どれも同じ重みで見るので、大事な計器へ戻るのが遅れます。慣れたら、場面に合わせて見る順と速さを変えます。</p>
${bk.t(['よくある間違い（IFH 第 6 章）', '例'], [['固着（fixation）', '1 つの計器を見つめ続ける（方位だけを見ていて、高度が下がる）'], ['省略（omission）', 'クロスチェックから計器を抜かす（旋回中に速度を見ない）'], ['偏り（emphasis）', '1 つの計器を信じすぎて、ほかと比べない']])}
<p>上昇や降下から水平に移るときは、目標の高度の手前で始めます。目安は昇降率の 10% で、500 fpm なら 50 ft 手前です（IFH 第 7 章）。高度に着いたら、速度・針路（ヘディング、heading）・出力・トリムも確かめます。高度が合っていても、速度が減り続けていれば、まだ終わっていません。</p>
<p>機首が上を向いていることと、上昇していることは同じではありません。出力と速度によっては、機首上げの姿勢でも降下します。進む向きは、昇降計と高度計（altimeter）で確かめます。フライトディレクター（flight director）のバーは操縦の指示で、いまの姿勢そのものではありません。</p>
<p>G1000 型の PFD では、方位の上のマゼンタの旋回率の表示で標準旋回に合わせます。バンクの目安には「速度 ÷ 10 ＋ 7」（IFH 第 4 章）もあります。下の表は、計算した値と 2 つの目安です。</p>
${FIG.standardRate()}
${bk.t(['許容幅', '高度', '針路', '速度', 'バンク'], [['計器飛行 ACS（IR.IV.A）', '±100 ft', '±10°', '±10 kt', '±5°'], ['自家用 ACS（PA.VIII。計器だけで飛ぶ基礎）', '±200 ft', '±20°', '±10 kt', '—（旋回は標準旋回、ロールアウト ±10°）']])}`)}
${bk.key('姿勢 → ほかの計器 → 姿勢 → …。いつも姿勢表示に戻る', '小さく直して、待って、確かめる', '標準旋回のバンクは、真対気速度の 15% が目安')}
${bk.jur('check.basic')}
${bk.recall('耳の奥の三半規管は、ゆっくりした傾きや長い旋回を感じません。これが空間識失調（spatial disorientation）の元です。', ['hf.body', '体がだまされるしくみ'])}
${bk.q('真対気速度 120 kt で標準旋回をしたい。バンクの目安は？', '約 18° です。真対気速度の 15%（120 × 0.15 ＝ 18）です。「速度 ÷ 10 ＋ 7」なら 19° で、ほぼ同じです（IFH）。')}
${bk.sim('フード（外が見えない）で、水平・標準旋回・上昇降下を練習します。このシミュレータの PFD には旋回率の表示がないので、バンクの目安と、方位が 10 秒で約 30° 変わることで確かめます。', ['i1', '基本計器飛行'])}` },
      { id: 'ifr.instr', t: '計器の故障の見分け方：表示の数より情報の元', scope: 'common', from: ['kiso04.17', 'kiso04.18', 'kiso04.27', 'kiso12.9'], faa: ['IR.II.C.K1', 'IR.IV.A.K3', 'IR.VII.D.K1', 'IR.VII.D.K2'], h: () => `
${bk.aim('計器が故障したときに、それに気づいて、どの情報を信じるかを決められるようにします。')}
<p>G1000 型では、エアデータコンピューター（air data computer、ADC）が速度・高度・昇降率を計算します。姿勢と方位は、姿勢方位基準装置（attitude and heading reference system、AHRS）が計算します。</p>
${bk.t(['故障する装置', 'PFD の表示', '代わりに使うもの'], [
  ['ADC', '速度・高度・昇降率に赤い ×', '予備計器（standby instruments）の速度・高度・昇降率'],
  ['AHRS', '姿勢と方位に赤い ×', '予備計器の姿勢・磁気コンパス（コンパス、magnetic compass）・GPS の航跡（トラック、track）'],
  ['電気', '電圧低下の警告。電池が減ると画面が消えていく', '非常用バッテリーで動くもの（機体ごとに違う）']])}
<p>故障に気づく鍵はクロスチェックです。<b>同じ値を示す計器が多いほうを正しいとする多数決では決めません</b>。同じ情報源の計器は、そろって同じように間違えるからです（PHAK 第 8 章）。姿勢と出力から予想される動きと比べ、別の情報源の表示とも比べます（GPS の対地速度（groundspeed）など）。</p>
<p>Archer III の POH（操縦士用の機体の手引書、pilot's operating handbook）を見ます。左翼の下の 1 本の管が、ピトー管（pitot tube）と、静圧（static pressure）を取る静圧孔（static port）を兼ねます。そこから ADC と予備計器の両方へ管がつながります（POH 7.21）。だから詰まりは、PFD と予備計器に同じように出ます。予備計器が役に立つのは、ADC そのものが故障したときです。</p>
${bk.deep('画面の切り替え・故障を整理する 4 つの問い・速度計が信用できないとき', `<p>表示を別の画面に移す切り替え（リバージョン）は、画面の故障には効きます。しかし元のセンサーが誤っていれば、別の画面でも誤ったままです。自動操縦も同じ情報を使うので、作動中だからといって安心できません。下の写真の旅客機は、席ごとに別の静圧孔を使い、情報の元を分けています。</p>
${bk.photo('ch04-photo2')}
<p>異常に気づいたら、次の 4 つを分けて整理します。① 機体を安定させるのに使える情報、② 使うなと示された情報、③ 独立して照らし合わせられる情報、④ その情報に頼る自動化、です。高度が止まり、昇降計が 0 で、速度もおかしいなら、共通の静圧源が候補です。ただし表示だけで詰まりと決めつけず、反対の証拠も残します。</p>
<p>速度計が信用できないときは、決まった姿勢と出力で飛びます。姿勢と出力から性能が決まるからです（IFH 第 6 章）。下の表は、この教材の Archer の 3,000 ft での例です（教材値）。進入は、フラップ（flaps）を 40° 下げた形です。上昇の 76 KIAS は POH の Vy です（参考値：POH）。実機の値は、POH と学校の手順で確かめます。</p>
${bk.t(['飛び方（教材値）', '速度', 'ピッチ', '回転数'], att4().map(r => [r.name, `${r.kt} kt`, `${f1(r.pitch)}°`, `${f0(r.rpm)} rpm`]))}`)}
${bk.key('同じ情報源の計器は多数決にしない。別の情報源と比べる', '詰まりは予備計器にも出る（同じピトー静圧管）。予備計器が助けになるのは ADC の故障のとき', '赤い × は「その表示を使うな」の合図')}
${bk.recall('ピトー管が詰まると速度計が、静圧孔が詰まると速度計・高度計・昇降計が狂います。代替静圧源（alternate static source）に切り替えると、少し多め・高めに表示します。', ['sys.g1000', 'ピトー静圧と計器の表示'])}
${bk.q('上昇の姿勢と出力にしたのに、高度計が止まり、昇降計も 0 のまま。速度の表示だけが減っていく。何を疑う？', '静圧の詰まりを疑います。高度計・昇降計・速度計は同じ静圧を使うので、そろって狂います。予備計器も同じ管なら同じように狂うので、GPS の高度や対地速度など、別の情報源と比べます。代替静圧源に切り替え、管制に伝えます（PHAK 第 8 章）。')}` },
      { id: 'ifr.partial', t: '部分パネル（姿勢・方位の故障）', scope: 'common', faa: ['IR.IV.A.K3', 'IR.VII.D.K1', 'IR.VII.D.K2'], h: () => `
${bk.aim('姿勢と方位の表示が使えなくなったときに、残った計器で飛べるようにします。課目 i3 の内容です。')}
<p>AHRS が故障すると、PFD の姿勢と方位に赤い × が出ます。残るのは、<b>予備の姿勢指示器</b>・速度・高度・昇降率と、<b>磁気コンパス</b>（GPS が使えれば航跡も）です。残った計器で飛ぶことを、部分パネル（partial panel）と呼びます。</p>
<ol><li><b>認める</b>：「AHRS failure」と声に出し、予備計器に目を移します。</li><li><b>姿勢を保つ</b>：予備の姿勢指示器で翼を水平にし、高度計と昇降計でピッチを決めます。</li><li><b>方位</b>：磁気コンパスは、旋回中・加速や減速中に誤差が出るので、<b>翼を水平にして落ち着いてから</b>読みます。旋回は浅く、または<b>時間で旋回</b>します（標準旋回なら 90° で 30 秒）。旋回率の表示も使えないときは、予備の姿勢指示器で標準旋回のバンクを保ちます。</li><li><b>伝える</b>：計器飛行中なら管制に伝えます（ジャイロを使わない誘導、no-gyro を頼めます）。</li></ol>
${bk.key('赤い × を見たら、予備計器へ目を移す', 'コンパスは、翼を水平にして落ち着いてから読む', '時間で旋回：標準旋回で 90° ＝ 30 秒')}
${bk.recall('北半球では、北へ向かう旋回は早めに止め、南へ向かう旋回は行き過ぎてから止めます（UNOS）。東西の向きで加速すると北へ、減速すると南へ回ったように見えます（ANDS）。', ['sys.compass', '磁気コンパスと予備計器'])}
${bk.q('北半球で、北向きへ左旋回して、磁気コンパスで止めるときは？', '目標の手前で止めます（UNOS：Undershoot North）。北へ向かう旋回では、コンパスが遅れて動くからです。南へ向かうときは、行き過ぎてから止めます。')}
${bk.sim('飛行中に AHRS が故障します。予備計器と、残った速度・高度・昇降率・航跡で飛びます。この教材の課目 i3 では、MFD の航跡（TRK）を見て旋回を止めます。', ['i3', '部分パネル'])}` },
      { id: 'ifr.vacuum', t: '六つの計器と真空系統の故障', scope: 'common', from: ['kiso04.10'], jcab: ['cpl.1.6.3.3'], faa: ['IR.II.B.K1', 'IR.VII.D.K2'], h: () => `
${bk.aim('昔からの計器盤で、方向指示器（定針儀、heading indicator）などの計器が何で動くかを知り、真空系統の故障に気づいて飛び続けられるようにします。')}
${FIG.vacuumSixPack()}
<p>昔からの小型機の姿勢指示器と方向指示器は、エンジンが回す真空ポンプの空気でジャイロを回します。旋回傾斜計は電気で回します。動かす元を分けて、1 つが止まってもバンクの情報が残るようにしています（PHAK 第 8 章）。真空の強さは吸引計で見て、ふつう 4.5〜5.5 inHg です（PHAK 第 8 章）。</p>
<p>真空ポンプが止まっても、ジャイロはすぐには止まりません。回転が落ちながら、表示がゆっくりずれます。水平に飛んでいるのに、姿勢指示器が旋回を示すこともあります（IFH 第 11 章）。真空の警告のない小型機も多いので、吸引計も走査に入れます。</p>
<ol><li><b>見つける</b>：姿勢指示器を、旋回傾斜計と昇降計と比べます（IFH 第 11 章）。</li>
<li><b>使わない</b>：狂った 2 つの計器を、紙などで隠します（IFH 第 11 章）。</li>
<li><b>飛ぶ</b>：バンクは旋回傾斜計、ピッチは高度計・昇降計・速度計で決めます。方位は、磁気コンパスと時間の旋回で保ちます。</li>
<li><b>伝える</b>：状況が悪くなる前に管制に伝え、要るなら緊急を宣言します（IFH 第 11 章）。</li></ol>
${bk.deep('ジャイロのずれと、飛ぶ前の確かめ', `<p>方向指示器は、ジャイロの軸の摩擦による歳差（precession）で、少しずつずれます。地球の自転だけでも、1 時間に最大 15° ずれます。だから約 15 分ごとに、翼を水平にして速度が一定のときに、磁気コンパスに合わせ直します（PHAK 第 8 章）。地磁気で自動的に合う型（HSI など）は、合わせ直さずに使えます。</p>
<p>飛ぶ前は、始動のあと約 5 分待ってジャイロの回転を上げます。離陸（takeoff）の前に、滑走路の向きと方向指示器の差が 5° 以内かを確かめます。地上滑走（taxi）の旋回で姿勢指示器が 5° より大きく傾くなら、その計器は信用できません（IFH 第 5 章）。</p>
<p>吸引計の値が正常でも、計器そのものの故障までは否定できません。電源が切れても回転がしばらく残る計器は、すぐには止まらず、精度だけが落ちていきます。</p>`)}
${bk.judge('姿勢指示器だけがほかと違うときは、旋回傾斜計と昇降計で翼を水平に保ちます', '原因を探し続けるより、機体を安定させて助けを求めるのが先です')}
${bk.key('姿勢指示器と方向指示器は真空、旋回傾斜計は電気で動く', '真空の故障は表示がゆっくりずれるので、気づきにくい', '姿勢指示器を、旋回傾斜計と昇降計と比べて見つける')}
${bk.recall('回るこまは、軸の向きを保とうとします。力を受けると、90° ずれた向きに傾きます。', ['inst.gyro', 'ジャイロ計器と旋回計'])}
${bk.q('雲の中で、姿勢指示器はゆっくり右へ傾いていくのに、旋回傾斜計は水平で、昇降計は 0 です。何を疑い、どうする？', '真空系統の故障を疑います。姿勢指示器と方向指示器は真空で、旋回傾斜計は電気で動くからです。姿勢指示器を隠し、旋回傾斜計で翼を水平に保ち、高度計と昇降計でピッチを決め、管制に伝えます（IFH 第 11 章）。')}` },
      { id: 'ifr.auto', t: 'G1000 型の計器飛行の操作と自動操縦', scope: 'common', from: ['kiso12.10'], faa: ['IR.IV.B.K4', 'IR.VI.A.K2', 'IR.VI.B.K2'], h: () => `
${bk.aim('針路・航跡・偏位を分けて読み、CDI の航法源と表示を確かめ、自動操縦で進入するときの使い方と切り方を覚えます。')}
${FIG.navReadout()}
<p>針路（ヘディング、heading）は機首の向き、航跡は地面の上を進む向きです。風があれば、2 つは一致しません。偏位は、選んだコースから左右にどれだけ離れているかです。機首をコースの数字に合わせるだけでは、コースに乗れません。</p>
<p>コース偏位指示器（course deviation indicator、CDI）が示すのは、選んだ航法源とコースに対する位置です。G1000 型では、CDI のボタンで GPS・VOR／LOC 1・VOR／LOC 2 を切り替えます。ILS と LOC の進入は、LOC を航法源にして飛びます。LNAV+V は LNAV の進入に参考の縦の誘導を足した表示で、最低気象条件は LNAV の MDA のままです（G1000 の手引き）。</p>
<h4>自動操縦で進入する</h4>
<p>Archer III の POH の補足（自動操縦の一例）を見ます。LPV や LNAV/VNAV の縦の誘導に乗るには、会合の前に APR のモードを選びます。自動操縦は DA で水平にならず、降り続けます。だから DA か MAP で、地上 200 ft より下にならないうちに切り、手で着陸か進入復行（missed approach）をします（POH 補足 2）。LOC や GS の電波を失って表示が点滅したら、すぐ進入復行します（POH 補足 2）。</p>
${bk.deep('航法源の自動の切り替え・CDI の目盛り・GPS の進入のモード', `<p>Cessna 機の G1000 の手引きの例では、次の 4 つがそろうと、CDI が GPS から LOC へ自動で切り替わります。</p>
<ol><li>ILS か LOC の進入が、飛行計画（flight plan）に入っています。</li><li>FAF への区間が今の区間で、FAF まで 15 NM 未満に近づいています。</li><li>正しい LOC の周波数が合っています。</li><li>GPS の CDI のずれが、いっぱいの振れの 1.2 倍より小さくなっています。</li></ol>
<p>条件が欠ければ切り替わらないので、CDI の表示で確かめます。同じ手引きの例では、GPS の CDI のいっぱいの振れは、出発（DPRT）と進入復行（MAPR）で 0.3 NM です。空港のまわり（TERM）で 1.0 NM、航空路（ENR）で 2.0 NM で、進入では 1.0 NM から狭くなります。</p>
<p>Archer III の POH の補足の自動操縦のモードは、HDG・NAV・GPSS・APR です。進入復行のあとは、形態を直して安定した上昇に入ってから、自動操縦を入れ直します。待ちのモード（白）のうちは、まだ誘導に乗っていません。</p>
<p>米国の AIM 1-1-17 は、GPS の進入のモードが FAF の 2 NM 手前までに作動しなければ、MDA へ降りずに MAP まで飛んで進入復行するとしています。DME の距離は局までの斜めの距離で、GPS のウェイポイントまでの距離と同じとは限りません。</p>`)}
${bk.judge('自動操縦が何を保ち、次にどう動くかを言えないときは、自動化の段を下げて手で飛びます', '低い高度で設定を探し続けません')}
${bk.key('針路・航跡・偏位は別。偏位は選んだ航法源とコースに対する位置', 'ILS と LOC は LOC を航法源に。CDI の表示で確かめる', '自動操縦は DA で水平にならない。DA で切って手で着陸か進入復行')}
${bk.recall('FD は指示を見せるだけで、AP はサーボで舵を動かします。作動中のモードは緑、条件待ちは白で出ます。', ['inst.ap', '自動操縦の入口'])}
${bk.q('GPS で飛んできて、ILS の進入に入る。FAF の手前で CDI の表示が GPS のままだった。どうする？', '航法源を LOC に切り替え、識別符号を聞いて、ローカライザー（LLZ、localizer）の針で飛びます。GPS のままでは ILS の最低気象条件で飛べません。間に合わず不安定なら、進入をやめて管制に伝えます（G1000 の手引き）。')}` },
      { id: 'ifr.upset', t: '不良姿勢（異常姿勢）からの回復', scope: 'common', jcab: ['ir.1.1.2.4'], faa: ['IR.IV.B.K1', 'IR.IV.B.K2'], h: () => `
${bk.aim('機首が大きく上がっている・下がって旋回しながら加速している、という不良姿勢（異常姿勢、unusual attitude）から、正しい順番で戻れるようにします。課目 i2 の内容です。')}
<p>FAA は、意図せずに機首上げ 25° を超える・機首下げ 10° を超える・バンク 45° を超える状態を「アップセット」と呼びます（AFH 第 5 章）。気づいたら、原因ではなく、<b>いまどちらの状態か</b>をすぐに判断します。速度計・姿勢表示・高度計・昇降計を素早く見ます（IFH 第 7 章）。</p>
${bk.t(['状態', '見分け方', '回復の順番'], [
  ['機首上げ・速度が減る', '姿勢が上・速度が減っている・高度が増えている', '① <b>出力を上げる</b>（減速の程度に合わせて） ② <b>機首を下げる</b>（失速（stall）させない） ③ 翼を水平に（IFH 第 7 章）'],
  ['機首下げ・速度が増える（スパイラル）', '姿勢が下で大きく傾いている・速度が増えている・高度が急に減る', '① <b>出力をアイドル</b> ② <b>少し押して荷重を抜く</b> ③ 翼を水平に ④ 機首をゆっくり水平まで上げる ⑤ 速度が落ち着いたら上昇の出力（AFH 第 5 章）']])}
<p>スパイラルで、傾いたまま急に引くと、旋回がきつくなって荷重が増え、高度もさらに失います。速度が大きいので、機体を壊す危険があります。AFH は、翼を水平にする前に少し押して、荷重を約 1 G に戻すことをすすめています。失速していたら、先に失速から回復します（AFH 第 5 章。${bk.see('ops.stall', '失速からの回復（stall recovery）')}）。</p>
<p>Archer III の POH の運動速度は、最大運用運動速度（V<sub>O</sub>、maximum operating maneuvering speed）です。2,550 lb で ${AR.va} KIAS、1,917 lb で 98 KIAS で、軽いほど小さくなります（POH 2.3）。V<sub>O</sub> より速いときは、舵をいっぱいに、また急に使いません。超過禁止速度（never-exceed speed、V<sub>NE</sub>）は ${AR.ne} KIAS、制限荷重は普通類で +3.8 G です（POH）。</p>
${bk.key('まず判断：機首上げで速度が減っているか、機首下げで速度が増えているか', '機首上げ：出力 → 機首を下げる → 翼を水平', 'スパイラル：アイドル → 少し押す → 翼を水平 → ゆっくり上げる')}
${bk.recall('思いがけない姿勢に気づいた瞬間は、驚愕（startle）で体が固まりやすくなります。まず状態を言葉にしてから、手順に入ります。', ['adm.review', '驚きと驚愕の基礎'])}
${bk.q('雲の中で、速度が増え、高度が下がり、姿勢が右に 40° 傾いて機首が下がっている。最初にすることは？', 'スパイラルです。まず出力をアイドルにし、少し押して荷重を抜いてから、翼を水平にし、それから機首をゆっくり上げます（AFH 第 5 章）。傾いたまま引いてはいけません。')}
${bk.sim('不良姿勢を 2 つ（機首上げ・スパイラル）から回復します。', ['i2', '異常姿勢からの回復'])}` },
    ],
    terms: [['Attitude instrument flying', '姿勢による計器飛行', '基本計器飛行'], ['Control / Performance instruments', '操作の計器・性能の計器', 'IFH 第 6 章'], ['Primary / Supporting instruments', '主な計器・補助の計器', ''], ['Cross-check / Scan', '計器の走査（スキャン）', '放射状・逆 V 字・長方形'], ['Fixation / Omission / Emphasis', '固着・省略・偏り', ''], ['Standard-rate turn', '標準旋回（3°/秒）', '真対気速度の 15% のバンク'], ['Partial panel', '部分パネル', ''], ['AHRS / ADC', '姿勢方位基準装置・エアデータコンピューター', ''], ['Red X', '赤い ×（故障の表示）', 'G1000'], ['Pitot tube / Static port / Drain hole', 'ピトー管・静圧孔・排水孔', ''], ['Alternate static source', '代替静圧源', ''], ['UNOS / ANDS', 'コンパスの旋回誤差・加速誤差の覚え方', ''], ['Unusual attitude / Spiral dive', '不良姿勢（異常姿勢）・スパイラル', ''], ['Spatial disorientation', '空間識失調', ''], ['Vacuum system / Suction gauge', '真空系統・吸引計', 'PHAK 第 8 章'], ['Precession', '歳差', '方向指示器のずれ'], ['Heading / Track / Course deviation', '針路・航跡・偏位', ''], ['Navigation source (GPS / LOC)', '航法源', 'CDI のボタンで切り替える'], ['LNAV+V', 'LNAV の進入に参考の縦の誘導', 'MDA のまま'], ['Upset', 'アップセット', 'AFH 第 5 章'], ['Maximum operating maneuvering speed (VO)', '最大運用運動速度', 'POH 2.3']],
    examples: ['真対気速度 100 kt で標準旋回 → バンク 約 15°（速度の 15%）。', '雲の中で速度が増え、高度が下がり、姿勢が右に 40° 傾いて機首下げ → スパイラル。アイドル → 少し押す → 翼を水平 → 機首を水平へ。', '真空系統の故障：姿勢指示器が右旋回を示すが、旋回傾斜計は水平・昇降計は 0 → 姿勢指示器を隠し、旋回傾斜計で翼を水平に。'],
    cautions: ['この教材の計器の故障（AHRS・GPS）は教材用の近似。実機の故障の表示と手順は、G1000 の Pilot\'s Guide と AFM 補足で確かめる。', 'シミュレータは体の感覚（錯覚）を再現しない。実機では、計器を信じる練習がもっと大切になる。', 'この教材のシミュレータには、真空系統の計器と自動操縦がない。六つの計器の故障と自動操縦の進入は体験できない。'],
    quiz: [
      { q: '静圧孔が詰まった。降下中の速度計は？', choices: ['実際より少なく表示', '実際より多く表示', '正しく表示', '0 を示す'], answer: 1, why: '詰まった高度の（低い）静圧が閉じ込められ、降下で外の圧力が上がってピトー側だけ増えるので、速度は多めに表示される（上昇では少なめ。PHAK 第 8 章）。' },
      { q: '機首下げ・速度増加・右に深く傾いている（スパイラル）。正しい回復の順番は？', choices: ['機首を上げる → 翼を水平 → 出力を下げる', '出力を下げる → 少し押して荷重を抜く → 翼を水平 → 機首を上げる', '出力を上げる → 機首を下げる → 翼を水平', '翼を水平 → 出力を上げる → 機首を上げる'], answer: 1, why: '傾いたまま引くと旋回が締まって荷重が増え、高度もさらに失う。アイドル、少し押して荷重を抜き、翼を水平にしてから機首を上げる（AFH 第 5 章）。' },
      { q: 'G1000 型の PFD で、姿勢表示と方位（HSI）に赤い × が出た。故障したのは？', choices: ['ADC', 'AHRS', 'GPS', 'トランスポンダー'], answer: 1, why: '姿勢と方位は AHRS が出している。ADC が故障すると、速度・高度・昇降率に赤い × が出る（G1000 の手引き。本文 ifr.instr）。' },
      { q: '姿勢による計器飛行で、飛行機を「操作する」計器（control instruments）はどれ？', choices: ['高度計と昇降計', '姿勢表示と出力の計器', '速度計と磁気コンパス', 'コースの針と距離'], answer: 1, why: 'IFH 第 6 章：操作の計器は姿勢と出力。速度・高度・昇降率などは結果を確かめる性能の計器。' },
      { q: 'ピトー管の入口だけが詰まり、排水孔は開いている。速度計はどうなる？', choices: ['0 に向かって下がる', '高度計のように動く', '正しく表示する', '止まる'], answer: 0, why: 'PHAK 第 8 章：入口だけなら、中の空気が排水孔から抜けて 0 へ。入口と排水孔の両方が詰まると高度計のように動く。' },
      { q: '真空ポンプが故障した昔からの計器盤で、狂っていくのはどの 2 つ？', choices: ['速度計と高度計', '旋回傾斜計と昇降計', '姿勢指示器と方向指示器', '磁気コンパスと時計'], answer: 2, why: '姿勢指示器と方向指示器は、エンジンの真空ポンプで回すジャイロ。旋回傾斜計は電気、速度計・高度計・昇降計は空気の圧力で動く（PHAK 第 8 章。本文 ifr.vacuum）。' },
      { q: 'G1000 型の機体で ILS 進入をする。CDI の航法源は？', choices: ['GPS のまま（GPS の目盛りで飛ぶ）', 'どれでもよい', 'VOR の局（周波数は何でもよい）', 'LOC（ILS の周波数を合わせた NAV）'], answer: 3, why: 'ILS と LOC の進入は LOC を航法源にして飛ぶ。条件がそろうと GPS から自動で切り替わる型もあるが、CDI の表示で確かめる（G1000 の手引き。本文 ifr.auto）。' },
      { q: 'FAA の定義で「アップセット」にあたるのは？', choices: ['バンク 30° の旋回', '機首上げ 15° の上昇', '意図しない、機首下げ 10° を超える姿勢', '速度 100 kt の水平飛行'], answer: 2, why: 'AFH 第 5 章：意図せずに機首上げ 25° 超・機首下げ 10° 超・バンク 45° 超、またはその内でも場面に合わない速度の状態（本文 ifr.upset）。' },
    ],
    written: [
      ['計器を決まった順に眺めるだけでは足りないのはなぜですか。', `走査の目的は、姿勢と出力が生む結果を読み、望む状態との差と、差が広がる速さを見つけることだからです。1 つの表示を見つめず、飛行の段階に合わせて大事な情報を照らし合わせ、直した結果も確かめます。${bk.see('ifr.scan', '姿勢による計器飛行とスキャン')}`, ['kiso12.q4']],
      ['速度の変化を見て、大きな操作を続けると何が起きますか。', `機体と計器の反応には遅れがあり、直しが重なって行き過ぎます。姿勢と出力を決め、変化を待って小さく直します。トリムは、決めた状態を保つための操縦の力を消すために使います。${bk.see('ifr.scan', '姿勢による計器飛行とスキャン')}`, ['kiso12.q5']],
      ['上昇を終えて、指定の高度に着きました。高度のほかに何を確かめますか。', `速度・針路・出力とトリム・昇降の傾向です。高度が合っていても、速度が減り続けていれば安定していません。水平に移るのは、昇降率の 10% ほど手前から始めます。${bk.see('ifr.scan', '姿勢による計器飛行とスキャン')}`, ['kiso12.q6']],
      ['標準旋回を続けると、180° 向きを変えるのに何秒かかりますか。', `180 ÷ 3 ＝ 60 秒です。標準旋回は 1 秒に 3° です。実際には旋回に入る時間と戻す時間があり、風で地面の上の形も変わります。${bk.see('ifr.scan', '姿勢による計器飛行とスキャン')}`, ['kiso12.q7']],
      ['2 つの画面が同じ値を示しています。その値を正しいと決めてよいですか。', `よくありません。同じ情報源や電源に頼っていれば、同じ誤りを示します。予備計器を含む独立した情報・出力・機体の動き・警告と照らし合わせ、その機体の故障の手順に従います。${bk.see('ifr.instr', '計器の故障の見分け方')}`, ['kiso12.q9']],
      ['コースの数字と同じ針路で飛んでいるのに、偏位が大きくなっていきます。何を考えますか。', `風で、航跡が針路とずれていると考えます。航法源・コース・TO/FROM・距離の基準も確かめ、偏位とその変化を見ながら、コースを保つ針路にします。${bk.see('ifr.auto', 'G1000 型の計器飛行の操作と自動操縦')}`, ['kiso12.q10']],
      ['高度が止まり、昇降計が 0、速度の表示もおかしくなりました。考えられる共通の原因と、決めつけないための整理を答えてください。', `共通の静圧源やエアデータの経路が候補です。ただし、表示だけで詰まりと決めつけません。見た事実・仮説・独立して照らせる情報・機体の手順が求める行動を分け、警告や反対の証拠も確かめます。${bk.see('ifr.instr', '計器の故障の見分け方')}`, ['kiso04.q27']],
    ],
    refs: [R.ifh, R.phak, R.phak8, R.afh, R.afh5, R.aim11, R.g1000, R.g1000pg, R.aah4, R.acsI, R.acsP, R.archerCk, R.archerPoh], lessons: ['i1', 'i2', 'i3'] });

  // ======================================================================= 第 4 部 第 33 章
  B.add({ id: 'ifrp', part: 'p4', t: '計器飛行方式：規則・出発・航空路・待機・進入', en: 'IFR rules, departures, en route, holding and approaches',
    summary: 'IFR で飛ぶための前提（計器飛行証明・飛行計画と許可）、燃料と代替飛行場、出発方式と上昇勾配、航空路の最低高度と報告・到着と降下の計画、待機経路、進入図の読み方、方式旋回、ILS 進入、RNAV と RNP、非精密進入と進入復行、周回進入、一便の判断。',
    secs: [
      { id: 'ifr.rules', t: 'IFR の規則の要点', scope: 'us', from: ['kiso12.1', 'kiso12.2', 'kiso12.3', 'kiso12.13', 'kiso12.22'], faa: ['IR.I.A.K1', 'IR.I.A.K2', 'IR.I.C.K4', 'IR.II.C.K2', 'IR.II.C.K3', 'IR.III.A.K1', 'IR.III.A.K3', 'IR.VII.A.K1'], h: () => `
${bk.aim('IFR で飛ぶときに守る規則を、出発前・飛行中・進入の場面ごとに整理します。')}
<p>計器飛行方式（instrument flight rules）は、飛び方の決まりです。天気の状態（IMC・VMC）とは別の軸です。晴れた日でも IFR で飛べます。IFR で機長（pilot in command）として飛ぶには、計器飛行証明（instrument rating）が要ります。VFR の最低気象条件より悪い天気で飛ぶときも同じです（61.3(e)）。管制空域（controlled airspace）を IFR で飛ぶときは、飛行計画（flight plan）を出します。管制承認（クリアランス、ATC clearance）も要ります（91.173）。</p>
${bk.t(['出発前の規則', '要点'], [
  ['燃料（91.167）', '最初に降りる予定の空港まで ＋（必要なら）代替飛行場（代替空港等、alternate airport）まで ＋ 通常の巡航速度で <b>45 分</b>'],
  ['代替飛行場が要るか（91.169）', '<b>1-2-3 ルール</b>：目的地に計器進入方式があり、到着予定の<b>前後 1 時間</b>の予報が雲の高さ <b>2,000 ft</b> 以上・視程 <b>3 SM</b> 以上なら、書かなくてよい'],
  ['最近の経験（61.57(c)）', '飛ぶ月の前の 6 暦月以内に、計器進入 6 回・待機（ホールディング、holding）・コースの会合と追跡。過ぎて 6 暦月を超えたら、計器技量審査（IPC、61.57(d)）']])}
<p>飛行中の許可は、聞く・理解する・復唱（readback）する・装置に入れる・確かめる、に分けます。書き取りの覚え方は <b>CRAFT</b> です（IFH 第 2 章）。分からない所は推測で埋めず、すぐ管制に確かめます（91.123）。</p>
<p><b>無線の故障（91.185）</b>：VFR の天気なら、VFR のまま早めに着陸します。IFR の天気なら、<b>経路</b>は指示 → 誘導の行き先 → 予告 → 飛行計画の順（AVEF）です。<b>高度</b>は区間ごとに、指示・最低 IFR 高度・予告のうち<b>最も高いもの</b>です。</p>
${bk.t(['進入の言葉', '意味'], [
  ['決心高度（decision altitude、DA）', '精密進入や垂直誘導付き進入（ILS・LPV など）で、降りながら判断する高度。滑走路の目印が見えなければ、すぐ進入復行（missed approach）'],
  ['最低降下高度（minimum descent altitude、MDA）', '非精密進入で、それより下へ降りてはいけない高度。進入復行点（missed approach point、MAP）までに目印が見えなければ進入復行']])}
${bk.deep('CRAFT と許可の例・降りてよい条件・視程・代替飛行場・無線の故障の時刻・装備と点検', `<p>準備では、人・機体・経路と天気の 3 つを別々に確かめます。ノータム（NOTAM）・進入図の有効期間・航法データベースの版も見ます。着陸できなかったあとの経路と燃料まで、つなげて計画します。</p>
<p>CRAFT は、Clearance limit（許可の限界点）・Route（経路）・Altitude（高度）の順です。そのあとに、Frequency（出発後の周波数）・Transponder が続きます。トランスポンダー（transponder）のコードまで書き取り、全部を復唱します。許可の例（架空）：“Archer Seven Lima Alpha, cleared to the LAB VOR via radar vectors, climb and maintain 3,000, departure frequency 119.75, squawk 4271.” → 復唱：“Cleared to the LAB VOR via radar vectors, climb and maintain 3,000, departure 119.75, squawk 4271, Archer Seven Lima Alpha.”</p>
${bk.t(['規則', '要点'], [
  ['DA・MDA より下へ降りる条件（91.175(c)）', '滑走路の目印（進入灯・滑走路端の灯・滑走路の標識など）がはっきり見え、決められた視程があり、予定の滑走路へ通常の降下率と操作で着陸できる位置にずっといるとき。進入灯だけが見えるときは、接地帯の 100 ft 上より下へは、赤い終端灯か赤い側灯も見えるまで降りない'],
  ['代替飛行場に選べる天気（91.169(c)）', '到着予定のときの予報が、精密進入（precision approach）のある空港は雲 600 ft・視程 2 SM、非精密進入（non-precision approach）だけの空港は雲 800 ft・視程 2 SM 以上（進入方式に別の決まりがあればそれ）。これは<b>計画に書ける条件</b>で、そこへ降りるときの最低気象条件ではない'],
  ['WAAS の GPS で代替飛行場を計画する（AIM 1-1-18）', 'LNAV か周回の最低気象条件で計画し、天気は非精密進入の基準（雲 800 ft・視程 2 SM）を使う。LPV や LNAV/VNAV の DA では計画しない（認められた気圧式 VNAV などの例外を除く）。着いたときに LPV などが使えれば、それで進入してよい。機体の AFM に別の制限があれば、そちらに従う'],
  ['承認の限界点を離れる時刻（91.185(c)(3)）', '限界点が進入の始まるフィックスなら、EFC（なければ、飛行計画の所要時間から出した ETA）にできるだけ近い時刻に降下と進入を始める。そうでなければ、EFC（なければ限界点に着いたとき）に限界点を離れて進入の始まるフィックスへ向かい、ETA にできるだけ近い時刻に降下と進入を始める'],
  ['IFR の装備（91.205(d)）', '昼と夜の装備に加え、経路に合う無線と航法の装置・旋回計・滑り計・規正できる高度計（altimeter）・秒の出る時計・十分な発電機（alternator）・姿勢指示器（水平儀、attitude indicator）・方向指示器（定針儀、heading indicator）'],
  ['点検（91.171・91.411・91.413）', 'VOR は 30 日以内の確かめ（地上の試験の電波か地上の点で ±4°、空中の点で ±6°）。静圧（static pressure）の系統と高度計は 24 暦月以内、トランスポンダーも 24 暦月以内の試験と点検']])}
<p>空港の視程の通報が条件を満たしても、機内から目印が見えなければ、DA・MDA より下へは降りられません。滑走路視距離（runway visual range、RVR）は、滑走路に沿って見通せる距離の値です。地上視程（ground visibility）や飛行視程（flight visibility）とは別の値です。換算の表は AIM 5-4-20 にあります。無線の故障のときのコード 7600 は、${bk.see('comm.nordo', '無線が使えないとき')}にあります。</p>`)}
${bk.key('出発前：計画と許可・燃料（45 分）・代替飛行場（1-2-3 ルール）を確かめる', 'DA で目印が見えなければ、すぐ進入復行。MDA では見えるまで降りず、MAP までに見えなければ進入復行', '無線の故障：VFR の天気なら早く着陸、IFR の天気なら経路は AVEF・高度は 3 つのうち最も高いもの')}
${bk.jur('ir.need', 'ir.recent', 'alt.transition', 'nordo.ifr', 'appr.ban')}
${bk.same('fuel.ifr')}
${bk.recall('IFR・VFR は飛び方の決まり、IMC・VMC は天気の状態で、別の軸です。', ['basics.rules', '飛行方式と気象状態は別の軸'])}
${bk.q('到着予定は 15:00。目的地（ILS あり）の予報は、14:00〜16:00 のあいだに雲の高さ 1,500 ft・視程 5 SM の時間がある。代替飛行場は要る？', '要ります。到着予定の前後 1 時間に、雲の高さが 2,000 ft 未満の時間があるからです（91.169 の 1-2-3 ルール）。燃料も、代替飛行場まで行ける分を足して積みます（91.167）。')}` },
      { id: 'ifr.dep', t: 'IFR の出発：出発方式と上昇勾配', scope: 'us', from: ['kiso12.14'], faa: ['IR.III.A.K1', 'IR.V.B.K1'], h: () => `
${bk.aim('IFR で離陸したあと、障害物を避けて航空路へつながる道（出発方式）と、決められた上昇勾配を対地速度（groundspeed）から確かめる方法を覚えます。')}
${FIG.climbGradient()}
<p>計器出発方式（instrument departure procedure、DP）は、離陸から航空路までの障害物を避ける、前もって決めた道です（AIM 5-2-9）。</p>
<ul><li><b>ODP（obstacle departure procedure）</b>：障害物を避ける方式です。管制が別の方式や誘導を指示しなければ、許可なしで飛べます。</li>
<li><b>SID（standard instrument departure）</b>：管制のための方式です。飛ぶ前に許可が要ります。</li></ul>
<p>ほかに書かれていなければ、出発は次を前提に守られます。滑走路の終わりを 35 ft 以上で越え、400 ft 上がるまで曲がらず、最低 IFR 高度まで 200 ft/NM 以上で上昇することです（AIM 5-2-9）。障害物があれば、もっと大きな勾配が書かれます。</p>
<p>上昇率は「勾配 × 対地速度 ÷ 60」で出します。同じ勾配でも、追い風で対地速度が増えると、要る上昇率は大きくなります。</p>
${bk.drill('Archer で 200 ft/NM を満たせるか', `<p>対地速度 80 kt で 200 ft/NM の勾配を飛ぶには、上昇率がいくら要りますか。Archer III の POH（操縦士用の機体の手引書、pilot's operating handbook）の上昇性能の例は、重量（weight）2,550 lb・気圧高度（pressure altitude）4,000 ft・19°C・76 KIAS で 487 ft/min です。この上昇率なら、勾配は何 ft/NM ですか（参考値：POH 第 5 章）。</p>`, `<p>要る上昇率は 200 × 80 ÷ 60 ≒ ${Math.round(200 * 80 / 60)} ft/min です。487 ft/min なら、勾配は 487 × 60 ÷ 80 ≒ ${Math.round(487 * 60 / 80)} ft/NM で、200 ft/NM を満たします。重い・暑い・高い所・追い風では、計算し直します。</p>`)}
${bk.deep('出発の許可の期限・低い障害物・エンジンの故障', `<p>管制塔のない空港では、許可に期限（clearance void time）が付けられます。その時刻までに離陸できなければ、できるだけ早く管制に意図を伝えます。期限から 30 分以内に連絡がないと、捜索救難が始まります。期限を過ぎて離陸すると、IFR の間隔は取られません。91.173 は、管制空域で IFR で飛ぶ前に許可を求めています（AIM 5-2-7）。</p>
<p>ODP の図には、題に (OBSTACLE) と書かれます。「Takeoff Minimums and (OBSTACLE) Departure Procedures」には、低く近い障害物の注記があります。上昇でかわせないときは、目で見てよけます。そのためには、雲高（シーリング、ceiling）300 ft・視程 1 NM 以上が要ることがあります（AIM 5-2-9）。</p>
<p>200 ft/NM の勾配は、40:1 の障害物の面より 48 ft/NM 以上の余裕を残します（IPH 第 1 章）。出発方式は、エンジンが止まったときの性能と経路までは守りません。双発機の片発の計画は、機体と運航の方法で別に作ります。</p>`)}
${bk.judge('勾配が書かれた出発では、その日の重量・気温・風で、要る上昇率を出してから離陸します', '満たせないなら、別の滑走路・別の出発・天気が良くなるのを待つ、のどれかにします')}
${bk.key('ODP は障害物を避ける方式、SID は管制のための方式で許可が要る', '標準の上昇勾配は 200 ft/NM。上昇率＝勾配 × 対地速度 ÷ 60', 'ほかに書かれていなければ、400 ft 上がるまで曲がらない')}
${bk.jur('appr.ban')}
${bk.recall('IFR の許可は、許可の限界点・経路・高度・周波数・コードの順に書き取ります（CRAFT）。', ['ifr.rules', 'IFR の規則の要点'])}
${bk.q('対地速度 120 kt で、300 ft/NM の勾配が要る出発。要る上昇率は？', '600 ft/min です。120 kt は毎分 2 NM なので、300 × 2 ＝ 600 です。同じ勾配でも、速いほど大きな上昇率が要ります。')}` },
      { id: 'ifr.enr', t: '航空路と到着：最低高度・報告・降下の計画', scope: 'us', from: ['kiso12.15', 'kiso12.17'], faa: ['IR.I.C.K1', 'IR.I.C.K2', 'IR.III.A.K1', 'IR.V.B.K1', 'IR.V.B.K2'], h: () => `
${bk.aim('航空路で守る最低の高度と巡航の高度、管制に自分から伝えること、到着の方式と降下の計画を覚えます。')}
${FIG.enrouteAlts()}
<p>航空路には、区間ごとに最低の高度があります（IPH 第 2 章）。最低経路高度（最低航空路高度、minimum en route altitude、MEA）は、航法の電波が受かる高度です。障害物からも離れます。MOCA（minimum obstruction clearance altitude）も障害物からは離れます。しかし電波は、VOR から 22 NM 以内でしか保証されません。両方あれば、VOR から 22 NM 以内に限って MOCA まで下りてよい（91.177）のです。</p>
<p>決まった高度がない所では、コースから水平 4 NM 以内の最も高い障害物を見ます。その 1,000 ft（山岳地は 2,000 ft）上以上で飛びます（91.177）。巡航の高度は、管制空域では管制が指示した高度です。管制空域の外で 18,000 ft MSL 未満なら、磁航路（magnetic course）で決めます。0〜179° は奇数千 ft、180〜359° は偶数千 ft です（91.179）。</p>
<p>予報になかった天気と、安全に関わることは、聞かれなくても管制に伝えます（91.183）。標準計器到着方式（STAR：standard terminal arrival）は、航空路から進入へつなぐ道です。STAR を含む許可でも、降下の許可（“descend via” など）までは最後に指示された高度を保ちます（AIM 5-4-1）。</p>
<p>降下の計画は、失う高度・残りの距離・対地速度で考えます。4,000 ft を 500 ft/min で降りると 8 分かかり、対地速度 120 kt なら 16 NM 進みます。追い風が強いと、進む距離は長くなります。</p>
${bk.deep('MRA と MCA・自分から伝えることの一覧・STAR から外れたとき・ジェット機の目安', `<p>MRA（minimum reception altitude）は、フィックスを決める電波が受かる最低の高度です。MCA（minimum crossing altitude）は、その高度以上で越えるフィックスです。高い最低高度の区間に入るときは、その点を過ぎたらすぐ上昇を始めます（91.177）。航法・進入・通信の装置の故障も、すぐ伝えます（91.187）。</p>
${bk.t(['いつも伝える（AIM 5-3-3）', 'レーダーで見られていないとき'], [
  ['指示された高度を離れるとき', '位置通報点の通過（時刻と高度）'],
  ['500 ft/min 以上で上昇・降下できないとき', '非精密進入の FAF を内向きに過ぎたとき'],
  ['進入復行をしたとき', '前に伝えた到着予定の時刻が 2 分より大きくずれたとき'],
  ['真対気速度（true airspeed）が計画から 5% または 10 kt（大きい方）変わったとき', '—'],
  ['待機のフィックスに着いたとき（時刻と高度）・離れるとき', '—']])}
<p>誘導などで STAR から外れたら、その STAR は取り消されたと考えます（AIM 5-4-1）。ジェット機の降下の計画では、1,000 ft 降りるのに 3 NM という目安が使われます（IPH 第 3 章）。小型機には、そのまま使いません。</p>`)}
${bk.judge('燃料・風・目的地の天気が計画から外れたら、変える余地があるうちに決めます', '直行の許可では、画面の線だけでなく、途中の地形・最低高度・燃料を確かめます')}
${bk.key('MEA は電波と障害物の両方、MOCA は障害物だけ（電波は VOR から 22 NM 以内）', '管制空域の巡航高度は管制の指示。STAR でも降下の許可までは高度を保つ', '降下の計画：時間＝失う高度 ÷ 降下率、距離＝対地速度 × 時間')}
${bk.recall('VFR の巡航高度（91.159）は、IFR の千 ft ちょうどの高度に 500 ft を足した高度です。', ['comm.arrive', '帰りの交信と VFR の巡航高度'])}
${bk.q('管制空域の外を、磁航路 135° で、IFR で巡航する（18,000 ft MSL 未満）。選べる高度は？', '奇数千 ft です。3,000・5,000・7,000 ft などです（91.179）。管制空域なら、管制が指示した高度です。')}` },
      { id: 'ifr.hold', t: '待機経路（ホールディング）', scope: 'common', from: ['kiso12.16'], jcab: ['ir.1.1.2.4'], faa: ['IR.III.B.K1'], h: () => `
${bk.aim('管制の順番待ちなどで使う待機経路の形と、入り方・時間・標準旋回（standard-rate turn）・風の直し方を覚えます。課目 i4 の内容です。')}
${FIG.holding()}
<p><b>待機（ホールディング、holding）</b>は、決まった点（フィックス：VOR 局など）の近くで待つ飛び方です。形は、決まったレーストラックです（米国の AIM 5-3-8）。フィックスへ向かうインバウンドと、反対向きのアウトバウンドを、2 回の 180° 旋回でつなぎます。<b>インバウンドはフィックスで終わります</b>。標準は右回りです。</p>
<h3>入り方</h3>
<p>フィックスに着いたときの機首方位で、3 つの入り方から選びます。区域は、インバウンドコースの延長と、フィックスを通る「70° の線」で分けます。</p>
${bk.t(['入り方', '飛び方（米国の AIM 5-3-8）'], [
  ['ダイレクト（direct）', 'フィックスへ飛び、待機の向きに旋回してアウトバウンドへ'],
  ['ティアドロップ（teardrop）', 'フィックスを過ぎたら、アウトバウンドから 30° 内側へ 1 分飛び、旋回してインバウンドに乗る'],
  ['パラレル（parallel）', 'フィックスを過ぎたら、外側をアウトバウンドと平行に 1 分飛び、待機の側へ 180° より大きく旋回して戻る']])}
<p>課目 i4 は、西からインバウンドコース 090° の上を飛んで LAB VOR へ来るので、ダイレクトです。VOR では、局を通過して <b>TO/FROM の表示が初めて完全に入れ替わったとき</b>に、アウトバウンドへの旋回を始めます（米国の AIM 5-3-8）。</p>
<h3>時間・速度・旋回・風</h3>
${bk.t(['項目', '内容（米国の AIM 5-3-8）'], [
  ['インバウンドの長さ', '14,000 ft MSL 以下は <b>1 分</b>、それより上は 1.5 分。<b>インバウンドが 1 分になるように、アウトバウンドの時間を変える</b>'],
  ['速度（指示対気速度（indicated airspeed））', '最大の速度は、高度ごとに下の日米の囲みのとおり。固定翼機は 90 kt 以上がすすめられている（課目 i4 は 100 kt）'],
  ['旋回', 'バンクの上限は、下の日米の囲みのとおり。課目 i4 は標準旋回で回る'],
  ['風', '<b>アウトバウンドの修正はインバウンドの約 3 倍</b>：インバウンドで左へ 8° なら、アウトバウンドは右へ 24°']])}
<p>待機の区域は、決められた速度と旋回で飛ぶことを前提に守られます。速すぎると旋回が大きくなり、区域の外へ出ます。待つ間も残りの燃料と次の手を更新し、燃料の心配は早めに管制に伝えます。</p>
${bk.deep('待機の指示・DME・GPS の待機・時間の測り始め・許容幅', `<p>待機の指示では、待機する側・フィックス・コース・次の許可の予定時刻（EFC）などが伝えられます。フィックスまで 3 分以内になったら、待機の速度に減らします（米国の AIM 5-3-8）。</p>
${bk.t(['項目', '内容（米国の AIM 5-3-8）'], [
  ['左回り', '管制の指示があるときか、チャートに左回りで描かれているときだけ。そのときは向きも伝えられる'],
  ['DME・GPS（RNAV）の待機', '時間の代わりに距離（NM）で決め、区間の長さが伝えられる。終わりは DME か GPS の距離で決める（例：局へ向かうインバウンドで、フィックスが 10 NM・区間が 5 NM なら、DME 15 NM でアウトバウンドが終わる）'],
  ['時間の測り始め', 'アウトバウンドの時間は、フィックスの上か真横（abeam）の遅い方から。真横がわからなければ、アウトバウンドへの旋回が終わったときから'],
  ['入り方の境', '±5° はどちらの入り方でもよい'],
  ['旋回のバンクの目安', '100 kt の標準旋回は、真対気速度の 15% の目安でバンク約 15°（課目 i4 は「速度 ÷ 10 ＋ 7」の 17°）']])}
<p>計器飛行 ACS（Holding Procedures）の許容幅は、速度 ±10 kt・高度 ±100 ft です。針路（ヘディング、heading）は ±10°、コースは CDI の 3/4 以内です。課目 i4 の基準は、アウトバウンド 60 ±15 秒・旋回率（rate of turn）3 ±1 °/秒・高度 ±100 ft です。</p>
${bk.photo('ch12-photo2')}`)}
${bk.key('フィックスに着く前に「入り方・アウトバウンドの針路・時間」を声に出して決める', 'インバウンドが 1 分になるように、アウトバウンドの時間を変える', 'アウトバウンドの偏流修正は、インバウンドの約 3 倍')}
${bk.jur('hold')}
${bk.q('インバウンドで右へ 6° 直して飛ぶと、コースに乗れた。アウトバウンドでは、どちらへ何度くらい直す？', '左へ約 18° です。アウトバウンドの修正は、インバウンドの約 3 倍で、向きは反対になります（米国の AIM 5-3-8）。次のインバウンドが 1 分より長ければ、アウトバウンドを短くします。')}
${bk.sim('LAB VOR を基準に、インバウンド 090° の右回りの待機（ダイレクトで入る）を飛びます。', ['i4', '待機経路'])}` },
      { id: 'ifr.chart', t: '進入図の読み方：架空の LAB ILS RWY 36', scope: 'us', from: ['kiso12.12', 'kiso12.18'], jcab: ['ir.1.1.1.3'], faa: ['IR.I.C.K1', 'IR.VI.A.K1', 'IR.VI.B.K1'], h: () => `
${bk.aim('進入の前のブリーフィング（briefing）で使う進入図（approach chart）の読み方を、架空の LAB の模式図で覚えます。')}
${FIG.labIlsChart()}
<p><b>進入図</b>は、上から 4 つの欄に分かれます。ブリーフィングの欄・<b>平面図</b>（plan view）・<b>断面図</b>（profile view）・<b>最低気象条件</b>の欄です（IFH 第 1 章）。図の LAB ILS RWY 36 は、読み方を学ぶための架空の進入図です。</p>
<p>計器進入は、初期・中間・最終・進入復行の区間に分かれます。区切りは IAF（初期進入フィックス）と IF（中間進入フィックス）です。最終進入は、最終進入フィックス（final approach fix、FAF）から始めます（14 CFR 97.3）。まず方式の名前と有効期間を確かめ、似た名前の別の方式でないかを見ます。</p>
${bk.t(['欄', '読むこと（架空の LAB ILS RWY 36）'], [
  ['ブリーフィングの欄', 'ローカライザー（LLZ、localizer）の周波数と識別（I-LAB 109.90）・最終進入コース（360°）・グライドスロープ（glide slope）の角度（3.00°）・進入復行の手順・装備や気温の注記'],
  ['平面図', '最終進入コースと施設（LAB VOR 113.50）、進入復行の経路と待機、最低扇形別高度（minimum sector altitude、MSA：非常用。ふつう施設から 25 NM 以内で、障害物から 1,000 ft 離れる高度）'],
  ['断面図', 'グライドスロープに会合する高度（2,000 ft）と位置、DA、進入復行の始まり。平面図と同じフィックスで照らし合わせる'],
  ['最低気象条件', '進入の種類と区分ごとの DA か MDA と視程。かっこの中は、直線進入の行では接地帯からの高さ（HAT。DA 255 は接地帯 55 ft の 200 ft 上）。周回進入（circling approach）の行では空港の標高からの高さ（HAA）（P/CG）']])}
<p>進入復行点（MAP）は、ILS では DA に着いた所です。非精密進入では、FAF からの時間・施設やフィックス・GPS のウェイポイントで決めます（IFH 第 1 章）。ブリーフィングでは、次の順に声に出します。ATIS・図の名前と版・周波数と識別・コース・会合の高度・DA と視程・進入復行の手順です。</p>
${bk.dont('最低扇形別高度（MSA）は、進入図の非常用の高度です。14 CFR 91.119 の最低安全高度（minimum safe altitude）とは別のものです。')}
${bk.key('進入図は「ブリーフィングの欄 → 平面図 → 断面図 → 最低気象条件」の順に読む', '進入復行の手順は、進入を始める前に声に出して確かめる', 'DA・MDA は MSL の高度。かっこの中は接地帯（周回は空港の標高）からの高さ')}
${bk.q('架空の LAB ILS RWY 36 で、グライドスロープが使えず LOC だけで進入する。降りられる最低の高度は？', 'MDA 480 ft です（最低気象条件の欄の LOC の行）。グライドスロープがないので非精密進入になり、DA 255 ft までは降りられません。')}` },
      { id: 'ifr.pt', t: '方式旋回・hold-in-lieu・TAA・DME アーク', scope: 'us', faa: ['IR.V.A.K1'], h: () => `
${bk.aim('進入の始めに向きを反対に変える方式旋回と、その代わりの待機、RNAV の進入の TAA、DME アークの飛び方を覚えます。')}
${FIG.procTurn()}
<p>方式旋回（procedure turn）は、中間進入か最終進入のコースに内向きに乗るために、向きを反対に変える操作です。進入図に描かれていれば、直線進入（straight-in）を許可されない限り、飛ばなければなりません（AIM 5-4-9）。逆に、許可がなければしない場面もあります。「NoPT」の区間・最終進入コースへのレーダー誘導・時間を指定された進入です（91.175(j)）。</p>
<p>方式旋回の高度は、内向きのコースに乗るまでの最低高度です。断面図の距離の内（ふつう 10 NM）で、200 KIAS 以下で回ります。曲がる側は平面図の矢羽根の側で、曲がり方は自分で選べます（AIM 5-4-9）。方式旋回の代わりに、待機の形（hold-in-lieu-of procedure turn）が描かれた進入もあります。描かれた向きで回り、区間の長さや時間を超えません。</p>
${bk.deep('方式旋回の細目・TAA・DME アーク', `<p>区分 A とヘリコプターだけの進入では、距離は 5 NM まで短くできます。曲がり方には、45°・レーストラック・80°/260° などがあります。hold-in-lieu では、進入の許可をもらって決められた高度にいれば、何周もする必要はありません（AIM 5-4-9）。</p>
<p>TAA（terminal arrival area）は、RNAV の進入で、航空路から進入へ移る区域です。多くは T の字の形で、両側の 2 つの IAF と、真ん中の IF/IAF を持ちます。区域は直線・左ベース・右ベースの 3 つです。どれにいるかは、IF/IAF へ向かう磁方位（magnetic direction）で決めます。TAA の高度は MSA の代わりで、実際に使える高度です。障害物から 1,000 ft 以上離れます（AIM 5-4-5）。直行の許可だけでは、低い TAA の高度へは降りられません。</p>
<p>DME アーク（DME arc）は、局から決まった距離を保って弧を飛ぶ、進入の区間です。対地速度 150 kt 以下なら、弧の 0.5 NM 手前で約 90° 曲がり始めます。弧の上では、局が翼の真横に来るように、短い直線で針路を少しずつ変えます。内向きのコースへは、ふつう 5° より少ない先行のラジアルで曲がり始めます（IFH 第 9 章）。ILS や LOC の DME では、弧を作りません（IPH 第 4 章）。</p>`)}
${bk.judge('進入の許可が直線進入なのか方式旋回を含むのか分からないときは、すぐ管制に確かめます（91.123）')}
${bk.key('方式旋回は、NoPT・レーダー誘導・時間の進入では、許可なしにしない', '方式旋回の高度は、内向きのコースに乗るまでの最低高度', '決められた距離（ふつう 10 NM）の内で、200 KIAS 以下')}
${bk.recall('待機の入り方は、フィックスに着いたときの機首方位で、ダイレクト・ティアドロップ・パラレルから選びます。', ['ifr.hold', '待機経路（ホールディング）'])}
${bk.q('レーダー誘導で最終進入コースに乗せられ、進入の許可をもらった。進入図には方式旋回が描かれている。方式旋回をする？', 'しません。最終進入コースへレーダーで誘導されたときは、管制の許可がなければ方式旋回をしません（91.175(j)）。したいときは、許可をもらってからです。')}` },
      { id: 'ifr.ils', t: 'ILS 進入', scope: 'common', from: ['kiso12.19', 'kiso12.23'], jcab: ['ir.1.1.2.3', 'ir.1.2.1.2', 'ir.2.5.1'], faa: ['IR.VI.B.K1', 'IR.VI.B.K2', 'IR.VI.B.K3', 'IR.VI.B.K4', 'IR.VI.E.K2'], h: () => {
        const PH = FL.physics, gsNm = Math.tan(3 * DEG) * 1852 * PH.FT, faf = (2000 - PH.LAB_RWY.elevFt) / gsNm - 300 / 1852;
        return `
${bk.aim('ローカライザーとグライドスロープの針を読み、決心高度まで安定して降りる手順を覚えます。課目 i5 の内容です。')}
${FIG.ils()}
<p><b>ILS（計器着陸装置、instrument landing system）</b>は、電波で滑走路への道を示す精密進入です。<b>ローカライザー</b>が左右（108.10〜111.95 MHz）、<b>グライドスロープ</b>が上下（ふつう 3°）を誘導します（米国の AIM 1-1-9）。使えるかは、ノータムでも確かめます。グライドスロープが使えなければ、LOC の進入として MDA までになります。</p>
<h3>針の読み方</h3>
<p>G1000 型の PFD（primary flight display）では、HSI のコースの針（CDI）がローカライザーです。姿勢表示の右の菱形が、グライドスロープです。針も菱形も、<b>「行くべき道」のある方</b>を指します。菱形が下なら道は下（自分が高い）、針が右ならコースは右です。いっぱいの振れは、ローカライザーが約 ±2.5°、グライドスロープが約 ±0.7° です。角度で振れるので、滑走路に近いほど同じずれでも針は大きく動きます。</p>
<h3>手順</h3>
<ol><li><b>準備</b>：ATIS と進入図のブリーフィング（${bk.see('ifr.chart', '進入図の読み方')}）です。NAV を 109.90 にし、識別符号（I-LAB）を聞き、CRS を 360° にします。</li>
<li><b>進入許可を復唱する</b>：旋回の向き・乗るまでの高度・進入の種類と滑走路を、全部復唱します（例は下の折りたたみ）。</li>
<li><b>ローカライザーに会合する</b>：約 30° の角度で向かいます。針が動き出して中央へ向かい始めたら、360° へ旋回して乗ります（IFH 第 9 章）。</li>
<li><b>グライドスロープに下から会合する</b>：2,000 ft を保って進むと、滑走路端から約 ${faf.toFixed(1)} NM で菱形が中央に来ます。課目 i5 では、フラップ（flaps）を 10° にして、80 kt・約 430 fpm で降ります。3° の降下率は「対地速度 × 5」が目安で、正確には × 5.3 です。</li>
<li><b>小さく直す</b>：IFH は「ピッチで降下率、出力で速度」を保つと書いています。菱形が下なら、機首を少し下げて降下率を約 100 fpm 増やし、速度が増えるなら出力を少し絞ります。ローカライザーは、針の方へ小さく直します（最初は 2〜5°、近づいたら 2° 以内）。</li>
<li><b>DA で判断する</b>：DA 255 ft（架空の値）で滑走路の目印が見えれば着陸します。見えなければ、<b>すぐ進入復行</b>（missed approach）します。</li></ol>
${bk.deep('復唱の例・アンテナの場所・針の目盛り・ACS の許容幅・DA で探す目印', `<p>進入許可と復唱の例（架空）：“LAB Approach: Archer Seven Lima Alpha, turn left heading 330, maintain 2,000 until established on the localizer, cleared ILS runway 36 approach.” → “Left 330, maintain 2,000 until established, cleared ILS runway 36, Archer Seven Lima Alpha.”</p>
<p>ローカライザーのアンテナは、滑走路の向こうの端の先にあります。グライドスロープのアンテナは、接地点の横（滑走路端から約 750〜1,250 ft）にあります（IFH 第 9 章）。</p>
${bk.photo('locAntenna')}
${bk.photo('gsAntenna')}
${bk.t(['表示', 'いっぱいの振れ（2 ドット）', '1 ドット'], [['ローカライザー', '約 ±2.5°（ふつうの値。滑走路端で幅 700 ft になるよう調整するので、滑走路ごとに少し違う）', '約 1.25°'], ['グライドスロープ', '約 ±0.7°', '約 0.35°']])}
${bk.t(['計器飛行 ACS（Precision Approach）', '許容幅'], [['最終進入の前', '高度 ±100 ft・針路 ±10°・速度 ±10 kt・CDI は 3/4 スケール以内'], ['最終進入（FAF から DA まで）', 'ローカライザー・グライドスロープとも 3/4 スケール以内・速度 ±10 kt'], ['DA', '目印がはっきり見えなければ、すぐ進入復行']])}
<p>課目 i5 の基準は「LOC・GS ±1 ドット（地上 1,000〜200 ft の 85% 以上）」です。ACS の 3/4 スケール（1.5 ドット）より厳しい、教材の基準です。3° の降下率は、120 kt なら約 640 fpm です。</p>
<p>DA で探す目印は、進入灯・滑走路端の灯・接地帯の灯などです（米国の 14 CFR 91.175(c)。くわしくは ${bk.see('ifr.rules', 'IFR の規則の要点')}）。進入灯が見えただけでは、着陸まで続けてよいとは決まりません。</p>
${bk.photo('ch12-photo5')}`)}
${bk.key('針も菱形も「行くべき道」の方を指す。菱形が下なら自分が高い', 'グライドスロープは、チャートの高度で下から会合する', 'DA で目印が見えなければ、見えるまで降りない。すぐ進入復行')}
${bk.warn('<b>ここに注意：</b>グライドスロープの電波には、6°〜12° くらいの高い角度に「偽の道」（false course）ができます。9° 付近では指示が逆になり、12° 付近では本物に似た急な道ができ、6° 付近ではその両方が起きます。チャートの高度で下から会合すれば、偽の道には入りません。上から会合すると、安定しない進入になりやすく、偽の道に乗る危険もあります。進入中は、高度と距離を照らし合わせます（IFH Addendum B）。')}
${bk.recall('安定進入（stabilized approach）では、決めた高さで、経路・速度・形態・出力がそろっています。そろわなければ着陸をやめます。', ['ops.landing', '安定した進入'])}
${bk.q('ILS で、CDI の針が左に 1 ドット、グライドスロープの菱形が上に 1 ドット。自分はどこにいて、どう直す？', 'コースの右で、道より低い所にいます。左へ 2〜5° 針路を直し、機首を少し上げて降下率を減らします（速度が落ちるなら出力を少し足す）。')}
${bk.sim('ローカライザーに会合してグライドスロープで降下し、決心高度で滑走路を確かめて着陸します。シミュレータの開始点では、ローカライザーに乗ったときに菱形がいっぱいに下（約 500 ft 高い）にあります。降下率をいつもより大きくして（約 700〜800 fpm）、菱形を中央に戻します。実機では、上からの会合は避けます（偽の道の注意を参照）。', ['i5', 'ILS 進入'])}`;
      } },
      { id: 'ifr.pbn', t: 'RNAV と RNP：航法仕様・RAIM と機上の監視・承認と表示', scope: 'common', from: ['kiso12.11'], jcab: ['ir.1.1.1.1', 'ir.1.1.2.3', 'ir.1.2.3.5'], faa: ['IR.II.B.K2', 'IR.V.A.K2', 'IR.VI.A.K2', 'IR.VI.A.K3', 'IR.VI.B.K3'], h: () => `
${bk.aim('RNAV と PBN を知り、飛んでよいかを装備・承認・警報で確かめられるようにします。')}
${FIG.pbnCorridor()}
<p>広域航法（area navigation、RNAV）は、望む経路を飛ぶ方法です。地上の局の真上を結ぶ道に縛られません。PBN（performance-based navigation、性能準拠航法）は、その経路に要る性能を「航法仕様」で決める考え方です。航法仕様には、精度だけでなく、機能・装備・乗員の手順も入ります。</p>
<p>航法仕様には RNAV と RNP があります。「RNAV 1」の 1 は、飛ぶ時間の 95% 以上で保つ横の精度（NM）です。RNP は、RNAV に<b>機上の性能の監視と警報</b>を足したものです。精度が守れなくなると知らせます（米国の AIM 1-2-1・1-2-2）。たとえば RNAV 1 は出発方式と STAR に、RNP APCH は「RNAV (GPS)」と書かれた進入に使います。</p>
<p>GPS の完全性を受信機が自分で確かめる仕組みが、RAIM（receiver autonomous integrity monitoring）です。WAAS がないときは、飛ぶ前に RAIM の予測を確かめます。使えなければ、別の航法・別の経路や目的地・出発を遅らせる、のどれかにします（米国の AIM 1-1-17）。</p>
<p>画面に経路が描けることと、飛んでよいことは別です。飛べる航法仕様は、飛行規程（airplane flight manual、AFM）や補足に書かれています。進入は、最新の航法データベースから名前で呼び出して使います。ウェイポイントを手で入れて作りません（米国の AIM 1-1-17）。</p>
${bk.deep('航法仕様の表・Archer III の例・RAIM の警報が出たとき', `${bk.t(['航法仕様（米国の例）', '使う所'], [['RNAV 1', '出発方式（DP）と STAR'], ['RNAV 2', '航空路（T ルート・Q ルート）'], ['RNP APCH', 'RNAV (GPS) と書かれた進入。最低気象条件は LNAV・LNAV/VNAV・LPV・LP'], ['RNP AR APCH', 'RNAV (RNP) と書かれた進入。特別な承認が要る']])}
<p>Archer III の POH（1-18）によると、その G1000 は WAAS の GPS（TSO-C145a・C146a の Class 3）です。米国で「GPS」「or GPS」「RNAV (GPS)」の進入に使え、LPV と LNAV/VNAV の進入にも使えます。AC 90-105 の装備の条件を満たし、RF の区間のない RNP の出発・到着と進入を飛べます。RNAV 1・RNAV 2 は、AC 90-100A の指針に従う一般の運航者が飛べます。事業の運航者には、FAA の運航の承認が要ります。</p>
<p>同じ POH（2.23）は、WAAS が使えない所では RAIM の予測を確かめるとしています。5 分より長く続けて途切れる予測なら、出発を遅らせるか、やめるか、経路を変えます。データベースは最新の版にするか、ウェイポイントを進入図と照らします。代替飛行場は地上の施設の進入で計画する、という機体の制限もあります。AFM の制限は、米国の AIM の一般の決まりより優先します。</p>
<p>FAF の手前で RAIM の警報が出たら、進入を始めず、降りずに FAF を通って MAP まで飛び、進入復行します。FAF を過ぎてから出たら、上昇して進入復行します（米国の AIM 1-1-17）。RNP APCH の横の精度は、ターミナルと進入復行で 1 NM です。最終進入では 0.3 NM（WAAS なら 40 m）まで狭くなります（米国の AIM 1-2-2）。</p>`)}
${bk.judge('RAIM や完全性の警報が出たら、警報を消すことより、使える経路と進入を選び直します', '航法の能力が落ちたら、管制に伝えて誘導や別の進入を頼みます')}
${bk.key('RNP は、RNAV に機上の監視と警報を足したもの', '数字は横の精度（NM）。飛ぶ時間の 95% 以上で守る', '画面の線でなく、承認・装備・データベース・警報で飛べるかを決める')}
${bk.recall('RAIM には衛星 5 機（または 4 機と気圧高度計）が要ります。異常な衛星を除いて使い続ける FDE には、6 機（または 5 機と気圧高度計）が要ります。', ['nav.gps', 'GPS と CDI の目盛り'])}
${bk.q('RNP と RNAV の、いちばん大きな違いは？', 'RNP には、機上で航法の性能を監視し、守れないときに警報を出す機能があることです（米国の AIM 1-2-2）。どちらも数字は横の精度（NM）で、飛ぶ時間の 95% 以上で守ります。')}` },
      { id: 'ifr.np', t: '非精密進入・進入復行・自動操縦との関係', scope: 'common', from: ['kiso12.20', 'kiso12.21', 'kiso12.24'], faa: ['IR.VI.A.K1', 'IR.VI.A.K3', 'IR.VI.A.K4', 'IR.VI.C.K1', 'IR.VI.E.K1', 'IR.VI.E.K3'], h: () => `
${bk.aim('高さの誘導がない非精密進入と RNAV（GPS）進入の種類、一定の角度で降りる CDFA、進入復行の決まりを覚えます。')}
${FIG.npProfile()}
<p><b>非精密進入</b>（non-precision approach：VOR・LOC・LNAV など）は、左右だけを誘導します。高さの誘導はありません。最低降下高度（<b>MDA</b>）より下へは、滑走路の目印が見えるまで降りられません（米国の 14 CFR 91.175）。</p>
${bk.t(['RNAV（GPS）進入の種類', '高さの誘導', '最低の高さ', '必要なもの（米国の AIM 5-4-5）'], [
  ['LPV', 'あり', 'DA', 'WAAS の GPS（ILS とほぼ同じ感じ方で飛べる）'],
  ['LNAV/VNAV', 'あり', 'DA', 'WAAS の GPS、または認められた気圧式の VNAV'],
  ['LP', 'なし', 'MDA', 'WAAS の GPS'],
  ['LNAV', 'なし', 'MDA', 'GPS']])}
<h3>MDA までの降り方：dive and drive と CDFA</h3>
<p>FAF のあとすぐ MDA まで降りて水平に飛ぶ方法を「dive and drive」と言います。低い所を長く飛び、切り替えも多くなります。FAA は、<b>CDFA</b>（continuous descent final approach、連続降下の最終進入）をすすめています。一定の角度で降り続ける方法です（AC 120-108A）。角度は進入図の降下角（ふつう約 3°）で、降下率は対地速度 × 5.3 です。CDFA で飛んでも、MDA が DA に変わるわけではありません。MDA に着く所で目印が見えなければ、水平にせずに進入復行を始めます（AC 120-108A）。目視降下点（visual descent point、VDP）より前には、MDA から降りません（米国の AIM 5-4-5）。</p>
<h3>進入復行</h3>
${FIG.missedTwoTasks()}
<p>進入復行は、${bk.see('ops.goaround', 'ゴーアラウンド')} と同じく「出力・姿勢・形態」で上昇を始め、進入図の手順に従い、管制に伝えます。MAP より前に始めても、MAP までは MDA／DA 以上で進入のコースを飛びます。管制の別の指示があれば、それに従います。それから決められた旋回をします（IFH 第 1・10 章）。障害物からの安全は、1 NM あたり 200 ft 以上の上昇が前提です（米国の AIM 5-4-21）。</p>
<p>周回進入（circling approach）の途中で滑走路の目印を見失ったときは、別です。その方式の進入復行に従いますが、進入のコースへ戻るのではありません。まず<b>着陸する滑走路へ向かって上昇旋回</b>し、進入復行のコースに乗るまで旋回を続けます（米国の AIM 5-4-21）。</p>
<p>実機の G1000 機には自動操縦（オートパイロット）があることが多いですが、この教材では<b>針路・高度を保つ自動操縦は実装していません</b>（自分の手で飛ぶ練習のため）。自動化の使い方の考え方は ${bk.see('ifr.auto', 'G1000 型の計器飛行の操作と自動操縦')} で扱います。</p>
${bk.deep('APV・VDP・MAP・CDFA の言葉と、MDA で水平に飛ぶときの許容幅', `<p>LPV と LNAV/VNAV は「垂直誘導付き進入（APV）」と呼ばれます。ILS のような精密進入とは分けて扱います（米国の AIM 5-4-5）。画面に縦の目安が出ても、承認された縦の誘導でなければ、MDA の進入のままです。</p>
${bk.t(['言葉', '意味'], [
  ['VDP', '滑走路の目印が見えていれば、MDA から通常の角度で滑走路へ降り始めてよい点（米国の AIM 5-4-5）'],
  ['MAP（進入復行点）', 'FAF からの時間、飛行場にある施設やフィックス、GPS 進入では滑走路端などのウェイポイント（IFH 第 1 章）'],
  ['CDFA での進入復行', 'MDA より下へ行かないよう、少し上で始める（AC 120-108A）']])}
<p>計器飛行 ACS（Non-precision Approach）の許容幅は、MDA ＋100／−0 ft です。MDA で水平に飛ぶときは、これを VDP または MAP まで保ちます。進入復行の上昇勾配は、進入図にもっと大きい値があればその値です（米国の AIM 5-4-21）。</p>`)}
${bk.key('非精密進入では、早く降りて水平に飛ぶより、一定の角度で降り続ける（CDFA）方が安定する', 'MDA より下へは、目印が見えるまで降りない。VDP より前に降りない', '進入復行の手順は、進入を始める前に頭に入れておく。MAP まではコースを飛ぶ', '周回進入で滑走路の目印を見失ったら、着陸する滑走路へ向かって上昇旋回する')}
${bk.q('LNAV の進入で、MDA に着いたが滑走路が見えない。dive and drive で飛んでいるとき、どうする？', 'MDA を保って MAP まで進み、それまでに見えなければ進入復行します（米国の 14 CFR 91.175）。降りて探すことはしません。CDFA で飛んでいるなら、MDA に着く所で見えなければ、水平にせずに進入復行を始めます。')}` },
      { id: 'ifr.circle', t: '周回進入', scope: 'common', from: ['kiso12.25'], faa: ['IR.VI.D.K1', 'IR.VI.E.K1'], h: () => `
${bk.aim('周回進入の区域と最低高度、目視を失ったときの動きを覚えます。')}
${FIG.circleArea()}
<p>周回進入（circling approach）は、計器進入のあと、目で見ながら回って降りる方法です。進入のコースと向きの違う滑走路に使います。コースと滑走路の向きの差が 30° を超えるときなどは、周回の最低気象条件だけが書かれます（米国の AIM 5-4-20）。</p>
<h3>目視を失ったら〔安全〕</h3>
<p>周回の途中で滑走路の目印を見失ったら、その方式の進入復行に従います。まず<b>着陸する滑走路へ向かって上昇旋回</b>し、進入復行のコースに乗るまで旋回を続けます（米国の AIM 5-4-21）。どちらへ曲がるかは、そのときの位置で決まります。右か左かを決めて覚えるのではありません。</p>
<p>周回から進入復行のコースに入るだけでは、区域を出たあとの障害物からの高さは保証されません。区域の中で上昇を続けてから、進入復行のコースに入ります（米国の AIM 5-4-20）。</p>
<h3>区分と区域と回り方</h3>
<p>進入の区分は、着陸の形の失速（stall）の速度 V<sub>SO</sub> の 1.3 倍などで決まります。区分 A は 91 kt 未満です（米国の 14 CFR 97.3）。Archer は V<sub>SO</sub> 45 KIAS（POH 第 5 章）の 1.3 倍が約 ${Math.round(45 * 1.3)} kt で、区分 A です。周回の区域は、滑走路の両端から引いた円弧をつないだ形です。昔からの基準では、区分 A の半径は 1.3 NM です（IPH 第 4 章）。区域の中で MDA 以上にいれば、障害物から 300 ft 以上離れます（IPH 第 4 章）。</p>
<p>周回の MDA は、通常の降下で予定の滑走路に降りられる位置に来るまで保ちます（米国の AIM 5-4-20）。区域から出ない小さな回り方にします。区域の一部を禁じる注記（例「Circling NA E of RWY 17-35」）も読みます。夜や雨の中では、見え方と遠近感が悪くなります（IPH 第 4 章）。</p>
${bk.deep('区分の決め方・新しい基準の区域・管制の指示・周回できない進入', `<p>進入の区分（aircraft approach category）は、最大着陸重量（maximum landing weight）での V<sub>REF</sub>、なければ V<sub>SO</sub> の 1.3 倍で決まります（米国の 14 CFR 97.3）。区分の上限より速く飛ぶなら、上の区分の最低気象条件を使います（IPH 第 4 章）。新しい基準では、周回の高さでも区域の半径が変わります。その最低気象条件の行には、白抜きの C の印が付きます（米国の AIM 5-4-20）。</p>
<p>管制塔のある空港では、周回の途中も管制の指示に従います。ただし管制の許可は、区域を禁じる注記を消しません。管制塔のない空港では、禁じる注記がなければ、米国の 14 CFR 91.126(b) の向き（左回り）で回ります（米国の AIM 5-4-20）。</p>
<p>GLS、LOC の最低気象条件のない ILS、LNAV の最低気象条件のない RNAV (GPS) からは、周回できません（米国の AIM 5-4-20）。直線の最低気象条件がなくても、直線で降りてよいときがあります。滑走路が見えて通常の進入ができ、着陸の許可があるときです（米国の AIM 5-4-20）。</p>`)}
${bk.judge('低い雲・夜・強い風で周回が難しいなら、周回しない・別の進入・代替飛行場を選びます', '回りながら区域の端を越えそうなら、続けずに進入復行します')}
${bk.key('目視を失ったら、着陸する滑走路へ向かって上昇旋回し、進入復行のコースへ', '周回の区域は区分で決まる。Archer は区分 A', '周回の MDA は、通常の降下で降りられる位置に来るまで保つ')}
${bk.jur('circle')}
${bk.recall('最低気象条件の欄の周回の行では、かっこの中は空港の標高からの高さ（HAA）です。', ['ifr.chart', '進入図の読み方'])}
${bk.q('周回して滑走路 18 へ向かうダウンウィンドで、雲に入って滑走路が見えなくなった。最初にすることは？', '着陸する滑走路のほうへ向かって上昇旋回を始めます。そのまま旋回を続けて、その進入の進入復行のコースに乗り、管制に伝えます（米国の AIM 5-4-21）。降りて探したり、雲の下へ戻ろうとしたりしません。')}` },
      { id: 'ifr.case', t: '一便の判断：事例でふり返る', scope: 'common', from: ['kiso12.28'], faa: ['IR.I.C.K1', 'IR.VI.E.K1'], h: () => `
${bk.aim('計器飛行の一便を事例でたどり、変化に早く気づき、間違いを見つけ、望ましくない状態になる前に決める練習をします。')}
<p>架空の事例です。LAB 空港へ IFR で向かう途中、目的地の雲が 400 ft に下がりました。グライドスロープが使えないというノータムも出ました。</p>
<ol><li><b>情報を更新する</b>：使える進入を選び直します。架空の LAB ILS RWY 36 は LOC の進入になり、MDA 480 ft（接地帯から 425 ft）です。</li>
<li><b>最低気象条件と比べる</b>：雲が 400 ft なら、MDA まで降りても雲の中です。ILS なら降りられた、という期待で MDA を下回りません。</li>
<li><b>燃料と次の手</b>：待機・再度の進入・代替飛行場までの燃料を計算し、米国の 14 CFR 91.167 の 45 分の予備が残るかを見ます。早めに代替飛行場へ向かうと決め、管制に伝えます。</li>
<li><b>ふり返る</b>：何を予想し、どの情報で違いに気づき、いつ決めたかを整理します。</li></ol>
<p>この事例を、TEM（threat and error management）の言葉で整理します。</p>
${bk.t(['TEM の言葉', 'この事例では'], [['脅威（threat）', '雲が下がる・施設が使えない・待機で燃料が減る'], ['エラー（error）', 'ILS の最低気象条件のままブリーフィングする・LOC の進入でグライドスロープを待つ'], ['望ましくない機体の状態（undesired aircraft state）', 'MDA より下へ降りる・燃料の予備を割る']])}
${bk.judge('目的地に着けるかだけでなく、着けなかったあとに選べる手が残っているかで決めます', '決める時刻と残りの燃料の線を、地上で決めておきます')}
${bk.key('天気や施設が変わったら、使える進入と最低気象条件を選び直す', '着けなかったあとの手（代替飛行場と燃料）が残るうちに決める', 'ふり返りは、予想・気づき・決めた時刻を分けて')}
${bk.recall('ハザード（hazard）を見つけ、リスクの大きさを見積もり、個人の最低基準（personal minimums）と比べて、早めに引き返します。この考え方は TEM の土台です。', ['adm.risk', 'リスクの大きさ'], ['crm.tem', '予告：TEM'])}
${bk.q('事例で、雲が 600 ft に上がったと聞いた。LOC の進入（MDA 480 ft・接地帯から 425 ft）で降りられる？', 'MDA まで降りれば、雲の下に出る計算です。それでも、視程が足り、MDA で目印が見えて、通常の降下で降りられる位置にいるときだけ降ります（米国の 14 CFR 91.175）。見えなければ MAP で進入復行し、代替飛行場へ向かいます。')}` },
    ],
    terms: [['IFR flight plan / ATC clearance', 'IFR の飛行計画・管制承認（クリアランス）', '米国の 91.173'], ['IFR clearance (CRAFT)', 'IFR の許可（書き取りの覚え方）', 'IFH 第 2 章'], ['Clearance limit', '許可の限界点', 'CRAFT の最初'], ['Alternate (1-2-3 rule)', '代替飛行場', '米国の 91.169'], ['MEA', '最低経路高度', '米国の 91.177'], ['Two-way radio communications failure', '無線の故障（IFR）', '米国の 91.185'], ['Holding / Holding fix', '待機・待機のフィックス', '米国の AIM 5-3-8'], ['Inbound / Outbound / Abeam', 'インバウンド・アウトバウンド・真横', ''], ['Direct / Parallel / Teardrop entry', '待機の入り方', '70° の線で区域を分ける'], ['Nonstandard pattern', '左回りの待機', ''], ['EFC (expect further clearance)', '次の許可の予定時刻', ''], ['Approach chart (plan view / profile view)', '進入図（平面図・断面図）', 'IFH 第 1 章'], ['MSA (minimum sector altitude)', '最低扇形別高度', '25 NM 以内・非常用'], ['ILS / Localizer / Glide slope', '計器着陸装置', '米国の AIM 1-1-9'], ['False glide slope', '偽のグライドスロープ', '6°〜12°'], ['Final approach course / FAF', '最終進入コース・最終進入フィックス', ''], ['Decision altitude (DA)', '決心高度', '精密進入・APV・MSL'], ['MDA / MAP', '最低降下高度・進入復行点', '非精密進入'], ['VDP', '目視降下点', '米国の AIM 5-4-5'], ['APV', '垂直誘導付き進入', 'LPV・LNAV/VNAV'], ['LNAV / LNAV/VNAV / LP / LPV', 'RNAV（GPS）進入の最低気象条件の種類', ''], ['CDFA', '連続降下の最終進入', 'AC 120-108A'], ['Missed approach', '進入復行', ''], ['Vector', 'レーダー誘導', ''], ['ODP / SID', '障害物を避ける出発方式・標準計器出発方式', '米国の AIM 5-2-9'], ['Climb gradient (ft/NM)', '上昇勾配', '標準 200 ft/NM'], ['Clearance void time', '許可の期限', '米国の AIM 5-2-7'], ['MOCA / MRA / MCA', '障害物だけを守る高度・受信の最低高度・越える最低高度', 'IPH 第 2 章'], ['STAR / Descend via', '標準計器到着方式・方式どおりに降下', '米国の AIM 5-4-1'], ['Procedure turn / NoPT', '方式旋回・方式旋回なし', '米国の AIM 5-4-9'], ['Hold-in-lieu of procedure turn', '方式旋回の代わりの待機', ''], ['TAA (terminal arrival area)', 'RNAV の進入の到着の区域', 'T の字'], ['DME arc', 'DME アーク', 'IFH 第 9 章'], ['PBN / Navigation specification', '性能準拠航法・航法仕様', '米国の AIM 1-2'], ['RNP / Onboard performance monitoring and alerting', 'RNP・機上の性能の監視と警報', 'RNAV との違い'], ['RNP APCH / RNP AR APCH', 'RNP の進入・特別な承認の要る RNP の進入', ''], ['Circling approach / Aircraft approach category', '周回進入・進入の区分', '米国の 14 CFR 97.3'], ['Circling area', '周回の区域', '区分 A：1.3 NM（昔からの基準）']],
    examples: ['到着予定 15:00：14:00〜16:00 の予報が雲 2,000 ft 以上・視程 3 SM 以上（目的地に計器進入方式あり）なら代替飛行場は不要。雲 1,500 ft の時間があれば必要（米国の 1-2-3 ルール）。', '待機でインバウンドの修正が左 8° → アウトバウンドは右 24°（米国の AIM 5-3-8）。インバウンドが 1 分 15 秒かかった → 次のアウトバウンドを短くする。', 'ILS を対地速度 80 kt で：降下率 ≈ 80 × 5 ＝ 400 fpm、正確には 80 × 5.3 ≈ 425 fpm（課目 i5 の目安は約 430 fpm）。', 'IFR の天気で無線が故障：最後の指示が 3,000 ft、その区間の最低 IFR 高度が 4,000 ft → 4,000 ft で飛ぶ（米国の 91.185 の最も高いもの）。', 'Archer III の POH の上昇の例 487 ft/min を対地速度 80 kt で飛ぶと、勾配は約 365 ft/NM（200 ft/NM の出発を満たす）。', '周回の途中で目視を失った → 着陸する滑走路へ向かって上昇旋回し、進入復行のコースへ（米国の AIM 5-4-21）。'],
    cautions: ['LAB の ILS（I-LAB 109.90）・LAB VOR・待機・進入図は架空。NOT FOR NAVIGATION。実際の進入は、正式な進入図と公式の手順で行う。', 'この教材は IFR の飛行計画・許可・進入図を簡略化している（課目は待機と ILS 進入の操縦だけ）。', 'この章の出発・航空路・方式旋回・周回の図は模式図で、値は架空。実際は最新の公式の方式図で確かめる。', '出発方式・方式旋回・RNAV の進入・周回進入は、この教材のシミュレータでは体験できない。'],
    quiz: [
      { q: '米国の 1-2-3 ルール（91.169）で、代替飛行場を書かなくてよい目的地の条件は？（目的地に計器進入方式がある場合）', choices: ['到着予定の前後 1 時間、雲 1,000 ft 以上・視程 3 SM 以上', '到着予定の前後 1 時間、雲 2,000 ft 以上・視程 3 SM 以上', '到着予定のときだけ、雲 3,000 ft 以上・視程 1 SM 以上', '到着予定の前後 2 時間、視程 5 SM 以上'], answer: 1, why: '米国の 91.169(b)：目的地に計器進入方式があり、前後 1 時間の予報が雲の高さ 2,000 ft 以上・視程 3 SM 以上なら代替は不要。' },
      { q: 'ILS 進入で、決心高度（DA）に着いたが滑走路の目印が見えない。どうする？', choices: ['見えるまで少し降りる', 'DA を保ってしばらく飛ぶ', 'すぐ進入復行する', '速度を下げて待つ'], answer: 2, why: '米国の 91.175：目印がはっきり見えなければ DA より下へは降りられない。精密進入では DA ですぐ進入復行する。' },
      { q: '待機経路で、インバウンドの時間を 1 分にするために調整するのは？', choices: ['アウトバウンドの時間', 'インバウンドの速度', '旋回のバンク角', '高度'], answer: 0, why: '米国の AIM 5-3-8：最初のアウトバウンドは 1 分。そのあとは、インバウンドが 1 分になるようにアウトバウンドの時間を変える。' },
      { q: 'ILS で、グライドスロープの菱形が上に 1 ドット、CDI の針が左に 1 ドット。自分の位置は？', choices: ['道より低く、コースの右', '道より高く、コースの左', '道より低く、コースの左', '道より高く、コースの右'], answer: 0, why: '針と菱形は「行くべき道」のある方を指す。菱形が上 ＝ 道は上 ＝ 自分が低い。針が左 ＝ コースは左 ＝ 自分は右（本文 ifr.ils）。' },
      { q: '米国の規則（91.185）で、IFR の天気で飛行中に無線が完全に故障した。飛ぶ高度は？', choices: ['最後に指示された高度・最低 IFR 高度・予告された高度のうち最も高いもの', '最後に指示された高度だけ', '最低 IFR 高度だけ', 'VFR の巡航高度'], answer: 0, why: '米国の 91.185(c)(2)：区間ごとに 3 つのうち最も高いもの。経路は 指示 → 誘導 → 予告 → 飛行計画 の順。VFR の天気なら VFR のまま早く着陸する。' },
      { q: '米国の出発方式で、ほかに書かれていなければ前提になる上昇勾配は？', choices: ['100 ft/NM', '150 ft/NM', '300 ft/NM', '200 ft/NM'], answer: 3, why: '米国の AIM 5-2-9：最低 IFR 高度まで 200 ft/NM 以上。障害物があれば、もっと大きな勾配が書かれる（本文 ifr.dep）。' },
      { q: 'MEA と MOCA が両方ある区間で、MOCA まで下りてよいのは？（米国の 91.177）', choices: ['いつでも', '管制が許可したときだけ', '夜だけ', 'VOR から 22 NM 以内で、電波が受かるとき'], answer: 3, why: '米国の 14 CFR 91.177(a)(1)：MOCA が保証する電波は VOR から 22 NM 以内だけ（本文 ifr.enr）。' },
      { q: '周回進入の途中で、滑走路の目印を見失った。最初にすることは？', choices: ['降りて目印を探す', '進入のコースへまっすぐ戻る', '高度を保って区域の外へ出る', '着陸する滑走路へ向かって上昇旋回する'], answer: 3, why: '米国の AIM 5-4-21：着陸する滑走路へ向かって上昇旋回し、進入復行のコースに乗るまで旋回を続ける（本文 ifr.circle）。' },
      { q: 'RNP が RNAV と違うのは？', choices: ['精度の数字が NM でない', '地上の VOR だけを使う', '機上で性能を監視し、守れないと警報を出す', '承認がいらない'], answer: 2, why: '米国の AIM 1-2-2：RNP は、RNAV に機上の性能の監視と警報を足したもの（本文 ifr.pbn）。' },
    ],
    written: [
      ['計器飛行証明と航法装置があれば、どんな計器進入でもしてよいですか。', `いいえ。資格と最近の経験、機体と装備が合っているか、要る承認、方式の条件、その日の能力と天気を確かめます。装置に経路が出ることは、その進入をしてよい根拠になりません。${bk.see('ifr.pbn', 'RNAV と RNP')}`, ['kiso12.q2']],
      ['目的地の予報が良くても、進入復行と代替飛行場を準備するのはなぜですか。', `天気・施設の状態・混雑による遅れが変わり、着陸できないことがあるからです。進入復行の経路と燃料、使える代替飛行場を準備し、変える余地があるうちに決めます。${bk.see('ifr.rules', 'IFR の規則の要点')}`, ['kiso12.q3']],
      ['RNP の性能の監視と警報は、なぜ大切ですか。', `要る航法の性能を満たせなくなったことに乗員が気づき、続けるか変えるかを決めるためです。精度だけでなく、完全性・機能・承認の条件も関わります。画面に経路が残っていても、続けられないことがあります。${bk.see('ifr.pbn', 'RNAV と RNP')}`, ['kiso12.q11']],
      ['進入図の平面図だけを読むと、どんな情報を落としますか。', `区間ごとの高度の制限・降下を始める条件・最低気象条件・進入復行との関係・装備や気温の注記です。平面図と断面図を同じフィックスで結び、使う条件まで確かめます。${bk.see('ifr.chart', '進入図の読み方')}`, ['kiso12.q12']],
      ['出した飛行計画と、もらった管制承認が違いました。何を確かめますか。', `許可の限界点・経路・高度などの変わった所を理解し、復唱して確かめます。装置に入れた結果を承認と照らし、性能や天気でできない所があれば、早く伝えます。${bk.see('ifr.rules', 'IFR の規則の要点')}`, ['kiso12.q13']],
      ['勾配 300 ft/NM・対地速度 120 kt の練習の条件で、要る上昇率はいくらですか。', `120 ÷ 60 ＝ 毎分 2 NM、300 × 2 ＝ 600 ft/min です。同じ勾配でも、対地速度が増えると要る上昇率は増えます。実際は公示の値と機体の性能で確かめ、この架空の数を出発の基準にしません。${bk.see('ifr.dep', 'IFR の出発')}`, ['kiso12.q14']],
      ['経路を短くする許可（直行）をもらいました。画面の線のほかに、何を確かめますか。', `行き先のフィックスと高度、途中の地形と天気、航法の能力、燃料と到着の時刻への影響です。変わった制限と指示を理解し、飛んでからも位置と状態を見続けます。${bk.see('ifr.enr', '航空路と到着')}`, ['kiso12.q15']],
      ['待機を、長円に似た形で飛ぶだけでは足りないのはなぜですか。', `待機の区域は、フィックス・インバウンド・旋回の向き・高度・速度・時間か距離の条件で守られるからです。風の修正と入り方を確かめ、待つ間も残りの燃料と次の手を更新します。${bk.see('ifr.hold', '待機経路')}`, ['kiso12.q16']],
      ['追い風が強くなり、降下の道のりが短くされました。どんな問題が起きますか。', `高度を失う時間と減速する距離が足りず、速すぎる進入や急な降下になりやすくなります。降下の計画を作り直し、要るなら距離を足すか別の指示を早めに頼んで、安定した進入につなげます。${bk.see('ifr.enr', '航空路と到着')}`, ['kiso12.q17']],
      ['進入のブリーフィングに、進入復行を入れるのはなぜですか。', `着陸できないときは、操縦と経路の管理を同時にするので、忙しくなってから調べる余裕がないからです。最初の高度・向き・旋回の条件と役割を前もって確かめ、方式が変わったら確かめ直します。${bk.see('ifr.chart', '進入図の読み方')}`, ['kiso12.q18']],
      ['ILS のグライドスロープの指示が出れば、どの高さから会合してもよいですか。', `よくありません。高い角度には偽の道があり、上から会合すると不安定な進入にもなります。決められた方式と高度で下から会合し、位置・高度・距離と誘導を照らし合わせます。${bk.see('ifr.ils', 'ILS 進入')}`, ['kiso12.q19']],
      ['GNSS の装置に縦の目安が出ました。これだけで DA を使えますか。', `使えません。承認された縦の誘導か、参考の表示かを確かめ、方式・機体の能力・使う最低気象条件をそろえます。LNAV+V のように表示があるだけでは、MDA の方式が DA の方式に変わりません。${bk.see('ifr.np', '非精密進入')}`, ['kiso12.q20']],
      ['DA と MDA の扱いの違いを説明してください。', `DA は、決められた目視の条件がなければ進入復行を始める判断の高度です。MDA は、要る条件なしに下回れない高度で、MAP までの位置も管理します。DA で水平に待ったり、CDFA だけを理由に MDA を DA に読み替えたりしません。${bk.see('ifr.np', '非精密進入')}`, ['kiso12.q21']],
      ['視程の通報が条件を満たしていても、着陸へ続けられないことはありますか。', `あります。要る目印が見えないときや、進入が安定していないときです。RVR・地上視程・飛行視程を区別し、続けてよい条件と、安全に着陸できる状態を確かめます。${bk.see('ifr.rules', 'IFR の規則の要点')}`, ['kiso12.q22']],
      ['約 3° の降下の道を、対地速度 120 kt で飛ぶときの降下率の目安はいくらですか。', `120 × 5.3 ＝ 636 で、約 640 ft/min です。対地速度が変われば、要る降下率も変わります。この概算は計画の助けで、進入図の高度の制限や実際の誘導の代わりにはなりません。${bk.see('ifr.ils', 'ILS 進入')}`, ['kiso12.q23']],
      ['MAP より前に進入復行を決めたら、すぐ進入復行の向きへ旋回してよいですか。', `一律にはよくありません。決めることと、旋回を始める条件は別です。管制の別の指示がなければ、MAP までは MDA か DA 以上で進入のコースを飛び、それから決められた旋回をします。早い旋回や低い所からの進入復行では、障害物からの守りが外れます。${bk.see('ifr.np', '非精密進入・進入復行')}`, ['kiso12.q24']],
      ['周回進入で、速度を上げて大きく外側へ回ると、何が問題ですか。目視を失ったときの動きも答えてください。', `旋回が大きくなって守られた区域を出たり、要る目印が見えなくなったりします。区分・速度・最低気象条件・禁じる注記と風を確かめます。目視を失ったら、着陸する滑走路へ向かって上昇旋回し、進入復行のコースに乗るまで旋回を続けます（米国の AIM 5-4-21）。左右を決めて覚えるのではありません。${bk.see('ifr.circle', '周回進入')}`, ['kiso12.q25']],
      ['目的地の天気と進入の施設が悪くなりました。もう一度進入する前に、何を確かめますか。', `使える方式と機体・乗員の能力、最低気象条件、進入復行の経路、遅れ、残りの燃料と代替飛行場です。着陸できる見込みだけでなく、できなかったあとの手が残るかを確かめ、早めに決めて伝えます。${bk.see('ifr.case', '一便の判断')}`, ['kiso12.q28']],
    ],
    refs: [R.ifh, R.ifhB, R.iph, NEW_R.iph1, NEW_R.iph2, NEW_R.iph4, R.aim11, NEW_R.aim12, R.aim52, R.aim53, R.aim54, R.ac120108, R.cfr91, R.cfr61, NEW_R.cfr97, R.acsI, R.pcg, R.archerPoh], lessons: ['i4', 'i5'] });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
