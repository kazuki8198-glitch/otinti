# 専門家の読みの報告：第 1 部 第 7 章（新）`inst`「計器と表示」（W15 の下書き・R2）

単位：expert-inst（W15 の章の専門家の読み手）。読んだ日：2026-10-30。
立場：飛行教官（FAA の CFI・CFII・MEI）で、JCAB の学科（自家用・事業用の航空工学・空中航法、計器飛行証明の航空機用計測器）の出題範囲も知っている読み手として読んだ。
読んだもの：`textbook/rewrite/combined/drafts/inst.js`（8 節・章末）、`drafts/inst-figs.js`（新 10・描き直し 1）、`drafts/inst.claims.json`、`reports/W15.md`・`factcheck-inst.md`・`reader-inst.md`・`expert-aero.md`・`expert-sys.md`、台帳 `ledgers/ACS-MAP.json`・`JCAB-MAP.json`・`CONCEPTS.json`・`RULINGS.json`（`R.static-block-vsi`・`R.altimeter-rule-of-thumb`・`R.northerly-turn-error`・`R.deviation-sign`）、`flight-lab/src/book-terms.js`（`FL.terms`）、DESIGN 3.2・3.3（第 7 章の行）・3.4・6.2・7.2、DECISIONS、STYLE。比べた他の章：`drafts/aero.js`（`aero.lift`・`aero.aoa`・`aero.turn`・`aero.vn`）・`drafts/basics.js`（`basics.alt`・`basics.time`・`basics.speed`）・`drafts/navb.js`（`navb.north`・`navb.wind`）・`drafts/sys.js`（`sys.cockpit`・`sys.eis`・`sys.elec`）・`drafts/wx.js`（`wx.atm`）・`drafts/hfadm.js`、今の `flight-lab/src/book-3.js`（`emg.abnormal`）。

**下書きは変えていない**（読み手の役目：直さない）。変えたファイルはこの報告だけ。

## 1. 結論

教官の目で見て、正確でよく組み立てられた章です。「測る → 計算する → 見せる → 使う」の流れで表示を情報源までたどらせ、**同じ情報源の表示は確かめ合いにならない（多数決にしない）**を章の芯にしたこと、Archer の 1 本の柱から ADC と予備計器へ管が行くので**詰まりは予備計器にも出る**と POH で示したこと、昇降計の「傾向はすぐ・率は遅れる」、高度計の 2 つの誤差を並べた図、「スイッチを押したことと作動は別」「VS は速度を保たない」は、口述でそのまま使える質です。数値は事実確認役が 77 行とも一次資料と照らしており、私が自分で読み直した範囲（PHAK 第 8 章・IFH 第 5 章・AIM 7-2・AAH 第 4 章・Archer III POH 補足 2・G1000 の手引き）でも、本文の数値の誤りは見つけていません。

足りないのは、①**安全に関わる「するべきこと」**が 3 か所で抜けていること（飛行中に速度計が信用できないとき、28.00 inHg より低い気圧のときの向き、自動操縦の高度保持で出力が足りないとき）、②**JCAB の出題範囲と例題集が問う語と内容**（QNE・ジャイロシン・コンパスのフラックス・バルブ・水平儀の指示誤差と自立装置・指針式の旋回計・注意警報の方法・EAS）、③**第 1 部の他の章と二度教えている概念**が 6 つあること、です。

数：**must 2・should 17・nit 9**（must の 2 つは、事実確認役の M1・M2 に専門家として同意したもの。should と nit はこの報告で新しく見つけたもの。事実確認役・初学者の読み手・expert-aero・expert-sys と重なるものは各項目に書き、9 にまとめた）。

- **must**：E-M1 `inst.flow` の思い出そうの電気の順番が POH と逆（factcheck M1）、E-M2 図 `instApBand` の横のモードの作動と待ちの位置が逆（factcheck M2）。
- **should の主なもの**：E-S1〔安全〕飛行中に速度計が信用できないときにすることと、ピトー管と排水口の両方の詰まりの罠、E-S2〔安全〕28.00 inHg より低いときは実際の高さが低い側、E-S3〔安全〕自動操縦の高度保持で出力を戻さないと失速・補足 2 の飛行前点検と進入中の 1 秒、E-S4 水平儀の指示誤差と自立装置（ACS PA.VIII.A.K1a・JCAB）、E-S5 指針式の旋回計（JCAB 例題の図はこの型）、E-S6 ジャイロシン・コンパスとフラックス・バルブ（JCAB 事業用 例題 9）、E-S7 注意警報の 3 段階、E-S8 QNE と絶対高度（JCAB 例題 18）、E-S9 IAS → CAS → EAS → TAS と位置誤差・器差、E-S10〜S15 二度教えている概念 6 つ、E-S16・S17 JCAB・ACS の札と対応表。

## 2. 確かめた一次資料（2026-10-30 に元の URL から自分で取得し、本文を読んだ）

