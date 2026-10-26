# 食い違いのメモ（NOTES）

書き直した教科書と、アプリのほかの部分（画面 `pages.js`・`app.js`、飛行モデル `physics.js`、学科テスト `quiz.js`、英語交信 `radio.js`、課目 `syllabus.js`・`school.js`、Sanford の資料 `sanford-course.js`、CADET）との食い違いを書きます。
この書き直しでは、教科書（`book-*.js`）以外は**直していません**。ここに書いたものは、それぞれの担当の人が判断して直すためのメモです。
また、事実の確認で指摘されたのに直さなかったものは、その理由もここに書きます。

## 1. 書き直した章ごとの食い違い（書き直しのときに確かめたもの）

### 第 1 章 `intro`

- `syllabus.js`（課目 c1「ソロ前の審査」）の教科書のリンクが `intro.course` になっています。審査の中身は `solo.check` にあります。教科書の `intro.course` から `solo.check` へのリンクを足しました（`syllabus.js` は変えていません）。
- 教科書は飛行中の目標のゲージを「緑＝余裕あり、黄＝基準ぎりぎり、赤＝基準外」と書きました（`app.js` の色分けのとおり）。画面の右上の「操作の状態」は、画面の幅が 1000 px 以下では表示されません（`style.css`）。教科書には「大きい画面のとき」と書きました。

### 第 2 章 `aero`

- **最良滑空速度**：教科書・学科テスト・課目 e3／e4 は、チェックリスト（POH）の 76 KIAS を最良滑空速度としています。飛行モデル（`physics.js`）では、風車状態のプロペラの抗力を入れると、約 61〜66 KIAS のほうが少し遠くまで滑空します（76 KIAS は約 4% 短い）。課目 e3 の「76 kt を保つ（速すぎても遅すぎても届かない）」は、シミュレータの中では厳密には当てはまりません。教科書は「76 KIAS は POH の値」と書き、モデルの最良滑空が 76 だとは書いていません。
- **失速からの回復の順番**：課目 a7／a8 の説明（`syllabus.js`）と `ops.slow` は「フルパワー → 翼を水平」の順です。教科書（第 2 章）は AFH の回復の型（押す → 翼を水平 → 出力は必要に応じて）にしました。
- **自動ラダー**：アプリは自動ラダーが初期設定で ON（`app.js`）なので、左偏向傾向と右ラダーは体験できません。教科書の「シミュレータで体験」の箱に、OFF にする方法を書きました。
- **地面効果**：飛行モデルの地面効果は PHAK の値より強く効きます（翼幅の 1/4 で誘導抗力 −50%、PHAK は −23.5%）。教科書は数字を書かず「低いほど強く効く」とだけ書きました。
- **スピンからの回復の順番**：公開されている訓練校のチェックリスト（MGSU 2025）は「スロットル → 操縦輪を前 → エルロン中立 → ラダー」、Archer III の POH は「ラダー → 操縦輪を前（エルロン中立）→ スロットル」です。教科書は POH の順番を書き、POH では意図的なスピンが禁止であることも書きました。
- **チェックリストの Va**：MGSU のチェックリストは 1,917 lb の Va を 89 KIAS としていますが、POH は 98 KIAS です（教科書では使っていません）。

### 第 3 章 `sys`

- **燃料タンク**：飛行モデル（`physics.js`）は左右のタンクから同じだけ燃料を減らします（BOTH と同じ）。教科書は実機どおり「LEFT・RIGHT・OFF から選ぶ。BOTH はない。切り替える前に電動燃料ポンプを ON」と書き、シミュレータでは切り替えられないことを小さな注と章末の注意に書きました。
- **ミクスチャー・キャブレターヒート・タンクの切り替え**：アプリでは操作できません（`school.js` のチェックリストは「教材では未実装」、`pages.js` の「できないこと」）。教科書はそのことを小さな注に書きました。油圧・電流計も MFD では「—」表示です。
- **燃料の消費**：飛行モデルは 3,000 ft・110 KIAS で約 11.5 gal/h（MFD の FFLOW も同じ）。Archer III の POH は 65% 出力で 9.5 gal/h、75% で 11.0 gal/h です。第 3 章では数字を使わず、第 4 章で「教材値」と「POH の値」を書き分けます。
- **磁気偏差**：アプリと教科書の LAB 空域は 6°W（教材値）です。NOAA のモデルでは、2026 年のオーランド付近は約 7.0°W です。教科書は「フロリダ中部は約 7°W、教材の LAB では 6°W を使う」と書きました。
- **マグネトーとスイッチ**：CADET のチェックリスト（`cadet/src/content/checklists-archer.js`）はキー式のマグネトーとマスタースイッチ 1 つです。公開されている Archer III の POH（G1000）は、天井のパネルに左右のマグネトーのスイッチとスターター、BATT MASTER と ALTR があります。教科書は POH の配置を図にし、「年式や装備で違う」と書きました。
- **予備計器**：POH の機体は PFD の左に 1 つの画面の予備計器（Aspen）、公開チェックリストの機体には機械式の予備計器があります。教科書は「1 つの画面か、機械式の計器か」は機体で違うと書きました。

### 第 4 章 `perf`

- **最良上昇率の速度**：教科書はチェックリスト（POH）の Vy 76 KIAS を使い、上昇率の表は「教材モデル・全開・Vy」の値と書きました。飛行モデルでは、海面付近の上昇率が最も大きいのは約 84 KIAS（約 798 fpm。76 KIAS では約 781 fpm）です。最良上昇角は約 62〜64 KIAS で、Vx 64 と合います。
- **燃料流量**：飛行モデルは 3,000 ft・110 KIAS で約 11.5 gal/h（MFD の表示も同じ）。Archer III の POH は 65% 出力で 9.5 gal/h、75% で 11.0 gal/h です。教科書は両方を書き、どちらの値かを書き分けました。燃料の計算機の既定値 9.5 gal/h は POH の 65% の値です。
- **重さと大気**：飛行モデルの Archer は重さ 1,050 kg（約 2,315 lb）で一定、標準大気で飛びます（暑い日の性能の低下や積み方の違いは体験できない）。教科書は、上昇率などの数字にこの条件を書き、小さな注と章末の注意に書きました。
- **重量重心の計算機**：計算機の表示の「教材用近似」は、アームと許容範囲が Archer III の POH と同じ値なので、「許容範囲は POH の値。空虚重量は例」に直しました（`book-figs.js` の計算機の文言だけ。計算機の名前と使い方は変えていません）。
- **CADET**：CADET では飛行モデルが空島のものに替わるので、教科書の中で飛行モデルから計算している数字（上昇率・燃料流量）は CADET の表示では変わります。教科書はどれも表示のときに計算しています。

### 第 5 章 `wx`

- **突風の日の進入速度**：課目 r1（`syllabus.js`）は進入速度に 4 kt を足して着陸します（`AR.appr + 4`）。教科書は AFH の「突風分の半分を足す」と、09012G20KT で 4 kt を足す例を書いたので、課目と合いました。
- **学科テスト（`quiz.js`）**：雷雨の一生（積雲期・成熟期・消散期）とマイクロバーストの続く時間（AIM：15 分を超えることはまれ）を聞く問題があります。教科書には AWH の「一生は約 30 分」「マイクロバーストは 5〜15 分」を書きました。食い違いはありません。
- **シミュレータの天気**：アプリは雲・視程の変化・ウインドシアを再現しません（`pages.js` の「できないこと」）。教科書は、シミュレータで天気を体験できるとは書いていません。
- **METAR・TAF の例**：例は実在の空港の記号（KSFB）を使った架空の値です（「架空の例」と図と章末の注意に書きました）。アプリの LAB の ATIS（`radio.js`）とは別の例です。

### 第 6 章 `law`

- **学科テスト（`quiz.js` の q_law）**：91.155・Class C と D の入り方・装備・速度・最低安全高度・正面と追い越し・61.89 の問題は、書き直した本文と合っています。優先の順（2025 年の改正：曳航・給油中の機が飛行船より優先）を聞く問題はありません。
- **英語交信（`radio.js` の r_standby など）**：Class C の「（コールサイン）, stand by」で交信が確立する説明は、本文（AIM 3-2-4）と同じです。
- **LAB 空域**：アプリの LAB 空域・R-LAB1 などの名前は架空です（本文にも書きました）。図の特別な空域も架空の配置です。
- **管制塔のある空港の決まり**：書き直す前の本文は Class D の空港の交信を 91.126(d)（Class G の空港の決まり）としていました。本文は 91.129(c) に直しました。

### 第 7 章 `radio1`

- **エンジンをかけるのと Ground を呼ぶ順（`radio.js` の練習の場面）**：AIM 4-3-14 は、出発する機はエンジンをかける前に Ground（または Clearance Delivery）を呼ぶよう勧めています。アプリの練習の場面は、エンジンをかけてから Ground を呼びます。本文は AIM の勧めを書きました。
- **オーディオパネルの表示（`avionics.js`）**：アプリは送信の無線機を「MIC COM1」と表示します。図は G1000 型の表示に近い「COM1 MIC」と書きました。どちらも、どの無線機で話すかの選択です。
- **Ground から Tower への切り替え（`radio.js` の twr1）**：アプリは、準備ができたら自分で Tower に変えます（AIM 4-3-14）。本文の図も同じに直しました。

### 第 8 章 `radio2`

- **交通情報の時計の方位（`radio.js` の 101・197・341 行あたりの説明）**：アプリの説明は「時計の方位は機首が 12 時（AIM 4-1-15）」です。AIM 4-1-15 は、レーダーには航跡しか見えないので、進んでいる方向（航跡）を 12 時としています。本文は AIM に合わせました。アプリの説明の直しが必要です。
- **周波数の練習（`radio.js` の練習問題）**：135.275 を「one three five point two seven five」と言うのを正解にしています。JO 7110.65 2-4-17 は、管制官は小数点以下の 3 けた目を言わない（point two seven）と決めています。本文は管制官の言い方を説明しています。
- **Alfa と Alpha（`radio.js` のコールサイン）**：アプリのコールサインは Alpha とつづります。AIM の表（TBL 4-2-7）は Alfa、AIM 4-2-4 の例文は Alpha です。本文はアプリに合わせて Alpha と書き、図の説明にこのことを書きました。
- **Words twice（`radio.js` の用語）**：アプリは「各語を 2 回」、PCG と本文は「各句（phrase）を 2 回」です。
- **風の言い方（`radio.js` の SAY.wind）**：方位を 10° 単位に丸めず、突風の言い方もありません。いまの練習問題は 10° 単位の風だけで突風もないので、表示に誤りは出ません。
- **N7LA**：練習用のコールサイン Archer Seven Lima Alpha（N7LA）は架空の機体として使っていますが、FAA の登録では N7LA は予約済みの登録記号です（2026 年 10 月の確認）。本文に「同じ登録記号の実在の機とは関係ありません」と書きました。

### 第 9 章 `radio3`

- **読み返しの順の出典（`radio.js` の gnd1 の注）**：「言われた順に、コールサインを付けて復唱する（AIM 4-4-7）」の、言われた順は AIM 4-4-7 では空中の高度・針路の決まりです。地上の復唱は AIM 4-3-18 です。本文は地上の復唱に AIM 4-3-18 を書きました。
- **出発の周波数を省くこと（`radio.js` の twr1 の注）**：「管制官は、パイロットが知っている周波数を省くことがある（AIM 4-3-14）」。AIM 4-3-14 は Ground と Tower の周波数の話で、前に伝えた出発の周波数を省いてよいのは JO 7110.65 2-1-17 です。
- **進入管制を呼ぶ距離（`radio.js` の app の注）**：「到着の最初の呼び出しは 15 マイルほど手前で（AIM 4-3-2）」。AIM 4-3-2 の 15 マイルは管制塔への呼び出しです。Class C では、境界より十分手前で呼びます（AIM 3-2-4）。
- **line up and wait の練習の場面（`radio.js` の 185〜186 行あたり）**：待たされたときの言い方が AIM 5-2-5 の “holding in position runway …” ではありません。「90 秒」は JO 7110.65 3-9-4 の「ほかの指示なしに」が抜けています。

### 第 10 章 `radio4`

本文の台本は `radio.js` の FLIGHT と同じ言葉にしましたが、FAA の決まりに合わせるため、次の 6 か所だけ変えました。アプリの台本も直すとよいところです。

