# CADET Unity 移植チェックリスト（欠落ゼロ用）

作成: 2026-11-02 / 正本: `~/workspace/cadet-wt-all`（統合ツリー、git tip `16e35aa` "integrate/all-20261101"）
目的: Godot 移植で発生した「大量欠落」を Unity 移植で再発させないための、移行対象の全数リスト。
凡例: **★ = Godot 版で実際に抜けた/未接続だった項目**（特に注意）。検証方法はすべて「実入力の自動テスト」か「JS 参照値との同値チェック」を原則とする（ロジック同値だけを「完了」と呼ばない）。

> 正本ツリー外の確定済み追加分（別ブランチ。本ツリーには含まれないが、移植対象から落とさないため別表に記載）:
> 座学リデザイン＋ペース選択復旧（growth/zagaku-redesign / zagaku-choice）、シミュレーター室の実用化（growth/sim-room 7231f4b）、ANA 必須知識トリアージ表示（growth/ana-triage 2d40701）、AI 教官フルボイス実装（growth/ai-instructors）。詳細は §14。

---

## 1. アプリ基盤・シェル

| 項目 | 正本の所在 | 移植手段 | 検証方法 |
|---|---|---|---|
| タイトル/メインメニュー（モード選択・設定・続きから） | `cadet/src/ui/menu.js`, `cadet/src/main.js` | C# 書き直し（uGUI） | 実入力テスト: コールドブート→各ボタンで遷移 |
| 設定（画質・音量・キー割当・パッドマップ・AI/マイク・言語） | `cadet/src/ui/settings.js`, `core/quality.js` | C# 書き直し | 設定変更→再起動で保持を自動確認 |
| セーブ/ロード（バージョン付き、移行処理） | `cadet/src/core/save.js`（localStorage `cadet.save`）, `career/career.js` の state | C# 書き直し（JSON ファイル化） | セーブ→再起動→復元の往復テスト |
| 日英切替（UI・会話・試験の英語モード） | `cadet/src/content/dialog/en.js`, `test/english.test.mjs` | データ変換＋C# | 英語モードで主要画面の文字列欠落チェック |
| ベンチ/品質自動調整（fps 計測と段階的劣化） | `cadet/src/core/bench-report.js`, `core/quality.js` | C# 書き直し | 低負荷環境での段階遷移ログ確認 |

## 2. 飛行物理・機体システム

| 項目 | 正本の所在 | 移植手段 | 検証方法 |
|---|---|---|---|
| ブレード要素飛行モデル（翼.strip分割、失速、地面効果、プロペラ左転傾向、乱気流） | `flight-lab/src/physics.js`（1,204 行） | C# 移植（縦切りで先行実施） | JS 参照値との同値チェック（固定入力系列→状態時系列の一致） |
| 機体データ: PA-28 Archer / PA-44 Seminole（双発・片発）/ PA-28R Arrow（複雑機） | 同上 AIRCRAFT 定義、`cadet/src/aircraft/registrations.js` | データ変換 | 各機の基準速度・離陸距離の JS 値一致 |
| ジェット機モデル（737 級: スプール遅れ・N1・逆推力・スポイラー） | `physics.js` の jet 拡張、`flight-lab/test/jet.test.mjs` | C# 移植 | jet.test 相当の同値チェック（離陸 1,741 m @62t 等） |
| 機体システム（電気・燃料・磁気コンパス等、スイッチ連動） | `cadet/src/aircraft/systems.js` | C# 書き直し | スイッチ操作→系統状態の単体テスト |
| 故障・不具合（レッスン故障、プリフライト欠陥 p=0.20、エンジン異常） | `cadet/src/aircraft/failures.js`, `test/failures.test.mjs` | C# 書き直し | 故障注入→症状・対処の分岐テスト |
| オートパイロット（HDG+ALT、800 ft AGL 以上、200 ft で自動解除） | `cadet/src/flight/autopilot.js` | C# 移植 | 同値チェック＋実入力テスト |
| アビオニクス / G1000（PFD/MFD、NAV/COM、進入方式、LPV） ★一部未完だった | `cadet/src/aircraft/g1000.js`（322 行）, `flight-lab/src/avionics.js` | C# 書き直し | 表示値と物理状態の一致テスト、進入の通しテスト |
| 飛行解析・標準採点（standards scoring） | `cadet/src/flight/analysis.js`, `flight/profile.js` | C# 移植 | JS 参照フライトでの採点一致 |

