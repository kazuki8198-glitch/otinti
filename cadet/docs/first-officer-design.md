# 副操縦士フェーズ 設計メモ（growth/first-officer）

卒業で終わっていたキャリアの続き。卒業 → 翔洋航空入社 → 型式移行訓練（737級）→ 羽田拠点の路線運航（FO）→
一人前FO → 機長昇格訓練への入口、まで。既存の流儀（設計 v1：能力値は操縦を楽にしない／疲労は操縦感を
変えない／試験は30問・真の80%・分野フロア60%／standards 採点）に厳密に沿う。

## 正直な割り切り（先に書く）

- 737 は「737-800 型の教材モデル」。ジェット専用 FMS、MCP の本格再現、型式固有のシステム
  （油圧系統図・電気系統の深掘り）はしない。AP は既存の枠（HDG/ALT/NAV/APR/VS/LVL＋FD）をそのまま使う。
- コックピット3Dは既存機の流用。エンジン表示だけジェット用（N1・EGT・燃料流量）に差し替える。
- フラップは教材用に4段（UP / 5 / 15 / 40）。実機の中間段（1/2/10/25/30）とスラットの独立作動は畳む。
  スケジュールの考え方（離陸5、進入15→40、Vref の決め方）は実機どおりに教える。
- 燃料タンクは既存モデルどおり左右2タンク（実機のセンタータンクは畳む。セレクターは
  「ポンプ」の読み替えで、給油の考え方はレッスン文で触れる）。
- 路線の世界座標はゲーム用に圧縮配置。路線表の距離・所要時間・燃料は実数ベースで別に持つ
  （ロスター・ブリーフィング・航空日誌の数字はそちらを使う）。
- 路線運航の飛行はフェーズ制：出発空港（実飛行）→ 上昇 → 巡航（PM タスク＋「巡航を進める」
  圧縮：位置を TOD 手前へ進め、燃料と時刻を差し引く）→ 降下・進入 → 到着空港（簡易滑走路）→ 着陸。
  巡航を全部飛ぶ選択も残す（圧縮は任意）。

## S2 機体：b737（physics 両面：flight-lab/src/physics.js と cadet/src/flight/sorajima.js）

AIRCRAFT 追加（id 'b737', short '737', name 'Boeing 737-800 型'):

| 項目 | モデル値 | 実機 737-800（公表値） |
|---|---|---|
| 基準質量（標準訓練搭載） | 48,000 kg | 運航空虚 41,413 kg／最大離陸 79,016 kg |
| 翼面積・スパン・MAC | 124.6 m² / 35.8 m / 3.48 m | 同（124.6 / 35.79 / 4.19 平均） |
| エンジン | 2 × 121.4 kN（静止推力合計 242.8 kN） | CFM56-7B27 27,300 lbf × 2 |
| 離陸距離（48t・SL・ISA） | 目標 950–1,150 m（LAB 1,200 m に収める） | 48t 級では約 1,100 m（軽量時） |
| 離陸距離（62t・路線搭載） | 目標 1,700–2,000 m | 約 1,900 m（65t 級） |
| 初期上昇率（48t） | 目標 2,600–3,400 fpm | 約 3,000 fpm 級 |
| 巡航 | M0.78 / 約 450 KTAS（FL350） | M0.78–0.785 |
| Vref（F40） | 48t: 約 124 kt / 62t: 約 140 kt | 65t で約 139 kt |
| 着陸距離（48t・逆噴射＋スポイラー） | 目標 1,000–1,300 m | 実着陸距離 約 1,450 m（最大着陸重量時） |

- v 速度（48t 基準・derive で質量スケール）: rotate 128 / y（初期上昇）150 / cruise（M換算の目安として）
  300 KIAS / appr 138 / apprFlaps 3（40）/ fe 230（F15 まで 200 の段階表示はレッスン文で）。
  flapLabels ['UP','5','15','40']。