- **FAA PHAK FAA-H-8083-25C 第 8 章**（`R.phak8` の URL）：Blocked Pitot System（入口だけ／入口と排水口の両方。「If the static port is unblocked and the aircraft should change altitude, then a change is noted on the ASI」「The pitot tube may become blocked during flight due to visible moisture. Some aircraft may be equipped with pitot heat for flight in visible moisture」）、Blocked Static System（「a blocked static system produces a continuous zero indication」）、Turn Indicators（「Aircraft use two types of turn indicators: turn-and-slip indicators and turn coordinators … the turn-and-slip indicator shows only the rate of turn … Both instruments … serve as a backup source of bank information in the event an attitude indicator fails」、Turn-and-Slip Indicator の単一ジンバルとばね・転倒しない、Turn Coordinator の 2 つの印）、Heading Indicator（15°/時、「Some heading indicators referred to as horizontal situation indicators (HSI) receive a magnetic north reference from a magnetic slaving transmitter」）、The Flux Gate Compass System（400 Hz の交流で励磁するフラックス・バルブ）、Remote Indicating Compass（slaved gyro と free gyro、「the magnetic slaving transmitter, is mounted remotely, usually in a wingtip to eliminate the possibility of magnetic interference」）、速度計の帯の下の端（VS0：最大着陸重量、VS1：最大離陸重量）、図 8-4（−10 ℃・1,000 ft で約 100 ft）、北旋誤差・南旋誤差（15° ＋ 緯度の半分）・ANDS・18°。
- **FAA IFH FAA-H-8083-15B 第 5 章**（`R.ifh` の URL）：Attitude Indicators（5-18〜5-19：erection mechanism、「This erection can take as long as 5 minutes, but is normally done within 2 to 3 minutes」、「there may be a slight nose-up indication during a rapid acceleration and a nose-down indication during a rapid deceleration. There is also a possibility of a small bank angle and pitch error after a 180° turn. These inherent errors are small and correct themselves within a minute or so」）、Preflight の計器点検（5-37〜5-38：「If the horizon bar fails to remain in the horizontal position during straight taxiing, or tips in excess of 5° during taxi turns, the instrument is unreliable」、方向指示器は滑走路の向きと 5° 以内、コンパスは既知の向きと比べる、代替静圧源の弁、ピトーヒーターは電流計で、75 ft を超えたら試運転の場所で測り直す、規正値がなければ空港の標高に合わせる）。
- **FAA AIM 7-2-2・7-2-3**（`R.aim72` の URL）：Low Barometric Pressure「Flight operations are not recommended when an aircraft's altimeter is unable to be set below 28.00 "Hg. In this situation, the aircraft's true altitude is lower than the indicated altitude. This situation may be exacerbated when operating in extremely cold temperatures」、7-2-3「Scale error may be observed while performing a ground altimeter check … plus or minus 75 feet or greater」。
- **FAA Advanced Avionics Handbook 第 4 章**（`NEW_R.aah4` の URL）：Power Management「If the climbing vertical speed selection is too great, the aircraft increases the pitch attitude until it achieves that vertical speed, or the wing stalls … Leveling off from a descent, without restoring a cruise power setting results in a stall as the FD/autopilot attempts to hold the altitude selected」、「Pitch control pressure applied with the altitude hold mode engaged will cause the autopilot to trim against you」、「Most autopilots have indicators for the amount of servo travel or trim being used. These can be early indicators of adverse conditions, such as icing or power loss」、「The first and closest method of disconnecting a malfunctioning autopilot is the autopilot disconnect switch … usually a red button, often mistaken by new pilots for the radio transmit button」、Autopilot Mode Awareness の 2 つの習慣。
- **Piper PA-28-181 Archer III POH VB-2266 補足 2**（`R.archerPoh` の URL。2013-04-16）：装置は 2 軸の自動操縦（補足の Section 1 に製品名。GFC 700 型ではない）。AUTOPILOT MALFUNCTION「Aircraft Control … Maintain by overpowering autopilot servos」、「Do not re-engage the autopilot until the problem has been identified and corrected」、「a. … climb, cruise, or descent, with a three second delay … 55° bank and 320 ft. altitude loss. b. … during an approach or maneuvering flight with a one second delay … 20° bank and 80 ft. altitude loss」。PRE-FLIGHT PROCEDURES — AUTOPILOT／MANUAL ELECTRIC TRIM（AP DISC で外れる、自己診断、トリムの向き、「Verify trim servo can be overpowered by holding trim wheel stationary」、片方のスイッチでは動かない、TRIM INTER でトリムが止まり警報が鳴る）。
- **Garmin G1000 Pilot's Guide for Cessna Nav III 190-00498-07 Rev. A**（`NEW_R.g1000pg` の URL）：付録 A Alert Level Definitions（WARNING「requires immediate pilot attention … continuous aural tone … RED」、CAUTION「abnormal conditions … that may require pilot intervention … single aural tone … YELLOW」、MESSAGE ADVISORY「general information … ADVISORY Softkey」）、第 1 章「AHRS ALIGN: Keep Wings Level … should display valid attitude and heading fields typically within the first minute of power-up. The AHRS can align itself both while taxiing and during level flight」。
- **Garmin G1000 Cockpit Reference Guide for the PA-28-181**（`R.g1000` の URL）：Archer の CAS annunciations（Warning：ALTR FAIL・L/R FUEL QTY・START ENGD、3 回のチャイム。Caution：PITOT HEAT FAIL・PITOT HEAT OFF・L/R FUEL QTY ほか、2 回のチャイム。Advisory：EMERG BATT ON・FUEL IMBAL・AV FAN FAIL ほか、1 回のチャイム）。
- **国土交通省 航空局「航空従事者技能証明学科試験出題範囲参考」**（`ledgers/src/sources/mlit/` の写し）：事業用「（イ）計器表示及び注意警報装置：概要、注意警報の方法」「（ウ）回転角：概要、シンクロによる指示方式」「（エ）ジャイロ：…ジャイロ・スコープの駆動と自立装置」「（ア）水平儀：…水平儀の指示誤差」「（ア）磁方位計器：…ジャイロシン・コンパス」、計器飛行証明「航空計器の色標識の概要」ほか。
- **同 例題集 2026 年 6 月**（`FL.terms` の `reiPPL`・`reiCPL`・`reiIR` の URL。sha256 が `FL.terms` の値と一致）：自家用 航空工学 例題 2（IAS・CAS・EAS・TAS）・例題 17（**指針式の旋回計とすべり計の図**で内滑り・外滑りを問う。図を画像で見た）・例題 18（**滑走路上で QNE セッティングしたときの高度計の指示 → 気圧高度**。選択肢に絶対高度）・例題 19（北旋誤差）、空中航法 例題 13（磁北と羅北のなす角が自差）、航空気象 例題 4（気圧高度計）、航空通信 例題 12（14,000 ft で QNH から QNE）。事業用 航空工学 例題 1（CAS は IAS を**位置誤差と器差**に対して修正したもの）・例題 9（**ジャイロシン・コンパス系統のフラックス・バルブ**：翼端・胴体後部に付けるのは四分円差・半円差の影響が少ないため）、空中航法 例題 12（QNH の誤セットと対地高度）。計器飛行証明 例題 2（磁気コンパス）。

## 3. 問題（重い順）

### must（どちらも事実確認役の指摘に専門家として同意。数に入れた）

**E-M1　`inst.flow` の思い出そう：発電機が止まると、すぐ非常用バッテリーが予備計器に電気を送る、と読める**（factcheck M1・reader F4 と同じ）
- POH 3.5d・7.13 では、発電機が止まるとまず本体のバッテリーが必須のバスに電気を送り、バッテリーが減ってから予備計器が非常用バッテリーで約 30 分動く。教官としては、ここは「発電機が止まったら、すぐ着陸を考える」判断の根拠なので、順番の誤りは must。factcheck の直し方（「まずバッテリー → 弱ると非常用バッテリー」）でよい。住所の `sys.elec`（W14）と同じ言い方にそろえる。

**E-M2　図 `instApBand`：横のモードの「待ち（白）」と「作動（緑）」の位置が逆**（factcheck M2 と同じ）
- G1000 Pilot's Guide の AFCS の帯は「横：待ち｜作動、AP の状態、縦：作動｜基準｜待ち」。白い待ちのモードは作動中のモードの外側に出る。教える図そのものが逆なので must。factcheck の案（x を入れ替える）でよい。

### should

