# factcheck-perfwb の報告：第 1 部 第 8 章 `perf`「性能」と新しい第 9 章 `wb`「重量と重心」（W16 の下書き）の事実確認（R2）

単位：factcheck-perfwb（R2・W16 の事実確認役。下書きを書いた人とは別）。確かめた日：2026-10-30。

対象：`textbook/rewrite/combined/drafts/perfwb.js`・`perfwb-figs.js`・`perfwb.claims.json`。W16 の報告 `reports/W16.md` とパッチ `reports/W16.ledger.json` も読んだ。

確かめたこと：
- 主張の全部（`perfwb.claims.json` の 276 行と、数字のない札なしの文）を一次資料と照らした。
- 計算の全部を計算し直した（本文・計算演習・考えてみよう・例・章末の問・説明してみよう 51 問の答え・計算機 2 つ）。
- 図 15 枚（新しい 8 枚・描き直し 3 枚・今のまま 4 枚）をコードで確かめ、新しい図と描き直しの 11 枚は Chromium の 390 px で描いて目で見た。
- 日米の書き分け（DESIGN 3.4・6.2 の決まり 6・9・10、STYLE「日米の書き分け」）を確かめた。
- 基礎教材（kiso05・kiso06）を書き直しているか（写していないか）を、文字の一致で確かめた。

