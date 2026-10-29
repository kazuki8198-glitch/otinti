# 事実確認：章 `english`「英語で学ぶ準備」（W10 の下書き）

単位：章 `english` の事実確認役（R1・DESIGN 7.2 の W10 の確かめ。書いた W10 とは別の役）。日付：2026-10-27。
確かめたもの：`textbook/rewrite/combined/drafts/english.js`・`drafts/english-figs.js`・`drafts/english.claims.json`（42 行）と、節が描くときに `FL.terms`（`flight-lab/src/book-terms.js`）から読み込む表の名前（`TRIPLE` 20 語・`PAIRS` 7 組・`ABBR` 15 語・`ASCII_NAMES` 4 語・つづり 3 語・未確認の 2 語）。
決まり：DESIGN 6.2（15 の決まり）・3.3（序部 第 3 章）・3.4（米国と日本の扱い・推測で埋めないもの）・3.5（用語）、DECISIONS（判断 0・2・3）、STYLE。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck-english.md`（新） | この報告 |

下書き・主張の台帳・`FL.terms`・台帳（`ledgers/`）は**変えていません**（下書きは直さない役。直す所は 4 に、直し方と出典つきで書きました）。`flight-lab/kiso/` には触っていません。git の操作はしていません。

## 2. したこと

1. 下書きを `FL.terms` を読み込んだ本の中で描き（`tools/lib/load.mjs` の `loadBook`）、2 節の本文・表・章末を文字にして、全部の文を読みました（表の名前は手で書かれていないので、描いた結果で確かめました）。
2. 主張の札 42 行を 1 行ずつ、2026-10-27 に取り直した一次資料で確かめました：
   - FAA Pilot/Controller Glossary（HTML 版 glossary-a・g・m・n・p・r・s・t・u）：AFFIRMATIVE・GO AROUND・MISSED APPROACH・MISSED APPROACH POINT (MAP)・NOTAM [ICAO]・PAN-PAN・READ BACK・SAY AGAIN・SPEAK SLOWER・STAND BY・TAXI・UNABLE。
   - FAA AIM 4-2（HTML 版）：4-2-1（理解がいちばん大切・短く・足りなければ必要な言葉を）、4-2-8（500・4,500・10,000 の読み方、周波数の「POINT」、ICAO は「DECIMAL」）、4-2-9（18,000 ft 未満の高度）、4-2-11（速度は 1 けたずつと KNOTS）。
   - UK CAA CAP 413 第 24 版（CAA のページで「Effective date 1 July 2026」を確認、PDF を文字にして照合）：2.14（decimal）、2.18 表 8（AFFIRM・READ BACK・SAY AGAIN・SPEAK SLOWER・STANDBY・UNABLE）、3.1（plain language）、3.2（ILS・QNH・RVR）、3.6（courtesies）、つづり take-off（123 か所。takeoff 0）・aeroplane（1 か所）・PAN PAN。
   - 14 CFR 1.1（Airplane・Takeoff power）・1.2（VMC）・61.83(c)・61.103(c)：eCFR の API（2026-10-23 の版。Title 14 の up_to_date_as_of と同じ）。
   - FAA AC 60-28B：下書きが引く Ed Upd（2024-01-05 作成の PDF）と、FAA の AC のページにある最新の **Editorial Update 2（2025-05-19）** の 2 つを文字にして比べました（中身の段落 1・5・6.1・7.1・8.4 は同じ。違いは法的拘束力の注記と「14 CFR」の書き足しだけ）。
   - SKYbrary「Socio-Culture (OGHFA BN)」（Hofstede 1991 の定義と、英国・豪州・デンマークの例）、SKYbrary「Missed Approach Point (MAPt)」（出典 ICAO Doc 8168）。
   - NIST SP 811 付録 B.9（knot (nautical mile per hour)・foot per minute・inch of mercury・pound (avoirdupois)・gallon (U.S.)・mile, nautical = 1,852 m）。
   - Cambridge Dictionary, English Grammar Today：Dates（4/7/2000 と 7/4/2000、Jul）・Measurements（one hundred kilometres an hour）。
   - ANA「ボーイング777 パイロットになるまで Phase2〜基礎訓練編〜」（`R.ana1`）。
   - 日本の名前（表に描かれる語）：e-Gov 法令 API v2 で航空法（`327AC0000000231_20251201_507AC0000000055`）と航空法施行規則（`327M50000800056_20261001_508M60000800082`）の全文を取り、語ごとに数えました。あわせて W05 の写し（第 164 条の 15・第 197 条の 3）、国土交通省の学科試験出題範囲参考（`ledgers/src/sources/mlit/`）と自家用の例題集（2026 年 6 月、sha256 が `FL.terms` の記録と一致）、PHAK（FAA-H-8083-25C）p.8-16、AFH（FAA-H-8083-3C）第 1 章・第 2 章。
3. 図 2 枚を、関数の中の座標まで読み、Chromium で描いた画像を目で見て、本文・キャプションと照らしました。
4. 管轄の決まり（規則の番号は `bk.us`・`bk.jp`・`bk.jur` の中か、同じ文に国を書いた文だけ）を、検査の道具と、描いた HTML の走査の 2 つで確かめました。
5. 基礎教材から書き直したか（転記していないか）を、基礎教材 14 章の全部の文（10,136 文）と下書きの文（202 文）の似ている度合い（8 字の並びで候補を出し、文ごとの一致率と同じ並びの長さ）で調べました。
6. 製品のテストを流しました（5）。

## 3. 結果の要約

- **外の事実は、ほとんど正しい**：42 行のうち、米国・英国の資料に基づく文（P/CG・AIM・CAP 413・14 CFR・AC 60-28B・NIST・Cambridge・SKYbrary・ANA）はすべて一次資料の文と合っています。数字の読み方の表（100 kt・3,500 ft・10,000 ft）、単位の英語の名前、AC 60-28B の「ICAO の運用レベル 4 以上」「学生操縦士の申請・単独飛行の承認・試験の前に評価」「教官・訓練校が見続ける」「記録は英語」、権力格差の定義と英国の例、日付の書き方も正しいです。〔要確認〕の 1 行（ロンドンの座学の書き方）は推測で埋めておらず、Acron Aviation の London Training Centre の公開ページにも書かれていないことを確かめました。
- **直さないと登録できないもの（must）1 件**：`en.terms` の「名前が大きく違う語」の表の「外部点検（飛行前点検、preflight inspection）」が、範囲の違う 3 つの語を「同じもの」として教えています。
- **直したほうがよいもの（should）9 件**：同じ表の 3 行（スピン・着陸装置の通称が実は法令の語、旋回傾斜計＝turn coordinator の対応がゆるい）、Vmc の説明の欠け、復唱の言い方のたとえ、「専門用語はすべて用語の表から」が今は成り立たないこと、「教官」と「操縦教員」の使い分け、主張の台帳の出典の取り違え 4 行、「米国では」の囲みに英国の話、「分からないまま操作しません」の言い方。
- **細かいもの（nit）9 件**（4）。
- **図 2 枚**：絵（右の主翼を上から見た形、外側の後縁の補助翼、内側のフラップ）と文字は正しく、キャプションとも合います。直すのは `enTalk` の列の見出し 1 つ（nit）。
- **管轄**：共通の節の本文に、国のない規則の番号はゼロ。14 CFR・AIM の言及 6 か所は、どれも同じ文に「米国の」があるか `bk.us` の中です（道具の `jurisdiction` も error・warn 0）。日本の条番号は章の中にありません（`egov` も 0）。
- **書き直し**：DESIGN 3.3 のとおり基礎教材の節は使っておらず（`from` なし）、転記もありません。8 字以上の並びが重なる文は 46 文ありましたが、どれも表の略語・英語の語（例「GS Groundspeed」）か、ふつうの言い回しです。いちばん近いのは「kt は 1 時間に 1 NM 進む速さです。」で、基礎教材 第 8 章の「1kt は 1 時間に 1 NM 進む速さです。」とほぼ同じ文です（定義の 1 文。nit）。

## 4. 直してほしいこと（場所・問題・直し方・出典）

### must（登録の前に）

**M1．`en.terms` の表「名前が大きく違う語」の「外部点検（飛行前点検、preflight inspection）」（`TRIPLE` の `walk-around`）**
- 問題：表の前の文は「1 つのものに 3 つの名前」、`bk.q` と確認問題は「3 つとも同じものを指す」と教えます。ところが外部点検は、飛行前の点検の**一部**です。
  - 施行規則第 164 条の 15 第 2 項は「航空日誌その他の整備に関する記録の点検、航空機の外部点検及び発動機の地上試運転その他航空機の作動点検」と、外部点検を点検の 1 つとして並べます。
  - 操縦士実地試験実施細則の科目は「航空機の外部点検及び内部点検」で、外部点検と内部点検を分けています（`FL.terms` の basis）。
  - FAA の preflight inspection は機内も含みます（AFH 第 2 章「The visual preflight inspection should continue to the interior of the cabin or flight deck」）。
  - 訓練生が「外部点検＝飛行前点検」と覚えると、機内の点検を飛行前点検の外に置いてしまいます。
- 直し方：`TRIPLE` から `walk-around` を外し、3 つの名前が本当に同じものを指す語に替える。案：`cross-country`（野外飛行（クロスカントリー、cross-country）。施行規則も実地試験細則も「野外飛行」）。表を描き直したら `check-chapter` の `first-use-form` を流し直す。`FL.terms` の項目そのものの直しは W04 へ（7 の 2）。
- 出典：航空法施行規則第 164 条の 15（W05 の写し `textbook/rewrite/sources/egov/articles/kokuho-kisoku/164_15.json`、令和 8 年 10 月 1 日施行の版）。AFH（FAA-H-8083-3C）第 2 章 https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/03_afh_ch2.pdf （2026-10-27 に読んだ）。

### should

**S1．同じ表の「スピン（きりもみ、spin）」と「着陸装置（降着装置、landing gear）」（`TRIPLE` の `spin`・`landing-gear`）**
- 問題：節は、正式名を「JCAB の学科試験の資料と、日本の法令の書き方」、通称を「ふだんの会話や、カタカナで書かれた資料で使う言い方」と説明します。この 2 行の「通称」は、実は法令の語です。
  - きりもみ：施行規則第 197 条の 3（曲技飛行）が「宙返り、横転、反転、背面、きりもみ、ヒップストール」と書きます。施行規則・航空法の全文に「スピン」は 0 回。JCAB の出題範囲参考（自家用 ppl.1.1.1.5）は「スピン」、事業用の例題 8 は「きりもみ」。
  - 降着装置：施行規則第 79 条（空港の設置基準）が「降着装置の幅」と書きます（施行規則の「着陸装置」は「計器着陸装置」の中だけ）。出題範囲参考も「ア 着陸装置」の下に「（ア）降着装置の形式」。
  - どちらも、ふだんの言い方ではありません。この 2 行は「通称」の説明の例として誤解を生みます。
- 直し方：`TRIPLE` から `spin`・`landing-gear` を外し、通称がふだんの言い方（カタカナ）である語に替える。案：`heading`（針路（ヘディング、heading）。航空法第 2 条の計器飛行の定義の語）・`runup`（試運転（ランナップ、run-up）。施行規則第 164 条の 15 の「発動機の地上試運転」、実地試験細則 3-1）。どちらを正式名にするかは W04（`FL.terms`）と所有者の判断 3 の範囲です（7 の 2）。
- 出典：e-Gov 法令 API v2 の施行規則全文（上の版）第 197 条の 3・第 79 条、W05 の写し `kokuho-kisoku/197_3.json`。出題範囲参考の写し `ledgers/src/sources/mlit/ppl-airplane.txt`（JCAB-MAP の ppl.1.1.1.5・ppl.1.2.1.1）。

**S2．同じ表の「旋回傾斜計（ターンコーディネーター、turn coordinator）」（`TRIPLE` の `turn-coordinator`）**
- 問題：FAA は旋回の計器を 2 種類に分けます（PHAK p.8-16「Aircraft use two types of turn indicators: turn-and-slip indicators and turn coordinators.」）。`FL.terms` の basis の自家用の例題 17 の「旋回傾斜計」の図は、針と玉の turn-and-slip indicator（旋回計＋すべり計）で、turn coordinator（小さな飛行機の形）ではありません。「3 つとも同じものを指す」例としては、対応がゆるすぎます（Archer の計器は turn coordinator）。
- 直し方：`TRIPLE` から外し、別の語に替える（案：`holding`：待機（ホールディング、holding））。W04 へ：`turn-coordinator` の note に「旋回傾斜計は turn-and-slip indicator も含む呼び名。turn coordinator はその一種」と書くか、項目を分けるかを決める（7 の 2）。
- 出典：PHAK（FAA-H-8083-25C）p.8-16 https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/faa-h-8083-25c.pdf 、国土交通省「学科試験例題集 自家用操縦士（飛行機）2026 年 6 月」例題 17（https://www.mlit.go.jp/koku/content/001761095.pdf 、6 ページの図）。

**S3．表「取り違えやすい組」の VMC と V<sub>MC</sub> の違いの文（`PAIRS` の 2 行目）**
- 問題：「天気の区分と、多発機で方向を保てる最小の速度」。V<sub>MC</sub> は、**片方の発動機（臨界発動機）が止まったとき**の最小操縦速度です（14 CFR 1.2「VMC means minimum control speed with the critical engine inoperative.」）。条件が抜けると、両方の発動機が回っているときの速度の下限と読めます。
- 直し方：「天気の区分と、多発機で片方の発動機が止まったときに方向を保てる最小の速度」。
- 出典：14 CFR 1.2（eCFR、2026-10-23 の版）。

**S4．`en.class`「分かったふりをしない」の段落の最後「自分の理解を自分の言葉で言い直すのは、無線の復唱（readback）と同じ考え方です。」**
- 問題：無線の復唱は、自分の言葉に言い直すものではなく、受け取ったとおりに返すものです（CAP 413 2.18 表 8「READ BACK: Repeat all, or the specified part, of this message back to me exactly as received」、P/CG「READ BACK− Repeat my message back to me.」）。「同じ考え方」と書くと、無線でも自分の言葉で復唱してよいと読めます。
- 直し方（案）：「自分の言葉で言い直すと、食い違いがその場で分かります。相手の言ったことを返して確かめる点は、無線の復唱（readback）と同じです。ただし、無線の復唱は自分の言葉にせず、受け取ったとおりに返します。」（規則の番号を含まないので共通の本文でよい）
- 出典：CAP 413 第 24 版 2.18 表 8、P/CG glossary-r。

**S5．`en.terms`「この本の用語の表」の 1 文目「この本の専門用語は、1 つの用語の表（297 語）から取っています。」（主張 `en.terms#ec22f5bd`）**
- 問題：数（297）は `FL.terms.list.length` から描くので合っています。ところがこの章自身が、表にない専門用語を使っています：権力格差（power distance。太字の定義）・標準用語（phraseology）・ふつうの言葉（plain language）・権威勾配（`crm.crm` への予告）。今のままでは、この文は本について正しくありません。
- 直し方：W04 が `FL.terms` に 4 語を足すまで、この章を登録しない（W10 の報告 7 の 2 の依頼と同じ）。足せば文は書き直さずに正しくなります。
- 出典：`flight-lab/src/book-terms.js`（2026-10-27 の作業ツリー：4 語とも 0 件）。

