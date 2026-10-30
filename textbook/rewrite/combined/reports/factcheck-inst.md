# 事実確認の報告：第 1 部 第 7 章（新）`inst`「計器と表示」（W15 の下書き、R2）

単位：factcheck-inst（W15 の事実確認役。下書きは書いていない）。作業日：2026-10-30。
対象：`textbook/rewrite/combined/drafts/inst.js`・`inst-figs.js`・`inst.claims.json`（W15）。照らしたもの：DESIGN 6.2・3.3（第 1 部 章 7）・3.4・3.5・4.2（kiso04）、DECISIONS.md、STYLE.md、W15 の報告。
**下書き・台帳・製品のファイルは 1 つも変えていません。** 変えたのはこの報告だけです。直しの案は下の 4 にまとめました（直すのは W15 か、その章の改稿の単位）。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck-inst.md`（新） | この報告 |

## 2. 確かめ方（一次資料。どれも 2026-10-30 に元の URL から新しく取り寄せて本文を読んだ）

| 資料 | URL（下書きの `R`・`NEW_R` と同じ） | 確かめた所 |
|---|---|---|
| FAA PHAK FAA-H-8083-25C 第 8 章（`R.phak8`） | faa.gov …/phak/10_phak_ch8.pdf | 全圧・静圧・動圧、代替静圧源の 3 つの症状、高度計（アネロイド・コールスマン窓・31.00／28.00・High to low・Abilene の例・図 8-4・山の上 1,000 ft）、Instrument Check 75 ft、昇降計（calibrated leak・6〜9 秒・IVSI）、速度の種類・色の帯の下の端の条件、詰まりの症状、EFD（TAS・VNE で赤・すべりの棒 1 つ＝球 1 個・旋回率の目盛り・トレンド 6 秒）、ジャイロ（剛性・歳差 90°・4.5〜5.5 inHg・2 つの動力・転倒の限界 100〜110°／60〜70°・バンクの目盛り・旋回傾斜計の斜めのこま・2 MIN／NO PITCH・地上走行の点検・step on the ball・方向指示器 15°/時と約 15 分・HSI は合わせ直し不要・AHRS は転倒しない・遅くなったこまの歳差）、AOA、磁気コンパス（裏から見る目盛り・偏差・自差・自差表・ピトーヒーターや無線機など・伏角・北旋誤差 15°＋緯度の半分・加速誤差 ANDS・揺れ・18°・「Lags or Leads」） |
| PHAK 第 2 章・第 4 章・第 5 章（`R.phak`） | faa.gov …/04_phak_ch2.pdf・06_phak_ch4.pdf・07_phak_ch5.pdf | 第 2 章：自動操縦で 1 人の仕事が減る・ときどき手で飛ぶ・故障の扱いを前もって決める。第 4 章 図 4-3：0 ft 29.92・1,000 ft 28.86 inHg、29.92 inHg＝1,013.2 mb。第 5 章：q＝½ρv²、ROT＝1,091×tan(bank)÷TAS |
| FAA AIM 7-2（`R.aim72`） | faa.gov …/aim_html/chap7_section_2.html | 7-2-2（31.00 を超えて合わせられない高度計が多い、28.00 未満に合わせられないときの飛行は勧めない）、7-2-3（±75 ft 以上なら疑わしい、1 inHg の誤差＝1,000 ft、High to low） |
| Piper PA-28-181 Archer III POH VB-2266（`R.archerPoh`） | andrews.edu …/archeriii-poh.pdf | 2.3（154/148・125/121・102/100）、2.5（白 45〜102・緑 50〜125・黄 125〜154・赤 154）、2.23・2.24、3.5d（発電機の故障・完全な電気の故障・非常用のバスの装置）、3.5e（PFD・MFD・AHRS・ADC の故障）、第 4 章（Pitot/Static Head REMOVE COVER - HOLES CLEAR、Altimeter/Standby Altimeter SET）、7.13（G1000、台形のすべり、旋回率、EIS は MFD の左に常時、AHRS の入力、予備計器 Aspen EFD1000 の説明、自動操縦は選んで付ける System 55X、高度のとらえ方）、7.17（28 V）、7.21（1 本のピトー頭、別の管で ADC と予備計器、代替静圧源の弁の場所、窓・通気口・ヒーター、50 ft、機内の排水弁）、補足 2（部品の一覧、制限 7 項目、故障の手順、3 秒で 55°・320 ft、トリムの暴走） |
| Archer III w/ G1000 Pilot's Checklist（`R.archerCk`） | mga.edu …/Archer_Checklist.pdf | BEFORE STARTING ENGINE の「Standby Instruments and PFD operate.....VERIFY」 |
| Garmin G1000 Cockpit Reference Guide PA-28-181（`R.g1000`、190-01460-00） | static.garmin.com …/190-01460-00_0A_Web.pdf | リバージョン、CDI のソフトキーで GPS→VOR→LOC、BARO の IN・HPA、AHRS は GPS を使う（ないと働きが落ちる）、AHRS は ADC の TAS を使う、SVT の WARNING |
| Garmin G1000 Pilot's Guide for Cessna Nav III（`NEW_R.g1000pg`、190-00498-07 Rev. A） | static.garmin.com …/190-00498-07_0A_Web.pdf | 第 2 章：速度のトレンド 6 秒・トレンドが VNE を超えると数字が黄色・低速の赤い帯・旋回率のトレンド 6 秒で標準旋回は 18°。第 7 章：AFCS の表示の帯（横は左・AP は真ん中・縦は右、待ちは白・作動は緑、移ると 10 秒点滅、黄色の点滅は ADC・航法のデータを失った、ALTS → 50 ft で ALT、自動で外れると赤い AP の点滅と音）、**横の待ちのモードは横の作動のモードの左**（図 Lateral Modes：Armed｜Active） |
| FAA Advanced Avionics Handbook FAA-H-8083-6 第 4 章（`NEW_R.aah4`） | faasafety.gov …/aah_ch04.pdf（2009 年版、2013 年の改訂の写し） | 6 つの手順、「help」してトリムを使い切り操縦を失った例、FD の入力（ADC・AHRS・航法・サーボ）、同じ機体でも装備が違う、VS で出力を超える上昇率なら失速・降下で VNE、とらえる途中の操作で取り消し |
| CAA of New Zealand Flight Instructor Guide — Compass use（`NEW_R.nzCompass`） | aviation.govt.nz …/compass-use | SAND（加速で南、減速で北）・ONUS（北へは行き過ぎ、南へは手前） |
| FAA IFH FAA-H-8083-15B（`R.ifh`） | faa.gov …/FAA-H-8083-15B.pdf | 第 7 章（北の針路から旋回を始めるとコンパスは遅れる、南からは先回り）、第 11 章（真空のポンプの故障でこまが遅くなりながら、だんだんと誤る） |
| e-Gov の写し | `textbook/rewrite/sources/egov/articles/kokuho-kisoku/178.json` | 施行規則第 178 条（14,000 ft 未満は QNH） |

道具：`node textbook/rewrite/combined/tools/check-chapter.mjs`（`sys` と `inst` の下書き 4 つ）、`--claims-out` で抜き出した主張と `inst.claims.json` の突き合わせ、図 11 枚を Chromium 390 px で PNG にして目で見た（スクリプトと PNG は scratchpad。リポジトリには置いていない）、kiso04・kiso02・kiso10・kiso12 の本文との文字の重なりの検査。

## 3. 結果の要約

- 主張の札 77 行（参考値 71・条文 4・教材値 2、うち例題 23）：**77 行とも、数値と規則は一次資料と合う**（札のない主張 0、`--claims-out` の抜き出し 77 行と `inst.claims.json` の 77 行が一致）。出典の書き方の小さな誤りが 5 行（下の N5・N6）。
- 計算：全部を計算し直した（6）。誤りなし。丸めの注意が 1 つ（N3）。
- 本文（札の行の外）の誤り：**must 2・should 6・nit 12**（下の 4）。must は ①「思い出そう」の電気の文が POH 3.5d と逆、②図 `instApBand` の横のモードの並びが Garmin の手引きと逆。
- 日米の書き分け：違反なし（8）。基礎教材の写し：なし（9）。

## 4. 問題と直しの案（重い順）

### must（直すまで登録しない）

**M1. `inst.flow` の「思い出そう」：発電機が止まると、すぐ非常用バッテリーが予備計器に電気を送る、と読める（POH と逆）**
- 今の文：「発電機（オルタネーター、alternator）が止まると、非常用バッテリーが予備計器などに電気を送ります。」
- 一次資料：Archer III POH 3.5d（Alternator Failure）「If alternator does not reset, the battery will become the primary source of electrical power. The only electrical bus that remains powered in this load shed configuration is the ESSENTIAL BUS … As battery power is depleted … the emergency battery should activate automatically」。7.13（Standby Instrument）「During an alternator failure, the EFD1000 will continue to operate on the essential bus until the primary battery is depleted. The EFD 1000 will then operate on the emergency battery/bus for 30 minutes」。7.17（Emergency Battery）「power is applied to the emergency bus automatically if electrical power is removed from the primary electrical system」。W14 の `sys.elec`（下書き）も「電気系統が全部止まったとき、非常用のバスに電気を送ります」と書いており、呼び戻しの文が住所の節と食い違う。
- 直しの案：「発電機（オルタネーター、alternator）が止まると、まずバッテリーが電気を送ります。バッテリーが弱ると、非常用バッテリーが予備計器などに電気を送ります。」（3 行以内に収まる。出典は POH 3.5d・7.13）

**M2. 図 `instApBand`（`inst.ap`）：横のモードの「作動」と「待ち」の位置が逆**
- 今の図：左から「横の作動（HDG 緑）｜横の待ち（GPS 白）｜AP｜縦の作動（VS）｜基準（500）｜縦の待ち（ALTS）」。
- 一次資料：Garmin G1000 Pilot's Guide 190-00498-07 第 7 章の AFCS Status Box の図「Lateral Modes: Armed | Active ／ Status ／ Vertical Modes: Active | Mode Reference | Armed」、本文「The armed annunciation appears in white to the left of the active roll mode」。縦の側は図のとおりで正しい。
- 直しの案：`lab` と文字の x を入れ替える（`[40,'横の待ち'],[110,'横の作動']`、`T(40,69,'GPS',白)`・`T(110,69,'HDG',緑)`）。キャプションの文は変えなくてよい。基準の「500」は実物では「500FPM」（N10）。

### should（直すのがよい）

**S1. `sys.compass` の「思い出そう」：「偏差の足し引きは、序部で学びました」は、行き先の `basics.time` に書いていない**
- `basics.time`（`flight-lab/src/book-0.js`）は、真北・磁北・偏差・自差の区別を教えるが、偏差を足す・引く計算は教えていない（計算の住所は DESIGN 3.3 の `navb.north`、今の本では `nav.plan`）。
- 直しの案：「真北と磁北、偏差と自差の区別は、序部で学びました。」（リンクは `basics.time` のまま）。

**S2. `inst.pfd` のリバージョン：「片方の画面が壊れたと装置が判断すると、G1000 型は残った画面に…まとめて出します」が、Archer の PFD の故障の場合と食い違う**
- 一次資料：Archer III POH 3.5e の NOTE「If the PFD fails, the MFD will remain in normal mode. Pushing the DISPLAY BACKUP button on the audio panel allows the MFD to display AHRS and ADC information」。G1000 CRG（PA-28-181）も「PFD failure – Press the DISPLAY BACKUP Button … MFD failure – PFD enters reversionary mode」。次の段落で Archer の手順は正しく書いてあるが、最初の一般の文が「自動」と読めるので、2 つの段落が食い違って見える。
- 直しの案：「片方の画面が壊れたとき、残った画面に、飛ぶのに大事な計器とエンジンの計器をまとめて出せます。これをリバージョン（reversionary mode）といいます。MFD が壊れたときは PFD が自動で切り替わり、PFD が壊れたときは DISPLAY BACKUP のボタンで MFD を切り替えます（G1000 の手引き・POH 3.5e）。」

**S3. 図 `instGyros` の歳差の小図：力と反応の矢印の向き**
- 今の図：円（こまを正面から見た形）の上端に「押す」（中心へ向かう矢印）、右端に「出る」（外へ向かう矢印）。
- 問題：歳差は、回る面に**垂直な**力が 90° 進んだ所に出る現象（PHAK 第 8 章 図 8-19：Plane of rotation・Plane of force・Plane of precession）。正面図の面内の矢印では本来描けず、さらに「中心へ押す → 外へ出る」は、面内の矢印で描くとしても向きが合わない（押した向きをそのまま 90° 回すなら、右端でも中心へ向く）。
- 直しの案：①こまを斜めから見た楕円にし、上端に「奥へ押す」、右端に「奥へ出る」の同じ向きの矢印を描く、または ②正面図のまま、上端と右端に「⊗（奥へ）」の印を置き、「押す」「90° 先で同じ向きに出る」と書く。キャプションと本文は今のままでよい。

**S4. `inst.ap`：GFC 700 型の例と、Archer III の POH の自動操縦の違いを 1 文で示す**
- 一次資料：Archer III POH 7.13（Autopilot integration）「To capture a new altitude, first input the desired altitude using the altitude (ALT) preselect on the PFD, then use the [autopilot] to select ALT and VS simultaneously … The Altitude preselect will flash when approaching within 1000 feet … an audio tone is played when approaching or deviating within 200 feet」。補足 2 の装置は GFC 700 型ではなく、ALTS・ALT の 50 ft の動きや白・緑の帯は、この POH の機体にはそのまま当てはまらない。本文の「GFC 700 型の例」と「ここに注意」は一般の書き方なので、Archer で飛ぶ学生が ALTS を探すおそれがある（説明してみよう 19 も ALTS で問う）。
- 直しの案：「モードの表示を読む」の段落の終わりに「この POH の補足の装置は別の型で、モードの名前と高度のとらえ方（高度と昇降率のモードを一緒に選ぶ）が違います（POH 7.13）。」を足す（製品名は書かない）。

**S5. `sys.compass`：DESIGN 3.3 の「磁性物」は、PHAK に一次資料がある**
- W15 は「スマートフォンなどの磁性物は一次資料が見つからず書いていない」としたが、PHAK 第 8 章（Deviation の段落）に「Pilots must also note the use of any equipment causing operational magnetic interference such as radios, deicing equipment, pitot heat, radar, or magnetic cargo」がある。
- 直しの案：自差の段落の「ピトーヒーターや無線機などを使うと、自差が変わることがあります」を「ピトーヒーター・無線機・防氷の装置を使ったり、磁気を帯びた荷物を積んだりすると、自差が変わることがあります（PHAK 第 8 章）。」に。スマートフォンの名指しは、一次資料がないので書かない。

**S6. `sys.g1000`：「ピトー管の後ろには、入った水を逃がす小さな排水口もあります」が Archer の段落の中にある**
- 一次資料：PHAK 第 8 章は一般のピトー管の排水口（drain hole）を書く。Archer III POH 7.21 は「Both the pitot and static lines can be drained through separate drain valves located on the left lower side of the fuselage interior」で、Archer の水抜きは機内の左下の弁と書いている（ピトー頭の排水口の有無は書いていない）。今の並びでは、Archer のピトー頭に排水口があると読める。
- 直しの案：「多くのピトー管の後ろには、入った水を逃がす小さな排水口があります（PHAK 第 8 章）。Archer では、ピトーと静圧の管の水を、機内の左下の弁から抜きます（POH 7.21）。」と分ける。

### nit（直せば良くなる）

- **N1.** `inst.flow`「G1000 型の画面は 2 枚です」：G1000 の装備は機体で違い、画面 3 枚の機体もある。「G1000 型の Archer の画面は 2 枚です（POH 7.13）」に。
- **N2.** `inst.pfd`：計算に要る情報を失ったときの「その軸はもとのモードへ戻ります」は、手引きでは「the flight director automatically reverts to the default mode for that axis」（翼を水平にする Roll Hold・ピッチを保つ Pitch Hold）。「もとの」は「前のモード」と読めるので「その軸の基本のモード（翼を水平にする・ピッチを保つ）に戻ります」に。（文は `inst.ap` にある）
- **N3.** `inst.alt`「海面の近くでは 1 hPa が約 28 ft」：PHAK 図 4-3 の 0〜1,000 ft の平均は 27.9 ft/hPa で計算は正しいが、海面そのものでは国際標準大気で約 27.3 ft/hPa（ρ＝1.225 kg/m³）。1003 → 1013 hPa の表示の変化は標準大気で約 274 ft。「約 27〜28 ft」または「海面から 1,000 ft までの平均で約 28 ft」と書くと、基礎教材の 27 ft との食い違い（RULINGS `R.altimeter-rule-of-thumb`）も説明できる。答えの「約 280 ft」は「約 270〜280 ft」でもよい。
- **N4.** `inst.speed` の VFE「フラップを下げてよい最大の速度」：POH 2.3 は「Do not exceed this speed with the flaps extended」（下げたまま飛んでよい最大の速度）。「フラップを下げたまま飛んでよい最大の速度」に。
- **N5.** `inst.claims.json` の `sys.compass#ebe7b677` の出典の引用「near 30 degrees latitude … 15+15=30」は PHAK の文ではない（PHAK の北旋誤差の例は「near 40 degrees latitude … 15+20=35」。30° の例は南旋誤差の段落にあり、本文は「15+15+30」と誤植）。出典を「15 degrees plus half of the latitude（例は 40° で 35°）。北緯 30° の 30° は W15 の計算」に。
- **N6.** `inst.claims.json` の `inst.pfd#c7120cd1`・`#a0317f35`・`#d847ca61`・`#1e541e5a` の出典「（GFC 700 型の AFCS）」：トレンドの線と旋回率の線は Pilot's Guide の第 2 章 Flight Instruments（AFCS の章ではない）。出典の場所を直す。
- **N7.** 予備計器が出すものの出典：Archer III POH の予備計器の説明は 7.13（p. 7-37「attitude, barometric altitude, airspeed, heading, vertical speed, slip/skid and turn rate」「fully digital, independent」）。`sys.compass`・`inst.flow` の表・説明してみよう 22 の「POH 2.23・7.21」に 7.13 を足す。
- **N8.** `R.ifh` が `refs` にあるのに、本文で一度も引いていない。`inst.gyro` の「ここに注意」（真空が弱くなるとこまがゆっくり遅くなり、誤りが少しずつ出る）は PHAK 第 8 章（gyro not spinning fast enough）に加えて IFH 第 11 章（Pneumatic System Failure：「can fail progressively. As the gyroscopes slow down, they may wander」）がより直接の出典。`sys.compass` の北旋誤差の「北では遅れ、南では先回り」も、PHAK 第 8 章の北旋誤差の段落は「lead」という語を使っていて紛らわしい（「Lags or Leads」の段落と IFH 第 7 章は本文と同じ向き）。IFH を引くか、`refs` から外す。
- **N9.** 図 `instPfd`：姿勢は翼が水平（地平線が水平）なのに、旋回率の線が右旋回を示している。例の数字の図とはいえ、旋回率の線を消すか、姿勢を少し右に傾ける。
- **N10.** 図 `instApBand`：基準の欄の「500」は、手引きの表示では「500FPM」。
- **N11.** 略語の初出：`HSI` は `inst.gyro`（「HSI など」）が先で、開いているのは後の `inst.pfd`。`CDI` は章の中で一度も開いていない（STYLE「略語も初出で開きます」）。`inst.gyro` で「HSI（水平状況指示器）」、`inst.pfd` の表の前で「CDI（コース偏位指示器、course deviation indicator）」のように開く（語は W04 の用語の表で決まるまで仮）。
- **N12.** `NEW_R.aah4`：AAH は 2009 年版（2013 年の改訂）で、今は faa.gov のハンドブックの一覧から外れ、FAA Safety Team（faasafety.gov）の写しで読める（faa.gov の旧 URL は 404 を返した）。ラベルに「2009 年版。FAA Safety Team の写し」と書くと、版が分かる。

