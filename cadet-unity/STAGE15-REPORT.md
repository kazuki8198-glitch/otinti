# STAGE 15 レポート — キャリア画面の直列結線（予定→項目→結果→翌日→卒業→FO 入社）

実施: 2026-11-02 / 正本: 最新 HTML ツリー（cadet-wt-free @93441f6 系）
対象: 指示項目 1（最優先）。項目 2・4 は STAGE13/14 で完了済み。本レポートは項目 1 と、
全項目に共通する環境ブロッカーを記録する。

## 結線したもの（unity/CareerMain.cs、新規・約1,900 行）

ハブに「キャリア（訓練課程）」ボタンを追加し、専用パネルを Game シーンに組み込んだ。
1 本の画面フローとして次を結線した（すべて実 UI：ボタン／仮想キー経由で進行可能）。

- **予定表**: 日付・章・枠、能力値（操縦/知識/交信/判断）・疲労・信頼バンド表示、
  その日の項目ボタン列（完了は ✓＋緑）、ゲート不足項目の提示、「寝る」ボタン。
  寝る＝章ゲート判定 → ch6 は卒業処理＋適性証明、ch7 は FO 入社処理、それ以外は次章へ。
- **項目ディスパッチ**（スケジュールの kind 別）:
  - ceremony / tour → 情報パネルで完了（後述の「名指しのギャップ」参照）
  - brief / event / graduation → 会話（DialogRunner を CareerMain 専用パネルで実行。
    ctx は miss 質問・TEM・今日の予定・天候を BotCs と同じ形で構築）
  - class → ペース選択（need/full/quick、前回を保持）→ 節ごとにページ送り
    （full=本文、card=要約カード）→ 5 問ドリル（無採点）→ 成長・聞いた節・疲労+6 を記録
  - exam → 試験ドリル画面（1 問ずつ、即時フィードバック＋解説）→ 銀行別 % と
    60% フロア判定つき結果画面 → Career.Exam 記録
  - ftd → k1 チュートリアル（7 部）／k2 計器読み／k3 無線ドリル／k5 シーン／
    k6 リスニング（いずれも実問題生成）／k4 は実飛行デー（a1）として実施し無線初回率で記録
  - flight / solo / checkride / xc / night → 天候判断（METAR/TAF 表示＋4 択）→
    実飛行デー（Day マシン：歩行点検→搭乗→レッスン→無線応答→ランナップ→チェックリスト→
    講評）を画面上で実行 → main.js dayOver の規則どおり成長・miss・信頼・疲労+15 を適用
  - navlog → 実風（Career.Aloft）で航法計画ドリル 5 問
  - study → weather は天候判断ドリルとして記録、remedial はドリル、その他は情報＋記録
  - line / linecheck → LineMain とキャリア状態を共有して実デューティへ（着陸後の
    デブリーフ検出で記録し、予定表へ復帰）
- **永続化**: persistentDataPath/cadet-career-save.json に career 本体・Prog・信頼を
  書き込み（FileStore 経由、書くたびにフラッシュ）。信頼は画面側で保持し、
  各飛行デーの Summary の増減を加算（BotCs の 62 固定とは異なる実運用形。
  ソロゲートは信頼 ≥60 ＋ 判断 ≥30）。
- **支援ロジック（flight/src/CadetQuiz.cs）**: 試験ドロー（school.js examDialogs の
  厳密移植：銀行別 usable 判定・per-bank 抽選・選択肢シャッフル）、クラスドリル、
  FTD 問題生成（k2 ピクチャ/k3 ドリル/k5 シーン/k6 リスニング）、NAVLOG 問題、
  無線 SAY ヘルパー群（Digits/Words/Freq/Squawk/Runway/Wind 等の逐語移植）。

## 検証（このセッションで取れた証跡）

