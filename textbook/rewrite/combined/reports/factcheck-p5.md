# factcheck-p5 の報告：第 5 部 第 35 章 `me`・第 36 章 `oei`（W31 の下書き）の事実確認（R3）

単位：factcheck-p5（R3・W31 の事実確認役。下書きを書いた人とは別）。確かめた日：2026-10-31。

対象：`textbook/rewrite/combined/drafts/p5.js`・`p5-figs.js`・`p5.claims.json`。W31 の報告 `reports/W31.md` も読んだ。

確かめたこと：
- 主張の全部（`p5.claims.json` の 151 行と、札のない文）を一次資料と照らした。
- 手順の段階と順番を照らした。照らした手順は、安全の ①（特定・確認・フェザー）、離陸の 3 つの場面、Vmc デモと回復、横滑りゼロ、低い出力での故障、止めたエンジンの片付け、片発の進入と着陸、両発の場周経路と着陸復行、通常の離陸、クロスフィード、アンフェザー、脚の非常用の下げ方。
- 計算の全部を計算し直した（本文・計算演習・記述問題・表・図）。教材のモデルの上昇率は、`physics.js` で計算し直した。
- 図 10 枚（新 6・描き直し 4）を 390 px で描いて、目で見た。
- 日米の書き分け（DESIGN 3.4・6.2 の決まり 6・10）。
- 基礎教材を書き直しているか（写していないか）。

