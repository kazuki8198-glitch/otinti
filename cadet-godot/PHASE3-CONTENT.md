# CADET Godot 移植 — Phase 3 一系統レポート断片（コンテンツデータ移送＋会話エンジン＋ATC dayRadio）

- 日付: 2026-11-01
- 移植元: `~/workspace/cadet-wt-next` @ 898fe8a（読み取り専用・無変更、GitHub push なし）
- 作業場所: `~/workspace/cadet-godot/` のみ。本系統の所有ファイル以外は編集していない
  （src/syllabus.gd / src/school.gd / scenes/main.gd / src/flight_bridge.gd は未接触）。
- 方式は既存踏襲: Node で原典 JS からデータ抽出＋参照値生成 → Godot ヘッドレスランナーで照合。

## 1. 結果サマリー

**同値テスト（test/run_content.gd）: 8,906 チェック / 失敗 0 / 最大誤差 0.0（全項目が文字列・構造の完全一致）**

| グループ | チェック | 失敗 | 内容 |
|---|---:|---:|---|
| content | 572 | 0 | data/content.json の抽出検証（下記 §2）。exams は既存 src/career.gd の EXAMS 定数とも全照合 |
| dialogUnit | 250 | 0 | engine.js の getPath（移植名 resolve_path）/ fill / evalCond（エラー系 8 件含む）/ 状態浄化 / applyEffects（エラー系 6 件含む）/ resolveTarget |
| dialogTranscript | 2,566 | 0 | 実ダイアログ 21 シナリオの全ステップ照合（view・state・フック列・running・戻り値） |
| radio | 5,518 | 0 | dayRadio 12 ケース（全 exchange を A2/A3 解決込みで完全比較）＋ ctafRadio 全体＋ ourCall 10 件＋ spoken 4 件 |

実行: `node tools/gen_content.mjs` → `godot --headless --path . -s test/run_content.gd`（終了コード 0）。
回帰: test/run_bridge.gd は従来どおり 12/12 緑（本系統は新規ファイル追加のみ）。

## 2. データ抽出（tools/gen_content.mjs → data/content.json、250,829 バイト）

Node で原典モジュールを実際に評価して抽出した。内訳:

| 対象 | 抽出内容 |
|---|---|
| people.js | PEOPLE（10 名、後付けの examiner 込み）・PEERS・PLACES（配置表 AT） |
| checklists-archer / -seminole | CHECKLISTS 全 6 リスト。項目は [名前, 設定, test, 対象, 注, set] の 6 要素を保持し、関数 2 枠は `{__fn: ソース}` 化（§4-1） |
| walkaround-archer（18 点）/ -seminole | WALK_ORDER・POINTS・TASK_MISSED・ANOMALIES（純データ、そのまま） |
| lecture-summaries.js | SUMMARIES（14 節） |
| answer-map.js | BANK / EVENT / SCENE / DRILL / LISTEN / PFD / NOTE_ANSWERS の 7 表 |
| academy-spec.js | academySpec(FL) の戻り値全体（部屋 20・ドア 22・interactables 31）。FL は gen_reference2b と同じ組み立て（physics/avionics/school/syllabus）で実物を使用 |
| dorm-spec.js | dormSpec() の戻り値全体（部屋 11） |
| tower-spec.js | towerSpec() の戻り値全体（部屋 3・cabFloors・controller 位置。world/layout.js の TOWER/towerStairs を Node 側で実評価） |
| hangar-spec.js | hangarSpec() の戻り値全体（エリア 2） |
| usable.js | COFFEE_TIRE・TOWER_COMM_BASE・TOWER_VISIT・USABLE・NOTICES（10 件）・各カード 4 件（データ部） |
| book.js | REAL_NAMES のみ（`{__re: ソース, __flags: "i"}`、§4-3） |
| flight-lab/src/quiz.js | 問題バンク 14 件・全 205 問（[問題, 選択肢, 正解 index, 理由]） |
| career/career.js | EXAMS 定義（7 試験） |
| dialog/day1.js・intro.js | PHASE_LINES・ASSIST_LINES・SOLO_LINES・EVENT_LINES・dayDialogs()・apronDialogs()・introAirDialogs() の戻り値（会話データそのもの）・INTRO_AIR / _EN・INTRO_HUD・INTRO_CARDS・INTRO_SAMPLE ほか |

## 3. 移植したモジュール

