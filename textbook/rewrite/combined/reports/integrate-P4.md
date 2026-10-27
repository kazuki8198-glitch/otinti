# 統合 P4（W09・W08a・W08b・W08c）— 報告

単位：R1 の P4 の統合役（DESIGN 7.1「統合」・7.3）。4 つの単位の報告と差分を DESIGN 7.2 と照らし、小さな穴を埋め、P4 に属する「ほかの単位への依頼」を当て、台帳のパッチを取り込み、3 製品のテストを流してから、単位ごとにコミットして push した。W09 の構成の変更は単独のコミットにし（DESIGN 7.3）、そのあとに囲み（W08a・W08b・W08c）、最後に統合のコミット。`flight-lab/kiso/` には触っていない（git の差分なし、`check-provenance.mjs` error 0）。日付 2026-10-27。

## 1. 単位ごとの確かめ（DESIGN 7.2 と報告の主張）

| 単位 | DESIGN 7.2 の「できたことの確かめ方」 | 結果 |
|---|---|---|
| W09 構成の変更 | 3 製品の全テスト（定数を意図して直したことをメッセージと `TEST-CONSTANTS.md` に） | 差分を読んで報告の表と照らした：`FL.book.addPart`（誤りの扱い 3 つ・例外のとき `PARTS` は変わらない）、`book-0.js`（新）が p0 を p1 の前に、`intro` は `book-1.js` の中で部だけ p0、`sim` は `book-5.js` の中で `before: 'aero'`・部 p0（節 ID・章 ID は変わらない）。直書きの「第 N 章」は `check-chapter-refs.mjs` で 0（P3 は 8）。p1・s0 の題に「ロンドン相当」なし。共有の列 `modules.mjs` と開発用 `index.html` に `book-0.js`（3 製品が読む。leave-out なし）。テストの定数 8 行が `TEST-CONSTANTS.md` にある。`#aero.lift` は 5.2 ではなく **3.2**（序部が 2 章の間。W10 で 5.2）で、DESIGN 6.1 の数との違いは付記 5 に書いた。ほかに「6 部」「第 27 章」「第 0 段階」が残る所を探した：残りは記録の文書（`NOTES.md`・`PLAN.md`・`proposals/`・`textbook/rewrite/PROGRESS.md`）だけ |
| W08a〜c 囲みを置く | 取り違えのテスト（囲みの分）が通る。行き先のないリンクがゼロ | `check-jur.mjs`：① 囲み found 60・missing 0・pending 13（まだない節）、`box-number` 0。差分は囲みを呼ぶ行（`${bk.jur(…)}`・`${bk.same(…)}`）だけ：W08 の行を抜いた写しを作ると、`book-2/3/4.js`・`book-comm.js` は HEAD とバイトまで同じ、`book-1/5.js` は W09 の行だけが残る（これでコミットを分けた）。手で書いた `{ch:}`・`bk.see` は 0。3 製品の「（別の章）なし」のテストと FLIGHT LAB の「every cross-link resolves」が通る。CADET の `jur.test.mjs`（日本の側なし・米国の列が残る）が通る |

## 2. 統合でしたこと（当てた依頼・埋めた穴）

