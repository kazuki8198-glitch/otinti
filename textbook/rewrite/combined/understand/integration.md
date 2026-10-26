# 統合マップ（integration）：教科書と基礎教材に依存しているところ

調べた日：2026-10-26（ブランチ `claude/busy-shannon-ddxinc`、HEAD `79d9565`）。リポジトリのファイルは 1 つも変えていません（`git status` は空のまま）。
確かめ方：ソースと README・計画書を全部読み、FLIGHT LAB のモジュールを Node の `vm` に読み込んでリンク・数を数え（スクリプトはスクラッチパッドだけに置いた）、TEXTBOOK の `content`・`build` テスト（12/12 合格）と CADET の `content`・`school` テスト（14/14 合格）を流しました。
FLIGHT LAB のテストは流していません（`flight.test.mjs`・`browser.test.mjs` は `build()` を呼び、`outputs/FLIGHT-LAB.html` を書き換えるため）。CADET の `ai.test.mjs` は `cadet/node_modules` が入っていないので、この環境では動きません（`@anthropic-ai/sdk` が見つからない）。

---

## 0. まとめ（新しい設計が最初に知っておくこと）

1. **教科書（`FL.book`）は 4 つの製品の土台です。** FLIGHT LAB の画面（課程表・学科テスト・英語交信・教科書ページ）、TEXTBOOK（教科書だけの 1 ファイル）、CADET（3D のゲーム。講師の授業・教官の質問・タブレット・AI 教官）が、`flight-lab/src/book-*.js` を**コピーせずにそのまま読み込んで**います。API・節 ID・`bk.aim`／`bk.key`・各節の最初の `<svg>` が、ほかの製品の動きを決めています。
2. **基礎教材（`FL.kiso`）は FLIGHT LAB の 1 ページだけです。** つながっているのは `build.mjs` の 1 行、`pages.js` の「基礎教材」ページ、`school.js` の `kisoRead`／`kisoQa`、`ui.js` のアイコン、`style.css` の `kz-*`、テスト 4 本（node 3・ブラウザ 1）。課目・学科テスト・英語交信・TEXTBOOK・CADET からは一切参照されていません。中身を変える自由度は大きいが、**出典の義務（写真のクレジット、CC BY-SA を改変しない）と、元の Word から作られた生成物であること（生成スクリプトはリポジトリにない）**が制約です。
3. **節 ID が「データベースの主キー」です。** 課目のリンク（37 課目）、学科テストのリンク（14 分野）、英語交信の各場面（7 か所）、学習記録（`read`・`bookQuiz`）、TEXTBOOK の URL（`#aero.lift`）、CADET の質問メニュー・セーブ（`seen['ask:sec:…']`）・テストが節 ID を直接持っています。**章 ID と節 ID の頭は一致しない**（例：章 `radio2` の節は `comm.*`、章 `tl` の節は `ops.*`、章 `jet` の節は `crm.*`）ので、頭の文字から章を推測するコードは書けません。
4. **容量**：今の `FLIGHT-LAB.html` は **9,394,328 バイト（8.96 MiB）**。内訳は基礎教材 4.25 MB（うち写真 2.27 MB）、教科書の写真 3.20 MB、教科書の本文と図 0.92 MB、アプリ本体 約 1.0 MB。
   **このブランチの `build.mjs` には容量の上限（`MAX_BYTES`）がありません。** 基礎教材の README が書く「12 MB の上限（`build.mjs` の `MAX_BYTES`）」は、3D 表示の v2.4 のブランチ（`abbf2d0`・`origin/kiso-data`）にだけあります。そのブランチと合わせると 12 MiB を超えます（10 章）。
5. **出典と写真の決まりが 2 冊で違います。** 教科書は「縮小などの加工あり」（切り抜きあり。CC BY-SA は同じライセンスで再配布）、基礎教材は「CC BY-SA の写真は切り抜き・色調整・文字入れをしない」「注記は PD・CC0・CC BY だけ」。また基礎教材には**実在の航空会社の写真**（第 0 章の扉、全日空の 787）と ANA・JAL の出典があり、教科書の STYLE（航空会社の写真を使わない）と CADET の架空の世界（実名を消すフィルタとテスト）に合いません。

---

## 1. 製品の目的と読者（ドキュメントに書いてあること）

| 製品・本 | 目的 | 読者 | 出どころ |
|---|---|---|---|
| FLIGHT LAB（アプリ） | 公開情報を基にした**非公式の自主学習用**飛行訓練教材。ブラウザで 1 ファイルを開くだけ（オフライン）。公開されている ANA の基礎訓練の流れ（ロンドンで英語の座学 → Sanford で Piper Archer → 航法 → 計器 → Seminole → CRM/TEM）を「学ぶ順序」として借り、飛行の原理・操縦・計器・英語の交信・多発・CRM/TEM を自習できるようにする。ANA の公式ソフトでも認定訓練装置でもなく、時間・技能・資格の証明にならない。NOT FOR NAVIGATION | 日本語で学ぶ、エアラインの訓練生（を目指す人） | `flight-lab/README.md`、`flight-lab/outputs/ANA-SANFORD-調査と設計.md`「1. 位置づけ」、`FLIGHT-LAB-使い方.md` |
| 教科書（`FL.book`、6 部・27 章・154 節） | 課程の順（第 1〜6 部＝課程表の第 0〜5 段階と同じ phase `p1`〜`p6`）に、FAA のハンドブック・ACS・AIM・14 CFR・公開チェックリストを出典にして説明する。アプリの課目・学科テストと相互リンク | 「英語の座学を始める前の訓練生。飛行機のことをほとんど知らない人」。です・ます、1 文 50 字以内、専門用語は「日本語（English）」 | `textbook/rewrite/STYLE.md`「読む人と文章」、`PLAN.md`（「初めて学ぶ訓練生にもっとわかりやすい教科書」） |
| TEXTBOOK（`textbook/`） | 教科書だけを読む 1 HTML（4.4 MB）。目次・検索・`#節ID`・全文（印刷）・明暗・文字の大きさ | 同上（アプリを使わずに読む人） | `textbook/README.md` |
| 基礎教材（`FL.kiso`、第 0〜13 章・393 節） | **日本の航空法・国内の運航を前提にした座学教材**「パイロット基礎教材」第 3 版（図改訂）2026-10-26。国土交通省の学科試験出題範囲（自家用操縦士 飛行機・計器飛行証明）に照らした範囲。記述・計算・状況判断の問題と解説、用語集、出典 | 「固定翼の航空会社パイロットを目指す初学者。数学は四則演算を出発点」。1 回 30〜45 分、図を自分で描き直す学び方を勧める | `flight-lab/kiso/README.md`、`.analysis/kiso/kiso00.txt`（扉）、`kiso00` の出典 [1][2] |
| CADET（`cadet/`） | 一人称の 3D ゲーム。架空の翔洋航空の訓練所で暮らし、授業を受け、点検し、飛ぶ。FLIGHT LAB の課目・採点・教科書・問題集をそのまま使う。公開情報を基にした非公式のゲームで、会社・人物は架空 | 同じ学習者（遊びながら） | `cadet/README.md`、`cadet/PLAN.md` |

ドキュメントに共通の「主張しないこと」：ANA 公式、SOP の再現、実機性能の再現、資格との関係、実機訓練の代わり、実在空港・実管制での使用。必須の注意文（「本アプリは公開情報を基にした非公式の自主学習用教材です。実機訓練、教官の指示、POH/AFM、SOP、航空法規を優先してください。」）は、テストで文字どおりに確かめられています（6 章・9 章）。

---

## 2. 全体図：だれが何を読むか