**結論**：must 1・should 7・nit 8。
- **一次資料の数値の誤りは見つからなかった**。POH・PHAK・AIM・14 CFR・FAA-P-8740-2・NIST の値は全部合う（POH の図は PDF のページを画像にして読んだ）。
- must 1：`perf.wbex` の「4 人と満タン」の例で、ランプの重さ 2,608 lb を最大離陸重量 2,550 lb と比べて「58 lb 超える」と書いている。この章の決まり（ランプ − 8 lb ＝ 離陸）では 50 lb で、同じ章の `wb.limits`（968 − 918 ＝ 50 lb）とも食い違う。
- should 7 の中身：
  - 例 ③ の着陸の重さが 8 lb（始動・地上走行の燃料）を引いていない（説明してみよう 25 の 2,302 lb と食い違う）
  - 図 `wbLimits` の「満タンで 4 人は乗れません」が言いすぎ（POH 6.1 は「最大の手荷物も」、POH 図 6-9 の計算例は 4 人と満タンでちょうど 2,558 lb）
  - 第 1 部の共通の節に日本の事実を書いた所が 5 つ（STYLE の決まり。うち 1 つは出典なし）
  - もっと深くの「後ろの限界の決め方」が PHAK の書き方と違う
  - 気化器着氷を「着氷（icing）」と書いている（FL.terms は別の語）
  - `perf.fuel` の手順の「昼 30 分・夜 45 分」に国がない（〔安全〕K4 に近い）
  - 計算機 `wb` が 2,550 lb を超える所の前の限界を延ばして作り、重心に ○ を出す

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck-perfwb.md`（新） | この報告 |

ほかのファイルは変えていない（下書き・台帳・製品のファイル・`flight-lab/kiso/` のどれも）。台帳のパッチも作っていない（署名は W27 の仕事。下の 8）。git の操作はしていない。
作業ツリーで流す前から変わっていたファイル（ほかの単位の作業）：`flight-lab/outputs/FLIGHT-LAB.html`・`cadet/outputs/CADET.html`、未追跡の `reports/factcheck-inst.md`・`factcheck-sys.md`。私は触っていない。

## 2. 確かめ方と一次資料（2026-10-30 に自分で取り直して読んだ。W16 の写しは使っていない）

一次資料は、新しい空のスクラッチのフォルダに取り直した。PDF は `pdftotext -layout` で読み、図は `pdftoppm` でページを画像にして読んだ。

| 資料 | 取った所 | 照らした所 |
|---|---|---|
| Piper PA-28-181 Archer III POH VB-2266（2013。R.archerPoh の andrews.edu の写し、292 ページ） | https://www.andrews.edu/cp/aviation/resources/archeriii-poh.pdf | 1.11（2558/2138・2550/2130・2550/2130・200/0）・1.15（24 cu ft）・1.19（標準空虚重量＝unusable fuel・full operating fluids・full oil、基本空虚重量＝＋optional equipment、Payload、Useful Load＝takeoff or ramp − basic empty、Maximum Ramp＝start・taxi・run up fuel を含む）・2.11・2.13（2,550 lb 88.6〜93.0、2,050 lb 以下 82.0〜93.0、実用類 2,130 lb 83.0〜93.0、straight line、datum は主翼前縁の straight と tapered の境の 78.4 in 前）・2.15（実用類はバンク 60° を超える steep turns・lazy eights・chandelles）・2.21（50・2・48 US gal）・2.25（手荷物室の扉の内側か後ろの隔壁の札「BAGGAGE MAXIMUM 200 LBS.」「UTILITY CATEGORY OPERATION - NO BAGGAGE OR AFT PASSENGERS ALLOWED」）・4.5a（FUEL QTY … CHECK QUANTITY & IMBALANCE）・4.5i の短距離離陸（Short Field, Obstacle Clearance：フラップ 25°・Rotation 55 KIAS・障害物 60・64・76）・4.5j（76・64・87、理由は better forward speed and increased visibility over the nose）・4.5m（66 KIAS・FULL RICH・carburetor icing の兆しがなければヒーターを使わない、go-around で出力が足りない）・5.3（flight test data、unfactored・pilot proficiency と mechanical deterioration、soft or grass runway と winds aloft は pilot が評価、improper leaning、follow the chart procedures、外挿の WARNING）・5.5（Info pending first revision）・図 5-7（条件：全開・A/C OFF・paved level dry・Flaps UP、速度表 2,550 lb 60/65・2,450 59/64・2,350 57/63・2,250 56/61、例 2,000 ft・23℃・2,400 lb・8 kt → 1,907 ft）・図 5-11（同じ例 → 1,073 ft）・図 5-15（2,550 lb・全開・76 KIAS・Flaps UP・A/C OFF、例 4,000 ft・19℃ → 487 fpm、Service 14,085 ft・Absolute 16,400 ft）・図 5-20・5-20a・5-20b（4,000 ft ISA −15（−8℃）：106・115・123 KTAS、8.2 Best Economy・9.5 Best Economy・11.0 Best Power、2,550 lb・wheel pants、外すと −3 KTAS）・図 5-27（48 gal・2,550 lb・climb and descent を含む、6,000 ft・65% Best Economy → 547 n.m.、wheel pants を外すと −3%）・図 5-35（Power Off・40°・66 KIAS・Full Stall Touchdown・Maximum Braking・Paved Level Dry、例 2,500 ft・21℃・2,240 lb・5 kt → 1,290 ft）・6.1（4 人・満タン・最大の手荷物を同時に積めない、前すぎ・後ろすぎ、記録と改修）・6.3（量り方・水平・tare）・6.5・6.7（手順 a〜e）・図 6-5（1,670.2 lb、Ramp − Basic Empty ＝ Useful Load）・図 6-9（1,590.0 lb・87.5 in、340/80.5・340/118.1・288/95.0・142.8、−8 lb at 95.0、Ramp 2,558・Takeoff 2,550・91.5 in、実用類は後席と手荷物なし）・図 6-11・6-13（Loading Graph：縦 0〜450 lb、横 Moment/1000 0〜50）・6-15・7.27（後席の後ろ・200 lb・tie-down straps … at all times） |
| Archer III w/ G1000 Pilot's Checklist（MGA 2025。R.archerCk） | https://www.mga.edu/aviation/knight-flight/aircraft-information-procedures/docs/Archer_Checklist.pdf | Vr 60・Vx 64・Vy 76・En Route Climb 87、SHORT FIELD TAKEOFF 25° FLAPS・Rotate 55、BALKED LANDING, GO-AROUND（Mixture VERIFY FULL RICH・Throttle FULL・Flaps RETRACT TO 25°・64 KIAS・76 KIAS AFTER OBSTACLE CLEARED・Flaps SLOWLY RETRACT） |
| FAA PHAK FAA-H-8083-25C 第 4 章 | faa.gov …/phak/06_phak_ch4.pdf（NEW_R.phak4 と同じ URL） | ISA 15℃・29.92 inHg・1,013.2 mb、2℃/1,000 ft、約 1 inHg/1,000 ft（10,000 ft まで）、気圧高度＝29.92 に合わせた表示、水蒸気は軽い |
| 同 第 5 章 | …/07_phak_ch5.pdf | 尾翼の下向きの力、前の重心ほど失速速度が高い・後ろの重心ほど巡航が速い・安定が弱い、「The rearward CG limit … is determined largely by considerations of stability」、1 回転のスピンからの回復と 1 in の話、失速の回復は重心が後ろほど難しい |
| 同 第 10 章 | …/12_phak_ch10.pdf（NEW_R.phak10） | 重すぎの影響の列、6 lb/gal、左右の差とトリム（out-of-streamline・drag）、後ろすぎで stall・spin の回復が難しい、移す式（Weight shifted ÷ Total weight ＝ ΔCG ÷ Distance）、小型機のタンクは重心の近く |
| 同 第 11 章 | …/13_phak_ch11.pdf（NEW_R.phak11） | 余剰推力と余剰パワー、速度は絶対上昇限度で一致・実用上昇限度 100 fpm、最大の滞空＝最小のパワー、最大の航続＝L/Dmax、向かい風・追い風の決まりはない、路面と傾き（ぬかるみで着陸距離が短くなることも）、重量 +10% → 離陸 ≥21%・着陸 +10%、風 10% → −19%・+21%、着陸の速さ 10% → ≥21%、着陸距離は 1,000 ft ごとに約 3.5%、図表は新しい機体・average piloting skills、組み合わせの図（最初の小さな誤差が最後に大きくなる）、補間と conservative に丸める、図 11-21（Flaps 10°・全開・paved level・zero wind・2,400 lb の表と 1,173 ft の例）、図 11-23（Takeoff distance graph） |
| FAA-P-8740-2 Density Altitude（R.dalt） | faasafety.gov の PDF | 湿度は engine power、10% を足し上昇率が下がる、涼しい時間、Rule-of-Thumb Chart、long grass … can easily double |
| FAA AIM 4-3-6・7-6-8・2-3-13（現行の HTML） | faa.gov atpubs aim_html chap4_section_3・chap7_section_6・chap2_section_3 | Part 139 の空港は declared distances を報告し Chart Supplement に載る・公示がなければ実際の長さ（移設した進入端は LDA を短く）・TORA/TODA/ASDA/LDA の定義、Unimproved Airports の half-way signs と 70%（速度計・一様な路面・障害物・上り坂・追い風の注意）、残り距離標識（黒地に白・1,000 ft 単位） |
| 14 CFR 91.103・91.151（eCFR の版 2026-10-28） | ecfr.gov API | 91.103(b)、91.151(a)(1)(2) |
| NIST SP 811 付録 B.9 | nist.gov | 1 lb＝0.4535924 kg、1 in＝2.54 cm、imperial gal＝4.54609 L、inHg＝3,386.389 Pa（US gal 3.785412 L は SI の定義の値） |

## 3. 問題（重い順。場所・何が違うか・直し方・根拠）

### must

**M1　`perf.wbex`「直し方」の最後：「170 lb の 4 人と満タン … 2,608 lb になり、最大重量を 58 lb 超えます」**（主張の札 行 230 `perf.wbex#85faf97f`）
- 違い：2,608 lb は、表の合計（ランプの重さ）。この章は「最大ランプ重量 2,558 lb」と「ランプ − 8 lb ＝ 離陸」を教えている（`wb.limits`・この節の手順 ②③、POH 図 6-9）。その決まりでは、ランプ 2,608 は最大ランプ 2,558 を **50 lb**、離陸 2,600 は最大離陸 2,550 を **50 lb** 超える。58 lb は、ランプの重さを最大離陸重量と比べた数。同じ章の `wb.limits` と図 `wbLimits` の「968 lb ＞ 918 lb」（差 50 lb）とも食い違う。章の手順で解いた訓練生は 50 lb になる。
- 直し方（案）：コードの `four.w - W.max` を `four.w - W.ramp` にして、文を「ランプの重さは 2,608 lb で、最大ランプ重量 2,558 lb を 50 lb 超えます（離陸の 2,600 lb も最大離陸重量 2,550 lb を 50 lb 超えます）。燃料を 10 gal（60 lb）減らすと、ランプは 2,548 lb、離陸は 2,540 lb です。」にする。主張の札の行 230・231 も合わせる。
- 根拠：POH 1.11・2.11・図 6-9。計算：1,640 ＋ 340 ＋ 340 ＋ 288 ＝ 2,608、2,608 − 2,558 ＝ 50、2,600 − 2,550 ＝ 50。

