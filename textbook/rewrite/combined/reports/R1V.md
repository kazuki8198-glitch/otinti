# R1V 報告：R1 の確かめの残り（事実確認・初学者の 2 回目・日本の法令レビュー・図の目視・署名待ちの 38 行）

単位：R1V（R2 の始め。PROGRESS.md の「次」の 2 と「未解決のこと」の「確かめ役の署名待ち」。DESIGN 7.1 の事実確認と日本の法令レビュー、5 章の基準 1・3・4・11・16）。作業日：2026-10-29。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `flight-lab/src/book-1.js`（`intro` の章だけ） | `intro.exams` の「この教科書で扱わないこと」の最後の項目を直した（事実の誤り。下の 2.1）。同じ節の出典の行に「61.31」を足した。ほかの章には触っていない（差分は 2 行） |
| `flight-lab/src/book-jur.js` | `nordo.ifr` の日本の欄（目的地の上空で降下を始める時刻：施行規則第 206 条第 3 号の 3 つの場合と、進入の許可があるとき）、`multi.rating` の米国の欄（「級」→ 用語の表の「等級」）。どちらも下の 2.3 |
| `flight-lab/src/kiso-errata.js` | 気象庁「航空気象通報式」の出典を、改正第 16 号の新旧対照表から今の版（第 3 版 改正第 17 号、令和 7 年 8 月 7 日）に替えた（重ね表示 `alt-setting-japan`・`metar-trend-rmk`・`llws-japan` の出典。引いている中身（A 群・国内記事・TREND・WS 群）は第 17 号でも同じことを確かめた） |
| `textbook/rewrite/combined/reports/R1V.ledger.json` | 台帳のパッチ 356 行（下の 4） |
| `textbook/rewrite/combined/reports/R1V.md` | この報告 |

`flight-lab/src/book-0.js` と `drafts/*.claims.json` は変えていない（事実の誤りが見つからなかった。下書きの claims は W10 の記録として残し、署名は台帳 CLAIMS.json にパッチで書いた）。

## 2. したことと理由

### 2.1 CLAIMS の署名待ちの行の事実確認（基準 3）

署名待ちの 320 行（序部 306：`intro` 193・`basics` 47・`english` 66、W12 の 14）を、1 行ずつ一次資料と照らした。まず、行の文が今の本にあるかを確かめた（本の節の文と章末を正規化して探す小さなスクリプト）。318 行は文のとおりにあり、残りの 2 行は理由が分かった（`intro.course#c9e580ef` は括弧の中がボタン、`en.terms#ec22f5bd` は数を `FL.terms` から描くので今は 297 → 302 語）。

読んだ一次資料（どれも 2026-10-29 に取得。写しは scratchpad）：

- **米国の規則**：eCFR の API（2026-10-27 の版）で 14 CFR 1.1・1.2・61.1・61.3・61.23・61.31・61.63・61.65・61.83・61.85・61.87・61.89・61.103・61.109・61.113・61.123・61.129・61.133・61.153・61.159・91.3・91.9・91.17・91.151・91.173・121.436、47 CFR 87.89、Cornell LII で 14 CFR Part 141 付録 B と 15 U.S.C. 260a。
- **日本の法令**：e-Gov の API v2 で、固定した版の**全文**（航空法 327AC0000000231_20251201_507AC0000000055、航空法施行規則 327M50000800056_20261001_508M60000800082、どちらも CurrentEnforced）を引き、写しにない条（施行規則第 43・46・48 条の 2・50 条・50 条の 2・50 条の 4・50 条の 11・199・203 条、別表第二・第三、航空法の別表）も読んだ。電波法・電波法施行令（令和 8 年 9 月 3 日施行の版）、明治十九年勅令第五十一号。
- **FAA の資料**：AIM（Change 3：表紙・FIP policy・4-2-1・4-2-8・4-2-9・4-2-11・4-2-12・4-3-6・5-4-21・7-1-28・8-1-1・8-1-5）、P/CG（A・G・I・M・N・P・R・S・U・V の頁）、PHAK（第 4・7・8・16・17 章）、AFH（第 1・5・9・11・18 章）、AIH 第 3 章、ACS 6C・7B、Knowledge Test Table、AC 60-28B、AC 61-136B のページ、NWSI 10-813、Archer III POH（VB-2266）。
- **日本の資料**：国土交通省の指定養成施設の一覧（令和 8 年 2 月現在。全日本空輸の行の ○ を `pdftotext -bbox` の座標で定期運送用・事業用・准定期運送用の列と確かめた）、資料 1「操縦士養成に係る基礎情報」、事務処理要領の改正表（学科試験科目及び試験時間・改正表 18）、CBT の手引き、学科試験のページ、外国ライセンスの切替の案内、航空英語能力証明実地試験実施基準 別添 1、気象庁「航空気象通報式」第 3 版 改正第 17 号と羽田の WEATHER TOPICS 第 54 号、飲酒の通達（国空航第 2278 号）。
- **そのほか**：ANA の 2 つの記事、ASCII.jp・乗りものニュース、Acron Aviation の機材一覧、AirNav（KSFB 54.8 ft）、NIST SP 811 付録 B.9、CAP 413 第 24 版（PDF）、UN・UK CAA のページ、SKYbrary の 3 つのページ（Cloudflare のため Chromium で読んだ）。例題の計算は全部やり直した。

