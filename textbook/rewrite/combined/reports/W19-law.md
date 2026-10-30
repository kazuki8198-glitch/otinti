# W19（law）の報告：第 1 部 第 12 章 `law`「規則と空域（14 CFR と米国の空域）」の下書き（R2）

単位：W19 の law の分（DESIGN 7.2 の R2 の W19「`law`・`radio*`」のうち章 `law`。3.3 第 1 部の章 12、4.1 の行 6、4.2 の kiso09）。`radio1`〜`radio5` は別の書き手の持ち物です（`reports/W19-radio.md`）。作業日：2026-10-30。
書いたのは**下書きだけ**です（どの製品も読まない `textbook/rewrite/combined/drafts/`）。製品のファイル・台帳の JSON・道具・`flight-lab/kiso/` は 1 つも変えていません。コミットはしていません（統合役の仕事）。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/drafts/law.js`（新） | 章 `law` の完全な定義（`B.add({...})` 1 つ）。`flight-lab/src/book-2.js` の今の `B.add({ id: 'law', … })` を、同じ場所（`wx` と `radio1` の間）でそのまま置き換える形。8 節・章末（用語 28・例 5・注意 4・確認問題 11・説明してみよう 10・出典 25・課目 2）。新しい出典 9 件は先頭の `NEW_R`（登録のときに `book-core.js` の `R` へ） |
| `textbook/rewrite/combined/drafts/law-figs.js`（新） | 図。新しい図 3 枚（`lawSources`・`lawCurrency`・`vfrTwoViews`）と、この章が使う今の図の描き直し 2 枚（同じ名前：`preflightInfo`・`rightOfWay`）。一覧はファイルの頭 |
| `textbook/rewrite/combined/drafts/law.claims.json`（新） | 主張の札 219 行（`check-chapter.mjs --claims-out` が抜き出した全部の文。条文 179・参考値 40。うち「例題」7）。`law.rules#f71d58f7` は CLAIMS にもうある行（W12 が書き、R1V が署名）をそのまま写した |
| `textbook/rewrite/combined/reports/W19-law.ledger.json`（新） | 台帳のパッチ 243 行（下の 6）。**章を登録するコミットで**取り込む |
| `textbook/rewrite/combined/reports/W19-law.md`（新） | この報告 |

検査の流し方：
```sh
node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/law-figs.js textbook/rewrite/combined/drafts/law.js
```

## 2. 何をしたか・なぜ

### 2.1 章の形（DESIGN 3.3 の章 12）

今の 6 節は ID と順のまま残し、DESIGN 3.3 の 2 つの新しい節をその順に入れました（`law.basis` が最初、`law.pilot` が `law.pic` の次）。**全節 `scope: 'us'`**（米国の規則が本文：DESIGN 3.4）。日本は囲みの中だけです。

