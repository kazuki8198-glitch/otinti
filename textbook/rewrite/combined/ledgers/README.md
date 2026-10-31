# 台帳（合本の記録）

合本（DESIGN.md）を作る間、**直すもの・確かめるもの・行き先**を 1 件 1 行で持つ JSON のファイルです。作業の単位（DESIGN 7.2 の W01〜W51）は、ここに書かれた行を自分の仕事として受け取り、終わったら**パッチ**（下の 5）で閉じます。台帳を直接書き換えるのは統合役だけです。

作成：W03（2026-10-26）。形の検査は `validate.mjs`、パッチの取り込みは `apply-patches.mjs`。W01 の検査の道具（`../tools/check-ledgers.mjs` など）も同じファイルを読みます。

## 1. 一覧

| ファイル | 中身 | 行の数（今） | DESIGN | 閉じる単位 |
|---|---|---|---|---|
| `ERRATA.json` | 既知の誤り：教科書 79（10.1）・基礎教材 53（10.2）・アプリとデータ 16（10.3。1 行を 2 つに分けた）・課目とゲームとの食い違い 5（10.5） | 153 | 5 章の基準 1・7 | 行の `unit`（W07a〜d・W10・W11・R2〜R4 の章の単位など） |
| `RULINGS.json` | 2 冊の食い違いと裁定（10.4。見出しは 74 件、表は 80 行）。A/B/C と扱い | 80 | 基準 2 | `unit`（A は W08、B は直す側、C は W04 と本文の単位） |
| `UNVERIFIED.json` | 推測で埋めないもの（3.4）と、ほかの〔要確認〕全部 | 31 | 1.1・3.4・9 の判断 7 | `unit`（主に W37。owner:true は所有者に確かめてもらう候補） |
| `CONCEPTS.json` | 概念の住所と呼び戻す節（3.2 の既知の対ほか）、3.5 の必ず区別するもの | 23 | 基準 15 | 住所の節を書く単位と、呼び戻す節を書く単位 |
| `PROVENANCE.json` | 由来表：基礎教材 第 3 版の 393 節・376 問・161 図・85 写真の行き先か外した理由 | 1015 | 基準 11・3.3・4.2 | 行き先を書く単位（`unit`・`units`） |
| `JCAB-MAP.json` | JCAB 出題範囲参考（事業用・計器・自家用）の全見出し × 節 | 491 | 基準 12・3.6 | W42（節を書くのは `writers`） |
| `ACS-MAP.json` | FAA ACS の知識の項目（自家用 6C・計器 8C・事業用 7B の多発の部分）× 節 | 314 | 基準 13・3.6 | W42 |
| `JCAB-CALIBRATION.json` | JCAB 形式の問題の水準の物差し（枠だけ） | 0 | 基準 19 | W37・W44 |
| `CLAIMS.json` | 主張の台帳（枠だけ。行は執筆の単位が足す） | 0 | 基準 3 | 各執筆の単位と事実確認役 |
| `COUNTS.json` | この設計の数（目次と原本から数え直した値。作った本の値を後で記入） | 86 | 5 章の終わり | 版の確かめの単位（W12・W27・W36・W45・W48） |
| `CALC.json` | 計算の例の台帳：本文・考えてみよう・計算演習の計算を式で持ち、`../tools/calc-check.mjs` が計算し直して本の値と照らす（形は calc-check.mjs の頭の説明。行の台帳ではないので `validate.mjs` の対象の外） | 148 | 基準 5 | 計算の例を書く単位（R2V が第 1 部と序部の分を作った） |
| `VOLUME.json` | 部ごとの「まず読む」本文の予算と測った値（判断 12。`../tools/check-volume.mjs` が読む。行を持たない記録で `validate.mjs` の対象の外） | — | 基準 22 | Wdeep が作った。各部の章の単位が予算の内で書く |

`src/` は最初の台帳を作った道具（下の 7）と、その元にした一次資料の写し（`src/sources/`）です。

## 2. 共通の形

- 1 つのファイルは 1 つの JSON。頭に `ledger`（ファイル名と同じ）・`version`・`updated`・`by`・`about`・`counts`（作ったときの数）などがあり、**`rows` に 1 行 1 件**。`rows` の中は 1 行 1 つの JSON（差分で変わった行だけが見える）。
- **`id` は変えない**（パッチと他の台帳がこの値で指す）。形で台帳が決まる：

