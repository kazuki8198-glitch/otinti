# 事実確認の報告：第 1 部 第 10 章 `wx`「航空気象」（W17 の下書き、R2）

単位：factcheck-wx（W17 の事実確認役。下書きは書いていない）。作業日：2026-10-30。
対象：`textbook/rewrite/combined/drafts/wx.js`・`wx-figs.js`・`wx.claims.json`（W17）。照らしたもの：DESIGN 6.2（15 の決まり）・3.3（第 1 部 章 10）・3.4・4.2（kiso07）、DECISIONS.md、STYLE.md、W17 の報告。
**下書き・台帳・製品のファイルは 1 つも変えていません。** 変えたのはこの報告だけです。直しの案は下の 4 にまとめました（直すのは W17 か、この章の改稿の単位）。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck-wx.md`（新） | この報告 |

## 2. 確かめ方（一次資料。どれも 2026-10-30 に元の URL から新しく取り寄せて本文を読んだ）

| 資料 | URL（下書きの `R`・`NEW_R` と同じ） | 確かめた所 |
|---|---|---|
| FAA Aviation Weather Handbook FAA-H-8083-28B（2026、`R.wx`） | faa.gov …/files/FAA-H-8083-28B.pdf（2026-04-02 署名の版。PDF を全文テキストにして節ごとに読んだ） | 表 3-5（ATIS・ASOS/AWOS の声は磁方位、ほかは真方位）、4.3.1・4.3.2・4.4・表 4-2、5.8・5.8.1・5.8.3、6.4〜6.7.1、8.2.5、9.4・9.4.2、10.1〜10.6.6、11.1〜11.3.4、12.1〜12.5、13.1〜13.5.2、14.4.5、15.2.5.1、16.2・16.2.4・16.2.5・16.2.7、17.3.5.5、18.1〜18.1.9、19.1〜19.2.5.3、20.2〜20.4.1、21.4.3、22.1〜22.8.2、24.2.4、24.4〜24.4.3.13.3、24.5.1.1.1、24.6.1.6、24.7.2.1〜24.7.2.4、25.2.3・25.2.3.1・25.3.2、26.1〜26.3.1.3、27.2.1.1〜表 27-1、27.4〜27.4.4（表 27-7） |
| FAA PHAK FAA-H-8083-25C 第 12 章（`NEW_R.phak12`） | faa.gov …/files/14_phak_ch12.pdf | 逆転層（ふた・湿度が高いと霧・煙霧）、積雲の底（4.4 °F/1,000 ft・湿った不安定な空気）、霜（全部取る）、移流霧・滑昇霧（朝日で消えず何日も続く）・蒸気霧、気団の変質（暖かい面→不安定・視程よい、冷たい面→安定・視程悪い） |
| FAA AIM 7-1・4-3（`R.aim71`・`R.aim43`） | faa.gov …/aim_html/chap7_section_1.html・chap4_section_3.html | 7-1-4（GFA 14 時間前〜15 時間先）、7-1-7（LIFR・IFR・MVFR・VFR の定義）、7-1-11、7-1-19・7-1-20・7-1-21、7-1-24（LLWAS・TDWR）、7-1-27（NEXRAD 15〜20 分）、7-1-28（TEMPO <1 hour、VC は米国で 5〜10 SM・ほかは 8,000 m 以内）、7-1-29（真方位・SM/ft/inHg・BECMG ふつう 2 時間・書かれない要素は前の群から・NWS は BECMG を使わない）、4-3-3（場周 1,000 ft AGL）、4-3-7（LLWAS はマイクロバーストの警報を出さない・LLWAS-NE/RS は出す） |
| NWSI 10-813（2024-10-30、`R.nwsi10813`） | weather.gov …/pd01008013curr.pdf | 4.10 の発表の窓（00Z の TAF は 2320〜2340Z）、付録 A の TEMPO（< 1 hour）・FM（< 1 hour の変化）・G、付録 B 2.9.3 の TEMPO（**one hour or less**）・2.9.4（PROB30 だけ）、B2.6.4・付録 E の VC 5〜10 SM と BECMG を使わない |
| 14 CFR（eCFR、`R.cfr91`・`R.cfr61`） | ecfr.gov の 91.103・91.155・61.89 | 91.103(a)(b)、91.155(c)(d)、61.89(a)(6)（昼 3 SM・夜 5 SM） |
| AFH FAA-H-8083-3C 第 9 章（`R.afh`） | faa.gov …/airplane_handbook/10_afh_ch9.pdf | 突風分の半分（Pilots often use the normal approach speed plus one-half of the wind gust factors…、速度とフラップは AFM/POH に合わせる） |
| Piper PA-28-181 Archer III POH VB-2266（`R.archerPoh`） | andrews.edu …/archeriii-poh.pdf | 2.3（VO 113 KIAS／2550 lb・98 KIAS／1917 lb、軽いほど小さい）、2.19（Day/Night VFR・IFR、Non Icing）、4.3（VO 113・実証横風 17 kt・Final Approach Speed 66 KIAS）、4.5a・4.5h（翼に氷・雪・霜があれば離陸しない）、4.9（揺れる空気では VO まで） |
| Archer III w/ G1000 Pilot's Checklist（`R.archerCk`） | mga.edu …/Archer_Checklist.pdf | Airspeed 70 KIAS ON FINAL（65 短距離）、最大実証横風 17 KTS |
| NOAA NWS Glossary（`NEW_R.nwsGlossary`） | forecast.weather.gov/glossary.php | Showalter Index（850→500 mb、850 mb より下の浅い冷たい層の上を見る、昼の加熱と 850 mb より下の湿り気は入らない）、Potential Temperature、Equivalent Potential Temperature |
| NOAA NHC「Tropical Cyclone Climatology」（`NEW_R.nhcClimo`） | nhc.noaa.gov/climo/ | 大西洋のハリケーンの季節 6 月 1 日〜11 月 30 日 |
| NOAA JetStream「Weather Maps」（`NEW_R.noaaWxmaps`） | noaa.gov/jetstream/wxmaps | 寒冷前線（青・三角）、温暖前線（赤・半円）、停滞前線（赤と青が交互、三角と半円は反対側）、閉塞前線（紫・三角と半円が同じ側） |
| NWS Melbourne「The Florida Rain Machine」（`R.flRain`） | weather.gov/mlb/flrainmachine | メキシコ湾と大西洋の海風がぶつかる、夏の午後、涼しい季節の雨は主に前線、寒冷前線が乾いた空気を運ぶ |
| 気象庁の 3 ページ（`NEW_R.jmaTaf`・`jmaKosa`・`jmaSigmet`）と気象庁「飛行場に関する気象情報」 | data.jma.go.jp …/taf.html、jma.go.jp …/4-4kosa.html・32_kuuiki.html・31_hikoujou.html | TAF は 1 日 4 回（00・06・12・18 UTC）・発表から 30 時間（全国 40 空港）、黄砂（東アジアの砂漠域、春に多い）、シグメット（福岡 FIR、強い乱気流や着氷・雷電・台風・火山灰の拡散） |
| NWS Omaha「Frost/Freeze」（下の S2 の直しの案に使う） | weather.gov/oax/freeze | 気温 33〜36 °F・弱い風で霜ができ始める、地面に接した空気は 30 °F 以下のことがある |
| 基礎教材 kiso07（原本、読むだけ） | `flight-lab/kiso/data/kiso07.json` | 本文・記述問題 q1〜q28 との文字の重なり（9） |

道具：`node textbook/rewrite/combined/tools/check-chapter.mjs`（`sys`・`inst`・`wx` の下書き 6 つ、`--claims-out` で抜き出した主張と `wx.claims.json` の突き合わせ）、図 8 枚を Chromium 390 px で PNG にして目で見た（スクリプトと PNG は scratchpad。リポジトリには置いていない）、kiso07 との 16 字以上の文字の重なりの検査。

## 3. 結果の要約

- 主張の札 186 行（参考値 169・条文 14・教材値 3、うち例題 57）：`--claims-out` の抜き出し 186 行と `wx.claims.json` の 186 行は **ID も文も全部一致**（札のない主張 0）。**数値と規則は 175 行が一次資料と合う**。残る 11 行は、文か出典の書き方を直してから署名する（5）。
- 計算：全部を計算し直した（6）。誤りなし。
- 図：新しい 7 枚と描き直し 1 枚を一次資料と照らし、390 px の PNG で見た（7）。誤りなし（nit 1）。
- 本文（札の行の外も含む）の問題：**must 0・should 6・nit 20**（下の 4）。
- 日米の書き分け：検査（check-jurisdiction）は error 0 だが、`scope: common` の `wx.metar` に、国を書かない米国だけの決まりの数字が残る（S3）。日本の数字と制度は囲みと `bk.jp` の 3 か所だけで、正しい。
- 基礎教材の写し：なし（9。いちばん長い重なりは記述問題の問いの 24 字）。

## 4. 問題と直しの案（重い順）

### must（直すまで登録しない）

なし。

### should（直すのがよい。登録の前に直すことを勧める）

**S1. TEMPO の「1 回 1 時間未満」の出典が、引いた資料と合わない（`wx.taf` の表の `bk.src`・確認問題 4 の理由・札の行 `wx.taf#e4b71415`・`#90ffdda9`）**
- 今の文：表の行「起きる見込みは 50% を超え、1 回 1 時間未満、合わせて期間の半分未満」に `bk.src('AWH 27.4', 'NWSI 10-813（2024 年 10 月 30 日版）')`。確認問題 4 の理由「TEMPO は一時的な変化（1 回 1 時間未満、…）…（AWH 27.4）」。札の出典「NWSI 10-813（2024-10-30）付録 B（TEMPO: … less than one hour …）」。
- 一次資料：AWH 2026 の 27.4.2.10.2 は「Last for **one hour or less** in each instance」。NWSI 10-813 も**付録 B 2.9.3 は「one hour or less」**で、付録 A の用語の表だけが「< 1 hour」。AIM 7-1-28 の表は「changes expected for <1 hour」。つまり「1 時間未満」を支えるのは AIM 7-1-28 と NWSI の付録 A で、AWH と NWSI の付録 B は「1 時間以内」。札の出典は付録 B を「less than one hour」と書き写していて、本文と違う。
- 直しの案：数字は台帳 `R.tempo-length` の裁定（米国も「1 時間未満」：AIM 7-1-28）のままでよいので、出典を合わせる。表の `bk.src` を `bk.src('AWH 27.4', 'AIM 7-1-28', 'NWSI 10-813 付録 A')` にし、確認問題 4 の理由の「（AWH 27.4）」を「（AIM 7-1-28）」に。札 2 行の出典を「AIM 7-1-28（<1 hour）・NWSI 10-813（2024-10-30）付録 A（< 1 hour）。付録 B 2.9.3 と AWH 2026 の 27.4.2.10.2 は one hour or less（境目の書き方の違い）」に。同じ数字は `FL.jur` の `metar.taf`、要点、図 `tafTimeline` にもあるので、`R.tempo-length` に資料の食い違いを 1 行残す（8 の 3）。

