# 専門家の読みの報告：第 2 部 第 21 章 `ground`「飛ぶ前と飛んだあと」と 第 22 章 `ops`「基本操縦」（W28-p2a の下書き・R3）

単位：expert-p2a（W28 の第 2 部の地上と基本操縦の専門家の読み手）。読んだ日：2026-10-31。
立場：飛行教官（FAA の CFI・CFII・MEI）で、JCAB の学科の出題範囲と操縦士実地試験実施細則も知っている読み手として読んだ。

読んだもの：
- 下書き：`textbook/rewrite/combined/drafts/p2a.js`（`ground` 7 節・`ops` 8 節・章末）、`drafts/p2a-figs.js`（図 9 枚）。変えていない図 `magCheck`・`attitudePower` も含め、事実確認役が 390 px で描いた 11 枚の画像を見た
- 報告：`reports/W28-p2a.md`・`factcheck-p2a.md`。形の参考に `expert-hfadm.md`
- 台帳：`ledgers/ACS-MAP.json`（`ground.*`・`ops.*` を節に持つ行と、同じ Task の行）・`JCAB-MAP.json`（`ground.*`・`ops.*` を節に持つ行）・`CONCEPTS.json`・`UNVERIFIED.json`（`U.check-*`）
- 決まり：DESIGN 3.3（第 2 部の扉と第 21・22 章の行）・3.4・6.2・7.2、DECISIONS、STYLE、`FL.jur`（`check.slow`・`check.stall`・`preflight`・`docs`・`msa`）
- 比べた他の節：登録済みの `aero.stall`・`aero.spin`・`aero.turn`・`aero.power`・`sys.engine`・`sys.carb`・`inst.ap`（`book-1.js`）、`comm.runway`（`book-comm.js`）、`en.class`・`basics.flight`（`book-0.js`）、下書きの `p2b.js`（`ops.landing`・`emg.glide`）

**下書きは変えていない**（読み手の役目：直さない）。変えたファイルはこの報告だけ。台帳のパッチも書いていない（提案は 10・12）。git の操作はしていない。

## 1. 結論

教官の目で見て、2 章とも訓練の 1 日の順に並び、「チェックリストを読んで・やって・確かめる」「いつもと違えば止まる」「失速は迎え角」が太い軸になっている。地上と空中の最初の 10 回のレッスンの予習に、そのまま使える。とくに次は残してほしい。
- `ground.crew` の受け渡しの 3 段階を図と判断の目（応答がなければ手を離さない）で教えたこと
- `ground.walk` の「見落とすと飛べない 5 つ」と、一周の順番を折りたたみに分けた形
- `ground.runup` の表の「何を見ているか」の列（点検の目的を言える＝ACS PA.II.F.K1a と JCAB 細則 2-4 の口頭の質問に答えられる）と、「操縦が逆に動くのは、いちばん危険な見落とし」
- `ground.after` の「着陸後のチェックリストは停止線を越えて止まってから」と、ふり返りで原因を分けて「次に変える行動を 1 つ」
- `ops.energy` の 3 × 3 の図（同じ向き＝スロットル、逆の向き＝昇降舵、とても遅いときは先に押す）
- `ops.stall` の「回復の第一は迎え角」と、decision 11 どおりの課目の注記

数字の正しさは事実確認役が確かめていて、私も今日 AFH 3C の第 1・2・3・5・10 章、POH VB-2266、訓練校のチェックリスト、ACS 6C、AIM 2-3-5・4-3-18・4-3-24 で読み直した。

数：**must 0・should 12・nit 13**（3 の表。事実確認役の must 1・should 4 は私も同じ意見で、6 に書いた。ここでは数えない）。

- **must**：なし（事実確認役の M1「滑空で届く範囲は重さで変わる」の誤りは must のまま。私の S8 は、その段落ごと住所の節へ返すことを勧める）
- **should の主なもの**
  - **急旋回で出力を足すこと**が書かれていない（S1。AFH 第 10 章。ACS の速度 ±10 kt と JCAB 細則 6-3 の ±10 kt を守るのに要る）
  - **操縦教員が “I have the flight controls.” と言って操縦を取ったとき**の訓練生の動きがない（S2。取り合いを防ぐ）
  - `ground.day` に **自分の状態の確かめ（IMSAFE）** がない（S3。ACS PA.II.A.K1、第 2 部の扉が呼び戻す `hf.self`）
  - `ground.taxi` に **大型機のジェットブラスト・プロペラの後流** と **思い込み（expectation bias）** がない（S4・S5。AIM 4-3-18・AFH 第 2 章、JCAB 細則 3-2 の判定基準 2、ACS PA.II.D.R2）
  - `ops.climb` の降下に、**長いパワーオフの降下の前のキャブレターヒーター**がない（S6。POH 4.5l、`sys.carb` の呼び戻し）
  - `ground.start` に、ACS-MAP が `ground.start` に対応させた **熱いエンジン・燃料過多の始動と外部電源の始動**がない（S7。ACS PA.II.C.K1・K2、POH 4.5d）
  - 同じことを 2〜3 か所で教えている所：最良滑空と最小沈下（S8）、失速と回復（S9）、権威勾配（S11）
  - `ops.stall` の折りたたみの「練習機で使わない 2 つは、最初に自動操縦を切ること…」は、自動操縦を付けた Archer III では誤りになる（S10）
  - JCAB の実地試験の低速飛行・失速・急旋回は ACS と中身が違う。`FL.jur` の `check.slow`・`check.stall` の日本の欄（今は〔要確認〕）を埋める一次資料を見つけた（S12。下書きは数を手で書けないので、W06・W37 への頼み）