- **出発の ATIS の雲（`radio.js` の atis）**：“Few clouds at three thousand five hundred”（FEW035）は、巡航の 3,500 ft と同じ高さで、雲の下 500 ft（14 CFR 91.155）を守れません。本文は “Few clouds at five thousand”（FEW050）にしました。CADET の ATIS（`cadet/src/content/dialog/atc.js`）も FEW035 です。
- **帰りの ATIS の時刻（`radio.js` の app）**：information Bravo が 1453Z なら、1 時間ごとの観測で新しくなる次の Charlie は 1553Z です（1653Z なら Delta になる。AIM 4-1-13）。本文は 1553Z にしました。
- **帰りの高度（`radio.js` の app）**：南西向きで 3,500 ft（地上 3,000 ft を超える）は、14 CFR 91.159（偶数千 ft＋500 ft）に合いません。本文は 2,500 ft にしました。
- **到着の呼び出しのコード（`radio.js` の app）**：AIM 3-2-4 は、Class C への到着の呼び出しにコードを入れるとしています。本文は “squawking one two zero zero” を入れました。
- **student pilot（`radio.js` の twr1・dep・twr2・gnd2）**：AIM 4-2-4 は、各局への最初の呼び出しで名乗るよう勧めています。本文は Tower・Departure・Approach・帰りの Ground の最初の呼び出しにも入れました。
- **時計の方位**：第 8 章に書いたとおり、本文は航跡を 12 時にしました（AIM 4-1-15）。

そのほか：

- **LAB の駐機場の位置**：台本は “west ramp”（西のエプロン）ですが、シミュレータの地面（`physics.js` の PAVED）では、誘導路と駐機場は滑走路 36 の東側にあり、“turn right at Charlie” も東へ出ます。本文は地上の配置の図を描かず、滑走路を横切るときは許可が要ることだけを書きました。
- **ATIS の周波数**：本文の LAB ATIS 127.65 は、CADET の `atc.js` の FREQ（架空）に合わせました。`radio.js` には ATIS の周波数がありません。Approach の周波数は、どちらにもないので本文でも決めていません。
- **line up and wait で長く待つ場面（`radio.js` の r_luawlong）**：「90 秒」に JO 7110.65 3-9-4 の「ほかの指示なしに」が抜けています。

### 第 11 章 `radio5`

- **無線の故障の場面（`radio.js` の r_nordo）**：理由に「14 CFR 91.185（AIM 6-4）：VFR の天気なら…できるだけ早く着陸」とあります。91.185 は IFR の規則で、“as soon as practicable” は「すぐに」ではありません（AIM 6-4-1）。本文は「IFR の規則と同じ考え方」「無理のない範囲で早めに」と書きました。
- **PAN-PAN の場面（`radio.js` の r_panpan）**：AIM 6-3-2 の要素のうち、最後にわかった位置の時刻・残りの燃料（分）・人数がありません。また南西向きで 3,500 ft です（14 CFR 91.159）。本文の例は 2,500 ft にし、時刻・燃料・人数を足しました。
- **遭難の通報の順（`school.js` の課目 e3 の mayday）**：位置を意図より先に言う順で、出典を AIM 6-3-1 としています。AIM 6-3-2 の順（意図と要求 → 位置）と違います。
- **Sanford の模式図（`sanford-course.js` の diagramSvg と RUNWAYS）**：FAA の空港データの滑走路端の位置と合いません。9R/27L が 18/36 の西に描かれている（実際は東）、9C/27C の東の端が 18/36 から約 1.3 km 離れている（実際は 18/36 の上で終わる）、HS1 の円が滑走路 18 から約 1 km 離れている、滑走路の向きが 084°/174°（実際は真方位 090°/180°）。本文の図 `sfbLayout` は、データの座標から描きました。本文の「シミュレータで体験」の箱では、この模式図を案内しないようにしました。

### 第 12 章 `hf`

- **学科テスト（`quiz.js` の q_hf）**：10 問とも、書き直した本文で答えられます（IMSAFE・PAVE・危険な態度・リーンズ・体性重力錯覚・細い滑走路・一酸化炭素の貧血性低酸素・91.211 の 14,000 ft・夜は少し横を見る・DECIDE）。まちがった答えはありません。IMSAFE の E の説明の「Eating とする資料もある」は FAA の言い方ではありませんが、問題の正解には関係しません。
- **TEM の図**：書き直す前は、この章にも `FIG.tem` がありました。同じ図が第 25 章 `crm` にあるので、この章からは外して参照にしました（図の数は 1 つ減ります）。

### 第 13 章 `ground`

- **食い違いはありません**：離陸ブリーフィングの 60・76 kt（`physics.js` の pa28：60・76 kt）は、訓練校のチェックリストと同じです。CADET の Archer のチェックリスト（`cadet/src/content/checklists-archer.js`）にある「油圧は 30 秒以内に上がる」は、本文にも書きました（AFH 第 2 章）。
- **シミュレータの範囲**：外部点検・始動・タキシー・ランナップは、シミュレータの課目にはありません（課目は滑走路の上か空中から始まる）。本文の章末の注意に書いています。

### 第 14 章 `ops`

- **失速からの回復の順番**（第 2 章と同じ）：課目 a7・a8 の説明と `syllabus.js` の失速の回復の手順は「機首を下げる → 全開 → 翼を水平」の順です。本文と図 `stallRecovery` は AFH 第 5 章の型（迎え角を減らす → 翼を水平 → 出力を必要なだけ → 元の経路へ）にしました。
- **パワーオフ失速の入り方**：課目 a7 は、アイドルにして高度を保ったまま機首を上げて失速させます。自家用 ACS（PA.VII.B）と AFH 第 5 章は、進入の速度・アイドルの安定した降下から機首を上げます。本文は ACS のとおりです。
- **直線水平飛行の目の使い方**：課目 a2 の説明は「外 8 割・計器 2 割」です。AFH 第 3 章は、外が約 9 割・中は 1 割まで。本文は AFH のとおりです。
- **直線水平飛行の基準**：課目 a2 の基準は「±100 ft・±10°・±10 kt（自家用 ACS の許容幅を参考）」です。ACS の直線水平飛行は、計器だけで飛ぶ課目にしかなく、±200 ft・±20°・±10 kt です。本文の表は、ACS の値とこの教材の値を分けて書きました。
- **課目から本文へのリンク**：課目 a4・a5（`aero.turn`）と a7・a8（`aero.stall`）は、この章の `ops.turns` と新しい `ops.stall` にリンクしていません。本文からは、この章の箱で a4〜a8 を開けます。
- **スロットルの %**：本文の表と図 `attitudePower` の % は、フライトモデルのスロットルの開き（`steadyState` の thr）で、エンジンの出力の % ではありません。本文と図の説明にそう書きました。
- **学科テスト（`quiz.js` の q_ops）**：10 問のうち、問 1〜3 はこの章で、問 4〜10 は離着陸の問題で第 15 章 `tl` で答えられます（リンクは `ops.trim` だけ）。答えはすべて正しいです。
- **対地目標操作**：シミュレータに対地目標操作の課目はありません。本文の `ops.ground` には「シミュレータで体験」の箱を置いていません。

### 第 15 章 `tl`

- **ダウンウインドの距離**：課目 t2 の説明と `school.js`（cross −1600 m）は「滑走路から約 1.6 km」です。AFH 第 8 章は「約 1/2〜1 マイル」。1.6 km は約 1 SM（約 0.86 NM）で、AFH の範囲に入ります。書き直す前の本文の「約 1.6 km（1 NM）」は換算の誤りだったので、本文と図 `pattern` は「約 1/2〜1 マイル（この教材 約 1.6 km）」にしました。
- **短距離離陸**：課目 x3 は、フラップ UP のまま 60 kt（`AR.rotate`）で浮揚します（`takeoffRoll(AR.rotate)`、`v.toFlaps` 0）。訓練校のチェックリストは、フラップ 25°・55 kt でローテーションです。本文は両方を書き、違いを「シミュレータで体験」の箱に書きました。課目 x3 の基準「Vx 64 +5/−5 kt」は、ACS の ＋10／−5 kt より狭い（教材の値）。
- **短距離着陸の接地の範囲**：課目 x2 の説明は「目標点の手前 0〜先 60 m」、基準は「目標点 ±60 m」で、課目の中で食い違っています。ACS は「指定点の上か、その先 200 ft 以内」（手前は不可）。本文は課目の基準（±60 m）と ACS を並べて書き、違いを書きました。
- **ゴーアラウンドのフラップのキー**：課目 t4 の説明は「V を押して 1 段ずつ…この教材では一周して UP に戻るので注意」です。40° から V を押すと一度に UP になり、課目が戒めている「フラップを一度に上げる」操作になります。`app.js` では Shift+V で 1 段上げられますが、t4 の手順のキーの説明（KEYS.flaps）には Shift+V が出てきません。本文の箱には Shift+V を書きました。
- **着陸前の点検**：`school.js` の着陸前チェックリスト（before_landing）には、公開チェックリストの「電動燃料ポンプ ON」と「着陸灯 ON」がありません。課目 t2 にはチェックリストの手順がありません。本文の表は「訓練校のチェックリスト」の項目として書きました。
- **アビームの出力**：課目 t2 の「約 1,500 rpm」は、フライトモデルでは 80 kt・フラップ 10° で約 −600 fpm になります（課目の目標は −500 fpm、モデルでは約 1,660 rpm）。教材の目安なので本文はそのままにしました。
- **フレアの目の向け方**：課目 t3 の説明「滑走路の先を見ながら」は、遠くを見すぎると低いフレアになるという AFH 第 9 章の注意と合いません。本文は「前方の滑走路を下へ 10〜15°」にしました。
- **フレアの出力**：課目 t3 は「滑走路の端を越えたらアイドル」、AFH 第 9 章はフレアの間に出力をアイドルまで絞る書き方です。本文は両方を書きました。
- **書き直す前の本文の誤り**：降下の開始を「接地点の横」としていた（AFH 第 8 章・AIM 4-3-3 は進入端の真横）、クロスウインドへの旋回を滑走路の端ちょうどに描いていた（AIM 4-3-2：端を越えて、場周高度の 300 ft 下より上）、降下率の書き方（AFH：500 fpm を超えるなら 300 ft より前に減らす）。すべて直しました。

### 第 16 章 `emg`

- **最良滑空速度**（第 2 章と同じ）：課目 e3 の説明「76 kt（`AR.glide`）を保つ（速すぎても遅すぎても届かない）」に対して、フライトモデルでは 66 kt のほうがわずかに遠くまで届きます（1,000 ft ごとに 76 kt で約 1.4 NM、66 kt で約 1.5 NM）。本文の `emg.glide` は、チェックリストの値とモデルの値を分けて書きました。
- **正面 ±30°**：課目 e2 の「左右 30° 以内」は教材の目安です。AFH 第 18 章は「正面か、少し横」。本文は ±30° を教材の目安と書きました。
- **シミュレータの範囲**：火災・煙・電気系統の故障・ドアが開く異常は、シミュレータにありません（エンジン停止と計器の故障だけ）。本文の章末の注意に書いています。
- **巡航中のエンジン故障**：課目 e3 は 100 kt の巡航から始まり、説明は「機首を下げて 76 kt」です。AFH は、最良滑空速度より速いときは高度を保って減速してから機首を下げる、としています。本文は AFH のとおりに書きました。
- **学科テスト（`quiz.js` の q_emg）**：電気火災の問題の解説が「できるだけ早く」です。チェックリストと本文は「無理のない範囲で早めに（as soon as practical）」です。
- **`school.js` の MAYDAY の説明**：要素の順番が AIM 6-3-2 と違い、出典が AIM 6-3-1 になっています（第 11 章のメモと同じ）。
- **書き直す前の本文の誤り**：ドアのラッチの順番（チェックリストは両方開いたら横 → 上）、91.3(b) の言い方（緊急に対応するのに必要な範囲で Part 91 から外れてよい）、エンジン火災で「電気を止める」（AFH：電気火災でなければマスターを切ると無線とトランスポンダーを失う）、滑空距離の例（教材のモデルでは 3,000 ft から無風で約 4.2 NM）。すべて直しました。

### 第 17 章 `solo`

