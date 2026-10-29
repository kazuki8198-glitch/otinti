# 統合 R1（W12：事実の二人目・安全レビュー）— 報告

単位：R1 の締めの統合役（DESIGN 7.1「統合」・7.2 の W12・7.3）。日付：2026-10-29。
R1 の確かめの 2 つの役（事実の二人目 `factcheck2-R1`、安全レビュー `safety-R1`）の報告を DESIGN 7.2 と照らし、二人の must と should を直し（どちらの役も本・課目・台帳を変えない役だった）、台帳に署名を入れ、3 製品のテストを流してからコミットし、出力を作り直した。R1 を PROGRESS.md で閉じた。

## 1. 単位ごとの確かめ（DESIGN 7.2 の W12）

| 役 | DESIGN 7.2 の W12 | 報告の中身 | 確かめたこと |
|---|---|---|---|
| factcheck2-R1（事実の二人目） | R1 の文の事実を、書いた人と別の役が一次資料で | `git diff 8382341..HEAD` の本・学科テスト・課目・用語・日米の対照・CADET の文、`FL.jur` の 47 項目、閉じた ERRATA 101 行・RULINGS 35 行。must 1・should 2・nit 4。テスト 80・22・245 | 報告の出典は、統合役が自分で開いて確かめた：NWSI 10-813（2024-10-30）の変更点の一覧と B2.9.4・4.10 の表、14 CFR 61.87(n)(p)（eCFR の写し）、Archer III POH 4.5m の「Full throttle operation with carburetor heat on can cause detonation」、国土交通省の資料 3-10（MSAS）と報道発表（平成 29 年 8 月 25 日）、気象庁 中部航空地方気象台のページ。報告の言うとおりだった |
| safety-R1（安全レビュー） | 直した〔安全〕の項目と a7・a8、緊急・片発・異常姿勢・ウインドシア・雲・周回の節 | 7 項目の判定（①④⑤⑥⑦ 合格、② R1 に節がない、③ 不合格＝must）、should 13・nit 9、署名の提案 | AFH 第 18 章 p.18-17〜18-20、第 9 章 p.9-28、第 5 章 p.5-15〜5-16・5-26、IFH p.7-27〜7-28、AWH 22.7.3.1〜22.7.3.3、AIM 5-4-21 を自分で読んだ（`safety-R1` の作業の場所の PDF と HTML）。報告の言うとおりだった。AWH に「失速警報の範囲で」という言い方はない（報告も書いていたとおり） |

7.2 の W12 のうち、この版で走らなかったもの：序部の初学者の 2 回目の読み（`intro`・`english`）、日本の法令レビュー（`kiso-errata.js` の日本の法令の項目）、W07f が直した図 30 枚の目視の記録、CLAIMS の序部の署名。PROGRESS の「次（R2 の始め）」の 2 に置いた。

## 2. 統合でしたこと（must と should を全部。nit も 1 つを除いて）

### factcheck2-R1

| # | 直した所 | 中身 |
|---|---|---|
| M1 | `flight-lab/src/book-jur.js` `metar.taf` | 米国の欄「PROB30/40（最初の 9 時間は使わない）」→「PROB30（PROB40 は使わない）」、`usSrc` に「NWSI 10-813（2024-10-30）付録 B 2.9.4」、`note` に AIM 7-1-29 との食い違いと NWSI の文。DESIGN 3.4 の行、RULINGS `R.taf-groups` の note も |
| S1 | `book-jur.js` `solo` | 型式の承認を「訓練をした教官が、飛ぶ日の前 90 日以内にログブックに書く。そのあとは 90 日ごとに書き足す」、`usSrc`「14 CFR 61.83・61.87(b)(c)(n)(p)」 |
| S2 | `book-jur.js` `sbas`・`ws.alert` | 日本の欄を W11 が確かめた中身（`kiso-errata.js` の `msas`・`llws-japan`）にそろえ、出典と note。`sbas` は「MSAS で飛べる進入の種類は〔要確認〕」を残した（`FL.jur` の確度は W05 の結果から決まり、確度が要確認の項目は日本の欄に〔要確認〕が要る：`jur.test.mjs`。進入の種類と AIP Japan GEN 3.4 は本当に確かめていない）。だから UNVERIFIED `U.msas` は解かず、note と `says` を直した。`ws.alert` は管制の伝え方だけ〔要確認〕 |
| N1 | `book-2.js` `hf.body` | 「PHAK 第 17 章と AIM 8-1-5 はこれを featureless terrain illusion と呼び、PHAK は black hole approach とも呼ばれると書いています」 |
| N2 | `book-2.js` `wx.taf` | 「定時の TAF は 1 日 4 回、00・06・12・18Z の分が出ます。発表はその 20〜40 分前です（例：00Z の TAF は 23:20〜23:40Z。…4.10）」 |
| N3 | `book-1.js` `sys.carb` | 「（POH 4.5m）」 |
| N4 | `quiz.js` q_wx | 理由「…PROB30 は確率（米国の NWS が使う PROB は PROB30 だけ）」（問の分野・数・並び・正解は同じ） |

