// FLIGHT LAB — book-jur.js : FL.jur, the US–Japan table of the combined book (合本): the 47 rules that are easy to mix up
// between the two countries (textbook/rewrite/combined/DESIGN.md 3.4「取り違えやすい 47 項目」).
// One row per item: { id, title, us, usSrc, usUrl, jp, jpArt, jpSrc, jpRefs, egov, w05, conf, boxes, gates, part7,
// safety, note }. The book draws every box from these rows (FL.book.bk.jur / bk.us / bk.jp / bk.same, the chapter-end
// table FL.book.jurTable and the appendix table FL.book.jurAppendix, all in book-core.js), so the same number is never
// written by hand in two places: the box where the US number is taught, the part's summary chapter (gN.japan) and Part 7
// all read this table (DESIGN 3.4「3 回会わせる」).
//   us / usSrc / usUrl  the US rule in plain words, the rule it comes from and its primary source. Checked on 2026-10-27
//                       against eCFR (14 CFR, 47 CFR, 49 CFR; up to date as of 2026-10-23), the AIM (Change 3, effective
//                       2026-07-09), FAA-S-ACS-6C (November 2023), FMH-1 (FCM-H1-2019) and NOAA's WMM-2025 calculator.
//   jp / jpArt / jpRefs the Japanese rule, the article(s) it comes from (always with the law's name: 航空法・航空法施行規則)
//                       and those articles as W05's copies name them (textbook/rewrite/sources/egov/: 'kokuho-kisoku:178').
//                       The numbers are those of the copies of the versions pinned there (LAWS below) and of W05's check
//                       (textbook/rewrite/sources/egov/jur-japan.json). jpSrc: a source outside the e-Gov copies.
//   egov                the laws (LAWS keys) whose version the Japanese column relies on (shown under each box).
//   w05 / conf          W05's finding for the Japanese column (confirmed・corrected・partial・not-egov・absent-in-egov)
//                       and 確度: 'confirmed' (確認済み) only when W05 confirmed it in the e-Gov copies; every other item is
//                       'unverified' (要確認), and its Japanese text says 〔要確認〕 where the check is still to be made.
//                       No number is written that was not checked (DESIGN 3.4「推測で埋めないもの」).
//   boxes / gates / part7  where the item is met: the sections that carry its box, the summary chapters (g1…g7) and
//                       the Part 7 sections (DESIGN 3.4's table). A link to a summary chapter or Part 7 is drawn only when
//                       that section is in the book (FL.book.findSection; DESIGN 6.2 rule 13).
//   safety              〔安全〕: a mix-up here can hurt (DESIGN 3.4).
// Plain text only (no HTML): the drawing escapes it. Data and lookups: it reads nothing else and draws nothing, so any
// product may load it before or after book-core.js (the parts look FL.jur up when a section is drawn). CADET loads it
// and keeps the US side (DESIGN 6.3).
(function (FL) {
  'use strict';
  const CHECKED = '2026-10-27';
  // the e-Gov versions the Japanese column cites (W05: textbook/rewrite/sources/egov/index.json; a new version there
  // means a new version here — flight-lab/test/jur.test.mjs compares them)
  const LAWS = Object.freeze({
    kokuho: Object.freeze({ title: '航空法', name: '航空法', num: '昭和二十七年法律第二百三十一号', version: '2025-12-01', label: '令和 7 年 12 月 1 日施行',
      revision: '327AC0000000231_20251201_507AC0000000055', url: 'https://laws.e-gov.go.jp/law/327AC0000000231/20251201_507AC0000000055', checked: CHECKED }),
    'kokuho-kisoku': Object.freeze({ title: '航空法施行規則', name: '航空法施行規則', num: '昭和二十七年運輸省令第五十六号', version: '2026-10-01', label: '令和 8 年 10 月 1 日施行',
      revision: '327M50000800056_20261001_508M60000800082', url: 'https://laws.e-gov.go.jp/law/327M50000800056/20261001_508M60000800082', checked: CHECKED }),
    'meiji19-choku51': Object.freeze({ title: '明治十九年勅令第五十一号（本初子午線経度計算方及標準時ノ件）', name: '明治十九年勅令第五十一号', num: '明治十九年勅令第五十一号', version: '1886-07-13', label: '明治 19 年 7 月 13 日公布',
      revision: '119IO0000000051_18860713_000000000000000', url: 'https://laws.e-gov.go.jp/law/119IO0000000051', checked: CHECKED }),
  });
  // the US sources (the editions read on CHECKED)
  const US = Object.freeze({
    ecfr: Object.freeze({ title: 'eCFR：14 CFR・47 CFR・49 CFR（2026-10-23 時点の版）', url: 'https://www.ecfr.gov/' }),
    aim: Object.freeze({ title: 'FAA Aeronautical Information Manual（Change 3・2026-07-09 発効）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/' }),
    pcg: Object.freeze({ title: 'FAA Pilot/Controller Glossary（AIM と同じ版）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/pcg_html/' }),
    acs: Object.freeze({ title: 'FAA-S-ACS-6C Private Pilot – Airplane ACS（2023 年 11 月）', url: 'https://www.faa.gov/training_testing/testing/acs/private_airplane_acs_6.pdf' }),
    fmh1: Object.freeze({ title: 'Federal Meteorological Handbook No. 1（FCM-H1-2019）', url: 'https://www.icams-portal.gov/resources/ofcm/fmh/FMH1/fmh1_2019.pdf' }),
    usc: Object.freeze({ title: '15 U.S.C. 260a・261（Uniform Time Act・標準時の区域）', url: 'https://www.law.cornell.edu/uscode/text/15/261' }),
    noaa: Object.freeze({ title: 'NOAA NCEI Magnetic Field Calculators（WMM-2025）', url: 'https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml' }),
  });
  const CONF = Object.freeze({ confirmed: '確認済み', unverified: '要確認' });
  const ECFR = s => `https://www.ecfr.gov/current/title-${s.split(':')[0]}/section-${s.split(':')[1]}`;
  const AIM = (c, s) => `https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap${c}_section_${s}.html`;
  const ACS = US.acs.url;
  const lawOf = ref => ref.split(':')[0];

  // one row; conf follows W05's finding, egov the laws of jpRefs (plus the laws a "not found in the law" finding read)
  function item(id, title, o) {
    const egov = [...new Set([...(o.jpRefs || []).map(lawOf), ...(o.egov || [])])];
    return Object.freeze({
      id, title, us: o.us, usSrc: o.usSrc, usUrl: o.usUrl, jp: o.jp, jpArt: o.jpArt || '', jpSrc: o.jpSrc || '',
      jpRefs: Object.freeze([...(o.jpRefs || [])]), egov: Object.freeze(egov), w05: o.w05,
      conf: o.w05 === 'confirmed' || o.w05 === 'corrected' ? 'confirmed' : 'unverified',
      boxes: Object.freeze([...o.boxes]), gates: Object.freeze([...o.gates]), part7: Object.freeze([...o.part7]),
      safety: !!o.safety, note: o.note || '',
    });
  }

  const items = [
    item('alt.transition', '転移高度・規正', {
      us: '18,000 ft MSL 未満は、経路上で 100 NM 以内の局の現在の高度計規正値。18,000 ft MSL 以上は 29.92 inHg',
      usSrc: '14 CFR 91.121', usUrl: ECFR('14:91.121'),
      jp: '平均海面から 14,000 ft 未満は、経路上の地点の QNH（出発地の QNH が得られないときは出発点の標高）。それ以外は標準気圧値 1013.2 hPa',
      jpArt: '航空法施行規則第 178 条', jpRefs: ['kokuho-kisoku:178'], w05: 'confirmed',
      boxes: ['basics.alt', 'inst.alt', 'wx.atm', 'ifr.rules'], gates: ['g1', 'g4'], part7: ['jair.rules', 'jifr.rules'] }),
    item('alt.unit', '規正値の単位', {
      us: 'inHg。METAR の規正値は A と 4 けた（A2992 は 29.92 inHg）',
      usSrc: 'AIM 7-1-28・7-1-29', usUrl: AIM(7, 1),
      jp: 'METAR の規正値は Q 群（hPa）。国内記事（RMK）に A 群（inHg）も書く。管制・ATIS で言う単位は〔要確認〕',
      jpSrc: '気象庁「航空気象通報式」第 3 版（改正第 17 号）の国内記事', w05: 'not-egov',
      boxes: ['basics.units', 'perf.da', 'inst.alt', 'wx.metar'], gates: ['g1'], part7: ['jwx.report', 'jatc.phrase'],
      note: 'Q 群は aviationweather.gov が配る RJTT・RJAA・RJCC の METAR（2026-10-27）で確かめた。国内記事の A 群（QNH を水銀柱のインチで。例 A2991）は気象庁「航空気象通報式」第 3 版（改正第 17 号、令和 7 年 8 月 7 日）https://www.jma.go.jp/jma/kishou/books/tsuhoshiki/koukuu/koukuu3_17.pdf の国内記事の規則 2.1 で確かめた（R1 の P5 の統合、2026-10-29。factcheck-basics S5）。国内記事は国内のみに通報する（同じ資料の解説 (5)）ので、aviationweather.gov の配信には出ない。管制・ATIS で言う単位は確かめていない（UNVERIFIED U.qnh-unit）' }),
    item('time', '時刻', {
      us: '東部標準時 EST＝UTC−5。夏時間 EDT＝UTC−4（3 月の第 2 日曜日から 11 月の第 1 日曜日まで）',
      usSrc: '15 U.S.C. 260a・261、49 CFR 71.2・71.4', usUrl: US.usc.url,
      jp: '日本標準時 JST＝UTC＋9（東経 135 度の子午線の時）。夏時間がないことは〔要確認〕',
      jpArt: '明治十九年勅令第五十一号', egov: ['meiji19-choku51'], w05: 'not-egov',
      boxes: ['basics.time'], gates: ['g1'], part7: ['jwx.report'],
      note: '勅令の本文は e-Gov（119IO0000000051）で確かめた（W05 の写しの外）' }),
    item('vmc', 'VMC（管制空域の低い所）', {
      us: 'Class C・D と 10,000 ft MSL 未満の Class E：飛行視程 3 SM、雲の下 500 ft・上 1,000 ft・横 2,000 ft',
      usSrc: '14 CFR 91.155(a)', usUrl: ECFR('14:91.155'),
      jp: '3,000 m 未満で管制区・管制圏・情報圏を飛ぶとき：飛行視程 5,000 m、上方 150 m・下方 300 m・水平 600 m の範囲に雲がない',
      jpArt: '航空法施行規則第 5 条', jpRefs: ['kokuho-kisoku:5'], w05: 'confirmed',
      boxes: ['law.vfr'], gates: ['g1'], part7: ['jair.vmc'] }),
    item('vmc.ad', '空港での離着陸', {
      us: '地表まで管制空域の空港：雲高 1,000 ft 未満なら雲の下を VFR で飛ばない。離着陸と場周には地上視程 3 SM（報告がなければ飛行視程 3 SM）',
      usSrc: '14 CFR 91.155(c)(d)', usUrl: ECFR('14:91.155'),
      jp: '管制圏・情報圏の空港などで離着陸するとき：地上視程 5,000 m 以上・雲高 300 m 以上（管制圏の空港で告示で指定したものは 8,000 m・450 m。どの空港かは〔要確認〕）',
      jpArt: '航空法施行規則第 5 条', jpRefs: ['kokuho-kisoku:5'], w05: 'confirmed',
      boxes: ['law.vfr'], gates: ['g1'], part7: ['jair.vmc'] }),
    item('svfr', '特別有視界', {
      us: '管制の許可を受け、雲から離れ、飛行視程 1 SM 以上。離着陸は地上視程 1 SM 以上。日の出から日没までのほかは、計器飛行の資格と装備が要る',
      usSrc: '14 CFR 91.157', usUrl: ECFR('14:91.157'),
      jp: '国土交通大臣の許可を受け、雲から離れ、飛行視程 1,500 m 以上、地表か水面を見続け、管制機関などと常時連絡を保つ（許可に別の条件があればそれに従う）',
      jpArt: '航空法第 94 条ただし書・航空法施行規則第 198 条の 4', jpRefs: ['kokuho:94', 'kokuho-kisoku:198_4'], w05: 'confirmed',
      boxes: ['law.special'], gates: ['g1'], part7: ['jair.vmc'] }),
    item('msa', '最低安全高度', {
      us: 'どこでも、エンジンが止まっても地上に危険なく不時着できる高度。密集地は半径 2,000 ft 内の最も高い障害物から 1,000 ft。それ以外は地表から 500 ft（水上と人家のまばらな所は、人・船・車・建物から 500 ft）',
      usSrc: '14 CFR 91.119', usUrl: ECFR('14:91.119'),
      jp: '動力装置だけが止まっても地上の人や物件に危険なく着陸できる高度と比べて、高いほう。密集地は水平 600 m 内の最も高い障害物の上端から 300 m。人家のない地域と広い水面は人や物件から 150 m。そのほかは地表か水面から 150 m',
      jpArt: '航空法第 81 条・航空法施行規則第 174 条', jpRefs: ['kokuho:81', 'kokuho-kisoku:174'], w05: 'confirmed',
      boxes: ['law.rules'], gates: ['g1'], part7: ['jair.rules'] }),
    item('cruise', 'VFR の巡航高度', {
      us: '地表から 3,000 ft を超え 18,000 ft MSL 未満：磁航路 0〜179° は奇数千 ft＋500 ft、180〜359° は偶数千 ft＋500 ft',
      usSrc: '14 CFR 91.159', usUrl: ECFR('14:91.159'),
      jp: '地表か水面から 900 m 以上で巡航するとき（29,000 ft 未満）。磁方位 0° 以上 180° 未満は 1,000 ft の奇数倍＋500 ft、180° 以上 360° 未満は偶数倍＋500 ft',
      jpArt: '航空法第 82 条・航空法施行規則第 177 条', jpRefs: ['kokuho:82', 'kokuho-kisoku:177'], w05: 'confirmed',
      boxes: ['nav.log'], gates: ['g3'], part7: ['jair.rules'] }),
    item('speed', '速度', {
      us: '10,000 ft MSL 未満は指示対気速度 250 kt 以下。Class C・D の主空港から 4 NM 内で地表から 2,500 ft 以下と、Class B の下は 200 kt 以下',
      usSrc: '14 CFR 91.117', usUrl: ECFR('14:91.117'),
      jp: '管制圏と、管制圏に接続する進入管制区のうち告示で指定する空域で、指示対気速度 250 kt 以下（高さでは決めない）',
      jpArt: '航空法第 82 条の 2・航空法施行規則第 179 条', jpRefs: ['kokuho:82_2', 'kokuho-kisoku:179'], w05: 'confirmed',
      boxes: ['law.rules'], gates: ['g1'], part7: ['jair.rules'] }),
    item('fuel.vfr', 'VFR の燃料', {
      us: '最初の着陸予定地まで飛び、さらに巡航速度で昼は 30 分・夜は 45 分飛べる燃料（風と予報を考える）',
      usSrc: '14 CFR 91.151', usUrl: ECFR('14:91.151'),
      jp: '燃料の量を法令で決めるのは、航空運送事業の機と計器飛行方式の飛行だけ。自家用・訓練の VFR に法定の最低量はない（機長は出発前に燃料の量と品質を確かめる）',
      jpArt: '航空法第 63 条・航空法施行規則第 153 条・航空法第 73 条の 2・航空法施行規則第 164 条の 15',
      jpRefs: ['kokuho:63', 'kokuho-kisoku:153', 'kokuho:73_2', 'kokuho-kisoku:164_15'], w05: 'confirmed',
      boxes: ['perf.fuel', 'nav.log', 'law.rules'], gates: ['g1', 'g3'], part7: ['jair.fpl'], safety: true }),
    item('fuel.ifr', 'IFR の燃料（一般機）', {
      us: '最初の着陸予定空港まで、要るときは代替空港まで飛び、さらに巡航速度で 45 分',
      usSrc: '14 CFR 91.167', usUrl: ECFR('14:91.167'),
      jp: '着陸地まで（代替空港等を飛行計画に書くときはそこまで）飛び、さらに巡航高度で 45 分（航空運送事業でない飛行機）',
      jpArt: '航空法施行規則第 153 条', jpRefs: ['kokuho-kisoku:153'], w05: 'confirmed',
      boxes: ['ifr.rules'], gates: ['g4'], part7: ['jifr.rules'] }),
    item('fpl', '飛行計画', {
      us: 'VFR の飛行計画は、米国本土ではふつう要らない（防空識別圏と国際線は要る）。出すことを強く勧める',
      usSrc: 'AIM 5-1-5', usUrl: AIM(5, 1),
      jp: 'VFR でも通報が原則（出発地から半径 9 km 内を飛んでその中に着陸するときを除く）。飛行を終えたら到着を通知する',
      jpArt: '航空法第 97 条・航空法施行規則第 205 条・航空法第 98 条', jpRefs: ['kokuho:97', 'kokuho-kisoku:205', 'kokuho:98'], w05: 'confirmed',
      boxes: ['nav.xc'], gates: ['g3'], part7: ['jair.fpl'] }),
    item('row', '進路権', {
      us: '遭難機が最優先。種類が違うときは、気球 → 滑空機 → ほかの機を曳航・給油している機 → 飛行船 → ほかの動力機 の順。同じ種類は右の機が優先。正面は互いに右へ。追い越す機は右へ',
      usSrc: '14 CFR 91.113(c)〜(f)', usUrl: ECFR('14:91.113'),
      jp: '滑空機 → 物件を曳航している航空機 → 飛行船 → 飛行機・回転翼航空機・動力で推進している滑空機 の順（気球の項はない）。同順位は相手を右に見る機が譲る。正面は互いに右へ。追い越しは右側を通る。進路権のある機は進路と速度を保つ',
      jpArt: '航空法施行規則第 180 条〜第 186 条', jpRefs: ['kokuho-kisoku:180', 'kokuho-kisoku:181', 'kokuho-kisoku:182', 'kokuho-kisoku:183', 'kokuho-kisoku:184', 'kokuho-kisoku:185', 'kokuho-kisoku:186'], w05: 'confirmed',
      boxes: ['law.rules'], gates: ['g1'], part7: ['jair.rules'] }),
    item('lookout', '見張り', {
      us: '天候が許す限り、IFR でも VFR でも、操縦する人は見張って他機を避ける',
      usSrc: '14 CFR 91.113(b)', usUrl: ECFR('14:91.113'),
      jp: '外が見えない気象状態のときを除き、管制の指示に従っていても、他機などと衝突しないよう見張る（練習で監督者が同乗するときは監督者）',
      jpArt: '航空法第 71 条の 2', jpRefs: ['kokuho:71_2'], w05: 'confirmed',
      boxes: ['hf.vision'], gates: ['g1'], part7: ['jlaw.pic'] }),
    item('pattern', '場周経路', {
      us: '管制塔の運用がない空港（Class G・E）は、標示か灯火の指示がなければ全部左旋回。場周の高度はプロペラ機で地表から 1,000 ft を勧める',
      usSrc: '14 CFR 91.126(b)・91.127(a)、AIM 4-3-3', usUrl: ECFR('14:91.126'),
      jp: '左回りとする一般の定めはない。空港等ごとに決めた飛行の方式と、管制の指示に従う',
      jpArt: '航空法施行規則第 189 条・航空法第 96 条', jpRefs: ['kokuho-kisoku:189', 'kokuho:96'], w05: 'confirmed',
      boxes: ['ops.pattern'], gates: ['g2'], part7: ['jair.vfr'] }),
    item('night', '夜の定義', {
      us: '夕方の市民薄明の終わりから、朝の市民薄明の始まりまで',
      usSrc: '14 CFR 1.1', usUrl: ECFR('14:1.1'),
      jp: '日没から日出まで',
      jpArt: '航空法第 64 条', jpRefs: ['kokuho:64'], w05: 'confirmed',
      boxes: ['ops.night', 'law.pilot'], gates: ['g3'], part7: ['jlaw.ops'] }),
    item('solo', '学生の単独飛行', {
      us: '学生操縦士の資格（16 歳以上・英語）。単独飛行の前に、教官の学科の試験・決められた訓練・その型式の承認（訓練をした教官が、飛ぶ日の前 90 日以内にログブックに書く。そのあとは 90 日ごとに書き足す）',
      usSrc: '14 CFR 61.83・61.87(b)(c)(n)(p)', usUrl: ECFR('14:61.87'),
      jp: '国土交通大臣の操縦練習許可（有効期間は 1 年以内）を受け、操縦教員の監督の下で練習する。初めての単独飛行は、監督者が同乗した離着陸の練習に続く昼間の場周飛行',
      jpArt: '航空法第 35 条・航空法施行規則第 68 条・航空法施行規則第 69 条の 2', jpRefs: ['kokuho:35', 'kokuho-kisoku:68', 'kokuho-kisoku:69_2'], w05: 'confirmed',
      boxes: ['solo.req'], gates: ['g2'], part7: ['jlaw.license'] }),
    item('check.slow', '実地試験：低速飛行', {
      us: 'それ以上迎え角か荷重を増やすか出力を絞ると失速警報が出る速度で飛び、警報を出さない。高度 ±100 ft・針路 ±10°・速度 +10/−0 kt・バンク ±10°',
      usSrc: 'FAA-S-ACS-6C PA.VII.A', usUrl: ACS,
      jp: '操縦士実地試験実施細則の科目と許容幅は〔要確認〕', w05: 'not-egov',
      boxes: ['ops.slow'], gates: ['g2'], part7: ['jexam.check'] }),
    item('check.stall', '実地試験：失速', {
      us: '失速の兆候を認め、完全に失速したらすぐに回復する（POH の手順）。直線は針路 ±10°、旋回はバンク 20° 以内で ±10°',
      usSrc: 'FAA-S-ACS-6C PA.VII.B・C', usUrl: ACS,
      jp: '操縦士実地試験実施細則の失速の科目と回復の基準は〔要確認〕', w05: 'not-egov',
      boxes: ['ops.stall'], gates: ['g2'], part7: ['jexam.check'] }),
    item('check.short', '実地試験：短距離離陸', {
      us: '推奨の速度で浮揚し、障害物を越えるか地表から 50 ft までは推奨の障害物越えの速度か Vx（+10/−5 kt）、そのあと Vy（+10/−5 kt）',
      usSrc: 'FAA-S-ACS-6C PA.IV.E', usUrl: ACS,
      jp: '操縦士実地試験実施細則の短距離離陸の手順と許容幅は〔要確認〕', w05: 'not-egov',
      boxes: ['ops.short'], gates: ['g2'], part7: ['jexam.check'] }),
    item('check.basic', '実地試験：基本計器飛行', {
      us: '高度 ±200 ft・針路 ±20°・速度 ±10 kt',
      usSrc: 'FAA-S-ACS-6C PA.VIII', usUrl: ACS,
      jp: '操縦士実地試験実施細則の許容幅は〔要確認〕', w05: 'not-egov',
      boxes: ['ifr.scan'], gates: ['g4'], part7: ['jexam.check'] }),
    item('alcohol', '飲酒', {
      us: '飲んでから 8 時間以内、酒の影響があるとき、アルコール濃度が 0.04 以上（血液 1 dL か呼気 210 L あたりのグラム）のときは乗務しない',
      usSrc: '14 CFR 91.17(a)', usUrl: ECFR('14:91.17'),
      jp: '酒の影響で正常な運航ができないおそれがある間は業務をしない（自家用の操縦者も対象）。通達：原則として体にアルコールがある状態で業務をしない。血液 1 L あたり 0.2 g 以上か呼気 1 L あたり 0.09 mg 以上は、そのおそれがある状態の目安（その後の改正は〔要確認〕）',
      jpArt: '航空法第 70 条', jpSrc: '国土交通省航空局長通達（平成 31 年 1 月 31 日・国空航第 2278 号）', jpRefs: ['kokuho:70', 'kokuho:69'], w05: 'partial',
      boxes: ['hf.self'], gates: ['g1'], part7: ['jlaw.pic'], safety: true,
      note: '通達の本文は https://www.mlit.go.jp/common/001271263.pdf（W05 と W06 が 2026-10-27 に読んだ）' }),
    item('medical', '身体検査', {
      us: '第 1〜3 種。自家用・学生は第 3 種以上か、条件を満たせば BasicMed',
      usSrc: '14 CFR 61.23', usUrl: ECFR('14:61.23'),
      jp: '第一種・第二種。自家用操縦士は第一種か第二種、事業用操縦士は第一種',
      jpArt: '航空法第 31 条・航空法施行規則第 61 条の 2', jpRefs: ['kokuho:31', 'kokuho-kisoku:61_2'], w05: 'corrected',
      boxes: ['intro.cert', 'hf.self'], gates: ['g1'], part7: ['jlaw.license'] }),
    item('english.radio', '英語・無線の資格', {
      us: '学生・自家用などの操縦士の資格には、英語を読み・話し・書き・理解できることが要る。国内の飛行で VHF の無線電話を使うのに無線の資格は要らない',
      usSrc: '14 CFR 61.83(c)・61.103(c)、47 CFR 87.89(d)', usUrl: ECFR('47:87.89'),
      jp: '航空英語能力証明は、本邦内と本邦外の間の航行など省令で決める航行で要る（国内だけの飛行には要らない）。無線の送信に要る資格（電波法の無線従事者）は〔要確認〕',
      jpArt: '航空法第 33 条・航空法施行規則第 63 条の 4・航空法第 28 条ただし書', jpRefs: ['kokuho:33', 'kokuho-kisoku:63_4', 'kokuho:28'], w05: 'partial',
      boxes: ['intro.cert', 'radio.equip'], gates: ['g1'], part7: ['jlaw.license'] }),
    item('oxygen', '酸素', {
      us: '客室の気圧高度が 12,500 ft を超え 14,000 ft までで 30 分を超える分は乗員が酸素を使う。14,000 ft を超えたら乗員はずっと使う。15,000 ft を超えたら全員に用意する',
      usSrc: '14 CFR 91.211(a)', usUrl: ECFR('14:91.211'),
      jp: '航空法と航空法施行規則には、操縦者が酸素を使う決まりの条が見当たらない。告示・通達などの定めは〔要確認〕',
      egov: ['kokuho', 'kokuho-kisoku'], w05: 'absent-in-egov',
      boxes: ['hf.altitude'], gates: ['g1'], part7: ['jlaw.pic'] }),
    item('light', '灯火信号', {
      us: '赤と緑の交互は、地上でも空中でも「十分注意」。白の点滅は地上だけ（出発点に戻れ）で、空中での意味はない',
      usSrc: '14 CFR 91.125・AIM 4-3-13', usUrl: ECFR('14:91.125'),
      jp: '連絡方法と信号は施行規則が告示に任せていて、日本の扱いは〔要確認〕。ICAO の信号では、空中の白の点滅は「着陸してエプロンへ」で、赤と緑の交互はない〔要確認〕',
      jpArt: '航空法施行規則第 202 条', jpRefs: ['kokuho-kisoku:202'], w05: 'not-egov',
      boxes: ['comm.nordo'], gates: ['g1'], part7: ['jatc.emerg'] }),
    item('nordo.vfr', '無線の故障（VFR）', {
      us: 'トランスポンダーを 7600。VMC なら VFR を保ち、無理のない範囲で早めに（as soon as practicable）着陸する',
      usSrc: 'AIM 6-4-1・6-4-2（14 CFR 91.185(b) の考え方）', usUrl: AIM(6, 4),
      jp: '管制区・管制圏・情報圏で：有視界気象状態を保って飛び、安全に着陸できる最寄りの空港等に着陸し、直ちに管制機関に通報する。7600 は施行規則の本文になく、扱いは〔要確認〕',
      jpArt: '航空法施行規則第 206 条第 1 号', jpRefs: ['kokuho-kisoku:206'], w05: 'confirmed',
      boxes: ['comm.nordo'], gates: ['g1'], part7: ['jatc.emerg'] }),
    item('nordo.ifr', '無線の故障（IFR）', {
      us: '経路は 割り当て → レーダー誘導の行き先 → 予定と言われた経路 → 提出した経路（AVEF）。高度は 割り当て・最低 IFR 高度・予定と言われた高度 のうち最も高いもの。EFC か ETA に合わせて降下・進入する',
      usSrc: '14 CFR 91.185(c)', usUrl: ECFR('14:91.185'),
      jp: '承認を受けた航路で目的地の上空まで。故障前の指示の高度と大臣が定める最低の高度の高いほうを「国土交通大臣が定める時間」（〔要確認〕）まで保ち、そのあと飛行計画の高度。目的地の上空で進入予定時刻（なければ到着予定時刻）まで待ってから降下する',
      jpArt: '航空法施行規則第 206 条', jpRefs: ['kokuho-kisoku:206', 'kokuho:97'], w05: 'confirmed',
      boxes: ['ifr.rules'], gates: ['g4'], part7: ['jifr.rules'] }),
    item('readback', '復唱の範囲', {
      us: '高度・高度の制限・針路の指示（ベクター）・滑走路の指定（L・C・R まで）と、滑走路の hold short は全部。周波数とコードは、AIM が必ず復唱するとしているものではない',
      usSrc: 'AIM 4-4-7・4-3-18', usUrl: AIM(4, 4),
      jp: 'ICAO と日本は、コード・高度計規正値・周波数・速度も復唱し、滑走路に関わる指示は全部〔要確認〕', w05: 'not-egov',
      boxes: ['comm.readback'], gates: ['g1'], part7: ['jatc.phrase'] }),
    item('words', '言い方', {
      us: 'affirmative（はい）・verify（確かめて）・hold short（手前で止まる）',
      usSrc: 'Pilot/Controller Glossary・AIM 4-3-18', usUrl: US.pcg.url,
      jp: 'affirm・confirm。待機の位置は holding point と hold short の両方〔要確認〕', w05: 'not-egov',
      boxes: ['comm.words', 'comm.icao'], gates: ['g1'], part7: ['jatc.phrase'] }),
    item('xpdr', 'VFR のコード', {
      us: 'VFR は、管制の指示がなければ高度に関係なく 1200（Mode 3/A）',
      usSrc: 'AIM 4-1-20', usUrl: AIM(4, 1),
      jp: 'VFR のコードは〔要確認〕。告示で指定する空域を飛ぶ機は、モード A・C に応答するトランスポンダーを装備する',
      jpArt: '航空法施行規則第 146 条', jpRefs: ['kokuho-kisoku:146'], w05: 'not-egov',
      boxes: ['comm.xpdr'], gates: ['g1'], part7: ['jatc.radar'] }),
    item('adsb', 'ADS-B Out', {
      us: 'Class A・B・C と、決められた空港の 30 NM 内（10,000 ft MSL まで）で要る。48 州の 10,000 ft MSL 以上の Class E（地表から 2,500 ft 以下を除く）なども同じ',
      usSrc: '14 CFR 91.225', usUrl: ECFR('14:91.225'),
      jp: '航空法と航空法施行規則に ADS-B Out の定めは見当たらない。告示・AIP Japan の扱いは〔要確認〕',
      egov: ['kokuho', 'kokuho-kisoku'], w05: 'absent-in-egov',
      boxes: ['nav.efb'], gates: ['g3'], part7: ['jatc.radar'] }),
    item('lights.ac', '航空機の灯火（航空灯）', {
      us: '日没から日の出まで右舷灯・左舷灯・尾灯（位置灯）をつける。衝突防止灯を装備していればつける（安全のために消してよいときがある）',
      usSrc: '14 CFR 91.209', usUrl: ECFR('14:91.209'),
      jp: '夜間（日没から日出まで）に空中と地上を航行するときは、衝突防止灯・右舷灯・左舷灯・尾灯をつける',
      jpArt: '航空法第 64 条・航空法施行規則第 154 条', jpRefs: ['kokuho:64', 'kokuho-kisoku:154'], w05: 'corrected',
      boxes: ['sys.lights'], gates: ['g1'], part7: ['jlaw.aircraft'] }),
    item('aerobatic', '曲技飛行', {
      us: '密集地と人の集まりの上、空港の地表区域（Class B〜E）、連邦航空路の中心線から 4 NM 内、地表から 1,500 ft 未満、飛行視程 3 SM 未満では行わない。乗客を乗せてバンク 60° かピッチ 30° を超えるなら、全員が落下傘を着ける',
      usSrc: '14 CFR 91.303・91.307(c)', usUrl: ECFR('14:91.303'),
      jp: '密集地の上空・管制区・管制圏の外で、半径 500 m 内の最も高い障害物の上端から 500 m 以上のときだけ。飛行視程は、高さ 3,000 m 以上で 8,000 m 以上、未満で 5,000 m 以上（大臣の許可があれば別）',
      jpArt: '航空法第 91 条・航空法施行規則第 197 条〜第 197 条の 3', jpRefs: ['kokuho:91', 'kokuho-kisoku:197', 'kokuho-kisoku:197_2', 'kokuho-kisoku:197_3'], w05: 'confirmed',
      boxes: ['aero.turn'], gates: ['g1'], part7: ['jair.rules'] }),
    item('preflight', '出発前の確認', {
      us: 'どの飛行も、使う空港の滑走路長と離着陸距離。IFR か空港の近くでない飛行は、気象の報告と予報・燃料・代わりの案・管制の遅れも確かめる',
      usSrc: '14 CFR 91.103', usUrl: ECFR('14:91.103'),
      jp: '機長は、整備状況、離着陸の重量・重心位置・重量分布、航空情報、気象情報、燃料と滑油の量と品質、積載物の安全を確かめてから出発させる',
      jpArt: '航空法第 73 条の 2・航空法施行規則第 164 条の 15', jpRefs: ['kokuho:73_2', 'kokuho-kisoku:164_15'], w05: 'confirmed',
      boxes: ['perf.tol', 'wx.brief', 'ground.walk', 'law.pic'], gates: ['g1', 'g2'], part7: ['jlaw.pic'] }),
    item('docs', '機内の書類', {
      us: '耐空証明書（入口に掲示）と登録証明書。承認された飛行規程（AFM・POH）か、承認された資料・標示・表示板',
      usSrc: '14 CFR 91.203・91.9', usUrl: ECFR('14:91.203'),
      jp: '航空機登録証明書・耐空証明書・搭載用航空日誌・運用限界等指定書・飛行規程・飛行に適した航空図（航空運送事業は運航規程も）',
      jpArt: '航空法第 59 条・航空法施行規則第 144 条・航空法施行規則第 144 条の 2', jpRefs: ['kokuho:59', 'kokuho-kisoku:144', 'kokuho-kisoku:144_2'], w05: 'corrected',
      boxes: ['law.aircraft', 'ground.walk'], gates: ['g2'], part7: ['jlaw.aircraft'] }),
    item('accident', '事故の報告', {
      us: '事故と決められた重大インシデントは、最寄りの NTSB にすぐ知らせる',
      usSrc: '49 CFR 830.5', usUrl: ECFR('49:830.5'),
      jp: '事故は機長が国土交通大臣に報告する（できないときは使用者）。衝突や接触のおそれなど、事故が起きるおそれのある事態も報告する',
      jpArt: '航空法第 76 条・航空法第 76 条の 2', jpRefs: ['kokuho:76', 'kokuho:76_2'], w05: 'confirmed',
      boxes: ['law.pilot', 'emg.basic'], gates: ['g2'], part7: ['jlaw.ops'] }),
    item('ir.need', '計器飛行証明が要る飛行', {
      us: 'IFR で飛ぶとき、または VFR の最低気象条件より悪い天気で機長をするとき',
      usSrc: '14 CFR 61.3(e)', usUrl: ECFR('14:61.3'),
      jp: '計器飛行、110 km か 30 分を超える計器航法による飛行、計器飛行方式による飛行（事業用・自家用の技能証明の人）',
      jpArt: '航空法第 34 条・航空法施行規則第 66 条', jpRefs: ['kokuho:34', 'kokuho-kisoku:66'], w05: 'confirmed',
      boxes: ['basics.rules', 'intro.cert', 'ifr.rules'], gates: ['g4'], part7: ['jifr.rules'] }),
    item('ir.recent', '計器の最近の経験', {
      us: '飛ぶ月の前の 6 暦月に、計器進入 6 回・待機・電子航法でのコースの会合と追跡',
      usSrc: '14 CFR 61.57(c)', usUrl: ECFR('14:61.57'),
      jp: '180 日以内に計器飛行 6 時間（模擬計器飛行と、大臣が指定する模擬飛行装置などの経験を含む）',
      jpArt: '航空法第 69 条・航空法施行規則第 161 条', jpRefs: ['kokuho:69', 'kokuho-kisoku:161'], w05: 'confirmed',
      boxes: ['ifr.rules'], gates: ['g4'], part7: ['jifr.rules'] }),
    item('appr.ban', '進入の継続の禁止・IFR の離陸の最低気象条件', {
      us: 'Part 91 の一般機には、気象で進入の開始を禁じる規定も、IFR の離陸の最低気象条件もない（121.651・135.225・91.175(f) は事業者の規則）',
      usSrc: '14 CFR 91.175(f)・121.651・135.225', usUrl: ECFR('14:91.175'),
      jp: 'ある。計器飛行方式で離着陸する機は、最低気象条件未満なら離陸しない。進入限界高度より高い決まった地点で最低気象条件未満なら、進入を続けない',
      jpArt: '航空法施行規則第 189 条', jpRefs: ['kokuho-kisoku:189'], w05: 'confirmed',
      boxes: ['ifr.rules', 'ifr.dep'], gates: ['g4'], part7: ['jifr.minima'] }),
    item('hold', '待機の速度とバンク', {
      us: '最大速度：6,000 ft MSL まで 200 KIAS、6,001〜14,000 ft は 230 KIAS、14,001 ft 以上は 265 KIAS。バンクは 3°/秒・30°・FD を使うなら 25° のうち浅いもの',
      usSrc: 'AIM 5-3-8', usUrl: AIM(5, 3),
      jp: '速度とバンクは〔要確認〕（ICAO・AIP Japan）。時間・入り方・風の考え方が同じことも〔要確認〕', w05: 'not-egov',
      boxes: ['ifr.hold'], gates: ['g4'], part7: ['jifr.hold'] }),
    item('circle', '周回進入の区域', {
      us: 'TERPS。区域は滑走路の端からの円弧でつなぎ、半径は進入の区分と周回の高度で変わる',
      usSrc: 'AIM 5-4-20', usUrl: AIM(5, 4),
      jp: 'PANS-OPS（ICAO）の基準〔要確認〕', w05: 'not-egov',
      boxes: ['ifr.circle'], gates: ['g4'], part7: ['jifr.appr'] }),
    item('metar.taf', 'METAR と TAF の書き方', {
      us: 'METAR は毎時。視程は SM。G は最大瞬間風速（山と谷の差が 10 kt 以上のとき）。NWS の TAF は FM・TEMPO（1 回 1 時間未満）・PROB30（PROB40 は使わない）で、BECMG を使わない',
      usSrc: 'AIM 7-1-28・7-1-29、FMH-1 5.4.4、NWSI 10-813（2024-10-30）付録 B 2.9.4', usUrl: AIM(7, 1),
      jp: '例（RJTT・RJAA・RJCC）：METAR は毎正時と 30 分に出て、視程は m（9999）か CAVOK、NOSIG・TEMPO の予報が付く。TAF には BECMG・TEMPO が出る。G と TEMPO の基準と、FM・PROB を使うかは〔要確認〕',
      w05: 'not-egov',
      boxes: ['wx.metar', 'wx.taf'], gates: ['g1'], part7: ['jwx.report'],
      note: 'METAR と TAF の例は aviationweather.gov の配信（2026-10-27）。AIM 7-1-28 の TEMPO は「<1 hour」（DESIGN 3.4 と RULINGS R.tempo-length の「米国は 1 時間以内」とは違う：報告の 6）。AIM 7-1-29 の表はまだ PROB30/40 と「最初の 9 時間は使わない」を書くが、NWS の指示書 NWSI 10-813（2024-10-30）https://www.weather.gov/media/directives/010_pdfs/pd01008013curr.pdf は付録 B 2.9.4 で「PROB30 is the only PROB group used in NWS TAFs」とし、変更点の一覧に「Removed 9-hour PROB30 constraint in the first 9 hours」と書く（R1 の W12、factcheck2-R1 の M1。2026-10-29 に読んだ）。AIM が直ったら、この 1 文を消す' }),
    item('charts', '航空図と情報の入手', {
      us: 'セクショナルチャート・Chart Supplement（空港の情報）・1800wxbrief.com（気象・ノータム・飛行計画）',
      usSrc: 'AIM 9-1・7-1-2', usUrl: AIM(9, 1),
      jp: '区分航空図・AIP・SWIM・飛行援助センター〔要確認〕', w05: 'not-egov',
      boxes: ['nav.chart', 'nav.ff', 'wx.brief'], gates: ['g3'], part7: ['jair.vfr', 'jair.fpl', 'jatc.ats'] }),
    item('sbas', 'SBAS・偏差', {
      us: 'SBAS は WAAS。Sanford の磁気偏差は約 7°W（2026 年）',
      usSrc: 'AIM 1-1-18・NOAA WMM-2025', usUrl: US.noaa.url,
      jp: 'SBAS は MSAS（国土交通省 航空局。補強の信号はみちびき 3 号機から）。MSAS で飛べる進入の種類は〔要確認〕。磁気偏差は約 6°W（那覇）〜約 10.5°W（稚内）（2026 年）',
      jpSrc: '国土交通省 航空局「MSAS（衛星航法補強システム）」（資料 3-10）・NOAA WMM-2025', w05: 'not-egov',
      boxes: ['nav.gps', 'navb.north', 'sys.compass'], gates: ['g3'], part7: ['jifr.chart', 'jair.vfr'],
      note: '偏差は NOAA NCEI の計算機（WMM-2025、2026-10-27）：Sanford 7.09°W、那覇 5.87°W、羽田 7.88°W、新千歳 9.79°W、稚内 10.54°W。MSAS は国土交通省 航空局の資料 3-10 https://www.mlit.go.jp/koku/cidai/assets/pdf/3-10_JPN.pdf（題「MSAS（衛星航法補強システム）」、みちびき 3 号機（静止衛星）を使う、導入は国土交通省航空局）と、国土交通省の報道発表（平成 29 年 8 月 25 日）https://www.mlit.go.jp/report/press/kouku16_hh_000008.html（みちびき 3 号機は SBAS の信号を送る静止衛星）で確かめた（R1 の W12、factcheck2-R1 の S2。2026-10-29 に読んだ。原本の重ね表示 kiso-errata.js の msas と同じ資料）。MSAS で使える進入の種類（LPV など）は確かめていない' }),
    item('multi.rating', '多発の資格', {
      us: '多発の級の限定（AMEL）。級を足すときは、教官の裏書きを受けて実地試験に合格する。同じ資格の水準で飛行機の限定を持っていれば、学科試験は要らない',
      usSrc: '14 CFR 61.63(c)', usUrl: ECFR('14:61.63'),
      jp: '陸上多発の等級の限定。限定は実地試験に使った航空機で決まり、操縦士は陸上多発ピストン機で受けても、陸上多発ピストン機と陸上多発タービン機の両方の限定になる',
      jpArt: '航空法第 25 条・航空法施行規則第 53 条', jpRefs: ['kokuho:25', 'kokuho-kisoku:53'], w05: 'confirmed',
      boxes: ['intro.cert', 'me.perf'], gates: ['g5'], part7: ['jlaw.license'] }),
    item('ws.alert', 'ウィンドシャーの警報', {
      us: 'LLWAS（ウィンドシャーとガストフロント）や TDWR（マイクロバーストも）などの警報を、管制官が伝える',
      usSrc: 'AIM 4-3-7', usUrl: AIM(4, 3),
      jp: '空港気象ドップラーレーダーとドップラーライダーで、低層ウィンドシャーとマイクロバーストを探知し、パイロットに伝える。METAR は WS の群で報じる。管制がどう伝えるかは〔要確認〕',
      jpSrc: '気象庁 中部航空地方気象台「空港気象ドップラーレーダー」・気象庁「航空気象通報式」', w05: 'not-egov',
      boxes: ['wx.shear'], gates: ['g1'], part7: ['jwx.local'],
      note: '日本の欄は、気象庁 中部航空地方気象台のページ https://www.data.jma.go.jp/chubu-airport/ymyx/draw.html（空港気象ドップラーレーダーで低層ウィンドシアー（地表から概ね 500 m（1,600 ft）まで）を探知し、リアルタイムでパイロットに伝える）と、気象庁「航空気象通報式」の WS の群で確かめた（R1 の W12、factcheck2-R1 の S2。2026-10-29 に読んだ。原本の重ね表示 kiso-errata.js の llws-japan と同じ資料）。管制がどんな言い方で伝えるかは確かめていない（UNVERIFIED U.ws-alert-japan）' }),
  ];

  const byIdMap = new Map(items.map(x => [x.id, x]));
  if (byIdMap.size !== items.length) throw new Error('book-jur.js: an item id is listed twice');
  const has = (list, v) => list.includes(v);
  // every string a box draws for an item (the checks compare the numbers drawn with these)
  function textOf(it) {
    const laws = it.egov.map(k => `${LAWS[k].name} ${LAWS[k].label} ${LAWS[k].checked}`);
    return [it.title, it.us, it.usSrc, it.jp, it.jpArt, it.jpSrc, ...laws].filter(Boolean).join(' ');
  }
  FL.jur = Object.freeze({
    items: Object.freeze(items), LAWS, US, CONF, CHECKED,
    byId: id => byIdMap.get(id) || null,
    ofSection: secId => items.filter(x => has(x.boxes, secId)),
    ofGate: g => items.filter(x => has(x.gates, g)),
    ofPart7: secId => items.filter(x => has(x.part7, secId)),
    textOf,
  });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