**結論**：must 0・should 5・nit 13。
- **数値の誤りは見つからなかった**。POH（Piper の Information Manual）の速度・系統・手順・性能の図の例、AFH 第 12・13 章、14 CFR（今の 23.2120・23.2135、旧 23.149・23.67）、事業用 ACS、AIM 5-2-9、EASA の型式証明書のデータシート、NTSB SA-081 の数と手順の順番は、全部合う。
- **安全の ① の順番**（特定（Identify）→ Dead foot, dead engine → 確認（Verify）→ ゆっくり絞る → フェザー）は、AFH 第 13 章と POH 3.9a・3.9b と合う。Vmc デモの回復（生きている側の出力を絞り、機首を下げる、止まった側の出力は足さない）も、ACS CA.X.B.S6・AFH・POH 4.47 と合う。
- should 5 つの中身：
  - S1：Vmc デモの形態を「フラップは離陸の位置」と書いている。Seminole の POH 4.47 とガイドは「フラップ UP」。ACS はメーカーの推奨を先に置く。
  - S2：訓練で本当にフェザーする高さを「地上 3,000 ft」とだけ書いている。Seminole の POH 4.47 は 4,000 ft で、ACS は「3,000 ft か機体の推奨の高い方」。
  - S3：「定速プロペラは…出力や推力を一定にする装置ではない（AFH 第 12 章）」。AFH 第 12 章は、ガバナーが「回転数と出力を一定に保つ」と書いている。出典が文を支えない。
  - S4：脚の表示の bk.dont が、Seminole の緑のランプ（下りて固定）を「位置の表示」と「固定の表示」に分けている。Seminole に別の固定の表示はない。
  - S5：出典の付け方が資料と合わない所（本文 1 つ：レバーの色を「ガイド」に付けている。主張の台帳 5 行）。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck-p5.md`（新） | この報告 |

- ほかのファイルは変えていない。下書き・台帳・製品のファイル・`flight-lab/kiso/` のどれも変えていない。
- 台帳のパッチも作っていない。署名は W27 の役（下の 11）。git の操作はしていない。
- 作業ツリーの次のファイルは、流す前から変わっていた（ほかの単位の作業中のファイル）。私は戻していない。
  - 変更：`flight-lab/outputs/FLIGHT-LAB.html`・`cadet/outputs/CADET.html`
  - 追跡されていない：`drafts/p2a*`〜`p6*`、`reports/W28*`〜`W32*` など

## 2. 確かめ方と一次資料（2026-10-31 に自分で取り直して読んだ。W31 の写しは使っていない）

- 写しの置き場：スクラッチのフォルダ（`/tmp/claude-0/-home-user-otinti/b70eea3b-e7d6-5373-8fce-52f9b801af33/scratchpad/fcp5/src/`）。下書きの出典の URL から取り直した。
- 照らし方：下書きは本文・折りたたみ・表・章末（用語・例・注意・確認問題・記述問題）を全部読み、文ごとに資料の該当の所と照らした。

| 資料 | 読んだ所 |
|---|---|
| Piper PA-44-180 Seminole Information Manual（VB-1942、2006-05-26、andrews.edu の PDF。1 ページに 2 面あるので片面を切り出して読んだ） | 2.3（VNE 202・VNO 169・VA 135（3,800 lb）/ 112（2,700 lb）・VLE 140・VLO 下げ 140 / 上げ 109・VFE 111・Vyse 88・VMCA 56「This is a stalled condition」）、2.5（緑の弧 57〜169・白の弧 55〜111・青い線 88・赤い線 56）、2.7（Lycoming O-360 / LO-360・180 hp）、3.3（Vxse 82）、3.5a（見分け方・片付けの順：Throttle RETARD TO VERIFY → Propeller FEATHER (950 RPM Min.) → …、75 KIAS より下か脚 DOWN、75 KIAS より上：Mixture/Prop/Throttle 全部前 → 方向 → フラップ UP → 脚 UP → 特定・確認 → フェザー → 2〜3°・約 1/2 ボール → 88 KIAS、着陸：着陸が確実になってから脚とフラップ 25°・90 KIAS）、3.9a〜3.9j（DEAD FOOT・950 rpm・止めピン、3.9g の再始動の前の電動燃料ポンプ ON・油圧と油温・マグネトー、3.9h、3.9i「片発の着陸復行はできるだけ避ける」、3.9j の −250・−490・−525・−200 fpm）、3.11a（5〜7 秒・スターター 1〜2 秒）、3.23（クロスフィードは水平飛行の巡航だけ・止まった側は OFF）、4.3（Vy 88・Vx 82・Vsse 82）、4.5 / 4.23（Vr 75、通常の離陸のフラップ 0〜10°）、4.31・4.33、4.45（Vsse は制限ではない・82 KIAS）、4.47（認証の条件・56 KIAS は失速した状態・4,000 ft AGL より下で行わない・**Vmc デモの形態は Flaps UP**・1 kt/秒・回復）、4.49（ゼロスラスト 82 KIAS で 1,850・88 KIAS で 2,180 rpm）、図 5-19・5-21（例：1,250 ft・8°C・3,430 lb で 1,505 / 285 ft/min、条件の欄）、7.5（左は操縦席から見て右回り・右は左回り・臨界発動機の要因をなくす・油圧と窒素とばね・約 6 秒・アキュムレーター付きで 10〜17 秒 / 8〜12 秒・950 rpm の止め）、7.7（レバーの並び：THROTTLES・PROPELLERS・MIXTURES）、7.9（電動で逆転する油圧ポンプ・油圧で上げた位置に保つ・非常用ノブ・重さとばね・緑 3 つ＝down and locked・赤 GEAR WARNING＝全上げでも全下げでもない・リザーバーはポンプと一体）、7.15（55 gal × 2・使える 108 gal・電動燃料ポンプは離陸と着陸で ON・「Do not operate with both selectors on X-FEED. Do not take off or land with a selector on X-FEED.」）、7.17（14 V・60 A の発電機を各エンジンに 1 つ）、7.23（左のタンクから約 0.5 gal/h） |
| FAA Airplane Flying Handbook（FAA-H-8083-3C）第 13 章（faa.gov の PDF） | 冒頭（50% の出力で上昇性能 80〜90% 減）、用語（VSSE・VYSE・VMC の今と旧の定義）、仮の双発機（200 × 2・175 → 余り 225 / 25）、認証の基準（6,000 lb 以下・VSO 61 kt 以下は片発の上昇率を決めるだけ、今の 23.2120(b)(1)）、フェザー（風車状態の抗力は機体全体の有害抗力ほど・約 800 rpm の止めピン・地上でのフェザーは勧めない・アンフェザーとアキュムレーター）、プロペラ同調装置、クロスフィード（1,500 rpm・1 分・元のタンクで 1 分・離陸と着陸で使わない・近くに空港があれば使わない）、性能の用語（加速停止・加速継続（50 ft）・上昇勾配・実用上昇限度 100 / 50 fpm・絶対上昇限度）、加速停止距離は規則で求めない、150 fpm・90 kt で 3 分・5 NM、100〜200 fpm、通常の離陸（両方のエンジンの吸気圧力と回転数を見る・脚上げ・ブレーキ）、着陸と着陸復行、低い高さの故障の 3 つの場面、Control（5〜10° を一瞬・2〜3° を超えると上昇が落ちる）、Configuration（Vyse・出力・フラップと脚・特定・確認・フェザー、機体によって脚が先）、Climb（2°・1/3〜1/2）、Checklist（急がず・カウルフラップだけが性能に効く・緊急の宣言）、Dead foot / Raise the dead、部分的な出力、上空の故障、ドリフトダウン、低い出力での故障、片発の進入と着陸（アビームまでに脚 DOWN・フラップ 10・25・3°・Vyse・止まった側への旋回はかまわない・500 ft 以上失う）、Vmc の決め方（動的・静的・旧 23.149 の条件・バンク 1° で 3 kt 以上・20 kt 近く）、Vmc デモ（3,000 ft AGL・Vsse と Vyse の高い方の約 10 kt 上・1 kt/秒・回復）、失速との関係、方向舵を制限する方法（約 20 kt）、スピン（none are required to・回復の 3 つの操作）、横滑りゼロとヨーストリング、3 つの飛び方（8〜10°）、1.5〜2.5°、訓練の決まり（Vmc の 50%・3,000 ft より下はスロットル・400 ft・Vsse・3,000 ft で再始動を終える・軽い重さ） |
| AFH 第 12 章（faa.gov の PDF） | 定速プロペラ（出力を減らすときは吸気圧力が先）、ガバナー（機首上げで羽根を浅く・機首下げで深く、「This allows the engine to maintain a constant rpm and power output」）、羽根の角度の範囲 約 11.5〜40°・止めに当たると固定ピッチと同じ、増やすときは回転数が先・高い吸気圧力と低い回転数はデトネーション |
| PHAK（FAA-H-8083-25C）第 7 章（faa.gov の PDF） | プロペラの羽根のねじり（twist）（N9 の照合のため） |
| eCFR（API） | 14 CFR 23.2120（2026-10-29 現在：(b)(1) レベル 1・2 の低速機で片発の耐衝撃の要件を満たさない機体、5,000 ft・巡航の形態で 1.5%）、23.2135(c)（VMC は較正対気速度）、旧 23.149・旧 23.67（2017-01-03 の版） |
| FAA Commercial Pilot ACS（FAA-S-ACS-7B、faa.gov の PDF） | CA.IX.E・F・G、CA.X.A・B・C・D の知識・リスク・技能の要素、付録 3「Multiengine Considerations」（400 ft AGL と VSSE・VXSE・VYSE、3,000 ft AGL か機体の推奨の高い方、3,000 ft より下はスロットルとゼロスラスト、計算した VMC の 50%） |
| AIM 5-2-9（faa.gov の HTML） | 200 FPNM、「ODPs, SIDs, and DVAs assume normal aircraft performance, and that all engines are operating」 |
| EASA TCDS EASA.A.232（issue 3） | PA-44-180 の State of Design TC Date 10 March 1978、FAR 23 through Amendment 23-16（一部の条はその後の改正） |
| NTSB Safety Alert SA-081（ntsb.gov） | 問題の文（765 時間〜18,000 時間）、5 つの事故（PA-31P・Aerostar 601・BE58・PA-31T・Cessna 421C）、「What can pilots and mechanics do?」 |
| Maneuver Guide Seminole（R.seminoleG、se.edu の PDF） | 速度表（Vxse 88）、通常の離陸（airspeed alive・Vr 75・88 で 500 ft・tap brakes & gear up・110 kt・25 in・2,500 rpm）、通常の着陸（18 in・2,300 rpm・約 100 kt・GUMP・アビームでフラップ 10・200〜300 fpm・ベースで 88・フラップ 25・500 ft・フラップ全部と 80）、着陸復行（Vx 82・片発の着陸復行はしない）、**Vmc デモ（Flaps-remain up・左をアイドル）**、抗力のデモ（200〜250・200〜300・フラップ 45 で 400〜500・500〜600）。**レバーの色の記述はない** |
| Seminole PA-44-180 Pilot's Checklist（R.seminoleCk、mga.edu の PDF） | VXSE 82・VSSE 82・En Route Climb 105（1000 AGL）・BALKED LANDING Flaps 25° 88 KIAS |
| リポジトリのデータ | `physics.js` の pa44（SM の速度表）、`syllabus.js` の m1〜m5（基準・開始点・故障の高さ 250 ft）、`book-figs.js` の vmcRudder のデータ、`ledgers/ACS-MAP.json`、今の `book-5.js` |

## 3. 問題（重い順。場所・何が違うか・直し方・根拠）

### should

**S1　`me.vmc` Vmc デモの手順 1：Seminole の形態を「フラップは離陸の位置」と書いている**
- 場所：`p5.js` 287 行。「…Seminole の POH は 4,000 ft 以上です（POH 4.47）。脚 UP・フラップは離陸（takeoff）の位置・プロペラは高回転にします。」
- 何が違うか：
  - POH 4.47 の「VMCA DEMONSTRATION」は「(a) Landing Gear UP (b) **Flaps UP** (c) Airspeed at or above 82 KIAS (VSSE)…」。
  - ガイドの Vmc デモも「Flaps-remain up」。
  - ACS CA.X.B.S1 は「Configure the airplane in accordance with the manufacturer's recommendations, **in the absence of** the manufacturer's recommendations … b. Flaps set for takeoff」。メーカーの推奨が先。
  - Seminole の通常の離陸のフラップは 0〜10°（POH 4.23）なので、「離陸の位置」は 10° にも読める。節は Seminole の手順として書いているので、POH と食い違う。
- 直し方（例）：「脚 UP・フラップ UP（Seminole の POH 4.47。メーカーの推奨がなければ、ACS はフラップを離陸の位置にする）・プロペラは高回転にします。」
- 根拠：POH 4.47、ACS CA.X.B.S1、ガイド「Vmc demonstration」3)。

**S2　`me.oei` の折りたたみ「事業用 ACS の基準と、実機の訓練での決まり」：本当にフェザーする高さを 3,000 ft とだけ書いている**
- 場所：`p5.js` 347 行。「本当にフェザーするのは、再始動まで地上 3,000 ft より下がらない高さで、再始動できなくても空港に安全に降りられる位置だけです。」主張の行 `me.oei#68d72f0f`。
- 何が違うか：
  - Seminole の POH 4.47 は「The demonstration and all intentional one engine operations should not be performed at an altitude of less than **4000 feet** above the ground」。
  - ACS 付録 3 は「no lower than 3,000 feet AGL **or the manufacturer's recommended altitude (whichever is higher)**」。
  - 同じ章の `me.vmc` 本文と注意（cautions）は 4,000 ft を書いているが、この行だけ 3,000 ft で、Seminole の値が抜けている。安全に関わる高さなので should にした。
