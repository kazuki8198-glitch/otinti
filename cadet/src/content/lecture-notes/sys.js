// CADET — content/lecture-notes/sys.js : the lecturer's own explanations for the sections of FLIGHT LAB's chapter 'sys' (format: index.js).
export default {
  'sys.ctl': {
    intro: [
      '操縦翼面は、あなたの手と足の動きを機体の動きに変える部分です。どれを動かすと何が起きるか、体で覚えましょう。',
    ],
    notes: [
      '表を言い直すと、手は操縦輪で「傾き」と「機首の上下」を、足はペダルで「機首の左右」を受け持ちます。',
      // src: ailerons move in opposite directions: PHAK FAA-H-8083-25 ch. 6
      'エルロンは左右が逆に動きます。操縦輪を左へ回すと、左のエルロンが上がり、右のエルロンが下がって、機体は左へ傾きます。',
      // src: the stabilator is very sensitive; the anti-servo tab adds to the force needed to move it: PHAK FAA-H-8083-25 ch. 6
      'スタビレーターは水平尾翼の全体が動くので、少しの操作でもよく効きます。アンチサーボタブは、そこに手ごたえを足す仕掛けです。',
      '地上では、前輪はペダルで向きを変えます。操縦輪を車のハンドルのように回しても曲がりません。初めのうちは、よくやってしまいます。',
      // src: trimmed when the airplane holds its attitude with the control pressure relaxed: AFH FAA-H-8083-3 ch. 3
      'トリムは、腕で支えていた力を機体に肩代わりさせる装置です。手を軽くゆるめても姿勢が変わらなければ、合っています。',
      'よくある間違いは、姿勢が落ち着く前にトリムを回すことです。姿勢、パワー、少し待って、それからトリム。この順番です。',
      // src: flight controls checked for free and correct movement before takeoff: AFH FAA-H-8083-3 ch. 2; FLIGHT LAB's school checklist (操縦舵面：自由・正しい向き)
      'Free and correct. 離陸前には操縦輪とペダルを端まで動かし、翼面が引っかからず、正しい向きに動くかを確かめます。',
    ],
    ask: {
      q: '水平飛行で、操縦輪を少し引き続けていないと機首が下がってきます。どうしますか？',
      opts: ['パワーを上げて機首を上げる', '姿勢とパワーが落ち着いたのを確かめて、トリムで引く力を消す', 'ラダーペダルを踏んで直す', '腕の力でそのまま支え続ける'],
      ok: 1,
      why: '力が残っているのは、トリムがずれている印です。姿勢とパワーを決めてから、トリムで力を消します。',
    },
  },
  'sys.engine': {
    intro: [
      'エンジンは 1 つだけです。調子の小さな変化に早く気づけるかどうかが、そのまま安全につながります。',
    ],
    notes: [
      // src: with a fixed-pitch propeller the rpm also changes with airspeed at a fixed throttle: PHAK FAA-H-8083-25 ch. 7
      '固定ピッチでは回転計が出力の目安です。ただし回転は速度でも変わり、降下で速くなれば、スロットルそのままでも上がります。',
      'だから「理由なく下がった」とは、スロットルも速度も変えていないのに下がった、という意味です。そこでキャブレターアイスを疑います。',
      // src: magnetos work apart from the electrical system; a broken ground lead leaves a magneto "hot": PHAK FAA-H-8083-25 ch. 7
      'マスタースイッチを切っても、マグネトーの点火は切れません。プロペラはいつでも回り出すものとして扱い、回転面に近づかないでください。',
      // src: the textbook's start procedure (ops chapter: 「Prop clear!」と叫んで周りに人がいないことを確かめる → スターター)
      '始動の前には「Prop clear!」と声に出し、周りに人がいないことを確かめてから、スターターを回します。',
      // src: two plugs per cylinder burn the mixture more completely and quickly: PHAK FAA-H-8083-25 ch. 7
      'マグチェックで片側にすると回転が少し落ちるのは正常です。各シリンダーで火花が 1 本のプラグだけになり、燃え方が遅くなるからです。',
      // src: carburetor ice most likely in humid air from about −7 °C (20 °F) to 21 °C (70 °F), possible in warmer air: PHAK FAA-H-8083-25 ch. 7; FLIGHT LAB's q_sys bank
      'キャブレターアイスは、湿度が高く気温がおよそ −7〜21℃ の日に特に起きやすいのですが、もっと暖かい日にも起きます。',
      // src: carb heat: the rpm drops, then rises as the ice melts, with roughness while the water goes through: PHAK FAA-H-8083-25 ch. 7
      'よくある間違いは、キャブヒートを入れて荒れたのを見て、すぐ切ってしまうことです。荒れるのは、溶けた氷の水がエンジンを通るためです。',
      // src: the textbook's start procedure (油圧が上がるのを確認、上がらなければすぐ止める)
      'エンジンがかかったら、まず油圧の表示を見ます。上がらなければ、すぐにエンジンを止めます。ここだけは迷わないでください。',
    ],
    ask: {
      q: 'キャブヒートを ON にしたら、回転がいったん下がり、さらに荒れました。どう判断しますか？',
      opts: ['キャブヒートが壊れているので、すぐ OFF にする', '氷が溶けて流れている途中。ON のまま回復を待つ', 'ミクスチャーをいっぱいに引く', 'マグネトーを片側だけにする'],
      ok: 1,
      // src: heated air is less dense, so the rpm drops first: PHAK FAA-H-8083-25 ch. 7
      why: '温かい空気は薄いので回転はまず下がり、溶けた氷の水で一時的に荒れます。氷がとれれば回転は戻ります。',
    },
  },
  'sys.fuel': {
    intro: [
      '燃料切れは、機械より人の問題です。計画と確認の習慣を、この節でつくりましょう。',
    ],
    notes: [
      // src: fuel imbalance between the wing tanks: PHAK FAA-H-8083-25 ch. 7
      '左右のタンクは、両手に持った水のボトルのようなものです。片方ばかり使うと、機体は重い側へ傾こうとします。',
      // (the chapter's example: 30 分で切り替え、電動ポンプ ON、切替後の燃圧を確認)
      '切り替えは時計で決めておきます。例えば 30 分ごとです。切り替えるときは電動ポンプ ON、切り替えたら燃圧が保たれているかを見ます。',
      '切り替えたら、セレクターが LEFT か RIGHT の位置にきちんと入っているかを、手と目で確かめます。',
      'タンクに燃料が残っていても、空になった側を選んでいればエンジンは止まります。だから止まったら、まず切り替えです。',
      // src: water is heavier than fuel and settles at the bottom; drain until none appears: PHAK FAA-H-8083-25 ch. 7, AFH FAA-H-8083-3 ch. 2
      'サンプリングではカップの底を見ます。水は燃料より重いので、底に粒や層になってたまります。出なくなるまで抜きます。',
      // src: jet fuel is clear or straw colored and smells different: PHAK FAA-H-8083-25 ch. 7
      '色も見ます。100LL は青、ジェット燃料は無色か薄い黄色で、においも違います。',
      'ジェット燃料の給油車が来ることもあります。給油にはそばで立ち会い、正しい燃料が入るのを自分の目で確かめましょう。',
      '燃料計は目安です。飛行前にタンクの中を目で見て、飛行中は「何時に何 gal 残るか」を時間で数えます。',
    ],
    ask: {
      q: '離陸前、燃料セレクターはどこに合わせますか？',
      opts: ['BOTH', '燃料の多い側のタンク', '少ない側のタンク（先に使い切るため）', 'OFF'],
      ok: 1,
      why: 'Archer に BOTH はありません。離陸・着陸の前は燃料の多い側、電動ポンプ ON です。',
    },
  },
  'sys.elec': {
    intro: [
      'G1000 の画面も無線も、電気がなければ使えません。電気の流れを知っておけば、故障しても落ち着いて対処できます。',
    ],
    notes: [
      'オルタネーターは発電所、バッテリーは非常用の電池です。発電が止まると、電池だけで画面と無線を動かすことになります。',
      '電池の時間は限られます。携帯電話の省電力と同じで、使わない灯火や装置を切って、着陸までもたせます。',
      '大事なのは、電気が止まってもエンジンは止まらないことです。点火はマグネトー、つまりエンジン自身が受け持っています。',
      'ALT の注意が出たら、まず電流計で、発電機が電気を出せているかを見ます。そこから手順どおりに進めます。',
      'サーキットブレーカーは家のブレーカーと同じ考え方です。ただし二度目に飛んだら戻さず、その装置なしで飛ぶ計画にします。',
      '始動前に EMERG BATT を ARM にするのは、主の電源を失っても予備計器などが動くようにするためです。',
      '無線も電気です。電源が弱る前に管制へ状況を伝え、早めに降りる段取りをつけておきます。',
      'よくある間違いは、マスターを切ればエンジンも止まると思うことと、飛行後にマスターを切り忘れて電池を空にすることです。',
    ],
    ask: {
      q: 'ALT の注意表示が出ました。手順どおり ALT をリセットしても戻りません。次はどうしますか？',
      opts: ['予定どおり 2 時間飛び続ける', '不要な電気を切ってバッテリーを節約し、早めに着陸する', 'マスタースイッチを切ってエンジンを止める', 'サーキットブレーカーを何度も押し込む'],
      ok: 1,
      why: '発電が戻らなければ、残りはバッテリーだけです。負荷を減らし、なるべく早く着陸を計画します。',
    },
  },
  'sys.g1000': {
    intro: [
      'PFD の数字は、どこかのセンサーが測った値です。どこから来た数字かを知っていれば、おかしいときに見抜けます。',
    ],
    notes: [
      '表を言い直すと、空気の圧力から来るのが速度・高度・昇降率、AHRS から来るのが姿勢と方位、GPS から来るのが位置と対地速度です。',
      // src: the airspeed indicator compares pitot pressure with static pressure: PHAK FAA-H-8083-25 ch. 8
      'ピトー管は風を正面から受ける口、静圧孔はまわりの空気の圧力を測る小さな穴です。速度計はこの 2 つの差を読んでいます。',
      // src: pitot blocked with the drain hole open: the airspeed indicator drops to zero: PHAK FAA-H-8083-25 ch. 8
      'ピトー管だけが詰まって排水穴が開いていると、圧力が抜けて速度計は 0 へ下がっていきます。表の例は両方が詰まった場合です。',
      // src: the alternate static source uses cabin air, lower in pressure: altimeter and airspeed read higher: PHAK FAA-H-8083-25 ch. 8
      '代替静圧は機内の空気を使います。機内は少し気圧が低いので、高度計と速度計はやや高めに出ます。',
      'TAS の目安は 1,000 ft ごとに約 2% 増しです。5,000 ft で 100 KIAS なら、この目安で TAS はおよそ 110 kt です。',
      // src: the textbook's takeoff procedure ("Airspeed alive"); AFH FAA-H-8083-3, Takeoffs and Departure Climbs
      'Airspeed alive. 離陸滑走の始めに、速度計が動き出すのを必ず見ます。動かなければ、離陸をやめます。',
      // src: lower pressure or colder air than standard: the altimeter reads higher than the true altitude, and the setting corrects only the pressure: PHAK FAA-H-8083-25 ch. 8; AIM 4-1-13 (ATIS altimeter setting)
      'High to low の気圧の分は、ATIS や管制の新しい規正値をすぐ BARO に合わせて防ぎます。気温の分は規正値では直らないので、寒い日は地面から余裕を取ります。',
      // src: downwind, the higher groundspeed tempts the pilot to let the airspeed decay: AFH FAA-H-8083-3 (the stall and traffic-pattern chapters)
      'よくある間違いは、追い風で地面が速く流れるのにつられて速度を落とすことです。翼にとっての速さは、いつも IAS です。',
    ],
    ask: {
      q: '上昇中、高度計が止まったまま、昇降計は 0、速度計は遅めに出ています。何が起きていると考えますか？',
      opts: ['ピトー管が詰まった', '静圧孔が詰まった', 'AHRS が故障した', 'GPS が故障した'],
      ok: 1,
      why: '静圧が変わらないので高度計は止まり、昇降計は 0、上昇中の速度計は遅く出ます。代替静圧に切り替えます。',
    },
  },
  'sys.compass': {
    intro: [
      '主の表示が使えなくなったとき、最後に頼るのがコンパスと予備計器です。だから癖まで知っておきます。',
    ],
    notes: [
      // src: the compass card floats in a liquid and swings in turbulence: PHAK FAA-H-8083-25 ch. 8
      '磁気コンパスは、液体の中に浮かんだ磁石の目盛りです。コップの水と同じで、傾けたり揺らしたりすると揺れて、正しく読めません。',
      // src: add westerly variation, subtract easterly: PHAK FAA-H-8083-25 ch. 16 (LAB's 6°W is the textbook's own approximation)
      '真方位から磁方位へは、西偏は足し、東偏は引きます。West is best, East is least. 西偏 6° なら真方位 090° は磁方位 096° です。',
      '自差カードには、ある磁方位に飛ぶにはコンパスでいくつを読めばよいかが、方位ごとに書いてあります。',
      '北へ向かう旋回はコンパスが北に来る手前で、南へ向かう旋回は南を過ぎてからロールアウトします。これが UNOS です。',
      '東か西を向いて離陸で加速したり、水平飛行に移って速くなったりすると、コンパスは北へ振れます。慌てなくて大丈夫です。',
      // src: the float card is read from behind and looks backward; the vertical card was made for this: PHAK FAA-H-8083-25 ch. 8
      'フロート式のコンパスは目盛りを裏側から見るので、向かいたい方位の数字が、曲がる側と反対に見えます。最初は戸惑う人が多いところです。',
      '始動前に予備計器が動くのを確かめるのは、空の上で初めて使う道具にしないためです。',
      '仲間はずれ探しの例です。PFD は右旋回を示し、予備の姿勢計と GPS の航跡はまっすぐを示しています。それなら疑うのは PFD の方です。',
    ],
    ask: {
      q: '北を向いて飛んでいます。右旋回で東へ向かい始めたとき、コンパスはどう動きますか？',
      opts: ['すぐに正確に東へ回る', '最初は逆の方へ振れ、遅れてついてくる', '先回りして早く東を指す', 'まったく動かない'],
      ok: 1,
      why: '北旋誤差です。北向きからの旋回では、最初は逆へ振れて遅れます。旋回中のコンパスは目安にとどめます。',
    },
  },
  'sys.gear': {
    intro: [
      '地上を動くとき、そして夜にほかの機体を見つけるとき、この節の知識を毎回使います。',
    ],
    notes: [
      // src: tricycle gear: the CG ahead of the main wheels keeps the airplane straight on the ground: PHAK FAA-H-8083-25 ch. 7 (Landing Gear)
      '三輪式は重心が主輪より前にあります。重い矢じりを前にした矢がまっすぐ飛ぶのと同じで、地上でまっすぐに戻ろうとします。',
      'Archer の脚は出たままの固定脚です。それでも着陸前に GUMPS を唱える習慣をつけておけば、引込脚の機体に移っても忘れません。',
      'GUMPS は Gas・Undercarriage・Mixture・Props・Seatbelts の頭文字で、燃料、脚、ミクスチャー、プロペラ、ベルトの確認です。',
      // src: taxiing with the heels on the floor, the feet slid up to the brakes only when needed: AFH FAA-H-8083-3 ch. 2
      'ブレーキはペダルの上を踏むと効きます。タキシー中はかかとを床につけ、ペダルの下の方でラダーだけを使います。',
      'よくある間違いは、足をペダルの上に置いたまま、気づかずにブレーキを引きずることです。タイヤとブレーキを傷めます。',
      // src: the brakes tested as soon as the airplane is put in motion: AFH FAA-H-8083-3 ch. 2
      '動き出したらすぐ、パワーを絞ってブレーキが効くかを確かめます。止まれないとわかるのは、早いほど安全です。',
      // src: the textbook's start procedure (衝突防止灯 ON before the starter)
      '衝突防止灯は始動の前に ON にして、周りの人にエンジンがかかることを知らせます。',
      '夜、赤も緑も見えず、尾部の白い灯だけが見えたら、相手はこちらから遠ざかる向きに進んでいます。',
    ],
    ask: {
      q: '夜、前方に灯火が見えます。左に緑、右に赤が見えます。相手はどちらを向いていますか？',
      opts: ['こちらを向いている', 'こちらに背を向けている', '右から左へ横切っている'],
      ok: 0,
      why: '相手の右翼端の緑がこちらから見て左、左翼端の赤が右に見えるので、相手はこちらを向いています。',
    },
  },
};
