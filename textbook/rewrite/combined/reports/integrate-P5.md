# 統合 P5（W10 序部：`intro`・`basics`・`english`）— 報告

単位：R1 の P5 の統合役（DESIGN 7.1「統合」・7.3）。日付：2026-10-29。
W10 の 3 つの章（書き手 W10-intro・W10-basics・W10-english、事実確認 factcheck-*、初学者の読み reader-*、直し役 revise-*）の報告と差分を DESIGN 7.2 と照らし、P5 に属する「ほかの単位への依頼」を当て、3 つの下書きを本に登録し（DESIGN 7.1「登録」）、台帳のパッチを取り込み、3 製品のテストを流してから、章ごとに 1 コミットにした。

## 1. 単位ごとの確かめ（DESIGN 7.2 の W10「1 単位の流れ（7.1）のすべて」）

| 章 | 下書き → 章の検査 | 事実確認 | 初学者の読み | 直し | 登録したあとの章の検査 |
|---|---|---|---|---|---|
| `intro`（7 節） | W10-intro：今の 5 節を ID のまま書き直し、★`intro.japan`・★`intro.exams`。図 6 枚。主張の札 123 行 | factcheck-intro：must 0・should 8・nit 15（誤り 0。置き場所・言い過ぎ） | reader-intro：must 1・should 39・nit 57 | revise-intro：should・must を全部、nit 50。札 193 行（抜き出し 88 文はどれも札つき） | error 0・warn 7（図の札の初出の形：道具の数え方。下の 6） |
| `basics`（9 節） | W10-basics：基礎教材 第 0 章を書き直し（`from` つき）、日米の囲み 4、図 10 枚、札 93 行 | factcheck-basics：must 3（M1 羽田発の版、M2 機長の言い過ぎ、M3 第 73 条の写し）・should 5・nit 8 | reader-basics：2 回（1 回目 80 件、2 回目 must 0・should 9・nit 50） | revise-basics：2 回。M1・M2・S1〜S4・should 8/9（EN1 の読みは一次資料がないので書かない）。札 113 行 | error 0・warn 5（初出の形 1・概念 4：相手の章の太字と部品 `bk.recall` 待ち） |
| `english`（2 節） | W10-english：★`en.terms`（名前は `FL.terms` から描く）・★`en.class`。図 2 枚。札 42 行 | factcheck-english：must 1・should 9・nit 9（S5：表にない 5 語） | reader-english：must 0・should 13・nit 34 | revise-english：S5 のほか全部。札 87 行 | error 0・warn 0 |

7.1 の流れのうち「審査」（文体・節の形・図・問題）は、`check-chapter.mjs` の form・style・figures・questions と、直し役が図を 390 px の画像で目で見た記録（revise-* の報告の 3）で確かめた。初学者の 2 回目の読みは `basics` だけ（`intro`・`english` は 1 回。直したあとの読みは W12 の「序部の初学者の読み」に入れた：PROGRESS の「次」2）。

直し役の報告は、登録の前に済ませることを 3 つ挙げていた（どれも持ち物の外）。統合で済ませた：

- `basics`：航空法第 73 条が e-Gov の写しにない（factcheck M3・`check-egov` error 1）→ 写しに足した（2）。`FL.jur` の `alt.unit` の日本の欄が古い（S5）→ 直した（2）。
- `english`：表にない 5 語（S5・S6）→ `FL.terms` に足した（2）。

## 2. 統合でしたこと

**登録**（章ごとに 1 コミット。どれも下書きの中身をそのまま入れ、下書きのファイルと報告は記録として残した）：

