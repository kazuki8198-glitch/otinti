# 直し役の報告：第 1 部 第 13〜17 章 `radio1`〜`radio5`「無線交信」（revise-radio）

単位：章 `radio1`〜`radio5` の直し役（R2・DESIGN 7.2 の W19 の radio の分の直し。書いた W19・事実確認役・2 人の読み手とは別の役）。日付：2026-10-30。
直したもの：`textbook/rewrite/combined/drafts/radio.js`・`drafts/radio-figs.js`・`drafts/radio.claims.json`、パッチ `reports/revise-radio.ledger.json`（新）。
もとにした指摘：
- `reports/factcheck-radio.md`：must 0・should 3・nit 15
- `reports/reader-radio.md`：must 0・should 9・nit 64
- `reports/expert-radio.md`：must 1・should 8・nit 14

守った決まり：DESIGN 6.2 の 15 の決まり、3.2・3.3（第 1 部 章 13〜17）・3.4・4.2（kiso09）・6.1（`comm.numbers` と RD.FLIGHT は変えない）、DECISIONS（判断 2・3・3 の補足・11）、STYLE。CLAUDE.md はこのリポジトリにない（`find` で確かめた）。`flight-lab/kiso/` は読んでいない（変えていない）。git の操作はしていない。

## 結論

- **must は 1 つ（expert M1〔安全〕）で、直した。** `comm.flow` の判断の目・`radio4` の例 3・説明してみよう 2 の「返事を待ってから変える」をやめた。
  - 管制の指示（針路・高度・経路）を受けているときは、新しい指示をもらってから変える（AIM 4-4-10・4-1-18）。
  - ただし、従うと雲に入る・地形に近づく指示は「従えない指示」。待たずに “unable” と言って雲と地形から離れ、新しい指示を求める（PCG：Air Traffic Clearance・AIM 4-1-18）。
  - 緊急で指示から外れたら、できるだけ早く伝える（14 CFR 91.123(c)）。
  - 交通情報だけを受けているときは、VFR の巡航高度を変えるときに知らせる（AIM 4-1-15）。
  - 基礎教材 kiso09.27 の「緊急時の対応は通常の変更要求と区別する」の考え方が戻った。`comm.clarify` とも食い違わない。
- **should は 3 人分で 20 個。** 持ち物の 3 ファイルで直せて、一次資料で確かめられたものは全部直した。持ち物の外のもの（表の CSS・FL.jur の日本の欄・今の図のラベル）は 6 にお願いを書いた（2.4 に理由）。
- **〔安全〕の文**（M1・S1・S5、`comm.runway` の灯火と出方、`comm.xpdr` の地上の ALT）は、W27・W36 の安全レビューを通るまで「直し終えた」ことにしない（STYLE）。
- **章の検査**：error 7・warn 42・pending 1。error 7 は全部が道具の数え方（W10b の部品の見出し「思い出そう」5・「判断の目」2 を文と数える。W14 の `skipForStyle` の 1 行を入れた道具の写しでは error 0）。warn は、初出の形 9（FL.jur の囲みの字・長い語の中の短い語）・平均の長さ 2 と長い文 1 と留保 1（変えない節 `comm.numbers`・`comm.callsign`）・正解の位置 1・札なし 28（台帳にまだ行がない）。
- **主張の札**は 365 文の全部に付いた（台帳の写しに `radio.claims.json` を足すと claims warn 0）。札のある文の中の `{ch:}` を `bk.see` に替えたので、**行の ID は章の番号で変わらない**（factcheck S3。抜き出した 365 行に「第 N 章」は 0）。
- 新しい事実は全部、一次資料を自分で取り直して確かめた（2.5）。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `drafts/radio.js` | 5 章・28 節のうち 25 節と章末を直した（2）。節・章の ID、節の順、確認問題の順と正解の位置は変えていない（決まり 1・4）。<br>出典 `NEW_R` に `aim55`（AIM 5-5-15 Minimum Fuel Advisory）・`asrsDL1`（NASA ASRS Directline 第 1 号「Readback / Hearback」）を足し、`aim45` の名前に 4-5-2 を足した。<br>`refs` に `R.jo71`（radio1）・`R.aim52`（radio2）・`NEW_R.asrsDL1`（radio3）・`NEW_R.aim45`・`NEW_R.aim55`・`R.aim21`・`R.ac9066`（radio5）を足した（factcheck N2 ほか）。<br>節のデータ：`comm.runway` の `faa` に PA.II.D.K5、`comm.mayday` に PA.VI.D.K2、`comm.ctaf` に PA.III.B.K4、`comm.nordo` の `jcab` に ppl/cpl.4.1.2.4 を足した（4 のパッチと合わせた）。<br>頭の注に、直しの要約を書いた。 |
| `drafts/radio-figs.js` | 図 3 枚（`readbackLoop`・`runwayEntry`・`xpdrCodes`）を直した（2.6）。図を足したり外したりはしていない。頭の注に直しを書いた。 |
| `drafts/radio.claims.json` | 主張の札を作り直した（308 → 365 行。直していない文の 254 行はそのまま、直した文・新しい文の 111 行は `by: revise-radio`。2.7） |
| `reports/revise-radio.ledger.json`（新） | 台帳のパッチ 20 行（4）。`validate.mjs` は 0 error |
| `reports/revise-radio.md`（新） | この報告 |

ほかのファイルは変えていない（`flight-lab/kiso/`・台帳の本体・`FL.terms`・`FL.jur`・`book-figs.js`・製品のファイル・DESIGN・W19 の報告とパッチ）。
製品のテストを流すと `flight-lab/outputs/FLIGHT-LAB.html` と `cadet/outputs/CADET.html` が作り直される。下書きは製品が読まないので、中身は変わらない。

