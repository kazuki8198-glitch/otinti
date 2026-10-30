# 事実確認の報告：第 1 部 `radio1`〜`radio5`「英語の交信」（W19 の下書き、R2）

単位：factcheck-radio（W19 の radio の分の事実確認役。下書きは書いていない）。作業日：2026-10-30。
対象：`textbook/rewrite/combined/drafts/radio.js`・`radio-figs.js`・`radio.claims.json`（W19。DESIGN 3.3 の第 1 部 章 13〜17。今の本の並びでは第 10〜14 章として描かれる）。照らしたもの：DESIGN 6.2（15 の決まり）・3.3（章 13〜17）・3.4・4.2（kiso09）、DECISIONS.md、STYLE.md、CLAUDE.md、`reports/W19-radio.md`。
**下書き・台帳・製品のファイルは 1 つも変えていません。** 変えたのはこの報告だけです。直しの案は下の 4 にまとめました（直すのは W19 か、この章の改稿の単位）。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck-radio.md`（新） | この報告 |

## 2. 確かめ方（一次資料。どれも 2026-10-30 に元の URL から新しく取り寄せて本文を読んだ）

| 資料 | URL（下書きの `R`・`NEW_R` と同じ） | 確かめた所 |
|---|---|---|
| FAA AIM（HTML 版。`R.aim21`・`aim23`・`aim32`・`aim41`〜`aim44`・`NEW_R.aim45`・`aim51`・`aim52`・`aim61`〜`aim64`） | faa.gov/air_traffic/publications/atpubs/aim_html/chapN_section_M.html | 2-1-6（REL・THL：最初の灯は停止線、灯は許可の代わりでない、消えても離陸の許可でない、食い違えば止まって確かめる）、2-3-5（4 本・実線の側・機体のどこも越えない・管制塔のない空港は越える前に間隔を確かめる・機体の全部が越えるまで滑走路を出ていない）、2-3-8（「15-33」の並び）、2-3-9・2-3-10、3-2-4（5 NM・10 NM・1,200〜4,000 ft、位置・高度・コード・行き先・Class C の業務、コールサインつきの stand by で確立、外側の区域 20 NM）、3-2-5、4-1-8・4-1-13（have numbers、ATIS の中身・5,000 ft と 5 マイルで省略・毎時と特別観測で更新・記号を言う）、4-1-9（CTAF は UNICOM・MULTICOM・FSS・tower、FSS は Alaska だけ、MULTICOM 122.9、Traffic in the area please advise は使わない、空港名を最初と最後、active runway でなく番号、10 マイル、直進着陸は勧めない・優先なし・91.113(g)）、4-1-15（see and avoid の代わりでない、時計は航跡、業務をやめる前に伝えて 1200）、4-1-20（1200、初めの交信で 100 ft 単位の高度、IDENT は言われたときだけ、2700→2200→7200）、4-2-1〜4-2-4・4-2-6〜4-2-13（全文）、4-3-3（プロペラ機 1,000 ft AGL・左回り・中央の横から水平に入る）、4-3-11（学生は LAHSO に参加しない）、4-3-13（灯火信号の表・地上の応え方）、4-3-14（エンジン始動前に呼ぶ・準備ができたら Tower・121.6〜121.9 MHz・ground point seven・着陸機は言われるまで Tower）、4-3-18（全文）、4-3-21（停止線を越えて止まる）、4-3-23（オプション：ダウンウインドに入るときに頼む）、4-4-7・4-4-10、4-5-1・4-5-7・4-5-8、5-1-14（ETA の 1/2 時間後に捜索救難）、5-2-5（全文）、6-1-2、6-2-2、6-3-1・6-3-2・6-3-4、6-4-1・6-4-2 |
| FAA Pilot/Controller Glossary（`R.pcg`） | faa.gov/air_traffic/publications/atpubs/pcg_html/glossary-{a,c,d,e,f,g,h,i,l,m,n,o,r,s,t,u,v,w}.html | AIR TRAFFIC SERVICE（4 つ）、AIR TRAFFIC CONTROL、FLIGHT INFORMATION SERVICE、ALERTING SERVICE、AIR TRAFFIC CLEARANCE、ATC INSTRUCTIONS、ADVISORY、UNICOM、ROGER・WILCO・AFFIRMATIVE・NEGATIVE・UNABLE・SAY AGAIN・VERIFY・READ BACK・WORDS TWICE・STAND BY・GO AHEAD・OVER・OUT・CONTACT・MONITOR・IMMEDIATELY・EXPEDITE・SQUAWK・IDENT・SAY ALTITUDE（100 ft に丸める）・SAY HEADING・TRAFFIC IN SIGHT・NEGATIVE CONTACT・LINE UP AND WAIT・CLEARED FOR TAKEOFF・CLEARED TO LAND（known traffic and known physical airport conditions）・CLEARED FOR THE OPTION・GO AROUND・HOT SPOT・CLOSED TRAFFIC・RUNWAY HEADING・RADAR CONTACT・RESUME OWN NAVIGATION・RADAR SERVICE TERMINATED・FUEL REMAINING（分）・CONTINUE・DISTRESS・URGENCY |
| FAA Order JO 7110.65（`R.jo71`） | faa.gov/air_traffic/publications/atpubs/atc_html/chap2_section_1・2_4・2_6・3_7・3_8・3_9・3_10.html | 2-1-17（前に伝えた出発の周波数は省いてよい・ground point seven）、2-4-3（復唱が正しいかを確かめる・hold short の復唱）、2-4-8（コールサイン → 局 → 用件）、2-4-17（高度・時刻・規正値・風・北は heading 360・コード・滑走路・周波数の 3 けた目を言わない）、2-4-18（まとめて言い直す）、2-6-3（3 kt 未満は calm）、3-7-2（HOLD POSITION・READ BACK HOLD INSTRUCTIONS）、3-8-1（NUMBER … FOLLOW）、3-9-4（6 マイル以内の一番近い機・90 秒）、3-10-1（continue, expect landing clearance two mile final） |
| 14 CFR（eCFR versioner API、2026-10-28 の版） | ecfr.gov/api/versioner/v1/full/2026-10-28/title-14.xml?part=91 | 91.3、91.113(g)、91.123(a)(b)(c)(e)、91.125（表）、91.129(c)(d)(i)、91.130(a)(c)(d)、91.155（表）、91.159、91.185(b)、91.215(b)、91.225(d) |
| 47 CFR（同、title-47） | 87.173・87.89 | 118.000〜136.975 MHz の表、87.89(d)(4)（国内の VHF 無線電話に無線の資格は要らない：FL.jur の `english.radio` の米国の欄） |
| UK CAA CAP 413 第 24 版（2026-07-01 発効、`R.cap413`） | caa.co.uk/publication/download/18165（PDF を全文テキストにして読んだ） | 2.14（decimal）、AFFIRM・CONFIRM・HOLD SHORT（決まった停止位置がないときや限界を強めるときだけ）・Pass your message、2.69（全文を復唱する 14 項目）、2.71（NEGATIVE と正しい内容）、2.72（UNABLE と理由）、4.128、5.8（Squawk conspicuity）、8.9（Conspicuity Codes 7000 and 2000）、交信例の VFR・Squawking 7000、line up / line up and wait（理由つき）・条件つきの line up、PAN PAN の綴り |
| FAA Runway Safety「Runway Incursions」（`NEW_R.faaRI`） | faa.gov/airports/runway_safety/resources/runway_incursions | 定義（incorrect presence … protected area of a surface designated for the landing and take off）、4 つの区分、Pilot Deviations の例（crosses a runway without a clearance） |
| FAA「From the Flight Deck: Orlando Sanford（SFB）」（`R.sfb`） | faa.gov/flight_deck/sfb（Last updated: Tuesday, June 2, 2026） | 塔 0630L–2300L、Class C で Orlando Class B の下、HS1、白と黄の標示、計器進入・GPS で確かめる、9L/27R が主な運用・9R/27L が主な訓練、同じ送信で復唱、1 マイルの upwind・crosswind・base、LUAW、SOLO、LAHSO |
| AirNav KSFB（FAA の空港データ、`R.sfbData`） | airnav.com/airport/KSFB（「FAA INFORMATION EFFECTIVE 29 OCTOBER 2026」） | 標高 54.8 ft、滑走路の長さ 11,002・6,002・5,839・3,578 ft、場周の左右、滑走路端の座標（図 `sfbLayout` の 8 点と一致） |
| ANA「ボーイング777 パイロットになるまで Phase2」（`R.ana1`） | ana.co.jp/group/777_30th/20251022_2.html | ロンドンで座学・授業は全部英語・航空管制通信のシミュレーション（`comm.icao` の決め打ちの段落） |
| FAA JO 7340.2（Contractions）第 3 章 | faa.gov/air_traffic/publications/atpubs/cnt_html/chap3_section_1.html | ANA の無線電話の呼び名「ALL NIPPON」（`comm.callsign`） |
| NASA ASRS Directline 第 1 号「Readback-Hearback」 | asrs.arc.nasa.gov/publications/directline/dl1_read.htm | 「We call this the hearback problem」「controller silence is not confirmation of a readback's correctness」（下の N1 の出典の案） |
| `flight-lab/src/syllabus.js`・`school.js`・`radio.js`（課目の中身、読むだけ） | — | `bk.sim` の文：t1 は離陸前点検のあと離陸許可の復唱（“wind …, runway 36, cleared for takeoff.”）、t2 は着陸許可の復唱から、e3 に遭難通報の段、k5 の場面に Sanford の 6 場面 |
| 基礎教材 kiso09（原本、読むだけ） | `flight-lab/kiso/data/kiso09.json` | 09.15・09.19〜09.22・09.25・09.27 と記述問題 q15・q19〜q22・q25・q27 の中身と、下書きとの文字の重なり（9） |

道具：`check-chapter.mjs`（下書き 2 つ。Chromium あり／`--claims-out` で抜き出した主張と `radio.claims.json` の突き合わせ／`COMBINED_LEDGERS` に `radio.claims.json` の 308 行を足した写しの台帳で claims の検査）、新しい図 2 枚と描き直し 1 枚を Chromium 390 px で PNG にして目で見た（スクリプトと PNG は scratchpad。リポジトリには置いていない）、kiso09 との 12 字以上の文字の重なりの検査。

## 3. 結果の要約

- **主張の札 308 行**（参考値 276・条文 31・教材値 1。うち例題 33・本の決まり 14）：`--claims-out` の抜き出し 308 行と `radio.claims.json` の 308 行は **ID も文も全部一致**（札のない主張 0）。数値と規則は**全部が一次資料と合う**（5）。署名を止める誤りはない。
- **本文（札の行の外も含む）**：**must 0・should 3・nit 15**（下の 4）。数字・条番号・規則の誤りは見つからなかった。should は、確認問題 1 問の前提が本文と食い違うこと、出典の言っていないことを出典に付けていること、台帳の ID が章の番号で変わること。
- **計算**：全部を計算し直した（6）。誤りなし。
- **図**：新しい 2 枚・描き直し 1 枚と、この章が使う今の図 10 枚を一次資料と照らした（7）。誤りなし（nit 2）。
- **日米の書き分け**：全節 `us`。日本は `bk.jur` の日本の欄と `comm.icao` の `jur-jp` の欄だけ。check-jurisdiction error 0（8）。
- **基礎教材の写し**：なし（9。いちばん長い重なりは記述問題の問いの決まり文句 17 字）。

## 4. 問題と直しの案（重い順）

### must（直すまで登録しない）

なし。

### should（直すのがよい。登録の前に直すことを勧める）

**S1. `radio3` の確認問題 7 の前提「地上滑走の指示では、滑走路に入ってよいと言われている」が、本文の教えと食い違う**
- 今の文：「停止線に近づくと、停止線の赤い灯（REL）がついた。地上滑走の指示では、滑走路に入ってよいと言われている。どうする？」
- 問題：この章は `comm.dep`・`comm.runway`・`radio4` の確認問題 1 で「地上滑走の指示は、滑走路に入る・横切る許可ではない」（AIM 4-3-18：「This does not authorize the aircraft to "enter" or "cross" the assigned departure runway」「ATC will issue an explicit clearance for all runway crossings」）と何度も教える。問いの前提がその逆に読め、初学者が「地上滑走の指示で滑走路に入れる場合がある」と覚えるおそれがある。
- 直しの案：「停止線に近づくと、停止線の赤い灯（REL）がついた。管制官からは、この滑走路を横切る許可（cross runway two seven）をもらっている。どうする？」。正解と理由（AIM 2-1-6：REL が赤なら止まり、許可と食い違えば管制官に確かめる。灯は許可の代わりにならない）は今のままでよい。問の順と位置は変えない（決まり 4）。

**S2. 「Unable と理由と、代わりの希望を言います（PCG：Unable）」の出典が、言っていないことを支えている（`comm.clarify` の本文、`comm.words` の表の「使い方の注意」も同じ中身）**
- 一次資料：PCG の UNABLE は「Indicates inability to comply with a specific instruction, request, or clearance.」だけで、理由や代わりの案には触れない。理由を添えるのは、米国では PCG の AIR TRAFFIC CLEARANCE（「the pilot may request a different clearance … Pilots may also request clarification or amendment … THE PILOT IS RESPONSIBLE TO REQUEST AN AMENDED CLEARANCE if ATC issues a clearance that would cause a pilot to deviate from a rule or regulation, or … would place the aircraft in jeopardy」）、英国では CAP 413 2.72（「UNABLE … and give the reason(s)」）。基礎教材 kiso09.20 も「できない理由と希望する対応を明確に伝え」と書く。
- 直しの案：「従えない指示には “Unable” と言います（PCG：Unable）。理由と、代わりの希望（経路・高度など）も伝えます。規則から外れる・危険になる許可なら、別の許可を求めるのは操縦士の責任です（PCG：Air Traffic Clearance）。」。`comm.words` の表の「理由や代わりの案を添える」は、そのままでよい（出典の列がない）。

**S3. 主張の台帳の 12 行の ID が、描いた「第 N 章」の番号で変わる**
- 問題：`check-claims.mjs` の `claimId` は、`{ch:id}` を描いたあとの文字（例「第 14 章」）を含めて sha1 を取る。下書きの今の描き方では radio1〜radio5 が第 10〜14 章（`law` は第 9 章）で、DESIGN 3.3 どおりに第 1 部の新しい章が登録されると radio1〜radio5 は第 13〜17 章になる。すると下の 12 行は ID が変わり、取り込んだ行が `ledger-row-not-in-book`、新しい行が `claim-untagged` になる（署名がやり直しになる）。
  - `radio.why#16fa26b8`・`comm.pattern#49914297`・`comm.pattern#c7a5e5d0`・`comm.ack#0f4be7a8`・`comm.ack#e911b4fc`・`comm.mistakes#00e28236`・`comm.flow#dd54321f`・`comm.atis#21443c94`・`comm.dep#84532edb`・`comm.tower#4ff4f5ba`・`comm.xpdr#7e2a8b1d`・`comm.practice#6fe5d9ca`
  - ほかの R2 の下書きの札には、描いた `{ch:}` の番号を含む行はない（「PHAK 第 17 章」「CAP 737 第 7 章」のような出典の章だけ）。この章は `{ch:radioN}`・`{ch:law}` を数字のある文の中で多く使うため。