**S6．`en.terms` の決まり（「その章の 2 回目からは、正式名だけを書きます」）と、`en.class` の「教官」**
- 問題：
  1. `en.terms` は「2 回目からは正式名だけ」と教えますが、`en.class` は本文・見出し・問い・説明してみようで「教官」（`FL.terms` の `flight-instructor` の通称）を 8 回使い、正式名の「操縦教員」を一度も使いません。読み手は、直前に習った決まりと違う書き方をすぐ見ます。
  2. ただし、機械的に「操縦教員」に置き換えると誤りになる所があります。航空法第 34 条第 2 項の操縦教員は「操縦の教育を行う」者です。`en.class` の「授業の終わりに、教官から “Any questions?”」「教官の説明」（確認問題 2）は、ロンドンの座学の教官（ground instructor）で、操縦教員ではありません。
- 直し方（案）：操縦席の場面（見出し「操縦席で教官と」・その本文・説明してみよう 7）は、決まりどおり「操縦教員」にする（節の題は DESIGN 3.3 の語なので、そろえるのは W24 と一緒でよい）。座学の場面は「座学の教官（ground instructor）」とし、`FL.terms` に別の項目を足すかを W04 が決める（7 の 2・7 の 5）。
- 出典：e-Gov 航空法全文（上の版）第 34 条第 2 項「操縦教育証明を受けている者（以下「操縦教員」という。）でなければ、操縦の教育を行つてはならない」。

