# 合本の進み具合（PROGRESS）

設計：[`DESIGN.md`](DESIGN.md)（作業の単位は 7.2、決まりは 6.2）。所有者の判断：[`DECISIONS.md`](DECISIONS.md)（全部の版を作る・基礎教材を書き直して使ってよい・JCAB の用語）。各単位の報告：[`reports/`](reports/)。台帳：[`ledgers/`](ledgers/)（形とパッチの取り込みは `ledgers/README.md`）。テストの決め打ちの数の変更：[`TEST-CONSTANTS.md`](TEST-CONSTANTS.md)。

次のエージェントは、ここと台帳（JSON）から続けます（DESIGN 7.4）。

## 今の状態（2026-10-27）

- **版**：R1（誤りの修正・日米の違い・序部）の途中。P1（W01・W02・W03・W05）、P2（W04・W04b・W06）、P3（W07a・W07b・W07c・W07f・W07d・W11）、P4（W09・W08a・W08b・W08c）を統合してコミットした。教科書の誤り（DESIGN 10.1 の教科書の 79 行のうち 77 行・図・写真・学科テスト 4 問）と課目の失速の回復の順番〔安全〕を直し、基礎教材の原本のページに訂正の重ね表示と作り直した問題を出した。本の構成は **7 部（序部 p0 と第 1〜6 部）・27 章・154 節**：序部の章は今ある `intro`・`sim` の 2 つ（番号は `intro` 1・`sim` 2・`aero` 3…、`#aero.lift` は 3.2）。新しい章 `basics`・`english`（序部の残り）は W10。日米の囲みは今ある節の 60 か所（項目 × 節）に置き、章末に「この章の日米の違い」が出る。
- **テスト**（`textbook/rewrite/tools/testall.sh`、P4 の統合のとき）：FLIGHT LAB 82/82・TEXTBOOK 22/22・CADET 266/266（数は [`reports/integrate-P4.md`](reports/integrate-P4.md)。P3 のときは 80・21・266、P2 のときは 76・21・265、P1 のときは 56・21・259）。
- **出力**（`FLIGHT-LAB.html`・`TEXTBOOK.html`・`CADET.html`）：テストを流すと作り直されるが、コミットはしていない。版の最後（W12）に作り直してコミットする（DESIGN 7.3）。

## できたこと