- `intro`：`flight-lab/src/book-1.js` の章 `intro` を下書きの `B.add` で置き換え、下書きの小さな部品（`partIn`・`p0Others`・`seeIf`・`jcabPath`・`deepRow`・`marksDrawn`・`scopeRow`・`fromRow`）を同じ所に。DESIGN 付記 5 のとおり `intro` は `book-1.js` に置いたまま（本の最初の章を持つファイル。統合の指示の「`book-0.js` の章」は序部の章という意味に読み、ファイルは移さなかった：ID・番号・製品の読み込みは同じ）。図 6 つを `book-figs.js` の `FIG` に（`courseMap`・`courseFlow`・`certLadder`・`studyCycle` は置き換え、`jpRoutes`・`examMap` は新しく。下書きだけにあった `rect`・`down`・`up` を `NFN` の横に）。出典 15 件を `book-core.js` の `R` に。
- `basics`：`flight-lab/src/book-0.js` の `addPart` の後に `B.add`（`before: 'aero'`）。`book-0.js` に `R`・`bk`・`FIG` を足した。図 10 枚を `FIG` に（下書きの `plane` は `planeSide(…, { pitch, gear: false })` で、`fmt`・`pad3` と一緒に）。出典 10 件を `R` に（航空法の e-Gov の版は `intro` の `R.egovKoku` と同じ URL なので `egovKokuho` を作らず `R.egovKoku` に：DESIGN 3.2）。
- `english`：`book-0.js` の `basics` の後に、章の部品（`FL.terms` から表を描く `term`・`paren`・`TRIPLE` など）と `B.add` を 1 つのブロック `{ … }` に入れた（部品の名前がほかの章とぶつからないように。節の本文はテンプレート文字列なので、字下げは変えていない）。図 2 枚と部品 `esc`・`names` を `FIG` に。出典 9 件を `R` に（`cfr1`・`nist811`・`mlitSyllabus` はもうあった）。同じコミットで CADET の `DROP_CHAPTERS` に `english`（DESIGN 6.3）。

**当てた依頼と埋めた穴**：