## 2. 確かめた一次資料（2026-10-31）

事実確認役が同じ日に取り寄せた写し（scratchpad の `fcp2a/dl/`・`fcp2a/aim/`）を読み、私が新しく取り寄せたもの（scratchpad の `expp2a/dl/`）を足した。リポジトリには置いていない。

| 資料 | 読んだ所 |
|---|---|
| FAA AFH FAA-H-8083-3C 第 1 章 | p.1-15 の受け渡しの 3 段階（“The learner should stay on the controls until the instructor says, ‘I have the flight controls.’”）、Safety Considerations（positive transfer of controls） |
| 同 第 2 章 | p.2-15「Powerful aircraft may produce exhaust blast or rotor downwash … could easily cause a light airplane to become uncontrollable」、p.2-19 の expectation bias（「a pilot given the same taxi instructions by ATC, starts expecting those same instructions …」） |
| 同 第 3 章・第 10 章 | 第 10 章 p.10-2「The need for increased additional power to maintain altitude at a constant airspeed during the turn」、p.10-3「elevator back pressure … and power should be added … additional power allows the airplane to maintain airspeed」「remove both the trim and power inputs as the maneuver is completed」、よくある間違い「Ineffective use of power」 |
| 同 第 5 章 | 失速の回復の 6 段階と「a single-engine training airplane **without an autopilot** would likely only use four of the six steps」、よくある間違い「Not disconnecting the wing leveler or autopilot」、低速飛行（1 G の失速速度の 5〜10 kt 上が目安・L/D max より遅いと速度はピッチ、経路は出力） |
| Piper PA-28-181 Archer III POH VB-2266 | 4.5d（NORMAL START – HOT ENGINE：スロットル 1/2 in・LEFT MAG で始動して RIGHT MAG を ON、ENGINE START – FLOODED：スロットル全開・ポンプ OFF・ミクスチャー ICO、ENGINE START USING EXTERNAL POWER SOURCE：BATT MASTR OFF・ALTR OFF・電気の装備 OFF で外部電源、始動後に BATT MASTR ON・外部電源を外す・ALTR ON で電流計、「DO NOT ATTEMPT FLIGHT IF THERE IS NO INDICATION OF ALTERNATOR OUTPUT」）、4.5l（Power Off Descent：CARB HEAT ON IF REQUIRED → THROTTLE CLOSED、出力を 30 秒ごとに確かめる、「apply full carburetor heat prior to power reduction if carburetor icing conditions are suspected」）、補足 2（自動操縦は選んで付ける装備：`inst.ap` の本文と同じ） |
| 訓練校の Archer III チェックリスト（MGA、版 09012025） | STARTING ENGINE（気化器式・燃料噴射式の冷えた／熱いエンジン）、STARTING ENGINE WHEN FLOODED、ENGINE FIRE DURING START、AFTER STARTING ENGINE |
| FAA-S-ACS-6C | PA.II.A.K1・R1〜R5、PA.II.C.K1〜K4・R1、PA.II.D.K1〜K6・R1〜R4・S1〜S8、PA.II.F.K1・R1〜R4、PA.V.A.S1〜S5（S4「Perform the Task in the opposite direction」）、PA.VII.A.S1〜S5（S4「straight-and-level flight, turns, climbs, and descents with the aircraft configured as specified」）、付録 2「Positive Exchange of Flight Controls」 |
| FAA AIM（2026-10-31 の版） | 2-3-5（停止線は「where aircraft MUST STOP when approaching a runway」・管制塔のある空港では許可なしに越えない）、4-3-18（「jet blast, prop wash, and rotor wash can cause damage and upsets if encountered at close range」）、4-3-19（視程の悪い地上滑走）、4-3-24（大型機の後流が後ろの小型機を転覆させた例） |
| **操縦士実地試験実施細則 事業用操縦士（１人で操縦できる飛行機）**（国土交通省航空局安全部安全政策課、平成 10 年 3 月 20 日制定・**令和 8 年 5 月 8 日最終改正**、空乗第 2039 号・国空安政第 227 号）<br>https://safetyp.cab.mlit.go.jp/wp-content/uploads/2026/05/【ポータル】_20260508_操縦士実地試験実施細則（飛行機）事業用１人.pdf | Ⅱ－２ 実技試験の 2-4 飛行前点検、3-1 始動・試運転、3-2 地上滑走（判定基準 2「他機(特に大型機)の後方を通過する場合に、安全に対する配慮を行えること」）、4-3 短距離離陸、5-1-1 基本操作、6-1 低速飛行、6-2 失速とその回復操作、6-3 急旋回（下の 4.3 に中身） |

AC 61-115（Positive Exchange of Flight Controls Program、1995）は、公開されている PDF が画像で本文を読めなかった。S2 の根拠には使わず、AFH と ACS だけで書いた。

## 3. 問題の一覧

### must（0）

なし。事実確認役の M1 は 6 を見てほしい。

### should（12）