| 台帳 | id の形 | 例 |
|---|---|---|
| ERRATA | `T.<報告>.<番号>`（教科書）・`K.<報告>.<番号>`（基礎教材）・`APP.<名>`・`SYNC.<名>` | `T.aero.T-3`・`K.law.kiso09-9`・`APP.lesson-c1` |
| RULINGS | `R.<名>` | `R.fuel-reserve` |
| UNVERIFIED | `U.<名>` | `U.qnh-unit` |
| CONCEPTS | `C.<名>` | `C.wind-triangle` |
| PROVENANCE | 原本の ID そのまま（問は `kisoNN.q<番号>`） | `kiso05.14`・`kiso01.q14`・`ch04-fig4-3`・`ch00-photo5` |
| JCAB-MAP | `<cpl｜ir｜ppl>.<科目>.<大項目>.<ア＝1…>.<（ア）＝1…>` | `cpl.1.1.2.2`（１（１）イ（イ）設計強度） |
| ACS-MAP | ACS のコードそのまま | `PA.I.C.K3`・`CA.X.B.K1` |
| JCAB-CALIBRATION | `CAL.<科目>.<期>` | `CAL.jlaw.2019-07` |
| CLAIMS | `<節ID>#<8 桁>`（`../tools/check-claims.mjs` の claimId）。道具が抜き出さない文を書き手が手で足した行は `<節ID>#hand-<8 桁>`（R2 の `inst`・`navb`） | `aero.lift#0123abcd`・`inst.ap#hand-48c1d16a` |
| COUNTS | `<種類>.<名>` | `toc.sections` |

- **節の書き方**：節 ID は DESIGN 3.3 の目次の ID（まだない節も書いてよい）。PROVENANCE の行き先には、ほかに `door:pN`（部の扉）・`summary:<章ID>`（章のねらい）・`written:<章ID>`（章末の説明してみよう・課題）を使う。
- **単位**：`unit` は閉じる単位（DESIGN 7.2 の `W01`〜`W51`、`W07a` など。形は `W` と 2 桁の数字と、`a`〜`f` の 1 字まで。`W07f` は R1 の P3 で W07a〜c から図・写真・学科テストのファイルを分けた単位で、閉じた行の `unit` は元の単位のまま、`by` が `W07f`）。`alsoUnits`／`units`／`writers` は一緒に手を入れる単位。

## 3. 台帳ごとの項目と状態

状態（`status`）の一覧。**閉じる状態**には、その右の項目と、2 人の署名（`by` と `checkedBy`、別の人）が要ります。

| 台帳 | 開いている | 閉じる状態（要る項目） |
|---|---|---|
| ERRATA | `open` | `fixed`（`where`・`verified: true`）／`not-error`（`reason`）／`wontfix`（`reason`） |
| RULINGS | `open` | `fixed`（`where`：囲み・直した文・用語の表の場所）／`not-error`（`reason`） |
| UNVERIFIED | `open` | `resolved`（`value`・`sourceUrl`・`checkedOn`）／`unresolvable`（`reason`。本では〔要確認〕のまま書くか書かない） |
| CONCEPTS | `open` | `done`（`where`：住所の節と呼び戻す節が本にあり、太字の定義が 1 回・呼び戻しが行数以内） |
| PROVENANCE | `open` | `done`（`where`：`from` にこの ID を持つ節・囲み）／`dropped`（`reason`：外すことを確かめた） |
| JCAB-MAP・ACS-MAP | `open`（節がまだない）・`mapped`（節は今の本にあるが深さは未確認） | `confirmed`（`where`）／`excluded`（`excluded`：対象外（理由）。JCAB-MAP は署名が要る） |

### ERRATA（誤り）

`{ id, ref（DESIGN の番号）, book（textbook｜kiso｜app｜syllabus）, design（10.1 など）, places（節・図・問の ID）, section（DESIGN の節の欄そのまま）, problem, correction, confidence, conf（high｜mid｜low）, safety, source: { report（understand/*.md の場所）, primary（報告が挙げる一次資料）}, unit, alsoUnits, word（基礎教材の行：ERRATA-FOR-WORD.md に書く）, overlay（基礎教材の行：原本のページに重ねる候補とその理由）, rulings, dupOf, verified, status, where, by, checkedBy, reason, note }`