- **全ソースのコンパイルチェック 0 エラー**: core/src・flight/src・slice・unity/*.cs
  全 34 ファイル＋新規 CareerMain/CareerDriver/CareerAcceptance を、Unity 同梱 Roslyn で
  エディタ管理アセンブリに対して型検査（tools/check-unity-compile.sh、新規）。
  途中で実エラー 2 件を検出・修正（Js.Arr の 2 引数誤用、G1000GlassMain の sys.Eng→sys.St.Eng）。
- **BotQuizCs: QUIZ PASS** — written1（全節履修）30 問／（未履修）0 問（設計どおり）、
  presolo・type 30 問、採点 100=合格・0=銀行フロア不合格、k2/k3/k5/k6 各 10 問、
  クラスドリル 5 問、navlog 5 問（TC 050°→MC 056° を確認）。
- **試験ドローの独立照合**: written1（seed 12375・全履修）と presolo（seed 837）について、
  node 上の JS 再実装と C# の問題 ID 列＋正解位置列が**文字単位で完全一致**。
- **BotLineRealCs: LINE REAL FLIGHT PASS**（STAGE14 の再実行、本セッションでも緑）。
- **BotG1000Cs: 23 レコード × PFD/MFD、C# 描画 11,319 ops、不一致ユニット 0**（再実行で確認）。

## ブロッカー（名指し）: 実入力アクセプタンスは「Unity ライセンス再アクティベーション」待ち

序章→卒業→FO 入社を通す実入力テスト（unity/CareerDriver.cs＋CareerAcceptance.cs、
制限 2,400 秒）は**書けたが実行できていない**。理由は推測ではなくログで確定している:

- この VM は交換されており、/opt/cadet/CadetSlice（プロジェクト実体）が消滅していた。
  ワークスペース側の雛型（slice/project の ProjectSettings＋unity-project の
  Packages/manifest、StreamingAssets の glb は HTML 側 assets から）で再構築し、
  ソース同期まで完了した。
- 保全済みライセンスホームをコピーしてエディタを起動すると
  「No valid Unity Editor license found」で終了する。Licensing Client のログ
  （2026-11-02 10:24 UTC）に
  **「Legacy MachineBinding validation failed」** と明記されており、保全ライセンスは
  旧 VM のマシン結合に紐付いていて、この VM では検証が通らない。
- 再結合には Unity Hub でのユーザー本人によるサインインが必要（スパイク時の確立
  ルールどおり、資格情報は Muse が扱わない）。Hub 自体はこの VM の egress
  プロキシを `--proxy-server`（環境変数経由）で渡せば Unity のサービスへ到達できる
  ことを確認済みで、サインイン済みセッションが生きていれば Hub 起動だけで
  再アクティベーションされる可能性があるが、サインイン画面が出た場合は
  ユーザーの操作待ちになる。
- したがって本ステージの残作業は次の 3 つで、いずれもライセンス復旧直後に実行できる
  状態にしてある: (1) GameSceneSetup.BuildGameScene の再実行、(2) CareerAcceptance
  （序章→卒業→FO 入社の実入力通し）、(3) GameAcceptance 再実行＋BuildWindows 再作成。

## 名指しのギャップ・意図的な差異（迂回は作っていない）

- **ceremony / tour**: 原典に会話ツリーが無く（歩行・会話トリガで進行）、予定表項目と
  しては情報パネル表示で完了扱いにした。会話ツリーが存在しないこと自体をここに記録する。
- **FTD k4**: 専用の chairScript 項目（COM 周波数選択、ATIS レター、部分パネル
  イベント）は Day マシンに存在しないため未再現。k4 は実飛行デー＋無線初回率で記録する形。
- **座学 full 本文**: テンプレートリテラル展開（${…} 除去＋タグ除去）で本文を表示する。
  図版は落としている。要約カード経路は lecture-summaries.json の実データを使用。
- **飛行デーの天候**: Day マシンへ渡す天候は固定値（Bravo/1405/22/11、QNH 29.85）。
  天候判断そのものはキャリア天候で実施しており、飛行中の気象表現のみ近似。
- **CLASSES の版差**: C# キャリア核は CAREER_VERSION 2 の CLASSES 配置のままで、
  現行 HTML は v3（radio1 の分割が異なる）。予定・ゲート・クラス対応はすべて
  ポート内の v2 配置で一貫させてあり、v3 への追随は別作業として残る。
- **written1 の予熱 3 問**: 原典でも採点プールから除外される無採点の導入問題は
  本結線では出題しない（採点対象の 30 問は厳密一致）。
- **boeing.js の o.hdg 欠陥**: Unity 側は原典挙動の**忠実再現を維持**している
  （737 の方位表示は原典どおり常時 000° になる）。原典側は触っていない。
  直すかどうかはユーザーの判断待ちであることを改めて明記する。

## 証跡ファイル

- unity/CareerMain.cs / unity/CareerDriver.cs / unity/CareerAcceptance.cs
- flight/src/CadetQuiz.cs / flight/test/BotQuizCs.cs / data/scene-answers.json
- tools/check-unity-compile.sh（ライセンス不要の全ソース型検査）
