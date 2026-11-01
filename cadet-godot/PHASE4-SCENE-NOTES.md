# CADET Godot 移植 Phase 4 — 項目0「Phase 3 残件の仕上げ」(会話統合の部品＋ドリルUI＋NPC配置＋内装と歩行衝突) ノート

担当範囲の新規ファイルのみで実装した。既存ファイル (scenes/main.gd、src/world_build.gd ほか) は編集していない。統合は別担当が本ノートの手順で行う。

## 作成ファイル

| ファイル | 内容 |
|---|---|
| `src/dialog_ui.gd` | `DialogUI` (Control) + 内包 `DialogUI.DrillCore` (RefCounted) |
| `src/npc_build.gd` | `NpcBuild` — people.js `placeOf()` の移植と NPC 配置・基礎モデル構築 |
| `src/interior_build.gd` | `InteriorBuild` — 内壁・家具・塔階段・格納庫 (全て spec データ駆動) |
| `src/walk_physics.gd` | `WalkPhysics` — (a, c) 平面の軸分離 AABB 衝突＋段差の純粋関数 |
| `test/run_p4scene.gd` | 本系統のテスト。**284 checks / 0 failures** (終了コード 0) |

検証コマンド: `godot --headless --path ~/workspace/cadet-godot -s test/run_p4scene.gd`
既存テストへの回帰なし (run_content 8,906 / run_world 9,787 / run_career 17、いずれも 0 failures)。

## API 確定形

### DialogUI (`src/dialog_ui.gd`, class_name DialogUI extends Control)

```gdscript
setup(data, state, ctx_provider: Callable, on_finish: Callable)
start_dialog(id: String, node = null) -> bool
advance() -> bool          # 選択肢の無いノードを次へ
choose(i: int) -> bool     # i = current_view().choices の表示順
press_key(k: String) -> bool
current_view() -> Dictionary
is_running() -> bool
get_state() -> Dictionary
signal dialog_finished
static radio_panel_text(weather: Dictionary) -> String
```

- `data` は `{dialogs, speakers}` (例: `content["dialogs"]["day1"]["all"]`)。`state` は `CadetDialogEngine.create_dialog_state()` の戻り (null なら内部で新規作成)。`ctx_provider` は `() -> Dictionary`、無効なら `{}` として扱う。`on_finish` は引数なし Callable で、会話終了時に 1 回だけ呼ばれる (signal `dialog_finished` も同時発火)。
- 表示: 話者名ラベル (speakers の color を `Color.html` で文字色に)、本文ラベル、選択肢ボタン (押下で `choose(i)`)、キー操作ヒント (`keys` があるノードでは「key: text」、選択肢が無ければ「Enter: 次へ」)。
- `current_view()`: 実行中は `Runner.view()` に `running=true` を加えたもの。終了後は `{running=false, ends=true, name="", text="", choices=[], keys=[]}`。
- `radio_panel_text(weather)`: `CadetDayRadio.day_radio(weather)` を ATIS 本文 (見出しに周波数 127.65) + 交換列 (atis / gnd_call / gnd_rb / twr_ready / twr_luaw / twr_takeoff / twr_leave / twr_closed / twr_stopgo / twr_back / twr_straight / twr_final / twr_land / twr_exit(A2) / gnd_in(A2) / gnd_in_rb) の聞こえた送信・質問・応答・メモに整形した文字列。呼び出し前に `set_call("pa28")` する。

### DrillCore (`DialogUI.DrillCore`, RefCounted)

```gdscript
start(id: String, seed: int = 1) -> Dictionary   # 最初の質問
answer(i: int) -> Dictionary
current_question() -> Dictionary
is_done() -> bool
result() -> Dictionary   # { id, score, total, passed, growth }
```

