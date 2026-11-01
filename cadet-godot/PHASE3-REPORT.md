# CADET Godot 移植 — Phase 3 レポート（内容の全移植＝HTML版との同等到達）

- 日付: 2026-11-01
- 移植元: `~/workspace/cadet-wt-next` @ 898fe8a（読み取り専用・無変更、GitHub push なし）
- 作業場所: `~/workspace/cadet-godot/`、Godot 4.7.2.stable.official
- 仕様: `~/workspace/your_files/cadet-native-migration-plan-v1.md` §5 Phase 3（優先順 1→7）
- 前段: PHASE0-REPORT.md / PHASE1-REPORT.md / PHASE2-REPORT.md
- 系統別レポート: PHASE3-CONTENT.md（項目2）/ PHASE3-SAVE.md（項目3）/ PHASE3-WORLD.md（項目5・6）

## 1. 結果サマリー

**同値テスト総計 156,250 チェック / 失敗 0**（Phase 0–2 の 42,480 を回帰として全て維持し、
Phase 3 で 113,770 チェックを追加）。方式は従来どおり Node で原典 JS から参照値を生成し、
Godot ヘッドレスランナーで照合（終了コードで合否）。

| スイート | チェック | 失敗 | 最大誤差 | 内容 |
|---|---:|---:|---:|---|
| run_tests.gd (Phase 0) | 1,904 | 0 | 4.4e-7 | physics 3機種 |
| run_tests1.gd (Phase 1) | 27,045 | 0 | 5.0e-7 | 純粋ロジック7モジュール |
| run_tests2.gd (Phase 2) | 10,411 | 0 | 5.0e-7 | avionics / AP |
| run_tests2b.gd (Phase 2) | 3,122 | 0 | 7.7e-9 | school / syllabus基盤（§7 の注記あり） |
| run_bridge.gd | 12 | 0 | — | bridge スモーク |
| verify_visual.gd（実描画） | 33 | 0 | — | マテリアル / コックピット / G1000 |
| **run_tests3.gd（項目1）** | **37,287** | **0** | **7.7e-9** | 残り全レッスンの構造＋関数プローブ＋全飛行サブセット |
| **run_content.gd（項目2）** | **8,906** | **0** | **0.0** | content.json 抽出 / dialog engine / dayRadio（文字列・構造の完全一致） |
| **run_save.gd（項目3）** | **57,726** | **0** | **5.4e-4** | recorder 全列＋CSV/GPX ハッシュ / save往復 / bridge連携 |
| **run_world.gd（項目5・6）** | **9,787** | **0** | **5.0e-7** | traffic / world構造 / 機種選択 |
| **run_career.gd（項目4）** | **17** | **0** | — | キャリア通しボット＋AI教官接続口の純粋部 |
| **合計** | **156,250** | **0** | | |

成果物:
- `build/CADET-Phase3.exe`（Windows 書き出し、124,985,672 バイト、未署名）
- スクリーンショット: `build/phase3-cockpit.png`（上昇中 211 ft・G1000 ライブ表示）、
  `build/phase3-seminole.png`（エプロンの Seminole、レジ N452SY 付き）、
  `build/phase3-walk.png`（学園正面の舗装に立つ歩行者カプセル、右端に学園棟と管制塔キャブ）

## 2. 項目1: 残りレッスン全移植

- 新規 `src/syllabus_rest.gd`（818 行）: Phase 2 でメタのみだった飛行レッスン **38 本**
  （a2–a8, t4, e1–e4, c1 / x1–x3, n1–n3 / i1–i8 / m1–m5, e6 / r1 / cx1–cx3, cf1）の
  全ステップ（onStart / until / gradeWhen / check / result / onEnd / atc / tgt / setup）を
  GDScript 化。`syllabus.gd` の STAGES() が実行時にマージし、全 48 本が実行可能に。
  n2 の estimate 系（estimateTruth / submitEstimate / estimateRows）も移植。
- Phase 2 のメタ移植で落ちていた **setup.onStart 2 件を復元**: m5（左発停止＋フェザー＋
  autoRud 切断）、cx3（L.s.prop = 0.625）。const _META には関数を置けないため STAGES() の
  組み立て時に付与する。
