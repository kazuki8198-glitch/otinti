// DRAFT (W25, R2) — the summary chapter 'g1'「第 1 部のまとめ」, the door of Part 1 (p1) and the page data of
// 「JCAB 学科の道」 for Part 1 (textbook/rewrite/combined/DESIGN.md 3.2「部の扉」「部のまとめの章 gN」, 3.3 第 1 部 第 20 章・
// 付録, 3.1, 5 criterion 23, 7.2 W25). No product reads this file (DESIGN 6.2 rule 5, 7.4). Check it with its figures:
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/g1-figs.js \
//     textbook/rewrite/combined/drafts/g1.js
//
// Where each piece goes when it is registered (the integrator; reports/W25.md 7 lists the exact changes):
//  - the chapter: flight-lab/src/book-gates.js (new; DESIGN 3.1: the summary chapters g1〜g7, FLIGHT LAB and TEXTBOOK only,
//    read after book-7.js — until book-7.js exists, after book-5.js), B.add({ id: 'g1', …, before: 'ground' }) as below:
//    g1 stands at the end of Part 1, in front of Part 2's first chapter. CADET does not read book-gates.js (DESIGN 6.3,
//    STYLE「CADET が表示しない章」), so CADET's book and its tests do not change; the figures of g1-figs.js go into
//    book-figs.js;
//  - the door of Part 1: DOOR_P1 below becomes the `door` of the p1 entry of book-core.js's PARTS (DESIGN 3.2「部の扉」,
//    6.1: PARTS gets the new item door). The draft sets it at run time so check-path.mjs reads it. doorHtml() below is
//    a proposal of the drawing (FL.book.doorHtml(partId) in book-core.js, drawn by FLIGHT LAB's pages.js and TEXTBOOK's
//    render.js at the head of the part: DESIGN 5 criterion 24) — it reads only the book's data, FL.syllabus and FL.quiz;
//  - 「JCAB 学科の道」: DESIGN 3.3 付録 — a page the products make (not a section of the book), FLIGHT LAB and TEXTBOOK,
//    built from the sections' data `jcab` (JCAB-MAP.json's ids); R2 shows Part 1's share, R4/W47 completes it.
//    JCAB_ROAD below (the six subjects and how each maps to the syllabus headings) and jcabRoad()/jcabRoadHtml() go into
//    book-gates.js as FL.book.jcabRoad (data) and FL.book.jcabRoadHtml() (the page body), next to the appendix's
//    jurAppendix. The reading order is computed from the book (never a hand-written list that can go stale).
//
// What the chapter is (DESIGN 3.2「部のまとめの章 gN」, 3.3 chapter 20, 5 criterion 23):
//  - g1.review: 15 questions (5 on the front part's basic quantities — basics.speed/alt/rules/time/units — and 10 on
//    Part 1's four groups) and 4 oral practices (the three「Archer の POH に当てはめる」tasks kiso03.28・kiso04.28・kiso05.28,
//    DESIGN 3.2「章末」, and kiso10.q28). The questions are new, a few rewritten from kiso09.q8・kiso09.q18 (no sentence
//    copied). Each answer links the section that is the concept's address (bk.see). Earlier part: 5/15 = 33 %;
//  - g1.japan: the Japan/US table of Part 1's items, drawn from FL.jur (FL.jur.ofGate('g1'), 25 items now) with
//    bk.jur — no number written by hand (DESIGN 3.4「3 回会わせる」: box ①, this summary ②, Part 7 ③), grouped as
//    Part 1's chapters, each group with links to the sections whose boxes carry its items; 4 check questions that
//    compare the two columns in words (no hand-written numbers);
//  - the chapter-end 4-choice questions: 10, each with `sec` (the section its reason cites) so check-path.mjs can count
//    the earlier part's share: 4/10 = 40 % on 序部 (criterion 23: ≥ 30 %). Answer positions A 3・B 3・C 2・D 2;
//  - scope: g1.review 'common' (the US rules are named「米国の」, no rule numbers), g1.japan 'mixed';
//  - JCAB's names from FL.terms, the chapter's first use「正式名（通称、English）」 written by hand (as the other drafts);
//    the teaching values from FL.physics (AR.s1), the Archer's arms from FL.bookCalc.ARCHER_WB (POH values);
//  - every claim is in g1.claims.json (check-chapter --claims-out), checked against the primary sources (reports/W25.md 4).
(function (FL) {
  'use strict';
  const B = FL.book, R = B.R, bk = B.bk, FIG = FL.bookFigs;
  const AR = FL.physics.AIRCRAFT.find(a => a.id === 'pa28').v;            // the course Archer (teaching values)
  // the Archer III POH's fuel arm and aft CG limit, from the W&B data the wb chapter draws (POH values)
  const WB = () => FL.bookCalc && FL.bookCalc.ARCHER_WB;
  const fuelArm = () => { const w = WB(); const r = w && w.rows.find(x => /燃料/.test(x[0])); return r ? r[2].toFixed(1) : ''; };
  const aftLimit = () => { const w = WB(); return w ? Math.max(...w.env.map(p => p[0])).toFixed(1) : ''; };
  const see = (id, label) => bk.see(id, label);
  const q = (n, text, answer) => bk.q(`問 ${n}　${text}`, answer);
  const oral = (n, text, answer) => bk.q(`口述の練習 ${n}　${text}`, answer);

  // ---- the US–Japan table of Part 1 (g1.japan): FL.jur's items of the gate g1, grouped as Part 1's chapters ----------
  // An item that is in FL.jur with the gate g1 but in no group here still shows (in the last group): the data decides.
  const JUR_GROUPS = [
    { t: '高さ・規正値・時刻（序部・計器・気象）', ids: ['alt.transition', 'alt.unit', 'time'] },
    { t: '飛行の原理と機体', ids: ['aerobatic', 'lights.ac'] },
    { t: '気象の報告と警報', ids: ['metar.taf', 'ws.alert'] },
    { t: '米国の規則と空域', ids: ['preflight', 'vmc', 'vmc.ad', 'svfr', 'msa', 'speed', 'row', 'fuel.vfr'] },
    { t: '英語の交信', ids: ['english.radio', 'words', 'readback', 'xpdr', 'light', 'nordo.vfr'] },
    { t: '人間の能力と資格', ids: ['lookout', 'alcohol', 'medical', 'oxygen'] },
  ];
  function jurGroups() {
    const J = FL.jur; if (!J || typeof J.ofGate !== 'function') return [];
    const mine = J.ofGate('g1').map(x => x.id), used = new Set();
    const out = JUR_GROUPS.map(g => ({ t: g.t, ids: g.ids.filter(id => mine.includes(id) && !used.has(id) && used.add(id)) }));
    const rest = mine.filter(id => !used.has(id));
    if (rest.length) out[out.length - 1].ids.push(...rest);
    return out.filter(g => g.ids.length);
  }
  // the sections of 序部 and Part 1 whose boxes carry a group's items (the place each was taught), in reading order
  function taughtIn(ids) {
    const J = FL.jur, secs = [];
    for (const id of ids) for (const sid of J.byId(id).boxes) {
      const f = B.findSection(sid);
      if (f && (f.ch.part === 'p0' || f.ch.part === 'p1') && !secs.some(s => s.id === sid)) secs.push(f.sec);
    }
    const order = B.CHAPTERS.flatMap(c => c.secs.map(s => s.id));
    return secs.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }
  const jurTables = () => jurGroups().map(g => {
    const where = taughtIn(g.ids);
    return `<h4>${g.t}</h4>${bk.jur(...g.ids)}${where.length ? `<p class="g1-where">習った節：${where.map(s => see(s.id, s.t.replace(/[：:]\s*14 CFR.*$/, ''))).join('')}</p>` : ''}`;
  }).join('');
  const jurCount = () => (FL.jur && typeof FL.jur.ofGate === 'function' ? FL.jur.ofGate('g1').length : 0);

  B.add({ id: 'g1', part: 'p1', before: 'ground', t: '第 1 部のまとめ', en: 'Part 1 review: ground school',
    summary: '第 1 部で学んだ原理・機体・計器・性能・気象・航法・規則・交信・人間の要点を、序部の基本の量と合わせて、問いと口述の練習で確かめます。第 1 部で会った日米の違いを 1 つの表に集め、Sanford では米国の決まり、日本の学科と日本の空では日本の決まりで答えられるようにします。',
    secs: [
      // ---------------------------------------------------------------------------------------------------------------
      { id: 'g1.review', t: '第 1 部の振り返り：問いと口述の練習', scope: 'common', from: ['kiso03.28', 'kiso04.28', 'kiso05.28'], h: () => `
${bk.aim('第 1 部の要点を、序部の基本の量と合わせて確かめます。答えを見ずに、理由まで声に出して言ってから開きます。')}
${FIG.g1Map()}
<p>この節の問いは、何も見ずに答える練習です。答えを開く前に、理由まで声に出して言います。答えには、その事柄を詳しく学んだ節へのリンクがあります。間違えた問いや、理由が言えなかった問いは、その節へ戻って読み直します。</p>
<p>問いの 3 分の 1 は、序部の基本の量から出します。単位・時刻と方位・速さ・高さ・飛び方の決まりは、第 1 部のどの章でも使ったからです。残りは、第 1 部の 4 つのまとまりから出します。</p>
${bk.t(['まとまり', '章', '問い'], [
  ['序部の基本の量', '{ch:basics}', '問 1〜5'],
  ['原理と機体', '{ch:aero}・{ch:sys}', '問 6〜8'],
  ['計器・性能・重さ', '{ch:inst}・{ch:perf}・{ch:wb}', '問 9〜11'],
  ['気象と航法の基礎', '{ch:wx}・{ch:navb}', '問 12・13'],
  ['規則・交信・人間', '{ch:law}・{ch:radio3}・{ch:hf}', '問 14・15'],
  ['口述の練習', '{ch:sys}・{ch:inst}・{ch:wb}・{ch:adm}', '口述 1〜4'],
])}
<p>最後の口述の練習は、教官に説明する形の問いです。Archer の POH（操縦士用の機体の手引書、pilot's operating handbook）を開き、2〜3 分の話にまとめます。答えの例は、話に入れる要点です。数字は、その機体の POH と記録の値を使います。</p>
${bk.key('答えを見ずに、理由まで声に出して言う', '言えなかった問いは、リンクの節へ戻って読み直す', '日をあけて、もう一度答える')}
${bk.warn('<b>ここに注意：</b>このまとめは、第 1 部の要点の一部だけです。ここの問いに答えられても、第 1 部を全部学んだことにはなりません。実機で使う数字と手順は、その機体の POH・操縦教員（教官、flight instructor）・学校の決まりで確かめます。')}
<h4>序部の基本の量から</h4>
${q(1, '真対気速度（TAS：true airspeed）100 kt で、正面から 20 kt の風を受けています。対地速度（GS：groundspeed）はいくらですか。追い風で GS が増えると、失速（stall）までの余裕も増えますか。',
  `GS は 100 − 20 ＝ 80 kt です。余裕は増えません。翼にとっての速さは、空気に対する速さだからです。手引書の失速の速度は指示対気速度（IAS：indicated airspeed）で書かれ、追い風でも変わりません。所要時間は GS で求め、翼の余裕は IAS で考えます。${see('basics.speed', '速度の種類・風のベクトル・距離と時間')}`)}
${q(2, '高度計（気圧高度計、altimeter）が 2,500 ft を示しています。高度計規正値（アルティメターセッティング、altimeter setting）は、その地域の QNH（QNH）に合わせてあります。真下の地形の標高が 900 ft なら、地面からの高さ（AGL）はおよそいくらですか。',
  `2,500 − 900 ＝ 1,600 ft です。QNH に合わせた高度計は、平均海面（mean sea level）からのおよその高さを示します。地面からの高さは、そこから真下の標高を引いて求めます。外の気温が標準より低い日は、実際の高さは表示より低くなります。${see('basics.alt', '高度の種類と高度計の基準')}`)}
${q(3, '「晴れているから有視界飛行方式（VFR：visual flight rules）、雲があるから計器飛行方式（IFR：instrument flight rules）」という説明は、正しいですか。',
  `正しくありません。VFR と IFR は、飛び方の決まりです。有視界気象状態（VMC：visual meteorological conditions）と計器気象状態（IMC：instrument meteorological conditions）は、天気の区分です。IFR の便は、晴れた VMC の中も飛び、そのときも見張り（see and avoid）を続けます。VFR で飛ぶ人は VMC を保ち、雲に入る前に引き返します。IFR で管制空域（controlled airspace）を飛ぶには、飛行計画（flight plan）を出して管制の承認を受けます。${see('basics.rules', '飛行方式と気象状態は別の軸')}`)}
${q(4, '米国の決まりで、METAR（METAR）の風と、飛行場情報放送（ATIS：automatic terminal information service）の風は、どちらの北を基準にしていますか。滑走路の番号はどうですか。',
  `METAR と飛行場予報（TAF：terminal aerodrome forecast）の風は、真北（true north）が基準です。ATIS や管制塔が声で伝える風は、磁北（magnetic north）が基準です。滑走路の番号も、滑走路の向きの磁方位（magnetic direction）からつけます。だから、ATIS の風と滑走路の向きは、そのまま比べられます。${see('basics.time', '時刻と方位')}`)}
${q(5, '標高 1,500 m の山があります。ft ではおよそいくらですか。',
  `1 ft ＝ 0.3048 m なので、1,500 ÷ 0.3048 ≈ 4,921 ft で、約 4,900 ft です。答えを出す前に、どちらの単位の数字かを確かめます。Archer の高度計は ft で表示するので、m の数字は ft に直してから比べます。${see('basics.units', '単位と換算')}`)}
<h4>原理と機体</h4>
${q(6, '速度計は失速の速度より速い値を指しているのに、失速警報（stall warning）が鳴りました。失速は起きますか。回復で最初にすることは何ですか。',
  `起きます。失速は、迎え角（迎角、angle of attack）が臨界迎え角（臨界迎角、critical angle of attack）を超えると、どんな速度でも起きます。旋回や引き起こしの間は、荷重倍数（G、load factor）が大きく、失速の速度も上がっています。自動操縦装置（オートパイロット、autopilot）があれば、まず切ります。そして操縦輪（ヨーク、control wheel）を前へ押して、迎え角を減らします。翼を水平にし、出力を必要に応じて足し、速度が戻ったらゆるやかに元の飛び方へ戻ります。${see('aero.stall', '失速のしくみと回復')}`)}
${q(7, '高度を保ってバンク 60° の旋回をすると、荷重倍数はいくらですか。失速速度（stall speed）は何倍になりますか。',
  `荷重倍数は 1 ÷ cos 60° ＝ 2 です。失速速度は √2 倍で、約 1.41 倍になります。この教材の Archer のフラップ（flaps）UP の ${AR.s1} kt（教材値。参考値：POH 4.7 の、重さが最大のときの値と同じ）なら、約 ${Math.round(AR.s1 * Math.SQRT2)} kt です。荷重倍数が 2 になるのは、高度を保つ釣り合い旋回のときです。${see('aero.turn', '旋回の物理と荷重倍数')}`)}
${q(8, '気化器（キャブレター、carburetor）のエンジンで、固定ピッチのプロペラの Archer です。気温 25℃ の湿った日に巡航していると、回転がじわじわ下がりました。何を疑い、何をしますか。',
  `気化器着氷（キャブレターアイス、carburetor icing）を疑います。気化器の中では空気の圧力と温度が下がるので、晴れた暖かい日でも、湿っていれば氷ができます。キャブレターヒーター（キャブレターヒート、carburetor heat）をいっぱいに入れます。回転はいったん下がり、氷がとけると上がってきます。少しだけ入れたり、すぐに戻したりはしません。${see('sys.carb', '気化器着氷')}`)}
<h4>計器・性能・重さ</h4>
${q(9, '上昇の途中で、外の空気の圧力である静圧（static pressure）を取る穴、静圧孔（static port）が詰まりました。高度計・昇降計（昇降率計、vertical speed indicator）・速度計は、それぞれどうなりますか。Archer の予備計器（standby instruments）で確かめられますか。',
  `高度計は、詰まった高さで止まります。昇降計は、少し動いたあと 0 のままになります。速度計は、詰まった高さより上では遅く表示します。Archer の予備計器も、PFD（主な飛行表示、primary flight display）と同じ柱から静圧を取ります。だから、同じように狂います。同じ情報源の表示どうしでは、確かめ合いになりません。機内の代替静圧源（代替静圧、alternate static source）に切り替えます。${see('sys.g1000', 'ピトー静圧と計器の表示')}${see('inst.flow', '情報の流れと依存')}`)}
${q(10, '標高の低い空港でも、暑い日は離陸（takeoff）の滑走が長くなります。なぜですか。性能の図に、密度高度（density altitude）を入れてよいですか。',
  `暑い日は空気が薄く、密度高度が高くなります。翼は同じ揚力（lift）を出すのに、速い TAS が要ります。エンジンの出力とプロペラの推力（thrust）も落ちます。離陸の IAS は同じでも、TAS と GS が速くなるので、滑走が長くなります。Archer の離着陸の図には、気圧高度（pressure altitude）と外気温を入れます。密度高度を入れると、温度の影響を 2 回数えることになります。${see('perf.da', '密度高度')}`)}
${q(11, `Archer の燃料のアーム（arm）は ${fuelArm()} in で、重心の後ろの限界の ${aftLimit()} in より後ろにあります（POH の値）。飛んで燃料が減ると、重心はどちらへ動きますか。`,
  `前へ動きます。範囲の中の重心は、いつも燃料のアームより前にあります。重心より後ろにある重さが減ると、重心は前へ動くからです。だから、燃料が減った着陸のときも、重心が範囲の中か確かめます。後ろの席と手荷物はアームが長く、重心を大きく後ろへ動かします。${see('perf.wb', '重さと重心の計算')}`)}
<h4>気象と航法の基礎</h4>
${q(12, '米国の METAR に「SCT008 BKN015 OVC030」とあります。雲高（シーリング、ceiling）はいくらですか。高さの基準は何ですか。',
  `雲高は 1,500 ft です。雲高は、BKN か OVC と報告された、いちばん低い層の高さだからです。SCT の 800 ft の層は、雲高になりません。METAR の雲の高さは空港の地面からの高さ（AGL）で、海面からの高度ではありません。${see('wx.metar', 'METAR の読み方')}`)}
${q(13, '真航路（true course）360°、TAS 100 kt で、風は 270° から 20 kt です。航路を保つには、機首をどちらへ何度ほど向けますか。GS はおよそいくらですか。',
  `風は西から吹いて、機体を東へ流します。だから、機首を風上の左（西）へ向けます。この角度が偏流修正角（wind correction angle）です。sin（偏流修正角）＝ 20 ÷ 100 ＝ 0.2 で、約 11.5° です。真針路（true heading）は約 348.5° です。GS は 100 × cos 11.5° で、約 98 kt です。真横の風を TAS から引いた 80 kt ではありません。${see('navb.wind', '風と偏流修正')}`)}
<h4>規則・交信・人間</h4>
${q(14, '同じ周波数で、自分の機に似た無線呼出符号（コールサイン、call sign）が聞こえました。続く高度の数字だけを聞き取れました。自分あての指示だと考えて、高度を変えてよいですか。',
  `変えません。推測で動かず、推測で復唱（readback）もせずに確かめます。自分あてか分からないときは「Verify clearance for Archer Seven Lima Alpha」と聞きます。聞き取れなかったときは「Say again」と言います。米国の規則も、許可の内容がはっきりしないときは、すぐ管制官に確かめるよう、機長（PIC：pilot in command）に求めています。${see('comm.clarify', 'わからないとき・従えないとき')}`)}
${q(15, '朝、熱は下がりました。夜に飲んだかぜ薬の眠気も、今は感じません。航空身体検査証明（medical certificate）も有効です。これで、今日の訓練に出てよいと言えますか。',
  `まだ言えません。IMSAFE（IMSAFE）で、病気（I）と薬（M）を分けて確かめます。眠気を感じないことは、薬の影響がない証拠になりません。PHAK は、眠気などの副作用がある薬は、飲む間隔の 5 倍の時間をあけてから飛ぶよう勧めています。身体検査の証明が有効なことと、今日飛べる状態であることは、別に確かめます。迷ったら操縦教員に伝え、相談・休養・延期から選びます。${see('hf.self', '自分の体調：IMSAFE')}`)}
<h4>口述の練習（教官に説明する）</h4>
${oral(1, 'Archer の POH で、エンジンの型式・使える燃料の等級・オイルの量・エンジンの計器の色の帯を調べてください。それを使って、エンジンを止めないための確かめを、2 分で説明してください。',
  `話に入れる要点は 4 つです。1 つめは、エンジンの型式と、気化器式か燃料噴射式かです。2 つめは、使える燃料の等級と色、使用可能燃料の量です。3 つめは、オイルの量の下限と、計器の緑・黄・赤の帯の意味です。4 つめは、タンクの切り替え方と、エンジンが荒れたときに最初にすることです。数字はその機体の POH の値を使い、この本の例の値を写しません。${see('sys.engine', 'エンジンと点火')}${see('sys.fuel', '燃料系統')}${see('sys.eis', 'エンジンの計器')}`)}
${oral(2, 'Archer の PFD の速度・高度・姿勢・方位は、それぞれ何から作られていますか。1 つの装置が壊れたら、何が残り、何を見て飛びますか。G1000 型の手引きと POH で調べて説明してください。',
  `要点は 3 つです。速度・高度・昇降率は、エアデータコンピューター（air data computer）が、全圧（total pressure）と静圧から作ります。姿勢と方位は、姿勢方位基準装置（attitude and heading reference system）が作ります。予備計器は同じピトー管（pitot tube）と静圧孔から空気を取るので、管の詰まりは予備計器にも出ます。装置そのものが壊れて赤い × が出たら、その表示を使わず、予備計器へ目を移します。${see('inst.flow', '情報の流れと依存')}${see('sys.g1000', 'AHRS と ADC が壊れたとき')}${see('inst.pfd', 'PFD と予備計器・表示の切替え')}`)}
${oral(3, '自分・操縦教員・手荷物・燃料の重さで、Archer の重量（重力、weight）と重心位置（重心、center of gravity）を、POH の表で計算してください。離陸のときと着陸のときの両方で、範囲の中かを説明してください。',
  `要点は 4 つです。1 つめは、空虚重量（empty weight）とそのモーメント（moment）を、その機体の重量と重心の記録から取ることです。2 つめは、席・燃料・手荷物ごとに、重さ × アームでモーメントを出して足すことです。3 つめは、重さの合計・重心の位置・手荷物の決まりの 3 つを、別々に確かめることです。4 つめは、燃料が減った着陸のときも確かめることです。範囲から出たら、積み方を変えて計算し直します。${see('wb.limits', '機体の記録・重量の限界')}${see('perf.wbex', '計算例と直し方')}`)}
${oral(4, '前の晩によく眠れないまま、訓練の日になりました。出発は遅れ、帰る時刻には天気が悪くなる予報です。出発前・飛行中・着陸後に、何を確かめ、どう決めるかを説明してください。',
  `要点は 3 つの場面です。出発前は、IMSAFE で疲れを確かめ、個人の最低基準（personal minimums）と予報を比べます。遅れを取り戻そうと急ぐ気持ちも、危険のもととして数えます。飛行中は、引き返す時刻と天気の条件を先に決めておき、その条件になったら早めに引き返します。着陸後は、何が判断に影響したかをふり返り、次の計画に生かします。${see('hf.fatigue', '疲労・睡眠')}${see('adm.risk', 'リスクと個人の最低基準')}${see('adm.review', '振り返り')}`)}
` },
      // ---------------------------------------------------------------------------------------------------------------
      { id: 'g1.japan', t: '第 1 部で会った日米の違い', scope: 'mixed', h: () => `
${bk.aim('第 1 部で会った日米の違いを、まとまりごとの表に集めます。Sanford で飛ぶときは米国の決まり、日本の学科と日本の空では日本の決まりで答えることを確かめます。')}
${FIG.g1Jur3()}
<p>第 1 部の本文は、国を問わない原理と、Sanford で飛ぶための米国の決まりで書いてあります。日本の数字は、米国の数字を習うその場で、日米の対照の囲みに並べました。この節では、その囲みの項目を、まとまりごとの表に集め直します。いまは ${jurCount()} 項目です。</p>
<p>表の数字は、日米の対照のデータから描いていて、ここで手書きしていません。だから、章の節の囲みとこの表の数字は、いつも同じです。日本の欄の下には、日本の法令の版と確認の日があります。確度が「要確認」の項目と〔要確認〕の所は、一次資料で確かめきれていない所です。推測で埋めずに、そのまま読みます。</p>
<p>表の項目には、転移高度（transition altitude）と最低安全高度（minimum safe altitude）があります。進路権（優先権、right-of-way）・曲技飛行（aerobatic flight）・出発前の確認（preflight action）もあります。表の下の「習った節」から、その項目に初めて会った節へ戻れます。日本の決まりの本文は、第 7 部で学びます。この表は、その入口です。</p>
${bk.key('Sanford で飛ぶときは米国の欄、日本の学科と日本の空では日本の欄', '数字は国と一緒に覚える。片方の国の数字を、もう一方で使わない', '〔要確認〕は推測で埋めない')}
${bk.warn('<b>ここに注意：</b>日本の欄は、日本で飛ぶときの決まりの一部です。日本の学科では、このほかの決まりも問われます。この表の日本の欄を覚えただけで、日本の決まりを学んだことにはなりません。')}
${jurTables()}
<h4>確かめの問い</h4>
${bk.q('Sanford から VFR で飛ぶ日の燃料の予備は、表のどちらの欄で決めますか。日本の自家用の VFR と比べて、何が違いますか。',
  `米国の欄で決めます。米国の規則は、VFR でも積む燃料の量を決めています。日本の法令は、自家用や訓練の VFR の燃料の量を決めていません。それでも、量の決まりがないことは、予備がいらないという意味ではありません。機長は出発前に燃料を確かめ、訓練では学校の決まりの量を積みます。${see('perf.fuel', '燃料の計画と予備')}`)}
${bk.q('高度計を標準の気圧に切り替える高さは、日米で同じですか。切り替える高さより下では、何に合わせますか。',
  `同じではありません。日本の方が、低い高さで切り替えます。その高さより下では、どちらの国も、その地域の気圧に合わせた規正値を使います。米国では経路の近くの局の規正値、日本では QNH です。Sanford で覚えた高さを、日本の空でそのまま使いません。${see('basics.alt', '高度の種類と高度計の基準')}${see('inst.alt', '高度計と昇降計')}`)}
${bk.q('米国の飲酒の決まり（飲んでからの時間と濃度）を守れば、日本でも飛んでよいと言えますか。',
  `言えません。日本の決まりは、原則として、体にアルコールが残る状態で業務をしないことを求めます。日本の目安の濃度は、米国の濃度の値より低く、自家用の操縦者も対象です。どちらの国でも、時間を守ったことは、安全に飛べる証拠になりません。${see('hf.self', '自分の体調：IMSAFE')}`)}
${bk.q('雲から離れる決まりで、米国の「雲の下」の数字と、日本の「上方」の数字は、同じ考えの言い方ですか。',
  `同じ考えです。米国の規則は、雲から離れる距離で書いています。日本の決まりは、機体のまわりの範囲に雲がないことで書いています。飛行機が雲の下にいれば、雲は機体の上方にあります。だから、日本の「上方」の数字は、米国の「雲の下」の数字に当たります。数字そのものは国で違うので、表で確かめます。${see('law.vfr', '有視界飛行（VFR）の気象条件')}`)}
` },
    ],
    terms: [
      ['Visual flight rules (VFR) / Instrument flight rules (IFR)', '有視界飛行方式・計器飛行方式', '飛び方の決まり'],
      ['Visual / Instrument meteorological conditions (VMC / IMC)', '有視界気象状態・計器気象状態', '天気の区分。飛び方の決まりとは別の軸'],
      ['Critical angle of attack', '臨界迎え角', '超えると、どんな速度でも失速する'],
      ['Load factor', '荷重倍数', '高度を保つ旋回で 1 ÷ cos（バンク角）'],
      ['Density altitude / Pressure altitude', '密度高度・気圧高度', 'Archer の性能の図には気圧高度と外気温を入れる'],
      ['Ceiling', '雲高', 'BKN・OVC のいちばん低い層（空港の地面から）'],
      ['Wind correction angle', '偏流修正角', '機首を風上へ向ける角度'],
      ['Transition altitude', '転移高度', '標準の気圧に切り替える高さ。国で違う'],
    ],
    examples: [
      'TAS 100 kt・正面から 20 kt の風 → GS 80 kt（真横から 20 kt なら約 102 kt）。',
      '高度を保つ 60° バンクの旋回 → 荷重倍数 2、失速速度は約 1.41 倍。',
      'SCT008 BKN015 OVC030 → 雲高 1,500 ft（空港の地面から）。',
      '1,500 m → 1,500 ÷ 0.3048 ≈ 4,921 ft（約 4,900 ft）。',
    ],
    cautions: [
      'このまとめは第 1 部の要点だけ。答えの理由が言えないときは、リンクの節へ戻る。',
      '日米の表の〔要確認〕は、一次資料で確かめるまで推測で埋めない。',
      '実機の数値と手順は、その機体の POH・操縦教員・学校の決まりが優先。',
    ],
    // sec: the section the reason cites (check-path.mjs counts the earlier part's share: DESIGN 5 criterion 23)
    quiz: [
      { q: '1 NM（海里）は何 m ですか。', choices: ['1,609 m', '1,852 m', '1,000 m', '3,048 m'], answer: 1, sec: 'basics.units', why: '1 NM ＝ 1,852 m（定義の値）。1,609 m は法定マイル（SM）で、米国の視程に使う単位（節「単位と換算」。NIST の換算係数）。' },
      { q: '高度計を空港の QNH に合わせて、地上に止まっています。高度計が示すのは？', choices: ['ほぼ空港の標高', '0 ft', '気圧高度', '密度高度'], answer: 0, sec: 'basics.alt', why: 'QNH に合わせた高度計は、地上では空港の標高を示す。標準の気圧に合わせると気圧高度を示す。密度高度は性能の計算に使う数で、高度計の表示ではない（節「高度の種類と高度計の基準」。PHAK 第 8 章）。' },
      { q: 'IFR で飛んでいる機が、雲のない晴れた空域に出ました。正しいのは？', choices: ['自動的に VFR に変わる', '計器気象状態（IMC）になる', 'IFR のまま、VMC の中を飛んでいる', '見張りがいらなくなる'], answer: 2, sec: 'basics.rules', why: '飛行方式（VFR・IFR）と気象状態（VMC・IMC）は別の軸。IFR は VMC の中も飛び、そのときも見張りを続ける（節「飛行方式と気象状態は別の軸」。米国の 14 CFR 91.113(b)）。' },
      { q: '指示対気速度（IAS）が同じとき、高い所ほど真対気速度（TAS）は？', choices: ['小さくなる', '変わらない', '風で決まる', '大きくなる'], answer: 3, sec: 'basics.speed', why: '空気が薄い所では、速度計が同じ値を示すまで速く飛ぶので、TAS が大きくなる（節「速度の種類・風のベクトル・距離と時間」。PHAK 第 8 章）。' },
      { q: 'ほかの条件が同じで、機体が軽いときの失速速度は？', choices: ['低くなる', '高くなる', '変わらない', '臨界迎え角が変わるので決まらない'], answer: 0, sec: 'aero.stall', why: '失速速度は重量の平方根に比例する。軽いと下がり、重いと上がる。臨界迎え角は、同じ形態なら変わらない（節「失速のしくみと回復」。PHAK 第 5 章）。' },
      { q: '気化器式のエンジンで、固定ピッチのプロペラの機体です。気化器着氷の最初の兆候として正しいのは？', choices: ['油圧が急に上がる', '吸気圧力だけが下がり、回転は変わらない', '回転がじわじわ下がる', '排気ガスの温度が急に上がる'], answer: 2, sec: 'sys.carb', why: '固定ピッチでは、最初に回転が下がり、そのあと荒れることがある。回転が変わらず吸気圧力が下がるのは、定速プロペラの機体（節「気化器着氷（キャブレターアイス）」。PHAK 第 7 章）。' },
      { q: 'ピトー管の入口と排水口の両方が詰まったまま上昇すると、速度計は？', choices: ['0 に向かって下がる', '高度計のように増えて見える', '正しく表示する', '詰まった値のまま変わらない'], answer: 1, sec: 'sys.g1000', why: '管の中の圧力が閉じ込められ、外の静圧だけが下がるので、上昇で速度が増えて見え、降下で減って見える。入口だけが詰まると 0 に向かう（節「ピトー静圧・AHRS・ADC と計器の表示」。PHAK 第 8 章）。' },
      { q: '密度高度が高くなる条件の組み合わせは？', choices: ['寒い・気圧が高い・乾いている', '寒い・気圧が低い・乾いている', '暑い・気圧が高い・乾いている', '暑い・気圧が低い・湿っている'], answer: 3, sec: 'perf.da', why: '空気は、暑い日・気圧の低い日（高い所）・湿った日ほど薄くなり、密度高度が高くなる（節「密度高度」。PHAK 第 4 章）。' },
      { q: '米国の METAR の「FEW010 SCT025 BKN040 OVC080」の雲高（シーリング）は？', choices: ['4,000 ft', '1,000 ft', '2,500 ft', '8,000 ft'], answer: 0, sec: 'wx.metar', why: '雲高は、BKN か OVC のいちばん低い層。BKN040 の 4,000 ft（空港の地面から）。FEW・SCT は雲高にならない（節「METAR の読み方」。米国の 14 CFR 1.1 の ceiling の定義）。' },
      { q: '交信で使う「Roger」の意味として正しいのは？', choices: ['はい（そのとおり）', '最後の送信を全部受け取った', '指示に従う', 'もう一度言ってほしい'], answer: 1, sec: 'comm.words', why: 'Roger は「受け取った」だけで、はい・いいえの答えには使わない。「はい」は Affirmative、「従う」は Wilco、「もう一度」は Say again（節「標準用語の正しい意味」。米国の Pilot/Controller Glossary）。' },
    ],
    refs: [R.phak, R.phak4, R.phak5, R.phak7, R.phak8, R.phak16, R.phak17, R.afh5, R.wx, R.aim, R.pcg, R.cfr1, R.cfr91, R.archerPoh, R.nist811, R.egovKoku, R.egovKokuKisoku, R.mlitAlcohol, R.mlitSyllabus],
    lessons: [] });

  // =====================================================================================================================
  // The door of Part 1 (DESIGN 3.2「部の扉」): the part's goals / the lessons table (lesson → the sections to read first
  // → the ground-school test) / 6–10 sections to recall (Part 1: from 序部) / the order of「まず読む節」, the chapters in
  // four groups. The goals and the reading method are rewritten from the basic course's chapter doors (kisoNN.cover「この
  // 章でできるようになること」) and its opening sections kiso01.x1・kiso02.x1 (the edition's record and the warnings are not
  // used: DESIGN 3.2). Plain data: the reading order is computed from the book (doorHtml), the lessons from FL.syllabus.
  const DOOR_P1 = Object.freeze({
    lead: Object.freeze([
      '第 1 部は、英語の座学で学ぶ地上学科です。飛行機が飛ぶ原理、機体と計器、性能と重量、気象と航法の基礎、規則と交信、人間の能力を学びます。',
      '原理は、国を問わず共通です。規則と交信の章は、Sanford で飛ぶための米国の決まりです。「ロンドンの座学で米国の規則を学ぶ」という意味ではありません。座学の中身と、英国の試験を受けるかは、公表されていません。',
      '日本の数字は、その場で日米の対照の囲みに並べてあります。日本の決まりの本文は第 7 部、日米の違いのまとめは第 1 部の最後の章です。',
    ]),
    goals: Object.freeze([
      '翼のまわりの空気の流れと 4 つの力で、揚力・抗力・失速・旋回を説明し、単位をそろえて計算できます。',
      '機体・エンジン・燃料・電気の正常な流れをたどり、ある故障がどの働きと表示に響くかを、根拠をつけて言えます。',
      '計器の表示を情報源までたどり、同じ情報源の表示どうしでは確かめ合いにならないことを説明できます。',
      'POH の図表で性能と重量・重心を求め、表の前提・補正・余裕を分けて確かめられます。',
      '天気のしくみを説明し、METAR と TAF を、飛ぶ場所と時刻に結び付けて読めます。',
      '位置と方位の基準をそろえ、風を考えて針路・対地速度・時間・燃料を求められます。',
      '米国の規則を予定する飛行に当てはめ、許可・指示・情報を聞き分けて、英語で交信できます。',
      '自分の体と注意の限界を知り、確かめ方と情報の伝え方を選び、行くかやめるかを決められます。',
    ]),
    groups: Object.freeze([
      Object.freeze({ t: '原理と機体', chapters: Object.freeze(['aero', 'sys']) }),
      Object.freeze({ t: '計器・性能・重量', chapters: Object.freeze(['inst', 'perf', 'wb']) }),
      Object.freeze({ t: '気象と航法の基礎', chapters: Object.freeze(['wx', 'navb']) }),
      Object.freeze({ t: '規則・交信・人間', chapters: Object.freeze(['law', 'radio1', 'radio2', 'radio3', 'radio4', 'radio5', 'hf', 'adm']) }),
    ]),
    summary: 'g1',
    // the lessons of the part (FL.syllabus: the stage whose phase is p1) → the ground-school test bank to take after
    quizOf: Object.freeze({ k1: 'q_sys', k2: 'q_sys', k3: 'q_comm', k4: 'q_radio', k5: 'q_comm', k6: 'q_radio' }),
    // 思い出す節 (DESIGN 3.2: 6–10; Part 1 recalls 序部). Only basics (CADET has it: no link to a chapter CADET drops)
    recall: Object.freeze(['basics.flight', 'basics.crew', 'basics.units', 'basics.time', 'basics.speed', 'basics.alt', 'basics.rules', 'basics.docs']),
    howTo: Object.freeze([
      '1 回に 30〜45 分ずつ、章の順に読みます。次へ進む前に、節の最初の図を見ないで描き直せるかを確かめます。',
      '序部で学んだ 3 つの区別を使います。空気に対する速さと地面に対する速さ、機体の姿勢と迎え角、重さ（力）と質量です。',
      '計算は、使った式・単位・仮定を書き残します。度とラジアンを混ぜず、途中で丸めすぎません。',
      '系統（エンジン・燃料・電気・計器）は、目的、供給源から使う所までの線、弁・スイッチ・保護装置・計器が測る場所、いつもの供給源を失ったときの代わり、の順にたどります。',
      '数字は 3 種類を区別します。原理の式の値、この本の例の値（教材値と例題の値）、実機の限界の値です。実機の限界は、その機体の承認された資料（POH）で確かめます。',
      'FAA の資料は、原理と米国の決まりの出典です。日本の資格と決まりの要件に読み替えません。',
    ]),
    from: Object.freeze(['kiso01.x1', 'kiso02.x1']),
  });
  const p1 = B.PARTS.find(p => p.id === 'p1');
  if (p1 && !p1.door) p1.door = DOOR_P1;

  // a proposal of the drawing (FL.book.doorHtml(partId) in book-core.js): only the book's data, FL.syllabus and FL.quiz
  const attr = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function doorHtml(partId) {
    const p = B.PARTS.find(x => x.id === partId), d = p && p.door; if (!d) return '';
    const ch = id => B.CHAPTERS.find(c => c.id === id);
    const secBtns = ids => ids.map(id => { const f = B.findSection(id); return f ? see(id, attr(f.sec.t)) : ''; }).join('');
    let s = `<div class="bk-door" data-part="${attr(p.id)}"><h3>${attr(p.title)}</h3>${(d.lead || []).map(t => `<p>${t}</p>`).join('')}`;
    if (d.goals) s += `<h4>この部の目標</h4><ul>${d.goals.map(t => `<li>${t}</li>`).join('')}</ul>`;
    if (d.groups) {
      s += '<h4>章のまとまりと、まず読む節の順</h4>';
      for (const g of d.groups) {
        const items = g.chapters.map(ch).filter(Boolean).map(c => {
          const first = c.secs.filter(x => !x.deep), deep = c.secs.length - first.length;
          return `<li><b>第 ${c.n} 章　${attr(c.t)}</b>：${first.map(x => see(x.id, attr(x.t))).join('')}${deep ? `（発展 ${deep} 節）` : ''}</li>`;
        });
        if (items.length) s += `<h5>${attr(g.t)}</h5><ol>${items.join('')}</ol>`;
      }
      const g = d.summary && ch(d.summary);
      if (g && g.secs.length) s += `<p>最後に：${see(g.secs[0].id, `第 ${g.n} 章　${attr(g.t)}`)}</p>`;
    }
    const stage = FL.syllabus && FL.syllabus.STAGES.find(st => st.phase === p.phase);
    if (stage && stage.lessons.length) {
      const bank = id => { const b = FL.quiz && FL.quiz.BANKS.find(x => x.id === id); return b ? `学科テスト：${attr(b.title)}` : '—'; };
      s += '<h4>課目と、先に読む節・学科テスト</h4>' + bk.t(['課目', '先に読む節', '学科テスト'],
        stage.lessons.map(l => [`${attr(l.id)}　${attr(l.title || l.t || '')}`, secBtns(l.book || []), d.quizOf && d.quizOf[l.id] ? bank(d.quizOf[l.id]) : '—']));
    }
    if (d.recall) s += `<h4>思い出す節（${partId === 'p1' ? '序部' : '前の部'}）</h4><p>${secBtns(d.recall)}</p>`;
    if (d.howTo) s += `<h4>読み方</h4><ul>${d.howTo.map(t => `<li>${t}</li>`).join('')}</ul>`;
    if (d.from) s += B.secMarks({ id: `door.${partId}`, from: d.from });
    return `${s}</div>`;
  }

  // =====================================================================================================================
  // 「JCAB 学科の道」 (DESIGN 3.3 付録: 科目ごとに読む節の順・問題集・模擬試験; R2 shows the front part's and Part 1's share,
  // R4/W47 completes it). The subjects of the JCAB written tests that intro.exams names (公開情報：事業用操縦士（飛行機）の
  // 5 科目と計器飛行証明の「計器飛行一般」), each with the headings of the 出題範囲参考 it covers (JCAB-MAP.json ids: cpl.N /
  // ppl.N / ir), the banks of the ground-school test whose questions are on common principles (never the US-rule banks for
  // the law and radio subjects), and a note. The sections and their order come from the book: every section in a part
  // up to `upTo` whose data `jcab` names a heading of the subject, in reading order, 「まず読む節」 first, then 発展.
  const JCAB_ROAD = Object.freeze({
    title: 'JCAB 学科の道', upTo: 'p1',
    lead: Object.freeze([
      'JCAB の学科試験の「出題範囲参考」の見出しを、この本の節に割り当てました。このページは、その割り当てから、科目ごとに読む節を本の順に並べたものです。',
      'いまは、序部と第 1 部の分です。第 2〜6 部と第 7 部の節が入ると、同じ形で増えます。',
      '国を問わない原理（航空工学・航空気象・空中航法の多く）は、第 1 部で学べます。航空法規と航空通信は、ほとんどが日本の決まりなので、第 7 部が受け持ちます。',
      '「発展」の節は、JCAB の学科で深く問われる原理です。まず読む節を終えてから読みます。',
      '訓練生がいつ、どの言葉で学科試験を受けるかは、公表されていません（序部の「試験の地図」）。',
    ]),
    subjects: Object.freeze([
      Object.freeze({ id: 'eng', t: '航空工学', heads: Object.freeze(['cpl.1', 'ppl.1']), banks: Object.freeze(['q_aero', 'q_sys', 'q_perf']), note: '飛行の原理・機体と系統・計器・性能・重量と重心。構造の強さと無線工学は発展の節です。' }),
      Object.freeze({ id: 'wx', t: '航空気象', heads: Object.freeze(['cpl.2', 'ppl.2']), banks: Object.freeze(['q_wx']), note: '大気・風・雲・前線・気象の障害・METAR と TAF。日本の気象情報と天気図は第 7 部です。' }),
      Object.freeze({ id: 'nav', t: '空中航法', heads: Object.freeze(['cpl.3', 'ppl.3']), banks: Object.freeze(['q_hf']), note: '航法の基礎（位置・方位・風・時間と燃料）と、人間の能力と判断。地図での計画と無線航法は第 3 部です。' }),
      Object.freeze({ id: 'comm', t: '航空通信', heads: Object.freeze(['cpl.4', 'ppl.4']), banks: Object.freeze([]), note: '日本の管制と交信は第 7 部です。第 1 部の英語の交信は米国の言い方で、比べる相手として読みます。' }),
      Object.freeze({ id: 'law', t: '航空法規', heads: Object.freeze(['cpl.5', 'ppl.5']), banks: Object.freeze([]), note: '日本の航空法と施行規則は第 7 部です。第 1 部の規則は米国の規則で、第 1 部のまとめの日米の表が入口です。' }),
      Object.freeze({ id: 'ifr', t: '計器飛行一般', heads: Object.freeze(['ir']), banks: Object.freeze(['q_wx', 'q_hf']), note: '第 1 部では、計器のしくみ・気象・空間識失調の基礎を学びます。計器飛行の方式は第 4 部と第 7 部です。' }),
    ]),
    bridge: 'g1.japan',
  });
  // → [{ subject, first: [{ id, t, ch, n }], deep: […], chapters: [chapter id…] }] for the parts up to road.upTo
  function jcabRoad(road = JCAB_ROAD) {
    const upTo = B.PARTS.findIndex(p => p.id === road.upTo);
    const parts = new Set(B.PARTS.slice(0, upTo + 1).map(p => p.id));
    return road.subjects.map(sub => {
      const hit = id => sub.heads.some(h => id === h || id.startsWith(`${h}.`));
      const first = [], deep = [], chapters = [];
      for (const c of B.CHAPTERS) {
        if (!parts.has(c.part)) continue;
        for (const s of c.secs) {
          if (!(s.jcab || []).some(hit)) continue;
          (s.deep ? deep : first).push({ id: s.id, t: s.t, ch: c.id, n: c.n });
          if (!chapters.includes(c.id)) chapters.push(c.id);
        }
      }
      return { subject: sub, first, deep, chapters };
    });
  }
  function jcabRoadHtml(road = JCAB_ROAD) {
    const list = jcabRoad(road), ch = id => B.CHAPTERS.find(c => c.id === id);
    const bankTitle = id => { const b = FL.quiz && FL.quiz.BANKS.find(x => x.id === id); return b ? attr(b.title) : ''; };
    let s = `<div class="bk-road"><h3>${attr(road.title)}</h3>${road.lead.map(t => `<p>${t}</p>`).join('')}`;
    for (const r of list) {
      s += `<h4>${attr(r.subject.t)}</h4><p>${r.subject.note}</p>`;
      s += r.first.length ? `<ol>${r.first.map(x => `<li>${see(x.id, attr(x.t))}（第 ${x.n} 章）</li>`).join('')}</ol>` : '<p>この部までの本には、まだ節がありません。</p>';
      if (r.deep.length) s += `<p>発展：${r.deep.map(x => see(x.id, attr(x.t))).join('')}</p>`;
      const quizzes = r.chapters.map(ch).filter(c => c && (c.quiz || []).length).map(c => `第 ${c.n} 章`);
      const banks = r.subject.banks.map(bankTitle).filter(Boolean);
      if (quizzes.length || banks.length) s += `<p>問題：${quizzes.length ? `章末の確認問題（${quizzes.join('・')}）` : ''}${quizzes.length && banks.length ? '、' : ''}${banks.length ? `学科テスト（${banks.join('・')}）` : ''}</p>`;
    }
    const br = B.findSection(road.bridge);
    if (br) s += `<p>日米の違いのまとめ：${see(road.bridge, attr(br.sec.t))}</p>`;
    s += '<p>JCAB 形式の 4 択と、科目別の模擬試験は、まだこの本にありません。第 7 部と一緒に入ります。</p>';
    return `${s}</div>`;
  }
  // the draft's pieces, for the checks and the integrator (no product reads this file)
  FL.draftG1 = Object.freeze({ DOOR_P1, JCAB_ROAD, JUR_GROUPS, doorHtml, jcabRoad, jcabRoadHtml, jurGroups });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
