# 事実確認の報告：第 2 部 第 23 章 `tl`・第 24 章 `emg`・第 25 章 `solo`（W28-p2b の下書き、R3）

単位：factcheck-p2b（W28 の第 2 部後半の事実確認役。下書きは書いていない）。作業日：2026-10-31。
対象：`textbook/rewrite/combined/drafts/p2b.js`・`p2b-figs.js`・`p2b.claims.json`（W28-p2b）。照らしたもの：DESIGN 6.2（15 の決まり）・3.3（第 2 部 第 23〜25 章）・3.4・4.2（kiso11・kiso06）・7.2 W28、DECISIONS.md（判断 2・3・11・12）、STYLE.md、W28-p2b の報告 `reports/W28-p2b.md`、台帳 RULINGS（`R.turnback`・`R.crosswind-landing`・`R.stabilized-approach`・`R.numeric-cues`・`R.vfr-into-imc`）・ERRATA（`SYNC.t2-abeam-rpm`）、課目 `flight-lab/src/syllabus.js`（t1〜t4・x1〜x3・e1〜e3・c1・i2・i3）、今の本の `aero.vn`・`hf.body`。
**下書き・台帳・製品のファイルは 1 つも変えていません。** 変えたのはこの報告だけです。直しの案は下の 4 にまとめました（直すのは章の持ち主 W28-p2b か、この章の改稿の単位）。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck-p2b.md`（新） | この報告 |

一次資料は W28-p2b の取り寄せ（scratchpad の `w28b/`・`w15dl/`）を使わず、どれも元の URL から新しく取り寄せて読んだ（scratchpad の `fcp2b/dl`・`fcp2b/txt`。リポジトリには置いていない）。チェックリストは取り寄せ直した PDF が `w15dl/Archer_Checklist.pdf` とバイトで同じことも確かめた。

## 2. 確かめ方（一次資料。どれも 2026-10-31 に元の URL から取り寄せて本文を読んだ）

| 資料 | 取り寄せ方 | 確かめた所 |
|---|---|---|
| FAA AFH（FAA-H-8083-3C）第 3 章（PDF） | R.afh3 の URL | 最良滑空・最小沈下（a few knots less）・重さは届く距離を変えない（重い機体は速い速度）・風で届く距離・速すぎても遅すぎても届かない・滑空に入るときは高度を保って最良滑空速度まで減速 |
| AFH 第 6 章（PDF） | R.afh6 | 向かい風の 2 つの理由、つま先はラダーの部分、torque と P-factor で左、ブレーキで向きを直さない、遠くの 2 点、強く引くと AOA 過大で沈む・失速、浮いた直後は傾きを忘れやすい、離陸出力は地形・障害物の 500 ft 上まで、ソロに近づくと早く浮き上昇も速い、地面効果の外で上昇できない（高密度高度・高温・最大重量）、短距離（滑走路の端から・Vx は障害物か 50 ft まで・早く浮くと平らな上昇・障害物までは外を見る・Vy になってからフラップ）、不整地（重さを翼へ・止まらずに並ぶ・地面効果の中で Vx まで）、Rejected Takeoff（4 つの例・浮いているべき点・POH の離陸と着陸の滑走距離の和・アイドルと最大制動・火災ならミクスチャーとマグネトー）、浮いた直後のエンジン故障（すぐ機首を下げ右ラダーを戻す・正面へ・引き返しは訓練済みで高度があるときだけ） |
| AFH 第 8 章（PDF） | R.afh8 | 左回り・場周高度は通常 1,000 ft、45° で中央の真横へ、1/2〜1 マイル、進入端の真横まで場周高度・そこで降下、約 45° でベースレグ、離陸上昇は滑走路の端を越え場周高度の 300 ft 以内でクロスウインドへ、出るときは直進か場周高度で 45°、upwind（AFH の定義）、中央を横切る別法は混んでいるとき使わない、70〜90 kt |
| AFH 第 9 章（PDF） | R.afh9 | 目標点（動かない・下へ動けば先・上へ動けば手前）、安定進入の 7 要素（3°・バンク 15°・＋10／−5・形態とトリム・500〜1,000 fpm と 300 ft より前に 500 fpm 以下）、VMC 500 ft・IMC 1,000 ft・300 ft より下はすぐ、高すぎ・低すぎの直し方（フラップを上げて直さない）、突風の 1/2（70 kt・15 kt → 77 kt）、目は 10〜15°・近すぎ遠すぎ、フレアは 10〜20 ft、フロート・バルーニング・バウンド、着陸復行（Power・Attitude・Configuration、キャブレターヒーター OFF、前へ押す、右ラダー、フラップは降下が止まってから少しずつ、地面効果の空気のクッションは幻）、横風（クラブ・ウイングロー・多くの場合ウイングロー・長いファイナルはクラブから移る・ラダーいっぱいでも回るならほかの滑走路）、0.2 V<sub>SO</sub> の実証・よくある間違いの 1 番、スリップ（2 種類・アイドル・速度は昇降舵・風上の翼・やめ方・速度計の誤差・時間とフラップの制限・フラップより早い） |
| AFH 第 18 章（PDF） | R.afh18 | 緊急着陸の 3 種類・予防着陸のほうが危険が少ない、心の落とし穴 3 つ、対地速度 2 倍で 4 倍・一様な減速、接地直前の深いバンク、地域 → 場所・考えを変えるのは 1 回まで、フラップの時機、バッテリーは電気が要らなくなってから、進入の 3 つの要素、地形ごと（狭い所・川・道路と電線の柱・林・水と雪）、離陸直後のエンジン故障と引き返し（図 18-5：4 秒・毎秒 3°・65 kt・2,100 ft・225°・1,000 fpm・1,316 ft・1,016 ft、学生などには受け入れられない危険）、緊急降下（30〜45°・V<sub>NE</sub>・乱気流では V<sub>A</sub>）、エンジン火災（燃料を断つ・再始動しない・マスターを切ると無線とトランスポンダー）、電気火災・客室の火（消火器のあとに通気口・強くなれば閉じる）、構造が弱っている・機体より人、電気系統、ドアが開いたとき、Inadvertent VFR Flight Into IMC（約 10 分・認める → 操縦 → 助け・翼を水平だけ・トリム・指先・自動操縦・外をのぞかない・1 bar width・10°・少し回っては戻す・500 fpm・上昇と旋回を同時にしない・急がされても急がない・雲から出たあと） |
| FAA AIM 2-1・4-2・4-3・6-2・6-3・7-4（HTML） | R.aim21・aim42・aim43・aim62・aim63・aim74 の URL | 2-1-2（PAPI：左側・2 灯か 4 灯・3.5° 超／3.2°／3°／2.8°／2.5° 未満・並んでから降りる）、4-2-4（Student Pilots Radio Identification）、4-3-2（Departure・Upwind leg は Departure の延長で管制の指示に使う・各区間）、4-3-3（プロペラ機 1,000 ft AGL・中央の真横・進入端の真横まで・300 ft・45° で出る）、6-2-1（レーダーの援助は助言・VFR の道を選ぶ・資格がないと伝えて遭難を宣言）、6-2-4（ARM なら衝撃で作動・406 MHz の位置）、6-3-1（MAYDAY を 3 回）、6-3-2（交信中は今のコード・できなければ 7700）、7-4-1〜7-4-8（逆向きの 2 本・heavy/clean/slow・翼幅の短い機・押し出される・数百 fpm・100〜200 ft・2〜3 kt・1〜5 kt・追い風・斜め後ろの弱い追い風・上と風上へ・回避の手順 4 つ・2 分は low approach／missed approach／touch-and-go の後・CAUTION WAKE TURBULENCE と操縦士の責任・ヘリコプターの 3 倍・報告） |
| FAA AC 90-66C（PDF） | R.ac9066 | 8.2.1（入り方は規則でない・流れだけ・直進の進入はすすめない）、9.11.1（discourages VFR straight-in）、11.3・11.4・11.7・11.8、付録 A（1/4 マイル・中央を横切る別法は混んでいるとき使わない） |
| FAA ACS：自家用 FAA-S-ACS-6C・事業用 7B（PDF） | R.acsP・R.acsC | PA.III.B.S5（±100 ft・±10 kt）、PA.IV.A・C・D・E・F・M・N の技能の要素、PA.IX.A（30〜45°・＋0／−10・±100 ft）、PA.IX.B（±10 kt・K2b 最良滑空と最小沈下）、CA.IV.B.S10（200 ft）・CA.IV.F.S10（100 ft）、付録 1 の Unsatisfactory Performance（許容を外れてすぐ直さない） |
| Archer III w/ G1000 チェックリスト（MGA、09012025） | R.archerCk | 全ページ（TAKEOFF・CRUISE CLIMB・BALKED LANDING・MANEUVERING SPEED・MAX DEMONSTRATED CROSSWIND・SHORT/SOFT FIELD TAKEOFF・ENROUTE CLIMB at 1000 AGL・BEFORE LANDING・LANDING・ENGINE FAILURE DURING TAKEOFF/FLIGHT・POWER OFF LANDING・ENGINE FIRE・ELECTRICAL FIRE・ELECTRICAL FAILURES・OVERLOAD・EMERGENCY DESCENT・ENGINE ROUGHNESS・LOSS OF OIL/FUEL PRESSURE・HIGH OIL TEMPERATURE・OPEN DOOR） |
| Piper PA-28-181 Archer III POH（VB-2266） | R.archerPoh | 1（V<sub>O</sub> の定義・Demonstrated Crosswind）、2.3（V<sub>O</sub> 113／98 KIAS・Rough air の注意）、2.25（「Demonstrated crosswind values are NOT limitations.」）、3.3（Power Off Glide Speed 2,550 lb・0° Flaps 76 KIAS）、3.5d（緊急用バスで約 30 分）、4.5m（短く遅い着陸はフラップいっぱい）、4.9（乱気流では V<sub>O</sub> まで減速） |
| FAA SAIB CE-10-11（PDF） | R.saib1011 | 必要なブレーカーだけ・1 回・1 分以上・煙やにおいがない・必要な系統 |
| FAA AC 61-65K（PDF） | R.ac6165 | 付録 A の A.3・A.4・A.6・A.7 の題と条 |
| PHAK 第 2 章・第 11 章（PDF） | R.phak・R.phak11 | 第 2 章：1 人のときチェックリストを声に出し、大事な項目はスイッチに触れる。第 11 章：着陸の速度が 10% 速いと着陸距離は少なくとも 21% |
| eCFR 14 CFR 61.23・61.83・61.87・61.89・61.93・61.95・91.3・91.126・91.127・91.131・141.85 | versioner API（2026-10-15 の版、title 14 は 2026-10-29 まで最新） | 本文と照らした（下の 4・5） |
| e-Gov 法令 API v2：航空法 第 74 条・第 75 条（令和 7 年 12 月 1 日施行の版 `327AC0000000231_20251201_507AC0000000055`） | `laws.e-gov.go.jp/api/2/law_data/…?elm=MainProvision-Article_74`・`_75` | 第 74 条（危難の場合の措置：旅客への命令）・第 75 条（急迫した危難：旅客の救助と地上・水上の危難の防止）。**固定した版の本文にある**（写し `sources/egov/` にはまだない） |
| e-Gov の写し `sources/egov/articles/` | 読んだ | FL.jur の囲みの抜き取り：航空法第 35 条・第 76 条・第 76 条の 2、施行規則第 68 条（有効期間 1 年以内）・第 69 条の 2 |
| ANA「ボーイング777 パイロットになるまで Phase2」（HTML） | R.ana1 | 「1回90分から120分のレッスンを12回と審査フライト(通称”Check Flight”)に合格すると … Solo Flight」 |
| 基礎教材 kiso11・kiso06（原本、読むだけ） | `flight-lab/kiso/data/kiso11.json`・`kiso06.json` | 本文 11.16〜11.18・11.20〜11.25・11.27、06.8・06.21、記述問題 q17・q18・q20〜q25・q27・06.q8 と答え |

道具：`check-chapter.mjs`（下の 10）、`tools/lib/load.mjs` で下書きを読み込んでフライトモデルの値を計算し直した（scratchpad の `fcp2b/work/model.mjs`・`rpm.mjs`）、図 9 枚を Chromium 390 px（2 倍）で PNG にして目で見た（`fcp2b/png/`）、kiso11・kiso06 との 14 字以上の文字の重なりの検査（`fcp2b/work/overlap.py`）。

## 3. 結果の要約

- **must 0・should 7・nit 13**（下の 4）。数字・手順・規則の大きな誤りはない。〔安全〕③ の本番の節 `emg.imc` は、AFH 第 18 章の言い方（翼を水平だけ・トリム・指先・自動操縦・外をのぞかない・1 bar width・10°・少し回っては戻す・500 fpm・上昇と旋回を同時にしない・急がされても急がない・約 10 分）と一字一句の意味で合い、180° 旋回の条件は「この本の判断」と書き分けている（RULINGS `R.vfr-into-imc` のとおり）。`hf.body` と順番・数も同じ。
- 主張の札 234 行（教材値 42・参考値 145・条文 45・推測・要確認 2）：**220 行は一次資料・課目と合う**。14 行は文か出典か札を直してから署名する（下の 11）。
- 手順と順番：チェックリストの 13 の手順、AFH の着陸復行・離陸中止・エンジン故障・火災・IMC の順、14 CFR 61.87 の 3 つの柱と 15 項目を照らした（5）。順番の誤りはない。
- 計算：全部を計算し直した（6）。誤りなし。課目 t2 の rpm だけが課目と食い違う（S4）。
- 図：9 枚を一次資料と照らし、390 px の PNG で見た（7）。数字の誤りはない。
- 日米の書き分け：check-jurisdiction は error 0。米国の規則・AIM は「米国の」つきか `bk.us`、日本の法令は `bk.jp` と FL.jur の囲みの中だけ。囲み 4 つ（pattern・check.short・accident・solo）は DESIGN 3.4 の節に置かれている（8）。
- 基礎教材の写し：本文は書き直されている（いちばん長い重なり 23 字）。記述問題の問いの文は原本の問いに近いものがある（いちばん長い重なり 36 字、kiso06.q8 の問い）が、答えは書き直されている（9）。

## 4. 問題と直しの案（重い順）

### must（直すまで登録しない）

なし。

### should（直すのがよい。登録の前に直すことを勧める）

**S1. `emg.fire`：AFH の V<sub>A</sub> と POH の V<sub>O</sub> を「同じ制限」としている（今の本の `aero.vn` と食い違う）**
- 今の文：本文「乱気流（turbulence）の中では、運動に関わる速度の制限も守ります（AFH 第 18 章）。Archer III の POH は、**それを**最大運用運動速度（V<sub>O</sub>）と書き、最大重量では 113 KIAS です。」、折りたたみ「AFH は、**同じ制限**を設計運動速度（V<sub>A</sub>、design maneuvering speed）の名前で書いています。**名前の違い**は … aero.vn にあります。」
- 問題：今の本の `aero.vn`（R2）は「名前の似た設計運動速度（V<sub>A</sub>）は、機体を設計するときの速度です … **2 つは別の速度です**」と決めた（旧 14 CFR 23.335(c) は V<sub>A</sub> ≧ V<sub>S</sub>√n、23.1507 は V<sub>O</sub> ≦ V<sub>S</sub>√n）。「それを … と書き」「同じ制限」「名前の違い」は 2 つを同じものにしていて、safety-R2 の S3 が直すよう求めた誤解を `emg.fire` で言い直してしまう。また「乱気流では V<sub>O</sub> まで減らす」の Archer の根拠は POH 4.9（TURBULENT AIR OPERATION）だが、本文に書いていない。
- 直しの案：本文「速度は、超過禁止速度（never-exceed speed）を超えないようにします。乱気流の中では、運動に関わる速度の制限も守ります（AFH 第 18 章）。Archer III の POH は、乱気流に入ったときや入りそうなときは、最大運用運動速度（V<sub>O</sub>。最大重量で 113 KIAS）まで減速するよう勧めています（POH 4.9）。チェックリストの 120 KIAS はこれより速いので、乱気流の中では V<sub>O</sub> 以下に減らします」。折りたたみ「AFH は、乱気流で守る速度を設計運動速度（V<sub>A</sub>）で書いています。V<sub>A</sub> と V<sub>O</sub> は別の速度です（aero.vn）。この本は、POH の V<sub>O</sub> で書きます。」章末の Q7 の why にも「POH 4.9」を足す。CLAIMS `emg.fire#075c4d05`・`emg.fire#eea4ee86` の出典に POH 4.9 を足す。
- 出典：POH VB-2266 1（V<sub>O</sub> の定義）・2.3・4.9、AFH 第 18 章 p.18-9（「comply with the design maneuvering speed (VA) limitations」）、今の本 `aero.vn`（book-1.js 646〜649 行）。