## 3. 飛行レッスン（全 69 課目、`flight-lab/src/syllabus.js`）

| 系統 | 課目 | 備考 |
|---|---|---|
| 段階0 地上 | s0 | ロンドン座学相当の導入 |
| Archer 基礎 | s1, a1–a8, t1–t4, e1–e4, c1 | 失速・場周・緊急・ソロ前審査 |
| 航法・横風 | s2, x1–x3, n1–n3 | VOR・推測航法・ダイバート |
| 計器 | s3, i1–i8 | 部分パネル、ILS/RNAV 進入、実 IMC |
| 双発 Seminole | s4, m1–m5, e6 | 片発・Vmc・離陸判断 |
| CRM/TEM | s5, r1 | |
| 複雑機 Arrow | s6, cx1–cx3 | ch7 エンドースメント |
| CFI（教える側） ★Godot では cf1 のみ | cf1, cf2, cf3 | |
| 型式移行（737 級） ★Godot では全欠落 | s7, j1–j5 | j5 = 型式限定チェック |
| FTD 地上課目 | k1–k6 | §7 のシミュレーター室と連動 |

- 移植手段: レッスン定義（目標・採点・教官セリフ・無線）はデータ変換、進行管理は C# 書き直し（`flight-lab/src/school.js`, `cadet/src/content/school.js`）。
- 検証方法: 全課目をボット操縦で完走させる通しテスト（HTML 側 `career-run` / `fo-run` テスト相当）＋人手相当の実入力スポットチェック（a1, t2, i5, j1 は必須）。

## 4. キャリア進行（卒業前）

| 項目 | 正本の所在 | 移植手段 | 検証方法 |
|---|---|---|---|
| 章立て: 序章＋ch1–ch7（入学→座学→初ソロ→航法→計器→双発→最終→複雑機） | `cadet/src/career/career.js` CHAPTERS | C# 書き直し | ボットで序章→卒業の通しテスト |
| 日次ループ（予定表・午前/午後・夕方イベント・就寝） | `cadet/src/career/day.js`, `content/day-flow.js` | C# 書き直し | 日送りの状態遷移テスト ★Godot では日程ループにバグ（day 2 に進めない）があった |
| 成長 4 軸（操縦/知識/交信/判断、逓減式）＋レッスン連続スコア | `career.js`, `flight-lab` 側スコア永続 | データ＋C# | 成長量の JS 参照値一致 |
| 疲労・IMSAFE（疲労≥65 で成長半減、申告で判断+2.0） | `career/tem.js`, career 仕様 | C# 書き直し | 閾値前後の分岐テスト |
| 信頼度（ソロ条件 SOLO_TRUST=60、判断ゲート） | `career.js` | C# 書き直し | ゲート条件テスト |
| 筆記試験 8 種（30 問・真の 80%・バンク別 60% 床・弱点表示） | `career.js` EXAMS, `flight-lab/src/quiz.js` のバンク群 | データ変換＋C# | 全バンク出題・合否判定テスト |
| 審査（xc / ir / me / final / cx / typerate） | `career.js` CHECKS | C# 書き直し | 各審査の完走テスト |
| 卒業評価（複合＋初回率＋試験回数、「優等」） | `career.js`, epilogue | C# 書き直し | 評価計算の参照値一致 |
| ログブック/デブリーフ（記録・プロファイルグラフ・GPX/CSV） | `career/logbook.js`, `flight/recorder.js` | C# 書き直し | 出力ファイルの内容照合 |
| アーカイブ（過去の記録閲覧） | `career/archive.js` | C# 書き直し | 表示テスト |

