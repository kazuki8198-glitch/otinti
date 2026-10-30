# 専門家の読みの報告：第 1 部 第 13〜17 章 `radio1`〜`radio5`「無線交信」（W19 の下書き・R2）

単位：expert-radio（W19 の章 `radio1`〜`radio5` の専門家の読み手）。読んだ日：2026-10-30。
立場：飛行教官（FAA の CFI・CFII・MEI）で、JCAB の学科（自家用・事業用の航空通信、航空工学の無線とレーダーの所）の出題範囲も知っている読み手として読んだ。

読んだもの：
- 下書き：`textbook/rewrite/combined/drafts/radio.js`（5 章・28 節・章末）、`drafts/radio-figs.js`（新 2：`runwayEntry`・`xpdrCodes`、描き直し 1：`readbackLoop`）、`drafts/radio.claims.json`
- この章に置く日米の囲み（`flight-lab/src/book-jur.js` の `english.radio`・`words`・`readback`・`xpdr`・`nordo.vfr`・`light`）
- 報告：`reports/W19-radio.md`・`factcheck-radio.md`・`reader-radio.md`。形の参考と食い違いの確かめに `expert-law.md`
- 台帳：`ledgers/ACS-MAP.json`（節に `radio.*`・`comm.*` を持つ行と、同じ Task の行）・`JCAB-MAP.json`（航空通信の全 50 行と、`radio.*`・`comm.*` を持つ 9 行）・`CONCEPTS.json`、W19 のパッチ `reports/W19-radio.ledger.json`（ACS・PROVENANCE の行）
- 決まり：DESIGN 3.3（章 13〜17 と、`law`・`ground`・`emg` の行）・3.4・4.1・4.2（kiso09）・5・6.1・6.2（15 の決まり）・7.2、DECISIONS（判断 0・2・3 と補足・11）、STYLE、CLAUDE.md、`FL.terms`（`flight-lab/src/book-terms.js`）
- 比べた他の章：下書きの `drafts/law.js`（`law.basis`・`law.pic`・`law.airspace`）・`drafts/sys.js`（`sys.lights`）・`drafts/wx.js`、登録済みの `book-3.js`（`ground.taxi`・`emg.basic`）・`book-4.js`、今の `book-comm.js`（どの文が W19 で新しく入ったかの確かめ）、基礎教材の原本 `flight-lab/kiso/data/kiso09.json`（09.27。読むだけ）

**下書きは変えていない**（読み手の役目：直さない）。変えたファイルはこの報告だけ。台帳のパッチも書いていない（提案は 10・12 に書いた）。git の操作もしていない。

## 1. 結論

教官の目で見て、5 章とも「交信の型」を、意味と理由と出典つきの台本で教えていて、座学の教材としてそのまま使える所が多い。特に次の 5 つは残してほしい。
- `comm.runway`（新）の「言葉ごとに、してよいこと」の表。taxi・hold short・cross・line up and wait・cleared for takeoff・continue・cleared to land を 1 枚に並べ、「どの言葉で停止線を越えてよいか」を一目で分けている。米国の滑走路誤進入の多くは、この区別の取り違えから起きる。
- `comm.clarify` の許可・指示・情報の 3 段の表と「見込みの言葉で動かない」。kiso09.20 の考え方を、PCG と 14 CFR 91.123 の出典つきで米国の本文にしている。
- `comm.readback` の「復唱のあとも聞く」（管制官が黙っていることは正しい証明ではない）と、「AIM が必ずとしないもの（周波数・コード・規正値）も復唱しておく」の書き分け。
- `comm.radar` の考えてみよう（クラブして機首が航跡より 10° 右なら、12 時の機は機首から左）。実地で学生が最も取り違える所を計算で確かめさせている。
- `comm.sfb` の HS1（滑走路 18 から誘導路 C のつもりで 27C に入る）と、学生操縦士は LAHSO を受けない（AIM 4-3-11）。

数字の正しさは事実確認役が確かめていて、私も今日 AIM・PCG・14 CFR・AC 90-66C で読み直して、書いてある数字に誤りを見つけなかった。私が足すのは、**安全の言い方の矛盾・ACS の知識の項目が台帳では「mapped」なのに本文に半分しかない所・1 つの概念が 2 か所以上で教えられていること・JCAB の語との食い違い**です。

数：**must 1・should 8・nit 14**（3 の表。事実確認役・初学者の読み手と同じ指摘は 6 に対応を書き、ここでは別の理由を足したもの・重さを上げたものだけを数えた）。

- **must**
  - **M1〔安全〕「管制に言われたとおりでは安全に飛べない」ときに「返事を待ってから変える」と教えている**（`comm.flow` の判断の目・`radio4` の例 3・説明してみよう 2）。基礎教材 kiso09.27 にあった「緊急時に必要となる対応は通常の変更要求と区別する」を書き直しで落とした。同じ本の `comm.clarify` は「VFR で雲に入るような指示には従わない」と教えるので、章の間で答えが逆になる。計器飛行の資格のない学生が雲に近づきながら管制の返事を待つ、という読み方ができる（AIM 4-1-17・4-1-18 の PILOT RESPONSIBILITY・6-2-1）。
- **should の主なもの**
  - **S1〔安全〕`comm.mayday` の「できれば上昇」に、VFR の操縦士の但し書きがない**（今あるのは IFR の気象状態の管制空域の但し書きだけ）。AIM 6-2-1：計器飛行の資格のない操縦士は VFR で降りられる道を選び、なければ資格がないことを伝えて遭難を宣言する。エンジン故障の例のすぐ後なので「上昇しない場面」も一言要る（初学者の読み手の MA1 と同じ所。重さの理由を足した）。7700 の文も「交信できないとき」だけでは、1200 で誰とも話していない学生がいつ 7700 にするのか分からない（AIM 6-3-2・6-2-2）。
  - **S2 ACS PA.IX.B.K6「遭難機への ATC の業務」の中身が本文にない**（ACS-MAP は `comm.mayday` で mapped）。管制が何をしてくれるか（応え・助け・機関を動かす・捜索救難へ知らせる：AIM 6-3-1、VFR 機への針路の案内：AIM 6-2-1）と、交信を確立したあとの操縦士のすること（AIM 6-3-2）。
  - **S3 `comm.xpdr`：トランスポンダーの「使い方」が足りない**（ACS PA.III.A.K4・PA.VI.B.K4、JCAB ppl.1.2.5.6・ppl.4.2.5.1）。高度を送る位置（ALT）で動かす決まり（14 CFR 91.215(c)・AIM 4-1-20）、ADS-B Out はいつも送信（91.225(f)）、地上の誘導路と滑走路でも ALT（AIM 4-1-20。RWSL はこれで動く：AIM 2-1-6）、一次レーダーと二次レーダーの違い（AIM 4-5-2）、Mode A・C・S。
  - **S4 `comm.radar`：VFR 機へのレーダーの業務の種類がない**（ACS PA.III.A.K7・PA.VI.B.K3）。基本のレーダー業務（安全の警告・交通情報・限られた針路の案内・順序づけ）と Class C の業務（AIM 4-1-16・4-1-18）、「flight following」の呼び名（PCG）、交通をよける針路は頼んだときだけ・高度を変える前に知らせる（AIM 4-1-15）、「前の機に続け」は前の機への許可を自分に許すものではない（AIM 4-1-18）。
  - **S5〔安全〕滑走路を出るときの決まりの書き落とし**：「ほかの滑走路へ出てはいけない（ATC が認めたときを除く）」「管制塔のある空港では、許可なく滑走路の上で止まったり戻ったりしない」（AIM 4-3-21）と、滑走路に入る・横切る・line up and wait のときの灯火（AIM 4-3-24）。
  - **S6 ACS PA.II.D.K3・K6 の残り**：`comm.runway` が ACS-MAP で K3（標識・標示・灯火）と K6（低視程の地上滑走を含む）の住所になったが、強化された誘導路中心線（AIM 2-3-4）・進入区域と ILS の停止位置・No Entry の標識（AIM 2-3-5・2-3-8）・低視程の地上滑走（AIM 4-3-19）がこの本のどこにもない。
  - **S7 `comm.clarify` の表の「管制承認（クリアランス）」に離陸・着陸の許可を入れている**。判断 3（JCAB の語）で使う `FL.terms` の管制承認の注は「着陸許可・離陸許可は別の語」、航空法も第 97 条（飛行計画の承認）と第 96 条（離着陸の順序などの指示）で分けている（初学者の読み手の C4 と同じ所。法令の根拠を足した）。
  - **S8 1 つの概念が 2 か所以上**：Class C・D の交信の確立（`law.airspace` と `comm.ack`。expert-law の S9 と同じ。住所をそろえる）、Class C の形（`law.airspace` と `comm.flow`）、滑走路の許可の区別（`comm.runway`・`comm.dep`・`comm.tower`・`comm.mistakes` と第 2 部の `ground.taxi`。`ground.taxi` は `{ch:radio4}` を指したまま）、交通情報の時計の方位（`comm.basic`・`comm.numbers`・`comm.radar`）。
  - **管制塔のない空港の「無線を持たない機」**（AC 90-66C 9.12.2）は S 扱いにしたかったが、`comm.ctaf` の考えてみようが見張りを言っているので nit（N7）にした。

