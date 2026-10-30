# 専門家の読みの報告：第 1 部 第 6 章 `sys`「機体・エンジン・系統（Archer）」（W14 の下書き・R2）

単位：expert-sys（W14 の章の専門家の読み手）。読んだ日：2026-10-30。
立場：飛行教官（FAA の CFI・CFII・MEI）で、JCAB の学科（自家用・事業用の航空工学）の出題範囲も知っている読み手として読んだ。

読んだもの：
- 下書き：`textbook/rewrite/combined/drafts/sys.js`（12 節・章末）、`drafts/sys-figs.js`（新 5・描き直し 4）、`drafts/sys.claims.json`
- 報告：`reports/W14.md`・`factcheck-sys.md`・`reader-sys.md`・`expert-aero.md`
- 台帳：`ledgers/ACS-MAP.json`・`JCAB-MAP.json`・`CONCEPTS.json`
- 決まり：DESIGN 3.3（第 6 章の行）・3.4・6.2・7.2、DECISIONS、STYLE、`FL.terms`
- 比べた他の章：`drafts/aero.js`（`aero.struct`）・`drafts/inst.js`（`inst.pfd`）・`drafts/perfwb.js`（`perf.tol`・`perf.range`・`perf.plan`）・`drafts/wx.js`（`wx.ice`）・`drafts/law.js`・`drafts/radio.js`・`drafts/hfadm.js`、今の `flight-lab/src/book-1.js`（`sys.lights`）・`book-3.js`（`ground.start`・`ground.runup`・`emg.abnormal`）

**下書きは変えていない**（読み手の役目：直さない）。変えたファイルはこの報告だけ。

## 1. 結論

教官の目で見て、よく書けた章です。正確さの土台はしっかりしています（事実確認役が 79 行の値を全部一次資料で確かめ、私も主な所を取り直して読みました）。特に次の 5 つは、実地の口述でそのまま使える質です。
- 油量・油圧・油温・EGT・燃料消費率の「測るもの／分からないこと」の表
- P リードとプロペラの扱い
- ブレーカーを戻す 4 つの条件（SAIB CE-10-11）
- オーバースクエアの考え方は限界の決まりではない、という段落
- 燃料の収支の計算演習

数：**must 2・should 15・nit 14**。事実確認役・初学者の読み手と重なるものは 6 に書きました。重なりで重さを上げたもの（X-M1）は数に入れています。

- **must**
  1. **X-M1**〔安全〕`sys.carb`：気化器着氷の対処の書き方が、Archer の POH 3.5j・3.5k と同じ本の `emg.abnormal`（第 2 部）の両方と食い違っている。食い違いは 2 つ。
     - 本文は「ふつうの出力が戻るまで待つ（30 秒〜数分）」。POH と `emg.abnormal` は「1 分たっても荒れが続けば、ヒーターを戻して次の項目へ」。
     - POH の「ミクスチャーを最もなめらかに」の手順が本文にない。
     - 事実確認の S1 を、2 か所で手順が違うことを理由に must に上げる。
  2. **X-M2**〔安全〕`sys.lights`（本文・ここが大切・図 `positionLights`）：「白い灯だけが見えたら、相手は同じ向きへ**遠ざかっている**」。
     - AFH 第 11 章は「同じ向きに飛んでいる。間隔を保つよう注意」と書く。こちらが速ければ近づく（追い越し）。
     - ACS PA.XI.A.K7（灯火だけで相手の位置と向きを読む）がそのまま問う所で、読み違えると衝突の回避の判断を誤る。
     - 今の `book-1.js` から残っている文。
- **should の主なもの**：
  - 油圧が失われたときの POH 3.5c の要点の不足〔安全〕
  - 長いパワーオフの降下の 30 秒ごとのクリアリングと、水平に戻ったらヒーターを切ること〔安全〕
  - 着陸の滑走のブレーキの理由（POH 4.5m）
  - Archer の接地の速度ならハイドロプレーニングが起こりうること
  - ベーパーロックの原因とプライマー（JCAB の例題）
  - 無色の抜き取りは水のこともあること
  - トリムタブとアンチサーボタブの向きの違いとマスバランス（JCAB 例題。expert-aero の E-S9 の住所を `sys.ctl` に決める案）
  - Seminole には気化器式の年式もあること（Lycoming の資料）
  - 夜の装備 91.205(c) と地上での灯火（ACS）
  - ヒューズと蓄電池
  - 潤滑・検出方式・燃料の等級・構造・電波の伝わり方の JCAB の見出し
  - 気化器のヒーターの住所を 1 つにすること

## 2. 確かめた一次資料（2026-10-30）

事実確認役（factcheck-sys）がこの日に出典の URL から取り直した写しを、同じスクラッチのフォルダで読んだ。ほかは自分で取得した。下書きの出典表にない資料は、根拠として名前を書いている。

- Piper PA-28-181 Archer III POH VB-2266（2013、R.archerPoh）：
  - 3.5c（Low Oil Pressure の本文：「Maintain altitude until such time as a dead stick landing can be accomplished. Don't change power settings unnecessarily … it may be advisable to make an off airport landing while power is still available, particularly if other indications of actual oil pressure loss, such as sudden increases in temperatures, or oil smoke, are apparent, and an airport is not close.」）
  - 3.5j（CARB HEAT ON・MIXTURE Adjust for Maximum Smoothness）
  - 3.5k（FULL ON → 「If roughness continues after one min: CARB HEAT OFF」→ MIXTURE・FUEL PUMP・タンク・計器・マグネトー）
  - 4.5b（始動：30 秒以内に油圧、スターターは 10 秒・2 分休み・5 回、START ENGD）
  - 4.5l（Descent：「Power response should be verified approximately every 30 seconds by partially opening and then closing the throttle (clearing the engine). When leveling off enrichen mixture, set power as required and select carburetor heat off unless carburetor icing conditions are suspected.」）
  - 4.5m（「After ground contact hold the nose wheel off as long as possible. As the airplane slows down, gently lower the nose and apply the brakes. Braking is most effective when flaps are raised and back pressure is applied to the control wheel, putting most of the aircraft weight on the main wheels.」、全開でヒーターはデトネーション）
  - 4.7（全フラップ・最大重量の失速速度 45 KIAS）
  - 7.11（キャブレターヒーターの位置）
  - 7.15（「An electric engine priming system is provided … The primer switch is located right of the starter switch in the overhead switch panel」、浮き式の燃料センサー）
  - 7.17（翼端の着陸灯 2 つ）
  - 4.5a（外部点検の Oil CHECK QUANTITY・Dipstick）
  - 8.19（Oil Requirements：「The oil capacity of the engine is 8 quarts and the minimum safe quantity is 2 quarts」、気温ごとの等級、MIL-L-6082B・MIL-L-22851）
- FAA PHAK FAA-H-8083-25C：
  - 第 3 章（Truss・Monocoque・Semimonocoque・firewall）
  - 第 6 章（Trim Tabs：「trim tabs on elevators move opposite of the control surface」、Balance Tabs、Servo Tabs、Antiservo Tabs、スタビレーターの「balance weight … in front of the main spar」、T 尾翼のフラッター）
  - 第 7 章：
    - 気化器のヒーター：「Periodically, open the throttle smoothly for a few seconds to keep the engine warm」「sometimes up to 15 percent … This enriches the mixture」
    - 燃料噴射：「less susceptible to icing … impact icing … a possibility」
    - 点火：「“no drop” in rpm is not normal, and in that instance, the aircraft should not be flown」
    - 潤滑：wet-sump と dry-sump、始動で油圧、高い油温の原因、shock cool
    - 燃料：Fuel Primer、Fuel Grades（「octane or performance number (grade), which designates the antiknock value」「use the next higher grade as a substitute」、自動車の燃料は STC がなければ使わない）、水の見分け方と「Fuel tanks should be filled after each flight … to prevent moisture condensation」、Jet fuel の「distinctive kerosene smell」
    - 電気：「Fuses or circuit breakers … Spare fuses … should be carried」、ディーゼルの PA-28
  - 第 11 章（Dynamic Hydroplaning：「Landing at higher than recommended touchdown speeds exposes the aircraft to a greater potential for hydroplaning」「landing into the wind. Abrupt control inputs should be avoided … aerodynamic braking should be used to its fullest advantage」）
