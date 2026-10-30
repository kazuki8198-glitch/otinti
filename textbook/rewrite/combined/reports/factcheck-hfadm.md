# 事実確認の報告：第 1 部 第 18 章 `hf`「人間の能力と判断」と 第 19 章 `adm`「エラー・状況認識・リスク」（W20 の下書き、R2）

単位：factcheck-hfadm（W20 の事実確認役。下書きは書いていない）。作業日：2026-10-30。
対象：`textbook/rewrite/combined/drafts/hfadm.js`・`hfadm-figs.js`・`hfadm.claims.json`（W20）。照らしたもの：DESIGN 6.2（15 の決まり）・3.2・3.3（第 1 部 第 18・19 章）・3.4・4.2（kiso10）、DECISIONS.md、STYLE.md、W20 の報告 `reports/W20.md`、台帳 ERRATA（`K.human.*`・`T.human.*`）・RULINGS（`R.vfr-into-imc`・`R.trust-instruments`・`R.cold-sick`・`R.passenger-resource`）・JCAB-MAP・CLAIMS。
**下書き・台帳・製品のファイルは 1 つも変えていません。** 変えたのはこの報告だけです。直しの案は下の 4 にまとめました（直すのは W20 か、この章の改稿の単位）。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck-hfadm.md`（新） | この報告 |

一次資料は W20 の取り寄せ（scratchpad の `w20/`）を使わず、どれも元の URL から新しく取り寄せた（scratchpad の `fchf-dl/`。リポジトリには置いていない）。

## 2. 確かめ方（一次資料。どれも 2026-10-30 に元の URL から取り寄せて本文を読んだ）

| 資料 | 取り寄せ方 | 確かめた所 |
|---|---|---|
| FAA AIM 第 8 章 第 1 節（HTML、`aim_html/chap8_section_1.html`） | NEW_R/R.aim81 の URL | 8-1-1（Illness・Medication・Alcohol の 1 本・3 時間・8 時間・12〜24 時間・Fatigue の acute/chronic・Stress・Emotion・Personal Checklist「pilot impairment contributes to many more accidents than failures of aircraft systems」）、8-1-2（21%・5,000 ft・12,000 ft・12,000〜15,000 ft・18,000 ft で 20〜30 分・20,000 ft で 5〜12 分・熱と寒さと発熱と不安・症状は 1 人では変わらない・低圧室・昼 10,000 ft／夜 5,000 ft・91.211 の要約・Ear Block（Valsalva・鼓膜・oral decongestants）・Sinus Block・ダイビング 12/24 時間と AMSL）、8-1-3（100% → 装置 → 呼吸、数分）、8-1-4（manifold・暖房を切る・通気口）、8-1-5（錯覚 9 つ・進入の錯覚 5 つ）、8-1-6（暗順応 30 分・赤い灯 20 分・色をゆがめる・白い灯・5,000 ft・片目・サングラス 85%・200°・7 マイルと 7/10・10° と 1 秒・1/4〜1/3・16 秒と 4〜5 秒・empty-field myopia 10〜30 ft）、8-1-7（+G と −G）、8-1-8（衝突のコース・VOR の近く・天気のよい日） |
| FAA AIM 7-4（HTML） | NEW_R.aim74 | 7-4-3（heavy・clean・slow）・7-4-4（数百 ft/min で沈む・風で流れる）・7-4-6（接地点の先に着陸・浮いた点の手前で浮く） |
| PHAK FAA-H-8083-25C 第 2 章（PDF） | NEW_R.phak2 | 約 80%、3P・PAVE・CARE・TEAM、外からの圧力（例の列・single most important key）、5P と見直す場面（hourly or at the midpoint・2 時間を超えたら hourly）、DECIDE、5 つの危険な態度と解毒剤・label・prerogative to question、図 2-5 のリスク・マトリックス（画像を 250 dpi で切り出して 16 マスを照らした）と Probable〜Improbable・Catastrophic〜Negligible の定義・「must either not fly or fly only after …」、夜の VFR の 100 時間で約 50%・最初の 500 時間、状況認識の定義（5 つの要素）と Obstacles、workload の stop・think・slow down・prioritize、get-there-itis、SRM の定義、sterile flight deck の 2 つの時間 |
| PHAK 第 17 章（PDF） | NEW_R.phak17 | 48 時間・5 倍・30 時間、低酸素症の 4 種類、1 オンスで 2,000 ft、図 17-1（20,000 ft は 30 minutes or more）、過呼吸（talking aloud）、Sinus block、3 つの感覚系・2°/s、Featureless Terrain Illusion と black hole approach、夜の飛行の準備の段落の「make a decision early to turn 180°」、Motion Sickness（first few lessons・vents・Dramamine は勧めない）、CO（200 倍・48 時間・検知器）、ストレス（acute・chronic・医師）、疲労（acute は休養と 8 時間の睡眠・no amount of training・the only way）、脱水（最初は疲れ・2%・利尿）、熱中症（light-colored clothing・hat・換気）、寒さで手足の血流、DCS（the bends・100%・緊急降下・症状が消えても診察）、目（錐体と桿体・夜の盲点・5〜10°・2〜3 秒・「cones adapt rapidly」） |
| AFH FAA-H-8083-3C 第 18 章（PDF） | NEW_R.afh18 | Inadvertent VFR Flight Into IMC（p.18-17〜18-21）：約 10 分、認める → 操縦を保つ → 助け、the only concern … keep the wings level、autopilot or wing leveler、one bar width、no more than 10° bank、combined maneuvers should be avoided、ATC の sense of urgency。180° 旋回の決まった手順がないこと（章全体を「180」で検索：エンジン故障の引き返しだけ） |
| AFH 第 1 章（PDF） | NEW_R.afh1 | Use of Checklists（memory aid・need not be “do lists”・emphasis on the “check”・使う 11 の場面） |
| FAA Risk Management Handbook FAA-H-8083-2A（PDF） | R.rmh のページから PDF | 第 2 章（規則はすべてを決めず安全を約束しない・6 段階・図 2-9 の 4 行・3 つの注意・written minimums）、第 6 章（What is an Error・Expectation Bias・confirmation bias・疲労・図 6-1 のスイスチーズと Proficiency）、用語集（Hazard・Residual risk・Risk・Situational awareness） |
| eCFR 14 CFR 91.17・91.211・61.53・91.25・91.113（versioner API、2026-10-28 の版） | `api/versioner/v1/full/2026-10-28/title-14.xml?part=…&section=…` | 91.17(a)(1)〜(4)、91.211(a)(1)〜(3)、61.53(a)、91.25、91.113(b) |
| FAA AC 120-111 Change 1（PDF） | NEW_R.ac120111 | 用語 p. Startle・q. Surprise |
| FAA AC 00-46F（PDF、4/2/21） | NEW_R.ac0046f | 7.1 de-identification、8.1 FAA は身元を求めない、8.2 と 91.25（criminal offenses or accidents は除く） |
| FAA CAMI の資料 5 つ（PDF） | NEW_R.faaCircadian・faaHearing・faaAccel・faaDcs・faaCo | Circadian（OK-23-0080：west to east が重い・an hour a day・時計・水・アルコールとカフェイン・機内で寝るか起きるか・Catch Some Rays・Be Active：着いて昼寝は最悪）、Hearing（AM-400-98/3：second only to vision・Small Single Plane 70-90・90 dB・4,000 Hz・headsets で交信が聞きやすい）、Acceleration（OK-24-1154：steep turns and unusual attitude recovery・alcohol, fatigue, dehydration・back off the control pressure・**onset が 1 G/秒以上なら見え方の前触れなしに GLOC**）、DCS（18,000 ft より下でダイビングをしていない健康な人はまれ）、CO（Land as promptly as possible・ATC に vectors・検知器・整備） |
| CDC Clinical Guidance for CO Poisoning（HTML） | NEW_R.cdcCo | 「The conventional two-wavelength pulse oximeter is not accurate when COHgb is present」、Reviewed: August 21, 2026 |
| UK CAA CAP 737 第 2 版（2023、PDF） | NEW_R.cap737 | 第 1 章 図 3（ページ 22 を画像で見た：Attention の網かけは Conscious processing（working memory）にかかり、Long Term Memory／Unconscious processing の箱は網かけの外）、第 5 章（slip＝フラップと脚、lapse＝脚の上げ忘れ、unintended／intended、mistake、violation は get the job done・intention to violate、just cultures、checklist interrupted … returns to the wrong place … many accidents、if any doubt surfaces、feeling hurried as a cue）、第 6 章（concurrent tasks compete・switching is expensive・continuing a planned action と注意の切り替え）、第 7 章（five to ten seconds・fight or flight で注意が集まる・recently learned information・simplest solution・aviate navigate communicate は starting point・mentally rehearse（go-arounds。ただし決めつけすぎない注意つき）・more unusual events → resilient） |
| 国土交通省 航空局長通達 国空航第 2278 号（PDF） | NEW_R.mlitAlcohol | 原則と 3.(1) 血液 1 L 0.2 g・呼気 1 L 0.09 mg |
| 国土交通省「航空機乗組員の使用する医薬品の取扱いに関する指針」（PDF、令和 5 年 7 月 21 日一部改正） | NEW_R.mlitMeds | 3. の A〜D の 4 区分、A の第 3 類の市販薬 |
| 国土交通省 HF 訓練検討会 最終とりまとめ（PDF、令和 8 年 2 月 24 日） | NEW_R.mlitHf | 令和 7 年 6 月 6 日公布、管制圏の空港での離着陸の操縦と練習の監督、規定の施行 令和 7 年 12 月 1 日・義務は政令の日（公布から 3 年以内）、間隔 2 年、最低 3 時間、適用開始は令和 10 年 6 月頃の見込み |
| e-Gov 法令 API v2：航空法 第 71 条の 5（令和 7 年 12 月 1 日施行の版 `327AC0000000231_20251201_507AC0000000055`） | `laws.e-gov.go.jp/api/2/law_data/…?elm=MainProvision-Article_71_5` | 「技能発揮訓練を修了していなければ … 一 航空交通管制圏に係る空港等から … 離陸 … 二 … 着陸 … 三・四 … 練習の監督」。**固定した版の本文にある**（写し `sources/egov/` にはまだない） |
| e-Gov の写し `textbook/rewrite/sources/egov/articles/kokuho/` | 読んだ | 第 31 条・第 70 条・第 71 条の 2（FL.jur の囲みの日本の欄の抜き取り） |
| VOICES「VOICES について」（HTML） | NEW_R.voices | 平成 26 年 7 月 10 日開始、ATEC が運営、義務報告対象の事象は取り扱えない |
| 基礎教材 kiso10（原本、読むだけ） | `flight-lab/kiso/data/kiso10.json`・`fig/ch10-fig10-2・3・5・7・8・10.svg` | 本文 29 節・記述問題 q1〜q28 との文字の重なり、描き直した図 6 枚の元の文字 |

道具：`node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/hfadm-figs.js textbook/rewrite/combined/drafts/hfadm.js --claims-out=…`（抜き出した主張と `hfadm.claims.json` の突き合わせ）、新しい図 10 枚を Chromium 390 px（2 倍）で PNG にして目で見た（スクリプトと PNG は scratchpad の `fchf-tools/`）、PHAK 図 2-5 と CAP 737 図 3 を画像で見て照らした、kiso10 との 14 字以上の文字の重なりの検査（本文・確認問題・説明してみよう）、写真 `ch10-photo4` の画面の数字を画像で確かめた（96・85）、`NEW_R` の 18 の URL が開くこと（どれも 200）。

## 3. 結果の要約

- 主張の札 121 行（参考値 96・条文 22・推測・要確認 2・教材値 1、うち例題 3）：`--claims-out` の抜き出し 121 行と `hfadm.claims.json` の 121 行は **ID も文も全部一致**（札のない主張 0）。**116 行は一次資料と合う**。1 行は文を直してから（S2）、4 行は出典か札の書き方を直してから署名する（5）。FL.jur が描く囲みの 13 行（W06 の値）は、米国の欄を eCFR で、日本の欄を e-Gov の写しと通達で抜き取って確かめた（どれも合う）。W22 の写真の説明 2 行も合う。
- 本文（札の行の外も含む）：**must 0・should 3・nit 14**（下の 4）。AIM・PHAK・AFH・RMH・CAP 737・AC・CAMI の資料と照らして、数字・定義・手順の誤りはない。〔安全〕③（VFR で雲に入ったとき）の AFH の部分（翼を水平・10°・1 目盛り・上昇と旋回を同時にしない・自動操縦・約 10 分・管制に急がされても急がない）は AFH 第 18 章と一字一句の意味で合う。180° 旋回は AFH も PHAK も雲の中の手順として決めていない（本は「この本では」と本の裁定にした：正しい書き方）。
- 計算：全部を計算し直した（6）。誤りなし。
- 図：新しい 10 枚を一次資料と照らし、390 px の PNG で見た（7）。数字の誤りはない。`infoProcess` の「注意」の枠が「慣れた手順（長期記憶）」まで囲み、CAP 737 の図 3 とも自分のキャプションとも食い違う（S1）。`riskMatrix` の 16 マスは PHAK 図 2-5 と全部一致。
- 日米の書き分け：check-jurisdiction は error 0。全節 `scope: 'common'`、米国の規則と AIM は「米国の」つきか `bk.us`・`bk.src`、日本の法令・通達・VOICES は `bk.jp` と FL.jur の囲みの中だけ（8）。
- 基礎教材の写し：本文は書き直されている（いちばん長い重なり 26 字）。説明してみようの**問いの文**のいくつかが原本の問いとほぼ同じ（いちばん長い重なり 48 字。S3）。答えは書き直されている（いちばん長い重なり 19 字）。

## 4. 問題と直しの案（重い順）

### must（直すまで登録しない）

なし。

### should（直すのがよい。登録の前に直すことを勧める）

**S1. 図 `infoProcess` の「注意（限りがある）」の枠が「慣れた手順（長期記憶）」も囲んでいる（`hfadm-figs.js` の `infoProcess`、`adm.error`）**
- 今の図：点線の枠 `box(202, 24, 112, 168, C.vi, …)` が「考える（作業記憶）」（y 50〜108）と「慣れた手順（長期記憶）」（y 122〜180）の両方を囲み、枠の題が「注意（限りがある）」。キャプションは「考える作業は注意を使い … 慣れた手順は、注意をあまり使わずに進みます」。
- 一次資料：CAP 737 第 1 章 図 3（p.22）は、Attention の網かけが Conscious processing（Working memory）にかかり、Long Term Memory / Procedural Memory / Unconscious processing の箱は網かけの**外**。本文も「Conscious activities require attention and unconscious (automatic) activities do not.」。図が自分のキャプションと、もとにした図の両方と食い違う。
- 直しの案：枠の高さを 168 → 92 にして「考える（作業記憶）」だけを囲む（`box(202, 24, 112, 92, C.vi, { op: 0.08, dash: '6 4' })`。「慣れた手順」の箱は y 122 のままで枠の外に出る）。できれば CAP の図のように、知覚から「慣れた手順」へも矢印（例 `A(182, 100, 208, 146, C.ink, 2)`）と、「慣れた手順」から反応への矢印（例 `A(306, 150, 330, 128, C.ink, 2)`）を足す（今は知覚 → 注意の枠の 1 本だけで、自動の処理の道が描かれていない。本文の「意識して考える処理と、慣れた手順で自動に進む処理に分かれ」と合う）。

**S2. 「正の G はまず目に出る」と言い切っている（`hf.motion` の「ここが大切」2 つめ・図 `gLoad` のキャプション・札 `hf.motion#d3feb0fd`）**
- 今の文：ここが大切「正の G はまず目に出る。視野が狭くなったら、引く力をゆるめる」、キャプション「正の G では血が足の方へ下がり、目から先に影響が出ます（米国の AIM 8-1-7）」。
- 一次資料：AIM 8-1-7 は順番（narrowing → gray-out → black-out → unconsciousness）を書くが、本文が出典にもしている FAA の資料 Acceleration in Aviation: G-Force（OK-24-1154）は「When the onset is gradual (about 0.1 G per sec.), visual symptoms precede GLOC. If the onset is rapid (1 G per second or more), GLOC can occur without visual warning.」。言い切りは、急に強く引いたときに「目に出るまで大丈夫」と読めて、安全の向きに弱い。
- 直しの案：ここが大切を「正の G は多くはまず目に出る。急に強いと前触れなく気を失う」か「視野が狭くなったら引く力をゆるめる。急に引くと前触れなく気を失うこともある」（どちらも 60 字以内）。キャプションは「…ゆっくりかかると、目から先に影響が出ます（米国の AIM 8-1-7）。急に強くかかると、見え方の変化なしに意識を失うこともあります（FAA の資料）」。本文「G に耐える力は …」の段落に 1 文「急に大きな G がかかると、見え方が変わる前に意識を失うこともあります（FAA の資料 Acceleration in Aviation: G-Force）」。確認問題 8 の問「最初に出やすいのは？」は「出やすい」なので変えなくてよい（決まり 4）。理由の文に「急に強くかかると前触れなしに失神することもある」を足すとよい。札 `hf.motion#d3feb0fd` を作り直す。