**S2. `ops.wake` のここが大切「大きな機の後は 2 分あける」：条件が落ちている**
- 問題：米国の AIM 7-4-6 の「少なくとも 2 分」は、大きな機が **low approach・missed approach・touch-and-go をした後**の離陸・着陸だけの手順。大きな機の後ろに着陸するときは「経路と同じ高さか上・接地点の先」、離陸するときは「浮いた点の手前」で、時間の決まりではない。ここが大切は CADET の授業でも読まれるので、「大きな機の後なら 2 分あければよい」と覚えさせてしまう。本文の表・例（タッチアンドゴーの後）は正しい。
- 直しの案：「弱い斜め後ろの追い風がいちばん危ない。大きな機の低い進入・タッチアンドゴーの後は 2 分あける」（60 字以内）。CLAIMS `ops.wake#0a357e0b` も同じ文に。
- 出典：AIM 7-4-6（「Departing or landing after a larger aircraft executing a low approach, missed approach, or touch-and-go landing … at least 2 minutes」）。

**S3. `ops.xwind`：「最大実証横風成分は運用限界ではない」の出典がない（章末 Q7 の why は出典を取り違えている）**
- 今の文：本文「Archer の最大実証横風成分 … は 17 kt です（訓練校のチェックリスト）。型式証明の試験で、特別な技量なしに操縦できると確かめた値で、運用限界（limitation）ではありません。」、Q7 の why「AFH 第 9 章・チェックリスト：最大実証横風成分は試験で確かめた値で、運用限界ではない。」
- 問題：AFH 第 9 章は「0.2 V<sub>SO</sub> まで、特別な技量なしに操縦できることを型式証明の試験で示す」とは書くが、「限界ではない」とは書いていない。チェックリストは「MAX DEMONSTRATED CROSSWIND 17 KTS」だけ。「限界ではない」の一次資料は POH 2.25 の表示の注意「Demonstrated crosswind values are NOT limitations.」。安全に関わる文なので出典を正しく。
- 直しの案：本文の文の終わりに「（AFH 第 9 章・POH 2.25）」。Q7 の why を「AFH 第 9 章（試験で確かめた値）・POH 2.25（Demonstrated crosswind values are NOT limitations）・チェックリスト（17 kt）：…」に。CLAIMS `ops.xwind#dfa4534c` の出典に POH 2.25 を足す。
- 出典：POH VB-2266 2.25、AFH 第 9 章 p.9-18〜9-19。