| # | 節（★＝新） | `from` | `faa`（ACS-MAP） | 中身と囲み |
|---|---|---|---|---|
| 1 | ★`law.basis` 規則の読み方：資料の格・承認と条件・適用の時点 | kiso09.1・09.2・09.8 | — | 「誰が・どの機体で・どこを・どの方式で・いつ」で当てはまる決まりが決まる（K09.1）。**資料の格**の表（規則 14 CFR・運用限界 91.9・ノータムの一時的な規制 91.137〜91.145・管制の承認と指示 91.123 は守る義務がある／AIM・AC・ハンドブックは規則ではない）。AIM が自分を「規則ではない」と書くこと（Flight Information Publication Policy）と AC の扱い（AIM の CFR and AC の頁）、それでも AIM 3-2-4 が 91.130 の守り方を示すこと。国際民間航空条約と附属書が土台で、Part 91 の根拠の欄も条約を挙げ、米国は ICAO との違いを AIP GEN 1.7 に書く（K09.2）。**承認と条件**：管制承認は規則・最低高度から外れる許可ではない（AIM 4-4-1）、分からなければすぐ聞く（91.123(a)）、離陸の許可が出ても燃料・重量・天気・資格は機長が確かめる（K09.1）、操縦教員の裏書きも条件つき（61.87・61.89・61.95）。判断の目。**適用の時点**：91.113 は 2025 年 7 月に改正、VFR のチャートと Chart Supplement は 56 日ごと、AIM はほぼ半年ごと、ノータムの時刻は UTC、Part 91 は米国の中（3 NM まで）、外国ではその国の決まり（91.703(a)(2)）。ここを混同しない（表）。`bk.jp`：日本の層（航空法は条約と附属書に準拠すると目的の条に書く・施行規則・告示・AIP とノータム）。思い出そう（VFR/IFR と VMC/IMC → `basics.rules`：CONCEPTS `C.flight-rules-conditions` の呼び戻し）。図 `lawSources`（基礎教材の ch09-fig9-2 を米国の本文の版に描き直した） |
| 2 | `law.pic` | — | PA.I.A.K4・PA.VI.C.K2・IR.III.A.K2 | 今の節。「操縦士が持つもの」は `law.pilot` へ移した。91.103 を「出発前の確認（preflight action）」と、離陸距離・着陸距離（91.103(b)）に。ほかの人が準備しても機長の確認は残る（kiso09.7 の考え）。緊急で管制の指示から外れたら知らせる（91.123(c)）・優先されたら求めに応じて 48 時間以内に報告（91.123(d)）を足した。囲み `bk.jur('preflight')`（今のまま）。図 `preflightInfo` はキャプションの語だけ描き直した |
| 3 | ★`law.pilot` 操縦士の決まり：flight review・最近の経験・事故の報告 | —（新） | PA.I.A.K1・K2・K4・PA.I.H.K2・PA.III.A.K8 | 持つもの・見せるもの・記録するもの（61.3・61.51(i)(a)）、第 3 種の航空身体検査証明の期限（61.23(a)(3)(d)。BasicMed の条件の 1 つ 61.23(c)(3)）、学生操縦士の証明は 2016-04-01 より後なら期限なし（61.19(c)(1)）、**フライトレビュー**（61.56(a)(c)(d)(g)）、**最近の飛行経験**の表（61.57(a)(b)(c)）、暦月と日の数え方と計算演習、**学生操縦士の制限**（61.89。`law.rules` から移した）と単独飛行の裏書き（予告で `solo.req`）、**NTSB への報告**（49 CFR 830.2・830.5・830.10・830.15）、ここを混同しない「規則の 3 つの夜」（14 CFR 1.1・61.57(b)・91.209）。囲み `bk.jur('accident', 'night')`（FL.jur の `boxes` のとおり）。体調・薬・飲酒は住所 `hf.self` へリンク。図 `lawCurrency`（新） |
| 4 | `law.aircraft` | — | PA.I.B.K1〜K4・PA.II.A.K2・PA.XII.A.K2・IR.II.C.K2・K3 | 今の節。無線局の免許は国際の飛行・交信のとき（米国の 47 CFR 87.18 で確かめた）、**動かない装備の判断**（91.213(d)）、ELT の電池（91.207(c)）、点検の期限を「暦月」に、100 時間の 10 時間の例外（91.409(b)）。囲み `bk.jur('docs')`（今のまま） |
| 5 | `law.airspace` | — | PA.I.D.K1・PA.I.E.K1 | 今の節。Class B は「管制承認」（FL.terms の正式名）、付録 D の空港の 30 NM（オーランド国際空港が付録 D の Section 1 にあることを確かめた）。`bk.jp`：日本は空域を名前で定める（航空法第 2 条第 12〜14 項。ICAO の Class との対応は〔要確認〕：`U.icao-class`）。DESIGN の「日本の空域は第 7 部へ。リンクは囲みの中」は、第 7 部がまだないのでリンクなし（決まり 13） |
| 6 | `law.vfr` | — | PA.I.E.K1 | 今の節。雲高の定義（14 CFR 1.1）、特別有視界飛行方式の時間は「日の出から日没まで」のほかは IFR の資格と装備（91.157(b)(4)）、学生の視程は `law.pilot` へ。**DESIGN の新しい図**：`vfrTwoViews`（「雲の下 500 ft」＝「機体の上 500 ft に雲がない」：雲を中心にした言い方と機体を中心にした言い方で上下が入れかわる）。囲み `bk.jur('vmc', 'vmc.ad')`（今のまま）と `bk.jp`（施行規則第 5 条は機体を中心にした言い方。日本の「上方」は米国の「雲の下」に当たる。数字は囲みにある） |
| 7 | `law.special` | — | PA.I.D.K6・PA.I.E.K3・K4 | 今の節。ノータムの太字の定義（CONCEPTS `C.notam-vs-ais` の住所）と「航空情報は総称」、ロケットの打ち上げの制限（91.143）、**迎撃されたら**（AIM 5-6-13：指示に従う・121.5 MHz・7700）を足した。「架空」の文は残した（CADET の KEEP）。囲み `bk.jur('svfr')`（今のまま） |
| 8 | `law.rules` | — | PA.I.D.K2・PA.III.B.K3 | 今の節。**優先権 → 進路権**（FL.terms の正式名。初出「進路権（優先権、right-of-way）」）、最低安全高度の箇条を です・ます に、指示対気速度、Class G・E の左回り（91.126(b)・91.127(a)）、地上滑走も管制塔の許可（91.129(i)）。学生操縦士の制限は `law.pilot` へ（前方の `solo.req` への予告なしのリンクの error が消えた）。教材値の巡航の数字の文は、数字なしの文に（参考値と並べられないため）。囲み `bk.jur('row', 'msa', 'speed', 'fuel.vfr')` と key「米国の VFR の燃料（91.151）は、最初の着陸予定地まで…」（`flight.test.mjs` の決め打ち）は今のまま |

