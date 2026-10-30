# 安全レビュー R2（safety-R2）

作業日：2026-10-30。役割：R2（第 1 部 地上学科）の独立した安全レビュー（DESIGN 5 章の基準 7、7.1 の「安全レビュー」、7.2 の R2 のうち W27 の「〔安全〕に触れた文の安全レビュー」）。読んだもの：DESIGN 5 章（基準 7）・6.2（15 の決まり）・3.3 の第 1 部・7.2 の R2、DECISIONS.md（判断 0・2・3 と補足・11）、PROGRESS.md（「次」と「未解決」の安全レビューの行）、STYLE.md、reports/safety-R1.md・factcheck2-R2.md・W07d2.md、台帳 RULINGS の `R.vfr-into-imc`。

書いた人と別の役として、**いまの本**（`flight-lab/src/book-1.js`・`book-2.js`・`book-comm.js`・`book-gates.js`・`book-jur.js` を `flight-lab/test/load.mjs` で読み込み、節の文・囲み・図の文字・章末を取り出したもの）と課目 `syllabus.js` を、2026-10-30 に自分で取り直した一次資料と照らした。

**本・課目・CADET・台帳は 1 文字も変えていない**（この報告だけを書いた）。`flight-lab/kiso/` には触っていない。git の操作もしていない。

---

## 0. 結論

**must はない。** 第 1 部で命に関わる 7 項目に触れる文は、どれも一次資料と合い、初学者に危ない読み方をさせる文は見つからなかった。R1 の安全レビューの must（③ 雲に入ったとき）と、第 1 部にかかる should（④ 失速警報との関係・⑥ 考えてみようの答え・⑦ 日本の欄の読み違い・`law.rules` の国）は、すべて直っている。

**should 3**（S1 `wx.shear` の「前へ押して」、S2 `hf.body` の長い旋回、S3 課目 a5 の「Va（設計運動速度）」）と **nit 5**（N1〜N5）を、持ち主への案として 5.5 の表にまとめた。どれも直すまで R2 を止める理由にはならない（DESIGN 5 章の基準 7 の「本文で直す」はすでに満たしている）が、R2 の締め（版の出力の作り直し）の前に直すことを勧める。

### 0.1 7 項目の判定（第 1 部と、R2 で変わった課目）

| # | 項目（基準 7） | 判定 | 見た場所 | 残り |
|---|---|---|---|---|
| ① | 故障したエンジンは足で特定しスロットルで確かめる | **合格**（第 1 部の範囲外。R2 で変わった課目 m2・m4 を見た） | 課目 m2・m4 の brief・say（W07d2）。本の `me.oei` は R1 で合格のまま | なし |
| ② | 周回進入で目視を失ったら上昇旋回して進入復行 | **第 1 部の範囲外**（R1 のつなぎ `ifr.np` のまま。本番の節 `ifr.circle` は R3 の W30） | — | なし（R3） |
| ③ | VFR で雲に入ったときの順番 | **合格**（R1 の must は直った） | `hf.body`（本文 3 段落・ここが大切 2 項目）、`wx.ts`・`wx.fog` から `hf.body` へのリンク、`comm.flow`（雲に入る指示は unable）、`comm.mayday`（雲に入る上昇をしない）、`adm.sa`・`adm.risk`、`g1.review` 問 3・口述 4 | S2（should）。裁定 `R.vfr-into-imc` の `hf.body` の分は承認（4 の③） |
| ④ | マイクロバーストで機首を下げすぎない | **合格** | `wx.shear`（本文・判断の目・ここが大切・よくある間違い・図 `microburst`）、`wx.ts` | S1（should）、N5 |
| ⑤ | 失速からの回復の順番（自動操縦を最初に切る） | **合格** | `aero.stall`（回復の型・判断の目・シミュレータの囲みの判断 11）、`aero.spin`、`aero.turn`、`inst.ap`、`g1.review` 問 6、学科テスト `q_aero` #17・`q_sys` #20、課目 a7・a8（W07d2 の入り方） | N1・N2 |
| ⑥ | 飲酒（米国 0.04%・8 時間、日本は原則ゼロ・0.2 g/L・0.09 mg/L・自家用も） | **合格** | `hf.self`（表・ここが大切・囲み `alcohol`・米国では・考えてみよう）、`g1.japan`（表と確かめの問い）、`hf.altitude`（飲酒と高さ） | なし |
| ⑦ | VFR の燃料（米国 91.151、日本の第 63 条は事業と IFR だけ） | **合格** | `perf.fuel`（本文・計算の手順・例・よくある間違い・囲み `fuel.vfr`・考えてみよう）、`law.rules`（本文・ここが大切・囲み）、`sys.fuel`、`perf.range`・`navb.calc` の判断の目、`g1.japan`（表と確かめの問い） | なし |

### 0.2 7 項目のまわり（指示にある項目）