結果：

| | 行 |
|---|---|
| 一次資料のとおりで署名した（`checkedBy: R1V`） | **316** |
| 誤りが見つかり、文を直した（前の 2 行は署名しない） | 2（`intro.exams#9d450e7a`・`#f5bceac7`） |
| 一次資料が見つからず、署名しない | 2（`hf.body#b80278d7`・`#9e862111`） |
| R1V が直した文の新しい行（`op: add`。別の確かめ役が署名する） | 2（`intro.exams#05116d52`・`#b126d365`） |

**見つかった誤り（直した）**：`intro.exams` の「過給機付きや引込脚の単発機を操縦するための、教官の裏書きは扱いません。過給機は…」。14 CFR 61.31 の裏書きは、引込脚・フラップ・可変ピッチのプロペラを持つ complex airplane（61.31(e)・61.1）と、**200 馬力を超える**エンジンの high-performance airplane（61.31(f)）で、「過給機付き」の区分はない（与圧機の 61.31(g) も過給機ではない）。DESIGN 3.6 の表の書き方から来た誤り。次のように直した：「引込脚（引き込み脚、retractable landing gear）などを持つ単発機と、200 馬力を超えるエンジンの単発機は扱いません。どちらも、訓練機にないためです。米国では、こうした単発機の機長になる前に、教官の訓練と裏書きが要ります（米国の 14 CFR 61.31）。」（単発機に限ったのは、Seminole が complex の条件を満たす双発機で、元の文も単発機に限っていたため。過給機の定義の文は要らなくなった）

**署名しない 2 行**：`hf.body` の「来た方が確実に晴れていて地形が許すときは、浅いバンクで 180° 旋回して雲から出ます」と、ここが大切の同じ内容。札は参考値だが、出典は RULINGS の裁定（understand/vfr-flying.md）だけで、AFH 第 18 章（VFR で雲に入ったとき）・IFH・PHAK・AC 61-134 に 180° 旋回の決まった手順はなかった。〔安全〕③に関わる文なので、一次資料を足すか、札と書き方を「この本の判断」にするかを、hf の章の単位（W20）と安全レビュー（W36）に頼む（下の 6）。文の中身（浅いバンク・地形が許すとき・来た方が晴れているとき）は、AFH の「バンク 10° 以下」と矛盾しない。

### 2.2 初学者の 2 回目の読み（`intro`・`english`）

日本の高校を出たばかりで飛行機を知らない人として、2 つの章を画面に出る順（図のキャプション・表・章末まで）に読み直した。1 回目（reader-intro・reader-english）のつまずきは revise で直っていて、**理解を止めるつまずきは見つからなかった**。

