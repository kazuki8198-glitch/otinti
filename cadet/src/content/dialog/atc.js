// CADET — content/dialog/atc.js : the radio on the first day (M4). LAB ATIS, LAB Ground and LAB Tower are FICTIONAL,
// as FLIGHT LAB's are; the phrases follow FLIGHT LAB's radio chapter (radio.js: the FAA AIM 4-2 ways of saying numbers,
// JO 7110.65's controller phrases), set on CADET's own airfield: the east ramp, taxiway Alpha and its connectors Alpha
// One / Two / Three, runway 36.
// Today's aircraft is N738SY (a fictional registration): "Archer Seven Three Eight Sierra Yankee", after the first call
// "Archer Eight Sierra Yankee". FLIGHT LAB's lessons call their aircraft "Archer Seven Lima Alpha"; what the tower says
// in a lesson is shown with today's call sign (ourCall), the answer graded is FLIGHT LAB's own.
// Each exchange: hear (lines heard first) → the choices (the right one, two wrong ones, each wrong one with why) →
// reply (heard after the right answer). A wrong answer brings the controller's correction (negative) and the choice
// again. The day's sequences group them (the ground call, then the read-back of the taxi instruction).
export const CALL = { full: 'Archer Seven Three Eight Sierra Yankee', short: 'Archer 8SY', spokenShort: 'Archer Eight Sierra Yankee', reg: 'N738SY' };
// (M6) the twin's days fly the Seminole N452SY (fictional): "Seminole Four Five Two Sierra Yankee", "Seminole 2SY";
// setCall('pa44' | 'pa28') makes today's aircraft the radio's (CALL is read as the day is made)
export const CALLS = {
  pa28: { full: 'Archer Seven Three Eight Sierra Yankee', short: 'Archer 8SY', spokenShort: 'Archer Eight Sierra Yankee', reg: 'N738SY' },
  pa44: { full: 'Seminole Four Five Two Sierra Yankee', short: 'Seminole 2SY', spokenShort: 'Seminole Two Sierra Yankee', reg: 'N452SY' },
};
export function setCall(type = 'pa28') { Object.assign(CALL, CALLS[type] || CALLS.pa28); return CALL; }
export const FREQ = { atis: '127.65', ground: '121.7', tower: '118.3' };      // (fictional, as FLIGHT LAB's)
export function ourCall(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/(Archer|Seminole) Seven Lima Alpha/g, CALL.full).replace(/(Archer|Seminole) 7LA/g, CALL.short);
}
// what the speech synthesis says: the short call sign in words
export const spoken = (s) => String(s).replace(/Archer 8SY|Seminole 2SY/g, CALL.spokenShort);

const DIG = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'niner'];
const digits = (s) => String(s).split('').filter(c => /[0-9.]/.test(c)).map(c => (c === '.' ? 'point' : DIG[+c])).join(' ');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// a wrong altimeter setting that sounds close: the last two digits the other way round (29.92 → 29.29)
const swapped = (txt, v) => { const [i, f] = txt.split('.'), r = `${i}.${f[1]}${f[0]}`; return r === txt ? (v - 0.1).toFixed(2) : r; };
const CX = { A2: 'Alpha Two', A3: 'Alpha Three' };

