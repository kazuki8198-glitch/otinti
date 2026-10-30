# 直し役の報告：第 1 部 第 11 章 `navb`「航法の基礎」（revise-navb）

単位：章 `navb` の直し役（R2・DESIGN 7.2 の W18 の直し。書いた W18・事実確認役・2 人の読み手とは別の役）。日付：2026-10-30。
直したもの：`textbook/rewrite/combined/drafts/navb.js`・`drafts/navb-figs.js`・`drafts/navb.claims.json`、パッチ `reports/revise-navb.ledger.json`（新）。
もとにした指摘：
- `reports/factcheck-navb.md`：must 0・should 1・nit 8（うち 1 つは TEXTBOOK のテストの件で `navb` の外）
- `reports/reader-navb.md`：must 1・should 12・nit 37
- `reports/expert-navb.md`：must 0・should 14・nit 10

守った決まり：DESIGN 6.2 の 15 の決まり、3.2・3.3（第 1 部 第 11 章の行）・3.4、DECISIONS（判断 2・3・3 の補足）、STYLE、CLAUDE.md。`flight-lab/kiso/` は読んだだけ。git の操作はしていない。

**結論**
- must は 1 つ（reader T1）で、直した。`navb.calc` のねらいを「フライトコンピューターで何が計算できるかを知り、答えを見当の数と比べられるようにする」に下げた。目盛りの合わせ方は、道具の説明書の例題で練習すると書いた（PHAK p.16-12）。
- should は 3 人分で 27 個。持ち物の 3 ファイルで直せて、一次資料で確かめられたものは全部直した。
  - 一部だけ直したものと、直さなかったものは 2.4 に理由を書いた。
  - 例：経度時は、定義を一次資料で確かめられず書いていない。米国の DA は、密度高度ではなく IFH の決心高度で書いた。
- factcheck の S1（日本の燃料の囲み）は、案 (b) で直した。手書きのまま、条文（航空法第 2・63・73 条の 2、施行規則第 153・164 条の 15）を書いた。expert の S10「法令の量がないことは、予備がいらないという意味ではない」も足した。案 (a) を選ばなかった理由は 2.1。〔安全〕の文なので、安全レビューが要る。
- 章の検査の error 12 は、全部が道具の数え方による（W10b の部品の見出しを文と数える）。
  - W14 の `skipForStyle` の 1 行を入れた道具の写しでは、error 0・warn 4。
  - 主張の札は 138 文の全部に付いた（台帳の写しで claims warn 0）。
- 新しい事実は全部、一次資料を自分で取り直して確かめた（2.5）。PHAK 第 8・11・16 章、IFH、Bowditch 2024、AIM 1-1-18、JCAB 例題集、e-Gov の写し、NICT、国立天文台を使った。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `drafts/navb.js` | 4 節すべてと章末を直した（2）。<br>出典 `NEW_R` に `nictJst`（NICT「日本標準時」）を足し、`bowditch` の label に 103・907・945・946 を足した。PDF を直接開ける URL を注に書いた（factcheck N8）。<br>`refs` に `R.phak8`・`R.ifh`・`R.egovKokuKisoku`・`NEW_R.nictJst` を足した。<br>頭の注に、直しの要約を書いた（燃料の囲みは FL.jur `fuel.vfr` とそろえて保つこと、など）。 |
| `drafts/navb-figs.js` | 図 5 枚の字と線を直した（2.6）。図を足したり外したりはしていない。頭の一覧に直しを書いた。 |
| `drafts/navb.claims.json` | 主張の札を作り直した（113 → 189 行。2.7）。 |
| `reports/revise-navb.ledger.json`（新） | CONCEPTS の行の案 2 つ（`C.variation-deviation`・`C.fuel-planning`）。台帳の検査（`src/schema.mjs` の UNIT）が単位の形を求めるので、`unit` は W18 にした（4）。 |
| `reports/revise-navb.md`（新） | この報告 |

ほかのファイルは変えていない（`flight-lab/kiso/`・台帳の本体・`FL.terms`・`FL.jur`・製品のファイル・DESIGN・W18 の報告とパッチ）。

製品のテストを流すと、`flight-lab/outputs/FLIGHT-LAB.html` と `cadet/outputs/CADET.html` が作り直される。この 2 つと、ほかの章の下書き（`aero*`・`inst*`・`perfwb*`・`sys*`・`wx*`）は、ほかの単位の作業で変わっていた。私は触っていない。下書きは製品が読まないので、出力の中身は変わらない。

## 2. したことと理由

### 2.1 事実確認（`factcheck-navb.md`）

