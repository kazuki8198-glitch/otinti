# 専門家の読みの報告：第 1 部 第 18 章 `hf`「人間の能力と判断（ADM）」と 第 19 章 `adm`「エラー・状況認識・リスク」（W20 の下書き・R2）

単位：expert-hfadm（W20 の章 `hf`・`adm` の専門家の読み手）。読んだ日：2026-10-30。
立場：飛行教官（FAA の CFI・CFII・MEI）で、JCAB の学科（自家用・事業用の空中航法「人間の能力及び限界に関する一般知識」、計器飛行証明の「計器飛行等に関する人間の能力及び限界」）の出題範囲も知っている読み手として読んだ。

読んだもの：
- 下書き：`textbook/rewrite/combined/drafts/hfadm.js`（`hf` 9 節・`adm` 5 節・章末）、`drafts/hfadm-figs.js`（新しい図 10 枚）、この章が使う今の図 3 枚（`flight-lab/src/book-figs.js` の `vestibular`・`hypoxiaAltitudes`・`threePLoop`）、`drafts/hfadm.claims.json`
- 報告：`reports/W20.md`・`factcheck-hfadm.md`・`reader-hfadm.md`。形の参考に `expert-law.md`
- 台帳：`ledgers/ACS-MAP.json`（`hf.*`・`adm.*` を節に持つ行と、同じ Task の行）・`JCAB-MAP.json`（空中航法 3（3）と計器飛行証明 8 の全行）・`CONCEPTS.json`
- 決まり：DESIGN 3.3（第 18・19 章の行）・6.2・7.2、DECISIONS、STYLE、`FL.terms`
- 比べた他の章：登録済みの `book-2.js`（今の `hf`）・`book-3.js`・`book-4.js`、下書きの `drafts/sys.js`（`sys.elec` の暖房と一酸化炭素）・`drafts/wx.js`（`wx.brief`・`wx.turb`）・`drafts/law.js`（`law.pilot`）・`drafts/aero.js`（`aero.turn`）・`drafts/inst.js`（姿勢指示器）

**下書きは変えていない**（読み手の役目：直さない）。変えたファイルはこの報告だけ。台帳のパッチも書いていない（提案は 10・12 に書いた）。

## 1. 結論

教官の目で見て、2 章とも「知識を覚える」より「自分の状態に気づいて、早く伝えて、負荷を下げる」ことに軸があり、地上学科の授業でそのまま使える。とくに次は残してほしい。
- `hf.self` の「IMSAFE は唱えるだけでは証明にならない」「証明が有効なことと今日飛べることは別」、考えてみようの「この朝は飛びません」
- `hf.fatigue` の日本 → ロンドン → フロリダの時差の考え方と「眠気を感じないことは証拠ではない」
- `hf.body` の三半規管の 4 コマの図と、〔安全〕③ を AFH 第 18 章の順（認める → 操縦を保つ → 助けを得る）で書き、180° 旋回を「この本の裁定」と正直に書き分けたこと
- `adm.check` の「読んだことと確かめたことは別」「中断されたら確実に終えた所へ戻る」、`adm.risk` の「点数を足す評価表で重大な危険を打ち消さない」と RMH の上乗せの表、`adm.review` の驚きと驚愕の区別

数字の正しさは事実確認役が確かめていて、私も今日 AIM 8-1・PHAK 第 2・17 章・AFH 第 18 章・RMH・AC 00-46F・eCFR で読み直した。私が足すのは、**〔安全〕③ の手順の訳の誤り 1 つ・ACS の知識の項目で本文にないもの・JCAB の出題範囲の「空間識失調の分類と危険性」の欠け・1 つの概念が 2 か所で教えられていること・台帳の対応の誤り**です。

数：**must 1・should 16・nit 12**（3 の表。事実確認役・初学者の読み手と同じ指摘は 6 に対応を書き、ここでは重さを上げたものと別の理由を足したものだけを数えた）。

- **must**
  - **M1**：〔安全〕③ の「上昇は姿勢指示器の **1 目盛り**まで」は、AFH 第 18 章の「no more than **one bar width**」（小さな飛行機の横棒の太さ 1 本分）の訳として誤り。目盛り（5°・10° の線）は横棒の太さより何倍も大きく、計器で飛ぶ訓練を受けていない人が雲の中で機首を大きく上げてよいと読める。
- **should の主なもの**
  - ACS PA.I.H.K1 の 12 項目のうち **低体温（K1j）・栄養（K1i）・副鼻腔（K1c）** が本文にない（S1・S2・S4）。低体温は FAA の航空医官長の記事（一次資料）で書ける（W20 の開いた問題 4 を解く）
  - **低酸素症の対処（降下・酸素）**が書かれていない（S3。ACS K1 の corrective actions、PHAK「Treatment of Hypoxia」）
  - 進入の錯覚に **もや（haze）と霧（fog）** がない（S5。AIM 8-1-5。フロリダの夏のもやは毎日の話）
  - **耳石器**がなく、JCAB の「空間識失調の分類（回転角速度・重力加速度・直線加速度によるもの）」と、体性重力錯覚などのしくみが説明できない（S6）。「感覚が正常だから起きる」「起こしやすくする条件」もない（S7）
  - AFH 第 18 章のいちばん効く手「**トリムで手放しの水平飛行に合わせる**」「計器で飛びながら外をのぞかない」がない（S8）
  - ACS PA.I.H.K2（飲酒と薬の**規則**）のうち **14 CFR 61.15（運転の飲酒の処分は 60 日以内に FAA へ報告）・61.16・91.17(b)(c)・91.19** がどこにもない（S9。`law.pilot` は飲酒を `hf.self` に任せている）
  - ASRS の文が「報告すれば処分されない」と読める（S10。AC 00-46F 12.3 の 4 つの条件）
  - 後方乱気流の段落に **弱い斜めの追い風**（AIM 7-4-4「最も注意」）と **2 分**（7-4-6）がない（S11。R3 まで本の中でここだけが後方乱気流の場所）
  - PHAK 第 2 章の **operational pitfalls**（scud running など）と **自動の判断（automatic/naturalistic decision-making）** がない（S12。ACS K4・JCAB「意思の決定」・FAA の学科試験）
  - ACS の技能 **PA.I.H.S1**（3 つ以上の状態について症状・原因・対処を結び付けて言える）に答える一覧がない（S13）
  - 「個人の最低基準」と `wx.js` の「個人の最低条件」で名前が違う（S14）。Aviate → Navigate → Communicate・チェックリスト・get-there-itis が 2 か所で教えられている（S15）。ACS-MAP の対応 4 行が本文と合わない（S16）

## 2. 確かめた一次資料（2026-10-30。どれも元の URL から今日取り寄せて本文を読んだ。写しは scratchpad の `exhf/`、リポジトリには置いていない）