### should

**S1　例 ③ の「燃料を 20 gal 使った着陸」が、始動・地上走行の 8 lb を引いていない**（行 221・229・263、図 `wbEnvelope` のキャプション、`wb.shift`「燃料を使う」）
- 違い：例 ③ は 2,310 lb・91.0 in（ランプの 2,430 lb から 120 lb を引いた値）。同じ章の手順は「ランプ → −8 lb → 離陸 → 燃料を使って着陸」で、説明してみよう 25（kiso05.q26）は同じ積み方の着陸を **2,302 lb・209,347 lb-in・約 90.9 in** と正しく出している。同じ「例 ② で 20 gal 使った着陸」の答えが 2 つある。
- 直し方（案）：`ARCHER_WB.example()`（今の本と図も使う）は変えずに、文で区別する。`perf.wbex` の ③ を「③ 燃料を 20 gal 使う：2,310 lb・91.0 in（ランプの値から引いた数。始動・地上走行の 8 lb も引いた着陸の重さは 2,302 lb・90.9 in）」とし、`wb.shift` の「例 ② で 20 gal（120 lb）使うと、2,310 lb …」も「ランプの値から 20 gal を引くと」とする。図 `wbEnvelope` のキャプションの「着陸時」は「燃料を 20 gal 使ったあと」に。example() を直すなら、③ を `load(...)` から 8 lb（95.0 in）も引く形にし、図・説明してみよう 16（91.2 → 91.0 in）を一緒に直す（統合役の判断）。
- 根拠：POH 図 6-9（−8 lb at 95.0）。計算：(221,507 − 760 − 11,400) ÷ (2,430 − 8 − 120) ＝ 209,347 ÷ 2,302 ≒ 90.94。

**S2　図 `wbLimits` のキャプション「満タンで 4 人は乗れません」が言いすぎ**（行 195 `wb.limits#025b3c75`）
- 違い：POH 6.1 は「cannot be flown with the maximum number of adult passengers, full fuel tanks **and maximum baggage**」（手荷物も最大のとき）。しかも POH 図 6-9 の計算例は、基本空虚重量 1,590 lb の機体に 340 ＋ 340 lb と満タン 288 lb を積んで、ちょうどランプ 2,558 lb で範囲の中。「満タンで 4 人は乗れない」は Archer III の一般の事実ではなく、この本の例の機体（1,640 lb）と 170 lb の 4 人のときの計算の結果。本文の `perf.wbex` は「乗れないことがあります」と正しく留保している。行 195 の出典（POH 6.1）も中身と合わない。
- 直し方（案）：キャプションを「…使える重さです。この例の機体では、170 lb の 4 人と満タンは同時に積めません」に。行 195 の出典を「この本の計算（968 lb ＞ 918 lb）。POH 6.1 は 4 人・満タン・最大の手荷物を同時には積めないと書く」に。
- 根拠：POH 6.1（p.6-1）・図 6-9（p.6-9）。

**S3　第 1 部の共通の節に、日本の事実を本文で書いている（5 か所）**
- 場所：
  - `perf.da`「hPa で知らされたとき」：「日本の METAR などは、規正値を hPa で知らせます。」
  - `perf` の用語 `Altimeter setting` の補足：「米国は inHg、日本の METAR は Q 群（hPa）」
  - `wb.limits`「単位の換算」：「日本で給油すると、量は L で記録されます。」
  - `wb` の例 3：「日本で給油した 100 L → …」
  - `wb` の確認問題 wb.2：「日本で 100 L 給油した。…」
