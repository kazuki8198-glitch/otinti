# 事実確認の二人目：R2 の全部（factcheck2-R2）

単位：R2 の事実確認の二人目（DESIGN 7.2 の W27「事実の二人目」。R2 の文はどれも書いていない役）。日付：2026-10-30。
確かめたもの：`git diff 0f68d6e..HEAD` のうち `flight-lab/src/`（`book-0.js`〜`book-5.js`・`book-comm.js`・`book-core.js`・`book-figs.js`・`book-gates.js`・`book-jur.js`・`book-terms.js`・`kiso-errata.js`・`quiz.js`・`syllabus.js`・`school.js`・`sanford-course.js`）と `cadet/src/content/`（`book.js`・`school.js`・`checklists-archer.js`）。変わった文・新しい文の事実・数字・計算・図と、R2 で閉じた台帳の行（ERRATA 49 行・RULINGS 23 行。CLAIMS は下の 6）。
決まり：DESIGN 6.2（15 の決まり）・3.3 第 1 部・3.4・4 章・7.2（R2・W27）、DECISIONS（判断 0・2・3 とその補足・11）、STYLE、CLAUDE.md。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/reports/factcheck2-R2.md`（新） | この報告 |

ほかのファイルは**変えていません**（直さない役。直す所は 4 に、直し方と出典つきで書きました）。台帳（`ledgers/`）にもパッチを書いていません（署名してよい行は 10 に書きました）。`flight-lab/kiso/` には触っていません。git の操作（commit・push・stash・reset・checkout・restore・clean）はしていません。

## 2. したこと

1. 差分をファイルごとに読みました（`git diff --word-diff=plain`。図は SVG の中の文字と数字）。第 1 部の 16 章は、本を Node で読み込んで描いた本文（節ごとの文・囲み・図の文字・章末）から、条番号・AIM の番号・数字と単位を含む文を抜き出して読みました。前の一人目（`factcheck-aero`〜`factcheck-hfadm`）の must 6 つが今の本で直っているかも確かめました。
2. 計算は、考えてみよう 72 問と計算演習 31 問（`bk.drill`）を全部、式で計算し直しました。図は、数字を持つ図の文字（約 545 か所）を一次資料と計算で照らしました。
3. 学科テストに足した 81 問（W23）、まとめの章 `g1`（問い 15・口述 4・確認問題 10・日米の表 25 項目。W25）、課目と教科書の食い違いの直し（W07d2：`syllabus.js`・`school.js`・`sanford-course.js`・CADET のチェックリスト）、CADET の授業（W26）、用語の表に足した 140 語の根拠（W24）を読みました。
4. R2 で状態が変わった台帳の行（0f68d6e の台帳と今の台帳を比べて、ERRATA 49 行・RULINGS 23 行。UNVERIFIED は 0 行）を 1 行ずつ、今の文・コードと照らしました。
5. 一次資料（2026-10-30 に取り直したか、同じセッションの前の単位が取ってハッシュの合うもの）：
   - 米国：eCFR（14 CFR 1.1・23.2005・23.2200・23.2215・23.2230、2017-01-01 版の 23.3・23.333・23.335・23.337・23.1387・23.1505・23.1507、39.3・39.7、61.15・61.19・61.23・61.56・61.57・61.87(d)・61.95、73.13、91.1・91.3・91.103・91.113・91.117・91.119・91.121・91.123・91.125・91.129〜91.131・91.143・91.151・91.155・91.157・91.203・91.205・91.207・91.209・91.211・91.215・91.225・91.409、49 CFR 830.15）。
   - AIM（FAA の HTML）：4-1-15・4-1-20・4-2-2・4-2-4・4-2-7・4-2-9・4-3-3・4-3-11・4-3-13・4-3-14・4-3-18・4-3-21（この版は 4-3-20 が Standard Taxi Routes）・4-3-23・5-1-14・5-2-5・6-3-1・6-3-2・7-1-6・7-1-7・7-1-27・7-1-29・7-2-3・7-4-6・8-1-2・8-1-4・8-1-5・8-1-6・8-1-8、P/CG（Roger・Say altitude・MAYDAY・PAN-PAN）、FAA JO 7110.65 第 3 章第 10 節（3-10-1 の例 “continue, expect landing clearance two mile final”。2026-10-30 に取得）。
   - FAA の手引き：PHAK（FAA-H-8083-25C）第 5・7・8・11・12・16・17 章（臨界迎え角 16〜20°・地面効果 1.4/23.5/47.6%・重さ 10% で離陸距離 21%・向かい風 10% で 19%・方向指示器は約 15 分ごと・北旋誤差 15° ＋緯度の半分・薬は服用間隔の 5 倍）、AFH（FAA-H-8083-3C）第 3 章 p.3-5（外 9 割・中 1 割まで）・第 9 章（フレアの目 10〜15°・突風の半分）・第 13 章（約 2°・ボール 1/3〜1/2・最初は 5〜10° を一瞬・Vmc デモの入り）・第 18 章、AWH（FAA-H-8083-28）、IFH。
   - ACS：FAA-S-ACS-6C（PA.VIII.A の ±200 ft・±20°・±10 kt、PA.IV.F の 200 ft、PA.VII.B、PA.X.B.S2「approximately 10 knots above VSSE」・S7）。
   - Archer III POH（VB-2266）：2.5 の速度計の帯（45〜102・50〜125・125〜154・154）、油圧の帯（25・55・95・115）、CG の範囲（2,550 lb で 88.6〜93.0 in、2,050 lb 以下で 82.0〜93.0 in）、前輪の操向 20°、左右のマグネトーのスイッチ・START スイッチ・BATT MASTR と ALTR、非常用バッテリー。
   - KSFB の滑走路端の座標（AirNav の FAA データ、2026-10-01 有効）。
   - 日本：e-Gov の写し（`textbook/rewrite/sources/egov/`：航空法施行規則第 178 条・第 206 条ほか）、JCAB の学科試験例題集（定期・准定期運送用 001761085・二等航空整備士 001761106。sha256 が `book-terms.js` の記録と同じ）。

## 3. 結果の要約

- **must はありません。** 数字・規則・計算・図で、一次資料と食い違う文は見つかりませんでした。
- **計算は全部合います**：考えてみよう 72 問・計算演習 31 問・学科テストの計算 7 問・`g1` の 4 問（GS・AGL・ft 換算・偏流修正角 11.5° と GS 98 kt）。旋回の表（10°〜75° の荷重倍数・失速速度の倍率・旋回率・半径）、重量と重心の例（87.0 in・91.2 in・90.7 in・90.9 in・31 lb・2,538 lb／91.3 in）、密度高度（2,440 ft・4,400 ft）、持ち上げ凝結高度（3,600 ft と 7,200 ft）、燃料計画（16.5 gal・18.9 gal）、偏流修正（8°・96 kt、7°・97 kt）、身体検査とフライトレビューの期限（2031-03-31・2028-03-31）も合います。
- **学科テストの 81 問**：正解・理由・出典はどれも一次資料と合います（AIM 4-2-2・7-1-27・JO 7110.65 3-10-1 の番号も確かめた）。今の 14 分野に日本の法令の問はありません（決まり 14）。
- **`g1`**：問い 15・口述 4・確認問題 10 の答えは正しく、日米の表は `FL.jur` から描かれ、日本の欄は e-Gov の写しと合います。
- **W07d2 の直し**：課目の文と採点は AFH・ACS・AIM と合います（4 の N1 だけ、AFH と ACS の言い方の違いを書き足すとよい所）。Sanford の滑走路の 8 点は FAA のデータと一致しました。
- **一人目の must 6 つは直っています**（`aero.struct` の突風・`aero.spin` の思い出そう・`sys.radio` の空間波・`inst.flow` の思い出そう・図 `instApBand`・`perf.wbex` の 2,608 lb）。
- **台帳**：R2 で閉じた ERRATA 49 行・RULINGS 23 行は、どれも今の文とコードで直っています（6）。ただし 72 行とも確かめ役の署名（`checkedBy`）がなく、CLAIMS には本にもう見つからない古い行が 763 行あります（4 の S1・S2）。

## 4. 問題（重い順。場所・何が違うか・直し方・根拠）

### must

なし。

### should

**S1　CLAIMS.json：本にもう見つからない行が 763 行（第 1 部 約 650 行）**
- 場所：`textbook/rewrite/combined/ledgers/CLAIMS.json`。`check-claims.mjs` の info `ledger-row-not-in-book` 763 件（章ごと：intro 111・en 65・aero 72・sys 64・inst 45・perf 76・wb 21・wx 51・navb 86・law 66・comm 62・hf 22・g1 12・radio 4・basics 3・adm 2・ops 1）。
- 何が違うか：W24 の用語の直し（教官 → 操縦教員・方向舵・無線呼出符号など）と R2B・R2C の統合で文が書き換わり、古い文の行が残っています。今の文には新しい行が付いているので、本の文に札がないわけではありません（第 1 部の未札の文は 0）。しかし同じ主張の古い版と新しい版が台帳に並び、署名（`checkedBy`）を付けるとき、どちらを確かめたかが分からなくなります。
- 直し方：統合役か W27 の確かめ役が `check-claims.mjs --out` で今の主張の一覧を出し直し、本に見つからない行を消すか、新しい行へ `note` で引き継いでから消す（ledgers/README のパッチの形）。
- 根拠：`node textbook/rewrite/combined/tools/check-claims.mjs`（2026-10-30。checked 2,835・tagged 2,140・info 766）。

**S2　R2 で閉じた台帳の 72 行と、第 1 部の CLAIMS 2,482 行に、確かめ役の署名がない**
- 場所：ERRATA 49 行（10 の表）・RULINGS 23 行・CLAIMS の第 1 部 2,492 行のうち 2,482 行（署名ありは 10 行）。`validate.mjs`：error 0・warning 538。
- 何が違うか：決まり（ledgers/README と基準 1・2・3）では、直した人と別の確かめ役の署名がそろうまで行は閉じません。
- 直し方：この報告の 6 と 10 で確かめた ERRATA 49 行・RULINGS 23 行に、統合役が `checkedBy: "factcheck2-R2"` を付けるパッチを入れる（この単位は「直さない役」なので、台帳もパッチも書いていません）。CLAIMS は S1 の整理のあとに、W27 の確かめ役が章ごとに署名する。
- 根拠：`node textbook/rewrite/combined/ledgers/validate.mjs`（2026-10-30）。

### nit

**N1　課目 m3（Vmc デモ）の入りの速度：ACS と AFH で言い方が違うことを書いておくとよい**
- 場所：`flight-lab/src/syllabus.js` m3 の段階「準備（左を模擬停止）」（`SM.sse + 10` ＝ 92 kt）と ERRATA `SYNC.m3-speed` の `note`。
- 何が違うか：誤りではありません。文は自家用 ACS（FAA-S-ACS-6C PA.X.B.S2「approximately 10 knots above VSSE」）どおりです。AFH 第 13 章（FAA-H-8083-3C、VMC Demonstration の段）は「approximately 10 knots above VSSE or VYSE (whichever is higher)」で、Seminole（Vsse 82・Vyse 88）では約 98 kt になります。
- 直し方（案）：ERRATA の `note` か課目の `why` に「AFH は Vsse と Vyse の高いほう＋約 10 kt（この機体では約 98 kt）。この課目は ACS の言い方」と 1 行。採点は変えなくてよい。
- 根拠：上の 2 つの資料。

## 5. 確かめて正しかったもの（抜き取りでなく全部読んだもの）

| 何 | 結果 |
|---|---|
| 学科テストの 81 問（`quiz.js`、`q_aero` #11〜20・`q_sys` #11〜20・`q_perf` #11〜20・`q_wx` #11〜20・`q_law` #11〜18・`q_comm` #11〜16・`q_radio` #16〜23・`q_hf` #11〜21・`q_nav` #11〜18） | 全部正しい。14 CFR 39.3/39.7・61.23(d)・73.13・91.3・91.125・91.131・91.155(c)(d)・91.203(b)・91.409(b)、AIM 4-1-20・4-2-2・4-2-4・4-2-7・4-3-11・7-1-6（Zulu）・7-1-27（NEXRAD 15〜20 分）・8-1-2（酸素・ダイビング 12/24 時間）・8-1-6（10°・1 秒、暗順応 30 分）、JO 7110.65 3-10-1、PHAK（霜・早期着火とデトネーション・CHT・補間・21%・有効搭載量・寒冷前線・移流霧 15 kt・凍雨）、AFH（スピンの回復・ゴーアラウンドのフラップ）、SAIB CE-10-11 |
| `g1.review`（問い 15・口述 4）と章末の確認問題 10 | 全部正しい（PHAK 17-18 の「five maximal dosing intervals」、AR.s1 50 kt × √2 ≒ 71 kt、静圧孔とピトー管の詰まり、METAR/TAF は真方位・ATIS と管制塔は磁方位、91.123(a)） |
| `g1.japan` の表（25 項目、`FL.jur` から描く） | 施行規則第 178 条（14,000 ft・QNH・出発点の標高・1013.2 hPa）を e-Gov の写しで確かめた。R2 の `book-jur.js` の変更（`nordo.ifr` の日本の欄：施行規則第 206 条第 3 号のイ・ロ・ハ、`multi.rating` の「等級」）も写しと合う |
| 考えてみよう 72 問・計算演習 31 問 | 全部の計算が合う（3 の 2 つめの項目）。AIM 4-3-21（滑走路を出る）・4-3-18（滑走路は 1 本ずつ横切る許可）・5-2-5（LUAW の 2 分）・4-1-15（時計の方向は航跡）・3-2-4（Class C の “standby”）・61.57(b)・91.409(b)・91.17 と AIM の 12〜24 時間・AIM 8-1-5 の錯覚も合う |
| 図の数字（約 545 か所） | 速度計の帯と油圧の帯は POH 2.5 どおり。荷重倍数の図（3.8 G は約 75°）、標準大気（5,000 ft 5℃・24.9 inHg、10,000 ft −5℃・20.6 inHg、18,000 ft −21℃・14.9 inHg、圏界面 −56.5℃）、雲の層の高さ（AWH 表 12-3）、マイクロバースト（2.5 mi 未満・6,000 fpm・5〜15 分）、北旋誤差（15° ＋ 29° ÷ 2 ≒ 30°）、VFR の雲からの距離（3-152、Class G 1 SM）、警告空域 3 NM、Class C の 5/10/20 NM、コードの切り替え（2700 → 7200 で 7700 を通らない）、酸素の図（91.211 と AIM 8-1-2 の 20〜30 分・5〜12 分）、風の三角形 3 枚、燃料計画 16.5/18.9 gal、重心の図 −2.6 in |
| 用語の表に足した 140 語の根拠 | 例題集（自家用・事業用）の根拠 66 か所は全部、その語が例題集の本文にある。定期・准定期運送用と二等航空整備士の例題集の根拠も 16 語を抜き取り、全部あった（早期着火・デトネーション・迎え角・翼幅・終極荷重・耐空類別・ダッチロール・移流霧・滑昇霧・フライト・ディレクターなど） |
| 課目（W07d2） | 4 の N1 のほかは一次資料どおり：a2（外 9 割・計器 1 割、ACS の直線水平飛行は計器の課目で ±200 ft・±20°・±10 kt）、a7（入り方：AFH 第 5 章・ACS PA.VII.B）、判断 11（失速の高度は参考の行、`stallRecovery` の `pass: true`、`book-3.js` の `ops.stall` の囲み）、フレアの目（AFH 第 9 章の 10〜15°）、x1・c1（61.87(d) の 15 項目に急旋回はない）、x2（ACS の 200 ft）、i1（IFH の「速度 ÷ 10 ＋ 7」・10 秒で 30°）、m2・m4（約 2°・ボール 1/3〜1/2・最初は 5〜10° を一瞬）、m5（AFH の Vyse・公開チェックリストの 90 KIAS）、r1（突風の半分）、MAYDAY の順（AIM 6-3-2：状況 → 意図 → 位置 → 高度）、5C は語呂と書いたこと |
| Sanford の図（`sanford-course.js`） | 8 つの滑走路端の座標が AirNav の FAA データ（2026-10-01 有効）と小数 6 けたまで一致 |
| CADET（`checklists-archer.js`・`school.js`・`book.js`） | POH に BATT MASTR・ALTR・左右のマグネトーのスイッチ・START スイッチ・天井のスイッチがある。授業の組み立て（`BANK_OF`・`deep` を飛ばす）は事実の文を持たない |
| 第 1 部の本文の抜き取り | 法規の章の数字（91.1(a) の 3 NM・91.123(d) の 48 時間・61.15(e) の 60 日・61.19(c)(1)・61.56(a)・830.15 の 10 日・91.207・61.95・91.215/91.225・91.157(a)・91.119・91.117）、旧 Part 23 の値（23.333 の 50/25 fps・23.335・23.337 の 3.8/4.4/6.0 と 0.4 倍・23.1505・23.1507）、23.2005(d) の 60°、POH（O-360-A4M・オイル 8 qt・CG の範囲・2,558/2,550 lb・実用類 2,130 lb）、PHAK の臨界迎え角、AIM 7-4-6 の 2 分、AIM 8-1-6 のサングラス 85%、AIM 5-1-14 の 30 分、日本の囲み（気象庁の TAF 40 空港・1 日 4 回・30 時間、技能発揮訓練の附則と第 162 条の 20 は R1V と factcheck-hfadm の一次資料と一致） |

## 6. R2 で閉じた台帳の行（0f68d6e と今の台帳の比較）

ERRATA 49 行と RULINGS 23 行のすべてで、`where` に書かれた場所の今の文・コードが `correction` のとおりになっていることを確かめました（例：K の 21 行は文字列の有無と内容、SYNC の 25 行は課目のコードと一次資料、`APP.lesson-k1k2` は課目 k1・k2 の `book: ['inst.pfd']`、`APP.bk-photo-mod` と `R.photo-mod` は `bk.photo` の `mod`）。`SYNC.pa44-desc`（not-error）の理由（`physics.js` の説明の実名は決まり 10 の対象外、CADET は `main.js` で消す）も読んで妥当でした。直っていない行はありません。

| 台帳 | 行 |
|---|---|
| ERRATA（fixed 48・not-error 1） | K.overview.K5・K.aero.K-2・K.systems.K1・K.systems.K2・K.instruments.gap-1・K.wb-perf.K1・K.wb-perf.K2・K.wb-perf.K3・K.wb-perf.K5・K.wb-perf.K7・K.weather.K1・K.weather.K3・K.weather.K4・K.weather.K6・K.navigation.K1・K.navigation.K3・K.human.K1・K.human.K4・K.human.K5・K.human.K6・K.human.K7・APP.lesson-k1k2・APP.bk-photo-mod・SYNC.a7-entry・SYNC.a2-scan・SYNC.a2-std・SYNC.x2-zone・SYNC.t4-flaps-key・SYNC.before-landing-checklist・SYNC.t2-abeam-rpm・SYNC.flare-eyes・SYNC.e2-heading・SYNC.mayday-order・SYNC.c1-content・SYNC.x1-timing・SYNC.n2-tower・SYNC.n2-grading・SYNC.n3-numbers・SYNC.lost-5c・SYNC.i1-turn-rate・SYNC.i5-intercept・SYNC.pa44-desc（not-error）・SYNC.m1-gear・SYNC.m2-bank・SYNC.m3-speed・SYNC.m5-final・SYNC.r1-gust・SYNC.cadet-checklist-mag・SYNC.sanford-diagram |
| RULINGS（fixed 23） | R.weight-unit・R.aoa-term・R.critical-aoa・R.turbulence-va・R.left-turning・R.ground-effect-height・R.turn-rate-constant・R.carb-ice-temp・R.manifold-pressure・R.northerly-turn-error・R.pa-coefficient・R.pressure-altitude-term・R.fast-landing・R.fuel-cg-shift・R.planning-margin・R.cell-stage-names・R.windshear-term・R.ceiling-term・R.cloud-base-formula・R.high-pressure-weather・R.photo-mod・R.cold-sick・R.passenger-resource |
| UNVERIFIED | R2 で状態が変わった行はない |
| CLAIMS | R2 で「閉じた（署名した）」行はない。第 1 部の 2,492 行のうち 2,480 行が R2 の新しい行（教材値 65・参考値 1,962・条文 442・推測・要確認 11）。4 の S1・S2 |

`SYNC.t2-abeam-rpm`・`SYNC.t4-flaps-key`・`SYNC.n2-tower`・`SYNC.n2-grading`・`SYNC.n3-numbers`・`SYNC.i5-intercept` はフライトモデルと画面の値で、一次資料の事実ではありません。文が「この教材のモデルでは」「教材の値」と書いていることと、値をコードから作っている（手書きでない）ことを確かめました。

## 7. 検査の結果（2026-10-30）

| 検査 | 結果 |
|---|---|
| FLIGHT LAB `npm run -s test:fast` | 89 / 89 pass（fail 0） |
| TEXTBOOK `npm test` | 36 / 36 pass（fail 0） |
| CADET `npm run -s test:fast` | 248 / 248 pass（fail 0） |
| `node textbook/rewrite/combined/ledgers/validate.mjs` | ok：error 0・warning 538（署名待ちが主） |
| `node textbook/rewrite/combined/tools/check-claims.mjs` | error 0・warn 71（第 2〜6 部と序部の `sim` の未札。第 1 部は 0）・info 766（本にない台帳の行 763：S1） |

`check-chapter.mjs` は、この単位の持つ章の下書きがないので流していません。

## 8. 触った台帳の行

なし（読んだだけ）。

## 9. 未解決のこと

- 第 1 部の本文は、条番号・AIM の番号・数字と単位を含む文を中心に読みました。原理の説明の文（数字のない文）は、一人目の事実確認・専門家の読み・初学者の読みに頼っています。
- 日本の囲みのうち、気象庁の技術情報（第 337 号・第 362 号の「並」「強い」）と医薬品の指針の 4 区分は、この単位では一次資料を開いていません（一人目の factcheck-wx・factcheck-hfadm が確かめた記録があります）。〔要確認〕の札の付いた所（管制・ATIS の単位、7600 と灯火信号、米国の Class と日本の空域の対応など）は、推測で埋めていないことだけを確かめました（W37 の仕事）。
- この単位は、同じ単位の前の試み（途中で止まったもの）がセッションの作業場所に残した差分の抜き出しと本文の抜き出しを、中身を見て使いました。結論はすべて、この報告の作業で読み直して出しました。

## 10. ほかの単位にお願いしたいこと（needs from others）

1. **統合役（R2 の締め）**：6 の表の ERRATA 49 行・RULINGS 23 行に `checkedBy: "factcheck2-R2"`（と `checkedOn: "2026-10-30"`）を付けるパッチを入れてください（S2）。
2. **統合役か W27 の確かめ役**：CLAIMS.json の本にない 763 行を整理してください（S1）。手順：`node textbook/rewrite/combined/tools/check-claims.mjs --out <file>` で今の主張を出し、`ledger-row-not-in-book` の行を消すか新しい行へ引き継ぐ。そのあと、第 1 部の行に章ごとに署名。
3. **課目の持ち主（`syllabus.js`）か統合役**：N1 の 1 行（AFH と ACS の Vmc デモの入りの速度の言い方の違い）を、ERRATA `SYNC.m3-speed` の `note` か m3 の `why` に足すかを決めてください（採点は変えない）。