## 5. 主張の札 77 行の判定

すべて一次資料（2 の表）で確かめ、**合う**。札（参考値・条文・教材値）も正しい。統合役は、4 の M・S を直したあとの文で、次の行に `checkedBy: "factcheck-inst"`・`checkedOn: "2026-10-30"` を付けてよい（直しで文が変わった行は、行の ID が変わるので、もう一度抜き出して照らす）。

| 節 | 行 | 判定と照らした所 |
|---|---|---|
| inst.flow | #33277098（28 V のバス） | 合う：POH 7.17「28 volt electrical system」。※同じ「思い出そう」の 2 文目は札の行の外だが誤り（M1） |
| sys.g1000 | #f956f55f（50 ft） | 合う：POH 7.21「The altimeter error is less than 50 feet unless otherwise placarded」 |
| inst.speed | #fa037a45、#1e6b7bf8・#875135c5・#cb6ec5aa・#d77ca182、#1f60d6d2・#8685a94f、#7992c2a3（教材値）、例題 #366d3ef9・#cd8098cd・#85808be5・#a087fa9b・#00331970・#e4add740・#f6da01f0・#52d82784・#80e82269 | 合う：PHAK 第 5 章 q＝½ρv²、POH 2.3・2.5 の値、`FL.physics` の pa28.v（s0 45・fe 102・s1 50・no 125・ne 154 を読み込んで確かめた）、計算は 6 |
| inst.alt | #fb9af44a・#9bb0f772・#5763f629・#5892c817・#253028aa・#de4a28c5（N3）・#8ddc879a・#a7ba1fa2・#eb093d5d・#5a3c903d・#94ec3e50・#21d91f7c・#ee1cd051、例題 #4e563e16・#299974dc・#4b5eb444・#df46d654・#3a1d1213（N3）・#19e3a2c9・#9846296f | 合う：PHAK 第 8 章（図 8-4 の −10 ℃・1,000 ft の欄は 100 ft、Abilene の例 29.94−29.69＝0.25・2,600−250＝2,350、山の上 1,000 ft、31.00／28.00、6〜9 秒）、AIM 7-2-2・7-2-3（±75 ft or greater、1 inHg＝1,000 ft）、PHAK 第 4 章 図 4-3 |
| inst.alt（囲み） | #fa8b7769・#1915f67c・#6d21a4c0・#cd3d878f・#681debc0 | 合う：`FL.jur` の `alt.transition`・`alt.unit` が描く文。施行規則第 178 条は e-Gov の写しで読んだ（14,000 ft 未満は QNH）。米国の欄（91.121・AIM 7-1-28/29）は W06・FC2 で確かめ済みの値で、この章は描くだけ。`FL.jur` の `boxes` に `inst.alt` がある |
| inst.gyro | #11fbd9fc・#d06923d7・#263cf16e・#d183c73c・#c32812f4・#43bf2a30・#272676b4・#36d544ee・#f7482e14、例題 #8de2e8a2・#5532998f・#31097599・#573b0b21・#1a42c6bd・#6cfc4d8b、#5c267f79（教材値） | 合う：PHAK 第 8 章（90°、4.5〜5.5 inHg、図 8-24 の 10・20・30・45・60・90°、100〜110°／60〜70°、15°/時、約 15 分、3°/秒・2 MIN）、PHAK 第 5 章の 1,091 の式、`flight-lab/src/avionics.js` に旋回率のトレンドも自動操縦もない（頭の注記「No autopilot」） |
| sys.compass | #fae76ff4・#ebe7b677（N5）・#997d72e4、囲み #bcfb9fc8・#b3b95b7c | 合う：PHAK 第 8 章（33 は N の右、15°＋緯度の半分、約 18°）。囲みは `FL.jur` の `sbas`（W06・W12・FC2 で確かめ済み、`boxes` に `sys.compass`） |
| inst.pfd | #c7120cd1・#a0317f35・#d847ca61・#1e541e5a（どれも N6） | 合う：PHAK 第 8 章（6-second projection）、Pilot's Guide 第 2 章（six seconds、heading predicted in 6 seconds、18°） |
| inst.ap | #43d17686（例題。図は M2）・#5ae65977・#3b666314・#db8cbd7d・#d72f3984・#f8a5a72f・#82e8fece・#989a7eae | 合う：Pilot's Guide 第 7 章（10 seconds、At 50 feet）、POH 補足 2（three second delay … 55° bank and 320 ft、140 KIAS、10 degrees (one notch)、200 feet AGL）、PHAK 第 2 章（greatly reduce workload） |