```
flight-lab/src/
  physics.js avionics.js sanford-course.js school.js syllabus.js      ← 課目・採点・記録（教科書が読み込み時に physics を使う）
  book-figs.js（FL.bookFigs 100 図・FL.bookCalc 計算機 7）
  book-core.js（FL.book：R・PARTS・CHAPTERS・bk・add・findSection・fix・html・text・wire）
  book-photos.js（FL.bookPhotos 30 枚・3.2 MB）                         ← FLIGHT LAB と TEXTBOOK だけ（CADET は読まない）
  book-1.js book-2.js book-comm.js(before:'hf') book-3.js book-4.js book-5.js   ← 27 章
flight-lab/kiso/kiso-data.js（FL.kiso：生成物 4.25 MB）                ← FLIGHT LAB だけ
  quiz.js（14 分野・145 問、各分野が節にリンク）  radio.js（英語交信、FL.book.R を出典に使う）
  pages.js（教科書ページ・基礎教材ページ・課目のブリーフィング・学科テスト・英語交信・学習記録・about）
  app.js ui.js index.html style.css

textbook/build.mjs   FL_MODULES 14 本（physics…book-5、book-photos あり、kiso なし・quiz/radio なし）＋ src/render.js・page.js
cadet/build.mjs      FL_MODULES 16 本（physics…book-5、acmesh、quiz、radio。book-photos なし・kiso なし）＋ esbuild で main.js
```

| 読む側 | `FL.book` | `FL.bookFigs`／`bookCalc` | `FL.bookPhotos` | `FL.kiso` | `FL.quiz` | `FL.radio` |
|---|---|---|---|---|---|---|
| FLIGHT LAB（`pages.js` ほか） | ○ | ○（`BK.wire`） | ○（`bk.photo`） | ○（基礎教材ページのみ） | ○ | ○ |
| TEXTBOOK | ○ | ○ | ○ | × | × | × |
| CADET | ○（`content/book.js` で絞り込み） | 図は SVG として、計算機は消す | ×（`bk.photo` は空文字） | × | ○（授業・試験・練習） | ○（k3〜k6） |

---

## 3. 教科書の API（`flight-lab/src/book-core.js`）と、決まっていること

### 3.1 読み込み順（壊すと動かない）
- `physics.js` が先（book-1/3/4/5・book-figs が読み込み時に `FL.physics` の機体データで本文・図を作る。book-4 と book-figs は `FL.avionics` も使う）。
- `book-figs.js` → `book-core.js` → （`book-photos.js`）→ `book-1.js` → `book-2.js` → `book-comm.js` → `book-3.js` → `book-4.js` → `book-5.js`。
- `book-comm.js` の 5 章は `before: 'hf'`（第 12 章「人間の能力」の前に差し込む）。`hf` を登録する `book-2.js` の後でないと、後ろに付いてしまう。
- FLIGHT LAB の `build.mjs` の `MODULES`（23 本）、`test/load.mjs` の `CORE`、`flight.test.mjs` 12 行目、TEXTBOOK の `FL_MODULES`（14 本・テストで順番まで確かめる）、CADET の `FL_MODULES`（16 本）と CADET の各テストの読み込みリスト、`textbook/rewrite/tools/counts.mjs` の `MODS`、すべてに同じ順が書かれています。
- 開発用の `flight-lab/src/index.html`（`<script src>` の列）には **`book-photos.js` がありません**（ビルド後の HTML には入る）。開発中にページを開くと教科書の写真が出ません（小さな食い違い）。

### 3.2 `FL.book` の中身
| 名前 | 中身 | 使う側 |
|---|---|---|
| `R` | 出典 87 件（`{label, url, note?}`） | 各章の `refs`、`radio.js` の `ref(k)`（場面の出典 `aim42`・`aim41`・`jo71`・`aim43`・`aim52`・`pcg`・`aim63`・`aim64`・`aim` を `FL.book.R` から引く） |
| `PARTS` | 6 部（`id: 'p1'〜'p6'`、`title`、`phase`） | FLIGHT LAB の目次、TEXTBOOK の目次、CADET の質問メニュー（部の題名から後ろの括弧を消して使う `partShort`） |
| `CHAPTERS` | 27 章。章の形 `{id, part, t, en, summary, secs, terms, examples, cautions, quiz, refs, lessons, n, before?}`、節の形 `{id, t, h}`（`h` は文字列か関数） | 全部 |
| `bk` | 書くための関数（下の表） | `book-*.js` |
| `add(ch)` | 章を登録。`before` があればその章の前へ。番号 `n` は並び順から毎回振り直す | `book-*.js` |
| `findSection(id)` | → `{ch, sec}`。全章をなめて探す（ID の頭で章を決めない） | FLIGHT LAB の全リンク、TEXTBOOK、CADET のテスト |
| `fix(str)` | `{ch:id}` → 「第 N 章」（ない章は「（別の章）」） | 本文・章末・学科テスト（`{ch:crm}`） |
| `html(sec)`／`text(sec)` | 節の HTML（`fix` 済み）／タグを除いた文字（キャッシュ `_txt`） | 全部 |
| `wire(root)` | `[data-calc]` に計算機をつなぐ | FLIGHT LAB・TEXTBOOK |
| `FIG`（getter） | `FL.bookFigs` | 本文 |

### 3.3 `bk.*`（節の形を決める部品。CADET がこの形に依存）
| 関数 | 出力 | 今の数 | 依存しているもの |
|---|---|---|---|
| `bk.aim` | `<p class="bk-aim">` 節のねらい | 154 節すべて | CADET：節の最初の 1〜2 文を「要約（summary）」として読む（AI 教官の目次・質問の答えの予備） |
| `bk.key` | `<div class="bk-key"><b>ここが大切</b><ul>…` | 154 節すべて（平均 3 項目） | CADET：箱の `<li>` が「要点（keyPoints）」。講師の授業（1 節 2 行まで）、教官の質問の答え（4 行まで）、「大事なことは N つ」の N（テストで箱の数と一致を確認） |
| `bk.warn`・`bk.f`・`bk.q`（`<details class="bk-q">`）・`bk.t`・`bk.src` | 注意・式・考えてみよう・表・出典 | warn 25・q 111（TEXTBOOK の `details` 111）・t 108・src 12 | TEXTBOOK（印刷時に `details` を開く）、CADET（問いだけ残った `details` を消す） |
| `bk.sim(text, …[id, label])` | `<div class="bk-sim">` と `button[data-lesson]` | 51 節・ボタン 59（TEXTBOOK の `simTags` 59） | FLIGHT LAB：押すと課目を開始。TEXTBOOK：課目の札に置き換え。CADET：箱ごと消す |
| `bk.calc(name)` | `<div class="bk-calc row" data-calc>` | 10 か所（turn・da・xwind・wca・wb・fuel・rule60 の 7 種類） | FLIGHT LAB・TEXTBOOK で動く。CADET は消す |
| `bk.see(secId, label)` | `button[data-sec]` | 86 本 | FLIGHT LAB：その節へ。CADET：同じ本にある節なら `span.bk-see`。テストで全部解決を確認 |
| `bk.fact`・`bk.est` | 「公開情報」「推測・要確認」の札 | — | CADET は札と「公開情報では、」を消す |
| `bk.photo(id)` | `<figure class="bk-photo">`＋作者・ライセンス・出典のリンク・「縮小などの加工あり」 | 30 か所（写真 30 枚、1 枚 1 か所） | `FL.bookPhotos` が無ければ空文字（CADET） |

図：`book-figs.js` の `FIG` に 100 個、本文の `<figure class="bk-fig"><svg …>` は 95 か所（TEXTBOOK の `COUNTS.figs`）、図のある節 87。図は**暗い板（#0b1422）**の上に描く前提（STYLE）。`viewBox` の幅 360〜440・文字 12 以上（スマホ 390 px）。SVG は単独で正しい XML（CADET が `data:image/svg+xml` で描くため）。