- **用語**：FL.terms の正式名で、章の初出を「正式名（通称、English）」にした（機長・管制承認・飛行規程・POH・ノータム・航空路誌・航空情報・離陸・重量・重心位置・操縦教員・単独飛行・出発前の確認・離陸距離・着陸距離・野外飛行・不時着・技能証明・航空身体検査証明・学生操縦士・飛行視程・地上視程・待機・フラップ・夜間・右舷灯・左舷灯・尾灯・対気速度計・高度計・磁気コンパス・空虚重量・トランスポンダー・無線呼出符号・有視界飛行方式・計器飛行方式・雲高・場周経路・特別有視界飛行方式・METAR・進路権・見張り・最低安全高度・指示対気速度・地上滑走・針路）。図の文字が先に正式名を出す所は、図の言葉を直した（`preflightInfo` のキャプション・`lawCurrency` の「身体検査証明」）。「教官」は `law` では操縦教員（法の役割の言葉）にそろえた。
- **CADET**：決め打ちの文（決まり 9：`law.special` の「架空」）はそのまま。本文に FLIGHT LAB の操作の言葉と実在の航空会社名なし。日本の側は `bk.jp`・`bk.jur` の日本の列だけ（CADET が消す）。CADET に残る本文だけで理解できる（日本の囲みは補い）。ここが大切は各節 3〜4 項目・60 字以内。
- **確認問題**：今の 5 問は場所・順・選択肢の並びのまま（語だけ：進路権。`law.quiz[2]` の理由に出典 91.151）。新しい 6 問を後ろに足した（AIM の格・フライトレビューの暦月・最近の経験・NTSB・管制承認・夜の着陸。正解の位置 A・C・D・A・C・D）。
- **説明してみよう**：kiso09 の記述問題を米国の本文に書き直した 8 問（q1・q2 は行き先が `written:law`、q7・q9・q11・q12・q13・q14 は日本の版の行き先 jlaw・jair が残るので米国の版として）と新しい 2 問（期限の 3 つの決まり・翼端の損傷と事故の定義）。答えに根拠の節へのリンク。日本の法令の語は章末に書いていない（`check-jurisdiction` の章末の決まり）。
- **写真**：W22 の一覧で `law` に置く基礎教材の写真はない（ch09 の写真は外したか `comm.*`）。置いていない。

### 2.2 図（`law-figs.js`）

