// CADET — career/tem.js : TEM, threat and error management (M6). Before a flying day (from chapter 3 on) the instructor
// asks for today's threat: the one that matters most today, from what the day is — the weather (a storm in the
// afternoon, low cloud, a crosswind, the morning fog), the cadet's fatigue, the check, flying alone cross-country, the
// new twin, the instrument flying — or the other aircraft in the pattern, on the days the pattern actually has
// them (flight/traffic.js: o.traffic is the day's count, and a briefing never claims congestion of an empty
// sky). When truly nothing stands out, the threat is the quiet day itself: complacency. The cadet picks
// one of three: today's, and two that are real threats on other days but not today (the instructor says why not).
// After the flight the debrief names the threat again and the errors of the day (career/day.js's summary: the
// checklist items left to the instructor, the read-backs said again, the hold line crossed, the rows outside their
// standard): what TEM is about — the threats seen early, the errors caught.
// Pure logic: no DOM.

// the threats, the most pressing first: when(o) says whether it is today's; why: what makes it a threat today; plan:
// what to do about it; not: why it is not today's (said when the cadet picks it)
export const THREATS = [
  { id: 'storm', ja: '午後の雷雨', when: o => o.weather === 'pmStorm', why: 'TAF に午後の雷雨（TEMPO TSRA）が出ています',
    plan: '午前のうちに飛んで、13 時までに戻る。積乱雲が育ち始めたら、課目の途中でも帰ります', not: '今日の TAF に雷雨はありません' },
  { id: 'cloud', ja: '低い雲（計器気象状態）', when: o => o.weather === 'lowCloud', why: '雲の底が 800 ft。進入では、最低高度まで滑走路が見えないかもしれません',
    plan: '決心高度で滑走路が見えなければ、迷わず進入復行。計器のスキャンを止めない', not: '今日は雲が高く、有視界で飛べます' },
  { id: 'wind', ja: '強い横風', when: o => o.weather === 'crosswind', why: '横風が強く、突風もあります',
    plan: '横風の限界を確かめる。着陸はエルロンを風上に、ラダーで機首を滑走路に。無理ならゴーアラウンド', not: '今日の風は、ほぼ滑走路の向きです' },
  { id: 'pmwind', ja: '午後の強い横風', when: o => o.weather === 'pmWind', why: 'TAF では 15 時から横風が強まります',
    plan: '午前のうちに飛んで、早めに戻る。戻りの着陸で風が強まっていたら、横風の限界を思い出す', not: '午後も風は弱い予報です' },
  { id: 'ceiling', ja: '朝の低い雲', when: o => o.weather === 'amLowCloud', why: '朝は雲の底が 600 ft です',
    plan: '雲が上がるのを待つ。場周の高度（1,000 ft）より低い雲の下では飛ばない', not: '今朝は雲が高いです' },
  { id: 'fog', ja: '朝の霧', when: o => o.weather === 'amFog', why: '朝は霧で視程が 1/2 SM です',
    plan: '視程が上がるまで待つ。予報どおりに上がらなければ、その日は飛ばない', not: '今朝は霧が出ていません' },
  { id: 'bust', ja: '予報外れの前線', when: o => o.weather === 'forecastBust', why: 'TAF は終日 VFR ですが、西の空が暗く、前線が予報より早く近づいています',
    plan: '午前のうちに飛んで、空が変わる前に戻る。飛んでいる間に空が変わり始めたら、課目の途中でも帰る', not: '今日は予報どおりの空です' },
  { id: 'tired', ja: '自分の疲れ', when: o => o.fatigue >= 45, why: '疲れが残っています。判断も手も、いつもより遅れます',
    plan: '手順をいつもより声に出して確かめる。迷ったら早めに、安全なほうを選ぶ', not: '今日はよく休めています' },
  { id: 'check', ja: '審査の緊張', when: o => o.check, why: '今日は審査です。緊張すると、いつもの手順が抜けます',
    plan: '毎日の手順のとおりに。チェックリストを飛ばさず、ひとつずつ声に出す', not: '今日は審査の日ではありません' },
  { id: 'nav', ja: '一人での航法（迷うこと）', when: o => o.xc, why: '今日は一人で、知らない場所まで飛びます',
    plan: '最後に確かだった場所から考える。VOR と DME も使う。燃料と時間に余裕を持つ', not: '今日は場周と訓練空域の中だけです' },
  { id: 'twin', ja: '慣れない双発機（片発）', when: o => o.aircraft === 'pa44', why: 'Seminole は速くて重く、片方のエンジンが止まると強く片側へ引かれます',
    plan: '片発になったら「パワー、ピッチ、足」。Vmc より速く、ブルーラインの速度を保つ', not: '今日は Archer です' },
  { id: 'sd', ja: '空間識失調（体の感覚）', when: o => o.chapter === 'ch4', why: 'フードの中では、体の感覚が計器と食い違います',
    plan: '体の感覚ではなく計器を信じる。姿勢指示器に目を戻しながら、スキャンを続ける', not: '今日は外を見て飛ぶ課目です' },
  { id: 'traffic', ja: '場周の混雑（ほかの訓練機）', when: o => (o.traffic | 0) > 0, why: 'ほかの訓練機が場周を飛んでいます。同じ高度、同じ経路です',
    plan: '交信をよく聞いて、ほかの機体の位置を頭に描く。見張りを続ける', not: '今日はほかの訓練機は飛んでいません' },
  { id: 'calm', ja: '静かな日の油断', when: () => true, why: '天気も体調も問題なく、目立つ脅威がありません。そういう日ほど、注意は静かに落ちていきます',
    plan: 'チェックリストはいつもどおり声に出す。見張りは「何も見えない」ことも言葉にして、確認したことにする', not: '今日は目立つ脅威があります。それが今日の脅威です' },
];
// (M8) the same in English (the crew's English mode): the threat's name, why, the plan, why not today
export const THREATS_EN = {
  storm: { ja: 'afternoon thunderstorms', why: 'The TAF has thunderstorms this afternoon (TEMPO TSRA)', plan: 'fly in the morning and be back by 13:00; if the cumulonimbus starts to build, we come back, even mid-lesson', not: 'There are no thunderstorms in today\'s TAF' },
  cloud: { ja: 'low cloud (IMC)', why: 'The cloud base is 800 ft; on the approach you may not see the runway until the minimums', plan: 'no runway at decision altitude, go around without hesitating; never stop the instrument scan', not: 'Today the cloud is high; we can fly VFR' },
  wind: { ja: 'a strong crosswind', why: 'The crosswind is strong, and gusting', plan: 'know the crosswind limit; land with aileron into the wind and rudder to keep the nose on the runway; go around if it\'s too much', not: 'Today\'s wind is almost straight down the runway' },
  pmwind: { ja: 'a strong afternoon crosswind', why: 'The TAF has the crosswind picking up from 15:00', plan: 'fly in the morning and come back early; if it has picked up for the landing, remember the crosswind limit', not: 'The afternoon wind is forecast light' },
  ceiling: { ja: 'low morning cloud', why: 'This morning the cloud base is 600 ft', plan: 'wait for the cloud to lift; no flying under cloud lower than the pattern altitude (1,000 ft)', not: 'This morning the cloud is high' },
  fog: { ja: 'morning fog', why: 'This morning the fog has the visibility at 1/2 SM', plan: 'wait for the visibility to improve; if it doesn\'t lift as forecast, no flying today', not: 'There\'s no fog this morning' },
  bust: { ja: 'a front ahead of its forecast', why: 'The TAF says VFR all day, but the western sky is darkening — a front may arrive ahead of its forecast', plan: 'fly in the morning and be back before the sky changes; if it starts to change while we fly, we come back, even mid-lesson', not: 'Today the sky is doing what the forecast said' },
  tired: { ja: 'your own fatigue', why: 'You\'re still tired; your judgement and your hands will lag', plan: 'say the steps out loud more than usual; when in doubt, choose the safe way early', not: 'You\'re well rested today' },
  check: { ja: 'check-ride nerves', why: 'Today is a check; nerves make you skip the usual steps', plan: 'do it the everyday way; never skip the checklist, say each item out loud', not: 'Today isn\'t a check day' },
  nav: { ja: 'navigating alone (getting lost)', why: 'Today you fly alone to places you don\'t know', plan: 'start from the last place you were sure of; use the VOR and DME; keep a margin of fuel and time', not: 'Today we stay in the pattern and the practice area' },
  twin: { ja: 'an unfamiliar twin (one engine out)', why: 'The Seminole is fast and heavy, and pulls hard to one side when an engine stops', plan: 'one engine out: power, pitch, feet; stay faster than Vmc, hold blue-line speed', not: 'Today it\'s the Archer' },
  sd: { ja: 'spatial disorientation', why: 'Under the hood your body\'s sense disagrees with the instruments', plan: 'trust the instruments, not your body; keep scanning, back to the attitude indicator', not: 'Today\'s lesson is flown looking outside' },
  traffic: { ja: 'a busy pattern (other trainers)', why: 'Other trainers are flying the pattern today, at the same altitude on the same circuit', plan: 'listen to the radio and keep a picture of where the others are; keep looking out', not: 'No other trainers are flying today' },
  calm: { ja: 'complacency on a quiet day', why: 'The weather is fine, you are rested, and nothing stands out — those are the days attention quietly fades', plan: 'use the checklist out loud as always; call the scan: "nothing seen" is a check made, not skipped', not: 'Today something does stand out; that is today\'s threat' },
};
const byId = Object.fromEntries(THREATS.map(t => [t.id, t]));