| 項目 | 判定 | 見た場所 | 残り |
|---|---|---|---|
| スピン | **合格** | `aero.spin`（段階・高度の損失・向きの見方・POH と AFH の回復・スパイラルの回復・図）、`q_aero` #14・#15 | N3（`perf.wb` の発展） |
| 荷重倍数 | **合格** | `aero.turn`（表・図・Archer の普通類と実用類・91.307 の囲み）、`aero.vn`（V-n 線図・V O と V A）、`aero.struct`（発展）、`hf.motion`（G）、`wx.turb`（V O まで減速）、`q_aero` #16 | S3（課目 a5） |
| 着氷 | **合格** | `wx.ice`、`sys.carb`、`wx.ts`（雷雨に入ったら）、`aero.wing`（判断の目：霜）、`inst.ap`（判断の目：トリム）、`q_aero` #12・`q_wx` #16・`q_perf` #14・`g1.review` 問 8 | なし |
| 体調（飲酒以外） | **合格** | `hf.self`（薬・48 時間・5 倍の間隔・61.53）、`hf.fatigue`、`hf.altitude`（低酸素・CO・耳・ダイビング）、`hf.motion`、`g1.review` 問 15 | なし |
| 新しい「判断の目」（34 か所）と「もっと深く」（19 か所） | **合格** | 全部を取り出して読んだ（2 章） | N3・N5 |

---

## 1. 変えたファイル

- `textbook/rewrite/combined/reports/safety-R2.md`（この報告。新規）

ほかは変えていない。直す案は 5.5 の表に書き、9 章で持ち主に頼む。台帳の行も触っていない（9 章に、統合役に頼む note を書いた）。

---

## 2. 見た範囲

本（第 1 部の 16 章と、関係する序部・第 2 部のリンク先）。節は全文を、章を通して決まりの言葉（失速・スピン・荷重・ウィンドシャー・着氷・飲酒・燃料・雲に入る など）でも探した。

- 原理：`aero.stall`・`aero.spin`・`aero.turn`・`aero.vn`・`aero.struct`（発展）・`aero.power`・`aero.wing`
- 機体：`sys.carb`・`sys.fuel`・`sys.piston`・`sys.engine`・`sys.elec`（暖房と CO）
- 計器：`inst.ap`・`sys.g1000`（飛行中の速度計の異常）・`inst.alt`（31.00／28.00 inHg）
- 性能・重さ：`perf.fuel`・`perf.range`・`perf.plan`・`perf.wb`（発展の尾翼の力と重心）・`wb.shift`
- 気象：`wx.shear`・`wx.ts`・`wx.ice`・`wx.turb`・`wx.fog`
- 規則・交信：`law.rules`・`law.vfr`・`law.basis`・`comm.flow`・`comm.clarify`・`comm.mayday`
- 人間：`hf.self`・`hf.fatigue`・`hf.body`・`hf.motion`・`hf.altitude`・`adm.sa`・`adm.risk`
- まとめ：`g1.review`（問 1〜15・口述 1〜4）・`g1.japan`（表と確かめの問い 3 つ）
- 新しい囲み：第 1 部と `basics` の「判断の目」34 か所・「もっと深く」19 か所・「ここを混同しない」25 か所を全部取り出して読んだ
- 図の文字：`aero.stall`・`aero.spin`・`wx.shear`・`wx.ice`・`hf.body` の図
- 学科テスト：W23 が足した 81 問のうち、上の項目に触れる 16 問（`q_aero` #11・12・14〜17、`q_sys` #12・13・20、`q_perf` #14、`q_wx` #16・18・19、`q_hf` #12・14〜16）
- 課目（W07d2 で変わった〔安全〕の分）：a7・a8（入り方と回復の順番・判断 11 の参考の行）、e2（降りる方向）、m2・m4（約 2° のバンク・Verify をゆっくり・全部前・フラップ UP）、ほかに a5（荷重倍数の課目）
- テスト：`flight-lab/test/flight.test.mjs` の「textbook: the seven safety items…」と「syllabus: the stall lessons teach the AFH recovery order…」が何を決め打つか

---

## 3. 一次資料（2026-10-30 に自分で取り直して読んだ）