**S1　`ops.turns`：急旋回で出力を足すことがない**
- 今の本文：入り方（補助翼・方向舵・少し引く）、戻り、高度が下がったときの直し方、オーバーバンキング傾向はあるが、**出力**の話がない。
- 教官として：45° の急旋回は迎え角が増えて抗力が増え、出力を足さないと速度が落ちる。受験者のよくある失敗は、速度が落ちて高度も保てず、引き続けることだ。ACS（速度 ±10 kt）と JCAB 細則 6-3（速度 ±10 kt）の両方の許容幅に直接かかわる。AFH 第 10 章はよくある間違いに「Ineffective use of power」を挙げ、戻るときに出力とトリムを戻すことも書く。
- 直し方（案）：入り方の段落の後ろに 1 文。「深く傾けると抗力が増えるので、バンクが 30° になるまでに少し引きながら出力を足し、速度を保ちます。戻るときは、引く力・出力・トリムを元に戻します（AFH 第 10 章）。」（約 80 字。key の 3 つめに「出力を足して速度を保つ」を入れてもよい）。出典に `R.afh10` などがなければ足す（章の `refs` に AFH 第 10 章がない）。
- 根拠：AFH 3C 第 10 章 p.10-2〜10-3。ACS 6C PA.V.A.S5。JCAB 細則 6-3。

**S2　`ground.crew`：操縦教員が操縦を取るときの、訓練生の動きがない**〔安全〕
- 今の本文：渡す人から始める 3 段階、返すときも同じ、訓練生は操縦教員が “I have …” と言うまで操縦を続ける、応答がなければ手を離さない。
- 教官として：訓練でいちばん危ないのは、教官が危険を見て急に “I have the flight controls.” と言ったのに、訓練生が握ったまま操縦を取り合う場面だ。今の判断の目「応答がなければ、手を離さずに操縦を続け」だけを覚えると、教官が操縦輪に手をかけたときにも離さない読み方ができる。AFH は「訓練生は教官が I have と言うまで操縦を続ける」と書き、裏返せば、**教官がそう言ったら、すぐに手を離して答える**。ACS 付録 2 も「どの受け渡しでもこの手順」とする。
- 直し方（案）：本文の「返すときも同じです。」の後ろに 1 文。「操縦教員が “I have the flight controls.” と言ったら、すぐに手を離し、“You have the flight controls.” と答えます。操縦を取り合いません。」 判断の目に「操縦教員が I have と言ったら、すぐ離して答える」を足すか、図 `controlHandover` の下の段に 1 行。確認問題を足すなら後ろに（決まり 4）。
- 根拠：AFH 3C 第 1 章 p.1-15、ACS 6C 付録 2。W36 の安全レビューでも見てほしい。

**S3　`ground.day`：飛ぶ前の確かめに「自分の状態」がない**
- 今の本文：ブリーフィング → 書類と情報 → 機体と操縦席。`basics.flight`（序部）にも自分の状態の確かめはない。
- 教官として：訓練の 1 日の最初に確かめるのは操縦士自身だ（IMSAFE）。ACS PA.II.A.K1「Pilot self-assessment」は飛行前の評価の最初の項目で、DESIGN 3.3 の第 2 部の扉も `hf.self` を呼び戻す節に挙げている。眠気・薬・飲酒・ストレスを地上で言える訓練生にしたい。
- 直し方（案）：番号の 0 か 1 に「**自分の状態**：体調・薬・飲酒・睡眠・ストレスを確かめ、飛べないときは言います（${bk.see('hf.self', '自分の状態を確かめる')}）。」（後ろの部ではなく第 1 部へのリンクなので、`forward-see` の上限に響かない）。図 `dayFlow` の ① に「自分の状態」を足す。
- 根拠：ACS 6C PA.II.A.K1・R1、DESIGN 3.3 第 2 部の扉。

**S4　`ground.taxi`：大型機の後ろのジェットブラスト・プロペラの後流がない**
- 今の本文：速さ・ブレーキ・曲がる・見る・風・停止線。
- 教官として：訓練の空港には定期便のジェットがいて、ランプや誘導路で後ろを通る場面が毎日ある。AFH 第 2 章は「軽い飛行機を操縦できなくするおそれ」、AIM 4-3-18 は近い距離での損傷と転覆、4-3-24 は実際に転覆した例を書く。**JCAB の事業用の実地試験は、地上滑走の判定基準に「他機（特に大型機）の後方を通過する場合に、安全に対する配慮を行えること」を入れている**。本の中で、軽い飛行機の側から書いた所がない（`book-5.js` はジェットの側の話）。
- 直し方（案）：「見る」の項目か判断の目に 1 文。「大型機の後ろを通るときや止まるときは、エンジンの噴流やプロペラの後流で機体があおられます。離れて待つか、向きを変えます（米国の AIM 4-3-18・AFH 第 2 章）。」
- 根拠：AFH 3C 第 2 章 p.2-15、AIM 4-3-18・4-3-24、操縦士実地試験実施細則（事業用・1 人）3-2 判定基準 2。

**S5　`ground.taxi`：思い込み（expectation bias）が本文にない**
- 今の本文：下書きの頭のコメントは「judgement: … expectation bias (AFH chapter 2)」と書くが、本文・判断の目・折りたたみのどこにもない。`comm.runway` にもない。
- 教官として：毎日同じ経路を言われる訓練校では、「いつもの経路」と思い込んで違う誘導路へ曲がるのが典型の誤進入だ。ACS は PA.II.D.R2 に「Confirmation or expectation bias as related to taxi instructions」を挙げる。
- 直し方（案）：最初の段落の後ろに 1 文。「いつもの経路だと思い込まず、言われた経路を図の上でたどってから動きます。同じ指示が続くと、違う指示を聞き落としやすくなります（AFH 第 2 章）。」
- 根拠：AFH 3C 第 2 章 p.2-19、ACS 6C PA.II.D.R2。

