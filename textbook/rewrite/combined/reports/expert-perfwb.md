# 専門家の読みの報告：第 1 部 第 8 章 `perf`「性能」と第 9 章 `wb`「重量と重心」（W16 の下書き・R2）

単位：expert-perfwb（W16 の章の専門家の読み手）。読んだ日：2026-10-30。
立場：飛行教官（FAA の CFI・CFII・MEI）で、JCAB の学科（自家用・事業用の航空工学と空中航法）の出題範囲も知っている読み手として読んだ。

読んだもの：
- 下書き：`textbook/rewrite/combined/drafts/perfwb.js`（`perf` 7 節・`wb` 5 節・2 つの章末）、`drafts/perfwb-figs.js`（図 15 枚・計算機 2 つ）、`drafts/perfwb.claims.json`
- 報告：`reports/W16.md`・`factcheck-perfwb.md`・`reader-perfwb.md`（初学者の読み。私が読み始めたあとにできた）・`expert-sys.md`（形の見本）
- 台帳：`ledgers/ACS-MAP.json`・`JCAB-MAP.json`・`CONCEPTS.json`・`RULINGS.json`（`R.pa-coefficient`・`R.planning-margin` など）
- 決まり：DESIGN 3.3（第 1 部 第 8・9 章の行）・3.4・4.1・4.2（kiso05・kiso06）・6.2・7.2（W16）、DECISIONS、STYLE、`FL.terms`
- 比べた他の章：`drafts/aero.js`（`aero.power`・`aero.stab`・`aero.stall`・`aero.spin`・`aero.struct`）・`drafts/inst.js`（`inst.alt`）・`drafts/sys.js`（`sys.engine`・`sys.fuel`・`sys.gear`）・`drafts/navb.js`（`navb.wind`・`navb.calc`）・`flight-lab/src/book-0.js`（`basics.units`・`basics.alt`）・`book-2.js`・`book-3.js`

下書きを本と一緒に読み込み（`tools/lib/load.mjs` の `loadBook`）、12 節を文字にして読み、図 15 枚を Chromium の 390 px で画像にして見た（スクラッチ）。

**下書きは変えていない**（読み手の役目：直さない）。変えたファイルはこの報告だけ。台帳のパッチは作っていない。git の操作はしていない。

## 1. 結論

教官の目で見て、土台のしっかりした 2 章です。事実確認役が POH・PHAK・AIM・14 CFR の値を全部照らしていて、私が取り直した所（POH の図・手順、AIM 7-6-8、AFH 第 9 章）でも数値の誤りは見つからなかった。特に次の所は、口述試験と実際の飛行前の計画にそのまま使える質です。
- 「50 ft を越える距離は滑走距離を含む（足さない）」と「密度高度を気圧高度の目盛りに入れない（2 回足さない）」を、図・問・説明してみようで繰り返し押さえている
- 対地速度での勾配（ft/NM ＝ fpm × 60 ÷ GS）と、追い風で勾配が下がることを、離陸から着陸復行までの計画につないでいる
- 「燃料 95.0 in＞後ろの限界 93.0 in なので Archer は燃料を使うと重心が前へ。ほかの機体は決めつけない」
- ランプ → −8 lb → 離陸 → 燃料を使って着陸、の段階ごとの確かめ（ACS PA.I.F.S1「全部の段階で範囲の中か」に合う）
- 搭載グラフの 1,000 倍の戻し忘れ、計算ソフトの入力を人が照らす、の判断の目

数：**must 0・should 16・nit 11**（私が見つけたもの）。事実確認役の must 1（4 人と満タンの 58 lb）と should 7 にはすべて同意する（6）。重さは上げていない。

- **should の主なもの**：
  - 着陸復行の手順に「キャブレターヒーターを OFF」がない（同じ段落でヒーターは全開の出力を下げると書いている）〔安全〕
  - 密度高度の高い日の離陸前のリーン（Archer のチェックリストの手順）がない（ACS PA.I.F.K2b 操縦の技術）
  - 「浮揚速度」をローテーション速度（V<sub>R</sub>）の値にも使っている。JCAB の「離陸時の速度」の見出しに当たる所
  - JCAB の見出しの不足：進入速度（自家用・事業用）、要求上昇勾配の数値（事業用。本のどこにもない）、ステーション・ナンバー、測定結果からの重心位置の算出（POH 6.3 の式が Archer の値で使える）
  - POH の「上昇の時間・燃料・距離」の図（POH 図 5-17）を使わず、上昇の燃料を 2 gal と決め打ちしている（ACS PA.I.D.K3a）
  - 図に入れる風が「滑走路に沿った向かい風成分」であることと、横風成分の扱いがない
  - 組み合わせの図を実際に読む練習ができない（図は模式図だけ。ACS PA.I.F.S2）
  - 二度教えている所：最大航続と最大滞空の速さ（`aero.power`）、重心の前後の影響と尾翼の下向きの力（`aero.stab`）、1 hPa が何 ft か（`inst.alt` は 28 ft、`perf.da` は 27 ft と 30 ft）、燃料消費率の定義（`navb.calc` が太字でもう一度）

## 2. 確かめた一次資料（2026-10-30）

POH・チェックリスト・AIM 7-6 は、このスクラッチ（`scratchpad/expert-perfwb/src/`）に自分で取り直した。AFH 第 9 章・PHAK 第 11 章・FAA-H-8083-1B・ACS は、同じセッションのほかの単位がこの日に取ったスクラッチの写しを読んだ（中身はデータとして読んだだけ）。POH の図は PDF のページを画像にして見た。

