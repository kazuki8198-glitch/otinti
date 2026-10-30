# factcheck-navb の報告：第 1 部の新しい章 `navb`「航法の基礎」（W18 の下書き）の事実確認（R2）

単位：factcheck-navb（R2・W18 の事実確認役。下書きを書いた人とは別）。確かめた日：2026-10-30。

対象：`textbook/rewrite/combined/drafts/navb.js`・`navb-figs.js`・`navb.claims.json`。W18 の報告 `reports/W18.md` とパッチ `reports/W18.ledger.json` も読んだ。

確かめたこと：
- 主張の全部（`navb.claims.json` の 113 行）と、数字のない札なしの文（定義・手順・法令の言い方）を一次資料と照らした。
- 計算の全部を計算し直した（本文・計算演習 3・考えてみよう 4・例 4・章末の問 4・説明してみよう 11 問の答え・図の中の数）。
- 図 7 枚（新しい 6 枚と描き直しの `windTriangle`）をコードで確かめ、Chromium の 390 px で描いて目で見た。
- 日米の書き分け（DESIGN 3.4・6.2 の決まり 6・10・13、STYLE「日米の書き分け」）を確かめた。
- 基礎教材（kiso08.1〜08.11・問 1〜11・図 8-2・8-3・8-5・8-6）を書き直しているか（写していないか）を、文字の一致で確かめた。

