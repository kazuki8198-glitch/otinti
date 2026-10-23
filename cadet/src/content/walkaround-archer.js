// CADET — content/walkaround-archer.js : the walk-around (preflight inspection) of today's Archer, 15 places in the
// published order of the PA-28 checklists' walk-around: the cabin (from the door), the right wing, the nose, the left
// wing, the tail. Written for the game from the published checklists' items (what to look at, and why); the
// aircraft's own POH and the school's checklist govern.
// Each place: where it is on the airframe (body frame: x right, y up, z aft; metres, the physics' own: acmesh's), what
// to check, what is seen when all is well, and what may be wrong with it (an anomaly: what is seen instead, whether
// the cadet can put it right or the maintenance must). Some places need something done every time (the control lock,
// the tie-down ropes, the chocks, the pitot cover): `task`.
// Each day 0–2 anomalies are chosen (see aircraft/walkaround.js).
export const WALK_ORDER = ['cabin', 'right wing', 'nose', 'left wing', 'tail'];

export const POINTS = [
  { id: 'docs', group: 'cabin', at: [0.62, 0.22, -0.15], name: '操縦席：書類と操縦輪のロック',
    check: '機内の書類（耐空証明・登録・重量と重心・無線局の許可）がそろっていること。操縦輪のロック（ピン）を外す。',
    ok: '書類はポケットにそろっています。操縦輪には赤いリボンの付いたロックのピンが差してあります。',
    task: { id: 'lock', verb: '操縦輪のロックを外す', done: 'ロックのピンを外して、ポケットにしまいました。' } },
  { id: 'cabin', group: 'cabin', at: [0.55, 0.40, -0.85], name: '操縦席：マスター・燃料計・フラップ',
    check: 'マスター スイッチを入れて燃料計を読み、フラップを下げる（外から見るため）。読んだらマスターを切る。マグネトーが OFF であること。',
    ok: 'マグネトーは OFF。マスターを入れると、燃料計は左右とも約 19 ガロン。フラップを下げ、マスターを切りました。' },
  { id: 'r_flap', group: 'right wing', at: [3.3, -0.05, 0.62], name: '右翼：フラップとエルロン',
    check: 'ヒンジ・ロッドの割りピンとナット、表面のへこみ。エルロンが自由に動き、反対側と逆に動くこと。',
    ok: 'ヒンジもロッドもしっかり留まっています。エルロンは引っかかりなく動きます。',
    bad: { id: 'pin', see: 'エルロンのロッドの端に、あるはずの割りピンが見当たりません。ナットが少しゆるんでいます。', fix: 'mx', mx: '整備士が割りピンを新しくし、ナットを締めました。' } },
  { id: 'r_tip', group: 'right wing', at: [5.25, 0.2, -0.35], name: '右翼：翼端・航法灯・係留ロープ',
    check: '翼端と灯火（緑の航法灯・ストロボ）のレンズ。係留のロープを外す。',
    ok: '翼端に傷はなく、緑のレンズも割れていません。係留のロープが付いています。',
    task: { id: 'tieR', verb: '右翼の係留ロープを外す', done: 'ロープをほどいて、地面のリングに掛けておきました。' } },
  { id: 'r_cap', group: 'right wing', at: [3.2, 0.12, -0.55], name: '右翼：燃料タンク（給油口）',
    check: '燃料の量を目で見る。給油口のふたがしっかり閉まっていること（ふたが開くと燃料が吸い出される）。',
    ok: '燃料は給油口の中の目盛り（タブ）より上まであります（約 19 ガロン）。ふたはしっかり閉まっています。',
    bad: { id: 'cap', see: '給油口のふたのレバーが起きたままで、ふたが浮いています。給油のあと閉め忘れたようです。', fix: 'self', verb: 'ふたを閉めて、レバーを倒す', done: 'ふたを押し込んで、レバーを倒しました。しっかり閉まっています。' } },
  { id: 'r_sump', group: 'right wing', at: [2.3, -0.42, -0.25], name: '右翼：燃料のサンプ（水抜き）',
    check: '翼の下の水抜きから燃料を少しカップに取り、水やごみが混じっていないか見る（水は燃料より重く、底に玉になってたまる）。',
    ok: 'カップの燃料は青く透きとおっています（100LL）。水の玉もごみもありません。燃料は元のタンクではなく、回収の容器へ。',
    bad: { id: 'water', see: 'カップの底に、透明な玉がいくつか沈んでいます。燃料と混じらない、水の玉です。', fix: 'self', verb: 'もう一度サンプを取る（水が出なくなるまで）', done: '3 回取り直すと、水の玉は出なくなりました。透きとおった青い燃料だけです。' } },
  { id: 'r_main', group: 'right wing', at: [1.62, -1.1, 0.25], name: '右の主脚：タイヤとブレーキ',
    check: 'タイヤの空気圧（つぶれ方）と溝、ブレーキの油もれ、脚の伸び。',
    ok: 'タイヤは張りがあり、溝も十分です。ブレーキの周りに油のしみはありません。',
    bad: { id: 'tire', see: 'タイヤが目に見えてつぶれています。左のタイヤより明らかに低く、空気が足りません。', fix: 'mx', mx: '整備士がタイヤに空気を入れ、空気圧を確かめました。' } },
  { id: 'oil', group: 'nose', at: [0.32, 0.36, -2.55], name: '機首：オイル（量とふた）',
    check: 'カウルの点検口を開け、オイルの量を計る（今日の飛行には 6 クォート以上）。ふたを閉め、点検口を閉める。',
    ok: '計ると 7 クォート。オイルはきれいな琥珀色です。ふたと点検口を閉めました。',
    bad: { id: 'oil', see: '計ると 4 クォート。今日の飛行に必要な量（6 クォート）より少ないです。', fix: 'mx', mx: '整備士がオイルを 3 クォート足しました（7 クォート）。' } },
  { id: 'prop', group: 'nose', at: [0.0, 0.0, -3.55], name: '機首：プロペラ・スピナー・空気取り入れ口',
    check: 'プロペラの前縁の傷（小さな欠けでもひびのもとになる）、スピナーのねじ、空気取り入れ口に鳥の巣やごみがないこと。',
    ok: 'プロペラの前縁はなめらかで、スピナーもしっかり留まっています。空気取り入れ口もきれいです。',
    bad: { id: 'nick', see: '片方の羽根の先の近くの前縁に、小石で付いたような小さな欠けがあります。', fix: 'mx', mx: '整備士が欠けを削ってなめらかにし、許される範囲であることを確かめました。' } },
  { id: 'nose', group: 'nose', at: [0.0, -1.05, -2.35], name: '機首：前脚・タイヤ・輪止め',
    check: '前脚の伸び（オレオの磨かれた部分が見えていること）、タイヤ、ショックの油もれ。輪止めを外す。',
    ok: '前脚のオレオは適切に伸びていて、タイヤも問題ありません。前輪に輪止めが置いてあります。',
    task: { id: 'chocks', verb: '輪止めを外す', done: '輪止めを外して、機体から離れたところに置きました。' } },
  { id: 'l_main', group: 'left wing', at: [-1.62, -1.1, 0.25], name: '左の主脚：タイヤとブレーキ',
    check: 'タイヤの空気圧と溝、ブレーキの油もれ。',
    ok: 'タイヤは張りがあり、溝も十分です。ブレーキの周りもきれいです。' },
  { id: 'l_fuel', group: 'left wing', at: [-2.8, -0.15, -0.45], name: '左翼：燃料タンクとサンプ',
    check: '燃料の量と給油口のふた。翼の下の水抜きから燃料を取り、水やごみがないか見る。',
    ok: '燃料はタブより上まであり（約 19 ガロン）、ふたも閉まっています。カップの燃料は青く透きとおり、水の玉はありません。',
    bad: { id: 'water', see: 'カップの底に、透明な玉が沈んでいます。水です。', fix: 'self', verb: 'もう一度サンプを取る（水が出なくなるまで）', done: '2 回取り直すと、水は出なくなりました。' } },
  { id: 'pitot', group: 'left wing', at: [-3.6, -0.3, -0.85], name: '左翼：ピトー管・失速警報',
    check: 'ピトー管のカバーを外し、穴がふさがっていないこと（ふさがっていると速度計が動かない）。前縁の失速警報のベーンが軽く動くこと。',
    ok: 'ピトー管には赤い「REMOVE BEFORE FLIGHT」のカバーが付いています。失速警報のベーンは軽く上下に動きます。',
    task: { id: 'pitot', verb: 'ピトー管のカバーを外す', done: 'カバーを外しました。穴はきれいです。カバーは機内にしまいます。' },
    bad: { id: 'vane', see: '失速警報のベーンを指で上げても、引っかかって戻ってきません。', fix: 'mx', mx: '整備士がベーンの引っかかりを直し、上げると警報が鳴ることを確かめました。' } },
  { id: 'l_tip', group: 'left wing', at: [-5.25, 0.2, -0.35], name: '左翼：翼端・エルロン・フラップ・係留ロープ',
    check: '翼端と赤い航法灯のレンズ、エルロンとフラップのヒンジ。係留のロープを外す。',
    ok: '翼端・レンズ・ヒンジとも問題ありません。係留のロープが付いています。',
    task: { id: 'tieL', verb: '左翼の係留ロープを外す', done: 'ロープをほどいて、地面のリングに掛けておきました。' } },
  { id: 'tail', group: 'tail', at: [0.0, 0.35, 3.65], name: '尾部：スタビレーター・ラダー・アンテナ・係留ロープ',
    check: 'スタビレーターとトリム タブ、ラダーのヒンジ、アンテナ、尾部の灯火。尾部の係留ロープを外す。',
    ok: 'スタビレーターもラダーも自由に動き、ヒンジもしっかりしています。尾部の下に係留のロープが付いています。',
    task: { id: 'tieT', verb: '尾部の係留ロープを外す', done: 'ロープをほどきました。' } },
];

// what the instructor says when something left undone is found before the start (the tasks)
export const TASK_MISSED = {
  lock: '操縦輪のロックが差したままです。これでは操縦輪が動きません。外しますね。',
  pitot: 'ピトー管のカバーが付いたままでした。付けたまま離陸すると、速度計が 0 のまま動きません。外してきました。',
  tieR: '右の翼の係留ロープが付いたままでした。ほどいてきました。', tieL: '左の翼の係留ロープが付いたままでした。ほどいてきました。',
  tieT: '尾部の係留ロープが付いたままでした。ほどいてきました。', chocks: '前輪の輪止めが置いたままでした。外してきました。',
};
// the anomalies that can be planted (by their id): which places they can be at
export const ANOMALIES = ['pin', 'cap', 'water', 'tire', 'oil', 'nick', 'vane'];
