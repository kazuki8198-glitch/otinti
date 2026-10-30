# 統合 R2B 報告（第 1 部の章 W13〜W20、2026-10-30）

R2（第 1 部）の章の単位を統合した。章ごとに、書き手（W13〜W20）→ 事実確認（factcheck-*）→ 初学者の読み（reader-*）→ 専門家の読み（expert-*）→ 直し役（revise-*）が下書き（`drafts/`）を仕上げ、統合役がそれを本に登録した。下書きは 9 つ（`aero`・`sys`・`inst`・`perfwb`・`wx`・`navb`・`law`・`radio1-5`・`hfadm`）で、章は 15（`aero`・`sys`・`inst`・`perf`・`wb`・`wx`・`navb`・`law`・`radio1`〜`radio5`・`hf`・`adm`）。本は **7 部・33 章・206 節**（R2A：29 章・171 節）、`#aero.lift` は **5.3**。

単位の報告：[W13](W13.md)・[W14](W14.md)・[W15](W15.md)・[W16](W16.md)・[W17](W17.md)・[W18](W18.md)・[W19-law](W19-law.md)・[W19-radio](W19-radio.md)・[W20](W20.md)、各章の factcheck-*・reader-*・expert-*・revise-*（例：[revise-aero](revise-aero.md)）。

## 1. 単位ごとの確かめ（DESIGN 7.2・報告の主張と差分）

どの単位も下書きだけを書き、製品のファイルには触れていない（DESIGN 6.2 の決まり 5・7.4）。差分は `drafts/` と `reports/` だけだった。統合役は、各章の下書きを今の本に重ねて `check-chapter.mjs`（error 0）と 3 製品の速いテストで確かめてから、章ごとに登録した。

| 章 | 7.2 が求めたこと | 差分と報告で確かめたこと | 統合役が埋めたこと |
|---|---|---|---|
| `aero`（W13） | 基礎教材の第 1 章を中に、16 節。判断 11 の囲みの文 | 下書き 16 節・図 `vn` の描き直しと `dihedralSlip` ほか・主張 216 行（revise-aero） | `R` に 22 件。所有者の判断 11（`syllabus.js` の `stallRecovery`・a7・a8 の `std`・`flight.test.mjs`・`ops.stall` の囲み・`ifr.upset` の題）。`aero.spin` → `inst.gyro` のリンク（`inst` の登録のあと） |
| `sys`（W14）・`inst`（W15） | `sys` の書き直し、新しい章 `inst`、`sys.g1000`・`sys.compass` を `inst` へ | 下書き 2 つ。`inst` は `book-1.js` に `before: 'perf'`。`compassErrors`・`pitotStatic` の描き直し | 移動 2 つを同じコミットで。`sys.eis` → `inst.pfd`、`sys.compass` → `navb.north`（`navb` の登録のあと）。`ground.walk` の `{ch:sys}` → `{ch:inst}`。`sys` の章末の課目から `i3` を外した（`inst` だけに。W14 の 8 の 1）。CADET のテストが読み方の書き方と数える 2 か所の言い回し（「T」（ターボ）・「ソフトキーで」）。課目 k1・k2 の `book: ['inst.pfd']`（W15 の 8 の 1：章のコミットで落としていたので、最後のコミットで入れた。下の 4 の 10。ERRATA `APP.lesson-k1k2` fixed） |
| `perf`・`wb`（W16） | `perf` の書き直し、新しい章 `wb`、`perf.wb`・`perf.wbex` を `wb` へ、計算機 `da`・`wb` | 下書き 1 つ（2 章）。計算機の新しい形と `ARCHER_WB` の値（ランプ重量・手荷物・燃料） | 移動 2 つを同じコミットで。`book-figs.js` の `CALC.da`・`CALC.wb` と `ARCHER_WB` を差し替え（図の `W` は `ARCHER_WB` に）。`nav.xc` の `{ch:perf}・{ch:wb}`。`perf.range` の思い出そうを `aero.power`・`aero.drag` へのリンクに。`perf.fuel` → `adm.risk` |
| `wx`（W17） | 14 節、基礎教材の第 7 章を中に | 下書き 14 節・図 | `wx.shear` の〔安全〕④ の文を、R1 の安全レビューが確かめた言い方に戻した（下書きの言い直しは FLIGHT LAB のテスト ④ に当たった。言い直しは W36 の安全レビューへ）。`wx.brief` → `adm.risk` |
| `navb`（W18） | 新しい章、基礎教材の第 8 章 1〜11 節 | 下書き・図 7 枚（`windTriangle` は同じ名前の図を置き換え、`nav.plan` も使う） | `book-2.js` に `before: 'law'`。CADET のテストがキーの名前と数える 3 か所（「6°W（教材値）」の形）を言い換え、主張の行を新しい ID に移した。`nav.plan` の文が新しい `windTriangle` と同じ順番と足し引きであることを確かめた（revise-navb の 6） |
| `law`（W19） | 書き直し、`law.basis`・`law.pilot` | 下書き 8 節。`NEW_R` 10 件を足した版（revise-law） | `R` に 18 件 |
| `radio1`〜`radio5`（W19） | 書き直し、`comm.runway`、基礎教材の第 9 章の無線の節 | 下書き `drafts/radio.js` | 下書きを `radio1-5.js` に改名（TEXTBOOK のテスト `build.test.mjs` の名前の衝突：テストは変えない）。`book-comm.js` の外側の `CS`・`CSS`・`say`・`fic` を消した（下書きが章の中に持つ） |
| `hf`（W20）・`adm` | `hf` の書き直し、新しい章 `adm` | 下書き 1 つ（2 章）。`adm` は `before: 'ground'` | 図のキャプションの「パイロット基礎教材の図 10-N を描き直した模式図」4 か所を「（模式図）」に（CADET のテストの「由来の言葉」：由来は節の由来の行が言う） |