- 違い：STYLE「日米の書き分け」は、第 1〜6 部に入れる基礎教材の日本の数字と制度を、日本の側の入れ物（`bk.jp`・`bk.jur` の日本の列）か第 7 部に分けるとしている（「基礎教材は日本前提で書かれています」の項）。1 つめは、同じ節の `bk.jur('alt.unit')` の日本の列（「METAR の規正値は Q 群（hPa）」）を手で写した重複でもある（STYLE「同じ数字を本文に手で写して、2 か所に置きません」）。CADET はこれらを消さないので、米国の訓練所のゲームの本に「日本で給油」の例と問いが出る。さらに「日本で給油すると、量は L で記録されます」は主張の札にも出典にもない（W16 は確かめた資料を書いていない）。
- 直し方（案）：国を書かない文にする。
  - `perf.da`：「規正値を hPa で知らせる国もあります（ICAO 式の METAR の Q 群など）。そのときは…」。日本のことは、すぐ下の `bk.jur('alt.unit')` が言う。
  - 用語の補足：「inHg か hPa（METAR の A 群・Q 群）」。
  - `wb.limits`：「給油の量が L で記録されることがあります。」日本の例として残すなら、出典を付けて `bk.jp(...)` に入れる。
  - 例 3・wb.2：「100 L 給油した」（「日本で」を外す）。
- 根拠：STYLE.md の「日米の書き分け」（73〜84 行）と「基礎教材は日本前提」（107 行）、DESIGN 3.4。

**S4　`perf.wb` のもっと深く「尾翼の下向きの力と重心」の最後：「後ろの限界は、失速やスピンから回復できるかを考えて決められています（PHAK 第 5 章）」**
- 違い：PHAK 第 5 章（p.5-42）は「The rearward CG limit of an aircraft is determined largely by considerations of stability」と書き、縦の振動が収まらない例を挙げる。スピンの話は、設計者が「1 回転のスピンから普通に回復できる」所の 1 in 以内に後ろの限界を置く、という慣行として別に出てくる。今の文では、主な理由が失速とスピンの回復だと読める。
- 直し方（案）：「後ろの限界は、主に安定を考えて決められています。設計では、1 回転のスピンから普通に回復できることも考えます（PHAK 第 5 章）。」
- 根拠：PHAK 25C 第 5 章「Effect of Load Distribution」（p.5-42・5-43）。

**S5　`perf.plan`「着陸復行の性能」：「POH は、着氷（icing）の兆しがない限り、進入ではヒーターを使わないとしています（POH 4.5m）」**（行 169）
- 違い：POH 4.5m は「unless there is an indication of **carburetor icing**」。FL.terms は `carb-ice`（気化器着氷、carburetor icing）と `icing`（着氷：機体の着氷）を別の語とし、互いに `distinct` にしている。今の文は、機体の着氷の語で気化器着氷を言っている。
- 直し方（案）：「気化器着氷（キャブレターアイス、carburetor icing）の兆しがない限り」。この章の初出になるので、正式名（通称、English）の形で。
- 根拠：POH 4.5m（p.4-21）、`flight-lab/src/book-terms.js` の `carb-ice`・`icing`。

**S6　`perf.fuel`「計算の手順」③：「予備を足す（昼 30 分・夜 45 分の分）」**（行 149）〔安全〕に近い
- 違い：規則の数字（91.151 の 30 分・45 分）を、国を書かずに共通の節に書いている（DESIGN 3.4「共通の節に国を書かない規則の数字はゼロ」）。前の段落と下の `bk.jur('fuel.vfr')` で米国の規則と分かるが、この 1 行だけ読むと、日本の自家用・訓練の VFR にも法定の予備があると読める。これは〔安全〕の K.wb-perf.K4 が直そうとしている読み違いそのもの。今の本（`book-1.js` 683 行）からある文で、検査（check-jurisdiction）は法令の言葉がないので拾わない。
- 直し方（案）：「予備を足す（米国の 14 CFR 91.151 では昼 30 分・夜 45 分）」。
- 根拠：eCFR 91.151(a)、FL.jur `fuel.vfr`、DESIGN 10.2 の wb-perf K4。

**S7　計算機 `CALC.wb`：離陸の重さが 2,550 lb を超えると、前の限界を外へ延ばして作り、重心に ○ を出す**（`perfwb-figs.js` の `checks` の 3 行目）
- 違い：`fwdAt = W.fwd` は 2,550 lb を超えても直線を延ばす。たとえば W16 の報告の確かめ（満タン＋手荷物 30 lb）では「× 離陸 2,560・○ 重心 91.9（この重さの範囲 88.7〜93.0）」と出る。本文（`perf.wbex`「前の限界を補間する」）は「2,550 lb を超える所へ線を延ばして、限界を作りません」と教え、POH 5.3 の外挿の警告とも逆になる。
- 直し方（案）：離陸の重さが `W.max` を超えるときは、重心の行を「—（重さが範囲の外なので、重心の範囲は決まっていない）」か × にする。`fwdAt` は `w > W.max` のとき null を返し、文を分ける。
- 根拠：POH 2.13（2,550 lb まで）・5.3（WARNING）。

### nit

**N1　`wb.limits`「実用類」の出典：「後席に人を乗せず、手荷物も積みません（POH 2.11・2.15・図 6-9）」**（行 202）
- POH 2.15 は運動の制限（バンク 60° を超える運動）だけ。後席と手荷物の禁止は図 6-9 と 2.25 の札（「UTILITY CATEGORY OPERATION - NO BAGGAGE OR AFT PASSENGERS ALLOWED」）にある。「（POH 2.11・2.25・図 6-9）」に。前の文の「バンク 60° を超える急旋回など（POH 2.15）」は正しい。