**S2. 本文に基礎教材の内部 ID「（kiso07.16）」「（kiso07.18）」を出典として書いている（`wx.ice`「霜」・`wx.metar`「時刻と高さの基準をそろえる」）**
- 今の文：「気温計が 0℃ より高くても、冷えた翼の表面には霜が付きます（kiso07.16）。」「受け取ったばかりの情報でも、観測は古いことがあります（kiso07.18）。」
- 問題：3 製品の本文に読む人の知らない ID が出る（登録済みの章にも、ほかの下書きにも例がない）。STYLE「本の名前は『教科書』…基礎教材の名前は、由来の行と出典にだけ出します」・「事実は公開されている出典に合わせます」。基礎教材は一次資料ではない（由来は節の `from` に既にある）。札 `wx.ice#a7608c84` の出典も kiso07.16 が主。
- 一次資料：霜は NWS Omaha「Frost/Freeze」（「An air temperature range of 33°–36°, along with very light winds, is usually needed to initiate frost formation」「the air in contact with the surface could be 30 degrees or colder」）と PHAK 第 12 章（物の表面の温度が露点より下がり、氷点下なら霜）。観測の古さは AWH 24.2.4（自動観測の雲は観測時刻までの 30 分、ほかは 10 分以内の値）と 24.6.1.6（データ放送の画像は表示より 15〜20 分古いことがある）。
- 直しの案：「…冷えた翼の表面には霜が付きます（米国の国立気象局の解説・PHAK 第 12 章）。」（`NEW_R` に NWS Omaha の URL を足す）、「受け取ったばかりの情報でも、観測は古いことがあります（AWH 24.2.4・24.6.1.6）。」。札 `wx.ice#a7608c84` の出典を同じに直す。