- ジェットエンジン（step 内に A.jet 分岐を新設。ピストン経路は無変更）:
  - 状態 e.n1（%）。目標 N1 = 20 + 84 × thr^1.15（アイドル約 20%、最大約 104%）。
  - スプール：一次遅れ τ = 2.0 + 3.8 × (1 − n1/100) 秒（アイドルからは約 5–6 秒、高 N1 では約 2 秒）。
    ゴーアラウンドの「押してから出るまで」の遅れが教材の核。
  - 推力（1発）: frac = clamp((n1 − 20)/84, 0, 1)^1.55 × T0/2 × σ^0.85 × (1 − 0.10 × Mach)。
  - EGT: 目標 420 + 5.6 × n1（°C、アイドル約 530、離陸約 1,000 を上限に丸める）。表示は °C。
  - 燃料流量: shaftW = T × max(u, 25)/0.82 から既存式（gal/h）。巡航で片発約 330 gal/h 級を目標に ffK で調整。
  - リバーサー: s.rev（0..1、地上・着陸後だけ効く）。推力 = −0.38 × 静止推力 × rev × 速度フェード
    （60 kt 以下で絞り始め 25 kt で 0）。キー: Backslash（CA）／ FL 側も同じ割当。離陸中の展開は不可（重量が乗っている間だけ）。
  - スポイラー（速度ブレーキ兼用）: s.spoiler（0..1）。空中: 抗力 +0.05・揚力低下（cl0 −0.30 × spoiler を
    wing 要素へ）。地上: 揚力ダンプで接地荷重を増やし制動を効かせる（同じ揚力低下で近似）。キー: B の長押しではなく
    トグル（既存の brake キーと別。割当は実装時に空きを確認し controls の表に足す）。
  - プロペラ系モーメントゼロ（pr.a0/a1/tq/fin = 0、Ip = 0）。混合気・マグネト・キャブ氷結・気筒温度は
    ジェットでは生成しない／通らない。故障時は風車ドラッグのみ。
  - rpmFor: ジェット分岐 — 目標 N1 からファン回転数（100% ≒ 5,200 rpm）を返す。step の e.rpm は e.n1 に追随。
  - steadyState: thrust() にジェット分岐（目標 N1 で定常）。guide の rpm 表示は N1 に差し替え（school の pwrTxt は
    A.jet のとき「N1 約 xx%」）。
- WB: 737 用テーブル（mtow 174,200 lb、CG 640–690 in、燃料アーム 655 in、tabsGal なし→ 'half' を使う）。
  標準搭載（前2名・燃料80%）＝48,000 kg になるよう A.phys.mass を置く（既存の流儀）。
  路線搭載は applyLoading ではなく質量指定（62,000 kg）で作る（LOADINGS に 'line' 相当の
  front/rear/bag では届かないため、ライン運航は newState の mass 指定＋wb 表示は近似と明記）。
  → 実装判断: WB は入れる（チェックリストの重量行が動く）。路線便は mass 62,000 で開始し wb は null
  （「標準の搭載」表示）。この割り切りをここに明記する。
- アビオニクス（avionics.js）: A.jet のとき MFD エンジン表示を N1（%）・EGT（°C）・FF（gal/h→kg/h 表示は
  しない、gal/h のまま既存単位系に合わせる）に。PFD の速度帯はそのまま（マッハ表示は PFD 下部の
  小表示として mach を追加：o.mach は既存）。AP は無変更で動くこと（速度域が上がるだけ）。

## S1 型式移行訓練（FLIGHT LAB s7 ステージ＋ CADET 章 fo1）

レッスン（FL syllabus、stage s7 '型式移行（737級）'、全て aircraft 'b737'）:

| id | 題 | 開始 | 終了 | 中身 |
|---|---|---|---|---|
| j1 | 離陸とフラップスケジュール | runway | air | 自前 ATC 付き（OWN_TAKEOFF 追加）。Vr 128 で引く、陽率上昇で脚、400 ft で F5→UP は速度で（F5 退避 170 kt 目安）、加速高度 1,500 ft、3,000 ft まで |
| j2 | 高速域と降下計画 | area 6,000 ft/250 kt | area | 250→300 kt 加速、N1/EGT/FF の読み、スポイラー降下、3:1 降下計画、減速スケジュール（200 kt までに F15 の考え方） |
| j3 | エンジン異常と片肺運航 | area | area | engR 故障ステップ。ジェットの片肺は「推力の非対称は小さいが性能が半分」：ドリフトダウンの考え方、片肺での上昇限界、戻る判断 |
| j4 | 進入・着陸とゴーアラウンド | final | stopped | F15→F40 のスケジュール、Vref+5、1回目は 500 ft でゴーアラウンド（TOGA：スプール遅れを体感）、2 回目で着陸（standards） |
| j5 | 型式限定チェック | runway | stopped | 通しプロファイル：離陸→上昇→高速域→片肺（短時間）→進入→着陸。採点は既存 standards |