| 単位 | 中身 | 報告 | 確かめ方 |
|---|---|---|---|
| W01 検査の道具 | `tools/` の 19 の検査（報告だけ）と `check-all.mjs`・`check-chapter.mjs`・`selftest.mjs`。基準値（今の本）は報告の 4。統合で基準 4 の検査 `check-egov.mjs`（e-Gov の写しと本文の条番号・数）を足した | [W01](reports/W01.md) | `node textbook/rewrite/combined/tools/selftest.mjs`（31 passed）、`check-all.mjs` |
| W02 製品の土台 | 読み込みの列を 1 つに（`flight-lab/src/modules.mjs`。3 製品とテストと `counts.mjs` はここから作り、読まないものを理由つきで書く）、`MAX_BYTES` 12 MiB、開発用ページに `book-photos.js`、3 製品の「（別の章）なし・行き先のないリンクなし」、CADET の AI 目次 25,000 字、メニューの読んだ節と記録の画面の教科書の行。統合で `figshot.mjs`・`render-ch.mjs`・`photo.py`・TEXTBOOK の写真のテストの手書きの列も共有の列からにした | [W02](reports/W02.md) | 3 製品のテスト |
| W03 台帳と由来の記録 | `ledgers/` の 10 の台帳（ERRATA 154・RULINGS 80・UNVERIFIED 31・CONCEPTS 23・PROVENANCE 1,015・JCAB-MAP 491・ACS-MAP 314・COUNTS 86 と枠 2）、`validate.mjs`・`apply-patches.mjs`、`PROVENANCE.md`（判断 2 の記録）と `flight-lab/README.md` の 2 行。統合でパッチの取り込みを何度流しても同じ結果になるようにした | [W03](reports/W03.md) | `node textbook/rewrite/combined/ledgers/validate.mjs` |
| W04 用語の表 | `flight-lab/src/book-terms.js` の `FL.terms`：297 語（正式名は JCAB・航空法の表記を一次資料で 1 語ずつ確かめた。通称・英語・ICAO・略号・根拠・状態・テストと CADET が決める語・CADET の通称・必ず区別する語）と引き方（`find`・`firstUse` など）。RULINGS の C の 42 行の語を表の正式名にそろえ、本文をそろえて閉じる単位へ移した。統合で共有の列に登録（FLIGHT LAB・TEXTBOOK が読む。CADET は外す） | [W04](reports/W04.md) | `flight-lab/test/terms.test.mjs`（8） |
| W04b 作業の決まりの文書 | `textbook/rewrite/STYLE.md` を合本の決まりに（CADET が表示しない章・用語・節の形と囲み・節のデータ・日米の書き分け・主張の札・基礎教材の写真）、`PLAN.md` に案内、`NOTES.md` に行き先（行の番号は変えない）。統合で W04・W06 の答え（用語の表の例・FSS・部品の書き方）を STYLE に入れ、`figshot.mjs` を 10 px にした | [W04b](reports/W04b.md) | 読み合わせ（報告の 3） |
| W05 日本の法令の写し（1） | `textbook/rewrite/sources/egov/`：航空法 25 条・施行規則 37 条（版を固定）、47 項目の日本の欄の照合 `jur-japan.json`、写しの検査 `check.mjs`。統合で TEXTBOOK のテスト `textbook/test/egov.test.mjs` に入れ、DESIGN 3.4 の 3 項目（`lights.ac`・`medical`・`docs`）を直した | [W05](reports/W05.md) | `node textbook/rewrite/sources/egov/check.mjs`（pass 1456）、TEXTBOOK のテスト |
| W06 日米の対照データと部品 | `flight-lab/src/book-jur.js` の `FL.jur`：47 項目（米国の欄は eCFR・AIM・ACS・FMH-1 で、日本の欄は W05 の写しで確かめた。確認済み 27・要確認 20）。`book-core.js` に `bk.jur`・`bk.us`・`bk.jp`・`bk.same`・章末の表 `FL.book.jurTable`・付録の表 `FL.book.jurAppendix`（第 7 部へのリンクは行き先があるときだけ）、2 つの `style.css`、CADET は日本の側だけを消して米国の側を「米国の決まり」に（`usSideOnly`）。統合で共有の列に登録（3 製品が読む）、CADET の本の CSS、DESIGN 3.4 の表を直した（付記 3） | [W06](reports/W06.md) | `flight-lab/test/jur.test.mjs`（12）、`cadet/test/jur.test.mjs`（6） |
| W07a 教科書の誤り（第 1 部） | `book-1.js`・`book-2.js`・`book-comm.js`：aero・sys・perf・wx・law・hf・radio の誤り 41 行と裁定 12 行を一次資料で確かめて直した（失速の回復で自動操縦を最初に切る〔安全〕・クロスチェックは多数決にしない〔安全〕・マイクロバーストで機首を下げすぎない〔安全〕など）。共通の節の米国の規則に国を書いた（14 節）。TEMPO は「1 回 1 時間未満」。`comm.practice` の `{ch:sim}` を `bk.sim` へ（CADET の「（別の章）」がゼロに）。統合で本文が引く SAIB CE-10-11・NWSI 10-813・NWS Melbourne を `R` と章の出典に | [W07a](reports/W07a.md) | 3 製品のテスト、`check-jurisdiction.mjs` |
| W07b 教科書の誤り（第 2〜4 部） | `book-3.js`・`book-4.js`：VFR の燃料は最初の着陸予定地まで（91.151）・WAAS の代替飛行場・DME の待機・HAT と HAA・最良滑空速度と重さなど 12 行と裁定 2 行。共通の節の米国の規則に国を書き（`us-rule-outside-us` 101 → 19、残りは図）、直書きの「第 N 章」を 9 → 0。章末の出典に POH と P/CG（+4） | [W07b](reports/W07b.md) | 3 製品のテスト、`check-chapter.mjs` |
| W07c 教科書の誤り（第 5〜6 部） | `book-5.js`：Vmc の定義（推力を最も不利な形で失う）・上昇できるとは限らない・Seminole の公表値（参考値・二次資料）・異常姿勢の回復の補足など 6 行。TEM の言い方を裁定の 1 つに。`sim` の米国の規則に国。`bk.sim` 7 か所を課目と照らした | [W07c](reports/W07c.md) | 3 製品のテスト |
| W07f 図・写真・学科テストの誤り | `book-figs.js`・`book-photos.js`・`PHOTO-CREDITS.md`・`quiz.js`：図の誤り 15 枚と裁定の図 4 枚（V-n 線図・ILS の偽の道・コンパスの目盛り・TEMPO など）、図の中の米国の規則に国、字の幅の広いフォントでのはみ出し、写真 `lycoming` のライセンス（Public domain）、学科テストの誤り 4 問（分野・数・並びは同じ）。24＋5 行を閉じた（W07a〜c の行。`by` は W07f） | [W07f](reports/W07f.md) | `check-figures.mjs`（error 0）、`check-questions.mjs`（error 0） |
| W07d 課目と教科書の食い違い | `syllabus.js`：a7・a8 のブリーフと `stallRecovery` の回復の順番を AFH の型に〔安全〕（CADET の教官が読み上げる。W07a の `aero.stall` と同じコミット）、c1 の教科書を `solo.check` に、a4・a5・a7・a8 の `book` の後ろに `ops.turns`・`ops.stall`。NOTES.md 1 の「アプリ側」の食い違い 30 行を ERRATA に（open） | [W07d](reports/W07d.md) | FLIGHT LAB の課目のテスト、CADET の教官のテスト |
| W09 構成の変更 | `FL.book.addPart`（部は、その部の章を持つファイルが足す）、`book-0.js`（新）が序部 p0「序部　出発の前に（日本で準備する）」を第 1 部の前に足し、できあがっている `intro`（`book-1.js`）と `sim`（`book-5.js` の `before: 'aero'`）を序部へ（ID は同じ）。直書きの「第 N 章」8 → 0（`intro.study` は `{ch:sim}`、図 `courseMap` は `{ch:}` の範囲）。p1 と課程表の s0 の題から「ロンドン相当」を外し、判断 8（推奨）で段階の題の番号を部の番号に（s0 → 第 1 段階 … s5 → 第 6 段階。CADET の掲示 5 か所も）。テストの定数（TEXTBOOK の `COUNTS.parts` 7・`ORDER`・見出し「全 7 部」・`#aero.lift` 3.2・`FL_MODULES.length` 17、FLIGHT LAB の部の列、CADET の質問メニューの部の比べ方）を `TEST-CONSTANTS.md` に。統合で共有の列への登録を確かめ、DESIGN の付記 5 | [W09](reports/W09.md) | 3 製品のテスト、`check-chapter-refs.mjs`（error 0） |
| W08a〜c 囲みを置く | 3.4 の「囲みの節」のうち今の本にある 60 か所に `FL.jur` の囲み（`bk.jur`、`fuel.ifr` だけ `bk.same`）を置いた：W08a は `book-1.js`・`book-2.js`・`book-comm.js` の 26 節、W08b は `book-3.js`・`book-4.js` の 15 節、W08c は `book-5.js` の `me.perf`。数字は手で書かず、手で書くリンクもない（決まり 13）。CADET には米国の列だけが「米国の決まり」として残る（91.17・91.151 の文も）。統合で章末の「この章の日米の違い」（`FL.book.jurTable`）を FLIGHT LAB の `pages.js` と TEXTBOOK の `render.js` から出し、3.4 のテスト ①（囲みの節にその項目の囲みがあり、ほかの節にはない）を `jur.test.mjs` に、`FL.jur` の `cruise`（磁航路）と `multi.rating`（施行規則第 53 条第 2 項・61.63(c)）を一次資料で直した | [W08a](reports/W08a.md)・[W08b](reports/W08b.md)・[W08c](reports/W08c.md) | `check-jur.mjs`（① found 60・missing 0・pending 13）、`flight-lab/test/jur.test.mjs`（13）、`cadet/test/jur.test.mjs` |
| W11 原本の保存と表示 | `kiso-errata.js`（新）：原本のページに重ねる訂正 25 項目（安全と日本の法令。重ねない 2 行は理由つき）と、章の問題のページから作り直した確認問題。`pages.js`：題の下の 1 行・訂正の囲み（`.kz-body` の外）・図の id を図ごとに・写真の `alt`。原本のハッシュのテスト。`ERRATA-FOR-WORD.md`（DESIGN 10.2 の全 53 行）。統合で共有の列に登録（FLIGHT LAB だけ） | [W11](reports/W11.md) | `flight.test.mjs`・`browser.test.mjs` の基礎教材のテスト、`check-provenance.mjs` |

