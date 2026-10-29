// CADET — content/chair-flight.js : k4, 交信のチェアフライト — the first flight's radio said from a desk of the training
// device room, the cadet as the pilot and ミラー 講師 at the console as every controller. The flight is day 10's own
// (the first flight: t1 → a1 → t3, career/day.js planFor), so its exchanges are content/dialog/atc.js dayRadio()'s,
// in the order that day asks them (radioPlan: the day's radio steps, t1's own take-off clearance where t1 asks it).
// Between them the switches the textbook's script has (FLIGHT LAB's radio.js FLIGHT 'ACT' lines, at LAB): the COM1
// frequency for each station, the altimeter from the ATIS, the transponder's code, listening before calling. What
// changes from one run to the next (the seed): the ATIS (its letter, wind, temperature, altimeter; on the way back a new
// letter), the exit (A2 or A3), and one or two of: another aircraft on the frequency (not for you: no answer), the taxi
// instruction cut by noise (say again). These are only added to day 10's order, never put in its place.
// The airport LAB, its frequencies and the call sign are fictional (atc.js). Facts as the textbook's part 1 says them
// (each item names its section: the debrief links to it).
import { dayRadio, CALL, FREQ, setCall } from './dialog/atc.js';
import { stepsFor, planFor, STEPS } from '../career/day.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];

// the radio of a day with these lessons, in its order: [{ step, seq, ids }] — each radio step of career/day.js's
// stepsFor (its sequence's exchanges); a lesson that gives its own take-off clearance (t1) asks it where it begins;
// the landing (t3) asks the final call and the clearance (flight/day-mode.js)
export function radioPlan(FL, lessons, radio) {
  const out = [];
  for (const step of stepsFor(FL, lessons)) {
    const seq = STEPS[step] && STEPS[step].radio ? STEPS[step].radio : step === 't1' ? 'takeoff' : step === 't3' ? 'final' : null;
    if (seq) out.push({ step, seq, ids: radio.sequences[seq].slice() });
  }
  return out;
}
// the first flight (day 10)'s lessons
export const FIRST_FLIGHT = 'a1';

// what each part of the flight is called on the panel and the screen, and the section of the textbook it is in
const PART = {
  atis: { ja: '出発前：ATIS', sec: 'comm.atis', at: 'ramp' }, ground: { ja: '地上管制：タキシーの許可', sec: 'comm.dep', at: 'ramp' },
  tower: { ja: '管制塔：出発の準備', sec: 'comm.tower', at: 'hold' }, takeoff: { ja: '管制塔：離陸の許可（t1）', sec: 'comm.tower', at: 'runway' },
  leave: { ja: '管制塔：訓練空域へ', sec: 'comm.tower', at: 'climb' }, back: { ja: '帰り：管制塔を呼ぶ', sec: 'comm.arrive', at: 'area' },
  final: { ja: '最終進入：着陸の許可（t3）', sec: 'comm.arrive', at: 'final' }, exit: { ja: '着陸後：滑走路を出る', sec: 'comm.arrive', at: 'rollout' },
  groundIn: { ja: '地上管制：駐機場へ', sec: 'comm.arrive', at: 'clear' },
};
// the ATIS of the run: its letter, the time, the wind, the temperature and dew point, the altimeter (realistic for a fine
// LAB morning; the seed picks them)
const LETTERS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'];
function weatherOf(r) {
  const i = Math.floor(r() * 5), tempC = 18 + Math.floor(r() * 9), qnh = pick([29.92, 30.01, 29.87, 30.12, 29.95, 30.05, 29.89], r);
  return { info: LETTERS[i], next: LETTERS[i + 1], zulu: pick(['1253', '1353', '1453'], r), windMag: pick([340, 350, 360, 10, 20], r), windKt: pick([4, 5, 6, 7, 8], r), tempC, dewC: tempC - 4 - Math.floor(r() * 5), qnh };
}
const digitsQnh = (q) => q.toFixed(2);
const otherQnh = (q, d) => (q + d).toFixed(2);

