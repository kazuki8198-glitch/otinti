# W19（radio）の報告：第 1 部 第 13〜17 章 `radio1`〜`radio5`「無線交信」の下書き（R2）

単位：W19 の radio の分（DESIGN 7.2 の R2 の W19「`law`・`radio*`」のうち `radio1`〜`radio5`。3.3 第 1 部の章 13〜17、4.2 の kiso09）。章 `law` は別の書き手の持ち物です（`reports/W19-law.md`）。報告の名前は、W19 の law の分と重ならないよう `W19-radio` にしました。作業日：2026-10-30。
書いたのは**下書きだけ**です（どの製品も読まない `textbook/rewrite/combined/drafts/`）。製品のファイル・台帳の JSON・道具・`flight-lab/kiso/` は 1 つも変えていません。コミットはしていません（統合役の仕事）。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `textbook/rewrite/combined/drafts/radio.js`（新） | 5 章の完全な定義（`B.add({...})` 5 つ）。`flight-lab/src/book-comm.js` の今の `radio1`〜`radio5` を、同じ場所（`before: 'hf'`・`part: 'p1'`）でそのまま置き換える形。28 節（新 1：`comm.runway`）。新しい出典 2 件は先頭の `NEW_R`（登録のとき `book-core.js` の `R` へ）。局所の部品は `CS`・`CSS`・`say()`・`fic`・`esc()`・`jpCell()`・`ahead()`（今の book-comm.js の部品と同じ形に、`jpCell`・`ahead` を足した） |
| `textbook/rewrite/combined/drafts/radio-figs.js`（新） | 図。新しい図 2 枚（`runwayEntry`・`xpdrCodes`）と、この章が使う今の図の描き直し 1 枚（同じ名前：`readbackLoop`）。一覧はファイルの頭 |
| `textbook/rewrite/combined/drafts/radio.claims.json`（新） | 主張の札 308 行（`check-chapter.mjs --claims-out` が抜き出した全部の文。参考値 276・条文 31・教材値 1。kind は「本の決まり」14・「例題」33）。全行に出典（「要確認：出典」の行はない） |
| `textbook/rewrite/combined/reports/W19-radio.ledger.json`（新） | 台帳のパッチ 339 行（下の 6）。**章を登録するコミットで**取り込む |
| `textbook/rewrite/combined/reports/W19-radio.md`（新） | この報告 |

検査の流し方：
```sh
node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/radio-figs.js textbook/rewrite/combined/drafts/radio.js
```

## 2. 何をしたか・なぜ

### 2.1 章の形（DESIGN 3.3 の章 13〜17）

今の 27 節は ID と順のまま残し、DESIGN 3.3 の radio の「新」は ★`comm.runway` の 1 つだけなので、それを `radio3` の最後（`comm.mistakes` の次）に足しました。**全節 `scope: 'us'`**（DESIGN 3.3 の「米国」）。日本は囲み（`bk.jur`）と `comm.icao` の日本の列（`jur-jp`）の中だけです。

章末の数（今 → 下書き）：

| 章 | 節 | 確認問題 | 説明してみよう | 用語 | 例 | 注意 | 出典 |
|---|---|---|---|---|---|---|---|
| `radio1` 無線交信のしくみと基本の技術 | 4 → 4 | 5 → 6 | 0 → 3 | 17 → 20 | 2 → 3 | 2 | 4 → 5 |
| `radio2` 言葉の決まり | 4 → 4 | 5 → 5 | 0 → 3 | 16 → 17 | 3 | 2 | 5 |
| `radio3` 交信の型 | 5 → 6 | 5 → 8 | 0 → 4 | 10 → 18 | 2 → 3 | 2 | 10 → 12 |
| `radio4` 1 回の飛行の交信 | 7 → 7 | 5 → 6 | 0 → 3 | 16 → 18 | 2 → 3 | 2 | 9 → 11 |
| `radio5` 管制塔のない空港・緊急・… | 7 → 7 | 5 → 6 | 0 → 3 | 17 → 18 | 2 → 3 | 3 | 13 |