## 2. したことと理由

### 2.1 事実確認（`factcheck-radio.md`）

| # | 指摘 | 扱い | 今の文（場所） |
|---|---|---|---|
| S1 | radio3 確認問題 7 の前提 | 直した | 「停止線に近づくと、停止線の赤い灯（REL）がついた。管制官からは、この滑走路を横切る許可（cross runway two seven）をもらっている。どうする？」。正解・理由・問の位置は今のまま |
| S2 | Unable の出典 | 直した | `comm.clarify`：「従えない指示には、“Unable” と言います（PCG：Unable）。理由と、代わりの希望（経路・高度など）も伝えます。規則から外れる・危険になる許可なら、別の許可を求めるのは操縦士の責任です（PCG：Air Traffic Clearance）。」 |
| S3 | 札の ID が章の番号で変わる | 直した | 節の本文の `{ch:radio1}`〜`{ch:radio5}`・`{ch:law}`・`{ch:perf}` を、全部 `bk.see(節ID, 題)` にした（抜き出しは button の字を拾わない）。残る `{ch:}` は章末の注意 2 つと `bk.sim` の `{ch:sim}` だけで、札の行にならない |
| N1 | ヒアバックの出典 | 直した | 「…ヒアバック（hearback）と呼びます（NASA ASRS）」「…証明にはなりません（NASA ASRS）」。用語の表「JO 7110.65 2-4-3（確かめる義務）・NASA ASRS（語）」。`NEW_R.asrsDL1` |
| N2 | 章の出典の抜け | 直した | radio1 に `R.jo71`、radio2 に `R.aim52` |
| N3 | FSS は Alaska だけ | 直した | 「FSS（飛行サービス局、Flight Service Station。アラスカだけ）」 |
| N4 | 1200 の文 | 直した | 「4271 と 0425 は管制官から言われる架空の値で、1200 は VFR の決まったコードです（AIM 4-1-20）。」 |
| N5 | 7000 の写真の文 | 直した | 小見出し「国によって違う VFR のコード」：「写真のトランスポンダーは、コード 7000 を表示しています（米国の VFR の 1200 ではありません）。」「英国の目立たせるためのコード（conspicuity code）は、7000 と 2000 です（CAP 413 8.9）。飛行方式に合った方を選びます（CAP 413 5.8）。」「英国の交信の例では、VFR の機は 7000 を使っています（CAP 413）。」。「欧州」とは書かない（各国の AIP を確かめていない。DESIGN 3.3 の「欧州の例」は 6 の統合役へ） |
| N6 | AIM 4-4-10 の言い方 | 直した（M1） | 下の 2.3 の M1 |
| N7 | `comm.nordo` の Class D | 直した | 「管制塔のある空港の地表区域（AIM は Class D の地表区域と書く）の外か上で…」 |
| N8 | 止まるのはこの本の勧め | 直した | 「停止線の手前で、自分で滑走路とファイナルを見て…確かめてから越えます（AIM 2-3-5）。止まって確かめるのが、この本の勧めです。」 |
| N9 | 北は 360 の出典 | 直さない | `comm.numbers` は変えない節（DESIGN 6.1「英語交信：`comm.numbers` は変えない」）。変えてよい時期に「・JO 7110.65 2-4-17」を足す（5） |
| N10 | 図 `runwayEntry` の REL と矢印 | 直した | REL を x = 256・264・272・280（最初の灯は停止線）。矢印は ① の字の右から標識の上を通り、標識の右（x = 246）で停止線へ下りる（2.6） |
| N11 | 図 `readbackLoop` の切れ | 直した | 札の間を 6 → 4。最後の札の右端は x = 394 |
| N12 | radio5 の summary の「日本」 | 直した | 「米国（FAA）と英国（ICAO）の言い方の違い」 |
| N13 | `comm.icao` の札の出典 | 直した | 文が変わり行は `comm.icao#934415e8`。出典に「日本の欄は FL.jur の readback（W06。〔要確認〕：U.readback-japan）」 |
| N14 | 抜き出しが CAP とコードを拾わない | 持ち物の外 | W01（6） |
| N15 | PROVENANCE の図の行 | パッチに書いた | `ch09-fig9-9`・`ch09-fig9-10` に note（4） |

### 2.2 初学者の読み手（`reader-radio.md`）

**should（9）**