| # | 指摘 | 扱い | 今の文（場所） |
|---|---|---|---|
| S1 | 日本の燃料の囲み（`bk.jp`）が、FL.jur `fuel.vfr` の日本の欄を手で写している。機長の確認の条文がない | 直した（案 b） | `navb.calc` の `bk.jp`：<br>「日本の航空法第 63 条が燃料の量を決めているのは、2 つの場合です。航空運送事業の飛行と、計器飛行方式（IFR：…）の飛行です。航空運送事業は、他人の求めに応じ、航空機でお金を受け取って旅客や貨物を運ぶ事業です（航空法第 2 条）。量は、航空法施行規則第 153 条が決めています。」<br>「自家用や訓練の VFR の飛行には、法令で決まった最低量はありません。それは、予備がいらないという意味ではありません。機長（pilot in command）は出発前に、燃料の搭載量と品質を確かめます（航空法第 73 条の 2・航空法施行規則第 164 条の 15）。訓練では、学校の規程の量を積みます（対照の囲みは → 燃料の計画と予備）。」<br>条文の札は 5 行（2.7）。頭の注に「FL.jur fuel.vfr とそろえて保つ」と書いた。 |
| N1 | 確認問題 1 の理由の出典 | 直した | 「（節「地球・緯度と経度・縮尺と投影・大圏と航程線」。1° ＝ 60′：Bowditch 1705）」。問いの数も変えた（C7） |
| N2 | 「地球は 24 時間で 360° 回る」 | 直した | 「1 日 24 時間で、太陽（平均の太陽）は空を 1 周（360°）して見えます。だから、1 時間に 15° です（Bowditch 1702・1705）。」 |
| N3 | 札の出典の項とページ | 直した | `navb.earth#f14a1f3a`・`#bf48c130` を「Bowditch 103・301」に、比重の文の札を「W&B p.3-5」に（2.7） |
| N4 | 使用可能燃料の初出の形 | 直した | 「計画では、使用可能燃料（usable fuel）、つまり使える燃料の量と比べます。」 |
| N5 | 基礎教材とほぼ同じ 2 文 | 直した | 「風の成分を計算する前に、風向と航路が同じ北（真北か磁北か）で測った値かを確かめます。」<br>説明してみよう 1：「途中で位置を確かめる目印（チェックポイント）も、地図の上で選んでおきます（選び方は第 3 部）。」 |
| N6 | 6 つの量のうち 4 つ | 直した | 「3 本の向きと長さ、合わせて 6 つの量は、ふつう 4 つが分かれば残りの 2 つが決まります。」 |
| N7 | 「コンパス針路」が FL.terms にない | W04 に頼む（6） | 本文は「コンパス針路（CH：compass heading）」のまま。羅北・羅方位との関係を本文に書いた（reader N4） |
| N8 | Bowditch の URL が JavaScript の頁 | 直した（注） | `NEW_R.bowditch` の上の注に、PDF の直接の URL と一覧の API を書いた。登録のとき R の注へ（統合役） |
| （なし） | TEXTBOOK のテストの落ち（`drafts/radio.js`） | 持ち物の外 | 6 に書いた（W19-radio・統合役） |

**S1 で案 (a)（`bk.jp('fuel.vfr')` でデータから描く）を選ばなかった理由**
1. (a) には、DESIGN 3.4 の表と `flight-lab/src/book-jur.js` の `fuel.vfr` の `boxes` に `navb.calc` を足す直しが要る。どちらも私の持ち物ではない。足さないまま登録すると、`jur.test.mjs` の ①（「囲みはその項目の節にだけ」）で止まる。
2. FL.jur の日本の欄は常体（「…最低量はない（…確かめる）。…従う」）。試しに (a) の形で `check-chapter` を流すと、style の error が 2 増えた（not-polite 2）。warn も 2 増えた（初出の形「機長」「計器飛行方式」）。試した下書きはスクラッチの写しで、持ち物は変えていない。
3. expert S10 の 1 文（予備はいらないという意味ではない）は、今の FL.jur の欄にない。

そこで (b) で直した。どちらにするかは統合役が決める。
- (b) のままにするなら、DESIGN 3.4 の `fuel.vfr` の行に「`navb.calc` に手書きの `bk.jp`（K.navigation.K1 の直し。FL.jur を直すときに一緒に直す）」と注を足してほしい。
- (a) に替えるなら、W06 が FL.jur の日本の欄に S10 の 1 文を足す。そのうえで `boxes` と DESIGN 3.4 を直し、`bk.jp('fuel.vfr')` に替える（6）。

### 2.2 初学者の読み（`reader-navb.md`）

**must**
- **T1**：直した（案 a）。
  - ねらい：「フライトコンピューター（flight computer）で何が計算できるかを知り、その答えを見当の数と比べられるようにします。」
  - 本文：「目盛りの合わせ方は、道具の説明書の例題で練習します（PHAK 第 16 章）。」
  - 要約の「確かめられるようにします」も「何が計算できるかを知ります」に下げた。
  - 案 b（比の面の 3 段の手順）は書いていない。理由は 2 つ。PHAK も手順を道具の説明書に任せている（p.16-12）。expert も「実物を手にして教える方がよい」として案 a を推した。

**should 12**

