# CADET Godot 移植 — Phase 4 レポート（Phase 3 残件の解消＋ネイティブ品質向上）

- 日付: 2026-11-01
- 移植元: `~/workspace/cadet-wt-next` @ 898fe8a（読み取り専用・無変更、GitHub push なし）
- 作業場所: `~/workspace/cadet-godot/`、Godot 4.7.2.stable.official
- 仕様: `~/workspace/your_files/cadet-native-migration-plan-v1.md` §5 Phase 4 ＋ Phase 3 §9 の未完申告
- 系統別ノート: PHASE4-WORLD-NOTES.md（項目1）/ PHASE4-COCKPIT-NOTES.md（項目2）/
  PHASE4-AUDIO-NOTES.md（項目3）/ PHASE4-DEVICES-NOTES.md（項目4）/
  PHASE4-SCENE-NOTES.md（項目0）/ PHASE4-EFB-NOTES.md（項目5・6）

## 1. 結果サマリー

**同値テスト総計 156,250 チェック / 失敗 0 を回帰として全維持**し、Phase 4 の新規検証
**1,038 チェック / 失敗 0** を追加した（総計 157,288 チェック / 失敗 0）。

| スイート | チェック | 失敗 | 備考 |
|---|---:|---:|---|
| 既存スイート群（Phase 0–3 回帰） | 156,250 | 0 | 内訳は PHASE3-REPORT §1 と同一構成で全て再実行 |
| test/run_p4world.gd（項目1） | 82 | 0 | タイリング照合・法線/粗さ配線・ミップ・雲構成 |
| test/run_p4cockpit.gd（項目2） | 73 | 0 | アーチ実測 28.0mm・窓開口・AO 919/919 頂点 |
| test/run_audio.gd（項目3） | 202 | 0 | バス構成・全15ストリーム・roughness 境界値 |
| test/run_devices.gd（項目4） | 87 | 0 | identity 解決・フォールバックなし・永続化・UI |
| test/run_p4scene.gd（項目0） | 284 | 0 | 実ダイアログ完走・ドリル k1–k6・NPC配置・歩行衝突 |
| test/run_p4efb.gd（項目5・6） | 310 | 0 | W&B が physics 直接計算と完全一致・補間・カメラ |
| test/verify_visual.gd（実描画, Xvfb） | 33 | 0 | AO 後も機体色ピクセル健在 |

注記: run_tests2b / run_tests3 / run_save / run_bridge は totals（失敗 0）を出力した後に
この VM 既知の glibc teardown abort（"corrupted size vs. prev_size"、終了コード 134）で
落ちる。Phase 3 時点のベースラインでも同一事象を確認済みで、本フェーズの変更とは無関係。

成果物:
- `build/CADET-Phase4.exe`（Windows 書き出し、未署名）— サイズは §8
- スクリーンショット（Phase 3 と同一アングル）: `build/phase4-walk.png` /
  `build/phase4-cockpit.png` / `build/phase4-external.png`、新規アングル `build/phase4-room.png`
  （ブリーフィング室1の内装＋教官 NPC）— §8 に所見

## 2. 項目0: Phase 3 残件の解消

### (a) 会話エンジン＋dayRadio の日次フロー統合、k1–k6 ドリル UI

- 部品（新規 `src/dialog_ui.gd`）: `DialogUI`（Control。Runner を包み話者名は speakers の
  色付き、本文・選択肢・キーヒントを表示）と内包 `DrillCore`（k1–k6 各10問の対話型ドリル。
  原典 chair-flight.js / radio.js の構造を移植: k1=PFD読み取り説明7件＋確認3問、k2=PFD写真問題、
  k3=言い方ドリル10種、k4=dayRadio交換10件、k5=復唱場面10件、k6=聞き取り6種循環。
  合格は 8/10（原典どおり80%）、成長ペアは `CadetCareer.ftd_growth` を返す）。
  `DialogUI.radio_panel_text(weather)` が dayRadio を ATIS＋交換列のブリーフ文に整形する。
