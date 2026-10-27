# 統合 P3（W07a・W07b・W07c・W07f・W07d・W11）— 報告

単位：R1 の P3 の統合役（DESIGN 7.1「統合」・7.3）。6 つの単位の報告と差分を DESIGN 7.2 と照らし、小さな穴を埋め、P3 に属する「ほかの単位への依頼」を当て、新しいファイルを共有の列に登録し、台帳のパッチを取り込み、3 製品のテストを流してから、単位ごとにコミットして push した。`flight-lab/kiso/` には触っていない（git の差分なし、`check-provenance.mjs` error 0）。日付 2026-10-27。

## 1. 単位ごとの確かめ（DESIGN 7.2 と報告の主張）

| 単位 | DESIGN 7.2 の「できたことの確かめ方」 | 結果 |
|---|---|---|
| W07a〜c（と W07f） | 台帳の教科書の行が閉じる。CADET の決め打ちの文が変わらない | ERRATA の教科書の行（`book: textbook`）は 79 行のうち 77 行が閉じた。開いている 2 行は W07 の行ではない（`T.overview.T2`＝W10、`T.human.T8`＝W28）。W07a・W07b・W07c・W07f の `unit` の行で開いているのは `R.tem-words`（kiso10.23 から書く節＝W32 を待つ）だけ。CADET が文字で決めている文（6.2 の決まり 9）は CADET のテストが通る（`aero.lift`・`aero.forces`・`ops.trim`・`me.basics`・`ifr.np`・`nav.divert`・`hf.self` の 91.17・`perf.fuel` の 91.151 など）。`check-jurisdiction.mjs` の `us-rule-outside-us` は全体で 36（残りは `intro.cert` の表 11 と hf の章の出典「（AIM 8-1-x）」25。下の 6）。図の中の米国の規則の言葉はゼロ。`check-figures.mjs` error 0・warn 6（既知のはみ出し 7 枚はすべて OK）、`check-questions.mjs` error 0、`check-photos.mjs` error 0 |
| W07d | FLIGHT LAB の課目のテストと CADET の台詞のテスト | FLIGHT LAB の新しいテスト（回復の順番と c1 のリンク）、CADET の新しいテスト（教官が AFH の順番で言う・図は `aero.stall` のまま）と `lessonSections` の 2 行、操縦席の 1 行。`syllabus.js` の差分を読み、採点（300 ft・二次失速）と段階の名前が変わっていないことを確かめた。`book` は 51 → 55 本（後ろに足しただけ） |
| W11 | 原本の差分ゼロ、`preview.html` との比較、ブラウザのテスト | `git status -- flight-lab/kiso` は空、`flight.test.mjs` の原本のハッシュのテスト、FLIGHT LAB のブラウザのテスト「基礎教材」（全 393 節の訂正の位置・図の id・写真の alt・第 5 章の作り直した解答・`preview.html` との 2 か所）が通る（登録のあと） |

抜き取りで確かめた一次資料（統合で取り直した）：FAA SAIB CE-10-11（faasafety.gov の PDF：題「Electrical: Fire Hazard in Resetting Circuit Breakers」・2009-12-23・勧め 2 の a〜c）、NWS Instruction 10-813（2024-10-30 版）、NWS Melbourne「The Florida Rain Machine」、FAA AIM 6-3-2（「Continue squawking assigned Mode A/3 discrete code/VFR code … unless instructed to do otherwise」は 6-3-2 にある）。

## 2. 統合でしたこと（当てた依頼・埋めた穴）