**結論**：must 0・should 1・nit 8。
- **一次資料の数値と規則の誤りは見つからなかった**。PHAK 第 16 章・Bowditch（2024 年版 第 1 巻）・FAA Weight and Balance Handbook・e-Gov（航空法第 63 条・第 73 条の 2、施行規則第 153 条・第 164 条の 15）・NOAA の偏差・国土地理院の「偏角」は、全部合う。
- 計算は全部合う（下の 4）。図 7 枚は数・向き・縮尺が本文と合う（下の 5）。
- 基礎教材は書き直されている（405 文のうち、8 文字の並びが 6 割以上同じ文は 10 文で、ほとんどは式と短い問いの文。完全に同じ散文は 1 文。下の 7）。
- should 1：`navb.calc` の日本の囲み（`bk.jp`）が、`FL.jur` の `fuel.vfr`（〔安全〕）の日本の欄を手で写している。DESIGN 3.4 の囲みの節の外で、データからずれても検査で止まらない。機長の確認の根拠条文もない。
- W18 の未解決 8 の 2（Bowditch を自動で取れない）は解けた：NGA の API から第 1 巻の PDF を取れた（下の 2）。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck-navb.md`（新） | この報告 |

ほかのファイルは変えていない（下書き・台帳・製品のファイル・`flight-lab/kiso/` のどれも）。台帳のパッチも作っていない（署名は W27 の仕事。下の 9）。git の操作はしていない。
作業ツリーで流す前から変わっていたファイル（ほかの単位の作業）：`flight-lab/outputs/FLIGHT-LAB.html`・`cadet/outputs/CADET.html`、未追跡の `reports/factcheck-inst.md`・`factcheck-perfwb.md`・`factcheck-sys.md`・`factcheck-wx.md`。私は触っていない。

## 2. 確かめ方と一次資料（2026-10-30 に自分で取り直して読んだ。W18 の写しは使っていない）

一次資料は、新しい空のスクラッチのフォルダに取り直した。PDF は `pdftotext`（`-layout` と読み順の 2 通り）で読んだ。

| 資料 | 取った所 | 照らした所 |
|---|---|---|
| FAA PHAK FAA-H-8083-25C 全体の PDF（最終更新 2023-07-17、77,598,564 バイト）の第 16 章 | https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/faa-h-8083-25c.pdf | 第 16 章の文は、`R.phak16` の章の PDF（2016 年作成のファイル。FAA の第 16 章のページが今もこれを指す）と同じだった。照らした所：p.16-1（地文航法・推測航法・無線航法）、p.16-2（Sectional 1:500,000・1 in ＝ 6.86 NM・約 8 SM、VFR Terminal Area 1:250,000・1 in ＝ 3.43 NM）、p.16-3（ワシントン D.C. 約 39°N・77°W、緯度・経度の位置、1 時間に 15°、正午は太陽が経線の真上）、p.16-5（真北から時計回り、中ほどの経線で測る、TC）、p.16-6〜16-8（偏差は TN と MN の角、E/W、等偏差線は broken magenta lines、無偏差線、西海岸は東偏・東海岸は西偏、magnetic course、“east is least … west is best”、自差の原因（electrical circuits, radio, lights, tools, engine…）、機体と針路で変わる、competent technician、deviation card は 30° ごと・補間、図 16-12 For N・30・60・E → Steer 0・28・57・86）、p.16-8〜16-10（25 kt の北風で空気は南へ、heading・track・drift angle、左からの風で右へ流され機首を左へ、WCA、TH ± V ＝ MH ± D ＝ CH）、p.16-11（30 分 ＝ 0.5 h・0.75 h ＝ 45 分、T ＝ D ÷ GS、gal/h、同じ TAS なら燃料消費率はほぼ一定で風があれば GS で計算、燃料計と計算時間で地上にいる計画、エンジン・回転数・混合比・出力、cruise performance charts、始動・タキシー・上昇・予備、上昇中は GS が小さい）、p.16-12〜16-13（E6B か電子式、plotter は protractor and ruler、図 16-18「the computational and wind side of a mechanical flight computer (E6B)」、wind triangle）、p.16-14 付近（WCA は右からの風で足し左からで引く、variation は西を足し東を引く） |
| NGA Pub. No. 9 American Practical Navigator（Bowditch）**2024 EDITION** 第 1 巻（低解像度版の PDF、821 ページ、2024-05-16 作成） | NGA MSI の API：https://msi.nga.mil/api/publications/download?key=16693975/SFH00000/Bowditch_Vol_1_LoRes.pdf&type=view（出版物の一覧は https://msi.nga.mil/api/publications/stored-pubs?pubTypeId=2。高解像度版は同じ key の `Bowditch_Vol_1.pdf`） | 103（海里は exactly 1,852 meters）、104（大圏の定義・最短の線は大圏の一部・meridian は極から極の半円）、105（緯度は 0〜90° N/S、経度は本初子午線から 180° まで E/W、departure は緯度とともに減る）、106（navigator の距離は rhumb line の長さ、rhumb line はすべての経線と同じ角度、経線と緯線は特別な場合、「considering the nautical mile the length of one minute of latitude introduces no significant error」）、204（緯度 1° は赤道の約 59.7 NM から極の約 60.3 NM）、301（国際の取り決めで 1,852 m）、501（歪みなしに写せない）、502（性質が両立しない：great circles and rhumb lines cannot both be straight）、503（メルカトルは円筒、ランベルトは 2 つの小円で切る割線円錐）、504（経線は等間隔の縦線）、505（航程線は直線、経線と赤道のほかの大圏は赤道に凹の曲線）、513（直線は大圏とほぼ同じ、aeronautical charts に広く使われる）、1702（東の地点ほど地方時が後（進む）、平均の太陽は 15°/h、太陽に対しては 360° より多く回る）、1705（1h ＝ 15°、4m ＝ 1° ＝ 60′、4s ＝ 1′ ＝ 60″）、1708（時間帯は経度 15° ごと、UTC から整数時間）、3419（収束する経線の図では距離は緯度の目盛りか距離の目盛り、直線は経線ごとに角度が違う、mid meridian で測る） |
| FAA Aircraft Weight and Balance Handbook FAA-H-8083-1B（2016、114 ページ） | `R.wb` の URL | 図 3-4（AVGAS 6.14 lb/gal at 32 °F・6.01 at 59 °F、Water 8.35・8.33）、p.3-5（残る燃料は residual or unusable fuel、sg × 8.345）、p.7-7（「Because aviation gasoline weighs 6 pounds per gallon」） |
| e-Gov 法令 API（航空法、令和 7 年 12 月 1 日施行の版、改正 ID 327AC0000000231_20251201_507AC0000000055） | https://laws.e-gov.go.jp/api/2/law_data/327AC0000000231?…&elm=MainProvision-Article_63 | 第 63 条の文が e-Gov の写し `sources/egov/articles/kokuho/63.json` と一字一句同じ（今の版）。あわせて写しの第 73 条の 2・施行規則第 153 条（令和 8 年 10 月 1 日施行の版）・第 164 条の 15 を読んだ |
| NOAA NCEI 偏差の計算機（WMM-2025、2026-10-30） | https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination | Sanford（28.78°N・81.24°W）7.09°W、那覇 5.87°W、稚内 10.54°W（FL.jur `sbas` の「約 7°W」「約 6°W〜約 10.5°W」と合う） |
| 国土地理院「地磁気測量」 | https://www.gsi.go.jp/buturisokuchi/geomag_index.html（curl は TLS の古い再ネゴシエーションで断られたので WebFetch で読んだ） | 「地図の北と方位磁石の北はずれています。このずれの角度を偏角と呼びます。」 |
| FL.jur・FL.terms・FL.physics・課目 | `flight-lab/src/book-jur.js`・`book-terms.js`・`physics.js`・`syllabus.js` | `sbas`・`fuel.vfr`・`cruise` の欄、用語の初出の形（偏差・自差・自差表・羅方位・航路・針路・航跡・偏流角・偏流修正角・風力三角形・燃料消費率・到達予定時刻・横風成分ほか）、`MAGVAR_W = 6`、課目 n2（推測航法と目的地変更：風上へ修正、目的地変更で針路・距離・時間を見積もる） |

## 3. 問題（重い順。場所・何が違うか・直し方・根拠）

### must

なし。

### should

**S1　`navb.calc` の日本の囲み（`bk.jp`）が、`FL.jur` の `fuel.vfr`〔安全〕の日本の欄を手で写している**（主張の札 `navb.calc#98294ca0` と、札のない続きの 2 文）
- 今の文：「日本では、航空法第 63 条が燃料の量を決めているのは、航空運送事業と計器飛行方式（IFR：instrument flight rules）の飛行です。自家用や訓練の VFR の飛行に、法令で決まった最低量はありません。機長（pilot in command）が出発前に燃料を確かめ、学校の規程の量を積みます。」
- 中身は正しい：第 63 条は「航空運送事業の用に供する場合又は計器飛行方式により飛行しようとする場合」だけに量を求め（e-Gov、今の版）、量は施行規則第 153 条。機長の確認は第 73 条の 2 と施行規則第 164 条の 15 第 1 項第 5 号（「燃料及び滑油の搭載量並びにそれらの品質」）。
- 違い（決まりの面）：
  - DESIGN 3.4 は `fuel.vfr` の囲みの節を `perf.fuel`・`nav.log`・`law.rules` の 3 つに決めている。`navb.calc` の手書きの `bk.jp` は、データ（`FL.jur`）を通らない 4 つめの置き場になる。`jur.test.mjs` の ①（囲みの節にその項目の囲みがあり、ほかの節にはない）も `check-jur.mjs` も、手書きの文は数えないので、`FL.jur` の日本の欄が直っても、ここは古いまま残る。〔安全〕の項目なので、ずれたときの害が大きい。
  - 3 文目（機長が出発前に燃料を確かめる）は法令上の義務を言うが、根拠の条文がない（`FL.jur` の `jpArt` は第 73 条の 2・施行規則第 164 条の 15 まで書いている）。
