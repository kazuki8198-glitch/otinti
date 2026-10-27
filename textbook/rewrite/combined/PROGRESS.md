# 合本の進み具合（PROGRESS）

設計：[`DESIGN.md`](DESIGN.md)（作業の単位は 7.2、決まりは 6.2）。所有者の判断：[`DECISIONS.md`](DECISIONS.md)（全部の版を作る・基礎教材を書き直して使ってよい・JCAB の用語）。各単位の報告：[`reports/`](reports/)。台帳：[`ledgers/`](ledgers/)（形とパッチの取り込みは `ledgers/README.md`）。テストの決め打ちの数の変更：[`TEST-CONSTANTS.md`](TEST-CONSTANTS.md)。

次のエージェントは、ここと台帳（JSON）から続けます（DESIGN 7.4）。

## 今の状態（2026-10-27）

- **版**：R1（誤りの修正・日米の違い・序部）の途中。P1（W01・W02・W03・W05）と P2（W04・W04b・W06）を統合してコミットした。本の中身（本文・図・問題）はまだ変えていない（6 部・27 章・154 節）。用語の表 `FL.terms`（`book-terms.js`）と日米の対照データ `FL.jur`（`book-jur.js`）と部品 `bk.jur`・`bk.us`・`bk.jp`・`bk.same` は製品に入ったが、囲みはまだどの節にも置いていない（W08）。
- **テスト**（`textbook/rewrite/tools/testall.sh`、P2 の統合のとき）：FLIGHT LAB 76/76・TEXTBOOK 21/21・CADET 265/265（数は [`reports/integrate-P2.md`](reports/integrate-P2.md)。P1 のときは 56・21・259）。
- **出力**（`FLIGHT-LAB.html`・`TEXTBOOK.html`・`CADET.html`）：テストを流すと作り直されるが、コミットはしていない。版の最後（W12）に作り直してコミットする（DESIGN 7.3）。

## できたこと

| 単位 | 中身 | 報告 | 確かめ方 |
|---|---|---|---|
| W01 検査の道具 | `tools/` の 19 の検査（報告だけ）と `check-all.mjs`・`check-chapter.mjs`・`selftest.mjs`。基準値（今の本）は報告の 4。統合で基準 4 の検査 `check-egov.mjs`（e-Gov の写しと本文の条番号・数）を足した | [W01](reports/W01.md) | `node textbook/rewrite/combined/tools/selftest.mjs`（30 passed）、`check-all.mjs` |
| W02 製品の土台 | 読み込みの列を 1 つに（`flight-lab/src/modules.mjs`。3 製品とテストと `counts.mjs` はここから作り、読まないものを理由つきで書く）、`MAX_BYTES` 12 MiB、開発用ページに `book-photos.js`、3 製品の「（別の章）なし・行き先のないリンクなし」、CADET の AI 目次 25,000 字、メニューの読んだ節と記録の画面の教科書の行。統合で `figshot.mjs`・`render-ch.mjs`・`photo.py`・TEXTBOOK の写真のテストの手書きの列も共有の列からにした | [W02](reports/W02.md) | 3 製品のテスト |
| W03 台帳と由来の記録 | `ledgers/` の 10 の台帳（ERRATA 154・RULINGS 80・UNVERIFIED 31・CONCEPTS 23・PROVENANCE 1,015・JCAB-MAP 491・ACS-MAP 314・COUNTS 86 と枠 2）、`validate.mjs`・`apply-patches.mjs`、`PROVENANCE.md`（判断 2 の記録）と `flight-lab/README.md` の 2 行。統合でパッチの取り込みを何度流しても同じ結果になるようにした | [W03](reports/W03.md) | `node textbook/rewrite/combined/ledgers/validate.mjs` |
| W04 用語の表 | `flight-lab/src/book-terms.js` の `FL.terms`：297 語（正式名は JCAB・航空法の表記を一次資料で 1 語ずつ確かめた。通称・英語・ICAO・略号・根拠・状態・テストと CADET が決める語・CADET の通称・必ず区別する語）と引き方（`find`・`firstUse` など）。RULINGS の C の 42 行の語を表の正式名にそろえ、本文をそろえて閉じる単位へ移した。統合で共有の列に登録（FLIGHT LAB・TEXTBOOK が読む。CADET は外す） | [W04](reports/W04.md) | `flight-lab/test/terms.test.mjs`（8） |
| W04b 作業の決まりの文書 | `textbook/rewrite/STYLE.md` を合本の決まりに（CADET が表示しない章・用語・節の形と囲み・節のデータ・日米の書き分け・主張の札・基礎教材の写真）、`PLAN.md` に案内、`NOTES.md` に行き先（行の番号は変えない）。統合で W04・W06 の答え（用語の表の例・FSS・部品の書き方）を STYLE に入れ、`figshot.mjs` を 10 px にした | [W04b](reports/W04b.md) | 読み合わせ（報告の 3） |
| W05 日本の法令の写し（1） | `textbook/rewrite/sources/egov/`：航空法 25 条・施行規則 37 条（版を固定）、47 項目の日本の欄の照合 `jur-japan.json`、写しの検査 `check.mjs`。統合で TEXTBOOK のテスト `textbook/test/egov.test.mjs` に入れ、DESIGN 3.4 の 3 項目（`lights.ac`・`medical`・`docs`）を直した | [W05](reports/W05.md) | `node textbook/rewrite/sources/egov/check.mjs`（pass 1456）、TEXTBOOK のテスト |
| W06 日米の対照データと部品 | `flight-lab/src/book-jur.js` の `FL.jur`：47 項目（米国の欄は eCFR・AIM・ACS・FMH-1 で、日本の欄は W05 の写しで確かめた。確認済み 27・要確認 20）。`book-core.js` に `bk.jur`・`bk.us`・`bk.jp`・`bk.same`・章末の表 `FL.book.jurTable`・付録の表 `FL.book.jurAppendix`（第 7 部へのリンクは行き先があるときだけ）、2 つの `style.css`、CADET は日本の側だけを消して米国の側を「米国の決まり」に（`usSideOnly`）。統合で共有の列に登録（3 製品が読む）、CADET の本の CSS、DESIGN 3.4 の表を直した（付記 3） | [W06](reports/W06.md) | `flight-lab/test/jur.test.mjs`（12）、`cadet/test/jur.test.mjs`（6） |