**S3. `scope: common` の `wx.metar` に、国を書かない米国だけの書き方と数字がある（決まり：STYLE「共通の節には、国を書かない規則の数字を書きません」）**
- 今の文：「METAR は、空港で 1 時間ごとに出る定時の観測です」（毎時は `FL.jur` の `metar.taf` の米国の欄の値で、日本の主な空港は 30 分ごと：`R.metar-frequency`）、「VC は、空港の 5〜10 SM の付近です」（AIM 7-1-28：「In the US METAR, 5 to 10 SM … Elsewhere, within 8000m」）、雲量の表「CLR は自動観測で 12,000 ft 以下に雲なし」（米国の自動観測の書き方：AWH 24.4.3.9）、「AO2 は…AO1 は…」（米国の自動観測所の型：AWH 24.4.3.13.3）、「CB と TCU だけは、種類も書かれます」（AWH 24.4.3.9：手で観測する所だけ）。
- check-jurisdiction は「AIM・14 CFR」などの言葉で数えるので、これらは拾えていない。
- 直しの案：要素の箇条書きの前に 1 文「ここからは米国の METAR の書き方です。」を置き、最初の文を「米国の METAR は、空港で 1 時間ごとに出る定時の観測です」に（数字を囲みと二重に持たないなら「定時の観測です（米国は 1 時間ごと：下の囲み）」）。CB・TCU の文に「（人が観測する所）」。札 `wx.metar#e25b9132`・`#9e2b549b`・`#539cc0e3` の文が変わるので、札を作り直す。

