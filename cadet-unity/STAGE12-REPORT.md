# STAGE 12 レポート — 統合・画面通し・ビルド・GitHub 配置

実施日: 2026-11-02（Stage 6〜11 の継続）

## 1. 統合シーン「Game」

- `unity/GameSceneSetup.cs`（Editor）: Game.unity を生成。構成 = MainCamera + Slice（タイトル＋飛行ループ、LessonMain 併置）+ Cockpit + FreeMode/Line/AiAsk/Walk（初期 inactive）+ Dialog + Sfx + Devices + Game ハブ。
- `unity/GameMain.cs`: SliceMain のタイトルパネルにハブボタン4つ（フリーモード設定／ライン運航／AI教官に質問／歩行）を追加。各画面を1つずつ開閉し「タイトルへ戻る」で復帰。歩行は WalkMain 起動、他は SetActive 切替。

## 2. コールドブート画面通し（GameAcceptance / GameDriver）— RESULT PASS（12/12）

1. ブート→タイトル表示（キャリア/フリーボタン実在）
2. キャリアボタンの実クリック（イベント経由）でセッション開始
3. 仮想キー入力（駐機ブレーキ解除→スロットル→IAS 55kt で引上げ、ピッチ約11°）で**離陸成功**（airborne、高度 100 ft、IAS 114 kt）
4. ハブから4画面を開く: フリー（737 セッション開始）／ライン（勤務生成）／AI教官（応答あり）／歩行（内装ロード＋walker 起動）
5. タイトルへ復帰

証跡スクショ: `stage12-title.png`（オーバーレイは RT 撮影に写らないため空と地面のみ）、`stage12-flight.png`（離陸直後、Archer を追尾視点で撮影・良好）、`stage12-walk.png`。

## 3. Windows リリースビルド — 成功

- `GameSceneSetup.BuildWindows`（対象は Game シーンのみ。受け入れ用 *Acceptance.cs / GameSceneSetup.cs はビルド前に Assets/Scripts から退避し、ビルド後に復旧済み）
- 結果: **BUILD_RESULT Succeeded / errors=0 / totalSize 134,157,974 bytes**
- 成果物: `~/workspace/cadet-unity/build-windows/`（Cadet.exe 一式、約129MB）
- VM では Windows exe を実行できないため、**実機での起動・fps・操作感の確認はユーザーの PC 待ち**。

## 4. GitHub 配置 — 完了

- 配置（ユーザー決定 2026-11-02）: リポジトリ `kazuki8198-glitch/otinti`、ブランチ **`unity/full-port`**（デフォルト頭 3579ccb から新規作成）、フォルダ `cadet-unity/`。
- push は snapshot-push 手順で、コネクタの実効リクエスト上限（約2.5MB で安定、7.7MB で HTTP 413）に合わせて **6 コミット**に分割:
  1. `33ba5b1` core ほか 110 ファイル
  2. `18553e5` flight ほか 52 ファイル
  3. `9e5da79` tools/docs 12 ファイル
  4. `52029dc` unity-project Assets 281 ファイル
  5. `181d3cf` unity スクリプト群・レポート 108 ファイル
  6. `045a4fb` README（除外物の注記）— **最終 head**
- 検証: list_branches で head = `045a4fbf3f55c7793cc954ebe5d782c621919f0a` を確認。blob 一致を3件で確認（`README-UNITY.md` SHA 39404361… 一致、`flight/src/CadetLine.cs` SHA 10a64e18…・バイト完全一致、`unity-project/ProjectSettings/ProjectVersion.txt` = 6000.3.27f2）。
- **未収録（コネクタ上限・バイナリ不可のため）**: `data/dialog-extra.json`（35MB、再生成: `node tools/extract-dialog.mjs`）、`flight/test/golden-boeing.jsonl`（5.8MB）・`flight/test/golden-dialog.jsonl`（16MB）（再生成: 各 golden-*.mjs。検証結果自体は STAGE7/8 レポートに記録）、スクリーンショット *.png、archer.glb、Windows ビルド成果物、ライセンス関連。詳細は `README-UNITY.md`。
- 同期記録: `~/workspace/cadet-unity-push.muse-github-snapshot-sync.json`。

## 5. 到達範囲の正直な線引き

「遊べる」と実証できたのは **タイトル→キャリア飛行開始→離陸→各画面（フリー／ライン／AI／歩行／会話）の起動と基本動作** まで。

未統合・未達（残作業）:
- **卒業までの連続プレイフローの画面結線**: 予定→課目→試験→卒業を1本の流れとして直列に結ぶ作業は未実施。キャリアロジック自体は全周 JS 同値（Stage 3）で検証済みだが、画面側の直列結線が残る。これが最大の残作業。
- ライン画面の PF は観測プロファイル駆動（実フライト結線は未実施）。
- フリーモードの故障注入は cfg/計画の保持まで（実働結線なし）。
- デバイス（ゲームパッド/ヨーク）は列挙・割当・保存まで。飛行ループでの実消費は未結線。VM 内に物理デバイスが無いため実機確認待ち。
- ピストン機の G1000 グラス描画は未移植（ロジック同値のみ）。
- NPC はスタンドイン造形（actor.glb の本造形・顔シェーダ再現は未達）。
- TTS は未達（VM にエンジン無し、Unity 標準機能なし。Windows 実機では SAPI ブリッジ等が別途必要）。STT は faster-whisper で書き起こし実証済みだが Unity 組み込みは未実施。
- 原典 boeing.js の既知欠陥（`o.hdg` 欠落で方位表示が常時 000°）は忠実に再現したまま（原典側の修正判断待ち）。

## 6. Stage 6〜12 総括

| Stage | 内容 | 検証 |
|---|---|---|
| 6 | コックピット3D操作子（144/150/96） | ゴールデン 2,736/2,736、Unity 受け入れ PASS |
| 7 | 737 表示＋接写ビュー | 56,536/56,536 ops、受け入れ PASS |
| 8 | 会話エンジン＋UI | 歩行 73,234 行完全一致、受け入れ PASS |
| 9 | 内装・歩行・NPC 配置 | ハーネス 88 項目 ALL PASS、受け入れ PASS |
| 10 | フリーモード＋ライン画面 | ゴールデン 45/45・55/55、受け入れ 18/18 |
| 11 | 音響・STT 実証・AI モック・デバイス | SFX 1,703/1,703、受け入れ PASS（TTS のみ未達） |
| 12 | 統合・画面通し・ビルド・push | 画面通し 12/12、ビルド成功、push＋blob 検証完了 |
