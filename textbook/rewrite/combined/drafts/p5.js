// DRAFT (W31, R3) — Part 5's chapters 'me'「Piper Seminole と双発機の基礎」and 'oei'「片発停止の空力と操作」
// (textbook/rewrite/combined/DESIGN.md 3.3 第 5 部 第 35・36 章, 4.1 rows 23・24, 4.2 kiso02・kiso03・kiso13, 7.2 W31). No
// product reads this file (DESIGN 6.2 rule 5, 7.4). It is a plain script like book-5.js: when the chapters are registered,
// the two B.add(...) below replace the ones of 'me' and 'oei' in flight-lab/src/book-5.js in place (same ids, same place:
// the first chapters of Part 5), the figures of p5-figs.js go into book-figs.js (FIG; counterRotation, oeiForces, vmcRudder
// and vmcFactors replace the functions of the same names), and the references in NEW_R go into book-core.js's R (then
// `NEW_R.x` → `R.x`). Check them with the figures:
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p5-figs.js textbook/rewrite/combined/drafts/p5.js
//
// The Seminole's numbers: Piper's Information Manual for the PA-44-180 (Report VB-1942, 2006; the POH's content for serial
// numbers 4496174・4496224 and up, published for information and not kept current) was read on 2026-10-31 and is cited as
// 「POH」with its paragraph (2.3 speeds, 3.5・3.9 engine inoperative procedures, 3.23 fuel, 4.45・4.47・4.49, 7.5 propellers,
// 7.9 gear, 7.15 fuel, 7.17 electrical, 7.23 heater, figures 5-19・5-21). The one-engine climb of 212 fpm and the single-
// engine service ceiling of 4,100 ft are not in it: they stay 参考値（二次資料） in a fold (DESIGN 3.3 me.perf; UNVERIFIED
// U.seminole-poh). Vxse 82 KIAS is the POH's (3.3; the course's flight model keeps the guide's 88: 教材値 next to it).
//
// What changed in 'me' (6 sections: the 4 of the textbook kept with their ids and in their order — basics, speeds, pattern,
// perf — and the 2 new ones where DESIGN 3.3 puts them: me.prop and me.sys after me.basics):
//  - me.basics ← kiso13.1・13.17・13.18・kiso02.12: the CADET-fixed opening kept (「公開情報では、Archer の次に双発機 Piper
//    Seminole」: CADET strips 「公開情報では、」), counter-rotation from the POH 7.5, the critical engine's definition moved to
//    oei.what (DESIGN 3.3: K13.7 → oei.what), the propeller and feathering moved to me.prop, the gear's system to me.sys;
//    crossfeed as the POH has it (level cruise only; not for takeoff or landing: R.crossfeed), crossfeed ≠ transfer (bk.dont);
//    the crossfeed details, the preflight and ground checks (photo ch13-photo6) and the takeoff procedure in folds; the
//    form's order (考えてみよう before シミュレータ);
//  - ★me.prop ← kiso03.16〜03.18・kiso13.12・kiso01.25 (figure propGovernor = ch03-fig3-6 redrawn): the constant-speed
//    propeller and the governor (AFH chapter 12), the power-change order (rpm up first, MP down first: AFH 12), windmilling,
//    feathering both ways (stops the rotation, not a lock: R.feather) with the Seminole's oil / nitrogen and spring (POH 7.5),
//    the feathering lock below 950 rpm (POH 7.5; AFH about 800: K.multi.K-4); unfeathering, beta and reverse in a fold
//    (photos ch13-photo4, ch03-photo4); the recall of aero.left;
//  - ★me.sys ← kiso02.09・02.10・02.14・kiso13.16 (figure twinSystems = ch13-fig13-9 redrawn): what one engine takes with it
//    on the Seminole (POH 7.9・7.15・7.17): an alternator each, the gear's electric hydraulic pump, the engine-driven fuel
//    pumps; free fall by gravity and springs; load shedding (AFH 13, POH 3.5); hydraulic principles, the components, the
//    heater and a 計算演習 in a fold (photo ch02-photo4); selection ≠ position ≠ lock (bk.dont);
//  - me.speeds ← kiso13.6 (photo ch13-photo3 in a fold): Vxse 82 KIAS from the POH 3.3 (SYNC.pa44-vxse: the book's side),
//    the all-engine speeds in a fold;
//  - me.pattern ← kiso13.6: the list items in です・ます;
//  - me.perf ← kiso13.10・13.11・13.14・13.15・13.19・13.20 (figure oeiClimbBars, new): the POH's examples (figures 5-19・5-21:
//    1,505 → 285 fpm) next to the flight model's values (教材値・参考値: T.multi.T-3's rule), the certification of light twins
//    (EASA TCDS: FAR 23 through amendment 23-16; AFH 13: the old rule asks only that the climb be determined; the POH warns of
//    negative climb), AFH's 100–200 fpm, the light training weight; the definitions, the current 23.2120, the secondary
//    values, the climb-gradient 計算演習 (200 ft/NM: AIM 5-2-9) and the briefing example in folds; the box multi.rating.
// What changed in 'oei' (6 sections: the 5 of the textbook kept with their ids and in their order — oei.what, me.vmc,
// me.drag, me.oei, me.land — and the new me.case at the end where DESIGN 3.3 puts it):
//  - oei.what ← kiso13.3・13.7 (figure oeiForces redrawn with ch13-fig13-2's arm; photo ch13-photo2): yaw = thrust × arm, the
//    critical engine's bold definition here (AFH 13: the most adverse effect on directional control), counter-rotation:
//    「差がなくなる」(K.multi.K-3, R.counter-rotation: directional control only; systems by the airplane: me.sys);
//  - me.vmc ← kiso13.4・13.5・13.9・13.26: the bold definition of 最小操縦速度（Vmc）here (C.vmc-speed-vs-vmc, bk.dont with VMC),
//    the POH's 「a stalled condition」and 4,000 ft AGL (POH 4.47), the certification's conditions, the demonstration speed is
//    not a new limit, the rudder-limiting technique and the twin's spin in a fold (DESIGN 3.3: ラダー制限・双発のスピン);
//  - me.drag ← kiso13.8・13.13 (figure zeroSideslip = ch13-fig13-5 redrawn): the POH's climb penalties (3.9j), zero sideslip
//    with the POH's 2–3°・1/2 ball (K.multi.K-2, R.zero-sideslip: the ball centred is not zero sideslip); the guide's drag
//    demonstration, the three ways to fly, the yaw string and the cowl flaps in a fold;
//  - me.oei ← kiso13.21〜13.23 (figure oeiSteps, new; photo ch13-photo7): **safety item ①** kept word for word in the table
//    (flight.test.mjs: 特定（Identify）→ Dead foot, dead engine → 確認（Verify）→ ゆっくり絞る → フェザー; R.failed-engine-id,
//    K.multi.K-1), the POH's identification and 950 rpm, the failure at low power (AFH 13: everything forward, then the feet),
//    the restart before securing (POH 3.9g); the flight after securing and the ACS / training rules in folds;
//  - me.land ← kiso13.24・13.25: the POH 3.9h (gear and flaps not until the field is made, 90 KIAS and 25°: R.gear-timing-oei)
//    next to AFH; the go-around limit; the ACS in a fold;
//  - ★me.case ← kiso13.28＋NTSB SA-081 (figure oeiFlight, new): one failure through one flight on the fictional LAB, and what
//    SA-081's accidents show; the cases in a fold.
// Every section has scope (DESIGN 3.3: common; 日米 = common with the box multi.rating in me.perf); US rules in a common
// section are in sentences that name the country. The end-of-chapter questions are in place and order, new ones after them
// (me: D・D・C; oei: C・D・C・D). Written questions rewritten from kiso13's qa (me 12, oei 14; q22's answer as K.multi.K-1).
// Every claim (number, unit, rule) is in p5.claims.json with its tag and source.
(function (FL) {
  'use strict';
  const B = FL.book, R = B.R, bk = B.bk, FIG = FL.bookFigs;
  const SM = FL.physics.AIRCRAFT.find(a => a.id === 'pa44').v;
  // new references (to be added to book-core.js's R when the chapters are registered; each URL opened on 2026-10-31)
  const NEW_R = {
    afh12: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 12 章 Transition to Complex Airplanes（定速プロペラ・ガバナー・出力を変える順番）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/13_afh_ch12.pdf' },
    seminoleIM: { label: 'Piper PA-44-180 Seminole Information Manual（Report VB-1942・2006 年。製造番号 4496174・4496224 以降の POH と同じ内容を情報用に出した版で、改訂は追っていない）', url: 'https://www.andrews.edu/cp/aviation/resources/seminole-poh.pdf' },
    easaPa44: { label: 'EASA Type-Certificate Data Sheet EASA.A.232 Piper PA-44（PA-44-180 の型式証明の基準：FAR Part 23 の改正 23-16 まで・型式証明 1978 年）', url: 'https://www.easa.europa.eu/sites/default/files/dfu/EASA%20TCDS%20EASA.A.232-i3-PA44_Piper.pdf' },
    cfr232120: { label: '14 CFR 23.2120 Climb requirements（多発機の推力を失ったあとの上昇勾配）', url: 'https://www.ecfr.gov/current/title-14/part-23/section-23.2120' },
    ntsbSa081: { label: 'NTSB Safety Alert SA-081 Maintain Airplane Control with One Engine Inoperative', url: 'https://www.ntsb.gov/advocacy/safety-alerts/Pages/SA-081.aspx' },
  };

  // ======================================================================= 第 5 部 第 35 章
  B.add({ id: 'me', part: 'p5', t: 'Piper Seminole と双発機の基礎', en: 'The Piper Seminole and multi-engine basics',
    summary: 'Seminole の構造（左右逆回転のエンジン、定速でフェザーできるプロペラ、電動の油圧ポンプで動く引込脚、ナセルの燃料タンク）、片方のエンジンが止まると失う系統、双発機の速度の目印、両発の場周経路と着陸復行、1 発動機不作動時の性能と離陸の計画。プロペラが回転数を保つしくみと出力を変える順番を説明でき、性能の表の前提を読み分けて、離陸の前に止まる所と続ける所を決められるようにする。',
    secs: [
      { id: 'me.basics', t: 'Seminole の構造と操作', scope: 'common', from: ['kiso13.1', 'kiso13.17', 'kiso13.18', 'kiso02.12'], h: () => `
${bk.aim('公開情報では、Archer の次に双発機 Piper Seminole（PA-44-180）で訓練します。1 発動機不作動（片発停止、one engine inoperative）や機材の故障の対応を学びます。この節では、Archer と違う装置を見ます。')}
${FIG.counterRotation()}
${bk.photo('seminole')}
<h3>エンジン 2 基と左右逆回転のプロペラ</h3>
<p>Seminole は、180 hp のエンジンを左右の翼に 1 基ずつ持つ双発機です。左右のプロペラは<b>逆向きに回ります</b>。POH（操縦士用の機体の手引書、pilot's operating handbook）では、左は操縦席から見て右回り、右は左回りです（POH 7.5）。</p>
<p>プロペラは、迎え角（迎角、angle of attack）があると、下がる羽根の側の推力が大きくなります（${bk.see('aero.left', '左へ曲がろうとする力')}）。ふつうの双発機は左右とも同じ向きに回るので、右エンジンの推力は外側に片寄ります。だから左エンジンが止まったときに、方向の操縦がいちばん難しくなります。Seminole は、下がる羽根が左右とも内側です。だから、どちらが止まっても扱いにくさは同じで、臨界発動機がありません（AFH 第 13 章・POH 7.5）。</p>
<h3>プロペラと出力のレバー</h3>
<p>プロペラは、回転数を一定に保つ型です。止まったエンジンのプロペラは、羽根を風の向きにそろえて止められます（${bk.see('me.prop', 'プロペラのしくみ')}）。レバーは 2 本ずつ並び、左からスロットルが黒、プロペラが青、混合比（ミクスチャー、mixture）が赤です（ガイド）。</p>
<h3>脚</h3>
<p>Seminole の着陸装置（降着装置、landing gear）は、引込脚（引き込み脚、retractable landing gear）です。油圧で上げ下げします（${bk.see('me.sys', '片方が止まると失うもの')}）。脚を操作してよい速度（Vlo）は、上げるとき ${SM.lo} kt 以下、下げるとき ${SM.le} kt 以下です（POH 2.3）。脚を出したまま飛べる最大の速度は着陸装置下げ速度（maximum landing gear extended speed、Vle）で、${SM.le} kt です。着陸の前は <b>GUMPS</b>（Gas 燃料・Undercarriage 脚・Mixture・Props・Switches）で確かめます（${bk.see('sys.gear', '着陸装置')}）。</p>
<h3>燃料：ナセルタンク</h3>
<p>燃料タンクは、左右のエンジンナセル（エンジンを包む覆い）に 55 gal ずつあります。使える燃料は合計 108 gal です（POH 7.15）。<b>クロスフィード（crossfeed）</b>は、反対側のタンクからエンジンへ燃料を送る使い方です。片方のエンジンが止まって長く飛ぶときの非常用です。離陸（takeoff）と着陸では使いません（AFH 第 13 章・POH 7.15）。</p>
${bk.deep('クロスフィードの使い方と、移送との違い', `<p>ふだんは、それぞれのエンジンが同じ側のタンクから燃料を使います。クロスフィードを使うと、生きているエンジンが反対側のタンクの燃料も使えます。航続距離（range）が延び、左右の重さの片寄りも防げます。近くに空港があれば、使わずに降ります（AFH 第 13 章）。</p>
<p>Seminole では、生きているエンジンの燃料セレクター（燃料選択弁、fuel selector）を X-FEED にします。止まったエンジンのセレクターは OFF にします。両方を X-FEED にはしません。使うのは水平飛行の巡航のときだけで、着陸の前に ON に戻します（POH 3.23・7.15）。</p>
<p>地上でセレクターを動かすだけでは、クロスフィードが働くかは分かりません。確かめるときは、試運転（ランナップ、run-up）で 1 基ずつクロスフィードにします。1,500 rpm 以上で 1 分以上回します。そのあと元のタンクで 1 分以上回してから離陸します（AFH 第 13 章）。</p>
${bk.dont('<b>クロスフィード</b>は、反対側のタンクから、エンジンへ燃料を送る経路を切り替えます。燃料はタンクの間を動きません。', '<b>燃料の移送（transfer）</b>は、タンクからタンクへ燃料を移すことです。Seminole の燃料系統に移送はありません（POH 7.15）。')}`)}
${bk.deep('双発機の考え方と、飛ぶ前の点検', `<p>エンジンが 2 つあっても、片方が止まると左右の推力がつり合いません。上昇の力も大きく減ります。だから「2 つあるから安全」とは考えず、操縦と性能を分けて準備します（AFH 第 13 章。${bk.see('oei.what', '片発で起きる 2 つの問題')}）。</p>
<p>点検では、左右それぞれの燃料・滑油・プロペラ・空気取り入れ口・漏れを見ます。左右が同じに見えても、それだけで正常とは決めません。整備記録の不具合とその処置も確かめます。</p>
<p>離陸滑走では、速度計だけを見ません。両方のエンジンが決められた吸気圧力（吸気圧、manifold pressure）と回転数を出しているかを確かめます（AFH 第 13 章）。地上で出力の異常が続くときは、飛べば直ると考えず、整備に確かめます。</p>
<p>プロペラ同調装置（propeller synchronizer）は、左右の回転数をそろえて、うなりと振動を減らす装置です。離陸・着陸と、片方のエンジンが止まったときは切ります（AFH 第 13 章）。同調していることは、左右の出力が同じ証拠になりません。</p>
${bk.photo('ch13-photo6')}`)}
${bk.deep('通常の離陸（ガイドの手順の要約）', `<ol><li>離陸前のブリーフィング（briefing）を終え（${bk.see('me.perf', '双発の性能と離陸の計画')}）、フラップ（flaps）を 0 にします。</li><li>両方のスロットルを前へ出します。出力が安定し、<b>速度計が動き始めた</b>こと（airspeed alive）を確かめます。</li><li>${SM.rotate} kt でローテーションし、${SM.y} kt（Vy）で上昇します。</li><li>上昇を確かめ、降りられる滑走路が残っていなければ、ブレーキを軽く当てて<b>脚 UP</b>（${SM.lo} kt 以下）にします。</li><li>巡航上昇に移ります。ガイドは地上 500 ft から 110 kt・25 インチ・2,500 rpm です。公開のチェックリスト（checklist）は、地上 1,000 ft から ${SM.climb} kt です。</li></ol>
<p>着陸の前の確かめを、ガイドは GUMP と書きます。</p>`)}
${bk.key('Seminole は左右逆回転なので、臨界発動機がない', '脚を上げるのは 109 kt 以下。上昇を確かめ、滑走路が残っていなければ', 'クロスフィードは長く片発で飛ぶときの非常用。離陸と着陸では使わない')}
${bk.q('ふつうの双発機で、右エンジンが止まったときより、左エンジンが止まったときの方が扱いにくいのはなぜ？', '残った右エンジンの推力は、下がる羽根の側（外側）に片寄っていて、重心からの腕が長いからです。左が止まると、右エンジンの推力で機首が大きく振られます。だから左エンジンが臨界発動機です（AFH 第 13 章）。')}
${bk.sim('引き込み脚の双発機で離陸し、脚を上げて上昇します。シミュレータの Seminole は、プロペラ・ミクスチャーのレバーを省略しています。スロットル（R / F）で、両方のエンジンを一緒に操作します。脚は G キーで上げ下げします。課目の基準は、地上 500 ft までに脚 UP です。', ['m1', '双発の離陸と上昇'])}` },
      { id: 'me.prop', t: '定速プロペラ・フェザー・出力を変える順番', scope: 'common', from: ['kiso03.16', 'kiso03.17', 'kiso03.18', 'kiso13.12', 'kiso01.25'], jcab: ['ppl.1.1.1.8', 'cpl.1.1.1.8', 'cpl.1.4.1.5'], faa: ['CA.X.A.K5'], h: () => `
${bk.aim('Seminole のプロペラが回転数を保つしくみと、止まったエンジンのプロペラの止め方を理解します。出力を変えるときのレバーの順番も覚えます。')}
${FIG.propGovernor()}
<p><b>定速プロペラ（constant-speed propeller）</b>は、プロペラレバーで選んだ回転数を保つプロペラです。<b>プロペラガバナー（ガバナー、propeller governor）</b>が、選んだ回転数と今の回転数を比べ、羽根の角度を油圧で変えます（AFH 第 12 章）。機首を上げて速度が落ちると羽根を浅くし、機首を下げると深くします。</p>
<p>出力は、スロットルで決まる吸気圧力と、プロペラレバーで決まる回転数で決まります（例：25 インチ・2,500 rpm）。定速プロペラは回転数を保つ装置で、出力や推力を一定にする装置ではありません（AFH 第 12 章）。</p>
<h3>出力を変える順番</h3>
<p>高い吸気圧力と低い回転数の組み合わせは、エンジンに無理をさせ、異常な燃焼を起こします。だから順番を決めて動かします（AFH 第 12 章）。</p>
<ul><li><b>増やすとき</b>：回転数（プロペラ）を先に上げ、そのあと吸気圧力（スロットル）を上げます。</li><li><b>減らすとき</b>：吸気圧力を先に下げ、そのあと回転数を下げます。</li></ul>
<h3>止まったエンジンのプロペラ</h3>
<p>エンジンが止まっても、プロペラは前からの風で回され続けます。これが<b>風車状態（ウインドミリング、windmilling）</b>です。羽根の角度が浅いまま高い回転で回ると、機体全体の有害抗力（parasite drag）と同じくらいの抗力（drag）を出すことがあります（AFH 第 13 章）。プロペラが回っていることは、推力が出ている証拠ではありません。</p>
<p><b>フェザー（フェザリング、feather）</b>は、羽根を風の向きにそろえて回転を止めることです。風車状態より抗力がずっと小さくなります（AFH 第 13 章）。回転を機械でロックするのではありません。プロペラレバーを後ろいっぱい（FEATHER）まで引くとフェザーになり、Seminole では約 6 秒かかります（POH 7.5）。</p>
<p>ただし、回転が下がると、遠心力で働く止め（フェザーロック）がフェザーを止めます。Seminole は 950 rpm より下ではフェザーできません（POH 7.5）。AFH の例は約 800 rpm で、機体によって違います。フェザーすると決めたら、回転が下がりきる前にします。</p>
${bk.deep('羽根を動かす力・アンフェザー・ベータとリバース', `<p>Seminole のプロペラは、エンジンの油圧で羽根を高回転の側へ動かし、窒素の圧力とばねでフェザーの側へ動かします（POH 7.5）。だから油圧がなくなると、羽根はフェザーの側へ動きます（AFH 第 13 章）。</p>
${bk.photo('ch13-photo4')}
<p>プロペラの羽根は回る翼で、根元から先まで迎え角が合うようにねじってあります。定速プロペラの羽根の角度の範囲は約 11.5〜40° で、この範囲の中なら回転数は一定に保たれます。羽根の角度が止まりまで動くと、固定ピッチのプロペラと同じように回転数が変わります（AFH 第 12 章）。</p>
${bk.photo('ch03-photo4')}
<p>着陸復行（ゴーアラウンド、go-around）で全部前へ出すときも、混合比 → プロペラ → スロットルの順です（ガイド）。回転数が先です。</p>
<p>フェザーを戻す（アンフェザー）には、エンジンを回して油圧をつくります。Seminole には、油圧をためておく蓄圧器（アキュムレーター）で羽根を戻す方式もあります。この方式では、フェザーに 10〜17 秒、戻すのに 8〜12 秒かかります（POH 7.5）。空中で再始動するときは、プロペラレバーを前へ出します。5〜7 秒で風車状態にならなければ、スターターを 1〜2 秒回します（POH 3.11）。手順は機体の POH に従います。</p>
<p>地上でフェザーし、地上でかけ直すことは、振動と負担が大きいので、メーカーは強く勧めません（AFH 第 13 章）。</p>
<p>ベータ域とリバースは、ターボプロップ機などで、羽根の角度を浅い側や逆向きにする機能です。可変ピッチのプロペラが、全部この機能を持つわけではありません。Seminole の POH の手順には出てきません。</p>`)}
${bk.key('定速プロペラは回転数を保つ。出力は吸気圧力と回転数で決まる', '出力を増やすときは回転数が先、減らすときは吸気圧力が先', 'フェザーは回転が下がりきる前に。Seminole は 950 rpm より下ではできない')}
${bk.warn('<b>よくある間違い：</b>止まったエンジンのプロペラが回っていると、まだ力が出ていると思い込みがちです。風車状態のプロペラは、大きな抗力を出しています（AFH 第 13 章）。')}
${bk.recall('単発機が左へ曲がろうとする 4 つの力は、逆に回る右エンジンでは向きが逆になります。', ['aero.left', '左へ曲がろうとする力'])}
${bk.q('上昇中に、出力を少し減らしたい。スロットルとプロペラレバーのどちらを先に動かす？', 'スロットルを先に戻して吸気圧力を下げ、そのあとプロペラレバーで回転数を下げます。高い吸気圧力と低い回転数の組み合わせを避けるためです（AFH 第 12 章）。')}
${bk.sim('止まったエンジンのプロペラをフェザーします。この教材の Seminole は、プロペラと混合比のレバーを省略しています。フェザーは [（左）/ ]（右）キーです。', ['m2', '上空での片発停止'])}` },
      { id: 'me.sys', t: '片方のエンジンが止まると失うもの（系統）', scope: 'common', from: ['kiso02.09', 'kiso02.10', 'kiso02.14', 'kiso13.16'], jcab: ['cpl.1.3.1.2', 'cpl.1.3.6.1', 'cpl.1.3.6.2'], h: () => `
${bk.aim('エンジンが 2 つあっても、片方が止まると使えなくなる装置があります。Seminole を例に、何を失い、何が残るかを整理します。')}
${FIG.twinSystems()}
<p>装置が 2 つあることと、片方のエンジンが止まっても全部が使えることは別です。発電機やポンプがどのエンジンで回るかを、系統図で確かめます（AFH 第 13 章）。</p>
<h3>電気</h3>
<p>Seminole は、14 V・60 A の発電機を各エンジンに 1 つずつ持ちます（POH 7.17）。ふだんは 2 つで電気の負荷を分け合います。片方が止まると、残りの 1 つで全部をまかないます。容量が足りなければ、使う電気を減らします（AFH 第 13 章・POH 3.5）。</p>
<h3>脚の油圧</h3>
<p>Seminole の脚は、電動の油圧ポンプで上げ下げします（POH 7.9）。だから、どちらのエンジンが止まっても、電気があれば脚を動かせます。片方のエンジンが回すポンプしかない機体では、そのエンジンが止まると脚を上げにくく、高度を数百 ft 失うことがあります（AFH 第 13 章）。</p>
<p>Seminole の脚は、油圧で上げた位置に保たれます。油圧が使えないときは、非常用のノブで油圧を抜くと、脚は重さとばねで下りて固定されます（POH 7.9）。</p>
${bk.deep('脚の表示・燃料ポンプ・ヒーター', `<p>脚の位置は、緑のランプ 3 つ（下りて固定）と、赤の GEAR WARNING（途中）で確かめます（POH 7.9）。</p>
${bk.dont('<b>脚のスイッチの位置</b>は、操縦士が出した指令です。', '<b>脚が動いたか・どこにあるか</b>は、位置の表示（緑のランプ・赤の GEAR WARNING）で見ます。', '<b>下げの位置で固定されたか</b>は、固定の表示で見ます。外から見ても分かりません。')}
${bk.photo('ch02-photo4')}
<p>各エンジンには、エンジンが回す燃料ポンプが 1 つあります。電動燃料ポンプはその予備で、離陸と着陸のときに ON にします（POH 7.15）。エンジンが回すポンプが壊れたら、その側の電動燃料ポンプを使います（POH 3.23）。</p>
<p>燃焼式のヒーター（combustion heater）は、機体の燃料を燃やして客室を暖めます。Seminole では、左のタンクから 1 時間に約 0.5 gal を使います（POH 7.23）。飛行の計画では、この燃料も見込みます。</p>`)}
${bk.deep('油圧のしくみと部品', `<p>油圧は、圧縮されにくい作動油で、力と動きを伝えます。ピストンの力 F は、両側の圧力の差 Δp と面積 A の積です（F ＝ Δp × A）。ピストンが動く速さ v は、流量 Q を面積で割った値です（v ＝ Q ÷ A）。圧力と流量は別の量です。</p>
${bk.t(['部品', '働き'], [['リザーバー', '作動油をためる。Seminole はポンプと一体（POH 7.9）'], ['ポンプ', '流量をつくる。Seminole は電動で、回る向きを変えて上げ下げする（POH 7.9）'], ['方向切替弁', '作動油を送る側と戻す側を切り替える'], ['リリーフ弁', '圧力が高すぎるときに逃がす'], ['蓄圧器（アキュムレーター）', '圧力を持った作動油を少しためておく'], ['フィルター', '作動油の中の異物を取る']])}
<p>圧力の表示が正常でも、作動油が漏れて減っていれば、長くは働きません。圧力・量・温度を別々に読みます。</p>`)}
${bk.drill('油圧の力と速さ', '<p>圧力の差が 10 MPa、ピストンの面積が 4.0 cm² です。ピストンの力は何 N ですか。同じピストンに 1 分に 2.4 L の作動油が流れ込むと、ピストンは 1 秒に何 m 動きますか。漏れと摩擦は考えません。</p>', '<p>10 MPa ＝ 10,000,000 Pa、4.0 cm² ＝ 0.00040 m² なので、F ＝ 10,000,000 × 0.00040 ＝ 4,000 N です。流量は 2.4 L/min ＝ 0.0024 m³ ÷ 60 s ＝ 0.000040 m³/s なので、v ＝ 0.000040 ÷ 0.00040 ＝ 0.10 m/s です。面積を cm² のまま入れないことが大切です。</p>')}
${bk.key('2 つあっても、片方が止まると何を失うかは系統図で確かめる', 'Seminole の脚は電動の油圧ポンプ。油圧がなくても重さとばねで下りる', '発電機が 1 つになったら、電気の負荷を減らす')}
${bk.warn('<b>よくある間違い：</b>2 つあるから、片方が必ず助けてくれると考えがちです。燃料の誤り・水・整備の誤りは、両方のエンジンに同時に効きます。')}
${bk.recall('発電機はエンジンが回して電気をつくり、電池を充電します。発電機が止まると、電池の電気だけで動きます。', ['sys.elec', '電気系統'])}
${bk.q('左エンジンが止まった。Seminole で脚を上げ下げできる？', 'できます。脚のポンプは電動なので、右の発電機と電池で電気があれば動きます（POH 7.9）。発電機が 1 つになるので、使う電気は減らします（POH 3.5）。')}` },
      { id: 'me.speeds', t: '双発機の速度の目印：赤い線と青い線', scope: 'common', from: ['kiso13.6'], faa: ['CA.IX.E.K2', 'CA.IX.F.K2', 'CA.IX.G.K2', 'CA.X.A.K2', 'CA.X.B.K2'], h: () => `
${bk.aim('双発機の速度計にある赤い線と青い線の意味と、片方のエンジンが止まったときに大切な 4 つの速度を覚えます。')}
${FIG.twinAsi()}
<p>双発機の対気速度計（速度計、airspeed indicator）には、単発機にない 2 つの目印があります。<b>赤い線</b>（red radial）は、最小操縦速度（Vmc、minimum control speed）です。<b>青い線</b>（blue radial）は、1 発動機不作動時の最良上昇率速度（Vyse、best single-engine rate of climb speed）です（AFH 第 13 章）。本書では、最小操縦速度を Vmc とも書きます。</p>
<h3>片方のエンジンが止まったときの 4 つの速度</h3>
${bk.t(['速度', '値', '意味'], [
  ['Vmc（赤い線）', `${SM.mc} kt`, '急に片方のエンジンの推力を失っても、方向の操縦を保てる最小の速度。決められた条件（生きているエンジンが最大出力・止まった側は風車状態・後方の重心・生きている側へバンク 5° 以内など）での値。その速度で上昇できるとは限らない'],
  ['Vyse（青い線）', `${SM.yse} kt`, '片方のエンジンで最もよく上昇できる速度（最良上昇率）。片発の絶対上昇限度（absolute ceiling）より上では、降下率が最小になる速度'],
  ['Vxse', '82 kt', '1 発動機不作動時の最良上昇角速度（best single-engine angle of climb speed）。最も急に上昇できる速度'],
  ['Vsse', `${SM.sse} kt`, '訓練で、わざと片方のエンジンを止めてよい最小の速度（safe single-engine speed）']])}
<p>Vxse の 82 kt は、Piper の Information Manual の値です（参考値：POH 3.3）。POH と同じ内容の資料で、公開チェックリストも 82 kt です。ガイドの速度表は 88 kt です。この教材の機体モデルの表も、ガイドに合わせて ${SM.xse} kt です（教材値）。</p>
${bk.deep('両発の速度と制限速度（Seminole）', `${bk.t(['速度', '値', '意味'], [
  ['Vr / Vx / Vy', `${SM.rotate} / ${SM.x} / ${SM.y} kt`, '両発のローテーション速度（Vr、rotation speed）・最良上昇角速度（Vx、best angle of climb speed）・最良上昇率速度（Vy）'],
  ['Vso / Vs1', `${SM.s0} / ${SM.s1} kt`, '失速（stall）する速度（着陸の形態 / 決められた形態）'],
  ['Vfe', `${SM.fe} kt`, 'フラップを出してよい最大の速度'],
  ['Vlo / Vle', `上げ ${SM.lo}・下げ ${SM.le} / ${SM.le} kt`, '脚を操作してよい速度 / 着陸装置下げ速度'],
  ['Va', `${SM.va} kt`, '設計運動速度（Va、design maneuvering speed）。最大の重量（重力、weight）3,800 lb のとき。軽いほど小さく、2,700 lb で 112 kt'],
  ['Vno / Vne', `${SM.no} / ${SM.ne} kt`, '構造上の最大巡航速度（最大構造巡航速度、maximum structural cruising speed。黄の弧の始まり）/ 超過禁止速度（never-exceed speed。赤い線）']])}
<p>速度は POH 2.3 と、公開のガイドとチェックリストの値です。機体・年式・重量で違うので、実機は POH / AFM と速度計の目印に従います。Vmc の条件と、条件で Vmc がどう変わるかは ${bk.see('me.vmc', 'Vmc と、それを決める条件')} で学びます。</p>
${bk.photo('ch13-photo3')}`)}
${bk.key('片発になったら、まず速度：赤い線より上、できれば青い線', '赤い線（Vmc）は方向を保つための速度。上昇できるとは限らない', '青い線（Vyse）で上昇できなければ、青い線を保って降下率を最小にする')}
${bk.q('片方のエンジンで、青い線の速度を保っても上昇できない。どうする？', '青い線（Vyse）を保ちます。いまの高さが片発の絶対上昇限度より上なので、Vyse で降下率が最小になり、高度をいちばんゆっくり失います。その高さまで降りれば、水平に飛べます。脚とフラップが UP で、止まった側がフェザーされているかも確かめ、近くの空港や降りられる場所を探します（AFH 第 13 章）。')}` },
      { id: 'me.pattern', t: '双発の場周経路・着陸・着陸復行', scope: 'common', from: ['kiso13.6'], h: () => `
${bk.aim('両方のエンジンが動いているときの、場周経路（traffic pattern）から着陸までの流れと、両発の着陸復行を覚えます。')}
${bk.t(['場所（ガイドの手順の要約）', '出力・速度・形態'], [
  ['ダウンウインド（downwind leg）に入る', '18 インチ・2,300 rpm・約 100 kt。着陸前の点検（GUMPS）'],
  ['接地点の真横（アビーム）', 'フラップ 10。1 分に 200〜300 ft で降下を始める'],
  ['ベース', `青い線（${SM.appr} kt）まで減速し、フラップ 25。もう一度 GUMPS`],
  ['ファイナル（final approach leg）', `着陸が確実になるまで青い線（${SM.appr} kt）を保つ。地上 500 ft より下で安定した進入になっているか確かめる`],
  ['着陸が確実になったら', `フラップを全部（40°）出し、${SM.apprFull} kt に減速。短いファイナルで、脚 DOWN とプロペラ前を確かめる`]])}
<p>ファイナルで青い線を保つのは、着陸が確実になるまでに片方のエンジンが止まっても、片発で飛べる速度を残しておくためです。メーカーの推奨速度がないとき、AFH は、着陸が確実になる短いファイナルまで Vyse より遅くしないとしています。どんな場合も Vmc より遅くしません（AFH 第 13 章）。</p>
<h3>両発の着陸復行</h3>
<ol><li>混合比 → プロペラ → スロットルの順に前へ出します（全部前へ）。</li><li>機首を上げて上昇の姿勢にします。速度はガイドが 82 kt、公開チェックリストはフラップを 25° にして ${SM.ga} kt です。</li><li>フラップを少しずつ上げます。</li><li>上昇を確かめて、脚 UP にします（${SM.lo} kt 以下）。</li></ol>
<p>ガイドの訓練では、片発での着陸復行はしません。片発の着陸は ${bk.see('me.land', '片発の進入と着陸')} で学びます。</p>
${bk.key('ファイナルは、着陸が確実になるまで青い線', '着陸復行は「全部前へ」、フラップは少しずつ、脚は上昇を確かめてから', '着陸の前は GUMPS を 2 回（ダウンウインドとベース）')}
${bk.q('ファイナルで、着陸が確実になるまで青い線の速度を保つのはなぜ？', 'その前に片方のエンジンが止まっても、すぐに片発で最もよく上昇できる速度（Vyse）にいるからです。着陸が確実になってから、フラップを全部出して減速します。')}` },
      { id: 'me.perf', t: '双発の性能と離陸の計画', scope: 'common', from: ['kiso13.10', 'kiso13.11', 'kiso13.14', 'kiso13.15', 'kiso13.19', 'kiso13.20'], jcab: ['ppl.1.1.2.3', 'cpl.1.1.2.3'], faa: ['CA.IX.E.K3', 'CA.IX.F.K3'], h: () => `
${bk.aim('片方のエンジンが止まると上昇性能がどれだけ落ちるかと、離陸の前に決めておくことを覚えます。')}
${FIG.oeiClimbBars()}
<p>エンジンが 2 つあるので安全、と考えがちです。しかし片方が止まると、出力は半分でも、<b>上昇性能は 80〜90% 失われます</b>（AFH 第 13 章）。上昇に使えるのは、水平に飛ぶのに必要な出力を超えた、余りの出力だけだからです。</p>
${bk.t(['例', '両発', '片方が止まると', '減り方'], [
  ['AFH の仮の双発機（推力馬力 200 × 2・水平飛行に 175）', '余り 225', '余り 25', '約 9 割減'],
  ['Seminole の POH の図の例（1,250 ft・8°C・3,430 lb・88 KIAS・脚 UP）', '上昇率 1,505 fpm', '上昇率 285 fpm', '約 81% 減（参考値：POH 図 5-19・5-21）'],
  ['教材のフライトモデルの Seminole（海面付近・88 kt）', '上昇率 約 1,330 fpm', '上昇率 約 280 fpm', '約 79% 減（教材値）']])}
<p>小さな双発機の古い認証の基準は、片発で上昇できることを求めていません（AFH 第 13 章）。Seminole の POH も、重さ・形態・気象・速度によっては、片発で上昇できないと警告しています（POH 3.5）。だから計画では、公表の片発の上昇率が少なくとも 100〜200 fpm なければ、離陸を続ける選択肢はないと考えます。乱気流（turbulence）・エンジンの摩耗・操縦のまずさで、200 fpm はすぐなくなるからです（AFH 第 13 章）。</p>
${bk.deep('認証の基準・暑い日・訓練の重さ', `<p>Seminole の型式証明は 1978 年です。米国の基準は、FAR Part 23 の改正 23-16 までが当てはまります（EASA の型式証明書のデータシート）。この時代の米国の基準では、最大重量 6,000 lb 以下・Vso 61 kt 以下の双発機は、片発の上昇率を決めて示すだけでした。上昇率はプラスでなくてもかまいません（AFH 第 13 章）。</p>
<p>米国の今の 14 CFR 23.2120(b)(1) は、低速の小さな双発機に上昇勾配を求めます。対象は、レベル 1・2 で、片発の耐衝撃の要件を満たさない機体です。推力を失ったあと、気圧高度（pressure altitude）5,000 ft・巡航の形態で 1.5% です。古い基準で認証された機体には、その時の基準が当てはまります（AFH 第 13 章）。</p>
<p>密度高度（density altitude）が高い日は、自然吸気のエンジンの出力が減ります。上昇は、さらに落ちます（${bk.see('perf.da', '暑い・高い日の性能')}）。Vmc は下がりますが、上昇の余りも減るので、安全の余裕が増えるわけではありません（AFH 第 13 章）。</p>
<p>訓練では最大重量よりずっと軽い重さで飛ぶことが多く、片発の性能が実際より良く感じられます（AFH 第 13 章）。教材のモデルの値は、POH の図の例と同じくらいの大きさです。重さ・高さ・気温が違うので、同じ数字にはなりません。実機は、その機体の POH の性能の章の図で確かめます。</p>`)}
${bk.deep('性能の言葉と公表値', `${bk.t(['用語（AFH 第 13 章）', '意味'], [
  ['加速停止距離（accelerate-stop distance）', '決めた速度まで加速し、そこでエンジンが止まって、止まりきるまでに必要な滑走路の長さ'],
  ['加速継続距離（加速続行距離、accelerate-go distance）', '決めた速度でエンジンが止まっても離陸を続け、50 ft の高さに達するまでの距離（公表していない機体もある）'],
  ['上昇勾配（climb gradient）', '水平に 100 ft 進む間に上がる高さ（%）'],
  ['両発の実用上昇限度（service ceiling）', '両発で 1 分に 100 ft 上昇できなくなる高度'],
  ['片発の実用上昇限度', '片発で 1 分に 50 ft 上昇できなくなる高度'],
  ['片発の絶対上昇限度（absolute ceiling）', '片発でもう上昇できなくなる高度。ここより上では、Vyse で降下率が最小']])}
<p>規則は、滑走路が加速停止距離より長いことを求めていません。多くの POH では、加速停止距離は参考の値です。それでも、経験のあるパイロットは、加速停止距離より長い滑走路を使います（AFH 第 13 章）。公表の加速継続距離や上昇勾配は、理想的な試験の条件で決めた値です。実際の運航で同じ性能が出るとは考えにくい、と AFH は書いています。</p>
<p>AFH の例では、片発の上昇率が 150 fpm くらいの双発機は、50 ft から 500 ft まで上がるのに約 3 分かかります。その間に約 5 NM 進みます。そこで旋回すれば、上昇性能はさらに落ちます（AFH 第 13 章）。</p>
<p>航空雑誌と年鑑には、PA-44-180 の公表値が載っています。両発の上昇率は約 1,340 fpm、片発の上昇率は約 212 fpm（最大重量）です。片発の実用上昇限度は約 4,100 ft です。出典は Aviation Consumer 誌 2000 年 8 月号と Jane's All the World's Aircraft 1982–83 で、どれも参考値・二次資料です。この 3 つは、ここで読んだ POH にはありません。年式・重さ・条件で違うので、実機は POH の図で確かめます。</p>`)}
${bk.drill('上昇率を上昇勾配に直す', '<p>1 発動機不作動の上昇率が 200 fpm、対地速度（groundspeed）が 100 kt です。1 NM 進む間に何 ft 上がりますか。対地速度が 120 kt ならどうですか。また、POH の図の例の 285 fpm を、対地速度 88 kt（無風）として直すとどうなりますか。</p>', '<p>100 kt は 1 分に 100 ÷ 60 ≒ 1.67 NM なので、200 ÷（100 ÷ 60）＝ 120 ft/NM です。120 kt では 1 分に 2 NM なので、200 ÷ 2 ＝ 100 ft/NM です。同じ上昇率でも、追い風で対地速度が増えると、勾配は小さくなります。285 fpm は 285 ÷（88 ÷ 60）≒ 194 ft/NM です。米国の計器出発の標準の 200 ft/NM（AIM 5-2-9）に届きません。</p>')}
<h3>離陸前のブリーフィング：3 つの場面</h3>
<p>AFH は、離陸の前に「どこまでなら止まり、どこからなら上昇を続けるか」を決めておくよう勧めています。目安は、<b>脚を上げる操作をする前なら、浮いていても離陸をやめる</b>ことです。</p>
${bk.t(['場面（AFH 第 13 章）', 'すること'], [
  ['① 脚 DOWN（滑走路が残っている）', '機首をまっすぐに保ち、<b>両方のスロットルを閉じて</b>、残りの滑走路（またはその先）に降りる。Seminole の POH も、75 KIAS より前か脚 DOWN なら、スロットルを閉じてまっすぐ止まる（POH 3.5）'],
  ['② 脚 UP・片発で上昇できる', `操縦（方向舵（ラダー、rudder）で偏揺れを止め、生きている側へ少しバンク）→ <b>Vyse（${SM.yse} kt）</b>・全部前へ・脚とフラップ UP → 止まったエンジンを特定・確認 → <b>フェザー</b>`],
  ['③ 脚 UP・片発で上昇できない', '正面の、なるべくよい場所に、<b>制御したまま降りる</b>。無理に高度を保とうとして速度を失うのが、いちばん危ない']])}
${bk.deep('ブリーフィングの例', `<ul><li>Vr ${SM.rotate}、上昇 ${SM.y}、青い線 ${SM.yse}、赤い線 ${SM.mc} です。</li><li>脚が下りていて滑走路が残っていれば、両方のスロットルを閉じて正面に降ります。</li><li>脚が上がっていれば、青い線・全部前へ・脚とフラップ UP・特定・確認・フェザーです。</li><li>上昇できなければ、制御したまま正面に降ります。</li></ul>`)}
${bk.calc('da')}
${bk.key('片方のエンジンが止まると、上昇性能は 80〜90% 失われる', '脚を上げる操作の前に止まったら、浮いていても離陸をやめる', '上昇できないときは、制御したまま正面に降りる')}
${bk.jur('multi.rating')}
${bk.recall('上昇に使えるのは、水平飛行に要る分を超えた余りの出力です。暑く高い所ほど、余りは小さくなります。', ['perf.climb', '上昇の性能'])}
${bk.q('浮いた直後、脚がまだ DOWN で、滑走路が十分に残っているときに、片方のエンジンが止まった。どうする？', '機首をまっすぐに保ち、両方のスロットルを閉じて、残りの滑走路に降ります（AFH 第 13 章）。脚を上げ、フェザーし、加速するのを、低い高さで方向を保ちながら全部うまく行うのは、とても難しいからです。')}` },
    ],
    terms: [['Multi-engine (AMEL)', '多発（陸上）', '事業用 ACS の多発の課目'], ['Counter-rotating propellers', '左右逆回転のプロペラ', 'Seminole は臨界発動機がない'], ['Critical engine', '臨界発動機', '止まると方向の操縦が最も難しくなるエンジン'], ['P-factor', 'P ファクター', '下がる羽根の側の推力が大きい'], ['Constant-speed propeller / Governor', '定速プロペラ・プロペラガバナー', '羽根の角度を変えて回転数を一定に'], ['Manifold pressure (MP)', '吸気圧力', 'インチ水銀柱'], ['Feather / Unfeather', 'フェザー（羽根を風の向きに）・アンフェザー', '抗力が最小'], ['Windmilling', '風車状態', '止まったプロペラが風で回される'], ['Retractable gear / GUMPS', '引込脚・着陸前の確認', 'ガイドは GUMP'], ['Vlo / Vle', '脚の操作速度・着陸装置下げ速度', '上げ 109・下げ 140 / 140 kt'], ['Nacelle tank / Crossfeed', 'ナセルタンク・クロスフィード', '片発で長く飛ぶときの非常用'], ['Airspeed alive', '速度計が動き始めたことの確認', '離陸滑走'], ['Red radial (Vmc) / Blue radial (Vyse)', '赤い線・青い線', 'AFH 第 13 章'], ['Vxse / Vsse', '1 発動機不作動時の最良上昇角速度・わざと片発にしてよい最小の速度', '82 / 82 kt'], ['Accelerate-stop / Accelerate-go distance', '加速停止距離・加速継続距離', '加速継続は 50 ft まで'], ['Climb gradient', '上昇勾配', '%'], ['Single-engine service / absolute ceiling', '片発の実用上昇限度・絶対上昇限度', '50 fpm / 上昇できない'], ['Feathering lock', 'フェザーロック', 'Seminole は 950 rpm より下で働く'], ['Alternator / Load shedding', '発電機・電気の負荷を減らすこと', '各エンジンに 1 つ'], ['Emergency gear extension', '脚の非常用の下げ方', '油圧を抜き、重さとばねで'], ['Propeller synchronizer', 'プロペラ同調装置', '離陸・着陸・片発では切る']],
    examples: ['離陸後 600 ft・脚 UP で右エンジンの出力が落ちた（本当の故障の例）→ 左足を強く踏んで偏揺れを止める → 88 kt を保つ → 全部前へ → 脚とフラップ UP を確認 → 遊んでいる足は右 ＝ 右が止まった → 右のスロットルを絞っても変化なし（確認）→ 右をフェザー → 生きている左へ約 2° バンク。', '着陸前：GUMPS — 燃料セレクター ON・燃料ポンプ ON・脚 DOWN（緑 3 つ）・ミクスチャー RICH・プロペラ前・スイッチ（ライトなど）。', '上昇中に出力を減らす：スロットルで吸気圧力を 25 インチへ → プロペラで 2,500 rpm へ（減らすときは吸気圧力が先）。'],
    cautions: ['この章の値・手順は、公開されている訓練校のガイドとチェックリストと、Piper の Information Manual の要約で、航空会社や訓練会社の SOP ではない。実機は、その機体の POH / AFM と訓練校のチェックリストに従う。', 'この章で「POH」と書いた Seminole の値は、Piper の Information Manual（Report VB-1942、2006 年。その製造番号以降の POH と同じ内容）で確かめた。年式・装備で違う。', 'この教材の Seminole は、プロペラ・ミクスチャー・カウルフラップのレバーを省略している（シミュレータで体験の囲みを見る）。'],
    quiz: [
      { q: 'Seminole に「臨界発動機」がないのはなぜ？', choices: ['エンジンが胴体の中にあるから', '左右のプロペラが逆に回り、下がる羽根が左右とも内側にあるから', 'ラダーが大きいから', '自動でフェザーするから'], answer: 1, why: '下がる羽根の側の推力が大きい（P ファクター）。左右逆回転では両方とも内側なので、どちらが止まっても扱いにくさは同じ（AFH 第 13 章・POH 7.5。本文 me.basics）。' },
      { q: '速度計の青い線（ブルーライン）が示すのは？', choices: ['Vmc', 'Vyse（片発の最良上昇率）', 'Vne', 'Vfe'], answer: 1, why: '赤い線が Vmc、青い線が Vyse（AFH 第 13 章。本文 me.speeds）。片発になったら、まず青い線。' },
      { q: '双発機が片発になったときの上昇性能の変化（AFH）は？', choices: ['ちょうど半分になる', '1〜2 割減る', '80〜90% 失われる', '変わらない'], answer: 2, why: '上昇に使えるのは、水平飛行に必要な出力を超えた余りだけ。片発ではその大部分がなくなる（AFH の例：余り 225 → 25。本文 me.perf）。' },
      { q: '浮いた直後、脚がまだ DOWN で滑走路が十分に残っているときに、片方のエンジンが止まった。AFH の考え方は？', choices: ['両方のスロットルを閉じて、残りの滑走路に降りる', '脚を上げて上昇を続ける', 'フェザーしてから旋回して戻る', '生きている側へ急旋回する'], answer: 0, why: 'AFH 第 13 章：脚を上げる操作の前なら、浮いていても離陸をやめ、両方のスロットルを閉じて正面に降りる（本文 me.perf）。' },
      { q: 'Seminole の脚の速度の制限（公開チェックリスト）で正しいのは？', choices: ['上げは 109 kt 以下、下げは 140 kt 以下', '上げも下げも 109 kt 以下', '上げも下げも 140 kt 以下', '上げは 140 kt 以下、下げは 109 kt 以下'], answer: 0, why: 'Vlo は上げ 109 kt・下げ 140 kt、Vle は 140 kt。上げるときの方が厳しい（POH 2.3・公開チェックリスト。本文 me.basics）。' },
      { q: '定速プロペラの機体で、出力を増やすときの順番（AFH）は？', choices: ['スロットル（吸気圧力）を先に上げ、そのあとプロペラ（回転数）', 'どちらを先にしてもよい', 'プロペラレバーだけを動かす', 'プロペラ（回転数）を先に上げ、そのあとスロットル（吸気圧力）'], answer: 3, why: 'AFH 第 12 章：増やすときは回転数が先、減らすときは吸気圧力が先。高い吸気圧力と低い回転数の組み合わせを避ける（本文 me.prop）。' },
      { q: 'Seminole（POH）で、プロペラをフェザーできなくなるのは、回転数がおよそ何 rpm より下がったとき？', choices: ['2,700 rpm', '1,500 rpm', '500 rpm', '950 rpm'], answer: 3, why: 'POH 7.5：遠心力で働くフェザーロックが、950 rpm より下ではフェザーを止める。だから回転が下がりきる前にフェザーする（本文 me.prop）。' },
      { q: 'Seminole で左エンジンが止まった。脚の上げ下げは？（POH）', choices: ['左エンジンのポンプなので、できない', '右エンジンのポンプなので、右が回っていればできる', '脚のポンプは電動なので、電気があればできる', '手で回すポンプだけでする'], answer: 2, why: 'POH 7.9：脚の油圧ポンプは電動。油圧が使えないときは、非常用のノブで重さとばねで下ろす（本文 me.sys）。' },
    ],
    written: [
      ['双発機でエンジンが 1 つ止まったとき、「操縦」と「性能」を分けて考えるのはなぜですか。', `まっすぐ飛べても、残りの出力では上昇も高度の維持もできないことがあるからです。逆に、性能の表に余裕があっても、方向を失えば使えません。両方がそろって初めて飛び続けられます。${bk.see('oei.what', '片発で起きる 2 つの問題')}`, ['kiso13.q1']],
      ['Vyse・Vxse・Vsse は、それぞれ何のための速度ですか。', `Vyse は片方のエンジンで時間あたりいちばん多く上がる速度（青い線）、Vxse は進む距離あたりいちばん多く上がる速度です。Vsse は、訓練でわざと片方のエンジンを止めてよい最小の速度です。値は機体の POH で確かめます。${bk.see('me.speeds', '双発機の速度の目印')}`, ['kiso13.q6']],
      ['自然吸気のエンジンの双発機では、高い所ほど Vmc が下がります。それでも安全の余裕が増えたとは言えないのはなぜですか。', `出力が減るので左右の推力の差は小さくなりますが、上昇に使える余りの出力も減るからです。方向は保ちやすくても、上昇できない条件があります。${bk.see('me.perf', '双発の性能と離陸の計画')}`, ['kiso13.q10']],
      ['使える出力 200、水平飛行に要る出力 90 の双発機で、片方が止まって使える出力が 100 になったとします。余りの出力はいくつからいくつに減り、何 % 減りますか。', `余りは 200 − 90 ＝ 110 から、100 − 90 ＝ 10 に減ります。減り方は（110 − 10）÷ 110 × 100 ≒ 91% です。要る出力を変えない学習用の計算で、実機の値ではありません。${bk.see('me.perf', '双発の性能と離陸の計画')}`, ['kiso13.q11']],
      ['フェザーする目的は何ですか。フェザーしただけで、止まったエンジンの処置が終わらないのはなぜですか。', `止まったエンジンのプロペラの羽根を風の向きにそろえ、抗力を小さくするためです。フェザーは羽根の角度を変えて回転を止めるだけで、燃料・点火・発電機を切る片付けや、火災のときの処置は別にあります。手順は POH で確かめます。${bk.see('me.prop', '定速プロペラ・フェザー')}`, ['kiso13.q12']],
      ['1 発動機不作動の上昇性能の図を読むとき、密度高度と重さのほかに確かめる条件を 3 つ挙げてください。', `例えば、速度（Seminole は 88 KIAS）、生きているエンジンの出力、止まった側のプロペラ（フェザー）、脚とフラップの形態、バンク（2〜3°）、カウルフラップです。図の前提と違う飛び方では、その数字は出ません。${bk.see('me.perf', '双発の性能と離陸の計画')}`, ['kiso13.q14']],
      ['上昇率 200 ft/min・対地速度 100 kt のとき、1 NM 進む間に何 ft 上がりますか。対地速度が 120 kt ならどうですか。', `100 kt は 1 分に 100 ÷ 60 NM なので、200 ÷（100 ÷ 60）＝ 120 ft/NM です。120 kt なら 200 ÷ 2 ＝ 100 ft/NM です。追い風で対地速度が増えると、勾配は小さくなります。${bk.see('me.perf', '双発の性能と離陸の計画')}`, ['kiso13.q15']],
      ['エンジンが 2 つ、発電機が 2 つあれば、電気を失うことを考えなくてよいですか。', `いいえ。片方のエンジンが止まると、その発電機も止まります。残りの 1 つで足りなければ、電気の負荷を減らします。共通の配線や制御の故障で、両方を失うこともあります。${bk.see('me.sys', '片方のエンジンが止まると失うもの')}`, ['kiso13.q16']],
      ['クロスフィードと燃料の移送の違いを説明してください。', `クロスフィードは、反対側のタンクからエンジンへ燃料を送る経路の切り替えです。移送は、タンクからタンクへ燃料を移すことです。名前で決めず、機体の系統図と使える条件を確かめます。${bk.see('me.basics', 'Seminole の構造と操作')}`, ['kiso13.q17']],
      ['左右のエンジンの音や回転数がそろっていれば、出力と系統は正常と言えますか。', `言えません。プロペラ同調装置は、うなりと振動を減らす装置で、出力が同じ証拠ではありません。吸気圧力・温度と圧力・警告灯・操作への反応を、決まった点検で比べます。${bk.see('me.basics', 'Seminole の構造と操作')}`, ['kiso13.q18']],
      ['離陸の前に「止まるか続けるか」を決めるとき、滑走路の長さだけでは足りないのはなぜですか。', `止まるのに要る距離のほかに、故障のあとに上昇できる性能・地形と障害物・風・路面・反応の時間が関わるからです。資料にない性能を推測で補わず、条件が足りなければ計画を変えます。${bk.see('me.perf', '双発の性能と離陸の計画')}`, ['kiso13.q19']],
      ['離陸滑走中に片方の出力が落ちたと感じました。「もうすぐ浮くから続ける」が危ないのはなぜですか。', `浮けることと、故障のあとに方向を保って上昇できることは別だからです。速度・方向・加速を見て、出発の前に決めた止まる条件に従います。${bk.see('me.perf', '双発の性能と離陸の計画')}`, ['kiso13.q20']],
    ],
    refs: [R.afh13, NEW_R.afh12, NEW_R.seminoleIM, R.seminoleG, R.seminoleCk, R.seminole, R.acron, R.acsC, NEW_R.easaPa44, NEW_R.cfr232120], lessons: ['m1'] });

  // ======================================================================= 第 5 部 第 36 章
  B.add({ id: 'oei', part: 'p5', t: '片発停止の空力と操作（Vmc・抗力・手順）', en: 'One engine inoperative: aerodynamics, Vmc and procedures',
    summary: '片方のエンジンが止まると起きる 2 つの問題（方向と上昇）、Vmc の意味と決める条件、Vmc デモ、抗力と横滑りゼロ、「特定・確認・フェザー」の手順、片発の進入と着陸、事例。止まったエンジンを足で特定しスロットルで確かめる理由を説明でき、性能の限界の中で、制御を保って降りる判断ができるようにする。',
    secs: [
      { id: 'oei.what', t: '片発で起きる 2 つの問題：方向と上昇', scope: 'common', from: ['kiso13.3', 'kiso13.7'], jcab: ['ppl.1.1.1.5', 'cpl.1.1.1.5'], faa: ['CA.X.B.K3'], h: () => `
${bk.aim('1 発動機不作動（片発停止、one engine inoperative）になると何が起きるかを理解します。「方向」と「上昇」の 2 つに分けて考えます。')}
${FIG.oeiForces()}
<p>双発機で片方のエンジンが止まると、出力が半分になるだけではありません。<b>方向の操縦</b>と<b>上昇性能</b>の 2 つに問題が起きます（AFH 第 13 章）。</p>
<p>残ったエンジンの推力は、胴体の中心線から横に離れた所で働きます。この横の距離が腕になり、機首を止まった側へ回します（推力 × 腕）。止まった側のプロペラが風車状態なら、その抗力で左右の差はさらに大きくなります（AFH 第 13 章）。</p>
${bk.t(['問題', '何が起きるか', '守る速度（速度計の目印）'], [
  ['方向（control）', '機首が止まった側へ回り、同じ側の翼が下がる。方向舵（生きている側の足）で止めるが、遅いほど方向舵の効きが弱い', `Vmc（赤い線・${SM.mc} kt）より速く`],
  ['上昇（performance）', '上昇性能が 80〜90% 失われる。脚・フラップ（flaps）・風車状態のプロペラ・横滑りが、残りの上昇の力を奪う', `Vyse（青い線・${SM.yse} kt）`]])}
<p>青い線は、1 発動機不作動時の最良上昇率速度（Vyse、best single-engine rate of climb speed）です。単発機のエンジン故障では、滑空して降りることを考えます。双発機では、方向を保ち、上昇できるかを考えます（${bk.see('me.perf', '双発の性能')}）。</p>
<p><b>臨界発動機（critical engine）</b>は、止まったときに方向の操縦にいちばん不利になるエンジンです（AFH 第 13 章）。両方のプロペラが操縦席から見て右回りの双発機では、右エンジンの下がる羽根が中心線から遠くにあります。だから左エンジンが止まると残る推力の腕がいちばん長くなり、左エンジンが臨界発動機です。Seminole は、右のエンジンが逆に回ります。どちらが止まっても非対称の推力は同じで、臨界発動機がありません（AFH 第 13 章）。Seminole の POH（操縦士用の機体の手引書、pilot's operating handbook）も同じです（POH 7.5）。</p>
${bk.deep('写真で見る双発機のエンジンの位置', `${bk.photo('ch13-photo2')}
${bk.photo('twinPa30')}`)}
${bk.key('片発では「方向」と「上昇」の 2 つが問題になる', '方向を守る速度は赤い線（Vmc）、上昇の速度は青い線（Vyse）', '機首は止まった側へ回る。生きている側の足で止める')}
${bk.warn(`<b>ここに注意：</b>臨界発動機を「いつも左」と覚えてはいけません。回る向きと推力の腕で決まります。逆回転で方向の差がなくなっても、どちらが止まるとどの系統を失うかは、機体の系統で決まります（${bk.see('me.sys', '片方のエンジンが止まると失うもの')}）。`)}
${bk.recall('単発機のエンジン故障では、まず滑空の速度にして、降りる場所を選びました。', ['emg.engine', 'エンジン故障'])}
${bk.q('右エンジンが止まった。機首はどちらへ回ろうとし、どちらの方向舵で止める？', '機首は止まった側の右へ回ろうとします。生きている左エンジンの側の足、つまり左の方向舵で止めます。')}` },
      { id: 'me.vmc', t: 'Vmc：方向を保てる最小の速度', scope: 'common', from: ['kiso13.4', 'kiso13.5', 'kiso13.9', 'kiso13.26'], faa: ['CA.IX.E.K1', 'CA.IX.F.K1', 'CA.IX.G.K1', 'CA.X.A.K1', 'CA.X.B.K1', 'CA.X.B.K3', 'CA.X.B.K4'], h: () => `
${bk.aim('Vmc がどうして決まるか、何で変わるか、失速（stall）とどう違うかを理解し、Vmc デモの手順を覚えます。課目 m3 の内容です。')}
${FIG.vmcRudder()}
<p><b>最小操縦速度（Vmc、最低操縦速度、minimum control speed）</b>は、推力を急に失っても、機体の操縦を保てる速度です。米国の今の規則（14 CFR 23.2135(c)）は、較正対気速度（calibrated airspeed）で決めます。本書では Vmc とも書きます。Vmc は方向の操縦だけを考えた速度で、その速度で上昇できる保証はありません（AFH 第 13 章）。</p>
<p>速度が下がると、方向舵の効きは弱くなります。一方、生きているエンジンの推力は減りません（プロペラ機では、遅いほど推力はむしろ少し大きくなります）。だから、ある速度で、方向舵をいっぱいに踏んでも、機首が止まった側へ回るようになります（図）。</p>
<p>公表の Vmc は、決められた条件で決めた値です。条件が違えば、実際の Vmc も変わります。特に、<b>翼を水平にしたまま飛ぶと、公表値より 20 kt 近く高い速度で方向を失う</b>ことがあります（AFH 第 13 章）。</p>
<h3>Vmc と失速</h3>
<p>自然吸気のエンジン（Seminole など）では、Vmc は高い所ほど低くなります。一方、失速速度（stall speed）は、指示対気速度（indicated airspeed）では変わりません。だから高い所ほど、失速が先に来やすくなります。非対称の出力のまま失速すると、スピン（きりもみ、spin）に入りやすく、双発機のスピンからの回復はとても難しいです（AFH 第 13 章）。Seminole の POH は、Vmc の 56 KIAS は失速した状態だと書いています（POH 4.47）。だから Vmc デモでは、失速の兆候が先に来ることがよくあります。</p>
<h3>Vmc デモンストレーション（事業用 ACS Area X Task B・AFH・ガイドの要約）</h3>
<ol><li>地上 3,000 ft（機体の推奨が高ければその高さ）より下がらずに終わる高さで行います（ACS・AFH）。Seminole の POH は 4,000 ft 以上です（POH 4.47）。脚 UP・フラップは離陸（takeoff）の位置・プロペラは高回転にします。</li>
<li>Vsse の約 10 kt 上で（事業用 ACS。AFH は Vsse と Vyse の高い方の約 10 kt 上）、片方のエンジンをアイドル（風車状態）、もう片方を離陸の出力にします。Seminole は臨界発動機がないので、どちらでもかまいません（ガイドは左を絞る）。</li>
<li>生きている側へ 5° 以内のバンクにし、方向舵で針路（ヘディング、heading）を保ちます。</li>
<li>機首を少しずつ上げ、<b>1 秒に約 1 kt</b> ずつ減速します。方向舵を足していきます。</li>
<li><b>方向が保てなくなった最初の兆候・失速警報・バフェット（buffet）</b>のどれかで、すぐに回復します。<b>生きているエンジンの出力を絞り</b>、同時に機首を下げて速度を取り戻します。止まった側の出力は足しません。</li>
<li>入った針路の ±20° 以内で回復し、出力を戻して Vsse / Vyse（±5 kt）へ加速します。</li></ol>
<p>高度を保つことは、この課目の基準ではありません。操縦できることを見る課目で、性能を見る課目ではないからです（AFH 第 13 章）。</p>
${bk.deep('Vmc を変える条件（表）', FIG.vmcFactors())}
${bk.deep('Vmc を決める条件・デモの速度・方向舵を制限する方法・スピン', `<p>Seminole は、米国の以前の規則（旧 14 CFR 23.149）で認証されています。この規則での Vmc は、「臨界発動機が急に止まっても操縦を保ち、そのあと同じ速度で、バンク 5° 以内でまっすぐ飛べる速度」です。生きているエンジンの最大出力などは、そのときの試験の条件です（AFH 第 13 章）。</p>
<p>海面では Vmc の方が数 kt 高いことが多いですが、ある高さで同じになり、それより上では失速が先に来ます（AFH 第 13 章）。</p>
<p>認証では、急にエンジンを止める動的な決め方と、まっすぐ飛び続けられるかを見る静的な決め方があり、高い方を公表します。訓練の Vmc デモは、静的な決め方に近いものです（AFH 第 13 章）。</p>
<p>デモで方向を失った速度は、その日の条件での値です。公表の Vmc より低いことも高いこともあり、新しい制限の値として使いません（AFH 第 13 章）。デモは、限界の数字を探す練習ではなく、兆候に早く気づいて回復する練習です。</p>
<p>密度高度などで Vmc デモができないとき、教官は方向舵の動く量をわざと制限して、方向を失う様子を見せる方法もあります。このときは、失速より約 20 kt 上の速度で行います（AFH 第 13 章）。</p>
<p>スピンの試験を求められた双発機はほとんどなく、回復の特性はふつう悪いです。入ってしまったときに多くのメーカーが勧める操作は、次の 3 つをほぼ同時に行うことです（AFH 第 13 章）。両方のスロットルをアイドルにします。回転と反対の方向舵をいっぱいに踏みます。操縦輪（ヨーク、control wheel）をいっぱいに前へ押します（補助翼（エルロン、aileron）は中立）。回復には大きな高度が要ります。</p>`)}
${bk.dont('最小操縦速度（Vmc）：片方のエンジンが止まったときに、方向を保てる最小の速度です（この節）。', `有視界気象状態（VMC、visual meteorological conditions）：雲から離れ、視程が十分にある天気です（${bk.see('basics.rules', '飛行方式と気象状態')}）。`)}
${bk.key('Vmc 付近で方向を失ったら、まず生きている側の出力を絞り、機首を下げる', '失速の兆候でも同じようにすぐ回復する。止まった側の出力は足さない', '翼を水平にすると、実際の Vmc は公表値より高くなる')}
${bk.recall('失速は、迎え角（迎角、angle of attack）が大きすぎて起きます。回復の第一歩は、迎え角を減らすことでした。', ['aero.stall', '失速のしくみと回復'])}
${bk.q('Vmc デモで減速中、方向はまだ保てているのに失速警報が鳴った。どうする？', 'すぐに回復します。生きている側の出力を絞り、機首を下げます。非対称の出力のまま失速すると、スピンに入りやすいからです（ACS・AFH 第 13 章）。')}
${bk.sim('Vmc の兆候を体験し、出力を絞って回復します。このシミュレータの Seminole では、失速警報（約 62 kt）が Vmc（56 kt）より先に鳴ります。だから、方向を失う前に、失速警報で回復を始めることが多くあります（結果に出る速度は、回復を始めた速度）。課目の初めに自動ラダーが切れます。U で入れ直さず、E で右ラダーを踏みます。課目の基準「回復で失う高度 300 ft 以内」は、ACS の基準ではありません。', ['m3', 'Vmc デモンストレーション'])}` },
      { id: 'me.drag', t: '抗力のデモンストレーション：何が上昇を奪うか', scope: 'common', from: ['kiso13.8', 'kiso13.13'], faa: ['CA.IX.F.K5', 'CA.IX.G.K4', 'CA.X.A.K4'], h: () => `
${bk.aim('片方のエンジンで上昇を奪うもの（脚・フラップ・風車状態のプロペラ・横滑り）を覚えます。上昇性能が最大になる横滑りゼロ（ゼロ横滑り、zero sideslip）の飛び方も覚えます。')}
${FIG.zeroSideslip()}
<p>片方のエンジンが止まると、上昇に使える力はほとんど残りません（${bk.see('me.perf', '双発の性能')}）。そこから、脚・フラップ・止まった側のプロペラ・横滑りの抗力が引かれます。風車状態のプロペラは、特に大きな抗力を出します（${bk.see('me.prop', '止まったエンジンのプロペラ')}）。</p>
<p>大切な結論は、<b>片方のエンジンでは、脚・フラップ・フェザーしていないプロペラが上昇を奪う</b>ことです。だから手順は「全部前へ → 脚とフラップ UP → 特定・確認・フェザー」の順になります（${bk.see('me.oei', '片発停止の手順')}）。</p>
<h3>横滑りゼロ</h3>
<p>片方のエンジンが止まっているときは、ボールを中央にしても機体は横滑りしています。非対称の推力があるので、ボール中央は横滑りゼロの印になりません。AFH は、<b>生きている側へ約 2° バンク</b>し、ボールが生きている側へ<b>1/3〜1/2 ずれる</b>くらいに方向舵を使う組み合わせを勧めています。これで横滑りがゼロになり、上昇性能が最大になります。Seminole の POH は、生きている側へ 2〜3°・ボールは約 1/2 です（POH 3.9）。</p>
<p>横滑りがゼロになる正確なバンクは、機体によって 1.5〜2.5° と少しずつ違います（AFH 第 13 章）。覚え方は「Raise the dead（止まった側の翼を少し上げる）」です。エンジンが止まった直後は、偏揺れを止めて方向を保つため、生きている側へ 5〜10° のバンクを一瞬だけ使います。方向を保てたら、約 2° に戻します（AFH 第 13 章）。</p>
${bk.deep('Seminole の POH の数字・抗力のデモ・3 つの飛び方・カウルフラップ', `${bk.t(['Seminole の形態（POH 3.9）', '1 発動機不作動の上昇率への影響'], [['脚 DOWN・フラップ UP', '約 −250 fpm'], ['フラップ 25°・脚 DOWN', '約 −490 fpm'], ['フラップいっぱい・脚 DOWN', '約 −525 fpm'], ['止まった側のプロペラが風車状態（脚とフラップ UP）', '約 −200 fpm']])}
<p>ガイドの<b>抗力のデモ</b>は、片発・Vyse の水平飛行から、形態を 1 つずつ変えて、Vyse を保ったときの降下率を見る練習です。左はゼロスラスト（ゼロ推力、zero thrust）にして、フェザーの代わりにします。値は機体と条件で変わる目安です。</p>
${bk.t(['形態（1 つずつ足していく）', 'その形態でのおよその降下率（ガイドの目安）'], [['フラップ 10°', '約 200〜250 fpm'], ['＋脚 DOWN', '約 200〜300 fpm'], ['＋フラップ 40°（全開。ガイドの表記は 45）', '約 400〜500 fpm'], ['＋止まった側を風車状態に（ゼロスラストをやめる）', '約 500〜600 fpm']])}
${bk.t(['飛び方（AFH 第 13 章）', '結果'], [['翼を水平・ボール中央', '止まった側へ横滑りする。Vmc は公表値より高い'], ['方向舵を使わず、バンクだけ（8〜10°）', '生きている側へ大きく横滑りする。抗力が大きい'], ['生きている側へ約 2° バンク・ボールは生きている側へ 1/3〜1/2', '横滑りゼロ。上昇性能が最大']])}
<p>横滑りは、風防に付けた毛糸（ヨーストリング、yaw string）で確かめられます。横滑りがないと、毛糸は風防の中央をまっすぐ上を向きます（AFH 第 13 章）。</p>
<p>カウルフラップは、エンジンの冷却と抗力の両方に関わります。Seminole では、止まった側は閉じ、生きている側は温度の制限を超えない範囲でできるだけ閉じます（POH 3.9）。</p>`)}
${bk.key('片発では、脚・フラップ・風車状態のプロペラ・横滑りが上昇を奪う', '横滑りゼロ：生きている側へ約 2° バンク、ボールは生きている側へ 1/3〜1/2', 'ボールが中央でも、片発では横滑りしている')}
${bk.q('片方のエンジンで、ボールを中央に保って翼を水平にしている。上昇性能は最大？', '最大ではありません。この飛び方では止まった側へ横滑りしていて、抗力が増えています。生きている側へ約 2° バンクし、ボールを生きている側へ 1/3〜1/2 ずらすと、横滑りがゼロになります（AFH 第 13 章）。')}
${bk.sim('自由飛行の Seminole で、脚（G）・フラップ（V）・フェザー（[ / ]）で降下率の違いを試せます。値は教材のモデルの近似で、ガイドの値とは違います。風車状態は、課目 m2・m4 でフェザーする前に体験できます。自動ラダー（U）が ON のままだと、ボールは自動で中央になります。', ['m2', '上空での片発停止'])}` },
      { id: 'me.oei', t: '片発停止の手順：特定・確認・フェザー', scope: 'common', from: ['kiso13.21', 'kiso13.22', 'kiso13.23'], faa: ['CA.IX.F.K4', 'CA.IX.F.K6', 'CA.IX.G.K3', 'CA.IX.G.K5', 'CA.X.A.K3', 'CA.X.A.K5', 'CA.X.C.K1'], h: () => `
${bk.aim('エンジンが止まったときに覚えておいてすぐ行う操作（記憶項目）の順番と、その理由を覚えます。課目 m2・m4 の内容です。')}
${FIG.oeiSteps()}
${bk.t(['順番', 'すること', 'なぜ・どうやって'], [
  ['1 操縦', `方向舵で偏揺れを止め、生きている側へ少しバンク。速度は <b>Vyse（${SM.yse} kt）</b>（障害物があれば Vxse か Vmc ＋5 kt の大きい方。事業用 ACS）`, 'まず方向。Vmc に近いと方向を保てない'],
  ['2 全部前へ', 'ミクスチャー・プロペラ・スロットルを前へ', 'どちらが止まったか分かる前に、出せる出力を全部出す'],
  ['3 抗力を減らす', '脚 UP・フラップ UP（機体によっては脚が先）', '片発では、小さな抗力でも上昇できなくなる'],
  ['4 特定（Identify）', '<b>“Dead foot, dead engine”</b>：踏んでいない（遊んでいる）足の側が、止まったエンジン', '計器での確認は、止まり方によってはできない。主に操縦の入力（足）で判断し、計器は補助'],
  ['5 確認（Verify）', '止まったと思う側のスロットルを<b>ゆっくり絞る</b>。何も変わらなければ正しい', '生きているエンジンを止めないため'],
  ['6 フェザー', 'その側のプロペラレバーを後ろいっぱい', '風車状態のプロペラの大きな抗力をなくす。回転が下がる前に（Seminole は 950 rpm より上で）'],
  ['7 横滑りゼロ', '生きている側へ約 2° バンク、ボールは生きている側へ 1/3〜1/2', `上昇性能を最大にする（${bk.see('me.drag', '横滑りゼロ')}）`],
  ['8 片付け', 'チェックリストで、止めたエンジンの燃料・点火・発電機（オルタネーター、alternator）を切り、カウルフラップを閉じる。管制があれば緊急を宣言する', '急がず確実に。操縦を犠牲にしない（上昇性能に関係するのはカウルフラップだけ）']])}
<p>降下中など出力が小さいときの故障は、偏揺れも性能の落ち方も小さく、気づきにくいです。疑ったら、混合比（ミクスチャー、mixture）・プロペラ・スロットルを大きく前へ出してから、足で特定します（AFH 第 13 章）。</p>
<p>確認でスロットルを絞ったときに性能が落ちるなら、そのエンジンはまだ少し出力を出しています。安全な高さと速度になるまで、回しておくことも考えます（AFH 第 13 章）。上空で時間と高度に余裕があるときは、フェザーする前に原因を調べます。高さが許せば、再始動を試みます。直らないとき、または時間がないときにフェザーします（離陸直後はすぐフェザー）。</p>
${bk.deep('Seminole の POH の手順・浮いた直後・止めたあとの飛行', `<p>Seminole の POH の見分け方も同じです。推力が減り、機首が止まった側へ回り、止まった側と反対の方向舵を踏む力が要ります。スロットルを絞って確かめ、プロペラは 950 rpm より下がる前にフェザーします（POH 3.5）。上空で原因を調べるときは、電動燃料ポンプ（electric fuel pump）を ON にします。燃料の量・油圧と油温・マグネトー（magneto）を確かめてから、再始動を試みます（POH 3.9）。</p>
<p>浮いた直後は、高さも時間もありません。上昇できない条件で機首を上げ続けると、速度と方向の余裕を同時に失います。制御を保って降りることも選びます（AFH 第 13 章）。</p>
${bk.photo('ch13-photo7')}
<p>エンジンを止めたあとも、生きているエンジンの温度と圧力・電気・燃料・天気・地形を見続けます。着陸先は距離だけで選ばず、滑走路・天気・進入・地形・残った系統を比べます。Seminole の POH は、いちばん近い適した空港に、できるだけ早く降りるとしています（POH 3.9）。</p>
<p>片発の絶対上昇限度（absolute ceiling）より上で止まったときは、Vyse を保つと高度の失い方が最小です。降下は止まった直後がいちばん速く、その高さに近づくほど遅くなります（AFH 第 13 章）。クロスフィード（crossfeed）を使うのは、近くに空港がないときだけです（${bk.see('me.basics', 'Seminole の構造と操作')}）。</p>`)}
${bk.deep('事業用 ACS の基準と、実機の訓練での決まり', `${bk.t(['事業用 ACS（多発・模擬）', '主な基準'], [
  ['Area IX Task F：離陸直後の片発停止', 'Vyse（障害物があれば Vxse か Vmc ＋5 kt の大きい方）・脚とフラップ UP・模擬フェザー。Vyse で上昇できなければ、Vyse を保って出発した空港か、いちばん適した場所へ降りる。針路 ±10°・速度 ±5 kt。止めたエンジンの片付けを模擬する'],
  ['Area X Task A：片発での飛行', '高度 ±100 ft（または最小の降下率）・速度 ±10 kt・針路 ±10°。原因を調べ、片付け、再始動する'],
  ['Area X Task B：Vmc デモ', `${bk.see('me.vmc', 'Vmc デモンストレーション')}`],
  ['Area IX Task G：片発の進入と着陸', `${bk.see('me.land', '片発の進入と着陸')}`]])}
<ul><li>離陸滑走中の模擬故障は、計算した Vmc の 50% までの速度で行います。</li><li>離陸後の模擬故障は、地上 400 ft 以上で、Vsse（または Vxse・Vyse）以上になってからです。</li><li>地上 3,000 ft より下では、スロットルを絞ってゼロスラストにして模擬します（本当には止めない）。</li><li>本当にフェザーするのは、再始動まで地上 3,000 ft より下がらない高さで、再始動できなくても空港に安全に降りられる位置だけです。</li></ul>
<p>Seminole のゼロスラストの回転数の目安は、82 KIAS で 1,850 rpm、88 KIAS で 2,180 rpm です（POH 4.49）。</p>`)}
${bk.key('片発停止：操縦 → 全部前へ → 脚とフラップ UP → 特定 → 確認 → フェザー', '特定は足で（Dead foot, dead engine）。確認はスロットルをゆっくり絞って', 'フェザーの後は横滑りゼロ。片付けは急がずチェックリストで')}
${bk.warn('<b>よくある間違い：</b>いちばん重大な誤りは、生きているエンジンを止める（フェザーする）ことです。特定と確認を飛ばさず、確認のスロットルはゆっくり絞ります。')}
${bk.q('片発停止で、左足を強く踏んでいて、右足は遊んでいる。どちらのエンジンが止まった？ 次にすることは？', '右エンジンです（Dead foot, dead engine）。次に、右のスロットルをゆっくり絞って、何も変わらないことを確かめてから（確認）、右のプロペラをフェザーします。')}
${bk.sim('上空での片発停止と、離陸直後の片発停止を練習します。エンジンが故障する課目では、自動ラダーが切れます。E / Q で生きている側のラダーを踏み、Z / X のラダートリム（rudder trim）で足を楽にします。スロットルは左右いっしょに動くので、確認（片方だけをゆっくり絞る）は練習できません。止まった側を [（左）/ ]（右）でフェザーします。課目 m4 は、地上 250 ft で故障が起きます。シミュレータだからできる練習で、実機の訓練は 400 ft 以上です。課目の基準「故障の直後 ±20°・30 秒以内に正しいエンジンをフェザー」は教材の基準です。', ['m2', '上空での片発停止'], ['m4', '離陸直後の片発停止'])}` },
      { id: 'me.land', t: '片発の進入と着陸', scope: 'common', from: ['kiso13.24', 'kiso13.25'], faa: ['CA.X.D.K1'], h: () => `
${bk.aim('1 発動機不作動時の進入・着陸（片発の進入、single-engine approach and landing）の流れと、両発との違いを覚えます。課目 m5 の内容です。')}
<p>片発の進入と着陸は、両発のときとほとんど同じです。場周経路（traffic pattern）の高さ・速度・位置も同じにします。違うのは、使える出力が少ないことと、推力が非対称なことです。生きているエンジンは、ふだんより大きな出力を使います（AFH 第 13 章）。</p>
${bk.t(['場所（AFH 第 13 章）', 'すること'], [
  ['ダウンウインド（downwind leg）', '速度と性能に余裕があれば、ここで脚を下ろし、<b>遅くともアビームで脚 DOWN を確かめる</b>。余裕があれば、フラップ 10° と降下もここから（機体の手順が優先。Seminole の POH は、着陸できると確かになってから脚とフラップを出す）'],
  ['旋回', '止まったエンジンの側へ曲がっても問題ない。速度は Vyse より遅くしない'],
  ['ベース', '性能が足りればフラップを中間（ふつう 25°）に。速度が落ちる・降下率が大きいなら、滑走路に近づくまで待つ'],
  ['ファイナル（final approach leg）', `ふつうの 3° の進入。低く平たい長い進入はしない。着陸が確実になるまで Vyse（${SM.yse} kt）を保ち、そのあと機体の手順の速度へ（Seminole の POH は最終進入 90 KIAS・フラップ 25°）。最後のフラップは、着陸が確実になるまで待つか、途中の角度のままでも降りられる`]])}
<p>脚とフラップを出したファイナルからの片発の着陸復行（ゴーアラウンド、go-around）は、できないことがあります。脚とフラップを上げる間に、500 ft 以上失うことも珍しくありません。だから、ファイナルで脚とフラップを出したら、その滑走路（または別の滑走路・誘導路・草地）に降りると決めて進入します（AFH 第 13 章）。</p>
${bk.deep('接地の前・Seminole の POH の考え方・事業用 ACS の基準', `<p>フレア（ラウンドアウト、flare）で生きているエンジンの出力を絞ると、方向舵の必要量が変わります。抗力のあるプロペラが 1 つだけなので、両発より浮きやすくなります（AFH 第 13 章）。</p>
<p>Seminole の POH が 25° のフラップと 90 KIAS を勧めるのは、もし着陸復行が要っても、いちばんよい形にしておくためです（POH 3.9）。それでも POH は、片発の着陸復行はできるだけ避けるとしています。</p>
<p>事業用 ACS（Area IX Task G）では、着陸が確実になるまで、着陸の形態で推奨の進入速度（approach speed）±5 kt を保ち、安定した進入をします。接地は、滑走路の最初の 1/3 の中です。</p>`)}
${bk.key('片発の進入も、両発と同じ高さ・位置で。速度は Vyse より遅くしない', '性能に余裕があれば、脚は遅くともアビームで DOWN（機体の手順が優先）。最後のフラップは着陸が確実になってから', '脚とフラップを出したら、降りると決める')}
${bk.warn('<b>よくある間違い：</b>片発の進入では、低く・遅くなりがちです。出力を足しても上昇できず、Vmc に近づきます。高めの進入が基本です。')}
${bk.q('片発の場周経路で、止まったエンジンの側へ旋回してよい？', 'かまいません。旋回の向きは、操縦や性能には関係しません（AFH 第 13 章）。大切なのは、Vyse より遅くしないことと、浅いバンクで曲がることです。')}
${bk.sim('片発の進入と着陸を練習します。課目はファイナルの 5 km 手前、脚 UP の状態から始まります。実機では、AFH は性能に余裕があればダウンウインドで脚を下ろすとしています。Seminole の POH は、着陸できると確かになってから脚とフラップを出します。機体の手順に従います。', ['m5', '片発の進入と着陸'])}` },
      { id: 'me.case', t: '事例とふり返り：1 つの故障から一便を考える', scope: 'common', from: ['kiso13.28'], h: () => `
${bk.aim('1 つのエンジンの故障を、出発の前から着陸のあとまでの一便の流れで考えます。事故の事例から、何が命取りになるかを学びます。')}
${FIG.oeiFlight()}
<h3>架空の事例：暑い日の出発</h3>
<p>暑い日の午後、Seminole で架空の LAB 空港を出発します。2 人と荷物を積み、気温が高いので、片発の上昇はふだんより小さいはずです。出発の前に POH の図で片発の上昇率を調べ、ブリーフィング（briefing）で止まる所と続ける所を声に出します。</p>
<p>浮いて脚を上げた直後、機首が右へ振れ、左足を強く踏んでいます。遊んでいる足は右なので、右エンジンを疑います。青い線を保ち、全部前へ出し、右のスロットルをゆっくり絞っても変化がないことを確かめて、右をフェザーします。上昇はわずかなので、浅いバンクでまっすぐ上り、空港へ戻って降ります。</p>
<p>着陸のあとは、うまく降りたという結果だけで評価しません。何を予想し、どの兆候で気づき、いつ決めたかをふり返ります（${bk.see('adm.review', '振り返り')}）。</p>
<h3>事故の事例が示すこと</h3>
<p>米国の NTSB（国家運輸安全委員会）は、片方のエンジンが止まって操縦を失った事故を集め、安全情報 SA-081 を出しています。速度を失いながら止まった側へ旋回した事故や、出力の不具合を残したまま離陸を続けた事故が繰り返されています。</p>
${bk.deep('SA-081 の事例と勧め', `<p>どの事故も離陸や着陸の近くで、速度が Vmc より下がっていました。</p><ul><li>離陸の直後に左エンジンが止まりました。速度を失いながら止まった側へ旋回し、ほぼ真下を向いて地面に当たりました（Piper PA-31P）。</li><li>離陸滑走が遅く、左エンジンが一部の出力しか出していないまま離陸を続け、Vmc より遅い速度で木に当たりました。その前の数週間、整備はこのエンジンの出力の不具合を伝えていました（Cessna 421C）。</li><li>総飛行時間が約 18,000 時間の操縦士でも、その機種に慣れていなかった事故があります（Piper PA-31T）。</li></ul>
<p>SA-081 は、多発の資格だけでは十分でないとしています。機種ごとに、1 発動機不作動の手順と記憶項目を身につけます。管制や同乗者に急がされる気持ちに流されず、低い高さでは気をそらすものを減らします。</p>`)}
${bk.key('出発の前に、止まる所と続ける所を決めて声に出す', '片発になったら、まず方向と速度。Vmc より遅くしない', '出力の不具合は地上で直す。浮けそうでも離陸を続けない')}
${bk.recall('個人の最低基準（personal minimums）とリスクの見積もりは、出発の前に決めておきます。', ['adm.risk', 'リスクの大きさ・個人の最低基準'])}
${bk.q('離陸滑走中、左エンジンの吸気圧力（吸気圧、manifold pressure）が右より少し低い。浮けそうなのでそのまま離陸してよい？', 'いいえ。両方のスロットルを閉じて止まります。離陸滑走では、両方のエンジンが決められた吸気圧力と回転数を出しているかを確かめます（AFH 第 13 章）。出力の不具合を残したまま離陸を続けて、操縦を失った事故があります（NTSB SA-081）。')}
${bk.sim('浮揚の直後に片方のエンジンが止まる場面で、方向・速度・特定・確認・フェザーを通して練習します。', ['m4', '離陸直後の片発停止'])}` },
    ],
    terms: [['One engine inoperative (OEI)', '1 発動機不作動（片発停止）', '方向と上昇の 2 つの問題'], ['Vmc', '最小操縦速度（片発）', '赤い線。決められた条件での値'], ['Critical engine', '臨界発動機', 'Seminole にはない'], ['Windmilling propeller', '風車状態のプロペラ', '低い羽根の角度・高回転では、機体全体の有害抗力と同じくらいになることがある'], ['Identify, Verify, Feather', '特定・確認・フェザー', ''], ['Dead foot, dead engine', '遊んでいる足の側が止まったエンジン', '特定の覚え方'], ['Zero sideslip / Raise the dead', '横滑りゼロ・止まった側の翼を少し上げる', '約 2° バンク・ボール 1/3〜1/2'], ['Zero thrust', 'ゼロスラスト', '訓練でフェザーの代わりにする出力'], ['Yaw string', 'ヨーストリング', '横滑りを見る毛糸'], ['Vmc demonstration', 'Vmc デモ', '事業用 ACS Area X Task B'], ['Drag demonstration', '抗力のデモ', ''], ['Secure', '止めたエンジンの片付け', 'チェックリストで'], ['Single-engine go-around', '片発の着陸復行', 'できないことがある'], ['Yawing moment', 'ヨーのモーメント', '推力 × 腕'], ['Drift down', '片発の絶対上昇限度へ降りていくこと', 'Vyse を保つ'], ['Rudder limiting', '方向舵の動く量を制限した Vmc デモ', '失速より約 20 kt 上で']],
    examples: ['巡航中に機首が左へ振れ、右足を強く踏んでいる → 全部前へ → 左足が遊んでいる → 左エンジンを疑う → 左のスロットルをゆっくり絞って変化なし → 余裕があれば原因を調べる → 直らなければ左をフェザー → 右へ約 2° バンク・ボールは右へ 1/3〜1/2。', 'Vmc デモの減速中、約 62 kt で失速警報が鳴った → すぐ生きている右エンジンの出力を絞り、機首を下げる（Seminole では失速の兆候が先に来ることが多い）。', '片発の進入（AFH の考え方）：性能に余裕があればダウンウインドで脚 DOWN・フラップ 10、ベースでフラップ 25、ファイナルは 88 kt を保ち、着陸が確実になってから機体の手順の速度へ（Seminole の POH は、フラップ 25° で 90 KIAS）。', '降下中に、どちらかの出力が落ちた気がする → 混合比・プロペラ・スロットルを大きく前へ → 踏んでいる足で特定 → スロットルで確認。'],
    cautions: ['Vmc デモ・抗力のデモは、実機では教官と、地上 3,000 ft 以上（Seminole の POH は 4,000 ft 以上）で行う（ACS・AFH・POH）。', '実機の模擬エンジン故障は、地上 400 ft 以上・Vsse 以上で、3,000 ft 未満はスロットルとゼロスラストだけで行う（ACS・AFH）。シミュレータの課目はもっと低い高さで体験させるが、実機とは違う。', 'この教材の Vmc（約 56 kt で方向を失う・バンク 5°・ラダーいっぱい）は教材のモデルの近似値。どの高さでも、ラダーがいっぱいになる前に失速警報（約 62 kt）が鳴る。'],
    quiz: [
      { q: '片発停止で、"Dead foot, dead engine" の意味は？', choices: ['踏んでいる足の側が止まった', '踏んでいない（遊んでいる）足の側が止まった', 'ラダーを使わない', '止まった側のラダーを踏む'], answer: 1, why: '生きている側の方向舵を踏んで方向を保つので、遊んでいる足の側が止まったエンジン（AFH 第 13 章。本文 me.oei）。' },
      { q: 'Vmc 付近で方向が保てなくなった。最初にすることは？', choices: ['ラダーをさらに強く踏む', '生きているエンジンの出力を絞り、機首を下げる', 'フラップを出す', '止まった側のエンジンの出力を足す'], answer: 1, why: '非対称の推力を減らさないと方向は戻らない。同時に機首を下げて速度を取り戻す。止まった側の出力は足さない（事業用 ACS・POH 4.47。本文 me.vmc）。' },
      { q: '片発で上昇性能が最大になる飛び方（AFH）は？', choices: ['翼を水平・ボール中央', '生きている側へ約 2° バンク・ボールは生きている側へ 1/3〜1/2', '止まった側へ 10° バンク', 'ラダーを使わずエルロンだけ'], answer: 1, why: 'この組み合わせで横滑りがゼロになり、抗力が最小になる（Seminole の POH は 2〜3°・ボール約 1/2。本文 me.drag）。' },
      { q: '片発で翼を水平にしたまま（バンクなし）飛ぶと、実際の Vmc はどうなる？', choices: ['公表値より高くなる（20 kt 近く高くなることもある）', '公表値より低くなる', '変わらない', 'ゼロになる'], answer: 0, why: '公表 Vmc は生きている側へ 5° までのバンクを使って決めた値。バンクを減らすと 1° あたり 3 kt 以上高くなることがある（AFH 第 13 章。本文 me.vmc）。' },
      { q: '片発の場周経路で、止まったエンジンの側へ旋回することは？', choices: ['問題ない（Vyse 以上・浅いバンクで）', '絶対にしてはいけない', '必ず止まった側へ曲がる', 'ラダーを使わずに曲がる'], answer: 0, why: 'AFH 第 13 章：旋回の向きは操縦と性能に関係しない。止まった側へ曲がってもよい（本文 me.land）。' },
      { q: '降下中（出力が小さいとき）に、片方のエンジンが止まったかもしれない。特定する前にすること（AFH）は？', choices: ['すぐに疑わしい側をフェザーする', '計器の表示だけで決める', '混合比・プロペラ・スロットルを大きく前へ出し、それから足で特定する', '降下を続けて様子を見る'], answer: 2, why: 'AFH 第 13 章：出力が小さいと偏揺れも性能の落ち方も小さく、気づきにくい。出力を大きく出してから特定する（本文 me.oei）。' },
      { q: 'Seminole の POH で、1 発動機不作動の着陸の最終進入の速度とフラップは？', choices: ['88 KIAS・フラップ 40°', '75 KIAS・フラップ 0°', '100 KIAS・フラップ 10°', '90 KIAS・フラップ 25°'], answer: 3, why: 'POH 3.9：最終進入 90 KIAS と、いっぱいでなく 25° のフラップ。着陸復行が要っても、いちばんよい形にしておくため（本文 me.land）。' },
      { q: '離陸滑走中、片方のエンジンの出力がいつもより低い。どうする？', choices: ['浮けそうなら離陸を続ける', '浮いてから考える', '両方のスロットルを閉じて止まる', '脚を早めに上げて続ける'], answer: 2, why: 'AFH 第 13 章：離陸滑走では両方のエンジンの吸気圧力と回転数を確かめる。出力の不具合を残して離陸を続け、操縦を失った事故がある（NTSB SA-081。本文 me.case）。' },
      { q: 'Seminole の POH は、Vmc デモと、意図的に片方のエンジンを止める操作を、地上何 ft より下で行わないとしている？', choices: ['400 ft', '1,000 ft', '3,000 ft', '4,000 ft'], answer: 3, why: 'POH 4.47：4,000 ft AGL より下では行わない。ACS・AFH の 3,000 ft より高い（本文 me.vmc）。' },
    ],
    written: [
      ['翼にエンジンがある双発機で、片方の推力がなくなると機首が回る（ヨー）のはなぜですか。', `残ったエンジンの推力が、重心から横に離れた所で働き、機首を止まった側へ回すからです。止まった側のプロペラの抗力も、差を大きくします。回す力の強さは、推力と腕の長さの積で考えます。${bk.see('oei.what', '片発で起きる 2 つの問題')}`, ['kiso13.q3']],
      ['遅い速度で片方のエンジンが止まったとき、生きているエンジンの出力を増やすだけでは解決しないのはなぜですか。', `遅いほど方向舵の効きは弱く、出力を増やすほど左右の推力の差は大きくなるからです。方向を保てる速度・姿勢・出力の関係を考え、方向を失いかけたら、まず生きている側の出力を絞ります。${bk.see('me.vmc', 'Vmc：方向を保てる最小の速度')}`, ['kiso13.q4']],
      ['速度計の赤い線（Vmc）より速ければ、失速せず上昇もできると考えてよいですか。', `いいえ。Vmc は、決まった条件で方向を保てる最小の速度で、失速や上昇の性能とは別です。実際の Vmc も、出力・形態・重心・バンクで変わります。${bk.see('me.vmc', 'Vmc：方向を保てる最小の速度')}`, ['kiso13.q5']],
      ['臨界発動機を「どの双発機でも左のエンジン」と覚えてはいけないのはなぜですか。', `臨界発動機は、止まると方向の操縦にいちばん不利なエンジンで、プロペラの回る向きと推力の腕で決まるからです。Seminole のように左右逆回転の機体には、臨界発動機がありません。${bk.see('oei.what', '片発で起きる 2 つの問題')}`, ['kiso13.q7']],
      ['片方のエンジンが止まったとき、いつも翼を水平・ボールを中央にすれば、横滑りはなくなりますか。', `なくなりません。推力が非対称なので、ボールが中央でも止まった側へ横滑りします。生きている側へ約 2° バンクし、ボールを生きている側へ 1/3〜1/2 ずらすと、横滑りがゼロになります。機体ごとの値は POH で確かめます。${bk.see('me.drag', '抗力のデモンストレーション')}`, ['kiso13.q8']],
      ['重心が後ろへ移ると、方向舵で機首の回りを止めにくくなるのはなぜですか。', `重心から方向舵までの腕が短くなり、同じ力でつくれる回す力が小さくなるからです。だから Vmc は高くなります。${bk.see('me.vmc', 'Vmc：方向を保てる最小の速度')}`, ['kiso13.q9']],
      ['片方のエンジンが止まったとき、「抗力を減らすため、何でもすぐしまう・閉じる」と決められないのはなぜですか。', `脚やフラップを動かすには時間と電気・油圧が要り、姿勢も変わり、降りると決めることもあるからです。生きているエンジンの冷却も要るので、カウルフラップは温度を見ながら閉じます。目的と時機を、機体の手順で決めます。${bk.see('me.drag', '抗力のデモンストレーション')}`, ['kiso13.q13']],
      ['浮いた直後に片方のエンジンが止まり、上昇できない条件で機首を上げ続けると、何が起きますか。', `上昇できるようにはならず、速度を失い、方向を保つ余裕と失速までの余裕を同時に失います。制御したまま正面に降りることも選びます。${bk.see('me.oei', '片発停止の手順')}`, ['kiso13.q21']],
      ['止まったと思った側の何本ものレバーを、一度に動かすと何が問題ですか。', `思い違いなら、生きているエンジンまで止めてしまいます。どの操作で何が変わったかも分からなくなります。足で特定し（Dead foot, dead engine）、その側のスロットルをゆっくり絞って変化がないことを確かめてから、プロペラをフェザーします。計器は補助です。${bk.see('me.oei', '片発停止の手順')}`, ['kiso13.q22']],
      ['片方のエンジンで向かう着陸先は、いちばん近い空港でよいですか。', `距離だけでは決めません。途中の地形と天気・滑走路・進入のしやすさ・残った系統・燃料を比べて、安全に降りられる所を選びます。状況が変われば決め直します。${bk.see('me.oei', '片発停止の手順')}`, ['kiso13.q23']],
      ['1 発動機不作動の進入で、脚やフラップを出すのが早すぎても遅すぎても困るのはなぜですか。', `早すぎると抗力が増えて、高さや速度を保てなくなります。遅すぎると操作と確認が低い所に集まり、進入が不安定になります。機体の手順と性能で、いつ出すかを決めておきます。${bk.see('me.land', '片発の進入と着陸')}`, ['kiso13.q24']],
      ['1 発動機不作動での着陸復行を「いつでもできるやり直し」と考えられないのはなぜですか。', `遅く・低く・脚とフラップを出した形では抗力が大きく、残ったエンジンだけでは上昇に移れないことがあるからです。脚とフラップを上げる間に、500 ft 以上失うこともあります。早めに安定した進入をつくり、降りると決めて進入します。${bk.see('me.land', '片発の進入と着陸')}`, ['kiso13.q25']],
      ['訓練の Vmc デモは、型式証明の試験を実機で同じように行うものですか。失速の兆候も見るのはなぜですか。', `同じではありません。教官のもとで、決めた条件とやめる基準で行う訓練です。条件によっては方向を失う前に失速に近づき、非対称の出力で失速するとスピンに入りやすいからです。${bk.see('me.vmc', 'Vmc：方向を保てる最小の速度')}`, ['kiso13.q26']],
      ['暑くて重い日に、山を越える便を計画しています。「双発だから予定どおり」とせず、何を確かめますか。', `離陸と片発の性能、経路の地形、天気、燃料、途中の着陸先、系統と自分の慣れです。積む量・出発の時刻・経路を変えることや延期も含めて、故障しても成り立つ計画にします。${bk.see('me.case', '事例とふり返り')}`, ['kiso13.q28']],
    ],
    refs: [R.afh13, NEW_R.seminoleIM, R.seminoleG, R.seminoleCk, R.acsC, R.cfr23, NEW_R.ntsbSa081], lessons: ['m2', 'm3', 'm4', 'm5'] });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
