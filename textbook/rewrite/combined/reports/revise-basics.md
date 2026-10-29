# 直し役の報告：章 `basics`「飛行の基本量」（revise-basics）

単位：章 `basics` の直し役（R1・DESIGN 7.2 の W10 の直し。書いた W10・事実確認役・読み手とは別の役）。
日付：1 回目 2026-10-27（事実確認と、初学者の 1 回目の読みのあと）、2 回目 2026-10-29（初学者の 2 回目の読みのあと）。
直したもの：`textbook/rewrite/combined/drafts/basics.js`・`drafts/basics-figs.js`・`drafts/basics.claims.json`（この 3 つだけ）。
もとにした指摘：`reports/factcheck-basics.md`（must 3・should 5・nit 8）と `reports/reader-basics.md`（2 回目：must 0・should 9・nit 50）。
決まり：DESIGN 6.2（15 の決まり）・3.3（序部 第 2 章）・3.4（日米の扱い・推測で埋めないもの）・付録 A、DECISIONS（判断 2・3）、STYLE。

1 回目の直しは、統合役のコミット `316c94e`（W10 の途中のコミット）に入っています。そのときこの報告が書かれていなかったので、読み手の 2 回目の報告（12 の 1）は「直した人が何を意図して残したか分からない」と書いていました。この報告は 1 回目と 2 回目の両方を書きます。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/drafts/basics.js` | 1 回目：事実確認の must・should・nit と、読み手の 1 回目の指摘（80 件のうち 66 件が直り、6 件が一部）。2 回目：読み手の should 9 のうち 8 と、nit 50 のうち 39（2.3・2.4）。頭の注、`NEW_R` に出典 1 件（`jmaCode`：気象庁「航空気象通報式」第 3 版）、用語の表に 8 語 |
| `textbook/rewrite/combined/drafts/basics-figs.js` | 1 回目：`basicsUnits` のラベルを 1013.2 hPa に（S2）、`basicsTime` の日付の線とラベル（N7）、`basicsCase` の到着の時刻を分から計算（N8）など。2 回目：`basicsSpeedChain` の EAS の段に「訓練機ではごく小さい」と字の「↓」を外す、`basicsFlight` の「到着地の情報」、`basicsWind` の式のけた（102.0 → 102） |
| `textbook/rewrite/combined/drafts/basics.claims.json` | `check-chapter.mjs --claims-out` で抜き出し直した（1 回目 93 → 105 行、2 回目 105 → 113 行）。文が変わらない行は前の札と出典のまま、新しい行は `by: revise-basics` で札と出典を付けた（2 回目は 9 行足し、1 行が文の変更で消えた） |
| `textbook/rewrite/combined/reports/revise-basics.md`（新） | この報告 |

ほかのファイルは変えていません（`flight-lab/kiso/`・台帳・`FL.jur`・`FL.terms`・e-Gov の写しも含む）。git の操作もしていません。ただし、3 の製品のテストを流すと出力 `flight-lab/outputs/FLIGHT-LAB.html`・`cadet/outputs/CADET.html` が作り直される（PROGRESS の「出力」のとおり。下書きは製品が読まないので中身は変わらない。コミットは W12）。

## 2. したことと理由

### 2.1 事実確認（`factcheck-basics.md`）の指摘の扱い

must と should は全部、1 回目に直しました（M3 と S5 は持ち物でないファイルなので 6 に）。2 回目に、それが今の文に残っていることを確かめました。

| # | 指摘 | 扱い | 今の文（場所） |
|---|---|---|---|
| M1 | 羽田発の版が「時刻は JST、規正値は hPa で受け取る」 | 直した | `basics.case` の `bk.jp`：航空の情報の時刻は日本でも UTC、METAR は Q 群（hPa）と国内記事の A 群（inHg）、管制・ATIS の単位は〔要確認〕。2 回目に 3 段落に分けた（読み手 K4） |
| M2 | 「日本でも、機長は職位の名前ではなく」 | 直した | `basics.crew` の `bk.jp`（第 73 条＝飛行ごとの役割。会社では職位も「機長」と呼ぶので区別する）と、共通の本文の 1 段落（この本は職位をキャプテン、法令上の役割を機長（PIC）と書き分ける） |
| M3 | 航空法第 73 条が e-Gov の写しにない | 持ち物でない（6 の 2） | 文は事実確認役が e-Gov の API の同じ版で確かめた。下書きは変えない（事実確認役の案のとおり） |
| S1 | 「IFR で飛ぶには…飛行計画と管制の承認が要ります」が無条件 | 直した | `basics.rules` の「ここに注意」：「管制空域を IFR で飛ぶには…」。`bk.jp` に第 97 条第 1 項 |
| S2 | 1013.25 と 1013.2 の 2 通り | 直した | 章の中を 1013.2 hPa に（`basics.alt` の文・図 `basicsUnits` のラベル）。出典は PHAK 第 4 章 p.4-3（1,013.2 mb） |
| S3 | TAS の 2% の行の札が「例題」 | 直した | `basics.speed#3a409292` の `kind` を外し、出典を PHAK 第 8 章 p.8-9 の rule of thumb に |
| S4 | 章末の「説明してみよう」が基礎教材の問題とほぼ同じ | 直した | 文を言い換え、数字を変えた（70 NM・1,500 ft・400 ft/min×5 分・35 NM/105 kt・TAS 110 kt と南から 25 kt・真高度 4,000 ft と地形 1,500 ft）。どれも検算ずみ |
| S5 | `FL.jur` の `alt.unit` の日本の欄が古い | 持ち物でない（6 の 3） | 下書きの本文の側は 2 回目に出典つきで書いた（2.3 の U2） |
| N1〜N8 | 「航空機」・滑走路の番号の言い方・「単位をそろえずに」・優先の言い方・日本の METAR の言い方・換算の例の数字・図 `basicsTime` の線・図 `basicsCase` の時 | 全部直した | `basics.crew`・`basics.time`・`basics.units`・`basics.docs`・図 2 枚 |

