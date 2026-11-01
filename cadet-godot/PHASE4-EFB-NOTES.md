# CADET Godot 移植 Phase 4 — EFBタブレット（項目5）＋リプレイ/外部カメラ/プロファイルグラフ（項目6）ノート

担当系統の成果物（すべて新規ファイル、既存ファイルは無編集）:

| ファイル | 内容 |
|---|---|
| `src/efb.gd` | `class_name EFB extends Control` — CHART / WB / CHECKLIST の3タブ |
| `src/replay.gd` | `class_name ReplayPlayer extends Node3D` — 記録再生＋外部カメラ |
| `src/profile_graph.gd` | `class_name ProfileGraph extends Control` — 高度/IAS プロファイルグラフ |
| `test/run_p4efb.gd` | 検証ランナー: **310 checks / 0 failures**（下記） |
| `PHASE4-EFB-NOTES.md` | 本文書 |

テスト実行: `godot --headless --path ~/workspace/cadet-godot -s test/run_p4efb.gd` → 終了コード 0。
内訳: wb 156 / checklist 78 / chart 19 / replay_interp 22 / camera 9 / profile 11 / player 15。
既存スイート回帰確認: `run_tests` 0、`run_world` 0。`run_save` は全 57,726 checks 合格後に
エンジン終了処理で abort (exit 134) するが、本系統のファイルを外したベースラインでも同一事象を
確認済み（既存問題、本作業と無関係）。

---

## 1. API 確定形

### 1.1 EFB (`src/efb.gd`)

タブ:
- `show_tab(tab: String)` — `"CHART"` / `"WB"` / `"CHECKLIST"`（大文字小文字不問、不正値は CHART）
- `current_tab() -> String`

CHART:
- `static func chart_geometry() -> Dictionary` — 空港図ジオメトリ（テスト可能・描画と分離）。
  座標は滑走路座標系で `Vector2(cross_m, along_m)`、真上が北。
  キー: `runway` / `runway_surface`（標示部 0..1200 m）/ `taxiway_parallel` / `connectors`（Array、3本）/
  `apron` / `centerline` / `threshold36` / `threshold18` / `apron_spot` / `academy {rect, center}` /
  `tower {pos}` / `hangars`（Array、2棟）/ `paved`（`FP.PAVED` のコピー）/ `bounds` / `hdg`(=354) / `len` / `wid` / `elevFt`。
  生成元は `FlightPhysics.PAVED` + `lab_rwy()` と `world_build.gd` の ACADEMY / TOWER / HANGARS 定数（二重定義なし）。

WB:
- `set_aircraft(id: String)` — `"pa28"` / `"pa44"` / `"pa28r"`（未知 id は `aircraftById` と同じく Archer にフォールバック）
- `aircraft_id() -> String`
- `set_loading(d: Dictionary)` — physics と同形: `{fuel: "std"|"full"|"tabs"|"half", front: 0..2, rear: 0..2, bagKg: float}`。
  任意キー `"fuelGal": [L, R]` は `computeWB` の第3引数（タンク別上書き）に転送。
- `loading() -> Dictionary` — `FlightPhysics.cleanLoading` で正規化した現在値。
- `current_result() -> Dictionary` — **`FlightPhysics.computeWB(A, loading, fuelGal)` の結果そのもの**
  （`kg, lb, cgIn, spreadIn, mtowLb, fwdIn, aftIn, ok, problems, fuelGal, loading, emptyKg`）に
  `aircraft` / `name` を付けたもの。W&B データが無い機種では `{}`。計算の二重実装はなし。
- UI: 機種 OptionButton / 前席・後席・荷物 SpinBox / 燃料 OptionButton が上記 API と双方向同期し、
  結果テキストとエンベロープ図（横 CG in、縦 重量 lb、MTOW 線、現在点＝緑:範囲内/赤:逸脱）を表示。

CHECKLIST:
- `set_checklist(aircraft_id: String, phase: String)` — `pa44` → `checklistsSeminole`、それ以外 → `checklistsArcher`。
  未知フェーズは本の先頭フェーズにフォールバック。切替でチェックはリセット。
- `item_count() -> int`、`toggle(i: int)`、`is_checked(i) -> bool`、`checked_count() -> int`
- `current_phase() -> String`、`checklist_aircraft() -> String`、`checklist_title() -> String`
- `current_items() -> Array` — `[{name, value, checked}]`
- 静的: `static func content() -> Dictionary`（`res://data/content.json` を遅延ロード＋キャッシュ）、
  `checklist_book_key(id)` / `checklist_phases(id)` / `checklist_title_of(id, phase)` / `checklist_items_of(id, phase)`。
  content.json の項目は `[name, value, checkFn|null, ...]` 形式で、EFB は表示用の先頭2要素だけを使う
  （`__fn` は評価しない。レッスン進行連動の判定は従来どおり `school.gd` 側のチェックリストが担う）。