## 2. 確かめた一次資料（2026-10-30）

どれも今日、元の URL から取り寄せて本文を読んだ（写しは scratchpad。製品とリポジトリには入れていない）。

- **FAA AIM（HTML 版。faa.gov/air_traffic/publications/atpubs/aim_html/）**
  - 2-1-6（RWSL：REL・THL。「When operating at airports with RWSL, pilots will operate with the transponder/ADS-B "On" when departing the gate or parking area until it is shut down upon arrival」「Never cross over illuminated red lights」「RWSL verifies an ATC clearance; it does not substitute for an ATC clearance」）
  - 2-3-4（Enhanced Centerline：停止線の手前「a maximum of 150 feet」まで中心線の両側に黄色の破線。「warn the pilot that he/she is approaching a runway holding position marking」）
  - 2-3-5（進入区域の停止位置・ILS の停止位置の標示。「the pilot MUST STOP so that no part of the aircraft extends beyond the holding position marking」）
  - 2-3-8（「"15-33" indicates that the threshold for Runway 15 is to the left and the threshold for Runway 33 is to the right」、Runway Approach Area Holding Position Sign（APCH・DEP）、ILS Critical Area Holding Position Sign、No Entry Sign、Taxiway Location Sign は保持位置の標識の外側）
  - 4-1-9（CTAF・自己通報・MULTICOM 122.9・FSS は Alaska だけ・10 マイル・直進着陸は勧めない・「Traffic in the area, please advise」は使わない、`All radio-equipped aircraft transmit/receive on a common frequency`、参照 AC 90-66）
  - 4-1-15（交通情報は見張りの代わりでない、「VFR radar advisory service does not include vectors away from conflicting traffic unless requested by the pilot」「Pilots should also inform the controller when changing VFR cruising altitude」、時計は航跡）
  - 4-1-16（Safety Alert：地形・障害物の警告と他機との接近の警告。VFR は MSAW の監視を頼める）
  - 4-1-17（VFR 機へのレーダーの案内は助言。「To avoid possible hazards resulting from being vectored into IFR conditions, pilots should keep controllers advised of the weather conditions」）
  - 4-1-18（基本のレーダー業務：safety alerts・traffic advisories・limited radar vectoring・sequencing。Class C の業務：IFR と VFR の間隔と到着の VFR の順序づけ。「THE ATC INSTRUCTION TO FOLLOW THE PRECEDING AIRCRAFT DOES NOT AUTHORIZE THE PILOT TO COMPLY WITH ANY ATC CLEARANCE OR INSTRUCTION ISSUED TO THE PRECEDING AIRCRAFT」、PILOT RESPONSIBILITY「WHENEVER COMPLIANCE WITH AN ASSIGNED ROUTE, HEADING AND/OR ALTITUDE IS LIKELY TO COMPROMISE PILOT RESPONSIBILITY RESPECTING … WEATHER MINIMUMS, APPROACH CONTROL SHOULD BE SO ADVISED AND A REVISED CLEARANCE OR INSTRUCTION OBTAINED」）
  - 4-1-20（地上で「operate with the transponder in the altitude reporting mode … and ADS-B Out transmissions enabled at all airports, any time the aircraft is positioned on any portion of the airport movement area」、飛行中「MUST operate … with altitude reporting enabled whenever in controlled airspace」「Aircraft equipped with ADS-B Out MUST operate with this equipment in the transmit mode at all times」、IDENT は言われたときだけ、2700 → 2200 → 7200、STOP ALTITUDE SQUAWK のときは高度計の規正を確かめる）
  - 4-3-18（taxi の指示は出発の滑走路に入る・横切る許可でない、横切る滑走路ごとに明示の許可、「pilots should always read back: The runway assignment. Any clearance to enter a specific runway. Any instruction to hold short of a specific runway or line up and wait.」、1 人で操縦する機は滑走路に入る許可から Class B・C・D の地表区域を出るまで、着陸の許可から地上滑走が終わるまで、ATC の交信だけを聞く、progressive taxi）
  - 4-3-19（低視程の地上滑走：迷いそうならすぐ伝える、太陽に向かうとき、動いている間はチェックリストと不要な交信をしない）
  - 4-3-21（「Pilots must not exit the landing runway onto another runway unless authorized by ATC. At airports with an operating control tower, pilots should not stop or reverse course on the runway without first obtaining ATC approval.」、停止線を越えて止まる、駐機場への taxi の許可は滑走路に入る・横切る許可でない）
  - 4-3-23（オプション：VFR の場周ではダウンウインドに入るときに頼む）
  - 4-3-24（「all exterior lights should be illuminated when taxiing on or across any runway」「When entering the departure runway for takeoff or to "line up and wait," all lights, except for landing lights, should be illuminated」、着陸灯は離陸の許可を受けたとき）
  - 4-4-7（「Pilots of airborne aircraft should read back … altitude assignments, vectors, or runway assignments」、言われた順に、最初の復唱に滑走路、許可を受けるか断るかは操縦士の責任）
  - 4-4-10（「must not deviate … unless an amended clearance is obtained」「In case emergency authority is used to deviate from provisions of an ATC clearance, the pilot-in-command must notify ATC as soon as possible and obtain an amended clearance」）
  - 4-5-1・4-5-2（一次レーダーは反射、ATCRBS（二次監視レーダー）は質問機とトランスポンダーの応答。小型機は一次レーダーに映りにくい）
  - 6-2-1（「If a course of action is available which will permit flight and a safe landing in VFR weather conditions, noninstrument rated pilots should choose the VFR condition rather than requesting a vector or approach that will take them into IFR weather conditions」「If continued flight in VFR conditions is not possible, the noninstrument rated pilot should so advise the controller and indicating the lack of an instrument rating, declare a distress condition」）
  - 6-2-2（遭難・緊急で地上のレーダーに知らせたいときは 7700 と Mode C、そのあとすぐ交信）
  - 6-3-1（呼ばれた局は「immediately acknowledge a distress or urgency message, provide assistance, coordinate and direct the activities of assisting facilities, and alert the appropriate search and rescue coordinator if warranted」、121.5 MHz）
  - 6-3-2（「Climb, if possible … However, … unauthorized climb or descent under IFR conditions within controlled airspace is prohibited, except as permitted by 14 CFR section 91.3(b)」、交信中なら今のコード・すぐに交信できなければ 7700、通報の 11 項目、交信を確立したら指示に従い・分からなければ聞き・必要がなければ周波数を変えない、不時着が迫ったら ELT・目印・機体の色）
