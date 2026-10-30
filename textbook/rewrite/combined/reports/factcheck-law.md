# 事実確認の報告：第 1 部 第 12 章 `law`「規則と空域（14 CFR と米国の空域）」（W19 の下書き、R2）

単位：factcheck-law（W19 の law の事実確認役。下書きは書いていない）。作業日：2026-10-30。
対象：`textbook/rewrite/combined/drafts/law.js`・`law-figs.js`・`law.claims.json`（W19）。照らしたもの：DESIGN 6.2（15 の決まり）・3.3（第 1 部 章 12）・3.4・4.2（kiso09）、DECISIONS.md、STYLE.md、W19 の報告 `reports/W19-law.md` とパッチ `reports/W19-law.ledger.json`。
**下書き・台帳・製品のファイルは 1 つも変えていません。** 変えたのはこの報告だけです。直しの案は下の 4 にまとめました（直すのは W19 か、この章の改稿の単位）。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck-law.md`（新） | この報告 |

作業中の事故の記録：eCFR を取り寄せるコマンドの書き方を誤り、171 バイトのエラー応答のファイル 4 つ（`p1.xml`・`p61.xml`・`p830.xml`・`s8718.xml`）がリポジトリの最上位にできた。すぐに消した（自分が作ったファイルだけ。`git status` に残りはない）。

## 2. 確かめ方（一次資料。どれも 2026-10-30 に元の URL から新しく取り寄せて本文を読んだ）

| 資料 | 取り寄せ方 | 確かめた所 |
|---|---|---|
| 14 CFR Part 91（eCFR versioner API、2026-10-28 の版） | `api/versioner/v1/full/2026-10-28/title-14.xml?part=91` | Authority（49 U.S.C. …・条約第 12 条・第 29 条）、91.1・91.3・91.7・91.9・91.103・91.113・91.117・91.119・91.123・91.126・91.127・91.129・91.130・91.131・91.133・91.137・91.141・91.143・91.145・91.151・91.155・91.157・91.203・91.205・91.207・91.209・91.213・91.215・91.225・91.409・91.411・91.413・91.703、付録 D の Section 1（Orlando International Airport あり）・Section 3（SVFR 禁止の空港。Orlando はない）・Section 4 |
| 91.113 の版の履歴（eCFR `versions/title-14.json?section=91.113` と各版の本文） | 2024-11-01・2025-01-21・2025-07-24・2025-10-22 の版を並べた | (d) の文が変わったのは **2025-10-22 の版**。2025-07-24 の版は「90 FR 35220 の改正へのリンク」が付いただけで、(d) の文は前のまま |
| Federal Register API（MOSAIC の最終規則） | `federalregister.gov/api/v1/documents.json` | "Modernization of Special Airworthiness Certification"（90 FR 35034、2025-07-24 公布）、"This final rule is effective October 22, 2025, except for …"。訂正（90 FR 40041）も effective 2025-10-22 |
| 14 CFR Part 61（同じ版） | `…?part=61` | 61.3(a)(c)、61.19(b)(c)、61.23(a)(3)・(c)(3)・(d) の表、61.51(a)・(i)、61.56(a)(c)(d)(g)、61.57(a)(b)(c)、61.87(n)(o)(p)、61.89、61.95 |
| 14 CFR 1.1（同じ版） | `…?part=1` | Air traffic clearance・Ceiling・Controlled airspace・Flight visibility・Ground visibility・Night |
| 49 CFR Part 830（eCFR、2026-10-28 の版） | `…/title-49.xml?part=830` | 830.2（Aircraft accident・Incident・Operator・Substantial damage と除外）、830.5（すぐに知らせる・最寄りの NTSB・(a)(1)〜(12)・(b)）、830.6、830.10、830.15 |
| 47 CFR 87.18（同じ） | `…/title-47.xml?part=87&section=87.18` | (b) 国際の飛行・交信をしなければ licensed by rule |
| FAA AIM（2026-07-09 有効の版。HTML） | aim_html の chap3_section_2・3_3・3_4・3_5、chap4_section_4、chap5_section_1・5_6 | 3-2-2・3-2-3・3-2-4（5 NM・10 NM の棚・charted in MSL・"(callsign) standby"・remain outside）・3-2-5・3-2-6（10,000 ft MSL 以上の装備・14,500〜18,000 ft・"below 1,500 feet above the surface"・700/1,200 ft）、3-4-2〜3-4-6、4-4-1、5-1-3（題は Notice to Airmen (NOTAM) System）、5-6-13 |
| FAA AIM の PDF（`AIM_Basic_w_Chg_1_and_2_and_3_dtd_7-9-26_FINAL.pdf`、43 MB を全文テキストにした） | NEW_R.aimPdf の URL | Publication Schedule（Basic 2/20/25・Chg 1 8/7/25・Chg 2 1/22/26・Chg 3 7/9/26・次の Basic 12/24/26）、Flight Information Publication Policy d（"while not regulatory, provides information which reflects examples of operating techniques and procedures which **may be** requirements in other federal publications or regulations"）、Code of Federal Regulations and Advisory Circulars（"Unless incorporated into a regulation by reference … not binding on the public"） |
| PHAK FAA-H-8083-25C 第 1 章・第 15 章 | NEW_R.phak1・phak15 の PDF | Title 14 "Aeronautics and Space"・Title 14 CFR Chapter 1 = FAA、part 61・part 91 の中身、AC は "not regulations"、FDC NOTAM は "regulatory in nature"、NOTAM の時刻は UTC の 10 桁、Class E の下限（多く 1,200 ft AGL、ほかに地表か 700 ft AGL）、Class G |
| FAA AIS の VFR Raster Charts・Chart Supplements のページ | NEW_R.faaVfrCharts・faaChartSupp | Digital Visual Charts (56-Day Sets) の今の版 Oct 29 2026・次 Dec 24 2026、"issued by FAA every 56 days" |
| US AIP GEN 1.7 | NEW_R.aipGen17 | 題 "Differences From ICAO Standards, Recommended Practices and Procedures" |
| FAA JO 7110.65 7-9-2 | atc_html/chap7_section_9.html | "CLEARED THROUGH/TO ENTER/OUT OF BRAVO AIRSPACE"、VFR は CFR の違反になるなら ATC に言う（NOTE） |
| FAA From the Flight Deck: SFB | R.sfb | "The airspace at SFB is Class C and underlies Orlando Class B airspace" |
| Private Pilot ACS（FAA-S-ACS-6C） | R.acsP の PDF | 節の `faa` の要素の文（PA.I.A.K1〜K5、PA.I.B.K1〜K4、PA.I.D.K1・K2・K6、PA.I.E.K1・K3・K4、PA.I.H.K2、PA.II.A.K2、PA.III.A.K8、PA.III.B.K3、PA.VI.C.K2、PA.XII.A.K2） |
| e-Gov 法令 API v2：航空法 第 1 条（令和 7 年 12 月 1 日施行の版 `327AC0000000231_20251201_507AC0000000055`） | `laws.e-gov.go.jp/api/2/law_data/…?elm=MainProvision-Article_1` | 「国際民間航空条約の規定並びに同条約の附属書として採択された標準、方式及び手続に準拠して」 |
| e-Gov の写し `textbook/rewrite/sources/egov/articles/` | 写しを読んだ | 航空法第 2 条第 12〜14 項・第 64 条・第 76 条の 2、施行規則第 5 条・第 174 条・第 179 条・第 180 条・第 186 条・第 198 条の 4（`bk.jp` と FL.jur の囲みの日本の欄の抜き取り） |
| 基礎教材 kiso09（原本、読むだけ） | `flight-lab/kiso/data/kiso09.json`・`fig/ch09-fig9-2.svg` | 本文・記述問題 q1〜q28・用語との文字の重なり（9）、図 9-2 の文字 |

道具：`node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/law-figs.js textbook/rewrite/combined/drafts/law.js --claims-out=…`（抜き出した主張と `law.claims.json` の突き合わせ）、図 5 枚（新しい 3 枚と描き直し 2 枚）を Chromium 390 px（2 倍）で PNG にして目で見た（スクリプトと PNG は scratchpad。リポジトリには置いていない）、kiso09 との 14 字以上の文字の重なりの検査、`NEW_R` の 9 つの URL が開くこと（どれも 200/206）。

## 3. 結果の要約

- 主張の札 219 行（条文 179・参考値 40、うち例題 7）：`--claims-out` の抜き出し 219 行と `law.claims.json` の 219 行は **ID も文も全部一致**（札のない主張 0）。**210 行は一次資料と合う**。should の 4 行と nit の 5 行は、文か出典を直してから署名する（5）。FL.jur が描く囲みの行（W06 の値）は、米国の欄を eCFR で、日本の欄の 7 条を e-Gov の写しで抜き取って確かめた（どれも合う）。
- 計算：全部を計算し直した（6）。誤りなし。
- 図：新しい 3 枚と描き直し 2 枚を一次資料と照らし、390 px の PNG で見た（7）。数字と向きの誤りはない。`lawCurrency` の「例」の行が下の計算演習と食い違って読める（S3）。
- 本文（札の行の外も含む）の問題：**must 0・should 3・nit 16**（下の 4）。
- 日米の書き分け：check-jurisdiction は error 0。全節 `scope: 'us'`、日本の法令の名前と条番号は `bk.jp` 3 つと FL.jur の囲みの中だけ（8）。
- 基礎教材の写し：本文はなし。記述問題 q7 の問いの最初の文が原文とほぼ同じ（nit N10。いちばん長い重なりは 22 字）。

## 4. 問題と直しの案（重い順）

### must（直すまで登録しない）

なし。

### should（直すのがよい。登録の前に直すことを勧める）

**S1. 「91.113 は 2025 年 7 月に改正されました」が、施行の日と違う（`law.basis`「適用の時点」の段落・札 `law.basis#3d938d0f`。関連：`law.rules` の「（米国の 2025 年の改正の順）」・札 `law.rules#1e46567f`）**
- 今の文：「たとえば米国の 91.113（進路権（優先権、right-of-way）の決まり）は、2025 年 7 月に改正されました（14 CFR 91.113 の改正の記録）。古い教本の文は、今の規則と違うことがあります。」
- 一次資料：改正（Amdt. 91-381、MOSAIC の最終規則 90 FR 35034）は **2025-07-24 に公布、2025-10-22 に施行**（Federal Register：「This final rule is effective October 22, 2025, except for …」）。eCFR の 91.113 の版も、(d) の文が変わったのは **2025-10-22 の版**で、2025-07-24 の版は「改正へのリンク」が付いただけ（(d) は前の文のまま）。この節は「いつの版か」を教える段落なので、公布と施行を取り違える例はよくない。
- もう 1 つ：2025 年の改正で変わったのは書き方（「powered aircraft」にまとめた）で、**種類の順は前と同じ**（前の文でも (d)(2)(3) と「However, an aircraft towing or refueling … has the right-of-way over all other engine-driven aircraft」で、気球 > グライダー > 曳航・給油中の機 > 飛行船 > ほかの動力機）。`law.rules` の「（米国の 2025 年の改正の順）」は、順が 2025 年に変わったように読める。
- 直しの案：`law.basis`「たとえば米国の 91.113（…）は、2025 年 7 月に改正が公布され、10 月 22 日から新しい文になりました（14 CFR 91.113 の改正の記録）。公布の日と、守る日（施行の日）が違うことがあります。古い教本の文は、今の規則と違うことがあります。」。`law.rules`「…ほかの動力機 の順です（米国の 91.113(d)）。」（「改正の順」を外す）。札 2 行の出典に「90 FR 35034（2025-07-24 公布、2025-10-22 施行）」を足す。確認問題 5 の問い「2025 年に改正された 91.113 で」は誤りではない（施行も 2025 年）ので変えなくてよい（決まり 4）。

