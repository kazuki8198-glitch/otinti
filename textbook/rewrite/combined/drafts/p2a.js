// DRAFT (W28-p2a, R3) — Part 2's chapters 'ground'「飛ぶ前と飛んだあと」and 'ops'「基本操縦」(textbook/rewrite/combined/DESIGN.md
// 3.3 第 2 部 第 21・22 章, 4.1 rows 13・14, 4.2 kiso11, 7.2 W28). No product reads this file (DESIGN 6.2 rule 5, 7.4). It is a
// plain script like book-3.js: when the chapters are registered, the two B.add(...) below replace the ones of 'ground' and
// 'ops' in flight-lab/src/book-3.js in place (same ids, same place: the first chapters of Part 2, after g1), the figures of
// p2a-figs.js go into book-figs.js (FIG; three of them replace the functions of the same name), and the references in
// NEW_R go into book-core.js's R (then `NEW_R.x` → `R.x`). Check them with the figures:
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p2a-figs.js textbook/rewrite/combined/drafts/p2a.js
//
// What changed in 'ground' (7 sections: the 4 of the textbook kept with their ids and in their order — walk, start, taxi,
// runup — and the 3 new ones where DESIGN 3.3 puts them: ground.day and ground.crew first, ground.after last):
//  - ★ground.day ← kiso11.1・11.2 (figure dayFlow, new): one training flight from the briefing to the record, what each step
//    checks, the papers and the airplane itself, redo the numbers when a premise changes (AFH chapter 2); the whole flow is
//    序部's basics.flight (linked, not repeated). The POH / AFM and inoperative equipment in a fold (decision 12);
//  - ★ground.crew ← kiso11.4・kiso10.24 (figure controlHandover, new): the seat and the cockpit, the address of the concept
//    「操縦の受け渡し（positive exchange of flight controls）」(CONCEPTS C.control-handover: the bold definition here; crm.pm keeps
//    two lines and a link — W32), the authority gradient (not bold: crm.crm, Part 6, keeps CRM's own text), "Say again" /
//    "Unable" (P/CG) with the instructor;
//  - ground.walk ← kiso11.3: the five checks that must not be missed in the first-read text, the station-by-station list of the
//    published Archer III checklist (the same words as before) in a fold; judgement: tell, do not decide alone; an interruption;
//  - ground.start ← kiso11.5: the start in the first-read text with the POH 4.5b numbers (oil pressure within 30 s; the starter
//    10 s / 2 min / 5 times; START ENGD with the engine running → stop: expert-sys X-N9), the checklist sequence in a fold, the
//    recall of sys.engine (the magneto switch grounds the circuit: C.mag-check's principle);
//  - ground.taxi ← kiso11.6: the airport diagram first; the stop-line paragraph became the recall of comm.runway and sys.lights
//    (CONCEPTS C.runway-clearances; revise-radio's and revise-sys's requests): {ch:radio4} and 14 CFR 91.129 out of the body;
//    judgement: stop when lost, stop when the clearance is in doubt, expectation bias (AFH chapter 2);
//  - ground.runup ← kiso11.16: 「キャブレターヒーター」(FL.terms carb-heat), the takeoff checks the textbook wrote with a plain
//    ending re-written, the details of the run-up place and the magneto over-limit steps in a fold (AFH chapter 2, POH 4.5g,
//    the checklist; the first-read text keeps "fix it by the checklist or do not fly"), the recall of sys.engine
//    (C.mag-check), judgement: name the reject conditions; "think if it happens" / "always turn back" is not a plan;
//  - ★ground.after ← kiso11.28: after landing (the checklist only when stopped beyond the hold line: AFH chapter 2; POH 4.5n),
//    the shutdown and the postflight walk-around, discrepancies, the debriefing and the logbook (US 14 CFR 61.189(a)); the
//    POH's stopping and mooring checklists (4.5o・4.5p) and AFH's magneto grounding check in a fold; the right flap supports a
//    step load only fully up (POH 4.5o・7.9) in ここに注意.
// What changed in 'ops' (9 sections: the 8 of the textbook kept with their ids and in their order, and ★ops.energy after
// ops.trim as DESIGN 3.3 lists it):
//  - ops.trim ← kiso11.8・11.9: the CADET-fixed last key point kept word for word (cadet/test/content.test.mjs); the table's
//    teaching values with the reference values beside them (criterion 6: the checklist's Vy 76 / final 70 KIAS); the throttle
//    % note in a fold; RULINGS R.pitch-power: "speed with the nose, altitude with power" is the scene's use, the energy view is
//    the next section; judgement from kiso11.9 and AFH chapter 9 (power at low speed with a low-speed trim pitches up);
//  - ★ops.energy ← kiso11.14 (figures energyFlow = ch11-fig11-7 redrawn, energyErrors from AFH chapter 4 figures 4-11・4-12):
//    the throttle is the total-energy control, the elevator the distribution control (AFH chapter 4); the same / opposite
//    directions of the deviation; high and fast on final; the energy height and the back side in folds, one worked example
//    (110 → 76 kt: about 280 ft) in a 計算演習 fold; the bold definition of エネルギーの管理（energy management）;
//  - ops.sl ← kiso11.7・11.10, ops.climb ← kiso11.11・11.12, ops.turns ← kiso11.13: RULINGS R.numeric-cues closed in the text
//    (the 10 % lead and the half-bank lead are AFH's starting points, adjusted by watching the change); the AFH names of the
//    climb and the glide speeds in folds (perf.climb / aero.* keep the definitions); judgement boxes;
//  - ops.turns: 「Va（設計運動速度）」→ the POH's 最大運用運動速度（V<sub>O</sub>）113 KIAS at 2,550 lb, 98 KIAS at 1,917 lb (POH 2.3)
//    and the private ACS's "the manufacturer's recommended airspeed or not above maneuvering speed" (safety-R2 point 8 / S3);
//    the bold overbanking tendency out and into a fold (aero.turn explains it; expert-aero E-S10), the recall of aero.vn;
//  - ops.slow ← kiso11.15: the reference value beside the teaching value (POH 4.7: 45 KIAS, +5 kt flaps up), the bold
//    definition 低速飛行（slow flight）, the link to ops.energy; ops.stall ← kiso11.15: the four steps word for word (flight.test.mjs),
//    the bold 臨界迎え角 out (aero.stall is the address), the spin paragraph shortened to the POH's prohibition and a recall of
//    aero.spin (expert-aero E-S10), judgement: never alone;
//  - ops.ground ← kiso11.19 (figure crabTrack = ch11-fig11-9 redrawn): heading and track, AFH chapter 7's altitude, obstacle
//    clearance, clearing turns and 45° limit, the bank in the wind (AFH's example, 計算演習).
// ops.wake (DESIGN 3.3: chapter 'tl', after ops.takeoff) is not written here: the chapter 'tl' is the unit W28-p2b's
// (drafts/p2b.js, with its figure wakeVortex in p2b-figs.js), so one definition of the section is drafted, in its chapter.
// Every section has scope 'common' (DESIGN 3.3: 共通, and 日米 for the boxes of ground.walk・ops.slow・ops.stall); US rules are
// in sentences that name the country; no {ch:} or bk.see to a later part; the end-of-chapter questions in place and order, 3 new
// ones after them in each chapter (answers at A, C, D to spread the positions); written questions rewritten from kiso11's qa
// (8 + 10). Every claim (number, unit, rule) is in p2a.claims.json with its tag and source.
// Volume (decision 12): ground + ops hold 14,000 characters read first (p2a's share of the p2 budget ≈ 14,450); with p2b's
// draft the part is 39,560 / 39,600. The folds hold the station lists, the checklist orders, the numbers for the record.
(function (FL) {
  'use strict';
  const B = FL.book, R = B.R, bk = B.bk, FIG = FL.bookFigs;
  const AR = FL.physics.AIRCRAFT.find(a => a.id === 'pa28').v;
  // the course Archer's four steady states at 3,000 ft (ops.trim's table; the same as FIG.attitudePower): from the flight model
  const ops4 = () => {
    const PH = FL.physics, s = PH.newState({ aircraft: 'pa28' }), at = (name, kt, fpm, o) => ({ name, kt, full: o.pwr === 'full', ...PH.steadyState(s, kt, fpm, { altFt: 3000, ...o }) });
    return [at('巡航', AR.cruise, 0, {}), at('上昇（Vy）', AR.y, null, { pwr: 'full' }), at('降下', 90, -500, {}), at('進入（フラップ 40°）', AR.appr, -370, { flaps: AR.apprFlaps })];
  };
  // ops.energy's worked example: trading speed for height without drag, Δh = (V1² − V2²) / 2g (1 kt = 1.68781 ft/s, g = 32.174)
  const FTS = 1.68781, G0 = 32.174, fts = kt => kt * FTS, dh = (k1, k2) => (fts(k1) ** 2 - fts(k2) ** 2) / (2 * G0);
  const f0 = n => Math.round(n).toLocaleString('en-US'), f1 = n => n.toFixed(1);
  // ops.ground's worked example (AFH chapter 7): the bank for a radius r ft at a groundspeed v kt, tan θ = v² / (11.26 r)
  const bankFor = (v, r) => Math.atan(v * v / (11.26 * r)) * 180 / Math.PI;
  // new references (to be added to book-core.js's R when the chapters are registered; each URL opened on 2026-10-31)
  const NEW_R = {
    afh2: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 2 章 Ground Operations（飛行前の点検・始動・地上滑走・離陸前の点検・着陸後・エンジンの停止・飛行後の点検と係留）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/03_afh_ch2.pdf' },
    afh7: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 7 章 Ground Reference Maneuvers（地上 600〜1,000 ft・バンク 45° まで・障害物から上 500 ft と横 2,000 ft・風下から入る）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/08_afh_ch7.pdf' },
  };

  // ======================================================================= 第 2 部 第 21 章
  B.add({ id: 'ground', part: 'p2', t: '飛ぶ前と飛んだあと：準備・点検・地上での操作', en: 'Before and after the flight: preparation, preflight inspection and ground operations',
    summary: '訓練の 1 回のフライトの流れ、操縦教員と飛ぶときの約束（操縦の受け渡し）、外部点検、エンジン始動、地上滑走、試運転と離陸前の確認、着陸後から駐機・ふり返りまで。毎回同じ順番でチェックリストを使い、各段階でやめる条件を確かめる。',
    secs: [
      { id: 'ground.day', t: '訓練の 1 回のフライト：準備から記録まで', scope: 'common', from: ['kiso11.1', 'kiso11.2'], faa: ['PA.II.A.K4', 'PA.II.B.K1', 'PA.II.B.K4'], h: () => `
${bk.aim('訓練の 1 回のフライトを、ブリーフィング（briefing）からデブリーフィング（debriefing）と記録までの流れで見ます。各段階で確かめることを知ります。')}
${FIG.dayFlow()}
<p>流れの全体は、序部で見ました（${bk.see('basics.flight', '一便の流れ')}）。ここでは、飛ぶ前に確かめることを足します。</p>
<ol><li><b>ブリーフィング</b>：課目・目標・天気・やめる条件と、操縦の受け渡しの約束を、操縦教員（教官、flight instructor）と確かめます。</li>
<li><b>書類と情報</b>：機体の書類と整備の記録、天気、ノータム、重さと重心、燃料と離着陸の距離を確かめます。</li>
<li><b>機体と操縦席</b>：外部点検で機体を確かめ、座席・ベルト・物の固定を確かめます。同乗者には、安全の説明をします（${bk.see('hf.srm', '資源管理')}）。</li></ol>
<p>書類と機体の両方がそろって、次の段階へ進みます。乗る人・荷物・使う滑走路が変われば、前の日の計画でも計算し直します（AFH 第 2 章）。</p>
${bk.deep('機体の手引書と、不具合のある装備', `<p>飛行規程（airplane flight manual）は、承認された限界と運用の基礎を書いた資料です。POH（操縦士用の機体の手引書、pilot's operating handbook）は操縦士向けの手引書で、承認された部分の作りは機体によって違います。資料の名前だけで決めず、その機体の型式・その 1 機・改修や装備に合った版と追補を使います。一般の教材の速度を、実機へ写しません。</p>
<p>不具合の記録も確かめます。スイッチを入れて動いたことだけでは、要る働きが正常とは言えません。不具合のある装備で出発できるかは、その国の制度・承認された資料・整備の確認・学校の手順で決まります。使う予定がないという理由だけで、外してよいことにはなりません。</p>`)}
${bk.judge('前提が 1 つでも変わったら、計算と判断をやり直します。分からないことは、地上で解決します。')}
${bk.key('訓練の 1 回は、ブリーフィング → 準備と点検 → 課目 → ふり返りと記録', '書類と機体の両方を確かめてから、次の段階へ', '前提が変わったら、前の日の計画でも計算し直す')}
${bk.warn('<b>ここに注意：</b>この本を読むことは、単独飛行（ソロ、solo flight）の許可になりません。操作は、操縦教員の訓練と評価で身につけます。')}` },
      { id: 'ground.crew', t: '操縦教員と飛ぶ：操縦の受け渡しと懸念の伝え方', scope: 'common', from: ['kiso11.4', 'kiso10.24'], h: () => `
${bk.aim('操縦教員と飛ぶときに、誰が操縦しているかをいつもはっきりさせる方法と、気づいたことを短く伝える方法を覚えます。')}
${FIG.controlHandover()}
<p>訓練の飛行では、誰が操縦しているかを、いつもはっきりさせます。手を離しただけでは、相手が引き受けたことになりません。<b>操縦の受け渡し（positive exchange of flight controls）</b>は、声の 3 段階で操縦を渡す手順です（AFH 第 1 章）。</p>
<ol><li>渡す人が “You have the flight controls.” と言います。</li>
<li>受ける人がすぐに “I have the flight controls.” と答えます。</li>
<li>渡す人がもう一度 “You have the flight controls.” と言い、相手が操縦していることを目で確かめます。</li></ol>
<p>返すときも同じです。訓練生は、操縦教員が “I have the flight controls.” と言うまで操縦を続けます。この約束は、ブリーフィングで確かめます（AFH 第 1 章）。</p>
${bk.deep('操縦席の準備と、気づいたことの伝え方', `<p>操縦席では、まず座席を合わせます。外がいつも同じように見え、ペダルと操縦輪（ヨーク、control wheel）をいっぱいまで動かせる位置にします。座席が固定されたことと、ベルトとドアを確かめます。地図や端末は、手が届き、操縦のじゃまにならず、動かない所に置きます。</p>
<p>操縦教員と訓練生の間には、立場の差があります。この差を権威勾配（authority gradient）といいます。差が大きいと、気づいた危険を言い出しにくくなります。経験のある人と飛ぶときも、気づいた危険を黙って抱えません。</p>
<p>管制との交信では、分からないときは “Say again.”、できない指示には “Unable.” と答えます（P/CG）。操縦教員にも、同じように短くはっきり伝えます。気づいたことは、事実と理由を添えて、すぐに言います。人の意見と一致しても、それだけで安全とは決めず、自分でも確かめます。</p>`)}
${bk.judge('受け渡しの応答がなければ、手を離さずに操縦を続け、もう一度言います。')}
${bk.key('操縦の受け渡しは 3 段階：You have → I have → You have', '応答がなければ手を離さない。操縦を続けて、もう一度言う', '気づいた危険は、立場に関係なく、すぐ短く言う')}` },
      { id: 'ground.walk', t: '外部点検（walk-around）', scope: 'common', from: ['kiso11.3'], faa: ['PA.I.B.K3', 'PA.II.A.K2', 'PA.II.A.K3'], h: () => `
${bk.aim('飛ぶ前に、機体の周りを決まった順番で一周し、飛べる状態かを自分の目と手で確かめます。飛べる状態かを決めるのは、機長（pilot in command）の責任です（米国の 14 CFR 91.7）。')}
${FIG.walkaroundRoute()}
<p>公開されている訓練校の Archer III のチェックリスト（2025 年版）では、<b>① 操縦席 → ② 右翼 → ③ 機首 → ④ 左翼 → ⑤ 胴体と尾翼</b>の順に回ります。数字はそのチェックリストの値です。</p>
<p>どの場所でも、傷・もれ・ゆるみ・異物・ふさがり・カバーの外し忘れを探します（AFH 第 2 章）。とくに次の 5 つは、見落とすと飛べない確認です。</p>
<ul><li>書類が機内にあることを確かめます（米国の 14 CFR 91.203・91.9。下の日米の囲み）。</li>
<li>翼と尾翼に、氷・霜・雪がないことを確かめます。薄い霜でも、揚力（lift）は大きく減ります。</li>
<li>燃料はタンクを目で見て量を確かめ、サンプ（タンクの底）から抜いて水・ごみ・種類を見ます。</li>
<li>オイルの量を確かめます（そのチェックリストでは最少 6 qt）。</li>
<li>左翼の下のピトー管のカバーを外し、穴がふさがっていないことを確かめます。Archer では、この 1 本から全圧（total pressure）と静圧（static pressure）の両方を取ります（POH 7.21・{ch:inst}）。</li></ul>
${bk.deep('チェックリストの中身（訓練校の Archer III の例）', `<h4>① 操縦席</h4><ol>
<li>書類を確かめます。チェックリストでは「ON BOARD & VISIBLE（機内にあり、見える）」です。耐空証明（airworthiness certificate）は、乗る人から見える所に掲示します。</li>
<li>操縦輪のロックを外し、自由に動くことを確かめます。パーキングブレーキをかけます。</li>
<li>スイッチは全部 OFF、ミクスチャーは IDLE CUT-OFF、マグネトー（magneto）は OFF にします。</li>
<li>バッテリーを ON にして、燃料計・灯火・ピトーヒーター（外で触って温かいか）・失速（stall）を知らせる警報を確かめ、OFF にします。</li>
<li>フラップ（flaps）を下げます（外から点検できます）。トリム（trim）は中立にします。</li></ol>
<h4>②④ 翼（右と左）</h4><ol>
<li>フラップと補助翼（エルロン、aileron）の動きと取り付けを見ます。</li>
<li>燃料計だけを信じず、タンクの中を目で見ます。燃料の通気口がふさがっていないことも確かめます。</li>
<li>主脚の緩衝支柱（出ているピストンの長さ 約 4.5 in）・タイヤ・ブレーキを見ます。</li></ol>
<h4>③ 機首</h4><ol>
<li>カウリングが閉まっていて、風防がきれいなことを確かめます。</li>
<li>オイルが足りないと、エンジンが壊れます。プロペラとスピナーの傷は、回っているときに割れる原因になります。</li>
<li>空気の取り入れ口がふさがっていないことと、前脚の緩衝支柱（約 3.25 in）・タイヤを見ます。</li>
<li>燃料ストレーナー（機首の下）から燃料を抜いて見ます。</li></ol>
<h4>⑤ 胴体と尾翼</h4><ol>
<li>アンテナと尾翼に、氷や霜がないことを確かめます。</li>
<li>スタビレーター（全体が動く水平尾翼）・トリムタブ・方向舵（ラダー、rudder）に、傷や引っかかりがないことを確かめます。スタビレーターは、昇降舵（エレベーター、elevator）の働きをします。</li>
<li>係留のロープを外し、最後にもう一度、機体の周りを見ます。</li></ol>
<p>ピトー管の穴がふさがると、速さ・高さ・昇降率の計器が正しく働きません。</p>`)}
${bk.judge('疑わしい所は、飛べるかを自分で決めず、操縦教員か整備士に伝えます。中断したら、どこまで済んだかを確かめてから続けます。')}
${bk.key('チェックリストは「読んで・やって・確かめる」。記憶だけで済ませない', '燃料はタンクを目で見る。サンプで水・ごみ・種類を確かめる', '数値（オイルの量・支柱のピストンの長さ）は、その機体の POH と訓練校の決まりが優先')}
${bk.warn('<b>よくある間違い：</b>サンプで抜いた燃料の底の透明な玉（水。燃料より重いので沈む）を、見のがすことです。水やごみがなくなるまで抜きます。なくならなければ飛びません。Archer の燃料は 100LL（青色）です（AFH 第 2 章）。')}
${bk.jur('preflight', 'docs')}
${bk.q('右のタンクのサンプから抜いた燃料の底に、透明な玉が 2 つ沈んでいた。どうする？', '水です。水が出なくなるまで抜き続けます。何回抜いても出るときは飛ばずに、整備に知らせます。前の晩の雨や、タンクの中の結露が原因のことがあります。')}` },
      { id: 'ground.start', t: 'エンジン始動', scope: 'common', from: ['kiso11.5'], jcab: ['ppl.1.2.6.8', 'cpl.1.4.1.8'], faa: ['PA.II.C.K1', 'PA.II.C.K3', 'PA.II.C.K4'], h: () => `
${bk.aim('エンジンを安全にかける手順と、かけたあとすぐに確かめることを覚えます。')}
<p>始動の前に、プロペラの回る範囲と機体の後ろに、人や物がないことを確かめます。衝突防止灯（ビーコン、anti-collision light）をつけます。窓から「Prop clear!」と大きな声で言い、返事を待ってからスターター（starter）を回します。ブレーキを踏み、片手はスロットルに置きます（AFH 第 2 章）。</p>
<p>かかったら約 1,000 rpm にし、<b>まず油圧が上がるのを確かめます</b>。30 秒以内に上がらなければ、すぐにエンジンを止めます（POH 4.5b・AFH 第 2 章）。</p>
<p>エンジンがかかったあとに START ENGD（スターターがつながったまま）の警報が出たら、エンジンを止めて原因を調べます（POH 4.5b）。</p>
<p>始動のあと、電動の燃料ポンプを OFF にしても、エンジンが回り続けることを確かめます。エンジンが回す燃料ポンプだけで、燃料が届くことの確認です。</p>
${bk.deep('スターターの使い方と、訓練校のチェックリストの順番', `<p>スターターは、続けて長く回しません。Archer III の POH は、1 回 10 秒まで、間に 2 分休み、5 回までとしています。寒い日は、油圧が上がるまで数秒長くかかります（POH 4.5b）。</p>
<h4>始動の前（キャブレター式の例）</h4><ol>
<li>座席を合わせ、ベルトを締めます。ブレーキをかけます。</li>
<li>サーキットブレーカー（circuit breaker）を確かめます。飛び出しているものがあれば、戻す前に原因を確かめます。整備の不具合なら戻しません（FAA SAIB CE-10-11）。</li>
<li>燃料セレクター（燃料選択弁、fuel selector）を、使うタンクにします。同乗者に安全の説明をします。</li>
<li>非常用バッテリー（EMERG BATT）を ARM にし、予備の計器と主な表示が動くことを確かめてから、バッテリーマスターを ON にします。</li></ol>
<h4>始動</h4><ol>
<li>オルタネーター・電動燃料ポンプ（electric fuel pump）・マグネトー・衝突防止灯を ON にします。</li>
<li>スロットルを 1/4 インチ開き、ミクスチャーを全開（FULL RICH）にし、要ればプライマーを使います。</li>
<li>「Prop clear!」と言い、周りに人がいないことを確かめてから、スターターを回します。</li></ol>
<h4>始動のあと</h4><ol>
<li>800〜1,200 rpm にし、アビオニクスを ON にします（POH 4.5e）。</li>
<li>タンクを切り替えて、どちらのタンクからも燃料が来ることを確かめます。</li>
<li>ATIS を聞き、高度と方位の計器を合わせます（{ch:radio4}）。トランスポンダー（transponder）は GROUND にします。</li></ol>`)}
${bk.judge('決められた時間に表示が出なければ、出力を上げて様子を見ずに止めます。いつもと違う音・振動・におい・煙でも止めます（AFH 第 2 章）。')}
${bk.key('「Prop clear!」と言い、周りを見てからスターター', '始動したら、まず油圧。30 秒以内に上がらなければ止める', '燃料ポンプを切ってもエンジンが回ることを、地上で確かめる')}
${bk.warn('<b>始動のときのエンジン火災</b>（チェックリストの手順）：スターターを回し続けて、火を吸い込ませます。次に、ミクスチャー IDLE CUT-OFF → スロットル OPEN（開く） → 燃料ポンプ OFF → 燃料セレクター OFF の順です。消えなければ、機体から離れます。機体ごとに POH で確かめてください。')}
${bk.recall('マグネトーのスイッチや線が壊れていると、OFF でも点火が止まらないことがあります。止まっているプロペラにも、点火が入っていると思って近づきません。', ['sys.engine', 'エンジンと点火'])}` },
      { id: 'ground.taxi', t: '地上滑走：速さ・ブレーキ・風・停止線', scope: 'common', from: ['kiso11.6'], faa: ['PA.II.D.K1', 'PA.II.D.K2', 'PA.II.D.K3', 'PA.II.D.K4', 'PA.II.D.K5', 'PA.II.D.K6'], h: () => `
${bk.aim('地上を安全に動くために、速さの決め方、ブレーキと前輪の使い方、風のときの操縦輪の位置、止まる所を覚えます。')}
${FIG.taxiWind()}
<p>動き出す前に、飛行場の図（airport diagram）で、今いる所と通る道を確かめます。横切る滑走路と、その手前で止まる停止線（runway holding position marking）も確かめます（AFH 第 2 章）。</p>
<ul><li><b>速さ</b>：スロットルで決めます。スロットルを閉じれば、すぐに止まれる速さにします。混んでいる駐機場では、さらにゆっくり動きます（AFH 第 2 章）。</li>
<li><b>ブレーキ</b>：方向舵のペダルの上の部分を、つま先で踏むとブレーキです（左右別々）。動き出したら、すぐに少し踏んで、左右とも効くかを試します。効かなければ、すぐにエンジンを止めます（AFH 第 2 章）。</li>
<li><b>曲がる</b>：Archer は前輪が方向舵のペダルとつながっていて、ペダルで向きを変えます。曲がる前に速さを落とします。速いまま急に曲がると、脚に無理がかかり、横すべりします（AFH 第 2 章）。</li>
<li><b>見る</b>：目は外へ向け、左右と遠く・近くを見ます。誘導路の黄色い中心線を、胴体のまん中の下に置きます。</li></ul>
<p><b>風のとき</b>：横から向かい風が吹くと、風上の翼が持ち上げられます。操縦輪を<b>風の方へ</b>回して、風上の補助翼を上げます。後ろから追い風が吹くと、風が尾翼と翼の下に入ります。操縦輪を<b>風と反対へ</b>回し（風上の補助翼を下げる）、<b>前へ</b>押します（昇降舵を下げる）（AFH 第 2 章）。</p>
${bk.judge('今いる所が分からなくなったら、走りながら図を探さず、止まって管制に聞きます。物との間隔に迷ったら、止まって確かめます（AFH 第 2 章）。')}
${bk.key('速さはスロットルで。閉じればすぐ止まれる速さ', 'ブレーキはペダルの上。動き出したらすぐ試す', '向かい風は風の方へ。追い風は風と反対へ、操縦輪を前へ', '管制塔のある空港では、停止線を許可なしに越えない。迷ったら止まって聞く')}
${bk.recall('地上滑走の指示で行けるのは、停止線の手前までです。入る・横切る許可をもらうまで、実線の側で止まります（米国の AIM 2-3-5・4-3-18）。', ['comm.runway', '滑走路に入る許可'], ['sys.lights', '地上での灯火'])}
${bk.q('地上滑走の途中、速すぎると感じた。スロットルを開けたまま、ブレーキで速さを調節してよい？', 'よくありません。速さはスロットルで決め、ブレーキは止まるためと、向きを助けるために使います。スロットルを開けたままブレーキを使うと、ブレーキが熱くなり、すり減ります（AFH 第 2 章）。')}` },
      { id: 'ground.runup', t: '試運転（ランナップ）と離陸前の確認', scope: 'common', from: ['kiso11.16'], faa: ['PA.II.F.K1'], h: () => `
${bk.aim('滑走路の手前で、エンジン・計器・操縦装置が正しく働くかを確かめ、離陸（takeoff）で何かが起きたときにすることを決めておきます。')}
${FIG.magCheck()}
<p>滑走路の近くの試運転の場所（run-up area）で、<b>できるだけ風上に機首を向けて</b>止まります。固くてごみのない所で、プロペラの後ろの風がほかの機や人に当たらないようにします（AFH 第 2 章）。</p>
${bk.t(['項目', '訓練校の Archer チェックリスト', '何を見ているか'], [
  ['回転', 'ブレーキをかけ、ミクスチャー全開、2,000 rpm', ''],
  ['マグネトー', '左だけ・右だけにして、回転の落ちを見る。<b>落ちは最大 175 rpm、左右の差は 50 rpm 以内</b>', '点火の系統が 2 つとも働くか。落ちがゼロ（切っても落ちない）も異常'],
  ['計器', '電流計・油温・油圧・燃料の圧力と流量・警報灯のテスト', '緑の範囲にある'],
  ['キャブレターヒーター（キャブレターヒート、carburetor heat）', 'ON にして、回転が少し落ちる（約 75 rpm）のを確かめ、OFF', '熱い空気は薄いので出力が落ちる＝キャブレターヒーターが働いている'],
  ['アイドル', 'スロットルをアイドルにして止まらないか → 1,000 rpm', '着陸の進入で、エンジンが止まらない'],
  ['操縦', '操縦輪とペダルが自由に、正しい向きに動く。トリムは中立', '逆に動くのは整備のまちがい。いちばん危険な見落とし']])}
<p>マグネトーの落ちが限度を超えたら、チェックリストの手順で直るかを確かめます。直らなければ飛ばずに、整備に知らせます（squawk）。</p>
<h4>離陸ブリーフィング（声に出す）</h4>
<p>例（${AR.rotate}・${AR.y} kt はチェックリストと同じ値です）：</p>
<ul><li>「滑走路 36、フラップ 0°、${AR.rotate} kt でローテーション、${AR.y} kt で上昇。」</li>
<li><b>「滑走中に異常があれば、スロットルを閉じてまっすぐ止まる。」</b></li>
<li><b>「浮揚したあとでエンジンが止まったら、まず機首を下げて安全な速度を保つ。滑走路が残っていれば、降りて止まる。」</b></li>
<li><b>「残っていなければ、浅い旋回だけで、前の方に降りる所を選ぶ。引き返さない。」</b></li></ul>
${bk.deep('試運転の細かいことと、離陸前のチェックリスト', `<p>マグネトーの落ちが限度を超えたときの手順：2,000 rpm のままミクスチャーを少し薄くして 20〜30 秒回し、点火栓の汚れを焼きます。濃く戻してもう一度確かめます。エンジンを熱くしすぎないようにします（チェックリスト）。</p>
<p>止まったら少し前へ転がして、前輪をまっすぐにしてから点検を始めます。点検の間も、外と中を交互に見ます。パーキングブレーキがすべって、気づかないうちに前へ動くおそれがあるからです（AFH 第 2 章）。</p>
<p>空冷のエンジンは、地上では冷やす風が少なく、長く回すとシリンダーが熱くなります。風上に向けるのは、そのためでもあります（AFH 第 2 章）。Archer III の POH は、片方のマグネトーだけで回すのは 10 秒までとしています。キャブレターヒーターを ON にしたまま、地上で長く回しません。フィルターを通らない空気を吸うからです（POH 4.5g）。</p>
<p>離陸前のチェックリストでは、燃料は多い方のタンク、燃料ポンプ ON、マグネトーは両方、着陸灯とストロボ ON を確かめます。キャブレターヒーター OFF、ミクスチャー、フラップとトリム、ドアと窓、パーキングブレーキも確かめます。</p>
<p>離陸滑走を始める前に、滑走路の番号と、コンパスと方位の計器が合っていることを確かめます。ちがう滑走路から離陸しないためです（AFH 第 2 章）。チェックリストには、再始動を試せる高さがあるときの手順もあります（{ch:emg}）。</p>`)}
${bk.judge('「異常があれば考える」「必ず引き返す」は、計画になりません。止まる条件と、どの高さから何をするかを、言葉にして決めます。')}
${bk.key('試運転は風上に機首。マグネトーは落ち 175 rpm・差 50 rpm まで', '操縦輪が正しい向きに動くかを、必ず見る', 'ブリーフィングは「起きたら何をするか」を、起きる前に決めておくため（{ch:emg}）')}
${bk.recall('マグネトーは左右 2 系統で、片方ずつにすると回転が少し下がるのが正常です。まったく下がらないときは、スイッチか線の故障を疑います。', ['sys.engine', 'エンジンと点火'])}
${bk.q('マグネトーの点検で、左にしたら 100 rpm、右にしたら 200 rpm 落ちた。飛んでよい？', 'いいえ。右の落ちが限度の 175 rpm を超え、左右の差も 50 rpm を超えています。チェックリストの手順（少し薄くして 20〜30 秒回し、戻して確かめる）で直らなければ、飛ばずに整備に知らせます。')}
${bk.sim('課目「通常離陸と上昇」は、試運転が終わって滑走路に並んだところから始まります。', ['t1', '通常離陸と上昇'])}` },
      { id: 'ground.after', t: '着陸のあと：駐機・停止・ふり返り', scope: 'common', from: ['kiso11.28'], faa: ['PA.XII.A.K1', 'PA.XII.A.K2', 'IR.VIII.A.K1'], h: () => `
${bk.aim('フライトは、エンジンを止めて機体を固定するまで終わりません。着陸のあとから、駐機・停止・ふり返りまでを、チェックリストで終えます（AFH 第 2 章）。')}
<p>着陸のあとは、地上滑走の速さまで減速してから滑走路を出ます（AFH 第 2 章）。滑走路を出たことは、機体の全部が停止線を越えたことで確かめます。</p>
<p><b>着陸後のチェックリストは、停止線を越えて完全に止まってから</b>行います。動きながらだと、まちがったレバーを動かすことがあるからです（AFH 第 2 章）。</p>
<p>エンジンを止めたら、機体の周りを一周して、もれ・タイヤ・ブレーキを見ます。いつもと違う表示や不具合は記録し、整備に伝えます（AFH 第 2 章）。</p>
<p>デブリーフィングでは、準備・見たこと・操作・判断のどこに原因があったかを分けてふり返ります。よい判断も残し、次に変える行動を 1 つ決めます。</p>
${bk.deep('Archer III の着陸後・停止・係留と、記録', `<p>Archer III の POH では、滑走路を出たらフラップを上げ、電動燃料ポンプを OFF にします。ストロボと着陸灯は、必要に応じて切ります（POH 4.5n）。停止の手順は、パーキングブレーキ・フラップを上げる・電動燃料ポンプ OFF・非常用バッテリー OFF・電気のスイッチ OFF の順です。そのあと、スロットルを閉じてミクスチャーを IDLE CUT-OFF にし、マグネトーとバッテリーマスターを OFF にします（POH 4.5o）。</p>
<p>AFH の例には、アイドルで一瞬マグネトーを OFF にして、点火が確かに止まるかを見る項目があります。Archer III の POH の停止の手順には、この項目がありません。するかどうかは、訓練校の手順に従います（AFH 第 2 章・POH 4.5o）。</p>
<p>係留では、操縦輪をシートベルトで固定し、車輪止めを置きます。左右の翼の下と尾のリングに、ロープをかけます。方向舵は前輪の操向とつながっているので、ふつうは固定しません（POH 4.5p）。しばらく飛ばない機体は、タンクを満たしておくと、タンクの中の結露を減らせます。ピトー管（pitot tube）のカバーなども使います（AFH 第 2 章）。</p>
<p>うまくできた判断には、たとえば着陸復行（ゴーアラウンド、go-around）を選んだことがあります。飛んだ記録は、ログブック（飛行の記録）に書きます。操縦教員は、訓練をした人のログブックに署名します（米国の 14 CFR 61.189）。</p>`)}
${bk.judge('滑走路を出たと確かめる前に、機内の操作を始めません。')}
${bk.key('着陸後のチェックリストは、停止線を越えて止まってから', 'エンジンを止めたあとも一周して見る。不具合は記録して整備へ', 'ふり返りは原因を分ける。次に変える行動を 1 つ決める')}
${bk.warn('<b>ここに注意：</b>Archer の右のフラップは、いっぱいに上げた位置でだけ、乗り降りの足場として重さを支えます。降りる前にフラップを上げ、同乗者にも伝えます（POH 4.5o・7.9）。')}` },
    ],
    terms: [['Airworthy', '耐空性がある（安全に飛べる状態）', '14 CFR 91.7'], ['Preflight inspection / Walk-around', '外部点検（飛行前点検）', ''], ['Fuel sump / Drain', '燃料のサンプ（水の抜き取り）', ''], ['Fuel strainer', '燃料ストレーナー（機首の下の水抜き）', ''], ['Strut', '緩衝支柱（脚のショックを吸収する柱）', ''], ['Stabilator', 'スタビレーター（全体が動く水平尾翼）', ''], ['Toe brakes', 'トーブレーキ（ペダルの上をつま先で踏む）', ''], ['Magneto', 'マグネトー（エンジンの点火用の発電機）', '2 系統'], ['Run-up', '試運転（ランナップ）', ''], ['Carburetor heat', 'キャブレターヒーター', 'キャブレターヒートとも'], ['Runway holding position marking', '停止線（滑走路の手前の停止線）', 'AIM 2-3-5'], ['Prop clear', 'プロペラの周りに人がいない（始動前の掛け声）', ''], ['Takeoff briefing', '離陸ブリーフィング', ''], ['Squawk（整備）', '不具合を整備に報告すること', ''],
      ['Positive exchange of flight controls', '操縦の受け渡し', 'AFH 第 1 章。You have / I have / You have'], ['Authority gradient', '権威勾配', '立場の差'], ['Say again / Unable', 'もう一度 / できません', 'P/CG'], ['Airport diagram', '飛行場の図', ''], ['Starter', 'スターター', 'Archer III の POH：1 回 10 秒・2 分休み・5 回まで'], ['Postflight inspection', '飛行後の点検', ''], ['Tie-down / Mooring', '係留', ''], ['Debriefing', 'デブリーフィング（ふり返り）', '']],
    examples: ['マグネトーの点検で左 100 rpm・右 200 rpm 低下 → 右が上限 175 を超えている。チェックリストの手順で直らなければ飛ばない（整備に報告：squawk）。', '燃料のサンプに水の玉 → 出なくなるまで抜く。前の晩の雨・タンクの結露が原因のことがある。', '着陸したあと、滑走しながらフラップを上げようとした → 機体の全部が停止線を越えて止まってから、チェックリストで行う。'],
    cautions: ['この章の手順は、公開されている訓練校のチェックリストの要約で、ANA・Acron Aviation の SOP ではありません。実機は、その機体の POH と、その訓練校のチェックリストに従ってください。', 'シミュレータでは、外部点検・始動・ランナップは省いています（課目は滑走路の上か空中から始まります）。'],
    quiz: [
      { q: 'ランナップのマグネトー点検（訓練校の Archer チェックリスト）の限度は？', choices: ['最大 50 rpm 低下・差 175 rpm', '最大 175 rpm 低下・左右の差 50 rpm', '低下がないのが正常', '最大 500 rpm 低下'], answer: 1, why: 'チェックリストの値は「max drop 175 rpm, max difference 50 rpm」。落ちがまったくないのも、スイッチや配線の故障の疑いで正常ではない。' },
      { q: '後ろから斜めに追い風が吹いている。タキシー中の操縦輪の位置は？', choices: ['風の方へ回し、手前に引く', '風と反対へ回し、前へ押す', 'すべて中立', '風の方へ回し、前へ押す'], answer: 1, why: 'AFH 第 2 章：追い風では、風上のエルロンを下げ（操縦輪を風と反対へ）、昇降舵を下げる（前へ）。風が尾翼や翼の下に入らないようにする。' },
      { q: '始動した直後に、まず確かめる計器は？', choices: ['燃料流量', '油圧', '速度計', '高度計'], answer: 1, why: 'AFH 第 2 章：ふつう 30 秒以内に油圧が上がる。上がらなければ、すぐにエンジンを止める。' },
      { q: 'サンプで抜いた燃料の底に、透明な玉が沈んでいた。正しいのは？', choices: ['燃料なので気にしない', '水なので、出なくなるまで抜く', 'タンクを振って混ぜる', '燃料を足して薄める'], answer: 1, why: '水は燃料より重く、底に玉になって沈む。出なくなるまで抜き、なくならなければ飛ばない（AFH 第 2 章。「外部点検」の節）。' },
      { q: 'タキシー中の速さの決め方として正しいのは？', choices: ['ブレーキで調節する', 'スロットルで決め、閉じればすぐ止まれる速さにする', 'できるだけ速く動く', '昇降舵で調節する'], answer: 1, why: 'AFH 第 2 章：速さはスロットルで決め、スロットルを閉じればすぐ止まれる速さにする。' },
      { q: '操縦の受け渡しで、訓練生が操縦教員に操縦を返すときの正しい手順は？', choices: ['訓練生「You have the flight controls.」→ 教員「I have the flight controls.」→ 訓練生「You have the flight controls.」', '訓練生が手を離し、教員がうなずくのを見る', '教員が操縦輪を握ったら、何も言わずに手を離す', '訓練生が「I have the flight controls.」と言ってから手を離す'], answer: 0, why: 'AFH 第 1 章の 3 段階。返すときも渡すときと同じ手順で、教員が「I have the flight controls.」と言うまで操縦を続ける（「操縦教員と飛ぶ」の節）。' },
      { q: '始動した Archer III で、エンジンは回っているのに START ENGD（スターターがつながったまま）の警報が出た。どうする？', choices: ['スロットルを上げて警報が消えるか見る', 'そのまま地上滑走を始める', 'エンジンを止めて原因を調べる', '警報を消して、離陸前の点検で確かめる'], answer: 2, why: 'Archer III の POH 4.5b：エンジンが回っているのに START ENGD の警報が出たら、エンジンを止めて原因を調べる（「エンジン始動」の節）。' },
      { q: '着陸のあと、着陸後のチェックリスト（フラップを上げるなど）を始めてよいのは？', choices: ['接地したらすぐ', '滑走路の上で減速しているとき', '誘導路へ曲がっている途中', '機体の全部が停止線を越えて、完全に止まってから'], answer: 3, why: 'AFH 第 2 章：着陸後のチェックリストは、停止線を越えて完全に止まってから。動きながら操作すると、まちがったレバーを動かすことがある（「着陸のあと」の節）。' },
    ],
    written: [
      ['この本を読んで離陸の手順を説明できれば、初めての機体でも 1 人で離陸できますか。座学でめざすことと、飛ぶ訓練でめざすことを分けて答えてください。', `座学では、操作の目的・見る情報・やめる条件を説明できるようにします。実際にできるかは、その機体の POH にもとづく操縦教員の訓練と評価で確かめます。読んだことは、資格や単独飛行の許可になりません。機体ごとの違いも残ります。${bk.see('ground.day', '訓練の 1 回のフライト')}`, ['kiso11.q1']],
      ['前の日と同じ機体ですが、同乗者と使う滑走路が変わりました。前の日の計画をそのまま使えない理由と、計算し直すことを挙げてください。', `重さと重心の位置・要る燃料・離着陸の距離・上昇の性能の前提が変わるからです。天気・滑走路と障害物・ノータム・機体の整備の状態も確かめ直します。同じ機体であることは、同じ条件で飛べる根拠になりません。${bk.see('ground.day', '訓練の 1 回のフライト')}`, ['kiso11.q2']],
      ['外部点検で、翼に薄い霜を見つけました。少しなので、飛べば落ちると考えてよいですか。点検の目的から答えてください。', `よくありません。薄い霜でも翼の表面が変わり、揚力と操縦のしやすさが落ちます。飛んでいるうちに落ちると期待して出発せず、操縦教員や整備士と、その機体の決まりで処置します。外部点検は、見つけて記録するだけでなく、飛べる状態かを確かめる作業です。${bk.see('ground.walk', '外部点検')}`, ['kiso11.q3']],
      ['訓練生が操縦を渡すつもりで手を離しましたが、操縦教員の返事はありませんでした。何が問題で、どうするべきでしたか。', `誰も操縦していないか、2 人とも相手が操縦していると思い込むおそれがあります。手を離さずに操縦を続け、もう一度言います。渡す・受ける・確かめるの 3 段階を、ブリーフィングで決めた言葉で行います。${bk.see('ground.crew', '操縦教員と飛ぶ')}`, ['kiso11.q4']],
      ['始動したあと、エンジンは回っていますが、決められた時間に油圧が上がりません。回っているので、地上滑走を始めてよいですか。', `よくありません。回っていても、潤滑が正常とは言えません。Archer III の POH は、30 秒以内に油圧が上がらなければ、エンジンを止めて原因を調べるとしています。出力を上げたり飛びながら様子を見たりせず、原因が分からないまま次へ進みません。${bk.see('ground.start', 'エンジン始動')}`, ['kiso11.q5']],
      ['地上滑走の途中で、今いる所が分からなくなりました。前に停止線が見えます。図を探しながら走り続けることの問題と、取るべき行動を答えてください。', `外を見る注意が減り、滑走路誤進入やほかの機との接触につながります。安全な所で止まり、飛行場の図・標識・管制への問い合わせで、位置と指示を確かめます。停止線を越える前に、入る・横切る許可をはっきりさせます。${bk.see('ground.taxi', '地上滑走')}`, ['kiso11.q6']],
      ['離陸前の打ち合わせで「異常があれば考える」「離陸の直後は必ず引き返す」と決めました。何が足りませんか。', `どこで止まるかの条件と、残りの距離と速さの関係、離陸のあとの地形と降りられる所が決まっていません。引き返すには高さと距離が要り、いつもできるわけではありません。その機体と飛行場に合わせて方針を具体的に決め、操縦教員と共有します。${bk.see('ground.runup', '試運転と離陸前の確認')}`, ['kiso11.q16']],
      ['横風でファイナルを行き過ぎて、着陸復行をしました。ふり返りでは、何を分けて考え、次にどうつなげますか。', `風の見積もり・旋回を始めた位置・速度・見たことと判断した時点を、分けて考えます。着陸復行を選べたことも、よい判断として残します。次に変える行動を 1 つ、操縦教員と具体的に決めます。着陸後の確認と不具合の引き継ぎまで、1 回のフライト全体をふり返ります。${bk.see('ground.after', '着陸のあと')}`, ['kiso11.q28']],
    ],
    refs: [R.archerCk, R.archerPoh, NEW_R.afh2, R.afh1, R.afh, R.phak, R.acsP, R.cfr91, R.cfr61, R.aim23, R.pcg, R.saib1011], lessons: ['t1'] });

  // ======================================================================= 第 2 部 第 22 章
  B.add({ id: 'ops', part: 'p2', t: '基本操縦：姿勢・出力・エネルギーと空中操作', en: 'Basic flight maneuvers and energy management',
    summary: '「姿勢＋出力＝性能」とエネルギーの見方（スロットルは全体の量、昇降舵は配分）から始めて、直線水平・上昇降下・旋回・急旋回・低速飛行・失速と回復・対地目標操作を、自家用の実地試験の許容幅とあわせて学ぶ。',
    secs: [
      { id: 'ops.trim', t: '姿勢＋出力＝性能、そしてトリム', scope: 'common', from: ['kiso11.8', 'kiso11.9'], jcab: ['ppl.1.1.1.7', 'cpl.1.1.1.7'], h: () => {
        const st = ops4(), pc = v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}°`, pw = r => r.full ? '全開' : `約 ${Math.round(r.thr * 20) * 5}%`;
        return `
${bk.aim('操縦の基本の考え方「姿勢＋出力＝性能」と、トリム（trim）の使い方を覚えます。この章のすべての操作の土台です。')}
${FIG.attitudePower()}
<p>機首の角度（ピッチ）とバンク角を決め、スロットルで出力を決めると、速度と上昇・降下の率が決まります。これが<b>「姿勢（Attitude）＋出力（Power）＝性能（Performance）」</b>です。姿勢の操縦は、<b>ピッチ・バンク・出力・トリム</b>の 4 つでできています（AFH 第 3 章）。</p>
${bk.t(['この教材の Archer（教材値・3,000 ft）', 'ピッチ', 'スロットル', '結果'], st.map(r => [r.name, pc(r.pitch), `${pw(r)}（約 ${(Math.round(r.rpm / 50) * 50).toLocaleString('en-US')} rpm）`, `${r.kt} kt・${r.fpm > 50 ? '+' + Math.round(r.fpm / 10) * 10 + ' fpm' : r.fpm < -50 ? '−' + Math.round(-r.fpm / 10) * 10 + ' fpm' : '水平'}`]))}
<p>上昇 ${AR.y} kt と進入 ${AR.appr} kt は、訓練校のチェックリスト（checklist）の値と同じです（参考値）。ピッチと回転数は、教材の計算の値です。</p>
${bk.deep('表のスロットルの % と、実機の出力', '<p>スロットルの % は、レバーをどれだけ開いたかを表す教材の値で、エンジンの出力の % ではありません。ACS の「出力 65%」などは、エンジンの出力の % です。実機の回転数と出力の関係は、その機体の POH（操縦士用の機体の手引書、pilot\'s operating handbook）の表で確かめます。</p>')}
<p>操縦は<b>「見る → 変える → 待つ → 確かめる → トリム」</b>の順です。姿勢を決めて操縦輪（ヨーク、control wheel）の力で保ち、速度と昇降率が落ち着いてから、トリムで力を消します。トリムで機首を上げ下げして飛ぼうとすると、うまく飛べません（AFH 第 3 章）。</p>
<p>機首（昇降舵（エレベーター、elevator））も出力も、速度と高度の両方を変えます。「速度は機首、高度は出力」は場面ごとの使い方で、理由は次の節で学びます。</p>
${bk.judge('低い速さのトリムのまま急に出力を足すと、機首が上がり左へ向きます。前へ押す力と右の方向舵（ラダー、rudder）を先に用意します（AFH 第 9 章）。')}
${bk.key('上昇中の速度は機首で合わせる（出力は全開のまま）。降下率は出力で決める', '出力を変えると機首が上下し、左右にも向く（出力を上げると機首が上がり、左へ向く）。先回りして押さえる', 'トリムは最後。トリムで機首を上げ下げしない')}
${bk.sim('トリムを取って手放しで飛ぶ感覚を覚えましょう。W / S で機首の角度を動かし、離すとその角度を保ちます。T で、いまの速度でトリムが取れます。', ['a1', '姿勢・出力・トリム'])}`;
      } },
      { id: 'ops.energy', t: 'エネルギーの管理：スロットルと昇降舵の役割', scope: 'common', from: ['kiso11.14'], faa: ['PA.IV.B.K1', 'PA.IV.D.K1', 'PA.IV.F.K1', 'PA.IV.M.K1', 'PA.IV.N.K1', 'PA.IX.B.K4', 'IR.VI.A.K4'], h: () => `
${bk.aim('速度と高度を、エネルギーの量と配分として見ます。スロットルと昇降舵の役割を分けると、「高いのに遅い」「低くて速い」の直し方が分かります。')}
${FIG.energyFlow()}
<p>飛行機のエネルギーは、高さの分（位置エネルギー）と速さの分（運動エネルギー）の合計です。推力が全体を増やし、抗力が減らします（AFH 第 4 章）。</p>
<p><b>エネルギーの管理（energy management）</b>は、高度と速度の目標を、このエネルギーとして計画し、見て、操作することです。<b>スロットルは全体の量</b>を、<b>昇降舵は高さと速さの配分</b>を変えます。どちらか 1 つだけで、高度か速度だけを決めているのではありません（AFH 第 4 章）。</p>
<p>ずれの直し方は、高度と速度が同じ向きにずれたか、逆の向きにずれたかで決まります。</p>
${FIG.energyErrors()}
<p>たとえば進入で高くて速いとき、機首を下げるだけでは、高さが速さに変わってさらに速くなります。出力を減らし、抗力の大きい形態も使って、全体の量を減らします（AFH 第 4 章）。</p>
${bk.deep('エネルギーの式と、高さと速さの交換', `<p>位置エネルギーは mgh、運動エネルギーは ½mV² です。合計を重さで割ると、高さの単位の「エネルギー高度」h ＋ V² ÷ 2g になります。速さを全部高さに変えたときに届く高さです（AFH 第 4 章）。</p><p>推力が抗力と釣り合っていれば、昇降舵だけで高さと速さを交換できます。そのとき、高さと速さはいつも逆の向きに変わります（AFH 第 4 章）。フラップ（flaps）は、使える速さ（Archer は V<sub>FE</sub> ${AR.fe} KIAS）以下で下げます（POH 2.3）。</p>`)}
${bk.drill('速さを高さに変える', `<p>この教材の Archer が ${AR.cruise} kt で水平に飛んでいます。抗力を考えずに、機首を上げて ${AR.y} kt まで速さを高さに変えると、何 ft 上がれますか。1 kt ＝ 1.688 ft/s、g ＝ 32.17 ft/s² とします。</p>`, `<p>${AR.cruise} kt ＝ ${f1(fts(AR.cruise))} ft/s、${AR.y} kt ＝ ${f1(fts(AR.y))} ft/s です。高さの差は（${f1(fts(AR.cruise))}² − ${f1(fts(AR.y))}²）÷（2 × 32.17）≒ ${f0(Math.round(dh(AR.cruise, AR.y) / 10) * 10)} ft です。実際は抗力があるので、これより少なくなります。</p>`)}
${bk.deep('全開でも上がれないとき', '<p>とても遅いと誘導抗力（induced drag）が大きく、全開にしても推力が抗力に勝てません。上昇も加速もできない状態です。このときは、先に機首を下げて迎え角（迎角、angle of attack）を減らし、速さを取り戻してから上昇します。地面が近いと、取り戻す高さが残っていません（AFH 第 4 章）。</p><p>AFH は、暑い午後に標高の高い空港から離陸（takeoff）し、上り坂の地形に向かって機首を上げすぎた例を挙げています。速さが減って上昇が止まり、失速（stall）の手前で失速警報（stall warning）が鳴ります。地形を越えられないと分かったら、引き返す判断もします（AFH 第 4 章）。</p>')}
${bk.judge('高くて速いまま安定に戻せないときは、着陸をやめて着陸復行（ゴーアラウンド、go-around）をします。とても遅いときは、出力より先に機首を下げます（AFH 第 4 章）。')}
${bk.key('スロットルは全体の量、昇降舵は高さと速さの配分', '低くて遅い・高くて速いはまず出力。高くて遅い・低くて速いはまず機首', 'とても遅いときは、出力より先に機首を下げて迎え角を減らす')}
${bk.sim('降下からのレベルオフと、進入の高さと速さの直し方で、出力と機首の役割を確かめます。', ['a3', '上昇・降下・レベルオフ'], ['t3', '通常着陸'])}` },
      { id: 'ops.sl', t: '直線水平飛行', scope: 'common', from: ['kiso11.7', 'kiso11.10'], h: () => `
${bk.aim('高度・針路（ヘディング、heading）・速度を同時に保つ、すべての操作の土台を身につけます。')}
<p>外を見て飛ぶときは、<b>機首（カウリングの上の線）と水平線の位置関係</b>と、<b>左右の翼の端と水平線の関係</b>を覚えます。目はほとんど外に向け、計器は確かめるために見ます（AFH 第 3 章）。</p>
<ol><li>機首を水平線のいつもの位置に置き、翼を水平にします。</li>
<li>出力を巡航に合わせます。</li>
<li>速度が落ち着いたら、トリムを取ります。</li>
<li>高度と方位の計器を時々確かめ、ずれたら<b>小さく</b>直します。この教材の目安では、高度が 50 ft ずれたら、ピッチを 1〜2° だけ変えて戻します。</li></ol>
${bk.t(['基準', '高度', '針路', '速度'], [['自家用 ACS（計器だけで飛ぶ直線水平飛行の課目）', '±200 ft', '±20°', '±10 kt'], ['この教材の「基礎」', '±100 ft', '±10°', '±10 kt'], ['この教材の「精度」（基礎の 6 割）', '±60 ft', '±6°', '±6 kt']])}
${bk.deep('外の目標と計器の見方', `<p>機首が水平線に対してどう見えるかは、座席の位置と機体で変わります。毎回同じ座席の位置にすると、姿勢の小さな変化に気づきやすくなります。方向は、近くの物でなく遠くの目標で保ち、方位の計器と比べます。機首の向きが同じでも、横風（crosswind）があれば地面の上の経路は流されます（${bk.see('ops.ground', '対地目標操作')}）。</p>
<p>見張り（see and avoid）では、空を区切って、1 か所ずつ焦点を合わせて見ます。翼・支柱・機首でできる見えない所も考えます。画面の交通の表示は、見張りを助けるもので、代わりにはなりません。高度が下がり始めたら、数字だけを追わず、姿勢・出力・速度のどれが変わったかを見ます。</p>`)}
${bk.judge('水平線がかすみや雲で見えにくくなったら、計器を見る時間を増やして続けません。早めに経路を変え、引き返すことも考えます。')}
${bk.key('翼が少しでも傾くと、ゆっくり曲がって高度も下がる。まず翼を水平に', 'ずれは小さいうちに小さく直す。大きく直すと行き過ぎる', '目はほとんど外。計器は確かめに使う')}
${bk.sim('高度・針路・速度を同時に保つ練習です。', ['a2', '直線水平飛行'])}` },
      { id: 'ops.climb', t: '上昇・降下・レベルオフ', scope: 'common', from: ['kiso11.11', 'kiso11.12'], faa: ['PA.IV.A.K2'], h: () => `
${bk.aim('上昇と降下の始め方と、目標の高度でぴったり水平に戻す方法を覚えます。')}
<p><b>上昇</b>：機首を上昇の姿勢に上げ、出力を全開にし、トリムを取ります。上昇中は出力を全開のまま、<b>速度は機首で合わせます</b>（AFH 第 3 章）。高出力・低速なので、機首が左へ向こうとします。<b>右の方向舵</b>で押さえます（{ch:aero}）。</p>
<p><b>レベルオフ</b>：目標高度の<b>昇降率の 10%</b> 手前から、機首をゆっくり下げ始めます（500 fpm なら 50 ft 手前。AFH 第 3 章）。10% は目安なので、昇降率の変化が止まる様子を見て合わせます。水平になっても、しばらく上昇の出力のままにして、巡航の速度まで速くなるのを待ちます。速度が付いたら出力を巡航に下げ、トリムを取り直します。</p>
<p><b>降下</b>：出力を下げると機首が下がり、速度を保ったまま降下が始まります。降下率は出力で決めます。目標高度の手前（降下率の 10%）から、出力を戻しながら機首を水平へ戻します（AFH 第 3 章）。</p>
${bk.t(['Archer の上昇の速度', '値（訓練校チェックリスト）'], [['Vx（最良上昇角）', `${AR.x} kt：短い距離で高さを稼ぐ（障害物を越える）`], ['Vy（最良上昇率）', `${AR.y} kt：短い時間で高さを稼ぐ（離陸のあとの上昇）`], ['巡航上昇', `${AR.climb} kt：前がよく見え、エンジンも冷える（地上 1,000 ft から上）`]])}
${bk.deep('上昇の速度の名前と、滑空', `<p>AFH では、Vy より速いこの上昇を「通常の上昇（normal climb）」や「巡航上昇（cruise climb）」と呼びます。前がよく見え、エンジンもよく冷えます（AFH 第 3 章）。Vx と Vy の性能のしくみは、${bk.see('perf.climb', '上昇の性能')} で学びました。</p>
<p>滑空は、推力に頼らず、高さを使って進む飛び方です。いちばん遠くへ届くのは、最良滑空速度（最良滑空、best glide speed）です。いちばんゆっくり降りるのは、最小沈下速度（minimum sink speed）です。2 つは目的が違います。届く範囲は、風・旋回・重さ・形態で変わります（AFH 第 3 章）。</p>`)}
${bk.judge('降下を始めるのが遅れても、急に機首を下げて取り戻しません。残りの距離と高さを早く見積もり、計画を変えます。')}
${bk.key('上昇の速度は機首で。出力は全開のまま', 'レベルオフは昇降率の 10% 手前から。水平にしてから速度を待ち、出力を戻し、トリム', '上昇中は前が見えにくい。ときどき左右に軽く旋回して前を確かめる（見張りのための旋回：clearing turns）')}
${bk.q('500 fpm で降下している。3,000 ft で水平にしたい。出力を戻し始める目安の高度は？', '約 3,050 ft です。降下率の 10%（50 ft）手前から、出力を戻しながら機首を水平へ戻します（AFH 第 3 章）。')}
${bk.sim('上昇から始めて、目標高度で水平に戻し、降下までを通して練習します。', ['a3', '上昇・降下・レベルオフ'])}` },
      { id: 'ops.turns', t: '旋回と急旋回', scope: 'common', from: ['kiso11.13'], faa: ['PA.V.A.K1'], h: () => `
${bk.aim('高度を保ったまま旋回し、ねらった針路で止める方法と、45° の急旋回（steep turn）のこつを覚えます。')}
<p><b>旋回の入り方</b>：まず周りを見ます（特に曲がる側と上下）。補助翼（エルロン、aileron）で傾け、同じ向きに少し方向舵を使います。ボールを中央に保つ、釣り合い飛行（coordinated flight）です。目標のバンクで操縦輪を戻し、高度が下がらないよう少し引きます（{ch:aero}）。</p>
<p><b>戻り</b>は、目標の針路の「バンク角の半分」手前から始めます（30° なら 15° 手前。AFH 第 3 章）。半分は目安なので、機体の戻り方を見て合わせます。</p>
${bk.t(['課目', '内容', '許容幅'], [['中程度の旋回', 'バンク 30°、高度を保って 360°', 'ACS の課目ではない。この教材は バンク ±5°・高度 ±100 ft・ロールアウト ±10°'], ['急旋回（自家用 ACS）', 'バンク約 45°、高度と速度を保って 360°', '高度 ±100 ft・速度 ±10 kt・バンク ±5°・ロールアウト ±10°'], ['急旋回（事業用 ACS）', 'バンク約 50°', '同じ許容幅']])}
<p>45° では荷重倍数（G、load factor）が 1.41 G になり、失速速度（stall speed）が約 19% 上がります（{ch:aero}）。</p>
<p>急旋回に入る速度は、メーカーが勧める速度か、なければ運動速度以下です（自家用 ACS）。Archer III の POH の運動速度は、最大運用運動速度（V<sub>O</sub>、maximum operating maneuvering speed）です。2,550 lb で ${AR.va} KIAS、1,917 lb で 98 KIAS です。軽いほど小さくなります（POH 2.3）。</p>
<p><b>高度が下がり始めたら</b>：深いバンクのまま引くと、旋回がきつくなるだけです。<b>バンクを少し浅くしてから引き</b>、高度が戻ったらバンクを戻します（AFH 第 3 章）。</p>
${bk.deep('深いバンクで、さらに傾こうとするわけ', '<p>45° くらいより深いと、外側の翼が内側の翼より速く動きます。その揚力（lift）の差で、さらに傾こうとします（オーバーバンキング傾向（overbanking tendency））。急旋回の間は、少し反対の補助翼で押さえておきます（AFH 第 3 章）。</p>')}
${bk.judge('旋回を小さくしようと、方向舵を強く踏んで機首を回しません。低い速さでの釣り合いのくずれは、失速からスピン（きりもみ、spin）につながります。')}
${bk.key('高度はピッチ、バンクは補助翼、ボールは方向舵。3 つを別々に見て直す', '戻りはバンク角の半分手前から', '急旋回で高度が下がったら、バンクを少し浅くしてから引く')}
${bk.recall('V<sub>O</sub> 以下でも、舵を何度もいっぱいに使うと、構造は守られません。', ['aero.vn', '速度の制限と V-n 線図'])}
${bk.q('バンク 45° の急旋回から、針路 360° で翼を水平にしたい。戻し始める目安の針路は？', 'バンク角の半分の 20〜25° 手前です。右旋回なら約 335〜340°、左旋回なら約 020〜025° で戻し始めます（AFH 第 3 章）。')}
${bk.sim('30° の旋回から、45° の急旋回へ進みます。', ['a4', '中程度の旋回'], ['a5', '急旋回'])}` },
      { id: 'ops.slow', t: '低速飛行', scope: 'common', from: ['kiso11.15'], faa: ['PA.VII.A.K1'], h: () => `
${bk.aim('失速警報が鳴る少し手前の遅い速度で、高度と針路を保って飛ぶ練習です。離着陸の近くの遅い速度でも、確実に操縦できる力をつけます（ふだんの進入は、これより速い）。')}
<p><b>低速飛行（slow flight）</b>では、それ以上迎え角を増やす・荷重を増やす・出力を減らすと、失速警報が鳴る速度を保ちます。実地試験（practical test）の基準、自家用 ACS の書き方です。舵の効きは鈍くなります。機首を上げても高度は上がらず、速度が落ちるだけです。このときは<b>速度は機首、高度は出力</b>で保ちます。迎え角が大きいと、機首の小さな動きで抗力が大きく変わるからです（AFH 第 5 章・${bk.see('ops.energy', 'エネルギーの管理')}）。</p>
${bk.t(['課目', '許容幅・条件'], [['低速飛行（自家用 ACS）', '高度 ±100 ft・針路 ±10°・速度 ＋10／−0 kt・バンク ±10°。失速警報を鳴らさない。地上 1,500 ft より上で終わるように始める（単発）'], ['低速飛行（事業用 ACS）', '高度 ±50 ft・針路 ±10°・速度 ＋5／−0 kt・バンク ±5°'], ['この教材の課目 a6', `速度 58〜68 kt（フラップ 25°）・高度 ±100 ft・針路 ±10°・失速警報なし`]])}
<p>この教材の失速速度は、着陸の形態で ${AR.s0} kt、フラップを上げて ${AR.s1} kt です（教材値）。POH も、2,550 lb・出力アイドル・フラップ全開で 45 KIAS、フラップを上げると 5 kt 増えるとしています（参考値：POH 4.7）。</p>
${bk.judge('失速警報の音だけを待ちません。振動・手ごたえの変化・経路を保ちにくいことも、失速が近いしるしです。')}
${bk.key('低速では、速度は機首、高度は出力', '失速警報を鳴らさない。大きめに、ゆっくり舵を使う', '地上 1,500 ft より上で終わる高さで練習する')}
${bk.jur('check.slow')}
${bk.sim('低速飛行を体験します。パワーを絞り、速度が落ちるにつれて機首を少しずつ上げ、白い帯の中でフラップを下げます。', ['a6', '低速飛行'])}` },
      { id: 'ops.stall', t: '失速と回復・スピンの知識', scope: 'common', from: ['kiso11.15'], faa: ['PA.VII.B.K1', 'PA.VII.B.K3', 'PA.VII.B.K4', 'PA.VII.C.K1', 'PA.VII.C.K3', 'PA.VII.C.K4'], h: () => `
${bk.aim('失速に入ったときの回復の順番と、スピンの知識を覚えます。回復の第一は、いつも「迎え角を減らす」ことです。')}
${FIG.stallRecovery()}
<p>失速は、迎え角が臨界迎え角（臨界迎角、critical angle of attack）を超えて起きます。速度だけで決まるのではなく、荷重が増えると、ふだんより速い速さでも失速します（{ch:aero}）。回復で<b>いちばん大切なのは、迎え角を減らすこと</b>です。出力や高度を守ることを先にして、操縦できなくなった事故がたくさんあります（AFH 第 5 章）。</p>
<p>自動操縦のない単発の練習機では、AFH の回復の型（6 段階）のうち、次の 4 つを使います（AFH 第 5 章）。</p>
<ol><li><b>機首を下げて、迎え角を減らします</b>（失速警報が止まるまで）。</li>
<li><b>翼を水平にします</b>（ボールは方向舵で中央）。</li>
<li><b>出力を必要なだけ足します</b>。</li>
<li><b>元の飛行経路に戻ります</b>（二次失速に気をつけます）。</li></ol>
<p>回復の途中で急に引いて、もう一度失速することを<b>二次失速（secondary stall）</b>といいます。自動操縦のある機体では、回復の最初に必ず自動操縦を切ります（{ch:aero}）。</p>
${bk.deep('実地試験の条件と、AFH の型のほかの 2 つ', `${bk.t(['課目（自家用 ACS）', '条件'], [['パワーオフ失速', '進入か着陸の形態で、安定した降下から。直進なら針路 ±10°、旋回ならバンク 20° まで（±10°）。完全に失速してから、すぐに回復'], ['パワーオン失速', '離陸・出発か巡航の形態で、出力 65% 以上。離陸・出発の姿勢から機首を上げて失速させる。針路 ±10°・バンク 20° まで（±10°）・完全に失速してからすぐに回復、は同じ'], ['どちらも', '地上 1,500 ft より上で終わるように始める（単発）。回復後は Vx か Vy まで加速する']])}
<p>AFH の 6 段階のうち、練習機で使わない 2 つは、最初に自動操縦を切ることと、スピードブレーキを戻すことです（AFH 第 5 章）。</p>`)}
${bk.judge('失速やスピンを、自分だけで試しません。操縦教員（教官、flight instructor）と、決めた空域と高さで練習します。')}
${bk.key('失速の回復の第一は、機首を下げて迎え角を減らす', '① 迎え角 → ② 翼を水平 → ③ 出力 → ④ 元の経路へ', '回復のあと、急に引くと二次失速になる')}
${bk.warn('<b>ここに注意：</b>Archer III の POH では、<b>意図的なスピンは禁止</b>です。スピンの訓練は、操縦教員と、スピンが認められた機体でだけ行います。')}
${bk.jur('check.stall')}
${bk.recall('スピンは、失速に横滑り（ヨー）が重なり、片方の翼がより深く失速したまま回って落ちる状態です。Archer の POH の回復の最初は、方向舵を回転と反対へいっぱいです。', ['aero.spin', 'スピンとスパイラル'])}
${bk.q('失速したら左の翼が下がった。すぐに補助翼を右いっぱいに切って翼を水平にしようとした。何が問題？', '迎え角を減らす前に補助翼を使うと、下がった左の翼の補助翼が下に動いて、その翼の迎え角がさらに大きくなり、失速がひどくなることがあります。先に機首を下げて迎え角を減らし、それから翼を水平にします（AFH 第 5 章）。')}
${bk.sim('2 つの失速を体験します。採点の表には、回復で失った高度を目安として出します（合否には使いません）。実地試験（ACS）には、高度の損失の基準がありません。高度を守るより、迎え角を減らすのが先です。', ['a7', 'パワーオフ失速'], ['a8', 'パワーオン失速'])}` },
      { id: 'ops.ground', t: '対地目標操作（風の中で地面に対して飛ぶ）', scope: 'common', from: ['kiso11.19'], faa: ['PA.V.B.K1', 'PA.V.B.K2', 'PA.V.B.K3', 'PA.V.B.K4'], h: () => `
${bk.aim('風に流されずに、地面の上に決まった形を描く練習です。場周経路（トラフィックパターン、traffic pattern）を、風に合わせて飛ぶ力の基礎になります。')}
${FIG.turnsAroundPoint()}
<p><b>対地目標操作（ground reference maneuvers）</b>では、地上の道路・畑の角・1 つの点を目印にします。風があると、同じバンクのままでは地面に対して円になりません。<b>対地速度が速い所（風下に向かう所）ではバンクを深く、遅い所（風上に向かう所）では浅く</b>します（AFH 第 7 章）。</p>
<p>まっすぐ飛ぶときも、横風があれば、機首を少し風上に向けます。機首の向き（針路）と、地面の上の経路の航跡（トラック、track）は違います（AFH 第 7 章）。</p>
${FIG.crabTrack()}
${bk.t(['操作', '内容（自家用 ACS）'], [['長方形コース（rectangular course）', '畑などの長方形の周りを、辺と平行に、一定の距離で飛ぶ。ダウンウインド（downwind leg）へ 45° で入る。場周経路と同じ形'], ['S 字旋回（S-turns）', '道路に直角に入り、道路の両側に同じ半径の半円を描く。道路の真上で旋回の向きを変える'], ['1 点の周りの旋回（turns around a point）', '1 点の周りを一定の半径で回る']])}
<p>自家用 ACS では、地上 <b>600〜1,000 ft</b> で行い、<b>高度 ±100 ft・速度 ±10 kt</b> を保ちます。風下に向かう所から入ると、いちばん深いバンクを最初に決められます（AFH 第 7 章）。</p>
${bk.deep('練習の場所と高さの選び方（AFH 第 7 章）', '<p>障害物からは、上に 500 ft・横に 2,000 ft 以上離します。高さが低いほど、エンジンが止まったときに降りる場所を選ぶ時間が短くなります。始める前に、左右へ 90° ずつの見張りのための旋回で、周りと上下を確かめます（AFH 第 7 章）。</p><p>長方形コースは、畑などの境から 1/2〜3/4 マイル離して、境と平行に飛びます。近すぎると、深いバンクが要るからです（AFH 第 7 章）。米国の最低安全高度（minimum safe altitude）は、14 CFR 91.119 が決めています。</p>')}
${bk.drill('風の中で同じ半径を回るバンク', `<p>AFH 第 7 章の例です。速度 90 kt・風 10 kt で、半径 890 ft の円を回ります。風下に向かう所（対地 100 kt）で、バンクは約 45° です。風上に向かう所（対地 80 kt）では、約何度ですか。バンク θ は、tan θ ＝ 対地速度² ÷（11.26 × 半径）で求めます（対地速度は kt、半径は ft）。</p>`, `<p>tan θ ＝ 80² ÷（11.26 × 890）≒ ${f0(6400)} ÷ ${f0(11.26 * 890)} ≒ ${(6400 / (11.26 * 890)).toFixed(3)} なので、θ ≒ ${Math.round(bankFor(80, 890))}° です。AFH も約 33° としています。風下では 100² ÷ ${f0(11.26 * 890)} ≒ ${(10000 / (11.26 * 890)).toFixed(3)} で、約 ${Math.round(bankFor(100, 890))}° です。</p>`)}
${bk.judge('外れた経路を、低い高さでの急な旋回で取り戻しません。バンクは 45° までにし、深くなりすぎたら、いったん抜けて入り直します（AFH 第 7 章）。')}
${bk.key('対地速度が速いほど、同じ半径を回るには深いバンクが要る', '風下から入る。風下でいちばん深く、風上でいちばん浅く', '低い高度なので、緊急着陸できる場所・障害物・人家に気を配る（米国の最低安全高度は 14 CFR 91.119）')}
${bk.q('風の中で、1 点の周りを同じ半径で回る。バンクがいちばん深くなるのはどこ？', '風下に向かって飛んでいる所（追い風で対地速度がいちばん速い所）です。風上に向かう所では、いちばん浅くなります（AFH 第 7 章）。')}` },
    ],
    terms: [['Attitude + Power = Performance', '姿勢＋出力＝性能', 'AFH 第 3 章'], ['Pitch attitude / Bank angle', 'ピッチ姿勢（機首の上げ下げ）/ バンク角（翼の傾き）', ''], ['Trim', 'トリム（操縦の力を消す）', ''], ['Coordinated flight', '釣り合い飛行（ボールが中央）', ''], ['Level off', 'レベルオフ（水平に戻す）', '昇降率の 10% 手前から（目安）'], ['Steep turn', '急旋回', '約 45°（自家用）'], ['Overbanking tendency', 'オーバーバンキング傾向', ''], ['Maneuvering speed (VO / VA)', '運動速度（Archer III の POH は最大運用運動速度 VO）', 'POH 2.3：113 KIAS（2,550 lb）・98 KIAS（1,917 lb）'], ['Slow flight', '低速飛行', ''], ['Critical angle of attack', '臨界迎え角', ''], ['Secondary stall', '二次失速', ''], ['Spin', 'スピン', ''], ['Clearing turn', '見張りのための旋回', ''], ['Ground reference maneuver', '対地目標操作', ''], ['Groundspeed', '対地速度', ''],
      ['Energy management', 'エネルギーの管理', 'AFH 第 4 章'], ['Total energy / Energy distribution', '全体の量 / 配分', 'スロットル / 昇降舵'], ['Heading / Track', '針路 / 航跡', '横風では違う']],
    examples: ['700 fpm で上昇中、3,000 ft にレベルオフ → 約 2,930 ft で機首を下げ始める。', '急旋回で高度が 80 ft 下がった → バンクを 5° 浅くしてから引き、高度が戻ったら 45° に戻す。', '進入で高くて速い → 機首を下げるだけでは速くなる。出力を減らし、フラップ（V<sub>FE</sub> 以下）で抗力を増やして全体の量を減らす。'],
    cautions: ['空中操作の前には、必ず周りを見張ります（clearing turns）。訓練空域には、ほかの訓練機も多くいます。', '失速の練習は、回復を終えても地上 1,500 ft より上が残る高さで行います（自家用 ACS）。'],
    quiz: [
      { q: '500 fpm で降下中。3,000 ft で水平にしたい。出力を戻し始める目安の高度は？', choices: ['3,000 ft ちょうど', '約 3,050 ft', '約 3,500 ft', '約 2,950 ft'], answer: 1, why: 'AFH 第 3 章：昇降率の 10%（50 ft）手前から始める。ちょうどで始めると行き過ぎる。' },
      { q: '自家用 ACS の急旋回（Steep Turns）の許容幅は？', choices: ['高度 ±200 ft・速度 ±20 kt', '高度 ±100 ft・速度 ±10 kt・バンク ±5°・ロールアウト ±10°', '高度 ±50 ft・バンク ±2°', 'バンク 60°・高度 ±100 ft'], answer: 1, why: '自家用はバンク約 45°、事業用は約 50°。どちらも高度 ±100 ft・速度 ±10 kt・バンク ±5°・ロールアウト ±10°（自家用 ACS・事業用 ACS。「旋回と急旋回」の節）。' },
      { q: '失速からの回復で、最初にすることは？', choices: ['フルパワー', '翼を水平にする', '機首を下げて迎え角を減らす', 'フラップを上げる'], answer: 2, why: 'AFH 第 5 章：失速は迎え角の問題。迎え角を減らさなければ、出力を上げても回復しない。' },
      { q: '急旋回の途中で、機首が下がって高度が減り始めた。正しい直し方は？', choices: ['バンクはそのまま強く引く', 'バンクを少し浅くしてから引く', '出力を絞る', 'ラダーで機首を上げる'], answer: 1, why: '深いバンクのまま引くと旋回がきつくなるだけ。バンクを少し浅くしてから引き、高度を戻す（AFH 第 3 章）。' },
      { q: '風の中の 1 点の周りの旋回で、バンクがいちばん深いのは？', choices: ['風上に向かう所', '風下に向かう所', '横風の所', 'どこでも同じ'], answer: 1, why: 'AFH 第 7 章：対地速度がいちばん速い、風下に向かう所でいちばん深い。' },
      { q: '進入中、目標の経路より低く、速度も目標より遅い。エネルギーの見方で、まず使う操作は？', choices: ['スロットルで出力を足す', '昇降舵で機首を上げる', 'フラップを下げる', '何もしないで待つ'], answer: 0, why: '低くて遅いは、全体の量が少ないずれ。まずスロットルで出力を足す。機首を上げるだけでは、速度がさらに落ちる（「エネルギーの管理」の節。AFH 第 4 章）。' },
      { q: 'Archer III で急旋回に入る速度の上限として、POH の値で考えるのは？', choices: ['超過禁止速度 VNE 154 KIAS', 'フラップ下げ最大速度 VFE 102 KIAS', '最大構造巡航速度 VNO 125 KIAS', '最大運用運動速度 VO（2,550 lb で 113 KIAS、軽いほど小さい）'], answer: 3, why: '自家用 ACS は、メーカーが勧める速度か、運動速度を超えない速度で入るとする。Archer III の POH の運動速度は VO で、2,550 lb で 113 KIAS・1,917 lb で 98 KIAS（「旋回と急旋回」の節。POH 2.3）。' },
      { q: '対地目標操作で、経路が目印から外れてしまった。正しい直し方は？', choices: ['低い高さのまま、バンク 60° で急に戻す', '方向舵を強く踏んで機首を回す', 'バンクは 45° までにし、深くなりすぎたら抜けて離れてから入り直す', '高度を下げて目印に近づく'], answer: 2, why: 'AFH 第 7 章：対地目標操作のバンクは 45° まで。深くなりすぎたら、いったん抜けて目印から離れてから入り直す（「対地目標操作」の節）。' },
    ],
    written: [
      ['高度の数字を合わせようと、計器を見続けていました。外の目標と計器をどう組み合わせるかを、見張りも含めて説明してください。', `水平線で姿勢を作り、速度や高度の計器を短く見て、また外へ戻ります。1 か所に目を止めず、見えない所と姿勢の変化を考えて見張りを続けます。数字を直すことだけに集中すると、姿勢の変化やほかの機の接近を見落とします。${bk.see('ops.sl', '直線水平飛行')}`, ['kiso11.q7']],
      ['水平飛行中に機首を上げれば、速度を保ったまま上昇し続けられますか。姿勢と出力の関係から説明してください。', `機首を上げると高さは増えますが、速度を失います。続けられる上昇は、出力・重さ・抗力で決まります。姿勢と出力を組み合わせ、速度と経路の変化を確かめます。ピッチと出力を、速度と高度に 1 対 1 で決めつけません。${bk.see('ops.energy', 'エネルギーの管理')}`, ['kiso11.q8']],
      ['速度が変わり続けている間に、トリムを大きく動かして高度を合わせようとしました。トリムの目的と、正しい使い方を説明してください。', `トリムは、落ち着いた飛び方で、押し続け・引き続けの力を消すためのものです。まず操縦輪で姿勢を作り、出力と速度を整えてから、その状態に合わせます。高度を選ぶ装置ではなく、合わせている間も操縦と監視を続けます。${bk.see('ops.trim', '姿勢＋出力＝性能、そしてトリム')}`, ['kiso11.q9']],
      ['高度が下がり始めたので大きく引き、上がりすぎたので大きく押しました。このくり返しを減らす見方と直し方を説明してください。', `高度だけでなく、姿勢・速度・出力と変化の向きを見ます。小さく直して反応を待ち、元の高度へ戻す段階と、変化を止める段階を分けます。行き過ぎてから反対に大きく動かすと、上下がくり返します。${bk.see('ops.sl', '直線水平飛行')}`, ['kiso11.q10']],
      ['Vx と Vy は、それぞれ何に対して高さを大きく増やす速度ですか。同じ目的に使えない理由も答えてください。', `Vx は進んだ距離に対して、Vy はかかった時間に対して、高さを大きく増やす速度です。障害物を越える目的と、早く高さを取る目的は違います。値と条件は、その機体の資料で確かめます。上昇を続けるときは、エンジンの冷えと前の見え方も考えます。${bk.see('ops.climb', '上昇・降下・レベルオフ')}`, ['kiso11.q11']],
      ['予定より高いまま、着陸の地点に近づきました。機首を大きく下げれば解決しますか。速度・距離・選べる道の関係を説明してください。', `機首を下げると速度が増え、限界を超えたり、不安定な進入になったりします。残りの距離と高さの差を見積もり、速度・出力・経路を合わせて直します。安全に整えられなければ、経路を変えるか着陸復行を選び、無理に着陸しません。${bk.see('ops.energy', 'エネルギーの管理')}`, ['kiso11.q12']],
      ['水平旋回でバンクを深くすると、同じ重さと形態でも失速速度が上がるのはなぜですか。方向舵だけで旋回を強める危険も説明してください。', `揚力が傾くので、重さを支える上向きの分を保つには、より大きな揚力が要り、荷重倍数が増えるからです。方向舵を使いすぎると釣り合いがくずれ、失速したときにスピンに入る危険が増えます。経路を直すために、無理な旋回をしません。${bk.see('ops.turns', '旋回と急旋回')}`, ['kiso11.q13']],
      ['進入中に、高度も速度も多すぎます。高度を下げれば、速度も自然に下がりますか。エネルギーの配分で説明してください。', `下がりません。高さのエネルギーが速さに変わり、かえって速くなります。全体の量を減らすには、出力を減らし、抗力を増やす形態を使います。減速と降下には距離と時間が要るので、安定した進入に戻せなければ着陸復行します。${bk.see('ops.energy', 'エネルギーの管理')}`, ['kiso11.q14']],
      ['速度計がふだんの失速速度より高く、機首が下を向いていれば失速しない、という説明は正しいですか。失速の条件と回復の原理を答えてください。', `正しくありません。失速は迎え角が臨界迎え角を超えると起き、速度や機首の向きだけでは否定できません。荷重倍数が大きいと、失速速度も上がります。回復には迎え角を減らすことが欠かせず、具体的な操作はその機体の手順と操縦教員の訓練に従います。${bk.see('ops.stall', '失速と回復')}`, ['kiso11.q15']],
      ['風の中で同じバンクを保って旋回すると、地面の上の経路も円になりますか。外れた経路を直すときの注意も答えてください。', `なりません。風で対地速度と、地面に対する進む向きが変わるからです。目印との位置関係を見て直しますが、バンク・速度・高度の安全な範囲を守ります。低い高さで急な旋回をして、無理に取り戻しません。${bk.see('ops.ground', '対地目標操作')}`, ['kiso11.q19']],
    ],
    refs: [R.afh, R.afh3, R.afh4, R.afh5, R.afh9, NEW_R.afh7, R.acsP, R.acsC, R.archerCk, R.archerPoh, R.phak, R.cfr91], lessons: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'] });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
