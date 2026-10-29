# 安全レビュー R1（safety-R1）

作業日：2026-10-29。役割：R1 の独立した安全レビュー（DESIGN 5 章の基準 7、7.1 の「安全レビュー」、7.2 の W12 のうち安全レビューの分）。読んだもの：DESIGN 5 章の基準 7・6.2（15 の決まり）・7.2 の R1・10.1・10.2・10.4・10.5・付記 2〜6、DECISIONS.md、PROGRESS.md、reports/（W07a・W07b・W07c・W07d・W08a・W08b・W11・integrate-P3〜P5 など）、台帳 ERRATA・RULINGS の〔安全〕の行。書いた人と別の役として、本文・課目・CADET の台詞を、自分で取り直した一次資料と照らした。

**本・課目・CADET・台帳は 1 文字も変えていない**（この報告だけを書いた）。`flight-lab/kiso/` には触っていない。git の操作もしていない。

---

## 0. 結論：7 項目の判定

「いまの R1 の本・課目・CADET で、正しく、初学者に一通りにしか読めないか」の判定。

| # | 項目（基準 7） | 判定 | 本文・課目・CADET の場所 | 残っていること |
|---|---|---|---|---|
| ① | 故障したエンジンは足で特定し、スロットルで確かめる | **合格** | `me.oei`（手順の表・考えてみよう）、`me.perf`・`me.speeds`・`oei.what`、学科テスト q_me の 3 問、章末の例、原本の重ね表示 `engine-id`、課目 m2・m4 のブリーフと CADET の教官の台詞 | nit 3（CADET の m2・m4 のバンク角の言い方など。5 の 4） |
| ② | 周回進入で目視を失ったら、着陸する滑走路へ向かって上昇旋回して進入復行 | **R1 の本文にまだない**（合本の節 `ifr.circle` は R3 の W30）。原本の重ね表示 `circling-lost-visual` は正しい | `ifr.chart`（最低気象条件の行に「周回進入」の語だけ）、`ifr.np`、`kiso-errata.js` | should 1：R1 のつなぎとして `ifr.np` に 1 文（4 の②） |
| ③ | VFR で雲に入ったときの順番 | **不合格（must）** | `hf.body` の「ここが大切」の 3 つめ（book-2.js 301 行あたり）だけ | must 1（4 の③）。裁定 `R.vfr-into-imc` は open（W28） |
| ④ | マイクロバーストで機首を下げすぎない | **合格**（AWH 22.7.3.1・22.7.3.3 と一致） | `wx.shear`、図 `microburst`、`wx.ts`、学科テスト q_wx、章末の問い | should 2（失速警報との関係・文のテスト） |
| ⑤ | 失速からの回復の順番（自動操縦を最初に切る） | **合格**（順番はすべての場所で同じ） | `aero.stall`・`ops.stall`・図 `stallRecovery`・課目 a7・a8 のブリーフ・`stallRecovery` の `say`・`g`（a7・a8・c1）・CADET の教官の台詞・CADET の HUD の助言・学科テスト q_ops | should 3（a7 の目標と 300 ft の採点、Shift+R の案内の文、`ops.stall` が省いた 2 段階の名前） |
| ⑥ | 飲酒（米国 0.04・8 時間、日本は原則ゼロ・目安 0.2 g/L・0.09 mg/L・自家用も） | **合格** | `hf.self`（本文・囲み `alcohol`・ここが大切・考えてみよう）、学科テスト q_hf、原本の重ね表示 `alcohol`、CADET の本（米国の列が「米国の決まり」で残る） | should 1（考えてみようの答えが言い切らない）、nit 1（CADET の IMSAFE の掲示） |
| ⑦ | VFR の燃料（米国 91.151、日本の第 63 条は事業と IFR だけ） | **合格** | `perf.fuel`・`nav.log`・`law.rules`（本文・ここが大切・囲み `fuel.vfr`）、学科テスト q_perf・q_law、原本の重ね表示 `fuel-vfr` | should 1（日本の欄が「予備は要らない」と読めるおそれ）、nit 2 |

まとめ：**R1 で直すことになっていた〔安全〕（⑤・④・⑥・⑦と、①の教科書の側）は正しく直っている**。③は R1 の本文が弱いまま（裁定 B「教科書が弱い」）で、R1 だけを使う人（DESIGN 7.4「どの版で止めても使える」）には足りないので **must** とした。②は R1 に教える節がなく、原本の重ね表示だけが正しい。

---

## 1. 変えたファイル

- `textbook/rewrite/combined/reports/safety-R1.md`（この報告。新規）

ほかは変えていない（「やめてほしい」とされたファイルと、持ち物でないファイル）。直す案は 4・5 章に書き、10 章で持ち主に頼む。

---

## 2. 見た範囲

