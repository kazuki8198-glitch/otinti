// FLIGHT LAB — book-core.js
// The textbook's frame: the parts (parts 1–6 in the order of the publicly described ANA cadet course; the parts before
// and after them are added by the file of their chapters: FL.book.addPart), the references (public
// sources: FAA handbooks, the ACS, the AIM, 14 CFR, ANA's public pages, published training material), the writing
// helpers (key points, cautions, formulas, self-check questions, "try it in the simulator", calculators, photos), and
// the lookups the pages use. The chapters themselves are in book-1.js … book-5.js, book-0.js and book-comm.js
// (FL.book.add); the figures in book-figs.js; the photos in book-photos.js (loaded after this file by FLIGHT LAB and
// TEXTBOOK, not by CADET).
(function (FL) {
  'use strict';
  const R = {
    ana1: { label: 'ANA「ボーイング777 パイロットになるまで Phase2〜基礎訓練編〜」（2025 年 10 月 22 日）', url: 'https://www.ana.co.jp/group/777_30th/20251022_2.html' },
    ana2: { label: 'ANA「未来の翼が生まれる場所へ〜フロリダの空で見た、ANAのDNA〜」（2025 年 10 月 29 日）', url: 'https://www.anahd.co.jp/ana_news/2025/10/28/20251028.html' },
    acron: { label: 'Acron Aviation USA — Aircraft fleet', url: 'https://acronaviationacademy.com/usa/about-us/aircraft-fleet/' },
    archer: { label: 'Piper Archer（Piper 公式）', url: 'https://www.piper.com/model/archer-tx/' },
    archerPoh: { label: 'Piper PA-28-181 Archer III Pilot\'s Operating Handbook（VB-2266・2013・公開されている写し）', url: 'https://www.andrews.edu/cp/aviation/resources/archeriii-poh.pdf', note: '速度の制限・制限荷重倍数（普通類・実用類）・スピンの禁止と回復の手順、重量と重心の範囲とアーム、燃料流量、通常の手順。実機はその機体の POH が優先' },
    piperTrainer: { label: 'Piper Trainer Brochure 2026（Archer TX・Seminole の仕様：エンジン・燃料・最大重量・離着陸距離）', url: 'https://www.piper.com/wp-content/uploads/2019/01/2026_Trainer_Brochure_V2.pdf' },
    seminoleCk: { label: 'Seminole PA-44-180 Pilot\'s Checklist（Middle Georgia State University・2025・公開資料）', url: 'https://ce.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Seminole_Checklist.pdf', note: 'Vxse 82・Vsse 82・Vlo 上げ 109 / 下げ 140・巡航上昇 105・ゴーアラウンド 88（フラップ 25）・Va 135（3,800 lb）/ 112（2,700 lb）' },
    seminole: { label: 'Piper Seminole（Piper 公式）', url: 'https://www.piper.com/model/seminole/' },
    archerCk: { label: 'Archer III w/ G1000 PA-28-181 Pilot\'s Checklist（Middle Georgia State University・2025・公開資料）', url: 'https://www.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Archer_Checklist.pdf', note: 'Vr 60・Vx 64・Vy 76・巡航上昇 87・最良滑空 76・進入 70 / 65・Va 113・Vfe 102・実証横風 17 kt など。訓練校ごとに版がある' },
    seminoleG: { label: 'Maneuver Guide Seminole (PA-44-180)（Southeastern Oklahoma State University・公開資料）', url: 'https://www.se.edu/aviation/wp-content/uploads/sites/4/2023/11/Seminloe-Guide-V1.0.pdf', note: 'Vmc 56・Vyse 88・Vsse 82・Vr 75・Vx 82・Vy 88・Va 135 など。表の Vxse 88 は、公開チェックリスト（82）と違う' },
    tcds: { label: 'FAA Type Certificate Data Sheet 2A13（Piper PA-28 シリーズ：Archer の速度制限・荷重倍数・フラップ）', url: 'https://drs.faa.gov/', note: 'FAA DRS（Dynamic Regulatory System）で「2A13」を検索' },
    garminCdi: { label: 'Garmin AXIS Pilot\'s Guide for Experimental Aircraft（190-03123-21）— CDI Scaling（Garmin の GPS の CDI の自動の目盛りの例。G1000 の Pilot\'s Guide ではない）', url: 'https://www8.garmin.com/manuals/webhelp/GUID-1FA95EDE-BA0A-4000-B109-7E73945389F7/EN-US/GUID-F35157A0-1CF4-4AAD-A042-35129CCF5C7D.html' },
    g1000: { label: 'Garmin G1000 Cockpit Reference Guide — Piper PA-28-181 Archer', url: 'https://static.garmin.com/pumac/190-01460-00_0A_Web.pdf' },
    phak: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）", url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak' },
    afh: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）', url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook' },
    afh13: { label: 'FAA Airplane Flying Handbook 第 13 章 Transition to Multiengine Airplanes', url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook' },
    afh15: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 16 章 Transition to Jet-Powered Airplanes', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/17_afh_ch16.pdf' },
    afh4: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 4 章 Energy Management: Mastering Altitude and Airspeed Control', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/05_afh_ch4.pdf' },
    afh5: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 5 章 Maintaining Aircraft Control: Upset Prevention and Recovery Training', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/06_afh_ch5.pdf' },
    safo: { label: 'FAA SAFO 13002 Manual Flight Operations（2013）', url: 'https://www.faa.gov/sites/faa.gov/files/other_visit/aviation_industry/airline_operators/airline_safety/SAFO13002.pdf' },
    saib1011: { label: 'FAA Special Airworthiness Information Bulletin（SAIB）CE-10-11 Electrical: Fire Hazard in Resetting Circuit Breakers（2009-12-23）', url: 'https://www.faasafety.gov/files/notices/2009/Dec/SAIB_CE-10-11.pdf', note: '飛行中に戻すのは飛行に必要なブレーカーだけ・1 分以上待つ・煙やこげたにおいがない・1 回だけ' },
    ifh: { label: 'FAA Instrument Flying Handbook（FAA-H-8083-15B）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-15B.pdf' },
    ifhB: { label: 'FAA Instrument Flying Handbook Addendum B — False Courses（偽のグライドスロープ・2019）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/ifh_addendum_b.pdf' },
    iph: { label: 'FAA Instrument Procedures Handbook（FAA-H-8083-16B）', url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/instrument_procedures_handbook' },
    wx: { label: 'FAA Aviation Weather Handbook（FAA-H-8083-28B・2026）', url: 'https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/faa-h-8083-28b-aviation-weather-handbook' },
    aim71: { label: 'FAA AIM 7-1 Meteorology（気象情報・雷雨・ウインドシア・METAR と TAF）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap7_section_1.html' },
    rmh: { label: 'FAA Risk Management Handbook（FAA-H-8083-2A）', url: 'https://www.faa.gov/regulationspolicies/handbooksmanuals/risk-management-handbook-faa-h-8083-2a' },
    wb: { label: 'FAA Aircraft Weight and Balance Handbook（FAA-H-8083-1B）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-1.pdf' },
    dalt: { label: 'FAA-P-8740-2 Density Altitude（FAA Safety Team の安全の手引き：密度高度の早見表・湿度）', url: 'https://www.faasafety.gov/files/gslac/library/documents/2011/Aug/56396/FAA%20P-8740-02%20DensityAltitude%5Bhi-res%5D%20branded.pdf' },
    aim81: { label: 'FAA AIM 8-1 Fitness for Flight（体調・低酸素・過呼吸・一酸化炭素・錯覚・目・衝突の回避）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap8_section_1.html' },
    aim: { label: 'FAA Aeronautical Information Manual（AIM）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/' },
    pcg: { label: 'FAA Pilot/Controller Glossary', url: 'https://www.faa.gov/air_traffic/publications/atpubs/pcg_html/' },
    aim42: { label: 'FAA AIM 4-2 Radio Communications Phraseology and Techniques（交信の言い方と技術）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_2.html' },
    aim43: { label: 'FAA AIM 4-3 Airport Operations（空港での運用・地上走行・灯火信号）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_3.html' },
    aim44: { label: 'FAA AIM 4-4 ATC Clearances and Aircraft Separation（4-4-7 許可と指示の復唱）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_4.html' },
    aim21: { label: 'FAA AIM 2-1 Airport Lighting Aids（空港の灯火・2-1-2 PAPI などの進入角の灯）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap2_section_1.html' },
    ac9066: { label: 'FAA AC 90-66C Non-Towered Airport Flight Operations（管制塔のない空港の運用・2023）', url: 'https://www.faa.gov/documentlibrary/media/advisory_circular/ac_90-66c.pdf' },
    aim23: { label: 'FAA AIM 2-3 Airport Marking Aids and Signs（空港の標示と標識・残り距離標識）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap2_section_3.html' },
    aim76: { label: 'FAA AIM 7-6 Potential Flight Hazards（7-6-7 山岳飛行と密度高度・7-6-8 滑走路の中間点の目安）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap7_section_6.html' },
    aim31: { label: 'FAA AIM 3-1 General（空域の基本・3-1-4 VFR の基本の気象条件）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap3_section_1.html' },
    aim32: { label: 'FAA AIM 3-2 Controlled Airspace（Class A〜E・3-2-4 の交信の確立）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap3_section_2.html' },
    aim34: { label: 'FAA AIM 3-4 Special Use Airspace（制限空域・MOA・警告空域・警戒空域）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap3_section_4.html' },
    aim35: { label: 'FAA AIM 3-5 Other Airspace Areas（3-5-3 一時的な飛行制限 TFR）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap3_section_5.html' },
    aim41: { label: 'FAA AIM 4-1 Services Available to Pilots（ATIS・CTAF・レーダー業務）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_1.html' },
    aim11: { label: 'FAA AIM 1-1 Air Navigation Radio Aids（1-1-9 ILS）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap1_section_1.html' },
    aim53: { label: 'FAA AIM 5-3 En Route Procedures（5-3-8 待機経路）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap5_section_3.html' },
    aim54: { label: 'FAA AIM 5-4 Arrival Procedures（5-4-5 進入図・VDP・RNAV 進入の最低気象条件、5-4-21 進入復行）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap5_section_4.html' },
    aim51: { label: 'FAA AIM 5-1 Preflight（5-1-5 VFR の飛行計画・5-1-14 飛行計画を閉じる）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap5_section_1.html' },
    aim61: { label: 'FAA AIM 6-1 General（6-1-2 すぐに助けを求める）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap6_section_1.html' },
    aim62: { label: 'FAA AIM 6-2 Emergency Services Available to Pilots（6-2-1 困っている VFR 機へのレーダーの援助・6-2-2 トランスポンダーの 7700）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap6_section_2.html' },
    aim63: { label: 'FAA AIM 6-3 Distress and Urgency Procedures（遭難・緊急通信）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap6_section_3.html' },
    aim52: { label: 'FAA AIM 5-2 Departure Procedures（出発の手順・Line Up and Wait）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap5_section_2.html' },
    aim64: { label: 'FAA AIM 6-4 Two-way Radio Communications Failure（無線の故障）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap6_section_4.html' },
    jo71: { label: 'FAA Order JO 7110.65 Air Traffic Control（管制官の方式基準・管制用語）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/atc_html/' },
    cap413: { label: 'UK CAA CAP 413 Radiotelephony Manual（英国の無線電話の手引き。第 24 版・2026-07-01 発効）', url: 'https://www.caa.co.uk/data-and-publications/publications/documents/content/cap-413/' },
    acsP: { label: 'FAA Private Pilot — Airplane ACS（FAA-S-ACS-6C）', url: 'https://www.faa.gov/training_testing/testing/acs/private_airplane_acs_6.pdf' },
    acsC: { label: 'FAA Commercial Pilot — Airplane ACS（FAA-S-ACS-7B）', url: 'https://www.faa.gov/training_testing/testing/acs/commercial_airplane_acs_7.pdf' },
    acsI: { label: 'FAA Instrument Rating — Airplane ACS（FAA-S-ACS-8C）', url: 'https://www.faa.gov/training_testing/testing/acs/instrument_rating_airplane_acs_8.pdf' },
    ac120108: { label: 'FAA AC 120-108A Continuous Descent Final Approach（CDFA・2023）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-108A.pdf' },
    cfr141: { label: '14 CFR Part 141（訓練校・141.85 主任教官の責任と段階審査）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-141' },
    ac6165: { label: 'FAA AC 61-65K Certification: Pilots and Flight and Ground Instructors（承認の文例・2025-11-14）', url: 'https://www.faa.gov/documentlibrary/media/advisory_circular/AC_61-65K.pdf' },
    cfr61: { label: '14 CFR Part 61（操縦士の資格）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61' },
    cfr91: { label: '14 CFR Part 91（一般運航・飛行規則）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91' },
    cfr67: { label: '14 CFR Part 67（航空身体検査の基準）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-67' },
    cfr121: { label: '14 CFR Part 121（エアラインの運航規則）— 121.436 操縦士の資格', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-121/subpart-M/section-121.436' },
    cfr23: { label: '14 CFR Part 23（普通類の飛行機の耐空性）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-23' },
    sfb: { label: 'FAA From the Flight Deck: Orlando Sanford（SFB）', url: 'https://www.faa.gov/flight_deck/sfb' },
    sfbData: { label: 'AirNav：KSFB Orlando Sanford International Airport（FAA の空港データ。2026-10-01 有効。滑走路の位置・長さ・場周の向き）', url: 'https://www.airnav.com/airport/KSFB' },
    vfr: { label: 'FAA VFR Charts（セクショナルチャート）', url: 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/vfr/' },
    chartUG: { label: 'FAA Chart Users\' Guide（チャートの記号の手引き・2026-07-09 有効の版）', url: 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/aero_guide/' },
    awc: { label: 'Aviation Weather Center（METAR・TAF・気象情報）', url: 'https://aviationweather.gov/' },
    nwsi10813: { label: 'NWS Instruction 10-813 Terminal Aerodrome Forecasts（米国の国立気象局の TAF の指示書・2024-10-30）', url: 'https://www.weather.gov/media/directives/010_pdfs/pd01008013curr.pdf', note: '4.10 定時の TAF（00・06・12・18Z）、付録 A の TEMPO（1 回 1 時間未満）' },
    flRain: { label: 'NWS Melbourne「The Florida Rain Machine」（フロリダの夏の雷雨と海風）', url: 'https://www.weather.gov/mlb/flrainmachine' },
    tem: { label: 'SKYbrary: Threat and Error Management (TEM)', url: 'https://skybrary.aero/articles/threat-and-error-management-tem' },
    crm: { label: 'SKYbrary: Crew Resource Management (CRM)', url: 'https://skybrary.aero/articles/crew-resource-management-crm' },
    icaoTEM: { label: 'ICAO Doc 9683 Human Factors Training Manual（第 1 版 1998。2003 年の改訂（Amendment 1）で、第 2 部第 2 章「CRM 訓練」に TEM の節を追加。ICAO の販売文書）', url: 'https://www.icao.int/' },
    cfr614: { label: '14 CFR 61.4 飛行シミュレータと飛行訓練装置の認定と承認', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.4' },
    ac61136: { label: 'FAA AC 61-136B FAA Approval of Aviation Training Devices and Their Use for Training and Experience（2018）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_61-136B.pdf' },
    aopaChair: { label: 'AOPA Air Safety Institute「Training and Safety Tip: Master the chair」（2024-07-23・参考）', url: 'https://www.aopa.org/news-and-media/all-news/2024/july/23/training-and-safety-tip-master-the-chair' },
    authGrad: { label: 'SKYbrary: Authority Gradients（権威勾配が急すぎるとき・平らすぎるとき）', url: 'https://skybrary.aero/articles/authority-gradients' },
    cfr121404: { label: '14 CFR 121.404 CRM・DRM の訓練（乗員・客室乗務員・運航管理者）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-121/subpart-N/section-121.404' },
    temOps: { label: 'SKYbrary: Threat and Error Management (TEM) in Flight Operations（脅威・エラー・UAS の定義）', url: 'https://skybrary.aero/articles/threat-and-error-management-tem-flight-operations' },
    ac12051: { label: 'FAA AC 120-51E Crew Resource Management Training（2004）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC120-51e.pdf' },
    safo15011: { label: 'FAA SAFO 15011 Roles and Responsibilities for Pilot Flying (PF) and Pilot Monitoring (PM)（2015）', url: 'https://www.faa.gov/sites/faa.gov/files/other_visit/aviation_industry/airline_operators/airline_safety/SAFO15011.pdf' },
    nasaCrm: { label: 'NASA CP-2120 Resource Management on the Flight Deck（1979 年のワークショップ・1980）', url: 'https://ntrs.nasa.gov/citations/19800013796' },
    upset: { label: 'FAA AC 120-111 Upset Prevention and Recovery Training（Change 1 付き）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-111_CHG_1_Ed_Upd_3.pdf' },
    ac120123: { label: 'FAA AC 120-123 Flightpath Management（2022）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-123.pdf' },
    safo17007: { label: 'FAA SAFO 17007 Manual Flight Operations Proficiency（2017）', url: 'https://www.faa.gov/sites/faa.gov/files/other_visit/aviation_industry/airline_operators/airline_safety/SAFO17007.pdf' },
    automation: { label: 'FAA AC 120-71B Standard Operating Procedures and Pilot Monitoring Duties for Flight Deck Crewmembers（2017）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-71B.pdf' },
    mag: { label: 'NOAA 磁気偏差計算（Magnetic Field Calculators）', url: 'https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml' },
  };
  // parts 1–6 (phase: the syllabus's stages that go with the part). The front part p0 (序部, book-0.js) and Part 7 (p7,
  // book-7.js) are not written here: the file that holds a part's chapters adds it (addPart below), so a product that
  // does not read that file has no such part (textbook/rewrite/combined/DESIGN.md 3.1)
  const PARTS = [
    { id: 'p1', title: '第 1 部　地上学科（英語の座学）', phase: 'p1' },
    { id: 'p2', title: '第 2 部　Sanford・Piper Archer の基礎操縦', phase: 'p2' },
    { id: 'p3', title: '第 3 部　航法・目的地変更', phase: 'p3' },
    { id: 'p4', title: '第 4 部　計器飛行', phase: 'p4' },
    { id: 'p5', title: '第 5 部　Piper Seminole・多発', phase: 'p5' },
    { id: 'p6', title: '第 6 部　CRM・TEM・ジェットと自動化への準備', phase: 'p6' },
  ];
  // writing helpers (they return HTML; the textbook is static, trusted content)
  const lst = items => `<ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>`;
  const attr = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const site = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return '出典'; } };
  const link = (u, t) => `<a href="${attr(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`;
  // a photo from book-photos.js (FL.bookPhotos): nothing when that file is not loaded (CADET) or the id is not there
  const photo = id => {
    const p = FL.bookPhotos && FL.bookPhotos[id]; if (!p) return '';
    const c = p.credit;
    return `<figure class="bk-photo" data-photo="${attr(id)}"><img src="${p.src}" alt="${attr(p.alt)}"${p.w ? ` width="${p.w}" height="${p.h}"` : ''} loading="lazy" decoding="async">`
      + `<figcaption>写真：${p.caption}<span class="bk-credit">作者：${attr(c.author)}・ライセンス：${link(c.licenseUrl, attr(c.license))}・${link(c.source, '出典（' + site(c.source) + '）')}・縮小などの加工あり</span></figcaption></figure>`;
  };
  // ---- the US–Japan boxes (textbook/rewrite/combined/DESIGN.md 3.4; the data: FL.jur in book-jur.js) ----
  // bk.jur(...ids): the two countries side by side (stacked on a phone), one row per FL.jur item (data-jur="<id>");
  // bk.us(x)・bk.jp(x)・bk.same(x): one side — x is an FL.jur item id (drawn from the data) or the box's HTML.
  // The Japanese side (bk.jp, bk.same, the 日本 column and the line under bk.jur: class jur-jp) is what CADET leaves out;
  // the US side stays there as 「米国の決まり」 (DESIGN 6.3). A link to Part 7 is drawn only when that section is in the
  // book now (findSection), and only on the Japanese side: no link without a target (DESIGN 6.2 rules 6 and 13).
  // Nothing is drawn when book-jur.js is not loaded; an id that FL.jur does not have is an error (a typo must not hide).
  const JUR_ID = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)*$/;
  const jurData = () => (FL.jur && typeof FL.jur.byId === 'function' ? FL.jur : null);
  function jurItem(id) {
    const J = jurData(); if (!J) return null;
    const it = J.byId(id); if (!it) throw new Error(`FL.book.bk: "${id}" is not an item of FL.jur (book-jur.js)`);
    return it;
  }
  const jurUnk = s => attr(s).replace(/〔要確認〕/g, '<span class="jur-unk">〔要確認〕</span>');
  const jurSrc = s => (s ? `<span class="jur-src">（${attr(s)}）</span>` : '');
  const jurUs = it => attr(it.us) + jurSrc(it.usSrc);
  const jurJp = it => jurUnk(it.jp) + jurSrc([it.jpArt, it.jpSrc].filter(Boolean).join('・'));
  // the versions of the laws the Japanese column cites (e-Gov), and the links to Part 7 that have a target now
  function jurVersions(items) {
    const L = jurData().LAWS, keys = [...new Set(items.flatMap(it => it.egov))];
    if (!keys.length) return '';
    const dates = [...new Set(keys.map(k => L[k].checked))].join('・');
    return `<span class="jur-ver">日本の法令は e-Gov 法令検索の版：${keys.map(k => `${attr(L[k].name)}（${attr(L[k].label)}）`).join('・')}。${dates} に確認。</span>`;
  }
  function jurLinks(items) {
    return [...new Set(items.flatMap(it => it.part7))].map(id => {
      const f = findSection(id);
      return f ? `<button type="button" class="jur-link" data-sec="${attr(id)}">→ 第 7 部で詳しく：${attr(f.sec.t)}</button>` : '';
    }).join('');
  }
  const jurFoot = (items, cls) => { const s = jurVersions(items) + jurLinks(items); return s ? `<div class="${cls}">${s}</div>` : ''; };
  const jurRow = it => `<tr class="bk-jur-row" data-jur="${attr(it.id)}"><th scope="row">${attr(it.title)}</th>`
    + `<td class="jur-us" data-label="米国">${jurUs(it)}</td><td class="jur-jp" data-label="日本">${jurJp(it)}</td></tr>`;
  function jurBox(items, head, cls) {
    if (!items.length) return '';
    return `<div class="${cls}"><div class="jur-h"><b>${head}</b></div><table class="bk-t jur-t">`
      + `<tr><th>項目</th><th class="jur-us">米国</th><th class="jur-jp">日本</th></tr>${items.map(jurRow).join('')}</table>`
      + `${jurFoot(items, 'jur-jp jur-foot')}</div>`;
  }
  function jurSide(cls, head, x, draw) {
    if (typeof x === 'string' && JUR_ID.test(x)) {
      const it = jurItem(x); if (!it) return '';
      return `<div class="${cls}" data-jur="${attr(it.id)}"><div class="jur-h"><b>${head}</b></div><div class="jur-v"><b>${attr(it.title)}</b>：${draw(it)}</div></div>`;
    }
    return `<div class="${cls}"><div class="jur-h"><b>${head}</b></div>${x}</div>`;
  }
  const jurJpSide = it => jurJp(it) + jurFoot([it], 'jur-foot');
  // the chapter-end table: the items whose boxes the chapter shows, in reading order (DESIGN 3.2「章末」)
  function jurTable(chId) {
    const ch = CHAPTERS.find(c => c.id === chId), J = jurData();
    if (!ch || !J) return '';
    const ids = [];
    for (const sec of ch.secs) for (const m of html(sec).matchAll(/data-jur="([^"]+)"/g)) if (!ids.includes(m[1])) ids.push(m[1]);
    return jurBox(ids.map(id => J.byId(id)).filter(Boolean), 'この章の日米の違い', 'bk-jur bk-jur-end');
  }
  // the appendix table: all the items, with where the book meets each one (only the places that are in the book now)
  function jurAppendix() {
    const J = jurData(); if (!J) return '';
    const where = it => {
      const out = [];
      for (const id of it.boxes) { const f = findSection(id); if (f) out.push(`<button type="button" data-sec="${attr(id)}">${attr(f.sec.t)}</button>`); }
      for (const g of it.gates) {
        const c = CHAPTERS.find(x => x.id === g), f = findSection(`${g}.japan`) || (c && c.secs.length ? { sec: c.secs[0] } : null);
        if (c && f) out.push(`<button type="button" class="jur-link" data-sec="${attr(f.sec.id)}">${attr(c.t)}</button>`);
      }
      for (const id of it.part7) { const f = findSection(id); if (f) out.push(`<button type="button" class="jur-link" data-sec="${attr(id)}">第 7 部：${attr(f.sec.t)}</button>`); }
      return out.join('') || '—';
    };
    const rows = J.items.map(it => `<tr class="bk-jur-row" data-jur="${attr(it.id)}"><th scope="row">${attr(it.title)}</th>`
      + `<td class="jur-us" data-label="米国">${jurUs(it)}</td><td class="jur-jp" data-label="日本">${jurJp(it)}</td>`
      + `<td class="jur-jp jur-conf" data-label="確度">${J.CONF[it.conf]}</td><td class="jur-where" data-label="本の中で">${where(it)}</td></tr>`).join('');
    const us = `<span class="jur-ver">米国の欄：${Object.values(J.US).map(s => attr(s.title)).join('・')}。${J.CHECKED} に確認。</span>`;
    return `<div class="bk-jur bk-jur-all"><div class="jur-h"><b>日米対照表（${J.items.length} 項目）</b></div><table class="bk-t jur-t">`
      + `<tr><th>項目</th><th class="jur-us">米国</th><th class="jur-jp">日本</th><th class="jur-jp jur-conf">確度</th><th class="jur-where">本の中で</th></tr>${rows}</table>`
      + `<div class="jur-foot">${us}${jurVersions(J.items)}</div></div>`;
  }
  const bk = {
    aim: html => `<p class="bk-aim">${html}</p>`,                       // the section's first lines: what it is for
    key: (...items) => `<div class="bk-key"><b>ここが大切</b>${lst(items)}</div>`,
    warn: html => `<div class="bk-warn">${html}</div>`,
    f: s => `<div class="bk-f">${s}</div>`,
    q: (q, a) => `<details class="bk-q"><summary>考えてみよう：${q}</summary><p>${a}</p></details>`,
    sim: (text, ...lessons) => `<div class="bk-sim">✈ <b>シミュレータで体験：</b>${text}<br>${lessons.map(([id, label]) => `<button type="button" data-lesson="${id}">${label} を始める</button>`).join('')}</div>`,
    calc: name => `<div class="bk-calc row" data-calc="${name}"></div>`,
    see: (secId, label) => `<button type="button" data-sec="${secId}">→ ${label}</button>`,
    t: (head, rows) => `<table class="bk-t"><tr>${head.map(x => `<th>${x}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</table>`,
    src: (...items) => `<p class="bk-src">出典：${items.join('、')}</p>`,
    fact: t => `<span class="tag fact">公開情報</span>${t}`,
    est: t => `<span class="tag unk">推測・要確認</span>${t}`,
    photo,
    jur: (...ids) => (jurData() ? jurBox(ids.flat().map(jurItem), '日米の対照', 'bk-jur') : ''),  // 日米の対照 (FL.jur)
    us: x => jurSide('bk-us', '米国では', x, jurUs),                     // 米国では: an FL.jur id or HTML (CADET keeps it)
    jp: x => jurSide('bk-jp', '日本では', x, jurJpSide),                  // 日本では (CADET leaves it out)
    same: x => jurSide('bk-same', '日本も同じ', x, jurJpSide),            // 日本も同じ (CADET leaves it out)
  };
  const CHAPTERS = [];
  // a chapter may be inserted before another one (ch.before = its id); the numbers follow the order
  function add(ch) {
    const i = ch.before ? CHAPTERS.findIndex(c => c.id === ch.before) : -1;
    if (i >= 0) CHAPTERS.splice(i, 0, ch); else CHAPTERS.push(ch);
    CHAPTERS.forEach((c, k) => { c.n = k + 1; });
    return ch;
  }
  // a part is added by the file that holds its chapters (DESIGN 3.1: p0 by book-0.js, p7 by book-7.js), in the same
  // change as its first chapter, so no part is empty: { id: 'p0'…, title, door (optional: the part's door, DESIGN 3.2),
  // before (the id of the part it goes in front of; none: at the end) }. PARTS is the reading order (the contents list
  // the parts in it; a chapter's number is its place in CHAPTERS). A part that is there already, or a "before" that
  // names no part, is an error (a typo must not hide)
  function addPart(p) {
    if (!p || !/^p[0-9]+$/.test(p.id) || typeof p.title !== 'string' || !p.title.trim()) throw new Error('FL.book.addPart: a part needs an id (p0, p7 …) and a title');
    if (PARTS.some(x => x.id === p.id)) throw new Error(`FL.book.addPart: the part "${p.id}" is there already`);
    const i = p.before === undefined ? PARTS.length : PARTS.findIndex(x => x.id === p.before);
    if (i < 0) throw new Error(`FL.book.addPart: "${p.before}" (before) is not a part`);
    PARTS.splice(i, 0, p);
    return p;
  }
  function findSection(id) { for (const ch of CHAPTERS) for (const sec of ch.secs) if (sec.id === id) return { ch, sec }; return null; }
  // references to other chapters are written {ch:id} and become 第 N 章 when shown (so inserting a chapter never breaks them)
  function fix(str) { return String(str).replace(/\{ch:([a-z0-9]+)\}/g, (m, id) => { const c = CHAPTERS.find(x => x.id === id); return c ? `第 ${c.n} 章` : '（別の章）'; }); }
  function html(sec) { return fix(typeof sec.h === 'function' ? sec.h() : sec.h); }
  function text(sec) { if (sec._txt === undefined) sec._txt = html(sec).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); return sec._txt; }
  function wire(root) { for (const el of root.querySelectorAll('[data-calc]')) { const f = FL.bookCalc && FL.bookCalc[el.dataset.calc]; if (f && !el.dataset.done) { el.dataset.done = '1'; f(el); } } }
  FL.book = { R, PARTS, CHAPTERS, bk, add, addPart, findSection, fix, html, text, wire, jurTable, jurAppendix, get FIG() { return FL.bookFigs; } };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