- 直し方（例）：「本当にフェザーするのは、再始動までに地上 3,000 ft（機体の推奨が高ければその高さ。Seminole の POH は 4,000 ft）より下がらない高さで、…位置だけです（ACS・AFH・POH 4.47）。」主張の行の出典にも POH 4.47 と ACS 付録 3 を足す。
- 根拠：POH 4.47、ACS 付録 3「Multiengine Considerations」、AFH 第 13 章「Plan unfeathering and restart to be completed no lower than 3,000 feet AGL」。安全の確かめ役（W36）にも回す。

**S3　`me.prop` と図 `propGovernor`：「出力や推力を一定にする装置ではない」に AFH 第 12 章を付けている**
- 場所：`p5.js` 113 行「定速プロペラは回転数を保つ装置で、出力や推力を一定にする装置ではありません（AFH 第 12 章）。」と、`p5-figs.js` 142 行（赤字「出力や推力を一定にする装置ではない」）。
- 何が違うか：
  - AFH 第 12 章は、機首の上げ下げで羽根の角度が変わる所で「This allows the engine to maintain a **constant rpm and power output**」と書いている。出典として付けた資料が、文と逆に読める。
  - 言いたいこと（基礎教材 kiso03.16）は、「保つのは回転数で、出力は吸気圧力と回転数の組み合わせで決まり、スロットルで変わる。推力は速度で変わる」だと思う。これは AFH 第 12 章の「The pilot can also set engine power output by changing rpm at a constant manifold pressure; by changing the manifold pressure at a constant rpm」と合う。