- 直しの案：W19 なら、札のある文の中の `{ch:…}` を `bk.see(節ID, 題)` に替える（題は番号で変わらない）か、`{ch:}` を文の外（括弧の後ろの別の文）へ出す。道具で直すなら W01 が `claimId` の前に「第 N 章」を消す。どちらもしないなら、統合役が R2 の第 1 部の章を全部登録したあとに `--claims-out` で CLAIMS の行を作り直してから署名する（13 の 1〜3）。

### nit（小さな直し）

- **N1.** `comm.readback`「この管制官の確かめを、ヒアバック（hearback）と呼びます」と用語の表「Hearback … （JO 7110.65 2-4-3）」：JO 7110.65 2-4-3 は確かめる義務（Ensure that items read back are correct）を書くが、「hearback」という語は AIM・JO・PCG にない。同じ節の「管制官が何も言わなかったことは、復唱が正しかった証明にはなりません」にも出典がない。どちらも NASA ASRS Directline 第 1 号「Readback-Hearback」（「We call this the hearback problem」「controller silence is not confirmation of a readback's correctness」）が支える。→ `NEW_R` に足して、本文は「…ヒアバック（hearback）と呼びます（NASA ASRS）」「…証明にはなりません（NASA ASRS）」、用語の表は「JO 7110.65 2-4-3（確かめる義務）・NASA ASRS（語）」に。
- **N2.** 章の出典の抜け：`radio1` は `radio.listen` の表 ① で JO 7110.65 2-4-8 を引くが `refs` に `R.jo71` がない。`radio2` は `comm.words` の表で AIM 5-2-5 を引くが `refs` に `R.aim52` がない。→ それぞれ足す。
- **N3.** `comm.ctaf`「CTAF には、UNICOM・MULTICOM・FSS…の周波数が使われます」：AIM 4-1-9 の NOTE は「FSS frequencies are available only in Alaska」（FSS の空港勧告も Alaska だけ）。→「…FSS（Alaska だけ）の周波数が使われます」。
- **N4.** `comm.flow`「どれも管制官から言われる架空の値で、1200 だけは VFR の決まったコードです」：1200 は架空でないので文の中で食い違う。→「4271 と 0425 は管制官から言われる架空の値で、1200 は VFR の決まったコードです（AIM 4-1-20）。」
- **N5.** `comm.xpdr` の写真の文：DESIGN 3.3 は「コード 7000 は欧州の例と書く」。下書きは英国の規則（CAP 413 8.9 の「Conspicuity Codes 7000 and 2000」と VFR の交信例）で説明していて正しいが、写真（Commons の C172 の写真、ドイツ語のファイル名）が英国のものと読める。→「写真のトランスポンダーは 7000 を表示しています（米国の VFR の 1200 ではありません）。」と写真の文を独立させ、英国の文はそのまま。欧州一般のこととして書くなら、各国の AIP（ENR 1.6）で確かめてから。あわせて同じ文は 81 字（style の long-sentence、節の平均 42.2 字）なので「…目立たせるためのコード（conspicuity code）です。VFR の機は 7000 を使います（…）。」と 2 文に。W19 の報告 5.2 は長い文を「変えない節だけ」としているが、`comm.xpdr` は変えてよい節。
- **N6.** `comm.flow` の判断の目「要求は、管制の返事があるまで承認ではありません（AIM 4-4-10）」：AIM 4-4-10 の文は「must not deviate from the provisions thereof unless an amended clearance is obtained」。→「許可を受けて飛んでいるときは、新しい許可（amended clearance）をもらうまで、経路や高度を変えません（AIM 4-4-10）。」（札 `comm.flow#293f894c` の文が変わる）。
- **N7.** `comm.nordo` の表「Class D の地表区域の外か上で…」：AIM 4-2-13 の言い方そのままだが、この章の LAB は Class C。→「管制塔のある空港の地表区域（AIM は Class D の地表区域と書く）の外か上で…」。
- **N8.** `comm.runway` の注意「停止線の前で止まり、自分で滑走路と最終進入を見て…確かめてから越えます（AIM 2-3-5）」：AIM 2-3-5 が求めるのは「ensure adequate separation … prior to crossing」で、止まることまでは書いていない。止まるのは良いやり方なので、「（止まって確かめるのは、この本の勧め）」と分けるか、「停止線の手前で…確かめてから越えます」に。
- **N9.** `comm.numbers` の表「北は 360（000 とは言わない）」の出典が AIM 4-2-10 だけ：北を 360 と言う決まりは JO 7110.65 2-4-17（「Use heading 360 degrees to indicate a north heading」）。AIM 4-2-10 は例に「360 three six zero」があるだけ。`comm.numbers` は変えない節なので、変えてよい時期に「・JO 7110.65 2-4-17」を足す（札 `comm.numbers#2399c556` の文が変わる）。
- **N10.** 図 `runwayEntry`：AIM 2-1-6 は REL の「first light at the hold line followed by a series of evenly spaced lights to the runway edge」。図の赤い点は停止線の破線より 6 px 先から始まる。→ 点の x を 256・264・272・280 に。また ① から停止線へ向かう緑の矢印（150,70 → 234,124）が、標識「A」と「18-36」の上を横切る（文字の箱の検査には出ないが読みにくい）。→ 矢印を標識の上か右を通す（例 `A(250, 62, 246, 114, …)` にして ① の文字を右へ寄せる）か、標識を左へ移す。
- **N11.** 図 `readbackLoop`：空中の段の 4 つめの札「滑走路の指定」の右端が x=400（viewBox の端）にちょうど来て、枠線の半分が切れる。→ 札の並びを x=72 から始めるか、間を 6 → 4 に。
- **N12.** `radio5` の `summary`「米国・英国（ICAO）・日本の言い方の違い」：CADET は日本の列（`jur-jp`）を消すので、CADET の目次では「日本」がない。→「米国（FAA）と英国（ICAO）の言い方の違い」に（日本の列は今のまま。節の題 `comm.icao` も日本を書いていない）。
- **N13.** 札 `comm.icao#955d3024`（必ず復唱するものの行）の出典に、日本の欄の出どころ（FL.jur の `readback`、〔要確認〕）が書いていない。→ 出典に「日本の欄は FL.jur の readback（W06。〔要確認〕：U.readback-japan）」を足す。
- **N14.** 主張の抜き出しが拾わない事実：`comm.xpdr` の「英国では、7000 と 2000 が…（CAP 413 5.8・8.9…）」と「写真の…コード 7000」は、数字に単位がなく出典が CAP 413 なので札の行がない（`check-claims.mjs` の抜き出しの形の外）。中身は CAP 413 8.9 と交信例で確かめた（合う）。道具が CAP・コードの数字を拾うかは W01（13 の 2）。
- **N15.** 台帳のパッチ：W19 のパッチは基礎教材の図 `ch09-fig9-9`（復唱の輪）・`ch09-fig9-10`（滑走路の前の待機位置）の行に触れていない。今の行は「概念の箱の図。第 7 部で新しく描く（W43）」で open のまま。中身は `comm.readback` の `readbackLoop`（教科書の図の描き直し）と `comm.runway` の `runwayEntry`（AIM からの新しい図）が受け持つので、2 行に note（「radio の分は新しい図で扱った。原図の描き直しではない」）を足すと由来表が正確になる。