| 資料 | URL | 確かめた所 |
|---|---|---|
| FAA AIM 第 8 章 第 1 節（HTML） | https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap8_section_1.html | 8-1-1 Medication「The safest rule is not to fly as a crewmember while taking any medication, unless approved to do so by the FAA」（下書きの「FAA の承認がない限り」は正しい）、Fatigue「Acute fatigue is prevented by adequate rest and sleep, as well as by regular exercise and proper nutrition」、OSA。8-1-2「Hypoxia is prevented by … enriching the inspired air with oxygen … and by maintaining a comfortable, safe cabin pressure altitude」、Ear Block・Sinus Block の全文。8-1-5 Atmospheric illusions「atmospheric haze the illusion of being at a greater distance … Penetration of fog can create the illusion of pitching up … will steepen the approach, often quite abruptly」・Ground lighting illusions。8-1-6 暗順応とビタミン A |
| FAA AIM 7-4（HTML） | https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap7_section_4.html | 7-4-4「a light wind with a cross-runway component of 1 to 5 knots could result in the upwind vortex remaining in the touchdown zone」「THE LIGHT QUARTERING TAILWIND REQUIRES MAXIMUM CAUTION」、7-4-6「an interval of at least 2 minutes」（大きな機の low approach・missed approach・touch-and-go のあと）、平行滑走路 2,500 ft |
| PHAK FAA-H-8083-25C 第 17 章 | https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/19_phak_ch17.pdf | 「Treatment for hypoxia includes flying at lower altitudes and/or using supplemental oxygen」、図 17-1（20,000 ft「30 minutes or more」）、図 17-3 の Otolith organ、体性重力錯覚・逆転錯覚・エレベーター錯覚は「stimulate(s) the otolith organs」、The Leans「rotational acceleration of 2 degrees per second or lower is below the detection threshold」、「The sensations that lead to illusions … are normal perceptions」「illness, medication, alcohol, fatigue, sleep loss, and mild hypoxia are likely to increase susceptibility to spatial disorientation」、Haze・Fog・Ground Lighting、「Acute fatigue can be prevented by proper diet and adequate rest and sleep」、「Make sure you eat regular balanced meals; Bring a snack …; Maintain good hydration」、Hypoglycemia and Nutritional Deficiency |
| PHAK 第 2 章 | https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/04_phak_ch2.pdf | 外からの圧力の例（get-home-itis・get-there-itis・let's-go-itis）、5P（2 時間を超えたら hourly）、Automatic Decision-Making（図 2-14B）、**図 2-15 Operational pitfalls**（Peer pressure・Mindset・Get-there-itis・Duck-under・Scud running・Continuing VFR into IMC・Getting behind the aircraft・Loss of positional or situational awareness・Operating without adequate fuel reserves・Descent below MEA・Flying outside the envelope・Neglect of flight planning, preflight inspections, and checklists）、Managing Risks の SAFETY の説明と sterile flight deck の 2 つの時間 |
| AFH FAA-H-8083-3C 第 18 章 | https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/19_afh_ch18.pdf | Inadvertent VFR Flight Into IMC（p.18-17〜18-21）：約 10 分、Recognition・Maintaining Airplane Control（「Attempts to control the airplane partially by reference to flight instruments while searching outside … results in inadequate airplane control」）、Attitude Control（「**Trim the airplane with the elevator trim so that it maintains hands-off level flight**」「fingertip control」「**no more than one bar width up or down**」）、Turns（no more than 10°、少し回して水平に戻すのをくり返す）、Climbs（「raise the miniature airplane … no more than one bar width and apply power」）、Descents（「should never exceed 500 fpm」「not exceed one bar width below level」）、Combined Maneuvers、ATC の sense of urgency（「It's reasonable to ask the controller to slow down」）、Transition to Visual Flight |
| FAA Instrument Flying Handbook FAA-H-8083-15B | （scratchpad の既存の写し `ifh/ifh.txt`。W15・factcheck-inst が取り寄せたもの） | 「The pitch should be made in reference to bar widths on the miniature airplane」「one-half bar width」などの言い方（bar width は目盛りと別の単位）。度への換算の数字は IFH の本文に見つけられなかったので、この報告では数字を書かない |
| FAA Risk Management Handbook FAA-H-8083-2A | https://www.faa.gov/sites/faa.gov/files/2022-06/risk_management_handbook_2A.pdf | 第 6 章 Expectation Bias（「A pilot's erroneous assessment may persist even though it is wrong」、Branson の誤った空港への着陸、NOTAM の滑走路の取り違え、地上走行）と confirmation bias（「try to suppress that information if it does not fit in with the expectation」）。下書きの定義は RMH どおり |
| FAA AC 00-46F | https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_00-46F.pdf | 12.3 Waiver of Imposition of Sanction：「although a finding of violation may be made, neither a civil penalty nor certificate suspension will be imposed if」の 4 条件（inadvertent and not deliberate／criminal offense・accident・49 U.S.C. 44709 でない／前の 5 年に違反がない／10 日以内に NASA へ報告） |
| eCFR 14 CFR 61.15・61.16・91.17・91.19 | https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-14?section=61.15 ほか | 61.15(e)「not later than 60 days after the motor vehicle action」・(f)、61.16（検査の拒否）、91.17(b)（酔った人を乗せない）・(c)（検査に応じる）、91.19（麻薬などを積んでいると知りながら運航しない） |
| FAA ACS 6C（PA） | https://www.faa.gov/training_testing/testing/acs/private_airplane_acs_6.pdf | PA.I.H の全要素：K1a〜l・K2〜K4・**R1〜R4**（R3 Distractions, task prioritization, loss of situational awareness, or disorientation／R4 Confirmation and expectation bias）・**S1**（3 つ以上の状態の症状・原因・対処を結び付ける）・S2（fitness for flight と personal minimums の自己評価）。PA.II.A・PA.II.B の要素 |
| FAA「Aeromedical Advisory: A Pilot's Guide to Hypothermia and Hyperthermia」（FAA 航空医官長 Dr. Susan Northrup、FAA Safety Briefing の Cleared for Takeoff。ページの更新 2026-07-01） | https://www.faa.gov/blog/clearedfortakeoff/aeromedical-advisory-pilots-guide-hypothermia-and-hyperthermia | 「Even mild hypothermia can compromise safety of flight. Initially, the only manifestation is shivering without impact on cognition or functioning. As the core body temperature drops, you may be impaired even if you still feel alert … address the problem early, even making a precautionary landing」、病気と薬は体温の調節を妨げる、寒いと血管が縮み指先のパルスオキシメーターが低く出る、一酸化炭素は高く出る、暑さでは軽い認知の低下が自分の低下に気づく力を奪う |
| FAA「Spatial Disorientation」（AM-400-03/1） | https://www.faa.gov/pilots/safety/pilotsafetybrochures/media/SpatialD.pdf | 「the otolith organs (the utricule and the saccule), which detect changes in linear acceleration and gravity」「the inertial forces resulting from linear accelerations cannot be distinguished from the force of gravity」 |
| FAA「Acceleration in Aviation: G-Force」 | https://www.faa.gov/pilots/safety/pilotsafetybrochures/Acceleration.pdf | 「During steep turns and unusual attitude recovery, civil aviation pilots can experience high G」、Gx・Gy・Gz、ゆっくりかかると目が先・速いと前触れなしに GLOC（factcheck S2 と同じ） |
| UK CAA CAP 737（2023） | https://www.caa.co.uk/publication/download/14984 | 第 7 章「A skilled motor task will be momentarily disrupted by a startle reflex but return to normal within five to ten seconds」、「the more unusual events a pilot experiences and deals with, the more 'resilient' they ought to become」 |
| 出題範囲参考（自家用・事業用・計器） | 台帳 `ledgers/src/sources/mlit/*.txt`（2026-10-26 の写し） | 空中航法 3（3）の細目：（イ）空間識失調の分類「概要、傾斜錯覚、着陸失敗をもたらす錯覚、回転角速度・重力加速度・直線加速度によるもの、平衡感覚によるもの」、（ウ）危険性「感覚機能が正常なるが故に発生すること … 空間識を喪失しているという自覚が無いこと … 陥りやすい時期（夜間飛行）」、ウ（ア）情報処理「注意と警戒、認識、記憶、反応の選択」、ア（キ）聴覚「聴覚と脳の役割」 |

