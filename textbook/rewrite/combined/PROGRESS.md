# 合本の進み具合（PROGRESS）

設計：[`DESIGN.md`](DESIGN.md)（作業の単位は 7.2、決まりは 6.2）。所有者の判断：[`DECISIONS.md`](DECISIONS.md)（全部の版を作る・基礎教材を書き直して使ってよい・JCAB の用語）。各単位の報告：[`reports/`](reports/)。台帳：[`ledgers/`](ledgers/)（形とパッチの取り込みは `ledgers/README.md`）。テストの決め打ちの数の変更：[`TEST-CONSTANTS.md`](TEST-CONSTANTS.md)。

次のエージェントは、ここと台帳（JSON）から続けます（DESIGN 7.4）。

## 今の状態（2026-10-26）

- **版**：R1（誤りの修正・日米の違い・序部）の途中。P1（W01・W02・W03・W05）を統合してコミットした。本の中身（本文・図・問題）はまだ変えていない（6 部・27 章・154 節）。
- **テスト**（`textbook/rewrite/tools/testall.sh`、P1 の統合のとき）：FLIGHT LAB 56/56・TEXTBOOK 21/21・CADET 259/259（数は [`reports/integrate-P1.md`](reports/integrate-P1.md)）。
- **出力**（`FLIGHT-LAB.html`・`TEXTBOOK.html`・`CADET.html`）：テストを流すと作り直されるが、コミットはしていない。版の最後（W12）に作り直してコミットする（DESIGN 7.3）。

## できたこと

| 単位 | 中身 | 報告 | 確かめ方 |
|---|---|---|---|
| W01 検査の道具 | `tools/` の 19 の検査（報告だけ）と `check-all.mjs`・`check-chapter.mjs`・`selftest.mjs`。基準値（今の本）は報告の 4。統合で基準 4 の検査 `check-egov.mjs`（e-Gov の写しと本文の条番号・数）を足した | [W01](reports/W01.md) | `node textbook/rewrite/combined/tools/selftest.mjs`（29 passed）、`check-all.mjs` |
| W02 製品の土台 | 読み込みの列を 1 つに（`flight-lab/src/modules.mjs`。3 製品とテストと `counts.mjs` はここから作り、読まないものを理由つきで書く）、`MAX_BYTES` 12 MiB、開発用ページに `book-photos.js`、3 製品の「（別の章）なし・行き先のないリンクなし」、CADET の AI 目次 25,000 字、メニューの読んだ節と記録の画面の教科書の行。統合で `figshot.mjs`・`render-ch.mjs`・`photo.py`・TEXTBOOK の写真のテストの手書きの列も共有の列からにした | [W02](reports/W02.md) | 3 製品のテスト |
| W03 台帳と由来の記録 | `ledgers/` の 10 の台帳（ERRATA 154・RULINGS 80・UNVERIFIED 31・CONCEPTS 23・PROVENANCE 1,015・JCAB-MAP 491・ACS-MAP 314・COUNTS 86 と枠 2）、`validate.mjs`・`apply-patches.mjs`、`PROVENANCE.md`（判断 2 の記録）と `flight-lab/README.md` の 2 行。統合でパッチの取り込みを何度流しても同じ結果になるようにした | [W03](reports/W03.md) | `node textbook/rewrite/combined/ledgers/validate.mjs` |
| W05 日本の法令の写し（1） | `textbook/rewrite/sources/egov/`：航空法 25 条・施行規則 37 条（版を固定）、47 項目の日本の欄の照合 `jur-japan.json`、写しの検査 `check.mjs`。統合で TEXTBOOK のテスト `textbook/test/egov.test.mjs` に入れ、DESIGN 3.4 の 3 項目（`lights.ac`・`medical`・`docs`）を直した | [W05](reports/W05.md) | `node textbook/rewrite/sources/egov/check.mjs`（pass 1456）、TEXTBOOK のテスト |

