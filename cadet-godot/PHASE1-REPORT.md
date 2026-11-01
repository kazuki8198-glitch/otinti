# CADET Godot 移植 — Phase 1 レポート（純粋ロジックの全翻訳＋同値検証）

- 日付: 2026-11-01
- 移植元: `~/workspace/cadet-wt-next` @ 898fe8a（読み取り専用・無変更）
- 作業場所: `~/workspace/cadet-godot/`（GitHub へは push していない）
- Godot: 4.7.2.stable.official（Phase 0 と同一）
- 前段: PHASE0-REPORT.md（フライトモデル核 physics.js の移植＋同値検証、Windows 書き出し、最小の飛べるシーン）

## 1. 結果サマリー

Phase 0 で移植したフライトモデルに続き、残りの純粋ロジックモジュール 7 件を GDScript に翻訳し、
Phase 0 と同じ方式（Node で原典 JS から参照値を生成 → ヘッドレス GDScript ランナーで照合）で
数値同値を検証した。

**Phase 1 テスト総計: 27,045 チェック / 失敗 0 / 全体最大誤差 5.0e-7**

| グループ | チェック数 | 失敗 | 最大誤差 | 備考 |
|---|---:|---:|---:|---|
| hold（ホールディング） | 1,060 | 0 | 0.0（完全一致） | 進入区分 144 件＋保持側判定＋風修正 110 件 |
| tem（TEM） | 1,744 | 0 | 0.0（完全一致） | 脅威選択 74 条件＋エラー文 6 要約×日英 |
| career（キャリア純関数） | 10,976 | 0 | 2.6e-7 | 天気 544 件（METAR/TAF 文字列含む）、日程 15 シナリオ |
| careerFlow（createCareer） | 261 | 0 | 4.9e-7 | 試験・成長・睡眠・保存/再読込までの通し運転 |
| atc（無線交信ランナー） | 184 | 0 | 0.0（完全一致） | 全交信トランスクリプト（誤答・遅延再呼出含む） |
| analysis（標準採点・着陸分析） | 593 | 0 | 4.6e-7 | 実飛行の記録 2,390 サンプルへの全解析 |
| systems（始動・電気・警報） | 9,368 | 0 | 5.0e-7 | 物理連動 11 シナリオ（単発/双発/負荷遮断） |
| autopilot（AP/FD） | 2,859 | 0 | 5.0e-7 | 物理連動 3 シナリオ（HDG/ALT/VS/APR/解除） |

実行方法: `godot --headless --path ~/workspace/cadet-godot -s test/run_tests1.gd`（終了コード 0）
参照生成: `node tools/gen_reference1.mjs` / `node tools/gen_reference1b.mjs`
所要時間: フルスイート約 3.2 分（この VM、ヘッドレス）。

## 2. 移植したモジュール

| 原典 (JS) | 行数 | 移植先 (GDScript) | 行数 | 内容 |
|---|---:|---|---:|---|
| cadet/src/career/career.js | 708 | src/career.gd + src/career_instance.gd | 836 + 271 | 暦・天気（weatherFor/weatherAt/風・使用滑走路）・成長（4 能力軸・卒業ランク）・ゲート・日程（schedule）・セーブ浄化（cleanCareer）・createCareer クロージャ全体 |
| cadet/src/aircraft/systems.js | 360 | src/systems.gd | 579 | 始動（プライム/フラッディング/スターター熱）・ランナップ低下・電気（2 段階バス・負荷遮断）・双発・警報収集 |
| cadet/src/flight/autopilot.js | 216 | src/autopilot.gd | 278 | GFC700 級 AP/FD の法則・接続/解除条件（drawApStrip の描画は除く） |
| cadet/src/dialog/atc.js | 93 | src/atc.gd | 166 | 交信ランナー（hear→choose→reply/negative、遅延再呼出、シード付きシャッフル） |
| cadet/src/flight/analysis.js | 299 | src/analysis.gd | 470 | マニューバ採点・500 ft ゲート・着陸分析・ログブック統計・スパークライン |
| cadet/src/career/tem.js | 109 | src/tem.gd | 165 | 今日の脅威（3 択＋却下理由、日英）・デブリーフのエラー文 |
| cadet/src/flight/hold.js | 65 | src/hold.gd | 60 | 進入区分（AIM 5-3-8）・保持側・風修正（アウトバウンド 3 倍・1 分脚） |

（Phase 0 の flight-lab/src/physics.js → src/physics.gd 1,628 行は既報。フライトモデル全体＝物理＋システム＋気象＋AP がこれで揃った。）

## 3. 検証の中身（モジュール別）

- **career**: 日付 11 点（dateOf/dateText/DOY/休日）、weatherFor をシード 3 × 60 日 × オプション 3 種
  ＋強制天候 4 種＝544 件フルオブジェクト照合（METAR/TAF 文字列・QNH・着氷分岐含む）、
  weatherAt 45 件、windsAloft/activeRunway 40 日、成長表（lessonGrowth 180 件ほか）、
  graduationRank 4 件、gate/schedule 15 シナリオ（序章〜ch6・卒業後・休日）、
  cleanCareer は v1 旧セーブ移行を含む 6 入力、createCareer は試験→成長→ドリル→判断→保存→
  別インスタンス再読込→load までの通しフロー（保存 JSON のパース照合含む）。
