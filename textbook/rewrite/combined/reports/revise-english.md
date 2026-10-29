# 直し役の報告：章 `english`「英語で学ぶ準備」（revise-english）

単位：章 `english` の直し役（R1・DESIGN 7.2 の W10 の直し。書いた W10・事実確認役・読み手とは別の役）。日付：2026-10-29。
直したもの：`textbook/rewrite/combined/drafts/english.js`・`drafts/english-figs.js`・`drafts/english.claims.json`（この 3 つだけ）。
もとにした指摘：
- `reports/factcheck-english.md`：must 1・should 9・nit 9。
- `reports/reader-english.md`（1 回目）：must 0・should 13・nit 34。読んだ版は `english.js` d5e2594963d6・`english-figs.js` ac63d4c86e95。直す前の下書きもこの 2 つと同じでした。

決まり：DESIGN 6.2（15 の決まり）・3.3（序部 第 3 章）・3.4（日米の扱い・推測で埋めないもの）・3.5（用語）、DECISIONS（判断 2・3）、STYLE。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/drafts/english.js`（今の sha256 の先頭は 2ae3c40a81dc） | 次の 4 つを直しました。①事実確認の must 1・should 9 のうち 8・nit 9 の全部（S5 は直す所が `FL.terms` で、W04 に頼んだ）。②読み手の should 13 のうち 11 と、一部だけ直した 1（T7）。③読み手の nit 34 のうち 29 と、一部だけ直した 1（E4）。④頭の注、`NEW_R` に出典 5 件（`ac6028b` は URL を替えた）、章末の用語 2 語（9 語に）、章の出典 6 件（19 件に。`R.afh` を含む） |
| `textbook/rewrite/combined/drafts/english-figs.js`（2deac753cd74） | `enTriple`：名前のない灰色のフラップを描かない。題を「右の主翼を上から見た図。上が前」に。キャプションの式の前の空白を取った。`enTalk`：列の見出しを「言い方の例」に、「操縦席で／操縦教員と」、キャプションも操縦教員に |
| `textbook/rewrite/combined/drafts/english.claims.json`（97ac68968c22） | 文を変えたので抜き出し直しました（`check-chapter.mjs --claims-out` の 24 文と、抜き出しにかからない規則・定義・公開情報の文。42 → 87 行）。文が同じ 22 行は前の札と出典のまま。出典だけ直した 5 行は `revisedBy: revise-english`。新しい 60 行は `by: revise-english` |
| `textbook/rewrite/combined/reports/revise-english.md`（新） | この報告 |

ほかのファイルは変えていません。`flight-lab/kiso/`・台帳・`FL.terms`・`FL.jur`・e-Gov の写し・製品のファイルも変えていません。git の操作もしていません。

ただし、3 の製品のテストを流すと出力（`flight-lab/outputs/FLIGHT-LAB.html`・`cadet/outputs/CADET.html`）が作り直されます。下書きは製品が読まないので、出力の中身は変わりません。

## 2. したことと理由

### 2.1 事実確認（`factcheck-english.md`）の指摘

must と should は、S5 のほかは全部直しました。S5 の直し方は `FL.terms` に語を足すことで、持ち物でないため 6 に書きました。`FL.terms` の項目そのものの直しも 6 に書きました。

| # | 指摘 | 扱い | 今の文（場所）と根拠 |
|---|---|---|---|
| M1 | 「名前が大きく違う語」の表の外部点検（飛行前点検、preflight inspection）は、3 つが同じものでない | 直した | `TRIPLE` から `walk-around` を外し、`cross-country` 野外飛行（クロスカントリー、cross-country）にした。表の前に「どの行も、3 つの名前が同じものを指します」と書いた。新しく入れた語は 1 語ずつ basis を確かめた（2.4）。`first-use-form` は 0 |
| S1 | スピン（きりもみ）・着陸装置（降着装置）の通称は、法令の語 | 直した | `spin`・`landing-gear` を外し、`heading` 針路（ヘディング）・`runup` 試運転（ランナップ）にした（事実確認役の案のとおり）。試運転は施行規則第 164 条の 15 第 2 項の「発動機の地上試運転」と、実地試験細則の科目 3-1「始動及び試運転」で確かめた（W05 の写し）。針路は出題範囲参考 ppl.3.1.1.3「針路の定義」で確かめた |
| S2 | 旋回傾斜計＝turn coordinator の対応がゆるい | 直した | `turn-coordinator` を外し、`holding` 待機（ホールディング）にした。出題範囲参考 ir.1.2.1.2「標準待機経路」。項目の note は W04 に頼んだ（6 の 2） |
| S3 | V<sub>MC</sub> の説明に「臨界発動機の不作動」がない | 直した | 「天気の区分と、多発機で片方の発動機が止まったときに方向を保てる最小の速度」。14 CFR 1.2「VMC means minimum control speed with the critical engine inoperative.」は、govinfo の 2025-01-01 版でも確かめた |
| S4 | 自分の言葉の言い直しを、無線の復唱と「同じ考え方」と書いている | 直した | 事実確認役の案のとおりにした：「自分の言葉で言い直すと、食い違いがその場で分かります。相手の言ったことを返して確かめる点は、無線の復唱（readback）と同じです。ただし、無線の復唱は自分の言葉にせず、受け取ったとおりに返します。」。CAP 413 2.18 表 8 の READ BACK「exactly as received」は 2026-10-29 に読み直した |
| S5 | 「専門用語は 1 つの用語の表から」が今は成り立たない | 文は変えない。W04 に頼んだ（6 の 2） | 事実確認役の直し方は、W04 が `FL.terms` に語を足すことです。この単位の直しで、表にない語が 1 つ増えました（座学の教官（ground instructor）。S6 の直しによる）。足してほしい語は全部で 5 つです（権力格差・標準用語・ふつうの言葉・権威勾配・座学の教官）。足すまで章を登録しないでください（6 の 1） |
| S6 | 「2 回目から正式名」の決まりと「教官」の 8 回。座学の教官は操縦教員ではない | 直した（節の題だけ残した） | 操縦席の場面を操縦教員にした（小見出し「操縦席で操縦教員と」、本文、`bk.fact` の Sanford の文、権威勾配の文、説明してみよう 7、図 `enTalk`）。座学の場面は座学の教官にした（考えてみよう、確認問題 2）。`en.class` の初めに 1 文を足した：「この本は、座学で教える人を座学の教官（ground instructor）、飛行訓練で操縦を教える人を操縦教員と書き分けます」。AC 60-28B の囲みは「操縦教員・座学の教官と訓練校」（AC 60-28B 7.1「flight and ground instructors … training facilities, and flight schools」）。章のねらい（`summary`）も「座学の教官・操縦教員との話し方」。**節の題「英語の授業と教官との話し方」は DESIGN 3.3 の題なので残した**（事実確認役の案のとおり、そろえるのは W24。6 の 4） |
| S7 | 主張の台帳の出典の取り違え 4 行と、足りない出典 1 行 | 直した | 文が変わった 3 行（緊急通信・進入復行点・VMC の組）は新しい id になった。出典は事実確認役の案のとおり（`en.terms#1baa6b3f`・`#54ec6d43`・`#244494e3`）。`en.terms#a1c2f5b3`（離陸）は文が同じなので、出典だけ直した。`en.class#c20884bb`（3,500 ft）には AIM 4-2-9 を足した |
| S8 | 2 つめの「米国では」の囲みの中身が、英国と米国の比べ | 直した | 本文の小見出し `<h4>英国と米国の書き方</h4>` に移した。数字と単位の言い方のすぐ後に置いた。説明してみよう 6 のリンクの見出しと同じ題になった |
| S9 | 「指示が分からないまま、操作しません」が、操縦をやめることに読める | 直した | 事実確認役の案のとおりにした：「分からない指示を、推測で実行しません。飛行機はそのまま安定して飛ばしながら、すぐに聞き直します。」。出典に AFH（`R.afh`）を足した |
| N1 | CAP 413 3.2 は「読んでよい」 | 直した | 「英国の CAP 413 は、よく使う略語を、無線でも文字のまま読んでよいと書いています」。3.2 の文は 2026-10-29 に読み直した。3.2 の言う「文字のまま」は、フォネティックアルファベットを使わずに文字で読むことです |
| N2 | AC 60-28B の最新の PDF | 直した | URL を Editorial Update 2（2025-05-19）に替えた。2026-10-29 に落として読み、AC の 1・5・6.2・7.1 の文が同じことを確かめた。ラベルと主張の台帳の AC の行の出典も直した |
| N3 | 日付の順は ICAO の決まりではない | 直した | 表の列の見出しを「米国」「英国」にした。前の文は「米国と英国では、同じ英語でも書き方が違うものがあります」 |
| N4 | 図 `enTalk` の列の見出し | 直した | 「言い方の例」 |
| N5 | PF などの表の見出し「（通称、English）」 | 直した | 「（意味、English）」。下書きの注に理由を書いた |
| N6 | NOTAM の違いの説明「一時的な」 | 直した | 「施設や方式などの変更を急いで知らせるものと、AIP やノータムなどの総称」。P/CG の NOTAM [ICAO] の定義 |
| N7 | 小見出し「つづりの違い」 | 直した | 「つづりと略語の違い」 |
| N8 | 「その感じ方の強さは、国の文化によって違います。」に札がない | 直した | `en.class#67f395f7`。出典は SKYbrary Socio-Culture（マレーシア・フィリピンと、英国・豪州・デンマークの例） |
| N9 | kt の定義が基礎教材 第 8 章の文とほぼ同じ | 直した | 「kt（ノット）は、1 時間に何海里（NM：nautical mile）進むかで表す速さの単位です。knot という語に「1 時間あたり」がもう入っているので、“knots per hour” とは言いません。」。読み手の C15 も一緒に直した。NIST SP 811 B.9「knot (nautical mile per hour)」。海里の初出の形にもなった |