節ごとの中身（`from` は基礎教材の id。`faa` は ACS-MAP の K 番号）：

| 章 | 節（★＝新） | `from` | 変えたこと |
|---|---|---|---|
| radio1 | `radio.why` | kiso09.15 | 小見出し「相手がしている業務を知る」：P/CG の Air Traffic Service の表（航空交通管制業務・飛行情報業務・警急業務。警急業務は AIM 5-1-14 の「到着予定から 30 分で捜索」を例に）。情報と許可の違い、UNICOM。管制塔が閉まっていれば CTAF（AIM 4-1-9）。`faa` PA.VIII.F.K3 |
| | `radio.equip` | — | `jcab` ppl.1.2.8・cpl.1.5.3.2、`faa` PA.III.A.K1・K6・PA.VIII.F.K1。囲み `english.radio`（今のまま） |
| | `radio.technique` | — | 緊急への予告リンク `ahead('emg.basic')`（後ろの部へは `bk.see` の「予告」） |
| | `radio.listen` | — | 節の形の順（確認 → シミュレーター）に並べ直した |
| radio2 | `comm.basic` | — | 数の種類の箇条で、章の初出の正式名（高度計・高度計規正値・針路・磁方位・真方位・航跡・横風・トランスポンダー）を出した。`faa` PA.III.A.K2 |
| | `comm.numbers` | — | **本文は今のまま**（任務の決まり）。`scope`・`jcab`（ppl/cpl.4.2.2.7）・`faa` だけ足した |
| | `comm.callsign` | — | **今のまま**（CADET の決め打ち）。`scope` だけ |
| | `comm.words` | — | 復唱・離陸・地上滑走の初出の形。囲み `words`（今のまま） |
| radio3 | `comm.pattern` | — | ねらいに「学生操縦士（student pilot）」。箇条を「語：説明」の形に |
| | `comm.ack` | — | 箇条を です・ます に、91.130 の文を 2 つに分けた |
| | `comm.readback` | kiso09.19 | 管制官の**ヒアバック**（JO 7110.65 2-4-3）。小見出し「復唱のあとも聞く」（AIM 4-4-7：承認を受けるか断るか、14 CFR 91.123）。図 `readbackLoop` を描き直し。囲み `readback`（今のまま） |
| | `comm.clarify` | kiso09.20 | 許可・指示・情報の表（P/CG の ATC CLEARANCE・ATC INSTRUCTIONS・ADVISORY）と 91.123 (a)(b)(c)(e)、Unable には理由を添える |
| | `comm.mistakes` | — | 今のまま（写真 `holdShort` も） |
| | ★`comm.runway` 滑走路に入る許可と誤進入の防ぎ方 | kiso09.20・09.21・09.22 | 図 `runwayEntry`。FAA の滑走路誤進入の定義、14 CFR 91.129(i)、AIM 4-3-18（滑走路を横切るには明示の許可）、AIM 2-3-5・2-3-8（停止線）、言葉の表（taxi・hold short・cross・line up and wait・cleared for takeoff・continue（JO 7110.65 3-10-1）・cleared to land）。許可を先読みしない・着陸の許可は滑走路が空いている保証ではない。判断の目：ホットスポット・プログレッシブ・タキシー・1 人のときの見張り・REL と THL（AIM 2-1-6）。標識の段落（AIM 2-3-9・2-3-10）のあとに写真 `ch09-photo3`。ここが大切 4・注意（管制塔が閉まっているとき）・思い出そう（→ `comm.readback`）・確認。`faa` PA.II.D.K2・K3・K6・PA.III.A.K9 |
| radio4 | `comm.flow` | kiso09.25・09.27 | 小見出し「飛行の全体を通して」：判断の目（飛行計画と到達予定時刻・交通情報とレーダーの限界・ADS-B と TIS-B・計画どおり飛べないときは早めに理由と希望を伝える。AIM 4-1-15・4-5-1・4-5-8・4-5-7・4-4-10・5-1-14） |
| | `comm.atis` | — | 初出の形（飛行場情報放送・高度計・高度計規正値・雲高・密度高度）。「LAB は 55 ft。教材値。参考値：Sanford の空港は 54.8 ft」 |
| | `comm.dep` | — | 試運転（ランナップ、run-up）。注意を ここが大切 のあとへ（節の形）。予告 `ahead('ground.runup')` |
| | `comm.tower`・`comm.radar` | — | 初出の形（離陸許可・磁方位・航跡・横風） |
| | `comm.arrive` | — | ねらいに ファイナル・着陸許可。教材値の段落に参考値（AIM 4-3-3）と POH の初出、磁航路（magnetic course） |
| | `comm.option` | — | ねらいに 着陸復行。予告 `ahead('ops.goaround')` |
| radio5 | `comm.ctaf` | — | ねらいに場周の各辺、CTAF の周波数の種類（AIM 4-1-9） |
| | `comm.xpdr` | — | 最初の図 `xpdrCodes`。7500 は AIM 6-3-4、英国の 7000（CAP 413 5.8・8.9）の文のあとに写真 `ch04-photo5`。囲み `xpdr`（今のまま） |
| | `comm.mayday` | — | 遭難通信・緊急通信の初出、PAN PAN（英国の綴り）、不時着・最良滑空速度、予告 `ahead('emg.basic')` |
| | `comm.nordo` | — | 有視界気象状態（VMC）・機長（PIC）・補助翼／方向舵の初出、留保の言い方を 1 つ外した。囲み `nordo.vfr`・`light`（今のまま） |
| | `comm.sfb` | — | 長い文を分けた、復唱・学生操縦士の初出 |
| | `comm.icao` | — | **3 列の表**（下の 2.3）。決め打ちの段落（CAP 413・「両方を知っておくと混乱しません。代表的な例」）は字のまま。高度計規正値・QNH の段落は決め打ちの段落の前へ（初出の順のため）。囲み `words`（今のまま） |
| | `comm.practice` | — | 長い文を分けた |