**S2. 迎撃されたときに伝えることを「自分の名前」と書いている（`law.special`「迎撃されたら」・札 `law.special#7c61fb29`。関連：`#cec34b03`）**
- 今の文：「121.5 MHz（緊急の周波数）で呼び、自分の名前・位置・飛行の目的を伝えます。」「機体を確かめ、向きを変えさせ、交信するためです（AIM 5-6-13）。」
- 一次資料：AIM 5-6-13 の Summary of Intercepted Aircraft Actions「Attempt to establish radio communications with the intercepting aircraft or with the appropriate air traffic control facility by making a general call on guard frequencies (121.5 or 243.0 MHz), giving the **identity**, position, and nature of the flight.」。identity は機体の識別（コールサイン）で、操縦する人の名前ではない。迎撃の理由は「include, but are not limited to: Identify / Track / Inspect / Divert / Establish communications」。
- 直しの案：「迎撃機か管制機関を 121.5 MHz（緊急の周波数）で呼び、機体の識別（コールサイン）・位置・飛行の内容を伝えます。」「機体を確かめる・追う・調べる・向きを変えさせる・交信する、などのためです（AIM 5-6-13）。」。札 2 行を作り直す。用語の表の行（`Interception`）は今のままでよい。

**S3. 図 `lawCurrency` の「例：フライトレビュー（24 暦月）・身体検査証明（第 3 種）」が、すぐ下の計算演習の答えと食い違って読める（`law.pilot`・`law-figs.js` の `lawCurrency`）**
- 図の①は「3 月 10 日に受けた → 2028 年 3 月 31 日まで」の帯 1 本で、その下に「例：フライトレビュー（24 暦月）・身体検査証明（第 3 種）」。帯の日付は、フライトレビュー（61.56(c)）と 40 歳以上の第 3 種（61.23(d)(3)(ii)：24th month）には合うが、40 歳未満の第 3 種は 60th month（61.23(d)(3)(i)）で **2031 年 3 月 31 日**。同じ節の計算演習（30 歳・2026 年 3 月 10 日）の答え ① は 2031 年 3 月 31 日なので、図の帯を身体検査証明の期限と読むと答えと合わない。
- 直しの案：図の 116 行の文字を「例：フライトレビュー（24 暦月）。身体検査証明も月の終わりまで数える」に（帯はフライトレビューだけの例と分かる）。または「例：フライトレビュー（24 暦月）」だけにして、身体検査証明は本文の表に任せる。キャプションは今のままでよい。