- 直し方（例）：本文「定速プロペラが一定に保つのは回転数です。出力は吸気圧力と回転数の組み合わせで決まり、スロットルを動かせば回転数が同じでも変わります（AFH 第 12 章）。」図の赤字は「一定に保つのは回転数。出力はスロットルで変わる」に（図の箱の 3 行目と同じ意味なので、赤字を消してもよい）。
- 根拠：AFH 第 12 章「Constant-Speed Propeller」（12-5〜12-6）。

**S4　`me.sys` の折りたたみ「脚の表示・燃料ポンプ・ヒーター」の bk.dont：Seminole の緑のランプを「位置」と「固定」に分けている**
- 場所：`p5.js` 144 行。「脚が動いたか・どこにあるかは、位置の表示（緑のランプ・赤の GEAR WARNING）で見ます。」「下げの位置で固定されたかは、固定の表示で見ます。外から見ても分かりません。」
- 何が違うか：
  - POH 7.9：「The three green lights … illuminate to indicate that each of the three landing gear are **down and locked**」。赤の GEAR WARNING は「in neither the full up nor the full down position」。Seminole に、緑のランプと別の「固定の表示」はない。
  - 直前の文（143 行「緑のランプ 3 つ（下りて固定）」）とも食い違う。読む人は、緑とは別の固定の表示を探すことになる。
  - POH 7.9 は、緑が 1 つ・2 つ点かないときの 3 つの原因（固定されていない・電球切れ・表示の故障）と、左のナセルの鏡で前脚が出ているのが見えることも書いている。
- 直し方（例）：3 つの項を「脚のスイッチの位置は、操縦士が出した指令です。／赤の GEAR WARNING は、脚が全部上げでも全部下げでもない（動いている途中）ことを示します。／下りて固定されたかは、緑のランプ 3 つで見ます。点かない緑があれば、固定されていない・電球切れ・表示の故障のどれかです（POH 7.9）。」に。
- 根拠：POH 7.9「ANNUNCIATOR LIGHTS」。

**S5　出典の付け方が資料と合わない所（本文 1 つと主張の台帳 5 行。署名の前に直す）**

本文：
- `me.basics`（`p5.js` 90 行）「レバーは 2 本ずつ並び、左からスロットルが黒、プロペラが青、混合比が赤です（ガイド）。」
  - ガイド（R.seminoleG）にレバーの色の記述はない。POH 7.7 の図 7-1 にあるのは並び（THROTTLES・PROPELLERS・MIXTURES）だけ。
  - 今の本（`book-5.js` 27 行）では「（ガイド）」は、同じ段落の「ゴーアラウンドで…ミクスチャー → プロペラ → スロットル」に付いていた。下書きで文を分けたときに、色の文に付いた。
  - 直し方：並びは「（POH 7.7）」に。色は出典のある資料で確かめるまで外すか、「ふつう」と断って札を付けない言い方に。

主張の台帳：

| 行 | 今の出典 | 一次資料にあること | 直し方 |
|---|---|---|---|
| `me.vmc#45fdd1c1`（3,000 ft・機体の推奨が高ければその高さ） | ACS CA.X.B（risk management の 3,000 ft AGL） | CA.X.B.R1〜R3 に高さはない。3,000 ft と「機体の推奨の高い方」は **ACS 付録 3「Multiengine Considerations」** | ACS 付録 3 と AFH 第 13 章「VMC Demo」 |
| `me.oei#730fdfd5`（400 ft・Vsse（または Vxse・Vyse）） | AFH 第 13 章 | AFH は 400 ft と「VSSE（なければ VYSE）」。**VXSE を並べるのは ACS 付録 3** | ACS 付録 3 を足す（または本文を「Vsse（公表がなければ Vyse）」に） |
| `me.oei#3130c2ca`（3,000 ft より下はスロットルを絞ってゼロスラスト） | AFH 第 13 章 | AFH は「smooth reduction of the throttle」。「throttle to idle and then establishing zero thrust」は **ACS 付録 3** | ACS 付録 3 を足す |
| `me.oei#68d72f0f`（本当のフェザーは 3,000 ft） | AFH 第 13 章 | S2 のとおり（POH 4.47 は 4,000 ft） | S2 |
| `me.basics#de95d1bd`（ブレーキを軽く当てて脚 UP） | AFH 第 13 章・POH 2.3 | 文はガイドの手順（「Positive rate of climb and no runway remaining---tap brakes & gear up」）の要約。AFH は「Some AFM/POHs direct the pilot to apply the wheel brakes momentarily」 | ガイド（Normal Takeoff 8)）を足す |

### nit

