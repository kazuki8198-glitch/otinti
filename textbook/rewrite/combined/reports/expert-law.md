# 専門家の読みの報告：第 1 部 第 12 章 `law`「規則と空域（14 CFR と米国の空域）」（W19 の下書き・R2）

単位：expert-law（W19 の章 `law` の専門家の読み手）。読んだ日：2026-10-30。
立場：飛行教官（FAA の CFI・CFII・MEI）で、JCAB の学科（自家用・事業用の航空法規、計器飛行証明の計器飛行等に関する航空法規）の出題範囲も知っている読み手として読んだ。

読んだもの：
- 下書き：`textbook/rewrite/combined/drafts/law.js`（8 節・章末）、`drafts/law-figs.js`（新 3・描き直し 2）、この章が使う今の図 4 枚（`flight-lab/src/book-figs.js` の `airspace`・`vfrCloudClearance`・`vfrMinima`・`specialUseAirspace`）、`drafts/law.claims.json`
- この章に置く日米の囲みの中身（`flight-lab/src/book-jur.js` の `preflight`・`accident`・`night`・`docs`・`vmc`・`vmc.ad`・`svfr`・`row`・`msa`・`speed`・`fuel.vfr`）
- 報告：`reports/W19-law.md`・`factcheck-law.md`・`reader-law.md`。形の参考に `expert-navb.md`・`expert-wx.md`
- 台帳：`ledgers/ACS-MAP.json`（`law.*` を節に持つ 22 行と、同じ Task の行）・`JCAB-MAP.json`（航空法規の 21 行。どれも節は第 7 部で、`law.*` を持つ行はない）・`CONCEPTS.json`
- 決まり：DESIGN 3.3（第 12 章の行と、`radio*`・`solo.req`・`ops.night` の行）・3.4（`svfr`・`row`・`night`・`docs`・`accident`・`medical`）・4.1・4.2（kiso09）・5（基準 13・20・23）・6.2・7.2、DECISIONS（判断 3 と補足）、STYLE、`FL.terms`
- 比べた他の章：登録済みの `book-1.js`（`intro.cert`）・`book-3.js`（`ground.walk`・`solo.req`）・`book-4.js`（`nav.vor`・`ifr.rules`）、下書きの `drafts/radio.js`（`comm.ack`・`comm.xpdr`）・`drafts/hfadm.js`（`hf.self`）・`drafts/perfwb.js`（`perf.fuel`）・`drafts/sys.js`（`sys.lights`）・`drafts/wx.js`（`wx.info`）

**下書きは変えていない**（読み手の役目：直さない）。変えたファイルはこの報告だけ。台帳のパッチも書いていない（提案は 10・12 に書いた）。

## 1. 結論

教官の目で見て、規則を「覚える」より「当てはめて確かめる」章になっていて、授業でそのまま使える所が多い。特に次の 5 つは残してほしい。
- `law.basis` の「資料の格」の表と「管制承認は規則から外れてよい許可ではない」、考えてみようの「unable と伝える」（JO 7110.65 7-9-2 の NOTE「VFR の操縦士は、従うと規則に反するなら管制に伝えることが前提」と同じ考え）
- 図 `lawCurrency` の「暦月は月の終わりまで延びる・日は延びない」と、計算演習・確認問題 7（フライトレビューの暦月）の組み合わせ
- ここを混同しない「規則の 3 つの夜」（14 CFR 1.1・61.57(b)・91.209）。米国の口述試験で最もよく取り違える所を、表 1 つで片づけている
- 図 `vfrTwoViews`（雲から言うか機体から言うかで上下が入れかわる）。日本の施行規則第 5 条の「上方 150 m」を米国の「雲の下 500 ft」に結び付けられる。JCAB の航空法規と FAA の学科を両方受ける訓練生に、いちばん効く図
- 学生操縦士の制限（61.89）・NTSB への報告（49 CFR 830）・最近の飛行経験（61.57）を `law.pilot` にまとめたこと（ACS の PA.I.A・PA.III.A.K8 の住所ができた）

数字の正しさは事実確認役が確かめていて、私も今日 eCFR と AIM で読み直して、書いてある数字に誤りを見つけなかった。私が足すのは、**ACS の知識の項目が台帳では「mapped」なのに本文にない所・規則の手順の書き落とし・1 つの概念が 2 か所で教えられていること・安全の言い方**です。

数：**must 0・should 14・nit 12**（3 の表。事実確認役・初学者の読み手と同じ指摘は 6 に対応を書き、ここでは別の理由を足したもの・重さを上げたものだけを数えた）。

- **should の主なもの**
  - **ACS の PA.I.B（耐空性の決まり）が半分しか本文にない**（S1）：登録証明の期限（7 年：14 CFR 47.40）・耐空証明の有効期間（21.181）・標準と特別の耐空証明（PA.I.B.K4）・特別飛行許可（21.197：PA.I.B.K1d）・持ち主と運航者の責任（91.403(a)：K1e）・操縦士がしてよい予防整備（43.3(g)：K2）・AD と SAIB の違い（K1c）・KOEL（K3c）。ACS-MAP はどれも `law.aircraft` で「mapped」になっていて、基準 13 が満たされたように見える。
  - **91.213(d) の「飛べない装備」の列に AD がない**（S2）：本文は「型式証明の昼の VFR の装備・機体の装備の一覧・91.205 などで要るものなら、飛べません」。91.213(d)(2)(iv)「耐空性改善通報（AD）で動くことが求められている装備」が落ちていて、KOEL も名前がない。
  - **年次点検は 100 時間点検の代わりにもなる**（S3）：91.409(b) は「annual or 100-hour inspection」。表と考えてみようの答え「年次点検の期限内でも、100 時間を超えていれば飛ばせません」は、年次点検で 100 時間の数え直しが始まることを書かないので、取り違えを生む。
  - **夜の VFR の装備（91.205(c)）がこの本のどこにもない**（S4）：ACS PA.I.B.K3 は「昼と夜の VFR の装備」。
  - **迎撃**（S5）：合図（翼を振る＝「ついて来い」、こちらも翼を振ってついて行く）・管制の指示と食い違ったら迎撃機に従って確かめる・121.5 MHz を聞いておく、が足りない（AIM 5-6-13・5-6-14）。
  - **「そのほかの空域」**（S6）：ACS PA.I.E.K3 の SFRA と、フロリダの訓練で実際に会う ADIZ（海へ出る・バハマへ飛ぶ：14 CFR 99・AIM 5-6-4）・軍の訓練経路（MTR）・国家安全区域（NSA）・パラシュート降下の区域がない。
  - **飲酒と薬の規則のうち 61.15（飲酒運転などの処分の 60 日以内の報告）が本のどこにもない**（S7）：ACS PA.I.H.K2 は `law.pilot` を節に挙げるが、本文は `hf.self` へのリンクだけ。
  - **特別有視界が 2 つの節に割れている**（S8）：本文は `law.vfr`、日米の囲みと ACS の対応（PA.I.E.K4）は `law.special`。
  - **1 つの概念が 2 か所**：Class C・D に入る前の「交信の確立」（`law.airspace` と `comm.ack` が同じ例・同じ問い。S9）、学生操縦士の制限 61.89（`law.pilot` と `solo.req`。しかも `solo.req` のリンクは、制限がなくなった `law.rules` を指したまま。S10）。
  - **JCAB の用語**：進路権の順の「グライダー」は、航空法の正式名が「滑空機」（判断 3。囲み `row` は「滑空機」。S11）。
  - **〔安全〕記述問題 10（翼端をこすった）**：答えが「事故に当たりません」で終わり、「整備士が点検して飛べると判断するまで飛ばさない」（91.7）がない（S12）。
  - **節の `faa` と ACS-MAP の行が中身と合わない**（S13）、**61.57(c) の「IFR か、VFR の最低気象条件より悪い天気で」**（S14）。

