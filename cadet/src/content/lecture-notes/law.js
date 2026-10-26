// CADET — content/lecture-notes/law.js : the lecturer's own explanations for the sections of FLIGHT LAB's chapter 'law' (format: index.js).
export default {
  'law.pic': {
    intro: [
      // src: 14 CFR 61.51(e)(4) (a student pilot alone in the aircraft logs pilot-in-command time)
      '規則の章は、機長の責任から始まります。ソロの日からは、この機長があなた自身です。',
    ],
    notes: [
      '機長は、船の船長と同じだと思ってください。その飛行機の上で、最後に決める人はひとりです。',
      // src: AIM 4-4-1 (a clearance does not relieve the pilot in command of responsibility); 14 CFR 91.3(a)
      '決める権限があるので、結果の責任も機長にあります。「管制がそう言ったから」は、機長の言い訳になりません。',
      // src: 14 CFR 91.123(c) (a pilot in command who deviates from an ATC clearance or instruction in an emergency notifies
      // ATC as soon as possible)
      '緊急で管制の指示から外れたときは、落ち着いてから、できるだけ早く管制に伝えます。',
      // src: 14 CFR 91.103(b) (runway lengths and takeoff and landing distances, for any flight); the textbook's perf.tol
      '場周を回るだけの短い飛行でも、要る距離は省けません。暑い日や重い日は、第 3 章の表のとおり距離が延びます。',
      // src: 14 CFR 91.7(b) (discontinue the flight when unairworthy mechanical, electrical or structural conditions occur)
      '飛行中に機械・電気・構造の不具合で飛べる状態でなくなったら、その飛行はやめます。判断するのは機長です。',
      '機内の書類は ARROW で確かめます。無線局免許は国外へ飛ぶときだけ要るので、ふだんの訓練で見るのは残りの 4 つです。',
      'よくある間違いは、準備を「行けるかどうか」で終えることです。行けなかったときにどこへ向かうかまで決めて、準備完了です。',
    ],
    // src: Pilot/Controller Glossary UNABLE; 14 CFR 91.123 (no deviation from a clearance or an instruction without telling
    // ATC, except in an emergency); AIM 4-4-1 (ask for an amended clearance when one would break a rule)
    ask: {
      q: '管制に言われた高度へ上がると、雲に入ってしまいます。VFR のあなたはどうしますか？',
      opts: ['指示なので、そのまま上がる', '“unable” と伝え、雲を避ける案を相談する', '何も言わずに、雲の下で水平にする'],
      ok: 1,
      why: '最後に決めるのは機長です。できない指示には “unable” と伝えます。黙って変えると、管制はあなたの動きを読めません。',
    },
  },
  'law.vfr': {
    intro: [
      'この節の表は、VFR で飛べる天気かどうかの線引きです。毎朝の天気の判断は、ここから始まります。',
    ],
    notes: [
      // src: 14 CFR 1.1 (flight visibility: the average forward horizontal distance from the cockpit of an aircraft in flight)
      { page: 'tab:0', text: '表は、左の列が空域、真ん中が飛行視程、つまり操縦席から前に見える距離です。右の列が、雲からどれだけ離れるかです。' },
      'Class C・D と、10,000 ft MSL 未満の Class E は同じで、3 SM、雲の下 500 ft・上 1,000 ft・横 2,000 ft です。これが 3-152 です。',
      // src: 14 CFR 91.117(a) (250 KIAS below 10,000 ft MSL: the textbook's law.rules); the usual teaching of why the minima grow there
      '10,000 ft MSL 以上の Class E は、5 SM、雲の上下 1,000 ft、横 1 SM と厳しくなります。250 kt の制限がなく、速い機体と出会う高さだから、と覚えてください。',
      // src: the usual teaching of the cloud clearances: time to see and avoid an IFR aircraft coming out of the cloud (91.113(b))
      '雲から離れるのは、雲の中から計器飛行の機体が出てくるかもしれないからです。距離があれば、見て避ける時間が残ります。',
      // src: AIM 3-2-3 (ATC separates VFR aircraft in Class B airspace)
      'Class B の雲からの距離が「雲に入らない」だけなのは、管制が VFR の機体どうしの間隔もとっているからです。',
      '3-152 の空域では、雲を見えない箱で包んだと考えてください。下へ 500 ft、上へ 1,000 ft、横へ 2,000 ft の箱で、その箱にも入りません。',
      // src: CADET's ATIS on a low-cloud day (content/dialog/atc.js); 14 CFR 1.1 (ceiling: the lowest broken or overcast
      // layer, above the surface); 91.155(c)
      'ATIS で “Ceiling eight hundred broken” と聞いたら、雲高は地上 800 ft です。1,000 ft に足りない日だ、とすぐに気づけるようにします。',
      // src: 14 CFR 91.155(d) (ground visibility when it is reported, otherwise flight visibility; take-off, landing and the pattern)
      '地上視程は、空港で報告される値です。地表区域で離着陸や場周経路に入るときの 3 SM は、報告があれば地上視程で決まります。',
    ],
    ask: {
      q: 'Class D の空域の中で、一面の雲の底が地上 2,300 ft です。雲の下を VFR で飛ぶなら、上がれるのは地上何 ft までですか？',
      opts: ['雲の底のすぐ下まで', '1,800 ft まで', '1,300 ft まで'],
      ok: 1,
      why: 'Class D では雲の下に 500 ft を空けます。2,300 − 500 で、1,800 ft までです。',
    },
  },
  'law.airspace': {
    intro: [
      '空域は、空に引かれた見えない境界線です。どこに入るのに何が要るか、飛ぶ前に頭に入れておきます。',
    ],
    notes: [
      // (the airspace figure as drawn: Class A band on top, Class B's steps in the middle, Class C on the right with
      // "5 NM / 10 NM", the dashed Class D on the left, the labels of E and G)
      { page: 'fig:0', text: 'さきほどの図は、空を横から切った断面です。下が地面で、上へ行くほど高く、色ごとに空域が分かれています。' },
      'いちばん上の Class A は 18,000 ft MSL から上で、計器飛行だけです。真ん中の段々が大空港の Class B で、上ほど広がります。',
      '右の Class C は中くらいの空港で、半径 5 NM のコアと 10 NM の棚があります。左の小さな Class D は、管制塔のある小さめの空港です。',
      '図の下のほうの E と G は、そのほかの空です。広い Class E の下、地面に近い所に Class G があります。',
      '入り方は建物にたとえられます。Class C・D は、受付で名前を呼ばれたら入れます。Class B は、入館証を受け取るまで入れません。',
      // src: AIM 3-2-4 / 3-2-5 (answered with the call sign = established; "Aircraft calling ... tower, standby" = not);
      // LAB Tower and the call sign are CADET's own fictional ones (content/dialog/atc.js)
      '管制塔を呼んで “Archer Seven Three Eight Sierra Yankee, standby.” なら確立です。“Aircraft calling LAB Tower, standby.” では入れません。',
      // src: AIM 3-2-4 (the controller may tell the pilot to remain outside until the services can be given)
      '“remain outside” と言われたら、交信は確立していても、空域の外で待ちます。',
      // src: AIM 3-2-3 and 14 CFR 91.131(a) (an ATC clearance before entering Class B); Pilot/Controller Glossary RADAR
      // CONTACT (identification and services, not a clearance)
      'よくある間違いは、Class B で自分のコールサインを呼ばれただけで入ることです。“radar contact” も許可ではありません。',
    ],
    ask: {
      q: 'Class B の手前で管制を呼ぶと、自分のコールサインで “radar contact” と返ってきました。入れますか？',
      opts: ['入れる。コールサインで呼ばれたから', 'まだ入れない。“cleared into the Class Bravo” が要る', '入れる。レーダーで見えているから'],
      ok: 1,
      why: 'コールサインの応答で入れるのは Class C・D です。Class B は、はっきりした許可を聞くまで外で待ちます。',
    },
  },
  'law.rules': {
    intro: [
      'この節の表は、規則の早見表です。数字が多いので、ひとつずつ「なぜ」をつけて覚えましょう。',
    ],
    notes: [
      // src: the textbook's aero.vn (the Archer's Vne 154 kt)
      '91.117 の速度は、低い所や空港の近くで速すぎないための規則です。Archer の赤線 154 kt は、どの制限よりも遅い速度です。',
      // src: 14 CFR 91.119(a) (an emergency landing without undue hazard to persons or property on the surface)
      '最低安全高度の第一は、エンジンが止まっても、地上の人や物を危険にさらさずに降りられる高さです。いつも「今止まったらどこに降りるか」を考えます。',
      // src: 14 CFR 91.119(b)(c) (congested areas and open-air assemblies; over open water or sparsely populated areas)
      '町や人の集まりの上は、半径 2,000 ft 以内でいちばん高い障害物より 1,000 ft 上です。水の上や人の少ない所でも、人・船・車・建物から 500 ft 離れます。',
      // src: 14 CFR 91.113(d) (balloon; glider; (d)(3) an aircraft towing or refueling other aircraft has the right-of-way
      // over all other engine-driven aircraft, an airship among them); the less manoeuvrable first is the usual way it is taught
      '種類の違う機体は、よけにくい順に優先です。曳航・給油中の機は、つながった相手がいて急には動けないので、飛行船よりも先になります。',
      // src: 14 CFR 91.113(d) (converging: the aircraft to the other's right); 道路交通法 36 条 (Japan's roads: the car
      // from the left first at an uncontrolled crossing), given only as the contrast
      '同じ種類が交わるときは、右側の機が優先です。相手が自分の右に見えたら、よけるのは自分です。日本の信号のない交差点の「左方優先」とは逆です。',
      // src: 14 CFR 91.113(g) (the lower aircraft, which may not cut in front of another on final approach)
      '着陸のために降りてくる機体どうしでは、低い機体が優先です。ただし、それを利用して最終進入中の機の前に割り込んではいけません。',
      // src: 14 CFR 91.151(a) (fuel to the first point of intended landing and then 30 / 45 minutes at normal cruise)
      '燃料の予備、昼 30 分・夜 45 分は、最初の着陸予定地に着いたときに残っているはずの量です。計画の中で使ってよい燃料ではありません。',
      '学生操縦士は乗客を乗せられません。友だちに「乗せて」と頼まれても、今は断るのが規則です。',
    ],
    // src: 14 CFR 91.113(b) (the one giving way does not pass over, under or ahead unless well clear), (d)
    ask: {
      q: '同じ種類の飛行機が、同じ高さで、自分の右前から近づいてきます。進路は交わります。どうしますか？',
      opts: ['相手が優先。自分がよける', '自分が優先。そのまま進む', '速いほうがよける'],
      ok: 0,
      why: '交わるときは、右側の機が優先です。よけるときは、十分離れていない限り、相手の前を横切りません。優先権のある側にも、見て避ける義務があります。',
    },
  },
  'law.special': {
    intro: [
      '空には、入れない所と、入る前に確かめる所があります。知らずに入ると、重大な問題になります。',
    ],
    notes: [
      // src: AIM 3-4-2 (prohibited: security or other reasons of national welfare), 3-4-3 (restricted: often invisible
      // hazards such as artillery firing)
      'Prohibited は、国の安全などの理由で飛行が禁止された所です。Restricted は、射撃のような目に見えない危険がある所です。',
      // src: AIM 3-4-3 (often active only at times of use; penetration without authorization from the using or controlling
      // agency may be extremely hazardous)
      'Restricted は、使われていない時間なら入れることもあります。運用中かわからなければ、入らずに確かめます。',
      // src: AIM 3-4-5 (MOA: contact the controlling agency before entering an active one), 3-4-6 (alert areas: a high
      // volume of pilot training)
      'MOA は軍の訓練空域、Alert Area は訓練機の多い空域です。どちらも入れますが、MOA に入る前は管制に情報を求めます。',
      // src: 14 CFR 99.1, 99.11 (ADIZ: national security; a flight plan for flights into, within or across it)
      'ADIZ は国の守りのための空域で、国境や海岸沿いにあります。入る・中を飛ぶ・横切る飛行には、飛行計画などの手続きが要ります。',
      // src: AIM 3-5-3 / 14 CFR 91.137–91.145 (TFRs issued by NOTAM); the q_law bank (TFRs are not on the chart)
      'TFR の多くは、決まった日時だけの制限なので、航空図には載っていません。NOTAM で確かめます。',
      '災害や大きな催し、ロケットの打ち上げなど、前の日にはなかった制限が、当日に出ることもあります。',
      '誘導路が NOTAM で閉まっていれば、タキシーの道順が変わります。地上管制の指示をよく聞きます。',
      'よくある間違いは、前の日に読んだ NOTAM で済ませることです。出発の直前に、もう一度最新のものを確かめます。',
    ],
    ask: {
      q: '経路の先に Restricted Area があります。運用中かどうかわかりません。どうしますか？',
      opts: ['低く飛べば入ってよい', '入らずに、管制などで運用中かを確かめる', '航空図に描いてあるだけなので入ってよい'],
      ok: 1,
      why: '運用中の Restricted Area には、許可なく入れません。確かめられなければ、回り道をします。',
    },
  },
};
