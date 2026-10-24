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

## 人物の模型（`assets/model/actor.glb`・`actor-near.glb`）

自作です（素材は使っていません）。`tools/actor/build_actor.py` を Blender 5.2 でコマンドから動かして作ります（`blender -b --factory-startup -P tools/actor/build_actor.py -- 寸法.json assets/model/actor.glb - far`、近くの人の模型は `actor-near.glb - near`。寸法は `node tools/actor/anchors.mjs` が `src/npc/actor.js` から書き出します）。

- 顔・髪（短髪・刈り上げ・後ろで結んだ長い髪・まとめ髪）・耳・眉・目・まぶた・瞳・口と、制服（シャツ・襟・ネクタイ・胸ポケット・肩章と線・翼の記章・名札・ネックストラップと ID カード）。
- 形はスクリプトの中の関数で細かく作り、Blender の間引き（デシメーション）で三角形の数を減らし、細かい形の法線を写します。陰（アンビエントオクルージョン）と唇やまぶたの色は、頂点の色に焼き込みます。
- 名札の文字は、ゲームが起動時に 5×7 の点の字で書きます（`src/npc/actor.js`）。
- 翼の記章は架空の翔洋航空のもので、実在の会社の記章をまねていません。

## Archer の外観の模型（`assets/model/archer.glb`・`archer-far.glb`）

自作です（素材もフォントも使っていません）。`tools/aircraft/build_archer.py` を Blender 5.2 でコマンドから動かして作ります（`node tools/aircraft/spec.mjs > 寸法.json`、`blender -b --factory-startup -P tools/aircraft/build_archer.py -- 寸法.json assets/model/archer.glb - near`、遠くの機体の模型は `archer-far.glb - far`）。

- 寸法は FLIGHT LAB の物理の記述（胴体の輪・翼・尾翼・脚・エンジン）から取り、動翼は `acmesh.js` のヒンジの線の上で動きます。客室の形は操縦席（`src/aircraft/cockpit.js`）の窓・風防・天井に合わせています。
- 胴体・カウリング・空気取り入れ口・スピナーとプロペラ・テーパーした翼と翼端・フラップとエルロン・スタビレーター・垂直尾翼とドーサルフィン・ラダー・脚の緩衝支柱と車輪とホイールフェアリング・風防と窓・ドアやカウリングの合わせ目・燃料キャップ・ピトー管・失速警報・アンテナ・ステップ・係留リング。
- 塗装は架空の翔洋航空のもの（白に濃い青の帯と金の線、垂直尾翼の上が濃い青）で、実在の会社の塗装をまねていません。登録記号（架空の N7xxSY）の文字は、スクリプトの中で線で書いた字です。
- 陰（アンビエントオクルージョン）は頂点の色のアルファに焼き込みます。

## プログラムで作っているもの（ファイルなし）

起動時にプログラムで描いています。

- 滑走路の数字
- 標識
- 波板の凹凸
- 窓
- 水面の波
- 木
- Seminole（双発機）の外観：FLIGHT LAB の `acmesh.js` が、物理モデルと同じ寸法から作る形をそのまま使っています。
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