| # | 指摘 | 扱い | 今の文（場所） |
|---|---|---|---|
| C1 | トランスポンダーが何か 4 章分からない | 直した（図は W21） | `radio.why`（第 13 章の最初）の表のあと：「表のトランスポンダーは、管制のレーダーの問い合わせに、管制官から言われた 4 けたのコードと高度で答える機械です。この章から何度も出てきます（→ トランスポンダーとコード）。」図 `radioRelay`・`flightOverviewMap` の「VFR 1200」は W21 へ（6） |
| C2 | 場周経路の辺の名前が説明より先 | 直した（図は W21） | 最初に出る `comm.ack`（radio3）：台本の意味「滑走路の手前 2 マイルのファイナル（final approach leg）で報告せよ」と、5 つの辺の小さな表（アップウインド・クロスウインド・ダウンウインド・ベースレグ・ファイナル。中身は PCG：Traffic Pattern）、「クロスウインドは辺の名前で、横風（crosswind）とは別のものです」、予告 `ops.pattern`。<br>「最終進入」は全部「ファイナル」（`FL.terms` の `final`）にした（8 か所）。`comm.flow`・`comm.ctaf` は `comm.ack` へのリンクと初出の形。<br>図 `patternCalls`・`ctafCalls` の 5 つの辺の名前は W21、アップウインドの行は W04（6） |
| C3 | 地上滑走は許可か指示か | 直した | 全部「地上滑走の指示」、滑走路を横切るのは全部「横切る許可」（`radio.why` の Ground・`comm.readback`・`comm.flow` の表・`comm.dep` の題と本文と ここが大切）。<br>`comm.runway` で 1 回だけ定義：「地上滑走の指示（taxi instructions）は、どの誘導路を通って、どこまで行くかを決める指示です。AIM は taxi clearance とも書きますが、管制官は地上滑走に “cleared” の言葉を使いません。地上滑走の指示は、滑走路に入る・横切る許可を含みません（AIM 4-3-18・4-3-21）。」（expert N5 も） |
| C4 | 管制承認と許可 | 直した（= expert S7） | `comm.clarify` の表の 1 行目を「許可（clearance）」にし、例を「滑走路の許可＝離陸許可（takeoff clearance）・着陸許可（landing clearance）・横切る許可」「経路の許可＝管制承認（クリアランス、ATC clearance）：cleared to Chicago Midway Airport via Victor Eight（AIM 4-3-18 の例）」に分けた。表の下に「この本では、clearance を『許可』と訳します。そのうち、IFR の経路の許可や Class B 空域に入る許可を管制承認と呼びます。滑走路の許可は、離陸許可・着陸許可・横切る許可と呼び分けます。」。用語の表も同じ形（`FL.terms` の clearance の注「着陸許可・離陸許可は別の語」に合う） |
| T1 | 表の数字が行の途中で割れる | 持ち物の外 | `textbook/src/style.css`（統合役。6） |
| WHY1 | 「停止線を越えて止まる」 | 直した | 考えてみようの答え：「着陸したら、言われた誘導路か、最初に使える誘導路から滑走路を出ます。管制官が認めないかぎり、ほかの滑走路へは出ません（AIM 4-3-21）。別の指示がなければ、機体の全部が停止線（runway holding position marking）を越えた所で止まります（AIM 4-3-21）。停止線は、滑走路の手前の黄色の線です（→ 滑走路に入る許可と誤進入の防ぎ方）。」（expert S5 の前半も） |
| WO1 | 「待機の位置」 | 持ち物の外 | FL.jur `words` の日本の欄（W06。6） |
| MA1 | 「できれば上昇」と「IFR の気象状態」 | 直した（= expert S1） | 2.3 の S1 |
| Q1 | radio3 確認問題 7 | 直した | = factcheck S1 |

**nit（直したもの）**：C5（`radio.listen` に「管制官の言い方は、FAA の管制官の方式基準 JO 7110.65 に決められています」。`comm.pattern` も「方式基準」）・C6（`radio.technique` の台本の下に「Lima・Alpha・Bravo は、L・A・B の文字の読み方です（→ フォネティックアルファベット）」）・C7（`comm.basic` の本文に「AIM の例文には Alpha とつづるものもあり、この本のコールサインも Alpha と書きます」、考えてみようの答えを Alpha に。図は W21）・C8（「エプロン」を「駐機場（ramp）」に）・C12（radio3 の summary を 3 つに分けた）・WHY2・WHY3（「開く（出発を知らせて、計画を有効にする）」）・EQ1（VHF（very high frequency：超短波））・TE1（「飛ばす → 位置と行き先を確かめる → 話す」）・TE2（AIM の例を別の文に）・BA1（`comm.basic` の時計の方位は 1 文と `comm.radar` へのリンク）・BA2・WO2（PCG の説明）・WO3・OP1（オプションの 5 つを「進入復行（missed approach）」にそろえ、`comm.option` に 1 行ずつの意味の表。PCG の TOUCH-AND-GO・LOW APPROACH・STOP AND GO・OPTION APPROACH）・WO4（「市民無線（CB）の俗語」。AIM 4-2-1 は “CB” slang と書く）・PA2・AC1（Resume own navigation の意味。PCG）・AC2（= expert S8）・RB1（高度の制限の例）・CL1・MI1（写真の段落を 1 文とリンクに）・RW1・RW2（PCG：HOT SPOT「a history of potential risk」）・RW3・RW4（空港の図）・RW6（予告 `ops.landing`）・FL1（= factcheck N4）・FL3・FL4・AT1（2.3 の N4）・DE1（「滑走路の指定は、いつも復唱。誘導路の hold short も、止まる所なので復唱する」）・AR3・CT1・CT2（full stop は `comm.option` の表）・XP1（2000 と ALT。Mode 3/A は FL.jur）・NO1（スケルチは `radio.equip` で定義）・NO2（= factcheck N7）・SF2（HS1 の 9L/27R の機・SOLO・LAHSO の略）・SF3（滑走路の長さと場周の向きを表に）・IC2（QNH・decimal の注・「止まる所（許可の限界）を強めて言うとき」）・IC3（英国の traffic circuit の行。CAP 413 4.6）・Q2。

### 2.3 専門家（`expert-radio.md`）