章末：用語 446（`[English, 日本語, 補足]`）、例 73、注意 66、確認問題 135（4 択・`answer`・`why`）、出典 202、対応する課目 66。

---

## 4. FLIGHT LAB の中のつなぎ目（教科書）

### 4.1 `syllabus.js`：課目 → 節（`book: [...]`）
37 課目が節にリンクし、テストで全部が `findSection` で解決することを確かめています（`flight.test.mjs` 227 行）。ブリーフィングの「教科書の関連する節」ボタン（`pages.js` 156・210 行）と、CADET の `lessonSections`（教官の図・質問メニューの先頭・今日の自習の図）がこれを読みます。

| 段階 | 課目 → 節 |
|---|---|
| s0 地上学科 | k3 → comm.basic, comm.numbers ／ k4 → comm.atis, comm.dep, comm.tower, comm.radar, comm.arrive ／ k5 → comm.readback, comm.clarify ／ k6 → radio.listen（k1・k2 はリンクなし） |
| s1 Archer | a1 → aero.forces, ops.trim ／ a2 → ops.sl ／ a3 → ops.climb ／ a4 → aero.turn ／ a5 → aero.turn, aero.vn ／ a6 → aero.stall, ops.slow ／ a7 → aero.stall ／ a8 → aero.stall, aero.left ／ t1 → ops.takeoff, aero.left ／ t2 → ops.pattern ／ t3 → ops.landing ／ t4 → ops.goaround ／ e1 → emg.abort ／ e2 → emg.engine ／ e3 → emg.engine ／ c1 → intro.course（NOTES：中身は solo.check。CADET は `intro.*` を除く） |
| s2 航法 | x1 → ops.xwind ／ x2 → ops.short ／ x3 → ops.short ／ n1 → nav.vor ／ n2 → nav.dr, nav.divert ／ n3 → nav.lost, nav.vor |
| s3 計器 | i1 → ifr.scan ／ i2 → ifr.upset ／ i3 → ifr.partial ／ i4 → ifr.hold ／ i5 → ifr.ils |
| s4 Seminole | m1 → me.basics ／ m2 → me.oei, me.vmc ／ m3 → me.vmc ／ m4 → me.oei ／ m5 → me.oei |
| s5 CRM | r1 → crm.tem |

逆向き（教科書 → 課目）：章末の `lessons`（66）と本文の `bk.sim` ボタン（59、例 `ops.trim→a1`・`comm.sfb→k5`・`comm.practice→k4,k6`）。課目 ID（`a1`…`r1`、`k1`…`k6`）は教科書の中にも書かれていて、テストで `SC.lesson(id)` が存在することを確かめます（FLIGHT LAB・TEXTBOOK の両方）。

### 4.2 `quiz.js`：学科テスト 14 分野・145 問
形 `[問い, [4 択], 正解の番号, 理由]`。各分野が 1 節にリンク（`b.book`）し、結果画面の「関連する教科書へ」とブリーフィングに使います。

| 分野 ID | 題 | 節 | 問 |
|---|---|---|---|
| q_aero | 飛行の原理 | aero.forces | 10 |
| q_sys | 機体と装備 | sys.engine | 10 |
| q_perf | 性能と重量・重心 | perf.da | 10 |
| q_wx | 航空気象 | wx.metar | 10 |
| q_law | 規則と空域 | law.vfr | 10 |
| q_comm | 航空英語と ATC 交信 | comm.pattern | 10 |
| q_radio | 英語交信（実践） | comm.readback | 15 |
| q_hf | 人間の能力と判断 | hf.adm | 10 |
| q_ops | 基本操縦と離着陸 | ops.trim | 10 |
| q_emg | 緊急操作 | emg.engine | 10 |
| q_nav | 航法 | nav.plan | 10 |
| q_ifr | 計器飛行 | ifr.scan | 10 |
| q_me | 双発機（Seminole） | me.oei | 10 |
| q_crm | CRM・TEM・自動化 | crm.tem | 10 |

- 問題文に `{ch:crm}` が 1 か所（`BK.fix` で直す）。CADET は自分の章番号で直す（`refsIn`）。
- 分野 ID は CADET の授業（`BANK_OF`）と試験（`EXAMS`）が直接持っています（7 章）。学習記録の `quiz[分野ID]` も同じ。
- 中身の結びつき：問題の数値は教科書の値（コメント「Numbers of the aircraft are the textbook's values」）。食い違いは `textbook/rewrite/NOTES.md` に（教科書以外は直していない）。

### 4.3 `radio.js`：英語交信
- `RD.FLIGHT`（1 回の飛行の全交信 49 行）の 7 段階が節を持つ：atis → comm.atis、gnd1 → comm.dep、twr1 → comm.tower、dep → comm.radar、app・twr2・gnd2 → comm.arrive（テストで解決を確認）。画面に「教科書 N. 節名」のボタン（`pages.js` 771 行）。
- 数字のドリルの画面に `comm.numbers` へのボタン（`pages.js` 841 行、ID を直書き。無ければボタンを出さないだけ）。
- 場面 41（Sanford の 6 場面を ID のまま含む）の出典キーは `FL.book.R` から引く（`ref()`、287 行）。
- 中身の結びつき：交信の文は教科書第 10 章（`radio4`）の 1 回の飛行と同じ流れ（コメント「the textbook's chapter, played line by line」）。

### 4.4 `pages.js`
| 場所（行） | 何をしているか |
|---|---|
| 13 | `BK = FL.book, KZ = FL.kiso` |
| 27・46 | メニューの大きな入口「教科書」：`全 ${章数} 章・${節数} 節（読んだ節 ${S.progress.read.length}）`（`read` は節の存在で絞っていない） |
| 156・171・210 | 課目のブリーフィングの「教科書の関連する節」（`l.book` → `findSection` → `openPage('book'); openSection(id)`） |
| 272・277 | ページ ID と題：`book: '教科書'`、`kiso: '基礎教材（日本の航空法 前提）'` |
| 286〜360 `renderBook`／`openSection` | 部 → 章 → 節の目次、本文検索（`BK.text`）、読んだ節 `S.progress.read`（`読んだ節 N / 154`）、章の最初の節に `en` と `summary`、最後の節に章末（用語・例・注意・確認問題・対応する課目・出典）。確認問題の正解で `S.progress.bookQuiz['章ID.番号'] = 100`。`[data-lesson]` → `app.startLesson`、`[data-sec]` → `openSection`、`BK.wire`。節ごとの注意文「本文は公開情報に基づく要約と教材の説明です。…」 |
| 493・503 | 学科テスト：`BK.fix` で問題を直す、結果画面の「関連する教科書へ」 |
| 771〜772・841〜843 | 英語交信の画面から教科書へ |
| 888 | 学習記録の画面：基礎教材の行だけ（教科書の読んだ節の行はない） |
| 960 | about：「教科書（全 27 章・出典付き）」 |
| 974 | `built`：`openSection`・`openKiso` を外へ出す（テストが使う） |

### 4.5 `school.js`：学習記録（localStorage・JSON）
- キー：`flightlab-records-v2`（記録）、`flightlab-progress-v2`（進み具合）。`app.js` の設定は `flightlab-prefs-v2`。
- `sanitizeProgress`（519 行）：`{lessons, time, landings, read, quiz, bookQuiz, atc, kisoRead, kisoQa}`。
  - `read`：教科書の節 ID。形 `/^[a-z0-9_.\-]{1,40}$/`、**最大 500 件**。
  - `bookQuiz`：キーは `${章ID}.${問の番号}`（並びが変わると別の問に付く）、値 0〜100。
  - `quiz`：分野 ID → 最高点。`atc`：場面 ID（`/^[a-z0-9_]{1,20}$/`）。`lessons`：課目 ID（`/^[a-z0-9_]{1,12}$/`）。
  - `kisoRead`・`kisoQa`：`/^kiso[a-z0-9_.\-]{1,36}$/`、**最大 1,000 件**。`kisoQa` のキーは `${章ID}.q${n}`（例 `kiso05.q1`）。
