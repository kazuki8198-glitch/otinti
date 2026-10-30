# answerable-R2：本文だけで解けるか（DESIGN 5 章の基準 14）— 序部と第 1 部

担当：本文だけで解けるかの確認役（R2）。2026-10-30。
範囲：序部（p0）の 4 章（`intro`・`basics`・`english`・`sim`）と第 1 部（p1）の 16 章（`aero` 〜 `adm`、まとめの `g1`）。
**本は直していません**。このファイルのほかに、作ったファイルはありません（下の作業用スクリプトはスクラッチの中だけ）。

## 1. 結論

| 問いの種類 | 数 | 正しく答えられた | 本文から答えが出た |
|---|---:|---:|---:|
| 章末の確認問題（4 択、`ch.quiz`） | 143 | 143 | 143 |
| 説明してみよう（記述、`ch.written`） | 233 | 233 | 233 |
| `g1` の問い（`g1.review` の問 1〜15・口述 1〜4、`g1.japan` の確かめの問い 4） | 23 | 23 | 23 |
| **任された範囲の計** | **399** | **399（100%）** | **399（100%）** |
| （追加）本文の中の「考えてみよう」（`g1` 以外の 19 章） | 91 | 91 | 91 |
| （追加）学科テストに R2 で足した第 1 部の 81 問（`quiz.js` の meta 付きの問） | 81 | 81 | 80（＋推論で 1） |
| **全部の計** | **571** | **571（100%）** | **570（99.8%）＋推論で 1** |

- **目標の 95% を満たします**（任された範囲は 100%、追加を入れても 100%）。
- 本文に答えが**まったく書かれていない**問いは、ありませんでした。
- 「なぜ」の理由が本文に書かれておらず、**推論でしか答えられない**問いが 2 つありました（どちらも答えは当たる。下の 3 の G1・G2）。直す文を 6 に書きました。
- 答えの例（解説）に、本文にない出典の番号が 2 か所ありました（下の 3 の G3。出典の札だけで、答えには関係しません）。

## 2. やり方

1. 本を TEXTBOOK の読み込みの列（`textbook/build.mjs` の `FL_MODULES`、`render-ch.mjs` と同じ）で読み込み、章ごとに 3 つのファイルへ分けました（スクラッチの `extract.mjs`）。
   - 本文：節の HTML を `render-ch.mjs --text` と同じ形で文字にしたもの（図は `aria-label` の文、写真はキャプション）、用語・例・注意。本文の中の「考えてみよう」（`bk.q`）は**答えを抜き**、問いだけを残しました。
   - 問い：章末の 4 択（正解の印なし）・記述の問い・考えてみようの問い。
   - 答え：正解の記号と理由、記述と考えてみようの答えの例（解く前は開かない）。
2. 章ごとに問いを読み、**まず自分の答えを決め**、その答えが書いてある本文の場所（節）を本文の文字の検索で見つけました（スクラッチの `f.mjs`。節の ID つきで当たった行を出す）。本文に場所が見つからない答えは「本文が教えていない」として記録します。
3. そのあとで答えのファイルを開き、正誤を付けました。
4. 見落としを減らすため、答えの例に出てくる「数＋単位」と出典の番号（AIM・CFR・POH・図）のうち、序部と第 1 部の本文と問いのどこにもないものを機械で抜き出しました（スクラッチの `numcheck.mjs`）。出てきたのは、問いの数から計算した値と、出典の番号 2 つ（G3）だけでした。
5. `g1` の問いは、`g1` の本文と、序部・第 1 部の全章の本文から答えました（まとめの章なので）。
6. 追加で、学科テストの 14 分野に R2 で足した 81 問（`meta.sec` 付き）も、同じ手順で解きました（スクラッチの `extract-quiz.mjs`）。

**独立性の注意**：`g1` は、構造を知るために `flight-lab/src/book-gates.js` の元のコードを最初に開いたとき、問 1〜15 の答えの冒頭（各 300 字まで）が目に入りました。`g1` の正誤はこの分だけ独立でありません。ただし「本文が教えているか」は、ほかの章と同じく、答えが書いてある節を本文の中で見つけて確かめました（下の表の「答えの節」）。

## 3. 欠陥（本文から答えが出ない・理由が書かれていない）