**S4. 要点「出発前に、公式の情報源で天気を確かめる（米国は 91.103）」が、91.103 にない要件を書いている（`wx.brief`・札 `wx.brief#a5bfb37a`）**
- 一次資料：14 CFR 91.103 は「all available information concerning that flight」を求め、天気の報告と予報は (a)「For a flight under IFR or a flight not in the vicinity of an airport」だけ。「公式の情報源」という要件はない（本文の段落は正しく書いている）。
- 直しの案：「出発前に、その飛行の情報をすべて確かめる（米国は 91.103。空港の近くを離れる飛行と IFR は天気の報告と予報も）」。

**S5. 「米国の LLWAS は空港のまわりだけを見て、マイクロバーストの警報は出しません（AIM 4-3-7）」が、新しい型を含めて言い切っている（`wx.shear` の「よくある間違い」・札 `wx.shear#d2240f3f`）**
- 一次資料：AIM 4-3-7「LLWAS provides wind shear alert and gust front information but does not provide microburst alerts」の次の段落「LLWAS NE and LLWAS-RS are systems integrated with TDWR. These systems provide the capability of detecting microburst alerts」。AIM 7-1-24 も LLWAS-NE は「wind shear/microburst detection」を出すと書く。
- 直しの案：「米国の基本の LLWAS は空港のまわりの風だけを見て、マイクロバーストの警報は出しません（TDWR とつないだ LLWAS-NE などは出します。AIM 4-3-7）。」。注意の向き（警報がないことは証明ではない）は今のままでよい。

**S6. 台帳 `CLAIMS.json` の今の `wx.taf` の 2 行が、章を登録すると行き先のない行になる（W17 のパッチ）**
- `wx.taf#2c77151c`（定時の TAF は 1 日 4 回…）と `wx.taf#cbb14d49`（発表はその 20〜40 分前…）は、下書きで文が「米国の定時の TAF は…」などに変わり、新しい行 `wx.taf#3ea1d282`・`#1868d4d1` になった。W17 のパッチは `add` だけで、古い 2 行は check-claims の `ledger-row-not-in-book` に残る（今の check-chapter の info に出ている）。
- 直しの案：W17 のパッチに古い 2 行への `set`（`note`：「W17：文を書き直し、wx.taf#3ea1d282・#1868d4d1 に置き換えた（R2）」）を足すか、統合役が取り込むときに 2 行を外す（台帳の README に `remove` の op はない）。

### nit（小さな直し）