### 2.2 初学者の読み（`reader-english.md`）の should 13

| # | 指摘 | 扱い | 直したこと（場所）と根拠 |
|---|---|---|---|
| T1 | ICAO が何か書いていない | 直した | `en.terms` の共通の本文（表の前。用語の表を読まない版にも出る）に箇条で書いた：「ICAO：国際民間航空機関（International Civil Aviation Organization）です。世界の航空の標準を決める、国際連合の専門機関です。」。国連「The UN System」のページ（2026-10-29）では、見出し UN Specialized Agencies の下に「The International Civil Aviation Organization develops standards for global air transport…」とある |
| T2 | CAP 413・CAA が何か書いていない | 直した | 同じ箇条に書いた：「CAA：英国の航空の規制機関、民間航空局（Civil Aviation Authority）です。」「CAP 413：CAA の無線の手引き（Radiotelephony Manual）です。ICAO の決まりと英国の規則をもとに、英国の無線の言い方をまとめています。」。根拠は 2 つ：CAA の Roles and responsibilities「As the UK's aviation regulator」と、CAP 413 第 24 版の表紙と Foreword 7・8（ICAO Annex 10・Doc 4444・Doc 9432 と UK SERA などの要件のための手引き）。P/CG も初出（ノータムの文）で「米国の FAA の用語集 Pilot/Controller Glossary」と開いた（T14） |
| T3 | 表に迎え角（迎角）。1 字しか違わない | 直した | `aoa` を外した。かわりに `mixture` 混合比（ミクスチャー、mixture）を入れた。出題範囲参考 ppl.1.2.6.3「概要、混合比、異常燃焼」。表は 20 語のまま |
| T4 | 通称の説明に合わない通称（降着装置・迎角・きりもみ・PF の説明文） | 直した | 3 語は M1・S1・T3 で外した。PF などの表の見出しは N5 で直した。表に残した 20 語の通称は、どれもカタカナかふだんの言い方の語にした（2.4） |
| T5 | 外部点検（飛行前点検、preflight inspection） | 直した | M1 で直した |
| T6 | 「略語は頭文字」が V<sub>X</sub> などに合わない | 直した | 「多くの略語は、英語の言葉の頭文字です」とした。続けて「速度の略語は、V の後ろに、速度の種類を表す小さな字を付けます（米国の 14 CFR 1.2 の一覧。V<sub>X</sub>・V<sub>Y</sub> など）。X・Y のように、英語の頭文字でない字もあります。」。14 CFR 1.2 の VA・VFE・VMC・VNE・VNO・VR・VS・VX・VY の定義は、govinfo の年次版（2025-01-01、`CFR-2025-title14-vol1-sec1-2.xml`）で読んだ。この日、eCFR はこの環境からのアクセスを拒んだ。V が何の頭文字かは書いていない（一次資料で確かめられなかった） |
| T7 | 略語の読み方が 1 つもない | **一部だけ直した** | 読み方の決まりを 1 段落にした：「略語の読み方は、2 通りあります」。文字で読んでよい略語の例（CAP 413 3.2 の QNH）と、1 つの語として読む略語の例（CAP 413 の注「CAVOK pronounced CAV-O-KAY」）を挙げ、「どちらで読むかは語によって違うので、初めて会う略語は、授業で読み方を聞いて確かめます（“How do you say this?”）」とした。こう書いたので、ATIS・TAF・NOTAM も文字で読む、とは読めない。**語ごとの読み（ATIS・TAF・NOTAM のカタカナ）は書いていない**。FAA・CAP 413・辞書（Merriam-Webster・Cambridge に見出しがない、Collins は 403）のどれでも、一次資料の読みを確かめられなかったため（revise-basics の EN1 と同じ扱い。DESIGN 3.4）。VMC と V<sub>MC</sub> を声に出したときの言い分けも、資料がないので書いていない。読みは本全体で使えるよう `FL.terms` に置くのがよいので、W04 に頼んだ（6 の 2） |
| C1 | 「分からないまま操作しません」 | 直した | S9 で直した |
| C2 | 数字の表から決まりが読み取れない | 直した | 表の下に、米国の AIM の決まりを箇条にした：「速度：数字を 1 けたずつ言い、最後に knots を付けます（米国の AIM 4-2-11）」「18,000 ft 未満の高度：千の位から上を 1 けたずつ言い、thousand を付けます（米国の AIM 4-2-9）。百の位は、five hundred のように続けます。10,000 ft なら、1 と 0 を言って one zero thousand です。米国の AIM の高度の例は、feet を付けていません。」。AIM 4-2-8・4-2-9・4-2-11 の文は 2026-10-29 に読み直した。feet を言わない理由そのものは AIM に書いていないので、「例に feet がない」という事実だけを書いた |
| C3 | 権力格差と権威勾配の違いが書いていない | 直した | 「権力格差は、国の文化の傾向を表す言葉です。これに対して、権威勾配（authority gradient）は、その場のチームの中で、決める力がどれだけ 1 人に集まっているかを表します。1 人に集まるほど、勾配は急になります（SKYbrary）。」。根拠は 2 つ：SKYbrary Socio-Culture（Hofstede の国の文化の 3 つの次元の 1 つ）と、SKYbrary Authority Gradients（2024-12-10 の版。「command and decision-making power hierarchy in a team…」「Concentration of power in one person leads to a steep gradient」）。権威勾配は Chromium で開いて読んだ（curl では JS の確かめのページになるため） |
| C4 | 2 つめの「米国では」の中身 | 直した | S8 で直した |
| C5 | 復唱を自分の言葉と同じと書いている | 直した | S4 で直した |
| E1 | TEXTBOOK の表で語が途中で割れる | **持ち物でない**（6 の 1） | 原因は `textbook/src/style.css` で、統合役の持ち物です。下書きの側では、表を 1 つ短くした（「名前が大きく違う語」の表の「分野」の列を外した。読み手 T18）。390 px で割れやすい列が 3 → 2 列になった |

