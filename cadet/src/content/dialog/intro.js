// CADET — content/dialog/intro.js : the introductory flight (体験飛行) of the first day, in the air: what 早瀬 教官 says
// over the practice area at 3,000 ft (the take-off and the way there, the way back and the landing are his, behind the
// cards). Six talks, each ending with the hook 'intro' that tells flight/intro-flight.js what comes next:
//  - intro: the attitude on the horizon, the controls handed over (the three calls) — 'level' — or the cadet watches
//    ('watch');
//  - introB: how the 20 seconds went (ctx intro.level), a prediction (what the height does in a bank), the look out to
//    the right before the turn — 'look';
//  - introC: how the turn went (ctx intro.turn), where LAB is (ctx intro.labSide: worked out from the real geometry),
//    the heading mark set on it — 'toward';
//  - introD: the controls handed back (the three calls the other way), how it felt (each answer pointing at tomorrow's
//    class or k1), the logbook — 'back';
//  - introTake: after a takeover (he levels it: I have control), the calls both ways, then the controls again — 'resume';
//  - introEnd: a second takeover: he keeps them; on to introD's question.
// Also the lines he says while the cadet flies (INTRO_AIR, by key: the HUD's subtitle, the flight not paused), the
// task panel's texts, the two cards, the right answers (for the measure and the tests) and a sample context.
// Pure data: no three.js, no DOM.
import { INSTRUCTOR } from './instructor.js';

export const INTRO_HOOKS = ['look', 'nod', 'point', 'intro'];
const SPEAKERS = { instructor: { name_ja: INSTRUCTOR.title_ja, color: '#5cc8ff' }, player: { name_ja: 'あなた', color: '#f2b632' } };
// the context: intro { level: 'good' | 'drift' | 'took' | 'watch', watch, turn: 'good' | 'low' | 'high' | 'nolook' |
// 'none' | 'took' | 'watch', labSide: 'r' | 'rb' | 'f' | 'l' | 'lb', toward: 'good' | 'time' | 'watch' }
export const INTRO_SAMPLE = { intro: { level: 'good', watch: false, turn: 'good', labSide: 'r', toward: 'good' } };
// the choices that are right where a check asks (the measure's cadet, the tests)
export const INTRO_RIGHT = { 'fly:ex:ck': /^I have control$/, 'a:yhc:ask': /^I have control\.$/, 'b:pr': /^少し下がる$/, 'd:ihc:ck': /^You have control\.$/, 'tk:ck': /^You have control\.$/ };