- **章末の「この章の日米の違い」**（W08a・W08b・W08c の依頼、DESIGN 3.2「章末」）：FLIGHT LAB の `flight-lab/src/pages.js` と TEXTBOOK の `textbook/src/render.js` の章末（確認問題の後・対応する課目の前）で `FL.book.jurTable(ch.id)` を出す（囲みのない章には出ない）。TEXTBOOK の用語の表より後に置いた（`content.test.mjs` が章末の最初の表を用語の表として数える）。テスト：TEXTBOOK `content.test.mjs` に新しいテスト（囲みのある章だけに 1 回、確認問題の後・課目の前、最後の節に出る）、FLIGHT LAB `browser.test.mjs` の教科書の部分に、`aero` の最後の節で表が 1 つ・確認問題の後・`jurTable` と同じ行。CADET は章末を描かない。使い方（`FLIGHT-LAB-使い方.md`）と `textbook/README.md` に 1 行。
- **3.4 のテスト ①**（W08b・W08c の依頼）：`flight-lab/test/jur.test.mjs` に「本にある囲みの節にはその項目の囲みがあり、項目の `boxes` にない節には囲みがない」（今 60 か所）。これからの単位が囲みの節を登録するとき、囲みを忘れると落ちる。
- **`FL.jur` の直し**（`flight-lab/src/book-jur.js`。W08b・W08c の依頼。一次資料を統合で読み直した）：
  - `cruise` の米国の欄「磁針路 0〜179°…」→「**磁航路** 0〜179°…」。14 CFR 91.159(a)「On a magnetic course of zero degrees through 179 degrees」（eCFR の API、2026-10-23 の版、2026-10-27 に取得）。本文 `nav.log` と DESIGN 3.4 の表はもとから磁航路（`FL.terms` の「磁針路」は magnetic heading）。
  - `multi.rating` の日本の欄に航空法施行規則第 53 条**第 2 項**（操縦士の技能証明では、陸上多発ピストン機か陸上多発タービン機で実地試験を受けると、陸上多発ピストン機と陸上多発タービン機の両方の限定。e-Gov の写し `kokuho-kisoku/53.json`、令和 8 年 10 月 1 日施行の版）：「陸上多発の等級の限定。限定は実地試験に使った航空機で決まり、操縦士は陸上多発ピストン機で受けても、陸上多発ピストン機と陸上多発タービン機の両方の限定になる」。
  - `multi.rating` の米国の欄に 14 CFR 61.63(c) の (1)（教官の裏書き）と (4)（同じ資格の水準で飛行機などの限定があれば学科試験は要らない）：「級を足すときは、教官の裏書きを受けて実地試験に合格する。同じ資格の水準で飛行機の限定を持っていれば、学科試験は要らない」（eCFR で読んだ）。学科テストと CADET に 61.63 を引く所はない。
  - 数字は変わらないので、`jur.test.mjs` の数字の照合と `check-jur.mjs` に響かない（通った）。DESIGN 3.4 の表の `multi.rating` の行も同じ向きに直した。
- **検査の道具**（W08a の依頼の 1 つ）：`check-egov.mjs` が出典の中の日付（`alcohol` の「平成 31 年 1 月 31 日」の通達）を第 70 条の数と見なしていた（warning 2）。元号と西暦の日付を数を読む前に消すようにし、`selftest.mjs` に例を 1 つ足した（31 passed、egov の warning 2 → 0）。ほかの依頼（初出の形の範囲・`.jur-v` の行・`courseMap` の `{ch:}`）は W01 の持ち主と W24・W10 が決めることなので、未解決に書いた（下の 6）。
- **DESIGN.md**（統合役の持ち物。付記 5 に記録）：6.1・6.2 の決まり 11・7.2 の W09 の `#aero.lift`（W09 のあとは 3.2）、6.2 の決まり 11 の CADET の質問メニューのテスト（W09〜W10 の間）、7.2 の W08 の行に W08a〜c、3.4 の表の `multi.rating`、10.4 の表の TEMPO の長さ（違いではなかった）。付記 5 に、序部の形・判断 8 を推奨で進めたこと・章末の表・`FL.jur` の直し・`emg.basic` の危難の囲み（W37 のあと）。
- **台帳の取り込み**：W09 → W08a → W08b の順に `apply-patches.mjs <file> --write`（各回 `validate.mjs` ok）。W08c はパッチなし（閉じる行がない）。統合のパッチはない（`FL.jur` の直しと章末の表に対応する台帳の行はない）。
- **PROGRESS.md**：今の状態・できたこと（W09・W08a〜c）・台帳（P4）・次（W10・W12）・未解決。

## 3. テスト（コマンドと結果）