## 5. 主張の札 308 行の確かめ（`radio.claims.json`）

- **署名してよい（308 行全部）**：
  - 条文 31 行：14 CFR 91.3・91.113(g)・91.123・91.125・91.129(c)(d)(i)・91.130・91.155・91.159・91.185(b)・91.215・91.225 を eCFR の本文で、FL.jur の囲みの行（`english.radio`・`xpdr`・`nordo.vfr`・`light` の日本の欄）は FL.jur の文と同じことを確かめた（日本の欄の値は W06・W12・R1V が確かめ済み。47 CFR 87.89(d)(4) は抜き取りで確かめた）。
  - 参考値 276 行：AIM・PCG・JO 7110.65・CAP 413・FAA Runway Safety・FAA From the Flight Deck・AirNav の本文と合う。例題 33 行（架空の LAB・Lakeside の台本）は、言い方の型が AIM 4-2・4-3・JO 7110.65 と合い、数字は 6 で計算し直した。本の決まり 14 行は外の事実でない。
  - 教材値 1 行（`comm.atis#27cbd919`：LAB 55 ft／KSFB 54.8 ft）：`flight-lab/src/physics.js` の値と AirNav の標高が合う。
- **文を直すと ID が変わる行**：N6 の `comm.flow#293f894c`、N9 の `comm.numbers#2399c556`。S3 の 12 行は、章を登録して番号が変わると ID が変わる（文は今のままで正しい）。
- **出典の書き足しだけ**：N13 の `comm.icao#955d3024`。
- AirNav の効力の日付は、下書きの札と `R.sfbData` が「2026-10-01 有効」、今のページは「2026-10-29 有効」。値（標高・長さ・場周・座標）は同じなので署名に関わらない（13 の 4）。