| # | 問い | 節 | 何が足りないか | 重さ |
|---|---|---|---|---|
| G1 | 学科テスト `q_aero.20`「着陸復行で、フラップを一度に全部上げないのはなぜ？」（正解 C：揚力が急に減り、沈んで地面に近づくおそれ） | `aero.flaps` | 節は「着陸復行では、一度に全部上げずに、まず 25° にします」と**手順だけ**を書き、理由（全部上げると揚力が急に減って沈む）を書いていません。表の「フラップを下げると揚力も抗力も増える」から逆に考え、ほかの 3 つの選択肢を消せば当たりますが、問いは「なぜ」を聞いています。理由の `{ch:aero}` が指す節に理由がない | should |
| G2 | `basics` の考えてみよう（`basics.flight`）「降下と進入の段階で、着陸をやめてやり直すときの計画を確かめておくのはなぜ？」 | `basics.flight` | 本文は表の「降下と進入：…着陸復行（ゴーアラウンド）の計画」だけで、答えの例の理由（着陸できないと分かってから考えると、時間も高さも足りない）を書いていません。常識で答えられる程度ですが、本文からは出ません | nit |
| G3 | `hf` の考えてみよう T6（`hf.vision`）の答えの例が「米国の AIM 8-1-8」、`law` の章末 Q1 の理由が「AIM 3-2-3」を出典にしている | `hf.vision`・`law.airspace` | 答えの中身（止まって見えて大きくなる機は衝突のコース、Class C は交信の確立）は本文にあります。出典の番号だけが本文に出てきません（本文は `hf.vision` に AIM の番号なし、`law.airspace` は 91.129〜91.131・AIM 3-2）。答えやすさには関係しない | nit |

上の 3 つのほかは、全問で、答えが書いてある節を本文の中に見つけました（4 の表）。

## 4. 章ごとの記録

正解は、章末の 4 択の記号（問 1 から順）。「答えの節」は、答えを見つけた本文の節です。記述と考えてみようは、問いごとに自分の答えの要点を決めてから照らし、すべて答えの例の要点と合いました（表は要点の照合の結果の数だけを書きます。問いごとの答えの要点はスクラッチの `notes.tsv`）。

| 章 | 4 択（自分の答え） | 4 択 | 記述 | 考えてみよう | 答えの節（主なもの） | メモ |
|---|---|---:|---:|---:|---|---|
| `intro` | A C A A A B D | 7/7 | 1/1 | 4/4 | `intro.course`・`intro.marks`・`intro.cert`・`intro.japan`・`intro.exams` | 記述 1（双発機）は `intro.cert` の限定（等級）と「限定の外の等級は機長になれる人の監督の下で練習」まで本文にある |
| `basics` | B D A C | 4/4 | 14/14 | 9/9 | `basics.*` の全節 | 考えてみよう T1 は G2 |
| `english` | A C B D | 4/4 | 7/7 | 2/2 | `en.terms`・`en.class` | 記述 2 の「正式名（略語：English）」は `en.terms` |
| `sim` | B A A A A | 5/5 | 0 | 4/4 | `sim.can`・`sim.how`・`sim.screen`・`sim.keys` | |
| `aero` | B C B C C A D A D B | 10/10 | 26/26 | 4/4 | `aero.forces`・`wing`・`lift`・`aoa`・`drag`・`power`・`axes`・`stall`・`spin`・`turn`・`stab`・`ge`・`flaps`・`vn` | 計算の記述（W4・W12〜W19・W24）は、式と定数（1,091・11.26・余剰馬力 ÷ 重量など）がすべて本文にあり、計算し直して答えの例と一致 |
| `sys` | B B B B B A C D B | 9/9 | 22/22 | 1/1 | `sys.airframe`・`piston`・`engine`・`eis`・`carb`・`fuel`・`elec`・`gear`・`lights` | 記述 22（POH で調べる）に要る値（O-360-A4M・100/100LL・8 qt・55〜95/25/115 psi・245°F・2,700 rpm・低い油圧の手順）は本文にある |
| `inst` | B A C D A B C D | 8/8 | 22/22 | 0 | `inst.flow`・`sys.g1000`・`inst.speed`・`inst.alt`・`inst.gyro`・`sys.compass`・`inst.pfd`・`inst.ap` | 4 択 4（北への旋回）は `sys.compass` の UNOS で決まる。記述 22 の柱・代替静圧の弁・水を抜く弁・非常用バッテリー・POH 3.5e・AP DISC も本文にある |
| `perf` | C C B B B D A D B | 9/9 | 24/24 | 7/7 | `perf.da`・`tol`・`chart`・`climb`・`range`・`fuel`・`plan` | 補間の表・密度高度の概算式・hPa の 27 ft・図 5-7/5-15/5-35 の条件は本文にある |
| `wb` | A C A D C | 5/5 | 27/27 | 5/5 | `perf.wb`・`wb.limits`・`perf.wbex`・`wb.graph`・`wb.shift` | 記述 21 の横の偏り（中心線からの距離 × 重さ）は `wb.shift` にある |
| `wx` | A B B B C D C A D C D | 11/11 | 26/26 | 15/15 | `wx.*` の全節 | 突風分の半分（`wx.shear`）、G-AIRMET の 3 時間ごとの写真（`wx.info`）、NWS の TAF に BECMG なし（`wx.metar`）も本文にある |
| `navb` | A D B C | 4/4 | 11/11 | 4/4 | `navb.earth`・`north`・`wind`・`calc` | |
| `law` | B B B B B A C D A C D | 11/11 | 10/10 | 8/8 | `law.basis`・`pic`・`pilot`・`aircraft`・`airspace`・`vfr`・`special`・`rules` | 4 択 1 の理由の出典は G3 |
| `radio1` | B B A B B C | 6/6 | 3/3 | 4/4 | `radio.why`・`equip`・`technique`・`listen` | |
| `radio2` | B B C B C | 5/5 | 3/3 | 4/4 | `comm.basic`・`numbers`・`callsign`・`words` | 考えてみよう T1 の Alpha は、本文の「AIM の表は Alfa、この本の無線呼出符号は Alpha」と合う |
| `radio3` | B B B B B C A D | 8/8 | 4/4 | 4/4 | `comm.pattern`・`ack`・`readback`・`clarify`・`mistakes`・`runway` | Monitor は `comm.ack`、continue は `comm.runway` の表 |
| `radio4` | B C C B B D | 6/6 | 3/3 | 2/2 | `comm.flow`・`atis`・`dep`・`radar`・`arrive` | 4 択 5（南西の VFR の巡航高度）は `comm.arrive`（91.159） |
| `radio5` | C B B B B C | 6/6 | 3/3 | 1/1 | `comm.ctaf`・`xpdr`・`mayday`・`nordo`・`sfb` | |
| `hf` | C C A B B D A D C | 9/9 | 17/17 | 8/8 | `hf.self`・`fatigue`・`altitude`・`body`・`motion`・`vision`・`adm`・`attitude`・`srm` | 考えてみよう T6 の出典は G3 |
| `adm` | A C B D C A | 6/6 | 10/10 | 5/5 | `adm.error`・`check`・`sa`・`risk`・`review` | 4 択 4 は `adm.risk` の本文の例（雲に入る結果は壊滅的・いつか起きる → 高い） |
| `g1` | B A C D A C B D A B | 10/10 | 0 | 23/23 | 序部と第 1 部の全章（問ごとの節は下） | 2 の独立性の注意 |
| **計** | | **143/143** | **233/233** | **114/114** | | |