- **`correction` は報告の提案**です。DESIGN 10 のとおり、直す人が `source.primary` の一次資料で確かめてから直し、`verified: true` にします（確かめた結果が違えば、`note` に書いて直し方を変えるか `not-error` で閉じる）。
- 〔安全〕の行（`safety: true`、9 行）は、直したあと独立した安全レビュー（W12・W36）が `checkedBy` に署名します。
- 基礎教材の行（`book: kiso`）は、合本の文で直します（原本は変えない）。53 行すべてを W11 が `ERRATA-FOR-WORD.md` に書き、`overlay` のある行から安全と日本の法令の分（約 25）を原本のページに重ねて表示します。

### RULINGS（食い違い）

`{ id, n（10.4 の表の行番号）, topic, textbook, kiso, class（主の分類）, classes（A・B など全部）, ruling, confidence, safety, treatment, jur（A：FL.jur の項目）, term・terms（C：用語の表へ入れる語）, termNA（用語でない C の理由）, wrong（B：textbook｜textbook-weak｜kiso）, places, source, unit, alsoUnits, errata（同じ点の ERRATA の行）, status, where, by, checkedBy, reason, note }`

- A：日米の囲みにして閉じる（数字は FL.jur から描く。W06・W08）。B：誤った側を本文で直して閉じる。C：用語の表 FL.terms に入れ（W04）、本文をそろえて閉じる（W24・W50）。混合の行は全部の扱いがそろってから閉じる。

### UNVERIFIED（要確認）

`{ id, item, says（DESIGN が今書いている仮の言い方）, sections, jur, source（確かめる一次資料）, owner（所有者に確かめてもらう候補：判断 7）, unit, basis, rule, status, value, sourceUrl, checkedOn, by, checkedBy, note }`

- 解決するまで、本では〔要確認〕の札で書くか、書きません。数字を推測で埋めません。

### CONCEPTS（概念の住所）

`{ id, kind（address｜distinguish）, name, address, recalls, maxLines（呼び戻しの行数の上限）, distinct（distinguish：区別する語とその住所）, basis, unit, recallUnits, status, where, by, checkedBy, note }`。行は足してよい（`op: "add"`）。

### PROVENANCE（由来表）

`{ id, kind（section｜question｜figure｜photo）, chapter, title, to（行き先の列）, plan, reason, basis, unit, units, status, where, by, checkedBy, note }` と、種類ごとに：問 `related（その問の本文節）・near（いちばん近い合本の節）・pool（部のまとめの候補）・errata・flags`、図 `home（原本でその図がある節）・near`、写真 `home・credit・annotated・condition・creditFix`。

- `plan` の意味は台帳の頭の `plans` にあります：`rewrite`（書き直して入れる）・`goals`（扉・ねらいの学習目標）・`task`（章末の課題）・`written`（説明してみようの候補）・`redraw`（暗い板に描き直す）・`use-file`（写真をファイルのまま）・`conditional`（条件を確かめてから）・`drop`（外す。`reason`）。
- 行き先を書いた単位は、その節に `from: [この ID]` を付け、パッチで `status: done`・`where` を書きます。図・問いの `drop` は W03 がキャプションから分類したものを含むので（`basis` に書いてある）、図と問題の単位が確かめ、使うことにしたら `to` と `plan` を直します。

### JCAB-MAP・ACS-MAP（対応表）

JCAB-MAP：`{ id, doc, docTitle, subject, label（１（１）ア（ア）の形）, path（上の見出しも全部）, title, topics（見出しの下の項目）, sections, topicMap（法規の見出し：項目 → 節）, sameAs（同じ見出しの事業用の行）, japan（jp｜mixed｜common）, excluded, status, missing（まだない節）, unit, writers, where, by, checkedBy, note }`。
ACS-MAP：`{ id, acs, acsTitle, area, areaTitle, task, taskTitle, text, sub（K2a など）, sections, excluded, sameAs, status, missing, unit, writers, where, by, checkedBy, note }`。

- 節の側のデータ（`jcab`・`faa`）には、この表の `id` を書きます（`jcab: ['cpl.1.1.2.2']`・`faa: ['PA.I.C.K3']`）。
- 見出しを節に足したり外したりしたら、パッチで `sections` を直します。`confirmed` は W42・W45 が「その節が JCAB の深さで教えている」と確かめたとき。

### JCAB-CALIBRATION・CLAIMS・COUNTS

