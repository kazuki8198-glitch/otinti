// CADET — content/lecture-notes/aero.js : the lecturer's own explanations for the sections of FLIGHT LAB's chapter 'aero' (format: index.js).
export default {
  'aero.forces': {
    intro: [
      '4 つの力は、これから毎回の飛行で使う考え方の土台です。',
      '操縦とは、姿勢とパワーで 4 つの力のつり合いを作り直すことだ、と思ってください。',
    ],
    notes: [
      '高速道路を一定の速さで走る車を思い浮かべてください。エンジンの力と抵抗がつり合っていて、それでも車は走り続けています。',
      '一定の速さで上がっていくエレベーターの中でも、体重計の目盛りはふだんと同じです。動いていても、力はつり合っています。',
      'よくある勘違いは「上昇中はずっと揚力が重力より大きい」です。上昇の途中でも、速度が変わらなければそうではありません。',
      'パワーを絞ると逆のことが起きます。推力が抗力より小さくなって速度が落ち、揚力も減るので、何もしなければ機体は降下を始めます。',
      // src: the textbook's ops.trim key point (上昇・降下は主に出力で); AFH FAA-H-8083-3 ch. 3
      'Remember: 上昇するか降下するかを決めるのは、主にパワーです。',
      // src: the textbook's ops.climb level-off (10% lead, APT: attitude → speed builds → power → trim); AFH FAA-H-8083-3 ch. 3
      '上昇から水平に戻すときは、目標の高度の少し手前で機首を水平の姿勢へ下げ、速度が巡航まで増えてからパワーを絞り、最後にトリムです。',
    ],
    ask: {
      q: '一定の速度・一定の上昇率で、まっすぐ上昇しています。4 つの力はどうなっていますか？',
      opts: ['揚力が重力より大きい', 'つり合っている', '推力が抗力より小さい'],
      ok: 1,
      why: '加速していなければ、力はつり合っています。上昇中は、推力の一部が重力の一部を支えています。',
    },
  },
  'aero.lift': {
    intro: [
      '揚力の式は暗記するためではなく、遅いときや暑い日に機体がどう変わるかを読むための道具です。',
    ],
    notes: [
      '車の窓から出した手のひらの前の端を少し上げると、手は上へ持ち上げられますね。翼も空気を下へ曲げて、その反作用で押し上げられています。',
      { page: 'tab:0', text: '表の右の列を見てください。飛びながら変えられるのは速度と迎え角、それにフラップで少し増える翼の面積です。' },
      // src: density altitude lengthens the takeoff roll (higher true airspeed needed): PHAK FAA-H-8083-25 ch. 4 and ch. 11
      '空気の密度は操縦では変えられません。暑い日、湿った日、高い空港では空気が薄く、空気に対してより速く動く必要があり、離陸の滑走も長くなります。',
      // (the section's think answer: CL 0.40 at 100 kt, about 0.82 at 70 kt; its question names "この教材" and is not said)
      '100 kt から 70 kt に落ちると、同じ重さを支えるのに必要な揚力係数は約 2 倍です。',
      // src: the flare raises the angle of attack as the speed decays: AFH FAA-H-8083-3 ch. 9
      '着陸に向けて遅くなるときにフラップを下げ、最後に機首を上げてフレアするのは、遅くなった分の揚力をフラップと迎え角で補うためです。',
      'よくある誤りは「揚力は速度だけで決まる」と考えることです。同じ速度でも、迎え角で揚力は大きく変わります。',
    ],
    ask: {
      q: '揚力の式のうち、操縦士が操縦装置で変えられないものはどれですか？',
      opts: ['対気速度 V', '揚力係数（迎え角）', '空気の密度 ρ'],
      ok: 2,
      why: '密度は場所と天気で決まります。速度はパワーと姿勢で、揚力係数は操縦桿で変えられます。',
    },
  },
  'aero.aoa': {
    intro: [
      '失速を本当に理解する鍵は、速度ではなく迎え角です。',
    ],
    notes: [
      // src: chord line = leading edge to trailing edge; relative wind opposite the flight path: PHAK FAA-H-8083-25 ch. 5
      { page: 'fig:0', text: '最初の図で、翼の前の端と後ろの端を結ぶ点線が翼弦線、まっすぐな矢印が相対風です。その間の角度が迎え角です。' },
      '相対風は、機体が進む向きのちょうど反対から来ます。基準は地平線ではなく、機体が進む向きです。',
      'グライダーがゆっくり降りてくるとき、機首は少し下を向いていても、空気は斜め下から当たり、翼は揚力を出しています。',
      // (the liftCurve figure as drawn: "臨界迎え角 約 17°", the flap-40 curve dashed above the solid flap-UP one, its peak earlier)
      { page: 'fig:1', text: '2 つめの図は揚力曲線です。横が迎え角、縦が揚力係数で、線はほぼまっすぐ上がり、約 17° の頂上を越えると急に下がります。' },
      'フラップ 40° の点線は UP の線より上を通り、頂上は少し左に来ます。同じ迎え角で揚力は大きく、失速の角度は少し小さくなります。',
      '姿勢表示が教えてくれるのはピッチ角で、迎え角ではありません。2 つを同じものだと思わないでください。',
      // src: accelerated stalls at any airspeed: AFH FAA-H-8083-3 ch. 5
      '訓練生がよく言うのは「速度が十分あるから失速しない」です。速くても急に強く引けば、臨界迎え角を超えます。',
    ],
    ask: {
      // src: angle of attack is measured from the relative wind, not the horizon (pitch = flight path + AOA): PHAK FAA-H-8083-25 ch. 5
      q: '上昇中で、姿勢表示のピッチ角は 10° です。迎え角はどうなっていますか？',
      opts: ['10° より小さい', 'ちょうど 10°', '10° より大きい'],
      ok: 0,
      why: '迎え角は進む向き（相対風）に対する角度です。上昇中は進む向きそのものが上を向いているので、迎え角はピッチ角より小さくなります。',
    },
  },
  'aero.drag': {
    intro: [
      '抗力を知っておくと、エンジンが止まったときに何 kt で飛べばいいかが分かります。',
    ],
    notes: [
      '有害抗力は、自転車を速くこぐほど体に当たる風の抵抗が急に大きくなるのと同じです。速度が 2 倍なら 4 倍になります。',
      '誘導抗力は、揚力を作ることの副作用で、翼の端から後ろへ伸びる渦と関係しています。遅く、大きな迎え角で飛ぶほど大きくなります。',
      // (the dragCurve figure as drawn: "最小抗力 約 71 kt"; its caption: the model leaves out the windmilling propeller,
      // the checklist's 76 kt is the real aircraft's — the figure does not say which way that moves the speed, so neither do we)
      { page: 'fig:0', text: '図では 2 つを足した全抗力が U の字の線になり、いちばん低い所がこの図では約 71 kt です。' },
      { page: 'fig:0', text: 'チェックリストの 76 kt と少し違うのは、図が計算のモデルで、風車のように回るプロペラの抗力などを含まないからです。飛ぶときは 76 kt を使います。' },
      // src: establish the best-glide attitude at once and trim: AFH FAA-H-8083-3 ch. 18
      'Remember: エンジンが止まったら、まず 76 kt になる姿勢にしてトリムを取ります。考える前に手が動くまで練習します。',
      '届きそうにないとき、人は機首を上げたくなります。でも 76 kt より遅くすると、かえって滑空距離が短くなります。',
      // src: the Archer checklist's power-off landing (76 KIAS; 66 KIAS once the field can easily be reached), as the section has it
      '降りる場所に十分届くと分かったら、チェックリストでは 66 kt に落とします。',
      // src: a little faster into a headwind (less time in the air being blown back): PHAK FAA-H-8083-25 ch. 5, AFH ch. 18
      '向かい風の中では、空中にいる時間が長いほど押し戻されます。少し速く飛ぶのは、その時間を短くするためです。',
    ],
    ask: {
      q: 'エンジンが止まり、できるだけ遠くまで滑空したい場面です。風が弱いとき、どの速度で飛びますか？',
      opts: ['機首を上げて速度を落とし、長く浮く', '76 kt を保ってトリムを取る', '機首を下げて速度を上げ、早く着く'],
      ok: 1,
      why: '最良滑空速度より遅くても速くても、同じ高さから滑空できる距離は短くなります。',
    },
  },
  'aero.stall': {
    intro: [
      '失速の練習の目的は、兆候に早く気づき、考える前に正しく回復できるようになることです。',
    ],
    notes: [
      // src: stall warning devices sense the leading-edge airflow / angle of attack: PHAK FAA-H-8083-25 ch. 5, AFH ch. 5
      '多くの軽飛行機の失速警報は、翼の前の端で空気の流れの変化を感じて鳴ります。速度ではなく、迎え角に反応する装置です。',
      // src: aileron at a high angle of attack can deepen the stall on the down-aileron wing: AFH FAA-H-8083-3 ch. 5
      '回復の順番は「前へ、翼を水平に、パワー」です。迎え角が大きいままエルロンを使うと、エルロンが下がった側の翼がさらに深く失速することがあります。',
      { page: 'tab:0', text: '表の中で失速速度を下げるのはフラップだけです。重い、旋回中、重心が前、翼に霜や氷がある、はどれも失速速度を上げます。' },
      '重心が前だと上がるのは、尾翼が下へ押す力が増え、翼がその分まで持ち上げなければならないからです。',
      // src: frost roughening the upper surface reduces lift and raises the stall speed: PHAK FAA-H-8083-25 ch. 12 (dew and
      // frost), AC 00-6B (icing)
      '薄い霜でも、翼の上面がざらつくだけで揚力は大きく減ります。寒い朝の外部点検では、翼の上の霜を必ず確かめて取り除きます。',
      // src: the base-to-final stall/spin happens low, with little height to recover: AFH FAA-H-8083-3 ch. 5
      'ファイナルへの旋回でのスピンが怖いのは、低い高度で起きるからです。回復する高さが足りないことがあります。',
      // src: the textbook's tl key point (行き過ぎたらゴーアラウンド)
      '行き過ぎそうなら、無理に合わせずにゴーアラウンドします。それが正しい判断です。',
    ],
    ask: {
      q: '練習中に失速のホーンが鳴り、機体が振動し始めました。最初の操作はどれですか？',
      opts: ['パワーを最大にする', 'エルロンで翼を水平にする', '操縦桿を前へ（迎え角を減らす）', '操縦桿を引いて高度を守る'],
      ok: 2,
      why: '迎え角を減らさない限り回復しません。翼を水平にし、パワーを足すのはそのあとです。',
    },
  },
  'aero.turn': {
    intro: [
      '場周経路の旋回も、訓練空域の急旋回も、この節の物理の上に乗っています。',
    ],
    notes: [
      { page: 'tab:0', text: 'OK, 表を見てください。バンク角ごとの G と失速速度の増え方、100 kt での回り方です。30° までは変化が小さく、45° を超えると急に増えます。' },
      '60° のバンクでは 2 G です。体重 60 kg の人が、座席に 120 kg で押しつけられる感じです。',
      // (50 kt: the Vs1 of the aero.vn table; 50 × 1.41 ≒ 71)
      '失速速度が 50 kt の機体でも、60° のバンクでは約 71 kt で失速します。',
      { page: 'tab:0', text: '右の 2 列を見ると、同じ速度ならバンクが深いほど速く、小さく回れます。その代わりに G と失速速度が上がります。' },
      // src: the PFD's slip/skid trapezoid under the roll pointer (FLIGHT LAB's drawPFD, as the cockpit's PFD draws it)
      'PFD では、傾きを示す三角の下の小さな台形がボールの役目です。ずれた側のラダーを踏んで、中央に戻します。',
      // src: overbanking tendency from the faster outer wing: PHAK FAA-H-8083-25 ch. 5 (and the textbook's ops.turns)
      '深いバンクで機体がさらに傾こうとするのは、外側の翼のほうが速く進み、揚力が大きくなるからです。',
      '30° のバンクなら、目標の針路の約 15° 手前から戻し始めます。',
      // src: the textbook's ops.turns (look first, the turning side and above/below; the horizon and the nose)
      '旋回の前には、曲がる側と上下を必ず見てください。旋回中は計器だけに頼らず、外の水平線と機首の位置関係で姿勢を保ちます。',
    ],
    ask: {
      q: '高度を保って旋回しているつもりが、少しずつ高度が下がっていきます。よくある原因はどれですか？',
      opts: ['パワーが多すぎる', 'バンクが浅すぎる', '揚力を増やす分だけ引いていない'],
      ok: 2,
      why: '揚力の一部が横向きに使われるので、高度を保つには少し引いて揚力を増やします。',
    },
  },
  'aero.stab': {
    intro: [
      '安定性は、少し手を離しても機体が落ち着いて飛び続けてくれる理由です。',
    ],
    notes: [
      { page: 'fig:0', text: '図の 3 つは、くぼみの底の玉、平らな台の玉、山の上の玉です。底の玉は戻り、台の玉はとどまり、山の上の玉は転がり落ちます。' },
      // src: dynamic stability as the oscillation over time (damped = positive): PHAK FAA-H-8083-25 ch. 5
      '動安定は、ぶらんこにたとえられます。押したあと揺れが少しずつ小さくなって止まれば、正の動安定です。',
      // src: longitudinal stability = pitch about the lateral axis: PHAK FAA-H-8083-25 ch. 5
      { page: 'tab:0', text: '名前に気をつけてください。「縦の安定」はピッチの安定で、横軸まわりの動きです。表の「縦軸まわり」はロールです。' },
      '垂直尾翼は風見鶏と同じです。機首が横を向くと、横から当たる空気が尾翼を押し、機首を進む方向へ戻します。',
      // src: dihedral: the low wing meets the sideslip at a larger angle of attack: PHAK FAA-H-8083-25 ch. 5
      '上反角があると、傾いて下がった側へ横滑りしたとき、下がった翼の迎え角が大きくなり、揚力が増えて水平へ戻ろうとします。',
      // src: positive longitudinal stability returns to the trimmed speed through damped oscillations: PHAK FAA-H-8083-25 ch. 5
      'トリムを取って手を離すと、突風で機首が上がっても、速度が落ちて機首が戻り、何度か揺れながら元の速度に落ち着こうとします。',
      // src: a slow bank below the inner ear's threshold goes unnoticed: PHAK FAA-H-8083-25 ch. 17; clouds: 14 CFR 91.155
      '雲に入って外が見えなくなると、ゆっくり深くなるバンクに体は気づきにくくなります。VFR で雲に近づかない理由のひとつです。',
    ],
    ask: {
      q: 'トリムを取った水平飛行中、突風で機首が少し上がりました。正の静安定がある機体はどうなりますか？',
      opts: ['元の姿勢へ戻ろうとする', '上がった姿勢のままとどまる', '機首がどんどん上がっていく'],
      ok: 0,
      why: '正の静安定は、ずれたときに元へ戻ろうとする性質です。とどまるのは中立、離れていくのは負の静安定です。',
    },
  },
  'aero.left': {
    intro: [
      '離陸と上昇で右足をしっかり使う理由が、この節です。',
    ],
    notes: [
      '電動ドリルを回すと、本体が反対へねじられますね。トルクは、あれと同じ反作用です。',
      { page: 'fig:0', text: '図の緑の矢印を見てください。右の「推力 大」が左の「推力 小」より長く、その差で機首が左へ回ります。右ラダーで打ち消します。' },
      // src: gyroscopic precession, the force felt 90° ahead in the direction of rotation: PHAK FAA-H-8083-25 ch. 5
      'ジャイロ効果は、回っているこまや車輪の向きを変えようとすると、力が回る向きに 90° 進んだ所に表れる性質です。',
      'LAB の滑走路 36 でフルパワーにすると、機首は左へ行きたがります。右ラダーで中心線を保ち、浮いたあとも右足は緩めません。',
      // src: uncoordinated flight adds drag: PHAK FAA-H-8083-25 ch. 5
      '上昇中に右足が足りないと、機体は少し横を向いたまま飛び、抗力が増えて上昇が鈍くなります。',
      // src: the down-aileron wing makes more lift and more induced drag: PHAK FAA-H-8083-25 ch. 5 (adverse yaw)
      '逆ヨーは、エルロンが下がった側の翼で、揚力と一緒に抗力も増えるために起きます。機首は、曲がりたい方と反対へ一瞬向きます。',
      // src: the textbook's ops.turns key point (バンクはエルロン、ボールはラダー)
      'よくある誤りは、左へ向く機首をエルロンで直そうとすることです。向きはラダー、傾きはエルロンで直します。',
    ],
    ask: {
      q: '上昇中、ボールが右に寄っています。どうしますか？',
      opts: ['右ラダーを少し踏む', '左ラダーを少し踏む', '操縦輪を右へ回す'],
      ok: 0,
      why: 'ボールが寄った側のラダーを踏みます。上昇中は左偏向傾向があり、右ラダーが足りないことが多いのです。',
    },
  },
  'aero.ge': {
    intro: [
      '着陸の直前、地面に近づいたところで機体の感じが変わる理由が、この節です。',
    ],
    notes: [
      '紙飛行機が床すれすれで、思ったより長くすべっていくのを見たことはありますか。あれも地面効果です。',
      // src: the effect grows as the wing nears the ground: PHAK FAA-H-8083-25 ch. 5 (ground effect)
      '地面効果が表れるのは、おおむね翼幅、つまり翼の端から端までの長さより低い所で、低いほど強くなります。低翼の Archer は特に強く感じます。',
      // src: the textbook's tl key point (フロートは速すぎるかフレアが高すぎる。押して下ろさない。長すぎたらゴーアラウンド)
      'フロートの元はたいてい進入の余分な速度です。決められた進入速度を守ることが、いちばんの対策です。',
      '浮きすぎて滑走路が足りなくなりそうなら、押さえつけて下ろさずにゴーアラウンドします。',
      // src: the textbook's solo section (教官がいないので機体が軽く、フレアで浮きやすい)
      '初めての単独飛行の日は、教官が乗っていない分だけ機体が軽く、いつもよりフロートしやすくなります。',
      // src: the soft-field takeoff accelerates in ground effect before climbing: AFH FAA-H-8083-3 ch. 6
      '軟弱地の離陸では、これをわざと使います。早めに浮いて、地面効果の中で速度をつけてから上昇します。',
      { page: 'tab:0', text: '表のフラップは、10° では主に揚力を足し、深くするほど抗力が増えます。40° は降下の角度を深くできるので、着陸に使います。' },
      // src: the textbook's comm go-around exchange (aviate first: power, attitude, configuration; then "Going around, …")
      'ゴーアラウンドは操縦が先です。全開、姿勢、フラップ 25° と操作してから、“Going around, Archer 8SY.” と伝えます。',
    ],
    ask: {
      q: 'フラップ 40° の進入からゴーアラウンドします。パワーを全開にしたあと、フラップはどうしますか？',
      opts: ['すぐに一度に全部上げる', 'まず 25° へ。障害物を越えてからゆっくり上げる', '40° のまま上昇を続ける'],
      ok: 1,
      why: '一度に全部上げると揚力が急に減って沈みます。チェックリストのとおり、まず 25° です。',
    },
  },
  'aero.vn': {
    intro: [
      '速度計の色の帯は、機体を壊さずに飛ぶための約束です。',
      'V-n 線図は線と数字だけなので、ひとつずつ言葉で読んでいきます。',
    ],
    notes: [
      { page: 'fig:0', text: '図の横は速度、縦は G です。線で囲まれた中が、飛んでよい範囲です。' },
      '左の曲線は失速の線です。遅いときは、強く引いても大きな G が出る前に翼が失速します。',
      // src: normal-category limit load factors +3.8 / -1.52 (the figure's caption); PHAK FAA-H-8083-25 ch. 5 (V-g diagram)
      '上の線は +3.8 G、下の線は -1.52 G で、普通類の例です。超えると、機体の構造が傷んだり壊れたりするおそれがあります。',
      // src: Va where the stall line meets the limit load: PHAK FAA-H-8083-25 ch. 5 (hedged: one abrupt input, not several)
      '失速の曲線と上の線が出会う点が Va です。Va より遅ければ、急に強く引いても先に失速し、構造の限界を超えにくくなります。',
      // (the figure's "Va 約 97" is 50 × √3.8 from the table's Vs1; the checklist's 113 / 89 KIAS are what is flown)
      { page: 'fig:0', text: '図の Va は約 97 kt で、表の失速速度 50 kt から計算した目安です。飛ぶときは、表のチェックリストの値を使います。' },
      '軽いと Va が小さくなるのは、軽い機体ほど失速速度が下がり、失速の曲線がより遅い速度で上の線に届くからです。',
      // src: the airspeed indicator's arcs (white from Vso, green from Vs1): PHAK FAA-H-8083-25 ch. 8
      { page: 'tab:0', text: '速度計の白い帯の下の端が Vso、緑の帯の下の端が Vs1 です。上の端は表のとおり、Vfe と Vno です。' },
      // src: the PFD's speed tape bands (FLIGHT LAB's drawPFD; the training device's k1 lesson)
      'PFD の速度テープにも同じ色の帯が出ます。乱気流では黄色の帯に入れず、パワーを絞って Va 以下へ減速します。',
    ],
    ask: {
      q: 'ひとりで乗って機体が軽い日に、乱気流に入りそうです。Va はどうなりますか？',
      opts: ['最大重量の 113 kt と同じ', '最大重量の 113 kt より小さい', '113 kt より大きい'],
      ok: 1,
      why: 'Va は重量が軽いほど小さくなります。チェックリストでは 1,917 lb で 89 KIAS です。',
    },
  },
};