| 資料 | 読んだ所 | 何を確かめたか |
|---|---|---|
| AFH（FAA-H-8083-3C）第 5 章 `06_afh_ch5.pdf` | p.5-15〜5-16「Fundamentals of Stall Recovery」（6 段階・単発の練習機は 4 つ・「until the impending stall indications are eliminated」・「prioritized power and maintaining altitude, which resulted in a loss of control」）、Common Errors（9「Not disconnecting the wing leveler or autopilot … prior to reducing AOA」・11「Not maintaining a nose down control input until the stall warning is eliminated」）、クロスコントロール失速（「reluctant to use bank angles greater than 30 degrees」「safest action for an overshoot is to perform a go-around」）、スピン（「first turn … approximately 1,000 feet, while each subsequent turn loses about half」「prior to completing 360° of rotation」「the ball mounted on the left side … will always move to the left」、4 段階・初期は 2〜4 回転）、スパイラルの 5 段階（p.5-26 図 5-18） | ⑤・スピン・`g1.review` 問 6・N1 |
| AFH 第 18 章 `19_afh_ch18.pdf` | p.18-17〜18-21「Inadvertent VFR Flight Into IMC」（約 10 分の統計・認める → 操縦を保つ → 助けを得る・翼を水平だけ・トリムと指先・自動操縦・1 bar width・10° 以下・「turn a few degrees and then return to level flight if a large change in heading is necessary … may relieve the progressive overbanking that often results from prolonged turns」・500 fpm・上昇と旋回を同時にしない・管制にゆっくりを頼む。旋回の向きは書いていない）、離陸直後のエンジン故障（「a field directly ahead (or slightly to the side of the takeoff path)」） | ③・S2・課目 e2 |
| PHAK（FAA-H-8083-25C）第 17 章 `19_phak_ch17.pdf` | 「make a decision early to turn 180° and land at an alternate airport」、新しい薬は少なくとも 48 時間・最大の飲む間隔の 5 倍（5〜6 時間なら 30 時間）、CO（ヘモグロビンに約 200 倍・抜けるのに最大 48 時間） | ③（雲に入る前）・`hf.self`・`hf.altitude` |
| PHAK 第 5 章 `07_phak_ch5.pdf` | 重心と失速・スピン（「aft CG limit … allows normal recovery from a one-turn spin」「may fail completely to respond … when the CG is moved aft by one or two inches」「flat spin」） | N3 |
| AWH（FAA-H-8083-28B）`FAA-H-8083-28B.pdf` | 22.7.3.1（「maintaining or increasing pitch attitude and accepting lower-than-usual airspeed」「pitch attitude must not be allowed to fall below the normal range」・5〜15 秒）、22.7.3.2（「the only indication may be a slower-than-normal airspeed increase」「may be as little as five seconds」）、22.8.2（雷雨の避け方 19 項目：20 mi・40 mi の間隔・「more than half the area」・雷雨に入る前の 1〜5） | ④・`wx.ts`・S1・N4・N5 |
| AIM 7-1（FAA の HTML） | 段落の番号（7-1-19 着氷の PIREP・7-1-20 着氷の言葉・7-1-21 乱気流・7-1-24 マイクロバースト・7-1-26 雷雨・7-1-27 雷雨の飛び方）、+02〜−10℃、severe は「immediate exit」、マイクロバーストは最初の 5 分は強まる・ほかにも起きる、−5〜+5℃ の落雷、「6/10 thunderstorm coverage」、ALT と速度のモードを切る・灯りを最も明るく・中で引き返さない | `wx.ice`・`wx.shear`・`wx.ts` |
| AIM 7-2（FAA の HTML） | 7-2-2（31.00 inHg を超える日は実際の高さが表示より高い・28.00 inHg 未満で合わせられないなら飛ばないよう勧める） | `inst.alt` |
| eCFR 14 CFR 91.17・91.151 | 91.17(a)(1)〜(4)・alcohol concentration の定義、91.151(a)(1)(2) | ⑥・⑦ |
| 国土交通省航空局長通達 国空航第 2278 号（平成 31 年 1 月 31 日）https://www.mlit.go.jp/common/001271263.pdf | 2「原則」（濃度にかかわらず体内にアルコールを保有する状態で業務をしない）、3(1)（血液 1 L に 0.2 g 以上・呼気 1 L に 0.09 mg 以上） | ⑥（囲み `alcohol` の日本の欄、`g1.japan` の問い） |
| AOPA・AIN の 2016 年の記事（Piper が Archer に燃料噴射の IO-360-B4M を選べる装備として追加）、Piper の 2020 年の Archer TX の仕様書（O-360-A4M、燃料噴射は追加の選択） | — | `sys.carb`・`sys.piston` の「燃料噴射式（IO-360）の Archer」 |

Archer III の POH の値（失速警報 5〜10 kt 手前・失う高度 100〜350 ft・+3.8／−1.5 G・+4.4／−1.7 G・V O 113／98 KIAS・乱気流で V O へ・スピンの回復 3.5h・キャブレターヒーター 3.5j／3.5k／4.5l／4.5m・着氷のない条件 2.19）は、POH の PDF を自分では取り直していない。factcheck-aero・factcheck-sys・factcheck-perfwb・factcheck2-R2 が POH と照らした記録を使い、〔安全〕の言い方（順番・してはいけないこと）だけを AFH・PHAK・AWH・AIM と照らした。AC 00-54（Pilot Windshear Guide）は FAA の一覧で 2022-12-22 に取り消されている（後継は AWH）。本文は AC 00-54 を引いていないので問題はないが、`wx.shear` の失速警報の文の出典に AC 00-54 を足さないこと。

---

## 4. 7 項目ごとの所見

### ① 故障したエンジンの特定（第 1 部の範囲外。課目 m2・m4 は合格）

- R2 で変わった課目 m2・m4（W07d2）：brief は「方向を保つ → Vyse → Identify（Dead foot, dead engine）→ Verify（そのスロットルを**ゆっくり**絞る）→ Feather」、m4 は「①方向 ②Vyse ③出力は全部前 ④脚 UP・フラップ UP ⑤Identify・Verify・Feather」。バンクは「約 2°（ボールは生きている側へ 1/3〜1/2）・最初の一瞬は 5〜10°」。AFH 第 13 章（safety-R1 の 3 で確かめた p.13-31〜13-32）と、本の `me.oei` の手順の表に合う。safety-R1 の 5 の 4 の nit（2〜5° の言い方・m4 の全部前とフラップ・m2 のゆっくり）は 3 つとも直っている。
- 本の `me.oei` は R2 で変わっていない（R1 で合格）。

### ② 周回進入（第 1 部の範囲外）

R2 で変わった所はない。R1 のつなぎ（`ifr.np` の 1 文と、そのテスト）のまま。本番の節 `ifr.circle` は R3 の W30。

### ③ VFR で雲に入ったとき（合格。R1 の must は直った）