**E-S1〔安全〕`sys.g1000`：飛行中に速度計が信用できないときに「すること」がなく、ピトー管と排水口の両方が詰まったときの罠も書いていない**
- 今の節は、症状の表・離陸滑走で速度計が動かないときは離陸をやめる・代替静圧源・ピトーヒーター 1 文・赤い × まで。飛行中に速度計がおかしいと気づいたときの操作がない。今の `emg.abnormal`（`book-3.js`）は「計器の変わり方は `sys.g1000`」とだけ書くので、ACS PA.IX.C.K2c（Pitot-static system malfunction）・PA.I.G.K2 の中身は実質この節だけになる。
- 罠：入口と排水口が両方詰まると、上昇で速度計の値が増える（PHAK）。速度計に合わせて機首を上げて「速度を減らそう」とすると、本当の速度は減り、失速に近づく。降下では逆に遅く見え、機首を下げると速度超過に近づく。これは PHAK が書く計器の動きから直接出る結論で、新しい事実ではない。
- 直し方（案）：詰まりの表の後に 3〜4 文。「飛んでいる途中で速度計がおかしいと思ったら、速度計に合わせて機首を動かしません。いつもの姿勢と出力を保ちます。目に見える水分の中では、ピトー管が詰まることがあるので、ピトーヒーターを入れます（PHAK 第 8 章）。入口と排水口が両方詰まると、上昇で速度が増えて見えます。それに合わせて機首を上げると、本当の速度が減って失速に近づきます。」＋「姿勢と出力の表は ${ahead('ifr.instr', …)}（第 4 部で学びます）」。ここが大切か判断の目に「速度計がおかしければ、姿勢と出力で飛ぶ」を 1 行。章末の例（examples）に 1 行足してもよい。POH の姿勢と出力の具体的な値は書かない（〔書き手が確かめる〕）。
- 根拠：PHAK 第 8 章 Blocked Pitot System、ACS PA.IX.C.K2c・PA.I.G.K2、DESIGN 3.3 `ifr.instr` の「速度計が信用できないときの姿勢と出力の表」。

**E-S2〔安全〕`inst.alt`：28.00 inHg より低い気圧のとき、実際の高さがどちら側かを書いていない**（reader A1 と同じ場所。専門家としては「危ない側を書く」ことが要点）
- 今の文：「28.00 inHg より低い規正値を合わせられない高度計で飛ぶことは、勧められていません（米国の AIM 7-2-2・PHAK 第 8 章）」。
- AIM 7-2-2 b は同じ段落で「In this situation, the aircraft's true altitude is lower than the indicated altitude … may be exacerbated when operating in extremely cold temperatures」と書く。31.00 の側（実際は高い＝安全な側）は書いてあるのに、危ない側だけ理由がない。
- 直し方（案）：「規正値が 28.00 inHg より低い日に、そこまで合わせられない高度計で飛ぶと、実際の高さは表示より低くなります。寒さが重なると、さらに低くなります。そのため、そうした日に飛ぶことは勧められていません（米国の AIM 7-2-2）。」

**E-S3〔安全〕`inst.ap`：高度保持で出力が足りないと失速すること、補足 2 の飛行前点検・進入中の 1 秒・直るまで入れ直さないことがない**
- 今の節は「VS のモードは速度を保たない」だけを書く。AAH 第 4 章は同じ段落で「**Leveling off from a descent, without restoring a cruise power setting results in a stall** as the FD/autopilot attempts to hold the altitude selected」と書く。訓練機で実際に起きやすいのは、降下からの水平で出力を戻し忘れる・上昇から水平に移って出力を絞りすぎる、のほう。また「Pitch control pressure applied with the altitude hold mode engaged will cause the autopilot to trim against you」は、本文の 6 つめ（手伝わない）の理由そのもの。
- 補足 2 には、本文にない次の 3 つがある：①**進入中や運動中の故障は 1 秒の遅れでバンク 20°・高度 80 ft**（本文は上昇・巡航・降下の 3 秒・55°・320 ft だけ。地面に近いのは進入のほう）、②**「Do not re-engage the autopilot until the problem has been identified and corrected」**、③**飛行前の点検**（AP DISC で外れる・自己診断・トリムの向き・トリムのサーボは手で止められる・TRIM INTER でトリムが止まり警報が鳴る）。
- 直し方（案）：VS の段落の後に「高度を保つモード（ALT）も速度を保ちません。降下から水平に移るときに出力を戻さないと、自動操縦は機首を上げ続け、失速へ向かいます（FAA の手引き AAH 第 4 章）」。思うように動かないときの段落に「進入中は 1 秒の遅れでバンク 20°・高度 80 ft」「原因が分かって直るまで、入れ直しません（POH 補足 2）」。「自動操縦を付けた機体は、飛ぶ前に補足の手順で、外れること・トリムが止まることを確かめます（POH 補足 2）」を 1 文。説明してみよう 22 の④に「飛行前の点検」を足す。
- 根拠：AAH 第 4 章 Power Management・Altitude Hold、Archer III POH VB-2266 補足 2 の Section 3・4。

**E-S4　`inst.gyro`：水平儀（姿勢指示器）の指示誤差と自立装置、立ち上がりの時間、地上走行での点検がない（ACS PA.VIII.A.K1a・JCAB 3 見出し）**
- 今の節は、剛性と歳差・真空と電気・バンクの目盛り・ピッチとバンクの限界と転倒まで。JCAB の出題範囲は「ジャイロ・スコープの駆動と**自立装置**」（事業用 1.6.2.4・計器 2.2）と「水平儀の**指示誤差**」（事業用 1.6.3.1・計器 2.3）を名指しし、ACS PA.VIII.A〜D.K1a は「Instrument limitations and potential errors」を問う。
- 直し方（案）：姿勢指示器の段落に 3 文。「こまを鉛直に立て直すしくみ（自立装置、erection mechanism）が中にあります。動力を入れてからこまが立つまで最大 5 分、ふつう 2〜3 分かかります。急な加速では少し機首上げ、急な減速では少し機首下げを示し、180° 旋回のあとにはバンクとピッチの小さな誤差が出ます。どれも水平飛行に戻ると 1 分ほどで直ります（IFH 第 5 章）。」判断の目に「地上走行の旋回で、姿勢指示器が 5° を超えて傾けば信用できない」「方向指示器は滑走路の向きと 5° 以内」（IFH 第 5 章）を足す（今の判断の目は旋回傾斜計と方向指示器だけ）。G1000 型の AHRS も「電源を入れてから姿勢と方位が出るまで、ふつう 1 分以内。地上走行中や水平飛行中にも整列できる」（G1000 Pilot's Guide）と 1 文あると、機械式との対比になる。これで `refs` にあって本文で一度も引いていない `R.ifh`（factcheck N8）も使われる。
- 根拠：IFH 第 5 章 5-18〜5-19・5-37〜5-38、G1000 Pilot's Guide 第 1 章、JCAB 出題範囲（事業用・計器）、ACS PA.VIII.A.K1a。

**E-S5　`inst.gyro`：指針式の旋回計（turn-and-slip indicator）を説明していない。JCAB の例題の図はこの型**（reader C3 は名前の食い違いとして指摘。専門家としては中身の不足）
- 本文は旋回傾斜計＝飛行機の印の型（ターンコーディネーター）だけ。写真 `ch04-photo3` は指針式。JCAB 自家用 航空工学 例題 17 の「旋回傾斜計」の図も**針とすべり計の指針式**で、針の向きと球の位置から「左旋回で外滑り」を答えさせる。PHAK も 2 つの型を分けて書く（指針式はジンバルが 1 つでばねで戻し、旋回率だけを感じ、転倒しない。ターンコーディネーターは斜めに付けてロールの速さも感じる。どちらも姿勢指示器が壊れたときのバンクの予備の情報になる）。
- 直し方（案）：旋回傾斜計の段落の前に 2〜3 文。「旋回を示す計器には 2 つの型があります。針で示す型（旋回計、turn-and-slip indicator）は旋回率だけを感じます。飛行機の印で示す型（ターンコーディネーター）は、こまを斜めに付けて、ロールの速さも感じます。どちらも旋回の向きと率を示し、姿勢指示器が壊れたときのバンクの手がかりになります（PHAK 第 8 章）。」写真の位置をこの段落の直後に。名前は W04 が決める（下の 9）。
- 根拠：PHAK 第 8 章 Turn Indicators・Turn-and-Slip Indicator、JCAB 例題集 自家用 航空工学 例題 17（図を画像で確認）。

