# 直し役の報告：第 1 部 第 8 章 `perf`「性能」と第 9 章 `wb`「重量と重心」（revise-perfwb）

単位：章 `perf`・`wb` の直し役（R2・DESIGN 7.2 の W16 の直し。書いた W16・事実確認役・2 人の読み手とは別の役）。日付：2026-10-30。
直したもの：`textbook/rewrite/combined/drafts/perfwb.js`・`drafts/perfwb-figs.js`・`drafts/perfwb.claims.json`（この 3 つだけ）。
もとにした指摘：
- `reports/factcheck-perfwb.md`：must 1・should 7・nit 8
- `reports/reader-perfwb.md`：must 1・should 12・nit 45
- `reports/expert-perfwb.md`：must 0・should 16・nit 11

守った決まり：DESIGN 6.2 の 15 の決まり、3.2・3.3（第 1 部 第 8・9 章の行）・3.4、DECISIONS（判断 2・3・3 の補足・11）、STYLE、CLAUDE.md。`flight-lab/kiso/` は読んでもいない（変えていない）。git の操作はしていない。

**結論**
- must は 2 人分（同じ所 1 つ）を直した：4 人と満タンの例を「ランプはランプ、離陸は離陸」と比べて **50 lb 超え** に（factcheck M1・reader X1）。
- should は 35 件（重なりを除いて約 30 か所）のうち、持ち物の 3 ファイルで直せて、一次資料で確かめられたものを全部直した。直さなかった・一部だけにした 4 件は理由を 2.4 に書いた（E-S5 要求上昇勾配の数値、E-S10 実物の図の練習、E-S13 と E-S14 の相手の章の側）。
- nit も、手早く直せて事実を確かめられたものは直した（約 45 件）。直さなかった nit は 2.4。
- 〔安全〕に触れる文を直した：着陸復行でキャブレターヒーターを OFF（expert E-S1、AFH 第 9 章）、燃料の予備の数字に国（factcheck S6）。**安全レビュー（W27・W36）を通るまで、直し終えたことにしない**（STYLE）。
- 章の検査は、道具の数え方による error 29（部品の見出しを文と数える。W16 は 26、部品を 3 つ足したので 29）と、日米の囲みの中の語の初出 warn 7（W16 と同じ）だけが残った。主張の札は、抜き出された 310 文の全部に付いた（台帳の写しで claims warn 0）。
- 新しい事実は、全部を一次資料で読んで確かめた（2.5）。数字・規則で確かめられなかったものは書いていない。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `drafts/perfwb.js` | 12 節すべてと 2 つの章末を直した（2）。<br>頭の注に直しの要約を書いた。<br>`NEW_R` に 4 件を足した：`phak5`・`phak7`・`afh6`・`afh9`（`phak5`・`phak7`・`afh9` は W13 の `drafts/aero.js`・W14 の `drafts/sys.js` と同じ URL）。`phak11` の label に「横風の試験」を足した。<br>`refs`：`perf` に `NEW_R.phak7`・`afh6`・`afh9`・`R.pcg`、`wb` に `NEW_R.phak5`・`R.pcg`・`R.acsP`・`R.acsC` を足した。<br>定数 `LOF = 60`（POH 図 5-7 の 2,550 lb の浮揚速度）を足し、AIM の 70% と PHAK の風の 10% の計算に使った（教材モデルの `AR.rotate` はシミュレータの囲みだけ）。 |
| `drafts/perfwb-figs.js` | 図 `fuelPlan`・`wbEnvelope` を同じ名前で描き直して足した（book-figs.js の同じ名前を置き換える）。<br>`perfChartRead`・`takeoffDistance`・`perfPlanChain`・`wbLimits`・`wbLoadingGraph`・`rangeWind`・`densityAltitude` の字と線を直した。<br>計算機 `CALC.da`（hPa を 0.1 まで）・`CALC.wb`（2,550 lb を超えると重心の範囲を出さない）を直した。<br>頭の一覧に追記した（2.6）。 |
| `drafts/perfwb.claims.json` | 主張の札を作り直した（276 → 354 行。2.7）。 |
| `reports/revise-perfwb.md`（新） | この報告 |

ほかのファイルは変えていない（`flight-lab/kiso/`・台帳・`FL.terms`・`FL.jur`・製品のファイル・W16 の報告とパッチ）。説明してみようの番号は 1 つも動かしていない（W16 のパッチの「written:perf 問 N」「written:wb 問 N」がそのまま合う）。

製品のテストを流すと、出力の `flight-lab/outputs/FLIGHT-LAB.html` と `cadet/outputs/CADET.html` が作り直される。下書きは製品が読まないので、中身は変わらない。ほかの単位の下書き（`drafts/aero*`・`sys*`・`inst*` など）は、流す前から作業ツリーで変わっていた（その単位の作業）。私は触っていない。

## 2. したことと理由

### 2.1 事実確認（`factcheck-perfwb.md`）