台帳で閉じた行（P1）：ERRATA `APP.max-bytes`・`APP.index-photos`・`APP.menu-read-count`・`APP.record-textbook-row`（W02）・`APP.base64-xxx`（W01）、UNVERIFIED `U.docs-article`・`U.egov-version`（W05）。どれも確かめ役の署名（`checkedBy`）は W12 が付ける（`validate.mjs` の warning 7 件）。新しい行：ERRATA `APP.cadet-comm-practice-ch-sim`（W02 が見つけた。P3 で W07a が閉じた）。

台帳（P2）：閉じた行は ERRATA `APP.style-md`（W04b。署名は W12）。RULINGS の C の 42 行は用語を表の正式名にそろえ、閉じる単位を本文の単位へ移した（W04。`R.aoa-term` は所有者の確認待ちで W04 のまま）。UNVERIFIED に 10 行（W06：`U.jst-dst`・`U.alcohol-notice`・`U.radio-license`・`U.words-japan`・`U.circling-japan`・`U.metar-japan`・`U.charts-japan`・`U.msas`・`U.ws-alert-japan`・`U.vmc-ad-airports`。どれも W37）。COUNTS `jur.unverified` の数え直し 12 → 15、`book.terms` に表の語の数（統合）。署名待ちは 8 行（`validate.mjs` の warning 8）。