- **課目 c1（ソロ前の審査・模擬）の中身**：c1 には急旋回（45°）が入っていますが、61.87(d) のソロ前の 15 項目に急旋回はありません。逆に、低速飛行・パワーオン失速・場周経路・ゴーアラウンドは c1 に入っていません。本文の表は「分野」と「この教材の課目」で書き、急旋回は書きませんでした。
- **課目 c1 の教科書のリンク**：c1 は `intro.course` にリンクしています（第 1 章のメモと同じ）。審査の中身は `solo.check` です。c1 の「1 項目でも基準外なら不合格」は、本文の「自分で気づいて直す」という考え方（ACS も、すぐに直さないことを不合格の例に挙げる）とは少し違います。
- **横風の訓練の時期**：課目 x1（横風着陸）は課程表でソロのあとの段階にありますが、61.87(d)(3) は、ソロの前に通常と横風の離着陸の訓練を求めています。
- **学科テスト**：`quiz.js` にはソロの問題の集まり（q_solo）がありません。61.89 の問題は q_law にあり、答えは正しいです。
- **第 12 章の SRM の訳**：書き直した第 12 章は SRM を「単独飛行の資源管理」と訳していました。SRM はソロ（単独飛行）のことではなく、1 人で操縦するとき（同乗者がいても）の資源管理なので、この章と同じ「1 人で操縦するときの資源管理」に直しました（第 17 章のコミットに含めた）。
- **後方乱気流**：61.87(d)(7) の後方乱気流（wake turbulence）を説明する節は、この本にはまだありません（第 5 章の気象・第 12 章の見張りにも出てきません）。

## 2. 事実の確認で指摘されたが、直さなかったもの

### 第 1 章 `intro`（指摘 9 件：誤り 0・不正確 1・軽微 8。すべて直しました）

- 直さなかったものはありません。

### 第 2 章 `aero`（指摘 15 件：誤り 1・不正確 3・軽微 11。すべて直しました）

- 直さなかったものはありません。

### 第 3 章 `sys`（指摘 9 件：誤り 0・不正確 4・軽微 5。すべて直しました）

- 直さなかったものはありません。主な直し：キャブレターヒートは「アイスが起きそうなとき、パワーを絞る前に」（POH。進入・着陸では兆候がない限り使わない）、タンクの切り替えの前に電動燃料ポンプを ON、スイッチの多くは天井のパネル（図を描き直し）、非常用バッテリーは予備計器・PFD・オーディオパネルに 30 分以上（図も直し）、AIM 4-3-24、IO-360 は新しい機体の選択肢、燃料噴射式でも取り入れ口の着氷はある、高度計の誤差は「規正値を直さないと」。

### 第 4 章 `perf`（指摘 6 件：誤り 1・不正確 1・軽微 4。5 件を直しました）

- **直さなかったもの**：教材モデルの最良上昇率の速度（約 84 KIAS）が Vy 76 と違うこと。アプリ（飛行モデル）の側の違いなので、上の「1. 第 4 章」に書きました。教科書の「Vy で上昇する」「遅すぎても速すぎても上昇は悪くなる」は実機について正しいので、そのままにしました。
- 直したもの：芝・柔らかい地面での着陸距離（POH の表は舗装・平ら・乾いた滑走路の値で、芝の影響は操縦士が見積もる）、AIM 7-6-8 の目安は「浮くまで」だけのものであること（図の説明も）、着陸距離 1,400 ft は 50 ft の高さからの距離であること、確認問題 4 の理由の出典の書き方、図 `climbVxVy` の説明。

### 第 5 章 `wx`（指摘 13 件：誤り 0・不正確 2・軽微 11。すべて直しました）

- 直さなかったものはありません。主な直し：マイクロバーストは雷雨から離れた空港にまで届くとは限らない（届くのは突風前線）、BKN012 4SM の問いの答えに雲の下 500 ft の条件を足した、フロリダの時刻は「フロリダ中部」と書いた、NEXRAD の画像は表示の時刻よりさらに 15〜20 分古いことがある、高度計規正値は海面の高さに直した気圧、安定・不安定の表を PHAK と AWH に合わせた、乱層雲は中層の雲、霧は「厚くなる」、前線の霧はおもに温暖前線の前、TAF の図の日付の位置、Archer の値の出どころ、METAR の並びに「天気」を足した。

### 第 6 章 `law`（指摘 12 件：誤り 0・不正確 2・軽微 10。すべて直しました）

- 直さなかったものはありません。主な直し：優先の図の①で、自分の機が相手の後ろ（尾の側）を通るように描き直した、Class E・G の行と 30 NM の範囲にトランスポンダーと ADS-B Out の決まりを足した、14,500 ft MSL からの Class E の例外、Class B の許可の言い方（cleared to enter Bravo airspace など）、確認問題 1 の出典（AIM 3-2-3）、91.411 の文言、耐空証明の掲示の場所、61.89 と 91.155 の比べ方、空域の図の目盛り（MSL と空港の標高からの高さ）、優先の図の着陸の注、TFR の凡例、学生操縦士の制限の全部（外国への飛行など）。

### 第 7 章 `radio1`（指摘 10 件：誤り 1・不正確 2・軽微 7）

- 直さなかったもの：G1000 型の COM の窓で、使用中と予備が左右どちらに出るか（確かめきれなかったため、図はアプリと同じく左が使用中）。「MIC を選ぶと、その無線機の受信も自動で入る」は、一次資料で確かめられなかったので書きませんでした。
- 主な直し：図の「切り替えるのは管制に言われてから」を直した（Ground → Tower は準備ができたら自分で変える。AIM 4-3-14）、CTAF と UNICOM を分けた（PCG）、管制官の指示の順（あなたのコールサイン → 局の名前 → 指示。JO 7110.65 2-4-8）と図の「相手」を「局の名前」に、Clearance Delivery の役割（ATC の許可。おもに IFR）、エンジンをかける前に Ground を呼ぶ（AIM 4-3-14）、2 機が同時に送信したときの聞こえ方、滑走路を出たあと（管制官から別の指示がなければ）、MIC の表示、管制官の Stand by は許可でも不許可でもない（PCG）、シャドーイングとパラレル・リーディングのちがい。

### 第 8 章 `radio2`（指摘 6 件：誤り 0・不正確 1・軽微 5）

- 直さなかったもの：管制官が空港の標高などを 1 けたずつ言うこと（JO 7110.65 2-4-17）は、初心者向けの本文では省きました。
- 主な直し：周波数の 3 けた目は「言わないことがある」ではなく「言わない決まり」（JO 7110.65 2-4-17）、calm の出典（JO 7110.65 2-6-3）、真方位のときの true（AIM 4-2-10）、Wilco「だけでなく」内容を復唱、「千・百」で言うのは高度と雲の高さ（AIM 4-2-8）、N7LA と実在の機。

### 第 9 章 `radio3`（指摘 5 件：誤り 0・不正確 1・軽微 4。すべて直しました）

- 直さなかったものはありません。主な直し：Wilco の例を、滑走路の入っていない指示（report two mile final）にした、管制官の最初の応答に局の名前を入れた、line up and wait と離陸の許可に交通情報を入れた（`radio.js` と同じ）、図の「hold short」を「滑走路の hold short」に、line up and wait で待つ問いに「遅れの知らせがないとき」を足した。
- あわせて、写真のクレジットに「縮小などの加工あり」を出すようにしました（CC BY・CC BY-SA は、変えたことを示す決まりがあるため。PHOTO-CREDITS.md にも書きました）。

### 第 10 章 `radio4`（指摘 9 件：誤り 0・不正確 0・軽微 9）

- 直さなかったもの：駐機場の位置（上の「1」に書いたとおり、台本とシミュレータの地面が合わないため、本文では配置を決めませんでした）。
- 主な直し：Class C の棚の下の高さを「空港の標高＋1,200 ft」に（AIM 3-2-4）、ATIS の考えてみようの答え（雲から横に 2,000 ft 離れれば飛べる）、帰りの Ground と場周の練習の最初の呼び出しに student pilot と位置、Approach への呼び出しの注（Class C の業務を頼むこと）、地上の復唱の注の出典（AIM 4-3-18 と 4-4-7）、LUAW の 90 秒に「ほかの指示なしに」、レーダーの写真の説明（二次レーダーは問い合わせて応答を受ける）。
- 台本を FAA に合わせて変えた 6 か所（雲・時刻・高度・コード・student pilot・時計の方位）は、確認したエージェントも正しいとしました。

### 第 11 章 `radio5`（指摘 11 件：誤り 0・不正確 2・軽微 9。すべて直しました）

- 直さなかったものはありません。主な直し：“as soon as practicable” を「できるだけ早く」から「無理のない範囲で早めに」に（AIM 6-4-1：すぐにという意味ではない）、確認問題 3 のまちがいの選択肢を `radio.js` と同じ「そのまま予定どおり 2 時間飛ぶ」に、PAN-PAN の例に最後にわかった位置の時刻、Sanford の滑走路の長さと場周の向きを本文に書いた、Sanford の箱の案内、表の見出し（AIM 4-1-9）、地上の夜の応え方（灯火を点滅）、受信機の故障の例に管制塔への送信、Hot spot と LAHSO の用語の説明、Lakeside が架空であること。

### 第 12 章 `hf`（指摘 8 件：誤り 0・不正確 1・軽微 7。すべて直しました）

- 直さなかったものはありません。主な直し：三半規管の図で、回り始めと止めたときの液と毛の向きを正しくした、低酸素の図の「動けなくなる」を「対処できなくなる」に（AIM 8-1-2）と図の説明（12,500 ft を超えて、14,000 ft までは乗員が 30 分を超える分）、空間識失調の定義（PHAK）、コリオリ錯覚は「違う軸のまわり」、暗順応は「20 分である程度」、用語の出典。

### 第 13 章 `ground`（指摘 8 件：誤り 0・不正確 1・軽微 7）

- 直さなかったもの：離陸ブリーフィングの「引き返さない」。AFH の例は、引き返せる高さを前もって決めておく形ですが、初めての訓練生には「引き返さない」と教えるほうが安全なので、そのままにしました。
- 主な直し：ブリーフィングに「まず機首を下げて安全な速度を保つ」と再始動の手順を足した（チェックリスト）、書類（掲示が要るのは耐空証明。91.203(b)）、左翼の下は「ピトー・静圧管」（速度計・高度計・昇降計）、支柱の数値は「出ているピストンの長さ」、始動時の火災は「スロットル OPEN」、停止線の決まりは「管制塔が運用している空港」（管制塔のない空港は安全を確かめて越える。AIM 2-3-5）、ランナップの表の順（計器 → キャブレターヒーター）、離陸前の項目（キャブレターヒーター OFF・ミクスチャー）。

### 第 14 章 `ops`（指摘 7 件：誤り 0・不正確 2・軽微 5。すべて直しました）

- 直さなかったものはありません。主な直し：スピンの囲み（Archer III の POH では意図的なスピンは禁止、回復は POH の手順が優先でラダーが先、第 2 章と同じ順番、スピンの定義に横滑りを入れた）、図 `stallRecovery` の ③（機首の上がりは操縦輪、左への向きはラダー）、表と図の「出力の %」を「スロットルの %」に（エンジンの出力の % ではない）、上昇の言い方（離陸のあとは Vy＝チェックリストの Normal Climb-Out、地上 1,000 ft から巡航上昇。AFH の normal climb は Vy より速い上昇）、低速飛行の目的の文（ふだんの進入の速度は、低速飛行の速度より十分に速い）、パワーオン失速の条件（離陸・出発の姿勢から機首を上げる）。

### 第 15 章 `tl`（指摘 15 件：誤り 0・不正確 3・軽微 12。すべて直しました）

- 直さなかったものはありません。主な直し：フレアの目の向け方（「ずっと先」をやめて、前方の滑走路を下へ 10〜15°。AFH 第 9 章）、最大実証横風成分（運用限界ではないが、AFH はこれを超える横風での着陸を「よくある間違い」に挙げている）、課目 x1 の箱の風（12 kt・60°、横風成分 約 10 kt）、ゴーアラウンドのフラップは「降下が止まってから」（AFH）、2 つの PAPI は白 1・赤 1、降下率は無風のとき、離陸の出力は「地形や障害物より少なくとも 500 ft」、line up and wait、左回りの規則に 91.127、チェックリストの項目と AFH・ACS の項目を分けた、スキッド、図の縮尺の注、アップウインドの定義の違い（AIM と AFH・AC 90-66C）。

### 第 16 章 `emg`（指摘 14 件：誤り 1・不正確 4・軽微 9。すべて直しました）

- 直さなかったものはありません。誤りの直し：不時着のときのトランスポンダー（交信中は今のコードのまま。交信できないときに 7700。AIM 6-3-2）。ほかの主な直し：「まず機首を下げる」は離陸直後など速度が遅いとき（速いときは高度を保って最良滑空速度まで減らしてから）、エンジン故障の表の「降りる場所を決める」はこの本の補足と書いた、油圧の低下に「不時着に備える」、計算機の例の標準旋回は 65 kt でバンク 約 10°、最良滑空の出典（AFH 第 3 章）、消火と通気口の順番（チェックリストと AFH の違い）、AFH の「ふつうは」「多くの場合」、離陸中止の理由に交通の競合、POWER OFF LANDING の「降りると決めたら」、図の ±30° は課目 e2 の目安・「エンジン停止」。