- **N1**　`me.vmc` の折りたたみ（300 行）「スピンの試験を求められた双発機はほとんどなく、回復の特性はふつう悪いです。」
  - AFH は「As very few twins have ever been spin-tested (**none are required to**)」と「No multiengine airplane is approved for spins」。「求められた」と「試験をした」が入れ替わっている。
  - 直し方：「スピンの試験をした双発機はほとんどなく（試験は求められていません）、スピンが承認された双発機はありません。回復の特性はふつう悪いです。」
- **N2**　国を書いていない規則の文（決まり 6・DESIGN 3.4。数字はないので検査は通る）。
  - `me.perf` 本文（200 行）「小さな双発機の古い認証の基準は、片発で上昇できることを求めていません（AFH 第 13 章）。」
  - `me.perf` の折りたたみ（212 行）「規則は、滑走路が加速停止距離より長いことを求めていません。」
  - 直し方：どちらも「米国の」を足す（折りたたみの次の段落はもう「米国の基準」と書いている）。
- **N3**　`me.perf` の計算演習（215 行）「米国の計器出発の標準の 200 ft/NM（AIM 5-2-9）に届きません。」
  - 計算は正しい。ただし AIM 5-2-9 は「ODPs, SIDs, and DVAs assume normal aircraft performance, and that **all engines are operating**」と書く。片発の値を比べると、片発でも 200 ft/NM が求められると読める。
  - 直し方：「（この 200 ft/NM は全部のエンジンが動いている前提です。片発のときの計画は運航者が決めます：AIM 5-2-9）」を足す。
- **N4**　`me.oei` の表の 3（329 行）と図 `oeiSteps`（273 行）「脚 UP・フラップ UP（機体によっては脚が先）」。
  - 脚を先に書いてから「機体によっては脚が先」と断っているので、順がねじれている。AFH は「retract the flaps and landing gear. (On some airplanes, the landing gear is to be retracted before the flaps.)」、Seminole の POH 3.5a は「Flaps FULL UP → Landing Gear Selector CHECK UP」。
  - 直し方：「フラップ UP・脚 UP（機体によっては脚が先。順は POH に従う）」。図も「フラップ UP・脚 UP」に。
- **N5**　`me.oei` の折りたたみ（340 行）「Seminole の POH は、いちばん近い適した空港に、できるだけ早く降りるとしています（POH 3.9）。」
  - POH は「Land as soon as **practical** at the nearest suitable airport」。「できるだけ早く」は as soon as possible に読める。緊急の度合いの言葉なので分けたい。
  - 直し方：「実際的な範囲でなるべく早く（as soon as practical）」。
- **N6**　`me.drag` の折りたたみ（319 行）「Seminole では、止まった側は閉じ、生きている側は温度の制限を超えない範囲でできるだけ閉じます（POH 3.9）。」
  - これは POH 3.9d（離陸のあと、トリムをとったあと）の文。3.9e（片発の上昇中）は「Use of full open cowl flaps on the operating engine will ensure that the established temperature limitations will not be exceeded」、チェックリストは「Cowl Flap (Operative Engine) AS REQUIRED」。
  - 直し方：「生きている側は、温度の制限の中で調整します（上昇中は開ける・落ち着いたらできるだけ閉じる：POH 3.9d・3.9e）。」
- **N7**　`me.speeds` の考えてみよう（177 行）「…Vyse で降下率が最小になり、高度をいちばんゆっくり失います。その高さまで降りれば、水平に飛べます。」
  - AFH は「the airplane may not maintain altitude even at its published single-engine ceiling. Any further rate of sink, however, would likely be modest」。
  - 直し方：「その高さに近づくほど降下はゆるやかになります（公表の上昇限度でも水平を保てないことがあります：AFH 第 13 章）。」
- **N8**　`me.land` の表のファイナル（360 行）と `oei` の例 3（386 行）「着陸が確実になるまで Vyse（88 kt）を保ち、そのあと機体の手順の速度へ（Seminole の POH は最終進入 90 KIAS・フラップ 25°）」。
  - AFH の「Maintain VYSE until the landing is assured, then **slow** to 1.3 VSO or the AFM/POH recommended speed」は一般の形。Seminole の POH の 90 KIAS は Vyse 88 KIAS より速いので、「減速する」形にならない。POH 3.9h は「When Landing is Assured：脚 DOWN・フラップ 25°・Final Approach Speed 90 KIAS」。
  - 直し方：「（Seminole の POH は、着陸が確実になってから脚 DOWN・フラップ 25°・最終進入 90 KIAS。90 KIAS は Vyse より少し速い）」と書き分ける。
- **N9**　`me.prop` の折りたたみ（123 行）「プロペラの羽根は回る翼で、根元から先まで迎え角が合うようにねじってあります。…（AFH 第 12 章）」。
  - AFH 第 12 章に羽根のねじりの記述はない。PHAK 第 7 章にある（「itself is twisted so the blade angle changes from hub to tip」）。
  - 直し方：ねじりの文に「（PHAK 第 7 章）」を付け、範囲 11.5〜40° と止めの文だけに AFH 第 12 章を付ける。
- **N10**　`me.case` の折りたたみ「SA-081 の事例と勧め」（378 行）。
  - 「どの事故も離陸や着陸の近くで、速度が Vmc より下がっていました。」：SA-081 の PA-31T の事例は速度に触れていない。SA-081 の問題の文は「has resulted in fatal accidents when the pilots did not maintain … Vmc」。
  - 「その前の数週間、整備はこのエンジンの出力の不具合を伝えていました（Cessna 421C）。」：SA-081 は「Maintenance personnel reported that, in the weeks before the accident, the airplane's left engine had been experiencing a problem that prevented it from initially producing 100 percent power. Despite attempts to correct this discrepancy, it wasn't corrected」。整備が操縦士に伝えたとは書いていない（調査への証言）。
  - 直し方：「SA-081 は、離陸や着陸の近くで Vmc を保てなかった死亡事故を挙げています。」「整備の人の話では、その前の数週間、このエンジンは最初に 100% の出力を出せない不具合があり、直っていませんでした。」