- **systems**: JS 物理と連動させた 11 シナリオ — 正常始動（捕捉 f=98＝1.6 s、ランナップの
  マグネト低下・キャブヒート低下をゲージ値で照合）、プライム無し（8 s で nocatch）、
  フラッディング（7 回プライム→nocatch、スロットル半開で 3.2 s 捕捉＋surge）、
  セレクター OFF（燃料理由）、マスター OFF（nostarter→回復して捕捉）、マグネト故障
  （dropL=260 の低下）、負荷遮断（バッテリー 0.5 から放電し batt<0.45 で shed 遷移、
  電圧/電流/残量を 5 秒毎に照合）、オルタネータ故障（警報＋電圧低下）、双発 Seminole
  （左→右の順次始動、プロペラサイクルのサグ、混合気カットで両発停止）、
  警報混合（FUEL L / ALTERNATOR / FUEL PRESS の順序含む）、Arrow のギア警報（空中・脚上げ）。
  イベント列はフレーム番号まで完全一致、サンプル値は最大誤差 5.0e-7。
- **autopilot**: 接続文言（地上/低高度の拒否含む）、HDG 40° への旋回＋ALT 3,400 ft 捕捉の
  40 秒×2 飛行、VS 捕捉→ALT 遷移、APR（GPS では拒否→LOC で接続）、手動オーバーライド
  （KeyW 保持 18 フレーム＝0.3 s で解除・フラッシュ・トーン 1 回）、FD 単独（操舵せず
  バーのみ）、LVL 接続と AP トグル解除。サンプル（針路/高度/バンク/rIn/pTgt/トリム）は
  最大誤差 5.0e-7。
- **analysis**: 記録は JS 物理を実際に飛行させて生成（離陸→800 ft レベル→90° 旋回→
  降下→着陸、10 Hz・2,390 サンプル）。analyzeRecording（vref 2 条件）、analysisRows の
  表示文字列、compactAnalysis、着陸履歴/統計、gate/scoreWindow/attOf/rwyCoords の単体値まで照合。
  着陸 1 回・マニューバ 3 件を検出する飛行になった。
- **atc**: スタブ無線（ATIS 聞き取り・グラウンド・復唱の 3 交信）で、誤答→訂正→
  時間切れ再呼出→正答、という全経路をトランスクリプト（画面表示・発話イベント・
  ログ・集計）ごと完全一致。
- **hold/tem**: 完全一致（誤差 0）。hold の風修正は既知の手計算値（風 010°/5 kt →
  WCA −2.8°、インバウンド 087°、アウトバウンド 278°、59 秒）とも一致。

## 4. 正直な申告（スタブ・先送り・失敗）

1. **avionics.js（flight-lab/src、852 行）は未移植。** オートパイロットの唯一の外部依存
   `navSolve` は Callable として注入する形にし、テストでは両側とも同一のスタブ
   （av の中身を返すだけ）で駆動した。つまり AP の法則そのものは検証済みだが、
   navSolve 本体（CDI/GPS/VOR/LOC の解算）は未検証のまま残っている。これは FLIGHT LAB
   側モジュールで、確定済み方針（LAB は当面 HTML）とは別に、CADET の飛行ブリッジが
   必要とするため **Phase 2 で移植が要る**。
2. **ATC のコンテンツデータ（content/dialog/atc.js の dayRadio が作る交信集）は未移植。**
   ランナーの状態機械は実データと同形のスタブ（聞き取り種別・訂正文付き誤答・遅延を
   含む 3 交信）で検証した。コンテンツ移植は Phase 3。
3. **analysis.scoreWindow の「サンプル番号の関数である目標値」は未対応**（定数のみ）。
   ただしコードベース内に scoreWindow の外部呼び出しは存在せず、analyzeRecording が
   使うのは定数目標だけなので、実使用の 100% をカバーしている。
4. **career_instance.check() に未知の審査 id を渡すと JS は例外を投げる**（undefined の
   プロパティ参照）。移植側も不正キー参照でエラーになる同等の振る舞いのため、テストでは
   呼び出さず 'throws' として記録した（ゲーム側は実在 id しか渡さない）。
5. **移植しなかったもの（Phase 2 以降）**: flight.js ブリッジ（351 行）、dialog/engine.js
   （262 行、会話エンジン）、recorder.js（記録の採取側。analysis は JS 生成の記録で検証）、
   school.js（FLIGHT LAB のレッスン採点 636 行 — LAB は当面 HTML の方針どおり対象外）、
   コンテンツデータ全般（レッスン定義・台詞・問題バンク）。
6. **一度失敗したこと**: hold と tem は、前セッションの要約を頼りに初稿を書いたため
   API の形を取り違えた（hold の引数、tem の入力フィールドと返却形）。同値テストが
   全件不一致として検出し、原典を再読して書き直した結果、両グループとも誤差 0 で
   完全一致した。「要約ではなく原典から移植する」ことと、同値テストの有効性が
   裏付けられた事例として残す。
7. GDScript 側の癖（移植時の注意として記録）: 素の `{}` ブロックは構文エラー、
   `disconnect` は Object のメソッドと衝突するため改名、JS の Math.round は
   floorf(x+0.5) で再現、Dictionary の == は内容比較（AP の L 同一性判定は
   実運用上同一オブジェクト参照で一致）。

## 5. Phase 1 完了時点の状態

- 純粋ロジック層は原典と数値同値（27,045 チェック全緑）で GDScript 化された。
- 残るは Phase 2（飛行ブリッジ＋avionics 移植、シーン/コックピット/計器）、
  Phase 3（キャリア進行 UI・会話・コンテンツ移植）、Phase 4（品質向上）—
  本レポートをもって Phase 1 の区切りとし、以降は統合側の編成に従う。
- HTML 版（cadet-wt-*）は無変更、GitHub への push はなし。