- `hf.body`（W20 が書き直した）の 3 段落は AFH 第 18 章 p.18-17〜18-21 と 1 つずつ合う：
  - 「いちばんの予防は、雲に入らないこと」「計器で飛ぶ訓練を受けていない操縦士は、計器だけに頼るようになってから約 10 分で操縦を失う」（AFH 18-17）、「雲に入る前に早めに 180° 旋回し、天気のよい空港へ降りる判断」（PHAK 第 17 章）
  - 「緊急事態」「状況を認める → 計器で操縦を保つ → 助けを得る」「最初にすることは翼を水平に保つことだけ」「トリム・指先」「自動操縦があれば使う」「外をのぞいて確かめようとすると操縦がおろそかになる」（AFH 18-17〜18-18）
  - 「旋回はバンク 10° 以下」「機首の上げ下げは 1 本分（bar width）まで」「上昇と旋回を同時にしない」「降下は毎分 500 ft を超えない」（AFH 18-19〜18-21）
  - 「管制に急がされても急な操作はしない。ゆっくりにしてほしいと頼んでかまわない」（AFH 18-21）
- **裁定 `R.vfr-into-imc` の 180° 旋回の段落（PROGRESS が W36 に聞いている所）の答え：`hf.body` の書き方を承認する。** 理由：① AFH は雲から出る向きを書いていない（18-17〜18-21 を全部読んで確かめた）ので、本文が「AFH は…決めていません。この本では…1 つの手として教えます」と出典を分けて書いているのは正しい。② 条件（近くの山・障害物から先に離れる、来た方が確実に晴れて地形が許すときだけ、浅いバンク、管制に助けを求める）が、AFH の「旋回は 10° 以下」「上昇と旋回を同時にしない」とぶつからない。③ 雲に入る前の 180° は PHAK 第 17 章の言葉そのもの。④ 「ここが大切」の 2 項目（翼を水平・地形から離れる／180° は浅く条件つき・管制）が、R5 の「今日の復習」で単独で出ても誤って読めない。R1V が署名しなかった 2 文は、「この本の判断」と札を付けて書いてあるので、一次資料の署名ではなく裁定の行（RULINGS）で扱えばよい。裁定の行そのものは、`emg.imc`（R3 の W28）と `kiso11.27` が残るので open のまま（9 章の note）。
- **S2（should）**：本は雲の中の 180° 旋回を教えるが、浅いバンクの 180° は長い旋回になる（例：真対気速度 110 kt・バンク 10° で旋回率は約 1.7°/秒、180° に約 1 分 40 秒。式は `aero.turn` の旋回率の式）。同じ節が墓場のスパイラル（長い旋回で回っている感じが消える）を警告し、AFH p.18-19 は大きく向きを変えるときの方法として「数度回っては水平に戻す、をくり返す。長い旋回で起きやすいバンクの深まりを防げる」と書いている。案は 5.5 の表の S2。
- `wx.ts`（雷雨の中の手順は AIM 7-1-27 の雷雨の場合だと明記し、雲に入ったときの順番は `hf.body` へリンク）・`wx.fog`（`hf.body` へリンク）・`comm.flow`（雲に入る指示は unable と言い、雲と地形から離れ、新しい指示を求める。91.123(c)）・`comm.mayday`（計器飛行証明がなければ雲に入る上昇をしない）・`adm.risk`（引き返しをいつも一番の手と決めつけない）は、`hf.body` の順番とぶつからない。
- テスト：`flight.test.mjs` の ③ の決め打ちの語は、いまの `hf.body` の文にそのまま出る（テストは通る）。

### ④ マイクロバーストで機首を下げすぎない（合格）

- `wx.shear`：「早めに出力をいっぱいにして着陸復行」「速度が減っても機首を下げすぎません」「機首の姿勢を保ち、ふだんより低い速度を受け入れます（AWH 22.7.3.1・22.7.3.3）」は AWH 22.7.3.1 の「maintaining or increasing pitch attitude and accepting lower-than-usual airspeed」「pitch attitude must not be allowed to fall below the normal range」と合う。数字（2.5 mi 未満・5〜15 分・6,000 fpm・30〜90 kt、地面に着いてから約 5 分強まる：AIM 7-1-24、ガストフロントは 15 マイルほど先：AWH 19.2.1.1）も合う。「よくある間違い」（出力いっぱいでも抜けられない・487 fpm と 6,000 fpm・形がかたよったマイクロバースト・警報がないことは証明でない・基本の LLWAS はマイクロバーストの警報を出さない）も正しい。
- R1 の should（失速との関係）は直っている：「ただし、失速警報が鳴ったら、警報が止まるまで迎え角を減らすのが先です」（AFH 第 5 章の原則、テストの決め打ちもある）。
- **S1（should）**：そのすぐ後に W17 が足した文「操縦輪（ヨーク、control wheel）を前へ押して、迎え角（迎角）を減らします（AFH 第 5 章）」は、地面の近くのウィンドシャーの場面で、初学者に「大きく押す」と読ませるおそれがある。直前の 2 文（機首を下げすぎない・警報が止まるまで）と合わせると一通りに読めるが、ここで要るのは「警報が止まるところまでだけ迎え角を減らし、それより下へ機首を下げない」ことで、AFH の回復の型（「until the impending stall indications are eliminated」）と AWH 22.7.3.1（姿勢はふだんの範囲より下げない）の両方に合う言い方にしたい。あわせて、同じ段落の「迎え角（angle of attack）」と「迎え角（迎角）」の 2 回の括弧を 1 回にする（W24 の用語の直しの名残と見られる）。案は 5.5 の表の S1。テストが決め打つのは前の文（「失速警報（stall warning）が鳴ったら、警報が止まるまで迎え角（angle of attack）を減らすのが先」）だけなので、後ろの文を変えてもテストは通る。
- N5（nit）：判断の目「離陸の滑走で…しるしはそれだけで、使える時間は短ければ 5 秒ほど」。AWH 22.7.3.2 は「the only indication **may be** a slower-than-normal airspeed increase」。「しるしはそれだけのこともあり」に。