- **共有の列への登録**（DESIGN 6.2 の決まり 7。W11 の依頼）：`flight-lab/src/modules.mjs` の `kiso/kiso-data.js` の次に `kiso-errata.js`、開発用 `flight-lab/src/index.html` に同じ 1 行、`textbook/build.mjs` と `cadet/build.mjs` の `FL_LEAVE_OUT` に理由つき（どちらも基礎教材のページがない）。FLIGHT LAB の Node のテストは読む（DOM を使わない）。TEXTBOOK は読まないので `FL_MODULES.length`（16）は変わらない。DESIGN 3.1 に 1 行。
- **出典のリンク**（W07a・W07b の依頼、DESIGN 6.1「URL は章の出典へ」）：本文が名前で引く一次資料 3 つを、URL と題と日付を取り直して確かめてから `book-core.js` の `R` に足し、章の refs に入れた：`saib1011`（FAA SAIB CE-10-11 → `sys`・`ground`・`emg`）、`nwsi10813`（NWSI 10-813 → `wx`）、`flRain`（NWS Melbourne → `wx`）。W07c の任意の `R.seminoleSpec`（Aviation Consumer 誌の読者の手紙）は二次資料なので足していない（W31 が POH に替える）。
- **テストの決め打ちの数**（決まり 11）：`textbook/test/load.mjs` の `COUNTS.refs` 202 → 205（統合の 3 つ。W07a と同じコミット）→ 211（W07b の章末の出典 +4 と、SAIB を `ground`・`emg` に +2）。CADET の `lessonSections` の 2 行（W07d）、FLIGHT LAB のブラウザのテストの第 5 章の解答の比べ方（W11）。`TEST-CONSTANTS.md` に 4 行。
- **CADET の `KNOWN_OTHER_CHAPTER`**（W07a・W07d の依頼）：`comm.practice` を外して空にした（W07a が `{ch:sim}` を `bk.sim` に移した。CADET の「（別の章）」はゼロ）。
- **台帳の道具**（`ledgers/src/schema.mjs`、統合役の持ち物）：
  - **取り込みを流し直すと `validate.mjs` が error 5 を出す不具合を直した**：`add` の取り込み済みの判定が「行が全部の項目でパッチのとおり」だったので、あとの単位がその行を閉じたり `note` を書いたりすると（W07a が W02 の足した `APP.cadet-comm-practice-ch-sim` を閉じた・W11 が W06 の足した `U.alcohol-notice` など 4 行に `note` を書いた）、同じ id の 2 つめの行と見なした。`set` と同じく、`note` のある `add` は行の `note` がその `note` で始まることで見分けるようにした。流し直して 0 行、`validate.mjs` error 0。
  - 単位の形を `W\d\d[a-f]?` に（W07f の依頼）。`reports/W07f.ledger.json` の頭に `"unit": "W07f"` を足した。`ledgers/README.md` の 2 と 5 に書いた。
- **台帳の取り込み**：W07a と W07d → W07b → W07c → W07f → W11 → 統合の順に `apply-patches.mjs --write`（各回 `validate.mjs` ok）。統合のパッチ `reports/integrate-P3.ledger.json`（6 行）：W07b が報告に書いた分（`ifr.instr`・`ground.start`・`emg.elec`）を W07a の閉じた行（`T.instruments.E-T2`・`R.cross-check`・`T.systems.T9`）の `where` に、`T.navigation.T2` の一次資料を AIM 6-3-1 → 6-3-2 に（W07b の報告 6）、COUNTS の `errata.sync`（SYNC の行 5 → 36）と `book.lessons`（`book` 51 → 55 本）に note。
- **単位の持ち主の判断**（W07d・W07f の依頼）：W07d が足した open の 30 行は `unit` を W07d のまま（W07d の 2 回目。R1 の確かめの対象の外。〔安全〕の 2 行は W36 までに）。W07f が閉じた行の `unit` は元の単位のまま（`by` が W07f）。
- **DESIGN.md**（統合役の持ち物。付記 4 に記録）：3.1 に `kiso-errata.js`、7.2 の W07a〜c の行に W07f、10.5 の 1 行目の `ops.slow` → `ops.stall`（W07d）、3.3 と 10.1 の navigation T2 の AIM 6-3-1 → 6-3-2（W07b）、10.2 の ifr K-4 の直し方に〔要確認〕（W11：計る脚が違う可能性）。付記 4 に、human T3・T11 が誤りではなかったこと（W07a・W07c）、米国の TEMPO の直し、〔安全〕⑤のコミット、W07d の 30 行の扱い。
- **検査の道具**（W07a の依頼、W08 の前に）：`check-style.mjs` が日米の囲みの見出し（`.jur-h`「米国では」）と足（`.jur-foot`：法令の版とリンク）を文として数えないようにした。`selftest.mjs` に例を 1 つ（30 → 31 passed）。

## 3. テスト（コマンドと結果）

