# R2V 報告：第 1 部の主張の二人目（CLAIMS・CALC・PROVENANCE の署名、基準 15・6・21 の第 1 部の残り）

単位：R2V（R3 の始め。PROGRESS.md の「次（R3）」の 2。DESIGN 5 章の基準 1・3・5・6・15・21）。作業日：2026-10-30。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `flight-lab/src/book-1.js` | `perf.da`：hPa の例の計算を、表示する 1016.3 hPa（0.1 に丸めた値）で計算するようにした（事実の誤り。下の 2.1）。`aero.forces`：教材値「揚力は抗力の約 9 倍」の隣に参考値（POH 図 5-33 からの約 11 倍）の段落を足した（基準 6）。`aero.stall`：重心の影響の住所 `perf.wb` へのリンクを 1 文足した。思い出そうの囲み 5 つ（`sys.ctl`・`perf.da`・`perf.range`・`perf.tol`・`perf.plan`：下の 2.4） |
| `flight-lab/src/book-2.js` | 基準 21 の文の分け方 4 か所（`wx.ice` 1・`law.basis` 2・`law.pilot` 2）、思い出そうの囲み 2 つ（`law.pilot`・`navb.calc`） |
| `flight-lab/src/book-comm.js` | 基準 21 の文の分け方 2 か所（`comm.numbers` の 81 字の文・`comm.callsign`） |
| `textbook/rewrite/combined/ledgers/CALC.json`（新） | 計算の例の台帳 148 行（下の 2.2） |
| `textbook/rewrite/combined/reports/R2V.ledger.json`（新） | 台帳のパッチ 2,591 行（下の 4） |
| `textbook/rewrite/combined/reports/R2V.md` | この報告 |

`book-0.js`・`book-gates.js`・`drafts/*.claims.json` は変えていない（事実の誤りがなく、署名は台帳にパッチで書いた。R1V と同じ）。`flight-lab/kiso/` には触っていない。作業の途中で、私の curl の書き方の誤りで一次資料の写し 4 つ（afh.html・awh.html・ck.pdf・ifh.pdf）がリポジトリの一番上に落ちたが、すぐに scratchpad へ移した（追跡されていない、私が作ったファイルだけ。`git status` で確かめた）。

## 2. したことと理由

### 2.1 CLAIMS の署名待ちの行（基準 3）

対象：署名のない 2,126 行（第 1 部 2,122：`aero` 217・`sys` 155・`inst` 100・`perf` 275・`wb` 79・`wx` 250・`navb` 192・`law` 261・`hf` 118・`adm` 18・`radio` 29・`comm` 338・`g1` 90。序部 4：`basics` 2・`intro` 2）。

**確かめ方**：一次資料を 2026-10-30 に自分で取り直し（scratchpad に保存。前の単位の写しは使っていない）、次の 2 段で全部の行を見た。

1. 道具で照らす：行の出典の欄から資料（14 CFR の節・AIM の段落・PHAK と AFH の章・POH・チェックリスト・AWH・IFH・e-Gov の条など）を割り出し、行の文の数字と、出典の欄に引いた英文が、その資料の該当の所にあるかを自動で照らした（PDF の段組みと OCR の崩れは、ゆるい一致で吸収）。計算の文は、式を取り出して計算し直した（113 文。全部合う）。
2. 人が読む：道具で合わなかった行・数字のない行・資料の決まらない行（約 1,400 行）は、章ごとに全部読み、資料の該当の所を開いて確かめた。道具で合った行（約 700 行）も全部の文を読み、数字が合っても意味が違う行がないかを見た。図の中の値（POH の滑空距離の図 5-33・離陸の図 5-7 の例など）は、POH の PDF のページを画像にして読んだ。

**読んだ一次資料**（どれも 2026-10-30 に取得）：