- FAA AFH FAA-H-8083-3C：
  - 第 2 章（「The switches that control the magnetos operate on the principle of short-circuiting the current … If the switch is faulty, it can be in the “off” position and still permit current to flow」、Engine Shutdown の「Magneto Switch Test—momentarily check for proper grounding in the OFF position at idle rpm」）
  - 第 11 章（「the red light is on the left and the green to the right, the airplane is flying the same direction. Care must be taken to maintain clearance.」、91.205(c)）
- 14 CFR 91.205(c)（eCFR、2026-10-01 の版を自分で取得）：position lights、anticollision light system、for hire なら landing light 1、adequate source of electrical energy、spare fuses
- AIM 4-3-24 Use of Aircraft Lights（地上走行の前・滑走路を横切るとき・line up and wait・離陸の許可で着陸灯）
- FAA-H-8083-31A AMT Airframe Vol. 2（R の `amtAirframe2` と同じ PDF）：
  - 第 10 章（Bourdon tube、Electrical Resistance Thermometer、Thermocouple：「common applications are the measurement of cylinder head temperature (CHT) in reciprocating engines」）
  - 第 11 章（Static Discharge Wicks：「caused by corona discharge emitted from the aircraft as a result of precipitation static」）
- Lycoming SSP-110-3 Certified Engines（2025-07）：PA-44-180 Seminole の欄に、気化器式の O-360-A1H6・LO-360-A1H6・O-360-E1A6D・LO-360-E1A6D と燃料噴射式の LIO-360-B1G6、PA-44-180T に TO-360-E1A6D
- Piper Trainer Brochure 2026（R.piperTrainer）：今の Seminole は（2）IO-360-B1G6、今の Archer は IO-360-B4A・Garmin G5 の予備計器
- SAIB CE-10-11（「Revise the preflight checklist … do not reset the circuit breaker if there is a related maintenance malfunction」）
- JCAB「出題範囲参考」自家用・事業用（飛行機）（`ledgers/src/sources/mlit/`）と「例題集」2026 年 6 月（`FL.terms` の `reiPPL`・`reiCPL` の URL の PDF。sha256 が `book-terms.js` の値と一致）：
  - 自家用：例題 11（前輪式の特徴：ノーズ・オーバ、グラウンド・ループ）・12（ベーパ・ロックの原因）・14（プライマ系統、高翼と低翼の燃料供給）・15（ボンディング・ジャンパ）・16（VHF 通信）
  - 事業用：例題 7（トリム・タブの動く向き）・10（マス・バランス）・13（ベント・ライン）・15（滑油の作用）・16（電池）・17（電離層）・18（ベーパ・ロック）

## 3. 問題（重い順）

### must

**X-M1　`sys.carb`：気化器着氷の対処が、Archer の POH と第 2 部の `emg.abnormal` の両方と食い違う**〔安全〕（factcheck-sys S1 と同じ。重さを上げた）
- 今の文：
  - 対処「キャブレターヒーターをいっぱいに入れます。熱い空気は薄いので…」
  - よくある間違い「とけた水でエンジンは 30 秒から数分荒れますが、ヒーターはいっぱいのまま、ふつうの出力が戻るまで待ちます（PHAK 第 7 章）」
- 何が違うか：
  1. Archer の POH 3.5k と公開チェックリストは「1 分たっても荒れが続けば、ヒーターを OFF にして、ミクスチャー・電動燃料ポンプ・タンクの切り替え・計器・マグネトー」の順。今の `book-3.js` の `emg.abnormal` の表も「1 分を超えて続けば OFF」と書いている。
     - 同じ本の 2 か所が、同じ異常で違う手順を教えることになる。
     - PHAK の「数分待つ」は着氷と分かっているときの一般の説明。POH は原因の分からない荒れの手順で、荒れの原因は着氷とは限らない（燃料・点火）。
     - この章の注意 1 も「手順・数値は機体の POH と訓練校のチェックリストが優先」と言っている。
  2. POH 3.5j（Carburetor Icing）は「CARB HEAT ON → MIXTURE Adjust for Maximum Smoothness」。ヒーターの空気は薄く、混合気が濃くなるからです（PHAK：出力が最大で約 15% 下がり、混合気が濃くなる）。本文の対処にミクスチャーの手順がない。
- 直し方（案）：
  - 対処の箇条を「キャブレターヒーターをいっぱいに入れ、ミクスチャーを最もなめらかに回る位置に合わせます（POH 3.5j）」に。
  - よくある間違いの PHAK の文のあとに足す。「ただし Archer の POH の『エンジンの荒れ』の手順は、ヒーターをいっぱいに入れて 1 分たっても荒れが続けば、ヒーターを戻し、ミクスチャー・電動燃料ポンプ・タンクの切り替え・計器・マグネトーを順に確かめます（POH 3.5k）。荒れの原因が着氷とは限らないからです。」
  - 手順の住所を 1 つにするため、手順の全部は `emg.abnormal`（W28）に置く。`sys.carb` は原理と、この 1 文と、`ahead('emg.abnormal', …)` の予告にする（5 の C 行）。
- 根拠：POH VB-2266 3.5j・3.5k、MGA Archer Checklist「ENGINE ROUGHNESS」、PHAK 25C 第 7 章 Carburetor Heat（p.7-10）、今の `book-3.js` の `emg.abnormal` の表。

**X-M2　`sys.lights`：「白い灯だけ＝相手は遠ざかっている」**〔安全〕
- 今の文（4 か所）：
  - 本文「夜、ほかの飛行機の白い灯だけが見えたら、相手は同じ向きへ遠ざかっています」
  - ここが大切「白い灯だけが見えたら、相手は同じ向きへ遠ざかっている」
  - 図 `positionLights` の「白だけ → 遠ざかっている」
  - 今の `book-1.js:507-508`・`book-figs.js:1001` も同じ
- 何が違うか：
  - 尾灯だけが見えるのは、相手の後ろ（尾から左右 70° の内側）にいるときです。相手が自分と同じ向きに飛んでいることは分かりますが、遠ざかるかどうかは速さの差で決まります。こちらが速ければ近づきます（追い越し）。
  - AFH 第 11 章は、同じ向き（赤が左・緑が右）の場合にも「Care must be taken to maintain clearance」と書く。
  - 「遠ざかっている」は、見張りと回避をやめてよいと読める。訓練空域では、同じ向きの遅い機体に追いつく場面がふつうにある。
- 直し方（案）：
  - 本文：「白い灯だけが見えたら、相手はこちらと同じ向きに飛んでいます。こちらが速ければ近づくので、間隔を保ちます（AFH 第 11 章）。」
  - ここが大切：「白い灯だけなら、相手は同じ向き。追いつくこともある」（60 字以内）
  - 図の 3 行目の下の句：「同じ向き（追いつくことも）」
  - 追い越す側が避ける米国の規則（14 CFR 91.113(f)）を添えるなら、文に「米国の」を入れる（STYLE「日米の書き分け」）。
  - 赤と緑が両方見える場合と白だけの場合の関係（初学者の L1）は、「赤と緑の両方が見えるのは、相手の真正面か、それに近い所だけです」を 1 文足すと解ける（光の届く角度：左舷灯と右舷灯は前から横の 110°、尾灯は後ろの 140°）。
- 根拠：AFH 3C 第 11 章 Airplane Equipment and Lighting、ACS PA.XI.A.K7（ACS-MAP の住所は `sys.lights` だけ）。

### should

**X-S1　`sys.eis` の「ここに注意」：油圧が失われたときの POH 3.5c の要点が足りない**〔安全〕
- 今の文：「油圧がまったくなくなったときは、オイルがなくなったか、計器の故障です。どちらか分からないうちは、エンジンが急に止まることに備えて、近くの空港へ向かいます（POH 3.5c）。」
- 不足：POH 3.5c の本文は次も書いている。どれも、この場面で操縦士がまず決めることです。
  - 高度を保つ（エンジンが止まっても滑空で降りられる高さを残す）
  - 出力をむやみに変えない（止まるのを早める）
  - 温度の急な上昇やオイルの煙があり、空港が近くなければ、出力があるうちに場外に降りることも考える

  今の文だけでは「空港まで出力を上げて急ぐ」や「降下しながら向かう」と読める。確認問題 9 の理由は「出力はむやみに変えない」と書くのに、本文にない（本文だけで解けない）。
  油圧の計器だけの故障と見分ける手がかりが、油温などのほかの計器であることも、表（ここを混同しない）とつなげると教えやすい。