| # | 場所 | 今 | 直しの案と一次資料 |
|---|---|---|---|
| N1 | 札 `wx.fog#dce47593` の出典 | 移流霧の 15 kt の行に 18.1.1.1.1（放射霧）の「winds up to about 5 kt」を書いている | 「AWH 18.1.1.1.2（Advection fog deepens as wind speed increases up to about 15 kt. Wind … stronger than 15 kt lifts the fog into … low stratus）」 |
| N2 | `wx.shear` 突風分の段落、札 `wx.shear#c3f4e751`・`#c50f0cfc` の出典 | 「（AFH）」、札は「AFH 第 8 章」 | AFH FAA-H-8083-3C では**第 9 章**（Approaches and Landings）。本文を「（AFH 第 9 章）」に。AFH の同じ所の「速度とフラップは AFM/POH に合わせる」も 1 句足すとよい（POH の Final Approach Speed は Flaps 40° で 66 KIAS、学校のチェックリストは 70 KIAS） |
| N3 | `wx.metar`「ATIS と…声の放送の風向は、磁方位（magnetic direction）です（AWH）」・確認問題 3 の理由 | 節がない | 「（AWH 表 3-5）」 |
| N4 | `wx.turb`「帯は真ん中ほど強く、まわりへ行くほど弱くなります（AWH 9.4.2）」 | 9.4.2 にこの記述はない | 「（AWH 19.2.3.2.1：the rapidity of the decrease in wind speed away from the jet core）」 |
| N5 | `wx.info`「9900 は弱く向きの定まらない風です」 | — | AWH 27.2.1.1.1「Light and variable wind or wind speeds of less than 5 kt are expressed by 9900」→「9900 は、弱く向きの定まらない風か、5 kt 未満の風です」 |
| N6 | `wx.fog`「米国では、卓越視程が 1 SM 以下か…滑走路視距離が 6,000 ft 以下のときに METAR に入ります」 | 条件が 1 つ足りない | AWH 24.4.3.7「whenever the station has RVR equipment and …」→「米国では、滑走路視距離の装置がある空港で、…」 |
| N7 | `wx.ts` 危険の表「雲の外でも、横へ 20 マイル離れた所で揺れることがある」 | どの雷雨か書いていない | AWH 19.2.1.1「up to 20 mi laterally from a severe storm」→「激しい雷雨から横へ 20 マイル…」（札 `wx.ts#6f765629` の文も） |
| N8 | `wx.wind`「細い半島では両側の海風がぶつかり、昼前から昼すぎに積乱雲が育ちます。空気が湿って不安定なら、雷雨…になります」 | 積乱雲が育つと言ってから条件を書く（積乱雲＝雷雨の雲） | AWH 10.6.1.2「strong convective development … Stronger lift may be sufficient to initiate showers and thunderstorms if the air mass is sufficiently moist and unstable」→「…強い対流（積雲）が育ちます。空気が湿って不安定なら、積乱雲が育って雷雨…になります」 |
| N9 | `wx.front` 気団の分類 | P・T と c・m だけ | AWH 11.2.1.1 は北極（A）も挙げる。「（ほかに北極気団 A）」を足すか、そのままでも可 |
| N10 | `wx.ice`「着氷には…0℃ 以下の気温が要ります」・図 `wxIcing`「0℃ 以下の空気」「冷たい機体 0℃ 以下」 | AWH 20.3.4 は「OAT must be **below** 0°C」 | 「0℃ より低い（氷点下の）」。図は 3 つを「＋」で並べるので、本文の例外（冷えた機体は 0℃ より少し高い空気でも）と食い違って見える。キャプションに「冷えた機体なら、空気が 0℃ より少し高くても」を足す |
| N11 | `wx.front` フロリダの冬の寒冷前線の段落 | 出典がない（W17 の 7 の 6）。表は「西〜北西寄り」、この段落は「北寄り」 | NWS Melbourne「The Florida Rain Machine」（涼しい季節の雨は主に前線、寒冷前線が乾いた空気を運ぶ）と AWH 11.3.2（前線の前のスコールライン、通ったあと WNW の風）で支えられる。「北西〜北寄り」にそろえて `R.flRain` を引く |
| N12 | `wx.info`・記述問題 23「米国本土の SIGMET は、4 時間まで有効です」 | — | AWH 26.2.4.1.2 は雷雨以外（Non-Convective）の SIGMET。Convective SIGMET は 2 時間（26.2.4.2.3）。「米国本土の（雷雨以外の）SIGMET は…」 |
| N13 | 章末の注意「シミュレータでは、雲・視程・着氷・乱気流・ウィンドシャーは体験できない」 | 飛行モデルは突風の揺れ（`physics.js` の turbulence）を持つ | 「乱気流」を「（突風の揺れを除く）乱気流・山岳波」に |
| N14 | `wx.brief` の `bk.sim` | ラベル「課目 r1：突風の横風の日の判断」 | 課目 r1 の題は「TEM：脅威を予測して管理する」（`syllabus.js`。管制との食い違いの場面も含む）。ラベルは課目の題に合わせる（今の本の `book-2.js` も題のまま） |
| N15 | `wx.taf` の `bk.jp` の出典 | 関西航空地方気象台のページ（その官署の空港の表） | 気象庁「飛行場に関する気象情報」（…/31_hikoujou/31_hikoujou.html：全国 40 空港・1 日 4 回 00・06・12・18 UTC・発表から 30 時間）の方が「日本の気象庁の TAF」全体を支える |
| N16 | `wx.brief`「上の図の区分（VFR・MVFR・IFR・LIFR）は、航空気象のサイトが…色分けしたものです」 | 区分の出どころ | 区分そのものは AIM 7-1-7 が定義する（MVFR：雲高 1,000〜3,000 ft・視程 3〜5 mi）。「AIM 7-1-7 の区分を、航空気象のサイトが色分けして…」 |
| N17 | `wx.info` レーダーの表「強いエコーの手前の縁しか見えない」 | 言い過ぎ | AWH 15.2.5.1・22.8.1「may prevent the radar from detecting additional cells that might lie behind the first cell」→「強いエコーの奥のセルが映らないことがある」 |
| N18 | `wx.ice` ここに注意「凍る高さの予報は、着氷の範囲の上と下を保証しません（AWH 20.3.4）」「小さな雲の粒のほか、凍る雨は…」 | 20.3.4 にこの記述はない。後の文は読みにくい | 出典を「AWH 20.3.7・AIM 7-1-19（暖かい高さは下とは限らない）」に。「凍る雨は、雲の粒より広い範囲に広がり…」 |
| N19 | `wx.ts`「フロリダの夏の訓練は、雷雨の前の午前中に計画することがよくあります」 | 出典のない一般化 | 「…計画することがあります。」（決め方は学校の方針、は今のまま） |
| N20 | `wx.front` 考えてみようの答え「通ったあとは、しばらく強い突風と揺れが残ります（AWH 11.3.2）」 | AWH は「Behind a **fast-moving** cold front … gusty, turbulent winds」 | 「速い寒冷前線のあとは、しばらく突風と揺れが残ります」 |

