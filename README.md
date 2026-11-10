# しおり（鍵つきのページ）

`shiori/` にあるのは、内容を暗号化した1枚のページです。鍵のついたリンク（`…/shiori/#k=…`）から開いたときだけ読めます。鍵はこのリポジトリには置いていません。

- 鍵なしで開くと、鍵の入力画面だけが出ます。
- チェックの状態やプランの選択は、開いた端末の中にだけ残ります。
- 一度開いたあとは、電波がなくても開けます。

## 内容を直すとき

`tools/` に道具があります。Node.js だけで動きます。

1. 取り出す：`node tools/decrypt.js shiori/index.html <鍵> > data.json`
2. `data.json` を直す（このファイルはコミットしない）
3. 作り直す：`tools/` に `key.txt`（鍵を1行）を置き、`node tools/build.js shiori data.json`
4. `shiori/index.html` と `shiori/sw.js` をコミットして、このブランチに push

`key.txt` と `data.json` は `.gitignore` に入れてあります。