札の行の外の文（数字のない規則・説明）も読んで照らした。上の 4 に挙げたもののほかは、一次資料と合う。主なもの：詰まりの表の 4 行（PHAK：入口だけ → 0、入口と排水口 → 高度計のように、静圧孔 → 上で遅く下で速く・高度計は止まる・昇降計は 0（「少し動いたあと」は RULINGS `R.static-block-vsi` の裁定のとおり）、代替静圧源 → やや高く・速く・昇降計は一瞬上昇）、AHRS・ADC の故障の表示（POH 3.5e）、MFD の故障の手順（POH 3.5e「pressing the DISPLAY BACKUP button ensures that the PFD reverts. Without … all engine parameters on the EIS window would be lost」）、赤い DISPLAY BACKUP のボタン（POH 7.13 のオーディオパネルの説明「The red DISPLAY BACKUP button at the bottom of the audio panel」）、FD と AP・6 つの手順・VS と失速・とらえる途中の取り消し（AAH 第 4 章）、故障とトリムの暴走の手順（POH 補足 2）、合成視界の注意（CRG の WARNING）、UNOS・ANDS と南半球（PHAK の伏角の向き＋NZ の手引きの ONUS・SAND。W15 の未解決 7 の 4 の判断は妥当）。

## 6. 計算の検算（全部を計算し直した）