### safety-R1

| # | 直した所 | 中身 |
|---|---|---|
| ③ must | `book-2.js` `hf.body` | 段落「それでも VFR で雲に入ってしまったら、緊急事態です。…状況を認める → 計器で操縦を保つ → 助けを得る…旋回はバンク 10° 以下、上昇は姿勢指示器の 1 目盛りまでにし、上昇と旋回を同時にしません（AFH 第 18 章）。近くに山や高い障害物があれば、まずそこから離れます。来た方が確実に晴れていて地形が許すときは、浅いバンクで 180° 旋回して雲から出ます。管制に伝えて、助けを求めます。」と、「ここが大切」の 3 つめを 2 項目に（1 項目 60 字の決まり：「まず計器で翼を水平に保ち、地形から離れる」「雲の中の 180° 旋回は浅く（10° 以下）、来た方が確実に晴れて地形が許すときだけ。管制に助けを求める」）。地形と 180° の条件は裁定 `R.vfr-into-imc` の言い方で、AFH の言葉としては書いていない（AFH は 180° 旋回を決まった手順にしない）。上昇しながらの旋回をしないことは AFH の Combined Maneuvers から足した |
| ② should | `book-4.js` `ifr.np` | 進入復行の段落の後に「周回進入（circling approach）の途中で滑走路の目印を見失ったときは、別です。…まず着陸する滑走路へ向かって上昇旋回し、進入復行のコースに乗るまで旋回を続けます（米国の AIM 5-4-21）」、「ここが大切」に 1 項目 |
| ④ should 1 | `book-2.js` `wx.shear` | 「ただし、失速警報（stall warning）が鳴ったら、警報が止まるまで迎え角（angle of attack）を減らすのが先です（AFH 第 5 章。→ 失速とスピン）」。前半（失速警報の範囲で機首を保つ）は小型機の一次資料がないので書かなかった（報告の案のとおり後半だけ） |
| ④ should 2・6 章 | `flight-lab/test/flight.test.mjs` | 新しいテスト「textbook: the seven safety items (DESIGN 5 criterion 7) are said as the safety review checked them」：① `me.oei` の順と Dead foot・ゆっくり ② `ifr.np` ③ `hf.body` の段落と「ここが大切」 ④ `wx.shear` ⑥ `hf.self` ⑦ `perf.fuel`・`nav.log`・`law.rules` と `FL.jur` `fuel.vfr`、e3・i2・a7 |
| ⑤ should 1 | `syllabus.js` a7・a8、`book-1.js` `aero.stall`・`book-3.js` `ops.stall` の `bk.sim` | a7 の goal「着陸形態での失速を体験し、迎え角を先に減らして確実に回復する」。std に「（目安。ACS の基準ではない）」、2 つの `bk.sim` に「採点の『300 ft 以内』はこの教材の目安で、実地試験（ACS）の基準ではありません。高度を守るより、迎え角を減らすのが先です」。採点は DESIGN 10.5 のとおり変えず、参考の行にするかを所有者の判断 11（`DECISIONS.md`）に上げた |
| ⑤ should 2 | `flight-lab/src/app.js`・`cadet/src/flight/controls.js` | 「スロットル全開（Shift+R）：離陸・ゴーアラウンドで一気に出力を出す（失速の回復では、迎え角を減らしてから必要なだけ）」 |
| ⑤ should 3 | `book-3.js` `ops.stall` | 「使わない 2 つは、最初に自動操縦を切ることと、スピードブレーキを戻すことです。自動操縦のある機体では、回復の最初に必ず自動操縦を切ります（{ch:aero}）」 |
| ⑥ should | `book-2.js` `hf.self` | 考えてみようの答えを「この朝は飛びません。21 時から 6 時までは 9 時間で…9 時間は、その 12 時間に足りません。教官に伝えて、予定を変えます」。報告の案の「日本の基準でも同じ」は書かなかった（共通の節の本文に日本の決まりを書かない：3.4。日本の側は同じ節の囲み `alcohol` にある） |
| ⑦ should | `book-jur.js` `fuel.vfr` | 日本の欄の終わりに「訓練では、学校の規程の量に従う」 |
| 5 の 1 should | `syllabus.js` e3 | brief の 1 つめに「巡航のように速いときは、高度を保って 76 kt まで減速してから滑空の姿勢にする（すぐに機首を下げない）」、say「エンジン停止！ 高度を保って 76 kt まで減速し、それから滑空の姿勢。LAB RWY 36 へ向けて旋回」（AFH 第 9 章 p.9-28）。段階の名前・g・採点は同じ。ERRATA `SYNC.e3-glide-entry` を閉じ、一次資料を第 9 章に |
| 5 の 2 should | `syllabus.js` i2 | brief と 2 つの段階の g：機首上げは「①出力を足す（減速の程度に合わせて。ここでは全開） ②機首を下げる（失速させない） ③翼を水平」、スパイラルは「①パワー アイドル ②少し押して荷重を抜く（約 1 G） ③翼を水平 ④それから機首をゆっくり上げる」（AFH p.5-26・IFH p.7-27、本の `ifr.upset` と同じ）。採点は同じ（押す段階を妨げない）。ERRATA `SYNC.i2-upset` を閉じた |
| 11 | 台帳 | 署名と覚え書き（5） |
| nit | `book-2.js` `law.rules` | 「ここが大切」を「米国の VFR の燃料（91.151）は、最初の着陸予定地まで＋昼 30 分・夜 45 分」 |
| nit | `cadet/src/content/academy-spec.js` | IMSAFE の掲示の E を「感情（Emotion）」に（AIM 8-1-1・本の `hf.self`）、コーヒーの掲示から「（IMSAFE の E）」を外して「水も一緒に。」 |
| nit | 台帳 `SYNC.stall-recovery` | `places` の `ops.slow` → `ops.stall` |