| # | 扱い | 今の文（場所） |
|---|---|---|
| N1 | 直した | `navb.north`：「この本では、偏差も自差も E か W で書きます。真 → 磁 → コンパスの向きに直すときは、**W は足し、E は引きます**（PHAK 第 16 章）。」「反対に、コンパス → 磁 → 真の向きに直すときは、E を足し、W を引きます（Bowditch 946）。たとえば、磁北が基準の風の向きを、真北が基準の向きに直すときです。」<br>ここが大切・よくある間違い・用語の表・確認問題 2 の理由・説明してみよう 5・図 2 枚のキャプションにも「真 → 磁 → コンパスでは」を付けた |
| N2 | 直した | ここを混同しない 3：「偏差を、東は＋、西は − の数で書く本もあります（6°W は −6）。そのときの式は「磁針路 ＝ 真針路 − 偏差」で、090 −（−6）＝ 096° と、答えは同じです。」 |
| W1 | 直した | `navb.wind`：「風が左右のどちらから吹くかは、風向から航路を引いて決めます。答えが 0° と 180° の間なら右から、180° と 360° の間か負の数なら左からです。」<br>例 2 つ：030 − 090 ＝ −60 → 左、230 − 180 ＝ ＋50 → 右。<br>計算演習の答えと判断の目（「風向 − 航路の符号で、風が左右のどちらからかを決めたか」）も同じ型にした |
| W2 | 直した | 「B では、空気に対する速度（TAS 100 kt）の矢印が、直角三角形の斜めの辺（斜辺）です。横切る辺 20 kt と斜辺の比なので、sin を使います。A では地面に対する速度の矢印が斜辺なので、横切る辺と東向きの辺の比の tan を使います。」「sin が 0.2 になる角度は、関数電卓の sin⁻¹ で約 11.5° です。」 |
| C3 | 直した | 初出で略語を開いた：真航路（TC：true course）・真針路（TH：true heading）・磁針路（MH：magnetic heading）・コンパス針路（CH：compass heading）・磁航路（magnetic course。図の MC）・偏流角（DA：drift angle）・偏流修正角（WCA：wind correction angle）・航跡の TR。<br>用語の表に 3 行（真航路・真針路／磁航路・磁針路・コンパス針路／相対方位）。図 `windTriangle` の箱に TC・TH・MH・CH（2.6） |
| C4 | 直した（案 a） | 偏差の段落の後ろに：「囲みの SBAS は、satellite-based augmentation system の略です。GPS の誤差を直す信号を静止衛星から送り、位置の精度と信頼性を上げるしくみです（米国の AIM 1-1-18）。くわしくは → 予告：GPS と CDI の目盛り（第 3 部）で学びます。」<br>WMM も「世界磁気モデル（WMM）」と開いた。案 b（囲みを分ける）は統合役・W06 に（6） |
| C1 | 直した | 「この章の「（Bowditch 105）」などは、航海の教科書 American Practical Navigator の項の番号です。米国の国家地球空間情報局（NGA）が出している本で、最初に書いた人の名前から Bowditch と呼ばれます。」 |
| C2 | 直した | 要約の「電波航法」を「無線航法」（FL.terms の正式名）に。第 3 部の章の題は W04 と第 3 部の単位に（6） |
| E1 | 直した（文で） | 「円錐は、地球に少しめり込むようにかぶせ、2 本の緯線（標準緯線）で地球の表面と交わるように置きます（Bowditch 503・513）。」「正角（conformal）とは、狭い範囲の角度が、地球の上と同じ角度で写ることです（Bowditch 502・505）。だから経線と緯線は、図の上でも直角に交わります。」<br>図に円錐の小さな絵は足していない（390 px で、2 つの図法を並べた図の中に場所がない。文で足りると判断） |
| T2 | 直した | 「積んだ燃料で飛べると計算した時間を超える前、または燃料計が少ないことを示す前に、地上にいる計画にします（PHAK 第 16 章）。」 |
| T3 | 直した | 「上昇中は、同じ対気速度でも、巡航より GS が小さくなります（PHAK 第 16 章）。だから、上昇する区間は、同じ距離でも時間が長くなり、燃料も多く使います。上昇の時間・燃料・距離は、その機体の上昇の図（fuel, time, and distance to climb）で読みます（PHAK 第 11 章）。」<br>「なぜ同じ対気速度で GS が小さいか」の理由は、PHAK に書きがないので書いていない |
| E2 | 直した | もっと深く：「その場所の経線を基準にした時刻を、地方時といいます。平均太陽時による地方時は、地方平均時（local mean time）です。ふだんの時計の時刻（序部の「現地の時刻」）とは、別のものです。」（国立天文台 暦Wiki「地方時」・Bowditch 1702）<br>計算演習の答え：「2 つの地点が同じ時間帯にあれば、ふだんの時計の時刻は同じです。」 |

**nit**
- **直したもの（33）**：C5・C7（確認問題 4 問の数を変えた）・C8・C9・E3・E4・E5（「大圏と航程線」を投影法の前へ）・E6・E7・E8・E9・E10・E11・E12・N3・N5・N7・N8・W3・W4・W5・W6・W7・W8・W9・W10・T4・T5・T6・T7・T8・T9・T10。
  - C7 で変えた 4 問：34°45′N・真針路 270°/6°W/3°E・真航路 180°/110 kt/270°/22 kt・45 NM/90 kt/8.0 gal/h。正解の位置（0・3・1・2）は変えていない。
  - 本はまだ登録されていないので、記録のキー（DESIGN 6.2 の決まり 4）には当たらない。
  - E8 は「船の航海に最もよく使われる（Bowditch 503）。パイロットは、ランベルトの図との違いとして、その特徴を知っておく」。
  - E9 は「南北の向きに刻んだ緯度の目盛り」。経線に刻むとまでは一次資料で確かめていないので、そうは書いていない。
- **ほかの単位へ（4）**：C6（「フライトコンピューター」の書き方。W04・統合役）・C10（`sys.compass` の思い出そう。W15）・N4（羅方位とコンパス針路の名前。W04。本文に羅北・羅方位の関係は書いた）・N6（FOR を磁針路と磁方位のどちらで書くか。`navb` は磁針路。W15 に合わせてもらう）。
- **一部**：C7 の説明してみよう（問 7・9・10・11）の数は変えていない。基礎教材の問 q7〜q11 を書き直した記述の問いで（`from` も同じ）、説明させることが目的のため。

### 2.3 専門家の読み（`expert-navb.md`）

**should 14**