- **米国の規則**：eCFR versioner API（2026-10-27 の版）の 14 CFR Part 1・21・23・39・43・45・47・61・65・67・71・73・91・99・141、49 CFR Part 830、47 CFR Part 87。旧 Part 23（2017-01-03 の版：23.3・23.333・23.335・23.337・23.1387・23.1505・23.1507）。91.113 の改正の日（2025-07-24 公布・2025-10-22 施行）は eCFR の versions API と Federal Register API（90 FR 35034）で確かめた。
- **FAA の資料**：AIM（Change 3 の HTML 全 49 節）・P/CG（A〜W）・JO 7110.65（2-4・2-6・3-7・3-9・3-10 節）・PHAK 第 1〜17 章・AFH（全文）・IFH（全文）・AWH（FAA-H-8083-28B 全文）・Weight and Balance Handbook（8083-1B）・AMT Handbook Airframe Vol. 2・General・Risk Management Handbook（8083-2A）・FAA-P-8740-2・AC 61-67C Chg 2・AC 00-46F・AC 120-111 Chg 1・Advanced Avionics Handbook 第 4 章・SAIB CE-10-11・CAMI の Hearing and Noise・Altitude-Induced DCS・Acceleration・Circadian Rhythm・Federal Air Surgeon の Hypothermia/Hyperthermia、From the Flight Deck: SFB。
- **機体**：Archer III POH VB-2266（andrews.edu の写し）・Archer III G1000 チェックリスト（MGA）・Garmin G1000 Cockpit Reference Guide（190-01460-00）と Cessna Nav III Pilot's Guide（190-00498-07）・Lycoming SSP-110-3・Piper Trainer Brochure 2026。
- **そのほか**：NIST SP 811 B.9・第 4 章、NGA Pub. 9 Bowditch 第 1 巻（2024）、NOAA の WMM（geomag API で Sanford 7.09°W・那覇 5.87°W・稚内 10.57°W、2026-10-30）・NHC・NWS Omaha・NWS Glossary・NWSI 10-813、USNO API（Sanford の市民薄明：1 月 25 分・6 月 27 分・9 月 23 分）、NASA Glenn（Bernoulli and Newton・Aerodynamic Center）、UK CAA CAP 737、AirNav の KSFB（滑走路 4 本の長さ・標高 54.8 ft）、気象庁「飛行場に関する気象情報」（TAF 40 空港・1 日 4 回・30 時間）、国土交通省の学科試験例題集 自家用（sha256 が FL.terms の値と一致）・ヒューマンファクターズ訓練検討会 最終とりまとめ（間隔 2 年・最低 3 時間・令和 10 年 6 月頃）、VOICES、国土地理院（富士山 3,776 m）、e-Gov API v2 の航空法（令和 7 年 12 月 1 日施行）と施行規則（令和 8 年 10 月 1 日施行）の全文。
- 海面の標準の密度 1.225 kg/m³：U.S. Standard Atmosphere 1976 の PDF は画像だけで文字が読めなかった。AWH 表 4-2 の海面の値（1013.25 hPa・15 ℃）から ρ ＝ p ÷（R T）＝ 101,325 ÷（287.05 × 288.15）＝ 1.2250 と計算して確かめた。

**結果**：

| | 行 |
|---|---|
| 一次資料のとおりで署名した（`checkedBy: R2V`） | **2,114** |
| 誤りが見つかり、文を直した（前の行は `op: remove`、新しい行は `op: add`） | **1**（`perf.da#ee17fecb`） |
| 正しいが、基準 21 のため文を分けた（前の行は remove、新しい行は add） | 4（`wx.ice#80c7dc0e`・`law.basis#1f6892ba`・`law.pilot#d3ae2886`・`comm.callsign#20841e89`） |
| 署名しない：〔安全〕③の本の裁定（RULINGS `R.vfr-into-imc` が開いている） | 2（`hf.body#9e862111`・`#48ab6419`） |
| 署名しない：作業中に W21 の図の直しで文が変わり、今の本にない | 5（下の 6 の 1） |

**見つかった誤り（直した）**：`perf.da` の「LAB の 30.01 inHg は約 1016.3 hPa です。hPa の式では 55 ＋（1013.25 − 1016.3）× 27 ≒ −26 ft です」。表示した 1016.3 で計算すると 55 − 3.05 × 27 ＝ −27.35 で、−27 ft になる。−26 は、丸める前の 1016.26 で計算していた（本の文は `book-1.js` の式で作る）。式を「hPa を 0.1 に丸めてから計算する」に直し、本の文は「≒ −27 ft」になった。直後の文「inHg の式の約 −35 ft と、ほとんど同じ」は今のままで正しい。

**署名しない 2 行（hf.body）**：雲の中の 180° 旋回の文（教材値の札）。AFH 第 18 章の「バンク 10° 以下」は図 18-13 の段落で確かめたが、180° 旋回とその条件は RULINGS `R.vfr-into-imc`（status open）の本の裁定で、一次資料に決まった手順はない（R1V と同じ判断）。裁定が閉じ、W36 の安全レビューが通ってから署名する。

**表の行で、文が少し変わっていた 8 行**（`aero.vn#cb52fcdb`・`inst.ap#82e8fece`・`wb.limits#24434c73`・`wx.atm#4057098e`・`navb.north#c5d0ad69`・`law.aircraft#0cf58532`・`#ad45a152`・`law.airspace#ef1f6a32`）：W24 が用語の括弧を足しただけで、数字・条番号は同じ。今の本の表の値で確かめて署名し、note に書いた。

