# CADET Godot 移植 — Phase 2 レポート（垂直スライス）

- 日付: 2026-11-01
- 計画書: ~/workspace/your_files/cadet-native-migration-plan-v1.md §5 Phase 2
- 移植元: `~/workspace/cadet-wt-next` @ 898fe8a（読み取り専用・無変更、GitHub push なし）
- 作業場所: `~/workspace/cadet-godot/`、Godot 4.7.2.stable.official
- 前段: PHASE0-REPORT.md（環境＋物理）、PHASE1-REPORT.md（純粋ロジック 7 モジュール）

## 1. 結果サマリー

Phase 2 のスコープ 6 項目をすべて実装し、検証まで終えた。

**同値テスト総計: 42,480 チェック / 失敗 0**（Phase 0・1 の回帰を含む最終再実行値）

| スイート | チェック | 失敗 | 最大誤差 | 内容 |
|---|---:|---:|---:|---|
| run_tests.gd（Phase 0 回帰） | 1,904 | 0 | 4.4e-7 | 物理10シナリオ |
| run_tests1.gd（Phase 1 回帰） | 27,045 | 0 | 5.0e-7 | career/systems/AP/analysis/atc/hold/tem |
| run_tests2.gd（新規・avionics） | 10,411 | 0 | 5.0e-7 | 純関数＋control 118種＋navSolve 33シナリオ |
| run_tests2b.gd（新規・school系） | 3,120 | 0 | 7.7e-9 | a1/t1/t2/t3 全飛行・文字列・記録 |
| run_bridge.gd（新規・統合スモーク） | 12 | 0 | — | 駐機・離陸上昇・レッスン開始・終了処理 |
| verify_visual.gd（見た目検証） | 28（実描画時は 33） | 0 | — | 構造＋ピクセル実測（Xvfb 時） |

**成果物: build/CADET-Phase2.exe（112 MB、Windows x86_64、署名なし）** に、フリー飛行（滑走路／エプロン駐機）とレッスン a1・t1・t2・t3 が入り、離陸〜場周〜着陸の判定まで一通り遊べる。

## 2. 項目別

### (1) avionics 移植 — src/avionics.gd（733行、class CadetAvionics）

- flight-lab/src/avionics.js（852行）の純粋計算を全移植：方位/磁差、高度計、無線 tune/fmt（巻き戻し境界含む）、座標変換、CDI 原始関数、WAYPOINTS/NAVAIDS/PROCEDURES、createAvionics、control 全118種、collectAlerts、**navSolve 一式**。描画部（353行目以降、drawPFD/drawMFD）は対象外（§4 の G1000 が担当）。
- **autopilot の注入スタブを本物に差し替え済み**：`CadetAutopilot.new()`（引数なし）は既定で実 navSolve を使う。Phase 1 テストはスタブ明示注入のため不変で全緑。実証：最終進入＋CDI=NAV1(LOC) で AP の APR が実 navSolve 経由で接続成功、GPS ソースでは正しく拒否。
- 差し替えで露見した潜在不整合を1件修正：実 navSolve の `flag` は文字列（'' / 'NO LOC'）で、Phase 1 の autopilot 側の bool 解釈が例外になる箇所が3つあった。JS の真偽値セマンティクスに合わせて修正（Phase 1 の数値は不変）。

### (2) flight ブリッジ — src/flight_bridge.gd（486行、class CadetFlightBridge）

- cadet/src/flight/flight.js（351行）の移植。物理120 Hz＋コントロール（フレーム1回）＋school.update/freeUpdate の駆動、パーキングブレーキ保持、イベント収集、記録・進捗の保存（finish）、status()/panel()/pose() の状態公開まで原典どおり。
- 相違点：store は localStorage の代わりに Dictionary（キー→JSON文字列、school 側形式と同一。永続化は呼び出し側がファイルに書く形）。inWorld（教材→訓練の言い換え）は簡易文字列置換版。ourCall（コールサイン差し替え）は CADET コンテンツ層が未移植のため Phase 3 送り。
- スモークテスト（run_bridge.gd、12件）：エプロン駐機（IAS≈0・パーク保持）、滑走路から離陸・400 ft まで上昇、レッスン a1 開始と status、abort→finish の一連を確認。

### (3) 機体の見た目 — src/aircraft_visual.gd（227行）＋ tools/glb_inspect.mjs