直さなかった nit（理由。PROGRESS の未解決）：CADET の航法ログの問い・黒板の「予備 30 分」の国の名前（CADET は米国の決まりの世界で誤りではない）、CADET の m2・m4 のバンク角の言い方と m4 の手順の形（W07d の 2 回目）、q_ifr の機首上げの問の理由（`ifr.upset` が説明済みで矛盾ではない）、`wx.shear` の「ウインドシア」と囲みの「ウィンドシャー」（W24）、CADET の a7・a8 のホワイトボードの図（DESIGN 6.1 の決まり）。

### 統合で見つけて直したもの

- 新しい文の初出の形（`check-style`）：`wx.shear` に「失速警報（stall warning）」「迎え角（angle of attack）」、`hf.body` に「姿勢指示器（attitude indicator）」。`wx` の章の「失速」（「失速警報」の中）と「スピン」（リンクの文字「失速とスピン」）の warn 2 は、道具の数え方（P5 の未解決の「長い語の中の短い正式名」「ボタンの文字」）。
- 「ここが大切」の 1 項目 60 字（`check-form` の `key-item-long`）：報告の案は 1 項目で 128 字だったので、`hf.body` は 2 項目に、`ifr.np` は 1 項目足した。
- 主張の台帳：統合役が書いた文のうち、数字・規則を含む 14 文を CLAIMS に札つきで足した（署名は二人目を待つ）。

## 3. テスト（コマンドと結果）