### nit（小さな直し）

- **N1.** `law.airspace` の Class E の行「ただし、地上 1,500 ft **以下**などは除く」（札 `law.airspace#e3f8c40e`）：AIM 3-2-6 は「the airspace **below** 1,500 feet above the surface of the earth」。→「地上 1,500 ft **未満**などは除く」。
- **N2.** AIM の書き方は「requirements … **may be**」（Flight Information Publication Policy d）。本文「ほかの規則で求められる手順の例を示す」（札 `law.basis#3d3c3588`）と確認問題 6 の理由「ほかの規則で求められる手順の例を示すと書いている」は、少し強い。→「ほかの規則で求められることがある手順の例を示す」。問 6 の選択肢 A は変えなくてよい（正解の向きは同じ）。
- **N3.** `law.airspace` の `bk.jp`：航空法第 2 条第 13 項・第 14 項は「空港等並びに（及び）**その付近の**上空の空域」。今の「空港等とその上空の空域」（札 `#35e34707`・`#3e5cfcc5`）は、空港の真上だけに読める。→「空港等とその付近の上空の空域」。
- **N4.** `law.pilot` の「考えてみよう」の答え「…完全に止まるまでの着陸を 90 日以内に 3 回」（札 `law.pilot#76dcc557`）：61.57(b) は「three takeoffs and three landings to a full stop」。→「…離陸と、完全に止まるまでの着陸を、90 日以内に 3 回ずつ」（表の行と同じ形）。
- **N5.** `law.vfr`「この条件を満たさないときも、管制承認を受ければ、特別有視界飛行方式で飛べます」：91.157(a) は地表まで設定された管制空域の横の範囲の中・10,000 ft MSL 未満だけで、付録 D の Section 3 の空港では使えない。同じ節の問の答えは「飛べることがあります」と正しく書いている。→「…管制承認を受ければ、その地表区域の中で、特別有視界飛行方式（special VFR）で飛べることがあります」。
- **N6.** `law.basis`「14 CFR は、連邦の法律（合衆国法典の第 49 編）にもとづいて FAA が定める規則です」：Title 14 には FAA（Chapter I）のほかに運輸省・NASA などの章もある（PHAK 第 1 章「Title 14 CFR Chapter 1, Federal Aviation Administration」）。→「14 CFR の第 I 章（Part 1〜199）は、…FAA が定める規則です」か、「FAA の規則は 14 CFR にあります」。
- **N7.** `law.pilot`「残骸と記録は、けが人を助けるときなどのほかは、動かさずに残します（830.10）」：830.10 は、残骸・郵便・貨物は動かさない（例外：閉じ込められた人やけが人を出す・残骸をさらに壊さない・公衆を守る）、記録は保存する、と分けて書く。→「残骸は、けが人を助けるときなどのほかは動かさず、記録も残します（830.10）」。
- **N8.** `law.basis` の思い出そう「VMC・IMC は、天気の区分です」：ファイルの頭の注は「有視界気象状態・計器気象状態」を初出の形で書いたとするが、本文にこの 2 語はない（`FL.terms` の `vmc` の正式名は有視界気象状態）。→「有視界気象状態（VMC）と計器気象状態（IMC）は、天気の区分です」。
- **N9.** 図 `vfrTwoViews`：縦は 50 px＝500 ft で比例だが、右の箱の横（中心から 82 px）は 2,000 ft を表さず、縦の 1,000 ft（100 px）より短く見える。→ 箱の左右の端に「≈」の切れ目を描くか、キャプションに「横は縮めて描いています」。
- **N10.** 記述問題 q7 の問いの最初の文「整備の担当者から「準備は済みました」と聞き、機長は自分の確認を終えようとしています。」は、kiso09.q7 の「担当者から「準備は済みました」と聞き、機長は確認を終えようとしています。」に 2 語を足しただけ（22 字と 14 字が同じ）。答えは書き直してある。→ 問いも書き直す（例「給油と点検をした人が『準備はできています』と言いました。機長は、自分でも確かめる必要がありますか。」）。
- **N11.** 図 `airspace`（今の図、この章では描き直していない）のキャプション「Class B は許可」と図の中の「許可が要る」が、本文と用語の表の「管制承認」（`FL.terms` の正式名）とそろっていない。図は W21 の持ち物（13 の 3）。
- **N12.** `NEW_R.aimPdf` の URL は Change 3 の版の PDF で、次の Basic（2026-12-24 有効）が出ると古くなるか消える。`NEW_R.faaVfrCharts` の題の「2026-10-29 の版」も 2026-12-24 に古くなる。→ aimPdf は題に版を書いたまま、登録のときに版を確かめる手順を報告に残すか、FAA の Air Traffic Publications のページ（`https://www.faa.gov/air_traffic/publications/`）を並べる。faaVfrCharts の題は「（56 日ごとの版）」だけにする。
- **N13.** 札の種類：14 CFR を名指す文が `参考値`（`law.basis#5798e01d`・`#a610691c`・`#fc700671`）、AIM の方針を出典にする文が `条文`（`law.basis#d0b758d0`）。`about` の決まり（AIM は参考値、14 CFR は条文）にそろえる。中身は合っているので、札を直せば署名してよい。
- **N14.** `faa` の要素：`law.pilot` は第 3 種の期限と BasicMed を教えるのに、PA.I.A.K3（Medical certificates: class, expiration, …）と PA.I.A.K5（BasicMed）が入っていない。PA.I.H.K2（飲酒と薬の規則）は ACS-MAP の行が `law.pilot` を挙げているので残してよいが、本文は `hf.self` へのリンクだけ。→ `law.pilot` の `faa` に PA.I.A.K3 を足す（ACS-MAP の PA.I.A.K3 の `sections` にも `law.pilot` を足すのは W42）。PA.I.E.K4（SVFR）は本文が `law.vfr` にあるので、`law.vfr` にも足すとよい。
- **N15.** DESIGN 3.3 の `law.basis` は「＋新（日米の資料の格の表）」。下書きは米国の表と、日本の層を文で書いた `bk.jp`。事実の誤りではないが、表にするかは W19・統合役が決める。
- **N16.** `law.airspace` の Class C の行「半径 10 NM で 1,200〜4,000 ft の棚」：AIM 3-2-4 は棚も「above the airport elevation」。→「半径 10 NM で、空港の標高の上 1,200〜4,000 ft の棚」。