台帳で閉じた行（P1）：ERRATA `APP.max-bytes`・`APP.index-photos`・`APP.menu-read-count`・`APP.record-textbook-row`（W02）・`APP.base64-xxx`（W01）、UNVERIFIED `U.docs-article`・`U.egov-version`（W05）。どれも確かめ役の署名（`checkedBy`）は W12 が付ける（`validate.mjs` の warning 7 件）。新しい行：ERRATA `APP.cadet-comm-practice-ch-sim`（W02 が見つけた。W09）。

## 次（R1 の残り。DESIGN 7.2 の依存の順）

1. 依存がそろっているもの：**W04** 用語の表（W03・判断 3）、**W06** 日米の対照データと部品（W05：`jur-japan.json` の値を使う。DESIGN 3.4 の 3 項目は統合で直した）、**W09** 構成の変更（W02）、**W11** 原本の保存と表示（W03）。
2. その後：**W04b** 作業の決まりの文書（W04）、**W07a〜c** 教科書の誤り（W03・W06）、**W08** 囲みを置く（W06）。
3. その後：**W07d** 課目と教科書の食い違い（W07a）、**W10** 序部（W04・W06・W09）。
4. 最後に **W12** R1 の確かめ（P1 で閉じた 7 行の `checkedBy` を含む）と出力の作り直し。

ファイルを足す単位は、`flight-lab/src/modules.mjs` の `MODULES` に 1 行足し、読ませない製品の `FL_LEAVE_OUT`（`textbook/build.mjs`・`cadet/build.mjs`）か `flight-lab/test/load.mjs` の `NODE_LEAVE_OUT` に理由つきで書き、開発用 `flight-lab/src/index.html` にも `<script src>` を足す（テストが一致を確かめる）。TEXTBOOK に入るファイルなら `textbook/test/build.test.mjs` の `14` を直して `TEST-CONSTANTS.md` に 1 行。台帳はパッチ `reports/<UNIT>.ledger.json` で（統合役が `apply-patches.mjs --write` → `validate.mjs`）。

## 未解決のこと

- **CADET の `comm.practice` の「（（別の章））」**（ERRATA `APP.cadet-comm-practice-ch-sim`）：`book-comm.js` の `（{ch:sim}）` が CADET の外す章を指す。W09（`sim` を移すときの `{ch:}` の点検）か W07a。`cadet/test/content.test.mjs` の `KNOWN_OTHER_CHAPTER` は既知の 1 件として通している（直ったら外す）。
- **確かめ役の署名待ち**：上の 7 行（W12）。
- **図の最小の文字**：`textbook/rewrite/tools/figshot.mjs` は 9.5 px（STYLE の値）、DESIGN 5 章 基準 16 と W01 の `check-figures.mjs` は 10 px。W04b が STYLE を直すときにそろえる。
- **古いドキュメントの数**：`flight-lab/README.md` の「テスト 48 件」（今は Node 54・ブラウザ 2）、`textbook/README.md` の `build.mjs` の説明（`FL_MODULES` は共有の列から）。W49（ERRATA `APP.old-doc-numbers`）。
- **DESIGN の数え方の違い**（W03 の `COUNTS.json` の `match: false`）：1.2 の「基礎教材をもとにした新しい節 67・その他 16」（数え直し 75・8）、10.4 の見出し 74 件と表の 80 行、4.2・8.1 の「描き直す図 約 55」（56）。2.4 の A/B/C の数には数え直しを書き足した（DESIGN の付記 2）。
- **e-Gov にないもの**（〔要確認〕のまま）：告示の空港・「大臣が定める時間」・灯火信号と連絡方法・VFR のコード・ADS-B・実地試験の許容幅、飲酒の通達のその後の改正、電波法（第 39 条・第 40 条）は写していない。W37 と `UNVERIFIED.json`。
- **FLIGHT LAB のブラウザのテスト 15**（基礎教材の記録を localStorage から読む）：前の基準の実行（8382341）で 1 回失敗していた（headless Chromium で file:// の localStorage が消えることがある）。P1 の実行では通った。また出たら記録する。