### ⑤ 失速からの回復の順番（合格）

- `aero.stall`（W13 が書き直した）：「自動操縦装置のある機体では、その前にまず自動操縦を切ります。切らずに迎え角を減らそうとするのは、AFH が挙げるよくある間違い」→ ① 操縦輪を前へ（最優先・必要なら機首下げのトリム）② 翼を水平 ③ 出力を必要に応じて ④ ゆるやかに元の飛び方へ（二次失速）。「高度を守ろうとして引き続けると、迎え角が減らず、回復できません」。AFH p.5-15〜5-16 の 6 段階と Common Errors 9 に合う。判断の目（警報が鳴ったらまず押す・低い旋回でも翼を水平にする前に押す）、ここを混同しない（失速速度は変わる・臨界迎え角は変わらない）、考えてみよう（45° バンク・60 kt・約 59.5 kt）も正しい。
- 所有者の判断 11：`aero.stall` のシミュレータの囲み（「回復で失った高度を目安として出します。ACS には高度の損失の基準がありません。高度を守るより、迎え角を減らすのが先です」）、課目 a7・a8 の std（参考・合否に使わない・目安 300 ft）と `stallRecovery` の `result`（`pass: true`）に入っている（W07d2 の 2 も確かめた）。
- 課目 a7 の新しい入り方（W07d2：進入の速度で降下を安定させ、なめらかに機首を上げる。AFH p.5-17・ACS PA.VII.B）は〔安全〕の上で問題ない。回復の順番（自動操縦 → ①〜④、「失速警報が止まるまで」）はテストが決め打っている。
- `g1.review` 問 6 の答え（速度計が速くても失速は起きる・荷重倍数で失速の速度が上がる・自動操縦があればまず切る・押して迎え角を減らす・翼を水平・出力を必要に応じて・ゆるやかに戻す）は `aero.stall` と同じ順番で正しい。
- `inst.ap`（VS も ALT も速度を保たない・出力を合わせないと失速へ向かう・思うように動かなければ機体を保って AP を切る）と学科テスト `q_sys` #20 も合う。
- N1（nit）：`aero.stall` の ①（`book-1.js` 502 行）と `g1.review` 問 6 の答えに、「失速警報（手前の兆候）が止まるまで」がない。AFH の 2 a）と Common Errors 11 の言葉で、課目 a7・a8 の brief と `ops.stall` は書いている。⑤の住所の節なので、①に「（失速警報が止まるまで）」を足すとそろう。
- N2（nit）：`inst.ap` は ALT・VS で失速へ向かう話をするが、失速警報が鳴ったときにすることへのリンクがない。「失速警報が鳴ったら、まず自動操縦を切り、迎え角を減らします（→ 失速のしくみと回復）」を 1 文か「思い出そう」で足すとよい（⑤の「自動操縦を最初に切る」が自動操縦の節からも引ける）。

### ⑥ 飲酒（合格）

- `hf.self`：米国の 14 CFR 91.17(a)（8 時間以内・酔っている間・安全に反する薬・0.04 以上、血液 1 dL か呼気 210 L あたりのグラム）は eCFR の文どおり。AIM の目安（ビール 1 本で少なくとも 3 時間・8 時間でも残る・12〜24 時間）も R1 で確かめたとおり。考えてみよう「この朝は飛びません」（R1 の should）は直っている。
- 囲み `alcohol` の日本の欄（第 70 条・自家用の操縦者も対象・通達の原則・0.2 g/L・0.09 mg/L）は、通達 国空航第 2278 号の 2 と 3(1) の文を取り直して確かめた。
- `g1.japan`：「米国の飲酒の決まりを守れば、日本でも飛んでよいと言えますか」→「言えません。日本は原則として体にアルコールが残る状態で業務をしない。日本の目安の濃度は米国の値より低く、自家用も対象。時間を守ったことは安全に飛べる証拠にならない」。0.04 g/dL＝0.4 g/L（血液）・0.04 g/210 L≒0.19 mg/L（呼気）なので、日本の 0.2 g/L・0.09 mg/L はどちらも低い。正しい。
- CADET：`hf.self` に 91.17 と「8 時間」が残ることは `cadet/test/jur.test.mjs` が確かめる（通った）。

### ⑦ VFR の燃料（合格）

- `perf.fuel`：91.151(a)（風と予報を考えて、最初の着陸予定地まで＋普通の巡航速度で昼 30 分・夜 45 分）は eCFR の文どおり。計算の手順・例（2＋9.8＋4.8≒16.5 gal）・考えてみよう（22.5 gal）・「上昇の燃料に始動と地上滑走をもう一度足さない」・「予備は使ってよい燃料ではない」・「学校の規程が多ければその量」も正しい。
- 囲み `fuel.vfr` の日本の欄は「訓練では、学校の規程の量に従う」まで書かれ、R1 の should（予備がいらないと読める）は直っている。`law.rules` の「ここが大切」も「米国の VFR の燃料（91.151）」と国を書いた（R1 の nit）。
- `g1.japan` の確かめの問い（Sanford の VFR は米国の欄、日本の法令に量の決まりがないことは予備がいらないという意味ではない、学校の決まりの量を積む）も正しい。

---

## 5. 7 項目のまわりの所見

### スピン（合格）