- **白い機体の原因を特定**：archer.glb には**マテリアルが0個**しかなく、色は全メッシュ共通の頂点色 COLOR_0（rgb＝Blender 生成時の塗装色そのまま、a＝焼き込み AO）に入っていた。HTML 版は exterior.js が頂点色を paintClass() で分類しカスタムシェーダで質感を切り替える前提だったため、素インポートでは色が乗らなかった。
- 解決：原典と同じ閾値で三角形を paint/glass/rubber/metal/prop に分類し、サーフェスを分割して StandardMaterial3D（vertex_color_use_as_albedo、粗さ・金属は原典値）を再構成。登録記号は9機分のうち N738SY のみ表示（他8機分は非表示）。
- コックピット最低限：src/cockpit_build.gd（176行）。cockpit.js の寸法どおりに計器パネル面（z=-1.10）、グレアシールド、操縦桿、座席、スロットルクアドラント、予備計器3個、PFD/MFD のスロット（名前付きノード）を構成。統合側で内装を描画レイヤー2に分離し、外部カメラからは見えないようにした（箱形状が外形から透ける問題の回避）。

### (4) G1000 主要画面 — src/g1000.gd（694行、class G1000Display）

- PFD：姿勢儀（ピッチラダー/バンクスケール）、速度テープ（V速度帯）、高度テープ（選択高度バグ・気圧）、VSI、HSI（方位バグ/CRS/CDI）。MFD：エンジンストリップ（RPM/PWR/FFLOW/OIL/燃料/電圧電流）、簡易マップ（LAB RWY 36・場周・訓練点・自機・レンジリング）、FPL/ENGINE/SYSTEM の最小版。
- 統合：パネルの PFD_SLOT/MFD_SLOT に SubViewport（640×400）経由でライブ貼り込み。表示は実 navSolve の偏差（dots）を毎フレーム反映する。
- ノブ入力：knob() メソッド（HDG ±1°、ALT ±100 ft、BARO、CRS、RANGE。規則は avionics の control と同一）。シーン側では F5〜F10 キーに割り当て、av 本体（＝AP の目標）にも同時反映する。クリック入力は未実装（キーが代替）。

### (5) 訓練空港＋フリー飛行＋レッスン — src/airport_build.gd（90行）、src/input_map.gd（79行）、src/school.gd（1,471行）、src/controls.gd（571行）、src/syllabus.gd（354行）

- 空港：physics の PAVED 定義どおりに滑走路 RWY 36（1,200×30 m）、平行誘導路、接続誘導路3本、エプロン（450–750 × 110–230）、センターライン、スレッショルド標示、風向灯を再現。
- レッスン基盤：school.js（636行）を全移植（ステップ進行・採点・保持判定、チェックリスト8種、ATC復唱、記録・進捗）。controls.js（293行）も全移植（パッド読み取りは Callable 注入）。syllabus はヘルパー一式＋**a1・t1・t2・t3 の4レッスンを完全移植**（他44レッスンは STAGES メタ情報のみ＝Phase 3）。
- 遊べる形：メインシーンのキー 1=フリー（滑走路）、2=フリー（エプロン駐機・パーキングブレーキ保持）、3〜6=レッスン a1/t1/t2/t3。レッスン終了時は finish() で記録・進捗を保存し、N キーでフリー飛行に継続できる。タスク指定の「a1 相当（離陸〜場周〜着陸の判定つき）」は、この t1（離陸）→t2（場周）→t3（着陸）の連鎖がその実体で、a1 本体（姿勢・出力・トリム）も別途移植済み。場周の入口としてフリー飛行の開始点 'pattern'（ダウンウインド 1,000 ft）も school 側に用意がある。
- ゲームパッド：Godot の joy API を input_map.read_pad が controls の readPad 形式に変換（左スティック=ヨーク、右X=ラダー、A=ブレーキ）。シーン側でもパッドのボタンエッジ（Y=フラップ、X=フラップ上げ）を処理。**この VM には実パッドが無いため、読み取り関数の単体確認までで、実機操作の確認はユーザーの PC に残る**（§5）。
- AP 統合：F2 で CadetAutopilot の接続/解除（実 navSolve 使用）。マニュアルオーバーライドや低高度での自動解除も AP 側 update() を毎フレーム呼んで原典どおりに効かせた。

### (6) Windows 書き出しとスクリーンショット

- build/CADET-Phase2.exe（112 MB、前回 Phase 0 は 105 MB）。
- 撮影は Xvfb＋llvmpipe、シーンの --shot-* モード（自動操縦デモ）で取得：
  - build/phase2-cockpit.png — 離陸上昇中（IAS 96 kt / 211 ft）のコックピット視点。パネルに PFD（姿勢・テープ類がライブ表示）と MFD（マップ）が灯っている。
  - build/phase2-external.png — 同条件の外部視点。白＋紺帯＋金線の Archer が飛んでいる（Phase 0 の build/phase0-shot.png＝白一色が before）。
  - build/phase2-apron.png — エプロン駐機（スポット標識の十字の上、パーキングブレーキ保持中）。