| コマンド | 結果 |
|---|---|
| `bash textbook/rewrite/tools/testall.sh …/scratchpad/testall-R1A`（コミット 1 の木：factcheck2 の直しだけ） | FLIGHT LAB **82/82**・TEXTBOOK **22/22**・CADET **266/266** |
| `bash textbook/rewrite/tools/testall.sh …/scratchpad/testall-R1`（ソースの全部の木） | FLIGHT LAB **83/83**・TEXTBOOK **22/22**・CADET **266/266**（コミット 2 の木との違いは、コミット 3 の台帳と文書だけ。コミット 2 の木では速いテスト 81/81・22/22・245/245：台帳と DESIGN を読むテストを含む） |
| 前の基準（8382341、`testall-base`）・P1（`testall-P1b`）・P5（`testall-P5`） | 51/52・18/18・256/256（ブラウザのテスト 15 は P1 から通っている）、56/56・21/21・259/259、82/82・22/22・266/266 |
| 速いテスト（直しの途中に何度も）：FLIGHT LAB `npm run -s test:fast`・TEXTBOOK `npm test`・CADET `npm run -s test:fast` | 81/81・22/22・245/245 |
| `node textbook/rewrite/combined/ledgers/apply-patches.mjs ../reports/W12.ledger.json --write` → `validate.mjs` | 169 行 → ok（0 error、warning 172 → 38）。流し直すと 0 行（943 行はもう台帳にある） |
| `node textbook/rewrite/combined/tools/check-all.mjs --no-browser`（報告だけ） | error の合計 475（直す前と同じ）・warn 1,439（同じ）。直す前と比べて：`key-item-long` は同じ 2（報告の案のままだと 4）、`first-use-form` +2（上の 2）、主張の抜き出し 1,649 → 1,658 文・札つき 225 → 239・札なし 1,424 → 1,419（統合役の 14 文は CLAIMS に札つきで入れた。札なしで残る新しい文は、`FL.jur` から描く囲みの文：囲みの文は R1 の CLAIMS の対象の外）、`us-rule-outside-us` 同じ（`hf.body` の文を直したが「AIM 8-1-5」が残る）、`avg-length` は `ops.stall` 50.9 → 47.7・`ifr.np` 51.5 → 50.7・`wx.taf` は 40 字以下に |
| `node textbook/rewrite/combined/tools/check-ledgers.mjs` | ERRATA 閉じた 103（署名待ち 2：統合役が閉じた `SYNC.e3-glide-entry`・`SYNC.i2-upset`）・RULINGS 閉じた 35（全部署名つき） |
| 出力のコミットのあと：3 製品のテスト（作り直した出力の木） | （コミット 4 のあとに書く） |

増えたテスト：FLIGHT LAB 1（上の 7 項目のテスト）。決め打ちの数は変えていない（`TEST-CONSTANTS.md` に 1 行）。

## 4. コミット

1. `4f2389d` factcheck2-R1 の直し：`book-jur.js`（`metar.taf`・`solo`・`sbas`・`ws.alert`）・`book-1.js`（N3）・`book-2.js`（N1・N2）・`quiz.js`（N4）・DESIGN 3.4 の 4 行・factcheck2-R1 の報告。82/82・22/22・266/266（この木で）
2. `a8819ec` safety-R1 の直し：`book-1.js`〜`book-4.js`・`book-jur.js`（`fuel.vfr`）・`syllabus.js`・`app.js`・CADET の `controls.js`・`academy-spec.js`・7 項目のテスト・`DECISIONS.md`（判断 11）・`TEST-CONSTANTS.md`・safety-R1 の報告。83/83・22/22・266/266
3. 統合（R1 を閉じる）：台帳（`W12.ledger.json` を当てた ERRATA・RULINGS・UNVERIFIED・CLAIMS・COUNTS）、DESIGN の付記 7、PROGRESS.md（R1 の締め）、この報告
4. 出力の作り直し（3 つの HTML）
5. README の raw.githack のリンク（コミット 4）と、PROGRESS・この報告のコミットの番号

コミット 1 は、テストを流した木の写し（`…/scratchpad/r1Atree`）から `git hash-object -w` と `git update-index --cacheinfo` で index に入れた（作業の木はコミット 2 の中身まで進めていたため。流した木とコミットが同じ）。

## 5. 台帳の行（パッチ `reports/W12.ledger.json`、169 行）