- 同値テスト（tools/gen_reference3.mjs → test/run_tests3.gd）:
  - **probes 36,675 件**: 全レッスン全ステップの構造シリアライズ（say の fillText 展開、
    stepGuide、atc 評価、tgt 解決を含む）と、合成 ctx 8 種 × st プリセット 2 種での
    onStart/until/gradeWhen/check/result/onEnd 実行＋状態スナップショット照合。
  - **estimate 43 件**: 真値・行表示・不正入力（JS の `+null = 0` の癖まで再現）。
  - **flights 569 件**: スクリプトパイロットでの全飛行 a2 / e1 / x3 / a7（intro レベル）。
    a2・x3・a7 は両側合格 S。**e1 は JS 側でも GDScript 側でも不合格（C, 0.279）** —
    Phase 2 の t2 と同じく「等価性の証明であって合格可能性の証明ではない」。
- 移植時に踏んだ JS セマンティクスの差異（いずれも原典どおりに再現）:
  m3 の `${L.vmcAt || '—'} kt`、e4 の未実行 check 由来の NaN 伝播（"NaN m" / "NaN°" 表示と
  pass=false）、片発フェイル側の `(seed||7)%2` の向き（m2 のみ逆）。

## 3. 項目2: コンテンツデータ移送＋会話エンジン＋dayRadio（詳細は PHASE3-CONTENT.md）

- `tools/gen_content.mjs` が原典モジュールを Node で実評価して `data/content.json`
  （248 KB）を生成: 人物 10 名・チェックリスト 6 件・周辺確認（Archer 18 点 / Seminole 19 点）・
  講義要約 14 節・answer-map 7 表・academy/dorm/tower/hangar の spec 全量・usable・
  試験バンク **14 バンク 205 問**・試験定義 7 件・会話データ（dayDialogs / apronDialogs /
  intro 系）。
- `src/dialog_engine.gd`（552 行）: dialog/engine.js の全移植（経路解決・fill・条件評価・
  効果適用・Runner）。実ダイアログ 21 シナリオのトランスクリプト 2,566 件が完全一致。
- `src/day_radio.gd`（306 行）: content/dialog/atc.js の dayRadio 全 17 exchange＋
  ctafRadio＋ourCall を接続。5,518 件完全一致（ATIS 文字列含む）。
- JSON 化できないもの（正直な申告、PHASE3-CONTENT.md §4）: チェックリストの test/set 関数は
  `{__fn: ソース文字列}` として保持（データとしては欠落なし、GDScript では未実行）。
  lecture-units と book の本文生成は関数そのものでデータ部を持たないため対象外。

## 4. 項目3: セーブ永続化＋recorder（詳細は PHASE3-SAVE.md）

- `src/save_store.gd`: store Dictionary を `user://cadet_save.json` に保存/読込。
  起動時復元（restore_into）・破損時は空 store に倒れる原典寄りフォールバック。
  scenes/main.gd に配線済み（起動時に復元、レッスン終了時とキャリア操作時に保存）。
- `src/recorder.gd`（363 行）: recorder.js の採取側を全移植。JS 物理を実際に飛ばした
  2,391 サンプルの全列照合、CSV/GPX は SHA-256 一致。

## 5. 項目4: キャリア通し

- `src/career_driver.gd`: シーンとボットで共有する日次駆動層（予定の実行・試験回答・
  飛行記録・成長適用・ソロ/夜間/審査の記帳・就寝と章進行）。
- `scenes/main.gd` に最小キャリア UI を実装: F3 でキャリア開始/次の予定を実行
  （飛行は bridge で実際にレッスンを開始、試験は content.json のバンクから 30 問を
  数字キーで回答、審査は対象レッスンを飛行）、HUD に予定一覧と能力値、終了時に
  デブリーフ（記録のステップ別行）を表示。F4 で徒歩モード切替、F11 で機体切替。
- **ボット証跡（test/run_career.gd）**: 77 日で prologue → ch1 → ch2 → ch3 → ch4 → ch5 →
  ch6 → **卒業** → ch7（endorsement）ゲート全清し。試験 7 件（written1 / presolo / nav /
  instr / multi / final / complex）を実バンクの問題で受験し全合格、飛行 44 件を記帳。
  途中 12 日目に保存→ドライバ再構築（再読込）でも章・日数が保持されることを確認。
- 正直な限定: ボットの飛行 44 件は「合格したレッスン記録」を career API に記帳する
  **進行の証明**であり、全 44 件を物理で飛ばした証明ではない。実飛行の等価性は項目1の
  プローブ 36,675 件＋全飛行サブセットと Phase 2 の 2b flights が担う。シーン側の
  キャリアでも飛行は実際に bridge で飛ぶ（ソロ便は t2 をソロ出撃として流用し、
  合格で solo_done を記帳する近似）。

