# CADET Godot 4 Phase 0 検証レポート

- 実施: 2026-11-01
- 計画書: ~/workspace/your_files/cadet-native-migration-plan-v1.md §5 Phase 0
- 作業場所: ~/workspace/cadet-godot/（移植元 cadet-wt-next @ 898fe8a は読み取り専用で無変更、GitHub push なし）

## 結論（先に）

**Phase 0 の受け入れ条件は全部緑。** Godot 4.7.2 のヘッドレス導入、Windows書き出し、フライトモデルの翻訳＋同値検証、最小の飛べるシーン、スクリーンショット取得まで、このVMの中で無人で回ることを実証した。「私（Muse）だけで完結できる」の前提は Phase 0 の範囲では成立。残る最大の未知数は計画通り **ユーザーのPCでの fps 実測**（このVMにGPUは無い）。

## 1. 環境検証

| 項目 | 結果 |
|---|---|
| Godot 本体 | 4.7.2.stable.official.ed1daf0bf（~/workspace/tools/godot/、導入済みを再確認） |
| エクスポートテンプレート | GitHub releases から Godot_v4.7.2-stable_export_templates.tpz（1.1 GB）を取得し、~/.local/share/godot/export_templates/4.7.2.stable/ に導入完了（version.txt = 4.7.2.stable） |
| Windows Desktop 書き出し | **成功** — build/CADET-Phase0.exe、**105 MB**（x86_64、PCK埋め込み、署名なし） |
| ヘッドレス実行 | テスト・シーンとも --headless で無人実行可（下記） |
| VM 仕様（実測） | 4コア / RAM 7 GB / GPU なし / ディスク残り 145 GB。/tmp は **512 MB の tmpfs**（後述の事故） |

### 引っかかった点（正直な記録）

- テンプレートDLを最初 /tmp に置いたら **tmpfs 512 MB が満杯**になり、DLが 510 MB で切れた＋作業ファイルが書けなくなった。DL先を ~/workspace に変えて解決。以後このVMでは大きなファイルは /tmp に置かない。
- physics.gd 初稿は JS の素の `{ }` ブロックや `:=` 型推論など GDScript 固有の文法で数回パースエラー。移植コードの方針として「無型 `=` 宣言に統一（JSの動的型付けに合わせる）」で解消。

## 2. フライトモデルの翻訳と同値検証（Phase 0 の核）

- 対象: 移植元で最も純粋な物理である **flight-lab/src/physics.js（1,117行）全体** を GDScript に翻訳（src/physics.gd、約1,700行）。「核」どころか全体を移植した：ブレード要素空力（要素分割＋チューニング）、プロペラ左転傾向（スリップストリーム/P-factor/トルク/ジャイロ）、車輪バネ・ブレーキ・横滑り、地面効果、失速ヒステリシス、エンジン始動/マグネトー/ミクスチャー/燃料セレクター・ライン燃料、キャブ着氷、ピトー着氷、オイル、電気（バッテリー/オルタネータ）、W&B（CGによる安定性変化まで）、大気・風（Perlin乱流、32bit RNG の Math.imul をビット単位で再現）。対象機は Archer / Seminole / Arrow の3機全て。
- 参照値: tools/gen_reference.mjs が原典JSに固定入力・固定初期条件を与えて生成（test/reference.json）。
- テスト: test/run_tests.gd（自作ヘッドレステストランナー、`godot --headless -s test/run_tests.gd`、終了コードで合否）。

### 結果: **1,904 チェック / 失敗 0 / 最大誤差 4.4e-7**

内訳: 純関数（atmos 6点、rpmFor 8件、trimFor、steadyState 4件、computeWB 3件）は許容 1e-7〜1e-9 で一致。軌跡シナリオ 10本（各 6〜26 秒、120 Hz 積分、開始/中間/終了の状態ベクトル＋計器値＋燃料＋推力まで照合）：

| シナリオ | 内容 | 結果 |
|---|---|---|
| takeoff | 滑走→離陸→上昇（26 s） | 一致 |
| cruise | 3,000 ft / 110 kt 巡航 10 s | 一致 |
| approach | flap 2、-3° 降下進入 | 一致 |
| stall | スロットル0で失速域へ | 一致 |
| seminole_cruise | 双発 5,000 ft / 140 kt | 一致 |
| seminole_oei | 左発フェイル後の非対称推力 | 一致 |
| arrow | 定速プロペラ（ガバナー 0.8） | 一致 |
| xwind_roll | 横風 270°/12 kt・gust 1.2 の地上滑走（Perlin乱流経由） | 一致（最大誤差はこの推力 4.4e-7 N） |
| restart | マグネトーOFF→START で再始動の状態遷移 | 一致 |
| fuel_cut | セレクターOFF→ライン燃料切れで停止 | 一致 |