SHELL モデルの一次資料（W20・factcheck の開いた問題）は、FAA と国土交通省のサイトをもう一度探したが見つからなかった（11）。

## 3. 問題の一覧

### must（1）

**M1. 〔安全〕③ の「上昇は姿勢指示器の 1 目盛りまで」は AFH の「one bar width」の誤訳（`hf.body` 第 9 段落、札 `hfadm.claims.json` の「旋回はバンク 10° 以下、上昇は姿勢指示器の 1 目盛りまでにし…」の行）**
- 一次資料：AFH 第 18 章 Attitude Control「Any pitch attitude change should be made by using no more than one bar width up or down」、Climbs「raise the miniature airplane on the attitude indicator no more than one bar width and apply power」、Descents「the pitch attitude should not exceed one bar width below level」「the resulting rate of descent should never exceed 500 fpm」。IFH も機首の上げ下げを「bar widths on the miniature airplane」で数え、目盛りとは別に扱う。
- なぜ must か：bar width は小さな飛行機の記号の横棒の太さで、姿勢指示器の機首上げの目盛り（G1000 型でも機械式でも 5°・10° の線）よりずっと小さい。「1 目盛り」は 10° の線とも読め、AFH が「できるだけ水平から外れない」ために決めた量の何倍もの機首上げを許してしまう。〔安全〕の手順の数の誤りなので、事実確認役の「一字一句の意味で合う」（factcheck 3）とは判断を変える。初学者の読み手も「1 目盛りが何か分からない」とつまずいている（reader B2）。この本の `inst` の下書きにも bar width の説明はない。
- 直しの案：「旋回はバンク 10° 以下にします。機首の上げ下げは、姿勢指示器の小さな飛行機の横棒の太さ 1 本分（bar width）までにし、上昇と旋回を同時にしません（AFH 第 18 章）。」。降下も同じ量で、毎分 500 ft 以下（S8 と一緒に）。`flight.test.mjs` の並びの検査（翼を水平に保つ → バンク 10° 以下 → 上昇と旋回を同時にしません → …）はこの文でも通る（「1 目盛り」は検査の語ではない）。札を作り直す。今の本 `flight-lab/src/book-2.js` の `hf.body` にも同じ文があるので、登録で置き換わるまでの間も直すかを統合役が決める。W15（`inst.gyro` か `inst.pfd`）に「bar width（小さな飛行機の横棒の太さ）」の 1 文と、できれば図の中の印を頼む（12）。

### should（16）

**S1. 低体温（ACS PA.I.H.K1j）が本文にない（`hf.fatigue`「暑さ・脱水と寒さ」）**
- ACS 6C の K1j は「Hypothermia」。W20 は一次資料が見つからず書かなかった（W20 の 7 の 4）。DESIGN 3.3 も `hf.fatigue` に「熱中症と低体温」を挙げる。
- 一次資料：FAA の航空医官長の記事（2 の表）。
- 直しの案（「寒さも負担になります」の段落に）：「体の中心の温度が下がりすぎた状態を、低体温症（hypothermia）といいます。軽いうちは、ふるえだけで、考える力は落ちていないこともあります。でも体温が下がるにつれて、自分では頭がはっきりしていると感じていても、能力が落ちていきます。早めに温め、よくならなければ予防着陸も考えます。病気や薬は、体温の調節を妨げることがあります（FAA の資料 A Pilot's Guide to Hypothermia and Hyperthermia）。」。出典を `NEW_R` に足す（`faaThermal` など）。冬の朝のフロリダとロンドンの座学の時期に当てはまる。

**S2. 栄養（ACS PA.I.H.K1i の「nutrition」）が本文にない（`hf.fatigue`）**
- 一次資料：PHAK 第 17 章「Acute fatigue can be prevented by proper diet and adequate rest and sleep」「Make sure you eat regular balanced meals; Bring a snack …; Maintain good hydration」、Hypoglycemia and Nutritional Deficiency「Missing or postponing meals can cause low blood sugar … distraction, breakdown in habit pattern, and a shortened attention span」。AIM 8-1-1 も「regular exercise and proper nutrition」。
- 直しの案：疲労の段落か脱水の段落に「食事を抜いたり遅らせたりすると、血糖が下がり、気が散り、注意が続かなくなります。飛ぶ前にきちんと食事をとり、長い飛行には軽食と水を持っていきます（PHAK 第 17 章）。」。疲れの「直すのは休養と睡眠」は「休養・睡眠・食事」に（PHAK・AIM の言い方）。

**S3. 低酸素症の対処（降下・酸素）が書かれていない（`hf.altitude`）**
- 今の文：症状・高度・酸素のすすめと規則・「酸素を使っていて具合が悪くなったら、まず 100%」（過呼吸の段落）はあるが、「低酸素症を疑ったら何をするか」がない。ACS K1 は「corrective actions」を求め、S1 は症状と対処を結び付けさせる。
- 一次資料：PHAK 第 17 章「Treatment for hypoxia includes flying at lower altitudes and/or using supplemental oxygen」。AIM 8-1-2「maintaining a comfortable, safe cabin pressure altitude」。
- 直しの案（4 つの種類の表の前か、ここが大切に）：「低酸素症を疑ったら、酸素があれば使い、高度を下げます（PHAK 第 17 章）。酸素の装置のない機体では、高度を下げます。」。ここが大切の 2 つめを「低酸素を疑ったら、酸素を使い、高度を下げる」に（今の「酸素を使っていて具合が悪くなったら…」は過呼吸の段落の要点として残す）。

**S4. 副鼻腔（ACS PA.I.H.K1c「sinus problems」）が本文にない（`hf.altitude`「耳と副鼻腔」）**
- 見出しに「副鼻腔」があるのに、本文は耳だけ（reader A3 と同じ。ACS の項目なので should にした）。
- 一次資料：AIM 8-1-2 Sinus Block（降下で起きやすい・額（frontal）と頬（maxillary）・激しい痛み・上の歯の痛み・血の混じった鼻汁・かぜや鼻のアレルギーのときは飛ばない・着陸後も治らなければ医師）。
- 直しの案：「副鼻腔（鼻の奥の空洞）も、小さな穴で鼻とつながり、気圧を合わせています。かぜや鼻のアレルギーで穴がふさがると、とくに降下で、額や頬にひどい痛みが出ます。頬の副鼻腔では上の歯が痛むこともあり、血の混じった鼻汁が出ることもあります（米国の AIM 8-1-2）。」

**S5. 進入の錯覚に「もや（haze）」「霧（fog）」と、道路の灯を滑走路と見まちがえることがない（`hf.body` の進入の段落）**
- 一次資料：AIM 8-1-5 Atmospheric illusions（もや → 遠くにいると感じ低い進入、霧に入る → 機首が上がったと感じ進入を急に深くする）、Ground lighting illusions（まっすぐな道路や列車の灯）。PHAK 第 17 章 Haze・Fog・Ground Lighting Illusions も同じ。
- なぜ should か：ACS K1k（optical illusions）と JCAB「着陸失敗をもたらす錯覚」の範囲で、霧の「急に深くする」は地面に近い所での危険な操作。フロリダの夏の朝は、もやが毎日のようにかかる。
- 直しの案：段落に「もやは、滑走路から遠くにいると感じさせ、低すぎる進入になりがちです。霧に入ると機首が上がったように感じ、進入を急に深くしがちです。まっすぐな道路の灯を、滑走路や進入灯と見まちがえることもあります（米国の AIM 8-1-5）。」。説明してみよう 10 の答えにも「もや」を 1 語。