**架空の台本の行**（`comm` の約 25 行：LAB 空港の交信）：外の事実の主張でない（空港・周波数・コード・値は架空）ことと、言い方の型が AIM 4-2・4-3・4-4 と JO 7110.65 に合うことを確かめて署名した。

**FL.jur が描く囲みの行**：W06 が確かめ W12 が署名した値。私も、米国の欄は eCFR と AIM で、日本の欄は e-Gov の全文（施行規則第 5・174・178・197〜197 条の 3 など）で照らし直した。〔要確認〕の札の文は、答えが公開資料にないことを確かめて署名した。

### 2.2 計算の例の台帳 `CALC.json`（基準 5）

台帳がなかったので作った（`ledgers/CALC.json`、148 行。形は `tools/calc-check.mjs` の頭の説明どおり：`id・sec・expr・data・expect・tol・show`、ほかに `claim`・`note`）。

- 131 行：第 1 部と序部の本文・考えてみよう・計算演習の計算の文から式を取り出し、式で計算し直して本の値と合うものを行にした（`show` はその式と答えの文字。本文にそのまま出る）。`aero` 21・`sys` 8・`inst` 7・`perf` 33・`wb` 12・`wx` 7・`navb` 24・`g1` 5・`basics` 14。
- 17 行：式の形でない計算を手で足した（`perf.range` の往復の時間・`wb.shift` の重心の移動と移す重さ・`navb.wind` の偏流修正角と GS・`law.pilot` の身体検査の期限など）。教材値は `data` で `FL.physics` から読む（`aero.stall` の 45° バンクの失速速度 59.5 kt・`aero.lift` の 70 kt の揚力係数 0.82・`aero.power` の抗力が最小の速度 71 kt・`perf.da` の LAB の 33 ℃ の密度高度・`navb.north` の偏差 6°W）。モデルの値が変わると calc-check が止まる。
- `calc-check.mjs`：**178 例（見本 30・CALC.json 148）で error 0・warn 0**。
- 道具が式の取り出しを誤った 3 つ（`aero.vn` の √ の連鎖・`perf.range` の分の換算）は、手で計算し直して合うことを確かめ、手の行で入れた。

### 2.3 PROVENANCE の署名待ち 463 行（基準 11）

第 1 部と序部の基礎教材の行き先（節 177・問 196・図 36・写真 54：うち外す理由のある写真 33 と節 1）。

- 節：行き先の節が本にあり、その節の `from` にこの ID があることを確かめた。原本の節の本文と本の節の文で 20 字続けて同じ所を探し、あったのは 8 節の短い言い回し・例題の値・式だけ（例「出力 100 kW、効率 0.80、速度 60 m」）で、どれも書き直した文の中の一部。
- 問：行き先（章末の説明してみよう・考えてみよう・計算演習）が本にあり、`from` にこの ID があることを確かめた（written は `[q, a, from]` の形）。20 字の一致は 16 問で、問いの言い回しか例の値だけ。
- 図：`where` の `FIG.xxx` を描き、その aria-label が行き先の節にあることを確かめた（暗い板・390 px の検査は W21 と check-figures）。
- 写真：行き先の節で使っていること。外す 33 枚は理由があり、本で使っていないこと。
- 結果：**462 行に署名**。1 行（`ch09-fig9-2`）は署名しない：`status: done` なのに `to: []`・`plan: drop` で、`where` は「FIG.lawSources（law.basis）に描き直した」。`law.basis` に `FIG.lawSources` はある（book-2.js）ので、行き先 `to: ['law.basis']`・`plan: 'redraw'` に直してから署名する（図の持ち主 W21 か統合役。下の 6）。

### 2.4 基準 15：第 1 部の呼び戻し

`check-concepts.mjs` の第 1 部と序部の警告 18 のうち、**住所が呼び戻す節より前にある 7 組**を、リンクつきの「思い出そう」（`bk.recall`、1〜2 文）にした：`law.pilot`→`sys.lights`・`perf.range`→`sys.engine`・`perf.tol`→`sys.gear`・`perf.da`→`inst.alt`・`navb.calc`→`perf.range`・`perf.plan`→`sys.carb`・`sys.ctl`→`aero.axes`。警告は 34 → 27（第 1 部と序部は 18 → 11）。

