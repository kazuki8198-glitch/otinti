// CADET — content/answer-map.js : where the textbook's part 1 says the answer to each question chapter 1 can ask.
// A question is asked (scored) only once the line that says its answer has been heard (content/school.js): in the class
// going on, before the question; in a class finished earlier, whatever its pace; in a training device lesson passed. So
// every question chapter 1 may ask is tied here to its section and to the words of the line that answers it.
// An answer: [[section, words], …] — the words a line of that section says as the class says it (lectureLines: です /
// ます, today's call sign; compared without spaces), every pair needed (an answer may take two lines, or a whole table's
// rows); the first pair's section is the question's own (its chapter's check asks it). null: part 1 does not say it
// (the question is not asked in chapter 1). FLIGHT LAB's banks are FLIGHT LAB's (not edited): a question is found by its
// bank and its index, and `q` holds the start of its text so a change in the bank shows (test/answers.test.mjs).
// The training device's questions too: k3's drill kinds and k6's listening kinds (FLIGHT LAB's radio.js), k5's scenes
// (radio.js SCENES by id), k2's readings (taught in k1, the device's own first lesson: section 'k1').
const one = (sec, ...words) => words.map(w => [sec, w]);
const ALPHABET = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu']
  .map(w => ['comm.basic', `${w[0]}：言い方は ${w}`]);
