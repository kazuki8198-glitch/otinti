# 統合 R2C の報告：W23・W24・W25・W26・W07d2（R2・第 1 部の残り）

統合役（INTEGRATOR）。日付：2026-10-30。ブランチ `claude/busy-shannon-ddxinc`。
設計：DESIGN 7.2 の R2（W23・W24・W25・W26）、3.1・3.2「部の扉」「部のまとめの章 gN」・3.3 第 1 部 第 20 章と付録・3.4・3.5・6.2（15 の決まり）・6.3。所有者の判断：DECISIONS.md（判断 3 の補足・11）。

## 1. 単位ごとの確かめ（DESIGN 7.2 と報告と差分）

| 単位 | DESIGN 7.2 | 報告と差分で確かめたこと | 統合で足したこと |
|---|---|---|---|
| W23 第 1 部の問題 | 章末の 4 択の追加、説明してみよう 約 130、学科テストに後ろから足す（`common`・`us` だけ） | `quiz.js` の 14 分野の後ろに 81 問（145 → 226、`common` 50・`us` 31、日本の法令 0）。今の 145 問は一字も変えていない（テストで確かめる）。章末の確認問題と説明してみようは、R2B の章の単位が各章に書いていた（第 1 部 15 章の `written` は 3〜27 問ずつ、計 241 問）ので、この回の持ち分は学科テストだけで足りる | なし（`TEST-CONSTANTS.md` に新しい決め打ち `BASE` の 1 行） |
| W24 用語 | 序部と第 1 部の本文を用語の表に合わせる | `FL.terms` 302 → 436 語（どの行も根拠と状態つき）、序部 3 章と第 1 部 15 章の名前と初出の形、`wx.shear` の日本の囲み、1013.25 hPa、裁定 3 行。CADET が文字で決めている文とテストの決めた語は変えていない（`aero.stall` の「まず自動操縦を切」は表の `fixed` へ）。W24 が W23 に頼んだ章末の語（`aero` の 4 択の方向舵・`sys` の早期着火・`wx` と `intro` の教官）は、本ではもう直っていた | `terms.test.mjs` の上限 320 → 460（`TEST-CONSTANTS.md`）、STYLE の用語の数・「教官と操縦教員」の書き分け・判断 3 の補足、DESIGN 3.5 の数と付記 10、CLAIMS の前の id の 47 行に note |
| W25 `g1`・扉・JCAB 学科の道 | まとめの章 `g1`、p1 の扉（K01.x1・K02.x1・扉の目標）、「JCAB 学科の道」のページ（第 1 部の分） | 下書き `drafts/g1.js`・`g1-figs.js` の `check-chapter` は error 0（warn 25 は初出の形の道具の数え方）。問いの比率は基準 23 を満たす（問い 5/15、4 択 4/10 が序部） | 登録（下の 2） |
| W26 CADET のつなぎ | `CLASSES` の中を広げる、`BANK_OF`、`deep` を講義で飛ばす、AI 目次の予算、README | 6 回・同じ順で中を DESIGN 6.3 のとおり（`basics` も 0 回目に）、`BANK_OF` に 4 章、ゲームの本の節に `deep`、授業の 2 問は `sec` でその日に話した節から、AI 目次 21,143 字（`tutor.js` は変えていない） | `TEST-CONSTANTS.md` に `CLASS_CHAPTERS.flat()` の 1 行 |
| W07d2 課目と教科書の食い違い（W07d の 2 回目） | （PROGRESS の「次」：W07d が足した open の 30 行） | 26 行を閉じた（fixed 25・not-error 1）、open 2 行に note。判断 11 は R2B で入っていた。自動操縦士の片発のバンク 3° → 2° など | `TEST-CONSTANTS.md` に 1 行。`SYNC.atis-few035` の CADET 側の直し（W07d2 の 7 の 2）は入れなかった（下の 6） |

## 2. 登録したもの（W25 の下書きから。DESIGN 6.2 の決まり 5：完成した章だけ）