## 5. 主張の札の行（`law.claims.json`、219 行）

- **署名してよい（210 行）**：下の 9 行のほか全部。条文 174 行は eCFR（14 CFR・49 CFR・47 CFR）と e-Gov（航空法・施行規則）の本文と、参考値 36 行は AIM・PHAK・FAA AIS・JO 7110.65・NIST の本文と合う（参考値のうち例題 7 行は 6 で計算し直した）。FL.jur の囲みの行（`preflight`・`accident`・`night`・`docs`・`vmc`・`vmc.ad`・`svfr`・`row`・`msa`・`speed`・`fuel.vfr`）は、米国の欄を eCFR で、日本の欄を写しの第 5 条・第 64 条・第 76 条の 2・第 174 条・第 179 条・第 180 条・第 186 条・第 198 条の 4 で抜き取って確かめた。N13 の 4 行は札の種類だけを直す。
- **直してから署名（should、4 行）**：`law.basis#3d938d0f`・`law.rules#1e46567f`（S1）、`law.special#7c61fb29`・`law.special#cec34b03`（S2）。
- **文を直すと ID が変わる（nit、5 行）**：`law.airspace#e3f8c40e`（N1）、`law.basis#3d3c3588`（N2）、`law.airspace#35e34707`・`#3e5cfcc5`（N3）、`law.pilot#76dcc557`（N4）。
- 既にある行 `law.rules#f71d58f7`（W12・R1V が署名）は文が同じなので今のままでよい。

