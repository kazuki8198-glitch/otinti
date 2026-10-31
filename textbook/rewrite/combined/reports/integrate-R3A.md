# 統合 R3A（R3 の始め：W21・R2V・W10c・Wdeep）— 報告

日付 2026-10-31。統合役。単位：W21（第 1 部の図）・R2V（第 1 部の主張の二人目）・W10c（使う場面の札と試験の項目の注記）・Wdeep（所有者の判断 12：発展に回す）。DESIGN 7.2（R2 の W21・R3）、PROGRESS「次（R3）」の 1・2、DECISIONS の判断 12。

## 1. 各単位がしたことの確かめ

| 単位 | DESIGN・PROGRESS が求めたこと | 報告と差分で確かめたこと | 統合で足した・直したこと |
|---|---|---|---|
| W21 | 第 1 部の図の目視・描き直しの残り、`altimeterHighLow`、ウイングレットと `comm.nordo`、図の中の古い名前、図が本文より先に出す用語、`K.weather.K5`・`K.human.K8`、`T.human.T9`・`hypoxiaAltitudes`、図の nit | `book-figs.js` の差分（36 枚の直し・`wingletVortex`・`lightGunSignals` の場面・`altimeterHighLow` を消す）、`check-figures.mjs` error 0（本全体 174 枚、最小 10.3 px）、`check-chapter.mjs aero`（Chromium：27 枚 error 0。折りたたみの中の新しい図を含む） | `aero.wing` のウイングレットの段落の後ろに `${FIG.wingletVortex()}`（Wdeep の折りたたみ「平面形とアスペクト比の補足」の中）。TEXTBOOK の `COUNTS.figs` 173 → 174 と README。W21 のパッチになかった図 `certLadder` のキャプションの CLAIMS の行（`intro.cert#99f67466` → `#53bfb913`：「教官」→「操縦教員」だけ。R1V の署名を引き継いだ）。外した図 63 行と ERRATA 2 行に二人目の署名 |
| R2V | CLAIMS の第 1 部 2,127 行と序部 4 行、`CALC.json`、PROVENANCE 463 行、基準 15 の呼び戻し、`aero.forces` の参考値、長い文 6・平均超え 6 | パッチ 2,591 行（`apply-patches` が全部当たる）、`book-1/2/comm.js` の差分（`perf.da` の式・`aero.forces` の段落・思い出そう 7・分けた文 6）、`calc-check.mjs` 178 例 error 0、`check-claims.mjs`（序部と第 1 部の札なし 0） | R2V が足した 10 行のうち 8 行に統合役の署名（AIM 7-1-19・4-2-4 の HTML、eCFR versioner の Title 14 の構造・Part 91 の Authority・61.15 を 2026-10-31 に取得して照らし、計算の 3 行は計算し直した）。W21 のキャプションの 5 行に R2V の署名を写した（R2V の報告 6 の 1）。PROVENANCE `ch09-fig9-2` の `to`・`plan` を `where` に合わせた（6 の 2：台帳を直接）。`ledgers/README.md` に `CALC.json` |
| W10c | 使う場面の札 `use` と FAA の注記 `faa`（DESIGN 3.2・基準 24） | `book-core.js`（`secMarks` の後ろの 2 行と前の部品）・`pages.js`・`page.js`・2 つの `style.css`・CADET の `PAGE_MARKS`、テスト 6（FLIGHT LAB 3・TEXTBOOK 2・CADET 1） | `intro.marks` の約束の表に 2 行（使う場面の札・試験の項目。札そのものの言葉「使う場面：」「試験の項目を見る」「出題範囲参考の見出し」は使わない：検索が札を拾わないテスト `use.test.mjs` に当たったので言い方を直した）と `flight.test.mjs` の確かめに 2 語、`use: ['JCAB 工学']` を JCAB の書き方 `JCAB 航空工学`（5 節）、STYLE の「節の形」と「節のデータ」（`use`・`jcab`・`faa` の書き方）、DESIGN の付記 12（札の場所）、`TEST-CONSTANTS.md`、CADET の README（`content` 16 件）、TEXTBOOK の README（`use.test.mjs`） |
| Wdeep | 判断 12：まず読む量を発展に回して上限に近づける（削らない） | 152 か所の折りたたみと `basics.case` の `deep`。道具で、Wdeep の折りたたみを外すと R2V の 17 か所の直し以外は HEAD と同じになることを確かめた（文は消えていない・変わっていない：下の 4）。`check-volume.mjs`・`VOLUME.json` | TEXTBOOK の `COUNTS.folds` 50 → 202、`TEST-CONSTANTS.md`、`tools/README.md` の volume の行、`ledgers/README.md` に `VOLUME.json`、STYLE の「もっと深く」に予算の書き方、DESIGN の付記 12（基準 22 の数え方） |