**S6. 耳石器がなく、空間識失調の分類としくみが半分しか書けていない（`hf.body`）**
- 今の文：前庭器官は三半規管だけを説明する。表の体性重力錯覚・逆転錯覚・エレベーター錯覚は、なぜ起きるかが書かれていない。
- 一次資料：FAA の資料 Spatial Disorientation（AM-400-03/1）「the otolith organs … detect changes in linear acceleration and gravity」「the inertial forces resulting from linear accelerations cannot be distinguished from the force of gravity」、PHAK 第 17 章（図 17-3 の Otolith organ、3 つの錯覚は「stimulate(s) the otolith organs」）。
- なぜ should か：JCAB の出題範囲（空間識失調の分類）は「回転角速度・重力加速度・直線加速度によるもの」と、しくみで分ける。学科の問はここから出る。
- 直しの案：三半規管の段落の後に「前庭器官には、もう 1 つ、直線の加速と重力の向きを感じる耳石器があります。耳石器は、前へ加速したときの力と、重力（頭を後ろへ傾けたとき）を区別できません（FAA の資料 Spatial Disorientation）。体性重力錯覚・逆転錯覚・エレベーター錯覚は、耳石器がだまされて起きます（PHAK 第 17 章）。」。錯覚の表に「どこがだまされるか」の列（三半規管・耳石器・目）を足すと、分類の問に答えやすい。用語の表に「Otolith organs／耳石器」。`FL.terms` にない語なので W04 に頼む（12）。

**S7. 空間識失調の「危険性」（JCAB 3（3）イ（ウ））の要点が欠けている（`hf.body`）**
- 今の文：「体の感覚と計器が食い違うことで気づきます」とだけあり、「感覚が正常だから起きる（誰にでも起きる）」「気づかないまま進む」「起こしやすくする条件」がない。
- 一次資料：PHAK 第 17 章「The sensations that lead to illusions during instrument flight conditions are normal perceptions experienced by pilots」「The reason a pilot can be unaware of such a gradual turn …」「illness, medication, alcohol, fatigue, sleep loss, and mild hypoxia are likely to increase susceptibility to spatial disorientation」。
- 直しの案：定義の段落に「空間識失調は、体の感覚が正しく働いているから起きます。誰にでも起きます（PHAK 第 17 章）。ゆっくりした傾きは感じないので、失調に気づかないまま姿勢が崩れていくことがあります。病気・薬・飲酒・疲れ・睡眠不足・軽い低酸素は、空間識失調を起こしやすくします（PHAK 第 17 章）。」。factcheck N1（「食い違いで気づく」の出典）も、この書き直しで一緒に片づく。

**S8. AFH 第 18 章のいちばん効く手「トリムで手放しの水平飛行」と「外をのぞかない」がない（`hf.body` の〔安全〕③）**
- 一次資料：AFH 第 18 章 Attitude Control の 1 つめ「Trim the airplane with the elevator trim so that it maintains hands-off level flight at cruise airspeed」（飛行機はもともと安定していて、トリムを合わせて余計に動かさなければほぼ水平にまっすぐ飛ぶ）、Maintaining Airplane Control「Attempts to control the airplane partially by reference to flight instruments while searching outside … results in inadequate airplane control」、Descents「never exceed 500 fpm」、「It's reasonable to ask the controller to slow down」。
- 直しの案：「最初にすることは…翼を水平に保つことだけです。」の後に「昇降舵のトリムを、手を離しても水平に飛ぶように合わせます。指先で軽く持ち、余計に動かしません（AFH 第 18 章）。計器で操縦しながら外をのぞいて確かめようとすると、操縦がおろそかになります（AFH 第 18 章）。」、M1 の文の後に「降下は毎分 500 ft 以下にします」、管制の文に「急がされたら、ゆっくりにしてほしいと頼んでかまいません（AFH 第 18 章）」。どれも `flight.test.mjs` の並び（翼を水平に保つ → バンク 10° 以下 → …）の間に入る。R3 で `emg.imc` ができたら手順の本体を移し、ここは住所の要点だけにする（C.spatial-disorientation の呼び戻し 3 行）。

**S9. ACS PA.I.H.K2「飲酒と薬の規則」のうち 61.15・61.16・91.17(b)(c)・91.19 がどこにもない（`hf.self`）**
- 今の文：91.17(a) と 61.53 だけ。`law.pilot`（W19 の下書き 124 行）は「体調・薬・飲酒で飛べないときの決まりは `hf.self` で」と任せているので、この本で規則の住所は `hf.self` だけ。
- 一次資料：eCFR 61.15（薬物の有罪・91.17(a) と 91.19(a) の違反は拒否・停止の理由、(e) 運転の飲酒の有罪や運転免許の処分（motor vehicle action）は 60 日以内に FAA へ書面で報告、(f) 報告しないことも理由）、61.16（検査の拒否）、91.17(b)（緊急を除き、酔っている様子の人を乗せない）・(c)（警察官の求めで検査に応じる）、91.19（麻薬などを積んでいると知りながら米国の中で運航しない）。
- 直しの案：`bk.us` の囲み（`hf.self` の `bk.jur` の前）に「米国の規則には、ほかにも次の決まりがあります。飲酒運転などで有罪になったり、それが理由で運転免許の取り消し・停止などを受けたりしたら、60 日以内に FAA へ書面で報告します（14 CFR 61.15(e)）。報告しないことも、資格を拒まれたり止められたりする理由になります（61.15(f)）。警察官から求められたアルコールの検査を拒むことも、同じです（61.16・91.17(c)）。緊急の場合を除き、酔っている様子の人を乗せません（91.17(b)）。麻薬などが積まれていると知りながら、飛びません（91.19）。」（米国の規則なので `bk.us`。CADET には米国の決まりの囲みとして出る）。日本の運転免許の処分が当てはまるかは、この報告では確かめていないので書かない。

**S10. ASRS の文が「報告すれば処分されない」と読める（`adm.review` の `bk.us`）**
- 今の文：「FAA は、ASRS に出された報告を、規則違反の処分に使いません（14 CFR 91.25 …）」。91.25 の文としては正しいが、訓練生がいちばん誤解する所（「ASRS を出せば免責」）を残す。
- 一次資料：AC 00-46F 12.3「although a finding of violation may be made, neither a civil penalty nor certificate suspension will be imposed if」と 4 条件。
- 直しの案：囲みに続けて「ただし、違反がなかったことにはなりません。FAA が別の情報で違反を認めることはあり、罰金や資格の停止を科さないのは、次の全部に当てはまるときです：うっかりで、わざとでない／犯罪・事故・能力の不足を示すものでない／前の 5 年に違反の処分がない／違反から（気づいてから）10 日以内に NASA へ報告した（FAA AC 00-46F）。」