**S6　`ops.climb`：長いパワーオフの降下の前の、キャブレターヒーターがない**〔安全に近い〕
- 今の本文：「降下：出力を下げると機首が下がり、…降下率は出力で決めます。」
- 教官として：気化器式の Archer では、出力を絞った長い降下が気化器着氷のいちばん多い場面だ（フロリダの湿った空気で、晴れていても起きる）。POH 4.5l は、着氷が疑われるときは**出力を絞る前に**キャブレターヒーターを全開にし、30 秒ごとに出力を確かめるとする。住所は `sys.carb`（「長い降下の予防」の行がある）。
- 直し方（案）：降下の段落の後ろに、呼び戻し（3 行以内）。`bk.recall('出力を絞った長い降下は、気化器着氷が起きやすい場面です。着氷が疑われるときは、出力を絞る前にキャブレターヒーターを入れます（POH 4.5l）。', ['sys.carb', '気化器着氷'])`。燃料噴射式（IO-360）の機体では要らないことは `sys.carb` が書いている。
- 根拠：POH VB-2266 4.5l、`sys.carb`。

**S7　`ground.start`：ACS-MAP が対応させた「いろいろな条件での始動」「外部電源の始動」がない**
- 今の本文：冷えたエンジンの始動（プライマー「要れば」・寒い日は油圧が数秒長く）だけ。ACS-MAP は PA.II.C.K1（Starting under various conditions）と K2（Starting the engine(s) by use of external power）を `ground.start` だけに対応させ、status は mapped。
- 教官として：熱いエンジン（気化器の燃料が蒸発してかかりにくい）と燃料過多（かぶった）の始動は、訓練生が最初の 10 時間で必ず出会う。外部電源の始動は、バッテリーが上がった日の判断（発電が確かめられなければ飛ばない）と結び付けて教えたい。
- 直し方（案）：折りたたみ「スターターの使い方と…」に 3 行。「熱いエンジン：チェックリストの手順で、スロットルを少し多めに開き、プライマーは使わないことが多い（Archer III の POH の例は 1/2 in）。燃料過多：スロットル全開・燃料ポンプ OFF・ミクスチャー IDLE CUT-OFF でスターターを回し、かかったらミクスチャーを進めてスロットルを戻す。外部電源：POH の手順でつなぎ、始動のあと外して、オルタネーターの発電を電流計で確かめる。発電が見られなければ飛ばない（POH 4.5d）。」 数はチェックリストと POH の値（主張の行を足す）。
- ついでに：POH 4.5d は**左のマグネトーだけで始動し、かかってから右を ON** にする。チェックリストの要約「マグネトー … ON」と違うので、折りたたみの順番が訓練校のチェックリストの順であることは今のとおり書いておき、POH と違うことに一言触れるとよい（nit 相当）。
- 根拠：ACS 6C PA.II.C.K1・K2、POH VB-2266 4.5d、チェックリスト STARTING ENGINE・WHEN FLOODED。

**S8　`ops.climb` の折りたたみ「上昇の速度の名前と、滑空」：最良滑空と最小沈下を 3 か所目で教えている**
- 今：`aero.power`（目的別の最良速度）が住所の 1 つで、`emg.glide`（p2b）も最良滑空速度と最小沈下速度を定義する。`ops.climb` の折りたたみが 3 回目の説明で、事実確認役の M1（重さで届く範囲が変わる、という誤り）もここにある。
- 直し方（案）：滑空の段落を消し、1 行の呼び戻しにする（`bk.recall('最良滑空速度と最小沈下速度は目的が違います。', ['aero.power', '必要馬力・逆操作域・目的別の最良速度'])` など）。M1 を直す手間もなくなり、折りたたみの量も減る。
- 根拠：DESIGN 3.5（1 つの概念に 1 つの名前と住所）・基準 15、`aero.power`・`emg.glide`。

**S9　`ops.stall`：`aero.stall` と同じことを、まず読む本文でもう一度教えている**
- 今：最初の段落（臨界迎え角で失速・荷重で失速速度が上がる・迎え角が第一・事故）、二次失速の太字の定義、自動操縦を先に切る文、考えてみよう（失速中に補助翼で翼を上げる害）は、どれも `aero.stall` にある（二次失速は名前の表、補助翼の害は折りたたみ、自動操縦は回復の型の前の文）。
- 教官として：`ops.stall` は「飛ぶ節」なので、4 段階（テストが固定）と、実機で何を感じて何をするかに絞った方が、復習の順として分かりやすい。
- 直し方（案）：最初の段落を 3 行の呼び戻し（`aero.stall`）に。「二次失速」は太字をやめる（住所は `aero.stall`）。考えてみようは `aero.stall` にない場面に替える（例：パワーオン失速で出力が高いまま左へ偏向するのを方向舵で止める、回復で出力を足すと機首が上がるのを押さえる）。まず読む本文が 150 字ほど減り、S1〜S6 で足す分の一部を埋められる。
- 根拠：基準 15、`aero.stall`（`book-1.js`）。

**S10　`ops.stall` の折りたたみ：「練習機で使わない 2 つは、最初に自動操縦を切ること…」**〔安全に近い〕
- 今の文：「AFH の 6 段階のうち、練習機で使わない 2 つは、最初に自動操縦を切ることと、スピードブレーキを戻すことです。」
- 違い：AFH は「**自動操縦のない**単発の練習機は 4 つ」と書く。Archer III の POH では自動操縦は選んで付ける装備で（補足 2）、本の `inst.ap` も Archer の自動操縦を教えている。自動操縦を付けた練習機で切り忘れるのは、AFH のよくある間違いに挙がる。本文の「自動操縦のない単発の練習機では」と図の下の注は正しいので、折りたたみだけが一般化しすぎている。
- 直し方（案）：「自動操縦もスピードブレーキもない練習機で使わない 2 つは、…です。自動操縦を付けた機体では、最初に必ず切ります。」
- 根拠：AFH 3C 第 5 章（6 段階の後の段落・よくある間違い 9）、POH 補足 2、`inst.ap`。