- **用語**：FL.terms の正式名で、章ごとの初出を「正式名（通称、English）」にした。表にない語で新しく使ったもの（航空交通業務・警急業務・滑走路誤進入・ヒアバック・ホットスポットなど）は 8 の W04 へ。
- **CADET**：決め打ちの文（決まり 9：`comm.callsign`・`comm.icao`）と RD.FLIGHT・`comm.numbers` は変えていない。CADET の読み込みで下書きを読ませて確かめた：`comm.icao` に CAP 413 と「両方を知っておくと混乱しません。代表的な例」が残り、日本の列（`jur-jp`）は消え、`BOOK.issues` は []。「（別の章）」は 0。AI 教官の目次は 16,543 字。`comm.runway` は図 1 枚と ここが大切 4 項目。
- **確認問題**：今の 25 問は場所・順・選択肢の並びのまま（理由に「…の節」の根拠を足しただけ）。新しい 6 問を各章の後ろに足した：`radio1` #6（交通情報は情報で許可ではない。正解 C）、`radio3` #6〜#8（情報と許可・hold short の復唱・line up and wait。正解 C・A・D）、`radio4` #6（正解 D）、`radio5` #6（正解 C）。
- **説明してみよう**：kiso09 の記述問題を米国の本文に書き直した 7 問（q15・q19・q20・q21・q22・q25・q27）と、新しい 9 問。答えに根拠の節へのリンク（`bk.see`）。
- **写真**（W22 の一覧の 4）：`ch09-photo3` → `comm.runway`、`ch04-photo5` → `comm.xpdr`。`ch09-photo6`（灯火信号）は `comm.nordo` に置かず、今の図 `lightGunSignals` で示す（同じ中身が図にあるため。W22 の一覧でも条件つき）。`ch09-photo2` も置いていない（7 の 5）。今の写真 `holdShort`・`towerCab`・`asrRadar` はそのまま。写真は節の最初の図の前に置いていない。