台帳（P3）：W07a・W07d・W07b・W07c・W07f・W11・統合のパッチをこの順に取り込んだ（`apply-patches.mjs --write` → `validate.mjs` ok）。ERRATA の教科書の行は 79 行のうち 77 行が閉じた（残りは `T.overview.T2`＝W10・`T.human.T8`＝W28）。W07a〜c・W07f・W11 の行で開いているのは `R.tem-words`（W32 の節を待つ）だけ。新しい行：ERRATA に W07d の 31 行（`SYNC.lesson-links-ops` は fixed、30 行は open）。統合のパッチ（`reports/integrate-P3.ledger.json`）：W07b が直した `ifr.instr`・`ground.start`・`emg.elec` の分を W07a の閉じた行の `where` に、`T.navigation.T2` の一次資料を AIM 6-3-2 に、COUNTS の `errata.sync`・`book.lessons` に note。署名（`checkedBy`）待ちは 116 行（`validate.mjs` の warning 116。W12）。台帳の道具の直し：`add` の行をあとの単位が閉じても、流し直して「同じ id の 2 つめの行」と見なさない（W02・W06 の `add` の行で `validate.mjs` が error 5 を出していた）、単位の形に `W07f`。

台帳（P4）：W09 → W08a → W08b のパッチをこの順に取り込んだ（`apply-patches.mjs --write` → `validate.mjs` ok）。閉じた行：ERRATA `APP.london-equivalent`（W09）、RULINGS の A の 13 行（W08a：`R.tempo-length`（裁定を見直した：米国も 1 回 1 時間未満で違いではない）・`R.taf-groups`・`R.metar-frequency`・`R.gust-criterion`・`R.readback`・`R.hold-short`・`R.nordo-landing`・`R.vfr-fuel-law`・`R.right-of-way`・`R.alcohol`〔安全〕、W08b：`R.pattern`・`R.nordo-ifr`・`R.approach-ban`）。`R.fuel-reserve`・`R.hold-numbers` は囲みを置いた note だけ（基礎教材の側が残る）。W08c は閉じる行がない。署名（`checkedBy`）待ちは 130 行（`validate.mjs` の warning 130。W12）。