残る 11 組は、**住所が呼び戻す節より後ろにある**（呼び戻す節を先に読む）組：`basics.alt`→`inst.alt`・`perf.da`、`basics.speed`→`navb.wind`、`basics.time`→`navb.north`、`aero.stall`・`aero.stab`→`perf.wb`、`sys.compass`→`navb.north`、`wx.brief`→`adm.risk`、`hf.srm`→`adm.error`・`adm.check`、`hf.adm`→`adm.sa`。まだ読んでいない節を「思い出そう」の囲みで指すのは読み手に意味が通らないので、囲みにしなかった。8 組はすでにリンクがあり（`aero.stall` は今回足した）、序部の 3 組（`basics.alt`→`inst.alt`・`basics.speed`→`navb.wind`・`basics.time`→`navb.north`）は、足すと後ろの部への `bk.see` が 41 → 44 本になり、基準 23 の上限 40 をさらに超えるので足していない。道具か台帳の決め方を直してほしい（下の 6 の 3）。

### 2.5 基準 6：`aero.forces` の参考値

図 forces のキャプション（`book-figs.js`、W21 の持ち物）の教材値「巡航では揚力は抗力の約 9 倍」の隣に、本文の段落を足した：「図の『揚力は抗力の約 9 倍』は、この教材の Archer の巡航（110 kt）の教材値です。参考値：Archer III の POH の滑空の図（図 5-33。76 KIAS・2,250 lb・無風）では、6,000 ft の高さから 11.2 NM 進みます。11.2 × 6,076 ÷ 6,000 ≒ 11 なので、この速さでは揚力が抗力の約 11 倍です（…わけは、必要馬力の節で学びます）。」。教材値は `physics.js` の pa28（CD0 0.032・K 0.05・1,050 kg・15.8 m²）で 110 kt の L/D ≒ 8.9 と計算して確かめ、参考値は POH 図 5-33 を画像で読んだ。`check-claims` の `teaching-value-alone` から `aero.forces` が消えた（残りは第 2 部の `ops.trim`・`ops.slow`：W28）。

### 2.6 基準 21：第 1 部の長い文と平均 40 字を超える節

今の本で数え直すと、第 1 部は長い文 1（`comm.numbers` の 81 字）・平均 40 字を超える節 5（`wx.ice` 40.4・`law.basis` 40.6・`law.pilot` 40.9・`comm.numbers` 40.8・`comm.callsign` 41.2）だった（PROGRESS の 6・6 のうち、ほかは R2 の締めまでに直っていた）。どれも、中身を変えずに長い文を 2 文に分けた（数字・条番号・出典は同じ。分けた文は一次資料で確かめ直した：AIM 7-1-19・eCFR の Title 14 の構造と Part 91 の Authority・14 CFR 61.15(e)・49 CFR 830.2・830.5・AIM 4-2-4・JO 7110.65 2-4-17 の例 135.275）。結果：**第 1 部の長い文 0・平均 40 字を超える節 0**（`wx.ice` 39.9・`law.basis` 39.5・`law.pilot` 39.8・`comm.numbers` 37.8・`comm.callsign` 39.5）。

## 3. 確かめ（検査とテスト）

| コマンド | 結果 |
|---|---|
| `check-chapter.mjs`（`--no-browser`）`intro`・`basics`・`english`・`aero`・`sys`・`inst`・`perf`・`wb`・`wx`・`navb`・`law`・`radio1`〜`radio5`・`hf`・`adm`・`g1` | **全部 error 0**。warn は前からの初出の形・思い出そう（上の 2.4）・新しい文の札なし（パッチの add を統合役が取り込めば消える） |
| `calc-check.mjs` | 178 例 error 0・warn 0 |
| `check-claims.mjs` | error 0。第 1 部の札なしは、R2V が足した 10 文と、W21 が図の中で変えた 5 文だけ（パッチを取り込み、W21 の行が入れば 0）。`teaching-value-alone` 3 → 2（第 2 部） |
| `check-concepts.mjs` | error 0・warn 34 → 27 |
| `check-style.mjs --all` | 第 1 部の長い文 0・平均超え 0（`comm.numbers` の留保の言い方 2 回の warn は前からで、私の分けた文には留保の言い方はない） |
| `check-path.mjs` | 後ろの部への `bk.see` 41（変えていない） |
| `ledgers/validate.mjs` | ok — 0 error（パッチの形も通る）。`apply-patches.mjs reports/R2V.ledger.json`（見るだけ）は 2,591 行が当たる |
| `cd flight-lab && npm run -s test:fast` | **89/89** |
| `cd textbook && npm test` | **36/36** |
| `cd cadet && npm run -s test:fast` | **248/248** |