- 直し方（案）：「…近くの空港へ向かいます。高度を保ち、出力はむやみに変えません。油温の急な上昇やオイルの煙があり、空港が近くなければ、出力があるうちに場外に降りることも考えます（POH 3.5c）。油圧の計器だけの故障かどうかは、油温などほかの計器も見て考えます。」
- 根拠：POH VB-2266 3.5c。

**X-S2　`sys.carb` の予防：長いパワーオフの降下の「30 秒ごとのクリアリング」と「水平に戻ったらヒーターを切る」がない**〔安全〕
- 今の文：「気化器着氷が起きそうな日に、パワーを絞って長く降りるとします。そのときは、絞る前にキャブレターヒーターをいっぱいに入れます（POH 4.51）。進入と着陸では、氷の兆候がない限り使いません。」
- 不足：
  - POH 4.5l：約 30 秒ごとにスロットルを少し開いてすぐ戻し（エンジンのクリアリング）、出力の反応を確かめる。水平に戻ったら混合気を濃くし、出力を合わせ、着氷の疑いがなければヒーターを切る。
  - PHAK も「ときどきスロットルを数秒なめらかに開いてエンジンを温める。そうしないとヒーターの熱が足りなくなることがある」と書く。
  - これがあると、初学者の CB3（降下では入れ、進入では入れない――境目はどこか）が解ける。境目は「水平に戻ったとき」と「進入のチェックリスト」です。
- 直し方（案）：予防の箇条の 2 文目のあとに、「降りている間は、約 30 秒ごとにスロットルを少し開いてすぐ戻し、エンジンが応えるかを確かめます。水平に戻ったら、混合気を濃くし、着氷の疑いがなければヒーターを切ります（POH 4.5l）。」。節の番号は factcheck N3 のとおり「4.5l」と書く。
- 根拠：POH VB-2266 4.5l、PHAK 25C 第 7 章（p.7-10）。

**X-S3　`sys.gear`：着陸の滑走のブレーキの理由が POH と合わない**
- 今の文：「着陸の滑走では、前輪を接地させてからブレーキを使います。前輪で向きを保てて、主輪に重さがかかってブレーキがよく効くからです。」
- 何が違うか：
  - 前輪を下ろすと、重さはむしろ前輪の側へ移ります。
  - POH 4.5m は「接地したら前輪をできるだけ長く浮かせ、速度が落ちたら前輪をそっと下ろしてブレーキ。ブレーキがいちばん効くのは、フラップを上げ、操縦輪を引いて、重さの大部分を主輪に乗せたとき」と書く。
  - 「前輪を下ろしてから」は POH どおりですが、理由の後半が逆に読める。
- 直し方（案）：「接地したら前輪をできるだけ長く浮かせ、速度が落ちたら前輪をそっと下ろしてからブレーキを使います。ブレーキがいちばん効くのは、フラップを上げ、操縦輪を引いて、重さを主輪に乗せたときです（POH 4.5m）。」
- 根拠：POH VB-2266 4.5m。

**X-S4　`sys.gear` のハイドロプレーニング：Archer の数字から操縦の結論を出していない**
- 今の文は「9 × √24 ≈ 44 kt」までで止まる。
- 教官として伝えたいのは、44 kt が Archer の接地の速さとほぼ同じだということです。POH 4.7 の全フラップ・最大重量の失速速度は 45 KIAS で、接地は失速速度の近く。だから、ぬれた滑走路ではふつうの着陸でもハイドロプレーニングが起こりうる。
- PHAK 第 11 章は、対策も書いている。
  - 決められた接地の速度より速く接地しない
  - 向かい風に向かって降りる
  - 急な操作をしない
  - ブレーキが効かないことを着陸の前から考えておく
  - 空気の抵抗によるブレーキ（aerodynamic braking）を使い切る
- 直し方（案）：最後の段落のあとに 2 文。「Archer の接地の速度（POH の全フラップ・最大重量の失速速度は 45 KIAS）は、この目安とほぼ同じです。ぬれた滑走路では、速く接地せず、向かい風に向かって降り、急な操作をせず、ブレーキが効かないことを前から考えておきます（PHAK 第 11 章）。」
- 目安の速さが対気速度か対地速度かは、PHAK は書いていない。〔要確認〕：書き手が確かめるまで「対地速度」とは書かない。
- ここが大切の 4 つめは、factcheck N10 のとおり「効かなくなることがある」に。`perf.tol` の表の「濡れた滑走路」の行からここへリンクを（W16。5 の表）。
- 根拠：POH VB-2266 4.7、PHAK 25C 第 11 章 Water on the Runway and Dynamic Hydroplaning（p.11-13〜14）。

**X-S5　`sys.fuel`：ベーパーロックの原因とプライマーがない（JCAB の例題が問う所）**
- ベーパーロック：
  - 今は「タンクを空になるまで使うと、空気が入って起こりやすく」（PHAK）だけ。
  - JCAB の自家用 例題 12 と事業用 例題 18 は、原因を「燃料の圧力の低下・温度の上昇・過度のかく乱」とし、「高い高度では沸点が下がる」ことも問う（例題 12 の誤りの選択肢が「沸点上昇」）。
  - 電動燃料ポンプを離着陸と切り替えで ON にする理由（燃料の圧力を保つ）にもつながる。
- プライマー：
  - JCAB 自家用 例題 14 はプライマ系統を問う。
  - Archer III は電動のプライマーを持ち、スイッチは天井のパネルのスターターの右（POH 7.15・図 7-15A）。
  - 下書きには、プライマーの語が 1 回もない（`sys.cockpit` のスイッチの列にもない）。
  - PHAK 第 7 章は「寒いと気化器で燃料が気化しにくいので、始動の前にシリンダーへ燃料を送る」と書く。
- 直し方（案）：
  - `sys.fuel` のベーパーロックの文に 1 文：「燃料の温度が高いとき・圧力が低いとき（高い所では沸点が下がる）・管の中の流れが乱れるときに起きやすくなります（JCAB の例題）。」〔要確認〕：出典は JCAB の例題集でよいか、FAA の動力装置のハンドブックで確かめるかを書き手が決める。
  - プライマーを 2 文：「始動の前に燃料をシリンダーへ送る装置がプライマーです。Archer III は電動で、スイッチは天井のパネルのスターターの右にあります（POH 7.15）。」
  - `sys.cockpit` の天井のスイッチの列に「プライマー」を足す。
- 根拠：JCAB 例題集 自家用 例題 12・14、事業用 例題 18、POH VB-2266 7.15、PHAK 25C 第 7 章 Fuel Primer（p.7-25）。

**X-S6　`sys.fuel` と章末の例：無色の抜き取りは、水のこともある**〔安全〕
- 今の例：「給油のあとに抜き取った燃料が、青でなく無色だった → ジェット燃料の誤給油を疑い、飛ばずに確かめる。」
- 不足：
  - 抜き取り口から出たものが全部水なら、それも無色に見えます。PHAK は、水は色のついた燃料と分かれて見えるか濁って見える、ジェット燃料は灯油のはっきりしたにおいがある、と書く。
  - 無色を「ジェット燃料」とだけ教えると、全部が水のときを見落とす。
  - JCAB の「燃料の管理」の見出しにも当たる PHAK の「最後の飛行のあとにタンクを満たし、結露を防ぐ」もない。
- 直し方（案）：
  - 例を「…無色だった → ジェット燃料（灯油のにおい）か、全部が水かを疑い、飛ばずに確かめる。」に。
  - `sys.fuel` の飛行前の箇条に 1 句：「水は燃料と分かれて底にたまるか、燃料が濁って見えます（PHAK 第 7 章）」。
- 根拠：PHAK 25C 第 7 章 Fuel Grades・Fuel Contamination（p.7-27〜28）。

**X-S7　`sys.ctl`：トリムタブとアンチサーボタブの動く向き、操舵力を軽くするタブ、マスバランス（JCAB 事業用 例題 7・10）**
- 今の下書きは、Archer のアンチサーボタブ（翼面と同じ向きに動く）だけを書く。
- JCAB 事業用 例題 7 は「舵の効きを増加させるため、タブを舵面と同じ方向に動かす」を誤りとして問う。ふつうのトリムタブは、舵面と反対に動く。
- アンチサーボタブだけを覚えた訓練生は、この問いで間違える。
- 例題 10 はマス・バランスの目的（動翼のフラッタの防止）を問う。
- PHAK 第 6 章は、次を書いている。
  - トリムタブ（昇降舵のトリムタブは舵面と反対に動く）
  - バランスタブ（反対に動き、操縦を軽くする）
  - サーボタブ
  - アンチサーボタブ（同じ向き）
  - スタビレーターの主桁の前のバランスウエイト