| # | 指摘 | 扱い | 今の文（場所） |
|---|---|---|---|
| M1 | 4 人と満タンを「最大重量を 58 lb 超える」 | 直した | `perf.wbex`：「たとえば 170 lb の 4 人と満タン（48 gal・288 lb）では、ランプの重さは 2,608 lb です。最大ランプ重量 2,558 lb を 50 lb 超えます（離陸の 2,600 lb も、最大離陸重量 2,550 lb を 50 lb 超えます）。燃料を 10 gal（60 lb）減らすと、ランプ 2,548 lb・離陸 2,540 lb です。」コードは `four.w - W.ramp`・`four.w - W.taxiFuel - W.max`。章末の例 2 も「ランプ 2,608 lb で、最大ランプ重量 2,558 lb を 50 lb 超える（離陸 2,600 lb も 2,550 lb を超える）」に |
| S1 | 例 ③ が 8 lb を引いていない（2,310 と 2,302 の 2 つの答え） | 直した（例 ③ を 8 lb も引いた着陸にそろえた） | `perf.wbex` の新しい小見出し「着陸のときも確かめる」：「② の積み方で離陸します。始動・地上滑走の 8 lb を引くと、離陸は 2,422 lb・91.1 in です。燃料を 20 gal（120 lb）使って着陸すると、③ 2,302 lb・90.9 in です（図の ③）。」<br>`wb.shift`「燃料を使う」：「例 ② の離陸（8 lb を引いた 2,422 lb・220,747 lb-in）から 20 gal（120 lb）使うと、2,302 lb・209,347 lb-in で 90.9 in です（例 ③：着陸）。」<br>図 `wbEnvelope` を描き直して ③ を 2,302 lb・90.9 in に（キャプションに「① と ② はランプの重さ」）。説明してみよう 17（kiso05.q17）を「離陸の約 91.1 in から、着陸の約 90.9 in へ」、26（kiso05.q27）を 8 lb も引く形（2,262 lb・203,635 lb-in・約 90.0 in）に。`ARCHER_WB.example()` は変えていない（2.6） |
| S2 | 図 `wbLimits` の「満タンで 4 人は乗れません」が言いすぎ | 直した | キャプション：「…人・荷物・燃料に使える重さです。この例の機体では、170 lb の 4 人と満タンは同時に積めません」。札の出典を「この本の計算（968 ＞ 918）。POH 6.1 は 4 人・満タン・最大の手荷物を同時には積めないと書く」に |
| S3 | 共通の節の日本の事実 5 か所 | 直した（国を書かない文に） | `perf.da`：「規正値が hPa で知らされたときは、次の目安を使います。」（日本のことは下の `bk.jur('alt.unit')` が言う）。用語 Altimeter setting の補足：「inHg か hPa で知らされる」。`wb.limits`：「燃料の量が L で示されたときは、US gal に直してから lb にします。」（出典のない「日本で給油すると L で記録」を外した）。`wb` の例 3・確認問題 wb.2：「100 L 給油した」 |
| S4 | 後ろの限界の決め方が PHAK と違う | 直した | `perf.wb` のもっと深く：「後ろの限界は、主に安定を考えて決められています。設計では、1 回転のスピンから普通に回復できることも考えます（PHAK 第 5 章）。」 |
| S5 | 気化器着氷を「着氷（icing）」 | 直した | `perf.plan`：「だから POH は、気化器着氷（キャブレターアイス、carburetor icing）の兆しがない限り、進入ではヒーターを使わないとしています（POH 4.5m）。」（expert E-S1 と同じ段落なので一緒に直した） |
| S6〔安全〕 | 「予備を足す（昼 30 分・夜 45 分）」に国がない | 直した | `perf.fuel` の手順 ⑤：「予備を足す（米国の 14 CFR 91.151 では、昼 30 分・夜 45 分の分）」。図 `fuelPlan` のキャプションも「予備は米国の 14 CFR 91.151 の昼 30 分・夜 45 分です」 |
| S7 | 計算機 `wb` が 2,550 lb を超える所の前の限界を延ばして ○ | 直した | 離陸の重さが 2,550 lb を超えるときは「× 離陸の重心 91.9 in（—：重さが 2,550 lb を超えるので、重心の範囲がない）」（Chromium で確かめた：3） |
| N1 | 実用類の出典 2.15 | 直した | 「（POH 2.11・2.25・図 6-9）」 |
| N2 | 巡航上昇の理由「エンジンがよく冷え」 | 直した | 「前に速く進み、機首越しに前がよく見えるからです（POH 4.5j）。」 |
| N3 | 図 `perfPlanChain` の「＝ 2,479 ft」 | 直した | 「≒ 2,479 ft」 |
| N4 | 図 `wbLoadingGraph` の「燃料 95.0」に破線 | 直した | 札を線の終わりの右下へ（dy 20）。390 px の画像で、340 lb の破線と離れたことを確かめた |
| N5 | 計算機 `da` の hPa が整数 | 直した | `(Q × 33.8639).toFixed(1)`・step 0.1（29.92 → 1013.2） |
| N6 | 標準空虚重量の「作動油」 | 直した | 「使えない燃料・運用に要る液体（作動油など）・満タンのオイル」（本文とここを混同しないの表） |
| N7 | 巡航の表の条件 | 直した | 「気圧高度 4,000 ft・2,550 lb・ホイールパンツ付きの値…気温は、標準より 15℃ 低い日（ISA −15℃：この高さで約 −8℃）の行」（図 `rangeWind` のキャプションも） |
| N8 | W16 の報告の図 11-15 の説明 | 私の持ち物ではない | 統合役へ（6） |

### 2.2 初学者の読み（`reader-perfwb.md`）