| 場所 | 式 | 計算し直した値 | 判定 |
|---|---|---|---|
| inst.speed 演習①・説明 2 | ½×1.2×50²、½×1.2×100² | 1,500 Pa、6,000 Pa（4 倍） | 合う |
| inst.speed 演習②・説明 3 | 120÷√0.64、150−20 | 150 kt、130 kt | 合う |
| inst.alt 0.01 inHg | 0.01×1,000 | 10 ft | 合う |
| inst.alt 1 hPa の目安 | (29.92−28.86)×33.8639＝35.90 hPa、1,000÷35.90 | 27.9 ft/hPa（海面の標準大気では 27.3：N3） | 合う |
| inst.alt 演習① | 29.94−29.69、0.25×1,000、2,600−250 | 0.25 inHg、250 ft、2,350 ft | 合う（PHAK の例と同じ） |
| inst.alt 演習②・説明 7 | 10×28 | 280 ft（標準大気の 1003 と 1013 hPa の高さの差は 274 ft：N3） | 合う（概算） |
| inst.alt 演習（上昇） | 600×20÷60 | 200 ft | 合う |
| inst.gyro θ＝α＋γ | 5−8 | −3° | 合う |
| inst.gyro 演習 | tan φ＝3×100÷1,091＝0.2750、90÷3 | φ＝15.4°（約 15°）、30 秒 | 合う |
| inst.gyro 標準旋回 | 180÷3、360÷3 | 60 秒、120 秒＝2 分 | 合う |
| inst.gyro の bk.sim | 3°/秒×10 秒 | 30° | 合う |
| inst.pfd 旋回率の線 | 3°/秒×6 秒 | 18° | 合う（手引きの値と同じ） |
| sys.compass 北旋誤差 | 15＋30÷2 | 30° | 合う |
| 確認問題 7・説明 11 | 180÷3 | 60 秒＝1 分 | 合う |

