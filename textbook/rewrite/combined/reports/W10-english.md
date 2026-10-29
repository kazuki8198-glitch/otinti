# W10（序部）の報告：章 `english`「英語で学ぶ準備」の下書き（執筆）

単位：W10 のうち、章 `english` の執筆（R1・DESIGN 7.2 の W10、3.3 の序部 第 3 章）。日付：2026-10-27。
書いたもの：**下書きだけ**（どの製品も読まない場所。DESIGN 6.2 の決まり 5・7.4）。登録（`book-0.js`・読み込みの列・テストの定数・CADET の `DROP_CHAPTERS`）と台帳を閉じるのは、登録する統合役のコミットです。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/drafts/english.js`（新） | 章 `english` の下書き。`B.add({ id: 'english', part: 'p0', before: 'aero', … })` で 2 節（★`en.terms` 用語の三つ組みと略語、★`en.class` 英語の授業と教官との話し方）と章末（用語 7・例 3・注意 2・確認問題 4・説明してみよう `written` 7・出典 13・課目 `k3`・`k6`）。新しい出典は `NEW_R`（7 件。うち `cfr1`・`nist811` は `drafts/basics.js`、`mlitSyllabus` は `drafts/intro.js` と同じキー・同じ値） |
| `textbook/rewrite/combined/drafts/english-figs.js`（新） | 図 2 枚（`FL.bookFigs` に足す関数。登録のときに `book-figs.js` の `FIG` へ）：`enTriple`（1 つのものに 3 つの名前。名前は `FL.terms` の `aileron` から描く）・`enTalk`（授業・操縦席・無線の 3 つの場面と話し方） |
| `textbook/rewrite/combined/drafts/english.claims.json`（新） | 主張の札 42 行（`check-chapter.mjs --claims-out` が抜き出した 14 文の全部と、抜き出しにかからない規則・定義・公開情報の文 28。参考値 37・条文 3・推測・要確認 2） |
| `textbook/rewrite/combined/reports/W10-english.md`（新） | この報告 |

ほかのファイルは変えていません（`flight-lab/kiso/` も含む。git の作業は何もしていません）。

確かめ方：

```sh
node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/english-figs.js textbook/rewrite/combined/drafts/english.js
```

## 2. したことと理由

### 2.1 節の形と節のデータ（DESIGN 3.2・STYLE「節の形」「節のデータ」）

- 2 節とも、ねらい（`bk.aim`）→ 最初の図 → 説明 → ここが大切（3 項目・60 字以内）→ ここに注意（`bk.warn`）→（`en.class` だけ）米国の囲み → 考えてみよう →（`en.class` だけ）シミュレータ（`bk.sim`、最後）の順（`check-form` error・warn 0）。
- `scope: 'common'`（DESIGN 3.3 の「範囲」の列のとおり）。`from` はなし：DESIGN 3.3 は 2 節とも「新」で、基礎教材の節を使っていない（`check-data` の `from-missing` 0）。`use` は手で書く分だけ（`en.terms`：まとめ 1、`en.class`：まとめ 1・まとめ 6）。`jcab`・`faa`・`deep` はなし（`JCAB-MAP.json`・`ACS-MAP.json` にこの 2 節を名指しする行がない）。
- まだない部品（`bk.deep`・`bk.dont`・`bk.recall` など）は使っていない（STYLE）。「取り違えやすい組」は `bk.dont` ができるまで `<h4>` と表にした。

### 2.2 `en.terms`：用語の表（`FL.terms`）から作る（DESIGN 3.3・3.5、aero.md 7 の 9）

- **表の名前は 1 つも手で書いていない**。節の `h()` が描くときに `FL.terms` から読み、どの語を出すかの ID の列だけを下書きに持つ（`TRIPLE` 20 語・`PAIRS` 7 組・`ABBR` 15 語・`ASCII_NAMES` 4 語・つづりの 3 語・`status: unverified` の語・表の語の数）。所有者が「迎角」「気化器加熱」を選んで `book-terms.js` の `formal` と `common` を入れ替えれば、この節と図は書き直さずに追う。表にない ID を書くと止まる（`bk.jur` と同じ考え：打ち間違いを隠さない）。
- 中身：正式名・通称・英語の 3 つの役割と、この本の初出の形「正式名（通称、English）」→ 名前が大きく違う語（補助翼・昇降舵・方向舵・迎え角・着陸装置・計器 3 つ・スピン・雲高・地上滑走・場周経路・着陸復行・外部点検・無線呼出符号・管制承認・進路権・単独飛行・操縦教員・1 発動機不作動）→ 取り違えやすい組（計器飛行と計器飛行方式、有視界気象状態と最小操縦速度（Vmc とも書く）、機長とキャプテン、着陸復行と進入復行、地上滑走と滑走距離、偏差と自差、ノータムと航空情報。違いは 1 行だけ書き、説明は各語の住所に任せた）→ 略語（正式名（略語：English）で開く。略語が正式名の PF・PM・PFD・POH）→ つづり（米国／ICAO：takeoff／take-off・PAN-PAN／PAN PAN・MAP／MAPt を表から、airplane／aeroplane・stand by／standby を一次資料から）→ 用語の表（297 語）と、日本語の名前を確かめていない語（最小操縦速度・加速継続距離。表から描く）。
- 表のセルは、初出の検査（`check-style` の `first-use-form`）が「正式名のすぐ後の括弧に英語」を探すので、`正式名 ｜（通称、English）`・`略語 ｜ 正式名（English）` の形にした（読み手にもこの本の書き方の見本になる）。短い正式名が長い語の中で先に見つかる道具の数え方（失速 ⊂ 失速速度、計器飛行 ⊂ 計器飛行方式、離陸・航空路誌）は、並べ方と言い換えで避けた（`first-use-form` 0）。
- `FL.terms` を読まない製品（CADET。そもそも `english` を外す）でも止まらないように、表がないときは表を出さず、図は同じ 3 つの名前に戻る（`FL.terms` なしで描けることを確かめた：本文 953 字）。

### 2.3 `en.class`：英語の授業と教官との話し方（DESIGN 3.3、human.md 7 の G12）

- 公開情報（座学はロンドン・授業はすべて英語、飛行訓練は Sanford で現地の教官）→ 分かったふりをしない（“Yes”・“OK” と答えない、分からない所を言う、言い方の例 7）→ 操縦席で教官と（短く・はっきり、分からないまま操作しない）→ 無線では標準用語（Say again・Speak slower・Unable と理由、ていねいな言葉を重ねない、言えないことはふつうの短い英語：米国の AIM 4-2-1）→ 数字と単位の言い方（授業とふつうの会話の読み方と米国の無線の読み方を 3 行で対にし、単位の英語の名前 10。kt に per hour を付けない）→ 立場の差があっても言う（**権力格差（power distance）**の定義と英国の例：SKYbrary、短い型 4 つ）。
- 囲み：`bk.us` を 2 つ。①米国の英語の条件（14 CFR 61.83(c)・61.103(c)、AC 60-28B：ICAO の運用レベル 4 以上・学生操縦士の申請・単独飛行の承認・実地試験の前に確かめ、訓練の間も教官と訓練校が見る・誤解を確かめて解く・記録は英語）。②英国と米国の書き方の違い（つづり・standby・日付 7/4/2026）と、**ロンドンの座学がどちらで教えるかは公開されていない**こと（`bk.est`。UNVERIFIED `U.london-icao`。推測で埋めていない）。DESIGN 3.3 は「英国・米国の違いは囲み」だが、英国と米国を並べる部品がないので、今は見出しが「米国では」の `bk.us` に入れた（7 の 3）。
- 1 つの概念に住所は 1 つ（DESIGN 3.2）：無線の言葉の意味（`comm.words`・`comm.clarify`）・無線の数字（`comm.numbers`）・FAA と ICAO の言い方の違い（`comm.icao`）・権威勾配と懸念の伝え方（`crm.crm`）は、1〜2 行と「予告」のリンクだけ（後ろの部への `bk.see` は 4 本）。操縦の受け渡しの言い方（住所 `ground.crew`、まだ本にない）は名前だけで、リンクは置いていない（DESIGN 6.2 の決まり 13）。
- `bk.sim`：課目 k3（英語交信①：数字の言い方）と k6（英語交信④：聞き取り）。章末の `lessons` も同じ 2 つ。
- 序部の章で CADET は表示しない（DESIGN 6.3 の `DROP_CHAPTERS`）ので、実名（Sanford・ロンドン）と FLIGHT LAB の課目名は書いてよい（DESIGN 6.2 の決まり 10）。

### 2.4 用語（DESIGN 3.5・`FL.terms`）

- 章の初出は「正式名（通称、English）」：表の語は `en.terms` の表で初出になり（例：操縦教員（教官、flight instructor））、`en.class` では復唱（readback）・学生操縦士（student pilot）を初出の形で書いた（`first-use-form` 0）。
- `en.class` の本文の「教官」は、`intro`・`basics` の下書きと同じく通称のまま（表の正式名は「操縦教員」）。そろえるのは W24（7 の 5）。
- 表にない語：権力格差（power distance）・標準用語（phraseology）・ふつうの言葉（plain language）を本文と章末で使った（7 の 2：W04 に足してもらう）。

### 2.5 図（STYLE「図」・DESIGN 5 章の基準 16）

2 枚とも暗い板・`viewBox` の幅 400・`aria-label`＝キャプション・「図：」で始まる。Chromium の 390 px で、はみ出し・重なりなし、最小の文字 10.3 px（`check-figures` error・warn 0）。390 px の画像を 1 枚ずつ目で見て、`enTriple` の箱の小さい文字（11 → 12）と、`enTalk` の英文のはみ出し（“I'm not sure. Show me?” → “Can you show me?”）を直した。`enTriple` の名前は `FL.terms` から描く。

### 2.6 出典（DESIGN 3.2「出典」）

今の `R` から 6 件（`pcg`・`aim42`・`cap413`・`cfr61`・`ana1`・`authGrad`）、`NEW_R` に 7 件：`cfr1`・`nist811`（`basics` と同じ）、`mlitSyllabus`（`intro` と同じ）、新しく `ac6028b`（AC 60-28B）・`skySocio`（SKYbrary Socio-Culture）・`cambridgeDates`・`cambridgeMeas`（Cambridge Dictionary の文法の頁）。URL はどれも 2026-10-27 に開いて中身を確かめた。

## 3. 事実の確かめ（一次資料。札と出典は全部 `english.claims.json`）

| 何を | 一次資料（2026-10-27 に読んだ） |
|---|---|
| UNABLE・SAY AGAIN・SPEAK SLOWER・STAND BY・ROGER・WILCO・AFFIRMATIVE・MISSED APPROACH・GO AROUND・TAXI の定義 | FAA Pilot/Controller Glossary（FAA の HTML 版） |
| AFFIRM・SAY AGAIN・SPEAK SLOWER・STANDBY・UNABLE（ふつう理由を添える）、decimal、標準の言い方と plain language、ILS・QNH・RVR は文字のまま、ていねいな言葉の使いすぎを避ける、take-off・aeroplanes・PAN PAN のつづり | UK CAA CAP 413 第 24 版（2026-07-01 発効）2.14・2.18 表 8・3.1・3.2・3.6 |
| 交信でいちばん大切なのは理解、短く、足りなければ必要な言葉を | AIM 4-2-1 |
| 数字の読み方（4,500 → four thousand five hundred、10,000 → one zero thousand、速度は 1 けたずつと knots） | AIM 4-2-8・4-2-11 |
| knot ＝ nautical mile per hour、foot per minute・inch of mercury・pound・gallon (U.S.) の名前 | NIST SP 811 付録 B.9 |
| 学生操縦士・自家用操縦士の英語の条件 | 14 CFR 61.83(c)・61.103(c)（eCFR の API、2026-10-23 の版） |
| Airplane・Takeoff のつづり | 14 CFR 1.1（同じ版） |
| 米国の航空英語の基準（AELS）：ICAO の運用レベル 4 以上、評価の時機、教官と訓練校の役目、誤解を確かめて解く、記録は英語 | FAA AC 60-28B（2017-06-02、Ed Upd 1.5.24 の PDF）1・1.1・5・6.1・7.1・8.4 |
| 権力格差の定義（Hofstede 1991）と、英国などの小さい国の例 | SKYbrary: Socio-Culture (OGHFA BN) |
| 座学はロンドン・授業はすべて英語、飛行訓練は Sanford の訓練所で現地教官 | ANA「ボーイング777 パイロットになるまで Phase2〜基礎訓練編〜」（2025-10-22。`R.ana1`） |
| 日付の書き方（英国は日が先・米国は月が先、4/7/2000 と 7/4/2000）、月の略し方 | Cambridge Dictionary, English Grammar Today: Dates |
| ふつうの英語の数の言い方（one hundred kilometres an hour） | Cambridge Dictionary, English Grammar Today: Measurements |
| 表の語の名前（正式名・通称・英語・略語・ICAO のつづり） | `FL.terms` の各語の `basis`（W04 が確かめた。例：補助翼＝出題範囲参考 ppl.1.1.1.7「補助翼と横の操縦」） |

推測で埋めていないもの：ロンドンの座学が英国式と米国式のどちらで教えるか（`U.london-icao`。`bk.est`）、日本人の訓練生が権力格差をどう感じるか（国の点数や日本の位置は書いていない。SKYbrary が日本を権力格差の例に挙げていないため）、英国と米国で 120 などの読み方が違うか（“one hundred and twenty” の and：一次資料で確かめられなかったので書いていない）、操縦の受け渡しの決まった言い方（住所の `ground.crew` に任せた）。

## 4. 検査の結果

### 4.1 章の検査（`check-chapter.mjs`、下書き 2 つ）

| 検査 | error | warn | pending | 中身 |
|---|---|---|---|---|
| chapters（FLIGHT LAB・TEXTBOOK の章のテストの条件） | 0 | 0 | 0 | 各節 200 字超・用語 7・例 3・注意 2・4 択 4 問（理由つき、正解の位置 0・2・1・3）・https の出典・リンクと課目の行き先 |
| form・data・style・volume・jurisdiction・chapter-refs・questions・photos・concepts・jur・path・egov | 0 | 0 | 0 | 本文 6,658 字・1 文の平均 31.6 字・最長 78 字・留保の言い方 0（「ここに注意」の中 1）・初出の形の warning 0。太字の定義は「権力格差（power distance）」1 つ（本の中で 1 回）。米国の規則の言葉 6 か所はどれも「米国の」の文か `bk.us` の中。後ろの部への `bk.see` 4 本（どれも「予告」） |
| figures（Chromium 390 px） | 0 | 0 | 0 | 2 枚、最小 10.3 px |
| claims | 0 | 2（台帳なし） | 0 | 今の `CLAIMS.json` には行がないので「札なし」の warn 2（節ごと、14 文）。`english.claims.json` の行を足した写しの台帳（`COMBINED_LEDGERS`）では **14/14 に札**（warn 0）。足した 28 行は数字のない文（規則・定義・公開情報）なので抜き出しにかからず、info `ledger-row-not-in-book` 28（7 の 4） |
| calc | 0 | 0 | 1 | `CALC.json` がまだない（この章に計算の例はない） |
| provenance | 0 | 0 | 0 | info 1（本全体の数） |

`intro`・`basics` の下書きと一緒に流しても、`english` の行は claims の warn（台帳なし）だけ（章の順は登録の後 `intro` → `basics` → `english` → `sim`）。

### 4.2 製品のテスト（下書きは製品が読まないので、壊していないことの確かめ）

- TEXTBOOK：`cd textbook && npm test` → **22/22 pass**（fail 0）
- FLIGHT LAB：`cd flight-lab && npm run -s test:fast` → **80/80 pass**（fail 0）
- CADET：`cd cadet && npm run -s test:fast` → **245/245 pass**（fail 0）

## 5. 台帳の行

下書きなので、どの行もまだ閉じていません（パッチ `reports/*.ledger.json` も書いていません：`apply-patches.mjs` は引数がないと全部のパッチを流すので、登録の前に閉じてしまわないように）。**章を登録するコミットで**、統合役が次を `W10` のパッチにしてください。

| 台帳 | 行 | 登録したときの扱い |
|---|---|---|
| CLAIMS | 42 行 | `drafts/english.claims.json` の `rows` を `op: "add"` で（`checkedBy` は事実確認役） |
| UNVERIFIED | `U.london-icao` | 開いたまま（status `open`）。note に「`en.class` は `bk.est` で書いた（W10）」。`wx.metar`・`comm.icao` の側は別の単位 |
| COUNTS | `origin.written.other` | `en.terms`・`en.class` ができた（`built` を数え直すときに） |
| CONCEPTS | （新しい行の提案） | `C.power-distance`（権力格差。住所 `en.class`、呼び戻す節 `crm.crm`）。足すかは W03・W32 が決める |
| PROVENANCE・ERRATA・RULINGS・JCAB-MAP | なし | 基礎教材の節を使っていない。DESIGN 10 の誤りの行にこの章のものはない |

## 6. 未解決のこと

1. **英国と米国を並べる囲みがない**：DESIGN 3.3 の「英国・米国の違いは囲み」を、今は見出しが「米国では」の `bk.us` の中の表にした（7 の 3）。
2. **用語の表にない語**：権力格差・標準用語・ふつうの言葉（7 の 2）。`crm.crm` の「権威勾配」も表にない。
3. **ロンドンの座学の書き方**（`U.london-icao`）：公開情報で確かめられない。最初の授業で確かめる、と本文に書いた。
4. **主張の台帳の数字のない行**：`check-claims.mjs` は数字・条番号・法令名のある文だけを抜き出すので、定義や規則の文（Pilot/Controller Glossary・CAP 413・AC 60-28B・SKYbrary・公開情報）の 28 行は info `ledger-row-not-in-book` と出る（文は本にある）。
5. **「教官」と「操縦教員」**：表の正式名は「操縦教員」。`intro`・`basics` の下書きと同じく、2 回目からは通称の「教官」で書いた（DESIGN の節の題も「教官」）。
6. 安全レビュー：〔安全〕の 7 項目に当たる文はない。「分からないまま操作しない」「Unable と理由」は一般の注意で、本体は `comm.clarify`・`crm.crm`。

## 7. ほかの単位にお願いしたいこと（needs from others）

1. **登録する統合役（W10 の登録）**：
   - `drafts/english.js` の `B.add({...})` を `flight-lab/src/book-0.js` の `basics` の後に入れる（`before: 'aero'`。順は `intro` → `basics` → `english` → `sim`）。`NEW_R` のうち `R` にないもの（`ac6028b`・`skySocio`・`cambridgeDates`・`cambridgeMeas`。`cfr1`・`nist811` は `basics`、`mlitSyllabus` は `intro` の登録で入る）を `flight-lab/src/book-core.js` の `R` に足し、`ref('x')` を `R.x` に直して、`for (const [k, v] of Object.entries(NEW_R)) if (!R[k]) R[k] = v;` の行を消す。
   - `drafts/english-figs.js` の 2 つの関数（`enTriple`・`enTalk`）を `flight-lab/src/book-figs.js` の `FIG` に移す（同じ名前のヘルパー `C`・`svg`・`T`・`L`・`TL` がある。`book-figs.js` の `BOX` は題と行の引数もある形だが、`BOX(x, y, w, h, c)` の 5 引数で同じ枠になる。下書きにだけある小さいヘルパー `esc`（文字の書き換え）と `names()`（`FL.terms` の `aileron` を描くときに読む）は、一緒に移す）。
   - **同じコミットで** `cadet/src/content/book.js` の `DROP_CHAPTERS`（今は `['intro', 'sim']`）に `'english'` を足す（DESIGN 6.3）。CADET は `book-terms.js` を読まないが、`en.terms` は `FL.terms` がなくても止まらない（確かめた）。
   - テストの定数（章を足すコミット。DESIGN 6.2 の決まり 3・11）：TEXTBOOK の `COUNTS`（章・節）・`ORDER`・見出しの章と節の数・`#aero.lift`（`basics`・`english` が入って 5.2）。理由を `TEST-CONSTANTS.md` に 1 行ずつ。
   - 台帳：上の 5 の行（CLAIMS 42 行の `op: add`、`U.london-icao` の note）。
2. **W04（`FL.terms` の持ち主）**：表に 3 語を足す：権力格差（power distance）・標準用語（phraseology）・ふつうの言葉（plain language）。あわせて権威勾配（authority gradient。`crm.crm` の住所）も。どれも JCAB・法令に名前が見当たらないなら `status: 'book'`。足したら、この章は書き直さずにそのまま（本文の語は同じ）。
3. **W06（`book-core.js` の部品の持ち主）**：英国と米国を並べる囲み（例：`bk.box(題, HTML)` か `bk.uk`）があれば、`en.class` の 2 つめの `bk.us`（英国と米国の書き方の表）をそれに替える。DESIGN 3.3 の `en.class` の「英国・米国の違いは囲み」と、`comm.icao`・`wx.metar` の英国の話でも使える。
4. **W01（検査の道具の持ち主）**：`check-claims.mjs` が、抜き出しにかからない文の台帳の行（数字のない規則・定義の文）を「本に見つからない」と出す。行の文が節の本文にあれば info を出さない形にするか決めてほしい。
5. **W24（序部と第 1 部の用語をそろえる）**：「教官」（通称）と「操縦教員」（正式名）の使い分けを、`intro`・`basics`・`english` でそろえる。
6. **W12（R1 の確かめ）**：`english.claims.json` の 42 行の事実確認（書いた人と別）、序部の初学者の読み（この章を含む）。