台帳で閉じた行（P1）：ERRATA `APP.max-bytes`・`APP.index-photos`・`APP.menu-read-count`・`APP.record-textbook-row`（W02）・`APP.base64-xxx`（W01）、UNVERIFIED `U.docs-article`・`U.egov-version`（W05）。どれも確かめ役の署名（`checkedBy`）は W12 が付ける（`validate.mjs` の warning 7 件）。新しい行：ERRATA `APP.cadet-comm-practice-ch-sim`（W02 が見つけた。W09）。

台帳（P2）：閉じた行は ERRATA `APP.style-md`（W04b。署名は W12）。RULINGS の C の 42 行は用語を表の正式名にそろえ、閉じる単位を本文の単位へ移した（W04。`R.aoa-term` は所有者の確認待ちで W04 のまま）。UNVERIFIED に 10 行（W06：`U.jst-dst`・`U.alcohol-notice`・`U.radio-license`・`U.words-japan`・`U.circling-japan`・`U.metar-japan`・`U.charts-japan`・`U.msas`・`U.ws-alert-japan`・`U.vmc-ad-airports`。どれも W37）。COUNTS `jur.unverified` の数え直し 12 → 15、`book.terms` に表の語の数（統合）。署名待ちは 8 行（`validate.mjs` の warning 8）。

## 次（R1 の残り。DESIGN 7.2 の依存の順）

1. 依存がそろっているもの：**W09** 構成の変更（W02）、**W11** 原本の保存と表示（W03）、**W07a〜c** 教科書の誤り（W03・W06）、**W08** 囲みを置く（W06）。
2. その後：**W07d** 課目と教科書の食い違い（W07a）、**W10** 序部（W04・W06・W09）。
3. 最後に **W12** R1 の確かめ（P1・P2 で閉じた 8 行の `checkedBy` を含む）と出力の作り直し。

書く単位は、用語を `FL.terms`（`find`・`firstUse`）から、日米の数字を `FL.jur` から取る（STYLE の「用語」「日米の書き分け」）。W08 は囲みを `bk.jur(...ids)`・`bk.us(id)`・`bk.jp(id)`・`bk.same(id)` で置き（数字を手で書かない）、章末の「この章の日米の違い」（`FL.book.jurTable(ch.id)`。囲みのない章は空文字）を FLIGHT LAB の `pages.js` と TEXTBOOK の `render.js` の章末から呼ぶ（まだどこからも呼んでいない）。付録の対照表 `FL.book.jurAppendix()` のページは W47。