| # | 指摘 | 扱い | 今の文（場所） |
|---|---|---|---|
| M1〔安全〕 | 雲に近づきながら返事を待つと読める | 直した | `comm.flow` の判断の目を 3 項目に分けた：「…早めに理由と希望（経路・高度・行き先）を伝えます」／「針路（ヘディング、heading）・高度・経路の指示を受けて飛んでいるときは、新しい指示をもらってから変えます（AIM 4-4-10・4-1-18）。ただし、従うと雲に入る・地形に近づくなら、それは従えない指示です。待たずに “unable” と言い、雲と地形から離れます。そして、新しい指示を求めます（PCG：Air Traffic Clearance・AIM 4-1-18）。緊急で指示から外れたら、できるだけ早く管制に伝えます（14 CFR 91.123(c)）」／「交通情報だけを受けていて、指示を受けていないときは、VFR の巡航高度（cruising altitude）を変えるときに管制官に知らせます（AIM 4-1-15）」。<br>ここが大切の 4 つめ「計画どおりに飛べないなら早めに伝える。雲に入る指示には unable」。<br>例 3：「…雲に近づく前に、Approach に…伝える。指示を受けているなら、新しい指示をもらってから変える。待つと雲に入るなら “unable” と言って雲を避け、すぐに伝える（わからないとき・従えないときの節）。」<br>説明してみよう 2 の答え：「…指示を受けて飛んでいるなら、ふつうは新しい指示をもらってから変えます。ただし、待つと雲に入る・地形に近づくなら、“unable” と言って安全な方へ変え、すぐに管制に伝えます（緊急で外れたときは 14 CFR 91.123(c)）。…」と `comm.clarify` へのリンク |
| S1〔安全〕 | 上昇の但し書き・7700 | 直した | `comm.mayday`：「管制と交信しているなら、もらっているコードのままにします（言われたら変えます）。すぐに交信できないときは 7700 にします（AIM 6-3-2）。1200 で飛んでいて、まだ誰とも話していないときも同じです。7700 にしたら、すぐに交信を始めます（AIM 6-2-2）。」「位置がわからないときなど、上昇できるなら上昇します。…ただし、雲に入るような上昇はしません。」「計器飛行証明（instrument rating）がなければ、VFR の気象状態のまま降りられる道を選びます。それができなければ、資格がないことを伝えて、遭難（MAYDAY）を宣言します（AIM 6-2-1）。」「計器気象状態（IMC：…）の管制空域では、許可なく上昇・降下してはいけません。緊急のときの 14 CFR 91.3(b) の場合は除きます（AIM 6-3-2）。」「エンジンが止まったときは上昇せず、最良滑空速度を保ちます。」ここが大切に「計器飛行証明がなければ、雲に入るような上昇はしない」 |
| S2 | 遭難機への ATC の業務 | 直した | `comm.mayday` の小見出し「管制がしてくれること」：AIM 6-3-1（応える・助ける・機関を動かす・捜索救難に知らせる）、6-2-1（VFR 機への針路の案内は助言）、6-3-2（指示に従う・聞き返す・周波数を変えない・不時着が迫ったら ELT・目印・機体の色）。PAN-PAN の例の要求を「request vectors to LAB」に（N11） |
| S3 | トランスポンダーの使い方としくみ | 直した | `comm.xpdr` に小見出し「動かし方」（91.215(c)・AIM 4-1-20：管制空域では高度を送る位置、91.225(f)：ADS-B Out はいつも送信、AIM 4-1-20：誘導路と滑走路の上でも、駐機場で STBY か OFF、AIM 2-1-6：RWSL はその信号を使う監視で動く、stop altitude squawk）と「しくみ：一次レーダーと二次レーダー」（AIM 4-5-1・4-5-2、PCG：Mode、AIM 4-1-20 の Mode C・S の高度）。ここが大切に「つまみは高度を送る位置に。誘導路と滑走路の上でも」。装備の要る空域は `bk.see('law.airspace')`。図 `xpdrCodes` に「つまみ：ふつうは ALT（高度を送る。地上でも）」 |
| S4 | VFR 機へのレーダーの業務 | 直した | `comm.radar` に小見出しと表（基本のレーダー業務・安全の警告・Class C の業務：AIM 4-1-16・4-1-18）と 4 文（PCG の flight following、Ground への最初の交信で頼める、よける針路は頼んだときだけ、巡航高度を変えるときは知らせる：AIM 4-1-15・4-1-18）。`comm.arrive` の台本の注に「前の機に続けという指示は、前の機への許可や指示を自分に許すものではない（AIM 4-1-18）」 |
| S5〔安全〕 | 滑走路を出るとき・灯火 | 直した | `comm.runway` の判断の目に 2 項目（AIM 4-3-21：言われた誘導路か最初に使える誘導路・ほかの滑走路に出ない・許可なく滑走路の上で止まらない・引き返さない。AIM 4-3-24：横切るときは外の灯火を全部、LUAW は着陸灯のほかを全部、着陸灯は離陸の許可で）。`comm.arrive`・`radio.why` の答えに「ほかの滑走路へは、管制官が認めないかぎり出ません（AIM 4-3-21）」 |
| S6 | 標示・標識と低視程 | 直した | `comm.runway` に小見出し「停止線のまわりの標示と標識」と表（強化された誘導路中心線 AIM 2-3-4・停止線・滑走路の手前の標識・進入区域の停止位置「36-APCH」・ILS の停止位置・No Entry の標識：AIM 2-3-5・2-3-8）、判断の目に低視程の 1 項目（AIM 4-3-19）。図 `runwayEntry` に強化された中心線を描いた |
| S7 | 管制承認に離陸・着陸の許可 | 直した | = reader C4 |
| S8 | 1 つの概念が 2 か所以上 | 直した（`ground.taxi` は W28） | 交信の確立：`comm.ack` の表を外し、言い方の台本（3 つの答えの例）と、ここが大切のあとの思い出そう（→ `law.airspace`）に。radio3 確認問題 2 は残し、理由に「（空域の種類と入る条件の節）」。<br>Class C の形：`comm.flow` の段落を外し、思い出そう（→ `law.airspace`）に。<br>滑走路の許可：住所 `comm.runway`（地上滑走の指示の定義と言葉の表）。`comm.dep`・`comm.tower` は思い出そう（→ `comm.runway`）、`comm.readback`・`comm.mistakes`・`comm.sfb` は 1〜2 文とリンク。<br>時計の方位：`comm.basic` は 1 文とリンク（`comm.numbers` は変えない節）。<br>CONCEPTS の 3 行はパッチ（4） |
| N1 | 「必ず復唱」 | 直した | `comm.readback` の小見出しを「いつも復唱するもの」にし、「AIM は、次のものを、いつも復唱するよう求めています。hold short は、管制官も復唱を必ず求めます（JO 7110.65 3-7-2）。」。ここが大切・`comm.words`・用語の表・`comm.icao`・図 `readbackLoop` も「いつも」 |
| N2 | 「左が 18 の端」 | 直した | 「左に滑走路 18 の進入端（threshold）、右に 36 の進入端があります（AIM 2-3-8）」。図の注も |
| N3 | 1 人で操縦する機の着陸の側 | 直した | 「1 人で操縦する機は、管制の交信だけを聞き、ATIS などほかの音は聞きません。滑走路に入る許可をもらってから空港の地表区域を出るまでと、着陸の許可をもらってから地上滑走を終えるまでです。」（AIM 4-3-18） |
| N4 | FEW050 は AGL | 直した | `comm.atis` の答え：「雲の高さは地上からの高さ（AGL）ですが、LAB の標高は 55 ft（教材値）と低いので、ほぼそのまま比べられます。」 |
| N5 | 地上滑走の語 | 直した | = reader C3 |
| N6 | `comm.basic` の時計 | 直した | = S8 |
| N7 | 無線のない機・AWOS | 直した | `comm.ctaf` に 2 項目（AC 90-66C 9.12.2・AIM 4-1-9）。`refs` に `R.ac9066` |
| N8 | MINIMUM FUEL | 直した | `comm.mayday` の小見出し「燃料が少ないとき：minimum fuel」（AIM 5-5-15・PCG）。`NEW_R.aim55` |
| N9 | 電気系統の故障・スケルチ | 直した | `comm.nordo`：「電気系統の故障で電気が来なくなると、無線も使えなくなります（→ 電気系統）。」。スケルチは `radio.equip` で定義 |
| N10 | 試験通信 | 直した | `comm.icao` の表に「無線の確かめ」の行（FAA：PCG HOW DO YOU HEAR ME?。英国：radio check と周波数、readability 1〜5：CAP 413 2.93・2.94・表 12） |
| N11 | PAN-PAN の例の要求 | 直した | = S2 |
| N12 | ACS-MAP IR.V.B.K2 | 持ち物の外 | W42（6） |
| N13 | DESIGN 3.3 の `comm.numbers` の ICAO の列 | 持ち物の外 | 統合役（6） |
| N14 | 英国の移行高度 | 変えない | 勧めのとおり、数字を書かないまま |

