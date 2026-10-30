// FLIGHT LAB — book-core.js
// The textbook's frame: the parts (parts 1–6 in the order of the publicly described ANA cadet course; the parts before
// and after them are added by the file of their chapters: FL.book.addPart), the references (public
// sources: FAA handbooks, the ACS, the AIM, 14 CFR, ANA's public pages, published training material), the writing
// helpers (key points, cautions, formulas, self-check questions, "try it in the simulator", calculators, photos, the
// US–Japan boxes, the boxes of the section form: もっと深く・計算演習・判断の目・ここを混同しない・思い出そう), the
// lookups the pages use, and what the pages draw from the data (the scope badge and the provenance line of a section:
// secMarks; the chapter-end 説明してみよう: writtenHtml). The chapters themselves are in book-1.js … book-5.js, book-0.js and book-comm.js
// (FL.book.add); the figures in book-figs.js; the photos in book-photos.js and the basic course's photos in
// book-photos-k.js (both loaded after this file by FLIGHT LAB and TEXTBOOK, not by CADET).
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
    // the front part 序部, chapter intro (W10, registered in R1 P5; each opened by W10 or revise-intro, 2026-10-27・29)
    mlitSchool: { label: '国土交通省「指定航空従事者養成施設について」（制度の概要・技能証明書の交付の流れ・操縦士課程の指定養成施設の一覧（令和 8 年 2 月現在））', url: 'https://www.mlit.go.jp/koku/content/002001714.pdf' },
    mlitPilotBasics: { label: '国土交通省「資料 1 操縦士養成に係る基礎情報（前回からの追加分）」（航空大学校の養成に関する検討会、2025 年。Integrated System・従来手法・MPL の比べ方）', url: 'https://www.mlit.go.jp/koku/content/001904431.pdf' },
    jcabExamTable: { label: '国土交通省航空局「『航空従事者技能証明等に関する事務処理要領』の一部改正案 新旧対照表」（改正第 19 号・令和 8 年 6 月 30 日から適用。航空従事者学科試験科目及び試験時間は令和 8 年 7 月期から適用。改正表 18 は Integrated System の導入）', url: 'https://safetyp.cab.mlit.go.jp/wp-content/uploads/2026/06/%E3%80%90260630%E6%94%B9%E6%AD%A3%E6%96%B0%E6%97%A7%E5%AF%BE%E7%85%A7%E8%A1%A8%E3%80%91%E8%88%AA%E7%A9%BA%E5%BE%93%E4%BA%8B%E8%80%85%E6%8A%80%E8%83%BD%E8%A8%BC%E6%98%8E%E7%AD%89%E3%81%AB%E9%96%A2%E3%81%99%E3%82%8B%E4%BA%8B%E5%8B%99%E5%87%A6%E7%90%86%E8%A6%81%E9%A0%98.pdf' },
    mlitCbt: { label: '国土交通省航空局乗員政策室「①CBT 化後の航空従事者等の学科試験 申請・受験の手引き（概要）」（2025 年度）', url: 'https://www.mlit.go.jp/koku/content/001633009.pdf' },
    mlitExam: { label: '国土交通省「航空従事者技能証明等学科試験」（CBT 化・申込み先・科目合格の有効期限）', url: 'https://www.mlit.go.jp/koku/koku_tk12_000005.html' },
    mlitSyllabus: { label: '国土交通省「航空従事者等学科試験解答及び過去問」（学科試験の出題範囲参考（シラバス）と例題集）', url: 'https://www.mlit.go.jp/koku/koku_fr10_000025.html' },
    mlitConvert: { label: '国土交通省「外国政府の発行したライセンスの切替手続について」（免除の範囲・資格ごとに行う試験・申請先）', url: 'https://www.mlit.go.jp/common/001394466.pdf' },
    egovKoku: { label: 'e-Gov 法令検索：航空法（昭和二十七年法律第二百三十一号。令和 7 年 12 月 1 日施行の版）', url: 'https://laws.e-gov.go.jp/law/327AC0000000231/20251201_507AC0000000055' },
    egovKokuKisoku: { label: 'e-Gov 法令検索：航空法施行規則（昭和二十七年運輸省令第五十六号。令和 8 年 10 月 1 日施行の版）', url: 'https://laws.e-gov.go.jp/law/327M50000800056/20261001_508M60000800082' },
    egovDenpa: { label: 'e-Gov 法令検索：電波法（昭和二十五年法律第百三十一号。令和 8 年 9 月 3 日施行の版。第 39 条〜第 41 条：無線設備の操作・無線従事者の資格・免許）', url: 'https://laws.e-gov.go.jp/law/325AC0000000131/20260903_508AC0000000027' },
    egovDenpaRei: { label: 'e-Gov 法令検索：電波法施行令（平成十三年政令第二百四十五号。令和 8 年 9 月 3 日施行の版。第 3 条：無線従事者の操作の範囲）', url: 'https://laws.e-gov.go.jp/law/413CO0000000245/20260903_508CO0000000255' },
    faaKtTable: { label: 'FAA ACS Knowledge Test Table: Correct Allotted Times（学科試験の記号・問題数・合格点。2024 年 10 月更新）', url: 'https://www.faa.gov/training_testing/testing/acs/acs_knowledge_test_table.pdf' },
    faaAih: { label: 'FAA Aviation Instructor\'s Handbook（FAA-H-8083-9B）第 3 章 The Learning Process', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/aviation_instructors_handbook/aviation_instructors_handbook.pdf' },
    newsAscii: { label: '週刊アスキー（ASCII.jp）「ANA のパイロット訓練、実はフロリダでやってた！」（2025 年 10 月 8 日。取材記事）', url: 'https://ascii.jp/elem/000/004/323/4323328/2/' },
    newsTraffic: { label: '乗りものニュース「ANA のパイロットになるための訓練」最前線に密着（2025 年 10 月 14 日。取材記事）', url: 'https://trafficnews.jp/post/594833' },
    // the front part 序部, chapter basics (W10, registered in R1 P5; each opened by W10 or revise-basics, 2026-10-27・29)
    cfr1: { label: '14 CFR 1.1 General definitions（機長・フライトレベル・各種の対気速度・マッハ数の定義）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-A/part-1/section-1.1' },
    phak8: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 8 章 Flight Instruments（高度の種類・対気速度の種類・高度計の規正と誤差）", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/10_phak_ch8.pdf' },
    phak9: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 9 章 Flight Manuals and Other Documents（AFM・POH）", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/11_phak_ch9.pdf' },
    phak16: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 16 章 Navigation（24 時間制と UTC・方位・針路と航跡・対地速度）", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/18_phak_ch16.pdf' },
    aim72: { label: 'FAA AIM 7-2 Barometric Altimeter Errors and Setting Procedures（高度計の誤差と規正の手順）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap7_section_2.html' },
    nist811: { label: 'NIST SP 811 Guide for the Use of the International System of Units, Appendix B.9（換算係数：ft・mile・nautical mile・lb・gal・inHg・°F）', url: 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9' },
    usc260a: { label: '15 U.S.C. 260a Advancement of time or changeover dates（米国の夏時間の期間）', url: 'https://www.law.cornell.edu/uscode/text/15/260a' },
    usAip: { label: 'FAA United States Aeronautical Information Publication（AIP）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aip_html/' },
    jmaQnh: { label: '気象庁 東京航空地方気象台「羽田空港 WEATHER TOPICS 第 54 号 気圧の観測について」（QNH を hPa と inHg で通報・METAR の Q 群と国内記事の A 群）', url: 'https://www.data.jma.go.jp/haneda-airport/weather_topics/file/rjtt_wt20151030.pdf' },
    jmaCode: { label: '気象庁「航空気象通報式」第 3 版（改正 第 17 号、令和 7 年 8 月 7 日。国内記事は RMK の後に国内のみに通報、A 群は QNH の inHg）', url: 'https://www.jma.go.jp/jma/kishou/books/tsuhoshiki/koukuu/koukuu3_17.pdf' },
    // the front part 序部, chapter english (W10, registered in R1 P5; each opened by W10 or revise-english, 2026-10-27・29)
    ac6028b: { label: 'FAA AC 60-28B FAA English Language Standard for an FAA Certificate Issued Under 14 CFR Parts 61, 63, 65, and 107（2017-06-02。2025-05-19 の編集の更新 2）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_60-28B_Ed_Upd_2_(5-19-25).pdf' },
    skySocio: { label: 'SKYbrary: Socio-Culture (OGHFA BN)（国の文化と操縦室：権力格差の定義と例）', url: 'https://skybrary.aero/articles/socio-culture-oghfa-bn' },
    cfr12: { label: '14 CFR 1.2 Abbreviations and symbols（V で始まる速度の記号：VX・VY・VA・VNE・VMC など）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-A/part-1/section-1.2' },
    unSystem: { label: 'United Nations: The UN System（国連の専門機関の一覧。ICAO は世界の航空の標準を決める）', url: 'https://www.un.org/en/about-us/un-system' },
    caaRole: { label: 'UK Civil Aviation Authority: Roles and responsibilities（英国の航空の規制機関）', url: 'https://www.caa.co.uk/about-us/the-civil-aviation-authority/roles-and-responsibilities/' },
    jcabElp: { label: '国土交通省 航空局「航空英語能力証明実地試験実施基準」別添 1（ICAO の言語習熟度評価基準。令和 4 年 3 月 29 日最終改正）', url: 'https://safetyp.cab.mlit.go.jp/wp-content/uploads/2023/06/4-020A_R040329_航空英語能力証明実地試験実施基準.pdf' },
    skyAbout: { label: 'SKYbrary: About SKYbrary（航空の安全の知識の電子の資料集。EUROCONTROL が始めた）', url: 'https://skybrary.aero/about-skybrary' },
    cambridgeDates: { label: 'Cambridge Dictionary, English Grammar Today: Dates（英国と米国の日付の書き方）', url: 'https://dictionary.cambridge.org/grammar/british-grammar/dates' },
    cambridgeMeas: { label: 'Cambridge Dictionary, English Grammar Today: Measurements（速さ・重さなどの言い方）', url: 'https://dictionary.cambridge.org/grammar/british-grammar/measurements' },
    // Part 1 rewritten (R2): the sources the chapter aero added (drafts/aero.js's NEW_R; one entry for a URL two drafts cite)
    phak4: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 4 章 Principles of Flight", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/06_phak_ch4.pdf' },
    phak5: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 5 章 Aerodynamics of Flight", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/07_phak_ch5.pdf' },
    phak6: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 6 章 Flight Controls", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/08_phak_ch6.pdf' },
    phak7: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 7 章 Aircraft Systems", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/09_phak_ch7.pdf' },
    phak11: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 11 章 Aircraft Performance", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/13_phak_ch11.pdf' },
    afh9: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 9 章 Approaches and Landings', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/10_afh_ch9.pdf' },
    cfr23c: { label: '14 CFR Part 23 Subpart C Structures（23.2200 構造設計の範囲・23.2215 飛行荷重の条件・23.2230 制限荷重と終極荷重）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-23/subpart-C' },
    cfr23old: { label: '14 CFR Part 23（2017 年 1 月 1 日の版：23.3 飛行機の区分・23.303 安全率・23.333 飛行包囲線図・23.335 設計速度・23.337 制限運動荷重倍数・23.1505 速度の制限・23.1507 最大運用運動速度）', url: 'https://www.ecfr.gov/on/2017-01-01/title-14/chapter-I/subchapter-C/part-23' },
    nasaGeom: { label: 'NASA Glenn Research Center: Wing Geometry Definitions（翼面積は投影面積・アスペクト比 ＝ 翼幅² ÷ 翼面積）', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/wing-geometry-interactive/' },
    nasaInduced: { label: 'NASA Glenn Research Center: Induced Drag Coefficient（CDi ＝ CL² ÷（π × AR × e））', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/induced-drag-coefficient/' },
    nasaTransit: { label: 'NASA Glenn Research Center: Equal Transit Theory（よくある誤った揚力の説明）', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/foilw1/' },
    nasaBernEq: { label: "NASA Glenn Research Center: Bernoulli's Equation（簡単な形が使える条件：粘性なし・非圧縮・定常・熱の出入りなし・高さの変化が小さい・1 本の流線の上）", url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/bernoullis-equation/' },
    nasaBernNewton: { label: 'NASA Glenn Research Center: Bernoulli and Newton（圧力の説明と流れを曲げる説明は同じ力）', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/bernoulli-and-newton/' },
    nasaAc: { label: 'NASA Glenn Research Center: Aerodynamic Center（空力中心は低速の翼型で翼弦の前から約 1/4）', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/aerodynamic-center/' },
    afh3: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 3 章 Basic Flight Maneuvers（滑空：重さに合った速度なら届く距離は変わらない）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/04_afh_ch3.pdf' },
    afh8: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 8 章 Airport Traffic Patterns（ダウンウインド・ベースレグ・ファイナル）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/09_afh_ch8.pdf' },
    phak10: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 10 章 Weight and Balance", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/12_phak_ch10.pdf' },
    ac6167c: { label: 'FAA Advisory Circular AC 61-67C（Change 2）Stall and Spin Awareness Training（スピンと自転：下がる翼のほうが深く失速する）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_61-67C_Chg_2.pdf' },
    nasaDownwash: { label: 'NASA Glenn Research Center: Downwash Effects on Lift（翼端の吹き下ろしと誘導抗力・アスペクト比が小さいほど揚力係数が減る）', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/downwash-effects-on-lift/' },
    reiPPL: { label: '国土交通省 航空局「航空従事者技能証明学科試験例題集 自家用操縦士（飛行機）」2026 年 6 月', url: 'https://www.mlit.go.jp/koku/content/001761095.pdf' },
    reiCPL: { label: '国土交通省 航空局「航空従事者技能証明学科試験例題集 事業用操縦士（飛行機）」2026 年 6 月（航空工学 例題 2 プロペラ後流・例題 7 トリム・タブ・例題 10 マス・バランス・例題 11 必要馬力と利用馬力）', url: 'https://www.mlit.go.jp/koku/content/001761087.pdf' },
    mlitAppx1: { label: '国土交通省「航空法施行規則 附属書第１ 航空機及び装備品等の安全性を確保するための強度、構造及び性能についての基準」（耐空類別・強度）', url: 'https://www.mlit.go.jp/koku/content/001593797.pdf' },
    // Part 1 rewritten (R2): the sources the chapter sys added (drafts/sys.js's NEW_R; one entry for a URL two drafts cite)
    phak3: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）第 3 章 Aircraft Construction（翼の桁・小骨・縦通材、セミモノコック、複合材の傷）", url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/05_phak_ch3.pdf' },
    amtAirframe2: { label: 'FAA Aviation Maintenance Technician Handbook — Airframe Volume 2（FAA-H-8083-31A）第 10 章 Aircraft Instrument Systems・第 11 章 Communication and Navigation・第 14 章 Aircraft Fuel System', url: 'https://www.faa.gov/sites/faa.gov/files/2022-06/amt_airframe_hb_vol_2.pdf' },
    amtGeneral: { label: 'FAA Aviation Maintenance Technician Handbook — General（FAA-H-8083-30B・2023）第 12 章 Fundamentals of Electricity and Electronics（電磁誘導と発電機・整流器・インバーター・蓄電池の種類と充電のガス・アンペア時）', url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/amtg_handbook.pdf' },
    cfr91205: { label: '14 CFR 91.205 Powered civil aircraft with standard U.S. airworthiness certificates: Instrument and equipment requirements（(c) 夜の有視界飛行の装備）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-C/section-91.205' },
    lycomingEngines: { label: 'Lycoming SSP-110-3 Certified Engines（2025 年 7 月。型式名の文字の意味・O-360-A4M と IO-360 の定格・圧縮比・燃料の等級）', url: 'https://www.lycoming.com/sites/default/files/file/2025-07/SSP-110-3%20Certified%20Engines.pdf' },
    nist811si: { label: 'NIST SP 811 Guide for the Use of the International System of Units, Chapter 4（SI 組立単位：W＝J/s、V＝W/A、Ω＝V/A）', url: 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-4-two-classes-si-units-and-si-prefixes' },
    // Part 1 rewritten (R2): the sources the chapter inst added (drafts/inst.js's NEW_R; one entry for a URL two drafts cite)
    g1000pg: { label: "Garmin G1000 Pilot's Guide for Cessna Nav III（190-00498-07 Rev. A）— 第 1 章（AHRS の整列）・第 2 章 Flight Instruments・第 7 章 AFCS（GFC 700 型：トレンドの線・モードの表示の帯の色・自動操縦が外れたときの表示。Archer の手引きではない例）", url: 'https://static.garmin.com/pumac/190-00498-07_0A_Web.pdf' },
    aah4: { label: 'FAA Advanced Avionics Handbook（FAA-H-8083-6。2009 年版・2013 年の改訂。FAA Safety Team（faasafety.gov）の写し）第 4 章 Automated Flight Control（自動操縦を使う手順・モードの確かめ・昇降率と高度保持のモードと失速・切るスイッチ）', url: 'https://www.faasafety.gov/files/events/EA/EA03/2019/EA0392003/aah_ch04.pdf' },
    nzCompass: { label: 'Civil Aviation Authority of New Zealand, Flight Instructor Guide — Compass use（南半球の磁気コンパスの誤差の覚え方 ONUS・SAND）', url: 'https://www.aviation.govt.nz/licensing-and-certification/pilots/flight-training/flight-instructor-guide/compass-use' },
    // Part 1 rewritten (R2): the sources the chapter perf, wb added (drafts/perfwb.js's NEW_R; one entry for a URL two drafts cite)
    afh6: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）第 6 章 Takeoffs and Departure Climbs（離陸をやめる点を先に決める）', url: 'https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/07_afh_ch6.pdf' },
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
  // a photo from book-photos.js (FL.bookPhotos) or, for the basic course's photos, book-photos-k.js (FL.bookPhotosK),
  // with its own modification label (mod: 無加工・切り抜き・縮小・注記はパイロット基礎教材（第 3 版）で追加 …, DESIGN 4.2):
  // nothing when neither file is loaded (CADET), the id is not there or its bytes are not (src '')
  const photo = id => {
    const p = (FL.bookPhotos && FL.bookPhotos[id]) || (FL.bookPhotosK && FL.bookPhotosK[id]); if (!p || !p.src) return '';
    const c = p.credit;
    return `<figure class="bk-photo" data-photo="${attr(id)}"><img src="${p.src}" alt="${attr(p.alt)}"${p.w ? ` width="${p.w}" height="${p.h}"` : ''} loading="lazy" decoding="async">`
      + `<figcaption>写真：${p.caption}<span class="bk-credit">作者：${attr(c.author)}・ライセンス：${link(c.licenseUrl, attr(c.license))}・${link(c.source, '出典（' + site(c.source) + '）')}${p.mod ? '・' + attr(p.mod) : ''}</span></figcaption></figure>`;
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
  // ---- the boxes of the section form (DESIGN 3.2「節の形」, textbook/rewrite/STYLE.md「節の形」5–7 and 11) ----
  // bk.deep(title, html) もっと深く and bk.drill(title, problem, answer?) 計算演習 are folds (<details>: closed on the
  // screen, opened to print — TEXTBOOK's page.js); bk.judge(...) 判断の目 and bk.dont(...) ここを混同しない take list
  // items, or one block of HTML (a table, paragraphs: it starts with a block tag); bk.recall(text, [secId, label], …)
  // 思い出そう is ≤ 3 lines with at least one link to the concept's address (bk.see, so a link without a target fails
  // the tests: DESIGN 6.2 rules 6 and 13). A recall has no <div> inside (check-concepts.mjs reads it to its first
  // </div>). CADET keeps these boxes in its book (the folds folded) and leaves them out of what the instructor reads.
  const BLOCK = /^\s*<(?:p|ul|ol|table|div|figure|h4|dl|details)\b/i;
  const listOrBlock = items => (items.length === 1 && BLOCK.test(items[0]) ? items[0] : lst(items));
  const fold = (cls, head, title, body) => {
    if (typeof title !== 'string' || !title.trim()) throw new Error(`FL.book.bk: ${head} needs a title (bk.${cls.slice(3)}(title, …))`);
    return `<details class="${cls}"><summary>${head}：${title}</summary><div class="bk-fold">${body}</div></details>`;
  };
  function recall(text, ...links) {
    if (!links.length || !links.every(l => Array.isArray(l) && typeof l[0] === 'string' && typeof l[1] === 'string')) throw new Error('FL.book.bk.recall(text, [secId, label], …): a recall needs a link to the concept\'s address');
    if (/<div\b/i.test(text)) throw new Error('FL.book.bk.recall: no <div> inside a recall');
    return `<div class="bk-recall"><b>思い出そう</b><p>${text} ${links.map(([id, label]) => `<button type="button" data-sec="${attr(id)}">→ ${label}</button>`).join('')}</p></div>`;
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
    deep: (title, html) => fold('bk-deep', 'もっと深く', title, html),     // もっと深く (a fold)
    drill: (title, problem, answer) => fold('bk-drill', '計算演習', title,   // 計算演習 (a fold): the problem, then the answer
      problem + (answer ? `<div class="bk-drill-a"><b>答えと解き方</b>${answer}</div>` : '')),
    judge: (...items) => `<div class="bk-judge"><b>判断の目</b>${listOrBlock(items)}</div>`,       // 判断の目
    dont: (...items) => `<div class="bk-dont"><b>ここを混同しない</b>${listOrBlock(items)}</div>`,  // ここを混同しない
    recall,                                                              // 思い出そう (≤ 3 lines and a link)
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

  // ---- what the pages draw from the section's and the chapter's data (DESIGN 3.2「節のデータ」「章末」, 5 criterion 24) ----
  // FLIGHT LAB (pages.js) and TEXTBOOK (render.js) draw the same HTML from here; CADET draws neither (DESIGN 6.3).
  // The scope badge (scope: common・us・jp・mixed), 「発展」 on a deep section, and the provenance line of a section
  // written from the basic course (from: its section ids) — 「パイロット基礎教材（第 3 版）第 5 章 14・16 節をもとに改稿」.
  const SCOPE = Object.freeze({ common: '共通', us: '米国の決まり', jp: '日本の決まり', mixed: '米国と日本の決まり' });
  const KISO_BOOK = 'パイロット基礎教材（第 3 版）';
  // a section or question of the basic course: kisoNN.M (section M of chapter NN), kisoNN.cover (the chapter's door),
  // kisoNN.x1 (the chapter's opening section: chapters 0–2), kisoNN.qM (written question M; its record key in kisoQa)
  const KISO_ID = /^kiso(\d{2})\.(cover|x(\d+)|q(\d+)|(\d+))$/;
  // ['kiso05.14', 'kiso05.16'] → 第 5 章 14・16 節; ['kiso00.14', 'kiso09.8'] → 第 0 章 14 節、第 9 章 8 節;
  // ['kiso00.x1', 'kiso00.cover'] → 第 0 章 導入の節と扉; ['kiso09.q3'] → 第 9 章 問 3 (in the order given)
  function kisoPlace(ids) {
    const chs = [];
    for (const id of ids) {
      const m = String(id).match(KISO_ID);
      if (!m) throw new Error(`FL.book: "${id}" is not a section or question of the basic course (kisoNN.M, kisoNN.cover, kisoNN.x1, kisoNN.qM)`);
      let c = chs.find(x => x.n === Number(m[1])); if (!c) chs.push(c = { n: Number(m[1]), parts: [] });
      const kind = m[2] === 'cover' ? 'cover' : m[3] ? 'x' : m[4] ? 'q' : 'sec', num = Number(m[3] || m[4] || m[5] || 0);
      let p = c.parts.find(x => x.kind === kind); if (!p) c.parts.push(p = { kind, nums: [] });
      if (!p.nums.includes(num)) p.nums.push(num);
    }
    const say = p => (p.kind === 'cover' ? '扉' : p.kind === 'x' ? '導入の節' : p.kind === 'q' ? `問 ${p.nums.join('・')}` : `${p.nums.join('・')} 節`);
    return chs.map(c => `第 ${c.n} 章 ${c.parts.map(say).join('と')}`).join('、');
  }
  const kisoFrom = ids => { const p = kisoPlace(ids); return `${KISO_BOOK}${p}${/\d$/.test(p) ? ' ' : ''}をもとに改稿`; };
  const secOf = x => (typeof x === 'string' ? (findSection(x) || {}).sec : x) || null;
  // → '<div class="bk-marks">…</div>', or '' when the section has none of them. A section without scope gets no badge
  // (none is guessed); a scope or a from that is not of the right form is an error (a typo must not hide)
  function secMarks(x) {
    const sec = secOf(x); if (!sec) return '';
    const out = [];
    if (sec.scope !== undefined) {
      if (!Object.prototype.hasOwnProperty.call(SCOPE, sec.scope)) throw new Error(`FL.book.secMarks: ${sec.id}: scope "${sec.scope}" is not one of ${Object.keys(SCOPE).join('・')}`);
      out.push(`<span class="bk-scope bk-scope-${sec.scope}" data-scope="${sec.scope}">${SCOPE[sec.scope]}</span>`);
    }
    if (sec.deep) out.push('<span class="bk-scope bk-deep-tag">発展</span>');
    if (sec.from !== undefined) {
      if (!Array.isArray(sec.from) || !sec.from.length) throw new Error(`FL.book.secMarks: ${sec.id}: from must be a list of the basic course's section ids`);
      out.push(`<span class="bk-from" data-from="${attr(sec.from.join(' '))}">${kisoFrom(sec.from)}</span>`);
    }
    return out.length ? `<div class="bk-marks">${out.join('')}</div>` : '';
  }
  // The chapter-end 説明してみよう: ch.written = [[question, answer], …] or [{ q, a, from }, …] — HTML (static, trusted
  // content, as the sections' bodies; the answer links its section with bk.see), {ch:} fixed; from: the basic course's
  // written questions it was rewritten from (kisoNN.qM). The answer is opened with its button (hidden until then; open in
  // print: the pages' style sheets). Each has its record key "<chapter id>.w<index>" (0-based, as bookQuiz's
  // "<chapter id>.<index>"): FLIGHT LAB keeps the answers opened in the progress (bookWritten); the list only grows at
  // its end (DESIGN 6.2 rule 4, 6.4). The basic course's own record (kisoQa) is never read as these (DESIGN 6.4).
  function writtenItems(ch) {
    const list = ch && ch.written;
    if (list === undefined) return [];
    if (!Array.isArray(list)) throw new Error(`FL.book: ${ch.id}: written must be a list`);
    return list.map((w, i) => {
      const it = Array.isArray(w) ? { q: w[0], a: w[1], from: w[2] } : w && typeof w === 'object' ? w : {};
      if (typeof it.q !== 'string' || !it.q.trim() || typeof it.a !== 'string' || !it.a.trim()) throw new Error(`FL.book: ${ch.id}: written ${i + 1} needs a question and an answer`);
      if (it.from !== undefined && (!Array.isArray(it.from) || !it.from.length || it.from.some(id => !/^kiso\d{2}\.q\d+$/.test(id)))) throw new Error(`FL.book: ${ch.id}: written ${i + 1}: from is a list of the basic course's questions (kisoNN.qM)`);
      return { key: `${ch.id}.w${i}`, n: i + 1, q: fix(it.q), a: fix(it.a), from: it.from || null };
    });
  }
  function writtenHtml(x) {
    const ch = typeof x === 'string' ? CHAPTERS.find(c => c.id === x) : x, items = writtenItems(ch);
    if (!items.length) return '';
    return `<div class="bk-written" data-ch="${attr(ch.id)}"><h3>説明してみよう</h3>`
      + '<p class="bk-w-how">まず自分の言葉で説明してから（書き出すとなおよい）、答えを開いて確かめます。採点はしません。</p>'
      + items.map(w => {
        const id = `bkw-${ch.id}-${w.n - 1}`;
        return `<div class="bk-w" data-w="${attr(w.key)}"><div class="bk-w-q"><b class="bk-w-n">問 ${w.n}.</b> ${w.q}</div>`
          + (w.from ? `<div class="bk-w-from" data-kiso="${attr(w.from.join(' '))}">${kisoFrom(w.from)}</div>` : '')
          + `<button type="button" class="bk-w-btn" aria-expanded="false" aria-controls="${id}">答えを見る</button>`
          + `<div class="bk-w-a" id="${id}" hidden><b>答えの例</b>${w.a}</div></div>`;
      }).join('') + '</div>';
  }
  FL.book = { R, PARTS, CHAPTERS, bk, add, addPart, findSection, fix, html, text, wire, jurTable, jurAppendix, secMarks, writtenItems, writtenHtml, SCOPE, get FIG() { return FL.bookFigs; } };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