| コマンド | 結果 |
|---|---|
| `bash textbook/rewrite/tools/testall.sh …/scratchpad/testall-P4`（最終の木の写し。写しと作業の木の違いは PROGRESS.md とこの報告だけ） | FLIGHT LAB **82/82**・TEXTBOOK **22/22**・CADET **266/266** |
| P3 の実行（`…/scratchpad/testall-P3`） | FLIGHT LAB 80/80・TEXTBOOK 21/21・CADET 266/266 |
| P1 の実行（`…/scratchpad/testall-P1b`） | FLIGHT LAB 56/56・TEXTBOOK 21/21・CADET 259/259 |
| 前の基準（8382341、`…/scratchpad/testall-base`） | FLIGHT LAB 51/52（ブラウザのテスト 15。P1 から通っている）・TEXTBOOK 18/18・CADET 256/256 |
| 途中のコミットの木（HEAD に各コミットのファイルを重ねた写し。`cadet/node_modules` をつないだ） | 3 製品の速いテストと TEXTBOOK の `npm test`：下の 4 の表 |
| `node textbook/rewrite/combined/ledgers/validate.mjs` | ok — 0 error、130 warning（署名待ち 130 行） |
| `node textbook/rewrite/combined/ledgers/apply-patches.mjs`（流し直し） | 0 行（316 行はもう台帳にある） |
| `node textbook/rewrite/combined/tools/selftest.mjs` | 31 passed |
| `node textbook/rewrite/combined/tools/check-jur.mjs --all` | error 0・① found 60・missing 0・pending 13、② pending 50・③ pending 52（まとめの章と第 7 部はまだない） |
| `node textbook/rewrite/combined/tools/check-chapter-refs.mjs` | error 0（P3 は 8） |
| `node textbook/rewrite/combined/tools/check-egov.mjs` | error 0・warn 0（W08a のときは warn 2） |
| `node textbook/rewrite/sources/egov/check.mjs` | pass 1456 / fail 0 |
| `node textbook/rewrite/combined/tools/check-provenance.mjs` | error 0（原本 264 ファイルの sha256、由来表 393・376・161・85） |
| `node textbook/rewrite/combined/tools/check-all.mjs --no-browser`・`check-figures.mjs` | 下の 3.1 |

増えたテスト：FLIGHT LAB 80 → 82（W09 の 1・統合の `jur.test.mjs` の ① 1。ブラウザのテストは数が同じで中身を足した）、TEXTBOOK 21 → 22（統合の章末の表）、CADET 266 のまま（W09 は質問メニューのテストの比べ方を直しただけ）。前からの失敗はない。テストの決め打ちの数の変更は W09 の 8 行（`TEST-CONSTANTS.md`）で、統合では決め打ちの数を変えていない。

出力の大きさ（テストの写し）：`FLIGHT-LAB.html` 9,610,562 バイト（P3 は 9,605,105。上限 12 MiB＝12,582,912 バイトのテストは通る）、TEXTBOOK のテストが作る `test-output/TEXTBOOK.html` 4,578,097 バイト（`outputs/` のものは作り直していない）。

### 3.1 check-all（報告だけ）

`node textbook/rewrite/combined/tools/check-all.mjs --no-browser`（本は 7 部・27 章・154 節）：error の合計 **492**（P3 の統合のとき 560）。減ったのは jur（囲み 60 → 0：W08）・chapter-refs（8 → 0：W09）・egov の warn（2 → 0：統合）。増えたのは style の `first-use-form`（囲みの語。上の 6）、path の warn `forward-ch-ref`（12 → 24：`courseMap` の `{ch:}`。W10）、ledgers の署名待ち（閉じた 14 行）。残りの error は前からのもの：ledgers（open 137・unsigned 128・no-place 2）、jurisdiction（`missing-scope` 154・`us-rule-outside-us` 36）、style 22（taigen-dome 16・not-polite 6）、path 13（`forward-see-unlabelled`）。`check-figures.mjs`（Chromium で 95 枚を 390 px）：error 0・warn 6（前からの shape-outside：vorRadials・holding の背景の塗り）。W09 が描き方を変えた `courseMap` も問題なし（最小の文字 10.3 px は前と同じ図）。

## 4. コミット（単位ごと。どれも上の全体のテストの後）