**S3. 説明してみようの問いの文が、原本の問いとほぼ同じ（`adm` の written 7・8・3・4・9、`hf` の written 12・6・10 など）**
- 一次資料（原本 kiso10.json の qa）との重なり（空白とタグを除いた連続一致の長さ）：`adm` 問 7（kiso10.q22）**48 字**「決めた自分の最低基準を少し緩めれば飛べそうです。最低基準の役割と、法令や機体の制限との関係、見直」（原本との違いは「当日」→「の日」「詰まり」→「つまり」「以前」→「前に」「見直しを行う場面」→「見直す時期」だけ）、`adm` 問 8（q26）30 字、`adm` 問 3（q16）・問 4（q17）・`hf` 問 12（q14）24 字、`adm` 問 9（q27）・`hf` 問 6（q3）23 字、`hf` 問 10（q7）22 字。答えはどれも書き直されている（最長 19 字）。本文の節は最長 26 字（`hf.attitude`「「前にもできたから今回も大丈夫」と考えたら、今回の」）で、書き直しとして問題ない。
- 判断 2 で書き直して使うことは許されているが、DESIGN の作り方（4.2・基準 10）は「書き直して入れる」で、問いの文を字の置き換えだけで使うのは写しに近い。factcheck-law の N10（22 字）と同じ扱いの延長だが、48 字・30 字は長い。
- 直しの案：問いの場面の言い方を変える。例：`adm` 問 7「今日は予定がつまっています。前に決めた自分の最低基準を、今日だけ少し下げれば出発できそうです。この基準は何のためにあり、規則や機体の制限とどう違い、いつ見直すものですか。」、`adm` 問 8「天気が悪くなってきましたが、目的地はもうすぐで、同乗者も急いでいます。ここまで飛んできたことは、続ける理由になりますか。引き返しや目的地変更を、いつ、何を見て決めますか。」。ほかの 24 字以上の問いも、場面の順序や問いかけの形を変える。`from` はそのまま。

