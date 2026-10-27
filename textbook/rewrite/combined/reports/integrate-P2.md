# 統合 P2（W04・W04b・W06）— 報告

単位：R1 の P2 の統合役（DESIGN 7.1「統合」・7.3）。3 つの単位の報告と差分を DESIGN 7.2 と照らし、小さな穴を埋め、P2 に属する「ほかの単位への依頼」を当て、共有の列に新しいファイルを登録し、台帳のパッチを取り込み、3 製品のテストを流してから、単位ごとにコミットして push した。`flight-lab/kiso/` には触っていない（`validate.mjs` で git の差分なし）。日付 2026-10-27。

## 1. 単位ごとの確かめ（DESIGN 7.2 と報告の主張）

| 単位 | DESIGN 7.2 の「できたことの確かめ方」 | 結果 |
|---|---|---|
| W04 用語の表 | 食い違いの C の行が全部、表に入る | `terms.test.mjs` 8/8（RULINGS の C の 43 行のうち用語の 42 行の語が表で引ける・名前の一意・法令の写し 46 か所と JCAB-MAP 133 か所の照合・CADET の通称 68）。W01 の `check-ledgers.mjs` の `c-term-not-in-table` は、表を TEXTBOOK の列に入れてパッチを取り込んだあと 0。抜き取りで、自家用の学科試験例題集（001761095.pdf）を取り直し、sha256 が表の `SOURCES` と同じで、本文に「迎え角」3 か所・「迎角」0 か所を確かめた |
| W04b 作業の決まりの文書 | STYLE の文がこの設計と食い違わない（読み合わせの記録） | 報告の 3（DESIGN の決まり → STYLE の場所の表）を読んだ。食い違いはなかった。W04b が「統合役に見てほしい」とした 3.2 の 7 つの判断（写真の位置・太字の定義は住所の節だけ・2 回目から正式名・CADET に出る節の理解を日本の側だけに書かない・基礎教材の切り抜きの表示・まだない部品は使わない・字数は空白を除く）は、どれも DESIGN の決まりから導けるので、そのままにした。NOTES.md の行の数（692）と、DESIGN・台帳が引く行（17・112・377・378・406・474・475）が同じ中身であることを確かめた |
| W06 日米の対照データと部品 | 描いた数字がデータと同じ。CADET に米国の列が出て日本の列が出ない | `jur.test.mjs` 12/12（登録後は skip なし）、`cadet/test/jur.test.mjs` 6/6。抜き取りで AIM 7-1（FAA のページ）を取り直し、TEMPO が「changes expected for <1 hour」であることを確かめた（DESIGN の「1 時間以内」は誤りで、W06 の直しが正しい）。施行規則第 154 条の見出し「（航空機の灯火）」を写しで確かめた |

## 2. 統合でしたこと（当てた依頼・埋めた穴）

