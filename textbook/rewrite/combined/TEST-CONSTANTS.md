# テストの決め打ちの数の変更記録

DESIGN.md 6.2 の決まり 11：テストが決め打ちしている数や文字（TEXTBOOK の `COUNTS`・`ORDER`・見出し・`#aero.lift` の番号・外部リンクの数・`build.test.mjs` の `FL_MODULES.length` と `scripts.length`、FLIGHT LAB の部の列と基礎教材の問題の表示、CADET の README の数と `CLASS_CHAPTERS.flat()` など）は、変える理由になったコミットで意図して直し、ここに 1 行ずつ残します。

書き方：1 行 1 件。日付・版と単位・ファイルと場所・前 → 後・理由・コミット（統合役が書く）。

| 日付 | 版・単位 | ファイルと場所 | 前 → 後 | 理由 |
|---|---|---|---|---|
| 2026-10-26 | R1・P1（W01・W02・W03・W05） | — | 変更なし | P1 は決め打ちの数を変えていない。足したテストは数を決め打ちしない（W02：読み込みの列・`MAX_BYTES`・「（別の章）」なし・AI 目次 25,000 字。統合：`textbook/test/egov.test.mjs`）。TEXTBOOK の `FL_MODULES.length === 14` は、ファイルを足すコミット（W06 の `book-jur.js` など）で直す |
| 2026-10-27 | R1・P2・W04 | `textbook/test/build.test.mjs` の `assert.equal(FL_MODULES.length, …)`（とテストの名前・頭の説明の数） | 14 → 15 | TEXTBOOK が W04 の `book-terms.js`（用語の表 `FL.terms`）を読むようになった（合本の検査の道具 `check-style.mjs`・`check-ledgers.mjs` が TEXTBOOK の列で本を読み、表を使うため）。`scripts.length === FL_MODULES.length + 2` は式なので変えない。CADET は `book-terms.js` を `FL_LEAVE_OUT` で外す（CADET の build のテストは共有の列と leave-out から数を作るので、決め打ちの数はない）。FLIGHT LAB は全部を読む（決め打ちの数はない） |
| 2026-10-27 | R1・P2・W06 | 同じ所 | 15 → 16 | TEXTBOOK が W06 の `book-jur.js`（日米の対照データ `FL.jur`）を読むようになった（3 製品が読む：DESIGN 3.1・6.3） |
| 2026-10-27 | R1・P3・W07a（統合） | `textbook/test/load.mjs` の `COUNTS.refs`（`content.test.mjs` の章末の出典の数と本文のリンクの数 `refs + 2 × photos`、`browser.test.mjs` の #all） | 202 → 205 | 本文が名前で引く一次資料 3 つを、統合で `book-core.js` の `R` に足して章の refs に入れた：FAA SAIB CE-10-11（`saib1011` → `sys`）、NWSI 10-813（`nwsi10813` → `wx`）、NWS Melbourne「The Florida Rain Machine」（`flRain` → `wx`）。W07a の報告 6。DESIGN 6.1 の「URL は章の出典へ」 |
| 2026-10-27 | R1・P3・W07d | `cadet/test/content.test.mjs`「book: every lesson's textbook sections resolve」の `lessonSections` | 2 行を足した：c1 は `[]`（`intro.course` だけで CADET が外していた）→ `['solo.check']`、a7 は `['aero.stall']` → `['aero.stall', 'ops.stall']` | DESIGN 6.1：c1 のリンクを `solo.check` に直す（意図して直す）。a4・a5・a7・a8 の `book` の後ろに `ops.turns`・`ops.stall` を足した（足すのは後ろだけなので、CADET の教官が映す図は変わらない）。`a1` の行は変わらない |
