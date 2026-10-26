# 統合 P1（W01・W02・W03・W05）— 報告

単位：R1 の P1 の統合役（DESIGN 7.1「統合」・7.3）。4 つの単位の報告と差分を DESIGN 7.2 と照らし、小さな穴を埋め、P1 に属する「ほかの単位への依頼」を当て、台帳のパッチを取り込み、3 製品のテストを流してから、単位ごとにコミットした。`flight-lab/kiso/` には触っていない（`validate.mjs`・`check-provenance.mjs` で git の差分なし・264 ファイルの sha256 一致）。push はしていない。

## 1. 単位ごとの確かめ（DESIGN 7.2 と報告の主張）

| 単位 | DESIGN 7.2 の「できたことの確かめ方」 | 結果 |
|---|---|---|
| W01 | 今の本で全部の検査が動き、数を報告する | `selftest.mjs` 28 → 29 passed（統合で 1 つ足した）、`check-all.mjs` 18 の検査が動き、報告の基準値と同じ数（error 471 → 統合後 704 は台帳ができて ledgers の open 233 が数えられたため。ほかは同じ） |
| W02 | 3 製品の全テストが通る（中身は変えない） | 差分を読んだ：列は `flight-lab/src/modules.mjs` の 1 つ、3 製品・テスト・`counts.mjs` はそこから作り、読まないものを理由つきで書く。`MAX_BYTES` 12 MiB とテスト、開発用ページの `book-photos.js`、「（別の章）なし」のテスト 3 つ、AI 目次 25,000 字、メニューと記録の画面。本の中身の差分なし。テストは下の 3 |
| W03 | 報告の全項目が台帳にある。設計の数が目次と一致 | `validate.mjs` ok（0 error）。ERRATA 153（79・53・16・5）・RULINGS 80・UNVERIFIED 31・PROVENANCE 393/376/161/85・JCAB-MAP 未対応 0・ACS-MAP 未対応 0。RULINGS の分類の数え直し（主 A17・B22・C41）を自分でも数えて一致 |
| W05 | 写しのテストが通る | `check.mjs` pass 1456 / fail 0。DESIGN 3.4 を直す 3 項目（`lights.ac`・`medical`・`docs`）を写しの条文（施行規則第 154 条・第 61 条の 2・第 144 条・第 144 条の 2）で読み直して一致 |

## 2. 統合でしたこと（埋めた穴・当てた依頼）

- **W05 → 統合**：`textbook/test/egov.test.mjs` を足した（写しの検査 `runChecks()` を TEXTBOOK の `npm test` に。W05 の案のまま）。TEXTBOOK のテストは 20 → 21。
- **W05 → 統合（DESIGN.md）**：3.4 の日本の欄を 3 つ直した（`lights.ac` に衝突防止灯、`medical` は施行規則第 61 条の 2、`docs` は第 144 条・第 144 条の 2 の両方で〔要確認〕を外し、「推測で埋めないもの」からも外した）。末尾に「付記 2」で記録。
- **W03 → 統合（DESIGN.md）**：3.5 の「W51」を「W50」に、2.4 の A/B/C の数に 10.4 の表の数え直しを書き足した。1.2 の 67・16 と「約 55」は数え方の違いとして COUNTS に残し、変えていない。
- **W05 → W01 の道具**：基準 4 の検査 `tools/check-egov.mjs` を足した（写しの検査を流す・本文と章末の航空法・施行規則の条番号が写しにある・同じ文の数が引いた条にある・ほかの法令は info）。`check-all`・`check-chapter` の列と `tools/README.md` に登録、`selftest.mjs` に 1 つ。今の本は「第 n 条」0 なので 0 件。
- **W02 → W01 の道具**：`tools/lib/load.mjs` の予備の列（FALLBACK。未来のファイル名を含む 2 つめの列）を消し、共有の列だけにした（6.2 の決まり 7）。
- **W02 → 統合（持ち主のない道具）**：`textbook/rewrite/tools/figshot.mjs`・`render-ch.mjs` を TEXTBOOK の `FL_MODULES` から、`photo.py` の章のファイルを `modules.mjs` の `MODULES` から読むようにした。`textbook/test/content.test.mjs` の写しのテストの章のファイルの手書きの列も `FL_MODULES` から（今は同じ 6 ファイル。`book-0.js` などが入れば自動で入る。テストを弱めていない）。
- **W03 の道具**：`apply-patches.mjs` は取り込んだあとのパッチを `reports/` に残す決まりなのに、流し直すと `note` が 2 回足され、`add` の行のファイルは `validate.mjs` が「同じ id の行がある」で失敗していた。パッチのとおりの行がもうあるときはそのままにする（何度流しても同じ）ように直した（`src/schema.mjs` の `alreadyAdded`・`alreadySet`、README の 5 に 1 文）。
- **台帳のパッチ**（P1 の単位は台帳ができる前か、台帳を書かない約束だったので、報告から統合役が書いた。形は `ledgers/README.md` の 5）：
  - `reports/W02.ledger.json`：ERRATA `APP.max-bytes`・`APP.index-photos`・`APP.menu-read-count`・`APP.record-textbook-row` を fixed（場所・`verified: true`）、新しい行 `APP.cadet-comm-practice-ch-sim`（open・W09）。
  - `reports/W01.ledger.json`：ERRATA `APP.base64-xxx` を fixed。
  - `reports/W05.ledger.json`：UNVERIFIED `U.docs-article`・`U.egov-version` を resolved（値・e-Gov の URL・確認日 2026-10-27（日本時間））、`U.nordo-time`・`U.oxygen-japan`・`U.adsb-japan`・`U.light-japan`・`U.vfr-squawk`・`U.check-standards` に W05 の分かったことを `note` で。
  - `reports/integrate-P1.ledger.json`：COUNTS `jur.unverified` の数え直し 13 → 12（DESIGN の docs の〔要確認〕を外したため）。
  - 閉じた 7 行の確かめ役の署名（`checkedBy`）は W12（`validate.mjs` の warning 7 件として残る）。