### 2.2 図（`radio-figs.js`）

| 図 | 節 | 元 | 中身 |
|---|---|---|---|
| `runwayEntry`（新） | comm.runway | AIM 2-3-5・4-3-18・2-3-8・2-3-9 | 誘導路 A と滑走路 36/18 の交わり。停止線（実線 2 本・破線 2 本）、赤地の「18-36」の標識、黒地に黄の「A」の位置の標識、REL の赤い灯 3 つ。① 停止線の手前で止まる ② 横切るには明示の許可、「停止線の赤い灯（REL）がついたら、止まって管制に確かめる」。架空の印（NFN） |
| `xpdrCodes`（新） | comm.xpdr | AIM 4-1-20 | トランスポンダーの面（4271・モードのつまみ・IDENT ボタン）、コード 1200・7500・7600・7700、コードの変え方 2700 → 2200 → 7200（「7700 を通らない」） |
| `readbackLoop`（描き直し） | comm.readback | 教科書の図・JO 7110.65 3-7-2 | ③ を「管制官が聞いて確かめる（ヒアバック）」に。キャプションに「復唱したら、管制官の返事を最後まで聞きます」 |

3 枚とも Chromium 390 px で error 0（章の図 13 枚の最小の文字 10.3 px）。390 px の PNG で目で見た（重なり・はみ出し・矢印）。

### 2.3 `comm.icao` の 3 列の表

列は「FAA（米国：AIM・PCG）」「ICAO・英国（CAP 413）」「日本」。日本の列は `<td class="jur-jp">`（見出しも `jur-jp`）で、CADET の `usSideOnly` が消す。中身は**手で書かず** FL.jur の `words`・`readback` の `jp` の文を `jpCell()` で描く（`words` は 3 行を `rowspan` で 1 つの欄に。〔要確認〕は `jur-unk` の札）。`readback` の囲みは `comm.readback` にあるので、`comm.icao` では `data-jur` を付けない（`jur.test.mjs` の ① は `boxes` の外の囲みで止まる）。「復唱が違っていたとき」の日本は「—」（FL.jur に項目がない）。表の下に「日本の列は、この本の日米の対照データ（言い方・復唱の範囲）から描いています。「—」の所は、まだ確かめていません。」（これも `jur-jp`）。

「必ず復唱する項目は ICAO の方が多い」の根拠は ICAO Annex 11 から CAP 413 2.69 に替えた（英国の手引きで本文を読めたため。ERRATA `T.law.comm-icao` の再署名が要る：8 の 6）。

## 3. 事実の確かめ（一次資料。数字と規則は全部 `radio.claims.json` に札と出典）

| 事実 | 一次資料（2026-10-30 に本文を読んだ） |
|---|---|
| 応答・復唱・明示の許可・停止線・REL/THL・CTAF・交通情報・レーダーの限界・ADS-B/TIS-B・飛行計画を閉じる・遭難と緊急・コード | FAA AIM（faa.gov の HTML 版）2-1-6・2-3-5・2-3-8・2-3-9・2-3-10・4-1-9・4-1-15・4-1-20・4-3-3・4-3-18・4-4-7・4-4-10・4-5-1・4-5-7・4-5-8・5-1-14・6-3-4 |
| 言葉の定義 | P/CG：AIR TRAFFIC SERVICE・ATC CLEARANCE・ATC INSTRUCTIONS・ADVISORY・CONTINUE・HOT SPOT・LINE UP AND WAIT・UNABLE・UNICOM・NEGATIVE CONTACT |
| 管制官の方式 | FAA Order JO 7110.65：2-4-3（ヒアバック）・3-7-2（地上滑走の指示）・3-9-4・3-10-1 |
| 規則 | 14 CFR 91.123・91.129(i)（eCFR versioner API）、47 CFR 87.173 |
| 英国の言い方 | UK CAA CAP 413（第 24 版）2.69・2.71・5.8・8.9 |
| 滑走路誤進入の定義と 3 つの種類 | FAA Runway Safety「Runway Incursions」の頁 |
| Sanford の標高 54.8 ft | 今の本の出典（AirNav の KSFB の頁、2026-10-01 有効）のまま |

