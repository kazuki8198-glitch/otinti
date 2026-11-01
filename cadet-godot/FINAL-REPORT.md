# CADET Godot 移植 — FINAL レポート（Phase 5 リリース整備＋全フェーズ総括）

- 日付: 2026-11-01
- 移植元: `~/workspace/cadet-wt-next` @ 898fe8a（読み取り専用・無変更、GitHub push なし）
- 作業場所: `~/workspace/cadet-godot/`、Godot 4.7.2.stable.official
- 仕様: `~/workspace/your_files/cadet-native-migration-plan-v1.md` §5 Phase 5
- 前段: PHASE0-REPORT.md / PHASE1-REPORT.md / PHASE2-REPORT.md / PHASE3-REPORT.md /
  PHASE4-REPORT.md

## 1. 結論

移植 v1 のリリース整備が完了した。配布形は **`build/release/CADET-godot-v1.zip`**
（58,012,570 バイト、中身は `CADET.exe` と `README.md` の 2 ファイルのみ）に確定し、
最終回帰は **157,347 チェック / 失敗 0**（Phase 4 終了時点の 157,288 を全維持し、
Phase 5 の設定テスト 59 を追加）。残るのは §6 の「ユーザーの PC でしか確認できない
こと」だけで、これは計画書以来一貫して未取得の Gate 2 実機判定材料である。

## 2. 全フェーズ総括表

| Phase | 成果物 | テスト（累計） | exe |
|---|---|---:|---:|
| 0 試作＋環境検証 | Godot 4.7.2 ヘッドレス導入、Windows 書き出しの実証、フライトモデル核の翻訳＋同値テスト、Archer glb＋滑走路の最小飛行シーン（PHASE0-REPORT） | 1,904 / 失敗 0 | CADET-Phase0.exe（105 MB） |
| 1 基盤移植 | 純粋ロジック 7 モジュール（4,474 行）の GDScript 化（PHASE1-REPORT） | 27,045 / 失敗 0（当フェーズ分） | — |
| 2 垂直スライス | avionics（実 navSolve、APR は LOC のみ接続）、橋渡し 120 Hz、G1000 PFD/MFD ライブ表示、PAVED 仕様の空港、レッスン a1/t1/t2/t3、ゲームパッド（PHASE2-REPORT） | 42,480 / 失敗 0 | CADET-Phase2.exe（112 MB） |
| 3 内容の全移植 | 全 48 レッスン実行可能、content.json 248 KB（人物 10 名・試験 14 バンク 205 問・各 spec）、会話トランスクリプト 2,566＋dayRadio 5,518 完全一致、セーブ永続化、recorder CSV/GPX の SHA-256 一致、キャリアボットが 77 日で卒業＋全 7 試験合格、Seminole 飛行可能（PHASE3-REPORT） | 156,250 / 失敗 0 | CADET-Phase3.exe（124,985,672 B） |
| 4 品質向上＋残件解消 | 会話の日次フロー統合、k1–k6 ドリル、NPC 9 名配置、内装（壁 68・家具 388・塔階段 67）＋歩行衝突、地面洗われの根治（タイリング/ミップ/色空間）＋AgX・影・雲、コックピット本格化（実開口窓・グレアシールド 28.0 mm・頂点 AO 919/919）、空間オーディオ（5 バス・15 音源手続き合成）、デバイス分離、EFB、リプレイ＋プロファイルグラフ（PHASE4-REPORT） | 157,288 / 失敗 0 | CADET-Phase4.exe（130,542,624 B） |
| 5 リリース整備 | 本レポート。配布 zip 確定、README、設定統合（画質/音量/AI/デバイス＝1 ファイル＋1 画面）、版表示とログ、最終回帰＋最終撮影 | **157,347 / 失敗 0** | **build/release/CADET.exe（132,752,688 B）** |

## 3. Phase 5 で実施したこと

### 3.1 配布形の確定

- リリース用プリセット「Windows Desktop Release」を新設（PCK 埋め込み、x86_64、
  ファイル/製品バージョン 1.0.0、製品名 CADET を exe のリソース情報にも設定）。