## 5. 副操縦士フェーズ（卒業後）★Godot では丸ごと欠落

| 項目 | 正本の所在 | 移植手段 | 検証方法 |
|---|---|---|---|
| エアライン入社・型式学科（q_jet/q_jperf/q_jsys） | `career.js` fo1, EXAMS.type | データ変換＋C# | 試験テスト |
| 737 型式課目 j1–j5＋型式限定チェック | `syllabus.js`, CHECKS.typerate | §3 と同一基盤 | ボット完走 |
| 羽田ラインフライング（4 路線、PF/PM 交代、両方採点） | `cadet/src/flight/line.js`, `epilogue/haneda.js`, FO_ROUTES | C# 書き直し | セクター完走テスト |
| 【Stage 10 済】ライン機械＋画面: CadetLine 逐語移植（ゴールデン 9 シナリオ＋lineBrief 深比較一致）、LineMain 画面から PF/PM 勤務→デブリーフ→RecordLeg 記録を通し検証。画面の PF 飛行は原典テストと同じ観測プロファイル駆動（実フライト結線は §12 統合時） | `flight/src/CadetLine.cs`, `unity/LineMain.cs` | — | STAGE10-REPORT |
| 【Stage 10 済】フリーモード画面: CadetFreeMode 逐語移植（全組合せ 45 件ゴールデン一致）、FreeModeMain（機体×開始×時刻×風×搭載×故障）→ cfg → セッション開始、キャリア状態不変を検証 | `flight/src/CadetFreeMode.cs`, `unity/FreeModeMain.cs` | — | STAGE10-REPORT |
| 機長 3 名（厳しさ係数つき評価）＋審査官 | `career.js` FO_CAPTAINS, `content/dialog/first-officer.js` | データ変換 | 評価係数の反映テスト |
| 運航イベント 8 本（正しい運航中止＝記録なし、乱気流・ダイバート・ホールディング燃料計算） | `flight/line.js`, `flight/divert.js`, `flight/hold.js` | C# 書き直し | 各イベントの分岐テスト |
| ラインチェック（≥12 セクター＋≥900 分、落第時は +4 セクター後） | `career.js` foLineCheckReady | C# 書き直し | 境界条件テスト |
| 疲労規則（1 レグ +26、連続勤務 ≤4 日、≥65 は休養日） | `career.js` FO 規則 | C# 書き直し | ロスター遷移テスト |
| 卒業後エピローグ（羽田・出発） | `epilogue/departure.js`, `epilogue/haneda.js` | C# 書き直し | 通しテスト |

## 6. 座学（第 1 章）

| 項目 | 正本の所在 | 移植手段 | 検証方法 |
|---|---|---|---|
| 講義 11 科目（aero/sys/perf/wx/law/radio1–5/hf）を 6 日に配当 | `career.js` CLASSES, `content/school.js`（1,255 行） | データ変換＋C# | 全科目の完走テスト |
| 教科書（全章・図表） | `content/book.js`, `lecture-notes/*.js`, `flight-lab/src/book-*.js` | データ変換（JSON 化） | 章・節の欠落数照合 |
| 講義ノート/要約 | `content/lecture-summaries.js`, `lecture-units.js` | データ変換 | 同上 |
| ペース選択（通読/速習で聞いた節の扱いが変わる） | `career.js` PACE_IDS, `school.js` PACES | C# 書き直し | 両ペースの進捗記録テスト |
| 夕方イベント（実機での 4 力確認、ピトー/燃料、METAR 判断、IMSAFE 等 7 本） | `career.js` CH1_EVENTS, `content/dialog/ch1-events.js` | データ変換＋C# | 各イベント発火テスト |
| 判断ドリル（気象判断、1 日 2 回まで） | `career/guide.js`, school 仕様 | C# 書き直し | ドリル→成長反映テスト |
| チェアフライト（交信の机上練習） | `content/chair-flight.js`, `dialog/chair-flight.js`, `ui/chair-screen.js` | C# 書き直し | 通しテスト |