export function introAirDialogs() {
  const say = (text, more = {}) => ({ speaker: 'instructor', text, ...more });
  const go = (arg) => [{ hook: 'intro', arg }];
  // (the hand-back's and the takeover's acknowledgments: the same three choices, the right one first)
  const back = (ok, ng) => [{ text: 'You have control.', next: ok }, { text: 'I have control.', next: ng }, { text: 'はい', next: ng }];
  const A = {
    // (a second career: the attitude in one line)
    as: say('訓練空域、3,000 ft です。機首と地平線の見え方は、いつもと同じです。', { if: { flag: 'prologue_short' }, else: 'a1', hook: { name: 'look', arg: 'player' }, next: 'a:yhc:ask' }),
    a1: say('着きました。ここが訓練空域、高度 3,000 ft です。離陸とここまでの移動は、私が操縦してきました。', { hook: { name: 'look', arg: 'player' }, next: 'a2' }),
    // src: FAA-H-8083-3C Airplane Flying Handbook ch.3 "Integrated Flight Instruction", "Straight-and-Level Flight"
    // (the nose's place on the horizon is the attitude; the instruments confirm it)
    a2: say('前を見てください。機首と地平線の、この見え方が、まっすぐ水平に飛んでいる姿勢です。計器にも、同じものが出ています。', { hook: { name: 'point', arg: 'pfd' }, next: 'a:yhc:ask' }),
    // src: AFH (FAA-H-8083-3C) ch.1 "Positive Exchange of Flight Controls": three steps — "You have the flight
    // controls." / "I have the flight controls." / "You have the flight controls." — and a visual check that the other
    // has let go; FAA-H-8083-9B Aviation Instructor's Handbook says the same. Said short, as day1.js ASSIST_LINES says it.
    'a:yhc:ask': say('では、渡します。You have control.', { choices: [
      { text: 'I have control.', next: 'a:yhc:ok' },
      { text: 'まず、見ているだけにします', next: 'a:w' },
    ] }),
    'a:yhc:ok': say('You have control. ……いま操縦しているのは、あなたです。私の手は、ほら、膝の上。', { hook: { name: 'nod' }, next: 'a4' }),
    // (the rudder is his: the automatic rudder kept on)
    a4: say('まず 20 秒、まっすぐ同じ高さで。機首を地平線のその位置に。操縦輪は指先で軽く。足は私が手伝います。', { effects: go('level'), end: true }),
    'a:w': say('わかりました。最初は私が操縦します。機首と地平線、それから計器を見ていてください。', { effects: go('watch'), end: true }),
  };
  const B = {
    // src: the book's aero.stab key point (「トリムを取れば手を離しても飛ぶ」のは縦の静安定のおかげ)
    b1: say('いいですね。高さがほとんど動いていません。トリムが合っていれば、飛行機はこうして素直に飛びます。', { if: { ctx: 'intro.level', is: 'good' }, else: 'b1:d', next: 'b:pr' }),
    'b1:d': say('高さが少し動きましたね。最初はみんなそうです。小さく、早めに直すのがこつです。', { if: { ctx: 'intro.level', is: 'drift' }, else: 'b1:t', next: 'b:pr' }),
    'b1:t': say('さっきは私が戻しました。大きく動いたら、迷わず渡してくれていいんです。', { if: { ctx: 'intro.level', is: 'took' }, else: 'b1:w', next: 'b:pr' }),
    'b1:w': say('まっすぐ、同じ高さ。私は操縦輪にほとんど触れていません。トリムが合っていれば、飛行機はこうして飛びます。', { next: 'b:pr' }),
    // src: PHAK (FAA-H-8083-25C) ch.5 "Forces in Turns": banked, the lift's horizontal part turns the aircraft and its
    // vertical part is less than the weight, so it sinks unless the angle of attack is raised (back pressure); the
    // book's aero.turn (揚力の一部が横向きに使われるので、高度を保つには揚力を増やす)
    'b:pr': say('次は右へ曲がります。その前に予想を。傾けるだけで何もしないと、高さはどうなると思いますか。', { hook: { name: 'look', arg: 'player' }, choices: [
      { text: '少し下がる', next: 'b:ok' },
      { text: '少し上がる', next: 'b:ng' },
      { text: '変わらない', next: 'b:ng' },
      { text: 'わかりません', next: 'b:dk' },
    ] }),
    'b:ok': say('そうです。傾けると、翼が持ち上げる力の一部が、横へ曲がる力に使われます。だから曲がっている間は、ほんの少し引きます。', { hook: { name: 'nod' }, next: 'b4' }),
    'b:ng': say('実は、少し下がります。傾けると、翼が持ち上げる力の一部が、横へ曲がる力に使われるからです。だから、ほんの少し引きます。', { next: 'b4' }),
    'b:dk': say('わからない、で大丈夫です。答えは、少し下がる。持ち上げる力の一部が横へ使われるので、ほんの少し引いて保ちます。', { next: 'b4' }),
    // src: 14 CFR 91.113(b) (see and avoid); AC 90-48D (pilots' role in collision avoidance); AFH ch.3 "Turns" (clear
    // the area in the direction of the turn before it)
    b4: say('曲がる前に、必ず曲がる側を見ます。私が右を確かめて、右へ 15° ほど傾けます。高度計も見ていてください。', { if: { ctx: 'intro.watch', is: true }, else: 'b4:c', effects: go('look'), end: true }),
    'b4:c': say('曲がる前に、必ず曲がる側を見ます。右の窓の外を見て、ほかの機がいなければ、右へ 15〜20° 傾けて南の 180 へ。PFD の方位の印が目印です。', { hook: { name: 'point', arg: 'pfd' }, effects: go('look'), end: true }),
  };
  const C = {
    c1: say('きれいな旋回でした。傾きも高さも、ほとんど一定です。', { if: { ctx: 'intro.turn', is: 'good' }, else: 'c1:lo', next: 'c2' }),
    'c1:lo': say('旋回で高さが少し下がりましたね。予想のとおりです。引く量は、これから体に入れていきます。', { if: { ctx: 'intro.turn', is: 'low' }, else: 'c1:hi', next: 'c2' }),
    'c1:hi': say('旋回で少し上がりましたね。引く量は、ほんの少しで足ります。', { if: { ctx: 'intro.turn', is: 'high' }, else: 'c1:nl', next: 'c2' }),
    'c1:nl': say('旋回の前は、曲がる側を見る。これだけは毎回、忘れずに。', { if: { ctx: 'intro.turn', is: 'nolook' }, else: 'c1:no', next: 'c2' }),
    'c1:no': say('今日は大きく傾けるところまで、いきませんでしたね。大丈夫、これから何度でも練習します。', { if: { ctx: 'intro.turn', is: 'none' }, else: 'c1:t', next: 'c2' }),
    'c1:t': say('大きく動いたところは、私が戻しました。動かすのは、小さく、ゆっくりで十分です。', { if: { ctx: 'intro.turn', is: 'took' }, else: 'c1:w', next: 'c2' }),
    'c1:w': say('南を向きました。曲がっている間、私はほんの少し引いて、高さを保っていました。', { next: 'c2' }),
    // (where LAB is, as the flight finds it: intro-flight.js relLab)
    c2: say('外を見てください。右の前に見えるのが LAB 飛行場、私たちの訓練所です。機首を LAB に向けましょう。', { if: { ctx: 'intro.labSide', is: 'r' }, else: 'c2:rb', hook: { name: 'look', arg: 'player' }, next: 'c3' }),
    'c2:rb': say('外を見てください。LAB 飛行場は、いま右の後ろのほうです。右へ回って、機首を LAB に向けましょう。', { if: { ctx: 'intro.labSide', is: 'rb' }, else: 'c2:f', next: 'c3' }),
    'c2:f': say('外を見てください。正面に見えるのが LAB 飛行場、私たちの訓練所です。そのまま、機首を LAB に。', { if: { ctx: 'intro.labSide', is: 'f' }, else: 'c2:l', next: 'c3' }),
    'c2:l': say('外を見てください。左の前に見えるのが LAB 飛行場、私たちの訓練所です。機首を LAB に向けましょう。', { if: { ctx: 'intro.labSide', is: 'l' }, else: 'c2:lb', next: 'c3' }),
    'c2:lb': say('外を見てください。LAB 飛行場は、いま左の後ろのほうです。左へ回って、機首を LAB に向けましょう。', { next: 'c3' }),
    c3: say('PFD の方位の印を、LAB の方向に合わせておきました。', { if: { ctx: 'intro.watch', is: false }, else: 'c3:w', hook: { name: 'point', arg: 'pfd' }, effects: go('toward'), end: true }),
    'c3:w': say('PFD の方位の印を、LAB の方向に合わせました。私が機首を向けます。', { hook: { name: 'point', arg: 'pfd' }, effects: go('toward'), end: true }),
  };
  const D = {
    d1: say('LAB が正面に来ました。最初の 1 回は、見ているだけで十分です。', { if: { ctx: 'intro.watch', is: true }, else: 'd1:g', hook: { name: 'look', arg: 'player' }, next: 'd:feel:ask' }),
    'd1:g': say('LAB が正面です。座学と学科試験のあと、初飛行で降りる滑走路です。', { if: { ctx: 'intro.toward', is: 'good' }, else: 'd1:n', hook: { name: 'look', arg: 'player' }, next: 'd:ihc:ck' }),
    'd1:n': say('LAB はあの方向です。座学と学科試験のあと、初飛行で降りる滑走路です。', { hook: { name: 'look', arg: 'player' }, next: 'd:ihc:ck' }),
    // src: AFH ch.1 "Positive Exchange of Flight Controls" (the instructor takes them back the same way: "I have the
    // flight controls." / "You have the flight controls." / "I have the flight controls.")
    'd:ihc:ck': say('時間です。返してもらいます。I have control.', { choices: back('d:ok', 'd:ng') }),
    'd:ng': say('返すときは You have control です。私が持ったことを、あなたが確かめる言葉です。もう一度。', { next: 'd:ihc:ck' }),
    'd:ok': say('I have control. ……ありがとう。ここからは私が飛びます。', { hook: { name: 'nod' }, next: 'd:feel:ask' }),
    // (each answer points at tomorrow: class 0 is the flight's principles — aero.stab, aero.turn — and k1 the PFD;
    // career.js CLASSES, CLASS_FTD: day 2's plan)
    'd:feel:ask': say('どうでしたか、初めての操縦は。', { choices: [
      { text: '手を離しても、まっすぐ飛んでいた', next: 'd:a' },
      { text: '傾けると、高さが下がった', next: 'd:b' },
      { text: '外を見る余裕がなかった', next: 'd:c' },
    ] }),
    // src: the book's aero.stab key point (縦の静安定); PHAK ch.5 "Forces in Turns"; AFH ch.3 "Integrated Flight
    // Instruction" (outside first, the instruments cross-checked)
    'd:a': say('トリムを取った速度で飛び続けるのは、縦の安定のおかげです。明日の授業の「安定性」の節で、その理由を習います。', { next: 'd:end' }),
    'd:b': say('よく気づきましたね。揚力の一部が横向きに使われるからです。明日の授業の「旋回の物理」の節が、その話です。', { hook: { name: 'nod' }, next: 'd:end' }),
    'd:c': say('最初は、みんなそうです。外を見て、ときどき計器。明日の午後の k1 で、その計器の読み方を習います。', { next: 'd:end' }),
    // src: 14 CFR 61.51(b), 61.51(h)(2) (training time logged, endorsed by the instructor): career/logbook.js introEntry
    'd:end': say('航空日誌に、今日の飛行を書いておきます。あなたの日誌の、最初の 1 行です。LAB へ戻ります。着陸も私が。', { effects: go('back'), end: true }),
  };
  // (a takeover: he said I have control and levelled it — X_take, in the air; the cadet's answer, then the controls again)
  const T = {
    tk1: say('水平に戻しました。大きく動いたときは、こうして私が持ちます。', { hook: { name: 'look', arg: 'player' }, next: 'tk:ck' }),
    'tk:ck': say('さっき私は I have control と言いました。あなたが返す言葉は？', { choices: back('tk:ok', 'tk:ng') }),
    'tk:ng': say('返すのは You have control です。私が持ったことを、声で確かめます。', { next: 'tk:ck' }),
    'tk:ok': say('I have control. ……落ち着いたら、もう一度渡します。では、You have control.', { choices: [{ text: 'I have control.', next: 'tk3' }] }),
    tk3: say('You have control. 続きからどうぞ。動かすのは、小さく、ゆっくりで。', { hook: { name: 'nod' }, effects: go('resume'), end: true }),
  };
  // (the second takeover: he keeps the controls; the cadet's answer, then how it felt)
  const E = {
    e1: say('今日は、ここから私が操縦します。大きく動いたときに渡してくれたのは、正しいことです。', { hook: { name: 'look', arg: 'player' }, choices: [{ text: 'You have control.', next: 'e2' }] }),
    e2: say('I have control. ……ありがとう。', { hook: { name: 'nod' }, next: 'introD:d:feel:ask' }),
  };
  return {
    speakers: SPEAKERS, flags: ['prologue_short'], hooks: [...INTRO_HOOKS],
    dialogs: { intro: { start: 'as', nodes: A }, introB: { start: 'b1', nodes: B }, introC: { start: 'c1', nodes: C }, introD: { start: 'd1', nodes: D },
      introTake: { start: 'tk1', nodes: T }, introEnd: { start: 'e1', nodes: E } },
  };
}