- expert-aero の E-S9 は、この見出しを `aero.axes` と `sys.ctl` のどちらに置くかを決めてほしいと書いた。**`sys.ctl` を住所にするのがよい**と考える。理由は 3 つ。
  - 既にタブとトリムを書いている。
  - JCAB-MAP の cpl.1.1.1.7 は `sys.ctl` にも当たっている。
  - Archer の実物と比べて教えられる。
- 直し方（案）：`sys.ctl` の「トリム」の小見出しの中か、`jcab` の札つきの もっと深く「タブの種類とマスバランス（JCAB 工学）」に、3〜4 文と小さな表を置く。
  - 表の行：トリムタブ（反対の向き：保舵力をなくす）・バランスタブ（反対の向き：操縦を軽くする）・サーボタブ（タブを動かし、その空気の力で舵面を動かす）・アンチサーボタブ（同じ向き：重くして動かしすぎを防ぐ、Archer はトリムも兼ねる）
  - 文：「スタビレーターには、主桁の前にバランスウエイト（マスバランス）があります（PHAK 第 6 章）。」「フラッタを防ぐ目的」は JCAB の例題 10 で確かめた形で書く。`aero.axes` からは思い出そうで呼ぶ。
  - 用語（トリムタブ・バランスタブ・サーボタブ・マスバランス・フラッタ）は `FL.terms` に行がない（10 の W04）。
- 根拠：PHAK 25C 第 6 章 Trim Systems（p.6-10〜11）・Stabilator（p.6-8）、JCAB 例題集 事業用 例題 7・10、JCAB-MAP cpl.1.1.1.7（操舵力軽減策・保舵力とトリム）。

**X-S8　`sys.carb`・`sys.piston`：Seminole には気化器式の年式と燃料噴射式の年式がある**（初学者 CB2 の答え）
- 今の文：
  - `sys.carb`「定速プロペラの機体（Seminole）では、回転は変わらず、吸気圧力が下がります」
  - `sys.piston` もっと深く「今の Seminole は IO-360-B1G6」「Archer と Seminole のエンジンは、過給機を持たない自然吸気です」
- 事実：
  - Lycoming SSP-110-3 は、PA-44-180 Seminole のエンジンに気化器式の O-360-A1H6・O-360-E1A6D（と逆回転の LO-360）と、燃料噴射式の LIO-360-B1G6 を挙げる。
  - 今の生産機は（2）IO-360-B1G6（Piper の資料）。
  - 訓練校の Seminole には古い年式の気化器式も多い。その機体では、`sys.carb` の文はそのまま正しい。
  - ターボ付きの PA-44-180T（TO-360-E1A6D）もある。
- 直し方（案）：
  - `sys.carb`：「定速プロペラで気化器式のエンジンの機体（古い年式の Seminole など）では…」
  - `sys.piston`：「今の Seminole は IO-360-B1G6（燃料噴射式）ですが、古い年式には気化器式の O-360 のものもあります（Lycoming の資料）。訓練校の機体がどちらかは、その機体の POH で確かめます。」
  - 自然吸気の文は「この本の訓練機の Archer と Seminole（PA-44-180）は」に（ターボ付きの PA-44-180T と区別）。
  - 第 5 部の `me.*` と W31 にも伝える（10）。
- 根拠：Lycoming SSP-110-3（PA-44-180・PA-44-180T の欄）、Piper Trainer Brochure 2026。

**X-S9　`sys.lights`：ACS の夜の装備（91.205(c)）と地上での灯火（AIM 4-3-24）がない**
- 夜の装備：
  - ACS PA.XI.A.K3「Airplane equipment and lighting requirements for night operations」の住所は `sys.lights` と `ops.night`（第 3 部・R3）。
  - 第 1 部の中に 91.205(c) の中身がない。`law.js` は「夜や IFR では、さらに多くの装備が必要です」まで。
  - 91.205(c) は、昼の装備に加えて次を求める。
    - 航空灯
    - 衝突防止灯
    - 営利なら着陸灯 1 つ
    - 全部の電気と無線の装置に足りる電源
    - 飛行中に手の届く予備のヒューズ 1 組（または種類ごとに 3 つ）
  - ヒューズは X-S10 ともつながる。
- 地上での灯火：
  - ACS PA.II.D.K5「Aircraft lighting, as appropriate」（地上走行）の住所は `sys.lights` と `ground.taxi`。今の `ground.taxi`（book-3.js）にも灯火の使い方がない。
  - AIM 4-3-24 は、次を勧める。
    - 地上走行の前に航空灯・衝突防止灯
    - 滑走路を走るか横切るときは、全部の外の灯火
    - 離陸のために滑走路に入るとき（line up and wait を含む）は、着陸灯を除く全部
    - 離陸の許可を受けたとき（管制塔のない空港では離陸滑走を始めるとき）に着陸灯
  - 滑走路の誤進入の防ぎ方（`comm.runway`）にも効く。
- 直し方（案）：
  - `sys.lights` に、米国の囲み（`bk.us`）か「米国の」を入れた文で、91.205(c) を 1〜2 文。
  - AIM 4-3-24 の地上での灯火を 2 文（米国の AIM の勧め）。
  - `FL.jur` に夜の装備の日米の項目を立てるかは W06・W37（日本の側は〔要確認〕）。
- 根拠：14 CFR 91.205(c)（eCFR）、AFH 3C 第 11 章、AIM 4-3-24、ACS-MAP PA.XI.A.K3・PA.II.D.K5。

**X-S10　`sys.elec`：ヒューズと蓄電池の種類・危険性（JCAB 自家用 1.2.7・事業用 1.5.1.5、例題 16）**
- 自家用の出題範囲「電気系統」の小見出しは「回路保護装置の概要・サーキット・ブレーカー・ヒューズ」の 3 つだけ。下書きにはヒューズが 1 回もない。
  - PHAK は、ヒューズとブレーカーは同じ働きで、ヒューズは取り替え、ブレーカーは戻せる、予備のヒューズを積む、と書く。
  - 91.205(c)(6) の予備のヒューズ（X-S9）とつながる。
- 事業用の「蓄電池」は「形式と特性・容量・危険性」、例題 16 は鉛蓄電池とニッケル・カドミウム蓄電池の違いと「容量は温度で変わる」を問う。下書きは容量（Ah）と「気温で短くなる」まで。
- 直し方（案）：
  - 「バスとサーキットブレーカー」の箇条に 1 文：「ヒューズも同じ働きですが、切れたら取り替えます。そのため予備のヒューズを積みます（PHAK 第 7 章）。」
  - 蓄電池の形式と危険性は、`sys.radio`（発展）に 2〜3 文。〔要確認〕：書き手が一次資料で確かめてから書く。例題 16 の正しい選択肢が示す事実（鉛蓄電池は過放電で極板が曲がる、ニッケル・カドミウムは大電流でも電圧が安定・振動に強い・腐食性のガスをほとんど出さない）は、JCAB の例題を出典にできるかを含めて。
- 根拠：PHAK 25C 第 7 章 Electrical System（p.7-30〜31）、JCAB 出題範囲 ppl.1.2.7・cpl.1.5.1.4・cpl.1.5.1.5、事業用 例題 16。

**X-S11　`sys.eis`：潤滑系統の形と計器の検出方式（JCAB 1.2.6.9・1.4.1.9・1.6.2.1・1.6.2.2）**
- 潤滑系統：
  - PHAK は、ウェットサンプ（オイルはエンジンの一部の油だめ）とドライサンプ（別のタンクとポンプ）を分ける。
  - Archer の O-360-A4M はウェットサンプだと読める。ただし推論で、〔書き手が確かめる〕。根拠は 2 つ：Lycoming SSP-110-3 の型式名の決まりでは、ドライサンプは曲技用の頭文字 A の型。POH は油量をエンジンのディップスティックで見る（4.5a）。
  - JCAB 事業用 例題 15 は滑油の作用を問い、正しい選択肢に「腐食しやすい金属部品の発錆を防止する」がある。下書きの 4 つの役目にはない。
  - オイルの種類と粘度は POH と札で決まる（PHAK）。Archer の POH 8.19 は、次を書いている。
    - 容量 8 qt・**最低の安全な量 2 qt**
    - 気温ごとの粘度の等級
    - 2 つの規格（MIL-L-6082B・MIL-L-22851）
  - 下書きの「公開チェックリストの例：6 qt 以上」は訓練校の決まりで、POH の最低の量とは別だと書き分けるとよい（DESIGN の「計画の余裕は学校の決まり」と同じ考え）。2 つの規格の意味（鉱物油と無灰分散型）は〔要確認〕。