**S4. `ops.pattern`：場周の降下の始めの「約 1,500 rpm」が、課目 t2 とフライトモデルの値（約 1,650 rpm）と食い違う**
- 今の文（3 か所）：折りたたみの表「降下の開始 ｜ … ｜ 出力 約 1,500 rpm・フラップ 10°」、考えてみよう「（この教材の Archer：約 1,500 rpm・フラップ 10°）」、例「ダウンウインドで進入端の真横 → 出力を絞り（約 1,500 rpm）…」。札は教材値「前の版の本文と同じ値」。
- 問題：課目 t2 の brief（`syllabus.js` 192 行）は「80 kt・約 500 fpm で降下開始（rpm の目安は画面の『目安』。この教材のモデルでは約 1,650 rpm）」。ERRATA `SYNC.t2-abeam-rpm`（fixed・W07d2・署名 factcheck2-R2）で課目は直したが、本の文は前の版のまま残った。私も `physics.js` の `steadyState`（Archer・80 kt・−500 fpm・フラップ 10°・1,055 ft）で **1,665 rpm** を計算し直した。「この教材の Archer」の値として 1,500 rpm は誤り。
- 直しの案：表「出力を絞る（この教材のモデルで約 1,650 rpm）・フラップ 10°・80 kt」、考えてみよう「（この教材の Archer：約 1,650 rpm・フラップ 10°・80 kt）」、例「出力を絞り（約 1,650 rpm）」。rpm を本に持たせたくなければ「出力を絞る（rpm は課目の画面の目安）」でもよい。CLAIMS `ops.pattern#84b6d036`・`ops.pattern#9b67d514` も同じに。
- 出典：`flight-lab/src/syllabus.js` t2、`physics.js` `steadyState`、ERRATA `SYNC.t2-abeam-rpm`。