| コマンド | 結果 |
|---|---|
| `bash textbook/rewrite/tools/testall.sh …/scratchpad/testall-P3`（最終の木の写し。写しと作業の木の違いは PROGRESS.md とこの報告だけ） | FLIGHT LAB **80/80**・TEXTBOOK **21/21**・CADET **266/266** |
| P2 の実行（`…/scratchpad/testall-P2`） | FLIGHT LAB 76/76・TEXTBOOK 21/21・CADET 265/265 |
| P1 の実行（`…/scratchpad/testall-P1b`） | FLIGHT LAB 56/56・TEXTBOOK 21/21・CADET 259/259 |
| 前の基準（8382341、`…/scratchpad/testall-base`） | FLIGHT LAB 51/52（ブラウザのテスト 15。P1 から通っている）・TEXTBOOK 18/18・CADET 256/256 |
| 登録の前の木の実行（`…/scratchpad/testall-P3pre`、参考） | FLIGHT LAB 78/80（「modules: one list」と基礎教材のブラウザのテスト：`kiso-errata.js` が列にない）・TEXTBOOK 18/21（`COUNTS.refs`）。どちらも統合の登録と定数の直しで通った（新しい失敗を根で直した） |
| `node textbook/rewrite/combined/ledgers/validate.mjs` | ok — 0 error、116 warning（署名待ち 116 行） |
| `node textbook/rewrite/combined/ledgers/apply-patches.mjs`（流し直し） | 0 行（300 行はもう台帳にある） |
| `node textbook/rewrite/combined/tools/selftest.mjs` | 31 passed |
| `node textbook/rewrite/combined/tools/check-all.mjs --no-browser` | 19 の検査が動く（報告だけ。error 560：ledgers の open 151・署名待ち 114、jurisdiction の `missing-scope` 154 と `us-rule-outside-us` 36、jur の囲み 60（W08）、style 22、chapter-refs 8（`intro` の章＝W09・W10）など） |
| `node textbook/rewrite/combined/tools/check-figures.mjs`（Chromium 390 px） | error 0・warn 6（shape-outside：vorRadials・holding の背景の塗り） |
| `node textbook/rewrite/combined/tools/check-provenance.mjs` | error 0（原本 264 ファイルの sha256、由来表 393・376・161・85） |
| `node textbook/rewrite/sources/egov/check.mjs` | pass 1456 / fail 0 |
| 途中のコミットの木（各コミットを `git archive` で取り出し、`cadet/node_modules` をつないだもの） | 3 製品の速いテストと TEXTBOOK の `npm test`：下の 4 の表 |

増えたテスト：FLIGHT LAB 76 → 80（W07d の 1・W11 の 3）、CADET 265 → 266（W07d の 1）、TEXTBOOK 21 のまま（決め打ちの数を直しただけ）。前からの失敗はない。

出力の大きさ（テストの写し）：`FLIGHT-LAB.html` 9,527,099 → 9,605,105 バイト（+78 KB：`kiso-errata.js` 39 KB と本文・図。上限 12 MiB＝12,582,912 バイトのテストは通る）、TEXTBOOK のテストが作る `test-output/TEXTBOOK.html` 4,572,526 バイト（`outputs/` のものは作り直していない）、`CADET.html` 9,274,905 バイト。

## 4. コミット（単位ごと。どれも上の全体のテストの後）

1. `9e69af7` W07a と W07d：教科書の第 1 部の誤り（`book-1.js`・`book-2.js`・`book-comm.js`）と課目の失速の回復の順番（`syllabus.js`）・c1 のリンク、W07d のテスト（FLIGHT LAB 1・CADET 2）、`KNOWN_OTHER_CHAPTER` を空に、統合の出典 3 つ（`book-core.js` の `R` と `sys`・`wx` の refs、`COUNTS.refs` 205）、台帳の道具の直し（`schema.mjs`・README）、W07a・W07d のパッチを当てた台帳、報告。速いテスト：FLIGHT LAB 75/75・TEXTBOOK 21/21・CADET 245/245
2. `b7b1cd4` W07b：`book-3.js`・`book-4.js`（`ground`・`emg` に SAIB の refs）、`COUNTS.refs` 211、台帳、報告。75/75・21/21・245/245
3. `b4ca4c2` W07c：`book-5.js`、台帳、報告。75/75・21/21・245/245
4. `0918200` W07f：`book-figs.js`・`book-photos.js`・`PHOTO-CREDITS.md`・`quiz.js`、台帳、報告。75/75・21/21・245/245
5. `ca4e63a` W11：`kiso-errata.js`・`pages.js`・`style.css`・2 つのテスト・`ERRATA-FOR-WORD.md` と登録（列・開発用ページ・2 つの leave-out）、台帳、報告。78/78・21/21・245/245
6. 統合（このコミット）：統合のパッチと台帳、DESIGN の付記 4、`check-style.mjs`・`selftest.mjs`、PROGRESS、この報告

