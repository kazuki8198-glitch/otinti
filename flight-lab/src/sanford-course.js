// FLIGHT LAB — sanford-course.js
// Orlando Sanford International Airport (KSFB) as a teaching subject: the runways, the hot spot, the airspace,
// a schematic airport diagram (NOT FOR NAVIGATION), and English ATC readback practice.
// Facts are taken from public sources and cited (FAA "From the Flight Deck: SFB", the airport's public data);
// positions in the diagram are SCHEMATIC (概略) and the radio calls are training scripts with a fictional call sign.
(function (FL) {
  'use strict';
  const SRC = {
    faa: { label: 'FAA From the Flight Deck: Orlando Sanford International Airport (SFB)', url: 'https://www.faa.gov/flight_deck/sfb' },
    wiki: { label: 'Orlando Sanford International Airport（滑走路長の公開データ）', url: 'https://en.wikipedia.org/wiki/Orlando_Sanford_International_Airport' },
    aim: { label: 'FAA Aeronautical Information Manual（AIM）', url: 'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/' },
    pcg: { label: 'FAA Pilot/Controller Glossary', url: 'https://www.faa.gov/air_traffic/publications/atpubs/pcg_html/' },
    vfr: { label: 'FAA VFR Charts（セクショナルチャート等）', url: 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/vfr/' },
    ana: { label: 'ANA「未来の翼が生まれる場所へ」（サンフォード訓練レポート）', url: 'https://www.anahd.co.jp/ana_news/2025/10/28/20251028.html' },
  };
  // the runways (lengths: public data; the layout below is schematic: relative positions only)
  const RUNWAYS = [
    { id: '09L/27R', lenFt: 11002, note: 'FAA：主要運用滑走路（primary operations runway）', n: 520, e: 0, hdg: 84, w: 46 },
    { id: '09C/27C', lenFt: 3578, note: 'FAA：Hot Spot HS1（誘導路 C との取り違え）に関係', n: 210, e: -700, hdg: 84, w: 23 },
    { id: '09R/27L', lenFt: 5839, note: 'FAA：主要な飛行訓練用滑走路（primary flight training runway）', n: -150, e: 250, hdg: 84, w: 30 },
    { id: '18/36', lenFt: 6002, note: '平行滑走路と交差する滑走路', n: -100, e: 1250, hdg: 174, w: 46 },
  ];
  // endpoints on the local plane (for the MFD map): schematic, around the display origin
  for (const r of RUNWAYS) {
    const L = r.lenFt / 3.28084 / 2, h = r.hdg * Math.PI / 180;
    r.n1 = r.n - Math.cos(h) * L; r.e1 = r.e - Math.sin(h) * L; r.n2 = r.n + Math.cos(h) * L; r.e2 = r.e + Math.sin(h) * L;
  }
  const FACTS = [
    { k: '事実', t: 'SFB は Orlando International（KMCO）の北約 20 マイルにあり、訓練前の学生から経験豊富な機長まで、操縦者の経験は幅広い。', src: 'faa' },
    { k: '事実', t: '滑走路は 9/27 の L・C・R の平行 3 本（進入端の位置がずれている）と、交差する 18/36。滑走路の取り違え（runway misalignment）が起きやすい空港とされる。', src: 'faa' },
    { k: '事実', t: 'SFB の空域は Class C で、その上に Orlando の Class B がかぶっている。', src: 'faa' },
    { k: '事実', t: 'Hot Spot HS1：誘導路 C と滑走路 27C の標識が取り違えられやすい。滑走路 18 から出て誘導路 C へ右折するはずが、滑走路 27C へ右折してしまう誤進入の事例がある。', src: 'faa' },
    { k: '事実', t: '滑走路の標示は白、離着陸に使わない面（誘導路の標示、シェブロン、ショルダーなど）の標示は黄色。', src: 'faa' },
    { k: '事実', t: '9L/27R が主要運用滑走路、9R/27L が主要な飛行訓練用滑走路（SFB 管制塔からの情報）。', src: 'faa' },
    { k: '事実', t: 'SFB では Line Up and Wait（LUAW）を使う。LUAW は滑走路に入って待機する指示で、離陸許可ではない。', src: 'faa' },
    { k: '事実', t: '滑走路の指定・誘導路・hold short の指示は、コールサインを付けて同じ送信の中で復唱する必要がある。足りない復唱は、他に誰もいなくても言い直しを求められる。', src: 'faa' },
    { k: '事実', t: '場周経路では、upwind・crosswind・base をそれぞれ約 1 マイルで飛ぶよう求めている（離陸間隔の計画のため）。', src: 'faa' },
    { k: '事実', t: '小型の訓練機と多くの旅客機が同じ空港を使い、英語の交信の中で高い状況認識が求められる（ANA の現地取材）。', src: 'ana' },
    { k: '教材の要約', t: 'Class C に入る前に管制との双方向の無線交信を確立する。Class B には「cleared into Class Bravo」の許可なしに入らない（一般則。実際の範囲と手順はチャートと AIM で確認）。', src: 'aim' },
    { k: '未確認・要確認', t: '空域の正確な範囲・高度、周波数、運用時間、最新の Hot Spot は変わることがある。実際の飛行では最新のチャート・Chart Supplement・NOTAM・管制の指示に従う。', src: 'vfr' },
  ];
  const AIRSPACE = [
    { name: 'Class C（SFB）', jp: '管制塔のある空港周辺の空域。入る前に管制機関と双方向の無線交信を確立する（相手がこちらのコールサインを言って応答した時点で「確立」）。', en: 'Establish two-way radio communications before entering Class C airspace.' },
    { name: 'Class B（Orlando）', jp: '大きな空港の周りの空域。入るには明確な許可（cleared into the Class Bravo）が必要。SFB の上空には Orlando の Class B がかぶっているため、上昇・降下の高度に注意する。', en: 'An explicit ATC clearance is required to enter Class B airspace.' },
    { name: '教材上の注意', jp: '本アプリは実空域を判定しません。空域の境界・高度・規則は FAA の最新チャートと規則で確認してください。', en: 'This app does not model real airspace.' },
  ];

  // ---------------------------------------------------------------- English ATC readback practice
  // CALLSIGN is FICTIONAL (架空). Frequencies, runways and instructions are TRAINING SCRIPTS, not real ATC.
  const CALLSIGN = { spoken: 'Archer Seven Lima Alpha', short: 'Archer 7LA' };
  const SCENES = [
    {
      id: 'luaw', title: 'Line up and wait（滑走路に入って待機）',
      situation: '滑走路 9R の手前で待機中。タワーから次の指示が来た。',
      atc: `${CALLSIGN.spoken}, Runway Niner Right, line up and wait.`,
      options: [
        `Runway 9 Right, line up and wait, ${CALLSIGN.short}.`,
        `Cleared for takeoff Runway 9 Right, ${CALLSIGN.short}.`,
        `Roger, ${CALLSIGN.short}.`,
        `Line up and wait, ${CALLSIGN.short}.`,
      ],
      answer: 0,
      why: '滑走路番号・指示・コールサインを復唱する。Line up and wait は「滑走路に入って待て」で、離陸許可ではない（離陸は cleared for takeoff を待つ）。Roger だけ、滑走路番号が抜けた復唱は不十分。',
      clarify: '聞き取れなかったときは推測で動かず「Say again」。どの滑走路か自信がなければ「Verify Runway 9 Right」と確認する。',
      refs: ['faa', 'aim'],
    },
    {
      id: 'holdshort', title: 'Hold short of Runway 27C at Charlie（誘導路 C で 27C 手前に待機）',
      situation: 'エプロンから地上管制に地上走行を要求した。',
      atc: `${CALLSIGN.spoken}, Runway Niner Right, taxi via Charlie, hold short of Runway Two Seven Center at Charlie.`,
      options: [
        `Taxi via Charlie, ${CALLSIGN.short}.`,
        `Runway 9 Right via Charlie, hold short Runway 27 Center at Charlie, ${CALLSIGN.short}.`,
        `Hold short, ${CALLSIGN.short}.`,
        `Runway 9 Right via Charlie, cross Runway 27 Center, ${CALLSIGN.short}.`,
      ],
      answer: 1,
      why: '滑走路の指定・誘導路・hold short の指示は、コールサイン付きで同じ送信内に復唱する（FAA の SFB 情報）。SFB の Hot Spot HS1 は誘導路 C と滑走路 27C の取り違え。標示の色（滑走路は白、誘導路は黄）も確認する。',
      clarify: '経路が分からないときは「Request progressive taxi」や「Say again the taxi route」で確認できる。停止すべきか迷ったら止まって確認する（FAA も迷ったら確認を勧めている）。',
      refs: ['faa', 'aim'],
    },
    {
      id: 'notus', title: '他機への指示（自分への指示と誤認しない）',
      situation: '滑走路 9L の手前で、離陸許可を待っている。タワーの送信が聞こえた。',
      atc: 'Cessna Four Kilo Papa, Runway Niner Left, cleared for takeoff.',
      options: [
        `Runway 9 Left, cleared for takeoff, ${CALLSIGN.short}.`,
        '（応答しない・待機を続ける）',
        `Roger, ${CALLSIGN.short}.`,
        '（滑走路に進入する）',
      ],
      answer: 1,
      why: 'コールサインが自機（Archer 7LA）ではない。他機への離陸許可を自分のものと思って動くのは、滑走路誤進入の典型。応答せず待機を続け、自分の番を待つ。',
      clarify: '自分宛てか確信がないときは「Tower, Archer 7LA, verify, was that for us?」のように確認する。',
      refs: ['aim', 'pcg'],
    },
    {
      id: 'altdir', title: '飛行方向と要求高度の回答',
      situation: '出発前、管制から北東方向への VFR 飛行の予定を尋ねられた（磁針路はおよそ 045°）。',
      atc: `${CALLSIGN.spoken}, say direction of flight and requested altitude.`,
      options: [
        `${CALLSIGN.short}, northeast bound, requesting four thousand five hundred.`,
        `${CALLSIGN.short}, northeast bound, requesting three thousand five hundred.`,
        `${CALLSIGN.short}, roger.`,
        `${CALLSIGN.short}, requesting northeast.`,
      ],
      answer: 1,
      why: '聞かれた 2 点（方向と高度）を両方答える。対地 3,000 ft を超える VFR 巡航では、磁針路 000〜179° は奇数千 ft + 500 ft（3,500 / 5,500…）、180〜359° は偶数千 ft + 500 ft を使う（14 CFR 91.159 の一般則）。045° なら 3,500 が該当する。',
      clarify: '指示の意味が分からないときは「Say again」、従えないときは「Unable」と言い、理由や代案を添える。',
      refs: ['aim', 'faa'],
    },
    {
      id: 'sayagain', title: 'Say again（聞き取れないときは推測しない）',
      situation: '地上走行中、混信で指示の一部しか聞き取れなかった。',
      atc: `${CALLSIGN.spoken}, ... hold ... Charlie ... (unreadable)`,
      options: [
        `Hold short at Charlie, ${CALLSIGN.short}.`,
        `Say again, ${CALLSIGN.short}.`,
        '（そのまま地上走行を続ける）',
        `Wilco, ${CALLSIGN.short}.`,
      ],
      answer: 1,
      why: '聞き取れた単語から推測して復唱・行動しない。「Say again」で全体の再送を求める。Wilco は「了解し従う」で、内容が分からないまま使ってはいけない。',
      clarify: '一部だけ聞き直すなら「Say again all after Charlie」のような言い方もある（AIM・Pilot/Controller Glossary）。',
      refs: ['aim', 'pcg'],
    },
    {
      id: 'pattern', title: '場周経路と報告',
      situation: 'タッチアンドゴーの練習中。タワーから指示があった。',
      atc: `${CALLSIGN.spoken}, make left closed traffic Runway Niner Right, report midfield downwind.`,
      options: [
        `Left closed traffic Runway 9 Right, report midfield downwind, ${CALLSIGN.short}.`,
        `Right traffic, ${CALLSIGN.short}.`,
        `Wilco.`,
        `Closed traffic, ${CALLSIGN.short}.`,
      ],
      answer: 0,
      why: '旋回方向（left）・滑走路・報告の地点を復唱する。左右の取り違えや滑走路番号の抜けは重大。FAA の SFB 情報では、訓練中の場周は upwind・crosswind・base を約 1 マイルで飛ぶよう求めている。',
      clarify: '指定された経路が飛べない（雲、他機など）ときは「Unable」と言い、代わりにできることを伝える。',
      refs: ['faa', 'aim'],
    },
  ];
  // the schematic diagram (SVG), clearly labelled: positions are schematic, NOT FOR NAVIGATION
  function diagramSvg() {
    const W = 640, H = 420, sc = 0.13, cx = W / 2 + 40, cy = H / 2;
    const pt = (n, e) => [cx + e * sc, cy - n * sc];
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sanford 空港の模式図（NOT FOR NAVIGATION）"><rect width="${W}" height="${H}" fill="#0d151f"/>`;
    for (const r of RUNWAYS) {
      const [x1, y1] = pt(r.n1, r.e1), [x2, y2] = pt(r.n2, r.e2);
      const hot = r.id === '09C/27C';
      s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${hot ? '#e8edf2' : '#c3ccd6'}" stroke-width="${Math.max(4, r.w * sc * 1.3).toFixed(1)}" stroke-linecap="butt"/>`;
      const [a, b] = r.id.split('/');
      s += `<text x="${(x1 - (x2 - x1) * 0.06).toFixed(1)}" y="${(y1 - (y2 - y1) * 0.06 + 4).toFixed(1)}" fill="#fff" font-size="13" font-family="monospace" text-anchor="middle">${a}</text>`;
      s += `<text x="${(x2 + (x2 - x1) * 0.06).toFixed(1)}" y="${(y2 + (y2 - y1) * 0.06 + 4).toFixed(1)}" fill="#fff" font-size="13" font-family="monospace" text-anchor="middle">${b}</text>`;
    }
    // taxiway C near 27C and the hot spot HS1 (schematic)
    const c1 = pt(330, -80), c2 = pt(330, 1300), hs = pt(250, 120);
    s += `<line x1="${c1[0]}" y1="${c1[1]}" x2="${c2[0]}" y2="${c2[1]}" stroke="#e8c547" stroke-width="3" stroke-dasharray="8 5"/>`;
    s += `<text x="${c1[0] - 6}" y="${c1[1] - 6}" fill="#e8c547" font-size="12" text-anchor="end">TWY C（模式）</text>`;
    s += `<circle cx="${hs[0]}" cy="${hs[1]}" r="22" fill="none" stroke="#ff5a4f" stroke-width="3"/><text x="${hs[0] + 26}" y="${hs[1] + 4}" fill="#ff5a4f" font-size="13" font-weight="700">HS1</text>`;
    s += `<text x="16" y="24" fill="#ffd23a" font-size="15" font-weight="700">模式図 · NOT FOR NAVIGATION</text>`;
    s += `<text x="16" y="44" fill="#9aa3ad" font-size="12">位置・角度・誘導路は概略です。実際の運航には FAA の最新空港図（Airport Diagram）を使ってください。</text>`;
    s += `<text x="16" y="${H - 14}" fill="#9aa3ad" font-size="12">滑走路長（公開データ）：09L/27R 11,002 ft · 09R/27L 5,839 ft · 18/36 6,002 ft · 09C/27C 3,578 ft</text>`;
    return s + '</svg>';
  }
  FL.sanford = { SRC, RUNWAYS, FACTS, AIRSPACE, CALLSIGN, SCENES, diagramSvg };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