| # | 指摘 | 扱い | 今の文（場所） |
|---|---|---|---|
| X1（must） | 58 lb | 直した | 2.1 の M1 |
| C1 | 浮揚速度が定義されない | 直した（expert E-S3 と一緒に） | `perf.tol` の新しい小見出し「離陸の 3 つの速度」：ローテーション速度（Vr、rotation speed）・浮揚速度（lift-off speed）・50 ft の速度を定義し、「Archer III の POH では、ふつうの離陸のローテーション速度は 60 KIAS、短距離離陸では 55 KIAS です（POH 4.5i）。離陸の図の表では、2,550 lb で浮揚速度 60 KIAS・50 ft で 65 KIAS です（POH 図 5-7）。」 |
| C2 | taxi に 3 つの名前 | 直した | 2 章とも初出を「地上滑走（タキシー、taxi）」（`perf.chart`・`wb.limits`）、あとは「地上滑走」。計算機の行「始動・地上滑走の燃料」、確認問題 perf.4・wb.0、説明してみよう 7・25・26、図 `fuelPlan` の凡例。図 `wbLimits` は「地上で使う燃料」 |
| C3 | 1 hPa が 27・30・28 ft | 直した（この章の数は 27 ft の 1 つ） | `perf.da`：「標準大気では、海面の近くで 1 hPa の差が約 27 ft の高さにあたります。この本の hPa の式では、この 27 ft を使います。inHg の目安の『1 inHg で 1,000 ft』は丸めた数です。1 inHg は約 33.9 hPa なので、1 hPa あたりに直すと約 30 ft で、少し大きめです。気圧の下がり方は高さで変わるので、1 つの係数を使う式は、どれも概算です。」（revise-inst の `inst.alt` は「海面から 1,000 ft の平均で約 28 ft、海面そのものでは約 27 ft」で、食い違わない） |
| C4 | ランプが説明されない | 直した | `wb.limits`：「ランプ（ramp）は、駐機場（エプロン、apron）のことです（P/CG）。ランプの重さは、駐機場で人・荷物・燃料を全部積んだ、エンジンをかける前の重さです。」`perf.chart`：「離陸なら、エンジンをかける前の重さ（ランプの重さ）から、始動と地上滑走（タキシー、taxi）の燃料を引いた重さです。」 |
| T3 | 70% の目安をどの滑走路で使うか | 直した | `perf.tol`「離陸をやめる目安」を 3 段に：「どの滑走路でも、離陸の前に『ここまでに浮いていなければやめる』点を決めておきます（AFH 第 6 章）。」→ AIM 7-6-8 は「舗装していない空港（unimproved airports）のための目安」→ 主語のねじれた文を 2 文に（「小型機の速度計は、低い速度では正確ではありません。路面が一様でないときも、この目安は当てはまりません」）。ここが大切：「離陸の前に、『ここまでに浮かなければやめる』点を決める」。図のキャプションに「舗装していない空港のために示す目安を、説明のために重ねた」 |
| CH1 | 基準の線と案内線が図で分からない | 直した | 図 `perfChartRead`：基準の線を太い紫の縦線に、凡例 2 行（「基準の線：区画の左の縁の縦の線」「案内線：斜めの点線。あいだは近い線と平行に進む」）。本文：「2 つめと 3 つめの区画の左の縁の縦の線を基準の線（reference line）、区画の中の斜めの線を案内線（guide line）とよびます。」「点が案内線と案内線のあいだにあるときは、まわりの線と平行に進みます（PHAK 第 11 章）。」箇条も「案内線と平行に」 |
| CH2 | 公示距離の段落の知らない語 | 直した（語を開いた。小さな図は足していない：2.4） | 「米国の 14 CFR Part 139 の認可を受けた空港は、旅客を運ぶ航空会社の便が使う空港です。」「公示距離は、離陸と着陸に使えると決めた長さです。米国では、空港の情報をまとめた FAA の冊子 Chart Supplement に載ります。」TODA に「クリアウェイ（clearway）は、滑走路の先の、障害物の高さを制限した区域です」、「進入端が滑走路の奥へずらしてある（displaced threshold）とき」、「この本の LAB 空港の計算では、滑走路の長さを使います。」 |
| R1 | ISA −15℃ | 直した | 2.1 の N7 |
| P1 | 着氷 | 直した | 2.1 の S5 |
| E1 | perf の確認問題 3・4 が次の章 | 直した | 問の頭に「（次の章で学ぶ重量と重心の問題）」（問の場所と順は変えていない：決まり 4） |
| X2 | ③ が直し方の中・答えが 2 つ | 直した | 2.1 の S1（③ を「着陸のときも確かめる」へ出した） |
| WE1 | kg·m と N·m の答えが本文にない | 直した | `perf.wb`「計算に使う言葉」：モーメントの定義に「物を回そうとする働き」（FAA-H-8083-1B）を足し、「力学では、力のモーメントは『力 × 距離』で、単位は N·m です。重心は、モーメントの合計を重さの合計で割った比で決まります。重力の分は分子と分母で消えるので、lb-in でも kg·m でも、同じ位置が出ます。」 |
| nit で直したもの | | 直した | C5（浮揚速度を KIAS に）・C6（「最大重量」を最大離陸重量／最大ランプ重量に）・C7（用語の表の英語を本文と同じに：Fuel consumption rate (fuel flow)・Safety margin (planning margin)・1013.25 hPa）・C10（「上の計算機」）・C11（2,315 lb は「この教材のシミュレータの機体」）・DA1（規正値 29.92 の条件）・DA2（気圧高度がマイナスになる理由）・DA3（FAA の密度高度の手引き）・DA4（図の形へのリンクと密度高度の役目）・DA5（図の 15℃ を約 70 ft）・DA7（1016.3）・T1（重さで離陸が延びる 3 つの理由：PHAK 第 11 章）・T2（図の曲線で −8% を読む）・T4（図の中間点に距離）・T5（フロート）・CH3（真ん中でない補間の例 1,150 ft）・CH4（上空の風が巡航と航続に）・CH5（括弧の中の括弧をなくした）・CH6（思い出そうを aero.stall へ）・CH7（「表や図の範囲の外の値を、延ばして作りません」）・CL1（tan⁻¹）・R3（2.53 時間（約 2.5 時間））・R4（遠くへ行ける速さのほうが速い）・F1（計画には POH の値）・P2（3 つの図の例をつないだ練習）・E2（概算の理由）・E3（判断の目「POH がその機体のもので、今の版か」）・W2（操縦輪の軽さ）・W3（初出の形を 1 回に）・W4（「ここに注意：」）・W5（前の限界の求め方へのリンク）・L1（空虚重量の一言）・L2（実用類の前の限界の文）・L3（S2）・G1（搭載グラフで省けるもの）・S1（221,507 の出し方）・S2（93.79 − 93.0）・WE2（横のアームの＋と−） |

### 2.3 専門家の読み（`expert-perfwb.md`）

