# CADET Godot 移植 — Phase 3 一系統レポート（セーブ永続化＋レコーダ採取側）

- 日付: 2026-11-01
- 移植元: `~/workspace/cadet-wt-next` @ 898fe8a（読み取り専用・無変更、GitHub push なし）
- 作業場所: `~/workspace/cadet-godot/`、Godot 4.7.2.stable.official
- 前段: PHASE2-REPORT.md §3-7（store は Dictionary の橋渡しまででファイル保存が未配線、起動のたびにリセット）

## 1. 結果サマリー

**同値テスト（test/run_save.gd）: 57,726 チェック / 失敗 0**

| グループ | チェック | 失敗 | 最大誤差 | 内容 |
|---|---:|---:|---:|---|
| recorder.snapshot | 231 | 0 | 0.0 | 防御的入力10種（null・欠落・n/e 明示・flaps 辞書・gearPos null 等） |
| recorder.sequence | 1,306 | 0 | 9.8e-12 | start/push 間引き（0.03 s 押し→10 Hz）/mark/done/last/clear、合成記録の sampleAt・poseAt・CSV・GPX 全文一致 |
| recorder.slerp | 345 | 0 | 6.3e-7 | 四元数 slerp 隅ケース5種（dot<0 の符号反転、nlerp 分岐、180° 等） |
| recorder.flown | 55,670 | 0 | 5.4e-4 | JS 物理を実際に飛行させ recorder 経由で採取した 2,391 サンプル全列＋着陸レコード＋CSV/GPX の SHA-256 一致 |
| saveStore | 61 | 0 | — | 保存→別インスタンス再読込の往復、破損・混在型・欠落ファイルのフォールバック、パス差し替え |
| saveStore.bridge | 113 | 0 | — | bridge でレッスン a1 を abort→finish した記録・進捗をファイル経由で復元し、復元先でフリー飛行 finish を続行して再保存 |

## 2. 成果物

### src/recorder.gd（363行、class CadetRecorder）— recorder.js（121行）の全移植

- 静的: `snapshot(s, t)` / `sample_at(rec, t)` / `duration(rec)` / `pose_at(rec, t)` / `to_csv(rec)` / `to_gpx(rec, to_lat_lon)`、`REC_HZ = 10`。
- `createRecorder()` 相当はクラス自体: `start(meta)` / `push(s, t)`（10 Hz へ自動間引き）/ `mark(s, t)`（接地・墜落の強制スナップ）/ `done()` / `recording()` / `current()` / `last_rec()`（JS の `last()`）/ `clear()`。
- CSV は JS の `toFixed`・`Math.round`（= floorf(x+0.5)）を再現して書式まで一致。GPX は XML エスケープ（& → < の順）、`meta.startISO` の解釈（Z・±hh:mm オフセット・小数秒）と `new Date(...).toISOString()` の UTC ミリ秒書式（小数 ms は切り捨て）を再現。緯度経度変換は原典どおり呼び出し側の Callable（テストでは main.js の SORA_GEO 35°N 140°E 変換を使用）。

### src/save_store.gd（134行、class CadetSaveStore）— 永続化層

- store Dictionary（キー→JSON文字列、school / career_instance と同形式）を 1 つの JSON オブジェクトとして `user://cadet_save.json`（既定）へ保存/読込。値の文字列はバイト単位で不変に保たれる（往復テストで完全一致を確認）。
- API: `save(store) -> bool` / `load_store() -> Dictionary`（別名 `load_data()`、`restore()`）/ `exists() -> bool` / `restore_into(store) -> bool`（起動時復元：対象 Dictionary をその場で置き換え、有効なファイルがあった時だけ true）/ `erase_file() -> bool`。
- パスはコンストラクタ引数・`path` メンバで差し替え可能。テストは `user://cadet_save_test3b*.json`（実セーブとは別名）と `/tmp/...` の絶対パスだけを使い、終了時に全て削除した（実セーブ `cadet_save.json` は生成すらしていない）。
- 破損時のフォールバックは原典寄り: career.js の `read()` は try/catch で null（＝新規開始）、school の load 系は読めないエントリを空/整形済みに倒す。本層も、ファイル欠落・読込不能・JSON 破損・非オブジェクトJSON はすべて「空の store」を返し、例外なし。オブジェクト内でも文字列でない値は落とし、文字列エントリだけが生き残る（store の契約がキー→文字列のため）。
- 非文字列値を save した場合は JSON 文字列化を 1 回だけ行い、ファイル形式（キー→文字列）を維持する。