### 2.2 初学者の 1 回目の読み

1 回目の直しで、読み手の 1 回目の must 5（時刻の換算の規則・EST の時差・METAR の説明・`basics.units` の囲みが読めない・規正値が要る理由）と should・nit の大部分を直しました。読み手の 2 回目の数え方では、80 件のうち直った 66・一部 6・そのまま 8（どれも nit）です（`reader-basics.md` の 9）。残った 14 件は、2 回目の読みの番号（F1・F2・F4・T3・T4・S1・S3・A1・A4・A5・D1・D2・D4・E1）に引き継がれているので、2.3・2.4 で扱いました。

### 2.3 初学者の 2 回目の読みの should 9

| # | 指摘 | 扱い | 直したこと（場所）と根拠 |
|---|---|---|---|
| U1 | 規正値が `basics.units` では「測った値」、`basics.alt` では「計算した値」 | 直した | `basics.units`：「空港などで測った気圧を、そのまま知らせるのではありません。海面の高さでの値に直して知らせます」。`basics.alt` の QNH の説明と同じ向き。PHAK 第 8 章（規正値は観測所の気圧を海面に直した値）、気象庁 WEATHER TOPICS 第 54 号（QNH の定義） |
| U2 | 本文は A 群を言い切り、すぐ下の囲みは〔要確認〕 | 本文の側を直した。囲みの側は W06（6 の 3） | 本文に出典を書いた：「国内だけに送る国内記事（RMK：remarks。METAR の最後に付ける欄）には、A 群も書きます（気象庁の航空気象通報式）」。2026-10-29 に気象庁「航空気象通報式」第 3 版（改正 第 17 号、令和 7 年 8 月 7 日）を落として読み、国内記事の A 群（「QNH の値に水銀柱のインチを使用する」）と「国内記事は国内のみに通報する」を確かめた。だから本文は言い切りのままでよく、直すのは囲みの側。`FL.jur` の注の「RMK の A 群はその配信（aviationweather.gov）に出ていない」は、国内記事が国内だけに送られるからで、A 群がないからではない（今日の配信でも RJTT・RJAA・RJCC の METAR は `Q1023 NOSIG` で終わり、RMK がない） |
| U3 | 「管制と ATIS が言う単位は、下の日米の対照にあります」と言うのに答えがない | 直した | 「日本の管制と ATIS が規正値をどの単位で言うかは、まだ確かめていません（下の日米の対照の〔要確認〕）」。囲みにあることだけを言う（DESIGN 3.4 の推測で埋めないもの・台帳 `U.qnh-unit`） |
| U4 | 「係数そのものは正確な値」と表の「≈」が食い違う | 直した | 「表の「＝」の値は、定義で決まった正確な値です（1 NM ＝ 1,852 m、1 ft ＝ 0.3048 m、1 lb ＝ 0.45359237 kg など）。「≈」の値は、けたを丸めて書いた値です」と、丸めの例「166.68 km/h は、約 167 km/h」。表の行を 1 つずつ照らした（＝ の行は全部正確、≈ の行は全部丸め）。NIST SP 811 B.9（「Factors in boldface are exact」：ft 3.048 E-01・nautical mile 1.852 E+03 が太字）と脚注 20（1 nautical mile = 1852 m）・脚注 22（lb の正確な係数 4.535 923 7 E-01）を 2026-10-29 に読み直した。前の「誤差は測った値の側にあります」は根拠を示せないので外した |
| S1 | 図は 4 段なのに本文は EAS を飛ばす理由がない。「海面の国際標準大気では EAS は CAS と同じ」が読めない | 直した | 「訓練機の速さでは、EAS は CAS とほとんど同じです。だから訓練機の計算では、EAS を飛ばして、CAS を高度と気温で直して TAS を求めます。上の図の EAS の段の直しは、もっと速く飛ぶときに大きくなります」。海面の文は外した（14 CFR 1.1 の定義の但し書きで、初学者のねらいに要らない）。図の EAS の段を「空気の圧縮性を直す（訓練機ではごく小さい）」に、キャプションに一文。PHAK 第 5 章 p.5-43（約 260 kt 以下では空気を押し縮められないものとして扱える。圧縮性の影響は低速では無視でき、速さとともに大きくなる） |
| A1 | 「高い所から低い所へ」の注意だけ理由がない | 直した | 「気圧の低い所では、同じ気圧になる高さが低いので、表示を保って飛ぶと、知らないうちに高さが下がるからです。つまり、実際は表示より低い所を飛んでいます」。PHAK 第 8 章 p.8-3〜8-4（高気圧から低気圧へ規正せずに飛ぶと、表示は一定でも実際の高さは低い。“GOING FROM A HIGH TO A LOW, LOOK OUT BELOW”）と図 8-3 の気圧の面 |
| R1 | 「管制空域」が説明なしで 4 回 | 直した | `basics.rules` の初出の前に 1 段落：「管制空域（controlled airspace）は、管制が、IFR の飛行機に管制の業務（ほかの飛行機と間隔を空けるなど）を行う空域です。VFR の飛行機にどこまで行うかは、空域の種類で決まります。管制空域でない空域もあります」と予告のリンク `law.airspace`（第 1 部にある節。決まり 13 を満たす）。管制承認の説明を、使う箇条の前へ（読み手 R3）。日本の側は「この 3 つは、第 2 条が定める空域の種類です」（第 2 条第 12〜14 項、写し `kokuho/2.json`）。FAA Pilot/Controller Glossary の CONTROLLED AIRSPACE・AIR TRAFFIC CLEARANCE（2026-10-29 に読んだ） |
| R2 | 「最低気象条件」の説明が 2 か所で違う | 直した | `basics.rules` で 1 回だけ定義：「最低気象条件（minimums）は、飛んでよい・離着陸してよいと決められた、天気の下限（視程・雲の高さなど）です。VFR で飛ぶための下限と、IFR で離着陸するための下限があります」。箇条の括弧の説明を外し、`basics.case` は「最低気象条件（「飛行方式と気象状態は別の軸」で学んだ、天気の下限）」とリンクに。`ir.need` の囲みの「VFR の最低気象条件」とも合う。根拠：14 CFR 91.155（Basic VFR weather minimums：視程と雲からの距離）・91.175（IFR の着陸の最低気象条件） |
| EN1 | METAR・ATIS・TAF の読みがない | **直さなかった**（理由は下） | 一次資料で読みを確かめられなかった。気象庁・FAA（AIM・Aviation Weather Handbook・P/CG）・英国 CAP 413 のどれにも、この 3 語のカタカナの読みも英語の発音も書かれていない（CAP 413 は TORA・CAVOK の発音だけ、略語の一般の決まりは「ILS・QNH・RVR などは文字のまま」）。業界でよく聞く読み（メター／メタール・エーティス・タフ）は二次資料しかなく、DESIGN 3.4 の「推測で埋めない」に当たる。〔要確認〕つきで書くと、読み手が T4 で書いたとおり逆に不安にさせる。読みは用語の表 `FL.terms` に置くのが本全体で使えるので、W04 に頼んだ（6 の 4）。METAR は初出を「METAR（英語も METAR：aviation routine weather report）」にして、正式名と英語が同じ語だと分かるようにした |