### 1.2 ReplayPlayer (`src/replay.gd`)

- `load_samples(samples: Array)` — recorder サンプル配列を時刻順に保持。`duration`（プロパティ、= last.t − first.t）、
  `sample_count()`、`start_time()` / `end_time()` / `current_time()`。
- `seek(t: float)` — 範囲内にクランプ。対象ノード既知ならポーズ即時再適用（ポーズ中のスクラブ可）。
- `set_playing(on: bool)` / `is_playing()` — 終端で自動ポーズ。
- `update_playback(dt, aircraft_node) -> Dictionary` — 再生中は playhead を進め、補間ポーズをノードへ適用し現在サンプルを返す。
- `current_sample() -> Dictionary`
- `static func sample_at(samples, t) -> Dictionary` — テスト可能コア。二分探索＋スカラー lerp＋
  Quaternion slerp（最短経路、出力 q は正規化済み `[x,y,z,w]`）。`onGround` は区間中点でステップ、
  `failed` は OR。範囲外は端サンプルのコピー、空入力は `{}`。
- `static func world_from_sample(sample) -> Vector3` — §2 の換算。
- `static func apply_pose(aircraft_node, sample)` — `position` と `basis = Basis(Quaternion(q))` を適用
  （`main.gd _sync_visual` と同一作法）。
- `static func tower_cab_position() -> Vector3` — 塔キャブ視点の world 座標（frame_camera の tower_pos 用）。
- `static func frame_camera(mode, cam: Camera3D, aircraft_node, tower_pos: Vector3)`:
  - `"tower"`: カメラを tower_pos に置き機体を注視。
  - `"chase"`: 機体後方上部 body `(0, 2.6, 10.5)` から機首前方 `(0, 0.5, -12)` を注視
    （`main.gd` 外部カメラと同じ body 軸約束: -Z = 機首）。
  - `"wing"`: 右翼端 body `(5.5, 0.35, 0.6)`（Archer 半スパン 5.4 m）から前方 `(5.5, 0.1, -20)` を注視。
  - 未知 mode は chase にフォールバック。カメラの -Z が注視点方向を向く。ツリー外ノードでは
    global の代わりに local transform を使う（ヘッドレステスト用フォールバック）。

### 1.3 ProfileGraph (`src/profile_graph.gd`)

- `set_samples(samples: Array)` / `samples()` / `stats()`
- `static func series_stats(samples) -> Dictionary` — テスト可能コア:
  `{t_max, alt_min, alt_max, ias_max, touchdown_t}`。
  `touchdown_t` は「空中にいた後の最初の onGround 遷移」の時刻（着陸接地）。一度も離陸しない／
  最後まで着陸しない系列では `-1.0`。空入力は全 0 + `touchdown_t = -1.0`。
- `_draw()`: 高度（左軸・シアン）と IAS（右軸・緑）の時系列、55 ft 地表面参照線、
  接地位置の縦マーカー＋ `TD xx s` ラベル、軸ラベル。

---

## 2. 高度 → world Y の換算根拠

- physics の状態は `s.pos = [east_m, up_m, south_m]`（physics.gd ヘッダ）。
- `physics.gd derive()` は `o["altTrue"] = pos[1] * FT`（FT = 3.28084）と定義する。よって **up_m = altTrue_ft / FT**。
- `scenes/main.gd _sync_visual` は `aircraft.position = Vector3(pos[0], pos[1], pos[2]) + VIS_OFF(40000,0,0)` とし、
  `airport_build.gd` / `world_build.gd` も地表面を `Vector3(e, GROUND_M, -n) + VIS_OFF` に置く。
- recorder サンプルは `n`（= −south）、`e`（= east）、`alt`（ft MSL）を運ぶ。
  `snapshot()` は `out.alt`（指示高度）を優先し無ければ `altTrue` を使う（BARO=QNH 時は一致）。
  サンプルの `h` は実フライト状態では常に 0（recorder.gd ヘッダ記載の JS `s.pos.y` 由来の癖）なので**使わない**。
- したがって: **`world = Vector3(e, alt_ft / FT, -n) + VIS_OFF`**。
  検証: 地上 alt = 55 ft（GROUND_FT）→ Y = 55 / 3.28084 = 16.764 m = `GROUND_M` と一致（テスト `world.ground_y`）。
- 留意: `alt` が指示高度のため、BARO 設定が QNH からずれていた飛行では再生高度もその分ずれる
  （記録された表示高度の再生としては正しい）。`alt == 0` かつ `onGround` のサンプルは欠落扱いで `GROUND_M` に落とす。

姿勢は `main.gd` と同じく physics の q 配列 `[x,y,z,w]` を `Quaternion(x,y,z,w)` としてそのまま使う。

---

## 
...[truncated 2809 chars]