`aero.spin` は AFH 第 5 章の文と 1 つずつ合う：最初の 1 回転で約 1,000 ft・そのあと約半分、1 回転し終える前に回復を始める、初期は 2〜4 回転、向きは旋回計（玉は取り付け位置で決まる。左側の玉は右回りでも左へ）、ベースからファイナルで 30° より深いバンクを避け・行き過ぎたら着陸復行、Archer は意図的なスピン禁止で POH 3.5h の順（方向舵が先）と AFH の一般の型（PARE）の違いを書き「必ずその機体の POH」、スパイラルの 5 段階（少し押して約 1 G にしてから翼を水平）。図の文字（回復の最初：スピンは方向舵を回転と反対へ・スパイラルは出力を絞り少し押す）も合う。

- N3（nit）：`perf.wb` の「もっと深く」の最後「設計では、1 回転のスピンから普通に回復できることも考えます（PHAK 第 5 章）」。PHAK の言葉どおりだが、PHAK は同じ所で「ある重心で長いスピンからきれいに回復する機体でも、重心を 1〜2 in 後ろへ動かすと、ふつうの回復の操作にまったく応えなくなることがある」「後ろへ動かすとフラットスピンになる点がある」と書いている。初学者が「普通類は 1 回転なら回復できる」と読まないように、この 1 文を足すか、「スピンを認めていない機体でスピンしてよいという意味ではありません（→ スピンとスパイラル）」と添える。

### 荷重倍数（合格）

`aero.turn`（1 ÷ cos・表・75° で 3.86 G・Archer の普通類は曲技とスピン禁止・実用類だけ 60° を超える 3 つの運動・入る速度 113 KIAS・背面不可・91.303／91.307(c) の囲み）、`aero.vn`（制限荷重と終極荷重・V O と V A の違い・「V O 以下でも、舵を何度もいっぱいに使うと壊れることがある」・乱気流で V O まで減速・軽いほど V O が小さい）、`aero.struct`（同じ突風で速いほど・軽いほど荷重倍数が大きい・だから乱気流では減速）、`hf.motion`（視野が狭くなったら引く力をゆるめる）、`wx.turb`（その日の重量の V O 以下・姿勢を保つ）。〔安全〕の上で問題はない。

- **S3（should、課目）**：課目 a5（急旋回）の brief「速度は Va（${AR.va} kt：設計運動速度）以下で」（`syllabus.js` 147 行。CADET の教官が読み上げる）。本の `aero.vn` は R2 で「Archer III の POH が載せるのは V O（最大運用運動速度）。設計運動速度 V A は機体を設計するときの速度で、旧基準は V A を『失速速度 × √制限荷重倍数』より**小さくしない**ことを求める。2 つは別の速度。この本は V O と書く」と決めた。113 kt は POH の V O（2,550 lb）の値で、軽いと小さくなる（1,917 lb で 98 KIAS）。課目の言い方のままだと、「設計運動速度以下なら舵をいっぱいに使っても安全」という、本が直した誤解を CADET の教官が言い直すことになる（a5 は 95 kt で飛ぶので、課目の中で実際に危ない数字にはならない）。案は 5.5 の表の S3。第 2 部の `ops.turns`（「Va（設計運動速度）以下」）と `emg.fire`・`ifr.upset` の「Va」も同じ食い違いだが、これは R3 の章の単位（W28・W30）で本文を書き直すときに直す（決まり 9・10.5）。

### 着氷（合格）

`wx.ice`（目に見える水分の中で +2℃ 以下なら予想・AIM 7-1-19 の +2〜−10℃・多くは 0〜−20℃・凍雨は上空の凍る雨のしるし・まず目に見える水分の外へ、できなければ 0℃ より高い高さへ・暖かい高さが上のこともある・管制へ知らせる・severe はすぐ出る・Archer は着氷のない条件だけ（POH 2.19）・装置を持つことと承認は別・霜は全部取る）、`sys.carb`（PHAK の 21℃・80%・38℃・50%、POH の −5〜20℃ より暖かくても起きる、兆候は回転がじわじわ下がる、いっぱいに入れる・部分的に入れない・30 秒から数分の荒れでも待つ、ただし POH の「エンジンの荒れ」では 1 分で戻して原因を探す、進入では兆候がない限り使わない、全開で入れたままにしない）、`wx.ts`（雷雨に入る前にピトーヒーターとキャブレターヒーター）。AIM・AWH・PHAK と合い、POH との違いを本文で分けて書いている。

### 体調（合格）

`hf.self`（薬は「眠くない」で決めない・PHAK の 48 時間と 5 倍の間隔（6 時間なら 30 時間）は PHAK 第 17 章の文どおり・61.53）、`hf.fatigue`、`hf.altitude`（AIM 8-1-2 の酸素のすすめ・91.211・低酸素を疑ったら酸素と降下・過呼吸は 100% にしてから呼吸を整える：AIM 8-1-3・CO は暖房を切って通気口：AIM 8-1-4・パルスオキシメーターは CO で正しく出ない・ダイビングは 12／24 時間で MSL の高度：AIM 8-1-2）、`hf.motion`、`g1.review` 問 15・口述 4。問題はない。

### 新しい「判断の目」と「もっと深く」（合格）

