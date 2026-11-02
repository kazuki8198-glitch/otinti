# STAGE 17 レポート — 最終検証の実行（ライセンス再結合後）

実施: 2026-11-02 / 前提: 実効 HOME=/tmp/unityhome3 でライセンス再結合済み
（プローブで `Successfully resolved entitlement details` / `Successfully updated license`
を確認、MachineBinding エラー消滅）。待機中の Hub（PID 14296）は落としていない。
プロジェクト: /opt/cadet/CadetSlice、DISPLAY=:99、Editor 6000.3.27f2。

## 項目 0: プローブのコンパイラエラーの片付け（原因特定済み）

- プローブ（/tmp/editor-license-probe.log）の `Scripts have compiler errors.` の本文は、
**全件が `SliceMain` 未検出**（CS0246 / CS0103）で、LessonAcceptance / LessonMain /
WorldAcceptance / GameSceneSetup / GameMain / GameDriver の 6 ファイルに波及していた。
- **原因: 同期スクリプトのファイル一覧の欠落**。`tools/sync-unity.sh` は slice/src から
`CadetPhysics.cs` と `Controls.cs` しかコピーしておらず、`SliceMain.cs` が含まれて
いなかった。VM 交換後に /opt のプロジェクト実体を雛型から再構築した際、この欠落の
ため SliceMain だけがプロジェクト側に存在しなかった（ワークスペース側の保全コピー
slice/project には残っていた）。
- check-unity-compile.sh が 0 エラーだった理由もこれで説明がつく: あちらはワーク
スペースのマスター一式（slice/src を含む）を一緒にコンパイルするため、欠落が見え
なかった。乖離はソース内容ではなく**同期対象の網羅性**にあった。
- 他の共有ファイルは全数照合し、unity/・core/src→Core/・flight/src→Flight/・
slice/src の 2 ファイル・data/*.json（56 件）すべてバイト一致を確認。内容の乖離は
SliceMain の欠落 1 件のみ。
- **修正: `tools/sync-unity.sh` の cp 行に `slice/src/SliceMain.cs` を追加**して再同期。
以後の全エディタ実行でコンパイルエラーは出ていない（GAME_SCENE_BUILT ×2 で確認）。

## 項目 1: ライセンス保全の更新

- 稼働中の /tmp/unityhome3 から、保全コピー `~/workspace/cadet-unity/license-home/` の
`.config` / `.local` / `.unity` を同一レイアウトで差し替えた（rsync --delete。
実行時キャッシュとライブなロック/ソケットファイルは除外）。
`.config/unity3d/Unity/licenses/UnityEntitlementLicense.xml`（5,437 B）が新しい
マシン結合のものになっている。全体 32 MB で従来と同じ構成。
- 注意（従来どおり）: ライセンスはマシン結合のため、**次回 VM が交換された場合は
再びユーザーの Hub サインインが必要になる可能性が高い**（今回がまさにそのケース）。

## 項目 2: 段階実行の結果

### (1) BuildGameScene — PASS
- `GAME_SCENE_BUILT`、終了コード 0。初回 約127 秒（SliceMain の初回コンパイル込み）、
GameAcceptance 前の再実行は 約40 秒。ライセンス解決ログ正常、コンパイルエラーなし。

### (2) CareerAcceptance — ハーネス正常終了、ドライバ RESULT FAIL (2)
- AddDriver: `CAREER_DRIVER_ATTACHED`、終了コード 0（約45 秒）。
- RunCareerAcceptance: `CAREER_ACCEPTANCE_TICK_DONE`、終了コード 0（実行 約31 分）。
ドライバの内訳:
- PASS: hub present / career hub button present / career panel opened from the hub /
fresh career starts at the prologue / prologue completed (brief:meet + FinishPrologue) /
prologue was completed during the run / career save file exists on disk
- FAIL: final state: FO hired / graduation was recorded during the run
- **詰まった画面はない**。ドライバ内蔵の 150 秒ストール検出は一度も発火せず、セーブ
ファイル（cadet-career-save.json）は day 15 → 17 → 20 → 21 → 23 と前進し続けた。
予定→会話/座学/FTD/イベント→就寝→翌日という直列結線そのものは実 UI 経由で
機能している（到達点: **day 23 / chapter ch1 / morning**、FTD k1–k3 は S 合格を記録）。
- **未達の理由はスループット**: CareerMain は飛行日を 1 フレーム内で同期的に飛ばす
（BotFly.RunLesson、flight/src/BotFly.cs:230。1 フェーズ最大 900 秒ぶんを 120 Hz で
回す）。この VM のエディタでは 1 飛行日が数分級になり、全約150 日はドライバ制限
1,700 秒／ハーネス制限 2,400 秒に収まらない。ドライバは自身の時間切れで正常に
終了し、上記 2 件の FAIL を記録した。**序章→卒業→FO 入社の通しは今回も未検証**で
あり、迂回（予算の無断延長や途中状態での合格判定）はしていない。
再挑戦の条件は、ハーネス予算の引き上げか、BotFly のステップレート引き下げ等の
アクセプタンス設計の変更であり、本ステージでは行っていない。

### (3) GameAcceptance — ハーネス PASS、ドライバ 16/18（RESULT FAIL (2)）
- シーンを BuildGameScene で作り直し（CareerDriver を排除）、AddDriver PASS、
RunGameAcceptance は `GAME_ACCEPTANCE_TICK_DONE`・終了コード 0（約71 秒）。
- PASS（16 件）: コールドブート、タイトル表示、ハブ、タイトルボタンからのキャリア
飛行開始、**入力経路での離陸（airborne、高度 101 ft、IAS 114 kt）**、フリーモード
パネル、737 セッション開始（エンジン運転中）、故障注入の即時発火（pitot）と
予約発火（engine を 0.02 分後）、デバイス軸の飛行ループ到達（PIn 0.51 / Thr 0.42）、
ラインパネルと勤務生成、AI 教官の応答、歩行モード（内装＋walker）、タイトル復帰。
Stage 16 で結線した故障注入・デバイス消費はここで実働確認が取れた。
- FAIL（2 件、いずれも Stage 16 で追加された G1000 チェック）:
1. `G1000 glass bound to the free-mode cockpit` — GameDriver は pa28 セッションを
開始した**同一フレーム内**で `G1000GlassMain.Bound` を判定する（GameDriver.cs:
77–79）が、Bound は Pump() の中でのみ立ち、Pump は Update 駆動。開始直後の
同一フレームではまだバインドが走っておらず、**テスト手順の順序欠陥**で
確定的に落ちる。
2. `G1000 PFD texture is drawn (non-black sample)` — 対象セッションは
SelStart="ramp"。FreeModeMain は ramp 以外でのみ `Sys.SetRunning` を呼び、
`Elec.PfdOn` はバス活線（発電機出力またはバッテリースイッチ ON）が条件
（CadetSystems）。無電源のランプ開始では Pump は仕様どおり黒画面を描くため、
電源投入済みの開始状態を選んでいない本チェックは成立しない。
G1000 の描画器そのものは Stage 13 でゴールデン照合済み（11,319 ops・不一致 0）
であり、この 2 件は移植側の欠陥ではなく**アクセプタンス手順側の欠陥**と切り分ける。
テストを直して通したことにはしていない（手順修正は未実施として残す）。

### (4) BuildWindows — PASS
- Stage 12 の手順どおり、受け入れ用 *Acceptance.cs（10 ファイル）を Assets/Scripts
から退避し、GameSceneSetup.cs は Assets/Editor 配下へ移してから
`GameSceneSetup.BuildWindows` を実行（終了後に全ファイル復旧を確認済み）。
- 結果: **`BUILD_RESULT Succeeded size=134043962 errors=0`**、終了コード 0（約4.5 分）。
- 成果物: `~/workspace/cadet-unity/build-windows/`（Cadet.exe ＋ Cadet_Data ＋
UnityPlayer.dll 等一式、ディスク上 129 MB）。
- VM では Windows exe を実行できないため、実機での起動・fps・操作感は従来どおり
ユーザーの PC での確認待ち。

## 証跡ファイル
- stage17-buildscene.log / stage17-career-adddriver.log / stage17-career-run.log
- stage17-buildscene2.log / stage17-game-adddriver.log / stage17-game-run.log
- stage17-buildwindows.log（いずれも ~/workspace/cadet-unity/ 配下）
- /opt/cadet/CadetSlice/career-done.txt（ドライバ結果 9 行）、game-done.txt（18 行）

## 残った未達（まとめ）
- CareerAcceptance の全通し（卒業→FO 入社）: 結線は機能しているが、同期飛行の
スループットのため制限時間内に届かなかった。ハーネス予算／BotFly の高速化という
アクセプタンス設計の判断が要る。
- GameAcceptance の G1000 2 件: GameDriver の手順修正（セッション開始後にフレームを
空ける、テクスチャ判定は電源投入済みの開始状態で行う）が必要。
- Stage 15/16 から継続の名指し事項（変更なし）: ceremony/tour は情報パネルのみ、
FTD k4 の chairScript 専用項目なし、C# キャリア核は CAREER_VERSION 2 配置
（HTML は v3)、TTS は実機未検証、STT の録音経路は未検証（VM にマイクなし）、
NPC の視覚確認（WalkAcceptance 再実行）は本ステージ未実施、boeing.js の o.hdg
欠陥は原典どおり忠実再現のまま。
- ライセンス保全は更新したが、マシン結合のため将来の VM 交換では再サインインが
必要になる見込み。