どの章も、`check-chapter.mjs <章> --no-browser` は **error 0**（warn：`aero` 4・`sys` 5・`inst` 5・`perf` 13・`wb` 0・`wx` 4・`navb` 5・`law` 7・`radio1` 1・`radio2` 6・`radio3` 2・`radio4` 1・`radio5` 4・`hf` 3・`adm` 0。`perf` の 13 は下書きのときと同じ数：初出の形 7・概念 5・問 1）。

## 2. 変えたファイル（統合役が手を入れたもの）

- 本：`flight-lab/src/book-1.js`（`aero`・`sys`・`inst`・`perf`・`wb`）、`book-2.js`（`wx`・`navb`・`law`・`hf`・`adm`）、`book-comm.js`（`radio1`〜`radio5`）。各章は 1 つのブロック `{ … }`。`book-core.js` の `R`（87 件を足して 124 → 211。同じ URL は 1 つ、共有の題は章によらない形）。`book-figs.js`（章ごとの図のブロック 85 枚：同じ名前の古い図 23 枚を置き換え、新しい図 62 枚で 114 → 176。計算機 `da`・`wb`・`ARCHER_WB`）。ほかの章のリンクと `{ch:}`：`book-3.js`（`ops.stall`・`ground.walk`）、`book-4.js`（`nav.xc`）、`book-5.js`（`ifr.upset`）。
- 課目：`flight-lab/src/syllabus.js`（判断 11、k1・k2 の `book`）。
- テスト：`flight-lab/test/flight.test.mjs`（判断 11 の採点）、`flight-lab/test/browser.test.mjs`（節のデータのない節を開く確かめ：`aero.forces` → `ground.walk`。下の 3）、`textbook/test/load.mjs`（`COUNTS`・`ORDER`、新しい `folds`）、`textbook/test/content.test.mjs`・`browser.test.mjs`（5.3、折りたたみの数）、`textbook/test/marks.test.mjs`（`deep` の節の数）、`textbook/src/index.html`（見出し）、`textbook/rewrite/tools/counts.mjs`（`folds`）。どれも `TEST-CONSTANTS.md` に 1 行ずつ。
- 道具：`tools/check-style.mjs`（W10b の部品の見出し）、`ledgers/validate.mjs`（本にある ★ の節）、`ledgers/src/schema.mjs` と `ledgers/README.md`（`#hand-` の ID）。
- 下書き：`drafts/radio.js` → `drafts/radio1-5.js`（中身は頭の注だけ。`radio-figs.js`・`radio.claims.json` の名前の参照）。
- 文書：`DESIGN.md`（3.3 の文言 4 か所・付記 7 の 1 語・付記 9）、`cadet/README.md`（ゲームの本の章と節の数）、`TEST-CONSTANTS.md`、`PROGRESS.md`、この報告。
- 台帳：12 のパッチを取り込んだ（下の 5）。

## 3. 確かめ（検査とテスト）