## 2. 確かめた一次資料（2026-10-30）

どれも今日、元の URL から取り寄せて本文を読んだ（写しは scratchpad。製品とリポジトリには入れていない）。

- **eCFR versioner API（Title 14、2026-10-28 の版）**：
  - 21.181（標準の耐空証明は、米国に登録され、Part 43・91 どおりに整備・予防整備・改造をしている限り有効。特別飛行許可は許可に書いた期間）
  - 21.197（特別飛行許可：整備の場所へ運ぶ・引き渡し・危険の迫る所からの避難など。「may not currently meet applicable airworthiness requirements but is capable of safe flight」）
  - 43.3(g)（スポーツ操縦士を除く Part 61 の資格を持つ人は、自分が持つか運航する、Part 121・129・135 で使わない航空機の予防整備をしてよい）
  - 47.40(a)（登録証明は、出た月の最後の日から 7 年で切れる）
  - 61.15(e)（飲酒運転などの motor vehicle action は 60 日以内に FAA へ書面で報告）
  - 61.19(c)(1)（2016-04-01 より後に出た学生操縦士の証明を含め、資格の証明には期限がない：下書きの文と合う）
  - 61.57(c)（「under IFR or weather conditions less than the minimums prescribed for VFR」）
  - 61.87(n)（単独飛行の裏書きは「specific make and model」、訓練をした教官が飛ぶ日の前 90 日以内）
  - 61.95(a)（Class B の単独飛行は、その Class B の区域での学科と飛行の訓練、90 日以内の裏書き）
  - 91.13(a)（careless or reckless operation の禁止）
  - 91.113（2025-07-24 の Amdt. 91-381 の後の文。種類の順は (d)(1)〜(4)）
  - 91.155(c)(d)（(d)(2)：地上視程が報告されない空港では飛行視程 3 SM）
  - 91.157（(a) は付録 D の Section 3 を除く、(b)(4) 夜は Part 61 の計器飛行の要件と 91.205(d) の装備）
  - 91.205(c)（夜の VFR：(b) の装備・位置灯・衝突防止灯・有償なら着陸灯・十分な電源・飛行中に手の届く予備のヒューズ）
  - 91.213（(d)(1) MMEL のない機体か小型の非タービン機、(d)(2)(i)〜(iv)：型式証明の昼の VFR の装備・装備の一覧か KOEL・91.205 などの規則・AD、(d)(3) 外して表示し記録するか、動かないようにして「Inoperative」の札、(d)(3)(ii) 資格のある操縦士か整備士の判断）
  - 91.403(a)（持ち主か運航者が、耐空の状態を保つことに第一の責任。Part 39（AD）を守ることを含む）
  - 91.409(a)(b)（(b)「annual or 100-hour inspection」、10 時間の例外、「flight instruction for hire in an aircraft which that person provides」）
  - 91.417(a)(2)(v)（AD の状態の記録）
  - 91.703(a)(1)〜(3)（外国ではその国の決まりに従い、それと食い違わない限り Part 91 も守る）
  - Part 91 付録 D（Section 1 にオーランド国際空港がある。Section 3（固定翼の特別有視界の禁止）と Section 4（単独の学生の禁止）にはない：下書きの「オーランド国際空港のまわりも、この範囲です」と合い、ほかの制限もない）
  - 99.7（ADIZ と Defense Area での特別保安指示）
- **FAA AIM（HTML、faa.gov）**：3-2-3（Class B は天気にかかわらず管制承認が要る）・3-2-5 と 3-2-6 の NOTE（管制塔が時間運用の Class D・C の地表区域は、ほかの時間 Class E か G。Chart Supplement に「other times Class E／G」）・3-4-2（Prohibited は飛行が禁止。安全などのため）・3-4-3（Restricted は全面禁止ではないが制限。見えない危険）・3-4-7（CFA）・3-4-8（NSA は自主的に避ける。99.7 で一時的に禁止することがある）・3-5 の見出し（3-5-2 MTR・3-5-4 パラシュート降下・3-5-6 TRSA・3-5-7 SATR と SFRA）・4-1-18 の NOTE（レーダーがなくても Class B の管制承認・Class C の交信の要件はなくならない）・5-6-4（ADIZ：外へ出る VFR は ATC か FSS からの個別のコード。1200 は使えない）・5-6-5（米国の領空へ出入りする機は飛行計画・高度つきのトランスポンダー・交信）・5-6-13 の Summary of Intercepted Aircraft Actions（迎撃機の指示に従う／121.5 か 243.0 MHz で「identity, position, and nature of the flight」／7700（管制の別の指示がなければ）／NOTE：ほかの機関の指示が迎撃機と食い違ったらすぐ確かめ、放されるまで迎撃機に従う）・5-6-14 TBL 5-6-1（昼は翼を振ってから左へゆっくり旋回＝「You have been intercepted. Follow me.」、応答は翼を振ってついて行く＝「Understood, will comply.」）
- **FAA JO 7110.65** 7-9-2（PHRASEOLOGY「CLEARED THROUGH/TO ENTER/OUT OF BRAVO AIRSPACE」「REMAIN OUTSIDE BRAVO AIRSPACE」、NOTE：VFR の操縦士は従うと CFR に反するなら管制に伝える）
- **FAA ACS**：自家用 6C・計器 8C（`ledgers/src/sources/acs/` の写しを、ACS-MAP の行の `text`・`sub` で読んだ）