- 本（`flight-lab/src/book-0.js`〜`book-5.js`・`book-comm.js`・`book-figs.js`・`book-jur.js`。`test/load.mjs` で読み込んで、節の文字を取り出して読んだ）
  - 緊急：`emg.basic`・`emg.abort`・`emg.engine`・`emg.glide`・`emg.forced`・`emg.fire`・`emg.elec`・`emg.abnormal`、`comm.mayday`・`comm.nordo` の関係する所
  - 片発：`oei.what`・`me.vmc`・`me.drag`・`me.oei`・`me.land`・`me.perf`・`me.pattern`・`me.speeds`
  - 失速と異常姿勢：`aero.stall`・`ops.slow`・`ops.stall`・図 `stallRecovery`・`ifr.upset`・`crm.upset`・`ifr.partial`・`ifr.instr`・`sys.compass`
  - ウインドシア：`wx.shear`・図 `microburst`・`wx.ts`
  - 雲に入ったとき：`hf.body`・`basics.rules`（「雲に入る前に引き返す」）・`nav.lost` の章末の例
  - 周回進入：`ifr.chart`・`ifr.np`（ほかに「周回」の語は本文にない：book-4.js の 3 か所と `FL.jur` の `circle` だけ）
  - 飲酒：`hf.self`（`FL.jur` の `alcohol`）
  - VFR の燃料：`perf.fuel`・`nav.log`・`law.rules`（`FL.jur` の `fuel.vfr`）
  - 章末の例・注意・確認問題（全章を正規表現で探した）と学科テスト `quiz.js` の関係する問
- 課目 `flight-lab/src/syllabus.js`：a7・a8・`stallRecovery`（a7・a8・c1 で共通）を中心に、e1・e2・e3・c1・i2・m2・m3・m4
- CADET：`cadet/src/content/dialog/instructor.js` の `instructorDialogs` で a7・a8・e2・e3・i2・m2・m3・m4・c1 の教官のブリーフを作って全部読んだ。`cadet/src/ui/flight-hud.js` の助言、`cadet/src/flight/controls.js` の案内、`cadet/src/content/academy-spec.js` の掲示、`cadet/src/content/school.js` の航法ログの問い
- 原本の重ね表示 `flight-lab/src/kiso-errata.js` の〔安全〕の 9 項目（`fuel-vfr`・`alcohol`・`circling-lost-visual`・`engine-id`・`zero-sideslip`・`hf-hyperventilation`・`hf-ear`・`hf-disorientation`・`hf-co`）

---

## 3. 一次資料（2026-10-29 に自分で取り直して読んだ）

| 資料 | 読んだ所 | 何を確かめたか |
|---|---|---|
| FAA AFH（FAA-H-8083-3C）第 5 章 `06_afh_ch5.pdf` | p.5-15〜5-16「Fundamentals of Stall Recovery」（6 段階、単発の練習機は 4 つ）、p.5-15「prioritized power and maintaining altitude, which resulted in a loss of control」、p.5-26 図 5-18（スパイラルの 5 段階・Common Errors） | ⑤の順番、a7 の目標の言い方、`ifr.upset`・`crm.upset` |
| AFH 第 9 章 `10_afh_ch9.pdf` | p.9-28「Emergency Approaches and Landings (Simulated)」：最良滑空速度より速いときは減速を待ってから機首を下げる | e3 の `say`（5 の 1） |
| AFH 第 13 章 `14_afh_ch13.pdf` | p.13-31〜13-32 の identify・verify（「primarily through the control inputs … not the engine gauges」「retard the throttle」）、Dead foot dead engine、初めの 5〜10° のバンクは一瞬・そのあと約 2°・ボール 1/3〜1/2、約 800 rpm、Vmc はバンク 1° ごとに 3 kt 以上・翼を水平で 20 kt 近く | ① |
| AFH 第 18 章 `19_afh_ch18.pdf` | p.18-17〜18-21「Inadvertent VFR Flight Into IMC」（認める → 操縦を保つ（最初は翼を水平だけ）→ 助けを得る、旋回は 10° 以下、上昇は 1 目盛り）、引き返しの例（300 ft・4 秒・標準旋回・1,000 fpm） | ③、`emg.engine` |
| AC 120-109A（2015-11-24） | 頭の core principles（失速の手前からの回復の評価に、決めた高度の損失の値を入れない）、2-5（「recovery profiles that emphasize zero or minimal altitude loss and the immediate advancement of maximum thrust have been eliminated」）、4-5（評価は高度の損失に焦点を当てない）、表紙の要旨（Part 121 向けだが、パイロットスクールにも使うよう勧める。輸送機向けに作ったが多くの原則はすべての飛行機に当てはまる） | ⑤の should（5 の 1・2） |
| FAA AWH（FAA-H-8083-28B） `FAA-H-8083-28B.pdf` | 22.7.3（非対称のマイクロバースト）、22.7.3.1（「maintaining or increasing pitch attitude and accepting lower-than-usual airspeed」「pitch attitude must not be allowed to fall below the normal range」）、22.7.3.3 | ④ |
| AC 00-54 Pilot Windshear Guide（1988、付録 1 の再録 PDF） | 付録 1 p.48「After Liftoff/On Approach Windshear Recovery Technique … Always respect stick shaker」（輸送機向け） | ④の should（失速警報との関係） |
| AIM 5-4-21（FAA の HTML） | 「make an initial climbing turn toward the landing runway and continue the turn until established on the missed approach course」 | ②・原本の重ね表示 |
| AIM 8-1-1〜8-1-5（FAA の HTML） | IMSAFE の E は Emotion、ビール 1 本で 3 時間、8 時間でも残る、12〜24 時間、耳（バルサルバ）、過呼吸（呼吸を整える・酸素は 100%）、CO（暖房を切り通気口を開ける）、空間識失調は外の確かな目標か計器だけで防げる | ⑥・原本の重ね表示 4 項目 |
| eCFR 14 CFR 91.151・91.17 | 91.151(a)(1)(2) の文、91.17(a)(1)〜(4) と alcohol concentration の定義 | ⑥・⑦ |
| e-Gov の写し（`textbook/rewrite/sources/egov/`。航空法 令和 7 年 12 月 1 日施行・施行規則 令和 8 年 10 月 1 日施行） | 航空法第 63 条・第 70 条・第 73 条の 2、施行規則第 153 条（表に航空運送事業の VFR の行がある）・第 164 条の 15 | ⑥・⑦ |
| 国土交通省航空局長通達「航空機乗組員の飲酒による運航への影響について」（平成 31 年 1 月 31 日 国空航第 2278 号）https://www.mlit.go.jp/common/001271263.pdf | 2「原則」（体内にアルコールを保有する状態で航空業務を行わない）、3(1)（血液 1 L に 0.2 g 以上・呼気 1 L に 0.09 mg 以上） | ⑥ |
| IFH（FAA-H-8083-15B）p.7-27〜7-28 | 機首上げ：出力を「減速の程度に合わせて」足す → 機首を下げる → 翼を水平。機首下げ：出力を減らす → 翼を水平 → 機首を上げる | 異常姿勢（5 の 2） |