## 次（R1 の残り。DESIGN 7.2 の依存の順）

1. 依存がそろっているもの：**W10** 序部（W04・W06・W09）。`basics`・`english` を `book-0.js` に `before: 'aero'` で（`intro`・`basics`・`english`・`sim` の順になる）。登録するコミットで `#aero.lift` 3.2 → 5.2・`ORDER`・`COUNTS`・見出しの章と節の数、`english` の `DROP_CHAPTERS`（CADET）。序部の節の囲み（`basics.alt`＝`alt.transition`、`basics.units`＝`alt.unit`、`basics.time`＝`time`、`basics.rules`＝`ir.need`）を同じコミットで置く（`jur.test.mjs` の ① が確かめる）。図 `courseMap` と `intro.use` を 8 部の形に描き直す（`check-path.mjs` の `forward-ch-ref` 24 のうち 12 はこの図の `{ch:}`）。`intro.cert` の表と図 `certLadder`（「多発の等級：実地試験だけ」は 61.63(c) の教官の裏書きを書いていない）を序部で日米の囲みに作り直す。ERRATA の W10 の行（`T.overview.T2` など）。
2. 最後に **W12** R1 の確かめ：P1〜P4 で閉じた行の `checkedBy`（130 行）、〔安全〕の行の安全レビュー（`T.aero.T-3`・`T.instruments.E-T2`・`T.weather.T2`・`R.cross-check`・`SYNC.stall-recovery` と a7・a8 のブリーフ・CADET の教官の台詞、`R.failed-engine-id` の教科書の側、`kiso-errata.js` の〔安全〕の 9 項目、`R.alcohol` と `fuel.vfr` の囲み）、日本の法令レビュー（`kiso-errata.js` の日本の法令の項目）、変えた図 30 枚の目視の記録、出力の作り直し。
3. R1 の確かめの対象の外で、いつでもできるもの：**W07d の 2 回目**（W07d が足した ERRATA の open の 30 行。課目の段階・採点・`school.js`・`physics.js`・`sanford-course.js`・CADET の `checklists-archer.js`・`atc.js`。統合役の判断で `unit` は W07d のまま。〔安全〕の `SYNC.e3-glide-entry`・`SYNC.i2-upset` は R3 の安全レビュー W36 までに）。

書く単位は、用語を `FL.terms`（`find`・`firstUse`）から、日米の数字を `FL.jur` から取る（STYLE の「用語」「日米の書き分け」）。節を書く単位は、その節が 3.4 の「囲みの節」なら、登録するコミットで囲みを `bk.jur(...ids)`（違いがないときは `bk.same(id)`）で置く（数字を手で書かない。`flight-lab/test/jur.test.mjs` の ① が、本にある囲みの節に項目の囲みがあり、ほかの節にないことを確かめる）。章末の「この章の日米の違い」は FLIGHT LAB の `pages.js` と TEXTBOOK の `render.js` が自動で出す。付録の対照表 `FL.book.jurAppendix()` のページは W47。

ファイルを足す単位は、`flight-lab/src/modules.mjs` の `MODULES` に 1 行足し、読ませない製品の `FL_LEAVE_OUT`（`textbook/build.mjs`・`cadet/build.mjs`）か `flight-lab/test/load.mjs` の `NODE_LEAVE_OUT` に理由つきで書き、開発用 `flight-lab/src/index.html` にも `<script src>` を足す（テストが一致を確かめる）。TEXTBOOK に入るファイルなら `textbook/test/build.test.mjs` の `FL_MODULES.length`（今 17）を直して `TEST-CONSTANTS.md` に 1 行。新しいテストのファイルは、FLIGHT LAB の `package.json` の `test` と `test:fast`、CADET の `test:fast` にも足す（CADET の `test` は `test/*.test.mjs`）。台帳はパッチ `reports/<UNIT>.ledger.json` で（統合役が `apply-patches.mjs --write` → `validate.mjs`）。

