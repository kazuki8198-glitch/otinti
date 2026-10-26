// CADET — content/lecture-notes/perf.js : the lecturer's own explanations for the sections of FLIGHT LAB's chapter 'perf' (format: index.js).
export default {
  'perf.da': {
    intro: [
      '同じ空港、同じ機体でも、暑い日は離陸が長く、上昇が鈍くなります。その差を数字にしたのが密度高度です。',
    ],
    notes: [
      // (the atm figure as drawn: 1,000 ft あたり約 −2℃、気圧は 1,000 ft あたり約 1 inHg); src: standard lapse rates: PHAK FAA-H-8083-25 ch. 4 (Atmosphere)
      '画面の図は標準大気で、海面は 15℃・29.92 inHg です。上へ 1,000 ft ごとに、気温は約 2℃、気圧は約 1 inHg 下がります。',
      '式の「× 1,000」は、この「1 inHg で約 1,000 ft」から来ています。規正値が 29.82 なら、気圧高度は標高より約 100 ft 高くなります。',
      '気温の例です。気圧高度 0 ft で 25℃ なら、標準より 10℃ 高いので、120 × 10 で密度高度は約 1,200 ft です。',
      // src: high density altitude reduces engine power, propeller efficiency and lift: PHAK FAA-H-8083-25 ch. 11
      '空気が薄いと、エンジンは吸う空気が減り、プロペラはつかむ空気が減り、翼は受ける空気が減ります。三重に効きます。',
      '速度計も同じ薄い空気で測るので、浮かせる IAS はいつもと同じです。ただ地面に対しては速く、長く走ります。',
      'よくある間違いは、空港の標高が低いから大丈夫、と気温を忘れることです。暑い日は計算してから飛びます。',
      // src: ATIS gives the temperature and the altimeter setting: AIM 4-1-13; the textbook's comm.atis (LAB's ATIS)
      'LAB の ATIS では気温と高度計規正値が流れます。聞いたら、その場で密度高度をざっと見積もる癖をつけましょう。',
      '性能に余裕のない日は、涼しい朝のうちに飛ぶのも一つの手です。',
    ],
    ask: {
      q: '気圧高度 0 ft で、気温は 30℃ です。密度高度はおよそいくつですか？',
      opts: ['0 ft（海面と同じ）', '約 1,800 ft', '約 3,600 ft', '約 30 ft'],
      ok: 1,
      why: '標準は 15℃ なので、15℃ 高いことになります。120 × 15 ＝ 1,800 ft を足します。',
    },
  },
  'perf.tol': {
    intro: [
      '滑走路が足りるかどうかは、離陸してからでは直せません。飛ぶ前の数分の計算で決まります。',
    ],
    notes: [
      '表を言葉にすると、重い・空気が薄い・追い風・芝や濡れた路面は、離陸も着陸も距離を延ばします。向かい風は両方を縮めます。',
      // src: an upslope lengthens the takeoff and shortens the landing: PHAK FAA-H-8083-25 ch. 11
      '坂だけは離陸と着陸で逆です。上り坂は、離陸では登りながら加速するので延び、着陸では坂がブレーキになるので縮みます。',
      // src: a tailwind raises the groundspeed at liftoff, and the distance grows about with the square of that speed (a 10 % heavier airplane: about 5 % faster liftoff, at least 21 % more distance): PHAK FAA-H-8083-25 ch. 11
      '追い風がこわいのは、同じ IAS に届くまで、地面に対してはその分速く走らなければならないからです。距離は速さのおよそ二乗で延びます。',
      // src: pressure altitude is read with 29.92 set (FLIGHT LAB's q_perf bank); charts entered with pressure altitude and temperature: PHAK FAA-H-8083-25 ch. 11
      '性能表には、標高ではなく気圧高度と気温で入ります。標高のまま読むのは、よくある間違いです。',
      '滑走路の先に木や建物があれば「50 ft の障害物を越えるまで」の距離で考えます。地上滑走の数字だけで安心しないでください。',
      '表の数字は新しい機体と熟練した操縦士の値です。あなたの腕と使い込んだ機体では、もっと長くなると考えます。',
      '中止点は離陸前に目印で決めます。例えば滑走路の半分あたりの誘導路です。そこで Vr の 70% に届いていなければ、迷わずパワーを絞ります。',
      // src: the textbook's wx.metar key point (ATIS・管制の風は磁方位) and its radio chapter (AIM 4-2-10)
      '管制や ATIS の風向きは磁方位なので、そのまま滑走路の番号と比べて、向かい風か追い風かを考えられます。',
    ],
    ask: {
      q: 'POH の離陸距離の表を読むとき、高度の欄に使う値はどれですか？',
      opts: ['空港の標高そのまま', 'その日の気圧高度（気温と組み合わせて）', '予定の巡航高度', 'いつも 0 ft'],
      ok: 1,
      why: '性能表は気圧高度と気温で書かれています。高度計を 29.92 にしたときの値か、式で求めた気圧高度を使います。',
    },
  },
  'perf.climb': {
    intro: [
      '上昇の速度は目的で選びます。障害物を越えたいのか、早く高度がほしいのか、前を見ながら長く上るのか、です。',
    ],
    notes: [
      'Vx は同じ距離で一番高く、Vy は同じ時間で一番高く上がる速度です。坂道で言えば、Vx は一番急な道、Vy は一番早く上に着く道です。',
      // src: Vx until the obstacle is cleared, then accelerate to Vy: AFH FAA-H-8083-3, Takeoffs and Departure Climbs
      'Archer では Vx 64 の方が Vy 76 より遅い速度です。失速に近いので、障害物を越えたら機首を少し下げて Vy へ加速します。',
      '地上 1,000 ft を越えたら、87 KIAS の巡航上昇に移ります。機首が下がって前が見え、空冷のエンジンに風がよく当たって冷えます。',
      'よくある間違いは、Vy のまま長く上り続けることです。機首の陰の機体が見えず、エンジンも熱くなります。',
      '表で 3,000 ft の上昇率が海面付近より小さいのは、高いほど空気が薄いからです。前の節の密度高度と同じ話です。',
      // src: 14 CFR 91.151 (30 min at normal cruising speed by day; the textbook's law.rules row)
      '燃料の例です。昼の VFR で 1.5 時間、1 時間に 8 gal なら、飛ぶ分 12 gal に予備 30 分の 4 gal、合わせて 16 gal です。',
      // src: the textbook's law.rules key point (訓練生のうちは教官・学校の決まりに従う)
      'これにタキシーと上昇の分、そして自分の余裕を足します。訓練生のうちは、訓練校が決めた予備に従います。',
      '消費率は POH の表で、その日の出力と高度に合わせて選びます。8〜10 gal は目安なので、決めつけないでください。',
    ],
    ask: {
      q: '短い滑走路の先に高い木があります。離陸して木を越えるまで、どの速度で上昇しますか？',
      opts: ['Vx（64 KIAS）', 'Vy（76 KIAS）', '巡航上昇（87 KIAS）', 'できるだけ速い速度'],
      ok: 0,
      why: '距離あたり最も高く上がれるのが Vx です。木を越えたら Vy へ加速します。',
    },
  },
  'perf.wb': {
    intro: [
      '積み方は、空に上がってからは直せません。地上での計算が、その日の機体の素直さを決めます。',
    ],
    notes: [
      'モーメントはシーソーと同じです。軽い子どもでも端に座れば、真ん中寄りの大人とつり合います。重さ × 距離で効くのです。',
      // src: the datum is chosen by the manufacturer; the arm is measured from it: PHAK FAA-H-8083-25 ch. 10
      '基準線はメーカーが決めた位置で、アームはそこからの距離です。後席や荷物室は、アームが長くなります。',
      '計算の例です。合計重量 2,000 lb、合計モーメント 180,000 なら、重心は 180,000 ÷ 2,000 で 90 in です。',
      '画面の図の見方です。横が重心の位置、縦が重量で、計算した点が枠の中に入っていれば、重量と重心は範囲内です。',
      // (the wbEnvelope figure as drawn: the forward limit at 82 in up to 2,050 lb, then slanting aft to 88.6 in at the 2,550 lb top edge)
      '左の線が上の方で右へ傾いているのは、重いときほど前の限界が後ろへ移る、という意味です。上の辺が最大重量です。',
      // src: avgas about 6 lb/gal: PHAK FAA-H-8083-25 ch. 10; FLIGHT LAB's q_perf bank
      '燃料は 1 gal 約 6 lb です。離陸時と、燃料が減った着陸時の 2 点を描き、両方が枠に入ることを確かめます。',
      '席の数と積める重さは別の話です。燃料を満タンにすると、全部の席を埋められない日もあります。',
      'よくある間違いは、手荷物を量らずに目分量で積むことです。荷物室はアームが長いので、同じ重さでも重心を大きく後ろへ動かします。',
    ],
    ask: {
      q: '重心が前方限界の近くにあります。着陸で起きやすいことはどれですか？',
      opts: ['フレアで機首を上げにくい', 'スピンから回復しにくい', '失速速度が下がる', '操縦が軽すぎて引きすぎる'],
      ok: 0,
      // src: FLIGHT LAB's q_aero bank (前方限界寄り：失速速度が少し上がり、フレアで機首を上げにくい); PHAK FAA-H-8083-25 ch. 10
      why: '前寄りの重心では尾翼の下向きの力が大きく、機首が重くなります。フレアで機首を上げにくく、失速速度も少し上がります。',
    },
  },
};