- 撮影で踏んだ実務上の注意：llvmpipe では 1 フレーム約 0.55 秒かかるため、撮影モードでは物理を描画から切り離して 1 フレームに 10 ステップ進めている（通常プレイは実時間駆動）。また「開始直後に押しているキーはミュートされる」という原典 controls の仕様に撮影側が引っかかり、キーを離す導入区間を入れて解消した（実プレイでも同じ仕様が効く＝HTML 版と同等）。

## 3. 正直な申告（未完・先送り・粗さ）

1. **t2 は検証パイロットが両側とも不合格（グレード C、0.877）**。移植の等価性は一致しているが、「t2 に合格できる操縦で飛べる」ことの自動証明にはなっていない。実プレイでの t2 合格可否はユーザーの PC での確認事項。
2. **キャビンの窓の開口が小さく、コックピット視点では側壁・天井の箱が視界の多くを占める**（phase2-cockpit.png のとおり）。最低限の箱構成という Phase 2 の範囲どおりだが、HTML 版の視界より狭い。窓開口と内装の作り込みは Phase 4。
3. G1000 の CDI は navSolve の dots を表示するが、**DME・飛行計画レグ線・風表示は未描画**。MFD の NRST ページ未実装（MAP にフォールバック）、ENGINE/SYSTEM は数値一覧の最小版。クリックによるノブ操作は未実装（F5〜F10 キーで代替）。
4. 頂点色の **AO（COLOR_0.a）は未再現**（alpha=1 に潰した）、塗装のクリアコートは粗さ近似のみ、頂点色の色空間は HTML 版の toLin 経由と僅かに異なる。いずれも Phase 4 の質感作業。
5. 地面は単色＋空港舗装のみ（テクスチャ・地形・建物なし）。空は ProceduralSky の簡易設定。Phase 2 の「HTML 版と同等」に対しても外景はまだ下（HTML 版には地表テクスチャと町並みがある）。世界側の移植は Phase 3 の範囲。
6. school の ATC 復唱は学校側エンジン（全10問）を移植したが、CADET 側の dayRadio コンテンツ（その日の交信集）は Phase 1 からの継続で未移植（Phase 3）。レッスンも 4/48 本のみ。
7. セーブの永続化は Dictionary を橋渡しする所までで、ファイルへの書き出し（user:// 保存）はシーンに未配線。現状は起動のたびに記録がリセットされる。
8. テスト実行時間の注意：GDScript の 120 Hz 物理は JS の約10倍遅く、run_tests2b は約3分、フルスイートは約3分（並行実行時）かかる。実プレイのフレームレートとは別問題だが、物理の高速化（GDExtension 化）は将来の選択肢。

## 4. ユーザーの PC でしか確認できないこと（Gate 2 の材料）

1. **CADET-Phase2.exe の実機起動と fps**（Iris Xe 級）。この VM は GPU が無く llvmpipe で約 0.55 秒/フレームだが、これは実機性能の目安にならない。HTML 版との見た目・fps・手触りの直接比較が Gate 2 の判定材料。
2. **実ゲームパッド／ヨークでの操作感**（読み取り経路は実装済み、実機未接続）。
3. レッスン t2 の実プレイ合格可否（§3-1）。
4. G1000 の文字の読みやすさ（SubViewport 640×400 をパネル面に貼る方式。実機の解像度での可読性）。

## 5. 成果物一覧

- build/CADET-Phase2.exe（112 MB）／build/phase2-{cockpit,external,apron}.png
- 新規 src: avionics.gd（733）、school.gd（1,471）、controls.gd（571）、syllabus.gd（354）、flight_bridge.gd（486）、g1000.gd（694）、aircraft_visual.gd（227）、cockpit_build.gd（176）、airport_build.gd（90）、input_map.gd（79）
- 変更 src: autopilot.gd（navSolve 既定を本物に、flag 解釈の修正）、scenes/main.gd（Phase 2 シーンに全面差し替え、380行）
- テスト: test/run_tests2.gd、test/run_tests2b.gd、test/run_bridge.gd、test/verify_visual.gd、参照生成 tools/gen_reference2.mjs / gen_reference2b.mjs、glb 棚卸し tools/glb_inspect.mjs
- src 合計は 11,250 行規模（テスト・ツール込みの総行数）