- END_OF: j1 'air' / j4 'stopped' / j5 'stopped'。day planFor に b737 分岐（pa28r と同型）:
  j4 の日 [j1, j4]、runway 開始 [id, j4]、area 開始 [j1, id, j4]。
- チェックリスト: CADET 側に checklists-jet.js（before_start / start / after_start / runup / after_landing /
  shutdown の6種、マグネト項目なし、runup は「エンジン計器の確認」に置換）。FL 側は
  before_takeoff_jet / before_landing_jet を school.js に追加し j 課目が参照。
- 学科試験: quiz バンク q_jet（分野 jet＝ジェットエンジンと高速飛行／perf＝性能と運航／sys＝737級
  システムと手順 の3分野・各10問＝30問）。CADET EXAMS に 'type'（型式限定学科、n:30 / pass:80 /
  banks は3分野フロア60%）。クラス（座学）は既存 CLASS の仕組みに足さない（学科は試験のみ＋
  レッスン内の教官の言葉で学ぶ。ch7 の complex が exam のみだった前例に倣う）。
- 章 fo1（CADET career）: STAGE.fo1 = { lessons: ['j1','j2','j3','j4'], exam: 'type', check: 'typerate',
  ftd: [] }、CHECKS.typerate = lessons ['j5']、kind 'checkride'。laterSchedule の流儀で
  「学科 → j1..j4（1日1課目）→ 型式チェック」。解放: beginFirstOfficer()（beginEndorsement と同型、
  卒業済み・未入社なら chapter 'fo1' へ）。
- 入社の導線: 卒業後の会話に「翔洋航空に入社する」選択肢（卒業式の夜〜エピローグ後。
  エピローグの右席の彼が今度は自分の席になる、という一言を添える）。入口は (a) 卒業翌日以降の
  ロビー/教官会話の hook、(b) タブレットの記録画面のボタン、の2つ（ch7 の入口未配線の轍を踏まない）。
- 成長（LESSON_GROWTH 追加、既存の上限つき）: j1 hand 2.4 / j2 know 2.4 / j3 judge 2.4 / j4 hand 2.4 /
  j5（チェック）成長なし（審査の流儀）。試験 'type' は examGrowth の既存式。

## S3 路線運航（章 fo2、CADET 独自モジュール flight/line.js）

- ロスター: fo2 の日は laterSchedule と同型の生成で「勤務日」と「休日」を交互に（勤務は最大で
  連続4日まで、のち休日）。勤務日 = 1〜2 レグ（路線は seed で決定的に選ぶ）。FDP: 1勤務の
  飛行+準備で疲労 +26（既存 tire() の物差し：飛行日 +15・試験 +8）。疲労 65 以上は勤務不可
  （IMSAFE の既存ライン：「今日は乗務できません」が schedule の状態として出る）。
  連続勤務の上限で growth が鈍るのは既存の tiredGrowthK のまま。
- 機長 NPC: 3名のロスター（性格で評価の物差しが少し違う：厳格／標準／温厚 — 評価式の係数のみ）。
  レグごとに PF/PM 交替（1レグ目 PF、2レグ目 PM、翌勤務は逆から）。
  - PF の採点: 離陸・着陸の standards（既存 analysis の着陸解析＋飛行全体の逸脱率）、
    ゴーアラウンド判断の適否。
  - PM の採点: 巡航・降下中のモニタータスク（コールアウト確認、高度・速度の読み上げクイズ形式の
    選択肢、チェックリスト項目の実施タイミング）＋ 無線応答の正答率。PF が機長のときは
    機長が「飛ばし」、プレイヤーは PM として乗る（飛行自体は AP＋機長の自動操縦で進む：
    実装はフェーズ遷移とタスク提示のみ、航空機は圧縮遷移で進める＝ PM レグは操縦しない。
    この割り切りをここに明記）。
- 路線（羽田 HND 拠点。実数ベースの表）:

| 路線 | 距離 | 標準所要（ブロック） | 巡航高度 | 備考 |
|---|---|---|---|---|
| HND–KMQ（小松） | 290 km | 1:05 | FL240 | 最初の路線（短距離） |
| HND–CTS（新千歳） | 820 km | 1:35 | FL370 | |
| HND–FUK（福岡） | 880 km | 1:55 | FL380 | |
| HND–OKA（那覇） | 1,550 km | 2:35 | FL390 | 長距離：燃料判断が重い |