---

## 4. 7 項目ごとの所見

### ① 故障したエンジンの特定（合格）

- `me.oei` の手順の表は「操縦 → 全部前へ → 脚とフラップ UP → 特定（Dead foot, dead engine。計器での確認は止まり方によってはできない。主に足で判断し、計器は補助）→ 確認（止まったと思う側のスロットルを**ゆっくり**絞る）→ フェザー」。AFH p.13-31〜13-32 の順と言い方に合う。「いちばん重大な誤りは生きているエンジンを止めること」も書いてある。
- 学科テスト（q_me の 3 問）、章末の例（`me`・`oei`）、`me.perf` の 3 つの場面、`me.speeds` も同じ考え方で、食い違いはない。
- 原本の重ね表示 `engine-id`（kiso13.3・13.22・13.q22）も AFH の文と一致。
- CADET の教官（m2）：「Identify（特定）：踏んでいない足の側のエンジンが止まっています（Dead foot, dead engine）。Verify（確認）：そのスロットルを絞っても何も変わらないこと。」正しい。

→ 初学者に一通りに読める。署名してよい（8 章）。

### ② 周回進入で目視を失ったとき（R1 の本文にない）

- R1 の本には周回進入の飛び方の説明がない（`ifr.chart` の最低気象条件の行に語が出るだけ）。誤った文はない。合本の節 `ifr.circle` は DESIGN 3.3 で R3（W30）。
- 原本の重ね表示 `circling-lost-visual` は AIM 5-4-21 の文のとおりで正しい（「その方式の進入復行に従う」「まず着陸する滑走路へ向かって上昇旋回」「左右を決めて覚えるのではない」「日本の AIP は〔要確認〕」）。
- **should（R1 のつなぎ）**：`ifr.np` の「ここが大切」に「MAP まではコースを飛ぶ」とある。周回の途中で目視を失った初学者が、この句を当てはめて「進入のコースへ戻って MAP まで飛ぶ」と考えるおそれがある（AIM 5-4-21 は、その場合は着陸する滑走路へ向かって上昇旋回する、と別に書く）。`ifr.np` の進入復行の段落に 1 文足す案：「周回進入の途中で目視物標を失ったときは別で、着陸する滑走路へ向かって上昇旋回し、進入復行のコースに乗るまで旋回を続けます（米国の AIM 5-4-21）。」（第 4 部の章は `scope` が米国の規則を書く所なので国を書いた。`ifr.circle` へのリンクは、その節ができるまで置かない：決まり 13）。

### ③ VFR で雲に入ったとき（不合格・must）

- R1 の本で、入ってしまったあとの操作を書くのは `hf.body` の「ここが大切」の 3 つめだけ：「VFR で雲に入らない（第 8 章）。入ってしまったら、計器で翼を水平にし、来た方へ 180° 旋回する（教官と練習）」。
- 裁定 `R.vfr-into-imc`（DESIGN 10.4、B「教科書が弱い」、〔安全〕、open・W28）と AFH p.18-17〜18-21 に比べて、次が抜けている：
  1. **浅いバンク**（AFH：旋回は「no more than 10° bank angle」。同じ節が警告する墓場のスパイラルの入口は、深いバンクの長い旋回）
  2. **地形・障害物から離れる**（要れば上昇。AFH：上昇は姿勢指示器の 1 目盛りまで）。180° 旋回だけを書くと、降りながら山の方へ回る読み方を止められない
  3. **助けを求める**（AFH の 3 つめの「Obtaining the appropriate assistance」。管制に伝える）
  4. 180° 旋回は「来た方が確実に VMC で、地形が許すとき」の 1 つの手で、万能ではない（裁定の言い方）
