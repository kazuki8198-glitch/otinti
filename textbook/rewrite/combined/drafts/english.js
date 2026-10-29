// DRAFT (W10, R1) — the front part's chapter 'english'「英語で学ぶ準備」 (textbook/rewrite/combined/DESIGN.md 3.3 序部 第 3 章:
// ★en.terms 用語の三つ組みと略語, ★en.class 英語の授業と教官との話し方). No product reads this file (DESIGN 6.2 rule 5, 7.4).
// It is a plain script like book-0.js: when the chapter is registered, the B.add(...) below goes into flight-lab/src/book-0.js
// as it is, after 'basics' (before: 'aero', so the order is intro → basics → english → sim, book-5.js putting sim in front
// of 'aero' later), the figures of english-figs.js go into book-figs.js, and the references in NEW_R that R does not have
// yet go into book-core.js's R (cfr1・nist811 are the same entries as drafts/basics.js, mlitSyllabus as drafts/intro.js).
// In the same commit CADET's DROP_CHAPTERS gets 'english' (DESIGN 6.3: CADET leaves the chapter out).
// Check it with the figures:
//   node textbook/rewrite/combined/tools/check-chapter.mjs textbook/rewrite/combined/drafts/english-figs.js textbook/rewrite/combined/drafts/english.js
// What it is built from (DESIGN 3.3: both sections are new; no basic-course section is used, so no `from`):
//  - en.terms: the table of terms FL.terms (flight-lab/src/book-terms.js, W04) — aero.md 7 の 9 (the missing official
//    Japanese–English pairs). Every name in its tables is read from FL.terms when the section is drawn (the ids below
//    choose which entries), so the section follows the table: no name of the table is written here by hand. Without
//    FL.terms (a product that does not load book-terms.js) the tables are left out and a short line says where they are.
//  - en.class: human.md 7 の G12 (asking, saying again, unable, I don't understand, power distance), the numbers and
//    units, and the UK/US differences (DESIGN 3.3: whether the London ground school uses the British (ICAO) way is
//    〔要確認〕: UNVERIFIED U.london-icao — written with bk.est, nothing guessed).
// One concept, one address (DESIGN 3.2): the radio words (comm.words・comm.clarify), the radio numbers (comm.numbers),
// the FAA/ICAO phraseology (comm.icao) and the authority gradient (crm.crm) are recalled in a line with a 「予告」 link,
// not explained again. The control handover (address ground.crew, not in the book yet) is only named, without a link
// (DESIGN 6.2 rule 13). New terms not in FL.terms (権力格差・標準用語・ふつうの言葉・権威勾配・座学の教官) are asked of
// W04 in the reports (W10-english.md, revise-english.md).
// Revised by revise-english (2026-10-29) after the fact check (reports/factcheck-english.md) and the beginner's read
// (reports/reader-english.md): the words of the 「名前が大きく違う語」 table are ones whose three names really name one
// thing and whose common name is an everyday or katakana name; 教官 is split into 座学の教官 (ground instructor) and
// 操縦教員 (flight instructor, the table's official name); the UK/US comparison is a sub-heading of the body, not a US box.
// Every claim (a number with a unit, a rule, a cited definition) is in english.claims.json with its tag and source.
(function (FL) {
  'use strict';
  const B = FL.book, R = B.R, bk = B.bk, FIG = FL.bookFigs;
  for (const k of ['enTriple', 'enTalk']) if (typeof FIG[k] !== 'function') throw new Error(`drafts/english.js: FL.bookFigs.${k} is missing (load drafts/english-figs.js first)`);

  // new references (to be added to book-core.js's R when the chapter is registered; each URL opened on 2026-10-27,
  // the ones marked 10-29 on 2026-10-29 by revise-english)
  const NEW_R = {
    cfr1: { label: '14 CFR 1.1 General definitions（機長・フライトレベル・各種の対気速度・マッハ数の定義）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-A/part-1/section-1.1' },
    nist811: { label: 'NIST SP 811 Guide for the Use of the International System of Units, Appendix B.9（換算係数：ft・mile・nautical mile・lb・gal・inHg・°F）', url: 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9' },
    mlitSyllabus: { label: '国土交通省「航空従事者等学科試験解答及び過去問」（学科試験の出題範囲参考（シラバス）と例題集）', url: 'https://www.mlit.go.jp/koku/koku_fr10_000025.html' },
    ac6028b: { label: 'FAA AC 60-28B FAA English Language Standard for an FAA Certificate Issued Under 14 CFR Parts 61, 63, 65, and 107（2017-06-02。2025-05-19 の編集の更新 2）', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_60-28B_Ed_Upd_2_(5-19-25).pdf' },
    skySocio: { label: 'SKYbrary: Socio-Culture (OGHFA BN)（国の文化と操縦室：権力格差の定義と例）', url: 'https://skybrary.aero/articles/socio-culture-oghfa-bn' },
    // 10-29
    cfr12: { label: '14 CFR 1.2 Abbreviations and symbols（V で始まる速度の記号：VX・VY・VA・VNE・VMC など）', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-A/part-1/section-1.2' },
    unSystem: { label: 'United Nations: The UN System（国連の専門機関の一覧。ICAO は世界の航空の標準を決める）', url: 'https://www.un.org/en/about-us/un-system' },
    caaRole: { label: 'UK Civil Aviation Authority: Roles and responsibilities（英国の航空の規制機関）', url: 'https://www.caa.co.uk/about-us/the-civil-aviation-authority/roles-and-responsibilities/' },
    jcabElp: { label: '国土交通省 航空局「航空英語能力証明実地試験実施基準」別添 1（ICAO の言語習熟度評価基準。令和 4 年 3 月 29 日最終改正）', url: 'https://safetyp.cab.mlit.go.jp/wp-content/uploads/2023/06/4-020A_R040329_航空英語能力証明実地試験実施基準.pdf' },
    skyAbout: { label: 'SKYbrary: About SKYbrary（航空の安全の知識の電子の資料集。EUROCONTROL が始めた）', url: 'https://skybrary.aero/about-skybrary' },
    cambridgeDates: { label: 'Cambridge Dictionary, English Grammar Today: Dates（英国と米国の日付の書き方）', url: 'https://dictionary.cambridge.org/grammar/british-grammar/dates' },
    cambridgeMeas: { label: 'Cambridge Dictionary, English Grammar Today: Measurements（速さ・重さなどの言い方）', url: 'https://dictionary.cambridge.org/grammar/british-grammar/measurements' },
  };
  for (const [k, v] of Object.entries(NEW_R)) if (!R[k]) R[k] = v;
  const ref = k => R[k];

  // ---- the table of terms (FL.terms) -------------------------------------------------------------------------------
  const TERMS = () => (FL.terms && typeof FL.terms.byId === 'function' ? FL.terms : null);
  const term = id => {
    const T = TERMS(); const e = T ? T.byId(id) : null;
    if (T && !e) throw new Error(`drafts/english.js: "${id}" is not an entry of FL.terms (book-terms.js)`);
    return e;
  };
  // the parenthesis of a first use: （通称、English） or （略語：English）
  const paren = e => `（${[e.common[0], e.en].filter(Boolean).join('、')}）`;
  // （通称、略語：English）. When the common name is the abbreviation in plain letters (Vmc for V<sub>MC</sub>), it is
  // written 「V<sub>MC</sub>。Vmc とも書く」 (DESIGN 3.5); the abbreviation is left out when it is the English itself (NOTAM)
  const plainOf = s => String(s || '').replace(/<[^>]+>/g, '');
  const parenAbbr = e => {
    const ab = e.abbr && plainOf(e.abbr) !== e.en ? e.abbr : null, com = e.common[0];
    if (ab && com && com.toLowerCase() === plainOf(ab).toLowerCase()) return `（${ab}。${com} とも書く、${e.en}）`;
    return `（${[com, ab ? `${ab}：${e.en}` : e.en].filter(Boolean).join('、')}）`;
  };
  const full = e => `${e.formal}${parenAbbr(e)}`;
  // which entries the section shows (the names come from FL.terms). Only entries whose three names name one and the same
  // thing, and whose first common name is an everyday or katakana name (the section's own definition of 通称): not
  // walk-around (外部点検 is one part of the preflight inspection: 施行規則第 164 条の 15 第 2 項・AFH ch.2), spin and
  // landing-gear (きりもみ・降着装置 are the law's own words: 施行規則第 197 条の 3・第 79 条), turn-coordinator (JCAB's
  // 旋回傾斜計 also names the turn-and-slip indicator: PHAK p.8-16) or aoa (迎え角・迎角 differ by one kana)
  const TRIPLE = ['aileron', 'elevator', 'rudder', 'mixture', 'airspeed-indicator', 'attitude-indicator', 'heading', 'ceiling', 'taxi', 'runup', 'traffic-pattern', 'go-around', 'holding', 'cross-country', 'call-sign', 'clearance', 'right-of-way', 'solo', 'flight-instructor', 'oei'];
  // pairs that name different things (a short note of the difference: the full explanation is at each term's address)
  const PAIRS = [
    ['instrument-flight', 'ifr', '計器だけを見て飛ぶ飛び方と、飛び方の決まりの名前'],
    ['vmc', 'vmc-speed', '天気の区分と、多発機で片方の発動機が止まったときに方向を保てる最小の速度'],
    ['pic', 'captain', 'その飛行の最終の権限と責任を持つ役割と、会社の職位'],
    ['go-around', 'missed-approach', '着陸をやめてやり直すことと、計器進入（計器を頼りに滑走路へ向かう、決められた飛び方）を着陸まで続けられないときの、決められた手順'],
    ['taxi', 'ground-roll', '自分の力で地上を動くことと、離着陸で滑走路を走る距離'],
    ['variation', 'deviation', '場所で決まる真北と磁北の差と、その機体のコンパスだけの誤差'],
    ['notam', 'ais', '施設や方式などの変更を急いで知らせるものと、AIP やノータムなどの総称'],
  ];
  // (not 'ils': its official name 計器着陸装置 holds 着陸装置, which the first-use check would count as landing gear's first use)
  const ABBR = ['ias', 'tas', 'groundspeed', 'vx', 'vy', 'va', 'vne', 'vfr', 'imc', 'taf', 'atis', 'aip', 'afm', 'eta'];
  const ASCII_NAMES = ['pf', 'pm', 'pfd', 'poh'];   // the official name is the abbreviation itself (PF before PFD: the first use)
  const SPELL = [['takeoff', e => e.en], ['urgency', e => e.common[0]], ['mapt', e => e.abbr]];   // US form → ICAO form (FL.terms icao)

  function tripleTable() {
    return bk.t(['正式名', '（通称、English）'], TRIPLE.map(id => { const e = term(id); return [e.formal, paren(e)]; }));
  }
  function pairTable() {
    return bk.t(['一方', 'もう一方', '違い'], PAIRS.map(([a, b, note]) => [full(term(a)), full(term(b)), note]));
  }
  function abbrTable() {
    return bk.t(['略語', '正式名（English）'], ABBR.map(id => { const e = term(id); return [e.abbr, `${e.formal}（${e.en}）`]; }));
  }
  // the PF・PM・PFD・POH entries keep a short meaning in `common` (not an everyday name), so the heading says 意味
  const asciiTable = () => bk.t(['正式名', '（意味、English）'], ASCII_NAMES.map(id => { const e = term(id); return [e.formal, paren(e)]; }));
  // one form for every item: 名前（English。米国の形／ICAO・英国の形）
  const SPELL_WHAT = { takeoff: '', urgency: '合図の言葉 ', mapt: '略語 ' };
  const spellItems = () => SPELL.map(([id, us]) => { const e = term(id), u = us(e); return `<li>${e.formal}（${e.en}${u === e.en ? '' : `。${SPELL_WHAT[id] || ''}${u}`}／${e.icao}）</li>`; }).join('');
  const unverifiedList = T => T.list.filter(e => e.status === 'unverified');
  const unverifiedItems = T => unverifiedList(T).map(e => `<li>${e.formal}（${e.common.join('・')}、${e.en}）</li>`).join('');

  // ======================================================================= 序部 第 3 章
  B.add({ id: 'english', part: 'p0', before: 'aero', t: '英語で学ぶ準備', en: 'Getting ready to learn in English: one thing, three names, and talking with your instructors',
    summary: '同じものを指す 3 つの名前（日本の学科試験の資料と法令の正式名・ふだんの通称・米国の訓練の英語）を結びます。取り違えやすい語の組と、略語の書き方と読み方も学びます。後半は、英語の授業と、座学の教官・操縦教員との話し方です。聞き直す、分からない所を言う、できないと言う、数字と単位を言う、立場の差があっても言う、を練習します。',
    secs: [
      // ------------------------------------------------------------------ 1
      { id: 'en.terms', t: '用語の三つ組みと略語', scope: 'common', use: ['まとめ 1'], h: () => {
        const T = TERMS();
        const ail = term('aileron') || { formal: '補助翼', common: ['エルロン'], en: 'aileron' };
        const unv = T ? unverifiedList(T) : [];
        const unvMe = unv.length && unv.every(e => e.cat === 'me') ? `${unv.length === 2 ? 'どちら' : 'どれ'}も、多発機の章で学ぶ語です。` : '';
        const tables = T ? `
<h4>名前が大きく違う語</h4>
<p>通称と正式名が大きく違う語の例です。どの行も、3 つの名前が同じものを指します。意味は、それぞれの章で学びます。ここでは、名前の組に慣れておきます。</p>
${tripleTable()}
<h4>取り違えやすい組</h4>
<p>名前が似ている組や、ふだん同じ意味で使われがちな組です。どの組も、別のものを指します。片方だけを覚えると、取り違えます。違いの説明は、それぞれの章にあります。</p>
${pairTable()}
<p>ノータム（NOTAM）は、英語の Notice to Airmen の略です（米国の FAA の用語集 Pilot/Controller Glossary）。</p>
<h4>略語</h4>
<p>多くの略語は、英語の言葉の頭文字です。この本は、初めて出るところで「正式名（略語：English）」と開いて書きます。通称と略語の両方がある語は「正式名（通称、略語：English）」です。</p>
<p>速度の略語は、V の後ろに、速度の種類を表す小さな字を付けます（米国の 14 CFR 1.2 の一覧。V<sub>X</sub>・V<sub>Y</sub> など）。X・Y のように、英語の頭文字でない字もあります。</p>
${abbrTable()}
<p>略語の読み方は、2 通りあります。英国の CAP 413 は、よく使う略語を、無線でも文字のまま読んでよいと書いています。例に挙げる略語の 1 つは QNH（高度の基準に使う気圧の値の 1 つ。英語も QNH）で、Q・N・H と文字で読めます。一方で、CAP 413 は、天気の報告の略語 CAVOK を、CAV-O-KAY と 1 つの語のように読むと書いています。どちらで読むかは語によって違うので、初めて会う略語は、授業で読み方を聞いて確かめます（“How do you say this?”）。</p>
<p>略語がそのまま正式名になっている語もあります。</p>
${asciiTable()}
<h4>つづりと略語の違い</h4>
<p>米国（FAA）と ICAO・英国では、つづりや略語が違う語があります。この本は「米国の形／ICAO の形」の順に書きます。</p>
<ul>${spellItems()}
<li>飛行機（airplane／aeroplane。米国の 14 CFR 1.1、英国の CAP 413）</li>
<li>「待って」（stand by／standby。米国の FAA の用語集、英国の CAP 413）</li></ul>
<p>PAN-PAN は、緊急通信を知らせる、国際的な無線の合図の言葉です。緊急通信は、安全が心配で、すぐではないが早めの助けが要るときの通信です（米国の FAA の用語集）。MAP は地図（map）ではなく、進入復行点の略語です。</p>
<h4>この本の用語の表</h4>
<p>この本の専門用語は、1 つの用語の表（${T.list.length} 語）から取っています。部が変わっても、同じものを別の名前で呼びません。</p>
<p>用語の表には、日本語の名前を JCAB の資料でまだ確かめていない語が ${unv.length} つあります。${unvMe}この本は、確かめるまで用語の表の名前で書き、別名を並べます。</p>
<ul>${unverifiedItems(T)}</ul>` : `
<p>語の組の表は、この本の用語の表から作ります。用語の表を読み込む版では、ここに表が出ます。</p>`;
        return `
${bk.aim(`英語で習う訓練と、日本語で書かれた学科試験の資料・法令の両方で、同じものを同じものと分かるようにします。たとえば${ail.formal}${paren(ail)}のように、1 つのものに 3 つの名前があります。`)}
${FIG.enTriple()}
<p>この本は、専門用語を 3 つの形で結びます。</p>
<ul><li><b>正式名</b>：日本の国土交通省航空局（JCAB）の学科試験の資料と、日本の法令の書き方です。本文はこの名前で書きます。</li>
<li><b>通称</b>：ふだんの会話や、カタカナで書かれた資料で使う言い方です。</li>
<li><b>英語</b>：米国の連邦航空局（FAA）の資料と、英語の授業で使う言葉です。</li></ul>
<p>各章で初めて出るところでは「正式名（通称、English）」と書きます。その章の 2 回目からは、正式名だけを書きます。通称のない語は「正式名（English）」です。</p>
<p>3 つが同じものだと分かっていないと、英語で習ったことを、日本語の問題で使えません。反対も同じです。</p>
<p>英語の言い方は、国によって違う語もあります。この章は、米国のほかに、国際的な決まりと英国の資料も引きます。</p>
<ul><li><b>ICAO</b>：国際民間航空機関（International Civil Aviation Organization）です。世界の航空の標準を決める、国際連合の専門機関です。</li>
<li><b>CAA</b>：英国の航空の規制機関、民間航空局（Civil Aviation Authority）です。</li>
<li><b>CAP 413</b>：CAA の無線の手引き（Radiotelephony Manual）です。ICAO の決まりと英国の規則をもとに、英国の無線の言い方をまとめています。</li></ul>
${tables}
${bk.key('1 つのものに 3 つの名前：正式名・通称・英語', '各章の初出は「正式名（通称、English）」、2 回目から正式名', '略語は初出で開く。取り違えやすい組は並べて覚える')}
${bk.warn('<b>ここに注意：</b>表の英語は、米国の FAA の言い方です。ICAO と英国の資料では、同じものを別の言い方やつづりで書くことがあります。分からなければ、授業の中で確かめます。')}
${bk.q(`${ail.en}・${ail.common[0]}・${ail.formal}。それぞれ、どこでよく会う名前？`, `${ail.en} は英語の授業と米国の資料、${ail.common[0]}はふだんの日本語の会話、${ail.formal}は日本の学科試験の資料と法令の名前です。3 つとも同じものを指します。`)}`;
      } },

      // ------------------------------------------------------------------ 2
      { id: 'en.class', t: '英語の授業と教官との話し方', scope: 'common', use: ['まとめ 1・まとめ 6'], h: () => `
${bk.aim('座学も飛行訓練も、英語で受けます。聞き取れない・意味が分からない・できない、を英語ではっきり言えるようにします。立場の差があっても、言うべきことを言います。')}
${FIG.enTalk()}
<p>${bk.fact('座学はロンドンで、授業はすべて英語で行うと公開されています。飛行訓練は米国の Sanford で、現地の操縦教員から受けます。')}くわしくは ${bk.see('intro.course', '公開されている訓練の流れ')} にあります。</p>
<p>この本は、座学で教える人を座学の教官（ground instructor）、飛行訓練で操縦を教える人を操縦教員と書き分けます。</p>
<h4>分かったふりをしない</h4>
<p>英語の授業でいちばん大切なのは、分かったふりをしないことです。分かっていないのに “Yes” や “OK” と答えると、相手は「伝わった」と受け取ります。その食い違いは、あとで操縦席で表に出ます。</p>
<p>分からないときは、どこが分からないかを言います。“I don't understand.” だけでは、相手はどこから説明し直せばよいか分かりません。</p>
${bk.t(['こんなとき', '言い方の例'], [
  ['聞き取れなかった', '“Sorry, could you say that again, please?”'],
  ['速くて追いつけない', '“Could you speak more slowly, please?”'],
  ['語の意味が分からない', '“What does ‘stabilator’ mean?”（stabilator は、知らない語の例）'],
  ['つづりを知りたい', '“How do you spell that?”'],
  ['一部だけ分からない', '“I didn\'t understand the part about the fuel system.”'],
  ['自分の理解を確かめたい', '“So, I check the fuel before I start the engine. Is that right?”（自分の言葉で言い直す）'],
  ['図で見たい', '“Could you show me on the diagram?”'],
])}
<p>自分の言葉で言い直すと、食い違いがその場で分かります。相手の言ったことを返して確かめる点は、無線の復唱（readback）と同じです。ただし、無線の復唱は自分の言葉にせず、受け取ったとおりに返します。</p>
<h4>操縦席で操縦教員と</h4>
<p>操縦席では、短く、はっきり言います。分からない指示を、推測で実行しません。飛行機はそのまま安定して飛ばしながら、すぐに聞き直します。</p>
<ul><li>聞こえなかった：“Sorry, say again?”</li>
<li>何をすればよいか分からない：“I'm not sure what you want me to do.”</li>
<li>自信がない・不安がある：“I'm not comfortable with this.”</li></ul>
<p>操縦を渡すときと受け取るときの決まった言い方は、第 2 部で学びます。</p>
<h4>無線では決まった言葉</h4>
<p>管制との無線では、意味の決まった言葉（標準用語、phraseology）を使います。聞き取れなければ “Say again” と言います。ゆっくり話してほしければ “Speak slower” です。指示に従えなければ “Unable” と言い、理由を添えます。</p>
<p>この 3 つは、米国の FAA の用語集（Pilot/Controller Glossary）にも、英国の CAP 413 にもあります。“Speak slower” は、授業の表の “speak more slowly” と形が違います。無線では、この形のまま、決まった言葉として使います。</p>
<p>無線では、ていねいな言葉（please・thank you など）を重ねず、短く言います。英国の CAP 413 は、ていねいな言葉の使いすぎを避けるよう書いています。使ってはいけない、という意味ではありません。米国の AIM も、交信をできるだけ短くするよう求めています。</p>
<p>決まった言葉で言えないことは、ふつうの言葉（plain language）で、短く言います。米国の AIM は、交信でいちばん大切なのは理解だと書いています。決まった言い方で足りなければ、伝わるまで必要な言葉を使います。無線の聞き直し方は ${bk.see('comm.clarify', '予告：わからないとき・従えないとき（第 1 部）')} で学びます。</p>
<h4>数字と単位の言い方</h4>
<p>授業や会話では、数字をふつうの英語で読みます。無線では、聞き違えないように、決まった読み方をします。</p>
${bk.t(['書き方', '授業・会話の例', '米国の無線の読み方'], [
  ['100 kt', 'one hundred knots', 'one zero zero knots'],
  ['3,500 ft', 'three thousand five hundred feet', 'three thousand five hundred'],
  ['10,000 ft', 'ten thousand feet', 'one zero thousand'],
])}
<p>表の無線の読み方は、米国の AIM の次の決まりによります。</p>
<ul><li>速度：数字を 1 けたずつ言い、最後に knots を付けます（米国の AIM 4-2-11）。</li>
<li>18,000 ft 未満の高度：千の位から上を 1 けたずつ言い、thousand を付けます（米国の AIM 4-2-9）。百の位は、five hundred のように続けます。10,000 ft なら、1 と 0 を言って one zero thousand です。米国の AIM の高度の例は、feet を付けていません。</li></ul>
<p>無線の数字の読み方の決まりは、${bk.see('comm.numbers', '予告：数字の言い方（第 1 部）')} にまとめてあります。</p>
<p>単位も、英語の名前で言います。kt（ノット）は、1 時間に何海里（NM：nautical mile）進むかで表す速さの単位です。knot という語に「1 時間あたり」がもう入っているので、“knots per hour” とは言いません。</p>
${bk.t(['記号', '英語の言い方', '日本語'], [
  ['kt', 'knots', 'ノット'], ['ft', 'feet', 'フィート'], ['ft/min（fpm）', 'feet per minute', '1 分あたりのフィート'], ['NM', 'nautical miles', '海里'], ['SM', 'statute miles', '法定マイル'],
  ['inHg', 'inches of mercury', 'インチ水銀柱（mercury は水銀）'], ['hPa', 'hectopascals', 'ヘクトパスカル'], ['℃', 'degrees Celsius', 'セルシウス度（摂氏）'], ['lb', 'pounds', 'ポンド'], ['US gal', 'gallons', '米ガロン'],
])}
<h4>英国と米国の書き方</h4>
<p>米国と英国では、同じ英語でも書き方が違うものがあります。</p>
${bk.t(['項目', '米国', '英国'], [
  ['飛行機・離陸のつづり', 'airplane・takeoff', 'aeroplane・take-off'],
  ['「待って」のつづり', 'stand by', 'standby'],
  ['日付 7/4/2026 の意味', '7 月 4 日（月が先）', '4 月 7 日（日が先）'],
])}
<p>無線の言い方にも違いがあります。「はい」は、米国の FAA の用語集では affirmative、英国の CAP 413 では affirm です。周波数などの小数点は、米国の AIM では point、英国の CAP 413 では decimal と言います。ほかの違いは ${bk.see('comm.icao', '予告：FAA と ICAO（英国）の言い方の違い（第 1 部）')} にあります。</p>
<p>${bk.est('ロンドンの座学が、どちらの書き方と言い方で教えるかは、公開されていません。')}最初の授業で、どちらで書くか、どちらで言うかを確かめます。日付は、月を英語の名前（Jul など）で書くと、取り違えません。</p>
<h4>立場の差があっても言う</h4>
<p>上の立場の人に、質問や反対を言いにくいと感じる人がいます。その感じ方の強さは、国の文化によって違います。</p>
<p><b>権力格差（power distance）</b>は、上司と部下の力の差を、部下の側がどれだけ大きく感じるかの尺度です。航空の安全の知識を集めた資料集 SKYbrary は、研究者 Hofstede のこの定義を挙げています。そして、英国などの権力格差の小さい国の例として、部下が上司に話しかけ、必要なら反対することを気楽に感じる、と書いています。</p>
<p>権力格差は、国の文化の傾向を表す言葉です。これに対して、権威勾配（authority gradient）は、その場のチームの中で、決める力がどれだけ 1 人に集まっているかを表します。1 人に集まるほど、勾配は急になります（SKYbrary）。</p>
<p>この本は、国ごとの点数や日本の位置を書きません。どちらの感じ方がよい、という話でもありません。訓練では、分からないことと気になることを、言葉にして伝えます。操縦教員と訓練生の間の権威勾配と、懸念の伝え方は ${bk.see('crm.crm', '予告：権威勾配と懸念の伝え方（第 6 部）')} で学びます。</p>
<p>英語が得意でなくても、短い型で言えます。</p>
<ul><li>“Excuse me, I have a question.”（質問があります）</li>
<li>“I'm not sure about the clouds ahead.”（前の雲が大丈夫か分かりません）</li>
<li>“I'm concerned about our fuel.”（燃料が気になります）</li>
<li>“Can we turn back?”（引き返しませんか）</li></ul>
<p>気づいたことは、早く・短く・具体的に言います。言いにくいことほど、早く言います。</p>
${bk.key('分からないまま “Yes” と言わない。分からない所を言う', '授業はふつうの英語、無線は決まった言葉と読み方', '気になることは、立場の差があっても早く短く言う')}
${bk.warn('<b>ここに注意：</b>この節の英文は、言い方の例です。無線の言葉と数字の読み方は、その国の決まり（米国は FAA、英国は CAA の CAP 413）と、学校の手順で確かめます。')}
${bk.us('<p>米国の 14 CFR は、学生操縦士（student pilot）の資格と自家用操縦士の資格の条件の 1 つに、英語の力を挙げています。英語を読み・話し・書き・理解できることです（61.83(c)・61.103(c)）。</p><p>米国の FAA の手引きの文書（AC：Advisory Circular）60-28B は、米国の航空英語の基準（AELS：Aviation English Language Standard）を示しています。この基準は、ICAO の言語の力の評価で、実用レベル（レベル 4、Operational Level 4）以上です。ICAO の評価はレベル 1〜6 の 6 段階で、レベル 4 は無線電話の通信に要る最低のレベルです。</p><p>米国の AC 60-28B は、学生操縦士の申請・単独飛行の承認・実地試験の前に、この英語の力を確かめるとしています。訓練の間も、操縦教員・座学の教官と訓練校が見続けます。基準の 1 つは、誤解に気づいたときに、確かめたり聞き直したりして解けることです。ログブックの承認や訓練の記録も、英語で書きます。</p>')}
${bk.q('授業の終わりに、座学の教官から “Any questions?” と聞かれた。説明の後半が分からなかった。何と言う？', '“Yes. I didn\'t understand the second part, about … . Could you explain it again?” のように、分からない所を具体的に言います。黙っていると、分かったと受け取られます。')}
${bk.sim('数字の読み方は課目「英語交信①：アルファベットと数字の言い方」で、英語の聞き取りは課目「英語交信④：聞き取り（音声）」で練習できます。', ['k3', '英語交信①'], ['k6', '英語交信④'])}` },
    ],
    terms: [
      ['Official name / common name', '正式名・通称', 'この本の用語の書き方。正式名は日本の学科試験の資料と法令の書き方、通称はふだんの言い方'],
      ['Abbreviation', '略語', '多くは英語の言葉の頭文字。この本は初出で「正式名（略語：English）」と開く'],
      ['Phraseology', '標準用語', '無線で使う、意味の決まった言葉（米国は Pilot/Controller Glossary、英国は CAP 413）'],
      ['Plain language', 'ふつうの言葉', '標準用語で言えないときに使う、短い英語'],
      ['Say again / Speak slower / Unable', 'もう一度・ゆっくり・従えない', '無線の標準用語。Unable には理由を添える'],
      ['Ground instructor / flight instructor', '座学の教官・操縦教員', '座学で教える人と、飛行訓練で操縦を教える人'],
      ['Power distance', '権力格差', '上司と部下の力の差を、部下の側がどれだけ大きく感じるか（Hofstede の定義）。国の文化の傾向'],
      ['Authority gradient', '権威勾配', 'その場のチームの中で、決める力がどれだけ 1 人に集まっているか'],
      ['Aviation English Language Standard (AELS)', '米国の航空英語の基準', 'FAA の AC 60-28B。ICAO の実用レベル（レベル 4）以上'],
    ],
    examples: [
      '補助翼（エルロン、aileron）：日本の学科試験の資料の名前・ふだんの言い方・英語の授業の言い方。',
      '聞き取れなかったとき：授業では “Could you say that again, please?”、無線では “Say again.”。',
      '速度 100 kt は、授業では one hundred knots、米国の無線では one zero zero knots と読む。',
    ],
    cautions: [
      'この章の英文は言い方の例です。無線の言葉と読み方は、その国の決まりと学校の手順で確かめます。',
      '分からないまま “Yes” と答えないでください。分からないことは、その場で聞き直します。',
    ],
    quiz: [
      { q: '「補助翼」「エルロン」「aileron」の関係で、正しいものは？', choices: ['3 つとも、同じものを指す名前', '補助翼は旅客機だけにある部品の名前', 'エルロンは英国だけで使う英語', 'aileron は ICAO の資料だけの言葉'], answer: 0, why: '正式名（日本の学科試験の資料と法令）・通称（ふだんの言い方）・英語（米国の FAA の資料と英語の授業）は、同じものの 3 つの名前（「用語の三つ組みと略語」の節。用語の表は国土交通省の学科試験の出題範囲参考などで確かめた）。' },
      { q: '授業で、座学の教官の説明の一部が分からなかった。いちばんよい言い方は？', choices: ['“Yes.” と答えて、あとで自分で調べる', '“I don\'t understand.” とだけ言う', '“I didn\'t understand the part about … . Could you explain it again?”', '黙ってうなずく'], answer: 2, why: '分かったふりをせず、分からない所を具体的に言う。“Yes” やうなずきは、伝わったと受け取られる（「英語の授業と教官との話し方」の節）。' },
      { q: '米国の無線で、速度 100 kt の読み方は？', choices: ['one hundred knots', 'one zero zero knots', 'one zero zero knots per hour', 'a hundred knots'], answer: 1, why: '米国の AIM 4-2-11 は、速度を 1 けたずつ言い、knots を付けるとしている。knot という語に「1 時間あたり」が入っているので、per hour は付けない（「英語の授業と教官との話し方」の節）。' },
      { q: '無線の標準用語 “Unable” の意味は？', choices: ['聞き取れなかった', '少し待って', '最後の送信を受け取った', '指示・要求・許可に従えない'], answer: 3, why: '米国の Pilot/Controller Glossary と英国の CAP 413 のどちらも、Unable を「指示・要求・許可に従えない」としている。CAP 413 は、ふつう理由を添えるとしている（「英語の授業と教官との話し方」の節）。' },
    ],
    written: [
      ['正式名・通称・英語の 3 つを、補助翼を例に説明し、それぞれどこで会う名前かを答えてください。', `正式名の補助翼は日本の学科試験の資料と法令、通称のエルロンはふだんの日本語の会話、英語の aileron は英語の授業と米国の FAA の資料の名前です。${bk.see('en.terms', '用語の三つ組みと略語')}`],
      ['指示対気速度を、その章で初めて書くときの形で書いてください。', `指示対気速度（IAS：indicated airspeed）。略語は、初めて出るところで「正式名（略語：English）」と開きます。${bk.see('en.terms', '略語')}`],
      ['着陸復行と進入復行は、同じものですか。', `違います。着陸復行（go-around）は、着陸をやめてやり直すことです。進入復行（missed approach）は、計器進入（計器を頼りに滑走路へ向かう、決められた飛び方）を着陸まで続けられないときの、決められた手順です。${bk.see('en.terms', '取り違えやすい組')}`],
      ['授業で分からないことがあったとき、“I don\'t understand.” だけでなく、何を言うとよいですか。例を 1 つ挙げてください。', `どこが分からないかを言います。例：“I didn't understand the part about the fuel system. Could you explain it again?” 自分の言葉で言い直して確かめるのもよい方法です。${bk.see('en.class', '英語の授業と教官との話し方')}`],
      ['授業と米国の無線で、数字の読み方が違うのはなぜですか。例を 1 つ挙げてください。', `無線では、聞き違えないように、決まった読み方をします。例：10,000 ft は、授業では ten thousand feet、米国の無線では one zero thousand です。${bk.see('en.class', '数字と単位の言い方')}`],
      ['英国と米国で違う書き方を 2 つ挙げてください。ロンドンの座学では、どうしますか。', `例：aeroplane と airplane、日付 7/4/2026（英国は 4 月 7 日、米国は 7 月 4 日）。座学がどちらで教えるかは公開されていないので、最初の授業で確かめます。${bk.see('en.class', '英国と米国の書き方')}`],
      ['飛行中に前の雲が気になりました。操縦教員に伝える短い英語を作ってください。', `例：“I'm not sure about the clouds ahead. Can we turn back?” 早く・短く・具体的に言います。${bk.see('en.class', '立場の差があっても言う')}`],
    ],
    refs: [ref('mlitSyllabus'), R.pcg, R.aim42, R.cap413, ref('caaRole'), ref('unSystem'), R.cfr61, ref('cfr1'), ref('cfr12'), ref('ac6028b'), ref('jcabElp'), R.ana1, R.afh, ref('skySocio'), ref('skyAbout'), R.authGrad, ref('nist811'), ref('cambridgeDates'), ref('cambridgeMeas')],
    lessons: ['k3', 'k6'] });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