### 2.4 直さなかったもの・一部だけのもの（理由）

- **持ち物の外**（6 に、直し方を書いてお願いした）
  - 表の数字の割れ（reader T1）は `textbook/src/style.css`。
  - 「待機の位置」（WO1）・囲みの重なり（C10）・「47 CFR」（EQ2）・「Mode 3/A」（XP1 の一部）は FL.jur（W06）。
  - 今の図のラベル（C1 の「VFR 1200」・C2 の辺の名前・C7・LI1・EQ3・FL2・AR1・AR4・SF1）は `flight-lab/src/book-figs.js`（W21）。
  - 写真のキャプションの「4 桁」「ADF」（XP2・XP3）は `book-photos-k.js`（W22）。
  - `law.airspace` の「standby」（C9）は law の持ち物。
- **変えない節**：`comm.numbers`（DESIGN 6.1）の NU1・factcheck N9、`comm.callsign`（決まり 9。CADET の決め打ち）の CS1・CS2。
- **決まりで変えないもの**：確認問題の正解の位置（C11。決まり 4 で並べ替えない。W23）。radio5 の章の題（C12 の後半）は DESIGN 3.3 の章の名前のまま残した（目次と CADET の質問メニューに出る名前を、この単位だけで変えない）。summary は短くした。
- **`comm.icao` の日本の列**（IC1）：DESIGN 3.3 が「FAA・ICAO（英国）・日本の 3 列」と決めているので、列は残した。最初の列の語を短くした（「FL に変わる高度」）。
- **出典が要るのに確かめられなかったもの**：PA3（VFR の最初の呼び出しで目標の高度を言うこと）は、AIM 4-1-20 が言うのは「いまの高度」だけなので、本文に足さず、考えてみようの答えの例のままにした。PA1 は、今の下書きでもう箇条の外の段落なので変えていない。CL2（インシデント）は、住所の `law.pilot` が今の本にないので、リンクは登録のあと（決まり 13）。AR2 は、意味の列にもう「ATIS C」「誘導路 C」とあるので変えていない。
- **DESIGN 3.3 の「コード 7000 は欧州の例と書く」**：英国（CAP 413）の例として書いた。欧州の各国の AIP は確かめていない（factcheck N5）。DESIGN の文言は統合役へ。

### 2.5 新しい事実の確かめ（2026-10-30 に元の URL から取り寄せて、本文を読んだ。写しは scratchpad）