確認問題 8 問：正解はどれも本文と一次資料に合い、正解の位置は A・B・C・D が 2 問ずつ。説明してみよう 22 問：答えはどれも本文と一次資料に合う（説明 22 の①②③④も POH 7.21・2.23・3.5d・3.5e・補足 2 で確かめた。7.13 を足すのは N7）。

## 7. 図（11 枚を Chromium 390 px で描いて目で見た。章の検査の figures も 24 枚 error 0・warn 0、最小 10.3 px）

| 図 | 判定 |
|---|---|
| `instChain` | 正しい |
| `instShared` | 正しい（POH 7.21 の 1 本の柱と別の管、POH 7.13 の AHRS の入力（GPS・air data）、CRG の TAS の補助、POH 7.17・3.5d の非常用のバス） |
| `pitotStatic`（描き直し） | 正しい（前向きのピトーの穴・横の静圧孔・ADC と予備計器へ別の管）。排水口は「ほかに」の行に一般の名前として出るだけなので、S6 の直しと合わせて読める |
| `instAsi` | 正しい（ダイヤフラムに全圧、ケースに静圧：PHAK 図 8-7） |
| `instAltErrors` | 正しい（気圧の低い所で規正値を直さない・寒い日：どちらも実際は低い。差を大きく描いたと明記） |
| `instVsi` | 正しい（ダイヤフラムに直接、ケースに細い穴。針は約 7 秒で落ち着く：6〜9 秒の範囲） |
| `instGyros` | 表と剛性の小図は正しい。**歳差の小図の矢印は S3** |
| `instPitchPath` | 正しい（5°・8°・−3° の札、角度は大きく描いたと明記） |
| `instPfd` | 配置・番号の説明は正しい（POH 7.13・PHAK 図 8-12・Pilot's Guide）。例の姿勢と旋回率の線の食い違いは N9 |
| `instApBand` | 縦の側と色の説明は正しい。**横の作動と待ちの位置が逆（M2）**、「500FPM」（N10） |
| `instApLoop` | 正しい（POH 補足 2 の「not performing as expected … AP DISC」） |