### 第 17 章 `solo`（指摘 16 件：誤り 0・不正確 2・軽微 14。すべて直しました）

- 直さなかったものはありません。主な直し：確認問題 3 の解説（上昇率は約 110 fpm・約 15% 増える）、Class B のソロ（その空域・空港での訓練と 90 日以内の承認、学生のソロの離着陸ができない空港がある。61.95・91.131(b)(2)）、医療証明に BasicMed の例外、15 項目の表の課目の範囲（a3 はまっすぐの上昇だけ、t2 はダウンウインドから、e1〜e3 はエンジンの故障だけ）と課目のない項目の章、ACS の言い方、上昇率の条件、「声に出す」の出典（PHAK 第 2 章）、野外飛行の 50 NM 以内のくり返しの例外（61.93(b)(2)）、25 NM の承認は訓練をした教官、90 日の例、用語「飛行機は 16 歳以上」、出典に PHAK・AFH を足した。

## 3. 書き直しの前の分析で見つかったもの（参考）

最初に全章を読んだときに見つかった、アプリ側の食い違いの候補です。章を書き直すときに確かめ直し、本当に食い違いが残るものを上の「1」に移します。

### 第 1 章 `intro`（分析で見つかったもの）

- book-1.js:55 — 「右上の操作の状態で自分の操作を確かめる」：画面幅 1000 px 以下では操作の状態（#ctl-strip）は表示されない（style.css:410-412）、設定「操作の状態：隠す」でも消える — アプリが正しい。本文に『大きい画面のとき』と書く。
- book-1.js:55 — 「左上の教官パネルの『指示・使うキー・目安』」：目安は精度レベル（school.js:28 guide:false）と「簡潔に」表示（app.js:365）では出ない。合否を決める目標のゲージ・連続保持のバー（app.js:366-381）が書かれていない — アプリが正しい。本文を補う。
- book-1.js:56 — 「講評の × の項目」：× は講評画面の折りたたみ「項目ごとの採点を見る」の中（index.html:150、pages.js:235 で閉じた状態で開く）— アプリが正しい。『「項目ごとの採点を見る」を開くと × の項目が見える』と書く。
- book-1.js:55 — 「課程表の課目を『導入 → 基礎 → 精度』の順に」：レベルは課程表の課目の説明（ブリーフィング）の右下で選ぶ（pages.js:183-184 #levelSeg）。順番自体は一致 — 本文に選ぶ場所を足す。
- book-1.js:58 — bk.sim「最初の課目『姿勢・出力・トリム』」：課程表の最初は第 0 段階の地上学科（PFD の読み方など）で、a1 は最初の『飛行』課目。bk.sim のボタンは飛行課目だけ動く（app.js:56 で steps のない課目は何もしない）— 本文を『最初の飛行課目』に。
- book-1.js:22 — 「『シミュレータで体験』のボタンで…すぐ始まる」：一致（pages.js:353、いま選んでいるレベルで開始）。「読んだ節には目次で ✓」：一致（pages.js:303・317、style.css:333）。「学科テスト（80% で合格）」：一致（pages.js:364・382）。
- syllabus.js:230 — 課目 c1（ソロ前の審査）の book が ['intro.course']。内容としては solo.check（book-3.js:250）が合う。syllabus は変えないので、intro.course に solo.check への bk.see を置く。

### 第 2 章 `aero`（分析で見つかったもの）

- syllabus.js:143（a7 のブリーフ）— 回復「①機首を下げて迎え角を減らす ②フルパワー ③翼を水平 ④上昇」— 本の aero.stall・ops.slow と AFH 3C（迎え角 → 翼を水平 → 出力は必要に応じて → 戻す）が正しい。
- syllabus.js:151（a8 のブリーフ）— 「迎え角を減らす → 出力（すでに全開）→ 翼水平 → 上昇」— 同上、AFH の順番（翼を水平が先）が正しい。
- syllabus.js:206・217（e3・e4 のブリーフ）— 「76 kt を保つ（速すぎても遅すぎても届かない）」— 実機（チェックリスト）としては正しいが、教材モデルの最良滑空はエンジン停止で約 64〜68 KIAS（76 kt は約 4% 短い）。本はモデルの最良滑空＝76 と書かないこと（モデルの調整はこの書き直しの範囲外）。
- book-figs.js FIG.vn() — Va を v.s1 × √3.8（約 97）で描き、表の v.va 113 と矛盾 — v.va（チェックリスト・TCDS）が正しい。
- book-figs.js FIG.dragCurve() のキャプション — 風車プロペラで 76 kt を説明 — 物理的に逆。physics.js:500 の風車抗力はむしろ最良滑空を下げる。
- physics.js:222 — 地面効果 ge＝16h²/(1+16h²) が PHAK（1/4 翼幅で −23.5%）の約 2 倍強い — 本に % を書くときは PHAK の値と明記し、モデルと同じと言わない。
- physics.js:89 — FLAP_DEG [0,10,20,30] とラベル UP/10°/25°/40°（TCDS も 10/25/40）— 表示ラベルが正しい。本の図はラベルの角度を使う。
- physics.js:108 のコメント — Vno 125／Vne 154 を teaching values としているが TCDS 2A13 の 121／148 KCAS（POH KIAS 125／154）と一致 — 本では出典つきの値として書ける。
- book-3.js:91 ops.slow — 回復「③出力を全開」、book-3.js:92「FAA の覚え方は PARE」— AFH 3C は「出力は必要に応じて」、スピンは Figure 5-17 の 6 段階（PARE は AFH にない）。aero.stall とそろえる。
- book-1.js aero.left のキー（HEAD 125 行／作業ツリー 173 行）「自動ラダー（U）を OFF にすると」— app.js:33 PREFS0.autoRud は初期値 true、app.js:100 KeyU、ui.js・pages.js:429 とも一致。キーは正しいが「初期設定は ON」を書き、キーは bk.sim の中へ。
- book-1.js aero.ge のフラップ表（HEAD 132 行／作業ツリー 179 行）「アビーム 10°・ベース 25°」は syllabus.js:169（a10 のブリーフ）・book-3.js:131・FIG.pattern と一致 — 見出しを「チェックリスト」から「この教材の場周手順（{ch:tl}）」へ直せばよい。

### 第 3 章 `sys`（分析で見つかったもの）

- Line numbers: book-1.js@HEAD:N means commit e1995d7. The sys text in the working tree is the same (same md5), but it sits 46–47 lines lower, because the intro chapter is being rewritten (sys starts at line 197 instead of 150). book-3.js, book-4.js, physics.js, app.js, quiz.js, syllabus.js and pages.js line numbers are from the current working tree, which matches HEAD for those files.
- flight-lab/src/book-1.js@HEAD:192（sys.g1000 の bk.sim）— 説明は「G1000 型 PFD の各部を 1 つずつ説明するチュートリアル」なのに、ボタンは i3（部分パネル・AHRS 故障）を始める。チュートリアルは課目 k1（syllabus.js:87、tutor:'g1000'）で、app.startLesson（app.js:56）は手順のない課目を開かないので、data-lesson='k1' のボタンにはできない — アプリが正しい。本文を「AHRS が故障した中で予備計器で飛ぶ」に直し、チュートリアルは課程表の「G1000 型 PFD の読み方」と文で案内する
- flight-lab/src/physics.js:624 — 燃料は左右のタンクから半分ずつ減る（BOTH と同じ）。book-1.js@HEAD:170 の「BOTH の位置はない」「時間を決めて切り替える」と、sys.fuel の bk.sim「左右の量を見ながら」と合わない — 本文（実機）が正しい。アプリは簡略化なので、本文にそう書く
- flight-lab/src/book-1.js@HEAD:156（sys.ctl の表）— 「操縦輪を前後 | W / S」。app.js の KEYMAP では S＝機首上げ（引く）、W＝機首下げ（押す）、矢印キーも同じ。フラップ V・Shift+V、ブレーキ B / Space、トリムのリセット Shift+T が書かれていない — アプリが正しい。キーは向きをつけて bk.sim に書く
- flight-lab/src/book-1.js@HEAD:175（sys.fuel の bk.sim、課目 a2）— 章の lessons（book-1.js@HEAD:214）は ['a1','i3'] で a2 がない — a2 を足すか、ボタンを a1 にする
- flight-lab/src/book-1.js@HEAD:237（perf.climb「巡航で 1 時間に 8〜10 US gal」）↔ physics.js:622（3,000 ft・110 KIAS で約 11.5 gal/h。MFD の FFLOW もこの値）— 本文で例に使う燃料の消費率は、教材値か POH の目安か書く
- flight-lab/src/quiz.js（q_sys の 2 問め）— キャブレターアイスの温度の範囲を聞くが、sys の本文には数値がない — PHAK の数値を本文（sys.carb）に足す
- flight-lab/src/book-1.js@HEAD:209（cautions「ミクスチャー・キャブヒート・燃料タンク切替はこのシミュレータでは未実装」）は school.js:99,102 と pages.js:845 に合っている。pages.js:845 は油圧・油温・電圧・電流も「—」表示と書いている。sys.engine・sys.elec でも油圧と電流計はアプリでは見られないと書くとよい
- cadet/src/content/checklists-archer.js:27（マグネトーのキー START → BOTH、マスタースイッチ 1 つ、ビーコン）↔ 本文の出典の G1000 の Archer III のチェックリスト（LEFT/RIGHT のマグネトースイッチ＋スターター、BATT MASTR と ALTR、ストロボ）— どちらも実在する形。本文は「機体によりキー式とスイッチ式がある」と書けば両方に合う

### 第 4 章 `perf`（分析で見つかったもの）

- flight-lab/src/book-core.js:27 — R.wb の URL が 404 — 正しくは https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-1.pdf（版 1B は正しい）
- flight-lab/src/physics.js:622・avionics.js:443 — モデルの燃料流量（FFLOW GPH）は 3,000 ft・110 KIAS で約 11.5 gal/h、book の「8〜10 gal/h」と計算機の既定 9.5 gal/h（book-figs.js の fuel(el)）と食い違う — 飛行モデルは変えないので、book がモデルの値を FL.physics から計算して示し、公開値（75% で約 10.5 gal/h）を別に書く
- flight-lab/src/physics.js:446（oatDev は 0 のまま、app.js・pages.js・school.js で設定されない）— シミュレータは常に標準大気。radio.js:69・111 の ATIS は気温 31℃・32℃、PFD 型表示の OAT は約 15℃ — book に「教材の飛行モデルは標準大気」と書く（ATIS の数字は交信練習用）
- flight-lab/src/syllabus.js:260–263（x3 短距離離陸）— フラップ 0・Vr 60（AR.rotate）。ops.short の訓練校チェックリストはフラップ 25°・Vr 55 — 実機はチェックリスト。perf.tol / ops.short の bk.sim で「教材では簡略化してフラップ 0・Vr 60」と書く
- flight-lab/src/physics.js:110 — v.cruiseThr 0.79。110 KIAS・3,000 ft の水平飛行は steadyState で 0.76（perf.climb の表は 76%）— 表の値は計算で出しているので book 側はこのままでよい（小差）
- flight-lab/src/quiz.js:38 — q_perf 1 問目が章末クイズ Q1 とほぼ同文 — 章末クイズを差し替える
- flight-lab/src/book-figs.js da(el) — 標高の入力が value 55・step 100 で、矢印で 155・255… と動き、1,000 などは step 不一致になる — step 1（または 5）に
- flight-lab/src/book-figs.js fuel(el) — 時間の表示が Math.floor と Math.round の組み合わせで「1 時間 60 分」になる場合がある（例：239 NM・120 kt）— 分を先に丸めてから時間と分に分ける
- flight-lab/src/book-figs.js wb(el) — 燃料の行が lb 入力（行名「燃料（40 gal × 6 lb）」）、着陸時の燃料の欄がない、範囲外の理由（重量超過・前・後ろ）を出さない — gal 入力 × 6、着陸時の行、理由の表示を追加
- flight-lab/src/book-figs.js ARCHER_WB のコメント・キャプション「教材用近似」— 値は FAA TCDS 2A13（Archer III）と同じ — 「公開値（TCDS 2A13）、空虚重量は例」に

### 第 5 章 `wx`（分析で見つかったもの）

