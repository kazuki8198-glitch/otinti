# 直し役の報告：第 1 部 第 7 章（新）`inst`「計器と表示」（revise-inst）

単位：章 `inst` の直し役（R2・DESIGN 7.2 の W15 の直し。書いた W15・事実確認役・2 人の読み手とは別の役）。日付：2026-10-30。
直したもの：`textbook/rewrite/combined/drafts/inst.js`・`drafts/inst-figs.js`・`drafts/inst.claims.json`（この 3 つだけ）。
もとにした指摘：

- `reports/factcheck-inst.md`：must 2・should 6・nit 12
- `reports/reader-inst.md`：must 0・should 17・nit 54
- `reports/expert-inst.md`：must 2・should 17・nit 9（must は事実確認役の M1・M2 と同じ）

守った決まり：DESIGN 6.2 の 15 の決まり、3.2（1 つの概念に住所は 1 つ）、3.3（第 1 部 第 7 章の行）、3.4、DECISIONS（判断 2・3・3 の補足）、STYLE、CLAUDE.md。

**結論**

- must は 2 つとも直した。
  - `inst.flow` の思い出そうの電気の順番（まずバッテリー、弱ってから非常用バッテリー）
  - 図 `instApBand` の横のモードの位置（待ちが左、作動が右）
- should は、持ち物の 3 ファイルで直せるものを全部直した。ほかの単位のファイルが要る部分は 7 に頼んだ。
  - 一部だけにしたもの：E-S14・E-S15・E-S16・E-S17・C2・C3・C12
  - どれも理由は 2 に書いた。持ち物の中で直せるのに直さなかった should はない。
- 章の検査：error 23（どれも道具の数え方）・warn 27・pending 2。
  - error 23 は、部品の見出し（判断の目・思い出そう・ここを混同しない・答えと解き方）を文と数えるもの。`inst` の分は 15 で、W15 のときと同じ。
  - W14 が出した `skipForStyle` の 1 行を入れた道具の写し（スクラッチ）では、style の error は 0。
  - 台帳の写しに `sys.claims.json`・`inst.claims.json` を足すと、claims は 187/187 に札があり、warn 0。
- 製品のテスト：FLIGHT LAB 86/86、CADET 247/247、TEXTBOOK 33/34。
  - TEXTBOOK は 2 回流して 2 回とも同じ 1 件が落ちた。
  - 落ちた原因は、W19 の下書き `drafts/radio.js` が `flight-lab/src/radio.js` と同じ名前であること。`inst` とは関係しない。
- 〔安全〕に近い文を 5 か所で直した・足した（6）。登録の前に安全レビュー（W27・W36）を通してほしい。

## 1. 変えたファイル

| ファイル | 中身 |
|---|---|
| `drafts/inst.js` | 8 節すべてと章末を直した（2）。<br>頭の注に、直しの要約を足した。<br>`NEW_R` を直した：<br>・`aah4` の label に版（2009 年版・2013 年の改訂、FAA Safety Team の写し）<br>・`g1000pg` の label に第 1 章<br>・`amtAirframe2` を足した（`sys` の下書きと同じキーと URL）<br>・`reiPPL` を足した（`aero` の下書きと同じキーと URL）<br>`refs` に `NEW_R.amtAirframe2`・`NEW_R.reiPPL` を足した。<br>`lessons` に `i1` を足した（`inst.gyro` の `bk.sim` の課目）。 |
| `drafts/inst-figs.js` | 新しい図 `instFaces`（3 つのジャイロ計器の顔）を足した。<br>`compassErrors` を同じ名前で描き直した（「方位指示器」→「方向指示器」の 3 か所）。<br>直した図：`instApBand`・`instGyros`（歳差の小図）・`instPfd`・`instShared`・`instPitchPath`・`pitotStatic`（2.4）。<br>頭の一覧に追記した。 |
| `drafts/inst.claims.json` | 主張を抜き出し直した（77 → 100 行。5） |
| `reports/revise-inst.md`（新） | この報告 |

ほかのファイルは変えていない。`flight-lab/kiso/`・台帳の JSON・`FL.terms`・`FL.jur`・製品のファイル・W15 の報告とパッチも変えていない。git の操作もしていない。

製品のテストを流すと、出力の `flight-lab/outputs/FLIGHT-LAB.html` と `cadet/outputs/CADET.html` が作り直される。この 2 つは流す前から作業ツリーで変わっていた。下書きは製品が読まないので、中身は変わらない。私は戻していない。

## 2. したことと理由

### 2.1 事実確認（`factcheck-inst.md`）

