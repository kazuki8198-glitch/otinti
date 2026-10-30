# 統合 R2A 報告（W10b・W22・R1V、2026-10-29）

R2（第 1 部）の始め。PROGRESS の「次」の 1（描く部品：W10b）・2（R1 の確かめの残り：R1V）と、DESIGN 7.2 の W22（写真の仕組みとクレジット）を統合した。単位の報告：[W10b](W10b.md)・[W22](W22.md)・[R1V](R1V.md)。

## 1. 単位ごとの確かめ（DESIGN 7.2・報告の主張と差分）

| 単位 | 7.2・PROGRESS が求めたこと | 差分で確かめたこと | 統合役が埋めたこと |
|---|---|---|---|
| W10b | 範囲の札と由来の行を FLIGHT LAB と TEXTBOOK が同じ形で描く `FL.book.secMarks`、章末の `written`（答えは開いて見る）、CADET は描かない、`bookWritten`（6.4） | `book-core.js` は足しただけ（`secMarks`・`writtenItems`・`writtenHtml`・`SCOPE`・`bk.deep`/`drill`/`judge`/`dont`/`recall`）。`pages.js`・`render.js` が同じ HTML を置く。`school.js` の消毒と統合に `bookWritten`（形・重なり・上限 1,000、`version: 2` のまま）。CADET は本文の外なので出ない（`proseSentences` から新しい囲みを外す）。本文のデータは変えていない | `intro.marks` の札の行に「米国と日本の決まり」（`mixed` の節が 2 つある）と頭のコメント（報告 7 の 1）、序部の説明してみように原本の問の `from`（7 の 2：`basics` 14 問・`intro` 1 問。対応は原本 `kiso00.json` の問の文と PROVENANCE の行で確かめた。まとめた問は `basics.w4` ← q9・q10、`basics.w10` ← q7・q14、`basics.w5` ← q10 の後半）、STYLE の「節の形」と「説明してみよう」（7 の 3）、PROVENANCE 16 行の `where`（7 の 4）、`TEST-CONSTANTS.md`・DESIGN の付記 8・PROGRESS（7 の 5） |
| W22 | `book-photos-k.js`、`photo.py add-file`、クレジットを元のページで確かめる、条件つき 4 枚、`mod`（教科書の 30 枚も）、注記の書き換え、注記の語と用語の表、重複 3 組、`PHOTO-CREDITS.md` を 1 つに、`FL.kiso` から読む仕組み | 51 枚が原本とバイト一致（`photos.test.mjs` の sha256 と原本の比較）。クレジットの形・`mod`・置く節（`to`）。`holdShort` だけを `ch09-photo4` のファイルに差し替え、ほかの 29 枚のバイトは同じ。`SRC` の塊を落としたファイルが `FL.kiso.photos` から同じバイトを読む | 報告 6.1 の `bk.photo`（2 つの入れ物・写真ごとの `mod`・`src` が空なら何も出さない）、6.2 の登録（`modules.mjs`・`src/index.html`・CADET の `FL_LEAVE_OUT` と `build.test.mjs`・FLIGHT LAB の `NODE_LEAVE_OUT`・TEXTBOOK の `FL_MODULES.length` 17 → 18）、**FLIGHT LAB のビルドが原本の入口のある間 `SRC` の塊を落とす**（`flight-lab/build.mjs` の `moduleText`。ページの中の `book-photos-k.js` は 46,677 バイト）とそのテスト、`content.test.mjs` の写真のテストを 2 つの入れ物に（6.2 の 7）、6.3 の `ch00-photo5` を `basics.alt` に（`COUNTS.photos` 30 → 31）、6.4 の DESIGN 4.2 の表・8.1 と STYLE の写真の決まり、6.5 の `check-photos.mjs`、`PHOTO-CREDITS.md` を `photo.py credits` で作り直した（`ch00-photo5` の置いた節） |
| R1V | CLAIMS の署名待ち 320 行の事実確認、序部の初学者の 2 回目（`intro`・`english`）、日本の法令レビュー（`kiso-errata.js` の日本の法令の項目と全部の日本の囲み）、W07f の図 30 枚の目視の記録、署名待ち 38 行の署名 | `book-1.js` は `intro.exams` の 2 行だけ（61.31 の文と出典）。`book-jur.js` の `nordo.ifr` の日本の欄を e-Gov の写し（施行規則第 206 条第 3 号のイ・ロ・ハと進入許可）と照らした：文のとおり。`multi.rating` の米国の欄は「等級」。`kiso-errata.js` の気象庁の出典の URL が開くこと（PDF、2026-10-29） | 6 の 1 の CLAIMS の前の文 2 行は、消すと `W10-intro` のパッチの流し直しで戻るので、行を残して note に理由を書いた。6 の 4 の DESIGN 3.6 の表、6 の 5 の `ERRATA-FOR-WORD.md` の気象庁の出典（4 か所）、6 の 7 の登録（W22 と同じ） |

