// CADET — flight/line.js : line operations for the first-officer phase (docs/first-officer-design.md S3),
// as a pure step machine in the shape of flight/divert.js: no three.js, no DOM, no timers — the caller
// (the fly-mode integration, or a test bot) feeds it observations and answers its questions, and
// summary() scores the duty. The 3D flight itself is NOT here: the caller flies the jet, compresses
// the cruise when this machine asks it to, teleports, diverts — this module only decides, tracks and
// scores.
//
//   const duty = createLineDuty({ route: 'HND-CTS', role: 'PF', captain: CAPTAINS[0], seed: 7 });
//   duty.advance();                       // brief → dispatch (or feed update({ briefDone: true }))
//   duty.dispatchCase                     // the dispatch decision on the table (DISPATCH_CASES entry)
//   duty.answerDispatch(1);               // answer by index / 'a'..'c' / the choice's text
//   duty.update({ t, altFt, ias, mach, distDestM, onGround, stopped, vsFpm, headingDeg });
//   duty.compress();                      // in cruise (PF): ask for the cruise compression (below)
//   duty.event                            // the in-flight event, once it has fired (or null)
//   duty.answerEvent(0);
//   duty.currentTask();                   // PM ride: the monitor task on the table (or null)
//   duty.answer(task.id, 2);              // PM tasks are answered through answer(taskId, choice)
//   duty.summary();                       // { landingScore / taskScore, decisionScore, total, grade, … }
//
// Phases — PF: brief → dispatch → depart → climb → cruise → descent → approach → landed → debrief.
//          PM: brief → dispatch → ride → debrief (the captain flies; the ride ends on an arrival
//              event in the observations: { arrived: true } — or onGround && stopped).
// Observations (every field optional except as the phase needs): {
//   t           elapsed seconds of the duty (monotonic; or pass update(dtSeconds, obs) instead),
//   altFt, ias (kt), mach, vsFpm, headingDeg,
//   distDestM   metres remaining to the CURRENT destination (duty.destination — it changes on a divert),
//   onGround, stopped,
//   n, e        world position (optional; if given at touchdown the landing position is measured in
//               the destination's runway frame), tdAlongM / tdCrossM (optional direct touchdown
//               position: metres past the threshold / metres right of the centreline),
//   briefDone   in brief: the briefing is over → dispatch,
//   arrived     in a PM ride: the arrival event → debrief. }
// Determinism: every random draw comes from the one seeded generator (the mulberry-style rng the
// codebase uses in flight/cb.js / dialog/atc.js), drawn in a fixed order at creation and then in
// call order — same seed + same observation sequence + same answers ⇒ the same summary.
import { lineAirfieldById } from './airfields.js';