// ---- what he says while the cadet flies (fly-mode's say: the HUD's subtitle; not more than one every 4 s)
export const INTRO_AIR = {
  // (the 20 seconds straight and level)
  L_hi: '少し上がっています。機首をほんの少し下げます。',
  L_lo: '少し下がっています。ほんの少し引きます。',
  L_wing: '翼を地平線と平行に。傾いた反対へ、少しだけ。',
  L_hands: '手を離しても、トリムが合っていれば、飛行機はしばらくまっすぐ飛びます。',
  L_good: 'いいですね。そのまま。',
  // (the look out to the right; src: 14 CFR 91.113(b), AC 90-48D, AFH ch.3 "Turns")
  K_how: '右の窓の外を見てください。ほかの機がいないか、確かめます。',
  K_first: '先に右を見ましょう。曲がる側を確かめてから傾けます。',
  K_ok: '右、ほかの機はいませんね。では、ゆっくり右へ。',
  K_time: '右は私も見ました。ほかの機はいません。では、ゆっくり右へ。',
  // (the turn to 180; src: AFH ch.3 "Level Turns" — below about 20° of bank the airplane's lateral stability rolls
  // the wings level unless the bank is held; the roll-out led by about half the bank; FAA-H-8083-15B Instrument Flying
  // Handbook "Turns to Predetermined Headings"; the PFD's roll scale at the top)
  T_how: '操縦輪を右へ少し回して、傾いたら戻します。PFD の上の目盛りで 15〜20° くらい。',
  T_shallow: '傾きが戻ってきました。また少しだけ右へ。',
  T_steep: '傾きすぎです。少し戻して、15〜20° くらいに。',
  T_low: '高さが下がってきました。ほんの少し引きます。',
  T_high: '少し引きすぎです。機首をほんの少し戻します。',
  T_near: '180 が近づいてきました。傾きの半分くらい手前で、翼を水平に戻し始めます。',
  T_roll: 'はい、ここで翼を水平に。',
  T_ok: 'きれいに南を向きました。そのまま、まっすぐ。',
  T_time: 'ここで翼を水平に戻しましょう。旋回の練習は、これから何度でもします。',
  // (toward LAB)
  W_how: 'LAB を機首の正面に。傾けて回し、正面に来る少し手前で戻します。',
  W_ok: '正面に来ました。そのまま、まっすぐ。',
  W_time: 'このくらいで大丈夫です。',
  // (soft limits, not more than one every 8 s; src: PHAK (FAA-H-8083-25C) ch.8 "Airspeed Indicator Markings" — the
  // yellow arc above Vno, for smooth air only)
  G_bank: '傾きが 30° を超えました。少し戻しましょう。',
  G_fast: '速度計が黄色の帯に入りました。機首をほんの少し上げます。',
  G_alt: '高さが 150 ft 以上ずれました。機首で、ゆっくり戻しましょう。',
  // (he takes the controls: the first of the three calls, said at once)
  X_take: 'I have control。少し大きく動いたので、私が水平に戻します。手を離してください。',
  X_crash: '……I have control。今日はここまでにします。',
  // (the cadet watches: he says what he does)
  D_level: '私が操縦しています。機首と地平線の位置は、ほとんど動きません。',
  D_look: '右、ほかの機はいません。右へ 15° 傾けます。高度計も見ていてください。',
  D_roll: '180 の手前、傾きの半分くらいで、翼を水平に戻します。',
  D_toward: 'LAB へ向けます。正面に来る少し手前で、翼を戻します。',
  // (a key that is his today: the throttle, the flaps, the trim, the rudder)
  R_keys: 'スロットルとフラップは、今日は私が。操縦輪だけで大丈夫です。',
};
// …and in English (the crew's English mode: content/dialog/en.js airEnglish)
export const INTRO_AIR_EN = {
  L_hi: 'It\'s climbing a little. Lower the nose just a touch.',
  L_lo: 'It\'s sinking a little. Pull back just a touch.',
  L_wing: 'Wings parallel to the horizon. A little, against the way it leans.',
  L_hands: 'Even with your hands off, with the trim right, the aeroplane flies straight for a while.',
  L_good: 'Nice. Hold it there.',
  K_how: 'Look out of the right window. We check there\'s no other aircraft.',
  K_first: 'Look right first. Check the side you turn to, then bank.',
  K_ok: 'No other aircraft on the right. Now, gently, to the right.',
  K_time: 'I\'ve checked right too. No other aircraft. Now, gently, to the right.',
  T_how: 'Turn the yoke a little to the right, and centre it once you\'re banked. About 15 to 20° on the scale at the top of the PFD.',
  T_shallow: 'The bank is coming off. A little more to the right again.',
  T_steep: 'Too much bank. Ease it back to about 15 to 20°.',
  T_low: 'The height is dropping. Pull back just a touch.',
  T_high: 'Pulling a bit too much. Ease the nose back just a touch.',
  T_near: '180 is coming up. Start levelling the wings about half the bank before it.',
  T_roll: 'Now, wings level here.',
  T_ok: 'Nicely onto south. Hold it straight.',
  T_time: 'Let\'s level the wings here. We\'ll practise turns many more times.',
  W_how: 'Put LAB right in front of the nose. Bank to come round, and level out a little before it\'s ahead.',
  W_ok: 'It\'s straight ahead. Hold it straight.',
  W_time: 'That\'s about right.',
  G_bank: 'The bank is past 30°. Let\'s ease it back a little.',
  G_fast: 'The airspeed is into the yellow arc. Raise the nose just a touch.',
  G_alt: 'The height is off by 150 ft or more. Bring it back slowly with the nose.',
  X_take: 'I have control. It moved a bit much, so I\'ll level it. Take your hands off.',
  X_crash: '...I have control. That\'s all for today.',
  D_level: 'I\'m flying. The nose barely moves against the horizon.',
  D_look: 'Right side: no other aircraft. Banking 15° right. Watch the altimeter too.',
  D_roll: 'Short of 180, about half the bank early, I level the wings.',
  D_toward: 'Turning toward LAB. I level the wings a little before it\'s ahead.',
  R_keys: 'Today I\'ll handle the throttle and the flaps. The yoke alone is fine.',
};