### nit（小さな直し）

- **N1.** `hf.body`「体の感覚と計器が食い違うことで気づきます（PHAK 第 17 章）」：PHAK 第 17 章は「three streams of information … conflicting information to the brain」（感覚どうしの食い違い）と書き、「感覚と計器の食い違いで気づく」は書いていない。FAA の資料 Spatial Disorientation（SpatialD.pdf）は「a sensory conflict between what the pilot sees on the instruments and what the pilot feels」。→ 出典を「（FAA の資料 Spatial Disorientation）」にするか、PHAK の言い方「目・耳・体の知らせが食い違うと起きます（PHAK 第 17 章）」に。
- **N2.** `hf.vision`「衝突は、天気のよい日に、空港の近くや航空路の VOR の近くで多く起きています」：AIM 8-1-8 は「Airways, especially near VORs, and Class B, C, D, E surface areas are places where aircraft tend to cluster」と「most collisions occur during days when the weather is good」を分けて書く（VOR と空港の近くは「機が集まる所」）。→「機が集まりやすいのは、航空路（とくに VOR の近く）と空港の周りです。衝突の多くは、天気のよい日に起きています。」
- **N3.** `adm.error`「ヒューマンエラー … 混乱を起こし、作業を増やし、注意を奪い、安全の余裕を減らします（FAA の Risk Management Handbook）」：RMH 第 6 章は「result in a reduction in safety margins … may cause confusion and increase workload」で、「注意を奪い」はない。→「注意を奪い、」を消す。
- **N4.** `adm.risk`「リスク（risk）は、そのハザードをなくせなかったときの、将来の影響です」：RMH の用語集は「The future impact of a hazard that is not eliminated or controlled」。→「なくすことも抑えることもできなかったときの、将来の影響です」。
- **N5.** 図 `swissCheese` のキャプション「FAA の Risk Management Handbook の図 6-1 をもとにした模式図」：RMH 図 6-1 の層は TEM の守り（Anticipate・Recognize（脅威）、Prevent・Trap（エラー）、Recover・Mitigate（UAS））で、図の層の名前「設計と装備・手順とチェックリスト・自分の確かめ・教官・管制」は図 6-1 にない。本文「腕を保ち、決まった手順を毎回使うと、穴がそろいにくくなります（RMH）」の「決まった手順を毎回」も、RMH では次の段落 Discipline の話で、図 6-1 の段落は Proficiency だけ。→ キャプションに「層の名前はこの本の例」を足す。本文は「腕を保つと、穴がそろいにくくなります（FAA の Risk Management Handbook）。決まった手順を毎回使うことも、守りを厚くします。」と分ける。
- **N6.** `hf.body`「近くに山や高い障害物があれば、まずそこから離れます。」：AFH 第 18 章の出典の文のすぐ後ろにあり AFH の手順に読めるが、AFH にない（RULINGS `R.vfr-into-imc` の本の裁定）。→ 次の段落の頭へ移す：「AFH は、旋回する向きまでは決めていません。この本では、近くに山や高い障害物があれば、まずそこから離れ、来た方が確実に晴れていて地形が許すときは …」（flight.test.mjs の並びの検査（翼を水平 → 10° → 上昇と旋回 → 地形が許すとき → 180° 旋回 → 助けを求めます）はこの順のまま通る）。
- **N7.** `adm.error` の「もっと深く」の題「SHELL モデル（JCAB の学科の範囲）」：JCAB の出題範囲参考（JCAB-MAP `ppl.3.3.3.2`・`cpl.3.3.3.2`・`ir.8.3.2`）は「ヒューマンエラーの理論とモデル」で、SHELL の名前は書いていない。中身は `bk.est`（推測・要確認）で正しく札が付いている。→ 題を「SHELL モデル」にし、本文の頭に「JCAB の出題範囲の「ヒューマンエラーの理論とモデル」でよく使われるモデルです（推測・要確認）」と札の中で書く。一次資料（ICAO Doc 9683・9859）は今回も読めなかった（icao.int は 403。FAA の AMT Handbook の Human Factors の追補と AC 120-72A にも SHELL はない）。
- **N8.** `adm.review`「起こりうる場面（着陸復行など）を前もって頭の中で練習しておくと、驚きにくくなります」：CAP 737 第 7 章は勧めつつ、「any such pre-briefing should not be overly-specific … the actions rehearsed should be harmless … in the event of a different emergency」と注意する（決めつけた練習は、違う事態で見誤りを増やす）。→「…驚きにくくなります。ただし、1 つの場面に決めつけすぎず、違うことが起きても害のない手順を練習します（CAP 737 第 7 章）。」
- **N9.** `hf.altitude`「上の図の「対処できなくなるまでの時間」は …」：節の最初の図 `hypoxiaAltitudes` のあとに図 `o2Partial` と写真 `ch10-photo2` が挟まるので、「上の図」が直前の図（酸素の分圧）に読める。→「最初の図（高度と酸素）の「対処できなくなるまでの時間」は …」。
- **N10.** 図 `riskMatrix`：重大さの列「重大」（Critical）とリスクの「重い」（Serious）が字も意味も近く、初学者が取り違えやすい。→ 重大さを「壊滅的・重大・軽い・ごく小さい」に、リスクを「高い・やや高い・中・低い」にするなど、2 つの軸で同じ字を使わない（本文 `adm.risk` の 4 段階の言い方と確認問題 4 の選択肢も同じ語にそろえる。問 4 の正解「高い」は変わらない）。
- **N11.** 図 `saLevels`：①→②→③ の矢印が長さ 8 px（`A(128,114,136,114)`・`A(262,114,270,114)`）で、390 px ではほとんど見えない（PNG で確かめた）。→ 列の間を少し空けるか、矢じりだけを列の境目に重ねて描く。
- **N12.** 札 `hf.altitude#d2d8283d` の出典「PHAK 第 17 章（Ear Block、Sinus Block：the only way to prevent ... is to not fly with an upper respiratory infection）」：PHAK に「the only way」の文はない。PHAK は「Sinus block can be avoided by not flying with an upper respiratory infection or nasal allergic condition」、耳は「If experiencing minor congestion, nose drops or nasal sprays may reduce the risk … check with an AME」。本文の文（AIM 8-1-2 の「An ear block is prevented by not flying with …」）は正しい。→ 出典の引用を PHAK の実際の文に直す。
- **N13.** 札 `hf.body#112e25f3`（雲に入る前の早めの 180°、PHAK 第 17 章）の出典：PHAK のこの文は夜の飛行の準備の段落（Night Landing Illusions の後、「Prior to flying at night … many areas near water may be obscured by low lying clouds or fog」）にある。本文の使い方は趣旨として正しいが、出典に「夜の飛行の準備の段落」と場所を書く。
- **N14.** 札 `hf.body#9e862111`（ここが大切「雲の中の 180° 旋回は浅く（10° 以下）、来た方が確実に晴れて地形が許すときだけ」）：札は 参考値・出典「同上」。後半の「来た方が … ときだけ」は AFH になく本の裁定（W20 は同じ中身の `hf.body#296f3797` を 教材値＝この本の教え方 にした）。→ 札と出典を `#296f3797` とそろえる（「10° 以下は AFH 第 18 章、180° 旋回と条件は RULINGS `R.vfr-into-imc` の本の裁定」）。文は flight.test.mjs が固定しているので変えない。札 `adm.review#83c73fe3`（改正航空法・技能発揮訓練、条文）の出典にも、e-Gov の固定した版の本文に第 71 条の 5 があること（API v2 で確かめた）を足す（条番号は写しに入るまで本文に書かない今の扱いでよい）。