## 6. 計算（全部を計算し直した）

| 場所 | 計算 | 結果 |
|---|---|---|
| `comm.words` の確認 | 上昇中 3,480 ft → 100 ft に丸める（PCG：SAY ALTITUDE）→ 3,500 → “three thousand five hundred” | 合う |
| `comm.numbers` の確認 | “one zero thousand five hundred” → 10,500 ft、“heading three six zero” → 北 | 合う |
| `comm.numbers` | 135.275 → 小数点以下 2 けたまで（JO 2-4-17）→ “one three five point two seven” | 合う |
| `comm.radar` の確認 | 機首が航跡より 10° 右、12 時（航跡）の他機 → 機首から 10° 左 | 合う |
| `comm.atis` の確認 | FEW050・3,500 ft → 雲の下 1,500 ft ≥ 500 ft（91.155 の Class C・E） | 合う |
| `comm.arrive` | SCT040・2,500 ft → 雲の下 1,500 ft ≥ 500 ft。地上 3,000 ft 未満なので 91.159 の高度の決まりは当たらない | 合う |
| `radio4` 確認問題 5 | 南西（磁航路 180〜359°）・地上 3,000 ft 超 → 偶数千＋500 → 4,500 ft（3,500 ft は 0〜179°） | 合う |
| `comm.flow` | Class C：半径 5 NM は地表〜標高＋4,000 ft、10 NM の棚は＋1,200〜＋4,000 ft（AIM 3-2-4） | 合う |
| `comm.xpdr`・図 `xpdrCodes` | 2700 → 7200：先に 1 けた目を変えると 7700 を通る。2 けた目を先に変えると 2200 → 7200 で 75xx・76xx・77xx を通らない（AIM 4-1-20） | 合う |
| `comm.atis`・`comm.arrive` の ATIS | B 1453Z → C 1553Z（毎時の観測で記号が 1 つ進む：AIM 4-1-13）、規正値 30.01 → 30.00、気温 31 → 32 ℃ | 食い違いなし |
| 周波数・コードのそろい | Ground 121.7・Tower 118.3・Departure 119.75・ATIS 127.65、コード 4271・1200・0425 が本文・台本・図 `radioRelay`・`radioAudioPanel`・`radioCallAnatomy`・`flightOverviewMap` で同じ。コードはどれも 0〜7 の数字だけ | 合う |
| `comm.tower`・`comm.clarify` | LUAW：管制官は 90 秒を超えて待たせない（JO 3-9-4 の NOTE）、2 分以上で事故・インシデント（AIM 5-2-5） | 合う |
| `comm.sfb` | 滑走路の長さ 11,002・3,578・5,839・6,002 ft、場周（9L 左・27R 右・9R/9C 右・27L/27C 左・18 左・36 右）と北・南・東の側 | AirNav と合う |

