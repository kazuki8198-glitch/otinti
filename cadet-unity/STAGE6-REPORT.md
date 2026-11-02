# STAGE 6 REPORT — コックピット 3D 操作子（見た目と操作の層・前半）

対象： PORT-CHECKLIST §11 のコックピット操作子。正本は最新の HTML ツリー
`cadet-wt-free` @93441f6（growth/free-mode = 現行デフォルト f74ab60 相当）。
前半（Stage 1–5）の正本だった wt-all @16e35aa からの差分も取り込んだ。

## 取り込んだ正本差分（wt-all → wt-free）
- systems.js 差分（64行）を CadetSystems.cs へ全適用：ブレーカー配線
  （cbMASTER でバス全体断、cbALTFLD でオルタネータ断、負荷ごとの CB ゲート、
  pfdOn/mfdOn の CB 条件、elec.cbAhrs/cbGps 暴露）、standby 減衰条件の
  !pfdOn→!busLive 化、boostPump/pitotHeat への CB ゲート、燃料枯渇の停止
  追随（単発・双発とも、理由文字列つき）、FUEL PRESS 閾値 0.25→0.5、
  powered/avionicsOn への !cbMASTER 追加。
- autopilot.js 差分を CadetAutopilot.cs へ：Control の (dir, big) 化、
  MCP_ALT / AT_SPD / AT_ARM / AP_DISC / AP_VS_ADJ / AP_LVLCHG、
  オートスロットル法則（ジェットのみ・IAS の PI)、LVL CHG 法則、
  Sync への av.at / lvlChg / gsCap 追加。AvionicsState に At を追加。
- boeing.js の状態機械（efis/du/cdu＋cduKey）を CadetBoeing.cs として新規移植。

## 成果物
- `tools/extract-cockpit.mjs` — cockpit.js の手続き生成をそのまま実行して
  全操作子の形状・位置・ラベルを抽出 → `data/cockpit-controls.json`。
  個数は現行 HTML と一致： **pa28 = 144 / pa44 = 150 / b737 = 96**。
- `flight/src/CadetCockpit.cs` — act()（意図生成）と Apply()（fly-mode.js の
  applyAct と同意味論）の移植。`CadetG1000Keys.cs`（ソフトキー表）、
  `CadetBoeing.cs`（737 の表示状態＋CDU キー処理）。
- `unity/CockpitMain.cs` — 抽出形状から全操作子をメッシュ生成し、
  レイキャストでクリック／ホイールを受けて上記ロジックへ結線。
  `unity/CockpitDriver.cs` + `Assets/Editor/CockpitAcceptance.cs` が受け入れ試験。

## 検証（証跡）
1. **意図ストリーム同値**： `tools/golden-cockpit.mjs` が実物の cockpit.js を
   controls-functional と同じリグ（LAB スタンド駐機・cold/run/ground の
   5文脈）で全操作子×4押し方（クリック／ホイール±）叩き、意図と 737 の
   boeing 状態ダイジェストを記録（`flight/test/golden-cockpit.jsonl`)。
   C# ハーネス `flight/test/BotCockpitCs.cs` が同条件で再生し全件比較：
   **2736/2736 一致**（意図＋boeing ダイジェスト、例外 0)。
   途中で見つけて直した移植側の誤り： MAG 順序（OFF,R,L,BOTH,START)、
   ロッカーのホイール意味論（回す＝ON/OFF セット、クリック＝トグル）、
   ミクスチャーのホイール刻み 0.1 とクリック閾値 0.95、ソフトキー／MENU の
   info フォールバック、ND レンジの循環表 [10,20,40,80,160]、DU OUT の
   PFD↔ND、CDU dirty の初期値、info 文言 6 件。
2. **エンジン内受け入れ**（Unity バッチ、Play Mode)：
   - 個数 144/150/96 ✓
   - 視点からのレイキャスト直接ピック： pa28 136/144、pa44 144/150、b737 96/96
     （残りはヨークや隣接ノブの陰 — 実機でも接写ビューで扱う対象。対象 id は
     cockpit-done.txt に記録）
   - 全操作子×4押し方を実セッションで押下： **例外 0**
   - **コックピット操作のみでコールドスタート** (Archer): バッテリー→
     アビオニクス→ミクスチャー→プライマー×3→スロットル→マグ START で
     1.5 秒後にエンジン run (rpm 685)。キーに触れると BOTH へ自動復帰も確認。
   - ランナップ（約1600 rpm): L ドロップ 67、R ドロップ 48、キャブヒート
     ドロップ 60 — いずれも妥当帯域内（数値同値そのものは Stage 3 の
     systems 404/404 で証明済み。ここはエンジン内スモークチェック）。
   - スクリーンショット： `stage6-cockpit.png`（抽出形状の仮メッシュによる
     パネル配置。画面の絵そのものは Stage 7）。

## 未達・正直な残件
- メッシュは抽出ヒット形状の仮置き（箱・円柱＋パネルシェル）。実機の
  glb シェルへの被せ、ラベル文字、ランプ類は Stage 7 以降。
- 視点から直接ピックできない 14 個（pa28 8 / pa44 6）は接写ビュー
  （Stage 7 の panel-view）側で到達可能にする前提。
- セッションは「駐機した 1 機」のデモ構成。キャリア／レッスンの実フロー
  （LessonMain）へのコックピット結線は Stage 8/12 の画面通しで扱う。
- j1 の before_takeoff_jet はボットがチェックリストに答えないための停止で、
  コックピット層の欠落ではないことを確認した（項目は物理 State の述語。
  HTML 側で問題だったジェットの電気スイッチ 8 件は b737 操作子に含まれる）。