1. `27226ca` W09（構成の変更。単独のコミット：DESIGN 7.3）：`book-core.js`（`addPart`・p1 の題）・`book-0.js`（新）・共有の列と開発用ページ・`book-1.js` と `book-5.js` の W09 の行だけ・`book-figs.js`（`courseMap`）・`syllabus.js`（段階の題）・3 製品のテストの定数（`TEST-CONSTANTS.md` の 8 行）・CADET の掲示・使い方・`textbook/README.md`・`counts.mjs`、W09 のパッチを当てた ERRATA、報告。このコミットの木：FLIGHT LAB 速いテスト 79/79・TEXTBOOK `npm test` 21/21（ブラウザのテストを含む）・CADET 速いテスト 245/245
2. `0767d37` W08a：`book-1.js`（囲み 7 行）・`book-2.js`・`book-comm.js`、W08a のパッチを当てた RULINGS、報告。79/79・21/21・245/245
3. `cea4656` W08b：`book-3.js`・`book-4.js`、W08b のパッチを当てた RULINGS、報告。79/79・21/21・245/245
4. `e0e11d8` W08c：`book-5.js` の `me.perf` の 1 行、報告。79/79・21/21・245/245
5. 統合（このコミット）：章末の表（`pages.js`・`render.js`）とそのテスト（TEXTBOOK `content.test.mjs`・FLIGHT LAB `browser.test.mjs`）、3.4 のテスト ①（`jur.test.mjs`）、`FL.jur` の直し（`book-jur.js`）、`check-egov.mjs`・`selftest.mjs`、DESIGN の付記 5、PROGRESS、使い方と `textbook/README.md` の 1 行、この報告。このコミットの木が上の `testall.sh` の木（82/82・22/22・266/266）

途中のコミットのファイル（W09 のときの `book-1.js`・`book-5.js`・`textbook/test/content.test.mjs`・`textbook/README.md`・`FLIGHT-LAB-使い方.md`、W08a のときの `RULINGS.json` など）は、その単位までの形を作って index に入れた（W08 の行を抜いた写しは、HEAD との差が W09 の行だけになることを確かめた）。台帳はパッチを 1 つずつ取り込み、そのたびの形を残してコミットに使った。出力（`FLIGHT-LAB.html`・`CADET.html`）はテストで書き換わっているが、コミットしていない（版の最後に W12 が作り直す）。

## 5. 台帳の行（この統合で触った行）

- W09 のパッチ（1 行）：ERRATA `APP.london-equivalent` → fixed。
- W08a のパッチ（10 行）：RULINGS `R.tempo-length`（裁定の見直し：米国も 1 回 1 時間未満で、違いとしては教えない）・`R.taf-groups`・`R.metar-frequency`・`R.gust-criterion`・`R.readback`・`R.hold-short`・`R.nordo-landing`・`R.vfr-fuel-law`・`R.right-of-way`・`R.alcohol`〔安全〕→ fixed。
- W08b のパッチ（5 行）：RULINGS `R.pattern`・`R.nordo-ifr`・`R.approach-ban` → fixed、`R.fuel-reserve`・`R.hold-numbers` は note だけ（基礎教材の側の直しが残る）。

**R1 が閉じるはずでまだ開いている行**（`unit` が R1 の単位で status が open。P3 の表から W09・W08 の分が減った）：

| 台帳 | 単位 | 行 |
|---|---|---|
| ERRATA | W10 | `T.overview.T2`（AC 61-136B が現行か）・`K.overview.K2`・`K.overview.K3`・`K.overview.K4`・`K.overview.K6`・`APP.kiso-cover-airline` |
| ERRATA | W07d | open の 30 行（W07d の 2 回目。R1 の確かめの対象の外） |
| RULINGS | W08 | 混合の行 `R.pressure-unit`（場所は `basics.units`＝W10）・`R.altimeter-rule-of-thumb`（`inst.alt`＝W15）・`R.spelling`（C の本文そろえ＝W24・W50）・`R.fuel-reserve`・`R.hold-numbers`（基礎教材の側＝W18・W23・W30・W41） |
| RULINGS | W10 | `R.pic-meaning`・`R.pf-term`・`R.ifr-terms` |
| RULINGS | W04 | `R.aoa-term`（所有者の確認待ち） |
| RULINGS | W07c | `R.tem-words`（W32 の節が残る） |
| UNVERIFIED | W10 | `U.ana-procedure`・`U.ana-jcab-route`・`U.jcab-exam-language`・`U.faa-written`・`U.us-student-cert`・`U.london-icao`・`U.ac61-136` |
| UNVERIFIED | W04 | `U.jcab-term-names`（所有者の確認待ち） |
| CONCEPTS | W10 | `C.flight-rules-conditions`・`C.speed-kinds`・`C.time`・`C.pressure-altitude`・`C.pic-vs-captain` |
| PROVENANCE | W10 | 序部に入る基礎教材の 39 行 |

