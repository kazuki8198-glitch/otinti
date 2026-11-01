# CADET Godot 移植 Phase 4 — 項目4「デバイス分離」ノート

担当系統: デバイス分離（HTML 側ゲーム品質ウェーブ項目3の Godot 移植）
作成ファイル: `src/device_map.gd`（新規）、`test/run_devices.gd`（新規）、本ノート
既存ファイルは一切編集していない。`scenes/main.gd` / `src/input_map.gd` / `src/controls.gd` は読み取りのみ。

## テスト結果

```
$ godot --headless --path ~/workspace/cadet-godot -s test/run_devices.gd
== Phase 4 devices total: 87 checks, 0 failures   (exit 0)
```

**実機パッドはこの VM 環境に存在しない**（`Input.get_connected_joypads()` は空）。したがって本項目の証跡は
「偽デバイスリストに対する解決・合成ロジック + 永続化往復 + UI 生成スモーク」までが仕様であり、
実パッドでの動作確認はユーザーの PC（実機ヨーク／ペダル／クアドラント接続時）に委ねられる。
`list_connected()` / `describe_connected()` は実環境の `Input` 件数との整合のみ検証した。

## HTML 原典との対応

原典: `cadet-wt-gameq` commit `dea08a5` "gamepads assigned by device, not by slot number"
（`cadet/src/flight/controls.js` の `padMapOf` / `padInput` 内 `raw()`、`cadet/src/ui/menu.js` の軸割当てエディタ、
`cadet/test/pads.test.mjs` の6ケース）。

| HTML 原典 | Godot 移植（device_map.gd） |
|---|---|
| padMap エントリの `id`（gamepad.id 文字列への部分一致・大小文字無視） | 割当て identity 文字列。`match_score()` が部分一致（score 60）を含む段階マッチ |
| ブラウザの gamepad.id（1文字列） | Godot には相当する単一文字列がないため **identity = `Input.get_joy_name(dev) + "\|" + Input.get_joy_guid(dev)`**（`make_identity()`） |
| id 指定デバイスが未接続 → その軸は「なし」（他デバイスへフォールスルーしない） | `resolve()` は割当て済みロールでマッチなしなら **-1**。`merge_axes()` は -1 のロールのチャンネルを 0 のままにする（他デバイスの同番号軸を読まない）。テストで明示検証 |
| 列挙順が変わっても割当てはデバイスに追従 | `resolve()` は接続リストの順序に依らず identity で探す（シャッフルテスト済み） |
| id なし・pad=-1（既定エントリ pitch/roll/yaw/trim）= どのパッドでも（実質先頭パッド） | 未割当ロールの policy `"any"`（yoke / pedals）→ 先頭の接続デバイス |
| padMap の thr/thrL/thrR/brakeL/brakeR は既定 null（未割当て） | throttle ロールの policy は `"none"` → 未割当てなら -1（デバイスなし） |
| 設定エディタが接続中デバイスを名前で提示 + 未接続の割当て済みデバイスも選択肢に残す | `build_settings_ui()` のロール別 OptionButton：選択肢 = 「なし/既定」+ 接続中デバイス（名前/guid/index 表示）+ 未接続なら「割り当て中（未接続）: …」 |
| `padMapOf` の検証（不正な id は落として軸割当ては保持、軸範囲外は既定へ） | `set_axis()` は軸 0–15 以外を拒否。`load_settings()` は範囲外の軸を落として読み込む |
| （原典にない追加）同名デバイス2台 | ブラウザ id はモデル名止まりで個体区別が弱い。Godot 側は **guid が決定的**：identity に guid を含む割当ては他個体の guid とは score 0（マッチしない）。テストで明示検証 |
| localStorage の prefs 保存 | `user://cadet_settings.cfg` の **[devices] セクション** に ConfigFile 保存（AI教官の [ai] と同ファイル規約。保存時に他セクションは保持し [devices] のみ再書込——往復テストで [ai] 保持を検証） |

原典との意図的な差異:
- 原典は「機能（pitch/yaw/thrL…）→デバイス」の粒度。本移植はタスク指定により **ロール（yoke/pedals/throttle）→デバイス**
  + ロール内軸マップの2段構成。ロール内の軸番号は `axis_maps` で変更可能なので、原典の機能別割当ては
  ロール内軸の振り替えで再現できる。
- 原典の `raw()` はデッドゾーン前段の生値を返す。本移植の `merge_axes()` もデッドゾーンは適用しない
  （DZ は消費側＝現行 `input_map.read_pad` / `controls._dz` の責務、という現行 Godot 側の分担に合わせた）。

## API 確定形（src/device_map.gd、`class_name CadetDeviceMap extends RefCounted`）