| コマンド | 結果 |
|---|---|
| `bash textbook/rewrite/tools/testall.sh …/testall-R2B`（1 回め：章のコミットのあと、統合の最後の直しの途中の木の写し） | FLIGHT LAB 88/89・TEXTBOOK 34/34・CADET 268/268。FLIGHT LAB の 1 件はブラウザのテスト「教科書 — the scope badge …」：`aero.forces` を「節のデータがまだない節」として開いていたが、`aero` の書き直しで `scope`・`from` が入った（DESIGN 6.2 のとおり）。確かめる中身は変えず、まだデータのない節 `ground.walk`（第 2 部）に移した（`TEST-CONSTANTS.md`）。このテストは速いテストに入っていないので、章のコミットでは見つからなかった |
| `bash textbook/rewrite/tools/testall.sh …/testall-R2B2`（2 回め：最後の木の写し） | FLIGHT LAB **89/89**（R2A 89：数は同じ。ブラウザのテストの節を移した）・TEXTBOOK **34/34**・CADET **268/268** |
| `cd flight-lab && npm run -s test:fast`（各コミット） | 86/86 |
| `cd textbook && npm test`（各コミット） | 34/34 |
| `cd cadet && npm run -s test:fast`（各コミット） | 247/247 |
| `node textbook/rewrite/combined/ledgers/validate.mjs` | ok — error 0・warning 504（確かめ役の署名待ち：PROVENANCE 458・ERRATA 23・RULINGS 20・CONCEPTS 3） |
| `node textbook/rewrite/combined/ledgers/apply-patches.mjs`（見るだけ） | 0 行（38 ファイル・4,948 行が取り込み済み） |
| `node textbook/rewrite/combined/tools/selftest.mjs` | 31 passed |
| `node textbook/rewrite/combined/tools/check-chapter.mjs <15 章> --no-browser` | 15 章とも error 0（warn は 1 の表の下） |
| `node textbook/rewrite/combined/tools/check-photos.mjs` | 81 枚・error 0・warn 15（置く節が本にある基礎教材の写真：どれも第 2 部以降）・pending 16 |
| `node textbook/rewrite/combined/tools/check-all.mjs --no-browser` | error 218・warn 964・pending 139（R2A：337・1,433・169）。error の内訳：`style` 12（体言止め 7・常体 5：どれも第 2 部以降の前からの文）、`volume` 1（本文 416,000 > 上限 254,800：基準 22）、`jurisdiction` の `missing-scope` 72（第 2〜6 部）、`ledgers` 129（open 84・署名待ち 43・場所なし 2）、`path` 4（`forward-see` の合計 41 > 40 と札なし 3）。第 1 部の 15 章の error は 0 |
| ビルドの大きさ | FLIGHT-LAB.html 10,650,798 バイト（R2A 9,748,145）・CADET.html 10,372,417 バイト。出力のファイルはコミットしない（R2 の最後に作り直す：DESIGN 7.3） |

## 4. コミット

1. `aa58002` 統合の準備：下書き `radio.js` を `radio1-5.js` に、`check-style.mjs` が部品の見出しを文と数えない。
2. `c9bbc55` W13 `aero`（判断 11 を同じコミットで）。
3. `2e6d32b` W14・W15 `sys`・`inst`（移動 2 つ）。
4. `fee83db` W16 `perf`・`wb`（移動 2 つ・計算機）。
5. `58e90d2` W17 `wx`。
6. `52fae6b` W18 `navb`。
7. `d2cb555` W19 `law`。
8. `65b8d45` W19 `radio1`〜`radio5`。
9. `12ea5c6` W20 `hf`・`adm`（第 1 部の 15 章がそろった）。
10. 統合の最後（このコミット）：ブラウザのテストの節（上の 3）、課目 k1・k2 の `book`、`sys` の章末の課目 `i3`、`book-1.js`・`book-2.js` の頭のコメント、`windTriangle` のコメント、DESIGN の付記 9、`cadet/README.md`、CONCEPTS の行、PROGRESS、この報告。

各コミットで 3 製品の速いテスト（86・34・247）を通した。章のコミット（2〜9）は FLIGHT LAB のブラウザのテスト 1 件（上の 3）を落とす木だった（速いテストに入っていないので、最後の全体の実行で見つけた。10 で直した）。出力（FLIGHT-LAB.html・CADET.html）はテストが作り直したものを `git checkout` で戻し、コミットしていない。

## 5. 台帳の行