**N2　`perf.climb`：巡航上昇の理由「エンジンがよく冷え、前もよく見えるからです」**（今の本からある文）
- POH 4.5j の理由は「better forward speed and increased visibility over the nose」で、冷却は書いていない。「前に速く進み、機首越しによく見えるからです（POH 4.5j）」にするか、冷却を残すなら AFH などの出典を付ける。

**N3　図 `perfPlanChain`：「1,907 × 1.3 ＝ 2,479 ft」**
- 1,907 × 1.3 ＝ 2,479.1 なので「≒」に（本文の表は「≒」）。「1,290 × 1.3 ＝ 1,677」はちょうどなので今のままでよい。

**N4　図 `wbLoadingGraph`：「燃料 95.0」の札に、前席 340 lb を読む縦の破線が重なる**
- 390 px の画像で「95.0」の「9」の上を破線が通る（検査の figures は線と文字の重なりを見ない）。札を左へずらす（`line(arms.fuel, 288, …, 10, 6)` の dx を負に）か、破線を札の下で止める。

**N5　計算機 `CALC.da`：hPa へ切り替えたとき 29.92 inHg が 1013（整数）になる**
- `Math.round(Q * 33.8639)` と `step = '1'` のため、標準の 1013.25 にならず、気圧高度が約 7 ft ずれる（1013.25 − 1013 ＝ 0.25 hPa × 27）。`(Q * 33.8639).toFixed(1)` と `step = '0.1'` に。結果への影響は小さい。

**N6　`wb.limits`：標準空虚重量の「作動油」**
- POH 1.19 は「unusable fuel, full operating fluids and full oil」。「作動油」は operating fluids を作動油（油圧の油）に狭めている。「使えない燃料・運用に要る液体（作動油など）・満タンのオイル」に（ここを混同しないの表も）。

**N7　`perf.range` の巡航の表の条件**
- POH の表は「ISA −15℃」の行（4,000 ft では −8℃）と ISA +30℃ の行にだけ真対気速度を書き、ホイールパンツ付きの値（外すと −3 KTAS）。値は正しい。「ISA −15℃（−8℃）・ホイールパンツ付き」と書くと、読んだ人が表で同じ行を探せる。

**N8　W16 の報告の未解決 6（DESIGN の付記への提案）の説明**
- 「図 11-15 は路面の表」は少し違う。PHAK 25C の図 11-15 は「Takeoff distance chart」（条件と注の付いた表の形の図。「Runway Surface and Gradient」の段落が指している）。組み合わせの図は図 11-23（Takeoff distance graph）で、下書きが 11-23 を引いているのは正しい。統合役が DESIGN の付記で直すときは「図 11-15（表の形）ではなく図 11-23（組み合わせの図）」と書くとよい。

## 4. 主張の札 276 行の照合

| 行（`perfwb.claims.json` の順、0 から） | 節 | 結果 |
|---|---|---|
| 0〜32 | perf.da | 合う（PHAK 第 4 章、FAA-P-8740-2、POH 図 5-7・5-35 は気圧高度と外気温で読む、計算は下の 5。27 ft/hPa は RT/(gp) ＝ 27.31 ft/hPa で確かめた。120 ft/℃ の式は FAA-P-8740-2 の早見表より 1〜17% 大きい：海面 80°F で 1,400 対 1,200 ft、4,000 ft 80°F で 6,360 対 6,300 ft。行 27 は FL.jur の文） |
| 33〜70 | perf.tol | 合う（POH 図 5-7・5-11、PHAK 第 11 章の 21%・10%・19%・21%・3.5%・≥21%、AIM 7-6-8・2-3-13、eCFR 91.103、FAA-P-8740-2 の 2 倍、チェックリスト Vr 60・短距離 25°・55 KIAS） |
| 71〜94 | perf.chart | 合う（POH 図 5-7 の条件と速度の表、図 5-35 の条件と例、5.3、PHAK 図 11-21 の 8 つの値と 1,173 ft、図 11-23、AIM 4-3-6） |
| 95〜114 | perf.climb | 合う（教材値は `physics.js` の pa28：mass 1,050 kg ＝ 2,315 lb、Vx 64・Vy 76・climb 87。POH 図 5-15 の 487 fpm・14,085・16,400 ft、PHAK の 100 fpm） |
| 115〜143 | perf.range | 合う（POH 図 5-20・5-20a・5-20b・5-27、PHAK 第 11 章。条件の書き方は N7） |
| 144〜163 | perf.fuel | 値は合う（eCFR 91.151、POH 2.21・図 5-20a・5-20b、6 lb/gal は PHAK 第 10 章。教材値 11.5 gal/h は教材モデル）。**行 149 は S6 を直してから署名** |
| 164〜186 | perf.plan | 値は合う（チェックリストの着陸復行、POH 4.5m、図 5-7・5-15・5-35）。**行 169 は S5 の語を直してから** |
| 187〜193 | perf.wb | 合う（POH 1.11・2.11・2.13 の datum と後ろの限界、図 6-9 のアーム） |
| 194〜220 | wb.limits | 値は合う（POH 1.11・1.19・2.11・2.13・図 6-5・6-9、NIST）。**行 195 は S2、行 202 は N1 を直してから** |
| 221〜244 | perf.wbex | 値は合う（POH 2.13・図 6-9。1,590 lb・87.5 in も合う）。**行 230・231 は M1、行 221・229 は S1 を直してから** |
| 245〜252 | wb.graph | 合う（POH 6.7・図 6-13・6-15、27,370 は図 6-9 の前席のモーメントと同じ） |
| 253〜275 | wb.shift | 値は合う（PHAK 第 10 章の式、POH 7.27・2.25）。**行 263 は S1 を直してから** |