| 資料 | 確かめた所 |
|---|---|
| FAA AIM（HTML 版）2-1・2-3・3-2・4-1・4-3・4-4・4-5・5-1・5-5・6-2・6-3 | 2-1-6（RWSL の機は駐機場を出てから戻るまで transponder/ADS-B On、ASDE-X/ASSC が RWSL に情報）、2-3-4（強化された中心線、停止線の手前最大 150 ft、おもに大きな空港）、2-3-5（停止線・進入区域の停止位置・ILS の停止位置・管制塔のない空港は越える前に間隔を確かめる）、2-3-8（赤地に白の標識の 2 つの用途・「15-33」は進入端・APCH/DEP・ILS・No Entry）、3-2-4（“standby” の 3 つの例）、4-1-9（FSS は Alaska だけ・自動の UNICOM・AWOS）、4-1-15（よける針路は頼んだときだけ・巡航高度を変えるとき知らせる）、4-1-16（安全の警告、どうするかは操縦士）、4-1-17、4-1-18（基本のレーダー業務・Class C の業務・follow は前の機の許可を許さない・PILOT RESPONSIBILITY）、4-1-20（地上でも高度を送る位置・駐機場で STBY か OFF・管制空域で altitude reporting・ADS-B Out はいつも送信・100 ft・stop altitude squawk）、4-3-18（taxi で “cleared” を使わない・1 人で操縦する機の着陸の側・should always read back）、4-3-19、4-3-21（ほかの滑走路に出ない・止まらない・taxi clearance）、4-3-23、4-3-24、4-4-7、4-4-10、4-5-1、4-5-2、5-1-14（ETA の 1/2 時間後）、5-5-15（minimum fuel）、6-2-1、6-2-2、6-3-1、6-3-2 |
| FAA Pilot/Controller Glossary | AIR TRAFFIC CLEARANCE（the pilot is responsible to request an amended clearance）、UNABLE、TRAFFIC PATTERN（5 つの辺の定義）、TRAFFIC ADVISORIES、FLIGHT FOLLOWING、MINIMUM FUEL、MODE、TRANSPONDER、HOT SPOT、ATC INSTRUCTIONS、CLEARED FOR THE OPTION、OPTION APPROACH、TOUCH-AND-GO、LOW APPROACH、STOP AND GO、CLOSED TRAFFIC、RESUME OWN NAVIGATION、HOW DO YOU HEAR ME?、PURPOSE |
| 14 CFR（eCFR versioner API、2026-10-28 の版） | 91.123(a)〜(e)、91.215(b)・(c)、91.225(d)・(f) |
| FAA AC 90-66C（2023-06-06） | 9.12.2 No-Radio Aircraft |
| NASA ASRS Directline 第 1 号「Readback / Hearback」（1991 年 3 月） | 「We call this the hearback problem」「controller silence is not confirmation of a readback's correctness」 |
| UK CAA CAP 413 第 24 版（2026-07-01） | 2.92〜2.94・表 12（radio check と readability 1〜5）、4.6（traffic circuit）、5.8（Squawk conspicuity：VFR か IFR に合ったコード）、8.9（Conspicuity Codes 7000 and 2000）、交信の例「Squawking 7000」 |
| FAA「From the Flight Deck: Orlando Sanford（SFB）」（2026-06-02 更新） | HS1（18 に着陸した機と、9L/27R に着陸して 18 へ出てから誘導路 C へ右に曲がるよう言われた機が、27C に入った）、「Advise if you are a SOLO」、LAHSO |

### 2.6 図（`radio-figs.js`。Chromium 390 px の PNG にして目で見た。scratchpad）

| 図 | 直したこと |
|---|---|
| `readbackLoop` | 札の間 6 → 4（右端 x = 394）。見出し「いつも復唱するもの（AIM）」、キャプション「AIM がいつも復唱するよう求めているもの」（expert N1・factcheck N11） |
| `runwayEntry` | REL を停止線から（x = 256〜280）。① の矢印は字の右から上を通り、標識の右で停止線へ。強化された中心線（停止線の手前の黄色の破線 2 本）と、その説明の行「中心線の両側の黄色の破線：停止線が近い合図」。標識の注「左に 18、右に 36 の進入端」。キャプションに AIM 2-3-4 の 1 文（factcheck N10・expert N2・S6） |
| `xpdrCodes` | 「つまみ：ふつうは ALT（高度を送る。地上でも）」とキャプションの 1 文（expert S3） |

check-figures（390 px）：章の図 13 枚で error 0・warn 0（最小の文字 10.3 px）。

### 2.7 主張の札（`radio.claims.json`）

- `check-chapter.mjs --claims-out` で抜き出した 365 行の全部に札と出典を付けた（参考値 330・条文 33・教材値 2。例題 36・本の決まり 14）。
  - 文が変わらない 254 行は、W19 の行をそのまま使った（事実確認役の確かめが残る）。
  - 直した文と新しい文の 111 行は `by: revise-radio`。出典には、読んだ一次資料の該当の英文を書いた。
  - W19 の 308 行のうち 54 行は、文が変わって ID が変わった（なくなった）。
- 抜き出した行に「第 N 章」を含むものは 0（factcheck S3）。
- 台帳の写しに 365 行を足すと、claims は 365/365 に札（warn 0）。
- **W19-radio.ledger.json の CLAIMS の 308 行は古い**。登録では、このファイルの 365 行を取り込む（6 の統合役）。`checkedBy` は空。111 行は、確かめ役（W27）の署名が要る。

## 3. 検査の結果