- 取り込んだパッチ（この順）：W13・W14・W15・W16・W17・W18・W19-law・W19-radio・W20・revise-navb・revise-radio・integrate-R2B（`reports/integrate-R2B.ledger.json`、1,195 行：足す 805）。
- CLAIMS：410 → 2,762 行。書き手のパッチの CLAIMS の行は古いので、直し役が抜き出し直した `drafts/<章>.claims.json` の行を統合のパッチで入れた（revise-aero・revise-inst などの頼み。P5 の `basics` と同じ方法）。今の本にない文になった 347 行は note「本にない文」で残した。署名は付けていない（403 のまま：直し役の行は W27 が確かめて署名する）。
- 閉じた行：ERRATA fixed 99 → 121（`APP.lesson-k1k2` を含む）、RULINGS fixed 36 → 55、PROVENANCE done 34 → 456・dropped 33 → 34、CONCEPTS done 1 → 4。`APP.lesson-k1k2` は最後のコミットで fixed。`K.human.K7`（文体の行）は `verified: true`。
- CONCEPTS：23 → 40 行。統合で 12 行（revise-sys・revise-aero・revise-inst・revise-perfwb・revise-hfadm の頼み：`C.carb-heat`・`C.position-lights-rule`・`C.mixture-best`・`C.hydroplaning`・`C.mag-check`・`C.trim-tabs`・`C.best-speeds`・`C.hpa-ft`・`C.fuel-flow`・`C.task-priority`・`C.checklist-use`・`C.get-there-itis`）、`C.cg-performance`・`C.altimeter-errors` の住所を下書きのとおりに。
- 開いたまま：ERRATA `K.wb-perf.K4`（〔安全〕：kiso08・kiso12 の分と記述問題が残る：W16・W18・W29・W41・W23・W34）。
- ACS-MAP の `inst` の節（revise-inst の 6 の 1）は入れていない（「W42 でもよい」とあり、行を足すと地図の検査の数が変わるので W42 に任せた）。

## 6. 未解決（PROGRESS の「次」と「R2B で増えた未解決」に書いた）

1. **安全レビュー**（W27・W36）：直し役が〔安全〕に触れる文を直した・足した所（`aero`・`sys`・`inst`・`wx`・`law`・`radio*`・`hf`）。`wx.shear` は下書きの言い直しをやめて R1 の文に戻したので、言い直しを採るかもレビューで。
2. **CLAIMS の署名**（W27）：R2B の 2,352 行と、本にない文 347 行の扱い。
3. **分量**（基準 22：416,000 > 254,800）と `missing-scope` 72・`forward-see` 41。
4. **CADET**：授業 `CLASSES` の中・`BANK_OF`・講義で `deep` を飛ばす（W26）。新しい 4 章は質問メニュー・AI 教官の目次・ゲームの本（30 章・193 節）には出る。
5. **用語の仮置き**（W04・W24）と **CONCEPTS** の残り（revise-aero 9・revise-inst 4・revise-law 10 のうち統合で足さなかった行：W03・W27）。
6. **図**：`altimeterHighLow` を使う節がなくなった（W21）、`perf.da` の hPa の思い出そう（W16 の案）、`T.human.T9` の `where` と `hypoxiaAltitudes` のキャプション。
7. **ほか**：`aimPdf` の版（次の AIM Basic は 2026-12-24）、`navb.calc` の手書きの `bk.jp` は `FL.jur` の `fuel.vfr` と一緒に直す、1013.25 と 1013.2 の書き方（revise-wx C7）、`svfr` の囲みの置き場所（W06・W42）、`basics.alt` の注意を短くする（W24）、TEXTBOOK の表のセルの `overflow-wrap`（`textbook/src/` の持ち主）、`ledgers/COUNTS.json` の本の数（W27）、出力の作り直し（R2 の最後）、`validate.mjs` が本を読み込むようになったこと（本のファイルが壊れると台帳の検査も止まる）。

## 7. ほかの単位へのお願い

- **W21**：`altimeterHighLow` を消すか使う。`aero.wing` のウイングレットの写真、`comm.nordo` の写真か図。
- **W24**：各 revise-* の報告の「用語」の語を `FL.terms` の正式名にそろえる。1013.25 と 1013.2。
- **W26**：新しい 4 章を授業に入れる（`CLASSES`・`BANK_OF`・`deep`）。
- **W27**：CLAIMS の署名、安全レビューの手配、`COUNTS.json` の数え直し、分量の基準。
- **W28**：各 revise-* の報告の第 2 部への頼み（`emg.abnormal`・`emg.elec` の POH の言い方、`ops.stall`、`ground.taxi` など）。
- **W42**：ACS-MAP の `inst` の節（revise-inst の 6 の 1 の表）。