- 検出方式：
  - 事業用の「遠隔表示計器」は「圧力計器・温度」の検出方式を問う。
  - AMT Airframe Vol. 2 第 10 章（下書きが既に出典に挙げる PDF の別の章）は、圧力はブルドン管、油温などは電気抵抗式の温度計、CHT は熱電対（thermocouple）と書く。
- そのほか：
  - PHAK の「速い降下はエンジンを急に冷やす（shock cool）」「高い油温の原因は、オイルの管の詰まり・油量の不足・オイルクーラーの詰まり・計器の故障」もない。冷却の「運用上の問題」（JCAB）に当たる。
  - MFD が消えたときにエンジンの表示がどこに出るか（PFD への切り替え：POH 3.5e）は `inst.pfd` が書いている。`sys.eis` の最初の段落から `bk.see('inst.pfd', …)` で呼ぶとよい（同じ第 1 部・R2 で登録）。
- 直し方（案）：
  - 「オイル」の小見出しに 3 文：「Archer のエンジンは、オイルをエンジンの油だめにためるウェットサンプ式です（PHAK 第 7 章）。」「オイルは、さびを防ぐ働きもします（JCAB の例題）。」「POH の最低の安全な量は 2 qt です。出発の前の量は、訓練校の決まり（例：6 qt 以上）に従います（POH 8.19）。」〔要確認〕：ウェットサンプの型と、さびの文の出典を書き手が決める。
  - 「測る場所」の段落に 1 文：「油圧はブルドン管などの圧力計、油温は電気抵抗式の温度計、CHT は熱電対で測ります（FAA の整備士のハンドブック）。」出典の表 `amtAirframe2` の題に第 10 章を足す。
  - 冷却の段落に shock cooling を 1 文。
- 根拠：PHAK 25C 第 7 章 Oil Systems・Engine Cooling Systems（p.7-15〜17）、FAA-H-8083-31A Vol. 2 第 10 章（Bourdon tube・Electrical Resistance Thermometer・Thermocouple Temperature Indicators）、JCAB 事業用 例題 15。

**X-S12　`sys.piston`：燃料の等級の意味（オクタン価・パフォーマンス・ナンバー）、弁を動かすしくみと補機、軸の出力の言葉（JCAB 1.2.6.2・1.2.6.4・1.4.1.2・1.4.1.6）**
- 燃料の等級：
  - 今の表は等級と色だけで、等級の数字が何を表すかがない。
  - PHAK は「オクタン価またはパフォーマンス・ナンバー（等級）は、ノッキングへの強さ（antiknock value）を表す」と書く。
  - JCAB は自家用・事業用とも「オクタン価・パフォーマンス・ナンバー・具備条件・規格と等級・管理」を挙げる。
  - PHAK の「指定の等級がなければ 1 つ上の等級を使う」「自動車の燃料は STC がなければ使わない」も、管理の答えになる。
- 構造：
  - 出題範囲は「動力発生機構・弁作動機構・補機」。
  - 下書きは動力発生機構（シリンダー・ピストン・連接棒・クランク軸）と弁の開け閉めの時期まで。弁を動かすしくみ（カム軸など）と補機（マグネトー・燃料ポンプ・発電機・スターター）の名前がない。
- 出力：
  - POH 2.7 は定格を「180 BHP」と書く。下書きは「180 hp」。
  - BHP（制動馬力：軸で取り出せる出力）の語を 1 回出すと、プロペラの効率（推力馬力 ÷ 制動馬力：PHAK 第 5 章）の もっと深く ともつながる。
  - 指示馬力・摩擦馬力との関係（JCAB 事業用「発動機の出力」）は〔要確認〕：一次資料で確かめてから。
- 直し方（案）：
  - 燃料の表の前に 1 文：「等級の数字（オクタン価やパフォーマンス・ナンバー）は、ノッキング（デトネーション）への強さを表します。指定の等級がないときは、1 つ上の等級を使います（PHAK 第 7 章）。」
  - 4 つの行程の段落に「弁はクランク軸に回されるカム軸などで開け閉めします」〔要確認〕。
  - `sys.engine` の最初に「マグネトー・燃料ポンプ・発電機・スターターなど、エンジンに付いて回る装置を補機といいます」〔要確認：JCAB の語の範囲〕。
  - もっと深くの例に「POH の 180 BHP」。
- 根拠：PHAK 25C 第 7 章 Fuel Grades（p.7-27）、第 5 章（効率＝THP/BHP）、POH VB-2266 2.7、JCAB 出題範囲 ppl.1.2.6.2・1.2.6.4、cpl.1.4.1.2・1.4.1.4・1.4.1.6。

**X-S13　`sys.airframe`・`sys.gear`：構造の形（トラス・モノコック）、防火壁、フェイル・セイフ、腐食、尾輪式（JCAB 1.2.1・1.2.2、自家用 例題 11）**
- 構造の形：
  - 下書きはセミモノコックだけ。
  - PHAK 第 3 章は、トラス（鋼管の骨組み、流線形にしにくい）→ モノコック（外板がほとんど全部の力を受ける。強いが、へこみなどの変形に弱い）→ セミモノコック、の流れで説明する。
  - JCAB の「機体の一般構造」の答えで、モノコックがへこみに弱いことは、この節の「外板のへこみも構造の傷」の理由にもなる。
  - エンジンと客室の間の防火壁（firewall：PHAK 第 3 章）もない。火災・煙の手順（`emg.fire`）の前提になる語です。
- 荷重と強度：
  - 事業用の「荷重と強度」は「安全率とフェイル・セイフデザイン」を挙げる。安全率は `aero.struct` にあるが、フェイル・セイフはどの下書きにもない。
  - 「材料の性質」の「耐久性」は、疲労（ある）と腐食（ない）。フロリダの海に近い空港では、外部点検で腐食を見ることが実際に大事です。
- 着陸装置の形式：
  - 自家用 例題 11 は前輪式の特徴として、強いブレーキでも前にのめらない（ノーズ・オーバ）・視界がよい、と、グラウンド・ループを起こしやすいのは尾輪式（重心が主脚より後ろ）であることを問う。
  - 下書きは前輪式の長所だけで、尾輪式との比べがない。`aero.js` は尾輪の語を使っているので、比べは `sys.gear` に 2 文で足りる。
- 直し方（案）：
  - `sys.airframe` に、トラス・モノコックの 2 文と防火壁の 1 文（PHAK 第 3 章）。
  - フェイル・セイフと腐食は、それぞれ 1〜2 文。〔要確認〕：書き手が一次資料（例：AC 23-13A、FAA の整備士のハンドブックの腐食の章）で確かめてから書く。確かめられなければ JCAB-MAP の note に「未対応」を残す。
  - `sys.gear` に尾輪式との比べを 2 文。〔要確認〕：グラウンド・ループの説明は AFH で確かめる。
- 根拠：PHAK 25C 第 3 章 Fuselage（Truss・Monocoque・Semimonocoque、firewall）、JCAB 出題範囲 cpl.1.2.1.1・1.2.2.1・1.2.2.2、ppl.1.2.1.1、自家用 例題 11。

**X-S14　`sys.radio`：JCAB の「電波の伝播」の言葉と見出しに合わせる（対流圏波・フェージング・DSB・電離層の層）**
- 言葉：
  - JCAB 事業用の「電波の伝播」の小見出しは「地上波・対流圏波・電離層波・周波数と伝播・フェージング・伝播に影響する要素」。
  - 下書きは FAA の整備士のハンドブックの分け方（地上波＝地面に沿う波・電離層波・空間波）で、**「空間波」は JCAB の見出しになく、「対流圏波」と「フェージング」は下書きにない**。
  - 日本の無線工学の教え方では、VHF の見通しの伝わり方（直接波・大地反射波）を地上波の中に入れる分け方もあると私は理解している。ただし、一次資料で確かめられなかった〔要確認〕。
  - JCAB の受験者が「VHF は空間波」と覚えて試験の選択肢と合わない、ということが起こりうる。