- **FAA Pilot/Controller Glossary**：GO AROUND（VFR は滑走路の上を上昇して場周高度へ、クロスウインドから場周に入る：下書きと合う）、MINIMUM FUEL（「This is not an emergency situation but merely indicates an emergency situation is possible」）、FLIGHT FOLLOWING（「See TRAFFIC ADVISORIES」）、RADAR SERVICE TERMINATED、HOW DO YOU HEAR ME?
- **14 CFR（eCFR versioner API、2026-10-28 の版）**：91.215(c)「Transponder-on operation … in all controlled airspace, each person operating an aircraft equipped with an operable ATC transponder … shall operate the transponder, including Mode C equipment if installed」、91.225(f)「must operate this equipment in the transmit mode at all times」
- **FAA AC 90-66C（2023-06-06、faa.gov の PDF）**：9.8 の注（「ANY TRAFFIC IN THE AREA, PLEASE ADVISE」は使わない）、9.9（左回りと、無線を持つ機の CTAF の手順）、9.12.2 No-Radio Aircraft（「procedures at airports without operating control towers generally do not require the use of two-way radios; therefore, pilots should be especially vigilant」）
- **航空法（e-Gov の写し `textbook/rewrite/sources/egov/articles/kokuho/96.json`・`97.json`、令和 7 年 12 月 1 日施行の版）**：第 96 条（航空交通の指示：離陸若しくは着陸の順序・時機・方法、地上走行の方法の指示）、第 97 条（飛行計画及びその承認）
- **基礎教材 kiso09.27（原本、読むだけ）**：「要求を送信しただけで変更が承認されたとは考えず、返答と条件を確認します。緊急時に必要となる対応は通常の変更要求と区別して扱います。」

## 3. 問題の一覧

重さ：**must**＝安全に関わる誤りか、章の間で答えが逆になるもの（直すまで登録しない）。**should**＝ACS・JCAB の見出しに対して中身が足りない、誤解を生む、1 つの概念が 2 か所。**nit**＝小さな直し。直しの案の文は、出典を 2 で確かめた範囲で書いた（文そのものを使う必要はない）。

### must（1）

**M1〔安全〕計画どおりに飛べないとき：「返事を待ってから変える」と「雲に入る指示には従わない」が食い違う**
- 場所：`comm.flow` の判断の目 4 つめ「雲・風・燃料・機体の具合で、計画どおりに飛べないとわかったら、早めに理由と希望（経路・高度・行き先）を伝えます。要求は、管制の返事があるまで承認ではありません（AIM 4-4-10）」、`radio4` の例 3「帰りの経路に雲が広がってきた → 早めに Approach に…理由と希望を伝え、返事を待ってから経路を変える」、説明してみよう 2 の答え「続けません。…要求は、返事があるまで承認ではないので、新しい許可を確かめてから変えます」（問いは「管制に言われたとおりでは安全に飛べなくなりました」）。どれも W19 が kiso09.27 から新しく書いた文（今の `book-comm.js` にない）。
- 問題：
  1. 説明してみよう 2 は「言われたとおりでは安全に飛べない」場面なのに、答えが「新しい許可を確かめてから変える」で終わる。`comm.clarify` は「指示に従えない：“Unable, clouds ahead”。VFR で雲に入るような指示には従わない」と教えるので、同じ部の 2 つの節で答えが逆になる。
  2. 原本 kiso09.27 の「緊急時に必要となる対応は通常の変更要求と区別して扱います」が書き直しで落ちた。
  3. 「要求は返事があるまで承認ではない」は、管制の指示（針路・高度・経路）を受けて飛んでいるときの話（AIM 4-4-10・4-1-18）。レーダーの交通情報だけを受けている VFR 機（flight following）は、許可を受けて飛んでいるのではなく、高度や経路を変える前に「知らせる」（AIM 4-1-15）。今の文は、この 2 つを区別しない。
  4. 計器飛行の資格のない学生が、雲に近づきながら返事を待つ、と読める。AIM 6-2-1 は「VFR で降りられる道があればそれを選ぶ」、4-1-18 は「天気の最低条件を守れなくなりそうなら、それを伝えて新しい指示をもらう」、4-4-10 と 14 CFR 91.123(c) は「緊急の権限で外れたら、すぐに伝える」。
- 直しの案：
  - 判断の目：「雲・風・燃料・機体の具合で、計画どおりに飛べないとわかったら、早めに理由と希望（経路・高度・行き先）を伝えます。管制の指示（針路・高度・経路）を受けて飛んでいるときは、新しい指示をもらってから変えます（AIM 4-4-10・4-1-18）。ただし、従うと雲に入る・地形に近づくなら、待たずに “unable” と言って VFR を保ちます。緊急で指示から外れたら、すぐに管制に伝えます（14 CFR 91.123(c)）。交通情報だけを受けている（指示を受けていない）ときは、高度や経路を変える前に管制官に知らせます（AIM 4-1-15）。」
  - 例 3：「帰りの経路に雲が広がってきた → 雲に近づく前に Approach に『雲を避けて南から帰りたい』と伝える。指示を受けているなら新しい指示を待つが、雲に入りそうなら待たずに unable と言って雲を避け、すぐに伝える。」
  - 説明してみよう 2 の答え：「続けません。いまの位置・高度、天気や機体の事情、残りの燃料、希望する経路・高度・行き先を、早めに伝えます。指示を受けているなら、ふつうは新しい指示をもらってから変えます。ただし、待つと雲に入る・地形に近づくなら、unable と言って安全な方へ変え、すぐに伝えます。行き先を変えたら、飛行計画の到着の予定も見直します。」（`bk.see('comm.clarify', …)` を足すと、2 つの節がつながる）
  - 札：`comm.flow#293f894c` の文が変わる（事実確認役の N6 と同じ行。N6 の直しはこの案に入っている）。〔安全〕なので W27・W36 の安全レビューでも見る。

### should（8）

**S1〔安全〕`comm.mayday`：「できれば上昇」に VFR の但し書きがない／7700 にする時がはっきりしない**
- 今の文：「できれば上昇します。無線もレーダーも届きやすくなります（AIM 6-3-2）。ただし、IFR の気象状態の管制空域では、許可なく上昇・降下してはいけません（緊急のときの 14 CFR 91.3(b) の場合を除く。AIM 6-3-2）。」「管制と交信しているなら、もらっているコードのままにします。交信できないときは 7700 にします（AIM 6-3-2）。」
- 問題：
  - 但し書きは AIM 6-3-2 のとおりで誤りではないが、読むのは計器飛行の資格のない学生。いちばん要る但し書きは「VFR の操縦士は雲に入るような上昇をしない」（AIM 6-2-1：資格のない操縦士は VFR で降りられる道を選び、なければ資格がないことを伝えて遭難を宣言）。DESIGN 10.1 の行（law comm.mayday「上昇の但し書き」）の趣旨もここ。
  - すぐ上の MAYDAY の例はエンジン故障。エンジンが止まったら上昇しない（最良滑空速度を保つ）ことを一言書かないと、「上昇」と「エンジン故障」が並ぶ（初学者の読み手の MA1）。
  - AIM 6-3-2 の 7700 は「If unable to immediately establish communications」。1200 で飛んでいて、まだ誰とも話していない学生も当たる（AIM 6-2-2：7700 にしてから、すぐ交信を始める）。「交信できないとき」だけでは無線の故障と読める（無線の故障は 7600）。
- 直しの案：「上昇できるなら上昇します。無線もレーダーも届きやすくなります（AIM 6-3-2）。ただし、雲に入るような上昇はしません。計器飛行の資格がなければ、VFR で降りられる道を選び、それがなければ資格がないことを伝えて遭難（MAYDAY）を宣言します（AIM 6-2-1）。IFR の気象状態の管制空域では、許可なく上昇・降下してはいけません（14 CFR 91.3(b) の場合を除く。AIM 6-3-2）。エンジンが止まったときは上昇せず、最良滑空速度を保ちます。」「管制と交信しているなら、もらっているコードのままにします（指示があれば変える）。すぐに交信できないとき（1200 で飛んでいて、まだ誰とも話していないときも）は 7700 にして、すぐに交信を始めます（AIM 6-3-2・6-2-2）。」