- syllabus.js:445–446 — lesson r1 grades 「進入速度に突風分の半分を足し」 as correct and flies AR.appr + 4; the wx chapter (which links r1 via bk.sim) and ops.xwind never teach the rule — the book should add it (AFH 3C ch. 9), the app is right.
- quiz.js:54 — q_wx asks the thunderstorm life cycle (積雲期・成熟期・消散期); the book has no life-cycle text — add it to wx.ts (AWH 28B 22.3). The quiz is right.
- quiz.js:59 — q_wx microburst 「通常 15 分程度」; the book gives no duration — add the AIM 7-1-24 numbers in wx.shear. The quiz is right ('seldom longer than 15 minutes').
- quiz.js:60 — q_wx TEMPO definition and FM/PROB; the book only says 「一時（TEMPO）」 — add them in wx.taf. The quiz is right.
- quiz.js:56 — reason 「文字の天気情報（METAR・TAF）は真方位、声で聞く情報は磁方位」: written PIREP winds are magnetic (AWH 28B 24.5.1.9). This is not wrong for METAR/TAF, but the book and quiz should not state 'written = true' as a general rule.
- quiz.js:50 — the q_wx bank links to book section 'wx.metar' while covering the whole chapter (atmosphere, thunderstorms, fog). It works; after the rewrite 'wx.atm' or the new sections would be the better targets (app not changed — just note it).
- pages.js:845 — the app lists 「雲・視程の変化・夜間・着氷・ウインドシア」 as not built; the rewritten wx bk.sim must offer only the gusty crosswind (r1/x1), never microburst or fog practice. The current text is OK.
- radio.js:68 — ATIS 'LAB information Bravo' (340/08, FEW035, 31/22, A3001) and the wx.metar example use different stations and weather. No contradiction, but a matching METAR (33008KT with MAGVAR_W 6) would tie radio practice to the chapter.

### 第 6 章 `law`（分析で見つかったもの）

- flight-lab/src/quiz.js:63 — q_law の book リンクは 'law.vfr' だけだが、問題は law.airspace・law.rules・law.special と 91.17（hf.self：book-2.js:101）に及ぶ。本は正しい。書き直しでも id 'law.vfr' を残すこと（quiz.js が参照）。
- flight-lab/src/quiz.js:73（q_law の 91.17 の問題）— law 章に 91.17 はない（hf にある）。本の側は hf.self を正とし、law では扱わなくてよい。
- flight-lab/src/radio.js:203–206 — r_standby の why は「AIM 3-2-4」で、remain outside の注意まで正しいが、refs は ['aim41','pcg']（AIM 4-1）。book-core.js に AIM 3-2 の参照がない。本の law.airspace に remain outside の注意を足す（radio が正しい）。book-core に R.aim32 を足せば本からも参照できる。
- flight-lab/src/book-comm.js:173 — Class C の stand by の説明（AIM 3-2-4・JO 7110.65）は law.airspace より詳しい。law.airspace は規則だけにして comm.* へ bk.see（どちらも正しい）。
- flight-lab/src/book-2.js:93 — law の lessons ['t2','n2']。syllabus.js:167（t2：book ['ops.pattern']）・syllabus.js:278（n2：book ['nav.dr','nav.divert']）はどちらも law の節を参照しない。リンクは本から一方向だけ（害はない）。t2（場周・Class C の LAB・左回り）と n2（クロスカントリー）は妥当。
- flight-lab/src/book-4.js:25 — nav.chart は bk.see('law.airspace') で参照。id 'law.airspace' を変えないこと。
- flight-lab/src/book-4.js:35 — navp の 91.151「目的地まで」→ 条文は「最初の着陸予定地まで」。law（book-2.js:73）が正しい。
- flight-lab/src/sanford-course.js:31, 39, 43–44 — 「SFB は Class C、その上に Orlando の Class B」「Class C は交信の確立、Class B は許可」は FAA From the Flight Deck・91.130・91.131 と一致。本と同じ。
- flight-lab/src/pages.js:651 — 「架空の LAB 空港（管制塔とレーダー管制のある Class C を想定）」は law.special の「LAB 空域は架空」と一致。

### 第 7 章 `radio1`（分析で見つかったもの）

- flight-lab/src/book-comm.js:64（radio.listen の bk.sim）— 文は「英語交信のページ（メニュー → 英語交信）」だが、ボタンは飛行課目 t2 を始める（book-core.js:81 → pages.js:353 app.startLesson）。t2 の最初の手順は着陸許可の復唱を 1・2・3 キーで選ぶ（school.js:122、app.js:99）。どちらも正しいが文とボタンが別のもの — 文を書き直して両方を説明するか、離陸許可の復唱がある t1（school.js:119）を勧める。
- flight-lab/src/radio.js:86・98・112・120 — Tower・Departure・Approach の最初の呼び出しに “student pilot” がない。book（radio.technique）と AIM 4-2-4 c は各施設の最初の交信で名乗ることを勧める — AIM・本書が正しい。radio.js は変更しないので、本文で「練習ページの例では Ground だけで名乗っている」と断るか、例文の扱いを合わせる。
- flight-lab/src/book-comm.js:45（radio.equip「この教材の中央のオーディオパネル」）— app.js:562–576 と avionics.js:122 のパネル（COM1 MIC / COM2 MIC、受信 COM1・COM2・NAV1・NAV2、⇄）と一致。問題なし。
- flight-lab/src/book-comm.js:39（「118.000〜136.975 MHz」「25 kHz 間隔」）— avionics.js:32 と一致。問題なし。

### 第 8 章 `radio2`（分析で見つかったもの）

- flight-lab/src/radio.js:390 — 周波数の drill に '135.275'。SAY.freq（radio.js:40）は全部の桁を言わせるが、JO 7110.65 2-4-17 は 2 桁目より後を言わない（one three five point two seven）。JO 7110.65 が正しい。本書に決まりを書くなら、練習ページの答えと違うことに注意（radio.js は変更しない）。
- flight-lab/src/radio.js:24 — ALPHA の 'Xray' と book-comm.js:88 の 'X-ray'。どちらも FAA の文書にある（AIM TBL 4-2-7 は Xray、JO 7110.65 TBL 2-4-1 は X-ray）。本書で「X-ray（AIM の表では Xray）」と注記して揃える。
- flight-lab/src/radio.js:101・197・341 — 「時計の方位は機首が 12 時（AIM 4-1-15）」。AIM 4-1-15 は航跡が基準 — AIM が正しい。本書（book-comm.js:108、:275、:320）も同じ誤り。本書は直し、radio.js の文とは食い違うことを記録する。
- flight-lab/src/radio.js:38（SAY.heading：北は 360）・:382（drill の説明「北は 360（000 ではない）」）— 本書 comm.numbers に書かれていない。radio.js が正しい（JO 7110.65 2-4-17）。本書に足す。
- flight-lab/src/quiz.js:93（q_radio の 119.75 の問題）— 本書 radio2 quiz Q4 と同じ問題。本書側を替える。
- flight-lab/src/pages.js:723–725 — 「数字とアルファベット」のタブが comm.numbers の節の題名でボタンを作る。節の題名を変えても動くが、短い題名にするとボタンが読みやすい。
- flight-lab/src/syllabus.js:89 — k3 の book: ['comm.basic', 'comm.numbers']。id を変えないので問題なし（新しい節 comm.altitude を作る場合は k3 から参照されない）。

### 第 9 章 `radio3`（分析で見つかったもの）

- flight-lab/src/radio.js:144（scene r_first）— 正解の選択肢が “VFR northeast at three thousand five hundred”。book の comm.pattern（book-comm.js:164）は “VFR to the northeast practice area”（高度なし）、radio.js:73 は “VFR to the northeast practice area at three thousand five hundred”。→ どれも radio.js:73 の言い方にそろえる（book 側を直す）。
- flight-lab/src/radio.js:172（scene r_prog）— “unfamiliar with the airport, request progressive taxi”。book の comm.clarify は “Request progressive taxi.” だけ。どちらも正しいが、app の方が AIM 4-3-18 の書き方に近い → book を app に合わせる。
- flight-lab/src/radio.js:186（scene r_luawlong の clarify）— 例が “LAB Tower, Archer 7LA, on runway three six, line up and wait.（教材の例）”。book の comm.clarify（book-comm.js:202）は “Archer 7LA, holding in position runway three six.”。AIM 5-2-5 の例は “Cessna 234AR holding in position Runway 24L.” → book が正しく、app は AIM の言い方からずれている。
- flight-lab/src/radio.js:163（scene r_cross）— “cross runway two seven at Bravo”。book の examples（book-comm.js:221）は横断する場所なし。JO 7110.65 3-7-2 は場所を言うことを求めている → app が正しい。
- flight-lab/src/school.js:119（ATC_Q.takeoff）— “wind …, runway 36, cleared for takeoff”（風が先）。book（radio3 の例と radio4 comm.tower）は “runway three six, wind three four zero at eight, cleared for takeoff”。JO 7110.65 3-9-10 の決まりは『滑走路番号のすぐ後に cleared for takeoff』だけで、どちらの言い方も実際に使われている。復唱の正解（“Runway 36, cleared for takeoff, …”）は同じ → 食い違いではないが、book に『風は前に来ることも後に来ることもある』と一言書くとよい。

### 第 10 章 `radio4`（分析で見つかったもの）

- flight-lab/src/radio.js:110 — 帰りの ATIS が “information Charlie. One six five three Zulu”、出発は “information Bravo. One four five three Zulu”（radio.js:68）。ATIS は毎時の観測ごとに作り直すので（AIM 4-1-13）、1653Z なら Delta のはず → app が間違い。時刻を 1553Z にする。book はこの全文を持っていない（書き直しで、直したものを入れる）。
- flight-lab/src/radio.js:112 と book-comm.js:280 — 南西向きに 3,500 ft で到着。14 CFR 91.159 では 2,500 ft か 4,500 ft → 両方とも間違い。radio.js:272（r_panpan：heading 220・3,500 ft）も同じ。
- flight-lab/src/radio.js:68、book-comm.js:236、cadet/src/content/dialog/atc.js:44 — ATIS の雲 FEW035 が、巡航高度 3,500 ft（radio.js:73・book-comm.js:243）と同じ → 3 つとも雲を巡航高度より上にする（91.155）。
- flight-lab/src/radio.js:101（note）・:197（scene r_clock の why：『時計の方位は機首が 12 時（AIM 4-1-15）』）・:341（GLOSSARY）— AIM 4-1-15 は航跡が基準。今の book（comm.radar と quiz Q3）も同じ間違い → AIM が正しい。book を直すと、app とは食い違うことになる。
- flight-lab/src/radio.js:86,98,112,120 — 管制塔・出発管制・進入管制への最初の呼び出しに student pilot がない（Ground への呼び出し radio.js:73 にはある）。AIM 4-2-4 は、どの局でも最初の交信で名乗ることを勧めている。book も同じ（radio1 radio.technique の説明とも合わない）→ AIM が正しい。
- flight-lab/src/radio.js:112 — 到着の呼び出しにトランスポンダーのコードがない。AIM 3-2-4 は位置・高度・コード・目的地を求めている。book も同じ → AIM が正しい。
- flight-lab/src/radio.js:66-130 — 段階の番号が ①〜⑦（⑥ は管制塔の着陸、⑦ は地上）。book は ⑤ に 3 つをまとめ、⑥ は場周の練習 → book を app に合わせる。
- flight-lab/src/radio.js:65-136 — FLIGHT には closed traffic・option・go around の段階がない。book の comm.option にはある。食い違いではないが、syllabus.js:90（k4 の book: comm.atis…comm.arrive）に comm.option が入っていないのは、この違いに合っている。
- flight-lab/src/radio.js:94（note『管制官は、パイロットが知っている周波数を省くことがある（AIM 4-3-14）』）— 出発周波数については JO 7110.65 2-1-17 が正しい出典（book-comm.js:262 も同じ間違い）。
- flight-lab/src/radio.js:87（note：6 マイルの交通情報を JO 7110.65 3-9-4 とする）— 正しい。book-comm.js:259 の『3-9-4・3-9-10』の方が不正確（3-9-10 の決まりは USAF だけ）。
- flight-lab/src/syllabus.js:157-166（t1）と school.js:119 — 課目は離陸前点検から始まり、指示は “wind …, runway 36, cleared for takeoff.”（LUAW も fly runway heading もない）。book の comm.tower の bk.sim『この離陸許可の復唱から始まります』は言いすぎ → book を直す。
- flight-lab/src/syllabus.js:184-190（t4）と :167-172（t2）— t4 に管制の場面がない。t2 は着陸許可の復唱だけ（school.js:122 “runway 36, wind …, cleared to land.”）。book の comm.option の bk.sim『管制の指示に復唱しながら飛びます』は事実と違う → book を直す。
- flight-lab/src/radio.js:82（ACT『管制塔 118.3 に変える』）と avionics.js:120（COM1 118.300／121.700）— book は出発の段階で周波数を書いていない → book に足す（app が正しい）。

