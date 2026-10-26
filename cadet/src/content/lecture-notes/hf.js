// CADET — content/lecture-notes/hf.js : the lecturer's own explanations for the sections of FLIGHT LAB's chapter 'hf' (format: index.js).
export default {
  'hf.self': {
    intro: [
      '機体の外部点検をするように、飛ぶ前には自分も点検します。その道具が IMSAFE です。',
    ],
    notes: [
      // src: PHAK FAA-H-8083-25 ch. 17 (a cold: the middle ear and the sinuses blocked with the change of altitude)
      'I は病気です。熱やせきだけでなく、耳や鼻の詰まりも、高度が変わると痛みになることがあります。',
      // src: PHAK ch. 17 (over-the-counter antihistamines cause drowsiness); the chapter's caution (the AME and the rules first)
      'M は薬です。風邪薬や花粉症の薬には、眠くなるものがあります。迷ったら、航空身体検査医に聞きます。',
      'S はストレスです。試験や家族のことで頭がいっぱいだと、無線を聞き逃したり、手順を飛ばしたりします。',
      'A は飲酒です。8 時間は最低限です。時間がたっていても、影響が残っていれば飛べません。',
      // src: PHAK ch. 17 (fatigue may not be apparent to the pilot until serious errors are made)
      'F は疲れです。寝不足のこわいところは、自分では気づきにくいことです。',
      // src: PHAK ch. 17 (dehydration in hot weather)
      'E は気持ちと食事です。怒りや悲しみ、朝食抜き、暑い日の水分不足も、判断を鈍らせます。',
      '体調を理由に飛ばないと決めるのは、弱さではありません。機長としての正しい判断です。',
      'よくある間違いは、IMSAFE を早口で唱えて終わることです。ひとつずつ、自分に本当に聞いてください。',
    ],
    ask: {
      q: '前の晩 21 時までお酒を飲み、翌朝 7 時に飛ぶ予定です。正しい考え方はどれですか？',
      opts: ['8 時間を過ぎたので、体調に関係なく飛べる', '8 時間は過ぎた。それでも影響が残っていれば飛ばない', '規則では 12 時間あけないと飛べない'],
      ok: 1,
      why: '91.17 は、8 時間以内・血中濃度 0.04% 以上・影響下の、どれにあたっても飛べない規則です。時間だけ満たしても、影響が残っていれば飛べません。',
    },
  },
  'hf.adm': {
    intro: [
      // src: PHAK FAA-H-8083-25 ch. 2 (most accidents involve human factors; the poor judgment chain; ADM can be learned)
      '事故の多くは、操縦の腕よりも、判断の誤りから始まります。判断にも、練習できる型があります。',
    ],
    notes: [
      // src: PHAK ch. 2 (external pressures: a sense of pressure to complete a flight, often at the expense of safety)
      'PAVE は、自分・機体・環境・外からの圧力です。E がいちばん危ないことが多いのは、「待たせている」という気持ちが、ほかの見方まで曲げるからです。',
      // src: PHAK ch. 2 / Risk Management Handbook (the 3P model used continuously through the flight)
      '3P は短い型です。気づいて、どれほど危ないか考え、手を打って確かめます。飛行中、何度でも回します。',
      'DECIDE の例です。前方の雲が下がってきたと気づき、このままでは雲に近づくので対応が要ると見積もり、安全に戻ることを選びます。',
      '次に、180° 旋回して管制に伝える、と行動を決め、実行し、雲から離れたかを確かめます。これで 6 つです。',
      // (the tem figure as drawn: Threat "天気・他機・不具合…" → Error "操作・手順・交信の誤り" → UAS "高度・速度の逸脱…",
      // and the band "予測（ブリーフィング）→ 気づく（モニター・クロスチェック）→ 対処（立て直す）")
      { page: 'fig:0', text: 'さきほどの TEM の図では、脅威は天気・他機・不具合など外から来るもの、エラーは自分の操作・手順・交信の誤りです。' },
      '脅威を放っておくとエラーを生み、エラーを放っておくと、高度や速度がずれる「望ましくない状態」になります。予測し、気づき、立て直して止めます。',
      // src: CADET career/tem.js (before a flying day the instructor asks for today's threat; the debrief names it and the errors)
      'これから飛ぶ日には、出発前に教官が「今日の脅威は？」と聞きます。これが予測です。飛んだ後は、その日のエラーを一緒に振り返ります。',
      'よくある間違いは、出発前に一度決めたら、もう考え直さないことです。予定へのこだわりは、そこから育ちます。',
    ],
    ask: {
      q: 'TEM の言葉で、「高度計の規正値を合わせ忘れた」は何にあたりますか？',
      opts: ['脅威（Threat）', 'エラー（Error）', '望ましくない機体の状態（UAS）'],
      ok: 1,
      why: '自分の手順の誤りはエラーです。気づかずに高度がずれていけば、それが望ましくない状態です。',
    },
  },
  'hf.attitude': {
    intro: [
      '危険な態度は、特別な人だけのものではありません。疲れや焦りで、誰の心にも顔を出します。',
    ],
    notes: [
      { page: 'tab:0', text: '表の見方です。左が態度の名前、真ん中がそのときの心の声、右がその声に返す言葉、解毒剤です。' },
      // src: PHAK FAA-H-8083-25 ch. 2, the five hazardous attitudes and their antidotes (Anti-authority "Don't tell me.";
      // Impulsivity "Do it quickly."; Invulnerability "It could happen to me."; Macho "Taking chances is foolish.")
      '反権威は「規則なんて」という声で、「チェックリストなんて面倒だ」もその一つです。規則や手順には、それぞれ理由があります。',
      '衝動は「早くやらなきゃ」という声です。ランナップを急ぎたくなったら、一度手を止めて考えます。',
      '不死身は「自分には起きない」という声です。英語の解毒剤は “It could happen to me.” です。',
      'マッチョは「見せたい」という声です。人の前で無理な着陸をしたくなったら、“Taking chances is foolish.” と言い聞かせます。',
      // src: PHAK ch. 2 (resignation: going along with unreasonable requests just to be a "nice guy"; "I can make a difference")
      'あきらめは「何をしても無駄」という声です。人に流されて断れないのも、その仲間です。自分にできることは、まだあります。',
      'よくある間違いは、「自分には危険な態度はない」と思うことです。それは「自分には起きない」と同じ形の声です。',
      '心の声に気づいたら、解毒剤を小さく声に出してみてください。言葉にすると、立ち止まるきっかけになります。',
    ],
    ask: {
      q: '友人が見ている前で、横風が強いのに「自分なら降りられる」と思いました。どの態度ですか？',
      opts: ['マッチョ', 'あきらめ', '反権威', '衝動'],
      ok: 0,
      why: 'できるところを見せたい、がマッチョです。解毒剤は「危険を冒すのは愚か」。無理ならゴーアラウンドです。',
    },
  },
  'hf.body': {
    intro: [
      '人の体は、地面の上で暮らすようにできています。空では、その感覚がうそをつくことがあります。',
    ],
    notes: [
      // src: PHAK FAA-H-8083-25 ch. 17 (in a steady turn the fluid of the semicircular canals catches up and the turn is no
      // longer felt; when it stops, a turn the other way is felt)
      '目を閉じて回転いすで回ると、やがて回っている感じが消え、止まると逆に回る気がします。耳の奥は、空でも同じ間違いをします。',
      // src: PHAK ch. 17 (vision corrects the vestibular sense; without it, the instruments)
      '地上では、目が耳の間違いを直してくれます。雲の中や暗い夜は、その目の代わりが計器です。',
      // src: the textbook's own unusual-attitude table (the nose-low spiral: power off, the wings level first, then the nose
      // up slowly); AFH FAA-H-8083-3
      '墓場のスパイラルから出るときは、パワーを絞り、引く前に翼を水平にします。機首を上げるのは、それからです。',
      '夜の離陸直後は、加速を「機首上げ」と感じやすい時間です。操縦桿を押したくなっても、姿勢指示器のピッチを見ます。',
      // src: AIM 2-1-2 and the textbook's PAPI figure (on the left of LAB RWY 36; two white and two red on the 3° path);
      // CADET world/airfield.js (the PAPI on the left side)
      'LAB の滑走路 36 にも、左側に PAPI があります。夜や見慣れない滑走路では、目の感じより、白 2 つ・赤 2 つを信じます。',
      // src: PHAK ch. 17 (the symptoms of hypoxia include euphoria)
      '低酸素のこわいところは、本人がむしろ気分よく感じることもある点です。自分の感じではなく、規則の高さと時間で酸素を使います。',
      // src: PHAK ch. 17 (CO from the heater's exhaust: headache, drowsiness; heater off, fresh air, land); the q_hf bank
      '冬にヒーターを使って頭痛や眠気が出たら、一酸化炭素を疑います。ヒーターを切り、換気口を開け、早めに着陸します。',
      'よくある間違いは、雲に入ったときに外の景色を探し続けることです。まず計器に目を戻します。',
    ],
    ask: {
      q: '雲の中で、体は「右に傾いている」と感じます。姿勢指示器は水平です。どうしますか？',
      opts: ['体の感覚に合わせて左へ傾ける', '計器を信じて水平を保ち、スキャンを続ける', '窓の外の景色を探す'],
      ok: 1,
      why: '前庭器官は、ゆっくりした傾きを感じられません。体と計器が食い違ったら、計器を信じます。',
    },
  },
  'hf.srm': {
    intro: [
      'ソロでは、隣に教官がいません。それでも、一人で使える助けはたくさんあります。',
    ],
    notes: [
      // (the MFD's map: CADET's Archer, content/dialog/day1.js)
      'SRM は、一人でもチームのように飛ぶ考え方です。管制、フライトサービスの天気の情報、チェックリスト、MFD の地図も、あなたのチームです。',
      'Remember: 緊急のときほど Aviate → Navigate → Communicate です。まず姿勢と速度、次にどこへ、最後に無線です。',
      '無線で説明しているうちに速度が落ちている、というのはよくある失敗です。話す前に、飛行機を落ち着かせます。',
      // src: Pilot/Controller Glossary SAY AGAIN, UNABLE
      'わからなければ “Say again”、できなければ “unable” と伝えます。黙っているより、ずっと安全です。',
      'チェックリストは声に出して読みます。耳でも確かめるので、抜けた項目に気づきやすくなります。',
      // src: the textbook's automation section in part 6 (what is it doing, why, what next; no answer: less automation, fly
      // by hand)
      '自動操縦のある機体では、今どのモードで飛んでいるかを、いつも表示で確かめます。わからなくなったら、切って手で飛びます。',
      // src: 14 CFR 121.542 (the sterile flight deck in the critical phases of flight: taxi, take-off, landing)
      'Sterile cockpit は、エアラインでは規則です。タキシーや離着陸の間は、運航に必要なこと以外は話しません。',
      '状況認識とは、位置・高度・燃料・天気・まわりの機体を、すぐに言える状態です。言えなければ、取り戻す合図です。',
    ],
    ask: {
      q: '単独飛行中、エンジンの音がおかしくなりました。最初にすることはどれですか？',
      opts: ['すぐ管制に連絡する', 'まず姿勢と速度を保って、飛行機を飛ばす', 'チェックリストを探して読み始める'],
      ok: 1,
      why: 'Aviate が最初です。飛行機を落ち着かせてから降りる場所を決め、それから無線です。',
    },
  },
};