## 3. 問題の一覧

重さ：must＝直すまで登録しない、should＝登録の前に直すことを勧める、nit＝小さな直し。「〔書き手が確かめる〕」は、私が今日一次資料を読んでいないので、書き手が確かめてから書く所。

### should（14）

**S1. `law.aircraft`：ACS PA.I.B の知識の項目の半分が本文にない（台帳は「mapped」）**
- 本文にあるもの：耐空証明の掲示・登録証明を機内に（91.203）、POH と限界（91.9）、昼の VFR の装備（91.205(b)）、91.213(d)、点検の期限、「AD に従っているかも確かめます」の 1 文。
- ないもの（ACS 6C の `sub` ごと）：
  - K1a「必要な書類の場所と**期限**」：登録証明は 7 年で切れる（47.40(a)）、耐空証明は登録され整備を続ける限り有効（21.181(a)(1)）。口述でいちばんよく聞かれる対の質問がない。
  - K1c「AD と **SAIB**」：AD は守る義務がある（91.403(a) が Part 39 を名指し）、SAIB は情報（この本の `sys.elec` は SAIB CE-10-11 を引くのに、SAIB が AD と違って義務でないことはどこにもない）。AD の状態は整備記録にある（91.417(a)(2)(v)）。
  - K1d「**特別飛行許可**（special flight permit）の目的と取り方」：21.197。
  - K1e「**持ち主・運航者**と機長の責任」：91.403(a)（耐空の状態を保つ第一の責任は持ち主か運航者）と 91.7（飛べる状態かを決めるのは機長）の分け方。
  - K2「**操縦士がしてよい予防整備**」：43.3(g)。項目の一覧は Part 43 の付録 A〔書き手が確かめる〕。記録は 43.9〔書き手が確かめる〕。
  - K3c「**KOEL**（Kinds of Operations Equipment List）」：91.213(d)(2)(ii) が名指しする。Archer の POH に KOEL があるか〔書き手が POH で確かめる〕。
  - K4「**標準と特別の耐空証明**とその運用の限界」：21.181 の区分（標準・特別（実用類以外の類・実験・軽スポーツ・特別飛行許可））〔分類の書き方は書き手が 21.175 で確かめる〕。
- 直しの案：「点検の期限」の表の前に、表「機体の書類：何が・どこに・いつまで」（耐空証明｜入口に掲示｜登録と整備が続く限り有効（21.181）／登録証明｜機内｜7 年（47.40）／特別飛行許可｜機内｜許可に書いた期間（21.181(a)(2)））と、表「誰が何をするか」（持ち主・運航者：耐空の状態を保ち AD を守る（91.403）／機長：飛べる状態かを決める（91.7）／操縦士：予防整備ができる（43.3(g)）。整備士：それ以外）を置く。AD と SAIB は 1 行ずつ。ACS-MAP の PA.I.B.K1・K2・K3・K4 は、直すまで `status: open`・`missing: ["law.aircraft"]` にする（12 の W42）。

**S2. `law.aircraft`「動かない装備があるとき」：91.213(d)(2) の列に AD がなく、KOEL の名前もない**
- 今の文：「型式証明の昼の VFR の装備・機体の装備の一覧・91.205 などで要るものなら、飛べません。」
- 一次資料：91.213(d)(2) は (i) 型式証明の昼の VFR の装備、(ii) 機体の装備の一覧か、その飛び方の **KOEL** で要るもの、(iii) 91.205 かほかの Part 91 の規則で要るもの、(iv) **AD で動くことが求められているもの**、の 4 つ。
- なぜ大事か：この段落は、手順として読ませる書き方（「まず…」「そして…」「そのうえで…」）。「など」は (iii) の「ほかの規則」に当たり、(iv) の AD は入らない。AD が求める装備を「要らない」と判断して札を付けて飛ぶ読み方ができてしまう。
- 直しの案：「次のどれかで要る装備なら、飛べません：① 型式証明の昼の VFR の装備、② 機体の装備の一覧か、その飛び方の KOEL（Kinds of Operations Equipment List）で要るもの、③ 91.205 などの規則で要るもの、④ AD で動くことが求められているもの（91.213(d)(2)）。」。札の行を作り直す。

**S3. `law.aircraft`：年次点検で 100 時間の数え直しが始まることがない。「自分が用意した機体」**
- 今の文：表「100 時間点検｜有償で人を乗せる・自分が用意した機体で有償の飛行訓練をするときは 100 時間ごと」、考えてみようの答え「年次点検の期限内でも、100 時間を超えていれば飛ばせません。」
- 一次資料：91.409(b)「…unless within the preceding 100 hours of time in service the aircraft has received an **annual or 100-hour inspection**…」「no person may give flight instruction for hire in an aircraft **which that person provides**」。
- なぜ大事か：答えの文は、年次点検と 100 時間点検を別々に数えると読める。FAA の学科の典型の問い（「年次点検から 90 時間。有償の訓練に使えるか」→ 使える）を取り違える。考えてみようの設定（年次点検 10 か月前・100 時間点検から 104 時間）では、年次点検はそれより前なので答え「いけません」は正しい。理由の書き方だけを直す。
- 直しの案：表の行を「操縦教員や学校が用意した機体で有償の飛行訓練をするとき、有償で人を乗せるとき：最後の年次点検か 100 時間点検から 100 時間以内（91.409(b)）」に。答えを「…年次点検も 100 時間点検の代わりになりますが、年次点検は 100 時間点検より前に済んでいるので、どちらからも 100 時間を超えています（91.409(b)）。」に（初学者の読み手の AC1 と同じ所。私の理由は ACS と学科の典型の問い）。