## 7. 図（`radio-figs.js` の 3 枚は 390 px の PNG で見た。今の図 10 枚はコードを読んで照らした）

| 図 | 照らしたもの | 結果 |
|---|---|---|
| `readbackLoop`（描き直し） | AIM 4-4-7・4-3-18、JO 7110.65 2-4-3・3-7-2 | 指示 → 復唱 → 管制官の確かめ（合えば次・違えば直す）、空中 4 項目・地上 4 項目、Roger だけなら read back hold instructions。誤りなし（N11 の切れだけ） |
| `runwayEntry`（新） | AIM 2-3-5・2-3-8・2-3-9・2-1-6・4-3-18、14 CFR 91.129(i) | 西から東へ走る機に対し、実線 2 本が機の側・破線 2 本が滑走路の側。標識は進む向きの左（北）に、外側に「A」（黒地に黄）、内側に「18-36」（赤地に白）。東向きでは左が北なので「左が 18 の端（北端）」は AIM 2-3-8 の並びと合う。滑走路の番号の位置（北端 18 は逆向き、南端 36）も正しい。誤りなし（N10 の REL の位置と矢印の重なり） |
| `xpdrCodes`（新） | AIM 4-1-20・6-2-2・6-3-4・6-4-2 | 1200・7500・7600・7700 の意味、IDENT は言われたときだけ、2700 → 2200 → 7200。誤りなし |
| `radioRelay`・`radioAudioPanel`・`radioCallAnatomy`（今の図） | AIM 4-3-14、JO 7110.65 2-4-8 | Ground → Tower は準備ができたら自分で変える、コールサイン → 局 → 用件。合う |
| `phoneticBoard`（今の図） | AIM TBL 4-2-7 | 26 文字と 10 数字のつづり・読み（Alfa・Juliett・Xray、CHAR-LEE／SHAR-LEE、YOU-NEE-FORM／OO-NEE-FORM、TREE・FIFE・NIN-ER）。キャプションの「AIM の例文には Alpha」（4-2-4 の Aztec Two Four Six Four Alpha）も合う |
| `callupBlocks`（今の図） | AIM 4-2-3 | 相手 → 自分 → 地上なら場所 → 要求。合う |
| `flightOverviewMap`（今の図） | AIM 3-2-4 | 5 NM（地表から）・10 NM（標高＋1,200 ft から）・外側の区域 20 NM。合う |
| `patternCalls`（今の図） | AIM 4-3-3・4-3-21 | 左場周、45° で中央へ、停止線を越えてから Ground。ダウンウインドの 1,000 ft・90 kt はキャプションで教材値。合う |
| `ctafCalls`（今の図） | AIM 4-1-9・4-3-3 | 滑走路 18 の左場周（ダウンウインドは東側を北向き、ベースは西向き、ファイナルは南向き）、南東から 45° で入る、通報 5 か所。向きも通報の所も合う |
| `lightGunSignals`（今の図） | 14 CFR 91.125、AIM 4-3-13・4-2-13 | 6 種類の信号の地上・飛行中の意味、応え方。合う（図の中の「エルロン・ラダー」は通称のまま：本文の初出は正式名） |
| `sfbLayout`（今の図） | AirNav の滑走路端の座標、FAA From the Flight Deck | 8 点の座標が AirNav と一致、HS1 は 18 と 27C の交わり（18 は 27C の端から約 50 m 西で 9C/27C を横切る）。合う |