## 5. 主張の札 121 行の確かめ（`hfadm.claims.json`）

| 区分 | 行 | 結果 |
|---|---|---|
| W20 が書いた文（参考値・条文・教材値。例題を除く） | 103 | 一次資料と合う 98。S2 で文を直す 1（`hf.motion#d3feb0fd`）。出典か札を直す 4（`hf.altitude#d2d8283d`・`hf.body#112e25f3`・`hf.body#9e862111`・`adm.review#83c73fe3`）は文は合う |
| うち条文（14 CFR 91.17・61.53・91.211・91.25、改正航空法） | 11 | eCFR（2026-10-28 の版）と e-Gov API で全部合う。`adm.review#83c73fe3` は出典を足す（N14） |
| 例題（この本の場面） | 3 | 場面の設定（数字は仮定）。考えてみようの答えと矛盾しない |
| FL.jur が描く囲み（alcohol・medical・oxygen・lookout と e-Gov の版。うち推測・要確認 2） | 13 | 91.17(a)・91.211(a)・91.113(b)・61.23、通達 3.(1)（0.2 g/L・0.09 mg/L）、写しの第 31 条・第 70 条・第 71 条の 2 と合う（W06 の値。R1 で署名済みの項目）。推測・要確認の 2 行（通達のその後の改正・酸素の告示）は札のとおり |
| W22 の写真の説明 | 2 | `ch10-photo4` の画面は 96・85（画像で確かめた）。CDC の 2 波長の文と合う。`nightFlorida` は W22 の確認どおり |