| # | 指摘 | 扱い | 今の文（場所）と根拠 |
|---|---|---|---|
| **M1** | 思い出そうの電気の順番が POH と逆 | 直した | `inst.flow` の `bk.recall`：「発電機（オルタネーター、alternator）が止まると、まずバッテリーが電気を送ります。バッテリーが弱って電気系統が止まると、非常用バッテリーが予備計器などに電気を送ります。」<br>根拠：POH 3.5d（the battery will become the primary source … As battery power is depleted … the emergency battery should activate automatically）、7.13（the EFD1000 will continue to operate on the essential bus until the primary battery is depleted）、7.17。<br>W14 の `sys.elec`「電気系統が全部止まったとき、非常用のバス…」と同じ順になった。 |
| **M2** | 図 `instApBand` の横の作動と待ちの位置が逆 | 直した | 欄を「横の待ち｜横の作動｜AP の状態｜縦の作動｜基準｜縦の待ち」にし、`GPS`（白）を左、`HDG`（緑）を右に入れ替えた。<br>色の説明に「白…。緑の外側」を足した。<br>根拠：G1000 Pilot's Guide 第 7 章（The armed annunciation appears in white to the left of the active roll mode）。 |
| S1 | 思い出そうの「偏差の足し引き」は行き先にない | 直した | `sys.compass`：「真北と磁北、偏差と自差の区別は、序部で学びました。」 |
| S2 | リバージョンの段落が、どちらの画面の故障でも自動と読める | 直した | `inst.pfd`：「片方の画面が壊れたとき、G1000 型は残った画面に…まとめて出せます。…Archer では、MFD が壊れたときは、PFD が自動で切り替わります。PFD が壊れたときは、ボタンで MFD を切り替えます（Archer の G1000 の手引き・POH 3.5e）。」<br>POH 3.5e の NOTE（If the PFD fails, the MFD will remain in normal mode）と 3.5e の MFD の故障の文を読んだ。 |
| S3 | 歳差の小図の矢印 | 直した | 正面図のまま、上端と右端に ⊗（紙の奥へ）を置き、「押す（奥へ）」「奥へ傾く」と書いた。<br>回る向きの矢印（時計回り）を左下に移した。下の行は「回る向きに 90° 進んだ所に出る」。<br>キャプションに「歳差の小図の ⊗ は、紙の奥へ向かう向きです」。<br>根拠：PHAK 第 8 章 図 8-19。 |
| S4 | GFC 700 型の例と、この POH の自動操縦の違い | 直した | `inst.ap` の「モードの表示を読む」に段落を足した：<br>「Archer III の POH の補足の自動操縦は、この例とは別の型で、モードの名前と高度のとらえ方が違います。新しい高度へは、PFD で高度を選んでから、自動操縦の装置で高度と昇降率のモードを一緒に選びます。選んだ高度の 1,000 ft 手前で高度の表示が点滅し、200 ft 以内に近づくか離れると音が鳴ります。モードは、その装置と PFD の上の列に出ます（POH 7.13）。」<br>帯の説明の頭にも「ここでは、G1000 と一体の型（GFC 700 型）の例で読み方を学びます」。<br>説明してみよう 19 は、ALTS を使わない一般の問いにした。<br>製品名は書いていない。 |
| S5 | 磁性物は PHAK に一次資料がある | 直した | `sys.compass`：「ピトーヒーター・無線機・防氷の装置を使うと、自差が変わることがあります。磁気を帯びた荷物を積んだときも、同じです（PHAK 第 8 章）。」<br>PHAK 第 8 章（radios, deicing equipment, pitot heat, radar, or magnetic cargo）を読んだ。<br>スマートフォンは、名指しする一次資料がないので書いていない。 |
| S6 | 排水口が Archer の段落の中 | 直した | `sys.g1000`：「多くのピトー管の後ろには、入った水を逃がす小さな排水口があります（PHAK 第 8 章）。Archer では、ピトーと静圧の管の水を、機内の左下の弁から抜きます（POH 7.21）。」<br>説明してみよう 22 の答えも「管の水を抜く弁は機内の左の下（POH 7.21）」にそろえた。 |
| N1 | 画面 2 枚 | 直した | 「Archer の POH…の 7.13 によると、G1000 型の Archer の画面は 2 枚です。」 |
| N2 | 「もとのモード」 | 直した | 「その軸の基本のモード（翼を水平にする・ピッチを保つ）に戻ります」（Pilot's Guide：roll the wings level (enters Roll Hold Mode) or maintain the pitch angle (enters Pitch Hold Mode)） |
| N3 | 1 hPa ≈ 28 ft の言い方 | 直した | 「差の 1.06 inHg は、1 inHg を約 33.9 hPa として約 36 hPa です。海面から 1,000 ft までの平均で、1 hPa が約 28 ft にあたります。海面そのものでは約 27 ft です（標準大気の密度からの計算）。」<br>計算演習② と説明してみよう 7 の答えも「約 27〜28 ft」で出す。 |
| N4 | V<sub>FE</sub> の意味 | 直した | 「V<sub>FE</sub> は、フラップを下げたまま飛んでよい最大の速度です（POH 2.3）。」 |
| N5 | `sys.compass#ebe7b677` の出典の引用 | 直した | 出典を「Northerly Turning Error：15 degrees plus half of the latitude。PHAK の例は北緯 40° で 35°。北緯 30° の 30° は 15 ＋ 30 ÷ 2 の計算」にした（台帳の行の `note`） |
| N6 | トレンドの行の出典の場所 | 直した | `inst.pfd#c7120cd1`・`#a0317f35`・`#1e541e5a` の出典を「第 2 章 Flight Instruments」に。<br>`#d847ca61` は文が変わったので、新しい行 `#5f55abb6` で第 2 章にした。 |
| N7 | 予備計器の出典に 7.13 | 直した | `inst.flow` の表・`sys.compass`・説明してみよう 22 に POH 7.13 を足した。<br>`sys.compass` には「G1000 から独立しています」も足した（7.13：fully digital, independent）。 |
| N8 | `R.ifh` を本文で引いていない | 直した | IFH を次の所で引いた。<br>・第 11 章：`inst.gyro` のここに注意、`sys.g1000` の新しい小見出し<br>・第 7 章：`sys.compass` の北旋誤差<br>・第 5 章：姿勢指示器の自立装置と誤差、判断の目、地上で確かめる<br>・第 6 章：姿勢と出力<br>・第 9 章：CDI |
| N9 | 図 `instPfd` の姿勢と旋回率の線 | 直した | 翼は水平のまま、マゼンタの旋回率の線を消し、旋回率の目盛り（左右 2 本ずつ）だけにした。<br>⑥ は「旋回率の目盛り：線がここまで伸びたら標準旋回」。<br>キャプションに「例は翼が水平で旋回していないので、旋回率の線は出ていません」。 |
| N10 | 「500FPM」 | 直した | 図の基準の欄を「500FPM」に |
| N11 | HSI・CDI の初出 | 直した | 2.2 の C4 |
| N12 | AAH の版 | 直した | `NEW_R.aah4` の label |

### 2.2 初学者の読み（`reader-inst.md`）

**should 17**