### 2.4 2 回目の nit 50 の扱い

直したもの（39）：

| 節 | # と直したこと |
|---|---|
| `basics.flight` | F1：小見出しを「訓練のフライトの流れ（全体の順番）」に（節の題は DESIGN 3.3 の題のまま）。F3：表の「上昇（climb）」「降下（descent）」「着陸（landing）」。F4：「誘導路（taxiway：地上滑走のための道）」。F6：図の「到着地の情報」 |
| `basics.crew` | C1：「この定義には、その飛行に要る資格を持つこと、という条件もあります」。C2：「期待した経路・高度・速度からのずれ」。C3：「誰が機長か、PF と PM をどう分けるかは、飛ぶ前に学校の決まりで確かめます」 |
| `basics.units` | U5：「国際標準大気の海面の気圧は」。U6：表に「°F ＝ ℃ × 1.8 ＋ 32」（NIST の式の逆）。U7：国内記事の説明（2.3 の U2）。U8：「視程を SM で」。U9：「Q1014 は 1014 hPa、A2997 は 29.97 inHg」（気象庁 WEATHER TOPICS 第 54 号の例・航空気象通報式の A 群の書き方）。U10：「海里（NM：nautical mile）」。U11：答え「60 km は約 32.4 NM なので、120 kt なら約 16 分」（60 ÷ 1.852 ＝ 32.397、32.397 ÷ 120 × 60 ＝ 16.2） |
| `basics.time` | T1：この本の書き方の約束（UTC は 1400Z、現地の時刻は 10:00 EDT）。T2：式に「（EDT は −4、JST は ＋9）」。T6：「無線で文字を伝える言い方では、Z を Zulu（読みはズールー）と言います」（AIM 4-2-7 の表：Z＝Zulu（ZOO-LOO）） |
| `basics.speed` | S1（2.3）。S2：「GS はすぐ下で説明します」。S3：速度計は動圧（正面の圧力とまわりの圧力の差）で示すので、空気が薄いと同じ IAS で TAS が大きい（PHAK 第 8 章 p.8-9：an aircraft has to be flown faster at higher altitudes to cause the same pressure difference）。S5：「横から風を受けると、針路と航跡は同じになりません」。S6：「角度は、風の速さと TAS の比の tan から求めます（20 ÷ 100 ＝ 0.2 で、約 11°）」（arctan 0.2 ＝ 11.31°）。S7：「較正」の意味と読み。S8：`bk.sim` の中に「G1000 は、計器を画面にまとめた表示装置の型の名前です」（序部の `bk.sim` の中なので決まり 10 に合う） |
| `basics.alt` | A1（2.3）。A2：「QNH（英語も QNH。読みはキュー・エヌ・エイチ）」（重なりを外し、英語が同じことを言う。初出の形の検査も通る）。A3：「管制が指示する高度を、どう保つかは下で説明します」 |
| `basics.rules` | R1・R2（2.3）。R3：管制承認の説明を箇条の前へ。R4：飛行計画を「経路・高度・時刻などを書いて、管制などの機関に出す届け」と定義（P/CG の FLIGHT PLAN）し、`basics.speed` の計画の意味の所は「飛ぶ前の計画」に。R6：「姿勢（機首の上げ下げと翼の傾き）」。R7：`bk.jp` に主語「計器飛行方式で」（第 97 条第 1 項） |
| `basics.docs` | D1：表に「多くの小型機では、POH が飛行規程を兼ねる」（PHAK 第 9 章：The POH for most light aircraft built after 1975 is also designated as the FAA-approved flight manual）。D2：「登録記号（国に登録した機体ごとの記号）」。D3：AIP の行を「飛び方の手順など」に。D4：`bk.us` に「標示は速度計の色の帯など、表示板は機体に貼った札です」（PHAK 第 9 章の Limitations） |
| `basics.case` | K1：「出発の LAB 空港も架空の空港で、標高だけを Sanford の空港に近い値にしてあります」（55 ft と 54.8 ft）。K2：日付つき「7 月 10 日 10:00 EDT は、7 月 10 日 1400Z」「7 月 10 日 1440Z」。K3：「GS と時間の求め方は、上と同じです」。K4：羽田発の版を 3 段落に |
| 章末 | E1：用語の表に 8 語（QNH・計器飛行・管制空域・管制承認・飛行計画・最低気象条件・ノータム・復唱）。E2：「偏流修正をしないと」 |
| 図 | `basicsWind` の式を「≈ 102 kt」（本文と同じけた）。`basicsSpeedChain` の二重の矢印（線と字の「↓」）を線だけに |