| 図 | 節 | 元 | 中身 |
|---|---|---|---|
| `lawSources`（新） | law.basis | 基礎教材 ch09-fig9-2 | 1 つの飛行に、規則（14 CFR）・空港と空域の情報（チャート・NOTAM）・機体の資料（AFM の運用限界）を重ねる。機長が 3 つを確かめ、管制承認はその上の条件つきの許可 |
| `lawCurrency`（新） | law.pilot | 14 CFR 61.56(c)・61.23(d)・61.57(a) | ① 暦月（2026-03-10 のフライトレビューは 2028-03-31 まで。月の目盛りは 13.6 px／月で正しい長さ）② 日（飛ぶ日から 90 日さかのぼって 3 回） |
| `vfrTwoViews`（新） | law.vfr | 14 CFR 91.155(a) | 雲を中心に（雲の下 500 ft・雲の上 1,000 ft）と機体を中心に（上 500・下 1,000・横 2,000 ft の範囲に雲がない）。縦の間隔は 500 ft＝50 px・1,000 ft＝100 px。日本の数字は描かない（FL.jur の囲みにある：STYLE「囲みの数字は手で書きません」） |
| `preflightInfo`（描き直し） | law.pic | 教科書の図 | キャプションだけ：「離着陸距離」→「離陸・着陸の距離」（用語の初出を本文に）、91.103 に国 |
| `rightOfWay`（描き直し） | law.rules | 教科書の図 | 「優先」→「進路権」、キャプションに国。順は 91.113(d)（2025-07-24 の改正の後） |

8 枚とも Chromium 390 px で error 0（最小の文字 10.3 px）。新しい 3 枚と描き直し 2 枚は 390 px の PNG で目で見た（重なり・はみ出し・矢印。`figshot.mjs` を下書きを読むように写したスクラッチの道具で）。`vfrMinima`（表）・`airspace`・`vfrCloudClearance`・`specialUseAirspace` は今のまま。

## 3. 事実の確かめ（一次資料。数字と規則は全部 `law.claims.json` に札と出典）

| 事実 | 一次資料（2026-10-30 に本文を読んだ） |
|---|---|
| 61.3・61.19・61.23・61.51・61.56・61.57・61.87・61.89・61.95、1.1（Night・Ceiling・Air traffic clearance・Controlled airspace）、91.1・91.3・91.7・91.9・91.103・91.113（改正の記録 Amdt. 91-381、2025-07-24）・91.117・91.119・91.123・91.126・91.129・91.130・91.131・91.133・91.135・91.137・91.141・91.143・91.145・91.151・91.155・91.157・91.203・91.205・91.207・91.209・91.213・91.215・91.225・91.409・91.411・91.413・91.703、Part 91 の Authority（49 U.S.C. と国際民間航空条約第 12 条・第 29 条）、Part 91 付録 D Section 1（オーランド国際空港） | eCFR versioner API（Title 14、2026-10-28 の版） |
| 事故・重大インシデント・大きな損傷の定義と除外、すぐに知らせる・運航者・最寄りの NTSB、残骸の保存、10 日以内の報告 | 49 CFR 830.2・830.5・830.10・830.15（eCFR、2026-10-28 の版） |
| 航空機の無線局の免許（国際の飛行・交信をしなければ規則による免許） | 47 CFR 87.18（eCFR） |
| 管制承認は規則・最低高度から外れる許可ではない、変えた承認を求める | AIM 4-4-1（2026-07-09 有効の版、HTML） |
| Class A〜E の形・入る条件・「standby」で交信の確立・remain outside、特別な空域、TFR、ノータム（題は Notice to Airmen）、迎撃されたときにすること | AIM 3-2・3-4・3-5-3・5-1-3・5-6-13（同） |
| AIM は規則ではない（Flight Information Publication Policy d）、AC は規則に取り込まれなければ拘束しない、AIM の改訂の予定（Basic・Change 1〜3・次の Basic） | AIM の PDF（AIM_Basic_w_Chg_1_and_2_and_3_dtd_7-9-26_FINAL.pdf）の前付け |
| 14 CFR の題・Part 61 と 91・AC は規則ではない・FDC NOTAM は規則の性質・ノータムの時刻は UTC（例 0707272300） | PHAK（FAA-H-8083-25C）第 1 章 |
| Class E の下限は多く 1,200 ft AGL（地表か 700 ft の所も）、Class G | PHAK 第 15 章 |
| VFR のチャートは 56 日ごとの版（今の版 2026-10-29）、Chart Supplement は 56 日ごと | FAA Aeronautical Information Services の VFR Raster Charts・Chart Supplements のページ |
| 米国は ICAO の標準との違いを一覧にしている | US AIP GEN 1.7 |
| Class B に入る管制承認の言い方 | FAA JO 7110.65 の 7-9-2 の PHRASEOLOGY |
| 航空法は国際民間航空条約と附属書の標準・方式・手続に準拠（目的の条） | e-Gov API v2、航空法 令和 7 年 12 月 1 日施行の版の第 1 条（写し `sources/egov/` にはない条） |
| 航空法第 2 条第 12〜14 項（管制区・管制圏・情報圏）、施行規則第 5 条（機体からの上方・下方・水平の距離で書く） | e-Gov の写し `sources/egov/articles/kokuho/2.json`・`kokuho-kisoku/5.json` |