- 予防の側は `basics.rules`（「雲が低くなってきたら、雲に入る前に、引き返す・降りる・経路を変える」）にあり、こちらは正しい。
- **must の直し方**（R1 のつなぎ。本番の節 `emg.imc` は R3 の W28）：`hf.body`（book-2.js）の「ここが大切」の 3 つめを、たとえば次にする。「VFR で雲に入らない（{ch:wx}）。入ってしまったら：① 計器で翼を水平に保つ ② 地形から離れる（要れば、姿勢指示器の 1 目盛りだけ機首を上げて上昇）③ 来た方が確実に晴れていて地形が許せば、浅いバンク（10° 以下）で 180° 旋回 ④ 管制に助けを求める（AFH 第 18 章）」。本文の段落に同じ順番を 2〜3 文で足すとよりよい（「ここが大切」は R5 の「今日の復習」で単独で出る：W46）。出典：AFH p.18-17〜18-21（翼を水平・10° 以下・1 目盛り・助け）と裁定 `R.vfr-into-imc`（180° の条件）。`hf.body` には課目 i2 のボタンがあるだけで、雲に入る場面の課目はない（DESIGN 6.1 の `emg.imc` → i2 も R3）。
- CADET：`hf.body` は CADET の本にも出る（同じ文）。直せば一緒に直る。

### ④ マイクロバーストで機首を下げすぎない（合格）

- `wx.shear`：「速度が急に変わったら、早めに出力をいっぱいにして、ゴーアラウンドします。このとき、速度が減っても機首を下げすぎません。速度を取り戻そうと機首を下げると、機体の性能を使えずに高度を失います。機首の姿勢を保ち、ふだんより低い速度を受け入れます（AWH 22.7.3.1・22.7.3.3）」、「ここが大切」に「機首を下げすぎない」、「よくある間違い」に非対称のマイクロバースト（最初の浮きがないか小さい）。AWH 22.7.3・22.7.3.1・22.7.3.3 の文と一致する（数字 2.5 mi・5〜15 分・6,000 fpm・30〜90 kt も 22.7.3 と同じ）。
- **should 1（失速との関係）**：初学者には、失速の節の「回復の最初は必ず押す」と、この節の「速度が減っても機首を下げない」がぶつかって見える。AWH は機首の上限を書いていないが、AC 00-54 付録 1（輸送機の手順）は「Always respect stick shaker」とする。案：「機首は失速警報が鳴らない範囲で保ちます。失速警報が鳴ったら、迎え角を減らすのが先です（→ 失速とスピン）」。後半は AFH 第 5 章の原則そのもの。前半を小型機の言い方で書く一次資料（POH・AFH）は今回見つけていないので、書き手が POH で確かめられなければ「輸送機の手順（AC 00-54）の考え方」と出典を書くか、後半だけにする。
- **should 2**：基準 7 は「①〜⑦の文はテストで確かめる」。④の文（「機首を下げすぎ」）を決め打つテストがない（6 章）。
- nit：同じ節に本文「ウインドシア」と囲み「ウィンドシャー」の 2 つの書き方（PROGRESS の未解決に既出。W24）。

### ⑤ 失速からの回復の順番（合格）