**S5. `solo.req`：61.89 の 2 つの制限を 1 つの条件の文にしている**
- 今の文：「視程が昼 3 SM・夜 5 SM より悪いとき、地表を見ずに飛ぶことも、できません。」
- 問題：61.89(a)(6)（視程が昼 3 SM・夜 5 SM 未満）と (a)(7)（地表を目で見て飛べないとき）は別の制限。今の文は「視程が悪いときに、地表を見ずに飛ぶこと」と 1 つの条件に読める（視程が悪くても地表が見えればよい、と読める）。
- 直しの案：「視程が昼 3 SM・夜 5 SM より悪いときや、地表を目で見ながら飛べないときも、機長として飛べません。」CLAIMS `solo.req#2f39062c` も同じに。
- 出典：14 CFR 61.89(a)(6)(7)。

**S6. `emg.forced` の地形ごとの降り方「道路・川」：見えにくいのは電線で、見て探すのが柱**
- 今の文：「道路の両側には、電線と柱があることが多く、**柱は最後まで見えにくい**ものです。柱をよく見て探します。」
- 問題：AFH 第 18 章は「道路の両側の人工の障害物は進入の最後まで見えないことがある」「道路にはたいてい電線が並んでいて、**電線を支える柱を**よく見張ることだけが早めの警告になる」。見えにくいのは電線（と道路わきの障害物）で、柱は電線を見つける手がかり。今の文は「見えにくい柱を探す」になっている。
- 直しの案：「道路の両側には、電線が並んでいることが多く、電線は進入の最後まで見えにくいものです。電線を支える柱をよく見て探します。」
- 出典：AFH 第 18 章 p.18-5（Confined Areas の road landings と power or telephone lines）。