ファイルを足した単位はない（新しい製品のソースはなく、共有の列 `flight-lab/src/modules.mjs`・`FL_LEAVE_OUT`・`index.html`・`FL_MODULES.length` は変えていない）。新しいテストのファイル `textbook/test/use.test.mjs` は TEXTBOOK の `npm test`（`test/*.test.mjs`）に入る。FLIGHT LAB・CADET の新しいテストは既存のファイルの末尾。

## 2. 統合で直したこと（ほかに）

- **台帳の道具**（`ledgers/src/schema.mjs` の `alreadyAdded`）：add の `checkedBy`・`checkedOn` が null で、あとで確かめ役が署名した行を「取り込み済み」と数える。R2V が `g1` の行に署名したあと、全部のパッチを流すと W25 のパッチのファイル全体が「同じ id の行がある（中身も違う）」で飛ばされていた（ファイル単位で全部か何もしないので、取り込みの記録が流し直せなかった）。直したあと、全部のパッチを流し直して 0 行・飛ばすファイル 0。
- **`intro.marks` の約束の表の言葉**：最初に W10c の案の言い方で入れた 2 行が、TEXTBOOK の `use.test.mjs`「検索の文に札が入らない」に当たった（約束の表が札の言葉そのものを書くため）。テストはゆるめず、約束の表の言い方を変えた（「使う場面の札：…」「札の最後の『試験の項目』のボタン」「出題範囲参考にある見出しの番号」）。
- 決め打ちの数：`COUNTS.figs` 173 → 174（W21）・`COUNTS.folds` 50 → 202（Wdeep）。W10c の W10b のテストの 1 行の直しも `TEST-CONSTANTS.md` に。

## 3. 確かめ（コマンド → 結果）

| コマンド | 結果 |
|---|---|
| `bash textbook/rewrite/tools/testall.sh …/testall-R3A`（最終の木の写し、1 回目） | FLIGHT LAB 95/95・TEXTBOOK 37/38・CADET 270/270。TEXTBOOK の 1 件は `use.test.mjs` の検索の確かめ（統合で足した `intro.marks` の 2 行の言葉：2 で直した） |
| 同（最終の木、2 回目：`…/testall-R3A-final`） | 95/95・38/38・CADET 268/270。CADET のブラウザのテスト 2 件（「fly: … a1」の「R: more throttle」と次の「a flying day」）は、C1 の木の testall と同時に流したときだけ落ちた（C1 の木でも同じ 2 件が同じように落ちた）。同じ写しで `node --test test/browser.test.mjs` を 1 つだけで流し直して 21/21（PROGRESS の未解決に記録） |
| 同（最終の木、3 回目：`…/testall-R3A-final2`、1 つだけで流した） | **FLIGHT LAB 95/95**（R2 の締め 92：W10c +3）・**TEXTBOOK 38/38**（36：W10c +2）・**CADET 270/270**（269：W10c +1）、exit 0 |
| 途中のコミットの木（HEAD に各コミットのファイルを重ねた写しで `testall.sh`。コミットした木と同じことを `git archive` と `diff -r` で確かめた） | W10c の木：95/95・38/38・CADET 268/270（最終の木の 2 回目と同時に流したときのブラウザの 2 件。同じ写しでブラウザのテストを 1 つだけで流し直して 21/21）。R2V の木：95/95・38/38・270/270。W21 の木：95/95・38/38・270/270（どちらも 1 つずつ流した）。Wdeep の木は、テストが読むファイルが最終の木と同じ（違いは PROGRESS・DESIGN・STYLE・報告・台帳の署名だけ：`diff -r` で確かめた）ので、最終の木の結果を使う |
| `cd flight-lab && npm run -s test:fast` | 91/91 |
| `node textbook/rewrite/combined/tools/check-chapter.mjs intro basics english aero sys inst perf wb wx navb law radio1〜radio5 hf adm g1 --no-browser` | 19 章とも error 0（warn 138：初出の形 118・concepts 16・volume 2・questions 1・hedges 1。前から） |
| `check-chapter.mjs aero`・`wx hf adm`（Chromium） | 図 27 枚・31 枚 error 0 |
| `check-figures.mjs` | 174 枚 error 0・最小 10.3 px |
| `check-volume.mjs` | error 1（342,196 > 254,800）・warn 2（p0・p1 の予算）。基準 22 は所有者の判断待ち |
| `calc-check.mjs` | 178 例 error 0・warn 0 |
| `check-claims.mjs` | 序部と第 1 部の札なし 0・本にない行 0（前は `intro.cert#99f67466` の 1：統合で差し替えた） |
| `check-maps.mjs` | JCAB 491・ACS 314、error 0 |
| `check-path.mjs` | error 4（後ろの部への `bk.see` 41／40・予告なし 3：前から。R3 の章の単位） |
| `selftest.mjs` | 31 passed |
| `ledgers/validate.mjs` | ok — error 0・warning 466 → 3（CONCEPTS 3：前から） |
| `ledgers/apply-patches.mjs`（全部、見るだけ） | 0 行（8,447 行が取り込み済み）・飛ばすファイル 0 |

