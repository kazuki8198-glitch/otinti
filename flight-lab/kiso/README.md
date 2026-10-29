# 基礎教材データ（FLIGHT LAB 組み込み用）

「パイロット基礎教材」第 0〜13 章（第 3 版・図改訂、2026-10-26）を、FLIGHT LAB にそのまま読み込める形にしたものです。
**日本の航空法・国内の運航を前提にした座学教材**で、FLIGHT LAB の既存の教科書（FAA・14 CFR・Sanford 前提の 27 章）とは前提が違います。そのため、既存の教科書に混ぜずに**別の本**として追加します。

## 中身

| パス | 内容 |
|---|---|
| `kiso-data.js` | **これだけ読み込めば動く**。下の JSON・SVG・写真をまとめて `FL.kiso` に入れたもの（約 4.1 MB）。生成物なので手で編集しない |
| `data/kiso00.json`〜`kiso13.json` | 章ごとのデータ（下の「データの形」） |
| `fig/*.svg` | 図 161 点（文字は画像化していない SVG。図の背景は白） |
| `photo/*.webp` | 写真 85 点（幅 560 px に縮小した WebP） |
| `preview.html` | 組み込み前の見え方の確認用。ダブルクリックで開く（`kiso-data.js` を読む） |

## データの形（`FL.kiso`）

```js
FL.kiso = {
  version: '第3版（図改訂）2026-10-26',
  chapters: [{
    id: 'kiso05', no: 5, label: 'パイロット基礎教材 第 5 章', title: '重量と重心', subtitle: '…',
    sections: [{ id: 'kiso05.11', no: 11, title: '重量重心包囲線を読む', html: '<p>…</p><div class="kiso-fig" data-fig="ch05-fig5-6"></div>…' }, …],
    //   no が null の節は、章の扉（cover）と、番号のない導入の節
    qa: [{ n: 1, q: '<p>問いの HTML</p>', a: '<p>解答と解説の HTML</p>' }, …],   // 記述式。選択肢はない
    glossaryHeader: ['用語', '英語や略号', '本章での意味'], glossary: [['…', '…', '…'], …],
    sourcesHtml: '…', photoCreditsHtml: '…',
    figures: [{ id: 'ch05-fig5-6', no: '5-6', caption: '…', w: 1120, h: 610, file: 'fig/ch05-fig5-6.svg' }, …],
    photos:  [{ id: 'ch05-photo1', caption: '…', credit: '撮影 …／CC BY-SA 4.0／Wikimedia Commons', w: 560, h: 373, file: 'photo/ch05-photo1.webp' }, …],
  }, …],
  figs:   { 'ch05-fig5-6': '<svg …>…</svg>', … },          // 図の SVG 本体
  photos: { 'ch05-photo1': 'data:image/webp;base64,…', … }, // 写真の data URL
};
```

- 本文の HTML の中で、図と写真は `<div class="kiso-fig" data-fig="ID">` と `<div class="kiso-photo" data-photo="ID">` の置き場所だけが入っています。表示するときに `figs[ID]`・`photos[ID]` と、`figures` / `photos` のキャプション・クレジットに置き換えてください（`preview.html` の `fill()` がその例です）。
- 使っている HTML は `p, b, sub, sup, a, br, ul, li, h4, table（class="kiso-t"）, p.kiso-eq（式。中央そろえ）` だけです。
- 確認問題の数：第 0 章 20、第 1・2 章 24、第 3〜13 章 28（計 376 問）。用語：計 555 項目。

## 守ること（必ず）

1. **写真のクレジット**：写真の下には必ず `credit`（撮影者・ライセンス・出典）を表示する。CC BY / CC BY-SA の条件です。章の「写真の出典」（`photoCreditsHtml`）も、出典の画面などで読めるようにする。
2. **写真を加工しない**：CC BY-SA の写真は、切り抜き・色調整・文字の書き込みをしない（縮小と形式の変換だけ済ませてあります）。注記入りの写真は、ライセンスが許すもの（PD・CC0・CC BY）だけで、クレジットに「注記は本書で追加」と書いてあります。
3. **本文・問題・解答の文言を変えない**：要約・言い換え・新しい問題の追加はしない。教材の内容を変えたいときは元の教材（Word）を直してから作り直す。
4. **既存の教科書（FAA 前提）と混ぜない**：章番号・節 ID は `kiso` で始まり、既存の `FL.book` とぶつからない。画面でも「基礎教材（日本の航空法 前提）」と分かるようにする。
5. **図は白い背景のまま表示する**：図の色は白地を前提に決めてある。暗い画面の上では、白い角丸の枠（`figure`）に入れて表示する。

## 容量

FLIGHT LAB のビルドは 12 MB が上限（`build.mjs` の `MAX_BYTES`）。v2.4 の `FLIGHT-LAB.html` は約 7.1 MB なので、`kiso-data.js`（約 4.1 MB）を足すと約 11.2 MB で、余りは約 0.8 MB です。
足りなくなったら、写真を小さくして `kiso-data.js` を作り直してもらってください（写真の幅・画質を下げる）。文字と図はほとんど容量を使いません（図 0.6 MB、本文 1.3 MB）。