**書かなかったこと（一次資料で確かめていない・この章の外）**：
- NTSB の調べが罰のためでないこと（49 CFR 831 を読んでいない）。書いていない。
- 学校での事故・インシデントの報告の手順（公開されていない）。「操縦教員と学校に知らせ、学校の手順に従う」とだけ書いた。
- 日本の空域と ICAO の Class の対応（`U.icao-class`）。〔要確認〕のまま。
- `law.rules` の Archer の巡航の教材値（今の本の `${AR.cruise}` KIAS）：POH の参考値と並べないと基準 6 の info になるので、数字のない文（「巡航でもこの制限よりずっと遅く飛びます」）にした。
- 日本の数字は、どの `bk.jp` にも手で書いていない（FL.jur の囲みが描く）。

## 4. 検査の結果

### 4.1 章の検査（`check-chapter.mjs`、下書き 2 つ、Chromium あり）

| 検査 | error | warn | pending | 中身 |
|---|---|---|---|---|
| chapters・form・data・volume・jurisdiction・chapter-refs・figures・photos・concepts・jur・path・provenance・egov | 0 | 0 | 0 | 8 節・用語 28・例 5・注意 4・問 11（理由つき）・https の出典。図 8 枚（最小 10.3 px）。後ろの部への `bk.see` 1 本（`solo.req`、「予告」つき）。日米の囲みは FL.jur の `boxes` のとおり（① の数え方で missing 0）。form の info 1：`law.aircraft` に図がない（今の本と同じ） |
| claims | 0 | 0（今の `CLAIMS.json` のままでは 8） | 0 | `law.claims.json` を足した写しの台帳（`COMBINED_LEDGERS`）で 219/219 に札。今の `CLAIMS.json` には行がないので、そのままでは節ごとに「札なし」の warn 8 |
| style | **5** | 3 | 0 | 下の 4.2。5 つとも道具の数え方（部品の見出し）。warn は初出の形 3（囲みの文字と部分一致）。文の平均は節ごとに 40 字以下、最長 79 字、留保の言い方は各節 1 回まで |
| questions | 0 | 1 | 0 | 正解の位置 B 45%（今の 5 問がどれも B。並べ替えないので残る：下の 7） |
| calc | 0 | 0 | 1 | `CALC.json` がまだない |

### 4.2 style の error 5・warn 3 は道具の数え方

- error 5：W10b の部品の見出し `<b>ここを混同しない</b>`（2）・`<b>思い出そう</b>`・`<b>判断の目</b>`・`<b>答えと解き方</b>` を本文の文と数える。W14 の報告 5.2 と同じで、`check-style.mjs` の `skipForStyle` に W14 の 1 行を足すと 0 になる。
- warn 3：「運用限界等指定書」「搭載用航空日誌」は FL.jur の `docs` の囲み（日本の欄）の文字、「計器飛行」は「計器飛行方式（IFR：instrument flight rules）」の中の文字を初出と数える（P4・P5 の未解決と同じ）。

### 4.3 製品のテスト（下書きは製品が読まないので、壊していないことの確かめ）

- TEXTBOOK：`cd textbook && npm test` → **34/34 pass**
- FLIGHT LAB：`cd flight-lab && npm run -s test:fast` → **86/86 pass**
- CADET：`cd cadet && npm run -s test:fast` → **247/247 pass**

台帳：`node textbook/rewrite/combined/ledgers/validate.mjs` → ok（0 error・37 warning。warning は前からの署名待ちの行で、このパッチのものはない）。`apply-patches.mjs` の空流しは、この環境の権限で止められたので流していない（統合役が流す）。

## 5. 登録のときに確かめてほしいこと（登録で決め打ちの数が変わる所）

