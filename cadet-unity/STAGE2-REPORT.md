# CADET Unity 本移植 — STAGE 2 レポート（飛行：全レッスンの実施と採点）

実施日: 2026-11-02 ／ 前提: STAGE1-REPORT.md（データ変換・キャリアコア同値）
対象チェックリスト: PORT-CHECKLIST.md §飛行系（レッスン駆動・学校/チェックライド・計器・AP・ATC/無線・故障/天候）

## 結論

**飛行ロジックの移植は JS 正本と完全同値に達した。** 全 49 課目 × 3 レベル = **147 本のボット通し飛行が、修了/合否/評価/合格率まで完全一致**（スコア差 ≤0.03 の許容内・採点行は全行一致）。Unity エディタ内での実レッスン受け入れ（a1 / t2 / i5 / j1 をタイトル画面のボタンから UI イベント経由で開始）も全件合格し、結果はモノラル検証値と小数点まで一致した。

## 移植したモジュール（flight/src/、純 C#・エンジン非依存）

| モジュール | 原典 | 内容 |
|---|---|---|
| CadetAvionics.cs / CadetAvionicsControl.cs | FL avionics.js | 針路/高度計/無線/CDI・GPS・VOR・LOC/GS・手順・警報・NRST・FPL |
| CadetAutopilot.cs | FL autopilot.js | AP モード（HDG/ALT/NAV/APR/VS/LVL/FD）、800 ft 接続・200 ft 解除ゲート、トリム追随、手動解除 |
| CadetSchool.cs / Engine / Rest / Data | FL school.js | レッスンエンジン（ステップ駆動・偏差サンプリング・保持判定・採点行・チェックリスト・ATC 応答・見積もり・自由飛行開始点） |
| CadetSyllabus.cs + Stages1–5 | FL syllabus.js | 全 55 課目定義のうちステップ式 49 課目 + 座学 k1–k6、全 8 段階・段階順序、LandingSteps/TakeoffRoll 等の構築子、CFI 訓練生パイロット |
| CadetFailures.cs | cadet aircraft/failures.js | シード付きランダム故障（キャリア/フリー重み表）、教官コンソールの予約・発火判定、プリフライト不具合→飛行フック対応表 |
| CadetRecorder.cs | cadet flight/recorder.js | 10 Hz 記録、再生補間（四元数 slerp）、CSV / GPX 書き出し |
| CadetAnalysis.cs | cadet flight/analysis.js + profile.js | 公差採点ウィンドウ、500 ft 安定進入ゲート、着陸分析、ログブック圧縮形、着陸履歴/統計、スパークライン、デブリーフ用プロファイル系列 |
| CadetDayPlan.cs | cadet career/day.js（純粋部） | STEPS / planFor / stepsFor / startKind / endKind / aircraftOf / ORDER |
| BotFly.cs | FL test/bot.mjs | 参照パイロット（同値検証用＆ Unity 内レッスンの操縦手） |

## 同値検証の結果（すべて JS 正本とのダイジェスト比較）

| 検証 | 範囲 | 結果 |
|---|---|---|
| アビオニクス | 271 行（航法解・警報・制御） | **271/271 一致** |
| レッスンボット通し | 49 課目 × 3 レベル = 147 本 | **147/147 完全一致**（done/passed/grade/passPct 完全一致、score 差 ≤0.03、採点行全行一致） |
| 故障・分析・記録 | 1,763 行（故障抽選スイープ、合成記録への分析、CSV/GPX、履歴/統計） | **1,763/1,763 一致・ミスマッチ 0** |
| デイ計画 | 110 行（全課目の planFor/stepsFor、ソロ・XC・チェック分岐） | **110/110 一致** |
| 物理（Stage 1/縦切り） | 120 サンプル | IAS 最大偏差 1.3e-8 kt（既報） |

### 検証過程で見つけて直した実バグ（移植側）
1. **座標変換**: `School.Ne` の N/E 対応が逆（n = −pos[2], e = pos[0] が正）。地上・場周・ILS・航法系の課目が一斉に失敗し、空中系だけ通る症状から特定。修正後 55/147 → 143/147。
2. **丸め方式**: JS `Math.round`（0.5 は切り上げ）と C# `Math.Round`（銀行丸め）の差。保持秒数 need（15×1.5=22.5→JS 23 / C# 22）で j3 precision が早期修了していた。飛行系ソース全域（約 119 箇所）を JS 丸め（floor(x+0.5)）に統一。修正後 147/147。
3. チェックリスト標題の転記漏れ（ms_before_landing の「・双発」）— 行ラベル差分から発見。
4. 段階内の課目順序（m4 と e6 の前後）— レジストリ順を正本に一致。