- Piper PA-28-181 Archer III POH VB-2266（2013、R.archerPoh の andrews.edu の写し）：
  - 2.3（V<sub>O</sub>：2,550 lb で 113 KIAS、1,917 lb で 98 KIAS、「Maneuvering speed decreases at lighter weight」）
  - 2.15（普通類：「All acrobatic maneuvers including spins prohibited」、実用類：60° を超える Steep Turns・Lazy Eights・Chandelles）と 2.25 の札（「SPINS ARE PROHIBITED FOR NORMAL AND UTILITY CATEGORY」）
  - 4.5 の離陸（ふつうの離陸：「Rotation Airspeed 60 KIAS」、SHORT FIELD, OBSTACLE CLEARANCE：Flaps 25°・「Rotation Airspeed 55 KIAS」・Obstacle Clearance 60 KIAS・Initial Climb 64 KIAS・障害物のあと 76 KIAS）
  - 4.5k（巡航：5,000 ft より上で混合気を絞る、タンクの切り替え 1 時間・2 時間、切り替えの前に電動燃料ポンプ ON）
  - 4.5m（「Carburetor heat should not be applied unless there is an indication of carburetor icing, since the use of carburetor heat causes a reduction in power which may be critical in case of a go-around. Full throttle operation with carburetor heat on can cause detonation.」）
  - 図 5-7 の表の見出し「WT・LIFTOFF・50FT」（ローテーションではなくリフトオフの速度）
  - 図 5-17「TIME, FUEL, DISTANCE TO CLIMB」（条件 2,550 lb・FULL THROTTLE・Flaps UP・78 KIAS、「NOTE: This chart includes fuel allowance for start, taxi, & takeoff.」、例：出発 2,000 ft・23℃ → 巡航 6,000 ft・15℃ で 12 − 3 ＝ 9 分、4 − 2 ＝ 2 gal、17 − 5 ＝ 12 NM）。図 5-31（降下の時間・距離・燃料）が目次にある
  - 6.3(d)（Basic Empty Weight Center of Gravity：図 6-3 の Leveling Diagram で A ＝ 31.0、B ＝ 109.7、「C.G. Arm ＝ N(A) ＋ (R ＋ L)(B) ÷ T、T ＝ N ＋ R ＋ L」。図 6-1 の Weighing Form は Scale Reading・Tare・Net Weight）
- Archer III w/ G1000 Pilot's Checklist（MGA 2025、R.archerCk）：
  - BALKED LANDING, GO-AROUND（Mixture VERIFY FULL RICH・Throttle FULL POWER・Flaps RETRACT TO 25°・64 KIAS・76 KIAS AFTER OBSTACLE CLEARED・Flaps SLOWLY RETRACT。キャブレターヒーターの行はない）
  - BEFORE LANDING（Carburetor Heat/Alternate Air … AS REQUIRED）、LANDING（70 KIAS ON FINAL、65 for Short/Soft Field）
  - HIGH DENSITY ALTITUDE ENGINE LEANING FOR TAKEOFF（Brakes APPLY & HOLD・Throttle FULL POWER・Mixture LEAN FOR BEST POWER、「Leave the mixture in this position for takeoff. Do not overheat the engine …」）
  - After Starting：Mixture FULL RICH BELOW 5000FT、MAX DEMONSTRATED CROSSWIND 17 KTS、Va 113（2,550 lb）・89（1,917 lb）
- FAA AFH FAA-H-8083-3C 第 9 章：「Carburetor heat is turned off to obtain maximum power, as applicable.」（Go-Arounds の Power）、「The pilot should use the manufacturer's recommended airspeed or 1.3 VSO if there is no manufacturer's recommendation.」、「no more than one-half the gust factor is added」
- FAA AIM 7-6-8 Use of Runway Half-way Signs at Unimproved Airports（faa.gov の HTML を取得）：「reach 70 percent of lift-off airspeed by the midpoint」「the takeoff should be aborted」と注意 4 つ（低い速度の速度計・路面・障害物・上り坂と追い風）
- FAA PHAK FAA-H-8083-25C 第 11 章：風の 10%（「10 percent of the takeoff airspeed」）、性能の図の例（図 11-21 補間・11-23 組み合わせの図・11-25／11-26 Fuel, time, and distance climb chart・11-27〜30 巡航と航続・11-31 Crosswind and Headwind Component Chart・11-32／33 着陸距離・11-34 失速速度の表）、「tested … in 90° crosswinds with a velocity up to 0.2 VS0」「The maximum demonstrated crosswind component is published in the AFM/POH」、重さが減ると「the optimum airspeed and power setting may decrease」、高さで速度が収束して絶対上昇限度で 1 つになる
- FAA-H-8083-1B Aircraft Weight and Balance Handbook（R.wb）：用語集「Station. (GAMA) A location along the airplane fuselage usually given in terms of distance from the reference datum.」「Structural station … The datum is, therefore, identified as station zero. … An item located at station +50 would have an arm of 50 inches.」、第 3 章 EWCG Formulas（前輪式で基準線が前にあるとき）
- FAA-S-ACS-6C（自家用）：PA.I.F.K1〜K3・R1（Use of performance charts, tables, and data）・R2（Airplane limitations）・R3（Possible differences between calculated performance and actual performance）・S1（Compute the weight and balance, correct out-of-CG loading errors and determine if the weight and balance remains within limits during all phases of flight）・S2（Use the appropriate airplane performance charts, tables, and data）、PA.I.D.K3a（climb and descent rates）・R6（Fuel planning）、PA.IV.N.R3（Power application）・R4（Configuring the airplane）、PA.V.A.S3（約 45° の急旋回）。FAA-S-ACS-7B の CA.V.A.S3（約 50°）
- JCAB「出題範囲参考」（`ledgers/src/sources/mlit/`）：自家用の離着陸性能「概要、離陸距離、進入速度」、事業用の離着陸性能「概要、要求上昇勾配の数値、離陸時の速度、離陸距離、離陸上昇、着陸距離、進入速度」、事業用の重量・重心位置（重量の定義「離陸重量、着陸重量、零燃料重量」、重心位置の定義「基準線（リファレンス・デイタム）、ステーション・ナンバー、LEMAC、アームの意味」、測定「測定結果からの重量、重心位置算出」）、燃料計算に必要な知識（燃料消費率の定義・単位・航空機用ガソリンの比重・飛行に必要な燃料の種類）

確かめられなかったもの：V<sub>LOF</sub> の JCAB の正式の名前（「浮揚速度」か）。耐空性審査要領の写しを読めなかった〔要確認〕。下の E-S3 は、`FL.terms` の V<sub>R</sub>（ローテーション速度）と POH の書き分けだけを根拠にしている。

## 3. 問題（重い順）

### must

私が見つけた must はない。事実確認役の M1（`perf.wbex` の「最大重量を 58 lb 超えます」：章の手順では 50 lb）は must のままでよい（6）。

### should

**E-S1　`perf.plan`「着陸復行の性能」と図 `perfPlanChain` の ⑤：着陸復行の手順に「キャブレターヒーターを OFF」がない**〔安全〕
- 今の文：「Archer の公開チェックリストの着陸復行は、混合比 FULL RICH を確かめ、全開にし、フラップを 25° へ上げ、64 KIAS で上がります。…」。次の段落で「進入でキャブレターヒーターを入れていると、全開にしたときの出力が足りません。だから POH は、着氷の兆しがない限り、進入ではヒーターを使わないとしています（POH 4.5m）」。図の ⑤ は「全開・フラップ 25°・64 KIAS」。
- 何が足りないか：
  - チェックリストの BEFORE LANDING は「Carburetor Heat … AS REQUIRED」。気化器着氷の兆しがあれば、ヒーターを入れたまま進入することがある。そのとき着陸復行でヒーターを戻さないと、全開でも出力が足りず、POH 4.5m の言うデトネーションも起こりうる。
  - AFH 第 9 章は、着陸復行の最初の操作（Power）に「Carburetor heat is turned off to obtain maximum power, as applicable」と書く。
  - 本文は「ヒーターは出力を下げる」と理由まで書いているのに、手順の列にない。手順として覚える訓練生は、ここを落とす。
