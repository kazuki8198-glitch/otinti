# STAGE 19 レポート — Windows ビルド起動欠陥の診断・修正 ＋ フリーモード忠実度修正

実施: 2026-11-02 / 対象: STAGE17 出荷ビルド（unity/full-port head 816d4b8 時点の成果物）を
ユーザーが Windows 実機で起動した際の欠陥。本レポートは項目を分けて記載する。
**結論を先に: 修正と検証（Editor 上）は完了したが、最終 Windows 再ビルドは
ライセンス再結合待ちで未完（§4）。build-windows.zip はまだ欠陥ビルドのまま。**

---

## 1. 起動欠陥（全面マゼンタ＋タイトル UI なし＋静止）

### 症状の証拠
- ユーザー実機スクリーンショット `CadetSlice_2026_11_02_20_58_45.png` をピクセル解析:
  全画素が「空グラデーション」か「純マゼンタ (255,0,255)」の 2 類のみで、UI の痕跡は
  ゼロ。境界は画面の 52.3%。カメラがほぼ水平であり、SliceMain.BuildTitle 末尾の
  カメラブロック（LookAt で約 10.7° 俯角、Editor 証跡では境界 ≒33–37%）が
  実行されていない幾何と一致する。
- STAGE17 のビルドログ（stage17-buildwindows.log）: `Compiling shader` は 47 件のみで、
  **Cadet/Toon / Standard / Unlit/Color / Unlit/Texture が皆無**。
- 対照: プロジェクトの Library/ShaderCache には CadetToon のキャッシュがあり、
  Editor ではコンパイルされていた。受け入れ検証は全て Editor 実行だったため、
  プレイヤーでの欠落は検出不能だった（「exe の描画フレームは一度も確認していない」）。

### 根本原因（確定分）
1. **ランタイム生成マテリアルのシェーダーがプレイヤービルドに一切含まれていなかった。**
   本プロジェクトのマテリアルは全て `Shader.Find` 経由のコード生成で、シーン
   アセットからの参照が無く、GraphicsSettings の Always Included Shaders は
   built-in 7 件のみだった。プレイヤーでは Shader.Find が null を返し、
   エラーシェーダー（マゼンタ）で描画される。該当: Cadet/Toon（WorldMain /
   CockpitMain / WalkMain）、Standard（SliceMain の地面・滑走路ほか 6 箇所）、
   Unlit/Color、Unlit/Texture（コックピット玻璃）。
2. **受け入れドライバ GameTest（GameDriver）が製品ビルドに混入していた。**
   出荷 level0 の strings で存在を確認（active=1）。GameAcceptance.AddDriver が
   シーンへ保存したオブジェクトを、STAGE17 の BuildWindows がそのまま開いて
   ビルドした。ドライバは起動直後からタイトル／セッションを操作し、`Shot()` は
   `/home/hatch/...` への書込みで Windows では例外になる。タイトル消失の
   一因になり得る位置にいた（ただし単独では全症状を説明しない）。
3. タイトル UI が出なかった正確な一段は、実機 Player.log 未取得のため未確定。
   ただし「BuildTitle が完走していない（少なくともカメラブロック未実行）」ことは
   画素証拠で確定。切り分けのため §1 修正に BOOT マイルストーンを同梱した。

### 修正
- `GameSceneSetup.BuildGameSceneCore` に `EnsureAlwaysIncludedShaders` を追加:
  Cadet/Toon（アセット直参照）＋ Standard / Unlit/Color / Unlit/Texture
  （Shader.Find で解決）を GraphicsSettings へ冪等に追加。
  実測ログ: `ALWAYS_INCLUDED_SHADERS total=11 added=[Cadet/Toon,Standard,Unlit/Color,Unlit/Texture]`。
  GraphicsSettings.asset に Toon（guid 336d108cae72e8ea4a616fbef9fddd76）/
  Standard（fileID 46）等が記録されたことを実物で確認。
- `WalkMain.cs:95` に Standard フォールバックを追加（他 2 箇所と統一。従来は
  唯一フォールバック無しで、null シェーダーのマテリアルを直接作っていた）。
- `SliceMain` に BOOT マイルストーンを追加: `BOOT_AWAKE`（4 シェーダーの
  有無を併記）/ `BOOT_WORLD_OK` / `BOOT_TITLE_OK panel=…` / `BOOT_FIRST_FRAME`。
  プレイヤーでは Player.log に残る。Editor 実行（FreePower ラン）で全て出力・
  panel=True を確認済み。

---

## 2. フリーモード忠実度バグ（起動欠陥とは別の修正）

### 原因・根拠
- 移植版は全開始状態で `StartParkedSession → SetCold` を経由する。SetCold は
  分割 BAT/ALT を false にするが、`SetRunning`（原典 systems.js の RUNNING と
  同一の ApplyRunning）は分割スイッチに触れない。よって非ランプ開始でも
  バスが活線にならず `Elec.PfdOn` が立たない。STAGE17 追補の実測: 空中開始・
  エンジン運転中（rpm 2292）でも PfdOn は 10 秒間 False のまま。
- 原典 JS の startFreeSession は setCold をランプ（cold & dark）開始のみに
  適用し、非ランプ開始は工場初期状態（CadetCockpit コンストラクタで
  `Sw.Bat = true; Sw.Alt = true`）から setRunning する。