| # | 扱い | 今の文（場所） |
|---|---|---|
| Y1 計器の顔の絵 | 直した | 新しい図 `instFaces` を `inst.gyro` の「姿勢指示器」の最初の段落の後に置いた（2.4）。 |
| AP1 | 直した | 2.1 の S4 |
| C4 HSI・CDI・VOR・LOC | 直した | `inst.gyro`：「水平状況指示器（HSI：horizontal situation indicator）と呼ばれる型もあります。」<br>`inst.pfd`：「CDI（コース偏位指示器、course deviation indicator）は、選んだコースから左右にどれだけずれているかを示す針です（IFH 第 9 章）。」<br>同じ所で VOR とローカライザーも開いた：「超短波全方向式無線標識（VOR、VHF omnidirectional range）は、地上から電波でコースを知らせる施設です。ローカライザー（LLZ、localizer。画面の表示は LOC）も、進入のコースを電波で知らせます。」<br>VOR・ローカライザーは `FL.terms` の正式名。HSI・CDI の語は `FL.terms` にないので仮の名前（7 の W04）。 |
| C2 方位指示器 | 直した（描き直し） | `book-figs.js` の `compassErrors` は持ち物でない。そこで、W15 が `pitotStatic` でしたのと同じく、`inst-figs.js` に同じ名前の関数で描き直した。<br>3 か所を「方向指示器」にし、キャプションに M1 の「円の上の橙の線が、そのときコンパスが示す向きです」を足した。<br>登録のとき、統合役が `book-figs.js` の関数をこれで置き換える（7）。 |
| C3 旋回計と旋回傾斜計 | 直した（名前の決定は W04） | `inst.gyro` の小見出しの頭に、2 つの型を書いた（PHAK 第 8 章 Turn Indicators）。<br>・「針で示す型（turn-and-slip indicator）は…旋回率だけを感じます。ばねで支えるので、転倒しません。」<br>・「小さな飛行機の印で示す型（ターンコーディネーター）は、こまを斜めに傾けて付けてあり、ロールの速さも感じます。」<br>・「どちらも…姿勢指示器が壊れたときには、バンクの手がかりになります。…この節では、飛行機の印の型を旋回傾斜計と呼んで説明します。下の写真は、針の型です。」<br>写真 `ch04-photo3` は、この段落の直後に移した。<br>節の題「ジャイロ計器と旋回計」は変えていない。DESIGN 3.3 の題で、`FL.terms` は「旋回計」を旋回傾斜計の通称にしているため。<br>針の型に「旋回計」の名前を付けるかは W04、写真のキャプションは W22（7）。 |
| C1 ピトースタティックとピトー静圧 | 直した | `sys.g1000`：「ピトースタティック系統（ピトー静圧系統、pitot-static system）です。」通称の行は W04（7）。 |
| G1 | 直した | 2.1 の S6 |
| P1 | 直した | 2.1 の S2 |
| F4 | 直した | 2.1 の M1 |
| AP2 横・縦 | 直した | 「横のモード（左右の向き：針路やコースに沿う）が左、…縦のモード（上下：高度や昇降率を保つ）が右に出ます」 |
| C5 操縦かん | 直した | `inst.ap` の 4 か所と思い出そうを「操縦輪」に（`sys`・`aero` の下書きと同じ。POH の control wheel・yoke） |
| C6 機首の向き | 直した | 図 `instPitchPath` の札を「ピッチ角 θ ＝ 5°」に。<br>図 `instGyros` の表を「機首の方位（ずれる）」、キャプションを「姿勢と方位は」に。 |
| C7 全圧・ピトー管・静圧孔・柱 | 直した | `inst.flow`：「ピトー管（pitot tube）は前を向いた管で、ぶつかってくる空気の圧力（全圧）を取ります。静圧孔（static port）は…まわりの空気の圧力（静圧）を取ります。…（PHAK 第 8 章。くわしくは次の節）」<br>柱も開いた：「ピトー静圧の柱（pitot/static head：ピトー管の穴と静圧の穴を 1 つにした部品）」。POH 7.21 と第 4 章の語。 |
| F7 図の予備計器の箱 | 直した | 箱を「予備計器／速度・高度・方位／姿勢は別のセンサー」にした。<br>キャプションに「予備計器の姿勢は、主の AHRS とは別のセンサーから出ます」。 |
| S2 トレンドの先出し | 直した | 「速度のトレンド（いまの変わり方が続いたときの、6 秒後の速度の予想）が V<sub>NE</sub> を超えると…」。Pilot's Guide 第 2 章 |
| A1 28.00 inHg の文 | 直した | 専門家の E-S2 と一緒に直した（2.3）。31.00 の側にも理由を足した：「合わせた値が本当の値より小さいので、表示が低く出ます。」 |
| Y2 | 直した | 2.1 の S3 |

**nit 54**：直したのは次のとおり。

- 4.0 の章全体：
  - C8：`inst` の V 速度を V<sub>NE</sub>・V<sub>NO</sub>・V<sub>FE</sub>・V<sub>SO</sub>・V<sub>S1</sub> に
  - C10：「地上滑走（タキシー、taxi）」
  - C11：本文の出典を「Archer の G1000 の手引き」（CRG PA-28-181）と「G1000 の別の機体の手引き」（Cessna の Pilot's Guide）に分けた
  - C13：写真 `staticPort` を Archer の段落の直後へ、`ch00-photo6` を規正値の段落の直後へ
  - C14：章末の数字を変えた。説明してみよう 7 は 1009 → 1016 hPa、10 はピッチ角 2°・迎え角 6°、11 は 270°。上昇の計算演習は 500 fpm・30 秒。説明してみよう 2・3 は計算演習（E-S11 で替えた）と重ならなくなった
- 4.1 `inst.flow`：F1（4 つの段）・F2（入力の値が新しくなっていない）・F5（柱）・F6（たとえば…機体でも）
- 4.2 `sys.g1000`：
  - G2（機体に別の値を書いた札（placard））
  - G3（デフロスターの説明）
  - G4（ヒーターは氷を防ぐもので、虫やカバーの外し忘れによる詰まりは防げない。POH 7.21 の heated pitot head）
  - G5（入口だけの詰まりで 0 になる理由。PHAK 第 8 章）
  - G6（図に「← 前（飛ぶ向き）」）
  - G7（小見出し・表・図を「代替静圧源」に）
- 4.3 `inst.speed`：
  - S1（ダイヤフラム：圧力で膨らんだり縮んだりする薄い金属の袋）
  - S3（速度テープ）
  - S4（V<sub>NO</sub> の正式名「構造上の最大巡航速度（最大構造巡航速度、…）」）
  - S5（新しい計算演習で √ の一歩）
  - S6（帯の下の端の条件を箇条に）
  - S7（KTAS を開き、「単位も確かめます」）
  - S8（白の下の端が V<sub>SO</sub>、緑の下の端が V<sub>S1</sub>）
- 4.4 `inst.alt`：A2（気圧の面）・A3（換算の途中）・A4（75 ft 以上（高くても低くても））・A5（場周経路の初出の形）・A6（上空の気温も標準どおりに）
- 4.5 `inst.gyro`：Y3（AHRS は転倒しないを限界の段落へ）・Y4（ほかの機体に乗るときのために）・Y7（剛性：向きを変えにくい性質）
- 4.6 `sys.compass`：
  - M1（2.2 の C2）
  - M2（「LAB 空港のまわり（架空の空域）」、「教材のための近い値です」：`FL.physics` の `MAGVAR_W` の注「teaching approximation」）
  - M4（ラバーライン、lubber line）・M5（2.1 の S1）・M6（2.2 の F7）
- 4.7 `inst.pfd`：P2（バグ）・P3（旗）・P4（たとえば 3 つの表示が）・P5（合成視界（synthetic vision）を付けた機体でも）・P6（図にバンクの目盛りと昇降計の番号 ⑨）
- 4.8 `inst.ap`：
  - AP3（2.1 の N2）
  - AP4（姿勢の表示に重ねて出るバー）
  - AP5（HDG・GPS・VS と 500FPM の意味）
  - AP6（結合した進入の説明）
  - AP7（操縦輪の AP DISC／TRIM INTER のスイッチ（自動操縦を切り、トリムを止めるスイッチ）。POH 補足 2：Yoke-mounted AP Disconnect/Trim Interrupt Switch）