| 場所 | 気づいたこと | 扱い |
|---|---|---|
| `intro.exams` 扱わないことの最後 | 「過給機付き」の誤り（2.1）。直した文は「引込脚」を初出の形（用語の表 `retractable-gear`）で書き、200 馬力の基準を本文で言う | 直した |
| `intro.cert` 日米の対照（`FL.jur` `multi.rating`） | 米国の欄だけ「級の限定」「級を足す」で、本文と用語の表は「等級」（1 回目の R15） | 直した（`book-jur.js`） |
| `intro.use`「この訓練の訓練生」 | 何の訓練かは次の節（`intro.course`）で分かる。最初の段落の「米国の空で受ける操縦訓練」を指すと読める | 直さない（nit） |
| `intro.cert`「決められた視程と雲からの距離」 | 視程の説明は `basics.units` まで出ない。漢字から「見通せる距離」と推せる | 直さない（nit。W24 で初出をそろえるとき） |
| `intro.cert` 日米の対照「BasicMed」 | 何かの説明がない。表の要点（第 1〜3 種）は分かり、訓練生には当たらない制度 | 直さない（`FL.jur` の文の短い言いかえは下の 5） |
| `english` | 3 つの名前・取り違えやすい組・略語・数字の読み方・権力格差は、本文だけで分かる。「Hofstede」の読み方（ホフステード）がない | 直さない（nit） |

### 2.3 日本の法令レビュー（DESIGN 7.1）

**`FL.jur` の日本の欄（47 項目）**：e-Gov の全文（上の 2.1 の版）と、写しにない資料（通達・気象庁・国土交通省の資料）で 1 項目ずつ照らした。条文に当たる 30 項目（`alt.transition`・`vmc`・`vmc.ad`・`svfr`・`msa`・`cruise`・`speed`・`fuel.vfr`・`fuel.ifr`・`fpl`・`row`・`lookout`・`pattern`・`night`・`solo`・`alcohol`・`medical`・`english.radio`・`nordo.vfr`・`nordo.ifr`・`xpdr`・`lights.ac`・`aerobatic`・`preflight`・`docs`・`accident`・`ir.need`・`ir.recent`・`appr.ban`・`multi.rating`）の数字と条番号は、どれも条文と合う。`oxygen`・`adsb` の「条が見当たらない」も全文の検索で確かめた（「酸素」「ADS」の語は運航の条にない）。`time` は勅令の本文（東経百三十五度）と合う。〔要確認〕の項目（実地試験の 4 つ・`readback`・`words`・`hold`・`circle`・`charts`・`light` の告示など）は、e-Gov に答えがないままで、〔要確認〕のままが正しい。

直した 1 か所（**`nordo.ifr`**）：前の文「目的地の上空で進入予定時刻（なければ到着予定時刻）まで待ってから降下する」は、施行規則第 206 条第 3 号の「進入の許可が与えられていればすみやかに」と、3 つめの場合「離陸時刻から（第 203 条第 1 項第 7 号の）所要時間が経過した時刻」を落としていた。「目的地の上空では、進入の許可を受けていればすぐに降下する。受けていなければ、進入予定時刻（言われていなければ通報した到着予定時刻、それもなければ離陸時刻に飛行計画の所要時間を足した時刻）まで待ってから降下する」にした（数字はない。囲みは `ifr.rules` と章末の表に出る）。

**`kiso-errata.js` の日本の法令の項目**（`pic`・`vmc`・`atc-services`・`nordo`・`min-safe-alt`・`ifr-recency`・`ifr-fuel`・`alt-setting-japan`・`hf-training` と、〔安全〕の `fuel-vfr`・`alcohol` の日本の分）：全部の条番号と数字を e-Gov の全文で確かめた。写しにない第 199 条（管制業務 5 種類）と第 73 条・第 73 条の 2 も全文で合う。飲酒の通達の 0.2 g/L・0.09 mg/L・原則は通達の PDF で合う。

**新しく分かったこと（`hf-training`）**：航空法第 71 条の 5（技能発揮訓練）と第 71 条の 6 は、固定した版（令和 7 年 12 月 1 日施行）の本文に**もう入っている**。ただし改正法（令和 7 年法律第 55 号）の附則第 2 条が「公布の日（令和 7 年 6 月 6 日）から起算して 3 年を超えない範囲内において政令で定める日までの間は、適用しない」としている。施行規則（令和 8 年 10 月 1 日施行の版）にも第 162 条の 19〜第 162 条の 22（訓練の要件・**修了から 2 年**・危険な事態の一覧（滑走路への誤進入など）・修了証明書の携帯の例外）が入っている。重ね表示の「適用の時期は〔要確認〕」は今も正しい（政令の日付は未確認）が、「施行規則などの内容は〔要確認〕」は条文で書けるようになった。ただし今の基礎教材のテストは、写しにない条を出典にすると落ちる（許すのは第 199 条と第 73 条だけ）ので、写しに足すのを先に頼む（下の 6）。直す文の案：