### 第 11 章 `radio5`（分析で見つかったもの）

- sanford-course.js:18-22 — RUNWAYS の n・e・hdg が FAA の滑走路端座標と合わない（hdg 84/174 → 真方位 090/180。18/36 は ARP のほぼ真上の経度で 9L/27R と 9R/27L に交差し、27C の東端に接する。ファイルでは e=1250 m 東）。FAA データ（AirNav, 2026-10-01）と空港図 AL-917 が正しい。
- sanford-course.js:20 — 9R/27L の幅 w: 30（m）→ 75 ft ≈ 23 m が正しい（FAA データ）。
- sanford-course.js:157-160 — diagramSvg の誘導路 C（n=330、9C の北を東へ延びる）と HS1 の位置（n=250, e=120）が、空港図の配置（誘導路 C は 9C/27C の南に並び、HS1 は滑走路 18 と 27C 東端の合流点）と違う。空港図が正しい。
- sanford-course.js:128-131 — 場面 ‘pattern’ の “make left closed traffic Runway Niner Right” → Chart Supplement では 9R は右場周（27L が左）。公開データが正しい（管制官が別の指示をすることはあるが、練習台本は公開の向きに合わせる）。
- sanford-course.js:10 — 滑走路長の出典が Wikipedia（SRC.wiki）。値は正しいが、FAA の Chart Supplement／空港図を出典にする方がよい。
- school.js:137-139 — ‘mayday’ の why が通報の順を「AIM 6-3-1 の考え方」としている → 要素と順番は AIM 6-3-2（MAYDAY×3 と優先は 6-3-1）。本（comm.xpdr）の書き方が正しい。
- school.js:141-143 — ‘lost’ の why「AIM 6-2 の考え方（5C：Climb, Communicate, Confess, Comply, Conserve）」→ AIM 6-2 に 5C はない（6-2-1 は VFR 機へのレーダー支援）。また正解の通報に PAN-PAN がなく、本と radio.js r_panpan の「不安を感じた時点で少なくとも urgency（AIM 6-1-2）→ PAN-PAN」と食い違う。本と radio.js が AIM に沿っている。
- radio.js:267-270 — r_mayday の “two people on board” と本の “two persons on board”。AIM 6-3-2 の “people” に揃える（本を直す）。
- radio.js:259-266 — CTAF の練習は架空の Lakeside、本は AIM の Strawn。本を Lakeside に揃えると練習とつながる。
- book-comm.js:351（comm.xpdr）— bk.sim ['e3','上空でのエンジン故障']：e3 の brief「1〜3 キーで正しい通報を選ぶ」と app.js:99（Digit/Numpad 1〜3 で答える）は一致。問題なし。
- radio5 の lessons ['e3','t2'] — t2（場周経路）は管制塔のある LAB での課目で、CTAF の内容と結びつかない。CTAF の練習は radio.js の場面（g:'ctaf'）なので、bk.sim はそちらを案内する方がよい。

### 第 12 章 `hf`（分析で見つかったもの）

- quiz.js:106-117（q_hf）— 本文にない内容を問う：91.211 の 14,000 ft 超・15,000 ft 超、暗順応（約 30 分）と視野の周辺で見ること、hypemic hypoxia、コリオリ錯覚（選択肢）。quiz.js は正しい（AIM・PHAK どおり）ので、本文に足す。
- quiz.js（q_hf のリーンズの問題）— 「急に翼を水平に戻したとき」と書き、AIM 8-1-5 と一致。本の hf.body と章末 Q3 は「急に」が抜けている → 本を直す。
- quiz.js:106 — q_hf の book リンクが 'hf.adm' だが、問題の多くは hf.self・hf.body・hf.attitude の内容。リンク先として誤りではないが、学科テストから開く節としては hf.self（章の最初）の方が自然（アプリは変えない方針なので報告のみ）。
- syllabus.js:439-447（r1 TEM）— ブリーフィングの解説「寝不足も脅威で、IMSAFE で自分を点検する」は本の hf.self と一致。問題なし。
- hf の lessons ['i2','r1'] — i2（異常姿勢からの回復）は hf.body の bk.sim と一致、r1 は TEM（crm）で、hf.adm から TEM の図を外すなら lessons の r1 は crm 章側が主になる（hf に残してもよい）。

### 第 13 章 `ground`（分析で見つかったもの）

- syllabus.js:157 (t1 book: ['ops.takeoff','aero.left']) — the ground chapter lists t1 as its lesson and ground.runup's bk.sim links t1, but the lesson does not link ground.runup. Not wrong (the book bridges it); keep the bk.sim box.
- syllabus.js:162-163 + school.js:205 — t1 starts on the runway and its first steps are the simplified in-sim before-takeoff checklist (Enter) and the takeoff-clearance read-back (1–3); the book's bk.sim says only 「ランナップが終わって滑走路に並んだところから始まります」. The app is right; the book should mention the two steps (inside bk.sim).
- school.js:97-100 before_takeoff — teaching checklist (「トリム 離陸位置（Shift+T でリセット）」「燃料セレクター…教材では未実装」) vs book's MGA-based items (「トリム中立」, fuel pump ON, lights). Both fine; the book should call the sim checklist 「簡略版」 in the bk.sim box (do not write 「教材の簡略版」 in normal prose — CADET's APP_ONLY drops it).
- radio.js:72-82 (gnd1) — the radio practice does taxi → run-up → hold short → switch to Tower (AIM 4-3-14); the book never says the run-up is done on the Ground frequency and the switch to Tower happens at the hold line. Add one sentence with a link to comm.dep.
- cadet/src/content/checklists-archer.js:29 — CADET's start checklist says 油圧 「30 秒以内に上がる」; the book lacks the 30 s (AFH supports CADET). Book should add it.

### 第 14 章 `ops`（分析で見つかったもの）

- syllabus.js:76-77 (stallRecovery g/say) and syllabus.js:143 (a7 brief) — order 「①機首を下げ ②フルパワー ③翼を水平」; book ops.slow (and AFH 3C Fig. 5-10) say ①迎え角 ②翼を水平 ③出力. AFH/book is right; the rewrite keeps the AFH order and notes that in a trainer ②③ are nearly simultaneous.
- syllabus.js:107 (a2 why) 「外 8 割・計器 2 割」 vs AFH 3C ch. 3 'about 90% outside, no more than about 10% inside' — AFH is right; the book should give 9:1 and may note the lesson says 8:2.
- syllabus.js:109 (a2 std) 「自家用 ACS の水平直線飛行の許容幅を参考」 — the only Private ACS straight-and-level task is PA.VIII.A (basic instrument) with ±200 ft/±20°/±10 kt; the lesson's ±100/±10/±10 is a course value. Book table is right; keep calling ±100 a 教材の値.
- school.js:28 (LEVELS precision k 0.6) → ±60 ft/±6°/±6 kt; book ops.sl table says ±50/±5/±5 — app is right. app.js:33 default level 'intro' (×1.5) is not mentioned in the book.
- school.js:47 HOW.level 「高度が 50 ft ずれたら機首を 1〜2°」 vs book ops.sl 「高度 100 ft のずれなら、ピッチを 1〜2°」 — pick the app's 50 ft (smaller, earlier corrections match key 2 of ops.sl).
- syllabus.js:114 (a3 std) and :160 (t1 std) — climb 76 ±10 kt vs ACS Vy +10/−5 quoted in ops.climb; app uses a symmetric course tolerance — book should label which is which.
- syllabus.js:111-118 (a3 descent 90 kt −500 fpm) and pages.js:473 ('降下 500 fpm' at 90 kt) vs book ops.trim 「巡航降下 約 100 kt・−500 fpm」 — app is the reference; use 90 kt.
- syllabus.js:121-129 a4 book ['aero.turn'], a5 book ['aero.turn','aero.vn']; syllabus.js:141-155 a7 book ['aero.stall'], a8 book ['aero.stall','aero.left'] — none links ops.turns / ops.slow although the ops chapter lists a4/a5/a7/a8 and holds their bk.sim buttons. App unchanged → keep the bk.sim buttons in ops.turns / ops.slow (or ops.stall) so the path exists from the book side; mention in the lesson list.
- syllabus.js:124 (a4 std バンク 30 ±5°) — book's turns table omits the bank tolerance; syllabus.js:129 (a5 setup 95 kt) — book omits the course entry speed.
- syllabus.js:134 (a6: flaps 25°, 58 kt +10/−0) — book ops.slow gives neither the configuration nor the speed.
- app.js:33 PREFS0 (hold 'hold', rhold 'hold', autoRud true) and app.js:131-134 (U toggles auto-rudder) — book's sim paragraph (book-3.js:65) mentions only the pitch hold; with auto-rudder ON the 「右ラダーが要ります」 of ops.climb and the a8 brief 「E（右ラダー）でボールを中央に」 are not felt. Book should say: turn auto-rudder OFF (U) to practise the rudder.
- quiz.js:121 (q_ops level-off 4,500 ft) duplicates chapter quiz Q1 (5,500 ft) — change the chapter item.

### 第 15 章 `tl`（分析で見つかったもの）

- flight-lab/src/syllabus.js:260-266 — 課目 x3（短距離離陸）は takeoffRoll(AR.rotate)＝60 kt で浮揚、フラップの設定なし（setup runway・v.toFlaps 0）。本 ops.short と quiz.js q_ops はチェックリストのフラップ 25°・55 kt。チェックリストは本が正しい。課目は簡略版なので、本の bk.sim に「課目はフラップ UP・60 kt」と書く。
- flight-lab/src/syllabus.js:263 — 課目 x3 の基準「Vx 64 +5/−5 kt」。本が引く ACS は Vx ＋10／−5 kt。本は ACS のまま、課目の目安を別に書く。
- flight-lab/src/syllabus.js:54・258 — 課目 x2 の接地範囲「目標点 ±60 m」（手前 60 m も合格）。本の ACS「指定点から 0〜200 ft（越えた側）」が公的な基準として正しい。本に課目の目安も書く。
- flight-lab/src/syllabus.js:185 — 課目 t4 の説明「V を押して 1 段ずつ…一周して UP に戻るので注意」。app.js:100 には Shift+V（flapsUp＝1 段上げる）がある。app.js が正しい。本のゴーアラウンドの bk.sim では「Shift+V でフラップを 1 段上げる」と書く。
- flight-lab/src/book-3.js:130・book-figs.js FIG.pattern — 本「約 1 NM」「約 1.6 km（1 NM）」と syllabus.js:169「約 1.6 km」・school.js:212（cross −1600 m）。1.6 km が課目と AFH（1/2〜1 マイル）に合う。本を直す。
- flight-lab/src/book-3.js:131 — 本「アビーム（接地点の横）」と syllabus.js:169・book-figs.js FIG.pattern（進入端の真横の点）。進入端（AFH・AIM）が正しい。
- flight-lab/src/syllabus.js:41・181、pages.js:459 — フレアは「地上 10〜15 ft」、本 book-3.js:142 は「10〜20 ft」。AFH は 10〜20 ft。本はそのままでよい（課目の 10〜15 ft はその範囲の中、と書いてもよい）。
- flight-lab/src/book-3.js:161 — 本の bk.sim「横風 12 kt（突風を伴う）」と syllabus.js:253（右 60° から 12 kt・gust 1.3＝乱気流の強さ）。課目が事実。本を「右 60° から 12 kt の風（横風成分 約 10 kt）・乱気流あり」に。
- flight-lab/src/book-3.js:143 — 本の「この教材の「基礎」」の着陸基準は、syllabus.js:182 の t3 の基準のうち「ファイナルのセンターライン ±30 m」と、landingSteps の「接地の速度 vref−15〜+3 kt」「主輪から接地」を書いていない。本に全部書くか「主な項目」と書く。
- flight-lab/src/syllabus.js:185 — 課目 t4 の採点の速度は AR.x+4＝68 ±12 kt、説明は「64〜76 kt」。本はチェックリスト（64 kt、障害物を越えたら 76 kt）。矛盾はないが、本に課目の目安を一言。

### 第 16 章 `emg`（分析で見つかったもの）