**S4. 夜の VFR の装備（91.205(c)）がこの本のどこにもない**
- 今の文：「夜や IFR では、さらに多くの装備が必要です。」（`law.aircraft`）。`law.pilot` の 3 つの夜の表も「夜の VFR の装備（91.205(c)）など」と名前だけ。
- 一次資料：91.205(c)：(b) の装備に加えて、位置灯・衝突防止灯・有償なら着陸灯 1 つ・十分な電源・飛行中に手の届く予備のヒューズ（1 組か各種 3 本）。
- ACS PA.I.B.K3 は「Equipment requirements for **day and night** VFR flight」で、ACS-MAP は `law.aircraft`・`ground.walk`。`ground.walk` にもなく、DESIGN 3.3 の `ops.night`（W29）の行にも装備は書いていない。
- 直しの案：`law.aircraft` の「装備」に 1 文と小さな表（昼・夜）。夜の定義は `law.pilot` の 3 つの夜の表へリンク。

**S5. `law.special`「迎撃されたら」：合図と、食い違う指示のときがない（ACS PA.I.D.K6）**
- 今の文：迎撃機の合図と指示に従う／121.5 MHz で呼び「自分の名前・位置・飛行の目的」／7700。
- 一次資料：AIM 5-6-13 の Summary（上の 2）と TBL 5-6-1。迎撃機は昼、前の少し上（ふつう左）で翼を振り、左へゆっくり旋回する＝「ついて来い」。迎撃された機は翼を振ってついて行く＝「了解、従う」。急に上昇して離れる＝「行ってよい」。NOTE：ほかの機関の指示が迎撃機の指示と食い違ったら、すぐに確かめ、放されるまで迎撃機の合図と指示に従う。AIM 5-6-13 は 121.5（243.0）MHz を聞いておくことを強く勧める。
- 直しの案：「自分の名前」は事実確認役の S2 のとおり「機体の識別（コールサイン）」に。合図の小さな表（迎撃機がすること・意味・こちらがすること）を 2 行。「管制の指示と食い違ったら、迎撃機に従い、すぐ確かめます（AIM 5-6-13）」。「飛ぶ間は、できれば 121.5 MHz も聞いておきます」。〔安全〕の文なので W27・W36 の安全レビューにも回す。

**S6. `law.special`：ACS PA.I.E.K3 の「SFRA と、そのほかの空域」がない。フロリダの ADIZ**
- 今の表：Prohibited・Restricted・Warning・MOA・Alert・TFR。
- ACS PA.I.E.K3「Special use airspace (SUA), **special flight rules areas (SFRA)**, temporary flight restrictions (TFR), and **other airspace areas**」。AIM 3-4-7（CFA）・3-4-8（NSA）・3-5-2（MTR）・3-5-4（パラシュート降下）・3-5-6（TRSA）・3-5-7（SATR と SFRA）・5-6-4（ADIZ）。
- 教官として：フロリダの東海岸の訓練では、**ADIZ** は避けて通れない（海へ出る・バハマへ飛ぶ機は飛行計画と、ATC か FSS から受けた個別のコード。1200 は使えない：AIM 5-6-4。米国の領空へ出入りするときは飛行計画・高度つきのトランスポンダー・交信：5-6-5）。下書きは同じ章で「フロリダからバハマへの飛行も、外国への飛行です」と書くのに、ADIZ がない。低い所を飛ぶ訓練機には **MTR** も大事（軍機が 250 kt を超えて低く飛ぶ経路）〔速さと高さは書き手が AIM 3-5-2 で確かめる〕。
- 直しの案：表に 4 行（NSA：自主的に避ける／MTR：軍機が速く低く飛ぶ経路。チャートで見る／SFRA：特別な飛び方の決まりのある区域（例：ワシントン DC のまわり）／ADIZ：防空識別圏。出入りは飛行計画・個別のコード・交信（14 CFR 99・AIM 5-6-4））と、パラシュート降下の区域を 1 文。CFA はチャートに描かれないので 1 文か省く。図 `specialUseAirspace` の凡例は W21。

**S7. ACS PA.I.H.K2「飲酒と薬の規則」：61.15 がこの本のどこにもない**
- ACS-MAP の PA.I.H.K2 は節を `hf.self`・`law.pilot` とし、`missing: ["law.pilot"]`。下書きの `law.pilot` は「体調・薬・飲酒で飛べないときの決まりは、hf.self で学びます」のリンクだけで、`law.pilot` の `faa` には PA.I.H.K2 を入れている。`hf.self`（`drafts/hfadm.js`）は 91.17 と 61.53 を教えるが、61.15 はない（本の全部を検索して 0）。
- 一次資料：61.15(e)：飲酒・薬物による運転の有罪や免許の停止などの motor vehicle action は、60 日以内に FAA へ書面で報告。(d)：3 年以内に 2 回なら資格の拒否・停止・取消の理由。
- 直しの案：`law.pilot` の「持つもの・見せるもの・記録するもの」に 1 項目「飲酒や薬物の運転で処分を受けたら、60 日以内に FAA へ書面で報告します（61.15(e)）」。住所を `hf.self` にするなら、`law.pilot` の `faa` から PA.I.H.K2 を外す（S13）。

**S8. 特別有視界が 2 つの節に割れている（本文 `law.vfr`、囲みと ACS の対応 `law.special`）**
- 本文（91.157 の条件・時間・資格）は `law.vfr`。`bk.jur('svfr')` は `law.special`。`law.special` の `faa` に PA.I.E.K4（Special VFR requirements）があり、ACS-MAP の PA.I.E.K4 も `law.special`。`law.special` の本文に特別有視界は 1 文もない。
- 教官として：特別有視界は「VFR の最低気象条件の例外」で、`law.vfr` の 91.155(c)(d) と 1 組で教えるもの。初学者の読み手（SP2）は「特別な空域の決まりだと思いかけた」と書いた。ACS の対応も中身のない節を指している。
- 直しの案：囲みを `law.vfr` へ（`bk.jur('vmc', 'vmc.ad', 'svfr')`）、`faa` の PA.I.E.K4 を `law.vfr` へ。`FL.jur` の `svfr.boxes`（W06）・DESIGN 3.3 の章 12 の範囲の列と 3.4 の `svfr` の行（統合役）・ACS-MAP の PA.I.E.K4（W42）を同じコミットで。`flight-lab/test/jur.test.mjs` の ① は `boxes` から作るので、`boxes` を直せば通る。