- 直し方（案）：
  - 手順の文：「…混合比 FULL RICH を確かめ、全開にします。キャブレターヒーターを入れていたら、OFF にします（AFH 第 9 章）。フラップを 25° へ上げ、64 KIAS で上がります。」
  - 図 ⑤：「全開・ヒーター OFF・フラップ 25°」
  - 事実確認役の S5（「着氷（icing）」→「気化器着氷（carburetor icing）」）と同じ段落なので、一緒に直す。
- 根拠：AFH 3C 第 9 章 Go-Arounds（Power）、POH 4.5m、MGA チェックリスト BEFORE LANDING・BALKED LANDING。ACS PA.IV.N.R3（Power application）・R4（Configuring the airplane）。

**E-S2　`perf.da`「何が落ちるのか」：密度高度の高い日の離陸前のリーンがない**（ACS PA.I.F.K2b 操縦の技術）
- 今の文：エンジン（自然吸気）は「吸い込む空気が減り、出力が下がる」まで。判断の目は「POH の図で読み直す」「涼しい時間に飛ぶ」「湿度で 10%」。
- 何が足りないか：Archer のチェックリスト（R.archerCk）には「HIGH DENSITY ALTITUDE ENGINE LEANING FOR TAKEOFF」がある（ブレーキを踏んだまま全開 → LEAN FOR BEST POWER → そのまま離陸、過熱に注意）。After Starting は「Mixture FULL RICH BELOW 5000FT」。高い密度高度で FULL RICH のまま離陸すると、混合気が濃すぎて出力がさらに下がる。性能の章で「出力が下がる」と教えたなら、操縦士が取り戻せる分（混合比）も同じ節で言うのが ACS の「操縦の技術」の項目に合う。混合比のしくみは `sys.engine` が教えている（巡航のリーンと EGT）が、離陸前のリーンはどの章にもない。
- 直し方（案）：表の「エンジン（自然吸気）」の行のあとに 2 文。「高い空港や暑い日は、チェックリストの手順で離陸の前に混合比を最良出力に合わせることがあります（ブレーキを踏んだまま全開にして絞る）。手順と高さの目安は、その機体のチェックリストに従います。」＋ `bk.see('sys.engine', 'エンジン・点火・ミクスチャー')`。判断の目にも 1 項目。
- 根拠：MGA チェックリスト HIGH DENSITY ALTITUDE ENGINE LEANING FOR TAKEOFF・After Starting、POH 4.5k（混合気の絞り方と EGT）、ACS PA.I.F.K2b。

**E-S3　`perf.tol`・`perf.chart`・図 `takeoffDistance`・`windEffect`・シミュレータの囲み・確認問題 2：「浮揚速度」を、ローテーション速度（V<sub>R</sub>）の値にも使っている**（JCAB 事業用「離陸時の速度」）
- 今の文：「Archer で浮揚速度を約 60 KIAS とすると」（値は教材モデルの `rotate`。チェックリストでは Vr 60）、シミュレータの囲み「この課目は簡略化して、フラップ 0・浮揚 60 kt で離陸します。公開されているチェックリストの短距離離陸は、フラップ 25°・浮揚 55 KIAS です」、`perf.chart` の表「2,550 lb なら浮揚 60 KIAS、50 ft で 65 KIAS」。
- 何が違うか：
  - POH は 2 つの速度を書き分ける。手順（4.5）は「Rotation Airspeed」（ふつう 60 KIAS・短距離 55 KIAS）、性能の図 5-7 の表は「LIFTOFF」。AIM 7-6-8 は「lift-off airspeed」、PHAK の風の 10% は「takeoff airspeed」。
  - `FL.terms` には V<sub>R</sub>＝ローテーション速度（rotation speed）がある。「浮揚速度」は表にない。本文はどちらの語も定義せず（初学者の読み手の C1）、短距離離陸の「Rotation Airspeed 55」を「浮揚 55」と書いている。
  - JCAB 事業用の「離陸時の速度」は、機首を上げ始める速度と浮く速度と 50 ft（障害物）の速度を区別させる見出し。ここで混ぜると、第 5 部の多発（V<sub>MC</sub> と V<sub>R</sub> の関係）で困る。
- 直し方（案）：
  - `perf.tol` の「2 つの距離」の前に 3 行。「ローテーション速度（V<sub>R</sub>、rotation speed）：機首を上げ始める速度。浮揚速度（lift-off speed）：車輪が地面を離れる速度。50 ft の速度：50 ft を越えるときの速度。Archer の POH は、ふつうの離陸でローテーション 60 KIAS、図 5-7 の表で 2,550 lb の浮揚 60 KIAS・50 ft 65 KIAS です。」
  - 「Rotate」「Rotation Airspeed」の値（シミュレータの囲みの 60 kt、短距離の 55 KIAS）は「ローテーション」に。PHAK・AIM の規則（風の 10%、中間点の 70%）は「浮揚速度」のままでよい。
  - 「浮揚速度」の JCAB の表記を W04 が確かめて `FL.terms` に足すまで、初出は「浮揚速度（リフトオフ速度、lift-off speed）」とし、確かめたら札を外す〔要確認〕。
- 根拠：POH 4.5（Rotation Airspeed 60・55）、図 5-7（LIFTOFF）、AIM 7-6-8、PHAK 25C 第 11 章、`flight-lab/src/book-terms.js` の `vr`、JCAB 事業用の出題範囲。