`g1` の問いの答えの節：問 1 `basics.speed`、問 2 `basics.alt`、問 3 `basics.rules`、問 4 `basics.time`（滑走路の番号は磁北）、問 5 `basics.units`、問 6 `aero.stall`、問 7 `aero.turn`、問 8 `sys.carb`、問 9 `sys.g1000`（静圧孔の詰まりの表）、問 10 `perf.da`、問 11 `perf.wb`・`wb.shift`（燃料 95.0 in ＞ 後ろの限界 93.0 in）、問 12 `wx.metar`、問 13 `navb.wind`、問 14 `radio.listen`・`comm.callsign`・`comm.clarify`、問 15 `hf.self`（PHAK の 5 倍）、口述 1 `sys.piston`・`sys.eis`、口述 2 `inst.flow`・`sys.g1000`、口述 3 `perf.wbex`・`wb.limits`、口述 4 `hf.self`・`hf.fatigue`・`adm.risk`、`g1.japan` の問い 4 つは `g1.japan` の日米の表（燃料・転移高度・飲酒・雲からの距離）と `law.vfr`。

追加の学科テスト 81 問（`q_aero`・`q_sys`・`q_perf`・`q_wx`・`q_law`・`q_comm`・`q_radio`・`q_hf`・`q_nav` の meta 付きの問）は、81 問とも正解の記号と一致しました。答えの節は、各問の `meta.sec` の節か、その章の別の節で見つけました。`q_aero.20` だけは G1（理由が節にない）。`q_comm.11`（VHF は見通し）は、`meta.sec` の `radio.equip` に「光のようにまっすぐ進む」とあり、`sys.radio` にも空間波の説明があります。

## 5. 気づいたこと（基準 14 の外。直すかは持ち主が決める）

