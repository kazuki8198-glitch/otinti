// CADET — content/academy-spec.js : the academy's ground floor (fictional), in the runway frame:
// a = along the runway, c = across (the apron side is low c, the car park high c), metres; rot in degrees
// (0 = the piece faces −c, towards the apron; 90 = faces +a; 180 = faces +c; 270 = faces −a).
// The shape of a day at the academy decides the plan: the briefing rooms face the flight line, dispatch sits between
// the lobby and the airside doors, the pilot room (headsets, kneeboards, the planning map) is on the way out, the
// lounge at the quiet end; the simulator room, the instructors' office and the planning room on the car-park side.
// The words on the boards come from FLIGHT LAB's own lessons and aircraft data (so they always agree with it).
// Interior: a 608.4–701.6, c 248.4–277.6; the lobby a 646–664 from its glass front at c 249.0. Ceilings 3.0 m
// (the corridors 2.8 m, the lobby open to 7.8 m). The ribbon windows are 1.0–2.7 m high.

const strip = (s) => String(s).replace(/<[^>]+>/g, '');

export function academySpec(FL) {
  const S = FL.syllabus.STAGES, lesson = (id) => S.flatMap(s => s.lessons).find(l => l.id === id) || {};
  const ac = (id) => FL.physics.AIRCRAFT.find(a => a.id === id);
  const AR = ac('pa28'), SM = ac('pa44');
  const a1 = lesson('a1'), t1 = lesson('t1'), a2 = lesson('a2'), n2 = lesson('n2');

  // ---------------------------------------------------------------- furniture helpers
  const rows = (type, a0, a1_, c0, c1, da, dc, rot) => { const out = []; for (let a = a0; a <= a1_ + 1e-6; a += da) for (let c = c0; c <= c1 + 1e-6; c += dc) out.push({ type, a: +a.toFixed(2), c: +c.toFixed(2), rot }); return out; };
  const lightsGrid = (a0, a1_, c0, c1, step = 3) => { const out = []; const na = Math.max(1, Math.round((a1_ - a0) / step)), nc = Math.max(1, Math.round((c1 - c0) / step)); for (let i = 0; i < na; i++) for (let j = 0; j < nc; j++) out.push({ a: +(a0 + (i + 0.5) * (a1_ - a0) / na).toFixed(2), c: +(c0 + (j + 0.5) * (c1 - c0) / nc).toFixed(2) }); return out; };
  // a briefing room: a whiteboard on its south wall (facing +a), a long table, chairs both sides, a model on a stand
  const briefing = (id, name, a0, a1_, extra = []) => ({
    id, name_ja: name, purpose: '教官とのブリーフィングと講評（飛行の前後）。窓からフライトライン（駐機場）が見える。',
    a0, a1: a1_, c0: 248.4, c1: 261.0, floor: 'carpet', ceiling: 3.0, closed: false,
    lights: lightsGrid(a0 + 0.5, a1_ - 0.5, 249, 260.5, 3.2),
    furniture: [
      { type: 'whiteboard', a: a0 + 0.06, c: 254.6, rot: 90 },
      { type: 'wall_screen', a: a0 + 0.06, c: 258.4, rot: 90 },
      { type: 'table_long', a: a0 + 6.0, c: 254.6, rot: 0 },
      ...rows('office_chair', a0 + 4.2, a0 + 7.8, 253.3, 253.3, 1.2, 1, 180),
      ...rows('office_chair', a0 + 4.2, a0 + 7.8, 255.9, 255.9, 1.2, 1, 0),
      { type: 'office_chair', a: a0 + 9.2, c: 254.6, rot: 270 },
      { type: 'model_aircraft_stand', a: a1_ - 1.2, c: 250.0, rot: 0 },
      { type: 'plant', a: a1_ - 0.8, c: 260.2, rot: 0 },
      { type: 'wall_clock', a: a1_ - 0.06, c: 254.6, rot: 270 },
      { type: 'trash_bin', a: a0 + 1.0, c: 260.3, rot: 0 },
      // the training area's map on the corridor wall, a shelf of manuals, a desk by the window for one-to-one debriefs
      { type: 'map_wall', a: a0 + 6.2, c: 260.94, rot: 0 },
      { type: 'bookshelf', a: a1_ - 0.2, c: 257.6, rot: 270 },
      { type: 'desk', a: a0 + 3.2, c: 251.4, rot: 180 }, { type: 'office_chair', a: a0 + 3.2, c: 250.4, rot: 180 },
      { type: 'office_chair', a: a0 + 3.2, c: 252.6, rot: 0 },
      ...extra,
    ],
  });

  const rooms = [
    // ------------------------------------------------ the south wing, apron side: three briefing rooms
    briefing('brief-3', 'ブリーフィング室 3', 608.4, 621.0),
    briefing('brief-2', 'ブリーフィング室 2', 621.0, 633.6),
    briefing('brief-1', 'ブリーフィング室 1', 633.6, 646.0),
    // ------------------------------------------------ the south corridor
    { id: 'corridor-s', name_ja: '南の廊下', purpose: 'ブリーフィング室・訓練装置室・教官室とロビーを結ぶ。', a0: 608.4, a1: 646.0, c0: 261.0, c1: 263.6, floor: 'vinyl', ceiling: 2.8, closed: false,
      lights: lightsGrid(609, 645.5, 261.2, 263.4, 3.4),
      furniture: [
        { type: 'bulletin_board', a: 630.0, c: 263.54, rot: 0 },
        { type: 'exit_sign', a: 608.46, c: 262.3, rot: 90, note: 'south end' },
        { type: 'water_cooler', a: 609.2, c: 263.1, rot: 270 },
        { type: 'trash_bin', a: 610.0, c: 263.2, rot: 0 },
      ] },
    // ------------------------------------------------ the south wing, car-park side
    { id: 'sim', name_ja: '訓練装置室（FTD）', purpose: '地上学科と手順の練習：PFD の読み方、英語交信（第 0 段階の k1〜k6）。', a0: 608.4, a1: 630.0, c0: 263.6, c1: 277.6, floor: 'carpet', ceiling: 3.0, closed: false,
      lights: lightsGrid(609, 629.5, 264, 277, 3.2),
      furniture: [
        ...rows('sim_station', 611.5, 626.5, 268.0, 268.0, 5.0, 1, 0),
        ...rows('office_chair', 611.5, 626.5, 266.6, 266.6, 5.0, 1, 180),
        ...rows('sim_station', 611.5, 626.5, 274.4, 274.4, 5.0, 1, 0),
        ...rows('office_chair', 611.5, 626.5, 273.0, 273.0, 5.0, 1, 180),
        { type: 'wall_screen', a: 629.94, c: 270.6, rot: 270 },
        { type: 'headset_rack', a: 609.0, c: 270.6, rot: 90 },
        { type: 'plant', a: 629.2, c: 276.8, rot: 0 },
      ] },
    { id: 'wc', name_ja: 'お手洗い', purpose: '（M1 では閉鎖）', a0: 630.0, a1: 637.0, c0: 263.6, c1: 277.6, floor: 'tile', ceiling: 2.8, closed: true, lights: [], furniture: [] },
    { id: 'stairs', name_ja: '階段（2 階）', purpose: '（2 階は準備中）', a0: 637.0, a1: 646.0, c0: 263.6, c1: 277.6, floor: 'terrazzo', ceiling: 3.0, closed: true, lights: [], furniture: [] },
    // ------------------------------------------------ the lobby (double height, the glass front to the apron)
    { id: 'lobby', name_ja: 'ロビー', purpose: '入口。今日のフライトの状況表示、受付、待合い。ガラス越しに駐機場。', a0: 646.0, a1: 664.0, c0: 249.0, c1: 277.6, floor: 'terrazzo', ceiling: 7.8, closed: false,
      lights: [...lightsGrid(647.5, 662.5, 251, 276, 4.5)],
      furniture: [
        { type: 'flight_status_board', a: 646.06, c: 268.5, rot: 90 },
        { type: 'reception_desk', a: 660.5, c: 270.5, rot: 270 },
        { type: 'office_chair', a: 662.3, c: 270.5, rot: 270 },
        { type: 'sofa', a: 662.6, c: 256.0, rot: 270 },
        { type: 'sofa', a: 660.0, c: 259.4, rot: 0 },
        { type: 'coffee_table', a: 660.0, c: 256.0, rot: 0 },
        { type: 'model_aircraft_stand', a: 649.0, c: 252.5, rot: 0, note: 'Seminole' },
        { type: 'plant', a: 646.9, c: 250.0, rot: 0 }, { type: 'plant', a: 663.1, c: 250.0, rot: 0 },
        { type: 'plant', a: 646.9, c: 276.7, rot: 0 }, { type: 'plant', a: 663.1, c: 276.7, rot: 0 },
        { type: 'sign_board', a: 663.94, c: 262.3, rot: 270, note: 'directions north', y: 3.3 },
        { type: 'sign_board', a: 646.06, c: 262.3, rot: 90, note: 'directions south', y: 3.3 },
        { type: 'flag_stand', a: 662.6, c: 274.2, rot: 270 },
        { type: 'bench', a: 660.0, c: 250.6, rot: 0 },
        { type: 'sign_board', a: 663.94, c: 259.6, rot: 270, note: 'plaque', y: 1.7 },
        { type: 'model_aircraft_stand', a: 649.5, c: 271.5, rot: 0, note: 'Archer' },
        { type: 'bench', a: 649.4, c: 258.5, rot: 90 },
        { type: 'plant', a: 651.6, c: 276.7, rot: 0 }, { type: 'plant', a: 658.4, c: 276.7, rot: 0 },
      ] },
    // ------------------------------------------------ the north wing, apron side
    { id: 'dispatch', name_ja: '運航管理（ディスパッチ）', purpose: '今日の予定・機体の割り当て・気象（METAR / TAF）。飛ぶ前に必ず寄る。', a0: 664.0, a1: 676.0, c0: 248.4, c1: 261.0, floor: 'vinyl', ceiling: 3.0, closed: false,
      lights: lightsGrid(664.5, 675.5, 249, 260.5, 3.2),
      furniture: [
        { type: 'counter', a: 670.0, c: 256.2, rot: 180, note: 'dispatch counter facing the corridor side' },
        { type: 'desk', a: 667.0, c: 251.4, rot: 180 }, { type: 'office_chair', a: 667.0, c: 250.4, rot: 180 },
        { type: 'desk', a: 672.5, c: 251.4, rot: 180 }, { type: 'office_chair', a: 672.5, c: 250.4, rot: 180 },
        { type: 'stool', a: 668.5, c: 257.6, rot: 0 }, { type: 'stool', a: 671.5, c: 257.6, rot: 0 },
        { type: 'whiteboard', a: 675.94, c: 257.5, rot: 270, note: 'schedule' },
        { type: 'wall_screen', a: 675.94, c: 252.6, rot: 270, note: 'weather' },
        { type: 'printer', a: 664.8, c: 254.8, rot: 90 },
        { type: 'wall_clock', a: 664.06, c: 252.0, rot: 90 },
        { type: 'kneeboard_shelf', a: 664.3, c: 250.6, rot: 90, note: 'aircraft keys and logs' },
      ] },
    { id: 'pilot', name_ja: 'パイロットルーム', purpose: 'ヘッドセットとニーボードを取り、地図で飛行を計画する。外への通り道。', a0: 676.0, a1: 688.0, c0: 248.4, c1: 261.0, floor: 'vinyl', ceiling: 3.0, closed: false,
      lights: lightsGrid(676.5, 687.5, 249, 260.5, 3.2),
      furniture: [
        { type: 'headset_rack', a: 676.3, c: 258.0, rot: 90 },
        { type: 'kneeboard_shelf', a: 676.3, c: 254.6, rot: 90 },
        { type: 'locker_bank', a: 687.7, c: 258.2, rot: 270 },
        { type: 'locker_bank', a: 687.7, c: 254.6, rot: 270 },
        { type: 'map_wall', a: 683.6, c: 260.94, rot: 0 },
        { type: 'table_long', a: 682.0, c: 254.0, rot: 0 },
        ...rows('stool', 680.0, 684.0, 252.7, 252.7, 2.0, 1, 180),
        ...rows('stool', 680.0, 684.0, 255.3, 255.3, 2.0, 1, 0),
        { type: 'bulletin_board', a: 687.94, c: 251.2, rot: 270, note: 'safety' },
        { type: 'bench', a: 679.0, c: 249.2, rot: 180 },
      ] },
    { id: 'lounge', name_ja: '訓練生ラウンジ', purpose: '休憩と自習。同期と話す場所（M5）。', a0: 688.0, a1: 701.6, c0: 248.4, c1: 261.0, floor: 'carpet', ceiling: 3.0, closed: false,
      lights: lightsGrid(688.5, 701, 249, 260.5, 3.2),
      furniture: [
        { type: 'sofa', a: 693.0, c: 251.0, rot: 180 }, { type: 'sofa', a: 697.5, c: 251.0, rot: 180 },
        { type: 'coffee_table', a: 695.2, c: 253.0, rot: 0 },
        { type: 'sofa', a: 695.2, c: 255.5, rot: 0 },
        { type: 'table_long', a: 691.0, c: 258.6, rot: 0 },
        ...rows('office_chair', 690.0, 692.0, 257.5, 257.5, 2.0, 1, 180),
        { type: 'coffee_machine', a: 701.3, c: 258.2, rot: 270 },
        { type: 'fridge', a: 701.25, c: 256.6, rot: 270 },
        { type: 'vending_machine', a: 701.15, c: 254.9, rot: 270 },
        { type: 'bookshelf', a: 688.3, c: 252.0, rot: 90 },
        { type: 'bulletin_board', a: 688.06, c: 257.0, rot: 90, note: 'notices' },
        { type: 'plant', a: 700.8, c: 249.4, rot: 0 }, { type: 'plant', a: 688.9, c: 249.4, rot: 0 },
        { type: 'wall_clock', a: 701.54, c: 252.0, rot: 270 },
      ] },
    // ------------------------------------------------ the north corridor
    { id: 'corridor-n', name_ja: '北の廊下', purpose: '運航管理・パイロットルーム・ラウンジ・教官室とロビーを結ぶ。', a0: 664.0, a1: 701.6, c0: 261.0, c1: 263.6, floor: 'vinyl', ceiling: 2.8, closed: false,
      lights: lightsGrid(664.5, 701, 261.2, 263.4, 3.4),
      furniture: [
        { type: 'exit_sign', a: 701.54, c: 262.3, rot: 270, note: 'north end' },
        { type: 'bulletin_board', a: 692.0, c: 263.54, rot: 0, note: 'crm' },
        { type: 'water_cooler', a: 700.9, c: 263.1, rot: 270 },
      ] },
    // ------------------------------------------------ the north wing, car-park side
    { id: 'instructors', name_ja: '教官室', purpose: '教官の机。講評の記録と予定の調整（M2 以降、担当教官がいる）。', a0: 664.0, a1: 682.0, c0: 263.6, c1: 277.6, floor: 'carpet', ceiling: 3.0, closed: false,
      lights: lightsGrid(664.5, 681.5, 264, 277, 3.2),
      furniture: [
        ...rows('desk', 667.0, 679.0, 268.0, 268.0, 4.0, 1, 0), ...rows('office_chair', 667.0, 679.0, 269.1, 269.1, 4.0, 1, 0),
        ...rows('desk', 667.0, 679.0, 274.0, 274.0, 4.0, 1, 180), ...rows('office_chair', 667.0, 679.0, 272.9, 272.9, 4.0, 1, 180),
        { type: 'bookshelf', a: 681.7, c: 266.0, rot: 270 }, { type: 'bookshelf', a: 681.7, c: 268.2, rot: 270 },
        { type: 'printer', a: 664.6, c: 276.6, rot: 90 },
        { type: 'whiteboard', a: 664.06, c: 271.0, rot: 90, note: 'instructor schedule' },
        { type: 'plant', a: 681.0, c: 276.8, rot: 0 },
      ] },
    { id: 'planning', name_ja: '計画室', purpose: '航法の計画（第 2 段階）：地図、計算盤、天気。今は静かな自習室。', a0: 682.0, a1: 701.6, c0: 263.6, c1: 277.6, floor: 'carpet', ceiling: 3.0, closed: false,
      lights: lightsGrid(682.5, 701, 264, 277, 3.2),
      furniture: [
        ...rows('table_long', 686.0, 698.0, 270.6, 270.6, 6.0, 1, 0),
        ...rows('office_chair', 685.0, 699.0, 269.3, 269.3, 2.0, 1, 180),
        ...rows('office_chair', 685.0, 699.0, 271.9, 271.9, 2.0, 1, 0),
        { type: 'map_wall', a: 701.54, c: 270.6, rot: 270 },
        { type: 'bookshelf', a: 682.3, c: 275.6, rot: 90 },
        { type: 'plant', a: 700.8, c: 276.8, rot: 0 },
      ] },
  ];

  // ---------------------------------------------------------------- doors (wall 'a': a line of constant a; 'c': of constant c)
  const doors = [
    { id: 'd-brief-1', rooms: ['brief-1', 'corridor-s'], kind: 'swing', wall: 'c', at: 261.0, from: 642.6, to: 643.6, label_ja: 'ブリーフィング室 1' },
    { id: 'd-brief-2', rooms: ['brief-2', 'corridor-s'], kind: 'swing', wall: 'c', at: 261.0, from: 630.2, to: 631.2, label_ja: 'ブリーフィング室 2' },
    { id: 'd-brief-3', rooms: ['brief-3', 'corridor-s'], kind: 'swing', wall: 'c', at: 261.0, from: 617.6, to: 618.6, label_ja: 'ブリーフィング室 3' },
    { id: 'd-sim', rooms: ['sim', 'corridor-s'], kind: 'double_swing', wall: 'c', at: 263.6, from: 622.0, to: 623.8, label_ja: '訓練装置室（FTD）' },
    { id: 'd-wc', rooms: ['wc', 'corridor-s'], kind: 'locked', wall: 'c', at: 263.6, from: 633.0, to: 634.0, label_ja: 'お手洗い（清掃中）' },
    { id: 'd-stairs', rooms: ['stairs', 'lobby'], kind: 'locked', wall: 'a', at: 646.0, from: 273.6, to: 275.4, label_ja: '階段：2 階は準備中' },
    { id: 'o-south', rooms: ['corridor-s', 'lobby'], kind: 'opening', wall: 'a', at: 646.0, from: 261.0, to: 263.6, label_ja: '' },
    { id: 'o-north', rooms: ['corridor-n', 'lobby'], kind: 'opening', wall: 'a', at: 664.0, from: 261.0, to: 263.6, label_ja: '' },
    { id: 'd-dispatch', rooms: ['dispatch', 'lobby'], kind: 'double_swing', wall: 'a', at: 664.0, from: 257.4, to: 259.2, label_ja: '運航管理' },
    { id: 'd-dispatch-c', rooms: ['dispatch', 'corridor-n'], kind: 'swing', wall: 'c', at: 261.0, from: 674.4, to: 675.4, label_ja: '運航管理' },
    { id: 'd-pilot', rooms: ['pilot', 'corridor-n'], kind: 'double_swing', wall: 'c', at: 261.0, from: 678.6, to: 680.4, label_ja: 'パイロットルーム' },
    { id: 'd-lounge', rooms: ['lounge', 'corridor-n'], kind: 'double_swing', wall: 'c', at: 261.0, from: 690.0, to: 691.8, label_ja: '訓練生ラウンジ' },
    { id: 'd-instructors', rooms: ['instructors', 'corridor-n'], kind: 'swing', wall: 'c', at: 263.6, from: 666.4, to: 667.4, label_ja: '教官室' },
    { id: 'd-planning', rooms: ['planning', 'corridor-n'], kind: 'swing', wall: 'c', at: 263.6, from: 690.4, to: 691.4, label_ja: '計画室' },
    { id: 'x-airside', rooms: ['lobby', 'outside'], kind: 'sliding_auto', wall: 'c', at: 249.0, from: 653.0, to: 657.0, label_ja: 'エプロン（駐機場）へ' },
    { id: 'x-main', rooms: ['lobby', 'outside'], kind: 'sliding_auto', wall: 'c', at: 277.6, from: 653.0, to: 657.0, label_ja: '正面入口（駐車場）' },
  ];

  // ---------------------------------------------------------------- what can be examined (E)
  const fmtList = (xs) => xs.map(x => '・' + x).join('\n');
  const tails = ['N731SY', 'N732SY', 'N735SY', 'N738SY', 'N741SY', 'N744SY', 'N452SY'];
  const today = [
    ['08:00', tails[0], 'Archer', 'a1 ' + a1.title, '完了'],
    ['09:30', tails[3], 'Archer', `t1 → a2 ${a2.title} → t3`, '準備中'],     // the player's day and aircraft (N738SY)
    ['10:00', tails[2], 'Archer', 'a3 ' + (lesson('a3').title || ''), '準備中'],
    ['11:00', tails[1], 'Archer', 't1 ' + t1.title, '予定'],
    ['13:00', tails[4], 'Archer', 't3 ' + (lesson('t3').title || ''), '予定'],
    ['14:30', tails[6], 'Seminole', 'm1 ' + (lesson('m1').title || ''), '天候待ち（午後の雷雨）'],
    ['16:00', tails[5], 'Archer', 'x1 ' + (lesson('x1').title || ''), '予定'],
  ];
  const interactables = [
    { id: 'wb-brief-1', room: 'brief-1', a: 633.7, c: 254.6, y: 1.5, prompt_ja: 'ホワイトボードを見る', title_ja: `本日：a2 ${a2.title}（t1 → a2 → t3）`,
      text_ja: `目的：${a2.goal}\n今日の流れ：外部点検 → エンジン始動 → ATIS・地上管制 → タキシー → ランナップ → t1 ${t1.title} → 訓練空域で a2 → 帰投・t3 ${lesson('t3').title} → 駐機・講評\n基準：${a2.std}\n天気：風 010° 5 kt・視程 10 SM 以上・高度計 29.92（架空）` },
    { id: 'model-archer', room: 'brief-1', a: 644.8, c: 250.0, y: 1.2, prompt_ja: '模型を見る', title_ja: 'Piper PA-28-181 Archer（訓練の単発機）',
      text_ja: `低翼・単発・固定脚の 4 人乗り。G1000 型の画面で飛ぶ。\n離陸の速度 Vr ${AR.v.rotate} kt、上昇 Vy ${AR.v.y} kt・Vx ${AR.v.x} kt、進入 ${AR.v.appr} kt、最良滑空 ${AR.v.glide} kt。\n（訓練用の目安の値です。実機はその機体の POH に従います）` },
    { id: 'wb-brief-2', room: 'brief-2', a: 621.1, c: 254.6, y: 1.5, prompt_ja: 'ホワイトボードを見る', title_ja: `復習：t1 ${t1.title}`,
      text_ja: `目的：${t1.goal}\n${(t1.brief || []).slice(1).map(strip).join('\n')}\n基準：${t1.std}` },
    { id: 'wb-brief-3', room: 'brief-3', a: 608.5, c: 254.6, y: 1.5, prompt_ja: 'ホワイトボードを見る', title_ja: `予習：n2 ${n2.title || '推測航法'}`,
      text_ja: `目的：${n2.goal || ''}\n風を読んで針路を決める（風下に流される分だけ風上に向ける）\n時間＝距離 ÷ 対地速度。途中で行き先が変わったら、新しい針路・距離・時間を見積もり直す。` },
    { id: 'sim-station', room: 'sim', a: 616.5, c: 268.0, y: 1.1, prompt_ja: '訓練装置を見る', title_ja: '訓練装置（FTD 風の練習席）',
      text_ja: 'G1000 型の画面と操縦輪・スロットルの練習席。\n第 0 段階の地上学科（PFD の読み方 k1・k2、英語交信 k3〜k6）はここで。\n練習席はいま準備中です。' },
    { id: 'status-board', room: 'lobby', a: 646.2, c: 268.5, y: 2.6, prompt_ja: '今日のフライトを見る', title_ja: '本日のフライト（LAB 飛行場）',
      text_ja: today.map(r => `${r[0]}  ${r[1]}  ${r[2]}  ${r[3]}  ${r[4]}`).join('\n') },
    { id: 'plaque', room: 'lobby', a: 663.8, c: 259.6, y: 1.7, prompt_ja: '銘板を読む', title_ja: '翔洋航空 フライトアカデミー',
      text_ja: '翔洋航空の自社養成パイロットが、基礎訓練（単発機・航法・計器・双発）を受ける訓練所です。\nこのゲームの航空会社・訓練所・人物はすべて架空です。公開情報を基にした非公式のゲームで、実機訓練の代わりにはなりません。' },
    { id: 'model-seminole', room: 'lobby', a: 649.0, c: 252.5, y: 1.2, prompt_ja: '模型を見る', title_ja: 'Piper PA-44-180 Seminole（訓練の双発機）',
      text_ja: `双発・引き込み脚・T 字尾翼。第 4 段階で片発停止の扱いを学ぶ。\n最小操縦速度 Vmc ${SM.v.mc} kt（赤線）、片発での最良上昇率 Vyse ${SM.v.yse} kt（青線）。\n（訓練用の目安の値です。実機はその機体の POH に従います）` },
    { id: 'schedule', room: 'dispatch', a: 675.8, c: 257.5, y: 1.5, prompt_ja: '予定表を見る', title_ja: '本日の割り当て（運航管理）',
      text_ja: today.slice(0, 5).map(r => `${r[0]} ${r[1]} ${r[3]}`).join('\n') + '\n※ 14:30 以降は雷雨の予報：運航管理と相談して判断' },
    { id: 'metar', room: 'dispatch', a: 675.8, c: 252.6, y: 1.6, prompt_ja: '気象を見る', title_ja: '気象（KLAB は架空の飛行場）',
      text_ja: 'METAR KLAB 121253Z 00405KT 10SM FEW035 SCT250 15/08 A2992\nTAF KLAB 121130Z 1212/1312 00405KT P6SM FEW035\n  TEMPO 1219/1222 4SM TSRA BKN030CB\n読み方：風 004°（真方位）5 kt、視程 10 SM、3,500 ft に少しの雲。気温 15℃・露点 8℃、高度計 29.92。\n午後 3〜6 時（現地時刻。EDT＝Z−4 なので 19〜22Z）は一時的に雷雨。\nATIS は磁方位で伝えるので、風は「010 at 5」と聞こえます。' },
    { id: 'counter', room: 'dispatch', a: 670.0, c: 257.4, y: 1.1, prompt_ja: 'カウンターで尋ねる', title_ja: '運航管理のカウンター',
      text_ja: '飛ぶ前にここで、機体の割り当て・燃料・天気を確かめ、機体の書類と鍵を受け取る。' },
    { id: 'headsets', room: 'pilot', a: 676.4, c: 258.0, y: 1.4, prompt_ja: 'ヘッドセットを見る', title_ja: 'ヘッドセット',
      text_ja: '機内はエンジン音が大きいので、教官・管制との会話はすべてヘッドセットで。\n使う前に：マイクの位置（口元から 1 cm ほど）、音量、ケーブルの差し込みを確認。' },
    { id: 'kneeboard', room: 'pilot', a: 676.4, c: 254.6, y: 1.2, prompt_ja: 'ニーボードを見る', title_ja: 'ニーボード',
      text_ja: '膝に付ける小さな板。ATIS・管制の指示・周波数・時間をここに書き留める。\n今日は：ATIS の記号と高度計、タキシーの指示、離陸の時刻、気づいたこと。' },
    { id: 'map', room: 'pilot', a: 683.6, c: 260.8, y: 1.6, prompt_ja: '地図を見る', title_ja: 'LAB 訓練空域図（架空・NOT FOR NAVIGATION）',
      text_ja: 'LAB 飛行場（滑走路 36/18）、LAB VOR、訓練点 LAB-A〜F（色の塔が目印）、湖。\n空中操作の課目は訓練空域（飛行場の北東）で行います。' },
    { id: 'imsafe', room: 'pilot', a: 687.8, c: 251.2, y: 1.5, prompt_ja: 'ポスターを読む', title_ja: 'IMSAFE：飛ぶ前の自分の点検',
      text_ja: 'I 病気（Illness）\nM 薬（Medication）\nS ストレス（Stress）\nA アルコール（Alcohol）\nF 疲労（Fatigue）\nE 食事・水分（Eating）\nひとつでも不安があれば、教官に言って飛ばない判断を。' },
    { id: 'notices', room: 'lounge', a: 688.2, c: 257.0, y: 1.5, prompt_ja: '掲示板を見る', title_ja: '訓練生のお知らせ',
      text_ja: '第 1 段階の学科試験：来週月曜 9:00（計画室）\n午後は雷雨が多い季節。飛行は午前中心に組んでいます\n英語交信の自主練：毎晩 19:00 訓練装置室\nヘッドセットは使ったら元の場所へ\n冷蔵庫の中身には名前を！' },
    { id: 'coffee', room: 'lounge', a: 701.1, c: 258.2, y: 1.2, prompt_ja: 'コーヒーを見る', title_ja: 'コーヒーマシン',
      text_ja: '訓練生の燃料。\nただし飛ぶ前の飲みすぎは禁物：カフェインの取りすぎは手の震えと脱水のもと（IMSAFE の E）。' },
    { id: 'crm', room: 'corridor-n', a: 692.0, c: 263.4, y: 1.5, prompt_ja: 'ポスターを読む', title_ja: 'TEM：脅威とエラーを管理する',
      text_ja: '出発前に「今日の脅威」を言葉にする：突風、混雑した場周、自分の疲れ…\n気づいたら声に出す。分からなければ聞き返す。\n（第 5 段階：CRM・TEM で詳しく）' },
  ];

  return {
    rooms, doors, interactables,
    start: { room: 'brief-1', a: 642.2, c: 254.6, yawToward: { a: 633.6, c: 254.6 } },
    // from the briefing room to the airside doors and out to today's Archer (stand 19: a 636.5, c 207.6, nose to −c):
    // past its tail to the back of the right wing, where you climb in
    route: [
      { a: 643.1, c: 259.5, note: 'ブリーフィング室 1 の扉の前' },
      { a: 643.1, c: 262.3, note: '南の廊下' },
      { a: 649.0, c: 262.3, note: 'ロビーへ' },
      { a: 655.0, c: 253.0, note: 'エプロンへの自動ドアの前' },
      { a: 655.0, c: 244.0, note: '外（ひさしの下）' },
      { a: 641.0, c: 222.0, note: '駐機場' },
      { a: 641.5, c: 214.0, note: '尾翼の横（近づきすぎない）' },
      { a: 638.8, c: 209.3, note: '今日の Archer（N738SY）の右の翼の後ろ：乗り込む側' },
    ],
    target: { a: 636.5, c: 207.6, note: '今日の機体' },
  };
}
