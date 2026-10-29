// CADET — content/lecture-notes/radio4.js : the lecturer's own explanations for the sections of FLIGHT LAB's chapter 'radio4' (format: index.js).
export default {
  'comm.atis': {
    intro: [
      'ATIS は、出発の前にも帰りの前にも聞く『空港のいま』の放送です。ここで書いた数字が、あとの交信の土台になります。',
    ],
    notes: [
      '録音を繰り返し流しているので、一度で全部書けなくても大丈夫です。次の繰り返しで空いた欄を埋めます。',
      'ひざ板の欄は放送の順に並べておきます。記号、風、視程と雲、温度と露点、高度計、滑走路の順です。',
      // src: the textbook's radio4 example (LAB's elevation 55 ft, fictional) and CADET's own radio (atc.js)
      '高度計規正値は聞いたらすぐ合わせます。地上なら、表示が LAB の標高 55 ft に近いかを確かめます。',
      // src: the textbook's wx.metar (the wind of ATIS and ATC is magnetic; of METAR and TAF, true)
      'ATIS の風は磁方位なので、滑走路の番号とそのまま比べられます。340 度の風なら、滑走路 36 にほぼ向かい風です。',
      // src: the textbook's wx.atm (temperature and dew point within 2–3 ℃: suspect fog and low cloud)
      'この例は気温 31℃、露点 22℃で、差は 9℃です。差が 2〜3℃まで近づく日は、霧や低い雲に気をつけます。',
      '時刻は UTC、つまり Zulu です。“One four five three Zulu” は 14 時 53 分 UTC で、現地の時刻ではありません。',
      'よくある間違いは “have numbers” を ATIS を聞いた意味で使うことです。最初の交信では記号を言います。',
    ],
    ask: {
      q: 'ATIS を聞いたことを、最初の交信で伝える正しい言い方はどれですか。',
      opts: ['“have numbers”', '“ATIS received”', '“with information Bravo”', '“Roger ATIS”'],
      ok: 2,
      why: '記号を言うのが決まりです。“have numbers” は風・滑走路・高度計だけを聞いた意味で、ATIS を聞いたことにはなりません（AIM 4-1-13）。',
    },
  },
  'comm.dep': {
    intro: [
      'タキシーの指示は、滑走路の手前までの道順です。どこまで行ってよいかを正しく知ることが、地上の安全の中心です。',
    ],
    notes: [
      'Ground の返事は長いですが、中身は 3 つです。道順と手前で止まる所、出発管制の周波数、トランスポンダーのコードです。',
      // src: the textbook's radio.equip (the radio's active and standby frequencies)
      '119.75 は無線機の予備の側に、4271 はトランスポンダーに入れます。動き出す前に入れておくと、あとで慌てません。',
      '周波数とコードは数字なので、道順と一緒に、言われた順に復唱します。',
      'この例では止まる所が 2 つあります。まず誘導路 C の手前、“continue” と言われたら次は滑走路 36 の手前です。',
      // src: AIM 2-3-5 (runway holding position markings: two solid and two dashed yellow lines, the solid lines on the
      //   side where the aircraft holds)
      '停止線は黄色の 2 本の実線と 2 本の破線です。実線の側が止まる側で、許可なしに越えてはいけません。',
      '“taxi” は通ってよい道順で、離陸の許可とはまったく別のものです。',
      'ランナップは決められた場所で行い、終わってから滑走路の手前で Tower に変えます。それまでは Ground を聞いています。',
      // src: the textbook's ground.start (on the ground, when in doubt, stop and ask ATC)
      '道順に自信がなければ、止まって Ground に聞きます。推測で進まないことが、地上の安全の基本です。',
    ],
    ask: {
      q: 'Ground に “departure frequency one one niner point seven five, squawk four two seven one” と言われました。復唱に入れるのは？',
      opts: ['周波数だけ', 'コードだけ', 'どちらも入れずに Roger', '周波数とコードの両方'],
      ok: 3,
      why: '周波数とコードは数字なので、必ず復唱します。道順と合わせて言われた順に返し、最後にコールサインです。',
    },
  },
  'comm.tower': {
    intro: [
      '管制塔の言葉で、いちばん聞きまちがえてはいけないのが line up and wait と cleared for takeoff の違いです。',
    ],
    notes: [
      '“ready for departure” は、ランナップもチェックリストも終えて、すぐ出られるときに言います。',
      'line up and wait は、徒競走の『位置について』です。『ドン』にあたるのが cleared for takeoff です。',
      '滑走路に入ったら、センターラインに合わせて止まります。待つ間も、最終進入の機を目と耳で追い続けます。',
      'LUAW のまま長く待たされ、待つ理由もなくなったようなら、確かめます。忘れられていることもあるからです。',
      '離陸許可の復唱には、滑走路の番号と “cleared for takeoff” を必ず入れます。追加の指示があればそれも返します。',
      // src: Pilot/Controller Glossary (runway heading: the magnetic direction of the runway centerline extended)
      '“Fly runway heading” は、滑走路の中心線の延長と同じ機首方位を保つことです。滑走路 36 ならおよそ北です。',
      '“contact departure” だけで周波数が言われないこともあります。地上でもらった 119.75 を使い、分からなければ聞きます。',
      // src: the textbook's comm.mistakes (AIM 5-2-5: LUAW read back right, then a takeoff without a clearance)
      'よくある間違いは、line up and wait を聞いた勢いで離陸してしまうことです。cleared for takeoff の言葉を待ちます。',
    ],
    ask: {
      q: '離陸許可の復唱に、必ず入れるものはどれですか。',
      opts: ['風の向きと強さ', '滑走路の番号', '最終進入の機の機種', 'ATIS の記号'],
      ok: 1,
      why: '離陸許可の復唱には必ず滑走路の番号を入れます。平行滑走路なら L・R・C までです（AIM 4-4-7）。',
    },
  },
  'comm.radar': {
    intro: [
      '出発管制とのやりとりでは、レーダーという『もう一つの目』を借りられます。ただし、見張るのはあくまで自分の目です。',
    ],
    notes: [
      // src: Pilot/Controller Glossary (radar contact: the aircraft is identified on the controller's display)
      '“radar contact” は、管制官がレーダーの画面であなたの機を識別した、という意味です。',
      // src: Pilot/Controller Glossary (resume own navigation); the textbook's exchange (the service ends with
      //   "radar service terminated")
      'レーダー業務の終わりは “radar service terminated” です。そこからは、自分で見張りと航法をします。',
      '交通情報は時計の文字盤で考えます。機首が 12 時、右の翼が 3 時、尾が 6 時、左の翼が 9 時です。',
      // src: AIM 4-1-15 (the controller sees only the aircraft's track on the display)
      '管制官の画面に見えるのは、機首の向きではなく進む方向だけです。言われた時計の方位が少しずれるのは、そのためです。',
      // src: the textbook's comm.readback (Traffic in sight, Looking, Negative contact)
      '見えたら “Traffic in sight”、探している間は “Looking”、見えないままなら “Negative contact” です。',
      '見えていないのに “Traffic in sight” と言ってはいけません。管制官は、それを前提に次の指示を考えます。',
      // src: AIM 4-1-15 (radar limits, traffic volume and workload may keep the controller from calling all traffic)
      'レーダー業務を受けていても、すべての機を知らせてもらえるとは限りません。外を見る時間を減らさないでください。',
      '別れるときは、黙って離れずに管制官に伝えます。“squawk VFR” と言われたらコードを 1200 にして、周波数を変えます。',
    ],
    ask: {
      q: '“traffic, one o\'clock, four miles, westbound” と言われました。どのあたりを探しますか。',
      opts: ['機首の少し左', '機首の少し右', '右の翼の真横', '真後ろ'],
      ok: 1,
      why: '機首が 12 時、右の翼が 3 時です。1 時は、機首から少し右になります。',
    },
  },
  'comm.arrive': {
    intro: [
      '帰りの交信は、出発のほぼ逆の順番です。ATIS、進入管制、管制塔、地上管制と、一つずつ手渡されていきます。',
    ],
    notes: [
      '呼ぶ前に LAB の ATIS を聞いて、高度計を合わせておきます。そうすれば最初の呼び出しで “with information Charlie” と言えます。',
      // src: AIM 4-1-20 (activate the IDENT feature only when ATC asks for it); Pilot/Controller Glossary (ident)
      '“squawk zero four two five and ident” なら、コードを入れてから IDENT ボタンを押します。IDENT は言われたときだけ押します。',
      // src: the textbook's ops.pattern (the standard pattern is to the left, the runway on the left)
      '“Enter left downwind runway three six” は、滑走路を左に見ながら回る場周の、ダウンウインドに入れという指示です。',
      '“report midfield left downwind” なら、ダウンウインドを飛んで滑走路の真ん中の真横に来たところで報告します。',
      '“number two, follow” は着陸の順番です。前の機を見つけて後ろに付き、見えたら “traffic in sight” と伝えます。',
      // src: the textbook's comm.numbers (ground point seven: the 121 left out, AIM 4-3-14); LAB Ground 121.7 (fictional)
      '“Ground point seven” は地上管制の周波数を短く言ったもので、LAB では 121.7 です。',
      'Ground を呼ぶときは、“clear of runway three six at Charlie” のように、滑走路を出たことと場所を伝えます。',
    ],
    ask: {
      q: '進入管制から “squawk zero four two five and ident” と言われました。することはどれですか。',
      opts: ['コードを 0425 にするだけ', 'IDENT を押すだけ', 'コードを 0425 にして IDENT を押す', 'コードを 7600 にする'],
      ok: 2,
      // src: Pilot/Controller Glossary (squawk: set the code; ident: engage the IDENT feature)
      why: 'squawk はコードを合わせる、ident は IDENT ボタンを押す、です。復唱してから、両方を行います。',
    },
  },
  'comm.option': {
    intro: [
      '場周経路の練習は、短い時間に離着陸を何度も繰り返す訓練です。交信も短く、決まった型で回していきます。',
    ],
    notes: [
      '“request closed traffic” は、空港を離れずに場周を回り、離着陸の練習を続けたいという要求です。',
      '“left closed traffic approved” なら、滑走路を左に見て回ります。ダウンウインドの中央で報告せよ、という指示も一緒です。',
      'option は、ダウンウインドに入ったところで “request the option” と要求します。',
      '“cleared for the option” なら、タッチアンドゴー、ローアプローチ、ストップアンドゴー、フルストップのどれでも選べます。',
      '教官はこの許可で、あなたがその場で何を選ぶか、その判断を見ています。',
      '滑走路で止まる、あるいは遅れるときは、すぐに Tower へ伝えます。後ろには次の機が続いているからです。',
      '“go around” と言われたら、返事より先に全開・姿勢・形態です。先に話そうとして操縦が遅れるのがよくある間違いです。',
      '落ち着いたら “Going around” と応えます。ほかに指示がなければ、VFR は滑走路の上を上昇して場周に戻ります。',
    ],
    ask: {
      q: '最終進入で “go around” と言われました。最初にすることはどれですか。',
      opts: ['パワーを全開にして上昇の姿勢にする', '“Going around” と返事をする', '理由を Tower に聞く', 'フラップを全部一度に上げる'],
      ok: 0,
      // src: the textbook's radio.technique (Aviate, Navigate, Communicate)
      why: 'Aviate が先です。全開・姿勢・形態を整えてから “Going around” と応えます。理由を聞くのは落ち着いてからです。',
    },
  },
};
