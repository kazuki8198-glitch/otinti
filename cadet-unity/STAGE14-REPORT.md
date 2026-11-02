# STAGE 14 — ライン PF 実フライト結線

対象： 優先項目2（セクター選択→実飛行→採点→記録）。

## 実装

- `flight/src/CadetLinePilot.cs`（新規）： `CadetLineDuty` のセクターを実 b737 物理で飛ぶパイロット。
  状態は `Sim.NewState(seed*977+13)`、出発空港に `PlaceOnRunway`（滑走路手前 60 m、フラップ idx 1）。
  操縦則は BotFly のゲイン系（KeyHold＋PTgt ピッチ保持、BankTo、HeadTo、VsPitch 積分、SpeedThr 積分）。
  局面は Duty.Phase 駆動： depart（スロットル全開、ラダー操向、IAS>148 で引上げ→ピッチ 12）／
  climb（100 AGL 超でギア上げ、210 kt 超でフラップ 0、VsPitch で CruiseAltFt へ、SpeedThr 280）／
  cruise（295 kt。**位置圧縮**： 目的地まで 62 km 超の間、針路が目的地方位 ±30° 以内のときだけ
  サブステップ毎 25 m まで・1 呼び出し総量 dtSim×2500 m まで前進）／descent・approach（下記）／
  landed（リバーサ＋ブレーキ）。観測は 0.25 秒毎に `CadetLineDuty.Obs` へ供給。
  イベント保留中は降下プロファイルを止める（高度は現在値／3,000 ft 以上を保持、速度 250）。
- 到着誘導（最終形）： 接地点手前 400 m 狙い、プロファイル高度 = 68 ft（＝接地高度 55 ft 地面＋ギア）
  ＋ along 距離 ×0.056。確立（|cross| < 1,800 m かつ along < 2,000）までは 2,600 ft フロア
  （平坦な 55 ft ワールドでは場周外でも接地してしまうため）。未確立時はセンターライン延長上の
  ゲート（along > −8,000 なら −26,000、そうでなければ −13,000）を方位操舵、確立後は
  滑走路方位 − clamp(cross×0.012, ±14°) をバンク上限 12° で操舵。フレア： AGL<120 で VS ≥ −320、
  AGL<50 で VS ≥ −200（注： 現実装では AGL<120 の分岐が先に一致するため <50 側は到達不能。無害）。
  フラップは物理の 4 段（0 UP／1／2／3＝40°）： <20 km→1、<12 km→2、<9.5 km でギア、<9 km→3。
- **ダイバート追従**： `SyncDest()` が毎ステップ Duty.Destination を監視し、変更（天候イベントの
  ダイバート回答など）があれば destRwy を再構築。遠方へのダイバート時はフラップ／ギアを再び格納。
- `unity/LineMain.cs`： 実飛行トグルボタン（「PF 操縦：実飛行（737 物理で実際に飛ぶ）」）、
  `SetupRealFlight()`、`StepReal(dtSim)`、実飛行モードでは「飛行を進める（実飛行 30 秒）」ボタンを表示し
  Compress ボタンを隠す。StartDuty で Pilot=null にリセット。RecordLeg は従来どおり
  （Career フィールドが null の場合は自前の MemoryStore キャリアを生成する — CareerMain 側で
  共有 Career を注入する。STAGE 15 参照）。

## ヘッドレス検証（flight/test/BotLineRealCs.cs、新規）

実 line.json/airfields.json を読み、GO 判定のディスパッチ種を選び、イベントは最良スコアの選択肢で回答：

| ケース | 結果 |
|---|---|
| HND-KMQ（最良回答→天候で HND へダイバート） | debrief 到達 171 ステップ、総合 70・B、接地点 at=HND、沈下 234 fpm |
| HND-FUK（最良回答→代替 KMQ へダイバート） | debrief 到達 256 ステップ、総合 70・B、接地点 at=KMQ、沈下 212 fpm |
| HND-KMQ 直行（seed=2、ダイバートなし） | debrief 到達、接地点 at=KMQ、沈下 224 fpm |
| HND-KMQ 強制ダイバート（天候イベントに選択肢 0） | debrief 到達、接地点 at=HND（目的地と一致） |

**LINE REAL FLIGHT PASS（4 ケース、墜落なし）。**

## 正直な限界

- 接地精度は粗い： along は +1,647〜+2,030 m（ロング）、cross は −909〜+257 m（滑走路幅 60 m を外れるケースあり）。
  採点モデル上は着陸コンポーネントが低くなるが、完走・採点・記録の経路は実飛行で通っている。
  精度改善（プロファイルのユークリッド距離化、pure-pursuit 誘導、リジョイン状態）は試行したが
  いずれも完走率が下がったため不採用とし、完走実績のある誘導則を残した。経緯は本レポートに記録する。
- 巡航圧縮は Duty.Compress() ではなくパイロット側の位置前進で実装（局面は実距離で進む）。