- 質問: `{ id, idx, total: 10, prompt, choices: [String], kind, correct: int, pic: Dictionary, say: String }`。`pic` は k1/k2 の PFD 状態 `{ias, alt, hdg, vs, bank}` (描画は統合側)、`say` は k6 の英語文 (TTS/表示は統合側)。**`correct` はテスト・デバッグ用。実 UI では表示しないこと。**
- `answer(i)`: `{ correct, explain, done, score, passed, growth, next }`。`passed` は done のとき `score >= 8` (10 問・80%、原典どおり)。`growth` は done のとき `CadetCareer.ftd_growth(id)` の成長ペア (適用は passed を見て統合側が行う)。不正な id は `start` が `{error}` を返し即 done。
- 生成内容: k1 = 原典 TUTOR 7 件の説明 (kind `explain`、選択肢は「次へ」1 つ) + PFD 確認 3 問 (kind `confirm`)。k2 = `pfdPictures`/`readQuestion` 移植の 10 問。k3 = radio.js DRILLS の 10 種 (alt/fl/hdg/spd/frq/alts/sqk/rwy/wnd/letter) を 1 問ずつ。k4 = dayRadio の交換 10 件 (atis〜twr_land) を順に出題。k5 = radio.js SCENES から 10 場面 (呼称は Godot 側の Archer 8SY に統一して転記)。k6 = radio.js LISTEN 6 種を 10 問に循環。
- 乱数は `CadetCareer.Rng` (原典と同じ mulberry 系) に seed を混ぜて決定的。

### NpcBuild (`src/npc_build.gd`)

```gdscript
static placements(content: Dictionary, opts: Dictionary = {}) -> Array
static build_npcs(parent: Node, content: Dictionary, opts: Dictionary = {}) -> Node3D  # "NPCs"
```

- `opts = { slot = "am", chapter = "ch1", what = [] }`。`what` はその日の予定 (`{kind, slot}` の Array、career の schedule() 形式)。people.js `placeOf()` を忠実に移植したので、時刻・章・予定で配置が変わる。
- 配置エントリ: `{ who, place, a, c, up, seated, act, face, pos }`。`pos` は `WorldBuild.rwy_to_world(a, c, up)` と一致 (テストで全 PLACES 分を照合)。`place` は PLACES のキー。例外: 教官は PLACES に無く main.js の定数 INS (a 634.9, c 256.7、ブリーフィング室 1) を `place="instructorRoom"` として返す。授業中/装置中の同期の座席は `classSeat` / `simSeat` (people.js の動的座標)。
- 既定 (am / ch1 / 予定なし) は 9 名: instructor (brief-1) / chief (chiefRoom) / lecturer (classroom) / dispatcher (dispatchSeat・座り) / mechanic (apron) / controller (towerCab・座り、up=17.2) / kiryu (pilot1) / asahi (pilotMap) / mori (lounge3)。審査官は原典どおり ch6 で checkride の予定があるときだけ examRoom に現れる。夕方 (evening) は非同期が消え、同期 3 名は寮の談話室 (ch1 の夕方イベント時はラウンジ)。
- `build_npcs`: 各 NPC は `NPC_<who>` ノード (meta: who / place)。立ち = カプセル体 (半径 0.28、高さは身長−0.22) + 頭球、seat あり = 座面高さに胴体カプセル + 前に脚箱。色は `PEOPLE[who].color`、名前は Label3D (billboard、色付き、y は頭上)。向きは face 地点への `Basis.looking_at`。

### InteriorBuild (`src/interior_build.gd`)

```gdscript
static build_interiors(parent: Node, content: Dictionary) -> Node3D  # "Interiors"
static wall_boxes() -> Array    # build 後に有効
static stair_steps() -> Array   # build 後に有効
static furniture_count() -> int
static compute_wall_boxes(content) -> Array   # 純粋計算 (build と同じ結果)
static compute_tower_steps(content) -> Array
```