## 8. 日米の書き分け（DESIGN 3.4・STYLE）

- 全節 `scope: 'common'`。米国の規則の言葉は「米国の AIM 7-2-3」「米国の AIM 7-2-2」の 2 文だけで、どちらも同じ文に国がある。14 CFR・航空法の条番号は本文にない。日本の数字は `bk.jur('alt.transition', 'alt.unit')`・`bk.jur('sbas')` が `FL.jur` から描くだけで、手で書いた数字はない。check-jurisdiction は error 0。
- `sys.compass` の Sanford の偏差は、本文に数字を写さず囲みの米国の列を指している（STYLE「囲みの数字は手で書きません」に合う）。LAB の `MAGVAR_W`（6）は「教材値」と書いてある。
- 後ろの部へのリンクは `ifr.scan` の 1 本で「予告」つき。第 7 部・まとめの章へのリンクはない。
- 第 1〜6 部の本文に FLIGHT LAB の操作の言葉はない（シミュレータの話は `bk.sim` と章の注意だけ）。

## 9. 基礎教材の書き直し（写しでないこと）

- kiso04・kiso02・kiso10・kiso12 の本文・表・問と、下書きの本文（タグと `${…}` を除いた文字）の重なりを調べた。**22 字以上の一致は 0**。14 字以上の一致は 13 か所で、どれも語句の並び（「1003 hPa から 1013 hPa」「180° に 60 秒、360° に」など）で、文の写しはない。
- 基礎教材の日本前提の数字（kiso04.6・04.7）は本文に持ち込まず、`bk.jur` の囲み（ERRATA `K.instruments.gap-1`）にした。kiso04.7 の「1 hPa ≈ 27 ft」は、一次資料から計算した 28 ft に置き換えた（N3 の書き方の注意だけ）。kiso04.2 の 1.225 kg/m³ は「仮に 1.2 kg/m³」にした（W15 の判断。海面の標準大気の密度は 1.225 kg/m³ だが、計算の例として仮の値と明記してあるので誤りではない）。
- `from` は 8 節すべてにあり、説明してみよう 22 問の `from`（kiso04.q1〜q8・q10〜q18・q21・q22・q28、kiso10.q25、kiso12.q8）も、元の問の中身と対応している（kiso04.q28 の課題を最後に置いた）。