check-figures（Chromium 390 px）：章の図 13 枚で error 0・warn 0。

## 8. 日米の書き分け

- 全 28 節 `scope: 'us'`（DESIGN 3.3 の「米国」）。check-jurisdiction は 28 節・章末 249 の文字列で error 0。
- 日本の法令の名前と条番号は、FL.jur の囲み（`english.radio`・`words` ×2・`readback`・`xpdr`・`nordo.vfr`・`light`）の日本の欄だけ。`comm.icao` の表の日本の列は `jpCell()` が FL.jur の `words`・`readback` の `jp` の文をそのまま描き（手で書いた日本の値はない）、`jur-jp` なので CADET が消す（W19 が CADET の読み込みで確かめた。CADET のテスト 247/247）。
- 囲みの置き場所は FL.jur の `boxes` のとおり（check-jur の missing 0）。`words` は `comm.words` と `comm.icao` の 2 か所（DESIGN 3.4 の表のとおり）。
- 米国の規則の数字を国を書かない共通の節に置いた所はない（全部 `us`）。英国の値（7000・2000・QNH・CAP 413）は「英国では」と国を書いている。`comm.callsign` の「日本の ANA の呼び名は “All Nippon”」は規則でなく事実（FAA JO 7340.2 で確かめた）。
- 気になる所は N12（CADET の `summary` の「日本」）だけ。

