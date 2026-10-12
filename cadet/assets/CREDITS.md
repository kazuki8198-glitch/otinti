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

## プログラムで作っているもの（ファイルなし）

起動時にプログラムで描いています。

- 滑走路の数字
- 標識
- 波板の凹凸
- 窓
- 水面の波
- 木
- 機体：FLIGHT LAB の `acmesh.js` が、物理モデルと同じ寸法から作る形をそのまま使っています。

## ライブラリ

- three.js 0.186.1（MIT License）：ビルドしたファイルの末尾に、ライセンスの全文を入れています。
- esbuild 0.28.2（MIT License）：ビルドに使うだけで、出力には含まれません。

## 名前

航空会社・訓練所・飛行場・人物は、すべて架空です。

- 翔洋航空 / SHOYO AIRWAYS
- 翔洋航空 フライトアカデミー / SHOYO FLIGHT ACADEMY
- LAB 飛行場

名前は `src/world/layout.js` の `NAMES` にまとめてあります。