- `exportJSON`／`importJSON`（`app: 'FLIGHT LAB', kind: 'learning-record', version: 2`）・`mergeProgress` が全部の項目を運ぶ。
- 注意：2 冊を 1 つの `read` にまとめると 154＋393＝547 件で、**500 件の上限で切れる**。

### 4.6 `app.js`・`ui.js`・`index.html`・`style.css`
- `app.js` 495 行：一時停止の「教科書」ボタン（`#pz-book` → `openPage('book')`）。`window.__lab.showPage(id)`（テストが `'book'`・`'kiso'` など 11 ページを開く）。
- `ui.js`：アイコン `book`・`kiso`。
- `index.html`：一時停止の `#pz-book`、`#page`・`#pageTitle`・`#pageTools`・`#pageBody`（ページの枠）。
- `style.css`：`.bk-*`（教科書）、`.kz-*`・`.kiso-t`・`.kiso-eq`（基礎教材。図は白い角丸の枠 `.kz-fig { background:#fff }`）。TEXTBOOK と CADET は `.bk-*` を自分の CSS で描き直している。

### 4.7 `build.mjs`
- `MODULES`（23 本）：`physics, avionics, sanford-course, school, syllabus, book-figs, book-core, book-photos, book-1, book-2, book-comm, book-3, book-4, book-5, kiso/kiso-data.js, quiz, radio, ui, acmesh, scene, google3d, pages, app`。名前に `/` があると `flight-lab/` からの相対で読む（基礎教材のため）。
- 全部をインラインの `<script>` にし、`</script` と `<!--` を逃がす。Draco の wasm を base64 で入れる。日付と git のハッシュを入れる（`FL.BUILD_INFO`）。
- **容量の確認はない**（10 章）。

### 4.8 FLIGHT LAB のテスト（`npm test` = ビルド → `flight` 37・`avionics` 13・`browser` 2、計 52 件）
教科書・基礎教材に関わる確認：
- ビルド：`<script src>` なし、外部の CSS なし、`fetch` 先は `tile.googleapis.com` だけ、インラインの `<script>` 15 本以上。**本文（基礎教材の写真の base64 を除いた全部）に `TODO`・`FIXME`・`TBD`・`XXX`・`PLACEHOLDER`・`lorem ipsum`・`{{…}}`・`<!--BUILD:`・`sk-ant-api`・`AIza…` が無い**。必須の注意文・`NOT FOR NAVIGATION`・`模式図`・要素 ID の重複なし。
- 教科書：章 16 以上・6 部（p1〜p6 の順）・各章に `t, en, summary`・節 2 以上・各節 200 字以上・用語 3 以上・例と注意 1 以上・問 2 以上（`answer` が範囲内）・出典は https・`lessons` が存在・**節 80 以上**・節 ID の重複なし。全節の `data-sec`・`data-lesson`・`data-calc` が解決。本文に注意文と語（`Vmc`・`METAR`・`91.155`・`ゴーアラウンド`・`ILS`・`TEM`・`IMSAFE`・`偏流修正`）。
- 学科テスト：12 分野以上・各 8 問以上・計 120 問以上・4 択で重複なし・**各分野の `book` が解決**・分野 ID が課目 ID とぶつからない。
- 無線の章：`radio1`〜`radio5` が `hf` の直前に並ぶ、`c.n === i+1`、`{ch:` と「（別の章）」が残らない、`fix('{ch:crm}')` が正しい、無線の 5 章で節 20 以上、AIM・14 CFR などの語 19 個、`gusts` を書かない。`RD.FLIGHT` の各段階の `sec` が解決。地上学科 k3〜k6 と `q_radio` がある。
- 課目：各課目の `book` が解決。
- ブラウザ：教科書の `aero` の最後の節を目次 `#bkNav .bk-item` から開き、問 0（`input[name="q_aero_0"]`）に正解して `bookQuiz['aero.0'] === 100`。写真のある節を開いて `data:image/webp`・クレジットのリンク 2 本。全ページ（`book`・`kiso`・`quiz`・`guide`・`tutor`・`readq`・`sfb`・`radio`・`records`・`g3d`・`about`）を開いてエラーなし。

---

## 5. TEXTBOOK（`textbook/`）

- `build.mjs`：`FL_MODULES` 14 本を `../flight-lab/src` から**そのまま**入れ（コピー禁止はテストで確認）、`src/render.js`（章・節 → HTML の文字列）と `src/page.js`（DOM）を足す。同じソースから同じバイト列（日付・ハッシュなし）。出力 `outputs/TEXTBOOK.html` 4,408,849 バイト。容量の上限はない（写真は 1 枚 120 KB 以下・合計 5 MiB 以下をテストで確認）。
- 使う API：`BK.CHAPTERS`・`PARTS`・`html`・`text`・`fix`・`findSection`・`wire`、`FL.school.lesson(id)`（課目の題・目的・理由・基準を札に出す）、`FL.bookPhotos`。
- 決め打ち：
  - `test/load.mjs`：**`COUNTS = { chapters: 27, secs: 154, quiz: 135, terms: 446, examples: 73, cautions: 66, refs: 202, lessons: 66, figs: 95, photos: 30, calcs: 10, simTags: 59, details: 111 }`**、**`ORDER`**（27 章の ID の並び）、注意文 4 つ（`NOTICE`）、節の注意文（`SEC_NOTE`）、アプリの節の注意文（`APP_NOTE`）。
  - `src/index.html` の見出し「全 6 部・27 章・154 節」（テストで本と一致を確認）。
  - `render.js`：`APP_SECTIONS = ['intro.study']` と章 `sim` に「この節は FLIGHT LAB（アプリ）の使い方の説明です」。
  - `page.js`：localStorage のキー `textbook.read`・`textbook.quiz`・`textbook.prefs`・`textbook.last`。URL は `#節ID` と `#all`。課目の札のリンク先 `APP_URL = '../../flight-lab/outputs/FLIGHT-LAB.html'`。
  - テスト：`#aero.lift`（目次の番号 `2.2`）、課目 `t4` の題「着陸復行（ゴーアラウンド）」、本文の `<a>` は写真のクレジットだけ、外部へのリンクの数 ＝ 出典 202 ＋ 写真 30 × 2、全写真が `PHOTO-CREDITS.md` に載っている、ライセンスは決まった形（`Public domain…`・`CC0 1.0`・`CC BY(-SA) n.n`）、メタデータなし、暗い板の色 `rgb(11, 20, 34)`。
- 基礎教材は入っていません（`FL_MODULES` に `kiso` なし）。

---

## 6. CADET（`cadet/`）

### 6.1 読み込みと容量
- `build.mjs` の `FL_MODULES`（16 本）：`physics, avionics, sanford-course, school, syllabus, acmesh, book-figs, book-core, book-1, book-2, book-comm, book-3, book-4, book-5, quiz, radio`。**`book-photos.js` と `kiso-data.js` は入れない**。`MAX_BYTES = 15 MiB`（`build.test.mjs` で確認）。今の `CADET.html` 9,196,103 バイト。
- 飛行モデルは空島のもの（`installSorajima`）に替わるので、教科書の中で `FL.physics` から計算している数（上昇率・燃料流量など）は CADET では違う値になる（NOTES 第 4 章）。