**S2 ACS PA.IX.B.K6「Air traffic control (ATC) services to aircraft in distress」が本文にない**
- ACS-MAP の PA.IX.B.K6 は節 `comm.mayday` で mapped。本文は「助けを求める言い方」だけで、管制が何をしてくれるかがない。口述試験で「MAYDAY と言ったら管制は何をしてくれるか」と聞かれて、この本では答えられない。
- 直しの案（`comm.mayday` に 3〜4 文）：「呼ばれた局はすぐに応え、助け、ほかの機関を動かし、必要なら捜索救難に知らせます（AIM 6-3-1）。レーダーの管制官は、交信でき、レーダーの範囲にいる VFR の機に、針路の案内（vector）をくれます。案内は助言で、安全に飛ぶ責任は操縦士に残ります（AIM 6-2-1）。交信を確立したら、指示に従い、分からなければ聞き、どうしても必要でなければ周波数を変えません（AIM 6-3-2）。不時着が迫ったら、時間があれば ELT の状態・目印・機体の色も伝えます（AIM 6-3-2）。」（ELT の本体は `emg.basic`。ACS-MAP PA.IX.B.K5）

**S3 `comm.xpdr`：トランスポンダーと ADS-B Out の「使い方」と「しくみ」が足りない**
- ACS PA.III.A.K4「Appropriate use of transponder(s)」・PA.VI.B.K4「Transponder (Mode(s) A, C, and S) and ADS-B」、JCAB ppl.1.2.5.6（航空工学：レーダー）・ppl.4.2.5.1（二次レーダー：トランスポンダーの操作・高度自動通報装置の作動義務）。本文にあるのは、装置の一言・Squawk と Ident・4 つのコード・コードの変え方・装備の要る空域。
- 足りないもの（どれも 2 で確かめた）：
  1. **動かす決まり**：管制空域では、高度を送る位置で、言われたコードで動かす（14 CFR 91.215(c)・AIM 4-1-20）。ADS-B Out はいつも送信（91.225(f)）。図 `xpdrCodes` のつまみ「OFF・SBY・ON・ALT・TST」のどこに合わせるかが本文にない（初学者の読み手も同じ所で止まった）。
  2. **地上でも ALT**：誘導路と滑走路の上では、高度を送る位置と ADS-B Out を入れる（AIM 4-1-20）。RWSL（`comm.runway` の REL・THL）は、これで機を見ている（AIM 2-1-6）。駐機場に着いたら STBY か OFF。滑走路誤進入の章として、ここを書かないと REL の説明が片手落ちになる。
  3. **しくみ**：一次レーダー（電波の反射）と二次レーダー（地上の質問にトランスポンダーが答える）の違い、小型機は一次レーダーに映りにくいこと（AIM 4-5-1・4-5-2）。Mode A（コード）・Mode C（高度）・Mode S。JCAB の航空工学の「レーダー」はこの深さを問う。第 1 部のほかの下書きにも本にもない（`book-photos.js` の写真の説明に 1 句あるだけ）。
  4. 「STOP ALTITUDE SQUAWK」と言われたら高度計の規正を確かめる（AIM 4-1-20）。高度は標準気圧で送られ、規正は地上でかけられる。
- 直しの案：小見出し「動かし方」を足し、上の 1・2・4 を 4〜5 文。3 は 2〜3 文。図 `xpdrCodes` のつまみの横に「ふつうは ALT（地上でも）」の 1 行。装備の要る空域は `law.airspace` が住所なので、`{ch:law}` を `bk.see('law.airspace', …)` に（S8・expert-law の 5 の表と同じ）。

**S4 `comm.radar`：VFR 機へのレーダーの業務の種類と、操縦士の責任の書き分けがない**
- ACS PA.III.A.K7「Radar assistance」・PA.VI.B.K3「Radar assistance to VFR aircraft (e.g., operations, equipment, available services, traffic advisories)」。本文は交通情報の型と時計の方位と見張りの責任で、`available services` がない。
- 足りないもの：
  1. 基本のレーダー業務（safety alerts・traffic advisories・limited radar vectoring・sequencing）と Class C の業務（IFR と VFR の間隔、到着の VFR の順序づけ）（AIM 4-1-18）。安全の警告（low altitude alert・traffic alert）を受けたら、どうするかは操縦士が決める（AIM 4-1-16）。
  2. 学生が実際に聞く呼び名「flight following」（PCG：FLIGHT FOLLOWING → TRAFFIC ADVISORIES）。出発のときに Ground で頼める（AIM 4-1-18 の例）こと。
  3. 交通をよける針路は、頼んだときだけ（「VFR radar advisory service does not include vectors away from conflicting traffic unless requested by the pilot」）、VFR の巡航高度を変えるときは知らせる（AIM 4-1-15）。M1 の直しの「知らせる」の根拠にもなる。
  4. `comm.arrive` の「number two, follow the Cessna」に、「前の機に続けという指示は、前の機への許可や指示を自分に許すものではない」（AIM 4-1-18）。見失ったら伝える。
- 直しの案：`comm.radar` に小さな表（業務・中身・出典）と 2 文。4 は `comm.arrive` の台本の注の欄に 1 文。

**S5〔安全〕滑走路を出るとき・入るときの決まりの書き落とし**
- `radio.why` の考えてみよう・`comm.arrive`・`comm.runway` は「停止線を越えて止まる」（AIM 4-3-21）を書くが、同じ段落の次の 2 つがない。
  - 「Pilots must not exit the landing runway onto another runway unless authorized by ATC.」（ほかの滑走路へ出ない。Sanford の HS1 はまさにこの形で、`comm.sfb` の箇条とつながる）
  - 「At airports with an operating control tower, pilots should not stop or reverse course on the runway without first obtaining ATC approval.」
- 灯火：「滑走路を横切るときは外の灯火を全部つける」「出発の滑走路に入るとき・line up and wait のときは、着陸灯のほかを全部つける。着陸灯は離陸の許可を受けたとき」（AIM 4-3-24）。最終進入の機と管制官から見えるようにするためで、誤進入の防ぎ方そのもの。`sys.lights`（下書き）は着陸灯の勧め（昼も空港の近くで）だけで、滑走路の灯火の使い方はこの本のどこにもない（ACS PA.II.D.K5 は `sys.lights`・`ground.taxi` で mapped）。
- 直しの案：`comm.runway` の判断の目に 2 項目（「着陸して出るときは、言われた誘導路か最初に使える誘導路で出る。ほかの滑走路に出たり、滑走路の上で止まったりしない（AIM 4-3-21）」「滑走路を横切るときは外の灯火を全部、line up and wait では着陸灯のほかを全部つける（AIM 4-3-24）」）。`comm.arrive` の段落に 1 文（ほかの滑走路へ出ない）。

**S6 ACS PA.II.D.K3・K6 の残り（標識・標示と低視程の地上滑走）が本のどこにもない**
- W19 のパッチは PA.II.D.K3（Airport markings, signs, and lights）・K2・K6 の `missing` から `comm.runway` を外し、K6 の残りは `ops.night` だけにした。ところが次は第 1〜6 部のどこにもない（下書き全部と登録済みの本を探した）。
  - 強化された誘導路中心線（停止線の手前の黄色の破線。AIM 2-3-4）：停止線が近いことを教える標示。
  - 進入区域の停止位置（「36-APCH」の標識）と ILS の停止位置（AIM 2-3-5・2-3-8）。管制官が「hold short of runway 36 approach」と言う所で、SFB のような空港で学生も聞く。
  - No Entry の標識（AIM 2-3-8）。
  - 低視程の地上滑走（K6e。AIM 4-3-19：管制塔から見えないことがある、迷いそうならすぐ伝える、太陽に向かうときに注意、動いている間はチェックリストと不要な交信をしない）。
- 直しの案：`comm.runway` に、標識と標示の小さな表（標示・色・意味・すること）を 1 つ足し、判断の目に低視程の 1 項目。図 `runwayEntry` に強化された中心線の破線を描き足すと、停止線の手前の流れが 1 枚で分かる。足さないなら、ACS-MAP の K3・K6 の行を `missing` に戻して、第 2 部の `ground.taxi`（W28）を書き手にする（12）。