（N 以外に、`wx.wind` の「海風前線…積雲が並びます」は AWH 10.6.1.1 が「often」「乾いた・安定な空気では積雲がないこともある」と書くので「並ぶことが多い」とするとより正確。直さなくても誤りではない。）

## 5. 主張の札 186 行の確かめ（`wx.claims.json`）

- **合う（署名してよい）175 行**：上の 4 に挙げた行を除く全部。節ごとに一次資料の該当の文を読んで、数字・単位・条件・出典の節番号を照らした（2 の表）。囲みの行（`FL.jur` が描く 13 行：`alt.transition` 4・`metar.taf`／`alt.unit` 5・`ws.alert` 1・`preflight`／`charts` 3）は W05・W06 が確かめ W12 が署名した値と同じで、`check-jur` も ok（`ws.alert` の行は AIM 4-3-7 とも照らした）。例題 57 行は 6 で検算した。
- **直してから署名する 11 行**：

| 行 | 理由 | 4 の番号 |
|---|---|---|
| `wx.taf#e4b71415`・`wx.taf#90ffdda9` | TEMPO の出典の書き写しの誤り（付録 B は one hour or less） | S1 |
| `wx.ice#a7608c84` | 出典が基礎教材の ID（一次資料でない） | S2 |
| `wx.metar#e25b9132`・`#9e2b549b`・`#539cc0e3` | 共通の節で国を書いていない（文を変えると ID が変わる） | S3 |
| `wx.brief#a5bfb37a` | 91.103 にない要件 | S4 |
| `wx.shear#d2240f3f` | LLWAS の言い切り | S5 |
| `wx.fog#dce47593` | 出典の節と引用が別の霧の行 | N1 |
| `wx.shear#c3f4e751`・`#c50f0cfc` | AFH の章番号（3C は第 9 章） | N2 |

## 6. 計算の検算（全部を計算し直した）

| 場所 | 式 | 結果 |
|---|---|---|
| `wx.atm` 考えてみよう | 30.10 − 29.80 ＝ 0.30 inHg ≒ 300 ft、高く出る → 3,000 − 300 | 約 2,700 ft ✓ |
| `wx.atm` 標準の減り方 | 6.5 × 0.3048 ＝ 1.98 ℃/1,000 ft | 約 2℃ ✓ |
| `wx.cloud` 例・考えてみよう | 32/23：9 ÷ 2.5 × 1,000、28/24：4 ÷ 2.5 × 1,000 | 3,600 ft・1,600 ft ✓ |
| `wx.stab` 計算演習 | ① 9 ÷ 2.5 ＝ 3.6（千 ft）② 30 − 3 × 3.6 ＝ 19.2、21 − 0.5 × 3.6 ＝ 19.2 ③ 19.2 − 2 × 2.4 ＝ 14.4 < 15 | 3,600 ft・19.2℃・14.4℃（安定）✓。図の日：周り 30 − 2.5h、自由対流高度 3.6 ＋ (21 − 19.2) ÷ 0.5 ＝ 7.2（千 ft）、その高さで両方 12.0℃ ✓（周り 6,000 ft で 15℃ も演習と同じ） |
| `wx.stab` 記述問題 7 | 20 − 9.8 × 0.5 | 15.1℃ ✓ |
| `wx.front` 速さ | 25〜30 mph × 0.869、10〜25 mph × 0.869 | 21.7〜26.1 kt・8.7〜21.7 kt → 約 22〜26 kt・約 9〜22 kt ✓ |
| `wx.shear` 突風 | 09012G20KT：(20 − 12) ÷ 2 ＋ 70、18015G25KT：(25 − 15) ÷ 2 ＋ 70 | 74 KIAS・75 KIAS ✓（教材値 `pa28.v.appr` 70・`xwind` 17・`va` 113 を `physics.js` で確かめた） |
| 章末の例 1 | 090°（真）の風・滑走路 36：Sanford の偏差を入れても 90° 前後の横風、突風 20 kt × sin(約 90°) ≒ 20 kt > 17 kt | 「右からほぼ真横・実証横風速度を超える」✓ |
| `wx.metar` | 141753Z − 4 h | 14 日 13:53 EDT ✓ |
| 記述問題 18・21 | 15 日 03:00Z ＋ 9 h、141130Z − 4 h／＋ 9 h、1412/1512 | 15 日 12:00 JST、14 日 07:30 EDT・20:30 JST、24 時間（EDT 8 時〜8 時、JST 21 時〜21 時）✓ |
| `wx.taf` 考えてみよう・図 | TEMPO 1418/1422 − 4 h／＋ 9 h | 14〜18 時 EDT、15 日 3〜7 時 JST ✓。図の目盛り（at(h, off)）の 25 個の時刻と日付も全部確かめた |
| `wx.brief` 練習 | 16Z・19Z・18Z − 4 h | 12 時・15 時・14 時 ✓。基本の予報 09010KT ＝ 東の風 10 kt ✓。19Z は TEMPO 1418/1422 の中 ✓ |
| `wx.brief` 考えてみよう | BKN012・4SM → AIM 7-1-7 で MVFR、91.155(c)(d) の 1,000 ft・3 SM を満たす、1,200 − 500 | MVFR・地上約 700 ft、場周 1,000 ft AGL（AIM 4-3-3）より低い ✓ |
| `wx.info` 計算演習 | 1709+06・2018+00、真航路 020° と風 200°（どちらも真方位） | 170°/9 kt/+6℃、200°/18 kt/0℃、真後ろからの追い風 ✓（AWH 表 27-1 の MKC の値と同じ） |