## 2. 変えたファイル（統合役が手を入れたもの）

- `flight-lab/src/book-core.js`：`bk.photo`（W22 の 6.1 の形）と頭のコメント。
- `flight-lab/src/modules.mjs`・`flight-lab/src/index.html`・`flight-lab/build.mjs`（`KISO_PHOTOS_FROM_ORIGINAL`・`moduleText`）・`flight-lab/test/load.mjs`・`cadet/build.mjs`・`textbook/build.mjs`（コメント）：`book-photos-k.js` の登録（DESIGN 6.2 の決まり 7）。
- `flight-lab/src/book-0.js`：`basics.alt` に `${bk.photo('ch00-photo5')}`、説明してみよう 14 問に `from`、頭のコメント。
- `flight-lab/src/book-1.js`：`intro.marks` の範囲の札の行、頭のコメント、`intro` の説明してみように `from: ['kiso09.q3']`。
- `flight-lab/test/flight.test.mjs`：新しいテスト「build: the basic course's photos the book uses (book-photos-k.js) are in the page once, read from FL.kiso.photos (DESIGN 8.2)」、モジュールのテストに `book-photos-k.js`、説明してみようのテストに `from` の確かめ。
- `flight-lab/test/browser.test.mjs`：「原本で開いた問題」を本の `intro.w0` で確かめる形に（テストの中で問を足す形をやめた。`TEST-CONSTANTS.md`）。
- `textbook/test/content.test.mjs`・`textbook/test/load.mjs`（`COUNTS.photos` 31）・`textbook/test/build.test.mjs`（18）・`cadet/test/build.test.mjs`。
- `textbook/rewrite/combined/tools/check-photos.mjs`（基礎教材の写真の置き待ちを pending／warn に、「／」でつないだ `mod`）・`tools/selftest.mjs`（DESIGN 4.2 の数 52 / 0 / 33）。
- `flight-lab/PHOTO-CREDITS.md`（`photo.py credits`）、`textbook/README.md`（読み込み 18 ファイル・写真 31・テストのファイル）。
- 文書：`DESIGN.md`（3.6 の表・4.2 の写真の表と文・8.1 の写真・付記 8）、`STYLE.md`（節の形の部品の書き方・`scope` の札・写真の `mod` と基礎教材の写真・説明してみよう）、`ERRATA-FOR-WORD.md`、`TEST-CONSTANTS.md`（5 行）、`PROGRESS.md`。
- 台帳：`apply-patches.mjs --write` で W22 → R1V → integrate-R2A（`reports/integrate-R2A.ledger.json`、25 行）、CLAIMS の前の文 2 行の note。

## 3. 確かめ（検査とテスト）

| コマンド | 結果 |
|---|---|
| `bash textbook/rewrite/tools/testall.sh …/testall-R2A`（最終の木の写し） | FLIGHT LAB **89/89**（R1 の締め 83：W10b +5・統合 +1）・TEXTBOOK **34/34**（22：W10b +3・W22 +9）・CADET **268/268**（266：W10b +2） |
| 途中のコミットの木（W10b だけ・W10b＋R1V。HEAD に各単位のファイルを重ねた写しで testall） | W10b だけの木：FLIGHT LAB 88/88・TEXTBOOK 25/25・CADET 268/268。W10b＋R1V の木：88/88・25/25・268/268（どちらも、コミットした木と同じことを `git archive` と `diff -r` で確かめた） |
| `cd flight-lab && npm run -s test:fast` | 86/86 |
| `cd textbook && npm test` | 34/34 |
| `cd cadet && npm run -s test:fast` | 247/247 |
| `node textbook/rewrite/combined/tools/selftest.mjs` | 31 passed |
| `node textbook/rewrite/combined/ledgers/validate.mjs` | ok — error 0・warning 37（署名待ち：PROVENANCE 35・ERRATA 1・RULINGS 1） |
| `node textbook/rewrite/combined/ledgers/apply-patches.mjs`（全部のパッチを見るだけ） | 0 行（1,410 行が取り込み済み。流し直しても変わらない） |
| `node textbook/rewrite/combined/tools/check-chapter.mjs intro`・`basics`・`english` | 3 章とも error 0。warn：`intro` 7（図の札の初出の形：前から）、`basics` 5（初出 1・概念 4：前から。写真のキャプションの主張の札なし 1 は、統合で CLAIMS に行を足して消えた）、`english` 0 |
| `node textbook/rewrite/combined/tools/check-photos.mjs` | 81 枚・error 0・warn 24（置く節が本にある基礎教材の写真：章の単位が置く）・pending 26（置く節がまだない） |
| `python3 -I textbook/rewrite/tools/photo.py check` | 81 枚・error 0・デコード後 3,364,306 バイト（3.21 MiB） |
| `node textbook/rewrite/combined/tools/check-all.mjs --no-browser` | error 337・warn 1,433・pending 169（R2 の章の単位の仕事：`missing-scope` 149・体言止め 16 など。`ledgers` の error は 131 → 129） |
| ビルドの大きさ | FLIGHT-LAB.html 9,748,145 バイト（R1 9,791,707：`holdShort` の差し替えで小さくなった分を含む）・TEXTBOOK.html 6,131,992 バイト（4,759,132）。出力のファイルはコミットしない（版の最後に作り直す） |

