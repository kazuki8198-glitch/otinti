# 統合 R2 の報告：R2 の締め（W27 の確かめ：factcheck2-R2・answerable-R2・safety-R2）

統合役（INTEGRATOR）。日付：2026-10-30。ブランチ `claude/busy-shannon-ddxinc`。
設計：DESIGN 5 章（26 の基準）・6.2（15 の決まり）・3.3 第 1 部・7.2 の R2（W27「事実の二人目・初学者・専門家・本文だけで解けるか」）・7.3（版の最後に出力を作り直す）。所有者の判断：DECISIONS.md（判断 0・2・3 と補足・11）。

## 1. 単位ごとの確かめ（DESIGN 7.2 と報告と差分）

3 つの単位はどれも「直さない役」で、報告だけを書いた（`git status` で変わっていたのは 3 つの報告と、テストが作り直した出力 2 つだけ。出力は戻した）。

| 単位 | DESIGN 7.2 の W27 | 報告で確かめたこと | must / should / nit |
|---|---|---|---|
| factcheck2-R2（事実の二人目） | R2 の差分の事実 | `0f68d6e..HEAD` の `flight-lab/src/` と `cadet/src/content/` の数字・規則・計算・図、考えてみよう 72・計算演習 31・学科テストの 81 問・`g1`・W07d2 の課目・W24 の 140 語の根拠、R2 で閉じた ERRATA 49・RULINGS 23 行を一次資料で。報告の一次資料の一覧と結果の表は、範囲と結論が食い違わない（本文は「抜き取り」と正直に書いている） | 0 / 2（S1 CLAIMS の本にない行 763、S2 署名がない）/ 1（N1 m3 の入りの速度） |
| answerable-R2（本文だけで解けるか） | 基準 14 | 序部と第 1 部の 399 問（章末 143・説明してみよう 233・`g1` の 23）を本文だけで解いて 399 問正解、答えの節を本文に見つけた。追加で考えてみよう 91・学科テスト 81 | 0 / 1（G1）/ 2（G2・G3） |
| safety-R2（安全レビュー） | 〔安全〕に触れた文の安全レビュー | 7 項目と、スピン・荷重倍数・着氷・体調、新しい判断の目 34・もっと深く 19・ここを混同しない 25、学科テストの 16 問、W07d2 の課目。一次資料を取り直した（AFH 第 5・18 章、PHAK 第 5・17 章、AWH、AIM 7-1・7-2、14 CFR 91.17・91.151、通達 国空航第 2278 号） | 0 / 3（S1〜S3）/ 5（N1〜N5） |

W21（第 1 部の図）はこの回の単位にない（R3 の始めへ：PROGRESS の「次」の 1）。新しいソースのファイルはないので、共有の列（`flight-lab/src/modules.mjs`）・`FL_LEAVE_OUT`・開発用 `index.html`・`FL_MODULES.length` は変えていない。

## 2. 直したもの（must と should は全部、nit も G3 のほかは直した）

一次資料は 2026-10-30 に FAA の PDF を取り直して読んだ（AFH 3C 第 5 章 `06_afh_ch5.pdf`・第 9 章 `10_afh_ch9.pdf`・第 13 章 `14_afh_ch13.pdf`・第 18 章 `19_afh_ch18.pdf`、PHAK 25C 第 5 章 `07_phak_ch5.pdf`。AWH 28B と AIM 7-1 は同じセッションの前の単位の写し）。