ファイルを足す単位は、`flight-lab/src/modules.mjs` の `MODULES` に 1 行足し、読ませない製品の `FL_LEAVE_OUT`（`textbook/build.mjs`・`cadet/build.mjs`）か `flight-lab/test/load.mjs` の `NODE_LEAVE_OUT` に理由つきで書き、開発用 `flight-lab/src/index.html` にも `<script src>` を足す（テストが一致を確かめる）。TEXTBOOK に入るファイルなら `textbook/test/build.test.mjs` の `FL_MODULES.length`（今 16）を直して `TEST-CONSTANTS.md` に 1 行。新しいテストのファイルは、FLIGHT LAB の `package.json` の `test` と `test:fast`、CADET の `test:fast` にも足す（CADET の `test` は `test/*.test.mjs`）。台帳はパッチ `reports/<UNIT>.ledger.json` で（統合役が `apply-patches.mjs --write` → `validate.mjs`）。

## 未解決のこと

- **CADET の `comm.practice` の「（（別の章））」**（ERRATA `APP.cadet-comm-practice-ch-sim`）：`book-comm.js` の `（{ch:sim}）` が CADET の外す章を指す。W09（`sim` を移すときの `{ch:}` の点検）か W07a。`cadet/test/content.test.mjs` の `KNOWN_OTHER_CHAPTER` は既知の 1 件として通している（直ったら外す）。
- **確かめ役の署名待ち**：上の 8 行（W12）。
- **所有者に確かめること**（`DECISIONS.md` の「3 の補足」）：用語の表の正式名「迎え角」（例は「迎角」）と「キャブレターヒーター」（例は「気化器加熱」）。例の語を選ぶなら `book-terms.js` の `aoa`・`carb-heat` の `formal` と `common` を入れ替え、`terms.test.mjs` の 2 行を直す。あわせて `U.jcab-term-names`（耐空性審査要領での V<sub>MC</sub> と accelerate-go distance の日本語名）。
- **用語の表が引く条で、写していないもの**：施行規則第 97 条・第 145 条・第 166 条の 4（8 か所。表のテストは「写しなし」と数えるだけ）。W37 が写しに足す。
- **各章の初出の検査の範囲**（W04 の報告 5 の 6）：`check-style.mjs` の初出の形の warning 574 は、通称のない語（離陸・失速など）も数える。W24・W50 の前に、どこまでを初出の形にするかを決める（W01 の道具の持ち主と W24）。
- **`FL.jur` の文の語**：囲みの短い文は「管制圏」「空港」など表の通称（短い形）を使う所がある（表の正式名は「航空交通管制圏」「空港等」。施行規則の言い方の引用は「到着予定時刻」のまま）。W08 が囲みを置くとき、W24 が序部と第 1 部をそろえるときに見る。
- **RULINGS `R.tempo-length`**：米国も TEMPO は「1 回 1 時間未満」（AIM 7-1-28）で、裁定の「米国は 1 時間以内」は支えがない（DESIGN の付記 3）。W08 が囲みを置くときに裁定を見直して閉じる。
- **NOTES.md 1 の「アプリ側」の食い違い**（台帳に行がない）：統合役の判断で、今は台帳に足さず NOTES.md を記録として残す。課目の説明と採点・`school.js`・`physics.js`・`sanford-course.js`・CADET のチェックリストと ATIS は W07d、英語交信と学科テストの解説・画面の言葉は W50、操作ガイド・使い方・JIS 配列は W49 が、単位の始めに NOTES.md 1 を読み、直すものを ERRATA にパッチで足す（NOTES.md の 5）。
- **古いドキュメントの数**：ほかのドキュメントの「120 節」「7.1 MB」・`MAX_BYTES` の記述など。W49（ERRATA `APP.old-doc-numbers`）。P2 で直したもの：`flight-lab/README.md` の「テスト 48 件」とテストのファイルの手書きの列（`npm test` と `package.json` を指すようにした）、`textbook/README.md` の読み込みのファイルの列（16 ファイル、共有の列から）。
- **DESIGN の数え方の違い**（W03 の `COUNTS.json` の `match: false`）：1.2 の「基礎教材をもとにした新しい節 67・その他 16」（数え直し 75・8）、10.4 の見出し 74 件と表の 80 行、4.2・8.1 の「描き直す図 約 55」（56）。2.4 の A/B/C の数には数え直しを書き足した（DESIGN の付記 2）。
- **e-Gov にないもの**（〔要確認〕のまま）：告示の空港・「大臣が定める時間」・灯火信号と連絡方法・VFR のコード・ADS-B・実地試験の許容幅、飲酒の通達のその後の改正、電波法（第 39 条・第 40 条）は写していない。W37 と `UNVERIFIED.json`。
- **FLIGHT LAB のブラウザのテスト 15**（基礎教材の記録を localStorage から読む）：前の基準の実行（8382341）で 1 回失敗していた（headless Chromium で file:// の localStorage が消えることがある）。P1・P2 の実行では通った。また出たら記録する。
