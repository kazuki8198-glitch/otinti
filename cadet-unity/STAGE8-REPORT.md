# STAGE 8 REPORT — 会話エンジン＋UI（2026-11-02）

対象: 優先順位 3（会話エンジン＋UI: dialog/engine.js 相当と会話画面、全会話データの到達可能性検証）。
正本は `~/workspace/cadet-wt-free` @93441f6（= growth/free-mode、wave-2 統合＋フリーモード＋寮修正）。

## 1. エンジン移植（JS 同値で証明）

- `core/src/CadetDialog.cs` — dialog/engine.js の逐語移植（DialogEngine: GetPath / Fill
  （`{dot.path}`・`{func:name}`・`{{` エスケープ、未解決は空文字＋ console 警告相当）/ EvalCond
  （落下カスケード・`!` 反転・未知演算子は false+警告）/ ApplyEffects（:+=: :min: :max: 付き）/
  ResolveTarget（即時／分岐／ランダム（サイクル回避付き））/ CreateDialogState（SAVE_VERSION=1）
  / TrustOf（TRUST_START=50）＋ DialogRunner（MAX_HOPS=64、CHOICES_MAX=12、hooks: exprFlags /
  scoreChoices＝ deployments の ON_EXISTS / ON_SCORE 分岐、keys マージ））。データは JS 値
  （MiniJson の Dict/Lst/number/string/bool/null）のまま扱い、変換ロスを避けた。
- `core/src/CadetDialogValidate.cs` — dialog/validate.js の逐語移植（参照チェック、到達可能性
  BFS、次点リング＝skip 構造の検出、未読フラグ警告、choices 検証まで）。
- Fill の正規表現は `RegexOptions.ECMAScript`（JS の `\w`＝ASCII を再現）。
- データ抽出 `tools/extract-dialog.mjs` → `data/dialog-extra.json`（35 MB）:
  instructorDialogs の 55 課目×（初回＋repeat）未結合版と、main.js の instructorData() と
  同じ結合版（instructor＋career の深いコピーの merge）、sampleCtx（FL）、教科書 113 節・
  課目 id の一覧。注意: FL ロード順は **book-figs.js を book-1..5 より前**（book 本体は
  ロード時に FIG を捕捉する）。

## 2. ゴールデン検証（検証の正は JS 原典）

- `tools/golden-dialog.mjs` → `flight/test/golden-dialog.jsonl`（180 セット、各セット:
  validator の error/warning リスト＋決定論的歩行（選択肢は (訪問回数−1) mod 個数）＋
  seen/trust/flags の最終状態）。
- C# ハーネス `flight/test/BotDialogCs.cs` が同じドライバロジックをエンジン＋validator に
  通し、**180/180 セット・歩行 73,234 行が完全一致**。
- 検証 landscape（JS validator 自身の結果、そのまま記録）:
  - instructor 55 課目 ×2 = 110 セット: **エラー 0・警告 0**（ゲーム自身の基準で健全）
  - 固定ツリー 17 セット: trees/career は単独で 39 エラー（`ask:root` 等が instructor 側に
    ある跨ぎ参照で、結合時に解決する設計）、trees/people は警告 5（他ツリーで読まれる
    フラグの未読警告 — 忠実な記録であって欠陥ではない）
  - 結合版 merged/* は各 27 エラー: 全て `{miss.*}` / `{tem.*}` の placeholder が
    sampleCtx で解決できない件。main.js がプレイ日ごとに作る実行時 ctx であり、
    データ欠陥ではない（塔・ガイド系の定型文）。

## 3. 会話 UI（Unity 実機で通し確認）

- `unity/DialogMain.cs` — uGUI 会話画面（画面下部パネル: 話者名＝話者色、本文（計測
  ベースの折り返し）、選択肢ボタン、keys ヒント、クリック / E / Space で進行）。
  LoadPeople() は streaming の people ツリー＋SAMPLE_CTX を読み込む。
- `unity/DialogDriver.cs` / `unity/DialogAcceptance.cs` — 受け入れ: people の全 9 会話
  （chief / dispatcher / mechanic / controller / kiryu / asahi / mori / lecturer /
  examiner）を実 UI クリックで最後まで通し、**最終状態が JS ゴールデンと完全一致**
  （flags = met_asahi/met_controller/met_kiryu/met_mechanic/met_mori、seen=17、
  dispatcher 信頼 52、表示ビュー 17）→ **RESULT PASS**。
- スクリーンショット: `stage8-line.png`（真壁 主任教官・色 #ffb35c、本文全行表示）、
  `stage8-choice.png`（佐伯さん wx2 の 4 択、全て正しい日本語）。

## 4. テキスト描画で踏んだ Unity 6000.3 の実測事実（重要）

日本語テキスト表示で 2 つの独立した罠を確認し、両方とも回避策を実装した。

1. **uGUI Text × 動的フォント**: Font アトラスの再構築で既存 Text メッシュの UV が
   無効化され、グリフが静かに消える（名前・ヒント・本文 2 行目が描画されなかった）。
   textureRebuilt での SetAllDirty でも回復しなかったため、会話画面のテキストは
   uGUI Text をやめ、実績のある `RasterCanvas`（737 グラスと同一経路）でテクスチャ
   描画に切り替えた。
2. **RasterCanvas のグリフサンプリング**: Noto Sans CJK の大きいグリフはアトラス内
   に **90° 回転して格納**される（CharacterInfo の UV 四隅に回転が符号化される:
   実測 壁@100px で uvBottomLeft=(0, 0.38)、uvTopLeft=(0.36, 0.38) — u 軸がグリフの
   縦方向）。軸平行前提のサンプラでは「似た字形」に化けた。四隅からの双線形
   マッピングに一般化し、Latin（737 グラス、受け入れ再実行 PASS）と CJK の両方が
   正しく描画されることを確認した。併せて sans フォントの第一候補を Noto Sans
   CJK JP に変更し、Font.textureRebuilt でアトラスピクセルのキャッシュを無効化
   するようにした。なお `CharacterInfo.size` は Vector2 ではなく int。

## 5. 範囲外として残るもの

- 会話画面と 3D 世界（歩行）との接続（近づいて話しかける）は Stage 9（内装・歩行）
  で扱う。本ステージは会話エンジン＋画面そのものの等価性と通し動作まで。
- instructor 会話の UI 結線はキャリア画面側の仕事（Stage 10/12）で、エンジンと
  データは本ステージで検証済み。