- **章 `g1`**：新しいファイル `flight-lab/src/book-gates.js`（下書きの章と、その上の部品。`FL.draftG1` は登録しない）。`before: 'ground'` で第 1 部の最後（第 20 章）。図 `g1Map`・`g1Jur3` は `book-figs.js` の章ごとのブロックへ。
- **読み込みの列**（決まり 7・PROGRESS「ファイルを足す単位は」）：`flight-lab/src/modules.mjs` の `book-5.js` の次に `book-gates.js`、`cadet/build.mjs` の `FL_LEAVE_OUT`（「まとめの章と JCAB の学科の道はゲームの本にない」）、開発用 `flight-lab/src/index.html` の `<script src>`、`textbook/test/build.test.mjs` の `FL_MODULES.length` 18 → 19、`textbook/README.md` の列。
- **第 1 部の扉**：データ `DOOR_P1` を `book-core.js` の固定の `PARTS` の p1 の `door` に、描く部品 `FL.book.doorHtml(partId)` を `book-core.js` に（下書きの案のまま。学科テストの列は `quiz.js` を読む製品だけ：TEXTBOOK は 2 列）。
- **JCAB 学科の道**：`book-gates.js` に `FL.book.JCAB_ROAD`（データ）・`FL.book.jcabRoad()`・`FL.book.jcabRoadHtml()`。
- **画面**（基準 24）：FLIGHT LAB の教科書の目次に、部の名前の下の「扉：この部の目標と読み方」と、最後の「付録 → JCAB 学科の道」（`.bk-page`。節ではない：番号も読んだ印もない）。TEXTBOOK は目次の同じ場所のボタン（`button[data-page]`、URL `#door:p1`・`#jcab`）と、全文（印刷）で扉を部の最初の章の前、付録を最後の章の後に。CSS は両方の `style.css`。
- **まとめの章の章末**：`FL.book.jurTable` はまとめの章（`/^g\d+$/`）では空（`g1.japan` が同じ 25 項目を描く：W25 の 7 の 4）。
- **テスト**：
  - FLIGHT LAB `flight.test.mjs`「textbook: the summary chapter g1, the door of Part 1 and 「JCAB 学科の道」…」（g1 の位置・2 節の範囲・確認問題の `sec` と序部の割合・問い 12〜16 と口述 3〜5・`g1.japan` に門 g1 の全項目・章末の表なし・扉の章と課目と学科テスト・思い出す節 6〜10 が序部・道の節の `jcab`・リンクの行き先・（別の章）なし）。`browser.test.mjs` の教科書のテストに扉と道の操作（目次から開く・リンクで節へ・読んだ印にならない）。
  - `jur.test.mjs`（W25 の 7 の 3）：① の囲みの例外にまとめの章の `gN.japan`、② の全項目、付録の「本の中で」とまとめの章へのリンク（門ごとに 1 本）、`jurTable('g1')` は空。
  - TEXTBOOK `content.test.mjs`：扉と道のページ（目次のボタン・FLIGHT LAB の HTML のまま・全文での位置・`#door:p2` はない）と、行き先のないリンクのテストに 2 ページを足した。`browser.test.mjs` に扉と道の操作。章末の日米の表のテストに「まとめの章を除く」。`marks.test.mjs` の全文の由来の行の数に扉の 1。
  - 決め打ちの数（決まり 11）：TEXTBOOK の `COUNTS`（章 34・節 208・確認問題 213・用語 741・例 115・注意 94・出典 446・図 173・考えてみよう 178）・`ORDER`（`adm` の次に `g1`）・見出し「全 7 部・34 章・208 節」・`FL_MODULES.length` 19。`#aero.lift` は 5.3 のまま。どれも `TEST-CONSTANTS.md` に 1 行ずつ。
- **途中で見つけて直した誤り**：FLIGHT LAB の `pages.js` に扉と道を開く関数を `openPage` の名前で足したら、同じスコープのアプリの `openPage`（画面を開く関数）を上書きして、教科書と基礎教材のページが開かなくなった（3 製品の全体の実行の 1 回目で FLIGHT LAB のブラウザのテスト 3 件が落ちた）。名前を `openBookPage` にして直し、ブラウザのテストを流し直した（3/3）。

## 3. 確かめ（コマンド → 結果）

