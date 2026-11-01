# CADET Godot 移植 — Phase 3 一系統レポート（世界・徒歩パート基礎＋場周トラフィック＋他機種接続）

- 日付: 2026-11-01
- 移植元: `~/workspace/cadet-wt-next` @ 898fe8a（読み取り専用・無変更、GitHub push なし）
- 作業場所: `~/workspace/cadet-godot/` のみ。本系統の所有ファイル以外は編集していない
  （scenes/main.gd, src/syllabus.gd, src/school.gd は未接触。シーン統合は統合担当）
- 検証: `test/run_world.gd`（構造検証中心。llvmpipe 描画検証は行っていない）

## 1. 結果サマリー

**run_world.gd: 9,787 チェック / 失敗 0**（Phase 0–2 の 42,480 と合わせ総計 52,267）

| グループ | チェック | 失敗 | 最大誤差 | 内容 |
|---|---:|---:|---:|---|
| traffic-day-gates | 1,953 | 0 | 0.0 | trafficForDay 1,792 組合せ + twinDay 144 + コールサイン表 |
| traffic-circuit | 3,169 | 0 | 5.0e-7 | CIRCUIT_S + circuitPose 288 点 (ga 有無) |
| traffic-runs | 4,604 | 0 | 5.0e-7 | 固定 dt=0.5 の 8 シナリオ: 全イベント列 + poses/wake スナップショット |
| world-structure | 46 | 0 | — | 建物数・寸法・配置の spec 照合、テクスチャ存在、歩行者移動 |
| aircraft-select | 15 | 0 | — | Seminole 16 meshes / 28,659 tris、reg 切替、pa28r 流用 |

## 2. traffic.gd（場周トラフィック）

- `cadet/src/flight/traffic.js`（214 行）を忠実移植（`src/traffic.gd`, class `CadetTraffic`）。
  - 静的: `traffic_for_day(dict)` / `traffic_for_twin_day(dict)` / `circuit_pose(t, ga, out)` / `circuit_s()`（= 231.655185 s）
  - インスタンス: `set_traffic(count, seed, opts)`（opts は `"18"` 文字列か `{twin, runway}` Dictionary。同一引数の再 set は原典どおり no-op）、`update(dt, player=null) -> Array[イベント]`、メンバ `count / t / poses / wake`
  - P（physics）は原典同様 FLIGHT LAB physics 固定: `FlightPhysics.lab_rwy() / FT / rwyToNE / qFromHPB` を使用。RNG は原典 rng と同一式の `FlightPhysics.Rng` を再利用
  - プレイヤー反応（滑走路占有時の go-around、ダウンウインド延長、シークエンス、playerGoAround、nearMiss、wake）も全移植。シナリオはプレイヤー無し / final 固定 / 滑走路占有 / downwind 近接 / RWY18 / twin / 空 / set リセットの 8 本
  - 忠実性のため残した原典の癖: シークエンス第 2 形態の `say` は spoken でなく short のまま（JS 原典どおり）

## 3. world_build.gd（世界・徒歩基礎）＋ 統合側 API

`static build_world(parent, opts={}) -> Node3D`（"World" を作り parent に追加）:

- 地表: `GroundOuter`（一辺 120,000 m の面、grass_c.webp を ground.js の guv=loc/2.6 相当で反復）、`AirfieldGrass`（layout.region a −260..1460 / c −170..398）
- `Site_0..9`: layout.js SITE 舗装 10 矩形（walk=concrete / lot=asphalt テクスチャ）
- `Fields/Field_r_c` 30 枚: ground.js の農地グリッド（460×320 m）＋原典パレット 7 色をハッシュ選択した平板（シェーダ再現ではなく基礎）
- `Town/TownBlock_r_c` 12 棟: 街区 180 m + 街路 40 m、高さ 6–18 m（決定的ハッシュ）
- `Academy`: layout ACADEMY（a 608–702 / c 248–278 / H 8.2 / wall 0.4）で床・4 外壁・屋根・ロビーガラス前面（c=249、7.8 m）＋ academy-spec の全 20 部屋の床プレート `AcademyRoom_<id>`（floorY 込み: 2 階 4.22、屋上 8.27）
- `Dorm`: layout DORM（618–666 / 366–390 / H 7.4）＋ dorm-spec 全 11 部屋 `DormRoom_<id>`
- `Tower`: layout TOWER の基部（712–730 / 253–271、baseTop 3.6）・シャフト 4 壁（718.6–723.4 / 259.6–264.4、wall 0.25、高さ cabFloor 17.2）・キャブ床円柱（r 3.6、上面 17.2）・ガラス円柱（r 4.0、中心 18.7）・屋根円柱（r 4.4、中心 20.6）
- `Hangars/Hangar1|2`: layout HANGARS の床・妻壁 2・背面壁・扉ヘッダ（h−1.6〜h）・屋根
- テクスチャ: 移植元 `cadet/assets/tex/*.webp` 全 12 枚を `assets/tex/` へコピーして使用