**S9. 1 つの概念が 2 か所：Class C・D に入る前の「交信の確立」（`law.airspace` と `comm.ack`）**
- `law.airspace`：「交信の確立」とはの小見出し・「（自分のコールサイン）, standby」で確立・「Aircraft calling, standby」では確立しない・remain outside・考えてみよう（「Aircraft calling LAB Approach, standby」）・章末の例 1。
- `comm.ack`（`drafts/radio.js`）：同じ 3 つの応答の表（同じ「Aircraft calling LAB Approach, stand by」）・ここが大切・確認問題（`radio3` の問）。
- 同じ部の 3 章あとで、同じ例・同じ判断を完全に 2 回教える（DESIGN 3.2「完全な説明は 1 か所だけ」）。CONCEPTS にない行。
- 直しの案：住所を `law.airspace` にする（AIM 3-2-4 は空域の段落で、規則 91.129(c)・91.130 と一緒に教えられる）。`comm.ack` は「思い出そう」（3 行以内：「コールサインつきの応答で確立。remain outside なら外で待つ」）と `bk.see('law.airspace', …)` にして、言い方の練習（呼び出しの型）だけを残す。CONCEPTS に `C.two-way-comms`（住所 `law.airspace`・呼び戻し `comm.ack`）。つづり（standby と stand by）もそろえる（初学者の読み手の C11）。逆に `comm.ack` を住所にするなら、`law.airspace` の考えてみようと例を外す。

**S10. 1 つの概念が 2 か所＋行き先の古いリンク：学生操縦士の制限（`law.pilot` と `solo.req`）**
- `law.pilot` が 61.89 の全部を箇条で持つ（`law.rules` から移した）。登録済みの `solo.req`（`book-3.js`）も 61.89 の全部を 1 段落で書き、`${bk.see('law.rules', '学生操縦士の制限')}` とリンクする。この下書きを登録すると、`law.rules` には制限がなく（「law.pilot にまとめました」の 1 文だけ）、リンクの札と行き先が合わない（基準 20 の考え方）。
- 用語も：`law.pilot`「単独飛行の裏書きは、**機種**ごとに」、`solo.req`「承認は**型式**ごと」。61.87(n) は「specific make and model」。日本の「型式」は型式証明・型式の限定の語なので、取り違えやすい。
- 直しの案：住所 `law.pilot`。`solo.req` の段落を「思い出そう」（視程 昼 3 SM・夜 5 SM、人を乗せない、の 2 点）と `bk.see('law.pilot', '学生操縦士の制限')` に（W28）。「make and model」の訳語を W04 が決め、2 節をそろえる。CONCEPTS に `C.student-limitations`（住所 `law.pilot`・呼び戻し `solo.req`）。

**S11. 進路権の順の「グライダー」：航空法の正式名は「滑空機」（判断 3）**
- 本文 `law.rules`・図 `rightOfWay`・確認問題 5 は「グライダー」、同じ節の囲み `row`（日米どちらの欄も）は「滑空機」。JCAB の航空法規の進路権の問いは「滑空機」で出る（施行規則第 180 条）。`FL.terms` に行がない。
- 直しの案：W04 が `FL.terms` に「滑空機（グライダー、glider）」を足し、`law.rules` の初出を「滑空機（グライダー、glider）」に、図と問の語をそろえる（初学者の読み手の C7 は nit。判断 3 が決まりなので should に上げた）。

**S12. 〔安全〕記述問題 10（翼端をこすった）の答えに「飛ばさない」がない**
- 今の答え：「まず操縦教員と学校に知らせ、学校の手順で記録します。翼端だけの損傷は、49 CFR 830.2 の『大きな損傷』に入らないので、それだけでは事故に当たりません。…」
- 教官として：830.2 の読みは正しい。でも、この問いで訓練生に残すべきいちばん大事なことは「その機体は、整備士が点検して飛べると判断するまで飛ばさない」（飛べる状態かを決めるのは機長：91.7。不具合の記録：本文の `law.aircraft`）。「事故に当たりません」で終わると、「たいしたことはない」と読める。
- 直しの案：答えの 2 文目に「その機体は、整備士が点検して飛べると判断するまで飛ばしません（91.7）。」を入れ、事故の定義はそのあとに。〔安全〕の文なので W27 の安全レビューにも回す。

**S13. 節の `faa` と ACS-MAP の行が、本文の中身と合わない（基準 13 の数え方を狂わせる）**
- `law.pic` の `faa` に PA.I.A.K4（資格の行使に要る書類）がある：書類は `law.pilot` へ移したので、`law.pic` にはもうない。
- `law.special` の `faa` に PA.I.E.K4（特別有視界）：本文がない（S8）。
- `law.pilot` の `faa` に PA.I.H.K2：本文がない（S7）。PA.I.A.K3（身体検査証明の種類と期限）は本文にあるのに `faa` にない（事実確認役の N14）。
- `law.aircraft` の `faa` に PA.I.B.K1〜K4：半分しかない（S1・S4）。
- 直しの案：`faa` を本文に合わせる（`law.pic`：PA.I.A.K4 を外す、`law.pilot`：PA.I.A.K3 を足す）。ACS-MAP の行は 4 の表のとおりに（W42）。

**S14. `law.pilot` の最近の飛行経験の表「IFR で機長をする」：61.57(c) は「IFR か、VFR の最低気象条件より悪い天気で」**
- 一次資料：61.57(c)「a person may act as pilot in command **under IFR or weather conditions less than the minimums prescribed for VFR** only if…」。
- 「IFR で」だけだと、計器の最近の経験は「IFR の飛行計画で飛ぶときだけ」と読める。計器飛行証明を持つ人が、経験を切らしたまま特別有視界の夜（91.157(b)(4)(i) が「Part 61 の計器飛行の要件」を求める）で飛べると考える取り違えにつながる。
- 直しの案：表の「したいこと」を「IFR か、VFR の最低気象条件より悪い天気で機長をする」に（第 4 部で詳しく、の予告は要らない：61.57(c) の行の中で完結する）。

### nit（12）