| # | 扱い | 今の文（場所） |
|---|---|---|
| S1 | 直した | ねらい：「航法は、今どこにいるかを確かめ、どこへ向かうかを決め、いつ着くかを予想し続ける技術です。燃料の見込みも、ここから出します。」<br>小見出し「航法の 3 つの作業」と表（3 つめを「いつ着くか」に）。<br>「JCAB の学科では、この 3 つを航法の 3 作業と呼びます。「位置の確認」「針路（ヘディング、heading）の算出」「到達時刻の予想」です（JCAB の学科試験例題集）。燃料の量は 3 作業に入らず、3 作業から出す計画の一部です。」（自家用 例題 1 で確かめた） |
| S2 | 直した | 「コンパスが指す北を、羅北（コンパスの北）といいます。」「コンパスの北（羅北）が磁北の東にずれていれば自差 E、西にずれていれば自差 W です（Bowditch 945）。上の図では、コンパスの北が磁北の東にあるので、自差は E です。」図のキャプションにも（2.6）。事業用 例題 9 で確かめた |
| S3 | 直した | 小見出し「相対方位：機首から測る向き」：<br>「機首から時計回りに測った、目標の方向の角度を、**相対方位（relative bearing）**といいます（IFH 第 9 章）。機首の真正面が 000°、右の真横が 090° です。」<br>式「目標の磁方位 ＝ 磁針路 ＋ 相対方位（360° を超えたら 360 を引く）」と、IFH 9-3 の例（045° ＋ 135° ＝ 180°）。ここが大切・用語の表・例にも。<br>`nav.adf` への予告は付けていない（`nav.adf` はまだ本にない。決まり 13） |
| S4 | 直した | 正角の意味（E1）。<br>「ランベルト正角円錐図法の図は、標準緯線から遠く離れなければ、図全体のひずみが小さく、縮尺がほぼ一定です（Bowditch 513・3419）。」<br>メルカトル：「赤道で地球に接する円筒に写す投影法です（Bowditch 503）。経線は平行な縦の線になり、緯線の間隔は高緯度ほど広がります（Bowditch 505・506）。」<br>比べる表（写す面・経線・経線と緯線・縮尺・図の上の直線）を足した。図のキャプションにも緯線の間隔 |
| S5 | 一部 | 小圏：「中心を通らない平面と交わってできる円は、小圏（small circle）です。赤道のほかの緯線は、どれも小圏です（Bowditch 104）。」<br>真子午線：「経線は真北を指すので、真子午線（true meridian）ともいいます（PHAK 第 16 章）。」<br>**経度時は書いていない**：JCAB の資料でも検索でも定義を確かめられず、〔要確認〕として事実の文にしない（5） |
| S6 | 直した | 「このほか、機外からの電波や目印を使わずに位置を出す自立航法があります。慣性航法装置（INS：inertial navigation system）が、その例です（IFH 第 9 章）。パイロットが決めた地点の間を、まっすぐ結ぶ経路で飛べるようにする広域航法（RNAV：area navigation）もあります（PHAK 第 16 章）。」と、GPS への予告 |
| S7 | 直した（DA の中身は変えた） | 略語を初出で開いた（C3）。航跡に「JCAB の問題では TR と書きます」。<br>ここを混同しない：「JCAB の問題の DA は偏流角です。米国の計器進入の資料では、DA は decision altitude（進入を続けるかを決める高度）の略です（IFH）。」<br>expert の案は「米国の DA は密度高度」だった。しかし FAA の一次資料（PHAK 第 8・11 章・ACS）は密度高度を略さずに書き、IFH の用語集は DA を decision altitude としている。確かめられた方で書いた。用語の表の注も同じ |
| S8 | 直した | 計算演習を「10:20 EDT に出発点の上空を通り…到達予定時刻を UTC で」にした。<br>答え：「EDT は UTC より 4 時間遅れているので、4 時間足して、10:20 EDT は 1420Z です。45 ÷ 108 × 60 ＝ 25 分なので、ETA は 1445Z（10:45 EDT）です。」<br>本文に「現地の時刻とは序部の方法で換算します」と書き、思い出そうに `basics.time` を足した |
| S9 | 直した | 「TAS も計算できます。較正対気速度（CAS：calibrated airspeed）・気圧高度（pressure altitude）・外気温を使います（PHAK 第 8 章）。密度高度（density altitude）は、気圧高度と外気温から出せます（PHAK 第 11 章）。TAS の目安は → 速度の種類、密度高度は → 密度高度 で学びました。」ねらいは T1 で下げた |
| S10 | 直した | S1 の囲みに「それは、予備がいらないという意味ではありません。」。本文（共通）にも「法令の決まりがない飛行でも、安全のために予備の燃料を足します（PHAK 第 16 章）。」。説明してみよう 11 にも「法令の決まりがなくても、予備は積みます。」 |
| S11 | 一部 | 燃料消費率の太字の定義を外した（住所は `perf.range` の太字）。積む燃料の計画は `perf.fuel` へのリンクと思い出そうにした（「米国の VFR の決まりと計画の手順は、→ 燃料の計画と予備 にあります」）。名前は「使用可能燃料（usable fuel）、つまり使える燃料」。<br>積む燃料の種類（始動・タキシー・上昇・予備・代替）の短い列挙は残した。JCAB の見出し「飛行に必要な燃料の種類」（ppl.3.1.2.5）の節が `navb.calc` だから。<br>CONCEPTS の行の案 `C.fuel-planning` をパッチに書いた。`wb.limits` の換算の表の 6 lb・0.72 kg は W16 の持ち物で、DESIGN 3.3 が `navb.calc` に比重を置いているので、どちらを残すかは統合役（6） |
| S12 | 直した（台帳の案） | CONCEPTS `C.variation-deviation`（住所 `navb.north`、呼び戻し `basics.time`・`sys.compass`・`nav.plan`）をパッチに書いた。`navb.north` は住所として今のまま。`sys.compass`・`nav.plan` の直しは W15・W29（6） |
| S13 | 一部 | A を「図の A は、序部で見た例と同じです（→ 速度の種類・風のベクトル）。」で結び、計算を 1 文に縮めた（数はそのまま：expert の案のとおり）。<br>`navb.calc` は「区間の時間は、序部で学んだ式で、距離を GS で割って求めます」とし、式の行は残した。図 `navbTimeFuel` が使う式で、JCAB の「所要時間の計算」の節がここだから。<br>`basics.speed` を 3 行に縮めるかは W10 の持ち物・統合役（6） |
| S14 | 直した | 計算演習「簡単な航法計算（JCAB の型）」：<br>①「20 分で、燃料を 3.0 gal 使いました」→ 9.0 gal/h<br>②「対地高度 3,000 ft で…俯角…45°」→「45° の直角三角形では、高さと水平距離が同じ長さです（tan 45° ＝ 1）。だから、水平距離は 3,000 ft です。1 NM は約 6,076 ft なので、約 0.5 NM です。」（自家用 例題 5・11 の型） |