第 1 部の判断の目 34 か所・もっと深く 19 か所・ここを混同しない 25 か所を全部読んだ。〔安全〕に触れるもの（`aero.wing` の霜、`aero.power` の低く遅い進入、`aero.stall`・`aero.spin`、`sys.airframe`、`sys.piston` の燃料の等級と温度、`inst.gyro` の地上滑走での点検、`inst.ap`、`perf.da`・`perf.tol`・`perf.climb`・`perf.range`、`wb.limits`・`wb.shift`、`wx.shear`・`wx.turb`・`wx.info`、`navb.calc`、`comm.runway`・`comm.flow`、`hf.fatigue`、`adm.*`）は一次資料と合い、本文とぶつからない。直す案は N3（`perf.wb` の発展）と N5（`wx.shear` の判断の目）だけ。

### 小さな nit

- N4（nit）：`wx.ts` の雷雨の避け方「雷雨が範囲の 6/10 をおおうときは、その範囲全体を回ります」の出典は「AWH 22.8.2・米国の AIM 7-1-27」。AIM 7-1-27 は「6/10」、AWH 22.8.2 の 15 は「more than half」で、AWH のほうが少し厳しい。「半分を超える（AWH。AIM は 6/10）」のように両方を書くか、厳しい方に合わせる。
- 確かめて問題がなかったもの：`inst.alt`（31.00／28.00 inHg は AIM 7-2-2 の番号も正しい）、`sys.g1000`（速度計だけがおかしいときは速度計を追わず姿勢と出力・入口と排水口が両方詰まると上昇で速く見える）、`sys.elec`（暖房と CO）、`sys.engine`（降下で混合気を濃くする・P リードが切れたらプロペラに触るときは点火が入っていると思う）、`sys.fuel`（BOTH がない・燃料計だけを信じない・ボンディング）、`aero.power`、学科テストの新しい 16 問（`q_perf` #14 のキャブレターヒーターは全開と同時に OFF：AFH 第 9 章・POH、`q_aero` #15 は AFH の型と POH の違いを理由に書く）、課目 e2（正面か少し横：AFH 第 18 章）。

---

## 5.5 直す案（まとめ）

| # | 重さ | 場所 | 今 | 案 | 根拠 | 持ち主 |
|---|---|---|---|---|---|---|
| S1 | should | `wx.shear`（`flight-lab/src/book-2.js` 204 行） | 「…減らすのが先です。操縦輪（ヨーク、control wheel）を前へ押して、迎え角（迎角）を減らします（AFH 第 5 章。→ 失速の節）。」 | 「…減らすのが先です。引く力をゆるめるか少し押して、警報が止まるところまで迎え角を減らします。止まったら、それより下へは機首を下げません（AFH 第 5 章・AWH 22.7.3.1。→ 失速の節）。」（前の文はテストの決め打ちなので変えない。「操縦輪（ヨーク、control wheel）」の初出が要るなら前の段落へ） | AFH p.5-15「until the impending stall indications are eliminated」、AWH 22.7.3.1「pitch attitude must not be allowed to fall below the normal range」 | `wx` の章（W17）→ 統合役 |
| S2 | should | `hf.body`（`book-2.js` 1136 行の段落） | 「…来た方が確実に晴れていて地形が許すときは、浅いバンクで 180° 旋回して雲から出ることを、1 つの手として教えます。」 | その後ろに 1 文：「浅い旋回の 180° は 1 分半以上かかります。長い旋回はバンクが深まりやすいので、少し回っては翼を水平に戻す、をくり返して向きを変えます（AFH 第 18 章）。」 | AFH p.18-19「turn a few degrees and then return to level flight if a large change in heading is necessary. Repeat the process … may relieve the progressive overbanking that often results from prolonged turns」 | `hf` の章（W20）→ 統合役 |
| S3 | should | 課目 a5 の brief（`flight-lab/src/syllabus.js` 147 行。CADET の教官が読む） | 「速度は Va（${AR.va} kt：設計運動速度）以下で。」 | 「速度は POH の V O（最大運用運動速度。最大重量で ${AR.va} kt、軽いと小さい）以下で。」（`physics.js` の `va` の名前は内部の名前なので変えなくてよい） | 本の `aero.vn`（R2）・Archer III の POH 2.3（113／98 KIAS）・旧 14 CFR 23.335(c)・23.1507 | 課目（W07d の持ち物）→ 統合役。CADET の教官の台詞のテストに決め打ちがあれば同じコミットで |
| N1 | nit | `aero.stall` の回復の ①（`book-1.js` 502 行）と `g1.review` 問 6 の答え（`book-gates.js`） | 「操縦輪を前へ：迎え角を減らします（最優先…）」 | 「操縦輪を前へ：失速警報が止まるまで迎え角を減らします（最優先…）」。問 6 も「…押して、失速警報が止まるまで迎え角を減らします」 | AFH p.5-15 の 2 a)・Common Errors 11 | `aero`（W13）・`g1`（W25）→ 統合役 |
| N2 | nit | `inst.ap` | ALT・VS で失速へ向かう、までで終わる | 「失速警報が鳴ったら、まず自動操縦を切り、迎え角を減らします（→ 失速のしくみと回復）」を 1 文か「思い出そう」で | AFH p.5-15 の 1・Common Errors 9 | `inst`（W15）→ 統合役 |
| N3 | nit | `perf.wb` の「もっと深く」の最後 | 「設計では、1 回転のスピンから普通に回復できることも考えます（PHAK 第 5 章）。」 | 後ろに「重心を後ろの限界から 1〜2 in 後ろへ動かすだけで、回復の操作にまったく応えなくなる例もあります（PHAK 第 5 章。→ スピンとスパイラル）。」 | PHAK 第 5 章（重心とスピン） | `wb`（W16）→ 統合役 |
| N4 | nit | `wx.ts` の雷雨の避け方 | 「雷雨が範囲の 6/10 をおおうときは、その範囲全体を回ります。」 | 「雷雨が範囲の半分を超えておおうときは（米国の AIM は 6/10）、その範囲全体を回ります。」 | AWH 22.8.2 の 15・AIM 7-1-27 | `wx`（W17）→ 統合役 |
| N5 | nit | `wx.shear` の判断の目の 3 つめ | 「しるしはそれだけで、使える時間は短ければ 5 秒ほどです」 | 「しるしはそれだけのこともあり、使える時間は短ければ 5 秒ほどです」 | AWH 22.7.3.2「the only indication may be」 | `wx`（W17）→ 統合役 |