**S11. 後方乱気流の段落に「弱い斜めの追い風」と「2 分」がない（`hf.vision`）**
- 今の段落は、住所 `ops.wake`（W28・R3）ができるまでの仮の置き場所（決まり 13）。今の本の `book-3.js` の課目の表も「衝突と後方乱気流は {ch:hf}」と指していて、R2 の本では後方乱気流はここにしかない。KSFB の平行滑走路では大きな旅客機と同じ時間帯に飛ぶ。
- 一次資料：AIM 7-4-4「a light wind with a cross-runway component of 1 to 5 knots could result in the upwind vortex remaining in the touchdown zone」「THE LIGHT QUARTERING TAILWIND REQUIRES MAXIMUM CAUTION」、7-4-6「an interval of at least 2 minutes」。
- 直しの案：段落に 2 文「風が弱いとき、とくに斜め後ろからの弱い追い風のときは、渦が接地帯に残ったり流れてきたりするので、いちばん気をつけます（米国の AIM 7-4-4）。大きな飛行機が低い進入・着陸復行・タッチアンドゴーをしたあとは、少なくとも 2 分あけて離着陸します（米国の AIM 7-4-6）。」と、段落の頭に小見出し（reader V2）。W28 が `ops.wake` に移すとき、この 2 文も持っていく（C.wake-turbulence）。

**S12. PHAK 第 2 章の operational pitfalls と、自動の判断（automatic/naturalistic decision-making）がない（`hf.adm` か `adm.sa`）**
- 一次資料：PHAK 第 2 章 図 2-15（12 項目）と Automatic Decision-Making（時間がないときは訓練と経験に基づく判断を使い、分析の型（5P・3P・DECIDE）は時間があるとき。自動の判断は訓練と経験で磨かれる）。
- なぜ should か：ACS K4（ADM）と JCAB「意思の決定」の範囲で、FAA の学科試験でも scud running・get-there-itis・peer pressure は名前で問われる。下書きは get-there-itis だけ（しかも 2 か所。S15）。
- 直しの案：`adm.sa` の「思い込み」の後に表「判断のわな（operational pitfalls）」を、VFR の訓練生に関わる 8 行で：仲間の圧力（peer pressure）・思い込み（mindset：状況の変化に気づけない）・get-there-itis（ここを住所にする）・雲の下を低く飛び続ける（scud running）・VFR のまま雲に入る・機体に遅れる（getting behind the aircraft）・位置や状況を見失う・燃料の余裕なしで飛ぶ（PHAK 第 2 章）。`hf.adm` の DECIDE の後に 2 文「時間がない緊急のときは、型を順に回す余裕がありません。そのときは訓練と経験で身につけた判断を使います。だから緊急の手順は、地上と訓練で体に入れておきます（PHAK 第 2 章）。」

**S13. ACS の技能 PA.I.H.S1 に答える「症状・原因・対処」の一覧がない（`hf` の章全体）**
- ACS 6C PA.I.H.S1「Associate the symptoms and effects for at least three of the conditions listed in K1a through K1l with the cause(s) and corrective action(s)」。実地試験の口述でそのまま聞かれる。下書きは中身を 5 つの節に分けて持つが、1 つの表で引けない。
- 直しの案：12 の状態（低酸素・過呼吸・耳と副鼻腔・空間識失調・動揺病・一酸化炭素・ストレス・疲労・脱水と栄養・低体温・目の錯覚・ダイビングのあとの窒素）× 症状・原因・対処の表を、`g1.review`（W25、第 1 部のまとめ）に置くか、`hf` の最後の節の後に置く（どちらでも、中身は各節の文の言い換えで、新しい数字は要らない）。W20 か W25 のどちらが持つかを統合役が決める。

**S14. 同じ概念に 2 つの名前：「個人の最低基準」（`adm.risk`）と「個人の最低条件」（`drafts/wx.js` の `wx.brief` 369 行）**
- DESIGN 3.5（1 つの概念に 1 つの名前）。住所は `adm.risk`（C.personal-minimums）で、`wx.brief` は呼び戻す側。さらに `wx.brief` のリンクは `hf.adm` を指していて、住所の `adm.risk` を指していない（`adm` が登録される前なので仕方がないが、登録のコミットで直す必要がある）。
- 直しの案：W17（または統合役）が `wx.brief` を「個人の最低基準（personal minimums）」と `bk.see('adm.risk', …)` に。W04 に `FL.terms` の行（正式名「個人の最低基準」・英語 personal minimums）を頼む（12）。

**S15. 1 つの概念が 2 か所で教えられている（Aviate → Navigate → Communicate・チェックリスト・get-there-itis）**
- **Aviate → Navigate → Communicate**：`hf.srm`（出典 PHAK と CAP 737）と `adm.error`「作業の順番」（出典 CAP 737）の両方で初めてのように教え、ここが大切にも 2 回出る（reader C5）。住所を `adm.error` の「作業の順番」にし、`hf.srm` は 1 行と `bk.see('adm.error', …)` に（同じ R2 で登録するのでリンクできる）。CONCEPTS に行を足す（10）。
- **チェックリスト**：`hf.srm` の題が「…（SRM）とチェックリスト」で、箇条にもチェックリストの使い方がある。住所は新しい `adm.check`（ACS PA.II.B.K2 も `adm.check`）。`hf.srm` の題から「とチェックリスト」を外し（節 ID は変えないので題は変えてよい）、箇条は「チェックリスト：→ チェックリストと中断からの再開」の 1 行に。
- **get-there-itis**：`hf.adm`（外からの圧力の例）と `adm.sa`（計画を続けたくなる傾向）の 2 か所で定義（reader C6）。PHAK は両方の文脈で使うが、定義は 1 つに。S12 の表を `adm.sa` に置き、そこを住所にして、`hf.adm` は「外からの圧力は、予定どおり行きたい気持ち（→ 判断のわな）を強めます」とつなぐ。用語の表の Get-there-itis も `adm` へ。

**S16. ACS-MAP の対応 4 行が本文と合わない（台帳 `ACS-MAP.json`。W42 の持ち物）**
- `PA.I.A.K5`（Part 68 BasicMed）は `sections: ["intro.cert","hf.self"]`・mapped だが、`hf.self` に BasicMed はない（`drafts/law.js` 122 行の `law.pilot` にある）。→ `hf.self` を `law.pilot` に替える。`IR.I.A.K3`（同じ BasicMed）も同じ。
- `PA.I.A.K3`（航空身体検査証明の種類・期限・特権・一時的な不適格）は `intro.cert`・`hf.self`。`hf.self` は一時的な不適格（61.53）だけで、種類と期限は `law.pilot`（61.23）。→ `law.pilot` を足す。
- `PA.I.H.K2`（飲酒と薬の規則）は `hf.self`・`law.pilot`（missing: law.pilot）だが、`law.pilot` は飲酒を `hf.self` に任せている。→ `law.pilot` を外し `hf.self` だけにする（S9 を入れたうえで）。
- `PA.II.B.K1`（同乗者へのブリーフィング）は `ground.day`・`hf.srm` だが、`hf.srm` にブリーフィングの中身（PHAK 第 2 章 Managing Risks の SAFETY）はない。→ `hf.srm` を外すか、`hf.srm` の「同乗者に頼む」の段落に「出発前のブリーフィングで、シートベルト・通気口・消火器・出口・見張り・話してよい時（PHAK 第 2 章 の SAFETY）を伝えます」と 1 文足す。

### nit（12）