```gdscript
# 生成（第1引数で設定パス差し替え可能。既定は user://cadet_settings.cfg）
var dm = CadetDeviceMap.new()                      # or .new(path)

# ロール: "yoke" / "pedals" / "throttle"（既定）。拡張:
dm.register_role(role, default_policy := "none", axes := {})  # policy: "any"=先頭デバイス / "none"=なし
dm.roles() -> Array
dm.default_policy(role) -> String

# identity
static CadetDeviceMap.make_identity(joy_name, guid) -> String      # "name|guid"（guid 空なら name のみ）
static CadetDeviceMap.parse_identity(identity) -> {name, guid}
static CadetDeviceMap.match_score(assignment, entry) -> int        # 0=不一致, 100/90/80/60/50
static CadetDeviceMap.identity_matches(assignment, entry) -> bool

# 接続デバイス（UI 表示用）
static CadetDeviceMap.list_connected() -> Array        # [{index, name, guid, identity}]（列挙順）
static CadetDeviceMap.describe_connected() -> PackedStringArray  # "#<index>  <name>  (guid: <guid>)"

# 割当て / 軸マップ（axis は 0..15）
dm.set_assignment(role, identity) / get_assignment(role) -> String / is_assigned(role) / clear_assignment(role)
dm.set_axis(role, channel, axis) -> bool / get_axis_map(role) -> Dictionary
# 既定軸マップ: yoke {yoke_x:0, yoke_y:1}, pedals {rudder:2}, throttle {throttle:0, prop:1, mixture:2}
# （yoke/pedals は単一パッド時の従来レイアウト＝input_map.read_pad / PADMAP0 と一致）

# 解決
dm.resolve(connected: Array) -> Dictionary     # role -> device index（なければ -1、フォールバックなし）
dm.resolve_connected() -> Dictionary           # 実デバイスで解決

# 合成読み取り（純粋関数）
static CadetDeviceMap.merge_axes(connected, resolution, axis_maps, reader: Callable) -> Dictionary
#   reader = func(device_index: int, axis_index: int) -> float
#   返値 {yoke_x, yoke_y, rudder, throttle, prop, mixture}（各 [-1,1] クランプ、未解決/未割当は 0.0）
#   軸指定は int または {axis:int, inv:bool} のどちらでも可
dm.read_merged(reader) -> Dictionary           # 自分の割当て+軸マップ+実デバイスでの合成
static CadetDeviceMap.live_axis_reader(device_index, axis_index) -> float  # Input.get_joy_axis ラッパ

# 永続化（user://cadet_settings.cfg [devices]、キーは assign_<role> / axes_<role>=JSON）
dm.save_settings() -> bool
dm.load_settings() -> bool                     # ファイル/セクションなし → false、現状態は不変

# 設定 UI
static CadetDeviceMap.build_settings_ui(dm) -> Control   # PanelContainer（名前 CadetDeviceSettings）
dm.on_ui_role_option_selected(index, ob, role)           # UI の接続先（選択→割当て更新→保存）
```

## 統合手順案（統合担当向け・本系統では未実施）

1. **起動時**: シーン側（main.gd）で `var device_map = CadetDeviceMap.new()` を作り `load_settings()` を呼ぶ。
2. **入力橋渡し**（`src/input_map.gd` の `read_pad` 差し替え案・編集は統合担当）:
   `read_pad` 内の「先頭パッド固定」をやめ、
   `var merged = device_map.read_merged(CadetDeviceMap.live_axis_reader)` を読み、
   返値 dict `{stick, tr, tp, ty, brake}` を
   `tr=merged.yoke_x, tp=merged.yoke_y, ty=merged.rudder` で組み立てる（DZ 0.12 は現行どおりここで適用）。
   throttle チャンネル（merged.throttle 等）は現行 readPad 契約に無いため、別途
   controls 側へ渡す拡張契約（例: 返値に `thrAxis` を追加し、controls.gd の `update()` で
   `gp.has("thrAxis")` のとき `s.thr` へ反映）として統合担当が決めること。本系統では controls.gd の契約は不変。
   注意: 未割当時の yoke/pedals はどちらも先頭デバイスに解決されるため、単一パッド時の挙動は現行と同一になる。
3. **設定 UI**: 設定画面のホスト（統合担当が用意するパネル）に
   `CadetDeviceMap.build_settings_ui(device_map)` の返値を add_child するだけ。選択は即時保存される。
   デバイス抜き差し時に一覧を最新化したい場合は UI を作り直す（`Input.joy_connection_changed` への接続は統合担当）。
4. `.uid` ファイル: 他の src/*.gd と同様、Godot エディタでプロジェクトを開いた際に
   `src/device_map.gd.uid` / `test/run_devices.gd.uid` が自動生成される想定（ヘッドレス実行では生成されない。
   preload はパス指定のため uid なしでもテストは動作する）。

## 限界・残件

- **実機検証なし**: 実パッド（特に同名2台、GUID の安定性——OS/ドライバによっては再接続で guid が変わる
  報告もある）での確認はユーザーの PC でのみ可能。guid が変わった場合でも name の部分一致（score 50 経路）
  で拾えるようにはしてあるが、同名2台が両方接続されている状況では誤認の余地が残る。
- **ボタンは対象外**: 原典同様、本系統は軸とデバイス割当てのみ。ボタン（フラップ等）のデバイス別割当ては扱わない
  （現行 `input_map.pad_edges` は先頭パッド固定のまま）。
- **pedals の既定 rudder 軸 = 2** は単一パッド互換のための既定。独立ペダル機器では rudder が軸0の製品が多く、
  その場合は `set_axis("pedals", "rudder", 0)`（設定 UI の軸変更 UI は未実装——軸変更は現状 API / 設定ファイル経由のみ。
  UI はデバイス割当てまで。軸番号の OptionButton 追加は次段の候補）。
- **スロットルチャンネルの消費側が未配線**: merged の throttle/prop/mixture は返すところまで。
  実際に `s.thr` / 各エンジンへ流す配線は上記「統合手順 2」の拡張契約待ち。
- 設定ファイルの [devices] は `save_settings()` のたびにセクション全量を書き直す。他所が同セクションに
  独自キーを書く運用になると消える（現状そのような書き手はいない）。
