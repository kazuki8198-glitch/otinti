// tools/test/broken-draft.js — a chapter draft with problems planted on purpose, for selftest.mjs (not a real chapter; no product reads it).
(function (FL) {
  const B = FL.book, R = B.R, bk = B.bk;
  B.add({ id: 'basics', part: 'p1', before: 'aero', t: '飛行の基本量', en: 'Basic quantities', summary: '単位と高度。',
    secs: [
      { id: 'basics.units', t: '単位', scope: 'common', from: ['kiso00.07', 'kiso00.99'], deep: 'no', h: () => `
${bk.aim('単位を学びます。')}
${bk.photo('archer')}
<figure class="bk-fig"><svg viewBox="0 0 300 200" role="img" aria-label="図：単位"><rect x="0" y="0" width="300" height="200" fill="#ffffff"/><text x="250" y="20" font-size="9">とても長いラベルの文字で右へはみ出す</text><text x="250" y="20" font-size="9">重なる</text></svg><figcaption>図：単位</figcaption></figure>
<p>速度は kt で表す。高度は 14 CFR 91.121 で決まる。航空法第 2 条も見ます。詳しくは第 5 章。TODO を書くこと</p>
<div class="bk-jur" data-jur="alt.unit"><p>米国は inHg、日本は hPa です。</p></div>
<p>双発機は ${bk.see('me.vmc', '最小操縦速度')} で学びます。</p>
${bk.key('単位は大事')}` },
      { id: 'basics.alt', t: '高度', scope: 'us', h: () => `
<p>高度計は QNH に合わせます。転移高度は 18,000 ft です。</p>${bk.aim('高度を学びます。')}` },
    ],
    terms: [['Knot', 'ノット']], examples: [], cautions: ['注意'], quiz: [{ q: '1 kt は？', choices: ['1 NM/h', '1 SM/h', '1 NM/h'], answer: 3, why: 'ノットの定義。' }],
    refs: [{ label: 'x', url: 'http://example.com' }] });
})(globalThis.FL);
