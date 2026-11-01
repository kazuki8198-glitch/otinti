# CADET Godot 移植 Phase 4 — 地面・光・雲 (項目1) ノート

担当範囲: `src/world_build.gd`, `src/airport_build.gd`, `assets/tex/*.import`,
新規 `src/sky_clouds.gd`, 新規 `test/run_p4world.gd` / `test/verify_p4world.gd`。
`scenes/main.gd` は未編集 (環境・太陽は統合側への推奨として §4 に分離)。

---

## 1. 切り分け: Phase 3 撮影 (build/phase3-walk.png) の「白〜水色への洗われ」と放射状 streak

### 1.1 原典テクスチャの平均色 (PIL で全 12 枚を実測)

| tex | サイズ | 平均色 (sRGB) | 備考 |
|---|---|---|---|
| grass_c | 1024² | (0.378, 0.426, 0.189) | 十分に暗いオリーブ。テクスチャ自体は白くない |
| asphalt_c | 1024² | (0.472, 0.472, 0.472) | 中性グレー |
| concrete_c | 1024² | (0.636, 0.597, 0.528) | 暖色寄りの明るいグレー |
| concrete2_c | 1024² | (0.392, 0.378, 0.359) | 暗め |
| plaster_c | 1024² | (0.746, 0.749, 0.731) | 明るいが色は正常 |
| *_n (asphalt/concrete) | 1024² | (0.50, 0.50, 0.97) | RGB 法線 |
| *_r (asphalt/concrete) | 512² | R=0.525 / 0.609 | 粗さ (R チャンネル) |
| *_nr (grass/concrete2/plaster) | 512² | RG≈0.50, B=0.263/0.692/0.515 | **packed: RG=法線XY, B=粗さ** |

切り分け実験 (Xvfb + llvmpipe, unshaded + 線形トーンマップで直読み):
Godot の albedo テクスチャ経路は sRGB デコード/再エンコードが正しく働いており、
サンプル値は上記平均色と一致した。**テクスチャ資産と色空間変換は無罪。**

### 1.2 原典 HTML での使われ方 (突き合わせ結果)

- `render/textures.js`: 色テクスチャのみ sRGB、他は NoColorSpace。
  全テクスチャ `RepeatWrapping` + `generateMipmaps=true` + `LinearMipmapLinear` + 異方性。
- `render/materials.js` の `metricMaterial`: UV はジオメトリの UV ではなく
  **オブジェクト座標 (メートル) / scale** を triplanar で引く。つまり原典は
  「面の大きさに依らず 1 タイル = scale m」が全方向で常に成立する。
  packed `nr` の粗さは `roughness * (0.6 + 0.8 * B)`。
- `world/ground.js`: 草は `guv = loc / 2.6` (2.6 m タイル) + anti-tile 参照。
  粗さは `mix(0.92, 1.0, grass_nr.b)`、法線は `grass_nr.rg`。
- `world/airfield.js` の舗装シェーダ: UV は滑走路座標 (m) を asphalt 3.2 / concrete 4.0 で割り、
  粗さは `mix(0.55, 1.0, tR.r)`、法線は分離 `*_n`。
- 建物の tint は 16 進カラー (例 plaster `0xf3eee4`, concrete `0xd8dadc`, trim `0x9a9fa6`,
  roofFlat `0x8b8f93`) で、**テクスチャ (線形化済み) に乗算**される。
  world_build.gd の tint 値はこの 16 進成分と一致していた (転記は正しい)。
- レンダラ (`render/post.js`): `AgXToneMapping`, **露出 0.62**、出力 sRGB、
  PCF シャドウ。空は物理 Sky + 雲注入 (coverage 0.34 / density 0.55)。

### 1.3 原因の特定 (寄与順)

