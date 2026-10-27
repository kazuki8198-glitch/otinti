# 教科書の書き直しの計画（PLAN）

> **この計画は終わった作業の記録です（2026-10-26 から）。** 27 章の書き直しは終わり（[PROGRESS.md](PROGRESS.md)）、今は教科書とパイロット基礎教材（第 3 版）を 1 冊にする**合本**を作っています。今の計画は [`combined/DESIGN.md`](combined/DESIGN.md)（作業の単位は 7.2、壊さないための決まりは 6.2）、所有者の判断は [`combined/DECISIONS.md`](combined/DECISIONS.md)、進み具合は [`combined/PROGRESS.md`](combined/PROGRESS.md)、書き方の決まりは合本に合わせて直した [STYLE.md](STYLE.md) です。
>
> この計画と合本の決まりが食い違うときは、合本の決まりに従います。おもに変わったこと：部と章（6 部・27 章 → 8 部・48 章。章の番号は版ごとに変わるので、章は ID で呼ぶ）、CADET が表示しない章（`intro`・`english`・`sim`・部のまとめの章・第 7 部）、用語（JCAB と航空法の表記を正式名にする。例：迎え角 → 迎角）、節の形（日米の囲み・判断の目などの新しい部品と、節のデータ `scope`・`from` など）、数値（教材値と参考値が違う所は両方を書く。主張には札）、写真（基礎教材の写真はファイルのまま使い、加工の表示は写真ごと）、テストの数の記録（[`combined/TEST-CONSTANTS.md`](combined/TEST-CONSTANTS.md)）、確かめ方（[`combined/tools/`](combined/tools/) の検査と台帳 [`combined/ledgers/`](combined/ledgers/)）。
>
> 下の本文は、27 章を書き直したときの計画のまま変えずに残しています（数は当時のもの）。

FLIGHT LAB の教科書（全 6 部・27 章・120 節、図 22 枚）を、初めて学ぶ訓練生にもっとわかりやすい教科書に書き直す計画です。
進み具合は [PROGRESS.md](PROGRESS.md)、アプリとの食い違いは [NOTES.md](NOTES.md)、書き方の決まりは [STYLE.md](STYLE.md) にあります。

## 1. どう読んで、どう計画したか

- 全 27 章・120 節・22 枚の図・章末（用語・例・注意・確認問題・出典）を、章ごとに読み直しました。
  - 各章の本文と図を、アプリと同じ形で書き出し（`tools/render-ch.mjs`）、図はスマホ幅（390 px）と 760 px で画像にして（`tools/figshot.mjs`）目で確かめました。
  - 事実は、出典（FAA のハンドブック・ACS・AIM・14 CFR・公開チェックリストなど）の今の版と照らし合わせました（2026 年 10 月）。
  - アプリの課目（`syllabus.js`）・学科テスト（`quiz.js`）・英語交信（`radio.js`）・飛行モデル（`physics.js`）・画面（`pages.js`・`app.js`）との食い違いも調べました。
- 章ごとの結果を下の「5. 章ごとの計画」にまとめました。くわしい分析（事実確認の一覧・出典の URL・確認問題の案・アプリとの食い違い）は [analysis/](analysis/) に章ごとの JSON（`<章ID>.json`）で残し、書き直しのときに使います。

## 2. 全体の問題（まとめ）

1. **文が長く、説明が足りない**。体言止めや 1 文 80〜100 字の文が多く、専門用語の説明なしに次へ進む所があります。初めて学ぶ人には読みにくい。
2. **図が少なく、スマホで読めない図がある**。22 枚のうち多くは `viewBox` が 420〜520 の幅で、390 px の画面では文字が 6〜9 px になります。図が 1 枚もない章が 16 章あり、節の最初の図がその節の主題と合っていない所もあります（CADET の教室の画面に、その節と関係の薄い図が映る）。
3. **誤りと古い情報**（主なもの）
   - 空域の図で 14,500〜18,000 ft を Class A として描いている（正しくは Class E。Class A は 18,000 ft MSL 以上）。
   - 通行権の順番が古い（2025 年 10 月の改正で 91.113(d) が変わった）。
   - Aviation Weather Handbook は FAA-H-8083-28B（2026 年 4 月）が今の版。米国本土の文字の AIRMET は 2025 年 1 月に終わり、G-AIRMET だけになった。
   - Airplane Flying Handbook（3C）では、ジェット機の章は第 16 章（本文・出典は「第 15 章」と書いている）。
   - 単独飛行の承認は 2016 年からログブックだけ（学生操縦士証明には書かない）。
   - 資格の説明の誤り（どの資格にも学科試験がある、ATP は機長だけ、など）。
   - 管制官の時計の方位は「機首」ではなく「レーダーで見た航跡」が基準。
   - 異常姿勢からの回復の順番が、機首上げ・機首下げの 2 つに分かれていない（AC 120-111）。
4. **数値の食い違い**：燃料消費（本文 8〜10 gal/h、飛行モデルは約 11.5 gal/h）、Archer の燃料タンク（本文は LEFT/RIGHT、飛行モデルは左右を同時に減らす）、重量重心の例（後席 2 人＋荷物の例は最大重量を超えている）、など。
5. **重複**：学生操縦士の制限（61.89）、「Aviate・Navigate・Communicate」、ソロの回数の話などが、いくつもの章に出てきます。
6. **章の説明（summary）と中身が合っていない章**：気象の章は雲・前線・ウインドシアーを約束しているのに節がない、など。

## 3. 書き直しの方針（全体）

- 書き方の決まりは [STYLE.md](STYLE.md) のとおりです（です・ます調、短い文、日本語（English）、節の形「ねらい → 図 → 説明 → ここが大切 → 注意 → 考えてみよう」）。
- **章 ID と節 ID は変えません**。節は消さず、まとめません。足りない内容は新しい ID の節として足します（例：`intro.marks`、`wx.cloud`、`law.aircraft`）。
- **図**：今の 22 枚はすべて見直し、ほとんどをスマホで読める大きさに描き直します。各節の最初の図を、その節でいちばん大事な図にします。全体で 70〜90 枚を目安に足します（下の各章の「足す図」から、must → should の順に選びます）。
- **写真**：パブリックドメイン（FAA・NASA・NOAA など）と CC0・CC BY・CC BY-SA だけ。1 枚ずつ元のページでライセンスを確かめます（`tools/photosrc.py`）。目安は 30〜50 枚・合計 5 MB 以下。入手できなかった写真は、この計画の「写真」の欄に「未入手」と書き、図で代わりに描きます。
- **数値**：教材値（`FL.physics`）と参考値（出典つき）を分けて書き、飛行モデルと食い違う数値は書きません。飛行モデルの側がおかしいと思われる所は、直さずに NOTES.md に書きます。
- **章末**：確認問題は 1 章 3〜5 問（4 択・答え・理由）。学科テスト（`quiz.js`）とほとんど同じ問題は、別の問題に替えます。
- **アプリ・CADET・TEXTBOOK のつなぎ目**：`FL.book` の API、章のデータの形、`bk` の関数、`{ch:id}`、計算機 7 種類、`before: 'hf'` は変えません。写真のための `bk.photo` と、ねらいの `bk.aim` を足します（どちらも足すだけで、今の書き方は壊しません）。

## 4. 進め方（決めたこと）

- **コミット**：最初にこの計画（このコミット）、次に準備（写真の仕組み・図の部品・テストの数の整理）、そのあと 1 章 1 コミットで第 1 章から順に書き直します。
- **テスト**：コミットの前に毎回、FLIGHT LAB（`npm test`）・TEXTBOOK（`npm test`）・CADET（`npm test`）の 3 つを通します（`tools/testall.sh` で作業中の木の写しを作って流します。CADET は 1 回 20 分ほどかかるため）。
- **出力の HTML**（`flight-lab/outputs/FLIGHT-LAB.html`・`textbook/outputs/TEXTBOOK.html`・`cadet/outputs/CADET.html`）：ビルドに日付やハッシュが入り、CADET は 8 MB あるので、章ごとには入れず、区切りのよい所（セッションの終わり）と最後に作り直してコミットします。
- **テストの数**（節・確認問題・用語・図・写真など）は `textbook/test/load.mjs` の `COUNTS` 1 か所にまとめ、章を書き直すたびに直します。
- **確かめ**：章を書き直すたびに、その章を書いていない別のエージェントに本文と出典を渡して事実を確かめてもらい、指摘は直すか、直さない理由を NOTES.md に書きます。
- **1 回で終わらないとき**：PROGRESS.md の「次にすること」に続きの位置を書きます。

## 5. 章ごとの計画

各章の「今の問題」「書き直しの方針」「図」「写真」「章末」です（分析の要約。数字の出典は各章の書き直しのときに確かめ直します）。

### 図と写真の見積もり

分析で出た図の案の数です（must＝必ず描く、should＝描きたい、nice＝余裕があれば）。全体の目安 70〜90 枚に合わせて、must を中心に、should から選びます。写真は候補の題材の数です（入手できたものだけを入れます）。

| 章 | ID | 今の図（うち直す） | must | should | nice | 写真の題材 |
|---|---|---|---|---|---|---|
| 1 | `intro` | 3（直す 3） | 2 | 2 | 1 | 4 |
| 2 | `aero` | 8（直す 8） | 8 | 3 | 3 | 9 |
| 3 | `sys` | 4（直す 4） | 9 | 8 | 4 | 8 |
| 4 | `perf` | 2（直す 2） | 4 | 3 | 1 | 7 |
| 5 | `wx` | 3（直す 3） | 6 | 4 | 2 | 9 |
| 6 | `law` | 2（直す 2） | 3 | 5 | 3 | 7 |
| 7 | `radio1` | 2（直す 2） | 3 | 2 | 0 | 4 |
| 8 | `radio2` | 4（直す 3） | 4 | 2 | 0 | 1 |
| 9 | `radio3` | 0（直す 0） | 3 | 2 | 0 | 2 |
| 10 | `radio4` | 0（直す 0） | 6 | 2 | 0 | 4 |
| 11 | `radio5` | 1（直す 1） | 5 | 2 | 1 | 4 |
| 12 | `hf` | 1（直す 1） | 5 | 3 | 1 | 5 |
| 13 | `ground` | 3（直す 3） | 4 | 2 | 2 | 5 |
| 14 | `ops` | 6（直す 5） | 7 | 4 | 2 | 4 |
| 15 | `tl` | 4（直す 4） | 6 | 4 | 2 | 7 |
| 16 | `emg` | 4（直す 4） | 5 | 5 | 2 | 5 |
| 17 | `solo` | 1（直す 1） | 2 | 3 | 0 | 3 |
| 18 | `navp` | 1（直す 1） | 3 | 3 | 0 | 3 |
| 19 | `navr` | 0（直す 0） | 4 | 3 | 2 | 3 |
| 20 | `navd` | 0（直す 0） | 2 | 2 | 0 | 3 |
| 21 | `ifr` | 2（直す 2） | 4 | 1 | 2 | 4 |
| 22 | `ifrp` | 2（直す 2） | 4 | 3 | 2 | 6 |
| 23 | `me` | 1（直す 0） | 3 | 4 | 2 | 4 |
| 24 | `oei` | 2（直す 2） | 5 | 2 | 2 | 3 |
| 25 | `crm` | 1（直す 1） | 3 | 3 | 0 | 3 |
| 26 | `jet` | 0（直す 0） | 4 | 2 | 3 | 4 |
| 27 | `sim` | 2（直す 2） | 2 | 2 | 2 | 2 |
| | 合計 | 22 | 116 | 81 | 39 | 123 |


must の案だけで 116 枚あり、目安（全体で 70〜90 枚）を大きく超えます。そこで、**節の主題が図でしか伝わらないもの**を優先し、次の予算で描きます（合計 90 枚前後。今の 22 枚の作り直しを含む）。表（`turnTable` などの `<table>`）は図に数えません。

| 部 | 章と予算（枚） | 計 |
|---|---|---|
| 第 1 部 | intro 4・aero 16・sys 6・perf 4・wx 6・law 4・radio1〜5 計 8・hf 3 | 51 |
| 第 2 部 | ground 3・ops 4・tl 6・emg 3・solo 1 | 17 |
| 第 3 部 | navp 3・navr 3・navd 2 | 8 |
| 第 4 部 | ifr 3・ifrp 4 | 7 |
| 第 5 部 | me 2・oei 3 | 5 |
| 第 6 部 | crm 2・jet 2・sim 1 | 5 |
| | | 約 93 |

## 第 1 章 `intro` はじめに：この教科書と公開されている訓練課程

節：`intro.use` 読み方と全体の地図・`intro.course` 公開されている訓練の流れ（事実）と、わからないこと（推測）・`intro.cert` 米国の操縦士の資格（FAA）・`intro.study` この教材での学び方

### 今の問題

- **誤り**
  - intro.cert「それぞれに学科試験と実地試験（口述＋飛行）があり」→ 学生操縦士証明は申請だけで試験はない（14 CFR 61.85）。多発の等級を足すときは学科試験不要・実地試験だけ（61.63(c)(2)(4)）（https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-B/section-61.63）
  - intro.cert「ATP（定期運送用）：エアラインの機長などに必要」→ 米国の Part 121 では副操縦士（SIC）にも ATP が必要（14 CFR 121.436(b)、R-ATP は 61.160）（https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-121/subpart-M/section-121.436）
  - intro.cert「Private Pilot：報酬を受けずに操縦」→ 報酬を受けて機長はできないが、乗客と費用の頭割り（pro rata）は可（61.113(a)(c)）（https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-E/section-61.113）
  - intro.course「取得するライセンスの種類（どの国のどの資格か）…推測・要確認」→ 種類は公開済み：『事業用操縦士と計器飛行証明』（ANA 取材記事 2025-10-29、https://www.anahd.co.jp/ana_news/2025/10/28/20251028.html）。どの国の資格か・日本の資格との関係は要確認のまま。
- **古い**
  - intro.course：「現在は Acron Aviation 社に一部を委託」「ロンドンで座学」は 2025 年 10 月の公開情報。ANA は『入社時期により訓練を行う場所は様々』と書いているので、時点（2025 年 10 月）を本文に書く。
- **数値の食い違い**
  - 「基礎レベルの許容幅は自家用 ACS を参考」→ syllabus.js の b1 は『計器飛行 ACS を参考にした教材値』。『主に自家用 ACS』と書く。
  - syllabus.js:230 の課目 c1（ソロ前の審査）の教科書のリンクが ['intro.course']。審査の中身は solo.check（book-3.js:250）の方が合う（syllabus は変えないので、intro.course の本文に solo.check への bk.see を置くとよい）。
- **わかりにくい**
  - intro.course：「レッスン 12 回と審査に合格するとソロへ」と「平均 11 回目でファーストソロ」が並んでいて、どちらが正しいのか読者にはわからない（別の記事・数え方の違いを説明する）。
  - intro.use の表の第 6 部の行が『公開情報の段階』の列に入っているが、公開情報ではない。
  - intro.cert：「Multi-engine（多発限定）」の『限定』、「Instrument Rating（計器飛行証明）」の『証明』と certificate / rating の違いの説明がない。
  - （ほか 2 件）
- **順番**
  - 本書の約束（タグ・教材値・架空名・NOT FOR NAVIGATION・G1000 型・日本語（English））を最初の節に置く（intro.use の最後か、新しい節 intro.marks）。
  - intro.study の内容は第 27 章 sim と重なるので、intro.study は『最初の 1 回を飛ぶまで』に絞り、詳しいキーと画面は sim.keys / sim.screen（新）へ bk.see で送る。
  - intro.cert の学生操縦士の制限の詳細は {ch:law}（61.89 の表）と solo.req に任せ、intro.cert は資格の階段（何がどの順で必要か）に絞る。
- **重複**
  - 学生操縦士の制限（61.89：乗客不可・昼 3 SM・夜 5 SM）が law（book-2.js:58 の key、book-2.js:76 の表）と solo.req（book-3.js:248）と重複。
  - 「12 回のレッスンと審査の後にソロ」「平均 11 回目でファーストソロ」が solo.req の key（book-3.js:249）と重複。
  - 確認問題 3（学生操縦士・61.89）が学科テスト quiz.js:72（『学生操縦士（61.89）ができないことは？』、正解『乗客を乗せる』）とほぼ同じ。
  - （ほか 2 件）
- **節ごとの問題（抜粋）**
  - `intro.use`：最初の文が 1 文で約 90 字と長い：「この教科書は、飛行機のことをほとんど知らない人が、米国（FAA）の自家用・計器・事業用・多発の訓練で学ぶ内容の入口を、日本語でゼロから順に理解できるように書いています。」→ 2〜3 文に分ける。
  - `intro.use`：部と段階の対応が文字だけの表（bk.t）。訓練の流れ（ロンドン → Sanford の Archer → 航法 → 計器 → Seminole → 最後の審査 → 副操縦士の訓練）は順番と位置の話なので、図にした方がわかりやすい。
  - `intro.use`：第 6 部の行の右の列「副操縦士の訓練へつながる考え方（教材の一般的な内容）」は公開されている段階ではない。この列の見出しは「対応する公開情報の段階」なので、この行だけ『教材の設計』とわかる書き方にする。
  - `intro.use`：本書全体で使う約束（「公開情報」「推測・要確認」のタグ、教材値と出典値の違い、模式図・NOT FOR NAVIGATION、LAB-A・LAB 空港・Archer Seven Lima Alpha などの架空の名前、計器は「G1000 型」、日本語（English）の書き方）の説明がどこにもない。最初の章でまとめて説明するべき。
  - （ほか 29 件）

### 書き直しの方針

intro.use で本書の対象と 6 部の地図（courseMap の図）を示し、続けて本書の約束（公開情報 / 推測・要確認、教材値 / 出典値、模式図・NOT FOR NAVIGATION、架空の名前、G1000 型、日本語（English））を説明する。約束の説明が長くなるなら新しい節 intro.marks（本書の記号と約束）を intro.use の次に作る。intro.course は時点（2025 年 10 月）を明記し、『事業用操縦士と計器飛行証明』を公開情報に移し、12 回と平均 11 回目の違いを説明して、solo.check へ bk.see でつなぐ。intro.cert は『資格の階段』（certLadder の図）に作り直し、年齢・最低時間・身体検査の等級・英語の条件を条番号つきで示し、誤り（全資格に学科と実地がある）と不正確な点（自家用の費用分担・ATP は副操縦士にも必要）を直す。学生操縦士の制限の詳細は {ch:law} と solo.req に任せて重複を減らす。intro.study は『最初の飛行課目を飛ぶまで』の 4 段階（studyLoop の図）に絞り、最小限のキー（W/S・A/D・R/F・T・H・P）と画面の見方は第 27 章 sim.keys と新しい sim.screen へ bk.see で送る。この章は CADET には出ないが TEXTBOOK には出るので、アプリの操作の話は intro.study だけに置く（intro.use の key からはアプリの話を外す）。

節の最初の図（いちばん大事な図）：
- `intro.use`：courseMap：左から右へ『ロンドン（英語の座学）→ Sanford・Piper Archer（90〜120 分のレッスン × 12 回 → 審査 Check Flight → ソロ）→ 航法（Navigation）→ 計器飛行 → P…
- `intro.course`：archerPhase：Archer の段階を拡大した帯図。『レッスン 1〜12（各 90〜120 分）→ 審査 → ソロ』を公開情報の色で、『各レッスンの中身・審査基準・SOP』を灰色の『非公開（推測しない）』の箱で示す。脇に『平均 11…
- `intro.cert`：certLadder：資格の階段図。左下から『学生操縦士（16 歳・試験なし・単独は教官の承認）→ 自家用（17 歳・40 時間・学科＋実地）→ 計器飛行証明（野外 50 時間・計器 40 時間）→ 事業用（18 歳・250 時間）→ ＋多…
- `intro.study`：studyLoop：円の 4 つの矢印『読む（教科書・考えてみよう）→ 答える（章末の問題・学科テスト 80%）→ 飛ぶ（課目：導入 → 基礎 → 精度）→ 振り返る（講評の × と「次に意識すること」・メモ）』。中央に『実機の予習・復習』…

### 図

今の図：`（なし：この章に FIG の図はない。以下は本文中の bk.t の表）` → keep、`bk.t intro.use 部と段階の表（book-1.js:15-21）` → redo、`bk.t intro.course 公開情報の表（book-1.js:26-33）` → fix、`bk.t intro.cert 資格の表（book-1.js:42-48）` → redo

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `courseMap` | `intro.use` | 公開されている訓練の流れ（ロンドン → Sanford・Archer → 航法 → 計器 → Seminole → 最後の審査 → 副操縦士任用訓練）の横の流れ図と、その下に本書の第 1〜6 部の帯。… | ANA の公開情報（R.ana1 2025-10-22、R.ana2 2025-10-29）、book-core.js の PARTS | must |
| `archerPhase` | `intro.course` | Archer の段階の拡大：レッスン 1〜12（各 90〜120 分）→ 審査（Check Flight）→ ソロ。公開情報（色）と非公開（灰色：各レッスンの中身・審査基準・SOP）を分ける。『平均 … | R.ana1・R.ana2 の文面（数字はそこからだけ） | should |
| `certLadder` | `intro.cert` | FAA の資格の階段：学生 → 自家用 → 計器飛行証明 → 事業用 → ＋多発の等級 → ATP。各段に年齢・最低飛行時間・試験（学科 / 実地）・身体検査の等級。全段の下に『英語を読み・話し・書き… | 14 CFR 61.83(a)(c)・61.85・61.103(a)(c)・61.109(a)・61.65(d)・61.123(a)・61.… | must |
| `certCategoryClass` | `intro.cert` | 種類（category：飛行機）・等級（class：単発陸上 / 多発陸上）・型式（type：B777 など）の入れ子の図。『Archer = 単発陸上、Seminole = 多発陸上、エアラインの大… | 14 CFR 61.5（資格と限定の一覧）。機体の例は physics.js の pa28 / pa44 | nice |
| `studyLoop` | `intro.study` | 読む → 答える → 飛ぶ → 振り返るの循環図。『飛ぶ』の中に導入 → 基礎 → 精度の 3 段（許容幅 1.5 倍 / 1 倍 / 0.6 倍）。 | school.js:25-29 の LEVELS（k: 1.5 / 1.0 / 0.6）、pages.js の学科テスト 80% | should |

### 写真

- `intro.course`：Piper PA-28-181 Archer の外観（訓練校・航空会社のロゴが写っていないもの）
- `intro.course`：Piper PA-44-180 Seminole の外観（双発・引き込み脚）
- `intro.use`：Orlando Sanford International Airport（KSFB）の空からの写真（Google の地図・画像は不可）
- `intro.cert`：FAA 本部の建物（Orville Wright Federal Building）

### 章末

- 確認問題：Q1：keep（公開情報の確認として適切。選択肢も妥当）。 / Q2：keep（教材値と公式基準の区別。この章の要点）。 / Q3：replace（『単独で飛べないのはどれ？』の聞き方が不自然：乗客を乗せる時点で単独ではない。しかも quiz.js:72 とほぼ同じ問題）。資格の階段の問題に替える（下の提案 1〜3）。
- 新しい問題の案：5 問（米国で、操縦士の資格（certificate）を取るための条件を決めている規則は？；14 CFR で、学生操縦士から ATP まで、どの資格にも共通する条件は？；米国の Part 121 のエアラインで副操縦士として乗務するのに必要な資格は？；次のうち、ANA が公開している『事実』はどれ？；すでに飛行機の資格を持つ人が『多発（multiengine）』の等級を加えるときに必要なのは？）
- 用語：追加：Student Pilot Certificate / 学生操縦士証明 / 16 歳から。試験はなく申請（61.83・61.85）；追加：Private Pilot Certificate / 自家用操縦士 / 17 歳・40 時間以上（61.103・61.109）；追加：Instrument Rating / 計器飛行証明 / IFR で飛ぶのに必要（61.3(e)・61.65）；追加：Commercial Pilot Certificate / 事業用操縦士 / 18 歳・250 時間以上（61.123・61.129）；追加：Class rating (Airplane Multiengine Land) / 等級限定（多発陸上） / 実地試験だけで追加できる（61.63(c)）；追加：Type rating / 型式限定 / 大型機など機種ごと；（ほか 7 件）
- 出典：keep：R.ana1（https://www.ana.co.jp/group/777_30th/20251022_2.html、2025-10-22 更新、内容を確認済み）；keep：R.ana2（https://www.anahd.co.jp/ana_news/2025/10/28/20251028.html、掲載 2025-10-29。『事業用操縦士と計器飛行証明』『平均11回目のフライト』『準備に始まり、準備に終わる』を確認）。ラベルに日付を足す；keep：R.acron（https://acronaviationacademy.com/usa/about-us/aircraft-fleet/：Archer・Seminole とも G1000、Archer は GFC700、FTD/AATD あり）；keep：R.cfr61。加えて条ごとのリンク：61.83 https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-C/section-61.83 、61.89 https://www.ecfr.gov/current/t…；add：14 CFR 121.436（副操縦士にも ATP）https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-121/subpart-M/section-121.436；（ほか 3 件）

## 第 2 章 `aero` 飛行の原理（Principles of flight / aerodynamics）

節：`aero.forces` 飛行機に働く 4 つの力・`aero.lift` 揚力はどうやって生まれるか・`aero.aoa` 迎え角と揚力係数・`aero.drag` 抗力・揚抗比・最良滑空速度・`aero.stall` 失速とスピン・`aero.turn` 旋回の物理と荷重倍数・`aero.stab` 安定性（縦・横・方向）・`aero.left` 左偏向傾向と逆ヨー（右ラダーが必要な理由）・`aero.ge` 地面効果とフラップ・`aero.vn` 速度の制限と V-n 線図

### 今の問題

- **誤り**
  - FIG.dragCurve のキャプション「チェックリストの最良滑空 76 kt は、風車状態のプロペラの抗力などを含む実機の値」→ 有害抗力（風車プロペラ）が増えると最小抗力速度は下がる（V_md ∝ (K/C_D0)^¼）。教材モデルでも風車プロペラ抗力込みの最良滑空は約 61〜66 KIAS。差の説明として誤り（物理計算・physics.js:500）
  - FIG.leftTurning：ヨーの弧（SVG の arc sweep-flag 1、矢じりが左上）は画面上で時計回り＝上から見て機首が右へ回る向き → 左偏向は反時計回りに描く（https://www.faa.gov/sites/faa.gov/files/07_phak_ch5_0.pdf p.5-32「yawing moment toward the left」）
  - FIG.aoa：角度の弧が翼弦線と相対風の間に描かれていない（弧の上端が翼弦線より約 40 px 下、相対風の矢印が前縁を通らない）→ 前縁で交わる 2 本の線の間に α を描く（https://www.faa.gov/sites/faa.gov/files/07_phak_ch5_0.pdf）
  - FIG.vn「Va 約 97」（= Vs1 50 KIAS × √3.8）→ V-n は CAS で成り立ち、Archer III の Va は 111 KCAS／113 KIAS（2,550 lb）。Vs1 50 KIAS は約 57 KCAS（https://touringmachine.com/Cherokee/PDFs/Cherokee%20Type%20Certificate%20Data%20Sheet%202A13.pdf TCDS 2A13 Archer III、FAA DRS で 2A13 を検索…
  - aero.vn 表「89 KIAS（1,917 lb）」→ TCDS 2A13 は Va 89 KCAS を 1,634 lb の値としている。√W で 1,917 lb は約 98 KIAS（同上 TCDS／https://www.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Archer_Checklist.pdf 2025 年版の誤植の可能性）
  - （ほか 8 件）
- **古い**
  - PHAK FAA-H-8083-25C（2023）は現行版のまま。ただし 2025-10 に MOSAIC 規則の Addendum（https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/PHAK_Addendum_(MOSAIC).pdf）が出て「現行版の…
  - AFH FAA-H-8083-3C（2021）も現行版。2025-10 の MOSAIC Addendum（https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/AFH_Addendum_(MOSAIC).pdf）は ch.1・2・4・6・17 のみで、失速…
  - IFH FAA-H-8083-15B（2012）は現行（Errata 2014・Addendum 2015・Addendum B 2019）。標準旋回の目安はこの版の p.4-11（÷10＋7）と p.7-19（TAS の 15%）。
  - （ほか 2 件）
- **数値の食い違い**
  - 最良滑空：本文・quiz.js・syllabus e3/e4 は 76 KIAS（チェックリスト）。教材モデルの抗力曲線（FIG.dragCurve、プロペラなし・1,050 kg）の最小抗力は約 71 kt。風車状態のプロペラ抗力を入れた教材モデルの最良滑空は steadyState で約 61 KIAS（滑空比 9.3）、全体シミュレ…
  - Va：FIG.vn は約 97（AR.s1 50 × √3.8）、表・キャプション・syllabus a5 は 113 KIAS（AR.va）。TCDS 2A13 は 111 KCAS（2,550 lb）。図は AR.va から逆算した失速線（Vs≒113/√3.8≒58 kt CAS）にするか、数値を入れない模式図に。
  - Va の軽い重量の値：本文 89 KIAS（1,917 lb、MGA 2025）。TCDS 89 KCAS は 1,634 lb。√W で 1,917 lb → 約 98 KIAS。
  - （ほか 11 件）
- **わかりにくい**
  - aero.stab：「縦安定」（ピッチ）と「縦軸まわり（ロール）」が同じ節に並び、縦・横の言葉が逆に聞こえる。縦安定＝ピッチ＝横軸まわり、と表で明示する。
  - aero.forces：「上昇中も…推力の一部が重力の一部を支えている」は分かりにくい。上昇中は重力の一部が後ろ向きに働く、と図で。
  - aero.lift：C_L の直感的な意味がなく記号表から始まる。ρ・S・C_L の説明より先に「速い・迎え角が大きい・空気が濃い→揚力が大きい」を。
  - （ほか 5 件）
- **順番**
  - 3 軸（ロール・ピッチ・ヨー）と操縦翼面・ボール（釣り合い旋回）が aero.stab の表で初めて出るのに、前の aero.stall（翼を水平・ラダー）と aero.turn（ラダー・ボール）で先に使っている → 新節 aero.axes を aero.drag と aero.stall の間に置く。
  - 逆ヨーの説明が aero.left（8 番目）にあるのに、aero.turn（6 番目）で「逆ヨーの打ち消し」と先に使う → aero.axes へ移す。
  - Archer の失速速度（Vs1 50・Vso 45）が最後の aero.vn まで出ない → aero.stall で先に示す。
  - （ほか 2 件）
- **重複**
  - ops.turns（第 14 章）：FIG.turnTable がそのまま 2 回目、急旋回の 1.41 G・失速速度 19% 増、オーバーバンキング傾向の説明も重複。aero.turn＝物理（表はここだけ）、ops.turns＝操作の手順と許容幅（表は {ch:aero} 参照）に分ける。
  - ops.slow（第 14 章）：失速回復の手順（「③出力を全開」）とスピン回復（PARE）を再掲。言い方を aero.stall と同じ（AFH の順番・出力は必要に応じて・POH 優先）にそろえ、片方は参照に。
  - sys.ctl（第 3 章）：操縦翼面とロール・ピッチ・ヨーの表が aero.stab の表と重複。新節 aero.axes に一般の 3 軸、sys.ctl に Archer 固有（スタビレーター・アンチサーボタブ・トリム）を。
  - （ほか 5 件）
- **節ごとの問題（抜粋）**
  - `aero.forces`：FIG.forces の機体は白い楕円と左上の四角だけで飛行機に見えない（胴体中央の灰色の棒が主翼なのか尾翼なのか不明）。lesson a1 で CADET の教室スクリーンに映る図なのに、章でいちばん弱い図。
  - `aero.forces`：4 本の矢印が同じ長さ。実際は揚力・重力が推力・抗力の約 9 倍（教材モデル 110 KIAS 巡航：揚力≒重力 10,300 N、抗力 約 1,160 N — FL.physics pa28 の CD0・K から計算）。PHAK も「簡単のため同じ長さで描く」と断っている。
  - `aero.forces`：「上昇中も、速度と上昇率が一定なら力はつり合っている（推力の一部が重力の一部を支えている）」は分かりにくく不正確。PHAK ch.5：上昇中は重力の一部が飛行経路に沿って後ろ向きに働き、推力＝抗力＋その成分、揚力は重力より少し小さい。
  - `aero.forces`：節の目的文（bk.aim）がない。考えてみよう の答えで「トリム」が説明なしに出る（トリムは sys.ctl・ops.trim で後から説明）。
  - （ほか 59 件）

### 書き直しの方針

10 の節の id と順番はそのまま（aero.forces は先頭＝lesson a1 の教室スクリーン、aero.lift は 2.2 のまま＝textbook のテスト）にし、新節を 2 つ足す：aero.axes「3 つの軸・操縦翼面・ボール（釣り合い旋回と逆ヨー）」を aero.drag と aero.stall の間に、aero.flaps「フラップの段階と使い方（10°・25°・40°、Vfe、ゴーアラウンドで 25° へ）」を aero.ge の後に置き、aero.ge は地面効果だけ、aero.left はプロペラだけ、aero.stab は安定だけにする。各節は目的文（bk.aim）→ その節でいちばん大事な 1 枚の図（4 つの力 → 翼のまわりの流れ → 迎え角とピッチ → 抗力曲線 → 3 軸 → 失速の流れ → 傾いた揚力 → 重心と尾翼 → プロペラの 4 つの原因 → 地面効果 → フラップ → 速度計）→ 説明 → ここが大切（2〜4 項目・60 字以内）の順で、最初は言葉と図だけで説明し、公式は L＝½ρV²SC_L と n＝1/cos だけを本文に、C_L の計算・旋回率と半径の公式は考えてみよう／補足に下げる。数値はすべて出典を書き分ける：チェックリスト（MGA 2025）の 76／66／102／113 KIAS、TCDS・POH と一致する 45／50／125／154 KIAS、教材モデル（FL.physics）の曲線・1,050 kg・C_L の計算。風車プロペラで 76 kt を説明する文、89 KIAS／1,917 lb の組、Va 約 97 の図は削除・作り直し、75° の行は「Archer の制限超え」とする。turnTable は aero.turn だけに置き、失速・スピンの回復は ops.slow と同じ言い方（AFH の順番：迎え角 → 翼を水平 → 出力は必要に応じて、スピンは AFH の手順と Archer のチェックリスト、POH 優先）にそろえる。アプリの操作（E・U キー、自動ラダーは初期設定 ON）は bk.sim の中だけに書き、「このシミュレータ」は ここが大切 から外す。

節の最初の図（いちばん大事な図）：
- `aero.forces`：横から見た Archer（作業ツリーの planeSide シルエット）に 4 つの力。揚力・重力を長く、推力・抗力を短く描き、教材モデル 110 KIAS の値（揚力 約 10,300 N／抗力 約 1,160 N、比 約 9：1）を数値…
- `aero.lift`：liftFlow：前から来る空気（相対風）、翼型、上面＝圧力が低い・下面＝圧力が高い、後ろで下へ曲げられた空気（吹き下ろし）と上向きの揚力の矢印（作業ツリーの下書きのまま使える）。
- `aero.aoa`：迎え角の定義図：翼型の前縁で交わる翼弦線（延長線）と相対風の矢印、その間の角度 α。下に小さく 2 コマ（planeSide）：巡航＝ピッチ≒迎え角、降下＝機首は水平線より下でも迎え角はプラス（ピッチ −2°・経路 −5° → 迎え角 約 …
- `aero.drag`：速度と抗力の曲線（教材モデル・海面上・1,050 kg・プロペラなし）：縦軸 0〜1,500 N、有害・誘導・全抗力のラベルを各線の横に、最小抗力（L/D 最大）約 71 kt の点。チェックリストの 76 KIAS は別の印で「実機の値（…
- `aero.stall`：翼のまわりの流れ 2 コマ：臨界迎え角より小さい＝流れが上面に沿う／超える＝上面で流れがはがれて揚力が急に減る（失速）。下に回復の 4 ステップの帯（①押して迎え角を減らす ②翼を水平 ③出力（必要に応じて） ④ゆるやかに戻す）。
- `aero.turn`：前から見た Archer（planeFront、バンク 30°）：傾いた揚力ベクトルと、その縦の成分（＝重さ）と横の成分（曲がる力）、重力。教材モデルで 30° のとき揚力 約 11,900 N（重さ 10,300 N の 1.15 倍）。…
- `aero.stab`：横から見た Archer に 3 本の矢印：重心（CG）の重力、重心より少し後ろの主翼の揚力、尾翼の下向きの力。「機首が下がろうとする → 尾翼が支える」のつり合いと、小さく「重心が後ろすぎ → 尾翼で支えきれず不安定」の対比。
- `aero.left`：4 コマの図：①トルク（後ろから見て機体が左に傾く、地上では左へ）②らせん後流が垂直尾翼の左側に当たる（上から）③P ファクター（横から：大迎え角で右側の下がるブレードの迎え角が大きい → 推力の中心が右）④ジャイロ効果。中央に反時計回りの…
- `aero.ge`：横から見た Archer が滑走路の上を飛ぶ模式図：翼の高さ＝翼幅・1/4・1/10 の 3 つの位置で翼端渦の大きさを変え、誘導抗力の減少（PHAK：1.4%・23.5%・47.6%）を添える。フレアで速すぎると「浮き続ける（フロート）」…
- `aero.vn`：アナログ速度計の模式図（写真ではなく SVG）：AR.s0/s1/fe/no/ne から白い弧 45〜102、緑の弧 50〜125、黄の弧 125〜154、赤線 154、Va 113（最大重量）の印。各色の意味を横に。

### 図

今の図：`forces` → redo、`aoa` → redo、`liftCurve` → fix、`dragCurve` → fix、`vn` → redo、`turnTable` → fix、`leftTurning` → redo、`stability` → fix

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `liftFlow` | `aero.lift` | 翼型のまわりの流線（相対風・上面低圧・下面高圧・下へ曲げられた空気）と揚力の矢印。作業ツリーの book-figs.js に下書きあり（NACA 2412 形状）— そのまま採用し最初の図に。 | 形状のみ（数値なし）。 | must |
| `aoaPitch` | `aero.aoa` | planeSide の 3 コマ：巡航（ピッチ≒迎え角）・上昇（ピッチ大、迎え角は小〜中）・降下（機首が水平線の下でも迎え角はプラス）。各コマに水平線・飛行経路（相対風）・翼弦線と角度。 | 模式的な例（ピッチ −2°・経路 −5° → 迎え角 +3°）。必要なら physics.steadyState の pitch／aoa（例… | must |
| `stallFlow` | `aero.stall` | 翼のまわりの流れ 2 コマ（臨界迎え角以下＝流れが沿う／超える＝上面ではがれる）＋回復 4 ステップの帯（押す → 翼を水平 → 出力は必要に応じて → ゆるやかに戻す）。節の最初の図。 | 臨界迎え角はモデル約 16°（physics aStall）・PHAK 16〜20°。手順は AFH 3C Figure 5-10。 | must |
| `turnForces` | `aero.turn` | 前から見た Archer（planeFront、バンク 30°）の揚力ベクトルと縦・横の成分、重力。横に 45°・60° の揚力の長さ（1.41・2.0 倍）。節の最初の図（a4/a5 の教室スクリー… | n＝1/cos φ、教材モデル mass 1,050 kg → 重さ 10,300 N、30° で揚力 11,900 N・横 5,950 N… | must |
| `axes3` | `aero.axes（新）` | 斜め上から見た飛行機に 3 本の軸（縦軸＝ロール・横軸＝ピッチ・垂直軸＝ヨー）と、それを動かす操縦翼面（エルロン・スタビレーター・ラダー）を色分け。縦安定＝ピッチ（横軸まわり）の対応も小さく。 | 形状のみ。 | must |
| `cgBalance` | `aero.stab` | 横から見た Archer：重心の重力、重心より後ろの主翼の揚力、尾翼の下向きの力のつり合い。小コマで「重心が後ろすぎ → 不安定」。節の最初の図。 | 模式（ARCHER_WB の重心範囲 82.0〜93.0 in を添えてもよい：TCDS 2A13 と一致）。 | must |
| `groundEffect` | `aero.ge` | 滑走路上の Archer を 3 つの高さ（翼幅・1/4・1/10）に置き、翼端渦の大きさと誘導抗力の減少を表示。フレアで速すぎるとフロート。 | PHAK p.5-11：−1.4%・−23.5%・−47.6%（公開資料の値と明記。教材モデル physics.js:222 はもっと強い）… | must |
| `asiArcs` | `aero.vn` | アナログ速度計の模式図：白 45〜102、緑 50〜125、黄 125〜154、赤線 154、Va 113（最大重量）の印。色の意味を横に。節の最初の図。 | FL.physics pa28.v（s0・s1・fe・no・ne・va）。 | must |
| `adverseYaw` | `aero.axes（新）` | 上から見た Archer が右へ傾き始める瞬間：下がったエルロン側（左翼）の揚力と抗力が大きく、機首が左へ（反時計回り）→ 右ラダーでボールを中央に。 | 形状のみ。 | should |
| `flapsSide` | `aero.flaps（新）／aero.ge` | planeSide（o.flap）で UP・10°・25°・40° の 4 段。それぞれの揚力の増え方・抗力の増え方と失速速度、使う場面（離陸 25°・場周の段階・着陸 40°・Vfe 102）。 | physics flapCL 0.55・flapCD 0.7・FLAP_DEG（ΔC_L 0.18／0.37／0.55、ΔC_D 0.009… | should |
| `dihedral` | `aero.stab` | 前から見た Archer（planeFront）が横滑りしたとき、下がった側の翼の迎え角が増えて元に戻る（上反角の効果）。 | physics wing.dih 7°（Archer の上反角）、PHAK p.5-18。 | should |
| `forcesClimb` | `aero.forces` | 一定の速度で上昇中の 4 つの力：重力を経路に沿う成分（後ろ向き）と垂直成分に分け、推力＝抗力＋後ろ向き成分、揚力は重力より少し小さい。 | 教材モデル Vy 76 KIAS 全開上昇（steadyState：約 660 fpm、経路角 約 5°）。 | nice |
| `spinSkid` | `aero.stall` | 上から見た場周のベースからファイナル：オーバーシュート → 内側ラダーで機首を回す（横滑り）→ 引く → 失速・スピン、の危険な流れと「ゴーアラウンド」の正しい選択。模式図。 | AFH 3C p.5-20（バンク 30° を超えない）。 | nice |
| `glideCompare` | `aero.drag` | 同じ高度からの滑空の道筋 3 本：最良滑空速度・遅すぎ（機首上げ）・速すぎ。どちらにずれても届く距離が短くなる。模式図（距離の数値は入れない）。 | 形だけ（モデルと実機の数値が合わないので数値なし）。 | nice |

### 写真

- `aero.forces`：飛行中の Piper PA-28-181 Archer を真横から（訓練校の塗装・ロゴがない個人機）
- `aero.drag`：色付きの煙で見える翼端渦（NASA Langley の農業機の後流試験）（候補：https://commons.wikimedia.org/wiki/File:Airplane_vortex_edit.jpg Public domain（NASA）— ページで要確認）
- `aero.stall`：主翼に付けた毛糸（タフト）で流れのはく離を見る風洞・飛行試験
- `aero.stall`：PA-28 の主翼前縁の失速警報ベーン（小さな金属片）
- `aero.turn`：大きくバンクして旋回中の単発プロペラ練習機（T-6 Texan II など）
- `aero.stab`：正面から見た低翼単発機（上反角が分かる）
- `aero.left`：PA-28 の 2 枚羽根の固定ピッチプロペラとスピナー（正面）
- `aero.ge`：滑走路の直上でフレア中の低翼単発機（横から）
- `aero.flaps（新）／aero.ge`：フラップを最大まで下げた PA-28 の主翼後縁

### 章末

- 確認問題：Q1（失速の直接の条件）: keep — PHAK p.5-25 と一致。why に「どんな姿勢・速度でも」は既にある。 / Q2（60° の荷重倍数）: keep — why に「曲技でない機体の旋回は 60° まで、Archer の制限は +3.8 G」を足すと turnTable の 75° 問題ともつながる。 / Q3（離陸・上昇のラダー）: keep — 正しい。why の「後流・P ファクター等」にトルク・ジャイロも含めて 4 つと書くとよい（quiz.js q_aero の問 8 と同じ内容なので重複は気にしなくてよい）。
- 新しい問題の案：4 問（降下中、機首が水平線より少し下を向いている。このときの翼の迎え角は？；Archer（2,550 lb）で乱気流に入った。速度の目安として正しいものは？；エンジンが止まった。目の前の畑まで届くか微妙。どうする？；地面効果で誘導抗力が大きく減るのは、翼がどのくらいの高さにあるとき？）
- 用語：Relative wind / 相対風 / 翼に当たる空気の流れ（飛行経路の反対向き）；Chord line / 翼弦線 / 前縁と後縁を結ぶ線；Lift coefficient (CL) / 揚力係数 / 翼の形と迎え角で決まる揚力の出しやすさ；Parasite drag / Induced drag / 有害抗力・誘導抗力 / 速いほど・遅いほど大きい；Lift-to-drag ratio (L/D) / 揚抗比 / 滑空比と同じ（無風）；Wingtip vortices / 翼端渦 / 誘導抗力のもと；（ほか 13 件）
- 出典：update: R.phak → 章を指定（ch.4 Principles of Flight https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/chapter-4-principles-flight、ch.5 Aerodyna…；update: R.afh → ch.5 Maintaining Aircraft Control（失速・スピンの回復テンプレート）https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airpla…；add: FAA Instrument Flying Handbook FAA-H-8083-15B（標準旋回の目安 p.4-11・p.7-19）https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation…；add: FAA Type Certificate Data Sheet 2A13（PA-28-181 Archer III：速度制限 KCAS・フラップ 10/25/40°・普通類／実用類）— FAA DRS https://drs.faa.gov/ で "2A13" を検索（写し：https://touringma…；add: 14 CFR 91.307(c)（バンク 60°・ピッチ 30°）https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-D/section-91.307 と 14 CFR 23.2005(d)（曲技でない機体の…；（ほか 1 件）

## 第 3 章 `sys` 機体と装備（Archer と G1000）

節：`sys.ctl` 機体の構造・操縦翼面・トリム（提案：機体の各部・操縦翼面・トリムとフラップ）・`sys.engine` エンジン・点火・ミクスチャー・キャブレターアイス（提案：エンジン・点火・ミクスチャー）・`sys.fuel` 燃料系統（左右のタンクとセレクター）・`sys.elec` 電気系統と G1000（提案：電気系統：発電機・バッテリー・ブレーカー）・`sys.g1000` ピトー静圧・AHRS・ADC と G1000 の表示（提案：ピトー静圧・AHRS・ADC と予備計器）・`sys.compass` 磁気コンパスと予備計器（提案：磁気コンパスと誤差）・`sys.gear` 降着装置・ブレーキ・灯火（提案：降着装置とブレーキ。灯火は新設の sys.lights へ）・`sys.cockpit` 【新設案】操縦席の配置：計器板・スイッチ・レバー・`sys.carb` 【新設案】キャブレターアイスとキャブヒート（燃料噴射式は代替空気）・`sys.lights` 【新設案】灯火：航空灯・衝突防止灯・着陸灯

### 今の問題

- **誤り**
  - sys.engine「Archer のエンジンは一般に Lycoming O-360（180 hp）」→ Piper の現行の Archer TX 仕様書（2024）は燃料噴射式の Lycoming IO-360-B4A・180 hp、固定ピッチ 2 枚の Sensenich。キャブレター式の O-360-A4M は Archer III と 2020 年ごろまでの TX。キャブレターアイスはキャブレター式だけの話（https://piper.com/wp-content/uploads/2024/05/Arche…
  - sys.fuel「切り替えるときは電動ポンプ ON（チェックリストの例）」→ MGSU のチェックリスト（2025）にこの項目はない。あるのは After Start の「SWITCH TANKS; Fuel Pump OFF」と LOSS OF FUEL PRESSURE の「Electric Fuel Pump ON・Fuel Selector SWITCH」だけ。出典を POH に変えるか、確かめられるまで「チェックリストの例」を消す（https://www.mga.edu/aviation/knight-f…
  - sys.elec「サーキットブレーカー…再び飛んだら戻さない」→ FAA：飛行中は、承認された手順が求めるとき、または安全な飛行に必要なとき以外は戻さない。この Archer の ALT の手順は ALT のブレーカーを戻すように言っている。「何度も戻さない・原因がわからなければ戻さない」と書く（FAA SAIB CE-10-11 https://www.faasafety.gov/files/notices/2009/Dec/SAIB_CE-10-11.pdf ・PHAK 第 7 章 https://www.fa…
  - sys.g1000 の詰まりの表 → 「ピトー管が詰まり、排水穴は開いている → 速度計は 0 になる」の場合が抜けている（PHAK 25C 第 8 章 Figure 8-9 https://www.faa.gov/sites/faa.gov/files/10_phak_ch8.pdf）
  - sys.engine の key「油圧の喪失は「なるべく早く着陸」」→ チェックリストは "Land as Soon as Practical and Investigate the Cause. Prepare for Power off Landing"（as soon as possible ではない）
  - （ほか 1 件）
- **古い**
  - 参考文献の Garmin G1000 Cockpit Reference Guide 190-01460-00 Rev. A（2013 年 4 月）は、NXi より前の G1000 の Archer III 用。MGSU のチェックリスト（Archer III w/ G1000）には合っているが、いま作られている Archer は G10…
  - エンジン：O-360（キャブレター式）→ 現行の Archer TX は IO-360-B4A（燃料噴射式）（Piper の仕様書 2024）
  - 磁気偏差：FAA の空港資料の値は 2000 年の 05W のまま。2026 年のモデルでは約 7°W（https://maps.avnwx.com/airport/KSFB）。本文の「約 6〜7°」は合っているが、「約 7°W（2026 年ごろ）」とする方がよい。教材の 6°W はそのまま教材値として残す
  - （ほか 1 件）
- **数値の食い違い**
  - 燃料の消費：perf.climb（book-1.js@HEAD:237）は「巡航で 1 時間に 8〜10 US gal 前後」。教材モデルは 3,000 ft・110 KIAS（スロットル約 76%・約 2,400 rpm）で約 11.5 gal/h（physics.js:622 の 0.078 gal/hp/h。アプリの MFD の F…
  - 左右のタンク：physics.js:624 は左右から半分ずつ減らす（BOTH と同じ動き）。本文の「BOTH の位置はない」「時間を決めて切り替える」と合わない。本文に「教材では左右が同じだけ減る」と書く
  - 磁気偏差：physics.js:66 の MAGVAR_W＝6（教材用近似）。いまの値は約 7°W。本文は「教材用近似」と書いているので矛盾はない
  - （ほか 4 件）
- **わかりにくい**
  - sys.g1000 の key「高度計は「高い所から低い所へ飛ぶと、実際より高く表示される」」：「高い所」が高度のことに読める。「気圧（気温）の高い所から低い所へ」とする
  - 略語が初めて出るときに説明がない：KIAS（sys.fuel の key）、PFD・MFD（sys.g1000。PFD の説明はアプリのチュートリアルにしかない）、BATT MASTR・ALTR・EMERG BATT（sys.elec）、OAT、GS・TRK、rpm
  - sys.ctl「アンチサーボタブが動きを重くして過敏さを抑え、トリムタブも兼ねています」：どう動くのか（スタビレーターの後縁と同じ向きに動いて空気の力で戻そうとする）が書かれていない
  - （ほか 6 件）
- **順番**
  - 予備計器を sys.elec（EMERG BATT）で先に使い、説明は sys.compass にある。予備計器の説明は sys.g1000 に移す
  - 灯火が sys.gear の最後の 1 文に埋もれている → 新しい節 sys.lights に分ける
  - sys.elec の題は「電気系統と G1000」だが、G1000 型の表示の説明は sys.g1000 にある
  - （ほか 3 件）
- **重複**
  - aero.stab（book-1.js@HEAD:118）の「軸・動き・主な操縦翼面」の表 ↔ sys.ctl の操縦の表。軸の図は sys.ctl に 1 つだけ置き、aero.stab は安定性の話だけにしてリンクでつなぐ
  - ops.trim（book-3.js:61-66）のトリムの手順と T キー、課目 a1 ↔ sys.ctl のトリムの段落と bk.sim a1。sys.ctl は「トリムという装置」の説明だけにし、操作の手順は ops.trim に任せる
  - aero.ge（book-1.js@HEAD:128-134）フラップの空力 ↔ sys.ctl（フラップがない）。sys.ctl にはレバーと 4 つの位置だけを書き、空力は aero.ge へ
  - （ほか 7 件）
- **節ごとの問題（抜粋）**
  - `sys.ctl`：図がない。3 つの軸と、どの操作でどの翼面がどう動くかを、文と表（bk.t）だけで説明している。初心者には位置関係がつかみにくい
  - `sys.ctl`：表の見出し「このシミュレータのキー」：事実の表にアプリのキーが混ざっている（CADET は列を消して対応、content.test.mjs:117-118 がこれをテストしている）。キーは bk.sim の中へ移す方がよい
  - `sys.ctl`：「操縦輪を前後 | W / S」：どちらがどちらか書いていない（app.js KEYMAP：S＝引く＝機首上げ、W＝押す＝機首下げ。矢印キーも同じ）
  - `sys.ctl`：「アンチサーボタブが動きを重くして過敏さを抑え」：仕組み（タブがスタビレーターの後縁と同じ向きに動く。PHAK 第 6 章）が書かれていない。トリムホイールがどこにあるか（前席の間）も書かれていない
  - （ほか 57 件）

### 書き直しの方針

The chapter has 0 figures and only 4 tables. For a beginner who has never seen the airplane, its first job is to show where things are and what moves what, so every section (existing and new) should open with one SVG that answers that, before any table. Proposed order (ids unchanged; 3 new sections): sys.ctl (airplane parts, three axes, control surfaces, anti-servo tab, trim wheel, flap lever) → sys.gear (fixed tricycle gear, strut checks, pedal steering, toe and parking brake) → sys.lights NEW (position, anti-collision and landing lights) → sys.cockpit NEW (one G1000-type panel and cockpit layout figure) → sys.engine (four-cylinder engine, fixed-pitch prop, dual magnetos, mixture, oil and engine gauges) → sys.carb NEW (carburetor ice with PHAK numbers; fuel-injected IO-360 Archers use alternate air instead) → sys.fuel → sys.elec → sys.g1000 (pitot-static on the left-wing mast, ADC/AHRS/GPS, blockages, airspeed types, standby instruments moved here) → sys.compass (compass errors only). Explain how each system works here, and leave procedures to other chapters with bk.see links: emergency checklists to emg.engine/emg.fire/emg.elec, run-up numbers to ground.runup, trim technique to ops.trim, variation arithmetic to nav.plan, flap aerodynamics to aero.ge, Seminole gear to me. Keep one-line checklist examples, labelled as one public school checklist (MGSU 2025) with 実機は POH が優先. Every ここが大切 item should be one short claim of 60 characters or less, with no checklist sequences in brackets and no lesson names; sys.gear needs its first key box. Fix the facts listed in errors: engine model by year, the electric-pump-when-switching attribution, circuit-breaker reset guidance, the missing pitot-blocked/drain-open case, and 'high to low' meaning pressure or temperature. Move all keys (W/S direction, T, V, B) into bk.sim boxes so the fact tables stay clean for CADET. Say plainly that the app does not model mixture, carb heat, tank selection, oil pressure or volts, and that its tanks drain evenly.

節の最初の図（いちばん大事な図）：
- `sys.ctl`：controlAxes：Archer を上から見た模式図（FL.physics pa28 の形のデータから描く）。縦軸・横軸・垂直軸の 3 本と、それぞれの軸まわりの動き（ロール・ピッチ・ヨー）。その軸を動かす翼面（エルロン・スタビレーター…
- `sys.engine`：engineFlow：吸気から排気までの流れの模式図。空気 → エアフィルター（またはキャブヒートの熱い空気）→ キャブレター（燃料が混ざる。スロットル弁＝黒いレバー、ミクスチャー＝赤いレバー）→ 4 つのシリンダー（各シリンダーにプラグ …
- `sys.fuel`：fuelSystem：低翼の Archer の燃料系統の模式図。左右のタンク（各 24 US gal 使用可・教材値＝FL.physics fuelCap。通気口とサンプのドレイン）→ セレクター（LEFT / RIGHT / OFF、BO…
- `sys.elec`：elecSystem：電気系統の模式図。オルタネーター（エンジンで回る）とバッテリー → BATT MASTR・ALTR スイッチ → バス → ブレーカー → 使うもの（G1000 型の PFD・MFD、無線、灯火、ピトーヒーター、電動燃…
- `sys.g1000`：pitotStatic：Archer のピトー静圧系統の模式図。左翼の下の柱（先端の穴＝ピトー管＝全圧、横の小さな穴＝静圧孔、排水穴）→ 配管 → ADC → PFD の速度・高度・昇降率。同じ配管から機械式の予備の速度計・高度計へ。機内の…
- `sys.compass`：compassErrors：2 つの段の図。上：北半球で東から北へ旋回すると、コンパスが実際より遅れる → 約 30° 手前で旋回を止める（UNOS。15°＋緯度の半分、北緯 29°）。南への旋回は先回りする → 行き過ぎてから止める。下：…
- `sys.gear`：gearBrakes（sys.lights を作る場合）：Archer の横から見た図。固定の前輪と主輪、緩衝支柱（点検値 主脚 4.5 in・前脚 3.25 in＝チェックリスト）、ラダーペダル（上の部分がトーブレーキ、前輪の向きと連動）…
- `sys.cockpit`：cockpitLayout：G1000 型の計器板と操縦席の模式図。PFD（左）・MFD（右）・予備計器・窓の上のコンパス、スイッチの列（BATT MASTR・ALTR・灯火・ピトーヒート・電動燃料ポンプ・マグネトー／スターター・EMERG…
- `sys.carb`：carbIce：フロート式キャブレターの断面の模式図。ベンチュリーで空気が速くなり圧力が下がる＋燃料が気化する → 温度が下がる（最大 約 38℃）→ スロットル弁とベンチュリーに氷 → 空気の通り道が狭くなる。キャブヒートの熱い空気の入り…
- `sys.lights`：positionLights：上から見た Archer の左翼端に赤、右翼端に緑、尾部に白（光の届く範囲を扇形で）。その下に 3 つの小さな絵：赤が左・緑が右に見える＝同じ方向へ飛んでいる、赤が右・緑が左に見える＝こちらへ向かってくる、白だ…

### 図

今の図：`(none) — sys uses no FIG.* figure` → redo、`bk.t in sys.ctl (操縦装置・動く翼面・機体の動き・このシミュレータのキー)` → fix、`bk.t in sys.g1000 (装置・入力・出すもの)` → fix、`bk.t in sys.g1000 (故障・速度計・高度計・昇降計)` → fix

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `controlAxes` | `sys.ctl` | Main figure. Archer plan view with the longitudinal, lateral and vertical axes through the CG; roll,… | Outline from FL.physics AIRCRAFT pa28 geometry (wing b 10.8 m, wing.ai… | must |
| `cockpitLayout` | `sys.cockpit` | Main figure of the new section. G1000-type panel and cockpit schematic: PFD, MFD, standby instrument… | Switch names from the MGSU Archer III G1000 checklist (2025); PFD/MFD/… | must |
| `engineFlow` | `sys.engine` | Main figure. Induction and ignition flow: air → filter or carb-heat air → carburetor (throttle valve… | PHAK 25C ch. 7 (carburetor, ignition system); MGSU checklist (Carburet… | must |
| `carbIce` | `sys.carb` | Main figure of the new section. Float-carburetor cross-section: venturi (higher speed, lower pressur… | PHAK 25C ch. 7, Figure 7-11 and its text (temperature drop 60–70 °F, a… | must |
| `carbIceChart` | `sys.carb` | Simplified chart: outside air temperature (−7 to 38 °C / 20 to 100 °F) against relative humidity, wi… | PHAK 25C ch. 7 text and Figure 7-12 axes | should |
| `fuelSystem` | `sys.fuel` | Main figure. Two wing tanks (24 US gal usable each, with vent and sump drain) → selector LEFT/RIGHT/… | FL.physics pa28 fuelCap 24 (teaching value; matches Piper's 48 US gal … | must |
| `elecSystem` | `sys.elec` | Main figure. Alternator and battery → BATT MASTR / ALTR → bus → circuit breakers → loads (G1000-type… | MGSU checklist (switch names, ALT annunciator procedure, the 'bus volt… | must |
| `pitotStatic` | `sys.g1000` | Main figure. Archer pitot-static mast under the left wing (pitot opening = total pressure, static ho… | MGSU checklist (Pitot Mast in the left wing, Pitot and Static Drains, … | must |
| `g1000Sources` | `sys.g1000` | Block diagram from sensors to the display: pitot/static/OAT → ADC → IAS, TAS, altitude, VS, OAT; AHR… | Garmin G1000 CRG for the PA-28-181 (GDC 74A, GRS 77, GMU 44; red X); i… | should |
| `pitotBlock` | `sys.g1000` | Three small panels: (1) pitot blocked, drain open → airspeed drops to 0 (e.g. pitot cover left on); … | PHAK 25C ch. 8 Figures 8-9 to 8-11 and their text | should |
| `altimeterHighLow` | `sys.g1000` | 'High to low, look out below': an airplane flying from a high-pressure (or warm) area to a low-press… | PHAK 25C ch. 8 (altimeter errors); example values labelled 教材の例 | should |
| `compassErrors` | `sys.compass` | Main figure. Top: turning error. Turning toward north, the compass lags, so roll out about 30° early… | PHAK 25C ch. 8 (northerly/southerly turning errors, 15° + half latitud… | must |
| `northTypes` | `sys.compass` | True north, magnetic north (6° W teaching value) and compass north (deviation) as three arrows, with… | physics.js MAGVAR_W = 6 (教材用近似); PHAK 25C ch. 8 (variation, deviation,… | should |
| `positionLights` | `sys.lights` | Main figure of the new section (or of sys.gear if sys.lights is not created). Plan view: red on the … | AFH 3C ch. 11 (Figure 11-4 and its text); 14 CFR 91.209. Optional cove… | must |
| `gearBrakes` | `sys.gear` | Archer side view: fixed nose and main gear with oleo struts (check values main 4.5 in, nose 3.25 in)… | MGSU checklist (Main Gear Strut CHECK 4.5 in, Nose Gear Strut CHECK 3.… | should |
| `stabilatorTab` | `sys.ctl` | Side view of the stabilator and anti-servo tab: when the trailing edge goes up, the tab goes up furt… | PHAK 25C ch. 6 (stabilator, antiservo tab, Figure 6-21); MGSU checklis… | should |
| `magCheck` | `sys.engine` | Bar chart at 2,000 rpm: BOTH, L only and R only, with limits (drop ≤ 175 rpm, difference ≤ 50 rpm); … | MGSU checklist RUNUP (2000 RPM, max drop 175, max difference 50); grou… | should |
| `fuelColors` | `sys.fuel` | Fuel colour coding: 80 red, 100 green, 100LL blue, Jet A colourless/straw; AVGAS decal white on red,… | PHAK 25C ch. 7 Figure 7-32 and its text | nice |
| `flapPositions` | `sys.ctl` | Wing section with flaps UP / 10° / 25° / 40° and the manual flap lever notches between the seats; 'b… | FL.physics pa28 flapLabels ['UP','10°','25°','40°'], v.fe 102; MGSU ch… | nice |
| `mixtureLean` | `sys.engine` | Air density ratio falling with altitude (0, 3,000, 6,000, 9,000 ft) while fuel flow stays the same a… | Standard-atmosphere density ratio from FL.physics atmos (or ISA tables… | nice |
| `airspeedKinds` | `sys.g1000` | Ladder IAS → CAS → TAS → GS with one worked example: 100 KIAS at 5,000 ft is about 110 KTAS (2 % per… | PHAK 25C ch. 8 (TAS rule of thumb, GS); check the example against the … | nice |

### 写真

- `sys.ctl`：A privately owned Piper PA-28-181 Archer (no school or airline livery), three-quarter view, showing the low wing, stabil…
- `sys.ctl`：Close-up of a PA-28 stabilator with its anti-servo tab
- `sys.engine`：Lycoming O-360 / IO-360 four-cylinder engine with the cowling open (museum or maintenance), with no people
- `sys.fuel`：Fuel sample in a clear tester cup showing blue 100LL (optionally with a water bubble at the bottom)
- `sys.g1000`：Pitot-static mast under the wing of a Piper PA-28 (pitot cover removed)
- `sys.compass`：Liquid-filled magnetic ('whiskey') compass in a light aircraft, ideally with its deviation card visible
- `sys.lights`：Wingtip of a light aircraft showing the red (left) position light and strobe; or a night photo of a taxiing light aircra…
- `sys.gear`：PA-28 nose gear with oleo strut and nose-wheel steering linkage

### 章末

- 確認問題：Q1（燃料セレクター）：残す。選択肢「切り替えは不要」は弱いので「左右の量の差は気にしなくてよい」などに変えてもよい。why は PHAK 第 7 章に合っている / Q2（静圧孔の詰まり → 高度計は止まる）：残す。why に「昇降計は 0、上昇すると速度計は少なく表示」を足すと sys.g1000 の図とつながる / Q3（回転がじわじわ下がる → キャブレターアイス）：quiz.js の q_sys の 3 問めと同じ考えなので、「キャブヒートを入れたあとの回転の変化（いったん下がって上がる）」の問題に変えるか、sys.carb を作ったらそちらで出す…
- 新しい問題の案：5 問（夜、前方に他の飛行機の灯火が見えた。自分から見て右に赤、左に緑が見える。相手はどう動いている？；離陸滑走で、速度計が 0 のまま動かない。最も考えられる原因と、することは？；燃料計について正しいものは？；北半球で、東（090°）から左旋回して北（360°）へ向かう。磁気コンパスだけを見て旋回を止めるのはいつ？；キャブレターアイスがあるときにキャブヒートを全開にした。固定ピッチの Archer の回転計はどう動く？）
- 用語：Aileron / エルロン（補助翼。左右が逆に動いてロールさせる）；Stabilator / スタビレーター（全体が動く水平尾翼。Archer）；Anti-servo tab / アンチサーボタブ（スタビレーターの後ろの小さな板。操縦を重くし、トリムも兼ねる）；Rudder / ラダー（方向舵。ヨー）；Longitudinal / lateral / vertical axis / 縦軸・横軸・垂直軸（ロール・ピッチ・ヨー）；Trim wheel / トリムホイール（操縦の力を消す装置）；（ほか 37 件）
- 出典：keep R.phak（FAA-H-8083-25C、2023 年版がいまも最新）。add 章の PDF：第 6 章 https://www.faa.gov/sites/faa.gov/files/08_phak_ch6.pdf ・第 7 章 https://www.faa.gov/sites/faa.gov/file…；keep R.archerCk（MGSU Archer III w/ G1000 Pilot's Checklist、版 09012025、2026-10-26 にいまも同じことを確認）https://www.mga.edu/aviation/knight-flight/aircraft-information-pro…；update R.g1000 の名前：「Garmin G1000 Cockpit Reference Guide — Piper PA-28-181 Archer（190-01460-00 Rev. A、2013・NXi 以前の G1000）」https://static.garmin.com/pumac/190-01…；add Garmin G1000 NXi Pilot's Guide — Piper PA-28-181 Archer（190-02130-02 Rev. A）https://static.garmin.com/pumac/190-02130-02_A.pdf；add Piper Archer TX 仕様書（2024：IO-360-B4A・180 hp・48 US gal usable・G1000 NXi・G5 の予備計器・LED の灯火）https://piper.com/wp-content/uploads/2024/05/Archer-TX.pdf（R.archer の…；（ほか 5 件）

## 第 4 章 `perf` 性能と重量・重心（Performance, weight and balance）

節：`perf.da` 密度高度：暑い・高い・湿った日は性能が落ちる・`perf.tol` 離着陸距離と POH の性能表・`perf.climb` 上昇・巡航・燃料消費の目安・`perf.wb` 重量と重心（Weight & Balance）

### 今の問題

- **誤り**
  - perf.tol「性能表の値は新しい機体と熟練した操縦士で測ったもの」→ PHAK 25C 第 11 章：test flights in a new aircraft, under normal operating conditions, average piloting skills, aircraft and engine in good working order（https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/ch…
  - perf.tol「滑走路の半分までに Vr の 70%」→ AIM 7-6-8：70 percent of lift-off airspeed by the midpoint of the runway（浮揚速度の 70%）。目安であり、速度計が低速で正確でない・路面が一様でない場合の注意つき（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap7_section_6.html）
  - examples「夏の Sanford（55 ft・33℃・29.92 inHg）：密度高度は約 2,300 ft」→ 本書の概算式で 2,228 ft（約 2,200 ft、計算機の表示と同じ）、乾燥空気の正確な計算で約 2,120 ft、FAA-P-8740-2 の早見表（海面・90°F）で約 1,900 ft（https://www.faasafety.gov/files/gslac/library/documents/2011/Aug/56396/FAA%20P-8740-02%20DensityAltit…
  - examples「後席に 2 人と手荷物 50 lb を積んだら、重心が後方限界に近づいた」→ ARCHER_WB の既定値（BEW 1,640・前席 340・燃料 240 lb）に後席 340・手荷物 50 lb で 2,610 lb＝最大離陸重量 2,550 lb を超過、重心 92.0 in は範囲内。後方超過の正しい例：前席 170・後席 340・手荷物 100・燃料 30 gal（180 lb）→ 2,430 lb・93.8 in（TCDS 2A13 の後方限界 93.0 in 超）
  - perf.wb「数値（アーム・許容範囲）は教材用近似」→ FAA TCDS 2A13（PA-28-181 Archer III）と同じ公開値。近似なのは空虚重量とその重心だけ（https://drs.faa.gov で 2A13 を検索。確認した写し：Revision 48）
  - （ほか 1 件）
- **古い**
  - refs の FAA Aircraft Weight and Balance Handbook（R.wb、book-core.js:27）の URL https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/weight_balance_handbook は 4…
  - PHAK FAA-H-8083-25C は現行版。MOSAIC の Addendum（https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/PHAK_Addendum_(MOSAIC).pdf）があるが本章の内容には影響しない。
  - MGA の Archer III G1000 チェックリスト（2025、09012025 final）は有効（200）。Vy 76・Vx 64・巡航上昇 87（地上 1,000 ft で）・短距離離陸フラップ 25°・Vr 55 を確認。
  - （ほか 1 件）
- **数値の食い違い**
  - perf.climb の表（FLIGHT LAB）：約 780 fpm（モデル 777）・約 660 fpm（663）・スロットル約 76%（0.760）・約 2,400 rpm（2,401）— FL.physics と一致。ただし同じコードを CADET で描くと FL.physics が空島の飛行モデルに置き換わり、約 730 fpm…
  - 表の数字の条件が未記載：モデルの重量 1,050 kg＝2,315 lb（physics.js pa28.phys.mass）、標準大気。公開値は 2,550 lb・海面・標準大気で 667 fpm（AOPA）。
  - 教材モデルの最良上昇率速度は約 84 KIAS（海面）・81 KIAS（3,000 ft）。87 KIAS（797 fpm）が 76 KIAS（781 fpm）よりわずかに上がる。最良上昇角は 63〜64 KIAS で Vx 64 と一致。
  - （ほか 8 件）
- **わかりにくい**
  - perf.da：「密度を『標準大気なら何 ft に相当するか』で表したもの」— 抽象的。具体例を先に。
  - perf.da：「気圧高度」「標準気温」「高度計規正値」が式の中で初めて出る（日本語（English）の説明なし）。
  - perf.da の key「真対気速度は速いが、指示対気速度で見る失速速度・Vr は同じ（IAS で飛ぶ）」— 何が起きるか（距離が延びる）が書かれていない。
  - （ほか 6 件）
- **順番**
  - perf.da：式が用語（気圧高度・標準気温）の説明より先。用語 → 例 → 式 → 計算機の順に。
  - perf.climb：上昇の話の後ろに燃料計画が混ざっている。燃料は新しい節 perf.fuel に分ける。
  - perf.wb の「重量が重いと失速速度が上がり、離陸距離が延び…」は perf.tol・perf.climb の前提なのに章の最後。順は保つなら perf.tol の表で「重量」を 1 行で説明し、perf.wb を参照ボタン（bk.see）でつなぐ。
  - （ほか 1 件）
- **重複**
  - FIG.atm と ISA の説明（15℃・29.92 inHg・2℃/1,000 ft・1 inHg/1,000 ft）は wx 章 wx.atm（book-2.js:11–12）と同じ。perf.da では最初の図にせず wx.atm を参照する。
  - Vx・Vy・巡航上昇の速度表は ops 章 ops.climb（book-3.js:74–79）と重複。
  - 短距離離陸の手順は ops 章 ops.short（book-3.js:163–171）。perf.tol の bk.sim と同じレッスン x3。
  - （ほか 3 件）
- **節ごとの問題（抜粋）**
  - `perf.da`：最初の図が FIG.atm（ISA の気温のグラフ）で、wx.atm（book-2.js:11）と同じ図。密度高度そのもの（「暑い日の低い空港は、高い空港と同じように飛ぶ」）を見せていない。CADET の教室スクリーンにもこの ISA の図が出る。
  - `perf.da`：「密度を『標準大気なら何 ft に相当するか』で表したもの」は初学者には抽象的。先に具体例（55 ft の空港でも 33℃ なら、約 2,200 ft の空港と同じ性能）を言うべき。
  - `perf.da`：式「気圧高度 ≒ 標高 ＋（29.92 − 高度計規正値）× 1,000 ft」「密度高度 ≒ 気圧高度 ＋ 120 ×（気温 − 標準気温）」が、気圧高度（高度計を 29.92 に合わせたときの表示）と標準気温（15℃ − 1,000 ft ごとに 2℃）の説明より前に出る。
  - `perf.da`：120 ft/℃ の式が公的な式のように書かれている。PHAK と FAA-P-8740-2 は表・計算尺（E6B）を使う。広く使われる概算（FAA の表よりやや大きめに出る）と書き、「性能表には気圧高度と気温を入れる」と添える。
  - （ほか 30 件）

### 書き直しの方針

節の順（perf.da → perf.tol → perf.climb → perf.wb）は保ち、各節の最初で「性能を決めるのは空気の密度・重量・風・路面」という 1 つの見取り図を示します。perf.da は「暑い日の低い空港は高い空港と同じように飛ぶ」を最初に言い、気圧高度（Pressure altitude）・標準気温を説明してから式を出し、120 ft/℃ は FAA の表に近い概算だと明記し、例は LAB の ATIS（31℃・30.01 → 約 1,900 ft）と夏の 33℃（約 2,200 ft）にそろえます（ISA の図は wx.atm を参照し、最初の図にしない）。perf.tol は距離の図を先に置き、要素の表に PHAK の数字（風 10% で ±19〜21%、重量 10% 増で 21% 以上）、AIM 7-6-8 の「中間点で浮揚速度の 70%」、公開値の読み方の例を入れ、「熟練した操縦士」を直します。perf.climb は Vx/Vy の「なぜ 2 つあるか」と教材モデルの値（1,050 kg・標準大気・FL.physics から計算、決して書き写さない）に絞り、速度表は ops.climb を参照し、燃料計画は新しい節 perf.fuel（91.151 の予備、6 lb/gal、モデルの燃料流量、計算機と静的な計算例、使用可能燃料 48 gal）へ移します。perf.wb はシーソーと機体側面のステーション図で基準線・アーム・モーメントを説明し、アームと許容範囲は TCDS 2A13 の公開値・空虚重量は例と書き分け、燃料が減ると重心が少し前へ動くことを示し、誤った例を直します。新しい節 perf.wbex（計算例と積み方の直し方）に静的な計算表（後方超過 → 後席の人を前席へ移す）と計算機を置きます（CADET では計算機が消えるため）。「このシミュレータは標準大気で飛ぶので暑い日の性能低下は体験できない」は bk.sim の中で 1 回だけ書きます。

節の最初の図（いちばん大事な図）：
- `perf.da`：「同じ LAB（55 ft）でも気温で密度高度が変わる」棒グラフ：気温 15 / 25 / 33 / 38℃ の密度高度（本書の概算式で 68 / 1,268 / 2,228 / 2,828 ft）と、その密度での教材モデルの Vy 上昇率…
- `perf.tol`：LAB RWY 36（1,200 m＝3,937 ft、FL.physics.LAB_RWY.len）の側面図に、地上滑走と 50 ft の障害物を越えるまでの距離（Archer の公開値 1,135 / 1,608 ft、2,550 lb…
- `perf.climb`：側面図：同じ地点から 1 分間全開で上昇した 2 本の経路。Vx 64 KIAS（約 690 ft、1.07 NM 先）と Vy 76 KIAS（約 780 ft、1.27 NM 先）。途中に 50 ft の障害物を置き、同じ距離では Vx…
- `perf.wb`：Archer の側面シルエットに基準線（主翼の直線部とテーパー部の境の前縁から 78.4 in 前、TCDS 2A13）と各ステーション（前席 80.5・燃料 95.0・後席 118.1・手荷物 142.8 in）を矢印で示し、主翼の下に許…

### 図

今の図：`atm` → fix、`wbEnvelope` → fix

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `densityAltitude` | `perf.da` | 同じ LAB（55 ft）で気温 15 / 25 / 33 / 38℃ のときの密度高度を棒で、教材モデルの Vy 上昇率を折れ線（右軸）で。ATIS の例（31℃・30.01 → 約 1,900 f… | FL.bookCalc.da と同じ式（気圧高度＋120×（気温−標準気温））、上昇率は FL.physics.steadyState(pa… | must |
| `takeoffDistance` | `perf.tol` | 滑走路の側面図：地上滑走（ground roll）と、浮いてから 50 ft の障害物を越えるまでの距離を色分け。滑走路の中間点に離陸中止の確認点。LAB RWY 36 の長さと比べる。 | 公開値（Piper Archer TX 仕様書・AOPA：2,550 lb・海面・標準大気）1,135 ft / 1,608 ft（bk.f… | must |
| `windEffect` | `perf.tol` | 向かい風・追い風（離陸速度に対する割合 −30%〜+30%）と離着陸距離の増減の曲線（PHAK 図 11-19 を教材の模式図に）。Archer の約 6 kt（10%）に印。 | PHAK 25C 第 11 章：距離 ≈ (1 − 風/離陸速度)²（向かい風 10% → −19%、追い風 10% → +21%、向かい風… | should |
| `climbVxVy` | `perf.climb` | 同じ点から 1 分間全開上昇した Vx と Vy の経路の側面図と、50 ft の障害物。「同じ距離なら Vx が高い・同じ時間なら Vy が高い」。 | FL.physics.steadyState(pa28, V.x / V.y, pwr full, altFt 100)：Vx 64 KIA… | must |
| `climbVsAltitude` | `perf.climb` | 教材モデルの Vy 上昇率と高度（0〜14,000 ft）の折れ線。高いほど・暑いほど上昇率が落ちることを perf.da とつなぐ。 | FL.physics.steadyState(pa28, V.y, pwr full, altFt)：781（0 ft）・741（1,000… | nice |
| `fuelPlan` | `perf.fuel` | 積み上げ棒：タキシー・上昇の分 ＋ 巡航（目的地まで）＋ 予備（昼 30 分／夜 45 分、91.151）と、使用可能燃料 48 gal の比較。 | FL.bookCalc.fuel の既定（120 NM・105 kt・30 分）、燃料流量は FL.physics の巡航時の値（3,000… | should |
| `wbStations` | `perf.wb` | Archer の側面シルエット：基準線（datum）、前席・燃料・後席・手荷物のアーム、許容重心範囲の帯、既定の積み方の重心。上に小さなシーソーで「重量 × アーム＝モーメント」。 | FL.bookCalc.ARCHER_WB（rows のアーム 80.5 / 95.0 / 118.1 / 142.8、env の 82.0… | must |
| `wbExample` | `perf.wbex` | 計算例の表（SVG 表か bk.t）：後方超過の積み方（2,430 lb・93.8 in）→ 後席の 1 人を前席へ（2,430 lb・91.2 in）→ 着陸時（燃料 −20 gal）の 3 行と、… | FL.bookCalc.ARCHER_WB のアームと限界（計算で出す） | should |

### 写真

- `perf.da`：高地の空港にある「Check density altitude（密度高度に注意）」の看板
- `perf.tol`：滑走路の残り距離標識（Runway distance remaining sign）
- `perf.tol`：芝の滑走路（turf / grass runway）
- `perf.climb`：離陸後に上昇する個人所有の Piper PA-28-181 Archer（学校の塗装でないもの）
- `perf.fuel`：航空ガソリン（100LL）のセルフ給油機または給油車
- `perf.wb`：機体を秤（はかり）に載せて重量を測っている様子
- `perf.wb`：PA-28 の手荷物室の扉（機体後方）

### 章末

- 確認問題：Q1：fix（quiz.js q_perf の 1 問目とほぼ同文で重複。密度高度の計算問題に置き換えるか、理由を問う形に） / Q2：keep（PHAK 第 10 章と一致。why の「前すぎは…フレアで引ききれない」も正しい） / Q3：fix（誤答の「燃料価格」「機体の塗装」が明らかすぎる。「気象情報（すべての飛行）」「代替飛行場（すべての飛行）」「ATC の遅延情報だけ」など、91.103(a) と (b) を取り違えやすい選択肢に）
- 新しい問題の案：5 問（LAB（標高 55 ft）の ATIS：気温 31℃、高度計 30.01。概算式で密度高度はおよそ？；離陸速度の 10% にあたる追い風（Archer で約 6 kt）で離陸すると、離陸距離はおよそどうなる？；合計重量 2,400 lb、合計モーメント 216,000 lb-in のとき、重心は基準線から何 in？；AIM 7-6-8 の目安で、離陸滑走中に滑走路の中間点までに達していなければ離陸を中止するのは？；昼の VFR。最初の着陸予定地まで 1 時間 10 分、燃料流量 10 gal/h。91.151 の最低限の燃料は（タキ…）
- 用語：追加：International Standard Atmosphere (ISA)／国際標準大気／海面 15℃・29.92 inHg、1,000 ft ごとに約 2℃ 下がる；追加：Standard temperature／標準気温／その気圧高度での ISA の気温；追加：Altimeter setting／高度計規正値／ATIS の Altimeter（例 30.01）；追加：Indicated / True airspeed (IAS / TAS)／指示対気速度・真対気速度／密度高度が高いと同じ IAS でも TAS が速い；追加：Headwind / Tailwind component／向かい風成分・追い風成分；追加：Abort point／離陸中止点／AIM 7-6-8：中間点で浮揚速度の 70%；（ほか 7 件）
- 出典：update：R.wb の URL（404）→ https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-1.pdf（版は FAA-H-8083-1B のまま。一覧：https:/…；keep：PHAK FAA-H-8083-25C。第 10 章 https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/chapter-10-weight-and-balance 、第 11 章 https://www.faa.gov…；add：FAA-P-8740-2 Density Altitude（FAASTeam） https://www.faasafety.gov/files/gslac/library/documents/2011/Aug/56396/FAA%20P-8740-02%20DensityAltitude%5Bhi-res%5D…；add：AIM 7-6-7 Mountain Flying（Effects of Density Altitude）・7-6-8 Use of Runway Half-way Signs https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap7…；add：14 CFR 91.103 https://www.ecfr.gov/current/title-14/part-91/section-91.103 と 91.151 https://www.ecfr.gov/current/title-14/part-91/section-91.151（Part 91 全体へ…；（ほか 4 件）

## 第 5 章 `wx` 航空気象（フロリダの空を中心に） — Aviation weather (book-2.js, ch. 5, part p1)

節：`wx.atm` 大気・気圧・気温・`wx.cloud` （新）水蒸気・雲・安定 — proposed new section・`wx.front` （新）風・気団・前線 — proposed new section・`wx.ts` 雷雨とフロリダの夏・`wx.shear` （新）ウインドシアとマイクロバースト — proposed new section・`wx.fog` 霧・低い雲・視程・`wx.metar` METAR と TAF の読み方・`wx.taf` （新）TAF の読み方（FM・TEMPO・BECMG・PROB） — proposed new section・`wx.brief` 気象情報の入手と「行くか・やめるか」

### 今の問題

- **誤り**
  - wx.metar example 「METAR KSFB 141753Z … 10SM FEW035 SCT050 BKN250 … RMK AO2 TSB45」: a storm that began at :45 and is still going at :53 must appear in the body (TS present weather, CB on the cloud layer); TSB45 without TS in the body contradicts itself → remove…
  - wx.brief 「SIGMET・AIRMET（乱気流・着氷・IFR 状態・雷雨）」 → AIRMETs do not cover thunderstorms. AIRMET = IFR, mountain obscuration, turbulence, strong surface winds, icing, freezing levels; thunderstorms = Convective SIGMET; the CONUS text AIRMET is retired and only the G-AI…
  - wx.ts 「ひょう・雷・着氷｜雲の外にも降ることがある」 → hail can fall several miles from the visible cloud (esp. under the anvil) and lightning can strike in clear air near a storm; icing is in cloud/precipitation above the freezing level and does not 'fall outside the cloud' (AWH 28…
  - wx.ts 「雲から 20 NM 以上離れることが推奨される＝Aviation Weather Handbook の考え方」 → AIM 7-1-27 / AWH 28B 22.8.2 #14: avoid by at least 20 miles any thunderstorm identified as severe or giving an intense radar echo; keep ≥ 40 miles between such echoes before flying between them; …
  - wx.metar 「RMK AO2｜自動観測所（AO2）」 → AO2 = automated station WITH a precipitation discriminator; AO1 = without (AIM 7-1-10)
  - （ほか 1 件）
- **古い**
  - R.wx label 「FAA Aviation Weather Handbook（FAA-H-8083-28A）」 → current edition is FAA-H-8083-28B, signed 2 April 2026 (FAA page last updated 13 April 2026). It supersedes 2…
  - AIRMET: the text (TAC) AIRMET over the contiguous US was retired on 2025-01-27; pilots use the G-AIRMET (Sierra/Tango/Zulu) on aviationweather.gov GFA. The book can keep …
  - Do not add the SIGWX Low-Level prog chart: NWS proposed retiring it on or about 15 Dec 2026 in favour of the GFA ceiling/visibility, turbulence and icing views (NWS PNS 2…
  - （ほか 2 件）
- **数値の食い違い**
  - syllabus.js:445–446 (lesson r1, linked from wx.brief's bk.sim): 「進入速度に突風分の半分を足し」 is the graded right answer, and r1 flies landingSteps(AR.appr + 4). The book never states…
  - quiz.js:54 asks the thunderstorm life cycle (積雲期・成熟期・消散期); the book has none of it.
  - quiz.js:59 asks microburst duration 「通常 15 分程度」 (AIM 7-1-24: seldom longer than 15 min); the book gives no numbers.
  - （ほか 5 件）
- **わかりにくい**
  - wx.atm key 「高度計は「高い所から低い所へ」飛ぶと実際より高く表示される」 — 「高い所」 reads as altitude. Say 気圧の高い所 / 暖かい所. Same in sys (book-1.js:191).
  - wx.ts FIG.seaBreeze shows one sea, but the caption speaks of sea breezes from both coasts. 「海（大西洋・メキシコ湾）」 merges two seas into one box.
  - wx.ts FIG.clouds caption 「高さの目安」 has no heights. AWH 28B Table 12-3: low clouds surface–6,500 ft; middle 6,500–23,000 ft (temperate); high 16,500–40,000 ft (temperate) / …
  - （ほか 6 件）
- **順番**
  - wx.atm mixes pressure/altimeter with moisture/stability; split them off into a new wx.cloud placed before the thunderstorm section.
  - wx.ts starts with the cloud catalogue (FIG.clouds) before the thunderstorm. Its first SVG should be the sea-breeze/thunderstorm figure; the clouds figure moves to wx.clou…
  - Fronts (and Florida's winter cold fronts) are missing between clouds and thunderstorms. Add wx.front.
  - （ほか 3 件）
- **重複**
  - sys (book-1.js:191) key 「高度計は「高い所から低い所へ飛ぶと、実際より高く表示される」（気圧・気温とも）。High to low, look out below」 = wx.atm key. Explain it once in wx.atm (with a figure) and use bk.see in sy…
  - perf.da (book-1.js:222) reuses FIG.atm as its first figure. Once wx.atm owns the ISA figure, perf.da needs its own first figure (density altitude). Report to the perf ana…
  - comm.atis (book-comm.js:235–237) explains the ATIS contents (wind magnetic, visibility, clouds, temp/dew, altimeter). wx.metar should link to it rather than repeat it; th…
  - （ほか 4 件）
- **節ごとの問題（抜粋）**
  - `wx.atm`：Key 「高度計は「高い所から低い所へ」飛ぶと実際より高く表示される（気圧・気温とも）」: 「高い所」 reads as 'a high place (altitude)'. Write 「気圧の高い所から低い所へ（または暖かい所から寒い所へ）飛ぶと、高度計は実際より高く表示される＝実際は低い」 and add 'High to low,…
  - `wx.atm`：FIG.atm: the label 「気圧は 1,000 ft あたり約 1 inHg 下がる」 runs outside the viewBox and is cut off (figshot: bbox [268,142,441,154] in a 400-wide viewBox). The smallest text is 8.…
  - `wx.atm`：The term table mixes moisture and stability (露点・安定・不安定) into the pressure section. Move it to a new section wx.cloud so this section stays on pressure, temperature and th…
  - `wx.atm`：「米国では 18,000 ft MSL 未満で現地の規正値」: 14 CFR 91.121(a)(1) says 'the current reported altimeter setting of a station along the route and within 100 NM'. Explain it as 「近くの空港（ATI…
  - （ほか 47 件）

### 書き直しの方針

Start the chapter with one purpose sentence: a pilot reads the weather to answer three questions — can I see (ceiling and visibility), will I be thrown around (thunderstorms, wind shear, gusts), and is my altimeter right. Reorder as wx.atm → wx.cloud (new) → wx.front (new) → wx.ts → wx.shear (new) → wx.fog → wx.metar → wx.taf (new) → wx.brief; no ids change, and the four new ids are additions. Explain physics first (pressure → moisture/clouds → fronts → convection), then hazards (thunderstorms, microbursts, fog), then the codes (METAR, TAF), and end with the briefing and go/no-go, where personal minimums are shown on a ceiling × visibility chart. Florida stays the thread: afternoon sea-breeze storms (June–September), winter cold fronts and morning fog, all given with the months/times from NWS Melbourne and AWH 28B. Cut the duplicated altimeter key from sys (link here instead) and keep 91.155/91.103 details in law with cross-references. Fix the METAR example (no TSB45 without TS in the body, use a low BKN layer for the ceiling) and add the gust-factor rule so that the r1 lesson and the quiz banks match the text. Update every product statement to 2026: the AWH 28B edition, G-AIRMET instead of the text AIRMET, Convective SIGMET for thunderstorms, NEXRAD latency 15–20 min, self-briefing allowed (AIM 7-1-2, AC 91-92). Each section should open with an SVG (five sections have none or the wrong one first now) and get one or two public-domain NOAA/NASA photos.

節の最初の図（いちばん大事な図）：
- `wx.atm`：Fixed FIG.atm: ISA temperature line (15 °C at sea level → -56.5 °C at 36,089 ft) together with a pressure scale computed…
- `wx.cloud`：Temperature/dewpoint lines rising until they meet = cloud base. Spread 9 °C (the METAR example 32/23) → base ≈ 3,600 ft …
- `wx.front`：Cross-section of a cold front (steep, cumuliform clouds/CB, narrow band) beside a warm front (gentle slope, stratiform c…
- `wx.ts`：Redone FIG.seaBreeze: a west–east cross-section of the Florida peninsula: Gulf (west) | inland (Orlando area) | Atlantic…
- `wx.shear`：Side view of an approach through a microburst: headwind (IAS up, above the glide path) → downdraft → tailwind (IAS down,…
- `wx.fog`：Two panels: radiation fog (clear night, ground cools, calm or ≤ 5 kt, fog in low areas, gone by late morning) and advect…
- `wx.metar`：METAR decoder: the example string split into coloured blocks (station | day-time Z | wind true + gust | visibility SM | …
- `wx.taf`：Timeline 14/12Z → 15/12Z with a local-time (EDT) row under it. Base forecast bar (09010KT P6SM SCT040) with a TEMPO 18–2…
- `wx.brief`：Ceiling × visibility chart: y = ceiling 0–5,000 ft, x = visibility 0–10 SM. Zones LIFR/IFR/MVFR/VFR (AIM 7-1-7), the 91.…

### 図

今の図：`atm` → fix、`clouds` → redo、`seaBreeze` → redo

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `thunderstormLife` | `wx.ts` | Three panels: towering cumulus (updraft only, > 3,000 fpm) → mature (rain reaches the ground, updraf… | AWH 28B 22.3 (life ≈ 30 min, updraft > 3,000 fpm, mature begins when p… | must |
| `microburst` | `wx.shear` | Side view of an approach through a microburst: 1 headwind (IAS up, airplane balloons above the glide… | AIM 7-1-24 (downdraft < 1 mile, outflow ≈ 2.5 miles, up to 6,000 fpm, … | must |
| `metarDecode` | `wx.metar` | The corrected example METAR as coloured blocks (station / time Z / wind true + gust / visibility / w… | The book's own (made-up) METAR, AIM 7-1-28 key | must |
| `skyCover` | `wx.metar` | Four okta circles (FEW 1–2/8, SCT 3–4/8, BKN 5–7/8, OVC 8/8) plus VV; BKN/OVC/VV marked as the 'ceil… | AIM 7-1-28; AWH 28B Table 24-4 | must |
| `flightCategory` | `wx.brief` | Ceiling (0–5,000 ft) × visibility (0–10 SM) chart with LIFR / IFR / MVFR / VFR zones, the 91.155(c)(… | AIM 7-1-7 categories; 14 CFR 91.155(c)(d); 61.89(a)(6) (student solo, … | must |
| `fogTypes` | `wx.fog` | Two panels: radiation fog (clear night, ground cooling, wind ≤ 5 kt, clears by late morning) vs adve… | AWH 28B 18.1.1, 18.1.1.1.1, 18.1.1.1.2 | must |
| `altimeterHighLow` | `wx.atm` | Pressure surfaces sloping down toward a Low (and toward cold air). An airplane holding the same indi… | PHAK 25C ch. 8 / AWH 28B ch. 8 (1 inHg ≈ 1,000 ft; Figure 8-14 warm-to… | should |
| `tafTimeline` | `wx.taf` | Time bar 14/12Z → 15/12Z with an EDT row below it; base forecast bar and a TEMPO 18–22Z block (= 14–… | The book's TAF example; AIM 7-1-28 (TEMPO < 1 h each, total < half the… | should |
| `cloudBase` | `wx.cloud` | Temperature and dewpoint lines meeting aloft = cumulus base; the example 32/23 (spread 9 °C) → ≈ 3,6… | PHAK 25C ch. 12 rule of thumb (spread ÷ 4.4 °F ≈ ÷ 2.5 °C × 1,000 ft);… | should |
| `frontsXsec` | `wx.front` | Cold front vs warm front cross-sections with cloud types, the width of the weather band and the surf… | AWH 28B ch. 11 (teaching drawing, no numbers needed) | should |
| `tsAvoid` | `wx.ts` | Top view: a severe storm cell with a 20-mile circle, an anvil extending downwind (do not fly under i… | AIM 7-1-26, 7-1-27; AWH 28B 22.8.2 #14 | nice |
| `goNoGo` | `wx.brief` | Flow: gather (METAR/TAF → GFA/G-AIRMET/SIGMET/CWA → PIREP → NOTAM/TFR) → compare with personal minim… | AC 91-92; AIM 7-1-5; FL.physics pa28 v.xwind 17 | nice |

### 写真

- `wx.ts`：Cumulonimbus with an anvil top (developing storm)（候補：https://www.noaa.gov/noaa-collections/photo-library/nssl0035jpg Public domain (NOAA Photo Library; check the item's credit line)）
- `wx.ts`：Shelf cloud along a gust front ahead of a thunderstorm（候補：https://www.noaa.gov/noaa-collections/photo-library/nssl0041jpg Public domain (NOAA/NSSL)）
- `wx.ts`：Florida peninsula from space: cumulus over land, clear over the sea (sea-breeze effect)（候補：https://eol.jsc.nasa.gov/SearchPhotos/photo.pl?mission=STS046&roll=86&frame=64 Public domain (NASA JSC; credit 'Image courtesy of the Earth Science and Remote Sensing Unit, NASA Johnson Space Center')）
- `wx.front`：Line of cumulonimbus (squall line / building storms)（候補：https://www.noaa.gov/noaa-collections/photo-library/nssl0036jpg Public domain (NOAA/NSSL)）
- `wx.fog`：Morning radiation fog in low ground / over a lake（候補：https://www.noaa.gov/noaa-collections/photo-library/wea00153jpg Public domain unless the item credit names an outside photographer — check per file）
- `wx.shear`：Microburst (rain foot / dust ring under a storm)
- `wx.metar`：ASOS automated weather station sensors at an airport
- `wx.cloud`：Towering cumulus (TCU) building in the afternoon
- `wx.ts`：Lightning from a thunderstorm (night)

### 章末

- 確認問題：Q1 (BKN012 OVC025 → 1,200 ft): keep. Correct; optionally add VV to the reason. / Q2 (microburst first effect = headwind, balloon): keep. Matches AIM 7-1-24; the reason (do not cut power for the first '… / Q3 (METAR true / ATIS magnetic): keep the answer; fix the reason 「書かれた報告（METAR・TAF）は真方位」 → 「METAR・TAF・上空の風の予報は真方位、ATIS・A…
- 新しい問題の案：5 問（フロリダ中部の夏、雷雨が最も発達しやすいのはいつ・どこ？；激しい雷雨（強いレーダーエコー）から、少なくともどれだけ離れることが勧められている（AIM 7-1-27）？；TAF の「TEMPO 1418/1422 3SM TSRA BKN030CB」の意味として正しいものは？；METAR が 09012G20KT。Archer の通常の進入速度を 70 kt とすると、広く教えられている目安での…；飛行中に表示されるデータ放送のレーダー画像（NEXRAD・FIS-B）について正しいものは？）
- 用語：METAR / SPECI ｜ 定時観測・特別観測 ｜ 毎時の空港の観測。大きく変わると SPECI；TAF ｜ 飛行場予報 ｜ 24 または 30 時間。FM・TEMPO・BECMG・PROB；TEMPO ｜ 一時的な変化 ｜ 1 回 1 時間未満、合計で期間の半分未満（AIM 7-1-28）；Zulu time (UTC) ｜ 協定世界時 ｜ フロリダは夏 −4 時間・冬 −5 時間；Ceiling ｜ 雲高 ｜ BKN・OVC の最も低い層、または VV（垂直視程）；Vertical visibility (VV) ｜ 垂直視程 ｜ 空が霧などで全部隠れたとき；（ほか 21 件）
- 出典：UPDATE R.wx → 「FAA Aviation Weather Handbook（FAA-H-8083-28B・2026）」 https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/faa-h-8083-28b-aviation-wea…；ADD 「FAA AIM 7-1 Meteorology（気象情報・雷雨・マイクロバースト・METAR/TAF の読み方）」 https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap7_section_1.html (new R key, e.g…；ADD 「FAA AC 91-92 Pilot's Guide to a Preflight Briefing」 https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_91-92.pdf；ADD 「NWS Melbourne — Florida Lightning Climatology」 https://www.weather.gov/mlb/fl_lightning_climo；ADD (optional, beginner-friendly, public domain) 「NOAA JetStream（気象の基礎）」 https://www.noaa.gov/jetstream；（ほか 2 件）

## 第 6 章 `law` 規則と空域（14 CFR と米国の空域） / Regulations and airspace

節：`law.pic` 機長の責任と飛行前の準備・`law.aircraft` （新設案）機体の書類・装備・点検・`law.airspace` 空域の種類と入る条件・`law.vfr` 有視界飛行（VFR）の気象条件：14 CFR 91.155・`law.special` 特別な空域・NOTAM・TFR・`law.rules` 速度・高度・優先順位・燃料

### 今の問題

- **誤り**
  - FIG.airspace：Class A の帯を 14,500〜18,000 ft に描き「Class A：18,000 ft MSL 以上」と表示 → Class A は 18,000 ft MSL から FL600 まで。14,500 ft MSL〜18,000 ft 未満は Class E（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap3_section_2.html AIM 3-2-2・3-2-6）
  - FIG.airspace：左の Class D を名前のない赤い Class C 形の枠が囲み、Class D が Class C の中にあるように見える → 枠を削除（同上）
  - law.rules 91.113：「気球＞グライダー＞飛行船＞（曳航・給油中の機）＞動力機」→ 2025-10-22 施行の改正後は 気球＞グライダー＞曳航・給油中の機＞飛行船＞その他の動力機（91.113(d)(3)(4)：an airship has the right-of-way over all other powered aircraft, except for an aircraft towing or refueling other aircraft）（https://www.ecfr.gov/cu…
  - law.rules：「管制塔のある空港では管制塔と双方向の交信（91.126(d)）」→ 91.126 は Class G の空港の節。管制塔のある普通の空港（Class D）の根拠は 91.129(c)（入る前に確立・維持）、離着陸・滑走路・誘導路の許可は 91.129(i)（https://www.ecfr.gov/current/title-14/section-91.129）
  - law.rules 91.119：前置き「離着陸に必要な場合を除き」がない → 条文は Except when necessary for takeoff or landing（https://www.ecfr.gov/current/title-14/section-91.119）
  - （ほか 3 件）
- **古い**
  - 91.113(d)（優先順位）：2025 年 7 月 24 日公布・10 月 22 日施行の MOSAIC 規則で文言が改正（曳航・給油中の機が飛行船より優先と明記、powered aircraft に統一）。本文の順を更新し、quiz にも入れるなら新しい順で。
  - NOTAM の名前：FAA は 2025-02-11 に「Notice to Air Missions」をやめ「Notice to Airmen」に戻した（FAA Notice 7930.114）。本文は「NOTAM（航空情報）」だけなので、英語名を Notice to Airmen と書く。NOTAM のシステムは NMS（NOTAM …
  - PHAK FAA-H-8083-25C は現行（2023 年版）だが、2025 年 10 月に MOSAIC に合わせた Addendum（第 1・3・6 章：スポーツ操縦士・軽スポーツ機など）が出た。この章の内容には影響しない。参考文献の表記に「＋2025 年 10 月 Addendum」を足すかは全書共通で判断。
  - （ほか 2 件）
- **数値の食い違い**
  - navp（book-4.js:35）「14 CFR 91.151 VFR の燃料：目的地まで＋昼は 30 分・夜は 45 分」→ 条文は「最初の着陸予定地（first point of intended landing）まで」。law の書き方が正しい。
  - law.rules の速度制限 200 / 250 kt と教材の Archer：FL.physics.AIRCRAFT pa28 の v.cruise 110・v.ne 154（教材値）→ Archer はこの規則に届かない。本文に一言（矛盾ではない）。
  - 燃料の例を入れるなら FL.bookCalc の fuel の既定値 9.5 gal/h（book-figs.js:369、教材値）：予備 30 分 ≈ 4.8 gal、45 分 ≈ 7.1 gal。
  - （ほか 3 件）
- **わかりにくい**
  - law.pic：「91.103（飛行前の準備）：すべての飛行で滑走路長と離着陸距離の情報。IFR や空港近辺以外の飛行では、…ATC から知らされた遅延も」— 名詞止めの列挙で動詞がない。「出発前に、その飛行に関する入手できるすべての情報を知る」を先に。
  - law.pic：「無線局免許（国際線のみ）」— 「米国の外へ飛ぶときだけ」。
  - law.vfr：SM・AGL・MSL・雲高（ceiling）・地上視程と飛行視程の違いが未説明のまま表に出る。
  - （ほか 7 件）
- **順番**
  - law.vfr（雲からの距離の表）が law.airspace より前 → 空域の名前を知る前に Class B〜G の表が出る。law.airspace → law.vfr の順に。
  - law.special（空域の話）が law.rules（飛行の規則）の後 → 空域の 3 節（airspace・vfr・special）をまとめ、最後に law.rules。
  - law.pic に機長の責任と機体の書類（ARROW）が混在 → 新設 law.aircraft に機体の書類・装備・点検を移す。
  - （ほか 2 件）
- **重複**
  - comm / radio2（book-comm.js:172–174, 221, 225）と radio.js:203–209（r_standby・r_standby2）：Class C の「コールサイン付きの stand by で交信確立」を詳しく扱う → law.airspace は規則（入る条件）だけを短く、言い方は comm へ …
  - wx（book-2.js:21, 31–36）：91.155 の視程・91.103・NOTAM/TFR の表 → law.vfr / law.special へ bk.see でつなぐ。
  - perf（book-1.js:175, 227, 254）：91.151 の予備・91.103 の滑走路長と離着陸距離（quiz も）→ law.pic・law.rules と同じ言い方に揃える。
  - （ほか 3 件）
- **節ごとの問題（抜粋）**
  - `law.pic`：「91.103（飛行前の準備）：すべての飛行で滑走路長と離着陸距離の情報。IFR や空港近辺以外の飛行では、気象の報告と予報・燃料・…」— 名詞止めで何をするのか分からない。条文の本体「出発前に、その飛行に関する入手できるすべての情報を知っておく（become familiar with all available information…
  - `law.pic`：「空港近辺以外の飛行」— 初心者には「空港を離れる飛行＝クロスカントリー（cross-country）」と分からない。言い換えが必要。
  - `law.pic`：「緊急時は必要な範囲で規則から逸脱できる（後で報告を求められることがある）」— 誰が求めるのか不明。正しくは「すぐ行動が必要な飛行中の緊急時（in-flight emergency requiring immediate action）に、必要な範囲で。FAA から求められたら書面で報告する（91.3(b)(c)）」。
  - `law.pic`：「機長は耐空性を判断する責任がある」— 条文は「安全に飛べる状態か（condition for safe flight）を判断する」と「飛行中に機械・電気・構造の不具合が起きたら飛行をやめる（91.7(b)）」。後半が抜けている。
  - （ほか 40 件）

### 書き直しの方針

節の順を law.pic → law.aircraft（新設）→ law.airspace → law.vfr → law.special → law.rules に変える（id は変えない）。最初に law.airspace で、初心者が持っていない 3 つの考え（管制空域と非管制空域、AGL と MSL、入る条件の 2 種類＝「許可」と「交信の確立」）を、直した断面図で説明し、その後で law.vfr を「雲 1 つの図（3-152）」から始め、91.155 の全表は参照用に後ろへ置き、特別有視界（91.157）と 91.155(b)(2) を短く説明する。law.pic は 91.3・91.103・91.7 を正確な言い方にし、学生にとって誰が機長か（ソロ＝自分、教官同乗＝通常は教官）と操縦士の書類（61.3・61.51(i)(2)）を足し、ARROW は新設の law.aircraft（書類・91.205 の装備・91.409 などの点検。ACS PA.I.B）へ移す。law.rules は表をやめて規則ごとの小見出し＋図（優先順位を最初に、最低安全高度、速度、燃料は Archer の教材値の例）にし、91.113(d) を 2025 年改正の順に直し、91.126(d) の行は Class D の 91.129(c)(f)(i) に置き換える。61.89 は law.rules に 1 回だけ書いて solo.req へ bk.see、Class C の「stand by」の説明は law.airspace に規則として短く書き言い方は comm へ bk.see でつなぐ。law.special は Warning・MOA・Alert を分け、CFA・NSA・SFRA を 1 行ずつ足し、NOTAM の英語名（Notice to Airmen）を書き、「LAB 空域は架空」の文は残す。Sanford・Orlando の事実は出典付きの事実として残すが、例と図は LAB の名前（LAB Approach・R-LAB1・LAB MOA）で書き、地図風の図はすべて「模式図・NOT FOR NAVIGATION」とする。

節の最初の図（いちばん大事な図）：
- `law.pic`：「飛行前に知ること」の二重の枠（91.103）：中心に PIC、内側の枠＝すべての飛行（使う空港の滑走路長・POH の離着陸距離）、外側の枠＝IFR・空港を離れる飛行（天気の報告と予報・燃料・行けないときの代替案・ATC から聞いた遅延）。…
- `law.aircraft`：機体の左側ドアと計器盤の模式図：ARROW の書類の置き場所（耐空証明は入口から読めるように掲示：91.203(b)）と、下に点検の期限の帯（年次 12 か月・100 時間（有償の訓練・貸出）・ELT 12 か月・トランスポンダー 24 か…
- `law.airspace`：空域の断面（模式図・NOT FOR NAVIGATION）：縦軸に SFC・700/1,200 ft AGL・2,500 / 4,000 ft（空港の標高から）・10,000・14,500・18,000 ft MSL・FL600（上は省略記…
- `law.vfr`：雲 1 つと Archer の側面図：雲の下 500 ft・上 1,000 ft・横 2,000 ft の距離の矢印と、前方に飛行視程 3 SM の矢印（覚え方「3-152」：Class C・D・10,000 ft 未満の Class E）…
- `law.special`：架空の地域を上から見た模式図（NOT FOR NAVIGATION）：R-LAB1（制限空域・運用時間の表）、LAB MOA、A-LAB3（訓練機が多い）、海岸線から 3 NM 沖の W-LAB2、円形の TFR（NOTAM で公示・地図に…
- `law.rules`：上から見た 3 つの場面（right-of-way）：①収束：相手が右にいる → 相手が優先、自分は相手の後ろへ回る ②正面：両方とも右へ ③追い越し：追い越される側が優先、追い越す側は右へ離れて。下に優先順位のはしご（遭難機＞気球＞グライ…

### 図

今の図：`vfrMinima` → fix、`airspace` → redo

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `vfrCloudClearance` | `law.vfr` | 雲 1 つと Archer の側面図。雲の下 500 ft・上 1,000 ft・横 2,000 ft と飛行視程 3 SM の矢印（3-152：Class C・D・10,000 ft 未満の E）。… | 14 CFR 91.155(a) の表（https://www.ecfr.gov/current/title-14/section-91.1… | must |
| `surfaceAreaVfr` | `law.vfr` | 空港の地表区域（Class B・C・D・E の地表区域）の断面：雲高 1,000 ft の線と地上視程 3 SM。「両方満たす → VFR で離着陸・場周経路／満たさない → VFR 不可、特別有視界… | 91.155(c)(d)・91.157(b)(c)（eCFR）。 | should |
| `classCEntry` | `law.airspace` | Class C の境界の手前で LAB Approach を呼んだときの 3 つの応答と判断：「Archer Seven Lima Alpha, stand by」→ 入ってよい／「Aircraft … | AIM 3-2-4（NOTE と EXAMPLE）・3-2-3、91.130(c)・91.131(a)(1)。コールサインは教材の Arch… | should |
| `labUnderBravo` | `law.airspace` | 架空の LAB（Class C）の上に Class B の棚がかぶる断面：Class C の天井と Class B の棚の下限の間を飛ぶ／許可なしに棚に入らない、30 NM の装備区域（トランスポンダ… | 構造は FAA From the Flight Deck（SFB は Class C で Orlando の Class B の下）・91.… | nice |
| `specialUseAirspace` | `law.special` | 架空の地域を上から見た模式図：R-LAB1（制限空域・運用中は許可が要る）、LAB MOA（軍の訓練・入る前に交通情報を求める）、A-LAB3（訓練機が多い）、海岸から 3 NM 沖の W-LAB2、… | AIM 3-4-2〜3-4-6・3-5-3、91.133・91.137〜91.145。名前と位置は架空。実際のチャートの色・記号は Char… | must |
| `rightOfWay` | `law.rules` | 上から見た 3 場面（収束：相手が右にいれば相手が優先、自分は後ろへ／正面：両方右へ／追い越し：右へ離れて追い越す）と、下に優先順位のはしご（遭難機＞気球＞グライダー＞曳航・給油中の機＞飛行船＞その他… | 91.113(b)〜(g)（eCFR、2025-10-22 施行の文言）。 | must |
| `minSafeAltitude` | `law.rules` | 側面図 3 つ：人口密集地・集会の上＝半径 2,000 ft 以内の最も高い障害物から 1,000 ft 上／それ以外＝地表から 500 ft／水上・人の少ない場所＝人・船・車・建物から 500 ft… | 91.119(a)〜(c)（eCFR）。 | should |
| `speedLimits` | `law.rules` | 速度制限の 3 つの範囲：10,000 ft MSL 未満 250 kt、Class C・D の主空港から 4 NM 以内・地上 2,500 ft 以下 200 kt、Class B の下と VFR … | 91.117（eCFR）、FL.physics.AIRCRAFT pa28 v.cruise 110・v.ne 154（教材値）。 | nice |
| `fuelReserve` | `law.rules` | 燃料の棒グラフ：最初の着陸予定地までの燃料＋予備（昼 30 分・夜 45 分）。Archer の例（教材値 9.5 gal/h）：予備 30 分 ≈ 4.8 gal、45 分 ≈ 7.1 gal。タキ… | 91.151(a)、FL.bookCalc fuel の既定値 9.5 gal/h（book-figs.js:369、教材値）。 | nice |
| `preflightInfo` | `law.pic` | 91.103 の二重の枠：中心に PIC、内側＝すべての飛行（滑走路長・離着陸距離）、外側＝IFR・空港を離れる飛行（天気・燃料・代替案・ATC の遅延）、外に「すべての入手できる情報（NOTAM・T… | 91.103（eCFR）。 | should |
| `aircraftDocs` | `law.aircraft` | 機体のドアと計器盤の模式図に ARROW の書類の場所（耐空証明は入口から読めるよう掲示）と、点検の期限の帯（年次 12 か月・100 時間（有償の訓練・貸出）・ELT 12 か月・トランスポンダー … | 91.203(a)(b)・91.9・91.205(b)・91.207・91.409・91.413（eCFR）。 | should |

### 写真

- `law.airspace`：管制塔（Class D・C の空港の象徴）。人の顔が写らない外観
- `law.vfr`：積雲の雲底がはっきり見える空（雲から離れて飛ぶイメージ）／低い層雲で雲高が低い日
- `law.special`：Cape Canaveral / Kennedy Space Center からのロケット打ち上げ（宇宙の運用の TFR：91.143）
- `law.special`：軍の訓練機（MOA・制限空域の利用者）。例：フロリダの Avon Park Air Force Range 周辺の USAF 機
- `law.rules`：熱気球（優先順位の一番上）
- `law.rules`：グライダーの曳航（aerotow：曳航中の機が動力機に優先）
- `law.pic`：飛行前点検（walkaround）をする操縦士の後ろ姿・手元（顔は写らない）

### 章末

- 確認問題：Q1（Class C に VFR で入る条件）：keep。why に「remain outside と言われたら入らない（AIM 3-2-4）」を足す。 / Q2（Class D・10,000 ft 未満の Class E の VFR の最低条件）：keep。問題文に Class C も入れて quiz.js:64 と揃える。誤答「3 SM・雲に入らない」（Class B）はよい比較。 / Q3（昼間の VFR の燃料の予備）：keep。問題文を「最初の着陸予定地に着いた後、通常の巡航速度で何分飛べる燃料が必要？」にすると条文どおり。
- 新しい問題の案：5 問（同じ高度で、自機の右側から別の飛行機が近づき、進路が交わりそう。優先権があるのは？（91.113）；次の 4 つのうち、優先権が最も高いのは？（91.113、2025 年改正後）；Class D の空港の METAR が「BKN008」（雲高 800 ft）、視程 5 SM。VFR で場周経路に入れ…；Class B と Class C に VFR で入る条件の違いとして正しいものは？；運用中の Restricted Area（制限空域）について正しいものは？）
- 用語：Pilot in command (PIC) / 機長 / 91.3（ソロでは自分が機長）；Preflight action / 飛行前の準備 / 91.103；Airworthiness certificate / Registration certificate / 耐空証明・登録証明 / 91.203；Controlled airspace / 管制空域 / Class A〜E；Uncontrolled airspace / 非管制空域 / Class G；AGL / MSL / 地上からの高さ・平均海面からの高さ / ；（ほか 13 件）
- 出典：keep：14 CFR Part 91（R.cfr91）・Part 61（R.cfr61）・AIM（R.aim）・PHAK FAA-H-8083-25C（R.phak）・FAA From the Flight Deck: Orlando Sanford（R.sfb：「The airspace at SFB is Cla…；add：AIM 3-1-4 Basic VFR Weather Minimums https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap3_section_1.html；add：AIM 3-2 Controlled Airspace（Class A〜E、3-2-4 の stand by の NOTE）https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap3_section_2.html（book-core に …；add：AIM 3-4 Special Use Airspace https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap3_section_4.html；add：AIM 3-5（3-5-3 Temporary Flight Restrictions）https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap3_section_5.html；（ほか 6 件）

## 第 7 章 `radio1` 無線交信のしくみと基本の技術

節：`radio.why` 交信とは何か・誰と話すのか・`radio.equip` 無線機・マイク・オーディオパネルの使い方・`radio.technique` 聞く → 考える → 話す・`radio.listen` 日本語話者のための聞き取りのコツ

### 今の問題

- **誤り**
  - radio.listen ⑤「Verify, was that for Archer Seven Lima Alpha?」→ AIM 4-2-4 a の言い方は “VERIFY CLEARANCE FOR (your complete call sign)” (https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_2.html)
  - radio.listen ④「管制は 15 を「one five」と 1 桁ずつ言うので…混同は起きにくい」→ 管制官は数字をまとめた形で言い直すことがある（JO 7110.65 2-4-18 Number Clarification）、エアラインのコールサインはまとめた形（AIM 4-2-4） (https://www.faa.gov/air_traffic/publications/atpubs/atc_html/chap2_section_4.html)
  - radio.why Clearance Delivery「エンジン始動の前後」→ AIM 4-3-14：出発機は Clearance Delivery / Ground に “prior to starting engines”（エンジン始動の前）に交信する (https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_3.html)
- **古い**
  - 参考：refs の ANA のページ（R.ana1）は交信の技術とは関係が薄く、CADET では実名として落ちる。intro 章へ移すか削除。
- **数値の食い違い**
  - COM の範囲・間隔「118.000〜136.975 MHz・25 kHz」は avionics.js:32（COM_MIN 118000 / COM_MAX 136975 / COM_STEP 25）と一致。
  - 練習用周波数：avionics.js:120 の初期値 COM1 118.300 ⇄ 121.700 は radio.js の Tower 118.3 / Ground 121.7 と一致。図に使うならこの値を使う。
  - student pilot：本文（radio.technique）は Clearance・Ground・Tower・Departure/Approach の各最初の交信で名乗るとするが、radio.js FLIGHT は Ground（radio.js:73）だけ。Tower（:86）・Departure（:98）・Approach（:1…
  - （ほか 1 件）
- **わかりにくい**
  - radio.why：「管制の種類と呼び方」の表に管制でないもの（ATIS・CTAF・UNICOM・MULTICOM）が混ざる。見出しを「話す相手（局）」に。
  - radio.why：「AIM（FAA の公式マニュアル）」— FAA の初出説明がない。
  - radio.why：Clearance Delivery「出発の許可」— VFR の初心者は「離陸許可」と混同しやすい。VFR では「出発の指示（周波数・コード）」と書く。
  - （ほか 3 件）
- **順番**
  - radio.why：図（1 回の飛行のリレー）→ 主な 4 つの局 → ほかの局の短い表 → 呼び方（場所＋局の種類、AIM 4-2-6）の順に。
  - radio.equip：実際の操作順（予備に合わせる → ⇄ → MIC を選ぶ → PTT・話し方 → 待つ → 返事がないときの確認 → 見通し距離）に並べ替える。
  - radio.technique：student pilot の段落は radio3 comm.pattern の最初の呼び出しの例と結びつけ、{ch:radio3} を参照する。
- **重複**
  - radio.why の局の表 ↔ radio4（comm.atis〜comm.arrive）と radio.js FLIGHT（1 回の飛行）。radio1 は「誰と話すか」の全体図だけにし、具体的な交信は radio4 へ。
  - radio.technique の Aviate → Navigate → Communicate ↔ hf（book-2.js:119–120）・emg.basic（book-3.js:188–190）・comm.xpdr（book-comm.js:350）。
  - radio.technique の student pilot ↔ radio3 comm.pattern・radio4 comm.dep（使い方の例）。radio1 は意味と理由、radio3/4 は例、と役割を分ける。
  - （ほか 2 件）
- **節ごとの問題（抜粋）**
  - `radio.why`：図がない。8 行の表「ATIS / Clearance Delivery / Ground / Tower / Departure・Approach / Center / Flight Service / CTAF・UNICOM・MULTICOM」をいきなり全部出すのは初心者には重い。1 回の飛行で実際に話す 4 つ（ATIS → Gro…
  - `radio.why`：見出し「管制の種類と呼び方」だが、ATIS（録音放送）・CTAF/UNICOM は管制ではない。「話す相手（局）」とするほうが正確。
  - `radio.why`：「AIM（FAA の公式マニュアル）」：FAA がまだ説明されていない。初出で「米国連邦航空局（FAA）」「航空情報マニュアル（AIM）」と書く。
  - `radio.why`：Clearance Delivery の行「出発の許可・出発周波数・トランスポンダーのコードを出す（ある空港だけ）」「エンジン始動の前後」：AIM 4-3-14 は “prior to starting engines”（エンジン始動の前）に Clearance Delivery / Ground を呼ぶとしている。AIM の表（TBL …
  - （ほか 23 件）

### 書き直しの方針

4 つの節（radio.why → radio.equip → radio.technique → radio.listen）の id と順番はそのままにし、新しい節は作らない。radio.why は最初に「1 回の飛行で話す相手のリレー」の図を置き、主な 4 つの局（ATIS・Ground・Tower・Departure/Approach）を先に説明する。Clearance Delivery・Center・Flight Service・CTAF/UNICOM は短い表にまとめ、CTAF の詳細は radio5 comm.ctaf に任せる（語 'CTAF' は残す）。radio.equip は実際の操作順（予備に合わせる → ⇄ → MIC を選ぶ → PTT・一呼吸・話す → 離して待つ → 返事がないときの確認）に並べ替え、オーディオパネルの図を最初に置く。見通し距離の数字は「目安（推定）」として 2 枚目の図に入れる。radio.technique では出典のない「7 割」を削り、Aviate/Navigate/Communicate は 1 行＋{ch:emg} にする。student pilot（AIM 4-2-4 c）は残す。radio.listen は「教材としての学習のコツ（bk.est）」と明記し、⑤ を AIM の “Verify clearance for …” に直し、bk.sim の文をボタンに合わせる。FLIGHT LAB テスト（flight.test.mjs:342–343）は radio1〜radio5 の本文全体に 'student pilot'・'CTAF'・'Say again'・'cleared for takeoff'（小文字）などを求め、/gusts/i を禁止しているので、radio1 にいまある語は書き直しでも残す。

節の最初の図（いちばん大事な図）：
- `radio.why`：radioRelay：1 回の飛行で話す相手のリレーの模式図（駐機場 → 誘導路 → 滑走路 36 → 出発 → 訓練空域 → 帰り → 場周 → 駐機場）。区間ごとに局名と練習用周波数（ATIS、Ground 121.7、Tower 11…
- `radio.equip`：radioAudioPanel：G1000 型の COM 窓（COM1 118.300 ⇄ 121.700）とオーディオパネル（MIC COM1 / COM2、受信 COM1・COM2・NAV1・NAV2）。よくある失敗「COM2 に合わせ…
- `radio.technique`：radioTalkTimeline：横の時間軸「聞く（数秒）→ 考える・メモ → PTT を押す → 一呼吸 → 話す → 離す → 数秒待つ → 相手の応答」。下に「操縦（Aviate）が先」の帯。
- `radio.listen`：radioCallAnatomy：radio.js の Ground の指示 “Archer Seven Lima Alpha, LAB Ground, runway three six, taxi via Alpha, hold shor…

### 図

今の図：`bk.t（radio.why：局の表 8 行）` → fix、`bk.t（radio.listen：聞き取りのコツ 6 行）` → fix、`（SVG の図なし）` → redo

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `radioRelay` | `radio.why` | 1 回の飛行の局のリレー（模式図）：駐機場 → 誘導路 A → 滑走路 36 → 出発 → 北東の訓練空域 → 帰り → 左場周 → 駐機場。区間を色分けし、局名と練習用周波数・「いつ切り替えるか」（… | radio.js FLIGHT[].freq（LAB Ground 121.7・LAB Tower 118.3・LAB Departure … | must |
| `radioAudioPanel` | `radio.equip` | G1000 型の COM 窓（COM1 118.300 ⇄ 121.700、COM2 126.950 ⇄ 120.100）とオーディオパネル（MIC：COM1 / COM2、受信：COM1・COM2・… | avionics.js:120–122（com1・com2 の初期値、audio.mic 'COM1'、monitor COM1 だけ ON… | must |
| `radioLineOfSight` | `radio.equip` | 地球の丸みと山の陰で VHF が届かない様子。高度 1,000 / 3,500 / 10,000 ft の機の電波の見通し距離の目安（約 39 / 73 / 123 NM）と、山の陰の機は届かないこと… | 電波の見通し距離の近似 d[NM] ≈ 1.23×√h[ft]（一般的な近似式、bk.est）。AIM 4-2-2 f（高いほど VHF の… | should |
| `radioTalkTimeline` | `radio.technique` | 送信のタイミングの時間軸：聞く（周波数を変えたら数秒）→ 考える・メモ → PTT を押す → 一呼吸 → 話す（ふつうの声、マイクは唇の近く）→ 離す → 数秒待つ → 応答。下に「操縦が先（Avi… | AIM 4-2-2 a–d の順番（秒数は書かず「数秒」）。 | should |
| `radioCallAnatomy` | `radio.listen` | Ground の指示 1 本を色分け（コールサイン／局名／滑走路／経路／hold short／出発周波数／コード）し、下にひざ板の書き方「36 / A / HS C / 119.75 / 4271」と… | radio.js:75（GND の指示）・radio.js:77（復唱）。 | must |

### 写真

- `radio.why`：空港の管制塔（外観、人の顔なし）
- `radio.equip`：マイク付きの航空用ヘッドセット（ブームマイクが唇の近く）、顔が写らないもの
- `radio.equip`：操縦輪の PTT（送信ボタン）のアップ。計器の画面が主役にならないもの
- `radio.technique`：ひざ板（kneeboard）とメモ

### 章末

- 確認問題：Q1：keep（周波数を変えた直後に聞く＝AIM 4-2-2 a “If you have just changed frequencies, pause, listen…”）。 / Q2：keep（Ground。AIM 4-3-14「着陸した機は言われるまで Ground に変えない」と 4-3-21 Exiting the Runway After Landing。現行 AIM の番号どおり）。why に 4-3-1… / Q3：keep（AIM 4-2-4 c Student Pilots Radio Identification）。
- 新しい問題の案：4 問（地上局の正しい呼び方は？（AIM 4-2-6）；COM2 に出発管制の周波数を合わせて呼んだのに返事がない。オーディオパネルでまず確かめるのは？；VHF の無線が届く距離について正しいのは？（AIM 4-2-2）；PTT を押してすぐに話し始めると、何が起こりやすい？（AIM 4-2-2））
- 用語：Radiotelephony / 無線電話（音声の交信） — そのまま；Air traffic control (ATC) / 航空交通管制 — そのまま；ATIS / 飛行場情報の自動放送 / AIM 4-1-13 — 備考に出典を付ける；Clearance Delivery / 出発の指示（周波数・コード）の伝達 — 「出発許可の伝達」を直す；Ground / Tower / 地上管制・飛行場管制 — そのまま；Departure / Approach / 出発管制・進入管制 / レーダー — そのまま；（ほか 9 件）
- 出典：keep：FAA AIM 4-2 https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_2.html（現行：2026-07-09 発効 Change 3）；keep：FAA AIM 4-3 https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_3.html（4-3-2・4-3-14・4-3-21）；keep：FAA Pilot/Controller Glossary https://www.faa.gov/air_traffic/publications/atpubs/pcg_html/；add：FAA AIM 4-1（4-1-13 ATIS） https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_1.html；add：FAA Advisory Circular 90-50D（民間の VHF 管制周波数 118.000–136.975 MHz） https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_90-50D.pdf；（ほか 1 件）

## 第 8 章 `radio2` 言葉の決まり：アルファベット・数字・標準用語

節：`comm.basic` フォネティックアルファベットと数字の発音・`comm.numbers` 数字の言い方：高度・針路・速度・周波数・時刻・コード・`comm.callsign` コールサインの決まり・`comm.words` 標準用語の正しい意味（Pilot/Controller Glossary）

### 今の問題

- **誤り**
  - comm.numbers「時計の方位は機首（12 時）が基準」→ AIM 4-1-15：管制官はレーダーで航跡しか見えず、交通情報は航跡を基準に出される。横風で機首をずらしていると、言われた方位とずれて見える（例：12 時と言われた機が 2 時に見える） (https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_1.html)
  - quiz Q2 の why「上昇・降下中は 100 ft 単位に丸めた指示高度を言う（PCG：Say altitude）」→ PCG：“the pilot should state the indicated altitude rounded to the nearest 100 feet”。日本語の「指示高度」は「管制に指示された高度（assigned altitude）」と読めるので誤り。「高度計が示している高度（indicated altitude）」 (https://www.faa.gov/air_tra…
  - comm.words の見出し「意味（PCG の定義の要約）」の “Hold short of … / Hold position” → PCG には項目がない。JO 7110.65 3-7-2（“HOLD POSITION”、“HOLD SHORT OF (location)”）と AIM 4-3-18 (https://www.faa.gov/air_traffic/publications/atpubs/atc_html/chap3_section_7.html)
  - （radio4・同じ誤りの連鎖）book-comm.js:320 の quiz「one o'clock の基準は？」の正解「機首の方向」→ AIM 4-1-15 では「進んでいる方向（航跡）」。book-comm.js:275 も同じ (https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_1.html)
- **古い**
  - 注意（時刻の行）：EST＝UTC−5・EDT＝UTC−4（AIM 4-2-12）は現行。ただし夏時間を通年にする Sunshine Protection Act（H.R. 139）が 2026-07-14 に下院を通過し、2026 年 10 月初め時点で上院は未採決。法律になれば Florida の UTC との差が変わり、radio.j…
- **数値の食い違い**
  - radio.js:390 — drill の周波数に '135.275' があり、SAY.freq は “one three five point two seven five” と全部の桁を言わせる。JO 7110.65 2-4-17 は小数点以下 2 桁目より後を言わない（“135.275 MHz — One three five p…
  - radio.js:24 — ALPHA の X は 'Xray'（AIM TBL 4-2-7 と同じ）、book-comm.js:88 は 'X-ray'（JO 7110.65 TBL 2-4-1・ICAO と同じ）。
  - radio.js:20 — ALPHA の C は 'CHAR-LEE' だけ、本書は 'CHAR-LEE / SHAR-LEE'（AIM どおり）。本書が正しい。
  - （ほか 5 件）
- **わかりにくい**
  - comm.numbers：「千の位より上は 1 桁ずつ」→「thousand の前の数字を 1 桁ずつ」。
  - comm.callsign：「Archer Seven Lima Alpha（3 文字なのでそのまま）」の例と、本書の書き方「Archer 7LA」の読み方の説明がない。
  - comm.words：「I say again / Words twice」の行の「（言う）」。
  - （ほか 2 件）
- **順番**
  - comm.numbers：①「数字は 1 桁ずつ」が基本（周波数・コード・高度計・速度・針路・滑走路・時刻）→ ② 例外は高度（thousand・hundred、flight level）→ ③ 短縮（ground point seven・Victor twelve）の順に。
  - comm.words：受け答え → 聞き直し・確認 → 指示の言葉 → 地上と滑走路の許可、の 4 つに分ける。
  - （任意）高度の言い方を新しい節 comm.altitude（「高度の言い方」）に分け、comm.numbers を軽くする。ただし syllabus.js:89 の k3 は book: ['comm.basic', 'comm.numbers'] だけを参照するので、分ける場合は comm.numbers から {sec}／参照で案内す…
- **重複**
  - comm.words ↔ radio3 comm.clarify・comm.readback（使い方）と radio.js GLOSSARY（英語交信ページの用語集）。
  - comm.numbers の “ground point seven” ↔ radio4 comm.arrive・radio.js FLIGHT（radio.js:127–128）。“decimal” ↔ radio5 comm.icao。
  - comm.callsign の “Verify clearance for” ↔ radio3 comm.clarify。
  - （ほか 2 件）
- **節ごとの問題（抜粋）**
  - `comm.basic`：図がない。CADET の教室の画面に出す最初の <svg> がない。アルファベットは一覧の図（2 列×13 行＋数字の行）にすると覚えやすい。
  - `comm.basic`：AIM の表（TBL 4-2-7）の綴りは “Xray” で、本書は “X-ray”（JO 7110.65 TBL 2-4-1 と ICAO は “X-ray”）。radio.js:24 は 'Xray'。どちらも FAA の文書にあるが、本と練習ページで揃っていない。「X-ray（AIM の表では Xray）」と書くとよい。
  - `comm.basic`：AIM の表は Uniform を「YOU-NEE-FORM または OO-NEE-FORM」とする。本書と radio.js は YOU-NEE-FORM だけ。
  - `comm.basic`：「9 は「niner」（ドイツ語の nein と区別するため、と説明されることが多い）」は言い伝え。AIM・ICAO に理由は書かれていない。bk.est にするか削る。
  - （ほか 28 件）

### 書き直しの方針

4 つの節（comm.basic → comm.numbers → comm.callsign → comm.words）の id と順番はそのまま。comm.basic はアルファベットの図を最初に置き、26 行の表は図の下に（読み上げ用の代わりとして）短く残すか <details> に入れる。数字の表は図に入れる。comm.numbers は「数字は 1 桁ずつが基本 → 高度だけ特別（図：高度のはしご）→ 短縮・例外」の順に 3 つの表に分け、北は 360、距離の言い方、周波数の 3 桁目、高度計・滑走路・風の JO 7110.65 の段落（2-4-17・2-6-3）を足す。時計の方位は AIM 4-1-15（航跡が基準）に直し、radio4 の 2 か所と同時に直す。'decimal' は残し、突風の言い方は書かない（FLIGHT LAB テストが radio 章で /gusts/i を禁止）。comm.callsign は本書の書き方「Archer 7LA」の読み方をここで説明し、ANA の文は削る。comm.words は流れ図（何と答えるか）を最初に置き、表を 4 つのまとまりに分けて出典の列を付ける（Hold short / Hold position は JO 7110.65 3-7-2）。'Say again'・'Wilco'・'Unable'・'AIM 4-3-18' は残し、小文字の 'line up and wait' の文を 1 つ置く。高度の言い方を新しい節 comm.altitude に分けてもよい（任意）。

節の最初の図（いちばん大事な図）：
- `comm.basic`：phoneticBoard：26 文字を 2 列×13 行（文字・言い方・発音、強く読む音節を色で）＋ 0〜9 の発音の行。下に例「N7LA → (Archer) Seven Lima Alfa」。
- `comm.numbers`：altitudeSayLadder：縦の高度のはしご（0〜20,000 ft）に 500・1,200・4,500・10,000・13,500 の言い方、18,000 ft の線（ここから flight level）と FL190 “flig…
- `comm.callsign`：callsignAnatomy：登録記号「N7LA」と機種名「Archer」から “Archer Seven Lima Alpha” ができる図（N は省く）。下段に “Cessna One Two Three Four Five” →（管…
- `comm.words`：responseChooser：管制官の送信を聞いたあとの流れ図。自分宛て？→ 分かった？（いいえ → Say again）→ 質問？（はい → Affirmative / Negative / 数字で答える）→ 数字・滑走路・hold s…

### 図

今の図：`bk.t（comm.basic：アルファベット 26 行）` → fix、`bk.t（comm.basic：数字 11 列）` → replace-by-photo、`bk.t（comm.numbers：15 行×4 列）` → redo、`bk.t（comm.words：20 行×3 列）` → fix、`（SVG の図なし）` → redo

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `phoneticBoard` | `comm.basic` | フォネティックアルファベットの一覧（2 列×13 行：文字・言い方・発音、強く読む音節を色で）＋ 0〜9 の発音の行＋例「N7LA → Archer Seven Lima Alfa（機種名を言うので … | AIM TBL 4-2-7（radio.js ALPHA・DIGP と同じ値）。book は radio.js より先に読み込まれ、CADE… | must |
| `altitudeSayLadder` | `comm.numbers` | 縦の高度のはしご：500 “five hundred”、1,200 “one thousand two hundred”、4,500 “four thousand five hundred”、10,0… | AIM 4-2-8・4-2-9。言い方は FL.radio.SAY.altitude と同じ結果（flight.test.mjs が 500… | must |
| `headingRose` | `comm.numbers` | 方位の円：360 “heading three six zero”（000 とは言わない）・090 “zero niner zero”・180・270。風の矢印 “wind two two zero … | AIM 4-2-10、JO 7110.65 2-4-17（north = 360）・2-6-3（calm）。radio.js SAY.hea… | should |
| `trafficClock` | `comm.numbers` | 時計の方位：自機のまわりの時計の文字盤。上は「進んでいる方向（航跡）＝12 時」。横風で機首を右にずらしている機では、管制の「12 時」の機が窓の外では 2 時に見える（AIM FIG 4-1-15 … | AIM 4-1-15 c の例（12 時と言われ 2 時に見える／2 時と言われ 3 時に見える）。 | should |
| `callsignAnatomy` | `comm.callsign` | コールサインの組み立て：機種名「Archer」＋登録記号「N7LA」から N を除いて “Archer Seven Lima Alpha”。本書の書き方「Archer 7LA」＝同じ読み。下段：Ces… | AIM 4-2-4 a（prefix＋最後の 3 文字、似たコールサインの例）。 | must |
| `responseChooser` | `comm.words` | 「何と答えるか」の流れ図（自分宛て？→ 分かった？→ 質問？→ 数字・滑走路を含む指示？→ 従える？→ 情報だけ？）。終点は Say again / Affirmative・Negative・値で答え… | PCG（Roger・Wilco・Affirmative・Unable・Say again）、AIM 4-4-7（復唱するもの）、AIM 4-… | must |

### 写真

- `comm.callsign`：機体の登録記号（N-number）がはっきり見える Piper PA-28 Archer（個人機。訓練校・航空会社の塗装やロゴがないもの、人の顔がないもの）

### 章末

- 確認問題：Q1：keep（13,500 → one three thousand five hundred、AIM 4-2-8 b）。ただし quiz.js q_radio の 10,500 の問題とほぼ同じ。 / Q2：fix（why の「100 ft 単位に丸めた指示高度」→「高度計が示している高度（indicated altitude）を 100 ft 単位に丸めて」。PCG SAY ALTITUDE）。 / Q3：keep（PCG STAND BY “is not an approval or denial”）。 / Q4：replace（119.75 は quiz.js q_radio の問題と同じ。下の「北の針路」か「ground point seven」の問題に替える）。
- 新しい問題の案：5 問（北（360°）へ向けという針路の正しい言い方は？；管制官の「はい／いいえ」で答える質問に「はい」と答える言葉は？；Cessna N12345 のパイロット。“Cessna Three Four Five” と省略して言ってよいのは？；“Contact Ground point seven” の周波数は？；フロリダ（Sanford）の夏時間（EDT）14:30 を UTC で言うと？）
- 用語：Phonetic alphabet / フォネティックアルファベット / AIM 4-2-7 — そのまま；Niner / Tree / Fife / 9 / 3 / 5 の発音 — そのまま；Flight level / フライトレベル / 米国は 18,000 ft 以上（AIM 4-2-9）— 「米国は」を足す；Altimeter / 高度計規正値 / JO 7110.65 2-4-17 — 出典を足す；Squawk / トランスポンダーのコード（0〜7 の 4 桁）— 説明を足す；Zulu (UTC) / 協定世界時 / AIM 4-2-12 — 出典を足す；（ほか 11 件）
- 出典：keep：FAA AIM 4-2 https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_2.html（4-2-4・4-2-7〜4-2-12。現行：2026-07-09 発効 Change 3）；keep：FAA Pilot/Controller Glossary https://www.faa.gov/air_traffic/publications/atpubs/pcg_html/（Change 3、2026-07-09）；update：FAA Order JO 7110.65 → 現行は JO 7110.65BB（Change 3、2026-07-09）https://www.faa.gov/air_traffic/publications/atpubs/atc_html/。数字の言い方は 2-4-17 Numbers Usage（ht…；add：FAA AIM 4-1（4-1-15 交通情報の時計の方位は航跡が基準） https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_1.html；add：FAA AIM 4-3（4-3-14 ground point seven、4-3-18 taxi では cleared を使わない） https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_3.html；（ほか 1 件）

## 第 9 章 `radio3` 交信の型：呼び出し・応答・復唱（How a call is built: initial contact, acknowledgement and readback）— 第 9 章, book-comm.js:155-228

節：`comm.pattern` 最初の呼び出しの型・`comm.readback` 復唱（readback）：何を・どの順に・`comm.clarify` わからないとき・従えないとき・`comm.mistakes` よくある間違い

### 今の問題

- **誤り**
  - comm.clarify「推測で復唱・行動しない（PCG）」→ PCG にこの規則はない。出典は AIM 4-3-18（理解できない許可・指示は確認する）と AIM 5-2-5（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_3.html , https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap5_section_2.html）
  - comm.readback key「数字（高度・針路・周波数・コード）と滑走路は必ず復唱」→ AIM 4-4-7 が求めるのは、高度・高度の制限・vector・滑走路の指定（さらに地上では AIM 4-3-18 の滑走路の指定・滑走路に入る許可・hold short・LUAW）。周波数・コードの復唱はよいやり方だが必須ではない。AIM 4-2-3 の例 “one three four point five, United Two Twenty-Two” を参照（https://www.faa.gov/air_tra…
  - comm.pattern：AIM 4-2-3 の扱いが不正確。受信が確かなら、要求・位置・ATIS の記号まで一度に言う方が混雑が減る。短い呼び出しは、届くか分からないときと呼び直すとき（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_2.html）
- **古い**
  - 古くなった内容は見つからなかった。AIM（現行 Change 3、2026-07-09 発効）と FAA Order JO 7110.65BB（Change 3、2026-07-09 発効）で確認した。refs のリンクは現行版の HTML を指している。
- **数値の食い違い**
  - comm.pattern の例文（book-comm.js:164）には高度がなく、radio4 comm.dep（book-comm.js:243）と radio.js:73 の同じ呼び出しには “at three thousand five hundred” がある。radio.js:144（scene r_first）は “VFR …
  - comm.readback の Departure の指示 “turn right heading zero niner zero, climb and maintain three thousand five hundred”（book-comm.js:186）は、radio.js FLIGHT（dep の段階：radar contac…
  - comm.readback の Tower “contact departure one one niner point seven five”（book-comm.js:188）に対し、radio4 comm.tower（book-comm.js:257）と radio.js:94 は “contact departure”（周波数なし…
  - （ほか 1 件）
- **わかりにくい**
  - comm.pattern：「地上ではいる場所」は 2 通りに読める。
  - comm.pattern：「要求（短ければ）」は AIM 4-2-3 の項目 4 を半分しか訳していない（“The type of message to follow or your request if it is short”）。
  - comm.pattern：見出し「混んでいるとき」は誤解を生む。AIM が短い呼び出しを勧めるのは、受信が確かでないときと呼び直すとき。
  - （ほか 4 件）
- **順番**
  - comm.pattern に 4 つの話題が詰め込まれている。最初の呼び出しだけを comm.pattern に残し、応答・Contact／Monitor・周波数の変更は新しい節 comm.ack に移す。Class C の交信確立は、使う場面である radio4 comm.arrive に移すか comm.ack に入れる（テストで必要…
  - comm.mistakes の “active runway” の行（AIM 4-1-9）は radio5 comm.ctaf に移す。
  - LUAW は comm.readback で初めて定義する（今は comm.clarify で説明なしに使い、radio4 comm.tower でようやく説明している）。
- **重複**
  - radio2 comm.words（PCG の Roger・Wilco・Say again・Unable・Verify・Correction・Contact／Monitor・Traffic in sight／Negative contact・LUAW・hold short）と、comm.clarify・comm.mistakes・comm…
  - radio2 comm.callsign（省略は管制官から・Verify clearance for）と、comm.mistakes の『コールサインを省略』の行・comm.clarify の『自分宛てか分からない』の行が重なる。
  - radio1 radio.technique（送信前に聞く・student pilot・Stand by）と、comm.mistakes の『ブロック』の行・comm.clarify の『Stand by』の行が重なる。
  - （ほか 3 件）
- **節ごとの問題（抜粋）**
  - `comm.pattern`：4 つの話題が 1 節に詰め込まれている（最初の呼び出し／『混んでいるとき』の短い呼び出し／管制官への応答と周波数の変更／Class C の交信確立）。「ここが大切」の 3 項目もばらばらの話題になっている。応答・周波数の変更・Class C は新しい節に移す（policy を参照）。
  - `comm.pattern`：「地上ではいる場所（at the west ramp）」は読みにくい（『地上では／いる場所』とも『地上で／はいる場所』とも読める）。→「地上にいるときは、いまいる場所（at the west ramp）」。
  - `comm.pattern`：「要求（短ければ）」は AIM の 4 番目の項目を半分しか訳していない。AIM 4-2-3 の原文は “The type of message to follow or your request if it is short”（次に言う内容の種類。短ければ要求そのもの）。
  - `comm.pattern`：見出し「混んでいるとき」は AIM 4-2-3 の考え方とずれている。AIM は、受信が確かなら（If radio reception is reasonably assured）要求・位置・ATIS の記号を最初の呼び出しに入れると周波数の混雑が減る、と書いている。短い呼び出しを使うのは、相手に届くか分からないときと、返事がなかったあと…
  - （ほか 22 件）

### 書き直しの方針

節の順番は comm.pattern（最初の呼び出しだけ）→ 新しい節 comm.ack『応答と周波数の変更』（応答の型・Contact と Monitor・周波数の変更は応答してから・Class C の交信確立）→ comm.readback → comm.clarify → comm.mistakes にする。最初に、“Archer 7LA” は本の中での書き方で、声に出すときはいつも “Archer Seven Lima Alpha” と言うこと、そして規則（14 CFR）・推奨（AIM）・管制官の方式（JO 7110.65）の違いを説明する。そのあと、1 つの例文を 4 つのブロックに分けた図で呼び出しの型を見せる。例はすべて radio4 と radio.js FLIGHT と同じ飛行の言葉を使う（滑走路 36・誘導路 Alpha と Charlie・119.75・4271・3,500 ft）。違う場面の例（針路 090 など）には『別の場面の例』と書く。radio2 の用語の定義は繰り返さず、第 8 章を参照させる。“active runway” の行は radio5 に移す。各節に、目的の文・最初の図・「ここが大切」（comm.mistakes にも新しく付ける）を置く。テストで必要な言葉（'AIM 4-2-3'・'AIM 4-4-7'・'AIM 3-2-4'・'Wilco'・'Unable'・'Say again'・'line up and wait'・'cleared for takeoff'・'student pilot'）は、この章と radio4 の本文に必ず残す。'AIM 4-2-3' は今は radio3 にしかない。

節の最初の図（いちばん大事な図）：
- `comm.pattern`：「呼び出しを 4 つのブロックに分けた図」（callupBlocks）。例文 “LAB Ground | Archer Seven Lima Alpha, student pilot | at the west ramp | with in…
- `comm.readback`：「復唱の輪の図」（readbackLoop）。管制官 → 指示（“runway three six, taxi via Alpha, hold short of taxiway Charlie”）→ パイロットが復唱 → 管制官が聞いて確か…
- `comm.clarify`：「迷ったときの流れ図」（clarifyFlow）。指示を聞いた → 全部聞こえた？（いいえ → “Say again (all after …)”）→ 自分宛て？（分からない → “Verify clearance for Archer S…
- `comm.mistakes`：「滑走路の手前の停止線の拡大図」（holdLineCloseup）。黄色の線 4 本（実線 2 本・破線 2 本。実線の側で止まる：AIM 2-3-5）と赤地に白の滑走路標識『36』を描き、その横に 2 つの吹き出し：✗ “Roger.” …

### 図

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `callupBlocks` | `comm.pattern` | 最初の呼び出しを色分けした 4 つのブロック（＋ATIS・student pilot の小さな札）に分け、それぞれに日本語の名前を付けた図。Who → Who → Where → What の矢印。 | AIM 4-2-3 の項目の並び。例文は radio.js:73（FLIGHT gnd1）の文 | must |
| `readbackLoop` | `comm.readback` | 指示 → 復唱 → 管制官が聞いて確かめる → 違えば直す、の輪の図と、『必ず復唱するもの』の札（高度・針路・滑走路・hold short・LUAW）。 | AIM 4-4-7・AIM 4-3-18・JO 7110.65 3-7-2。例は radio.js:75-77 | must |
| `classCContact` | `comm.ack` | Class C の境界の外にいる Archer と、2 つの吹き出しの図：“Archer Seven Lima Alpha, stand by” = 入ってよい（緑）、“Aircraft callin… | AIM 3-2-4 の NOTE と EXAMPLE、JO 7110.65 7-8-4 | should |
| `clarifyFlow` | `comm.clarify` | 迷ったときの流れ図：聞こえた？ → 自分宛て？ → 従える？ と進み、それぞれ Say again／Verify／Unable の言い方を示す。 | PCG（SAY AGAIN・VERIFY・UNABLE）、AIM 4-2-4・AIM 4-3-18 | should |
| `holdLineCloseup` | `comm.mistakes` | 滑走路の手前の停止線（黄色の線 4 本：実線 2 本・破線 2 本。実線の側で止まる）と赤い標識『36』を描き、✗ “Roger.” と ○ 正しい復唱の吹き出しを並べた図。 | AIM 2-3-5（holding position markings）、AIM 4-3-18 | must |

### 写真

- `comm.mistakes`：滑走路の手前の停止線と、赤地に白の滑走路標識（mandatory instruction sign）が見える誘導路の写真。
- `comm.pattern`：小型機の操縦輪にある送信ボタン（PTT）またはヘッドセット。人の顔が写っていないもの。

### 章末

- 確認問題：Q1（AIM 4-4-7 が復唱すべきとしているもの）：残す。正解の文を『高度・高度の制限・針路・滑走路の指定を含む指示』にして AIM に合わせる。 / Q2（コールサインなしの stand by で Class C に入れるか）：残す（AIM 3-2-4）。Class C の段落を comm.ack か radio4 に移すときは、この問題も一緒に移す。 / Q3（周波数の変更）：残す（AIM 4-2-3）。
- 新しい問題の案：5 問（最初の呼び出しの正しい順番は？（AIM 4-2-3）；Ground「Archer Seven Lima Alpha, runway three six, taxi via A…；「Runway three six, line up and wait」の意味は？；管制官「Archer Seven Lima Alpha, monitor tower one one eight poi…；指示の後半が雑音で聞こえなかった。正しい言い方は？）
- 用語：Initial contact / initial callup：最初の呼び出し（その局またはその管制官への最初の送信）（AIM 4-2-3）；Acknowledge：応答する（コールサインと Wilco・Roger・Affirmative・Negative など）（AIM 4-2-3）；Readback：復唱（AIM 4-4-7・AIM 4-3-18）；Hearback：管制官が復唱を聞いて確かめること（FAA の安全資料の用語。PCG の用語ではない）；Contact / Monitor：交信せよ（新しい周波数で呼ぶ）／聞いて待て（呼ばない）（PCG）；Two-way radio communications established：双方向の交信が確立した（コールサイン付きの応答があったとき）（AIM 3-2-4）；（ほか 7 件）
- 出典：追加：FAA AIM 4-4 ATC Clearances and Aircraft Separation（4-4-7 の復唱。この章の中心なのに refs にない）https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_4.…；追加：FAA AIM 3-2 Controlled Airspace（3-2-4 Class C の交信確立）https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap3_section_2.html（R キー aim32 を新しく作る）；追加：FAA AIM 5-2（5-2-5 Line Up and Wait）＝既にある R.aim52 https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap5_section_2.html；追加：FAA AIM 4-1（4-1-13 ATIS・4-1-9）＝既にある R.aim41 https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_1.html；追加（図 holdLineCloseup を入れる場合）：FAA AIM 2-3（2-3-5 Holding Position Markings）https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap2_section_3.html；（ほか 2 件）

## 第 10 章 `radio4` 1 回の飛行の交信：出発から到着まで（A whole flight on the radio: from the ramp to the ramp）— 第 10 章, book-comm.js:230-322

節：`comm.atis` ① ATIS を聞いて書き取る・`comm.dep` ② 地上：タキシーの許可（出発周波数とコードも）・`comm.tower` ③ 管制塔：離陸・`comm.radar` ④ 出発管制・レーダー：交通情報と、別れ方・`comm.arrive` ⑤ 帰り：進入管制 → 管制塔 → 着陸 → 地上・`comm.option` ⑥ 場周経路での練習（タッチアンドゴー）

### 今の問題

- **誤り**
  - comm.radar「時計の方位は機首が 12 時」と quiz Q3（正解『機首の方向』、不正解『進んでいる方向（航跡）』）→ 管制官はレーダーで見える航跡を基準に時計の方位を言う。クラブしていると、他機は言われた位置より風下の側に見える（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_1.html AIM 4-1-15）
  - comm.tower「6 マイル以内の一番近い機…（JO 7110.65 3-9-4・3-9-10）」→ 民間（FAA）は LUAW のとき（3-9-4・AIM 5-2-5）だけ。3-9-10 の離陸許可での決まりは USAF だけ（https://www.faa.gov/air_traffic/publications/atpubs/atc_html/chap3_section_9.html）
  - comm.tower「周波数を省くことがある（AIM 4-3-14）」を出発周波数に当てはめている → 出発周波数の根拠は JO 7110.65 2-1-17『Departure frequency if previously given』（https://www.faa.gov/air_traffic/publications/atpubs/atc_html/chap2_section_1.html）
  - comm.arrive の到着高度 3,500 ft（南西向き、地上 3,000 ft を超える水平飛行）→ 14 CFR 91.159(a)(2)：偶数千 ft＋500 ft（2,500 ft・4,500 ft）（https://www.ecfr.gov/current/title-14/section-91.159）
  - comm.option の bk.sim『（t2・t4 で）管制の指示に復唱しながら飛びます』→ t4 には管制の場面がない（syllabus.js:184-190）。t2 は着陸許可 1 つだけ（school.js:122）
  - （ほか 2 件）
- **古い**
  - 古くなった内容は見つからなかった。AIM（Change 3、2026-07-09 発効）、JO 7110.65BB（Change 3、2026-07-09 発効）、PCG（GO AROUND・RUNWAY HEADING・CLEARED FOR THE OPTION・RADAR CONTACT・RESUME OWN NAVIGATION）…
- **数値の食い違い**
  - radio.js:110 の帰りの ATIS が “LAB information Charlie. One six five three Zulu …”。出発の ATIS は “information Bravo … One four five three Zulu”（radio.js:68／book-comm.js:236）。ATIS…
  - 到着の高度 3,500 ft（book-comm.js:280、radio.js:112）は、南西向きの 91.159 に合わない。→ 2,500 ft にする（管制塔への呼び出しの “two thousand” はそのままでよい）。radio.js:272（scene r_panpan）の “heading two two zero, …
  - ATIS の雲 FEW035（book-comm.js:236、radio.js:68、cadet/src/content/dialog/atc.js:44）が、巡航高度 3,500 ft（book-comm.js:243、radio.js:73）と同じ。91.155 では雲の下 500 ft 以上離れる → 雲を 5,000 ft 以上…
  - （ほか 4 件）
- **わかりにくい**
  - chapter：summary では『日本語の意味と理由つきで』と言っているが、say() の表には理由の列がなく、パイロットの行の多くが『（相手・自分・場所…）』のような要素の並びだけ。app の FLIGHT のように、意味（全訳）と理由（note）の列を持たせる。
  - chapter：LAB の周波数（ATIS・Ground・Tower・Departure・Approach）がまとまって書かれていない。Tower 118.3 は帰りの段階で初めて出てくる。
  - comm.tower：LUAW をつづりなしに使い、“fly runway heading” の意味（PCG：磁方位・風で流されても修正しない）を説明していない。
  - （ほか 4 件）
- **順番**
  - 飛行の全体像（地図・周波数・段階の番号）がない。新しい節 comm.flow を章の最初に置く。
  - comm.arrive に 3 つの段階が入っている。app の FLIGHT（radio.js:109-135：app・twr2・gnd2 が 3 つとも comm.arrive にリンク）に合わせて、節の中に ⑤⑥⑦ の小見出しを立てる。app が comm.arrive にリンクしているので、節は分けずに小見出しで分ける。
  - comm.option は、飛行が終わったあとに場周の練習が出てくるので、時の順番が合わない。『別の日の練習』として最後に置き、番号を ⑧（または番号なし）にする。
  - （ほか 1 件）
- **重複**
  - radio.js FLIGHT（radio.js:65-136）は、この章と同じ台本の app 版。これは意図した重なりで、言葉が一字一句同じでなければならない（下の numbers と appMismatches を参照）。
  - radio3 comm.readback（Ground・LUAW・周波数の復唱）と、comm.dep・comm.tower の復唱の説明が重なる。radio3 には『型』を、radio4 には『流れ』を書く。
  - book-3 ops.pattern（場周経路の辺の名前・高度）と comm.arrive・comm.option、book-3 ops.goaround（Power・Attitude・Configuration）と comm.option の go around が重なる。→ 操縦は第 14 章（{ch:tl} などの参照）に任せ、ここ…
  - （ほか 2 件）
- **節ごとの問題（抜粋）**
  - `comm.atis`：「雲高 5,000 ft 以上・視程 5 SM 以上なら雲と視程は省くことがある」→ AIM 4-1-13 の本文は『雲高が 5,000 ft を超え、視程が 5 マイルを超えるとき（above 5,000 feet / more than 5 miles）』。同じ段落の NOTE には『5,000 ft 以上・5 マイル以上』とあり、A…
  - `comm.atis`：ATIS の “Few clouds at three thousand five hundred” と、この飛行の巡航高度 3,500 ft が同じ。14 CFR 91.155（Class C・E：雲の下 500 ft、上 1,000 ft、横 2,000 ft）から見て、悪いお手本になる。雲を FEW050 などにする（app の r…
  - `comm.atis`：「ここが大切」がない（radio4 の 6 節すべてにない）。
  - `comm.atis`：「ふつうの情報を録音で繰り返し流して」→ AIM の “recorded noncontrol information”（管制の指示ではない、決まった内容の情報）の訳として、『ふつうの』はあいまい。
  - （ほか 36 件）

### 書き直しの方針

章の最初に新しい節 comm.flow『この章の飛行の全体図』を置く。LAB の Class C（中心 5 NM・棚 10 NM・外側の区域 20 NM）、出発、北東 10 NM の外の訓練空域、帰りの呼び出し地点を描いた模式図と、架空の周波数の表（ATIS 127.65・Ground 121.7・Tower 118.3・Departure 119.75）を載せ、段階の番号を app の FLIGHT と同じ ①〜⑦ にする。各段階の節は、目的の文 → 最初の図 → 台本の表（誰・英語・意味・理由の 4 列。app の note 列と同じ内容）→「ここが大切」→ 注意、の形にする。今はどの節にも「ここが大切」がない。comm.arrive は節を分けずに、⑤ ATIS と進入管制・⑥ 管制塔：場周経路と着陸・⑦ 地上管制：駐機場へ の小見出しで分ける（app の 3 つの段階が comm.arrive にリンクしているため）。帰りの ATIS の全文（時刻を 1553Z に直したもの）を入れる。comm.option は『別の日の練習（⑧）』にする。事実の誤りを直す：時計の方位は航跡が基準（AIM 4-1-15）、帰りの高度は 2,500 ft（91.159）、ATIS の雲を巡航高度より上に、6 マイルの交通情報と周波数を省く根拠の出典、student pilot を管制塔・出発管制・進入管制の最初の呼び出しにも入れる（AIM 4-2-4）、到着の呼び出しにコードを入れる（AIM 3-2-4）。台本の言葉は radio.js FLIGHT と一字一句同じにする。app の側を直すべきところ（ATIS の時刻・高度・雲・時計の方位・student pilot）は appMismatches に書いたので、そこで報告する。テストで必要な 'AIM 4-4-7'・'AIM 3-2-4'・'AIM 4-3-18'・'line up and wait'・'cleared for takeoff'・'student pilot' は、この章の本文に残す。

節の最初の図（いちばん大事な図）：
- `comm.atis`：「ATIS のひざ板メモの図」（atisKneeboard）。記号 B／時刻 1453Z／風 340/08／視程 10／雲／気温・露点 31/22／高度計 30.01／滑走路 36 の欄を書き込んだカードと、『30.01 → 高度計の BA…
- `comm.dep`：「LAB の地上走行の模式図」（labTaxiDiagram）。west ramp → 誘導路 Alpha → 誘導路 Charlie の手前（止まる位置）→ ランナップの場所 → 滑走路 36 の停止線（実線の側）を、通る順に色の線で描く…
- `comm.tower`：「滑走路での 3 つの位置の図」（luawPositions）。上から見た滑走路 36 の端に、①停止線の手前（holding short）②センターライン上で待つ（line up and wait）③離陸滑走（cleared for ta…
- `comm.radar`：「時計の方位は航跡が基準の図」（trafficClockTrack）。自分の機を中心に時計の文字盤を描く。航跡（矢印）を 12 時にし、機首は風上に 10〜15° ずれている（クラブ）。管制官の『1 o'clock』は航跡から 30°、パイ…
- `comm.arrive`：「場周経路でどこで何を言うかの図」（patternCalls）。滑走路 36 の左回りの場周（ダウンウインドは地上 1,000 ft、約 1.6 km 離れて平行：syllabus.js t2）を描き、次の地点に番号の札を立てる：進入管制へ…
- `comm.option`：「option の 4 つの選び方とゴーアラウンドの経路の図」（optionAndGoAround）。滑走路 36 の上に、タッチアンドゴー・ストップアンドゴー・ローアプローチ・フルストップの 4 つの経路を描き、別の色でゴーアラウンド（滑…

### 図

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `flightOverviewMap` | `comm.flow` | LAB の Class C の模式図：中心 5 NM・棚 10 NM（地上 1,200〜4,000 ft）・外側の区域 20 NM（破線）。出発（北へ）→ 北東 10 NM の外の訓練空域 → 帰り（… | AIM 3-2-4（5／10／20 NM、1,200〜4,000 ft）、radio.js FLIGHT の freq と台本（radio.… | must |
| `atisKneeboard` | `comm.atis` | ATIS Bravo を書き取ったひざ板のカードと、高度計を合わせる手順の矢印。 | ATIS の文（radio.js:68）。標高 55 ft は physics.js:64 | must |
| `labTaxiDiagram` | `comm.dep` | LAB の模式図：west ramp・誘導路 Alpha・誘導路 Charlie の手前の止まる位置・ランナップの場所・滑走路 36 の停止線（実線の側）。地上走行の経路を色で示す。模式図・NOT F… | 架空の配置（book と radio.js:75-82 の経路）。滑走路の長さ 1,200 m・幅 30 m・真方位 354° は phys… | must |
| `luawPositions` | `comm.tower` | 滑走路 36 の端を上から見た図：holding short → line up and wait → cleared for takeoff の 3 つの位置と、それぞれの言葉。最終進入の 5 NM… | AIM 5-2-5、JO 7110.65 3-9-4、AIM 2-3-5（停止線） | must |
| `trafficClockTrack` | `comm.radar` | 時計の文字盤の図：12 時＝航跡。機首はクラブで 10〜15° 風上へ。管制官が『1 o'clock』と言った他機が、パイロットの目にはどこに見えるかを示す。 | AIM 4-1-15 の図（Induced Error in Position of Traffic） | must |
| `patternCalls` | `comm.arrive` | 左回りの場周（滑走路 36）に、交信する地点（15 NM の進入管制・10 NM の管制塔・enter left downwind・midfield・number two follow・cleared… | 台本（radio.js:112-128）。場周の寸法（地上 1,000 ft・約 1.6 km・90 kt）は syllabus.js の … | must |
| `optionAndGoAround` | `comm.option` | option の 4 つの経路（タッチアンドゴー・ストップアンドゴー・ローアプローチ・フルストップ）と、ゴーアラウンドの経路（滑走路の上を飛びながら場周の高度へ → クロスウインド）。 | AIM 4-3-23、PCG の CLEARED FOR THE OPTION と GO AROUND | should |
| `freqTable` | `comm.flow` | （表で作る）LAB の周波数とコード（架空）：ATIS 127.65・Ground 121.7・Tower 118.3・Departure 119.75・コード 4271（出発）／0425（到着）／1… | radio.js FLIGHT の freq、avionics.js:120、cadet atc.js:20（ATIS） | should |

### 写真

- `comm.tower`：空港の管制塔の外観（人の顔が写っていないもの）。
- `comm.radar`：空港監視レーダー（ASR-9 など）のアンテナ。
- `comm.dep`：誘導路から見た、滑走路の停止線と赤い滑走路標識。
- `comm.option`：小型機のタッチアンドゴーまたは場周経路を飛ぶ様子（顔が分からないもの）。

### 章末

- 確認問題：Q1（taxi via で滑走路に入ってよいか）：残す（AIM 4-3-18）。 / Q2（Ground に変えるのはいつ）：残す（AIM 4-3-14・4-3-21）。理由に『機体の全部が停止線を越えて止まってから呼ぶ』を足す。 / Q3（“one o'clock” の基準）：直す。今の正解『機首の方向』は AIM 4-1-15 と違う。正解は『進んでいる方向（航跡）』。理由：管制官のレーダーに見えるのは航跡だけ。クラブしていると、他機は言われた位置より風下の側に見える…
- 新しい問題の案：5 問（ATIS information Bravo を聞いた。最初の交信で言うことは？；上昇中、Tower「Archer Seven Lima Alpha, contact departure.」周波数は言わ…；管制官の交通情報「traffic, one o'clock …」の『12 時』は何が基準？；着陸して誘導路に出た。管制塔からまだ何も言われていない。どうする？；VFR の場周経路で “the option” を頼むのはいつ？（AIM 4-3-23））
- 用語：ATIS / Information (letter)：飛行場の情報の録音放送／その記号（AIM 4-1-13）；Have numbers：風・滑走路・高度計だけ聞いた。ATIS を聞いた意味にはならない（AIM 4-1-13）；Taxi via … / Hold short of …：…を経由して地上走行せよ／…の手前で止まれ（JO 7110.65 3-7-2）；Departure frequency … squawk …：出発周波数とトランスポンダーのコード（JO 7110.65 3-9-3）；Ready for departure：出発の準備ができた；Line up and wait（LUAW）：滑走路に入って待て。離陸許可ではない（AIM 5-2-5）；（ほか 16 件）
- 出典：追加：FAA AIM 4-4（4-4-7 の復唱）https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_4.html（R キー aim44 を新しく作る）；追加：FAA AIM 3-2（3-2-4 Class C の交信確立・外側の区域・到着の呼び出しの内容）https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap3_section_2.html（R キー aim32 を新しく作る）；追加：FAA AIM 2-3（2-3-5 停止線）https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap2_section_3.html（停止線の図を入れる場合）；追加：14 CFR 91.155・91.159（雲からの距離・VFR の巡航高度。高度と雲を直す場合）＝既にある R.cfr91 https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91；そのまま：R.aim41・R.aim43・R.aim42・R.aim52・R.jo71（現行 7110.65BB）・R.pcg

## 第 11 章 `radio5` 管制塔のない空港・緊急・無線の故障・Sanford・FAA と ICAO の違い（Non-towered airports, emergencies, radio failure, Sanford, FAA and ICAO）

節：`comm.ctaf` 管制塔のない空港：CTAF で自己通報・`comm.xpdr` トランスポンダー・MAYDAY と PAN-PAN・`comm.nordo` 無線が使えないとき・灯火信号・`comm.sfb` Sanford（KSFB）で気をつけること・`comm.icao` FAA と ICAO（英国）の言い方の違い・上達の練習法

### 今の問題

- **誤り**
  - comm.xpdr：PAN-PAN の例 “one hour fuel remaining” → AIM 6-3-2 と PCG “Fuel remaining” は残りの燃料を分（minutes）で言う：“six zero minutes of fuel remaining”（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap6_section_3.html）
  - comm.nordo：表の根拠「14 CFR 91.185」→ 91.185 は IFR の無線故障の規則。VFR で管制塔のある空港（Class D、Class C も 91.130(a) で）へ無線なしで着陸できる根拠は 91.129(d)(2)、灯火信号の意味は 91.125、7600 は AIM 6-4-2（https://www.ecfr.gov/current/title-14/section-91.129）
  - comm.sfb：HS1「滑走路 18 から出て誘導路 C へ右折するはずが 27C へ」→ FAA：滑走路 18 に着陸した機（または 9L/27R に着陸して 18 に出るよう指示された機）が、18 の上から誘導路 C へ右折するはずが滑走路 27C へ右折した（https://www.faa.gov/flight_deck/sfb）
  - comm.icao：「どちらでも共通：… line up and wait」→ 英国では ‘LINE UP’ だけの指示や条件付きの line up もある（CAP 413 Edition 24, 1 July 2026: https://www.caa.co.uk/cap413）
  - comm.icao：「滑走路の手前の待機：ICAO・英国は holding point」→ 英国にも ‘HOLD SHORT’ があり、停止位置がない場所や許可の限界の強調に限って使う（CAP 413 Edition 24）
- **古い**
  - CAP 413 は Edition 24（2026-07-01 発効）が現行。refs のラベルに版を付ける（https://www.caa.co.uk/data-and-publications/publications/documents/content/cap-413/）。
  - FAA From the Flight Deck: SFB は 2026-06-02 更新。本文の要約は現行ページと一致（追加すべき項目は issues 参照）。
  - 英国の transition altitude：18,000 ft への統一案（CAA 2016 年協議）の実施状況は未確認。「ずっと低い」は現時点の記述として残し、「変更の可能性あり・要確認」を添える。
- **数値の食い違い**
  - comm.xpdr：例文 “one hour fuel remaining” と本文 ⑨「残りの燃料（分）」が食い違う（AIM 6-3-2）。
  - comm.xpdr：“two persons on board”（本）と “two people on board”（radio.js r_mayday）。AIM 6-3-2 の言葉（people）に揃える。
  - comm.ctaf：例の空港名が本は AIM の Strawn、radio.js は架空の Lakeside。
  - （ほか 4 件）
- **わかりにくい**
  - comm.ctaf：「CTAF は UNICOM・MULTICOM（122.9）・時間外の管制塔の周波数など」— UNICOM・MULTICOM・自己通報を説明しないまま並べている。
  - comm.xpdr：トランスポンダー・squawk・ident・Mode C・ADS-B Out の説明がない。
  - comm.xpdr：「優先｜すべての交信より優先。その周波数は静かにする」— 誰が静かにするのか（ほかの局）を一文で。AIM 6-3-1：MAYDAY はその周波数の無線封止を命じる。
  - （ほか 3 件）
- **順番**
  - squawk・トランスポンダーは radio2（comm.numbers の表）と radio4（comm.dep・comm.radar）で先に使われるのに、何の装置かは radio5 の comm.xpdr まで出てこない。comm.dep に一文と bk.see('comm.xpdr') を置くか、comm.xpdr の冒頭を「最初に…
  - comm.xpdr の中で、トランスポンダーと遭難通報が混ざっている。comm.xpdr（装置とコード）→ 新 comm.mayday（MAYDAY・PAN-PAN の判断と通報）→ comm.nordo（無線の故障と灯火信号）の順にすると「助けを求める → 無線が使えない」の流れになる。
  - comm.icao の「上達の練習法」は内容的に radio1 の radio.listen（聞き取りのコツ）か、章末の新 comm.practice が自然。
- **重複**
  - comm.sfb の「Class C の上に Orlando の Class B」は law.airspace の bk.key と同じ（book-2.js）。ここでは一言にして {ch:law} へ。
  - comm.xpdr の 7700・121.5 は emg.basic（book-3.js:190「MAYDAY ×3、トランスポンダー 7700（{ch:radio5}）」）・emg の不時着の表（121.5 / 7700）・nav の迷ったとき（book-4.js:107）と重なる。詳しい説明はここに 1 か所、ほかは参照に。
  - comm.icao の「チェアフライング」は sim 章（book-5.js のクイズ「チェアフライングとは？」）と重なる。
  - （ほか 2 件）
- **節ごとの問題（抜粋）**
  - `comm.ctaf`：目的の一文と図がない。いきなり 5 行の交信表（「出発：タキシーの前・滑走路に入る前」「到着：10 マイル手前」「ダウンウインド・ベース・ファイナルに入るとき」）で、初心者は場周のどこで言うのかを思い描けない。場周の基本（左回り＝14 CFR 91.126(b)、プロペラ機の場周高度 1,000 ft AGL＝AIM 4-3-3、ダウンウ…
  - `comm.ctaf`：「ここが大切」（bk.key）がない。CADET は箱がないと最初の 2 文を要点にするので、表の前置き文が読み上げられる。
  - `comm.ctaf`：「CTAF は UNICOM・MULTICOM（122.9）・時間外の管制塔の周波数など」— UNICOM（空港の民間の地上局。管制ではない）・MULTICOM・自己通報（返事は来ない前提）が説明されていない。CTAF をどこで調べるか（Chart Supplement・セクショナルチャートの記号）も「チャートと Chart Supple…
  - `comm.ctaf`：例文は AIM の “Strawn / Queen Air Seven One Five Five Bravo / Apache Two Two Five Zulu”、end matter は “Strawn traffic, Archer Seven Lima Alpha …”、radio.js の練習（r_ctaf_dw・r_ctaf…
  - （ほか 29 件）

### 書き直しの方針

章の順番は comm.ctaf → comm.xpdr → 新 comm.mayday → comm.nordo → comm.sfb → comm.icao → 新 comm.practice とする（id は変えない・消さない）。comm.ctaf は「管制塔がない＝誰も指示しない、だから自分で言う」を最初に述べ、場周の図（左回り・1,000 ft AGL・45° 進入）と通報地点を一枚で見せてから交信の型に進む。comm.xpdr はトランスポンダーの役目（コード＋高度、ADS-B Out、Class B・C と Mode C veil で必須）と squawk / ident を先に説明し、遭難・緊急の判断（AIM 6-1-2「不安を感じた時点で少なくとも urgency」）と通報の順番（AIM 6-3-2）は新しい節 comm.mayday（遭難・緊急の通報）に移して、例文の燃料を「分」に直す。comm.nordo は「まず操作の誤りを疑う → 7600 → VFR を保ちできるだけ早く着陸 → 灯火信号」を 1 本の流れ図にし、規則の根拠を 91.129(d)(2)・91.125・AIM 4-2-13・6-4 に正す。comm.sfb は FAA ページ（2026-06-02 更新）の日付を書き、正しい座標から描いた模式図（NOT FOR NAVIGATION）を最初に置き、塔の運用時間と CTAF 120.3・9R/27L の場周の向き・LAHSO（学生は受けない）・誤った滑走路への着陸の危険を加え、アプリ案内は bk.sim へ。comm.icao は違いの表を CAP 413 第 24 版に合わせて直し（line up、hold short、transition altitude の注記）、実名の 1 文と CAP 413 と「両方を知っておくと混乱しません。代表的な例」の文は CADET テストのため残す。練習法は新 comm.practice に移し、アプリ固有の手順は bk.sim に入れて、本文は誰でもできる方法（型の暗記・声に出す・本物の交信を聞く・チェアフライング）で書く。

節の最初の図（いちばん大事な図）：
- `comm.ctaf`：模式図（架空 Lakeside RWY 17・左場周・NOT FOR NAVIGATION）：場周（場周高度 1,000 ft AGL、ダウンウインドの中央へ 45° で進入）と、自己通報する地点に番号の吹き出し ①10 NM 手前 ②ダウ…
- `comm.xpdr`：トランスポンダーのコード表示を模した 4 枚の色カード（1200 VFR＝灰、7500 不法な干渉＝紫、7600 無線の故障＝黄、7700 緊急＝赤）と、下に小さく「コードを変えるときは 7x00 を通らない：2700 → 2200 → 7…
- `comm.nordo`：灯火信号の図：左に管制塔とライトガン、右に 6 行（緑の連続・緑の点滅・赤の連続・赤の点滅・白の点滅・赤緑の交互）。連続＝太い線、点滅＝破線の光で描き、各行に「地上の機」「飛行中の機」の意味（91.125 の表）。下に「応答：昼は翼を振る（…
- `comm.sfb`：模式図（NOT FOR NAVIGATION・北が上）：FAA の滑走路端の座標から描いた 9L/27R（北・11,002 ft）・9C/27C（中・3,578 ft）・9R/27L（南・5,839 ft、進入端が東へずれている）と 18/…
- `comm.icao`：同じ場面を左右 2 列で比べるカード（左 FAA・右 英国 CAP 413）：周波数 121.7（point／decimal）、高度計（altimeter two niner niner two／QNH one zero one three…

### 図

今の図：`（なし）radio5 には FIG の図・表も写真もない` → redo、`FL.sanford.diagramSvg（sanford-course.js、FIG ではなくアプリの「Sanford の資料」ページの図）` → redo

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `ctafCalls` | `comm.ctaf` | 管制塔のない架空空港 Lakeside RWY 17 の左場周（北を上、滑走路は縦）と自己通報の 7 地点（10 NM 手前・ダウンウインド進入・ベース・ファイナル・滑走路を出た・タキシーの前・離陸／… | 通報地点：AIM 4-1-9（TBL 4-1-9・Recommended self-announce broadcasts）。場周高度 1,… | must |
| `squawkCodes` | `comm.xpdr` | 4 枚の色カード（1200 VFR・7500 不法な干渉・7600 無線の故障・7700 緊急）と「コードを変えるときは 7x00 を通らない：2700 → 2200 → 7200」の矢印、下に「Mo… | AIM 4-1-20（Code 1200・コード変更・自動高度報告）、AIM 6-2-2（7700）、AIM 6-4-2（7600）。 | must |
| `maydayCall` | `comm.mayday（新）` | 通報の順番を 1 本の帯にした図：①MAYDAY×3／PAN-PAN×3 ②相手 ③コールサイン・機種 ④状況 ⑤天気 ⑥意図と要求 ⑦位置と針路（迷ったら最後に分かった位置・時刻・針路）⑧高度 ⑨燃… | AIM 6-3-1（MAYDAY・PAN-PAN の優先）、6-3-2（要素と順番）、6-1-2（urgency の時点）。 | must |
| `lightGunSignals` | `comm.nordo` | 管制塔のライトガンから出る 6 種類の光（緑・赤・白、連続は実線、点滅は破線）と、地上の機／飛行中の機の意味を並べた図。下に応答のしかた（昼：翼を振る・地上はエルロン／ラダー、夜：着陸灯・航空灯の点滅… | 14 CFR 91.125 の表・AIM 4-3-13（TBL 4-3-13）・AIM 4-2-13。 | must |
| `nordoArrival` | `comm.nordo` | 受信機が故障したときの到着：Class D の地表区域（円柱）の外か上で使用滑走路を見極める → 機種・位置・高度・着陸の意図・灯火信号を頼むと送信 → 3〜5 マイルで位置を送り場周に入る → 管制… | AIM 4-2-13（Receiver inoperative・3 to 5 miles）、14 CFR 91.129(d)(2)。 | should |
| `sfbLayout` | `comm.sfb` | Sanford の滑走路の模式図（北が上・NOT FOR NAVIGATION・2026 年の FAA 資料による）：9L/27R・9C/27C・9R/27L・18/36 を実際の位置関係で、27C … | 滑走路端の座標と長さ：FAA データ（AirNav, FAA information effective 2026-10-01）。ARP か… | must |
| `sfbAirspace` | `comm.sfb` | 断面の模式図：Sanford の Class C（中心の円柱と外側の棚）の上に Orlando の Class B がかぶる様子。高度の数字は入れないか、最新のセクショナルチャートから取った値に「模式… | FAA From the Flight Deck: SFB（Class C underlies Orlando Class B）。高さの値を… | nice |
| `faaIcaoCompare` | `comm.icao` | 同じ場面の FAA と英国の言い方を左右 2 列に並べたカード（周波数・高度計・はい・どうぞ・タキシーの限界）。違う語だけ色を変える。 | AIM 4-2-8（POINT／ICAO は DECIMAL）、PCG（affirmative, go ahead）、CAP 413 Edi… | should |

### 写真

- `comm.nordo`：管制塔の中で管制官がライトガン（信号灯）を構える写真（顔が写っていないもの）（候補：https://www.robins.af.mil/News/Photos/igphoto/2000172985/ Public domain（米空軍の写真・ページに cleared for public release の表示）。顔の写り方は要確認）
- `comm.ctaf`：管制塔のない小さな空港の吹き流しと場周の向きを示すセグメントサークル（segmented circle）
- `comm.sfb`：Orlando Sanford International Airport の真上からの航空写真（平行滑走路と 18/36 が見えるもの）
- `comm.icao`：滑走路の停止位置標識（赤地に白文字の滑走路名の標識と、誘導路の黄色い停止線）
- **未入手**（2026-10-26）：管制塔のライトガン・セグメントサークル・Sanford の航空写真は、使える写真が見つからなかった（ライセンスが NC など）。図で代えた：`lightGunSignals`・`ctafCalls`・`sfbLayout`。停止位置の写真は第 9 章 `comm.mistakes` に入れた。

### 章末

- 確認問題：Q1（“Traffic in the area, please advise”）：keep — AIM 4-1-9 の文言と一致（“is not a recognized Self-Announce … phrase and should … / Q2（AIM 6-1-2 の urgency の時点）：keep — AIM 6-1-2 と一致。 / Q3（VFR で無線が故障：14 CFR 91.185）：fix — 91.185 は IFR の規則。問いを「VFR の天気で無線が使えなくなった。正しい対応は？（AIM 6-4・91.185(b) と同じ考え方）」にし、why に 76… / Q4（飛行中の緑の点滅）：keep — 91.125・AIM 4-3-13 と一致。
- 新しい問題の案：5 問（管制と交信している最中にエンジンが故障した。トランスポンダーのコードは？；PAN-PAN の通報で、残りの燃料はどう伝える？；管制塔のある空港へ向かう途中、受信機だけが故障したらしい。AIM の手順は？；Sanford（KSFB）の Hot Spot HS1 で取り違えやすいのは？；管制塔のない空港で VFR の直進着陸（straight-in）について AIM 4-1-9 が言っていることは？）
- 用語：非管制空港（Non-towered airport）：管制塔のない、または管制塔が閉まっている空港；CTAF（Common Traffic Advisory Frequency）：その空港の共通の交通情報周波数；UNICOM：空港の民間の地上局（管制ではない）；MULTICOM 122.9：地上局のない空港の自己通報の周波数；Self-announce：自己通報（返事を期待しない一方的な通報）；Traffic pattern altitude：場周高度（プロペラ機は地上 1,000 ft が推奨）；（ほか 14 件）
- 出典：add: AIM 4-2（4-2-8 の DECIMAL の注記・4-2-13 無線故障時の管制塔との交信）R.aim42 https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_2.html；add: AIM 6-1（6-1-2）と 6-2（6-2-1・6-2-2）https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap6_section_1.html / https://www.faa.gov/air_traffic/publica…；add: 14 CFR 91.125（灯火信号）・91.129(d)（Class D の無線故障）・91.185 — R.cfr91 https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91；add: FAA AC 90-66C Non-Towered Airport Flight Operations（2023-06-06）https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.informatio…；add: FAA Chart Supplement（d-CS）https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/dafd/ と d-TPP 空港図の検索 https://www.faa.gov/air_traffic/flight_…；（ほか 4 件）

## 第 12 章 `hf` 人間の能力と判断（ADM）（Human factors and aeronautical decision-making）

節：`hf.self` 自分の体調：IMSAFE・`hf.adm` 危険の評価と判断（PAVE・DECIDE・3P）・`hf.attitude` 5 つの危険な態度・`hf.body` 空間識失調・錯覚・低酸素・`hf.srm` 単独飛行の資源管理（SRM）とチェックリスト

### 今の問題

- **誤り**
  - hf.self：IMSAFE の「E：Emotion / Eating」→ FAA の E は Emotion（AIM 8-1-1 Personal Checklist・PHAK 第 2 章）（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap8_section_1.html）
  - hf.body：「前庭器官は、ゆっくりした回転や傾きを感じられません」→ 感じにくいのは、ゆっくり始まった変化と、同じ速さで続く回転（しばらくすると止まって感じる）（AIM 8-1-5・PHAK 第 17 章）（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap8_section_1.html）
  - hf.body：リーンズ「水平に戻すと逆に傾いたと感じる」→ AIM は「急に（abrupt）戻すと」（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap8_section_1.html）
  - refs：R.rmh の URL https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/risk-management-handbook-faa-h-8083-2a は 404 → 正しくは https://www.faa.gov/regulationspolicies/handbooksmanuals/risk-management-handbook-faa-h-8083-2a（FAA の Aviation Handbooks ページの…
- **数値の食い違い**
  - quiz.js:106-117（q_hf）は本文にない数字・用語を問う：91.211 の 14,000 ft 超（常に酸素）と 15,000 ft 超（全員に供給）、暗順応の約 30 分と視野の周辺で見ること、低酸素の種類（hypemic）、コリオリ錯覚（選択肢）。本文に足すか、問題を本文の範囲に合わせる（本文に足す方を勧める：どれも A…
  - hf.self：「bottle to throttle 8 時間は最低限」に AIM 8-1-1 の推奨値（12〜24 時間）が書かれていない。
  - hf 章末クイズ Q3 の選択肢「自動運動」は本文で説明されていない。
  - （ほか 1 件）
- **わかりにくい**
  - hf.self：bk.key「体調の不調は「準備に始まり準備に終わる」の最初の確認項目」— 何を指すか分からない（intro の ANA の記事の引用）。
  - hf.adm：「3P：Perceive（危険に気づく）→ Process（…）→ Perform（…）。DECIDE：Detect（…）、Estimate（…）、Choose（…）、Identify（…）、Do（実行）、Evaluate（評価）。」— 2 つのモデルの違い（3P は出発前から飛行中まで続ける危険の管理、DECIDE は変化…
  - hf.body：「墓場のスパイラル：ゆっくりした旋回に慣れて水平だと感じ…」— なぜ慣れるのか（三半規管の液が追いつく）が説明されていない。
  - （ほか 2 件）
- **順番**
  - hf.self（体調）→ hf.adm（危険の評価）→ hf.attitude（態度）→ hf.body（体）→ hf.srm の順で、「体」の話が hf.self と hf.body に分かれている。hf.self → hf.body → 新 hf.altitude → 新 hf.vision →（ここから判断）hf.adm → hf.…
  - ifr.scan（book-4.js:143）と ifr.upset（book-4.js:163）が hf.body を参照しているので、hf.body の空間識失調の説明は計器飛行の章より前（今の Part 1）に残す。
- **重複**
  - hf.adm の FIG.tem は crm.tem（book-5.js:118）と同じ図。hf からは外し、{ch:crm} への参照にする。
  - hf.srm の Aviate → Navigate → Communicate は emg.basic（book-3.js:188）・radio.technique（book-comm.js）と重複。
  - hf.body の「VFR で雲に入らない」は wx 章の bk.key（book-2.js:22「VFR の操縦士が雲に入るのは重大事故の典型（空間識失調）」）と重複。参照でつなぐ。
  - （ほか 1 件）
- **節ごとの問題（抜粋）**
  - `hf.self`：目的の一文がなく、表と bk.key だけ。「なぜ自分を点検するのか」— AIM 8-1-1 の Personal Checklist：事故統計では、操縦士の不調が原因の事故は機体の故障よりずっと多い — を最初に言うと初心者に伝わる。
  - `hf.self`：「E：Emotion / Eating（感情・食事）」— FAA（AIM 8-1-1・PHAK 第 2 章）の IMSAFE の E は Emotion。Eating は FAA 以外の言い方。E は Emotion と教え、食事と水分は ACS PA.I.H.K1i「Dehydration and nutrition」と PHAK 第 …
  - `hf.self`：A の行は正しいが、AIM 8-1-1 の数字が抜けている：8 時間たっても影響が残ることがあるので「bottle to throttle は 12〜24 時間」が良い目安、ビール 1 本でも技量が落ち、少なくとも 3 時間は呼気・血液から検出される、二日酔いも危険。本文の「（「bottle to throttle 8 時間」は最低限）」…
  - `hf.self`：M の行「眠くなる薬・判断に影響する薬を飲んでいないか（市販薬も）」— 91.17(a)(3)（判断を損なう薬の使用中は乗務できない）と 61.53（自分で知っている病気・治療で身体検査の基準を満たさないときは機長として飛べない）、AIM の「いちばん安全なのは、FAA の承認がない限り薬を飲んでいるときは飛ばないこと」を書く。抗ヒスタミ…
  - （ほか 30 件）

### 書き直しの方針

id は変えずに、体の話を先、判断の話を後にする：hf.self（IMSAFE と飲酒・薬・病気の規則）→ hf.body（3 つの感覚と空間識失調・錯覚）→ 新 hf.altitude（高度と体：低酸素の 4 種類・91.211 の 3 段階と AIM の推奨・過呼吸・一酸化炭素・耳と副鼻腔・スキューバの後の待ち時間）→ 新 hf.vision（見ること：暗順応・視野の周辺で見る・10° ずつ 1 秒の見張り・衝突する機は止まって見える・着陸の錯覚は hf.body から移すか参照）→ hf.adm → hf.attitude → hf.srm。各節の最初に「なぜ大切か」を一文で書き、ACS PA.I.H.K1 の 12 項目（hypoxia から scuba まで）をこの章のどこかで必ず扱う（脱水と熱中症はフロリダの訓練に直結するので hf.self か hf.altitude に）。hf.adm は 3P の輪（PAVE・CARE・TEAM）とリスクマトリクスを図にし、DECIDE は「飛行中に変化が起きたとき」の手順として別の段落に分ける。TEM の図は hf から外して crm.tem だけに残し、ここでは「チームでの考え方は {ch:crm}」と参照する。hf.attitude は英語の原文と短い場面例を表に加え、bk.key を 2〜3 項目に。hf.srm は PHAK の SRM の定義と sterile flight deck（GA でも勧められている）を出典どおりに書き、Aviate → Navigate → Communicate は {ch:emg} を参照して短くする。quiz.js q_hf が問う内容（91.211 の 3 段階、暗順応、hypemic、コリオリ）はすべて本文に入れる。

節の最初の図（いちばん大事な図）：
- `hf.self`：IMSAFE のカード：6 つの文字と短い問い（I 病気は？ M 薬は？ S ストレスは？ A 飲酒は？ F 疲れは？ E 気持ちは？）。A の横に飲酒のタイムライン（0〜8 時間＝規則で乗務禁止 91.17、8〜24 時間＝AIM は量に…
- `hf.adm`：3P の輪（Perceive → Process → Perform → また Perceive）。各段階の横に使う道具を書く：Perceive＝PAVE（Pilot・Aircraft・enVironment・External pressu…
- `hf.attitude`：5 枚のカードを横に並べた図：上に吹き出しの「心の声」（日本語＋英語）、下に緑の「解毒剤」（日本語＋英語）。例：衝動 “Do it quickly.” → “Not so fast. Think first.”
- `hf.body`：三半規管の模式図：旋回が始まるとリンパ液が遅れて毛が倒れる（回っていると感じる）→ 同じ速さで続くと液が追いつき毛が戻る（止まっていると感じる）→ 急に水平に戻すと逆に倒れる（反対に回っていると感じる）の 3 コマ。下に「外が見えないときは…
- `hf.srm`：単独の操縦士を中心に、使える資源を周りに並べた図（管制・FSS／Flight Service・チェックリスト・自動化（G1000 型・自動操縦）・POH・自分の知識・同乗者）。外側に優先順位の帯 Aviate → Navigate → Co…

### 図

今の図：`tem` → fix

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `imsafeCard` | `hf.self` | IMSAFE の 6 項目のカード（文字・英語・日本語の問い）と、A の横の飲酒タイムライン（0〜8 h 規則で禁止／〜12〜24 h AIM の推奨／0.04 以上も禁止）。 | 14 CFR 91.17(a)、AIM 8-1-1（Personal Checklist・Alcohol：12 to 24 hours、on… | must |
| `threePLoop` | `hf.adm` | 3P の輪（Perceive → Process → Perform）と各段階の道具（PAVE・CARE・TEAM）。PAVE の 4 枚は文字と例（Pilot：IMSAFE・経験、Aircraft：… | PHAK 第 2 章（Figure 2-7 PAVE、3P model・CARE・TEAM）。 | must |
| `riskMatrix` | `hf.adm` | 4×4 のリスクマトリクス（起こりやすさ：Probable・Occasional・Remote・Improbable × 重大さ：Catastrophic・Critical・Marginal・Negl… | PHAK 第 2 章 Figure 2-5 とその例（likelihood occasional, severity catastrophi… | should |
| `hazardousAttitudes` | `hf.attitude` | 5 枚のカード：危険な態度（日本語・英語）、心の声の吹き出し（“Don't tell me.” など）、緑の解毒剤（“Follow the rules. They are usually right.… | PHAK 第 2 章 Figure 2-4（英文はそのまま）、Risk Management Handbook。 | should |
| `vestibular` | `hf.body` | 三半規管の 3 コマ（旋回の始まり：液が遅れて回っていると感じる／一定の旋回：液が追いつき止まっていると感じる／急に水平へ：逆に回っていると感じる＝リーンズ・墓場のスパイラル）。 | PHAK 第 17 章 Figure 17-3（三半規管）と本文、AIM 8-1-5（the leans・graveyard spiral）… | must |
| `landingIllusions` | `hf.body` | 正しい進入角（3°・PAPI）と、錯覚で低くなる進入（細い滑走路・上り坂・暗い地域／水面・雨の風防・もや）、高くなる進入（広い滑走路・下り坂・明るい灯火）を左右に並べた断面図。模式図。 | AIM 8-1-5 Illusions Leading to Landing Errors、PHAK 第 17 章。 | must |
| `hypoxiaAltitudes` | `hf.altitude（新）` | 縦の高度の物差し：5,000 ft（夜間視力が落ち始める・夜は酸素を推奨）、10,000 ft（昼は酸素を推奨）、12,500〜14,000 ft（乗員は 30 分を超える分に酸素）、14,000 f… | 14 CFR 91.211(a)、AIM 8-1-2（5,000 / 10,000 ft の推奨、18,000 ft で 20〜30 分）、… | must |
| `scanPattern` | `hf.vision（新）` | 前方の空を 10° ずつの区画に分け、各区画を少なくとも 1 秒見る見張りの図。中心窩だけがはっきり見えること、衝突する相手は窓の中で止まって大きくなるだけ、を小さな絵で。 | AIM 8-1-6（10 degrees・at least 1 second・7 miles vs 7/10 mile）、AIM 8-1-8… | should |
| `srmResources` | `hf.srm` | 単独の操縦士を中心に資源（管制・FSS・チェックリスト・POH・自動化・知識・同乗者）を並べ、外側に Aviate → Navigate → Communicate の帯。 | PHAK 第 2 章 Single-Pilot Resource Management。 | nice |

### 写真

- `hf.body`：空間識失調の体験装置（回転いす・シミュレーター）や FAA CAMI の訓練施設
- `hf.vision（新）`：国際宇宙ステーションから見た夜のフロリダ中部（オーランドの街の灯と真っ暗な大西洋）
- `hf.altitude（新）`：指先に付けるパルスオキシメーター
- `hf.altitude（新）`：高度訓練室（altitude chamber）での訓練の様子（マスク着用・顔が判別できないもの）
- `hf.adm`：フロリダの夏の積乱雲（雷雨）

### 章末

- 確認問題：Q1（不死身の解毒剤）：keep — PHAK Figure 2-4（“It could happen to me.”）と一致。q_hf の問題とほぼ同じなので、章末は別の態度（例：衝動）にしてもよい。 / Q2（PAVE の E）：keep — why を PHAK の言葉（ほかのすべての危険を無視させてしまう要因）に。 / Q3（リーンズ）：fix — 問いを「ゆっくり傾いたあと、急に翼を水平に戻すと、逆に傾いたように感じる錯覚は？」に（AIM 8-1-5 の abrupt）。選択肢の「自動運動」は本文で説明するか、本文にある「墓場のスパイラル」に替える。
- 新しい問題の案：5 問（14 CFR 91.17 の飲酒の規則として正しいものは？；PHAK の 3P モデルの正しい順番は？；ヒーターを使っていたら頭痛と眠気がしてきた。まずすることは？；AIM 8-1-6 が勧める見張りのしかたは？；減圧停止の必要がないスキューバダイビングの後、8,000 ft 以下を飛ぶまでの推奨の待ち時間は？）
- 用語：IMSAFE：自分の点検（Illness・Medication・Stress・Alcohol・Fatigue・Emotion）；ADM（Aeronautical Decision-Making）：航空の意思決定；PAVE：危険を見つける 4 つの分野（Pilot・Aircraft・enVironment・External pressures）；3P（Perceive・Process・Perform）：危険に気づく・評価する・対策する；CARE / TEAM：危険の評価（Consequences・Alternatives・Reality・External factors）／対策（Transfer・Eliminat…；DECIDE：変化が起きたときの判断の 6 段階；（ほか 14 件）
- 出典：fix: R.rmh の URL → https://www.faa.gov/regulationspolicies/handbooksmanuals/risk-management-handbook-faa-h-8083-2a（今の URL は 404）；add: AIM 第 8 章 Medical Facts for Pilots（8-1-1〜8-1-8）https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap8_section_1.html；add: PHAK 第 2 章 Aeronautical Decision-Making https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/chapter-2-aeronautical-decision-making と 第 1…；add: 14 CFR 61.53（病気・治療中の乗務の禁止）R.cfr61 https://www.ecfr.gov/current/title-14/section-61.53、14 CFR 91.17・91.211 https://www.ecfr.gov/current/title-14/section-91.…；add: FAA Private Pilot ACS（FAA-S-ACS-6C）Area I Task H Human Factors（PA.I.H）R.acsP；（ほか 2 件）

## 第 13 章 `ground` 飛行前の準備・点検・地上での操作

節：`ground.walk` 外部点検（walk-around）・`ground.start` エンジン始動とタキシー・`ground.runup` ランナップと離陸前の確認

### 今の問題

- **誤り**
  - ground.walk key: 燃料のタンク目視の根拠として 「14 CFR 91.103」 → 91.103 covers weather, fuel requirements, runway lengths and takeoff/landing distance data; the PIC's duty to determine the aircraft is in condition for safe flight is 14 CFR 91.7(b) (https://www.ecfr.gov/curre…
  - ground.walk table: pitot listed with the tail (「ピトー・尾翼」) → the checklist lists 'Pitot Mast — REMOVE COVER, HOLES CLEAR' under LEFT WING (https://www.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Archer_Checklist.pdf p.1).
- **古い**
  - None of the cited editions is outdated: AFH FAA-H-8083-3C, PHAK FAA-H-8083-25C and Private ACS FAA-S-ACS-6C are the editions listed on faa.gov today (checked 2026-10-26).…
  - Fuel: 100LL is still the standard avgas and the FAA requires airports to keep it during the unleaded transition; unleaded fuels (e.g. GAMI G100UL by STC) exist and the 20…
- **数値の食い違い**
  - Takeoff briefing uses AR.rotate 60 and AR.y 76 (FL.physics pa28.v) — matches the MGA checklist (Normal takeoff: rotate 60, climb 76). OK.
  - Walk-around values (main strut 4.5 in, nose strut 3.25 in, oil minimum 6 qt), runup (2,000 rpm; mags 175/50; carb heat 75 rpm; idle then 1,000 rpm) and after-start 800–1,…
  - Oil-pressure time missing in the book but present in CADET (cadet/src/content/checklists-archer.js:29 「30 秒以内に上がる」) and in AFH 3C ch. 2 — add 30 s to the book.
  - （ほか 1 件）
- **わかりにくい**
  - ground.walk: 30+ checklist items in one table with no picture of the airplane — a cadet who has never seen a PA-28 cannot locate 「主脚の緩衝支柱」「燃料ストレーナー」「スタビレーター」.
  - ground.start: 「衝突防止灯 ON」 — say 「衝突防止灯（ストロボ）」; the checklist item is 'Strobe Lights'.
  - ground.start: 「前輪の向きはラダーペダルで変える」 is right, but brakes (toe brakes) are never explained — beginners do not know the top of the pedals are the brakes.
  - （ほか 2 件）
- **順番**
  - ground.start packs start + taxi + wind table + hold-short rule; split the taxi into a new section ground.taxi (new id) placed between ground.start and ground.runup.
  - Inside ground.runup the takeoff briefing comes after the table; keep it, but move the magneto figure to the top (first SVG = most important for CADET).
- **重複**
  - ground.start hold-short rule overlaps comm.dep (book-comm.js:248 「taxi via Alpha は滑走路の手前まで」) — keep the rule in one place (comm.dep) and cross-reference.
  - ground.runup takeoff briefing (engine failure after takeoff: land ahead, no turn back) overlaps emg.abort / emg.engine (book-3.js:193–211) and ops.takeoff — keep the brie…
  - Fuel colours/100LL also in quiz.js q_sys (line 29) and the sys chapter — keep wording consistent (100LL = blue).
- **節ごとの問題（抜粋）**
  - `ground.walk`：The whole section is one dense 3-column table: at 390 px it is ~725 px tall with 30+ items joined by 「・」 (measured with flight-lab/src/style.css). A beginner cannot pictu…
  - `ground.walk`：Row 「ピトー・尾翼」 regroups the checklist wrongly: in the MGA checklist the 'Pitot Mast — REMOVE COVER, HOLES CLEAR' item is under LEFT WING (the PA-28 pitot is under the left …
  - `ground.walk`：Key point 「燃料は燃料計だけを信じず、タンクを目で見て確かめる（14 CFR 91.103：飛行前に必要な情報を知る）」 mis-cites the rule: 91.103 is about weather, fuel requirements, runway lengths and takeoff/landing dista…
  - `ground.walk`：Cabin row 「書類が機内にある・操縦輪が自由」 does not say WHICH documents or that the control lock is removed. Name them simply (耐空証明・登録証明・重量重心・POH; 14 CFR 91.203 / 91.9) and say 「操縦輪のロック…
  - （ほか 20 件）

### 書き直しの方針

Keep the three sections in their order and add one new section ground.taxi (タキシー：速さ・ブレーキ・風・停止線) between ground.start and ground.runup, so start and taxi each get a clear first figure. Open every section with a one-line purpose (bk.aim) and put the most important drawing first: the walk-around route (ground.walk), the start flow (ground.start), the wind/control diagram (ground.taxi) and the magneto-check chart (ground.runup). Replace the long 「・」 tables by numbered steps of ≤ 7 items, each with a short 'why'; keep only the checklist values a cadet must remember (6 qt, 4.5/3.25 in, 1,000 rpm + oil pressure within 30 s, 2,000 rpm, 175/50 rpm, carb heat drop) and label them 「訓練校のチェックリストの値（例）・実機は POH と学校のチェックリスト」. Explain first WHY the walk-around matters (the PIC decides the airplane is safe: 14 CFR 91.7) and only then the items; fix the 91.103 citation. Move the hold-short rule wording to match comm.dep (towered airports: 91.129(i), AIM 4-3-18) and keep the takeoff briefing consistent with emg.engine (straight ahead, shallow turns, no low turn-back). Keep the public-checklist disclaimer and the simulator note, but split the ANA/Acron sentence from the POH safety sentence (CADET drops the whole sentence). Do not reproduce the checklist layout itself, so the page never looks like a school's official manual.

節の最初の図（いちばん大事な図）：
- `ground.walk`：Top view of the Archer (outline from FL.physics pa28 geometry) with the walk-around route as numbered arrows ①操縦席 → ②右翼 …
- `ground.start`：If the section is split: a start-sequence flow (3 boxes 始動前 → 始動 → 始動後) with the 4 life-saving items highlighted — ブレーキを…
- `ground.runup`：Magneto-check bar chart (data: MGA checklist RUNUP at 2,000 rpm, max drop 175, max difference 50): BOTH 2,000 rpm, then …

### 図

今の図：`(bk.t table) ground.walk 場所／主な確認／なぜ` → redo、`(bk.t table) ground.start 風／タキシー中の操縦輪` → redo、`(bk.t table) ground.runup 項目／チェックリスト／何を見ているか` → fix

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `walkaroundRoute` | `ground.walk` | Top view of the Archer with the route ①操縦席 → ②右翼 → ③機首 → ④左翼 → ⑤胴体・尾翼 as numbered arrows (counter-cl… | Order and values: MGA Archer III checklist p.1 (R.archerCk). Outline p… | must |
| `fuelSample` | `ground.walk` | A fuel-tester cup: blue 100LL with clear water beads sitting at the bottom and a speck of sediment; … | AFH 3C ch. 2 (fuel colours, water beads, keep sampling until clear); M… | should |
| `startSequence` | `ground.start` | Three-box flow 始動前 → 始動 → 始動後 with the critical items highlighted: EMERG BATT ARM → 予備計器・PFD 確認 → BA… | MGA checklist p.2 (BEFORE START / STARTING ENGINE / AFTER STARTING ENG… | must |
| `taxiWind` | `ground.taxi (new) — or ground.start if not split` | AFH Figure 2-15 redrawn: the airplane from above in the centre, wind arrows from the 4 quadrants; fo… | AFH 3C ch. 2 text and Figure 2-15 (control positions of the nosewheel … | must |
| `holdShortMarking` | `ground.taxi (new) — or ground.start` | Plan view of a taxiway meeting a runway: runway holding position marking (two solid + two dashed yel… | AIM 2-3-5 (holding position markings), AIM 2-3-8 (mandatory instructio… | should |
| `magCheck` | `ground.runup` | Bar chart at 2,000 rpm: BOTH, L, R for an OK case (−120/−150, 差 30) and a NOT-OK case (−100/−200); r… | MGA checklist RUNUP: 2,000 rpm, max drop 175 rpm, max difference 50 rp… | must |
| `runupPosition` | `ground.runup` | Small plan view of the run-up pad beside the hold line: airplane nose into the wind, prop blast arro… | AFH 3C ch. 2 (before-takeoff check: into the wind, firm surface, prop … | nice |
| `takeoffBriefingFlow` | `ground.runup` | Decision strip for the spoken briefing: 滑走中の異常 → スロットル アイドル・まっすぐ止まる ／ 浮揚後・滑走路が残る → 降りる ／ 残らない → 76 k… | MGA checklist ENGINE FAILURE DURING TAKEOFF (76 KIAS, shallow turns); … | nice |

### 写真

- `ground.walk`：A light aircraft's fuel being sampled into a clear fuel tester (hands only, no faces), or a close-up of a tester cup wit…
- `ground.walk`：Pitot tube with a red 'REMOVE BEFORE FLIGHT' cover under a low wing
- `ground.walk`：AVGAS vs jet-fuel filler nozzles (straight vs flared) — FAA handbook photo（候補：https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/03_afh_ch2.pdf US government work (FAA handbook) — public domain; check the figure carries no third-party credit）
- `ground.walk`：Side view of a Piper PA-28-181 Archer on the ramp (stabilator and low wing visible; no school/airline livery, no faces)
- `ground.taxi (new) / ground.start`：Runway holding position marking with the red runway sign at a taxiway

### 章末

- 確認問題：Q1 (magneto limits): keep — matches the MGA checklist; the 'no drop is also abnormal' reason is good (say 'grounding fau… / Q2 (tailwind taxi): keep; reason could quote AFH wording 「風上側のエルロンを下げ、昇降舵を下げる（操縦輪を前へ）」. / Q3 (first instrument after start = oil pressure): keep; add 「30 秒以内」 to the reason (AFH 3C ch. 2).
- 新しい問題の案：4 問（燃料のサンプで、カップの底に透明な玉がいくつか沈んでいた。正しい対応は？；管制塔のある空港で「Runway 36, taxi via Alpha」と言われた。滑走路 36 の手前の停止線では？；ランナップでキャブレターヒーターを ON にした。回転が少し落ちた理由は？；タキシー中に速さを調節する正しい方法は？）
- 用語：Airworthy / 耐空性がある（型式どおりで安全に飛べる状態）／14 CFR 3.5・91.7；Preflight inspection / Walk-around / 飛行前点検・外部点検（keep）；Fuel sump / Drain / 燃料のサンプ（水の抜き取り）（keep）；Fuel strainer (gascolator) / 燃料ストレーナー（機首の下の水抜き）；Strut / 緩衝支柱（脚のショック）；Stabilator / スタビレーター（全体が動く水平尾翼）；（ほか 10 件）
- 出典：Keep R.archerCk (MGA Archer III G1000 checklist, 2025; file unchanged — footer 09012025.final.npc) https://www.mga.edu/aviation/knight-flight/aircraft-informati…；Keep R.afh but add the chapter link: AFH 3C Chapter 2 Ground Operations https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/…；Add Private Pilot ACS FAA-S-ACS-6C, Area II Preflight Procedures (PA.II.A–F) https://www.faa.gov/training_testing/testing/acs/private_airplane_acs_6.pdf；Add 14 CFR 91.7 (airworthiness; PIC determines condition for safe flight) https://www.ecfr.gov/current/title-14/section-91.7；Add 14 CFR 91.129(i) (taxi clearance at towered airports) https://www.ecfr.gov/current/title-14/section-91.129；（ほか 3 件）

## 第 14 章 `ops` 基本操縦：姿勢・出力・トリムと空中操作

節：`ops.trim` 姿勢＋出力＝性能、そしてトリム・`ops.sl` 直線水平飛行・`ops.climb` 上昇・降下・レベルオフ・`ops.turns` 旋回と急旋回・`ops.slow` 低速飛行と失速の練習・`ops.ground` 対地目標操作（風の中で地面に対して飛ぶ）

### 今の問題

- **誤り**
  - ops.slow: 「FAA の覚え方は PARE」 → AFH FAA-H-8083-3C ch. 5 presents a six-step spin recovery template (Fig. 5-17: power idle; ailerons neutral; full opposite rudder; positive, brisk forward elevator; neutralise rudder when rotation stops; return to level flight); 'P…
  - ops.sl table: 「この教材の「精度」 ±50 ft・±5°・±5 kt」 → the app's precision level is 0.6 × basic = ±60 ft・±6°・±6 kt (flight-lab/src/school.js:28; grading at school.js:326-328).
  - ops.trim table vs the flight model (FL.physics.steadyState, 3,000 ft): Vy pitch +7〜9° → ≈ +10°; descent 100 kt −2〜−3° → −1.3°; approach flaps 40° 1,500 rpm → ≈ 2,060 rpm (55%); cruise 「スロットル 79%」 → 76% (79% is AR.cruiseThr, not the steady-state throttle).
- **古い**
  - None: Private ACS FAA-S-ACS-6C and Commercial ACS FAA-S-ACS-7B (both Nov 2023, effective 31 May 2024) are the editions listed on faa.gov on 2026-10-26; AFH FAA-H-8083-3C …
- **数値の食い違い**
  - ops.trim (book-3.js:63) vs FL.physics.steadyState pa28 (altFt 3000; sea level in brackets): cruise 110 kt level → thr 76% (68%), 2,401 rpm (2,353), pitch +0.6°; Vy 76 kt …
  - Vy rotation/climb pitch: syllabus.js takeoffRoll 「機首上げ 約 8〜10°」 and ops.takeoff 「約 8〜10°」 agree with the model (~10°); only ops.trim says +7〜9°.
  - ops.sl correction rule 100 ft → 1–2° vs school.js:47 / syllabus a2 brief 50 ft → 1–2°.
  - （ほか 6 件）
- **わかりにくい**
  - ops.trim key 1 parenthesis 「（安定した状態では両方が関係する）」 leaves a beginner unsure which control does what.
  - ops.turns key 2 promises a sight picture 「機首が水平線のどこにあるか」 but never gives it.
  - ops.slow 「ピッチと出力の関係が逆に感じる（後退側）」 — 'reversed' what? Explain with the AFH wording or the app's 「速度は機首、高度はパワー」.
  - （ほか 2 件）
- **順番**
  - ops.slow mixes slow flight, two stall types, recovery and spin; split stalls into a new section ops.stall (new id) after ops.slow so each has its own first figure.
  - Inside ops.turns put the normal-turn technique first, then the steep turn with its figure; drop the duplicated turnTable (link aero.turn).
  - The ACS Vy +10/−5 key in ops.climb belongs to ops.takeoff (tl chapter); move/drop.
- **重複**
  - FIG.turnTable shown in both aero.turn and ops.turns (identical).
  - Stall recovery steps and the Archer spin-recovery list appear in aero.stall and ops.slow — keep the physics/cues in aero.stall, the procedure in ops.slow/ops.stall.
  - Rollout lead 「バンク角の半分」 in aero.turn and ops.turns — fine to repeat once, but keep the same wording.
  - （ほか 2 件）
- **節ごとの問題（抜粋）**
  - `ops.trim`：The attitude/power table is hard-coded text (only the speeds come from AR) and several values contradict the flight model's own steady states (FL.physics.steadyState, pa2…
  - `ops.trim`：No figure: the core idea (same airplane, 4 attitude+power pairs → 4 performances) is visual. CADET shows nothing on the classroom screen.
  - `ops.trim`：Key 1 「速度は主にピッチで、上昇・降下は主に出力で（安定した状態では両方が関係する）」 — the parenthesis confuses beginners; AFH 3C ch. 3 simply says climb at fixed climb power and control airspeed with pitch; …
  - `ops.trim`：「見る → 変える → 待つ → 確かめる → トリム」 is good but not tied to AFH: AFH 3C ch. 3 — establish the attitude, hold it with control pressure, then trim the pressure out; 'attempting to…
  - （ほか 36 件）

### 書き直しの方針

Keep the order trim → sl → climb → turns → slow → ground and add one new section ops.stall (失速と回復・スピンの知識) right after ops.slow, so slow flight and stalls each get a first figure; leave ops.slow's id and its bk.sim (a6) in place and move the a7/a8 buttons and the recovery/spin text to ops.stall. Open the chapter with the four components of attitude control (pitch, bank, power, trim — AFH 3C ch. 3) and the 4-state attitude+power figure computed from FL.physics.steadyState at 3,000 ft, so every later number in the chapter comes from the same model the lessons grade. Explain each maneuver as: purpose → figure → 3–6 numbered steps → the ACS tolerance (Private only; one sentence for Commercial) → the course's teaching value (labelled, matching syllabus.js/school.js) → ここが大切. Cut the duplicated turnTable (link aero.turn), the ACS Vy key (lives in ops.takeoff) and the second copy of the spin procedure (keep one, attributed correctly to the checklist and AFH 3C Fig. 5-17; drop 'FAA の覚え方は PARE'). Fix the levels table (±150/±100/±60 …) and move it into the bk.sim box; keep keys and app defaults (pitch/bank hold, auto-rudder ON, level 導入) only in bk.sim / mute paragraphs. In ops.ground add three plan-view figures (turns around a point first, then rectangular course and S-turns) with the ACS entry rules and AFH safety numbers. Keep 「実機は POH/AFM が優先」 for every speed and the note that spins are practised only with an instructor in an approved airplane.

節の最初の図（いちばん大事な図）：
- `ops.trim`：「同じ飛行機・4 つの姿勢と出力」: four small side views of the Archer on one horizon line — 巡航 110 kt: ピッチ +0.6°・出力 76%（≈2,400 rpm）・0 f…
- `ops.sl`：Sight picture over the cowling (drawing, not a photo of instruments): the horizon line a fixed gap above the cowling top…
- `ops.climb`：Altitude–time profile: climb at Vy ≈ 660 fpm (steadyState at 3,000 ft) toward 4,000 ft, the level-off starting ≈ 66 ft (…
- `ops.turns`：Steep turn (45°) from the cockpit and from behind: left — the horizon tilted 45° across the cowling with the nose refere…
- `ops.slow`：If ops.stall is created: here a slow-flight speed band (a vertical speed scale, NOT an instrument photo): Vso 45 / Vs1 5…
- `ops.ground`：Turns around a point, plan view (模式図): a circle of radius 1,200 ft around a point, wind 15 kt from the left, TAS 90 kt; …

### 図

今の図：`turnTable` → fix、`(bk.t table) ops.trim 教材の Archer ピッチ／出力／結果` → redo、`(bk.t table) ops.sl 基準／高度／針路／速度` → fix、`(bk.t table) ops.turns 課目／内容／ACS の許容幅` → fix、`(bk.t table) ops.slow 課目（自家用 ACS）／許容幅・条件` → fix、`(bk.t table) ops.ground 操作／内容` → replace-by-photo

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `attitudePower` | `ops.trim` | Four side views of the Archer on one horizon: cruise / Vy climb / 90 kt descent / approach flaps 40°… | FL.physics.steadyState(newState pa28, kt, fpm, {altFt:3000, pwr / flap… | must |
| `trimSteps` | `ops.trim` | Small 5-step strip 見る → 変える → 待つ（数秒）→ 確かめる → トリム, with a yoke-force arrow that disappears at the tri… | AFH 3C ch. 3 (establish attitude, hold pressure, then trim; flying wit… | nice |
| `levelSightPicture` | `ops.sl` | Over-the-cowling view: horizon gap above the cowling for level; insets for climb/descent; wingtips e… | AFH 3C Figs. 3-6, 3-7, 3-8 (nose and wingtip references); 90% outside … | must |
| `levelOffLead` | `ops.climb` | Altitude–time profile for climb → level-off (lead 10% of VS) → accelerate → cruise power → trim, and… | AFH 3C ch. 3 p. 3-19 (10% rule, 500 fpm → 50 ft) and descent level-off… | must |
| `vxVyPaths` | `ops.climb` | Two climb paths over an obstacle: Vx 64 kt (steeper path) and Vy 76 kt (more height per minute); lab… | FL.physics.steadyState full power: sea level Vx 694 fpm (≈ 651 ft/NM) … | nice |
| `steepTurn` | `ops.turns` | Cockpit view at 45° bank (horizon tilted across the cowling, nose reference on the horizon) + rear v… | FL.physics pa28.v (s1 50, va 113); MGA checklist (Va 89 @ 1,917 lb); A… | must |
| `rolloutLead` | `ops.turns` | Top view of a 360° turn: entry heading, rollout begun 15° early for 30° bank and ≈ 20–22° early for … | AFH 3C ch. 3 (lead by one-half the bank angle); ACS 6C PA.V.A.S5 (roll… | should |
| `slowFlightBand` | `ops.slow` | Vertical speed scale (drawing, not a PFD photo) for the course Archer: Vso 45 / Vs1 50 (teaching val… | FL.physics pa28.v (s0 45, s1 50, appr 70, y 76); stall warning α > α_s… | must |
| `stallRecoveryTemplate` | `ops.stall (new) — or ops.slow` | Four numbered boxes with a side-view airplane: ①機首を下げて迎え角を減らす（警報が止まるまで）②翼を水平（ボールはラダーで）③出力（必要なだけ）④速度が… | AFH 3C ch. 5 Fig. 5-10 and text (single-engine trainer uses 4 of the 6… | must |
| `spinRecoverySteps` | `ops.stall (new) — or ops.slow` | Six small icons for AFH Fig. 5-17 (idle, ailerons neutral, full opposite rudder, brisk forward eleva… | AFH 3C ch. 5 (six-step spin recovery); MGA checklist SPIN RECOVERY. | should |
| `turnsAroundPoint` | `ops.ground` | Plan view, 模式図: circle r = 1,200 ft around a point, wind 15 kt, TAS 90 kt; groundspeed and bank at d… | Computed: tanφ = GS²/(11.26·r); AFH 3C ch. 7 (steepest bank downwind, … | must |
| `rectangularCourse` | `ops.ground` | Field rectangle with the ground track parallel to its sides, crab angles on the crosswind legs (≈ 10… | ACS 6C PA.V.B.S3a; AFH 3C Fig. 7-4; WCA = asin(15/90) ≈ 9.6°. | should |
| `sTurns` | `ops.ground` | Road as reference line, two semicircles of equal radius, bank steepest when heading downwind, revers… | ACS 6C PA.V.B.S3b/S5; AFH 3C Fig. 7-6. | should |

### 写真

- `ops.sl`：View from a light aircraft's cockpit over the cowling to a clear horizon in level flight (glareshield visible, no instru…
- `ops.ground`：Aerial view of rectangular farm fields and straight country roads (typical ground-reference practice area)
- `ops.slow`：Stall-warning lift detector vane on the leading edge of a PA-28 wing (close-up)
- `ops.turns`：A light single-engine aircraft photographed in a steep bank (air-to-air, no airline/school livery)

### 章末

- 確認問題：Q1 (level-off at 5,500 ft from 700 fpm): fix — same item as quiz.js:121 (q_ops, 4,500 ft). Change it to a descent (500 f… / Q2 (ACS steep-turn tolerances): keep — matches ACS 6C PA.V.A.S5 / 7B CA.V.A.S5. / Q3 (first action in stall recovery = reduce AOA): keep — AFH 3C Fig. 5-10.
- 新しい問題の案：4 問（バンク 45° の急旋回から、元の針路 360° で翼を水平に戻したい。戻し始める目安は？；Archer が軽いとき（1 人・燃料少なめ）の設計運動速度 Va は？；風の中で 1 点の周りを一定の半径で回る。バンクが最も深くなるのはどこ？；急旋回の途中で機首が下がり、高度が減り始めた。正しい直し方は？）
- 用語：Attitude + Power = Performance / 姿勢＋出力＝性能（keep）；Pitch attitude / ピッチ姿勢（機首の上げ下げの角度）；Bank angle / バンク角（翼の傾き）；Trim / トリム（操縦の力を消す）（keep）；Coordinated flight / 釣り合い飛行（ボールが中央）；Level off / レベルオフ（水平に戻す）（keep）；（ほか 14 件）
- 出典：Keep R.afh; add chapter links — Ch. 3 Basic Flight Maneuvers https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_ha…；Keep R.acsP (FAA-S-ACS-6C, current) https://www.faa.gov/training_testing/testing/acs/private_airplane_acs_6.pdf — cite the task codes used (PA.V.A, PA.V.B, PA.V…；Keep R.acsC (FAA-S-ACS-7B, current) but only for the one Commercial sentence.；Keep R.archerCk (Vx/Vy/87, Va 113/89, spin recovery).；Add 14 CFR 91.119 Minimum safe altitudes https://www.ecfr.gov/current/title-14/section-91.119；（ほか 1 件）

## 第 15 章 `tl` 離陸・場周経路・着陸・ゴーアラウンド（Takeoffs, traffic patterns, landings and go-arounds）

節：`ops.takeoff` 通常離陸と上昇・`ops.pattern` 場周経路（トラフィックパターン）・`ops.landing` 安定した進入と着陸・`ops.goaround` ゴーアラウンド（着陸のやり直し）・`ops.xwind` 横風の離着陸・`ops.short` 短距離・不整地の離着陸とスリップ

### 今の問題

- **誤り**
  - ops.landing（AFH の表）「降下率 一般に 500〜1,000 fpm。それより大きければ地上 300 ft までに減らす」→ AFH 第 9 章：500 fpm を超える降下率を使うなら地上 300 ft より前に減らす（https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/10_afh_ch9.pdf）
  - FIG.pattern「約 1.6 km（1 NM）離れて滑走路と平行」・表「滑走路から約 1 NM」→ 1 NM＝1.852 km。1.6 km は 1 SM。AFH 第 8 章はダウンウインドを滑走路から「約 1/2〜1 マイル」（https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/09_afh_ch8.pdf）
  - ops.pattern 表「アビーム（接地点の横）でパワーを絞り…降下開始」→ AFH 第 8 章・AIM 4-3-3 の図：着陸滑走路の進入端（approach end）の真横まで場周高度を保ち、そこで降下開始（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_3.html）
  - FIG.pattern：クロスウインドへの旋回を滑走路の端ちょうどに描いている → AIM 4-3-2：離陸上昇（Departure）は滑走路の端から少なくとも 1/2 マイル先、場周高度の 300 ft 以内まで続ける。AIM 4-3-3 の図：滑走路の端を越えてからクロスウインドへ（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_3.html）
  - FIG.pattern：ベースへの旋回点から見た進入端が約 15° 後ろ → AFH 第 8 章：進入端が約 45° 後ろに見えたらベースへ（本文の説明と図を合わせる）
  - （ほか 4 件）
- **古い**
  - AIM の区間名：本の「アップウインド / 離陸」・図の「離陸・上昇（upwind）」→ 現行 AIM 4-3-2（Basic・Change 3、2026-07-09 発効）は離陸後の直線を Departure、Upwind leg を管制の指示用の延長と定義。AFH 第 8 章も departure leg と upwind leg（ゴ…
  - 引用している版はすべて現行：AFH FAA-H-8083-3C（FAA の配布ページに新版なし）、自家用 ACS FAA-S-ACS-6C・事業用 FAA-S-ACS-7B（2024-04 版・2024-05-31 発効、ACS 一覧で現行）、Archer チェックリスト（MGA 2025、URL 生存・速度は手元の写しと同じ）。AIM …
  - 場周の入り方の資料に AC 90-66C（Non-Towered Airport Flight Operations、2023-06-06、AC 90-66B を廃止）を加える。
- **数値の食い違い**
  - ダウンウインドの距離：本（book-3.js:130「約 1 NM」、book-figs.js FIG.pattern「約 1.6 km（1 NM）」）と課目（syllabus.js:169「約 1.6 km」、school.js:212 cross −1600 m）。1.6 km は約 0.86 NM＝約 1 SM。本を「約 1.6 k…
  - 短距離離陸：本・quiz.js q_ops（チェックリスト：フラップ 25°・55 kt でローテーション）と課目 x3（syllabus.js:262 takeoffRoll(AR.rotate)＝60 kt、フラップの設定なし＝v.toFlaps 0）。55 kt は FL.physics の v にない値。本に「課目 x3 はフラッ…
  - 短距離離陸の許容幅：本（ACS：Vx ＋10／−5 kt）と課目 x3 の基準（syllabus.js:263「Vx 64 +5/−5 kt」）。
  - （ほか 12 件）
- **わかりにくい**
  - ops.takeoff：「“Airspeed alive”」「Vr」「Vy」「巡航上昇」が初出で説明なし。
  - 全体：「この教材の「基礎」」が何を指すか（課目の基礎レベルの合格の目安）がどこにも書かれていない。
  - 全体：教材の基準は m（センターライン ±8 m・±6 m、目標点の −100〜+400 m、ファイナル 5 km）、公的な基準は ft・NM・kt で混在。ACS の 400 ft と教材の 400 m が並ぶ（ops.landing）。
  - （ほか 6 件）
- **順番**
  - ops.landing：最初の表で「PAPI 白 2・赤 2」を使い、PAPI の図と説明はその 2 つ後。PAPI は進入の図の後、表の前に。
  - ops.landing：最初の SVG が PAPI。主図（横から見た 3° の進入）を最初に置く。
  - ops.landing：安定進入・PAPI・フレア・接地・基準が 1 節に詰まりすぎ。フレアと接地・フロート・バウンドは新節 ops.flare へ分ける。
  - （ほか 3 件）
- **重複**
  - aero.left（左偏向傾向・右ラダー）と ops.takeoff の「プロペラの左偏向で…右ラダー」→ ここは 1 文とリンクだけに。
  - aero.ge（地面効果）と ops.goaround・ops.short の地面効果 → 定義は aero.ge、ここはリンク。
  - perf.tol・perf.climb（Vx／Vy・離着陸距離・「滑走路の半分で Vr の 70%」の中止の目安）と ops.short・emg.abort → Vx／Vy の定義は perf.climb、ここは使い方だけ。
  - （ほか 7 件）
- **節ごとの問題（抜粋）**
  - `ops.takeoff`：目的の 1 文も図もなく、いきなり手順の番号リスト（<ol>）で始まる。CADET の要約（最初の 1〜2 文）が手順の 1 行目になってしまう。
  - `ops.takeoff`：用語が説明なしで出る：「60 kt（Vr）」「76 kt（Vy）」「巡航上昇（87 kt）」「“Airspeed alive”」「プロペラの左偏向」（aero.left へのリンクもない）。初出で「ローテーション速度（rotation speed, Vr）」「最良上昇率速度（best rate of climb, Vy）」と書く。
  - `ops.takeoff`：「この教材の「基礎」」が何か説明がない（課目の合格の目安＝基礎レベル）。しかも「センターライン ±8 m」は m、ACS の行は kt・ft で、単位が混在。
  - `ops.takeoff`：ここが大切 2「速度・ボール・センターラインの延長だけを見る」は AFH 第 6 章（速度計を凝視せず、外の水平線に対する姿勢で速度を作る）と逆の印象。「外で姿勢と方向、速度計とボールは時々」に直す。
  - （ほか 47 件）

### 書き直しの方針

章の順番（通常離陸 → 場周経路 → 安定進入と着陸 → ゴーアラウンド → 横風 → 短距離・不整地）は 1 回の飛行と課目 t1〜t4・x1〜x3 の順に合っているので保つ。各節は目的の 1〜2 文 → 最も大切な SVG（離陸・進入・ゴーアラウンド・短距離は横から見た図、場周は上から見た図、横風は風を分ける図）→ 説明 → 「公的な目安（AFH・AIM・ACS）」と「この教材の Archer（AR）・課目の合格の目安」を出典の列つきで 1 つの表に並べる形にし、m と ft の混在をやめる（教材の m の値には ft を併記）。ops.pattern は図を作り直し、現行 AIM の区間名（Departure・Crosswind・Downwind・Base・Final）、「進入端の真横で降下開始」「ダウンウインドは約 1.6 km（1/2〜1 マイル）」「左回りは 14 CFR 91.126 の規則」に直す。ops.landing は重複した 2 つの表を 1 つにまとめて降下率の誤りを直し、フレア・フロート・バウンドを新節 ops.flare（フレアと接地）に移す。ops.xwind は「横風成分とは」から始め、AFH の推奨（多くの場合ウイングロー、長いファイナルはクラブ → フレア前にウイングロー）に直し、用語を「最大実証横風成分」に統一する。ops.short は 3 列の大きな表をやめて短距離離着陸だけにし、不整地は新節 ops.soft、フォワードスリップは新節 ops.slip（サイドスリップとの比較図つき）に分ける。bk.sim は残し、キーは現行の app.js どおり（R／Shift+R 全開、F／Shift+F アイドル、Q／E ラダー、S 機首上げ・W 機首下げ、V フラップを 1 段下げる・Shift+V 1 段上げる、B ブレーキ）で書き、課目 x3 がフラップ UP・60 kt で浮揚するなどチェックリストとの違いをその箱の中で明記する。

節の最初の図（いちばん大事な図）：
- `ops.takeoff`：新図 takeoffProfile：横から見た離陸の流れ。滑走（全開・右ラダー・横風なら操縦輪を風上へ）→ Vr 60 kt で機首上げ約 8〜10° → 浮揚 → Vy 76 kt で上昇 → 地上 1,000 ft で 87 kt の巡…
- `ops.pattern`：FIG.pattern を作り直す：LAB RWY 36（架空・模式図）の左場周を上から。縦長の viewBox（約 400×440）、文字 12 以上。番号の点 ①45° で入る（滑走路中央の真横）②ダウンウインド 1,000 ft・約 …
- `ops.landing`：新図 approachProfile：横から見たファイナル。3° の線が目標点（端から 300 m）に向かい、地上 500 ft の判断点（VMC。ここで安定していなければゴーアラウンド）、AR.appr kt・約 370 fpm（AR.a…
- `ops.goaround`：新図 goAroundProfile：横から見たゴーアラウンド。判断 → ①Power 全開（キャブレターヒーター OFF）②Attitude 機首を押さえて上昇姿勢・右ラダー ③降下が止まったらフラップ 25°・64 kt（AR.ga）④…
- `ops.xwind`：新図 xwindVector：RWY 36 と風 060°/12 kt（課目 x1 と同じ）を上から描き、風の矢印を横風成分 約 10 kt と向かい風成分 約 6 kt に分ける。角度の目安（30°→約 1/2、45°→約 0.7、60°…
- `ops.short`：新図 shortFieldProfile：横から見た短距離離陸。ブレーキを踏んで全開 → 55 kt（チェックリスト）で浮揚 → 64 kt（Vx・AR.x）で 50 ft の障害物を越える → 76 kt（Vy・AR.y）へ → フラップ…

### 図

今の図：`pattern` → redo、`papi` → fix、`xwindTable` → fix、`stableApproach` → fix

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `takeoffProfile` | `ops.takeoff` | 横から見た通常離陸の流れ：滑走（全開・右ラダー・横風なら操縦輪を風上いっぱいから少しずつ戻す）→ Vr で機首上げ約 8〜10° → 浮揚 → Vy で上昇（機首上げ約 11°）→ 地上 1,000 … | AR.rotate 60・AR.y 76・AR.climb 87（physics.js:109、Archer チェックリスト）、1,000 … | must |
| `approachProfile` | `ops.landing` | 横から見たファイナル：3° の線が目標点（端から 300 m）へ。地上 500 ft の判断点（VMC：ここで安定していなければゴーアラウンド。300 ft より下で不安定になったら直ちに）、進入速度… | AR.appr 70・降下率 AR.appr×5.3 ≈ 370 fpm（syllabus.js:35）、目標点 300 m（school.… | must |
| `goAroundProfile` | `ops.goaround` | 横から見たゴーアラウンド：判断 → ①Power 全開 ②Attitude 機首を押さえて上昇姿勢・右ラダー ③降下が止まってからフラップ 40°→25°・64 kt ④正の上昇を確認・障害物を越えた… | AR.ga 64・AR.y 76（チェックリスト）、昇降率は FL.physics.steadyState（64 kt 全開：フラップ 40… | must |
| `xwindVector` | `ops.xwind` | 上から見た RWY 36 と風 060°/12 kt。風の矢印を滑走路に沿った向かい風成分（約 6 kt）と直角の横風成分（約 10 kt）に分ける。角度の覚え方（30°→約 1/2、45°→約 0.… | 課目 x1 の風（syllabus.js:253 rel 60・12 kt）、12×sin60° ≈ 10.4、12×cos60° ＝ 6、… | must |
| `crabWingLow` | `ops.xwind` | 2 枚並べた上から見た図：左＝クラブ（機首は風上、航跡はセンターライン、接地直前にラダーで機首を平行に）、右＝ウイングロー（風上の翼を下げ、反対のラダーで機首と航跡をセンターラインに、風上の主輪から接… | AFH 第 9 章（図 9-15・9-16 の考え方）。数値なし | must |
| `shortFieldProfile` | `ops.short` | 横から見た短距離離陸：ブレーキを踏んで全開 → 計器確認 → ブレーキを離す → 55 kt で浮揚 → Vx 64 kt で 50 ft の障害物を越える → Vy 76 kt へ → フラップを少… | チェックリスト SHORT FIELD TAKEOFF（55・64・76 kt、フラップ 25°）、AR.x 64・AR.y 76、ACS … | must |
| `aimingPoint` | `ops.landing` | 前の窓から見た滑走路（台形）3 枚：安定（目標点が窓の中で動かない・形が同じ）／高い（目標点が下へ動く・滑走路が長く細く見える）／低い（目標点が上へ動く・短く広く見える）。 | AFH 第 9 章（図 9-5〜9-7 の考え方）。数値なし | should |
| `touchdownZones` | `ops.landing` | 上から見た滑走路の接地範囲の比較：指定点から自家用 ACS 通常 0〜400 ft（約 120 m）、短距離 0〜200 ft（約 60 m）、事業用 通常 0〜200 ft・短距離 0〜100 ft… | ACS 6C PA.IV.B.S10・PA.IV.F.S10、ACS 7B CA.IV.B.S10・CA.IV.F.S10、syllabus… | should |
| `flareSequence` | `ops.flare` | 横から見たフレア：進入姿勢（機首下げ約 3°）→ 地上 10〜20 ft で少しずつ機首を上げる → 滑走路の数インチ上を水平に → 主輪から接地 → 前輪をゆっくり下ろす。目線（滑走路の先を浅い角度… | FL.physics.steadyState(pa28, 70 kt, −371 fpm, フラップ 40°) の機首角 ≈ −3°、10〜… | should |
| `forwardSlip` | `ops.slip` | 上から見たフォワードスリップとサイドスリップの比較：フォワード＝機首を滑走路から逸らし、航跡は滑走路へ、降下角が深くなる／サイド（ウイングロー）＝機首も航跡も滑走路へ、横風を打ち消す。エルロンとラダー… | AFH 第 9 章（図 9-14）、ACS PA.IV.M。数値なし | should |
| `patternEntry` | `ops.pattern` | 場周への入り方：45° で滑走路中央の真横のダウンウインドへ（推奨）、反対側から来たときは場周高度より 500 ft 上で中央を横切り、約 2 マイル離れてから降りて 45° で入る。模式図・NOT … | AFH 第 8 章（図 8-3）、AC 90-66C、AIM 4-3-3 | nice |
| `softFieldTakeoff` | `ops.soft` | 横から見た不整地離陸：止まらずに滑走路へ・操縦輪を引いて前輪を浮かせる → できるだけ遅い速度で浮く → 地面効果の中で加速 → 64 kt（障害物あり）または 76 kt で上昇。 | チェックリスト SOFT FIELD TAKEOFF（フラップ 25°・64／76 kt）、ACS PA.IV.C、AFH 第 6 章 | nice |

### 写真

- `ops.pattern`：上空から見た小さな一般航空の空港（滑走路・誘導路・セグメントサークルと場周の向きの標識）
- `ops.landing`：PAPI の 4 つの灯（滑走路の左側、白 2・赤 2 に見える写真が理想）
- `ops.landing`：小型機のファイナルから見た滑走路（台形に見える・計器画面や顔が写っていないもの）
- `ops.xwind`：吹き流し（windsock）
- `ops.xwind`：クラブで進入中の飛行機（機首が滑走路からずれている）
- `ops.takeoff`：離陸中の Piper PA-28（できれば Archer）
- `ops.short`：芝の滑走路・山あいの短い滑走路（不整地・短距離の例）
- **入手**（2026-10-26）：吹き流し（`windsock`、`ops.xwind`）・芝の滑走路（`grassStrip`、`ops.soft`）。**未入手**：PAPI の灯（見つかった写真は進入灯で、PAPI ではなかった）・離陸中の PA-28・ファイナルから見た滑走路・クラブで進入中の飛行機・上空から見た小さな空港。PAPI は図 `approachProfile` の右上で代えた。

### 章末

- 確認問題：Q1（VMC で安定していなければゴーアラウンドする高さ）：keep。AFH 第 9 章どおり。選択肢「地上 300 ft 以下になってから考える」は良い誤答。 / Q2（3 原則の順番）：keep。ただし quiz.js q_ops にも同じ趣旨の問題があるので、章末は「最初の操作は？」より順番の問題のままでよい。 / Q3（右からの横風のウイングロー）：replace。quiz.js q_ops の「左からの横風」と左右を入れ替えただけ。PAPI の読み方か横風成分の計算に替える。 / Q4（ACS の短距離着陸の接地範囲）：keep（fix）。「指定点を越えた側 0〜200 ft（手前は不可）」と why に書き、課目 x2 の教材の目安（±60 m）とは違うことを添える。
- 新しい問題の案：5 問（ファイナルで PAPI が白 3・赤 1 に見えた。正しい読み方と操作は？；滑走路 36 に風 030°/14 kt。横風成分はおよそ？；管制塔のない空港で、プロペラ機の場周高度と旋回の向き（特別な決まりがないとき）は？；場周経路で、場周高度から降下を始める目安の位置は？；短距離離陸で、50 ft の障害物を越えたあとにすることは？）
- 用語：Rotation speed（Vr）/ ローテーション速度（機首を上げて浮く速度）/ Archer 60 kt；Best rate of climb（Vy）/ Best angle of climb（Vx）/ 最良上昇率速度・最良上昇角速度 / Archer 76・64 kt；Traffic pattern / 場周経路 / 標準は左回り（14 CFR 91.126）；Traffic pattern altitude（TPA）/ 場周高度 / プロペラ機は地上 1,000 ft（AIM 4-3-3）；Departure / Crosswind / Downwind / Base / Final / 離陸上昇・クロスウインド・ダウンウインド・ベース・ファイナル / Upwind …；Abeam / 真横 / 進入端の真横で降下開始；（ほか 13 件）
- 出典：update R.afh：章の PDF を直接示す — 第 6 章 https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/07_afh_ch6.pdf ・第 8 …；update R.aim：場周 AIM 4-3 https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_3.html 、PAPI AIM 2-1-2 https://www.faa.gov/air_traffic/public…；add AC 90-66C Non-Towered Airport Flight Operations（2023） https://www.faa.gov/documentlibrary/media/advisory_circular/ac_90-66c.pdf；add 14 CFR 91.126（管制塔のない空港の旋回の向き） https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-B/section-91.126；keep R.acsP（FAA-S-ACS-6C、2024-05-31 発効・現行） https://www.faa.gov/training_testing/testing/acs/private_airplane_acs_6.pdf ・R.acsC（FAA-S-ACS-7B・現行） https://www.faa.…；（ほか 1 件）

## 第 16 章 `emg` 緊急操作（単発機） — Emergency procedures (single-engine)

節：`emg.basic` 緊急時の考え方：Aviate・Navigate・Communicate・`emg.abort` 離陸中止・`emg.engine` エンジン故障：離陸直後・上空・不時着・`emg.fire` 火災と煙・`emg.elec` 電気系統の故障とそのほかの異常

### 今の問題

- **誤り**
  - emg.elec「上のラッチ → 横のラッチの順に閉じる」→ チェックリストは両方開いたとき『横のラッチ → 上のラッチ』（LATCH SIDE LATCH THEN TOP）(https://www.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Archer_Checklist.pdf p.6 OPEN DOOR)
  - emg.basic bk.key「危険な状態から機体を守ることは、規則より優先される（14 CFR 91.3(b)）」→ 91.3(b)：直ちに行動が必要な飛行中の緊急時に、その緊急に対処するのに必要な範囲で Part 91 の規則から逸脱できる。91.3(c)：求められたら書面で報告 (https://www.ecfr.gov/current/title-14/section-91.3)
  - emg.engine 表 4「無線（121.5 / 7700）」→ AIM 6-3-2：まず交信中・指定された周波数で通報。すぐに交信できなければ 7700。121.5 MHz は必要なときに使える緊急周波数 (https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap6_section_3.html)
  - emg.elec「非常用バッテリーで予備計器（姿勢・速度・高度）は動き続けます」→ 予備の速度計・高度計はピトー静圧で動く機械式が多く、EMERG BATT の給電先は装備ごとに違う（チェックリストは『Standby Instruments and PFD operate — VERIFY』）。断定せず POH の G1000 補足で確認と書く (https://www.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Arche…
  - emg.fire bk.key「燃料を止める・電気を止める」→ エンジン火災のチェックリストにマスター OFF はなく、AFH は電気火災でなければマスターを切ると無線・トランスポンダーを失うと注意している (https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/19_afh_ch18.pdf In-Flight Fire / Engine Fire)
- **数値の食い違い**
  - 滑空比：本文「約 9：1・1,000 ft で約 1.5 NM」（教材の目安） vs 飛行モデル（physics.js:342 停止エンジンの抗力 0.026 を含む steadyState, pa28, 76 KIAS, 1,000〜3,000 ft）＝8.5：1・1.40 NM/1,000 ft・降下率 約 920 fpm・3,000…
  - 最良滑空速度：チェックリスト 76 KIAS vs 飛行モデルの揚抗比最大は約 60 KIAS（9.3：1）。66 kt で 9.2：1、76 kt で 8.5：1 → シミュレータでは 76 kt より遅く飛ぶ方が遠くへ届き、e3 の『76 kt を保つ（速すぎても遅すぎても届かない）』（syllabus.js:217）と矛盾。phys…
  - examples の「3,000 ft …約 9：1 で 4.4 NM」→ 教材モデルでは無風 4.2 NM、向かい風 10 kt で 3.7 NM、追い風 10 kt で 4.7 NM（高度 3,000 ft AGL・76 KIAS）。
  - （ほか 4 件）
- **わかりにくい**
  - emg.basic：「急がない」（wind the clock）と emg.abort「迷わない」・emg.engine「すぐに機首を下げて」が矛盾して読める。『すぐやる 1 動作』と『落ち着いて確かめること』を分ける。
  - emg.abort：滑走中の中止と、浮揚直後のエンジン故障（滑走路が残っている）が 1 段落に混ざっている。
  - emg.engine：bk.calc('turn') が何のためにあるか書かれていない（初期値 100 kt・30° の一般的な旋回計算機）。
  - （ほか 5 件）
- **順番**
  - emg.engine に滑空距離と不時着の内容まで詰め込まれている → 新節 emg.glide（滑空距離・風・最小沈下）と emg.forced（場所の選び方・進入・POWER OFF LANDING・MAYDAY/ELT）に分ける。
  - emg.elec に電気以外（エンジンの不調・油圧・燃料圧・高油温・ドア）が入っている → 新節 emg.abnormal（エンジン計器の異常・ドアが開いた・ピトー静圧の詰まりは sys.g1000 参照）に移す。
  - 緊急降下は emg.fire の表の 1 行と ACS の段落に分かれている。火災・煙のあとに『緊急降下』の小見出しをまとめて置き、図を付ける。
  - （ほか 1 件）
- **重複**
  - sys.elec（book-1.js:177–182）：ALT 灯の手順と電気火災の手順がほぼ同文。sys は『しくみ』、emg は『手順』に分け、片方は参照にする。
  - radio5 / comm.xpdr（book-comm.js:340–348）：MAYDAY×3・PAN-PAN・7700・121.5・通報の順番を詳しく扱っている。emg.basic は {ch:radio5} への参照だけにする。
  - hf.srm（book-2.js:117）：Aviate → Navigate → Communicate を同じく扱う。
  - （ほか 5 件）
- **節ごとの問題（抜粋）**
  - `emg.basic`：図がない。CADET の教室スクリーンに出す最初の <svg> がこの章に 1 枚もない（章全体で SVG 0 枚、表 3 枚だけ）。
  - `emg.basic`：bk.key「急がない。「時計を巻く（wind the clock）」—— 数秒落ち着いてから…」は 62 字で長すぎ、しかも次の節と矛盾する：emg.abort は「迷わない」、emg.engine は「すぐに機首を下げて」、e1 の基準は「2 秒以内にアイドル」。wind the clock は FAA の資料にない言い伝えで、離陸中…
  - `emg.basic`：bk.key「危険な状態から機体を守ることは、規則より優先される（14 CFR 91.3(b)…）」は条文と違う。91.3(b) は『直ちに行動が必要な飛行中の緊急時に、その緊急に対処するのに必要な範囲で Part 91 の規則から逸脱できる』、(c) は『求められたら書面で報告』。law.pic（book-2.js:51）と重複。
  - `emg.basic`：「操作の優先順位は世界中で同じです」は言い過ぎ。『FAA の教材や多くの国の訓練で使われる順番』とする。
  - （ほか 37 件）

### 書き直しの方針

章の始め（emg.basic）で、緊急着陸の 3 種類（不時着・予防着陸・着水）と、AFH の心理的な落とし穴・ACS の startle response を先に教え、『すぐやる 1 動作 → 記憶項目 → チェックリストを読む → 伝える』の時間の流れを 1 枚の図で見せる。wind the clock は『一刻を争わない異常のとき』に限定し、離陸中止と低高度のエンジン故障は即座に動くと書き分ける。節の順は emg.basic → emg.abort → emg.engine（離陸直後と上空の再始動だけに絞る）→ 新節 emg.glide（最良滑空・滑空比・風・最小沈下、教材モデルの数値と実機の値を分けて表示）→ 新節 emg.forced（場所の選び方・進入・POWER OFF LANDING・MAYDAY/7700/ELT）→ emg.fire（エンジン・電気・客室の火災と緊急降下）→ emg.elec（電気系統だけ：ALT 灯・過負荷・低電圧・負荷を減らす・予備計器）→ 新節 emg.abnormal（エンジンの不調・油圧・燃料圧・高油温・ドア）。チェックリストの表は『チェックリストの文言』と『AFH/ACS/AIM の補足』を別の列にし、手順は必ず『教材用の要約。実機は POH/AFM と訓練校のチェックリストが優先』と添える。ドアのラッチの順番（横 → 上）と 91.3(b) の言い回しを直し、sys.elec の重複手順は参照に置き換える。数値は FL.physics から計算して埋め込み（滑空 8.5：1・1.4 NM/1,000 ft）、チェックリスト値（76/66 KIAS・120 KIAS・87 KIAS）は出典付きで並べる。

節の最初の図（いちばん大事な図）：
- `emg.basic`：優先順位の図（emgPriority）：縦に Aviate／Navigate／Communicate の 3 段、横軸に時間（0〜数秒：すぐやる 1 動作＝機首を下げる・止まる → 記憶項目 → チェックリストを読む → 通報）。各段に A…
- `emg.abort`：滑走路の上面図（emgAbortPoint）：LAB RWY 36（1,200 m・架空・模式図）に『浮揚しているべき地点』と経験則の目安（中間点で 42 kt＝Vr 60 kt の 70%）を描き、手前は『アイドル・まっすぐ・ブレーキ』、…
- `emg.engine`：引き返しと正面着陸の上面図（emgTurnback）：300 ft AGL でエンジン停止 → A 案：正面 ±30°（教材の目安）の扇形に降りる、B 案：引き返し（AFH の例の数字：反応 4 秒・225° 旋回・65 kt・半径 2,1…
- `emg.fire`：『何を断つか』の図（emgFireCut）：Archer の側面の模式図に燃料の流れ（タンク → セレクター → ミクスチャー → エンジン）と電気の流れ（オルタネーター・バッテリー → バス → 機器）を描き、エンジン火災＝燃料側を赤で遮…
- `emg.elec`：電気系統の模式図（emgElecLoadShed）：オルタネーター → バス → 機器、バッテリー、EMERG BATT（何に送るかは機体ごとに違う＝点線）を描き、ALT 故障時に残す機器・切る機器を色分け。横に AFH のバッテリー時間の…

### 図

今の図：`bk.t（emg.engine：ENGINE FAILURE DURING FLIGHT の表）` → fix、`bk.t（emg.fire：エンジン火災・電気火災・緊急降下の表）` → fix、`bk.t（emg.elec：ALT 灯・ラフ・油圧・燃料圧・ドアの表）` → fix、`bk.calc('turn')（emg.engine）` → redo

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `emgPriority` | `emg.basic` | Aviate / Navigate / Communicate の 3 段と時間軸（すぐやる 1 動作 → 記憶項目 → チェックリスト → 通報）。各段に Archer の例。 | AFH ch.18・ACS PA.IX（startle response）・AIM 6-3-1/6-3-2・FL.physics v.gli… | must |
| `emgAbortPoint` | `emg.abort` | LAB RWY 36 の上面図に『浮揚しているべき地点』と経験則の目安、滑走中の中止／浮揚直後で滑走路が残る／残らない の 3 区間。模式図・NOT FOR NAVIGATION。 | physics.js LAB_RWY.len 1,200 m・v.rotate 60（70% = 42 kt）・AFH ch.6 Rejec… | must |
| `emgTurnback` | `emg.engine` | 離陸直後のエンジン停止：正面 ±30° の扇（教材の目安）と、引き返し（AFH の例の数字で滑走路の下に終わる軌跡）を上から見た図。 | AFH 3C ch.18 Figure 18-5 の例（300 ft AGL・4 秒・標準旋回・65 kt・半径 2,100 ft・225°… | must |
| `emgEngineFlow` | `emg.engine` | 上空のエンジン故障の流れ図：76 KIAS → 場所を決める → 再始動（燃料：セレクター・ポンプ・ミクスチャー／空気：キャブヒート／点火：マグネトー）→ だめなら POWER OFF LANDING… | MGA チェックリスト ENGINE FAILURE DURING FLIGHT / POWER OFF LANDING・FL.physic… | should |
| `glideRange` | `emg.glide` | 高度と滑空距離の側面図＋風の影響：1,000/2,000/3,000 ft AGL から 1.4/2.8/4.2 NM（無風）、向かい風・追い風 10 kt で 3.7/4.7 NM（3,000 ft… | FL.physics.steadyState(pa28, 76, {pwr:'dead'}) を高度ごとに積分（本分析で計算した値） | must |
| `glidePolar` | `emg.glide` | 速度と降下率（または滑空比）のグラフ：最小沈下速度と最良滑空速度の違い（ACS PA.IX.B.K2b）。教材モデルの曲線とチェックリストの 76 KIAS を並べ、ずれがあることを正直に注記。 | FL.physics.steadyState の pwr 'dead' を 55〜100 kt で計算・MGA 76 KIAS | should |
| `forcedLandingPlan` | `emg.forced` | 不時着の進入の上面図：風・畑の長さと向き・障害物の 3 要素、風上に向かう最終進入、まず大まかな地域 → 次に具体的な場所、『考えを変えるのは 1 回まで』。模式図。 | AFH 3C ch.18 Terrain Selection / Approach・ACS PA.IX.B.S3–S4 | should |
| `touchdownEnergy` | `emg.forced` | 対地速度と止まるのに必要な距離（9 G 一定で 50 mph → 9.4 ft、100 mph → 37.6 ft）：速度 2 倍でエネルギー 4 倍。風上に降りる理由。 | AFH 3C ch.18 Figure 18-2 の数値 | nice |
| `emgFireCut` | `emg.fire` | 燃料の流れと電気の流れの模式図で『エンジン火災＝燃料を断つ／電気火災＝電気を断つ／客室の煙＝消火器 → 換気』。 | MGA ENGINE FIRE / ELECTRICAL FIRE・AFH ch.18 In-Flight Fire | must |
| `emgDescent` | `emg.fire` | 緊急降下の形：バンク 30〜45° の旋回降下・アイドル・フラップ UP・120 KIAS・指定高度 ±100 ft で水平に。Va 113/89 KIAS と Vno 125 の帯を速度計の弧で示す… | MGA EMERGENCY DESCENT・ACS PA.IX.A.S4–S5・FL.physics v.va 113・v.no 125・v… | should |
| `emgElecLoadShed` | `emg.elec` | 電気系統の模式図と、ALT 故障時に残す機器・切る機器。バッテリー時間の棒グラフ。 | MGA ELECTRICAL FAILURES・AFH ch.18 Electrical System（25 Ah：5 A で 5 時間・1… | should |
| `doorLatch` | `emg.abnormal` | Archer のドアの上ラッチと横ラッチの位置、両方開いたら『横 → 上』。AFH の『まず操縦・ベルトを外さない』を大きく。 | MGA OPEN DOOR（87 KIAS）・AFH ch.18 Door Opening In-Flight | nice |

### 写真

- `emg.forced`：上空から見た農地・広い畑（不時着の候補地の見え方）
- `emg.forced`：406 MHz の ELT（航空機用救命無線機）の本体
- `emg.fire`：小型機の客室に取り付けた携帯用消火器
- `emg.elec`：Lycoming O-360 系エンジンのオルタネーター（カウルを開けた状態）
- `emg.glide`：滑空中・アイドルで降下中の PA-28（側面）
- **入手**（2026-10-26）：ELT の本体とスイッチ（`elt`、`emg.forced`）。**未入手**：上空から見た畑・携帯用消火器・オルタネーター・滑空中の PA-28（使える写真が見つからなかった）。

### 章末

- 確認問題：Q1（300 ft でエンジン停止）：keep。why に AFH ch.18『低高度の引き返しは学生操縦士には受け入れられない危険』を加える。 / Q2（緊急降下のバンク）：keep。ACS PA.IX.A.S4『30〜45°で正の荷重を保つ』と一致。 / Q3（ALT 灯・電流計ゼロ）：keep。チェックリストと一致。選択肢『気にせず飛行を続ける』は良い誤答。
- 新しい問題の案：5 問（Archer の訓練校チェックリストで、ドアの上と横のラッチが両方とも開いたとき、閉める順番は？；飛行中のエンジン火災。訓練校の Archer チェックリストに含まれない操作は？；3,000 ft AGL でエンジンが止まり 76 kt で滑空。向かい風 10 kt の方向へ飛ぶと、無風のときと比べ…；離陸滑走中、『浮揚しているべき地点』を過ぎても速度が足りない。正しい対応は？；進入管制と交信中にエンジンが止まった。遭難の通報は？）
- 用語：Aviate, Navigate, Communicate / 飛ばす（操縦する）・向かう・伝える / 優先順位；Best glide speed / 最良滑空速度 / Archer 76 KIAS（チェックリスト）；Minimum sink speed / 最小沈下速度 / 最も長く空中にいられる速度（最良滑空より遅い）— 追加；Glide ratio / 滑空比 / 教材モデル 76 kt で約 8.5：1 — 追加；Forced landing / 不時着（強制着陸） / エンジン停止などで飛び続けられない；Precautionary landing / 予防着陸 / 飛べるがやめた方がよいときの着陸（AFH）— 追加；（ほか 13 件）
- 出典：add: FAA Airplane Flying Handbook（FAA-H-8083-3C）第 18 章 Emergency Procedures https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviat…；add: FAA Airplane Flying Handbook 第 6 章 Rejected Takeoff/Engine Failure https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/…；add: AIM 6-3 Distress and Urgency Procedures（6-3-1 MAYDAY×3、6-3-2 通報の順番と 7700） https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap6_section_3.html；update: R.cfr91 を 14 CFR 91.3 の条文に直接リンク https://www.ecfr.gov/current/title-14/section-91.3；keep: MGA Archer III G1000 Pilot's Checklist 2025 https://www.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Archer_Checklist.pdf（2026-10 時…；（ほか 2 件）

## 第 17 章 `solo` ソロ（単独飛行）への準備と審査 — Preparing for the first solo and the stage check

節：`solo.req` 単独飛行の条件（14 CFR 61.87 の要点）・`solo.check` ソロ前の審査（Stage check）で見られること・`solo.first` 初めてのソロの心得

### 今の問題

- **誤り**
  - solo.req「学生操縦士証明とログブックに、その機種での単独飛行の承認」→ 現在はログブックだけ（61.87(n)：endorsement in the student's logbook for the specific make and model … by an authorized instructor who gave the training within the 90 days preceding the date of the flight。Amdt. 61-135, 81 FR 1306, 2…
  - terms「SRM／単独飛行の資源管理」→ SRM は Single-pilot Resource Management（1 人で操縦するときの資源管理）。ソロ（単独飛行）とは別の概念で、乗客がいても 1 人操縦なら SRM (https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/risk-management-handbook-faa-h-8083-2a; https://www.faa.gov/training_testing/tes…
- **古い**
  - solo.req：学生操縦士証明への承認の記入（2016-04-01 で廃止）。
  - refs：14 CFR Part 61 の総論リンクだけで、承認の文例の AC 61-65（現行は AC 61-65K、2025-11-14）がない。
- **数値の食い違い**
  - solo.first『教官（約 80 kg）』は教材の値。教材モデル（physics.js pa28 mass 1,050 kg・Vs1 50 kt）では 970 kg で Vs1 約 48 kt、76 kt・1,000 ft の全開上昇 741 → 846 fpm（steadyState で計算）。
  - solo.req『90 日』は 61.87(n)(o)(p) と quiz（solo Q1）・intro と一致。
  - solo.req の 61.89『昼 3 SM・夜 5 SM』は eCFR・quiz.js:77・intro.cert・law.rules と一致。
  - （ほか 2 件）
- **わかりにくい**
  - solo.req：『承認（endorsement）』が何に・誰が・いつ書くのかが分かりにくい（ログブック・訓練をした教官・飛行前 90 日以内・型式ごと）。
  - solo.req：bk.key の『12 回のレッスンと審査の後にソロ』と『平均 11 回目でファーストソロ』が矛盾して見える（出典が別で数え方も違う可能性）。
  - solo.check：誰が審査するか（Part 141 の chief / assistant chief / check instructor）がぼかされている。
  - （ほか 2 件）
- **順番**
  - solo.req の中で、まず『学生操縦士証明・医療証明・英語』（前提）→ 61.87 の 3 本柱（学科テスト・飛行訓練と技量・承認）→ 61.89 の制限 の順にする。
  - 新節 solo.after（初ソロの後：90 日ごとの更新、練習空域へのソロ、25 NM 以内の他空港 61.93(b)(1)、ソロ XC 61.93、夜 61.87(o)、Class B/C/D 61.94/61.95）を solo.first の後に追加し、第 3 部の航法（navd・nav.xc）へつなぐ。
  - ANA の公開情報（12 回・平均 11 回目）は solo.req の本文の bk.fact 1 か所にまとめ、bk.key から外す。
- **重複**
  - intro.course（book-1.js:29）：ANA の『レッスン 12 回と Check Flight に合格するとソロ。取材記事では平均 11 回目でファーストソロ』と同文。solo.req は参照だけにするか、bk.fact 1 か所に。
  - intro.cert（book-1.js:43）：学生操縦士の権限と 61.89（昼 3 SM・夜 5 SM・乗客不可）。
  - law.rules（book-2.js:76）：61.89 の表（solo.req より詳しい：地表を見られないとき・ログブックの制限まで）。law.vfr の bk.key（book-2.js:58）にも 3 SM／5 SM。
  - （ほか 3 件）
- **節ごとの問題（抜粋）**
  - `solo.req`：古い：「学生操縦士証明とログブックに、その機種での単独飛行の承認」— 2016 年 4 月 1 日からの規則（Amdt. 61-135, 81 FR 1306）で、承認はログブックだけ。現在の 61.87(n)：『その型式についての承認を、訓練をした教官が飛行の前 90 日以内に学生のログブックに記入』。AC 61-65K 20.1 も『…
  - `solo.req`：前提が抜けている：学生操縦士証明（61.83：飛行機は 16 歳以上、英語を読み・話し・書き・理解できる）、第 3 種以上の医療証明（61.23(a)(3)(i)）。日本の訓練生には英語の要件（61.83(c)）が特に大切。
  - `solo.req`：61.87(b) の要約が粗い：『規則』は Part 61 と Part 91 の該当部分、『飛行特性』は飛行特性と運用上の制限。教官がテストを行い、終わったら間違えた問題をすべて一緒に見直してからソロを許可する、まで書く。
  - `solo.req`：61.87(d) の 15 項目のうち (6) 場周経路（入り方・出方）と (7) 衝突・ウインドシア・後方乱気流の回避、(8) 高抗力/低抗力の形での降下、(9) 巡航から低速までのいろいろな速度が「など」で抜けている。初心者にとって場周経路と見張りは最重要なので、15 項目を表か図で全部見せる。
  - （ほか 18 件）

### 書き直しの方針

solo.req は最初に『初ソロまでの道のり』の図を置き、前提（学生操縦士証明：16 歳・英語〈61.83〉、第 3 種医療証明〈61.23〉）→ 61.87 の 3 本柱（教官が行い間違いを見直す学科テスト、15 項目の飛行訓練と教官が認める技量、型式ごとのログブックの承認〈訓練をした教官・飛行前 90 日以内〉）→ 61.89 の制限（乗客・報酬・視程 3/5 SM・地表が見えない・ログブックの制限）の順で書く。承認がログブックだけになった（2016 年）点を直し、AC 61-65K の承認の番号（A.3・A.4・A.6・A.7）を添える。ANA の公開情報は bk.key から本文の bk.fact に移し、2 つの記事の数字を出典ごとに分けて書く（CADET のテストのため solo.req の中に ANA の名前と『訓練回数の決まりはない』の言い回しは残す）。solo.check は『Part 141 の学校では chief instructor の責任で段階審査がある（141.85）』と事実を書き、表は『61.87(d) の項目』『この教材の課目』の 2 列にして、横風（x1）と急旋回（c1 だけ）を書き分ける。solo.first は教材モデルの数値（失速速度・上昇率）で『軽くなる』を見せ、SRM を正しく訳し、ソロ中に困ったときの行動（ゴーアラウンド・管制に student pilot と伝える・決めた中止条件）を加える。新節 solo.after（初ソロの後の承認と 61.93 の XC・夜・Class B）を追加して第 3 部の航法へつなぐ。

節の最初の図（いちばん大事な図）：
- `solo.req`：初ソロまでの道のり（soloRoadmap）：学生操縦士証明（16 歳・英語：61.83）＋第 3 種医療証明（61.23）→ ソロ前の学科テスト（61.87(b)・承認 A.3）→ 15 項目の飛行訓練と技量の確認（61.87(c)(d)…
- `solo.check`：段階審査で見られること（stageCheckAreas）：中央に『安全の余裕・判断・自分で気づいて直す』、周りに準備・離着陸（横風を含む）・空中操作・緊急・交信の 5 分野と、61.87(d) の項目番号・この教材の課目（a5–a8・t1–…
- `solo.first`：教官あり／ソロの比較図（soloWeight）：同じ Archer（教材モデル）で重量 1,050 kg → 970 kg、失速速度 50 → 48 kt、上昇率 741 → 846 fpm、フレアで浮く（フロート）距離が延びる様子を側面図…

### 図

今の図：`bk.t（solo.check：分野・見られることの例・この教材の課目）` → fix

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `soloRoadmap` | `solo.req` | 初ソロまでの道のり：前提（証明・医療・英語）→ 学科テスト → 15 項目の訓練 → 段階審査 → ログブックの承認（90 日）→ 初ソロ → 90 日ごとの更新 → その先（25 NM・XC・夜・C… | eCFR 61.83・61.23・61.87(b)(c)(d)(n)(o)(p)・61.93・61.95、AC 61-65K Appendi… | must |
| `presoloManeuvers` | `solo.req` | 61.87(d) の 15 項目のアイコン付き一覧と、この教材の課目の対応（a1–a8・t1–t4・e1–e3・x1。対地目標操作・スリップ・衝突回避などシミュレータに課目がないものは灰色）。 | eCFR 61.87(d)・syllabus.js の課目一覧 | should |
| `studentLimits` | `solo.req` | 学生操縦士ができないこと（61.89）：乗客・報酬や業務・国際飛行・昼 3 SM／夜 5 SM 未満の視程・地表が見えない飛行・ログブックの制限。 | eCFR 61.89(a) | should |
| `stageCheckAreas` | `solo.check` | 段階審査で見られること：中央に『安全の余裕・判断・自己修正』、周りに 5 分野、ACS の K/R/S（知識・リスク管理・技能）の考え方。 | FAA-S-ACS-6C の構成・14 CFR 141.85・syllabus.js c1 の手順 | should |
| `soloWeight` | `solo.first` | 教官あり（1,050 kg）とソロ（970 kg）の比較：失速速度 50 → 48 kt、上昇率 741 → 846 fpm、フレアで浮く距離が延びる。 | FL.physics.AIRCRAFT pa28（mass 1,050・v.s1 50）と steadyState（76 kt・full・1… | must |

### 写真

- `solo.req`：パイロットのログブック（白紙のページや表紙。実在の人名・署名が読めないもの）
- `solo.first`：場周経路を飛ぶ／タッチアンドゴーをする PA-28（側面・遠景）
- `solo.check`：管制塔のある小さな空港の滑走路と誘導路（上空から）
- **未入手**（2026-10-26）：ログブック・場周を飛ぶ PA-28・上空から見た小さな空港。図 `soloRoadmap` だけにした。

### 章末

- 確認問題：Q1（承認の有効期間 90 日）：fix。『有効期間』より条文どおり『訓練をした教官が飛行の前 90 日以内にログブックに記入』（61.87(n)(p)）に。why に『ログブック（証明書ではない）』を加える。 / Q2（ソロで機体が軽い）：keep。why に教材モデルの数値（失速速度 50 → 48 kt、上昇率 約 14% 増）を加える。
- 新しい問題の案：4 問（単独飛行の承認（solo endorsement）は、現在の 14 CFR ではどこに書かれる？；14 CFR 61.87 で、初めてのソロの前に『必要ない』ものは？；ソロ前の学科テスト（61.87(b)）の範囲に入らないものは？；学生操縦士が単独で飛べないのはどれ？（61.89））
- 用語：Student pilot certificate / 学生操縦士証明 / 16 歳以上・英語（61.83）— 追加；Medical certificate (third class) / 第 3 種医療証明 / 61.23 — 追加；Solo flight / 単独飛行 / 学生が機内でただ 1 人の乗員（61.87(a)）— 追加；Pre-solo knowledge test / ソロ前の学科テスト / Part 61・91、空港の空域と手順、機体の特性と制限；Endorsement / 承認（ログブックへの記入） / 訓練をした教官が書く；Solo endorsement / 単独飛行の承認 / 型式ごと・飛行前 90 日以内（61.87(n)）；（ほか 6 件）
- 出典：update: R.cfr61 を条文ごとに：61.87 https://www.ecfr.gov/current/title-14/section-61.87 ・61.89 https://www.ecfr.gov/current/title-14/section-61.89 ・61.83 https://www.e…；add: FAA AC 61-65K Certification: Pilots and Flight and Ground Instructors（2025-11-14、承認の文例 A.3〜A.8） https://www.faa.gov/documentlibrary/media/advisory_circular…；add: 14 CFR 141.85 Chief instructor responsibilities（段階審査） https://www.ecfr.gov/current/title-14/section-141.85；add: AIM 4-2-4（学生操縦士は最初の交信で student pilot と名乗る） https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_2.html；add: FAA Risk Management Handbook（FAA-H-8083-2A、SRM） https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/risk-management-handbook-faa-h-8083-2a；（ほか 2 件）

## 第 18 章 `navp` 地図・飛行計画・推測航法（Charts, flight planning and dead reckoning）

節：`nav.chart` セクショナルチャート（VFR の航空図）・`nav.plan` 針路の計算：真航路 → 磁針路 → コンパス針路・`nav.log` （新）ナビゲーションログ・チェックポイント・高度と燃料の決まり・`nav.dr` 地文航法と推測航法

### 今の問題

- **誤り**
  - nav.chart「★＝飛行場灯台」→ CT 周波数の後の ★ は管制塔の運用が時間限定（part-time）。灯台は空港記号の上の別記号（https://aeronav.faa.gov/user_guide/cug-complete_20260709.pdf「Star indicates operation part-time」「The symbol … indicates the existence of a rotating or flashing airport beacon」）
  - nav.plan「修正表（compass card）」→ compass deviation card（自差カード）。compass card はコンパスの目盛り板（https://www.faa.gov/sites/faa.gov/files/18_phak_ch16.pdf 図 16-12 Compass deviation card）
  - nav.dr「（次の項「60 の法則」）」→ 同じ節の中にある（本文の内部参照の誤り）
- **古い**
  - 「フロリダ中部はおよそ西偏 6〜7°」→ 2026 年 10 月、Sanford 付近は約 7.1°W（NOAA WMM-2025、年約 0.07° 西へ）（https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml）。教材の 6°W は教材値として残す。
  - 「FAA が定期的に改訂します」→ 56 日ごと（https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/vfr/）。PHAK 25C の 'semiannually' は古い。
  - Chart Users' Guide：FAA は 2025 年 5 月の Charting Notice VIS 25-03 で廃止を予告したが、現在のページは 2026 年 7 月 9 日有効の版を公開している（https://www.faa.gov/air_traffic/flight_info/aeronav/digital_pro…
- **数値の食い違い**
  - 燃料流量：計算機 fuel の既定 9.5 gal/h ↔ FL.physics（physics.js:622 fuelFlow）では 3,000 ft で 110 KIAS（巡航）約 11.5 gal/h、105 KIAS 約 10.8 gal/h、100 KIAS 約 10.1 gal/h（Node で physics を回して確認）…
  - TAS：計算機 wca・例の TAS 105 kt ↔ pa28.v.cruise 110 KIAS（3,000 ft で TAS 約 113 kt）。課目 n2 は 105 kt、n1・n3 は 100 kt。例では「課目 n2 の 105 kt」と書けば矛盾しない。
  - 空港データ例「60」（6,000 ft）↔ LAB_RWY len 1,200 m（physics.js:68）＝約 3,940 ft →「39」。
  - （ほか 2 件）
- **わかりにくい**
  - 航路（course）・針路（heading）・方位（bearing）の区別が一度も説明されない（nav.plan）。日本語の「針路」が課目 n2 では磁方位の意味でも使われている。
  - 磁航路（MC）が未定義のまま 91.159 の表で「磁航路」を使っている（nav.plan）。
  - TH ＝ TC ± WCA の ± の決め方が無い（nav.plan）。
  - （ほか 2 件）
- **順番**
  - nav.plan に計算・ログ・燃料・規則が詰め込まれている → nav.plan（針路の計算）と新しい nav.log（ログ・チェックポイント・巡航高度・燃料）に分ける。
  - nav.plan の最初に「用語をそろえる（航路・針路・方位・真・磁）」を置き、その後に手順。等偏差線は nav.chart の図で先に見せる。
  - nav.dr は「地文航法 → 推測航法 → 組み合わせ（チェックポイントで直す）→ 60 の法則」の順。いまは 60 の法則が key の中だけ。
- **重複**
  - 偏差・自差・6〜7°W・自差カード：sys 章 sys.compass と重複。偏差と自差の計算は nav.plan に集め、sys.compass は北旋誤差・加速誤差と予備計器にして nav.plan へ bk.see。
  - 91.151 VFR の燃料：law 章 law.rules と重複。nav.log では規則を 1 行で示し law.rules へ。
  - 60 の法則：nav.dr・navd の nav.divert の表・quiz.js q_nav の 10 問目と重複。説明は nav.dr に 1 回、nav.divert は「nav.dr の 60 の法則で」と参照する。
  - （ほか 1 件）
- **節ごとの問題（抜粋）**
  - `nav.chart`：目的の 1〜2 文（bk.aim）が無く、図も無い。記号を「青の実線 / マゼンタの実線 / 青の破線」「マゼンタのぼかし / 青のぼかし」という言葉だけの表で説明しているので、初心者は形と色を想像できない。
  - `nav.chart`：誤り：空港データの例「LAB CT 118.3 ★ 55 L 60 122.95」で ★ を「飛行場灯台（★）」と説明しているが、FAA Chart Users' Guide では CT 周波数の後の ★ は「管制塔の運用が時間限定（part-time）」。回転灯台（beacon）は空港記号の上に付く別の記号。
  - `nav.chart`：同じ例の「60」（最長滑走路 6,000 ft）が、教材の LAB RWY 36（physics.js LAB_RWY len 1,200 m ≒ 3,940 ft → チャートの表記は「39」）と合わない。標高 55 ft（GROUND_FT）と CT 118.3（radio.js の LAB Tower）は合っている。
  - `nav.chart`：「FAA が定期的に改訂します」はあいまい。VFR チャート（Sectional・TAC）は 56 日ごとに改訂（FAA VFR Charts ページ・Chart Users' Guide）。PHAK 25C 第 16 章は 'revised semiannually' と古いままなので、ここは PHAK を根拠にしない。
  - （ほか 25 件）

### 書き直しの方針

navp は「地図を読む → 用語をそろえる → 針路を計算する → ログを作る → 飛んで直す」の順にする。nav.chart は最初に図 sectionalSymbols を置き、縮尺・56 日ごとの改訂・NM と SM・空港データ枠（★ の正しい意味）・空域の色・MEF・等偏差線を図の引き出し線と対応させて短く説明し、制限空域は law.special へ bk.see する。nav.plan は冒頭で航路・針路・方位と真・磁を定義し、TC → WCA → TH → 偏差 → MH → 自差 → CH の鎖と、別枝の磁航路 MC（91.159 で使う）を図 headingChain で示してから、作り直した windTriangle と計算機 wca を置く。ログ・燃料・巡航高度・91.103/91.151 は新しい節 nav.log（id: nav.log）へ移し、既定の飛行計画 LAB RWY → LAB-A → LAB-B の数字（6.4 NM・037°、7.7 NM・071°）で例を作る。nav.dr は地文航法と推測航法の違い → 手順 → 60 の法則の図 rule60 → ACS の基準（±200 ft・±15°・3 NM・±5 分）の順にし、key を 60 字以内に分割する。数値は「教材値（FL.physics：巡航 110 KIAS、燃料約 11 gal/h、偏差 6°W）」か「公開値（NOAA 約 7°W、POH）」かを毎回書く。sys.compass との重複は nav.plan に集約する。

節の最初の図（いちばん大事な図）：
- `nav.chart`：sectionalSymbols：架空の LAB 周辺の模式セクショナル（北が上）。青の LAB 空港記号と正しいデータ枠「LAB / CT 118.3 / 55 L 39 122.95」に引き出し線で意味を付ける、マゼンタの管制塔なし空港…
- `nav.plan`：headingChain：左から右へ「真航路 TC 090° →（風：左へ 7°）→ 真針路 TH 083° →（偏差 6°W：＋6）→ 磁針路 MH 089° →（自差 +2：自差カード）→ コンパス針路 CH 091°」の箱と矢印。上段…
- `nav.log`：navLog：シミュレーターの既定の飛行計画（avionics.js createAvionics の fpl：LAB RWY → LAB-A → LAB-B）を模式の帯地図と、その下のログ表で示す。区間 1：6.4 NM・磁航路 037°…
- `nav.dr`：rule60：北が上の平面図。出発点から予定の航路（破線）と実際の航跡（実線）。20 NM 飛んだ所で航路の右 2 NM → 外れた角度 6°、残り 40 NM で目的地へ戻すにはさらに 3°、合計 9° 左へ（計算機 rule60 の既定…

### 図

今の図：`windTriangle` → redo

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `sectionalSymbols` | `nav.chart` | 架空の LAB 周辺の模式セクショナル（北が上）。青い LAB（管制塔あり）とデータ枠「LAB / CT 118.3 / 55 L 39 122.95」の各部に引き出し線（標高・夜間灯火・最長滑走路 … | FAA Chart Users' Guide（2026-07-09）の記号。LAB 標高 55 ft（physics.js GROUND_F… | must |
| `chartAirspace` | `nav.chart` | 平面図で見た空域の描き方の早見：Class B（青の実線・階段の数字「70/SFC」）、Class C（マゼンタの実線）、Class D（青の破線）、Class E 地表（マゼンタの破線）、E 700… | FAA Chart Users' Guide（Airspace の項）。高度の数字は例（百 ft MSL）で、LAB 空域は架空。 | should |
| `headingChain` | `nav.plan` | 針路計算の鎖：TC 090 →（風：左へ 7°）→ TH 083 →（6°W：＋6）→ MH 089 →（自差 +2）→ CH 091。別枝 TC 090 →（＋6）→ MC 096（91.159 は… | 計算機 wca の既定値（TC 090・TAS 105・風 030/15 → WCA −7.1°）、MAGVAR_W 6（physics.j… | must |
| `cruisingAltitudes` | `nav.log` | コンパスの円を左右に分けた図：磁航路 0〜179°（東向きの半円）＝奇数千＋500 ft（3,500・5,500・7,500）、180〜359°（西向き）＝偶数千＋500 ft（4,500・6,500… | 14 CFR 91.159（eCFR）。 | should |
| `navLog` | `nav.log` | 既定の飛行計画 LAB RWY → LAB-A → LAB-B の帯地図とログ表（区間・磁航路・距離・GS・ETE・燃料・実際の時刻の空欄）。チェックポイントの印と「左右に挟む目印」の例。NFN の印… | avionics.js WAYPOINTS（LABRW −1200/−40000、LABEA 9000/−34000、LABEB 15000… | should |
| `rule60` | `nav.dr` | 60 の法則の幾何：20 NM で右へ 2 NM → 外れた角度 6°、残り 40 NM で目的地へ戻すなら ＋3° ＝ 9°。平行に戻す線と目的地へ向かう線を色分けし、式「60 × 外れた距離 ÷ … | 計算機 rule60 の既定値（20 NM・2 NM・40 NM）。 | must |

### 写真

- `nav.chart`：紙のセクショナルチャートとプロッター・E6B 計算尺（人の顔なし、机の上）
- `nav.plan`：小型機の磁気コンパスと、その下に貼られた自差カード（deviation card）
- `nav.dr`：上空から見たフロリダの目印（湖・大きな高速道路の交差・川）
- **未入手**（2026-10-26）：紙のチャートとプロッター・自差カード・上空から見たフロリダの目印（使える写真を探す時間を図に回した）。チャートの記号は図 `sectionalSymbols` で代えた。

### 章末

- 確認問題：Q1（真針路 095°・7°W → 102°）：keep（West is best の練習として良い。本文の実際値約 7°W とも合う） / Q2（91.159・磁航路 210° → 4,500 ft）：keep（本文で磁航路 MC を定義してから出す） / Q3（60 の法則：30 NM で 3 NM → 6°）：keep（計算機 rule60 と一致）
- 新しい問題の案：3 問（セクショナルチャートの空港データ「CT 118.3 ★」の ★ の意味は？；空港データ「55 L 39 122.95」の「39」は？；VFR の巡航高度（91.159）を決めるのに使う方位は？）
- 用語：Sectional chart / セクショナルチャート / 1:500,000・56 日ごとに改訂；Terminal Area Chart (TAC) / ターミナル・エリア・チャート / 1:250,000（Class B の周り）；Chart Supplement / チャート・サプリメント（空港の詳しい情報） / 旧 A/FD；Chart Users' Guide / チャート記号の手引き / FAA；Maximum Elevation Figure (MEF) / 区画の最大標高 / 30′×30′ の区画、百 ft 単位；Nautical mile (NM) / Statute mile (SM) / 海里・法定マイル / 1 NM ≒ 1.15 SM；（ほか 12 件）
- 出典：update：PHAK（FAA-H-8083-25C）は現行。第 16 章の直接リンク https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/chapter-16-navigation を併記；update：Chart Users' Guide は 2026-07-09 有効版 https://aeronav.faa.gov/user_guide/cug-complete_20260709.pdf（ページ https://www.faa.gov/air_traffic/flight_info/aeronav/…；add：FAA Private Pilot ACS（FAA-S-ACS-6C, Change 1）Area I Task D・Area VI Task A https://www.faa.gov/training_testing/testing/acs/private_airplane_acs_6.pdf（R.acsP…；add：14 CFR 91.159 / 91.151 / 91.103 の条文リンク（https://www.ecfr.gov/current/title-14/section-91.159 など）；keep：FAA VFR Charts（56 日ごと）・NOAA 磁気偏差計算（WMM-2025）

## 第 19 章 `navr` 電波航法と GPS（Radio navigation and GPS）

節：`nav.vor` VOR：ラジアルと追跡・`nav.dme` DME と位置の確かめ方・`nav.gps` GPS と G1000 の航法表示・`nav.fpl` （新）GPS の飛行計画を飛ぶ：区間・DTK と TRK・Direct-To・`nav.ff` レーダーによる交通情報（Flight following）

### 今の問題

- **誤り**
  - nav.dme「AIM では、高度 1,000 ft ごとに局から 1 NM 以上離れていれば誤差は小さい」→ 現在の AIM 1-1-7 に無い。IFH 第 9 章 'Slant range error is negligible if the aircraft is one mile or more from the ground facility for each 1,000 feet of altitude above the elevation of the facility'（https://www.f…
  - nav.vor「HSI では…TO で飛んでいれば逆に感じることはない」→ HSI はコースを正しく入れていれば TO でも FROM でも逆にならない。逆になるのは従来の CDI で選んだコースと反対向きに飛ぶとき（https://www.faa.gov/sites/faa.gov/files/18_phak_ch16.pdf 図 16-30 の説明）
  - nav.gps「PFD の上の欄に … 所要時間（ETE）」→ シミュレーターの PFD 上の欄は FROM→TO・DIS・DTK（avionics.js:371）。ETE は MFD（avionics.js:470）
- **古い**
  - nav.vor に VOR MON（AIM 1-1-3 f）が無い：VOR は削減中で、残す網（MON）の考え方が現在の AIM の中心（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap1_section_1.html）。
  - R.ifh の URL（https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/instrument_flying_handbook）は 404。IFH は FAA-H-8083-15B のまま現行（補遺 A・B と正誤表あり）。PDF https://www…
- **数値の食い違い**
  - GPS の CDI：本の表 ENR 2.0 / TERM 1.0 / APR 0.3 NM ↔ avionics.js cdiGps(xtk, 1.0)（navSolve で常に 1.0 NM）。quiz.js q_nav の「TERM 1.0 NM」は実機の値として正しい。
  - VOR の CDI：本 1 ドット 5°・いっぱい 10° ＝ avionics.js cdiVor（devDeg / 5、±2.5 で止まる）で一致。
  - 例「DME 5.0 NM・6,000 ft・局の真上へ → 真上で約 1.0 NM」：6,000 ft ＝ 0.99 NM で正しい（PHAK は 6,076 ft で 1.0 NM）。
  - （ほか 2 件）
- **わかりにくい**
  - TO/FROM・ラジアル・局へのコース（ラジアル＋180°）が表と文だけで、位置関係の図が無い（nav.vor）。
  - HSI と従来の CDI の reverse sensing の説明が「TO で飛んでいれば」と条件を誤っている（nav.vor）。
  - GPS の CDI の表が実機の値で、シミュレーターは 1.0 NM 固定であることが書かれていない（nav.gps）。
  - （ほか 1 件）
- **順番**
  - nav.vor：目的 → 図（ラジアル）→ TO/FROM と CDI（HSI の図）→ 識別 → 会合と追跡（図）→ 局通過 → VOR MON の 1 文。91.171 の点検表は最後に 1 行（または ifrp へ）。
  - nav.gps の後に新しい nav.fpl（GPS の飛行計画を飛ぶ）を置き、その後に nav.ff。
  - nav.ff は radio4 comm.radar の後に読む前提で、言い方は comm.radar に任せる。
- **重複**
  - nav.ff ↔ radio4 comm.radar（交通情報・AIM 4-1-15・radar service terminated）。
  - nav.gps の WAAS / LPV ↔ ifrp の ifr.np。
  - nav.dme の cross fix ↔ navd の nav.lost。
  - （ほか 1 件）
- **節ごとの問題（抜粋）**
  - `nav.vor`：目的の文も図も無い。「ラジアル＝局から出ていく線」「TO/FROM は位置で決まる」は平面図が無いと初心者には分からない（PHAK 16 も VOR indicator・HSI・追跡の図を 3 枚使う）。
  - `nav.vor`：VOR が今も維持される理由（VOR MON：GPS が使えないとき、米本土のどこでも 100 NM 以内に GPS に頼らない進入のある空港、5,000 ft AGL でほぼ途切れない受信。AIM 1-1-3 f）が無い。syllabus.js の課目 n1 の why は MON に触れているので、本にも 1〜2 文必要。
  - `nav.vor`：「使う前に必ず識別符号（モールス）を聞いて」は正しい（AIM 1-1-3：確かな識別方法はモールスか音声識別だけ）。ただしシミュレーターには識別音が無い（app.js / avionics.js に Morse の処理なし）ので「実機では」と書き、課目では周波数の表示で確かめると分ける。
  - `nav.vor`：表「CDI の針（G1000 の HSI）… 1 ドット 5°・2 ドットで 10°」は G1000 の HSI として正しい（avionics.js cdiVor も ±10°）。昔ながらの VOR 計器は片側 5 ドット・1 ドット約 2°（PHAK 図 16-29）なので、写真や他の機体で混乱しないよう一言。
  - （ほか 33 件）

### 書き直しの方針

navr は「VOR → DME → GPS → GPS の飛行計画（新）→ flight following」の順にする。nav.vor は最初に図 vorRadials でラジアルと TO/FROM の位置関係を見せ、次に G1000 の HSI を描いた hsiCdi で CRS・針・ドット（5°/ドット）・TO/FROM を説明し、会合と bracketing は課目 n1 の数字（インバウンド 040°、風 080°/12 kt、針が止まる針路 約 044°）の図 vorTracking で示す。VOR MON（AIM 1-1-3 f）と見通し距離を 1〜2 文足し、91.171 の点検表は 1 行に縮めて ifrp へ bk.see する。nav.dme は斜距離の図 dmeSlant を最初に置き、出典を IFH 第 9 章に直し、ラジアル＋DME の例を課目 n3 の出発点（030 ラジアル・約 11 NM）にそろえる。nav.gps は衛星・RAIM・WAAS・妨害を短く説明し、CDI の目盛りは実機の値とシミュレーターの 1.0 NM 固定を分けて書き、実機の DR モードに触れる。新しい節 nav.fpl（id: nav.fpl）で FPL・マゼンタの区間・DTK と TRK・XTK・D→・自動で次の区間へ進む実機と NEXT LEG を押すシミュレーターの違いを図 gpsFlightPlan で教える。nav.ff は教材の名前（LAB Approach・Archer Seven Lima Alpha）に直し、Class B は明示の許可が必要（91.131）を足し、言い方は radio4 comm.radar へ任せる。

節の最初の図（いちばん大事な図）：
- `nav.vor`：vorRadials：北が上の平面図。中央に LAB VOR（コンパスローズ、磁北が上）、ラジアル 040・130・220・310 を「局から外へ」の矢印で描き、220 ラジアル上の自機（課目 n1 の出発点、局の南西 約 12 NM）と、…
- `nav.dme`：dmeSlant：横から見た図。地上の LAB VOR から自機までの斜めの線（DME の距離）と水平の距離。例 1：局の真上・局から 6,000 ft 上 → DME 約 1.0 NM（水平 0）。例 2：水平 5.0 NM・6,000 …
- `nav.gps`：gpsCdiScale：上から見たコースの帯 3 本（ENR：左右 2.0 NM、TERM：1.0 NM、APR：0.3 NM）と、それぞれの CDI（2 ドットいっぱい）を並べた図。「出発空港から 30 NM・目的空港の 31 NM で …
- `nav.fpl`：gpsFlightPlan：MFD 風の模式地図（北が上）に既定の飛行計画 LAB RWY → LAB-A → LAB-B（いまの区間 LAB-A→LAB-B をマゼンタ、終わった区間を白）、自機の位置、DTK 071°（区間の線の向き）と…
- `nav.ff`：ffServices：左右 2 列の早見「してくれること（交通情報・safety alert・業務量が許せば誘導）」「してくれないこと（見張りの代わり・雲を避ける判断・Class B の許可）」と、真ん中に自機と他機の「1 時の方向・4 マ…

### 図

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `vorRadials` | `nav.vor` | LAB VOR のコンパスローズとラジアル 040・130・220・310（局から外への矢印）、220 ラジアル上の自機、CRS 040 のときの TO 側・FROM 側の色分け、「局へのコース＝ラジ… | avionics.js NAVAIDS（LBV 113.50、n 4000 / e −30000）、syllabus.js n1 setup… | must |
| `hsiCdi` | `nav.vor` | G1000 型 HSI の線画（画面写真ではない）：コンパスカード、CRS の矢印（040）、CDI の針（右 1 ドット）、左右 2 ドットの目盛り、TO の三角、自機の記号。目盛りの読み方の表：V… | avionics.js cdiVor（±10° いっぱい、5°/ドット）・cdiGps（1.0 NM いっぱい）。 | must |
| `vorTracking` | `nav.vor` | コース 040（TO）への会合（30°〜45°）と、風 080°/12 kt での bracketing：針路 040 → 流される → 050 → 戻りすぎ → 045 → 044 で針が止まる、を… | syllabus.js n1（obsOff −40、wind rel 80・12 kt）と school.js:259（風向 ＝ LAB_R… | should |
| `dmeSlant` | `nav.dme` | 横から見た斜距離の三角形 2 例（局の真上 6,000 ft → DME 約 1.0 NM、水平 5.0 NM・6,000 ft → 約 5.1 NM）と IFH の目安。 | 幾何（6,000 ft ＝ 0.99 NM、√(5.0² ＋ 0.99²) ＝ 5.10）。IFH 9 章、PHAK 16（6,076 ft… | must |
| `radialDmeFix` | `nav.dme` | 平面図：LAB VOR の 030 ラジアルと 11 NM の円弧の交点＝位置（課目 n3 の出発点）。小さな枠で、架空の 2 局目とのラジアルの交点（cross fix）の考え方。NFN。 | avionics.js LBV の位置、syllabus.js n3 setup（brg 30・km 20 ≒ 10.8 NM）。2 局目は… | should |
| `gpsCdiScale` | `nav.gps` | GPS の CDI の目盛り：ENR 2.0・TERM 1.0・APR 0.3 NM の帯の幅を同じ縮尺で並べ、切り替わる場所（出発空港から 30 NM、目的空港の 31 NM）を注記。「この教材の課… | Garmin G1000 CDI Scaling（https://www8.garmin.com/manuals/webhelp/GUID-… | should |
| `gpsSatellites` | `nav.gps` | 衛星の数と分かること：4 機 → 3 次元の位置、5 機（または 4 機＋気圧高度）→ RAIM で異常に気づける、WAAS → 精度と完全性の補強。地上の受信機の上に衛星のアイコン。 | AIM 1-1-17・1-1-18。 | nice |
| `gpsFlightPlan` | `nav.fpl` | MFD 風の模式地図：LAB RWY → LAB-A → LAB-B（いまの区間マゼンタ）、自機、DTK と TRK の矢印、XTK、LAB-F への D→ の破線、下に PFD 上の欄の見本。NFN… | avionics.js WAYPOINTS（LABRW→LABEA 6.39 NM・MC 037°、LABEA→LABEB 7.73 NM・… | must |
| `ffServices` | `nav.ff` | flight following で「してくれること／してくれないこと」の 2 列と、時計の方位（1 時・4 マイル）の小さな図。 | AIM 4-1-15・4-1-16・4-1-18、14 CFR 91.131(a)(1)、radio4 comm.radar の交信例。 | nice |

### 写真

- `nav.vor`：VOR / VORTAC の地上局（白い円盤状のアンテナ群、人の顔なし）
- `nav.gps`：GPS 衛星（GPS III など）の想像図または写真
- `nav.ff`：空港監視レーダー（ASR-9 / ASR-11）のアンテナ
- **入手**（2026-10-26）：VOR/DME の地上局（`vorStation`、`nav.vor`）。**未入手**：GPS 衛星（米国政府の画像が検索で見つからず、メーカーの想像図は使わない）。レーダーのアンテナの写真は第 10 章 `asrRadar` にある。

### 章末

- 確認問題：Q1（VOR・左にいっぱい → 左に 10° 以上）：keep（問いを「選んだコースは自機から見てどちら？」に直す） / Q2（TO/FROM は位置で決まる）：keep（quiz.js q_nav 6 問目と同じ。図 vorRadials と結ぶ） / Q3（91.171 空中の指定点 ±6°）：fix / replace（IFR 用の細目で、VFR の初心者の章には早い。点検表を ifrp へ移すなら、この問題も ifrp へ。代わりに識別の問題を入れる）
- 新しい問題の案：3 問（VOR を航法に使う前に必ずすることは？；flight following を受けながら Class B 空域に近づいた。入ってよいのはいつ？；GPS の区間の DTK は 071°。いまの TRK は 066°。どうする？）
- 用語：VOR / 超短波全方向式無線標識 / 108.00〜117.95 MHz；VOR MON (Minimum Operational Network) / VOR の最小運用網 / AIM 1-1-3；Radial / ラジアル（局から外へ向かう磁方位の線） / 局へのコース＝ラジアル＋180°；Identifier (Morse code) / 識別符号（モールス） / ；OBS / CRS / コースの選択 / ；TO / FROM / 局へ／局から / 位置で決まる；（ほか 13 件）
- 出典：update：AIM は第 1 章第 1 節に直接リンク https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap1_section_1.html（1-1-3 VOR・MON、1-1-7 DME、1-1-13 報告、1-1-17 GPS、1-1-…；fix：R.ifh の URL が 404 → https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-15B.pdf（15B が現行、補遺・正誤表あり）；add：Garmin G1000 CDI Scaling https://www8.garmin.com/manuals/webhelp/GUID-1FA95EDE-BA0A-4000-B109-7E73945389F7/EN-US/GUID-F35157A0-1CF4-4AAD-A042-35129CCF5C7D.h…；add：FAA Private Pilot ACS（FAA-S-ACS-6C）Area VI Task B Navigation Systems and Radar Services（R.acsP）；add：14 CFR 91.131（Class B の許可）https://www.ecfr.gov/current/title-14/section-91.131、91.171 は ifrp へ移すならそちらへ；（ほか 1 件）

## 第 20 章 `navd` 目的地変更・現在地を見失ったとき（Diversions and lost procedures）

節：`nav.xc` クロスカントリー飛行の組み立て・`nav.divert` 目的地変更（Diversion）・`nav.lost` 現在地を見失ったとき

### 今の問題

- **誤り**
  - nav.lost「FAA の教材でよく使われる手順は 4C（または 5C）」→ PHAK 25C の Lost Procedures に 4C の語は無い（上昇・目印・VOR の方位・GPS・交信・121.5 と 7700）。4C/5C は訓練の覚え方（https://www.faa.gov/sites/faa.gov/files/18_phak_ch16.pdf 16-34）
  - nav.divert「まず向きを変え…（PHAK の考え方）」は一部不正確：PHAK は時間があれば目立つ目印の上から始め、緊急ならすぐ向かう。コースに乗ったら時刻を記録して上空の風で計算（https://www.faa.gov/sites/faa.gov/files/18_phak_ch16.pdf 16-34〜35）
- **古い**
  - nav.xc：VFR 飛行計画は FSS に出すとき FAA Form 7233-4（ICAO 形式）を使う（7233-1 は国防総省と stereo route だけ）（https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap5_section_1.html AI…
- **数値の食い違い**
  - 例「18 NM・105 kt ＝ 約 10 分・燃料 1.6 gal」：10 分は正しい（18 ÷ 1.75 ＝ 10.3）。燃料 1.6 gal は 9.5 gal/h 前提で、FL.physics（105 KIAS で約 10.8 gal/h）なら約 1.9 gal。
  - 表「105 kt ＝ 約 1.75 NM/分、12 NM なら約 7 分」：正しい（6.9 分）。quiz 3 問目（14 NM → 8 分）も正しい。
  - 課目 n2 の目的地変更（本の例に使う）：LAB-A → LAB-F 5.96 NM・磁方位 180.8°（avionics.js WAYPOINTS、MAGVAR_W 6）。風 270°/12 kt（syllabus.js:281 wind rel 270 → school.js:259 で真 264° ＝ 磁 270°）、TAS 10…
  - （ほか 2 件）
- **わかりにくい**
  - 4C / 5C が FAA の手順のように書かれているが、PHAK・AIM にその語は無い（nav.lost）。
  - 目的地変更の「針路」と課目 n2 で採点される「磁方位」の違い（nav.divert）。
  - VFR 飛行計画を誰が・いつ開き、いつまでに閉じるか（AIM 5-1-5・5-1-14）があいまい（nav.xc）。
- **順番**
  - 章の順を nav.xc → nav.divert → nav.lost に（準備 → 飛行中の変更 → 迷ったとき）。id は変えない。nav.xc の「代わりの空港を航路沿いに準備」と「時刻を記録」が後の 2 節の前提になる。
  - nav.xc の表で PAVE / IMSAFE を 1 番に。
  - nav.divert は PHAK の順（選ぶ → おおよその航路 → すぐ向かう → 時刻を記録 → 針路・GS・到着時刻・燃料 → 確かめる → 伝える）に。
  - （ほか 1 件）
- **重複**
  - 60 の法則：nav.divert の表 ↔ navp nav.dr ↔ quiz.js q_nav 10 問目。
  - cross fix：nav.lost ↔ navr nav.dme。
  - PAN-PAN・121.5・7700・伝える順番：nav.lost ↔ radio5 comm.xpdr（AIM 6-3-2）。
  - （ほか 2 件）
- **節ごとの問題（抜粋）**
  - `nav.xc`：節の形が無い：目的の文・図・ここが大切が無く、表と注意だけ。章のまとめなのに、どこで何をするかの流れ（時間の順）が見えない。
  - `nav.xc`：順番：表の 7 番「自分の体調（IMSAFE）と危険の評価（PAVE）」は最初にすべき（ACS PA.I.D の危険の項目も Pilot が最初、hf 章の PAVE も P が先）。
  - `nav.xc`：「VFR 飛行計画の提出（FSS）と、到着後の終了 — AIM 第 5 章」→ AIM 5-1-5（VFR の飛行計画）と 5-1-14（閉じる）を名指し。米本土の VFR では飛行計画は通常は義務ではないが強く勧められる、FSS に出すときは FAA Form 7233-4（ICAO 形式）を使う、管制塔は自動で開かない・閉じない（AI…
  - `nav.xc`：注意「閉じないと捜索が始まる」→ 具体的に「到着予定時刻から 30 分以内に閉じないと捜索救難の手続きが始まる」（AIM 5-1-14）。出発の予定時刻を使って自動で開く方法（assumed departure time）もある（AIM 5-1-5）。
  - （ほか 21 件）

### 書き直しの方針

navd は「準備（nav.xc）→ 飛行中の目的地変更（nav.divert）→ 現在地を見失ったとき（nav.lost）」の順に並べ替える（id は変えない）。nav.xc は時間の流れの図 xcTimeline を最初に置き、PAVE / IMSAFE を 1 番に、VFR 飛行計画は AIM 5-1-5（FSS に Form 7233-4 で出す・自分で開く）と 5-1-14（ETA から 30 分で捜索）を具体的に書く。nav.divert は図 diversionGeometry と課目 n2 の数字（LAB-A → LAB-F 約 6 NM・181°・約 3.5 分）で、PHAK の手順（選ぶ → おおよその航路 → すぐ向かう → 時刻 → 針路・GS・到着時刻・燃料 → 確かめる → ATC に伝えて復唱）を示し、ANA の公開情報は独立した 1 文（bk.fact）で残して「まず向きを変え」の語を保つ。60 の法則は nav.dr を参照するだけにする。nav.lost は流れ図 lostFlow を最初に置き、4C / 5C を「訓練でよく使う覚え方」として紹介し、根拠は PHAK の Lost Procedures と AIM 6-2-1・6-3 にする。PAN-PAN の言い方は radio5 comm.xpdr へ bk.see し、課目 n3 の bk.sim には NAV1 の周波数の入れ替え（⇄）と CDI の切り替えを書く。例と通話は教材の名前（LAB Approach・Archer Seven Lima Alpha・LAB-F）にそろえ、燃料は教材モデル値（約 11 gal/h）か POH の値かを書く。

節の最初の図（いちばん大事な図）：
- `nav.xc`：xcTimeline：左から右の時間の帯。準備（PAVE・IMSAFE → 天気 → NOTAM・TFR・空域 → 航路・チェックポイント・高度 → 性能・重量重心・燃料と予備 → 航路沿いの代わりの空港 → 飛行計画を出す）→ 出発（飛行…
- `nav.divert`：diversionGeometry：北が上の模式図。予定の航路 LAB RWY → LAB-A → LAB-B（灰色）、LAB-A の先に雨雲、LAB-A 付近から LAB-F への新しい線（マゼンタの破線）に「① まず向きを変える」、VO…
- `nav.lost`：lostFlow：上から下の流れ図。「① 操縦を続ける（姿勢・高度・燃料を確かめる）」→「② Climb（雲・空域に注意。電波とレーダーが届きやすく、遠くまで見える）」→「③ Communicate・Confess（LAB Approach…

### 図

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `xcTimeline` | `nav.xc` | クロスカントリーの時間の帯：準備（PAVE・IMSAFE → 天気 → NOTAM・TFR・空域 → 航路・高度 → 性能・燃料 → 代わりの空港 → 飛行計画を出す）→ 出発（開く・flight f… | ACS PA.I.D（Cross-Country Flight Planning）、AIM 5-1-5・5-1-14、14 CFR 91.1… | should |
| `diversionGeometry` | `nav.divert` | 目的地変更の模式図：予定の航路、前方の雨雲、LAB-F への新しい線、①向きを変える ②見積もる（距離 6 NM・時間 3.5 分・燃料 0.6 gal）③最初の目印で確かめる、VOR のコンパスロー… | avionics.js WAYPOINTS（LABEA 9000/−34000、LABEF −2000/−33000 → 5.96 NM・M… | must |
| `lostFlow` | `nav.lost` | 迷ったときの流れ図：操縦を続ける → Climb → Communicate / Confess → Comply → Conserve、横に「自分で位置を出す」の枝と「予防着陸」の出口。各箱に一言の… | PHAK 16 Lost Procedures、AIM 6-2-1・6-2-2・6-3-2、ACS PA.VI.D、訓練の覚え方 4C/5C… | must |
| `lostFixArea` | `nav.lost` | 平面図：最後に確かめた位置から「針路 × 時間」の扇形の範囲、その中の大きな目印（湖・高速道路・海岸線）、LAB VOR の 030 ラジアルと DME 11 NM の交点で位置が決まる様子、局から … | syllabus.js n3 setup（brg 30・km 20・hdg 120・kt 100）、avionics.js LBV と LA… | should |

### 写真

- `nav.divert`：前方に発達した積乱雲（雷雨）— 迂回・目的地変更の理由
- `nav.lost`：町の名前が書かれた給水塔（water tower）
- `nav.lost`：宇宙から見たフロリダ半島（海岸線・大きな湖が目印になる）
- **未入手**（2026-10-26）：雷雨の写真は第 5 章 `cbFlorida` と重なるので使わない。町の名前が見える給水塔・宇宙から見たフロリダ半島は、使える写真が見つからなかった。図 `diversionGeometry` だけにした。

### 章末

- 確認問題：Q1（目的地変更でまずすること → おおよその方向へ旋回）：keep（PHAK・ACS PA.VI.C.S6 'Promptly divert' と一致） / Q2（4C に含まれないもの → Circle until found）：fix（問いを「訓練でよく使われる覚え方 4C / 5C に含まれないものは？」にして、FAA の手順とは書かない） / Q3（105 kt で 14 NM → 約 8 分）：keep（計算は正しい）
- 新しい問題の案：3 問（VFR 飛行計画を閉じ忘れると、捜索救難の手続きが始まるのは到着予定時刻のおよそ何分後？；VFR 飛行計画を開く（activate）のは誰？；現在地がわからない。最初の無線として適切なのは？）
- 用語：Cross-country / クロスカントリー（離れた空港への飛行） / ；VFR flight plan / VFR 飛行計画 / FAA Form 7233-4・AIM 5-1-5；Flight Service Station (FSS) / 飛行情報業務 / 飛行計画の受付・天気；Activate / Close a flight plan / 飛行計画を開く・閉じる / ETA ＋30 分で捜索（AIM 5-1-14）；Search and rescue (SAR) / 捜索救難 / ；Diversion / 目的地変更 / 'Promptly divert'（ACS）；（ほか 8 件）
- 出典：update：PHAK 25C 第 16 章（Flight Diversion・Lost Procedures、16-34〜35）https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/chapter-16-navigation；add：AIM 5-1（5-1-5 VFR の飛行計画・5-1-14 閉じる）https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap5_section_1.html；add：AIM 6-2（6-2-1 困っている VFR 機へのレーダー援助・6-2-2 7700）https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap6_section_2.html と AIM 6-3（R.aim63）；add：FAA Private Pilot ACS（FAA-S-ACS-6C）Area I Task D・Area VI Task C / D（R.acsP）；keep：ANA の公開ページ（R.ana1）— nav.divert の CADET テストが実名を前提にしている。内容（目的地変更の再計算・現在地を見失った場合の対処）は確認済み

## 第 21 章 `ifr` 計器による飛行：計器・スキャン・故障

節：`ifr.instr` 計器の仕組みと故障の見分け方・`ifr.scan` 姿勢による計器飛行とスキャン・`ifr.partial` 部分パネル（姿勢・方位の故障）・`ifr.upset` 異常姿勢からの回復

### 今の問題

- **誤り**
  - FIG.scan：左下に独立した「旋回率」計を描き『G1000 では…が並ぶ』とする → G1000 型 PFD では旋回率は HSI の上の表示（trend vector）、すべりはロール指針の下（IFH p.6-24 https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-15B.pdf）
  - ifr.instr「ピトー管だけ詰まる（排水孔も）→ 高度計のように動く」→ 入口だけ詰まり排水孔が開いていれば速度計は 0 へ下がる。入口と排水孔の両方が詰まると高度計のように動く（PHAK 第 8 章 https://www.faa.gov/sites/faa.gov/files/10_phak_ch8.pdf）
  - ifr.upset「AC 120-111 の UPRT…Push・Roll・Power・Stabilize」→ AC の機首上げテンプレートは AP/AT OFF → PITCH 機首下げ → THRUST 必要なら調整 → RECOVER。Roll は押しても機首下げにならないときだけ（AC 120-111 CHG 1 Table 1・3 https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-111_CHG_1_Ed_Upd_3.pd…
  - ifr.upset ここが大切「順番（出力・翼・機首）」→ 機首上げ・低速では IFH の順は『出力 → 機首を下げる → 翼を水平』。『出力・翼・機首』はスパイラルだけ（IFH p.7-27〜7-28）
  - examples「100 kt・標準旋回のバンク ＝ 100 ÷ 10 ＋ 7 ＝ 約 17°」→ 正確には約 15°（同じ章の FIG.standardRate、IFH p.7-19：100 kt で約 15°）
- **古い**
  - R.ifh の URL https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/instrument_flying_handbook は 404。版は今も FAA-H-8083-15B（2026-10 時点で 15C はない）。PDF：https://www.…
  - R.upset が AC の一覧ページを指している。AC 120-111 は Change 1（2017-01-04、Editorial Update 3）。直接の URL に
  - スパイラルの回復は AFH 3C（2021）第 5 章 UPRT で『unload（少し押す）』の手順が加わった。本文は古い IFH の 3 段階だけ
  - （ほか 1 件）
- **数値の食い違い**
  - 標準旋回のバンク：syllabus.js 課目 i1 の brief は『100 kt でバンク約 17°（速度 ÷ 10 ＋ 7）』、目安 g.bank: 17（i1・i4）。FIG.standardRate の正確な値は 100 kt で 15°。3,000 ft の 100 KIAS は TAS 約 105 kt で正確には約 16…
  - quiz.js q_ifr の 2 問目：120 kt →『速度 ÷ 10 ＋ 7 ＝ 19°（正確な計算でもほぼ同じ）』。正確は 18°、IFH の 15% 則でも 18°。選択肢（12・15・19・30）では 19 が最も近いので答えは変わらないが、理由の文は IFH 第 7 章と合わない
  - Va 113 kt（本文）＝ FL.physics pa28.v.va 113 ✓。Vne 154・最大荷重 3.8 G（phys.maxG、i2 の std）は本文にないので加える
  - （ほか 2 件）
- **わかりにくい**
  - ifr.instr：「ピトー管だけ詰まる（排水孔も）」— 『だけ』と『も』が矛盾
  - ifr.instr：「代替静圧（機内）を使う」の理由（機内の圧力は外より低い）がない
  - ifr.scan：「Control and Performance」「Primary and Supporting」が訳なし。「例：水平飛行のピッチ ＝ 高度計が主」は説明が短すぎる
  - （ほか 4 件）
- **順番**
  - ifr.instr（故障の見分け方）が ifr.scan（基本の見方）より前。課目 i1 は ifr.scan から始まり、故障に気づく方法はクロスチェックを知ってからの方がわかる → ifr.scan → ifr.instr → ifr.partial → ifr.upset
  - ifr.scan 内：方法の表 → 誤りの表 → 標準旋回 → 許容幅、と散らかる。スキャン（図）→ 操作の計器と性能の計器 → 標準旋回・上昇降下 → よくある誤り（bk.warn）→ 許容幅、にする
  - ifr.upset のエアライン UPRT の段落は crm.upset（第 6 部）へ移し、ここは小型機の IFH／AFH の手順だけにする
- **重複**
  - ifr.instr の詰まりの表・ADC／AHRS の表 ↔ sys.g1000（同じ内容。sys.g1000 の方が『ピトー管と排水穴の両方』と正しく書いている）
  - ifr.partial の UNOS／ANDS の表 ↔ sys.compass
  - ifr.scan の空間識失調の説明 ↔ hf.body（リンクだけでよい）
  - （ほか 3 件）
- **節ごとの問題（抜粋）**
  - `ifr.instr`：目的の文（bk.aim）がなく、いきなり表 2 つで始まる。図もないので CADET の教室スクリーンに何も出ない
  - `ifr.instr`：表の行「ピトー管だけ詰まる（排水孔も）」は自己矛盾。PHAK 第 8 章は 2 通りを分ける：入口だけ詰まり排水孔が開いている → 速度計は 0 へ下がる／入口と排水孔の両方が詰まる → 高度計のように動く。前者が抜けている
  - `ifr.instr`：「非常用バッテリーで予備計器は動く（第 16 章）」：予備の速度計・高度計は空気圧で動くので電気はいらない。電池が必要なのは電気式の予備姿勢指示器（動く時間は AFM で確認）
  - `ifr.instr`：詰まりの表と ADC／AHRS の表は sys.g1000 とほぼ同じ内容（重複）。ここでは『どう気づくか』（クロスチェックの例）に絞り、仕組みは sys.g1000 へリンク
  - （ほか 24 件）

### 書き直しの方針

節の順を ifr.scan → ifr.instr → ifr.partial → ifr.upset に変える（基本のクロスチェックを先に、その上で故障に気づく方法、部分パネル、異常姿勢）。ifr.scan は最初に『外が見えないと体の感覚は当てにならない → 姿勢表示を中心に見る』を 1〜2 文で言い、G1000 型 PFD の配置図を最初の図にして、操作の計器と性能の計器、IFH の始め方（中央の黄色い機首記号から）、標準旋回（IFH の 15% 則と ÷10＋7 の両方、正確な表は残す）と課目 i1 の 500 fpm 上昇降下を説明し、誤りは bk.warn に。ifr.instr は仕組みの重複を削って sys.g1000 へリンクし、『赤い × がどこに出たらどの装置か』と『仲間はずれ探し』の 2 例に絞る（詰まりの行は PHAK どおり 2 行に分ける）。ifr.partial は赤い × の画面の図を最初に置き、予備計器・時間で測る旋回・GPS の TRK（課目）とコンパス（実機）の使い分けを書き、UNOS／ANDS は sys.compass へのリンク 1 行にする。ifr.upset は 2 つの状態と回復順の図を最初に置き、IFH の順（機首上げ：出力 → 機首 → 翼、スパイラル：出力 → 少し押す（AFH 3C）→ 翼 → 機首）と FL.physics の Va 113 kt・Vne 154 kt・3.8 G を示し、『実機は POH/AFM が優先』を明記、AC 120-111 の段落は crm.upset へ移して 1 行のリンクだけ残す。新しい節は不要。

節の最初の図（いちばん大事な図）：
- `ifr.instr`：系統の模式図：ピトー管・静圧孔（代替静圧）→ ADC → 速度・高度・昇降率テープ／AHRS（ジャイロ・加速度・磁気センサー）→ 姿勢・方位／GPS → 航跡（TRK）。各装置が故障すると G1000 型 PFD のどこに赤い × が出るか…
- `ifr.scan`：G1000 型 PFD の配置模式図（左に速度テープ、中央に姿勢と黄色い機首記号、右に高度テープと昇降率、下に HSI とその上の旋回率表示、MFD 側の回転計＝出力）。中央の姿勢から各計器へ出て戻る矢印。操作の計器（姿勢・出力）と性能の計…
- `ifr.partial`：AHRS 故障時の G1000 型 PFD 模式図：姿勢と HSI に赤い ×、生きている速度・高度・昇降率テープ、右下の予備計器（姿勢・速度・高度）と GPS の TRK 表示を強調。横に『90° ＝ 標準旋回で 30 秒』の時間旋回の小…
- `ifr.upset`：2 列の模式図：左＝機首上げ・速度減少（姿勢が上・速度テープが下がる・高度増加）→ ①出力を上げる ②機首を下げる ③翼を水平。右＝機首下げ・スパイラル（大きな傾き・速度増加・高度急減）→ ①出力アイドル ②少し押して荷重を抜く ③翼を水平…

### 図

今の図：`scan` → redo、`standardRate` → fix

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `pitotStaticAhrs` | `ifr.instr` | 系統図：ピトー管・静圧孔・代替静圧・排水孔 → ADC → 速度・高度・昇降率／AHRS → 姿勢・方位／GPS → TRK。各装置の故障で G1000 型 PFD のどこに赤い × が出るか、独立し… | sys.g1000 の装置表・PHAK 第 8 章・IFH 第 5 章（数値なし） | must |
| `crossCheckOddOne` | `ifr.instr` | 『仲間はずれ探し』の 2 例：①姿勢は水平・出力同じ・速度一定なのに高度計が止まり昇降計 0 → 静圧の詰まり ②昇降計は降下・高度は減るのに姿勢表示は水平のまま → 姿勢の故障。計器の小さな絵に ○… | PHAK 第 8 章（定性的） | should |
| `scan` | `ifr.scan` | 既存キーの描き直し：G1000 型 PFD 配置の模式図。中央の姿勢（黄色い機首記号）から速度・高度・昇降率・方位・旋回率表示へ出て戻る矢印、MFD 側の回転計（出力）。操作の計器（緑）と性能の計器（… | IFH p.6-24（スキャンの順）、avionics.js の PFD 配置（速度テープ左・高度テープ右・VSI・HSI 下） | must |
| `standardRateChart` | `ifr.scan` | 横軸 真対気速度 60〜160 kt、縦軸 バンク角。正確な標準旋回の曲線、15% 則、÷10＋7 の 3 本と、Archer の巡航 110 kt・課目の 100 kt の縦線 | tanφ ＝ 3V/1091（FIG.standardRate と同じ式）、FL.physics pa28.v.cruise 110 | nice |
| `ahrsFailPfd` | `ifr.partial` | AHRS 故障の G1000 型 PFD 模式図：姿勢と HSI に赤い ×、使える速度・高度・昇降率テープと右下の予備計器（姿勢・速度・高度）、TRK 表示を強調。横に時間旋回の小図（標準旋回 3°… | avionics.js の AHRS 故障表示（AHRS FAIL・右下の STBY）、3°/秒 | must |
| `compassTurnErrors` | `ifr.partial` | 北半球のコンパスの旋回誤差：北へ向かう旋回は手前で止める（UNOS）、南へ向かう旋回は越えてから止める。円形の方位図に止める位置の矢印。加速誤差（ANDS）は小さな表で | IFH 第 5 章・PHAK 第 8 章（定性的。IFH の図 5-20 は正誤表で取り消し済みなので参考にしない） | nice |
| `upsetRecovery` | `ifr.upset` | 2 列：機首上げ・低速（計器の見え方 → ①出力 ②機首下げ ③翼水平）と機首下げ・スパイラル（→ ①出力アイドル ②少し押す ③翼水平 ④ゆっくり機首上げ）。下に Va・Vne・最大荷重 | IFH p.7-27〜7-28、AFH 3C 第 5 章、FL.physics pa28（v.va 113、v.ne 154、phys.ma… | must |

### 写真

- `ifr.instr`：小型機の主翼の下のピトー管（できれば排水孔が見えるもの）
- `ifr.instr`：胴体側面の静圧孔（static port）
- `ifr.scan`：雲の中を飛ぶ小型機（または操縦席から見た雲の中・水平線なし）。顔が写らないもの
- `ifr.partial`：小型機の磁気コンパス（whiskey compass）と自差カード
- **未入手**（2026-10-26）：雲の中を飛ぶ小型機（使える写真が見つからなかった）。ピトー管・静圧孔・磁気コンパスは第 2・3 章の写真（`pitot`・`staticPort`・`compass`）と重なるので使わない。図 `scan` だけにした。

### 章末

- 確認問題：Q1（静圧孔が詰まった・降下中の速度計）：keep。答えは正しい（PHAK）。理由の『静圧が高い高度のまま閉じ込められ』は『静圧が高い』と読めて逆。『詰まった高度の（低い）静圧が閉じ込められ、降下で外の圧力が上がりピトー側だけ増えるので多め… / Q2（スパイラルの回復順）：keep。理由に AFH 3C の『翼を水平にする前に少し押して荷重を抜く』を一言足す / Q3（北へ向かう旋回をコンパスで止める）：keep。UNOS は正しい（IFH・PHAK）
- 新しい問題の案：4 問（G1000 型 PFD で、姿勢表示と方位（HSI）に赤い × が出た。故障したのは？；姿勢による計器飛行で、飛行機を『操作する』計器（control instruments）はどれ？；真対気速度 100 kt で標準旋回（3°/秒）に必要なバンク角に最も近いのは？（IFH の『速度の 15%』）；ピトー管の入口だけが詰まり、排水孔は開いている。速度計はどうなる？）
- 用語：Control instruments / Performance instruments ／ 操作の計器・性能の計器 ／ IFH 第 6 章；Primary / Supporting instruments ／ 主な計器・補助の計器；Pitot tube / Static port / Drain hole ／ ピトー管・静圧孔・排水孔；Standby instruments ／ 予備計器（姿勢・速度・高度）；Turn rate indicator (trend vector) ／ 旋回率表示（G1000 型 PFD の HSI の上）；Slip/skid indicator ／ すべり表示（ロール指針の下の三角）；（ほか 6 件）
- 出典：update: FAA Instrument Flying Handbook（FAA-H-8083-15B）— 版は現行、URL を PDF に https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation…；add: IFH 正誤表 https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/ifh_errata.pdf；update: FAA AC 120-111 Upset Prevention and Recovery Training（Change 1）https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-111_CHG_1_Ed_Upd_3.pdf…；add: FAA Airplane Flying Handbook（FAA-H-8083-3C）第 5 章 UPRT https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_hand…；add: PHAK 第 8 章 Flight Instruments https://www.faa.gov/sites/faa.gov/files/10_phak_ch8.pdf（R.phak の章リンクとして）；（ほか 1 件）

## 第 22 章 `ifrp` 計器飛行方式：規則・待機・ILS 進入

節：`ifr.rules` IFR の規則の要点・`ifr.hold` 待機経路（ホールディング）・`ifr.chart` （新設の提案）進入図の読み方：架空の LAB ILS RWY 36・`ifr.ils` ILS 進入・`ifr.np` 非精密進入・進入復行・自動操縦との関係

### 今の問題

- **誤り**
  - FIG.holding：フィックスがアウトバウンドの始まりにあり、区切り線が縦線と約 42° の斜線 → フィックスはインバウンドの終わり。区切りはインバウンドコースの延長と、フィックスを通りインバウンドコースと 70° をなす線（AIM 5-3-8 FIG 5-3-4・『70 degree line on the holding side』 https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap5_section_3.html）
  - ifr.hold「旋回は標準旋回率（バンク 25° を超えない）」→ 3°/秒・バンク 30°・フライトディレクター使用時 25° のうち最も浅いもの（AIM 5-3-8 Bank Angle）
  - FIG.ils：断面図に『ローカライザー：横方向（左右のずれ）』と書く → 左右の誘導は平面図でしか示せない。平面図と断面図の 2 段にする（AIM 1-1-9 https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap1_section_1.html）
  - ifr.ils「約 ±2.5°（滑走路端で幅 700 ft になるよう調整される）」→ 幅を 700 ft に合わせるので角度は滑走路ごとに変わる。±2.5°（幅 5°）は IFH の『ふつうの値』（IFH p.9-37 https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-15B.pdf）
- **古い**
  - R.ifh の URL は 404（版は現行の 15B）。PDF の URL に。IFH Addendum B（2019、偽のグライドスロープ）https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/ifh_addend…
  - AIM 5-3-8 は固定翼機の待機を 90 KIAS 以上で行うよう勧めている（本文にない）。AIM は 2026-07-09 発効の Change 3 を確認、段落番号 5-3-8・1-1-9 は変わらない
  - IPH は今も FAA-H-8083-16B（2017）。計器飛行 ACS は 8C で現行（2024-05-31 発効の版）。どちらも変更不要
  - （ほか 1 件）
- **数値の食い違い**
  - ILS の降下率：本文『90 kt なら約 450 fpm（対地速度 × 5）』↔ syllabus.js:352 i5『80 kt・約 −430 fpm（フラップ 10°）』。3° では 80 × 5.3 ≈ 425 fpm で課目が正確。本文を課目の 80 kt・430 fpm にそろえる
  - ILS の基準：本文の ACS『3/4 スケール以内』↔ syllabus.js:353 i5『LOC・GS ±1 ドット（地上 1,000〜200 ft の 85% 以上）』。±1 ドットは ACS の 3/4 スケール（2 ドット中 1.5）より厳しい教材値と書く
  - ローカライザーの幅：本文『滑走路端で幅 700 ft』↔ avionics.js:94-96・204（±2.5° 固定、アンテナは 1,200 m の滑走路の先 300 m）では LAB の滑走路端で幅約 430 ft。本文は『±2.5° は代表値・教材の I-LAB の値』とする
  - （ほか 4 件）
- **わかりにくい**
  - ifr.rules：「代替の標準の最低気象条件は精密進入 600 ft・2 SM、非精密進入 800 ft・2 SM（決まりがあればそれに従う）」— 『代替飛行場として計画に書ける条件』であって、そこへ降りるときの最低気象条件ではないことが伝わらない
  - ifr.rules：「進入の最低高度（91.175）」— DA と MDA の違い（DA は降りながら判断する高度、MDA は水平に保つ最低高度）が説明なし
  - ifr.hold：「アウトバウンドの偏流修正はインバウンドの約 3 倍が目安」— 例（インバウンドで左 8° → アウトバウンドで右 24°、AIM）があるとわかる
  - （ほか 4 件）
- **順番**
  - ifr.ils の準備で『進入図（チャート）のブリーフィング』と言うが、進入図をまだ見せていない。新しい節 ifr.chart（進入図の読み方：架空の LAB ILS RWY 36 の模式図）を ifr.hold と ifr.ils の間に置く
  - ifr.rules は『出発前 → 飛行中 → 進入』の順に表を分け、91.173（計画と許可）を最初に、91.185（無線故障）を飛行中に入れる
  - ifr.np は『非精密進入とは → RNAV（GPS）の最低気象条件の種類 → CDFA と dive and drive（図）→ MDA・VDP・MAP → 進入復行 → 自動操縦の一文』の順にする
- **重複**
  - ifr.rules の『VFR は昼 30 分・夜 45 分（91.151）』（quiz の理由）↔ law.vfr
  - ifr.rules の CRAFT・復唱 ↔ comm.readback／comm.dep（IFR の許可の復唱の例はどちらか一方に）
  - ifr.np の LPV・WAAS ↔ nav.gps（『LPV という精密に近い進入』）
  - （ほか 3 件）
- **節ごとの問題（抜粋）**
  - `ifr.rules`：目的の文がなく、6 項目を 1 つの表に詰め込んでいる。『出発前（資格・計画・燃料・代替）／飛行中（許可・最低高度・無線故障）／進入（DA・MDA）』の順に分けないと初学者には使う場面が見えない
  - `ifr.rules`：前提が書かれていない：管制空域を IFR で飛ぶには飛行計画と ATC の許可が必要（91.173）、計器飛行証明が必要（61.3(e)）
  - `ifr.rules`：IFR で無線が故障したとき（91.185）がない：VFR の天気なら VFR で早く着陸、IMC なら経路（指示された経路 → 誘導中ならその先のフィックスへ直行 → 予告された経路 → 飛行計画の経路）、高度（最後の指示・最低 IFR 高度・予告された高度のうち最も高いもの）。comm.nordo は VFR の場合だけ
  - `ifr.rules`：1-2-3 ルールの条件『目的地に計器進入方式（Part 97）があること』（91.169(b)(1)）が抜けている。同じ条件は燃料の 91.167(b) にもある
  - （ほか 34 件）

### 書き直しの方針

節の順は ifr.rules → ifr.hold → （新）ifr.chart → ifr.ils → ifr.np とし、ifr.chart（進入図の読み方：架空の LAB ILS RWY 36 の模式図、NOT FOR NAVIGATION）で平面図・断面図・最低気象条件の見方を先に教えてから ILS と非精密進入へ進む。ifr.rules は最初に『IFR は雲の中も飛べるが、計器飛行証明と飛行計画・管制の許可が必要』を言い、表を出発前（91.173・燃料 91.167・代替 91.169 の 1-2-3 ルールと計器進入方式の条件）／飛行中（CRAFT・最低 IFR 高度 91.177・無線故障 91.185）／進入（91.175 の DA・MDA）に分け、61.57(c) は 1 行に縮め、教材の注意は bk.key から外して caution へ。ifr.hold は図を正しく描き直して最初に置き、形（インバウンドがフィックスで終わる）→ 入り方（到着時の機首方位）→ 時間・速度（KIAS、90 KIAS 以上が望ましい）→ 風（3 倍の修正）→ 旋回（3°/秒・最大 30°）→ ACS の順に書き、VOR の TO/FROM 反転で旋回開始を課目 i4 とつなぐ。ifr.ils は平面＋断面の図と針の読み方の図を置き、準備 → 進入許可の復唱（課目の文と同じ）→ 30° で会合 → GS に下から会合して 80 kt・約 430 fpm → 小さな修正（IFH：ピッチで降下率・出力で速度、いつも組み合わせる）→ DA 255 ft（地上 200 ft）で判断、とし、偽のグライドスロープの注意を加える。ifr.np は非精密進入と RNAV（GPS）の最低気象条件の行、CDFA の断面図、MDA・VDP・MAP、進入復行（MAP までコースを守る：IFH 第 1 章）を説明し、自動操縦の文は CADET の必須の形のまま最後に残し、ほかに『この教材』という語を使わない。タイトルは『計器飛行方式：規則・待機・ILS と非精密進入』に変えてよい。

節の最初の図（いちばん大事な図）：
- `ifr.rules`：時間軸の模式図：到着予定（ETA）の前後 1 時間の帯に、雲の高さ 2,000 ft・視程 3 SM の線（1-2-3 ルール。下回ると代替飛行場が必要）。下段に IFR の燃料の積み上げ（目的地まで ＋ 代替まで ＋ 通常巡航で 45 分…
- `ifr.hold`：北が上の平面模式図：LAB VOR（フィックス）へインバウンド 090°・右回り（パターンはフィックスの西・コースの南側）。正しい 3 つの区域（ダイレクト 180°・ティアドロップ 70°・パラレル 110°）と区切り線（フィックスから東…
- `ifr.chart`：架空の LAB ILS RWY 36 の模式図：上に平面図（I-LAB 109.90、最終進入コース 360°、LAB VOR 113.50、進入復行の待機）、中に断面図（2,000 ft で GS 会合、DA 255）、下に最低気象条件の…
- `ifr.ils`：上下 2 段：上＝平面模式図（滑走路 36、ローカライザーの扇形 ±2.5°、針路 330° で 30° の角度で会合）、下＝縦を誇張した断面図（GS 3°・±0.7°、2,000 ft で GS に下から会合＝滑走路端から約 5.9 NM…
- `ifr.np`：断面模式図：FAF から MDA まで早く降りて水平に飛ぶ『dive and drive』（赤）と、一定の角度（約 3°）で VDP まで降りる CDFA（緑）、MAP と進入復行の上昇（破線）。比較のため LPV の DA の位置。『模式…

### 図

今の図：`holding` → redo、`ils` → redo

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `ifrAlternate123` | `ifr.rules` | 時間軸：ETA の前後 1 時間の帯と、雲 2,000 ft・視程 3 SM の線（予報がこれを下回る時間があれば代替飛行場が必要）。下段に燃料の積み上げ棒（目的地まで＋代替まで＋45 分） | 14 CFR 91.167・91.169（数値は規則そのもの） | should |
| `lostCommIfr` | `ifr.rules` | IFR の無線故障（91.185）の判断図：VFR の天気？→ はい：VFR で早く着陸／いいえ：経路 AVEF（Assigned・Vectored・Expected・Filed）、高度 MEA（最低… | 14 CFR 91.185 | nice |
| `holding` | `ifr.hold` | 既存キーの描き直し：北が上、LAB VOR へインバウンド 090°・右回り（パターンは西・南側）、ダイレクト 180°・ティアドロップ 70°（30° の涙形）・パラレル 110° の区域と区切り線… | AIM 5-3-8（区域・1 分）、syllabus i4（インバウンド 090°・100 kt）、半径 r ＝ V ÷（3°/秒） | must |
| `holdingWind` | `ifr.hold` | 風の修正：南風のときインバウンドで左 8°、アウトバウンドで右 24°（3 倍）、追い風・向かい風でアウトバウンドの時間を変えてインバウンドを 1 分に | AIM 5-3-8 の例（8° → 24°） | nice |
| `labIlsChart` | `ifr.chart` | 架空の LAB ILS RWY 36 の進入図の模式図（平面図・断面図・最低気象条件の欄）：I-LAB 109.90、最終進入コース 360°、GS 会合 2,000 ft、DA 255（200 ft… | avionics.js NAVAIDS（I-LAB 109.90、LAB VOR 113.50）、physics.js LAB_RWY（36… | should |
| `ils` | `ifr.ils` | 既存キーの描き直し：上＝平面図（ローカライザー ±2.5° の扇形、30° の会合）、下＝縦を誇張した断面図（GS 3°・±0.7°、2,000 ft の会合点 約 5.9 NM、DA 255 ft）… | avionics.js（cdiLoc 1.25°/ドット、gsDots 0.35°/ドット、GS 起点 300 m）、school.js（2… | must |
| `ilsNeedles` | `ifr.ils` | 針の読み方 4 例：CDI の針と GS の菱形の位置（右・左×上・下）と、そのときの自分の位置（断面と平面の小さな絵）と直し方（針の方へ 2〜5°／降下率を ±100 fpm） | avionics.js の符号（gsDots ＋ ＝ 経路が上 ＝ 自分が低い）、school.js:374 のヒント（針の方へ） | must |
| `npProfile` | `ifr.np` | 断面図：dive and drive（FAF の後すぐ MDA へ降りて水平）と CDFA（約 3° で VDP まで連続降下）、MDA（＋100／−0 ft）・VDP・MAP、進入復行の上昇、比較の… | AIM 5-4-5（VDP・VDA）、ACS IR.VI.A.S12（MDA ＋100/−0）、AC 120-108。高さは教材値（LAB … | must |
| `rnavMinima` | `ifr.np` | RNAV（GPS）進入の最低気象条件の 4 行の表または図：LPV（WAAS・DA・垂直誘導あり）／LNAV/VNAV（DA）／LP（WAAS・MDA）／LNAV（MDA）、それぞれ『高さの誘導の有無… | AIM 5-4-5（RNAV 進入図の説明）、IPH 第 4 章 | should |

### 写真

- `ifr.ils`：ローカライザーのアンテナの列（滑走路の先にある横一列のアンテナ）
- `ifr.ils`：グライドスロープのアンテナ（滑走路の横の柱）（候補：https://commons.wikimedia.org/wiki/File:ILS_GS_EHAM_18R.jpg 未確認（Commons の API 制限で確認できず。ファイルページで要確認））
- `ifr.ils`：進入灯（approach lighting system）の列（夜または低い雲）
- `ifr.np`：VOR 局（VORTAC）の地上局
- `ifr.np`：GPS 衛星（GPS III など）の画像
- `ifr.rules`：低い雲・霧に覆われた空港（IFR の天気）
- **入手**（2026-10-26）：ローカライザーのアンテナ（`locAntenna`、`ifr.ils`）・グライドスロープのアンテナ（`gsAntenna`、`ifr.ils`）。**未入手**：進入灯（ダウンロードがサーバーの制限で失敗）・GPS 衛星（米国政府の画像が見つからず）・低い雲の空港（第 5 章 `groundFog` と重なる）。VOR 局の写真は第 19 章 `vorStation` にある。

### 章末

- 確認問題：Q1（1-2-3 ルール）：keep。理由に『目的地に計器進入方式があることも条件』を足す / Q2（DA で目印が見えない → すぐ進入復行）：keep（91.175(c)・(e)） / Q3（14,000 ft 以下のインバウンド 1 分）：keep（AIM 5-3-8） / Q4（IFR の燃料 45 分）：keep（91.167(a)(3)。VFR 昼 30 分・夜 45 分は 91.151 で正しい）
- 新しい問題の案：4 問（待機経路で、インバウンドの時間を 1 分にするために調整するのは？；ILS で、グライドスロープの菱形が上に 1 ドット、CDI の針が左に 1 ドット。自分の位置は？；非精密進入（LNAV・VOR）で MDA に着いたが滑走路が見えない。正しいのは？；IFR で雲の中を飛行中に無線が完全に故障した（91.185）。飛ぶ高度は？）
- 用語：IFR flight plan / ATC clearance ／ IFR の飛行計画・管制の許可 ／ 91.173；Clearance limit ／ 許可の限界点（CRAFT の C）；EFC (Expect Further Clearance) ／ 次の許可の予定時刻 ／ 待機；Two-way radio communications failure ／ 無線の故障（IFR）／ 91.185；MEA ／ 最低航空路高度；Holding fix ／ 待機のフィックス；（ほか 11 件）
- 出典：update: FAA Instrument Flying Handbook（FAA-H-8083-15B）PDF https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-15B…；add: IFH Addendum B — False Courses（2019）https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/ifh_addendum_b.pdf；keep: FAA Instrument Procedures Handbook（FAA-H-8083-16B）https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/instrument_procedures_handbook（現行）；update: AIM は段落の直リンクに：5-3-8 待機 https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap5_section_3.html、1-1-9 ILS https://www.faa.gov/air_traffic/publi…；add: 14 CFR の条文の直リンク https://www.ecfr.gov/current/title-14/section-91.167 、-91.169、-91.173、-91.175、-91.177、-91.185、https://www.ecfr.gov/current/title-14/section…；（ほか 3 件）

## 第 23 章 `me` Piper Seminole と双発機の基礎

節：`me.basics` Seminole の構造と操作・`me.speeds` 双発機の速度の目印：赤い線と青い線・`me.perf` 双発の性能と離陸の計画・`me.pattern` （新設案）双発の場周経路・着陸・ゴーアラウンド

### 今の問題

- **誤り**
  - me.speeds「Vlo 109 kt＝脚の上げ下げ」→ Vlo は上げ 109 kt・下げ 140 kt（https://www.se.edu/aviation/wp-content/uploads/sites/4/2023/11/Seminloe-Guide-V1.0.pdf の表「Vlo (Up) 109 / Vlo (Down) 140」、https://ce.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Semin…
  - me.speeds「Vxse 88 kt」→ POH に基づくチェックリストは 82 kt（https://ce.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Seminole_Checklist.pdf 「VXSE 82 KTS」、https://www.thrustflight.com/wp-content/uploads/2026/04/PA44-Maneuver-Guide.pdf 「Pitch for VXSE (8…
  - me.basics「左右の翼のタンク」→ PA-44 のタンクはエンジンナセルの中（55 gal × 2、使用可能 108 gal）（https://www.piper.com/model/seminole/ 「Usable: 108 US Gal」・PA-44 の燃料系統の説明）
  - me.perf「80% 以上失われる」→ AFH 3C は「80 to 90 percent」（https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/14_afh_ch13.pdf p.13-1）
- **古い**
  - 出典の版は現行：AFH は FAA-H-8083-3C（FAA のページ 2022 年更新、新版なし）、事業用 ACS は FAA-S-ACS-7B（2024 年 5 月 31 日発効、変更なし）（https://www.faa.gov/training_testing/testing/acs）。
  - 参考：現在生産の Seminole は Lycoming IO-360-B1G6（燃料噴射）と G1000 NXi（https://www.piper.com/model/seminole/）。訓練機の多くは O-360 / LO-360（キャブレター）。機体ごとに POH が違うので「実機は POH が優先」を残す。
- **数値の食い違い**
  - Vxse：本文（SM.xse＝88、physics.js:130 と pages.js:466 の速度表）vs POH 系のチェックリスト 82 kt。教材値を 82 にするか、本文で「参考値 82 kt（POH・公開チェックリスト）、教材モデルのデータは 88」と明記。
  - 巡航上昇：本文 110 kt（ガイド）vs physics.js:130 pa44.v.climb 105（MGA 2025）。
  - ゴーアラウンド：本文 Vx 82 kt（ガイド）vs physics.js:130 pa44.v.ga 88（MGA の Balked landing 88 KIAS・フラップ 25）。
  - （ほか 5 件）
- **わかりにくい**
  - me.basics：吸気圧（MP）・rpm・ガバナー・フェザー・GUMP・クロスフィード・Vlo・「速度計が動いたか確認（airspeed alive）」が初出で説明なし。
  - me.basics：「臨界発動機」が定義前に出る（定義は oei 章）。
  - me.speeds：Vmc を「片発で方向を保てる最小の速度」とだけ書き、決められた条件での公表値であることが抜けている。
  - （ほか 3 件）
- **順番**
  - me.speeds の「ガイドの訓練上の決まり」（模擬故障の安全の決まり）は oei 章の me.oei（bk.warn）へ移す。
  - me.basics の「通常着陸」「ゴーアラウンド（両発）」の行は、速度を学んだ後の新しい節 me.pattern へ移す（通常離陸は m1 が参照するので me.basics に残す）。
  - 順番を me.basics → me.speeds → me.pattern（新）→ me.perf にする。me.perf は片発の性能と離陸の判断で、次の oei 章への橋渡しになる。
- **重複**
  - aero.left（book-1）の「双発の Seminole は左右のプロペラが逆に回るので、これらの効果が打ち消し合う」と me.basics の表・確認問題 1 が重なる。説明は me.basics（図）に置き、aero.left から参照。
  - sys.gear（book-1）の引込脚・GUMPS と me.basics の引き込み脚・GUMP が重なり、呼び方も違う。
  - me.perf の bk.calc('da') は perf 章の密度高度の計算機と同じ。
  - （ほか 1 件）
- **節ごとの問題（抜粋）**
  - `me.basics`：1 つの節に「装置 4 行の表」と「操作 3 行の表（通常離陸・通常着陸・ゴーアラウンド）」が詰め込まれ、吸気圧（MP）・rpm・フェザー・GUMP・クロスフィード・Vlo・「速度計が動いたか確認」が説明なしで一度に出る。初学者には多すぎる。
  - `me.basics`：「定速プロペラ」の行は「プロペラレバーで回転数（rpm）を、スロットルで吸気圧（MP：インチ）を決める」だけで、定速プロペラ（ガバナーが羽根の角度を変えて回転数を一定に保つ）とは何か、なぜ羽根の角度で抗力が変わるかを説明していない。フェザーは括弧の中だけ。羽根の角度の図がない。
  - `me.basics`：「片方が止まっても、どちらが止まっても同じ程度の扱いにくさ（「臨界発動機」がない）」：臨界発動機（critical engine）の定義が次の章（oei）まで出ない。下がる羽根（P ファクター）が左右とも内側にある図で見せるべき。
  - `me.basics`：「左右の翼のタンク（合計 110 gal・使用可能 108 gal）」：PA-44 のタンクはエンジンナセルの中（55 gal × 2、各 1 gal 使用不能）。「翼のタンク」は不正確。
  - （ほか 23 件）

### 書き直しの方針

節の順番を me.basics → me.speeds → me.pattern（新設・通常の場周と両発のゴーアラウンド）→ me.perf にします。me.basics はねらいの文を「公開情報では、Archer の次に双発機 Piper Seminole（PA-44-180）で…」のまま最初に置き（CADET のテストが確かめる）、counterRotation の図で「左右逆回転 → 臨界発動機がない」を先に見せます。その後、Archer との違いを h4 の小見出しで 1 つずつ（2 基のエンジン／定速プロペラとフェザー＋3 色のレバー／引き込み脚と Vlo 上げ 109・下げ 140／ナセルの燃料タンクとクロスフィード）説明し、通常離陸（m1 が参照）だけを残して、通常着陸とゴーアラウンドは me.pattern へ移します。me.speeds は twinAsi の図から始め、表を「片発の 4 つの速度（Vmc・Vyse・Vxse 82・Vsse）」と「通常・制限速度」に分け、Vmc は「決められた条件での値」と一言添えて oei 章へつなぎます。模擬故障の訓練の決まりは oei 章の me.oei へ移します。me.perf は oeiClimbLoss の図（教材値 1,330 → 280 fpm）と AFH の「余分なパワー」の説明から入り、用語の表に片発の絶対上昇限度を足し、AFH の 3 つの離陸の場面（脚 DOWN・脚 UP で上昇できない・脚 UP で上昇できる）を takeoffDecision の図と箇条書きにします。アプリの操作（R / F、[ / ]、G）の説明は bk.key から外して bk.sim に集めます。

節の最初の図（いちばん大事な図）：
- `me.basics`：counterRotation：Seminole の上面図（planeTop の twin）。後ろから見て左のプロペラは時計回り・右は反時計回りの矢印、下がる羽根（推力が大きい側）を両方とも胴体側（内側）に印 → 左右の推力の線が対称 → …
- `me.speeds`：twinAsi：速度計の文字盤を FL.physics の pa44.v から描く。白い弧 55〜111（Vso〜Vfe）、緑の弧 57〜169（Vs1〜Vno）、黄の弧 169〜202、赤い線 202（Vne）、赤い線 56（Vmc）、青…
- `me.perf`：oeiClimbLoss：海面付近の上昇率を 2 本の棒で（FL.physics.steadyState）。両発・Vy 88 kt で約 1,330 fpm、片発（フェザー）・Vyse 88 kt で約 280 fpm →「約 8 割減（教…
- `me.pattern`：twinPattern（模式図・NOT FOR NAVIGATION）：LAB RWY 36 の場周。ダウンウインド 18 inHg・2,300 rpm・約 100 kt・GUMPS、アビームでフラップ 10、ベースで 88 kt（青い線）…

### 図

今の図：`calc:da（me.perf の bk.calc('da')）` → keep

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `counterRotation` | `me.basics` | Seminole の上面図（planeTop twin）。後ろから見た回転方向の矢印（左＝時計回り・右＝反時計回り）、下がる羽根（推力が大きい側）を両方とも内側に印 → 推力の線が左右対称 → 臨界発… | FL.physics pa44（counterRotating: true、engines x ±1.95 m、phys.engine.P … | must |
| `twinLevers` | `me.basics` | 双発のパワーレバー（左から スロットル 黒×2・プロペラ 青×2・ミクスチャー 赤×2）。前へ出す順番 赤→青→黒、戻す順番 黒→青→赤の矢印。プロペラレバーを後ろいっぱい（止まりを越えて）＝ FEA… | AFH 13-5（To feather the propeller, the propeller control is brought fu… | should |
| `featherBlade` | `me.basics` | 羽根の先から見た 3 つの角度：低ピッチ（離陸・高回転）／高ピッチ（巡航）／フェザー（約 90°、風に平行）。相対風の矢印と「止まったときの抗力：大／中／最小」。 | AFH Figure 13-2・13-3（考え方）。数値なし。 | should |
| `seminoleFuel` | `me.basics` | 左右のナセルタンク（各 55 gal）からそれぞれのエンジンへ。燃料セレクター ON / OFF / X-FEED（反対側のタンクから送る）の流れの矢印。「クロスフィードは片発で長く飛ぶときだけ（AF… | ガイド（Total 110 / Usable 108 gal）、Piper（Usable 108）、AFH 13-7（Fuel Crossf… | nice |
| `twinAsi` | `me.speeds` | 速度計の文字盤：白い弧・緑の弧・黄の弧・赤い線（Vne）、赤い線（Vmc）と青い線（Vyse）を強調。主要な速度を外側に小さく。 | FL.physics pa44.v：s0 55・s1 57・fe 111・no 169・ne 202・mc 56・yse 88。AFH Fi… | must |
| `twinPattern` | `me.pattern` | 通常の場周（模式図・NOT FOR NAVIGATION）：各点の出力（18 inHg・2,300 rpm）・速度（約 100 kt → 88 kt → 80 kt）・形態（GUMPS、フラップ 10… | ガイドの Normal Landing、FL.physics pa44.v（appr 88・apprFull 80、flapLabels U… | should |
| `oeiClimbLoss` | `me.perf` | 海面付近の上昇率の棒 2 本：両発（Vy 88）と片発（Vyse 88・フェザー）。差に「約 8 割減」。小さく AFH の「80〜90%」。 | FL.physics.steadyState(pa44, 88, {pwr:full, altFt:100}) ＝ 1,332 fpm、{p… | must |
| `takeoffDecision` | `me.perf` | 滑走路の横からの図：浮揚 → ①脚 DOWN・滑走路が残る：両方のスロットルを閉じて正面に降りる ②脚 UP・上昇できる：Vyse・全部前へ・脚とフラップ UP・特定・確認・フェザー ③脚 UP・上昇… | AFH 13-10/11（定義・Figure 13-5A）、13-29〜31（Figure 13-18〜20）、ガイドの離陸前ブリーフィング… | should |
| `excessPower` | `me.perf` | AFH の仮の双発機：使える推力馬力 200＋200、水平飛行に必要 175 → 両発の余り 225、片発の余り 25（約 89% 減）を積み上げ棒で。 | AFH 13-2/13-3 の例（参考値として出典を明記）。 | nice |

### 写真

- `me.basics`：双発の軽飛行機が飛んでいるところ（2 基のエンジンが見える）（候補：https://images.nasa.gov/details/ECN-2845 Public domain（NASA Armstrong/Dryden の写真。images-assets.nasa.gov/image/ECN-2845/ECN-2845~large.jpg））
- `me.basics`：地上の Seminole（2 基のエンジン・T 字尾翼・引き込み脚）
- `me.basics`：フェザーしたプロペラ（羽根が風に平行で止まっている）
- `me.perf`：双発の軽飛行機の離陸（滑走路と機体）
- **入手**（2026-10-26）：飛んでいる Seminole（`seminole`、`me.basics`。学校の塗装のないもの）。**未入手**：地上の Seminole・離陸（見つかった写真は訓練校の塗装やロゴがあった）・フェザーしたプロペラ（ダウンロードがサーバーの制限で失敗）。NASA の PA-30 は、第 24 章 `oei.what` で使った（`twinPa30`）。

### 章末

- 確認問題：Q1（臨界発動機がない理由）：keep。理由に「後流・トルクも左右対称」「どちらのエンジンが止まっても同じ（AFH 13-24）」を足す。 / Q2（青い線＝Vyse）：keep。 / Q3（片発の上昇性能）：fix。正答を「80〜90% 失われる（AFH 3C）」に。理由に AFH の 200/175 馬力の例を一言。
- 新しい問題の案：3 問（Seminole の脚の速度の制限（公開チェックリスト）で正しいのは？；片発の実用上昇限度（single-engine service ceiling）とは？；浮揚直後、脚がまだ DOWN で滑走路が十分残っているときに片方のエンジンが止まった。AFH の考え方は？）
- 用語：追加：Critical engine／臨界発動機／止まると方向の操縦が最も難しくなるエンジン（Seminole には無い）；追加：Propeller governor／ガバナー／羽根の角度を変えてプロペラの回転数を一定に保つ装置；追加：Nacelle tank／ナセルタンク／エンジンナセルの中の燃料タンク（Seminole は左右 55 gal）；追加：Vxse／片発の最良上昇角速度／82 kt（参考値：POH 系チェックリスト）；追加：Vlo / Vle／脚の操作速度・脚下げの最大速度／上げ 109・下げ 140 / 140 kt；追加：Single-engine absolute ceiling／片発の絶対上昇限度／片発で上昇できなくなる高度（ここから上では Vyse で降下率が最小）；（ほか 3 件）
- 出典：update：R.afh13 の URL を第 13 章の PDF にする https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/14_afh_ch13.pdf（…；update：R.seminoleG の注記「Vxse 88（この版の表の値…）」→「表の Vxse 88 は誤記の可能性（POH 系のチェックリストは 82）」。抗力のデモの「フラップ 45」も誤記（全開は 40°）。https://www.se.edu/aviation/wp-content/uploads/sit…；add：MGA 2025 Seminole PA-44-180 Pilot's Checklist（Archer の出典と同じ学校の公開チェックリスト。Vxse 82・Vsse 82・En Route Climb 105・Balked landing 88・横滑りゼロ 2〜3°）https://ce.mga.edu/a…；keep：R.acsC（FAA-S-ACS-7B は現行・2024-05-31 発効）。本文で使う Task（Area IX E・F・G、Area X A・B、付録 3 の Multiengine Considerations）を注記 https://www.faa.gov/training_testing/testi…；keep：R.seminole（Piper 公式・現在の仕様：IO-360-B1G6・使用可能燃料 108 gal）https://www.piper.com/model/seminole/；（ほか 1 件）

## 第 24 章 `oei` 片発停止の空力と操作（Vmc・抗力・手順）

節：`oei.what` （新設案）片発で起きる 2 つの問題：方向と上昇・`me.oei` 片発停止の手順：特定・確認・フェザー・`me.vmc` Vmc：方向を保てる最小の速度・`me.drag` 抗力のデモンストレーション：何が上昇を奪うか・`me.land` 片発の進入と着陸

### 今の問題

- **誤り**
  - FIG.oeiForces：尾翼の「ラダー（右を踏む）の力」の矢印が右向き → 右ラダーで尾翼に生まれる横向きの力は左向き（尾が左へ・機首が右へ戻る）。いまの矢印では機首がさらに左へ回る（AFH Figure 13-12 の考え方）。
  - FIG.oeiForces のキャプション「生きている側へ 2〜5° バンクすると横滑りが最小になる」→ 横滑りゼロは約 2°（1.5〜2.5°）・ボール 1/3〜1/2。5° は認証の上限で、横滑りゼロをつくるものではない（https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/14_afh_ch13.pdf p.13-25, 13-28/29）。
  - me.drag「＋フラップ 45°（全開）」→ Seminole のフラップ全開は 40°（https://ce.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Seminole_Checklist.pdf 「Flaps 0° TO 40° (BELOW 111 KIAS)」、https://www.thrustflight.com/wp-content/uploads/2026/04/PA44-Maneuver-Guide.p…
  - me.vmc「バンク 5° 以内で…（14 CFR 23 の考え方）」→ 今の 14 CFR 23.2135(c) は「the calibrated airspeed at which, following the sudden critical loss of thrust, it is possible to maintain control of the airplane」。5° などの条件は旧 23.149（https://www.ecfr.gov/current/title-14/section-23.2…
  - me.land「着陸が確実になるまで脚とフラップを出しすぎない」→ AFH：性能が十分なら脚は遅くともアビームで DOWN、フラップ 10（ダウンウインド）・25（ベース）、最後のフラップだけ着陸が確実になるまで待つ（https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/14_afh_ch13.pdf p.13-34）。
  - （ほか 2 件）
- **古い**
  - 14 CFR 23 の Vmc の定義は 2017 年（Amdt. 23-64）から 23.2135(c) の性能基準の書き方。本文の「14 CFR 23 の考え方」は旧 23.149 の内容なので、「旧 23.149（Seminole の認証基準）」と書く。
  - AFH 3C・ACS 7B はどちらも現行（変更なし）。
- **数値の食い違い**
  - 横滑りゼロのバンク：本文「約 2°」vs FIG キャプション「2〜5°」、syllabus.js:381・390（tgt bank 3 ±3）・413、school.js:55、pages.js:461 の「2〜5°」。AFH は約 2°（1.5〜2.5°）、MGA は 2〜3°・ボール 1/2。
  - 抗力のデモ：本文の値（ガイド）vs 飛行モデル（4,000 ft・Vyse 88・片発最大出力・バンク 3°、動的計算）：フェザーで +88 fpm、フラップ 10 で −29（−117）、＋脚で −302（−273）、＋フラップ全開で −1,016（−714）、＋風車状態で −1,120（−104）。きれいな形態で風車状態にすると −3…
  - 横滑りゼロの効果：モデル（自動ラダーでボール中央）ではバンク 0° と 3° の上昇率が 86 / 88 fpm でほぼ同じ。シミュレータで横滑りゼロの得を体験できる、とは書かない。
  - （ほか 7 件）
- **わかりにくい**
  - me.oei：「1 方向と速度」で Vmc が説明前に出る。
  - me.oei：ACS の表が Task 名なしで 3 つの Task を混ぜている。
  - me.vmc：「Vmc が失速速度より高い条件では…スピン」の論理（AFH の警告は非対称の出力のままの失速）。
  - （ほか 4 件）
- **順番**
  - 章の最初に新しい節 oei.what（片発で起きる 2 つの問題：方向と上昇）を置き、FIG.oeiForces（作り直し）を移す。
  - 節の順番を oei.what → me.vmc（方向の問題）→ me.drag（性能の問題・横滑りゼロを含む）→ me.oei（手順・ACS）→ me.land にする。「なぜ」を先に、記憶操作を後に。
  - 横滑りゼロの小節を me.oei から me.drag へ移す（性能の話）。me.oei には「フェザーの後で約 2° バンク」の 1 行と参照だけ残す。
  - （ほか 1 件）
- **重複**
  - me 章の me.speeds（Vmc・Vyse の説明、bk.key「片発になったら、まず速度」）と me.oei の手順 1 が重なる。
  - quiz.js q_me の問題（Dead foot、Vmc の回復、横滑りゼロ、Vmc が高くなる条件、ACS の許容）が章末の確認問題 1〜3 とほぼ同じ。章末は別の観点（Vmc と失速、バンクと Vmc、止まった側への旋回、400 ft の決まり）にする。
  - me 章の例（右エンジン故障）と oei 章の例（左エンジン故障）が同じ流れ。oei の例は Vmc デモ・進入の例に替える。
  - （ほか 1 件）
- **節ごとの問題（抜粋）**
  - `oei.what`：まだない節（新しい ID）。いまの me.oei の最初の図 FIG.oeiForces（作り直し）をここへ移す。臨界発動機の定義と「Seminole にはない」（me.basics の図を参照）もここで。
  - `me.oei`：手順が、Vmc（次の節）や抗力（me.drag）の説明より前に来る。「Vyse（88 kt）以上（少なくとも Vmc より上）」の Vmc がまだ説明されていない。
  - `me.oei`：最初の図 FIG.oeiForces は「力」の図で手順の図ではない。しかもラダーの力の矢印の向きが逆（figuresExisting）。
  - `me.oei`：「横滑りゼロ」の小節は性能の話（me.drag に合う）。本文は「約 2°」なのに、図のキャプションは「2〜5° バンクすると横滑りが最小」、課目（syllabus m2・m4）・school.js・pages.js も「2〜5°」。AFH は約 2°（1.5〜2.5°）・ボール 1/3〜1/2、POH 系チェックリストは 2〜3°・ボー…
  - （ほか 25 件）

### 書き直しの方針

章の最初に新しい節 oei.what「片発で起きる 2 つの問題：方向と上昇」を置き、AFH の考え方（control＝赤い線 Vmc、performance＝青い線 Vyse）と作り直した oeiForces の図（ヨー・ロール・右ラダーの力は尾翼で左向き）で「何が起きるか」を先に見せます。続けて me.vmc（方向の問題）：vmcRudder の図（飛行モデルのラダー量と失速警報の範囲）→ 今の 23.2135(c) と旧 23.149 の条件の違い → 直した vmcFactors の表（翼を水平にすると最大で約 20 kt 上がる、を追加）→ 失速との違い（Seminole は Vmc 56 と Vs1 57 がほぼ同じなので失速警報が先に来やすい）→ ACS CA.X.B どおりの Vmc デモ（入り Vsse＋約 10 kt、1 kt/秒、最初の兆候で生きている側を絞り機首を下げる、止まった側に出力を足さない、±20°、Vsse / Vyse ±5 kt）。次に me.drag（性能の問題）：oeiDrag の模式図、ガイドの抗力のデモは「その形態での降下率の目安（ガイドの値）」と書いてあいまいさを明記し、フラップ全開は 40° に直し、AFH の「風車状態のプロペラは機体全体の有害抗力と同じくらいになりうる」を出典にします。横滑りゼロ（約 2°・ボール 1/3〜1/2、POH 系は 2〜3°、最初の 5〜10° は一瞬だけ）を zeroSideslip の図とともにこの節へ移します。その後 me.oei（手順）：oeiFlow の図、記憶操作に理由を添え、約 800 rpm より前にフェザー、片付け、管制への緊急の宣言、生きているエンジンをフェザーしない bk.warn、ACS の表（Task 名つき）、模擬故障の訓練の決まり（me.speeds から移す）を置き、bk.sim は最後に正しいキー（E / Q、Z / X、[ / ]、自動ラダーはエンジン故障の課目でだけ OFF）で書きます。最後の me.land は oeiPattern の図と AFH 13-34/35 の順番（脚は遅くともアビーム、フラップ 10 → 25 → 最後は確実になってから、止まった側への旋回も可、フレアでのラダーの変化、片発のゴーアラウンドは 500 ft 以上失う）で書き直します。

節の最初の図（いちばん大事な図）：
- `oei.what`：oeiForces（作り直し）：上面図（planeTop twin、機首に「前」）。生きている右エンジンの推力（長い緑の矢印）、止まった左の風車状態のプロペラの抗力（赤の矢印）、機首が左へ回る円弧（ヨー）、尾翼に右ラダーで生まれる横向きの力…
- `me.oei`：oeiFlow：記憶操作の流れを 5 つの箱で。①方向（ラダーでヨーを止める）と速度（Vyse 88）②全部前へ（ミクスチャー・プロペラ・スロットル）③脚・フラップ UP ④特定（Dead foot, dead engine）→ 確認（その…
- `me.vmc`：vmcRudder：折れ線「必要なラダーの量（%）と速度」を飛行モデルから（片発・風車状態・最大出力・バンク 5°）。1,000 ft の線は 56 kt で 100%（赤い線）、5,000 ft の線はもっと低い。失速警報が鳴る範囲（約 …
- `me.drag`：oeiDrag（模式図・数値なし）：「上昇に使える余分なパワー」の棒（両発では長い、片発では短い）から、脚・フラップ・風車状態のプロペラ・横滑りがそれぞれ削っていく。キャプション「片発では余分なパワーが少ないので、抗力が少し増えるだけで上昇…
- `me.land`：oeiPattern（模式図・NOT FOR NAVIGATION）：LAB RWY 36 への場周。ダウンウインド Vyse 88 以上・脚 DOWN（遅くともアビーム）・フラップ 10、ベース フラップ 25（性能があれば）、ファイナル…

### 図

今の図：`oeiForces` → redo、`vmcFactors` → fix

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `vmcRudder` | `me.vmc` | 折れ線：横軸 IAS（50〜95 kt）、縦軸「必要なラダー（%）」。1,000 ft と 5,000 ft の 2 本。100% の線と 56 kt（赤い線）、失速警報の範囲（約 62 kt 以下）… | FL.physics（pa44、左エンジン故障・風車状態・thr 1・バンク 5°・脚 UP）で flight.test.mjs の Vmc… | must |
| `zeroSideslip` | `me.drag` | 後ろから見た 3 つの姿（planeFront の bank）と横滑り計のボール：(a) 翼水平・ボール中央 → 止まった側へ横滑り・Vmc は公表値より高い (b) ラダーなし・8〜10° バンク … | AFH 13-27〜29（Figure 13-15〜13-17）、MGA チェックリスト「2 TO 3 DEGREES INTO OPERA… | must |
| `oeiDrag` | `me.drag` | 模式図（数値なし）：「上昇に使える余分なパワー」の棒（両発・片発）と、脚・フラップ・風車状態のプロペラ・横滑りが削る分。片発では少し削られるだけでマイナス（降下）になる。 | AFH 13-2/3（余分なパワー）、13-3（風車状態のプロペラ＝機体全体の有害抗力と同じくらいになりうる）。モデルの値は風車状態を小さく… | must |
| `oeiFlow` | `me.oei` | 記憶操作の流れ（5 つの箱と矢印、各 1 行の理由）。最後に「横滑りゼロ → 片付け → 管制へ」。 | AFH 13-31〜33（Figure 13-21・13-22）、ガイドの Engine failure after rotation、MG… | must |
| `deadFoot` | `me.oei` | ラダーペダルと両足：右足が強く踏んでいる（working foot）、左足は遊んでいる（dead foot）→ 左エンジンが止まった。下に「確認：左のスロットルをゆっくり絞る → 何も変わらない → … | AFH 13-32/33（dead foot—dead engine、identify は計器でなく操縦の入力で）。数値なし。 | should |
| `vmcStall` | `me.vmc` | 模式図：縦軸 高度、横軸 速度。Vmc の線は高いほど左へ（遅く）、失速速度の線はまっすぐ。交わる点より上では失速が先。海面の値に Seminole の 56 / 57 kt。vmcRudder に … | AFH 13-26（Figure 13-14）、ACS 付録 3（Task X.B の注）、pa44.v.mc 56・s1 57。 | should |
| `vmcBank` | `me.vmc` | 棒か折れ線：バンク 5°（公表 Vmc）→ 0°（翼水平）で Vmc が上がる（1° あたり 3 kt 以上、最大で約 20 kt）。 | AFH 13-25 の値（参考値と明記）。モデルでは差が小さい（約 3〜4 kt）ので「実機の値（AFH）」と書く。 | nice |
| `vmcDemo` | `me.vmc` | Vmc デモの流れ（時間の帯）：入る（Vsse＋約 10 kt・止める側アイドル・反対側全開・バンク 5° 以内）→ 1 kt/秒で減速 → 最初の兆候（方向・失速警報・振動）→ 生きている側を絞る＋… | 事業用 ACS CA.X.B.S1〜S8、ガイドの VMC demonstration、pa44.v（sse 82・yse 88）。 | nice |
| `oeiPattern` | `me.land` | 片発の場周（模式図・NOT FOR NAVIGATION）：各点の速度と形態、「ここから先は着陸する」の点、止まった側への旋回も可。 | AFH 13-34/35、pa44.v（yse 88・apprFull 80、flapLabels 10°/25°/40°）。 | must |

### 写真

- `me.drag`：風防（キャノピー）に付けた毛糸のヨーストリング（yaw string）
- `me.oei`：片方のプロペラをフェザーして飛んでいる双発機
- `oei.what`：双発機の上面か正面（エンジンが胴体から離れて付いていることが分かるもの）（候補：https://images.nasa.gov/details/ECN-2845 Public domain（NASA））
- **入手**（2026-10-26）：NASA の PA-30 Twin Comanche（`twinPa30`、`oei.what`。候補の ECN-2845）。**未入手**：ヨーストリング・片方をフェザーして飛ぶ双発機（パブリックドメインか CC で、訓練校の塗装のないものが見つからなかった）。`me.drag` と `me.oei` は図と表で説明した。

### 章末

- 確認問題：Q1（Dead foot, dead engine）：keep。 / Q2（Vmc 付近で方向が保てない → 出力を絞り機首を下げる）：keep。理由に「止まった側の出力は足さない（ACS CA.X.B.S6）」を足す。 / Q3（横滑りゼロ：約 2°・ボール 1/3〜1/2）：keep。理由に AFH 13-29（1.5〜2.5°）と「POH 系は 2〜3°」を足す。課目・アプリの「2〜5°」と食い違わないよう本文側をそろえる。 / Q4（Vmc デモの回復：入った針路の ±20°）：keep（CA.X.B.S7）。
- 新しい問題の案：4 問（片発で翼を水平にしたまま（バンクなし）飛ぶと、Vmc はどうなる？；Vmc デモで減速中、方向はまだ保てているのに失速警報が鳴った。どうする？；片発の場周で、止まったエンジンの側へ旋回することは？；実機の訓練で、離陸後の模擬エンジン故障を始めてよいのは？）
- 用語：追加：Raise the dead／止まった側の翼を少し上げる（生きている側へ約 2° バンク）覚え方；追加：Zero thrust／ゼロ推力／訓練でフェザーを模擬する出力（止まったフェザーのプロペラと同じ抗力）；追加：Yaw string／ヨーストリング／横滑りを見る毛糸；追加：Anti-feathering lock pins／フェザー防止のピン／約 800 rpm より下がるとフェザーできなくなる；追加：Single-engine go-around／片発のゴーアラウンド／できないことがある（500 ft 以上失うのも普通）；追加：Static / dynamic Vmc／静的・動的な Vmc（AFH）は CADET 向けには不要。入れるなら補足だけ。；（ほか 1 件）
- 出典：update：R.afh13 の URL を第 13 章の PDF に https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/14_afh_ch13.pdf（本文…；update：R.cfr23 に加えて 23.2135 を直接 https://www.ecfr.gov/current/title-14/section-23.2135（今の Vmc の定義）。旧 23.149 は AFH 13-2/13-24 の説明を出典に。；keep：R.acsC（FAA-S-ACS-7B、現行）。使う Task を注記：Area IX Task F（離陸後の故障）・G（片発の進入と着陸）、Area X Task A（片発での飛行）・B（Vmc デモ）、付録 3（Multiengine Considerations）https://www.faa.gov/…；update：R.seminoleG の注記に「抗力のデモの「Flaps 45」は誤記（全開は 40°）」https://www.se.edu/aviation/wp-content/uploads/sites/4/2023/11/Seminloe-Guide-V1.0.pdf；add：MGA 2025 Seminole Pilot's Checklist（横滑りゼロ 2〜3°・ボール 1/2、Vmc 回復の手順）https://ce.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Seminole_Che…

## 第 25 章 `crm` TEM と CRM：脅威とエラーを管理し、チームで飛ぶ

節：`crm.tem` TEM：脅威とエラーの管理・`crm.crm` CRM：チームで飛ぶための技術・`crm.pm` PF と PM：操縦する人と監視する人

### 今の問題

- **誤り**
  - crm.crm「1970 年代の事故の調査で…（SKYbrary）」→ SKYbrary の CRM 記事には年代も NASA のワークショップも書かれていない。根拠は FAA AC 120-51E 第 7 項（人のエラーが 60〜80%、NASA の研究）と NASA CP-2120『Resource Management on the Flight Deck』(1979 年のワークショップ、1980 年刊)（https://www.faa.gov/documentLibrary/media/Advisory_C…
  - crm.tem「望ましくない機体の状態（UAS）：エラーや脅威の結果、安全の余裕が減った状態」→ ICAO/SKYbrary：flight crew-induced aircraft position or speed deviations, misapplication of flight controls, or incorrect systems configuration, associated with a reduction in margins of safety（乗員が引き起こしたもの。ふつうは管理…
  - book-core.js:26 R.rmh の URL https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/risk-management-handbook-faa-h-8083-2a は 404（2026-10-26 確認）→ https://www.faa.gov/regulationspolicies/handbooksmanuals/risk-management-handbook-faa-h-8083-2a
  - FIG.tem のキャプション「SKYbrary の TEM の説明を図にしたもの」→ SKYbrary の記事にこの流れ図はない。ICAO Doc 9683 第 2 部第 2 章（2.2.34 の 3 つの守り、2.3.16 UAS）と SKYbrary の定義にもとづく本書の図、と書く。
- **古い**
  - 参照文献はすべて現行（FAA の AC 一覧 CSV で確認：AC 120-71B 2017-01-10 Active、AC 120-51E 2004-01-22 Active）。ただし PF/PM について SAFO 15011（2015）、監視・自動化・手動操縦をまとめた AC 120-123 Flightpath Managemen…
  - R.icaoTEM の URL が https://www.icao.int/（トップページ）だけ。Doc 9683 は 1998 年の第 1 版で、2003 年の改訂（Amendment 1）で TEM の章（第 2 部第 2 章 2.3・2.4）が加わった。版を明記し、無料で読める要約として SKYbrary の TEM in Fli…
  - 米国では CRM の訓練は規則で必要（14 CFR 121.404、Amdt. 121-392・2024 年の現行文）。初心者向けには「エアラインでは規則で CRM の訓練が必要」と一言で十分。
- **数値の食い違い**
  - crm.tem「500 ft で安定していなければ」→ ops.landing の表・FIG.stableApproach・syllabus.js:37／180 はすべて「地上 500 ft（VMC）」。「地上」と「VMC（IMC は 1,000 ft）」を足して揃える。
  - crm.crm の例「速度が 20 kt 速く」は AFH 第 9 章の安定進入（+10／−5 kt、ops.landing の表）と矛盾しない（20 kt は明らかに外れ）。例を時間に余裕のある場面に替えるなら数値は不要。
  - 課目 r1（syllabus.js:439〜）の設定：風は滑走路から 70°・10 kt・gust 1.6（physics.js:306 の『乱気流の強さ』の係数で、突風の kt ではない）。本文で例にするなら『横風成分は約 10 × sin70° ≈ 9 kt（Archer の実証横風 17 kt 以内、physics.js pa28 …
- **わかりにくい**
  - crm.tem：UAS の英語の正式名（Undesired Aircraft State）がない。
  - crm.tem：対策の 3 語（予測・気づく・対処）が ICAO の用語（avoid / trap / mitigate、planning / execution / review）とどう対応するか書かれていない。
  - crm.tem：「決めた「線」」→ ゲート（gate）と言い、地上 500 ft（VMC）と明記。
  - （ほか 3 件）
- **順番**
  - crm.tem：図より先に目的（bk.aim）→ 図 → 3 つの定義 → 例（r1 の流れ）→ 対策 → ここが大切。
  - crm.crm：CRM の定義 → 5 つの技術 → 懸念の伝え方、の順はよいが、懸念の伝え方は分量が増えるので新節 crm.speak へ分けてもよい。
  - crm.pm：PF/PM の定義 → 図（監視とコールの輪）→ 表 → 操縦の受け渡し → 1 人で飛ぶときの「自分へのコール」。
- **重複**
  - crm.tem のキー「1 人で飛ぶときも同じ（SRM）」と crm.pm の「自分で自分にコールする」は hf.srm（第 12 章）と重なる → 参照にとどめる。
  - crm.crm の「意思決定（DECIDE）」は hf.adm と重複 → 参照だけ。
  - crm.tem の脅威の例「午後の雷雨」は wx の TAF の例（TEMPO TSRA）と対応 → wx.* への参照ボタンを置くと良い。
  - （ほか 1 件）
- **節ごとの問題（抜粋）**
  - `crm.tem`：目的の 1〜2 文がなく、いきなり ${FIG.tem()} から始まる。新しい bk.aim で「なぜ TEM を学ぶか（エラーはゼロにできない＝AC 120-51E『pilot errors cannot be entirely eliminated』）」を先に置く。
  - `crm.tem`：FIG.tem は viewBox 520×180 で、390 px では最小文字 6.6 px（figshot）。下の小さな文字「天気・他機・不具合…」「操作・手順・交信の誤り」(fs 10) が読めない。
  - `crm.tem`：FIG.tem は「脅威 → エラー → UAS」の一本道に見える。実際の TEM では、脅威の多くは管理されて何も起きず、エラーは脅威なしでも起き、管理されれば影響なし（inconsequential）、管理に失敗したときだけ UAS へ、UAS も立て直せば安全に戻る（Doc 9683 2.3.16・2.4.1）。結果（事故・インシデ…
  - `crm.tem`：「望ましくない機体の状態（UAS）」の英語の正式名（Undesired Aircraft State）が本文にも用語にも出てこない（terms は 'Threat / Error / UAS' だけ）。初出で 日本語（English）の規則に合わない。
  - （ほか 22 件）

### 書き直しの方針

節の順（crm.tem → crm.crm → crm.pm）は保ち、各節を「目的（bk.aim）→ 最初の図 → 説明 → ここが大切 → よくある間違い → 考えてみよう」に揃える。最初に「エラーはゼロにできないので、防ぐ・見つける・小さくする仕組みを作る」（AC 120-51E・ICAO Doc 9683）を言い、TEM の 3 つの言葉は ICAO の定義に合わせて日本語（English）で示す。例は特定の航空会社の SOP に見えないよう、この教材の課目 r1（架空の LAB 空港・Archer Seven Lima Alpha）と教官・訓練生の場面を使い、「機長／副操縦士」の場面は一般論にとどめる。crm.crm は CRM の定義（SKYbrary）と由来（AC 120-51E・NASA 1979）を正し、懸念の伝え方は「時間がある場面＝5 段階の型」「時間がない場面＝短いコール」に書き分ける。分量が増えるなら新節 crm.speak（懸念を伝える：権威勾配と声に出す技術）を crm.crm の後に作る。crm.pm には SAFO 15011 の役割の定義、AC 120-71B の『2 回のコール』、AFH 第 1 章の操縦の受け渡し 3 段階を入れ、ここが大切を追加する。巻末の cautions から実在の会社名を消し「特定の航空会社・訓練校の手順ではない」という一般的な注意にする。

節の最初の図（いちばん大事な図）：
- `crm.tem`：temFlow（縦長 360 幅）：上から「脅威」「エラー」が入り、多くは管理されて『影響なし』へ。管理に失敗 → 「望ましくない機体の状態（UAS）」→ 立て直せば安全な状態へ／できなければ事故・インシデント。横に 3 つの守り「防ぐ（ブ…
- `crm.crm`：authorityGradient：機長と副操縦士（または教官と訓練生）を結ぶ 3 本の坂。急すぎ（下の人が言い出せない）・ちょうどよい（決める人がいて、意見も言える）・平らすぎ（誰も決めない）。ICAO Doc 9683 の trans-…
- `crm.pm`：pfPmLoop：PF（飛ばす）→ PM（見る：経路・速度・形態・モード）→ ずれのコール →「Correcting」→ 直った。直らない → 2 回目のコール → それでもだめなら SOP に従い交代、の輪。下に操縦の受け渡し 3 段階の…

### 図

今の図：`tem` → redo

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `temFlow` | `crm.tem` | FIG.tem の作り直し。縦の流れ：脅威（天気・混雑・不具合…）とエラー（操作・手順・交信）→［管理できた］影響なし（ほとんどの飛行）／［管理できない］UAS（速度・高度のずれ、誤った形態、不安定な… | ICAO Doc 9683 第 2 部第 2 章 2.2.34（avoid / trap / mitigate）・2.3.16（UAS の例… | must |
| `temExample` | `crm.tem` | 課目 r1 を時間の流れで：出発前ブリーフィング『今日の脅威＝突風を伴う横風・場周の他機 2 機・寝不足』→ ダウンウインドで管制『runway 18』（使用中は 36）＝食い違い（相手か自分のエラー… | syllabus.js:439〜（r1 の setup：wind rel 70°・10 kt・gust 1.6、場周機 2 機、runway… | should |
| `authorityGradient` | `crm.crm` | 左に上の立場（機長・教官）、右に下の立場（副操縦士・訓練生）を置き、3 本の坂：急すぎる（『言えない・聞けない』）・ちょうどよい（『決める人がいて、意見も言える』）・平らすぎる（『誰も決めない』）。下… | ICAO Doc 9683（trans-cockpit authority gradient の説明：威圧的な機長と主張しない副操縦士なら急… | must |
| `speakUpSteps` | `crm.crm` | 懸念を伝える 5 段の階段（①呼びかける ②懸念を言う ③問題を具体的に ④解決案 ⑤同意を得る）に、時間に余裕がある場面の例文（巡航中、目的地の天気が悪化 → 代わりの空港の提案）。横に『時間がない… | AC 120-51E 付録 1（Inquiry/Advocacy/Assertion）、AC 120-71B 6.6.2（逸脱のコールと応答… | should |
| `pfPmLoop` | `crm.pm` | PF と PM の輪：PF が飛ばす → PM が見る（経路・速度・形態・自動操縦のモード）→ ずれをコール（例『Speed, plus 15』）→ PF『Correcting』→ 直った。直らない・… | SAFO 15011（2015）の 6 項目、AC 120-71B 1.4 の PF/PM の定義・6.6.2.1（two challeng… | must |
| `controlExchange` | `crm.pm` | 操縦の受け渡し 3 段階の吹き出し：教官『You have the flight controls.』→ 訓練生『I have the flight controls.』→ 教官『You have t… | FAA AFH（FAA-H-8083-3C）第 1 章 p.1-15 の three-step process。 | should |

### 写真

- `crm.crm`：NASA Ames の乗員研究用シミュレータ（Crew-Vehicle Systems Research Facility）。CRM・LOFT の研究が行われた場所。人の顔が写っていない外観か、計器画面が主役でないカット。（候補：https://images.nasa.gov/details/ARC-2009-ACD09-0031-003 NASA（米国政府の著作物・パブリックドメイン。NASA のロゴ等の使用規定に注意）— 要確認：コクピット内なら計器が主役になり規則に触れる可能性）
- `crm.pm`：2 人乗りの研究機・官用機のコクピットを後ろから（顔が見えない）。PF と PM が並んで座る位置関係がわかるもの。
- `crm.tem`：脅威の例としての積乱雲・雷雨（空港の近くの遠景）
- **入手**（2026-10-26）：NASA Ames の研究用シミュレータ ACFS の 2 席の操縦席（`crewCab`、`crm.pm`。航空会社の名前がなく、計器は小さく写るだけのもの）。**未入手**：CVSRF の 747 の操縦席（計器が主役で、航空会社の表示もあるので使わない）、`crm.tem` の雷雨（第 5 章の `cbFlorida` があるので、図で説明した）。

### 章末

- 確認問題：Q1（脅威にあたるもの）: keep — 定義どおりで選択肢も妥当。 / Q2（UAS で最優先すること）: keep — SKYbrary の『エラー管理から UAS 管理へ切り替える』と一致。why に『UAS は事故の一歩手前になりやすい（SKYbrary）』と出典を。 / Q3（PM の主な役割）: fix — 選択肢『客室の案内』『何もしない』が明らかに外れで練習にならない。『無線だけを担当し計器は見ない』『PF が忙しいときだけ計器を見る』などに替え、why は AC 120-71B 1.4 の PM の…
- 新しい問題の案：4 問（訓練の飛行中、教官が「You have the flight controls.」と言いました。訓練生の正しい返事は？；PM が速度のずれをコールしたが、PF が返事をせず、ずれも直らない。AC 120-71B の考え方に近いものは？；権威勾配（authority gradient）が「急すぎる」とき、起きやすいことは？；TEM の考え方として正しいものは？）
- 用語：TEM / 脅威とエラーの管理 / Threat and Error Management；Threat / 脅威（乗員の外から来て運航を難しくするもの）；Error / エラー（乗員の行動・不作為による、意図や期待からのずれ）；Undesired Aircraft State (UAS) / 望ましくない機体の状態；Countermeasure / 対策（防ぐ・見つける・小さくする）；Briefing / ブリーフィング（事前の打ち合わせ）；（ほか 13 件）
- 出典：update R.icaoTEM：label を『ICAO Doc 9683 Human Factors Training Manual（第 1 版 1998・2003 年の改訂で TEM の章を追加）』に。URL は icao.int のトップではなく、要約として SKYbrary TEM in Flight Ope…；fix R.rmh URL → https://www.faa.gov/regulationspolicies/handbooksmanuals/risk-management-handbook-faa-h-8083-2a（現行は 404）；update R.automation：正式名 'AC 120-71B Standard Operating Procedures and Pilot Monitoring Duties for Flight Deck Crewmembers (2017)'、URL を PDF へ https://www.faa.go…；add FAA AC 120-51E Crew Resource Management Training (2004, Active) https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC120-51e.pdf；add FAA SAFO 15011 Roles and Responsibilities for Pilot Flying (PF) and Pilot Monitoring (PM) (2015) https://www.faa.gov/sites/faa.gov/files/other_visit/aviatio…；（ほか 3 件）

## 第 26 章 `jet` ジェット機と自動化への準備

節：`crm.jet` プロペラ機とジェット機の違い・`crm.auto` 自動操縦とモード：自動化と付き合う・`crm.upset` 異常な姿勢を防ぐ（UPRT の考え方）

### 今の問題

- **誤り**
  - crm.jet・R.afh15（book-core.js:21）・章末クイズ Q1「AFH 第 15 章 Transition to Jet-Powered Airplanes」→ FAA-H-8083-3C では第 16 章（第 15 章は Turbopropeller）（https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook）
  - crm.upset「回復は『迎え角を減らす（押す）→ 翼を水平 → 出力 → 安定』」→ AC 120-111 は機首上げ（Table 1）と機首下げ（Table 2）で別の型。機首下げは最短方向に翼を水平にしてから引き、推力・抗力を調整（高速なら減らす）（https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-111_CHG_1_Ed_Upd_3.pdf）。AFH 第 5 章のスパイラル：アイドル → 少し押して荷重を抜く → 翼を水平…
  - 巻末 examples「巡航 35,000 ft … 約 105 NM 手前から降下を始める（3 NM / 1,000 ft）」→ AFH 第 16 章の例は 35 × 3 ＋ 段階的な減速の分 約 15 NM ＝ 約 120 NM（水平飛行・アイドルで 1 NM に約 10 kt 減速）（https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/17_afh_c…
  - crm.jet「公開情報では、基礎訓練の後は副操縦士任用訓練でエアラインの大型機の免許を目指します」→ 参照の ANA のページ（https://www.ana.co.jp/group/777_30th/20251022_2.html）には免許の取得までしか書かれておらず、裏付けがない。そもそも一般的な準備の章に特定の会社の課程は不要 → 削除。
- **古い**
  - AFH の章番号が 3B（2016）のまま（R.afh15）。現行 3C（2021）は第 16 章。R.afh13（第 13 章 Multiengine）は 3C で正しい。
  - AC 120-111 は現行（Active）だが Change 1（2017-01-04）付き。label を 'AC 120-111 Upset Prevention and Recovery Training (with Change 1)' に、URL を PDF へ。
  - 手動操縦は SAFO 13002（2013-01-04）だけでなく、SAFO 17007 Manual Flight Operations Proficiency（2017-05-04）と AC 120-123 Flightpath Management（2022-11-21、現行）が後に出ている。米国の Part 121 では手動の低速…
  - （ほか 1 件）
- **数値の食い違い**
  - AFH の章番号：book-core.js:21（R.afh15 の label）、book-5.js:159（本文）、book-5.js:185（章末クイズ Q1）、quiz.js:192（why の『AFH 第 15 章』）→ すべて第 16 章に。
  - スプールアップ『数秒』→ AFH 第 16 章『最大 10 秒』。Archer は教材モデルでは推力がスロットルと同時に変わる（physics.js:497〜505 は遅れなしで推力を計算、回転計だけ約 0.5 秒遅れる：physics.js:619 の 1.8/s）。図にするならこの 2 つの値。
  - TOD の例：105 NM → 約 120 NM（AFH 第 16 章）。
  - （ほか 2 件）
- **わかりにくい**
  - crm.jet：coffin corner・マッハ数・MMO の説明がない。
  - crm.jet：スピードブレーキとスポイラーの違い（抗力を増やす／揚力を減らす）。
  - crm.jet：プロペラ機の列の「—」（エネルギー管理・高い高度）が『関係ない』と読める。
  - （ほか 5 件）
- **順番**
  - crm.jet：目的 → thrustResponse の図 → 違いの表（プロペラ機の列を埋める）→ 減速と降下の計画（descentPlan）→ 後退翼・高い高度（短く）→ ここが大切。航空会社の課程の話は削除。
  - crm.auto：目的 → automationLevels の図 → モードを読む（FMA の模式図）→ 3 つの問い → 驚いたら（まず機体を飛ばす・1 段下げる）→ 手で飛ぶ技量（SAFO 13002/17007・AC 120-123）→ この教材についての一文（CADET で消える形のまま）。
  - crm.upset：目的 → upsetBox（定義）→ なぜ大切（LOC-I）→ 防止（エネルギー・自動化のモード・驚き・早く気づく）→ 回復の 2 つの型（upsetRecovery2）→ 小型機の練習は ifr.upset・aero.stall・ops.slow へ → ここが大切。
  - （ほか 1 件）
- **重複**
  - crm.upset と ifr.upset（{ch:ifr}）：どちらも AC 120-111 の UPRT と回復の順番を説明し、順番が食い違う。crm.upset は『防止と大型機の型の考え方』、ifr.upset は『この教材の課目 i2 の小型機の手順』と役割を分ける。ifr.upset の「Push・Roll・Power・Sta…
  - crm.upset の回復と aero.stall の失速回復（前へ → 翼を水平 → パワー）は同じ芯 → 参照でつなぐ。
  - crm.auto のモードの話と hf.srm の「自動化：何をしているか（モード）を常に確認する（第 6 部）」、ifr.np の「自動化の使い方の考え方は第 6 部で扱います」→ 参照の向きは正しい。重複は少ない。
  - （ほか 2 件）
- **節ごとの問題（抜粋）**
  - `crm.jet`：最初の文「公開情報では、基礎訓練の後は副操縦士任用訓練でエアラインの大型機の免許を目指します。」— 特定の会社の訓練課程の話で、この章が航空会社の訓練内容に見える。しかも参照の ANA のページ（R.ana1）は免許の取得までしか書いておらず、副操縦士任用訓練には触れていない（2026-10-26 確認）。削除し、『2 人で飛ぶジェット機…
  - `crm.jet`：「FAA の Airplane Flying Handbook 第 15 章は…」→ 現行の FAA-H-8083-3C（2021）では第 15 章は Transition to Turbopropeller-Powered Airplanes、ジェットは第 16 章（3B〔2016〕では第 15 章だった）。
  - `crm.jet`：「アイドルから加速するのに数秒かかる」→ AFH 第 16 章は『ピストンより遅く、場合によっては最大出力まで 10 秒かかる』。具体的な数字を出典つきで。
  - `crm.jet`：表のプロペラ機の列の「エネルギーの管理 —」「高い高度 —」は、Archer ではエネルギー管理が要らないように読める。AFH 3C には第 4 章 Energy Management（小型機向け）がある。『Archer でも同じ考え（姿勢＋出力）。ジェットは余裕が小さく変化が遅い』と書く。
  - （ほか 24 件）

### 書き直しの方針

節の順（crm.jet → crm.auto → crm.upset）は保ち、どの節も特定の航空会社の課程や SOP に見えないよう、FAA の公開資料（AFH 第 16 章・第 5 章・第 4 章、AC 120-111、AC 120-71B、AC 120-123、SAFO 13002・17007）にもとづく一般論として書く。crm.jet は航空会社の課程の文と ANA の参照を削り、『なぜ今知っておくか』の目的文 → エンジンの反応の図（Archer の教材値と AFH の最大 10 秒）→ プロペラ機の列も埋めた違いの表 → 降下の計画（3 倍＋減速＝約 120 NM の例）、の順にする。crm.auto は自動化のレベルの図と FMA の模式図で『モードを読む・声に出す・3 つの問い・わからなければ 1 段下げる』を見せ、手で飛ぶ技量が土台であることを SAFO 17007・AC 120-123 で補い、この教材に自動操縦がない一文は CADET のフィルターに合う形で残す。crm.upset は最初に upset の定義の図、次に LOC-I が死亡事故の一番の原因であること、防止（エネルギー・モード・驚き）、回復を機首上げと機首下げの 2 つの型（AC 120-111）に分けて示し、小型機の練習の順番は ifr.upset と課目 i2（IFH・POH が優先）へ送る。crm.upset と crm.auto の終わりに bk.key を置き（crm.upset は今ない）、考えてみよう（例：スパイラルで先に引くとどうなる？）を足す。新しい節は不要（中身は 3 節に収まる）。

節の最初の図（いちばん大事な図）：
- `crm.jet`：thrustResponse：横軸 0〜12 秒・縦軸 推力 %。Archer（教材モデル）はスロットルを動かすとすぐ推力が変わる線、ジェットはアイドルからゆっくり立ち上がり最大まで最大約 10 秒かかる線（模式図、AFH 第 16 章）。…
- `crm.auto`：automationLevels：はしご（下から）手で飛ぶ → 手で飛ぶ＋フライトディレクター → 自動操縦の基本モード（針路・高度・昇降率）→ 自動操縦＋FMS（経路・高さを自動）。右に 3 つの問い『何をしている？ なぜ？ 次に何をする…
- `crm.upset`：upsetBox：横から見た Archer 型の機体（planeSide）に機首上げ 25°・機首下げ 10° の線、前から見た機体（planeFront）にバンク 45° の線、その外側を赤で『異常姿勢（upset）』。下に『範囲内でも、…

### 図

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `thrustResponse` | `crm.jet` | 推力（%）と時間（0〜12 秒）のグラフ。Archer（教材モデル）＝スロットルとほぼ同時に変わる段の線、ジェット＝アイドルからゆっくり立ち上がり、最大まで最大約 10 秒の S 字の線（模式図）。間… | AFH 3C 第 16 章 Slow Acceleration of the Jet Engine（up to 10 seconds、Fig… | must |
| `descentPlan` | `crm.jet` | 横から見た降下の模式図：35,000 ft → 降下開始（TOD）約 120 NM 手前（35×3＝105 ＋ 減速 約 15）→ 約 40 NM で 10,000 ft・250 kt へ減速 → 約… | AFH 3C 第 16 章 Descent Planning（Figure 16-14 の例の数値）。 | should |
| `sweptTipStall` | `crm.jet` | 上から見た後退翼：境界層が翼端の方へ流れる矢印 → 翼端が先に失速（赤）→ 揚力の中心が前へ → 機首上げ（さらに迎え角が増える）。比較として、まっすぐな翼（Archer）は付け根から失速。 | AFH 3C 第 16 章 Figure 16-9 の説明（tip stall、center of lift moves forward）。… | nice |
| `coffinCorner` | `crm.jet` | 縦軸 高度・横軸 速度（マッハ）の模式図：低速側の限界（低速バフェット）と高速側の限界（MMO・マッハバフェット）が上に行くほど近づき、交わるあたりが coffin corner。旋回や乱気流で荷重が… | AFH 3C 第 16 章（51,000 ft・M0.73 で 1.4 G なら低速バフェットの例）。軸の数値は入れず模式図と明記。 | nice |
| `automationLevels` | `crm.auto` | 自動化のはしご（下から）：①手で飛ぶ ②手で飛ぶ＋フライトディレクター（指示だけ）③自動操縦の基本モード（針路・高度・昇降率を保つ）④自動操縦＋FMS（経路と高さを計画どおり）。右に 3 つの問い、『… | SAFO 17007 の自動化の組み合わせ（FD・AP・AT の on/off）、AC 120-123 5.3.2.2（組み合わせ・レベルの… | must |
| `fmaSchematic` | `crm.auto` | FMA の模式図：横に 4 マス（推力 ／ 横〔ロール〕／ 縦〔ピッチ〕／ 自動操縦の状態）。作動中のモードは緑（例 HDG・ALT）、待機中（armed）は白（例 LOC）。下に『変えたら FMA … | AC 120-71B 6.9.2（FMA は『誰が何をしているか』を示す、armed から active への遅れ）。G1000 型の自動操… | should |
| `upsetBox` | `crm.upset` | 異常姿勢の定義：横から見た機体（planeSide）に機首上げ 25°・機首下げ 10° の扇、前から見た機体（planeFront）にバンク 45° の扇。扇の外が『異常姿勢（upset）』。下に『… | AC 120-111 1-6a、AFH 3C 第 5 章 Defining an Airplane Upset。新しい planeSide … | must |
| `upsetRecovery2` | `crm.upset` | 回復の 2 つの型を左右に：機首上げ（自動操縦を切る → 機首下げの操作で機首を下げる → 出力を調整 → 速度が増えたら水平へ）／機首下げ（自動操縦を切る → 失速なら回復 → 少し押して荷重を抜き… | AC 120-111 Table 1・Table 2、AFH 3C 第 5 章 Figure 5-3 とスパイラルの 5 段階。 | must |
| `energyMargin` | `crm.upset` | エネルギーの余裕の目安：速度（運動のエネルギー）・高度（位置のエネルギー）・出力（足せる量）の 3 本の棒。『低い・遅い・アイドル』は 3 本とも短い＝余裕が少ない（例：ファイナル）。 | AFH 3C 第 4 章 Energy Management。数値なし（または Archer の例：進入 70 kt・地上 500 ft・出… | nice |

### 写真

- `crm.jet`：後退翼とつり下げ式のジェットエンジンがよくわかる、飛行中の NASA の DC-8（空中研究機）（候補：https://images.nasa.gov/details/EC00-0050-001 NASA（米国政府の著作物・パブリックドメイン。NASA の画像利用ガイドラインに従い、NASA の推奨を示唆しない））
- `crm.jet`：地上試験中のターボファンエンジン（前から見たファン）（候補：https://images.nasa.gov/details/GRC-1974-C-03151 NASA（パブリックドメイン）— 要確認：人の顔が大きく写っていないか）
- `crm.upset`：NASA Langley の操縦不能（LOC-I）研究用の小型無人模型機（AirSTAR / Generic Transport Model）
- `crm.auto`：NASA Langley の自動化・飛行甲板研究機 Boeing 737（NASA 515、TSRV）の外観
- **入手**（2026-10-26）：NASA の DC-8（`dc8`、`crm.jet`）、地上試験中のターボファンエンジン（`turbofan`、`crm.jet`）。**未入手**：AirSTAR の模型機と NASA 515 の 737（時間の都合で確かめられなかった。`crm.upset` と `crm.auto` は表で説明した）。

### 章末

- 確認問題：Q1（ジェットで出力を使うとき）: fix — 問題文の『AFH 第 15 章』→ 第 16 章。why を『アイドル付近からの加速は遅く、最大まで 10 秒かかることもある（AFH 第 16 章）』に。 / Q2（自動操縦の動きが理解できないとき）: keep（内容は AC 120-123 と合う）— ただし選択肢『すべての電源を切る』『管制に任せる』は明らかに外れ。『別のモードを次々に試し、原因がわかるまで直さない』『自動操縦のまま FMS … / 問題数が 2 問で、規則（各章 3〜5 問）に足りない → 下の提案から 2〜3 問足す。
- 新しい問題の案：5 問（FAA の定義で「異常姿勢（upset）」にあたるのは？；機首下げ・速度が増えている・深く傾いている（スパイラル）。回復でやってはいけないことは？；巡航 35,000 ft から空港へ降りる。AFH 第 16 章の目安で、降下を始めるのはおよそどこ？；後退翼の失速の特徴として、AFH 第 16 章の説明に合うものは？；FAA の SAFO 13002・17007 が運航者に勧めていることは？）
- 用語：Spool-up / スプールアップ（ジェットエンジンの回転が上がるまでの時間）；Propeller slipstream / プロペラの後流；Speedbrake / スピードブレーキ（抗力を増やす）；Spoiler / スポイラー（揚力を減らす板）；Energy management / エネルギーの管理；Top of descent (TOD) / 降下開始点；（ほか 17 件）
- 出典：fix R.afh15：label を『FAA Airplane Flying Handbook（FAA-H-8083-3C）第 16 章 Transition to Jet-Powered Airplanes』に（キー名も afh16 に変えるなら book-5.js の refs も）。URL を章の PDF へ …；add AFH 第 5 章 Maintaining Aircraft Control: Upset Prevention and Recovery Training https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manual…；add（任意）AFH 第 4 章 Energy Management https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/05_afh_ch4.pdf；update R.upset：'AC 120-111 Upset Prevention and Recovery Training (with Change 1, 2017)' https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-111_…；update R.safo：SAFO 13002 の PDF https://www.faa.gov/sites/faa.gov/files/other_visit/aviation_industry/airline_operators/airline_safety/SAFO13002.pdf と add SAFO 1…；（ほか 4 件）

## 第 27 章 `sim` この教材で練習する：家での予習・復習のしかた

節：`sim.can` この教材でできること・できないこと・`sim.how` 効果的な練習の組み立て・`sim.keys` この教材の操作のまとめ

### 今の問題

- **誤り**
  - sim.how「上昇：ピッチ 8°・全開・76 kt」→ 教材の Archer（FL.physics pa28）の全開・76 kt の上昇姿勢は約 10°（3,000 ft で 9.7°、海面で 10.8°）。教官パネルの目安も『機首上げ 約 10°』（physics.js steadyState、school.js:58-68 guideText の計算値）
  - sim.can「認定された訓練装置（FTD・FFS）としての飛行時間の記録」→ FAA が認めた BATD / AATD も条件付きで訓練時間に数えられる（14 CFR 61.4(c)、AC 61-136B）（https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_61-136B.pdf）
  - sim.keys「V / Shift+V：フラップを 1 段下げる」→ アプリでは最大の位置で V を押すと UP まで戻る（app.js:111）。本文に注意として書く。
  - sim.keys「T / Shift+T：トリムを戻す」→『トリムを中立（離陸位置）へ』（app.js:127）。
- **古い**
  - 古くなった版はない：Airplane Flying Handbook FAA-H-8083-3C は 2026-10 時点で FAA のページに現行として載っている（https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook）。…
  - AC 61-136B（2018-09-12）が ATD の承認の現行の AC（新しい版は見つからない）。
- **数値の食い違い**
  - sim.how の上昇姿勢 8° と飛行モデル（約 10°）が合わない。Vy 76 kt 自体は FL.physics pa28 の v.y と訓練校チェックリスト（R.archerCk）と一致。
  - 使い方.md:56「操作の状態の『簡潔に』はスロットル・フラップ・トリムだけ」とアプリ（app.js:413：スロットル・フラップ・脚・トリム）が少し違う（本文には出ないが、sim.screen を書くときはアプリに合わせる）。
  - 使い方.md:178「Share / Back：脚」とガイド pages.js:442「Back / View（クリエイト）」で PS5 のボタン名が違う（PS5 は『クリエイト』）。
- **わかりにくい**
  - sim.keys：W / S の「離すとその角度を保つ」が空中だけの動きであることが書かれていない（地上の離陸の引き起こしでは、離すと中立に戻る）。
  - sim.keys：自動ラダーが標準で ON であることが書かれていないので、『Q / E を使わなくても真っすぐ飛ぶ』理由がわからない。
  - sim.can：FTD・FFS（・ATD）が略語のまま。
  - （ほか 2 件）
- **順番**
  - 画面の見方（教官パネル・操作の状態・G1000 型パネル・講評・合否の決まり）を扱う節がない。新しい節 sim.screen を sim.keys の前に置き、intro.study から bk.see で案内する。
  - sim.keys の表は『実機の操縦装置ごと』（操縦輪 → ペダル → スロットル → トリム → フラップ → 脚 → ブレーキ → 双発だけ → 教材の補助 → 画面）に並べ替える。ゲームパッドは表の後に別の小さな表（または新しい節 sim.pad）。
  - sim.can → sim.how → sim.screen（新）→ sim.keys の順にすると、『何に使うか → どう練習するか → 画面 → キー』の順になる。
- **重複**
  - sim.how の 6 段階が intro.study の 4 段階（読む・答える・飛ぶ・振り返る）と重なる。intro.study は最初の 1 回、sim.how は毎日の練習と役割を分ける。
  - sim.can の bk.warn が章の cautions、intro の bk.warn、FLIGHT-LAB-使い方.md の冒頭と同じ内容。
  - sim.keys の表がアプリの操作ガイド（pages.js:412-435）とキーの一覧（app.js:427-446）と同じ内容で、しかも少ない。本文は『実機との対応』と『初心者がつまずく点』に絞り、全キーの一覧は図で示す。
- **節ごとの問題（抜粋）**
  - `sim.can`：目的の文がなく、いきなり表と注意書き（bk.warn）だけ。「ここが大切」もない。
  - `sim.can`：「認定された訓練装置（FTD・FFS）としての飛行時間の記録」は不十分：FAA が認めた ATD（BATD / AATD：14 CFR 61.4(c)、AC 61-136B）も訓練時間に数えられる。訓練校（Acron の機材一覧）にも FAA 認定の FTD と AATD がある。『家のシミュレータ（この教材）→ ATD → FTD → …
  - `sim.can`：FTD・FFS・ATD が 日本語（English）で説明されていない（表の中で略語だけ）。
  - `sim.can`：「空間識失調などの錯覚（体の感覚がないので起きない）」は不正確：起きないのは内耳（前庭）の錯覚。画面で見える錯覚（滑走路の幅や傾きによる見え方の錯覚など）は一部再現できる。
  - （ほか 20 件）

### 書き直しの方針

章の順を sim.can → sim.how → sim.screen（新）→ sim.keys とし、必要なら sim.pad（新：ゲームパッド）を最後に足す。sim.can は目的の文と deviceLadder の図から始め、家のシミュレータ・ATD・FTD・FFS・実機の違いを 日本語（English）で説明し、『この教材の練習は正式な時間に数えない』を「ここが大切」にする。sim.how は上昇姿勢を飛行モデルの値（約 10°）に直し、チェアフライングは AOPA ASI の記事を参考として示し、『毎日 20〜30 分』は教材のすすめと明記して practicePlan の図を付ける。新しい sim.screen では教官パネル（指示・使うキー・目安・目標のゲージ・連続保持）、操作の状態（大きい画面だけ）、G1000 型パネル（マウスで操作）、講評（「項目ごとの採点を見る」の × と「次に意識すること」）、合否の決まり（手順の時間の 85% 以上が基準内・最大のずれが基準の 1.6 倍以内：school.js:386）をアプリの画面の通りに書く。sim.keys は keyMap の図を主図にし、表を実機の操縦装置の順に並べ替えて、空中だけのピッチ保持・標準のバンク保持・標準で ON の自動ラダー・Shift+R / F・V の折り返し・L・Esc・マウスのパネル操作を補う。キーの説明は必ず現在の app.js / pages.js に合わせ、アプリにある言葉（「キーの一覧」「離すと中立」「操作ガイド」）をそのまま使う。

節の最初の図（いちばん大事な図）：
- `sim.can`：deviceLadder：左から右へ『家のパソコン（この教材：手順・計器・目標値の予習。時間には数えない）→ ATD（BATD / AATD：FAA 認定。一部の時間に数えられる）→ FTD（機種の操縦席を再現）→ FFS（動く台・視界。エ…
- `sim.how`：practicePlan：実機のレッスンの前の晩の 20〜30 分の流れ図『教科書の節（5 分）→ チェアフライング（5 分。目標値を声に出す）→ シミュレータの課目（導入 → 基礎、10〜15 分）→ 講評の × と「次に意識すること」を…
- `sim.keys`：keyMap：教科書用のキーボードの図（幅 400 前後）。使うキーだけを実際の位置に並べ、色で『機首・傾き（W S A D）』『ラダー（Q E Z X）』『出力（R F・Shift）』『トリム・フラップ・脚・フェザー（T V G [ ]）…

### 図

今の図：`（なし：この章に FIG の図はない。以下は本文中の bk.t の表）` → keep、`bk.t sim.can できる / できないの表（book-5.js:195-200）` → fix、`bk.t sim.keys キーの表（book-5.js:211-224）` → fix

| 足す図 | 節 | 内容 | データ | 優先 |
|---|---|---|---|---|
| `deviceLadder` | `sim.can` | 家のパソコンのシミュレータ（この教材）→ ATD（BATD / AATD）→ FTD → FFS → 実機の段の図。段ごとに『手順・計器の練習』『体の感覚（動き・G）』『正式な訓練時間』を ○ / △… | 14 CFR 61.4、AC 61-136B（ATD）、14 CFR Part 60（FFS・FTD）。この教材は『どれでもない』 | should |
| `practicePlan` | `sim.how` | 実機のレッスンの前の晩の 20〜30 分の練習の流れ（教科書 → チェアフライング → シミュレータの課目 → 講評のメモ）と、レッスン後に教科書へ戻る矢印。時間は『教材のすすめ』。 | 教材の設計（出典なしの値と明記）。課目名・レベルは syllabus.js・school.js の LEVELS | nice |
| `flightScreenMap` | `sim.screen（新）` | 飛行画面の配置の模式図：左上＝教官パネル（手順の点・指示・使うキー・目安・目標のゲージ・連続保持のバー・ヒント）、右上＝操作の状態（大きい画面だけ）、右下＝ボタン（一時停止 P・キー H・視点・⚙ 設… | index.html:16-38、style.css:50・81・410-412、pages.js:446-450（画面の見方） | must |
| `keyMap` | `sim.keys` | 教科書用の小さなキーボードの図（使うキーだけ、色で 6 つの組）。各キーに短い日本語のラベルと、組ごとに実機の操縦装置の名前。390 px で文字 12 以上。 | ui.js の KB / GROUPS（キーの位置と色）、app.js:100（キーの割り当て）、app.js:204-234（押している間… | must |
| `controlsToKeys` | `sim.keys` | 実機の操縦装置の線画（操縦輪：引く＝S・押す＝W・回す＝A / D、ラダーペダル＝Q / E とつま先ブレーキ＝B、スロットル＝R / F、トリムホイール＝T、フラップレバー＝V、Seminole の… | app.js:100・204-234、pages.js:416-428 の『実機では』の列 | should |
| `padMap` | `sim.keys（または新しい sim.pad）` | 標準配置のゲームパッドの図：左スティック＝操縦桿、右スティック左右・L1 / R1（LB / RB）＝ラダー、右スティック上下・十字キー上下＝トリム、R2 / L2（RT / LT）＝スロットル、×（… | app.js:176-194、pages.js:442 | nice |

### 写真

- `sim.can`：動く台に載った研究用フライトシミュレータの外観（NASA Ames Vertical Motion Simulator の T-cab）（候補：https://images.nasa.gov/details/ARC-1997-AC97-0311 NASA（米国政府の著作物・PD。NASA のメディア利用ガイドラインに従い、ロゴの使い方と人物の写り込みを確認））
- `sim.keys`：小型機の操縦輪（ヨーク）・スロットル・フラップレバーの近接写真（画面の計器が写っていないもの）
- **入手**（2026-10-26）：NASA Ames の Vertical Motion Simulator（`motionSim`、`sim.can`）、初期の飛行シミュレータ Link Trainer（`linkTrainer`、`sim.can`。NASA の写真。人の写っていないもの）。**未入手**：操縦輪・スロットルの近接写真（Wikimedia Commons が回数の制限を返したため、確かめられなかった）。
- **図**：`deviceLadder`・`practicePlan`・`flightScreenMap`・`keyMap`・`controlsToKeys`・`padMap` は描きませんでした。図の数が目標（70〜90）を超えていた（第 21〜24 章で増えた）ので、この章は表で説明しました。画面とキーの絵は、アプリの操作ガイドとキーの一覧（H）にあります。

### 章末

- 確認問題：Q1：keep（この章の要点。選択肢も妥当）。 / Q2：fix（ほかの選択肢『椅子を揺らして錯覚を体験する』『飛行機の座席を調整する』『自動操縦で飛ぶこと』があり得なさすぎる。『実機の操縦席に座って計器を眺める』『同じ課目をシミュレータで続けて何度も飛ぶ』『教官の飛行を見学する』など、もっ…
- 新しい問題の案：5 問（この教材のキーボードで、機首を上げる（操縦輪を引く）キーは？；標準の設定で、空中で W / S から手を離すとどうなる？；家のパソコンのシミュレータでの練習を、正式な訓練時間としてログブックに記録できるか？；この教材の Archer で、上昇の目標値として正しい組み合わせは？；フラップを 1 段上げるキーは？）
- 用語：修正：FTD / FFS を分ける：FFS（Full Flight Simulator）＝動く台と視界のある最上位の訓練装置、FTD（Flight Training Device）…；追加：ATD（Aviation Training Device：BATD / AATD） / 簡易な認定訓練装置 / FAA が承認したもの（AC 61-136B）；追加：Pitch hold / ピッチ保持 / この教材の機能：W / S を離すとその機首の角度を保つ（空中）；追加：Auto rudder / 自動ラダー / この教材の補助（標準 ON、片発の課目では OFF）；追加：Callout / コールアウト（声に出す確認） / ；追加：Briefing / ブリーフィング（飛ぶ前の打ち合わせ） / 課程表の課目の説明；（ほか 2 件）
- 出典：keep：R.afh（FAA-H-8083-3C、現行）。ただし『チェアフライング』の出典にはならないので、本文の基本操縦の参照として残す；remove：R.ana1（この章は ANA の公開情報を使っていない。sim は CADET では除かれるが、TEXTBOOK に出るので不要な実名を減らす）；add：14 CFR 61.4（訓練装置の資格と承認）https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.4；add：FAA AC 61-136B FAA Approval of Basic Aviation Training Devices (BATD) and Advanced Aviation Training Devices (AATD) https://www.faa.gov/documentLibrary/medi…；add（参考・民間）：AOPA Air Safety Institute『Training and Safety Tip: Master the chair』（2024-07-23）https://www.aopa.org/news-and-media/all-news/2024/july/23/training-an…；（ほか 1 件）
