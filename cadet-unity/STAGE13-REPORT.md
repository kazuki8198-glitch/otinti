# STAGE 13 — G1000 グラス描画移植（PFD/MFD）

対象： 優先項目4（G1000 グラス描画。描画 ops のゴールデン照合）。

## 実装

- `tools/golden-g1000.mjs`（新規）： 実 `avionics.js` の `drawPFD`/`drawMFD` を記録キャンバスで実行し、
  脚本化した区間（pa28 駐機→離陸→3,000 ft 巡航で MAP/FPL/SYSTEM/NRST ページツアー、ダイレクトトゥ、
  トランスポンダ入力、ALERTS ページ、AHRS 故障、GPS 故障、gearRev、FPL 編集、プロシージャ読込、
  VOR アプローチ、着陸・エンジン停止／pa44 巡航＋片発停止フェザー／b737 巡航のジェット分岐）を
  23 レコードのゴールデン `flight/test/golden-g1000.jsonl`（約931 KB）として出力。
  g1000.js の panelText 置換もレコーダ側で再現。
- `flight/src/CadetG1000Draw.cs`（新規）： `drawPFD`/`drawMFD` ＋ `drawMap`/`drawFPL`/`drawEnginePage`/
  `drawSystemPage`/`drawNrstPage`/`gearBox` の完全移植（IBCanvas 上）。
  フレーム型 `G1000Frame` は g1000.js の `fill()` 相当（O, Av, AcId, OnGround, V, FuelCap, Pos, Eng 群，
  Traffic, GearRev, ElecState, Qnh, VarW ＋ JS の `o.volts == null` 等の有無判定用フラグ
  VoltsKnown/AmpsKnown/FuelPressKnown/HobbsKnown）。航法解は `AvionicsControl.NavSolve` を内部使用。
  Sanford 滑走路は定数として埋め込み（端点は sanford-course.js と同じ計算）。panelText 置換は Txt() 内で AcId により適用。
- `CadetAvionics.cs` に描画用状態を追加： `EgtPeak`、`FuelInit`、`AlertsUnacked`
  （JS の `av._egtPeak`/`_fuelInit`/`_alertsUnacked`）。
- `flight/test/BotG1000Cs.cs`（新規）： ゴールデン再生ハーネス（記録 IBCanvas ＋ JS ops 正規化は
  BotBoeingCs から複写、JsFont のウェイト 500/800 処理を改良）。

## 照合結果

- **23 レコード × PFD+MFD、C# 側 11,319 ops、不一致ユニット 0**（`LINE REAL FLIGHT` ハーネスと別建てで実行し PASS を確認）。

## 生成側で見つけて直した不具合（原典側ではない）

1. dExtra.o のスプレッドが物理出力を丸ごと置換していた → 合成済み d.o からスナップショット（snapComposed）。
2. ダイレクトトゥは実フローで再現（navSolve が directFrom に 'P.POS' をラッチ、snapAv が directFromId を記録、
   ハーネスが av.DirectFromId を設定）。
3. 描画修正 1 件： MFD の DIS テキストは nav.To が空のとき "---"（C# NavSolution.To の既定 "" と JS null の差）。

## シーン内結線

- `unity/G1000GlassMain.cs`（新規）： 1280×800 RasterCanvas 2 基をコックピット操作 view.pfd/view.mfd に結線。
  BuildFrame() は CockpitMain（S/Av/Sys）から構築（エンジン表示は Sys.Eng 文字列または Sys.Twin[i].Eng、
  rpm は Out.Rpms、フェザーは S.Eng[i].Feather）。PFD/MFD が暗い（Sys.Elec.PfdOn/MfdOn false）場合は黒描画。
  双発＋MFD 暗転時は PFD に GearRev。`Pump()` をドライバ用に公開。Update() は b737 をスキップ。
- GameSceneSetup に G1000Glass＋BoeingGlass の GameObject を追加（両方とも CockpitMain に結線）。
  BoeingGlassMain.Update にシーン内 b737 セッション用の遅延バインド（3 行）を追加
  （アクセプタンスドライバは従来どおり明示バインド）。

## 未検証（最終パスで確認予定）

- /opt へ同期→Game シーン再構築→フリーモードのコックピットセッション中に
  G1000GlassMain.Bound ＋ テクスチャが黒でないことの確認（STAGE 15 以降の統合アクセプタンスに折り込む）。