既存の CLAIMS の行と同じ 5 行（`hf.self#f0ab73ab`・`#975525ba`・`#bc843bab`、`hf.body#340a75af`・`#9e862111`）は文も ID も同じ。`#9e862111` は N14。

署名してよい行：上の S2・N12〜N14 の 5 行を除く 116 行（統合役が CLAIMS に `op: add` で足すときに `checkedBy: factcheck-hfadm`、`checkedOn: 2026-10-30`。この単位はパッチを書いていない：11）。

## 6. 計算（全部を計算し直した）

| 場所 | 式 | 結果 |
|---|---|---|
| `hf.self` 考えてみよう | 21:00 → 06:00 | 9 時間。9 > 8（91.17）、9 < 12（AIM の 12〜24 時間）✓ |
| `hf.self` 薬 | 5 × 6 時間 | 30 時間（PHAK の例と同じ）✓ |
| 図 `o2Partial` | 標準大気 p = 1013.25 × (1 − 2.25577×10⁻⁵ h)^5.25588、h ＝ 0・3,048・5,486.4 m | 1,013.2・696.8・506.0 hPa → 図 1,013・697・506 ✓。×0.21 ＝ 212.8・146.3・106.3 → 213・146・106 ✓。506 / 1,013 ＝ 0.50（「約半分」）✓ |
| 図 `gLoad`・`hf.motion` 思い出そう | n ＝ 1 / cos φ | 0°：1.00、30°：1.155、45°：1.414、60°：2.00 → 図 1.00・1.15・1.41・2.00 ✓（棒の高さも n に比例） |
| `hf.vision` empty-field myopia | 10・30 ft × 0.3048 | 3.05・9.14 m → 「3〜9 m」✓ |
| `hf.vision` 見張り | 4〜5 秒 / 16 秒 | 0.25〜0.31 → 「1/4〜1/3」（AIM の言い方のまま）✓ |
| `hf.altitude` | 1 液量オンス | 29.57 mL → 「約 30 mL」✓ |
| `adm.risk` 上乗せの表 | RMH 図 2-9 | 雲高 +500 ft・視程 +1/2 SM（RMH は mile）・滑走路 +500 ft・風 −5 kt ✓ |