**S7. `emg.basic` の「日本では」：読む人に作業のメモが見えている。条の番号は確かめられた**
- 今の文：「〔要確認〕この条はこの本の e-Gov の写しにまだないので、条の番号は写しで確かめてから書きます。」
- 問題：①「この本の e-Gov の写しにまだない」「写しで確かめてから書きます」は作業の中のメモで、学ぶ人に向けた文ではない（`book-1.js` 80 行の〔要確認〕の説明は「一次資料で確かめていないもの」で、この場合に当たらない）。② 中身は確かめられる：e-Gov API v2 で、本が固定した版（`327AC0000000231_20251201_507AC0000000055`）の**第 74 条**（危難が生じた・生じるおそれがあるとき、旅客に避難の方法など安全に必要な事項を命令できる）と**第 75 条**（航行中に急迫した危難が生じたとき、旅客の救助と地上・水上の人・物件への危難の防止に必要な手段を尽くす）を読み、本文の 2 文と合うことを確かめた。写しにないのは、写す条の一覧（`manifest.json`）に入っていないからだけ。
- 直しの案：W37（か統合役）が `sources/egov/manifest.json` に航空法第 74 条・第 75 条を足して `fetch.mjs` で写したら、文を「… 手段を尽くします（航空法第 74 条・第 75 条）。」にし、〔要確認〕と作業のメモを消す。札も `推測・要確認` → `条文`（CLAIMS `emg.basic#c91ae1c7`）。写しが間に合わないまま登録するなら、メモの 1 文だけ消し、〔要確認〕は残す。
- 出典：e-Gov 法令 API v2、航空法 第 74 条・第 75 条（令和 7 年 12 月 1 日施行の版）。

### nit（小さな直し。まとめて直せばよい）

- **N1 `emg.abort`**：離陸中止の例「速度計が動かない」は AFH 第 6 章の 4 つの例（powerplant の不調・加速が足りない・runway incursion・air traffic conflict）にない。「（AFH 第 6 章）」を付けるなら「ほかの機とぶつかりそう」に替えるか、「速度計が動かない」をこの本の例として文を分ける。
- **N2 `emg.basic`**：「巡航中など速いときは、高度を保って 76 kt まで減速してから、機首を下げます（AFH）」→「（AFH 第 3 章）」（「maintain altitude until the airspeed decreases to the recommended best glide speed」）。
- **N3 `emg.basic` の折りたたみ**：「機長は規則から外れてかまいません（14 CFR 91.3(b)）」→「米国の Part 91 の規則から外れてかまいません」（91.3(b) は「any rule of this part」）。CLAIMS `emg.basic#d789a072` も。
- **N4 `ops.takeoff`**：「迎え角 … が大きくなりすぎます。また接地したり、失速したりします」→「迎え角 … が大きくなりすぎて、滑走路に沈み戻ったり、失速したりします」（AFH 第 6 章の因果：AOA 過大 → settle back to the runway or even stall）。
- **N5 `ops.short`**：「訓練校の Archer III チェックリストでは、**滑走路の端から**フラップ 25° で …」の「滑走路の端から」はチェックリストになく、AFH 第 6 章・ACS（PA.IV.E.S6）の言い方。「滑走路の端から使います（AFH 第 6 章）。訓練校の Archer III チェックリストでは、フラップ 25° で …」に分ける。
- **N6 `ops.short` の ACS の表**：短距離着陸「指定点から先へ 200 ft 以内に、**浮かずに**接地」→「フロートをできるだけ少なく」（PA.IV.F.S10・CA.IV.F.S10 は「minimum float」）。
- **N7 `solo.first`**：「離陸では早く速度が付いて浮き、上昇も速くなります」に「（AFH 第 6 章）」を足せる（「Due to decreased load, the airplane will become airborne earlier and climb more rapidly」）。今はモデルの値だけで、参考値が並ばない（基準 6）。
- **N8 `emg.forced`**：「ELT は、強い衝撃で自動的に電波を出し始めます」→「ARM にしてあれば、強い衝撃で …」（AIM 6-2-4「If armed」。折りたたみには書いてある）。
- **N9 `ops.landing` の考えてみよう・章末 Q3 の why**：「出力を少し絞って … 速度は機首で保ちます（米国の AIM 2-1-2）」の直し方は AIM 2-1-2 になく、AFH 第 9 章の言い方。「（米国の AIM 2-1-2・AFH 第 9 章）」に。CLAIMS `ops.landing#210e21de` の出典も。
- **N10 札**：CLAIMS `emg.imc#aa764109`・`emg.imc#8f528433`（「バンク 10° 以下」を含む）が教材値。10° は AFH 第 18 章の数なので参考値（出典 AFH 第 18 章 p.18-19）にし、「来た方が確実に VMC で地形が許せば」の条件は note で RULINGS `R.vfr-into-imc` を示す。`emg.imc#4adc7895`・`emg.imc#3bb8d02d`（数のない、この本の判断の文）は教材値のままでよいが、note に `R.vfr-into-imc` を。
- **N11 `solo.req` の折りたたみの 15 項目の表**：(1) 飛行前の準備 → `ground.runup` は (2) と同じ行き先。`ground.day`（訓練の 1 回のフライト）か `ground.walk` が合う。(12) 対地目標操作 →「基本操縦の章」は `ops.ground` へのリンクにできる。
- **N12 章末の確認問題（solo）Q3 の why**：「80 kg 軽いと Vy の上昇率が約 110 fpm、約 15% 増える」は手で書いた数（本文の約 740 → 約 850 fpm から）。モデルを計算し直すと 741.3 → 845.9 fpm（105 fpm・14%）。今は本文の丸めた値と合うが、モデルが変わると食い違う。「上昇率が増える（この教材のモデルで約 740 → 約 850 fpm）」と本文と同じ値を言うか、計算して描く。
- **N13 tl の記述問題（kiso11.q20 の書き直し）の答え**：「日本には、左回りという一般の定めもありません」は日本の決まりの文で、`bk.jp` の外（記述問題の答え）にある。中身は FL.jur `pattern` の日本の欄と合う（施行規則第 189 条・航空法第 96 条）。条番号がないので check-jurisdiction は通るが、CADET にも出る。問い自体が日本の飛行場の話なので残してよいが、W35（まとめの章）か所有者の判断 5 の扱いに合わせて見直す。