| # | 指摘 | 扱い | 今の文（場所） |
|---|---|---|---|
| E-S1〔安全〕 | 着陸復行の手順にヒーター OFF がない | 直した | `perf.plan`：「キャブレターヒーター（キャブレターヒート、carburetor heat）を入れていたら、全開にするときに OFF にして、最大の出力を出します（AFH 第 9 章）。」「ヒーターを入れたままの全開は、デトネーション（detonation：シリンダーの中の異常な燃焼）の原因にもなります（POH 4.5m）。」ここが大切に「キャブレターヒーターを入れていたら、着陸復行の全開で OFF にする」。図 `perfPlanChain` の ⑤「全開・ヒーター OFF」。`sys.carb` への `bk.see`（revise-sys の依頼 4 と同じ）。第 2 部の `ops.goaround` も AFH の Power で「キャブレターヒートは OFF」と書いていて食い違わない |
| E-S2 | 密度高度の高い日の離陸前のリーン | 直した | `perf.da`「何が落ちるのか」：「空気が薄いと、燃料に対して空気が足りず、混合気が濃くなりすぎます。気化器（キャブレター、carburetor）の混合比（ミクスチャー、mixture）を濃いままにすると、出力がさらに落ちます（PHAK 第 7 章）。Archer の公開チェックリスト（checklist）には、密度高度が高い日の離陸前の手順があります。ブレーキを踏んだまま全開にし、混合比を最良出力（best power）に合わせて、そのまま離陸します。エンジンが熱くなりすぎたら、温度が戻るまで混合比を濃くします。」＋ `bk.see('sys.engine')`、判断の目に 1 項目 |
| E-S3 | 浮揚速度をローテーション速度にも使う | 直した | 2.2 の C1。シミュレータの囲みは「フラップ 0・ローテーション 60 kt」「チェックリストの短距離離陸は、フラップ 25°・ローテーション 55 KIAS」。PHAK・AIM の規則（風の 10%・中間点の 70%）は浮揚速度のまま、値は POH 図 5-7 の 60 KIAS（`LOF`）。用語に「Rotation speed (Vr) / Lift-off speed」 |
| E-S4 | 進入速度 | 直した | `perf.tol` の新しい小見出し「進入速度と着陸の距離」：「進入速度（approach speed）は、POH とチェックリストの値を使います。Archer の公開チェックリストでは、最終進入で 70 KIAS、短距離と不整地の着陸で 65 KIAS です。メーカーの値がないときは、着陸の形（フラップを下げた形）の失速速度（stall speed）、VS0 の 1.3 倍を使います（AFH 第 9 章）。突風のときに足すのは、突風の分（平均の風速との差）の半分までです（AFH 第 9 章）。」続けて 10% → 21% の段落。用語に Approach speed |
| E-S5 | 要求上昇勾配の数値 | 直していない | 2.4 |
| E-S6 | はかりの読みから重心 | 直した | `wb.limits`：量り方の段落に「量るときは、使えない燃料とオイルを入れ、追加の装備も付けておくので、量った重さが基本空虚重量になります（POH 6.3）」、式（A ＝ 31.0 in・B ＝ 109.7 in、重心 ＝（N × A ＋（R ＋ L）× B）÷ T）と計算演習（仮の読み 478・589・588 lb、風袋 5 lb → 1,640 lb・87.0 in） |
| E-S7 | ステーション | 直した | `perf.wb`「計算に使う言葉」：「ステーション（station）：機体の中の位置を、基準線からの距離で表した番号です。基準線はステーション 0 で、ステーション 80.5 にある物のアームは 80.5 in です（FAA の重量重心のハンドブック）。」用語に Station (STA) |
| E-S8 | 上昇の燃料を 2 gal と決め打ち | 直した | `perf.fuel` の手順を 6 段に（① 上昇の時間・燃料・距離を POH 図 5-17 で読む（始動・地上滑走・離陸を含む）② 巡航の距離 ＝ 全体 − 上昇の距離（降下の図 5-31 もある）③〜⑥）。図 5-17 の例（2,000 ft・23℃ → 6,000 ft・15℃、9 分・2 gal・12 NM）と注、「上昇の燃料に、始動と地上滑走の分をもう一度足しません」。例を「上昇 2 gal ＋ 巡航（120 − 12）NM ÷ 105 kt × 9.5 gph ＋ 予備 ≒ 約 16.5 gal」に直し、図 `fuelPlan` を描き直した（昼 16.5・夜 18.9 gal）。ここが大切「上昇（POH の図）＋ 巡航（時間 × 燃料流量）＋ 予備」 |
| E-S9 | 向かい風成分と横風 | 直した | `perf.tol`：「図の風の区画に入れるのは、滑走路に沿った向かい風成分（追い風なら追い風成分）です。報じられた風速を、そのまま入れません。横風（crosswind）のときは、滑走路に直角な横風成分（crosswind component）を、POH の最大実証横風成分と比べます（PHAK 第 11 章）。Archer の公開チェックリストでは 17 kt です。」成分の求め方は `navb.wind` がまだ本にないので、本にある第 2 部の `ops.xwind` へ予告（決まり 13）。判断の目にも 1 項目 |
| E-S10 | 実物の図を読む練習 | 直していない | 2.4 |
| E-S11 | 思い出そうに「次の章で学びます」 | 直した | `perf.chart`：思い出そうを「重心位置（重心、center of gravity）が前にあるほど、尾翼の下向きの力が増え、失速速度が上がりました。」＋リンク `aero.stall`（とその住所 `perf.wb`「重量と重心（次の章）」）。本文にも「重心の位置も性能を変えます（→ 重量と重心）」 |
| E-S12 | 「重すぎると、失速しやすくなります」 | 直した | `perf.wb`：「重すぎると、失速（stall）する速さである失速速度（stall speed）が上がります。同じ速度でも、大きな迎え角（迎角、angle of attack）が要るからです。」 |
| E-S13 | 最大航続・最大滞空を二度教える | 一部（2.4） | `perf.range` に思い出そう（揚抗比が最大は全体の抗力が最小の速度 → 本にある `aero.drag`）を足した。2 文はそのまま |
| E-S14 | 重心の影響と尾翼の力を二度教える | 一部（この章の側だけ） | `perf.wb` のもっと深くの頭を「重心が主翼の揚力（lift）の中心より前にあり、水平尾翼の下向きの力（Ft）で釣り合わせることは、安定の節で学びました（下の『思い出そう』）。ここでは、それが性能をどう変えるかを見ます」にし、思い出そう（→ `aero.stab`）を足した。性能への影響と後ろの限界の話を残した。`aero.stab` の側は W13 へ（6） |
| E-S15 | 1 hPa が何 ft か | 直した（この章の側） | 2.2 の C3 |
| E-S16 | 燃料消費率の定義と積む燃料の手順を二度教える | この章の側を住所の案に | `perf.range` を太字の定義に：「<b>燃料消費率（燃料流量、fuel consumption rate）</b>は、1 時間に使う燃料の量です。」積む燃料の手順は `perf.fuel`。`navb.calc` の側は W18 と統合役へ（6） |
| E-N1〜N11 | | 直した（N9・N10 を除く） | N1「残り距離標識…がある空港もあります（AIM 2-3-13：may be installed）」・N2「この 1.3 は、進入速度の『VS0 の 1.3 倍』とは関係のない数です」・N3（図のキャプション）・N4「操縦輪で押さえ続けると…Archer のトリム（trim）は、スタビレーター（stabilator）と方向舵（ラダー、rudder）の 2 つだけです（POH 4.5h）。補助翼（エルロン、aileron）には、トリムがありません」・N5「スピンは、普通類でも実用類でも禁止です（POH 2.15・2.25 の札）。実地試験の急旋回（米国の自家用で約 45°・事業用で約 50°：ACS）は、バンク 60° を超えない運動です」・N6「零燃料重量（zero fuel weight）…その最大を決めている機体もあります（FAA の重量重心のハンドブック）。Archer III の POH の重さの限界には、ありません」（`tsys.wb` はまだ本にないのでリンクなし）・N7（高い所ほど真対気速度が少し速い：POH 図 5-20、重さが減ると最適の速度と出力が下がる：PHAK 第 11 章）・N8「訓練校の規程が法令より多い予備を決めていれば、その量を積みます」（`adm.risk` はまだ本にないのでリンクなし）・N11（3 つの図の例をつないだ練習、POH の上昇の図は Vy の 1 枚だけ、近い障害物は Vx も考える） |