## 7. シミュレーター室 / FTD

| 項目 | 正本の所在 | 移植手段 | 検証方法 |
|---|---|---|---|
| FTD 課目 k1–k6（PFD 読み・数字/アルファベット・チェアフライト・復唱・聞き取り） | `career.js` GROUND/FTD_TITLES, FLIGHT LAB stage 0 | C# 書き直し | 各課目の完走・採点テスト |
| 教室の PFD 表示・ボード連動 | `world/lecture-screen.js`, `world/boards.js` | C# 書き直し | 表示テスト |
| （別ブランチ）FTD 席の実用化: 起動→メニュー→実レッスン/フリー練習/無線練習 ★ | growth/sim-room（§14） | C# 書き直し | 席→電源→k1 完走→記録の通しテスト |

## 8. 会話・人物・AI 教官

| 項目 | 正本の所在 | 移植手段 | 検証方法 |
|---|---|---|---|
| 会話エンジン（分岐・フラグ・信頼・ノード管理） | `cadet/src/dialog/engine.js`, `dialog/validate.js` | C# 書き直し | 全会話データの到達可能性検証（validate 相当） |
| 会話データ一式（day1・教官・審査・FO・ATC・エピローグ等） | `content/dialog/*.js`（12 ファイル） | データ変換（JSON 化） | ノード数の照合 |
| 登場人物 10 名＋機長 3 名（設定・信頼帯・配置） | `content/people.js` PEOPLE, `npc/cast.js` | データ変換 | 表示・配置テスト |
| NPC の 3D 表現（顔設計・髪・歩行・群衆） ★Godot では造形が全欠落 | `npc/actor.js`, `actor-model.js`, `face-design.js`, `crowd.js`, `walker-npc.js` ＋ `assets/model/actor.glb`, `actor-near.glb` | glb 流用＋シェーダ再現（セル調 SDF 顔影は要再実装） | スクリーンショット比較（同一条件） |
| AI 教官（早瀬＋全員ペルソナ、自由質問、信号別フィードバック） ★Godot では会話 UI 未接続 | `cadet/src/ai/tutor.js`, `ai/session.js`, `ai/keys.js` | C# 書き直し（HTTP クライアント） | モック応答での分岐テスト。API キーは Secure Vault 経由 |
| 【Stage 11 済（モックまで）】CadetAiMock（6 名の専門別キーワード応答＋フォールバック）＋ AiAskMain パネル結線、受け入れ PASS。本物 API は未接続（キーは Secure Vault 前提、コードはキーに触れない） | `core/src/CadetAiMock.cs`, `unity/AiAskMain.cs` | — | STAGE11-REPORT |
| フルボイス（全キャラ TTS・話者別ピッチ/速度・プレイヤー台詞・飛行中コールアウト） ★ | `ai/tutor.js` §10 仕様、`ui/settings.js` voice | C#（OS TTS 連携） | 設定 ON で発話イベント発火の確認 |
| 【Stage 11 未達】TTS：本 VM に TTS エンジンが皆無（espeak/flite/festival/pico2wave/spd-say/pyttsx3 いずれも無し）、Unity にも標準 TTS は無い。原典はブラウザの speechSynthesis（OS 音声）依存。Windows 実機では SAPI ブリッジ等のネイティブプラグインが別途必要 | — | — | STAGE11-REPORT |
| 無線/ATC（管制交信・他機トラフィック・復唱） | `dialog/atc.js`, `content/dialog/atc.js`, `flight/traffic.js`, `dialog/readback.js` | C# 書き直し | 交信シナリオの通しテスト |
| 音声リードバック（マイク入力・要点照合） ★Godot では STT 未実装 | `dialog/readback.js`, `ui/mic.js`（Chrome 音声認識依存） | ネイティブ STT（ローカル Whisper 想定）に置換 | 録音サンプルでの照合テスト |
| 【Stage 11 検証済】ローカル Whisper は導入可能：faster-whisper（tiny/CPU）で JFK サンプルを原文通り書き起こし成功。openai-whisper 本体も導入済みだが torch の取得が本 VM の回線制約（1接続≈112MB 上限）で未完。Unity への組み込み（マイク→STT→要点照合）は未実施 | `tools/stt-verify.py` | — | STAGE11-REPORT |