札のない文（数字のない文）も確かめた。問題は 3 に書いた所だけ（S3 の「日本で給油すると…」、S4 のもっと深く、S5、N2、N6）。対象の文：
- 空気が薄いと翼・エンジン・プロペラに起きること、IAS は同じで TAS と GS が速い
- 50 ft を越える距離は滑走距離を含む、距離は対地速度で決まり浮揚と進入は速度計で守る
- 図の条件と手順、unfactored、芝と高い所の風は操縦士が見積もる、外挿しない、補間と悪い側に丸める
- Vx・Vy と余剰推力・余剰パワー、上昇率・上昇角・ピッチの区別、Vx と Vy は絶対上昇限度で一致（PHAK 図 11-10）
- 最大の滞空と最大の航続の速さ、往復の風、向かい風・追い風の決まりはない、混合比の手順
- 重心が前すぎ・後ろすぎの影響（POH 6.1、PHAK 第 5・10 章）、燃料が減ると Archer の重心は前へ（95.0 ＞ 93.0）
- 量り方と風袋、記録と改修、計算は基本空虚重量から、アームの＋と−、移す・足す・降ろす、左右の差、手荷物の固定
- 確認問題 14 問の正解と理由（正解の位置 A 21%・B 29%・C 29%・D 21%）

## 5. 計算（全部を計算し直した）

| 場所 | 式 | 結果 |
|---|---|---|
| perf.da 本文 | 55 ＋ 120 ×（33 − 14.89） | 2,228 → 約 2,200 ft ✓ |
| perf.da 例・確認問題 perf.0 | 55 − 90 ＝ −35、15.07、−35 ＋ 120 × 15.93 | −35 ft・15℃・1,877 → 約 1,900 ft ✓ |
| perf.da hPa | 30.01 × 33.8639、55 ＋（1013.25 − 1016.26）× 27 | 1016.3 hPa・−26 ft ✓ |
| perf.da 標準大気 | 287.05 × 288.15 ÷（9.80665 × 101,325）| 8.32 m/hPa ＝ 27.3 ft/hPa ✓、1,000 ÷ 33.86 ＝ 29.5 ✓ |
| perf.da 計算演習 | 2,100・10.8・2,100 ＋ 120 × 19.2、29.82 × 33.8639、2,000 ＋ 3.45 × 27 | 4,404 → 約 4,400・1009.8・2,093 ✓ |
| perf.da 考えてみよう | 1,000 ＋ 120 × 12 | 2,440 ✓ |
| perf.tol | 1,907 − 1,073、1,200 × 3.28084、60 × 0.7、5 ÷ 60、(65/60)² − 1、6 ÷ 60 | 834・3,937・42・8%・17%・10% ✓ |
| perf.chart | (1,115 ＋ 1,230) ÷ 2、2,140・2,387.5・2,263.75、1,290 × 1.3 | 1,173・2,264・1,677 ✓（1,677 ＞ 1,600 ✓） |
| perf.climb | 500 × 60 ÷ 60・÷ 100、500 ÷ 6,076.1、atan、400 × 70 ÷ 60 | 500・300・8.2%・4.70°・467 ✓ |
| perf.range | 106 ÷ 8.2・115 ÷ 9.5・123 ÷ 11.0、24 ÷ 9.5 × 115、24 ÷ 8.2 × 106、95 ÷ 9.5、100 ÷ 95・÷ 135、200 ÷ 115、30 ÷ 9.5 × 100 | 12.9・12.1・11.2、291・310、10.0（−17%）、63.2 ＋ 44.4 ＝ 107.6・104.3、316 ✓。図 `rangeWind` の向かい風 20 kt：10.5・10.0・9.4 ✓ |
| perf.fuel | 120 ÷ 105、× 9.5、0.5 × 9.5、＋ 2；夜 1.5 × 10 ＋ 0.75 × 10 | 1 時間 8.6 分・10.9・4.75・17.6 → 約 18 gal ✓、22.5 ✓。図 `fuelPlan` の昼 18・夜 20 ✓ |
| perf.plan | 1,907 × 1.3、3,900 − 2,479、487 × 60 ÷ 70、1,290 × 1.3、2,600 − 1,677、487 × 60 ÷ 90、350 × 90 ÷ 60 | 2,479.1（N3）・1,421・417・1,677・923・325・525 ✓ |
| perf の確認問題 | 216,000 ÷ 2,400、70 ＋ 30 分 × 10 gph、500 × 100 ÷ 60 | 90.0・16.7・833 ✓ |
| perf の説明してみよう 24 問 | 29.72 × 33.8639、1,500 ＋ 6.85 × 27、3,000 ＋ 120 × 21、(1,115 ＋ 1,200) ÷ 2 ほか、2,264 × 1.3、480 × 60 ÷ 80、300 × 80 ÷ 60、95 × 2.53、1.1²、2,000 − 1,677、525 − 487 | 1006.4・1,685・5,520・1,218・2,943（差 57）・360・400（余り 80）・240・1.21・323・38 ✓ |
| perf.wb・wb.limits | 82.0 ＋ 350 ÷ 500 × 6.6、82.0 ＋ 80 ÷ 500 × 6.6、2,558 − 1,640、680 ＋ 288、918 − 390、528 ÷ 6、100 ÷ 3.785 × 6、100 × 0.4536、6 × 0.4536 ÷ 3.785 | 86.6・83.06（POH は 83.0）・918・968・528・88（→ 48 gal）・159・45.4・0.719 kg/L ✓ |
| perf.wbex 例 ①②③ | 142,680 ＋ 13,685 ＋ 40,154 ＋ 17,100 ＋ 14,280 など | ① 2,430 lb・227,899・93.79、② 221,507・91.16、③ 2,310・210,107・90.96 ✓（③ の数え方は **S1**） |
| perf.wbex 4 人と満タン | 1,640 ＋ 340 ＋ 340 ＋ 288 | 2,608（超えるのは 50 lb：**M1**） |
| perf.wbex 考えてみよう | 2,430 ＋ 108、221,507 ＋ 10,260、÷ 2,538、− 8 | 2,538・231,767・91.3・2,530 ✓ |
| wb.graph | 142.7 ＋ 27.4 ＋ 20.1 ＋ 17.1 ＋ 14.3、221.6 × 1,000 ÷ 2,430、150 × 142.8 | 221.6・91.2・21,420 ✓ |
| wb.shift | 170 ×（80.5 − 118.1）÷ 2,430、+20 lb・−50 lb、例 ② の 190 lb と −30 lb と −8 lb、0.786 × 2,430 ÷ 62.3 | −2.63 → 91.2・2,450/224,363/91.6・2,380/220,759/92.76（余裕 0.24）・2,420/219,585/90.7 と 2,412/218,825/90.7（前の限界 86.8）・30.6 → 31 lb ✓ |
| wb の確認問題・説明してみよう 27 問 | 220,800 ÷ 2,400、2,450 − 8 − 120、918 − 658、80 × 0.72、60 ÷ 6 × 3.785、215,000 ÷ 2,350、82 ＋ 200 ÷ 500 × 6.6、40 ×（80.5 − 142.8）÷ 2,430、満タン＋手荷物 30 lb、30 ×（−40）＋ 40 × 30、2,422/220,747・2,302/209,347、30 − 1.33 − 20、2,270/204,395 | 92.0・2,442/2,322・260・57.6 kg（127 lb）・38 L・91.5・84.6・−1.0 → 92.8・2,568/2,560/91.9・0・91.1/90.9・8.7・90.0 ✓ |
| 計算機 `da` の既定 | 55 ft・33℃・29.92 | 気圧高度 55・標準気温 15・密度高度 2,228 ✓（hPa の切り替えは N5） |
| 計算機 `wb` の既定 | 1,640/87.0・340・150・40 gal・50 | ランプ 2,420・離陸 2,412・216,945 ÷ 2,412 ＝ 89.9 in ✓（2,550 lb を超えるときは **S7**） |