## 7. 図（新しい 10 枚は 390 px の PNG で見た。今の図 3 枚はコードを読んで照らした）

| 図 | 照らしたもの | 結果 |
|---|---|---|
| `fatigueFactors`（kiso 図 10-5 を描き直し） | 原本の図の 7 つの文字、PHAK・AIM の疲労 | 合う。条件 6 つは原本と同じ並びで言いかえ、下の 3 行は本文の要点 |
| `o2Partial`（図 10-2 を描き直し） | AIM 8-1-2 の 21%、標準大気（6 の計算） | 合う |
| `gLoad`（新） | AIM 8-1-7、1/cos | 数字は合う。キャプションの「目から先に」は S2 |
| `nightEye`（図 10-3 を描き直し） | PHAK の錐体・桿体・夜の盲点・5〜10° | 合う |
| `infoProcess`（新） | CAP 737 第 1 章 図 3 | **S1**（注意の枠が長期記憶まで囲む。自動の処理の道がない） |
| `swissCheese`（新） | RMH 図 6-1 と Proficiency の段落 | 穴の通り方（赤は 4 枚とも y 60 の穴を通り、緑は 2 枚目で止まる）は正しい。層の名前は N5 |
| `checklistFlow`（図 10-7 を描き直し） | 原本の図、AFH 第 1 章、CAP 737 第 5 章 | 合う |
| `saLevels`（図 10-8 を描き直し） | RMH の知覚・理解・予測、原本の図 | 合う。矢印の小ささは N11 |
| `riskMatrix`（新） | PHAK 図 2-5（画像で 16 マスを照らした：Probable＝High・High・Serious・Medium、Occasional＝High・Serious・Medium・Low、Remote＝Serious・Medium・Medium・Low、Improbable＝Medium・Medium・Medium・Low）、太枠＝Occasional × Catastrophic | **全部一致**。語の近さは N10 |
| `residualRisk`（図 10-10 を描き直し） | RMH の Residual risk、PHAK の「not fly or … mitigate, eliminate, or control」 | 合う（原本の表の形を流れ図に描き直した） |
| `vestibular`・`hypoxiaAltitudes`・`threePLoop`（今の図） | AIM 8-1-2（18,000 ft 20〜30 分・20,000 ft 5〜12 分）・91.211・PHAK 第 2 章 | 合う。国の書き方（米国の 14 CFR 91.211・米国の AIM 8-1-2）もある |