### 徒歩 API（world_build.gd の静的関数、シーン統合は統合担当）

```gdscript
const WB = preload("res://src/world_build.gd")
var world = WB.build_world(parent, {"fields": true, "town": true})  # opts で Fields/Town を切替可
var walker = WB.create_walker(world, 642.2, 254.6, 0.0)  # (parent, start_a, start_c, yaw_deg)
#   -> Node3D "Walker" (子に CapsuleMesh 高さ 1.7 m の Body)。位置は runway frame → world 変換済み
WB.step_walker(walker, Vector2(right, forward), yaw_deg, delta, 3.0)
#   input_vec.x = 右, .y = 前 (各 -1..1)。yaw_deg は方位角 (0=北/-z, 90=東/+x)
#   meta "yaw_deg" と walker.rotation.y も更新される
WB.move_walker(walker, wish_dir_world, delta, 3.0)  # 世界軸方向版。y 成分は無視
#   どちらも y は meta "ground_y" (= GROUND_M、地表 y=0 相当) に固定される
WB.rwy_to_world(a, c, up) -> Vector3   # runway frame → world 変換 (他モジュール用)
WB.spec_summary() -> Dictionary        # 建物寸法・部屋数などの要約
```

## 4. aircraft_select.gd（他機種接続）

```gdscript
const AS = preload("res://src/aircraft_select.gd")
AS.model_path("pa44")            # "res://assets/seminole.glb"
AS.is_reused("pa28r")            # true (専用 glb 無し -> archer.glb 流用、コード内コメント明記)
var built = AS.build_aircraft("pa44", parent)  # { node, id, path, reused, reg, stats }
var raw = AS.load_model("pa44")                # マテリアル未適用の素モデル
AS.model_stats(node)                           # { meshes, triangles }
```

- コピーしたアセット: `assets/seminole.glb`（移植元 model/seminole.glb、803,448 B）
- Seminole 実証: 素モデル 16 meshes / **28,659 三角形**（glb_inspect の棚卸しと一致）、COLOR_0 全メッシュ有
- build 時は `AircraftVisual.apply_materials` を適用。登録記号の既定は pa28/pa28r = N738SY、pa44 = **N452SY**（seminole.glb 内の 3 機から。非表示化 2 件で検証済み）
- 未知 id は Archer にフォールバック

## 5. 正直な未完申告

1. **描画検証なし**: 構造検証のみ（llvmpipe 撮影はしていない）。見た目の最終判定は実機/統合後。
2. **world は「基礎シェル」止まり**: 学園・寮は外壁+部屋床のみで、内壁・ドア・家具・窓リボン（academy.js / dorm.js の本実装）は未移植。管制塔の階段・踊り場（towerStairs）、格納庫の切妻屋根の勾配・扉リーフも未再現（屋根は平板、扉側はヘッダのみ）。
3. **町並みは HTML 版に原典が無い**: ground.js の遠景はシェーダの農地+道路のみで町並みジオメトリは存在しない。本系統の Town ブロックは独自の基礎配置（滑走路北東）であり「HTML 同等」ではない。不要なら統合側で `opts {"town": false}` で切れる。
4. **農地も基礎再現**: ground.js のシェーダ（フィールド分割・樹林・湖岸・リング標識・道路 1.9 km グリッド）は未再現。湖（lakes）自体も未配置。地表テクスチャの反復は面ごとの UV 基準で、原典のメートル基準タイリングとは厳密には異なる。
5. **歩行は基礎のみ**: 衝突判定・段差・階段昇降なし、y は地表固定。歩行アニメーションなし（カプセル仮体）。
6. traffic の描画（traffic-view.js 相当: 他機の 3D 表示）は本系統外。poses は表示側が使える形で返る。
7. テスト実行: run_world.gd は約 4 秒。参照生成は `node tools/gen_reference3c.mjs`。

## 6. 成果物一覧

- 新規 src: traffic.gd / world_build.gd / aircraft_select.gd
- 新規 assets: seminole.glb、tex/*.webp 12 枚（+ 各 .import は Godot インポートで生成）
- テスト: tools/gen_reference3c.mjs、test/reference3c.json、test/run_world.gd（9,787 チェック緑）
- 本ファイル PHASE3-WORLD.md