**S11　`ground.crew` の折りたたみ：権威勾配を 3 か所目で定義している**
- 今の文：「操縦教員と訓練生の間には、立場の差があります。この差を権威勾配（authority gradient）といいます。」
- 今の本：`en.class`（序部）の折りたたみが権力格差と区別して「権威勾配は、その場のチームの中で、決める力がどれだけ 1 人に集まっているか」と定義し、住所の `crm.crm`（第 6 部）へ予告している。`ground.crew` の定義は言い方が違い（「立場の差」）、3 つ目の定義になる。
- 直し方（案）：「…といいます」をやめ、語は使うが定義しない形に（「操縦教員と訓練生の間の権威勾配（authority gradient）が急だと、気づいた危険を言い出しにくくなります」）。また `en.class` の予告「操縦教員と訓練生の間の権威勾配と、懸念の伝え方は（第 6 部）で学びます」は、懸念の伝え方が `ground.crew`（第 2 部）に来たので、行き先を `ground.crew` にするとずっと近くなる（`en.class` の持ち主への頼み。`forward-see` の数は変わらない）。CONCEPTS に行 `C.authority-gradient`（住所 `crm.crm`、呼び戻す節 `en.class`・`ground.crew`）を足す案。
- 根拠：基準 15、`en.class`（`book-0.js`）、DESIGN 3.3 の `ground.crew` の行（「crm.crm の権威勾配」）。

**S12　JCAB の実地試験の低速飛行・失速・急旋回：`FL.jur` の日本の欄を埋められる一次資料がある**（W06・W37 への頼み。下書きは直さない）
- 今：`ops.slow`・`ops.stall` の囲み `check.slow`・`check.stall` の日本の欄は「操縦士実地試験実施細則の…は〔要確認〕」（`UNVERIFIED` の `U.check-slow`・`U.check-stall`、owner: true・W37）。
- 見つけたもの：操縦士実地試験実施細則 事業用操縦士（１人で操縦できる飛行機）、令和 8 年 5 月 8 日最終改正（2 の表の URL）。中身は 4.3 の表。ACS と次の点が違い、日本へ帰る訓練生には大事な違いになる。
  - **低速飛行**：「操縦可能な最小速度」で、**巡航形態**で水平直線・90° の上昇旋回・90° の降下旋回。高度 ±50 ft・速度 **＋10／−5 kt**・針路 ±10°（ACS は「警報が鳴る手前・警報を鳴らさない」・+10/−0 kt）
  - **失速**：①進入形態・パワーオンの**旋回中の初期失速**、②着陸形態・パワーオフの直線の完全な失速。判定は兆候の察知・二次失速なし・著しく不安定な姿勢にならない（高度の基準はない。決め 11 と同じ向き）
  - **急旋回**：傾斜角 45° で**左右の 360° を続けて**。高度 ±100 ft・速度 ±10 kt・針路 ±10°（止めるとき・切り返すとき）・傾斜角 ±5°
- 頼み：W06（`FL.jur` の持ち主）と W37（`UNVERIFIED`）が、どの細則（自家用か事業用か）をこの本の日本の欄に使うかを決めて、`check.slow`・`check.stall` の `jp`・`jpSrc` を埋める。急旋回は `FL.jur` に項目がない（DESIGN 3.4 の表にもない）ので、`check.steep` を足して `ops.turns` に囲みを置くかを DESIGN の持ち主が決める。私は自家用の細則は読んでいない。`check.short`（細則 4-3：製造者のフラップ・最良上昇角速度で浮揚・対地 200 ft まで最良上昇角速度）と `check.basic`（5-1-1：高度 ±100 ft・速度 ±10 kt・針路 ±10°）も同じ資料で埋められる。
- 根拠：操縦士実地試験実施細則（事業用・1 人）Ⅱ－２ 4-3・5-1-1・6-1・6-2・6-3。

### nit（13）