// ---- the task panel (ui/day-hud.js setTask: shown only while a task goes on) and the cards
const hdg3 = (h) => String(Math.round(h) % 360 || 360).padStart(3, '0');
export const INTRO_HUD = {
  level: { title: 'まっすぐ・同じ高さ（20 秒）', text: '高度 3,000 ft ±100　翼は水平' },
  look: { title: '右を見る', text: '曲がる側に、ほかの機がいないか' },
  turn: { title: '右へ旋回、針路 180 で水平に', text: '傾き 15〜20°　高度 3,000 ft ±150　180 の手前で戻す' },
  toward: { title: 'LAB を機首の正面に', text: '針路 約 LAB の方向（方位の印）' },
  watch: { title: '早瀬 教官が操縦中', text: '外と計器を見ていてください' },
};
export const INTRO_KEYS_HUD = [['W / S', '機首を下げる / 上げる'], ['A / D', '傾ける'], ['マウス', '見回す']];
// the panel for a task (or the instructor flying: 'watch'), the heading mark's bearing in toward's
export function introPanel(id, { brg = null } = {}) {
  const h = INTRO_HUD[id]; if (!h) return null;
  const text = id === 'toward' && brg != null ? `針路 約 ${hdg3(brg)}（方位の印）` : h.text;
  return { kicker: '体験飛行', title: h.title, text, keys: id === 'watch' ? [['マウス', '見回す']] : INTRO_KEYS_HUD };
}
export const INTRO_CARDS = {
  start: { kicker: '午後', title: '体験飛行', sub: '訓練空域の上空 3,000 ft　離陸と移動は早瀬 教官' },
  end: { kicker: '体験飛行', title: 'LAB に着陸', sub: '着陸と駐機は早瀬 教官' },
};