**E-S4　JCAB「進入速度」（自家用・事業用の離着陸性能。JCAB-MAP は `perf.tol`・`perf.chart`・`perf.plan` に当てる）が、どの節にもはっきり書かれていない**
- 今の文：「浮揚や進入の速さは、POH が決めた速度計の値で守ります」「接地の速さが 10% 速い → 少なくとも 21%」「着陸の図の条件 … 66 KIAS」。
- 何が足りないか：進入速度を何で決めるか（POH の値。ないときは AFH の 1.3 V<sub>S0</sub>）、Archer の値（チェックリスト：ファイナル 70 KIAS、短距離・不整地 65 KIAS。POH の着陸の図は 66 KIAS・フラップ 40°）、突風のとき（突風分の半分まで）、速すぎると距離が延びる理由（10% → 21%）を 1 か所でつなぐ文がない。突風分の半分は `wx` の章（今の `book-2.js`・W17 の下書き）に、1.3 V<sub>S0</sub> は第 2 部（`book-3.js` の安定した進入の表）にあるだけ。
- 直し方（案）：`perf.tol`「距離を変えるもの」の 10% の段落の前に 3〜4 文。「進入速度（approach speed）は POH の値を使います（Archer のチェックリスト：ファイナル 70 KIAS、短距離 65 KIAS）。決まった値がなければ、AFH は失速速度 V<sub>S0</sub> の 1.3 倍を勧めます。突風のときに足すのは、突風分の半分までです（AFH 第 9 章。くわしくは `bk.see` の行き先）。それより速いと、接地が遠く、距離が延びます。」
- 根拠：AFH 3C 第 9 章、MGA チェックリスト LANDING、POH 図 5-35、JCAB の出題範囲（自家用「概要、離陸距離、進入速度」）。

**E-S5　JCAB 事業用「要求上昇勾配の数値」（離着陸性能）が、本のどこにもない**
- 本の全部（`flight-lab/src/book-*.js` と下書き全部）を探したが、型式証明の基準の上昇勾配の数値を書いた所はない。JCAB-MAP の `cpl.1.1.2.3` は `perf.tol`・`perf.chart`・`perf.plan`・`me.perf` に当てるが、`topicMap` がなく、どの節がこの項目を持つか決まっていない。
- 直し方（案）：W42（JCAB-MAP）が `topicMap` で住所を決める（案：`perf.climb` の `bk.deep`「型式証明の上昇の基準」か、第 7 部の JCAB 学科の章）。数値は書き手が一次資料（耐空性審査要領、米国の 14 CFR Part 23・Part 25）で確かめてから書く。私は値を確かめていないので、ここには書かない。
- 根拠：JCAB 事業用の出題範囲、`ledgers/JCAB-MAP.json` の `cpl.1.1.2.3`（topicMap null）。

**E-S6　`wb.limits`「その機体の重さの記録」：JCAB 事業用「測定結果からの重量、重心位置算出」が書かれていない**（JCAB-MAP の `cpl.1.7.2.2` は `wb.limits` だけに当てる）
- 今の文：「空虚重量は、機体を水平にし、車輪ごとに置いた台はかりで量ります。台などの重さ（風袋）は、読んだ値から引きます（POH 6.3）。」まで。
- 何が足りないか：はかりの読みから重心を出す計算。Archer の POH 6.3(d) にそのまま式と腕の長さがある：前輪 A ＝ 31.0 in、主輪 B ＝ 109.7 in、重心 ＝（N × A ＋（R ＋ L）× B）÷ T、T ＝ N ＋ R ＋ L。JCAB の学科ではよく出る形で、この章の数字（アーム・モーメント）だけで解ける。
- 直し方（案）：「量り方」の段落に式と小さな例を 1 つ（読みと風袋は仮の値と明記）、計算演習か説明してみように 1 問。基準線から前輪・主輪までの距離は POH 図 6-3 の値。
- 根拠：POH 6.3（図 6-1・6-3、(d)(2) の式）、FAA-H-8083-1B 第 3 章 EWCG Formulas。

**E-S7　`perf.wb`「計算に使う言葉」：JCAB の「ステーション・ナンバー」がない**（自家用・事業用の重心位置の定義。JCAB-MAP は `perf.wb` と `tsys.wb`）
- 直し方（案）：基準線とアームの間に 1 項目。「ステーション（station、STA）：基準線からの距離で機体の中の位置を表す番号です。基準線はステーション 0 で、ステーション 80.5 の物のアームは 80.5 in です。」事業用の LEMAC と %MAC は `tsys.wb`（W32）の持ち物なので、ここは 1 行の予告でよい。
- 根拠：FAA-H-8083-1B 用語集（Station・Structural station）、JCAB の出題範囲。

**E-S8　`perf.fuel`「計算の手順」と例：上昇の燃料を「2 gal とすると」と決め打ちし、POH の「上昇の時間・燃料・距離」の図を使っていない**（ACS PA.I.D.K3a・PA.I.F.S2）
- 今の文：手順 ④「エンジンの始動・タキシー・離陸・上昇の分を足す」、例「タキシーと上昇の分を 2 gal とすると」。
- 何が足りないか：
  - Archer の POH には図 5-17「TIME, FUEL, DISTANCE TO CLIMB」がある。例は出発 2,000 ft・23℃ から巡航 6,000 ft・15℃ まで 9 分・2 gal・12 NM で、図の注に「start, taxi, & takeoff の燃料を含む」とある。つまり 2 gal は根拠のある数にでき、始動とタキシーを別に足すと 2 回数えることになる。
  - 上昇の 12 NM は巡航の距離から引く（POH 5.5(e)：「Using the total distance to be traveled during the flight, subtract the previously calculated distance to climb and distance to descend to establish the total cruise distance.」）。今の例は 120 NM 全部を巡航の GS で割っている。
  - PHAK 第 11 章の性能の図の例題には上昇の図（図 11-25・11-26）が入っていて、FAA の学科でもよく出る図。ACS は「上昇と降下の率」の計算を求めている。
- 直し方（案）：`perf.fuel`（または `perf.range`）に「上昇の時間・燃料・距離の図」の段落を足し、POH 図 5-17 の例（9 分・2 gal・12 NM、始動・タキシー・離陸を含む）を使う。例の計算は「上昇 2 gal（図 5-17）＋ 巡航（120 − 12 NM）÷ 105 kt × 9.5 gph ＋ 予備」の形に。降下の図（図 5-31）がある、と 1 文。
- 根拠：POH 図 5-17（注と例）・5.5(e)・目次の図 5-31、PHAK 25C 図 11-25・11-26、ACS PA.I.D.K3a。

**E-S9　`perf.tol`・`perf.chart`：図に入れる風が「滑走路に沿った向かい風成分」であることと、横風の扱いがない**
- 今の文：「向かい風 8 kt」「向かい風 5 kt」「風の強さまで進み」。報じられた風（例：030° 12 kt）から、図に入れる値をどう作るかがない。
- 何が足りないか：訓練生がよくする誤りは、報じられた風速をそのまま図の風の区画に入れること。PHAK 第 11 章は性能の図と同じ所で「Crosswind and Headwind Component Chart」（図 11-31）を教え、型式証明の横風の試験（0.2 V<sub>S0</sub>）と「最大の実証横風成分は POH にある」を書く。この本では、成分の計算の住所は `navb.wind`（CONCEPTS `C.wind-triangle`）。
- 直し方（案）：`perf.tol` の「距離を変えるもの」の表の下に 2〜3 文。「図に入れるのは、滑走路に沿った向かい風成分（または追い風成分）です。報じられた風速をそのまま入れません。成分の求め方は `bk.see('navb.wind', '航路・針路・航跡と風')`。横風成分は、POH の実証横風成分（Archer のチェックリスト：17 kt）と比べます。」（`navb` は同じ第 1 部の後ろの章なので予告は要らない）
- 根拠：PHAK 25C 第 11 章 Crosswind and Headwind Component Chart、MGA チェックリスト MAX DEMONSTRATED CROSSWIND、`drafts/navb.js` の `navb.wind`。