// chairScript(FL, { seed }) → { items, radio, back (the second ATIS's radio), weather, plan, events }
// item: { kind: 'op' | 'ex', id, part, sec, …} — op: { q, hear?: [lines], choices: [{ t, ok, why }], note, value }
// (a switch set: COM1, the altimeter, the code; or what to do before calling); ex: { ex } (an exchange of atc.js's
// shape: hear, q, choices [{ en, ok, why, negative }], reply, note, time)
// (the first flight's radio is the Archer's, whatever today's aircraft — practised from the tablet on a twin's day too:
// its call sign made the Archer's while the script is written, today's put back after)
export function chairScript(FL, o = {}) {
  const was = { ...CALL };
  setCall('pa28');
  try { return archerScript(FL, o); } finally { Object.assign(CALL, was); }
}
function archerScript(FL, { seed = 1 } = {}) {
  const r = rng(seed * 104729 + 17), W = weatherOf(r), exit = r() < 0.5 ? 'A2' : 'A3';
  const plan = planFor(FL, FIRST_FLIGHT);
  const radio = dayRadio({ ...W, intent: 'area' }), back = dayRadio({ ...W, info: W.next, zulu: String(+W.zulu + 100).padStart(4, '0'), intent: 'area' });
  // (the two that may come: the seed picks one or both)
  const events = r() < 0.5 ? ['other', 'partial'] : r() < 0.5 ? ['other'] : ['partial'];
  const S = CALL.short, items = [];
  const op = (part, id, q, choices, more = {}) => items.push({ kind: 'op', part, sec: more.sec || PART[part].sec, id, q, choices, note: more.note || '', hear: more.hear || [] });
  // (an exchange with no note of its own: what every call or read-back of its kind does — src: AIM 4-2-3 (the first call:
  // who is called, who calls, where, what is wanted), AIM 4-4-7 (read back the runway, the altitude, the heading))
  const KIND_NOTE = { call: '呼ぶときは、相手 → 自分のコールサイン → 位置 → 要求の順です（AIM 4-2-3）。', readback: '滑走路・高度・針路・hold short は、言われたとおりに復唱します（AIM 4-4-7）。' };
  const ex = (part, id, x, more = {}) => items.push({ kind: 'ex', part, sec: more.sec || PART[part].sec, id, ex: x.note ? x : { ...x, note: KIND_NOTE[x.kind] || '' } });
  const wa = (ja) => `${ja}${/[A-Za-z]$/.test(ja) ? ' ' : ''}は`;            // (ATIS は: the book's spacing)
  const com = (part, id, want, why) => op(part, `com:${id}`, `COM1 の周波数を合わせます。${wa(want.ja)}？`,
    [{ t: `${FREQ.atis}（LAB ATIS）`, ok: want.f === FREQ.atis }, { t: `${FREQ.ground}（LAB Ground）`, ok: want.f === FREQ.ground }, { t: `${FREQ.tower}（LAB Tower）`, ok: want.f === FREQ.tower }]
      .map(c => ({ ...c, why: c.ok ? '' : why })), { sec: 'radio.why', note: `${wa(want.ja)} ${want.f}。壁の画面の周波数表にあります。` });
  for (const p of radioPlan(FL, plan.lessons, radio)) {
    const R = p.seq === 'back' || p.seq === 'final' || p.seq === 'exit' || p.seq === 'groundIn' ? back : radio;
    const X = (id) => { const x = R.exchanges[id]; return typeof x === 'function' ? x(exit) : x; };
    if (p.seq === 'atis') {
      com('atis', 'atis', { ja: 'ATIS', f: FREQ.atis }, 'ATIS は 127.65 です。ほかの周波数では、録音の放送は聞こえません。');
      // (the ATIS heard in three parts, the kneeboard filled in between: its letter first, the altimeter at the end)
      const [a, b, c] = atisParts(R.atisText);
      op('atis', 'atis:letter', 'ひざ板に書き取ります。いま聞いた情報の記号は？', [W.info, W.next, LETTERS[(LETTERS.indexOf(W.info) + 4) % 6]].map((t, k) => ({ t: `${t}（${t[0]}）`, ok: k === 0, why: k ? `最初に “information ${W.info}” と言っています。記号は最初の交信で伝えます（AIM 4-1-13）。` : '' })),
        { hear: [{ who: 'ATIS', en: a, ja: `LAB の情報 ${W.info[0]}。${W.zulu.slice(0, 2)}:${W.zulu.slice(2)} UTC。風 ${String(W.windMag).padStart(3, '0')}° ${W.windKt} kt。` }], note: `記号は ${W.info}。最初の交信で “with information ${W.info}” と言います。` });
      const atis = X('atis'), [c1, c2] = splitLast(c);
      ex('atis', 'atis', { ...atis, hear: [{ who: 'ATIS', en: b, ja: '視程 10 SM、3,500 ft に少しの雲。気温・露点。' }, { who: 'ATIS', en: c1, ja: `高度計 ${digitsQnh(W.qnh)}。離着陸の滑走路 36。` }, ...(c2 ? [{ who: 'ATIS', en: c2, ja: `最初の交信で ${W.info[0]} を聞いたと伝えよ。` }] : [])] });
      continue;
    }
    if (p.seq === 'ground') {
      com('ground', 'ground', { ja: '地上管制（LAB Ground）', f: FREQ.ground }, '地上走行の前に呼ぶのは地上管制（121.7）です。ATIS は録音で、話しかけられません。');
      const call = X('gnd_call');
      if (events.includes('partial')) {
        // (the taxi instruction, its middle lost in noise: say again, then it comes whole) src: the Pilot/Controller
        // Glossary ("say again"); 14 CFR 91.123(a) (a clearance not understood: ask at once)
        const full = call.reply[0], cut = full.en.replace(/, hold short of[^.]*\./, ', hold short … (雑音) ….');
        ex('ground', 'gnd_call', { ...call, reply: [{ who: 'GND', en: cut, ja: '（途中が雑音で聞こえない）' }] });
        ex('ground', 'say_again', { station: 'GND', freq: FREQ.ground, kind: 'call', q: '指示の途中が聞き取れませんでした。何と言いますか？', time: 20,
          choices: [{ en: `LAB Ground, ${S}, say again.`, ok: true },
            { en: `Taxi via Alpha, ${S}.`, why: '聞こえた所だけ復唱すると、残りも受け取ったと思われます。推測で動かず、聞き直します（第 8 章「わからないとき・従えないとき」）。', negative: `${S}, negative. Read back hold short instructions.` },
            { en: `Roger, ${S}.`, why: 'Roger は「受け取った」だけです。何を止まるのか分からないまま動けません。“Say again” で聞き直します。', negative: `${S}, read back hold short instructions.` }],
          reply: [full], note: '聞き取れなかった所は、推測しないで “Say again”。' }, { sec: 'comm.clarify' });
      } else ex('ground', 'gnd_call', call);
      ex('ground', 'gnd_rb', X('gnd_rb'));
      // src: AIM 4-1-20 (VFR 1200), AIM 6-4-2 (7600, the radio failed), AIM 6-2-2 (7700, an emergency)
      op('ground', 'xpdr', '管制からトランスポンダーのコードの指定はありません。コードは？', [{ t: '1200（VFR）', ok: true }, { t: '7600', why: '7600 は無線の故障のときのコードです。' }, { t: '7700', why: '7700 は緊急のときのコードです。' }],
        { sec: 'comm.radar', note: '指定がなければ VFR は 1200 です（4 回目の授業：レーダー業務を終えたら VFR コード 1200 に戻す）。' });
      continue;
    }
    if (p.seq === 'tower') {
      com('tower', 'tower', { ja: '管制塔（LAB Tower）', f: FREQ.tower }, 'ランナップのあと、滑走路の手前で呼ぶのは管制塔（118.3）です。');
      const other = events.includes('other');
      op('tower', 'listen', other ? '周波数を変えたら、ほかの機の交信が聞こえました。どうしますか？' : '周波数を変えました。呼ぶ前に、することは？',
        other ? [{ t: '自分宛てではない。交信が終わって空くまで待ってから呼ぶ', ok: true }, { t: `“Roger, ${S}.” と答える`, why: `呼ばれたのは別の機です。自分のコールサイン（${S}）ではない交信には答えません。` }, { t: 'すぐに呼ぶ', why: 'ほかの機が話しているときに送信すると、両方とも聞こえなくなります（ブロック）。まず聞きます。' }]
          : [{ t: '数秒聞いて、誰も話していないのを確かめる', ok: true }, { t: 'すぐに呼ぶ', why: '周波数を変えた直後は、ほかの交信が続いていることがあります。まず聞きます（AIM 4-2-2）。' }, { t: '管制塔からの呼びかけを待つ', why: '準備ができたことは、こちらから伝えます。まず聞いて、空いていたら呼びます。' }],
        { sec: 'radio.technique', hear: other ? [{ who: 'TWR', en: 'November Four Two Kilo Papa, LAB Tower, frequency change approved.', ja: '（出ていくほかの機 N42KP に、周波数の変更の承認）' }] : [], note: '「聞く」が 7 割。空いてから呼びます。' });
      for (const id of p.ids) ex('tower', id, X(id));
      continue;
    }
    if (p.seq === 'back') {
      // (the ATIS listened to again before coming back — it has changed — on the other radio, COM2: COM1 keeps Tower's
      // frequency; then COM1 checked before the call) src: the textbook's comm.arrive (the ATIS, then Tower); radio.equip
      // (two radios, COM1 and COM2)
      const [a2] = atisParts(back.atisText);
      op('back', 'atis:again', '帰る前に、COM2 で ATIS を聞き直しました。いまの情報の記号は？', [W.next, W.info, LETTERS[(LETTERS.indexOf(W.next) + 2) % 6]].map((t, k) => ({ t: `${t}（${t[0]}）`, ok: k === 0, why: k ? `出発のときは ${W.info} でしたが、いまの放送は “information ${W.next}” です。新しい記号を伝えます。` : '' })),
        { sec: 'comm.arrive', hear: [{ who: 'ATIS', en: a2, ja: `LAB の情報 ${W.next[0]}（記号が変わった）。` }], note: `記号が ${W.info} から ${W.next} に変わりました。呼ぶときは “with information ${W.next}”。` });
      com('back', 'back', { ja: '管制塔（LAB Tower）', f: FREQ.tower }, '訓練空域から帰るときに呼ぶのは、出ていくときと同じ管制塔（118.3）です。');
    }
    if (p.seq === 'groundIn') com('groundIn', 'groundIn', { ja: '地上管制（LAB Ground）', f: FREQ.ground }, '“Ground point seven” は 121.7 です。滑走路を出て止まったら、地上管制を呼びます。');
    for (const id of p.ids) ex(p.seq, id, X(id));
  }
  // (the altimeter is set from the ATIS: the ATIS's question is that; the wrong choices, near ones)
  void otherQnh;
  // (the call sign kept as it is now, the Archer's: CALL itself is today's again after)
  const call = { ...CALL };
  return { items, radio: { ...radio, call }, back: { ...back, call }, weather: W, exit, plan, events, parts: PART };
}
// (the ATIS's last part, the altimeter and the runway, then the request on a line of its own)
const splitLast = (t) => { const i = t.indexOf(' Advise'); return i > 0 ? [t.slice(0, i), t.slice(i + 1)] : [t, null]; };
// the ATIS in three parts: the letter, time and wind; the sky and temperature; the altimeter, runway and the request
function atisParts(text) {
  const s = String(text).split(/(?<=\.)\s+/);
  const i = s.findIndex(x => /^Visibility|^Few|^Temperature/.test(x)), j = s.findIndex(x => /^Altimeter/.test(x));
  return [s.slice(0, i).join(' '), s.slice(i, j).join(' '), s.slice(j).join(' ')];
}
// the station names on the panel (the radio's own, and the two the textbook's flight has)
export const STATION_JA = { ATIS: 'LAB ATIS', GND: 'LAB Ground', TWR: 'LAB Tower', DEP: 'LAB Departure', APP: 'LAB Approach', OPS: '操作' };