| コマンド | 結果 |
|---|---|
| `bash textbook/rewrite/tools/testall.sh …/scratchpad/testall-R2C`（最後の木。1 回目は上の 2 の誤りで FLIGHT LAB 89/92、直して流し直した） | **FLIGHT LAB 92/92・TEXTBOOK 36/36・CADET 269/269**（exit 0。R2B の 89・34・268 から、FLIGHT LAB は W23・W07d2・`g1` のテスト 3、TEXTBOOK は扉と道の 2、CADET は W26 の 1 が増えた） |
| 単位のコミットの途中の木（W23・W07d2・W24・W26 の 4 つ。`git archive` で写した木で速いテスト：FLIGHT LAB `test:fast`・TEXTBOOK `npm test`・CADET `test:fast`） | W23：87/87・34/34・247/247、W07d2：88/88・34/34・247/247、W24：88/88・34/34・247/247、W26：88/88・34/34・248/248（どれも fail 0。コミットの前に一時の索引で木を作って確かめ、その木をそのままコミットした） |
| `node textbook/rewrite/combined/tools/check-chapter.mjs g1`（登録した本で） | error 0・warn 25（初出の形 `first-use-form`：日米の囲みの文・習った節のボタンの文字・長い語の中の短い名前。W25 の報告 5 と同じ）・pending 1（台帳 CALC.json がない） |
| `node textbook/rewrite/combined/tools/check-jur.mjs` | error 0。① found 69・missing 0、**② found 25・missing 0**（`g1`）、pending 81（`g2`〜`g5` と第 7 部と未登録の節） |
| `node textbook/rewrite/combined/tools/check-path.mjs` | error 4・warn 1・pending 5：どれも R2B からの既知（後ろの部への `bk.see` の予告なし 3・41 本 > 40）。p1 の扉と `g1` のまとめの問いは error 0。pending は p2〜p6 の扉（W35） |
| `node textbook/rewrite/combined/tools/check-all.mjs --no-browser` | error 218・warn 1,107（R2B と同じ種類：`missing-scope` 72 は第 2〜6 部、`ledgers` の署名待ち、体言止め・常体 12 は第 2 部以降、分量）。`claim-untagged` 71 はどれも `sim` と第 2〜6 部の節（序部と第 1 部は 0）。初出の形 542 は W24 の報告 3 の数え方の問題 |
| `node textbook/rewrite/combined/ledgers/validate.mjs` | ok：error 0・warning 538（署名待ち） |

## 4. 台帳（`apply-patches.mjs --write` → `validate.mjs`）

単位のコミットごとに、W23 → W07d2 → W24 → W25 → integrate-R2C の順に取り込んだ（どの段でも validate ok。最後の台帳は、HEAD の台帳にこの順でパッチを流した結果と一致することを確かめた）。

- W23：COUNTS `book.quiz` の note。
- W07d2：ERRATA の課目の行 26 を閉じた（fixed 25・not-error 1）、`SYNC.pa44-vxse`・`SYNC.atis-few035` に note（open）。単位の形の都合で `by` は W07d（W07d2 の報告の頭）。
- W24：RULINGS `R.windshear-term`・`R.ceiling-term`・`R.aoa-term` を閉じた（fixed）。CLAIMS に用語をそろえた文の 48 行（前の行の札と出典のまま）。
- W25：PROVENANCE `kiso01.x1`・`kiso02.x1`・`kiso03.28`・`kiso04.28`・`kiso05.28` を done、`kiso09.q8`・`kiso09.q18`・`kiso10.q28` の `to` に `g1.review`。CLAIMS に `g1` の 90 行。
- integrate-R2C（`reports/integrate-R2C.ledger.json`）：W24 の前の id の CLAIMS 47 行に note「本にない文」（消すとパッチの流し直しで戻るので残す：R2B と同じ扱い）、COUNTS `book.terms`（436 語）・`origin.written.gates`（`g1` を登録）に note。
- 確かめ役の署名（`checkedBy`）は付けていない（W27）。warning 504 → 538。

## 5. コミット

単位ごとに 1 つ（どのコミットの木も 3 製品のテストが通ることを確かめてから）：