## 6. 計算（全部を計算し直した）

| 場所 | 計算 | 結果 |
|---|---|---|
| `law.pilot` 計算演習 ① | 30 歳・2026-03-10 に第 3 種 → 61.23(d)(3)(i)：検査の月（2026-03）の 60th month after = 2031-03 → 2031-03-31 の終わり | 合う |
| 同 ② | フライトレビュー 2026-03-10 → 61.56(c)：2028-03 に飛ぶとき 24th calendar month before = 2026-03（月の初めから後に受けた）→ 可。2028-04 なら 2026-04 から後が要る → 2028-03-31 まで | 合う |
| 確認問題 7 | 最後のレビュー 2024-05-20、飛ぶ日 2026-05-31 → 24th calendar month before 2026-05 = 2024-05、2024-05-01 から後 → 飛べる（正解 C） | 合う |
| `law.pilot` 考えてみよう | 2 か月前（90 日以内）の昼の 3 回、日没の 2 時間後（日没 +1 h より後）に人を乗せる → 61.57(b) の夜の 3 回が要る → 飛べない | 合う |
| `law.aircraft` 考えてみよう | 100 時間点検から 104 時間 > 100 時間、10 時間の例外は点検の場所へ行くときだけ（91.409(b)）→ 有償の訓練は不可 | 合う |
| `law.vfr` 考えてみよう | BKN008 → 雲高 800 ft < 1,000 ft（91.155(c)）→ 場周経路に入れない | 合う |
| `law.vfr` | 1 SM = 1.609344 km（NIST SP 811）→ 約 1.6 km | 合う |
| 図 `lawCurrency` ① | 13.6 px／月：2026-03 の初め x=30 → 2028-04 の初め（＝2028-03 の終わり）x=30+25×13.6=370。帯の始め 30+13.6×10/31=34.4 | 合う |
| 図 `lawCurrency` ② | 3.4 px／日：90 日＝306 px（x=30〜336）、軸の終わり x=370（100 日） | 合う |
| 図 `vfrTwoViews` | py=130・機体 ±8：上の雲の底 72 → 機体の上 122 で 50 px＝500 ft、機体の下 138 → 下の雲の頂 238 で 100 px＝1,000 ft。右の箱も 72〜238 | 合う（横は比例でない：N9） |