- 内壁: academy / dorm の rooms の平面隣接を全ペアで検出し、共有辺に壁を立てる。doors のうち、その辺・その階 (`y` が床高と一致)・両部屋を含むものは開口として引く。ただし `kind == "locked"` は開口にしない (原典でも施錠され通れない)。壁厚 0.12 m、高さは両部屋の天井高の小さい方 (無ければ 3.0 m)。階の違う部屋同士 (floorY 差 > 0.1) は壁を作らない。外壁は world_build 側の既存シェルがあるので作らない。
- `wall_boxes()` の要素は `{ a0, a1, c0, c1, floor_y, height }` (runway frame) で、そのまま `WalkPhysics.move` の `walls` に渡せる。実データで 68 本 (テストは ≥20 を確認)。
- 家具: academy / dorm / tower の各 room の `furniture` 一覧 (type / a / c / rot / yOff) をそのまま基礎箱で置く。大きさは type 別の表 `FURN_SIZE` (table_long / desk / bed / bookshelf / whiteboard / sim_station / sofa / atc_console 等、無い type は既定 [0.6, 0.8, 0.6])。rot が 90 のとき a/c の大きさを入れ替える。実データで 388 個 (格納庫分を含む)。
- 塔の階段: tower spec のシャフト内 (tower-stairs room の矩形) に折り返し階段。6 便 × 10 段で 0 → 17.2 m (cab floorY)、1 段 ≈ 0.287 m。偶数便は a の低い側のレーンを +c へ、奇数便は高い側のレーンを −c へ上がり、各レベル端に踊り場 (全幅)。`stair_steps()` は段+踊り場 67 件の `{a0, a1, c0, c1, top}` を返し、`WalkPhysics.make_floor_fn(steps, 0.0)` に渡せる。
- 格納庫: hangar spec の areas の interactables のうち bench は作業台 (2.2 × 0.8 m、高さ 0.9)、shelf / tools は棚 (2.4 × 0.6 m、高さ 2.0) をその位置に置く。予備機 (spare) は置かない。

### WalkPhysics (`src/walk_physics.gd`)

```gdscript
static move(pos: Vector3, wish_ac: Vector2, dt: float, speed: float, walls: Array, floor_y_at: Callable) -> Dictionary
static blocked_at(a: float, c: float, up: float, walls: Array) -> bool
static ground_at(a: float, c: float, cur_up: float, steps: Array, base_floor: float = 0.0) -> float
static make_floor_fn(steps: Array, base_floor: float = 0.0) -> Callable
```

- **座標確定: `pos` は runway frame の `Vector3(a, up, c)`** (x=a, y=up, z=c)。world 変換は統合側が `WorldBuild.rwy_to_world(pos.x, pos.z, pos.y)` で行う。
- `move` の戻り値: `{ pos, blocked, blocked_a, blocked_c, floor_y }`。
- 判定: a 軸 → c 軸の順に試行 (軸分離、壁沿い滑り可)。歩行者半径 0.3 m で壁矩形を膨らませて点判定。壁が塞ぐ条件は「壁の天井 > 足元 + 0.45」かつ「壁の床 < 足元 + 1.75 (身長)」— 低い段は床として登れ、上の階の壁は下の階を塞がない。
- 段差: 目標地点の床高 (`floor_y_at` の戻り) と現在の足元の差が **0.45 m 以下なら登って床高に追随** (階段)、超えるならその軸の進入を止める。下りは床まで落とす。`floor_y_at` は `Callable(a, c, cur_up) -> float`、無効なら床は現在高のまま。
- 定数: `RADIUS = 0.3`, `HEIGHT = 1.75`, `STEP_MAX = 0.45`。

## 統合手順 (main.gd 側)

1. **世界構築直後** (world_build の直後):
   ```gdscript
   var npcs = NpcBuild.build_npcs(world_root, content, { "slot": slot, "chapter": chapter, "what": schedule })
   var interiors = InteriorBuild.build_interiors(world_root, content)
   var walls = InteriorBuild.wall_boxes()
   var floor_fn = WalkPhysics.make_floor_fn(InteriorBuild.stair_steps(), 0.0)
   ```
   スロットが変わったら NPC は作り直す (placeOf は時刻で変わるため。原典 cast.js の layout() 相当)。