- **N1.** `hf.adm` の題「危険の評価と判断（3P・PAVE・CARE・TEAM・DECIDE）」に、新しく足した 5P がない（`summary` には 5P がある）。→「（3P・PAVE・CARE・TEAM・5P・DECIDE）」。
- **N2.** `adm.sa` の期待のバイアスの定義は RMH どおりだが、確証のバイアスと区別できない（reader SA1）。RMH 自身の例で分ける：期待のバイアスは「見えたもの・聞いたものを、期待どおりに受け取る」（Branson の誤った空港への着陸、NOTAM の閉鎖滑走路を前と同じに読む、地上走行の指示）、確証のバイアスは「見込みに合わない情報を押さえこむ」。→ 定義の後に RMH の誤った空港の例を 1 文。ACS PA.I.H.R4 がこの 2 つを名前で挙げる。
- **N3.** `hf.altitude` の酸素の表「乗員が酸素を使う」：14 CFR 91.211 は「required minimum flight crew」。→「必要な最少の運航乗務員が酸素を使う」（AIM 8-1-2 の言い方も「at the minimum, flight crew」）。
- **N4.** 図 `gLoad` の左半分（0・30・45・60° の 1.00〜2.00）は `aero.turn`（住所）の荷重倍数と同じ中身で、「思い出そう」もある。右半分（体に起きること）だけで足りる。左は「60° で 2 G（→ 旋回と荷重倍数）」の 1 行にしてよい。
- **N5.** `hf.body`「PHAK 第 17 章は、そのしきい値を『毎秒 2° 以下』と書いています」：PHAK の原文が「rotational acceleration of 2 degrees per second」と角加速度に角速度の単位を付けていて、本文の「角加速度」と食い違う（reader B1）。→ 数字を出さず「ゆっくりした回り方の変化は、三半規管では感じられません（PHAK 第 17 章）」に。
- **N6.** `hf.fatigue`：AIM 8-1-1 の閉塞性睡眠時無呼吸（OSA：いびき・昼の強い眠気・治療できて、多くは治療を示せば身体検査に通る）を「眠りの質」の例に 1 文足すと、図 `fatigueFactors` の「眠りの質の低下」に中身が付く。
- **N7.** JCAB の細目で薄い所：ウ（ア）「注意と警戒」の警戒（単調な作業で見張りの注意が落ちる）と、ア（キ）「聴覚と脳の役割」。`adm.error` と `hf.motion` に 1 文ずつあると、細目の言葉に答えられる。
- **N8.** `adm.review`：DESIGN 3.3 の「レジリエンス」が名前で出ない。中身は最後の文（CAP 737 第 7 章「the more 'resilient' they ought to become」）にあるので、「…立て直しやすくなります（立ち直る力、resilience）」と 1 語。factcheck N8（決めつけすぎない練習）と一緒に。
- **N9.** `hf.attitude` の考えてみよう「前もこの雲の下を飛べたから、今日も大丈夫」は、不死身とマッチョのどちらにも読める（reader T1）。PHAK の不死身は「Accidents happen to other people」。→ 場面を「事故はほかの人に起きるもので、自分には起きない」と思った、に変えるか、答えを「不死身（とマッチョ）」にして説明してみよう 15 とそろえる。
- **N10.** `hf.altitude` のパルスオキシメーター：S1 の FAA の資料は「寒いと血管が縮んで、指先の値が実際より低く出ることがある。一酸化炭素では高く出る（10,000 ft で 100% のような値は疑う）」と書く。CDC の文の後に 1 文足すと、冬の朝の点検で迷わない。
- **N11.** `hf.fatigue` の暑さ：S1 の FAA の資料は「軽い認知の低下は、自分の低下に気づく力を奪う」「涼しい時間に飛ぶ・休みなしに何度も飛ばない」とも書く。フロリダの夏の連続の訓練に効く 1 文。
- **N12.** `adm.error` の例（脚とフラップのレバー）：訓練の Archer は固定脚なので、「例は引込脚の機体（あとで乗る双発機など）」と一言あると、初学者が自分の機体で探さない。

## 4. ACS・JCAB の見出しごとの確かめ

### 4.1 ACS（自家用 6C の PA.I.H と、`hf.*`・`adm.*` を節に持つ行）

| ACS | 中身 | 本文のある所 | 判断 |
|---|---|---|---|
| PA.I.H.K1a Hypoxia | `hf.altitude` | 症状・高度・種類・規則はある。**対処がない**（S3） |
| K1b Hyperventilation | `hf.altitude` | ある（AIM 8-1-3 の順） |
| K1c Middle ear and sinus | `hf.altitude` | 耳はある。**副鼻腔がない**（S4） |
| K1d Spatial disorientation | `hf.body` | ある。耳石器と危険性が欠ける（S6・S7） |
| K1e Motion sickness | `hf.motion` | ある |
| K1f Carbon monoxide | `hf.altitude`（`sys.elec` は住所へリンク） | ある（`sys.js` 265 行が `hf.altitude` へ任せていて、重なりはない） |
| K1g Stress / K1h Fatigue | `hf.fatigue` | ある |
| K1i Dehydration and nutrition | `hf.fatigue` | 脱水はある。**栄養がない**（S2） |
| K1j Hypothermia | — | **ない**（S1） |
| K1k Optical illusions | `hf.body`・`hf.vision` | ある。もや・霧・道路の灯が欠ける（S5） |
| K1l Nitrogen after scuba | `hf.altitude` | ある（AIM の 12・24 時間と AMSL） |
| K2 Regulations (alcohol, drugs) | `hf.self` | 91.17(a)・61.53 はある。**61.15・61.16・91.17(b)(c)・91.19 がない**（S9）。台帳の `law.pilot` は誤り（S16） |
| K3 Effects of alcohol, drugs, OTC | `hf.self` | ある（48 時間・5 倍・眠くない薬でも） |
| K4 ADM, CRM/SRM | `hf.adm`・`hf.srm`・`adm.risk` | ある。operational pitfalls と自動の判断がない（S12） |
| R1 Aeromedical | 各節 | ある |
| R2 Hazardous attitudes | `hf.attitude` | ある |
| R3 Distractions, task prioritization, loss of SA, disorientation | `adm.error`・`adm.sa`・`hf.srm` | ある（作業の順番は 2 か所：S15） |
| R4 Confirmation and expectation bias | `adm.sa` | ある。区別の例を足すとよい（N2） |
| S1 症状・原因・対処を結び付ける | — | **1 つの表がない**（S13） |
| S2 自己評価（fitness for flight・personal minimums） | `hf.self`・`adm.risk` | ある（書き込み表あり） |
| PA.II.A.K1 Pilot self-assessment | `hf.self` | ある |
| PA.II.A.K4 Environmental factors | `adm.risk`（＋`wx.brief`・`ground.day`） | `adm.risk` は個人の最低基準と引き返しの判断。天気・地形・経路の中身は `wx.brief` と `ground.day` |
| PA.II.B.K1 Passenger briefing | `ground.day`・`hf.srm` | `hf.srm` に中身がない（S16） |
| PA.II.B.K2 Use of appropriate checklists | `adm.check` | ある（AFH 第 1 章の場面の一覧） |
| PA.VIII.E.K1・IR.IV.B.K2 Prevention of unusual attitudes（physiological） | `hf.body` | ある |
| PA.XI.A.K1 Physiological aspects of night vision | `hf.vision` | ある |
| PA.XI.A.K8 Visual illusions at night | `hf.body` | ある（ブラックホール・にせの水平線・自動運動）。道路の灯の見まちがいを足す（S5） |
| PA.I.A.K3・K5、IR.I.A.K3 | 台帳は `hf.self` | BasicMed・種類・期限は `law.pilot`（S16） |

