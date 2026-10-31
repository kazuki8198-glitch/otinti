// DRAFT (W29, R3) — Part 3's chapters 'navp'「地図・計画・推測航法」, 'navr'「電波航法と GPS」, 'navd'「目的地変更・迷ったとき」
// and the new chapter 'night'「夜間の飛行」(textbook/rewrite/combined/DESIGN.md 3.3 第 3 部 第 27〜30 章, 4.1 rows 18〜20,
// 4.2 kiso04・kiso06・kiso08・kiso10・kiso11, 7.2 W29). No product reads this file (DESIGN 6.2 rule 5, 7.4). It is a plain
// script like book-4.js: when the chapters are registered, the three B.add(...) of navp・navr・navd replace the ones in
// flight-lab/src/book-4.js in place (same ids, same place), the fourth B.add (the new chapter 'night', before 'ifr': the last
// chapter of Part 3 until g3 comes, DESIGN 3.3 第 30 章) is added after navd, the figures of p3-figs.js go into book-figs.js
// (FIG; sectionalSymbols replaces the function of the same name), and the references in NEW_R go into book-core.js's R
// (then `NEW_R.x` → `R.x`). Check them with the figures:
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p3-figs.js textbook/rewrite/combined/drafts/p3.js
//
// What changed (every existing section id and end-of-chapter question kept, in place and order; new ones after them):
//  navp (4 → 5 sections: ★nav.pnr after nav.log, as DESIGN 3.3 lists it, a deep section)
//  - nav.chart ← kiso08.15: the figure's caption carries the first use 区分航空図（セクショナルチャート、sectional chart）; the
//    symbol table (the figure's key says the same) and the heights / airspace layers / photo ch08-photo1 in folds; judgement
//    「線が引けることと、その線を飛べることは別」(kiso08.15); the two quiz facts (★ after CT, the runway digits) stay read first.
//  - nav.plan: DESIGN「風の原理は navb.wind を 3 行で」— the bold definitions of 偏流修正角・偏差・自差 out (their addresses are
//    navb.wind and navb.north: CONCEPTS C.wind-triangle, C.variation-deviation), a 3-line recall, the four steps, the hand-written
//    Sanford value out (FL.jur sbas draws it in navb.north: STYLE「囲みの数字は手で書きません」).
//  - nav.log ← kiso08.24・kiso06.20: THE ADDRESS of the VFR cruising altitude (answerable-R2 point 5, decided here: Part 3's
//    nav.log, where DESIGN 3.4 puts FL.jur cruise and navb.north already points; the bold <b>巡航高度（cruising altitude）</b> is
//    here once; comm.arrive keeps its one applied sentence for radio4's quiz 5 and should point here: "needs from others");
//    planned and actual times on the log (kiso08.24); the POH 5.5 flight-plan example (climb 9 min / 12 NM / 2 gal, descent
//    10 min / 20 NM / 1.9 gal, cruise 282 NM at 117 kt and 9.5 gal/h) and the descent rule (kiso06.20) in a fold and a drill;
//    the fuel-flow table (teaching values beside the POH's reference values: criterion 6, T.wb-perf.T6) in a fold;
//    91.151 (〔安全〕⑦) read first, unchanged.
//  - ★nav.pnr (deep): 等時点 (AC 120-42B appendix 1's definition) and 最大進出距離 derived from their definitions, figure etpPnr,
//    a drill; 会合 (interception: constant relative bearing, JCAB 例題集 事業用 空中航法 例題 10) linked to hf.vision.
//  - nav.dr ← kiso08.12・08.13・08.14・08.25: lesson n2's text kept; pilotage landmarks and DR vs fix, the ETA / fuel update
//    (B 5 min late, 45 NM at 75 kt → 36 min, 04:01 UTC) in folds; photo ch08-photo2 in the fold.
//  navr (5 → 7 sections: ★nav.adf after nav.dme (deep), ★nav.efb after nav.fpl)
//  - nav.vor ← kiso08.17・08.18: the address (bold) 超短波全方向式無線標識（VOR：…）; the radial/TO-FROM example east of the
//    station and photo ch04-photo4 in a fold; VOR MON・91.171 and reverse sensing in a fold; FLIGHT LAB's own words (no identifier
//    tone in the simulator) moved into the bk.sim box (DESIGN 6.2 rule 10).
//  - nav.dme ← kiso08.19: figure dmeSlant (ch08-fig8-9 redrawn); the simulator's simplified DME into a bk.sim box (n3).
//  - ★nav.adf (deep) ← kiso08.20: NDB and ADF (AIM 1-1-2: 190–535 kHz, no flag → monitor the identifier), homing and tracking
//    (IFH chapter 9), the relative bearing recalled from navb.north; "this book's lessons use no ADF; JCAB asks it".
//  - nav.gps ← kiso08.21・kiso04.20: RAIM prediction (DESIGN 3.3; US AIM 1-1-17), VFR receivers without RAIM alerting (AIM
//    1-1-17), jamming and spoofing, photo ch08-photo6 in a fold; the simulator's 1.0 NM row into the bk.sim box; FL.jur sbas
//    keeps the Japan side (MSAS: ERRATA K.instruments.gap-2 for the combined text).
//  - nav.fpl ← kiso04.19・08.22・08.23: judgement「画面どうしが合っても同じ GPS なら確かめにならない・多数決で決めない」read
//    first; the reading order of a CDI/HSI, the bases of the numbers in folds; the simulator's fields into a bk.sim box (n2).
//  - ★nav.efb ← kiso04.23〜04.26 (the small-airplane part; FMS → jet.fms is W32's): EFB (AC 91-78A), ADS-B In / TIS-B / FIS-B
//    and their limits (AIM 4-5-7〜4-5-9, 7-1-9), FL.jur adsb, Mode A/C/S・TCAS I/II・TAWS in a fold.
//  - nav.ff: kept (the box charts as DESIGN 3.4 places it).
//  navd (3 sections, the same)
//  - nav.xc: FSS（飛行サービス局、Flight Service Station）(it was「飛行情報業務」: STYLE「必ず区別する語」), 野外飛行, the
//    flight plan's form and the assumed departure time in a fold.
//  - nav.divert ← kiso08.26: the CADET-fixed「まず向きを変え」and the real-name sentence (rule 9, content.test.mjs) kept word
//    for word; comparing the options on the same basis (kiso08.26) in a fold.
//  - nav.lost ← kiso08.27 as the entrance (DESIGN 3.3): admit early, the last sure position and time, tell early; the table
//    (R.lost-climb「必要なら上がる」) kept; the 4C/5C note shortened (the quiz still answerable), its variants in a fold.
//  night (new, 2 sections: ★ops.night ← kiso11.26・kiso10.5, ★ops.nightld new) from AFH chapter 11, AIM 2-1, 14 CFR 1.1・61.57(b)・
//    61.87(o)・61.109(a)(2)・91.205(c)・91.209: figures nightLights・nightClimb, FL.jur night, photo ch11-photo7, the night eye
//    recalled from hf.vision (CONCEPTS C.night-vision), the illusions from hf.body, PAPI from ops.landing, the three nights from
//    law.pilot. AFH chapter 11's night engine failure in ops.nightld read first (not folded: emergency).
// Every section has scope 'common' (DESIGN 3.3: 共通, and 日米 for the boxes); US rules are in sentences that name the country;
// no {ch:} or bk.see to a later part. End-of-chapter questions: the existing ones in place (reasons given a source where they
// had none), new ones after them with the answers at A, C, D (to spread the positions). Written questions rewritten from the
// basic course's qa (kiso08.q12〜q15・q17〜q28, kiso04.q19・q20・q23・q25, kiso06.q20, kiso11.q26) with the known error fixed
// (kiso08.q25's「法定予備燃料」: ERRATA K.wb-perf.K4 — the US reserve of 91.151, no legal amount for Japan's private VFR).
// Every claim (number, unit, rule) is in p3.claims.json with its tag and source.
(function (FL) {
  'use strict';
  const B = FL.book, R = B.R, bk = B.bk, FIG = FL.bookFigs;
  const AR = FL.physics.AIRCRAFT.find(a => a.id === 'pa28').v, DEG = Math.PI / 180;
  // new references (to be added to book-core.js's R when the chapters are registered; each URL opened on 2026-10-31)
  const NEW_R = {
    afh11: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 11 章 Night Operations（夜の目と錯覚・持ち物・空港の灯火・夜の離着陸・夜の緊急）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/12_afh_ch11.pdf' },
    ac9178a: { label: 'FAA AC 91-78A Use of Electronic Flight Bags（2024-02-23。Part 91 の運航で紙の代わりに EFB を使う条件）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_91-78A.pdf' },
    ac12042b: { label: 'FAA AC 120-42B Extended Operations（ETOPS and Polar Operations）（2008。付録 1 の定義：Equal-Time Point）', url: 'https://www.faa.gov/documentlibrary/media/advisory_circular/120-42b.pdf' },
  };
  // the worked numbers the text and the figures share (p3-figs.js computes the same)
  const NM_FT = 6076.12, dme = (hFt, nm) => Math.sqrt(nm * nm + (hFt / NM_FT) ** 2);
  const etp = (D, go, gh) => D * gh / (go + gh), pnrT = (E, go, gh) => E * gh / (go + gh);
  const f1 = n => n.toFixed(1);

  // ======================================================================= 第 3 部 第 27 章
  B.add({ id: 'navp', part: 'p3', t: '地図・飛行計画・推測航法', en: 'Charts, flight planning and dead reckoning',
    summary: '区分航空図の読み方、真航路からコンパス針路までの手順、航法の記録（ナビゲーションログ）・巡航高度・燃料、地文航法と推測航法。最大進出距離と等時点は発展。公開情報の「地図に線を引き、上空の風から針路を計算して飛ぶ」訓練の中身。',
    secs: [
      { id: 'nav.chart', t: '区分航空図（VFR の航空図）', scope: 'common', from: ['kiso08.15'], faa: ['PA.I.E.K2', 'PA.II.D.K1', 'PA.VI.A.K3'], jcab: ['ppl.3.1.1.9', 'cpl.3.1.1.9'], h: () => `
${bk.aim('有視界飛行で使う地図「区分航空図（セクショナルチャート、sectional chart）」の記号を読めるようにします。引いた線の下の地形と空域も確かめます。飛行計画（flight plan）は、ここから始まります。')}
${FIG.sectionalSymbols()}
<p>米国の有視界飛行（VFR）で使う地図が、区分航空図です。縮尺は 1：500,000（1 インチ ≒ 6.86 NM ≒ 8 SM）です。地形・空港・電波施設・空域が描かれています（PHAK 第 16 章）。VFR の航空図は <b>56 日ごとに改訂</b>されるので、古い版は使いません（FAA Chart Users' Guide）。区画の大きな数字（MEF）は、その区画のいちばん高い所の目安です。</p>
<p>空域の種類と入る条件は ${bk.see('law.airspace', '空域')}、制限空域などは ${bk.see('law.special', '特別な空域')} にあります。空港のくわしい情報は <b>Chart Supplement</b> で確かめます。</p>
${bk.deep('記号の一覧と、縮尺・距離の単位（FAA Chart Users\' Guide）', `<p>管制塔の周波数の後の ★ は、管制塔の運用の時間が限られていることです。空港の記号の上の ★ は、回転灯台です。空港の情報の 3 つめの数は、最長の滑走路の長さ（百 ft 単位）です（FAA Chart Users' Guide）。</p><p>Class B 空域のまわりには、縮尺 1：250,000 のくわしい TAC（Terminal Area Chart）もあります。距離は海里（NM：nautical mile）で測ります。視程の規則は法定マイル（SM：statute mile）で書かれているので、2 つを混ぜません。</p>` + bk.t(['記号（図の番号）', '意味'], [
  ['① 空港の色', '青は管制塔のある空港、マゼンタはそれ以外。上に ★ が付く空港は、回転灯台（beacon）がある'],
  ['② CT – 118.3', '管制塔（CT）の周波数。CT の周波数の後に ★ があると、管制塔の運用は時間を限ったもの（時間はチャートの余白の管制塔の表や Chart Supplement で確かめる）'],
  ['③ 55 L 39 122.95', '標高（ft）・L は夜の滑走路灯（日没から日の出まで）・最長の滑走路の長さ（百 ft 単位。3,940 ft → 39）・UNICOM の周波数'],
  ['④ 空域の線と数字', 'Class B は青の実線、Class C はマゼンタの実線、Class D は青の破線、地表からの Class E はマゼンタの破線。数字は上限と下限（百 ft・MSL）'],
  ['⑤ 障害物', '太い数字が海面からの高さ、かっこの数字が地面からの高さ（ft）'],
  ['⑥ MEF（Maximum Elevation Figure）', 'その区画でいちばん高い地形・障害物に、誤差の分（いちばん高いものが地形や木なら、さらに図にない障害物の分 200 ft）を足して、百 ft に切り上げた高さ。区画は、緯度（latitude）と経度（longitude）の 30′ ごと。2⁵ ＝ 2,500 ft MSL'],
  ['⑦ VOR のコンパスローズ', '0° が磁北を向いた目盛り（真北から偏差の分だけ傾いている）。四角の中に名前・周波数・識別符号'],
  ['⑧ 等偏差線（isogonic line）', '真北と磁北の差（偏差）が同じ所を結ぶマゼンタの破線']]))}
${bk.deep('線の下と周りを読む：高さの基準と、空域の層', `<p>経路の線を引いたら、線の真下だけでなく、風で流される幅や、変更して通るかもしれない所まで見ます。山の高さ・谷の向き・海岸・障害物を調べ、予定の高度と比べます。</p>
<p>高さの数は、基準をそろえて比べます。地形の標高と障害物のてっぺんの高さは、平均海面（MSL：mean sea level）からの高さです。かっこの数は地面から（AGL）です。一般の地図の色の感じで読まず、その図の凡例で確かめます（FAA Chart Users' Guide）。</p>
<p>空域は、地図の上の輪だけでなく、下限と上限を持つ立体です。輪の内側でも、予定の高度がどの層に入るかで、要る交信と許可が変わります。印刷のあとの変更と一時的な制限は、ノータム（NOTAM）で重ねて確かめます。</p>
${bk.photo('ch08-photo1')}`)}
${bk.judge('線が引けることと、その線を飛べることは別です。線の下の地形と障害物、空域の下限と上限、その日のノータムを確かめてから、経路と高度を決めます。')}
${bk.key('チャート・Chart Supplement・ノータムの 3 つで計画する', 'VFR のチャートは 56 日ごとに改訂。古い版は使わない', 'この教材の地図・訓練点・LAB VOR は架空（NOT FOR NAVIGATION）')}
${bk.jur('charts')}
${bk.q('チャートの空港の横に「CT – 118.3 ★」と書いてある。★ は何を表す？', '管制塔の運用が時間を限ったもの（part-time）であることです。時間は Chart Supplement などで確かめます（FAA Chart Users\' Guide）。閉まっている時間は、管制塔のない空港と同じように CTAF で交信します（米国の AIM 4-1-9）。')}` },
      { id: 'nav.plan', t: '針路の計算：真航路 → 磁針路 → コンパス針路', scope: 'common', faa: ['PA.VI.A.K5', 'PA.I.D.K1'], jcab: ['ppl.3.1.2.1', 'cpl.3.1.2.1', 'ppl.3.1.2.2', 'cpl.3.1.2.2'], h: () => `
${bk.aim('地図に引いた線から、実際に飛ぶ針路（ヘディング、heading）を出す手順を、1 つの流れにまとめます。コンパスで合わせる向きまで直します。')}
${FIG.windTriangle()}
<h4>計算の順番</h4>
<ol><li>真航路：地図に出発地と目的地を結ぶ線を引き、真北からの角度をプロッター（分度器）で測ります。</li>
<li>偏流修正角：上空の風の予報から求め、機首を風上へ向けます。予報の風向は、真北から測った真方位（true direction）です。</li>
<li>偏差：等偏差線で読み、真針路を磁針路にします。</li>
<li>自差：コンパスの近くの自差表（自差カード、compass deviation card）を読みます。これでコンパス針路が出ます（PHAK 第 16 章）。</li></ol>
<p>この教材の LAB 空域の偏差は、教材値で ${FL.physics.MAGVAR_W}°W です。真航路に偏差だけを足し引きしたものが磁航路です。巡航高度の決まり（${bk.see('nav.log', 'ログと巡航高度')}）で使います。</p>
${bk.calc('wca')}
${bk.deep('計算機に入れる真対気速度（教材値）', `<p>この教材の Archer の巡航は、${AR.cruise} kt の指示対気速度（indicated airspeed）です。計算機の真対気速度（TAS）は、3,000 ft で約 ${Math.round(AR.cruise / Math.sqrt(FL.physics.atmos(3000 / FL.physics.FT).sigma))} kt です。課目 n2 は 105 kt の指示対気速度（3,000 ft で真対気速度 約 ${Math.round(105 / Math.sqrt(FL.physics.atmos(3000 / FL.physics.FT).sigma))} kt）で飛びます。</p>`)}
${bk.key('真 → 磁 → コンパス。足し引きの向きを毎回確かめる', '風上へ機首を向ける。偏流修正角の足し引きは図で確かめる', '偏差の足し引きを逆にすると、偏差の 2 倍ずれる（7°W なら 14°）')}
${bk.recall('航路・針路・航跡（トラック、track）の違いと、機首を風上へ向ける修正は第 1 部で学びました。偏差と自差は、W は足し、E は引きます。', ['navb.wind', '航路・針路・航跡と風'], ['navb.north', '真北・磁北・コンパスの北'])}
${bk.q('真針路 095°、偏差 7°W、自差 1°E。コンパス針路は？', '磁針路は 095 ＋ 7 ＝ 102° です（西偏は足す：West is best）。自差の 1°E は引くので、コンパス針路は 101° です。')}` },
      { id: 'nav.log', t: 'ナビゲーションログ・巡航高度・燃料', scope: 'common', from: ['kiso08.24', 'kiso06.20'], faa: ['PA.I.D.K2', 'PA.I.D.K3', 'PA.VI.A.K4', 'PA.VI.A.K6', 'PA.VI.A.K7', 'IR.I.C.K3'], jcab: ['ppl.3.1.3.3', 'cpl.3.1.3.3', 'ir.1.1.2.2', 'ir.5.2'], h: () => {
        const W = FL.avionics.WAYPOINTS, g = id => W.find(w => w.id === id), V = FL.physics.MAGVAR_W;
        const leg = (a, b) => { const A = g(a), B2 = g(b), dn = B2.n - A.n, de = B2.e - A.e; return { nm: Math.hypot(dn, de) / 1852, mc: ((Math.atan2(de, dn) / DEG + V) % 360 + 360) % 360 }; };
        // lesson n2 flies 105 KIAS; at 3,000 ft that is the true airspeed below, which is the groundspeed in still air. 10.8 gal/h is the
        // flight model's fuel flow at 105 KIAS and 3,000 ft (physics.js fuelFlow, measured in level flight)
        const gs = Math.round(105 / Math.sqrt(FL.physics.atmos(3000 / FL.physics.FT).sigma)), ff = 10.8, legs = [['LAB RWY → LAB-A', leg('LABRW', 'LABEA')], ['LAB-A → LAB-B', leg('LABEA', 'LABEB')]];
        return `
${bk.aim('飛行の前に、区間ごとの針路・距離・時間・燃料を、1 枚の表にまとめられるようにします。')}
<p><b>ナビゲーションログ（navigation log）</b>は、区間ごとの磁航路・距離・対地速度・所要時間（ETE）・燃料の表です。区間は、10 NM 前後ごとのはっきりした目印（<b>チェックポイント</b>）で区切ります。予定と実際の通過時刻を書く欄も作ります（PHAK 第 16 章）。</p>
${bk.t(['区間（課目 n2 の飛行計画・架空）', '磁航路', '距離', '対地速度', 'ETE', '燃料'], legs.map(([n, l]) => [n, `${String(Math.round(l.mc)).padStart(3, '0')}°`, `${l.nm.toFixed(1)} NM`, `${gs} kt`, `${(l.nm / gs * 60).toFixed(1)} 分`, `${(l.nm / gs * ff).toFixed(1)} gal`]))}
<p>この表は、無風（対地速度＝真対気速度 約 ${gs} kt）・燃料 ${ff} gal/h（教材値）で計算したものです。実際には、風で対地速度が変わり、上昇とタキシーの燃料も足します。</p>
<h4>米国の VFR の巡航高度（14 CFR 91.159）</h4>
<p><b>巡航高度（cruising altitude）</b>は、水平に飛ぶときに保つ高度です。米国では、VFR で水平に巡航する高度が決まっています。地上 3,000 ft より上・18,000 ft MSL 未満のときです。ATC の別の指示がなければ、<b>磁航路</b>で MSL の高度を選びます。<b>0〜179° は奇数千 ft ＋500</b>（3,500・5,500 ft MSL など）です。<b>180〜359° は偶数千 ft ＋500</b>（4,500・6,500 ft MSL など）です。上のログの 2 区間は東向きです。高度は、空域・雲からの距離（米国の 91.155）・地形と障害物（MEF）も考えて選びます。</p>
<h4>燃料</h4>
<p>米国の規則では、VFR の燃料は、<b>最初の着陸予定地</b>まで飛べる量に、<b>昼は 30 分、夜は 45 分</b>の分を足した量です（14 CFR 91.151(a)）。最初の着陸予定地は、規則の英語の first point of intended landing です。足す分は、ふつうの巡航速度で飛ぶ時間です。途中で降りる計画なら、その最初の着陸の地点までで計算します。風と予報の天気も考えます（${bk.see('law.rules', '規則')}）。</p>
${bk.calc('fuel')}
${bk.deep('燃料流量の教材値と参考値・出発前に知っておくこと', `<p>燃料消費率（燃料流量、fuel consumption rate）は、出力と混合比（ミクスチャー、mixture）で変わります。下の表は、この節の教材値と POH（操縦士用の機体の手引書、pilot's operating handbook）の参考値です。計算機の燃料消費は、自分の機体の値（POH の出力設定表）に変えて使います。出発前に知っておくことは、米国の 14 CFR 91.103 にあります。飛行場の近くを離れる飛行では、天気・燃料・代わりの方法・ATC から知らされた交通の遅れです。</p>` + bk.t(['燃料流量', '条件', '値'], [
  ['教材値（フライトモデル）', '3,000 ft・105 kt の指示対気速度（課目 n2・上のログ）', `${ff} gal/h`],
  ['教材値（フライトモデル）', `3,000 ft・巡航 ${AR.cruise} kt の指示対気速度`, '約 11.5 gal/h'],
  ['参考値（Archer III の POH 第 5 章）', '出力 55%・経済の混合比（best economy）', '8.2 gal/h'],
  ['参考値（Archer III の POH 第 5 章）', '出力 65%・経済の混合比（best economy）', '9.5 gal/h'],
  ['参考値（Archer III の POH 第 5 章）', '出力 75%・最大出力の混合比（best power）', '11.0 gal/h']]))}
${bk.deep('上昇と降下の時間・燃料・距離（POH の計画の例）', `<p>巡航の区間は、上昇と降下の分を引いて求めます。上昇を終える点を TOC（top of climb）、降下を始める点を TOD（top of descent）と呼びます。Archer III の POH は、上昇と降下のそれぞれに、時間・距離・燃料の図表を持っています（POH 5.5）。</p>
${bk.t(['POH 5.5 の計画の例（無風）', '時間', '距離', '燃料'], [['上昇（6,000 ft まで）', '9 分', '12 NM', '2 gal'], ['降下', '10 分', '20 NM', '1.9 gal'], ['巡航（出力 65%・117 kt・9.5 gal/h）', '2.4 時間', '282 NM', '22.8 gal'], ['合計', '2.7 時間', '314 NM', '26.7 gal']])}
<p>全体の 314 NM から上昇の 12 NM と降下の 20 NM を引いた 282 NM が、巡航の距離です（POH 5.5）。この例の合計は、上昇・巡航・降下の 3 つだけです。地上の燃料と予備の燃料は、別に足します。</p>
${bk.drill('降下を始める点（一定の降下率で）', '<p>3,000 ft を毎分 500 ft で降ります。対地速度が 120 kt のときと 90 kt のときの、降下の時間と、地面の上を進む距離を求めてください。</p>', '<p>時間はどちらも 3,000 ÷ 500 ＝ 6 分です。120 kt は毎分 2 NM なので 12 NM、90 kt は毎分 1.5 NM なので 9 NM 手前から降り始めます。減速・水平の区間・風の変化・地形と高度の制限は、別に考えます。</p>')}`)}
${bk.key('ログは区間ごとに：磁航路・距離・対地速度・時間・燃料', '米国の VFR の巡航高度は磁航路で決める（東は奇数＋500、西は偶数＋500）', '米国の VFR の燃料：最初の着陸予定地＋昼 30 分・夜 45 分。上昇とタキシーの分も足す')}
${bk.jur('cruise', 'fuel.vfr')}
${bk.q('米国で、磁航路 210°・地上 3,000 ft より上を VFR で巡航する。正しい高度は？', '偶数千 ft ＋500 の 4,500 ft や 6,500 ft です（米国の 14 CFR 91.159）。')}`;
      } },
      { id: 'nav.pnr', t: '最大進出距離と等時点（発展）', scope: 'common', deep: true, jcab: ['cpl.3.1.2.6', 'ppl.3.1.2.6'], h: () => {
        const D = 200, go = 80, gh = 120, E = 3.0, e1 = etp(D, go, gh), t1 = pnrT(E, go, gh);
        const D2 = 150, go2 = 75, gh2 = 125, E2 = 2.4, e2 = etp(D2, go2, gh2), t2 = pnrT(E2, go2, gh2);
        return `
${bk.aim('風があるときに「どこまでなら戻れるか」「どこで戻るのと進むのが同じ時間になるか」を計算できるようにします。JCAB の学科（空中航法）で問われる計算です。')}
${FIG.etpPnr()}
<p><b>等時点（equal-time point、ETP）</b>は、経路の上で、2 つの空港までの飛行時間（風を考えた時間）が等しくなる点です（FAA AC 120-42B 付録 1）。ここでは、出発地 A と目的地 B の 2 つで考えます。</p>
<p>A から等時点までの距離を d、全体を D とします。等時点から A へ戻る時間（帰りの対地速度 GS<sub>帰</sub>）と、B へ進む時間（往きの対地速度 GS<sub>往</sub>）が等しいので、d ÷ GS<sub>帰</sub> ＝（D − d）÷ GS<sub>往</sub> です。これを解くと、次の式になります。</p>
${bk.f('d ＝ D × GS<sub>帰</sub> ÷（GS<sub>往</sub> ＋ GS<sub>帰</sub>）')}
<p>無風なら等時点は真ん中です。往きが向かい風なら、帰りが速くなるので、等時点は目的地の側へずれます。図の例は ${D} NM・往き ${go} kt・帰り ${gh} kt で、${e1} NM です。</p>
<p><b>最大進出距離</b>は、燃料で飛べる時間（予備を除く）のうちに出発地へ戻れる、いちばん遠い所までの距離です（JCAB の出題範囲の言い方）。そこまで進む時間を t、飛べる時間を E とすると、t × GS<sub>往</sub> ＝（E − t）× GS<sub>帰</sub> です。</p>
${bk.f('t ＝ E × GS<sub>帰</sub> ÷（GS<sub>往</sub> ＋ GS<sub>帰</sub>）　距離 ＝ t × GS<sub>往</sub>')}
<p>図の例（飛べる時間 ${f1(E)} 時間）では、t ＝ ${f1(t1)} 時間、距離は ${t1 * go} NM です。予備の燃料は、E に入れずに残します。</p>
<h4>会合と、相対方位が変わらないこと</h4>
<p>2 機が同時に動き始め、途中で針路も速度も変えずに進むとします。相手の相対方位がずっと同じなら、2 機は同じ点に着きます（会合）。JCAB の例題も、相対方位を一定に保つこと・途中で変針や変速をしないことを、会合の原則に挙げています（事業用 空中航法 例題 10）。</p>
${bk.drill('等時点と最大進出距離', `<p>${D2} NM の区間を、真対気速度 100 kt で飛びます。往きは向かい風 25 kt（往き ${go2} kt・帰り ${gh2} kt）です。予備を除いて飛べる時間は ${f1(E2)} 時間です。等時点と最大進出距離を求めてください。</p>`, `<p>等時点は ${D2} × ${gh2} ÷（${go2} ＋ ${gh2}）＝ ${e2.toFixed(2)} NM（A から）です。最大進出距離までの時間は ${f1(E2)} × ${gh2} ÷ 200 ＝ ${f1(t2)} 時間、距離は ${f1(t2)} × ${go2} ＝ ${(t2 * go2).toFixed(1)} NM です。帰りは ${(t2 * go2).toFixed(1)} ÷ ${gh2} ＝ ${((t2 * go2) / gh2).toFixed(1)} 時間で、合わせて ${f1(E2)} 時間になります。</p>`)}
${bk.key('等時点：D × 帰りの GS ÷（往きの GS ＋ 帰りの GS）', '最大進出距離：予備を除いた飛べる時間で、往復できる所まで', '往きが向かい風なら、等時点は目的地の側へずれる')}
${bk.recall('見張り（see and avoid）の「止まって見えて大きくなる機は衝突のコース」は、会合と同じ理屈です。', ['hf.vision', '見張りと夜の目'])}
${bk.q(`無風で、${D} NM の区間の等時点はどこ？`, `真ん中の ${D / 2} NM です。往きと帰りの対地速度が同じなので、式の GS<sub>帰</sub> ÷（GS<sub>往</sub> ＋ GS<sub>帰</sub>）が 1/2 になります。`)}`;
      } },
      { id: 'nav.dr', t: '地文航法と推測航法', scope: 'common', from: ['kiso08.12', 'kiso08.13', 'kiso08.14', 'kiso08.25'], faa: ['PA.VI.A.K1', 'PA.VI.A.K3', 'PA.VI.A.K7'], jcab: ['ppl.3.1.1.1', 'cpl.3.1.1.1', 'ppl.3.1.3.1', 'cpl.3.1.3.1', 'ppl.3.1.3.2', 'cpl.3.1.3.2', 'ppl.3.1.3.3', 'cpl.3.1.3.3'], h: () => `
${bk.aim('地図と景色で進む方法と、針路・速度・時間で位置を計算する方法を組み合わせて、目的地まで飛べるようにします。')}
<p>地文航法（pilotage）は、地図の目印と外の景色を比べて進む方法です。推測航法（dead reckoning）は、時間・対気速度・距離・方向の計算だけで位置を求める方法です（PHAK 第 16 章）。実際は両方を組み合わせます：計算した針路と時間で飛び、チェックポイントで本当の位置を確かめて直します。</p>
<ol><li>出発点の上空で針路に乗り、<b>時刻を記録</b>します（“time off”）。</li>
<li>計算した磁針路と高度を正確に保ちます（ずれは推測航法の誤差になります）。</li>
<li>チェックポイントの<b>予定の時刻</b>に、地図と外を比べます。早いか遅いなら、対地速度を直します。左右にずれたら、風の見積もりを直します（下の「60 の法則」）。</li>
<li>次のチェックポイントの予定の時刻を書き直します。迷ったら、針路を保ったまま次の目印を探します（向きを変えると、もっと迷いやすい。PHAK 第 16 章）。</li></ol>
${bk.deep('目印の選び方と、推測の位置と確かめた位置', `<p>目印は、大きく見えるだけでなく、まわりとの組み合わせでほかの場所と区別できるものを選びます。「川を越え、その先で道路と鉄道が交わる」のように、並ぶ順番で予想しておくと、似た形の取り違えが減ります。川や海岸線のような長い線は、どちら側にいるかは教えますが、線のどこにいるかまでは決めません。</p>
${bk.photo('ch08-photo2')}
<p>推測航法で出した位置は、最後に確かめた位置と時刻からの予想です。距離 ＝ 対地速度 × 経過時間（分）÷ 60 で、90 kt で 20 分なら 30 NM です。予想の位置と、目印で確かめた位置は、記録の上でも分けて書きます。確かめた位置ができたら、そこを次の予想の出発点にします。</p>
<p>自家用 ACS の Pilotage and Dead Reckoning では、計画した航路から 3 NM 以内で位置を確かめます。チェックポイントには予定の時刻の ±5 分で着き、高度 ±200 ft・針路 ±15° を保ちます。</p>`)}
${bk.drill('到着の予定を直す（時刻と燃料）', '<p>A → B → C の計画で、B を予定より 5 分遅い 03:25 UTC に通りました。B から C までは 45 NM で、新しく見積もった対地速度は 75 kt、燃料流量は 30 L/h です。C の新しい到着の予定と、この区間の燃料を求めてください。</p>', '<p>45 ÷ 75 × 60 ＝ 36 分なので、到着は 03:25 ＋ 36 分 ＝ 04:01 UTC です。燃料は 30 × 36 ÷ 60 ＝ 18 L です。前の予定に 5 分を足すだけでは、次の区間の遅れが入りません。到着の時刻が変わったら、着く空港の天気も読み直します。</p>')}
<h3>60 の法則</h3>
<p>60 NM 進んで 1 NM ずれると、角度はおよそ 1° です（三角関数の近似の目安）。<b>外れた角度 ≒ 60 × 外れた距離 ÷ 飛んだ距離</b> です。平行に戻すにはその角度だけ直し、目的地へ向けるには、さらに <b>60 × 外れた距離 ÷ 残りの距離</b> を足します。</p>
${bk.calc('rule60')}
<p>飛行中の目的地変更（diversion）は ${bk.see('nav.divert', '目的地変更')} で学びます。</p>
${bk.key('計算した針路と時間で飛び、チェックポイントで直す', '60 の法則：外れた角度 ≒ 60 × 外れた距離 ÷ 飛んだ距離', 'GPS があっても推測航法を続ける（GPS が止まったときの位置の見積もりになる）')}
${bk.q('20 NM 飛んで、航路から右へ 2 NM ずれていた。残りは 40 NM。目的地へまっすぐ向けるには、何度左へ直す？', '外れた角度は 60 × 2 ÷ 20 ＝ 6° です。目的地へ向けるには、さらに 60 × 2 ÷ 40 ＝ 3° を足して、合計 9° 左へ直します。')}
${bk.sim('針路と時間で飛び、途中で目的地を変えます。', ['n2', '推測航法と目的地変更'])}` },
    ],
    terms: [['Sectional chart', '区分航空図', 'セクショナルチャート。1:500,000・56 日ごとに改訂'], ['Terminal Area Chart (TAC)', 'ターミナル・エリア・チャート', '1:250,000'], ['Chart Supplement', '空港のくわしい情報', '旧 A/FD'], ['Maximum Elevation Figure (MEF)', '区画の最大標高', '百 ft 単位'], ['Nautical mile (NM) / Statute mile (SM)', '海里・法定マイル', '1 NM ≒ 1.15 SM'], ['True course / Magnetic course', '真航路・磁航路', ''], ['True / Magnetic / Compass heading', '真針路・磁針路・コンパス針路', ''], ['Variation / Deviation', '偏差・自差', '自差カード'], ['Isogonic line', '等偏差線', ''], ['Wind correction angle (WCA)', '偏流修正角', ''], ['Groundspeed (GS)', '対地速度', ''], ['ETE / ETA', '所要時間・到達予定時刻', 'ETA の通称は到着予定時刻'], ['Checkpoint', 'チェックポイント', ''], ['Pilotage / Dead reckoning', '地文航法・推測航法', ''], ['Navigation log', 'ナビゲーションログ', ''], ['VFR cruising altitude', 'VFR の巡航高度', '91.159'], ['Top of climb (TOC) / Top of descent (TOD)', '上昇を終える点・降下を始める点', 'POH 5.5'], ['Equal-time point (ETP)', '等時点', 'AC 120-42B'], ['Fuel consumption rate', '燃料消費率', '通称は燃料流量']],
    examples: ['TC 090°・風 030°/15 kt・TAS 105 kt → WCA 左へ約 7°・TH 083°・西偏 6° → MH 089°。', '20 NM 地点で予定より 1 分遅い → 対地速度が予想より遅い（向かい風が強い）→ 以降の到着時刻と燃料を直す。', 'POH 5.5 の計画の例：314 NM のうち、上昇 12 NM・降下 20 NM を引いた 282 NM を 117 kt で巡航する（2.4 時間・22.8 gal）。'],
    cautions: ['この教材の地図・訓練点・数値は架空（NOT FOR NAVIGATION）。実際の飛行は、最新の航空図と公式の情報で。', '偏差の値は場所と年で変わる。この教材の 6°W は教材の値。', '最大進出距離の計算に、予備の燃料を入れない。'],
    quiz: [
      { q: '真針路 095°、偏差 7°W。磁針路は？', choices: ['088°', '095°', '102°', '275°'], answer: 2, why: '西偏は足す（West is best）：095 ＋ 7 ＝ 102°（{ch:navb}「真北・磁北・コンパスの北」の節）。' },
      { q: '米国の 14 CFR 91.159：地上 3,000 ft より上、磁航路 210° の VFR の巡航高度として正しいのは？', choices: ['5,500 ft', '4,500 ft', '5,000 ft', '4,000 ft'], answer: 1, why: '180〜359° は偶数千 ft ＋500 ft。0〜179° なら奇数千＋500（米国の 14 CFR 91.159・本文「ナビゲーションログ・巡航高度・燃料」の節）。' },
      { q: '30 NM 飛んで、航路から 3 NM 右にずれていた。平行に戻すには何度左へ直す？（60 の法則）', choices: ['3°', '6°', '10°', '30°'], answer: 1, why: '60 × 3 ÷ 30 ＝ 6°。目的地へ向けるには、残りの距離の分をさらに足す（本文「地文航法と推測航法」の節）。' },
      { q: 'セクショナルチャートの空港の情報「CT – 118.3 ★」の ★ は？', choices: ['回転灯台がある', '管制塔の運用が時間を限ったもの', '燃料が買える', '夜の滑走路灯がある'], answer: 1, why: 'FAA Chart Users\' Guide：CT の周波数の後の ★ は part-time の運用。回転灯台は空港の記号の上の ★（本文「区分航空図」の節の図）。' },
      { q: '空港の情報「55 L 39 122.95」の「39」は？', choices: ['標高 39 ft', '最長の滑走路が約 3,900 ft', '滑走路の番号 39', 'UNICOM の周波数'], answer: 1, why: '最長の滑走路の長さを百 ft 単位で書く（下 2 桁が 70 以上なら切り上げ。3,940 ft → 39）。55 は標高、L は夜の滑走路灯、122.95 は UNICOM（FAA Chart Users\' Guide）。' },
      // W29（R3）：後ろに足すだけ（正解は A・C・D に散らす）
      { q: '全体 314 NM の計画で、上昇に 12 NM、降下に 20 NM かかる。巡航の距離は？（POH 5.5 の例）', choices: ['282 NM', '302 NM', '294 NM', '314 NM'], answer: 0, why: '314 − 12 − 20 ＝ 282 NM（Archer III の POH 5.5。本文「ナビゲーションログ・巡航高度・燃料」の節の折りたたみ）。' },
      { q: '無風なら、出発地と目的地の間の等時点はどこにある？', choices: ['出発地のすぐ近く', '目的地のすぐ近く', '区間の真ん中', '最大進出距離と同じ所'], answer: 2, why: '往きと帰りの対地速度が同じなら、d ＝ D × GS帰 ÷（GS往 ＋ GS帰）＝ D ÷ 2（{ch:navp}「最大進出距離と等時点」の節・AC 120-42B の定義）。' },
      { q: '経路の線の下の地形と空域を確かめるとき、正しいものは？', choices: ['線の真下だけ見ればよい', '障害物のかっこの数は海面からの高さ', '空域は地図の上の輪だけで決まる', '空域は下限と上限のある立体で、予定の高度がどの層に入るかを見る'], answer: 3, why: '空域は立体。障害物のかっこの数は地面からの高さ。風で流される幅や変更して通る所まで見る（本文「区分航空図」の節・FAA Chart Users\' Guide）。' },
    ],
    written: [
      ['航空図にある橋と似た橋を 1 つ見つけた。その橋だけで、いまの位置を決めてよいか。目印の選び方と、取り違えを減らす確かめ方を説明しなさい。', `決めません。似た橋はほかにもあります。川の曲がり方・道路や鉄道との交わり・まわりの町や地形を組み合わせ、予定の時刻と進む向きとも比べます（${bk.see('nav.dr', '地文航法と推測航法')}）。`, ['kiso08.q12']],
      ['確かめた地点を 03:00 UTC に通り、対地速度 90 kt で同じ向きに 20 分進んだ。進んだ距離はいくつか。その位置を「確かめた位置」として扱ってよいか。', `90 × 20 ÷ 60 ＝ 30 NM で、時刻は 03:20 UTC です。向きと速さが一定という前提の予想の位置なので、目印や電波航法で確かめてから、次の予想の出発点にします（${bk.see('nav.dr', '地文航法と推測航法')}）。`, ['kiso08.q13']],
      ['30 NM 進んで、予定の線から右へ 2 NM ずれた。60 の法則で外れた角度はいくつか。その角度だけ左へ直せば、すぐに予定の線へ戻るか。', `60 × 2 ÷ 30 ＝ 約 4° です。4° 直すだけでは予定の線と平行になるだけで、右へ 2 NM ずれたままです。残り 30 NM で戻るなら、さらに約 4° を足して、合計で左へ約 8° が目安です（${bk.see('nav.dr', '地文航法と推測航法')}）。`, ['kiso08.q14']],
      ['航空図で、目的地までまっすぐな線を引いた。その線の通る所を、そのまま飛べると決めてよいか。確かめることを挙げなさい。', `決めません。線の下と周りの地形・障害物の高さ（MSL か AGL か）、空域の下限と上限と入る条件、その日の天気とノータムを確かめます（${bk.see('nav.chart', '区分航空図')}）。`, ['kiso08.q15']],
      ['3,000 ft を毎分 500 ft で降りる。対地速度 120 kt と 90 kt のときの、降下の時間と地面の上の距離を求め、ほかに確かめることを挙げなさい。', `時間はどちらも 6 分、距離は 120 kt で 12 NM、90 kt で 9 NM です。一定の降下率と対地速度という前提なので、減速や水平の区間・風の変化・高度計の規正・地形と高度の制限は別に確かめます（${bk.see('nav.log', 'ナビゲーションログ・巡航高度・燃料')}）。`, ['kiso06.q20']],
      ['A → B が 30 NM、B → C が 45 NM で、どちらも対地速度 90 kt・燃料流量 30 L/h とする。A を 03:00 UTC に通ったとき、B と C の予定の時刻と、2 つの区間の燃料の合計は？', `A → B は 20 分・10 L、B → C は 30 分・15 L です。B は 03:20 UTC、C は 03:50 UTC で、合計 75 NM・50 分・25 L です。25 L は 2 区間だけの量で、積む燃料の全部ではありません（${bk.see('nav.log', 'ナビゲーションログ・巡航高度・燃料')}）。`, ['kiso08.q24']],
      ['B を 03:25 UTC に通った。C まで 45 NM、対地速度 75 kt、燃料流量 30 L/h、使える残りの燃料は 50 L とする。C の新しい到着の予定と残りの燃料を求め、安全と言い切れるかを説明しなさい。', `45 ÷ 75 × 60 ＝ 36 分で 18 L を使い、到着は 04:01 UTC、残りは 32 L です。言い切れません。予備の燃料（米国の VFR なら 14 CFR 91.151 の昼 30 分・夜 45 分）、代わりの空港まで、地上の分は別に考えます（${bk.see('nav.dr', '地文航法と推測航法')}）。`, ['kiso08.q25']],
    ],
    refs: [R.phak, R.phak16, R.vfr, R.chartUG, R.cfr91, R.mag, R.acsP, R.archerPoh, NEW_R.ac12042b, R.reiCPL, R.mlitSyllabus], lessons: ['n2'] });

  // ======================================================================= 第 3 部 第 28 章
  B.add({ id: 'navr', part: 'p3', t: '電波航法と GPS', en: 'Radio navigation and GPS',
    summary: 'VOR（ラジアル・TO/FROM・追跡）、DME と斜めの距離、GPS と CDI の目盛り・RAIM の予測、GPS の飛行計画を飛ぶ（DTK と TRK・Direct-To）、EFB と ADS-B In の画面とその限界、レーダーによる交通情報。ADF と NDB は発展。',
    secs: [
      { id: 'nav.vor', t: 'VOR：ラジアルと追跡', scope: 'common', from: ['kiso08.17', 'kiso08.18'], faa: ['PA.VI.B.K1', 'PA.VIII.F.K2', 'IR.V.A.K1'], jcab: ['ppl.3.1.3.4', 'cpl.3.1.3.4', 'cpl.1.6.5.2', 'ppl.1.2.5.5', 'ir.1.1.2.1'], h: () => {
        const tas = 100, wind = 80, wk = 12, crs = 40, wca = Math.asin(wk * Math.sin((wind - crs) * DEG) / tas) / DEG;
        return `
${bk.aim('VOR の表示から「いまどこにいて、どちらへ飛べば局に向かうか」を読めるようにします。課目 n1 の内容です。')}
${FIG.vorRadials()}
<p><b>超短波全方向式無線標識（VOR：VHF omnidirectional range）</b>は、地上の電波の局です。108.0〜117.95 MHz の電波で、局から外へ出る 360 本の<b>ラジアル（radial）</b>を作っています。ラジアルは「局から外へ向かう磁方位の線」です。受信機は、いまどのラジアルの上にいるかがわかります（米国の AIM 1-1-3）。</p>
<p>使う前に、<b>識別符号（モールス）を聞いて</b>局を確かめます。確かな識別は、モールスか、局名のあとに “VOR” と言う録音の声だけです（米国の AIM 1-1-3）。電波は見通しの範囲だけで届くので、高く飛ぶほど遠くまで受信できます。</p>
${bk.t(['表示（G1000 型の HSI）', '意味'], [['CRS（OBS）', 'パイロットが選んだ航路（コース、course）'], ['TO / FROM', 'そのコースを飛ぶと局に近づく（TO）か、離れる（FROM）か。機首の向きではなく<b>位置</b>で決まる'], ['CDI の針', 'コースは針の側にある。<b>針の方へ飛ぶ</b>。G1000 の HSI は片側 2 ドットで、VOR は<b>いっぱいで約 10°・1 ドット約 5°</b>（機械式の CDI と同じ角度の目盛り。昔ながらの VOR 計器は片側 5 ドットで、1 ドット約 2°）'], ['フラグ（NO SIGNAL など）', '信号がない・弱い。表示を信じない']])}
${bk.deep('ラジアルと TO / FROM の例（局の東にいるとき）', `<p>局の東、ラジアル 090 の上にいる機を考えます。機首を西へ向けても北へ向けても、位置が同じならラジアル 090 のままです。ラジアルは機首の向きではなく、局から見た位置を表します。</p>
${bk.t(['いる所', 'CRS（OBS）', '表示'], [['局の東・ラジアル 090 の上', '090°', 'FROM（針は中央）'], ['局の東・ラジアル 090 の上', '270°', 'TO（針は中央）']])}
<p>どちらも針は中央ですが、TO と FROM は逆です。予定と逆向きのコースを選んだまま針の方へ飛ぶと、思ったのと反対の修正になります。局の識別・選んだコース・TO / FROM・旗を、1 組にして確かめます。</p>
${bk.photo('ch04-photo4')}
${bk.photo('vorStation')}`)}
<h3>コースに乗って追跡する</h3>
<ol><li>CRS を飛びたいコースに合わせます（局へ向かうなら、TO が出る向き）。</li><li>針の方へ、コースとのずれの約 2 倍の角度（<b>20°〜90°</b> の間）で<b>会合</b>（intercept）します（IFH 第 9 章）。</li><li>針が中央に近づいたら、コースの向きへ旋回します。</li><li>風で流されたら、針の方へ修正します。<b>修正角を半分ずつ</b>変えて、針が止まる針路（ヘディング、heading）を探します（bracketing）。</li><li>局の上では針が大きく振れ、TO が FROM に変わります（局通過、station passage）。</li></ol>
${bk.deep('風の修正の例・風の向きの基準・逆の感じ方・米国の VOR の網と点検', `<p>例：局へ向かうコース ${String(crs).padStart(3, '0')}° を、真対気速度（true airspeed）${tas} kt で飛びます。風は ${String(wind).padStart(3, '0')}°（磁方位）/${wk} kt です。針が止まる針路は約 ${String(Math.round(crs + wca)).padStart(3, '0')}° です（右からの風なので右へ約 ${Math.round(wca)}°）。課目 n1 では、3,000 ft の風が地上より強い（約 16 kt）ので、約 046° になります。</p>
<p>この例の風は、コースと同じ磁方位で書いてあります。上空の風の予報は真方位（true direction）です。使う前に、偏差（磁気偏差、magnetic variation）で磁方位に直します（${bk.see('nav.plan', '針路の計算')}）。受信機が識別符号を読み取って表示する機種では、音を聞かなくてもかまいません（米国の AIM 1-1-3）。</p>
<p>HSI は、コースを正しく入れていれば、TO でも FROM でも針の動きは逆になりません。昔ながらの VOR 計器では、選んだコースと反対向きに飛ぶと、針の動きが逆になります（<b>reverse sensing</b>。PHAK 第 16 章）。</p>
<p>VOR は少しずつ減らされていますが、GPS が使えないときのために、最小限の網（<b>VOR MON</b>）が残されます。西部の山岳地帯を除く米国では、地上 5,000 ft でほぼ途切れずに VOR を受信できます。米国の本土では、どこにいても、GPS に頼らない計器進入（ILS か VOR）のある空港まで 100 NM 以内になるように考えられています（AIM 1-1-3）。米国の規則では、IFR で VOR を使うには、30 日以内の受信機の点検が要ります（14 CFR 91.171。試験信号 VOT・点検点・2 台の比較など）。</p>`)}
${bk.key('ラジアルは「局から外へ」。局へ向かうコースはラジアル ± 180°', 'TO / FROM は位置で決まる。針の方へ飛ぶ', '使う前に識別符号で局を確かめる')}
${bk.q('VOR を航法に使う前に、必ずすることは？', '識別符号（モールス、または “VOR” と言う録音の声）で、正しい局かを確かめることです。整備中の局は、識別符号を止めるか TEST（－・・・・－）を出すので、使いません（米国の AIM 1-1-3・1-1-11）。')}
${bk.sim('局へ向かうコースに乗って追跡します。識別音はないので、周波数で局を確かめます。', ['n1', 'VOR の追跡'])}`;
      } },
      { id: 'nav.dme', t: 'DME と位置の確かめ方', scope: 'common', from: ['kiso08.19'], faa: ['PA.VI.B.K1'], jcab: ['cpl.1.6.5.2', 'ppl.3.1.3.4', 'cpl.3.1.3.4', 'ir.1.1.2.1'], h: () => `
${bk.aim('DME の距離の意味と、ラジアルと距離で位置を決める方法を覚えます。')}
${FIG.dmeSlant()}
<p><b>距離測定装置（DME：distance measuring equipment）</b>は、局までの距離を出す装置です。機体と地上の局のあいだで電波をやりとりします（米国の AIM 1-1-7）。測っているのは、機体から局への<b>斜めの距離（slant range）</b>です。局の真上では、局からの高さ（NM で）が表示されます。たとえば局から 6,000 ft 上なら約 1.0 NM です。局から高さ 1,000 ft ごとに 1 NM 以上離れていれば、斜めの距離の誤差は小さいといえます（IFH 第 9 章）。</p>
<p><b>ラジアル＋DME ＝ 位置</b>：たとえば「LAB VOR の 030 ラジアル・11 NM」は、地図の上の 1 点です。GPS が使えないときに位置を確かめる方法で、課目 n3 で使います（${bk.see('nav.lost', '現在地を見失ったとき')}）。VOR が 2 局あれば、2 本のラジアルの交わる点（cross fix）でも位置がわかります。</p>
${bk.deep('距離だけでは向きがわからない', `<p>DME の距離だけでは、局のどちら側にいるかはわかりません。ラジアルと組み合わせるときは、2 つが同じ局のものかを確かめます。GPS の距離は水平の距離なので、局の近くでは DME と少し違います。DME に速さが出る機種では、その速さは局との距離の変わり方です。局へまっすぐ向かうか離れるときのほかは、対地速度（groundspeed）と同じではありません。</p>`)}
${bk.key('DME の距離は「局まで」の斜めの距離。空港までではない', '局の近くでは、DME は水平の距離より大きく出る（真上では局からの高さ）')}
${bk.q('局の真上を 6,000 ft（局からの高さ）で通った。DME はいくつを示す？', `約 1.0 NM です。真上では局からの高さ（6,000 ÷ 6,076 ≒ ${(6000 / NM_FT).toFixed(2)} NM）が出ます（IFH 第 9 章）。`)}
${bk.sim('VOR と DME で位置を確かめます（DME は水平の距離の簡略版）。', ['n3', '現在地を見失ったとき（GPS 故障）'])}` },
      { id: 'nav.adf', t: 'ADF と NDB（発展）', scope: 'common', deep: true, from: ['kiso08.20'], jcab: ['cpl.1.6.5.2', 'ppl.3.1.3.4', 'cpl.3.1.3.4', 'ir.2.5.1'], h: () => `
${bk.aim('地上の局の方向を指す古い電波航法、ADF と NDB のしくみと限界を知ります。この本の課目では使いませんが、JCAB の学科（航空工学・空中航法）で問われます。')}
<p><b>NDB（nondirectional radio beacon）</b>は、どの方向にも同じ電波を出す地上の局です。米国では、ふつう 190〜535 kHz の電波を使い、3 文字の識別符号をモールスで出します（米国の AIM 1-1-2）。<b>ADF（automatic direction finder）</b>は、その電波から局の方向を指す、機体の受信機です。</p>
<p>目盛りが動かない ADF の針は、機首を 0° として時計回りに測った角度（相対方位）で、局の方向を指します。局への磁方位は、磁針路（magnetic heading）に相対方位を足して求めます。たとえば磁針路 060°・相対方位 030° なら、局への磁方位は 090° です。これは機体から局へ向かう向きで、局から外へ向かう VOR のラジアルとは基準が逆です。</p>
<p>針を 0° に保つように機首を向け続けることを、<b>ホーミング（homing）</b>といいます。横風（crosswind）があると、地面の上では局へ曲がった道になります。風の分を修正して、決めた航跡（トラック、track）の上を飛ぶのが追跡（tracking）です（IFH 第 9 章）。</p>
${bk.key('ADF の針は、機首から測った局の方向（相対方位）', '局への磁方位 ＝ 磁針路 ＋ 相対方位', 'ADF には旗がない。識別符号を聞き続ける')}
${bk.warn('<b>ここに注意：</b>NDB の方位は、雷や降水の静電気で乱れます。夜は、遠くの局の電波が混じりやすくなります。ADF には、方位が正しくないことを知らせる旗がありません。だから、使っている間は識別符号を聞き続けます（米国の AIM 1-1-2）。')}
${bk.recall('相対方位は機首から時計回りに測った向きで、目標の磁方位 ＝ 磁針路 ＋ 相対方位 です。', ['navb.north', '相対方位の求め方'])}
${bk.q('磁針路 060° で、ADF の相対方位は 030°。局への磁方位はいくつ？ それを VOR のラジアル 090 と呼んでよい？', '060 ＋ 030 ＝ 090° です。ただし、これは機体から局へ向かう向きです。局から外へ向かうラジアルで言えば、機体はラジアル 270 の上にいます。')}` },
      { id: 'nav.gps', t: 'GPS と CDI の目盛り', scope: 'common', from: ['kiso08.21', 'kiso04.20'], faa: ['PA.VI.B.K2', 'PA.II.B.K3', 'IR.V.A.K2'], jcab: ['cpl.1.6.5.4', 'ppl.3.1.3.4', 'cpl.3.1.3.4', 'ir.1.1.1.1', 'ir.1.1.2.3'], h: () => `
${bk.aim('GPS の位置がどう決まり、どこまで信じてよいかと、GPS のときの CDI の読み方を覚えます。')}
<p>GPS は、全地球的航法衛星システム（GNSS：global navigation satellite system）の 1 つです。衛星の電波で位置を出します。3 次元の位置には、受信機の時計のずれも一緒に解くので、少なくとも 4 機の衛星が要ります。RAIM（receiver autonomous integrity monitoring）は、受信機が自分で衛星の異常に気づくしくみです。RAIM には 5 機（または 4 機と高度計（altimeter）の気圧の情報）が要ります。異常な衛星を除いて使い続ける FDE には 6 機（または 5 機と気圧の情報）が要ります（米国の AIM 1-1-17）。</p>
<p>VFR 用の受信機の多くには、RAIM の警報がありません。ほかの航法と比べ続けます（米国の AIM 1-1-17）。</p>
${bk.t(['GPS のときの CDI のいっぱいの振れ', '値'], [['航空路（ENR）', '2.0 NM（Garmin の WAAS の GPS の例。機種で違う）'], ['空港のまわり（TERM。出発・到着の空港から 30 NM 以内）', '1.0 NM（米国の AIM 1-1-17 の terminal ±1 NM）'], ['進入（APR）', '0.3 NM 前後（Garmin の GPS の例。滑走路に近づくほど狭い）']])}
${bk.deep('RAIM の予測・妨害となりすまし・衛星の図', `<p>IFR で GPS を使う前は、到着の時刻に RAIM が使えるかを予測で確かめます（米国の AIM 1-1-17）。FAA の予測のサイトや FSS（飛行サービス局、Flight Service Station）で調べます。使えなければ、別の航法・経路・時刻を選びます。</p>
<p>電波の妨害（jamming）では、受信ができなくなったり、悪くなったりします。なりすまし（spoofing）では、もっともらしい誤った位置や時刻が出ることがあります。GPS の位置を使う地図・地形の警報・ADS-B・時計にも、影響が広がります（米国の AIM 1-2-4）。</p>
<p>GPS に頼りきると、故障や電波の妨害（ジャミング）のときに位置がわからなくなります。推測航法（dead reckoning）の見積もりと、VOR・DME での確かめを続けます。受信が戻っても、すぐに全部が正常とは決めません。位置の飛びや、おかしな対地速度がないかを見て、ほかの航法と比べます。米国では <b>WAAS</b>（衛星による補強）で精度と完全性が上がります。LPV のような進入もできます（米国の AIM 1-1-18）。</p>
${bk.photo('ch08-photo6')}`)}
${bk.key('3 次元の位置は衛星 4 機から。RAIM には 5 機（または 4 機＋高度計の気圧）', 'GPS の CDI の目盛りは、飛行の段階で変わる', 'GPS が止まったときのために、推測航法と VOR を続ける')}
${bk.jur('sbas')}
${bk.q('GPS の受信機が RAIM で衛星の異常に気づくには、衛星が何機要る？', '5 機、または 4 機と高度計の気圧の情報（baro-aiding）です。FDE には 6 機（または 5 機と気圧の情報）が要ります（米国の AIM 1-1-17）。')}
${bk.sim('途中で GPS が使えなくなります（CDI はいつも 1.0 NM の簡略版）。', ['n3', '現在地を見失ったとき（GPS 故障）'])}` },
      { id: 'nav.fpl', t: 'GPS の飛行計画を飛ぶ：DTK と TRK・Direct-To', scope: 'common', from: ['kiso04.19', 'kiso08.22', 'kiso08.23'], faa: ['PA.VI.B.K2', 'PA.VIII.F.K2'], jcab: ['ppl.3.1.1.1', 'cpl.3.1.1.1'], h: () => `
${bk.aim('G1000 型の表示で GPS の飛行計画（flight plan）を飛ぶときに、どの数字を見て、どう合わせるかを覚えます。')}
<p>MFD（多機能表示、multi-function display）の地図には、飛行計画の線（いまの区間はマゼンタ）と自機の位置が出ます。</p>
${bk.t(['表示', '意味'], [['DTK（desired track）', '飛びたい区間の線の向き（磁方位）'], ['TRK（track）', 'いま地面の上を実際に進んでいる向き'], ['XTK（cross-track）', '区間の線から左右にどれだけずれているか（NM）'], ['D→（Direct-To）', 'いまの位置から、選んだ点へまっすぐ向かう新しい区間を作る']])}
<p><b>TRK を DTK に合わせる</b>のが基本です。TRK が DTK より左にずれていれば、風で左へ流されているので、機首を少し右へ向けます。CDI の針が中央に戻ったら、TRK と DTK が同じになる針路を探します（VOR の bracketing と同じ考え方）。区間の距離と磁航路（magnetic course）は ${bk.see('nav.log', 'ナビゲーションログ')} にあります。</p>
${bk.deep('針を読む順番と、画面の数字の基準', `<p>CDI と HSI は、針の向きの前に、次の順に読みます。</p>
<ol><li>どの航法の源か（GPS・VOR・LOC）を確かめます。</li><li>選んだコースが計画と同じかを確かめます。</li><li>どちらへ、どれだけずれているかを、目盛りの感度と一緒に読みます。</li><li>TO / FROM と旗を確かめます。</li></ol>
<p>VOR の針のずれは角度なので、同じドット数でも、局から遠いほど横の距離は大きくなります。画面の数字は、何を基準にした値かを確かめます。TRK は地面の上を進む向き、針路は機首の向きで、風があれば違います。GPS の高度と高度計の値は、求め方と基準が違います。地図と航法データが古いと、正しく受信していても案内がずれます。</p>`)}
${bk.judge('画面どうしが合っても、同じ GPS の受信機から来た数なら、確かめにはなりません。外の目印・推測航法の予想・VOR と比べます。食い違ったら多数決で決めず、時刻・局の識別・入れた地点を調べて、理由を確かめます。')}
${bk.key('TRK を DTK に合わせる。ずれたら機首を風上へ少し', 'D→ は「いまの位置から、まっすぐ」', '画面を見すぎない。外の見張り（see and avoid）が先')}
${bk.q('区間の DTK は 071°。いまの TRK は 066°。どうする？', '左へ 5° 流されています。機首を右へ 5° より多く（たとえば 10°）向けて、ずれを戻します。CDI の針が中央に戻ったら、TRK が 071° になる針路（もとの針路より右へ約 5°）に合わせます。')}` },
      { id: 'nav.efb', t: 'EFB と ADS-B In：機内の画面の情報と限界', scope: 'common', from: ['kiso04.23', 'kiso04.24', 'kiso04.25'], faa: ['PA.I.C.K4', 'PA.VI.B.K4', 'IR.II.B.K3', 'IR.I.B.K4'], h: () => `
${bk.aim('タブレットなどの電子フライトバッグ（EFB）と、機内の画面に出る交通・天気の情報の使い方を学びます。何を信じてよく、何を信じてはいけないかを知ります。')}
<p><b>EFB（electronic flight bag）</b>は、電子の表示装置です。航空図・チェックリスト（checklist）・POH（操縦士用の機体の手引書、pilot's operating handbook）を表示します。重量（weight）や性能も計算します（FAA AC 91-78A）。米国の Part 91 の運航では、紙と同じ中身で、データが最新なら、紙の代わりに使えます。規則が求める航法・通信・監視の装置の代わりにはなりません（米国の AC 91-78A）。</p>
<p>ADS-B In の受信機があると、近くの機の位置（交通の情報）が画面に出ます。FIS-B で送られる天気やノータム（NOTAM）も出ます（米国の AIM 4-5-7〜4-5-9）。位置を送る ADS-B Out は別のしくみです（${bk.see('comm.xpdr', 'トランスポンダー（transponder）')}）。</p>
<h4>画面の限界</h4>
<ul><li>交通の画面は、相手を目で見つけるための助けです。衝突を避ける装置ではありません（米国の AIM 4-5-7）。</li>
<li>トランスポンダーのない機は、地上のレーダーから送る交通の情報（TIS-B）に出ません（米国の AIM 4-5-8）。画面に機がないことは、いないことの証明ではありません。</li>
<li>天気の画像は古いことがあります。雷雨（thunderstorm）のすき間を抜ける判断には使いません（米国の AIM 7-1-9）。</li>
<li>画面が止まったときの代わり（紙の図・別の装置）を決めておきます。</li></ul>
${bk.deep('トランスポンダーのモードと、衝突と地形の警報', `${bk.t(['しくみ', '働き'], [['Mode A', '4 けたの識別のコードで答える'], ['Mode C', 'コードに加えて、気圧の高度で答える'], ['Mode S', '1 機ずつ選んで呼び出し、データをやりとりする'], ['ADS-B Out', '自機の位置などを送り続ける'], ['ADS-B In', '交通や天気の情報を受ける']])}
<p>TCAS I は近くの機を知らせるだけで、避ける操作を指示しません。TCAS II は、交通の知らせ（TA）に加えて、上昇か降下で避ける指示（RA）を出します（米国の AIM 4-4-16）。ふつうの交通の画面は、RA の代わりにはなりません。地形や障害物に近づくと知らせる装置（TAWS）もあります。何のデータで何を知らせるかは機体で違うので、その機体の手引きで学びます。</p>
<p>天気の画像は、広い範囲を避ける計画（20 分以上先の判断）には使えます。3 分より短い間に雷雨をすり抜ける判断には、向いていません（米国の AIM 7-1-9）。</p>`)}
${bk.judge('画面に出た機は、外で目で見つけてから避けます。画面に何も出ていなくても、見張りを続けます。')}
${bk.key('EFB は紙の代わり。規則が求める航法・通信の装置の代わりではない', '交通の画面は見張りの助け。映らない機がいる', 'データ放送の天気の画像で、雷雨のすき間を抜けない')}
${bk.jur('adsb')}
${bk.recall('機内に届く天気の画像の遅れと、FIS-B のしくみは、気象の章で学びました。', ['wx.info', '気象情報の種類'])}
${bk.q('ADS-B In の画面に、近くの機が 1 機も出ていない。見張りをゆるめてよい？', 'よくありません。トランスポンダーのない機や、受信の範囲の外の機は出ません（米国の AIM 4-5-8）。画面は見張りの助けで、代わりではありません。')}` },
      { id: 'nav.ff', t: 'レーダーによる交通情報（Flight following）', scope: 'common', faa: ['PA.VI.B.K3'], h: () => `
${bk.aim('VFR でもレーダーの管制官から交通情報をもらう方法と、その限界を知ります。')}
<p>VFR でも、レーダーの管制機関に頼むと、近くの他機の情報（<b>traffic advisories</b>）をもらえます。これを一般に <b>flight following</b> と呼びます（米国の AIM 4-1-15・4-1-18）。安全のための警告（safety alert）もあり、業務量が許せば、限られた誘導もしてもらえます。</p>
<p>ただし、<b>見張り（see and avoid）の責任はパイロットに残ります</b>。交通情報は「見張りの助け」で、代わりではありません（米国の AIM 4-1-15）。業務量によって断られることもあります。Class B 空域に入るには、別に許可が要ります（米国の 14 CFR 91.131）。交信の例は ${bk.see('comm.radar', 'レーダーの管制との交信')} にあります。</p>
${bk.key('flight following は「情報が増える」助け。見張りは自分', 'Class B に入るには、別に許可が要る', '断られることもある（業務量しだい）')}
${bk.jur('charts')}
${bk.q('flight following を受けながら、Class B 空域に近づいた。入ってよいのはいつ？', '管制官から “cleared into the Class B airspace” などの許可をもらってからです。flight following を受けていることは、許可ではありません（米国の 14 CFR 91.131）。')}` },
    ],
    terms: [['VOR', '超短波全方向式無線標識', '108.0〜117.95 MHz'], ['VOR MON (Minimum Operational Network)', 'VOR の最小限の網', 'AIM 1-1-3'], ['Radial', 'ラジアル（局から外へ出る磁方位の線）', ''], ['OBS / CRS', 'コースの選択', ''], ['TO / FROM', '局へ／局から', '位置で決まる'], ['CDI / HSI', 'コース偏位指示器・水平状況指示器', ''], ['Intercept / Track / Bracketing', '会合・追跡・修正角の絞り込み', ''], ['Station passage', '局通過', ''], ['DME / Slant range', '距離測定装置・斜めの距離', ''], ['RAIM / FDE / WAAS / LPV', 'GPS の完全性の監視・異常な衛星の除外・補強・進入', 'AIM 1-1-17・1-1-18'], ['DTK / TRK / XTK', '飛びたい向き・実際の向き・横のずれ', ''], ['Direct-To (D→)', '直接その点へ', ''], ['Flight following', 'VFR のレーダー交通情報', 'AIM 4-1-15'], ['NDB / ADF', '無指向性の地上局・その方向を指す受信機', 'AIM 1-1-2'], ['Homing', 'ホーミング（針を 0° に保って局へ向かう）', 'IFH 第 9 章'], ['Electronic flight bag (EFB)', '電子フライトバッグ', 'AC 91-78A'], ['ADS-B In / TIS-B / FIS-B', '受信する ADS-B・交通の情報・天気などの情報', 'AIM 4-5-7〜4-5-9'], ['Jamming / Spoofing', '電波の妨害・なりすまし', '']],
    examples: ['CRS 030・TO・針が右 1 ドット → コースは右に約 5°。060° 前後（30° の角度）で会合し、針が中央に近づいたら 030° 前後へ。', 'DME 5.0 NM・局からの高さ 6,000 ft・局の真上へ向かう → 真上でも DME は約 1.0 NM を示す。', 'ADS-B In の画面に何も出ていない空域でも、トランスポンダーのない機は映らない → 見張りを続ける。'],
    cautions: ['LAB VOR（113.5）・I-LAB（109.9）は架空の教材用施設。', 'G1000 の表示は「型」を学ぶための教材の簡略版。実機の操作は G1000 の Pilot\'s Guide と機体の AFM 補足で。', 'EFB の地図と交通の画面は、見張りと公式の情報の代わりにならない。'],
    quiz: [
      { q: 'G1000 の HSI で VOR を使っている。針が左にいっぱい（2 ドット）振れている。選んだコースは、自機から見てどちら？', choices: ['左に 10° 以上', '右に 10° 以上', '左に 2°', '真下'], answer: 0, why: '針の側にコースがある。G1000 の HSI の VOR は 1 ドット 5°、いっぱいで 10° 以上（本文「VOR：ラジアルと追跡」の節）。' },
      { q: 'TO / FROM の表示が決まるのは？', choices: ['機首の向き', '機体の位置（選んだコースに対して、局のどちら側にいるか）', '速度', '高度'], answer: 1, why: 'TO / FROM は位置で決まる。機首をどちらに向けても変わらない（図。PHAK 第 16 章）。' },
      { q: 'VOR を航法に使う前に必ずすることは？', choices: ['局の上を一度通る', '識別符号で局を確かめる', 'DME を切る', '高度を 5,000 ft にする'], answer: 1, why: '米国の AIM 1-1-3：確かな識別はモールスか録音の声だけ。整備中の局は、識別符号を止めるか TEST を出す（1-1-11）。' },
      { q: 'GPS で 3 次元の位置を出すのに、少なくとも何機の衛星が要る？', choices: ['2 機', '3 機', '4 機', '6 機'], answer: 2, why: '米国の AIM 1-1-17：3 次元の位置には 4 機。RAIM には 5 機（または 4 機＋気圧高度）。' },
      { q: 'flight following を受けながら Class B 空域に近づいた。入ってよいのはいつ？', choices: ['flight following を受けていれば、いつでも', '管制官から Class B に入る許可をもらってから', 'トランスポンダーが動いていれば', '高度が 3,000 ft より下なら'], answer: 1, why: '米国の 14 CFR 91.131：Class B に入るには管制の許可が要る。flight following は許可ではない。' },
      // W29（R3）：後ろに足すだけ（正解は A・C・D に散らす）
      { q: 'ADS-B In の交通の画面について、正しいものは？', choices: ['目で見つけるための助けで、映らない機もいる', '衝突を避ける装置なので、表示どおりに避ければよい', '画面に何もなければ、近くに機はいない', 'トランスポンダーのない機も必ず映る'], answer: 0, why: '米国の AIM 4-5-7・4-5-8：交通の表示は見張りの助けで、衝突を避ける装置ではない。TIS-B はトランスポンダーのない機を送らない（{ch:navr}「EFB と ADS-B In」の節）。' },
      { q: 'IFR で GPS を使う前の RAIM の予測で、到着の時刻に RAIM が使えないと出た。どうする？', choices: ['そのまま飛び、着いてから考える', '受信機の電源を入れ直す', '別の航法・経路・時刻を選ぶ', 'VFR 用の受信機に替える'], answer: 2, why: '米国の AIM 1-1-17：RAIM が使えないなら、ほかの航法と進入、別の経路や目的地、出発を遅らせる（本文「GPS と CDI の目盛り」の節）。' },
      { q: '局から 6,000 ft 上を、局の真上で通った。DME の表示に近いのは？', choices: ['0 NM', '6 NM', '0.1 NM', '約 1 NM'], answer: 3, why: 'DME は斜めの距離を測るので、真上では局からの高さが出る。6,000 ft ≒ 1 NM（米国の AIM 1-1-7・IFH 第 9 章）。' },
    ],
    written: [
      ['機体が架空の VOR 局 V の東、ラジアル 090 の上にいる。この 090 は機首の向きか。機首を北へ向けたら、ラジアルは変わるか。', `ラジアル 090 は、局から磁方位 090° へ伸びる位置の線で、機首の向きではありません。位置が同じなら、機首を北へ向けてもラジアルは変わりません（${bk.see('nav.vor', 'VOR：ラジアルと追跡')}）。`, ['kiso08.q17']],
      ['架空の VOR 局 V の東で、ラジアル 090 の上にいる。CRS を 090° と 270° にしたときの TO / FROM を答え、針路だけで表示が決まるかを説明しなさい。', `090° では FROM、270° では TO です。同じ位置でも選んだコースで変わり、針路だけでは決まりません。針が中央でも、局の識別と受信の旗は別に確かめます（${bk.see('nav.vor', 'VOR：ラジアルと追跡')}）。`, ['kiso08.q18']],
      ['VOR の CDI が TO を示すとき、機首は必ず局を向いているか。また、同じドット数のずれは、いつも同じ横の距離か。', `どちらも違います。TO / FROM は選んだコースと局に対する位置で決まり、機首の向きを示しません。VOR のずれは角度なので、同じドット数でも局から遠いほど横の距離は大きくなります（${bk.see('nav.fpl', 'GPS の飛行計画を飛ぶ')}）。`, ['kiso04.q19']],
      ['架空の DME 局の真上で、局のアンテナとの高さの差が 6,000 ft ある。1 NM を約 6,076 ft として表示の距離を見積もり、0 NM にならない理由を説明しなさい。', `6,000 ÷ 6,076 ≒ 0.99 NM です。DME は局のアンテナまでの斜めの距離を出すので、真上でも高さの差が残ります（${bk.see('nav.dme', 'DME と位置の確かめ方')}）。`, ['kiso08.q19']],
      ['磁針路 060° で飛んでいて、ADF の相対方位は 030° だった。局への磁方位を求め、それを VOR のラジアル 090 と呼べるかを説明しなさい。', `060 ＋ 030 ＝ 090° です。これは機体から局へ向かう向きで、局から外へ向かうラジアルとは基準が逆です。横風の中で機首を局へ向け続けるだけでは、まっすぐには飛べません（${bk.see('nav.adf', 'ADF と NDB')}）。`, ['kiso08.q20']],
      ['GNSS の受信機が 4 機の衛星から位置を出した。3 次元の位置に 4 機が要る理由を説明し、この数だけで航空に使えると決めてよいかを述べなさい。', `位置の 3 つに加えて、受信機の時計のずれも解くので 4 機が要ります。数だけでは、異常に気づく働き（RAIM など）や使ってよい承認は決まりません（${bk.see('nav.gps', 'GPS と CDI の目盛り')}）。`, ['kiso08.q21']],
      ['GPS の位置が疑わしい。別のタブレットの地図も同じ位置を示した。正常と判断してよいか。RAIM の限界も含めて答えなさい。', `判断できません。同じ GPS の電波や同じ妨害に頼っていれば、独立した確かめになりません。RAIM も、すべての誤った信号に気づくわけではありません。外の目印・推測航法・VOR と比べます（${bk.see('nav.fpl', 'GPS の飛行計画を飛ぶ')}）。`, ['kiso04.q20']],
      ['電子の地図で、自機の印が予定の線の上にあり、TRK 090° と出ている。機首も 090° で、地形と空域の余裕も十分と判断してよいか。', `よくありません。TRK は地面の上を進む向きで、風があれば針路と違います。真北か磁北か・高度の基準・データの古さも確かめ、印が線の上にあることだけで余裕を決めません（${bk.see('nav.fpl', 'GPS の飛行計画を飛ぶ')}）。`, ['kiso08.q22']],
      ['2 つの画面に同じ位置が出たが、見えている川の形と合わない。画面の多数決で位置を決めてよいか。', `決めません。2 つが同じ受信機のデータなら、同じ誤りを出します。目印・時刻からの予想・VOR を比べ、入れた地点と時刻を調べて、食い違いの理由を確かめます（${bk.see('nav.fpl', 'GPS の飛行計画を飛ぶ')}）。`, ['kiso08.q23']],
      ['航法データベースが最新なら、入れた経路を確かめなくてよいか。確かめることを挙げなさい。', `省けません。地点の名前と位置・順番・区間の向き・意図しない Direct-To や飛ばした区間を確かめます。データが新しいことと、入れた計画が正しいことは別です（${bk.see('nav.efb', 'EFB と ADS-B In')}）。`, ['kiso04.q23']],
      ['ふつうの交通の画面と、TCAS II の RA は同じものか。', `違います。交通の画面は相手を目で見つける助けで、TCAS II の RA は上昇か降下で避ける指示です。画面は RA の代わりになりません（${bk.see('nav.efb', 'EFB と ADS-B In')}・米国の AIM 4-4-16）。`, ['kiso04.q25']],
    ],
    refs: [R.phak, R.phak16, R.aim, R.aim11, R.aim45, R.aim44, R.aim71, R.ifh, R.g1000, R.garminCdi, R.cfr91, R.acsP, R.acsI, NEW_R.ac9178a], lessons: ['n1', 'n3'] });

  // ======================================================================= 第 3 部 第 29 章
  B.add({ id: 'navd', part: 'p3', t: '目的地変更・現在地を見失ったとき', en: 'Diversions and lost procedures',
    summary: '野外飛行（クロスカントリー）の組み立てと VFR の飛行計画、天気・体調・機体の不具合で目的地を変える手順、現在地を見失ったときの手順。',
    secs: [
      { id: 'nav.xc', t: '野外飛行（クロスカントリー）の組み立て', scope: 'common', faa: ['PA.I.D.K4', 'PA.I.D.K5'], h: () => `
${bk.aim('離れた空港へ飛ぶ「野外飛行（クロスカントリー、cross-country）」の準備を、これまでの章をつなげて順番に組み立てます。')}
<p>野外飛行の準備は、これまでの章のまとめです。自家用 ACS の Cross-Country Flight Planning も、天気・経路・高度・時間と燃料の計算を見ます。飛行計画（flight plan）と危険の評価も見ます。代わりの空港の選び方は、目的地変更（diversion）の課目で見られます。</p>
<p>準備は、体調と危険の評価から始め、天気・空域・経路・性能と燃料・代わりの空港・飛行計画の順に進めます。</p>
${bk.deep('準備の順番と、学ぶ章', `${bk.t(['順番', 'すること', '章'], [['1', '自分の体調（IMSAFE）と危険の評価（PAVE）', '{ch:hf}'], ['2', '天気（METAR（定時の飛行場の実況、METAR）・TAF・予報・PIREP（操縦士による気象観測、pilot weather report））と「行く・やめる」の基準', '{ch:wx}'], ['3', '空域・ノータム（NOTAM）・TFR・空港の情報（Chart Supplement）', '{ch:law}'], ['4', '航路（コース、course）・チェックポイント・高度（米国の 91.159）・針路（ヘディング、heading）の計算・ログ', '{ch:navp}'], ['5', '性能・重量（weight）と重心・燃料（予備を含む）', '{ch:perf}・{ch:wb}'], ['6', '航路の近くの代わりの空港と、使える電波施設', 'この章'], ['7', 'VFR の飛行計画を出す・開く・閉じる', 'この節']])}`)}
<h3>米国の VFR の飛行計画（AIM 5-1-5・5-1-14）</h3>
<ul><li>米国本土の VFR では、飛行計画はふつう義務ではありませんが、出すことが強くすすめられています。開いておけば、到着が遅れたときに捜索救難（search and rescue、SAR）の手続きが始まる「保険」になります。</li>
<li><b>開く（activate）のはパイロット</b>です。管制塔は自動では開きません。</li>
<li><b>閉じるのもパイロット</b>です。管制塔は自動では閉じません。近くの FSS（飛行サービス局、Flight Service Station）に閉じます。話せないときは、管制機関に中継を頼めます。到達予定時刻（到着予定時刻、estimated time of arrival）から 30 分以内に閉じないと、捜索救難が始まります。</li></ul>
${bk.deep('飛行計画の出し方と、出発の時刻で自動で開く方法', `<p>FSS などに出すときは、FAA Form 7233-4（国際形式の飛行計画）を使います。出すときに決めた出発時刻で自動で開く方法（assumed departure time）もあります。出発が遅れたら FSS に時刻を直してもらいます。直さないと、捜索救難はその時刻を元に始まります（米国の AIM 5-1-5）。</p>`)}
${bk.key('準備は「体調と危険の評価」から始める', '航路の近くの代わりの空港を、出発前に決めておく', 'VFR の飛行計画は、自分で開き、自分で閉じる')}
${bk.jur('fpl')}
${bk.q('VFR の飛行計画を閉じ忘れた。捜索救難の手続きが始まるのは、到着予定時刻のおよそ何分後？', '30 分後です（米国の AIM 5-1-14）。管制塔は VFR の飛行計画を自動で閉じないので、着いたら自分で FSS などに閉じます。')}` },
      { id: 'nav.divert', t: '目的地変更（Diversion）', scope: 'common', from: ['kiso08.26'], faa: ['PA.VI.C.K1', 'PA.VI.C.K2'], h: () => `
${bk.aim('飛行中に天気・燃料・体調・機体の不具合で目的地を変えるとき、すばやく安全に新しい目的地へ向かう手順を覚えます。課目 n2 の内容です。')}
${FIG.diversionGeometry()}
<p>公開情報（ANA）でも、目的地変更に伴う<b>再計算</b>が訓練の一部とされています。</p>
<p>空の上では、操縦・計算・見張り（see and avoid）に注意を分けなければなりません。だから、地図に線を引いて正確に計算するより、<b>目安の計算（rule of thumb）</b>を使います（PHAK 第 16 章）。</p>
<ol><li><b>選ぶ</b>：天気・燃料・体調・機体の不具合から、いちばんよい代わりの空港を選びます。時間があれば、候補の空港を距離・天気・滑走路・燃料・地形と空域で比べてから選びます。緊急なら比べる時間をかけず、確実に降りられる近くの空港を選びます。変更するか決めかねるときは、早めに決めます。</li>
<li><b>おおよその航路を出す</b>：近くの VOR のコンパスローズや、航路に近い航空路を使って、磁航路（magnetic course）をおおよそ読みます。ラジアルは局から外への向きなので、局へ向かうなら反対の向きです。</li>
<li><b>向かう</b>：時間があれば、はっきりした目印の上から始めます。<b>緊急なら、すぐに向かいます</b>。計算を全部終えてから向かうと、緊急がもっと悪くなりかねません。</li>
<li><b>時刻を記録して計算する</b>：コースに乗ったら時刻を記録します。上空の風から、推測航法（dead reckoning）で針路・対地速度・到着の時刻・燃料を計算します。</li>
<li><b>確かめて伝える</b>：最初の目印で位置を確かめて直し、管制や FSS に変更を伝えます。高度は、雲の高さ・風・地形・無線の届き方で選びます（PHAK 第 16 章）。</li></ol>
${bk.deep('目安の計算と、時間があるときの比べ方', `${bk.t(['目安の計算', '使い方'], [['時速 → 分速', '105 kt ＝ 約 1.75 NM/分。12 NM なら約 7 分'], ['60 の法則', `外れた角度 ≒ 60 × 外れた距離 ÷ 飛んだ距離（${bk.see('nav.dr', '60 の法則')}）`], ['MFD（多機能表示、multi-function display）の地図・GPS の Direct-To', '使えるときは、目安の計算の答え合わせに使う']])}
<p>目的地へ進む・出発地へ戻る・別の空港へ向かう、の案を並べます。どの案も、いま使える燃料から、到着の見込みと要る余裕を同じ基準で比べます。いちばん近い空港でも、滑走路・天気・使える時間・機体の性能に合わなければ、使える代わりの空港ではありません。</p>
<p>決めるのが遅れると、燃料・日の光・天気の変化で、選べる案が減っていきます。出発の前に、代わりの空港と、判断を見直す地点を決めておきます。画面の Direct-To の線も、地形・空域・天気を確かめてから使う線です。</p>
<p>自家用 ACS の Diversion では、すぐに変更先へ向かい、針路・対地速度・到着の時刻・燃料を妥当に見積もり、高度 ±200 ft・針路 ±15° を保ちます。</p>`)}
${bk.key('緊急なら、まず向きを変える。計算はそのあと', 'コースに乗ったら時刻を記録', '目的地変更は「失敗」ではなく、安全のための判断（{ch:hf}）')}
${bk.q('対地速度 105 kt で、14 NM 先の空港までのおよその時間は？', '約 8 分です。105 kt は約 1.75 NM/分なので、14 ÷ 1.75 ＝ 8 分。風があれば、対地速度で計算し直します。')}
${bk.sim('目的地を変え、針路・距離・時間を見積もって入力します。', ['n2', '推測航法と目的地変更'])}` },
      { id: 'nav.lost', t: '現在地を見失ったとき', scope: 'common', from: ['kiso08.27'], faa: ['PA.VI.D.K1', 'PA.VI.D.K2'], h: () => `
${bk.aim('位置がわからなくなったときに、落ち着いて位置を取り戻すか、助けを求める手順を覚えます。課目 n3 の内容です。')}
<p>予想した目印が見つからない、表示どうしが食い違う、と位置の確かさが下がった時点で、そのことを認めます。完全に迷ったと確信するまで待ちません。現在地を見失うのは危険になりうることで、燃料が少ないときは特にそうです（PHAK 第 16 章）。慌てて飛び回ると、燃料と時間を失います。</p>
${bk.t(['手順（PHAK 第 16 章・自家用 ACS）', 'すること'], [
  ['① 操縦を続ける', '姿勢・高度・燃料・日没までの時間を確かめる。針路を保つ'],
  ['② 必要なら上がる', '町や目印が見えないときは、他機・雲・空域に気をつけて上昇する。電波とレーダーが届きやすく、遠くまで見える。雲から離れていられる高さと、許可の要る空域の下まで。地形と燃料も考える'],
  ['③ 自分で位置を出す', '大きな目印（町の給水塔の名前・湖・高速道路・海岸線）、2 つ以上の VOR のラジアル（またはラジアル＋DME）、GPS'],
  ['④ 伝える', 'チャートにある周波数で、近くの管制・FSS を呼ぶ。最後に確かめた位置と時刻・高度・針路・燃料・使える装置を伝える。危なくなったら 121.5 MHz で伝え、7700 にする（管制と交信中で番号をもらっているなら、指示がない限りそのまま。米国の AIM 6-3-2）'],
  ['⑤ 判断する', '燃料・天気・日没を考えて、近くの空港へ降りる（予防着陸（precautionary landing）も選択肢。AFH 第 18 章）']])}
<p>訓練では、覚え方として <b>4C</b> がよく使われます。Climb 上がる・Communicate 伝える・Confess 迷ったと認める・Comply 指示に従う、の 4 つです。Conserve（燃料を節約する）を足した <b>5C</b> もあります。米国の PHAK・AIM・ACS には出てこない、訓練の語呂です。</p>
${bk.deep('いまいそうな範囲の考え方・語呂の違い・管制に伝えたあと', `<p>まず機体の操縦を続けます。最後に確かだった位置と時刻を確かめ、そのあとの針路・経過時間・対地速度から、いまいそうな範囲を考えます。どこまでが確かめた事実で、どこからが予想かを分けます。</p>
<p>版によっては、その場で旋回して落ち着く「Circle」を入れるものもあります。上昇や旋回は、どの場面でも同じにする手順ではありません。地形・天気・空域・交通・燃料で、取れる行動が変わります。</p>
<p>管制に伝えるときは、迷っていることを正直に言います。交信ができて、レーダーの届く範囲にいれば、管制官はレーダーで位置を出して、近くの空港への誘導をしてくれます。雲に入らないように、いまの天気と前方の天気を管制官に伝え続けます。誘導は助言で、安全に飛ぶ責任はパイロットに残ります（米国の AIM 6-2-1）。</p>`)}
<p>言い方は ${bk.see('comm.mayday', '遭難と緊急の通報')} にあります。</p>
${bk.key('迷ったら：操縦を続ける → 必要なら上がる → 位置を出す・伝える（助けを求めるのは早めに）', '燃料と日没までの時間をいつも頭に入れる', '近くの空港へ降りる（予防着陸）のは、ためらわずに選んでよい判断')}
${bk.q('飛行中に現在地がわからなくなった。上昇するとよいのはなぜ？', '高いほど遠くまで見え、無線と電波施設（VOR など）がよく届き、レーダーにも映りやすくなるからです（PHAK 第 16 章）。ただし、他機に気をつけ、雲や、許可が必要な空域に入らないようにします。')}
${bk.sim('GPS が使えない中、VOR と DME で飛行場へ戻ります。', ['n3', '現在地を見失ったとき（GPS 故障）'])}` },
    ],
    terms: [['Cross-country', '野外飛行', '通称はクロスカントリー（離れた空港への飛行）'], ['VFR flight plan', 'VFR の飛行計画', 'FAA Form 7233-4・AIM 5-1-5'], ['Flight Service Station (FSS)', '飛行サービス局', '米国の施設。飛行計画の受付・天気'], ['Activate / Close a flight plan', '飛行計画を開く・閉じる', 'ETA ＋30 分で捜索救難の手続き開始（AIM 5-1-14）'], ['Search and rescue (SAR)', '捜索救難', ''], ['Diversion', '目的地変更', ''], ['Alternate airport', '代わりの空港', ''], ['Rule of thumb', '目安の計算', ''], ['Lost procedures', '現在地を見失ったときの手順', '覚え方 4C / 5C'], ['Cross fix', '2 局のラジアルの交わる点', '']],
    examples: ['前方の雷雨で、西の空港へ変更 → まず西へ旋回 → コースに乗ったら時刻を記録 → 18 NM・対地速度 105 kt で約 10 分・燃料 約 1.9 gal（この教材のモデルの 10.8 gal/h）と見積もる → 最初の目印で確かめる。', '迷った → 雲に注意して上昇 → LAB Approach を呼んで位置がわからないと伝える → LAB VOR のラジアルと DME で位置を確かめる。'],
    cautions: ['この教材の目的地変更の課目は、架空の空域・ウェイポイントで行う。', '迷ったら、燃料・天気・日没を最優先に。近くの空港へ降りる（予防着陸）のは、ためらわずに選んでよい判断。'],
    quiz: [
      { q: '緊急で目的地を変えるとき、最初にすることは？', choices: ['正確な針路を計算してから旋回', '新しい目的地のおおよその方向へ、すぐ向かう', '管制の許可を待つ', '出発地へ戻る'], answer: 1, why: 'PHAK 第 16 章：緊急なら、すぐに代わりの目的地へ向かう。コースに乗ってから時刻を記録し、針路・対地速度・到着の時刻・燃料を計算する。' },
      { q: '訓練で使われる覚え方 4C / 5C に含まれないものは？', choices: ['Climb', 'Communicate', 'あちこち飛び回って探す（Cruise around）', 'Comply'], answer: 2, why: '4C は Climb・Communicate・Confess・Comply（＋Conserve で 5C）。あてもなく飛び回ると、燃料と時間を失う（本文「現在地を見失ったとき」の節・PHAK 第 16 章）。' },
      { q: '対地速度 105 kt で 14 NM 先の空港までの、およその時間は？', choices: ['約 4 分', '約 8 分', '約 14 分', '約 20 分'], answer: 1, why: '105 kt は約 1.75 NM/分。14 ÷ 1.75 ＝ 8 分（本文「目的地変更」の節の目安の計算）。' },
      { q: 'VFR の飛行計画を開く（activate）のは誰？', choices: ['出発空港の管制塔が自動で', 'パイロット（連絡先は FSS など。または、出すときに決めた出発時刻で開く）', '目的地の管制塔', '開く必要はない'], answer: 1, why: '米国の AIM 5-1-5：開くのはパイロット。管制塔は自動では開かない。閉じるのもパイロットで、管制塔は自動では閉じない（5-1-14）。' },
      { q: 'VFR の飛行計画を閉じ忘れた。捜索救難の手続きが始まるのは、到着予定時刻のおよそ何分後？', choices: ['10 分', '30 分', '2 時間', '24 時間'], answer: 1, why: '米国の AIM 5-1-14：ETA から 30 分以内に報告か取り消しがないと、捜索救難の手続きが始まる。' },
      // W29（R3）：後ろに足すだけ（正解は A・C・D に散らす）
      { q: '目印が見つからず、位置に自信がなくなってきた。助けを求めるのはいつ？', choices: ['確かさが下がったと気づいた時点で、早めに', '完全に迷ったと確信してから', '燃料が少なくなってから', '日が沈んでから'], answer: 0, why: '確かさが下がった時点で認め、早めに伝える。最後に確かめた位置と時刻・高度・針路・燃料を伝える（本文「現在地を見失ったとき」の節・PHAK 第 16 章）。' },
      { q: '時間に余裕のある目的地変更で、代わりの空港を選ぶ考え方として正しいのは？', choices: ['いつも、いちばん近い空港を選ぶ', '燃料のことは着いてから考える', 'いま使える燃料から、案ごとの到着の見込みと要る余裕を同じ基準で比べる', '画面の Direct-To の線なら、そのまま飛べる'], answer: 2, why: '近くても滑走路・天気・時間・性能に合わなければ使えない。Direct-To の線も地形・空域・天気を確かめる（本文「目的地変更」の節・PHAK 第 16 章）。' },
      { q: '迷ったときの上昇について、正しいものは？', choices: ['どの場面でも、すぐに最大の高度まで上がる', '雲に入ってでも上がる', '許可の要る空域に入っても上がる', '他機・雲・空域に気をつけ、必要なら上がる'], answer: 3, why: 'PHAK 第 16 章：上がると電波とレーダーが届きやすく遠くまで見える。雲から離れていられる高さまでと、許可の要る空域の下まで（本文「現在地を見失ったとき」の節）。' },
    ],
    written: [
      ['予定の先で天気が変わり、目的地へまっすぐ進む案と、代わりの空港へ向かう案を比べている。地図の上で近いほうを選べばよいか。新しい区間の計算と、判断の材料を説明しなさい。', `近さだけで決めません。それぞれの案の向き・風・対地速度から時間と燃料を計算し直し、地形と空域、空港の使える条件、いまの天気とノータムを合わせて、いま使える燃料と要る余裕を比べます（${bk.see('nav.divert', '目的地変更')}）。`, ['kiso08.q26']],
      ['予定した目印が見えず、予想の位置と画面の表示にも自信がない。目印を探して、あてもなく針路を変え続けてよいか。位置が不確かなときの考え方を説明しなさい。', `よくありません。位置の予想がもっと難しくなります。操縦を続け、最後に確かめた位置・経過時間・針路を整理し、使える情報を比べながら、燃料と地形・空域の余裕を見て、早めに管制などへ助けを求めます（${bk.see('nav.lost', '現在地を見失ったとき')}）。`, ['kiso08.q27']],
      ['自分の航法の計画を説明する練習で、針路と予定の時刻を順に読み上げた。それだけで計画の根拠が伝わるか。前提・確かめ方・直す条件を含めた説明の組み立てを述べなさい（章末の課題）。', `伝わりません。使った航空図と情報の有効な日、風と速さの前提、距離と燃料の計算の根拠を示します。どこで何を使って位置を確かめるか、予定と違ったら何を直すか、代わりの案と、まだ分からない点も話します（${bk.see('nav.xc', '野外飛行の組み立て')}）。`, ['kiso08.q28']],
    ],
    refs: [R.phak, R.phak16, R.afh, R.ana1, R.aim51, R.aim62, R.aim63, R.acsP, R.cfr91], lessons: ['n2', 'n3'] });

  // ======================================================================= 第 3 部 第 30 章（新しい章）
  B.add({ id: 'night', part: 'p3', before: 'ifr', t: '夜間の飛行', en: 'Night operations',
    summary: '夜の空港の灯火・夜の目と錯覚・夜の準備と持ち物、夜の離陸と着陸・夜のエンジン故障。夜は外の手がかりが減るので、計画を厚くし、計器との照合を増やす。',
    secs: [
      { id: 'ops.night', t: '夜の空港・灯火・夜の目と錯覚・夜の準備', scope: 'common', from: ['kiso11.26', 'kiso10.5'], faa: ['PA.XI.A.K1', 'PA.XI.A.K2', 'PA.XI.A.K3', 'PA.XI.A.K4', 'PA.XI.A.K5', 'PA.XI.A.K6', 'PA.XI.A.K8', 'PA.II.D.K6', 'IR.VI.E.K2'], h: () => `
${bk.aim('夜は外の手がかりが減ります。夜の空港の灯火を読み、夜の目を守り、夜の飛行を計画できるようにします。')}
${FIG.nightLights()}
<p>飛行機の動き方は、昼も夜間（night）も同じです。変わるのは、操縦する人が使える外の手がかりです（AFH 第 11 章）。地面の目印と地平線が見えにくく、雲や視程の悪い所も見えにくくなります。</p>
<h4>夜の準備</h4>
<ul><li>天気：気温と露点の差が小さいと、霧のおそれがあります。夜は気づきにくい風も確かめます（AFH 第 11 章）。</li>
<li>経路：地形と障害物の高さ、灯火のある空港と、その灯火が使える時間を、ノータム（NOTAM）で確かめます。代わりの案も用意します。</li>
<li>持ち物：懐中電灯を少なくとも 1 本と、予備の電池を持ちます。白と赤に切り替えられ、暗くできるものが向いています（AFH 第 11 章）。</li></ul>
${bk.deep('灯火の一覧と、機体の点検・夜の操縦席と地上', `${bk.t(['灯火', '色と意味（AFH 第 11 章・米国の AIM 2-1）'], [['空港の灯台（beacon）', '白と緑が交互：灯火のある陸上の空港'], ['滑走路の縁', '白。計器進入の滑走路では、終わりの 2,000 ft（または長さの半分の短い方）が黄'], ['滑走路の端', '進入する機からは緑（進入端）、滑走路の上の機からは赤（終わり）'], ['誘導路', '縁は青、中心は緑'], ['障害物', '赤（点滅か点灯）']])}
<p>軍の空港の灯台は、緑の間に白が 2 回続けて光ります。障害物には、高い塔などに白の強い点滅を付けるものもあります。管制塔のない時間の空港では、無線の送信ボタンを押す回数で灯火をつけるもの（pilot-controlled lighting）があります。5 秒以内に 7 回押すといちばん明るくなり、最後に押してから 15 分つきます（米国の AIM 2-1-8）。周波数は Chart Supplement で確かめます。</p>
<p>外部点検（飛行前点検、preflight inspection）では、灯火を短くつけて確かめます。駐機場は、乗る前に懐中電灯で見回ります（AFH 第 11 章）。</p>
<p>操縦席の灯は、計器とスイッチが読める、いちばん暗い明るさにします。赤い灯は外の夜の目を守りますが、航空図の色をゆがめます。地図を読むときは、暗い白い灯を使います。暗くしすぎて、計器や要る表示を読めなくしてはいけません。EFB の画面も、夜の目をそこなわない明るさにします（AFH 第 11 章）。</p>
<p>地上滑走（タキシー、taxi）は、ゆっくり進みます。誘導路の線と標識・飛行場の図をたどり、少しでも食い違えば止まって確かめます。試運転（ランナップ、run-up）の間は、機体が前へ出ていかないようにブレーキを保ちます（AFH 第 11 章）。</p>`)}
${bk.deep('夜の航法と、米国の夜の訓練の決まり', `<p>夜の VFR の装備（米国の 14 CFR 91.205(c)）と規則の 3 つの「夜」は、${bk.see('law.aircraft', '機体の装備')} と ${bk.see('law.pilot', '操縦士の決まり')} で学びました。</p>
<p>夜の航法では、空港の灯台・灯のある障害物・町の明かり・大きな道路の車の灯が、よいチェックポイントになります。航路（コース、course）の線は、暗い所でも見やすい黒で引きます。町の明かりは遠くから見えるので、隣の図も用意します（AFH 第 11 章）。</p>
<p>米国の 14 CFR 61.109(a)(2) は、自家用の資格に、夜の訓練 3 時間を求めます。その中に、合計 100 NM を超える野外飛行（クロスカントリー、cross-country）1 回と、完全に止まるまでの離着陸 10 回が入ります。学生が夜に単独で飛ぶには、その空港での夜の離着陸と、近くの夜の航法の訓練が要ります。90 日以内の教官の裏書き（endorsement）も要ります（米国の 14 CFR 61.87(o)）。</p>`)}
${bk.judge('雲や視程の悪い所は、夜はほとんど見えません。地上の灯が少しずつ消えたり、灯のまわりがぼやけて見えたりしたら、前へ進まずに引き返す合図です（AFH 第 11 章）。必要な見え方が得られない見込みの地域は、はじめから避ける計画にします。')}
${bk.key('夜は外の手がかりが減る。計器と外を照らし合わせる', '空港の灯台は白と緑、滑走路の縁は白、誘導路の縁は青', '灯が消えたりぼやけたりしたら、前へ進まずに引き返す', '懐中電灯と予備の電池を持つ')}
${bk.warn('<b>ここに注意：</b>地上の灯の並びや星を地平線とまちがえたり（にせの水平線）、見つめた 1 つの灯が動いて見えたり（自動運動）します。姿勢指示器（水平儀、attitude indicator）で確かめます（AFH 第 11 章・' + bk.see('hf.body', '錯覚') + '）。')}
${bk.jur('night')}
${bk.recall('夜の目は、暗さに慣れるのに約 30 分かかり、明るい光で失います。暗い所では、見たい物の 5〜10° 横を見ます。', ['hf.vision', '夜の目（第 1 部）'])}
${bk.q('夜、空は晴れているが、予定の経路は灯の少ない海の上だ。昼と同じ計画でよい？', 'よくありません。晴れていても、地平線と高さの手がかりが足りません。その地域を避ける計画にし、続けるのが難しくなる前に引き返すか降ります。')}
${bk.photo('ch11-photo7')}` },
      { id: 'ops.nightld', t: '夜の離着陸と夜の緊急', scope: 'common', h: () => `
${bk.aim('夜の離陸（takeoff）・場周経路（トラフィックパターン、traffic pattern）・着陸で、昼と違う所を覚えます。夜にエンジンが止まったときにすることも覚えます。')}
${FIG.nightClimb()}
<p>夜の離陸の手順は、昼のふつうの離陸と同じです。違うのは、外の手がかりの多くが使えないことです（AFH 第 11 章）。滑走路の両側の縁の灯の間を保って加速し、ときどき計器で速度・姿勢・針路（ヘディング、heading）を確かめます。</p>
<p>浮揚すると、地面に近づいているのか離れているのかが分かりにくくなります。姿勢指示器・昇降計・高度計が、どれも上昇を示していることを確かめます。安全に旋回できる高度までは、旋回しません（AFH 第 11 章）。</p>
<h4>夜の場周経路と着陸</h4>
<p>夜は距離・高さ・速さの見当がずれます。高度計と速度を昼より多く見て、低く浅い進入を避けます（AFH 第 11 章）。位置や高さに少しでも疑いがあれば、着陸復行（ゴーアラウンド、go-around）をします。</p>
${bk.deep('知らない空港と、着陸灯の使い方', `<p>知らない空港では、まわりの灯にまぎれて、滑走路が近くまで見つからないことがあります。空港の灯台へ向かって飛び、滑走路の縁の灯が見分けられてから、場周経路に入ります。見えたら、着陸まで見失わないようにします（AFH 第 11 章）。着陸灯は、ふつう最終進入の半ばでつけます。夜は、接地の前の引き起こしを早く始めがちです。着陸灯に滑走路のタイヤの跡がはっきり見えるまで、同じ降下を続けてから引き起こします（AFH 第 11 章）。前に目印がないと、浮揚のあとに右の方向舵（ラダー、rudder）をゆるめて、左へそれやすくなります。</p>
<p>着陸灯は、高い所では地面まで届きません。もやや煙では光が目に返り、かえって見えにくくなります。上昇がしっかりしたら、衝突を避けるために使う場合を除き、消します（AFH 第 11 章）。</p>`)}
<h4>夜にエンジンが止まったら</h4>
<p>AFH 第 11 章は、次のことを挙げています。</p>
<ol><li>操縦を確実に保ち、最良滑空の形と速度にします。空港の方へ向けるか、家の多い所から離れます。</li>
<li>燃料の切り替え・マグネトー（magneto）など、止まった原因を確かめ、直せるならすぐに直して始動し直します。</li>
<li>管制か UNICOM に緊急を伝えます。交信中の周波数は、指示がなければ変えません。</li>
<li>着陸前のチェックリスト（checklist）を済ませ、着陸灯が点くかを高い所で確かめます。地形と障害物を照らせる早さでつけます。</li>
<li>いちばん遅い速度で、ふつうの着陸の姿勢で降ります。着陸灯が使えず外が見えないなら、地面に着くまで水平の着陸の姿勢を保ちます。</li></ol>
${bk.deep('降りる場所の選び方と、着陸灯を使わない着陸', `<p>近くの地形が分かっていて不時着（forced landing）に向いているなら、灯のない所へ向けて計画します（AFH 第 11 章）。人が来られる道の近くを選ぶと、助けが早く届きます。風の向きも意識して、追い風の着陸を避けます。降りたら、スイッチを全部切って、すばやく機体から出ます。</p>
<p>着陸灯を使わない着陸では、滑走路の向こうの端の灯が、機首より上に上がって見え始めたら、引き起こしを始めます。出力と機首で探るように、ゆっくり降ろします。夜の訓練では、緊急の手順として練習します（AFH 第 11 章）。</p>`)}
${bk.key('夜の離陸は、浮揚したら計器で上昇を確かめる', '安全な高度まで旋回しない', '低く浅い進入をしない。疑いがあれば着陸復行', '夜のエンジン故障：操縦 → 最良滑空 → 原因 → 伝える → 着陸灯')}
${bk.recall('PAPI は滑走路の左の 4 つの灯で、白 2・赤 2 が正しい進入角です。', ['ops.landing', '着陸'])}
${bk.q('夜、暗い所へ向かって浮揚した直後、外に目印がない。何で上昇を確かめる？', '姿勢指示器・昇降計・高度計の 3 つが、どれも上昇を示していることを確かめます。速度も見ます（AFH 第 11 章）。')}` },
    ],
    terms: [['Night', '夜間', '米国は市民薄明で区切る（14 CFR 1.1）'], ['Airport beacon', '空港の灯台', '白と緑：陸上の空港（AIM 2-1-9）'], ['Runway edge lights', '滑走路の縁の灯', '白。計器進入の滑走路は終わりの 2,000 ft が黄'], ['Threshold / Runway end lights', '進入端の灯（緑）・滑走路の終わりの灯（赤）', 'AIM 2-1-4'], ['Taxiway edge / centerline lights', '誘導路の縁の灯（青）・中心の灯（緑）', 'AIM 2-1-10'], ['Pilot-controlled lighting', '無線で操作する空港の灯火', '5 秒以内に 7 回で最も明るい（AIM 2-1-8）'], ['Black-hole approach', '暗い地域からの進入の錯覚', 'AFH 第 11 章'], ['Positive climb', '確かな上昇', '姿勢指示器・昇降計・高度計'], ['Round out', '引き起こし', 'タイヤの跡が見えてから']],
    examples: ['夜の野外飛行の計画：経路の空港の灯火と、使える時間をノータムで確かめる。灯台・灯のある障害物・町の明かりをチェックポイントに選ぶ。', '暗い所への離陸：浮揚したら、姿勢指示器・昇降計・高度計で上昇を確かめ、安全な高度まで旋回しない。'],
    cautions: ['夜の飛行は、この教材のシミュレータでは体験できない。夜の技能は、操縦教員との訓練で身につける。', '空港の灯火の色・灯台・無線で操作する灯火は米国の AIM 2-1 の例。実際は、その空港の Chart Supplement とノータムで確かめる。'],
    quiz: [
      { q: '米国の空港で、白と緑が交互に光る灯台が表すものは？', choices: ['灯火のある陸上の空港', '灯火のある水上の空港', 'ヘリポート', '障害物'], answer: 0, why: '米国の AIM 2-1-9：白と緑は陸上の空港。白と黄は水上の空港。障害物は赤（本文「夜の空港・灯火」の節・AFH 第 11 章）。' },
      { q: '誘導路の縁の灯の色は？', choices: ['白', '緑', '青', '赤'], answer: 2, why: '米国の AIM 2-1-10：誘導路の縁は青、中心は緑。滑走路の縁は白（AFH 第 11 章）。' },
      { q: '夜、暗い所へ離陸した直後に、上昇を確かめる計器の組み合わせは？', choices: ['磁気コンパスだけ', '燃料計と油圧計', '外の地平線だけ', '姿勢指示器・昇降計・高度計'], answer: 3, why: 'AFH 第 11 章：浮揚すると外の手がかりがなくなるので、3 つの計器がどれも上昇を示すことを確かめる（本文「夜の離着陸と夜の緊急」の節）。' },
      { q: '夜の飛行中、地上の灯が少しずつ見えなくなり、灯のまわりがぼやけてきた。どうする？', choices: ['そのまま進んで雲の上へ出る', '高度を下げて灯を探し続ける', '速度を上げて早く抜ける', '前へ進まずに引き返す'], answer: 3, why: 'AFH 第 11 章：地上の灯が消えていくのは視程が悪くなった最初の合図で、灯のまわりのぼやけは地上の霧のしるし（本文「夜の空港・灯火」の節）。' },
    ],
    written: [
      ['夜、空は晴れているが、予定の経路は地上の灯の少ない海の上だ。昼と同じ計画でよいか。', `よくありません。晴れていても、姿勢と高さの手がかりが足りません。地形・目標・灯火・装備・技能と代わりの案を確かめ、十分な見え方が得られない地域を避ける計画にします。続けるのが難しくなる前に、引き返すか降ります（${bk.see('ops.night', '夜の空港・灯火・夜の目と錯覚・夜の準備')}）。`, ['kiso11.q26']],
      ['夜の単発機の飛行で、エンジンが止まった。することを順に説明しなさい。', `操縦を確実に保って最良滑空の形と速度にし、空港の方か家の少ない方へ向けます。原因を確かめて直せるなら直し、管制か UNICOM に伝えます。着陸前のチェックリストを済ませ、着陸灯を早めにつけて、いちばん遅い速度で降ります（${bk.see('ops.nightld', '夜の離着陸と夜の緊急')}）。`],
    ],
    refs: [NEW_R.afh11, R.afh, R.aim21, R.aim81, R.phak17, R.cfr1, R.cfr61, R.cfr91205, R.cfr91, R.faaChartSupp, R.acsP], lessons: [] });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