**S7．主張の台帳 `english.claims.json` の出典の取り違え（4 行）と足りない出典（3 行）**
- 問題：次の 4 行の `source` は、`aileron`（補助翼）の basis の文をそのまま写していて、行の文を支えていません。
  - `en.terms#a1c2f5b3`（離陸 takeoff／take-off）・`en.terms#d72da078`（緊急通信 PAN-PAN／PAN PAN）・`en.terms#9d38095d`（進入復行点 MAP／MAPt）・`en.terms#aeeb0ac2`（VMC と V<sub>MC</sub> の違い）。
  - あわせて `en.class#c20884bb`（3,500 ft の読み方）は高度の決まり AIM 4-2-9 が抜けています（4-2-8 は天井の高さと上空の風の高さの例）。
- 直し方（どれも 2026-10-27 に確かめた文）：
  - `en.terms#a1c2f5b3`：「FL.terms `takeoff`（正式名：出題範囲参考 ppl.4.2.3.4）。つづり：14 CFR 1.1『Takeoff power』（eCFR 2026-10-23）／CAP 413 第 24 版 take-off（123 か所、takeoff は 0）」
  - `en.terms#d72da078`：「FL.terms `urgency`（正式名：出題範囲参考 ppl.4.1.2.4）。つづり：P/CG『PAN-PAN− The international radio-telephony urgency signal.』／CAP 413 第 24 版『PAN PAN』」
  - `en.terms#9d38095d`：「FL.terms `mapt`（正式名：出題範囲参考 ir.1.2.1.2）。略語：P/CG『MISSED APPROACH POINT (MAP)』／ICAO Doc 8168 の MAPt（SKYbrary『Missed Approach Point (MAPt)』、出典 ICAO Doc 8168 PANS-OPS）」
  - `en.terms#aeeb0ac2`：「FL.terms `vmc`（施行規則第 5 条）・`vmc-speed`（status unverified）。14 CFR 1.2『VMC means minimum control speed with the critical engine inoperative.』」（S3 の直しの後の文で）
  - `en.class#c20884bb`：出典に「AIM 4-2-9 Altitudes and Flight Levels（Up to but not including 18,000 feet MSL, state the separate digits of the thousands plus the hundreds）」を足す。