確かめられなかった・使わなかったもの：1999 年の Federal Register の復唱の解釈は本文に使っていない。日本の言い方・復唱の範囲は FL.jur の文を描くだけで、新しい日本の事実は書いていない（`U.words-japan`・`U.readback-japan` の〔要確認〕のまま）。

## 4. ほかの章とのつながり

- 後ろの部への行き先は `ahead(id, label)`＝`bk.see(id, '予告：…')`：`emg.basic`（radio1・radio5）・`ground.runup`（radio4）・`ops.goaround`（radio4）。`check-path` は 0。
- 同じ部の中は節 ID のリンク（`comm.readback`・`comm.runway`・`comm.flow` など）。`data-sec` のリンクは全部行き先がある（0 件の不良）。

## 5. 検査の結果

### 5.1 章の検査（`check-chapter.mjs`、下書き 2 つ、Chromium あり、`COMBINED_LEDGERS` に `radio.claims.json` を足した写しの台帳）

| 検査 | error | warn | pending | 中身 |
|---|---|---|---|---|
| chapters・form・data・volume・jurisdiction・chapter-refs・figures・photos・concepts・jur・path・provenance・egov | 0 | 0 | 0 | 5 章・28 節（全部 us）。図 13 枚（390 px）。写真 5。太字の定義 136。FL.jur の囲みは `boxes` のとおり（① 7）。form の info 18 は今の本と同じ種類（図のない節など） |
| claims | 0 | 0 | 0 | 308/308 に札（写しの台帳で）。今の `CLAIMS.json` のままでは「札なし」の warn になる（登録で行が入る） |
| style | **3** | 14 | 0 | 下の 5.2。error 3 は道具の数え方。warn は初出の形 8・平均の長さ 3・長い文 2・留保 1 |
| questions | 0 | 1 | 0 | 正解の位置（5 章あわせて A 6%・B 61%・C 26%・D 6%）。今の 25 問のほとんどが B で、並べ替えないので残る |
| calc | 0 | 0 | 1 | `CALC.json` がまだない |

### 5.2 style の残り（どれも道具の数え方か、変えてはいけない節）

- error 3（taigen-dome 2・not-polite 1）：W10b の部品の見出し `<b>判断の目</b>`・`<b>思い出そう</b>` を本文の文と数える（W14・W19-law と同じ。`skipForStyle` に 1 行で 0）。
- 初出の形 8：「気圧高度」×4 は「気圧高度計」の中の文字（高度計の初出で出している）。「待機」×2・「空港等」・「航空英語能力証明」は FL.jur の囲み（日本の欄）の文字。
- 平均の長さ・長い文・留保：`comm.numbers`（変えない節）と `comm.callsign`（CADET の決め打ち）。

### 5.3 製品のテスト（下書きは製品が読まない）

- FLIGHT LAB：`cd flight-lab && npm run -s test:fast` → **86/86 pass**
- CADET：`cd cadet && npm run -s test:fast` → **247/247 pass**
- TEXTBOOK：`cd textbook && npm test` → **33/34 pass、1 fail**（2 回流して同じ）。落ちたのは `build: FLIGHT LAB sources are not copied into textbook/`（`textbook/test/build.test.mjs` 66 行）。このテストは `textbook/` の下で **`flight-lab/src/*.js` と同じファイル名** を探し、`rewrite/combined/drafts/radio.js` が `flight-lab/src/radio.js` と同じ名前なので止まる。中身は写しではない（下書きの章の定義）。ファイル名は任務の指定（`drafts/radio.js`）なので変えていない。直し方は 8 の 1（統合役）。ほかの単位が TEXTBOOK のテストを流すと、この 1 件が出る。