## 9. 基礎教材の書き直し（写していないか）

- 12 字以上の重なり（kiso09 の本文・記述問題・答えと、下書き 2 つの文字）：最長 17 字（「聞き直しの役割を説明してください。」）。ほかは 16 字以下で、記述問題の問いの決まり文句（「計画の見直しを説明してください。」など）と、短い句（「できるという保証ではありません。」「同じ無線から聞こえても、」）だけ。
- 書き直しの中身：`radio.why`（09.15）は日本の AFIS の説明を外し、PCG の 4 つの業務で米国の本文に。`comm.readback`（09.19）・`comm.clarify`（09.20）・`comm.runway`（09.20〜22）・`comm.flow`（09.25・27）は、考え方（ヒアバック、見込みは許可でない、黙って別のことをしない、迷ったら止まって聞く、着陸許可は保証でない、表示に機がないことは証明でない、計画が変わったら早めに伝える）を、AIM・PCG・JO 7110.65・14 CFR の出典つきの、です・ます の短い文にしてある。いくつかの文は原文と同じ順の言いかえ（例：「前の機が動いた、着陸機が見えなくなった、自分だけが待っている、ということも、新しい許可にはなりません」）だが、一字一句の転記ではない（判断 2 の範囲）。
- 記述問題 7 問（q15・q19〜q22・q25・q27）は場面をそのまま米国の言葉（“Roger”、line up and wait、滑走路 36、TIS-B など）にし、答えは全部書き直し、根拠の節へのリンクがある。基礎教材の図 `ch09-fig9-9`・`9-10` は使わず、教科書の図と AIM からの新しい図で中身を扱った（N15）。

## 10. 検査の結果

### 10.1 章の検査（`check-chapter.mjs`、下書き 2 つ、Chromium あり）

| 検査 | error | warn | pending | 中身 |
|---|---|---|---|---|
| chapters・form・data・volume・jurisdiction・chapter-refs・figures・photos・concepts・jur・path・provenance・egov | 0 | 0 | 0 | W19 の報告と同じ（form の info 18、provenance の info 1）。図 13 枚・写真 5 |
| style | 3 | 14 | 0 | W19 の報告 5.2 と同じ（部品の見出しを文と数える道具の数え方 3、初出の形 8、平均の長さ 3、長い文 2、留保 1）。長い文と平均のうち `comm.xpdr` の 1 文は直せる（N5） |
| questions | 0 | 1 | 0 | 正解の位置 A 6.5%・B 61.3%・C 25.8%・D 6.5%（今の 25 問のほとんどが B。W19 の 7 の 2） |
| calc | 0 | 0 | 1 | `CALC.json` がまだない |
| claims | 0 | 28 | 0 | 今の `CLAIMS.json` に行がないので節ごとに「札なし」。写しの台帳に 308 行を足すと札つき 308/308・札なし 0。`--claims-out` の 308 行は `radio.claims.json` と ID・文とも全部一致 |
| **合計** | **3** | **43** | **1** | |