**E-S6　`sys.compass`（または `inst.gyro`）：ジャイロシン・コンパス（遠隔指示コンパス）とフラックス・バルブがない（JCAB 事業用 1.6.5.1・例題 9）**
- 本文は「地磁気のセンサーで自動で合わせる型（HSI など）」の 1 句だけ。JCAB の出題範囲は「磁方位計器：…ジャイロシン・コンパス」を名指しし、事業用 航空工学 例題 9 はフラックス・バルブそのものを問う（正答は「翼端・胴体後部などに取り付けるのは四分円差・半円差の影響が少ないため」）。PHAK 第 8 章にも The Flux Gate Compass System と Remote Indicating Compass の節がある。G1000 型の AHRS の「地磁気のセンサー」（`inst.flow`）も同じ考えなので、つなぐと分かりやすい。
- 直し方（案）：方向指示器か磁気コンパスの節に 3 文。「方向指示器を地磁気の向きに自動で合わせる型を、遠隔指示コンパス（ジャイロシン・コンパス、remote indicating compass）といいます。地磁気を感じる部品（フラックス・バルブ、flux valve）は、機体の磁気の影響を避けて、翼端などに離して付けます。交流で動くので電源が要ります（PHAK 第 8 章）。G1000 型の AHRS が方位に使う地磁気のセンサーも、同じ考えです。」四分円差・半円差は発展にするか、W04 の語が決まってから。
- 根拠：PHAK 第 8 章、JCAB 出題範囲（事業用 1.6.5.1）、例題集 事業用 航空工学 例題 9。

**E-S7　`inst.pfd`：注意警報の方法（警告・注意・助言の 3 段階）がない（JCAB 事業用 1.6.1.2・自家用 1.2.5.1・計器 2.1）**
- 今の本文は「数字に添えてあるもの」の表の 1 行（「警報・注意の表示｜どれを先に処置するか」）だけ。DESIGN 3.3 の `inst.pfd` の行も「警報の窓」を挙げている。JCAB の 3 つの見出しが「注意警報の方法」を問う。
- 直し方（案）：表の後に 1 段落。「G1000 型の注意の窓（annunciation window）は、知らせを 3 段階に分けます。警告（WARNING）は赤い文字で、すぐ処置が要るもの。注意（CAUTION）は黄色の文字で、処置が要るかもしれない異常。助言（ADVISORY）は知らせだけです。段階ごとに音も違います（G1000 型の手引き）。Archer の例では、発電機の故障（ALTR FAIL）が警告、ピトーヒーターの故障や OFF が注意、非常用バッテリーの使用（EMERG BATT ON）が助言です（G1000 の手引き）。」これで E-S1 のピトーヒーターともつながる。音の数（Archer の CRG は 3 回・2 回・1 回のチャイム、Cessna の Pilot's Guide は続く音・1 回）は装置で違うので、書くなら「段階ごとに違う」までにする。
- 根拠：G1000 Pilot's Guide 付録 A Alert Level Definitions、G1000 CRG（PA-28-181）CAS Annunciations、JCAB 出題範囲。

**E-S8　`inst.alt`：JCAB の語「QNE」と「絶対高度」が本のどこにもない**
- JCAB 自家用 航空工学 例題 18 は「滑走路上において QNE セッティングしたときの高度計の指示」（正答：気圧高度。選択肢に絶対高度）、航空通信 例題 12 は「14000 フィートで QNH から QNE にセットする」を問う。合本の下書きと今の本を全部探しても「QNE」は 0 件、「絶対高度」は `FL.terms` の行だけ（本文 0 件）。`inst.alt` は JCAB の見出し「高度計：…アルティメター・セッティング」（事業用 1.6.4.2・自家用 1.2.5.4）の住所。
- 直し方（案）：「標準の気圧に合わせたときの表示が気圧高度」の文に「標準の気圧（29.92 inHg・1013.2 hPa）に合わせることを、日本の試験や管制では QNE（セッティング）と呼びます」を足す（日本の呼び方なので、文に国を書くか `bk.jp` に。〔書き手が確かめる：AIP Japan GEN の略語で QNE の定義を一次資料で〕）。絶対高度は「地面からの本当の高さ（AGL）を絶対高度（absolute altitude）といいます」と `basics.alt` か `inst.alt` の住所の 1 か所で（W04・W10 の持ち主と決める）。
- 根拠：JCAB 例題集 自家用 航空工学 例題 18・航空通信 例題 12、`FL.terms` の `absolute-altitude`（例題 3 の根拠つき）。

**E-S9　`inst.speed`：IAS → CAS → EAS → TAS の順の EAS が抜けている。JCAB の語「位置誤差」「器差」も使っていない**
- 本文は「CAS を高度と気温で直すと、真対気速度」で、ここを混同しないの表も IAS・CAS・TAS・GS の 4 つ。JCAB 事業用の見出し「対気速度」（1.1.1.2）は「高速飛行と EAS」を挙げ、自家用 例題 2 も EAS を問う。EAS は `aero.lift` が住所（DESIGN 3.3）なので、ここは呼び戻しで足りる。事業用 例題 1 は「CAS は IAS を**位置誤差と器差**に対して修正したもの」と書く。本文の「取り付け位置による誤差と、計器の誤差」は同じ中身なので、JCAB の語を括弧で添えるだけでよい。
- 直し方（案）：TAS の段落の前に「速い飛行機では、CAS から空気の圧縮の分を直した等価対気速度（EAS）を経て TAS にします。訓練機の速さでは、CAS と EAS はほぼ同じです（${bk.see('aero.lift', …)}）」。ここを混同しないの表に EAS の行を足すか、表の下に 1 行。「取り付け位置による誤差（位置誤差）と、計器の誤差（器差）」。
- 根拠：JCAB 出題範囲（事業用 1.1.1.2）、例題集 自家用 航空工学 例題 2・事業用 航空工学 例題 1、DESIGN 3.3 `aero.lift`。

**E-S10　二度教えている①：標準旋回と旋回率の式・計算演習（住所は `aero.turn`）**（expert-aero E-S10 と同じ。W13 と決めてほしい）
- `aero.turn` は標準旋回を太字で定義し、「1,091 × tan ÷ TAS」の式・計算演習・「TAS の 15%」（IFH）を持つ。`inst.gyro` も同じ式と計算演習（100 kt で約 15°）を持つ。値は同じで食い違いはないが、完全な説明が 2 か所にある。
- 直し方（案）：`inst.gyro` は「計器でどう読むか」（2 つめの印・2 MIN・針の幅・G1000 型の旋回率の線）を残し、式と計算演習は `bk.recall('標準旋回は 1 秒に 3°…', ['aero.turn', …])` の 3 行に。説明してみよう 11 の答えの `bk.see` も `aero.turn` へ。