> 航空法第 71 条の 5 は、技能発揮訓練を修了していない操縦士が、航空交通管制圏に係る空港等で離陸・着陸の操縦（とそこでの操縦の練習の監督）をすることを禁じます。改正法の附則で、この条は公布の日（令和 7 年 6 月 6 日）から 3 年以内に政令で定める日まで適用しません。その日は〔要確認〕です。／訓練は、行う日の前 2 年以内に修了したものでなければなりません（施行規則第 162 条の 20）。検討会の方針の最低訓練時間 3 時間は、施行規則にはなく〔要確認〕です。

**序部の手で書いた日本の囲み**（`basics.crew` の第 73 条、`basics.rules` の第 2 条第 12〜17 項・第 34 条・第 97 条第 1 項、`basics.case` の JST と Q 群・A 群、`intro.cert` の第 25・28・31・33・34・35・2 条と施行規則第 53 条・別表第二、`intro.exams` の第 33・34 条・別表第三・電波法・第 28 条ただし書）：全部、条文と合う。

### 2.4 W07f が直した図の目視の記録（基準 16）

W07f の報告 1 に名前のある図 32 枚と表 1 つ（`vmcFactors` は表で図ではない）を、`node textbook/rewrite/tools/figshot.mjs <dir> FIG:<key>…` で 390 px と 760 px に描き、390 px の PNG を 1 枚ずつ見た。道具の判定は全部「no problems found」（文字は全部図の中・重なりなし・最小の文字 10.3 px）。中身も一次資料と計算で確かめた。

