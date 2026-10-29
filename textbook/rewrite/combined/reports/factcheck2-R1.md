# 事実確認の二人目：R1 の全部（factcheck2-R1）

単位：R1 の事実確認の二人目（DESIGN 7.2 の W12「事実の二人目」。R1 の文はどれも書いていない役）。日付：2026-10-29。
確かめたもの：`git diff 8382341..HEAD` のうち `flight-lab/src/` の `book-0.js`〜`book-5.js`・`book-comm.js`・`book-core.js`・`book-figs.js`・`book-photos.js`・`book-jur.js`・`book-terms.js`・`quiz.js`・`syllabus.js` と `cadet/src/content/`（`book.js`・`academy-spec.js`）。変わった文・新しい文の事実と、日米のすべての値（`FL.jur` の 47 項目）、閉じた ERRATA の行（101 行）と、関係する RULINGS の閉じた行（35 行）。
決まり：DESIGN 6.2（15 の決まり）・3.4（米国と日本の扱い・推測で埋めないもの）・5 章（基準 1・3・4・7・9）・7.2（W12）、DECISIONS、STYLE、CLAUDE.md。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck2-R1.md`（新） | この報告 |

ほかのファイルは**変えていません**（直さない役。直す所は 4 に、直し方と出典つきで書きました）。台帳（`ledgers/`）にもパッチを書いていません。`flight-lab/kiso/` には触っていません。git の操作（commit・push・stash・reset・checkout・restore・clean）はしていません。

## 2. したこと

1. 差分を、ファイルごとに「変わった語の前後」だけを抜き出して読みました（`git diff --word-diff`。図の SVG は日本語の文字列と数字だけ）。序部の 3 章（`intro`・`basics`・`english`）は、一人目の事実確認（`factcheck-intro`・`factcheck-basics`・`factcheck-english`）の must と should が直っているかを確かめ、Node で本を読み込んで描いた本文を通して読み、数字を抜き取りで検算しました。
2. 一次資料は、2026-10-29 に取り直したものを使いました（同じ資料が前の単位の作業の場所にあったものは、ハッシュが同じことを確かめてから使いました）。
   - 米国の規則：eCFR の versioner API（2026-10-23 の版）で 14 CFR 23.2005・23.2135・23.2230・61.23・61.57・61.87・91.17・91.113・91.175、47 CFR 87.89 を本文で読みました。
   - AIM（FAA の HTML、今の版）：第 1-1・4-1・4-3・4-4・5-1・5-3・5-4・6-3・6-4・7-1・8-1・9-1 節。
   - NWS Instruction 10-813（2024-10-30）、AWH（FAA-H-8083-28B）、PHAK 第 17 章（FAA-H-8083-25C）、AFH 第 3・5・13 章（FAA-H-8083-3C）、IFH Addendum B、AC 120-51E、FAA-P-8740-2、FAA SAIB CE-10-11、FAA-S-ACS-6C、Archer III POH（VB-2266）、MGA の Archer III チェックリスト。
   - 磁気偏差：NOAA NCEI の計算機（WMM-2025、2026-10-27 の日付）で Sanford・那覇・羽田・新千歳・稚内を計算し直しました。
   - 日本の法令：W05 の e-Gov の写し（`textbook/rewrite/sources/egov/`、航空法は令和 7 年 12 月 1 日施行・施行規則は令和 8 年 10 月 1 日施行の版）の全 64 条を本文で読みました。航空局長通達（平成 31 年 1 月 31 日・国空航第 2278 号）、国土交通省の MSAS の資料（3-10）と報道発表、気象庁 中部航空地方気象台の空港気象ドップラーレーダーのページ、JCAB の学科試験例題集（自家用・2026 年 6 月。ハッシュが `book-terms.js` の記録と同じ）。
3. 閉じた ERRATA の行 101 行（fixed 96・not-error 3・wontfix 2）を 1 行ずつ、`where` に書かれた場所の今の文と照らし、直した文が一次資料と合うかを確かめました。RULINGS の閉じた 35 行も、囲みと本文の文と照らしました。
4. FLIGHT LAB・TEXTBOOK・CADET の速いテストを流しました（7）。

## 3. 結果の要約

- **数字と規則のほとんどは正しい**：`FL.jur` の米国の欄 47 項目は全部、eCFR・AIM・ACS・FMH-1・NOAA の文と合います（直すのは 1 項目だけ：下の M1）。日本の欄で「確認済み」の項目は全部、e-Gov の写しの条文と合います（第 5 条の VMC、第 174 条、第 177 条、第 178 条、第 179 条と第 82 条の 2、第 180〜186 条、第 189 条、第 198 条の 4、第 205 条、第 206 条、第 153 条、第 154 条、第 161 条、第 164 条の 15、第 53 条第 2 項、第 61 条の 2、第 63 条の 4、第 66 条・第 68 条・第 69 条の 2、航空法第 33・34・35・59・63・64・70・71 条の 2・73 条の 2・76 条・76 条の 2・81・82・91・94・96・97・98 条）。飲酒の通達の 0.2 g/L・0.09 mg/L と「原則」も通達の本文どおりです。〔要確認〕の札は、確かめられない所にだけ付いています。
- **W07a〜c・W07f・W07d の直し**（ここまで二人目の確認がなかった所）：POH の値（VO 113/98 KIAS・+3.8/−1.5 G・+4.4/−1.7 G・背面の運動の禁止・2.15 の運動・静止の全開 2,240〜2,340 rpm・赤線 2,700 rpm・降下 2,500 rpm・65% 9.5 gal/h と 75% 11.0 gal/h と 55% 8.2 gal/h・3.5k の部分的なヒート・ピトー静圧管 1 本（7.21）・最良滑空 76 KIAS は 2,550 lb の値）、SAIB の 4 条件、AFH（自動操縦を切らないのはよくある間違い・30° より深いバンクを避ける・重さと滑空・零横滑りのバンク 1.5〜2.5°・公表値は理想的な条件・風車状態のプロペラの抗力）、AWH（10.6.1.2・11.3.1・22.3・22.7.3・24.4・27.4・表 12-3）、PHAK 第 17 章（毎秒 2°・錯覚 3 つ）、AIM（8-1-2 の 5〜12 分と飛行高度、8-1-6 の赤い灯、6-3-2 の上昇と 91.3(b)、6-4-1、4-3-23、4-4-7、1-1-18、5-3-8 の DME の例、5-1-5・5-1-14）、14 CFR（23.2005(d)・23.2135(c)・23.2230・旧 23.1387・61.53・61.87(b)(n)(p)・61.89・61.93・61.95・91.185(c)(3)）、IFH Addendum B、AC 120-51E、FAA-P-8740-2、ACS の許容幅は、どれも一次資料の文と合います。
- **閉じた ERRATA の行 101 行は、全部その場所で直っています**（6）。ただし、RULINGS の閉じた行 `R.taf-groups` が置いた囲みの米国の欄に、古い値が 1 つあります（M1）。
- **直さないといけないもの（must）1 件**：`FL.jur` の `metar.taf` の米国の欄「PROB30/40（最初の 9 時間は使わない）」が、NWS の今の指示書と合わず、同じ節 `wx.taf` の本文「NWS が使うのは PROB30 だけ」とも食い違います。
- **直したほうがよいもの（should）2 件・細かいもの（nit）4 件**（4）。
- **序部**：一人目の事実確認の must（`basics` 3・`english` 1）と should は直っています（`basics.case` の羽田発の版・`basics.crew` の第 73 条と会社の職位・e-Gov の第 73 条の写し・`en.terms` の三つ組みの表・`intro.japan` の「主な道は 4 つ」と航空大学校・航空無線通信士の「取るかどうか」・`intro.japan` の出典の版）。抜き取りで検算した数字（換算・時刻・GS と偏流角・AGL）は全部合っています。
- **テスト**：FLIGHT LAB 80/80・TEXTBOOK 22/22・CADET 245/245（7）。

## 4. 直してほしいこと（場所・問題・直し方・出典）

### must

**M1．`flight-lab/src/book-jur.js` の `metar.taf` の米国の欄（`us`・`usSrc`）**（持ち主：W06。囲みは `wx.metar` と `wx.taf` に出る。CADET にも「米国の決まり」として出る）
- 問題：今の文は「NWS の TAF は FM・TEMPO（1 回 1 時間未満）・PROB30/40（最初の 9 時間は使わない）で、BECMG を使わない」。
  - NWS の TAF の書き方を決める NWS Instruction 10-813（2024-10-30。この本の `R.nwsi10813` と同じ版）は、付録 B の B2.9.4 で「PROB30 is the only PROB group used in NWS TAFs」と書き、表紙の変更点の一覧に「Appendix B Section 2.9.4 - Removed 9-hour PROB30 constraint in the first 9 hours」とあります。NWS は PROB40 を使わず、最初の 9 時間に PROB を使わない決まりもなくなりました。
  - 同じ節 `wx.taf` の本文の表は「PROB30：…（米国の国立気象局（NWS）が使うのは PROB30 だけ）」で、2024 年の指示書と合っています。囲みだけが古く、**同じ節の中で本文と囲みが食い違います**。
  - 古い文の出どころは AIM 7-1-29 の表（今の版でも「PROBability and 2-digit percent (30 or 40)」「NWS TAFS do not use PROB in the first 9 hours of a TAF」）です。AIM が NWS の指示書の改正に追いついていません。
- 直し方（案）：
  - `us`：「METAR は毎時。視程は SM。G は最大瞬間風速（山と谷の差が 10 kt 以上のとき）。NWS の TAF は FM・TEMPO（1 回 1 時間未満）・PROB30（PROB40 は使わない）で、BECMG を使わない」
  - `usSrc`：「AIM 7-1-28・7-1-29、FMH-1 5.4.4、NWSI 10-813（2024-10-30）付録 B 2.9.4」
  - `note` に 1 文：「AIM 7-1-29 の表はまだ PROB30/40 と『最初の 9 時間は使わない』を書くが、NWS の指示書（2024-10-30）は PROB30 だけを使い、9 時間の制限を外した」
  - 数字を描くテスト（`flight-lab/test/jur.test.mjs`）は `FL.jur` から描いた値と比べるので、文を直すだけで通るはずです（「PROB30/40」「最初の 9 時間」を決め打ちしているテストはありません。`grep` で確かめた）。
- 出典：NWS Instruction 10-813, Terminal Aerodrome Forecasts（2024-10-30）https://www.weather.gov/media/directives/010_pdfs/pd01008013curr.pdf の表紙の変更点と B2.9.4（2026-10-29 に読んだ）。AIM 7-1-29（FAA の HTML、2026-10-29 に読んだ）。
- あわせて（統合役）：DESIGN 3.4 の表の `metar.taf` の行「PROB30/40（最初の 9 時間は使わない）」を同じ形に。RULINGS `R.taf-groups` の `note` に「米国の PROB は PROB30 だけ（NWSI 10-813 2024 年版）」。

### should

**S1．`book-jur.js` の `solo` の米国の欄**（持ち主：W06。囲みは `solo.req`）
- 問題：「その型式の承認（90 日以内に訓練した教官）」は、「90 日以内に訓練をした教官」と読めます。同じ節の本文と「ここが大切」は「承認は型式ごと。訓練をした教官が、飛ぶ前 90 日以内に書く」で、90 日は**承認（ログブックへの記入）**の期限です。14 CFR 61.87(n) の文は「…endorsement … by an authorized instructor who gave the training within the 90 days preceding the date of the flight」で、どちらにも読める書き方ですが、61.87(p)(4) は「that endorsement remains current for solo flight privileges, provided an authorized instructor updates the student's logbook every 90 days thereafter」と、承認を 90 日ごとに書き足す決まりです。囲みと本文の読み方をそろえたほうが、取り違えません。
- 直し方（案）：「…その型式の承認（訓練をした教官が、飛ぶ日の前 90 日以内にログブックに書く。そのあとは 90 日ごとに書き足す）」。`usSrc` は「14 CFR 61.83・61.87(b)(c)(n)(p)」に。
- 出典：eCFR 14 CFR 61.87(n)・(p)（2026-10-23 の版）。

**S2．`book-jur.js` の `sbas`・`ws.alert` の日本の欄と、`kiso-errata.js` の確かめた中身のずれ**（持ち主：W06。`kiso-errata.js` は W11）
- 問題：`FL.jur` は「SBAS は MSAS〔要確認〕」「空港気象ドップラーレーダー・ドップラーライダー・METAR の WS 群〔要確認〕」と、まだ確かめていない扱いです。一方、同じ製品の基礎教材の訂正の重ね表示（`kiso-errata.js` の `msas`・`llws-japan`）は、国土交通省と気象庁の一次資料を引いて事実として書いています（W11 が確かめた）。私も読み直しました：国土交通省 航空局の資料 3-10 の題は「MSAS（衛星航法補強システム）」、報道発表（平成 29 年 8 月 25 日）は航空用の SBAS を「みちびき 3 号機」で提供すると書いています。気象庁 中部航空地方気象台のページは、空港気象ドップラーレーダーで低層ウィンドシアー（地表から概ね 500 m（1,600 ft）まで）を探知し、パイロットに伝えると書いています。DESIGN 3.4 は「確かめた値と確度は `FL.jur` が正」としているので、正のほうが古いまま残っています。
- 直し方（案）：
  - `sbas` の `jp`：「SBAS は MSAS（国土交通省 航空局。補強の信号はみちびき 3 号機から）。磁気偏差は約 6°W（那覇）〜約 10.5°W（稚内）（2026 年）」、`jpSrc` に国土交通省の資料 3-10（https://www.mlit.go.jp/koku/cidai/assets/pdf/3-10_JPN.pdf）。
  - `ws.alert` の `jp`：「空港気象ドップラーレーダーとドップラーライダーで、低層ウィンドシアーとマイクロバーストを探知する（気象庁）。METAR は WS の群で報じる。管制がどう伝えるかは〔要確認〕」、`jpSrc` に気象庁のページ。
  - 確度は、項目の中に〔要確認〕が残る間は `unverified` のまま（`w05` の扱いは W06 の決め方に従う）。UNVERIFIED `U.msas` は解ける（`U.ws-alert-japan` は管制の伝え方だけ残る）。
- 出典：国土交通省 航空局「MSAS（衛星航法補強システム）」（3-10）、国土交通省 報道発表 https://www.mlit.go.jp/report/press/kouku16_hh_000008.html 、気象庁 中部航空地方気象台「空港気象ドップラーレーダー」https://www.data.jma.go.jp/chubu-airport/ymyx/draw.html （どれも 2026-10-29 に読んだ）。

### nit

| # | 場所 | 問題 | 直し方 | 出典 |
|---|---|---|---|---|
| N1 | `book-2.js` `hf.body` の進入の錯覚の文「PHAK 第 17 章は black hole approach、AIM 8-1-5 は featureless terrain illusion と呼んでいます」（ERRATA `T.human.T1` の直し） | PHAK 第 17 章の見出しも「Featureless Terrain Illusion」で、その中で「This illusion, sometimes referred to as the "black hole approach,"」と書いています。PHAK が black hole approach と「呼んでいる」のではなく、「そうも呼ばれる」と書いています | 「PHAK 第 17 章と AIM 8-1-5 は featureless terrain illusion と呼び、PHAK は black hole approach とも呼ばれると書いています」 | PHAK（FAA-H-8083-25C）第 17 章 17-9 頁、AIM 8-1-5 |
| N2 | `book-2.js` `wx.taf`「定時の TAF は 1 日 4 回（00・06・12・18Z）出ます（NWSI 10-813 の 4.10）」 | 間違いではありません（指示書の表の「Scheduled Issuance」の時刻）。ただ、同じ表の発信の時間帯は 2320〜2340Z など、その 20〜40 分前です。TAF の発表時刻（例 141730Z）を読む練習で、00Z ちょうどに出ないことに戸惑うかもしれません | 「…（00・06・12・18Z の定時。発信はその 20〜40 分前）」 | NWSI 10-813 の 4.10 の表 |
| N3 | `book-1.js` `sys.carb` の「よくある間違い」の最後「（POH 4.5）」 | デトネーションの注意は POH の 4.5m（Approach and Landing）の説明にあります。4.5 は通常の手順の章全体の番号 | 「（POH 4.5m）」 | Archer III POH VB-2266 4.5m |
| N4 | `quiz.js` の q_wx「TAF の『TEMPO』の意味は？」の理由「PROB30/40 は確率」（R1 で変わっていない文。M1 と同じ話なので書いておく） | ICAO の書き方としては正しいが、米国の NWS の TAF は PROB30 だけ。学科テストは CADET の筆記試験も読む | 「PROB30（NWS は PROB30 だけを使う）は確率」など | NWSI 10-813 B2.9.4 |

## 5. 確かめた中身の記録

### 5.1 `FL.jur`（47 項目）

米国の欄は全部、日本の欄は「確認済み」の全部と〔要確認〕の項目の書き方を確かめました。〔要確認〕は、e-Gov にない告示・AIP・実施細則の所にだけ付いていて、推測の数字はありません。

| 項目 | 米国の欄 | 日本の欄 | 結果 |
|---|---|---|---|
| alt.transition | 91.121(a)（100 NM・18,000 ft・29.92） | 施行規則第 178 条（14,000 ft・QNH・出発点の標高・1013.2 hPa） | 合う |
| alt.unit | AIM 7-1（A 群） | 気象庁 航空気象通報式（W10 と統合で確認済み） | 合う |
| time | 15 U.S.C. 260a（3 月第 2 日曜〜11 月第 1 日曜） | 明治十九年勅令第五十一号、夏時間は〔要確認〕 | 合う |
| vmc・vmc.ad | 91.155(a)(c)(d) | 施行規則第 5 条第 2 号イ・第 4 号 | 合う |
| svfr | 91.157(b)(c)(e) | 航空法第 94 条ただし書・施行規則第 198 条の 4 | 合う |
| msa | 91.119(a)(b)(c) | 航空法第 81 条・施行規則第 174 条 | 合う |
| cruise | 91.159(a)（磁航路） | 航空法第 82 条（900 m）・施行規則第 177 条（磁方位・29,000 ft 未満） | 合う |
| speed | 91.117(a)(b)(c) | 航空法第 82 条の 2・施行規則第 179 条（250 kt） | 合う |
| fuel.vfr〔安全〕 | 91.151(a) | 航空法第 63 条（事業と IFR だけ）・施行規則第 153 条・第 73 条の 2・第 164 条の 15 | 合う |
| fuel.ifr | 91.167(a) | 施行規則第 153 条の表の六（45 分） | 合う |
| fpl | AIM 5-1-5（本土はふつう不要・ADIZ と国際は要る・強く勧める） | 航空法第 97 条第 2 項・施行規則第 205 条（9 km）・第 98 条 | 合う |
| row | 91.113(c)〜(f)（2025 年の改正後の (d)(2)〜(4)） | 施行規則第 180〜186 条 | 合う |
| lookout | 91.113(b) | 航空法第 71 条の 2 | 合う |
| pattern | 91.126(b)・91.127(a)・AIM 4-3-3 | 施行規則第 189 条（左回りの定めなし）・航空法第 96 条 | 合う |
| night | 1.1 | 航空法第 64 条 | 合う |
| solo | 61.83・61.87 | 航空法第 35 条・施行規則第 68 条・第 69 条の 2 第 4 項 | 合う（米国の書き方は S1） |
| check.slow・stall・short・basic | ACS-6C の PA.VII.A・B・C、IV.E、VIII（許容幅） | 実施細則は〔要確認〕 | 合う |
| alcohol〔安全〕 | 91.17(a)（8 時間・0.04・血液 1 dL か呼気 210 L） | 航空法第 70 条（第 69 条の航空機乗組員の定義）・通達（原則・0.2 g/L・0.09 mg/L） | 合う |
| medical | 61.23(a)(3)・61.113(i) | 航空法第 31 条・施行規則第 61 条の 2 | 合う |
| english.radio | 61.83(c)・61.103(c)・47 CFR 87.89(d)(4) | 航空法第 33 条・施行規則第 63 条の 4、無線の資格は〔要確認〕 | 合う |
| oxygen | 91.211(a) | 法令に条なし、〔要確認〕 | 合う |
| light | 91.125・AIM 4-3-13 | 施行規則第 202 条、〔要確認〕 | 合う |
| nordo.vfr | AIM 6-4-1・6-4-2 | 施行規則第 206 条第 1 号 | 合う |
| nordo.ifr | 91.185(c) | 施行規則第 206 条第 2〜3 号（「大臣が定める時間」は〔要確認〕） | 合う |
| readback | AIM 4-4-7・4-3-18 | 〔要確認〕（ICAO の分は Annex 11 の 3.7.3 で確かめられる：`comm.icao` の本文は確かめた形） | 合う |
| words | P/CG・AIM 4-3-18 | 〔要確認〕 | 合う |
| xpdr | AIM 4-1-20（1200・高度に関係なく） | 施行規則第 146 条第 2 号、コードは〔要確認〕 | 合う |
| adsb | 91.225(d)（A・B・C・30 NM・10,000 ft・2,500 ft の除外） | 法令に定めなし、〔要確認〕 | 合う |
| lights.ac | 91.209(a)(b) | 航空法第 64 条・施行規則第 154 条 | 合う |
| aerobatic | 91.303・91.307(c) | 航空法第 91 条・施行規則第 197 条〜第 197 条の 3 | 合う |
| preflight | 91.103(a)(b) | 航空法第 73 条の 2・施行規則第 164 条の 15 | 合う |
| docs | 91.203・91.9 | 航空法第 59 条・施行規則第 144 条・第 144 条の 2 | 合う |
| accident | 49 CFR 830.5 | 航空法第 76 条・第 76 条の 2 | 合う |
| ir.need | 61.3(e) | 航空法第 34 条・施行規則第 66 条（110 km・30 分） | 合う |
| ir.recent | 61.57(c)(1) | 航空法第 69 条・施行規則第 161 条 | 合う |
| appr.ban | 91.175(f) は Part 121・125・129・135 | 施行規則第 189 条第 1 項第 2・3 号 | 合う |
| hold | AIM 5-3-8（200/230/265 KIAS・3°/秒・30°・25°） | 〔要確認〕 | 合う |
| circle | AIM 5-4-20（円弧・区分と高度で半径） | 〔要確認〕 | 合う |
| metar.taf | AIM 7-1-28・29、FMH-1 | 例と〔要確認〕 | **M1**（米国の PROB） |
| charts | AIM 9-1・7-1-2（1800wxbrief） | 〔要確認〕 | 合う |
| sbas | AIM 1-1-18、WMM-2025（Sanford 7.09°W） | WMM-2025（那覇 5.86°W・稚内 10.54°W：計算し直して同じ） | 合う（日本の MSAS は S2） |
| multi.rating | 61.63(c)(1)(2)(4) | 航空法第 25 条・施行規則第 53 条第 2 項 | 合う |
| ws.alert | AIM 4-3-7（LLWAS はウィンドシャーとガストフロント・マイクロバーストは出さない） | 〔要確認〕 | 合う（S2） |

### 5.2 W07a〜c・W08 の本文（`book-1.js`〜`book-5.js`・`book-comm.js`）

- `aero`：揚力の式の V＝TAS と動圧・指示失速速度（PHAK）、上面の圧力（R.lift-lower-surface）、自動操縦を最初に切る・切らないのは AFH の「よくある間違い」（AFH 第 5 章の Common errors 9）、ベースからファイナルの cross-control と 30° のバンク（AFH 第 5 章）、荷重倍数（PHAK）、POH 2.15・2.17・2.3、14 CFR 23.2005(d)（実用類なし）、上反角と横滑り（PHAK 第 5 章）、V-n 線図の制限と終極（23.2230 の 1.5）。合う。
- `sys`：航空灯の 110°・140°（旧 23.1387）、AIM 4-3-24、POH の回転数と降下、マグネトー、ミクスチャー、キャブレターヒート（POH 3.5k）、燃料 48 US gal、SAIB の 4 条件、CAS（PHAK 第 8 章）、静圧の詰まり、ピトー静圧管 1 本（POH 7.21）。合う（POH の節番号の細部は N3）。
- `perf`：湿度（PHAK 第 4 章・FAA-P-8740-2 の「engine power rather than aerodynamic efficiency」・10%）、50 ft を越える距離、柔らかい地面、x3 の簡略化（チェックリストの 25°・55 KIAS）、燃料流量の混合比。合う。
- `wx`：AWH の各節（上の 3）、前線の速さと換算、NWS Melbourne、マイクロバーストで機首を下げすぎない（AWH 22.7.3.1「maintaining or increasing pitch attitude and accepting lower-than-usual airspeed」）、かたよったマイクロバースト、FEW と雲量の数え方（AWH 24.4 の例）、TAF の 24・30 時間、TEMPO 1 回 1 時間未満（AIM 7-1-29・NWSI 10-813）、61.89 の視程。合う（M1・N2）。
- `law`・`hf`：ノータムと航空情報、61.53、AIM 8-1-1 の自己点検（「pilot impairment contributes to many more accidents than failures of aircraft systems」）、8 時間・3 時間・12〜24 時間（AIM 8-1-1）、錯覚 3 つ（AIM 8-1-5・PHAK）、毎秒 2°（PHAK の文のまま）、5〜12 分（AIM 8-1-2）と PHAK 図 17-1 の「30 minutes or more」、飛行高度（AIM 8-1-2）、赤い灯（AIM 8-1-6）。合う（N1）。
- `comm`：課目の台本と `bk.sim`、AIM 4-3-23（ダウンウインドに入るときに頼む・5 つの中身）、AIM 6-3-2（許可なく上昇・降下しない、91.3(b)）、ICAO Annex 11 の 3.7.3。合う。
- `ground`・`ops`・`tl`・`emg`・`solo`：SAIB、AFH 第 5 章の低速飛行、AIM 4-3-2 の「at least 1/2 mile beyond the departure end」、POH 3.3 の 76 KIAS（2,550 lb）と AFH 第 3 章の重さと滑空、61.87(b) の範囲（Part 61・91）、61.89・61.93(b)(1)(2)・61.87(o)・61.95・91.131(b)(2)・141.85。合う。
- `navp`・`navr`・`navd`：自差の E/W と FOR/STEER、例題 095＋7−1＝101、91.151(a) の first point of intended landing、POH の燃料流量 3 つ、AIM 5-1-5・5-1-14（30 分）、風の磁方位の注。合う。
- `ifr`・`ifrp`：61.3(e)・61.57(c) の「IFR か VFR の最低気象条件未満」、91.185(c)(3)、AIM 1-1-18 の WAAS の代替飛行場、AIM 5-3-8 の DME の例（10 NM・5 NM → 15 NM）、HAT と HAA、IFH Addendum B（9°・12°・6°）。合う。
- `me`・`oei`・`crm`・`jet`・`sim`：23.2135(c)（Vmc の定義と critical loss of thrust）、零横滑りのバンク 1.5〜2.5°（AFH 第 13 章）、公表値は参考値・二次資料（AFH の ideal flight testing conditions）、84% と 3 割の計算、AC 120-51E（error prevention, detection, and recovery）、ICAO Doc 9683 の 3 つ、AC 120-111、121.404、61.4・AC 61-136B・Part 60。合う。
- W08 の囲み：本文に数字を手で書いていません（`bk.jur`・`bk.same` だけ）。描く値は `FL.jur` と同じことを `jur.test.mjs` が確かめています（7）。

### 5.3 図・学科テスト・課目・用語の表・CADET

- `book-figs.js`：変わった文字列 213 行のうち事実の数字（雲の高さ＝AWH 表 12-3 の温帯、V-n の 97 kt＝50×√3.8、資格の年齢と時間、1500Z・1400Z の換算、inHg と hPa、NM・SM・ft、IFH の偽の道、AIM 3-4 の警告空域 3 NM、セクショナルの記号）は合う。前の版からある文字列は対象外。
- `quiz.js`：q_perf の VO 113/98、q_radio の as soon as practicable（AIM 6-4-1 の NOTE）、q_nav の自差 2°W（258°）、q_me の風車状態の抗力（AFH 第 13 章「as great as the parasite drag of the entire airframe」）、q_crm の TEM の言い方。合う。
- `syllabus.js`：a7・a8 のブリーフと `stallRecovery` の順番（AFH 第 5 章の型）、段階の番号（判断 8）。合う（〔安全〕の中身の審査は安全レビューの役）。
- `book-terms.js`：抜き取りで、学科試験例題集（自家用・2026 年 6 月。ハッシュ一致）の「迎え角」「昇降舵」を確かめた。条文の語は `terms.test.mjs` が e-Gov の写しと照らしている（通る）。
- `cadet/src/content/`：段階の番号と、日本の側だけを消す処理（`usSideOnly`）。事実の文の変更はない。

## 6. 閉じた ERRATA の行の確認（101 行）

`where` の場所の今の文を 1 行ずつ読み、直した文を一次資料と照らしました。

| まとまり | 行 | 結果 |
|---|---|---|
| 教科書 第 1 部（`T.aero.*` 14・`T.systems.*` 11・`T.instruments.*` 4・`T.wb-perf.*` 6・`T.weather.*` 7・`T.law.*` 5・`T.human.*` 10） | 57 | 全部直っている（`T.human.T3`・`T.human.T11` は not-error の理由が一次資料どおり）。`T.human.T1` は直っているが言い方の細部が N1 |
| 教科書 第 2〜6 部（`T.navigation.*` 3・`T.vfr.*` 2・`T.ifr.*` 7・`T.multi.*` 6・`T.overview.T1`） | 19 | 全部直っている |
| `T.overview.T2`（not-error）・`T.overview.T3`（wontfix） | 2 | 理由が正しい（AC 61-136B は現行、ID は変えない決まり 1） |
| 基礎教材（`K.overview.K1`〜`K6`・`K.aero.K-1`・`K.ifr.K-6`） | 7 | 直っている（K1・K-1 は問題の表示の作り直しでテストが確かめる。K-6 の wontfix は決まり 12 のとおり） |
| アプリ（`APP.*` 10）・課目（`SYNC.*` 6） | 16 | 直っている（`SYNC.x3-short-field` の 25°・55 KIAS はチェックリストどおり、`SYNC.comm-*` は課目の台本どおり） |

RULINGS の閉じた 35 行：`R.taf-groups` だけ、置いた囲みの米国の欄に M1 の古い値があります。ほかの 34 行は、本文と囲みが裁定どおりで、一次資料とも合います（`R.tempo-length` の「米国も 1 回 1 時間未満」、`R.right-of-way` の第 186 条、`R.vfr-fuel-law` の第 63 条、`R.alcohol` の第 70 条と通達、`R.approach-ban` の第 189 条と 91.175(f)、`R.nordo-landing` の第 206 条第 1 号など）。

## 7. 検査の結果

| 製品 | コマンド | 結果 |
|---|---|---|
| FLIGHT LAB | `cd flight-lab && npm run -s test:fast` | **80/80 pass**（fail 0） |
| TEXTBOOK | `cd textbook && npm test` | **22/22 pass**（fail 0） |
| CADET | `cd cadet && npm run -s test:fast` | **245/245 pass**（fail 0） |

ブラウザのテストは統合役の全部の実行で流れます（この役は流していません）。

## 8. 台帳の行

触った行はありません（直さない役。パッチも書いていません）。W12 の署名（`checkedBy`）の材料として：

- 二人目として確かめて、署名してよいと考える行：ERRATA の閉じた 101 行のうち `T.human.T1` を除く 100 行（`T.human.T1` は N1 を直すか、直さないと決めてから）。RULINGS の閉じた 35 行のうち `R.taf-groups` を除く 34 行。
- 署名を待ってほしい行：RULINGS `R.taf-groups`（M1 を直してから）。
- UNVERIFIED：`U.msas` は解ける（S2 の資料）。`U.ws-alert-japan` は「管制がどう伝えるか」だけが残る。

## 9. 未解決のこと

- `kiso-errata.js`（W11）は、この役の対象のファイルの列（`book-*.js`・`quiz.js`・`syllabus.js`・`book-jur.js`・`book-terms.js`・CADET の `content/`）の外です。日本の法令の項目の照合は「日本の法令レビュー」の役（PROGRESS の「次」の 2）に任せ、ここでは `FL.jur` との食い違い（S2）だけを見ました。読んだ範囲（`vmc`・`nordo`・`min-safe-alt`・`ifr-recency`・`ifr-fuel`・`alt-setting-japan` の数字）は e-Gov の写しと合っていました（`atc-services` の施行規則第 199 条は写しにないので、照らしていません）。
- 日本に夏時間がないこと（`time`）は、今回も一次資料で確かめられませんでした（e-Gov の API で廃止された法令の検索ができない）。〔要確認〕のままでよい。
- AIM 7-1-29 と NWSI 10-813 の食い違い（M1）は FAA の側の遅れです。AIM が直ったら、`note` の 1 文を消せます。

## 10. ほかの単位にお願いしたいこと（needs from others）

| 相手 | 直すもの | 中身 |
|---|---|---|
| W06（`flight-lab/src/book-jur.js`） | `metar.taf` の `us`・`usSrc`・`note` | M1 の文に（PROB30 だけ、9 時間の制限を消す、NWSI 10-813 の B2.9.4 を出典に） |
| W06 | `solo` の `us`・`usSrc` | S1 の文に（承認の 90 日、61.87(p)） |
| W06（W11 と相談） | `sbas`・`ws.alert` の `jp`・`jpSrc` | S2 の文に（MSAS と気象庁の探知。管制の伝え方だけ〔要確認〕） |
| `flight-lab/src/book-2.js` の持ち主（R2 では W17・W20） | `hf.body` の 1 文、`wx.taf` の 1 文 | N1・N2 |
| `flight-lab/src/book-1.js` の持ち主 | `sys.carb` の出典 | N3（POH 4.5m） |
| `flight-lab/src/quiz.js` の持ち主（W50） | q_wx の TEMPO の問の理由 | N4 |
| 統合役 | DESIGN 3.4 の表の `metar.taf` の行、RULINGS `R.taf-groups` の `note`、UNVERIFIED `U.msas` | M1・S2 に合わせる。8 の署名の材料を W12 の署名に使う |
