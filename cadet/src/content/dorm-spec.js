// CADET — content/dorm-spec.js : the cadets' dormitory (fictional), in the runway frame, in the same shape as
// content/academy-spec.js (rooms / doors / interactables / furniture), so world/dorm.js can build it with the same
// kit. The building stands east of the car park (world/layout.js DORM: a 618–666, c 366–390); the road from the
// car park ends at its west face. Inside (a 618.4–665.6, c 366.4–389.6): a spine corridor (c 376.8–379.2) with the
// cadet's own room at the south-west end, the entrance hall in the middle of the west side where the road arrives,
// the common room and the kitchen on the east side, the peers' rooms (doors only until Phase 2), laundry, bath, WC.
export function dormSpec() {
  const lightsGrid = (a0, a1_, c0, c1, step = 3) => { const out = []; const na = Math.max(1, Math.round((a1_ - a0) / step)), nc = Math.max(1, Math.round((c1 - c0) / step)); for (let i = 0; i < na; i++) for (let j = 0; j < nc; j++) out.push({ a: +(a0 + (i + 0.5) * (a1_ - a0) / na).toFixed(2), c: +(c0 + (j + 0.5) * (c1 - c0) / nc).toFixed(2) }); return out; };
  // a peer's room: a bed, a desk and a chair (the door stays locked until the evening visits of Phase 2)
  const peerRoom = (id, name, a0, a1, c0, c1) => ({
    id, name_ja: name, purpose: '同期の部屋（入室は夜の訪問イベントで）。', a0, a1, c0, c1, floor: 'carpet', ceiling: 3.0, closed: false,
    lights: lightsGrid(a0 + 0.5, a1 - 0.5, c0 + 0.5, c1 - 0.5, 3.4),
    furniture: [
      { type: 'bed', a: a0 + 1.6, c: c0 + 1.6, rot: 90 },
      { type: 'desk', a: a1 - 1.8, c: c1 - 1.2, rot: 270 }, { type: 'office_chair', a: a1 - 1.8, c: c1 - 2.6, rot: 90 },
      { type: 'plant', a: a0 + 0.9, c: c1 - 0.9, rot: 0 },
    ],
  });

  const rooms = [
    // ------------------------------------------------ the west side, from the south
    { id: 'dorm-room', name_ja: '自室', purpose: '自分の部屋。ベッドで今日を終え、机で夜の自習をする。', a0: 618.4, a1: 628.4, c0: 366.4, c1: 376.8, floor: 'carpet', ceiling: 3.0, closed: false,
      lights: lightsGrid(619, 627.9, 367, 376.3, 3.2),
      furniture: [
        { type: 'bed', a: 620.3, c: 368.4, rot: 90 },
        { type: 'desk', a: 623.0, c: 375.4, rot: 270 }, { type: 'office_chair', a: 623.0, c: 374.0, rot: 90 },
        { type: 'wardrobe', a: 619.8, c: 375.6, rot: 270 },
        { type: 'bookshelf', a: 628.0, c: 372.6, rot: 270 },
        { type: 'map_wall', a: 620.5, c: 376.74, rot: 0 },
        { type: 'wall_clock', a: 628.34, c: 370.0, rot: 270 },
        { type: 'plant', a: 627.6, c: 367.3, rot: 0 },
        { type: 'trash_bin', a: 625.4, c: 376.0, rot: 0 },
      ] },
    peerRoom('dorm-peer-1', '桐生の部屋', 628.4, 638.4, 366.4, 376.8),
    { id: 'dorm-entrance', name_ja: '寮の玄関', purpose: '下駄箱と掲示板。西の道路がアカデミーへの道。', a0: 638.4, a1: 648.4, c0: 366.4, c1: 376.8, floor: 'tile', ceiling: 3.0, closed: false,
      lights: lightsGrid(639, 647.9, 367, 376.3, 3.2),
      furniture: [
        { type: 'locker_bank', a: 639.8, c: 375.4, rot: 270 }, { type: 'locker_bank', a: 647.0, c: 375.4, rot: 270 },
        { type: 'bulletin_board', a: 638.46, c: 371.5, rot: 90 },
        { type: 'bench', a: 643.2, c: 367.8, rot: 90 },
        { type: 'plant', a: 639.2, c: 367.4, rot: 0 }, { type: 'plant', a: 647.6, c: 367.4, rot: 0 },
      ] },
    peerRoom('dorm-peer-2', '朝日の部屋', 648.4, 658.4, 366.4, 376.8),
    { id: 'dorm-wc', name_ja: 'トイレ', purpose: '廊下の北端。', a0: 658.4, a1: 665.6, c0: 366.4, c1: 376.8, floor: 'tile', ceiling: 2.8, closed: false,
      lights: lightsGrid(659, 665.1, 367, 376.3, 3.2),
      furniture: [
        { type: 'bench', a: 664.6, c: 368.4, rot: 270 },
        { type: 'trash_bin', a: 659.4, c: 375.8, rot: 0 },
      ] },
    // ------------------------------------------------ the spine corridor
    { id: 'dorm-corridor', name_ja: '寮の廊下', purpose: '自室・談話室・食堂・ランドリーを結ぶ。', a0: 618.4, a1: 665.6, c0: 376.8, c1: 379.2, floor: 'vinyl', ceiling: 2.8, closed: false,
      lights: lightsGrid(619, 665.1, 377.2, 378.8, 3.4),
      furniture: [
        { type: 'bulletin_board', a: 650.0, c: 379.14, rot: 180 },
        { type: 'bulletin_board', a: 626.0, c: 376.86, rot: 0 },
      ] },
    // ------------------------------------------------ the east side, from the south
    peerRoom('dorm-peer-3', '森の部屋', 618.4, 628.4, 379.2, 389.6),
    { id: 'dorm-common', name_ja: '談話室', purpose: '夜、同期が集まる場所。ソファとテレビ、本棚。', a0: 628.4, a1: 640.4, c0: 379.2, c1: 389.6, floor: 'carpet', ceiling: 3.0, closed: false,
      lights: lightsGrid(629, 639.9, 380, 389.1, 3.2),
      furniture: [
        { type: 'sofa', a: 632.0, c: 383.0, rot: 0 }, { type: 'sofa', a: 637.6, c: 383.0, rot: 180 },
        { type: 'coffee_table', a: 634.8, c: 383.0, rot: 0 },
        { type: 'wall_screen', a: 634.0, c: 389.54, rot: 270 },
        { type: 'bookshelf', a: 639.9, c: 386.0, rot: 270 },
        { type: 'coffee_machine', a: 629.3, c: 381.0, rot: 90 },
        { type: 'vending_machine', a: 629.2, c: 388.6, rot: 270 },
        { type: 'table_long', a: 634.0, c: 387.6, rot: 90 },
        { type: 'office_chair', a: 632.6, c: 387.6, rot: 0 }, { type: 'office_chair', a: 635.4, c: 387.6, rot: 180 },
        { type: 'plant', a: 639.6, c: 380.0, rot: 0 },
      ] },
    { id: 'dorm-kitchen', name_ja: '共用キッチン・食堂', purpose: '簡単な食事と、朝のコーヒー。', a0: 640.4, a1: 652.4, c0: 379.2, c1: 389.6, floor: 'vinyl', ceiling: 3.0, closed: false,
      lights: lightsGrid(641, 651.9, 380, 389.1, 3.2),
      furniture: [
        { type: 'kitchen_counter', a: 643.6, c: 388.5, rot: 270 }, { type: 'kitchen_counter', a: 646.9, c: 388.5, rot: 270 }, { type: 'kitchen_counter', a: 650.2, c: 388.5, rot: 270 },
        { type: 'fridge', a: 641.3, c: 388.6, rot: 270 },
        { type: 'table_long', a: 646.0, c: 383.4, rot: 90 },
        { type: 'office_chair', a: 644.4, c: 382.0, rot: 0 }, { type: 'office_chair', a: 647.6, c: 382.0, rot: 0 },
        { type: 'office_chair', a: 644.4, c: 384.8, rot: 180 }, { type: 'office_chair', a: 647.6, c: 384.8, rot: 180 },
        { type: 'trash_bin', a: 651.6, c: 380.0, rot: 0 },
        { type: 'wall_clock', a: 652.34, c: 384.0, rot: 270 },
      ] },
    { id: 'dorm-laundry', name_ja: 'ランドリー', purpose: '洗濯機 3 台と作業台。制服は週に 2 回。', a0: 652.4, a1: 659.6, c0: 379.2, c1: 389.6, floor: 'tile', ceiling: 3.0, closed: false,
      lights: lightsGrid(653, 659.1, 380, 389.1, 3.2),
      furniture: [
        { type: 'washing_machine', a: 654.0, c: 388.6, rot: 270 }, { type: 'washing_machine', a: 655.8, c: 388.6, rot: 270 }, { type: 'washing_machine', a: 657.6, c: 388.6, rot: 270 },
        { type: 'table_long', a: 656.0, c: 382.0, rot: 90 },
        { type: 'bench', a: 653.4, c: 380.2, rot: 90 },
      ] },
    { id: 'dorm-bath', name_ja: '浴室・脱衣所', purpose: 'シャワー個室と洗面。訓練の汗を流す。', a0: 659.6, a1: 665.6, c0: 379.2, c1: 389.6, floor: 'tile', ceiling: 3.0, closed: false,
      lights: lightsGrid(660, 665.1, 380, 389.1, 3.2),
      furniture: [
        { type: 'shower_booth', a: 661.4, c: 388.3, rot: 270 }, { type: 'shower_booth', a: 664.0, c: 388.3, rot: 270 },
        { type: 'locker_bank', a: 664.9, c: 381.2, rot: 270 },
        { type: 'bench', a: 661.0, c: 380.6, rot: 0 },
        { type: 'stool', a: 660.4, c: 386.0, rot: 0 },
      ] },
  ];

  // ---------------------------------------------------------------- doors (wall 'c': a line of constant c, from/to along a)
  const doors = [
    { id: 'x-dorm-main', rooms: ['dorm-entrance', 'outside'], kind: 'sliding_auto', wall: 'c', at: 366.4, from: 641.4, to: 645.0, label_ja: '寮 玄関' },
    { id: 'd-dorm-entrance', rooms: ['dorm-entrance', 'dorm-corridor'], kind: 'swing', wall: 'c', at: 376.8, from: 642.2, to: 643.4, label_ja: '玄関ホール' },
    { id: 'd-dorm-room', rooms: ['dorm-room', 'dorm-corridor'], kind: 'swing', wall: 'c', at: 376.8, from: 622.4, to: 623.6, label_ja: '自室' },
    { id: 'd-dorm-peer-1', rooms: ['dorm-peer-1', 'dorm-corridor'], kind: 'locked', wall: 'c', at: 376.8, from: 632.4, to: 633.6, label_ja: '桐生の部屋' },
    { id: 'd-dorm-peer-2', rooms: ['dorm-peer-2', 'dorm-corridor'], kind: 'locked', wall: 'c', at: 376.8, from: 652.4, to: 653.6, label_ja: '朝日の部屋' },
    { id: 'd-dorm-wc', rooms: ['dorm-wc', 'dorm-corridor'], kind: 'swing', wall: 'c', at: 376.8, from: 661.0, to: 662.2, label_ja: 'トイレ' },
    { id: 'd-dorm-peer-3', rooms: ['dorm-peer-3', 'dorm-corridor'], kind: 'locked', wall: 'c', at: 379.2, from: 622.4, to: 623.6, label_ja: '森の部屋' },
    { id: 'd-dorm-common', rooms: ['dorm-common', 'dorm-corridor'], kind: 'double_swing', wall: 'c', at: 379.2, from: 633.0, to: 634.8, label_ja: '談話室' },
    { id: 'd-dorm-kitchen', rooms: ['dorm-kitchen', 'dorm-corridor'], kind: 'double_swing', wall: 'c', at: 379.2, from: 645.4, to: 647.2, label_ja: 'キッチン・食堂' },
    { id: 'd-dorm-laundry', rooms: ['dorm-laundry', 'dorm-corridor'], kind: 'swing', wall: 'c', at: 379.2, from: 655.2, to: 656.4, label_ja: 'ランドリー' },
    { id: 'd-dorm-bath', rooms: ['dorm-bath', 'dorm-corridor'], kind: 'swing', wall: 'c', at: 379.2, from: 661.6, to: 662.8, label_ja: '浴室' },
  ];

  // ---------------------------------------------------------------- what can be examined (E)
  const interactables = [
    { id: 'dorm-bed', room: 'dorm-room', a: 620.3, c: 370.2, y: 1.0, prompt_ja: 'ベッド（今日を終える）', title_ja: '自室のベッド',
      text_ja: '寮の自室。明日も早い。\nベッドで今日を終えます（すぐに寝る／自習してから寝る／やっぱり残る）。' },
    { id: 'dorm-desk', room: 'dorm-room', a: 623.0, c: 374.6, y: 1.0, prompt_ja: '机で自習する', title_ja: '自室の机',
      text_ja: '教科書とノート、明日の予定。\n夜の自習は、間違えた問題と期限が来た問題から 3 問（約 3 分）。' },
    { id: 'dorm-wardrobe', room: 'dorm-room', a: 619.8, c: 374.8, y: 1.4, prompt_ja: 'ロッカーを見る', title_ja: 'ロッカー',
      text_ja: '制服と、私服と、洗濯に出す袋。\n明日の制服は、もう用意してある。' },
    { id: 'dorm-map', room: 'dorm-room', a: 620.5, c: 376.4, y: 1.6, prompt_ja: '訓練空域図を見る', title_ja: 'LAB 訓練空域図（架空・NOT FOR NAVIGATION）',
      text_ja: '壁に貼った訓練空域図。LAB 飛行場と訓練点 LAB-A〜F、湖。\n寝る前に、明日の空を一度だけ頭の中で飛ぶ。' },
    { id: 'dorm-bulletin', room: 'dorm-entrance', a: 638.7, c: 371.5, y: 1.5, prompt_ja: '掲示板を見る', title_ja: '寮の掲示板',
      text_ja: '朝食：6:30–7:30（食堂）／ 消灯の目安：23:00\n洗濯機は回したら取りに来ること。名前のない洗濯物は談話室の箱へ\n談話室のテレビは 22:00 まで' },
    { id: 'dorm-knock-1', room: 'dorm-corridor', a: 633.0, c: 377.6, y: 1.4, prompt_ja: 'ノックする（桐生の部屋）', title_ja: '桐生の部屋',
      text_ja: 'ノックすると、中から「おう。……もう寝るわ、明日早いし」という声。\n（同期の部屋は、夜の訪問イベントで開きます）' },
    { id: 'dorm-knock-2', room: 'dorm-corridor', a: 653.0, c: 377.6, y: 1.4, prompt_ja: 'ノックする（朝日の部屋）', title_ja: '朝日の部屋',
      text_ja: 'ノックすると、「はーい、ちょっと待って」という声と、椅子の音。\n（同期の部屋は、夜の訪問イベントで開きます）' },
    { id: 'dorm-knock-3', room: 'dorm-corridor', a: 623.0, c: 378.4, y: 1.4, prompt_ja: 'ノックする（森の部屋）', title_ja: '森の部屋',
      text_ja: 'ノックすると、中で本の閉じる音。「……ごめん、今、詰まってて」\n（同期の部屋は、夜の訪問イベントで開きます）' },
    { id: 'dorm-coffee', room: 'dorm-common', a: 629.3, c: 381.0, y: 1.2, prompt_ja: 'コーヒーを淹れる', title_ja: 'コーヒーマシン',
      text_ja: '談話室のコーヒーマシン。豆を挽く音と湯気。\n（気分転換：疲労が少し下がります。1 日 1 回まで）' },
    { id: 'dorm-vending', room: 'dorm-common', a: 629.2, c: 388.6, y: 1.2, prompt_ja: '自販機を使う', title_ja: '自動販売機',
      text_ja: 'スポーツドリンクと水、ようかん。ボタンが光って、ガシャンと落ちる音。\n訓練の合間の補給は IMSAFE の E（食事・水分）。' },
    { id: 'dorm-shelf', room: 'dorm-common', a: 639.9, c: 386.0, y: 1.5, prompt_ja: '本棚を使う（教科書）', title_ja: '談話室の本棚',
      text_ja: '教科書と、誰かが置いていった小説。E で今日の一節が開きます。' },
    { id: 'dorm-tv', room: 'dorm-common', a: 634.0, c: 389.2, y: 1.4, prompt_ja: 'テレビを見る', title_ja: '談話室のテレビ',
      text_ja: '天気予報と、航空のニュース。明日の LAB は晴れの見込み（架空）。\n誰かが見たまま、音は小さい。' },
    { id: 'dorm-fridge', room: 'dorm-kitchen', a: 641.3, c: 387.8, y: 1.4, prompt_ja: '冷蔵庫を見る', title_ja: '共用の冷蔵庫',
      text_ja: '中身には全部、名前と日付。\nプリンに「たべたら そら とぶ」と書いてあるのは、朝日さんの字。' },
    { id: 'dorm-laundry-note', room: 'dorm-laundry', a: 655.8, c: 387.8, y: 1.2, prompt_ja: '洗濯機を見る', title_ja: 'ランドリー',
      text_ja: '洗濯機 3 台。1 台が回っている（残り 12 分、誰のかは分からない）。\n制服の洗濯は週に 2 回まで、と掲示。' },
    { id: 'dorm-bath-note', room: 'dorm-bath', a: 662.5, c: 387.6, y: 1.3, prompt_ja: 'シャワーを見る', title_ja: '浴室',
      text_ja: 'シャワーは個室が 2 つ。長く入る人がいると、廊下まで湯気の匂いがする。' },
  ];

  return {
    rooms, doors, interactables,
    // the morning: in the cadet's own room, facing the corridor door
    start: { room: 'dorm-room', a: 624.0, c: 372.0, face: { a: 623.0, c: 378.0 } },
    // outside the front doors (the road's end), and just inside them (the shortcut's landing)
    front: { a: 643.2, c: 363.2, face: { a: 643.2, c: 370.0 } },
    hall: { a: 643.2, c: 371.0, face: { a: 643.2, c: 378.0 } },
  };
}