### 6.2 `content/book.js`（`gameBook(FL)`）：ゲームの中の教科書
- 章 `intro` と `sim` を除く → **25 章・145 節**（README に「25 章・145 節」と書いてある）。番号を振り直し、`{ch:id}` も自分の番号で直す。
- 消すもの：実在の航空会社・訓練の提携先・その URL を含む文・項目・表の行（`REAL_NAMES`：ANA・ＡＮＡ・All Nippon・全日空・全日本空輸・Acron・ana.co.jp・anahd.co.jp・acronaviation）、FLIGHT LAB の操作の言葉（`APP_ONLY`：このシミュレータ・メニュー・本アプリ・上の計算機・未実装 など）、`bk-sim` の箱・計算機・課目ボタン、キーの括弧書き（「右ラダー（E）」）、「公開情報」「推測・要確認」の札。`bk.see` は `span.bk-see` に。
- 節ごとに作るもの（ここが CADET の依存の中心）：
  - `summary`：本文の最初の 1〜2 文（＝ `bk.aim` の文。140 字を超えれば 1 文）。無ければ章の `summary`。
  - `keyPoints`：`bk.key` の箱の `<li>`。箱がなければ本文の最初の 2 文、表だけの節は表の最初の 2 行。
  - `figure`：**本文の最初の `<svg>`**（1 つ）。`caption`：最初の `<figure>` の `figcaption`、無ければ SVG の `aria-label`。
  - `html`（絞り込んだ本文）、`text`（文字だけ）。
  - `lessonSections(課目ID)`：`syllabus.js` の `l.book` のうち、この本にある節。
- 今の結果：図のある節 83、表のある節 109、要点の平均 3.0、`issues`（実名が残った件数）0。

### 6.3 使う場所
| ファイル | 教科書から読むもの |
|---|---|
| `content/school.js`（ミラー講師の授業） | `CLASS_CHAPTERS = CLASSES`（`career/career.js` 57 行）＝ `[['aero'], ['sys','perf'], ['wx'], ['law','hf'], ['radio1','radio2'], ['radio3','radio4','radio5']]`：教科書の第 1 部（intro を除く）を 6 回で。各節は題名＋要点の最初の 2 行（英語だけの行は「英語の覚え方」として読む）、**最初の行で節の図を教室の画面に**（hook `board`）、最後に分野の問題から 2 問（`BANK_OF`：aero→q_aero、sys→q_sys、perf→q_perf、wx→q_wx、law→q_law、hf→q_hf、radio1・radio2→q_comm、radio3〜5→q_radio）。訓練装置 k1〜k6 は `FL.radio` と PFD |
| `career/career.js` `EXAMS` | 学科試験の分野 ID：written1＝q_aero, q_sys, q_perf, q_wx, q_law, q_comm, q_hf（28 問）／presolo＝q_ops, q_emg, q_law／nav＝q_nav, q_wx／instr＝q_ifr, q_hf／multi＝q_me, q_emg／final＝q_crm, q_law, q_ops, q_radio |
| `content/dialog/instructor.js`（早瀬 教官） | ブリーフィング：今日の課目の `lessonSections` のうち図のある最初の節を画面に出し、図のキャプションの最初の 2 文を読む。質問（ask）：ルート ＝ 今日の課目の節 ＋ `FL.book.PARTS` の部ごと（`partShort`）、部 → 章 → 節。答えは要点（4 行まで。「大事なことは N つ」）、無ければ要約。各節のメニュー「教科書で読む」（hook `book`）、図があれば「図を画面に映してください」（hook `board`）。1 つの一覧は 12 個まで（`pages()` で分ける） |
| `content/dialog/instructor-career.js` | 今日の自習の節（`today.studySection`、例 `ops.pattern`）の図を画面に |
| `main.js` | `book.section(id)` を教科書の画面（`dui.showBook`）と教室の画面（`showFigure`：SVG を `data:image/svg+xml` にして**暗い板 #0b1422 の上**に描く）に。今日の自習の節を `lessonSections` から選ぶ |
| `ui/dialog-ui.js` | 教科書の画面（明るい紙）。`.bk-*` を描き直し、ボタンは `span.bk-ref` に、計算機・`bk-sim` は消す |
| `ui/tablet.js` | タブレットの「教科書」：章 → 節 → 開く |
| `ai/tutor.js`・`ai/session.js`（AI 教官、Claude API） | システムプロンプトに**全節の目次と要約**（`bookIndex`：節 ID・題・要約 120 字。今は約 1.5 万字、`cache_control: ephemeral`）、質問に近い節を 3 つまで（題・要点・本文で採点）、本文の抜粋 1,400 字。答えの最後の「根拠：aero.lift, …」を節 ID で検証し、「教科書の『…』を開く」 |
| `dialog/validate.js` | hook `book`・`board` の引数が教科書の節であること（`sectionExists`） |
| `core/save.js` | セーブ `cadet.save` の `seen` に `ask:sec:<節ID>` などの節 ID が入る |
| `content/dialog/en.js` | 英語モードでも「教材（教科書・課目）を読む行」は日本語のまま |

### 6.4 CADET のテストが決め打ちしていること
- 章 20 以上・節 100 以上、`intro` がない、図 15 以上・表のある節 40 以上、実名ゼロ、`issues` ゼロ、FLIGHT LAB の操作の言葉ゼロ、マークアップが閉じている、`第 N 章` が範囲内。
- 節 ID の直書き：`aero.lift`（要点 2 つ、「この教材の Archer」が残る）、`aero.forces`（`lessonSections('a1')` の先頭、「大事なことは 2 つ」、授業の図）、`ops.trim`（要点の最後が「トリムは最後。トリムで機首を上げ下げしない」）、`aero.stall`（AI の検索）、`wx.metar`、`comm.callsign`・`comm.icao`・`solo.req`・`nav.divert`（FLIGHT LAB の本文に実名があること、消したあとに残る文）、`me.basics`（「Archer の次に双発機 Piper Seminole」で始まる）、`crm.auto`・`ifr.np`（ソフトの説明が消える）、`sys.ctl`（キーの列が消える）、`perf.wb`・`perf.climb`（POH）、`law.special`・`nav.chart`（架空・NOT FOR NAVIGATION）、`solo.first`、`intro.course`（null になる）。
- 授業：`CLASS_CHAPTERS.flat()` ＝ `['aero','sys','perf','wx','law','hf','radio1','radio2','radio3','radio4','radio5']`、図が画面に出る授業 4 回以上、各授業の 2 問。
- 課目のリンクの数 40 以上、全課目の `lessonSections` が `l.book`（intro を除く）と一致。
- README の「質問できる節は … 25 章・145 節」。

---

## 7. 基礎教材（`FL.kiso`）のつなぎ目（いまは FLIGHT LAB だけ）