// o: { weather (WEATHER's kind), fatigue 0..100, chapter, aircraft ('pa28' | 'pa44'), check, xc, day,
// traffic (the day's pattern traffic count, flight/traffic.js; 0 or absent = an empty pattern) } → today's TEM:
// { threat: { id, ja, why, plan }, options: [three names], right (the index of today's), others: [the two not today's,
// each with why not] } — the order of the options from the day (the same day, the same order)
export function temFor(o) {
  let today = THREATS.find(t => t.when(o));
  // (B3.3) on a storm day the threat is not abstract: the cell is already standing in the west — the why
  // and the plan name it (and the English with it)
  if (o.cb && today.id === 'storm') today = { ...today,
    why: 'TAF に午後の雷雨（TEMPO TSRA）。西の空には、もう積乱雲がひとつ育っています',
    plan: '午前のうちに飛んで、13 時までに戻る。西の積乱雲には近づかない（大きく離れる）。育ち始めたら、課目の途中でも帰ります',
    cbEn: { why: 'The TAF has thunderstorms this afternoon (TEMPO TSRA) — and one cumulonimbus is already standing in the west', plan: 'fly in the morning and be back by 13:00; give the cell in the west a wide berth, and come back even mid-lesson if it builds' } };
  const others = THREATS.filter(t => t !== today && t.id !== 'traffic' && !t.when(o));
  const k = Math.abs((o.day | 0) * 7 + 3) % Math.max(1, others.length), two = [others[k], others[(k + 3) % others.length]].filter((t, i, a) => t && a.indexOf(t) === i);
  while (two.length < 2) two.push(others.find(t => !two.includes(t)));
  const right = Math.abs((o.day | 0) * 5 + 1) % 3, opts = two.slice();
  opts.splice(right, 0, today);
  const E = (t) => THREATS_EN[t.id];
  return { threat: { id: today.id, ja: today.ja, why: today.why, plan: today.plan, en: { threat: E(today).ja, why: today.cbEn ? today.cbEn.why : E(today).why, plan: today.cbEn ? today.cbEn.plan : E(today).plan } }, options: opts.map(t => t.ja), right,
    others: opts.map(t => (t === today ? '' : t.not)), othersEn: opts.map(t => (t === today ? '' : E(t).not)) };
}
export const threatOf = (id) => byId[id] || null;