### 4.2 JCAB（自家用・事業用の空中航法 3（3）、計器飛行証明 8）

| 見出し | 本文のある所 | 判断 |
|---|---|---|
| ア（ア）低酸素症等（低酸素症の概要、耳閉塞の概要） | `hf.altitude` | ある（対処は S3） |
| ア（イ）過呼吸・（ウ）一酸化炭素中毒・（エ）減圧症 | `hf.altitude` | ある |
| ア（オ）加速度 | `hf.motion` | ある（Gz の向き。Gx・Gy は FAA の資料にあり、足すなら 1 文） |
| ア（カ）視覚（目のしくみ、目標物のみかた、暗順応と明順応、視力への影響、見張りと空中衝突の予防） | `hf.vision` | ある |
| ア（キ）聴覚（聴覚と脳の役割） | `hf.motion` | 騒音と聴力はある。「脳の役割」は薄い（N7） |
| イ（ア）空間識（構成するもの） | `hf.body` | 目・前庭・体の感覚の 3 つはある。前庭の中の耳石器がない（S6） |
| イ（イ）空間識失調の分類（傾斜錯覚、着陸失敗をもたらす錯覚、回転角速度・重力加速度・直線加速度によるもの、平衡感覚によるもの） | `hf.body` | 錯覚の名前はそろうが、**しくみで分けられない**（S6）。着陸の錯覚にもや・霧がない（S5） |
| イ（ウ）空間識失調の危険性（感覚が正常だから起きる・脱却が困難・自覚がない・混乱や恐怖・夜） | `hf.body` | **一部だけ**（S7）。夜・脱却の困難（約 10 分）はある |
| イ（エ）対処と回復 | `hf.body`（R3 で `emg.imc`） | ある（M1・S8 を直して） |
| イ（オ）飛行への適合性（心身の状態と健康管理、インキャパシテーション） | `hf.self`・`hf.fatigue`・`hf.motion` | ある |
| ウ（ア）情報処理（注意と警戒、認識、記憶、反応の選択） | `adm.error` | ある。警戒が薄い（N7） |
| ウ（イ）ヒューマンエラー（理論とモデル、発生の原因） | `adm.error` | ある（スイスチーズ・エラーの種類。SHELL は推測・要確認のまま） |
| ウ（ウ）意思の決定 | `hf.adm`・`adm.risk` | ある。自動の判断を足す（S12） |
| ウ（エ）コックピット・マネージメント（エラーの回避と処理、安全に対する注意、会話、エラーマネージメント） | `hf.srm`・`adm.check`（＋`crm.crm`） | 1 人の操縦の範囲はある |
| ウ（オ）人間性（人間性と態度） | `hf.attitude` | ある |
| ウ（カ）TEM（自家用）・ウ（キ）TEM（事業用） | `crm.tem`（第 6 部） | `adm.risk` の「思い出そう（予告）」だけ。自家用の学科の範囲なので、第 1 部では予告の 3 行が上限（C.tem-words）という設計どおり。reader RK3 の「まだ習っていない」は、予告の形で正しく扱われている |
| ウ（キ）医薬品の取り扱い（自家用）・（ク）（事業用） | `hf.self`（日本の指針は `bk.jp`） | ある |
| 計器 8（1）〜（3） | 上と同じ節 | 同じ判断 |

## 5. 1 つの概念・1 つの住所

| 概念 | 住所 | 下書きの扱い | 判断 |
|---|---|---|---|
| 空間識失調（C.spatial-disorientation） | `hf.body` | 太字の定義 1 回。`wx.js` 286 行は「空間識失調（spatial disorientation」と書くが太字でない | よい。呼び戻す `emg.imc`・`ifr.scan` は R3 |
| 夜の目（C.night-vision） | `hf.vision` | 暗順応の太字 1 回 | よい |
| 個人の最低基準（C.personal-minimums） | `adm.risk` | 太字 1 回。`wx.brief` は「個人の最低条件」・リンク先 `hf.adm` | **名前とリンクがずれる**（S14） |
| 驚きと驚愕（C.surprise-startle） | `adm.review` | 太字 1 回 | よい |
| TEM の言葉（C.tem-words） | `crm.tem` | `adm.risk` に予告つきの思い出そう | よい（設計どおり） |
| 後方乱気流（C.wake-turbulence） | `ops.wake`（R3） | `hf.vision` に 4 文（行き先がまだないので） | 仮の置き場所として可。安全の 2 文を足す（S11） |
| 一酸化炭素 | `hf.altitude` | `sys.elec` は暖房のしくみだけでリンク | よい（重なりなし） |
| 荷重倍数 | `aero.turn` | `hf.motion` に図 `gLoad` で数字を再掲＋思い出そう | 小さな重なり（N4） |
| 作業の順番（Aviate → Navigate → Communicate） | （台帳に行がない） | `hf.srm` と `adm.error` の 2 か所 | **重なり**（S15）。住所 `adm.error` の行を CONCEPTS に |
| チェックリストの使い方 | `adm.check`（ACS PA.II.B.K2） | `hf.srm` の題と箇条にも | **重なり**（S15） |
| get-there-itis | （台帳に行がない） | `hf.adm` と `adm.sa` の 2 か所で定義 | **重なり**（S15）。S12 の表と一緒に `adm.sa` を住所に |
| 状況認識 | `adm.sa` | `hf.srm` の箇条に先に出る（定義なし） | 先の言及として可。`bk.see('adm.sa', …)` を |

## 6. 事実確認役・初学者の読み手の指摘への対応

- **factcheck S1**（図 `infoProcess` の注意の枠）：同意。CAP 737 の図のとおり、自動の処理の道（知覚 → 慣れた手順 → 反応）も描くと、本文の「2 つに分かれ」と合う。
- **factcheck S2**（「正の G はまず目に出る」）：同意。FAA の資料の「ゆっくりなら目が先、速いと前触れなし」を入れる。教官としては、訓練で強い G がかかるのは急旋回より**不良姿勢からの回復で強く引いたとき**なので（FAA の資料「During steep turns and unusual attitude recovery」）、`hf.motion` の「引き続けると、すぐに意識を失います」の前に「回復のときに強く引きすぎない」を置くとよい。
- **factcheck N6**（「山や高い障害物から離れる」は AFH の手順でない）：同意。S8 のトリムの文を入れるときに、この文を本の裁定の段落へ移す。
- **factcheck N1**：S7 の書き直しで片づく。**N8**：N8 と一緒に。**N10**（「重大」と「重い」）：同意。
- **reader B2**（1 目盛りが分からない）：**must に上げた**（M1）。分からないだけでなく、訳が誤り。
- **reader A3**（副鼻腔）：ACS の項目なので should（S4）。**reader A1**（機内の高度）・**A2**（酸素を 100% にする操作）：同意。訓練の Archer に酸素の装置があるかは確かめていないので、書くなら POH で確かめてから。
- **reader C5・C6**（Aviate と get-there-itis の重なり）：住所の問題として should にまとめた（S15）。**reader T1**：N9。**reader B1**：N5。**reader V2**（後方乱気流の段落の置き方）：S11 と一緒に。**reader SA1**：N2。
- **reader C1**（「危険」と「ハザード・リスク」）：同意。PHAK 第 2 章の 3P も「Perceive hazards → Process（risk）→ Perform（mitigate）」の言い方なので、`hf.adm` の表を「危険（ハザード）に気づく」とするのが一次資料に近い。