| # | 報告 | 場所 | 直したこと | 根拠 |
|---|---|---|---|---|
| S1 | safety | `wx.shear`（`book-2.js`） | 「操縦輪を前へ押して、迎え角（迎角）を減らします」→「操縦輪（ヨーク、control wheel）の引く力をゆるめるか少し押して、警報が止まるところまで迎え角を減らします。止まったら、それより下へは機首を下げません」。迎え角の括弧の重なりもなくなった。テストが決め打つ前の文は変えていない | AFH p.5-15「until the impending stall indications are eliminated」、AWH 22.7.3.1「pitch attitude must not be allowed to fall below the normal range」 |
| S2 | safety | `hf.body` | 180° 旋回の文の後ろに「浅いバンクで大きく向きを変えると、旋回が長く続きます。長い旋回では、バンクが少しずつ深まりやすくなります。そこで、少し回っては翼を水平に戻すことをくり返して、向きを変えます（AFH 第 18 章）」。案の「1 分半以上」は速さで変わる（バンク 10° なら 96 kt より遅いと 1 分半に届かない）ので書かなかった。数を入れた 1 回目の案は、節の平均の文の長さ（40 字）と初出の形の検査に触れたので、3 つの短い文にした | AFH p.18-19「turn a few degrees and then return to level flight … may relieve the progressive overbanking that often results from prolonged turns」 |
| S3 | safety | 課目 a5 の brief（`syllabus.js`。CADET の教官が読む） | 「Va（${AR.va} kt：設計運動速度）以下」→「POH の Vo（最大運用運動速度。最大重量で ${AR.va} kt、軽いほど小さい）以下」。決め打ちのテストはない | 本の `aero.vn`（R2）・POH 2.3 |
| G1 | answerable | `aero.flaps`（`book-1.js`） | 「急に全部上げると、揚力が減って機体が沈み、地面に近づくおそれがあるからです（AFH 第 9 章）」を足した（学科テスト `q_aero.20` の理由が本文に） | AFH 3C 第 9 章 p.9-11「A sudden and complete retraction of the flaps could cause a loss of lift resulting in the airplane settling into the ground」 |
| S1 | factcheck2 | `CLAIMS.json` | 本のどこにも文がない 386 行を外した（パッチの `op: "remove"` を足した：下の 4）。763 行のうち 379 行は本にある文（手で足した `#hand-` の行・単位のない数・表）で、`check-claims.mjs` が「本にない」と数えないようにした | `check-claims.mjs`（本にない 763 → 0） |
| S2 | factcheck2 | ERRATA・RULINGS | R2 で閉じた ERRATA 47・RULINGS 23 行に `checkedBy: factcheck2-R2`、〔安全〕の ERRATA 2 行に `checkedBy: safety-R2`（報告の 6 と 10 と、safety-R2 の 4 の⑥⑦から統合役がその単位の名前のパッチを書いた）。**CLAIMS の第 1 部 2,127 行の署名はしていない**：factcheck2-R2 は数字・条番号の文を読んだが、本文は抜き取りで、行ごとに一次資料と照らした記録ではない。R1 の R1V と同じ形の単位（R2V）を R3 の始めに置く（DESIGN の付記 11） | `validate.mjs`（warning 538 → 466） |
| N1 | safety | `aero.stall` の回復の ①・`g1.review` 問 6 | 「失速警報が止まるまで迎え角を減らします」 | AFH p.5-15 の 2 a)・Common Errors 11 |
| N2 | safety | `inst.ap` | 「失速警報（stall warning）が鳴ったら、まず自動操縦を切り、迎え角を減らします（AFH 第 5 章。→ 失速のしくみと回復）」 | AFH p.5-15・Common Errors 9 |
| N3 | safety | `perf.wb` の「もっと深く」 | 「ただし、長いスピンから回復できる機体でも、重心が 1〜2 in 後ろへ動くだけで、回復の操作に応えなくなる例があります（PHAK 第 5 章。→ スピンとスパイラル）」。案の「後ろの限界から」は PHAK に書いていないので外した | PHAK p.5-43「may fail completely to respond to normal recovery attempts when the CG is moved aft by one or two inches」 |
| N4 | safety | `wx.ts` | 「雷雨が範囲の半分を超えておおうときは、その範囲全体を回ります（米国の AIM 7-1-27 は 6/10 とします）」 | AWH 22.8.2 の 15・AIM 7-1-27 |
| N5 | safety | `wx.shear` の判断の目 | 「しるしはそれだけのこともあり」 | AWH 22.7.3.2「the only indication may be」 |
| G2 | answerable | `basics.flight`（`book-0.js`） | 表の下に「着陸できないと分かってから考えると、時間も高さも足りません。だから、降下と進入の前に、やり直すときの向き・高さ・機体の設定を決めておきます」 | 数・規則なし（考えてみようの答えと同じ中身） |
| N1 | factcheck2 | ERRATA `SYNC.m3-speed` の note | ACS（約 Vsse＋10 kt）と AFH（Vsse か Vyse の高いほう＋約 10 kt。この機体で約 98 kt）の言い方の違い。採点は変えない | AFH 3C 第 13 章 p.13-26（PDF で確かめた）・FAA-S-ACS-6C PA.X.B.S2 |
| G3 | answerable | — | **直していない**：`hf.vision` の T6 の「AIM 8-1-8」は本文の出典の行 `bk.src('米国の AIM 8-1-6・8-1-8')` にある（解く道具が出典の行を読まなかった）。`law` の Q1 の「AIM 3-2-3」は節の出典「AIM 3-2」の中の段落で、正しい | — |