頭の `format` に行の形があります。CLAIMS の行は執筆の単位が `op: "add"` で足し、事実確認役が `checkedBy` を付けます。COUNTS は版の確かめの単位が `built`・`builtBy`・`builtOn` を記入します（`design` と `recount` は変えない）。

## 4. 誰が署名するか

| 署名 | だれ |
|---|---|
| `by` | 直した・書いた単位（例 `W07a`）。パッチを出す単位 |
| `checkedBy` | **`by` と別の**確かめ役：事実確認（書いた人と別のエージェント）・審査・安全レビュー（〔安全〕の行）・日本の法令レビュー（第 7 部と日本の囲み）・版の確かめの単位（W12・W27・W36・W45・W48）。DESIGN 7.1 の役割 |
| 統合役 | パッチを取り込み（`apply-patches.mjs`）、`validate.mjs` を通し、直したコミットで行を閉じる（DESIGN 7.3「台帳の行は、直したコミットで閉じる」） |

`by` だけで `checkedBy` がない閉じた行は、`validate.mjs` では warning（署名待ち）、W01 の `check-ledgers.mjs` では「閉じていない」と数えます（基準 1・2 は 2 人の署名がそろったときだけ満たす）。

## 5. パッチ（ほかの単位が台帳を直すとき）

台帳のファイルは直接書き換えず、**`textbook/rewrite/combined/reports/<UNIT>.ledger.json`** を書きます（例 `reports/W07a.ledger.json`）。

```json
{
  "unit": "W07a",
  "patches": [
    { "id": "T.aero.T-3", "status": "fixed", "where": "flight-lab/src/book-1.js aero.stall（回復の型の 1 番目）", "by": "W07a", "verified": true, "note": "AFH 3C p.5-15 で確かめた" },
    { "id": "R.stall-recovery", "status": "fixed", "where": "aero.stall", "by": "W07a" },
    { "id": "kiso00.12", "status": "done", "where": "basics.alt", "by": "W10" },
    { "id": "T.aero.T-3", "checkedBy": "W12", "note": "W12 の安全レビューで確かめた" },
    { "op": "add", "id": "aero.lift#0123abcd", "sec": "aero.lift", "text": "…", "tag": "参考値", "source": "PHAK 第 4 章", "by": "W13" }
  ]
}
```

- 1 行の基本は **`{ id, status, where, by, note }`**。ほかの項目（`reason`・`verified`・`checkedBy`・`sections`・`to`・`value`・`sourceUrl`・`checkedOn`・`built` など）も同じように書けます。`note` は前の `note` の後ろに足され、ほかの項目は置き換わります。
- `ledger` は書かなくてよい（`id` の形で決まる）。分からない形の `id` のときだけ `"ledger": "ERRATA"` のように書く。
- 新しい行は `"op": "add"`（その台帳の必須の項目を全部）。
- 行を外すときは `{ "op": "remove", "id", "by", "note" }`（`note` に外す理由。R2 の統合で足した：CLAIMS の本にない文の行）。台帳は行を消し、頭の `removed` に記録 `{ id, by, on, note, text, checkedBy }` を残す。外した id への前の単位の `add`・`set` は、流し直しても戻さない（`removed` が止める）。`validate.mjs` は、外した id が `rows` にないことと、記録に `id`・`by`・`note` があることを確かめる。
- **確かめ役の署名**は、確かめた単位が自分のパッチ（`reports/<確かめた単位>.ledger.json`）で `{ id, checkedBy, note }` を書きます（`by` は書かない。行の `by` と同じ値は不可）。直す単位のパッチは `by` を、確かめる単位のパッチは `checkedBy` を必ず持ちます。
- パッチの検査：`node validate.mjs`（`reports/*.ledger.json` も調べる）。取り込み：統合役が `node apply-patches.mjs`（見るだけ）→ `node apply-patches.mjs --write`（書いてから `validate.mjs` を流す）。1 つのファイルは全部か何もしないかで取り込む。取り込んだあともパッチのファイルは `reports/` に残す（記録）。取り込みは何度流しても同じ結果になる：台帳がもうパッチのとおりの行（`add` の行がある：`note` のある `add` は行の `note` がその `note` で始まること、`note` のない `add` は行が全部の項目でパッチのとおりのこと・`set` の `note` がもう行の `note` にある・`note` のない `set` は項目がもう行のとおり）は、そのままにする。`note` のある `set` は `note` で見分けるので、あとの単位が同じ行の `by` や `status` を書き換えていても、前のパッチを流し直して戻すことはない（1 つの行に何単位も `note` を書くため）。`add` の行も同じで、あとの単位がその行を閉じても（例：W02 が足した `APP.cadet-comm-practice-ch-sim` を W07a が閉じた）、流し直して同じ id の 2 つめの行と見なすことはない（R1 の P3 の統合で直した）。だから `set` と `add` の行には `note` を書く。