- 統合（scenes/main.gd）: キャリア開始で intro 会話（dialogs.intro.air の "intro"）を開く。
  飛行/審査の開始時に当日の radio ブリーフをデブリーフ欄へ表示。レッスン終了後のキャリア
  記帳に続けて "return" 会話を開く。J キーで "transit" 会話を任意に開ける。会話中は
  Enter=前進、数字キー=選択が他の入力に優先する。会話状態は store の `cadet-dialog` に
  保存され再起動で復元される。
- ドリル統合: キャリアの予定 kind=ftd は、ドリルを実際に解いてから記帳する流れに変更した
  （従来は即記帳）。合格時は成長ペアを career に適用してから driver が記帳する。
  不合格でも記帳自体は進む（近似として §9 に明記）。
- 検証: run_p4scene が実 content.json で day1 "transit" を選択完走、k1–k6 を全問正答で
  完走（成長ペア一致）／全問不正答で不合格、まで確認。

### (b) NPC 配置

- 新規 `src/npc_build.gd`: people.js `placeOf()` の忠実移植で配置を決め（時刻 slot・章・
  その日の予定で変わる）、基礎フィギュア（カプセル体＋頭球、座りは座面高さ＋脚箱、
  PEOPLE の色、Label3D の名前、face 方向への向き）を配置する。既定（am/ch1）で 9 名:
  教官（ブリーフィング室1、PLACES に無いため main.js の INS 座標を流用）・校長・講師・
  発着係（座り）・整備士・管制官（塔キャブ、up=17.2、座り）・同期 3 名。審査官は ch6 の
  checkride 予定があるときのみ現れる（原典どおり）。
- main.gd は世界構築直後に am/ch1 の配置で呼ぶ。slot 変更時の再配置は未配線（§9）。

### (c) 内装と歩行の衝突・段差

- 新規 `src/interior_build.gd`: academy/dorm の spec（rooms/doors）からデータ駆動で内壁を
  構築（ドア開口は doors の from–to を空け、locked ドアは開口にしない。壁 AABB 68 本）、
  spec の furniture 一覧そのまま 388 個を配置、塔シャフト内に折り返し階段（6便×10段＋
  踊り場＝67 件、0→17.2 m）、格納庫に作業台・棚。
- 新規 `src/walk_physics.gd`: runway frame (a, c) の軸分離 AABB 衝突（半径 0.3 膨張）＋
  段差（床高差 0.45 m 以下は登って追随、超えると阻止）の純粋関数。
- main.gd の徒歩モードはこの move() を使う形に変更（入力の意味は従来の step_walker と
  同一に保ち、world→runway frame 変換を挟む）。検証: ドア開口は通過可・壁の横は阻止、
  0.4 m 段差は登坂可・1.0 m は阻止、塔階段 1 便目の到達。

## 3. 項目1: 地面と光の正常化＋引き上げ

診断（PHASE4-WORLD-NOTES §1、テクスチャ平均色は PIL 実測、描画3条件の実測付き）:
Phase 3 スクショの「白〜水色に洗われる」原因は複合で、主因は次の 2 つだった。

1. **タイリング崩壊**: BoxMesh の UV は面ごとに 0..1 なのに材質の `uv1_scale = 1/repeat`
   だったため、大きな面ほどテクスチャの一角が引き伸ばされていた（放射状 streak の正体）。
   原典は triplanar の metricMaterial で「1タイル＝scale m」が常時成立していた。
2. **ミップ無し**: 全 .import が `mipmaps/generate=false`。原典は生成 ON＋異方性。
3. tint の色空間: 原典の sRGB 値を線形 albedo に直入れして一様に持ち上がっていた。
4. 環境側（素材では直せない）: 空アンビエント単独で asphalt が (0.18, 0.39, 0.58) まで
   青く出ることを実測。main.gd 側で対処した。