- **N1.** `law.pic`「操縦教員と一緒に飛ぶ訓練では、ふつう操縦教員が機長です（学校の決まりで確かめます）」：学生操縦士の訓練では操縦教員が機長（学生操縦士は人を乗せて機長になれない：61.89(a)(1)）。「ふつう」が要るのは、資格を持つ人の訓練（例：計器飛行証明の訓練）だけ。→「学生操縦士のときは操縦教員が機長です。資格を持ってからの訓練では、どちらが機長かを飛ぶ前に決めます。」〔61.89(a)(1) との結び付けは書き手が FAA の解釈で確かめる〕
- **N2.** `law.airspace` の Class B の行「学生がひとりで入るには、操縦教員の訓練と裏書きが要る（61.95）」：61.95(a) は「その Class B の区域で」の訓練と、**90 日以内**の裏書き。→「…その Class B の区域での訓練と、90 日以内の裏書きが要る（61.95）」。
- **N3.** `law.airspace`・`law.rules`：管制塔が時間運用の Class D は、ほかの時間は Class E か G になる（AIM 3-2-5・3-2-6 の NOTE。Chart Supplement に「other times Class E／G」）。夜の訓練や早朝の出発で必ず出会う。→ Class D の行に 1 句。`law.rules` の「Class D の空港では…管制塔の許可が要ります（91.129(i)）」は、91.129(i) が「管制塔が運用中の空港」の決まりなので「管制塔が運用中の空港では」に。
- **N4.** `law.basis`「米国で登録した機体でも、外国ではその国の決まりに従います（91.703(a)(2)）」：91.703(a)(3) は、その国の決まりと食い違わない限り Part 91 も守る、と続く。バハマへの飛行で問いになる所。→「…その国の決まりに従い、それと食い違わない限り米国の Part 91 も守ります（91.703(a)）」。
- **N5.** `law.basis`「AIM の手順を軽く見てよいわけではありません」：理由の規則を 1 つ添えると強くなる：91.13(a)（ほかの人の命や財産を危険にする careless or reckless な運航の禁止）。→ 例の文のあとに 1 文。
- **N6.** `law.pilot` の 3 つの夜の表：14 CFR 1.1 の夜の「使う所」に「資格に数える夜の飛行時間・夜の着陸」を足すと、訓練生が自分のログブックで使う場面が見える〔61.109 などの夜の要件が 1.1 の夜で数えることは、書き手が確かめる〕。
- **N7.** 確認問題 9「運航者が**最初に**することは？」：事故の直後に最初にするのは、けが人を助け、危険から離れること（830.10 も、けが人を助けるときは残骸を動かしてよいとする）。→「規則で決まっている最初の報告は？」。選択肢と正解はそのまま（決まり 4）。
- **N8.** `law.basis` の `bk.jp`：日本の層に、政令の航空法施行令と、AC に当たる通達（サーキュラー）を足すと、米国の表（規則・指針）と並ぶ。JCAB の航空法規は法令の体系から問う（出題範囲参考の「総則」）。〔施行令の名前と位置づけは書き手が e-Gov で確かめる。住所は第 7 部の `jlaw.system` なので 1 文でよい〕
- **N9.** `law.vfr`「この条件を満たさないときも、管制承認を受ければ、特別有視界飛行方式で飛べます」：事実確認役の N5（地表区域の中だけ・付録 D の Section 3 の空港を除く）に加え、教官として「合法でも、雲に入りやすく危険が大きい。学生の単独飛行で使うかは学校の決まりと操縦教員に従う」を、札「この本の判断」で 1 文ほしい。
- **N10.** `law.rules` の燃料の段落：計算と「予備に手をつけない」は `perf.fuel`（`drafts/perfwb.js`。この章より 4 章前）に完全な説明がある。ここは思い出そう（91.151 の 1 文）とリンクで足りる。ここが大切の決め打ちの文（`flight.test.mjs` 464 行）はそのまま残す。
- **N11.** CONCEPTS に `C.night-definitions`（夜の 3 つの定義。住所 `law.pilot`・呼び戻し `sys.lights`・`ops.night`・`perf.fuel`）を足すと、W29 の `ops.night` が同じ表を作り直さない。`sys.lights`（`drafts/sys.js`）は今 91.209 の「日没から日の出まで」を 1 文で書いていて、それでよい。
- **N12.** `law.aircraft`：IFR の耐空性（ACS IR.II.C.K2）は、この節の 91.411・91.413 と、`nav.vor` の 91.171 にある。91.205(d)（IFR の装備）はどこにもない（`ifr.rules` も引いていない）。`law.aircraft` で「IFR の装備と点検は第 4 部で」と予告するか、ACS-MAP の IR.II.C.K2 の節に `nav.vor` を足し、91.205(d) の住所を W30 と決める。

## 4. ACS・JCAB の見出しごとの確かめ（ACS-MAP で節に `law.*` がある 22 行と、同じ Task の関係する行）

| ACS | 台帳の節・状態 | 本文の確かめ | 提案 |
|---|---|---|---|
| PA.I.A.K1 資格の要件・最近の経験・記録 | law.pilot・intro.cert／open（missing law.pilot） | 61.51・61.56・61.57 は `law.pilot`、資格の要件は `intro.cert` | mapped にしてよい（W42 が深さを確かめる） |
| PA.I.A.K2 特権と制限 | intro.cert・law.pilot／open | 学生の制限 61.89 は `law.pilot`、自家用の特権と頭割り 61.113 は `intro.cert` | mapped にしてよい |
| PA.I.A.K3 身体検査証明の種類・期限 | hf.self・intro.cert／mapped | 期限の表は `law.pilot` | 節に `law.pilot` を足す（S13） |
| PA.I.A.K4 資格の行使に要る書類 | law.pic・law.pilot／open | 61.3 は `law.pilot`。`law.pic` にはない | `law.pic` を外す（S13） |
| PA.I.B.K1 耐空性の決まり a〜e | law.aircraft／mapped | a の期限・c の SAIB・d・e がない | open（S1） |
| PA.I.B.K2 予防整備 | law.aircraft／mapped | ない | open（S1） |
| PA.I.B.K3 昼と夜の VFR の装備 a〜d | law.aircraft・ground.walk／mapped | 昼だけ。91.213(d) に AD がない。KOEL がない | open（S1・S2・S4） |
| PA.I.B.K4 標準と特別の耐空証明 | law.aircraft／mapped | ない | open（S1） |
| PA.I.D.K1 経路の計画と空域 | nav.plan・nav.chart・law.airspace／mapped | 合う | — |
| PA.I.D.K2 高度の選び方 | nav.log・nav.plan・law.rules・emg.glide／mapped | `law.rules` は 91.119。巡航高度 91.159 は `nav.log` | — |
| PA.I.D.K6 迎撃 | law.special／mapped | 合図・食い違う指示がない | open（S5） |
| PA.I.E.K1 空域の種類 | law.airspace・law.vfr／mapped | 合う（N2・N3 は nit） | — |
| PA.I.E.K3 SUA・SFRA・TFR・そのほか | law.special／mapped | SFRA・NSA・MTR・ADIZ などがない | open（S6） |
| PA.I.E.K4 特別有視界 | law.special／mapped | 本文は `law.vfr` | 節を `law.vfr` に（S8） |
| PA.I.H.K2 飲酒と薬の規則 | hf.self・law.pilot／open | 91.17・61.53 は `hf.self`、61.15 はどこにもない | open のまま（S7） |
| PA.III.A.K8 NTSB への報告 | law.pilot／open | 830.2・830.5・830.10・830.15 | mapped にしてよい |
| PA.III.B.K3 進路権 | law.rules／mapped | 合う（S11 は語） | — |
| PA.VI.C.K2 飛行計画・管制の指示から外れる場面 | nav.divert・law.pic／mapped | 91.3・91.123(c)(d) | — |
| PA.XII.A.K2 不具合の記録 | ground.after・law.aircraft／open | `law.aircraft` は 1 文（学校の手順） | `ground.after`（W28）を待つ |
| IR.II.C.K2 IFR の耐空性 | ifr.rules・law.aircraft／mapped | 91.411・91.413 は `law.aircraft`、91.171 は `nav.vor`、91.205(d) はない | 節に `nav.vor`、91.205(d) の住所（N12） |
| IR.II.C.K3 動かない装備 | law.aircraft・ifr.rules／mapped | 91.213 に AD がない | S2 を直してから mapped |
| IR.III.A.K2 機長の緊急の権限 | law.pic・ifr.rules／mapped | 91.3(b)(c)・91.123(c) | — |

