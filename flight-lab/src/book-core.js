// FLIGHT LAB — book-core.js
// The textbook's frame: the parts (in the order of the publicly described ANA cadet course), the references (public
// sources: FAA handbooks, the ACS, the AIM, 14 CFR, ANA's public pages, published training material), the writing
// helpers (key points, cautions, formulas, self-check questions, "try it in the simulator", calculators), and the
// lookups the pages use. The chapters themselves are in book-1.js … book-4.js (FL.book.add).
(function (FL) {
  'use strict';
  const R = {
    ana1: { label: 'ANA「ボーイング777 パイロットになるまで Phase2〜基礎訓練編〜」', url: 'https://www.ana.co.jp/group/777_30th/20251022_2.html' },
    ana2: { label: 'ANA「未来の翼が生まれる場所へ〜フロリダの空で見た、ANAのDNA〜」', url: 'https://www.anahd.co.jp/ana_news/2025/10/28/20251028.html' },
    acron: { label: 'Acron Aviation USA — Aircraft fleet', url: 'https://acronaviationacademy.com/usa/about-us/aircraft-fleet/' },
    archer: { label: 'Piper Archer（Piper 公式）', url: 'https://www.piper.com/model/archer-tx/' },
    seminole: { label: 'Piper Seminole（Piper 公式）', url: 'https://www.piper.com/model/seminole/' },
    archerCk: { label: 'Archer III w/ G1000 PA-28-181 Pilot\'s Checklist（Middle Georgia State University・2025・公開資料）', url: 'https://www.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Archer_Checklist.pdf', note: 'Vr 60・Vx 64・Vy 76・巡航上昇 87・最良滑空 76・進入 70 / 65・Va 113・Vfe 102・実証横風 17 kt など。訓練校ごとに版がある' },
    seminoleG: { label: 'Maneuver Guide Seminole (PA-44-180)（Southeastern Oklahoma State University・公開資料）', url: 'https://www.se.edu/aviation/wp-content/uploads/sites/4/2023/11/Seminloe-Guide-V1.0.pdf', note: 'Vmc 56・Vyse 88・Vsse 82・Vr 75・Vx 82・Vy 88・Vxse 88（この版の表の値。POH の版により異なることがある）・Va 135 など' },
    g1000: { label: 'Garmin G1000 Cockpit Reference Guide — Piper PA-28-181 Archer', url: 'https://static.garmin.com/pumac/190-01460-00_0A_Web.pdf' },
    phak: { label: "FAA Pilot's Handbook of Aeronautical Knowledge（FAA-H-8083-25C）", url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak' },
    afh: { label: 'FAA Airplane Flying Handbook（FAA-H-8083-3C）', url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook' },
    afh13: { label: 'FAA Airplane Flying Handbook 第 13 章 Transition to Multiengine Airplanes', url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook' },
    afh15: { label: 'FAA Airplane Flying Handbook 第 15 章 Transition to Jet-Powered Airplanes', url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook' },
    safo: { label: 'FAA SAFO（Safety Alerts for Operators）— 13002 Manual Flight Operations ほか', url: 'https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/safo' },
    ifh: { label: 'FAA Instrument Flying Handbook（FAA-H-8083-15B）', url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/instrument_flying_handbook' },
    iph: { label: 'FAA Instrument Procedures Handbook（FAA-H-8083-16B）', url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/instrument_procedures_handbook' },
    wx: { label: 'FAA Aviation Weather Handbook（FAA-H-8083-28A）', url: 'https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/faa-h-8083-28-aviation-weather-handbook' },
    rmh: { label: 'FAA Risk Management Handbook（FAA-H-8083-2A）', url: 'https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/risk-management-handbook-faa-h-8083-2a' },
    wb: { label: 'FAA Aircraft Weight and Balance Handbook（FAA-H-8083-1B）', url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/weight_balance_handbook' },
    aim: { label: 'FAA Aeronautical Information Manual（AIM）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/' },
    pcg: { label: 'FAA Pilot/Controller Glossary', url: 'https://www.faa.gov/air_traffic/publications/atpubs/pcg_html/' },
    aim42: { label: 'FAA AIM 4-2 Radio Communications Phraseology and Techniques（交信の言い方と技術）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_2.html' },
    aim43: { label: 'FAA AIM 4-3 Airport Operations（空港での運用・地上走行・灯火信号）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_3.html' },
    aim41: { label: 'FAA AIM 4-1 Services Available to Pilots（ATIS・CTAF・レーダー業務）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_1.html' },
    aim63: { label: 'FAA AIM 6-3 Distress and Urgency Procedures（遭難・緊急通信）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap6_section_3.html' },
    aim52: { label: 'FAA AIM 5-2 Departure Procedures（出発の手順・Line Up and Wait）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap5_section_2.html' },
    aim64: { label: 'FAA AIM 6-4 Two-way Radio Communications Failure（無線の故障）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap6_section_4.html' },
    jo71: { label: 'FAA Order JO 7110.65 Air Traffic Control（管制官の方式基準・管制用語）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/atc_html/' },
    cap413: { label: 'UK CAA CAP 413 Radiotelephony Manual（英国の無線電話の手引き）', url: 'https://www.caa.co.uk/data-and-publications/publications/documents/content/cap-413/' },
    acsP: { label: 'FAA Private Pilot — Airplane ACS（FAA-S-ACS-6C）', url: 'https://www.faa.gov/training_testing/testing/acs/private_airplane_acs_6.pdf' },
    acsC: { label: 'FAA Commercial Pilot — Airplane ACS（FAA-S-ACS-7B）', url: 'https://www.faa.gov/training_testing/testing/acs/commercial_airplane_acs_7.pdf' },
    acsI: { label: 'FAA Instrument Rating — Airplane ACS（FAA-S-ACS-8C）', url: 'https://www.faa.gov/training_testing/testing/acs/instrument_rating_airplane_acs_8.pdf' },
    cfr61: { label: '14 CFR Part 61（操縦士の資格）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61' },
    cfr91: { label: '14 CFR Part 91（一般運航・飛行規則）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91' },
    cfr23: { label: '14 CFR Part 23（普通類の飛行機の耐空性）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-23' },
    sfb: { label: 'FAA From the Flight Deck: Orlando Sanford（SFB）', url: 'https://www.faa.gov/flight_deck/sfb' },
    vfr: { label: 'FAA VFR Charts（セクショナルチャート）', url: 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/vfr/' },
    chartUG: { label: 'FAA Aeronautical Chart User\'s Guide', url: 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/aero_guide/' },
    awc: { label: 'Aviation Weather Center（METAR・TAF・気象情報）', url: 'https://aviationweather.gov/' },
    tem: { label: 'SKYbrary: Threat and Error Management (TEM)', url: 'https://skybrary.aero/articles/threat-and-error-management-tem' },
    crm: { label: 'SKYbrary: Crew Resource Management (CRM)', url: 'https://skybrary.aero/articles/crew-resource-management-crm' },
    icaoTEM: { label: 'ICAO Doc 9683 Human Factors Training Manual（TEM・CRM の考え方）', url: 'https://www.icao.int/' },
    upset: { label: 'FAA AC 120-111 Upset Prevention and Recovery Training', url: 'https://www.faa.gov/regulations_policies/advisory_circulars/' },
    automation: { label: 'FAA AC 120-71B Standard Operating Procedures and Pilot Monitoring Duties', url: 'https://www.faa.gov/regulations_policies/advisory_circulars/' },
    mag: { label: 'NOAA 磁気偏差計算（Magnetic Field Calculators）', url: 'https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml' },
  };
  const PARTS = [
    { id: 'p1', title: '第 1 部　地上学科（ロンドン相当・英語の座学）', phase: 'p1' },
    { id: 'p2', title: '第 2 部　Sanford・Piper Archer の基礎操縦', phase: 'p2' },
    { id: 'p3', title: '第 3 部　航法・横風・目的地変更', phase: 'p3' },
    { id: 'p4', title: '第 4 部　計器飛行', phase: 'p4' },
    { id: 'p5', title: '第 5 部　Piper Seminole・多発', phase: 'p5' },
    { id: 'p6', title: '第 6 部　CRM・TEM・ジェットと自動化への準備', phase: 'p6' },
  ];
  // writing helpers (they return HTML; the textbook is static, trusted content)
  const lst = items => `<ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>`;
  const bk = {
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
  };
  const CHAPTERS = [];
  // a chapter may be inserted before another one (ch.before = its id); the numbers follow the order
  function add(ch) {
    const i = ch.before ? CHAPTERS.findIndex(c => c.id === ch.before) : -1;
    if (i >= 0) CHAPTERS.splice(i, 0, ch); else CHAPTERS.push(ch);
    CHAPTERS.forEach((c, k) => { c.n = k + 1; });
    return ch;
  }
  function findSection(id) { for (const ch of CHAPTERS) for (const sec of ch.secs) if (sec.id === id) return { ch, sec }; return null; }
  // references to other chapters are written {ch:id} and become 第 N 章 when shown (so inserting a chapter never breaks them)
  function fix(str) { return String(str).replace(/\{ch:([a-z0-9]+)\}/g, (m, id) => { const c = CHAPTERS.find(x => x.id === id); return c ? `第 ${c.n} 章` : '（別の章）'; }); }
  function html(sec) { return fix(typeof sec.h === 'function' ? sec.h() : sec.h); }
  function text(sec) { if (sec._txt === undefined) sec._txt = html(sec).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); return sec._txt; }
  function wire(root) { for (const el of root.querySelectorAll('[data-calc]')) { const f = FL.bookCalc && FL.bookCalc[el.dataset.calc]; if (f && !el.dataset.done) { el.dataset.done = '1'; f(el); } } }
  FL.book = { R, PARTS, CHAPTERS, bk, add, findSection, fix, html, text, wire, get FIG() { return FL.bookFigs; } };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