| # | 場所 | 中身と直し方（案） |
|---|---|---|
| N1 | `ground.taxi`（と `p3.js`） | airport diagram の日本語が「飛行場の図」。登録済みの `comm.runway` は「空港の図（airport diagram：…）」。どちらかにそろえて `FL.terms` に足す（W04・W24）。 |
| N2 | `ground.walk` | 報告 W28-p2a は「見落とさない 5 つ」に「操縦翼面」を挙げるが、本文の 5 つは書類・霜・燃料・オイル・ピトー管で、操縦翼面と**操縦輪のロック**は折りたたみの中だけ。ロックの外し忘れは今も起きる事故なので、5 つのどれかに「操縦輪のロックを外し、舵が自由に動く」を入れるか、報告の記述を本文に合わせる。（離陸前は `ground.runup` の表が捕まえるので、安全上は二重の網になっている） |
| N3 | `ground.taxi` の key 4 | 「管制塔のある空港では、停止線を許可なしに越えない」だけだと、管制塔のない空港の停止線の扱いが読めない。AIM 2-3-5 は停止線を「滑走路に近づくとき止まる所」とする。「管制塔のない空港でも停止線で止まり、ファイナルと滑走路の両方向を見てから」を一言（住所は `comm.ctaf` などの呼び戻しで）。 |
| N4 | `ops.ground` の折りたたみと key 3 | 米国の 14 CFR 91.119 を 2 回書く。日本の値も持つ囲み `msa` は `law.rules` にあるので、key は「最低安全高度は ${law.rules への呼び戻し}」にすると、日本の読者にも両方が届く。 |
| N5 | `ops.slow` の ACS の表 | ACS は低速飛行で「指定の形態で、直線水平・旋回・上昇・降下」を求める（PA.VII.A.S4）。表の「低速飛行（自家用 ACS）」の条件に一言足す。 |
| N6 | `ops.turns` の表 | ACS の急旋回は「反対の向きにも」（PA.V.A.S4）。JCAB は左右を続けて行う（S12）。表に「反対の向きも」を足す。 |
| N7 | 考えてみようと確認問題 | `ops.climb` の考えてみよう（500 fpm・3,050 ft）と章末 Q1 が同じ問・同じ数。`ground.walk` の考えてみよう（サンプの水の玉）と Q4、`ground.runup` の考えてみよう（左 100・右 200）と例も同じ。章末の問は動かせない（決まり 4）ので、考えてみようの数を替える（例：800 fpm で上昇して 4,500 ft → 約 4,420 ft）。 |
| N8 | `ops.energy` の位置 | DESIGN 3.3 の順（`ops.trim` の次）に置いたので、まだ学んでいない進入・フラップ・着陸復行（第 23 章）を例に使っている。例をレベルオフと降下に寄せ、進入の例は `ops.landing` 側の呼び戻しで使う方が、初めて読む人に分かりやすい（順を変えるなら DESIGN の持ち主）。 |
| N9 | `ops.turns`・`ops.slow`・`ops.energy` | 45° で 1.41 G・失速速度 19% 増（`aero.turn`）、逆操作域で機首の小さな動きが抗力を大きく変える（`aero.power`）、全開でも上がれないとき（`aero.power`）の説明は、住所の節の繰り返し。`bk.recall` の形にすると基準 15 にそろう。 |
| N10 | ACS-MAP | PA.I.B.K3（動かない装備・MEL・KOEL・表示）は `ground.walk` に対応しているが、中身は `ground.day` の折りたたみにある。PA.II.D.K4（風の目に見える目印＝吹き流し）は `ground.taxi` に対応しているが、本文に吹き流しがない。W42 で対応を直すか、`ground.taxi` に一言。 |
| N11 | `ground` の cautions | 「ANA・Acron Aviation の SOP ではありません」は今の `book-3.js` のままの文だが、DESIGN 6.2 の決まり 10（第 1〜6 部の本文に実名を書かない）に当たる。今のテストは通るので、統合役か W50 が扱いを決める。 |
| N12 | `ops.slow` と課目 a6 | 本文は「失速警報が鳴る少し手前の遅い速度」、AFH は「1 G の失速速度の 5〜10 kt 上」が目安。課目 a6 の帯 58〜68 kt（フラップ 25°）は、上の端が POH の失速速度（45〜50 KIAS）より 18 kt 以上速い。教材の簡略化なら `bk.sim` に一言（課目の持ち主）。 |
| N13 | `ground.start` の JCAB の見出し | `cpl.1.4.1.8`・`ppl.1.2.6.8`「始動系統の機能」は `sys.engine` の 1 文（バッテリーの電気でスターターがクランク軸を回す）と `ground.start` の操作だけ。START ENGD が何を知らせるか（スターターがつながったまま＝エンジンに回されて壊れる）を 1 文足すと、JCAB の「機能」に答えられる（W42 で深さを確かめる）。 |

## 4. ACS・JCAB の見出しごとの確かめ

### 4.1 ACS（自家用 6C。`ground.*`・`ops.*` を節に持つ行）

| 行 | 本文で答えられるか | 備考 |
|---|---|---|
| PA.I.B.K3 | △ | 中身は `ground.day` の折りたたみと `law.aircraft`（N10） |
| PA.II.A.K1 | ✕（この 2 章） | `hf.self` が住所。`ground.day` から呼び戻していない（S3） |
| PA.II.A.K2・K3（a〜d） | ○ | 点検する所・理由・見つけ方・規則（91.7・91.203・91.9） |
| PA.II.A.K4 | ○ | `ground.day`（天気・ノータム）と `wx.brief`・`adm.risk` |
| PA.II.B.K1・K4 | ○ | `ground.day`（同乗者への説明・物の固定） |
| PA.II.C.K1 | △ | 冷えたエンジンだけ。熱い・燃料過多がない（S7） |
| PA.II.C.K2 | ✕ | 外部電源の始動がない（S7） |
| PA.II.C.K3・K4 | ○ | スターターの 10 秒・2 分・5 回、油圧 30 秒・START ENGD・始動時の火災 |
| PA.II.D.K1〜K3・K5・K6 | ○ | `ground.taxi` と呼び戻しの `comm.runway`（ホットスポット・視程の悪い滑走は `comm.runway`、夜は `ops.night`）。R2（思い込み）は ✕（S5） |
| PA.II.D.K4 | △ | 吹き流しがない（N10） |
| PA.II.F.K1 | ○ | 表の「何を見ているか」の列 |
| PA.IV.A.K2 | ○ | `ops.climb` の表と `perf.climb` |
| PA.IV.B/D/F/M/N.K1・PA.IX.B.K4・IR.VI.A.K4 | ○ | `ops.energy`（安定した進入の定義は `ops.landing`） |
| PA.V.A.K1 | △ | 出力を足すことがない（S1）。反対の向き（N6） |
| PA.V.B.K1〜K4 | ○ | 長方形コースと場周経路の関係は表に |
| PA.VII.A.K1 | ○ | `ops.slow` と `aero.power` |
| PA.VII.B/C.K1・K3・K4 | ○ | `ops.stall` と `aero.stall` |
| PA.XII.A.K1・K2・IR.VIII.A.K1 | ○ | `ground.after` |