**S7 `comm.clarify` の「管制承認（クリアランス）」の例に、離陸・着陸の許可と横断の許可を入れている（判断 3 の語）**
- 今の表：「管制承認（クリアランス、ATC clearance）｜…こう動いてよいと認めること｜cleared for takeoff・cleared to land・cross runway two seven」。
- 英語の PCG では takeoff clearance も ATC clearance の一種なので、英語の意味は誤りではない。しかし判断 3 で使う日本語の正式名では、`FL.terms` の管制承認の注が「着陸許可・離陸許可は別の語」、航空法も第 97 条（飛行計画の承認＝管制承認）と第 96 条（離陸・着陸の順序・時機・方法、地上走行の方法の指示）で分けている。JCAB の出題範囲参考も「管制承認」（ppl.4.2.4.1）と「着陸許可・離陸許可」（ppl.4.2.3.2 管制許可等）を別の見出しにしている。この表のとおりに覚えると、JCAB の航空通信で取り違える（初学者の読み手の C4 は「離陸の許可は管制承認なのか」で止まった）。
- 直しの案：表の 1 行目を「許可（clearance）｜管制が、決めた条件のもとで、こう動いてよいと認めること（PCG：ATC clearance）｜経路や空域の許可＝管制承認（cleared to … airport・cleared into Class Bravo）、滑走路の許可＝離陸許可・着陸許可・横断の許可（cleared for takeoff・cleared to land・cross runway two seven）」。用語の表の `ATC clearance` の行も「管制承認（経路・空域）。離陸許可・着陸許可は別の語（FL.terms）」に。W04 の表の注と同じ書き方になる。

**S8 1 つの概念が 2 か所以上（DESIGN 3.2「完全な説明は 1 か所だけ」、基準 15）**
- 5 の表にまとめた。主なもの：
  - **Class C・D の交信の確立**：`law.airspace`（下書き）と `comm.ack` が、同じ 3 つの応答・同じ「Aircraft calling LAB Approach, stand by」・同じ問いで、完全に 2 回教える。expert-law の S9 と同じく、住所を `law.airspace` にし、`comm.ack` は「思い出そう」（3 行以内）＋言い方の台本だけにするのがよい。ただし `radio3` の確認問題 2（今の本からある問）は決まり 4 で消せないので残し、理由の根拠を `law.airspace` へのリンクにする。
  - **Class C の形**（半径 5 NM・10 NM の棚）：`comm.flow` が `law.airspace` の表と同じ数字で説明し直す。`comm.flow` は 1 文と `bk.see('law.airspace', …)` に。
  - **滑走路の許可の区別**（taxi は停止線の手前まで・line up and wait は離陸の許可でない・continue は着陸の許可でない）：`comm.runway`（新しい住所）・`comm.dep` のよくある間違い・`comm.tower`・`comm.mistakes`・`comm.words`・`comm.readback`・`comm.sfb`・`comm.icao`、第 2 部の `ground.taxi`（登録済み：停止線の段落と「taxi via … は滑走路の手前まで（{ch:radio4}）」）。安全の要点なので、くり返すこと自体は悪くないが、太字の定義と完全な説明は `comm.runway` の 1 か所にし、ほかは 1〜2 文の呼び戻しにそろえる。`ground.taxi` のリンクは `comm.runway` を指すように（W28）。
  - **交通情報の時計の方位**：`comm.basic`（W19 が足した箇条）・`comm.numbers`（変えない節）・`comm.radar`（考えてみようつき）の 3 か所。住所は `comm.radar`。`comm.basic` の箇条は「時計の方位（${bk.see('comm.radar', …)}）」の 1 句に。
- 直しの案：CONCEPTS に `C.two-way-comms`（住所 `law.airspace`・呼び戻し `comm.ack`。expert-law と同じ行）・`C.runway-clearances`（住所 `comm.runway`・呼び戻し `comm.dep`・`comm.tower`・`comm.mistakes`・`ground.taxi`、maxLines 3）・`C.traffic-clock`（住所 `comm.radar`・呼び戻し `comm.basic`。`comm.numbers` は変えない節なので例外の note）・`C.class-c-shape`（住所 `law.airspace`・呼び戻し `comm.flow`）を足す（10）。

### nit（14）

- **N1.「必ず復唱するもの」の「必ず」**（`comm.readback`・図 `readbackLoop`・`comm.icao` の行）：AIM 4-4-7・4-3-18 の言い方は「should（always）read back」で、義務の言葉（must）は管制官の側（「ATC is required to obtain a readback … of all runway hold short instructions」）。この章自身が「AIM は法律ではありません」と教えるので、「AIM がいつも復唱するよう求めるもの」とし、hold short だけは「管制官は復唱を必ず求める」と書き分けると正確。米国の口述試験で「復唱は規則か」と聞かれる所。
- **N2.「18-36」なら「左が滑走路 18 の端」**（`comm.runway` の本文・図 `runwayEntry` の注）：AIM 2-3-8 は「the threshold for Runway 15 is to the left」。「端」は離陸の終わりの端とも読めるので「左に滑走路 18 の進入端（threshold）」に。
- **N3. 1 人で操縦する機の「ATC の交信だけを聞く」**（`comm.runway` の判断の目）：AIM 4-3-18 は、滑走路に入る許可から Class B・C・D の地表区域を出るまでと、**着陸の許可から地上滑走が終わるまで**。着陸の側を足す。
- **N4. `comm.atis` の考えてみよう**：「Few clouds at five thousand」は地上からの高さ（AGL）、3,500 ft は MSL。LAB の標高 55 ft で差は小さいが、答えに 1 句（「雲の高さは地上から。LAB は標高が低いので、ほぼそのまま比べられる」）。初学者の読み手の AT1 と同じ所。
- **N5.「地上滑走の許可」と「地上滑走の指示」**（`comm.dep` の題と ここが大切、`comm.readback`）：米国の資料も両方を使う（AIM 4-3-18「taxi instructions」と「ATC will not use the word "cleared"」、AIM 4-3-21「obtain a taxi clearance」、ACS PA.II.D.K2「Taxi instructions/clearances」）。JCAB の出題範囲参考も「地上滑走指示及び許可」（ppl.4.2.3.4）。だから語を 1 つに決め、`comm.runway` で一度「地上滑走の指示（taxi instructions。taxi clearance とも言うが、“cleared” の語は使わず、滑走路に入る・横切る許可を含まない）」と定義して、ほかの節はそれにそろえる（初学者の読み手の C3 の直し方に、根拠を足した）。
- **N6. `comm.basic` の時計の方位の箇条**：S8 のとおり、`comm.radar` へのリンクに。
- **N7. `comm.ctaf`：無線を持たない機**：AC 90-66C 9.12.2 は「管制塔のない空港の手順は、ふつう双方向の無線を求めない。だから場周では特に見張る」。本文に 1 文と、出典に AC 90-66C（AIM 4-1-9 も参照している）。到着の前に AWOS・ASOS を聞く（AIM 4-1-9 の FSS の例「I have the automated weather」）も 1 句あると、ACS PA.III.B.K4（自動の気象と空港の情報）が `comm.atis` 以外にも住所を持つ。
- **N8. `comm.mayday` に MINIMUM FUEL がない**：PCG「This is not an emergency situation」。米国の管制でも聞く言葉で、JCAB の ppl.4.2.7（ミニマムフューエルを通報した航空機の管制上の取り扱い）の米国側の対になる。「燃料が心配なら minimum fuel は緊急ではない。足りなくなりそうなら緊急を宣言する」の 1〜2 文。
- **N9. `comm.nordo` の故障の原因**：ACS PA.III.A.K6「Equipment issues that could cause loss of communication」。操作の誤りの列に「電気系統の故障（オルタネーター）で無線が止まる」を 1 句と `bk.see('sys.elec', …)`。「スケルチ」は `radio.equip` で一度説明する（初学者の読み手の NO1）。
- **N10. JCAB の「試験通信の方法」（ppl.4.2.2.7 の話題）の米国・英国の対がない**：radio check・「How do you read?」（PCG：HOW DO YOU HEAR ME?）。英国の言い方は CAP 413 で確かめてから `comm.icao` の表に 1 行（数字の段階は、確かめるまで書かない）。
- **N11. `comm.mayday` の通報の例**：AIM 6-3-2 の 11 項目のうち「機種」はコールサインの Archer で足りるが、PAN-PAN の例に「意図と要求」の中身（request vectors to the nearest airport など）を入れると、S2 の「管制が何をしてくれるか」とつながる。
- **N12. ACS-MAP の行の対応**：`comm.radar` の `faa` にある IR.V.B.K2（計器の「Pilot/controller responsibilities, communication procedures, and ATC services」）は、本文が VFR の交通情報だけなので弱い（住所は `ifr.enr`）。外すか、W30 の `ifr.enr` ができてから `sameAs` に。
- **N13. DESIGN 3.3 の「`comm.numbers`（ICAO の言い方の列）」**：任務と DESIGN 6.1 は `comm.numbers` を変えないとし、W19 は足していない（W19 の 7 の 3）。教官として見ると、ICAO の数の言い方の違い（decimal・QNH の hPa）は `comm.icao` の表にあり、学生に要る分はそこで足りる。統合役が DESIGN 3.3 の文言を「ICAO の違いは `comm.icao` の表」に直せば済む。
- **N14. `comm.icao` の英国のフライトレベル**：「空域ごとに決められていて、米国よりずっと低い（英国の AIP で確かめる）」は数字を書いていないので誤りではないが、英国は移行高度の見直しを進めている。「英国の AIP（ENR 1.7）で確かめる」と節の番号まで書くなら、確かめてから（今は書かない方が安全）。

