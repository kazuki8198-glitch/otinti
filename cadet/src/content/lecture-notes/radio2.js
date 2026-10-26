// CADET — content/lecture-notes/radio2.js : the lecturer's own explanations for the sections of FLIGHT LAB's chapter 'radio2' (format: index.js).
export default {
  'comm.basic': {
    intro: [
      '電話で名前のつづりを伝えるとき、「Apple の A」のように言うことがありますね。無線では、その言い方が世界共通で決まっています。',
    ],
    notes: [
      'B と D と E、M と N のように、雑音の中では聞き分けにくい文字がたくさんあります。だから単語で言います。',
      '書くときのつづりは Alfa と Juliett です。ふだんの英語の Alpha、Juliet とは少し違います。',
      // src: AIM 4-1-13 (on initial contact, say the ATIS code received), the textbook's chapter 8 (comm.pattern)
      'ATIS も “information Bravo” のように文字で呼ばれます。最初の交信では “with information Bravo” と伝えます。',
      // src: CADET's own call sign (content/dialog/atc.js CALL: N738SY, fictional); AIM 4-2-4 (the N dropped after the type)
      'たとえば N738SY は “Archer Seven Three Eight Sierra Yankee” です。S も Y も単語で言います。',
      // src: AIM 4-2-8 (all numbers other than altitudes and airways are said digit by digit)
      'よくある間違いは、738 を “seven thirty-eight” とまとめて読むことです。数字も 1 桁ずつです。',
      { page: 'tab:1', text: 'tree・fife・niner は少し変わった音ですが、雑音の中でまちがえにくくするためです。表のとおりに言いましょう。' },
      '10 は ten ではなく one zero です。大きな例外は、次の節の高度です。',
    ],
    ask: {
      q: 'ATIS が “information Delta” でした。これはどの文字ですか。',
      opts: ['「B」', '「D」', '「E」', '「T」'],
      ok: 1,
      why: 'Delta は D です。最初の交信では “with information Delta” と伝えます。',
    },
  },
  'comm.numbers': {
    intro: [
      '数字の言い方をまちがえると、高度や針路がそのまま変わってしまいます。ここは表ごと覚えましょう。',
    ],
    notes: [
      'よくある間違いは、まとめて読むことです。120 kt は “one twenty” ではなく “one two zero knots” です。',
      '針路と風向は必ず 3 桁で、無線ではどちらも磁方位です。090 は “heading zero niner zero” と言います。',
      '風向は、風が吹いてくる方向です。“wind two two zero” なら、南西のほうから吹いてくる風です。',
      // src: LAB Tower 118.3 (fictional): the textbook's chapter 9 (comm.arrive) and CADET's own radio (atc.js FREQ)
      '周波数の小数点は “point” です。LAB Tower の 118.3 は “one one eight point three” です。',
      '121 MHz 台の地上管制なら、管制官が 121 を省いて “ground point seven” と言うことがあります。',
      '高度計規正値の 29.92 は “two niner niner two”、コードの 4271 は “four two seven one” です。',
      // src: AIM 4-2-12 (UTC for all operations; "Zulu" may be used to denote UTC; EDT: add 4 hours)
      '時刻は UTC で、Zulu はそのしるしです。フロリダの夏時間なら、現地の時刻に 4 時間足すと UTC です。',
      '時計の方位は機首が 12 時です。“two o\'clock” と言われたら、右の斜め前を探します。',
    ],
    ask: {
      q: '管制官が “contact ground point seven” と言いました。合わせる周波数は？',
      opts: ['118.7', '121.7', '127.7'],
      ok: 1,
      why: '121 MHz 台の地上管制は 121 を省くことがあります。point seven は 121.7 です。',
    },
  },
  'comm.callsign': {
    intro: [
      'コールサインは、無線の上の名札です。名札を取り違えると、ほかの機への指示を自分のものにしてしまいます。',
    ],
    notes: [
      // src: CADET's own call sign (content/dialog/atc.js CALL: N738SY, "Archer Eight Sierra Yankee", fictional)
      'N738SY なら、最初は “Archer Seven Three Eight Sierra Yankee” です。機種名を言うので、先頭の N は言いません。',
      // src: AIM 4-2-4 (abbreviated: the type and the last three characters of the registration, e.g. Cessna 345)
      '738SY は数字と文字が 5 つなので、省略すると最後の 3 つ、“Archer Eight Sierra Yankee” になります。',
      '管制官がこの省略形で呼んできたら、そこから先はあなたも同じ省略を使ってかまいません。',
      '自分から先に省略するのは、初対面の人をいきなりあだ名で呼ぶようなものです。',
      '同じ周波数に似たコールサインがいるとわかったら、省略せず完全な形で言います。',
      '教室に同じ名字の人が 2 人いたら、下の名前まで呼びますね。それと同じです。',
      'よくある間違いは、自分宛てだと思い込んで動くことです。疑わしければ、聞いて確かめます。',
      'そのときは “Verify clearance for Archer Seven Three Eight Sierra Yankee” と言います。',
    ],
    ask: {
      q: '初めて LAB Ground を呼びます。正しいコールサインは？',
      opts: ['Archer Eight Sierra Yankee', 'Archer Seven Three Eight Sierra Yankee', 'Eight Sierra Yankee'],
      ok: 1,
      why: '最初の交信では省略しません。省略は、管制官が先にしてからです。',
    },
  },
  'comm.words': {
    intro: [
      '無線の言葉は、意味が一つに決まっています。ふだんの英語の感覚で使うと危ないものがあります。',
    ],
    notes: [
      'Roger は宅配便の受け取りのサインのようなものです。届いたという意味だけで、中身に賛成したわけではありません。',
      // src: AIM 5-2-5 (line up and wait is not a takeoff clearance)
      'Line up and wait は滑走路に入って待つだけです。離陸は “cleared for takeoff” を聞いてからです。',
      'Stand by は許可でも不許可でもありません。答えが来るまで待ち、長すぎたらもう一度呼んでかまいません。',
      'Monitor と言われたら、その周波数を聞いて待ちます。Contact と違い、自分からは呼びません。',
      // src: AIM 4-3-18 (read back all runway hold short instructions), the textbook's chapter 8 (comm.mistakes)
      'Hold short の指示は、“Hold short of runway three six” のように滑走路名まで必ず復唱します。',
      '“cleared” は離陸や着陸などの許可の言葉です。タキシーの指示には使われません。',
      // src: Pilot/Controller Glossary (Immediately: compliance required to avoid an imminent situation)
      'Immediately は、危険を避けるために今すぐ動いてほしいときの言葉です。聞いたら、まず動きます。',
      '従えない指示には “Unable” と言い、雲などの理由を添えます。無理に従おうとするほうが危険です。',
    ],
    ask: {
      q: 'Ground に “Go ahead” と言われました。意味は？',
      opts: ['どうぞ、話してください', '走り出してよい', '周波数を変えよ', 'その場で待て'],
      ok: 0,
      why: 'Go ahead は「どうぞ話して」だけです。動いてよいという意味ではありません。',
    },
  },
};
