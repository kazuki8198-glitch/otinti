# CADET Godot 移植 Phase 4 — 空間オーディオ（項目3）ノート

担当系統: 空間オーディオ。成果物は新規ファイルのみ（既存ファイルは無編集）。

- `src/audio_engine.gd` — `CadetAudioEngine`（`class_name`、Node3D = Node のサブクラス）
- `test/run_audio.gd` — ヘッドレステスト（202 checks / 0 failures、終了コード 0）
- 本ノート

音源はすべて GDScript 実行時に `AudioStreamWAV` を手続き合成する方式のため、
`assets/audio/` の生成物と `tools/gen_audio.py` は不要だった（外部アセットなし）。

## 設計出典との対応表

出典は主にゲーム品質ウェーブ版 `~/workspace/cadet-wt-gameq/cadet/src/audio/sfx.js`
（基礎のエンジン/風切り音は `~/workspace/cadet-wt-next/.../sfx.js` と同一系統で照合済み）。
JS テストの期待値は `cadet-wt-gameq/cadet/test/sfx.test.mjs`。

| 原典 (sfx.js) | Godot 実装 | 数値の根拠 |
|---|---|---|
| バス構成 unlock(): master → compressor → destination、配下に eng/amb/radio の3群 | AudioServer バスをコードで構成: Master 配下に Engine / Wind / Weather / Mech / Alert（全て send = Master）。統合側の要望で5分割に拡張。コンプレッサは Master を他系統と共有するため本系統では付けない（統合判断に委ねる） | バス名・send は `setup_buses()`、冪等（再生成・他インスタンスと共存可） |
| エンジンサイクル: 4気筒・2回転1サイクル、`fc = max(rpm,60)/120`、点火/ブレードパス = rpm/30 | `cycle_hz()` / `firing_hz()`（static）。エンジンループは点火パルス列 40 Hz で合成し、`pitch_scale = firing_hz / 40` で追従 | パルス形状は原典 `pulses()` の「速い立ち上がり＋指数減衰」を 1024 点テーブルで近似＋10 Hz サイクル基本波 |
| roughness → 速度の揺らぎ: `jd.gain = 25 + 160*idle + 300*rg`（cents、7 Hz LP 前段） | `wobble_cents(rough) = 25 + 300*clamp01(rough)`（idle=0 の形）、全形は `wobble_cents_at(rough, idle)`。実再生では決定論的 RNG のジッタ値（15 ms ステップ、原典のジッタバッファ相当）を乗じて `pitch_scale` を `2^(cents/1200)` で変調 | 下記「roughness 写像の検証点」参照 |
| roughness → misfire 間引き: `rg > 0.02` のとき 0.05 + rng*0.11 秒ごとに判定、`rng < rg*0.55` で脱落、脱落時は排気レベル `0.08 + rng*0.25` | `misfire_probability()` / `misfire_drop(rough, rng_value)` / `misfire_level()` / `misfire_interval()`（全て static・純粋）。`update_state()` が同スケジュールで状態を持つ | 閾値 0.02、係数 0.55、レベル 0.08–0.33 は原典そのまま |
| 排気レベル: `fire * (0.14 + 0.2*thr + 0.06*r)`、`fire = smoothstep(rpm, 250, 480)`、r = rpm/2400 | `exhaust_level()`（static）。再生レベルはこれに misfire 係数と車内ミックス（内 0.62 / 外 0.72、原典 mixG）を乗算 | 原典 `voice()` / `engine()` |
| 車内の muffling: lp1 内 1000 / 外 9000 Hz、lp2 内 2000 / 外 16000 Hz、boom 内 +3 dB | Engine バスに `AudioEffectLowPassFilter` を2段載せ、`inside` でカットオフを切替（boom の peaking は未搭載、下記「限界」） | 原典 `engine()` の glide 値そのまま |
| 風切り音: `u = min(ias/120, 1.4)`、ゲイン `u² * (内 0.04 / 外 0.09)`、帯域 内 380+500u / 外 500+1500 Hz、tc 0.2 | `wind_gain()` / `wind_band_hz()`（static）。Wind バスのループプレイヤー（帯域は pitch_scale で移動） | 原典 `engine()` |
| タイヤのランブル: 地上で `min(ias/30,1) * (内 0.1 / 外 0.06)`、LP 120 Hz | Wind バスの追加プレイヤー（風ループを pitch 0.22 に落として代用）、`rumble_gain()` | 原典 `engine()` |
| 雨（機体）: `rn * (0.012 + 0.05*rsp²) * (内 1 / 外 0.6)`、`rsp = min(ias/110, 1.25)`、帯域 1000+1900*rsp、tc 0.35（gameq 版の追加分） | `rain_air_gain()` / `rain_band_hz()`（static）、Weather バスのプレイヤー | 原典 `engine()`（gameq 版） |
| 雨（地上の環境音）: `rain * 0.05 * (1 - 0.8*indoor)`、帯域 LP 1500 Hz。エンジングラフが生きている間は機体側の雨に置き換わる | `rain_ground_gain()`（室内係数は cockpit indoor ≈ 0.6 → 0.52）。地上かつエンジン停止・非始動のときだけ Weather バスの別プレイヤーで再生 | 原典 `startAmbience()` / `apply()` |
| スタータ: 約2.6 s、モーター 140→430 Hz、圧縮 C=[0.24,0.5,0.76,1.0,1.23] で 330 Hz へ引きずられ、1.46 s から 90 Hz へ落下。圧縮ごとの chuff＋48 Hz サンプ、点火 F=[1.42…2.21]（78→45 Hz サンプ） | `_gen_starter()` が同パラメータで 2.7 s のワンショットを合成。`update_state()` の `starting` 立ち上がりで `one_shot("starter")` を発火し、始動中は `fire = smoothstep(since, 1.75, 2.45)`（3.5 s 以降 0）の原典の「catch」窓を再現 | 原典 `starter()` / `voice()` |
| バックファイア | ワンショット `backfire`（低域ノイズバースト＋100→55 Hz サンプ、0.4 s）として新規合成。**原典 sfx.js に独立関数はない**。misfire で未燃ガスが排気で弾ける音として、misfire 写像の対になるワンショットという位置づけ（勝手な数値ではなく既存の thump 系パラメータ流用） | 派生（原典に無し）。不要なら統合時に外してよい |
| ギア: 電動油圧ポンプの唸り、鋸波 410 Hz + LP 900、ゲイン 内 0.012 / 外 0.006、移動中のみ（約6 s の移動） | `gear_gain()`、410 Hz 鋸波ループ（周期 LP で平滑）を `gear_moving` の間だけ Mech バスで再生。ワンショット `gear` は 2.5 s バースト版 | 原典 `buildEngine()` の gm |
| フラップ: pa44 はモーター鋸波 165 Hz + LP 650、ゲイン 内 0.009 / 外 0.004、移動中のみ。pa28 は手動レバーなのでモーターではなくクリック | `flap_gain()`。`flap_moving` 中: pa44 は 165 Hz ループ再生、pa28/pa28r は立ち上がりで `one_shot("flap_step")`（3600 Hz ノッチクリック×3、原典 click() の 3600 Hz / 0.014 s が根拠）。ワンショット `flap_step` は機体族で中身が切替わる | 原典 `buildEngine()` の fm とコメント |
| ストールホーン: 三角波 2800 Hz、ゲイン 内 0.028 / 外 0.018 | `horn_gain()`、2800 Hz 三角波ループを Alert バスで `stall` の間だけ再生 | 原典 `buildEngine()` の horn |
| チャイム: 1175 Hz 0.3 s → +0.17 s で 880 Hz 0.42 s（tone() の包絡） | ワンショット `chime`（Alert プール）、`_add_tone()` が同包絡（attack 0.006 s、指数減衰）で合成 | 原典 `chime()` / `tone()` |
| AP 切断ウォーブル: 1240/940 Hz 交互×6、0.1 s、間隔 0.115 s | ワンショット `ap_disc`（Alert プール） | 原典 `apDisc()` |
| スイッチ/ノブ: click 3600 Hz、knob 4800 Hz の短いバースト | ワンショット `click` / `knob`（Mech プール） | 原典 `click()` / `knob()` の burst 周波数 |
| レベルの glide（setTargetAtTime の時定数） | `_set_level()` が同じ時定数（engine 0.05、wind 0.2、rumble 0.08、rain 0.35）で指数平滑 | 原典 `glide()` 呼び出し値 |