- DSB：DESIGN 3.3 の行は「AM・DSB・SSB」を挙げ、事業用の「振幅変調通信機」も「DSB 送受信機・SSB 送受信機」。下書きに DSB がない。
- 電離層：事業用 例題 17 は D・E・F 層、スポラディック E、「HF は F 層で反射」「VHF 以上は（ふつう）電離層を突き抜ける」を問う。下書きは「上空の電離層で曲げ返される」まで。
- 空電：AMT は、放電索が減らすのは降水静電気（precipitation static）によるコロナ放電の雑音、と書く。JCAB の「空電の種類」の入口になる。
- 直し方（案）：
  - 「電波の伝わり方」の分け方が FAA の整備士のハンドブックのものだと、文に書く（「FAA の整備士のハンドブックの分け方では…」）。
  - JCAB の語（地上波・対流圏波・電離層波）との対応は、W37 か事実確認役が日本の無線工学の資料で確かめてから、1 文か小さな表で足す。
  - DSB は「航空の VHF の AM は、搬送波と上下の側波帯を送る DSB です」の形。〔要確認〕：AMT か ICAO Annex 10 で確かめる。
  - 電離層の層の名前は 1 文。〔要確認〕：JCAB 例題 17 の正しい選択肢か、一次資料で確かめる。
  - 放電索の文に「降水静電気によるコロナ放電」（AMT 第 11 章）。
  - factcheck M1（空間波の周波数）は同意。
- 根拠：JCAB 出題範囲 cpl.1.5.2.3・cpl.1.5.3.1・cpl.1.5.3.2、事業用 例題 17、FAA-H-8083-31A Vol. 2 第 11 章、DESIGN 3.3 の `sys.radio` の行。

**X-S15　1 つの概念に住所は 1 つ：気化器のヒーターの使い方が 4 か所にあり、手順が食い違う**（5 の表の C 行。X-M1 の元）
- `sys.carb`（PHAK：数分待つ）、`emg.abnormal`（1 分で OFF）、`perf.plan`（W16：進入ではヒーターを使わない理由を、リンクなしで説明し直す）、`ground.runup`（ヒーターの点検）。
- `CONCEPTS.json` に行を足し、住所を `sys.carb`、呼び戻しを `perf.plan`・`emg.abnormal`・`wx.ice`（W17 は既に思い出そうで呼んでいる）にする。
- 手順そのもの（1 分の判断など）は `emg.abnormal` に置いて、`sys.carb` からは予告で呼ぶ。原理と手順の境目をはっきりさせる。

### nit

| # | 場所 | 何が足りないか | 直し方（案）・根拠 |
|---|---|---|---|
| X-N1 | `sys.fuel`「燃料計の正確さが求められているのは『空』の表示だけです（PHAK 第 7 章）」 | 「求められている」は米国の耐空性の基準の話（PHAK も「Federal regulations require」と書く）。共通の節で国を書いていない（検査は条番号がないので拾わない） | 「米国の基準が燃料計に求める正確さは『空』の表示だけです」（STYLE「日米の書き分け」、DESIGN 3.4） |
| X-N2 | `sys.engine`「回転が少し下がるのが正常で、まったく下がらないのも異常です」 | 理由がない（初学者 E2）。JCAB の「エンジン停止時の注意」も下書きにない | 「まったく下がらないときは飛びません（PHAK 第 7 章）。マグネトーのスイッチは回路を接地して止めるしくみなので、スイッチや線が壊れていると、切っても止まらないことがあります（AFH 第 2 章）。」。エンジンを止める前に、アイドルで一瞬マグネトーを OFF にして接地を確かめる（AFH 第 2 章 Engine Shutdown）。止めるのはミクスチャーで（今の文どおり） |
| X-N3 | `sys.engine` 混合比 | 濃すぎる混合気の害（点火プラグの汚れ・荒れ：PHAK）がない。絞る理由が「出力と燃費が戻る」だけ | PHAK 25C 第 7 章 Mixture Control の 1 文 |
| X-N4 | `sys.carb` | ヒーターを入れると混合気が濃くなり、出力が最大で約 15% 下がる（PHAK）。X-M1 のミクスチャーの手順の理由 | PHAK 25C 第 7 章 p.7-10 |
| X-N5 | `sys.fuel` 通気口 | JCAB 事業用 例題 13 は、ベントの目的を「タンクの内外の圧力差をなくし、タンクの構造を守る」とする。下書きは「燃料が流れにくくなる」だけ | 1 句足す（JCAB 例題 13） |
| X-N6 | `sys.fuel` 燃料計 | Archer の燃料の量は、各翼の浮き式のセンサーで測る（POH 7.15）。図 `sysEis` には「浮き」とあるが本文にない（JCAB の「燃料油量計」） | 1 句（POH 7.15） |
| X-N7 | `sys.elec` の「暖房と一酸化炭素」 | JCAB では「空調系統」は電気系統と別の見出し。電気系統の節の中にあると見つけにくい | 節の summary かねらいに「暖房」の語を入れる。または `sys.eis` の冷却のあとへ移す（排気の系統の話なので） |
| X-N8 | `sys.elec` ブレーカー | SAIB CE-10-11 の勧め 4：飛ぶ前にブレーカーが飛び出していたら、関係する整備の不具合があれば戻さない | 「地上で見つけた飛び出したブレーカーも、整備の記録を確かめてから」を 1 文（SAIB CE-10-11） |
| X-N9 | `sys.engine` 始動 | Archer の START ENGD の警報（スターターが離れていない：エンジンが回っていて点いたら止める）とスターターの使い方（10 秒・2 分休み・5 回）（POH 4.5b）。JCAB の「始動系統の機能」 | `ground.start`（W28）に置き、ここは 1 句の予告でよい |
| X-N10 | `sys.piston`・`sys.fuel` | 誤給油を防ぐ手がかり：AVGAS は赤地に白い文字、ジェット燃料は黒地に白い文字の表示（PHAK） | 判断の目かここに注意に 1 句（PHAK 25C 第 7 章 p.7-27） |
| X-N11 | `sys.gear` シミーとショックストラット | JCAB の「シミーの意味」「ショック・ストラットの緩衝機能」が 1 句だけ（「振れ」「空気と油を使います」） | シミーは前輪が左右に速く振れる振動であること、ストラットは油が小さな穴を通るときに衝撃のエネルギーを吸い、空気がばねになることを各 1 文〔要確認：一次資料で〕 |
| X-N12 | `sys.radio` の VHF の帯 | 118.000〜136.975 MHz が `radio.equip`（W19）にもある | 二度目は呼び戻しでよい。どちらが住所かを W19 と決める（周波数の運用は `radio.equip`、伝わり方と変調は `sys.radio`） |
| X-N13 | 章末の例「右タンクで 1 時間飛んだので、電動燃料ポンプを ON にしてから左へ切り替え、燃料の流れを確かめる」 | よい例。切り替えたあとしばらく ON のまま（POH 4.5k）まで書くと本文と一致する | 「…ON にしてから左へ切り替え、しばらく ON のまま燃料の流れを確かめる」 |
| X-N14 | 台帳 JCAB-MAP ir.2.2「遠隔表示計器」 | 小見出しは「ジャイロの概要・ジャイロ・スコープの働き・駆動と自立装置」で、ジャイロの話。住所が `sys.eis`・`inst.flow` になっている（W14 も note を残した） | 住所を `inst.gyro` に直す（W15・W42） |

## 4. JCAB の出題範囲・例題と ACS の見出しの照合（この章に当たる行）