- **N11**　Information Manual を「POH と同じ内容」と書いている所（注意（cautions）2 つ目、`NEW_R.seminoleIM` の label、主張の台帳の出典の全部）。
  - Information Manual は「may be used for general information purposes only」「is not kept current」「must not be used as a substitute for the official FAA approved Pilot's Operating Handbook」と書くだけで、POH と同じ内容とは書いていない。
  - 直し方：「その製造番号（4496174・4496224 以降）の POH を情報用に出した版。改訂は追っていない」。本文で「POH」と呼ぶことの断りは今の注意のままでよい。
- **N12**　`me.vmc` の折りたたみ（298 行）「…新しい制限の値として使いません（AFH 第 13 章）。」
  - AFH にあるのは「The VMC noted in practice and demonstration … could be less or even greater than the published value」まで。「制限として使わない」は推論で、AFH の文ではない。
  - 直し方：出典を前の文だけに付ける。または「公表の Vmc の代わりにはしません」と、この本の言い方として書く。
- **N13**　図の見た目（390 px）。W33 の確かめに回す（事実の誤りはない）。
  - `twinSystems`：「右エンジン（回っている）」の題が箱の縁に触れる。点線（左エンジン → 電気の系統）が「電気が来ない」の文字の上を通る。
  - `vmcFactors`（表）：見出しの 1 列目が長く（「条件と要因（米国の旧 14 CFR 23.149 で…）」）、390 px で 6 行に折れる。見出しを「条件と要因」にし、旧 23.149 の断りは表の下の出典の文に移すと読みやすい。

（記録だけ・事実確認の範囲の外）`me.land` の `faa` は `CA.X.D.K1`（計器による片発の進入）、`me.oei` は `CA.X.C.K1`（計器による片発の飛行）を持つ。どちらも `ledgers/ACS-MAP.json`（W42）の割り当てどおり。`me.land` の中身は CA.IX.G（目視の片発の進入と着陸）なので、W42 が CA.IX.G の行の行き先を見直すときの参考に。

## 4. 主張の札 151 行の照合

- **合う（署名してよい）**：S5 の表の 5 行を除く 146 行。
  - 参考値 124 行のうち、POH の行（速度・系統・手順・図 5-19 / 5-21・3.9j・4.47・4.49・7.5・7.9・7.15・7.17・7.23）は、Information Manual と一字ずつ照らした。AFH 第 12・13 章の行、ACS の行、ガイドとチェックリストの行も、該当の所と照らした。
  - 条文 7 行：23.2120(b)(1)・23.2135(c)・旧 23.149(a) は eCFR と照らした。FL.jur `multi.rating` の 3 行は W06 の文で、W31 の札は「FL.jur の囲み」と正しく書いている。
  - 教材値 20 行：`syllabus.js` の m1（500 ft までに脚 UP）・m3（300 ft は教材の基準。ACS CA.X.B に高度の基準はない）・m4（250 ft・±20°・30 秒）・m5（5 km・脚 UP）は、`syllabus.js` の文と合う。モデルの上昇率は 3. の計算のとおり。例題の数は計算し直して合う。
- **二次資料のまま（札は正しい）**：`me.perf#f79ebcc9`（約 1,340 / 212 fpm）・`me.perf#02deec3c`（約 4,100 ft）。
  - Information Manual に数字の記載はない。W31 の書き方（参考値・二次資料・「ここで読んだ POH にはありません」）は DESIGN 3.3 の `me.perf` の指示どおり。
  - 二次資料（Aviation Consumer 2000 年 8 月号・Jane's 1982–83）は、私も一次資料で確かめられなかった（UNVERIFIED `U.seminole-poh` は開いたまま）。図 5-21 を人が読めば、海面・標準気温・3,800 lb の片発の上昇率と、50 fpm になる高さを読み取って照らせる。
- **署名の前に直す**：S5 の表の 5 行（`me.vmc#45fdd1c1`・`me.oei#730fdfd5`・`me.oei#3130c2ca`・`me.oei#68d72f0f`・`me.basics#de95d1bd`）。

## 5. 手順の段階と順番（照らした結果）