### 2.4 直さなかったもの・一部だけにしたもの（理由）

- **E-S5（要求上昇勾配の数値）**：専門家の案そのものが「W42 が住所を決め、書き手が一次資料で数値を確かめてから書く」。住所（`perf.climb` の発展か第 7 部か）は決まっておらず、耐空性審査要領の写しも読めていない。米国の 14 CFR Part 23 は今の版で上昇の数値を規則の本文に持たない形に変わっている（その確かめも含めて W42 の仕事）。確かめていない数字は書かない（DESIGN の〔要確認〕の決まり）。W42 と統合役へ（6）。
- **E-S10（実物の図を読む練習）**：PHAK 図 11-23・11-33 を線のとおりに描き直すのは図の単位（W21）の仕事で、専門家の案も W21 を名指ししている。線を推測で描くと、答えの数字が図と合わない危険がある。W21 へ（6）。PHAK 図 11-23 の例（22℃・2,000 ft・2,600 lb・向かい風 6 kt → 滑走 700 ft・50 ft 越え 1,400 ft）は PHAK の本文で確かめてあるので、図ができたら計算演習にできる。
- **E-S13（最大航続と最大滞空の重複）**：住所の `aero.power` は W13 の下書きにしかなく、今の本にない。決まり 13（リンクは行き先ができてから）のため、今の本にある `aero.drag`（揚抗比）へ思い出そうを付けるまでにした。`aero` の登録のあとで、統合役が `perf.range` の 2 文を `bk.recall('aero.power')` に替える（6）。
- **E-S14 の `aero.stab` の側**：W13 の持ち物（6）。
- **reader CH2 の「4 つの距離の小さな図」**：読み手の案の「あるとよい」の部分。語を開いたので本文だけで読める。図は W21 の目視と一緒に足すのがよい（6）。
- **nit で直さなかったもの**：
  - E-N9（思い出そうを「計算に使う言葉」の頭へ）：節の形の決まり（思い出そうは「ここに注意」・日米の囲みのあと：check-form の順）に反するので、置き場所は変えなかった。定義の項目は短い呼び戻しとして残した。
  - E-N10（単位の表を短く）：この節の例と説明してみよう（100 lb ＝ 45.4 kg、100 L ＝ 26.4 US gal）が表の値を使うので残した。思い出そう（→ `basics.units`）はある。
  - reader C8（説明してみようの数字が本文と同じ）：番号と `from` を動かさずに数字だけ変えると、W16 のパッチの由来の説明と食い違う。W23 の問の見直しで扱うのがよい。
  - reader C9（`aero.power` への思い出そう）：E-S13 と同じ理由。
  - reader W1（図 `wbStations` に主翼の前縁の印）：目盛りの 78.4 の近くに前席 80.5 の札と下の説明の文字があり、重ならずに置けない。本文に「主翼の前縁（まっすぐな部分と先細りの部分の境）の 78.4 in 前」がある。
  - reader R2（2 つの混合比の違い）・DA6・T6（日米の囲みの文：W06）・E4（出典の行）：一次資料の確認が要る・持ち物でない・PHAK 全体と章ごとの PDF は別の出典なので、そのまま。
  - reader C5 の図 `climbVxVy`・`windEffect`（book-figs.js の今の図）の「kt」：私の持ち物でない図。

### 2.5 確かめた一次資料（2026-10-30。新しい文はすべて札の行に引用を書いた）

一次資料は、自分のスクラッチ（`scratchpad/revperfwb/dl/`）に取り直した。POH・チェックリスト・AFH 第 9 章は、factcheck-perfwb が取った写しと sha256 が同じことを確かめた。図は PDF のページを画像にして読んだ。

| 資料 | 確かめた所 |
|---|---|
| Piper PA-28-181 Archer III POH VB-2266（andrews.edu の写し、R.archerPoh） | 4.5i（ふつうの離陸 Rotation 60 KIAS・短距離 55 KIAS）・4.5j（巡航上昇 87 KIAS の理由：better forward speed and increased visibility over the nose）・4.5m（carburetor icing の兆し・go-around で出力が足りない・ヒーターを入れた全開はデトネーション）・4.5a／4.5h（Stabilator and Rudder Trim）・図 5-7（2,550 lb の LIFTOFF 60・50FT 65）・図 5-15（76 KIAS）と第 5 章の図の目次（上昇は 5-15 と 5-17 だけ、降下は 5-31）・図 5-17（2,550 lb・全開・78 KIAS、2,000 ft・23℃ → 6,000 ft・15℃ で 9 分・2 gal・12 n.m.、「This chart includes fuel allowance for start, taxi, & takeoff」）・5.5(c)〜(e)・図 5-20（55%：海面 105・10,000 ft 107 KTAS、4,000 ft の ISA −15 は −8℃、ホイールパンツ付き・外すと −3 KTAS）・5.3（soft or grass runway と winds aloft は操縦士が評価・外挿の WARNING）・6.1・6.3（風袋を引く・使えない燃料 2.0 gal と満タンのオイルで量る・図 6-3 の A ＝ 31.0・B ＝ 109.7・式 C.G. Arm ＝ N(A) ＋ (R ＋ L)(B) ÷ T：ページの画像で読んだ）・1.19・2.11・2.13・2.15・2.25 の札（SPINS ARE PROHIBITED FOR NORMAL AND UTILITY CATEGORY・UTILITY CATEGORY OPERATION - NO BAGGAGE OR AFT PASSENGERS ALLOWED） |
| Archer III w/ G1000 Pilot's Checklist（MGA 2025、R.archerCk） | Normal Rotation 60・SHORT FIELD Rotate 55・MAX DEMONSTRATED CROSSWIND 17 KTS・HIGH DENSITY ALTITUDE ENGINE LEANING FOR TAKEOFF（ブレーキ・全開・LEAN FOR BEST POWER・過熱したら濃く）・BEFORE LANDING の Carburetor Heat AS REQUIRED・LANDING 70 KIAS ON FINAL (65 for Short/Soft Field)・BALKED LANDING（ヒーターの行はない） |
| FAA AFH FAA-H-8083-3C 第 6 章 | Rejected Takeoff（Prior to takeoff, the pilot should identify a point along the runway at which the airplane should be airborne…） |
| 同 第 9 章 | ふつうの進入（manufacturer's recommended airspeed or 1.3 VSO）・突風（one-half of the wind gust factors／no more than one-half the gust factor）・Go-Arounds の Power（Carburetor heat is turned off to obtain maximum power, as applicable） |
| FAA PHAK FAA-H-8083-25C 第 5 章 | Effect of Load Distribution（rearward CG limit … largely by considerations of stability・one-turn spin・Higher elevator control forces normally exist with a forward CG location・stalls at a higher speed with a forward CG） |
| 同 第 7 章 | Mixture Control（高くなると混合気が濃くなり、荒れと出力の低下・高い空港のランナップでも起きる） |
| 同 第 10 章 | Effects of Weight（Higher stalling speed）・lateral unbalance（trim / control pressure） |
| 同 第 11 章 | 重さの 3 つの影響（higher lift-off speed・greater mass・increased retarding force）・図 11-23 の読み方（reference line・following the surrounding lines、例 22℃・2,000 ft・2,600 lb・6 kt → 700 ft・1,400 ft）・Crosswind and Headwind Component Chart（0.2 VS0・maximum demonstrated crosswind component is published in the AFM/POH）・図 11-11（最大滞空は最小パワー、最大航続は L/DMAX）・重さが減ると optimum airspeed and power setting may decrease・高い所ほど TAS が大きい |
| FAA AIM 7-6-8・4-3-6・2-3-13（faa.gov の HTML） | 7-6-8（Unimproved Airports、70%、速度計・一様な路面・浮くまでだけ）・4-3-6（Part 139 の空港・Chart Supplement・公示がないとき・displaced threshold で LDA が短い・TODA の定義）・2-3-13（may be installed） |
| FAA Pilot/Controller Glossary（R.pcg） | RAMP（See APRON）・APRON・CLEARWAY・CHART SUPPLEMENT・DISPLACED THRESHOLD |
| 14 CFR 139.1（eCFR 2026-10-28） | 旅客の定期便（10 席以上）と不定期便（31 席以上）の航空会社の便が使う空港 |
| FAA-H-8083-1B Aircraft Weight and Balance Handbook（R.wb） | 用語集 Station・Structural station（station zero・station +50 は arm 50 in）・Moment・Ramp weight・Takeoff weight・Zero fuel weight・Maximum zero fuel weight、第 8 章の横のアーム（BL 0 の右が＋） |
| FAA-S-ACS-6C・7B | PA.V.A.S3（約 45°）・CA.V.A.S3（約 50°） |