- 順番が一致していることを確かめた場所：`aero.stall`（「自動操縦のある機体では、その前にまず自動操縦を切ります」→ ① 押す（必要なら機首下げのトリム）→ ② 翼を水平 → ③ 出力を必要に応じて → ④ ゆるやかに元の飛び方へ・二次失速）、`ops.stall`（4 段階・失速警報が止まるまで・エルロンを先に使わない理由）、図 `stallRecovery`、課目 a7・a8 のブリーフ（自動操縦 → ①〜④、「迎え角を減らす前に出力やエルロンで直そうとするのは、AFH が挙げるよくある間違い」）、`stallRecovery` の `say`・`g`（a7・a8・c1）、CADET の教官の台詞（「回復の順番（AFH の型）：自動操縦のある機体では、まず自動操縦を切ります。」→「そのあとは、① 機首を下げて迎え角を減らします（失速警報が止まるまで）。② 翼を水平にします。」→「③ 出力を必要なだけ足します（ここではフルパワーでゴーアラウンド）。」→「④ …」）、CADET の HUD の助言（「失速：まず W で機首を下げる（迎え角を減らす）。速度が付く前に引かない」）、学科テスト q_ops。AFH p.5-15〜5-16 の 6 段階と単発の練習機の 4 段階の説明に合う。
- **should 1（a7 の目標と 300 ft の採点）**：a7 の目標「着陸形態での失速を体験し、**高度の損失を少なく**回復する」は、CADET の教官が 2 回言い（目標の行と確認の問いの正解・言い直し）、採点は a7・a8・c1 とも「回復で失った高度 300 ft 以内」。AFH p.5-15 は「迎え角を先に減らさず、出力と高度を守ることを先にして操縦できなくなった事故がたくさんある」と書き、AC 120-109A は「失速の手前からの回復の評価に決めた高度の損失の値を入れない」「高度の損失をゼロか最小にする回復の型はなくした」とする（訓練校にも使うよう勧める）。ACS（PA.VII.B・C）にも高度の損失の基準はない。W07d が残した判断（W07d 5 の 1：採点を見直すか）への安全レビューの答え：
  - 目標の文を変える（案：「着陸形態での失速を体験し、迎え角を先に減らして確実に回復する」）。CADET の確認の問いの選択肢も一緒に変わる。
  - 採点の「回復で失った高度」は、合否に使わない参考の行にする（二次失速の行は残す）ことを勧める。DESIGN 10.5 は「採点は変えない」としているので、所有者の判断として上げる（10 章）。変えないなら、最低限 a7・a8 の `std` と `aero.stall`・`ops.stall` の `bk.sim` に、`me.vmc` と同じく「回復で失う高度 300 ft 以内は教材の基準で、ACS の基準ではない。高度を守るより迎え角を減らすのが先」と書く。採点を変えると `flight-lab/test/flight.test.mjs` の「the stall lessons teach the AFH recovery order」の採点の行を意図して直す（`TEST-CONSTANTS.md` に 1 行）。
- **should 2（Shift+R の案内）**：`flight-lab/src/app.js` 126 行と `cadet/src/flight/controls.js` 115 行の案内「スロットル全開（Shift+R）：離陸・ゴーアラウンド・**失速の回復で一気に**出力を出す」は、③「出力を必要なだけ」と AFH p.5-16（「Advance the throttle promptly, but smoothly, as needed」）、AC 120-109A 2-5（最大推力をすぐに入れる型はなくした）に合わない。案：「スロットル全開（Shift+R）：離陸・ゴーアラウンドで一気に出力を出す（失速の回復では、迎え角を減らしてから必要なだけ）」。この文を決め打つテストはない（grep で確かめた）。
- **should 3（`ops.stall` の 2 段階）**：`ops.stall` は「AFH の回復の型（6 段階）のうち、自動操縦のない単発の練習機では 4 つを使います」と書くが、省いた 2 つ（最初に自動操縦を切る・スピードブレーキを戻す）の名前がない。⑤の「自動操縦を最初に切る」は `aero.stall` にしかない。CADET の本にも `ops.stall` は出る。案：「（残りの 2 つは、最初に自動操縦を切ることと、スピードブレーキを戻すこと。→ 失速とスピン）」。
- nit：CADET の a7・a8 のホワイトボードには `aero.stall` の「迎え角と失速」の図が出て、回復の図（`ops.stall` の `stallRecovery`）は出ない（`book` の先頭を変えない決まりとテストのため。DESIGN 6.1）。
- nit（台帳）：`SYNC.stall-recovery` の `places` に `ops.slow` が残っている（図と 4 段階は `ops.stall`。DESIGN 付記 4 で 10.5 は直したが台帳の行は古いまま）。

### ⑥ 飲酒（合格）

- `hf.self` の米国の文（14 CFR 91.17：8 時間以内・酔っている間・0.04 以上）は eCFR の 91.17(a) と、AIM の文（ビール 1 本で少なくとも 3 時間・8 時間でも残る・12〜24 時間）は AIM 8-1-1 と一致。
- 囲み `alcohol` の日本の欄（第 70 条・通達の原則・血液 1 L に 0.2 g 以上か呼気 1 L に 0.09 mg 以上が目安・自家用の操縦者も対象・その後の改正は〔要確認〕）は、e-Gov の第 70 条（「航空機乗組員は、アルコール又は薬物の影響により…」。自家用に限る言葉はない）と、通達 国空航第 2278 号の 2・3(1) の文（国土交通省の PDF）で確かめた。原本の重ね表示 `alcohol` も同じ。
- CADET：`hf.self` に 91.17 と「8 時間」が残ることは `cadet/test/jur.test.mjs` が確かめ、日本の列は消える（DESIGN 6.3 のとおり）。
- **should**：`hf.self` の考えてみよう「前の晩 21 時までビールを 2 本。翌朝 6 時に飛んでよい？」の答えが、規則の 8 時間はぎりぎり過ぎる・AIM は 12〜24 時間・迷ったら教官、で終わり、「飛ぶか」を言い切らない。案：答えの最後を「この朝は飛びません（AIM の目安の 12 時間に足りない）。教官に伝えて予定を変えます。日本の基準（体内にアルコールを残さない）でも同じです」。
- nit：CADET の掲示 `academy-spec.js` の IMSAFE が「E 食事・水分（Eating）」（コーヒーの掲示も「IMSAFE の E」）。AIM 8-1-1 と本の `hf.self` は Emotion（感情）。飲酒の行（A）は正しい。