| 図（節） | 見たこと |
|---|---|
| vn（aero.vn） | +3.8 G・−1.5 G・Vs1 50・約 97 kt（50×√3.8 ＝ 97.5）・Va 113・Vno 125・Vne 154 が読める。問題なし |
| leftTurning（aero.left） | 4 つの原因の箱と右ラダー。問題なし |
| dragCurve（aero.drag） | 誘導・有害・全抗力と最小 約 71 kt（教材値）。問題なし |
| axes（aero.axes） | 3 つの軸と操縦翼面。問題なし |
| fuelSystem（sys.fuel） | タンク → セレクター → ストレーナー → 電動ポンプ → エンジン駆動ポンプ → キャブレター（PA-28 の順）。左の「タンクの下でも抜き取り検査」に指し示す線がなく、何の下か一瞬迷う（nit） |
| positionLights（sys.lights） | 左赤・右緑・尾白と、見え方の 3 つ（AFH 第 11 章の文どおり）。91.209 の衝突防止灯の注。問題なし |
| engineFlow（sys.engine） | 空気・燃料・点火の流れ、マグネトー 2 系統。問題なし |
| elecSystem（sys.elec） | オルタネーター・バッテリー・マスター・バス・非常用バッテリー（30 分以上）。問題なし |
| compassErrors（sys.compass） | UNOS・ANDS、15° ＋ 緯度の半分（北緯 29° で 29.5° ≈ 30°）、裏から見る目盛り。問題なし |
| scan（ifr.scan） | G1000 型 PFD と放射状のクロスチェック。問題なし |
| takeoffDistance（perf.tol） | 50 ft を越える距離・中間点の 70%。問題なし |
| clouds（wx.cloud） | 3 層の高さ（AWH 表 12-3）と CB。問題なし |
| ils（ifr.ils） | 上と横の 2 図、偽のグライドスロープ、針の読み方 4 つ。横の図の赤い「DA 255 ft（接地帯から 200 ft）」の上をグライドパスの線と偽の道の点線が通り、読みにくい（nit） |
| counterRotation（me.basics） | Seminole は下がる羽根が左右とも内側、ふつうの双発は左が臨界発動機。問題なし |
| vmcFactors（me.vmc：表） | 旧 23.149 の条件と要因の表。国を書いた見出し。問題なし |
| thunderstormLife（wx.ts） | 3 つの段階・約 30 分（AWH）。問題なし |
| windTriangle（nav.plan） | TC 090・TAS 105・風 030/15 → WCA 7°（計算 7.1°）・TH 083・GS 97（計算 96.7）・偏差 6°W で MH 089・自差 2°W で 091・MC 096。問題なし |
| tem（crm.tem） | 脅威 → エラー → UAS の流れ。問題なし |
| tafTimeline（wx.taf） | 12Z ＝ 08:00 EDT、TEMPO 18〜22Z、FM 02Z の位置が時間の軸と合う。問題なし |
| pattern（ops.pattern） | 滑走路 36 の左回り・45° の進入・場周高度 1,000 ft・300 ft 下でクロスウインド。問題なし |
| approachProfile（ops.landing） | PAPI の 5 つ（AIM 2-1-2 の角度）・70 kt の 3° で約 370 fpm（計算 371）。問題なし |
| holding（ifr.hold） | 右回り・インバウンド 090、ダイレクト 180°・ティアドロップ 70°（北東）・パラレル 110°（南東）が AIM 5-3-8 の区域の置き方と合う。問題なし |
| soloRoadmap（solo.req） | 61.83・61.87(b)(c)(d)(n)(p)・61.93・61.95・141.85。問題なし |
| certLadder（intro.cert） | 米国と日本の段。同じ高さの段が別の資格（1 回目の読み手の注）。キャプションの「一例」で足りる（nit） |
| fuelPlan（perf.fuel） | 120 NM ÷ 105 kt ＝ 1 時間 9 分、9.5 gal/h で 10.9 gal、昼 約 18・夜 約 20 gal（計算 17.6・20.0）。問題なし |
| flightCategory（wx.brief） | LIFR・IFR・MVFR・VFR の区域と例 A・B の位置。問題なし |
| hypoxiaAltitudes（hf.altitude） | 91.211 の 12,500・14,000・15,000 ft と AIM 8-1-2。問題なし |
| seaBreeze（wx.ts） | 両側の海風と内陸の積乱雲。問題なし |
| specialUseAirspace（law.special） | R・MOA・A・W（3 NM）・TFR。問題なし |
| attitudePower（ops.trim） | 4 つの組み合わせ（教材値）。問題なし |
| sectionalSymbols（nav.chart） | 8 つの記号。外側の Class C の円が下の「模式図（LAB は架空）・NOT FOR NAVIGATION」の文字の上を通り、少し読みにくい（nit） |
| thrustResponse（crm.jet） | プロペラ機とジェット機（AFH 第 16 章）。問題なし |
| stallFlow（aero.stall） | 4°・15°・20° の流れ（迎え角は判断 3 の補足のとおり）。問題なし |

あわせて、由来表の行の確かめのために序部の 3 枚（basicsFlight・basicsWind・basicsAlt）も 390 px で見た（下の 2.5。問題なし）。図を直すのは章の単位の仕事なので、nit 3 つ（ils・sectionalSymbols・fuelSystem）は下の 6 に書いた。

### 2.5 署名待ちの 38 行（基準 1・11）