// the errors of a day, from its summary (career/day.js): what the debrief names — the items the instructor did, the
// read-backs said again, the hold line, the first row outside its standard → [short Japanese phrases]
export function errorsOf(sum) {
  const out = [];
  if (sum.incursion) out.push('許可の前に停止線を越えたこと');
  if (sum.radio && sum.radio.wrong) out.push(`無線の復唱の言い直し（${sum.radio.wrong} 回）`);
  if ((sum.autoItems || 0) > 6) out.push('チェックリストを教官に任せたこと');
  if (sum.walk && sum.walk.missed && sum.walk.missed.length) out.push('外部点検の見落とし');
  const bad = (sum.lessons || []).find(l => l.done && (l.rows || []).some(r => !r.pass));
  if (bad) { const r = bad.rows.find(x => !x.pass); out.push(`${bad.title}の${r.name}`); }
  return out;
}
// (M8) the same errors in English (the crew's English mode); a lesson's title and row stay as the course writes them
export function errorsOfEn(sum) {
  const out = [];
  if (sum.incursion) out.push('crossing the hold line before the clearance');
  if (sum.radio && sum.radio.wrong) out.push(`read-backs said again (${sum.radio.wrong})`);
  if ((sum.autoItems || 0) > 6) out.push('leaving the checklist to the instructor');
  if (sum.walk && sum.walk.missed && sum.walk.missed.length) out.push('items missed on the walk-around');
  const bad = (sum.lessons || []).find(l => l.done && (l.rows || []).some(r => !r.pass));
  if (bad) { const r = bad.rows.find(x => !x.pass); out.push(`“${r.name}” in “${bad.title}”`); }
  return out;
}