### 2.6 図と計算機（`perfwb-figs.js`）

- 描き直して足した図 2 枚（同じ名前で book-figs.js を置き換える）：
  - `fuelPlan`：上昇（POH 図 5-17：2 gal・始動・地上滑走・離陸を含む）＋巡航（108 NM ÷ 105 kt × 9.5 gph ≒ 9.8 gal）＋予備（米国の 91.151 の昼 30 分・夜 45 分）。計 昼 16.5・夜 18.9 gal。
  - `wbEnvelope`：③ を 8 lb も引いた着陸（2,302 lb・90.9 in）に。最大の線の札を「最大離陸重量 2,550 lb」に。
- 字と線を直した図：`perfChartRead`（基準の線を太く、凡例 2 行。高さ 284 → 334）・`takeoffDistance`（中間点に「約 1,970 ft」、キャプション）・`perfPlanChain`（≒、⑤ ヒーター OFF）・`wbLimits`（キャプション、「地上で使う燃料」）・`wbLoadingGraph`（燃料の札）・`rangeWind`（キャプション）・`densityAltitude`（15℃ の行を 10 ft で丸めて「約 70 ft」）。
- `ARCHER_WB.example()` は変えていない。③（ランプ − 20 gal）を使う所は、この 2 章から全部なくなった（`wbEnvelope` は ① ② だけを読み、③ は自分で 8 lb と 120 lb を引く）。今の本の `perf.wbex` は登録で置き換わる。
- 計算機：`CALC.da` は hPa に切り替えると 0.1 hPa まで（29.92 → 1013.2）。`CALC.wb` は離陸の重さが 2,550 lb を超えると重心の行を「—」にして × を付ける。行の名前「始動・地上滑走の燃料」。
- 確かめ：章の検査の図（Chromium 390 px、15 枚）で error 0・warn 0（最小の文字 10.3 px）。新しい図と直した 9 枚を 390 px の PNG で目で見た（重なり・はみ出しなし）。計算機は Chromium で動かした：既定値「すべて範囲内（離陸 2,412 lb・89.9 in）」、例 ②「離陸 2,422 lb・91.1 in」（本文と同じ）、満タン＋手荷物 130 lb で「× ランプ 2,568・× 離陸 2,560・× 重心（—）」、`da` の hPa 切り替えで 1013.2（気圧高度 56 ft）と戻すと 29.92、ページのエラー 0。

### 2.7 主張の台帳（`drafts/perfwb.claims.json`）

- `check-chapter.mjs --claims-out` で抜き出し直した。抜き出された文は 276 → 310。
  - 文の変わらない行（226）：W16 の札と出典のまま。
  - 文が変わった行（53）：札を確かめ直し、出典を今の文に合わせ、`note` に前の ID と直した理由（指摘の番号）を書いた（`by: W16・revise-perfwb`）。factcheck が「直してから署名」とした行（149・169・195・202・221・229・230・231・263。factcheck の報告は「10 行」と書くが、挙げた番号は 9 つ）は、どれもこの形で新しい ID になった。
  - 新しい行（31）：`by: revise-perfwb`。
- `extracted: false` の行（44）：数字を含まないので道具が抜き出さないが、事実の主張である新しい文（AFH 第 6・9 章、PHAK 第 5・7・10・11 章、P/CG、FAA-H-8083-1B、POH 6.3・4.5h・2.15、チェックリストのリーンの手順など）に札と出典を付けた。どの行の文も、タグを外した下書きの文の中にあることを確かめた。
- 合計 354 行：参考値 329・条文 15・教材値 10、うち例題 140。`checkedBy` は全部 `null`（確かめ役が付ける）。作ったスクリプトはスクラッチの `revperfwb/build_claims.py`。

## 3. 検査の結果

