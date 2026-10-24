# 素材とライセンス

## テクスチャ（`assets/tex/`）

すべて ambientCG（https://ambientcg.com）の素材で、ライセンスは CC0 1.0 です。このリポジトリの別ブランチ（`claude/what-is-this-db5aue` の `models/tex/`）に、縮小済みの版がすでにありました。ここでは WebP に変換し、粗さのマップは 512 px に縮めています。

| ファイル | 元の素材 | 使い道 |
|---|---|---|
| `asphalt_c` / `_n` / `_r` | Asphalt031（色・法線・粗さ） | 滑走路・誘導路・駐車場 |
| `concrete_c` / `_n` / `_r` | Concrete048（色・法線・粗さ） | エプロン（駐機場） |
| `grass_c` / `grass_nr` | Grass004（色、法線と粗さをまとめたもの） | 芝生 |
| `plaster_c` / `plaster_nr` | PaintedPlaster017 | 建物の壁 |
| `concrete2_c` / `concrete2_nr` | Concrete031 | 歩道・屋上・建物の縁 |

## 人物の模型（`assets/model/actor.glb`）

自作です（素材は使っていません）。`tools/actor/build_actor.py` を Blender 5.2 でコマンドから動かして作ります（`blender -b --factory-startup -P tools/actor/build_actor.py -- 寸法.json assets/model/actor.glb`。寸法は `node tools/actor/anchors.mjs` が `src/npc/actor.js` から書き出します）。

- 顔・髪（短髪・刈り上げ・後ろで結んだ長い髪・まとめ髪）・耳・眉・目・まぶた・瞳・口と、制服（シャツ・襟・ネクタイ・胸ポケット・肩章と線・翼の記章・名札・ネックストラップと ID カード）。
- 形はスクリプトの中の関数で細かく作り、Blender の間引き（デシメーション）で三角形の数を減らし、細かい形の法線を写します。陰（アンビエントオクルージョン）と唇やまぶたの色は、頂点の色に焼き込みます。
- 名札の文字は、ゲームが起動時に 5×7 の点の字で書きます（`src/npc/actor.js`）。
- 翼の記章は架空の翔洋航空のもので、実在の会社の記章をまねていません。

## プログラムで作っているもの（ファイルなし）

起動時にプログラムで描いています。

- 滑走路の数字
- 標識
- 波板の凹凸
- 窓
- 水面の波
- 木
- 機体：FLIGHT LAB の `acmesh.js` が、物理モデルと同じ寸法から作る形をそのまま使っています。
- 人物の手足・腰・首（`src/npc/actor.js`。座ると形が変わるため、模型ではなくプログラムで作っています）

## ライブラリ

- three.js 0.186.1（MIT License）：ビルドしたファイルの末尾に、ライセンスの全文を入れています。
- esbuild 0.28.2（MIT License）：ビルドに使うだけで、出力には含まれません。
- Blender 5.2（GPL）：人物の模型を作る道具として使うだけで、出力には含まれません（Blender で作ったものは、作った人のものです）。

## 名前

航空会社・訓練所・飛行場・人物は、すべて架空です。

- 翔洋航空 / SHOYO AIRWAYS
- 翔洋航空 フライトアカデミー / SHOYO FLIGHT ACADEMY
- LAB 飛行場

名前は `src/world/layout.js` の `NAMES` にまとめてあります。