### roughness 写像の検証点（0.85 / 0.9 について）

タスク指定の「0.85 で ±150 cents / 0.9 で misfire」は、原典コード内の閾値ではなく
JS テスト（sfx.test.mjs）の検証点である。原典の実式に当てると:

- `wobble_cents(0.85) = 25 + 300*0.85 = 280` cents。健全時 25 からの増分は **+255 cents** で、
  JS テストのアサーション「rough 0.85 で wander が +150 cents を超える」を満たす（=150 そのものではない）。
- misfire は `rough > 0.02` から確率 `rough * 0.55` で常時起こり得る。0.9 は確率 0.495（約半分）になる
  代表点で、JS テストは 0.9 で「数秒の間に脱落と復帰が観測できること」を検証している。
  本実装のテストも同じ観点で、0.9 で約9秒分の `update_state` を回し排気レベルの脱落を assert する。

境界値は `test/run_audio.gd` の `audio.roughness` グループで 0 / 0.02 / 0.85 / 0.9 / 1.0 を検証済み。

## バス構成

```
Master
├─ Engine   エンジンループ（AudioStreamPlayer3D）。LP 2段（inside で 1000/2000 Hz、外で 9000/16000 Hz）
├─ Wind     風切りループ＋タイヤランブル（どちらも AudioStreamPlayer3D）
├─ Weather  雨（機体）ループ＋雨（地上）ループ（AudioStreamPlayer3D）
├─ Mech     ギアループ、pa44 フラップモーターループ、ワンショットプール×6
└─ Alert    ストールホーンループ、ワンショットプール×4（chime / ap_disc）
```