途中のコミットは、コミットする前に index を `git checkout-index` で書き出した木で確かめた（上の数。`validate.mjs` も ok）。

途中のコミットの共有のファイル（`load.mjs` の `COUNTS.refs`・`TEST-CONSTANTS.md`・`flight.test.mjs`・台帳）は、その単位までの形を作ってコミットした（最後の形は作業の木と同じ）。W07a と W07d は 1 つのコミットにした：DESIGN 6.1 が課目のブリーフの直しを「合本の〔安全〕⑤の直しと同じコミットで」と決めていて、⑤（失速の回復で自動操縦を最初に切る）の本文は W07a の `aero.stall` にあるため。出力（`FLIGHT-LAB.html`・`CADET.html`）はテストで書き換わっているが、コミットしていない（版の最後に W12 が作り直す）。

## 5. 台帳の行（この統合で触った行）

- 単位のパッチ（W07a 60・W07b 21・W07c 14・W07d 33・W07f 28・W11 59 行）：報告のとおり。P3 で閉じた行：ERRATA 89 行（教科書 77：fixed 74・wontfix 1（`T.overview.T3`）・not-error 2（`T.human.T3`・`T.human.T11`）、基礎教材 3：`K.overview.K1`・`K.aero.K-1`（fixed）・`K.ifr.K-6`（wontfix）、アプリと課目 9：`APP.lesson-c1`・`APP.kiso-svg-ids-alt`・`APP.cadet-comm-practice-ch-sim`・`SYNC.stall-recovery`〔安全〕・`SYNC.x3-short-field`・`SYNC.comm-tower-sim`・`SYNC.comm-option-sim`・`SYNC.glide-model`・`SYNC.lesson-links-ops`）、RULINGS 19 行（fixed）。新しい行：ERRATA 31（W07d）。
- 統合のパッチ：ERRATA `T.instruments.E-T2`・`T.systems.T9`・`T.navigation.T2`、RULINGS `R.cross-check`、COUNTS `errata.sync`・`book.lessons`。

**R1 が閉じるはずでまだ開いている行**（`unit` が R1 の単位で status が open）：

| 台帳 | 単位 | 行 |
|---|---|---|
| ERRATA | W09 | `APP.london-equivalent` |
| ERRATA | W10 | `T.overview.T2`（AC 61-136B が現行か）・`K.overview.K2`・`K.overview.K3`・`K.overview.K4`・`K.overview.K6`・`APP.kiso-cover-airline` |
| ERRATA | W07d | open の 30 行（W07d の 2 回目。R1 の確かめの対象の外：上の 2） |
| RULINGS | W08 | A の 18 行（囲みを置いて閉じる。`R.tempo-length` は裁定の見直し） |
| RULINGS | W10 | `R.pic-meaning`・`R.pf-term`・`R.ifr-terms` |
| RULINGS | W04 | `R.aoa-term`（所有者の確認待ち） |
| RULINGS | W07c | `R.tem-words`（図 `tem`・学科テスト・本文はそろった。kiso10.23 から書く節＝W32 が残る） |
| UNVERIFIED | W10 | `U.ana-procedure`・`U.ana-jcab-route`・`U.jcab-exam-language`・`U.faa-written`・`U.us-student-cert`・`U.london-icao`・`U.ac61-136` |
| UNVERIFIED | W04 | `U.jcab-term-names`（所有者の確認待ち） |
| CONCEPTS | W10 | `C.flight-rules-conditions`・`C.speed-kinds`・`C.time`・`C.pressure-altitude`・`C.pic-vs-captain` |
| PROVENANCE | W10 | 序部に入る基礎教材の 39 行 |