文字の最小 10 px・はみ出し・重なりは check-chapter の figures が 13 枚とも 0（Chromium 390 px）。

## 8. 日米の書き分け

- check-jurisdiction：error 0（14 節・終わりの文字列 160）。全節 `scope: 'common'`（DESIGN 3.3 の「範囲」の列は hf・adm とも共通）。
- 米国の規則：14 CFR 91.17・61.53・91.211 は「米国の規則（…）」と国を書いた文、91.25 は `bk.us` の中。AIM は本文で「米国の AIM」、段落の下は `bk.src('米国の AIM …')`。章末の用語の表の「AIM 8-1-x」は検査の対象外（`check-jurisdiction.mjs` は `terms` を飛ばす：決まりどおり）。
- 日本：航空法・通達・医薬品の指針・VOICES・技能発揮訓練は `bk.jp` 2 つと FL.jur の囲み（`alcohol`・`medical`・`oxygen`・`lookout`）の中だけ。条番号を本文に書いていない（第 71 条の 5 は写しにないので書かない：W20 の判断どおり）。
- CADET：`bk.jp` は消え、`hf.self` の 14 CFR 91.17・8 時間は本文に残る（cadet/test/jur.test.mjs の条件）。
- 第 7 部・まとめの章・`english` への手書きのリンクはない。

## 9. 基礎教材の書き直し（写していないか）

- 本文 14 節：kiso10 との 14 字以上の重なりは 33 か所（`adm.risk` 10・`adm.review` 7 が多い）、最長 26 字（`hf.attitude`）。どれも短い言い回しの一致で、書き直されている。
- 確認問題（`quiz`）：重なり 0〜16 字（問の書き出しだけ）。
- 説明してみよう 27 問（kiso の問から 25 問）：答えは最長 19 字で書き直されている。**問いの文**は S3（最長 48 字）。
- 図：描き直した 6 枚は原本の構成と短いラベルを使う（`fatigueFactors` の出力の箱「注意・反応・判断の余裕が小さくなる」は原本と同じ文字列）。キャプションに「パイロット基礎教材の図 10-N を描き直した模式図」とあり、判断 2 の範囲。
- 原本 `flight-lab/kiso/` は読んだだけ（`check-provenance` ok：264 ファイル）。