## 4. コミット

1. `d21b318` W10b（描く部品）：W10b の持ち物だけ（`book-core.js`・`flight.test.mjs`・`browser.test.mjs` は W10b の版。統合の直しは 3 に）。
2. `b1d5ce6` R1V（R1 の確かめの残り）：`book-1.js` の `intro.exams`、`book-jur.js`、`kiso-errata.js`、`ERRATA-FOR-WORD.md`、DESIGN 3.6 の表、R1V のパッチを取り込んだ台帳、報告。
3. W22 と統合（写真の仕組み・登録・`bk.photo`・`ch00-photo5`・説明してみようの `from`・文書・台帳・PROGRESS・この報告）。最終の木で `testall.sh` 89/89・34/34・268/268。

出力（FLIGHT-LAB.html・TEXTBOOK.html・CADET.html）はテストが作り直したものを `git checkout` で戻し、コミットしていない（版の最後に作り直す）。

## 5. 台帳の行

- W22（PROVENANCE の写真 85 行）・R1V（CLAIMS 316 行の署名と新しい 2 行、PROVENANCE 32・UNVERIFIED 3・CONCEPTS 1・ERRATA 2 の署名）を取り込んだ。
- integrate-R2A：PROVENANCE `ch00-photo5` done（`basics.alt`）、`kiso00.q1`・`q2`・`q6`〜`q16`・`q19`・`q20`・`kiso09.q3` の `where`（`from` を足した、古い括弧書きを消した）、ERRATA `APP.bk-photo-mod` fixed、RULINGS `R.photo-mod` fixed、CLAIMS `basics.alt#85995b6b`（写真のキャプションの富士山の標高 3,776 m：国土地理院の 2024-12-24 の発表を統合役も読んだ。署名は W27）、COUNTS の写真の `built` 5 行。
- CLAIMS `intro.exams#9d450e7a`・`#f5bceac7`（R1V が書き直した前の文）は本にない文として残し、note に理由を書いた（台帳を直接。消すと `W10-intro.ledger.json` の `add` が流し直しで戻る）。

## 6. 未解決（PROGRESS の「次」と「未解決のこと」に書いた）

1. 基礎教材の写真 50 枚は章の単位が置く（第 1 部 19 枚）。TEXTBOOK の写真のテストの「使われている」を基礎教材の写真に広げるのは W27。
2. 確かめ役の署名待ち：W22 の写真 35 行と `APP.bk-photo-mod`・`R.photo-mod`、CLAIMS の 7 行（R1V の新しい 2・前の文 2・`hf.body` の 2・キャプション 1）、`FL.jur` の `nordo.ifr`・`multi.rating` の直し（W27）。
3. `hf.body` の 180° 旋回〔安全〕③ の一次資料（W20・W36）。
4. `kiso-errata.js` の `hf-training`（W37 が航空法第 71 条の 5・施行規則第 162 条の 19〜22 を写したあと）。
5. Commons の直接の読みで `photosrc.py verify` を流し直す（W27）。
6. 使う場面の札 `use` と FAA の注記 `faa` を描く部品（`g1` のあと）。記録の画面の説明してみようの数（任意）。FLIGHT LAB の印刷で折りたたみを開く（任意）。CADET の講義で `deep` の節を飛ばす（W26）。
7. 図の nit 3 つ（`ifr.ils`・`sectionalSymbols`・`fuelSystem`：W21・W33）、`comm.nordo` と `aero.wing` の写真（W19・W13・W21）。
8. **所有者の判断 11**（失速の課目の 300 ft を参考の行に）は決まったが、R2A の単位の持ち物ではないので入れていない（PROGRESS の「次」の 2）。台帳 `R.aoa-term` の裁定の文は判断 3 の補足の前のまま（W04・W24）。
9. TEXTBOOK.html は基礎教材の写真を全部持つので 1.37 MB 大きくなった（全体の上限はない。写真の予算の内）。

## 7. ほかの単位へのお願い

なし（R2A の単位の「needs from others」は、上の 1 の表のとおり統合で入れたか、PROGRESS の「次」の行き先に書いた）。