## 未解決のこと

- **確かめ役の署名待ち**：130 行（W12）。〔安全〕の行は安全レビューが、日本の法令の項目（`kiso-errata.js`）は日本の法令レビューが署名する。
- **所有者に確かめること**（`DECISIONS.md` の「3 の補足」）：用語の表の正式名「迎え角」（例は「迎角」）と「キャブレターヒーター」（例は「気化器加熱」）。例の語を選ぶなら `book-terms.js` の `aoa`・`carb-heat` の `formal` と `common` を入れ替え、`terms.test.mjs` の 2 行を直す。あわせて `U.jcab-term-names`（耐空性審査要領での V<sub>MC</sub> と accelerate-go distance の日本語名）。
- **用語の表が引く条で、写していないもの**：施行規則第 97 条・第 145 条・第 166 条の 4（8 か所。表のテストは「写しなし」と数えるだけ）。W37 が写しに足す。
- **各章の初出の検査の範囲**（W04 の報告 5 の 6）：`check-style.mjs` の初出の形の warning 574 は、通称のない語（離陸・失速など）も数える。W24・W50 の前に、どこまでを初出の形にするかを決める（W01 の道具の持ち主と W24）。
- **`FL.jur` の文の語**：囲みの短い文は「管制圏」「空港」など表の通称（短い形）を使う所がある（表の正式名は「航空交通管制圏」「空港等」。施行規則の言い方の引用は「到着予定時刻」のまま）。W08 が置いた囲みで見えた語のずれ：`law.rules` の本文「優先権」と囲み「進路権」（表の正式名）、`wx.shear` の「ウインドシア」と囲み「ウィンドシャー」、`wx.brief` の「NOTAM」と囲み「ノータム」、`vmc`・`vmc.ad`・`speed`・`aerobatic` の日本の欄の「管制圏」、`vmc.ad` の「空港など」、`nordo.ifr` の本文の表（指示された経路 → 予告された経路）と囲み（割り当て → 予定と言われた経路）。本文をそろえるのは W24（序部・第 1 部）・W30（第 4 部）、`FL.jur` の文を表の正式名にするかは W06 の持ち物（W24 と決める）。`FL.terms` に「磁航路」（magnetic course）がない（本文と `FL.jur` は使う。W04）。`sanford-course.js` の口述の解説は VFR の巡航高度を「磁針路」で書く（91.159 は磁航路。W50）。
- **NOTES.md 1 の「アプリ側」の食い違い**：課目の説明と採点・`school.js`・`physics.js`・`sanford-course.js`・CADET のチェックリストと ATIS の分は、W07d が ERRATA に 30 行足した（open。上の「次」の 3）。英語交信と学科テストの解説・画面の言葉は W50、操作ガイド・使い方・JIS 配列は W49 が、単位の始めに NOTES.md 1 を読み、直すものを ERRATA にパッチで足す（NOTES.md の 5）。
- **古いドキュメントの数**：ほかのドキュメントの「120 節」「7.1 MB」・`MAX_BYTES` の記述など。W49（ERRATA `APP.old-doc-numbers`）。P2 で直したもの：`flight-lab/README.md` の「テスト 48 件」とテストのファイルの手書きの列（`npm test` と `package.json` を指すようにした）、`textbook/README.md` の読み込みのファイルの列（16 ファイル、共有の列から）。
- **DESIGN の数え方の違い**（W03 の `COUNTS.json` の `match: false`）：1.2 の「基礎教材をもとにした新しい節 67・その他 16」（数え直し 75・8）、10.4 の見出し 74 件と表の 80 行、4.2・8.1 の「描き直す図 約 55」（56）。2.4 の A/B/C の数には数え直しを書き足した（DESIGN の付記 2）。
- **e-Gov にないもの**（〔要確認〕のまま）：告示の空港・「大臣が定める時間」・灯火信号と連絡方法・VFR のコード・ADS-B・実地試験の許容幅、飲酒の通達のその後の改正、電波法（第 39 条・第 40 条）は写していない。W37 と `UNVERIFIED.json`。
- **FLIGHT LAB のブラウザのテスト 15**（基礎教材の記録を localStorage から読む）：前の基準の実行（8382341）で 1 回失敗していた（headless Chromium で file:// の localStorage が消えることがある）。P1・P2・P3 の実行では通った。また出たら記録する。
- **P4 で増えた未解決**（[`reports/integrate-P4.md`](reports/integrate-P4.md) の 6）：
  - 検査の道具（W01 の持ち主と W24 で決める）：`check-style.mjs` の初出の形（`first-use-form`）が日米の囲みの中の語（`FL.jur` の正式名）を章の初出と数える（+61。囲みは本文の横の要素で「（通称、English）」を書けないので、囲みを初出に数えないかを決める）。`.jur-v`（`bk.same` などの「題：値」の行）を文として調べる（`ifr.rules` に long-sentence 1・taigen-dome-label 1）。`check-path.mjs` の `forward-ch-ref` が序部の地図の図 `courseMap` の `{ch:}`（12）を数える（W10 が描き直すときに決める）。`check-egov.mjs` の日付の誤検出は統合で直した。
  - `emg.basic` の「危難の場合の日本の決まり」（航空法第 74 条・第 75 条）：47 項目にも写しにもない。W37 が写したあとで囲みの形を決める（DESIGN の付記 5）。
  - 節のデータ `scope`：囲みを置いた節も含め、今の 154 節は `scope` を持たない（`check-jurisdiction.mjs` の `missing-scope`。節の本文を書く単位が付ける）。
  - 判断 8 は推奨（そろえる）で進めた：段階の題は部の番号（第 1〜6 段階）。所有者が別の形を選べば題の文字だけを直す。