## 6. 図（15 枚）

- 新しい 8 枚と描き直し 3 枚を、下書きを読み込んで Chromium の 390 px で描き、目で見た（スクラッチの PNG）。数字は全部、本文と主張の札の値と同じ。
- `perfChartRead`：POH 図 5-35 と同じ読み方の順（外気温 → 気圧高度の線 → 基準線 → 重量の案内線 → 風 0 の基準線 → 風の案内線 → 距離）。気圧高度の線は右上がり、重量と向かい風の案内線は右下がりで、POH の図と向きが合う。模式図と書いてある。
- `climbGradient`：500 ft/NM と 300 ft/NM の線、1.2 NM・450 ft の障害物（500 ft/NM の線は 600 ft で越え、300 ft/NM の線は 360 ft で越えない）。キャプションと合う。
- `rangeWind`：12.9/10.5・12.1/10.0・11.2/9.4 NM/gal。
- `perfPlanChain`：総合演習の表と同じ（N3）。
- `wbChecks`・`wbLimits`：POH の値（`wbLimits` のキャプションは **S2**）。
- `wbLoadingGraph`：POH 図 6-13 と同じ軸（縦 0〜450 lb・横 Moment/1000 0〜50）と線の順（前席が最も急、手荷物が最もゆるい）。340 lb → 27.4（N4）。
- `wbShift`：93.8 → 91.2 in、−2.6 in。
- `takeoffDistance`：1,073・1,907 ft を 3,937 ft の滑走路に縮尺どおり。中間点は 1,968 ft。
- `densityAltitude`：15・25・33・38℃ → 約 100・1,300・2,200・2,800 ft（55 ＋ 120 ×（t − 14.89））。
- `wbStations`：アームと datum の文字は POH と合う。
- 今のままの 4 枚（`windEffect`・`climbVxVy`・`fuelPlan`・`wbEnvelope`）はコードで確かめた（`wbEnvelope` のキャプションの「着陸時」は **S1**）。

## 7. 日米の書き分け・基礎教材の書き直し・用語・CADET

- **日米**：12 節とも `scope: 'common'`。米国の規則の文（14 CFR 91.103・91.151、AIM 4-3-6・7-6-8・2-3-13、Part 139）は、どれも同じ文に「米国の」がある。日本の法令の言葉は 3 つの `bk.jur`（`alt.unit`・`preflight`・`fuel.vfr`）の中だけで、FL.jur から描く（手で書いた日本の条文・数字はない）。check-jurisdiction・check-jur は 0。ただし法令でない日本の事実が 5 か所（**S3**）、国のない規則の数字が 1 か所（**S6**）。
- **基礎教材の書き直し**：描いた本文と章末の文（約 10 万字）と、kiso05・kiso06 の本文・問題・解答・用語集の文字を突き合わせた。13 字以上の一致は 14 か所で、どれも短い言い回し（「という意味ではありません」など）。いちばん長いのは説明してみよう 19（kiso06.q23）の問いの 29 字「対地速度が 60 kt から 66 kt になりました。運動エネルギー」と、説明してみよう 2（kiso05.q2）の 23 字「の kg·m と、力のモーメントの N·m は同じ単位」で、問いの設定の数字と語が同じだけ。答えは書き直してあり、kiso06.q23 の「着陸距離が必ず 21% 増えるとはいえない」は PHAK の「少なくとも 21%」に直してある（K3）。**写した文はない**。数字は仮想機の kg・m から Archer III の POH の lb・in に置き換わっている（K7）。
- **用語**：気圧高度だけで「圧力高度」は描いた文に 0（コメントの 1 か所だけ）。滑走距離（地上滑走は taxi）、着陸復行、キャブレターヒーター、迎え角はどれも FL.terms の正式名。気化器着氷だけ違う（**S5**）。
- **CADET の決め打ち**：`perf.wb`・`perf.climb` に「POH」、`perf.fuel` に 91.151 の文がある（DESIGN 6.2 の決まり 9・6.3）。本文に FLIGHT LAB の操作の言葉はない（「キー」「Shift」「画面」「ボタン」「クリック」は 0）。Archer TX の数字もない。