直さなかったもの（11）と理由：

| # | 理由 |
|---|---|
| F2（「機体の設定」の例） | 例に出す装置（フラップなど）の語は、その章（第 1 部・第 2 部）で定義する。表は「考え方の例」と「ここに注意」で断っている |
| F5（「管制」の初出） | 読み手も「そのままでも可」。次の節で説明している |
| T3（000° と 360°） | どの場面でどちらを使うかを一次資料で確かめきれなかった（風向の 360 と無風の 000 の扱い）。航法の章（`navb`）の住所で書くのがよい |
| T4・A4（`time`・`alt.transition` の囲みの文） | `FL.jur` は W06 の持ち物（6 の 3） |
| T5・A6 | 読み手が「直さなくてよい」 |
| S4（IAS の失速速度が変わらない理由） | S3 の一文で足りる（読み手の案）。理由そのものは PHAK に書かれていない |
| R5（囲みの「計器航法による飛行」の順番） | 本文に日本の規則の語を書けない（DESIGN 3.4）。読み手も「直さなくてもよい」 |
| A5（写真 `ch00-photo5`） | W22 の持ち物（6 の 6） |
| EN2（SM の読み） | `english` の章へのリンクは、その章が登録されてから（決まり 13）。登録の統合役が足せる |

### 2.5 主張の札（`basics.claims.json`）