**nit**
- **直したもの（8）**：
  - N1（偏流角の要素：「TAS が小さいほど大きくなります。機体の大きさには関係しません（JCAB の学科試験例題集）」。例題 6 で確かめた）
  - N2（「同じ「60」の考え方を、第 3 部では…（→ 予告：地文航法と推測航法）」）
  - N3（T3 と同じ。理由の Vy は書いていない：PHAK に書きがない）
  - N4（「風は燃料消費率を変えず、GS と時間を変えます」。決まる要素は出力・回転数・混合比：PHAK）
  - N5（代替飛行場の分）
  - N6（思い出そう「METAR（定時の飛行場の実況、METAR）・TAF・上空の風の予報は真北、ATIS と管制塔の風・滑走路の番号は磁北」）
  - N7（「東経（日本など）では東へ行くほど」、もっと深くに東経 135° と 140° の例と「JST は東経 135° の経線の時刻で UTC より 9 時間進んでいる（NICT）」）
  - N10（羅北。S2）
- **一部（1）**：N8（地点プロット法）。図 `navbLatLon` の点 P で、緯度の目盛り → 経度の目盛りの順に数える 2 文を書いた。区分航空図の目盛りの間隔は確かめていないので書いていない。
- **直さなかったもの（1）**：N9（風防の中で動かない地上の点が航跡、という見方）。飛びながら使う技術なので、第 3 部 `nav.dr` に任せる（W33・W34。6）。

### 2.4 直さなかったもの・一部だけのもの（理由）

| 指摘 | 理由 |
|---|---|
| factcheck S1 の案 (a) | 2.1。案 (b) で直し、決めるのは統合役 |
| reader T1 の案 (b)・E1 の円錐の絵 | 2.2 |
| reader C7 の説明してみよう | 2.2 |
| expert S5 の経度時 | 定義を一次資料で確かめられない（〔要確認〕）。事実として書かない（DESIGN の〔要確認〕の決まり、STYLE「事実と数値」） |
| expert S7 の「米国の DA は密度高度」 | FAA の一次資料では確かめられない。IFH の decision altitude（決心高度）で書いた |
| expert S3 の `nav.adf` への予告 | `nav.adf` はまだ本にない（決まり 13） |
| expert S11・S13 の一部 | 住所の決め方は、ほかの単位の下書き（`perfwb`・`basics`）にかかる。統合役が決める（CONCEPTS の案はパッチに） |
| expert N3・reader T3 の理由 | 上昇で GS が小さくなる理由は PHAK に書きがない（推測で埋めない） |
| expert N8 の目盛りの間隔 | 確かめていない |
| expert N9 | 第 3 部の技術 |
| factcheck N7・reader N4・C2・C6・C10・N6 | 用語の表（W04）・ほかの章（W15）の持ち物（6） |

### 2.5 新しい事実と、確かめた一次資料（2026-10-30。全部、自分で取り直して読んだ）

取り直したものは、スクラッチの新しいフォルダに置いて読んだ。PDF は `pdftotext -layout` で読んだ。

| 資料 | 取った所 | 使った文 |
|---|---|---|
| FAA PHAK 25C 第 16 章（`R.phak16` の PDF） | faa.gov の 18_phak_ch16.pdf | p.16-2（VFR Terminal Area Charts 1:250,000・1 inch ＝ 3.43 NM）、p.16-6（meridians that point toward TN）、p.16-7（if variation is west, add; if east, subtract、“east is least (subtract) and west is best (add)”、自差表の補間の例 180° 0°・210° ＋2° → 195° ＋1°）、p.16-11（rpm・混合比・出力で燃料消費率が変わる、同じ TAS なら一定で風があれば GS で計算、始動・タキシー・上昇の多い燃料、上昇中は同じ対気速度で GS が小さい、Additional fuel for adequate reserve should also be added as a safety measure、燃料で飛べると計算した時間・燃料計の 2 つの前に地上に）、p.16-12（Pilotage is navigation by reference to landmarks or checkpoints、instruction book … sample problems）、RNAV（permits electronic course guidance on any direct route between points established by the pilot）、TC・TH・MH・CH・WCA の略語 |
| FAA PHAK 25C 第 8 章（`R.phak8`） | faa.gov の 10_phak_ch8.pdf | TAS は flight computer で CAS・pressure altitude・temperature から |
| FAA PHAK 25C 第 11 章 | faa.gov の 13_phak_ch11.pdf | p.11-4（Using a flight computer, density altitude can be computed by inputting the pressure altitude and outside air temperature）、図 11-25（Fuel, time, and distance climb chart） |
| FAA IFH FAA-H-8083-15B（`R.ifh`） | faa.gov の PDF | 9-2・9-3（RB は機首から時計回り、MH ＋ RB ＝ MB、RB 135°・MH 045° → MB 180°）、9-34（INS … without any input from outside of the aircraft. It is fully self-contained.）、用語集（Relative bearing、Decision altitude (DA)） |
| NGA Pub. No. 9 Bowditch 2024 年版 第 1 巻 | NGA MSI の API（Bowditch_Vol_1_LoRes.pdf、44 MB） | 扉（NGA が出版・Nathaniel Bowditch）、104（small circle、All other parallels are small circles）、107（Track (TR)）、502（conformal・性質の両立しない組）、503（メルカトルは赤道で接する円筒・maritime navigation で最も使われる、ランベルトは 2 つの小円で切る割線円錐）、504〜506（経線は等間隔の縦線、緯度の伸びは secant、緯度の長さは赤道から遠いほど長い）、513（標準緯線から遠くなければひずみは小さい・直線はほぼ大圏）、907（WMM は NCEI と BGS が作る）、945（羅北が磁北の東なら自差 E）、946（correcting は E を足し、uncorrecting は E を引き W を足す）、1702・1705（平均の太陽・15°/h・4m ＝ 1°・1′ ＝ 60″）、1708、3419（ランベルト図の距離は緯度の目盛り、ほぼ一定） |
| FAA AIM 1-1-18 | faa.gov の chap1_section_1.html（WebFetch は 403、curl で取得） | WAAS は GPS の accuracy・integrity・availability を上げる、SBAS、補正の信号を静止衛星から送る |
| JCAB 例題集 2026 年 6 月（自家用・事業用） | mlit.go.jp の 001761095.pdf・001761087.pdf（sha256 が FL.terms の値と一致） | 自家用 空中航法 例題 1（3 作業）・5（燃料消費率）・6（TH と TR・DA・TAS と DA・機体の大きさ）・10（偏差・自差の E/W）・11（俯角 45°）・13（磁北と羅北）。事業用 例題 1（相対方位）・5（メルカトルとランバートの 4 つの記述）・9（自差 W） |
| JCAB 出題範囲参考 | `ledgers/src/sources/mlit/*.txt` | 小圏・真子午線・経度時・自立航法・相対方位・飛行に必要な燃料の種類 |
| e-Gov の写し | `textbook/rewrite/sources/egov/articles/` | 航空法第 2 条第 18 項（航空運送事業の定義）・第 63 条・第 73 条の 2、施行規則第 164 条の 15 第 1 項第 5 号（燃料及び滑油の搭載量並びにそれらの品質） |
| NICT「日本標準時」 | https://www.nict.go.jp/sts/jst.html | 東経 135 度の子午線の時刻は GMT から 9 時間進めたもの、UTC と日本の標準時の間に 9 時間の時差 |
| 国立天文台 暦計算室「暦Wiki／地方時」 | eco.mtk.nao.ac.jp（EUC-JP を変換して読んだ） | 経度の差に応じて補正した時刻を地方時、平均太陽時に対応するものを地方平均時 |