## 7. 図（390 px の PNG で見た）

| 図 | 照らしたもの | 結果 |
|---|---|---|
| `lawSources`（新、基礎教材 ch09-fig9-2 の描き直し） | 91.3・91.9・91.103・AIM 4-4-1 | 規則／空港と空域／機体の資料の 3 枚、機長が 3 つを確かめる、管制承認は「規則や安全から外れてよい許可ではない」。誤りなし。原図（法令・航空情報・機体の資料の 3 つの箱と「照合する」）に、機長と管制承認の段を足して米国の本文の版にしている。原図と同じ文字は「その機体で／何ができるか」の短い句だけ |
| `lawCurrency`（新） | 61.56(c)・61.23(d)・61.57(a) | 暦月と日の 2 つの数え方、目盛りは比例（6）。「例」の行は S3 |
| `vfrTwoViews`（新） | 91.155(a) | 左「雲の下 500 ft・雲の上 1,000 ft」、右「上 500 ft・下 1,000 ft・横 2,000 ft の範囲に雲がない」、上下の入れかわり。向きと数字は正しい。日本の数字は描いていない（FL.jur の囲みにある）。横は比例でない（N9） |
| `preflightInfo`（描き直し：キャプションの語） | 91.103(a)(b) | すべての飛行：滑走路の長さ・離陸と着陸の距離、IFR と空港の近くを離れる飛行：天気・燃料・代わり・ATC の遅れ。合う |
| `rightOfWay`（描き直し：「進路権」と国） | 91.113(b)〜(g) | ① 交わる：相手（右・左向きに飛ぶ）に進路権、自分は右へ曲がって後ろへ。② 正面：両方とも右（上の機の右は画面の左）。③ 追い越し：右へ抜く。順（遭難機 > 気球 > グライダー > 曳航・給油中の機 > 飛行船 > ほかの動力機）と着陸の 2 行は今の (c)(d)(g) と合う |