**E-S10　`perf.chart`：組み合わせの図を、本の中で実際に読む練習ができない**（ACS PA.I.F.S2）
- 今の形：図 `perfChartRead` は模式図で、途中の値を描かない（W16 の報告 6.3）。計算演習は補間の表（PHAK 図 11-21）だけ。離陸と着陸の図の値は、どれも POH の例の答えを写したもの。
- 何が足りないか：ACS の技能 S2「性能の図表を使う」と、kiso06 の章末の課題（説明してみよう 24）は、実物の図を読むことが前提。POH の図は機体ごとで写せないとしても、PHAK の図（図 11-23 Takeoff distance graph・図 11-33 Landing distance graph）はパブリックドメインで、PHAK に例題と答えがある。
- 直し方（案）：W21（図）が PHAK 図 11-23 か 11-33 を暗い板に描き直し（数字と線は PHAK のとおり、出典を書く）、`perf.chart` に「別の条件で読んでみる」計算演習を 1 つ（答えは PHAK の例題）。Archer の値ではないと明記する（補間の表と同じ扱い）。
- 根拠：ACS 6C PA.I.F.S2、PHAK 25C 図 11-23・11-33 と例題。

**E-S11　`perf.chart` の「思い出そう」：まだ習っていない次の章を「思い出そう」で指している**
- 今の文：「重心位置（重心、center of gravity）も性能を変えます。前の重心ほど失速速度（stall speed）が高く、後ろの重心ほど巡航が少し速くなります（次の章で学びます）。」→ `perf.wb`
- 何が違うか：「思い出そう」（`bk.recall`）は前に学んだことを呼び戻す囲み。「次の章で学びます」と同じ囲みの中で矛盾する。前の重心で失速速度が上がることは、第 5 章の `aero.stall`（失速速度の表「重心が前 → 上がる」）と `aero.stab`（尾翼の下向きの力）で、もう学んでいる。
- 直し方（案）：囲みを `bk.recall('…失速速度が上がりました。', ['aero.stall', …])` にし、「重心の影響のくわしい住所は次の章」と本文の 1 文で `bk.see('perf.wb', …)` を置く。CONCEPTS `C.cg-performance` の `recalls` も直す（5 の T2）。
- 根拠：STYLE「節の形」（思い出そう）、`drafts/aero.js` の `aero.stall`・`aero.stab`。

**E-S12　`perf.wb` の最初の段落：「重すぎると、失速しやすくなります」**
- 何が違うか：重さで変わるのは失速速度で、失速する迎え角（臨界迎え角）は変わらない。`aero.stall` は「失速速度は重さ・旋回・フラップ・重心で変わる。臨界迎え角は変わらない」と、ここを混同しないで教えている。「失速しやすい」は、重い機体は別の理由で失速すると読め、迎え角を先に教える本の方針（DECISIONS 11 の考え方）とずれる。
- 直し方（案）：「重すぎると、同じ速度でも大きな迎え角が要るので、失速速度（stall speed）が上がります。離陸距離が延び、…」
- 根拠：PHAK 25C 第 10 章（Effects of Weight：higher stalling speed）、`drafts/aero.js` の `aero.stall` のここを混同しない。

**E-S13　二度教えている：`perf.range` の「いちばん長く飛べるのは必要パワーが最小の速さ、いちばん遠くは揚抗比が最大の速さ」**
- 第 5 章の `aero.power`（DESIGN 3.3「目的別の最良速度」）が、表で最小沈下・最大航続（揚抗比最大）・最大滞空（必要パワー最小）・Vx／Vy をもう教えている。`perf.range` は同じ 2 文を、同じ PHAK 第 11 章を出典にしてもう一度書く。
- 直し方（案）：`perf.range` の段落を `bk.recall('最大滞空は必要パワーが最小の速さ、最大航続は揚抗比が最大の速さでした。', ['aero.power', '必要パワー・逆操作域・目的別の最良速度'])` にし、この節は POH の表でどう使うかだけにする。`perf.climb` の「余剰推力 → Vx、余剰パワー → Vy」は、`aero.power` の表が `perf.climb` を「くわしく扱う」と指しているので、今のままでよい。
- 根拠：DESIGN 3.3（`aero.power` の行）、`drafts/aero.js` の `aero.power` の表。CONCEPTS に行がない（5 の T1）。

**E-S14　二度教えている：重心の前後の影響と尾翼の下向きの力（`aero.stab`・`aero.stall` と `perf.wb`）**
- `aero.stab`（第 5 章）：「重心が主翼の揚力の中心より前、水平尾翼の下向きの力が支える」「重心が前すぎると、離陸や着陸で機首を上げにくく…後ろすぎると…スピンからの回復も難しく（POH 6.1）」。`aero.stall`：失速速度の表に「重心が前 → 上がる（尾翼の下向きの力が増える）」。
- `perf.wb`：前すぎ・後ろすぎの表、同じ POH 6.1 の段落、もっと深く「尾翼の下向きの力と重心」（揚力 ≒ 重量 ＋ Ft、迎え角・失速速度・抗力・巡航、静安定）。
- 同じ POH 6.1 の段落と尾翼の力の説明が 2 章にある。CONCEPTS の `C.cg-performance` は住所を `perf.wb` とし、呼び戻しは `perf.chart` だけ。
- 直し方（案）：`perf.wb` を「前後の影響（操縦・性能）」の住所とし、`aero.stab` は原理（重心は揚力より前・尾翼の下向きの力）の 1〜2 文と `bk.see('perf.wb')` にする（W13）。`perf.wb` のもっと深くは、仕組みの所を `bk.recall('aero.stab', …)` の 2 行にし、性能への影響（失速速度・抗力・巡航）と後ろの限界の話を残す。`C.cg-performance` の `recalls` に `aero.stab`・`aero.stall` を足す。
- 根拠：`drafts/aero.js` の `aero.stab`・`aero.stall`、`ledgers/CONCEPTS.json` の `C.cg-performance`。