- 4.9 章末：E2（用語の表を 21 → 30 行）・E3（説明してみよう 11 のリンクの名前を小見出しと同じに）

直さなかった nit とその理由：

| nit | 理由 |
|---|---|
| C9（玉・ラダーペダル・釣り合い旋回・取付角） | 語を決めるのは W04 と W13。`inst` の中では「取付角」だけそろえた（`inst.gyro` と説明してみよう 10） |
| C12（課目のボタンの名前） | `lessons` に `i1` は足した。ボタンの名前を課目の題（基本計器飛行・部分パネル）にすると、`FL.terms` の正式名の初出の形（英語つき）が要る。ボタンに英語を入れるのは不自然なので、W15 の名前に戻した |
| F3（AHRS が GPS・TAS を使う理由） | CRG と Pilot's Guide に理由の文がなく、一次資料で書けない |
| Y5（真空の inHg の意味） | PHAK は単位の意味を書いていない。推測で書かない |
| Y6 | 計算演習を E-S10 で外したので、当たらない |
| G3 の理由の部分（窓を閉める理由） | POH に理由がない。デフロスターの説明だけ足した |
| A7（写真 `ch00-photo6` の針の読み方） | 写真のキャプションは W22 の持ち物（7） |
| M3（SBAS の囲み） | 囲みの字は `FL.jur`（W06）の持ち物（7） |
| 6 の読み方の nit（AHRS・UNOS などの読み） | 読み方の一次資料を確かめていない |

### 2.3 専門家の読み（`expert-inst.md`）