- 節の数：`law` は 6 → 8 節（TEXTBOOK の `COUNTS`・見出しの節の数、`TEST-CONSTANTS.md`）。
- 外部リンクの数：新しい URL 9 件（`NEW_R`）。TEXTBOOK の外部リンクの数の決め打ち。
- 製品のテストが文字で決めている所は変えていない：`flight.test.mjs` の `law.rules` の key、`jur.test.mjs` の `J.ofSection('law.rules')`（FL.jur のデータ）、CADET の `law.special` の「架空」。
- CADET の AI 教官の目次：節が 2 増える（`law.basis`・`law.pilot`）。2.5 万字の予算は W26。

## 6. 台帳の行（パッチ `reports/W19-law.ledger.json`、243 行。**取り込むのは章を登録するコミット**）

| 台帳 | 行 | 扱い |
|---|---|---|
| PROVENANCE | kiso09.1・kiso09.8 | `done`（`law.basis` の `from`。kiso09.8 は `basics.rules` と両方がそろった） |
| PROVENANCE | kiso09.q1・q2 | `done`（`written:law` 問 1・2） |
| PROVENANCE | ch09-fig9-2 | `done`（`FIG.lawSources`。描き直しは W21 の持ち物なので W21 の目視を note に） |
| PROVENANCE | kiso09.2・kiso09.cover・kiso09.q7・q9・q11・q12・q13・q14 | note だけ（law の分を置いた。jlaw・jair・door:p7 の分（W38・W42）が残る） |
| CONCEPTS | `C.flight-rules-conditions` | `done`（住所 `basics.rules`・呼び戻し `law.basis`） |
| CONCEPTS | `C.notam-vs-ais` | note だけ（住所 `jair.ais` が残る） |
| ACS-MAP | PA.I.A.K1・K2・K4・PA.I.H.K2・PA.III.A.K8 | `mapped`・`missing: []`（`law.pilot` ができた。深さの確かめは W42） |
| ACS-MAP | PA.I.D.K6・PA.I.B.K3・PA.VI.C.K2 | note だけ（迎撃・動かない装備・管制の指示から外れたとき を足した） |
| RULINGS | `R.right-of-way` | note だけ（`law` の章の語を進路権にそろえた。行の扱いは W08a のとおり fixed のまま） |
| UNVERIFIED | `U.icao-class` | note だけ（〔要確認〕で書いた） |
| CLAIMS | 218 行 | `op: "add"`（`law.claims.json` と同じ。`law.rules#f71d58f7` は CLAIMS にもうあるので足さない。`checkedBy` は事実確認役） |

触っていない行：ERRATA の `K.law.*`（W38・W39 の日本の部の行）と `T.law.*`（R1 で閉じた）。

## 7. 未解決のこと

1. **章の確認問題の正解の位置**（`check-questions` の warn）：今の 5 問がどれも B。記録（FLIGHT LAB は正解だけ、TEXTBOOK は選んだ番号）を壊さないため選択肢は並べ替えず、新しい 6 問を A・C・D・A・C・D にした。章で B 45%。問を足して散らすかは W23。
2. **`medical` の囲み**：DESIGN 3.3 の章 12 は `law.pilot` の範囲に `medical` を書くが、FL.jur の `medical.boxes` は `intro.cert`・`hf.self` だけで、`jur.test.mjs` の ① は `boxes` の外に囲みがあると止まる。置いていない（下の 8 の 2）。
3. **`law.aircraft` に図がない**（今の本と同じ。CADET の教室の画面が空）。書類・装備・点検の期限の図を足すかは W21。
4. **style の道具の数え方**（4.2）。
5. **航空法第 1 条が e-Gov の写しにない**：`law.basis` の `bk.jp` は条番号を書かずに「目的の条」と書いた（`check-egov` は条番号のない文を調べない）。写しに足せば条番号を書ける（W37）。
6. **安全レビュー**：〔安全〕の 7 項目に当たる文は新しく書いていない（`fuel.vfr` の囲みと key は今のまま）。`law.pic` の緊急のときの権限（91.3(b)・91.123(c)(d)）と `law.special` の迎撃の手順は緊急の手順に近いので、W27・W36 で一緒に見てほしい。
7. 使っていない基礎教材の問：kiso09.q3〜q6・q8・q10・q15〜q28 は行き先が intro・basics・radio・jlaw・jair・jatc・g7（W10・W19-radio・W42）なので使っていない。

## 8. ほかの単位にお願いしたいこと（needs from others）