## 6. 項目5: 世界と徒歩パート（詳細は PHASE3-WORLD.md）

- `src/world_build.gd`（347 行）: 地表テクスチャ（移植元の tex/*.webp 12 枚をコピー使用）、
  飛行場グラス領域、SITE 舗装 10 矩形、農地 30 枚、町並み 12 棟、学園（全 20 室の床）・
  寮（全 11 室）・管制塔（基部/シャフト/キャブ）・格納庫 2 棟を spec 寸法で再構成。
  歩行コントローラ（create_walker / step_walker）付き。main.gd に統合済み（Phase 2 の
  単色地面を置換）。
- NPC: 人物の配置表（PLACES）は content.json に移送済みだが、**シーンへの NPC 配置は
  未実装**（計画の既定値どおりキャラ・クラフトは対象外で、フィギュア配置まで進めていない）。

## 7. 項目6: トラフィックと他機種

- `src/traffic.gd`（325 行）: traffic.js 全移植（場周・プレイヤー反応・go-around・wake）。
  main.gd ではマーカー（箱）で描画している（他機の 3D モデル化は未実施）。
- `src/aircraft_select.gd`: pa28 / pa44 / pa28r のモデル選択。Seminole は seminole.glb
  （16 meshes）で飛行可能。**Arrow は専用 glb が原典資産に無いため Archer 外形を流用**
  （物理・性能は pa28r のもの）。F11 でフリー飛行の機体を切替可能、レッスンは各レッスンの
  指定機体で飛ぶ（m 系 = pa44、cx 系 = pa28r は同値テストで検証済み）。

## 8. 項目7: AI教官と音声

- `src/ai_instructor.gd`: HTTP 接続口のみ。APIキーは `user://cadet_settings.cfg` の
  [ai] api_key から読む方式（キーはコード・成果物に一切含めない）。キー未設定時は
  接続を拒否し、スクリプト会話へのフォールバックを想定。リクエスト payload 構築と
  レスポンス解析は純粋関数として同値テストに含めた（実通信はこの環境では行わない）。
  **会話 UI への接続（教官への自由質問をシーンで送る）は未配線** — 接続口とデータ層まで。
- 音声認識は **設計メモのみ（実装は Phase 4/5）**: 方式は計画どおりローカル whisper.cpp。
  具体的には (1) GDExtension で whisper.cpp をリンクし、16 kHz mono PCM を受けて
  テキスト化する薄いラッパーを置く、(2) モデルは base 以下を同梱（Iris Xe 級・オフライン
  前提）、(3) 既存の復唱チェック（school の atc 照合）へテキストを渡す接続点は
  dialog/dayRadio 側ではなく school 側の入力口に統一する、(4) マイク取得は Godot の
  AudioEffectCapture を使用。Chrome 音声認識への依存はネイティブ版ではこれで置き換わる。

## 9. 未完・正直な申告（まとめ）

1. キャリアボットの飛行は記帳による進行証明（§5）。全レッスンの実飛行合格可能性は
   スクリプトパイロットの限界により証明していない（e1・t2 は JS 原典でも不合格）。
2. 会話（dialog）の **シーン統合は未実施**: エンジンと全データは移植・検証済みだが、
   main.gd の日次会話フローには繋いでいない。dayRadio も同様に、レッスン内 ATC は
   Phase 1/2 の school atc が担い、dayRadio はデータ/ロジック層の接続まで。
3. 地上学科 k1–k6 の対話型ドリル UI（G1000 読み取り・復唱ドリル等）はシーン未実装。
   キャリアでは ftd 項目を note_ground で記帳する。ドリルのデータは content.json にある。
4. NPC のシーン配置なし（§6）。徒歩空間の内装は spec 寸法の基礎まで（家具・内装の
   作り込みと世界の見た目の向上は計画どおり Phase 4 の uplift 領域）。
5. トラフィックの描画は箱マーカー。pa28r の外形は Archer 流用。
6. AI教官は接続口まで（§8）。音声認識は設計メモのみ。
7. run_tests2b の meta 比較は Phase 3 の意図的変更 2 点を許容するよう更新した:
   (a) 未移植だったレッスンの nSteps センチネル (-1) — 構造検証は run_tests3 が担う、
   (b) setup.onStart 2 件の復元。それ以外は従来どおり厳密比較で緑。
8. この VM のヘッドレス実行では、 totals 出力後に glibc の teardown abort
   （"corrupt
...[truncated 572 chars]