## 3. 最小の「飛べる」シーン

- scenes/main.tscn + main.gd：archer.glb を**無改造でインポート**、LAB RWY 36（1,200×30 m、方位 354°）＋センターライン、地面（標高 55 ft）、太陽光＋影、HUD（IAS/ALT/VS/THR/RPM）。
- カメラは機体 eye 点（左席）のコックピット寄り配置。物理は 120 Hz で physics.gd を駆動。
- 操作：↑↓ ピッチ、←→ ロール、A/D ラダー、R/F スロットル、Space ブレーキ、Enter リセット。--shot モードは自動操縦デモ（フルスロットル→55 kt で引き起こし）。

## 4. スクリーンショット

- **取得成功**：build/phase0-shot.png（1280×720）。ヘッドレス（ダミードライバ）では描画されないため、Xvfb ＋ Mesa llvmpipe（ソフトウェア OpenGL）で実行。離陸直後（IAS 58.9 kt、ALT 60 ft、VS +54 fpm、RPM 2,475）のコックピット視点。
- 正直な所見：空・地面・滑走路・HUD は描画される。機体モデルは白一色で表示される（glb のマテリアルは CADET 側の Three.js マテリアル前提で、素のインポートでは色が乗らない → Phase 2 のマテリアル作業）。滑走路の見かけの角度と物理方位の厳密な一致確認も Phase 2 送り。Phase 0 の目的（描画パイプラインがこのVMで回ることの証明）は達成。

## 5. 音声認識の代替比較（机上検討）

現行 HTML 版は Chrome Speech Recognition に依存（読み上げ復唱 M8、教官への音声質問）。ネイティブ化で消えるため代替が必須。

| 観点 | ローカル whisper.cpp（推奨） | Windows 標準音声認識 (System.Speech / Windows.Media.SpeechRecognition) |
|---|---|---|
| オフライン | ○ 完全オフライン（現行の「接続が必要」が解消される） | ○ オフライン（言語パック導入が前提） |
| 精度 | 高い。航空英語の phraseology や固有名詞にもプロンプト/語彙バイアスで対応可 | 中。汎用ディクテーション向けで、無線用語の誤認が増えやすい |
| 日本語/英語の混在 | モデル/言語指定を発話ごとに切替可能（現行のモード別言語と整合） | 言語は認識エンジン単位で固定されがちで混在に弱い |
| 統合コスト | 中。GDExtension または外部プロセス連携＋モデル同梱（tiny/base で 40〜150 MB、配布サイズ増） | 低〜中。Godot からは WinRT ブリッジが素直ではなく、結局プラグイン作業が要る |
| Godot での実績 | whisper.cpp の GDExtension 事例あり。CPU 推論でも短い復唱文なら実時間可 | 事例が乏しい |
| ライセンス | whisper.cpp / モデルとも MIT 系で同梱可 | OS 標準機能（追加費用なし） |

**推奨：ローカル whisper.cpp（計画書の既定通り）。** 復唱チェックは「キーポイント一致」方式なので、完全な書き起こし精度より語彙の当たりやすさが効く。実装は Phase 3（音声機能の移植時）に GDExtension で行い、モデルは base 以下を同梱する想定。Windows 標準はフォールバック候補として残す。実機でのマイク入力検証はユーザーのPCでのみ可能（このVMに音声入出力なし、ALSA も無く音声ドライバはダミーだった）。

## 6. 残っていること（ユーザーのPCでしか測れない）

1. **fps 実測**：CADET-Phase0.exe を実機（Iris Xe 級）で起動し、HTML 版と fps・体感を比較する（Gate 2 の材料）。このVMは GPU が無く、llvmpipe の速度は実機の目安にならない。
2. 起動確認そのもの：この exe は Linux 上で書き出しただけであり、Windows 実機での起動は未検証。
3. ヨーク等の実機デバイスの手触り（Phase 2/4）。

## 成果物一覧

- build/CADET-Phase0.exe（105 MB、Windows x86_64）
- build/phase0-shot.png（スクリーンショット）
- src/physics.gd（フライトモデル全移植）
- scenes/main.tscn / main.gd（最小シーン）
- test/run_tests.gd + test/reference.json（同値テスト、1,904 件）
- tools/gen_reference.mjs（参照値ジェネレータ）、tools/probe.mjs