ほかの「needs from others」：safety-R2 の 9 の 2（`R.vfr-into-imc` の note）と 9 の 3（PROGRESS の安全レビューの行を合格に）は入れた。9 の 4（CADET の a5 の台詞）は決め打ちのテストがなく、CADET のテストが通る。factcheck2-R2 の 10 の 3（m3）は上の N1。

直した文のうち数字を持つ文（`perf.wb`・`wx.ts`・`wx.shear` の判断の目）と `g1.review` の手で足した行の 4 行は、CLAIMS に札と出典つきで足した（署名は R2V）。〔安全〕の文の言い方は safety-R2 の案のとおりか、案より狭くした（S2・N3）。直した文の 2 回目の安全レビューは W36 か R2V。

## 3. 確かめ（コマンド → 結果）

| コマンド | 結果 |
|---|---|
| `bash textbook/rewrite/tools/testall.sh …/scratchpad/testall-R2`（直したあとの木） | **FLIGHT LAB 92/92・TEXTBOOK 36/36・CADET 269/269**（exit 0。コミット 217dafd と 1ed4943 の木に、このコミットの文書を足した木） |
| `npm run -s test:fast`（FLIGHT LAB）・`npm test`（TEXTBOOK）・`npm run -s test:fast`（CADET）、直したあとの作業の木 | 89/89・36/36・248/248 |
| `node textbook/rewrite/combined/tools/check-chapter.mjs <章> --no-browser`（`aero`・`inst`・`wb`・`wx`・`hf`・`basics`・`g1`） | 7 章とも error 0。HEAD の木と比べて新しい warn はない（`inst` の初出の形は 16 → 15） |
| `node textbook/rewrite/combined/tools/check-claims.mjs` | 札つき 2,142・札なし 695（`sim` と第 2〜6 部。第 1 部 0）・本にない行 0（本にあるが抜き出さない行 379 は数だけ） |
| `node textbook/rewrite/combined/tools/check-all.mjs --no-browser` | error 146・warn 1,107（R2C の 218 から：署名待ちの閉じた行 72 がなくなった。残りは `missing-scope` 72（第 2〜6 部）・ERRATA と RULINGS の開いた行 55 と場所なし 2・体言止めと常体 12（第 2 部以降）・分量 1・道のり 4） |
| `node textbook/rewrite/combined/tools/selftest.mjs` | 31 passed |
| `node textbook/rewrite/combined/ledgers/validate.mjs` | ok：error 0・warning 466（PROVENANCE 463・CONCEPTS 3） |
| 台帳の流し直し：HEAD の台帳に全部のパッチを流した結果と作業の台帳 | `CLAIMS`・`ERRATA`・`RULINGS` が一致（`apply-patches.mjs` をもう一度流すと 0 行） |

## 4. 台帳