実施:
- world_build: 材質に tex_spec メタを持たせ、`_box` が支配面サイズから
  `uv1_scale = 面サイズ/repeat` のバリアントへ差し替え。法線/粗さも配線（packed *_nr は
  RG→RGB 法線を再構成し B に原典変換を掛けた粗さを生成、分離 *_n/*_r は舗装式を適用）。
  tint は `srgb_to_linear()` で原典の乗算と一致。
- airport_build: 舗装スラブにテクスチャ適用（asphalt 3.2 m / concrete 4.0 m、原典の割当て）。
- 全 .import: `mipmaps/generate=true`＋異方性フィルタ。
- 環境（main.gd、ノート §4 の推奨値）: トーンマップを FILMIC → **AgX**、露出 0.75、
  ambient_light_energy 0.45、フォグ（色 (0.62, 0.70, 0.82)、density 0.0002、sun_scatter
  0.25）、太陽 energy 1.1、シャドウは max_distance 800 / PARALLEL_4_SPLITS /
  bias 0.06 / normal_bias 1.2。
- 雲（新規 `src/sky_clouds.gd`）: 原典 clouds.js の SPOTS 7 箇所（雲底 1,080–1,420 m）に
  隣接塔を付けた計 14 枚の積雲ビルボード（実行時生成テクスチャ 512×288、
  BILLBOARD_FIXED_Y、alpha scissor 0.35）＋ 60,000 m 面 @2,600 m の層雲レイヤー
  （warp/自己影風シェーダ）。main.gd から build_clouds で配置。

## 4. 項目2: コックピット内装の本格化

- `src/cockpit_build.gd` を再構築（子ノード 40 弱 → 119）: 側壁は原典 `lowX(y)` プロファイル
  面、窓帯は格子から窓ポリゴン W1/W2/W3 のセルを欠いた**実開口**＋縁取り＋ガラス、
  フロントガラスは `wsZ(x, y)` 面＋Aピラー/上弓/中央柱、ルーフは `roofY` アーチ面。
  右ドアのシーム・ハンドル、内張り、シルトリム、アームレスト、Bピラーも追加。
- グレアシールド: リップ profile を掃引し `glareDrop`（中央 |x|≤0.25 フラット、四次曲線で
  |x|=0.545 に **28 mm** ドロップ。寸法の出所は glareshield 作業 commit a79cba2 の
  BOW=[0.25, 0.545, 0.028, 4]）を適用。パネル面もアーチ追随＋角ラップ（|x|=0.553 で
  12 mm 後方）。Aピラー足元にチーク。
- 頂点色 AO（`src/aircraft_visual.gd`）: COLOR_0.a を線形空間で rgb に乗じて焼く
  `bake_ao()` を実装（919/919 頂点で一致を検証）。HTML は間接光のみに AO を掛けるが、
  焼き込みは直射光まで暗くなる近似（ノートに明記）。
- 契約は不変: build_cockpit()、PFD_SLOT/MFD_SLOT の名前・位置・寸法、apply_materials()。
  実描画の verify_visual 33/33（AO 後も白・紺ピクセル健在）。EYE から左 W1/W3・右 W2 への
  視線無遮蔽を構造検証で確認し、Phase 2 の「狭い箱視界」は解消した。

## 5. 項目3: 空間オーディオ

- 新規 `src/audio_engine.gd`（`CadetAudioEngine`）: AudioServer バスをコードで構成
  （Master 配下に Engine / Wind / Weather / Mech / Alert、Engine バスに原典どおり
  LP 2 段＝車内 1000/2000 Hz ↔ 車外 9000/16000 Hz を inside で切替）。
  エンジン・風・雨は AudioStreamPlayer3D（機体追随）、Mech/Alert はワンショットプール。
- 音源は全て GDScript 実行時に AudioStreamWAV を手続き合成（エンジン点火パルス列、
  風/雨ノイズ、スタータ 2.7 s（圧縮の引きずり＋catch 窓）、バックファイア、ギアポンプ
  410 Hz、フラップ（pa44=モーター鋸波 165 Hz / pa28=ノッチクリック 3600 Hz）、
  ストールホーン 2800 Hz、チャイム、AP 切断ウォーブル等、全 15 ストリーム）。
- roughness 写像は原典 sfx.js（gameq 完成版）の実式に忠実: 揺らぎ
  `25 + 300*rough` cents（検証点 0.85 では +255 cents 増分で JS テストの「+150 超」を
  満たす。タスク文の 150/0.9 は原典コードの閾値ではなく JS テストの検証点だった旨を
  ノートに明示）、misfire は rough>0.02 から確率 rough*0.55 で脱落。
- rain は地上 hiss と機体バンド（IAS 連動）を分離。統合: main.gd が毎フレーム
  bridge.panel()＋物理状態（s.out.rough、eng.crankT=始動中、gear 遷移）から
  update_state を駆動し、レッスン終了で chime を鳴らす。雨量はキャリア天候から
  1 秒間隔で取得（rain キー、無ければ kind の rain 判定）。
- ヘッドレスでは音の良し悪しは判定不能（ダミードライバ）。実機試聴が最終判断（§9）。

## 6. 項目4: デバイス分離

- 新規 `src/device_map.gd`（`CadetDeviceMap`）: ロール（yoke/pedals/throttle、拡張可）への
  割当てをデバイス identity（`joy_name + "|" + joy_guid`）で保持し、段階マッチ
  （完全 100 / guid 90 / 名前完全 80 / 部分 60 / 逆包含 50）で再接続に追従する。
  **割当てたデバイスが無ければ -1 でそのロールは無効。他デバイスへフォールバックしない**
  （HTML 原典 dea08a5 の意味論どおり）。未割当の既定も原典どおり（yoke/pedals は先頭
  デバイス、throttle レバーは未割当時なし）。
- 永続化は `user://cadet_settings.cfg` の [devices]（他セクションを保持して再書込）。
  設定 UI（`build_settings_ui`）は接続中デバイス一覧（名前/guid/index）とロール別
  OptionButton を持ち、未接続の割当て済みデバイスも選択肢に残す。選択は即保存。
- 統合: bridge の readPad を main.gd の `_read_pad_merged` に差し替え（ロール解決 →
  merge_axes → 現行 readPad 契約 {stick, tr, tp, ty, brake} に変換、DZ 0.12 は従来どおり）。
  何も接続/割当てが無ければ従来の先頭パッド読みと完全一致。F12 で設定パネルを開閉し、
  joy 抜き差しで一覧を再構築する。
- 証跡は仕様どおり「割当てロジックの単体テスト（偽デバイス）＋デバイス一覧表示」まで。
  merged の throttle/prop/mixture は返すところまでで、controls.gd の消費側契約は
  変えていない（§9）。

## 7. 項目5: EFB タブレット

- 新規 `src/efb.gd`（`EFB` Control、Tab キーで開閉する HUD オーバーレイ）:
  - CHART: 空港図（RWY 36/18、平行・接続誘導路、エプロン、学園・塔マーカー、真上が北）。
    ジオメトリは PAVED / lab_rwy / world 定数から生成しテストで実数値と照合。
  - WB: 機種・搭乗・燃料・荷物の入力で `FlightPhysics.computeWB` の結果をそのまま表示
    （二重実装なし。全機種×5 搭載ケースで直接計算と完全一致）＋エンベロープ図プロット。
  - CHECKLIST: content.json の実チェックリスト（機種別・フェーズ別）をチェック可能
    リストで表示（項目数は content.json と全フェーズ一致を検証）。
- 機体切替（F11）と連動して EFB の機種・チェックリストも切り替わる。

## 8. 項目6: リプレイ＋外部カメラ＋プロファイルグラフ

- 記録: main.gd が飛行中 5 Hz で `CadetRecorder.snapshot` を蓄積する（橋渡し層は
  recorder を持たないため、シーン側で採取する設計にした。新規フライト開始でリセット）。
- 新規 `src/replay.gd`（`ReplayPlayer`）: サンプル間の補間（位置 lerp／姿勢 slerp）で
  機体ノードを駆動。カメラ 3 モード（tower=塔キャブ位置から注視 / chase=後方 /
  wing=翼端前方）を `frame_camera` で提供。高度→world Y は `alt_ft / FT`
  （地上 55 ft → GROUND_M と一致することを根拠として確認。recorder の h は既知の癖で
  常時 0 のため不使用）。
- 新規 `src/profile_graph.gd`（`ProfileGraph` Control）: 高度・IAS の時系列グラフ
  （軸・ラベル・タッチダウン位置マーカー）。レッスン終了時にデブリーフとして表示し、
  リプレイ中も表示する。
- 操作: P でリプレイ開始/終了（再生中は bridge を止め、C でカメラ切替）。

## 9. スクリーンショット所見（Xvfb＋llvmpipe、Phase 3 と同一アングル）

- `build/phase4-walk.png`（phase3-walk.png と同一ステージング）: Phase 3 で水色に流れていた
  舗装は、粒子のあるライトグレーのコンクリートに戻り、放射状 streak は消えた。芝は
  テクスチャの粒が見える緑。空は青のグラデーション＋地平の霞。残る弱点: 近景の芝に
  タイリングの反復感（モアレ状）がある（anti-tile 未実装、ノート §5 の申告どおり）。
  統合時に見つけた追加の落とし穴: フォグの `fog_sky_affect` 既定値 1.0 は空全体を
  フォグ色で塗るため、0.15 に下げて地平の霞だけを残した（下げ忘れると空が一様に
  灰色になることを撮影で確認して修正）。
- `build/phase4-cockpit.png`（phase2/3-cockpit と同一条件、上昇中 211 ft）: Phase 2 の
  「箱」視界は解消。フロントガラスの Aピラー・中央柱、大きく開いた側窓、28 mm アーチの
  グレアシールド稜線、その向こうのカウリングまで一望でき、G1000 はライブ表示。
- `build/phase4-external.png`（同一条件）: 白＋紺帯の Archer。AO 焼き込みで窓周りと
  胴体下部に陰影が戻った。
- `build/phase4-room.png`（新規アングル）: ブリーフィング室1の内壁・机と椅子・ホワイト
  ボード側に立つ教官 NPC（名前ラベル付き）が読める。統合時に主要 6 室へ室内灯
  （影なしオムニ）を追加した後の明るさで、それでもなお「基礎内装」の見た目であり、
  家具は箱の組み合わせ、天井は暗い。歩ける・衝突する・人が居る、までの到達点。

## 10. 成果物一覧

- `build/CADET-Phase4.exe` — 130,542,624 バイト（Windows x86_64、未署名。
  Phase 3 は 124,985,672 バイト）
- スクリーンショット: `build/phase4-walk.png` / `phase4-cockpit.png` /
  `phase4-external.png` / `phase4-room.png`
- 新規 src: sky_clouds.gd / dialog_ui.gd（DrillCore 内包）/ npc_build.gd /
  interior_build.gd / walk_physics.gd / audio_engine.gd / device_map.gd /
  efb.gd / replay.gd / profile_graph.gd
- 変更 src: world_build.gd / airport_build.gd（タイリング・テクスチャ）、
  cockpit_build.gd（内装再構築）、aircraft_visual.gd（AO 焼き込み）、
  scenes/main.gd（環境正常化＋全系統の統合配線）、assets/tex/*.import（ミップ）
- 新規テスト: run_p4world / verify_p4world / run_p4cockpit / run_audio /
  run_devices / run_p4scene / run_p4efb（合計 1,038 チェック）
- 系統別ノート 6 件（PHASE4-*-NOTES.md）

## 11. 未完・正直な申告

1. **実機でしか確認できない事項**（この VM は GPU なし・llvmpipe）:
   - CADET-Phase4.exe の Windows 実機起動と fps（Iris Xe 級）。Gate 2 の判定材料は
     依然として未取得で、本フェーズの見た目の最終適否も実機の目が要る。
   - 空間オーディオの音質・定位（ヘッドレスはダミードライバ。数値と構成のみ検証）。
   - 実ゲームパッド/ヨーク/ペダル/クアドラントでの割当て追従と操作感（証跡は
     ロジック検証＋一覧表示まで。同名 2 台時の guid 安定性も実機のみ）。
   - EFB・会話・ドリルの実プレイでの読みやすさと流れ（構造と完走は自動検証済み）。
2. 会話の統合範囲: 用意された dialog データ（intro 一式＋day1 の transit/return/apron 等）
   のうち、日次フローに結線したのは intro（開始）/ return（飛行後）/ transit（J キー）。
   予定項目ごとの会話割当て（brief/class/event 個別）は、対応する dialog id がデータ側に
   無いため作っていない。dayRadio はブリーフ表示までの結線で、レッスン内 ATC は従来どおり
   school 側が担う。
3. ドリル: k4 は簡略版（原典 chair-flight の op 項目・段階制・マイク復唱は未移植）、
   k3 は 12 種中 10 種、k5 は 10 場面の転記。不合格でもキャリア記帳は進む近似にした
   （合格時のみ成長を適用）。NPC は slot 変更時の再配置が未配線（起動時 am/ch1 配置のみ）。
4. 内装: ドア扉の開閉なし、家具の衝突は壁 AABB に含まれない、学園の階段（2 階/屋上）は
   床・段とも未対応（塔のみ）。室内は室内灯 6 灯で読める明るさにしたが、見た目は基礎。
   歩行は点＋半径方式のため高速移動では薄壁をすり抜けうる（通常速度では問題なし）。
5. 地面: タイリングは支配面のみ正確（BoxMesh の制約。完全な triplanar 化は材質型と
   既存テスト前提を守るため見送り）。anti-tile 無し。雲は静的配置（漂流・天候連動なし）、
   層雲はシェーダ近似で太陽連動の陰影なし。AO 焼き込みは直射光まで暗くなる近似。
6. オーディオ: pa44 の双発 2 ボイス（左右パン＋うなり）は状態契約が単一 rpm のため
   1 ボイス。車内 boom（105 Hz peaking）、ドップラー、設定画面の群ボリューム接続は未搭載。
   backfire は原典に独立関数が無く misfire の対として新規合成した派生（ノート明記）。
7. デバイス: merge_axes の throttle/prop/mixture は controls.gd の消費側に未接続
   （現行 readPad 契約にチャンネルが無いため。統合判断として持ち越し）。軸番号の変更 UI
   は未実装（API/設定ファイル経由）。ボタンのデバイス別割当ては対象外（原典同様）。
8. リプレイは位置・姿勢のみ（ギア/フラップ/プロペラの見た目は未連動）。記録はシーン側の
   5 Hz サンプリングで、recorder の CSV/GPX 記録とは別系統（エクスポートは Phase 3 の
   recorder が引き続き担当）。EFB は HUD オーバーレイ形式で、コックピット内 3D
   タブレット面への貼り込みはしていない。チェックリストの判定（__fn）は school 側の
   既存機構が担当し、EFB 側は表示・チェック操作のみ。
9. テスト実行の注記（§1 の再掲）: 一部スイートは totals 出力後に VM 既知の glibc
   teardown abort で終了コード 134 になる（ベースラインでも再現する既存事象）。
   合否は totals の「失敗 0」で判定した。