- **航空法第 73 条の写し**（W05・W37 への依頼。factcheck-basics M3）：`textbook/rewrite/sources/egov/` に第 73 条（機長の権限）を足した。`fetch.mjs` は全部の条を写し直して確認日を変えるので、同じ手順（固定した版が今日も CurrentEnforced・`elm=MainProvision-Article_73` で引いた条と全文の中の条が 1 文字も違わない・`renderArticle` の文字）を第 73 条だけに当てた（写した日と確認日は 2026-10-29。ほかの 62 条と `index.json` の法令の確認日 2026-10-27 はそのまま）。`manifest.json`・`index.json`・`articles/kokuho/73.json`・README。`check.mjs` pass 1471 / fail 0（warn 1：47 項目のどれも引いていない写し。`basics.crew` が引く）。
- **`FL.jur` の `alt.unit`**（W06 への依頼。factcheck-basics S5・reader-basics U2）：日本の欄を「METAR の規正値は Q 群（hPa）。国内記事（RMK）に A 群（inHg）も書く。管制・ATIS で言う単位は〔要確認〕」、`jpSrc` を「気象庁『航空気象通報式』第 3 版（改正第 17 号）の国内記事」に。統合で気象庁の PDF（https://www.jma.go.jp/jma/kishou/books/tsuhoshiki/koukuu/koukuu3_17.pdf）を落として読んだ：改正記録の第 17 号は令和 7 年 8 月 7 日、解説 (4)「国内記事は，指示符 RMK の後に続けて報ずる」・(5)「国内記事は国内のみに通報する」、国内記事の規則 2.1「QNH の値に水銀柱のインチを使用する。この群は指示文字 A を前置し…QNH29.91 インチは A2991」。確度は〔要確認〕のまま（管制・ATIS の単位が残る）。
- **用語の表 `FL.terms`**（W04 への依頼。factcheck-english S5・S6、revise-english 6 の 2）：座学の教官（ground instructor）・標準用語（phraseology）・ふつうの言葉（plain language）・権威勾配（authority gradient）・権力格差（power distance）を `status: 'book'` で（出題範囲参考の写しと e-Gov の写しにこの名前がないことを統合で確かめた。座学の教官は航空法第 34 条第 2 項の操縦教員と別：写しで確かめた）。権威勾配と権力格差は `distinct` で結んだ。表は 302 語（`terms.test.mjs` の 150〜320 の中）。
- **`english` の初出**：`FL.terms` に入った「標準用語」の初出が、図 `enTalk` の札「意味の決まった言葉（標準用語）」になり、`check-style` が warn を出した。本文を「意味の決まった言葉を使います。これを標準用語（phraseology）といいます。」にし、図の札とキャプションから「（標準用語）」を外した（図の前にある語は、図の中では略号か言い換えだけ：STYLE「図」）。下書きのファイルは直していない（記録）。
- **写真 `ch00-photo5`**：下書きの `basics.alt` は `bk.photo('ch00-photo5')` を呼ぶが、写真のファイルは W22 が入れる。TEXTBOOK の写真のテスト（`content.test.mjs`：章が呼ぶ写真はすべて `book-photos.js` にある）を広げずに、登録では写真を外した（W22 が入れるコミットで置く。由来表の note）。
- **TEXTBOOK のブラウザのテストの章の選び方**（`basics` のコミット）：「the sections' links, the calculators, the check questions, the lesson tags」は、第 2 章（`CHAPTERS[1]`）の確認問題と課目の札（目的・なぜ・合格の目安）を確かめる。第 2 章は W10 の前は `sim`（課目 a1）で、`basics`（課目 k1：目的だけ）が前に入った。描き方（`page.js` は無い欄を書かない）は正しいので、テストが見る章を前と同じ `sim` に id で決めた（`TEST-CONSTANTS.md`）。
- **CADET のタブレット**（`basics` のコミット、`cadet/src/main.js`）：`basics` を入れた木で、CADET のブラウザのテスト「the prologue…」が 2 回続けて落ちた（Tab で開いた直後の 2 回目の Tab でタブレットが閉じない。そのテストだけを流すと通る）。タブレットは開いたあと `setTimeout(…, 0)` で最初のボタンにフォーカスを移し、閉じる Tab・Esc はタブレットの中の `keydown` で受ける。フォーカスが移る前に来た Tab は窓の `keydown` にだけ届き、そこは「タブレットが開いている間は何もしない」ので閉じなかった（Esc ならポーズのメニューが重なって開く）。製品の競合なので、窓の `keydown` でもタブレットが開いていれば Tab・Esc で閉じるようにした（タブレットの中のときは今までどおりタブレットが受け、伝わりを止める）。調べたこと：落ちた所の直前のフォーカスを記録して流すと、記録のための往復が時間を空けるので通った（フォーカスはタブレットの「今日」のボタン）。`basics` で章が増えてタブレットの描く量が増え、タイマーが遅れるようになったと見ている（確かめていない）。テストは変えていない。
- **台帳の W10 の行で、3 つの章の外にあったもの**：ERRATA `T.overview.T2`（章 `sim` の出典 AC 61-136B が現行か）を、FAA の AC の一覧のページ（https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1034348、2026-10-29 に読んだ：Status Active・Date issued 2018-09-12）で確かめ、誤りではないで閉じた。UNVERIFIED `U.ac61-136` は resolved。ERRATA `K.overview.K6`（第 0 章の図の文字が小さい）は `basics` の図 3 枚で直ったので `basics` のパッチで閉じた。
- **CADET の README**：「質問できる節は … 25 章・145 節」→「序部の『飛行の基本量』と、地上学科から多発・CRM までの全部（26 章・154 節。はじめにの章と FLIGHT LAB の使い方の章は除く）」。
- **DESIGN.md**（付記 6）：上の直しの記録、3.3 の `intro.exams` の「航空無線通信士（…副操縦士に必要とされる）」を「必要とされるかは〔要確認〕」に（一次資料で確かめた言い方ではない：W10-intro・factcheck-intro）。
- **PROGRESS.md**：今の状態・できたこと（W10）・台帳（P5）・次（描く部品・W12）・未解決（P5）。

**当てなかった依頼**（理由。PROGRESS の未解決と 7 に残した）：