- 直し方（案。どちらか。決めるのは統合役）：
  - (a) DESIGN 3.4 の `fuel.vfr` の囲みの節と `FL.jur` の `boxes` に `navb.calc` を足し、下書きの `bk.jp('<p>…</p>')` を `bk.jp('fuel.vfr')`（日本の欄だけをデータから描く）に替える。米国の数字は今のまま `perf.fuel` へのリンクで、写さない。
  - (b) 手書きのまま残すなら、3 文目に根拠を書く：「機長は出発前に、燃料の搭載量と品質を確かめます（航空法第 73 条の 2・航空法施行規則第 164 条の 15）。」 そして 1 文目の後ろに「（量は航空法施行規則第 153 条）」。主張の札に 2 行足す（条文）。DESIGN 3.4 の `fuel.vfr` の行の注に「navb.calc に K.navigation.K1 の直しとして手書きの bk.jp」と書き、`FL.jur` を直すときに一緒に直す決まりにする。
- 根拠：e-Gov 航空法第 63 条・第 73 条の 2、航空法施行規則第 153 条・第 164 条の 15（写しと API）。DESIGN 3.4 の表の `fuel.vfr` の行、STYLE「日米の書き分け」の「囲みの数字は手で書きません …同じ数字を本文に手で写して、2 か所に置きません」。