- **共有の列への登録**（DESIGN 6.2 の決まり 7。W04・W06 の依頼）：`flight-lab/src/modules.mjs` の `book-core.js` の次に `book-terms.js`・`book-jur.js`、開発用 `flight-lab/src/index.html` に同じ 2 行。CADET は `book-terms.js` を `cadet/build.mjs` の `FL_LEAVE_OUT` で外し（理由つき：ゲームは使わず、要るテストはファイルを直接読む）、`book-jur.js` は読む（DESIGN 6.3）。TEXTBOOK と FLIGHT LAB の Node のテストは両方を読む。
- **テストの列**：FLIGHT LAB の `package.json` の `test`・`test:fast` に `terms.test.mjs`・`jur.test.mjs`、CADET の `test:fast` に `jur.test.mjs`（`test` は `test/*.test.mjs`）。
- **テストの決め打ちの数**（決まり 11）：`textbook/test/build.test.mjs` の `FL_MODULES.length` 14 → 15（W04）→ 16（W06）。`TEST-CONSTANTS.md` に 2 行。`textbook/README.md` の読み込みのファイルの列も 16 にした。
- **DESIGN.md**（統合役の持ち物。付記 3 に記録）：3.1・6.1・6.2 の決まり 11・6.3 を「`FL.terms` は `book-terms.js`（CADET は読まない）、TEXTBOOK は最後に 20 ファイル」に。3.5 に用語の数（297）と、例の語と違う 2 語（所有者の確認待ち）。3.4 の表の頭に「値と確度は `FL.jur` が正」、表の中で `metar.taf`（米国の TEMPO・PROB、日本の決まりは〔要確認〕）・`time`・`ws.alert` の〔要確認〕・`nordo.vfr` の出典・2 つの題を直した。
- **DECISIONS.md**：「まだ決めていないこと」に、判断 3 の補足（迎え角／迎角、キャブレターヒーター／気化器加熱）を足した（所有者に聞くこと。判断そのものは変えていない）。
- **STYLE.md**（W04b の持ち物に、W04・W06 の答えを統合で入れた）：用語の例を表に合わせて「迎え角（迎角、angle of attack）」（所有者の確認待ちと書いた）、表のファイル・項目・引き方（`find`・`firstUse`）・297 語・`status: unverified` の書き方・カタカナの長音と中黒、必ず区別する語に FSS・MSA・滑走距離、日米の部品の書き方（ID か HTML、打ち間違いは止まる、章末の表 `jurTable`）、CADET の「米国の決まり」の見出し。`figshot.mjs` を 10 px にしたので、9.5 px の注意の文を消した。
- **NOTES.md**（行の数は変えない）：668 行の例を表の語に、5 の FSS は「決めた」に、「台帳にまだないもの」に統合役の判断（下の 6）。
- **道具**：
  - `textbook/rewrite/tools/figshot.mjs` の最小の文字 9.5 → 10 px（W04b の依頼。DESIGN 5 章の基準 16・`check-figures.mjs` とそろう。今の図の最小は 10.3 px で、`check-all` の figures は ok のまま）。
  - `check-jur.mjs`（W06 の依頼）：囲みの数字の照合を `FL.jur.textOf`（題・両国の値・出典・条文・e-Gov の版）から作る。前は値の文だけだったので、出典「14 CFR 91.155」と条文「第 5 条」の数を誤ってエラーにした。下書きで `law.vfr` に囲みを置いて流し、`box-number` が 0、`found 2` を確かめた。
  - `check-concepts.mjs`（W04b の依頼）：太字の定義の形を「括弧の中に英語」に広げた（合本の形「正式名（通称、English）」も数える）。語に日本語の字がないもの（英語だけの「Vyse（88 kt）」、値の「15℃・29.92 inHg（1013.25 hPa）」）は定義と数えない。今の本で別々の定義は 122 → 125（`aero.drag`「揚抗比」・`sys.gear`「前輪式」・`perf.da`「密度」の 3 つが加わり、減ったものはない）。`selftest.mjs` に例を 11 足した（29 → 30 passed）。`tools/README.md` の 1 行。
  - 台帳の取り込み（`ledgers/src/schema.mjs` の `alreadySet`）：**取り込みを流し直すと結果が変わる不具合を直した**。1 つの行に何単位もパッチを書くと（`U.check-standards` に W05・W04・W06、`U.vfr-squawk` に W05・W06）、`by` があとの単位で置き換わるので、前のパッチが「まだ」と判定され、流し直すと `by` が戻り `note` が 2 回足されるところだった（P2 で `apply-patches.mjs` を流し直したとき 5 行が出た）。`note` のある `set` は `note` で取り込み済みを見分けるようにした（あとの単位の値を戻さない）。`ledgers/README.md` の 5 に書いた。流し直して 0 行。