check-figures（Chromium 390 px）：図 8 枚で error 0・warn 0。

## 8. 日米の書き分け

- 全節 `scope: 'us'`（DESIGN 3.3 の「米国」）。check-jurisdiction は 8 節・章末 96 の文字列で error 0。
- 日本の法令の名前と条番号は、`law.basis`・`law.airspace`・`law.vfr` の `bk.jp` と、FL.jur の囲み（`bk.jur`）の日本の欄だけ。章末（用語・例・注意・問・説明してみよう）に日本の法令の語はない。
- `bk.jp` 3 つの中身：航空法第 1 条（e-Gov API で確かめた。写しにないので条番号を書かず「目的の条」としたのは STYLE のとおり）、第 2 条第 12〜14 項（写しと合う。N3 の言い方だけ）、施行規則第 5 条（機体からの上方・下方・水平の距離で書く：写しの第 2 号イ (2)(3) と合う）。日本の数字を手で書いた所はない。
- 日米の囲みは FL.jur の `boxes` のとおり（check-jur の missing 0）。DESIGN 3.3 が `law.pilot` に挙げる `medical` は FL.jur の `boxes` にないので置いていない（W19 の報告 7 の 2。13 の 1）。
- 米国の規則の数字を、国を書かない共通の節に置いた所はない（この章は全部 `us`）。

## 9. 基礎教材の写し

- 14 字以上の重なり（kiso09 の本文・記述問題・答え・用語と、下書き 2 つの文字）：最長 22 字（N10 の問い）、ほかは 20 字以下で、どれも記述問題の問いの決まり文句（「この判断を検討し」「管制との関係を含めて説明してください」など）。本文の節には重なりがない。
- 記述問題 8 問（kiso09.q1・q2・q7・q9・q11・q12・q13・q14）は、日本の法令の文脈を米国の本文に書き直してある（答えは全部書き直し）。図 `lawSources` は描き直し（7）。判断 2（書き直して使ってよい）の範囲。

## 10. 検査の結果

### 10.1 章の検査（`check-chapter.mjs`、下書き 2 つ、Chromium あり）

| 検査 | error | warn | pending | 中身 |
|---|---|---|---|---|
| chapters・form・data・volume・jurisdiction・chapter-refs・figures・photos・concepts・jur・path・provenance・egov | 0 | 0 | 0 | W19 の報告と同じ（form と provenance の info 1 ずつ） |
| style | 5 | 3 | 0 | W19 の報告 4.2 と同じ（部品の見出しを文と数える道具の数え方。初出の形の部分一致） |
| questions | 0 | 1 | 0 | 正解の位置 B 45%（W19 の報告 7 の 1） |
| calc | 0 | 0 | 1 | `CALC.json` がまだない |
| claims | 0 | 8 | 0 | 今の `CLAIMS.json` に行がないので節ごとに「札なし」。`--claims-out` の 219 行は `law.claims.json` と ID・文とも全部一致 |
| **合計** | **5** | **12** | **1** | |