### nit

**N1　章末の問 1 の理由が、小数の度の換算の出典を「PHAK 第 16 章」と書いている**
- PHAK 第 16 章には、分（′）を小数の度に直す話はない（第 16 章の「minutes」は時間の分だけ。全文を検索した）。
- 直し方：理由の括弧を「（節「地球・緯度と経度・縮尺と投影・大圏と航程線」。1° ＝ 60′：Bowditch 1705）」にするか、出典を外して節だけにする。

**N2　もっと深く「経度と時刻」の最初の文「地球は 24 時間で 360° 回るので、1 時間に 15° 回ります」が、物理としては不正確**
- Bowditch 1702 は、太陽に対しては地球が 360° より多く回らないと太陽が同じ経線に戻らない（360° は恒星日で約 23 時間 56 分）と書く。1705 は「1 日は、選んだ天体に対して 360° の 1 回転」と定義する。PHAK の書き方（day を 360° の回転と定義）に沿った文で、同じ囲みの後ろで平均の太陽を説明しているので害は小さいが、JCAB 空中航法の発展の囲みなので正確にしたい。
- 直し方（案）：「1 日 24 時間で、太陽（平均の太陽）は空を 1 周（360°）して見えます。だから 1 時間に 15° です（Bowditch 1702・1705）。」 主張の札 `navb.earth#814ead10` の文と出典も合わせる。

**N3　主張の札の出典の項・ページの番号が 3 行で違う**（中身は正しい）
- `navb.earth#f14a1f3a`・`navb.earth#bf48c130`：「Bowditch 106（exactly 1,852 meters）」→ 2024 年版で 1,852 m を書くのは **103 と 301**（106 は「緯度 1′ を 1 海里と考えて大きな誤りはない」）。出典を「Bowditch 103・301・NIST SP 811」に。
- `navb.calc#5ec82839`：「sg × 8.345 … p.3-4」→ **p.3-5**（図 3-4 は p.3-4、8.345 の文は次のページ）。
- NEW_R.bowditch の題の「104〜106（…海里）」は、106 が海里と緯度 1′ の関係なので、そのままでよい。

**N4　「使える燃料（使用可能燃料、usable fuel）」の初出の形が逆**
- STYLE の初出は「正式名（通称、English）」。今の形は通称が先で、正式名が括弧の中にある。
- 直し方（案）：「計算には、使用可能燃料（usable fuel）、つまり使える燃料の量を使います。」（「使用可能燃料」は FL.terms にまだない：W18 の頼みの 9 の 5。W04 が正式名を決めたら合わせる）

**N5　基礎教材の文がほぼそのまま残っている所が 2 文**
- 説明してみよう 問 1 の答え「途中で位置を確かめる目印も決めます。」は kiso08 の解答 1 と同じ文。
- `navb.wind`「成分を出す前に、風向と航路の北の基準をそろえます。」は kiso08.8「成分を求める前に、風向と航路の北の基準をそろえます。」と 1 語違い。
- 直し方（案）：「途中で位置を確かめる目印も、地図の上で選んでおきます。」「風の成分を計算する前に、風向と航路が同じ北（真北か磁北か）で測った値かを確かめます。」
- ほかは書き直されている（下の 7）。

**N6　風力三角形の「6 つの量のうち、4 つが分かれば残りの 2 つが決まります」は、どの 4 つでも一意とは限らない**
- 例：TAS・GS・風向・風速が分かっても、針路と航跡は 2 通りありうる。横風成分が TAS より大きいと解がない。計画の組（真航路・TAS・風）なら一意で、本文の次の文もその組。
- 直し方（案）：「3 本の向きと長さの 6 つの量は、ふつう 4 つが分かれば残りの 2 つが決まります。」か、次の文の計画の組だけを書く。