### 2.3 初学者の読みの nit 34

直したもの（29）：

| # | 直したこと |
|---|---|
| T8 | RVR を例から外した。例は CAP 413 3.2 の QNH（basics で学んだ語。「QNH（高度の基準に使う気圧の値の 1 つ。英語も QNH）」）にした |
| T9 | 「ノータム（NOTAM）は、英語の Notice to Airmen の略です（米国の FAA の用語集 Pilot/Controller Glossary）。」（P/CG glossary-n の「NOTICE TO AIRMEN (NOTAM)」、2026-10-29） |
| T10 | 表の前の文：「名前が似ている組や、ふだん同じ意味で使われがちな組です。どの組も、別のものを指します。」 |
| T11 | 進入復行の説明（表と説明してみよう 3）：「計器進入（計器を頼りに滑走路へ向かう、決められた飛び方）を着陸まで続けられないときの、決められた手順」（P/CG の MISSED APPROACH・INSTRUMENT APPROACH PROCEDURE） |
| T12 | S3 で直した |
| T13 | 「PAN-PAN は、緊急通信を知らせる、国際的な無線の合図の言葉です。緊急通信は、安全が心配で、すぐではないが早めの助けが要るときの通信です（米国の FAA の用語集）。MAP は地図（map）ではなく、進入復行点の略語です。」（P/CG の PAN-PAN・URGENCY・MAP）。小見出しは N7 で直した。5 つの項目の書き方を「名前（English。米国の形／ICAO・英国の形）」にそろえた |
| T14 | P/CG の初出を開いた（T2） |
| T16 | 未確認の語の段落：主語を立てて 3 文に分けた。「用語の表には、日本語の名前を JCAB の資料でまだ確かめていない語が 2 つあります。どちらも、多発機の章で学ぶ語です。この本は、確かめるまで用語の表の名前で書き、別名を並べます。」。語は箇条にした（81 字の文がなくなった）。「多発機の章」の文は、表の語が全部 `cat: 'me'` のときだけ出す |
| T18 | 「分野」の列を外した |
| T19 | 「通称と略語の両方がある語は「正式名（通称、略語：English）」です。」（`parenAbbr` が作る形と同じ） |
| T20 | 図の灰色のフラップを描かない。題に「右の主翼を上から見た図。上が前」 |
| T21 | ねらいの式の前後の空白を取った（図のキャプションと考えてみようの答えも） |
| C6 | 「米国の FAA の手引きの文書（AC：Advisory Circular）60-28B」（AC の表紙の Advisory Circular と、注「This is a guidance document.」） |
| C7 | 「この基準は、ICAO の言語の力の評価で、実用レベル（レベル 4、Operational Level 4）以上です。ICAO の評価はレベル 1〜6 の 6 段階で、レベル 4 は無線電話の通信に要る最低のレベルです。」（国土交通省 航空局「航空英語能力証明実地試験実施基準」別添 1 の注記、令和 4 年 3 月 29 日最終改正。「実用レベル」は JCAB の訳語：判断 3）。日本の航空英語能力証明との関係は書いていない（囲みは米国の決まりの囲み） |
| C8 | 「航空の安全の知識を集めた資料集 SKYbrary は、研究者 Hofstede のこの定義を挙げています」（SKYbrary の About：「an electronic repository of safety knowledge…」。Hofstede は SKYbrary の参考文献の『Cultures and Organizations』の著者。国籍などは書いていない） |
| C9 | 「“Speak slower” は、授業の表の “speak more slowly” と形が違います。無線では、この形のまま、決まった言葉として使います。」（P/CG・CAP 413 表 8 の SPEAK SLOWER） |
| C10 | 「ていねいな言葉（please・thank you など）を重ねず」と「使ってはいけない、という意味ではありません」（CAP 413 3.6 は「excessive use」を避けるとだけ書く） |
| C11 | 「“So, I check the fuel before I start the engine. Is that right?”」 |
| C12 | 「（stabilator は、知らない語の例）」 |
| C13 | 「（前の雲が大丈夫か分かりません）」 |
| C14 | S6 で直した |
| C15 | N9 で直した |
| C16 | 「「はい」は、米国の FAA の用語集では affirmative、英国の CAP 413 では affirm です。周波数などの小数点は、米国の AIM では point、英国の CAP 413 では decimal と言います。」（P/CG の AFFIRMATIVE、CAP 413 表 8 の AFFIRM、AIM 4-2-8、CAP 413 2.14） |
| C18 | N4 で直した |
| C19 | 数字の表の 2 つ後に「英国と米国の書き方」の小見出しを置いた。その中に、英国の数字の言い方の違い（decimal）と `comm.icao` への予告がある |
| C20 | 「学生操縦士（student pilot）の資格」（intro の下書きと同じ書き方） |
| C21 | 「この本は、国ごとの点数や日本の位置を書きません。どちらの感じ方がよい、という話でもありません。」 |
| E2 | 本文の初出に英語を添えた：「ふつうの言葉（plain language）」（CAP 413 3.1）、「米国の航空英語の基準（AELS：Aviation English Language Standard）」（AC 60-28B の 1） |
| E3 | 章のねらい（`summary`）を 4 文に分けた |