## 10. 検査の結果

| 検査 | 結果 |
|---|---|
| `check-chapter.mjs`（`sys-figs.js`・`sys.js`・`inst-figs.js`・`inst.js`） | error 24・warn 26・pending 2。W15 の報告 5.1 と同じ：style の error 24 はどれも道具の数え方（W10b の部品の見出し「判断の目」「思い出そう」「ここを混同しない」「答えと解き方」を文と数える。inst は 15）、claims の warn 19 は `CLAIMS.json` に行がまだないため（`--claims-out` の 77 行は `inst.claims.json` と一致）、questions の warn 1 は `sys` の今の 5 問、pending は `C.autopilot-modes` の呼び戻しの節（W30）と `CALC.json`。chapters・form・data・volume・jurisdiction・chapter-refs・figures（24 枚、最小 10.3 px）・photos・jur・path・provenance・egov は 0 |
| FLIGHT LAB `npm run -s test:fast` | **86/86 pass** |
| TEXTBOOK `npm test` | **33/34**（2 回流して 2 回とも同じ 1 件）。落ちるのは `build: FLIGHT LAB sources are not copied into textbook/` で、原因は `textbook/rewrite/combined/drafts/radio.js`（W19 の下書き）が `flight-lab/src/radio.js` と同じ名前であること。`inst` とは関係しない（STYLE「`flight-lab/src/` のファイルと同じ名前にしません」の違反。下の 12） |
| CADET `npm run -s test:fast` | **247/247 pass** |