// dayRadio(FL, weather) → { exchanges: { id: exchange }, sequences: { id: [ids] }, info, weather }
// weather: { windMag, windKt, qnh (inHg), tempC, dewC, zulu 'HHMM', info letter }
// (intent: 'area' — out to the practice area and back; 'pattern' — take-offs and landings in the circuit. solo: the
// first solo — the tower is told it is a student's first)
export function dayRadio(weather) {
  const W = { windMag: 10, windKt: 5, qnh: 29.92, tempC: 15, dewC: 8, zulu: '1253', info: 'Alpha', intent: 'area', solo: false, xc: false, ifr: false, ...weather };
  const pattern = W.intent === 'pattern';
  const goEn = pattern ? 'for closed traffic' : 'VFR to the practice area', goJa = pattern ? '場周経路' : '訓練空域';
  const windSay = W.windKt < 3 ? 'wind calm' : `wind ${digits(String(Math.round(W.windMag) || 360).padStart(3, '0'))} at ${digits(Math.round(W.windKt))}`;
  const windJa = W.windKt < 3 ? '風は静穏' : `風 ${String(W.windMag).padStart(3, '0')}° ${W.windKt} kt`;
  const qnhSay = digits(W.qnh.toFixed(2).replace('.', '')), qnhTxt = W.qnh.toFixed(2);
  const info = W.info, F = CALL.full, S = CALL.short;
  // (M8) the solo cross-country goes out with a transponder code for the flight following (the read-back has it too)
  const sqEn = W.xc ? ', squawk four two one five' : '', sqJa = W.xc ? 'スコーク 4215。' : '';
  // (M6: a day of low cloud — the instrument chapter flies in it — has its own sky and the ILS in use)
  const skyEn = W.ifr ? 'Visibility three, mist. Ceiling eight hundred broken, one thousand five hundred overcast' : 'Visibility one zero. Few clouds at three thousand five hundred';
  const skyJa = W.ifr ? '視程 3 SM、もや。雲底 800 ft（BKN）、1,500 ft に OVC' : '視程 10 SM。3,500 ft に少しの雲';
  const ATIS = `LAB information ${info}. ${cap(digits(W.zulu))} Zulu. ${cap(windSay)}. ${skyEn}. `
    + `Temperature ${digits(W.tempC)}, dew point ${digits(String(W.dewC).padStart(2, '0'))}. Altimeter ${qnhSay}. ${W.ifr ? 'I L S runway three six approach in use. ' : ''}Landing and departing runway three six. `
    + `Advise on initial contact you have information ${info}.`;
  const X = {};
  // ① ATIS: listen, then what to set
  X.atis = { station: 'ATIS', freq: FREQ.atis, kind: 'listen',
    hear: [{ who: 'ATIS', en: ATIS, ja: `LAB の情報 ${info.charAt(0)}。${W.zulu.slice(0, 2)}:${W.zulu.slice(2)} UTC。${windJa}。${skyJa}。気温 ${W.tempC}℃・露点 ${W.dewC}℃。高度計 ${qnhTxt}。離着陸の滑走路 36。最初の交信で ${info.charAt(0)} を聞いたと伝えよ。` }],
    q: 'ATIS の高度計規正値は？（高度計の BARO に合わせる値）',
    choices: [{ en: qnhTxt, ok: true }, { en: (W.qnh + 0.1).toFixed(2), why: '数字は 1 桁ずつ読まれます。もう一度聞いてみましょう。' }, { en: swapped(qnhTxt, W.qnh), why: `数字の順番に気を付けて。「${qnhSay}」は ${qnhTxt} です。` }],
    note: `高度計を ${qnhTxt} に合わせ、表示が飛行場の標高（55 ft）に近いことを確かめます。`, time: 30 };
  // ② the first call to Ground, and the taxi instruction's read-back
  X.gnd_call = { station: 'GND', freq: FREQ.ground, kind: 'call',
    q: '地上管制を最初に呼びます。正しい呼び方は？',
    choices: [
      { en: `LAB Ground, ${F}, student pilot, at the east ramp with information ${info}, ${goEn}, request taxi.`, ok: true },
      { en: `LAB Ground, ${S}, request taxi.`, why: '最初の交信ではコールサインを省略しません（省略は管制官が先にしてから）。位置と ATIS も伝えます（AIM 4-2-3・4-2-4）。',
        negative: `Aircraft calling LAB Ground, say again your full call sign, position and request.` },
      { en: 'Ground, Archer, ready to go, over.', why: '相手 → 自分 → 位置 → ATIS → 要求、の順です。“over” は使いません。',
        negative: 'Station calling Ground, say again.' },
    ],
    reply: [{ who: 'GND', en: `${F}, LAB Ground, runway three six, taxi via Alpha, hold short of runway three six at Alpha One${sqEn}.`, ja: `滑走路 36 へ。誘導路 A 経由、A1 で滑走路 36 の手前に止まれ。${sqJa}` }],
    time: 25 };
  X.gnd_rb = { station: 'GND', freq: FREQ.ground, kind: 'readback',
    q: 'タキシーの指示を復唱します。',
    choices: [
      { en: `Runway three six, taxi via Alpha, hold short of runway three six at Alpha One${sqEn}, ${S}.`, ok: true },
      { en: `Taxi via Alpha, ${S}.`, why: '滑走路の手前で止まる指示（hold short）は必ず復唱します（AIM 4-3-18）。',
        negative: `${S}, negative. Read back the hold short instruction: hold short of runway three six at Alpha One.` },
      { en: `Runway three six, cleared for takeoff, ${S}.`, why: '「滑走路 36 へ」は離陸の許可ではありません。滑走路に入る許可でもありません。',
        negative: `${S}, negative, you are not cleared for takeoff. Taxi via Alpha, hold short of runway three six at Alpha One.` },
    ],
    note: `誘導路 A を南へ走り、A1 の停止線の手前で止まります。ランナップはそこで。今日は${goJa}です。${W.xc ? 'トランスポンダーは 4215 に。' : ''}`, time: 25 };
  // ③ the tower: ready, then line up and wait
  X.twr_ready = { station: 'TWR', freq: FREQ.tower, kind: 'call',
    q: 'ランナップが終わりました。管制塔に出発の準備ができたことを伝えます。',
    choices: [
      { en: `LAB Tower, ${F}, holding short runway three six at Alpha One, ready for departure, ${goEn}${W.solo ? ', first solo' : W.xc ? ', student pilot solo' : ''}.`, ok: true },
      { en: `LAB Ground, ${S}, ready for departure.`, why: '滑走路の手前まで来たら、周波数を管制塔（118.3）に変えて管制塔を呼びます（AIM 4-3-14）。',
        negative: `${S}, LAB Ground, contact Tower one one eight point three.` },
      { en: `LAB Tower, ${S}, taking off runway three six.`, why: '管制塔のある空港では、許可を受けてから滑走路に入ります。自分で離陸を宣言しません。',
        negative: `${S}, LAB Tower, hold short of runway three six.` },
    ],
    reply: [{ who: 'TWR', en: `${CALL.short}, LAB Tower, runway three six, line up and wait.`, ja: '滑走路 36 に入って待て。' }],
    time: 25 };
  X.twr_luaw = { station: 'TWR', freq: FREQ.tower, kind: 'readback',
    q: '指示を復唱します。',
    choices: [
      { en: `Runway three six, line up and wait, ${S}.`, ok: true },
      { en: `Runway three six, cleared for takeoff, ${S}.`, why: '“line up and wait” は離陸許可ではありません（AIM 5-2-5）。滑走路に入って止まり、許可を待ちます。',
        negative: `${S}, negative, line up and wait runway three six.` },
      { en: `Roger, ${S}.`, why: '滑走路に入る指示は、滑走路番号を付けて復唱します（AIM 4-4-7）。',
        negative: `${S}, read back line up and wait.` },
    ],
    note: '停止線を越えて滑走路に入り、センターラインに合わせて止まります。', time: 25 };
  // ④ after the climb: off to the practice area
  X.twr_leave = { station: 'TWR', freq: FREQ.tower, kind: 'readback',
    hear: [{ who: 'TWR', en: `${S}, frequency change approved. Report returning.`, ja: '周波数の変更を承認。戻るときに報告せよ。' }],
    q: '応答します。',
    choices: [
      { en: `Frequency change approved, will report returning, ${S}.`, ok: true },
      { en: 'Bye.', why: '応答の最後にはコールサインを付けます（AIM 4-2-3）。', negative: `${S}, say again.` },
      { en: `Contact departure, ${S}.`, why: '言われたことをそのまま返します。今日は出発管制を呼ばずに、訓練空域へ向かいます。', negative: `${S}, negative, frequency change approved.` },
    ], time: 25 };
  // ⑤ back from the practice area: in for a straight-in, the landing clearance on final
  X.twr_back = { station: 'TWR', freq: FREQ.tower, kind: 'call',
    q: '訓練空域から戻ります。管制塔を呼びます。',
    choices: [
      { en: `LAB Tower, ${F}, over the practice area, three thousand, with information ${info}, inbound for landing.`, ok: true },
      { en: `LAB Tower, ${S}, landing.`, why: '最初の呼び出しでは、位置・高度・ATIS・意図を伝えます（AIM 4-3-2）。',
        negative: `Aircraft calling LAB Tower, say again your position and altitude.` },
      { en: `LAB Ground, ${F}, inbound.`, why: '飛んでいる間の相手は管制塔（118.3）です。地上管制は地上を動く機を見ています。',
        negative: `Aircraft calling Ground, contact Tower one one eight point three.` },
    ],
    reply: [{ who: 'TWR', en: `${S}, LAB Tower, make straight-in runway three six, report final.`, ja: '滑走路 36 へ直線進入せよ。最終進入で報告せよ。' }],
    time: 25 };
  X.twr_straight = { station: 'TWR', freq: FREQ.tower, kind: 'readback',
    q: '指示を復唱します。',
    choices: [
      { en: `Straight-in runway three six, report final, ${S}.`, ok: true },
      { en: `Left downwind runway three six, ${S}.`, why: '直線進入（straight-in）の指示です。言われた入り方を、滑走路番号と一緒に復唱します。',
        negative: `${S}, negative, make straight-in runway three six.` },
      { en: `Roger, ${S}.`, why: '進入の方法と報告の地点を復唱します。Roger だけでは足りません。', negative: `${S}, read back.` },
    ], time: 25 };
  X.twr_final = { station: 'TWR', freq: FREQ.tower, kind: 'call',
    q: '最終進入に入りました。報告します。',
    choices: [
      { en: `LAB Tower, ${S}, final runway three six.`, ok: true },
      { en: `LAB Tower, ${S}, cleared to land.`, why: '許可はパイロットが言うものではありません。位置を報告して、許可を待ちます。', negative: `${S}, report your position.` },
      { en: `LAB Tower, ${S}, downwind.`, why: 'いまは最終進入（final）です。位置を正しく伝えます。', negative: `${S}, verify position.` },
    ],
    reply: [{ who: 'TWR', en: `${S}, runway three six, ${windSay}, cleared to land.`, ja: `滑走路 36、${windJa}、着陸を許可。` }],
    time: 20 };
  X.twr_land = { station: 'TWR', freq: FREQ.tower, kind: 'readback',
    q: '着陸許可を復唱します。',
    choices: [
      { en: `Runway three six, cleared to land, ${S}.`, ok: true },
      { en: `Cleared to land, ${S}.`, why: '着陸許可は滑走路番号を付けて復唱します（取り違えは滑走路誤進入の原因）。', negative: `${S}, read back runway number.` },
      { en: `Landing runway one eight, ${S}.`, why: '滑走路番号の取り違えは重大な誤りです。36 です。', negative: `${S}, negative, runway three six, cleared to land.` },
    ], time: 20 };
  // ⑥ off the runway and back to the ramp (the exit is filled in with the connector ahead)
  X.twr_exit = (exit) => ({ station: 'TWR', freq: FREQ.tower, kind: 'readback',
    hear: [{ who: 'TWR', en: `${S}, turn right at ${CX[exit]}, contact Ground point seven.`, ja: `誘導路 ${exit} で右に出よ。地上管制 121.7 と交信せよ。` }],
    q: '指示を復唱します。',
    choices: [
      { en: `Right at ${CX[exit]}, Ground point seven, ${S}.`, ok: true },
      { en: `Left at ${CX[exit]}, Ground point seven, ${S}.`, why: '右（right）です。曲がる向きの取り違えは、ほかの機や車とぶつかる原因になります。', negative: `${S}, negative, turn right at ${CX[exit]}.` },
      { en: `Roger, ${S}.`, why: '出る誘導路と次の周波数を復唱します。', negative: `${S}, read back.` },
    ], note: `${exit} で滑走路を出て、停止線を越えたら止まり、地上管制を呼びます。`, time: 25 });
  X.gnd_in = (exit) => ({ station: 'GND', freq: FREQ.ground, kind: 'call',
    q: '滑走路を出ました。地上管制を呼びます。',
    choices: [
      { en: `LAB Ground, ${S}, clear of runway three six at ${CX[exit]}, taxi to the east ramp.`, ok: true },
      { en: `LAB Ground, ${S}, request taxi.`, why: 'どこにいて（滑走路を出た）、どこへ行きたいか（エプロン）を伝えます。', negative: `${S}, say position.` },
      { en: `LAB Tower, ${S}, clear of the runway.`, why: '「Ground point seven」と言われました。地上管制 121.7 に変えて呼びます。', negative: `${S}, contact Ground point seven.` },
    ],
    reply: [{ who: 'GND', en: `${S}, LAB Ground, taxi to the east ramp via Alpha.`, ja: '誘導路 A 経由で東のエプロンへ。' }],
    time: 25 });
  X.gnd_in_rb = { station: 'GND', freq: FREQ.ground, kind: 'readback',
    q: '指示を復唱します。',
    choices: [
      { en: `Taxi to the east ramp via Alpha, ${S}.`, ok: true },
      { en: `Roger, ${S}.`, why: '地上の経路の指示も復唱します（AIM 4-3-18）。', negative: `${S}, read back.` },
      { en: `Taxi via Alpha, hold short of runway three six, ${S}.`, why: '今度は滑走路の手前で止まる指示はありません。言われたことだけを、そのまま返します。', negative: `${S}, negative, taxi to the east ramp via Alpha.` },
    ], note: '駐機場で止まり、チェックリストでエンジンを止めます。交信はここまでです。', time: 25 };
  // ⑦ the take-off clearance (before a lesson that starts rolling at once: e1, e2)
  X.twr_takeoff = { station: 'TWR', freq: FREQ.tower, kind: 'readback',
    hear: [{ who: 'TWR', en: `${S}, runway three six, ${windSay}, cleared for takeoff.`, ja: `滑走路 36、${windJa}、離陸を許可。` }],
    q: '離陸許可を復唱します。',
    choices: [
      { en: `Runway three six, cleared for takeoff, ${S}.`, ok: true },
      { en: `Cleared for takeoff, ${S}.`, why: '離陸許可は滑走路番号を付けて復唱します（AIM 4-4-7）。', negative: `${S}, read back runway number.` },
      { en: `Runway three six, line up and wait, ${S}.`, why: 'いま出たのは離陸の許可です。聞こえたとおりに返します。', negative: `${S}, negative, runway three six, cleared for takeoff.` },
    ], note: 'センターラインを保って、出力を全開にします。', time: 20 };
  // ⑧ in the circuit: after the climb (or a go-around), round again to land
  X.twr_closed = { station: 'TWR', freq: FREQ.tower, kind: 'readback',
    hear: [{ who: 'TWR', en: `${S}, make left closed traffic runway three six, report midfield downwind.`, ja: '滑走路 36 の左場周経路を回れ。ダウンウインドの中間で報告せよ。' }],
    q: '指示を復唱します。',
    choices: [
      { en: `Left closed traffic runway three six, report midfield downwind, ${S}.`, ok: true },
      { en: `Right closed traffic runway three six, ${S}.`, why: '左（left）の場周経路です。滑走路 36 の左場周は、滑走路の西側を回ります。', negative: `${S}, negative, make left closed traffic.` },
      { en: `Roger, ${S}.`, why: '回る向きと報告の地点を復唱します。', negative: `${S}, read back.` },
    ], note: '場周経路の高度（1,000 ft AGL）でダウンウインドに入ります。', time: 25 };
  // ⑨ the first solo: stopped after a full-stop landing, off again for the next circuit
  X.twr_stopgo = { station: 'TWR', freq: FREQ.tower, kind: 'readback',
    hear: [{ who: 'TWR', en: `${S}, runway three six, ${windSay}, cleared for takeoff, make left closed traffic.`, ja: `滑走路 36、${windJa}、離陸を許可。左場周経路を回れ。` }],
    q: '復唱します。',
    choices: [
      { en: `Runway three six, cleared for takeoff, left closed traffic, ${S}.`, ok: true },
      { en: `Cleared for takeoff, ${S}.`, why: '滑走路番号と、離陸後の指示（左場周）も復唱します。', negative: `${S}, read back runway and traffic pattern.` },
      { en: `Runway three six, taxi to the ramp, ${S}.`, why: 'もう一度離陸する許可です。駐機場へ戻る指示ではありません。', negative: `${S}, negative, runway three six, cleared for takeoff.` },
    ], note: 'フラップを上げ、出力を全開にして、もう一度離陸します。', time: 20 };
  const sequences = {
    atis: ['atis'], ground: ['gnd_call', 'gnd_rb'], tower: ['twr_ready', 'twr_luaw'], leave: ['twr_leave'],
    takeoff: ['twr_takeoff'], closed: ['twr_closed'], stopgo: ['twr_stopgo'],
    back: ['twr_back', 'twr_straight'], final: ['twr_final', 'twr_land'], exit: ['twr_exit'], groundIn: ['gnd_in', 'gnd_in_rb'],
  };
  return { exchanges: X, sequences, weather: W, atisText: ATIS, call: CALL, freq: FREQ };
}