- **CADET の本の見た目**（W06 の依頼）：`cadet/src/ui/dialog-ui.js` に `.bk-us`・`.bk-jur`・`.jur-h`・`.jur-src`・`.jur-t` の CSS（明るい紙の色）。
- **用語のそろえ**：`FL.jur` の文の 2 語を表の正式名に（`check.slow` の「迎角」→「迎え角」、`ws.alert` の「突風前線」→「ガストフロント」）。ほかの短い形（管制圏・空港など）は下の 6。`book-terms.js` の頭の説明を「CADET は読まない」に。
- **台帳**：W04・W06・W04b のパッチをこの順に取り込んだ（`apply-patches.mjs --write` → `validate.mjs` ok）。統合のパッチ `reports/integrate-P2.ledger.json`：COUNTS `jur.unverified` の数え直し 12 → 15（DESIGN 3.4 に〔要確認〕を 3 つ足したため）、`book.terms` に表の語の数（297）の note。

## 3. テスト（コマンドと結果）

| コマンド | 結果 |
|---|---|
| `bash textbook/rewrite/tools/testall.sh …/scratchpad/testall-P2`（最終の木の写し） | FLIGHT LAB **76/76**・TEXTBOOK **21/21**・CADET **265/265** |
| P1 の実行（`…/scratchpad/testall-P1b`） | FLIGHT LAB 56/56・TEXTBOOK 21/21・CADET 259/259 |
| 前の基準（8382341、`…/scratchpad/testall-base`） | FLIGHT LAB 51/52（ブラウザのテスト 15。P1 から通っている）・TEXTBOOK 18/18・CADET 256/256 |
| `node textbook/rewrite/combined/tools/selftest.mjs` | 30 passed |
| `node textbook/rewrite/combined/tools/check-all.mjs --no-browser` | 19 の検査が動く（報告だけ。error 705：ledgers の open 228・署名待ち 6、jur の囲み 60（W08）、style・jurisdiction など今の本の基準値） |
| `node textbook/rewrite/combined/ledgers/validate.mjs` | ok — 0 error、8 warning（署名待ち 8 行） |
| `node textbook/rewrite/combined/ledgers/apply-patches.mjs`（流し直し） | 0 行（79 行はもう台帳にある） |
| `node textbook/rewrite/sources/egov/check.mjs` | pass 1456 / fail 0 |
| 途中のコミットの木（HEAD を `git archive` で取り出し、その単位までのファイルを重ねたもの。コミットのあとで、各コミットを取り出した木と同じことを `diff -r` で確かめた） | 3 製品の速いテスト：W04 まで FLIGHT LAB 62/62・TEXTBOOK 21/21・CADET 238/238、W06 まで 74/74・21/21・244/244、W04b まで 74/74・21/21・244/244（最後の木は上の testall）。テストの名前を 1 つ直した（`terms.test.mjs` の「about 150 rows」を範囲のとおり「150 to 320 rows」に。中身は同じ）あと、FLIGHT LAB の `npm test` を作業の木で流し直して 76/76 |

出力の大きさ：`FLIGHT-LAB.html` 9,395,247 → 9,527,099 バイト（+132 KB。上限 12 MiB＝12,582,912 バイトのテストは通る）、`TEXTBOOK.html` 4,408,849 バイト。

増えたテスト：FLIGHT LAB 56 → 76（W04 の 8・W06 の 12）、CADET 259 → 265（W06 の 6）、TEXTBOOK 21 のまま（決め打ちの数を直しただけ）。新しい失敗はなかった。前からの失敗もない。

## 4. コミット（単位ごと。どれも上のテストの後）

1. `3c013a5` W04：用語の表（`book-terms.js`・`terms.test.mjs`）と登録（列・開発用ページ・CADET の leave-out・FLIGHT LAB のテストの列・TEXTBOOK の 15・2 つの README）、W04 のパッチを当てた RULINGS・UNVERIFIED、報告
2. `877f859` W06：日米の対照データと部品（`book-jur.js`・`book-core.js`・2 つの `style.css`・CADET の `book.js` と本の CSS・2 つのテスト）と登録（TEXTBOOK の 16）、W06 のパッチを当てた RULINGS・UNVERIFIED、報告
3. `4ba7a8e` W04b：STYLE・PLAN・NOTES（統合で入れた W04・W06 の答えを含む）と `figshot.mjs` の 10 px、W04b のパッチを当てた ERRATA、報告
4. 統合（このコミット）：道具（`check-jur`・`check-concepts`・`selftest`）、台帳の取り込みの直し、DESIGN・DECISIONS・COUNTS、PROGRESS、この報告