## 10. 検査の結果

### 10.1 章の検査（`check-chapter.mjs`、下書き 2 つ、Chromium あり）

| 検査 | error | warn | pending | info | 備考 |
|---|---|---|---|---|---|
| chapters・data・volume・jurisdiction・chapter-refs・figures（13 枚）・questions（15 問）・photos（4 枚）・jur・path・egov | 0 | 0 | 0 | 0 | |
| form | 0 | 0 | 0 | 4 | 図のない節 4（`hf.self`・`hf.attitude`・`hf.srm`・`adm.review`） |
| provenance | 0 | 0 | 0 | 1 | |
| style | 6 | 0 | 0 | 0 | W10b の部品の見出し `<b>判断の目</b>`・`<b>思い出そう</b>` を文と数える誤検出（W20 の報告 5.1 と同じ） |
| concepts | 0 | 0 | 5 | 0 | 呼び戻す節・住所がまだ本にない |
| calc | 0 | 0 | 1 | 0 | CALC.json がまだない |
| claims | 0 | 10 | 0 | 405 | 台帳にまだ行がない（`hfadm.claims.json` の 121 行と抜き出しは全部一致：5） |

### 10.2 製品のテスト（下書きは製品が読まないので、壊していないことの確かめ）

| 製品 | コマンド | 結果 |
|---|---|---|
| FLIGHT LAB | `npm run -s test:fast` | 86 / 86 pass |
| TEXTBOOK | `npm test` | 33 / 34 pass、1 fail（2 回流して同じ）：`build: FLIGHT LAB sources are not copied into textbook/` が `rewrite/combined/drafts/radio.js`（W19-radio の下書き。`flight-lab/src/radio.js` と同じ名前）を見つける。hf・adm の下書きの名前は重ならない（W20 の報告 8 の 1 と同じ） |
| CADET | `npm run -s test:fast` | 247 / 247 pass |

## 11. 台帳の行

この単位は台帳もパッチも変えていない（事実確認役は報告だけ）。署名の対象：CLAIMS の 116 行（5 の表。S2・N12〜N14 の 5 行は直してから）。ERRATA `K.human.K1`（定番の対処：過呼吸 → 100% と装置・耳 → バルサルバ・空間識失調 → 計器・CO → 暖房を切る）・`K.human.K4`（症状は 1 人では同じ → 低圧室）・`K.human.K5`（第 70 条と通達の数値：FL.jur の囲み）・`K.human.K6`（技能発揮訓練：`bk.jp`）は、W20 の直しが一次資料と合うことを確かめた（K5 の〔安全〕の署名は安全レビュー、K6 の日本の法令の署名は日本の法令レビューの持ち物）。RULINGS `R.trust-instruments`・`R.cold-sick`・`R.passenger-resource` の直しも本文と合う。`R.vfr-into-imc` は本の裁定として書かれている（AFH は向きを決めない）。

## 12. 未解決のこと

1. **SHELL モデルの一次資料**：ICAO Doc 9683・9859 は今回も読めない（icao.int 403、SKYbrary は JS の確認で止まる）。FAA の AMT Handbook の Human Factors の追補（faasafety.gov）と AC 120-72A にも SHELL はない。`bk.est` のまま（W27 か、ホストを許したあと）。
2. **雲の中の 180° 旋回**：AFH 第 18 章・PHAK 第 17 章・FAA の資料 Spatial Disorientation のどれも、雲に入ったあとの 180° 旋回を手順として書かない（PHAK は雲に入る前の早めの判断だけ）。本は「この本では … 1 つの手として」と裁定として書いており、事実の誤りではない。採るかは安全レビュー（W36）。
3. **低体温**：DESIGN 3.3 の `hf.fatigue` の「熱中症と低体温」の後半は書かれていない（W20 の報告 7 の 4。事実の誤りではない）。
4. **第 71 条の 5 の写し**：e-Gov API v2 で固定した版の本文にあることを確かめた。W37 が `sources/egov/` に写せば、`bk.jp` に条番号を書ける。

## 13. ほかの単位にお願いしたいこと（needs from others）

1. **W20（または hf・adm の改稿の単位）**：4 の S1〜S3 と N1〜N14。S2 の文を直したら `check-chapter.mjs --claims-out` で札を作り直し、`hfadm.claims.json` を更新。
2. **統合役**：登録のとき、5 の 116 行に `checkedBy: factcheck-hfadm`（`checkedOn: 2026-10-30`）。TEXTBOOK の 1 fail は `drafts/radio.js` の名前（W19-radio）で、hf・adm の登録とは関係しない。
3. **W36（安全レビュー）**：S2（正の G の前触れ）と 12 の 2（180° 旋回の裁定）を見てほしい。
4. **W37**：航空法第 71 条の 5（令和 7 年 12 月 1 日施行の版）を e-Gov の写しに足す。
5. **W27**：SHELL（12 の 1）。