1. **タイリング崩壊 (主因・本担当で修正)**: `_tex_mat` が `uv1_scale = 1/repeat_m` を
   付けていたが、BoxMesh の UV は面ごとに 0..1。よって例えば 165 m の SITE 舗装は
   テクスチャの 1/4 × 1/4 の一角を引き伸ばして全面に貼っていた
   (本来は 41 × 13 タイル)。引き伸ばされた一角が明るい部分だと面全体が
   白っぽく潰れ、質感が消える。滑走路等の airport 側はそもそも無地色だった。
2. **ミップマップ無し (streak の主因・修正)**: 全 `.import` が `mipmaps/generate=false`。
   120,000 m の外周地面 (46,154 回反復) や斜めから見る舗装では縮小フィルタが
   破綻し、放射状のモアレ/streak とチラつきになる。原典は全テクスチャで生成 ON。
3. **tint の色空間 (修正)**: tint は原典 sRGB 値の成分そのままだが、Godot の
   `albedo_color` は線形として扱われる。線形 0.84 は表示では約 0.93 に化けるため、
   全体が一様に持ち上がっていた。`srgb_to_linear()` で原典の乗算と一致させた。
4. **環境光 (統合側・§4)**: main.gd の `AMBIENT_SOURCE_SKY` (ProceduralSky) が
   Compatibility では非常に青く明るい。実測 (asphalt 面、真上から):
   - 太陽のみ: (0.549, 0.549, 0.549) — 中性で正常
   - 空アンビエントのみ: (0.176, 0.392, 0.576) — 強い青
   - 合算 (現行 main.gd 設定): **(0.733, 0.945, 1.0)** — 水色にクリップ
   原典は AgX + 露出 0.62 でこの持ち上がりを抑えている。素材側では直せない
   (roughness を上げても拡散アンビエントは残る) ため §4 の推奨で分離する。

---

## 2. 変更点

### 2.1 `src/world_build.gd` — タイリングと配線

- `_tex_mat_uv()` を新設し、材質に `tex_spec` メタ (tex/tint/repeat/rough) を付与。
  `_box()` は箱サイズから **支配的な面の uv1_scale = 面サイズ / repeat_m** を持つ
  バリアントへ差し替える (`_box_uv()`):
  - 扁平な箱 (高さが最小) → 上面 (幅 × 長さ) / repeat
  - 薄壁 (一辺が最小) → 大きな側面 (長辺 × 高さ) / repeat
  - ノード名・寸法・`spec_summary()`・公開 API は不変。
- tint と `_flat_mat` の色を `srgb_to_linear()` で変換 (原典の乗算と一致)。
- テクスチャフィルタを `LINEAR_WITH_MIPMAPS_ANISOTROPIC` に (斜面の streak 対策)。
- 法線/粗さの配線 (`_COMPANION` + `_wire_companions()`):
  - packed `*_nr`: RG から RGB 法線を再構成した ImageTexture を生成し normal に、
    B に原典の変換 (packed は `0.6 + 0.8B`、草は `0.92 + 0.08B`) を掛けた
    グレースケールを生成し roughness に (scalar の roughness との積が原典式と一致)。
  - 分離 `*_n` / `*_r`: 法線は輸入テクスチャそのまま。`asphalt_r` は舗装式
    `0.55 + 0.45R` を掛けたグレースケールを生成。
  - concrete_c は原典の建物利用 (academy/hangar 床) で粗さマップを使わないため法線のみ。
- 外周地面 (GroundOuter) にも grass_nr の法線/粗さを配線し、roughness scalar を
  1.0 に (粗さはテクスチャ側で完結。原典 ground.js の gRough と同義)。

### 2.2 `src/airport_build.gd` — 舗装へのテクスチャ適用

- `_pave_mat()` 新設: 無 tint、法線 `*_n`、粗さは `*_r` に `0.55 + 0.45R` を
  掛けて生成、anisotropic フィルタ。