## 7. 図（`wx-figs.js`。8 枚を一次資料と照らし、390 px の PNG で見た）

| 図 | 確かめたこと | 結果 |
|---|---|---|
| `wxWind` | 上空：風は等圧線に沿って左へ、気圧傾度力は低い側（下）、コリオリの力は高い側（上）＝北半球で進む向きの右（AWH 10.3.2・10.4）。風下を向くと高い側が右 ✓。地上：風は低い側へ 30°（AWH 10.5 の 10〜45° の中）、コリオリの力は風の右に直角、摩擦は風と逆向き（ベクトルを計算して確かめた） | ✓ |
| `wxLocalWind` | 海風（昼、海→陸、陸で上昇、上空は逆向き、陸の上に積雲）、陸風（夜、陸→海、矢印が細い＝弱い）、谷風（斜面を上る）、山風（斜面を下りる）（AWH 10.6.1〜10.6.6） | ✓ |
| `wxParcel` | 6 の数と同じ（雲の底 3,600 ft、7,200 ft より上で空気塊が暖かい）、乾燥 3℃・露点 0.5℃・湿潤 2℃（AWH 12.2・12.3）、条件付き不安定（AWH 13.3.4） | ✓ |
| `wxMountainWave` | 安定な空気・強い風、笠雲、波の山のレンズ雲、最初の波の山の下で尾根の頂より低いローター（AWH 16.2.5「near or below ridge level … under a wave crest」）、ローターの上側が風下へ回る（地面近くは逆流）、風下の斜面の下降気流 | ✓ |
| `wxIcing` | 粗い氷は前へ育つ、透明な氷は上下に角（AWH 20.3.1・20.3.2） | ✓（N10：例外の書き足し） |
| `wxInfoMap` | NOAA JetStream と照らした：寒冷前線は低気圧から南西へ、三角は南東（暖域の側）、温暖前線は東へ、半円は北、閉塞前線は L から閉塞点まで、三角と半円が同じ側、停滞前線は三角（青）と半円（赤）が反対側、H は青・L は赤 | ✓ |
| `wxBriefChain` | 出発・経路・到着・代わり × 観測・予報・影響（kiso07.1 の考え方、数字なし） | ✓ |
| `tafTimeline` | 架空の TAF（基本 14 日 12Z〜、TEMPO 18〜22Z、FM 15 日 02Z）の帯の位置、3 本の目盛り（EDT ＝ UTC − 4、JST ＝ UTC ＋ 9）と日付の変わり目 | ✓（TEMPO の文は S1 と同じ数字） |

検査（Chromium 390 px）：章の図 16 枚（3 章で 42 枚）とも error 0・warn 0。

## 8. 日米の書き分け

- 米国の規則の言葉（14 CFR・AIM）は、`scope: us` の `wx.info` か、同じ文に「米国の」がある文だけ（check-jurisdiction error 0。手でも全文を読んだ）。
- 日本の数字と制度は、囲み 7 か所（`alt.transition`・`ws.alert`・`metar.taf` ×2・`alt.unit`・`preflight`・`charts`）と `bk.jp` 3 か所（黄砂・気象庁の TAF・日本の SIGMET）だけ。3 か所の `bk.jp` の中身は気象庁のページと合う（2 の表）。
- 残る問題は S3（`wx.metar` の米国だけの書き方・数字に国がない）。`wx.taf` の TEMPO・PROB30 の数字は「米国の TAF」「米国の国立気象局」の文脈の中にあり、よい（ただし `FL.jur` の `metar.taf` と同じ数字を本文・要点・図にも持つので、S1 を直すときは全部を一緒に）。

## 9. 基礎教材の書き直し（写していないか）

`kiso07.json` の全文（本文・記述問題と答え・用語・図のキャプション）と `wx.js` の本文を、16 字以上の同じ文字の並びで比べた：重なりは 18 か所、いちばん長いもので 24 字（記述問題 q9「卓越視程と滑走路視距離の違いを説明してください。」、q20 の METAR の例「FEW015 BKN030 24/20」）。どれも問いの言い回しや METAR の記号で、本文の段落の転記はない。記述問題 26 問は、場面と問いを同じにして、言葉と数字（米国の METAR・Sanford 発の計画）を書き直している。**写しはない**。基礎教材の既知の誤り（K.weather.K1・K3・K4・K6）は本文で直っている（K1：気象庁の TAF の時刻は `bk.jp`、K3：ft の値と露点 0.5℃、K4：警報の仕組みは囲み、K6：まず何をするかと限界の注意）。