**E-S11　二度教えている②：動圧 ½ρV² と、密度と TAS の計算（住所は `aero.lift`）**
- `aero.lift` は動圧を太字で定義し、「速度計は、この動圧を測って速度を表示します」と書き、密度比 0.81 の計算演習（TAS は 1.11 倍）と EAS を持つ。`inst.speed` も ½ρV² を書き直し、密度比 0.64 のほぼ同じ計算演習（TAS は 1.25 倍）を持つ。説明してみよう 2・3 も同じ計算。
- 直し方（案）：`inst.speed` は「速度計がどう動圧を測るか」（ダイヤフラムとケース、図 `instAsi`）を残し、式と密度の関係は `aero.lift` の呼び戻しに。計算演習は、この節にしかない「IAS → CAS（POH の組）→ TAS」の手順に替えるとよい（例：154 KIAS ＝ 148 KCAS の読み方）。説明してみよう 2・3 は基礎教材の問なので残してよいが、答えの `bk.see` を `aero.lift` にする。

**E-S12　二度教えている③：ピッチ角・迎え角・飛行経路角の関係（住所は `aero.aoa`）**
- `aero.aoa` は「α ＝ θ ＋ i − γ」と計算演習とここを混同しないの表を持ち、`aero` の説明してみように「機首が上でも上昇とは限らない」がある。`inst.gyro` は同じ関係を「θ ＝ α ＋ γ（i ＝ 0）」の形で、図 `instPitchPath` と説明してみよう 10 で教え直す。式の並べ方が 2 か所で違うのも、初学者には別の式に見える。
- 直し方（案）：`inst.gyro` の「姿勢と飛行経路は別」は、計器の話（姿勢指示器はピッチを示すが、経路・速度・失速までの余裕は示さない）だけを残し、式は `aero.aoa` の呼び戻しに（今の思い出そうの迎え角の定義と 1 つにまとめる）。図 `instPitchPath` は `aero` の `aoa` の図と同じ中身なので、使うなら式を `aero.aoa` の形にそろえる。

**E-S13　二度教えている④：速度計の色の帯（住所は `aero.vn`）**（expert-aero E-S10 と同じ）
- `aero.vn` は「毎回見る速度計の色の意味も、ここで覚えます」として白・緑・黄・赤の意味と Vso・Vs1・Vfe・Vno・Vne の表を持つ。`inst.speed` も帯の値と意味を書き、帯の下の端の条件（最大着陸重量・最大離陸重量）を足している。
- 直し方（案）：帯の下の端の条件（PHAK）は「条件つきの値」の理由で、`inst.speed` にしかない良い中身。住所を 1 つに決め（`aero.vn` に移すか、`inst.speed` を住所にして `aero.vn` は呼び戻すか）、もう一方は 3 行の呼び戻しに。W13 と決めて `CONCEPTS.json` に行を足す。

**E-S14　二度教えている⑤：自差と自差表（`navb.north` にも太字の完全な説明がある）**
- `sys.compass` は自差・自差表・変える装置（2 段落）を書き、`navb.north`（W18）は「<b>自差（deviation）</b>」を太字で定義して自差表・FOR と STEER・計算の順を持つ。`basics.time` も自差を定義している。DESIGN 3.3 は偏差の住所を `navb.north` とし、コンパスの誤差の住所を `sys.compass` とする（`CONCEPTS.json` `C.compass-errors`）が、自差がどちらかは決めていない。
- 直し方（案）：「自差の原因と自差表（計器の性質）」の住所を `sys.compass`、「偏差と自差の足し引き・FOR と STEER（計算）」の住所を `navb.north` と分け、`navb.north` の太字の定義を `sys.compass` への呼び戻しにする（または逆）。W18 と決めて `CONCEPTS.json` に `C.deviation` の行を足す。factcheck S5（PHAK の「magnetic cargo」など）は住所の側に足す。

**E-S15　二度教えている⑥：高度計の誤差が `basics.alt`（序部）の「ここに注意」にも完全に書いてある**
- `basics.alt` の「ここに注意」は、寒い日の誤差と High to low の両方を理由つきで 5 文で書く。住所は `inst.alt`（`CONCEPTS.json` `C.altimeter-errors`。呼び戻しは `wx.atm` だけが登録されている）。`wx.atm` は呼び戻し 2 文と問 1 つで、形は守っている。
- 直し方（案）：`basics.alt` の「ここに注意」を 3 行（「寒い日と、気圧の低い所へ規正値を直さずに飛ぶときは、実際は表示より低い。くわしくは `inst.alt`」）に縮め、`C.altimeter-errors` の `recalls` に `basics.alt` を足す（序部の持ち主と W03・W27）。`inst.alt` はこのままでよい。

**E-S16　`inst.flow` の JCAB の札と中身：圧力計器の検出方式・シンクロがない**（expert-sys X-S11・X-N14 とつながる）
- `inst.flow` は `jcab: ['cpl.1.6.2.1', …]`（圧力計器：概要・検出方式）を持つが、本文に検出方式（アネロイド・ダイヤフラム・ベローズ・ブルドン管など）の説明がない。JCAB-MAP は `cpl.1.6.2.3`（回転角：シンクロによる指示方式）と `ir.2.2` も `inst.flow` に割り当てているが、下書きはこの 2 つを札にしていない（`ir.2.2` の中身はジャイロなので `inst.gyro` が正しい：expert-sys X-N14 に同意）。
- 直し方（案）：①`inst.flow` に発展（`bk.deep`）で「圧力を感じる部品」の小さな表（アネロイド：高度計、ダイヤフラム：速度計・昇降計、ベローズ、ブルドン管：油圧計など）と、遠隔指示（センサーの角度や値を電気で計器へ送る：シンクロなど）を 3〜4 行。エンジン計器の側は `sys.eis`（expert-sys X-S11）と分担を決める。〔書き手が確かめる：FAA AMT Airframe Handbook FAA-H-8083-31 の計器の章など一次資料で〕②書かないなら `cpl.1.6.2.1` の札を外し、JCAB-MAP の `cpl.1.6.2.3` を `sys.eis` だけにして理由の note を残す。

**E-S17　ACS の札と ACS-MAP：この章の中身が対応表に載っていない所がある**（4 の表）
- 下書きの `faa`：`inst.speed` に札がない（PA.I.G.K1h「Pitot-static … and associated flight instruments」に当たる）。`sys.g1000`・`inst.pfd`・`inst.ap` は故障の表示と手順（赤い ×・リバージョン・自動操縦の故障・トリムの暴走）を書くのに PA.I.G.K2（system abnormalities or failures）がない。`inst.pfd` に IR.II.B.K1（c：PFD・MFD）がない。
- ACS-MAP：PA.I.G.K1 の `sections` に `inst.flow`・`inst.speed`・`inst.alt` がない（下書きは `inst.flow`・`inst.alt` に札を付けた）。PA.I.G.K2・PA.IX.C.K2・IR.VII.D.K2 に `sys.g1000`・`inst.pfd` がない。PA.VIII.A〜D.K1（a：limitations and potential errors）は `ifr.scan` だけ（E-S4 を直せば `inst.gyro` を足せる）。IR.II.B.K2（b に autopilot）に `inst.ap` がない。
- 直し方（案）：下書きの札を足すのは W15、ACS-MAP の行を足すのは W42（または統合役）。行と札の案は 4 の表。