## 5. 手順と順番の確かめ

| 手順 | 照らしたもの | 結果 |
|---|---|---|
| 通常離陸（`ops.takeoff` の 7 段） | AFH 第 6 章・チェックリスト TAKEOFF・ENROUTE CLIMB | 合う（滑走 → ローテーション → 浮揚 → 上昇、全開はなめらかに、右ラダー、60／76／87 kt・地上 1,000 ft） |
| 場周経路（表と図の ①〜⑥） | AFH 第 8 章・AIM 4-3-2／4-3-3・AC 90-66C・課目 t2 | 合う（rpm だけ S4） |
| 安定進入・フレア・接地 | AFH 第 9 章・POH 4.5m・課目 t3 | 合う |
| 着陸復行 | AFH 第 9 章（Power → Attitude → Configuration）・チェックリスト BALKED LANDING（FULL RICH・全開・25°・64 kt・障害物の後 76 kt・少しずつ）・自家用 ACS PA.IV.N | 合う |
| 横風（クラブ・ウイングロー・離陸） | AFH 第 6・9 章 | 合う |
| 短距離離陸・着陸／不整地離陸・着陸 | チェックリスト SHORT/SOFT FIELD TAKEOFF・LANDING（65 kt）・POH 4.5m（フラップいっぱい）・AFH 第 6 章・ACS | 合う（N5・N6） |
| フォワードスリップ | AFH 第 9 章 | 合う |
| 緊急時の考え方（Aviate → Navigate → Communicate、MAYDAY 3 回・7700） | AFH 第 3・18 章・AIM 6-3-1／6-3-2 | 合う |
| 離陸中止 | AFH 第 6 章・チェックリスト ENGINE FAILURE DURING TAKEOFF（LAND and STOP STRAIGHT AHEAD・shallow turns） | 合う（N1） |
| 上空のエンジン故障（76 kt → 場所 → 燃料・ポンプ・RICH・キャブレターヒーター・マグネトー片方ずつ） | チェックリスト ENGINE FAILURE DURING FLIGHT（「降りる場所」の行は「この本の補足」と書き分けてある） | 合う |
| 不時着（POWER OFF LANDING） | チェックリスト（76 → 66 KIAS・CLOSE・ICO・マグネトー・バッテリー・発電機・燃料セレクター）・AFH 第 18 章 | 合う |
| エンジン火災・電気火災・客室の煙 | チェックリスト ENGINE FIRE・ELECTRICAL FIRE・AFH 第 18 章（消火器のあとに通気口） | 合う。チェックリストの「通気口 → 消火」と AFH の「消火 → 通気口」の違いも折りたたみで説明してある |
| 緊急降下 | チェックリスト（FULL RICH・IDLE・UP・120 KIAS・30〜45°）・AFH 第 18 章・ACS PA.IX.A | 合う（S1） |
| 電気系統の故障・過負荷 | チェックリスト ELECTRICAL FAILURES・OVERLOAD（20 A・25 Vdc・as soon as practical／possible）・SAIB CE-10-11 | 合う |
| エンジンの不調・油圧・油温・燃料圧・ドア | チェックリスト ENGINE ROUGHNESS（> 1 分・L → R → BOTH）・LOSS OF OIL PRESSURE・HIGH OIL TEMPERATURE・LOSS OF FUEL PRESSURE・OPEN DOOR（87 KIAS・横 → 上）・AFH 第 18 章 | 合う |
| VFR で雲に入ったとき（4 つの順番） | AFH 第 18 章・AIM 6-2-1・DESIGN 3.3・RULINGS `R.vfr-into-imc`・今の本の `hf.body` | 合う（順番・数とも `hf.body` と同じ） |
| ソロの前（3 つの柱・15 項目・承認・90 日・制限・その先の承認） | 14 CFR 61.83・61.87(a)(b)(c)(d)(n)(o)(p)・61.89・61.93(b)(1)(2)(c)・61.95・91.131(b)(2)・141.85・AC 61-65K | 合う（S5） |

## 6. 計算（全部を計算し直した）