- `_slab()` に任意引数 `texspec = [tex_name, repeat_m]` を追加し、上面が
  メートル単位でタイルされるよう `uv1_scale = (幅, 長さ) / repeat_m`。
  滑走路・平行/接続誘導路 = asphalt 3.2 m、エプロン = concrete 4.0 m
  (原典 pavementMaterial の割り算そのまま)。標示 (白/黄) は従来通り無地。
  ノード構成・寸法・`build_airport()` / `apron_spot()` の API は不変。

### 2.3 `assets/tex/*.import` (12 枚)

- 全て `mipmaps/generate=false → true` に変更し再 import 済み。それ以外は不変。

### 2.4 新規 `src/sky_clouds.gd` — 雲

API: `SkyClouds.build_clouds(parent) -> Node3D` (preload して使う。world_build と同流儀)、
`cloud_spots() -> Array` (配置表のコピー)。

- 積雲ビルボード: 原典 `world/clouds.js` (growth/gfx, Stage C) の **SPOTS 7 箇所を
  そのまま転記** (空港ローカル x=東 / z=−北、雲底 1,080–1,420 m、幅 1,300–1,950 m)。
  原典 detail=1 と同様に各スポットへ隣接塔 (幅 ×0.45, +x 幅×0.52, +z 幅×0.20,
  雲底 +50 m) も付け、計 14 枚。座標は VIS_OFF と GROUND_M で Godot 世界へ。
- 絵柄: 原典 `cumulusTexture` と同じ手順を実行時生成 (種付き乱数、512×288、
  雲底線は高さ 80%): 2 本の塔 + ドーム + 肩 + 雲底列の puff 群、上ほど明るく
  雲底は灰青の板、BASE より下はフェード。低解像 (160×90) で計算し
  バイリニア拡大で柔らかくし、ミップ付き ImageTexture 化。
- 材質: `SHADING_MODE_UNSHADED` + `BILLBOARD_FIXED_Y` (原典はヨーだけのビルボード)、
  `TRANSPARENCY_ALPHA_SCISSOR` 閾値 0.35 (原典の alphaTest 0.35 と同じく
  「深度は固い芯だけ」)、tint は原典の HDR 水準に寄せて (1.85, 1.90, 2.0)。
- 層雲レイヤー `StratusLayer`: 60,000 m の面を高度 2,600 m に置き、専用
  spatial シェーダ (fbm の warp で形を崩し、第 2 オクターブで自己影風の
  濃淡、drift 方向へ TIME で微速移動、coverage uniform 0.45)。
  原典では Sky シェーダ内の平面雲 (coverage 0.34) だが、ProceduralSkyMaterial
  へは注入できないためこの形で近似した。

### 2.5 テスト

- `test/run_p4world.gd` (新規, **82 チェック / 0 失敗**):
  タイリング (GroundOuter / AirfieldGrass / SITE lot・walk / 学園壁・床 /
  格納庫床 / 滑走路 / エプロンで uv1_scale = 面サイズ/repeat を照合)、
  法線・粗さ配線、tint 線形化、全 .import の mipmaps=true、
  sky_clouds の構成 (7+7 枚、QuadMesh サイズ、位置、billboard、層雲)。
- `test/verify_p4world.gd` (任意の見た目検証): main.gd と同じ環境で撮影し
  /tmp/p4_walk.png, /tmp/p4_air.png を出す。徒歩視点では舗装の粒子と
  plaster の質感が確認できた。残る水色の持ち上がりは §1.3-4 (環境側)。
- 回帰: `test/run_world.gd` **9,787 チェック / 0 失敗** (従来通り緑)。
  他テスト群も全て緑 (run_tests / 1 / 2 / 2b / 3 / career / content / save / bridge)。

---

## 3. 統合側への組み込み方 (main.gd)

```gdscript
const SkyClouds = preload("res://src/sky_clouds.gd")
# build_world / build_airport の後で:
SkyClouds.build_clouds(self)   # "Clouds" ノードが付く。それ以外は何もしない
```

## 4. 統合側 (main.gd の WorldEnvironment / 太陽) への推奨値