（テストを流すと `flight-lab/outputs/FLIGHT-LAB.html`・`cadet/outputs/CADET.html` が書き直される。どちらも流す前から「変更あり」で、この単位は中身に手を入れていない。）

## 11. 台帳の行

触っていない（この単位は報告だけ）。5 の表のとおり、CLAIMS の 77 行は確かめ終えた（M1・M2・S1〜S6 の直しのあと、文が変わった行は抜き出し直して照らす）。ERRATA `K.instruments.gap-1` を W15 のパッチで `fixed`・`verified: true` にすることは、`inst.alt` の `bk.jur('alt.transition', 'alt.unit')` と e-Gov の写しで確かめたので妥当。RULINGS `R.northerly-turn-error` を `fixed` にすることも妥当（PHAK の式で、本文の向きは「Lags or Leads」・IFH 第 7 章と同じ。N8）。

## 12. ほかの単位にお願いしたいこと（needs from others）

1. **W15（またはこの章の改稿）**：4 の M1・M2・S1〜S6 を直す。nit は任意。直したら `check-chapter.mjs --claims-out` で `inst.claims.json` を作り直す。
2. **W19（radio）**：`textbook/rewrite/combined/drafts/radio.js` の名前が `flight-lab/src/radio.js` と同じで、TEXTBOOK の `build.test.mjs`（FLIGHT LAB sources are not copied into textbook/）が落ちる。下書きの名前を変える（例 `radio-draft.js`。STYLE「書く順と確かめ」）。
3. **W04（用語の表）**：W15 の頼み（ADC・AHRS・HSI・CDI・FD など）に加えて、N11 の HSI・CDI の正式名を決めてほしい。
4. **統合役**：登録のとき、5 の表の行に `checkedBy` を付ける（直したあとの文で）。
