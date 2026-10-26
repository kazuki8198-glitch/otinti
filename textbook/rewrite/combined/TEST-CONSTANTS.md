# テストの決め打ちの数の変更記録

DESIGN.md 6.2 の決まり 11：テストが決め打ちしている数や文字（TEXTBOOK の `COUNTS`・`ORDER`・見出し・`#aero.lift` の番号・外部リンクの数・`build.test.mjs` の `FL_MODULES.length` と `scripts.length`、FLIGHT LAB の部の列と基礎教材の問題の表示、CADET の README の数と `CLASS_CHAPTERS.flat()` など）は、変える理由になったコミットで意図して直し、ここに 1 行ずつ残します。

書き方：1 行 1 件。日付・版と単位・ファイルと場所・前 → 後・理由・コミット（統合役が書く）。

| 日付 | 版・単位 | ファイルと場所 | 前 → 後 | 理由 |
|---|---|---|---|---|
| 2026-10-26 | R1・P1（W01・W02・W03・W05） | — | 変更なし | P1 は決め打ちの数を変えていない。足したテストは数を決め打ちしない（W02：読み込みの列・`MAX_BYTES`・「（別の章）」なし・AI 目次 25,000 字。統合：`textbook/test/egov.test.mjs`）。TEXTBOOK の `FL_MODULES.length === 14` は、ファイルを足すコミット（W06 の `book-jur.js` など）で直す |
