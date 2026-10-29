// CADET — content/lecture-notes/wx.js : the lecturer's own explanations for the sections of FLIGHT LAB's chapter 'wx' (format: index.js).
export default {
  'wx.atm': {
    intro: [
      '天気の話は、気圧と気温と水蒸気から始まります。じつは高度計も、気圧を測って高さを出す気圧計なんです。',
    ],
    notes: [
      { page: 'fig:0', text: 'さっきの図の線は、海面の 15℃ から左上へ上がっていきます。高く上がるほど寒い、ということです。' },
      // src: PHAK FAA-H-8083-25 ch. 12 (the standard lapse rate up to about 36,000 ft, the temperature constant above);
      // the figure's tropopause (ISA 36,089 ft)
      '標準大気では、約 36,000 ft の対流圏界面から上は、気温が一定になります。Archer が飛ぶのは、そのずっと下ですね。',
      '高さ 1,000 ft で気圧がおよそ 1 inHg 変わるので、規正値が 0.10 inHg 違うと、高度計の表示は約 100 ft ずれます。',
      // src: CADET's own radio (content/dialog/atc.js: LAB's elevation 55 ft, the ATIS altimeter set in BARO)
      '出発前に ATIS の値を BARO に合わせたら、表示が LAB の標高 55 ft に近いことを確かめます。',
      // src: PHAK FAA-H-8083-25 ch. 8 (from high to low pressure without resetting: the altimeter reads higher than the
      // airplane is; "high to low, look out below")
      'Remember: “High to low, look out below.” 規正値を直さずに気圧の低い所へ飛ぶと、実際は表示より低い所にいます。',
      // src: 14 CFR 91.121(a) (below 18,000 ft MSL, the current reported setting of a station along the route)
      'よくある間違いは、出発前に合わせた規正値を、帰るまで直さないことです。ATIS や管制から新しい値を聞いたら、合わせ直します。',
      '冷たいグラスに水滴がつくのは、グラスのまわりの空気が露点まで冷やされるからです。霧も同じしくみです。',
      '空気の安定は、くぼみの底のボールです。押しても戻ります。不安定は山の上のボールで、少し押すと転がっていきます。',
    ],
    // src: PHAK FAA-H-8083-25 ch. 8 (colder than standard: the airplane lower than indicated; hot to cold, look out below)
    ask: {
      q: '標準よりずっと寒い日、規正値を正しく合わせて飛んでいます。実際の高さは、高度計の表示と比べてどうですか？',
      opts: ['表示より低い', '表示より高い', '表示と同じ'],
      ok: 0,
      why: '冷たい空気は縮むので、同じ気圧になる高さが下がります。“Hot to cold, look out below.” 実際は表示より低い所にいます。',
    },
  },
  'wx.ts': {
    intro: [
      'フロリダの夏に飛ぶ操縦士は、毎日のように午後の積乱雲と向き合います。訓練の予定も、この雲に合わせて組みます。',
    ],
    notes: [
      // src: PHAK FAA-H-8083-25 ch. 12 (cloud names: cirro, alto (middle clouds), strato, cumulo, nimbo/nimbus
      // rain-bearing); the figure's Japanese names (巻雲・高積雲・層雲・積雲・乱層雲・積乱雲)
      { page: 'fig:0', text: '最初の図の雲の名前は、部品で覚えます。cirro は「巻」で上層、alto は「高」ですが中層、strato は「層」、cumulo は「積」です。' },
      'nimbus は「乱」、雨を降らせる雲のことです。Cumulonimbus（CB）は積乱雲、つまり雷雨の雲ですね。',
      // src: AC 00-45 (in a US METAR's sky condition, CB and TCU are the only cloud types reported)
      'METAR の雲の欄で種類まで書かれるのは、CB と TCU だけです。TCU は塔のように高く伸びた積雲で、積乱雲に育つことがあります。',
      { page: 'fig:1', text: '2 枚目の図は海風です。夏の昼の砂浜は、砂は熱いのに海の水はひんやりしていますね。温まった陸の空気が上がり、海から風が吹き込みます。' },
      'フロリダは東と西が海なので、両側からの海風が内陸でぶつかり、空気が押し上げられます。これが雷雨の「持ち上げる力」になります。',
      // src: PHAK FAA-H-8083-25 ch. 12 (cumulus, mature, dissipating stages), as FLIGHT LAB's q_wx bank
      '雷雨には 3 つの段階があります。上昇気流の積雲期、雨が降り始めて上下の気流が両方強い成熟期、下降気流が主の消散期です。',
      // src: AIM 7-1 Microbursts (a downdraft under a mile across; seldom lasts longer than 15 minutes), as the q_wx bank
      'マイクロバーストは狭い範囲に吹き下ろす強い下降気流で、たいてい 15 分以内に終わります。進入中に入ると、まず向かい風で機体が浮きます。',
      // (the chapter's own quiz in the textbook: power cut for the first "float" leaves nothing for the sink after it)
      'よくある間違いは、この「浮き」に合わせてパワーを絞ることです。その後の下降気流と追い風で、沈みを止められなくなります。',
    ],
    ask: {
      q: '西の積乱雲は、まだ空港から離れています。なのに吹き流しが急に向きを変え、強い突風が吹き始めました。何が届いたのでしょう？',
      opts: ['ガストフロント', '移流霧', '高気圧の下降気流'],
      ok: 0,
      why: 'ガストフロントは雷雨から吹き出す突風で、雷雨より先に空港に届きます。雷雨が近づいている合図です。',
    },
  },
  'wx.fog': {
    intro: [
      'VFR は「外が見える」ことが前提の飛び方です。霧と低い雲は、その前提を音もなく奪います。',
    ],
    notes: [
      // src: PHAK FAA-H-8083-25 ch. 12 (fog: a cloud at the surface; air cooled to its dewpoint, or moisture added)
      '霧は、地面に接した雲です。空気が露点まで冷えるか、水蒸気が増えて飽和すると、でき始めます。',
      // src: PHAK FAA-H-8083-25 ch. 12 (radiation fog: clear, calm nights, low-lying areas; burns off as the sun warms)
      '晴れて風の弱い夜が明けた朝、低い土地に白くたまっている霧が放射霧です。日が昇って地面が温まると、消えることが多いです。',
      // src: PHAK FAA-H-8083-25 ch. 12 (advection fog: warm moist air moved over a cold surface; unlike radiation fog,
      // it needs wind)
      '移流霧は、暖かく湿った空気が、風で冷たい地面や海の上へ運ばれてできます。風の弱い夜にできる放射霧と違い、風があってもできます。',
      // src: AC 00-45 (METAR FG fog, BR mist, VVhhh vertical visibility in hundreds of feet)
      'METAR では、霧は FG、もやは BR と書かれます。霧で空が見えないときは、VV002 のような垂直視程が出ます。',
      // src: 14 CFR 1.1 (ceiling: the lowest broken, overcast or obscuration layer, so VV is a ceiling); LAB's fog
      // morning in CADET (career.js weatherFor: 1/2SM FG VV002, the decision 'wait')
      '朝の LAB で「1/2SM FG VV002」なら、視程は 1/2 SM、上には 200 ft しか見えません。VV も雲高（ceiling）になります。',
      'そんな朝は、TAF で視程が戻る時刻を確かめて、飛ぶのを午後に回すことを考えます。霧の日は、待つのも立派な判断です。',
      'よくある間違いは、雲が下がるたびに高度を下げて、雲の下をくぐり続けることです。地面と障害物がどんどん近づきます。',
      // src: PHAK FAA-H-8083-25 ch. 17 (spatial disorientation without outside visual references)
      '雲に入ると、体の感覚はすぐ当てにならなくなります。引き返す条件は、地上にいるうちに、雲の高さや場所で決めておきます。',
    ],
    ask: {
      q: '訓練空域へ向かう途中、前方の雲の底がだんだん下がってきました。正しい判断は？',
      opts: ['高度を下げて、雲の下をくぐって進む', '決めておいた条件どおり、早めに引き返す', '雲に入って、上に抜ける'],
      ok: 1,
      why: 'くぐり続ければ地面が近づき、雲に入れば空間識失調の危険です。早めに引き返すのが正解です。',
    },
  },
  'wx.metar': {
    intro: [
      'METAR と TAF は、操縦士が毎朝読む天気の速記です。飛ぶ朝は、運航管理の画面でも必ず目にします。',
    ],
    // (the textbook's 8-row METAR table is read in class row by row; the notes add what the rows do not say)
    notes: [
      // src: AC 00-45 (the METAR's order; the present weather group only when weather is observed)
      'METAR は左から「どこ・いつ・風・視程・天気・雲・気温と露点・高度計」の順です。天気の欄は、雨や霧などがあるときだけ入ります。',
      // src: Eastern time (central Florida): EDT = UTC−4, EST = UTC−5
      '時刻はいつも Z（UTC）です。フロリダ中部では、夏時間の間は 4 時間、冬は 5 時間引くと現地時刻になります。',
      // src: 1 statute mile = 1.609 km
      'SM は法定マイルで、1 SM は約 1.6 km です。10SM なら、16 km ほど先まで見えているということですね。',
      '雲の 3 桁は、後ろに 00 をつけた地上からの高さです。BKN250 を 2,500 ft と読むのがよくある間違いで、正しくは 25,000 ft です。',
      '雲高は、いちばん低い BKN か OVC の層です。FEW と SCT は、いくつ並んでいても雲高になりません。',
      // src: AIM 4-2-8 (other numbers said digit by digit); the textbook's comm.numbers example (Altimeter three zero
      // zero one → 30.01)
      '高度計の A3001 は、ATIS では “Altimeter three zero zero one” と 1 桁ずつ聞こえます。',
      // src: FMH-1 / AC 00-45 (METAR wind direction in tens of degrees true; 000 only for calm, a north wind is 360): the
      // day's wind from 004° true is reported 36005KT (career.js weatherFor); the ATIS in magnetic (atc.js), variation
      // 6° W: 004 true = 010 magnetic
      'METAR の風向は 10° 単位の真方位で、LAB の 36005KT は北の風です。ATIS は磁方位なので “Wind zero one zero at five” と言います。',
      // src: AC 00-45 (TAF FM: from that time on; TEMPO: temporary fluctuations), as FLIGHT LAB's q_wx bank
      'TAF の FM は「その時刻から変わる」、TEMPO は「一時的に」です。TS や CB が出ている時間帯を避けて、飛ぶ計画を立てます。',
    ],
    ask: {
      q: 'METAR の雲が「FEW008 SCT015 BKN030 OVC060」。雲高（ceiling）は？',
      opts: ['800 ft', '1,500 ft', '3,000 ft', '6,000 ft'],
      ok: 2,
      why: 'FEW と SCT は雲高になりません。いちばん低い BKN の BKN030、つまり 3,000 ft が雲高です。',
    },
  },
  'wx.brief': {
    intro: [
      '天気を学ぶのは、「行くか・やめるか」を正しく決めるためです。この章の締めくくりにしましょう。',
    ],
    notes: [
      '91.103 の「必要なすべての情報」は、言いかえると「知らなかった」は理由にならない、ということです。',
      'METAR と TAF は空港という点の情報です。経路の天気は、GFA やレーダー、衛星画像で面として見ます。',
      // src: AIM 7-1 (PIREPs: cloud bases and tops, turbulence, icing as flown)
      'PIREP は、実際にそこを飛んだ操縦士の報告です。揺れや雲の底・頂上の高さなど、予報では分からない今の空が分かります。',
      // src: AIM 7-1-6 (AIRMETs: intensities lower than SIGMETs, potentially hazardous to light aircraft; Convective
      // SIGMETs: lines, areas, embedded or severe thunderstorms)
      'AIRMET は SIGMET ほど強くない乱気流や着氷などの情報ですが、練習機には危険になりえます。列や広い範囲の雷雨には Convective SIGMET が出ます。',
      'NOTAM は天気ではありませんが、同じ準備の中で見ます。滑走路の閉鎖や TFR を知らずに飛ぶわけにはいきません。',
      // src: LAB's dispatch in CADET (people.js 佐伯さん: decided with the instructor; go / wait / early / cancel)
      '飛ぶ朝は運航管理で METAR と TAF を見て、教官と一緒に、行く・待つ・早めに戻る・やめるのどれにするかを決めます。',
      // src: Risk Management Handbook FAA-H-8083-2 (personal minimums set in advance, away from the day's pressure)
      '個人の最低条件は、天気を見る前に決めておきます。天気を見てから決めると、つい「今日は行ける」に寄るからです。',
      'よくある間違いは、出発のときの天気だけで決めることです。帰ってくる時刻の天気と、だめなときの行き先まで見ます。',
    ],
    // (the textbook's own example for the chapter: TEMPO 1418/1422 TSRA → finish the training in the morning;
    // 18–22Z is 14–18 local in Eastern daylight time)
    ask: {
      q: 'TAF に「TEMPO 1418/1422 TSRA」。訓練は現地時刻（夏時間）の午後 2 時からの予定です。どうしますか？',
      opts: ['TEMPO は一時的なので、予定どおり飛ぶ', '午前に飛んで、雷雨の前に戻る計画に変える', '雷雨の雲の間を抜けて飛ぶ'],
      ok: 1,
      why: '18〜22Z は、フロリダ中部の夏時間で午後 2〜6 時、ちょうど訓練の時間です。午前のうちに終える計画にします。',
    },
  },
};
