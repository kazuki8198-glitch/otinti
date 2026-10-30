# factcheck-sys の報告：第 1 部 第 6 章 `sys`「機体・エンジン・系統（Archer）」（W14 の下書き）の事実確認（R2）

単位：factcheck-sys（R2・W14 の事実確認役。下書きを書いた人とは別）。確かめた日：2026-10-30。

対象：`textbook/rewrite/combined/drafts/sys.js`・`sys-figs.js`・`sys.claims.json`。W14 の報告 `reports/W14.md` も読んだ。
確かめたこと：
- 主張の全部（`sys.claims.json` の 79 行と、札のない文）を一次資料と照らした。
- 計算の全部を計算し直した（本文・計算演習・考えてみよう・説明してみよう の答え）。
- 図 9 枚（新しい 5 枚と描き直し 4 枚）をコードで確かめた。7 枚は 390 px で描いて目で見た。
- 日米の書き分けを確かめた（DESIGN 3.4・6.2 の決まり 6・10）。
- 基礎教材を書き直しているか（写していないか）を確かめた。

**結論**：must 1・should 5・nit 11。
- **数値の誤りは見つからなかった**。79 行の値は全部、一次資料と合う。
- must は、`sys.radio` の空間波の周波数の書き方 1 つ。今の書き方では「VHF は空間波に入らない」と読め、図・ここが大切・資料と食い違う。
- should 5 つの中身：
  - 気化器着氷のヒーターの待ち方で、PHAK と Archer の POH 3.5k（1 分の手順）がそろっていない〔安全〕
  - 出典の付け方 2 つ
  - トルクの式の途中の数字
  - SAIB を「決まり」と呼んでいる所

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck-sys.md`（新） | この報告 |

ほかのファイルは変えていない（下書き・台帳・製品のファイル・`flight-lab/kiso/` のどれも）。台帳のパッチも作っていない（署名は W27 の仕事。下の 6）。
作業ツリーの次のファイルは、流す前から変わっていた（ほかの単位の作業中のファイル）。私は戻していない。
- `flight-lab/outputs/FLIGHT-LAB.html`・`cadet/outputs/CADET.html`
- `drafts/navb*`
- 追跡されていない `drafts/hfadm*`・`law*`・`radio*`

## 2. 確かめ方と一次資料（2026-10-30 に自分で取り直して読んだ。W14 の写しは使っていない）

自分のスクラッチのフォルダに、下書きの出典の URL から取り直した。下書きは本文を全部読み、文ごとに資料の該当の所と照らした。

| 資料 | 読んだ所 |
|---|---|
| Piper PA-28-181 Archer III POH VB-2266（2013、andrews.edu の写し＝R.archerPoh） | 1.3（圧縮比 8.5:1・水平対向・空冷）、1.5（固定ピッチ）、1.7、1.9（オイル 8 qt）<br>2.7（O-360-A4M・180 BHP・2,700 rpm・245°F・油圧 25/115・100 か 100LL・静止回転 2,240〜2,340 rpm）<br>2.9（回転計の赤線 2,700、油圧の緑 55〜95・黄 25〜55（アイドル）／95〜115（暖機）・赤 25／115。油温の帯は写しの文字が空欄）<br>2.21（50・2・48 US gal、片側 1.0／24.0）<br>3.1（CAS：Warning は 25 psi 未満か 115 psi 超、Caution は 1,100 rpm 超で 26〜55 psi）<br>3.5c（低い油圧：油温が高ければ as soon as possible、ふつうなら as soon as practical。全部なくなったときの文）<br>3.5j（−5〜20℃）、3.5k（部分的なヒーターの注意、FULL ON、**1 分たっても荒れが続けば OFF** のあとミクスチャー・ポンプ・タンク・マグネトー、回転の低下）<br>4.5k（5,000 ft・75%・FULL RICH・ピーク EGT／100°F 濃い側・荒れ始めをピークに・タンクを 1 時間／2 時間）<br>4.5l（Descent：2,500 rpm・長いパワーオフ降下の前にヒーター）、4.5m（進入でヒーターを使わない理由・全開でヒーターはデトネーション）<br>7.1・7.3・7.5・7.7・7.9・7.11・7.13（EIS・CAS の色と音）・7.15（25 gal タンク・17 gal のタブ・FOB SYNC・L／R／OFF・離着陸で電動ポンプ ON）・7.17（28 V・24 V・70 A・32 V で ALTR FAIL・非常用バス 30 分以上・23.3 V・翼端の着陸灯）・7.23（ヒーターマフ）<br>8.21（ストレーナーを 2 回）、8.23（主輪 24 psi） |
| Archer III w/ G1000 Pilot's Checklist（MGA 2025＝R.archerCk） | En Route Climb 87 KIAS、Engine Oil MIN 6 QTS、Fuel Vent CLEAR、Static Wicks CHECK (3)、Main Gear Strut 4.5 in、EMERG BATT ARM（始動前）、FULL RICH BELOW 5000FT<br>ALT の手順の Alternator Circuit Breaker CHECK AND RESET<br>ENGINE ROUGHNESS（Carburetor Heat/Alternate Air ON → **IF ROUGHNESS CONTINUES >1 MIN: OFF** → …） |
| FAA PHAK FAA-H-8083-25C 第 3 章 | 桁・小骨・縦通材、セミモノコック、複合材の低いエネルギーの衝撃・whitish areas（**fiberglass**）・speed tape と充填材は構造の修理ではない |
| 同 第 5 章 | プロペラの迎え角（回転と前進の合成）、ねじり、効率＝THP／BHP・50〜87% |
| 同 第 6 章 | アンチサーボタブ（同じ向きに動き、操縦の力を増やす。トリムも兼ねる） |
| 同 第 7 章 | 全文を読んだ。四行程・混合比の定義・水平対向・ディーゼルの PA-28 の STC<br>固定ピッチでは回転計が出力の目安、ねじり<br>吸気圧力（止まっていると外気圧、回ると下がる。自然吸気は外気圧より高くできない）<br>製造者の MP と rpm の組み合わせ<br>気化器着氷（21℃・80%、38℃・50%、60〜70°F の低下、固定ピッチと定速の兆候、ヒーターで回転が下がって戻る、30 秒〜数分・full-hot のまま）<br>燃料噴射・インパクトアイス・代替空気<br>過給機・ターボ・ウェイストゲート（排気の管の弁）・インタークーラー・クリティカル高度<br>点火（電気系統と独立・2 系統・no drop は異常・接地線が切れたら IDLE CUT-OFF だけ）<br>オイルの役目・油温はゆっくり<br>空冷・バッフル・冷やし方・CHT は直接で即時・EGT<br>排気と一酸化炭素<br>デトネーションの 4 つの原因と防ぎ方、プレイグニッション<br>低翼はポンプ<br>燃料計は「空」だけ、空になるまで使うとベーパーロック<br>等級と色・100VLL<br>給油のボンディングと服の静電気<br>14/28 V、交流を直流に、電流計、負荷計、発電機の電圧はバッテリーより高い<br>前輪式の利点、左右別々のブレーキ |
| 同 第 11 章 | ハイドロプレーニング（9 × √主輪の空気圧、36 psi → 54 kt、始まると遅くなっても続く、ブレーキと方向の操縦がほぼ効かない） |
| FAA AFH FAA-H-8083-3C | 第 2 章「While touching a propeller, always assume that the ignition is on」<br>第 11 章（赤が左・緑が右なら同じ向き、逆なら衝突のおそれ。91.209(b)） |
| FAA AMT Handbook — Airframe Vol. 2（FAA-H-8083-31A）第 11 章（＝NEW_R.amtAirframe2） | 地上波（VLF・LF・MF）、HF の電離層波（2〜25 MHz、洋上）、**HF より上は空間波（VHF・UHF・SHF）**<br>VHF 118.0〜136.975 MHz・720 チャンネル・25 kHz・欧州 8.33 kHz・一度に 1 人<br>AM と雑音、SSB、1/4 波長と胴体、放電索（precipitation static）、ボンディング、ダイオードの整流器<br>**インバーターと電磁誘導の記述はこの巻の第 11 章にない**（この巻は第 10〜17 章。電気系統の第 9 章は Vol. 1） |
| Lycoming SSP-110-3 Certified Engines（2025-07） | O-360-A4M 180 hp・2,700 rpm・100/100LL・8.50:1、IO-360-B1G6、型式名の I＝燃料噴射・T＝ターボ・S＝過給<br>PA-44-180 の欄は LIO-360-B1G6 ほか |
| Piper Trainer Brochure 2026（R.piperTrainer） | Seminole「(2) Lycoming IO-360-B1G6」、Archer TX「Lycoming IO-360-B4A」 |
| eCFR（2026-10-01 の版） | 14 CFR 1.1 Critical altitude、91.209 |
| FAA AIM 4-3-24 | Use of Aircraft Lights（番号と文を確かめた） |
| FAA SAIB CE-10-11（2009-12-23） | 1 分・煙なし・必要な系統・1 回。冒頭に「This is information only. Recommendations aren't mandatory.」 |
| NIST SP 811 第 4 章 表 3 | W＝J/s ほか |
| 基礎教材 `flight-lab/kiso/data/kiso01.json`・`kiso02.json`・`kiso03.json` | 読んだだけ |

ラム効果（K.systems.K1・R.manifold-pressure の後半）：W14 の未解決 2 のため、FAA の一次資料を探した。見つかったのは掲示板の実測だけで、FAA の資料はなかった。PHAK の言い切りだけを書いた W14 の判断に賛成する（下の 7）。

## 3. 問題（重い順。場所・何が違うか・直し方・根拠）

### must

**M1　`sys.radio`「電波の伝わり方」：空間波を「VHF より高い周波数」と書いている**
- 今の文：「VHF より高い周波数の空間波は、見通しの範囲だけに届き、電離層では曲がりません。航空の無線と航法の装置の多くは、これを使います。」
- 誤り：資料は「Above HF transmissions, radio waves are known as space waves … This includes VHF (30-300MHz), UHF …, SHF」と書いている。空間波は **HF より上**で、VHF を含む。今の文では VHF が空間波から外れる。同じ節の図 `sysRadioWaves`（空間波（VHF））、ここが大切（VHF は見通しだけ）、次の段落（航空の VHF の無線）と食い違う。
- 直し方（案）：「HF より高い周波数（VHF・UHF など）の空間波は、見通しの範囲だけに届き、電離層では曲がりません。」
- 根拠：FAA-H-8083-31A Vol. 2 第 11 章 Types of Radio Waves（p.11-32）・Figure 11-78。

### should

**S1　`sys.carb` の「よくある間違い」：PHAK の「ふつうの出力が戻るまで待つ」と Archer の POH 3.5k の「1 分」がそろっていない**〔安全〕
- 今の文：「とけた水でエンジンは 30 秒から数分荒れますが、ヒーターはいっぱいのまま、ふつうの出力が戻るまで待ちます（PHAK 第 7 章）。」
- 食い違い：文そのものは PHAK 25C p.7-10 のとおり。ただ、この章が手本にする機体は違うことを書いている。
  - Archer の POH 3.5k（Engine Roughness）：CARB HEAT FULL ON → 「If roughness continues after one min: CARB HEAT OFF」→ ミクスチャー・電動燃料ポンプ ON・タンクの切り替え・計器・マグネトー
  - 公開チェックリスト：「IF ROUGHNESS CONTINUES >1 MIN」で OFF
  - この節の別の所は「公開チェックリストの『エンジンの荒れ』の最初の項目は、キャブレターヒーター」と書いている。
  - 訓練生は「数分待つ」と「1 分で OFF」のどちらに従うかで迷う。PHAK は「着氷と分かっているとき」、POH は「原因の分からない荒れ」の話なので、文で区別する。
- 直し方（案）：今の文のあとに足す。「ただし、Archer の POH の『エンジンの荒れ』の手順は、ヒーターをいっぱいに入れて 1 分たっても荒れが続くなら、ヒーターを戻し、ミクスチャー・電動燃料ポンプ・タンクの切り替え・マグネトーを確かめる順です（POH 3.5k）。荒れの原因が着氷とは限らないからです。手順はその機体の POH に従います。」（章の注意 1 の「POH が優先」とも合う）
- 根拠：POH VB-2266 3.5k（p.3-32）、MGA Archer Checklist 2025「ENGINE ROUGHNESS」、PHAK 25C 第 7 章 Carburetor Heat（p.7-10）。W14 の未解決 6 のとおり、W27・W36 の安全レビューでも見てほしい。

**S2　`sys.carb`「起きやすい条件」：（POH 3.5j）が「それより暖かくても起きます」に掛かって読める**
- 今の文：「Archer の POH は『−5〜20℃ の湿った空気』と書いていますが、それより暖かくても起きます（POH 3.5j）。」
- 違い：POH 3.5j は −5〜20℃ を書くだけで、それより暖かい条件のことは言っていない。「暖かくても起きる」の根拠は前の文の PHAK（38℃・50%）。主張の札（行 46）も、出典の中身は POH 3.5j と R.carb-ice-temp に分かれている。
- 直し方（案）：「Archer の POH は『−5〜20℃ の湿った空気』と書いています（POH 3.5j）。上の PHAK のとおり、それより暖かくても起きます。」
- 根拠：POH VB-2266 3.5j（p.3-31）、PHAK 25C p.7-9。

**S3　`sys.piston` の もっと深く「出力・トルク・回転数」：式の途中の数字で割ると答えにならない**
- 今の文：「…トルクは約 134,000 ÷ 283 ≈ 475 N·m です。」
- 計算し直し：134,000 ÷ 283 ＝ 473.5。丸めない値なら 180 × 745.6999 ＝ 134,226 W、ω ＝ 2π × 2,700 ÷ 60 ＝ 282.74 rad/s、τ ＝ 474.7 N·m。答えの 475 は正しいが、書いた式からは出ない。
- 直し方（案）：「…トルクは約 134,200 ÷ 282.7 ≈ 475 N·m です。」（または答えを「約 474 N·m」に）。説明してみよう 12 の答え（ω ≈ 283・約 134 kW・約 475 N·m）は式を書いていないので、そのままでよい。
- 根拠：計算（1 hp ＝ 745.6999 W：NIST SP 811 付録 B.9）。

**S4　`sys.radio`「電気の量」の最後：電磁誘導とインバーターの文の出典が、引いた資料にない**
- 今の文：「発電機は、磁石と導線のどちらかを回し、導線に電圧を起こします（電磁誘導）。…整流器（rectifier）は交流を直流に、インバーター（inverter）は直流を交流に変えます（FAA の整備士のハンドブック）。」
- 違い：出典の表 `NEW_R.amtAirframe2` は Airframe Vol. 2 第 11 章。
  - 整流器：ダイオードの rectifier（p.11-9）として載っている。
  - 電磁誘導とインバーター：この巻（第 10〜17 章）に記述が見当たらない（全文を検索した）。電気系統の章は Vol. 1 第 9 章、電気の基礎は General Handbook（FAA-H-8083-30）にある。私はその 2 冊の PDF を FAA から取得できず、確かめていない。
  - 「発電機は交流を作って直流に直す」は PHAK 第 7 章（Alternators … producing AC, which is converted to DC）で確かめられる。
- 直し方（案）：次のどちらか。
  - (a) 出典を確かめた資料に替える：発電機と整流は「（PHAK 第 7 章・FAA の整備士のハンドブック）」。インバーターの句は、AMT General Handbook か Airframe Vol. 1 第 9 章で確かめてから、その資料を `refs` に足して引く。
  - (b) 確かめるまでインバーターの句を外す。
- 根拠：FAA-H-8083-31A Vol. 2 目次と第 11 章（p.11-9 Semiconductor diodes / rectifier）、PHAK 25C 第 7 章 Electrical System（p.7-30）。

**S5　`sys.elec` の見出し「ブレーカーを戻す決まり」と説明してみよう 7：SAIB を「決まり」と呼んでいる**
- 今の文：
  - 見出し `<h4>ブレーカーを戻す決まり</h4>`
  - 説明してみよう 7 の答え「戻すのは SAIB CE-10-11 の決まりと機体の手順に従います」
  - ここが大切「ブレーカーは、必要な系統だけ、1 分待ち、…1 回だけ戻す」
- 違い：SAIB CE-10-11 の冒頭は「This is information only. Recommendations aren't mandatory.」。本文の中の文は「その扱いを勧めています」と正しく書いている。見出しと答えだけが、規則と勧めの区別（この本が日米の囲みで大事にしている区別）を崩す。今の `book-1.js` にこの見出しはなく、W14 が足したもの。
- 直し方（案）：
  - 見出し：「ブレーカーを戻すときの目安（FAA の勧め）」
  - 説明してみよう 7：「SAIB CE-10-11 の勧めと機体の手順に従います」
- 根拠：SAIB CE-10-11 p.1。

### nit

**N1　`sys.ctl`：アンチサーボタブが「もっと大きく動きます」**
- PHAK 第 6 章は「同じ向きに動き、操縦の力を増やし、動かしすぎを防ぐ。トリムも兼ねる」と書くが、「もっと大きく」は書いていない（今の `book-1.js` から残っている文）。
- POH 7.9 は「trim tab … to reduce the control system forces」だけなので、今の（POH 7.9）はトリムの役目の文に掛かっていて正しい。
- 直し方（案）：「もっと大きく」を外し、タブの働きの文に（PHAK 第 6 章）を足す。

**N2　`sys.airframe` の「ここに注意」：「複合材の部品では、白っぽく変わった所が…」**
- PHAK 第 3 章は「whitish areas in a **fiberglass** structure」と書いている。
- 直し方（案）：「ガラス繊維の部品では、白っぽく変わった所が…」。

**N3　POH の節の番号の書き方：「POH 4.51」「POH 4.5」**
- 降下の手順は 4.5k の次の「4.5l」（エル）。今の書き方「4.51」は数字の 51 に見える（`sys.engine`・`sys.carb`、主張の札の行 34）。
- 進入でヒーターを使わない理由と、全開でヒーターはデトネーション、の 2 つは 4.5m（Approach and Landing）にある（`sys.carb` の「（POH 4.5）」2 か所）。
- 直し方（案）：「POH 4.5l」「POH 4.5m」と書く。

**N4　`sys.engine`：静止回転 2,240〜2,340 rpm の条件**
- POH 2.7(10) は「Propeller Tolerance @ ISA Conditions (static RPM at maximum permissible throttle setting at sea level)」。
- 直し方（案）：「止まって全開にしたときの回転は、海面・標準大気で 2,240〜2,340 rpm です（POH 2.7）。」

**N5　図 `sysGearBrake`：「マスターシリンダー ×2」と「前輪：ペダルで…」**
- POH 7.7 は「The toe and hand brakes have their own master brake cylinders」と書くだけで、数は書いていない。
- 前輪の 20° は「By using the rudder pedals and brakes」の条件つき。本文は「ペダルとブレーキで」と正しく書いているが、図はペダルだけ。
- 直し方（案）：「×2」を外す（または左右別々を示したいなら「左右のペダルそれぞれ」）。図の前輪の行を「前輪：ペダルとブレーキで左右 20° まで」に。

**N6　`sys.js` の頭の説明（21〜23 行）がラム効果を書いている**
- 「ram air can raise it slightly — R.manifold-pressure」とあるが、本文にはその文がない（W14 は一次資料がないので書かなかった：報告 3）。説明の文を本文に合わせる。表示はされない所。

**N7　主張の札の札と出典の細部**（値はどれも正しい）
- 行 14（旧 14 CFR 23.1387 の配光）：札は「参考値」。条文の引用なので「条文」が合う。
- 行 17・19・20・24・27（「4 つの行程でクランク軸は 2 回転」）：PHAK 第 7 章は「two-stroke engine has a power stroke upon each revolution」と比べて示すだけで、「2 回転」とは書いていない。出典に基礎教材 kiso03.4（720°）か FAA の動力装置のハンドブックを並べる。
- 行 5（疲労）：「PHAK 第 3 章の composite の段落」は、複合材は金属の疲労がないと書く所で、疲労の定義ではない。出典を「一般の説明（値の主張なし）」とするか、整備士のハンドブックにする。

**N8　用語の表 `Hydroplaning` の注「9 × √（タイヤの空気圧 psi）kt」**
- PHAK の式は主輪の空気圧。「9 × √（主輪のタイヤの空気圧 psi）kt」に。

**N9　確認問題 sys.9 の問い：「EIS の油圧が赤く点滅し」**
- 赤い点滅は、115 psi を超える高い油圧でも出る（POH 3.1）。高い油圧の POH の手順は「land as soon as practical」で、正解の「できるだけ早く」と違う。
- 直し方（案）：問いを「油圧が低い側（25 psi 未満）で赤く点滅し、油温も上がってきた」に（選択肢と正解の位置は変えない）。

**N10　`sys.gear` のここが大切「ぬれた滑走路では、ハイドロプレーニングでブレーキが効かない」**
- PHAK は「can reduce braking effectiveness … can be completely lost when the tires are hydroplaning」。ぬれた滑走路でいつもハイドロプレーニングになるわけではない。
- 直し方（案）：「ぬれた滑走路では、ハイドロプレーニングでブレーキが効かなくなることがある」（60 字以内）。

**N11　`sys.piston`「今の Seminole は IO-360-B1G6」**
- Piper の仕様書（R.piperTrainer）は「(2) Lycoming IO-360-B1G6」で、文は仕様書どおり。
- Lycoming SSP-110-3 の PA-44-180 の欄は、逆回転の LIO-360-B1G6 を挙げる。
- 直すなら「IO-360-B1G6（片方は逆回転の LIO-360-B1G6）」。自然吸気という主張には影響しない。

## 4. 主張の札 79 行の照合

| 行（`sys.claims.json` の順、0 から） | 節 | 結果 |
|---|---|---|
| 0〜2 | sys.ctl | 合う（POH 7.1・7.7・7.9） |
| 3〜5 | sys.airframe | 合う（計算は下の 5。行 5 の出典は N7） |
| 6〜10 | sys.gear | 合う（POH 7.7・8.23、PHAK 第 11 章、9 × √24 ＝ 44.09） |
| 11〜16 | sys.lights | 合う（eCFR 91.209、AIM 4-3-24 の番号と文、旧 23.1387 の 110°／140°、FL.jur lights.ac の文。行 14 の札は N7） |
| 17〜27 | sys.piston | 合う（PHAK 第 7 章・POH 2.7・Lycoming・eCFR 1.1。2 回転の出典は N7） |
| 28〜36 | sys.engine | 合う（POH 4.5k・2.7(10)・2.9(a)・4.5l、PHAK 第 5 章の 50〜87%。行 32 の条件は N4、行 34 の番号は N3） |
| 37〜42 | sys.eis | 合う（POH 2.7・2.9(c)・3.1・7.13、チェックリスト 87 KIAS） |
| 43〜47 | sys.carb | 値は合う（PHAK 第 7 章・POH 3.5j）。**行 46 は S2 の書き方を直してから署名** |
| 48〜58 | sys.fuel | 合う（教材値 24＝`physics.js` の pa28 の fuelCap、POH 2.21・4.5k・8.21(d)・7.15、計算） |
| 59〜68 | sys.elec | 合う（POH 7.17・7.5、SAIB CE-10-11、計算） |
| 69〜78 | sys.radio | 合う（NIST SP 811、AMT 第 11 章の 118.000〜136.975 MHz・AM・25／8.33 kHz・1 人・1/4 波長、λ ＝ 2.5 m） |

札のない文も、次の資料で確かめた（問題は 3 に書いた所だけ）：PHAK 第 3・5・6・7・11 章、AFH 第 2・11 章、POH、チェックリスト、AMT 第 11 章、Lycoming、Piper の仕様書。対象の文は次のとおり。
- 構造・ブレーキ・前輪式
- 点火・P リード・オイル・冷却・EGT と CHT
- 吸気圧力・定速プロペラ
- 燃料の通気・ベーパーロック・燃料計・ボンディング
- 暖房と一酸化炭素、電流計
- 放電索・SSB・AM の雑音・洋上の HF
- 確認問題 9 問の正解と理由（sys.2・sys.4 は PHAK 第 8 章の静圧孔とピトー管の詰まりで、既存の確かめた文と同じ趣旨。sys.5 は AFH 第 11 章 p.11-5 の文と同じ）

主張の抜き出しから漏れている文がある：`sys.piston` のもっと深くのうち、180 hp → 約 134 kW・ω ≈ 283 rad/s・約 475 N·m の文と、説明してみよう の答え。`--claims-out` で確かめた。CALC.json（今は pending）を作るときに、これらの式も入れてほしい。

## 5. 計算（全部を計算し直した）

| 場所 | 式 | 結果 |
|---|---|---|
| sys.airframe 計算演習 | 12,000 × 3.0 | 36,000 N·m ✓ |
| 説明してみよう 2 | 15,000 × 2.5、×1.2 | 37,500・45,000 N·m ✓ |
| sys.gear・説明してみよう 10 | 1.2² | 1.44 ✓ |
| sys.gear | 9 × √24 | 44.09 → 約 44 kt ✓ |
| sys.piston | 2,400 ÷ 60 ÷ 2、2,700 ÷ 60 ÷ 2、3,000 ÷ 60 ÷ 2 | 20・22.5・25 ✓ |
| sys.piston もっと深く | 180 × 745.6999、2π × 2,700 ÷ 60、P ÷ ω | 134,226 W・282.74 rad/s・474.7 N·m（答えは ✓、途中の式は **S3**） |
| 説明してみよう 14 | 540 ÷ 60 | 9 ✓（「圧力が 9 倍ではない」も正しい） |
| sys.engine もっと深く | 0.80 × 100,000 ÷ 60 | 1,333.3 N ✓ |
| sys.carb | 60〜70°F の差 × 5/9 | 33.3〜38.9 ℃ の差 ✓（PHAK と同じ） |
| sys.fuel 計算演習 | 40 −（19 ＋ 18） | 3 US gal ✓ |
| 説明してみよう 9 | 48 −（30 ＋ 14）、30 × 6 | 4 US gal・180 lb ✓ |
| sys.elec 計算演習 | 140 ÷ 28、84 ÷ 28 | 5.0・3.0・合計 8.0 A ✓ |
| 説明してみよう 4 | 120 ÷ 28、72 ÷ 28、192 ÷ 28 | 4.29・2.57・6.86 → 4.3・2.6・6.9 A ✓ |
| sys.radio 計算演習・説明してみよう 5 | 30 ÷ 10 | 3.0 h ✓ |
| sys.radio | 3×10⁸ ÷ 1.2×10⁸ | 2.5 m ✓ |
| sys.fuel・図 | 24 × 2、50 − 2 | 48 ✓ |

## 6. 図（9 枚）

`check-chapter.mjs` の figures は error 0・warn 0（Chromium 390 px）。7 枚を 390 px で描いて目で見た：`sysAirframe`・`sysGearBrake`・`sysFourStroke`・`sysEis`・`sysRadioWaves`・`fuelSystem`・`positionLights`。

| 図 | 結果 |
|---|---|
| `sysAirframe` | 主桁・後桁・小骨・縦通材・外板、フレーム・縦通材・外板。PHAK 第 3 章と合う |
| `sysGearBrake` | トーブレーキ（実線）→ 左右の主輪、ハンドブレーキ（点線）→ 両方、共用のタンク。POH 7.7 と合う。「×2」と前輪の行は **N5** |
| `sysFourStroke` | 4 行程の弁の開閉・ピストンの向き・吸気と排気の矢印が PHAK 第 7 章の順と合う |
| `sysEis` | 油圧の帯は 0〜120 psi の目盛りどおり：黄 25〜55（アイドル）・緑 55〜95・黄 95〜115（暖機）・赤い線 25／115。POH 2.9 と合う。測る場所（回転・油圧・油温・EGT・燃料流量・浮き式の量）も POH 7.13・7.15 と合う |
| `sysRadioWaves` | 地上波（LF・MF）・電離層波（HF）・空間波（VHF）・118.000〜136.975 MHz・AM。AMT 第 11 章と合う（本文 M1 は図ではなく文の誤り） |
| `fuelSystem` | ▼ は各タンクの内側の下の隅（POH 7.15「lowest, inboard corner」・8.21(d)）。L／R／OFF、離着陸で電動ポンプ ON。合う |
| `cockpitLayout` | 天井のスイッチ・右下のブレーカー・台の右のキャブヒート・左の壁の燃料セレクター。POH 7.11・7.15・7.17 と合う |
| `elecSystem` | 非常用バッテリー 30 分以上（POH 7.17）、スターターは START の間だけ接触器（PHAK 第 7 章）。合う |
| `positionLights` | 配光の扇形 110°／110°／140°（旧 23.1387）。「左に赤・右に緑＝同じ向き」「左に緑・右に赤＝こちらへ」は AFH 第 11 章 p.11-5 の文どおり。91.209(b) の「安全のために消してよい」も合う |

## 7. 日米の書き分け・基礎教材の書き直し・用語

- **日米**：共通の節の規則の言葉は、どれも同じ文に「米国の」がある。`sys.lights` の 91.209 ×2・AIM 4-3-24・旧 23.1387、`sys.piston` の 14 CFR 1.1、図 `positionLights` の 91.209。日本の規則の言葉は `bk.jur('lights.ac')` の中だけ。`check-jurisdiction` も error 0。
  - SAIB と FAA の資料は規則ではない（S5 の言い方だけ直す）。
  - VHF の 25／8.33 kHz は資料の説明で、規則の値ではない。
- **基礎教材**：kiso01・02・03 の本文・問題・答えと、下書きの本文を 18 字以上の一致で比べた（スクラッチのスクリプト）。一致したのは次の 5 つだけで、どれも数式・語の並び・短い言い回しで、文の写しではない。書き直しになっている。
  - 「Full Authority Digital Engine Control」
  - 「15,000×2.5＝37,500N·m」
  - 「力が1.2倍なら45,000N·m」
  - 「容量30Ahのバッテリーを一定の10Aで使う」
  - 「気温が0℃より高ければ、気化器着氷は」
- **基礎教材の誤りの扱い**：
  - K.systems.K2：PHAK の 21℃・80%／38℃・50% が先、POH の −5〜20℃ が横。直っている（書き方は S2）。
  - K.systems.K1：PHAK の「外気圧より高くできない」。直っている。後半のラム効果は、私も FAA の一次資料を見つけられなかった。書かないのが正しい。RULINGS R.manifold-pressure の裁定の文の後半をどうするかは W27。
- **用語**：初出の「正式名（通称、English）」は FL.terms と合う。確かめた語：吸気圧力・気化器着氷・キャブレターヒーター・右舷灯・左舷灯・尾灯・着陸装置・ショックストラット・発電機・燃料消費率・迎え角・試運転・着陸復行・機長・外部点検・衝突防止灯。

## 8. 検査の結果

| 検査 | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/sys-figs.js textbook/rewrite/combined/drafts/sys.js` | error 8・warn 15・pending 1。中身は W14 の報告 5.1 と同じ：<br>style の error 8（部品の見出しの数え方）・warn 3（初出の形の数え方）<br>questions の warn 1（正解の位置 B 67%）<br>claims の warn 11（今の CLAIMS.json に行がないため）<br>calc の pending 1<br>chapters・form・data・volume・jurisdiction・chapter-refs・figures（12 枚・Chromium 390 px）・photos・concepts・jur・path・provenance・egov は 0 |
| FLIGHT LAB `cd flight-lab && npm run -s test:fast` | **86/86 pass** |
| CADET `cd cadet && npm run -s test:fast` | **247/247 pass** |
| TEXTBOOK `cd textbook && npm test` | **33/34 pass・1 fail**（2 回流して同じ）。落ちたのは `build.test.mjs:66`「build: FLIGHT LAB sources are not copied into textbook/」で、引っかかったのは `rewrite/combined/drafts/radio.js`（W19-radio の下書き。名前が `flight-lab/src/radio.js` と同じ）。この章の下書き（`sys.js`・`sys-figs.js`）は関係しない。一時的な失敗ではないので下の 9 に書いた |