| 場所 | 何をしているか |
|---|---|
| `flight-lab/kiso/kiso-data.js` | `FL.kiso = { version, chapters, figs, photos }`。**生成物（手で編集しない）**。元データは `kiso/data/kisoNN.json`・`kiso/fig/*.svg`（161）・`kiso/photo/*.webp`（85）。**作り直すスクリプトはリポジトリにない**（README：「教材の内容を変えたいときは元の教材（Word）を直してから作り直す」）。章の項目に、画面が使っていない `questionsHtml`・`answersHtml`（約 190 KB。`qa` と同じ中身）もある |
| `flight-lab/build.mjs` | `MODULES` の `'kiso/kiso-data.js'`（`book-5.js` の後、`quiz.js` の前） |
| `flight-lab/src/index.html` | 開発用 `<script src="../kiso/kiso-data.js">` |
| `flight-lab/src/pages.js` | メニューの入口「基礎教材」（「教科書」の隣。`日本の航空法 前提・全 14 章・393 節（読んだ節 N）`）、ページ題「基礎教材（日本の航空法 前提）」、`renderKiso`／`openKiso(章, タブ, 節)`／`kisoContents`（目次 14 章）／`kisoSection`（節ごと。読んだら `kisoRead`）／`kisoQuestions`（記述式。「解答と解説を見る」を開いたら `kisoQa`。採点しない）／`kisoGlossary`（表と検索）／`kisoSources`（`sourcesHtml`＋「写真の出典」`photoCreditsHtml`）／`kisoNav`／`kisoProg`／`kisoFill`（`div.kiso-fig`・`div.kiso-photo` を `figure.kz-fig`（白地）・`figure.kz-photo`（写真＋キャプション＋クレジット）に置き換え、`http` のリンクを新しいタブに）。学習記録の 1 行、about の 1 行（写真のクレジットの場所）。注意文「…FLIGHT LAB の教科書（FAA・14 CFR・Sanford 前提）とは別の本です。…」 |
| `flight-lab/src/school.js` | `kisoRead`・`kisoQa`（形・上限 1,000・書き出し・統合） |
| `flight-lab/src/ui.js`・`style.css` | アイコン `kiso`、`.kz-*`・`.kiso-t`・`.kiso-eq` |
| `flight-lab/test/flight.test.mjs` | ①ビルドの順（book-5 < kiso < quiz）と `kiso-data.js` がそのまま入っていること ②**章 0〜13、問の数 `[20, 24, 24, 28×11]`（376）、用語 555、図 161・写真 85（それぞれ 1 回ずつ置かれる）、ID の形 `kisoNN`・`kisoNN.…`、教科書の ID とぶつからない、写真は `data:image/webp;base64,UklGR`、クレジットにライセンス名、使うタグは `p, b, sub, sup, a, br, ul, li, h4, table, thead, tbody, tr, th, td, div` だけ、`<script>`・`on…=`・`javascript:` なし** ③`kisoRead`・`kisoQa` が消毒・書き出し・統合を通る（全 393 節・376 問が入る） |
| `flight-lab/test/browser.test.mjs`（2 本目） | メニューで「教科書」の次が「基礎教材」、ページ題、目次 14、タブ「本文・確認問題・用語・出典」、「次の節 →」で全 393 節を歩き（最後 `kiso13.28`）、置き場所が残らない・図 161・写真 85（キャプションとクレジットがデータどおり）・本文がデータどおり、第 5 章の問 28・選択肢なし・答えが開く・`kisoQa` が `['kiso05.q1']`・`bookQuiz` は空、用語 40 行・「重心」で絞れる・見つからない表示、出典に「写真の出典」と `Ptrump16`・リンクは新しいタブ、再読み込み後も記録が残る、学習記録の文（`基礎教材（日本の航空法 前提）：読んだ節 393 / 393・解答を開いた確認問題 1 / 376`）、about の文、**第 5 章 11 節（図 5-6）と第 0 章の扉（写真 1）が `kiso/preview.html` と同じ中身** |
| `flight-lab/kiso/preview.html` | 組み込み前の見本（テストが比べる相手） |
| `flight-lab/outputs/FLIGHT-LAB-使い方.md` | メニューの図、6 章「基礎教材」、学習記録 |

**つながっていないもの**：課目（`syllabus.js`）、学科テスト（`quiz.js`）、英語交信（`radio.js`）、教科書の `{ch:}`・`data-sec`、TEXTBOOK、CADET（授業・質問・タブレット・AI 教官）、`PHOTO-CREDITS.md`。

**基礎教材のデータの形の特徴**（合本にするとき移すもの）：章 14・節 393（うち番号のない節 17：各章の扉 `kisoNN.cover`、第 0 章の `kiso00.x1`、第 1・2 章の導入など）・番号は `no`（扉は `null`）、節の本文は HTML 1 本（`bk.aim`・`bk.key` の構造はない）、問は記述式（`{n, q, a}`）、用語は章ごとの表（3 列：用語・英語や略号・本章での意味）、出典は章ごとの HTML（番号付き [1]…）、図は白地前提・`viewBox` 幅 1200 前後（スマホでは文字が 1/3 程度になる）、SVG の中のマーカー ID（`a-navy` など 8 個）が 132 枚で重複（定義は同じなので見た目は壊れないが、同じページに複数出ると ID が重複する）、写真の `alt` は空（キャプションで補う）。

---

## 8. 出典とライセンスの義務（両方の本）

| | 教科書 | 基礎教材 |
|---|---|---|
| 写真の数・容量 | 30 枚・WebP 2.27 MB（`book-photos.js` 3.2 MB） | 85 枚・WebP 約 1.9 MB（base64 2.27 MB） |
| ライセンス | PD（NASA 8・NOAA 1・PD-self 2）、CC0 1、CC BY 1、**CC BY-SA 17**（4.0 が 7・3.0 が 6・2.0 が 3・2.5 が 1） | PD 26、CC0 6、CC BY 12（2.0 が 8・4.0 が 4）、「Attribution」1、**CC BY-SA 40**（4.0 が 20・2.0 が 10・3.0 が 9・2.5 が 1） |
| クレジットの出し方 | 写真の下に「作者・ライセンス（リンク）・出典（リンク）・縮小などの加工あり」（`bk.photo`）。全部を `flight-lab/PHOTO-CREDITS.md` に（テストで全 ID を確認） | 写真の下に `credit`（撮影者／ライセンス／Wikimedia Commons）、章ごとの「写真の出典」の表（`photoCreditsHtml`）。about に「出典タブにある」と 1 行。`PHOTO-CREDITS.md` には載っていない |
| 加工 | 縮小・WebP 化・メタデータ削除・**一部は切り抜き**。「CC BY-SA の写真は、変換したものも同じ CC BY-SA で利用できます」 | 縮小と形式の変換だけ。**CC BY-SA は切り抜き・色調整・文字の書き込みをしない**。注記入りは PD・CC0・CC BY だけで、クレジットに「注記は本書で追加」（41 枚。うち 1 枚はトリミングも） |
| 作る道具 | `textbook/rewrite/tools/photo.py`（元の画像はリポジトリの外。`book-photos.js` と `PHOTO-CREDITS.md` を同時に書く。base64 に `XXX`・`TODO` などが出る画質は飛ばす）、`photosrc.py`（ライセンスの確認） | リポジトリにない（Word から生成） |
| 実名 | 航空会社・訓練校の写真は使わない（STYLE） | 第 0 章の扉が**全日空の 787（JA899A）**、出典に ANA の公式ページ（第 2 章 B787 の空調）と JAL の自社養成ページ |

図：教科書の図は自作（FAA などのデータから描く）。基礎教材の図は「描き起こした模式図」（出典は章ごと）。

その他の義務：Draco（Apache License 2.0）の全文を about に。CADET は three.js・Anthropic SDK・qs・partial-json-parser のライセンスを HTML の末尾に、テクスチャは `cadet/assets/CREDITS.md`（CC0）。

---

## 9. 注意文・前提の表示（テストで文字どおりに確かめているもの）

- FLIGHT LAB：「本アプリは公開情報を基にした非公式の自主学習用教材です。実機訓練、教官の指示、POH/AFM、SOP、航空法規を優先してください。」（HTML と教科書の本文の両方）、`G1000型配置と基本概念を学ぶ教材`、`NOT FOR NAVIGATION`、`模式図`、`正式な飛行日誌ではありません`、記録の「正式な飛行日誌（logbook）ではなく」。
- 教科書ページの節ごとの注意文（`pages.js` 352 行、TEXTBOOK の `SEC_NOTE`）。
- 基礎教材：ページ題とタグで「日本の航空法・国内の運航が前提（教科書とは別の本）」（README の決まり 4）。
- TEXTBOOK：`NOTICE` 4 つ。

---

## 10. 容量（サイズ予算）