一部だけ直したもの（1）：

| # | 理由 |
|---|---|
| E4（読めない英語） | 単位の表に「日本語」の列を足した（ノット・海里・法定マイル・インチ水銀柱（mercury は水銀）・ヘクトパスカル・セルシウス度（摂氏）など。名前は basics の下書きの単位の表にそろえた）。カタカナの発音は書いていない（T7 と同じく、読みの持ち方を W04 と決めてから） |

直さなかったもの（4）と理由：

| # | 理由 |
|---|---|
| T15（用語の表の場所） | 用語集のページは、まだない（W47）。できたらリンクを足す（DESIGN 6.2 の決まり 13） |
| T17（舵などの読み） | 読みを下書きに手で書くと、「表の名前を手で書かない」（下書きの注）に反します。正式名が変わったときに読みだけ残ります。`FL.terms` に読みの項目を足してもらう形にした（6 の 2） |
| C17（「推測・要確認」の札） | DESIGN 3.4 の「推測で埋めないもの」は、「ロンドンの座学が英国（ICAO）の書き方を使うか」に〔要確認〕の札を求めています。事実確認役も「推測・要確認として正しい」としました。札は残し、中身（公開されていない）は事実の言い方のままにした |
| C22（「わからない」） | 行き先の節 `comm.clarify` の題「わからないとき・従えないとき」に合わせた文字なので、そのまま（読み手の案のとおり） |