- physics.js:102–110, 342（pa28 の CD0 0.032・K 0.05・停止プロペラ抗力 0.026）— 揚抗比最大が約 60 KIAS（9.3：1）になり、チェックリストの最良滑空 76 KIAS（モデルで 8.5：1）とずれる。e3（syllabus.js:217『76 kt を保つ（速すぎても遅すぎても届かない）』）と本文の bk.key『速くても遅くても滑空距離は短くなる』がシミュレータでは成り立たない — 実機の値（チェックリスト）が正しい。physics の調整を報告。
- syllabus.js:218・c1 の模擬エンジン故障 — 基準『滑空速度 ±8 kt』 vs 本文の ACS『±10 kt』— どちらも正しいが別物（教材の課目の方が厳しい）。本文で書き分ける。
- quiz.js:142（q_emg、紐づけ先 emg.engine）— PARE（スピン回復）の問題があるが emg 章にスピンの説明がない（ops.slow book-3.js:92 と aero.stall にある）。emg に参照を置くか、bank の紐づけを考える — 本の内容としては ops.slow が正しい置き場所。
- school.js:140（ATC 'mayday' の why）— 通報の順番の出典を『AIM 6-3-1 の考え方』としているが、要素の順番は AIM 6-3-2（radio.js:269 は 6-3-2 で正しい）。
- emg.elec の bk.sim（i3 部分パネル・AHRS 故障）— 電気系統の故障の練習ではない（school.js:295–302 の failNow は engine / engL / engR / ahrs / gps だけ）。本文で『電気の故障そのものは練習できない』と書く — app が正しい。
- syllabus.js:197（e1 の brief：Shift+F・F・B・Q/E）— app.js:100, 206–207, 230 と一致。本文に書くキーは bk.sim の中だけにする（CADET の APP 正規表現に注意）。

### 第 17 章 `solo`（分析で見つかったもの）

- syllabus.js:230 — c1（ソロ前の審査・模擬 Check Flight）の book が ['intro.course']。solo.check の bk.sim は c1 を開くので、c1 からも solo.check を指すべき — 本の対応（solo.check）が正しい。
- syllabus.js:250 — 横風着陸 x1 が第 2 段階（c1 とソロの後）。14 CFR 61.87(d)(3) は横風の離着陸をソロ前に求める。教材の設計としては可だが、solo.check の表（横風の修正 → t1–t4）と合わない — 規則が正しい。本文で『実機ではソロ前、この教材では x1』と書く。
- syllabus.js:230 — c1 の内容に急旋回（左 45°）があるが、61.87(d) のソロ前の 15 項目には急旋回がない。solo.check の表もそれに合わせて『急旋回』を入れている。『この教材の模擬審査の内容』と書き分ける。
- syllabus.js:228 c1 why『公開情報では、レッスン 12 回の後の審査に合格するとソロへ進む』と solo.req の『平均 11 回目』— どちらも出典どおり（ana1 / ana2）。本文で記事を分けて示す。
- quiz.js:77（q_law の 61.89 の問題）— 本文の 61.89 の要約より詳しい（報酬）。本文を eCFR の全項目に合わせれば一致する。

### 第 18 章 `navp`（分析で見つかったもの）

- book-figs.js（CALC.fuel）— 既定 9.5 gal/h ↔ physics.js:622 の燃料流量（3,000 ft・110 KIAS で約 11.5 gal/h、105 KIAS で約 10.8 gal/h）— 本は教材モデル値（約 11 gal/h）を既定にするか「POH の値」と明記する（飛行モデルは変えない）
- book-figs.js（CALC.wca）— 既定 TAS 105 kt ↔ physics.js pa28.v.cruise 110 KIAS（3,000 ft で TAS 約 113 kt）— 課目 n2（syllabus.js:281 kt 105）の速度として 105 を使うなら本文でそう書く
- book-4.js nav.chart の空港データ例「60」 ↔ physics.js:68 LAB_RWY len 1,200 m（約 3,940 ft）— 本を「39」に
- book-4.js nav.chart「★＝飛行場灯台」 ↔ FAA Chart Users' Guide — 本の誤り
- syllabus.js:280/284 — 課目 n2 の見積もりは「針路（磁）」と言うが、syllabus.js estimateTruth は現在地から LAB-F への磁方位（航路）と、いまの GS での時間で採点 — 本の nav.plan / nav.divert で「課目の『針路』は新しい目的地への磁方位。風の修正は飛びながら」と説明する（アプリは変えない）

### 第 19 章 `navr`（分析で見つかったもの）

- book-4.js nav.vor の bk.sim「NAV1 を LAB VOR に合わせ」 ↔ school.js:240（課目 n1 は NAV1＝113.50・CDI＝NAV1・CRS を 40° ずらして開始）— アプリが正しい。本は「CRS −/+（Shift で 10°）でコースを合わせ、A / D で旋回」と書く
- syllabus.js:272 n1 の brief「下のパネルの CDI ボタンで NAV1 に切り替え」 ↔ school.js:240 で CDI はすでに NAV1。押すと NAV2 → GPS へ進み（avionics.js:152）、手順の条件 L.av.cdi === 'NAV1'（syllabus.js:275）が満たされなくなる — syllabus の文が古い（アプリは変えないので、本の bk.sim は「CDI はすでに NAV1」と書く）
- book-4.js nav.gps「PFD の上の欄に…ETE」 ↔ avionics.js:371（PFD 上の欄は FROM→TO・DIS・DTK）、ETE は avionics.js:470（MFD）— アプリに合わせて本を直す
- book-4.js nav.gps の CDI の表（ENR 2.0 / TERM 1.0 / APR 0.3）↔ avionics.js cdiGps と navSolve（常に 1.0 NM、表示なし）— 本に「この教材の課目は 1.0 NM」と書く
- 実機の G1000 は区間を自動で進める ↔ シミュレーターは MFD の NEXT LEG（avionics.js:163・app.js:556）— 新しい nav.fpl に両方を書く
- 実機の G1000 は GPS を失うと DR モード ↔ シミュレーターは NO GPS のフラグ（avionics.js navSolve、school.js:302）— nav.gps / nav.fpl に書く
- VOR の識別音（モールス）はシミュレーターに無い（app.js / avionics.js に処理なし）— 本は「実機では必ず識別」と書き、課目では周波数の表示で確かめる
- book-4.js nav.ff の例「Orlando Approach, Cherokee 123AB」 ↔ 教材の LAB Approach / LAB Departure（radio.js:97・school.js:134）と Archer Seven Lima Alpha（radio.js:15）— 本を教材の名前に
- book-4.js nav.gps の bk.see('sys.g1000') ↔ sys.g1000 はピトー静圧・AHRS・ADC の節 — 行き先を nav.fpl などに
- book-core.js:23 R.ifh の URL が 404 — 参照を直す（アプリ全体で ifr 章も使う）

### 第 20 章 `navd`（分析で見つかったもの）

- syllabus.js:291 n3 の brief「②CDI を NAV1（LAB VOR 113.50）に」 ↔ avionics.js:121（NAV1 の使用中は 109.90、113.50 は予備側。n3 の setup に nav の指定が無い）— NAV1 の ⇄ が必要。本の bk.sim に「NAV1 の ⇄ で 113.50 を使用側へ → CDI を NAV1」と書く（アプリは変えない）
- syllabus.js:291・298「局の西南西 約 5.6 NM」「方位 約 250°・5.6 NM」 ↔ 計算（syllabus.js:22 rwyNm の点まで 257°・5.7 NM、avionics.js LABRW まで 249°・6.1 NM）— 小さなずれ。本では「約 250〜255°・約 6 NM」
- school.js:143 lost の解説「AIM 6-2 の考え方（5C：…）」 ↔ AIM 6-2 に 5C の語は無い（6-2-1 は困っている VFR 機へのレーダー援助）— 本は 5C を訓練の覚え方として書く
- book-4.js navd の例「Orlando Approach を呼んで」 ↔ school.js:141（LAB Approach）・radio5 の PAN-PAN の例（LAB Approach, Archer Seven Lima Alpha）— 本を教材の名前に
- book-4.js navd の例「燃料 1.6 gal」（9.5 gal/h 前提）↔ physics.js:622（105 KIAS で約 10.8 gal/h）— 本の数字を教材モデルか POH の値かで明記
- syllabus.js estimateTruth（n2）の「針路」は磁方位（航路）、ETE は見積もりの瞬間の GS — 本の nav.divert で採点の意味を説明する

### 第 21 章 `ifr`（分析で見つかったもの）

- syllabus.js:307 i1 brief『100 kt でバンク約 17°（速度 ÷ 10 ＋ 7）』・syllabus.js:311 と 345/348 の g.bank 17 — 本文 FIG.standardRate は 100 kt で 15°。どちらも IFH にある目安（÷10＋7 は p.4-10、15% は p.7-19）だが正確なのは 15°。本文は両方と正確な値を示し、課目の 17° は『少し深めの目安』と書く
- syllabus.js:307 i1 brief『PFD の方位表示の上のマゼンタの線（旋回率の目安）を 3°/秒の印に合わせる』— avionics.js の PFD（HSI 描画 約 322〜351 行）は方位バグ・コース・航跡の菱形だけで旋回率表示（trend vector）を描かない。旋回率は課目パネルの目標表示（school.js:183 arate）にしか出ない。実機 G1000 の説明としては正しいので、本文は実機の機能として書き、課目では数値表示を見ると書く
- school.js:48 『rate』のヒント『昇降率のずれは出力で、速度のずれは機首で直す』— IFH p.7-14 の定率上昇は『昇降計がピッチの主、速度計が出力の主』（ピッチで昇降率、出力で速度）。i1 の上昇・降下で表示される。本文は『ピッチと出力はいつも組み合わせて使う』を基本にし、矛盾する一般則を書かない
- syllabus.js:331 i3 brief は GPS の航跡（TRK）で針路を見る；avionics.js:390〜399 の予備計器は姿勢・速度・高度だけで磁気コンパスはない — 本文 ifr.partial はコンパス中心。本文に『課目では TRK、実機ではコンパス』と書く
- quiz.js:160 q_ifr『120 kt → 19°（正確な計算でもほぼ同じ）』— 正確 18°。答えは選択肢上変わらないが理由の文が IFH 第 7 章と違う
- quiz.js:158 q_ifr は計器飛行全般（待機・ILS・規則も）だが節リンクは ifr.scan だけ
- syllabus.js:319 i2 std『荷重 3.8 G 以下・Vne 超過なし・12 秒以内』・physics.js pa28 phys.maxG 3.8 — 本文 ifr.upset にない（加える）

### 第 22 章 `ifrp`（分析で見つかったもの）

- school.js:54 ILS のヒント『GS の菱形が下（自分が高い）ならパワーを少し絞り、上（低い）なら足す…速度のずれは機首で』と school.js:358 pitchForSpeed（'ils' を含む）↔ 本文 ifr.ils のここが大切『「出力で降下率、ピッチで速度」ではなく、「姿勢と出力を一緒に」』↔ IFH p.9-40『ピッチで正しい降下率、出力で正しい速度』。3 つとも違う。アプリは変えないので、本文は IFH を基本にしつつ『ピッチと出力はいつも組み合わせて使う。課目のヒントは出力で上下を直す考え方で、どちらも小さく同時に』と矛盾しない書き方にする
- syllabus.js:352 i5『80 kt・約 −430 fpm（フラップ 10°）』↔ 本文『90 kt なら約 450 fpm』— 課目が正確（3° で GS × 5.3）。本文を課目にそろえる
- syllabus.js:353 i5 std『LOC・GS ±1 ドット』↔ 本文の ACS『3/4 スケール』— 矛盾ではないが、本文に『課目は ACS より厳しい教材値』と書く
- avionics.js:94-96・204：ローカライザーは ±2.5° 固定、アンテナは滑走路の先 300 m → LAB の滑走路端の幅は約 430 ft。本文の『滑走路端で幅 700 ft』は実機の説明としては正しい（AIM）が、教材の I-LAB とは違う
- school.js:131 の進入許可『turn left heading 330, maintain 2,000 until established on the localizer, cleared ILS runway 36 approach』が本文 ifr.ils にない。本文に同じ文（と復唱の例）を載せる
- syllabus.js:341 i4『局通過（TO→FROM）で右へ標準旋回』は AIM 5-3-8（TO/FROM の最初の完全な反転で旋回）と一致 ✓ — 本文にこの一文がない（加える）
- syllabus.js:345・348 i4 の g.bank 17（÷10＋7）— 100 kt の標準旋回は正確には約 15°。本文の待機の旋回の説明で目安を書くなら両方
- quiz.js:158 q_ifr は待機・ILS・IFR の規則の問題を含むが、節リンクは 'ifr.scan' だけ（ifrp の節に届かない）
- avionics.js:6・pages.js:845『自動操縦は意図的に未実装』↔ 本文 ifr.np の自動操縦の段落 — 一致 ✓