| 台帳 | 行 | 確かめたこと | 結果 |
|---|---|---|---|
| PROVENANCE | `kiso00.01`・`02`・`07`〜`16`（12） | 本の `basics` の各節の `from` にその ID があり、原本 `kiso00.json` の本文と本の節の文に 20 字続けて同じ所が 1 つもない（書き直してある） | 署名 |
| PROVENANCE | `kiso00.q1`・`q2`・`q6`〜`q16`・`q19`・`q20`（15） | `basics` の章末の written 14 問と原本の問を 1 つずつ照らし（まとめた 2 組を含む）、答えの計算をやり直した | 署名 |
| PROVENANCE | `kiso00.q18` | `basics.speed` の「考えてみよう」が問 18 を書き直したもの | 署名 |
| PROVENANCE | `kiso09.q3` | `intro` の written 1 問。答えが本文と航空法第 35 条第 1 項第 3 号に合う | 署名 |
| PROVENANCE | `ch00-fig1`・`fig5`・`fig6` | FIG.basicsFlight・basicsWind・basicsAlt を 390 px で見た：暗い板・数字が計算と合う・最小 10.3 px | 署名 |
| UNVERIFIED | `U.docs-article` | 施行規則第 144 条・第 144 条の 2（e-Gov の全文） | 署名 |
| UNVERIFIED | `U.ac61-136` | FAA の AC のページ：AC 61-136B、Active、2018-09-12 | 署名 |
| UNVERIFIED | `U.egov-version` | e-Gov の API で 2 つの版の全文を引き、どちらも CurrentEnforced | 署名 |
| CONCEPTS | `C.pic-vs-captain` | `basics.crew` が 3 つの層を書き分け、太字の定義はこの節だけ（check-concepts に警告なし） | 署名 |
| ERRATA | `SYNC.e3-glide-entry`〔安全〕 | 課目 e3 の brief と say を AFH 第 9 章 p.9-28（最良滑空速度より速いときは減速してから機首を下げる）と照らした。W12 と別の 2 回目の確かめ | 署名（W36 が安全レビューで見直してよいと note に書いた） |
| ERRATA | `SYNC.i2-upset`〔安全〕 | 課目 i2 の brief と g を AFH 第 5 章 p.5-26 の 5 段階と IFH の機首上げの手順と照らした。採点は押す段階を妨げない | 署名（同上） |

## 3. 確かめ（検査とテスト）

| コマンド | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs intro` | error 0・warn 8（style の初出の形 7 は前から。claims の札なし 1 は R1V が書いた文：パッチの `add` を統合役が取り込めば消える） |
| `check-chapter.mjs basics` | error 0・warn 5（前から） |
| `check-chapter.mjs english` | error 0・warn 0 |
| `node textbook/rewrite/combined/tools/check-jur.mjs` | error 0・① found 64・missing 0 |
| `node textbook/rewrite/combined/tools/check-egov.mjs` | error 0・warn 1（前から） |
| `node textbook/rewrite/combined/ledgers/validate.mjs` | ok — 0 error・38 warning（パッチを取り込む前。取り込みの見るだけ `apply-patches.mjs reports/R1V.ledger.json` は 356 行が当たる。取り込めば 38 行の warning はなくなる） |
| `cd flight-lab && npm run -s test:fast` | **84/85**。落ちる 1 つは「modules: one list」で、`src/book-photos-k.js`（W22 が作業中の未登録の新しいファイル）が `modules.mjs` にないため。私のファイルとは関係ない。2 回流して同じ。基礎教材の訂正のテスト（22）と `FL.jur` のテスト（65〜68）は通る |
| `cd textbook && npm test` | **34/34** |
| `cd cadet && npm run -s test:fast` | **247/247** |
| `figshot.mjs`（W07f の 32 枚と序部の 3 枚） | no problems found（2.4） |

## 4. 台帳の行（`reports/R1V.ledger.json`、356 行）

- CLAIMS：316 行に `checkedBy: R1V`・`checkedOn: 2026-10-29` と、確かめた一次資料の note。新しい行 2（`op: add`、`by: R1V`）：`intro.exams#05116d52`（61.31 の文）・`intro.exams#b126d365`（引込脚と 200 馬力の文）。
- PROVENANCE 32・UNVERIFIED 3・CONCEPTS 1・ERRATA 2：`checkedBy: R1V` と note。
- パッチのファイルの頭に `unit` は書いていない（`schema.mjs` の単位の形 `W\d\d` に R1V が合わないため。名前は `unitName` に書いた）。
- パッチを当てたあとの CLAIMS：409 行のうち署名つき 403、署名なし 6（新しい 2・誤りで書き直した前の 2・一次資料のない `hf.body` の 2）。

## 5. 未解決のこと