### 修正
- `CockpitMain.StartParkedSession(string type, bool cold = true)`:
  SetCold は cold のときだけ適用。既存ハーネス呼び出し（BoeingDriver /
  CockpitDriver）はデフォルト true で従来どおり。
- `FreeModeMain.StartSession`: `start == "ramp"` のときだけ cold を渡す。

### 確認結果（新規ハーネス FreePowerAcceptance / FreePowerDriver、実 UI 経由）
- 空中開始: 工場 BAT/ALT on のまま ✓ ／ スイッチ無操作で PfdOn 成立
  （rpm 851 時点）✓ ／ G1000 PFD テクスチャ描画あり ✓
- ランプ開始: BAT/ALT off（cold & dark）✓ ／ PfdOn は False のまま ✓
- **全 7 件 PASS**（stage19-freepower-run.log、freepower-done.txt）。
- 回帰確認: GameAcceptance 再実行 **18/18 PASS**（stage19-game-run.log）。

---

## 3. ビルド経路の欠陥（CS0234）と是正

- 本セッション 1 回目の再ビルドは `BUILD_RESULT Failed / errors=23`。
  全件が CS0234（`UnityEditor.SceneManagement` がプレイヤーコンパイルで
  解決不能）で、対象は *Acceptance.cs 11 件 ＋ GameSceneSetup.cs
  （stage19-buildwindows-failed1.log に保存）。
- STAGE12 が記録した「受け入れ系の退避」はこの対策だった。STAGE17 の
  ビルドが通ったのは、STAGE12 の退避時コンパイルのキャッシュが残って
  いたためと判断する（STAGE17 では該当ソース無変更）。今回はソース
  変更で再コンパイルが走り顕在化した。
- 是正としてビルドを `tools/build-windows.sh` に一本化:
  sync → BuildGameScene（シーンをコードから再生成。保存済みシーンの
  ドライバ混入を構造的に排除）→ 退避 → `Stage19Build.BuildOnly`
  （unity-editor/ → Assets/Editor/ のブートストラップ。ビルド前に
  *Driver コンポーネント混入を再チェック）→ trap で常時復旧。
  `GameSceneSetup.BuildWindows` は誤用防止のため案内エラーに変更し、
  sync-unity.sh は unity-editor/ の同期を追加した。

---

## 4. VM 再起動インシデントと残作業（ブロッカー）

- build-windows.sh 初回実行の途中（シーン再生成フェーズ）でランタイム
  再起動が発生し、/opt のプロジェクト実体・/tmp（ライセンス HOME /
  Hub / Xvfb）が消滅した。退避フェーズ前だったため、ソースの
  取り残し・喪失は無し。
- 復旧済み: プロジェクトを雛型（slice/project の ProjectSettings 等 ＋
  unity-project の Packages/manifest）から再構築し、StreamingAssets の
  glb 4 点（archer / seminole / actor / jet737）を STAGE17 ビルド
  成果物から復元、sync 完了。`tools/check-unity-compile.sh` 全ソース
  0 エラー。/tmp/unityhome3 を license-home から再作成、Xvfb :99 再起動。
- **ブロッカー（名指し）**: Editor プローブ（stage19-rebuild-probe.log）で
  `No valid Unity Editor license found`、entitlement 0 件。保全ライセンスは
  旧 VM のマシン結合に紐付いており、この VM では検証が通らない。
  STAGE15 / STAGE17 と同じく、**ユーザー本人の Unity ID 再サインイン
  （ルート 2 手順）が完了するまで Editor を起動できない。**
  再サインイン後は `bash tools/build-windows.sh stage19` 一発で
  再ビルドと検証（BUILD_RESULT / 4 シェーダーの Compiling shader 行 /
  level0 のドライバ不在）まで完了する状態にしてある。
- したがって本レポート時点では **修正版 Windows ビルドと zip は未生成**。
  既存の build-windows.zip は STAGE17 の欠陥ビルドのままなので、
  再ビルド後に差し替え必須。旧ビルド一式は `build-windows-stage17/`
  に退避済み。
- 実機での最終確認（描画・タイトル表示・操作）は再ビルド後、
  ユーザーの PC でしかできない（VM では exe 実行不可）。万一まだ
  問題があれば、BOOT マイルストーンが Player.log に残るため
  次回はログで即断できる。

---

## 変更ファイル（unity/full-port へ push）

- unity/GameSceneSetup.cs — EnsureAlwaysIncludedShaders 追加、BuildGameSceneCore 化、BuildWindows を案内エラー化
- unity/WalkMain.cs — Cadet/Toon フォールバック追加
- slice/src/SliceMain.cs — BOOT マイルストーン追加
- unity/CockpitMain.cs — StartParkedSession に cold 引数（デフォルト true）
- unity/FreeModeMain.cs — cold はランプ開始のみ
- unity/FreePowerDriver.cs / unity/FreePowerAcceptance.cs — §2 の検証ハーネス（新規）
- unity-editor/Stage19Build.cs — ビルドブートストラップ（新規、Assets/Editor へ同期）
- tools/build-windows.sh — ビルド一本化スクリプト（新規）
- tools/sync-unity.sh — unity-editor/ 同期を追加
- STAGE19-REPORT.md — 本レポート