### nit

| # | 場所 | 気づいたこと | 直し方（案） |
|---|---|---|---|
| E-N1 | `inst.alt`「地上で確かめる」 | ±75 ft の点検は、AIM 7-2-3 では目盛りの誤差（scale error）を見る点検。IFH は、駐機場の高さが空港の標高と違うことがあるので、75 ft を超えたら試運転の場所で測り直す、規正値がなければ空港の標高に合わせる、と書く | 「この点検で分かるのは高度計の目盛りの誤差です（AIM 7-2-3）。駐機場と空港の標高が違うことがあるので、外れたら試運転の場所で測り直します（IFH 第 5 章）」 |
| E-N2 | `inst.ap`「サーボの力には、人の力で打ち勝てます」 | 主張なのに `inst.claims.json` に行がない（札なし）。また「打ち勝てる」だけだと押し合いを続けてよいと読める（AAH：高度保持中に押すと自動操縦がトリムで逆らう） | 札を付ける（POH 補足 2「Maintain by overpowering autopilot servos」）。「打ち勝てますが、押し合いを続けず、すぐ切ります」 |
| E-N3 | `inst.ap` | 切るスイッチの場所を確かめる習慣がない。AAH は「赤いボタンで、初めのうちは送信のボタンと間違えやすい」と書く | 思うように動かないときの段落に「AP DISC のスイッチの場所を、飛ぶ前に指で確かめます」（AAH 第 4 章） |
| E-N4 | `inst.speed` の VNO・VFE | VNO を定義の句だけで書き、`FL.terms` の正式名「構造上の最大巡航速度」がない。VFE は `aero.vn` が「フラップ下げ最大速度」、ここは「フラップを下げてよい最大の速度」（factcheck N4 の意味の直しも） | 正式名で初出を書く。VFE の名前は W24 で `aero.vn` と 1 つに |
| E-N5 | `sys.compass`「針路と航跡」・説明してみよう 12 | 針路と航跡は `basics` が定義し、風で違うことの計算は `navb.wind` が住所。ここは 3 文の説明と、風の修正の問になっている | 段落を `bk.recall`（`basics` の節）に。説明してみよう 12 の答えの `bk.see` を `navb.wind` に |
| E-N6 | `inst.alt` | 気圧高度・転移高度を平文で定義し直している（住所は `basics.alt` の太字） | 「序部で学んだ気圧高度」の形に（定義の文にしない） |
| E-N7 | `sys.g1000`「予備計器が助けになるのは、ADC そのものが壊れたときです」 | 速度と高度の話としては正しいが、単独で読むと予備計器の役目が ADC の故障だけに見える（姿勢は別のセンサー、画面の故障、電気の故障でも使う） | 「速度と高度について、予備計器が助けになるのは…」 |
| E-N8 | `inst.alt`「高度計のしくみ」 | JCAB の例題（航空気象 例題 4）は「規正した高度計は、セットした気圧の面から機外の気圧までを、標準大気をものさしにして測っている」と考えさせる。今の文でも分かるが、この見方を 1 文足すと、規正値を変えると表示が変わる理由（計算演習②）が先に分かる | 「規正値は、ものさしの 0 をどの気圧の面に置くかを決めます」 |
| E-N9 | `inst.ap` の判断の目 | AAH は、自動操縦のサーボやトリムがいつもいっぱい近くまで動いているのは、着氷や出力の低下の早い手がかりになると書く。訓練機の教官が必ず言う所 | 判断の目に「トリムの表示や操縦輪の位置がいつもと違えば、自動操縦が何かを隠していないかを疑う」（AAH 第 4 章） |

## 4. ACS の知識の項目との照合（ACS-MAP で `inst.*`・`sys.g1000`・`sys.compass` に当たる行と、当たるべき行）

| ACS | 今の対応表の節 | この章の中身 | 判定・提案 |
|---|---|---|---|
| PA.I.G.K1（g Avionics・h Pitot-static, vacuum/pressure, and associated flight instruments） | `sys.*`・`inst.pfd`・`sys.g1000`・`inst.gyro` ほか | `inst.flow`・`sys.g1000`・`inst.speed`・`inst.alt`・`inst.gyro`・`inst.pfd` で足りる | 中身は足りる。`sections` に `inst.flow`・`inst.speed`・`inst.alt` を足す。`inst.speed` に `faa` の札（E-S17） |
| PA.I.G.K2（system abnormalities or failures） | `emg.elec`・`emg.abnormal` | 赤い ×・AHRS／ADC の故障・リバージョン・自動操縦の故障・トリムの暴走 | `sys.g1000`・`inst.pfd`・`inst.ap` を足す。中身は E-S1 を直せば足りる |
| PA.VI.A.K2 Magnetic compass errors | `sys.compass` | 偏差・自差・北旋誤差・加速誤差・揺れ・18° | 足りる |
| PA.VIII.A〜D.K1（a limitations and potential errors・b attitude・c function・d cross-check） | `ifr.scan` | b・c は `inst.gyro`・`inst.pfd`、d は `inst.pfd` の照合 | a の水平儀の誤差が足りない（E-S4）。直したら `inst.gyro` を足す |
| PA.VIII.E.K4・IR.IV.B.K4 Appropriate use of automation | `inst.ap`・`ifr.upset`／`ifr.auto`・`inst.ap` | 6 つの手順・切り方・VS の失速 | おおむね足りる。E-S3 の高度保持の失速を足すと、異常姿勢の原因（自動操縦が失速へ向かう）の説明が閉じる。`aero.stall` の「まず自動操縦を切る」と同じ向きで、食い違いはない |
| PA.IX.C.K2（b vacuum・c pitot-static・d electronic flight deck display malfunction） | `emg.elec`・`emg.abnormal`・`ifr.partial` | 症状は `sys.g1000`・`inst.gyro`・`inst.pfd` | `emg.abnormal` が `sys.g1000` に任せているので、`sys.g1000`・`inst.pfd` を足す。c の「すること」が足りない（E-S1） |
| IR.II.A.K2 Flight control systems | `sys.ctl`・`inst.ap` | 電動トリムの暴走 | 足りる |
| IR.II.B.K1（a〜d） | `sys.g1000`・`inst.gyro`・`sys.elec`・`sys.compass`・`ifr.vacuum` | c の PFD・MFD は `inst.pfd` | `inst.pfd` を足す（札も） |
| IR.II.B.K2（b … autopilot） | `nav.vor`・`ifr.pbn`・`nav.gps` | `inst.ap` | `inst.ap` を足してよい（基礎。本番は `ifr.auto`） |
| IR.II.C.K1 instrument flight deck check | `ifr.instr` | `inst.gyro` の判断の目（旋回傾斜計・方向指示器） | 本番は `ifr.instr` のままでよい。E-S4 の 5° の点検を足すと、第 1 部で下地ができる |
| IR.VII.D.K2 failure modes of primary instruments | `ifr.instr`・`ifr.partial`・`ifr.vacuum` | 故障の形は `sys.g1000`・`inst.pfd` | 呼び戻し先として `sys.g1000`・`inst.pfd` を足してよい |