## 4. コミット

コミットは単位ごと（W10c → R2V → W21 → Wdeep → 統合）。R2V と Wdeep は同じ本のファイル（`book-1.js`・`book-2.js`・`book-comm.js`）を変えていたので、Wdeep の折りたたみ（`${bk.deep('題', \`…\`)}`、`<h4>` の見出しが題になった所は `<h4>` に戻す）を道具で外した版を R2V のコミットの本にした。外した版と HEAD の差分は R2V の 17 か所（と W10c・W21 の統合の行）だけで、外した版と最終の版の差分は折りたたみの包みだけであることを差分で確かめた。台帳は R2V → W21 の順にパッチを取り込み、その時々の台帳をそれぞれのコミットに入れた。

1. `d95bb64` W10c（使う場面の札と試験の項目の注記、統合の `intro.marks` の 2 行・`use` の科目名・README・TEST-CONSTANTS）。
2. `124a83d` R2V（R2V の本の直しだけ（Wdeep の折りたたみを外した版）、`CALC.json`、R2V のパッチを取り込んだ台帳、台帳の道具の直し、`ledgers/README.md`）。
3. `921f091` W21（`book-figs.js`、`aero.wing` の `wingletVortex`、`COUNTS.figs`、W21 のパッチを取り込んだ台帳、README）。
4. `085e873` Wdeep（序部と第 1 部の折りたたみ、`check-volume.mjs`・`VOLUME.json`、`COUNTS.folds`、2 つの README）。
5. このコミット：統合（PROGRESS・DESIGN の付記 12・STYLE・この報告・integrate-R3A のパッチと台帳の署名）。

出力（`FLIGHT-LAB.html`・`TEXTBOOK.html`・`CADET.html`）はテストが作り直したものを `git checkout` で戻し、コミットしていない（R3 の最後に作り直す）。

## 5. 台帳の行

- **R2V**（`reports/R2V.ledger.json`）：CLAIMS 2,114 行・PROVENANCE 462 行に `checkedBy: R2V`、前の文 5 行を外し新しい文 10 行を足した。
- **W21**（`reports/W21.ledger.json`）：ERRATA `K.weather.K5`・`K.human.K8` fixed、`T.human.T9` の `where`、PROVENANCE の描き直した図 36 行に目視の署名・外す図 63 行 `dropped`、CLAIMS のキャプション 5 行の差し替え。
- **integrate-R3A**（`reports/integrate-R3A.ledger.json`、82 行）：R2V の新しい行 8 行に統合役の署名、W21 の 5 行に R2V の署名を写す、`intro.cert` の行の差し替え（外す 1・足す 1）、外した図 63 行・ERRATA 2 行に統合役の署名、COUNTS の `book.figures`・`book.text`。
- **台帳を直接**：PROVENANCE `ch09-fig9-2` の `to: ['law.basis']`・`plan: 'redraw'`・`reason: null`（`by`・`checkedBy` はそのまま、note に理由）。
- 署名のない行：CLAIMS 4（`hf.body#9e862111`・`#48ab6419`：裁定 `R.vfr-into-imc`。`aero.forces#30de3690`・`#405c2071`：POH 図 5-33 を統合役は読んでいない）、CONCEPTS 3（前から）。

## 6. 未解決（PROGRESS の「次」と「未解決のこと」に書いた）

1. **基準 22（所有者の判断）**：判断 12 の形で数えても「まず読む」本文は 342,196 字（上限 254,800 字）。序部 29,699／19,800・第 1 部 219,363／124,200。Wdeep の案 ①〜④（報告の 7）と、計算演習を発展に数えるか。決まるまで R3 の章は `VOLUME.json` の予算で書く。
2. **W36 への頼み**：まず読む本文だけの初学者の読み（序部と第 1 部）、「まず読む」本文に命に関わる 7 項目がそろっていることの安全レビュー、CLAIMS の 4 行、R2 の締めで直した〔安全〕の文の 2 回目の安全レビュー。
3. **基準 15 の 11 組**（住所が後ろにある組）の決め方（W01・W03）。
4. **使う場面の札**：第 2〜6 部の節のデータ（R3 の章の単位）、「JCAB 学科の道」の範囲（W47）、本文から付録へのリンクの部品（W47）、ACS の版（W42）。DESIGN 3.2 の札の場所は付記 12 に書いた（設計の持ち主が文を直すなら 3.2）。
5. **検査の道具**：`check-style` が `courseMap` の部の題を初出と数える、`figshot.mjs` が文字の縁取りを重なりと数える（W01・道具の持ち主）。
6. **図**：第 2〜6 部だけが使う図の古い名前 9 枚と nit 2（W33）。本文の名前（V-n 線図など）と本文の初出の英語 18 語（W24・W50）。