- 空港データ（flight/airfields.js に line 用を足す。座標は世界内の圧縮配置）:
  HND: n −120000, e +60000, RWY 34 hdg 340, len 3000, elev 21 ft。
  KMQ: n −60000, e −120000, RWY 06 hdg 060, len 2500, elev 36 ft。
  CTS: n +150000, e +20000, RWY 01 hdg 010, len 3000, elev 70 ft。
  FUK: n −30000, e −160000, RWY 16 hdg 160, len 2800, elev 30 ft。
  OKA: n −190000, e −190000, RWY 18 hdg 180, len 3000, elev 12 ft。
  簡易シーナリー = world/strip.js の buildStrip で滑走路帯＋誘導路の最小構成（建物なし）。
- ディスパッチ判断（出発前ブリーフィング、選択肢）: 天候（到着地の横風・視程）、MEL（1件の
  持ち越し不具合：例「APU 不調」は可／「逆噴射1基不作動」は雨天滑走路では不可、等）、
  燃料（予備の考え方：代替空港分＋30分）、遅延（定時か安全か）。正解は状況から一意に決まる
  ようデータで作り、JUDGE 成長に接続（flight 当日の decision と同じ物差し）。
- 飛行中の事象（seed 決定的、1勤務に最大1件）: 到着地の天候悪化（ダイバート判断：代替空港表から
  選ぶ→代替地へ着陸）、乱気流の回避高度変更、到着地混雑のホールディング（燃料の再計算）。
  ゴーアラウンドは天候イベントと連動（視程が下限未満なら復行が正解で、強行着陸は大きな減点＋
  機長評価に記録）。
- フェーズ機械（line.js、divert.js と同じ純粋ステップ機械）:
  brief → dispatch（判断）→ depart（離陸・実飛行）→ climb → cruise（PM タスク／圧縮）→
  descent → approach → landed（採点）→ debrief。PM レグは brief → dispatch → ride（タスク列）→
  debrief。update(観測値) 駆動でテスト可能に。

## S4 進行と到達点

- 記録（career.state.fo）: sectors（レグ数）、blockMin（飛行時間）、captain 評価点の平均、
  lineCheck の合否。航空日誌にも路線便の行が入る（既存 logbook の形で、機長名と路線）。
- 到達点: sectors ≥ 12 かつ blockMin ≥ 900（15時間）で「定期審査（ラインチェック）」が
  スケジュールに出る。ラインチェック = PF レグ1本を審査官役の機長と飛ぶ特別レグ
  （採点の物差しが厳しい版：合格ライン score 70）。合格で state.fo.done = true、
  「一人前の副操縦士」カード＋機長昇格訓練の予告ダイアログ（入口のみ、章は作らない）。
- 能力値: 既存4軸のまま（新軸は作らない。ライン運航は JUDGE と COMM の比重が高い：
  PF レグ完遂で hand 1.2 / judge 1.2、PM レグで comm 1.6 / know 0.8、ディスパッチ正解で judge 1.0。
  上限は既存の成長式のまま）。
- 検証: 通しプレイボット（career の ? ではなく line.js の機械＋ career の進行をヘッドレスで
  回すテスト）で、卒業 → 入社 → 学科 → 型式チェック → ライン 12 セクター → ラインチェック
  合格まで詰まらないことを確認する。操縦そのもののボットは FLIGHT LAB 側の j 課目テストで担保。

## ファイル分担（並行ストリームの境界）

- A 物理: flight-lab/src/physics.js、cadet/src/flight/sorajima.js、flight-lab/src/avionics.js、
  新規 test（FL: test/jet.test.mjs）。数値計測スクリプトで目標表と対比。
- B 課目と学科: flight-lab/src/syllabus.js、flight-lab/src/quiz.js、flight-lab/src/school.js
  （jet チェックリスト追加のみ）、新規 test（FL: test/jet-lessons.test.mjs）。
- C キャリア: cadet/src/career/career.js、cadet/src/career/day.js、
  cadet/src/content/checklists-jet.js（新規）、cadet/src/content/dialog/first-officer.js（新規：
  入社会話＋機長の言葉）、新規 test（cadet: test/fo-career.test.mjs）。
- D ライン運航: cadet/src/flight/line.js（新規）、cadet/src/flight/airfields.js（line 空港追加）、
  新規 test（cadet: test/line.test.mjs）。
- 統合（本体）: cadet/src/main.js、cadet/src/flight/fly-mode.js、タブレット UI、シーナリー、
  両ビルド、最終テスト。