## 6. 確かめ方

```sh
node textbook/rewrite/combined/ledgers/validate.mjs          # 形・ID・状態と署名・由来表の網羅・節の存在・相互の参照・パッチ・原本の差分
node textbook/rewrite/combined/tools/check-ledgers.mjs       # W01：ERRATA・RULINGS が全部閉じたか（基準 1・2）
node textbook/rewrite/combined/tools/check-provenance.mjs    # W01：原本の sha256 と由来表、節の from（基準 10・11）
node textbook/rewrite/combined/tools/check-maps.mjs          # W01：JCAB と ACS の対応表（基準 12・13）
```

`validate.mjs` が調べること：各台帳の頭と行の必須の項目、ID の重なりと形、状態と閉じるのに要る項目と 2 人の署名、PROVENANCE が原本の JSON（`flight-lab/kiso/data/kiso00〜13.json`）の全 ID（393・376・161・85）を 1 回ずつ持ち、行き先か理由があること、行き先と節が DESIGN 3.3 の目次にあること、ERRATA と RULINGS の相互の参照、RULINGS の A に日米の項目・C に用語、UNVERIFIED が〔要確認〕の日米の項目を全部持つこと、対応表に未対応がないこと、パッチの形、`flight-lab/kiso/` に git の差分がないこと。

## 7. 作り直すとき（最初の台帳を作った道具）

`src/build-*.mjs` は DESIGN.md・`understand/*.md`・原本の JSON・`src/sources/` から最初の台帳を作った道具です。**最初の台帳ができたあとは JSON が記録の正本**で、道具はふつう使いません。道具は既にあるファイルを上書きしません（`--write --force` で上書きすると、取り込んだパッチが全部消えます）。

| 道具 | 作るもの |
|---|---|
| `src/build-provenance.mjs` | PROVENANCE.json（3.3 の K の参照・3.2 と 4.2 の扉・課題・写真の表、問 → 本文節 → 章） |
| `src/build-errata.mjs` | ERRATA.json（10.1・10.2・10.3・10.5、報告の出典の欄） |
| `src/build-rulings.mjs` | RULINGS.json（10.4） |
| `src/build-unverified.mjs` | UNVERIFIED.json |
| `src/build-concepts.mjs` | CONCEPTS.json と JCAB-CALIBRATION.json・CLAIMS.json の枠 |
| `src/build-jcab-map.mjs` | JCAB-MAP.json（`src/sources/mlit/*.txt`） |
| `src/build-acs-map.mjs` | ACS-MAP.json（`src/sources/acs/*.txt`） |
| `src/build-counts.mjs` | COUNTS.json（目次・原本・台帳から数え直す） |

`node src/build-xxx.mjs` は書かずに数だけを出します（作り直したときの比べ方）。

### 一次資料の写し（`src/sources/`）

| 写し | 元 | 取得 |
|---|---|---|
| `mlit/cpl-airplane.txt` | 国土交通省「航空従事者技能証明学科試験出題範囲参考 事業用操縦士（飛行機）」https://www.mlit.go.jp/koku/content/001761069.pdf（PDF 作成 2024-08-01） | 2026-10-26。PDF の sha256 は写しの頭に |
| `mlit/instrument-rating.txt` | 同「計器飛行証明」https://www.mlit.go.jp/koku/content/001761080.pdf | 同 |
| `mlit/ppl-airplane.txt` | 同「自家用操縦士（飛行機）」https://www.mlit.go.jp/koku/content/001761074.pdf | 同 |
| `acs/pa-6c.txt`・`acs/ir-8c.txt`・`acs/ca-7b.txt` | FAA-S-ACS-6C・8C・7B（2023 年 11 月）https://www.faa.gov/training_testing/testing/acs/ の PDF。知識の項目（K）と Task の題だけを写した | 同 |

どれも `pdftotext -layout` で文字にしたもので、正本は元の PDF です。出題範囲参考は「出題範囲を限定するものではない」と自身が書いています。