- 範囲の札・由来の行（`FL.book.secMarks`）と章末の `written` を描く部品（reader-intro M1・E4、reader-english 12 の 4）：3 製品の描き方とテストの決め打ち（`COUNTS.details` など）に響く仕事で、W10 の登録の外。単位を W12 の前に置いた（PROGRESS の「次」1）。
- TEXTBOOK の表のセルの `overflow-wrap: break-word`（reader-english E1・reader-intro R11）：日本語は語の途中でも折り返すので、この 1 行で「事業用操 / 縦士」が直るとは限らず、折れなくなったセルが広がると、電話の幅で横にはみ出さないテスト（`browser.test.mjs` の `#all`）に響くおそれがある。確かめてから入れる（TEXTBOOK の持ち主）。
- 「仮想教材値」と「教材値」（reader-intro M13）：`render.js` の注意書きと FLIGHT LAB の画面と TEXTBOOK のテストの決め打ち `SEC_NOTE` にまたがる（W49・W50）。
- `FL.terms` のほかの語（3 章の報告の約 40 語）と `FL.jur` のほかの言いかえ（読み手 3 人）：W04・W06 の持ち物で、登録を止めない（PROGRESS の未解決）。
- e-Gov の写しのほかの条（`intro` が条番号なしで引く第 22・24・26・29 条、施行規則第 43 条・別表第二など）：W37（`fetch.mjs` に別表を写す直しが要る）。

## 3. テスト（コマンドと結果）

| コマンド | 結果 |
|---|---|
| `bash textbook/rewrite/tools/testall.sh …/scratchpad/testall-P5-intro`（`intro` のコミットの木） | FLIGHT LAB **82/82**・TEXTBOOK **22/22**・CADET **266/266** |
| 同じ、`basics` のコミットの木（`…/scratchpad/snap-basics` から `testall-P5-basics`） | 1 回目：FLIGHT LAB 82/82・TEXTBOOK 21/22（上の章の選び方）・CADET 265/266（上のタブレット）。直したあと `…/testall-P5-basics2`：FLIGHT LAB **82/82**・TEXTBOOK **22/22**・CADET **266/266**（間に、TEXTBOOK の `npm test` だけ 22/22、CADET のブラウザのテストだけ 20/21（同じタブレットのテストが再び落ちた。そのテストだけを流すと通る）を流して原因を切り分けた） |
| 同じ、`english` のコミットの木（`…/scratchpad/snap-english` から `testall-P5`） | FLIGHT LAB **82/82**・TEXTBOOK **22/22**・CADET **266/266**（最終の木。作業の木との違いは、このあとの統合のコミットの文書と台帳だけ） |
| 前の基準（8382341、`…/scratchpad/testall-base`）・P1（`testall-P1b`）・P4（`testall-P4`） | 51/52・18/18・256/256（ブラウザのテスト 15 は P1 から通っている）、56/56・21/21・259/259、82/82・22/22・266/266 |
| `node textbook/rewrite/combined/tools/check-chapter.mjs intro`・`basics`・`english`（登録したあと、台帳を取り込んだあと） | どれも error 0。warn：`intro` 7（first-use-form：図の札）、`basics` 5（first-use-form 1・概念 4）、`english` 0。pending は `calc` の台帳 |
| `node textbook/rewrite/combined/ledgers/validate.mjs` | ok — 0 error、172 warning（署名待ち 172 行） |
| `node textbook/rewrite/combined/ledgers/apply-patches.mjs`（流し直し） | 0 行（取り込んだ行はもう台帳にある） |
| `node textbook/rewrite/sources/egov/check.mjs` | pass 1471 / fail 0 / warn 1 |
| `node textbook/rewrite/combined/tools/selftest.mjs` | 31 passed |
| `node textbook/rewrite/combined/tools/check-all.mjs --no-browser`（報告だけ。本は 7 部・29 章・167 節） | error の合計 **475**（P4 の統合のとき 492）。減ったのは jurisdiction 190 → 174（`missing-scope` 154 → 149：序部の 18 節に `scope`、`us-rule-outside-us` 36 → 25：`intro` の書き直し）・path 13 → 12（`forward-see-unlabelled`）、warn の `forward-ch-ref` 24 → 11（`courseMap` の `{ch:}` がなくなった）。増えたのは ledgers の `unsigned` 128 → 136（閉じて署名待ち）、egov の warn 1（47 項目が引かない写し `kokuho:73`）、concepts の `definition-repeated` 5 → 7（序部が住所になった太字）。claims は 1,649 文で札なし 144（P4 は 1,459 文で 149：序部の抜き出した主張はすべて札つき） |
| 終わりの統合のコミットのあと（文書と台帳だけを変えた）：FLIGHT LAB `npm run -s test:fast`・TEXTBOOK `node --test test/egov.test.mjs test/content.test.mjs`・`check.mjs`・`validate.mjs`・`apply-patches.mjs` | 80/80・10/10・pass 1471・ok（warning 172）・0 行（台帳と DESIGN を読むテストを流し直した） |