閉じたが確かめ役の署名（`checkedBy`）を待つ行：130（W12。P3 の 116 ＋ P4 の 14）。

## 6. 未解決のこと

`PROGRESS.md` の「未解決のこと」と同じ。P4 で増えたもの：

- **検査の道具**（W01 の持ち主と W24・W10 で決める）：`check-style.mjs` の初出の形が、日米の囲みの中の語（`FL.jur` の正式名：進路権・転移高度・区分航空図・ウィンドシャーなど）を章の初出と数える（W08a +36・W08b +25）。囲みは本文の横の要素で「（通称、English）」を書けないので、囲みを初出に数えないか（その場合は本文の最初の使い方が調べられる）を決める。`.jur-v`（`bk.same` などの「題：値」の行）を文として調べる（`ifr.rules` に long-sentence 1・taigen-dome-label 1。`bk.jur` の表の中は調べない）。`check-path.mjs` の `forward-ch-ref` が序部の地図の図 `courseMap` の `{ch:}`（12）を数える（W10 が図を描き直すときに決める）。
- **囲みの語と本文の語**（W24・W30・W06）：`law.rules` の本文「優先権」と囲み「進路権」、`wx.shear` の「ウインドシア」と「ウィンドシャー」、`wx.brief` の「NOTAM」と「ノータム」、`FL.jur` の日本の欄の「管制圏」「空港など」（表の正式名は航空交通管制圏・空港等）、`nordo.ifr` の本文の表と囲みの言い方。`FL.terms` に「磁航路」がない（W04）。`flight-lab/src/sanford-course.js` の口述の解説が VFR の巡航高度を「磁針路」で書く（W50）。
- **`intro.cert` の図 `certLadder`**：「多発の等級（Multiengine）：資格に加える限定。実地試験だけ」は 61.63(c) の教官の裏書きを書いていない（`FL.jur` は統合で直した）。W10 が `intro.cert` を序部で作り直すときに直す。
- **`emg.basic` の危難の場合の日本の決まり**（航空法第 74 条・第 75 条）：47 項目にも e-Gov の写しにもない。W37 が写してから囲みの形を決める（DESIGN の付記 5）。
- **`me.perf` など囲みを置いた節の `scope`**：節のデータ `scope` はまだどの節にもない（`check-jurisdiction.mjs` の `missing-scope`）。節の本文を書く単位が付ける。
- **判断 8**：推奨（そろえる）で進めた。所有者が別の形を選べば、課程表の段階の題と CADET の掲示の文字だけを直す（`flight.test.mjs` の新しいテストが番号を決めている）。

## 7. ほかの単位への依頼

- **W10**：`basics`・`english` を `book-0.js` に `before: 'aero'` で。登録するコミットで `#aero.lift` 3.2 → 5.2（`content.test.mjs`・`browser.test.mjs`）・`ORDER`・`COUNTS`・見出し、CADET の `DROP_CHAPTERS` に `english`。序部の節の囲み（`basics.alt`＝`alt.transition`、`basics.units`＝`alt.unit`、`basics.time`＝`time`、`basics.rules`＝`ir.need`）を同じコミットで（`jur.test.mjs` の ① が確かめる）。図 `courseMap` と `intro.use` を 8 部の形に、`intro.cert` と `certLadder` を日米の囲みに。CADET の質問メニューに序部が出る（テストは今の形で通る）。
- **W01 の持ち主・W24**：上の 6 の検査の道具の 3 つ。
- **W24・W30・W06・W04・W50**：上の 6 の語のずれ。
- **W12**：P4 で閉じた 14 行の `checkedBy`（`R.alcohol` は安全レビュー）。`fuel.vfr`〔安全〕の囲み（`perf.fuel`・`law.rules`・`nav.log`）も安全レビューの対象。
- **W37**：航空法第 74 条・第 75 条（危難の場合の措置）の写し。
- **第 3・4 部の新しい節（R3）と第 1 部の新しい節（R2）**：`ops.night`＝`night`、`nav.efb`＝`adsb`、`ifr.dep`＝`appr.ban`、`ifr.circle`＝`circle`、`inst.alt`＝`alt.transition`・`alt.unit`、`navb.north`＝`sbas`、`law.pilot`＝`night`・`accident` の囲みを、節を登録するコミットで（`jur.test.mjs` の ①）。