| 場所 | 本の値 | 計算し直した値 |
|---|---|---|
| 横風成分の表（12 kt：15°・30°・45°・60°・90°） | 横 3・6・8・10・12、向かい 12・10・8・6・0 | 3.1／11.6、6.0／10.4、8.5／8.5、10.4／6.0、12／0（四捨五入で合う） |
| 計算演習・記述問題（20 kt・30°） | 17 kt・10 kt | 17.3・10.0 |
| 考えてみよう・章末 Q4（滑走路 36・030°／14 kt） | 横 7・向かい 12 | 7.0・12.1 |
| 例（060°／12 kt） | 横 約 10・向かい 約 6 | 10.4・6.0 |
| 例（500 ft で 82 kt・目標 70 kt） | ＋10 kt を超える | ＋12 kt |
| 3°・70 kt の降下率 | 約 370 fpm | 70 × 101.27 × tan 3° = 371.5 fpm |
| 突風の 1/2（70 kt・15 kt） | 77 kt | 77.5（AFH も「77 knots」） |
| 引き返し（図 `emgTurnback`） | 約 18 秒・42°・1,016 ft 下 | 300 ÷ (1,000/60) = 18 秒、(18 − 4) × 3 = 42°、(4 + 225/3) × 1,000/60 = 1,316.7 → 1,316 − 300 = 1,016 ft（AFH の 1,316 ft・1,016 ft と同じ） |
| 標準旋回の 180° | 1 分 | 180 ÷ 3 = 60 秒 |
| 65 kt・バンク 10° の半径 | 約 2,100 ft | 109.7²／(32.174 × tan 10°) = 2,121 ft（標準率の半径 V/ω = 2,095 ft、AFH は 2,100 ft） |
| 滑空（教材のモデル、76 kt） | 1,000 ft ごとに約 1.4 NM・滑空比 約 8.5：1 | 1.399 NM・8.50：1 |
| 滑空（3,000 ft から：無風・向かい風 10・追い風 10） | 約 4.2・3.7・4.7 NM | 4.20・3.66・4.74 |
| 滑空（66 kt） | 約 1.5 NM | 1.518（モデルでは 60〜62 kt で 1.536 が最大。「もう少し遅い方がわずかに遠く」は正しい） |
| モデルの重さ | 1,050 kg（約 2,315 lb） | 2,314.9 lb → 5 lb に丸めて 2,315 |
| Vy・地上 500 ft の機首上げ | 約 11° | 10.56° |
| 緊急降下（120 kt・アイドル・45°） | 約 1,900 fpm | 1,935 fpm |
| ソロの失速の速度（1,050 → 970 kg） | 約 50 → 約 48 kt | 50 × √(970/1,050) = 48.06 |
| ソロの Vy の上昇率 | 約 740 → 約 850 fpm | 741.3 → 845.9（章末 Q3 の「約 110 fpm・約 15%」は丸めた値どうしの差：N12） |
| 着陸復行の上昇（64 kt・全開・500 ft） | フラップ 40° 約 +350・25° 約 +510 fpm | 349・510 |
| V<sub>O</sub> とチェックリストの緊急降下 | 113 < 120 KIAS | POH 2.3／3.3 の 113、チェックリスト 120 |
| 長さの換算 | ±8 m（約 ±26 ft）・±30 m（約 ±100 ft）・±6 m（約 ±20 ft）・±60 m（約 ±200 ft）・400 ft（約 120 m）・200 ft（約 60 m）・約 1.6 km（1 マイル） | 26.2・98.4・19.7・196.9 ft、121.9・61.0 m、1 SM = 1.609 km |
| 場周の降下の始めの rpm | 約 1,500 rpm | モデルで 1,665 rpm（S4） |

## 7. 図（9 枚。390 px・2 倍の PNG を見た）

| 図 | 照らしたもの | 結果 |
|---|---|---|
| `wakeVortex`（新） | AIM 7-4-4・7-4-6 | 合う。① 渦は後ろで下へ・経路と同じ高さか上・接地点の先。② 横風（左から）で風上の渦（左）が残り風下の渦（右）が早く流れる。渦の回り方（前から見て、左の渦は右回り・右の渦は左回り）も正しい |
| `imcSteps`（新） | AFH 第 18 章・DESIGN 3.3・`R.vfr-into-imc` | 合う。キャプションで AFH の言い方と本の判断を分けている |
| `pattern` | AFH 第 8 章・AIM 4-3-3・AC 90-66C・課目 t2 | 合う（滑走路 36 の左回り・ダウンウインドは西で南向き・① は北西から 45°・③ は南の進入端の真横・④ は 45°・⑥ は 300 ft 下・1/4 マイル） |
| `approachProfile` | AFH 第 9 章・AIM 2-1-2・課目 t3／x2 | 合う（PAPI の 5 段の角度、赤は滑走路の側、目標点 約 300 m） |
| `goAroundProfile` | AFH 第 9 章・チェックリスト BALKED LANDING・モデル | 合う |
| `crabWingLow` | AFH 第 9 章 図 9-15・9-16 | 合う（風は右から、クラブは機首を右へ、ウイングローは右の翼を下げ左の方向舵） |
| `soloRoadmap` | 14 CFR 61.83・61.23・61.87・61.93・61.95・141.85 | 合う |
| `emgTurnback` | AFH 第 18 章 図 18-5・課目 e2 | 合う（左旋回の 42° の所に × ） |
| `glideRange` | モデル（6 の表） | 合う |

## 8. 日米の書き分け（DESIGN 3.4・6.2 の決まり 6・10）

- `check-jurisdiction`：23 節・180 の章末の文で error 0。scope は tl・emg と `solo.first` が `common`、`solo.req`・`solo.check`・`solo.after` が `us`。
- 共通の節の米国の規則と AIM は、どれも同じ文に「米国の」がある（`ops.pattern` の 91.126(b)・91.127(a)、AIM 4-3-2／4-3-3、AIM 2-1-2、AIM 7-4、`emg.basic` の 91.3、`emg.forced` の AIM 6-3-2／6-2-4、`solo.first` の AIM 4-2-4、用語の表）か `bk.us`（`emg.imc` の AIM 6-2-1）。
- 日本の法令は `bk.jp`（`emg.basic`）と FL.jur の囲みの中だけ。FL.jur の囲みは `pattern`（ops.pattern）・`check.short`（ops.short）・`accident`（emg.basic）・`solo`（solo.req）で、DESIGN 3.4 の表の節に置かれている。囲みの日本の欄は e-Gov の写しで抜き取った（航空法第 35 条・第 76 条・第 76 条の 2、施行規則第 68 条の有効期間 1 年以内・第 69 条の 2）。どれも合う。
- 実名と FLIGHT LAB の操作の言葉：本文になく、`bk.sim` の中だけ。ANA は CADET が決めている `solo.req` の文（`bk.fact`）だけで、公開情報と合う。チェックリストは「訓練校の」と書き、学校の名前は本文にない。
- 気になる点は N13 だけ（日本の決まりの文が記述問題の答えにある）。

## 9. 基礎教材の書き直し（DECISIONS 判断 2）