| 出力 | 今 | 上限 | 余り |
|---|---|---|---|
| `flight-lab/outputs/FLIGHT-LAB.html` | 9,394,328 B（8.96 MiB） | **このブランチにはない**。README と依頼文は「12 MB（`MAX_BYTES`）」と書く（3D の v2.4 のブランチ `abbf2d0`・`origin/kiso-data` の `build.mjs` にある `12 * 1024 * 1024`） | 12 MiB なら 3,188,584 B（約 3.0 MiB） |
| `textbook/outputs/TEXTBOOK.html` | 4,408,849 B | なし（写真は 1 枚 120 KB・合計 5 MiB まで） | — |
| `cadet/outputs/CADET.html` | 9,196,103 B | 15 MiB（`cadet/build.mjs`、テストあり） | 約 6.5 MB |

`FLIGHT-LAB.html` の内訳（スクリプトごと）：`kiso/kiso-data.js` 4,251,619（写真 2,273,251・図 621,841・章の JSON 1,296,889）、`book-photos.js` 3,198,781、`book-figs.js` 266,272、`book-1〜5.js`＋`book-comm.js`＋`book-core.js` 653,586、`pages.js` 120,462、`syllabus.js` 85,726、Draco の wasm（base64）256,560、ほか。

**3D 表示と合わせたときの見積もり**：`abbf2d0`（v2.4・3D 表示・古い教科書・写真なし・基礎教材なし）の出力は 7,109,023 B、`origin/kiso-data`（3D＋基礎教材＋古い教科書・写真なし）は 11,377,100 B。これに書き直した教科書の写真（3.2 MB）を足すと**約 14.6 MB で、12 MiB を超えます**。合本の設計では、写真の重複（同じ被写体を 2 冊が別々に持つ：ピトー管・静圧孔・吹き流し・積乱雲など）を 1 枚にする、写真の幅や画質を下げる、使わない `questionsHtml`／`answersHtml` を外す、のどれかが要ります。CADET に写真を入れるなら 15 MiB の余り（約 6.5 MB）の中で。

---

## 11. 古くなっているドキュメント（直すか、合本で書き直すもの）

- `flight-lab/README.md`：基礎教材のこと（v2.5 にあたる追加）が書かれていない。「テスト 48 件」（今は 52）。
- `flight-lab/outputs/FLIGHT-LAB-使い方.md`：「教科書（27 章・120 節）」が 2 か所（今は 154 節）。
- `flight-lab/outputs/ANA-SANFORD-調査と設計.md`：「27 章・120 節」。
- `textbook/package.json` の説明：「120 節」。
- `flight-lab/kiso/README.md`：`MAX_BYTES` がこのブランチの `build.mjs` にない。「v2.4 の FLIGHT-LAB.html は約 7.1 MB」は 3D のブランチの数（このブランチの基礎教材を入れる前は約 5.1 MB）。
- `cadet/PLAN.md`：「113 節」（その時点の記録。README は 145 節で正しい）。
- `textbook/README.md`・`cadet/README.md`：raw.githack のリンクがコミット `bc03307` に固定（作り直したら更新）。

---

## 12. 新しい設計が守るか、移すもの（不変条件）

**A. 教科書の API と形**（PLAN.md 3 章で「変えない」と決めたもの）
1. `FL.book` の API（`R, PARTS, CHAPTERS, bk, add, findSection, fix, html, text, wire, FIG`）、章のデータの形、`bk` の関数、`{ch:id}`、計算機 7 種類（`FL.bookCalc` の `turn, da, xwind, wca, wb, fuel, rule60` と `ARCHER_WB`）、`before: 'hf'`。
2. 節の形「ねらい（`bk.aim`）→ 最初の図（`<svg>`）→ 説明 → ここが大切（`bk.key` 2〜4 項目・文脈なしで通じる文）→ 注意 → 考えてみよう → 写真は最初の図より後 → `bk.sim` は最後」。CADET の要約・要点・教室の図はこの形から作る。
3. 章 ID と節 ID は変えない（PLAN.md の方針）。足すときは新しい ID。章の並び `ORDER`（27）と部 `p1`〜`p6`（課程表の phase と同じ）。
4. 図は暗い板の上・スマホで読める大きさ・単独で正しい XML・`aria-label`。写真は `bk.photo`（無ければ空文字）。
5. 本文に FLIGHT LAB の操作の言葉と実名をなるべく書かない（CADET のフィルタ。書くなら `bk.sim` の中）。

**B. ID でつながっているもの**
6. 課目 → 節（37 課目・51 本のリンク）、学科テスト → 節（14）、`RD.FLIGHT` → 節（7）、`pages.js` の `comm.numbers`。
7. 教科書 → 課目（章末 66・本文のボタン 59）。課目 ID は 12 文字以内。
8. 学科テストの分野 ID 14 個（CADET の `BANK_OF`・`EXAMS`、記録の `quiz`）。
9. `FL.book.R` の出典キー（`radio.js` の場面が使う 9 個）。
10. CADET の `CLASSES`（教科書の第 1 部の 11 章の ID）、テストが直書きする節 ID 約 20 個。

**C. 記録（利用者の手元のデータ）**
11. localStorage：`flightlab-progress-v2`（`read` 最大 500・`bookQuiz` は「章ID.番号」・`kisoRead`／`kisoQa` は `kiso` で始まる・最大 1,000）、`flightlab-records-v2`、`flightlab-prefs-v2`、`textbook.*`、`cadet.save`。JSON の書き出し（`version: 2`）を読めること。ID を変えるなら、古い ID から新しい ID への読み替えを `sanitizeProgress`／`mergeProgress` に入れる。2 冊の節を 1 つの `read` にすると上限 500 を超える。

**D. ビルドとテスト**
12. 1 ファイル・オフライン・外部の読み込みなし（`fetch` は Google のタイルだけ）、インラインのスクリプト、`</script` の逃がし。読み込み順（3.1）。
13. 本文に `TODO`・`FIXME`・`TBD`・`XXX`・`PLACEHOLDER`・`{{…}}`・API キーの形を入れない（写真の base64 も含めて。今は基礎教材の写真だけテストで除外）。
14. 数を決め打ちしているテスト：TEXTBOOK の `COUNTS`・`ORDER`・見出し「全 6 部・27 章・154 節」、FLIGHT LAB の基礎教材の数（14 章・問 376 の内訳・用語 555・図 161・写真 85・最後の節 `kiso13.28`・第 5 章の問 28 と用語 40・`preview.html` との比較 2 か所）、教科書の最低数（章 16・節 80・分野 12・問 120・無線の節 20）、CADET（章 20・節 100・図 15・表 40・25 章 145 節）。
15. 容量：CADET 15 MiB（テストあり）。FLIGHT LAB は上限なし（12 MiB を戻すなら 10 章の見積もり）。

**E. 出典と表示**
16. 写真ごとのクレジットを写真の下に（両方の本）。教科書の写真は `PHOTO-CREDITS.md` に全部。基礎教材の CC BY-SA は改変しない（README の決まり 2）。
17. 基礎教材の文言は、README の決まり 3（「一字も変えない」）で守られてきた。合本で中身を変えるなら、元の Word が正本であること・版（第 3 版 2026-10-26）・出典の番号の対応をどう扱うかを決め、README と `preview.html` との比較テストを置き換える。
18. 必須の注意文（9 章）と、日本の航空法の内容と FAA の内容が混ざらない表示（今は「別の本」とタグ・注意文で分けている）。

---

## 13. リスク