## 8. 台帳の行

触った行はない（パッチは作っていない）。署名（`checkedBy`）は W27 の仕事なので、次のように勧める。
- **CLAIMS**（`perfwb.claims.json` の 276 行。章の登録で足す行）：
  - 266 行は、一次資料で確かめた値として署名してよい。
  - 次の 10 行は、3 を直してから署名する：行 149（S6）・169（S5）・195（S2）・202（N1）・221・229・263（S1）・230・231（M1）。行 231 は文は正しいが、M1 の直しでランプと離陸の 2 つになる。
- **ERRATA**：
  - `K.wb-perf.K1`・`K2`・`K3`・`K5`・`K7`：W16 の `fixed`・`verified: true` に同意する（描いた文で確かめた）。
  - `K.wb-perf.K4`〔安全〕：W16 の分（`perf.range` の「比べる燃料は予備を含まない」と `perf.fuel` の `bk.jur('fuel.vfr')`）は正しい。S6 を直すとより確か。開いたまま（kiso08・kiso12 の分が残る）でよい。
- **RULINGS**：`R.pa-coefficient`（27.3 ft/hPa を計算で確かめた）・`R.pressure-altitude-term`・`R.fast-landing`・`R.fuel-cg-shift`・`R.planning-margin`：直った場所は正しい。
- **PROVENANCE**：`from` の 11 節と、説明してみよう 51 問の `from` は、中身と合っている（問いの番号と内容を照らした）。

## 9. 検査の結果

| 検査 | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/perfwb-figs.js textbook/rewrite/combined/drafts/perfwb.js` | error 26・warn 20・pending 1・info 411。W16 の報告と同じ。<br>style の error 26 は W10b の部品の見出し（判断の目・答えと解き方・思い出そう・ここを混同しない）を文と数えるもの、warn 7 は日米の囲みの中の語の初出。<br>concepts の warn 1（最良上昇角速度の太字が `ops.short` にもある）、claims の warn 12（CLAIMS.json にまだない）、calc の pending 1（CALC.json がない）。<br>chapters・form・data・volume・jurisdiction・chapter-refs・figures（15 枚、error 0）・questions・photos・jur・path・provenance・egov は 0 |
| FLIGHT LAB `cd flight-lab && npm run -s test:fast` | **86/86 pass** |
| CADET `cd cadet && npm run -s test:fast` | **247/247 pass** |
| TEXTBOOK `cd textbook && npm test` | **33/34 pass・1 fail**（2 回流して同じ）。落ちたのは `build.test.mjs:66`「build: FLIGHT LAB sources are not copied into textbook/」で、引っかかったのは `rewrite/combined/drafts/radio.js`（W19-radio の下書き。名前が `flight-lab/src/radio.js` と同じ）。この章の下書きは関係しない（factcheck-sys の報告 8 と同じ） |

## 10. 未解決のこと

1. S3 の「日本で給油すると、量は L で記録されます」は、確かめた資料がない。日本の例として残すなら、出典を決めて `bk.jp` に入れる（確かめるまでは国を書かない文に）。
2. S6 は今の本からある文。〔安全〕K4 の読み違いに近いので、W27・W36 の安全レビューでも見てほしい。
3. S1 で `ARCHER_WB.example()` を直す場合は、図 `wbEnvelope` と今の本の `perf.wbex`（登録で置き換わる）に影響する。文で区別するだけなら影響はない。
4. 計算の台帳 CALC.json はまだない（calc の pending）。`perfwb.claims.json` の「例題」128 行の式は 5 の表と合っているので、作るときに使える。

## 11. ほかの単位にお願いしたいこと（needs from others）

1. **W16（または perf・wb の直し役）**：上の M1・S1〜S7、nit N1〜N7 を `drafts/perfwb.js`・`drafts/perfwb-figs.js`・`drafts/perfwb.claims.json` に。直す文は 3 に書いたとおり（M1 はコードの `four.w - W.max` → `four.w - W.ramp` と文、S7 は `CALC.wb` の `checks`）。
2. **W27（R2 の確かめ）**：8 の署名。S6 の安全レビュー（W36 と）。
3. **統合役**：DESIGN の付記で `perf.chart` の「PHAK 図 11-15 型」を直すときは、N8 の書き方で（図 11-15 は表の形の Takeoff distance chart、組み合わせの図は図 11-23）。
4. **W19-radio・統合役**：`textbook/rewrite/combined/drafts/radio.js` の名前が `flight-lab/src/radio.js` と同じため、TEXTBOOK のテスト `build.test.mjs:66` が落ちる。下書きの名前を変える（例：`radio-ch.js`）か、テストが `rewrite/combined/drafts/` を除くようにする。