- kiso11.16〜11.18・11.20〜11.25・11.27、kiso06.8・06.21 と本文の 14 字以上の重なり：重なりは 5 か所だけで、いちばん長いのは 23 字（「合わせて高度を下げ続けると、障害物や行き止まり」、kiso11.27）。どれも平易な言い方への書き直しの中に残った言い回しで、写しではない。
- 記述問題：原本の問いと答え（kiso11・kiso06）と 14 字以上同じ所が 10 か所。いちばん長いのは問いの文で、36 字（「20 kt の風が吹いています。向かい風成分と横風成分を求め、方位の基準」、kiso06.q8）と 28 字（「雲が低くなり、地面を見続けるために高度を下げています。ど」、kiso11.q27）。答えの重なりは 14 字前後だけで、書き直されている。factcheck-hfadm の S3 と同じ程度で、問いの意味を変えないための近さとして許せる。
- 中身の食い違い：kiso11 の「判断」（中止の条件を言葉にする・浮いたことは上昇の証拠でない・最大実証横風と運用上の制限を混同しない・PAPI が合うだけで着陸の条件を満たさない・数字は目安・技法は性能不足を埋めない・地面が見えるだけでは VFR の条件を満たさない・決まった方向への旋回を万能にしない）は、どれも本文か判断の目にあり、原本と食い違う所はない。kiso06.21 の「重い機体はそれに合う速度で飛べば滑空角はおおむね同じ」も `emg.glide` の折りたたみにある（factcheck-p2a M1 のような食い違いはない）。

## 10. チェックの結果

| チェック | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/p2b-figs.js textbook/rewrite/combined/drafts/p2b.js`（ブラウザあり） | **error 0・warn 34・info 31**（style first-use-form 10・questions answer-position 1・claims claim-untagged 23。どれも W28-p2b の報告 7 のとおりで、この確認では増えていない） |
| FLIGHT LAB `npm run -s test:fast` | **91 / 91 pass** |
| TEXTBOOK `npm test` | **38 / 38 pass** |
| CADET `npm run -s test:fast` | **249 / 249 pass** |

下書きは製品に読まれないので、製品のテストは今の本のままの結果。

## 11. 台帳（CLAIMS の署名の案。私は台帳を変えていない）

- `drafts/p2b.claims.json` の 234 行を全部見た。
- **署名してよい 220 行**：下の 14 行のほか全部（`checkedBy: factcheck-p2b`、`checkedOn: 2026-10-31`）。FL.jur が描く囲みの行（`ops.pattern` の 3 行・`ops.short` の 1 行・`emg.basic` の 2 行・`solo.req` の 4 行）は W06 の値で、米国の欄を eCFR、日本の欄を e-Gov の写しで抜き取って確かめた。
- **直してから署名する 14 行**：
  - S1：`emg.fire#075c4d05`・`emg.fire#eea4ee86`（文と出典 POH 4.9）
  - S2：`ops.wake#0a357e0b`（文）
  - S3：`ops.xwind#dfa4534c`（出典 POH 2.25）
  - S4：`ops.pattern#84b6d036`・`ops.pattern#9b67d514`（値）
  - S5：`solo.req#2f39062c`（文）
  - S7：`emg.basic#c91ae1c7`（写しに条が入ったら、文と札を条文に）
  - N3：`emg.basic#d789a072`（Part 91）
  - N9：`ops.landing#210e21de`（出典）
  - N10：`emg.imc#aa764109`・`emg.imc#8f528433`（札を参考値に）、`emg.imc#4adc7895`・`emg.imc#3bb8d02d`（note に R.vfr-into-imc）
- 抜き出しの文に空のかっこ「（）」が残る行（`emg.abort#5af4894a`・`emg.fire#eea4ee86`・`solo.first#f8f3d733`・`solo.first#30e22bb3`）は、`bk.see` のリンクの文字が抜き出しで消えたもので、本文の誤りではない。登録のとき、check-claims の抜き出しと ID・文が合うことを統合役が確かめる。
- RULINGS：`R.turnback`・`R.crosswind-landing`・`R.stabilized-approach`・`R.vfr-into-imc` の場所の文（`emg.engine`・`ops.xwind`・`ops.landing`・`emg.imc`）は裁定のとおり。`R.vfr-into-imc` は〔安全〕なので、署名は W36 の安全レビューのあとに（W28-p2b の頼みのとおり）。

## 12. ほかの単位への頼み

1. **章の持ち主（W28-p2b）か、この章の改稿の単位**：上の S1〜S7 と N1〜N12 を `drafts/p2b.js` と `drafts/p2b.claims.json` に。S4 は 3 か所（表・考えてみよう・例）。
2. **W37（e-Gov の写し）か統合役**：`textbook/rewrite/sources/egov/manifest.json` に航空法 第 74 条・第 75 条（`kokuho:74`・`kokuho:75`、版 `327AC0000000231_20251201_507AC0000000055`）を足して `fetch.mjs` で写す。私は e-Gov API v2 で 2 条の本文を読み、`emg.basic` の文と合うことを確かめた（S7）。写したら章の持ち主が条番号を書く。
3. **統合役**：登録のとき、上の 11 の 220 行に `checkedBy: factcheck-p2b` を付ける。14 行は直したあとに。
4. **W36（安全）**：`emg.imc`（〔安全〕③）の AFH の部分は一次資料と合う（3・5）。W28-p2b が頼んだ `flight.test.mjs` の inOrder の文は、今の下書きの文と同じであることを確かめた。S2（後方乱気流の 2 分）は安全に近いので、W36 でも見てほしい。
5. **W35（まとめの章）**：N13 の記述問題の答えの日本の文の扱い。

## 13. 残っていること

- 私が確かめられなかったものはない（AFH・AIM・AC・ACS・チェックリスト・POH・SAIB・PHAK・eCFR・e-Gov・ANA の公開情報は、どれも元の URL から取り寄せて読めた）。
- `check.short` の日本の欄（操縦士実地試験実施細則の短距離離陸の手順と許容幅）は〔要確認〕のまま（UNVERIFIED の行。この章の単位の外）。
