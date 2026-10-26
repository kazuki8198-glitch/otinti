// CADET — content/lecture-notes/radio1.js : the lecturer's own explanations for the sections of FLIGHT LAB's chapter 'radio1' (format: index.js).
export default {
  'radio.why': {
    intro: [
      '無線は、管制官とあなたが同じ絵を持つための道具です。まず、誰と話すのかを整理しましょう。',
    ],
    notes: [
      '出発では、ATIS を聞いてから Ground、Tower の順に話します。離陸後、Tower に言われたら Departure です。',
      // src: the textbook's chapter 9 (comm.arrive: ATIS, Approach, Tower, Ground after the runway is cleared)
      '帰りは ATIS を聞いてから Tower、滑走路を出たら Ground です。Tower の前に Approach と話すこともあります。',
      'ATIS は録音を繰り返し流す放送で、話しかけることはできません。Bravo などの記号を書き留めておきます。',
      'LAB の地上管制なら “LAB Ground”、管制塔なら “LAB Tower” です。',
      // src: AIM 4-2-6 (ground station call signs: a flight service station is "Radio", e.g. "Chicago Radio")
      'Flight Service は “Orlando Radio” のように “Radio” を付けて呼びます。天気や飛行計画を扱う局です。',
      // src: AIM 4-3-14, 4-3-21 (after landing, stay on the tower frequency until told to contact ground), as the
      // chapter's own quiz and the textbook's comm.mistakes
      'よくある間違いは、滑走路を出てすぐ自分で Ground に変えることです。Tower の “contact ground” を待ちます。',
      '「短く」と「伝わる」がぶつかったら、伝わるほうを取ります。言葉を足すのは失敗ではありません。',
    ],
    ask: {
      q: '滑走路での離陸・着陸の許可を出すのは、どの局ですか。',
      opts: ['Ground', 'Tower', 'ATIS', 'Center'],
      ok: 1,
      why: '滑走路と場周は Tower、誘導路を動くのは Ground です。ATIS は録音放送です。',
    },
  },
  'radio.equip': {
    intro: [
      'どんなに上手に話しても、声が電波に乗らなければ伝わりません。道具の扱いは交信の土台です。',
    ],
    notes: [
      '無線はトランシーバーと同じしくみです。電話と違って、話せるのは一度に 1 人だけです。',
      'だから、ほかの機と重なってブロックしても、自分では気づかないことがあります。',
      'PTT を押してすぐ話すと、“LAB Tower” の頭が切れがちです。押して、一呼吸おいてから話します。',
      // src: LAB Ground 121.7 and LAB Tower 118.3 (fictional): the textbook's chapter 9 (comm.arrive) and CADET's own
      // radio (content/dialog/atc.js FREQ)
      '次の周波数は予備に入れておきます。LAB なら Ground 121.7 と話しながら、Tower 118.3 を予備に置けます。',
      'COM1 と COM2 を使い分けるときは、MIC の選択と受信のボタンを指でさして確かめます。よくある失敗はここです。',
      // src: AIM 4-2-2 (be alert to the lack of sounds in the receiver: a microphone stuck in the transmit position)
      '急に周波数が静かになったら、自分のマイクが押しっぱなしになっていないかも疑います。',
      'VHF は灯台の光に似ています。高い所にあるほど遠くまで届き、山の陰には届きません。',
    ],
    ask: {
      q: 'COM2 に Tower の周波数を合わせました。話す前に確かめることは？',
      opts: ['NAV1 の音量', 'トランスポンダーのコード', 'MIC が COM2 になっているか'],
      ok: 2,
      why: '送信するのは MIC で選んだ無線機です。MIC が COM1 のままなら、COM1 の周波数で話してしまいます。',
    },
  },
  'radio.technique': {
    intro: [
      '無線の上手な人は、話す前によく聞いている人です。',
    ],
    notes: [
      '会議に途中から入ったら、まず話の流れを聞きますね。周波数を変えた直後も同じです。',
      // src: AIM 4-2-3 (who you are calling, who you are, where you are, what you want), the textbook's chapter 8
      '呼ぶ前に、相手・自分・場所・要求の順で、頭の中で一度言ってみます。型は第 8 章でくわしく見ます。',
      '長い内容は、ひざ板に書いてから PTT を押します。書いたものを読めば、言葉に詰まりません。',
      'Remember: 操縦が一番、無線は三番です。呼ばれても、まず高度と速度を見ます。',
      '忙しいときは “Stand by” と言ってかまいません。落ち着いてから答えるほうが安全です。',
      // src: the textbook's chapter 8 (comm.pattern: "LAB Ground, (call sign), student pilot, …")
      'LAB Ground への最初の交信なら、コールサインのすぐ後に “student pilot” と入れます。',
      '相手の局が Ground、Tower、Departure と変わるたびに、その局への最初の交信で言います。',
      'student pilot と言うのをためらう人がいますが、言えば管制官はゆっくり話したり、丁寧に指示したりしてくれます。',
    ],
    ask: {
      q: '上昇中で忙しいときに、管制官から呼ばれました。正しい考え方は？',
      opts: ['何をおいても、すぐに全部答える', '操縦を保ち、必要なら “Stand by” と言う', '聞こえなかったことにする'],
      ok: 1,
      why: 'Aviate → Navigate → Communicate。操縦が最優先です。Stand by は「少し待って」の意味です。',
    },
  },
  'radio.listen': {
    intro: [
      '英語に自信がなくても大丈夫です。管制の英語は、決まった順番で決まった言葉が来ます。',
    ],
    notes: [
      // src: CADET's own call sign (content/dialog/atc.js CALL: N738SY, fictional); AIM 4-2-4 (type + the last three
      // characters once the controller abbreviates)
      '① 自分のコールサインを耳の目覚ましにします。省略形の Archer Eight Sierra Yankee も聞き逃さないように。',
      '② は駅のアナウンスと同じです。何番線・行き先・時刻が来るとわかっていれば、聞き取れますね。',
      // src: LAB Ground's taxi instruction in the textbook's chapter 9 (comm.dep) and CADET's own radio (atc.js)
      'LAB でタキシーを頼めば、“runway three six, taxi via Alpha, hold short of …” の形で来ると予想できます。',
      '③ 数字は聞きながら書きます。覚えてから書こうとすると、次の数字で前の数字が消えます。',
      '④ の hold short と hold position は、どちらも止まれですが、止まる場所が違います。言われた場所の手前か、今いる所かです。',
      '⑤ Remember: 推測では動きません。“Say again” は恥ずかしい言葉ではなく、安全のための言葉です。',
      // src: the textbook's own tip ⑥ (shadowing; saying a whole flight's calls in a chair), its row not shown here
      '声に出す練習が効きます。交信の英語を聞きながら一緒に言い、椅子に座って 1 回の飛行の交信を通して言ってみます。',
      'よくある間違いは、全部を聞き取ろうとして、自分のコールサインを聞き逃すことです。',
    ],
    ask: {
      q: '指示がよく聞き取れませんでした。正しい対応は？',
      opts: ['聞こえた部分から推測して動く', '“Roger” と答えておく', '“Say again” と聞き直す', '黙って待つ'],
      ok: 2,
      why: '推測では動きません。速すぎるときは “Say again, slowly” と添えてかまいません。',
    },
  },
};