| 見出し（自家用 ppl／事業用 cpl／ACS） | 範囲の語のうち下書きにないもの | 判定 |
|---|---|---|
| 1.1.1.7 操縦性（cpl：操舵力軽減策・舵の効きと重さ、例題 7・10） | トリムタブの向き・バランスタブ・マスバランス | **X-S7** |
| 1.1.1.8 プロペラ（可変ピッチ・効率） | 可変ピッチ・定速の原理 | `me.prop`（W31）が住所でよい。`sys.engine` は固定ピッチと効率で入口は足りる |
| cpl 1.2.1 航空機材料（力学的性質・耐久性・材料の種類） | 力学的性質（強さ・こわさ）、耐久性の腐食 | **X-S13**（〔要確認〕） |
| cpl 1.2.2 航空機の構造（一般構造・複合材料・荷重と強度・安全率とフェイル・セイフ） | トラス・モノコック、フェイル・セイフ（安全率は `aero.struct`） | **X-S13** |
| 1.2.1.1 降着装置の形式（シミー、例題 11） | 尾輪式との比べ、シミーの意味 | **X-S13**・X-N11 |
| cpl 1.3.1.2 構成部品（ショック・ストラット） | 緩衝のしくみ | X-N11 |
| cpl 1.3.1.3 車輪とブレーキ（ハイドロプレーニング） | Archer の数字からの結論と対策 | **X-S4**・**X-S3** |
| 1.2.2／cpl 1.3.2.1 燃料供給系統（ベーパー・ロック、例題 12・14・18、cpl 例題 13） | ベーパーロックの原因、プライマー、ベントの目的 | **X-S5**・X-N5 |
| cpl 1.3.2.2 燃料表示系統（燃料油量計） | 浮き式のセンサー | X-N6 |
| 1.2.3／cpl 1.3.3 空調系統（暖房） | なし（置き場所だけ） | X-N7 |
| 1.2.6.1／cpl 1.4.1.1 作動原理 | なし | 足りる |
| 1.2.6.2／cpl 1.4.1.2 構造（弁作動機構・補機） | 弁を動かすしくみ、補機の語 | **X-S12** |
| 1.2.6.3／cpl 1.4.1.3 燃焼（混合比・正常燃焼・異常燃焼） | 混合比の数（理論混合比など）は書いていない。書くなら一次資料で〔要確認〕 | 異常燃焼は足りる。数は任意 |
| 1.2.6.4／cpl 1.4.1.4 航空燃料（具備条件・オクタン価・パフォーマンス・ナンバー・規格と等級・管理） | 等級の数字の意味、具備条件、管理（結露・1 つ上の等級・自動車の燃料） | **X-S12**・**X-S6** |
| 1.2.6.6／cpl 1.4.1.6 出力（出力の計算と測定・出力を支配する要素） | BHP の語、指示馬力・摩擦馬力 | **X-S12** |
| 1.2.6.7／cpl 1.4.1.7 混合気供給系統（アイシングと対策） | POH の手順との食い違い | **X-M1**・**X-S2** |
| 1.2.6.8／cpl 1.4.1.8 点火系統と始動系統 | 「まったく下がらない」の理由、プライマー、始動の警報 | X-N2・**X-S5**・X-N9 |
| 1.2.6.9／cpl 1.4.1.9 潤滑油と潤滑系統（例題 15） | ウェットサンプ、さびを防ぐ働き、オイルの種類 | **X-S11** |
| 1.2.6.10／cpl 1.4.1.10 冷却系統（運用上の問題） | shock cooling、高い油温の原因 | **X-S11** |
| 1.2.6.11／cpl 1.4.1.11 運用（定格と運転限界・エンジン停止時の注意） | 停止の前のマグネトーの接地の点検 | X-N2 |
| 1.2.7／cpl 1.5.1.4 回路保護装置（ヒューズ） | ヒューズ | **X-S10** |
| cpl 1.5.1.5 蓄電池（形式と特性・容量・危険性、例題 16） | 形式と危険性 | **X-S10**（〔要確認〕） |
| cpl 1.5.1.1〜1.5.1.3 電磁誘導・発電機・交流と直流の変換 | 出典（factcheck S4） | factcheck S4 に同意 |
| cpl 1.5.2 電波の伝播（地上波・対流圏波・電離層波・フェージング） | 対流圏波・フェージング、JCAB の分け方 | **X-S14**（〔要確認〕） |
| cpl 1.5.3 無線通信（空電の種類・DSB・SSB、例題 17） | 空電の種類、DSB、電離層の層 | **X-S14** |
| cpl 1.6.2.1・1.6.2.2 圧力計器・温度（検出方式） | ブルドン管・電気抵抗・熱電対 | **X-S11** |
| ACS PA.I.G.K1（a〜l） | なし（g・h は `inst`、i の暖房はある、j は `wx.ice`、l は `hf.altitude`） | 足りる |
| ACS PA.II.D.K5 地上走行の灯火 | AIM 4-3-24 の使い方 | **X-S9** |
| ACS PA.XI.A.K3 夜の装備と灯火 | 91.205(c) | **X-S9** |
| ACS PA.XI.A.K7 灯火だけで相手を読む | 「遠ざかっている」の誤り | **X-M2** |
| ACS PA.IX.C.K1 動力を失う原因 | なし（`emg.engine` と組み合わせて） | 足りる |
| ACS IR.II.A.K2 操縦系統 | なし（機械式・ケーブル、電動トリムの暴走は `inst.ap`） | 足りる |

## 5. 二度教えている概念（1 つの概念に住所は 1 つ：DESIGN 3.2・`CONCEPTS.json` に行がない）

| # | 概念 | 完全な説明がある所 | 案（住所 → 呼び戻し） |
|---|---|---|---|
| C | 気化器のヒーターの使い方（入れ方・待ち方・進入で使わない理由） | `sys.carb`、今の `emg.abnormal`（book-3.js：1 分で OFF）、`perf.plan`（W16：進入で使わない理由を POH 4.5m で説明し直す。リンクなし）、`ground.runup`（点検） | 原理の住所 `sys.carb`。異常の手順は `emg.abnormal`（W28）。`perf.plan` は思い出そうか `bk.see('sys.carb', …)`。行の案 `C.carb-heat`（X-M1・X-S15） |
| L | 航空灯をつける時間（91.209） | `sys.lights`（本文と `bk.jur('lights.ac')`）、`law.js` の表の行（「航空灯の点灯」） | 住所 `sys.lights`。`law` の表は呼び戻し（リンク）か、項目の名前だけにする |
| M | 最良の出力と最良の燃費の混合比 | `sys.engine`（POH 4.5k：ピーク EGT と 100°F 濃い側）、`perf.range`（W16：55%・65% は経済、75% は最大出力の混合比） | 住所 `sys.engine`。`perf.range` に `bk.see('sys.engine', '混合比（ミクスチャー）')` |
| H | ハイドロプレーニング（ぬれた滑走路でブレーキが効かない） | `sys.gear`、`perf.tol`（W16：表の「濡れた滑走路：ブレーキが効きにくく延びる」） | 住所 `sys.gear`。`perf.tol` の行からリンク（X-S4） |
| G | マグネトーの点検で「落ちがゼロも異常」 | `sys.engine`、今の `ground.runup`（book-3.js：数の限度と「落ちがゼロも異常」） | 原理の住所 `sys.engine`、数の限度と手順は `ground.runup`（W28 が思い出そうで呼ぶ） |
| V | 航空の VHF の帯 118.000〜136.975 MHz | `sys.radio`、`radio.equip`（W19） | X-N12 |

この章の中での重なり（同じ章なので住所の決まりには当たらないが、読みやすさのため）：
- 「自然吸気では吸気圧力を外の気圧より高くできない」が `sys.piston` の もっと深く と `sys.eis` の 2 か所にある。用語の説明は `sys.eis` が後にある（初学者 P1）。`sys.piston` の もっと深く の 1 文目を「吸気圧力（${bk.see('sys.eis', '吸気圧力と回転')}）は…」とつなぐとよい。

## 6. 事実確認役・初学者の読み手の報告との重なり

- **factcheck-sys**：
  - M1（空間波の周波数）：同意。X-S14 で JCAB の言葉の問題を足した。
  - S1：X-M1 に上げた。手順の住所の問題と POH 3.5j のミクスチャーを足した。
  - S2〜S5：同意。S5（SAIB を「決まり」と呼ばない）は、この本が規則と勧めを分ける大事な所。
  - N1〜N11：同意。N10 は X-S4 で、ハイドロプレーニングの対策と一緒に直すとよい。N11 は X-S8 で、気化器式の年式を足した。
- **reader-sys**：
  - must Q1（確認問題 2・4 はこの章の本文では答えられない）：同意。記録のキーを動かせない以上、問いの文か理由に「（次の章の『計器と表示』で学びます）」と書くのが現実的。
  - C1（自分の Archer に気化器があるか）：同意。章の最初の段落で 1 回言えば足りる。
  - CB1（温度の差の換算）：同意。
  - CB2：X-S8 で、事実から答えた。
  - CB3：X-S2 で、POH 4.5l から答えた。
  - E2：X-N2 で答えた。
  - I2（as soon as possible と as soon as practical）：同意。英語を添えるのがよい。X-S1 の直しと同じ所。
  - EL1（どちらのバッテリーで何分）：同意。
  - L1：X-M2 の直し方の最後の 1 文で解ける。