- **道具**：パッチに `{ op: "remove", id, by, note }`（`ledgers/src/schema.mjs`・`apply-patches.mjs`）。台帳は行を消して頭の `removed` に記録 `{ id, by, on, note, text, checkedBy }` を残し（`src/write.mjs` が 1 行ずつ書く）、外した id への前の単位の `add`・`set` は流し直しても戻らない。`validate.mjs` は外した id が `rows` にないことと記録の項目を確かめる。README の 5 に書いた。`tools/check-claims.mjs` は、行の文が本の節と章末のどこにもないときだけ「本にない」（check-chapter では、その章の行だけ）。
- **パッチ**（取り込み順は readdir：`factcheck2-R2` → `integrate-R2` → `safety-R2`。外した行の記録があるので順に依らない）：
  - `reports/factcheck2-R2.ledger.json`（70 行）：ERRATA 47・RULINGS 23 に署名、`SYNC.m3-speed` に N1。
  - `reports/safety-R2.ledger.json`（2 行）：`K.navigation.K1`・`K.human.K5` に署名。
  - `reports/integrate-R2.ledger.json`：CLAIMS の 386 行を外す、W24 が用語だけをそろえた 8 行に R1V の署名を引き継ぐ（数字・条番号・出典が同じことを差分で確かめた。`checkedBy: integrate-R2`）、R2 の締めで直した文の 4 行、`R.vfr-into-imc` の note（open のまま）、COUNTS の 15 行と出力の大きさ（`built`）。
- 結果：ERRATA・RULINGS で閉じた行に署名のない行は 0。CLAIMS 2,900 → 2,518 行（序部 390・第 1 部 2,127・第 4 部 1）。

## 5. コミット

1. `217dafd` W27（safety-R2・answerable-R2）：本と課目の直し（`book-0.js`・`book-1.js`・`book-2.js`・`book-gates.js`・`syllabus.js`）と 2 つの報告。この木で速いテスト 89/89・36/36・248/248（一時の索引で作った木を確かめ、その木をそのままコミットした）。
2. `1ed4943` W27（factcheck2-R2）：台帳の道具（`op: "remove"`）・`check-claims.mjs`・台帳（署名・外した行・CLAIMS の 4 行・COUNTS）・3 つのパッチ・報告。
3. 統合は `3cb7c62`（PROGRESS・DESIGN の付記 11・この報告）。
4. `12820d5` 出力の作り直し（`3cb7c62` から `node build.mjs`）：FLIGHT-LAB.html 10,800,572 バイト（10.30 MiB／12 MiB）・TEXTBOOK.html 7,135,832 バイト・CADET.html 10,451,177 バイト（9.97 MiB／15 MiB）、教科書の写真 81 枚はデコード後 3,364,306 バイト（3.21 MiB／4.0 MiB）。この木で `testall.sh` 92/92・36/36・269/269。
5. README の raw.githack のリンクを `12820d5` に（`textbook/README.md`・`cadet/README.md`、`flight-lab/README.md` に v2.6 の行）、PROGRESS とこの報告にビルドのコミットと大きさ、COUNTS `book.size`。

## 6. 未解決のこと（PROGRESS の「未解決」にも書いた）

- **CLAIMS の第 1 部の署名**（基準 3）：2,127 行のうち 5。R2V（R3 の始め）。
- **W21**（第 1 部の図）：R2 でしていない。R3 の始め。
- **直した〔安全〕の文の 2 回目の安全レビュー**（W36 か R2V）。
- **基準の残り**（PROGRESS の「R2 の締め」の表）：6（`aero.forces` の参考値）・11（PROVENANCE の署名 463）・15（第 1 部の呼び戻しのリンクと囲み）・18（章末の正解の位置）・21（長い文 6・平均 40 字を超える節 6）・22（分量）・23（後ろの部への `bk.see` 41・予告なし 3）・24（`use`・`faa` の部品）。
- **所有者の判断**：課目 m3 の高度の行（safety-R2 の意見は参考の行でよい）、学科テストと章末の正解の位置、Seminole の Vxse。
- **VFR の巡航高度の住所**（`navb.north` と `comm.arrive`）は R3 で決める。

## 7. ほかの単位へ

- **W21**：PROGRESS の「次」の 1。
- **R2V**：PROGRESS の「次」の 2（CLAIMS の第 1 部・`CALC.json`・PROVENANCE の署名・基準 15・6・21 の第 1 部の分）。
- **W28**：`emg.imc`（`R.vfr-into-imc` を閉じる）・`ops.wake`（`T.human.T8`）・`ops.turns`・`emg.fire`・`ifr.upset` の「Va（設計運動速度）」を V<sub>O</sub> に（safety-R2 の 8）。
- **W30**：`ifr.circle`、VFR の巡航高度の住所。
- **W36**：R2 の締めで直した〔安全〕の文の 2 回目のレビュー。