- バスは `setup_buses()` がコードで冪等に構成する（既存バスは再利用、send は全て Master、0 dB）。
- 全プレイヤーは `CadetAudioEngine`（Node3D）の子。`attach_aircraft()` で受けた機体ノードの
  `global_transform` を `update_state()` と `_process()` で毎回コピーするので、3D プレイヤーは機体に追随する。
- リスナーは Godot 標準どおり現在のカメラ（AudioListener3D を置けばそちら）。コックピット/外部の
  切替は `inside` フラグ側（LP とゲイン）で表現し、プレイヤー自体は切り替えない。
- レベルの絶対値は原典の Web Audio 線形ゲインをそのまま dB 換算している（`linear_to_db`）。
  原典の master 0.8 + コンプレッサ分は未適用なので、全体に静かめなら統合側で Engine バス等を
  数 dB 持ち上げるのが安全（バス単位で調整可能）。

## 統合手順（scenes/main.gd 側・統合担当向け）

`scenes/main.gd` は本系統では編集していない。以下の配線が必要:

1. preload と生成（`_ready()` の bridge 生成後あたり）:

```gdscript
const AudioEngine = preload("res://src/audio_engine.gd")
var audio_eng = null
# _ready() 内:
audio_eng = AudioEngine.new()
add_child(audio_eng)
audio_eng.attach_aircraft(aircraft)   # 既存の aircraft: Node3D
```

2. 毎フレーム（`_process()` の `_step_bridge()` 後、`bridge.panel()` が使える場所）:

```gdscript
if audio_eng != null and bridge.get_L() != null:
    var p: Dictionary = bridge.panel()
    audio_eng.update_state({
        "rpm": float(p["rpm"]), "thr": float(p["thr"]),
        "rough": 0.0,                      # 下記「未完」参照（現行 bridge に roughness の発生源なし）
        "running": bool(p["engRun"]),
        "starting": false,                 # 下記「未完」参照
        "ias": float(p["ias"]), "on_ground": bool(p["onGround"]),
        "rain": 0.0,                       # 下記「未完」参照
        "gear_moving": String(p["gear"]) == "moving",
        "flap_moving": bool(p["flapMoving"]),
        "aircraft_id": aircraft_id,        # main.gd の既存変数 ("pa28"/"pa44"/"pa28r")
        "stall": bool(p["stall"]),
        "inside": not view_external,       # main.gd の既存変数
    })
```