## 9. 台帳の行

触った行はない（パッチは作っていない）。署名（`checkedBy`）は W27 の仕事なので、次のように勧める。
- **CLAIMS**（`sys.claims.json` の 79 行、章の登録で足す行）：
  - 78 行は、一次資料で確かめた値として署名してよい。
  - 行 46 は S2 を直してから。
  - 行 14 は札（N7）を直すとよい。
- **ERRATA**：`K.systems.K1`・`K2`。W14 の `fixed`・`verified: true` に同意する（K2 は S2 の書き方を直すとよりよい）。
- **RULINGS**：`R.carb-ice-temp`・`R.manifold-pressure`。直った場所は正しい。`R.manifold-pressure` の後半（ラム効果）は一次資料なしのまま。

## 10. 未解決のこと

1. S1 の気化器着氷の手順（PHAK と POH 3.5k の 1 分）は〔安全〕に近い。直した文を W27・W36 の安全レビューで見てほしい。
2. S4 のインバーターの出典：AMT General Handbook（FAA-H-8083-30 系）か Airframe Vol. 1 第 9 章で確かめる必要がある。私は FAA のサイトから PDF を取得できなかった（URL の推測が 404）。
3. 主張の抜き出しが `sys.piston` のもっと深くの出力とトルクの文と、説明してみよう の答えを拾っていない。CALC.json を作るとき（calc の pending）に式を入れる。

## 11. ほかの単位にお願いしたいこと（needs from others）

1. **W14（または sys の直し役）**：上の M1・S1〜S5、nit N1〜N11 を `drafts/sys.js`・`drafts/sys-figs.js`・`drafts/sys.claims.json` に。M1 と S1〜S5 の直す文は 3 に書いたとおり。
2. **W27（R2 の確かめ）**：9 の署名。S1 の安全レビュー（W36 と）。RULINGS `R.manifold-pressure` の裁定の文の後半（ラム効果）をどうするか。
3. **W19-radio・統合役**：`textbook/rewrite/combined/drafts/radio.js` の名前が FLIGHT LAB のソース `flight-lab/src/radio.js` と同じため、TEXTBOOK のテスト `build.test.mjs:66`（FLIGHT LAB sources are not copied into textbook/）が落ちる。直し方は次のどちらか。
   - 下書きの名前を変える（例：`radio-ch.js`、`radio-figs.js`・`radio.claims.json` も合わせる）。
   - テストが `rewrite/combined/drafts/` を除くようにする（テストの持ち主の判断）。
4. **CALC.json の持ち主**：4 の最後に書いた、抜き出しから漏れた計算の文を入れる。