### 2.4 「名前が大きく違う語」の表の 20 語（M1・S1・S2・T3・T4 の結果）

補助翼・昇降舵・方向舵・混合比（新）・対気速度計・姿勢指示器・針路（新）・雲高・地上滑走・試運転（新）・場周経路・着陸復行・待機（新）・野外飛行（新）・無線呼出符号・管制承認・進路権・単独飛行・操縦教員・1 発動機不作動。

- 新しい 5 語は、`FL.terms` の basis を出題範囲参考の写し（`ledgers/src/sources/mlit/ppl-airplane.txt`・`instrument-rating.txt`）と W05 の写し（`kokuho-kisoku/164_15.json`）で確かめた。
- どの語も、通称がカタカナかふだんの言い方の語です。英語も、同じものを指します。
- 下書きの `TRIPLE` の注に、外した 5 語と理由を書いた。
- `ABBR` から `ils` を外した。正式名「計器着陸装置」の中に「着陸装置」があるためです。表から `landing-gear` を外すと、初出の形の検査（`check-style.mjs` の `first-use-form`）が、計器着陸装置の文字を着陸装置の初出と数えます。誤検出ですが、下書きの側で避けました（6 の 5）。

### 2.5 主張の札（`english.claims.json`）

- 87 行：参考値 81・条文 4・推測・要確認 2。抜き出しにかかる 24 文は全部に札があります（3）。
- **前の札と出典のまま 22 行**（文が同じ）：`en.terms#6007633f`・`#0d5cd27a`・`#8165bd47`・`#7f53e9a6`・`#ec22f5bd`、`en.class#f6c3ff38`・`#8a5898e6`・`#c32d08f9`・`#81489589`・`#04908c96`・`#13ba695b`・`#b880d5b3`・`#b79975fe`・`#1b66e07a`・`#c9bdc3c1`・`#e4e82a92`・`#d66cdf94`・`#0c4f73c8`・`#dcb4c889`・`#eede1990`・`#2dbd7a1c`・`#f71b3eaa`。
- **出典だけ直した 5 行**（`revisedBy`）：
  - `en.terms#a1c2f5b3`（S7）
  - `en.class#c20884bb`（S7：AIM 4-2-9）
  - `en.class#c2fe31a9`・`#7c3b453d`・`#68081d35`（N2：AC 60-28B の最新の PDF）