### 第 23 章 `me`（分析で見つかったもの）

- flight-lab/src/physics.js:130（コメント :129）— pa44.v.xse 88（SE Oklahoma のガイドの表）。POH 系のチェックリスト（MGA 2025・Thrust Flight）は 82。pages.js:466 の速度表と book の me.speeds に 88 が出る。CADET の cadet/src/flight/sorajima.js:136 にも同じ値 — 82 が正しい。
- flight-lab/src/physics.js:130 — pa44.v.climb 105（MGA）vs 本文 me.basics「巡航上昇 110 kt」（ガイド）— どちらも公開値。本文で出典を書き分ける。
- flight-lab/src/physics.js:130 — pa44.v.ga 88（MGA の Balked landing・フラップ 25）vs 本文 me.basics「ゴーアラウンド Vx 82 kt」（ガイド）— 同上。
- flight-lab/src/school.js:108・syllabus.js:431・app.js:435・book-1.js:203 — GUMPS vs 本文 me.basics・examples の GUMP（ガイド）— アプリに合わせて GUMPS にそろえ、ガイドは GUMP と書くことを添える。
- flight-lab/src/syllabus.js:370 — m1 の基準「地上 500 ft までに脚 UP」は本文（「滑走路が残っていない＆上昇を確認したら」）と矛盾しないが、本文にこの基準（課目の基準・教材のもの）を一言書く。

### 第 24 章 `oei`（分析で見つかったもの）

- flight-lab/src/syllabus.js:381・390・413、school.js:55、pages.js:461 — 「生きている側へ 2〜5° バンク」vs 本文の「約 2°」・AFH 13-29（1.5〜2.5°）・MGA（2〜3°）— AFH / POH 系が正しい。5° は認証の上限、5〜10° は故障直後に一瞬だけ（AFH 13-31）。
- flight-lab/src/school.js:319・app.js:33・100・135〜145 — 自動ラダーが OFF になるのは課目でエンジンが failed のときだけ。自由飛行で [ / ] を押すとフェザー＋停止（cut）になり、自動ラダーは設定のまま（初期値 ON）。風車状態は自由飛行では作れず、Shift+[ / Shift+] で再始動 — 本文 me.oei の「自動ラダーは使えません」と me.drag の「自由飛行で試せます」は不正確。本文を直す（U で自動ラダー OFF と書く、風車状態は m2・m4 のフェザー前に体験）。
- flight-lab/src/quiz.js:179 — 抗力のデモの問題（最も降下率を増やしたもの＝風車状態のプロペラ）は、ガイドの値を「増えた量」と読んだときだけ成り立つ。ガイドの書き方はその形態での降下率とも読め、飛行モデルでは風車状態の差は約 100〜120 fpm、フラップ全開は約 700 fpm — 問題文を「AFH：風車状態のプロペラの抗力は機体全体の有害抗力と同じくらいになりうる」に基づくものに直すのが安全（アプリ側は変えない前提なので、本文はあいまいさを明記）。
- flight-lab/src/physics.js（双発の風車状態の抗力）— 動的計算で風車状態とフェザーの差が約 120 fpm（機体の有害抗力の約 4 割）、AFH 13-3 は「機体全体の有害抗力と同じくらいになりうる」。横滑りゼロの得もほぼ出ない（バンク 0° / 3° で 86 / 88 fpm）、翼水平の Vmc は約 3〜4 kt 高いだけ（AFH は最大約 20 kt）— モデルの限界。本文はこれらをシミュレータで確かめられるとは書かない。
- flight-lab/src/syllabus.js:401〜406 — m3 の減速は c.stall（失速警報、school.js:163）でも終わり、その速度を「方向を失った速度」として表示する。モデルでは 5,000 ft で約 61 kt の失速警報が先に来る — 本文で「Seminole では失速警報が先に来ることが多い」と説明する（結果の名前は実際には「回復を始めた速度」）。
- flight-lab/src/syllabus.js:396 — m3 の基準「回復で失う高度 300 ft 以内」は ACS にない（AFH 13-26：高度は基準ではない）— 教材の課目の基準と本文に書く。
- flight-lab/src/syllabus.js:418〜419 — m4 は地上 250 ft で模擬故障を起こす。実機は 400 ft 以上（ガイド・ACS 付録 3・AFH 13-36）— シミュレータとしてはよいが、本文で実機の決まりを区別する。
- flight-lab/src/syllabus.js:428 — m5 の brief「着陸が確実（滑走路に届く）になってから脚 DOWN・フラップ」vs AFH 13-34（脚は遅くともアビームで DOWN、最後のフラップだけ待つ）— AFH が正しい。課目は脚 UP のファイナルから始まる練習だと本文で説明する。
- flight-lab/src/syllabus.js:429・432 — m5 の基準文「ファイナル 88 ±5 kt」vs 採点 landingSteps(SM.yse − 4)＝84 ±5 kt。接地位置の合格範囲（目標点 300 m から −100〜+400 m）は ACS の「最初の 1/3」（1,200 m の滑走路なら 400 m まで）より広い。
- flight-lab/src/syllabus.js:382 — m2 の基準「針路 ±20°（故障直後）・30 秒以内に正しいエンジンをフェザー」は教材の基準。本文の ACS の表（離陸直後 ±10°）と混同しないよう、本文で区別する。

### 第 25 章 `crm`（分析で見つかったもの）

- quiz.js:184 — バンク q_crm は 'crm.tem' だけにつながっているが、CRM（crm.crm）・PM（crm.pm）・自動化（crm.auto）・ジェット（crm.jet）・SRM（hf.srm）の問題を含む。間違えた問題から本へ戻ると、どれも TEM の節に飛ぶ — 本の側は crm.tem に章全体への入口（他の節への参照）を置くと良い。
- syllabus.js:439〜（r1 の why）『TEM は、事故の多くが「予想できた脅威」や「気づけたエラー」の積み重ねで起きる、という考え方』— 本の ICAO の定義（脅威・エラー・UAS を管理する枠組み）とは言い方がずれる。本の側を正とし、r1 の内容（脅威の予測・食い違いの確認・横風着陸）は本文の例にそのまま使える。
- syllabus.js:442（r1 の book: ['crm.tem']）と crm.tem の bk.sim（['r1', 'TEM：脅威を予測して管理する']）は一致 — 問題なし。
- cadet/src/content/academy-spec.js:239 のポスター『TEM：脅威とエラーを管理する…（第 5 段階：CRM・TEM で詳しく）』は syllabus.js:436 の第 5 段階と一致 — 問題なし。

### 第 26 章 `jet`（分析で見つかったもの）

- quiz.js:192 — why の『（AFH 第 15 章）』→ 現行 AFH（FAA-H-8083-3C）ではジェットは第 16 章。アプリ側が古い（本も同じ誤り：book-core.js:21・book-5.js:159・185）。
- quiz.js:184 — q_crm バンクは 'crm.tem' だけにつながるが、ジェット（crm.jet）・自動化（crm.auto）の問題（quiz.js:191〜193）を含む。本から見ると、jet 章の内容の問題が TEM の節に結ばれている。
- syllabus.js:318（課目 i2 の brief）— 機首上げ『①フルパワー ②機首を下げる ③翼を水平』（IFH の小型機の順）。crm.upset の『迎え角を減らす → 翼を水平 → 出力』と順番が違う。小型機の課目としてはアプリ（IFH・ifr.upset）が正しく、crm.upset を『大型機の型は 2 つ、小型機の練習は i2 の順』と直す。
- syllabus.js:319（i2 の std『荷重 3.8 G 以下』）は physics.js pa28 phys.maxG 3.8 と一致 — crm.upset で荷重に触れるならこの値。
- pages.js:845『自動操縦（HDG / ALT への追従）— 意図的に未実装』と crm.auto『この教材には針路・高度を保つ自動操縦はありません（意図的）』は一致 — 問題なし。app.js にも自動操縦のキーはない。
- book-5.js:188 jet の lessons: ['i2'] — i2 の book は ['ifr.upset']（syllabus.js:319）。jet 章から課目へのつながりは crm.upset → ifr.upset の参照で足りる。問題なし。

### 第 27 章 `sim`（分析で見つかったもの）

- book-5.js:212 — W / S「離すとその角度を保つ」：保持は空中だけ（app.js:217-226、地上では離すと中立）。↑ / ↓ も同じ操作（app.js:204）— アプリが正しい。本文に『空中では』と ↑↓ を足す。
- book-5.js:213 — A / D「左 / 右へ傾ける」だけ：標準は『離すとバンクを保つ（±4° 以内は水平へ）』（app.js:218、index.html:86、pages.js:418）、設定で「離すと中立」。← / → も同じ — アプリが正しい。
- book-5.js:214 — Q / E：自動ラダーが標準で ON（app.js:33 autoRud: true）で、片発の課目では強制的に OFF（school.js:319、app.js:131-132）であることが本文にない — アプリが正しい。
- book-5.js:215 — R / F：Shift+R＝全開・Shift+F＝アイドル（app.js:100・124-126）、PageUp / PageDown（app.js:230）、押し続けると速くなる（app.js:231-232）が抜けている — アプリが正しい。
- book-5.js:216 — V「フラップを 1 段下げる」：最大の位置で V を押すと UP に戻る（app.js:111 (s.flapIdx + 1) % n）。ガイド（pages.js:422）・使い方.md:153 も『1 段下げる』としか書いていない — 動きはアプリが基準（アプリは変えない）。本文に注意として書く。
- book-5.js:217 — T / Shift+T「トリムを戻す」：Shift+T は『中立（離陸位置）へ』（app.js:127）、地上の T も中立にする（app.js:120）、操縦アシスト中はトリムは自動（app.js:121）— 本文の言葉をアプリに合わせる。
- book-5.js:220 — [ / ]：自由飛行では Shift+[ / Shift+] で再始動（app.js:100・142-144、訓練中は不可）が抜けている。
- book-5.js:223 — C / H / P「操作の説明」：アプリでは H は「キーの一覧」（app.js:452、index.html:34「キー H」、pages.js:81）。一時停止は P と Esc（app.js:93）。L＝水平に戻す（自由飛行のみ、app.js:128-130）が表にない — アプリの名前に合わせ、Esc と L を足す。
- book-5.js:211-224 — G1000 型パネルのボタンはマウスで操作（app.js:453、pages.js:448）が表にない — 1 行足す。
- book-5.js:225 — ゲームパッドの説明は正しい（app.js:176-194、pages.js:442 と一致：左スティック＝傾きと機首、右スティック左右・L1 / R1＝ラダー、右スティック上下＝トリム、R2 / L2＝スロットル、×＝ブレーキ）。「詳しくはメニューの『操作ガイド』」も一致（pages.js:50、タブ「ゲームパッド」pages.js:404）。
- app.js:190 — ボタン 16（PS / Xbox ボタン）でキーの一覧が開くが、ガイド pages.js:442 と使い方.md:166-181 に書かれていない（アプリ内部の不一致。本文で触れるならアプリの動きに合わせる）。
- book-5.js:212 —「設定で『離すと中立』」はアプリの設定画面（index.html:84「離すと中立」）と一致。ガイド pages.js:416 は『メニューで「離すと中立」に変更可』、pages.js:436 は『メニューの操作の設定』と書いていて言い方が揃っていない（本文は『⚙ 設定』に統一するのがよい）。
- book-5.js:208 — 「課目の『教科書』のボタン」：実際は課程表の課目の説明の折りたたみ「教科書の関連する節」の中の「教科書 N. 節名」ボタン（pages.js:155・209）。一時停止画面の「教科書」（index.html:170、app.js:495）は課目の節ではなく教科書を開くだけ — 本文を具体的に。
- book-5.js:204 — 「上昇：ピッチ 8°・全開・76 kt」：教官パネルの目安（school.js:58-68 guideText）は同じ条件で『機首上げ 約 10°』— 飛行モデルが正しい。
- outputs/FLIGHT-LAB-使い方.md:56 —「操作の状態の『簡潔に』はスロットル・フラップ・トリムだけ」：アプリは脚も残す（app.js:413）。使い方.md:178「Share / Back」：ガイドは「Back / View（クリエイト）」（pages.js:442）。どちらもアプリが正しい（本文に関係するのは sim.screen を書くとき）。