- 出典：上に書いた各資料。

**S8．`en.class` の 2 つめの `bk.us`（英国と米国の書き方の表と、ロンドンの座学の〔要確認〕）**
- 問題：囲みの見出しは「米国では」ですが、中身は英国と米国の比べと、ロンドン（英国）の座学の話です。米国の規則の番号は 1 つもないので、米国の囲みに入れる理由もありません（DESIGN 3.4 の決まりは、規則の番号を含む文だけを囲みに求める）。W10 も報告の 6 の 1 で気づいています。
- 直し方（案）：この囲みの中身を本文の小見出し「<h4>英国と米国の書き方</h4>」に移す（規則の番号がないので共通の本文でよい。説明してみよう 6 の `bk.see('en.class', '英国と米国の書き方')` とも合う）。W06 が英国の囲みを作ったら、そちらに移してもよい。
- 出典：DESIGN 3.4「決まり」の 1 つめ。

**S9．`en.class`「操縦席で教官と」の 2 文目「指示が分からないまま、操作しません。」**
- 問題：操縦している訓練生が「操作しない」と読むと、操縦を止めてよいと受け取れます。言いたいことは「分からない指示を推測で実行しない」だと思います。訓練では、誰が操縦しているかを常にはっきりさせます（AFH 第 1 章「there should be a clear understanding between the learner and flight instructor of who has control of the aircraft」）。
- 直し方（案）：「分からない指示を、推測で実行しません。飛行機はそのまま安定して飛ばしながら、すぐに聞き直します。」
- 出典：AFH（FAA-H-8083-3C）第 1 章 https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/02_afh_ch1.pdf （2026-10-27 に読んだ）。