3. ワンショット（任意のイベント箇所で）: `audio_eng.one_shot("chime")`（レッスンステップ進行時）、
   `one_shot("backfire")`（misfire 系イベントを統合側で起こすとき）、
   `one_shot("click")` / `one_shot("knob")`（コックピット操作時）、`one_shot("ap_disc")`（AP 切断時）、
   `one_shot("gear")` / `one_shot("flap_step")`（連続再生でなく単発で鳴らしたい場合）。
   未知の名前は warning を出して false を返すだけで落ちない。

4. 機体切替（`_cycle_aircraft()`）時は `attach_aircraft(aircraft)` の再呼び出しは不要
   （`aircraft` ノード自体は不変で中身だけ差し替わるため）。`aircraft_id` は状態 Dictionary 側で渡す。

## テスト

```
~/workspace/tools/godot/Godot_v4.7.2-stable_linux.x86_64 --headless --path ~/workspace/cadet-godot -s test/run_audio.gd
# GROUP audio.buses     checks 33 failures 0
# GROUP audio.streams   checks 84 failures 0
# GROUP audio.roughness checks 39 failures 0
# GROUP audio.state     checks 27 failures 0
# GROUP audio.oneshots  checks 19 failures 0
# == Phase 4 audio total: 202 checks, 0 failures   (exit 0)
```

検証内容: バス構成と send 先、Engine バスの LP 2段、全15ストリームのサンプル数/レート/形式/
ループ点/無音でないこと、roughness 写像の境界値（0 / 0.02 / 0.85 / 0.9 / 1.0）、
`update_state()` を空・ジャンク・極端な Dictionary で呼んでも落ちないこと、機体追随、
inside/outside の LP 切替、雨・ホーン・ギア・フラップの開始/停止、始動エッジ、
rough 0.9 での misfire 脱落、ワンショットの成否。

**音が「良い」かはヘッドレス（ダミーオーディオドライバ）では判定不能。**
本テストは構造・数値・堅牢性のみを検証する。音質の最終判断は実機（ユーザーの PC）での
試聴が必須で、特にエンジンループのパルス形状、全体レベル、LP の効きは未検証のまま残る。

## 未完・限界

- **双発（pa44）の2ボイス未対応**: 原典は左右2エンジン（パン ±0.38、微妙な rpm 差でうなり）。
  本系統の状態契約は単一 rpm のため1ボイスで再生する。pa44 でも破綻はしないが、うなりは無い。
  契約に `engines` 配列を足せば拡張可能（統合側の判断）。
- **roughness / rain / starting の発生源が Godot 側に未配線**: 現行 `flight_bridge.panel()` に
  roughness と降水量は無く、始動シーケンスの状態も panel には出ていない。統合時は当面
  `rough: 0.0, rain: 0.0, starting: false` で安全に動く（その場合 misfire・雨・スタータは鳴らない）。
  systems 側の roughness 移植／天候の橋渡しが入った時点で Dictionary に足すだけ。
- **boom（車内の 105 Hz peaking +3 dB）未搭載**: LP 2段のみ。必要なら Engine バスに
  AudioEffectEQ のバンド追加で再現可能。
- **プロペラのスウィッシュ/クラックルの分離なし**: 原典は排気・クラックル・バルブトレイン・
  プロペラバズ/スウィッシュを別ノードで合成するが、本実装は1ループに焼き込んだ近似。
  rpm/thr での個別の立ち上がりの違いは再現していない（レベルは排気項に代表させた）。
- **ジッタの質感**: 原典の 9 秒ジッタバッファ＋7 Hz LP の滑らかさに対し、本実装は
  15 ms ごとのランダム目標への指数追従で近似。断続感が残る可能性は実機試聴で要確認。
- **ドップラー無効**: AudioStreamPlayer3D の doppler_tracking は無効のまま（自機音が対象で
  相対速度ゼロのため不要という判断）。他機（トラフィック）の音は本系統の範囲外。
- **音量設定との接続なし**: 設定画面の engine/amb/radio 群ボリューム（原典 setVolumes）は
  バス単位で `AudioServer.set_bus_volume_db()` を叩けば対応できるが、本系統では配線していない。
- 生成は決定的（固定シード）: スタータの点火のばらつき等、原典が毎回ランダムに変える部分は
  固定パターンになっている。