**E-S15　二度教えて、数が違う：1 hPa が何 ft か（`inst.alt` は約 28 ft、`perf.da` は約 27 ft と約 30 ft）**
- `inst.alt`（第 7 章）：「海面の近くでは 1 hPa が約 28 ft」（10 hPa で約 280 ft の問いも）。`perf.da`（第 8 章）：「1 hPa の差が約 27 ft」「inHg の目安の 1,000 ft は、1 hPa あたり約 30 ft」。
- JCAB の学科は hPa で計算させるので、どれを覚えるかがはっきりしないのは困る（初学者の読み手の C3 と同じ所）。RULINGS `R.pa-coefficient` は「海面の正確な値は約 27.3 ft/hPa」。
- 直し方（案）：目安の住所を 1 つにする（案：先に出る `inst.alt`）。数は `R.pa-coefficient` に合わせて「約 27 ft」にそろえ、`perf.da` は `bk.recall('inst.alt', …)` で呼び戻して、inHg の 1,000 ft との差（約 30 ft になること）は「どちらも概算」の 1 文に留める。W15 と W16 で同じ数にする。
- 根拠：`drafts/inst.js` の `inst.alt`、`drafts/perfwb.js` の `perf.da`、RULINGS `R.pa-coefficient`。

**E-S16　二度教えている：燃料消費率の定義（`perf.range` と `navb.calc`）と、積む燃料の手順（`perf.fuel` と `navb.calc`）**
- `perf.range`（第 8 章）：「1 時間に使う燃料の量を、燃料消費率（燃料流量、fuel consumption rate）といい、gal/h（gph）で表します」（本で最初の定義。太字なし）。`navb.calc`（第 11 章）：「<b>燃料消費率（燃料流量、fuel consumption rate）</b>は、1 時間に使う燃料の量です」（太字の定義）。
- 積む燃料の足し方も、`perf.fuel` の手順（巡航・予備・始動とタキシー・上昇・使える燃料と比べる）と `navb.calc` の「積む燃料には、始動とタキシーの分、上昇で多く使う分、予備の分を足します」がほぼ同じ。
- 直し方（案）：CONCEPTS に行を足して住所を決める（案：本の順で先の `perf.range` に太字の定義、`navb.calc` は 1〜2 行の呼び戻し。JCAB-MAP は「燃料消費率の定義」を `navb.calc`・`perf.fuel` に当てているので、どちらでも見出しは満たす）。積む燃料の手順は `perf.fuel` を住所にし、`navb.calc` は区間の燃料の計算に絞って呼び戻す。決めるのは統合役（W16 と W18 の両方を直す）。
- 根拠：`drafts/perfwb.js` の `perf.range`・`perf.fuel`、`drafts/navb.js` の `navb.calc`、`ledgers/JCAB-MAP.json` の `ppl.3.1.2.5`・`cpl.3.1.2.5`。

### nit

**E-N1　`perf.tol`「離陸をやめる目安」：「米国の空港には、残りの長さを 1,000 ft 単位で示す残り距離標識があります（AIM 2-3-13）」**
- どの空港にもあるわけではない。「残り距離標識（…）がある空港もあります」に。

**E-N2　計画の余裕の例の「1.3 倍」が、進入速度の「1.3 V<sub>S0</sub>」と同じ数**
- E-S4 で 1.3 V<sub>S0</sub> を書くと、別のものが同じ 1.3 になる。余裕の例を別の数にするか、`perf.chart` の「余裕をかける」に「進入速度の 1.3 V<sub>S0</sub> とは関係ありません」と 1 文。

**E-N3　図 `takeoffDistance`：AIM 7-6-8 の 70% の目安を、舗装した LAB の滑走路に重ねて「中止」と描いている**
- AIM 7-6-8 は「舗装していない空港の中間の標識」の目安で、本文はそう書いている。図の札を「中間点の目安（舗装していない空港の中間標識。説明のため LAB に重ねた）」に（初学者の読み手の T3 と同じ所）。

**E-N4　`wb.shift`「左右の差」：「トリム（trim）や操縦輪で押さえると」**
- Archer のトリムはスタビレーターと方向舵だけ（POH 4.5 の「Stabilator and Rudder Trim」、7 章の rudder trim）で、補助翼のトリムはない。Archer では「操縦輪で押さえ続けることになり」と書くと実機に合う。

**E-N5　`wb.limits`「実用類」：スピンの禁止と、実地試験の急旋回との関係**
- 「バンク 60° を超える急旋回など」とだけあると、実用類ならスピンもよいと考える人がいる（ほかの機種には実用類でスピンを認めるものがある）。Archer の札は「SPINS ARE PROHIBITED FOR NORMAL AND UTILITY CATEGORY」（POH 2.25、2.15）。1 文と `bk.see('aero.spin')`。あわせて「実地試験の急旋回（米国の自家用で約 45°、事業用で約 50°：ACS）は 60° 以内なので、普通類の範囲です」と書くと、急旋回の課目で実用類が要ると誤解しない。

**E-N6　`wb.limits`：JCAB 事業用の「零燃料重量」**
- Archer の POH に最大零燃料重量はない。「旅客機などには最大零燃料重量（zero fuel weight）もあります（`ahead('tsys.wb', …)`）」の 1 行で、JCAB の見出しと `tsys.wb`（W32）がつながる。

**E-N7　`perf.range`：出力の選び方の 2 つの要素（ACS PA.VI.A.K6）**
- POH の巡航の表は、同じ出力 % でも高い所ほど真対気速度が増える。PHAK は「重さが減ると、最適の速度と出力は下がることがある」と書く。各 1 文あると、出力と高度の選び方の口述に答えられる。

**E-N8　`perf.fuel`：学校の予備**
- `perf.chart` の余裕と同じく、「多くの訓練校は、法令の予備より多い予備を規程で決めています。訓練校の規程に従います」と 1 文（数は書かない）と、個人の最低基準の住所 `adm.risk`（CONCEPTS `C.personal-minimums`）への `bk.see`。

**E-N9　`perf.da`「計算に使う言葉」：気圧高度・高度計規正値・国際標準大気をもう一度定義し、「思い出そう」は節の最後にある**
- 太字は外してあるが、住所（`basics.alt`・`wx.atm`）の定義を言い換えて並べている。最後の `bk.recall` を「計算に使う言葉」の頭に移し、気圧高度と高度計規正値の項目はその呼び戻しに置き換えると、思い出してから使う順になる。