### nit

| # | 場所 | 問題 | 直し方 | 出典 |
|---|---|---|---|---|
| N1 | `en.terms`「略語」の段落「よく使う略語（ILS・RVR など）は、無線でもアルファベットの文字のまま読みます（英国の CAP 413）。」 | CAP 413 3.2 は「may be spoken using their constituent letters」（読んでよい） | 「…アルファベットの文字のまま読んでよいとされています（英国の CAP 413）。」 | CAP 413 第 24 版 3.2 |
| N2 | `NEW_R.ac6028b` | FAA の AC のページの最新は Editorial Update 2（2025-05-19）。下書きの PDF（2024-01-05）と中身は同じ | URL を `https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_60-28B_Ed_Upd_2_(5-19-25).pdf`、ラベルの括弧を「（2017-06-02。2025-05-19 の編集の更新 2）」に。台帳の source も同じに | FAA AC 60-28B の文書のページ（documentID 1031388） |
| N3 | `en.class` の 2 つめの表の見出し「英国（ICAO に沿った書き方）」と前の文「米国の FAA と、ICAO に沿った英国では」 | 日付の順（日が先か月が先か）は英国英語と米国英語の違いで、ICAO や FAA の決まりではない | 列の見出しを「英国」にし、前の文を「米国と英国では、同じ英語でも書き方が違うものがあります。」に | Cambridge Dictionary, Dates |
| N4 | 図 `enTalk` の右の列の見出し「聞き直す言い方の例」 | 3 行目の「従えないときは “Unable.”」と 2 行目の “Can you show me?” は聞き直しではない | 見出しを「言い方の例」に（キャプションは「話し方の例」で合っている） | P/CG「UNABLE」 |
| N5 | `en.terms`「略語がそのまま正式名になっている語」の表の見出し「（通称、English）」 | PF・PM・PFD・POH の `common`（「飛行経路を管理する操縦士」など）は意味の説明で、節の言う「ふだんの言い方」ではない | 見出しを「（意味、English）」に | 節自身の通称の説明 |
| N6 | `PAIRS` のノータムの行「一時的な変更の知らせ」 | NOTAM は施設・業務・方式・危険の設定・状態・変更を、急いで知らせるもの（一時的なものとは限らない） | 「施設や方式などの変更を急いで知らせるものと、AIP やノータムなどの総称」 | P/CG「NOTAM [ICAO]」 |
| N7 | `en.terms` の小見出し「つづりの違い」 | MAP／MAPt は略語の違いで、つづりの違いではない | 小見出しを「つづりと略語の違い」に | P/CG・SKYbrary（MAPt） |
| N8 | 主張の台帳 | 「その感じ方の強さは、国の文化によって違います。」に札がない（数字がないので抜き出しにかからない） | 1 行足す：出典 SKYbrary Socio-Culture（英国・豪州・デンマークと、マレーシア・フィリピンの例） | SKYbrary |
| N9 | `en.class`「kt は 1 時間に 1 NM 進む速さです。」 | 基礎教材 第 8 章の文「1kt は 1 時間に 1 NM 進む速さです。」とほぼ同じ（定義の 1 文で、節は基礎教材を元にしていない） | 言い換える（例「kt（ノット）は、1 時間に何 NM 進むかで表す速さの単位です。」） | `flight-lab/kiso/data/kiso08.json` |

