# STAGE 16 レポート — 残項目の仕上げ（故障注入／デバイス消費／NPC／z 鏡像／STT／TTS）と最終工程の状態

実施: 2026-11-02 / 対象: 指示項目 3・5・6・7・8・9（項目 1 は STAGE15、2 は STAGE14、4 は STAGE13）。

## 項目 3: フリーモード故障注入の実働＋デバイス入力の飛行ループ実消費

- **故障注入（unity/FreeModeMain.cs）**: FailPlanDesc として文章で記録するだけだった
  計画を、原典 fly-mode.js の startFreeSession／update と同じ形で実働化した。
  セッション開始時に前回の故障を解除（setFault(null)／setElecFault(false)／CarbRisk=0）し、
  選択故障は MakeSchedule で即時／予約（◯分後・◯ft 到達時）を分け、未選択時は
  シード付きランダム抽選（randomFailureFor, day 1 / free）を ScheduleOf で予約する。
  スケジューラの時計は飛行中だけ進み（DueSchedule、高度は Out.AltTrue）、発火は
  applyFail の経路どおり: mag→Systems.SetFault(200)、elec→SetElecFault(true)、
  carb→CarbRisk=1（C# 物理の着氷ゲート。JS の carbDay=1 に対応づけた）、
  ppanel→AHRS＋GPS、その他は School.FailNow と同じ効果をセッションの状態／
  アビオニクスへ直接適用。発火した種別は FailFiredKinds に残る。
  ※ スケジューラの tick は CockpitMain.Frame から回す（設定パネルは飛行中
  非アクティブになるため、FreeModeMain.Update では時計が止まる構造だった）。
- **デバイス消費（unity/DevicesMain.cs に DeviceMerge を追加）**: 列挙・割当・Poll()
  までだった Stage 11 の基盤を、実際に操縦へ効かせた。SliceMain のステップループと
  CockpitMain.Frame の両方で、Controls.Update の直後・Sim.Step の直前に
  DeviceMerge.Apply を呼ぶ: ピッチ／ロール／ヨーはキーボード状態へ加算（同じ 1.3
  カーブ）、スロットルはデバイス実在時に絶対値、ブレーキは押下中 1、ギア／フラップは
  立ち上がりエッジで Controls.Action を発火。VM に物理デバイスが無いため、
  アクセプタンス用に DevicesMain.Synthetic（合成軸セット）の注入経路を用意した。
- **アクセプタンス拡張（unity/GameDriver.cs）**: G1000 グラスのバインド＋PFD
  テクスチャの非黒サンプル、故障注入の即時発火（pitot → PitotRisk=3）と予約発火
  （engine を 0.02 分後に発火させ Eng[0].Failed を確認）、合成デバイス軸が
  SliceMain の飛行ループへ届くこと（PIn・Thr）の 3 件を追加した。
  **実行は STAGE15 と同じライセンスブロッカーで未実施**（コンパイルチェックは 0 エラー）。

## 項目 5: NPC の本造形（actor.glb）

- **資産の実態（先に明記）**: actor.glb はスキニング済み歩行モデルではなかった。
  中身は頭部・胴体の部品キット 44 メッシュ（スキン 0、アニメーション 0、手足の
  ジオメトリ自体が無い）。原典 HTML でも歩行はスケルタルではなく actor.js の
  手続きポーズ（walkPhase 6 rad/s、腕は脚と逆位相、腰の上下）である。
  したがって「スキニング配置・歩行アニメ」は資産側に存在せず、本移植では原典と
  同じ方式（部品組み立て＋手続き歩行）で置換した。ここは推測で埋めず事実として記録する。
- **実装（unity/WalkMain.cs）**: glTFast で actor.glb を 1 回読み、各キャストの
  スタンドイン（カプセル＋球）へ部品を被せる: head.base.skin／目／アイリス／
  mouth／lids／hair-short／torso.base.shirt 等の保持部品以外を無効化し、
  脚・腕は腰・肩ピボットのカプセルで追加。歩行 NPC（桐生）は WalkPath の
  Moving/Speed に連動して脚・腕をスイング（±0.55 rad、腕は逆位相×0.8）、
  腰バウンス |cos|×0.03、進行方向への旋回を行う。キット読込に失敗した場合は
  従来のスタンドインのまま（退行なし）。視覚確認はライセンス復旧後の
  WalkAcceptance 再実行で担保する（現時点ではコンパイル 0 エラーのみ）。