| # | 扱い | したこと |
|---|---|---|
| **E-M1** | 直した | 2.1 の M1 |
| **E-M2** | 直した | 2.1 の M2 |
| E-S1〔安全〕速度計が信用できないとき | 直した | `sys.g1000` に小見出し「飛んでいる途中で速度計がおかしいとき」を足した。<br>・「まず、機体の姿勢を保ちます。次に、姿勢を示す計器と、ほかの計器…を比べて、おかしい計器を探します。見つけたら、残った正しい計器で飛びます（IFH 第 11 章）。」<br>・「速度計だけがおかしいときは、速度計に合わせて機首を動かしません。飛行機の動きは、姿勢と出力で決まります（IFH 第 6 章）。いつもの姿勢と出力を保てば、速度もいつもの値に近くなります。」<br>・「入口と排水口が両方詰まると、上昇では速度が増えて見え、降下では減って見えます（PHAK 第 8 章）。速度が増えたと思って機首を上げると、本当の速度は減っていきます。」<br>・「目に見える水分（雨や雲）の中では、ピトー管が詰まることがあります。ピトーヒーターの使い方は、POH に従います（PHAK 第 8 章）。」<br>ここが大切に「速度計がおかしければ、速度計を追わず、姿勢と出力で飛ぶ」を足した（2 項目を 1 つにまとめて 4 項目のまま）。<br>章末の例に 1 行足した。<br>`ifr.instr` へのリンクは足していない。今の本の `ifr.instr` に、DESIGN 3.3 の「姿勢と出力の表」がまだないため（7 の W30）。 |
| E-S2〔安全〕28.00 inHg の側 | 直した | `inst.alt`：「反対に、規正値が 28.00 inHg より低い日に、そこまで合わせられない高度計で飛ぶと、実際の高さは表示より低くなります。寒さが重なると、さらに低くなります。だから、そうした高度計で飛ぶことは勧められていません（米国の AIM 7-2-2）。」<br>AIM 7-2-2 b を読んだ。 |
| E-S3〔安全〕ALT と失速・補足 2 | 直した | `inst.ap` に次を足した。<br>・ALT の失速：「高度を保つモード（ALT）も、速度を保ちません。降下から水平に移るときに巡航の出力に戻さないと、自動操縦は高度を保とうとして機首を上げ続け、失速します（FAA の手引き AAH 第 4 章）。」<br>・トリムで逆らう：「高度を保つモードの間に操縦輪に力をかけると、自動操縦はトリムでそれに逆らいます。」<br>・故障の手順を番号の列にし、「押し合いを続けず、すぐ切ります。原因が分かって直るまで、自動操縦を入れ直しません（POH 補足 2）。」<br>・1 秒の例：「進入中や運動中の故障では、1 秒の遅れで、バンク 20°・高度 80 ft です（POH 補足 2）。」<br>・飛行前の点検：「自動操縦を付けた機体では、飛ぶ前に補足の手順で点検します。自動操縦が自分で点検を終えること、AP DISC で外れること、サーボの力に打ち勝てることなどを確かめます（POH 補足 2）。」<br>ここが大切は「VS も ALT も速度を保たない。出力を合わせないと失速へ向かう」に。<br>説明してみよう 22 の④に「飛ぶ前の点検」を足した。<br>AAH 第 4 章と POH 補足 2 の Section 3・4 を読んだ。 |
| E-S4 姿勢指示器の誤差と点検 | 直した | `inst.gyro` に次を足した。<br>・自立装置：「中には、こまを鉛直に立て直すしくみ（自立装置、self-erecting mechanism）があります。動力が入ってからこまが立つまで、最大 5 分、ふつうは 2〜3 分かかります（IFH 第 5 章）。」<br>・指示誤差：急な加速で機首上げ、急な減速で機首下げ、180° 旋回のあとの小さな誤差、1 分ほどで直る（IFH 第 5 章）。<br>・AHRS：「G1000 型の AHRS は、電源を入れてから、ふつう 1 分ほどで姿勢と方位を出します。地上滑走（タキシー、taxi）中や水平飛行中にも、この準備（整列）ができます（G1000 の別の機体の手引き）。」<br>・判断の目：地上滑走で姿勢指示器が 5° を超えて傾かないか、離陸の前に方向指示器が滑走路の向きと 5° 以内か（IFH 第 5 章 p.5-38）。<br>`faa` に `PA.VIII.A.K1` を足した。 |
| E-S5 指針式の旋回計 | 直した | 2.2 の C3 |
| E-S6 ジャイロシン・コンパス | 直した | `inst.gyro`：「方向指示器を地磁気の向きに自動で合わせる型を、遠隔指示コンパス（ジャイロシン・コンパス、remote indicating compass）といいます。地磁気を感じる部品（フラックス・バルブ、flux valve）は、機体の磁気の影響を避けるため、ふつう翼端に離して付けます。交流の電気で動くので、電源が要ります（PHAK 第 8 章）。G1000 型の AHRS も、地磁気を感じるセンサーから方位を作ります（PHAK 第 8 章）。」<br>根拠：PHAK 第 8 章（magnetic slaving transmitter … mounted remotely, usually in a wingtip、400 Hz alternating current、AHRS の magnetometer）と、JCAB の事業用 例題 9。<br>四分円差・半円差は、語が `FL.terms` にないので書いていない。 |
| E-S7 注意警報の 3 段階 | 直した | `inst.pfd` に段落と箇条を足した。<br>・「Archer の G1000 型は、知らせを重さで 3 つの段階に分けます（POH 7.13）。」<br>・警告（赤・3 回のチャイムが繰り返し・例 ALTR FAIL）<br>・注意（黄色（琥珀色）・2 回のチャイムが 1 度・例 PITOT HEAT FAIL・PITOT HEAT OFF）<br>・助言（白・1 回のチャイム・例 EMERG BATT ON）<br>根拠：POH 7.13 の Crew Alerting System の文と、Archer の CRG の CAS Annunciations の表。<br>警告・注意・助言は太字にしていない（太字の定義にならないように）。 |
| E-S8 QNE と絶対高度 | 直した（QNE は日本の囲み） | QNE：`inst.alt` の日米の囲みの後に `bk.jp` を置いた。「日本の学科試験の例題では、高度計を標準の気圧に合わせることを「QNE セッティング」と呼びます。そのときの高度計の表示は、気圧高度です（JCAB の学科試験例題集 自家用 航空工学 例題 18）。」<br>・例題集は 2026-10-30 に取り寄せ、sha256 が `FL.terms` の `reiPPL` と同じことを確かめた。<br>・AIP Japan の定義は確かめていないので、例題の使い方だけを書いた。<br>・日本の呼び方なので、日本の側の入れ物に入れた（CADET では消える）。<br>・数字（1013.2 hPa など）は、囲みの `FL.jur` と重ならないように書いていない。<br>絶対高度：「地面からの高さ（AGL）は、絶対高度（対地高度、absolute altitude）ともいいます（PHAK 第 8 章）。」`FL.terms` の初出の形。太字にしていない（高度の種類の住所は `basics.alt`）。 |
| E-S9 EAS と位置誤差・器差 | 直した | 「IAS には、取り付け位置による誤差（位置誤差）と、計器の誤差（器差）があります。」（JCAB 事業用 例題 1 の語）<br>「訓練機の速さでは、等価対気速度（EAS、equivalent airspeed）は CAS とほぼ同じなので、この順番で足ります。」<br>思い出そうも「IAS・CAS・EAS・TAS・GS の区別は序部で学びました」に（住所は `basics.speed`）。<br>位置誤差・器差の行は W04（7）。 |
| E-S10 標準旋回の二度教え | 直した | `inst.gyro` から旋回率の式と計算演習を外した。計器での読み方だけを残した：<br>・2 つめの目盛り<br>・「旋回の物理の節で学んだ、1 秒に 3° の旋回です」<br>・文字盤の「2 MIN」<br>・「同じ旋回率に要るバンクは、真対気速度が大きいほど深くなります」<br>思い出そうに `aero.turn` を足した。 |
| E-S11 動圧の二度教え | 直した | `inst.speed` の式の文を「動圧（½ρV²）は、飛行の原理の章で学びました」に。<br>計算演習を「IAS から CAS、TAS へ」に替えた：POH 2.3 の V<sub>NO</sub> 125 KIAS ＝ 121 KCAS → 差 4 kt → 密度比 0.64 で TAS 約 151 kt → 向かい風 20 kt で GS 131 kt。<br>説明してみよう 2・3 の答えのリンクを `aero.lift` にした。<br>思い出そうに `aero.lift` を足した。 |
| E-S12 θ・α・γ の二度教え | 直した | 式の文を `aero.aoa` の形にした：「3 つの角度の関係（迎え角 ＝ ピッチ角 ＋ 取付角 − 飛行経路角）は、迎え角の節で学びました。図は取付角を 0 とした例で…飛行経路角は 5 − 8 ＝ −3° です。」<br>あわせて「姿勢指示器が示すのはピッチ角だけで、飛行経路・速度・失速までの余裕は、ほかの計器で読みます」と書いた。<br>図 `instPitchPath` の式も「α ＝ θ − γ（取付角 0）」に。<br>説明してみよう 10 の答えのリンクを `aero.aoa` にした。<br>図は DESIGN 3.3 が `inst.gyro` に ch04-fig4-6 を置くので残した。 |
| E-S13 色の帯の二度教え | 直した | `inst.speed` から帯の値の 2 段落を外し、「速度計の色の帯の意味と、Archer の値は、速度の制限の節で学びました」にした。<br>この節にしかない、帯の下の端の条件（PHAK）と G1000 型のテープの色は残した。<br>参考値と教材値の並びは `aero.vn` の表にある。 |
| E-S14 自差の二度教え | `sys.compass` の側だけ直した | ・偏差は「序部で学んだ偏差（…）は、場所で違い…」に。<br>・自差は「序部で学んだ自差（deviation）は、その機体のコンパスだけの誤差です」にし、原因と自差表（計器の性質）を残した。<br>・「自差表を使った針路の計算は、航法の章で学びます」を足した。`navb.north` は本にまだないので、リンクはない（決まり 13）。<br>・磁方位は「磁北から測った方位は、序部で学んだ磁方位（magnetic direction）です」（写真 `compass` のキャプションが磁方位を使うため、初出の形で残した）。<br>`navb.north` の太字の定義と `CONCEPTS` の行は W18・W03（7）。 |
| E-S15 `basics.alt` の二度教え | 持ち物でない | `basics` は登録済みで `book-0.js` にある（7） |
| E-S16 圧力計器の検出方式・シンクロ | 直した（`inst.flow` の側） | `inst.flow` に発展（`bk.deep`）「計器が圧力と位置を感じる部品」を足した。<br>・ブルドン管・ダイヤフラム／ベローズ（アネロイド）・半導体のセンサーの表<br>・シンクロ（フラップの位置の計器・自動操縦に使う）<br>根拠：FAA AMT Airframe Handbook Vol. 2 第 10 章（The three fundamental pressure-sensing mechanisms … Bourdon tube, the diaphragm or bellows, and the solid-state sensing device／Synchro-Type Remote-Indicating Instruments）。2026-10-30 に取り寄せて読んだ。<br>`jcab` に `cpl.1.6.2.3` を足した。<br>JCAB-MAP の `ir.2.2` は、W15 のパッチがすでに `inst.gyro` に直している。 |
| E-S17 ACS の札 | 下書きの札は直した | 次の札を足した。<br>・`inst.speed`：`PA.I.G.K1`<br>・`sys.g1000`：`PA.I.G.K2`・`PA.IX.C.K2`・`IR.VII.D.K2`<br>・`inst.pfd`：`PA.I.G.K2`・`IR.II.B.K1`・`IR.VII.D.K2`<br>・`inst.ap`：`PA.I.G.K2`・`IR.II.B.K2`<br>・`inst.gyro`：`PA.VIII.A.K1`<br>どの id も `ACS-MAP.json` にあることを確かめた。ACS-MAP の `sections` の行は W42 か統合役（7）。 |
| E-N1 | 直した | 「この点検で分かるのは、高度計の目盛りの誤差です（米国の AIM 7-2-3）。駐機場の高さは空港の標高と違うことがあるので、75 ft を超えたら、試運転（ランナップ、run-up）の場所で測り直します（IFH 第 5 章）。」 |
| E-N2 | 直した | 「操縦輪で機体を保ちます。サーボの力には、人の力で打ち勝てます。」に札（POH 補足 2：Maintain by overpowering autopilot servos）。<br>「押し合いを続けず、すぐ切ります」を足した。 |
| E-N3 | 直した | 「切るスイッチの場所も、指で確かめておきます。初めのうちは、無線の送信のボタンと間違えやすいからです（FAA の手引き AAH 第 4 章）。」 |
| E-N4 | 直した | 2.2 の S4。V<sub>FE</sub> は `aero.vn` と同じ「フラップ下げ最大速度」にした |
| E-N5 | 一部 | 「（違いは序部で学びました）」を足した。説明してみよう 12 のリンクを `navb.wind` にするのは、`navb` が本にないのでできない（決まり 13） |
| E-N6 | 直した | 「序部で学んだ気圧高度（pressure altitude）です」「切り替える高さは、序部で学んだ転移高度（transition altitude）で…」 |
| E-N7 | 直した | 「速度と高度について、予備計器が助けになるのは…」 |
| E-N8 | 直した | 「規正値を合わせた高度計は、合わせた気圧の面から機外の気圧までの高さを、標準大気をものさしにして測っています（JCAB の学科試験例題集 自家用 航空気象 例題 4）。」例題を読んだ |
| E-N9 | 直した | 判断の目：「トリムの量を示す表示があれば、いつもより大きく動いていないかを見ます。着氷（アイシング、icing）や出力の低下の早い手がかりになります（FAA の手引き AAH 第 4 章）」 |