- 最終書き出し: `build/release/CADET.exe`（132,752,688 バイト、未署名）。
  フェーズ名入りの exe は build/ 直下に履歴として残置。
- 配布 zip: `build/release/CADET-godot-v1.zip`（58,012,570 バイト）。
  中身は **CADET.exe と README.md の 2 ファイルのみ**（展開して exe を起動する形）。

### 3.2 README（日本語）

- `README.md` をプロジェクト直下に作成し、zip と release フォルダにも同梱。
- 記載内容: 起動方法、未署名 exe への SmartScreen 警告の回避手順（詳細情報→実行）、
  操作方法一覧（飛行／視点・モード／キャリア・会話／徒歩／EFB・リプレイ・設定の
  キー表＋ゲームパッド）、セーブと設定の実パス、動作環境、既知の制限、ログの場所。

### 3.3 設定の統合確認（一部は新規実装）

監査の結果、[devices]（Phase 4）と [ai] api_key（Phase 3）は既に
`user://cadet_settings.cfg` に同居していたが、**画質プリセットと音量は未実装**だった
ため、新規 `src/app_settings.gd`（CadetAppSettings）で実装し、1 画面に統合した。

- 永続化先は全て同じ `user://cadet_settings.cfg`:
  `[display] quality` / `[audio] master_volume` / `[ai] api_key` / `[devices]`。
  保存は「既存ファイルを読み、自分のキーだけ書き換える」方式で、セクション同士が
  互いを消さないことをテストで相互確認した。
- 画質プリセット（低/中/高）は実効果で差が付く: 低 = 影オフ＋フォグ濃＋積雲
  ビルボード非表示（層雲のみ）、中 = Phase 4 の正規化値そのもの（影 800 m /
  フォグ 0.0002 / 雲フル）、高 = 影 1,500 m＋フォグ薄。純粋関数 `quality_spec()` で
  仕様を固定し、シーン側は boot 時とパネル変更時に `apply_spec()` で実物
  （DirectionalLight3D / Environment / 雲ルート）へ適用する。
- 音量: Master バスへ linear→dB 写像で適用（0 でミュート）。
- 設定画面: F12 パネルを「設定（画質・音量・AI教官）＋デバイス割り当て」の
  1 枚に統合。ヘルプ表示も「F12 設定」に更新。
- 検証: 新規 `test/run_settings.gd` **59 チェック / 失敗 0**（プリセット仕様の差異、
  実ノードへの適用、4 セクション共存の往復、UI 操作→永続化→再起動復元、版数）。
  メインシーンのヘッドレス起動スモークも通過（下記バナーを確認）。

### 3.4 ログと版表示

- 版数を **1.0.0** とし、`project.godot` の `application/config/version` に設定。
- 画面右下に `CADET v1.0.0` を常時表示（最終撮影 4 点すべてで目視確認）。
- 起動時にログへバナーを出力（user://logs/godot.log の先頭で実地確認）:
  `CADET v1.0.0 — Godot 4.7.2-stable (official) / Linux`