| 手順 | 下書き | 一次資料 | 結果 |
|---|---|---|---|
| 安全の ①（`me.oei` の表・図 `oeiSteps`） | 操縦 → 全部前へ → 抗力を減らす → 特定（足）→ 確認（スロットルをゆっくり）→ フェザー → 横滑りゼロ → 片付け | AFH「Control → Configuration（Vyse・出力・フラップと脚・identify・verify・feather）→ Climb → Checklist」、POH 3.5a・3.9a・3.9b | 合う（N4 は書き方） |
| 離陸の 3 つの場面（`me.perf`・図 `oeiFlight`） | 脚 DOWN → 両方閉じて降りる／脚 UP・上昇できる → 方向・Vyse・全部前・脚とフラップ・特定・確認・フェザー／上昇できない → 制御したまま正面 | AFH 3 つの場面、POH 3.9c・3.9d | 合う |
| Vmc デモ（`me.vmc`） | 3,000 ft（Seminole 4,000）→ 形態 → Vsse の約 10 kt 上で片方アイドル → 5° 以内 → 1 kt/秒 → 兆候で出力を絞り機首を下げる → ±20° → Vsse/Vyse ±5 | ACS CA.X.B.S1〜S8・付録 3、AFH「VMC Demo」、POH 4.47 | 合う（S1：形態のフラップ） |
| 両発の着陸復行（`me.pattern`） | 混合比 → プロペラ → スロットル → 上昇の姿勢（ガイド 82 / チェックリスト 88・フラップ 25）→ フラップを少しずつ → 脚 UP | ガイド Go-Around、チェックリスト BALKED LANDING、POH 4.33、AFH | 合う |
| 両発の場周経路（`me.pattern`） | 18 in・2,300 rpm・100 kt → アビームでフラップ 10・200〜300 fpm → ベースで 88・フラップ 25 → 88 を保つ → 確実になったらフラップ 40・80 kt | ガイド Normal Landing 1)〜8) | 合う |
| 片発の進入（`me.land`） | ダウンウインド（遅くともアビームで脚 DOWN）→ ベース（フラップ 25）→ ファイナル 3°・Vyse → 確実になってから機体の速度 | AFH「Engine Inoperative Approach and Landing」、POH 3.9h | 合う（N8 は書き方） |
| 通常の離陸（`me.basics` の折りたたみ） | フラップ 0 → 出力・airspeed alive → 75 でローテーション・88 → 脚 UP（tap brakes）→ 500 ft から 110 kt・25 in・2,500 rpm | ガイド Normal Takeoff 1)〜10) | 合う |
| クロスフィード（`me.basics`） | 生きている側 X-FEED・止まった側 OFF・両方 X-FEED にしない・水平飛行の巡航だけ・着陸の前に ON。点検は 1,500 rpm で 1 分 → 元で 1 分 | POH 3.23・7.15、AFH「Fuel Crossfeed」 | 合う |
| アンフェザー（`me.prop` の折りたたみ） | プロペラレバーを前へ → 5〜7 秒で風車状態にならなければスターター 1〜2 秒 | POH 3.11a | 合う |
| 低い出力での故障（`me.oei`） | 混合比・プロペラ・スロットルを大きく前へ → 足で特定 → スロットルで確認 | AFH | 合う |
| 再始動の前（`me.oei` の折りたたみ） | 電動燃料ポンプ ON → 燃料の量・油圧と油温・マグネトー → 再始動 | POH 3.5a（3.9g） | 合う |
| 方向を失ったとき（確認問題 oei 2） | 生きている側の出力を絞り、機首を下げる | ACS CA.X.B.S6、POH 3.9f・4.47、AFH | 合う |

## 6. 計算（計算し直した値）

| 場所 | 式 | 結果 |
|---|---|---|
| `me.sys` 計算演習 | 10 MPa × 0.00040 m² | 4,000 N（合う） |
| 同 | 2.4 L/min ＝ 0.0024 ÷ 60 ＝ 0.000040 m³/s、÷ 0.00040 m² | 0.10 m/s（合う） |
| `me.perf` 計算演習・記述問題 q15 | 200 ÷（100 ÷ 60）・200 ÷ 2 | 120・100 ft/NM（合う） |
| 同 | 285 ÷（88 ÷ 60） | 194.3 ft/NM（「≒ 194」で合う） |
| `me.perf` 表 | 1 − 285/1,505 | 81.1%（「約 81%」で合う） |
| 同 | 1 − 25/225 | 88.9%（「約 9 割」で合う） |
| 同（教材値） | `physics.js` の `steadyState`（pa44・高度 100 ft・両発 88 kt / 片発 Vyse 88 kt・全開） | 1,332 / 281 fpm・78.9%（「約 1,330 / 約 280・約 79%」で合う） |
| 記述問題 q11 | (200−90)＝110、(100−90)＝10、(110−10)÷110 | 90.9%（「≒ 91%」で合う） |
| `me.perf` の折りたたみ（AFH の例） | 450 ft ÷ 150 fpm、90 kt × 3 分 | 3 分・4.5 NM（「約 3 分・約 5 NM」で合う。AFH の文のまま） |
| ガイド（Vmc の 50%） | 56 × 0.5 | 28 KIAS（本文には出ない。合う） |

## 7. 図（390 px で描いて目で見た。描いた絵はスクラッチの `fcp5/shots/`）