**N7　用語「コンパス針路」が FL.terms にない**
- FL.terms は compass direction を「羅方位」としている。compass heading の JCAB の表記（「羅針路」か「コンパス針路」か）は、この確認では一次資料（JCAB の問題・例題集）で確かめきれなかった。W18 が W04 に頼んだ語の中にある（9 の 5）。事実の誤りではないので nit。

**N8　NEW_R.bowditch の URL は JavaScript で描くページ**
- https://msi.nga.mil/Publications/APN は中身を JavaScript で描くので、確かめ役が自動で開けない（W18 の未解決 8 の 2 の原因）。
- 直し方（案）：`label` か統合役の `R` の注に、PDF を直接開ける URL（上の 2 の API の URL。高解像度版 `Bowditch_Vol_1.pdf`）を書き添える。`url` は出版物のページのままでよい。

## 4. 計算（全部を python で計算し直した）

| 場所 | 本文の値 | 計算し直した値 |
|---|---|---|
| 縮尺 1:500,000 の 1 cm | 5 km・約 2.70 NM | 5,000 ÷ 1,852 ＝ 2.6998 |
| 区分航空図 1 in・1:250,000 の 1 in | 6.86 NM（約 8 SM）・3.43 NM | 6.857 NM・7.891 SM・3.429 NM |
| 28°30′・28.30° | 28.5°・28°18′ | 28 ＋ 30 ÷ 60 ＝ 28.5、0.30 × 60 ＝ 18 |
| 北緯 60° の経度 30′ | 約 15 NM | 30 × cos 60° ＝ 15.0 |
| 経度差 6° の地方時 | 24 分・12:24 | 6 × 4 ＝ 24 |
| 偏差・自差（表・図・問 2・例） | 096°・094°、6°W を引くと 12° ずれ | 090 ＋ 6 ＝ 096、096 − 2 ＝ 094、096 − 084 ＝ 12 |
| 360° をまたぐ（本文・考えてみよう） | 002°・001° | (355 ＋ 7) mod 360 ＝ 2、2 − 1 ＝ 1 |
| 説明してみよう 問 5 | 097°・095° | 090 ＋ 7 ＝ 097、097 − 2 ＝ 095 |
| 自差表（図 16-12）の 090° | STEER 086°、自差 4°E | 090 − 4 ＝ 086（E は引く） |
| 修正しない A（図・本文・問 7） | 航跡 約 101°・GS 約 102 kt・偏流角 約 11°（もっと深くは 11.3°） | 101.31°・101.98 kt・atan 0.2 ＝ 11.31° |
| 航路を保つ B（図・本文・問 3・問 9・例） | 偏流修正角 約 11.5°・真針路 約 078.5°・GS 約 98 kt | asin 0.2 ＝ 11.537°・78.46°・97.98 kt |
| 成分の表（20 kt） | 20・17・14・10・0／0・10・14・17・20 | 20.0・17.3・14.1・10.0・0.0／0.0・10.0・14.1・17.3・20.0 |
| 風 030°/15 kt・航路 090°（本文・図） | 60°・7.5 kt・約 13 kt（左から） | 7.50・12.99 |
| `windTriangle`（105 kt） | 左へ約 7°・GS 約 97 kt、図の鎖 083°・089°・091°、MC 096° | −7.11°・96.69 kt、82.9・88.9・90.9、090 ＋ 6 ＝ 096 |
| 60 の目安 | 12°（正しくは 11.5°） | 60 × 20 ÷ 100 ＝ 12 |
| 計算演習（180°・110 kt・230°/20 kt） | 15.3・12.9 kt、0.139、右へ約 8°、188°、GS 約 96 kt | 15.32・12.86、0.1393、8.01°、188、96.07 |
| 追い風の考えてみよう | 0°・120 kt | 100 ＋ 20 |
| 時間（本文・図・問 3・問 10） | 40 分・50 分、GS 20% 減で時間 25% 増 | 40.0・50.0、72 ÷ 90 ＝ 0.8、50 ÷ 40 ＝ 1.25 |
| 小数の時間 | 0.5 h ＝ 30 分・0.75 h ＝ 45 分・0.3 h ＝ 18 分・0.67 h ≈ 40 分 | 30・45・18・40.2 |
| 区間の燃料（本文・図・問 4・問 11・例） | 6.0・7.5・1.5 gal | 9 × 40 ÷ 60 ＝ 6.0、9 × 50 ÷ 60 ＝ 7.5、差 1.5 |
| 計算演習（ETA） | 25 分・1445Z・3.75 gal | 45 ÷ 108 × 60 ＝ 25.0、9 × 25 ÷ 60 ＝ 3.75 |
| 考えてみよう（残り 30 NM） | 18 分・2.7 gal | 18.0・2.7 |
| 比重・1 L の重さ | 約 0.72・約 0.72 kg | 6.01 ÷ 8.33 ＝ 0.7215（6.01 ÷ 8.345 ＝ 0.7202）、6.01 × 0.45359237 ÷ 3.785411784 ＝ 0.7202 kg/L |
| L と US gal | 約 3.785 L、4 倍近く | NIST 3.785412 |
| 比の面 | 60 NM／40 分 ＝ 90 NM／60 分 | 1.5 ＝ 1.5 |