- **署名**（`checkedBy: W12`）：R1 で閉じた ERRATA 101 行（教科書 78・基礎教材 7・アプリ 10・課目 6）と RULINGS 35 行。note は「事実の二人目（factcheck2-R1 の 6）が where の場所の今の文を一次資料と照らした」。〔安全〕の行（ERRATA `T.aero.T-3`・`T.instruments.E-T2`・`T.weather.T2`・`SYNC.stall-recovery`、RULINGS `R.cross-check`・`R.alcohol`）と `R.stall-recovery`・`R.microburst`・`R.vfr-fuel-law` は安全レビュー（safety-R1 の 8）も。`T.human.T1`（N1）と `R.taf-groups`（M1）は、報告の案のとおり直してから署名した（同じ note に書いた）。
- **閉じた**（`by: W12`、二人目は R3 の W36）：ERRATA `SYNC.e3-glide-entry`（一次資料を AFH 第 9 章 p.9-28 に）・`SYNC.i2-upset`。
- **note だけ**：RULINGS `R.vfr-into-imc`・`R.circling-lost-visual`（R1 のつなぎ。本番の節は W28・W30）、UNVERIFIED `U.msas`・`U.ws-alert-japan`（`says` を `FL.jur` に合わせた。残るものは開いたまま）。
- **足した**：CLAIMS 14 行（統合役の文。札つき・署名待ち）。
- **COUNTS の `built`**（R1 の作った本）：部 7・章 29・節 167、序部 4 章・22 節（今 9・新 13）、`FL.jur` 47 項目・〔安全〕2・〔要確認〕を含む 23、TEXTBOOK の読み込み 17、`#aero.lift` 5.2、課目 39・book 55 本、出力の大きさ。
- 署名を付けなかったもの：基礎教材の側が開いている〔安全〕の行（`K.wb-perf.K4`・`K.navigation.K1`・`K.human.K5`・`K.ifr.K-2`・`K.multi.K-1`、`R.failed-engine-id`・`R.fuel-reserve`）。安全レビューは原本の重ね表示の 9 項目を合格としたが、行を閉じるのは合本の文を書く単位なので、開いた行に `checkedBy` を先に書かなかった（あとの単位の文を確かめないまま署名がそろって見えるため）。この報告と safety-R1 の 8 が記録。

## 6. 未解決のこと

1. **R1 で満たさない基準**（PROGRESS の「R1 の締め」）：8（`scope` と国の言葉）・21（文体の error 22）は第 1〜6 部の書き直し（R2・R3）。24 は描く部品（`secMarks`・`written`）。3・5・6・7・16〜18 は一部。
2. **統合役が直した〔安全〕の文の 2 回目の安全レビュー**：`hf.body`（③）・`ifr.np`（②）・`wx.shear`（④）・課目 e3・i2・a7。安全レビューの案のとおりに書いたが、書いた文を独立の役がまだ読んでいない。
3. **所有者の判断 11**：失速の課目の採点 300 ft を参考の行にするか。
4. **`sbas` と `ws.alert` の〔要確認〕**：MSAS で使える進入の種類・AIP Japan GEN 3.4、管制のウィンドシャーの伝え方（W37）。
5. **AIM 7-1-29 と NWSI 10-813**：AIM が直ったら `FL.jur` `metar.taf` の note の 1 文を消す。
6. **e3 の採点の幅**：100 kt から高度を保って 76 kt まで減速すると、採点（8 秒後から 76 ±8 kt）に入るまでの時間がぎりぎりかもしれない（揚抗比からの見積もりで毎秒 2 kt 前後。確かめていない）。W07d の 2 回目か W36 が、操縦して確かめる。
7. **W12 の役のうち走らなかったもの**（PROGRESS の「次」の 2）：CLAIMS の 320 行の署名、序部の初学者の 2 回目、日本の法令レビュー、W07f の図の目視の記録、PROVENANCE 32 行などの署名。

## 7. ほかの単位への依頼

- **R2 の始め（描く部品の単位 W10b）**：`FL.book.secMarks(sec)` と章末の `written`（PROGRESS の「次」の 1）。
- **事実確認役（R2 の始め）**：CLAIMS の署名のない 320 行（序部 306・W12 の 14）。
- **安全レビュー（W36、できれば R2 の始め）**：上の 6 の 2 の文。`SYNC.e3-glide-entry`・`SYNC.i2-upset` の `checkedBy`。
- **日本の法令レビュー**：`kiso-errata.js` の日本の法令の項目と全部の日本の囲み（DESIGN 7.1）。
- **W20**：`hf` の章の出典「（AIM 8-1-x）」を `bk.src` と章の出典にまとめる（`check-jurisdiction` の error）。
- **W37**：`U.msas`（進入の種類・AIP GEN 3.4）、`U.ws-alert-japan`（管制の伝え方）。
- **W07d の 2 回目・CADET の持ち主**：CADET の m2・m4 の言い方（safety-R1 の 5 の 4）、e3 の採点の幅を操縦して確かめる。