- **共有の列に登録する新しいファイル**：P1 で `flight-lab/src/` に足したスクリプトはない（`modules.mjs` は列そのもので、ページは読まない）。決まり 7 の場所（3 製品の build・FLIGHT LAB のテストの load・TEXTBOOK と CADET の列とテスト・`counts.mjs`・開発用ページ）は W02 がそろえた。
- `TEST-CONSTANTS.md` を作った（P1 は決め打ちの数を変えていない、の 1 行）。`PROGRESS.md` を作った。

## 3. テスト（コマンドと結果）

| コマンド | 結果 |
|---|---|
| `bash textbook/rewrite/tools/testall.sh …/scratchpad/testall-P1`（最終の木の写し） | FLIGHT LAB 56/56・TEXTBOOK 21/21・CADET （下に記入） |
| 前の基準（8382341、`…/scratchpad/testall-base`） | FLIGHT LAB 51/52（ブラウザのテスト 15：基礎教材の記録を localStorage から読むところ。headless Chromium の file:// の localStorage が消えるときがある）・TEXTBOOK 18/18・CADET 256/256 |
| `node textbook/rewrite/combined/tools/selftest.mjs` | 29 passed |
| `node textbook/rewrite/combined/tools/check-all.mjs` | 19 の検査が動く（終了コード 0、報告だけ） |
| `node textbook/rewrite/combined/ledgers/validate.mjs` | ok — 0 error、7 warning（署名待ち） |
| `node textbook/rewrite/combined/ledgers/apply-patches.mjs`（流し直し） | 0 行（15 行はもう台帳にある） |
| `node textbook/rewrite/sources/egov/check.mjs` | pass 1456 / fail 0 / warn 0 |
| `python3 textbook/rewrite/tools/photo.py list`・`node textbook/rewrite/tools/render-ch.mjs aero --text`・`node textbook/rewrite/tools/figshot.mjs <dir> aero.lift` | 動く（共有の列から読んだ本で、前と同じ出力） |

増えたテスト：FLIGHT LAB 52 → 56（W02 の 4）、TEXTBOOK 18 → 21（W02 の 2・統合の egov 1）、CADET 256 → 259（W02 の 3）。

## 4. コミット（単位ごと。どれも上のテストの後）

1. W03 の台帳（台帳は取り込み前の形）
2. W02 の製品の土台（と統合の道具の列の直し、W02 のパッチを当てた ERRATA）
3. W05 の e-Gov の写しと TEXTBOOK のテスト（W05 のパッチを当てた UNVERIFIED）
4. W01 の検査の道具（と `check-egov.mjs`、W01 のパッチを当てた ERRATA）
5. 統合：DESIGN.md の直し・COUNTS・PROGRESS・TEST-CONSTANTS・この報告

台帳の途中の形（2 の後の ERRATA など）は、取り込み前の台帳の写しにパッチを順に当てて作り、その形をコミットした（最後の形は作業の木と同じ）。出力（`FLIGHT-LAB.html`・`CADET.html`）はテストで書き換わっているが、コミットしていない（版の最後に W12 が作り直す）。

## 5. 台帳の行（この統合で触った行）

ERRATA：`APP.max-bytes`・`APP.index-photos`・`APP.menu-read-count`・`APP.record-textbook-row`・`APP.base64-xxx`（fixed、署名待ち）、`APP.cadet-comm-practice-ch-sim`（新・open）。UNVERIFIED：`U.docs-article`・`U.egov-version`（resolved、署名待ち）、`U.nordo-time`・`U.oxygen-japan`・`U.adsb-japan`・`U.light-japan`・`U.vfr-squawk`・`U.check-standards`（note）。COUNTS：`jur.unverified`（recount 12）。

## 6. 未解決のこと

`PROGRESS.md` の「未解決のこと」と同じ：CADET の `comm.practice` の「（別の章）」（W09・W07a）、7 行の署名（W12）、`figshot.mjs` の 9.5 px と基準 16 の 10 px（W04b）、古いドキュメントの数（W49）、DESIGN の数え方の違い（67・16、74・80、約 55）、e-Gov にない〔要確認〕（W37）、前の基準で 1 回落ちた FLIGHT LAB のブラウザのテスト 15。

`testall.sh` に W01 の `selftest.mjs`・W03 の `validate.mjs` は入れていない：`testall.sh` は `.git` のない写しで流すので `validate.mjs` の原本の git の検査が warning になり、道具の検査は統合役が作業の木で流す（この報告の 3）。e-Gov の写しの検査は TEXTBOOK のテストに入った。

## 7. ほかの単位への依頼

- **W06**：日本の値は `textbook/rewrite/sources/egov/jur-japan.json` から（DESIGN 3.4 の 3 項目は直した）。囲みの印は `data-jur`・`jur-us`・`jur-jp`（W01 の `tools/README.md`）。`book-jur.js` を足すときは `modules.mjs`・`FL_LEAVE_OUT`・開発用ページ・`textbook/test/build.test.mjs` の 14 と `TEST-CONSTANTS.md`。
- **W08・W10（日本の囲みを書く単位）**：条は「航空法施行規則第 178 条」の形で。`node textbook/rewrite/combined/tools/check-egov.mjs` が条の写しと数を確かめる。
- **W09**：ERRATA `APP.cadet-comm-practice-ch-sim`（`book-comm.js` の `（{ch:sim}）`）と、W01 の chapter-refs の 18 か所。
- **W12**：P1 で閉じた 7 行の `checkedBy`。出力の作り直し。