### 2.4 図（`inst-figs.js`。11 枚 → 13 枚。390 px の PNG にして目で見た）

| 図 | 変えたこと |
|---|---|
| `instFaces`（新） | 3 つのジャイロ計器の顔（模式図）。<br>・姿勢指示器：空と地面、バンクの目盛り 10・20・30・45・60°、空の指針、小さな飛行機<br>・方向指示器：N・E・S・W と 30° ごとの目盛り、上の印、上から見た飛行機<br>・旋回傾斜計：水平の印と 2 つめの印（L・R）、「2 MIN」、右へ 1 秒に 3° で旋回している飛行機、真ん中の球<br>根拠：PHAK 第 8 章 図 8-21・図 8-24、IFH 第 5 章 図 5-30。図の中の字は `FL.terms` の正式名の初出より前に出ないように選んだ。 |
| `compassErrors`（描き直し） | `book-figs.js` と同じ絵。「方向指示器」の 3 か所と、キャプションの橙の線の 1 句だけを変えた |
| `instApBand` | 2.1 の M2・N10。キャプションに「G1000 と一体の型の模式図」 |
| `instGyros` | 2.1 の S3、2.2 の C6 |
| `instPfd` | 2.1 の N9、2.2 の P6（バンクの目盛り・⑨ 昇降計）。③ の番号を目盛りから離した |
| `instShared` | 2.2 の F7。下の 3 つの箱を高くし、予備計器の箱を広げた |
| `instPitchPath` | 2.2 の C6、2.3 の E-S12 |
| `pitotStatic` | 2.2 の G6・G7（代替静圧源の初出の形を図の下の行に） |

章の検査の図の検査は、2 章で 25 枚とも error 0・warn 0（最小の文字 10.3 px）。

### 2.5 新しい文のために確かめた一次資料

どれも 2026-10-30 に、私が元の URL から自分で取り寄せて読んだ。ファイルはスクラッチの `ri/src/` に置き、リポジトリには置いていない。

- **Archer III POH VB-2266**（`R.archerPoh`）
  - 3.5d（発電機の故障の順）、3.5e（PFD・MFD の故障の NOTE と手順）、3.5f（Pitot Heat Failure：Master Caution, Double Chime）
  - 7.13：CAS の Warning・Caution・Advisory とチャイム、Standby Instrument、Autopilot integration（ALT と VS を一緒に選ぶ・1000 ft・200 ft・PFD の上の列・FD の位置ではサーボが外れる）
  - 7.17、7.21（pitot/static head・drain valves・heated pitot head・50 ft unless placarded）
  - 補足 2：部品・制限・Section 3 の故障の手順・3 秒と 1 秒の例・Do not re-engage・トリムの暴走・Section 4 の飛行前の点検・Yoke-mounted AP Disconnect/Trim Interrupt Switch
- **Garmin G1000 CRG PA-28-181**（`R.g1000`）：CAS annunciations（ALTR FAIL＝Warning・Triple Chime、PITOT HEAT FAIL/OFF＝Caution・Double Chime、EMERG BATT ON＝Advisory・Single Chime）
- **Garmin G1000 Pilot's Guide 190-00498-07 Rev. A**（`NEW_R.g1000pg`）
  - 第 1 章：AHRS は typically within the first minute、taxiing and level flight で整列
  - 第 7 章：armed は active の左、10 秒点滅、データを失うと Roll Hold／Pitch Hold、ALTS → 50 ft で ALT
- **FAA PHAK 25C 第 8 章**（`R.phak8`）
  - Blocked Pitot System（排水口が開いているとき・両方詰まったとき・visible moisture と pitot heat）
  - Absolute altitude、arcs の下の端（VS0・VS1）
  - Turn Indicators（2 つの型・turn-and-slip はばねで転倒しない・どちらもバンクの予備）
  - AHRS の magnetometer、Flux Gate Compass System（400 Hz）、Remote Indicating Compass（wingtip・HSI）
  - Deviation（magnetic cargo など）
- **FAA IFH 15B**（`R.ifh`）
  - 第 5 章：p.5-18〜5-19 の自立装置と誤差、p.5-37〜5-38 の高度計・姿勢指示器・方向指示器の点検
  - 第 6 章：attitude and power、第 7 章：コンパスの lag・precede、第 9 章：CDI、第 11 章：Analog Instrument Failure・Pneumatic System Failure