増えたテストはない（どの製品も数は P4 と同じ）。意図して直したテストの決め打ちは `TEST-CONSTANTS.md` の P5 の 11 行（TEXTBOOK の `COUNTS` と見出しを 3 回・`ORDER` を 2 回、`#aero.lift` 3.2 → 4.2 → 5.2、ブラウザのテストの章の選び方、FLIGHT LAB の序部の章の列を 2 回、`jur.test.mjs` の付録の表の見本の項目、CADET の README）。

## 4. コミット（章ごと。どれも、その木で 3 製品のテストが通ってから）

1. `e8d5a00` `intro`：`book-1.js`・`book-figs.js`・`book-core.js`、TEXTBOOK の `COUNTS` と見出し、下書きと報告（reader-intro・revise-intro）、W10-intro のパッチを当てた CLAIMS・PROVENANCE・RULINGS・ERRATA。82/82・22/22・266/266
2. `f377f17` `basics`：`book-0.js`・`book-figs.js`・`book-core.js`・`book-jur.js`（`alt.unit`）、e-Gov の写し（第 73 条）、TEXTBOOK と FLIGHT LAB のテストの定数、TEXTBOOK のブラウザのテストの章の選び方、CADET の `main.js`（タブレット）と README、下書きと報告（reader-basics・revise-basics）、W10-basics のパッチを当てた 7 つの台帳。82/82・22/22・266/266
3. `257db7a` `english`：`book-0.js`・`book-figs.js`・`book-core.js`・`book-terms.js`（5 語）、CADET の `DROP_CHAPTERS`、テストの定数、下書きと報告（reader-english・revise-english）、W10-english のパッチを当てた CLAIMS・UNVERIFIED。82/82・22/22・266/266
4. 統合（このコミット）：PROGRESS.md、DESIGN.md の付記 6 と 3.3 の 1 か所、この報告、`integrate-P5.ledger.json` を当てた ERRATA・UNVERIFIED（`T.overview.T2`・`U.ac61-136`）

各コミットのファイルは、テストを流した木の写し（`…/scratchpad/testall-P5-intro`・`snap-basics`・`snap-english`）から `git hash-object -w` と `git update-index --cacheinfo` で index に入れた（作業の木は次の章へ進めていたため。流した木とコミットが同じになる）。

## 5. 台帳の行（この統合で触った行）

パッチ：`reports/W10-intro.ledger.json`（199 行）・`W10-basics.ledger.json`（169 行）・`W10-english.ledger.json`（88 行）・`integrate-P5.ledger.json`（2 行）。この順に `apply-patches.mjs --write` → `validate.mjs` ok。

- **CLAIMS**：393 行を足した（`intro` 193・`basics` 113・`english` 87）。3 章の抜き出した主張（88・113・24）はどれも札つき。`checkedBy` は、事実確認役の報告が「付けてよい」とした、文の変わらない行だけ（`basics` 66 行：factcheck-basics の報告 9。`basics.crew#5fa38cd4` は第 73 条の写しが入ったので含めた。`english` 21 行：factcheck-english の報告 6 と revise-english の報告 4。S3・S5・S7 の行は除いた）。`intro` は事実確認役が署名を W12 に任せた（note に記録）。
- **閉じた**：ERRATA `K.overview.K2`・`K3`・`K4`・`K6`（fixed）・`T.overview.T2`（not-error）、RULINGS `R.pic-meaning`（B）・`R.ifr-terms`（C：`intro.cert` と `basics.rules` の両方）・`R.pressure-unit`（A・B）、PROVENANCE 32 行（`kiso00.01`・`02`・`07`〜`16`、問 `kiso00.q1`・`q2`・`q6`〜`q16`・`q18`（行き先を `basics.speed` の考えてみように直した）・`q19`・`q20`、図 `ch00-fig1`・`fig5`・`fig6`、`kiso09.q3`）、CONCEPTS `C.pic-vs-captain`、UNVERIFIED `U.ac61-136`（resolved）。
- **note だけ**（開いたまま）：PROVENANCE `kiso00.cover`（`to` に `intro.marks`・`intro.study`。序部の扉 `door:p0` が残る）・`kiso00.x1`（同じ）・`kiso09.3`（`jlaw.license`＝W38）・`kiso09.8`（`law.basis`＝W19）・`kiso12.1`（`ifr.rules`＝W30）・`ch00-photo5`（W22）、ERRATA `APP.kiso-cover-airline`（序部の扉）、RULINGS `R.pf-term`（`crm.pm`＝W32）、CONCEPTS `C.flight-rules-conditions`・`C.speed-kinds`・`C.time`・`C.pressure-altitude`（相手の章の太字・呼び戻し）、UNVERIFIED `U.qnh-unit`（国内記事の A 群は確かめた。管制・ATIS の単位が残る）・`U.london-icao`、JCAB-MAP 8 行の `missing`（`basics.*` を外した）。