## 5. 検査の結果

| 検査 | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs drafts/english-figs.js drafts/english.js` | error 0・warn 2（claims：今の `CLAIMS.json` に行がないための「札なし」。W10 の報告のとおり）・pending 1（calc：台帳なし）。figures（Chromium 390 px）・jurisdiction・egov・style・questions は 0 |
| TEXTBOOK：`cd textbook && npm test` | **22/22 pass**（fail 0） |
| FLIGHT LAB：`cd flight-lab && npm run -s test:fast` | **80/80 pass**（fail 0） |
| CADET：`cd cadet && npm run -s test:fast` | **245/245 pass**（fail 0） |

（下書きは製品が読まないので、どれも製品が壊れていないことの確かめです。）

### 主張の札 42 行の判定（`checkedBy` を付けてよいか）

| 行 | 判定 | 根拠（2026-10-27） |
|---|---|---|
| `en.terms#6007633f`・`#0d5cd27a` | 本の決まりとして正しい（DESIGN 3.5）。ただし S6 | DESIGN 3.5・判断 3 |
| `en.terms#8165bd47`・`#7f53e9a6` | 正しい。「法令」の裏づけに施行規則第 137 条・第 149 条（補助翼・昇降舵・方向舵）を足せる | 出題範囲参考 ppl.1.1.1.7・施行規則全文 |
| `en.terms#086c8038` | 正しい（N1） | CAP 413 3.2 |
| `en.terms#a1c2f5b3`・`#d72da078`・`#9d38095d` | 文は正しい。出典を直してから（S7） | 14 CFR 1.1・CAP 413・P/CG・SKYbrary |
| `en.terms#dad35ed1` | 正しい | 14 CFR 1.1「Airplane means…」・CAP 413 aeroplane |
| `en.terms#2bcce834` | 正しい | P/CG「STAND BY」・CAP 413「STANDBY」 |
| `en.terms#aeeb0ac2` | 文を直し、出典を直してから（S3・S7） | 14 CFR 1.2 |
| `en.terms#ec22f5bd` | 数は正しい（297）。文は S5 の後 | `FL.terms.list.length` |
| `en.terms#ff815723` | 正しい（未確認は最小操縦速度・加速継続距離の 2 語。推測・要確認の札も正しい） | `FL.terms` の status |
| `en.terms#5743071f` | 正しい | CAP 413（AFFIRM・take-off・aeroplane） |
| `en.class#f6c3ff38`・`#31a11d85` | 正しい | ANA Phase2 のページ |
| `en.class#8a5898e6`・`#c32d08f9`・`#81489589`・`#04908c96` | 正しい（Unable の理由は CAP 413 の「normally」） | P/CG・CAP 413 2.18 表 8 |
| `en.class#13ba695b` | 正しい | CAP 413 3.6 |
| `en.class#b880d5b3`・`#b79975fe`・`#1b66e07a` | 正しい | AIM 4-2-1 |
| `en.class#c9bdc3c1`・`#e4e82a92` | 正しい | AIM 4-2-8・4-2-11、Cambridge Measurements |
| `en.class#c20884bb` | 正しい。出典に AIM 4-2-9 を足す（S7） | AIM 4-2-9 |
| `en.class#413f4556`・`#4cf5d214` | 正しい | NIST SP 811 B.9「knot (nautical mile per hour)」 |
| `en.class#eede1990`・`#12cbc3f4`・`#2dbd7a1c` | 正しい | SKYbrary Socio-Culture |
| `en.class#f33e82ec`・`#f71b3eaa` | 正しい | 14 CFR 61.83(c)・61.103(c) |
| `en.class#7166ced9`・`#c2fe31a9`・`#9a107958`・`#7c3b453d`・`#68081d35` | 正しい（N2：最新の PDF に替えてよい） | AC 60-28B 1・5・6.1(6)・7.1（2024 版と 2025 版で同じ文） |
| `en.class#d66cdf94`・`#0c4f73c8` | 正しい | Cambridge Dates |
| `en.class#dcb4c889` | 推測・要確認として正しい（公開情報に記述なし） | ANA のページ・Acron Aviation London Training Centre のページ |