途中のコミットの共有のファイル（列・開発用ページ・`package.json`・`build.test.mjs`・README・TEST-CONSTANTS）と台帳は、その単位までの形を作ってコミットした（最後の形は作業の木と同じ）。出力（`FLIGHT-LAB.html`・`CADET.html`）はテストで書き換わっているが、コミットしていない（版の最後に W12 が作り直す）。

## 5. 台帳の行（この統合で触った行）

- ERRATA：`APP.style-md`（fixed、W04b。署名待ち）
- RULINGS：C の 42 行（W04：用語を表の正式名に、閉じる単位を本文の単位へ。`R.aoa-term` は W04 のまま）、`R.tempo-length`・`R.gust-criterion`・`R.taf-groups`・`R.metar-frequency`（W06 の note）
- UNVERIFIED：新しい 10 行（W06）、`U.jcab-term-names`（W04、owner）、`U.check-standards`（W04・W06 の note）、`U.qnh-unit`・`U.vfr-squawk`（W06 の note）
- COUNTS：`jur.unverified`（数え直し 15）、`book.terms`（note）

## 6. 未解決のこと

`PROGRESS.md` の「未解決のこと」と同じ。P2 で増えたもの：

- **所有者の確認**：用語の表の「迎え角」「キャブレターヒーター」（例は「迎角」「気化器加熱」）と `U.jcab-term-names`。
- **写していない条**：施行規則第 97 条・第 145 条・第 166 条の 4（用語の表の 8 か所。W37）。
- **初出の検査の範囲**（`check-style.mjs` の first-use-form 574）：W24・W50 の前に決める。
- **`FL.jur` の短い語**（管制圏・空港など）と表の正式名：W08・W24 が見る。
- **`R.tempo-length`** の裁定の見直し（W08）。
- **章末の「この章の日米の違い」**：関数はあるが、FLIGHT LAB の `pages.js`・TEXTBOOK の `render.js` の章末からはまだ呼んでいない（W08 が囲みを置くときに。今は囲みがないので空）。
- **NOTES.md 1 の「アプリ側」の食い違い**：統合役の判断で、今は台帳に足さない。W07d・W50・W49 が単位の始めに読み、直すものを ERRATA にパッチで足す（NOTES.md の 5、PROGRESS）。

P2 で閉じたもの：図の最小の文字（`figshot.mjs` 10 px）、`textbook/README.md` の読み込みの列、`flight-lab/README.md` の「テスト 48 件」とテストのファイルの列（`npm test`・`package.json` を指すようにした。ERRATA `APP.old-doc-numbers` はほかのドキュメントの数が残るので W49 のまま）。

## 7. ほかの単位への依頼

- **W08**：囲みは `bk.jur(...ids)`・`bk.us(id)`・`bk.jp(id)`・`bk.same(id)` で（数字を手で書かない）。章末に `FL.book.jurTable(ch.id)` を FLIGHT LAB の `pages.js` と TEXTBOOK の `render.js` から（空文字なら何も出さない）。`node textbook/rewrite/combined/tools/check-jur.mjs` で囲みの数と数字を確かめる（P2 で出典と条文の数を誤ってエラーにしなくなった）。`R.tempo-length` の裁定の見直し。
- **W07a〜c・W10・W24**：用語は `FL.terms`（`find`・`firstUse`）、日米の数字は `FL.jur` から（STYLE の「用語」「日米の書き分け」）。
- **W37**：施行規則第 97 条・第 145 条・第 166 条の 4 の写し、UNVERIFIED の W06 の 10 行、`check.*` の実地試験実施細則（W04 が URL と sha256 を `U.check-standards` に書いた）。
- **W12**：P1・P2 で閉じた 8 行の `checkedBy`。