### ⑦ VFR の燃料（合格）

- 米国の文（`perf.fuel`・`nav.log`・`law.rules`：最初の着陸予定地まで＋普通の巡航速度で昼 30 分・夜 45 分、風と予報を考える）は eCFR の 91.151(a) と一致。考えてみようと学科テストの計算（22.5 gal・16.7 gal）も合う。
- 囲み `fuel.vfr` の日本の欄（量を法令で決めるのは航空運送事業と IFR だけ、自家用・訓練の VFR に法定の最低量はない、機長は出発前に燃料の量と品質を確かめる：第 63 条・施行規則第 153 条・第 73 条の 2・施行規則第 164 条の 15）は、e-Gov の写しの条文どおり（施行規則第 153 条の表の VFR の行は航空運送事業の機の行）。原本の重ね表示 `fuel-vfr` も正しく、「訓練では学校の決まりにも従います」まで書いている。
- **should**：本の囲み（`FL.jur` の `fuel.vfr` の日本の欄）は「法定の最低量はない」で終わるので、初学者が「日本の VFR は予備がいらない」と読むおそれがある。原本の重ね表示と同じく「訓練では学校の規程の量に従う」を足す案（`book-jur.js` は W06 の持ち物）。または `perf.fuel` の本文に「法令の最低量がない飛行でも、予備は学校の規程と機長の判断で持ちます」。
- nit：`law.rules` の「ここが大切」の「VFR の燃料は、最初の着陸予定地まで＋昼 30 分・夜 45 分」に国がない（章は米国の規則の章なので今は読み違えにくいが、R5 の「今日の復習」では「ここが大切」が単独で出る。`perf.fuel` と同じく「米国の VFR の燃料（91.151）」に）。
- nit：CADET の航法ログの問い（`cadet/src/content/school.js` 214 行）と黒板（`main.js` 727 行）の「昼間の有視界飛行の予備（30 分）」に国の名前がない（CADET は米国の決まりの世界なので誤りではない）。

---

## 5. 7 項目の外で見つけたこと（緊急・異常姿勢）

1. **should：課目 e3 の `say`**（ERRATA `SYNC.e3-glide-entry`〔安全〕・open・R3 の W36 送り）：100 kt の巡航で「エンジン停止！ 機首を下げて 76 kt」（syllabus.js 228 行）。本の `emg.basic` は「巡航中など速いときは、高度を保って 76 kt まで減速してから機首を下げます」で正しく、AFH p.9-28 も同じ（「allows the airplane to slow … until reaching best glide speed. When reaching that speed, the nose can be lowered」）。CADET の操縦席はこの `say` を言うので、R1 の中で本と課目が食い違って見える。直しは 1 文で済むので、R1 で直すことを勧める（案：「エンジン停止！ 高度を保って 76 kt まで減速し、それから滑空の姿勢。LAB RWY 36 へ向けて旋回」）。台帳の行の一次資料「AFH 第 18 章」は第 9 章 p.9-28 に直す。
2. **should：課目 i2 のブリーフ**（`SYNC.i2-upset`〔安全〕・open・W36 送り）：スパイラルが「①パワー アイドル ②先に翼を水平 ③それから機首を上げる」で、AFH p.5-26 の「翼を水平にする前に少し押して荷重を約 1 G に」がない。機首上げの「①フルパワー」は IFH p.7-27 の「減速の程度に合わせて出力を足す」より強い。本の `ifr.upset`・学科テスト q_ifr・章末の例は AFH・IFH のとおりなので、CADET の教官だけが別の順番を言う。これも R1 で直すことを勧める（採点の「手順（翼を先に水平）」は押す段階があっても通る形なので、採点の見直しは W36 でよい）。
3. nit：学科テスト q_ifr の機首上げの問の理由（quiz.js 163 行）の機首下げの順番も「押す」がない（IFH の 3 段階）。`ifr.upset` は「IFH の 3 段階に AFH の押すが加わった形」と説明済みなので矛盾ではない。
4. nit（CADET の m2・m4）：「生きているエンジン側へ 2〜5° バンク」。AFH p.13-31〜13-32 は「初めは 5〜10° を一瞬、方向を保てたら約 2°」、本の `me.drag`・`me.oei` も同じ。m4 の手順に「全部前へ」とフラップがない（離陸の出力のままなので操作は要らないが、本の手順の形と違う）。m2 の Verify に「ゆっくり」がない。どれも誤りではない（W07d の 2 回目か W36）。
5. 確かめて問題がなかったもの：`emg.engine`（引き返しの例の 18 秒・42° は AFH 第 18 章の数字と合う）、`emg.abort`、`emg.forced`、`emg.fire`（電気火災でなければマスターを切らない）、`emg.elec`（SAIB CE-10-11）、`emg.abnormal`、`crm.upset`（AC 120-111 の 2 つの型）、`ifr.upset`（AFH 図 5-18）、`ifr.partial`、`ifr.instr`・`sys.compass`・`sys.g1000`（同じ情報源は多数決にしない・詰まりは予備計器にも出る：ERRATA `T.instruments.E-T2`）、`me.land`・`me.perf`・`me.vmc`・`me.drag`、原本の重ね表示の〔安全〕9 項目（AIM 8-1-2〜8-1-5 の文を確かめた）。