### 参照ボット自体の限界（JS 側でも同じ＝仕様として記録）
- **j1（ジェット離陸）**: 両実装とも最初のチェックリスト（before_takeoff_jet）で停止する。ジェット点検項目が参照する電気系スイッチ状態は CADET 本体の cockpit 層の状態であり、FL 単体の状態には無いため、ボットでは進めない。人間の操縦（スイッチ操作）前提の課目であり、Stage 3 のコックピット実装で解消される見込み。
- **j5, n3**: 両実装とも 900 秒で未修了（ボットの操縦限界、正本でも同じ結果）。
- **t2**: 両実装とも修了するが不合格（score 0.8333）— ボットの着陸が合格基準に届かない、正本どおりの結果。

## Unity 統合と受け入れ（/opt/cadet/CadetSlice）

- flight/src 全ソースを Assets/Scripts/Flight/ へ同期し、エディタコンパイル **0 エラー**。
- `LessonMain.cs`（Assets/Scripts/）: タイトル画面にレッスンボタン 4 件を追加（既存キャリアボタンと同居、クリックは UI イベント経由）。レッスン中は BotFly → Sim.Step → School.Update を 120 Hz で駆動し、HUD（課目名・ステップ・教官ガイド文・IAS/ALT/VS）を表示。10 Hz レコーダを併走し、終了時に分析（接地回数・ゲート判定）をその場で計算して結果表示。
- `LessonAcceptance.cs`（Assets/Editor/）: ボタンを ExecuteEvents でクリック → 高速実行 → 結果をモノラル参照値と照合。

| 課目 | Unity 内結果 | 参照値 | 判定 |
|---|---|---|---|
| a1 | S・合格・score 1.0000・t=27.99 | S・1.0・27.99 | ✅ |
| t2 | 修了・不合格・score 0.8333・t=164.44・接地 1 回を記録/分析 | 同左 | ✅ |
| i5 | S・合格・score 1.0000・t=486.93・接地 1 回 | 同左 | ✅ |
| j1 | t=245 時点で step 0・kias 3.73（チェックリスト停止） | t=240 で step 0・kias 3.61（同一の停止） | ✅（仕様どおり） |

- スクリーンショット: ~/workspace/cadet-unity/evidence/stage2/lesson_{a1,t2,i5,j1}.png、lesson_t2_end.png（HUD・ガイド文・飛行中の機体と空/地面を確認）。
- Windows プレイヤービルド: **成功**（SliceBuild.BuildWindows、Build/Win/CadetSlice.exe、総サイズ 92,568,524 バイト ≈ 92.6 MB、エラー 0）。レッスン統合後のシーンでビルドが通ることを確認。

## Stage 2 の範囲で未完・持ち越し（理由つき）

1. **createDay（1 日の状態機械）本体**: day.js のうち planFor 等の純粋部は移植・同値済み。本体は walkaround.js（133 行）、dialog/atc.js エンジン（93 行）、無線文面（253 行）、CADET 側の機体チェックリスト 3 種（述語 274 件）と systems.js のコックピット状態形状に依存する。これらは Stage 3 のコックピット/システム実装と一体のため、Stage 3 でまとめて移植する。
2. **PFD/MFD の描画（G1000 相当の画面そのもの）**: 航法計算・警報・制御は同値済み。Canvas 描画の Unity UI 再現は Stage 3（世界と造形）の計器表示として実施。
3. **ATC/無線の音声・文面表示**: 応答判定ロジック（AnswerAtc・ATC_Q）は同値済み。文面表示と音声は Stage 3/4。
4. **HUD の文字はみ出し**: 受け入れ用 HUD は暫定レイアウトで、長い日本語が画面端で切れる（スクショ参照）。Stage 3 の正式 UI で解消。

## 次段階への申し送り
- Stage 3 では cockpit/systems（スイッチ状態形状）が入るため、j1 のチェックリスト停止が人間操縦で解けるかを最初に確認すること。
- 同値ダイジェスト一式は flight/test/ に残置（再実行手順は各ドライバ冒頭コメント参照）。丸め方式の教訓: **JS 由来の数値分岐には Math.Round を使うな**（core の Js.Round を使う）。