| 検査 | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/perfwb-figs.js textbook/rewrite/combined/drafts/perfwb.js`（Chromium あり） | **error 29・warn 20・pending 1**。<br>・error 29：style が部品の見出し（答えと解き方 6・判断の目 9・ここを混同しない 4・思い出そう 10）を文と数えるもの（W14・W16 の報告と同じ道具の数え方。W16 の 26 から、計算演習 1・思い出そう 2 を足した分だけ増えた）<br>・warn：style の初出の形 7（日米の囲みの中の語：重心位置・METAR・機長・計器飛行方式・計器飛行・出発前の確認・航空情報。W16 と同じ）、concepts 1（Vx の太字が `ops.short` にもある：W28）、claims 12（今の `CLAIMS.json` にこの章の行がないため）<br>・pending 1：`CALC.json` がない<br>・chapters・form・data・volume・jurisdiction・chapter-refs・figures（15 枚）・questions・photos・jur・path・provenance・egov は 0<br>・本文 619 文・平均 34.5 字・最長 80 字・80 字超 0。留保は節の外 3・ここに注意の中 2（どの節も 1 回以内）。本文 30,411 字。後ろの部への `bk.see` は 3 本（どれも予告） |
| 同じ検査を、台帳の写しに `perfwb.claims.json` の 354 行を足して（`COMBINED_LEDGERS`、スクラッチの `revperfwb/ledgers-copy2/`） | claims：**310/310 に札・warn 0**。合計 **error 29・warn 8・pending 1**（style 29/7・concepts 1・calc pending 1。ほかは 0） |
| FLIGHT LAB：`cd flight-lab && npm run -s test:fast` | **86/86 pass** |
| CADET：`cd cadet && npm run -s test:fast` | **247/247 pass** |
| TEXTBOOK：`cd textbook && npm test` | **33/34 pass・1 fail**（2 回流して同じ）。落ちたのは `test/build.test.mjs:66`「FLIGHT LAB sources are not copied into textbook/」で、`rewrite/combined/drafts/radio.js` が `flight-lab/src/radio.js` と同じ名前のため（W19-radio の下書き。この単位と関係ない：6 の 15） |
| 構文 | `node --check` で `perfwb.js`・`perfwb-figs.js` とも ok |
| 決め打ちの文（DESIGN 6.2 の決まり 9・FLIGHT LAB の安全のテスト） | `perf.wb`・`perf.climb` に「POH」、`perf.fuel` に「91.151」と「最初の着陸予定地」が残っている（CADET の `content.test.mjs:34`・`jur.test.mjs:78`、FLIGHT LAB の `flight.test.mjs:463`） |

## 4. 台帳の行

台帳もパッチも書いていない（触った台帳の行はない）。下書きの主張の札は `drafts/perfwb.claims.json` にある。
- **CLAIMS**：W16 のパッチ `reports/W16.ledger.json` の CLAIMS 276 行は古い。章を登録するコミットでは、代わりに `drafts/perfwb.claims.json` の 354 行を `op: "add"` で入れてほしい（revise-sys・revise-aero と同じ方法）。
- **署名**：factcheck-perfwb は、W16 の 276 行のうち 266 行に署名してよいとした。そのうち文が変わらない 226 行はそのまま署名でき、文が変わった 53 行と新しい 75 行（`extracted: false` の 44 行を含む）は、まだ誰も確かめていない。
- **ERRATA**：`K.wb-perf.K1`・`K2`・`K3`・`K5`・`K7` の直した場所は今も正しい（K5 の Ft はもっと深くに残した）。`K.wb-perf.K4`〔安全〕：factcheck S6 を直したので、W16 の分（`perf.range` と `perf.fuel`）はより確かになった。kiso08・kiso12 の分が残るので開いたまま。
- **RULINGS**：`R.pa-coefficient`（27 ft を式の 1 つの数にした）・`R.pressure-altitude-term`・`R.fast-landing`・`R.fuel-cg-shift`・`R.planning-margin`（1.3 は練習の例、と進入速度の 1.3 VS0 と区別した）は、直した場所が正しいまま。
- **PROVENANCE**：説明してみようの番号と `from` は動かしていないので、W16 のパッチの行はそのまま合う。

## 5. 未解決のこと

1. **安全レビュー（W27・W36）がまだ**。〔安全〕に触れる文を直したので、レビューを通るまで直し終えたことにしない（STYLE）。対象：
   - `perf.plan`：着陸復行でキャブレターヒーターを OFF（AFH 第 9 章）、ヒーターを入れた全開とデトネーション（POH 4.5m）、ここが大切の 1 項目、図 `perfPlanChain` の ⑤
   - `perf.fuel`：予備の数字に国（米国の 14 CFR 91.151）、上昇の燃料の数え方（POH 図 5-17）
   - `perf.da`：密度高度の高い日の離陸前のリーン（チェックリストの手順。エンジンの扱い）
   - `perf.tol`：離陸をやめる点を先に決める（AFH 第 6 章）、AIM 7-6-8 の目安の範囲
2. **E-S5（要求上昇勾配の数値）と E-S10（実物の図の練習）**：2.4 のとおり、ほかの単位の仕事が先。
3. **浮揚速度の正式名**：「浮揚速度（lift-off speed）」は FL.terms にない語で、JCAB の表記を確かめていない（W04）。今の本（`emg.abort`・`ops.takeoff`）でも使っている語なので、そのまま使った。
4. **CADET での計算機の文**：CADET は計算機の箱を消すが、本文の「上の計算機は…」の文は残る（W16 のときからある形。`perf.fuel` に 1 文足した）。消える箱を指す文の扱いを、W10b・W26 と決めるとよい。
5. **注**：`ARCHER_WB.example()` の ③（ランプ − 20 gal、2,310 lb）は、今の本の `perf.wbex`（登録で置き換わる）だけが使っている。登録のあとで要らなくなれば、統合役が整理してよい。

## 6. ほかの単位にお願いしたいこと（needs from others）

1. **統合役（`perf`・`wb` の登録）**
   - `perfwb-figs.js` の図で `book-figs.js` を置き換える：W16 の 11 枚に加えて、今回描き直した `fuelPlan`・`wbEnvelope` も置き換える。`CALC.da`・`CALC.wb` を置き換え、`ARCHER_WB` に `ramp`・`taxiFuel`・`bagMax`・`fuelMaxGal`・`lbPerGal`・`utility` を足す（`example()`・`fwd()` は今のまま）。
   - `NEW_R` の 7 件を `book-core.js` の `R` に足す：`phak4`・`phak10`・`phak11`（W16）、`phak5`・`phak7`・`afh6`・`afh9`（今回）。`phak5`・`phak7`・`phak11`・`afh9` は W13 の `drafts/aero.js`・W14 の `drafts/sys.js` と同じ URL なので 1 つずつにまとめる（label はどちらかに合わせる）。外部リンクの数のテストの定数も直す。
   - CLAIMS は 4 のとおり `drafts/perfwb.claims.json` の 354 行で入れる。
   - `aero` を登録したら：`perf.range` の「いちばん長く飛べるのは…いちばん遠くへ行けるのは…」の 2 文を `bk.recall('最大滞空は必要パワーが最小の速さ、最大航続は揚抗比が最大の速さでした。', ['aero.power', …])` に替え、今の思い出そう（→ `aero.drag`）をそれに合わせる（expert E-S13）。
   - `inst` を登録したら：`perf.da` の「hPa で知らされたとき」に `bk.recall`（→ `inst.alt`）を足せる（expert E-S15）。
   - `adm` を登録したら：`perf.fuel` の「訓練校の規程が法令より多い予備を決めていれば…」に `bk.see('adm.risk', …)`（expert E-N8）。`tsys.wb` ができたら `wb.limits` の零燃料重量の文に予告（expert E-N6）。
   - DESIGN の付記で `perf.chart` の「PHAK 図 11-15 型」を直すときは、「図 11-15（表の形の Takeoff distance chart）ではなく図 11-23（組み合わせの図）」と書く（factcheck N8）。
2. **台帳 CONCEPTS.json の持ち主（統合役）**
   - `C.cg-performance` の `recalls` に `aero.stall`・`aero.stab` を足す（`perf.chart` の思い出そうは `aero.stall` と住所 `perf.wb` の 2 つのリンク、`perf.wb` に `aero.stab` への思い出そうを足した）。
   - 行を足す：`C.best-speeds`（住所 `aero.power`、呼び戻し `perf.range`）、`C.hpa-ft`（住所 `inst.alt`、呼び戻し `perf.da`）、`C.fuel-flow`（住所 `perf.range`：太字の定義を置いた。呼び戻し `navb.calc`・`perf.fuel`）。
3. **W13（`aero`）**：`aero.stab` の「重心が前すぎると…後ろすぎると…（POH 6.1）」を原理の 1〜2 文と `bk.see('perf.wb', …)` にする（expert E-S14）。「重量重心の計算（{ch:perf}）」は `{ch:wb}` か `bk.see('perf.wb')` に（W16 の依頼と同じ）。`aero.power` の最良速度の表はそのまま住所に。
4. **W18（`navb`）**：`navb.calc` の「<b>燃料消費率（燃料流量、fuel consumption rate）</b>」の太字を外して `perf.range` への思い出そうにし、積む燃料の足し方は `perf.fuel` を呼ぶ形に（expert E-S16。登録の順で concepts の definition-repeated になる）。
5. **W15（`inst`）**：`inst.alt` の「海面では約 27 ft、海面から 1,000 ft の平均で約 28 ft」は `perf.da` の 27 ft と食い違わない。`inst.gyro` などの「地上走行」を FL.terms の「地上滑走」に（reader-perfwb C2・reader-inst C10）。
6. **W04（`FL.terms`）**：JCAB の表記を確かめて足してほしい語：浮揚速度（lift-off speed、VLOF）〔要確認〕・ランプ（ramp）とランプの重さ（ramp weight）・進入速度（approach speed）・最大実証横風成分（maximum demonstrated crosswind component）・ステーション（station）・零燃料重量（zero fuel weight）・公示距離（declared distances）・クリアウェイ（clearway）・デトネーション（detonation）・基準の線／案内線（reference line / guide line：図の読み方の語）。W16 の報告 7 の語（有効搭載量・ペイロード・標準／基本空虚重量・普通類／実用類・補間・搭載グラフ・滞空時間／航続距離・上昇勾配・風袋）も。
7. **W21（図）**：
   - PHAK 図 11-23 か 11-33 を描き直し、`perf.chart` に「別の条件で読んでみる」計算演習を 1 つ（expert E-S10。Archer の値ではないと明記）。
   - `perf.chart` の公示距離（TORA・TODA・ASDA・LDA を滑走路に並べた小さな図。reader CH2 の「あるとよい」）。
   - 今回描き直した `fuelPlan`・`wbEnvelope` と、直した `perfChartRead` の目視の記録。
8. **W42（JCAB-MAP）**：`cpl.1.1.2.3` に `topicMap`（進入速度 → `perf.tol`、離陸時の速度 → `perf.tol`、要求上昇勾配の数値 → 住所を決めて、書き手が一次資料で確かめる）。`cpl.1.7.2.2`（重量・重心位置の測定）は `wb.limits` の式と計算演習で満たすようになった。
9. **W23（問題）**：新しい中身の確認問題か説明してみようを後ろに足す（ローテーション速度と浮揚速度、はかりの読みからの重心、上昇の図と燃料、向かい風成分、着陸復行のヒーター）。説明してみようの数字が本文と同じもの（reader C8：perf 17・19・21・23、wb 16）の見直し。
10. **W06（`FL.jur`）**：`alt.unit` の日本の欄の「群」「国内記事（RMK）」、`preflight` の「滑油」「出発させる」の言い方（reader DA6・T6。同じ囲みがほかの章にも出る）。
11. **W10b・W26**：計算機の箱の題と、390 px で `wb` の表が横に動くことの印（reader C10）。CADET で消える計算機を指す本文の文の扱い（5 の 4）。
12. **W01（道具の持ち主）**：`check-style.mjs` が W10b の部品の見出しを文と数える（この 2 章で error 29）、初出の形が日米の囲みの語を数える（warn 7）。W14 の報告 5.2 の直し方でよい。
13. **W27・W36（R2 の確かめ・安全）**：5 の 1 の安全レビューと、4 の署名（文が変わった 53 行と新しい 75 行）。
14. **W28（第 2 部）**：`ops.short` の Vx の太字を外す（定義の住所は `perf.climb`：W16 の依頼と同じ）。`ops.goaround` の「キャブレターヒート」を正式名「キャブレターヒーター」に（revise-sys の依頼と同じ。手順の中身は今回の `perf.plan` と合っている）。
15. **W19-radio・統合役**：TEXTBOOK のテスト `build.test.mjs:66` の失敗（`drafts/radio.js` のファイル名が `flight-lab/src/radio.js` と同じ）は、この単位と関係ないが、3 の結果に出る。