**JCAB**：JCAB-MAP の航空法規の 21 行（`ppl.5.*`・`cpl.5.*`・`ir.6.*`）は、どれも節が第 7 部（`jlaw.*`・`jair.*`・`jifr.rules`）で、`law.*` を持つ行はない（DESIGN 3.3 の扉「規則の節は Sanford で飛ぶための米国の規則」のとおり）。この章で JCAB の学科に響くのは、用語（S11：滑空機、判断 3）と、日米で同じ名前で中身の違う所を囲みで並べていること（`night`・`vmc`・`row`・`msa`・`speed`）。囲みの置き方は FL.jur の `boxes` どおりで、`law.vfr` の `bk.jp`（施行規則第 5 条は機体からの言い方）と図 `vfrTwoViews` は、JCAB の VMC の問い（上方・下方・水平）を米国の言い方と結び付ける良い橋になっている。

## 5. 1 つの概念・1 つの住所

| 概念 | 今の場所 | 提案 |
|---|---|---|
| Class C・D に入る前の交信の確立 | `law.airspace`（完全）・`comm.ack`（完全） | 住所 `law.airspace`、`comm.ack` は思い出そう（S9）。CONCEPTS `C.two-way-comms` |
| 学生操縦士の制限（61.89） | `law.pilot`（完全）・`solo.req`（完全・古いリンク） | 住所 `law.pilot`、`solo.req` は思い出そう（S10）。CONCEPTS `C.student-limitations` |
| 特別有視界（91.157） | `law.vfr`（本文）・`law.special`（囲みと ACS） | `law.vfr` にまとめる（S8） |
| 夜の 3 つの定義 | `law.pilot`（表）・`sys.lights`（91.209 の 1 文）・`ops.night`（W29、これから） | 住所 `law.pilot`（N11）。CONCEPTS `C.night-definitions` |
| VFR の燃料の予備（91.151） | `perf.fuel`（完全）・`law.rules`（ほぼ同じ段落） | `law.rules` は思い出そう（N10）。決め打ちの key は残す |
| トランスポンダーと ADS-B Out が要る空域 | `law.airspace`（表と付録 D）・`law.aircraft`（1 文）・`comm.xpdr`（1 文と `{ch:law}`） | 住所 `law.airspace`。`law.aircraft` の 1 文は `bk.see('law.airspace', …)` に（初学者の読み手の C1 で装置の説明も） |
| ノータムと航空情報 | `law.special`（住所。CONCEPTS `C.notam-vs-ais`）・`law.basis`（1 文）・`wx.info`（1 文） | 合う（住所に太字の定義が 1 回） |
| VFR/IFR と VMC/IMC | `basics.rules`（住所）・`law.basis`（思い出そう） | 合う（CONCEPTS `C.flight-rules-conditions` を閉じられる） |

## 6. 事実確認役・初学者の読み手の指摘への対応

- 事実確認役 S1（91.113 の公布と施行）・S2（迎撃の「自分の名前」）・S3（図 `lawCurrency` の例の行）：同意。S2 は私の S5 に含めた（合図と食い違う指示を足す）。
- 事実確認役 N5（特別有視界の範囲）：同意。私の N9 で安全の 1 文を足した。
- 事実確認役 N11・初学者の読み手 C4（Class B の「許可」）：同意。`FL.terms` の `clearance` の note「着陸許可・離陸許可は別の語」のとおり、Class B は「管制承認」、離陸・着陸・地上滑走は「許可」と書き分けるのが JCAB の語にも合う。確認問題 1 の選択肢「ATC の許可（cleared to enter…）」も語だけ直せる（決まり 4 は語の直しを許す）。
- 事実確認役 N14（`law.pilot` の `faa` に PA.I.A.K3）：同意。私の S13 で `faa` の食い違いを全部まとめた。
- 初学者の読み手 SP2（特別有視界の囲みの場所）：同意し、ACS の対応も中身のない節を指していることを足して S8 にした。
- 初学者の読み手 AC1（「自分が用意した機体」）：同意。年次点検が 100 時間点検の代わりになることを足して S3 にした。
- 初学者の読み手 C7（グライダーと滑空機）：判断 3 で should に上げた（S11）。
- 初学者の読み手 SP1（Prohibited と Restricted の説明が同じに読める）：同意。AIM 3-4-2「flight of aircraft is prohibited（安全などのため）」と 3-4-3「not wholly prohibited, is subject to restrictions」の言い方で分けるとよい（14 CFR 73.83 は使う機関の許可を書くので、今の文も誤りではない）。数えていない。
- 初学者の読み手 C11（standby と stand by）：私の S9 で住所を決めるときに一緒に。

## 7. 安全の目で見た点