| 図 | 事実の確かめ | 結果 |
|---|---|---|
| `counterRotation` | Seminole：左は右回り・右は左回り（後ろから）、緑の矢印（下がる羽根）が左右とも内側。ふつうの双発：両方右回り、右エンジンの矢印が外側で腕が長い | 合う（POH 7.5・AFH） |
| `propGovernor` | レバー → ガバナー → 羽根の角度 → 負荷・回転数 → また比べる。機首上げで浅く・機首下げで深く | 合う。赤字は S3 |
| `twinSystems` | 発電機・エンジン駆動の燃料ポンプ・ガバナーは各エンジン、脚のポンプは電動、電動燃料ポンプ 2 つ | 合う（POH 7.5・7.9・7.15・7.17）。見た目は N13 |
| `oeiClimbBars` | 1,505 / 285（POH 図 5-19・5-21 の例）、1,330 / 280（モデル）、81%・79% | 合う |
| `oeiForces` | 左停止：右の推力 × 腕で機首が左へ、風車状態の抗力、右の方向舵で尾翼に左向きの力、後ろから見て左の翼が下がる | 合う（AFH） |
| `vmcRudder` | データは今の `book-figs.js` と同じ（D1・D5）。赤い線 56、失速警報 約 62 kt 以下の帯 | 合う |
| `vmcFactors` | 旧 23.149 の条件と要因の向き（最大出力・風車状態・後方の重心・軽い重さ・脚 UP で高くなる、バンクと密度高度で低くなる）、1° あたり 3 kt 以上・20 kt 近く、CAR 3 の重さの断り | 合う（AFH・旧 23.149）。見た目は N13 |
| `zeroSideslip` | ① 翼水平・ボール中央 → 止まった側へ横滑り・Vmc も高い、② 生きている側へ約 2°・ボール 1/3〜1/2 → 横滑りゼロ | 合う（AFH） |
| `oeiSteps` | 8 段の順と色（特定・確認は同じ色、フェザーは別の色） | 合う。3 段目は N4 |
| `oeiFlight` | 5 つの場面と SA-081 の 3 つ（Vmc より下・止まった側への旋回・不具合を残した離陸） | 合う（AFH・SA-081） |

## 8. 日米の書き分け

- 14 CFR の文は全部「米国の」を付けている（`me.vmc`・`me.perf`・図 `vmcFactors`）。AIM 5-2-9 も「米国の計器出発」。NTSB も「米国の」。
- 日本の側は `bk.jur('multi.rating')` の囲みだけで、本文に日本の条文はない。第 7 部・まとめの章へのリンクはない（決まり 6）。
- 検査（check-jurisdiction）は error 0・warn 0。数字のない規則の文 2 つに国がない（N2）。

## 9. 基礎教材の書き直し

- 各節の本文と、その `from` の基礎教材の節（kiso01・02・03・13）を、空白を除いて 20 字以上の同じ並びがあるかで照らした。
  - 見つかったのは、計算の式（`10MPa＝10,000,000Pa、4.0cm²＝0.00040m²なので、F＝`）と表の短い行（`方向切替弁作動油を送る側と戻す側を切り替える`）だけ。
- 記述問題 26 問は 16 字以上で照らした。同じ並びは、計算（`200÷2＝100ft/NMです。` など）と問いの決まった言い方（「…のはなぜですか。」）だけ。
- 本文と問いは、基礎教材を書き直したもの（写しではない）。所有者の判断 2 で使ってよい範囲。

## 10. チェックの結果

- `check-chapter.mjs textbook/rewrite/combined/drafts/p5-figs.js textbook/rewrite/combined/drafts/p5.js`：**error 0・warn 18・pending 0・info 3**。W31 の報告と同じ。
  - style の warn 6：初出の形（W31 の報告 5.1 のとおり）。
  - claims の warn 12：札の台帳 CLAIMS.json にまだ行がないため。
  - figures：10 図を 390 px で描いて error 0・warn 0。
- FLIGHT LAB `npm run -s test:fast`：**91 / 91 pass、fail 0**。
- TEXTBOOK `npm test`：**38 / 38 pass、fail 0**。
- CADET `npm run -s test:fast`：**249 / 249 pass、fail 0**。
- 下書きは製品が読まないので、どのテストも下書きでは動かない（W31 の報告 5.4 と同じ）。

## 11. 台帳の行（触った行）

- この単位は台帳のパッチを作っていない。
- 署名の勧め（W27 の二人目の役へ）：
  - CLAIMS の 151 行のうち、S5 の 5 行を除く 146 行は署名してよい。
  - 5 行は S5 の直し方で出典を直してから署名する。
  - `U.seminole-poh` は開いたまま（4 のとおり）。
- ERRATA `K.multi.K-1`〜`K-4`・RULINGS 7 行（W31 の報告 6）の「fixed」は、本文の該当の文が一次資料と合うことを確かめた（K-4：950 rpm と AFH の約 800 rpm、K-3：臨界発動機が「なくなる」、K-2：ボール中央は横滑りゼロでない、K-1：特定は足・計器は補助、`R.gear-timing-oei`：AFH と POH 3.9h を並べた）。S1〜S5 はこれらの行の外の文。

## 12. 開いたままのこと

1. 片発の上昇率 約 212 fpm・片発の実用上昇限度 約 4,100 ft は二次資料のまま（`U.seminole-poh`）。図 5-21 を人が読んで照らすのがよい。
2. 図の見た目（N13）は W33 の確かめ。
3. 安全の ① の節（`me.oei`）・`me.vmc`・`me.land` は、安全の確かめ役（W36）がまだ読んでいない。S1・S2 も W36 に回す。

## 13. ほかの単位に頼むこと

1. **W31（または直しの役）**：S1〜S5 と N1〜N12 を `drafts/p5.js`・`p5-figs.js`・`p5.claims.json` で直す。直したら `check-chapter.mjs` で主張の札を作り直す。
2. **W36（安全の確かめ）**：S1（Vmc デモの形態）・S2（訓練でフェザーする高さ。Seminole は 4,000 ft）を、安全の ① の節と一緒に読む。
3. **W33（図の見た目）**：N13（`twinSystems`・`vmcFactors`）。
4. **W42（ACS の地図）**：`me.land` が持つ `CA.X.D.K1`（計器の片発の進入）と、節の中身（CA.IX.G）のずれ（3. の最後の記録）。
5. **W27 の二人目の役**：11 のとおり署名する。