- **消えた 15 行**（文が変わった）：`en.terms#086c8038`・`#d72da078`・`#9d38095d`・`#dad35ed1`・`#2bcce834`・`#aeeb0ac2`・`#ff815723`・`#5743071f`、`en.class#31a11d85`・`#413f4556`・`#4cf5d214`・`#12cbc3f4`・`#f33e82ec`・`#7166ced9`・`#9a107958`。どれも新しい文の行に替わった。
- **新しい 60 行**（`by: revise-english`）：出典の文と読んだ日を、行ごとに書いた。2026-10-29 に読んだ一次資料は次のとおりです。
  - 国連 The UN System、UK CAA Roles and responsibilities
  - CAP 413 第 24 版（表紙・Foreword 7・8・3.1・3.2・3.6・2.14・表 8・CAVOK と TORA の注）
  - P/CG（glossary-a・i・m・n・p・r・s・u）
  - AIM 4-2-8・4-2-9・4-2-11
  - 14 CFR 1.2（govinfo の 2025 年版）
  - AC 60-28B Editorial Update 2
  - 国土交通省「航空英語能力証明実地試験実施基準」別添 1
  - SKYbrary の About・Socio-Culture・Authority Gradients
  
  事実確認役が 2026-10-27 に確かめた資料（AFH 第 1 章・NIST B.9・14 CFR 61.83(c)・1.1）は、そう書いた。