### 5.4 台帳

`node textbook/rewrite/combined/ledgers/validate.mjs` → ok（0 error・37 warning。warning は前からの署名待ちの行で、このパッチのものはない）。`apply-patches.mjs` の空流し（`--write` なし）で、このパッチの行が読めることを確かめた。

## 6. 台帳の行（パッチ `reports/W19-radio.ledger.json`、339 行。**取り込むのは章を登録するコミット**）

| 台帳 | 行 | 扱い |
|---|---|---|
| PROVENANCE | kiso09.27 | `done`（`comm.flow` の `from`） |
| PROVENANCE | kiso09.q15・q19・q21・q22・q25・q27 | `done`（`written:radio1`・`radio3`・`radio4`） |
| PROVENANCE | ch09-photo3・ch04-photo5 | `done`（`comm.runway`・`comm.xpdr`） |
| PROVENANCE | kiso09.15・19・20・21・22・25・kiso09.q20 | note だけ（行き先が複数の行。radio の分を置いた） |
| PROVENANCE | ch09-photo6 | note だけ（`comm.nordo` は図 `lightGunSignals` で示す） |
| ACS-MAP | PA.II.D.K2・K3 | `missing` から radio の節を外した（`comm.runway`） |
| ACS-MAP | PA.II.D.K6 | `missing` を `['ops.night']` に（ホットスポット・滑走路は `comm.runway`。夜の分が残る） |
| ACS-MAP | PA.III.A.K9 | `comm.runway`（REL・THL）を足した |
| ACS-MAP | PA.III.A.K2・PA.VIII.F.K3 | `sections` に `comm.numbers`・`comm.words`／`radio.why` を足した |
| RULINGS | `R.readback`・`R.hold-short`・`R.spelling` | note だけ（ヒアバック・3 列の表・PAN PAN の綴り） |
| ERRATA | `T.law.comm-icao` | note だけ（根拠を CAP 413 2.69 に。再署名が要る） |
| UNVERIFIED | `U.london-icao`・`U.words-japan`・`U.readback-japan`・`U.vfr-squawk` | note だけ（〔要確認〕のまま。日本の列は FL.jur を描くだけ） |
| CLAIMS | 308 行 | `op: "add"`（`radio.claims.json` と同じ。`checkedBy` は事実確認役） |

ほかの単位の今の R2 のパッチと同じ行 id はない（前のリリースのパッチ W04・W05・W06・W07a・W08a・W10-english・W12・W22 は取り込み済み）。

## 7. 未解決のこと

1. **TEXTBOOK のテスト 1 件**（5.3）。下書きのファイル名が FLIGHT LAB のソースと同じ。
2. **確認問題の正解の位置**（`check-questions` の warn）：今の 25 問のほとんどが B（記録を壊さないため並べ替えない）。新しい 6 問は B 以外にした。散らすかは W23。
3. **`comm.numbers` の「ICAO の言い方の列」**（DESIGN 3.3）：任務が `comm.numbers` を変えないと決めているので足していない。ICAO との違いは `comm.icao` の 3 列の表にある。DESIGN と任務のどちらをとるかは統合役。
4. **style の道具の数え方**（5.2）。
5. **使っていない基礎教材の写真と問**：`ch09-photo2`・`ch09-photo6` は置いていない（6 の PROVENANCE の note）。kiso09 の q15〜q28 のうち radio に使ったのは 7 問。残りは行き先が jatc・g7 などの別の単位。
6. **`radio-figs.js` の頭の注**（コメントだけ）：7500 の出典に、本文の表が引く AIM 6-3-4 を足してそろえた（済み）。
7. **安全レビュー**：`comm.runway`（滑走路誤進入）・`comm.mayday`・`comm.nordo` は緊急と安全の手順に近い。W27・W36 で一緒に見てほしい。

## 8. ほかの単位にお願いしたいこと（needs from others）