確かめられなかったこと：JCAB の語「経度時」の定義（検索でも一次資料が見つからない）。

計算（python で検算）：
- 34°45′ ＝ 34.75°、0.45° ＝ 27′
- 270 ＋ 6 − 3 ＝ 273
- asin(22/110) ＝ 11.54°、真針路 191.5°、GS 107.8 kt
- 45/90 ＝ 0.5 h ＝ 30 分、8.0 × 0.5 ＝ 4.0 gal（50 分と読むと 6.7 gal）
- 1,852 ÷ 0.3048 ＝ 6,076.1 ft、3,000 ÷ 6,076.1 ＝ 0.494 NM
- 3.0 × 60 ÷ 20 ＝ 9.0
- 5 × 4 ＝ 20 分
- 水 8.33 lb/gal ＝ 0.998 kg/L、AVGAS 6.01 lb/gal ＝ 0.720 kg/L、6.01 ÷ 8.33 ＝ 0.7215
- (045 ＋ 135) ＝ 180
- 補間 195° ＝ ＋1°
- 350 − 010 ＝ 340 → 20°
- 10:20 EDT ＋ 4 h ＝ 1420Z、＋25 分 ＝ 1445Z

### 2.6 図（`navb-figs.js`。390 px で描いて目で見た）

| 図 | 直したこと | 指摘 |
|---|---|---|
| `navbLatLon` | 「経線（子午線）」から 35° の経線へ引き出し線 | reader E12 |
| `navbProjections` | 左下に「↑ 上が北」。キャプションに「メルカトル図法の緯線の間隔は、上（高緯度）ほど広くなります」 | reader E11・expert S4 |
| `navbNorths` | キャプションに「コンパスの北が磁北の東にあるので E。真 → 磁 → コンパスでは W は足し、E は引く」 | expert S2・reader N1 |
| `windTriangle` | 4 つの箱に TC・TH・MH・CH（「CH 091°」など）。<br>段の字を「偏差 6°W ＋6°」「自差 2°W ＋2°」にそろえた。<br>MC の行を「磁航路 MC ＝ 真航路 ＋ 偏差 ＝ 096°（米国の VFR の巡航高度に使う）」にした。<br>キャプションに「真 → 磁 → コンパスでは」 | reader C3・W6・N1 |
| `navbTimeFuel` | 帯の上に「帯の長さ ＝ かかる時間」。キャプションに「帯の長さは時間」 | reader T8 |

- `navbWindFix` の「流される角」「風上へ」と、偏流角・偏流修正角は、本文の文で結んだ（reader W5）。図に語を入れると、図が初出の数え方に当たる（W18 の判断）ため。
- `check-chapter` の図の検査は 7 枚とも 0 件（390 px・最小 10 px・重なり）。
- `windTriangle` は登録のとき `book-figs.js` の同じ名前の図を置き換え、`nav.plan` も使う。字が変わるので、`nav.plan` で読んでも合うことを統合役が確かめてほしい（6）。

### 2.7 主張の台帳（`drafts/navb.claims.json`）

`check-chapter.mjs --claims-out` で抜き出し直した。抜き出された文は 113 → 138。

| 区分 | 行数 | 扱い |
|---|---|---|
| 文の変わらない行 | 83 | W18 の札のまま。factcheck N3 の 2 行（`navb.earth#f14a1f3a`・`#bf48c130`）は出典の項を Bowditch 103・301 に直した（`note`） |
| 文が変わった行 | 25 | 前の行の札と出典を引き継ぎ、`note` に前の ID を書いた（`by: W18・revise-navb`） |
| 新しい行 | 30 | `by: revise-navb`。条文 4（第 63 条・第 2 条・施行規則第 153 条・第 73 条の 2 と施行規則第 164 条の 15） |
| `extracted: false` の行 | 51 | 道具が抜き出さない（数と単位のない）新しい事実の文に、札と出典を付けた。ID は「節#hand-8 桁」。すべての文が、描いた本文の中にあることを確かめた |
| 消えた行 | 30 | 直した文の前の ID |

