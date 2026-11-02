# CADET — Unity 本移植（unity/full-port）

HTML 版 CADET（`cadet/`）の Unity 6000.3.27f2 への本移植一式。段階報告は
`STAGE1-REPORT.md` 〜 `STAGE12-REPORT.md`、移植台帳は `PORT-CHECKLIST.md`。

## 構成

- `core/src/` — キャリア・会話エンジン等のロジック核（JS 同値検証済み）
- `flight/src/` — 物理結線・システム・コックピット・737 表示・ライン運航・フリーモード・効果音
- `unity/` — Unity 側の画面・ドライバ（コックピット/会話/歩行/フリー/ライン/AI/デバイス/統合ハブ）
- `slice/src/` — 縦切りのタイトル＋飛行ループ（SliceMain）
- `tools/` — データ抽出・ゴールデン生成・同期・検証スクリプト
- `data/` — 抽出済みゲームデータ（JSON）
- `unity-project/` — Unity プロジェクトのテキスト部分（Packages / ProjectSettings / Assets）
  - 使い始め：この中身をプロジェクトフォルダに展開し、`tools/sync-unity.sh` の要領で
    `core/src`・`flight/src`・`unity/*.cs` を Assets/Scripts へ、`data/*.json` を
    Assets/StreamingAssets/cadet-data へ同期する。

## スナップショットから除外したもの（再生成可能・バイナリ・運用情報）

- `data/dialog-extra.json`（35MB、スナップショット上限超過）：`tools/extract-dialog.mjs` で再生成。
  Unity 実行時は Assets/StreamingAssets/cadet-data 側に必要。
- `core/test/digest*.jsonl`（同値検証の出力ダイジェスト）：各ハーネス再実行で再生成。
- `archer.glb` 等のバイナリモデル、スクリーンショット PNG、Windows ビルド成果物。
- ライセンス関連（license-home）は当然ながら含まない。

## 検証の要点

- ロジック核は JS ゴールデンと完全一致（物理・キャリア全周・全147課目ボット・systems 404・
  コックピット操作子 2,736 レコード・737 表示 696 フレーム/56,536 ops・会話 180 セット・
  歩行 20,453 ステップ・ライン 9 シナリオ・効果音グラフ 1,703 エントリ）。
- 統合シーン（Game）でのコールドブート画面通し：タイトル→キャリア飛行→離陸→
  各画面（フリー/ライン/AI/歩行）の起動を確認（STAGE12-REPORT）。
- 卒業までの連続プレイフローは STAGE15 で直列結線した（unity/CareerMain.cs。
  実入力アクセプタンス unity/CareerDriver.cs が序章→卒業→FO 入社を通す設計。
  2026-11-02 時点では VM 交換で Unity ライセンスのマシン結合が外れ、エディタ実行に
  ユーザー本人の Hub サインインによる再アクティベーションが必要 — STAGE15-REPORT 参照）。

## 音声（STT / TTS）

- STT（音声入力）: `unity/SttMain.cs` + `flight/src/CadetStt.cs`。マイク →
  16kHz WAV → 外部 python3 の faster-whisper（tiny / CPU / int8）→ 書き起こし →
  リードバック照合（数字は digit 化して照合）。実行には python3 +
  faster-whisper + PyAV が必要。VM ではマイクが無いため録音経路は未検証だが、
  ファイル→書き起こし→照合のパイプラインはハーネス（flight/test/BotSttCs.cs、
  JFK サンプル）で実証済み。
- TTS（読み上げ）: `unity/TtsMain.cs`。Windows 実機専用の SAPI ブリッジ
  （PowerShell + System.Speech、初回に persistentDataPath/cadet-tts/ へ
  スクリプトを書き出して行ごとに起動）。会話行の表示で自動的に呼ばれる。
  **実機未検証**（VM に音声エンジンが無く、Windows 実機での再生確認は未実施）。
  日本語の行には日本語 SAPI 音声のインストールが必要。