## 5. JCAB の出題範囲の見出しとの照合（JCAB-MAP で `inst.*`・`sys.g1000`・`sys.compass` に当たる見出し）

| 見出し（小見出し） | 中身 | 判定 |
|---|---|---|
| 対気速度（自家用・事業用 1.1.1.2：IAS・TAS・位置誤差と CAS・高速飛行と EAS） | IAS・CAS・TAS は足りる | EAS の呼び戻しと語「位置誤差・器差」（E-S9） |
| 航空計器の配置（事業用 1.6.1.1） | PFD の配置 | 足りる |
| 計器表示及び注意警報装置（事業用 1.6.1.2・自家用 1.2.5.1・計器 2.1：注意警報の方法・色標識） | 表の 1 行だけ | 注意警報の方法が足りない（E-S7）。色標識は `inst.speed`・`sys.eis` にあるので、JCAB-MAP の `ir.2.1` に 2 つを足す |
| 圧力計器（事業用 1.6.2.1：概要・検出方式） | なし | 足りない（E-S16。`sys.eis` と分担） |
| 回転角（事業用 1.6.2.3：シンクロによる指示方式） | なし | 足りない（E-S16） |
| ジャイロ（事業用 1.6.2.4・計器 2.2・自家用 1.2.5.2：働き・駆動と自立装置） | 剛性・歳差・真空と電気 | 自立装置が足りない（E-S4）。`ir.2.2` の住所は `inst.gyro` に（expert-sys X-N14） |
| 水平儀（事業用 1.6.3.1・計器 2.3：しくみ・指示誤差） | しくみ・限界・転倒 | 指示誤差が足りない（E-S4） |
| 旋回傾斜計（事業用 1.6.3.2・自家用 1.2.5.3） | ターンコーディネーター・すべり計 | 指針式が足りない（E-S5。例題 17 の図はこの型） |
| 定針儀（事業用 1.6.3.3・自家用 1.2.5.3） | 剛性・15°/時・15 分ごと | 足りる |
| ピトー・スタティック系統（事業用 1.6.4.1：概要・システム構成） | 柱・管・詰まり・代替静圧源 | 足りる（例題 1「故障すると速度計のみ」が誤りであることも本文で答えられる） |
| 高度計（事業用 1.6.4.2・自家用 1.2.5.4：構造・使用・アルティメター・セッティング） | アネロイド・規正・2 つの誤差・±75 ft | 語「QNE」が足りない（E-S8） |
| 対気速度計・昇降計（事業用 1.6.4.3・1.6.4.4） | ダイヤフラム・細い穴・遅れ | 足りる |
| 磁方位計器（事業用 1.6.5.1・自家用 1.2.5.5：地磁気と磁方位・磁気コンパス・ジャイロシン・コンパス） | 偏差・伏角・北旋誤差・加速誤差 | ジャイロシン・コンパスが足りない（E-S6。事業用 例題 9） |
| 気圧（自家用・事業用 2.1.1.3・計器 3.1.1.2） | 標準大気・規正値の差と高さ | 足りる（`wx.atm` と） |
| 高度について（自家用・事業用 3.1.1.4） | `basics.alt`・`inst.alt` | 絶対高度の語（E-S8） |
| 航空保安無線施設等に関する知識の「磁気コンパスの使用法」（自家用・事業用 3.1.3.4・計器 1.1.2.3） | UNOS・ANDS・揺れの真ん中で合わせる | 足りる |
| コックピットの自動化（事業用 3.3.3.6：利点と欠点・原則・作業方法） | FD と AP・6 つの手順・切り方・手で飛ぶ腕 | 足りる（`crm.auto` と） |

## 6. 二度教えている概念（1 つの概念に住所は 1 つ）のまとめ

| 概念 | 住所（DESIGN・太字の定義） | この章で重なる所 | 項目 | `CONCEPTS.json` の行 |
|---|---|---|---|---|
| 標準旋回・旋回率の式 | `aero.turn` | `inst.gyro` の式と計算演習・説明してみよう 11 | E-S10 | 新 `C.standard-rate-turn`（expert-aero の案と同じ） |
| 動圧と密度・TAS | `aero.lift` | `inst.speed` の式と計算演習・説明してみよう 2・3 | E-S11 | 新 `C.dynamic-pressure` |
| ピッチ角・迎え角・飛行経路角 | `aero.aoa` | `inst.gyro` の小見出しと図 `instPitchPath`・説明してみよう 10 | E-S12 | 新 `C.pitch-aoa-path` |
| 速度計の色の帯 | `aero.vn` | `inst.speed` の小見出し | E-S13 | 新 `C.asi-arcs`（expert-aero の案と同じ） |
| 自差・自差表 | 決まっていない（`sys.compass`・`navb.north`・`basics.time`） | `sys.compass` の 2 段落 | E-S14 | 新 `C.deviation` |
| 高度計の誤差 | `inst.alt` | `basics.alt` の「ここに注意」（序部の側） | E-S15 | 今の `C.altimeter-errors` の `recalls` に `basics.alt` |
| 針路と航跡 | `basics`・`navb.wind` | `sys.compass` の小見出し・説明してみよう 12 | E-N5 | 足さなくてよい（3 行に縮めれば） |

登録済みの 4 つの住所（`C.pitot-static-blockage`＝`sys.g1000`、`C.compass-errors`＝`sys.compass`、`C.altimeter-errors`＝`inst.alt`、`C.autopilot-modes`＝`inst.ap`）は、どれもこの章に完全な説明があり、住所として足りる。`wx.atm` の呼び戻しも形を守っている。

## 7. よかった所（直すときに残してほしい所）

- 表ごとの「頼っているもの・同じ源の仲間」の表と、「独立かどうかは数ではなく、入力から表示までのつながりで決まる」。教官がいちばん伝えたいことが 1 節目に置かれている。
- 詰まりの表に代替静圧源の行があり、Archer の POH の「窓と通気口を閉め、ヒーターを入れる・50 ft」まで書いたこと。
- 昇降計の「傾向はすぐ、率は遅れる」と「針を追うと直しすぎる」。
- 高度計の 2 つの誤差を同じ図で並べ、「規正値では気温の誤差は直らない」「密度高度は誤差の別名ではない」と書いたこと。
- 「切り替えで直るのは画面の故障だけ」「スイッチを押したことと作動は別」「VS は速度を保たない」。どれも実際の事故の形に合っている。
- 南半球で覚え方が逆になること（UNOS・ANDS の条件）と、日米の数字を囲みだけにしたこと。

## 8. 検査の結果

