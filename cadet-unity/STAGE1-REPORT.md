# CADET Unity 本移植 — STAGE 1 レポート（コア）

実施: 2026-11-02 / 正本: `~/workspace/cadet-wt-all`（読取専用）/ 成果物: `~/workspace/cadet-unity/core/`（同期先: `/opt/cadet/CadetSlice/Assets/Scripts/Core/` + `Assets/StreamingAssets/cadet-data/`）

## 1. データ変換パイプライン（完了）

`tools/convert-data.mjs`（node:vm で FL グローバルモジュールを読み、ES モジュールのファクトリを呼んで JSON 化。関数は `{__fn, src}` マーカーとして原文を保持し、無言の欠落を防ぐ）。

- 出力: **50 ファイル / 1.5 MB**（`data/`、失敗 0）
- 試験バンク: **17 バンク / 235 問**（q_aero 10, q_sys 10, q_perf 10, q_wx 20, q_law 10, q_comm 10, q_radio 15, q_hf 20, q_ops 10, q_emg 20, q_nav 20, q_ifr 20, q_me 20, q_crm 10, q_jet 10, q_jperf 10, q_jsys 10）
- レッスン定義: **55 課目**（k1–k6, a1–a8, t1–t4, e1–e4, c1, x1–x3, n1–n3, i1–i8, m1–m5, e6, r1, cx1–cx3, cf1–cf3, j1–j5）
- 教科書: **27 章 / 120 節**、講義ノート 44,562 B、会話ツリー 98,751 B / **1,847 オブジェクト**、人物 10 名、学園スペック 752 オブジェクト（寮 238・管制塔 89・格納庫 28）
- 関数マーカー数 = 手移植インベントリ: syllabus 471、チェックリスト archer 74 / seminole 78 / jet 122、class-talk 156、tem 18

## 2. C# コア移植（完了、同値テスト合格）

`core/src/`（計 1,914 行、UnityEngine 非依存の純 C#。状態は MiniJson オブジェクトグラフで保持し JS とダイジェスト比較可能に）:

| ファイル | 内容 |
|---|---|
| `MiniJson.cs` | 依存なし JSON パーサ/ライタ（JS の JSON.stringify 互換の数値表記） |
| `CadetCareer.cs` | career.js 全移植：章立て/予定表（schedule）/天候（METAR・TAF 文字列生成・rng 描画順まで一致）/成長 4 軸（逓減・反復係数）/試験/疲労/信頼ゲート/卒業評価/FO ロスター・ラインチェック/cleanCareer（セーブ洗浄・v1 受理） |
| `CadetTem.cs` | tem.js 全移植：THREATS 14 件（when 述語は C# ラムダ）+ 英訳、temFor（CB 上書き含む）、errorsOf / errorsOfEn |
| `CadetGuide.cs` | guide.js 全移植：nextStep 全分岐 + 学園ドアグラフ BFS ルーター |

### 同値テスト（JS 参照実装 vs C#、数値許容 1e-9・文字列完全一致）

| スイート | 内容 | 結果 |
|---|---|---|
| bot 1 `core/test/bot-js.mjs` ↔ `BotCs.cs` | シード 2 本 × 全キャリア通し（序章→座学/FTD→ソロ→XC→IR→双発→最終→卒業→複雑機/CFI→型式→FO ライン運航→ラインチェック合格）。毎日、状態・予定表・ゲート（信頼 62/40）・天候・飛行天候・上空風・missAsk・全課目記録を比較 | **1,299 / 1,299 行一致、不一致 0** |
| bot 2 `bot2-js.mjs` ↔ `Bot2Cs.cs` | temFor 全組合せ 15,360 件（天候 10 × 疲労 4 × 審査/単独 × 機種 × 章 × 交通 × CB × 日付）、errorsOf/En、guide 25 シナリオ、学園全室ペアのルーター | **15,391 / 15,391 行一致、不一致 0** |
| bot 3 `bot3-js.mjs` ↔ `Bot3Cs.cs` | v:2 の汚れたセーブ洗浄（実際にロードされる経路）、章別天候プローブ、FO 休養日（疲労 65 境界）、ラインチェック落第後の +4 セクター規則、v:1 セーブ受理 | **11 / 11 行一致、不一致 0** |

bot 3 で実バグ 1 件を検出・修正: スケジュール側の FO 休養アイテムに `reason: 'rest'` が欠落していた（CareerSchedule.Fo2Of）。修正後に全スイート再緑。

### Unity エディタ編でのコンパイル

- コア 4 ファイル + データ 50 件を `/opt/cadet/CadetSlice` へ同期し、エディタ（6000.3.27f2、HOME=ライセンスホーム写し、DISPLAY=:99）でバッチ起動: **CS エラー 0**、アセンブリ再読込成功。

## 3. Stage 1 で未実施・次段階へ送るもの（理由つき）

- **day.js（日次ループの計画構築 planFor）**: 予定表そのもの（schedule）は移植・検証済み。day.js は「予定表＋対話状態→その日の計画」への UI 接着層のため、Stage 2 のデイループ実装と一体で移植する。
- **セーブ封筒 `cadet.save`（save.js）**: キャリア分（`cadet.career` キー、バージョン/移行）は移植済み。封筒全体（設定・FLIGHT LAB 進捗との束ね）は Stage 2/5 のシェル実装で扱う。
- **§14 外部ブランチ差分**: 正本ツリー外の 4 ブランチ（zagaku-choice の classPace、sim-room、ana-triage、ai-instructors）はチェックリスト §14 に記録済み。並行作業で wave-2 統合ツリー（`~/workspace/cadet-wt-wave2`, HEAD 9ff06a2）が新たに成立したため、最終照合（Stage 5）ではこのツリーを差分正本として再変換・再照合する（本ステージの正本は指示どおり cadet-wt-all）。

## 4. チェックリスト対応（Stage 1 分）

- §1 セーブ/ロード（キャリア部分）: ✅ 同値テスト済み（洗浄・移行含む）
- §4 章立て・日次予定・成長 4 軸・疲労/IMSAFE の数値規則・信頼ゲート・筆記試験の台帳（EXAMS/合否記録）・審査台帳・卒業評価・FO 規則（§5 のキャリア側規則: ロスター/疲労規則/ラインチェック境界）: ✅ 全て bot 1/3 で JS 一致
- §7 座学コンテンツ・§8 人物データ等のデータ変換: ✅ §1 のパイプラインで完了（駆動は Stage 2/3）