- 〔安全〕の 7 項目に当たる文は、`fuel.vfr` の囲みと key だけで、今のまま（R1 で確かめ済み）。
- 新しく足された文で、安全レビュー（W27・W36）に回したいもの：迎撃の手順（S5：合図・食い違う指示）、記述問題 10 の翼端の損傷（S12：飛ばさない）、特別有視界の書き方（N9）、91.213(d) の AD（S2）。
- 良い所：`law.basis` の考えてみよう（雲に入る高度の指示に unable）と、`law.pic` のここが大切（操縦教員や管制の指示でも、安全でなければ unable）は、規則を「守るための判断」として教えていて、教官として強く残してほしい。初学者の読み手の PI2（操縦教員に unable と言ってよいか迷った）には、「訓練で安全でないと思ったら、すぐ操縦教員に言います」の 1 文で応えるのがよい。

## 8. 検査と結果

| 検査 | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/law-figs.js textbook/rewrite/combined/drafts/law.js` | error 5・warn 12・pending 1（W19 の報告 4 と同じ：style の error 5 は部品の見出しを文と数える道具の数え方、warn は初出の形 3・正解の位置 1・CLAIMS に行がまだない 8、pending は `CALC.json`）。figures 8 枚 error 0 |
| TEXTBOOK `cd textbook && npm test` | **33/34 pass・1 fail**（2 回流して同じ）。落ちたのは `build: FLIGHT LAB sources are not copied into textbook/`：`drafts/radio.js` が `flight-lab/src/radio.js` と同じ名前だから（W19-radio の報告 5・8 の 1、factcheck-radio の 10.2 と同じ。この章のファイルではない） |
| FLIGHT LAB `cd flight-lab && npm run -s test:fast` | **86/86 pass** |
| CADET `cd cadet && npm run -s test:fast` | **247/247 pass** |

下書きは製品が読まないので、製品のテストはこの章を調べない（壊していないことの確かめ）。

## 9. 変えたファイル

- `textbook/rewrite/combined/reports/expert-law.md`（新。この報告）だけ。

## 10. 台帳の行

書いていない（読み手の役目）。直すときの提案：
- ACS-MAP：PA.I.B.K1・K2・K3・K4・PA.I.D.K6・PA.I.E.K3 を `status: open`・`missing: ["law.aircraft"]`（D.K6・E.K3 は `["law.special"]`）に。PA.I.E.K4 の `sections` を `law.vfr` に。PA.I.A.K3 の `sections` に `law.pilot`。PA.I.A.K4 の `sections` から `law.pic`。IR.II.C.K2 の `sections` に `nav.vor`。PA.I.A.K1・K2・PA.III.A.K8 は、W19 のパッチどおり `mapped` でよい。
- CONCEPTS：`C.two-way-comms`（住所 `law.airspace`・呼び戻し `comm.ack`）、`C.student-limitations`（住所 `law.pilot`・呼び戻し `solo.req`）、`C.night-definitions`（住所 `law.pilot`・呼び戻し `sys.lights`・`ops.night`・`perf.fuel`）。
- CLAIMS：S2・S3・S5・S12・S14 で文が変わる行は ID が変わる（直した単位が作り直す）。

## 11. 未解決のこと

- Part 43 付録 A の予防整備の項目、43.9 の記録、21.175 の耐空証明の区分、Archer の POH の KOEL の有無、AIM 3-5-2 の MTR の速さと高さ、61.89(a)(1) と「操縦教員が機長」の結び付け（FAA の解釈）、61.109 の夜の数え方、航空法施行令の位置づけは、今日一次資料を読んでいない。本文に書くときは書き手が確かめる（3 の〔書き手が確かめる〕）。
- 夜の VFR の装備の住所（`law.aircraft` か `ops.night` か）は DESIGN に書いていない。私は `law.aircraft` を勧める（ACS-MAP がそこを指し、`law.pilot` の 3 つの夜の表とつながる）。

## 12. ほかの単位にお願いしたいこと（needs from others）

1. **W19（この章の書き手・直し役）**：S1〜S8・S10 の `law.pilot` の側・S11 の本文・S12〜S14、nit の N1〜N7・N9・N10。S9 は W19-radio と住所を決めてから。
2. **W06（`FL.jur`）**：`svfr.boxes` を `law.special` から `law.vfr` へ（S8）。`svfr` の米国の欄「管制の許可を受け」を「管制承認を受け」に（`FL.terms` の `clearance`）、「計器飛行の資格」は W19 の報告 8 の 2 のとおり「IFR で飛べる資格（計器飛行証明と最近の経験）」に。
3. **統合役（DESIGN）**：DESIGN 3.3 の章 12 の `law.special` の範囲の列「米国（svfr）」を `law.vfr` の列へ、3.4 の `svfr` の行の節を `law.vfr` に（S8）。夜の VFR の装備の住所を 3.3 に 1 句（11）。
4. **W19-radio（`radio*`）**：`comm.ack` の「交信の確立」の表を思い出そうとリンクに（または住所を `comm.ack` にして `law.airspace` を短く。S9）。つづり standby／stand by をそろえる。
5. **W28（第 2 部）**：`solo.req` の 61.89 の段落を思い出そうに、リンクを `bk.see('law.pilot', '学生操縦士の制限')` に（S10）。「make and model」の訳語（型式／機種）を W04 の答えでそろえる。
6. **W29（第 3 部 `night`）**：`ops.night` は夜の定義を作り直さず、`law.pilot` の表を呼び戻す（N11）。夜の VFR の装備を `ops.night` に置くなら、`law.aircraft` から予告で。
7. **W30（第 4 部）**：IFR の装備 91.205(d) の住所（N12）。
8. **W04（`FL.terms`）**：「滑空機（グライダー、glider）」（S11）、61.87(n) の「make and model」の訳語（S10）、この報告で足す語の JCAB の表記：予防整備（preventive maintenance）・特別飛行許可（special flight permit）・SAIB・KOEL・防空識別圏（ADIZ）・軍の訓練経路（MTR）・国家安全区域（NSA）。
9. **W21（第 1 部の図）**：図 `airspace` の「許可」→「管制承認」（事実確認役の N11）、図 `specialUseAirspace` の凡例に P と、S6 で足す空域があれば記号、図 `vfrTwoViews` の横の縮尺の注（事実確認役の N9）。
10. **W23（第 1 部の問題）**：確認問題 9 の問いの語（N7）、確認問題 1 の選択肢の「許可」→「管制承認」。S1・S5・S6 を足したら、その中身の問い（例：登録証明の期限・迎撃の合図・ADIZ）を後ろに足す候補に。
11. **W42（ACS-MAP・JCAB-MAP の深さ）**：10 の ACS-MAP の行。
12. **W03（CONCEPTS）**：10 の 3 行。
13. **W27・W36（安全レビュー）**：S2・S5・S12・N9。