### 4.2 JCAB の学科の出題範囲（`ground.*`・`ops.*` を節に持つ行）

| 行 | 本文で答えられるか | 備考 |
|---|---|---|
| ppl・cpl.1.1.1.7 操縦性（保舵力とトリム） | ○ | `ops.trim`（と `aero.axes`・`sys.ctl`） |
| ppl.1.2.6.8・cpl.1.4.1.8 点火系統と始動系統 | △ | 始動系統の「機能」は 1 文だけ（N13） |
| ppl・cpl.4.2.6.*・ir.7.2.6 後方乱気流 | — | `ops.wake` は p2b の持ち物（この 2 章の範囲の外） |

### 4.3 JCAB の操縦士実地試験実施細則（事業用・1 人、令和 8 年 5 月 8 日最終改正）の科目と、この 2 章

| 細則 | 中身（要旨） | この 2 章 |
|---|---|---|
| 2-4 飛行前点検 | 外部点検・内部点検。点検中に諸系統と諸装置について質問に答える。積載物を含め安全への配慮 | ○ `ground.walk`（理由つき）・`ground.day`（物の固定） |
| 3-1 始動・試運転 | チェックリストを含め飛行規程などの手順どおり、出発前の確認を完了。制限事項の厳守 | ○ `ground.start`・`ground.runup`（スターター・片マグ 10 秒・マグネトーの限度） |
| 3-2 地上滑走 | 適切な速度と出力。**他機（特に大型機）の後方を通過する場合の配慮** | △ 後流がない（S4） |
| 6-1 低速飛行 | 操縦可能な最小速度・巡航形態で水平直線・90° 上昇旋回・90° 降下旋回。高度 ±50 ft・速度 ＋10／−5 kt・針路 ±10° | ✕ 囲み `check.slow` の日本の欄が〔要確認〕（S12） |
| 6-2 失速と回復操作 | 進入形態・パワーオン・旋回中の初期失速と、着陸形態・パワーオフ・直線の完全な失速。兆候の察知・二次失速なし・著しく不安定にならない | ✕ 囲み `check.stall` の日本の欄が〔要確認〕（S12） |
| 6-3 急旋回 | 傾斜角 45° で左右の 360° を続ける。高度 ±100 ft・速度 ±10 kt・針路 ±10°・傾斜角 ±5° | ✕ 囲みの項目がない（S12・N6） |

数は細則の文のまま写した。本に入れるときは `FL.jur` からだけ描く（DECISIONS・STYLE）。

## 5. 1 つの概念・1 つの住所

| 概念 | 今の住所 | この 2 章で | 勧め |
|---|---|---|---|
| 操縦の受け渡し | `ground.crew`（C.control-handover） | 太字の定義 | `crm.pm` を呼び戻しに（W32。W28 の報告のとおり） |
| 権威勾配 | `crm.crm`（`en.class` も定義） | `ground.crew` で 3 つ目の定義 | S11 |
| 失速と回復・二次失速 | `aero.stall` | `ops.stall` で最初の段落・太字・自動操縦・補助翼の害を繰り返す | S9 |
| 最良滑空・最小沈下 | `aero.power`（と `emg.glide`） | `ops.climb` の折りたたみで 3 つ目（誤りつき） | S8 |
| 荷重倍数・逆操作域 | `aero.turn`・`aero.power` | 1 文ずつの繰り返し | N9 |
| マグネトーの点検の原理 | `sys.engine`（C.mag-check） | 呼び戻し（3 行以内） | このままでよい |
| 滑走路の許可の区別 | `comm.runway`（C.runway-clearances） | 呼び戻し | このままでよい |
| 気化器着氷 | `sys.carb` | 降下の所にない | S6 で呼び戻しを置く |
| 最低安全高度 | `law.rules`（囲み `msa`） | 14 CFR 91.119 を 2 回 | N4 |

## 6. 事実確認役の指摘への意見

| 指摘 | 意見 |
|---|---|
| M1（滑空で届く範囲は重さで変わらない） | 賛成。私は段落ごと `aero.power` へ返すことを勧める（S8） |
| S1（耐空証明の掲示に国がない） | 賛成。日本の航空法第 59 条は備え付けだけ |
| S2（`ground.taxi` の判断の目の出典） | 賛成。前の文に「段階ごとの地上滑走の指示（progressive taxi）を頼める（米国の AIM 4-3-18）」を足す案がよい。私の S5 と同じ所に入れられる |
| S3（`ground.day` の「計算し直す」の出典） | 賛成。(a) 括弧を外す、でよい |
| S4（離陸ブリーフィングに高さがない）〔安全に近い〕 | 賛成。教官の目でも、例に「（決めた高さ）より低ければ」を入れ、高さはその機体・飛行場・操縦教員と決めると書くのがよい。ACS PA.II.F.R4 も「滑走路の長さ・地表・環境・障害物を考えた離陸中のエンジン故障」を求める。W36 で見てほしい |
| N1〜N12 | 賛成（N6 の「ショックストラット」、N11 の記述問題の言い換えは、とくに直してほしい） |

## 7. 安全の目で見た点