図の中の数（`navbWindFix` の 2.3 px/kt の縮尺、`navbComponents` の 8 px/kt、`navbTimeFuel` の 4 px/分、`windTriangle` の 2.6 px/kt）も、コードの式から上の値になることを確かめた。

## 5. 図（7 枚。390 px で描いて目で見た）

| 図 | 確かめたこと | 結果 |
|---|---|---|
| `navbLatLon` | 緯線・経線・本初子午線・赤道・北極の名前、格子の 28°N〜29°N・82°W〜81°W（西経は左ほど大きい）、点 P ＝ 28°30′N・81°30′W、下の 2 行（28.30°N ではない、経度 1′ は赤道で約 1 NM・60° で約 0.5 NM）。基礎教材の図 8-2（35°30′N・139°30′E）を米国の側の座標に替えたが、中身（組で読む・小数の度）は同じ | 合う |
| `navbProjections` | ランベルト：経線が北で集まる、緯線は北の頂点を中心とする弧（中央が下がる）、直線 ≈ 大圏、中ほどの経線で測る。メルカトル：経線は等間隔の縦線、緯線の間隔は北ほど広い（44・52・60）、直線 ＝ 航程線、大圏の点線は極の側へふくらむ（Bowditch 505「赤道に凹」）。「模式図・NOT FOR NAVIGATION」あり | 合う |
| `navbNorths` | 磁北は真北の左（西偏）、コンパスの北は磁北の右（東の自差）、角度は誇張と明記、TH 090 → ＋6（W は足す）→ MH 096 → −2（E は引く）→ CH 094。基礎教材の図 8-3（7°W・東を＋）を教材値 6°W と W/E の決まりに替えた | 合う |
| `navbWindFix` | A：TAS 矢印 090°・100 kt、風の矢印は南向き 20 kt、地面の矢印は 101°・102 kt、流される角 約 11°。B：機首 078.5°、北向き成分 20 kt で打ち消し、GS 98 kt（東）、「80 kt ではない」。縮尺どおり（縦 46 px ＝ 20 kt × 2.3）。図 8-4 は使っていない（K.navigation.K3） | 合う |
| `navbComponents` | 風の矢印は 210° へ（流れて行く向き）、向かい風成分は航路と逆向き 7.5 kt、横風成分は南向き 約 13 kt、式の行 | 合う |
| `windTriangle`（描き直し） | `book-figs.js` の今の図と描き方が同じで、キャプションの「風力三角形」だけが違う。自差 2°W は例で W は足す（`navbNorths` の 2°E と例が違うが、どちらも例と書いてある） | 合う |
| `navbTimeFuel` | 60 NM の区間、90 kt → 40 分・6.0 gal、72 kt → 50 分・7.5 gal、2 つの式、0.5 h ＝ 30 分・0.3 h ＝ 18 分・0.67 h ≈ 40 分、「例題の値」 | 合う |

`check-chapter.mjs` の図の検査（390 px・最小 10 px・はみ出し・単独の SVG）も 7 枚とも 0 件。

## 6. 日米の書き分け