**E-N10　`wb.limits`「単位の換算」の表：lb↔kg・in↔cm・US gal↔L は `basics.units` の表と同じ**
- 航空ガソリンの 2 行（約 6 lb/US gal・約 0.72 kg/L）と英ガロンだけを残し、ほかは今ある `bk.recall('basics.units')` に任せる（表の上に移す）。

**E-N11　`perf.plan`「総合演習」：3 つの別の条件をつないだ練習であることと、上昇率の速度**
- 離陸（2,000 ft・23℃・2,400 lb）、上昇（4,000 ft・19℃・2,550 lb）、着陸（2,500 ft・21℃・2,240 lb）は POH の 3 つの例で、1 回の飛行の条件ではない（表の行には書いてある）。表の上に「POH の 3 つの例の条件をつないだ練習です」と 1 文。上昇の 487 fpm は Vy（76 KIAS）の図の値で、離陸の直後の障害物は Vx で越える場面なので、「障害物が近いときは、Vx の上昇も考える（POH に Vx の上昇の図はない）」と添えるとよい。

## 4. ACS と JCAB の見出しとの照合（この 2 章に当たる行）

| 見出し | 当てる節 | 下書きで | 足りない所 |
|---|---|---|---|
| ACS PA.I.F.K1（図表の使い方） | perf.chart・perf.tol・perf.climb・perf.range | 満たす | 実物の図を読む練習（E-S10） |
| ACS PA.I.F.K2a〜f（大気・操縦の技術・形態・空港・積み方・重量重心） | perf.da・perf.tol・perf.wb・wb.limits | ほぼ満たす | b 操縦の技術：離陸前のリーン（E-S2）。d 空港：向かい風成分と横風（E-S9） |
| ACS PA.I.F.R1〜R3 | perf.chart・perf.plan | 満たす（外挿の禁止・余裕・図と実際の差） | — |
| ACS PA.I.F.S1（全段階で重量重心） | perf.wbex・wb.shift | 満たす（ランプ・離陸・着陸） | 例 ③ の 8 lb（事実確認役 S1） |
| ACS PA.I.F.S2（性能の図表を使う） | perf.chart | 一部 | E-S10・E-S8 |
| ACS PA.I.D.K3a・K3c（上昇と降下の率・予備を含む燃料） | perf.fuel（nav.log・navb.calc も） | 一部 | 上昇の図（E-S8） |
| ACS PA.IV.N.K2（密度高度と着陸復行） | perf.plan・perf.da | 満たす | ヒーター OFF（E-S1） |
| ACS PA.VI.A.K6（出力の選び方） | perf.range | ほぼ満たす | E-N7 |
| JCAB 自家用・事業用「飛行性能」（上昇性能・巡航性能） | perf.climb・perf.range | 満たす | — |
| JCAB 自家用「離着陸性能」（離陸距離・進入速度） | perf.tol・perf.chart・perf.plan | 一部 | 進入速度（E-S4） |
| JCAB 事業用「離着陸性能」（要求上昇勾配の数値・離陸時の速度・離陸上昇・着陸距離・進入速度） | 同上・me.perf | 一部 | 要求上昇勾配（E-S5）・離陸時の速度（E-S3）・進入速度（E-S4） |
| JCAB「重量の定義」（離陸重量・着陸重量・事業用は零燃料重量） | wb.limits・tsys.wb | 自家用は満たす | 零燃料重量（E-N6） |
| JCAB「重心位置の定義」（基準線・ステーション・ナンバー・アーム。事業用は LEMAC） | perf.wb・tsys.wb | 一部 | ステーション（E-S7）。LEMAC は tsys.wb |
| JCAB「重量、重心位置の算出」（基本式・総モーメント・計算表） | perf.wbex・wb.graph | 満たす | — |
| JCAB 事業用「重量、重心位置の測定」 | wb.limits | 満たさない | E-S6 |
| JCAB 事業用「重量、重心位置の修正」 | wb.shift | 満たす | （任意）「重心をある位置にするのに要る重さ」の式は、考えてみようの答えにあるだけ |
| JCAB「燃料計算に必要な知識」 | perf.fuel・navb.calc・jair.fpl | perf の分は満たす（比重は navb.calc） | 定義の住所（E-S16） |

## 5. 二度教えている概念（1 つの概念に住所は 1 つ：DESIGN 3.2）

| # | 概念 | 今ある所 | 案（住所 → 呼び戻す節） | CONCEPTS |
|---|---|---|---|---|
| T1 | 最大航続・最大滞空の速さ（目的別の最良速度） | aero.power（表）・perf.range（2 文） | aero.power → perf.range | 行なし。`C.best-speeds` を足す（E-S13） |
| T2 | 重心の前後の影響・尾翼の下向きの力 | aero.stab・aero.stall・perf.wb（表・POH 6.1・もっと深く） | perf.wb（影響）・aero.stab（原理）→ perf.chart・aero.stall | `C.cg-performance` の recalls に aero.stab・aero.stall（E-S14・E-S11） |
| T3 | 1 hPa が何 ft か | inst.alt（28 ft）・perf.da（27 ft・30 ft） | inst.alt → perf.da（数は 27 ft にそろえる案） | 行なし。`C.hpa-ft` を足す（E-S15） |
| T4 | 燃料消費率の定義・積む燃料の足し方 | perf.range・perf.fuel・navb.calc（太字） | perf.range（定義）・perf.fuel（足し方）→ navb.calc | 行なし。`C.fuel-flow` を足す（E-S16） |
| T5 | 気圧高度・高度計規正値の定義 | basics.alt（住所）・perf.da（言い換えの一覧） | basics.alt → perf.da（呼び戻しを頭に） | `C.pressure-altitude`（E-N9） |
| T6 | lb・kg・US gal・L の換算 | basics.units（住所）・wb.limits（表） | basics.units → wb.limits | 行なし（E-N10。小さいので行は任意） |

## 6. 事実確認役・初学者の読み手の報告との重なり

- **factcheck-perfwb**：M1・S1〜S7・N1〜N8 にすべて同意する。
  - M1（4 人と満タンの 58 lb）は must のまま。
  - S5（「着氷」→「気化器着氷」）は E-S1 と同じ段落なので一緒に直す。
  - S6（`perf.fuel` の手順の「昼 30 分・夜 45 分」に国がない）は〔安全〕K4 に近いという判断にも同意する。E-N8 の学校の予備の 1 文と同じ所。
  - S7（計算機が 2,550 lb を超える所で前の限界を延ばして ○ を出す）は、本文の「線を延ばさない」と逆なので、計算機の直しを先にしてほしい。