1. W23（`quiz.js`・`flight.test.mjs` の W23 のテスト・台帳・報告）
2. W07d2（課目・採点・Sanford・CADET のチェックリスト・自動操縦士・`flight.test.mjs` の W07d2 のテスト・台帳・報告）
3. W24（用語の表・序部と第 1 部の本文・`terms.test.mjs`・STYLE・台帳・報告）
4. W26（CADET の授業・ゲームの本・テスト・README・報告）
5. W25 と統合（`book-gates.js`・扉・JCAB 学科の道・画面・テスト・台帳・DESIGN の付記 10・PROGRESS・この報告）

出力（`FLIGHT-LAB.html`・`TEXTBOOK.html`・`CADET.html`）は作り直していない（テストが作り直したものは戻した。版の最後に作り直す：DESIGN 7.3）。

## 6. 未解決のこと

- **入れなかった「ほかの単位へ」**：W07d2 の 7 の 2（出発の ATIS と METAR の FEW035 → FEW050 を CADET の `atc.js`・`career.js`・`people.js`・`academy-spec.js`・テストの見本で）。FLIGHT LAB の英語交信 `radio.js` の ATIS も同じ FEW035 で、DESIGN 6.1 が英語交信を W50 まで変えないとしているため、CADET だけ直すと 2 つの製品の ATIS が食い違う。ほかの日の天気にも FEW030・FEW040 があり、巡航高度との関係を一緒に見る必要がある。W50 と CADET の持ち主が同じ変更で直す（ERRATA は open のまま）。W24 の 6 の 3（図の中の古い名前：W21）、6 の 4（`FL.jur` の語：W06）。
- **安全レビュー待ち**（W27・W36）：W07d2 の m2・m4・a7・e2 の文（CADET の教官が読み上げる）、`g1.review` 問 6、`g1.japan` の燃料と飲酒の確かめの問い。
- **所有者の判断**：W23 の 8 の 1（今の 145 問の選択肢の並びを入れ替えてよいか）、W07d2 の 6 の 1（Seminole の Vxse）・6 の 3（m3 の高度の行を参考にするか）。
- **検査の道具**（W01）：初出の形の数え方（W24 の 6 の 2）、学科テストの `meta` の検査（W23 の 8 の 3）、`check-chapter` から呼ぶ `check-path` が扉とまとめの問いを調べない（W25 の 7 の 9）。
- **JCAB 学科の道**：見出しの名前は製品に入れていない（節の並びだけ）、`intro.exams` からページへのリンクの部品がない、JCAB 形式の問題と模擬試験はまだ（W44・W47）。付録の日米対照表のページもまだ（W47）。
- **まとめの問いの由来の行**：`g1.review` の書き直した問い 3 つは画面に由来が出ない（`bk.q` に `from` がない）。
- **CADET**：授業 1 回目が長くなった（31 節）。AI 目次の余裕は R3 で約 460 字（W36）。`EXAMS.written1` に `q_nav` を足すか（W35）。
- **数の見込み**：学科テスト 226 問（DESIGN 8.1 の約 205 より多い）。COUNTS の `built` は W27。
- 署名待ち 538 行と CLAIMS の署名のない行（W27）。

## 7. ほかの単位へ（次の版で）

- **W21**：W24 の報告 6 の 3 の図の中の名前（`book-figs.js` の行番号つき）と、図が本文より前に用語を出す所。
- **W27**：CLAIMS の W24 の 48 行・`g1` の 90 行・W23 の 81 問・W07d2 の 25 行の事実の二人目、上の安全レビュー、`g1` の「本文だけで解けるか」、本にない文の行の扱い、COUNTS の `built`。
- **W35**：p2〜p6 の扉（`PARTS` の `door` に同じ形のデータを置けば `FL.book.doorHtml` が描く）と `g2`〜`g6`（`book-gates.js` に `before:` で）、`SY.GATES`。
- **W47**：付録の日米対照表のページ（`FL.book.jurAppendix` を FLIGHT LAB の目次の「付録」と TEXTBOOK の `pageHtml` に足す形）、JCAB 学科の道の見出しの表。
- **W50**：`SYNC.atis-few035`（`radio.js` と CADET を同じ変更で）。