### 10.2 製品のテスト（下書きは製品が読まないので、壊していないことの確かめ）

- FLIGHT LAB：`cd flight-lab && npm run -s test:fast` → **86/86 pass**
- CADET：`cd cadet && npm run -s test:fast` → **247/247 pass**
- TEXTBOOK：`cd textbook && npm test` → **33/34 pass、1 fail**（`test/build.test.mjs` 単独でも同じ）。落ちたのは「build: FLIGHT LAB sources are not copied into textbook/」で、`actual: 'rewrite/combined/drafts/radio.js'`。下書きのファイル名が `flight-lab/src/radio.js` と同じだから（中身は写しではない。W19 の報告 5.3・8 の 1 と同じ。13 の 3）。

## 11. 台帳の行

触った行はない（この単位は台帳もパッチも書かない）。署名の案は 5 のとおり（`CLAIMS` の `checkedBy` は 308 行全部に付けてよい。ただし S3 のとおり、章を登録して番号が変わる 12 行は作り直したあとに付ける）。W19 のパッチの PROVENANCE（kiso09.27・q15・q19・q21・q22・q25・q27 の `done`、写真 2 枚の `done`、09.15・19〜22・25・q20 の note）は 9 の確かめと合う。ERRATA `T.law.comm-icao` の根拠を ICAO Annex 11 から CAP 413 2.69 に替えたこと（W19 の 8 の 6）は、CAP 413 2.69 の 14 項目で確かめた：英国の必須の復唱は AIM 4-4-7・4-3-18 より多い（再署名してよい）。

## 12. 未解決のこと

1. S1〜S3 と nit の直し（W19 か改稿の単位。S3 は W01 か統合役）。N6・N9 で札の行が変わるので、直したら `--claims-out` で作り直す。
2. `comm.numbers` の「ICAO の言い方の列」（DESIGN 3.3）は、任務が `comm.numbers` を変えないとしているので入っていない（W19 の 7 の 3）。事実の誤りではない。
3. 安全の見直し：`comm.runway`（誤進入）・`comm.mayday`・`comm.nordo` に一次資料と食い違う所はなかった（5・6）。W19 の 7 の 7 のとおり W27・W36 にも見てもらう。
4. 英国のフライトレベルに変わる高度（「空域ごとに決められていて、米国よりずっと低い」）は、本文が「英国の AIP で確かめる」と書いているとおり、この確かめでも UK AIP は読んでいない（数字は書いていないので札は要らない）。

## 13. ほかの単位にお願いしたいこと（needs from others）

1. **W19（または改稿の単位）**：4 の S1・S2・S3（下書きでの直し方）と N1〜N13 を `drafts/radio.js`・`radio-figs.js` で直し、`check-chapter.mjs --claims-out` で `radio.claims.json` とパッチの CLAIMS の行を作り直す（N6・N9 の 2 行と、S3 を下書きで直すなら 12 行の ID が変わる）。N15 の PROVENANCE の note を W19 のパッチに足す。
2. **W01（検査の道具）**：`check-claims.mjs` の `claimId` が、描いた「第 N 章」を消してから ID を作るか（S3。今はこの章の 12 行だけが章の番号に依存しているが、`{ch:}` を文の中で使う章が増えると同じことが起きる）。主張の抜き出しが CAP 413 などの出典とトランスポンダーのコードの数字を拾うか（N14）。
3. **統合役**：S3 を道具で直さないなら、R2 の第 1 部の章を全部登録したあとで CLAIMS の行を作り直してから署名する。TEXTBOOK の `build.test.mjs` の 1 件（10.2）は、W19 の報告 8 の 1 の案（除外の列に `rewrite/combined/drafts` を足す）か、登録のあとで `drafts/radio.js` の名前を変えるか消す。
4. **統合役（`book-core.js` の `R`）**：章を登録するときに、`R.sfbData` の名前の「2026-10-01 有効」を今の AirNav の「2026-10-29 有効」に（値は同じ）。`R.aim21` に「2-1-6 滑走路状態表示灯（RWSL）」を足す（W19 の 8 の 1 と同じ）。N1 の NASA ASRS を `NEW_R` から `R` に移す。
5. **W21（第 1 部の図）**：N10・N11 を直したら、`runwayEntry`・`readbackLoop` を目視の記録に。
6. **W27（R2 の確かめ）**：5 のとおり 308 行は署名してよい。N6・N9・S3 の行は作り直したあとに確かめる。ERRATA `T.law.comm-icao` は再署名してよい（11）。