- どの行も `checkedBy` は空です（確かめ役が付ける）。

## 3. 検査

| 検査 | 直す前（2026-10-29） | 直したあと |
|---|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/english-figs.js textbook/rewrite/combined/drafts/english.js` | error 0・warn 2（claims）・pending 1（calc）・info 1 | **error 0・warn 2・pending 1・info 1**。warn は claims の `claim-untagged` 2 件だけ。台帳の `CLAIMS.json` に、この章の行がまだないためです（W10 の報告のとおり、登録のときに統合役が足す）。pending は calc の台帳がないため |
| 同じ（`COMBINED_LEDGERS` に、`CLAIMS.json` へこの章の 87 行を入れた写しの台帳） | — | **error 0・warn 0**・pending 1・info 64。claims は 24/24 に札。info の 63 は、抜き出しにかからない文の行の `ledger-row-not-in-book`（W10 の報告 6 の 4 と同じ道具の扱い）。残りの 1 は provenance |
| style | 96 文・平均 31.6 字・最長 78 字 | **136 文・平均 32.8 字・最長 78 字・80 字超 0**、留保 0（ここに注意の中 1）、`first-use-form` 0 |
| figures（Chromium 390 px） | 2 枚 error・warn 0 | 2 枚 error・warn 0、最小の文字 10.3 px。2 枚とも 390 px の画像を目で見た（重なり・はみ出しなし） |
| jurisdiction | error・warn 0 | error・warn 0（米国の規則の言葉 12 か所。どれも「米国の」の文か `bk.us` の中） |
| path | 後ろの部への `bk.see` 4 | 4（どれも「予告」） |
| `FL.terms` を読まない版（CADET の形） | — | 止まらずに描ける（`en.terms` の本文 1,062 字、表は出ない） |
| TEXTBOOK：`cd textbook && npm test` | — | **22/22 pass**（fail 0） |
| FLIGHT LAB：`cd flight-lab && npm run -s test:fast` | — | **80/80 pass**（fail 0） |
| CADET：`cd cadet && npm run -s test:fast` | — | **245/245 pass**（fail 0。下書きは CADET が読まないが、念のため） |

## 4. 台帳の行

台帳のファイルは変えていません（持ち物でないため）。章を登録するコミットで、統合役にお願いします。W10 の報告 5 と、事実確認の報告 6 の表に、次を足してください。

| 台帳 | 行 | 扱い |
|---|---|---|
| CLAIMS | `drafts/english.claims.json` の 87 行 | `op: "add"` で足してください。<br>・文が同じ 22 行は、事実確認役の表のとおり `checkedBy: "factcheck-english"`（2026-10-27）を付けてよいです。<br>・出典を直した 5 行（`revisedBy`）と新しい 60 行（`by: revise-english`）は、確かめ役が確かめてから付けてください |
| UNVERIFIED | `U.london-icao` | 開いたまま。`en.class` の本文の小見出し「英国と米国の書き方」で `bk.est` のまま書いた（前は `bk.us` の中だった） |
| CONCEPTS | （新しい行の提案） | W10 の `C.power-distance`（住所 `en.class`、呼び戻し `crm.crm`）に加えて、権威勾配の住所は `crm.crm` のまま。`en.class` は権力格差との違いを 1 文で書いただけで、「予告」のリンクで `crm.crm` へ渡す。足すかは W03・W32 が決める |

## 5. 未解決のこと

1. **用語の表にない語**（S5）：権力格差・標準用語・ふつうの言葉・権威勾配・座学の教官。W04 が足すまで、「この本の専門用語は、1 つの用語の表から取っています」の文は正しくありません（6 の 2）。
2. **略語・英語の読み**（T7・E4・T17）：語ごとの読みは、一次資料が見つからず書いていません。読み方の決まり（文字で読む略語と語として読む略語がある、授業で確かめる）だけを、CAP 413 の例で書きました。
3. **節の題の「教官」**：節の題「英語の授業と教官との話し方」は DESIGN 3.3 の題のまま。本文は座学の教官と操縦教員に分けた（6 の 4）。
4. 2 回目に足した文は、事実確認役がまだ読んでいません。確かめ役に見てほしい文は 2 つです。
   - 2.5 の 60 行と、出典を直した 5 行。
   - 数字のない新しい文。とくに次のもの：ICAO・CAA・CAP 413 の説明、V で始まる速度の記号、権威勾配の定義、ICAO の 6 段階、座学の教官（ground instructor）の書き分け。
5. TEXTBOOK の表で語が割れること（E1）と、説明してみよう（`written`）がどの製品にも出ないこと（読み手 12 の 4）は、統合役の持ち物です（6 の 1）。

## 6. ほかの単位にお願いしたいこと（needs from others）

1. **登録する統合役（W10 の登録）**：
   - W10 の報告 7 の 1 のとおりに登録してください。`NEW_R` は 12 件になりました。新しいのは次の 5 件で、外部リンクの数に入ります：`cfr12`・`unSystem`・`caaRole`・`jcabElp`・`skyAbout`。`ac6028b` は URL を Editorial Update 2 に替えました。章の `refs` に `R.afh` を足しました（もう `R` にある）。
   - 台帳は 4 の表のとおりです。
   - 6 の 2 の 5 語が `FL.terms` に入るまで、この章を登録しないでください（事実確認役の 7 の 5 と同じ）。
   - 読み手の 12 の 1 の CSS：`textbook/src/style.css` に `.bk-t th, .bk-t td { overflow-wrap: break-word; }` を足してください。この章の表は 1 つ短くしましたが、略語の表・単位の表は 3 列のままです。
   - 読み手の 12 の 4：説明してみよう（`written`）を描く単位を決め、PROGRESS に書いてください。
2. **W04（`flight-lab/src/book-terms.js`）**：
   - 表に 5 語を足す：権力格差（power distance）・標準用語（phraseology）・ふつうの言葉（plain language）・権威勾配（authority gradient）・座学の教官（ground instructor。航空法第 34 条第 2 項の操縦教員は操縦の教育を行う者で、座学の教官は含まない：factcheck S6）。JCAB・法令に名前がなければ `status: 'book'`。足しても、この章は書き直さずに通る（本文の語は同じ）。
   - factcheck の 7 の 2 の項目の直し（この下書きは、もうこれらの語を表に出していない）：
     - `walk-around`：英語を「walk-around（exterior inspection）」に、通称から「飛行前点検」を外す。
     - `spin`・`landing-gear`：きりもみ・降着装置は法令の語、と note に書く。
     - `turn-coordinator`：旋回傾斜計は turn-and-slip indicator も含む、と note に書く。
   - 読みの項目：略語の読み（ATIS・TAF・NOTAM などを文字で読むか語で読むか）と、漢字の読み（昇降舵・方向舵・場周経路・雲高・進路権・無線呼出符号・自差）を持つか決める。持つなら、この章の表がそこから描ける（読み手 T7・T17、revise-basics の 6 の 4 と同じ依頼）。
   - PF・PM・PFD・POH の `common` は意味の説明なので、別の項目（例：`gloss`）に分けるかを決める（読み手 12 の 2）。この章は見出しを「（意味、English）」にして対応した。
3. **W06（`book-core.js` の部品）**：英国の囲みは要らなくなった（S8 の中身は本文の小見出しに移した）。W10 の依頼 7 の 3 は、`comm.icao`・`wx.metar` で要るときだけでよい。
4. **W24（序部と第 1 部の用語）**：
   - 節の題「英語の授業と教官との話し方」（DESIGN 3.3）と、intro・basics の下書きの「教官」を、この章の書き分けにそろえる：座学の教官（ground instructor）と、操縦教員（flight instructor）。
   - 座学の教官を操縦教員に置き換えない（factcheck S6）。
5. **W01（検査の道具）**：`check-style.mjs` の初出の形（`first-use-form`）が、長い語の中の短い正式名を初出と数える。例：計器着陸装置 ⊃ 着陸装置（2.4）。revise-basics の 6 の 5（計器飛行方式 ⊃ 計器飛行）と同じです。
6. **事実確認役（または W12 の確かめ役）**：5 の 4 の文と、2.5 の 65 行を確かめて `checkedBy` を付ける。