- 合計 189 行：参考値 180・条文 5・教材値 4、うち例題 79。`checkedBy` は付けていない（確かめ役が付ける）。
- 比重の文の出典は「W&B 図 3-4 は p.3-4、比重 × 8.345 の文は p.3-5」（factcheck N3）。
- 作ったスクリプトは、スクラッチの `revnavb/build_claims.py`。

## 3. 検査の結果

| 検査 | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/navb-figs.js textbook/rewrite/combined/drafts/navb.js`（Chromium あり） | **error 12・warn 8・pending 1・info 411**。<br>・error 12：style の not-polite 6（「思い出そう」4・「ここを混同しない」2）と taigen-dome 6（「答えと解き方」4・「判断の目」2）。全部が W10b の部品の見出しを文と数えるもの（W14 の報告 5.2）。直す前の 11 より 1 多いのは、計算演習を 1 つ足したため<br>・warn：style 1（「計器飛行」の初出。「計器飛行方式」「計器進入」の中の字を数える道具の数え方。直す前からある）、concepts 3（偏差・自差・偏流修正角の太字が `sys.compass`・`nav.plan` にもある。S12 のパッチと W15・W29）、claims 4（今の CLAIMS.json にこの章の行がないため）<br>・pending 1：CALC.json がない<br>・chapters・form・data・volume・jurisdiction・chapter-refs・figures（7 枚・390 px）・questions・photos・jur・path・provenance・egov は 0<br>・本文 376 文・平均 34.8 字・最長 77 字・80 字超 0・留保 0。本文 16,395 字（直す前 12,559 字。まず読む節の上限の 0.09 倍）。後ろの部への `bk.see` は 5 本（どれも予告） |
| 同じ検査を、台帳の写しに `navb.claims.json` の 189 行を足して（`COMBINED_LEDGERS`、スクラッチ） | claims：**138/138 に札・warn 0**。合計 error 12・warn 4・pending 1 |
| 同じ検査を、W14 の `skipForStyle` の 1 行を入れた道具の写しで（スクラッチ。道具そのものは変えていない。`--no-browser`、台帳の写しつき） | **error 0**・warn 4（style 1・concepts 3）・pending 1 |
| 台帳：`node textbook/rewrite/combined/ledgers/validate.mjs` | **ok — 0 error・37 warning**（warning は前からある PROVENANCE の署名待ち）。パッチ 36 ファイル（`revise-navb.ledger.json` を含む） |
| FLIGHT LAB：`cd flight-lab && npm run -s test:fast` | **86/86 pass** |
| CADET：`cd cadet && npm run -s test:fast` | **247/247 pass** |
| TEXTBOOK：`cd textbook && npm test` | **33/34 pass・1 fail**（2 回流して同じ）。落ちたのは `test/build.test.mjs:66`「build: FLIGHT LAB sources are not copied into textbook/」で、actual は `['rewrite/combined/drafts/radio.js']`。W19-radio の下書きの名前が原因で、`navb` とは関係がない（factcheck・reader・expert と同じ） |
| 構文 | `node --check` で `navb.js`・`navb-figs.js` とも ok |

## 4. 台帳の行

- **台帳の本体**は変えていない。
- **パッチ `reports/revise-navb.ledger.json`**（`unit: W18`。`validate.mjs` が単位の形 `W\d\d` を求めるため）に、CONCEPTS の `op: add` を 2 行書いた（どちらも案。統合役が取り込むかを決める）。
  - `C.variation-deviation`：住所 `navb.north`、呼び戻し `basics.time`・`sys.compass`・`nav.plan`（expert S12）
  - `C.fuel-planning`：住所 `perf.fuel`、呼び戻し `navb.calc`（expert S11）
- **CLAIMS**：W18 のパッチ `reports/W18.ledger.json` の CLAIMS 113 行は古い。章を登録するコミットでは、代わりに `drafts/navb.claims.json` の 189 行を `op: "add"` で入れてほしい（revise-sys・revise-inst と同じ方法）。
  - 署名：文の変わらない 83 行は、factcheck-navb の 9 のとおり署名してよい。
  - `by` に revise-navb を含む 106 行は、まだ誰も確かめていない。確かめ役（W27）が確かめてから署名する。
- **ERRATA `K.navigation.K1`〔安全〕**：直した場所は今も `navb.calc`（`bk.jp`・本文・説明してみよう 11）。文を直した（条文と「予備がいらないという意味ではない」）ので、安全レビュー（W27・W36）が要る。`K.navigation.K3`（図 8-4 を使わない）は変わらない。
- **JCAB-MAP・ACS-MAP**（W42 が確かめるときの材料）。expert の 4 の表で「足りない」「ほぼ足りる」だった行の中身を足した。
  - ppl／cpl.3.1.1.5（投影法の特徴）
  - ppl／cpl.3.1.2.3（相対方位・自差の E/W）
  - ir.1.1.1.1・cpl.3.1.1.1（自立航法・広域航法）
  - ppl／cpl.3.1.1.2（小圏・真子午線。経度時はまだない）
  - ppl／cpl.3.1.1.6（略語・偏流角の要素）
  - ppl／cpl.3.1.1.7（簡易計算の例題の型）
  - ppl／cpl.3.1.2.1（地点プロット法）
  - ppl／cpl.3.1.2.5（燃料の種類）
  - PA.I.D.K3a・b（TAS・UTC への換算）
  - PA.VI.A.K5d（TAS と密度高度）

## 5. 未解決のこと

1. **安全レビュー（W27・W36）がまだ**。〔安全〕に触れる文を直した（`navb.calc` の日本の燃料の囲み・「法令の決まりがない飛行でも、安全のために予備の燃料を足します」・説明してみよう 11）。レビューを通るまで、直し終えたことにしない（STYLE）。
2. **経度時**（JCAB 出題範囲 ppl／cpl.3.1.1.2 の語）の定義を一次資料で確かめられず、本文にない（〔要確認〕）。JCAB の資料で定義が分かれば、もっと深く「経度と時刻」に 1 文で足せる。
3. **日本の燃料の囲みの形**（factcheck S1 の (a)・(b)）を、統合役が決める（2.1）。
4. 道具の数え方による style の error 12・warn 1（W10b の部品の見出し、「計器飛行」の部分一致）。W01 の道具の持ち主が直すまで残る。
5. 本文は直す前より約 3,800 字（約 30%）増えた（12,559 → 16,395 字）。まず読む節の上限の 0.09 倍で、量の検査は 0。

## 6. ほかの単位にお願いしたいこと（needs from others）

1. **統合役**
   - factcheck S1：案 (b) のままなら、DESIGN 3.4 の表の `fuel.vfr` の行に注を足す（「`navb.calc` に手書きの `bk.jp`（K.navigation.K1 の直し）。FL.jur を直すときに一緒に直す」）。案 (a) にするなら、次の 3 つをすべて同じコミットで行う。
     - W06 が FL.jur の日本の欄に S10 の 1 文を足す。
     - `book-jur.js` の `fuel.vfr` の `boxes` を `['perf.fuel', 'navb.calc', 'nav.log', 'law.rules']` に、DESIGN 3.4 の行も同じにする。
     - `navb.calc` の `bk.jp('<p>…')` を `bk.jp('fuel.vfr')` に替える。
   - 登録のとき：`NEW_R.bowditch`・`gsiMag`・`nictJst` を `R` に入れる（Bowditch の PDF の直接の URL を注に。factcheck N8）。CLAIMS は `drafts/navb.claims.json` の 189 行で入れる。`revise-navb.ledger.json` の CONCEPTS 2 行を取り込むか決める。
   - `windTriangle`（`navb-figs.js` の版）が `nav.plan` でも合うことを確かめる（2.6）。
   - reader C4 の案 (b)：`bk.jur('sbas')` の SBAS の半分を第 3 部 `nav.gps` の項目に分けるか（W06 と）。
   - expert S11：`wb.limits` の換算の表（航空ガソリン 6 lb・0.72 kg）と `navb.calc` の比重のどちらを住所にするか。expert S13：`basics.speed` の偏流角の計算を 3 行の呼び戻しに縮めるか（W10 の持ち物）。
   - 序部 `basics.speed`（`flight-lab/src/book-0.js`）の「フライトコンピュータ」の書き方を、W04 の決定に合わせる（reader C6）。
   - TEXTBOOK のテストの落ち：`drafts/radio.js` の名前（W19-radio）か、`textbook/test/build.test.mjs` の `walk` から `rewrite/combined/drafts` を外す（変えたら `TEST-CONSTANTS.md` に 1 行）。
2. **W01（検査の道具）**：W14 の報告 5.2 の `skipForStyle` の 1 行。入れると `navb` の style の error は 0（3 で確かめた）。初出の形の部分一致（「計器飛行」が「計器飛行方式」「計器進入」の中で当たる、「決心高」が「決心高度」の中で当たる）。
3. **W04（FL.terms）**：次の語を決めてほしい。
   - 羅北
   - 相対方位（relative bearing）
   - 小圏（small circle）
   - 真子午線（true meridian）
   - 自立航法と慣性航法装置（INS）
   - 真航路（TC）・真針路（TH）・磁航路・コンパス針路（CH）。羅針路にするかも（factcheck N7・reader N4）
   - 使用可能燃料（W16 の「使える燃料」とそろえる）
   - 比重
   - フライトコンピューター／フライトコンピュータの書き方（reader C6）
   - 地方時と地方平均時
   - 略語：`track` に TR、`drift-angle` に DA と注（米国の計器進入の DA は決心高度 decision altitude。FL.terms の `decision altitude` と区別）
   - 無線航法と、第 3 部の章の題「電波航法と GPS」（`navr`）の言い方（reader C2）
4. **W06（FL.jur）**：1 の案 (a) を選ぶなら、`fuel.vfr` の日本の欄に「法令の量がないことは、予備がいらないという意味ではない」を足す。reader C4 の案 (b) の `sbas` の分け方。
5. **W15（`inst` の `sys.compass`）**：
   - 思い出そう「偏差の足し引きは、序部で学びました」を直す。足し引きは `navb.north` で初めて学ぶので、予告のリンクにする（reader C10）。
   - 自差表の段落を、`navb.north` への思い出そうに縮める（expert S12）。
   - 写真の説明の「FOR は飛びたい磁方位」を、`navb` の「磁針路」とそろえる（reader N6）。
6. **W16（`perfwb`）**：「使える燃料（usable fuel）」を W04 の正式名にそろえる。燃料の住所（`C.fuel-planning` の案）が決まったら合わせる。
7. **W29（`nav.plan`）**：偏差・自差・偏流修正角の太字を外して、`navb.north`・`navb.wind` の思い出そうにする（W18 の頼みと同じ）。
8. **W33・W34（第 3 部の `nav.adf`・`nav.dr`）**：
   - `nav.adf` が入ったら、相対方位を `navb.north` の思い出そうで呼ぶ。
   - expert N9（風防の中で動かない点が航跡）は `nav.dr` に。
   - `nav.dr` の 60 の法則は、`navb.wind` のもっと深く（偏流修正角の 60 の目安）からの予告の行き先。
9. **W27・W36（確かめ・安全レビュー）**：〔安全〕の `navb.calc` の燃料の文（5 の 1）。`navb.claims.json` の `by` に revise-navb を含む 106 行の確かめと署名。
10. **W42**：4 の JCAB-MAP・ACS-MAP の行の深さを確かめる。