---

## 6. 文のテスト（基準 7 の「①〜⑦の文はテストで確かめる」）

今あるもの：⑤（`flight-lab/test/flight.test.mjs`「syllabus: the stall lessons teach the AFH recovery order…」が課目・`aero.stall`・`ops.stall` の順番を、`cadet/test/content.test.mjs` が教官の台詞を確かめる）、⑥・⑦（`flight-lab/test/jur.test.mjs` が `FL.jur` の値と囲みの置き場所、`cadet/test/jur.test.mjs` が CADET の `hf.self` の 91.17・8 時間と `perf.fuel` の 91.151 を確かめる）。

ないもの（should。テストの持ち主・統合役へ）：
- ④ `wx.shear` に「機首を下げすぎ」がある
- ① `me.oei` で「特定」→「確認」→「フェザー」の順と「Dead foot」「ゆっくり絞る」がある
- ⑦ `perf.fuel`・`nav.log` に「最初の着陸予定地」がある（DESIGN 5 章の基準 1 の例そのもの）
- ③・② は文ができたコミットで足す（`hf.body` のつなぎを入れるなら、そのときに）

---

## 7. 確かめの結果（テスト）

2026-10-29、この報告を書く前に流した（どれも 1 回で通った）。

| 製品 | コマンド | 結果 |
|---|---|---|
| FLIGHT LAB | `npm run -s test:fast` | 80 / 80 pass・fail 0 |
| TEXTBOOK | `npm test` | 22 / 22 pass・fail 0 |
| CADET | `npm run -s test:fast` | 245 / 245 pass・fail 0 |

ブラウザのテストは統合役の全体の実行に任せた。作業ツリーの `cadet/outputs/CADET.html`・`flight-lab/outputs/FLIGHT-LAB.html` の変更は、作業を始める前からあったもの（テストを流すと作り直される出力。コミットは W12）。

---

## 8. 台帳（触っていない。署名の提案）

この単位は報告だけを持つので、台帳のファイルとパッチは書いていない。安全レビューとして確かめた結果を、W12 の署名（`checkedBy`）に使えるように、行ごとに書く。統合役が `reports/W12.ledger.json`（または統合のパッチ）に `{ id, checkedBy, note }` で入れてほしい（`ledgers/README.md` の「確かめ役の署名」）。

**署名してよい行**（文は正しい。note に「safety-R1 で一次資料と照らした（2026-10-29）」と残りの should を書く）：

| 行 | 確かめた所 | note に足すこと |
|---|---|---|
| ERRATA `T.aero.T-3` | `aero.stall`（AFH p.5-15〜5-16） | — |
| ERRATA `SYNC.stall-recovery` | a7・a8 のブリーフ、`stallRecovery` の `say`・`g`、CADET の台詞 | 順番は合格。a7 の目標と 300 ft の採点は 4 の⑤ should 1（所有者の判断へ）。`places` の `ops.slow` → `ops.stall` |
| RULINGS `R.stall-recovery` | `aero.stall` | — |
| ERRATA `T.weather.T2`・RULINGS `R.microburst` | `wx.shear`（AWH 22.7.3・22.7.3.1・22.7.3.3） | 4 の④ should 1・2 |
| ERRATA `T.instruments.E-T2`・RULINGS `R.cross-check` | `sys.compass`・`sys.g1000`・`ifr.instr` | — |
| RULINGS `R.alcohol` | `hf.self` の囲み（第 70 条・通達 国空航第 2278 号） | 4 の⑥ should |
| RULINGS `R.vfr-fuel-law` | `law.rules`・`perf.fuel` の囲み（第 63 条・施行規則第 153 条ほか） | 4 の⑦ should |

**開いたままの行への覚え書き**（閉じるのは別の単位。note だけ）：

| 行 | 覚え書き |
|---|---|
| RULINGS `R.failed-engine-id` | 教科書の側（`me.oei`）は安全レビューで合格。行は基礎教材の側（W31）が閉じる |
| RULINGS `R.fuel-reserve` | `nav.log` の囲みは合格。基礎教材の解答（W18・W23）が残る |
| ERRATA `K.wb-perf.K4`・`K.navigation.K1`・`K.human.K5`・`K.ifr.K-2`・`K.multi.K-1` | 原本の重ね表示（`fuel-vfr`・`alcohol`・`circling-lost-visual`・`engine-id`）は安全レビューで合格。合本の文は各単位 |
| RULINGS `R.vfr-into-imc` | 4 の③ must。R1 のつなぎを入れるなら `hf.body` で（本番は W28 の `emg.imc`） |
| RULINGS `R.circling-lost-visual` | R1 は 4 の② should のつなぎだけ（本番は W30 の `ifr.circle`） |
| ERRATA `SYNC.e3-glide-entry` | 5 の 1。一次資料は AFH 第 9 章 p.9-28（第 18 章ではない）。R1 で直すことを勧める |
| ERRATA `SYNC.i2-upset` | 5 の 2。R1 で直すことを勧める |