- **expert-aero**：
  - E-S9（操舵力軽減策の住所）：`sys.ctl` を推す（X-S7）。
  - 失速の課目の 300 ft（判断 11）は、この章に当たる文はない。

## 7. よかった所（直すときに残してほしい所）

- 油量・油圧・油温・EGT・燃料消費率の「測るもの／分からないこと」の表。実地の口述の「油圧が正常なら油量は大丈夫か」に、そのまま答えられる。
- P リードの「ここに注意」と、確認問題・説明してみようの 2 か所での練習。止める方法がミクスチャーだけであることまで書いた（PHAK どおり）。
- ブレーカーを戻す 4 つの条件。「電源を入れ直して警報が消えても、原因がなくなったしるしではない」の 1 文は、教官が伝えたいことそのもの。
- 「吸気圧力（inHg）が回転（rpm ÷ 100）より大きいと危ない」は限界の決まりではない、と書いたこと（古い言い伝えを正した）。
- 燃料計は「空」だけ、目で見て時間でも計算する、FOB SYNC、燃料の収支の計算演習。
- デトネーションとプレイグニッションの表と、どちらも温度を上げすぎない運用で防ぐ、という操縦士の側の結論。
- 「ガソリンのピストンだと決めつけない」（ディーゼルの PA-28）。誤給油の防ぎ方の土台になる。
- 本文に FLIGHT LAB の操作の言葉がなく、シミュレータでできないことを章の注意と `bk.sim` に分けたこと。

## 8. 検査の結果

- `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/sys-figs.js textbook/rewrite/combined/drafts/sys.js`（Chromium あり、報告だけ）：**error 8・warn 15・pending 1**。W14 の報告 5.1 と同じ数です。
  - error 8：style の 8 は、部品の見出しを道具が本文と数えるもの（taigen-dome 6・not-polite 2）。
  - warn 15：style の初出の形 3・questions の正解の位置 1・claims 11（今の `CLAIMS.json` に行がない）。
  - pending 1：calc の台帳。
  - ほかの 13 の検査は 0。
- `node textbook/rewrite/combined/ledgers/validate.mjs`：**ok（error 0・warning 37）**。前からの署名待ちです。
- 製品のテスト（この単位は報告のファイルだけを変えたので、壊していないことの確かめ。出力の HTML を作り直す `build` は流していない）：
  - FLIGHT LAB `npm run -s test:fast`：**86/86 pass**
  - CADET `npm run -s test:fast`：**247/247 pass**
  - TEXTBOOK `npm test`：**33/34 pass・1 fail**（2 回流して同じ）
    - 落ちたのは `build.test.mjs:66`「FLIGHT LAB sources are not copied into textbook/」。
    - 原因は、別の単位（W19-radio）の追跡されていない下書き `textbook/rewrite/combined/drafts/radio.js` が、`flight-lab/src/radio.js` と同じ名前であること。この報告とは関係がない。10 の 9 に、直し方を書いた。

## 9. 台帳の行

触っていない（読み手は台帳を直さない）。足してほしい行の案は 10 の 7。

## 10. 未解決のこと・ほかの単位にお願いしたいこと（needs from others）

1. **W14（`sys` の書き手・直し役）**：
   - X-M1・X-M2（must）、X-S1〜X-S14 の本文と図（図 `positionLights` の 3 行目、図 `sysGearBrake` は factcheck N5）、X-N1〜X-N13。
   - 新しい文の主張の札を `sys.claims.json` に。出典は POH 3.5c・3.5j・3.5k・4.5a・4.5l・4.5m・4.7・7.15・8.19、PHAK 第 3・6・7・11 章、AFH 第 2・11 章、14 CFR 91.205(c)、AIM 4-3-24、AMT Vol. 2 第 10・11 章、Lycoming SSP-110-3、JCAB 例題集。
   - 〔要確認〕とした所（X-S4 の速度の種類、X-S5 の出典、X-S10 の蓄電池、X-S11 のさび、X-S12 の弁の機構・補機・指示馬力、X-S13 のフェイル・セイフ・腐食・グラウンド・ループ、X-S14 の DSB・電離層・日本の分け方、X-N11）は、一次資料で確かめてから書く。確かめられなければ書かずに、JCAB-MAP の note に残す。
2. **W28（第 2 部）**：
   - `emg.abnormal` を気化器のヒーターの異常の手順の住所にし、`sys.carb` から予告で呼べるようにする（X-M1・5 の C）。
   - `ground.taxi` に地上での灯火（AIM 4-3-24）を置くなら、`sys.lights` と住所を決める（X-S9）。
   - `ground.runup` の「落ちがゼロも異常」から `sys.engine` を呼ぶ（5 の G）。
   - `ground.start` に START ENGD とスターターの使い方（POH 4.5b）（X-N9）。
   - 今の `book-1.js` の `sys.lights` の「遠ざかっている」は、`sys` の章を置き換えるときに消える（X-M2）。
   - `book-3.js` の「キャブレターヒート」は W24・W50 の用語の統一の分。
3. **W13（`aero`）**：
   - expert-aero E-S9 の住所を `sys.ctl` にするなら、`aero.axes` には思い出そうだけを置く（X-S7）。
   - `aero.struct` の安全率の文の近くに、フェイル・セイフを置くか `sys.airframe` に置くかを W14 と決める（X-S13）。
4. **W16（`perf`・`wb`）**：
   - `perf.plan` のヒーターの段落を `sys.carb` への思い出そうかリンクに（5 の C）。
   - `perf.range` の混合比から `sys.engine` へ（5 の M）。
   - `perf.tol` の濡れた滑走路から `sys.gear` へ（5 の H）。
5. **W19（`law`・`radio*`）**：
   - `law` の表の 91.209 の行を `sys.lights` の呼び戻しに（5 の L）。
   - 夜の装備 91.205(c) を `law.aircraft` に置くなら、`sys.lights` と住所を決める（X-S9）。
   - VHF の帯の住所（X-N12）。
6. **W31（第 5 部・Seminole）**：Seminole の年式でエンジンが気化器式（O-360-A1H6 など）か燃料噴射式（IO-360-B1G6）かが違う（X-S8）。訓練校の機体の POH で確かめ、`me.*` の気化器のヒーターと吸気圧力の説明を合わせる。
7. **W03・W27（台帳 `CONCEPTS.json`）**：5 の 6 つの行の案（`C.carb-heat`・`C.position-lights-rule`・`C.mixture-best`・`C.hydroplaning`・`C.mag-check`・`C.vhf-band`）を、住所が決まったら足す。JCAB-MAP の ir.2.2 の住所を `inst.gyro` に（X-N14）。
8. **W04（`FL.terms`）**：足してほしい語と JCAB の表記の確かめ。
   - トリムタブ（トリム・タブ）・バランスタブ・サーボタブ・アンチサーボタブ・マスバランス（マス・バランス）・フラッタ
   - プライマー（プライマ）・ウェットサンプ・ブルドン管・熱電対
   - オクタン価・パフォーマンス・ナンバー
   - 防火壁・トラス構造・モノコック構造・フェイル・セイフ
   - 尾輪式・ノーズ・オーバ・グラウンド・ループ
   - 対流圏波・フェージング・DSB・SSB・降水静電気
   - W14 の報告 8 の 4 の語と合わせて。
9. **W19-radio（または統合役）**：`textbook/rewrite/combined/drafts/radio.js` が `flight-lab/src/radio.js` と同じ名前なので、TEXTBOOK のテスト `build.test.mjs:66` が落ちている（8）。次のどちらかで直す。
   - 下書きの名前を変える（例 `drafts/comm.js`。`radio-figs.js`・`radio.claims.json` と報告の中の名前も）。
   - 統合役が、このテストで `rewrite/combined/drafts` を外す（テストを意図して直すなら `TEST-CONSTANTS.md` に 1 行）。
10. **W27・W36（安全レビュー）**：X-M1・X-M2・X-S1・X-S2・X-S6 は〔安全〕の文です。直したあとに、ほかの〔安全〕の節と一緒に見てほしい。