- ファイルログを有効化（`debug/file_logging/enable_file_logging=true`）。
  異常終了時のログの残り場所（`%APPDATA%\Godot\app_userdata\CADET (Godot port)\logs\`）
  を README に明記した。

### 3.5 最終回帰

全スイートを再実行し、Phase 4 までの全数を維持した。合否は各ランナーの
totals（失敗 0）で判定（従来どおり）。

| スイート | チェック | 失敗 |
|---|---:|---:|
| run_tests（Phase 0 physics） | 1,904 | 0 |
| run_tests1（Phase 1 ロジック） | 27,045 | 0 |
| run_tests2（avionics/AP） | 10,411 | 0 |
| run_tests2b（school/基盤） | 3,122 | 0 |
| run_bridge | 12 | 0 |
| verify_visual（実描画, Xvfb） | 33 | 0 |
| run_tests3（全レッスン） | 37,287 | 0 |
| run_content（会話/dayRadio） | 8,906 | 0 |
| run_save（recorder/セーブ） | 57,726 | 0 |
| run_world（traffic/world/機種） | 9,787 | 0 |
| run_career（通しボット） | 17 | 0 |
| run_p4world | 82 | 0 |
| run_p4cockpit | 73 | 0 |
| run_audio | 202 | 0 |
| run_devices | 87 | 0 |
| run_p4scene | 284 | 0 |
| run_p4efb | 310 | 0 |
| **run_settings（Phase 5 新規）** | **59** | **0** |
| **総計** | **157,347** | **0** |

### 3.6 最終撮影（Phase 4 と同一アングル、Xvfb＋llvmpipe）

main.gd に p5 ショットモード（final-* 命名）を追加して撮影した。

- `build/final-cockpit.png`（上昇中 211 ft、Phase 4 と同一条件）: A ピラーと大きく
  開いた側窓、グレアシールドのアーチ、ライブ表示の G1000。右下に版表示。
- `build/final-external.png`（同条件の外部視点）: 白＋紺帯の Archer、AO の陰影あり。
- `build/final-walk.png`（phase3/4-walk と同一ステージング）: 粒のある芝と
  コンクリート舗装、歩行者カプセルとその影、右に学園棟と塔。
- `build/final-room.png`（ブリーフィング室 1）: 内壁・机椅子と、名前ラベル付きの
  教官 NPC。Phase 4 の所見どおり「歩ける・衝突する・人が居る」までの基礎内装。

## 4. 最終成果物の目録

| パス | 内容 |
|---|---|
| `build/release/CADET-godot-v1.zip` | **配布物**（58,012,570 B）= CADET.exe + README.md |
| `build/release/CADET.exe` | 最終ビルド単体（132,752,688 B、未署名、版 1.0.0） |
| `build/release/README.md` | 配布用 README（プロジェクト直下と同一） |
| `README.md` | プロジェクト直下の README |
| `build/final-cockpit.png` / `final-external.png` / `final-walk.png` / `final-room.png` | 最終撮影 4 点 |
| `build/CADET-Phase0..4.exe`、`build/phase*-*.png` | フェーズ履歴（参考） |
| `src/`（GDScript 40 ファイル、scenes/main.gd と合わせて約 18,200 行） | 移植本体 |
| `data/content.json`（248 KB） | 移送済みコンテンツデータ |
| `test/`（ランナー 18 本＋参照 JSON 群） | 同値テスト一式 |
| `PHASE0..4-REPORT.md`、`PHASE3-*.md`、`PHASE4-*-NOTES.md`、`FINAL-REPORT.md` | 全フェーズの記録 |

## 5. 残っている既知の制限（全リスト）

Phase 4 レポート §11 を正とし、Phase 3 以前からの持ち越しと Phase 5 の範囲外を
合わせて列挙する。

1. **キャラクター作画は移植対象外**（計画時の決定）。人物は基礎フィギュア
   （カプセル体＋頭球＋色分け＋名前ラベル）。HTML 側のクラフトラインは不採用。
2. **音声認識は未搭載**。HTML 版の Chrome 音声認識に依存していた読み上げ復唱・
   音声質問は使えない（計画の決定はローカル Whisper だが、GDExtension 統合は
   v1 の範囲外とした。無線回答はキー選択式）。
3. **AI 教官は会話 UI 未統合**。接続口（ペイロード生成・応答解析・キー読込）は
   移植・検証済みだが、`send()` を呼ぶ画面側の配線がない。キーが無ければ台本式
   会話にフォールバックする。
4. 会話の統合範囲: 日次フローに結線したのは intro（開始）/ return（飛行後）/
   transit（J キー）。予定項目ごとの個別会話割当ては、対応 dialog id がデータ側に
   無いため作っていない。dayRadio はブリーフ表示までの結線。
5. ドリルの近似: k4 は簡略版（原典の段階制・マイク復唱なし）、k3 は 12 種中 10 種、
   k5 は転記 10 場面。不合格でもキャリア記帳は進む（合格時のみ成長を適用）。
6. NPC は起動時（am/ch1）の配置のみで、時刻 slot 変更時の再配置は未配線。
   審査官は ch6 の checkride 予定時のみ出現（原典どおり）。
7. 内装: ドア扉の開閉なし、家具に衝突判定なし（壁 AABB のみ）、学園棟の階段
   （2 階/屋上）は未対応（塔のみ）。歩行は点＋半径方式で、高速移動では薄壁を
   すり抜けうる（通常速度では問題なし）。
8. 地面: タイリングは支配面のみ正確（BoxMesh の制約、完全 triplanar 化は見送り）、
   anti-tile なしで近景の芝に反復感。雲は静的配置（漂流・天候連動なし）、層雲は
   シェーダ近似。頂点 AO の焼き込みは直射光まで暗くなる近似。
9. オーディオ: Seminole は双発でも 1 ボイス（状態契約が単一 rpm）、車内 boom・
   ドップラーなし、バス別音量は未搭載（マスターのみ）。backfire は原典に独立関数が
   無く新規合成した派生。
10. デバイス: merge_axes の throttle/prop/mixture は controls.gd の消費側に未接続
    （現行 readPad 契約にチャンネルが無い）。軸番号の変更 UI なし（API/設定
    ファイル経由）。ボタン割当てはデバイス別にできない（原典同様）。
11. リプレイは位置・姿勢のみ（ギア/フラップ/プロペラの見た目未連動）、記録は
    シーン側 5 Hz サンプリングで recorder の CSV/GPX とは別系統。EFB は HUD
    オーバーレイ形式で、コックピット内 3D 面への貼り込みなし。EFB チェックリストの
    判定（__fn）は school 側機構が担当。
12. Arrow（pa28r）は Archer の外形シェルを流用（物理は pa28r）。G1000 は
    DME/legs/wind/NRST 表示とクリック操作が未完（Phase 2 由来）。
13. セーブは HTML 版と互換性なし（新規スタート、計画時の決定）。FLIGHT LAB は
    HTML のまま（移植対象外、計画時の決定）。
14. exe は未署名。Windows 実機での起動可否自体が未確認（§6）。

## 6. ユーザーの PC でしか確認できないこと（最終チェックリスト）

この VM は GPU なし・llvmpipe のため、以下は原理的にここでは確定できない。
配布 zip を実機で開いて確認してほしい項目を、判定材料として使える形で並べる。

- [ ] **起動**: CADET-godot-v1.zip を展開し CADET.exe が起動するか
      （SmartScreen の「詳細情報→実行」を含む）。起動しない場合は
      `logs\godot.log` の末尾が手がかり。
- [ ] **fps**: Iris Xe 級でフリー飛行・コックピット視点のフレームレートが
      HTML 版と同等以上か（**Gate 2 の判定材料そのもの**。画質プリセット
      低/中/高での変化も含む）。
- [ ] **見た目の最終適否**: コックピット/機体/地面/空が HTML 版より上か
      （最終撮影 4 点は llvmpipe の絵であり、実 GPU の絵とは異なる）。
- [ ] **音**: 空間オーディオの音質・定位・roughness の聞こえ方（ヘッドレスでは
      ダミードライバのため数値と構成のみ検証済み）。
- [ ] **実デバイス**: 実ゲームパッド／ヨーク／ペダル／クアドラントでの
      identity 追従（抜き差し・同名 2 台時の guid 安定性）と操作感。
      F12 パネルでの割当て→再起動復元まで。
- [ ] **実プレイの合格可否**: スクリプトパイロットの同値性は「HTML 版と同じ
      挙動」の証明であって「人間が合格できる」ことの証明ではない（Phase 2 以来、
      t2 等で両側同点の C 評価がある）。レッスンを実際に飛んで合格できるか。
- [ ] **設定の実利用**: F12 パネルで画質/音量/AI キーを変え、再起動で復元されるか、
      AI 教官キー設定時の接続可否（オンライン）。

## 7. HTML 版との関係

- HTML 版（`~/workspace/cadet-wt-next` @ 898fe8a）は**無変更の保険**として残置した。
  本移植で問題があっても HTML 版はそのまま遊べる。
- 本 Phase を含め、移植作業を通じて GitHub への push は**一切行っていない**
  （成果物は全てこの VM の `~/workspace/cadet-godot/` 内）。
- 移植元の読み取り専用も維持した（作業ツリーへの書き込みなし）。