| 検査 | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/radio-figs.js textbook/rewrite/combined/drafts/radio.js`（Chromium あり） | exit 0（報告だけ）。**error 7・warn 42・pending 1・info 429**。<br>error 7：style の not-polite 5・taigen-dome 2。どれも部品の見出し「思い出そう」×5・「判断の目」×2 を文と数える道具の数え方（W14・W19・revise-law と同じ。思い出そうを 4 つ足したので前の 3 から増えた）。<br>warn 42：claims の札なし 28（`CLAIMS.json` にまだ行がない）。<br>style の初出の形 9：「気圧高度」×4 は「気圧高度計」の中の字、「計器飛行」は「計器飛行証明」の中の字、「待機」×2・「空港等」・「航空英語能力証明」は FL.jur の囲みの字。<br>style の平均の長さ 2・長い文 1・留保 1：変えない節 `comm.numbers`・`comm.callsign`。<br>questions の正解の位置 1（A 6.5%・B 61.3%・C 25.8%・D 6.5%。並べ替えない）。<br>pending 1：`CALC.json` がない。<br>chapters・form・data・volume・jurisdiction・chapter-refs・figures（13 枚・390 px）・photos・concepts・jur・path・provenance・egov は error 0・warn 0。<br>本文 635 文・平均 37.1 字・最長 81 字（`comm.numbers`）・80 字超 1・留保は ここに注意の外 6（どの節も 1 回まで。`comm.numbers` だけ 2） |
| 同じ（道具の写しに W14 の `skipForStyle` の 1 行、台帳の写しに `radio.claims.json` の 365 行と 4 の CONCEPTS の 3 行） | **error 0・warn 14・pending 1**。claims 365/365・concepts 3 行で warn 0 |
| `cd flight-lab && npm run -s test:fast` | **86/86 pass** |
| `cd cadet && npm run -s test:fast` | **247/247 pass** |
| `cd textbook && npm test` | **33/34 pass、1 fail**（2 回流して同じ）。落ちたのは `build.test.mjs:66`「build: FLIGHT LAB sources are not copied into textbook/」、actual `['rewrite/combined/drafts/radio.js']`。下書きのファイル名が `flight-lab/src/radio.js` と同じだから（中身は写しではない。W19 の報告 5.3・factcheck 10.2 と同じ）。名前は任務の指定なので変えていない（6） |
| `node textbook/rewrite/combined/ledgers/validate.mjs` | ok（0 error・37 warning。warning は前からの署名待ちの行で、このパッチのものはない） |

## 4. 台帳の行（パッチ `reports/revise-radio.ledger.json`、20 行。章を登録するコミットで、W19-radio.ledger.json のあとに取り込む）

| 台帳 | 行 | 扱い |
|---|---|---|
| CONCEPTS | `C.two-way-comms`（新） | 住所 `law.airspace`・呼び戻し `comm.ack`（expert S8・expert-law S9。revise-law も W03 に同じ行を頼んでいる。統合役は 1 行だけ） |
| CONCEPTS | `C.class-c-shape`（新） | 住所 `law.airspace`・呼び戻し `comm.flow` |
| CONCEPTS | `C.runway-clearances`（新） | 住所 `comm.runway`・呼び戻し `comm.dep`・`comm.tower`・`ground.taxi`（`ground.taxi` は W28 が直すまで warn） |
| PROVENANCE | `ch09-fig9-9`・`ch09-fig9-10` | note だけ（factcheck N15） |
| PROVENANCE | `kiso09.27`・`kiso09.19` | note だけ（M1 の直し・ヒアバックの出典） |
| ACS-MAP | PA.II.D.K5・PA.VI.D.K2・PA.III.B.K4 | `sections` に `comm.runway`・`comm.mayday`・`comm.ctaf` を足した |
| ACS-MAP | PA.II.D.K3・K6・PA.III.A.K4・K7・PA.VI.B.K3・K4・PA.IX.B.K6 | note だけ（足した中身。expert 10 の「部分」の note の代わり。confirmed にするかは W42） |
| JCAB-MAP | ppl.4.1.2.4・cpl.4.1.2.4 | `sections` に `comm.nordo` を足した |

`CLAIMS` はパッチに入れていない（2.7）。

## 5. 未解決のこと

1. **安全レビュー**：M1・S1・S5 と、`comm.runway` の灯火・出方・低視程、`comm.xpdr` の地上の ALT は〔安全〕の文。W27・W36 の独立した確かめが要る。
2. **署名**：`radio.claims.json` の新しい 111 行（`by: revise-radio`）の確かめと署名（W27）。
3. **道具の数え方**：style の error 7（部品の見出し）と初出の形の部分一致（W01）。
4. **`comm.numbers` は変えない節**：factcheck N9（北は 360 の出典に JO 7110.65 2-4-17）と reader NU1（航空路の説明）は、変えてよい時期に。
5. **stand by と standby**：`comm.ack` は PCG の「STAND BY」と序部 `en.terms` の米国のつづり「stand by」にした。AIM 3-2-4 の例は「standby」で、`law.airspace`（revise-law）は「standby」のまま。どちらにそろえるかは W04 と統合役。
6. **TEXTBOOK のテスト 1 件**（3）。

## 6. ほかの単位にお願いしたいこと（needs from others）

1. **統合役（登録）**
   - TEXTBOOK のテスト：`textbook/test/build.test.mjs` の歩く所の除外の列に `rewrite/combined/drafts` を足す（W19 の報告 8 の 1 の案）。または登録のあとで `drafts/radio.js` の名前を変えるか消す。
   - CLAIMS は `drafts/radio.claims.json`（365 行）を取り込む。W19-radio.ledger.json の CLAIMS の 308 行は古い（54 行は文が変わった）ので、取り込まないか、取り込んだあと `ledger-row-not-in-book` の 54 行を外す。
   - `NEW_R` の `faaRI`・`aim45`・`aim55`・`asrsDL1` を `book-core.js` の `R` に足し、`NEW_R.x` を `R.x` に。`R.aim21` の名前に「2-1-6 滑走路状態表示灯（RWSL）」、`R.sfbData` の「2026-10-01 有効」を「2026-10-29 有効」に（factcheck 13 の 4）。
   - TEXTBOOK の `COUNTS`（W19 の報告 8 の 1 の数から）：用語 +11（radio3 +3・radio4 +3・radio5 +5）、章の出典 +7（radio1・radio2・radio3 +1、radio5 +4）、外部リンクの新しい URL +2（AIM 5-5・NASA ASRS）。節・確認問題・説明してみよう・例・注意・図・写真の数は W19 のとき（節 28・問 31・説明してみよう 16・例 15・注意 11・図 +2・写真 +2）から変わらない。
   - `textbook/src/style.css` に `.bk-t th, .bk-t td { overflow-wrap: break-word; }`（reader T1。reader-english E1・reader-law AS1 と同じ）。
   - CONCEPTS の `C.two-way-comms` は、このパッチと revise-law のお願い（W03 へ）が同じ行。1 行だけ取り込む。
   - DESIGN 3.3 の文言：`comm.numbers`（ICAO の言い方の列）→「ICAO の違いは `comm.icao` の表」（expert N13）、`comm.xpdr`「コード 7000 は欧州の例と書く」→「英国（CAP 413）の例」（factcheck N5）。
2. **W21（今の図：`flight-lab/src/book-figs.js`）**
   - `radioRelay`「訓練空域（VFR 1200）」と `flightOverviewMap`「VFR・1200」を「コード 1200」と分かる字に（reader C1）。
   - `patternCalls`・`ctafCalls` に 5 つの辺の名前（アップウインド・クロスウインド・ダウンウインド・ベースレグ・ファイナル。reader C2）。`patternCalls` の北東からの入り方と ③ の順番（AR1・AR4：「止まり、管制塔に contact Ground と言われてから変える」）。
   - `phoneticBoard` の例を「November Seven Lima Alpha」に（C7。本文とキャプションは Alpha）。
   - `radioCallAnatomy` の「HS」、`radioAudioPanel` の NAV、`flightOverviewMap` の「外側の区域」、`sfbLayout` に誘導路 C と ft の目盛り（LI1・EQ3・FL2・SF1）。
   - 下書きの 3 枚（`readbackLoop`・`runwayEntry`・`xpdrCodes`）を目視の記録に。
3. **W06（`flight-lab/src/book-jur.js`）**：`words` の日本の欄の「待機の位置」を「滑走路の手前で止まる位置（holding point）」のように（reader WO1。初出の形の warn「待機」×2 も消える）。`words` の囲みが `comm.words`・`comm.icao` と `comm.icao` の表の日本の列で 3 回出ること（C10）。`english.radio` の「47 CFR（米国の電波の規則）」（EQ2）、`xpdr` の「Mode 3/A」（XP1）。
4. **W04（`FL.terms`）**：アップウインド（upwind leg）の行（crosswind-leg・downwind・base-leg・final はある）。地上滑走の指示（taxi instructions）、強化された誘導路中心線（enhanced taxiway centerline）、駐機場（ramp）、一次レーダー・二次レーダー、スケルチ、最低燃料（minimum fuel。JCAB はミニマムフューエル：expert）、航空交通業務・警急業務・滑走路誤進入・ヒアバック・ホットスポット・管制指示・磁航路（W19 の報告 8 の 2 と同じ）。`clearance` の注に航空法第 96 条・第 97 条の根拠（expert 12 の 5）。stand by／standby（5 の 5）。
5. **W28（第 2 部 `ground.taxi`）**：停止線の段落を思い出そう（2〜3 行、→ `bk.see('comm.runway', '滑走路に入る許可と誤進入の防ぎ方')`）にし、「taxi via … は滑走路の手前まで（{ch:radio4}）」のリンクを `comm.runway` に（expert S8。CONCEPTS `C.runway-clearances`）。
6. **W22（`flight-lab/src/book-photos-k.js` の `ch04-photo5`）**：キャプションの「4 桁」を「4 けた」に、「ADF 受信機」に 1 句（reader XP2・XP3）。
7. **W19-law／revise-law**：`law.airspace` は交信の確立と Class C の形の住所のまま（このパッチの CONCEPTS 2 行）。`law.airspace` から `comm.ack` へのリンクの題「Class C 空域に入る前の交信の確立」は、`comm.ack` の小見出しとして残っている。stand by／standby（5 の 5）。
8. **W01（検査の道具）**：`skipForStyle` に部品の見出し（W14 の 1 行）。初出の形で長い語の中の短い正式名（「気圧高度計」の「気圧高度」、「計器飛行証明」の「計器飛行」）を数えない。主張の抜き出しが CAP 413 などの出典とコードの数字を拾うか（factcheck N14）。
9. **W27（R2 の確かめ）・W36（安全レビュー）**：5 の 1・2。M1・S1・S5 は AIM 4-1-15・4-1-17・4-1-18・4-3-21・4-3-24・4-4-10・6-2-1・6-2-2・6-3-2、PCG：Air Traffic Clearance、14 CFR 91.123(c) で。
10. **W42（ACS・JCAB の確かめ）**：4 のパッチの行（sections と note）。IR.V.B.K2 の `comm.radar`（expert N12）、JCAB の ppl/cpl.4.2.x の行の note に米国側の節（expert 4.2）。
11. **W23（第 1 部の問題）**：正解の位置（今の 25 問のほとんどが B。並べ替えない）。