const N = {
  alt: [['comm.numbers', '高度（9,900 ft まで）：書き方は 500 / 4,500、言い方は five hundred / four thousand five hundred'], ['comm.numbers', '言い方は one zero thousand / one three thousand five hundred']],
  fl: [['comm.numbers', 'フライトレベル（18,000 ft 以上）：書き方は FL190、言い方は flight level one niner zero']],
  hdg: [['comm.numbers', '針路・方位・コース：書き方は 090 / 005、言い方は heading zero niner zero / zero zero five'], ['comm.numbers', '針路は必ず 3 桁です（heading zero niner zero）']],
  spd: [['comm.numbers', '速度：書き方は 120 kt、言い方は one two zero knots、決まりは 1 桁ずつ＋knots']],
  frq: [['comm.numbers', '言い方は one two one point seven / one one niner point seven five'], ['comm.numbers', '決まりは小数点は “point”']],
  alts: [['comm.numbers', '高度計規正値：書き方は 29.92 inHg、言い方は altimeter two niner niner two、決まりは 1 桁ずつ']],
  sqk: [['comm.numbers', 'トランスポンダーのコード：書き方は 4271、言い方は squawk four two seven one、決まりは 1 桁ずつ']],
  rwy: [['comm.numbers', '滑走路：書き方は 36 / 9R / 27C、言い方は runway three six / runway niner right / runway two seven center'], ['comm.numbers', '決まりは 1 桁ずつ＋left / right / center']],
  wnd: [['comm.numbers', '風：書き方は 220° 15 kt / 2 kt、言い方は wind two two zero at one five / wind calm'], ['comm.numbers', '管制の型は “wind (風向) at (風速)”、3 kt 未満は “calm”']],
  utc: [['comm.numbers', '時刻：書き方は 14:30 UTC、言い方は one four three zero Zulu'], ['comm.numbers', 'フロリダの標準時（EST）は UTC−5、夏時間（EDT）は UTC−4 です']],
  digits: [['comm.basic', '数字は原則 1 桁ずつ（10 は one zero）']],
};
export const BANK_ANSWERS = {
  q_aero: [
    { q: '水平直線飛行で一定', a: one('aero.forces', '水平直線飛行では、揚力＝重力、推力＝抗力でつり合っています') },
    { q: '速度が 2 倍になると', a: one('aero.lift', '速度が 2 倍なら揚力は 4 倍です') },
    { q: '失速が起きる条件', a: one('aero.aoa', 'どんな速度・姿勢でも臨界迎え角を超えれば失速します') },
    { q: 'バンク 45° で', a: one('aero.turn', '45°：荷重倍数は 1.41 G、失速速度の増加は×1.19（+19%）') },
    { q: '誘導抗力について', a: one('aero.drag', '誘導抗力（induced drag）：揚力を作ることの副作用（翼端渦）', '遅いほど（迎え角が大きいほど）大きいです') },
    { q: '最良滑空速度（Archer', a: one('aero.drag', '全抗力はある速度で最小になり、揚力と抗力の比（L/D）が最大になります', '最も遠くまで滑空できる速度が最良滑空速度') },
    { q: '右へ旋回を始める', a: one('aero.left', '逆ヨー：右エルロンを使うと、上がる左翼の抗力が増えて機首が一瞬左を向きます', 'バンクを入れるときはエルロンと同じ側のラダーを一緒に踏みます') },
    { q: '単発プロペラ機の離陸で', a: one('aero.left', '原因は 4 つです', '後流（スパイラルスリップストリーム）', 'P ファクター：機首上げでは', 'トルク：プロペラを回す反作用', 'ジャイロ効果（歳差）') },
    { q: '重心が前方限界寄り', a: one('perf.wb', '前すぎ：機首が重く、フレアで引ききれません（尾翼の下向きの力が大きい）。失速速度が上がります') },
    { q: '着陸のフレアで速度が', a: one('aero.ge', '着陸：フレアで思ったより沈まず、長く浮いて滑走路を使い過ぎます（フロート）', '速すぎる進入の典型的な結果です') },
  ],
  q_sys: [
    { q: 'マグネトーについて', a: one('sys.engine', '点火はエンジンの回転で発電するマグネトーで行います', '電気系統が止まってもエンジンは止まりません') },
    { q: 'キャブレターの着氷が起きやすい', a: one('sys.engine', 'キャブレター内では燃料の気化と空気の膨張で温度が大きく下がり', '湿度が高いと起きやすい') },
    { q: '固定ピッチプロペラ', a: one('sys.engine', '回転が理由なく下がったら、まずキャブレターアイスを疑います') },
    { q: '高度が上がっても', a: one('sys.engine', '混合気が濃すぎになります', 'ミクスチャーで燃料を絞る（リーン）と出力・燃費が戻ります') },
    { q: 'Archer の燃料', a: one('sys.fuel', '100LL の航空ガソリンは青いです') },
    { q: 'G1000 で AHRS', a: one('sys.g1000', 'AHRS（姿勢方位基準装置）', '出すものは姿勢（ピッチ・バンク）、方位、旋回率') },
    { q: 'ピトー管がふさがり', a: one('sys.g1000', 'ピトー管と排水穴の両方が詰まる：速度計は高度計のように動く（上昇で速度が増えて見える）') },
    { q: 'オルタネーターが故障', a: one('sys.elec', 'バッテリー：始動と、発電機が止まったときの非常用電源（時間は限られる）', '負荷を減らし「なるべく早く着陸」') },
    { q: 'Archer のフラップを', a: one('aero.ge', 'フラップは白い帯（Vfe 102 KIAS）以下でだけ使います') },
    { q: '磁気コンパスについて', a: one('sys.compass', '磁気コンパスは「直線・水平・定速」のときだけ正しく読めます') },
  ],
  q_perf: [
    { q: '密度高度が高くなる', a: one('perf.da', '高い・暑い・湿った（High, Hot, Humid）', '湿度も密度を下げます') },
    { q: '気圧高度を読むには', a: one('perf.da', '気圧高度 ≒ 標高 ＋（29.92 − 高度計規正値）× 1,000 ft') },
    { q: '離陸滑走距離が長く', a: one('perf.tol', '密度高度が高い：離陸距離は延びる', '追い風：離陸距離は大きく延びる', '芝・濡れた滑走路：離陸距離は延びる', '上り坂：離陸距離は延びる') },
    { q: 'モーメントの計算', a: one('perf.wb', '各項目の重量 × アーム（基準線からの距離）＝ モーメントです') },
    { q: '航空ガソリン 1 ガロン', a: null },                       // (6 lb/gal: not in part 1)
    { q: '昼間の VFR で必要な燃料', a: one('perf.climb', '予備（昼 30 分・夜 45 分）') },
    { q: 'Archer の実証横風速度', a: null },                       // (demonstrated crosswind: not in part 1)
    { q: 'Vx と Vy の違い', a: one('perf.climb', 'Vy（最良上昇率：時間あたり最も高く）とVx（最良上昇角：距離あたり最も高く）を使い分けます') },
    { q: '重量が軽いとき、設計運動速度', a: one('aero.vn', 'Va：名前は設計運動速度（乱気流ではこれ以下）、教科書の Archer の値は 113 KIAS（2,550 lb）・89 KIAS（1,917 lb）') },
    { q: '重心が許容範囲の後方', a: one('perf.wb', '後ろすぎ：安定が失われます。失速・スピンからの回復が難しくなります') },
  ],
  q_wx: [
    { q: '標準大気の海面の', a: one('wx.atm', '国際標準大気（ISA）は海面で 15℃・29.92 inHg（1013.25 hPa）') },
    { q: '高気圧の地域から', a: one('wx.atm', '高度計は「高い所から低い所へ」飛ぶと実際より高く表示されます') },
    { q: '雷雨ができる 3 つ', a: one('wx.ts', '積乱雲（雷雨）ができるには湿った空気・不安定な大気・持ち上げる力') },
    { q: '雷雨の 3 段階で', a: null },                              // (the thunderstorm's three stages: not in part 1)
    { q: 'METAR「BKN008」', a: one('wx.metar', 'BKN：5/8〜7/8（雲高）', '高さは地上から・100 ft 単位') },
    { q: 'METAR の風向と', a: one('wx.metar', '風向は METAR・TAF では真方位、ATIS・管制の風は磁方位です') },
    { q: 'よく晴れて風の弱い', a: one('wx.fog', '放射霧：でき方は晴れて風の弱い夜に地面が冷え、湿った空気が冷やされる') },
    { q: '気温と露点の差が', a: one('wx.atm', '気温と露点の差が小さいほど雲・霧ができやすいです') },
    { q: 'マイクロバースト（AIM）', a: one('wx.ts', '進入中に入ると、まず向かい風（速度が増える） → 下降気流 → 追い風（速度が急に減る）') },
    { q: 'TAF の「TEMPO」', a: one('wx.metar', '18〜22Z の間に一時（TEMPO）雷雨') },
  ],
  q_law: [
    { q: 'Class C・D・10,000 ft', a: one('law.vfr', '覚え方として「3 SM・500 ft 下・1,000 ft 上・2,000 ft 横（3-152）」') },
    { q: 'Class D 空域に VFR', a: one('law.airspace', 'Class C・D は管制との双方向の無線交信の確立が必要です') },
    { q: 'Class C 空域に入るのに必要な装備', a: one('law.airspace', '入る条件は入る前に双方向の無線交信を確立（管制官が自機のコールサインで応答した時点）', 'トランスポンダー・ADS-B Out') },
    { q: 'Class C・D の空港から 4 NM', a: one('law.rules', 'Class C・D の主空港から 4 NM 以内・地上 2,500 ft 以下は 200 KIAS 以下です') },
    { q: '人口密集地の上の', a: one('law.rules', '人口密集地・集会の上：半径 2,000 ft 以内の最も高い障害物から 1,000 ft 上') },
    { q: '2 機が同じ高さで', a: one('law.rules', '正面から近づいたら互いに右へ') },
    { q: '追い越すときの規則', a: one('law.rules', '追い越すときは右へ避けて十分離れます') },
    { q: '飲酒の規則', a: one('hf.self', '飲酒から 8 時間以内・血中濃度 0.04% 以上・影響下では飛べません') },
    { q: '学生操縦士（61.89）', a: one('law.rules', '61.89 学生操縦士：乗客を乗せない') },
    { q: 'TFR（一時的な', a: one('law.special', 'NOTAM（航空情報）には、滑走路や誘導路の閉鎖、航法施設の停止、TFR などが載ります') },
  ],
  q_hf: [
    { q: 'IMSAFE の S は', a: one('hf.self', 'S：Stress（ストレス）') },
    { q: 'PAVE の E が', a: one('hf.adm', 'E：External pressures') },
    { q: '「自分には起きない」', a: one('hf.attitude', '不死身（Invulnerability）：心の声は「自分には起きない」、解毒剤は自分にも起きます') },
    { q: '空間識失調「リーンズ', a: one('hf.body', 'リーンズ（leans）：ゆっくり傾いたまま気づかず、水平に戻すと逆に傾いたと感じます') },
    { q: '離陸直後の強い加速', a: one('hf.body', '体性重力錯覚：加速すると機首上げと感じて機首を下げてしまいます') },
    { q: 'ふだんより幅の狭い', a: one('hf.body', '細い滑走路・上り坂の滑走路は「高い」と感じて低く進入しがち') },
    { q: '一酸化炭素（ヒーター', a: null },                         // (the kinds of hypoxia: not in part 1)
    { q: '14 CFR 91.211', a: null },                                 // (oxygen at all times above 14,000 ft: part 1 says only 12,500–14,000)
    { q: '夜に小さな灯火', a: null },                               // (off-centre viewing at night: not in part 1)
    { q: 'DECIDE モデルの', a: one('hf.adm', 'DECIDE：Detect（変化を見つける）') },
  ],
  q_comm: [
    { q: '"N123AB" を', a: [['comm.basic', 'N：言い方は November'], ['comm.basic', 'A：言い方は Alfa'], ['comm.basic', 'B：言い方は Bravo'], ...N.digits] },
    { q: '最初の交信の順番', a: one('comm.pattern', '覚え方：Who you are calling → Who you are → Where you are → What you want') },
    { q: '"Wilco" の意味', a: one('comm.words', 'Wilco：意味は受信し、理解し、従う（will comply）') },
    { q: '必ず復唱が必要', a: one('comm.readback', '滑走路の指定・滑走路に入る許可・hold short・line up and wait を必ず復唱です') },
    { q: 'トランスポンダーで無線の故障', a: one('comm.xpdr', '7600：無線の故障') },
    { q: '飛行中、管制塔から緑の連続', a: one('comm.nordo', '緑の連続：地上の航空機は離陸してよい、飛行中の航空機は着陸してよいです') },
    { q: '地上で、管制塔から赤の点滅', a: one('comm.nordo', '赤の点滅：地上の航空機は使用中の滑走路から出よ') },
    { q: '"Unable" はいつ', a: one('comm.words', 'Unable：意味は指示・要求・許可に従えない') },
    { q: 'ATIS を聞いた後の', a: one('comm.pattern', 'ATIS を聞いたら “with information Bravo” を入れます') },
    { q: '無線の調子が悪く', a: one('radio.listen', 'わからなければ聞き直す：推測で動かない。「Say again」') },
  ],
  q_radio: [
    { q: '高度 4,500 ft の', a: [N.alt[0]] },
    { q: '高度 10,500 ft の', a: [N.alt[1]] },
    { q: '針路 090° の', a: [N.hdg[1]] },
    { q: '周波数 119.75 の', a: N.frq },
    { q: '地上管制の「Runway three six', a: one('comm.dep', '「Runway three six, taxi via Alpha」は滑走路 36 の手前まで行ってよいという意味で') },
    { q: '「Runway three six, line up', a: one('comm.words', 'Line up and wait：意味は滑走路に入って待て（離陸許可ではない）') },
    { q: 'LUAW のまま長い時間', a: one('comm.tower', '管制方式では LUAW のまま 90 秒を超えて待たせないことになっています', '理由（着陸機など）がなくなったのに何も言われないときは確認します') },
    { q: 'Class C に入ろうとして', a: one('comm.pattern', 'Class C：コールサイン付きの応答があれば交信確立') },
    { q: '交通情報を探したが', a: one('comm.words', '見えなければ Negative contact') },
    { q: '「Contact departure」と', a: one('comm.pattern', '周波数の変更は「応答してから」変えます') },
    { q: '着陸後、管制塔の周波数', a: one('comm.arrive', '管制塔に言われるまで Ground に変えません') },
    { q: '「Radar service terminated', a: one('comm.radar', '（コードを 1200 に）') },
    { q: 'VFR の天気で無線が', a: one('comm.nordo', 'VFR で無線が故障：VFR のまま飛び、できるだけ早く（as soon as practicable）着陸。トランスポンダー 7600') },
    { q: '遭難（MAYDAY）の', a: one('comm.xpdr', '言葉：遭難は MAYDAY を 3 回') },
    { q: '管制塔のない空港の自己通報', a: one('comm.ctaf', '空港名を最初と最後に言います', '“active runway” ではなく滑走路の番号を言います', '“Traffic in the area, please advise” は決まった言い方ではなく、使いません') },
  ],
  // (not chapter 1's: the later chapters' banks are not tied here)
};
// k5: FLIGHT LAB's read-back and response scenes (radio.js SCENES), by id
export const SCENE_ANSWERS = {
  r_first: [['comm.pattern', '最初の呼び出し：相手 → 自分 → 場所 → 要求（＋ATIS の記号）'], ['comm.callsign', '最初の交信では省略しない'], ['comm.dep', 'student pilot, at the west ramp with information Bravo']],
  r_altim: [N.alts[0]],
  r_info: one('comm.atis', '最初の交信で “with information Bravo” と言うと、管制官は ATIS の内容を繰り返さなくてよくなります', '“have numbers”（風・滑走路・高度計だけ聞いた）は ATIS を聞いた意味にはなりません'),
  r_taxi: one('comm.dep', 'Runway three six, taxi via Alpha, hold short of Charlie', 'departure one one niner point seven five, squawk four two seven one, Archer 8SY'),
  r_rwyentry: one('comm.dep', '「Runway three six, taxi via Alpha」は滑走路 36 の手前まで行ってよいという意味で、滑走路に入ってよい・横切ってよいという意味ではありません'),
  r_cross: [['comm.readback', '滑走路の指定・滑走路に入る許可・hold short・line up and wait を必ず復唱です'], ['comm.mistakes', 'hold short の指示に “Roger” だけ：滑走路名まで復唱']],
  r_holdpos: one('comm.words', 'Hold short of … / Hold position：意味は…の手前で止まれ / その場で止まれ'),
  r_prog: one('comm.clarify', '経路が分からない：言い方は “Request progressive taxi.”'),
  r_ready: one('comm.tower', 'holding short runway three six, ready for departure, VFR northeast'),
  r_takeoff: one('comm.tower', '離陸許可の復唱には必ず滑走路番号を入れます'),
  r_luawlong: one('comm.tower', '理由（着陸機など）がなくなったのに何も言われないときは確認します'),
  r_contact: one('comm.pattern', '周波数を変えるよう言われたら必ず応答してから変えます'),
  r_traffic: one('comm.words', 'Traffic in sight / Negative contact：意味は言われた他機が見えた / 見えない'),
  r_clock: one('comm.radar', '時計の方位は機首が 12 時です'),
  r_squawk: [['comm.arrive', 'Squawk zero four two five, Archer 8SY'], N.sqk[0]],
  r_standby: one('comm.pattern', '管制官がこちらのコールサインを言って', '「remain outside Charlie airspace and stand by」なら外で待ちます'),
  r_standby2: one('comm.pattern', 'コールサインなしの「Aircraft calling LAB Approach, stand by」は確立していません'),
  r_vector: [['comm.readback', 'Right heading zero niner zero, climb and maintain three thousand five hundred, Archer 8SY'], N.hdg[1]],
  r_term: one('comm.radar', 'Squawk VFR, frequency change approved, Archer 8SY', '（コードを 1200 に）'),
  r_enterdw: one('comm.arrive', 'Left downwind runway three six, Tower one one eight point three, Archer 8SY'),
  r_land: one('comm.arrive', 'Number two, traffic in sight, runway three six, cleared to land, Archer 8SY'),
  r_extend: one('comm.arrive', '「Extend downwind（ダウンウインドを延ばせ）」'),
  r_option: one('comm.option', 'Runway three six, cleared for the option, Archer 8SY'),
  r_goaround: [['comm.option', 'Going around, Archer 8SY'], ['radio.technique', '操縦が最優先です（Aviate → Navigate → Communicate）']],
  r_exit: [['comm.arrive', '着陸後は、最初の使える誘導路から速やかに出て、停止線を越えたら止まります'], ['comm.arrive', '管制塔に言われるまで Ground に変えません'], ['comm.numbers', '地上管制の周波数（121 MHz 台）：書き方は 121.7、言い方は ground point seven']],
  r_correct: one('comm.clarify', '自分の言いまちがい：言い方は “Correction, …”'),
  r_unable: one('comm.clarify', '指示に従えない：言い方は “Unable, clouds ahead, Archer 8SY.”'),
  r_verify: one('comm.clarify', '自分宛てか分からない：言い方は “Verify clearance for Archer Seven Three Eight Sierra Yankee.”'),
  r_partial: one('comm.clarify', '一部だけなら “Say again all after Charlie.”'),
  r_ctaf_dw: one('comm.ctaf', 'entering downwind runway one seven, full stop, Strawn', '空港名を最初と最後に言います', '“Traffic in the area, please advise” は決まった言い方ではなく、使いません'),
  r_ctaf_clear: one('comm.ctaf', '滑走路を出たとき：“Strawn traffic, Apache Two Two Five Zulu, clear of runway one seven, Strawn.”'),
  r_mayday: one('comm.xpdr', '①MAYDAY ×3 / PAN-PAN ×3 ②相手の局 ③コールサインと機種', '④状況 ⑤天気 ⑥意図と要求 ⑦現在位置と針路'),
  r_panpan: one('comm.xpdr', '位置・燃料・天気などに不安を感じた時点で、少なくとも「緊急（urgency）」の状態です', '緊急は PAN-PAN を 3 回', '迷ったら最後に分かった位置・時刻・針路'),
  r_nordo: one('comm.nordo', 'VFR で無線が故障：VFR のまま飛び、できるだけ早く（as soon as practicable）着陸。トランスポンダー 7600'),
  r_light: one('comm.nordo', '白の点滅：地上の航空機は出発点に戻れ'),
  luaw: [['comm.words', 'Line up and wait：意味は滑走路に入って待て（離陸許可ではない）'], N.rwy[0]],
  holdshort: one('comm.sfb', '滑走路の指定・誘導路・hold short の指示は、コールサイン付きで同じ送信の中で復唱します'),
  notus: one('comm.mistakes', 'ほかの機への指示を自分のものと思う：コールサインを聞きます'),
  altdir: null,                                                     // (the VFR cruising altitudes, 91.159: not in part 1)
  sayagain: one('comm.clarify', '聞き取れなかった：言い方は “Say again, Archer 8SY.”'),
  pattern: one('comm.option', 'Left closed traffic, report midfield downwind, Archer 8SY'),
};
// k3: the drill's kinds (radio.js DRILLS)
export const DRILL_ANSWERS = {
  alt: N.alt, fl: N.fl, hdg: N.hdg, spd: N.spd, frq: N.frq, alts: N.alts, sqk: N.sqk, rwy: N.rwy, wnd: N.wnd, utc: N.utc,
  call: [...ALPHABET, ...N.digits], letter: ALPHABET,
};
// k6: the listening drill's kinds (radio.js LISTEN)
export const LISTEN_ANSWERS = {
  vector: [N.hdg[1], N.alt[0]],
  contact: [N.frq[0], N.sqk[0]],
  takeoff: [['comm.words', 'Line up and wait：意味は滑走路に入って待て（離陸許可ではない）'], N.rwy[0]],
  traffic: [['comm.radar', '交通情報の型（AIM 4-1-15・JO 7110.65）：時計の方位・距離・進む方向・機種・高度']],
  notme: [['radio.listen', '① まずコールサインだけを聞く'], ['comm.callsign', '似たコールサインの取り違えは、ほかの機への許可を自分のものとして実行してしまう事故につながります']],
  altim: N.alts,
};
// k2: the PFD's readings, each taught by a line of k1 (content/school.js TUTOR: its part)
export const PFD_ANSWERS = { ias: 'ias', alt: 'alt', hdg: 'hsi', vs: 'vs', bank: 'att' };
// the lecturer's own checks (content/lecture-notes) a chapter's questions fall back on where its sections answer too
// few of the banks' (radio1: one), each tied to the book's line that answers it as the banks' are
export const NOTE_ANSWERS = {
  'radio.why': [['radio.why', '地上を動くのは Ground、滑走路と場周は Tower です']],
  'radio.equip': [['radio.equip', 'よくある失敗は「COM2 に周波数を合わせたのに MIC が COM1 のまま」']],
  'radio.technique': [['radio.technique', '操縦が最優先です（Aviate → Navigate → Communicate）'], ['radio.technique', '忙しいときは「Stand by」（少し待って）と言ってよいです']],
};