## 4. ACS・JCAB の見出しごとの確かめ

### 4.1 ACS（ACS-MAP で節に `radio.*`・`comm.*` を持つ行、W19 のパッチの後の形）

| ACS | 知識の項目 | 台帳の節 | 本文で答えられるか | 指摘 |
|---|---|---|---|---|
| PA.II.D.K2 | Taxi instructions/clearances | `ground.taxi`・`comm.runway` | できる（`comm.runway` の表・`comm.dep`） | N5（語） |
| PA.II.D.K3 | Airport markings, signs, and lights | `ground.taxi`・`comm.runway` | **半分**（停止線・保持位置の標識・位置の標識・方向の標識・REL/THL まで） | S6 |
| PA.II.D.K5 | Aircraft lighting, as appropriate | `sys.lights`・`ground.taxi` | **滑走路の灯火の使い方がない** | S5（`comm.runway` に置くのがよい） |
| PA.II.D.K6a〜c | ホットスポット・塔の有無の交信・滑走路に入る/横切る | `ground.taxi`・`comm.runway` | できる | — |
| PA.II.D.K6d | Night taxi operations | `ops.night`（W29） | 第 3 部で | — |
| PA.II.D.K6e | Low visibility taxi operations | （上と同じ） | **本のどこにもない** | S6 |
| PA.III.A.K1 | How to obtain appropriate radio frequencies | `radio.equip`・`comm.atis` | できる（チャート・Chart Supplement は `radio.why`・`comm.ctaf`） | — |
| PA.III.A.K2 | Proper radio communication procedures and ATC phraseology | `comm.basic`・`comm.pattern`・`comm.tower`・`comm.numbers`・`comm.words` | できる | — |
| PA.III.A.K3 | ATC light signal recognition | `comm.nordo` | できる（図 `lightGunSignals`・囲み `light`） | — |
| PA.III.A.K4 | Appropriate use of transponder(s) | `comm.xpdr` | **半分**（コードと Ident まで。ALT・地上・91.215(c) がない） | S3 |
| PA.III.A.K5 | Lost communication procedures | `comm.nordo` | できる | — |
| PA.III.A.K6 | Equipment issues that could cause loss of communication | `radio.equip`・`comm.nordo` | ほぼ（電気系統の故障が抜け） | N9 |
| PA.III.A.K7 | Radar assistance | `comm.radar` | **半分**（交通情報だけ） | S4 |
| PA.III.A.K9 | Runway Status Lighting Systems | `comm.runway` | できる（REL・THL。トランスポンダーを入れる理由は S3） | S3 |
| PA.III.B.K1 | Towered and nontowered airport operations | `ops.pattern`・`comm.ctaf` | できる | N7 |
| PA.III.B.K4 | Use of automated weather and airport information | `comm.atis`・`wx.metar` | ATIS はできる。管制塔のない空港の AWOS・ASOS は `wx` の 1 文だけ | N7 |
| PA.VI.B.K3 | Radar assistance to VFR aircraft（operations・equipment・available services・traffic advisories） | `comm.radar` | **半分**（available services がない） | S4 |
| PA.VI.B.K4 | Transponder (Modes A, C, S) and ADS-B | `comm.xpdr`・`nav.efb`（W29） | **半分**（Mode の説明がない） | S3 |
| PA.VI.D.K2 | Assistance available if lost | `nav.lost`・`comm.radar` | できる（`comm.mayday` の PAN-PAN の例が答えになる。台帳に `comm.mayday` を足すとよい） | 10 |
| PA.VIII.F.K1 | Operating communications equipment | `radio.equip` | できる | — |
| PA.VIII.F.K3 | ATC facilities and services | `comm.radar`・`emg.imc`・`radio.why` | できる（施設は `radio.why`、業務は S4 で厚くなる） | S4 |
| PA.IX.B.K6 | ATC services to aircraft in distress | `comm.mayday` | **ない**（言い方だけ） | S2 |
| IR.V.B.K2 | Pilot/controller responsibilities…（計器） | `ifr.enr`・`comm.radar` | `comm.radar` は VFR だけ | N12 |

### 4.2 JCAB（JCAB-MAP で節に `radio.*`・`comm.*` を持つ 9 行と、航空通信の全見出し）

| JCAB | 見出し | 台帳の節 | 本文で答えられるか（米国の原理として） | 指摘 |
|---|---|---|---|---|
| ppl.1.2.8・cpl.1.5.3.2 | 無線通信・振幅変調通信機 | `sys.radio`・`radio.equip` | `radio.equip` は操作だけ（AM などは `sys.radio` が住所） | — |
| ppl.1.2.5.6・cpl.1.6.5.3・ir.2.5.2 | レーダー | `comm.xpdr`（・`jet.fms`） | **一次・二次レーダーのしくみがない** | S3 |
| ppl.4.1.2.4・cpl.4.1.2.4 | 緊急機の行動（遭難通信・緊急通信・通信機故障時の措置・緊急三角旋回飛行） | `jatc.emerg`・`comm.mayday` | 遭難・緊急はできる。**通信機故障時の措置は `comm.nordo` にあるのに節に入っていない**。緊急三角旋回は第 7 部 | 10（`comm.nordo` を足す） |
| ppl.4.2.2.7・cpl.4.2.2.7 | 電話通信（数の送信・無線呼出符号・用語の意義・通信の設定・試験通信） | `jatc.phrase`・`comm.numbers` | 試験通信のほかはできる（通信の設定は `comm.pattern`・`comm.ack`） | N10 |

航空通信のほかの見出し（ppl.4.1.1〜4.2.8）は、DESIGN 3.3 のとおり節は第 7 部（`jatc.*`・`jair.*`）だけ。ただし米国の原理として、この 5 章が実際に答えている見出しが多い：復唱要領（ppl.4.2.1.2 → `comm.readback`）、Immediately/expedite（ppl.4.2.1.3 → `comm.words`）、地上滑走指示及び許可・離陸準備完了の通報・滑走路上での待機（ppl.4.2.3.4 → `comm.runway`・`comm.dep`・`comm.tower`）、可視信号・航空機の応答（ppl.4.2.3.6 → `comm.nordo`）、トランスポンダーの操作・作動義務（ppl.4.2.5.1 → `comm.xpdr`。S3 の直しのあと）、レーダー交通情報・交通情報への応答（ppl.4.2.5.4 → `comm.radar`・`comm.readback`）、ATIS（ppl.4.2.5.7 → `comm.atis`）。W42 が「未対応ゼロ」を確かめるときに、日米で答えが違う所（復唱の範囲・VFR のコード・灯火信号の白の点滅など：FL.jur）を第 7 部で、原理が同じ所を第 1 部で数えられるよう、これらの行の `note` に米国側の節を書いておくことを勧める（12）。

## 5. 1 つの概念・1 つの住所

