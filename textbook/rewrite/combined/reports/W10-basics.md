# W10（序部）の報告：章 `basics`「飛行の基本量」の下書き（執筆）

単位：W10 のうち、章 `basics` の執筆（R1・DESIGN 7.2 の W10）。日付：2026-10-27。
書いたもの：**下書きだけ**（どの製品も読まない場所。DESIGN 6.2 の決まり 5・7.4）。登録（読み込みの列・`book-0.js`・テストの定数）と台帳を閉じるのは、登録する統合役のコミットです。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/drafts/basics.js`（新） | 章 `basics` の下書き。`B.add({ id: 'basics', part: 'p0', before: 'aero', … })` で 9 節（`basics.flight`・`basics.crew`・`basics.units`・`basics.time`・`basics.speed`・`basics.alt`・`basics.rules`・`basics.docs`・`basics.case`）、章末（用語 17・例 4・注意 3・確認問題 4・説明してみよう `written` 14・出典 18・課目 `k1`）。新しい出典 9 件は `NEW_R`（登録のときに `book-core.js` の `R` へ） |
| `textbook/rewrite/combined/drafts/basics-figs.js`（新） | 図 10 枚（`FL.bookFigs` に足す関数。登録のときに `book-figs.js` の `FIG` へ）。基礎教材の図 3 枚を暗い板に描き直したもの（ch00-fig1 → `basicsFlight`、ch00-fig5 → `basicsWind`、ch00-fig6 → `basicsAlt`）と新しい図 7 枚（`basicsCrew`・`basicsUnits`・`basicsTime`・`basicsSpeedChain`・`basicsRules`・`basicsDocs`・`basicsCase`） |
| `textbook/rewrite/combined/drafts/basics.claims.json`（新） | 主張の札 93 行（`check-chapter.mjs --claims-out` が抜き出した全部の文。教材値 2・参考値 76・条文 15・推測・要確認 0。うち「例題」48） |
| `textbook/rewrite/combined/reports/W10-basics.md`（新） | この報告 |

ほかのファイルは変えていません（`flight-lab/kiso/` も含む。git の作業は何もしていません）。

確かめ方：

```sh
node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/basics-figs.js textbook/rewrite/combined/drafts/basics.js
```

## 2. したことと理由

### 2.1 節の形と節のデータ（DESIGN 3.2・STYLE「節の形」「節のデータ」）

- 9 節とも、ねらい（`bk.aim`）→ 最初の図 → 説明 → ここが大切（2〜4 項目・60 字以内）→ ここに注意（`bk.warn`）→ 日米の囲み → 考えてみよう → 写真 → シミュレータ（`bk.sim`、最後）の順（`check-form` error・warn 0）。
- 全節に `scope: 'common'`。米国の規則の言葉は `bk.us` と `bk.jur` の米国の列、または「米国の」と書いた文だけ、日本の規則の言葉は `bk.jp` と `bk.jur` の日本の列だけ（`check-jurisdiction` error・warn 0）。
- 全節に `from`（基礎教材の節 ID）：`basics.flight` ← kiso00.01、`basics.crew` ← kiso00.02、`basics.units` ← kiso00.07、`basics.time` ← kiso00.08、`basics.speed` ← kiso00.09〜00.11、`basics.alt` ← kiso00.12・00.13、`basics.rules` ← kiso00.14・kiso09.8・kiso12.1、`basics.docs` ← kiso00.15、`basics.case` ← kiso00.16。DESIGN 3.3 の「元にするもの」と一致（`check-data` の `from-missing`・`from-differs` 0）。
- `use` は手で書く分だけ（まとめ 1 など、課目 k1、JCAB の科目）。`jcab` は `JCAB-MAP.json` がこの章の節を名指ししている 8 行：`basics.units` ← ppl/cpl.1.1.1.1（℃ と °F の換算があるので °F を表に入れた）、`basics.speed` ← ppl/cpl.1.1.1.2、`basics.time` ← ppl/cpl.3.1.1.2、`basics.alt` ← ppl/cpl.3.1.1.4。`deep` の節はない。
- 決まりの部品 `bk.deep`・`bk.drill`・`bk.judge`・`bk.dont`・`bk.recall` は `book-core.js` にまだないので使っていない（STYLE「まだない部品は、下書きでも使いません」）。付録 A の「ここを混同しない」（計器高度・真高度・AGL・密度高度）は `basics.alt` の段落に、「思い出そう」（密度高度 → `perf.da`）は予告のリンクの段落にした。部品ができたら囲みに直す（5 の 4）。

### 2.2 基礎教材から書き直したこと（判断 2。一字一句の転記はしない）

基礎教材 第 0 章の節を、教科書の文体（です・ます、1 文 平均 33 字、留保の言い方は `basics.alt` の 1 回だけ）で書き直しました。数値例は基礎教材の数字を変えて作り直したもの（例：60 NM・120 kt → 50 NM・100 kt、10 月 13 日の換算 → 4 月 10 日の換算）が中心で、図 5・図 6 の例だけは描き直す図と同じ数字にしました（DESIGN 3.3 の「図 ch00-fig5」「図 ch00-fig6」）。

| 節 | 基礎教材から | 足したもの（DESIGN 3.3） |
|---|---|---|
| `basics.flight` | 一便の 5 段階と確かめること、判断を見直す機会 | 訓練のフライトの流れの予告（ブリーフィング → 書類・天気・ノータム → 外部点検 → 課目 → デブリーフィングとログブック。本体は R3 の `ground.day`） |
| `basics.crew` | 職位と PF・PM、運航を支える人、確認の習慣 | **3 層に直した**（職位・法令上の役割の機長（PIC）・操作の役割の PF/PM。ERRATA `K.overview.K2`、RULINGS `R.pic-meaning`）。ソロでは機長も PF も自分。米国の 14 CFR 1.1・91.3 は `bk.us`、航空法第 73 条は `bk.jp` |
| `basics.units` | NM・kt・ft・fpm・lb・hPa、換算の例、丸め方 | **inHg を足した**（1 inHg ≈ 33.86 hPa、29.92 inHg ≈ 1013.2 hPa。`K.overview.K3`・`R.pressure-unit`）、SM・US gal・L・°F・mph の速度計。囲み `alt.unit` |
| `basics.time` | UTC と JST の換算（日付つき）、方位、真北と磁北、風向の約束 | EST・EDT と日付をまたぐ換算の表、北の基準の表（米国：METAR・上空の風は真北、ATIS・管制塔の風と滑走路の番号は磁北）。囲み `time`（時刻の住所） |
| `basics.speed` | IAS・CAS・EAS・TAS・GS・Mach、風のベクトル、距離・速さ・時間 | **本文に TAS 100 kt と書いた**（図と表の TAS の取り違え：`K.overview.K4`）、TAS は CAS に 1,000 ft ごとに 2%（PHAK）、真横の風の表の行 |
| `basics.alt` | MSL・真高度・AGL・地形の標高、高度計・QNH・気圧高度・密度高度・FL | 付録 A の見本の形（LAB 空港の標高 55 ft で地上の確かめ、寒い日は低い、転移高度）。囲み `alt.transition`、写真 `ch00-photo5` |
| `basics.rules` | VFR/IFR と VMC/IMC は別の軸、計器飛行と IFR の違い | `ir.need` の囲み、米国の 91.113(b)（IFR でも見張り）・91.173 は `bk.us`、航空法第 2 条第 15〜17 項は `bk.jp` |
| `basics.docs` | 資料の種類、4 つの確認 | 優先の順（POH・教官・SOP・法規）、POH は製造番号と登録記号の書かれたもの（PHAK 第 9 章）、米国の 91.9 は `bk.us` |
| `basics.case` | 計算できる所と、情報が足りない所を分ける | Sanford（LAB）発・EDT・inHg の版を本文に、羽田発の版（JST・hPa・日付が戻る）は `bk.jp` の中（DESIGN 3.3） |

使っていないもの：章の扉 kiso00.cover の版の記録・注意書き・写真 ch00-photo1（航空会社）・JAL の出典（kiso00 [14]）。章のねらい `summary` は kiso00.cover の「この章で説明できるようになること」を書き直したもの。kiso00.03〜00.06 は `aero`（W13）、kiso00.x1 は `intro.study` と序部の扉（intro の単位）の行き先なので、この章には入れていません。

### 2.3 日米の囲み（DESIGN 3.4・`FL.jur`）

`FL.jur` がこの章の節を囲みの節にしている 4 項目だけを、`bk.jur(id)` で置きました：`basics.units` ← `alt.unit`、`basics.time` ← `time`、`basics.alt` ← `alt.transition`、`basics.rules` ← `ir.need`。囲みの数字は手で書いていません（`check-jur` ① found 4・missing 0、数字の照合 error 0）。付録 A の見本は `basics.alt` に `alt.unit` の行も並べていますが、`FL.jur` の `alt.unit` の囲みの節に `basics.alt` はなく、`flight-lab/test/jur.test.mjs` の ①（ほかの節には置かない）に合わせて置いていません（`alt.unit` は前の節 `basics.units` にある）。ほかの `bk.us`・`bk.jp` は文の HTML で、`data-jur` を持ちません。

### 2.4 用語（DESIGN 3.5・`FL.terms`）

語は `FL.terms` の正式名で書き、章の初出は「正式名（通称、English）」にしました。表に従って直した語：地上走行 → **地上滑走（タキシー、taxi）**、指示高度 → **計器高度（指示高度、indicated altitude）**、速度計 → **対気速度計（速度計、airspeed indicator）**、自動操縦 → **自動操縦装置（オートパイロット、autopilot）**、着陸復行（ゴーアラウンド、go-around）。PF は「飛行経路を管理する操縦士（pilot flying）」（RULINGS `R.pf-term`）。図は、その語の定義より前に出るものでは略号だけを使いました（IAS・GS など）。初出の形の warning は 2 つだけ残ります（5 の 7）。

### 2.5 図（STYLE「図」・DESIGN 5 章の基準 16）

10 枚とも暗い板・`viewBox` の幅 400・`aria-label`＝キャプション・「図：」で始まる。数値の図（単位の縮尺・気圧の目盛り・時刻・風の矢印・地形と AGL・例題の時間）は、本文と同じ値から関数の中で計算して描いています（NIST の係数・例題の値）。Chromium の 390 px で、文字のはみ出し・重なりなし、最小の文字 10.3 px（`check-figures` error・warn 0）。390 px の画像を 1 枚ずつ目で見て、雲の絵と「目的地」の重なり（`basicsCase`）、速度の図の右の点線の枠と文字の重なり（`basicsSpeedChain`）を直しました。

### 2.6 出典（DESIGN 3.2「出典」）

kiso00 には URL がないので、出典を新しく選び、URL を開いて一次資料であることを確かめました（2026-10-27）。今の `R` から 9 件（PHAK・AFH・AFH 第 16 章・14 CFR Part 91・AIM 4-3・AIM 7-1・P/CG・AC 120-71B・AirNav の KSFB）、新しい 9 件を `NEW_R` に：14 CFR 1.1、PHAK 第 8・9・16 章の PDF、AIM 7-2、NIST SP 811 付録 B.9、15 U.S.C. 260a、米国の AIP、e-Gov の航空法。

## 3. 事実の確かめ（一次資料。数字と規則は全部 `basics.claims.json` に札と出典）

| 何を | 一次資料（2026-10-27 に読んだ） |
|---|---|
| 1 ft ＝ 0.3048 m、1 mile ＝ 1.609344 km、1 NM ＝ 1,852 m、mph → km/h 1.609344、1 US gal ＝ 3.785412 L、1 inHg ＝ 3,386.389 Pa、℃ ＝（°F − 32）/1.8、1 lb ＝ 0.45359237 kg（脚注 22） | NIST SP 811 付録 B.9 と脚注 |
| 高度の 5 種類、IAS・CAS・TAS・GS の定義、TAS ≈ CAS ＋ 1,000 ft ごとに 2%、標準の海面 29.92 inHg・15℃（59°F）、寒い日は実際が低い、規正値は観測所の気圧を海面に直した値、速度計は mph・kt・両方 | PHAK 第 8 章 p.8-3〜8-9（FAA の PDF） |
| 24 時間制、UTC（Zulu・経度 0°）、方位は北から時計回り、針路・航跡・偏流角、向かい風・追い風の例 | PHAK 第 16 章 |
| AFM は FAA の承認・機体ごと、POH の表紙の製造番号と登録記号、番号のない手引書は勉強用 | PHAK 第 9 章 |
| 航空用ガソリン 6 lb/US gal | PHAK 第 10 章（本文には入れなかった：住所は `navb.calc`） |
| 機長・フライトレベル・CAS・EAS・TAS・マッハ数の定義 | 14 CFR 1.1（eCFR の API、2026-10-23 の版） |
| 機長の責任と権限、IFR でも見張り、IFR の飛行計画と管制の承認、飛行規程の運用限界 | 14 CFR 91.3・91.113(b)・91.173・91.9（同じ版） |
| METAR の風は真北（7-1-29）、上空の風の予報は真北（7-1-5）、ATIS・ASOS/AWOS の声の放送は磁北（7-1-10）、滑走路の番号と管制塔の風は磁北（4-3-6） | AIM（FAA の HTML） |
| QNH・QNE・ICAO のフライトレベル（1013.2 hPa） | FAA Pilot/Controller Glossary |
| マッハ数は TAS と音速の比、音速は気温で変わる | AFH 第 16 章 |
| PF・PM の定義（6.4） | AC 120-71B |
| 米国の夏時間（3 月の第 2 日曜日〜11 月の第 1 日曜日） | 15 U.S.C. 260a（Cornell LII） |
| 航空法第 73 条（機長は乗り組んで職務を行う者を指揮監督する） | e-Gov 法令検索 API v2（令和 7 年 12 月 1 日施行の版）。**W05 の写しにはない**（5 の 2） |
| 航空法第 2 条第 15〜17 項 | W05 の写し `sources/egov/articles/kokuho/2.json` |
| KSFB の標高 54.8 ft（LAB の教材値 55 ft の参考値） | AirNav（FAA の空港データ 2026-10-01 有効） |
| 例題の計算（48 文） | W10 が検算（√(100²＋20²)＝101.98、arctan 0.2＝11.31°、√(120²＋20²)＝121.66、1009 hPa ＝ 29.80 inHg、時差の換算など） |

推測で埋めていないもの：日本の管制・ATIS で QNH を言う単位（`U.qnh-unit`）と日本に夏時間がないこと（`U.jst-dst`）は本文に書かず、囲み（`FL.jur` の〔要確認〕）だけに任せました。日本の AIP の発行者・閲覧の条件も書いていません。

## 4. 検査の結果

### 4.1 章の検査（`check-chapter.mjs`、下書き 2 つ）

| 検査 | error | warn | pending | 中身 |
|---|---|---|---|---|
| chapters（FLIGHT LAB・TEXTBOOK の章のテストの条件） | 0 | 0 | 0 | 各節 200 字超・用語 3 以上・例と注意・4 択 4 問（理由つき）・https の出典・リンクの行き先 |
| form・data・volume・jurisdiction・chapter-refs・questions・photos・jur・path | 0 | 0 | 0 | 本文 13,290 字。後ろの部への `bk.see` 4 本（どれも「予告」） |
| figures（Chromium 390 px） | 0 | 0 | 0 | 10 枚、最小 10.3 px |
| style | 0 | 2 | 0 | 初出の形：「METAR」（正式名と英語が同じ）・「計器飛行」（「計器飛行方式」の部分の文字列として先に見つかる）。道具の数え方（5 の 7） |
| concepts | 0 | 4 | 3 | 太字の定義の重なり 3（`協定世界時`＝`wx.metar`、`高度計規正値`＝`perf.da`・`wx.atm`、`気圧高度`＝`perf.da`：住所はこの章、相手の章が直す：5 の 6）、`basics.alt` の密度高度へのリンクが「思い出そう」の囲みでない（部品がない：5 の 4）。pending は `navb.wind`・`law.basis` がまだない |
| claims | 0 | 0（台帳なしでは 8） | 0 | `basics.claims.json` を `CLAIMS.json` にした写しの台帳（`COMBINED_LEDGERS`）で 93/93 に札。今の `CLAIMS.json` には行がないので、そのままでは「札なし」の warn 8（節ごと） |
| egov | **1** | 0 | 0 | 「航空法第 73 条」が W05 の写しにない（`kokuho:73`。5 の 2） |
| calc | 0 | 0 | 1 | `CALC.json` がまだない（W01 の見本だけ） |
| provenance | 0 | 0 | 0 | info 1（本全体の数） |

### 4.2 製品のテスト（下書きは製品が読まないので、壊していないことの確かめ）

- TEXTBOOK：`cd textbook && npm test` → **22/22 pass**（fail 0）
- FLIGHT LAB：`cd flight-lab && npm run -s test:fast` → **80/80 pass**（fail 0）
- CADET：この単位はどのファイルも CADET に入れていないので流していません（登録のときは統合役の `testall.sh`）。

## 5. 台帳の行

下書きなので、どの行もまだ閉じていません（パッチ `reports/*.ledger.json` も書いていません：`apply-patches.mjs` は引数がないと全部のパッチを流すので、登録の前に閉じてしまわないように）。**章を登録するコミットで**、統合役が次を `W10` のパッチにしてください。

| 台帳 | 行 | 登録したときの扱い |
|---|---|---|
| PROVENANCE | kiso00.01・00.02・00.07〜00.16（12 節） | `done`、`where`：`basics.*` の節の `from` |
| PROVENANCE | kiso00.q1・q2・q6〜q16・q19・q20（15 問） | `done`、`where`：`written:basics`（q9 と q10 の前半・q7 と q14 は 1 問にまとめた） |
| PROVENANCE | kiso00.q18 | `done`、`where`：`basics.speed` の「考えてみよう」（台帳の `to` は `written:basics` なので `to` も直す） |
| PROVENANCE | ch00-fig1・ch00-fig5・ch00-fig6 | `done`、`where`：`FIG.basicsFlight`・`basicsWind`・`basicsAlt`（暗い板に描き直し） |
| PROVENANCE | ch00-photo5 | 開いたまま（`basics.alt` に `bk.photo('ch00-photo5')` を置いた。写真の取り込みは W22） |
| ERRATA | `K.overview.K2`・`K.overview.K3`・`K.overview.K4` | `fixed`・`verified: true`、`where`：`basics.crew`（3 層）・`basics.units`（inHg の行と 29.92 inHg ≈ 1013.2 hPa）・`basics.speed`（本文に TAS 100 kt） |
| ERRATA | `APP.kiso-cover-airline` | この章は ch00-photo1 も JAL の出典も使わない。序部の扉（intro の単位）ができたら閉じる |
| RULINGS | `R.pic-meaning`（B） | `fixed`、`where`：`basics.crew`（`law.pic` は今の文のままで合う） |
| RULINGS | `R.pf-term`（C） | `basics.crew` は表の語（`crm.pm` の側も合わせてから閉じる：W32） |
| RULINGS | `R.ifr-terms`（C） | `basics.rules` は定義を先に書いた。`intro.cert` の側（intro の単位）と合わせて閉じる |
| RULINGS | `R.pressure-unit`（A・B） | `basics.units` に `alt.unit` の囲みと inHg（B の側）。囲みの節がそろったら W08 が閉じる |
| CONCEPTS | `C.flight-rules-conditions`・`C.speed-kinds`・`C.time`・`C.pic-vs-captain` | 住所の節ができた（呼び戻す `law.basis`・`perf.tol` はあと） |
| CONCEPTS | `C.pressure-altitude` | 住所 `basics.alt` に太字 1 回。`perf.da` の太字が残るので開いたまま |
| CONCEPTS | `C.density-altitude`・`C.wind-triangle` | 呼び戻しの囲み（`bk.recall`）と `navb.wind` を待つ |
| CLAIMS | 93 行 | `drafts/basics.claims.json` の `rows` を `op: "add"` で（`checkedBy` は事実確認役） |
| JCAB-MAP | ppl/cpl.1.1.1.1・1.1.1.2・3.1.1.2・3.1.1.4 | 節の `jcab` に書いた（`confirmed` は W42・W45） |
| UNVERIFIED | `U.qnh-unit`・`U.jst-dst` | 触っていない（本文に書かず、囲みの〔要確認〕のまま） |

## 6. 未解決のこと

1. **航空法第 73 条が e-Gov の写しにない**（`check-egov` error 1）。文は e-Gov の API で読んで確かめたが、写しに入るまで検査は error のまま。
2. **主張の札の「例題」**：仮定の値の計算の文（48）に合う札が 4 つの札の中にないので、`参考値` に `kind: "例題"` を付け、出典に「この本で決めた仮定の値。W10 が検算」と書いた。5 つめの札にするか、このままにするかは W01・W12 が決める。
3. **初出の形の検査の数え方**（W01 と W24）：正式名が英語と同じ語（METAR）と、長い語の中の短い語（「計器飛行方式」の中の「計器飛行」）を初出の誤りと数える。
4. 部品 `bk.dont`・`bk.recall` がないので、付録 A の「ここを混同しない」「思い出そう」を段落で書いた。
5. 序部の章の並び：下書きは `before: 'aero'` で、`check-chapter` の中では `sim` の後ろ（第 3 章）に入る。`book-0.js` に入れると `intro` → `basics` → `english` → `sim` の順になる（DESIGN 3.1・付記 5）。
6. 写真 `ch00-photo5` は W22 が `book-photos-k.js` に入れるまで何も描かない（`bk.photo` が空を返す）。
7. 安全レビュー：〔安全〕の 7 項目に当たる文はないが、`basics.rules` の「VFR は VMC を保つ。雲に入る前に引き返す」は③（VFR で雲に入ったとき）の入口なので、W12 の安全レビューで一緒に見てほしい（本体は R3 の `emg.imc`）。

## 7. ほかの単位にお願いしたいこと（needs from others）

1. **登録する統合役（W10 の登録）**：
   - `drafts/basics.js` の `B.add({...})` を `flight-lab/src/book-0.js` の `addPart` の後に入れ、`NEW_R` の 9 件を `flight-lab/src/book-core.js` の `R` に足して `NEW_R.x` を `R.x` に直す（キー：`cfr1`・`phak8`・`phak9`・`phak16`・`aim72`・`nist811`・`usc260a`・`usAip`・`egovKokuho`）。
   - `drafts/basics-figs.js` の 10 の関数を `flight-lab/src/book-figs.js` の `FIG` に移す（同じ名前のヘルパー `C`・`svg`・`T`・`L`・`A`・`TL`・`BOX`・`NFN` がそこにある。`plane` は `planeSide(x, y, k, { pitch, gear: false })` に置き換えてよい）。
   - 同じコミットで、TEXTBOOK の `COUNTS`・`ORDER`・見出しの章と節の数・`#aero.lift` の番号（`english` と一緒に 3.2 → 5.2）・外部リンクの数（新しい URL 9 件）、`TEST-CONSTANTS.md`。CADET は `basics` を表示する（`DROP_CHAPTERS` に入れない）：CADET の AI 教官の目次の予算（2.5 万字）と README の数を確かめる。
   - 台帳のパッチは 5 の表のとおり。`basics.claims.json` の行を `CLAIMS.json` に足す。
2. **W05・W37（e-Gov の写し）**：`textbook/rewrite/sources/egov/manifest.json` の航空法に `{ "num": "73", "use": ["basics.crew", "law.pic", "jlaw.pic"] }` を足して `fetch.mjs` を流す（`check-egov` の error を消す）。W11 の `kiso-errata.js` の `pic` の項目も第 73 条を引いている。
3. **W04（用語の表 `FL.terms`）**：この章で使い、表にない語：MSL（平均海面）・AGL・協定世界時（UTC）・日本標準時（JST）・東部標準時／東部夏時間（EST／EDT）・フライトレベル（FL、flight level）・マッハ数（Mach number）・法定マイル（SM、statute mile）・ノット（kt）・フィート（ft）・インチ水銀柱（inHg）・副操縦士（first officer）・標準運航手順（SOP）・ログブック（logbook）・デブリーフィング（debriefing）・真北／磁北（true north／magnetic north）・静圧（static pressure）・偏流修正（wind correction）。JCAB の表記を確かめて足してほしい。
4. **W06（`book-core.js` の部品）**：`bk.dont`・`bk.recall`（と `bk.deep`・`bk.drill`・`bk.judge`）ができたら、`basics.alt` の「計器高度・真高度・AGL・密度高度の区別」を `bk.dont` に、`perf.da` への予告の段落を `bk.recall`（1 行）に直す（`CONCEPTS` の `C.density-altitude` の maxLines 1）。
5. **W22（写真）**：`ch00-photo5` を `book-photos-k.js` に入れるとき、キャプションの案「海面からの高さが同じでも、山の上では地面までの高さが大きく減ります。富士山の標高は 3,776 m（約 12,388 ft）です」（基礎教材のキャプションの数字。W22 が元のページで確かめる）、加工は「無加工（縮小のみ）」、クレジットは CC BY-SA 2.0・m-louis（元のページで確かめる）。
6. **W16（`perf.da`）・W17（`wx.metar`・`wx.atm`）**：この章が住所の概念（気圧高度・高度計規正値は `basics.alt`、協定世界時は `basics.time`）の太字の定義を、書き直すときに太字でない形か「思い出そう」に直す（`check-concepts` の `definition-repeated` 3）。
7. **W01（検査の道具）**：5 の 2（例題の札）と 3（初出の形の数え方）を決める。
8. **W18（`navb.wind`）・W19（`law.basis`）・W16（`perf.tol`）**：住所の節を書くとき、`basics.speed`（風の三角形の呼び戻し）・`basics.rules`（`law.basis` からの呼び戻し）・`basics.speed`（`perf.tol` からの呼び戻し）とリンクを結ぶ（決まり 13：行き先ができてから）。
9. **intro の単位（序部の扉）**：kiso00.cover の学習目標は、この章の `summary` にも使ったが、扉（`door:p0`）の行き先は intro の単位。`APP.kiso-cover-airline` もそちらで閉じる。