## 10. 検査の結果

| 検査 | 結果 |
|---|---|
| `check-chapter.mjs`（`sys-figs`・`sys`・`inst-figs`・`inst`・`wx-figs`・`wx`、Chromium あり） | error 34（style だけ：W10b の部品の見出しを文と数える。`wx` の分は 10 で W17 の報告 5.2 のとおり）・warn 43（questions 1：`sys` の正解の位置、concepts 1：雲高の太字が `wx.metar` と `law.vfr`、claims 33：3 章の札がまだ `CLAIMS.json` にないため。**`wx` は `--claims-out` の 186 行と `wx.claims.json` の 186 行が全部一致**）・pending 4・info 411（`ledger-row-not-in-book` に S6 の 2 行）。chapters・form・data・volume・jurisdiction・chapter-refs・figures（42 枚）・photos・jur・path・provenance・egov は 0 |
| FLIGHT LAB `npm run -s test:fast` | **86/86 pass** |
| TEXTBOOK `npm test` | **33/34**（1 fail。2 回流して同じ）：`build: FLIGHT LAB sources are not copied into textbook/` が `textbook/rewrite/combined/drafts/radio.js` を見つける（`flight-lab/src/radio.js` と同じファイル名。コミット 65952a5 から。`wx` とは関係なし。8 の 4） |
| CADET `npm run -s test:fast` | **247/247 pass** |

## 11. 台帳の行

- 変えた行：なし（この単位は報告だけ）。
- 署名の材料：`wx.claims.json` の 175 行は確かめ済み（5）。11 行は直してから。`checkedBy` を付けるのは、パッチを取り込む統合役か W27（この単位はファイルを変えない決まり）。
- W17 のパッチの `ERRATA`（K.weather.K1・K3・K4・K6 を `fixed`）と `RULINGS`（R.cell-stage-names・R.cloud-base-formula・R.high-pressure-weather を `fixed`）は、本文がそのとおりに直っていることを確かめた（`wx.ts` の段階の名前は FL.terms の正式名と基礎教材の名前の併記、`wx.cloud` の式は湿った不安定な空気の積雲の目安で層状の雲と霧に使わない、`wx.atm` の高気圧でも霧）。

## 12. 残る問題

1. TEMPO の長さの一次資料どうしの食い違い（AIM 7-1-28・NWSI 付録 A は「< 1 hour」、AWH 2026・NWSI 付録 B 2.9.3 は「one hour or less」）。本は `R.tempo-length` の裁定で「1 時間未満」。境目の違いだけで飛行の判断は変わらないが、出典は合わせる（S1）。
2. W17 の 7 の 2・3（潜在不安定、着氷の形と乱気流の強さの日本語の名前）は、この単位でも一次資料を見つけていない（書いていないので誤りではない）。
3. `wx.shear` の〔安全〕の段落は、用語の差し替え以外は W07a・W12 の文と同じことを確かめた（AWH 22.7.3.1・22.7.3.3・AFH 第 5 章）。安全レビューの読み直しは W17 の報告のとおり W27・W36。

## 13. ほかの単位にお願いしたいこと

1. **W17（または `wx` の改稿の単位）**：4 の S1〜S5 と N1〜N20 を直し、`--claims-out` で札を作り直して 5 の 11 行を差し替える。S2 の直しで `NEW_R` に NWS Omaha「Frost/Freeze」（https://www.weather.gov/oax/freeze）を足す。
2. **統合役**：章を登録するとき、S6 の 2 行（`wx.taf#2c77151c`・`#cbb14d49`）を `CLAIMS.json` から外すか、置き換えの `note` を付ける。5 の 175 行に `checkedBy: "factcheck-wx"`・`checkedOn: "2026-10-30"` を付けてよい（直した 11 行は直したあとに確かめ直す）。
3. **W08（`R.tempo-length`）・W06（`FL.jur` の `metar.taf`）**：`R.tempo-length` の `note` と `FL.jur` の `metar.taf` の `usSrc`／`note` に「AWH 2026 27.4.2.10.2 と NWSI 10-813 付録 B 2.9.3 は one hour or less、AIM 7-1-28 と付録 A は < 1 hour」を 1 行足す（数字は変えない）。
4. **統合役・W19-radio**：TEXTBOOK の `build.test.mjs:66` が `textbook/rewrite/combined/drafts/radio.js` で落ちる（`flight-lab/src/radio.js` と同じ名前）。下書きの名前を変える（例 `radio-ch.js`）か、テストが `rewrite/` を見ないようにする。`wx` の作業とは関係がない。