| 概念 | 今の場所 | 提案 |
|---|---|---|
| Class C・D に入る前の交信の確立 | `law.airspace`（完全）・`comm.ack`（完全）・`radio3` 確認問題 2・例 2 | 住所 `law.airspace`、`comm.ack` は思い出そう＋台本。確認問題 2 は残し（決まり 4）、理由のリンクを `law.airspace` に（S8・expert-law S9）。CONCEPTS `C.two-way-comms` |
| Class C の形 | `law.airspace`（表）・`comm.flow`（同じ数字の段落） | `comm.flow` は 1 文＋リンク（S8）。CONCEPTS `C.class-c-shape` |
| 滑走路の許可の区別（taxi・LUAW・continue） | `comm.runway`（新・完全）・`comm.dep`・`comm.tower`・`comm.mistakes`・`comm.words`・`comm.readback`・`comm.sfb`・`comm.icao`・`ground.taxi`（第 2 部） | 住所 `comm.runway`、ほかは 1〜2 文の呼び戻し。`ground.taxi` の `{ch:radio4}` を `bk.see('comm.runway', …)` に（S8）。CONCEPTS `C.runway-clearances` |
| 交通情報の時計の方位 | `comm.basic`（W19 が足した）・`comm.numbers`（変えない節）・`comm.radar`（完全） | 住所 `comm.radar`。`comm.basic` はリンクに（N6）。CONCEPTS `C.traffic-clock`（`comm.numbers` は例外の note） |
| トランスポンダーと ADS-B Out が要る空域 | `law.airspace`（表と付録 D）・`comm.xpdr`（1 文と `{ch:law}`） | 住所 `law.airspace`（expert-law の 5 と同じ）。`comm.xpdr` は節へのリンクに（S3） |
| 時刻（UTC・EST/EDT） | `basics.time`（住所。CONCEPTS `C.time`）・`comm.numbers`（変えない節） | `comm.numbers` は変えないので、`C.time` の note に例外として書く（12） |
| 91.123（許可から外れない・分からなければ聞く） | `law.basis`・`law.pic`（規則）・`comm.clarify`（言い方） | 重なりは小さい。`comm.clarify` の 91.123 の段落は、規則の要点 2 文と `bk.see('law.basis', …)` にすると短くなる（任意） |
| MAYDAY・7700 | `comm.mayday`（住所）・`emg.basic`・`emg.*`（第 2 部、`{ch:radio5}` で呼び戻し） | 合う |
| 灯火信号 | `comm.nordo`（住所）・囲み `light` | 合う（`law` にない） |

## 6. 事実確認役・初学者の読み手の指摘への対応

- **factcheck S1（`radio3` 確認問題 7 の前提「地上滑走の指示で滑走路に入ってよいと言われている」）**：賛成。教官としては、REL の問いは「横切る許可（cross runway two seven）をもらったのに、REL が赤い」という、実際に起きる食い違いの形がいちばん教育効果がある（AIM 2-1-6「Never cross over illuminated red lights」「contact ATC for resolution」）。この問は W19 が新しく足した問なので、登録の前なら直してよい。初学者の読み手の Q1 と同じ。
- **factcheck S2（Unable の出典）**：賛成。理由と代わりの案を言うのは、PCG の AIR TRAFFIC CLEARANCE の「pilot is responsible to request an amended clearance」と、AIM 4-1-18 の「revised clearance or instruction obtained」が支える。M1 の直しと同じ所なので、一緒に直すとよい。
- **factcheck S3（札の ID が章の番号で変わる）**：道具か統合役の話。教官の目では意見なし。
- **factcheck N1（ヒアバックの語の出典）**：賛成。FAA の文書に「hearback」の語はなく、NASA ASRS の語。教室では「管制官の確認（hearback）」で通じる。
- **factcheck N3（FSS は Alaska だけ）・N7（Class D の地表区域）・N8（止まるのはこの本の勧め）・N10（REL の位置と矢印）・N12（`radio5` の summary の「日本」）**：どれも賛成。
- **factcheck N6（AIM 4-4-10 の言い方）**：M1 の直しの案に入れた。重さは must に上げた（理由は M1）。
- **初学者の読み手 C1（トランスポンダーが何か、4 章のあいだ分からない）**：賛成。S3 で `comm.xpdr` を厚くしても、場所は第 17 章のまま。`radio.why` の Clearance Delivery の行で初めて出る所に、1 句（「管制のレーダーに自分のコードと高度を知らせる装置。くわしくは ${bk.see('comm.xpdr', …)}」）を足すのが手早い。
- **初学者の読み手 C2（場周経路の辺の名前が説明より先）**：賛成。教官の目では、辺の名前の住所は第 2 部の `ops.pattern`（後ろの部）なので、第 1 部で要る分（アップウインド・クロスウインド・ダウンウインド・ベース・ファイナル）は `comm.pattern` か `radio4` の最初に、図 `patternCalls` を前に出して名前を載せるのがよい。
- **初学者の読み手 C3（地上滑走は許可か指示か）**：N5 に根拠を書いた（米国の資料も JCAB も両方使う。語を決めて 1 か所で定義する）。
- **初学者の読み手 C4（管制承認と許可）**：S7 で、航空法第 96・97 条と JCAB の見出しの分け方を根拠に、重さを should にした。
- **初学者の読み手 MA1（上昇の但し書き）**：S1 で、AIM 6-2-1 を根拠に〔安全〕にした。
- **初学者の読み手 WO1（「待機の位置」が空中の待機と同じ語）**：賛成。日本の欄の文は FL.jur の `words`（W06）の持ち物。日本語で滑走路の手前で止まる位置を何と呼ぶか（AIP Japan の言い方）は〔要確認〕のまま、W06 に回すのがよい。
- **初学者の読み手 XP（つまみをどこに合わせるか）・NO1（スケルチ）・AT1（AGL と MSL）**：S3・N9・N4 で同じことを言った。

## 7. 安全の目で見た点

- **M1**：VFR の学生が雲に近づきながら管制の返事を待つ、と読める 3 か所。章の間の矛盾でもある。いちばん先に直してほしい。
- **S1**：「できれば上昇」の但し書きを、計器飛行の資格のない学生向けに（雲に入らない・資格がないことを伝えて遭難を宣言）。エンジン故障では上昇しない。
- **S5**：着陸して出るとき、ほかの滑走路に出ない・滑走路の上で止まらない（AIM 4-3-21）。滑走路に入る・横切るときの灯火（AIM 4-3-24）。Sanford の HS1 の誤進入は、この形で起きている。
- **S3 の 2**：誘導路と滑走路の上でもトランスポンダーを ALT にする（AIM 4-1-20）。REL・THL と地上の監視は、これで機を見ている（AIM 2-1-6）。
- 一次資料と食い違う安全の手順（誤進入・MAYDAY・無線の故障・灯火信号・LUAW）は見つからなかった。`comm.runway` の「着陸許可をもらったか分からないまま滑走路が近づいたら、着陸せずに着陸復行して確かめる」「灯は許可の代わりにならない」、`comm.nordo` の「as soon as practicable は『すぐに』ではない」は、教官として特に良い書き方だと思う。

## 8. 検査と結果

- 章の検査：`node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/radio-figs.js textbook/rewrite/combined/drafts/radio.js` → **error 3・warn 43・pending 1**（style の error 3 は部品の見出しを文と数える道具の数え方、warn は初出の形 8・平均の長さ 3・長い文 2・留保 1・正解の位置 1・札なし 28（今の `CLAIMS.json` に行がないため）、pending は `CALC.json` がないため）。W19 と事実確認役の結果と同じ。chapters・form・data・volume・jurisdiction・chapter-refs・figures（13 枚・390 px）・photos・concepts・jur・path・provenance・egov は error 0。
- FLIGHT LAB：`cd flight-lab && npm run -s test:fast` → **86/86 pass**
- CADET：`cd cadet && npm run -s test:fast` → **247/247 pass**
- TEXTBOOK：`cd textbook && npm test` → **33/34 pass、1 fail**（2 回流して同じ）。落ちたのは `build: FLIGHT LAB sources are not copied into textbook/`（`textbook/test/build.test.mjs` 66 行、actual `['rewrite/combined/drafts/radio.js']`）。下書きのファイル名が `flight-lab/src/radio.js` と同じだから（中身は写しではない）。W19 の報告 5.3・8 の 1、事実確認役の 10.2 と同じで、この単位の変更によるものではない（この単位は報告のほかに何も変えていない）。

## 9. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/expert-radio.md`（新） | この報告 |

