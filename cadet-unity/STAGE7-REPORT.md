# STAGE 7 REPORT — 737 表示（PFD/ND/EICAS/CDU）＋接写ビュー

正本：`~/workspace/cadet-wt-free` @93441f6（現行デフォルト f74ab60 相当）。対象は課題リスト第2項。

## 完成したもの

### 描画ロジックの移植（同値証明つき）
- `flight/src/CadetBoeingDraw.cs`：boeing.js の draw 関数6種（PFD/ND/EICAS 上下/予備 ISFD/CDU）と update() スケジューラ（PFD 30Hz・ND/EICAS 10Hz・予備 15Hz・CDU は dirty 時＋1秒、電源喪失で全 DU 黒塗り一回、DU ソース切替、ルート引き継ぎで CDU from/to 自動入力、gearTransitT）を逐語移植。描画は `IBCanvas` 抽象越し。
- ゴールデン検証：`tools/golden-boeing.mjs` が実物 boeing.js を録画キャンバスで駆動（地上 run 72f → 巡航 12000ft/250kt・AP＋A/T 180f → DU/EFIS 切替 → CDU キー入力 → 電源喪失/復帰 → ギア遷移）→ **696 レコード・約56k ops**。C# ハーネス `flight/test/BotBoeingCs.cs` が同じ入力で再生し **696/696 フレーム・56536/56536 ops 完全一致**（座標は3桁丸め、フォントは size/weight/mono に正規化して比較）。

### Unity ラスタライザ
- `unity/RasterCanvas.cs`：IBCanvas のソフトウェア実装（アフィン変換スタック、偶奇スキャンライン塗り、破線ストローク、円/矩形クリップマスク、αブレンド、Texture2D へのアップロード）。テキストは Unity 動的フォント（DejaVu Sans / DejaVu Sans Mono）のアトラスからグリフをブリット。
- `unity/BoeingGlassMain.cs`：BoeingGlass を所有し、テクスチャをコックピットの view.* 面へ結線（予備 ISFD は小キューブを追加）。実セッションのフレーム（物理 State・アビオニクス・systems の twin/oil・PfdOn・HND-FUK 路線）を毎フレーム供給。
- 接写ビュー：`flight/src/CadetPanelView.cs`（panel-view.js 移植：フォーカス表・Frame(fov/dist)・ズーム）に加え、`CockpitMain.SetFocusView(id)` が Frame の距離/FOV でカメラを計器正面へ。I キー相当の切替先（view.b737pfd/nd/eicasu/eicasl/cdu）すべて動作。

## Unity 内受け入れ（BoeingDriver、play mode 実走）
`boeing-done.txt`（RESULT PASS）：
- 操作子 96 個、コックピット自身のスイッチで通電（bus 12.8V、PfdOn=True）
- ジェットのエンジン始動は原典でもコックピット操作子に無く（始動スイッチは確認項目）、セッションは systems の `SetRunning`（レッスン開始状態）で運転開始 → N1 19.7% アイドル安定
- glass 統計：pfd=90（30Hz×3s）、nd/eicasU/eicasL=31、cdu=3、stby=46
- テクスチャ画素証跡：pfd 1089色・cdu 634色・nd 807色（テキスト込み）
- スクリーンショット：`stage7-eye/pfd/nd/cdu/eicas.png`。PFD は速度 0・高度 68 ft・29.92 IN・目標高度 3,000 が読め、EICAS は N1 19.9/19.9・EGT 530・FF 0・OIL P 63・GEAR DN・FLAP UP・PARK BRAKE SET・TOTAL FUEL 12646 KG の実値、CDU は IDENT ページ（737-800 / CFM56-7B / CADET FMC V1 / CADET OFFLINE）が読める。

## 実測で確定した Unity 6000.3 の事実（再利用価値あり）
- 動的フォントのグリフはアトラス内で、GetPixels32 の行（下から上）基準では「キャンバス上端行＝最小 v・左端列＝最小 u」で **反転なし**に読める。uvTopLeft.y は uvBottomLeft.y より小さい（vSpan は負）。CharacterInfo.flipped/size は廃止/型変更（size は int、bearing は int）。
- 組み込み Cube のパイロット側面はテクスチャを上下左右反転して見せる → マテリアルの mainTextureScale=(−1,−1), offset=(1,1) で正像。
- batchmode では ScreenCapture.CaptureScreenshot がハングする → RenderTexture＋ReadPixels（Stage 6 方式）を使う。
- フォントアトラスは (char,size,style) の新規出現時のみ再読込するキャッシュで十分（再構築はテクスチャ差し替えを伴った）。

## 原典の欠陥（移植は忠実に再現、未修正）
- **boeing.js は `o.hdg` を読むが physics の out に `hdg` は無く `hdgTrue` のみ** → HTML 原典でも PFD 方位ストリップと ND コンパスは常時 000°/北固定（ND のウェイポイント投影も hdgM=0 前提で内部一貫）。Unity 側スクリーンショットでも方位ストリップが北固定であることを確認。推奨修正は `AV.trueToMag(o.hdgTrue, P.MAGVAR_W)` の使用だが、原典側の判断事項として親へ報告する（移植側で勝手に直していない）。

## 残り（Stage 7 範囲外として明記）
- ピストン機の G1000 グラス描画（g1000.js 相当）は未移植（Stage 6 の操作子と Stage 3 のアビオニクス・ロジックはあるが、画面描画が無い）。課題リストの第2項は 737 指定のため本段階の対象外。Stage 8 以降の判断事項。
- MCP の操作は Stage 6 で結線済み（押下→AP/A/T の系統反応はゴールデン 2736/2736 で証明済み）。本段階では表示側との同時実走（A/T→FMA 表示など）を Unity 内で通してはいない — 表示入力が同じ AvionicsState を読むため、CDU/DU 切替の実走（ゴールデン C/D 局面＋Unity 内 stats）で代替確認とした。