## 6. 台帳の行

変えていません（事実確認役は台帳を書かない。登録する統合役が W10 のパッチで足します）。登録のときに：

- CLAIMS：`english.claims.json` の 42 行を `op: add` で足すとき、上の表で「正しい」とした行に `checkedBy: "factcheck-english"`・`checkedOn: "2026-10-27"` を付けてよい。S3・S5・S7 の行（`en.terms#a1c2f5b3`・`#d72da078`・`#9d38095d`・`#aeeb0ac2`・`#ec22f5bd`、`en.class#c20884bb`）は、直した後に確認役がもう一度見てから付ける。
- UNVERIFIED：`U.london-icao` は開いたまま（2026-10-27 も公開情報なし）。

## 7. ほかの単位にお願いしたいこと（needs from others）

1. **W10（下書きの持ち主）**：4 の M1・S1〜S9 と nit を直し、`check-chapter` を流し直す（`TRIPLE` を替えたら `first-use-form` を確かめる）。主張の台帳の出典を S7 のとおりに直す。
2. **W04（`flight-lab/src/book-terms.js` の持ち主）**：
   - `walk-around`：英語を「walk-around（exterior inspection）」にし、通称から「飛行前点検」を外す。飛行前点検（preflight inspection）は外部点検と内部点検を含む別の概念（施行規則第 164 条の 15 第 2 項、実地試験細則 科目 2-4、AFH 第 2 章）。
   - `spin`・`landing-gear`：通称の「きりもみ」「降着装置」は法令の語（施行規則第 197 条の 3・第 79 条）。どちらを正式名にするかは判断 3 の付記と同じ扱いで所有者に確かめ、少なくとも note に法令の語であることを書く。
   - `turn-coordinator`：JCAB の「旋回傾斜計」は turn-and-slip indicator も含む呼び名（例題集 自家用 例題 17 の図は針と玉の計器）。note に書くか、項目を分ける（PHAK p.8-16）。
   - 表に 4 語を足す：権力格差（power distance）・標準用語（phraseology）・ふつうの言葉（plain language）・権威勾配（authority gradient）（S5。W10 の依頼と同じ）。
   - `flight-instructor` の通称「教官」は座学の教官（ground instructor）も指すので、別の項目を足すか note に書く（S6。航空法第 34 条第 2 項）。
3. **W06（`book-core.js` の部品の持ち主）**：英国の囲み（または見出しを選べる囲み）があれば、S8 の中身をそこへ（W10 の依頼 7 の 3 と同じ）。
4. **W24（序部と第 1 部の用語をそろえる）**：「教官」と「操縦教員」の使い分けで、座学の教官を操縦教員に置き換えない（S6）。
5. **統合役（W10 の登録）**：6 の `checkedBy` の付け方。S5 が終わる（W04 が 4 語を足す）までは、この章を登録しない。