1. **節 ID の変更・統合は多くの場所を壊す**：課目・学科テスト・英語交信・TEXTBOOK の URL・利用者の記録・CADET のメニュー・セーブ・約 20 か所のテストの直書き。章 ID と節 ID の頭が一致しない（`tl`→`ops.*`、`jet`→`crm.*`、`oei`→`oei.what`＋`me.*` など）ので、置き換えを機械的にできない。
2. **CADET は教科書の文の形に強く依存**：`bk.aim` の文が要約、`bk.key` の項目が講師と教官の台詞（「大事なことは N つ」をテストで確認）、最初の `<svg>` が教室の画面。基礎教材のように節が HTML 1 本で要点の箱がない形を混ぜると、要約・要点が本文の最初の文になり、台詞の質が下がる。図も白地前提なので、CADET の暗い板（#0b1422）では読めない。
3. **実名と架空の世界**：基礎教材の全日空の写真・ANA と JAL の出典は、CADET の `REAL_NAMES` のテスト（実名ゼロ）と STYLE（航空会社の写真を使わない）に反する。教科書と同じ場所に置くなら、写真の差し替えか、CADET に出さない仕組みが要る。
4. **ライセンスの決まりが 2 つ**：教科書は切り抜きあり、基礎教材は CC BY-SA を改変しない。1 冊にするなら厳しい方（改変しない）にそろえるのが安全。クレジットの一覧も 2 か所（`PHOTO-CREDITS.md` と章ごとの表）に分かれている。
5. **容量**：このブランチに上限がないので、写真を足していっても気づかない。3D 表示のブランチと合わせると 12 MiB を超える（10 章）。基礎教材の写真と教科書の写真に同じ被写体がある（重複の整理で減らせる）。
6. **記録の上限**：`read` 500 件。2 冊を合わせると 547 節。上限を上げるか、別の項目のままにする。`bookQuiz` のキーは問の並び順なので、章末の問を入れ替えると記録が別の問に付く。
7. **生成物と正本**：`kiso-data.js` を作り直すスクリプトがリポジトリにない。中身を変えると、元の Word との対応が切れる（README の決まり 3）。教科書の写真の元画像もリポジトリの外（`photo.py` の前提）。
8. **2 つの法体系**：教科書は 14 CFR・FAA の空域・Sanford、基礎教材は日本の航空法・JCAB。混ぜると、課目（Sanford の LAB 空港・FAA の ACS の基準）と学科テスト（FAA の数値）と食い違う。章ごとに「どちらの国の決まりか」を表示し続ける必要がある。
9. **AI 教官のプロンプト**：CADET はシステムプロンプトに全節の目次と要約を入れる（今は約 1.5 万字）。節が 393 増えると約 3 倍になり、費用と応答が重くなる（キャッシュは効く）。CADET に基礎教材を入れるなら、目次を絞るなど。
10. **テストを流す環境**：FLIGHT LAB のテストは `outputs/FLIGHT-LAB.html` を書き換える。CADET は `npm ci` が要り、`npm test` は 1 回 20 分ほど（PLAN.md）。`textbook/rewrite/tools/testall.sh` が作業中の木の写しで 3 つを流す。
11. **小さな食い違い**：開発用 `src/index.html` に `book-photos.js` がない。メニューの「読んだ節」は存在しない ID も数える。学習記録の画面に教科書の読んだ節の行がない（基礎教材だけある）。基礎教材の SVG のマーカー ID が重複、写真の `alt` が空、図の `viewBox` 幅 1200（スマホで小さい）。
12. **古いドキュメント**（11 章）：数（120 節・48 件・7.1 MB・`MAX_BYTES`）が今と違う。

---

## 14. 付録：教科書の章と節 ID

| 章 | ID | 部 | 節 ID |
|---|---|---|---|
| 1 | intro | p1 | intro.use intro.marks intro.course intro.cert intro.study |
| 2 | aero | p1 | aero.forces aero.lift aero.aoa aero.drag aero.axes aero.stall aero.turn aero.stab aero.left aero.ge aero.flaps aero.vn |
| 3 | sys | p1 | sys.ctl sys.cockpit sys.gear sys.lights sys.engine sys.carb sys.fuel sys.elec sys.g1000 sys.compass |
| 4 | perf | p1 | perf.da perf.tol perf.climb perf.fuel perf.wb perf.wbex |
| 5 | wx | p1 | wx.atm wx.cloud wx.front wx.ts wx.shear wx.fog wx.metar wx.taf wx.brief |
| 6 | law | p1 | law.pic law.aircraft law.airspace law.vfr law.special law.rules |
| 7 | radio1 | p1 | radio.why radio.equip radio.technique radio.listen |
| 8 | radio2 | p1 | comm.basic comm.numbers comm.callsign comm.words |
| 9 | radio3 | p1 | comm.pattern comm.ack comm.readback comm.clarify comm.mistakes |
| 10 | radio4 | p1 | comm.flow comm.atis comm.dep comm.tower comm.radar comm.arrive comm.option |
| 11 | radio5 | p1 | comm.ctaf comm.xpdr comm.mayday comm.nordo comm.sfb comm.icao comm.practice |
| 12 | hf | p1 | hf.self hf.body hf.altitude hf.vision hf.adm hf.attitude hf.srm |
| 13 | ground | p2 | ground.walk ground.start ground.taxi ground.runup |
| 14 | ops | p2 | ops.trim ops.sl ops.climb ops.turns ops.slow ops.stall ops.ground |
| 15 | tl | p2 | ops.takeoff ops.pattern ops.landing ops.flare ops.goaround ops.xwind ops.short ops.soft ops.slip |
| 16 | emg | p2 | emg.basic emg.abort emg.engine emg.glide emg.forced emg.fire emg.elec emg.abnormal |
| 17 | solo | p2 | solo.req solo.check solo.first solo.after |
| 18 | navp | p3 | nav.chart nav.plan nav.log nav.dr |
| 19 | navr | p3 | nav.vor nav.dme nav.gps nav.fpl nav.ff |
| 20 | navd | p3 | nav.xc nav.divert nav.lost |
| 21 | ifr | p4 | ifr.scan ifr.instr ifr.partial ifr.upset |
| 22 | ifrp | p4 | ifr.rules ifr.hold ifr.chart ifr.ils ifr.np |
| 23 | me | p5 | me.basics me.speeds me.pattern me.perf |
| 24 | oei | p5 | oei.what me.vmc me.drag me.oei me.land |
| 25 | crm | p6 | crm.tem crm.crm crm.pm |
| 26 | jet | p6 | crm.jet crm.auto crm.upset |
| 27 | sim | p6 | sim.can sim.how sim.screen sim.keys |

章末の「対応する課目」：intro a1／aero a1, a4, a5, a7, a8／sys a1, a2, i3／perf x3, a3／wx r1, x1／law t2, n2／radio1 t1, t2／radio2 t1／radio3 t1, t2／radio4 t1, t2, t4／radio5 e3, t2／hf i2, r1／ground t1／ops a1〜a8／tl t1〜t4, x1〜x3／emg e1, e2, e3, i3／solo c1／navp n2／navr n1, n3／navd n2, n3／ifr i1, i2, i3／ifrp i4, i5／me m1／oei m2〜m5／crm r1／jet i2／sim a1。

写真のある節（30）：aero.drag・sys.ctl（2）・sys.engine・sys.fuel・sys.g1000（2）・sys.compass・perf.tol（2）・wx.ts・wx.shear・wx.fog・comm.mistakes・comm.tower・comm.radar・hf.vision・ops.xwind・ops.soft・emg.forced・nav.vor・ifr.ils（2）・me.basics・oei.what・crm.pm・crm.jet（2）・sim.can（2）。

計算機のある節（10）：aero.turn・emg.engine（turn）、perf.da・me.perf（da）、perf.fuel・nav.log（fuel）、perf.wbex（wb）、ops.xwind（xwind）、nav.plan（wca）、nav.dr（rule60）。