- **章末の 4 択の正解の位置**：`check-questions.mjs` の集計で、章の 4 択の正解は A 19.7%・B 46.9%・C 21.6%・D 11.7% です（warn `answer-position`。基準 18 の 15〜35% を B と D が外れる）。解いていても、`radio3`（8 問中 5 問が B）・`law`（11 問中 5 問が B）・`sys`（9 問中 6 問が B）で偏りを感じました。表示のときに選択肢を並べ替えていないなら、本文を読まずに当てられる問いが増えます。
- **VFR の巡航高度の住所**：`navb.north` は「米国の VFR の巡航高度の決まりは…（→ 予告：ログと巡航高度（第 3 部））」と書きますが、`radio4` の `comm.arrive` は第 1 部の中で 91.159 の中身（磁航路 180〜359° は偶数千 ft＋500 ft）をすでに教えています。R3 で第 3 部の節を書くとき、太字の定義が 2 か所にならないよう（基準 15）、どちらを住所にするかを決める必要があります。
- **POH で調べる記述問題**（`sys` 記述 22、`inst` 記述 22、`perf` 記述 24、`wb` 記述 27、`g1` 口述 1〜3）は、POH を開く練習として作られていますが、答えの例に要る値はすべて本文にありました。本文だけでも答えられるので、基準 14 の欠陥ではありません。

## 6. 他の人に頼むこと（needs from others）

本は持ち主の単位（統合役、または `aero`・`basics` を直す単位）が直してください。直す文の案です（数はなく、新しい規則もありません）。

1. **G1（should）** `flight-lab/src/book-1.js` の `aero.flaps`（639 行）：
   - 今：`着陸復行では、一度に全部上げずに、まず 25° にします。`
   - 案：`着陸復行では、一度に全部上げずに、まず 25° にします。遅い速さで一度に全部上げると、揚力が急に減って機体が沈み、地面に近づくからです（AFH）。`
   - 出典：FAA の Airplane Flying Handbook の着陸復行（go-around / rejected landing）の節は「とても遅い速さで急にフラップを全部上げると、揚力が失われて機体が地面へ沈むことがある」と書き、少しずつ上げることを勧めています（FAA-H-8083-3A の写し `https://www.faasafety.gov/files/notices/2014/Oct/FAA-H-8083-3A_Airplane_Flying_Hdbk1.pdf` と、その引用で確かめた。今の版 3C の章と頁は、書く人が確かめて札を付けてください）。留保の言い方（とは限りません・場合があります）は使っていません。
2. **G2（nit）** `flight-lab/src/book-0.js` の `basics.flight`：表の行（43 行）の下の段落（「計画どおりにいかないときは、…」の前か後）に、1 文を足す案：`着陸できないと分かってから考えると、時間も高さも足りません。だから、降下と進入の前に、やり直すときの向き・高さ・機体の設定を決めておきます。`（58 行の考えてみようの答えと同じ中身を本文に置く。数も規則もない）
3. **G3（nit）** `hf.vision` の考えてみよう T6 の答え（AIM 8-1-8）と、`law` の章末 Q1 の理由（AIM 3-2-3）：本文の該当の文に同じ出典を書き足すか、答え・理由の出典を本文と同じもの（`law` は 91.129〜91.131・AIM 3-2）にそろえる。

## 7. 確かめ（チェック）

| チェック | 結果 |
|---|---|
| FLIGHT LAB `npm run -s test:fast`（`flight-lab/`） | 89/89 通過 |
| TEXTBOOK `npm test`（`textbook/`） | 36/36 通過 |
| `node textbook/rewrite/combined/tools/check-questions.mjs` | error 0・warn 140（reason-no-basis 139・answer-position 1）・pending 1（JCAB の問題集はまだない）・info 14。この単位はファイルを変えていないので、変化なし |

章の下書きは作っていないので、`check-chapter.mjs` は対象がありません。

## 8. 台帳

触った行はありません（`reports/answerable-R2.ledger.json` は作っていません）。基準 14 の記録はこのファイルです。

## 9. 残る課題

- 基準 14 の「JCAB 形式の 4 択」は、`quiz-jcab.js` がまだないので（R4・W37）、この確認の範囲にありません。R4 で同じ手順で解く必要があります。
- 第 2〜6 部の章末の問いと部のまとめ（R3）も、同じ手順で確かめます。スクラッチのスクリプト（下）は、章の ID を変えればそのまま使えます。

作業用のファイル（本の外。統合しない）：`/tmp/claude-0/-home-user-otinti/b70eea3b-e7d6-5373-8fce-52f9b801af33/scratchpad/extract.mjs`（本文・問い・答えに分ける）、`/tmp/claude-0/-home-user-otinti/b70eea3b-e7d6-5373-8fce-52f9b801af33/scratchpad/f.mjs`（本文を節の ID つきで検索）、`/tmp/claude-0/-home-user-otinti/b70eea3b-e7d6-5373-8fce-52f9b801af33/scratchpad/numcheck.mjs`（答えの数と出典が本文にあるか）、`/tmp/claude-0/-home-user-otinti/b70eea3b-e7d6-5373-8fce-52f9b801af33/scratchpad/extract-quiz.mjs`（学科テストの 81 問）、`/tmp/claude-0/-home-user-otinti/b70eea3b-e7d6-5373-8fce-52f9b801af33/scratchpad/notes.tsv`（章ごとの記録）。