| 原典 (JS) | 行数 | 移植先 (GDScript) | 行数 | 内容 |
|---|---:|---|---:|---|
| cadet/src/dialog/engine.js | 262 | src/dialog_engine.gd（CadetDialogEngine＋内包 Runner） | 552 | getPath（§4-4）・fill（{経路} 置換）・状態浄化・evalCond 全 7 種・applyEffects 全 4 種・resolveTarget・settle（if スキップ、上限 64）・start/next/choose/press・view（ends 判定込み）・onChange |
| cadet/src/content/dialog/atc.js | 253 | src/day_radio.gd（CadetDayRadio） | 306 | CALL/CALLS/set_call・FREQ・ourCall・spoken・dayRadio 全 17 exchange（twr_exit/gnd_in は原典どおり引数 Callable）・ctafRadio 全 5 exchange・CTAF 定数 |

検証の中身:
- **dialog**: トランスクリプトは原典エンジンを Node 側で実際に駆動して生成。対象は dayDialogs の transit（skip/fly/範囲外選択）・fault→fault2 の連鎖・apron（ノード id にコロンを含む 'hi:2'/'hi:3'）と introAirDialogs の intro（prologue_short フラグでの分岐含む）・introB/C/D（ctx の level/turn/labSide/watch/toward 各変種）・introTake・introEnd→introD へのダイアログ跨ぎ遷移・ctx を関数で渡すケース・途中 stop。全ステップで view・state・フック列（look/nod/point/go/intro）・running・戻り値を照合。
- **dayRadio**: 入力は career.weatherFor（シード 1/7/42/3/5/9 × 日）から day.js と同じ渡し方で作った 6 ケース＋手作り 6 ケース（IFR・静穏・風向 0・runway 18・qnh 29.99 の swapped 境界・全デフォルト）。pa28/pa44 両コールサイン。ATIS 文字列・全 exchange・sequences・weather・call・freq を完全比較。twr_exit/gnd_in は 'A2'/'A3' 両方で解決して比較。

## 4. 正直な申告（JSON 化できなかったもの・未完・注意）

1. **チェックリストの test/set 関数は JSON 化できない**ため、データとしての値ではなく `{__fn: 関数ソース文字列}` として保持した（欠落させてはいないが、GDScript 側で実行できる形ではない）。チェックリストの判定・実行の移植は別系統の仕事。
2. **lecture-units.js はデータ部を持たない**（units / lectureUnits / proseOf / leadText はすべて関数で、入力は実行時の教科書 HTML）。よって content.json には入れていない。同様に **people.js の placeOf**（配置を計算する関数）は未抽出（配置表 PLACES そのものは抽出済み）。
3. **book.js は REAL_NAMES のみ抽出**。plain / sentences は関数、gameBook(FL) は FL.book 全文に依存し戻り値にも関数（section 等）を含むため、純データとして切り出せない。なお plain / sentences の入出力サンプルと usable の純関数（shelfSection / dailyNotices / usableKind）の JS 出力は reference_content.json の expect に記録だけしてある（GDScript 移植は本系統の担当外で、未移植）。
4. **EVENT_LINES の stopped / walkFound**（引数付き関数）と **INTRO_RIGHT の正規表現**も同様に `{__fn}` / `{__re}` マーカーで保持。
5. **engine の例外**: JS は不正データで throw する。GDScript には例外がないため、移植は `last_error`（静的）/ `Runner.error` にメッセージを残し、原典の step() と同じく会話を閉じてから報告する形にした。単体テストでは「throw すること自体」をその記録で照合している（evalCond 8 件・applyEffects 6 件）。
6. **Runner.press（keys）**: 実装はしたが、day1/intro の実データには `keys` を持つノードが存在しないため、トランスクリプトでの実データ照合はない（API のみの移植）。
7. **getPath の移植名は resolve_path**。GDScript の Resource.get_path() と衝突するため改名した（中身は原典どおり）。
8. dayRadio の入力 weather に career の kind/metar 等が混ざっていても原典は無視する（名前付きフィールドのみ読む）。参照ケースもその渡し方を再現している。なおケース名 'career-s3d20-rwy18' は force 指定なしの career 天気＋runway 18 指定である（南風固定ではない）。
9. content グループの照合は「全セクションの構造スポット＋主要セクションの全量」方式で、academy/dorm/tower の furniture 座標まで含む全量バイト照合はしていない（部屋 id 列・件数・start/route 等の代表値は照合済み）。quiz は各バンクの件数・タイトル・先頭問のみ全量、残りは件数照合。

## 5. 成果物一覧

- 新規: tools/gen_content.mjs、data/content.json、src/dialog_engine.gd、src/day_radio.gd、test/run_content.gd、test/reference_content.json、本断片 PHASE3-CONTENT.md
- 既存ファイルの変更: なし（新規追加のみ）
