// CADET — content/usable.js : the furniture that does something (Phase 3), as pure data and small pure rules, so
// the tests can hold them: which examine-targets are usable (and how), what a cup of coffee does, which textbook
// section a shelf opens, and what the notice boards say today.
// The effects stay inside the career's own ranges (career.js): coffee is career.tire(COFFEE_TIRE) — a small
// negative, once a day — and nothing here keeps state of its own.

// a cup from the machine: a small lift, never a substitute for sleep (sleep restores 50; IMSAFE's tired line is 65)
export const COFFEE_TIRE = -4;
// (Phase 4) the tower visit: listening to real exchanges in the cab grows COMM a little, once a day, through
// career.grow with the day's own key — deliberately below the chair-flight practice's 1.0 (main.js), so the
// visit never competes with the practice routes; it is a supplement, not a shortcut.
export const TOWER_COMM_BASE = 0.8;
export const TOWER_VISIT = {
  title: '管制の見学',
  text: '管制官の後ろで、実際の交信を聞けます。',
  choices: ['交信を見学する', '管制の仕事について聞く', 'やめる'],
  listen: 'スピーカーから、途切れずに交信が流れている。\n\nタワー「SY738、風 010 の 5、滑走路 36、離陸を許可」\n訓練機「滑走路 36、離陸許可、SY738」\nタワー「SY731、ダウンウィンドを報告せよ」\n訓練機「まもなくダウンウィンド、SY731」\n\n自分の復唱が、向こう側ではこう聞こえている。短く、はっきり、正確に。\n（交信の見学：交信が少し伸びました。1 日 1 回まで）',
  listenAgain: 'スピーカーから、途切れずに交信が流れている。\n\nタワー「SY735、ベースを延ばせ、先行機との間隔を取れ」\n訓練機「ベースを延ばします、SY735」\n\n（今日の見学分はもう十分。続きは明日の楽しみに）',
  about: '管制官の仕事：場周と地上のすべての機体を、頭の中の地図で同時に追うこと。\n天気の変化、滑走路の状態、訓練の予定——指示のひとつひとつの後ろに、その全部がある。\n「管制官がいちばん助かるのは、復唱が正確な機体」——高嶺さんの言葉。',
};
// the usable kinds, by examine-target id (academy-spec.js / dorm-spec.js). 'pc' shows the logbook and the weather
// (the tablet's own data, in main.js); 'shelf' opens the textbook; 'sim' offers the chair-flight practice.
export const USABLE = {
  coffee: 'coffee', 'dorm-coffee': 'coffee',
  'shelf-brief-1': 'shelf', 'shelf-lounge': 'shelf', 'shelf-planning': 'shelf', 'shelf-library': 'shelf', 'dorm-shelf': 'shelf',
  'sim-station': 'sim',
  'pc-reception': 'pc', 'pc-dispatch': 'pc',
  'locker-pilot': 'locker',
  vending: 'vending', 'dorm-vending': 'vending',
  'fridge-note': 'fridge', 'dorm-fridge': 'fridge',
};
export const usableKind = (id) => USABLE[id] || null;

// the section a shelf opens: it turns with the day, through the book's sections in order (book: gameBook(FL) —
// its chapters' sections, flattened). Pure: the caller passes the flattened section ids.
export function shelfSection(day, sectionIds) {
  if (!sectionIds || !sectionIds.length) return null;
  const k = ((Math.floor(day) % sectionIds.length) + sectionIds.length) % sectionIds.length;
  return sectionIds[k];
}

// the notice boards' lines turn with the day: three of the pool, starting at the day's offset (so consecutive
// days differ, and the same day always says the same thing)
export const NOTICES = [
  '学科試験の範囲は計画室の掲示を確認（第 1 段階）',
  '午後は雷雨が多い季節。飛行は午前中心に組んでいます',
  '英語交信の自主練：毎晩 19:00 訓練装置室（2 階の視聴覚室でも可）',
  'ヘッドセットは使ったら元の場所へ（パイロットルームのラック）',
  '冷蔵庫の中身には名前を！（週末に整理します）',
  '2 階が開きました：図書・自習室、大教室、教材・視聴覚室。屋上は階段室から',
  '図書・自習室の本は貸出ノートに記名してから持ち出すこと',
  '屋上に出たら扉を閉めること（風でバタンと閉まります）',
  'コーヒーは 1 日 2 杯まで（IMSAFE の E：飲みすぎは手の震えのもと）',
  '寮の談話室：22 時以降は静かに',
];
export function dailyNotices(day, n = 3) {
  const out = [];
  const start = ((Math.floor(day) * n) % NOTICES.length + NOTICES.length) % NOTICES.length;
  for (let i = 0; i < n; i++) out.push(NOTICES[(start + i) % NOTICES.length]);
  return out;
}

// the coffee card's words, before and after the day's cup (main.js applies COFFEE_TIRE through career.tire)
export const COFFEE_CARD = {
  title: 'コーヒーマシン',
  fresh: '豆を挽く音と湯気。訓練生の燃料が入りました。\n（気分転換：疲労が少し下がります。今日はもう効きません）',
  again: '訓練生の燃料。\nただし飛ぶ前の飲みすぎは禁物：カフェインの取りすぎは手の震えと脱水のもと（IMSAFE の E）。',
};
export const VENDING_CARD = {
  title: '自動販売機',
  text: 'スポーツドリンクと水、ようかん。ボタンが光って、ガシャンと落ちる音。\n訓練の合間の補給は IMSAFE の E（食事・水分）。',
};
export const FRIDGE_CARD = {
  title: '冷蔵庫',
  text: '名前の書かれたタッパーと、誰かのプリン（名前なし——週末に整理される運命）。\n自分の分には名前を書くこと。',
};
export const LOCKER_CARD = {
  title: 'ロッカー／ヘッドセットとニーボード',
  text: '飛ぶ日の流れ：ここでヘッドセットとニーボードを受け取り、パイロットルームの地図で計画してから、運航管理で機体の鍵と書類を受け取る。\nヘッドセットはマイクの位置（口元から 1 cm）と音量を確認。使ったら元の場所へ。',
};