閉じたが確かめ役の署名（`checkedBy`）を待つ行：172（P4 の 130 ＋ P5 の 42）。W12。

## 6. 未解決のこと

PROGRESS.md の「未解決のこと」の「P5 で増えた未解決」と同じ。要点：

1. 範囲の札・由来の行・説明してみようを描く部品がない（`intro.marks` の 2 行と序部の `written` 22 問が画面に出ない）。
2. 写真 `ch00-photo5` は W22 まで出ない（`basics.alt` に高度計の見た目がない）。
3. 用語の表にない語（約 40）と `FL.jur` の言いかえ（W04・W06）、「教官」と「操縦教員」のそろえ（W24）。
4. e-Gov の写しにない条（W37。別表を写す道具の直し）。
5. 検査の道具の数え方（図の札・長い語の中の短い語・数字のない事実の行・例題の札・3 章合わせた正解の位置）。
6. 一次資料で分からないまま（訓練生が取る資格と時期、学科の言語、ANA の審査、ロンドンの書き方、日本の QNH の単位、夏時間）。
7. CADET のタブレットの競合は直したが、なぜ `basics` で表に出たか（タイマーの遅れ）は確かめていない。

## 7. ほかの単位への依頼

- **描く部品の単位（統合役の提案：W10b、W12 の前）**：`FL.book.secMarks(sec)`（範囲の札と由来の行。FLIGHT LAB の `pages.js` と TEXTBOOK の `render.js` が同じ形で描く）と章末の `written`（答えは開いて見る）。テストの決め打ちを `TEST-CONSTANTS.md` に。
- **W22**：`ch00-photo5` を `book-photos-k.js` に入れ、`flight-lab/src/book-0.js` の `basics.alt` の考えてみようの後に `${bk.photo('ch00-photo5')}` を置く（下書き `drafts/basics.js` の位置）。
- **W04**：PROGRESS の未解決の語の一覧、`walk-around`・`spin`・`landing-gear`・`turn-coordinator` の通称と note、PF・PM・PFD・POH の `common`、略語と漢字の読み（METAR・ATIS・TAF など）。
- **W06**：`time`・`alt.transition`・`ir.need`・`medical`・`multi.rating`・`english.radio` の言いかえ。
- **W37**：`intro` の条（上の 2 の「当てなかった依頼」）と施行規則第 65 条の 2、`fetch.mjs` が別表を写すようにする。第 73 条を写したので、`fetch.mjs` を次に流すときは全部の確認日がそろう。
- **W01・W24**：上の 6 の 5 の検査の数え方。
- **W12**：序部の CLAIMS の署名のない 306 行、P5 で閉じた 42 行の `checkedBy`、序部の初学者の読み（`intro`・`english` は 2 回目）、`basics.rules`「雲に入る前に引き返す」（〔安全〕③の入口：W10-basics の報告 6 の 7）の安全レビュー、序部の図 18 枚の目視の記録。
- **TEXTBOOK の持ち主（W49）**：表のセルの折り返し（2）・「仮想教材値」（2）。