## 項目 6: WorldMain の z 符号鏡像の修正

- unity/WorldMain.cs を原典フレーム（z = −a）へ統一: Box の z 中心を −(a0+a1)/2、
  フィールド回転を −6.1784656°（interiors.json のフレームヨー）、地面プレーン中心
  z を −600、駐機 Archer を (207.6, 0.1, −636.5)／回転 (0, −90, 0)、
  F(a, c, y) ヘルパーを (c, y, −a) へ。
- **回帰確認: 歩行ハーネス（BotWalkCs vs golden-walk）ALL PASS**
  （衝突・ドア・到達可能性・NPC ルートの全照合が緑。ハーネス側の RwyToLocal が
  lz = −a であり、WorldMain の見た目が歩行ロジックと同じフレームに揃った）。

## 項目 7: STT の Unity 組み込み

- **unity/SttMain.cs＋flight/src/CadetStt.cs**: マイク（Unity Microphone、
  16 kHz）→ WAV 化 → 外部 python3 で faster-whisper（tiny / CPU / int8）を起動 →
  書き起こし → リードバック照合、の経路を通した。照合は数字を digit 化して
  比較し（"four six zero one" = squawk 4601）、数字内容の不一致は不合格にする。
- **証跡（flight/test/BotSttCs.cs）: STT HARNESS: ALL PASS**
  - 照合 3 件（スコーク正／周波数正／誤スコーク拒否、いずれも Say ヘルパーで
    生成した期待文と比較）
  - WAV ライタ 2 件（16 kHz そのまま／44.1→16 kHz リサンプル）
  - **実書き起こし**: Unity ホストが起動するのと同一のランナースクリプトで
    JFK サンプル（11 秒）を書き起こし、"ask not what your country can do for
    you" を含む全文が得られ、言語判定 en。
- VM にマイクが無いため録音経路そのものは未検証（SttMain は MicAvailable=false を
  返し、エラーとして明示する。固まらない）。Windows 実機では python3 +
  faster-whisper + PyAV のインストールが前提（README-UNITY に記載）。

## 項目 8: TTS（Windows SAPI ブリッジ）

- **unity/TtsMain.cs**: 行ごとに PowerShell＋System.Speech（SAPI）のブリッジを
  起動する実装を同梱。スクリプトは初回に persistentDataPath/cadet-tts/ へ
  書き出し、前行のプロセスは止めてから次行を再生する。DialogMain の行表示に
  フックした（会話が進むと自動で呼ばれる）。非 Windows では理由を LastNote に
  残して無音になる。
- **状態: 実機未検証**。VM に音声エンジンが無く、Windows 実機での再生確認は
  できていない。手順と前提（PowerShell 5.1+、日本語行には日本語 SAPI 音声）を
  README-UNITY の「音声（STT / TTS）」節に明記した。

## 項目 9: 仕上げ工程の状態

- Windows リリースビルド再作成とコールドブート画面通しの再実行（卒業までの
  直列フローを含む）は、**STAGE15 に記録したライセンスブロッカーのため未実施**。
  プロジェクト実体は雛型から再構築済みで、ライセンス復旧後に
  BuildGameScene → CareerAcceptance → GameAcceptance → BuildWindows の順で
  そのまま実行できる。
- GitHub への追加 push（unity/full-port）: 本レポート末尾に結果を追記する。

## 共通の検証サマリ（本セッション）

- tools/check-unity-compile.sh: **全ソース 0 エラー**（core/flight/slice/unity 全ファイル）
- BotWalkCs: ALL PASS ／ BotSttCs: ALL PASS ／ BotQuizCs: QUIZ PASS
- BotLineRealCs: LINE REAL FLIGHT PASS ／ BotG1000Cs: 11,319 ops・不一致 0

## push 結果（unity/full-port、2026-11-02）

- コミット A `cca34533589b`（Stage 13/14: G1000 グラス＋ライン PF 実飛行、11 ファイル）
- コミット B `de551ddde251`（Stage 15: キャリア直列結線、9 ファイル）
- コミット C `b11013499818`（Stage 16: 故障注入／デバイス／NPC／鏡像／STT／TTS、15 ファイル）
- blob 照合: CareerMain.cs（7a0c420e…）／STAGE15-REPORT.md（4e160e98…）／
  WalkMain.cs（7368f654…）のリモート blob がローカルと一致。
- 改変ファイルは push 前にミラー＝リモートの blob 一致をサンプル確認済み（乖離なし）。