- **FAA AIM 7-2-2・7-2-3**（`R.aim72`）：High／Low Barometric Pressure、Scale error と ±75 ft
- **FAA AAH 第 4 章**（`NEW_R.aah4`）
  - Power Management（VS で失速・Leveling off from a descent … results in a stall）
  - trim against you、servo travel or trim は着氷・出力の低下の早い手がかり、disconnect switch と transmit button
- **FAA AMT Airframe Handbook Vol. 2（FAA-H-8083-31A）第 10 章**（`NEW_R.amtAirframe2`）：pressure-sensing mechanisms、aneroid・bellows、synchro systems
- **国土交通省 航空局 学科試験例題集 2026 年 6 月**（`NEW_R.reiPPL`、事業用は `FL.terms` の `reiCPL`）
  - sha256 が `FL.terms` の値と同じことを確かめた。
  - 自家用 航空工学 例題 18（QNE → 気圧高度）、航空気象 例題 4
  - 事業用 航空工学 例題 1（位置誤差と器差）・例題 9（フラックス・バルブ）
- 標準大気の 1 hPa の高さ（海面で約 27.3 ft）は、`aero` の下書きと同じ海面の密度 1.225 kg/m³ と g ＝ 9.80665 m/s² から計算した（factcheck の N3 と同じ値）。

### 2.6 基礎教材の写しでないこと

直したあとの本文（タグを除く）と、kiso04・kiso02・kiso10・kiso12 の本文・問を比べた（スクラッチのスクリプト）。

- 22 字以上の一致は 1 か所あった。`inst.pfd` の PFD の配置の文で、略語の括弧を外したために一致した。
- その文を書き直し、22 字以上の一致は 0 になった。

## 3. 検査の結果

| 検査 | 結果 |
|---|---|
| `node textbook/rewrite/combined/tools/check-chapter.mjs`（`sys-figs.js`・`sys.js`・`inst-figs.js`・`inst.js`、Chromium あり） | **error 23・warn 27・pending 2**（直す前は error 24・warn 26・pending 2）。<br>・error 23：style の taigen-dome 13・not-polite 10。どれも部品の見出しを文と数えるもの。`inst` の分は 15（W15 と同じ）<br>・warn：style 7、questions 1（`sys` の今の 5 問の正解の位置）、claims 19（今の `CLAIMS.json` にこの 2 章の行がないため）<br>・style の 7 のうち `inst` は 4：「気圧高度」（通称「気圧高度計」の中の文字）、「METAR」（日米の囲みの字）、「PF」（PFD の中）、「PM」（500FPM の中）。どれも道具の部分一致<br>・pending：`C.autopilot-modes` の呼び戻す節 `ifr.auto`（W30）と `CALC.json`<br>・chapters・form・data・volume・jurisdiction・chapter-refs・figures（25 枚）・photos・concepts（太字の重なり 0）・jur・path・provenance・egov は error 0・warn 0<br>・1 文の平均 37.3 字・最長 80 字（`sys.radio`）・80 字超 0。留保の言い方の warn 0 |
| 同じ検査を、台帳の写しに `sys.claims.json`・`inst.claims.json` の行を足して（`COMBINED_LEDGERS`） | claims：**187/187 に札・warn 0**。合計 error 23・warn 8・pending 2 |
| 同じ検査を、W14 の `skipForStyle` の 1 行を入れた道具の写しで（スクラッチ。道具そのものは変えていない。`--no-browser`） | **style error 0**。合計 error 0・warn 27（台帳の写しも足せば warn 8） |
| FLIGHT LAB：`cd flight-lab && npm run -s test:fast` | **86/86 pass** |
| CADET：`cd cadet && npm run -s test:fast` | **247/247 pass** |
| TEXTBOOK：`cd textbook && npm test` | **33/34 pass・1 fail**（2 回流して同じ）。<br>落ちたのは `test/build.test.mjs:66`「build: FLIGHT LAB sources are not copied into textbook/」で、actual は `['rewrite/combined/drafts/radio.js']`。W19-radio の下書きの名前が原因で、`inst` とは関係がない（factcheck-inst・reader-inst・revise-aero と同じ） |

## 4. 台帳の行

台帳の JSON もパッチも書いていない。下書きの主張の札は `drafts/inst.claims.json` にある。

- `check-chapter.mjs --claims-out` で抜き出し直した。抜き出された文は 77 → 88。
  - 文の変わらない行（43）：W15 の札のまま。factcheck の N5・N6 の 4 行は、出典の書き方だけ直した（`note`）。
  - 文が変わった行と新しい行（45）：`by: revise-inst` で、札と出典（2.5 の一次資料）を付けた。文が変わった行は `note` に前の ID を書いた。
  - 消えた行（34）：外した計算演習・帯の値の段落・直した文の前の ID。
- `extracted: false` の行（12）：道具が抜き出さない文のうち、値や手順を言う文を手で足した。ID は `節#hand-8 桁`。
  - 単位のない数の速度の表 3 行（POH 2.3）
  - 電気の思い出そう 2 行（POH 3.5d・7.13）
  - リバージョン 2 行（POH 3.5e）
  - QNE（例題 18）
  - サーボに打ち勝つ・入れ直さない（POH 補足 2）
  - ALT の失速（AAH）
  - FD だけのとき（POH 7.13）
- 合計 100 行：参考値 95・条文 4・教材値 1、うち例題 19。
- `checkedBy` は付けていない（確かめ役が付ける）。

統合役への頼みは次のとおり。

- **CLAIMS**：W15 のパッチ `reports/W15.ledger.json` にある CLAIMS の 77 行は古い。章を登録するコミットでは、代わりに `drafts/inst.claims.json` の 100 行を `op: "add"` で入れてほしい（revise-aero・P5 の `basics` と同じ方法）。
  - 署名：W15 の札のままの 43 行は、factcheck-inst の 5 のとおり署名してよい。
  - `by: revise-inst` の 57 行は、まだ誰も確かめていない。確かめ役（W27）が確かめてから署名してほしい。
- **JCAB-MAP**：`cpl.1.6.2.3`（回転角：シンクロ）は、W15 のパッチでは note だけ。今は `inst.flow` の発展に中身があるので、`missing` から `inst.flow` を外してよい（`sys.eis` の分は W14）。
- **ERRATA `K.instruments.gap-1`**：`inst.alt` の `bk.jur('alt.transition', 'alt.unit')` はそのまま。`fixed` にしてよい（W15 のパッチどおり）。
- **RULINGS `R.altimeter-rule-of-thumb`**：本文は「海面から 1,000 ft までの平均で約 28 ft、海面そのものでは約 27 ft」と、2 つの目安を同じ所で説明した。基礎教材の 27 ft と食い違わない形になった。

## 5. 未解決のこと