- 2 回目に新しくできた 9 行：`basics.units#ede20799`（国際標準大気の海面の気圧。前の行と同じ出典）・`#7e5a152f`（Q1014・A2997：気象庁の 2 つの資料）・`#1cd5bb87`（正確な係数：NIST B.9 と脚注 20・22）・`#cdcc149a`（丸めの例。例題）・`#5369a12a`（60 km → 約 16 分。例題）・`basics.speed#fa967a27`（tan で 11°。例題）・`basics.rules#bede5032`（第 2 条の 3 つの空域。条文）・`basics.case#977a5b83`・`#7e2e9c3c`（日付つきの時刻。例題）。
- 消えた 1 行：`basics.units#68a09912`（「その海面の気圧は…」。文が変わって `#ede20799` になった）。
- 数：113 行（教材値 3・参考値 92・条文 18・推測・要確認 0。うち例題 58）。どの行も `checkedBy` は空（確かめ役が付ける）。

## 3. 検査

| 検査 | 2 回目の前（1 回目のあとの下書き、2026-10-29） | 2 回目のあと |
|---|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/basics-figs.js textbook/rewrite/combined/drafts/basics.js` | error 1・warn 14（style 2・concepts 4・claims 8）・pending 4・info 1 | **error 1・warn 13（style 1・concepts 4・claims 8）・pending 4・info 1** |
| 同じ（`COMBINED_LEDGERS` に、`CLAIMS.json` へこの章の 113 行を入れた写しの台帳） | — | error 1・warn 5（style 1・concepts 4）・claims 113/113 に札 |
| figures（Chromium 390 px） | 10 枚 error・warn 0 | 10 枚 error・warn 0（変えた 3 枚は 390 px の画像を目で見た） |
| style の数 | 平均 34.1 字・最長 78 字 | 342 文・平均 34.8 字・最長 78 字・80 字超 0 |
| TEXTBOOK：`cd textbook && npm test` | — | **22/22 pass**（fail 0） |
| FLIGHT LAB：`cd flight-lab && npm run -s test:fast` | — | **80/80 pass**（fail 0） |
| CADET：`cd cadet && npm run -s test:fast` | — | **245/245 pass**（fail 0。下書きは CADET が読まないが、念のため） |

残った error と warn（どれもこの単位の 3 つのファイルでは消せない）：

1. egov `article-not-copied` 1：航空法第 73 条が W05 の e-Gov の写しにない（factcheck M3。6 の 2）。
2. style `first-use-form` 1：「計器飛行」。章の最初の「計器飛行」の文字は「計器飛行方式（IFR：…）」の中にあり、検査はそこを初出と数える（W10 の報告 6 の 3 の道具の数え方。「METAR」の warn は 2 回目に初出の形を直して消えた）。
3. concepts 4：協定世界時・高度計規正値・気圧高度の太字の定義が `wx.metar`・`perf.da`・`wx.atm` にもある（相手の章が直す）、`basics.alt` の密度高度の呼び戻しが「思い出そう」の囲みでない（部品 `bk.recall` がまだない）。W10 の報告と同じ。
4. claims 8（台帳なしのとき）：`ledgers/CLAIMS.json` にこの章の行がまだない（登録のときに統合役が足す）。

## 4. 台帳の行

台帳のファイルは変えていません（持ち物でないため）。章を登録するコミットで、統合役に次をお願いします（W10 の報告 5 の表と、事実確認の報告 9 の表に足すもの）。

| 台帳 | 行 | 扱い |
|---|---|---|
| CLAIMS | `drafts/basics.claims.json` の 113 行 | `op: "add"`。2 回目に文が変わった・足した 9 行（2.5）は、事実確認役がまだ見ていないので、確かめ役が確かめてから `checkedBy` |
| ERRATA・RULINGS | `K.overview.K2`・`R.pic-meaning` | M2 は 1 回目に直した（事実確認役の「M2 を直してから閉じる」の条件を満たす）。閉じてよい |
| ERRATA | `K.overview.K3`・`K.overview.K4` | 事実確認役のとおり `verified: true` にしてよい |
| UNVERIFIED | `U.qnh-unit` | note に足す：国内の METAR の A 群は、気象庁「航空気象通報式」第 3 版（改正 第 17 号、令和 7 年 8 月 7 日）の国内記事の規則で確かめた（国内記事は国内のみに通報するので、aviationweather.gov の配信には出ない）。管制・ATIS で言う単位は open のまま |
| RULINGS | `R.ifr-terms` | `basics.rules` は管制空域・管制承認・飛行計画・最低気象条件・計器飛行を定義した（閉じるのは `intro.cert` の側と合わせて） |

## 5. 未解決のこと

1. 航空法第 73 条の写し（3 の 1）。入るまで `check-egov` は error 1 のまま。章を登録する前に要る。
2. 本文と `alt.unit` の囲みの確かさの食い違い（読み手 U2）は、囲みの日本の欄を W06 が直すまで残る。本文は一次資料（気象庁の現行の通報式）で確かめたので、本文を囲みに合わせて弱めることはしなかった。
3. METAR・ATIS・TAF の読み（EN1）は、一次資料が見つからず書いていない。
4. 日本の管制・ATIS で QNH を言う単位（`U.qnh-unit`）と、日本に夏時間がないこと（`U.jst-dst`）は確かめていない（AIP Japan は閲覧に登録が要る）。
5. 2 回目に足した文（2.3・2.4）は、事実確認役がまだ読んでいない。確かめ役が 2.5 の 9 行と、数字のない新しい文（管制空域・最低気象条件・飛行計画の定義、A1・S1・S3 の理由、D1・D4）を見てほしい。出典は 2.3・2.4 の表に書いた。

## 6. ほかの単位にお願いしたいこと（needs from others）

1. **登録する統合役（W10 の登録）**：W10 の報告 7 の 1 のとおり。`NEW_R` は 2 回目に 1 件増えて 11 件（`jmaCode`：`https://www.jma.go.jp/jma/kishou/books/tsuhoshiki/koukuu/koukuu3_17.pdf`）。外部リンクの数に入る。台帳は 4 の表。5 の 1 と 6 の 2・6 の 3 が済むまで登録しない。
2. **W05・W37（e-Gov の写し）**：`textbook/rewrite/sources/egov/manifest.json` の航空法に `{ "num": "73", "use": ["basics.crew", "law.pic", "jlaw.pic"] }` を足して `fetch.mjs` を流す（factcheck M3。今の写しには第 73 条の 2 だけがあり、第 73 条がない）。
3. **W06（`flight-lab/src/book-jur.js`）**：
   - `alt.unit` の `jp` を「METAR の規正値は Q 群（hPa）。国内記事（RMK）に A 群（inHg）も書く。管制・ATIS で言う単位は〔要確認〕」に、`jpSrc`（または出典）に気象庁「航空気象通報式」第 3 版（改正 第 17 号）`https://www.jma.go.jp/jma/kishou/books/tsuhoshiki/koukuu/koukuu3_17.pdf` の国内記事の A 群の規則を。`note` の「RMK の A 群はその配信に出ていない」は、「国内記事は国内のみに通報するので aviationweather.gov の配信には出ない」に（factcheck S5・読み手 U2）。
   - `time` の日本の欄「夏時間がないことは〔要確認〕」を一次資料で外せるなら外す（読み手 T4）。`alt.transition` の米国の欄「100 NM 以内の局」と日本の欄「出発点の標高」に短い言い換えを足せるか（読み手 A4）。
4. **W04（`flight-lab/src/book-terms.js`）**：METAR・ATIS・TAF の読み（カタカナ。候補はメター／メタール・エーティス・タフ。一次資料で確かめられるものだけ）、「管制空域」（controlled airspace）・「最低気象条件」（minimums）・「インチ水銀柱」（inHg。factcheck の 11 の 5）の行。この章は今、これらを本文で定義している。表に入ったら `FL.terms.firstUse` で初出の形をそろえる。
5. **W01（検査の道具）**：`check-style.mjs` の初出の形が、長い語の中の短い語（「計器飛行方式」の中の「計器飛行」）を初出と数える（3 の 2）。
6. **W22（写真）**：`ch00-photo5` が入るまで、`basics.alt` に高度計の見た目が出ない。写真が山の景色なら、高度計の図か写真が別に要る（読み手 A5）。
7. **事実確認役（または W12 の確かめ役）**：5 の 5 の、2 回目に足した文と 9 行を確かめて `checkedBy` を付ける。