閉じたが確かめ役の署名（`checkedBy`）を待つ行：116（W12）。

## 6. 未解決のこと

`PROGRESS.md` の「未解決のこと」と同じ。P3 で増えたもの：

- **検査の道具**（W01 の持ち主・W08 の前に決める）：`check-form.mjs` が本文の途中の `bk.us` を「ここが大切より前の日米の囲み」と数える（米国だけの表を囲む使い方を認めるか）。`check-style.mjs` は囲みの値の行（`.jur-v`「題：値」）を文として調べる（体言止めと数える）。`check-figures.mjs` の shape-outside 6（図いっぱいの背景の塗りを数えない方法か、W12 の目視の記録）。`check-jurisdiction.mjs` が hf の章の出典「（AIM 8-1-x）」25 か所を規則の言葉と数える：**統合役の判断**で検査は厳しいままにし、W20 が hf を書き直すときに出典を `bk.src` と章の出典にまとめる。
- **用語の表にない語**（W07a）：逆転錯覚・エレベーター錯覚・墓場のスピン・ブラックホール錯覚・デトネーション・最大運用運動速度（VO）・終極荷重・動圧（W04 の持ち物。JCAB の表記を確かめて足す。W24 の前に）。
- **一次資料で確かめきれていないもの**：Seminole の片発の上昇率と実用上昇限度（参考値・二次資料。W31）、PA-44-180 の型式証明の改正の版（W31）、AC 61-136B が現行か（W10）、待機の時間の ICAO と FAA（`K.ifr.K-4`。W30・W41）、`kiso-errata.js` の〔要確認〕（W37）、写していない航空法第 73 条・施行規則第 199 条（W37）。
- **AC 120-109A と課目の採点**（W07d の 5 の 1）：課目 a7・a8・c1 の「失った高度 300 ft 以内」の採点を見直すか（W12 の安全レビューか所有者）。
- **〔安全〕の行の安全レビュー**（W12）：`T.aero.T-3`・`T.instruments.E-T2`（`sys.compass`・`sys.g1000`・`ifr.instr`）・`T.weather.T2`・`R.cross-check`・`SYNC.stall-recovery`（a7・a8 のブリーフ・`stallRecovery`・CADET の教官の台詞）・`R.failed-engine-id` の教科書の側（`me.oei`）・`kiso-errata.js` の〔安全〕の 9 項目。

## 7. ほかの単位への依頼

- **W08**：`aero.turn` に `bk.jur('aerobatic')`、`nav.log` に `bk.jur('cruise', 'fuel.vfr')`（`R.fuel-reserve` の A の分）、`ops.pattern` に `bk.jur('pattern')`（`R.pattern`）、`me.perf` に `bk.jur('multi.rating')`、`R.nordo-landing` の日本の囲み（q_radio は米国の範囲のまま）、`R.tempo-length` の裁定の見直し。囲みの値の行の文体の扱いを W01 の持ち主と決める（上の 6）。
- **W09**：直書きの「第 N 章」は `intro` の 8 か所だけ（`intro.use` 6・`intro.study` 1・`intro` の用語 1）。`book-3.js`・`book-4.js`・`book-5.js` はゼロ。`sim` の例の `{ch:tl}` はそのまま正しい。
- **W10**：`T.overview.T2`（AC 61-136B）、`intro.cert` の表（米国の規則の列 11）と図 `certLadder` を序部で日米の囲みに作り直す。
- **W12**：上の 6 の安全レビュー、閉じた 116 行の `checkedBy`、日本の法令レビュー（`kiso-errata.js` の日本の法令の項目）、変えた図 30 枚の目視の記録、出力の作り直し。
- **W31**：Seminole の POH 第 5 章（`me.perf` の参考値）、型式証明の改正の版（`me.vmc`）、`R.failed-engine-id`・`R.zero-sideslip`・`R.counter-rotation` を閉じる。
- **W37**：航空法第 73 条・施行規則第 199 条の写し、UNVERIFIED の W11 の note の 5 行。
- **W04**：上の 6 の語を `FL.terms` に。