- **P3 で増えた未解決**（[`reports/integrate-P3.md`](reports/integrate-P3.md) の 6）：
  - 検査の道具（W01 の持ち主）：`check-form.mjs` が本文の途中の `bk.us`（米国だけの表を囲む使い方）を「ここが大切より前の日米の囲み」と数える／`check-figures.mjs` の shape-outside 6（vorRadials・holding の図いっぱいの背景の塗り。意図した描き方）／`check-jurisdiction.mjs` が hf の章の生理の事実の出典「（AIM 8-1-x）」25 か所を規則の言葉と数える（統合役の判断：検査は厳しいままにし、W20 が hf を書き直すときに出典を `bk.src` と章の出典にまとめる）。
  - 用語の表にない語（W07a）：逆転錯覚・エレベーター錯覚・墓場のスピン・ブラックホール錯覚・デトネーション・最大運用運動速度（VO）・終極荷重・動圧。JCAB の表記を確かめて `FL.terms` に足す（W04 の持ち物。W24 の前に）。
  - 一次資料で確かめきれていないもの：Seminole の片発の上昇率と実用上昇限度（参考値・二次資料。W31 が POH で）、PA-44-180 の型式証明の FAR 23 の改正の版（W31）、AC 61-136B が現行か（`T.overview.T2`。W10）、待機の時間の ICAO と FAA の比べ方（`K.ifr.K-4`、DESIGN の付記 4。W30・W41）、`kiso-errata.js` の〔要確認〕（日本の AIP の周回進入・告示の空港・7600 と灯火信号・飲酒の通達の改正・技能発揮訓練の適用時期・日本の耐空性の基準の値。W37）。
  - 写していない条（W11）：航空法第 73 条・施行規則第 199 条（e-Gov の API で同じ版を読んだ。W37 が写しに足すと、`flight.test.mjs` の訂正のテストがリンクも照らす）。
  - AC 120-109A と課目の採点（W07d の 5 の 1）：AC は失速の手前からの回復の評価に決めた高度の損失を使わないことを勧めるが、課目 a7・a8・c1 は「失った高度 300 ft 以内」で採点する（DESIGN 10.5 は採点を変えない）。W12 の安全レビューか所有者が決める。
  - 出典の候補（W07c）：`me.perf` の公表値の出どころ（Aviation Consumer 誌・Jane's）は本文に名前だけ。二次資料なので `R` に足さなかった（W31 が POH に替える）。

