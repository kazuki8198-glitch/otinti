# W10-intro の報告：序部 第 1 章 `intro` の下書き（R1・W10 の一部）

作業日：2026-10-27。単位：W10 のうち章 `intro` の書き手（DESIGN 3.3 序部の表の第 1 章、4.1 の 1 行目、7.2 の W10）。
**下書きだけ**です。製品が読むファイル（`flight-lab/src/*`）は変えていません。登録（読み込みの列に入れる・`book-1.js` の章を置き換える）は統合役がします（DESIGN 6.2 の決まり 5・7.1）。`flight-lab/kiso/` には触れていません。git の操作はしていません。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/drafts/intro.js`（新） | 章 `intro` の全部（7 節）。今の 5 節は ID のまま書き直し、新しい 2 節 ★`intro.japan`・★`intro.exams` を足した。`B.add` で今の章を同じ場所で置き換える形（`check-chapter.mjs` の下書きの決まり）。新しい出典 13 件は、`FL.book.R` にないときだけ足す（登録のときに `book-core.js` の `R` へ移す） |
| `textbook/rewrite/combined/drafts/intro-figs.js`（新） | 図 5 枚：`courseMap`（8 部に描き直し）・`certLadder`（日米を左右に）・`jpRoutes`（新：日本の資格への 4 つの道）・`examMap`（新：試験の地図）・`studyCycle`（5 段に描き直し）。`FL.bookFigs` に `Object.assign` する（下書きの検査のときだけ今の図を置き換える） |
| `textbook/rewrite/combined/drafts/intro.claims.json`（新） | 主張の台帳の行 123（`check-claims.mjs` が抜き出す 80 文の全部と、抜き出されないが事実を言う 43 文）。各行に `id`（`claimId`）・`sec`・`text`・`tag`・`source`（必要なら `note`） |
| `textbook/rewrite/combined/reports/W10-intro.md`（新） | この報告 |

下書きの検査は、図のファイルを先に渡して流します：
`node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/intro-figs.js textbook/rewrite/combined/drafts/intro.js`

## 2. したことと理由（節ごと）

章の題を「はじめに：この教科書の使い方・資格と試験の地図」に、`summary` を 7 節の中身に直しました。どの節にも `scope` を付けました（DESIGN 3.2・基準 8）。

| 節 | scope | したこと |
|---|---|---|
| `intro.use` | common | 図 `courseMap` を 8 部（序部と第 1〜7 部）に描き直した。部の題と章の数は `FL.book.PARTS`・`CHAPTERS` から描き、本にない部（R4 までの第 7 部）は点線で「この版にはまだない」と描く。今の図にあった `{ch:}` 12 本をなくした（`check-path` の `forward-ch-ref` 12 → 0。PROGRESS「次」1）。本文も版に合わせて書く：序部のほかの章は本にある章から作り（`{ch:}` は同じ部なので後ろへのリンクではない）、第 7 部は本にないときは「この版の本には、まだありません」と書く。訓練の 3 つの場面、用語の書き方「正式名（通称、English）」（判断 3）、節の読み方に日米の囲みを足した。注意の囲みは「ここに注意：」で始め、211 字の 1 文を箇条書きに分けた |
| `intro.marks` | common | 約束の表に、範囲の札・由来の行・日米の囲み・〔要確認〕・正式名（通称、English）・例題と写真の約束（基礎教材 第 0 章の扉の注意書きの趣旨。DESIGN 3.2）を足した。「発展」の行は `bk.deep` があるときだけ出す（まだない部品は書かない：STYLE「節の形」）。日米の数字を取り違えない注意（K00.x1 の「FAA の要件を日本の要件として読み替えない」を書き直した）と、考えてみようを足した |
| `intro.course` | common | 中身は今のまま（公開情報は `bk.fact`。基礎教材の JAL の出典は使わない）。後ろの部の `solo.check` へのリンクに「予告」を付けた（`forward-see-unlabelled` 1 → 0）。「わからないこと」の体言止めの箇条を文にし、「どの国の資格か」の行は `intro.japan` の推測へつないだ。134 字の文を分けた。用語の初出の形（計器飛行証明・単独飛行・針路・計器飛行） |
| `intro.cert` | mixed | 題を「操縦士の資格：米国（FAA）と日本（JCAB）」に。図 `certLadder` を日米 2 列に描き直した（米国の多発の等級は「教官の裏書き＋実地試験」：14 CFR 61.63(c)。PROGRESS「次」1 の指摘）。裁定 `R.ifr-terms` のとおり、IFR（方式）と IMC（気象状態）の定義を先に、計器飛行証明でできることを後に書いた。米国の表は各行に「米国」と国を書き（管轄の検査 `us-rule-outside-us` 11 → 0）、後ろの部への `{ch:law}` を外し、多発の行の足し方は日米の囲みに任せた。日本の技能証明の表（操縦練習許可・自家用・事業用・准定期運送用（MPL）・定期運送用・計器飛行証明・航空身体検査証明・航空英語能力証明。業務範囲は航空法の別表、年齢と飛行時間は施行規則）を足した。囲みは `bk.jur('medical', 'ir.need', 'multi.rating', 'english.radio')` のまま（数字は `FL.jur` から）、条文の在り処は `bk.jp` に（写しにある条だけ）。`faa: ['PA.I.A.K1','PA.I.A.K2','IR.I.A.K2']` |
| ★`intro.japan` | jp | 新。`from: ['kiso09.3']`。図 `jpRoutes`。日本の技能証明の試験（学科 → 実地）と 4 つの道：ふつうの道・指定養成施設の課程（実地試験の全部か一部がない・修了から 1 年・操縦士の学科試験は免除されない・技能審査）・Integrated System（2024-10-01 から。CPL（多発）と IR・指定養成施設だけ・施設の中で 1 回・単発の事業用は取れない・大型機は別・約 3 か月短縮）・外国ライセンスの切替（国内航空法規の学科は必ず）。ANA への当てはめは `bk.est`（推測・高）と、ANA が「日本の資格」と書いた文がないこと・単発の等級（推測・中）を分けた。K09.3 の「資格・業務範囲・限定・追加の証明を一組で読む」を書き直して最後に置いた |
| ★`intro.exams` | mixed | 新。図 `examMap`。JCAB の学科（CBT・年 6 回・約 10 日間・約 260 会場、事業用 5 科目と計器飛行一般、各 40 分、同時受験、科目合格 1 年、出題範囲参考）、受ける言語と時期（推測・中〜高／未公表）、実地試験（Integrated では施設内で 1 回、ANA は推測・中〜高、審査 2 日は取材記事）、航空英語能力証明、航空無線通信士（総務大臣の免許・航空機の無線設備の通信操作。航空特殊無線技士はエアラインの航空機を扱えない）、米国の学生操縦士の資格（61.3(a)・61.87）と FAA の学科（PAR・IRA・CAX、合格点 70%）は受けるか未公表、アプリの学科テスト 80%（練習用）、この本で扱わないこと（DESIGN 3.6）。第 7 部の「JCAB 学科への道」へのリンクは `jexam.map` があるときだけ出す（決まり 13） |
| `intro.study` | common | `from: ['kiso00.x1']`。図 `studyCycle` を 5 段（読む → 答える → 飛ぶ → ふり返る → 間隔をあけて思い出す）に。読む 30〜45 分・飛ぶ 20〜30 分の目安（DESIGN 3.3 の扉）、K00.x1 の「定義・例題・判断を分けて読む」「分かっていること・まだ分からないこと・次に確かめること」「結論を保留できる」「図を自分で描き直す」を書き直した。間隔をあけて思い出す方法は FAA Aviation Instructor's Handbook（FAA-H-8083-9B）第 3 章で確かめた。アプリの説明の節のまま（TEXTBOOK の `APP_SECTIONS`）。箇条の体言止めを文にした |

章末：用語 17 → 28（日本の資格の語など）、例 3 → 5、注意 4 → 5（米国の 14 CFR に国を書き、日本の法令の確かめ方を足した）、確認問題は**後ろに 2 問足した**（`intro.quiz[5]` 指定養成施設で国が行わない試験、`intro.quiz[6]` 計器飛行証明の学科の科目。既存の 5 問は答えと並びを変えず、問 3・4 に「米国の」を足した）、説明してみよう `written` 1 問（基礎教材 第 9 章 問 3 を書き直した：PROVENANCE `kiso09.q3` → `written:intro`）、出典 7 → 20。

## 3. 事実の確かめ（一次資料。どれも 2026-10-27 に開いて読んだ）

- **航空法**（e-Gov、令和 7 年 12 月 1 日施行の版。API v2 の全文を scratchpad に取って読んだ）：第 22 条・第 24 条（資格）・第 25 条（限定）・第 26 条・第 28 条と別表（業務範囲：自家用は無償の運航、事業用はエアラインの機長以外の操縦者など、准定期は 2 人操縦の機長以外、定期運送用は 2 人操縦の機長）・第 29 条（試験は学科と実地、学科合格が実地の前提、第 4 項：外国の資格・指定養成施設の修了者は全部か一部を行わない）・第 33〜35 条。
- **航空法施行規則**（e-Gov、令和 8 年 10 月 1 日施行の版）：第 43 条（年齢：自家用 17・事業用 18・准定期 18・定期運送用 21）・別表第二（自家用 40 時間／指定養成 35 時間、事業用 200 時間／指定養成 150 時間、定期運送用 1,500 時間、計器飛行証明：機長の野外 50 時間・計器飛行等の練習 40 時間）・第 46 条と別表第三（学科の科目：事業用は航空工学・航空気象・空中航法・航空通信・航空法規）・第 48 条の 2（科目合格）・第 50 条（外国の資格：国内航空法規の学科は除かない）・第 50 条の 2 第 3 項（指定養成施設の修了者は実地の全部か一部を行わない、1 年）・第 4 項（学科の免除は航空通信士と航空英語能力証明の課程だけ）・第 50 条の 4・第 50 条の 11（技能審査）・第 53 条（等級。写しにもある）。
- **電波法**（e-Gov、令和 8 年 9 月 3 日施行の版）第 39〜41 条、**電波法施行令**（同）第 3 条（航空無線通信士・航空特殊無線技士の操作の範囲）。
- **国土交通省**：「指定航空従事者養成施設について」（制度の概要と交付の流れ、操縦士課程の一覧 令和 8 年 2 月現在：全日本空輸株式会社の行は定期運送用操縦士・事業用操縦士・准定期運送用操縦士の欄に ○。PDF の文字の座標で列を確かめた。計器飛行証明の欄には ○ がない）、資料 1「操縦士養成に係る基礎情報（前回からの追加分）」（Integrated System・従来手法・MPL の表、私立大学の例）、事務処理要領の改正新旧対照表（令和 8 年 6 月 30 日から適用：学科試験科目及び試験時間、改正表 18＝国空安政第 700 号・令和 6 年 9 月 25 日・令和 6 年 10 月 1 日から適用）、CBT の手引き（2025 年度：年 6 回・10 日間程度・約 260 会場（261）・同時受験・各 40 分）、学科試験のページ（CBT 化 2023 年 11 月期・科目合格 1 年）、学科試験の出題範囲参考と例題集のページ。
- **FAA**：ACS Knowledge Test Table（2024 年 10 月更新：PAR・IRA・CAX、合格点 70）、Aviation Instructor's Handbook FAA-H-8083-9B 第 3 章 3-41（spaced study sessions と cramming）、14 CFR 61.3(a)（Cornell LII）、14 CFR Part 141 Appendix B 4(a)(1)（自家用の課程 35 hours。Part 61 の 40 時間より少ない）。
- **ANA と取材記事**：ANA HD 2025-10-29（「事業用操縦士と計器飛行証明という免許を取得する訓練」「平均11回目のフライトでファーストソロ」）、ASCII.jp 2025-10-08（ANA Phase と指定養成の認可、2024 年 10 月の通達改正で Integrated CPL/IR）、乗りものニュース 2025-10-14（2024 年に国内でもこの訓練でライセンス発給、審査 2 日）。**ANA の Phase2 のページ（`R.ana1`）は接続がタイムアウトして読み直せなかった**（今の教科書の値のまま。claims の `note` に書いた）。
- **書かなかったこと（〔要確認〕のまま）**：JCAB の学科の「1 科目 20 問・70%」（CBT の手引きの「25 問から 20 問」の注は定期運送用の航法の科目だけ）、航空無線通信士が「エアラインの副操縦士に必要」という言い方（DESIGN 3.3 の文。一次資料で確かめたのは操作の範囲だけで、`FL.jur` の `english.radio` も無線の資格を〔要確認〕としている）、ANA の訓練生が FAA の資格・学科を取るか、学科の時期、ロンドンで英国の試験を受けるか。
- **本文に条番号を書かなかったもの**：第 29 条・施行規則第 43 条・第 50 条・第 50 条の 2 などは e-Gov の写し（`textbook/rewrite/sources/egov/`）にないため、`check-egov` の決まり（写しにない条は error）に合わせて本文は条番号なしで書き、条番号と版は `intro.claims.json` の `source` に書いた。

## 4. 検査の結果

**章の検査**（`check-chapter.mjs`、図のファイルと下書き、Chromium の図の検査を含む）：**error 0**・warn 15・pending 1・info 2。

| 検査 | error | warn | 中身 |
|---|---|---|---|
| chapters・data・volume・jurisdiction・chapter-refs・figures・questions・photos・concepts・jur・path・provenance・egov | 0 | 0 | 図 6 枚は 390 px で最小 10.3 px、はみ出し・重なりなし。囲み ① found 4・missing 0。管轄の言葉は本文の米国 33・日本 49 か所がすべて許された場所 |
| style | 0 | 8 | `first-use-form` 8（針路・目的地変更・機長・操縦練習許可・学生操縦士・計器飛行・CRM・TEM）。8 つとも**図の中の文字**（部の題・図 `courseFlow`・`certLadder` の短い札）が章の最初の出現になるため（下の 6 の 1） |
| claims | 0 | 7 | 台帳 `CLAIMS.json` にまだ行がないため（登録のときにパッチで入れる）。`drafts/intro.claims.json` の行を一時の台帳に足して流すと **80 / 80 が札つき・札なし 0**（43 行の追加の文は「本に見つからない」の info：抜き出しの対象外の文なので正しい） |
| calc | — | — | pending 1（台帳 `CALC.json` がまだない。この章に計算の例はない） |

今の本の `intro`（下書きの前）は error 17・warn 61 でした（管轄 16・道のり 1、`forward-ch-ref` 13 など）。

`basics` の下書き（別の書き手）と一緒に読み込んでも `intro` は error 0 です（`basics.crew` の `article-not-copied` 1 は `basics` の分）。

**製品の速いテスト**（どれも今の作業ツリー。下書きは製品が読まないので結果は変わらない）：TEXTBOOK `npm test` **22/22 pass**、FLIGHT LAB `npm run -s test:fast` **80/80 pass**、CADET `npm run -s test:fast` **245/245 pass**。テストが `cadet/outputs/CADET.html`・`flight-lab/outputs/FLIGHT-LAB.html` を作り直しました（コミットしない出力。DESIGN 7.3）。

## 5. 台帳の行（登録のコミットで閉じる・足すもの。この単位はパッチを書いていない：下書きは登録まで閉じない）

- **PROVENANCE**：`kiso00.x1`（`intro.study` の `from`。行き先 `door:p0` は部の扉の単位）、`kiso09.3`（`intro.japan` の `from`。行き先 `jlaw.license` は W38）、`kiso09.q3`（`written:intro`）。
- **RULINGS** `R.ifr-terms`：`intro.cert` の分は直した（方式と気象状態の定義を先に）。`basics.rules`・`kiso00.14` の分は `basics` の書き手。
- **ERRATA** `APP.kiso-cover-airline`：`intro` は基礎教材の扉の写真（ch00-photo1）と ANA・JAL の出典を使っていない（`basics` と合わせて閉じる）。
- **UNVERIFIED** `U.ana-procedure`・`U.ana-jcab-route`・`U.jcab-exam-language`・`U.faa-written`・`U.us-student-cert`：開いたまま。本文は決まりどおり推測（`bk.est`、確からしさつき）か「公表されていません」と書いた。
- **ACS-MAP** `PA.I.A.K1`・`PA.I.A.K2`・`IR.I.A.K2`：`intro.cert` の `faa` に書いた（深さの確認は W42）。
- **CLAIMS**：`drafts/intro.claims.json` の 123 行（条文 60・参考値 45・推測・要確認 11・教材値 7）を `op: "add"` で。確かめ役の署名は W12。
- **ERRATA** `T.overview.T2`（AC 61-136B、`sim.can`）：W10 の行だが章 `sim` の分で、この単位の持ち物ではない（手を付けていない）。

## 6. 未解決のこと

1. **初出の形の検査が図の中の文字を数える**：部の題（「航法・目的地変更」「計器飛行」「CRM・TEM…」）や図の短い札は「正式名（通称、English）」の形にできない。8 件の warn はすべてこれ。検査の範囲（図・キャプションを外すか）は W01 と W24 で決める（PROGRESS「未解決」の初出の検査の範囲と同じ話）。
2. **範囲の札・由来の行・説明してみようの表示**：`intro.marks` は範囲の札と由来の行を「題の横に付きます」「節に付きます」と説明するが、今の FLIGHT LAB の `pages.js` と TEXTBOOK の `render.js` は `scope`・`from`・`written` をまだ描かない（基準 24）。描く部品が入る前に登録するなら、表のこの 2 行を外す（または `deepRow` と同じように描く部品があるときだけ出す）。
3. **確認問題は 7 問**（STYLE の「1 章 3〜5 問」より多い）。既存の 5 問は消せない（決まり 4）ので、新しい 2 節の分を 2 問だけ足した。8 問にすると正解の位置の検査（各 15〜35%）が、既存の問の偏り（A が 4 問）で warn になる。
4. **`R.ana1` が読めない**（ana.co.jp がタイムアウト）。期間・レッスンの回数と長さは今の教科書の値のまま。W12 で読み直す。
5. **国の一覧で ANA の行に計器飛行証明の ○ がない**：Integrated の IR がどの課程の指定に入るかは公開資料で分からない。本文は「Integrated System の課程だと推測します（確からしさ：高）」のままにした。
6. **用語の表にない語**を、法令の名前のまま使った：事業用操縦士・自家用操縦士・定期運送用操縦士・准定期運送用操縦士・指定航空従事者養成施設・学科試験・実地試験・航空無線通信士・航空特殊無線技士・外国ライセンスの切替・型式の限定・等級・種類・国土交通省航空局（JCAB）（下の 7）。

## 7. ほかの単位にお願いしたいこと

- **W37（e-Gov の写し）**：`textbook/rewrite/sources/egov/manifest.json` に、航空法 第 22・24・26・29 条、航空法施行規則 第 43・46・48・48 の 2・50・50 の 2〜50 の 11 条と**別表第二・別表第三**（`fetch.mjs` は今 `AppdxTable` を写さない：道具の直しが要る）、電波法 第 39〜41 条と電波法施行令 第 3 条を足してほしい。写しに入れば、`intro.japan`・`intro.cert`・`intro.exams` の本文と `bk.jp` に条番号を書ける（今は `intro.claims.json` の `source` だけ）。あわせて `FL.jur` `english.radio` の〔要確認〕（`U.radio-license`）の材料：電波法施行令 第 3 条で、航空特殊無線技士は航空運送事業の航空機の無線設備を扱えない／電波法 第 39 条には主任無線従事者の監督の例外がある。
- **W04（用語の表 `FL.terms`）**：上の 6 の語を足してほしい（英語の例：commercial pilot・private pilot・airline transport pilot・multi-crew pilot licence（MPL）・designated training facility・knowledge test・practical test・aeronautical radio operator・foreign licence conversion・type rating・class・category・Japan Civil Aviation Bureau）。足したら `intro` の初出をその形にそろえる（W24）。
- **W01（検査の道具）**：①初出の形の検査（`check-style.mjs`）から図（`svg`・`figcaption`）を外すかの判断。②下書きを調べるとき、`drafts/<章ID>.claims.json` があれば主張の台帳に足して照らせると、書き手が札の漏れを登録の前に見られる（今回は一時の台帳を `COMBINED_LEDGERS` で作って確かめた）。
- **FLIGHT LAB `pages.js`・TEXTBOOK `render.js` の持ち主**：節の `scope`（範囲の札）・`from`（由来の行）・章末の `written`（説明してみよう、答えは開いて見る）を描く（DESIGN 3.2・基準 24）。上の 6 の 2。
- **統合役（登録のとき）**：
  1. `intro-figs.js` の 5 つの関数を `flight-lab/src/book-figs.js` の `FIG` に移す（`courseMap`・`certLadder`・`studyCycle` は置き換え、`jpRoutes`・`examMap` は足す。どれも `intro` だけが使う）。下書きの頭の小さな部品（`svg`・`T`・`TL`・`rect`・`down`・`up`）は `book-figs.js` のもの（`svg`・`T`・`TL`）に合わせる。
  2. `book-1.js` の章 `intro` を `drafts/intro.js` の `B.add` に置き換え、`NEW_R` の 13 件を `book-core.js` の `R` に入れる（下書きの `if (!R[k])` の囲いは外す）。
  3. TEXTBOOK のテストの定数（`textbook/test/load.mjs` の `COUNTS`）：この章の分は **secs +2・quiz +2・terms +11・examples +2・cautions +1・refs +13・figs +2・details +4**（lessons・simTags・photos・calcs は 0）。`basics`・`english` の分と合わせて直し、`TEST-CONSTANTS.md` に 1 行ずつ。CADET は `intro` を表示しないので変わらない。
  4. 台帳のパッチ（上の 5）：CLAIMS 123 行（`drafts/intro.claims.json` の `rows`）、PROVENANCE 3 行、`R.ifr-terms` の `intro.cert` の分。
- **W12（R1 の確かめ）**：`intro.claims.json` の 123 行の二人目の確認（特に別表第二の時間・第 43 条の年齢・国の一覧の列の読み）、`R.ana1` の読み直し、図 5 枚の目視の記録（scratchpad で 390 px の画像を作って目で見た：重なり・はみ出しなし）。
- **DESIGN の持ち主**：3.3 の `intro.exams` の「航空無線通信士（…日本のエアラインの副操縦士に必要とされる）」は、一次資料で確かめられた言い方ではない（確かめたのは電波法施行令の操作の範囲だけ）。本文には書いていない。表の文を「必要とされるかは〔要確認〕」に直すとよい。