### 10.2 製品のテスト（下書きは製品が読まないので、壊していないことの確かめ）

- FLIGHT LAB：`cd flight-lab && npm run -s test:fast` → **86/86 pass**
- CADET：`cd cadet && npm run -s test:fast` → **247/247 pass**
- TEXTBOOK：`cd textbook && npm test` → **33/34 pass、1 fail**（2 回流して 2 回とも同じ）。落ちたのは `test/build.test.mjs` の「build: FLIGHT LAB sources are not copied into textbook/」で、`textbook/rewrite/combined/drafts/radio.js`（W19-radio の下書き）が `flight-lab/src/radio.js` と同じファイル名だから。law の下書きは関係しない（13 の 5）。

## 11. 台帳の行

触った行はない（この単位は台帳もパッチも書かない）。署名の案は 5 のとおり（`CLAIMS` の `checkedBy` は、W19 が S1・S2 を直したあとに、確かめ役が付ける）。W19 のパッチの PROVENANCE（kiso09.1・kiso09.8・kiso09.q1・q2・ch09-fig9-2 の `done`）は 9 の確かめと合う。ACS-MAP の行は N14。

## 12. 未解決のこと

1. S1〜S3 と nit の直し（W19 か改稿の単位）。直したら札の行を作り直し、確かめ役が署名する。
2. FL.jur の `svfr` の米国の欄「日の出から日没までのほかは、計器飛行の資格と装備が要る」は、91.157(b)(4) の「applicable requirements for instrument flight under part 61」と「equipped as required in § 91.205(d)」で、「計器飛行」（航空法第 2 条第 16 項の言葉）より「IFR で飛べる資格（計器飛行証明と最近の経験）と IFR の装備」のほうが正確。W19 の 8 の 2 と同じ意見（13 の 2）。
3. `medical` の囲み（8）。
4. 安全の見直し：`law.pic` の緊急のときの権限（91.3(b)・91.123(c)(d)）と `law.special` の迎撃の手順は、緊急の手順に近い（W19 の 7 の 6 と同じ）。S2 を直したあとで W27・W36 に見てもらう。

## 13. ほかの単位にお願いしたいこと（needs from others）

1. **W19（または改稿の単位）**：4 の S1〜S3 と N1〜N10・N12〜N16 を `drafts/law.js`・`law-figs.js` で直し、`check-chapter.mjs --claims-out` で `law.claims.json` とパッチの CLAIMS の行を作り直す（S1 の 2 行・S2 の 2 行・N1〜N4 の 5 行の ID が変わる）。
2. **W06（FL.jur）**：`svfr` の米国の欄を「…日の出から日没までのほかは、IFR で飛べる資格（計器飛行証明と最近の経験）と IFR の装備が要る（14 CFR 91.157(b)(4)）」に（12 の 2）。`medical` を `law.pilot` に置くかを決める（W19 の 8 の 2 の ①）。
3. **W21（第 1 部の図）**：図 `airspace` のキャプションと図の文字の「許可」を「管制承認」に（N11）。`lawCurrency`・`vfrTwoViews` を直したら目視の記録に（S3・N9）。
4. **W42（ACS-MAP）**：PA.I.A.K3 の `sections` に `law.pilot` を足すか（N14）。
5. **W19-radio か統合役**：`textbook/rewrite/combined/drafts/radio.js` のファイル名が `flight-lab/src/radio.js` と同じなので、TEXTBOOK の `build.test.mjs`（FLIGHT LAB のソースを textbook/ に写していないことの検査）が落ちる。下書きの名前を変える（例 `radio-ch.js`・`radio-figs.js` はそのまま）か、その検査が `rewrite/combined/drafts/` を見ないようにする（統合役が決める）。
6. **W27（R2 の確かめ）**：5 の 210 行は署名してよい。S1・S2 の直しのあとで 4 行を、N1〜N4 の直しのあとで 5 行を確かめる。
