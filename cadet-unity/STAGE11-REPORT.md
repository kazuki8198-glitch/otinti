# STAGE 11 レポート — 音響・音声検証・AI 教官モック・デバイス（優先順 8・9）

## 1. 効果音：sfx.js のグラフ移植＋可聴化

- `flight/src/CadetSfx.cs`：`audio/sfx.js`（530 行）を Web Audio 風ノードグラフとして逐語移植。バックエンド抽象（ISfxBackend）の上に構築し、原典自身の sfx.test.mjs と同じ「フェイクコンテキストでグラフと自動化を記録する」検証方式を採用。
- ゴールデン：`tools/golden-sfx.mjs`（記録型フェイク＋シード付き Math.random、原典テストのフェイクに setPeriodicWave を補ったもの）で 1,703 エントリのログを生成。駆動スクリプトは unlock 前の無動作確認→環境音→足音（3 表面）→ドア 4 種→UI 音→鳥のさえずり→エンジン（単発の構築・各局面・ストールホーン・ギア/フラップ・雨→双発リビルド→停止）→スターター/クランク/fire→無線→接地（200/800 fpm）→AP 切断→モールス ident→雷→他機音→音量 3 グループ。
- 結果：**BotSfxCs 1,703/1,703 エントリ完全一致**（ノード生成順・接続・全パラメータ自動化の目標値/時刻/時定数まで）。
- Unity 可聴側 `unity/SfxMain.cs`：グラフ移植が維持する LiveState（エンジンミックスのグライド目標＋ワンショット記述子）を実音に変換。発火パルス波形テーブルは pulses() のフーリエ係数から生成（ピーク正規化済み）、プロペラ鋸波・ノイズループ・ホーンを AudioSource で追従再生。ワンショットは記述子からクリップを生成して再生（キャッシュ付き）。空間化：コックピット内は原典通りステレオ定位のみ、ワールド側は PlayOneShotAt で 3D 減衰再生が可能。
- Unity 受け入れ（Stage11Acceptance）**RESULT PASS**：エンジンミックス実働（排気ゲイン 0.40 @2400rpm/全開）、サイクル音源のピッチが回転数に一致（20.0 Hz @2400 rpm）、ワンショット 6 件再生、engine(null) で停止。
- 正直な限界：可聴側は LiveState 駆動の近似合成であり、グラフ全ノードの PCM レンダリングではない（フィルター網・AM 変調までは再現していない）。聴感の最終確認は実機（VM に音声出力なし）。

## 2. TTS：未達（理由を記録）

- 本 VM に TTS エンジンが**皆無**：espeak / espeak-ng / flite / festival / pico2wave / say / spd-say の各バイナリ無し、pyttsx3 も無し、ファイルシステム全体の探索でも該当なし。そもそも VM に音声出力デバイスも無い。
- Unity 本体に TTS 機能は無い。原典（HTML）はブラウザの speechSynthesis＝OS 側音声に依存している。Windows 実機で実現するには SAPI ブリッジ等のネイティブプラグインが別途必要で、本段階の範囲では導入していない。会話 UI のテキスト表示（Stage 8）で内容は担保される。

## 3. STT：導入可能を実証（faster-whisper）

- openai-whisper 本体と周辺依存（numba/tiktoken 等）は導入成功。ただし依存の torch（CUDA 版 ≈7GB 超）はディスク 7.5GB に収まらず、CPU 版 torch（約 210MB）は本 VM の回線制約（1 接続あたり ≈112MB で切断、Range 要求は拒否、pip の展開先 /tmp が 512MB tmpfs）で取得未完。
- 代替として **faster-whisper 1.2.1（CTranslate2 ランタイムの Whisper）を導入し、実証成功**：tiny モデル（CPU・int8）で JFK 演説サンプル（openai/whisper 公式テスト音声）を書き起こし、結果は原文と完全一致（"And so, my fellow Americans, ask not what your country can do for you, ask what you can do for your country."、言語判定 en）。再現スクリプトは `tools/stt-verify.py`。
- 判定：**ローカル Whisper による STT は導入可能**。ただし Unity への組み込み（マイク入力→STT→リードバック要点照合）は未実施で、Stage 12 以降の統合課題。実機（ユーザーの PC）では openai-whisper 純正構成も通常通り入る見込み。

## 4. AI 教官：モック結線まで（指示通り）

- `core/src/CadetAiMock.cs`：IAiInstructor インターフェース＋モック実装。教官 6 名（真壁=操縦、黒田=学科、ミラー=英語/交信、佐伯=運航、大城=整備、高嶺=気象）の専門キーワード応答＋専門外フォールバック。API キーには一切触れない（本物 API は Secure Vault 前提で未接続、差し替えはインターフェースの実装のみ）。
- `unity/AiAskMain.cs`：教官選択＋サンプル質問チップ＋回答表示のパネル結線。受け入れで専門応答・フォールバック・未知教官の拒否を確認（PASS）。

## 5. デバイス：Unity Input System（優先順 9）

- パッケージ `com.unity.inputsystem 1.11.2` をプロジェクトへ導入（manifest は `unity-project/Packages/manifest.json` に控えを保存）。
- `unity/DevicesMain.cs`：デバイス列挙（Gamepad/Joystick/Keyboard/Mouse）、機種別既定割当（パッド：左スティック=ピッチ/ロール、右トリガ=スロットル等／ジョイスティック：スティック＋rz 軸＝スロットル）、割当の保存/復元（persistentDataPath/cadet-devices.json）、Poll() で飛行軸セット（Pitch/Roll/Yaw/Throttle01＋ブレーキ/ギア/フラップボタン）を返す。
- 受け入れ **PASS**：列挙 API 動作、割当の保存→消去→復元の往復一致、デバイス無しでも Poll は例外なくゼロを返す。
- 正直な限界：**VM 内に物理デバイスが 0 件**のため、実デバイスでの軸の動きは未確認（ユーザーの PC で要確認）。飛行ループへの実消費（CockpitMain の入力経路への接続）は Stage 12 の画面統合で行う——現状の Poll は「消費可能な形で用意された」段階。

## 6. 環境メモ

- /tmp は 512MB の tmpfs で、満杯になると pip や Unity の一時処理が落ちる。本段階で 2 回踏んだ（torch 取得失敗の一因）。大きなダウンロードは ~/workspace 側へ置くこと。
- 過去ステージのドライバが Slice シーンに残留し再生時に例外ログを出す問題は Stage 12 のシーン整理で解消予定（Stage 10 レポートにも記録済み）。