- `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/sys-figs.js textbook/rewrite/combined/drafts/sys.js textbook/rewrite/combined/drafts/inst-figs.js textbook/rewrite/combined/drafts/inst.js`（Chromium あり、報告だけ）：**error 24・warn 26・pending 2・info 411**。W15 の報告 5.1・`factcheck-inst.md`・`reader-inst.md` と同じ数（style の error 24 は部品の見出しを道具が本文の文と数えるもの、warn は style の初出の形 6・questions 1（`sys` の正解の位置）・claims 19（今の `CLAIMS.json` に行がない）、pending は concepts の `C.autopilot-modes` の呼び戻し（W30）と calc の台帳）。ほかの 12 の検査は error 0・warn 0。この報告の項目（安全の「すること」・JCAB の語・二度教え）は、どれもこの検査では見つからない種類。
- `node textbook/rewrite/combined/ledgers/validate.mjs`：**ok（error 0・warning 37）**。前からの署名待ち。
- 製品のテスト（FLIGHT LAB・TEXTBOOK・CADET）は流していない。この単位が変えたのは報告のファイルだけで、どの製品のテストもこのファイルを読まない（流すと出力の HTML が作り直され、同じ作業の木でほかの単位が作業中のファイルを動かすため。expert-aero と同じ扱い）。

## 9. 台帳の行・ほかの指摘との重なり

**台帳の行**：触っていない（読み手は台帳を直さない）。足してほしい行の案は 6 の表と下の 10。

**事実確認役・初学者の読み手との重なり（専門家として同意。数には入れていない。E-M1・E-M2 を除く）**：
- factcheck S2・reader P1（`inst.pfd` のリバージョン：PFD の故障は自動で切り替わらず DISPLAY BACKUP）〔安全〕：同意。故障の手順の文なので、登録の前に直してほしい。
- factcheck S4・reader AP1（自動操縦のモードの帯は GFC 700 型の例で、この POH の補足の装置は別の型）：同意。補足 2 を読み直すと、装置は 2 軸の別の型で、高度のとらえ方も違う（POH 7.13：高度を先に選び、ALT と VS を一緒に選ぶ）。本文を「どの自動操縦にも共通の考え方（作動と待ち・帯で確かめる・VS と ALT は速度を保たない）」「例：G1000 と一体の型の帯の色」「この POH の Archer の装置」の 3 つに分けると、Archer で ALTS を探す取り違えが起きない。説明してみよう 19 は ALTS を使わない一般の問いに。
- factcheck S6・reader G1（Archer の排水口は機内の左下の弁）、factcheck S1（`basics.time` に偏差の足し引きはない）、factcheck S3・reader Y2（歳差の小図の矢印）、factcheck S5（磁気を帯びた荷物など）、factcheck N11・reader C4（HSI・CDI の初出）、reader C1（ピトースタティック系統とピトー静圧系統）、reader C5（操縦かん・操縦輪・操縦桿）：同意。
- expert-aero E-S10（`inst.speed` の色の帯・`inst.gyro` の標準旋回）：E-S10・E-S13 として同じ。expert-sys X-N14（JCAB-MAP `ir.2.2` の住所）・X-S11（検出方式）：E-S16 で同じ。

## 10. 未解決のこと・ほかの単位にお願いしたいこと（needs from others）

1. **W15（`inst` の書き手、または直す役）**：E-M1・E-M2（must）と E-S1〜E-S9・E-S16・E-S17、E-N1〜E-N9。どれも `drafts/inst.js`（図は `drafts/inst-figs.js` の `instApBand`）の中で直せる。新しい文の主張には札を（IFH 第 5 章 5-18〜5-19・5-37〜5-38、AIM 7-2-2 b・7-2-3、AAH 第 4 章 Power Management、POH 補足 2 の Section 3・4、G1000 Pilot's Guide 付録 A と第 1 章、G1000 CRG の CAS Annunciations、PHAK 第 8 章 Turn Indicators・Flux Gate・Remote Indicating Compass、JCAB 例題集）。E-S1・E-S3 と factcheck S2 の故障の手順の文は、安全レビュー（W27・W36）にも見てもらう。E-S8 の QNE の定義は一次資料（AIP Japan GEN の略語など）で確かめてから書く。
2. **W15 と W13（`aero`）**：E-S10〜E-S13 の 4 つの住所を決め、重なる段落と計算演習を思い出そうに（expert-aero の 9 の 2 と同じ頼み）。
3. **W18（`navb`）**：E-S14。自差の住所を W15 と決め、`navb.north` か `sys.compass` の太字の定義を呼び戻しに。
4. **序部（`basics`）の持ち主（統合役）**：E-S15。`basics.alt` の「ここに注意」を 3 行に縮め、`inst.alt` への `bk.see`（`inst` の登録と同じコミットか後：決まり 13）。E-S8 の絶対高度をどちらに置くかも。
5. **W14（`sys`）**：E-S16 の検出方式の分担（expert-sys X-S11）。E-M1 の電気の言い方を `sys.elec` と 1 つに（reader-inst の 13 の 6 と同じ）。
6. **W04（`FL.terms`）**：足してほしい語と JCAB の表記の確かめ：QNE（・QFE を入れるか）、位置誤差・器差、フラックス・バルブ、ジャイロシン・コンパス（遠隔指示コンパス）、自立装置、旋回計（turn-and-slip indicator）を旋回傾斜計と別の行にするか（JCAB 例題 17 の図は指針式。今の表は英語を turn coordinator にしている）、羅北（空中航法 例題 13）、四分円差・半円差、VFE の正式名（`aero.vn` の「フラップ下げ最大速度」と 1 つに）。HSI・CDI・AHRS・ADC の扱い（factcheck N11・reader C4 と同じ）。
7. **W42（または統合役。`ACS-MAP.json`・`JCAB-MAP.json`）**：E-S17 と 4 の表の行（PA.I.G.K1 に `inst.flow`・`inst.speed`・`inst.alt`、PA.I.G.K2・PA.IX.C.K2・IR.VII.D.K2 に `sys.g1000`・`inst.pfd`（K2 は `inst.ap` も）、IR.II.B.K1 に `inst.pfd`、IR.II.B.K2 に `inst.ap`、E-S4 のあと PA.VIII.A〜D.K1 に `inst.gyro`）。JCAB-MAP の `ir.2.2` を `inst.gyro` に、`ir.2.1` に `inst.speed`・`sys.eis`、`cpl.1.6.2.3` の扱い（E-S16）。
8. **W03・W27（`CONCEPTS.json`）**：6 の表の新しい行 5 つと `C.altimeter-errors` の `recalls`。
9. **W30（第 4 部）**：E-S1 で `sys.g1000` から `ifr.instr` へ「予告」のリンクを置くなら、`ifr.instr` の「速度計が信用できないときの姿勢と出力の表」（DESIGN 3.3）を必ず作る。E-S4 の 5° の点検は `ifr.instr` の計器点検（IR.II.C.K1）で本番の説明に。
10. **W38・W41（第 7 部）**：日本の高度計規正の手順（14,000 ft で上昇は QNH → QNE、降下は QNH にしたとき 14,000 ft になる所で戻す：JCAB 航空通信 例題 12）は `jair.rules`・`jifr.rules` の持ち物。E-S8 で `inst.alt` に置くのは語の定義だけにする。