## 4. 台帳の行（`reports/R2V.ledger.json`、2,591 行）

- CLAIMS：2,114 行に `checkedBy: R2V`・`checkedOn: 2026-10-30` と、照らした資料の note。`op: remove` 5 行（直した・分けた文の前の行。note に新しい行の id）。`op: add` 10 行（`by: R2V`、別の確かめ役の署名を待つ）：`aero.forces#2d66f842`・`#30de3690`・`#405c2071`・`perf.da#1e6acda7`・`#a9b0a668`・`wx.ice#d022de0f`・`law.basis#5f888559`・`#9361520a`・`law.pilot#f0dda99f`・`comm.callsign#dee4fc6b`。
- PROVENANCE：462 行に `checkedBy: R2V` と note。
- パッチを当てたあとの CLAIMS の第 1 部と序部の署名なし：R2V が足した 10・hf.body 2・W21 の図の直しで本から外れた 5（W21 の新しい行が入れば外れる）。
- `CALC.json` は台帳のファイル（`validate.mjs` の対象の一覧にはない。calc-check が読む）。

## 5. 未解決のこと

1. **hf.body の 180° 旋回の 2 行**：RULINGS `R.vfr-into-imc` が開いたまま。裁定を閉じるか、本の文を AFH 第 18 章の範囲（浅いバンク・計器で姿勢を保つ・援助を求める）に狭めるかを、W36（安全レビュー）か統合役が決める。
2. **基準 15 の 11 組**（上の 2.4）：住所が後ろにある組の扱い。
3. **R2 の締めで統合役が直した〔安全〕の文の 2 回目の安全レビュー**（`wx.shear`・`hf.body`・`aero.stall`・`inst.ap`・`perf.wb`・課目 a5）：今回はしていない（PROGRESS のとおり W36 でもよい）。CLAIMS の行としては一次資料と照らして署名した。
4. **第 1 部の基礎教材の問の答え**：PROVENANCE の署名は行き先と書き直しの確かめで、説明してみようの答えの全部を計算し直してはいない（計算の答えは CALC.json と answerable-R2・factcheck2-R2 が見た）。

## 6. ほかの単位に頼むこと

1. **W21（図）か統合役**：W21 の図の直しで、次の 5 文の CLAIMS の行が変わった（前の行は本にない）。新しい文は私が一次資料で確かめた（内容は前の行と同じか、用語だけの違い）ので、W21 のパッチで新しい行を足し前の行を外すとき、`checkedBy: R2V` を引き継いでよい：`aero.vn#f18f1d30` → `aero.vn#9b4da2ab`（進入速度 70 kt：チェックリスト）・`wb.limits#50996fb6` → `wb.limits#7810c98f`（2,558 lb：POH 1.11・2.11）・`comm.basic#cd2eaf80` → `comm.basic#3bdf7638`（AIM 4-2-7）・`comm.nordo#fe29a5d6` → `comm.nordo#189f199a`（14 CFR 91.125・AIM 4-3-13・4-2-13）・`hf.altitude#474036bb` → `hf.altitude#f97a6410`（14 CFR 91.211(a)(1)〜(3)）。
2. **W21 か統合役**：PROVENANCE `ch09-fig9-2` を `to: ['law.basis']`・`plan: 'redraw'` に直す（`where` と合わせる）。そのあと署名できる。
3. **W01 の道具（check-concepts）か CONCEPTS の行を持つ単位**：呼び戻す節が住所より前にあるとき（序部 → 第 1 部、同じ部の前の章 → 後ろの章）は、「思い出そう」の囲みでなく、住所へのリンク（後ろの部なら「予告」の札）があれば通す、という決め方にしてほしい。または、その組の CONCEPTS の行を「予告」の種類にする。対象は上の 2.4 の 11 組。序部の 3 組にリンクを足すなら、後ろの部への `bk.see` の上限（基準 23：今 41／40）と一緒に決める。
4. **W28（第 2 部）**：`ops.trim`・`ops.slow` の教材値に参考値を並べる（基準 6）。`sim.can`（`book-5.js`）の `hf.body` へのリンクに「予告」を付ける（基準 23）。
5. **W36**：上の 5 の 1・3。
6. **統合役**：パッチの取り込み（`apply-patches.mjs reports/R2V.ledger.json --write`）。R2V が足した CLAIMS の 10 行は、別の確かめ役（W36 の事実の二人目か統合役：数字・出典が前の行と同じ 4 行は、integrate-R2 の決まりで引き継げる）の署名を待つ。