2. **会話**: 予定項目 (kind が ceremony / tour / brief / event / class の会話系) の実行時に DialogUI を CanvasLayer に出し、`setup(dialog_data, dialog_state, ctx_provider, on_finish)` → `start_dialog(id)`。入力は Enter → `advance()`、数字キー → `choose(i)`、ノードの keys は `press_key(k)`。`on_finish` で予定の記帳 (driver 側) に進む。飛行日のブリーフ表示には `DialogUI.radio_panel_text(weather_dict)` の文字列をそのままパネルに出す (weather_dict は day_radio が受ける形式: windMag / windKt / qnh / tempC / dewC / zulu / info / intent 等、欠けたキーは既定値)。
3. **ドリル**: 予定項目 kind `ftd` の実行時に `DrillCore` を開く。`start(id)` の質問を 1 問ずつ表示し (`pic` があれば PFD 描画、`say` があれば TTS/表示)、回答で `answer(i)`、`explain` を講評に表示。`done` になったら `result().passed` を見て、合格なら成長ペア `result().growth` を career の能力に加算し、driver の ftd 記帳 (`note_ground` 相当) に進む。
4. **歩行**: walker の runway frame 座標を保持し、毎フレーム
   ```gdscript
   var r = WalkPhysics.move(walk_pos, wish_ac, dt, 3.0, walls, floor_fn_for_current_area)
   walk_pos = r.pos
   walker.position = WorldBuild.rwy_to_world(walk_pos.x, walk_pos.z, walk_pos.y)
   ```
   塔の外では `floor_fn` は平坦 (0.0) でよいが、階段と踊り場は steps に含まれるので、塔周辺では上の `floor_fn` を使う (段の無い場所では base 0 が返る)。学園 2 階・屋上は床高が違うため、将来 floor 側に部屋の床矩形を足す想定 (現状は未対応、下記)。

## 未完・限界 (正直な記録)

- **k1 の確認問題は 3 問のみ**: 原典 k1 は説明のみで採点問題を持たない。タスクの「各 10 問」に合わせ、説明 7 件 + 確認 3 問 = 10 ステップとした。説明ステップは「次へ」を押せば常に正解扱いなので、k1 の実質的な合否は確認 3 問で決まる (全部外すと 7/10 で不合格)。
- **k4 は簡略版**: 原典 chair-flight.js の op 項目 (COM1 周波数合わせ・トランスポンダーコード・聞き取り前の待機) とシードイベント (他機の交信・雑音で聞き取れない指示と say again)、段階制 (台本あり/なし/本番の時計) とマイク復唱は未移植。dayRadio の交換 10 件の選択式のみ。完全移植には chairScript の生成器と runner の移植が別途必要。
- **k3/k6 の生成器は部分移植**: radio.js の DRILLS 全 12 種のうち utc (時刻) と call (登録記号) を除く 10 種、LISTEN は 6 種全てを移植。言い方のヘルパー (altitude / digits 等) は AIM の規則に沿う最小実装で、原典の細かな誤答生成 (逆転・桁落としの作り方) は一部簡略化した。
- **k5 の場面は 10 件の転記**: radio.js SCENES 全 34+ 場面から 10 件を選び、呼称を LAB の Archer 8SY に置換して埋め込んだ。全場面のデータ化は content.json 側の抽出拡張が要る。
- **NPC は基礎姿勢のみ**: 原典 actor.js の人体モデル・座り姿勢の関節・act の手持ち小物 (本・レンチ等)・歩行移動 (walker-npc)・会話対象としての衝突体は未移植。色分けと名前と座り/立ちの区別まで。教官の face は原典に無く入口向きの近似。
- **内装の限界**: ドア扉そのもの (開閉) は作っていない (開口は常時開)。学園の階段室 (1 階→2 階→屋上) の段は未構築 (塔のみ)。家具は全て単色の箱で、椅子に座る等の相互作用はない。壁は天井高までで、窓開口は切っていない。
- **歩行の限界**: 床は「steps + base」のみで、学園 2 階 (floorY 4.22) や屋上の床矩形には未対応 (統合時に部屋の floorRects を steps 形式に変換して渡せば登れるようになる)。家具との衝突は walls に含めていない (壁のみ)。原典 collide.js の円柱押し出し (角での滑らかな押し戻し・すり抜け防止のサブステップ) ではなく点+半径膨張の軸分離なので、高速移動 (speed × dt が壁厚+直径を超える) ではすり抜けうる。通常の徒歩速度 (〜3 m/s、60 fps) では問題ない。
- DialogUI のレイアウトは最小 (縦並び) で、画面上の配置・装飾は統合側の責務。`advance()` は Runner の仕様どおり選択肢のあるノードでは進まない。