下書き・製品のファイル・台帳・`flight-lab/kiso/` には触っていない。一次資料の写しと変換したテキストは scratchpad に置いた（リポジトリの外）。

## 10. 台帳の行

触った行はない（この単位は台帳もパッチも書かない）。直しの単位か W42 が書くときの提案：

| 台帳 | 行 | 提案 |
|---|---|---|
| CONCEPTS | `C.two-way-comms`（新） | 住所 `law.airspace`・呼び戻し `comm.ack`・maxLines 3（expert-law と同じ行。どちらかの単位が 1 回だけ足す） |
| CONCEPTS | `C.runway-clearances`（新） | 住所 `comm.runway`・呼び戻し `comm.dep`・`comm.tower`・`comm.mistakes`・`ground.taxi`・maxLines 3（S8） |
| CONCEPTS | `C.traffic-clock`（新） | 住所 `comm.radar`・呼び戻し `comm.basic`、note「`comm.numbers` は変えない節（DESIGN 6.1）なので数えない」（S8・N6） |
| CONCEPTS | `C.class-c-shape`（新） | 住所 `law.airspace`・呼び戻し `comm.flow`・maxLines 1（S8） |
| CONCEPTS | `C.time` | note に「`comm.numbers` の EST/EDT の箇条は変えない節」（5） |
| ACS-MAP | PA.II.D.K3・PA.II.D.K6 | W19 のパッチで `missing` から `comm.runway` が外れるが、S6 の中身（強化された中心線・進入区域と ILS の停止位置・No Entry・低視程）が入るまで、note に「部分」と書く。直さないなら K6 の `missing` に `ground.taxi`（W28）を戻す |
| ACS-MAP | PA.II.D.K5 | note「滑走路の灯火の使い方（AIM 4-3-24）は本にない。`comm.runway` に置く案（expert-radio S5）」 |
| ACS-MAP | PA.III.A.K4・PA.VI.B.K4 | note「ALT・地上・91.215(c)・Mode A/C/S・一次/二次レーダーが足りない（S3）」。status は mapped のまま、W42 が confirmed にする前に確かめる |
| ACS-MAP | PA.III.A.K7・PA.VI.B.K3 | note「available services（AIM 4-1-16・4-1-18）が足りない（S4）」 |
| ACS-MAP | PA.IX.B.K6 | note「遭難機への ATC の業務（AIM 6-3-1・6-2-1）が本文にない（S2）」 |
| ACS-MAP | PA.VI.D.K2 | `sections` に `comm.mayday`（PAN-PAN の例：位置が不確か・助けを求める） |
| ACS-MAP | IR.V.B.K2 | `comm.radar` を外すか、`ifr.enr` ができてから決める（N12） |
| JCAB-MAP | ppl.4.1.2.4・cpl.4.1.2.4 | `sections` に `comm.nordo`（通信機故障時の措置の米国の原理） |
| JCAB-MAP | ppl.1.2.5.6・cpl.1.6.5.3・ir.2.5.2 | note「一次・二次レーダーのしくみは S3 の直しのあと」 |
| JCAB-MAP | ppl/cpl.4.2.1.2・4.2.1.3・4.2.3.4・4.2.3.6・4.2.5.1・4.2.5.4・4.2.5.7・4.2.7 | note に米国側の原理の節（4.2 の末尾の段落）。節は第 7 部のまま |

## 11. 未解決のこと

1. M1・S1〜S8・N1〜N14 の直し（W19 か改稿の単位）。M1・S1・S5 は〔安全〕なので、直したあと W27（R2 の確かめ）と W36 の安全レビューで見てもらう。直すと札の行が変わる（M1 は `comm.flow#293f894c` ほか、S1 は `comm.mayday` の 2 文、S3・S4・S6 は新しい文）。`check-chapter.mjs --claims-out` で作り直す。
2. S6 を `comm.runway` に入れるか、第 2 部の `ground.taxi`（W28）に入れるかは統合役が決める（どちらでも、ACS-MAP の行の書き手を合わせる）。
3. S8 の Class C の交信の確立の住所は、expert-law と同じく `law.airspace` を勧めた。W19 の law と radio の改稿で同じ向きにそろえる必要がある。
4. N10（試験通信）と N14（英国の移行高度）は、CAP 413・UK AIP を確かめるまで数字を書かない。
5. 日本の欄（`words` の「待機の位置」、`readback`・`xpdr` の〔要確認〕）は FL.jur の持ち物（W06）。この報告では日本の新しい事実は書いていない。

## 12. ほかの単位にお願いしたいこと（needs from others）

1. **W19（または radio の改稿の単位）**：`drafts/radio.js`・`drafts/radio-figs.js` で、
   - M1（`comm.flow` の判断の目・`radio4` の例 3・説明してみよう 2。3 の案）と、それにつながる factcheck の S2・N6。
   - S1（`comm.mayday` の上昇と 7700 の文）・S2（ATC の業務の 3〜4 文）・S3（`comm.xpdr` の「動かし方」と「しくみ」、図 `xpdrCodes` の「ふつうは ALT」）・S4（`comm.radar` の業務の表、`comm.arrive` の「続け」の注）・S5（`comm.runway` の判断の目 2 項目、`comm.arrive` の 1 文）・S6（標識と標示の表、低視程の 1 項目、図 `runwayEntry` の強化された中心線）・S7（`comm.clarify` の表の 1 行目と用語の表）・S8（`comm.ack` を思い出そうに、`comm.flow` の Class C の段落を 1 文に、`comm.basic` の時計の方位をリンクに、`{ch:law}` を節へのリンクに）。
   - nit N1〜N9・N11（N10・N14 は確かめてから）。
   - 直したら `--claims-out` で `radio.claims.json` とパッチの CLAIMS の行を作り直し、10 の CONCEPTS の行をパッチに足す。
2. **W19（law の改稿の単位）**：S8 の住所を `law.airspace` にそろえる（expert-law の S9 と同じ）。`law.airspace` の「standby」と `comm.ack` の「stand by」のつづりをそろえる（PCG は STAND BY）。
3. **W28（第 2 部 `ground.taxi`）**：停止線の段落を、`comm.runway` への「思い出そう」（2〜3 行）にし、「taxi via … は滑走路の手前まで（{ch:radio4}）」のリンクを `bk.see('comm.runway', '滑走路に入る許可と誤進入の防ぎ方')` に直す（S8）。S6 を `comm.runway` に入れないと決まったら、強化された中心線・進入区域と ILS の停止位置・No Entry・低視程の地上滑走（AIM 2-3-4・2-3-5・2-3-8・4-3-19）を `ground.taxi` に。
4. **W42（ACS・JCAB の確かめ）**：10 の ACS-MAP・JCAB-MAP の行の note と `sections`。特に PA.II.D.K6e（低視程の地上滑走）は、どの節にも中身がない。
5. **W04（用語の表 `FL.terms`）**：管制承認の注（「着陸許可・離陸許可は別の語」）に、航空法第 96 条（指示）・第 97 条（飛行計画の承認）の根拠を足すと、S7 の直しの基準になる。「最低燃料（MINIMUM FUEL）」を入れるか（JCAB の「ミニマムフューエル」：ppl.4.2.7）。W19 が頼んだ語（航空交通業務・警急業務・滑走路誤進入・ヒアバック・ホットスポット・管制指示・磁航路）も同じ。
6. **W06（FL.jur）**：`words` の日本の欄の「待機の位置」の語（初学者の読み手の WO1）。AIP Japan の言い方を確かめるまで〔要確認〕のまま。
7. **W27（R2 の確かめ）・W36（安全レビュー）**：M1・S1・S5 の直しを、AIM 4-1-15・4-1-17・4-1-18・4-3-21・4-3-24・6-2-1・6-3-2 で確かめる。
8. **統合役**：TEXTBOOK の `build.test.mjs` の 1 件（8）は、W19 の報告 8 の 1 の案（除外の列に `rewrite/combined/drafts` を足す）か、登録のあとで `drafts/radio.js` を消す。DESIGN 3.3 の「`comm.numbers`（ICAO の言い方の列）」を、`comm.icao` の表で満たすと書き直すか決める（N13）。