- 4 節とも `scope: 'common'`（DESIGN 3.3 の範囲の列のとおり）。`check-jurisdiction` は 0 件。
- 米国の事実には国がある：「米国の区分航空図」「米国では、西海岸の偏差は東偏…」「米国の VFR の巡航高度の決まりは、この磁航路で」「米国の自差表は FOR と STEER」「（米国の場合）」「米国の VFR の決まりは perf.fuel」。14 CFR・AIM の言葉は本文にない（`bk.jur('sbas')` の米国の列の「AIM 1-1-18」だけ）。
- 日本の法令と国土地理院は `bk.jp` の中だけ（航空法第 63 条、「偏角」）。第 7 部・まとめの章・`english` へのリンクはない。手で書いたリンクは、本にある節（`nav.dr`・`nav.log` は「予告」、`perf.fuel`・`basics.units`・`basics.time`・`basics.speed`・`sys.compass`）だけ。
- 偏差の数は手で書いていない：Sanford と日本の値は `bk.jur('sbas')` が FL.jur から描く（DESIGN 3.4 の囲みの節に `navb.north` がある）。教材値 6°W（`MAGVAR_W`）と参考値（Sanford 約 7°W）が同じ節に並ぶ（STYLE「教材値と参考値は並べます」）。
- `bk.deep` の題の「（JCAB 空中航法）」は、ほかの章の下書き（`sys` の「JCAB 工学」、`hfadm` の「JCAB の学科の範囲」）と同じ書き方。
- 章末の注意の「この教材のシミュレータで体験できるのは…（課目 n2）」は、CADET が章末の注意を出さないので、CADET には出ない（`cadet/src/content/book.js` は節の本文だけを読む）。本文に FLIGHT LAB の操作の言葉はない（`bk.sim` の中だけ）。
- 例外は S1（手で写した日本の囲み）。

## 7. 基礎教材を書き直しているか

- `from` は 4 節とも中身と合う（`navb.earth` ← kiso08.1〜08.4、`navb.north` ← 08.5、`navb.wind` ← 08.6〜08.9、`navb.calc` ← 08.3・08.10・08.11）。説明してみよう 11 問は kiso08.q1〜q11 の問と答えを、合本の数字（L → US gal、7°W は問 5 だけ原本のまま）で書き直している。
- 文字の一致：本文・図のキャプション・問・説明してみようの 405 文を、kiso08 の 1〜11 節・問・解答・図のキャプションと、8 文字の並びで比べた。6 割以上が同じ文は 10 文で、内訳は式（「35 ＋ 30 ÷ 60 ＝ 35.5°N で、35.30°N ではありません」「60 ÷ 90 × 60 ＝ 40 分…」など）と短い問いの文（「磁針路とコンパス針路を求めてください。」「これは約 2.70 NM です。」）。散文で同じなのは N5 の 2 文だけ。
- 基礎教材の日本の事実（kiso08.10 の「JST は UTC より 9 時間進む」、kiso08.5 の国土地理院の「偏角」）は、前者は書かず、後者は `bk.jp` に入れている（STYLE「基礎教材を書き直して入れるとき」）。
- 既知の誤り：K.navigation.K1〔安全〕（日本の自家用 VFR に法定の予備燃料があると読める）は、本文「予備の量に法令の決まりがあるかは、国と飛行の種類で違います」・`bk.jp`・説明してみよう 問 11 で直っている。法令の中身は e-Gov で正しいと確かめた（S1 は置き方と根拠の書き方の問題）。K.navigation.K3（図 8-4）は使っていない。

## 8. 検査と結果