## 9. 世界・場所・移動

| 項目 | 正本の所在 | 移植手段 | 検証方法 |
|---|---|---|---|
| 学園レイアウト（教室・教官室・運航管理・整備・ラウンジ・企画室 等） | `content/academy-spec.js`, `world/academy.js`, `world/layout.js` | データ変換＋C# 配置 | 全室の到達テスト |
| 寮（自室・共用部） | `content/dorm-spec.js`, `world/dorm.js` | 同上 | 同上 |
| 管制塔・格納庫 | `content/tower-spec.js`, `hangar-spec.js`, `world/tower.js` | 同上 | 同上 |
| 飛行場（LAB RWY 36・誘導路・エプロン・湖） | `flight-lab/src/physics.js` の世界定義, `world/airfield.js`, `flight/airfields.js`（羽田等） | データ変換 | 舗装判定の同値チェック |
| 歩行モード（衝突・ドア・段差・対話インタラクト） | `player/walker.js`, `player/collide.js`, `player/interact.js`, `world/doors.js` | C# 書き直し | 移動・衝突の自動テスト |
| 備品・掲示・小物（usable） | `content/usable.js`, `world/props.js`, `world/boards.js` | データ変換 | インタラクト網羅テスト |
| 空・雲・霞・天候・時刻 | `render/sky.js`, `world/clouds.js`, `render/haze.js`, `flight/cb.js` | C#＋シェーダ | スクリーンショット比較 |
| 地面・植生・ランドマーク | `world/ground.js`, `vegetation.js`, `landmarks.js`, `strip.js` | データ変換＋C# | スクリーンショット比較 |
| 他機トラフィック表示 | `flight/traffic-view.js`, `flight/traffic.js` | C# 書き直し | 生成・衝突回避ロジックテスト |

## 10. コックピット・計器

| 項目 | 正本の所在 | 移植手段 | 検証方法 |
|---|---|---|---|
| コックピット 3D（glb シェル＋コード生成スイッチ群、Archer 119 / Seminole 128 操作子） | `aircraft/cockpit.js`（1,465 行）, `assets/model/archer.glb`（コックピット内包） | glb 流用＋C# で操作子再構築 | 全操作子のクリック→系統反応テスト（ユーザーの「全ボタン検証」要求に対応） |
| 外観モデル（Archer/Seminole/Arrow/737、遠景モデル） | `aircraft/exterior.js`, `assets/model/*.glb`（7 点） | glb 流用 | スクリーンショット比較 |
| 計器接写ビュー（I キー巡回、ホイールズーム 16°、Tab パネルモード） | `flight/panel-view.js` | C# 書き直し | 実入力テスト |
| ウォークアラウンド（点検ポイント Archer 18 / Seminole 19） | `aircraft/walkaround.js`, `content/walkaround-*.js`, `aircraft/walkaround-props.js` | データ変換＋C# | 全ポイントの判定テスト |
| チェックリスト（Archer/Seminole/ジェット） | `content/checklists-*.js` | データ変換 | 項目数の照合 |
| 737 コックピット画面の再現（ユーザ
...[truncated 1451 chars]> 【復元追記 2026-11-02・本移植 Stage 1】このファイルは保存時に §10 の最終行の途中で切断されており、§11〜§14 が欠落していた。以下は、縦切りレポート・スパイクレポート・本移植の段階定義に残る参照（§11=ゲームパッド経路の残置先、§14=外部ブランチ）から再構築したもの。原文そのものではない。

