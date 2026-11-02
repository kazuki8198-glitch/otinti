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
- 「卒業までの連続プレイフロー」は未統合（キャリアのロジックは全周同値検証済みだが、
  予定→課目→試験→卒業を1本の画面流れとして直列結線する作業が残っている）。