// ------------------------------------------------------------------ small helpers
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const r1 = (v) => Math.round(v * 10) / 10;
// the grade bands of a 0–100 total (school.js's S/A/B/C feel, on the line's own scale)
export const gradeOf = (total) => total >= 90 ? 'S' : total >= 80 ? 'A' : total >= 65 ? 'B' : 'C';
// an answer may be given as an index (0-based), a letter ('a'…), or the choice's exact text
function choiceIndex(choices, choice) {
  if (typeof choice === 'number' && Number.isFinite(choice)) return choice | 0;
  if (typeof choice === 'string') {
    if (/^[a-z]$/i.test(choice)) return choice.toLowerCase().charCodeAt(0) - 97;
    const i = choices.indexOf(choice);
    if (i >= 0) return i;
  }
  if (choice && typeof choice === 'object' && Number.isFinite(choice.index)) return choice.index | 0;
  return -1;
}
function shuffled(R, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ------------------------------------------------------------------ the routes (design S3)
// Real-number table (distance / block time / cruise level / trip fuel), Haneda based. Each route has
// ONE designated alternate, chosen so the fuel decision stays meaningful:
//   KMQ → HND  (a short leg: returning to the base, with its long runways and full support, is surest)
//   CTS → HND  (no nearer company field in this world; the base again — the fuel must be planned for it)
//   FUK → KMQ  (en route, well short of Fukuoka, long runway)
//   OKA → FUK  (the only field on the way back up the chain; KMQ would be beyond it)
export const ROUTES = [
  { id: 'HND-KMQ', from: 'HND', to: 'KMQ', distKm: 290, blockMin: 65, cruiseFL: 240, cruiseAltFt: 24000, tripFuelKg: 1900, alternate: 'HND' },
  { id: 'HND-CTS', from: 'HND', to: 'CTS', distKm: 820, blockMin: 95, cruiseFL: 370, cruiseAltFt: 37000, tripFuelKg: 3900, alternate: 'HND' },
  { id: 'HND-FUK', from: 'HND', to: 'FUK', distKm: 880, blockMin: 115, cruiseFL: 380, cruiseAltFt: 38000, tripFuelKg: 4200, alternate: 'KMQ' },
  { id: 'HND-OKA', from: 'HND', to: 'OKA', distKm: 1550, blockMin: 155, cruiseFL: 390, cruiseAltFt: 39000, tripFuelKg: 6600, alternate: 'FUK' },
];
export const routeById = (id) => ROUTES.find(r => r.id === id) || null;
export function resolveRoute(route) {
  if (!route) return ROUTES[0];
  if (typeof route === 'string') {
    const s = route.toUpperCase();
    return routeById(s) || ROUTES.find(r => r.to === s) || ROUTES.find(r => `${r.from}-${r.to}` === s) || ROUTES[0];
  }
  if (typeof route === 'object') {
    if (route.id && routeById(route.id)) return routeById(route.id);
    const from = (route.from || 'HND').toUpperCase(), to = (route.to || route.dest || route.destination || '').toUpperCase();
    return ROUTES.find(r => r.from === from && r.to === to) || ROUTES.find(r => r.to === to) || ROUTES[0];
  }
  return ROUTES[0];
}

// ------------------------------------------------------------------ the captains (design S3)
// Three captains on the roster; only the evaluation coefficient differs (strict in summary()'s total).
export const CAPTAINS = [
  { id: 'kashiwagi', name: '柏木 機長', style: '厳格', strict: 0.95 },
  { id: 'sakurai', name: '桜井 機長', style: '標準', strict: 1.0 },
  { id: 'ono', name: '小野 機長', style: '温厚', strict: 1.05 },
];
const STRICT_WORDS = { strict: 0.95, '厳格': 0.95, standard: 1.0, normal: 1.0, '標準': 1.0, lenient: 1.05, kind: 1.05, '温厚': 1.05 };
export function resolveCaptain(captain) {
  if (captain == null) return { ...CAPTAINS[1] };
  if (typeof captain === 'number' && Number.isFinite(captain)) return { id: 'custom', name: '機長', style: '標準', strict: captain };
  if (typeof captain === 'string') {
    const byId = CAPTAINS.find(c => c.id === captain || c.name === captain);
    if (byId) return { ...byId };
    if (STRICT_WORDS[captain] != null) return { id: 'custom', name: '機長', style: captain, strict: STRICT_WORDS[captain] };
    return { ...CAPTAINS[1], name: captain };
  }
  const base = CAPTAINS.find(c => c.id === captain.id) || CAPTAINS[1];
  const strict = typeof captain.strict === 'number' ? captain.strict
    : STRICT_WORDS[captain.strict] != null ? STRICT_WORDS[captain.strict]
    : captain.style && STRICT_WORDS[captain.style] != null ? STRICT_WORDS[captain.style] : base.strict;
  return { id: captain.id || base.id, name: captain.name || base.name, style: captain.style || base.style, strict };
}

// ------------------------------------------------------------------ the dispatch deck (design S3)
// The pre-departure decision: weather, an MEL item, fuel, delay — each case's right answer follows
// from its situation alone. `correctGo` says whether the CORRECT answer still departs (a correct
// no-go ends the duty at the briefing table, scored on the decision alone); a wrong answer always
// departs (the mistake is recorded and the flight goes on — the game's way, as in divert.js).
export const DISPATCH_CASES = [
  {
    id: 'mel-reverser-wet', title: 'MEL：逆噴射 No.2 不作動＋到着地は雨',
    situation: '持ち越し不具合：No.2 エンジンの逆噴射装置が不作動（MEL 持ち越し中）。到着地は雨で滑走路は全面ウェット、長さにも余裕が少ない。濡れた短い滑走路への着陸は、逆噴射が両方使えることが運航規程の前提になっている。',
    choices: ['そのまま出発する（片側の逆噴射とブレーキで足りるはず）', '出発しない。整備に引き継ぎ、機材変更か修理を要求する', 'MEL は機長の判断で無視できるので、出発する'],
    correctIndex: 1, correctGo: false,
    reason: '逆噴射1基不作動＋ウェットで短い滑走路は、規程上そもそも着陸できない組み合わせ。遅延より先に「行けない」ものは行けない。',
  },
  {
    id: 'apu-inop', title: 'MEL：APU 不調',
    situation: 'APU が不調で使用できない。ただし出発地・到着地とも地上電源車とエアスターターの手配が確定しており、エンジン始動と地上運用の手順は確保できている。他の不具合はない。',
    choices: ['APU が直るまで出発を無期限に延期する', '出発しない（APU がない便は飛ばせない）', '手配が確定しているので、通常どおり出発できる'],
    correctIndex: 2, correctGo: true,
    reason: 'APU 不作動は、地上支援が両空港で確保できれば MEL で運航可。確認すべきは「手配が確定しているか」で、ここでは確定している。',
  },
  {
    id: 'fuel-reserve', title: '燃料：予備が要件を割っている',
    situation: '搭載燃料の計画が、規程の最低要件（代替空港まで＋最終予備30分）を 200 kg 下回っている。到着地も代替地も好天の予報だが、予備燃料の要件に天候による例外はない。',
    choices: ['好天なので、このまま出発する', '200 kg を追加搭載してから出発する', '書類上の数字だけ要件に合わせて出発する'],
    correctIndex: 1, correctGo: true,
    reason: '予備燃料は「使わない前提で積む」もの。要件を割った計画は天候に関わらず成立しない。追加搭載が正解。',
  },
  {
    id: 'crosswind-limit', title: '到着地の横風が制限超えの予報',
    situation: '到着予定時刻の到着地予報：横風 28 kt、突風 38 kt。会社の運航規程の横風制限は突風を含めて 35 kt。夕方には風が弱まる予報で、到着を遅らせる案がある。',
    choices: ['突風は一瞬なので、制限内とみなして予定どおり出発する', '横風は着陸のときの問題なので、出発は予定どおり', '出発を遅らせ、風が制限内に弱まる時間帯の到着にする'],
    correctIndex: 2, correctGo: true,
    reason: '制限は突風を含めた値で判断する。38 kt は制限超え。到着時刻をずらせるなら、ずらすのが運航判断。',
  },
  {
    id: 'tire-wear', title: '出発前点検：タイヤの摩耗',
    situation: '出発前の地上点検で、主脚タイヤ1本の摩耗が使用限界を超えている兆候。交換すると約45分の遅延になる。定時出発への圧力は強いが、限界の判断は点検の物差しで決まる。',
    choices: ['交換して出発する（45分の遅延を受け入れる）', '限界内だと自己判断して、予定どおり出発する', '記録を次の便の点検に回して、出発する'],
    correctIndex: 0, correctGo: true,
    reason: '限界を超えた兆候がある部品は交換が先。遅延は理由を説明できるが、限界超えの出発は説明できない。',
  },
  {
    id: 'both-below-minima', title: '到着地も代替地も最低気象条件未満',
    situation: '到着地の視程予報は着陸の最低気象条件を下回り、回復の見込みがない。代替地も同じ気象系の中にあり、同じく最低条件未満。燃料は十分に積める。',
    choices: ['燃料を多く積めば出発できる', '到着地の実況だけを見て、とにかく出発する', '代替地も成立しないので、出発しない'],
    correctIndex: 2, correctGo: false,
    reason: 'ダイバート先が成立しない出発は、計画として閉じていない。燃料の量で代替地の天候は変わらない。出発しないが正解。',
  },
  {
    id: 'deice', title: '降雪：翼面の着氷',
    situation: '出発地は降雪中。翼面に着氷のおそれがある。防除氷作業の手配は可能で、作業後のホールドオーバー時間（再着氷までの猶予）内に出発できる見込み。',
    choices: ['防除氷を実施し、ホールドオーバー時間内に出発する', '着氷は飛行中に落ちるので、そのまま出発する', '離陸推力を上げれば問題ないので、出発する'],
    correctIndex: 0, correctGo: true,
    reason: '翼面の着氷は揚力を直接壊す。防除氷＋時間内の出発が手順どおり。推力で解決する問題ではない。',
  },
  {
    id: 'overweight', title: '離陸重量が制限を超過',
    situation: '搭載計画の離陸重量が最大離陸重量を 800 kg 超過している。貨物の一部を降ろせば制限内に収まる。予備燃料は要件どおりで、削る余地はない。',
    choices: ['800 kg 程度は誤差の範囲として出発する', '予備燃料を削って重量を合わせ、出発する', '貨物の一部を降ろして制限内に収め、出発する'],
    correctIndex: 2, correctGo: true,
    reason: '重量制限は絶対値。合わせるなら貨物で合わせる。予備燃料を削るのは別の制限違反を持ち込むだけ。',
  },
];

// ------------------------------------------------------------------ the in-flight events
// At most ONE event per duty, drawn by seed at creation (about one duty in four has none). When it
// fires depends on its kind: turbulence fires as the cruise is entered; destination weather and
// congestion fire as the descent begins (PM ride: in the middle of the ride). Each choice carries a
// score (1 = the textbook answer, part marks for the safe-but-costly one, 0 for the dangerous one)
// and the weather case's right answer is decided by its own visibility data, as briefed.
export const EVENT_KINDS = ['weather', 'turbulence', 'hold'];
const EVENT_NONE_CHANCE = 0.25;
const MINIMA_VIS_M = 550;                     // the landing minima the weather cases are judged against

function buildEvent(R, route, dest, alternate) {
  if (R() < EVENT_NONE_CHANCE) return null;
  const kind = EVENT_KINDS[Math.floor(R() * EVENT_KINDS.length)];
  if (kind === 'weather') {
    const canHold = R() < 0.5;
    const data = canHold
      ? { visM: 400, minimaM: MINIMA_VIS_M, trend: '約20分で最低条件以上へ回復の予報', alternateVisM: 6000, holdFuelMin: 60 }
      : { visM: 200, minimaM: MINIMA_VIS_M, trend: '回復の見込みなし', alternateVisM: 6000, holdFuelMin: 25 };
    return {
      id: 'evt-weather', kind, title: '到着地の天候悪化',
      situation: `${dest.name}（${dest.id}）の実況：視程 ${data.visM} m（着陸の最低条件 ${data.minimaM} m）、${data.trend}。代替地 ${alternate.name}（${alternate.id}）は視程 ${data.alternateVisM} m で良好。ホールディング可能な燃料は約 ${data.holdFuelMin} 分。どうする？`,
      data, choices: [`代替空港 ${alternate.id} へダイバートする`, 'ホールディングして様子を見る', 'このまま進入を強行する'],
      correctIndex: canHold ? 1 : 0, scores: canHold ? [0.5, 1, 0] : [1, 0.25, 0],
      reason: canHold
        ? '視程は下限未満だが回復予報があり、待てる燃料も十分。様子見（ホールド）が最も無駄のない判断。ダイバートは安全だが過剰、強行は論外。'
        : '視程 200 m は下限の半分以下で回復見込みもなく、待てる燃料も少ない。代替地が良好なうちにダイバートするのが正解。強行は大きな減点。',
    };
  }
  if (kind === 'turbulence') {
    const smoothBelow = R() < 0.5;
    const calmAltFt = smoothBelow ? Math.max(24000, route.cruiseAltFt - 6000) : Math.min(41000, route.cruiseAltFt + 2000);
    const badAltFt = smoothBelow ? Math.min(41000, route.cruiseAltFt + 2000) : Math.max(24000, route.cruiseAltFt - 6000);
    const data = { smoothBelow, calmAltFt, badAltFt, cruiseAltFt: route.cruiseAltFt };
    return {
      id: 'evt-turbulence', kind, title: '乱気流の回避',
      situation: `前方機のレポート：現在の巡航高度では強い揺れが続く。${smoothBelow ? `下方 FL${calmAltFt / 100} はスムーズ、上方はさらに悪いとのこと` : `上方 FL${calmAltFt / 100} はスムーズ、下方は対流雲でさらに悪いとのこと`}。機長が「高度変更、どうする？」と聞いている。`,
      data,
      choices: [`FL${calmAltFt / 100} へ${smoothBelow ? '降下' : '上昇'}を要求する`, `FL${badAltFt / 100} へ${smoothBelow ? '上昇' : '降下'}を要求する`, '現在の高度を維持する'],
      correctIndex: 0, scores: [1, 0, 0.5], targetAltFt: calmAltFt,
      reason: 'レポートでスムーズと分かっている側へ移るのが正解。悪い側への変更は論外、維持は怪我人を出すリスクを抱えたままになる。',
    };
  }
  // congestion: the holding-endurance calculation (fuel ÷ burn, floored to 5 minutes)
  const fuelKg = [2400, 3150, 3900][Math.floor(R() * 3)], burnKgPerMin = 42;
  const enduranceMin = Math.floor(fuelKg / burnKgPerMin / 5) * 5;
  const options = shuffled(R, [enduranceMin - 15, enduranceMin, enduranceMin + 15]);
  return {
    id: 'evt-hold', kind, title: '到着地混雑：ホールディングの燃料計算',
    situation: `${dest.name}（${dest.id}）の混雑でホールディングの指示。現在の残燃料 ${fuelKg} kg、ホールディング中の消費率 ${burnKgPerMin} kg/分。あと何分持つか（5分単位で切り捨て）を機長に報告する。`,
    data: { fuelKg, burnKgPerMin, enduranceMin },
    choices: options.map(m => `約 ${m} 分`), correctIndex: options.indexOf(enduranceMin),
    scores: options.map(m => m === enduranceMin ? 1 : 0),
    reason: `${fuelKg} ÷ ${burnKgPerMin} ＝ 約 ${Math.floor(fuelKg / burnKgPerMin)} 分 → 切り捨てて ${enduranceMin} 分。多めに言うと燃料切れの判断を誤る。`,
  };
}

// ------------------------------------------------------------------ the PM monitor tasks
// The PM's work on a ride leg: monitor tasks generated from the live observations (callouts, the
// checklist's timing, the radio, deviation detection, descent planning, fuel). Eight-plus templates;
// each generated task is { id, templateId, title, prompt, choices, correctIndex } — the duty keeps the
// score, the caller only shows prompt + choices. Scenario-style templates (checklist / radio / config)
// carry fixed text; the reading / detection templates are built from the observation snapshot, so the
// right answer is whatever the instruments actually say.
export const PM_TASK_TEMPLATES = [
  { id: 'alt-callout', title: '高度通過のコールアウト' },
  { id: 'checklist-timing', title: 'チェックリストの実施タイミング' },
  { id: 'radio-response', title: '無線応答' },
  { id: 'deviation-detect', title: '逸脱の検出' },
  { id: 'speed-read', title: '速度の読み上げ' },
  { id: 'heading-read', title: '針路の確認' },
  { id: 'descent-plan', title: '降下計画（3:1）' },
  { id: 'fuel-check', title: '燃料の確認' },
  { id: 'vs-read', title: '降下率の読み上げ' },
  { id: 'config-call', title: '着陸形態の確認' },
];
export const PM_TASKS_PER_RIDE = 5;
const PM_TASK_GAP_SEC = 15;                   // ride time between tasks

function genTask(R, tplId, snap, route) {
  const alt = Math.round((snap.altFt || route.cruiseAltFt) / 100) * 100;
  const base = { templateId: tplId, title: (PM_TASK_TEMPLATES.find(t => t.id === tplId) || {}).title || tplId };
  const withChoices = (prompt, correct, decoys) => {
    const choices = shuffled(R, [correct, ...decoys]);
    return { ...base, prompt, choices, correctIndex: choices.indexOf(correct) };
  };
  switch (tplId) {
    case 'alt-callout': {
      const fl = Math.round(alt / 100);
      return withChoices(`現在 ${alt.toLocaleString('ja-JP')} ft を通過中。PF への高度通過のコールアウトとして正しいのは？`,
        `「${alt.toLocaleString('ja-JP')} ft、通過」`, [`「FL${fl + 10}、通過」`, `「あと ${(1000).toLocaleString('ja-JP')} ft で巡航高度」`]);
    }
    case 'checklist-timing':
      return withChoices('降下を開始するタイミングで、PM が実施するチェックリストは？',
        'Descent Checklist', ['Before Start Checklist', 'Shutdown Checklist']);
    case 'radio-response':
      return withChoices('管制：「翔洋 212、FL350 へ上昇せよ」への応答として正しいのは？',
        '「FL350 へ上昇、翔洋 212」', ['「了解」だけ', '「翔洋 212、FL250 へ上昇」']);
    case 'deviation-detect': {
      const dAlt = Math.round((snap.altFt || route.cruiseAltFt) - route.cruiseAltFt);
      const ias = snap.ias || 0, vs = snap.vsFpm || 0;
      let finding = null;
      if (Math.abs(dAlt) > 200) finding = `高度が割当より ${dAlt > 0 ? '+' : ''}${dAlt} ft 逸脱している`;
      else if (ias > 310) finding = `速度が ${Math.round(ias)} kt で制限を超えている`;
      else if (Math.abs(vs) > 300) finding = `昇降率が ${Math.round(vs)} fpm で巡航中として異常`;
      const correct = finding || '逸脱なし。このまま監視を続ける';
      const decoys = ['高度が割当より +500 ft 逸脱している', '速度が 250 kt で遅すぎる', '逸脱なし。このまま監視を続ける']
        .filter(d => d !== correct).slice(0, 2);
      return withChoices('モニター中。いま制限・割当を超えているのは？', correct, decoys);
    }
    case 'speed-read': {
      const mach = snap.mach || 0.78, ias = Math.round(snap.ias || 250);
      return withChoices(`速度の読み上げ確認。現在の表示として正しいのは？`,
        `IAS ${ias} kt、マッハ ${mach.toFixed(2)}`, [`IAS ${ias + 20} kt、マッハ ${mach.toFixed(2)}`, `IAS ${ias} kt、マッハ ${(mach + 0.03).toFixed(2)}`]);
    }
    case 'heading-read': {
      const hdg = Math.round(((snap.headingDeg || 90) % 360 + 360) % 360) || 360;
      const plus = hdg + 10 > 360 ? hdg - 350 : hdg + 10, minus = hdg - 10 < 1 ? hdg + 350 : hdg - 10;
      return withChoices('針路の確認。現在の針路の読み上げとして正しいのは？',
        `「針路 ${String(hdg).padStart(3, '0')}」`, [`「針路 ${String(plus).padStart(3, '0')}」`, `「針路 ${String(minus).padStart(3, '0')}」`]);
    }
    case 'descent-plan': {
      const loseFt = route.cruiseAltFt - 3000, nm = Math.round(loseFt / 1000 * 3), km = Math.round(nm * 1.852);
      return withChoices(`降下計画：巡航高度から 3,000 ft まで、3:1 の割合で降りる。降下開始点（TOD）は目的地の何 km 手前？`,
        `約 ${km} km 手前`, [`約 ${Math.round(km * 0.6)} km 手前`, `約 ${Math.round(km * 1.5)} km 手前`]);
    }
    case 'fuel-check': {
      const fuelKg = 1800 + Math.floor(R() * 15) * 150, burn = 40 + Math.floor(R() * 6);
      const enduranceMin = Math.floor(fuelKg / burn / 5) * 5;
      return withChoices(`燃料の確認：残燃料 ${fuelKg} kg、消費率 ${burn} kg/分。このまま飛べる時間（5分単位で切り捨て）は？`,
        `約 ${enduranceMin} 分`, [`約 ${enduranceMin + 20} 分`, `約 ${Math.max(5, enduranceMin - 20)} 分`]);
    }
    case 'vs-read': {
      const vs = Math.round((snap.vsFpm || -1800) / 100) * 100;
      return withChoices(`降下率の読み上げ確認。現在の降下率として正しいのは？`,
        `${vs} fpm`, [`${vs + 500} fpm`, `${vs - 500} fpm`]);
    }
    case 'config-call':
      return withChoices('最終進入で着陸形態にする順序として正しいのは？',
        'フラップ15 → 40、Vref+5 で進入', ['フラップ40 → 一気に UP へ戻す', 'ギアを上げたままフラップ40']);
    default:
      return withChoices('モニターを続ける', '監視を続ける', ['操縦を交代する', 'チェックリストを最初からやり直す']);
  }
}

// ------------------------------------------------------------------ the duty machine
// createLineDuty({ route, role, captain, seed, weather })
//   route:   a ROUTES id ('HND-CTS'), a destination id ('CTS'), or { from, to } — default HND-KMQ.
//   role:    'PF' (you fly) or 'PM' (the captain flies, you monitor) — default 'PF'.
//   captain: a CAPTAINS entry, { strict: 0.95 } (a number is taken as the coefficient itself), or a
//            style word ('厳格' / '標準' / '温厚'). summary()'s total is multiplied by it (capped 100).
//   seed:    the deterministic seed (dispatch case, the in-flight event, the task order).
//   weather: the day's weather note, kept on the state for the briefing (not scored by itself).
export function createLineDuty({ route = null, role = 'PF', captain = null, seed = 11, weather = null } = {}) {
  const rt = resolveRoute(route);
  const isPM = String(role).toUpperCase() === 'PM';
  const capt = resolveCaptain(captain);
  const origin = lineAirfieldById(rt.from), destField = lineAirfieldById(rt.to), altField = lineAirfieldById(rt.alternate);
  const R = rng((seed * 2654435761) >>> 0 || 1);

  // creation draws, in a fixed order: the dispatch case, then the in-flight event
  const dispatchCase = DISPATCH_CASES[Math.floor(R() * DISPATCH_CASES.length)];
  const event = buildEvent(R, rt, destField, altField);

  const st = {
    phase: 'brief', t: 0, phaseT: 0, role: isPM ? 'PM' : 'PF', route: rt, captain: capt, weather,
    destination: destField, diverted: false, compressRequested: false, compression: null,
    dispatch: null,            // { choice, correct, score } once answered
    eventFired: false, eventAnswer: null,   // { choice, score }
    holding: false, pressedOn: false,
    tasks: [], tasksIssued: 0, tasksCorrect: 0, lastTaskT: -Infinity,
    airborne: false, lastAir: null, touchdown: null, landingScore: null,
    distDestM: rt.distKm * 1000, altFt: 0, arrived: false, noGo: false,
  };
  const events = [];
  const emit = (e) => events.push(e);
  const usedTemplates = [];
  let taskSeq = 0, tplPool = null;

  function enter(phase) {
    st.phase = phase; st.phaseT = 0;
    emit({ type: 'phase', to: phase });
    if (phase === 'cruise' && event && event.kind === 'turbulence' && !st.eventFired) fireEvent();
    if (phase === 'descent' && event && event.kind !== 'turbulence' && !st.eventFired) fireEvent();
    if (phase === 'ride') issueTask(true);
  }
  function fireEvent() {
    st.eventFired = true;
    emit({ type: 'event', event });
  }
  function nextTemplate() {
    if (!tplPool || !tplPool.length) { tplPool = shuffled(R, PM_TASK_TEMPLATES.map(t => t.id)); }
    // no repeats until the pool is exhausted (the ride only needs five of the ten anyway)
    const id = tplPool.find(id => !usedTemplates.includes(id)) || tplPool[0];
    usedTemplates.push(id);
    return id;
  }
  function issueTask(first = false) {
    if (st.phase !== 'ride' || st.tasksIssued >= PM_TASKS_PER_RIDE) return null;
    if (!first && st.t - st.lastTaskT < PM_TASK_GAP_SEC) return null;
    const active = st.tasks.find(t => !t.answered);
    if (active) return null;
    const tplId = nextTemplate();
    const task = { ...genTask(R, tplId, lastSnap, rt), id: `pm-${++taskSeq}`, answered: false, correct: null };
    st.tasks.push(task); st.tasksIssued++; st.lastTaskT = st.t;
    emit({ type: 'task', task });
    return task;
  }

  // ---- the scored answers -------------------------------------------------
  function answerDispatch(choice) {
    if (st.phase !== 'dispatch' || st.dispatch) return null;
    const idx = choiceIndex(dispatchCase.choices, choice);
    if (idx < 0 || idx >= dispatchCase.choices.length) return null;
    const correct = idx === dispatchCase.correctIndex;
    st.dispatch = { choice: idx, correct, score: correct ? 1 : 0 };
    emit({ type: 'dispatch', choice: idx, correct });
    if (correct && !dispatchCase.correctGo) { st.noGo = true; enter('debrief'); }   // the right no-go: the duty ends at the table
    else enter(isPM ? 'ride' : 'depart');
    return { ok: true, correct, noGo: st.noGo, phase: st.phase };
  }
  function answerEvent(choice) {
    if (!event || !st.eventFired || st.eventAnswer) return null;
    const idx = choiceIndex(event.choices, choice);
    if (idx < 0 || idx >= event.choices.length) return null;
    const score = event.scores[idx];
    st.eventAnswer = { choice: idx, score };
    emit({ type: 'eventAnswer', choice: idx, score });
    if (event.kind === 'weather') {
      if (idx === 0) { st.diverted = true; st.destination = altField; st.distDestM = Math.hypot(destField.n - altField.n, destField.e - altField.e); emit({ type: 'divert', to: altField.id, distDestM: Math.round(st.distDestM) }); }
      else if (idx === 1) st.holding = true;                    // hold, then land at the destination as it clears
      else st.pressedOn = true;                                 // pressed on below minima: scored 0, recorded
    }
    if (event.kind === 'hold') st.holding = true;
    return { ok: true, score, diverted: st.diverted, destination: st.destination.id, phase: st.phase };
  }
  // answer(taskId, choice) — the PM tasks' door (and, by id, the dispatch case's and the event's too)
  function answer(taskId, choice) {
    if (taskId === dispatchCase.id) return answerDispatch(choice);
    if (event && taskId === event.id) return answerEvent(choice);
    const task = st.tasks.find(t => t.id === taskId || t.templateId === taskId);
    if (!task || task.answered || st.phase !== 'ride') return null;
    const idx = choiceIndex(task.choices, choice);
    if (idx < 0 || idx >= task.choices.length) return null;
    task.answered = true; task.choice = idx; task.correct = idx === task.correctIndex;
    if (task.correct) st.tasksCorrect++;
    emit({ type: 'taskAnswer', id: task.id, correct: task.correct });
    return { ok: true, correct: task.correct, phase: st.phase };
  }

  // ---- cruise compression (PF) ---------------------------------------------
  // The machine does NOT move the aircraft: it reports what the caller should do — jump the remaining
  // distance to the top-of-descent point, charging the fuel and the clock for the skipped cruise.
  function compress() {
    if (isPM || st.phase !== 'cruise') return { compressRequested: false, reason: 'notInCruise' };
    if (event && st.eventFired && !st.eventAnswer) return { compressRequested: false, reason: 'eventPending' };
    const todDistM = Math.round((rt.cruiseAltFt - 3000) / 1000 * 3 * 1852);
    const fromDistM = Math.round(st.distDestM);
    const skippedM = Math.max(0, fromDistM - todDistM);
    const elapsedMin = r1(skippedM / 1000 / 833.4 * 60);        // 450 kt ≈ 833.4 km/h over the ground
    const plan = {
      compressRequested: true, fromDistM, toDistDestM: todDistM, distDestM: todDistM, skippedM,
      fuelUsedKg: Math.round(elapsedMin * 43),                  // ≈ 2,580 kg/h in the cruise
      elapsedMin, atAltFt: rt.cruiseAltFt,
    };
    st.compressRequested = true; st.compression = plan; st.distDestM = todDistM;
    enter('descent');
    return plan;
  }

  // ---- the landing ---------------------------------------------------------
  function scoreTouchdown(td) {
    // the standards bands of flight/analysis.js, on the touchdown itself: sink ≤ 300 fpm is the mark,
    // the touchdown zone 200–700 m past the threshold, the centreline within the runway's own width
    let sinkScore;
    if (td.sinkFpm <= 300) sinkScore = 1;
    else if (td.sinkFpm <= 600) sinkScore = 1 - (td.sinkFpm - 300) / 300 * 0.5;
    else if (td.sinkFpm <= 1000) sinkScore = 0.5 - (td.sinkFpm - 600) / 400 * 0.5;
    else sinkScore = 0;
    let alongScore = null;
    if (td.alongM != null) {
      if (td.alongM >= 200 && td.alongM <= 700) alongScore = 1;
      else if (td.alongM >= 0 && td.alongM <= 1200) alongScore = 0.5;
      else alongScore = 0;
    }
    let crossScore = null;
    if (td.crossM != null) {
      const a = Math.abs(td.crossM);
      crossScore = a <= 5 ? 1 : a <= 15 ? 0.6 : a <= 30 ? 0.3 : 0;
    }
    let num = sinkScore * 0.5, den = 0.5;
    if (alongScore != null) { num += alongScore * 0.3; den += 0.3; }
    if (crossScore != null) { num += crossScore * 0.2; den += 0.2; }
    return Math.round(num / den * 100);
  }
  function recordTouchdown(obs) {
    const air = st.lastAir || {};
    const sinkFpm = Math.round(Math.abs(air.vsFpm != null ? air.vsFpm : obs.vsFpm != null ? obs.vsFpm : 600));
    let alongM = obs.tdAlongM != null ? obs.tdAlongM : obs.alongM != null ? obs.alongM : null;
    let crossM = obs.tdCrossM != null ? obs.tdCrossM : obs.crossM != null ? obs.crossM : null;
    if ((alongM == null || crossM == null) && obs.n != null && obs.e != null) {
      // the destination's runway frame: along from the field's centre → past the threshold
      const h = st.destination.trueHdg * Math.PI / 180, dn = obs.n - st.destination.n, de = obs.e - st.destination.e;
      const f = { along: dn * Math.cos(h) + de * Math.sin(h), cross: -dn * Math.sin(h) + de * Math.cos(h) };
      if (alongM == null) alongM = Math.round(f.along + st.destination.len / 2);
      if (crossM == null) crossM = Math.round(f.cross * 10) / 10;
    }
    st.touchdown = { sinkFpm, alongM, crossM, at: st.destination.id };
    st.landingScore = scoreTouchdown(st.touchdown);
    emit({ type: 'touchdown', ...st.touchdown, landingScore: st.landingScore });
  }

  // ---- the observation feed --------------------------------------------------
  let lastSnap = {};
  function update(a, b) {
    let dt = 0, obs = {};
    if (typeof a === 'number') { dt = a; obs = b || {}; }
    else obs = a || {};
    if (obs.t != null && Number.isFinite(obs.t)) { dt = dt || Math.max(0, obs.t - st.t); st.t = obs.t; }
    else if (dt) st.t += dt;
    st.phaseT += dt;
    lastSnap = { ...lastSnap, ...obs };
    if (obs.distDestM != null && Number.isFinite(obs.distDestM)) st.distDestM = obs.distDestM;
    if (obs.altFt != null) st.altFt = obs.altFt;

    switch (st.phase) {
      case 'brief':
        if (obs.briefDone) enter('dispatch');
        break;
      case 'dispatch':
        break;                                     // (answered through answerDispatch / answer)
      case 'depart':
        if (obs.onGround === false) { st.airborne = true; enter('climb'); }
        break;
      case 'climb':
        if (obs.onGround === false) st.airborne = true;
        if (obs.altFt != null && obs.altFt >= rt.cruiseAltFt * 0.9) enter('cruise');
        break;
      case 'cruise': {
        if (obs.altFt != null && obs.altFt < rt.cruiseAltFt * 0.85) enter('descent');        // a manual descent
        else if (st.distDestM <= (rt.cruiseAltFt - 3000) / 1000 * 3 * 1852) enter('descent'); // flown to the TOD
        break;
      }
      case 'descent':
        if (event && st.eventFired && !st.eventAnswer) break;   // the descent waits for the decision
        if ((obs.altFt != null && obs.altFt <= 10000) || st.distDestM <= 30000) enter('approach');
        break;
      case 'approach':
      case 'landed':
        break;
      case 'ride': {
        const arrivedNow = obs.arrived === true || obs.event === 'arrival' || (obs.onGround === true && obs.stopped === true);
        if (event && !st.eventFired && st.tasksIssued >= 2) fireEvent();
        if (arrivedNow) { st.arrived = true; enter('debrief'); break; }
        issueTask(false);
        break;
      }
      default:
        break;
    }
    // airborne tracking + the touchdown (kept out of the switch: a descent can run straight into it)
    if (!isPM && st.phase !== 'brief' && st.phase !== 'dispatch' && st.phase !== 'debrief') {
      if (obs.onGround === false) { st.airborne = true; st.lastAir = obs; }
      else if (obs.onGround === true && st.airborne && (st.phase === 'approach' || st.phase === 'descent')) {
        recordTouchdown(obs);
        st.airborne = false;
        enter('landed');
        if (obs.stopped === true) emit({ type: 'stopped' });   // debrief on the NEXT update / advance()
      } else if (st.phase === 'landed' && obs.stopped === true) enter('debrief');
    }
    return events.splice(0);
  }
  // advance(): the caller's explicit "next" — brief → dispatch, landed (stopped) → debrief
  function advance() {
    if (st.phase === 'brief') { enter('dispatch'); return true; }
    if (st.phase === 'landed') { enter('debrief'); return true; }
    return false;
  }
  const currentTask = () => st.tasks.find(t => !t.answered) || null;

  // ---- scoring ----------------------------------------------------------------
  function summary() {
    const parts = [];
    if (st.dispatch) parts.push({ w: 3, score: st.dispatch.score });
    if (st.eventFired) parts.push({ w: 2, score: st.eventAnswer ? st.eventAnswer.score : 0 });
    const decisionScore = parts.length ? Math.round(parts.reduce((a, p) => a + p.w * p.score, 0) / parts.reduce((a, p) => a + p.w, 0) * 100) : null;
    const rows = [];
    if (st.dispatch) rows.push({ name: `ディスパッチ判断（${dispatchCase.title}）`, val: dispatchCase.choices[st.dispatch.choice], std: dispatchCase.choices[dispatchCase.correctIndex], pass: st.dispatch.correct });
    if (st.eventFired) rows.push({ name: `飛行中の判断（${event.title}）`, val: st.eventAnswer ? event.choices[st.eventAnswer.choice] : '無回答', std: event.choices[event.correctIndex], pass: !!st.eventAnswer && st.eventAnswer.score >= 1 });
    const head = {
      kind: 'line', role: st.role, route: rt.id, from: rt.from, to: rt.to,
      destination: st.destination.id, alternate: rt.alternate, diverted: st.diverted,
      captain: { id: capt.id, name: capt.name, style: capt.style, strict: capt.strict },
      phase: st.phase, done: st.phase === 'debrief', noGo: st.noGo,
      decisionScore, rows,
    };
    if (isPM) {
      const taskScore = Math.round(st.tasksCorrect / PM_TASKS_PER_RIDE * 100);
      rows.push({ name: 'PM モニタータスク', val: `${st.tasksCorrect} / ${PM_TASKS_PER_RIDE} 正解`, std: 'タスク列の正答率', pass: st.tasksCorrect >= PM_TASKS_PER_RIDE * 0.6 });
      const raw = decisionScore == null ? taskScore : taskScore * 0.6 + decisionScore * 0.4;
      const total = clamp(Math.round(raw * capt.strict), 0, 100);
      return { ...head, taskScore, tasksCorrect: st.tasksCorrect, tasksTotal: PM_TASKS_PER_RIDE, total, grade: gradeOf(total) };
    }
    if (st.touchdown) rows.push({ name: `${st.touchdown.at} への接地`, val: `沈下 ${st.touchdown.sinkFpm} fpm${st.touchdown.alongM != null ? `・接地 ${st.touchdown.alongM} m` : ''}${st.touchdown.crossM != null ? `・センターライン ${st.touchdown.crossM} m` : ''}`, std: '接地帯 200〜700 m・沈下 300 fpm 以下', pass: st.landingScore >= 65 });
    const raw = st.landingScore == null ? (decisionScore || 0) : st.landingScore * 0.6 + (decisionScore || 0) * 0.4;
    const total = clamp(Math.round(raw * capt.strict), 0, 100);
    return { ...head, landingScore: st.landingScore, touchdown: st.touchdown, total, grade: gradeOf(total) };
  }

  return {
    st, route: rt, role: st.role, captain: capt, origin, destination0: destField, alternate: altField,
    dispatchCase, scheduledEvent: event,
    update, advance, start: advance, confirmBrief: advance,
    answer, answerDispatch, answerEvent, compress,
    currentTask, summary,
    get phase() { return st.phase; },
    get destination() { return st.destination; },
    get diverted() { return st.diverted; },
    get event() { return st.eventFired ? event : null; },
    get compressRequested() { return st.compressRequested; },
    get tasks() { return st.tasks; },
  };
}

// the briefing card's numbers for a route (ロスター・ブリーフィング表示用): the route, its fields, its alternate
export function lineBrief(route) {
  const rt = resolveRoute(route);
  return { route: rt, from: lineAirfieldById(rt.from), to: lineAirfieldById(rt.to), alternate: lineAirfieldById(rt.alternate), cruiseAltFt: rt.cruiseAltFt };
}