## 11. 入力デバイス

| 項目 | 正本の所在 | 移植手段 | 検証方法 |
|---|---|---|---|
| ゲームパッド入力（padInput / padMap、軸・ボタンの割当） | `cadet/src/flight/controls.js`, `core/input.js` | C# 移植（縦切りでは範囲外として残置） | 仮想パッド入力での同値チェック＋実機スポット確認 |
| ヨーク/ペダル/スロットル等の複数デバイス識別・軸割当 ★Godot ではスロットル軸等が未接続 | `core/input.js`, `ui/settings.js` | C# 書き直し（Unity Input System） | デバイス列挙と割当の保存・復元テスト |
| 【Stage 11 済】Input System 1.11.2 導入、DevicesMain（列挙・既定割当・保存/復元・Poll）受け入れ PASS。VM 内は物理デバイス 0 件のため実機確認はユーザー PC 待ち。飛行ループへの実消費は §12 統合時 | `unity/DevicesMain.cs` | — | STAGE11-REPORT |
| キー割当の変更・保存 | `ui/settings.js` | C# 書き直し | 変更→再起動で保持を確認 |

## 12. 音響

| 項目 | 正本の所在 | 移植手段 | 検証方法 |
|---|---|---|---|
| 効果音（エンジン・風・雨・ギア・フラップ・警告、異常音） | `cadet/src/audio/sfx.js` | 手続き生成＋C# 再生系 | 発火条件のテスト、実機での聴取確認 |
| 【Stage 11 済】sfx グラフ移植 CadetSfx（ゴールデン 1,703 エントリ完全一致）＋可聴フォロワ SfxMain（LiveState 駆動、受け入れ PASS）。環境音（風・空調・鳥・遠方の機影）もグラフ側に含む | `flight/src/CadetSfx.cs`, `unity/SfxMain.cs` | — | STAGE11-REPORT |
| 空間音響（距離・方向の減衰） | `audio/sfx.js`, three.js の音響 | Unity AudioSource の 3D 化 | 位置を変えた再生テスト |
| 【Stage 11 部分】コックピット内は原典通りステレオ定位のみ。ワールド側ワンショット（ドア・足音）は SfxMain.PlayOneShotAt で 3D 減衰再生可能。常設エミッタの配置は §12 統合時 | `unity/SfxMain.cs` | — | STAGE11-REPORT |
| BGM/環境音（該当分） | `audio/` 一式 | C# 書き直し | シーン遷移での発火確認 |

## 13. ビルド・配布・受け入れ

| 項目 | 正本の所在 | 移植手段 | 検証方法 |
|---|---|---|---|
| Windows プレイヤーのリリースビルド | —（Unity 側） | バッチビルド | クリーンビルド→起動→タイトル到達 |
| コールドブート受け入れ（タイトル→キャリア→卒業→副操縦士） | 全体 | 実入力の自動テスト | 通しテストの数値ログ |
| 本チェックリストの最終照合 | 本書 | 項目単位の達成/未達一覧 | Stage 5 レポート |

## 14. 外部ブランチ（正本ツリー外の確定済み追加分）

| 項目 | 所在 | 備考 |
|---|---|---|
| 座学リデザイン＋ペース選択復旧 | growth/zagaku-redesign / zagaku-choice（マージ頭 5aa942b） | §6 の座学仕様の最新形。統合ツリーの座学より新しい |
| シミュレーター室の実用化 | growth/sim-room 7231f4b | §7 の FTD 席（起動→メニュー→実レッスン） |
| ANA 必須知識トリアージ表示 | growth/ana-triage 2d40701 | 実 ANA 訓練生に必須の知識と、そうでないものの表示分離 |
| AI 教官フルボイス実装 | growth/ai-instructors | §8 の AI 教官・フルボイスの実装ブランチ |