## 7. 安全の目で見た点

1. **M1**：雲に入ったときの機首上げの量。〔安全〕③ の文なので、W36（安全レビュー）にも見てほしい。
2. **S8**：トリムで手放しの水平飛行に合わせる、外をのぞかない、降下 500 fpm 以下。AFH が「key to emergency airplane attitude control」と呼ぶ手が抜けている。
3. **S3**：低酸素を疑ったら下りる。酸素のない機体の訓練生には、これが唯一の対処になる。
4. **S11**：弱い斜めの追い風のときの後方乱気流。KSFB で大きな機の後ろに着陸・離陸する場面は、ソロの前から起きる。
5. **S5**：霧に入ったときに進入を急に深くする錯覚。地面のすぐ上で起きる。
6. **S10**：ASRS を「出せば免責」と誤解したまま、決まりを軽く見ることを防ぐ。
7. factcheck S2：急に強く引いたときの前触れなしの失神。

## 8. 検査と結果

| 検査 | コマンド | 結果 |
|---|---|---|
| 章の検査 | `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/hfadm-figs.js textbook/rewrite/combined/drafts/hfadm.js` | error 6・warn 10・pending 6・info 410。error 6 は style（`taigen-dome` ×4・`not-polite` ×2）で、W20 の報告 5.1 のとおり部品の見出し `<b>判断の目</b>`・`<b>思い出そう</b>` を文と数える誤検出。warn 10 は claims の台帳にまだ行がないもの（W20 のパッチが取り込まれていない）。pending は concepts 5（行き先の節がまだない）・calc 1。figures 13 枚・jurisdiction・chapter-refs・questions・photos・egov は 0 |
| FLIGHT LAB | `cd flight-lab && npm run -s test:fast` | **86 / 86 pass** |
| TEXTBOOK | `cd textbook && npm test` | **33 / 34 pass、1 fail**：`build: FLIGHT LAB sources are not copied into textbook/` が `rewrite/combined/drafts/radio.js`（W19-radio の下書きの名前）を見つける。2 回流して同じ。W20・この報告とは関係しない（W20・factcheck-hfadm の報告と同じ） |
| CADET | `cd cadet && npm run -s test:fast` | **247 / 247 pass** |

## 9. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/expert-hfadm.md`（新） | この報告 |

下書き・台帳・製品のファイルは変えていない。git の操作はしていない。

## 10. 台帳の行（触っていない。提案だけ）

- **CONCEPTS**（統合役が `op: "add"` で）：
  - `C.task-priority`「作業の順番（Aviate → Navigate → Communicate）」：address `adm.error`、recalls `["hf.srm"]`（R3 で `emg.*`・`crm.*` も）、maxLines 1、unit W20
  - `C.checklist-use`「チェックリストの使い方と中断からの再開」：address `adm.check`、recalls `["hf.srm"]`（R3 で `ground.*`・`emg.*`）、maxLines 1、unit W20
  - `C.get-there-itis`「get-there-itis と判断のわな」：address `adm.sa`、recalls `["hf.adm"]`、maxLines 1、unit W20
- **ACS-MAP**（W42）：S16 の 4 行（`PA.I.A.K5`・`IR.I.A.K3` の `hf.self` → `law.pilot`、`PA.I.A.K3` に `law.pilot`、`PA.I.H.K2` から `law.pilot` を外す、`PA.II.B.K1` の `hf.srm` を外すか本文に SAFETY）。`PA.I.H.K1` の note に「K1i（栄養）・K1j（低体温）は S1・S2 を入れるまで本文にない」
- **UNVERIFIED**：SHELL（11 の 1）は W20 の扱い（`bk.est`）のまま
- **CLAIMS**：M1 の文を直したら、その行（札「参考値」・出典 AFH 第 18 章）を作り直す。S1〜S12 で足す文は新しい行

## 11. 未解決のこと

1. **SHELL モデルの一次資料**：FAA（faa.gov）と国土交通省（mlit.go.jp）を探したが、SHELL を説明する一次資料は見つからなかった（検索で出るのは二次資料だけ）。`bk.est` のまま（W27 か、icao.int を読めるようになってから）。
2. **bar width の度の数**：IFH 15B の本文に「1 本分＝約何度」の数字を見つけられなかったので、M1 の直しの案は数字を書かない形にした。W15 が `inst` で説明するときも、数字は一次資料で確かめてから。
3. **雲の中の 180° 旋回**：本の裁定（R.vfr-into-imc）の書き方は事実として正しい（factcheck 12 の 2 と同じ）。採るかは W36。教官としては、裁定を残すなら「雲に入った時の機首方位を覚えておき、方向指示器で反対の方位に合わせて止める」の 1 文があると実際に使える（この本の判断なので出典は不要だが、W36 に見てほしい）。
4. **日本の運転免許の処分と 61.15**：S9 では書かない形にした。訓練生に関わるなら W37（法令）か所有者の判断 7 の候補。

## 12. ほかの単位にお願いしたいこと（needs from others）

1. **W20（または hf・adm の改稿の単位）**：3 の M1・S1〜S15・N1〜N12。M1・S8 の文は `flight.test.mjs` の `inOrder`（`hf.body`）の語の順を崩さない位置に入れる。直したら `check-chapter.mjs --claims-out` で札を作り直し、`hfadm.claims.json` を更新。新しい出典（FAA の低体温の記事・FAA の Spatial Disorientation・AC 00-46F は既にある・eCFR 61.15/61.16/91.19 は `R.cfr61`/`R.cfr91` で足りる）を `NEW_R` に。
2. **W17（wx）または統合役**：`drafts/wx.js` の `wx.brief`（369 行）の「個人の最低条件」を「個人の最低基準」に、リンクを `bk.see('adm.risk', '個人の最低基準')` に（`adm` を登録するコミットで）。
3. **W04（用語）**：`FL.terms` に「個人の最低基準（personal minimums）」「耳石器（otolith organs）」「低体温症（hypothermia）」を（W20 の報告 7 の 6 の語と一緒に）。
4. **W15（inst）**：`inst.gyro` か `inst.pfd` の姿勢指示器の説明に、「bar width（小さな飛行機の横棒の太さ。機首の上げ下げはこれで数える）」を 1 文（IFH 15B）。M1 の文がそこを指せるように。
5. **W42（ACS-MAP）**：10 の ACS-MAP の行。
6. **W25（g1）**：S13 の「症状・原因・対処」の表を `g1.review` に置くなら、その担当を（統合役が W20 と W25 のどちらにするか決める）。
7. **W28（ops.wake）**：`hf.vision` の後方乱気流の段落を移すとき、S11 の 2 文（弱い斜めの追い風・2 分）と平行滑走路 2,500 ft（AIM 7-4-6）を `ops.wake` に。
8. **W36（安全レビュー）**：M1・S3・S8・S11 と factcheck S2、11 の 3。
9. **統合役**：10 の CONCEPTS の 3 行。`hf.srm` の題の変更（S15）は、CADET の教室の列や検査が題の文字を固定していないかを登録のときに確かめる（今の検査で `hf.srm` の題を固定しているものは見つけなかった）。