根拠は §1.3-4 の実測と原典 post.js (AgX, 露出 0.62)。いずれも Compatibility
レンダラで有効な範囲の値。

| 項目 | 現行 (main.gd) | 推奨 | 理由 |
|---|---|---|---|
| `env.tonemap_mode` | FILMIC | **TONE_MAPPER_AGX** (無ければ ACES) | 原典が AgX。高輝度の彩度抜け方が水色化を抑える |
| `env.tonemap_exposure` | (既定 1.0) | **0.75** から開始 (原典は 0.62 だが Godot の光量スケールが違うため控えめに) | 全体の持ち上がりを戻す |
| `env.ambient_light_energy` | (既定 1.0) | **0.45** | 実測: 空アンビエント単独で asphalt が (0.18,0.39,0.58) まで青く出る主因 |
| 空の `energy_multiplier` (ProceduralSkyMaterial) | (既定 1.0) | 1.0 のまま (先に energy 側で調整) | 空自体の見え方は現行で概ね良い |
| 代替案: ambient を色指定に | — | `AMBIENT_SOURCE_COLOR`, 色 (0.45, 0.52, 0.62), energy 0.6 | 空連動を切るならこちらが安定する |
| 太陽 `light_energy` | (既定 1.0) | 1.0–1.15 | 太陽単独の画は中性で正常だった |
| 太陽シャドウ範囲 | 既定 (max_distance 100) | `directional_shadow_max_distance = 800`, `directional_shadow_mode = SHADOW_PARALLEL_4_SPLITS` | 徒歩〜低空の範囲を 1 枚に収める |
| シャドウバイアス | 既定 | `shadow_bias = 0.06`, `shadow_normal_bias = 1.2` (m スケールのシーン向け) | 大スケールでの acne / peter-panning のバランス |
| フォグ (霞) | 無し | `fog_enabled = true`, `fog_light_color = Color(0.62, 0.70, 0.82)`, `fog_density = 0.0002`, `fog_sun_scatter = 0.25` | 原典 haze 色 ≈ (0.52, 0.62, 0.78)。遠景の地面が空へ溶ける。密度は要目視調整 |
| `env.background_energy_multiplier` | (既定 1.0) | 1.0 | — |

雲の天候連動 (原典: overcast でビルボードがフェードし平面雲が取る) は
統合側で `Clouds` ノードの modulate / 可視性を駆動する形が素直。
現状 build_clouds は静的配置のみ。

---

## 5. 残件・正直な限界

- **タイリングは支配面のみ正確**: BoxMesh は面ごとに UV 0..1 で、1 つの
  uv1_scale では全方向同時にメートル単位にできない (原典は triplanar)。
  残りの面は辺の比だけずれる。完全一致には triplanar シェーダ材質への
  置換が必要で、今回は材質型 (StandardMaterial3D) と既存テスト
  (BoxMesh 前提) を守るため見送った。
- **anti-tile 無し**: 原典は cdTexNoTile で反復感を消すが、Godot 標準材質には
  無い。遠景ではミップ+aniso で目立たないが、近景の草には反復が残る。
- 積雲の絵柄は原典の手続きを移植したがピクセル一致ではない (乱数列が違う)。
  また原典の漂流アニメーション・距離フェード・天候連動は未実装 (静的配置)。
  alpha scissor のため縁は原典 (ブレンド+alphaTest) より僅かに硬い。
- 層雲はシェーダ近似で、原典 Sky 注入雲のような太陽位置連動の陰影はない。
- 粗さ/法線の生成テクスチャは実行時生成 (初回 build で 512² × 数枚の画素
  ループ、実測で全体のテスト実行は約 3 秒に収まる)。起動時間への影響は軽微。
- 画の最終判定 (特に §4 の推奨値の適否) は llvmpipe のスクリーンショットでは
  なく実機 (Iris Xe) での目視が要る。verify_p4world.gd で同じ条件を再撮影できる。