| 検査 | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/navb-figs.js textbook/rewrite/combined/drafts/navb.js`（Chromium の図の検査つき） | **error 11・warn 8・pending 1・info 411**（W18 の報告と同じ）。chapters・form・data・volume・jurisdiction・chapter-refs・figures（7 枚・390 px で 0 件）・questions・photos・jur（① found 1・missing 0）・path・provenance・egov は 0 |
| └ style error 11 | 全部 W10b の部品の見出しを文と数えたもの（常体 6：「思い出そう」4・「ここを混同しない」2、文末なし 5：「答えと解き方」3・「判断の目」2）。本文の誤りではない |
| └ style warn 1 | 「計器飛行」の初出：`bk.jp` の「計器飛行方式（IFR：…）」の中の短い語を数える道具の数え方 |
| └ concepts warn 3 | 偏差・自差（`sys.compass`・`nav.plan`）、偏流修正角（`nav.plan`）の太字の重なり（W15・W29 の持ち物） |
| └ claims warn 4 | CLAIMS.json にまだ行がないため。台帳の写しに `navb.claims.json` の 113 行を足して（`COMBINED_LEDGERS` をスクラッチのフォルダに）流すと **113/113 に札・warn 0** |
| └ calc pending 1 | 計算の台帳 CALC.json がまだない |
| `cd flight-lab && npm run -s test:fast` | **86/86 pass** |
| `cd textbook && npm test` | **33/34**（2 回流して 2 回とも同じ）。落ちるのは `build: FLIGHT LAB sources are not copied into textbook/`（`textbook/test/build.test.mjs:66`）で、原因は `textbook/rewrite/combined/drafts/radio.js`（W19-radio の下書き、コミット 65952a5 で入った）が `flight-lab/src/radio.js` と同じ名前であること。navb の下書きとは関係ない（下の 10） |
| `cd cadet && npm run -s test:fast` | **247/247 pass** |

## 9. 台帳の行

- 変えた行：なし（パッチも作っていない）。
- 署名の材料（W27 か統合役が `checkedBy` を付けるとき）：`navb.claims.json` の **113 行を全部**、上の 2 の一次資料と 4 の計算で確かめた。全部、文の中身は正しい。出典の書き方を直してから署名するのがよい行は 3 行（N3：`navb.earth#f14a1f3a`・`navb.earth#bf48c130`・`navb.calc#5ec82839`）。文を直すと札の ID が変わる行（S1 を (b) で直すとき `navb.calc#98294ca0` の前後に 2 行増える、N2 で `navb.earth#814ead10`、N5 で 2 文）は、直したあとの文で確かめ直す。
- 内訳：例題（仮定の値の計算）68 行・PHAK 21 行・Bowditch 16 行・計算だけ 8 行・NIST 5 行・W&B 5 行・FL.physics（教材値）3 行・FL.jur（描いた囲み）3 行・e-Gov 1 行（重なりあり）。
- ERRATA `K.navigation.K1`〔安全〕：法令の中身は e-Gov（第 63 条・第 73 条の 2、施行規則第 153 条・第 164 条の 15）で正しいと確かめた。〔安全〕の行なので、安全レビュー（W27・W36）の署名はまだ要る。`K.navigation.K3`：図 8-4 を使っていないことを確かめた。

## 10. ほかの単位にお願いしたいこと

1. **W18（または直し役）**：S1 と N1〜N6 を下書きで直す（直し方は 3 に）。直したら `navb.claims.json` の行を今の文にそろえ、N3 の出典の書き方を直す。
2. **統合役**：
   - S1 の (a)・(b) を決める。(a) なら DESIGN 3.4 の表の `fuel.vfr` の囲みの節に `navb.calc` を足し、`flight-lab/src/book-jur.js` の `fuel.vfr` の `boxes` を `['perf.fuel', 'navb.calc', 'nav.log', 'law.rules']` に（`jur.test.mjs` の ① がそのまま通るように）。
   - TEXTBOOK のテストの落ち（8 の表）：`textbook/rewrite/combined/drafts/radio.js` の名前を替える（例：`radio-draft.js`。W19-radio の持ち物）か、`textbook/test/build.test.mjs` の `walk` で `rewrite/combined/drafts` を外す（下書きは製品が読まない場所なので、外しても目的は変わらない）。どちらかを決めて、変えるコミットで `TEST-CONSTANTS.md` に 1 行。
   - `NEW_R.bowditch` を `R` に入れるとき、N8 の直接の PDF の URL を注に。
3. **W27（R2 の確かめ）**：9 の材料で CLAIMS 113 行に署名する。〔安全〕の `K.navigation.K1` の安全レビュー。
4. **W04（FL.terms）**：N7 の「コンパス針路」（compass heading）の JCAB の表記と、N4 の「使用可能燃料」。W18 の頼み（9 の 5）と同じ。
5. **W19-radio**：上の 2 の `drafts/radio.js` の名前（TEXTBOOK のテスト）。