1. **統合役（登録）**：
   - `drafts/law.js` の `B.add({...})` で `flight-lab/src/book-2.js` の今の `B.add({ id: 'law', … })` を置き換える（同じ場所）。`NEW_R` の 9 件（`ntsb830`・`cfr4787`・`aim56`・`aimPdf`・`phak1`・`aipGen17`・`faaVfrCharts`・`faaChartSupp`・`phak15`）を `flight-lab/src/book-core.js` の `R` に足し、`NEW_R.x` を `R.x` に。下書きの `ahead` は book-2.js に同じ形で足す。
   - `drafts/law-figs.js` の新しい 3 つの関数を `flight-lab/src/book-figs.js` の `FIG` に足し、`preflightInfo`・`rightOfWay` を描き直しで置き換える（`planeSide`・`planeTop` は book-figs.js にある。下書きの `cloud` は `vfrTwoViews` だけが使う小さな部品なので一緒に入れる）。
   - TEXTBOOK の `COUNTS`（節 +2）・見出しの節の数・外部リンクの数、`TEST-CONSTANTS.md`。
   - 台帳のパッチ `reports/W19-law.ledger.json` を `apply-patches.mjs --write`（CLAIMS の 218 行を含む）。
2. **W06（FL.jur）**：① `medical` を `law.pilot` に置くなら `medical.boxes` に `law.pilot` を足す（そのときは `law.pilot` の `bk.jur('accident', 'night')` を `bk.jur('accident', 'night', 'medical')` に）。足さないなら DESIGN 3.3 の章 12 の「範囲」から `medical` を外す（統合役）。② `svfr` の米国の欄「日の出から日没までのほかは、計器飛行の資格と装備が要る」：14 CFR 91.157(b)(4) は「part 61 の instrument flight の要件（計器飛行証明と最近の経験）」と 91.205(d) の装備なので、「計器飛行」（航空法第 2 条第 16 項の言葉）より「IFR で飛べる資格（計器飛行証明など）と IFR の装備」のほうが取り違えない（本文 `law.vfr` はそう書いた）。
3. **W04（用語の表 `FL.terms`）**：この章で使い、表にない語：管制空域・非管制空域・空域の Class・一時的な飛行制限（TFR）・制限空域・飛行禁止区域・警告空域・警戒空域・軍の訓練空域（MOA）・国家運輸安全委員会（NTSB）・事故（aircraft accident）・インシデント・大きな損傷（substantial damage）・運航者（operator）・裏書き（endorsement）・ログブック・フライトレビュー・最近の飛行経験・暦月・AC（advisory circular）・AIM・Chart Supplement・MEL・迎撃（interception）・協定世界時（UTC）・MSL・AGL・登録証明・年次点検・100 時間点検・ELT・耐空性改善通報（AD）・ADS-B Out・運用限界・双方向の無線交信。JCAB の表記を確かめて足してほしい（足したら W24 が初出をそろえる）。`right-of-way` の note「教科書 law の用語の表の「優先権」は直す」は、この下書きで直した（登録で閉じられる）。
4. **W01（検査の道具）**：4.2 の `skipForStyle` の 1 行（W14 と同じ）。初出の形を日米の囲みの中と、長い語の中の短い正式名で数えないか。
5. **W21（第 1 部の図）**：ch09-fig9-2 を章の単位が描き直した（`lawSources`）。新しい図 3 枚と描き直し 2 枚を目視の記録に。`law.aircraft` の図（7 の 3）。
6. **W23（第 1 部の問題）**：7 の 1（正解の位置）。
7. **W26（CADET のつなぎ）**：`law` に 2 節（`law.basis`・`law.pilot`）。`CLASSES` の `['law','hf','adm']` と AI 教官の目次の予算。
8. **W27（R2 の確かめ）**：`law.claims.json` の 218 行の事実確認と署名、PROVENANCE・CONCEPTS の閉じた行の `checkedBy`。
9. **W37（日本の法令の写し）**：航空法第 1 条を `sources/egov/manifest.json` に足す（7 の 5）。
10. **W38（第 7 部 jlaw・jair）**：kiso09.2・09.4〜09.14 の日本の分と、kiso09.q7・q9・q11〜q14 の日本の版。`law.airspace` と `law.vfr` の `bk.jp` は、第 7 部の節ができたら「第 7 部で詳しく」のリンクを足せる（今は行き先がないので置いていない：決まり 13）。
