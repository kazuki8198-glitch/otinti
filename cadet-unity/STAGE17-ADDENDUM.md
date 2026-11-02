# STAGE 17 追補 — GameAcceptance の G1000 チェック2件：手順修正と再実行

実施: 2026-11-02 / 対象: STAGE17 で FAIL だった GameAcceptance の G1000 チェック2件。
**修正はテスト手順（unity/GameDriver.cs）のみ。製品コードは無変更。**

## 直した手順

### 1. `G1000 glass bound to the free-mode cockpit`
- 旧: pa28 セッションを開始した同一フレーム内で `G1000GlassMain.Bound` を判定
  （Bound は Update 駆動の Pump 内でのみ立つため確定的に落ちていた）。
- 新: バインドが立つまでフレームを回して待つ（上限 10 秒）手順に変更。

### 2. `G1000 PFD texture is drawn (non-black sample)`
- 当初案（STAGE17 レポートの処方）は「電源投入済みの開始状態を選ぶ」だったが、
  実測で前提が崩れた。フリーモードのセッションは全開始状態で
  `StartParkedSession` → `Sys.SetCold` を経由して分割 BAT/ALT が OFF になり、
  `SetRunning`（原典 systems.js の RUNNING と同一で分割スイッチに触れない）では
  バスは活線にならない。診断実測: 空中（area）開始・エンジン運転中・rpm 2292 でも
  `Elec.PfdOn` は 10 秒間 False のまま、PFD テクスチャのサンプル最大値は 0。
- 新手順は2段にした:
  1. ランプ開始（無電源）で Pump し、PFD が黒であることを確認（仕様どおりの黒）。
  2. 空中開始に切り替え、コックピット自身のロッカースイッチ `sw.bat` / `sw.alt` を
     通常の Press 経路（プレイヤーのクリックと同じ経路）で ON にし、`Elec.PfdOn` の
     成立を待って（上限 10 秒）から Pump して非黒を確認。
  チェック本数は従来どおり（合計18件のまま）。

## 再実行結果

- STAGE17 と同一手順（BuildGameScene → GameAcceptance.AddDriver →
  RunGameAcceptance、HOME=/tmp/unityhome3、DISPLAY=:99）で最終確認ランを実施。
- **GameAcceptance 18/18 PASS（RESULT PASS、fails=0）**。診断ランでも同じく 18/18。
- 診断値: ランプ側 bound=True / pfdOn=False / サンプル最大値 0（黒で正しい）。
  空中側は Press 後 0.51 秒で pfdOn=True、サンプル最大値 255（描画あり）。
- 証跡: stage17fix-final-buildscene.log / stage17fix-final-adddriver.log /
  stage17fix-final-run.log（いずれも ~/workspace/cadet-unity/）、
  /opt/cadet/CadetSlice/game-done.txt（PASS 18行 + RESULT PASS）。

## 製品側の所見（未修正・判断待ち）

- 移植版のフリーモードでは、非ランプ開始でも分割 BAT/ALT が OFF のまま始まるため、
  プレイヤーが BAT/ALT を入れるまで G1000 が点かない。
- 原典 JS の `startFreeSession` は非ランプ開始では `setCold` を呼ばず、コックピット
  工場初期状態（bat/alt = true）のまま `setRunning` するので、G1000 は点いた状態で
  始まる。相違の原因箇所は、移植版が全開始で `StartParkedSession` の SetCold を
  適用するセッション構成にある。
- 本追補の範囲（テスト手順のみ）を超えるため製品コードは直していない。
  直すかどうかは製品判断として残す。

## push

- 本追補と unity/GameDriver.cs を unity/full-port へ push する。
  コミット SHA は同期記録（~/workspace/cadet-unity-push.muse-github-snapshot-sync.json）
  と親への最終報告に残す。