1. **統合役（登録）**：
   - **TEXTBOOK のテスト**：`textbook/test/build.test.mjs` 70 行の除外の列に下書きの置き場を足す。下書きはどの製品も読まない（DESIGN 7.2 の「1 単位の流れ」）。
     ```js
     if (e.isDirectory()) { if (!['outputs', 'test-output', 'node_modules', path.join('rewrite', 'combined', 'drafts')].includes(rel)) walk(p); }
     ```
     （またはテストを変えずに、登録のあとで `drafts/radio.js` の名前を変えるか消す。）
   - `drafts/radio.js` の 5 つの `B.add({...})` で `flight-lab/src/book-comm.js` の今の `radio1`〜`radio5` を置き換える。`NEW_R` の 2 件（`faaRI`・`aim45`）を `book-core.js` の `R` に足し、`NEW_R.x` を `R.x` に。`R.aim21` の名前に「2-1-6 滑走路状態表示灯（RWSL）」を足す（`comm.runway` が引く）。下書きの `jpCell`・`ahead` は book-comm.js に同じ形で足す。
   - `drafts/radio-figs.js` の `runwayEntry`・`xpdrCodes` を `flight-lab/src/book-figs.js` の `FIG` に足し、`readbackLoop` を描き直しで置き換える（部品 `C`・`svg`・`T`・`L`・`A`・`P`・`TL`・`NFN` は book-figs.js にある）。
   - TEXTBOOK の `COUNTS`（5 章あわせて：節 27 → 28・確認問題 25 → 31・説明してみよう 0 → 16・用語 76 → 91・例 11 → 15・注意 11 のまま・章の出典 41 → 46・図 +2（`runwayEntry`・`xpdrCodes`）・写真 +2（`ch09-photo3`・`ch04-photo5`））・見出しの節の数・外部リンクの数（新しい URL 2）、`TEST-CONSTANTS.md`。CADET のテストの定数は変わらない（`comm.callsign`・`comm.icao` の決め打ちは字のまま）。
   - 台帳のパッチ `reports/W19-radio.ledger.json` を `apply-patches.mjs --write`（CLAIMS の 308 行を含む）。
2. **W04（用語の表 `FL.terms`）**：この章で使い、表にない語：航空交通業務（air traffic service）・航空交通管制業務（air traffic control service）・警急業務（alerting service）・滑走路誤進入（runway incursion）・ヒアバック（hearback）・ホットスポット（hot spot）・管制指示（ATC instructions）・磁航路（magnetic course）。JCAB の表記を確かめて足してほしい。
3. **W01（検査の道具）**：`skipForStyle` が `bk-judge`・`bk-recall` の見出しを飛ばすように（W14・W19-law と同じ 1 行）。初出の形で、「気圧高度計」の中の「気圧高度」を数えない（長い語の中の短い正式名）。日米の囲みの中の文字を初出と数えないか。
4. **W06（FL.jur）**：`words` の `jp` の「待機の位置」、`nordo.vfr` の「空港等」、`english.radio` の「航空英語能力証明」が、章の初出の形の warn になる（囲みの文字を言いかえるか、道具が囲みを飛ばすか：3 と一緒に）。`comm.icao` の日本の列の「復唱が違っていたとき」に当たる項目が FL.jur にあれば描ける。
5. **W21（第 1 部の図）**：新しい図 2 枚と描き直し 1 枚を目視の記録に。`comm.nordo` に写真を置くか（`ch09-photo6`）。
6. **W27（R2 の確かめ・事実確認）**：`radio.claims.json` の 308 行の事実確認と署名、ERRATA `T.law.comm-icao` の再署名（根拠を Annex 11 から CAP 413 2.69 に替えた）。
7. **W23（第 1 部の問題）**：7 の 2（正解の位置）。
8. **W26（CADET のつなぎ）**：`radio3` に 1 節（`comm.runway`）。AI 教官の目次の予算（今の下書きで 16,543 字）。