- 〔安全〕に当たる文は、`ops.stall`（迎え角が第一・意図的なスピンの禁止・決め 11 の注記）・`ground.start`（始動時の火災・油圧・P リード）・`ground.runup`（離陸ブリーフィング）・`ground.taxi`（迷ったら止まる）。どれも一次資料と合っていて、危ない書き方はない。
- 直してほしい安全の点は、S2（操縦を取るときの訓練生の動き）・S6（降下のキャブレターヒーター）・S10（自動操縦を切る段階）と、事実確認役の S4（離陸ブリーフィングの高さ）。S4 は W36 の安全レビューの対象。
- 決め 11 の扱い（高度の損失を合否に使わない）は、`ops.stall` の `bk.sim` で守られている。JCAB の細則 6-2 にも高度の基準がない（S12）ので、日本の欄を埋めても矛盾しない。

## 8. 検査と結果

| 検査 | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p2a-figs.js textbook/rewrite/combined/drafts/p2a.js`（Chromium あり） | **error 0・warn 26・info 17**。W28 と事実確認役の報告と同じ：style warn 9（first-use-form：囲みの語 8・`attitudePower` の札 1）、volume warn 1（p2a だけを読むと部 p2 が予算超え）、questions warn 1（正解の位置）、concepts warn 1（操縦の受け渡しの太字が `crm.pm` にも）、claims warn 14（台帳に行がまだない）。ほかは 0 |
| FLIGHT LAB `npm run -s test:fast` | **91 / 91 pass** |
| TEXTBOOK `npm test` | **38 / 38 pass** |
| CADET `npm run -s test:fast` | **249 / 249 pass** |

製品は下書きを読まないので、この単位（報告だけ）で結果は変わらない。

**量（決め 12）について**：p2 は p2b と合わせて 39,560 / 39,600 字で余裕が 40 字しかない。S1〜S6 をまず読む本文に入れると約 400 字増える。S9（`ops.stall` の最初の段落を呼び戻しに・約 150 字減）、N9（繰り返しを呼び戻しに）、S8（折りたたみの段落を消す）で一部を埋め、残りは S7 のように折りたたみへ入れるか、判断の目の文と入れ替える。足す文の置き場所は直し役が `check-volume.mjs` で確かめてほしい。

## 9. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/expert-p2a.md`（新） | この報告 |

ほかのファイル（下書き・台帳・製品・`flight-lab/kiso/`）は変えていない。git の操作はしていない。

## 10. 台帳の行（触っていない。提案だけ）

- **CONCEPTS**：新しい行 `C.authority-gradient`（概念：権威勾配、住所 `crm.crm`、呼び戻す節 `en.class`・`ground.crew`）を足す案（S11）。`C.control-handover` は W28 の報告のとおり `crm.pm` 待ち。
- **UNVERIFIED**：`U.check-slow`・`U.check-stall`・`U.check-short`・`U.check-basic` は、操縦士実地試験実施細則（事業用・1 人、令和 8 年 5 月 8 日最終改正）で `resolved` にできる見込み（`value`・`sourceUrl`・`checkedOn`）。どの細則を使うか（自家用か事業用か）を決めてから、W37 と W06 が閉じる（S12）。
- **ACS-MAP**：PA.II.C.K1・K2 は `ground.start` が書くまで status を mapped のままにしない方がよい（S7）。PA.I.B.K3 の節に `ground.day`、PA.II.A.K1 の節に `ground.day`（S3 を入れたら）を足す案。PA.II.D.K4 は N10。
- **CLAIMS**：S1・S4〜S7 で数や出典の文を足すと行が増える（POH 4.5d・4.5l、AFH 第 2・10 章、AIM 4-3-18）。

## 11. 未解決のこと

1. AC 61-115 の本文は読めなかった（画像の PDF）。S2 は AFH 第 1 章と ACS 付録 2 だけで書ける。
2. 自家用の操縦士実地試験実施細則は読んでいない。本の日本の欄に自家用と事業用のどちらを使うかは W06・W37 と DESIGN の持ち主（S12）。
3. 急旋回の日本の囲み（`check.steep`）を足すかは、DESIGN 3.4 の表の変更になる（S12）。

## 12. ほかの単位にお願いしたいこと（needs from others）

1. **W28-p2a（または `ground`・`ops` の直し役）**：S1〜S11 と N1〜N9・N12・N13 を `drafts/p2a.js`・`drafts/p2a-figs.js`（S2・S3 の図）・`drafts/p2a.claims.json` に。事実確認役の M1・S1〜S4 と一緒に直すと、`ops.climb`（M1・S8）と `ground.taxi`（事実確認の S2・私の S4・S5）が 1 回で済む。量は 8 の終わり。
2. **W06（`FL.jur`）・W37（`UNVERIFIED`）**：S12。`check.slow`・`check.stall`（と `check.short`・`check.basic`）の日本の欄を、操縦士実地試験実施細則で埋める。使う細則を決める。
3. **DESIGN の持ち主**：S12 の `check.steep`（急旋回の日本の囲み）を 3.4 の表に足すか。N8 の `ops.energy` の位置。
4. **`en.class` の持ち主（W10 か統合役）**：S11。予告「操縦教員と訓練生の間の権威勾配と、懸念の伝え方」の行き先を `crm.crm` から `ground.crew` に。
5. **W04・W24（用語）**：N1 の「飛行場の図」と「空港の図」。
6. **W42（ACS・JCAB の対応表）**：10 の ACS-MAP の案、N10、N13 の深さ。
7. **W32（`crm`）**：`crm.pm` の受け渡しの太字を呼び戻しに（W28 の報告と同じ）。`crm.crm` を権威勾配の住所として、`ground.crew` を呼び戻す側に数える（S11）。
8. **課目の持ち主（`syllabus.js`）**：N12 の a6 の帯の説明。
9. **統合役か W50**：N11 の cautions の実名。
10. **W36（R3 の安全レビュー）**：S2・S6・S10 と事実確認役の S4 の直した文。