---

## 9. 未解決

1. **③は R1 では基準 7 を満たさない**（must）。直すまで「命に関わる 7 項目」は R1 で 5 つ（①④⑤⑥⑦）が合格、②は R1 に節がなく、③は不合格。
2. **失速の課目の採点**（300 ft）：AC 120-109A と合わない。安全レビューの勧めは「参考の行にする」。DESIGN 10.5 が「変えない」としているので所有者が決める（DECISIONS.md に 1 行）。
3. ④の「失速警報まで」の言い方：小型機向けの一次資料を見つけていない（AC 00-54 は輸送機）。書き手が POH・AFH で確かめる。
4. CADET の IMSAFE の掲示（Eating）は CADET の持ち主の判断（AIM に合わせるか）。

---

## 10. ほかの単位にお願いすること（needs from others）

| # | 誰に | ファイル | 直すこと | 重さ |
|---|---|---|---|---|
| 1 | 統合役（R1 のつなぎ。本番は W28） | `flight-lab/src/book-2.js` `hf.body` の「ここが大切」の 3 つめ（と本文に 2〜3 文） | 4 の③の案：翼を水平 → 地形から離れる（要れば 1 目盛りで上昇）→ 来た方が確実に晴れていて地形が許せば 10° 以下のバンクで 180° → 管制に助けを求める（AFH 第 18 章）。CADET の本も同じ文になる | must |
| 2 | 所有者（判断）→ W07d の 2 回目か統合役 | `flight-lab/src/syllabus.js` a7 の `goal`（148 行）、`stallRecovery` の `result`、a7・a8 の `std`、`flight-lab/test/flight.test.mjs` の採点の行、`TEST-CONSTANTS.md` | a7 の目標を「迎え角を先に減らして確実に回復する」に。300 ft の行を参考の行に（変えないなら `std` と `aero.stall`・`ops.stall` の `bk.sim` に「教材の基準・ACS にない・迎え角が先」）。CADET の教官の台詞と確認の問いが一緒に変わるので CADET の content のテストも流す | should |
| 3 | FLIGHT LAB の画面の持ち主（W49）・CADET の持ち主 | `flight-lab/src/app.js` 126 行、`cadet/src/flight/controls.js` 115 行 | 「失速の回復で一気に出力を出す」を外し、「（失速の回復では、迎え角を減らしてから必要なだけ）」に | should |
| 4 | 第 2 部の本文の持ち主（W28。R1 なら統合役） | `flight-lab/src/book-3.js` `ops.stall`（177 行） | 省いた 2 段階（最初に自動操縦を切る・スピードブレーキを戻す）の名前を 1 句で | should |
| 5 | 第 1 部の本文の持ち主（W17。R1 なら統合役） | `flight-lab/src/book-2.js` `wx.shear`（75 行） | 機首を保つのは失速警報が鳴らない範囲で、警報が鳴ったら迎え角が先（→ 失速とスピン）。前半の出典は 4 の④ | should |
| 6 | 第 4 部の本文の持ち主（W30。R1 なら統合役） | `flight-lab/src/book-4.js` `ifr.np` の進入復行の段落 | 周回で目視を失ったときは着陸する滑走路へ向かって上昇旋回（米国の AIM 5-4-21）の 1 文 | should |
| 7 | W20（R1 なら統合役） | `flight-lab/src/book-2.js` `hf.self` の考えてみよう（284 行） | 答えを「この朝は飛ばない」と言い切る（4 の⑥） | should |
| 8 | W06 | `flight-lab/src/book-jur.js` `fuel.vfr`（125 行）の日本の欄 | 「訓練では学校の規程の量に従う」を足す（原本の重ね表示と同じ言い方）。囲みの文を変えると `jur.test.mjs` の値の照合も見る | should |
| 9 | W07d の 2 回目（課目）・CADET の content のテスト | `flight-lab/src/syllabus.js` e3 の `say`（228 行）、i2 の `brief`・`g`（325 行あたり） | 5 の 1・2。台帳 `SYNC.e3-glide-entry` の一次資料を AFH p.9-28 に | should |
| 10 | テストの持ち主・統合役 | `flight-lab/test/flight.test.mjs` か `textbook/test/content.test.mjs` | 6 章の ④・①・⑦ の文のテスト | should |
| 11 | 統合役 | `ledgers/` のパッチ | 8 章の署名と覚え書き。`SYNC.stall-recovery` の `places` の `ops.slow` → `ops.stall` | — |
| 12 | W24・W46 の前に | `flight-lab/src/book-2.js` `law.rules` の「ここが大切」 | 「米国の VFR の燃料（91.151）」と国を書く | nit |
| 13 | CADET の持ち主 | `cadet/src/content/academy-spec.js` の IMSAFE とコーヒーの掲示、`school.js` 214 行・`main.js` 727 行 | E を Emotion（AIM 8-1-1）に。予備 30 分に「米国の規則」 | nit |