- **reader-perfwb**：
  - C1（「浮揚速度」が説明されていない）は E-S3 と同じ所。私の案は 2 つの速度を書き分けるもの。
  - C2（地上走行・タキシー・地上滑走の 3 つの名前）に同意する。`FL.terms` の正式名は「地上滑走（タキシー、taxi）」（JCAB の自家用の出題範囲が根拠）で、ground roll は「滑走距離」と区別させる語なので、本文の「地上走行」を「地上滑走」にそろえるのがよい（ランプ重量の説明・計算の手順・計算機の文も）。
  - C3（1 hPa が 3 つ）は E-S15 と同じ所。
  - T3（70% の目安をどの滑走路で使うか）は E-N3 と同じ所。
  - E1（`perf` の確認問題 3・4 が次の章の中身）は、DESIGN 6.2 の決まり 4（問は元の章に残す）による。問いの文に「（次の章で学ぶ内容）」と添えるのは決まりの中でできる。

## 7. よかった所（直すときに残してほしい所）

- 「50 ft を越える距離は滑走距離を含む」の図と、2 つを足した 2,980 ft を問う説明してみよう
- 「密度高度を気圧高度の目盛りに入れない」を `perf.da`・`perf.chart`・確認問題・説明してみようで押さえていること
- 往復の風で時間が打ち消し合わない例（63 ＋ 44 ＝ 108 分と無風 104 分）
- 「図の値に余裕は入っていない（unfactored）」「余裕は 1 回だけかける」「外へ延ばさない」の 3 つを、POH 5.3 で裏付けていること
- 燃料のアームと後ろの限界の比較で重心の動く向きを説明し、「降ろしたから前へ、と向きで覚えない」とまとめていること
- 計算ソフトの「範囲内」を人が照らす判断の目（機体記号・記録の版・単位・燃料）
- 実用類の条件を POH の札の言葉（後席と手荷物なし）で書いていること

## 8. 検査の結果

| 検査 | 結果 |
|---|---|
| `check-chapter.mjs perfwb-figs.js perfwb.js`（Chromium あり） | error 26・warn 20・pending 1・info 411（W16 の報告と同じ）。error はすべて style（体言止め 14・です・ます 12）で、W10b の部品の見出しを文と数える道具の数え方（W16 の報告 4）。warn：初出の形 7・概念 1（Vx の太字が `ops.short` と 2 回）・claims 12（台帳にまだない札）。pending 1 は `CALC.json` がない。chapters・form・data・volume・jurisdiction・chapter-refs・figures（15 枚・error 0）・questions・photos・jur・path・provenance・egov は 0 |
| FLIGHT LAB `npm run -s test:fast` | 86/86 pass |
| TEXTBOOK `npm test` | 33/34（2 回流して同じ）。落ちたのは `build: FLIGHT LAB sources are not copied into textbook/`：`textbook/rewrite/combined/drafts/radio.js` が `flight-lab/src/radio.js` と同じファイル名のため。W19-radio の下書きで、W19-radio の報告にも同じ記録がある。この報告とは関係がない |
| CADET `npm run -s test:fast` | 247/247 pass |
| 図（スクラッチ、390 px） | 15 枚を画像にして見た。内容の指摘は E-S1（`perfPlanChain`）・E-N3（`takeoffDistance`）。重なりは事実確認役の N4 のとおり |

## 9. 台帳の行

さわっていない（読み手の役目）。足してほしい行は 10 に書いた。

## 10. 未解決のこと・ほかの単位にお願いしたいこと（needs from others）

- **W16（書き手）か直し役**：上の E-S1〜E-S16 と E-N1〜E-N11。事実を足す所（E-S2・E-S4・E-S6・E-S7・E-S8・E-S9）の値は、2 に書いた一次資料の場所にある。E-S5 の数値は、住所が決まってから書き手が確かめる。
- **W13（`aero`）**：`aero.stab` の「重心が前すぎると…後ろすぎると…（POH 6.1）」を 1〜2 文と `bk.see('perf.wb', …)` に（E-S14）。`aero.power` の最良速度の表はそのまま住所に（E-S13）。参考：`aero.struct` の V<sub>O</sub> 98 KIAS（1,917 lb）は POH 2.3 と合う。MGA チェックリストは同じ重さを 89 KIAS と書いているので、チェックリストの値を使わないこと。
- **W15（`inst`）**：`inst.alt` の「1 hPa ≒ 約 28 ft」を、`R.pa-coefficient` の約 27.3 ft に合わせた 1 つの数にし、`perf.da` から呼び戻せる形に（E-S15）。
- **W18（`navb`）**：`navb.calc` の燃料消費率の太字の定義と、積む燃料の足し方を、統合役の決める住所に合わせる（E-S16）。
- **W04（`FL.terms`）**：
  - 浮揚速度（lift-off speed、V<sub>LOF</sub>）の JCAB の表記を確かめて足す（E-S3〔要確認〕）。
  - ステーション（station）、零燃料重量（zero fuel weight）、進入速度（approach speed）を足す（JCAB の出題範囲の語）。
  - W16 の報告 7 の語（有効搭載量・ランプ重量など）と一緒でよい。
- **W03・統合役（CONCEPTS）**：
  - 行を足す：`C.best-speeds`（住所 `aero.power`、呼び戻し `perf.range`）、`C.hpa-ft`（住所 `inst.alt`、呼び戻し `perf.da`）、`C.fuel-flow`（住所は統合役が決める。呼び戻し `navb.calc`・`perf.fuel`）。
  - `C.cg-performance` の `recalls` に `aero.stab`・`aero.stall` を足す。
- **W42（JCAB-MAP）**：
  - `cpl.1.1.2.3` に `topicMap` を付ける（要求上昇勾配の数値の住所、進入速度 → `perf.tol`、離陸時の速度 → `perf.tol`）。
  - `cpl.1.7.2.2` は、E-S6 が入るまで「満たさない」のまま。
- **W21（図）**：
  - PHAK 図 11-23 か 11-33 の描き直し（練習用。E-S10）。
  - E-S8 を入れるなら、上昇の図の模式図。
  - `perfPlanChain` の ⑤ に「ヒーター OFF」（E-S1）。
- **W23（問題）**：新しい中身（ローテーション速度と浮揚速度、はかりの読みからの重心、上昇の図、向かい風成分）の確認問題か説明してみようを後ろに足す。
- **W19-radio・統合役**：TEXTBOOK のテストの失敗（`drafts/radio.js` のファイル名が `flight-lab/src/radio.js` と同じ）。下書きの名前を変えるか、テストが `rewrite/combined/drafts/` を数えないようにする。
- **W27（R2 の確かめ）**：E-S1〜E-S16 が直ったあとの二人目の確認。特に E-S1〔安全〕と、E-S3 の語。