### 検証ファイル

- tools/gen_reference3b.mjs — 原典 recorder.js + analysis.js + flight-lab physics.js を Node で実行し test/reference3b.json（687 KB）を生成。
- test/run_save.gd — 上表の全グループ。実行時間は約70秒（大半が flown の 120 Hz 物理 300 秒分）。

## 3. 実際に飛ばした採取列（flown）

- Phase 1（gen_reference1.mjs）のボット操縦則を GDScript に逐語移植し、離陸→上昇→水平→90°旋回→降下→着陸を 120 Hz で飛行。フレーム毎に `push(s, s.t)` し、接地（rollout 遷移時）に `mark()` を 1 回。
- 結果: 飛行 238.9 秒、サンプル 2,391 件（10 Hz 間引き＋mark）、墜落なし、endPhase は JS と同じ `rollout`。
- **着陸レコード**: 採取サンプルを移植済み analysis（`CadetAnalysis.analyze_recording`, vref 65）に通した結果が JS 側と一致（着陸 1 件、500 ft ゲート、マニューバ 3 件を含む解析全体を照合）。
- CSV（196,949 バイト）・GPX（253,662 バイト）は SHA-256 ハッシュまで一致。

## 4. 正直な申告（未完・先送り・原典の癖）

1. **原典の癖を忠実に残した**: `snapshot` の `h` は JS で `s.pos.y` を読むが、物理状態の pos は配列 `[east, up, south]` で `.y` が無いため、**実飛行サンプルでは h は常に 0** になる（高度は `alt` 側で運ばれるので解析に影響なし）。辞書型 `{y: ...}` や Vector3 の pos では y を拾う。直すかどうかは原典側の判断待ち。
2. **シーンへの配線は未実施**: 本系統の所有ファイル外（scenes/main.gd、src/flight_bridge.gd）のため、`CadetSaveStore` を起動時に呼ぶ配線と、飛行中の recorder 駆動（fly-mode 相当）はまだ無い。部品と往復テストは揃っており、統合側は `CadetSaveStore.new().restore_into(store)` を bridge 生成前に、`save(store)` を finish 後に呼ぶだけで済む形にしてある。
3. **メソッド名**: 要求の `load()` は Godot 組み込みの `load()` と同名になるため避け、`load_store()` / `load_data()` / `restore()` とした。
4. **保存は直接書き**（一時ファイル＋rename の原子的書き込みではない）。書き込み中の強制終了でファイルが壊れても、次回起動は §2 のフォールバックで新規開始に倒れる（データは失われる）。
5. GPX の時刻: タイムゾーン無しの ISO 文字列は UTC として解釈した（JS の `Date.parse` はローカル時刻解釈だが、原典が書くのは `toISOString()` の Z 形式のみで実害なし）。`to_csv(null)` は JS では例外になる所をヘッダのみ返す防御動作にした。
6. **終了コードの注意**: run_save.gd は全緑を印字した後、プロセス終了時に `corrupted size vs. prev_size in fastbins`（exit 134）で落ちる。**これは本系統の回帰ではない**: 無変更の Phase 2 スイート test/run_bridge.gd でも同一の終了時クラッシュを再現し、test/run_tests.gd（Phase 0）は正常終了（exit 0）する。bridge/school 系を読み込んだセッションの teardown 側の問題と見られ、判定は印字されたチェック結果（失敗 0）で行った。併せて、破損 JSON を読むテストでは Godot の `JSON.parse_string` が ERROR 行を標準出力に出す（戻り値は null で処理は正常）。
7. 新規スクリプト 2 本の `.uid` サイドカーは `godot --headless --import` で生成したもの（class_name 登録に必要）。それ以外に既存ファイルは変更していない。