S1・S2・N1・N3 を直すと、CLAIMS の札の要る文が変わる・増える（AFH・AWH・PHAK を引く文）。直した人は主張の台帳を作り直し、二人目の確かめ（W27）に回す。

---

## 6. 確かめたこと（検査とテスト）

| コマンド | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs <章> --no-browser`（`aero`・`sys`・`inst`・`perf`・`wb`・`wx`・`hf`・`adm`・`law`・`g1`） | **10 章とも error 0**（warn：aero 15・sys 8・inst 16・perf 17・wb 3・wx 14・hf 8・adm 2・law 11・g1 25。多くは初出の形 `first-use-form` と「思い出そう」の形。pending は台帳 CALC など）。図の Chromium の検査は省いた（この単位は本を変えていない） |
| `cd flight-lab && npm run -s test:fast` | **89/89 pass**（「textbook: the seven safety items…」「syllabus: the stall lessons teach the AFH recovery order…」を含む） |
| `cd textbook && npm test` | **36/36 pass** |
| `cd cadet && npm run -s test:fast` | **248/248 pass**（`jur.test.mjs` の `hf.self` の 91.17・8 時間、`perf.fuel` の 91.151 を含む） |

基準 7 の「①〜⑦の文はテストで確かめる」：R2 の本で ③（`hf.body`）・④（`wx.shear`）・⑤（`aero.stall`・a7・a8）・⑥（`hf.self`）・⑦（`perf.fuel`・`law.rules`・`FL.jur` の `fuel.vfr`）の決め打ちは全部通る。S1 の案は決め打ちの文の**後ろ**の文だけを変えるので、テストを直す必要はない。S3 を直すとき、CADET の教官の台詞のテストに a5 の文の決め打ちがあれば同じコミットで意図して直す（`TEST-CONSTANTS.md` に 1 行）。

---

## 7. 台帳の行

触っていない（パッチもない）。統合役に頼む note は 9 章。

---

## 8. 残っていること（open issues）

- ② 周回進入の本番の節 `ifr.circle`（R3 の W30）と、③ の本番の節 `emg.imc`（R3 の W28。`hf.body` から `emg.imc` への呼び戻しは住所ができてから：決まり 13）。
- 第 2 部の `ops.turns`・`emg.fire`・`ifr.upset` の「Va（設計運動速度）」（S3 と同じ食い違い。R3 の章の単位で）。
- 課目 m3（Vmc デモ）の「回復で失う高度 300 ft 以内」は合否に使ったまま（W07d2 の 6 の 3：所有者の判断を待つ）。安全レビューの意見：判断 11 と同じ理由（自家用 ACS の PA.X.B に高度の損失の基準がなく、回復の評価は入りの針路 ±20°）で、参考の行にしてよい。ただし Vmc デモは「生きている側の出力を絞り、機首を下げる」ことを先に教える課目で、高度を守る採点がこの順番を崩すおそれは失速の課目より小さい。判断は所有者に任せる。
- Archer III の POH の値は、この単位では POH を取り直していない（3 章の終わり）。

---

## 9. ほかの単位への頼み（needs from others）

1. **統合役（R2 の締め・W27）**：5.5 の表の S1〜S3 と N1〜N5 を、R2 の出力を作り直す前に持ち主の単位として直す（S1・S2・N1〜N5 は `book-1.js`・`book-2.js`・`book-gates.js`、S3 は `syllabus.js`。S3 は W50（用語をアプリ全体で：`syllabus.js` の `brief`）に回してもよい）。直したら主張の台帳を作り直して二人目に回す。
2. **統合役（台帳 RULINGS）**：`R.vfr-into-imc` の note に 1 行足す：「safety-R2（2026-10-30）：`hf.body` の段落（AFH 第 18 章 p.18-17〜18-21 の順番と、この本の判断として書いた 180° 旋回の条件）を承認。AFH は雲から出る向きを書いていない。S2（数度ずつ回って水平に戻す）を足すことを勧める。`emg.imc`（W28）と `kiso11.27` で閉じる」。状態は open のまま。
3. **統合役（PROGRESS）**：「未解決」の安全レビューの行（`hf.body` の 180° 旋回は W36、W07d2 の m2・m4・a7・e2、`g1.review` 問 6、`g1.japan` の燃料と飲酒の問い）を「safety-R2 で合格」に。`wx.shear` の「機首を保つのは失速警報が鳴らない範囲で」を小型機の一次資料で書けるか（R1 の W12 の残り）は、S1 の案（AFH の回復の型と AWH 22.7.3.1 だけで書ける）で閉じられる。AC 00-54 は 2022-12-22 に取り消されたので、出典に使わない。
4. **CADET の持ち主**：S3 を直すと CADET の教官の a5 のブリーフが変わる。台詞の長さのテストなどがあれば確かめる。
