// CADET — content/lecture-notes/radio3.js : the lecturer's own explanations for the sections of FLIGHT LAB's chapter 'radio3' (format: index.js).
export default {
  'comm.pattern': {
    intro: [
      '最初の一言で、管制官はあなたが誰で、どこにいて、何をしたいのかを一度に知ります。型があれば、緊張していても口が動きます。',
    ],
    notes: [
      '電話をかけるときと同じです。『○○さんですか、こちら△△です、いま駅にいます、迎えをお願いします』。順番も同じですね。',
      'LAB なら “LAB Ground” で相手、次に自分のコールサイン、“at the west ramp” で場所、最後に “request taxi” で要求です。',
      'ATIS を聞いたら “with information Bravo” を入れます。記号を言えば、管制官は風や滑走路を繰り返さずに済みます。',
      // src: AIM 4-2-2 (think before keying the transmitter; jot it down), the textbook's chapter 6 (radio.technique)
      '送信ボタンを押す前に、言うことを頭の中で一度組み立てます。ひざ板に型を書いておくと安心です。',
      '混んでいて相手に届くか分からないときは、まず相手と自分だけを短く呼び、返事が来てから要求を言います。',
      'Class C の前では、返事に自分のコールサインが入っていたかを聞きます。“stand by” でも、コールサインがあれば確立です。',
      // src: AIM 4-2-4 (full call sign on initial contact; abbreviate only after ATC has), the textbook's comm.mistakes
      'よくある間違いは、最初の呼び出しからコールサインを省略形で言うことです。最初は必ず省略しない形で言います。',
    ],
    ask: {
      q: '“monitor” と言われて新しい周波数に変えました。次にどうしますか。',
      opts: ['すぐ自分から呼び出す', '呼び出さずに聞いて待つ', '元の周波数に戻る'],
      ok: 1,
      why: 'Monitor は『聞いて待て』です。自分から呼び出すのは Contact と言われたときです（PCG）。',
    },
  },
  'comm.readback': {
    intro: [
      '復唱は、管制官とあなたが同じ数字と同じ滑走路を思い浮かべているかを確かめる、その場の二重確認です。',
    ],
    notes: [
      'レストランで店員さんが注文を繰り返すのと同じです。繰り返して言うことで、聞きまちがいがその場で見つかります。',
      '数字は “climb and maintain” や “heading” と一緒に返します。何の数字かが分かると、取り違えに気づきやすくなります。',
      '旋回の方向も忘れずに。“turn right heading zero niner zero” なら “Right heading zero niner zero” と返します。',
      // src: the textbook's chapter 6 (radio.listen ③: write the numbers on the kneeboard, do not rely on memory)
      '数字は聞きながらひざ板に書き、書いたものを見て復唱します。記憶に頼らないのがコツです。',
      '交通情報や “Radar contact” には、復唱ではなく、見えたかどうかや自分のコールサインで応えます。',
      // src: Pilot/Controller Glossary (Roger: I have received all of your last transmission), the textbook's chapter 7 (comm.words)
      'よくある間違いは “Roger” だけで済ませることです。Roger は『受け取った』だけで、中身が合っているかは確かめられません。',
    ],
    ask: {
      q: '管制塔の “runway three six, line up and wait” への返事として正しいのはどれですか。',
      opts: ['“Roger” とコールサイン', '“Wilco” とコールサイン', '“Runway three six, line up and wait” とコールサイン', 'コールサインだけ'],
      ok: 2,
      why: 'line up and wait は必ず復唱する指示です。言われた順に返し、最後にコールサインを付けます（AIM 4-3-18・4-4-7）。',
    },
  },
  'comm.clarify': {
    intro: [
      '分からないまま動くのが、いちばん危ないことです。聞き直す言葉を持っていれば、迷っても安全なほうへ進めます。',
    ],
    notes: [
      'この表は、困ったときに使う言葉の一覧です。聞き取れない、自分宛てか分からない、道が分からない、従えない、などの場面ごとです。',
      // src: Pilot/Controller Glossary (Say again: e.g. "Say again all after ABRAM VOR"), the textbook's chapter 7 (comm.words)
      '聞き取れなければ “Say again” です。後半だけなら “Say again all after Charlie” のように、聞けた最後の言葉を言います。',
      // src: AIM 4-2-4 (similar call signs; "Verify clearance for" the full call sign), the textbook's chapter 7 (comm.callsign)
      '似たコールサインの機が同じ周波数にいると、取り違えが起きます。疑わしければ “Verify clearance for” と省略しないコールサインで確かめます。',
      '初めての空港で道が分からないときは “Request progressive taxi” です。地上管制が一区間ずつ案内してくれます。',
      // src: the textbook's chapter 7 (comm.words: Unable, with a reason or another way), chapter 5 (law.pic: say unable when unsafe)
      '“Unable” は失礼な言葉ではありません。従うと安全でなくなる指示には、理由と代わりの案を添えて使います。',
      'line up and wait のまま長く待たされたら、“holding in position” と伝えて、忘れられていないかを確かめます。',
      // src: Pilot/Controller Glossary (Stand by: neither an approval nor a denial), the textbook's chapter 7 (comm.words)
      '操縦で手がいっぱいなら “Stand by” です。これは『少し待って』で、はいでもいいえでもありません。',
      'よくある間違いは、恥ずかしくて聞き直さず、推測で復唱することです。地上なら止まって、空中なら安全を保って聞きます。',
    ],
    ask: {
      q: 'VFR で飛行中、そのまま進むと雲に入る針路を指示されました。正しい返事はどれですか。',
      opts: ['“Wilco” と言って従う', '“Roger” とだけ言う', '黙って別の針路へ向かう', '“Unable” と言い、理由を伝える'],
      ok: 3,
      why: 'VFR は雲に入れません。従えない指示には “Unable” と言い、理由と代わりの案を添えます。',
    },
  },
  'comm.mistakes': {
    intro: [
      'この表の 10 個は、無線でよく起きる間違いです。先に知っておけば、同じ穴に落ちずに済みます。',
    ],
    notes: [
      // src: the textbook's comm.pattern (AIM 4-2-3: acknowledge first, or the controller cannot tell it from a radio failure)
      '周波数を変えるときは、必ず応答してから変えます。黙って変えると、管制官には無線の故障と区別がつきません。',
      '着陸して滑走路を出ても、Tower に “contact ground” と言われるまでは、Tower の周波数にいます。',
      'コールサインの省略形を使ってよいのは、管制官が先に省略して呼んでからです。最初の交信は完全な形で言います。',
      // src: the textbook's chapter 6 (radio.equip: no one is heard while the PTT is pressed; two at once block each
      //   other; radio.technique, AIM 4-2-2: listen before transmitting)
      '二つの送信が重なるのがブロックです。話している本人は気づきにくいので、まず聞いてから話します。',
      '長すぎる呼び出しは、そのあいだ周波数をふさぎます。型どおりに短く、要らないことは言いません。',
      // src: Pilot/Controller Glossary (Roger, Affirmative, Negative), the textbook's chapter 7 (comm.words)
      '“Roger” は『受け取った』で、『はい』ではありません。はいは “Affirmative”、いいえは “Negative” です。',
      '管制塔のない空港で “active runway” と言っても、どの滑走路のことか伝わらないことがあります。番号で言います。',
      'Remember: 迷ったら型に戻ること。短く、順番どおりに、コールサインを付けて、です。',
    ],
    ask: {
      q: '管制官に、はいかいいえで答える質問をされました。『はい』のときの言葉はどれですか。',
      opts: ['Roger', 'Affirmative', 'Wilco', 'Copy that'],
      ok: 1,
      // src: the textbook's chapter 7 (comm.words: Roger, Wilco, Affirmative; no slang such as "Copy that", AIM 4-2-1)
      why: 'Roger は『受け取った』、Wilco は『従う』です。はいは Affirmative で答えます。“Copy that” のような俗語は使いません。',
    },
  },
};