1. **安全レビュー**：〔安全〕に近い文を 5 か所で直した・足した。独立した安全レビュー（W27・W36）を通るまで、直し終えたことにしない（STYLE）。
   - `sys.g1000`：飛んでいる途中で速度計がおかしいとき
   - `inst.alt`：28.00 inHg より低い日
   - `inst.ap`：ALT と失速、故障の手順、1 秒の例、入れ直さない、飛行前の点検
   - `inst.pfd`：リバージョン
   - `inst.flow`：電気の思い出そう
2. **語の仮置き**：HSI（水平状況指示器）・CDI（コース偏位指示器）・自立装置・遠隔指示コンパス（ジャイロシン・コンパス）・フラックス・バルブ・位置誤差・器差・ベローズ・ブルドン管・シンクロ・警告／注意／助言・操縦輪・ピトー静圧系統（通称）は `FL.terms` にない。W04 が決めたら、初出の形をそろえる（W24）。
3. **二度教えの住所**：`aero` 側（W13）と `navb` 側（W18）の持ち物の部分が残る。`CONCEPTS.json` に行を足す。
   - 動圧・標準旋回・θαγ・色の帯は `aero`、自差の計算は `navb`、高度計の誤差の序部の側は `basics`。
   - `inst` の側は、思い出そうとリンクに直した。
4. **道具の数え方**（W01）：部品の見出し、短い正式名の部分一致（PF ⊂ PFD・PM ⊂ FPM・気圧高度 ⊂ 気圧高度計）、囲みの字、単位のない数の表を抜き出さないこと（手で足した行）。

## 6. ほかの単位にお願いしたいこと（needs from others）

1. **統合役（登録。`sys` と同じコミットで：W15 の報告 7 の 1）**
   - `drafts/inst.js` の `B.add` を `book-1.js` へ入れる。
     - `NEW_R` を `book-core.js` の `R` へ。`amtAirframe2` は `sys` の下書き、`reiPPL` は `aero` の下書きと同じキーと URL なので、1 つにまとめる。
     - `lessons` の `i1` も入れる。
   - `drafts/inst-figs.js` の図を `book-figs.js` へ入れる。
     - 新しい `instFaces` を足す。
     - `compassErrors` と `pitotStatic` は、今の関数をこの描き直しで置き換える。
   - 4 の CLAIMS（100 行で W15 の 77 行の代わり）と JCAB-MAP の `cpl.1.6.2.3`。
   - **ACS-MAP**（W42 でもよい）の `sections` に、次の節を足す：

     | ACS の項目 | 足す節 |
     |---|---|
     | `PA.I.G.K1` | `inst.flow`・`inst.speed`・`inst.alt` |
     | `PA.I.G.K2` | `sys.g1000`・`inst.pfd`・`inst.ap` |
     | `PA.IX.C.K2`・`IR.VII.D.K2` | `sys.g1000`・`inst.pfd` |
     | `IR.II.B.K1` | `inst.pfd` |
     | `IR.II.B.K2` | `inst.ap` |
     | `PA.VIII.A.K1` | `inst.gyro` |

   - 写真 `ch04-photo3` は、`inst.gyro` の旋回の型の段落の直後に置いた（W22 の表と同じ節）。
2. **W04（`FL.terms`）**
   - 5 の 2 の語の行。
   - 「旋回計」：針の型（turn-and-slip indicator）を旋回傾斜計と別の行にするか、通称から外すかを決める（reader C3・expert E-S5。JCAB 例題 17 の図は針の型）。
   - 「ピトー静圧系統」を `pitot-static` の通称に足すか。
   - QNE の行。
   - V<sub>FE</sub> の正式名（`aero.vn` は「フラップ下げ最大速度」。`inst` もそれに合わせた）。
3. **W01（検査の道具）**
   - W14 の報告 5.2 の `skipForStyle` の 1 行（入れると `inst` の style の error は 0。3 で確かめた）。
   - 初出の形の部分一致（5 の 4）。
4. **W13（`aero`）**：E-S10〜E-S13 の住所が `aero` であることを `CONCEPTS.json`（W03・W27）に書いてほしい。`inst` はもう、思い出そうとリンクだけにしている。
   - `C.dynamic-pressure`：住所 `aero.lift`、呼び戻し `inst.speed`
   - `C.standard-rate-turn`：住所 `aero.turn`、呼び戻し `inst.gyro`
   - `C.pitch-aoa-path`：住所 `aero.aoa`、呼び戻し `inst.gyro`
   - `C.asi-arcs`：住所 `aero.vn`、呼び戻し `inst.speed`
5. **W18（`navb`）と W03・W27**
   - E-S14：自差の原因と自差表は `sys.compass`、足し引きと FOR・STEER は `navb.north`、と分けた。
   - `navb.north` の太字の定義を残すなら、`CONCEPTS` に `C.deviation`（住所 `navb.north`、呼び戻し `sys.compass`）を足す。
   - `navb` を登録したら、`sys.compass` の「自差表を使った針路の計算は、航法の章で学びます」に `bk.see('navb.north', …)` を足す（決まり 13。登録のコミットか後で）。
6. **序部（`basics`）の持ち主（統合役）**：E-S15。
   - `basics.alt` の「ここに注意」を 3 行に縮め、`inst.alt` へリンクする（`inst` の登録と同じコミットか後）。
   - `C.altimeter-errors` の `recalls` に `basics.alt` を足す。
7. **W14（`sys`）**
   - E-S16 の分担：圧力を感じる部品とシンクロの概要は `inst.flow` の発展に書いた。エンジン計器のブルドン管・熱電対は `sys.eis` のまま。
   - JCAB-MAP `cpl.1.6.2.1`・`cpl.1.6.2.3` の `sys.eis` の扱いを決めてほしい。
   - 電気の言い方は `sys.elec` の順にそろえた。
8. **W22（写真の説明）**
   - `ch04-photo3` のキャプション（指針式の旋回計）を、W04 が決める名前にそろえる。
   - reader A7（`ch00-photo6` の針の読み方）は任意。
9. **W06（`FL.jur`）**：reader M3（`sbas` の囲みの SBAS に 1 句）を検討してほしい。
10. **W27・W36（安全レビュー・確かめ役）**
    - 5 の 1 の 5 か所の安全レビュー。
    - `inst.claims.json` の `by: revise-inst` の 57 行の確かめと署名。
11. **W30（第 4 部）**
    - `ifr.instr` に DESIGN 3.3 の「速度計が信用できないときの姿勢と出力の表」を作る。作ったら、`sys.g1000` の新しい小見出しから「予告」のリンクを足せる。
    - `ifr.auto` を `inst.ap` への呼び戻しに。
12. **W19（radio）**：`drafts/radio.js` の名前（TEXTBOOK のテストの 1 件の失敗）。
