# STAGE 10 レポート — フリーモード画面＋FO ライン画面（優先順 6・7）

正本: `~/workspace/cadet-wt-free` @93441f6（現行デフォルト f74ab60 相当）。

## 1. ロジック移植（JS 同値検証つき）

### CadetFreeMode.cs（content/free-mode.js 逐語移植）
- 定数表（FREE_AIRCRAFT 4 / FREE_STARTS 6 / FREE_HOURS 7 / FREE_WIND_OPTS＋MAP / FREE_LOAD_OPTS＋MAP / FREE_FAIL_OPTS 14）、`BuildFreeCfg`（seed は呼び出し側の now ms を渡す形に分離——JS は Date.now() 直読み）、`SimDeviceCfg`。
- ゴールデン: `tools/extract-line.mjs` が全選択肢の組合せ **45 件**（機体×開始 24、風 5、故障 14、simDevice 2）を Date.now 固定で JS 実行し、`BotLineCs` が深比較 → **45/45 一致**。

### CadetLine.cs（flight/line.js 約600行 逐語移植）
- データは `tools/extract-line.mjs` で `data/line.json` へ抽出（ROUTES 4 / CAPTAINS 3 / DISPATCH_CASES 8 / PM_TASK_TEMPLATES 10）、飛行場は既存 `data/airfields.json` の LINE_AIRFIELDS を使用。
- 移植上の要点: mulberry32 rng を uint32 演算で再現（Math.imul 相当含む）、`toLocaleString('ja-JP')` の桁区切り、`snap.x || 既定値` の falsy セマンティクス（0 も既定値に落ちる——vs-read で実差分が出て修正）、resolveCaptain/resolveRoute の全分岐（STRICT_WORDS、名前一致、未知の文字列は標準機長の名前差し替え）、choiceIndex（数値/文字/テキスト/オブジェクト）。
- ゴールデン: `tools/golden-line.mjs`（ドライバは原典 test/line.test.mjs の flyPF を複製＋PM ride を新作）。シナリオ 9 本（イベント有/無、正しいノーゴー、ダイバート＋飛行場フレーム接地、イベント未回答時の compress 拒否、CTS×柏木（オブジェクト指定）、PM ride×2（数値機長 0.9 含む））＋ lineBrief 4 路線を、発生イベント列（ディスパッチ/イベント/PMタスクの中身まで）＋ summary 全体で深比較 → **BotLineCs: 55/55 通過**（9 シナリオ＋briefs＋フリーモード 45 件）。

## 2. Unity 画面

- `unity/FreeModeMain.cs`: CadetFreeMode の表からそのまま構築する設定画面（機体/開始状態/時刻/風＋カスタム方位・風速ステッパ/搭載/故障サイクルボタン/故障時期＋値ステッパ）。開始で cfg を構築し CockpitMain セッションへ適用：ramp=コールド＆ダーク、それ以外は SetRunning、空中開始（area 3,000 ft / pattern 1,000 / final 1,200 / ils 2,000）は高度・速度・ギアアップまで設定。風は滑走路方位 264° 基準の相対角を cfg 通りに変換、搭載は Sim.ApplyLoading に cfg の loading をそのまま渡す。故障は cfg の fail/failAt を「計画」として保持（注入はフライト側スケジューラの責務——下記「残り」参照）。
- `unity/LineMain.cs`: 区間×PF/PM×機長×シードの選択画面 → ブリーフィング表示 → ディスパッチ判断（選択肢ボタン）→ PF は観測プロファイル駆動で離陸〜巡航（圧縮ボタン）〜降下〜接地、PM は ride 更新＋モニタータスク/イベントへの回答 → デブリーフ（summary の rows/総合/評価を表示）→ `Career.RecordLeg` でキャリアへ記録（セクター/ブロック/疲労+26/能力成長はキャリア側の実装通り）。
- UI テキストは Stage 8 の教訓に従い RasterCanvas テクスチャ描画（`CadetUiTex`）。

## 3. Unity 受け入れ（FreeLineAcceptance / FreeLineDriver）— RESULT PASS（18/18）

- フリー: 選択（b737・area・21時・カスタム風 45°/12kt・heavy・ピトー故障@5,000ft）→ cfg の全項目が期待値通り、セッションは 737・運転中・3,000 ft 空中（posY 931.2）・ギアアップ。**キャリア状態の JSON スナップショットが前後で完全一致**（2 セッション分）。ramp 開始は pa28 コールド＆ダーク。
- ライン: 画面 API 経由で PF 勤務（HND-KMQ、桜井、seed 1）をデブリーフまで通し、**summary の total=83 / landingScore が JS ゴールデンの同一シナリオと一致**。RecordLeg で sectors 1 / blockMin 65 / 疲労 +26 を確認。PM 勤務もデブリーフ完走、タスク 5/5。
- スクショ: `stage10-free-session.png`（フリーセッション開始直後のコックピット視点——グレアシールド越しの外景。パネル画面そのものの画素証跡は Stage 7 の 737 グラスで担保済みで、本画面（uGUI オーバーレイ）は状態検証で担保）。

## 4. 残り・正直な限界

- フリーセッションの**故障注入の実働結線**（fail/failAt を飛行中セッションの systems 故障スケジューラへ渡す部分）は未結線。cfg と計画の保持までが本段階の到達点。原典でも注入は fly-mode 側の責務。
- ライン画面の PF 飛行は**実フライトではなく観測プロファイル駆動**（原典のテストと同じ入力列）。737 を実際に飛ばして duty へ観測を流す結線は Stage 12 の画面統合で行う。
- Slice シーンには過去ステージのドライバ（Boeing/Dialog/Walk）が残留し、再生時に DonePath 未設定の例外ログ（Invalid path）を出す。本段階の受け入れ結果には影響しないが、Stage 12 のシーン整理で除去する。
- 受け入れ実行中に判明した前提ミス 2 件は受け入れ側を修正して再検証済み（キャリア初期疲労は 0 でなく 20／MiniJson.Num は (obj, key) 形のみ——後者は移植コード側の単一引数呼び出しを全て是正）。