1. `hf.body` の 180° 旋回の 2 文（2.1）：一次資料がない。〔安全〕③の文。
2. 書き直した前の 2 行（`intro.exams#9d450e7a`・`#f5bceac7`）は本にない文として台帳に残る（check-claims の info `ledger-row-not-in-book`）。パッチでは行を消せない。
3. `hf-training`（kiso-errata.js）：航空法第 71 条の 5・附則・施行規則第 162 条の 19〜22 で書ける（2.3）が、写しにないので今は直していない。
4. `FL.jur` の文の短い言いかえ（序部の読み手 3 人の依頼の残り）：`medical` の「BasicMed」、`english.radio` の「本邦内と本邦外」（`intro.cert` の本文が説明するので急がない）、`time` の夏時間の〔要確認〕など。`book-jur.js` は R1V の持ち物だったが、数字のテストに響かない語の足し方を W24（用語）と決めてから入れるのがよい。
5. `drafts/intro.js`（R1V の持ち物でない下書き）には前の「過給機付き」の文が残る（記録）。
6. DESIGN 5 章の基準（R1V の分）：1 は ERRATA の署名待ち 2 行（SYNC）が閉じて R1 の分の閉じた行は全部署名つき。3 は CLAIMS の署名なし 320 → 6。4 は `FL.jur` の日本の欄と序部の日本の囲みが条文と合う（error 0）。11 は序部の由来表の 32 行が署名つき（`from` の行は W10b の部品が描く）。16 は W07f の図の目視の記録ができた（nit 3）。

## 6. ほかの単位にお願いしたいこと（needs from others）

1. **統合役**：`reports/R1V.ledger.json` を取り込む（`apply-patches.mjs reports/R1V.ledger.json --write` → `validate.mjs`）。CLAIMS の `intro.exams#9d450e7a`・`#f5bceac7` は本にない文なので、統合役の判断で行を外すか note を足す（パッチでは消せない）。
2. **別の事実確認役（R1V 以外。R2 の W27 など）**：R1V が書いた 2 行（`intro.exams#05116d52`・`#b126d365`）と、`book-jur.js` の `nordo.ifr`・`multi.rating` の直しを確かめて署名する。
3. **W20（hf）と W36（安全レビュー）**：`hf.body` の「来た方が確実に晴れていて地形が許すときは、浅いバンクで 180° 旋回して雲から出ます」と、ここが大切の「雲の中の 180° 旋回は浅く（10° 以下）…」に、一次資料を足すか、札を「この本の判断（RULINGS R.vfr-into-imc）」として書き方を変える。CLAIMS `hf.body#b80278d7`・`#9e862111` は署名していない。
4. **DESIGN の持ち主（統合役）**：DESIGN 3.6 の表の「過給機付き・引込脚の単発機（complex・high performance の承認）」を「引込脚などを持つ単発機（complex）と 200 馬力を超える単発機（high-performance）の承認（14 CFR 61.31(e)(f)）」に直す（過給機付きの区分は 61.31 にない）。
5. **`ERRATA-FOR-WORD.md` の持ち主（W11・統合役）**：99・185・292・314 行の「気象庁「航空気象通報式改正新旧対照表（改正第 16 号）」」を「気象庁「航空気象通報式」第 3 版（改正第 17 号、令和 7 年 8 月 7 日）https://www.jma.go.jp/jma/kishou/books/tsuhoshiki/koukuu/koukuu3_17.pdf」に（`kiso-errata.js` とそろえる）。
6. **W37（e-Gov の写し）**：`textbook/rewrite/sources/egov/manifest.json` に、航空法第 71 条の 5・第 71 条の 6（令和 7 年 12 月 1 日施行の版）と施行規則第 162 条の 19〜第 162 条の 22（令和 8 年 10 月 1 日施行の版）を足す。附則（令和 7 年法律第 55 号 附則第 2 条：3 年以内に政令で定める日まで適用しない）は `fetch.mjs` が附則を写さないので、道具の直しか note で。写しに入ったら、`kiso-errata.js` の `hf-training` を 2.3 の案で直せる（R1V の次の持ち主へ）。
7. **統合役（W22 の登録）**：`flight-lab/src/book-photos-k.js` を `flight-lab/src/modules.mjs` に登録しないと、FLIGHT LAB のテスト「modules: one list」が落ちる（W22 の作業中のファイル）。
8. **図の nit（章の単位：W21・W33）**：`ifr.ils` の図（横の図の DA の札の上を線が通る）、`nav.chart` の `sectionalSymbols`（外側の円が「NOT FOR NAVIGATION」の文字の上を通る）、`sys.fuel` の `fuelSystem`（「タンクの下でも抜き取り検査」に指し示す線）。
