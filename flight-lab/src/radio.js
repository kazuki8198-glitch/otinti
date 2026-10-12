// FLIGHT LAB — radio.js : English radio practice (the page 英語交信).
// A whole flight's radio calls in order (ATIS → ground → tower → departure → approach → tower → ground) with the
// meaning and the reason for each; read-back and response scenes by phase of flight; drills for the phonetic alphabet
// and for saying numbers (altitudes, headings, speeds, frequencies, altimeter settings, codes, runways, wind, time);
// a listening drill (speech synthesis); a glossary of the standard words.
// Rules for saying numbers: FAA AIM 4-2-7 … 4-2-12 (checked against the AIM text: 500 "five hundred", 4,500 "four
// thousand five hundred", 10,000 "one zero thousand", 13,500 "one three thousand five hundred", FL190 "flight level
// one niner zero", 122.1 "one two two point one", headings in three digits, speeds digit by digit plus "knots", UTC);
// controller phraseology: FAA Order JO 7110.65 ("wind (direction) at (velocity)", "calm" below 3 kt, "altimeter
// (setting)", line up and wait, cleared for takeoff, extend downwind, radar service terminated / squawk VFR /
// frequency change approved); word meanings: the Pilot/Controller Glossary.
// The airport LAB, its frequencies and the call sign "Archer Seven Lima Alpha" are FICTIONAL training material.
(function (FL) {
  'use strict';
  const CS = 'Archer Seven Lima Alpha', CSS = 'Archer 7LA';
  const WHO = { ATIS: 'ATIS', P: 'あなた', GND: 'Ground', TWR: 'Tower', DEP: 'Departure', APP: 'Approach', CTAF: '他機', ACT: '操作' };

  // ---------------------------------------------------------------- saying numbers (AIM 4-2-8 … 4-2-12)
  const DIGW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'niner'];
  const ALPHA = [['A', 'Alfa', 'AL-FAH'], ['B', 'Bravo', 'BRAH-VOH'], ['C', 'Charlie', 'CHAR-LEE'], ['D', 'Delta', 'DELL-TAH'], ['E', 'Echo', 'ECK-OH'],
    ['F', 'Foxtrot', 'FOKS-TROT'], ['G', 'Golf', 'GOLF'], ['H', 'Hotel', 'HOH-TEL'], ['I', 'India', 'IN-DEE-AH'], ['J', 'Juliett', 'JEW-LEE-ETT'],
    ['K', 'Kilo', 'KEY-LOH'], ['L', 'Lima', 'LEE-MAH'], ['M', 'Mike', 'MIKE'], ['N', 'November', 'NO-VEM-BER'], ['O', 'Oscar', 'OSS-CAH'],
    ['P', 'Papa', 'PAH-PAH'], ['Q', 'Quebec', 'KEH-BECK'], ['R', 'Romeo', 'ROW-ME-OH'], ['S', 'Sierra', 'SEE-AIR-RAH'], ['T', 'Tango', 'TANG-GO'],
    ['U', 'Uniform', 'YOU-NEE-FORM'], ['V', 'Victor', 'VIK-TAH'], ['W', 'Whiskey', 'WISS-KEY'], ['X', 'Xray', 'ECKS-RAY'], ['Y', 'Yankee', 'YANG-KEY'], ['Z', 'Zulu', 'ZOO-LOO']];
  const DIGP = ['ZEE-RO', 'WUN', 'TOO', 'TREE', 'FOW-ER', 'FIFE', 'SIX', 'SEV-EN', 'AIT', 'NIN-ER'];
  const pad = (n, k) => String(Math.round(n)).padStart(k, '0');
  // each digit on its own; "." is "point" (AIM 4-2-8; ICAO says "decimal")
  const digits = (s) => String(s).split('').filter(c => /[0-9.]/.test(c)).map(c => (c === '.' ? 'point' : DIGW[+c])).join(' ');
  // altitudes below 18,000 ft: the digits of the thousands, "thousand", then the hundreds; FL at and above 18,000 (AIM 4-2-9)
  function altitude(ft) {
    ft = Math.round(ft / 100) * 100;
    if (ft >= 18000) return 'flight level ' + digits(pad(ft / 100, 3));
    const th = Math.floor(ft / 1000), hu = Math.round((ft % 1000) / 100), out = [];
    if (th) out.push(digits(th) + ' thousand');
    if (hu) out.push(DIGW[hu] + ' hundred');
    return out.join(' ') || 'zero';
  }
  const heading = (d) => 'heading ' + digits(pad(((Math.round(d) % 360) + 360) % 360 || 360, 3));   // three digits, 360 not 000 (AIM 4-2-10)
  const speed = (kt) => digits(Math.round(kt)) + ' knots';                                             // AIM 4-2-11
  const freq = (f) => digits(String(f));                                                              // '119.75' → one one niner point seven five
  const altimeter = (s) => 'altimeter ' + digits(String(s).replace('.', ''));                         // JO 7110.65 "ALTIMETER (setting)"
  const squawk = (c) => 'squawk ' + digits(pad(c, 4));
  function runway(r) {
    const m = /^0?(\d{1,2})([LRC]?)$/.exec(String(r).toUpperCase()); if (!m) return 'runway ' + r;
    return 'runway ' + digits(m[1]) + (m[2] ? ' ' + { L: 'left', R: 'right', C: 'center' }[m[2]] : '');
  }
  // JO 7110.65: "wind (direction) at (velocity)"; "calm" when the wind is less than three knots
  const wind = (dir, kt) => (kt < 3 ? 'wind calm' : `wind ${digits(pad(dir, 3))} at ${digits(Math.round(kt))}`);
  const time = (hhmm) => digits(pad(hhmm, 4)) + ' Zulu';                                                // AIM 4-2-12: UTC, "Zulu" may be used
  const spell = (s) => String(s).toUpperCase().split('').map(c => (/[0-9]/.test(c) ? DIGW[+c] : (ALPHA.find(a => a[0] === c) || [0, c])[1])).join(' ');
  const cap = (s) => s.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  // English number words, only for the wrong choices ("forty-five hundred", "ninety")
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function words(n) {
    n = Math.round(n); if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
    if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + words(n % 100) : '');
    return words(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + words(n % 1000) : '');
  }
  const SAY = { digits, altitude, heading, speed, freq, altimeter, squawk, runway, wind, time, spell, words };

  // ---------------------------------------------------------------- a whole flight on the radio (the textbook's chapter, played line by line)
  // [who, English, meaning, note]; who 'ACT' is something you do (not said)
  const FLIGHT = [
    { id: 'atis', t: '① 出発前：ATIS を聞いて書き取る', freq: 'LAB ATIS', sec: 'comm.atis', lines: [
      ['ACT', '', 'ATIS の周波数に合わせ、ひざ板（メモ）を用意して聞く。1 回で書けなければもう一周聞く（繰り返し流れている）。', ''],
      ['ATIS', 'LAB information Bravo. One four five three Zulu. Wind three four zero at eight. Visibility one zero. Few clouds at three thousand five hundred. Temperature three one, dew point two two. Altimeter three zero zero one. Landing and departing runway three six. Advise on initial contact you have information Bravo.',
        'LAB の情報 B。14:53 UTC。風 340° 8 kt。視程 10 SM。3,500 ft に少しの雲。気温 31℃・露点 22℃。高度計 30.01。離着陸の滑走路 36。最初の交信で B を聞いたと伝えよ。', '書き取り：B ／ 340/08 ／ 10 ／ FEW035 ／ 31/22 ／ 30.01 ／ RWY 36（AIM 4-1-13）'],
      ['ACT', '', '高度計を 30.01 に合わせ、表示が空港の標高に近いことを確かめる。地上管制の周波数を COM に入れる。', ''],
    ] },
    { id: 'gnd1', t: '② 地上管制：タキシーの許可', freq: 'LAB Ground 121.7', sec: 'comm.dep', lines: [
      ['P', `LAB Ground, ${CS}, student pilot, at the west ramp with information Bravo, VFR to the northeast practice area at three thousand five hundred, request taxi.`,
        'LAB 地上管制へ。こちら Archer Seven Lima Alpha、学生操縦士。西のエプロンにいて ATIS B を聞いた。北東の訓練空域へ 3,500 ft で VFR。地上走行を要求。', '型：相手 → 自分（最初は省略しない）→ 位置 → ATIS → 行き先 → 要求（AIM 4-2-3・4-2-4）'],
      ['GND', `${CS}, LAB Ground, runway three six, taxi via Alpha, hold short of taxiway Charlie. Departure frequency one one niner point seven five, squawk four two seven one.`,
        '滑走路 36 へ。誘導路 A 経由、誘導路 C の手前で止まれ。出発管制 119.75、コード 4271。', '「滑走路 36 へ」は、滑走路に入る・横切る許可ではない（AIM 4-3-18）'],
      ['P', `Runway three six, taxi via Alpha, hold short of Charlie, departure one one niner point seven five, squawk four two seven one, ${CSS}.`,
        '滑走路 36・A 経由・C の手前で停止・出発 119.75・コード 4271、Archer 7LA。', '言われた順に、コールサインを付けて復唱する（AIM 4-4-7）'],
      ['ACT', '', 'トランスポンダーに 4271、COM の予備に 119.75 を入れておく。誘導路 A を走り、誘導路 C の手前で止まる。', ''],
      ['GND', `${CSS}, continue via Alpha to runway three six.`, '誘導路 A をそのまま滑走路 36 へ。', ''],
      ['P', `Continue via Alpha to runway three six, ${CSS}.`, '誘導路 A で滑走路 36 へ、Archer 7LA。', ''],
      ['ACT', '', 'ランナップ（エンジンの点検）をする。終わったら滑走路 36 の手前の停止線で止まり、管制塔 118.3 に変える（AIM 4-3-14）。', ''],
    ] },
    { id: 'twr1', t: '③ 管制塔：離陸', freq: 'LAB Tower 118.3', sec: 'comm.tower', lines: [
      ['ACT', '', '周波数を変えたら、まず数秒聞く。誰も話していないのを確かめてから呼ぶ（AIM 4-2-2）。', ''],
      ['P', `LAB Tower, ${CS}, holding short runway three six, ready for departure, VFR northeast.`, 'LAB 管制塔へ。滑走路 36 の手前で待機、出発準備よし。北東へ VFR。', ''],
      ['TWR', `${CS}, LAB Tower, runway three six, line up and wait. Traffic, a Cessna on five mile final.`, '滑走路 36 に入って待て。5 マイルの最終進入に Cessna。', 'LUAW は離陸許可ではない（AIM 5-2-5）。最終進入 6 マイル以内の一番近い機が伝えられる（JO 7110.65 3-9-4）'],
      ['P', `Runway three six, line up and wait, ${CSS}.`, '滑走路 36、入って待つ、Archer 7LA。', ''],
      ['ACT', '', '滑走路に入り、センターラインに合わせて止まる。最終進入の Cessna を目で確かめる。', ''],
      ['TWR', `${CS}, runway three six, wind three four zero at eight, cleared for takeoff. Fly runway heading. Traffic, a Cessna on four mile final.`,
        '滑走路 36、風 340° 8 kt、離陸を許可。滑走路の方位を保って上昇せよ。4 マイルの最終進入に Cessna。', '離陸許可の復唱には必ず滑走路番号（AIM 4-4-7）'],
      ['P', `Runway three six, cleared for takeoff, fly runway heading, ${CSS}.`, '滑走路 36、離陸許可、滑走路の方位、Archer 7LA。', ''],
      ['ACT', '', '離陸して上昇。高度・速度・方位を先に。無線は操縦のあと（Aviate → Navigate → Communicate）。', ''],
      ['TWR', `${CS}, contact departure.`, '出発管制と交信せよ（周波数はタキシーの前にもらった 119.75）。', '管制官は、パイロットが知っている周波数を省くことがある（AIM 4-3-14）'],
      ['P', `Contact departure, ${CSS}.`, '出発管制へ、Archer 7LA。', '応答してから、できるだけ早く変える（AIM 4-2-3）'],
    ] },
    { id: 'dep', t: '④ 出発管制：レーダー・交通情報・別れ方', freq: 'LAB Departure 119.75', sec: 'comm.radar', lines: [
      ['P', `LAB Departure, ${CS}, one thousand two hundred, climbing to three thousand five hundred.`, 'LAB 出発管制へ。いま 1,200 ft、3,500 ft へ上昇中。', '高度は thousand・hundred で（AIM 4-2-9）'],
      ['DEP', `${CS}, LAB Departure, radar contact two miles north of LAB. Resume own navigation.`, 'レーダーで確認（LAB の北 2 マイル）。自分で航法を続けよ。', 'Radar contact：レーダーで識別し、業務の終了まで情報をもらえる（PCG）'],
      ['P', `Resume own navigation, ${CSS}.`, '自分で航法、Archer 7LA。', ''],
      ['DEP', `${CSS}, traffic, one o'clock, four miles, westbound, a Cessna, two thousand five hundred.`, '1 時の方向・4 マイル・西向き・Cessna・2,500 ft。', '時計の方位は機首が 12 時（AIM 4-1-15）'],
      ['P', `Looking, ${CSS}.`, '探している、Archer 7LA。', '見えなければ、あとで “negative contact” と伝えてよい（PCG）'],
      ['P', `Traffic in sight, ${CSS}.`, '見えた、Archer 7LA。', 'Traffic in sight：伝えられた交通が見えた（PCG）'],
      ['P', `LAB Departure, ${CSS}, entering the northeast practice area, request frequency change.`, '北東の訓練空域に入る。周波数の変更を要求。', 'レーダー業務をやめるときは、先に管制官に伝える（AIM 4-1-15）'],
      ['DEP', `${CSS}, radar service terminated, squawk VFR, frequency change approved.`, 'レーダー業務を終了。VFR コード（1200）に。周波数の変更を承認。', 'JO 7110.65 7-6 の言い方'],
      ['P', `Squawk VFR, frequency change approved, ${CSS}.`, 'VFR コード、周波数変更了解、Archer 7LA。', ''],
      ['ACT', '', 'トランスポンダーを 1200 に。訓練空域で練習する。帰る前に LAB の ATIS を聞き直す。', ''],
    ] },
    { id: 'app', t: '⑤ 帰り：ATIS と進入管制', freq: 'LAB ATIS → LAB Approach', sec: 'comm.arrive', lines: [
      ['ATIS', 'LAB information Charlie. One six five three Zulu. Wind three six zero at one zero. Visibility one zero. Scattered clouds at four thousand. Temperature three two, dew point two two. Altimeter three zero zero zero. Landing and departing runway three six. Advise on initial contact you have information Charlie.',
        'LAB の情報 C。16:53 UTC。風 360° 10 kt。視程 10 SM。4,000 ft に散在する雲。気温 32℃・露点 22℃。高度計 30.00。滑走路 36。最初の交信で C を聞いたと伝えよ。', '記号が B → C に変わった。新しい高度計 30.00 に合わせる'],
      ['P', `LAB Approach, ${CS}, one five miles northeast, three thousand five hundred, with information Charlie, landing LAB.`, 'LAB 進入管制へ。北東 15 マイル、3,500 ft、ATIS C を聞いた、LAB に着陸したい。', '到着の最初の呼び出しは 15 マイルほど手前で（AIM 4-3-2）。Class C なら入る前に（AIM 3-2-4）'],
      ['APP', `${CS}, LAB Approach, squawk zero four two five and ident.`, 'コード 0425 にして IDENT ボタンを押せ。', 'Ident：トランスポンダーの識別機能を働かせる（PCG）'],
      ['P', `Squawk zero four two five, ${CSS}.`, 'コード 0425、Archer 7LA。', '（コードを入れて IDENT を押す）'],
      ['APP', `${CSS}, radar contact one four miles northeast of LAB. Enter left downwind runway three six. Contact LAB Tower one one eight point three.`,
        'レーダーで確認（LAB の北東 14 マイル）。滑走路 36 の左ダウンウインドに入れ。LAB 管制塔 118.3 と交信せよ。', ''],
      ['P', `Left downwind runway three six, Tower one one eight point three, ${CSS}.`, '滑走路 36 の左ダウンウインド、管制塔 118.3、Archer 7LA。', '左右と滑走路番号を必ず'],
    ] },
    { id: 'twr2', t: '⑥ 管制塔：場周経路と着陸', freq: 'LAB Tower 118.3', sec: 'comm.arrive', lines: [
      ['P', `LAB Tower, ${CS}, one zero miles northeast, two thousand, with Charlie, for left downwind runway three six.`, 'LAB 管制塔へ。北東 10 マイル・2,000 ft・ATIS C。滑走路 36 の左ダウンウインドへ向かう。', ''],
      ['TWR', `${CSS}, LAB Tower, report midfield left downwind runway three six.`, '滑走路 36 の左ダウンウインドの中央で報告せよ。', ''],
      ['P', `Report midfield left downwind runway three six, ${CSS}.`, '左ダウンウインドの中央で報告する、Archer 7LA。', ''],
      ['P', `LAB Tower, ${CSS}, midfield left downwind.`, '（報告）左ダウンウインドの中央。', ''],
      ['TWR', `${CSS}, number two, follow the Cessna on left base. Runway three six, cleared to land.`, '着陸順 2 番。左ベースの Cessna に続け。滑走路 36、着陸を許可。', '“Number (n), follow (traffic)” は JO 7110.65 の言い方'],
      ['P', `Number two, traffic in sight, runway three six, cleared to land, ${CSS}.`, '2 番、前の機が見えた、滑走路 36 着陸許可、Archer 7LA。', '見えなければ “negative contact” と言い、探す'],
      ['ACT', '', '前の Cessna の後ろに付いてベースへ。着陸したら最初の使える誘導路へ。停止線を越えたら止まる（AIM 4-3-21）。', ''],
      ['TWR', `${CSS}, turn right at Charlie, contact Ground point seven.`, '誘導路 C で右に出よ。地上管制 121.7 と交信せよ。', '“Ground point seven” は 121.7（AIM 4-3-14）'],
      ['P', `Right at Charlie, Ground point seven, ${CSS}.`, '右に C、地上管制 121.7、Archer 7LA。', '着陸した機は、言われるまで管制塔の周波数にいる'],
    ] },
    { id: 'gnd2', t: '⑦ 地上管制：駐機場へ', freq: 'LAB Ground 121.7', sec: 'comm.arrive', lines: [
      ['P', `LAB Ground, ${CS}, clear of runway three six at Charlie, taxi to the west ramp.`, 'LAB 地上管制へ。滑走路 36 を誘導路 C で出た。西のエプロンへ行きたい。', ''],
      ['GND', `${CSS}, taxi to the west ramp via Charlie, Alpha.`, '誘導路 C・A 経由で西のエプロンへ。', ''],
      ['P', `Taxi to the west ramp via Charlie, Alpha, ${CSS}.`, 'C・A 経由で西のエプロンへ、Archer 7LA。', ''],
      ['ACT', '', '駐機場で止まり、チェックリストでエンジンを止める。交信はここまで。', ''],
    ] },
  ];

  // ---------------------------------------------------------------- read-back and response scenes
  // { id, g (group), title, situation, atc (what you hear; '' if you speak first), q (the question), options, answer, why, clarify, refs }
  const GROUPS = [['first', '最初の呼び出し・ATIS'], ['gnd', '地上'], ['twr', '管制塔（離陸）'], ['radar', 'レーダー・交通情報'], ['land', '場周・着陸'], ['clarify', '確認・聞き直し・訂正'], ['ctaf', '管制塔のない空港'], ['emg', '緊急・無線の故障'], ['sfb', 'Sanford の場面']];
  const RB = '正しい復唱（readback）は？', SAYQ = 'あなたが言うことは？';
  const SCENES = [
    { id: 'r_first', g: 'first', title: '地上管制への最初の呼び出し', situation: 'ATIS の B を聞き、西のエプロンでエンジンを始動した。北東の訓練空域へ 3,500 ft で行く。', atc: '', q: SAYQ,
      options: [`LAB Ground, ${CS}, student pilot, at the west ramp with information Bravo, VFR northeast at three thousand five hundred, request taxi.`, `LAB Ground, ${CSS}, request taxi.`, `${CS}, LAB Ground, taxi.`, 'Ground, this is Archer, ready to go, over.'],
      answer: 0, why: '型は「相手 → 自分 → 位置 → ATIS → 要求」（AIM 4-2-3）。最初の交信ではコールサインを省略しない（省略は管制官が先にしてから：AIM 4-2-4）。学生操縦士は最初の呼び出しで名乗るとよい（AIM 4-2-4）。',
      clarify: '長い内容は先にメモしてから押す（AIM 4-2-2：think before keying）。', refs: ['aim42', 'aim41'] },
    { id: 'r_altim', g: 'first', title: 'ATIS の高度計を書き取る', situation: 'ATIS を聞いている。', atc: 'Altimeter three zero zero one.', q: '高度計に入れる値は？',
      options: ['30.01 inHg', '30.10 inHg', '1001 hPa', '29.92 inHg'], answer: 0,
      why: '高度計規正値は 1 桁ずつ読まれる（JO 7110.65：“altimeter (setting)”）。米国は inHg の 4 桁で、小数点は言わない。3-0-0-1 → 30.01。英国など ICAO の多くの国は hPa の QNH（例：QNH one zero one three）。',
      clarify: '聞き逃したら ATIS をもう一周聞く。管制官に「Say altimeter」と聞いてもよい。', refs: ['jo71', 'aim42'] },
    { id: 'r_info', g: 'first', title: 'ATIS の記号が変わった', situation: '到着前、ATIS は Charlie だった。進入管制を呼ぶとき、ATIS について言うことは？', atc: '', q: SAYQ,
      options: ['“…with information Charlie…” を入れる', '何も言わない（管制官は知っている）', '“…have numbers…” と言う', 'ATIS の内容を全部読み上げる'], answer: 0,
      why: '最初の交信で受け取った ATIS の記号を言うと、管制官は内容を繰り返さなくてよい（AIM 4-1-13）。“have numbers” は風・滑走路・高度計だけを聞いた意味で、ATIS を受け取った意味にはならない。',
      clarify: 'ATIS を聞けなかったときは正直に言い、管制官から情報をもらう。', refs: ['aim41'] },
    { id: 'r_taxi', g: 'gnd', title: 'タキシーの許可（出発周波数とコード付き）', situation: '地上管制にタキシーを要求した。', atc: `${CS}, runway three six, taxi via Alpha, hold short of taxiway Charlie. Departure frequency one one niner point seven five, squawk four two seven one.`, q: RB,
      options: [`Runway three six, taxi via Alpha, hold short of Charlie, departure one one niner point seven five, squawk four two seven one, ${CSS}.`, `Taxi via Alpha, ${CSS}.`, `Cleared to runway three six via Alpha, ${CSS}.`, `Roger, ${CSS}.`], answer: 0,
      why: '滑走路の指定・hold short は必ず復唱する（AIM 4-3-18）。周波数とコードも書き取って復唱すると間違いに気づける。地上走行に “cleared” は使わない（AIM 4-3-18）。',
      clarify: '経路が分からなければ「Request progressive taxi」。', refs: ['aim43', 'aim42'] },
    { id: 'r_rwyentry', g: 'gnd', title: '滑走路の手前で：入ってよい？', situation: '「Runway three six, taxi via Alpha」と言われ、滑走路 36 の手前の停止線に着いた。管制塔からまだ何も言われていない。', atc: '', q: 'どうする？',
      options: ['停止線の手前で止まり、管制塔に呼ぶ', 'そのまま滑走路に入って待つ', '滑走路を横切って向こう側で待つ', '離陸する'], answer: 0,
      why: 'タキシーの指示で滑走路が指定されても、その滑走路に入る・横切る・離陸する許可ではない（AIM 4-3-18）。入るには line up and wait か cleared for takeoff が要る。',
      clarify: '迷ったら止まって確かめる。止まっていることは安全。', refs: ['aim43'] },
    { id: 'r_cross', g: 'gnd', title: '滑走路の横断', situation: '練習用の空港で、滑走路 27 の手前で止まっている。', atc: `${CSS}, cross runway two seven at Bravo.`, q: RB,
      options: [`Cross runway two seven at Bravo, ${CSS}.`, `Crossing, ${CSS}.`, `Roger, ${CSS}.`, `Cross the runway, ${CSS}.`], answer: 0,
      why: '滑走路を横切るには明確な指示が要り、その指示は滑走路番号を付けて復唱する（AIM 4-3-18・4-4-7）。“Crossing” “Roger” だけでは、どの滑走路の指示を受けたか確かめられない。',
      clarify: '横切る前に左右（最終進入と滑走路の上）を目で確かめる。', refs: ['aim43', 'jo71'] },
    { id: 'r_holdpos', g: 'gnd', title: 'その場で止まれ', situation: '誘導路を走っている。', atc: `${CSS}, hold position.`, q: SAYQ,
      options: [`Holding position, ${CSS}.`, `Hold short, ${CSS}.`, '（応答せず走り続ける）', `Roger, continuing, ${CSS}.`], answer: 0,
      why: 'Hold position は「いる場所で止まれ」（JO 7110.65 の言い方）。Hold short（手前で止まれ）とは違う。止まってから、止まったことを伝える。',
      clarify: '止まる理由が分からなくても、まず止まる。理由はあとで聞ける。', refs: ['jo71', 'aim43'] },
    { id: 'r_prog', g: 'gnd', title: '道が分からない', situation: '初めての空港で、誘導路の並びが分からなくなった。', atc: '', q: SAYQ,
      options: [`LAB Ground, ${CSS}, unfamiliar with the airport, request progressive taxi.`, '（推測でそれらしい誘導路へ進む）', `LAB Ground, ${CSS}, lost.`, '（ほかの機に付いていく）'], answer: 0,
      why: '空港に不慣れ・経路に迷いがあるときは progressive taxi（1 区間ずつの道案内）を頼める（AIM 4-3-18）。推測で進むと滑走路誤進入につながる。',
      clarify: '止まってから頼む。動きながら地図を探さない。', refs: ['aim43'] },
    { id: 'r_ready', g: 'twr', title: '離陸の準備ができた', situation: 'ランナップを終え、滑走路 36 の手前の停止線で止まった。周波数を管制塔に変え、数秒聞いて誰も話していない。', atc: '', q: SAYQ,
      options: [`LAB Tower, ${CS}, holding short runway three six, ready for departure, VFR northeast.`, `Tower, ${CSS}, ready.`, `LAB Tower, ${CS}, taking off runway three six.`, '（呼ばずに滑走路に入る）'], answer: 0,
      why: '相手・自分・位置（どの滑走路の手前か）・意図。管制塔のある空港で自分から「離陸する」と宣言するのは誤り（許可を待つ）。',
      clarify: '長く待たされたら、短く呼び直してよい。', refs: ['aim42', 'aim43'] },
    { id: 'r_takeoff', g: 'twr', title: '離陸許可', situation: '滑走路 36 で LUAW（入って待て）中。', atc: `${CS}, runway three six, wind three four zero at eight, cleared for takeoff.`, q: RB,
      options: [`Runway three six, cleared for takeoff, ${CSS}.`, `Cleared for takeoff, ${CSS}.`, `Wind three four zero at eight, ${CSS}.`, `Rolling, ${CSS}.`], answer: 0,
      why: '離陸許可の復唱には滑走路番号を入れる（AIM 4-4-7：最初の復唱に滑走路を、平行滑走路なら L/R/C まで）。風は復唱しなくてよい。',
      clarify: '自分宛てか確信がないときは離陸しない。「Verify cleared for takeoff runway three six, Archer 7LA」と確かめる。', refs: ['aim42', 'jo71'] },
    { id: 'r_luawlong', g: 'twr', title: 'LUAW のまま長く待っている', situation: '「line up and wait」で滑走路に入った。そのまま長い時間、何も言われない。', atc: '', q: 'どうする？',
      options: ['管制塔を呼んで確かめる', '許可が出たものとして離陸する', '黙って滑走路から出る', 'いつまでも待つ'], answer: 0,
      why: 'LUAW のあと、妥当な時間内に離陸許可がなければ管制に連絡する（AIM 5-2-5）。管制方式でも LUAW のまま 90 秒を超えて待たせないことになっている（JO 7110.65）。',
      clarify: '例：「LAB Tower, Archer 7LA, on runway three six, line up and wait.」（教材の例）', refs: ['aim52', 'jo71'] },
    { id: 'r_contact', g: 'twr', title: '周波数の変更', situation: '離陸して上昇中。', atc: `${CS}, contact departure.`, q: SAYQ,
      options: [`Contact departure, ${CSS}.`, '（応答せずに周波数を変える）', '（変えずに管制塔で待つ）', `Departure, ${CSS}, cleared for takeoff.`], answer: 0,
      why: '周波数の変更は応答してから、できるだけ早く変える（AIM 4-2-3）。黙って変えると、管制官は無線の故障と区別できない。',
      clarify: '周波数が分からなければ「Say frequency」。', refs: ['aim42', 'aim43'] },
    { id: 'r_traffic', g: 'radar', title: '交通情報：見えない', situation: 'レーダー業務を受けている。言われた方を探したが、見えない。', atc: `${CSS}, traffic, two o'clock, three miles, eastbound, a Cherokee, three thousand.`, q: '探しても見えなかった。何と言う？',
      options: [`Negative contact, ${CSS}.`, `Traffic in sight, ${CSS}.`, `Negative, ${CSS}.`, `Unable, ${CSS}.`], answer: 0,
      why: 'Negative contact は「伝えられた交通が見えない」（PCG）。見えていないのに traffic in sight と言うのは危険。Negative だけでは何が「いいえ」か分からない。',
      clarify: 'よけるのを手伝ってほしいときは、negative contact のあとに頼んでよい（PCG）。', refs: ['pcg', 'aim41'] },
    { id: 'r_clock', g: 'radar', title: '時計の方位で探す', situation: '交通情報を聞いた。', atc: `${CSS}, traffic, ten o'clock, five miles, southbound, a Cessna, two thousand five hundred.`, q: 'どこを探す？',
      options: ['機首から左に約 60°、やや下（自分が 3,500 ft なら）', '機首から右に約 60°', '真後ろ', '機首の真正面'], answer: 0,
      why: '時計の方位は機首が 12 時（AIM 4-1-15）。10 時は左 60°。高度 2,500 ft の機は、3,500 ft の自分から見て下。',
      clarify: '風で機首と進む方向がずれているときは、そのぶん探す方向もずれる。', refs: ['aim41'] },
    { id: 'r_squawk', g: 'radar', title: 'コードと IDENT', situation: '進入管制に最初の呼び出しをした。', atc: `${CS}, squawk zero four two five and ident.`, q: RB,
      options: [`Squawk zero four two five, ${CSS}.`, `Ident, ${CSS}.`, `Squawk four two five, ${CSS}.`, `Squawking seven seven zero zero, ${CSS}.`], answer: 0,
      why: 'コードは 4 桁を 1 桁ずつ。復唱したら、コードを入れて IDENT ボタンを押す（PCG：Ident）。0 を落とすと別のコードになる。',
      clarify: 'コードを入れる途中で 7500・7600・7700 を通らないように気をつける。', refs: ['pcg', 'aim41'] },
    { id: 'r_standby', g: 'radar', title: 'Class C の前で “stand by”（コールサインあり）', situation: 'Class C 空域の外から進入管制を呼んだ。', atc: `${CS}, stand by.`, q: 'Class C に入ってよい？',
      options: ['入ってよい（交信は確立した）。ただし管制官の指示には従う', '入ってはいけない（stand by だから）', '7600 にして入る', '高度を下げれば入ってよい'], answer: 0,
      why: 'AIM 3-2-4：管制官があなたのコールサインを言って応答すれば、双方向の交信が確立し、Class C に入る条件を満たす。ただし「remain outside Charlie airspace」と言われたら入らない。',
      clarify: 'Stand by は許可でも拒否でもない（PCG）。長く待たされたら呼び直す。', refs: ['aim41', 'pcg'] },
    { id: 'r_standby2', g: 'radar', title: 'Class C の前で “stand by”（コールサインなし）', situation: 'Class C 空域の外から進入管制を呼んだ。', atc: 'Aircraft calling LAB Approach, stand by.', q: 'Class C に入ってよい？',
      options: ['入ってはいけない（交信は確立していない）', '入ってよい', '7700 にして入る', '高度を上げれば入ってよい'], answer: 0,
      why: 'AIM 3-2-4：コールサインのない応答では交信は確立していない。Class C の外で待ち、呼ばれるのを待つ。',
      clarify: '自分の呼び出しが届いているか分からないときは、少し待って短く呼び直す。', refs: ['aim41'] },
    { id: 'r_vector', g: 'radar', title: '針路の指示', situation: 'レーダー業務を受けている。', atc: `${CSS}, turn right heading one two zero.`, q: RB,
      options: [`Right heading one two zero, ${CSS}.`, `Heading one twenty, ${CSS}.`, `Roger, ${CSS}.`, `Left heading one two zero, ${CSS}.`], answer: 0,
      why: '針路の指示（vector）は左右と 3 桁の数字を復唱する（AIM 4-4-7・4-2-10）。“one twenty” ではなく one two zero。',
      clarify: '雲などで従えないときは「Unable」と言い、理由を伝える。', refs: ['aim42'] },
    { id: 'r_term', g: 'radar', title: 'レーダー業務の終了', situation: '訓練空域に入るので、周波数の変更を頼んだ。', atc: `${CSS}, radar service terminated, squawk VFR, frequency change approved.`, q: '何と言い、何をする？',
      options: [`Squawk VFR, frequency change approved, ${CSS}. → コードを 1200 に`, `Roger, ${CSS}. → コードはそのまま`, `Squawk seven six zero zero, ${CSS}.`, '（黙ってトランスポンダーを切る）'], answer: 0,
      why: 'Squawk VFR はコードを 1200 に（JO 7110.65 5-2・7-6）。トランスポンダーは切らない（高度の情報はほかの機と管制のために役立つ）。',
      clarify: '業務を続けてほしければ、終了の前に頼む。', refs: ['jo71', 'aim41'] },
    { id: 'r_enterdw', g: 'land', title: '場周経路への入り方の指示', situation: '進入管制にレーダーで誘導されている。', atc: `${CSS}, enter left downwind runway three six. Contact LAB Tower one one eight point three.`, q: RB,
      options: [`Left downwind runway three six, Tower one one eight point three, ${CSS}.`, `Downwind, ${CSS}.`, `Right downwind runway three six, ${CSS}.`, `Tower, ${CSS}.`], answer: 0,
      why: '左右・滑走路番号・周波数を復唱する（AIM 4-4-7）。左右の取り違えは、ほかの機との衝突につながる重大な誤り。',
      clarify: '周波数を書き取れなかったら「Say again frequency」。', refs: ['aim42', 'aim43'] },
    { id: 'r_land', g: 'land', title: '着陸の順番と許可', situation: '左ダウンウインドの中央を報告した。左ベースの Cessna が見えている。', atc: `${CSS}, number two, follow the Cessna on left base. Runway three six, cleared to land.`, q: RB,
      options: [`Number two, traffic in sight, runway three six, cleared to land, ${CSS}.`, `Cleared to land, ${CSS}.`, `Number one, runway three six, cleared to land, ${CSS}.`, `Roger, ${CSS}.`], answer: 0,
      why: '着陸許可は滑走路番号を付けて復唱（AIM 4-4-7）。順番と、前の機が見えたことも伝える。見えなければ “negative contact”。',
      clarify: '前の機を見失ったら、すぐに伝える。見えないまま旋回しない。', refs: ['aim42', 'jo71'] },
    { id: 'r_extend', g: 'land', title: 'ダウンウインドを延ばせ', situation: 'ダウンウインドを飛んでいる。前に多くの機がいる。', atc: `${CSS}, extend downwind.`, q: RB,
      options: [`Extend downwind, ${CSS}.`, `Turning base, ${CSS}.`, `Roger, short approach, ${CSS}.`, '（応答せずにベースへ旋回する）'], answer: 0,
      why: 'Extend downwind は JO 7110.65 の言い方で、ダウンウインドをそのまま延ばす。ベースへの旋回は言われるまで待つ（または管制官が伝える条件で）。',
      clarify: 'どこまで延ばすか不安なら確かめる。滑走路から離れすぎるなら伝える。', refs: ['jo71'] },
    { id: 'r_option', g: 'land', title: 'オプションの許可', situation: '場周経路で練習中。ダウンウインドで option を頼んだ。', atc: `${CSS}, runway three six, cleared for the option.`, q: RB,
      options: [`Runway three six, cleared for the option, ${CSS}.`, `Option, ${CSS}.`, `Cleared touch and go, ${CSS}.`, `Roger, ${CSS}.`], answer: 0,
      why: 'Cleared for the option は、タッチアンドゴー・ローアプローチ・ストップアンドゴー・フルストップなどをパイロットが選べる訓練用の許可（PCG）。滑走路番号を付けて復唱。',
      clarify: '滑走路で止まる・遅れるときはすぐに伝える。', refs: ['pcg', 'aim43'] },
    { id: 'r_goaround', g: 'land', title: 'ゴーアラウンドの指示', situation: '最終進入の途中。前の機がまだ滑走路にいる。', atc: `${CSS}, go around.`, q: 'まずすることは？',
      options: ['すぐにゴーアラウンドの操作。そのあと “Going around, Archer 7LA.”', '着陸を続けてから理由を聞く', '“Say again” と言い、進入を続ける', '“Unable” と言う'], answer: 0,
      why: 'Go around は進入をやめる指示（PCG）。操縦が先（全開・姿勢・形態）、無線はあと。ほかに指示がなければ、VFR は滑走路の上を上昇して場周に入る（PCG）。',
      clarify: '指示がよく分からなくても、ゴーアラウンドは安全側の操作。', refs: ['pcg'] },
    { id: 'r_exit', g: 'land', title: '着陸後：いつ地上管制へ？', situation: '着陸して減速中。', atc: `${CSS}, turn right at Charlie, contact Ground point seven.`, q: '正しい順番は？',
      options: ['復唱 → 誘導路 C で出る → 停止線を越えて止まる → 121.7 を呼ぶ', '滑走路の上ですぐ 121.7 に変えて呼ぶ', '応答せず駐機場へ走る', '管制塔の周波数で駐機場までの道を聞く'], answer: 0,
      why: '滑走路を出て停止線を越えたら止まり、地上管制へ（AIM 4-3-21・4-3-14）。“Ground point seven” は 121.7。地上管制の指示は滑走路の横断を許すものではない。',
      clarify: '指示された誘導路を通り過ぎたら、滑走路の上で勝手に引き返さず、管制塔に伝えて指示を受ける（教材の注意）。', refs: ['aim43'] },
    { id: 'r_correct', g: 'clarify', title: '自分の言い間違いを直す', situation: '「squawk four two seven one」と言われたのに、「Squawk four two seven seven」と復唱してしまったのに気づいた。', atc: '', q: SAYQ,
      options: [`Correction, squawk four two seven one, ${CSS}.`, '（黙って正しいコードを入れる）', `Negative, ${CSS}.`, `Say again, ${CSS}.`], answer: 0,
      why: 'Correction は「送信に誤りがあった。正しいものを言う」（PCG）。黙って直すと、管制官は間違った復唱を聞いたままになる。',
      clarify: '自信がないなら「Verify squawk four two seven one」と確かめる。', refs: ['pcg'] },
    { id: 'r_unable', g: 'clarify', title: '従えない指示', situation: 'VFR で飛行中。言われた針路の先に雲がある。', atc: `${CSS}, turn left heading two seven zero.`, q: SAYQ,
      options: [`Unable heading two seven zero due to clouds, ${CSS}.`, '（黙って雲を避けて別の針路へ）', `Wilco, ${CSS}.`, `Negative contact, ${CSS}.`], answer: 0,
      why: 'Unable は「その指示に従えない」（PCG）。VFR は雲から離れる義務がある（14 CFR 91.155）。理由と代わりにできることを伝える。Wilco は「従う」なので誤り。',
      clarify: '例：「…, can turn left heading two four zero」と代案を添えると管制官が助かる。', refs: ['pcg', 'aim42'] },
    { id: 'r_verify', g: 'clarify', title: '自分宛てか分からない', situation: '似たコールサインの機が同じ周波数にいる。「…Seven Lima…, cleared to land」と聞こえた。', atc: '', q: SAYQ,
      options: [`LAB Tower, ${CS}, verify cleared to land runway three six.`, `Runway three six, cleared to land, ${CSS}.`, '（自分宛てと決めて着陸する）', '（何も言わずゴーアラウンド）'], answer: 0,
      why: 'Verify は「確認を求める」（PCG）。コールサインが似ているときは特に、推測で着陸しない。AIM 4-2-4 も、似たコールサインのときの確かめ方を示している。',
      clarify: 'ゴーアラウンドは安全側の判断だが、伝えずにやると管制官の計画が崩れる。', refs: ['pcg', 'aim42'] },
    { id: 'r_partial', g: 'clarify', title: '一部だけ聞き取れない', situation: '指示の途中が雑音で消えた。「…turn right heading one two zero, (雑音)…」', atc: '', q: SAYQ,
      options: [`Say again all after heading one two zero, ${CSS}.`, `Wilco, ${CSS}.`, `Right heading one two zero, ${CSS}.`, '（聞こえた所だけ実行する）'], answer: 0,
      why: 'Say again は全部でも一部でもよい。一部なら「Say again all after …」「all before …」と言える（PCG・AIM）。聞こえた所だけ復唱すると、残りを受け取ったと思われる。',
      clarify: '全体が分からないなら「Say again」だけでよい。', refs: ['pcg'] },
    { id: 'r_ctaf_dw', g: 'ctaf', title: '管制塔のない空港：ダウンウインドに入る', situation: '管制塔のない Lakeside 空港（架空）。CTAF で、滑走路 18 の左ダウンウインドに入る。', atc: '', q: SAYQ,
      options: [`Lakeside traffic, ${CS}, entering left downwind runway one eight, full stop, Lakeside.`, 'Traffic in the area, please advise.', `Lakeside traffic, ${CSS}, landing on the active runway.`, '（何も言わずに着陸する）'], answer: 0,
      why: '自己通報の型：最初と最後に空港名、自分、位置、滑走路番号、意図（AIM 4-1-9）。“Traffic in the area, please advise” は認められた言い方ではなく使わない。“active runway” ではなく滑走路番号で。',
      clarify: 'ほかの機の通報をよく聞き、自分との位置関係を頭に描く。', refs: ['aim41'] },
    { id: 'r_ctaf_clear', g: 'ctaf', title: '管制塔のない空港：滑走路を出た', situation: 'Lakeside 空港（架空）に着陸し、滑走路 18 を出た。', atc: '', q: SAYQ,
      options: [`Lakeside traffic, ${CSS}, clear of runway one eight, Lakeside.`, '（何も言わない）', `Lakeside tower, ${CSS}, clear.`, `Lakeside traffic, ${CSS}, request taxi to parking.`], answer: 0,
      why: '管制塔のない空港では、滑走路を出たことも知らせる（AIM 4-1-9 の表）。Tower はいない。タキシーの許可を求める相手もいない。',
      clarify: '空港の CTAF はチャートと Chart Supplement で事前に確かめる。', refs: ['aim41'] },
    { id: 'r_mayday', g: 'emg', title: 'エンジン故障：遭難の通報', situation: 'LAB の北東 10 マイル・2,500 ft でエンジンが止まった。最良滑空速度にし、着陸できる場所を決めた。2 人が乗っている。進入管制と交信中。', atc: '', q: SAYQ,
      options: [`Mayday, Mayday, Mayday, LAB Approach, ${CS}, engine failure, forced landing in a field, one zero miles northeast of LAB, two thousand five hundred, two people on board.`, `LAB Approach, ${CSS}, we have a little problem.`, `Pan-pan, Pan-pan, Pan-pan, ${CSS}, request vectors.`, '（無線は使わず不時着に集中）'], answer: 0,
      why: 'MAYDAY ×3、相手、自分、状況、意図、位置、高度、人数（AIM 6-3-2 が勧める順）。差し迫った重大な危険は MAYDAY（遭難）。まず操縦（最良滑空速度・場所の選定）、それから通報。',
      clarify: '交信中ならコードはそのまま（指示があれば変える）。交信できていなければ 7700（AIM 6-3-2）。', refs: ['aim63', 'pcg'] },
    { id: 'r_panpan', g: 'emg', title: '自分の位置に自信がない', situation: '訓練空域から帰る途中、位置に自信がなくなってきた。燃料はまだ十分。', atc: '', q: SAYQ,
      options: [`Pan-pan, Pan-pan, Pan-pan, LAB Approach, ${CS}, uncertain of position, request assistance, last known position one five miles northeast of LAB, heading two two zero, three thousand five hundred.`, '（黙って飛び続ける）', `Mayday, Mayday, Mayday, ${CSS}, lost, crashing.`, `LAB Approach, ${CSS}, everything normal.`], answer: 0,
      why: 'AIM 6-1-2：位置や燃料などに自信がなくなった時点で、少なくとも緊急（urgency）の状態。早く伝えるほど助けやすい。PAN-PAN ×3 で始め、迷ったときは最後に分かっていた位置と、そこからの針路を言う（AIM 6-3-2）。',
      clarify: '高く上がると無線とレーダーが届きやすい（AIM 6-3-2：可能なら上昇）。', refs: ['aim63'] },
    { id: 'r_nordo', g: 'emg', title: '無線が故障した（VFR）', situation: 'VFR の天気で飛行中、何をしても無線が送受信できなくなった。', atc: '', q: 'どうする？',
      options: ['7600 にし、VFR を続けて、できるだけ早く着陸する（管制塔の灯火信号を見る）', '7700 にして雲の中を目的地へ急ぐ', 'そのまま予定どおり 2 時間飛ぶ', 'トランスポンダーを切る'], answer: 0,
      why: '14 CFR 91.185（AIM 6-4）：VFR の天気なら、VFR を続けて、できるだけ早く（as soon as practicable）着陸する。コードは 7600。管制塔のある空港では灯火信号に従う（AIM 4-3-13）。',
      clarify: '本当に壊れたのか、先に確かめる：音量・周波数・MIC の選択・ヘッドセット・もう一方の無線機。', refs: ['aim64', 'aim43'] },
    { id: 'r_light', g: 'emg', title: '灯火信号（地上）', situation: '無線が使えない。地上走行中、管制塔から白い光の点滅が見えた。', atc: '', q: '意味は？',
      options: ['出発した場所に戻れ', '離陸してよい', '止まれ', '使用中の滑走路から離れよ'], answer: 0,
      why: '地上：白の点滅＝空港の出発地点に戻れ、緑の点滅＝タキシーしてよい、緑の連続＝離陸してよい、赤の連続＝止まれ、赤の点滅＝使用中の滑走路から離れよ（AIM 4-3-13）。',
      clarify: '出発前から無線が使えないと分かっているときは、電話で管制塔と打ち合わせ、灯火信号で出発する方法がある（AIM 4-2-13）。', refs: ['aim43', 'aim42'] },
  ];
  // the six Sanford scenes keep their ids (and their progress)
  if (FL.sanford) for (const sc of FL.sanford.SCENES) SCENES.push(Object.assign({ g: 'sfb', q: sc.id === 'notus' ? 'どうする？' : sc.id === 'altdir' ? SAYQ : RB }, sc));
  // a reference key → { label, url }: the textbook's list first, then the Sanford page's
  const ref = (k) => (FL.book && FL.book.R[k]) || (FL.sanford && FL.sanford.SRC[k]) || null;

  // ---------------------------------------------------------------- the glossary (meaning; where it is defined)
  // [English, meaning, note, source, group]
  const GLOSSARY = [
    ['Roger', '最後の送信を全部受け取った', '「はい」の意味ではない。Yes/No の質問の答えに使わない', 'PCG', '基本の応答'],
    ['Wilco', '受け取り、理解し、従う', 'Will comply の略。受け取ったことも含むので Roger を重ねなくてよい', 'PCG', '基本の応答'],
    ['Affirmative', 'はい', '“Yes” の代わり（ICAO・英国では “affirm”）', 'PCG', '基本の応答'],
    ['Negative', 'いいえ・許可しない・正しくない', '', 'PCG', '基本の応答'],
    ['Unable', 'その指示・要求・許可に従えない', '理由と代案を添える', 'PCG', '基本の応答'],
    ['Stand by', '少し待て（優先する仕事がある）', '許可でも拒否でもない。長く待たされたら呼び直す', 'PCG', '基本の応答'],
    ['Go ahead', 'どうぞ（用件を言え）', 'ほかの意味では使わない（ICAO・英国では “pass your message”）', 'PCG', '基本の応答'],
    ['Over', '送信を終える。返事を待つ', '最初の交信で必要なら（AIM 4-2-3）', 'PCG', '基本の応答'],
    ['Out', '交信を終える。返事はいらない', '', 'PCG', '基本の応答'],
    ['Say again', 'もう一度言ってください', '一部なら “say again all after …”', 'PCG', '聞き直し・確認'],
    ['I say again', 'もう一度言います', '', 'PCG', '聞き直し・確認'],
    ['Verify', '確認してください', '例：“verify assigned altitude”', 'PCG', '聞き直し・確認'],
    ['Correction', '誤りがあった。正しいものを言う', '', 'PCG', '聞き直し・確認'],
    ['Read back', '私の言ったことを繰り返せ', '', 'PCG', '聞き直し・確認'],
    ['Words twice', '通信が悪い。各語を 2 回言ってください／言います', '', 'PCG', '聞き直し・確認'],
    ['Student pilot', '学生操縦士です', '最初の呼び出しで言うとよい（AIM 4-2-4）', 'AIM', '聞き直し・確認'],
    ['Information (Bravo)', 'ATIS の記号（B を聞いた）', '“with information Bravo”（AIM 4-1-13）', 'AIM', 'ATIS・天気'],
    ['Have numbers', '風・滑走路・高度計だけ聞いた', 'ATIS を受け取った意味にはならない（AIM 4-1-13）', 'AIM', 'ATIS・天気'],
    ['Altimeter (three zero zero one)', '高度計規正値（30.01 inHg）', '1 桁ずつ。ICAO・英国は QNH（hPa）', 'JO 7110.65', 'ATIS・天気'],
    ['Wind (three four zero) at (eight)', '風 340° 8 kt', '3 kt 未満は “wind calm”', 'JO 7110.65', 'ATIS・天気'],
    ['Taxi via (Alpha)', '（誘導路 A）を経由して地上走行せよ', '滑走路に入る・横切る許可ではない（AIM 4-3-18）', 'AIM', '地上'],
    ['Hold short of (runway / taxiway)', '（滑走路・誘導路）の手前で止まれ', '必ず復唱（AIM 4-3-18）。英国では “holding point”', 'AIM', '地上'],
    ['Hold position', 'いる場所で止まれ', '', 'JO 7110.65', '地上'],
    ['Cross runway (two seven)', '滑走路 27 を横切ってよい', '滑走路番号を付けて復唱', 'JO 7110.65', '地上'],
    ['Progressive taxi', '1 区間ずつの道案内', '不慣れ・迷ったときに頼める（AIM 4-3-18）', 'AIM', '地上'],
    ['Ready for departure', '出発の準備ができた', '', '教材の例', '離着陸'],
    ['Line up and wait (LUAW)', '滑走路に入って待て', '離陸許可ではない（AIM 5-2-5）', 'PCG', '離着陸'],
    ['Cleared for takeoff', '離陸を許可する', '滑走路番号を付けて復唱', 'PCG', '離着陸'],
    ['Cleared to land', '着陸を許可する', '滑走路番号を付けて復唱', 'PCG', '離着陸'],
    ['Cleared for the option', 'タッチアンドゴー・ローアプローチ・ストップアンドゴー・フルストップなどを選んでよい', '訓練用（AIM 4-3-23）', 'PCG', '離着陸'],
    ['Go around', '進入をやめて上昇せよ', 'VFR は指示がなければ滑走路の上を上昇して場周へ', 'PCG', '離着陸'],
    ['Fly runway heading', '滑走路の方位で上昇せよ', '', 'JO 7110.65', '離着陸'],
    ['Closed traffic', '場周経路での離着陸の練習', '“Left closed traffic approved”', 'JO 7110.65', '場周経路'],
    ['Enter left downwind', '左ダウンウインドに入れ', '', '教材の例', '場周経路'],
    ['Report midfield downwind', 'ダウンウインドの中央で報告せよ', '', '教材の例', '場周経路'],
    ['Number two, follow (the Cessna)', '着陸順 2 番、（Cessna）に続け', '', 'JO 7110.65', '場周経路'],
    ['Extend downwind', 'ダウンウインドを延ばせ', '', 'JO 7110.65', '場周経路'],
    ['Make short approach', '短い最終進入をせよ', '', 'PCG', '場周経路'],
    ['Turn right at (Charlie)', '（誘導路 C）で右に出よ', '', 'JO 7110.65', '場周経路'],
    ['Contact (facility) (frequency)', '（相手）と交信せよ', '応答してから変え、呼ぶ', 'PCG', '周波数'],
    ['Monitor (frequency)', '聞いていよ（自分から呼ばない）', 'Contact との違いに注意', 'PCG', '周波数'],
    ['Ground point seven', '地上管制 121.7', '121 を省いた言い方（AIM 4-3-14）', 'AIM', '周波数'],
    ['Frequency change approved', '周波数の変更を承認する', '', 'JO 7110.65', '周波数'],
    ['Radar contact', 'レーダーで識別した。業務の終了まで情報を出す', '', 'PCG', 'レーダー'],
    ['Radar service terminated', 'レーダー業務を終了する', '', 'PCG', 'レーダー'],
    ['Resume own navigation', '自分で航法を続けよ', '', 'PCG', 'レーダー'],
    ['Squawk (code)', 'トランスポンダーのコードを（…）に', '4 桁を 1 桁ずつ', 'JO 7110.65', 'レーダー'],
    ['Squawk VFR', 'コードを 1200 に', '', 'JO 7110.65', 'レーダー'],
    ['Ident', 'トランスポンダーの IDENT ボタンを押せ', '', 'PCG', 'レーダー'],
    ['Traffic, (two) o\'clock, (three) miles, …', '2 時の方向・3 マイルに他機', '時計の方位は機首が 12 時（AIM 4-1-15）', 'JO 7110.65', 'レーダー'],
    ['Traffic in sight', '伝えられた交通が見えた', '', 'PCG', 'レーダー'],
    ['Negative contact', '伝えられた交通が見えない', 'よけるのを頼んでもよい', 'PCG', 'レーダー'],
    ['Traffic no factor', 'その交通はもう関係ない', '', 'JO 7110.65', 'レーダー'],
    ['Remain outside Charlie airspace and stand by', 'Class C の外にいて待て', '', 'JO 7110.65', 'レーダー'],
    ['Change to advisory frequency approved', '（管制塔のない空港の）CTAF に変えてよい', '', 'JO 7110.65', 'レーダー'],
    ['Expedite', '急いで（最良の上昇・降下率などで）', '', 'PCG', '急ぐ・緊急'],
    ['Immediately', 'すぐに（差し迫った状況を避けるため）', '', 'PCG', '急ぐ・緊急'],
    ['Mayday (×3)', '遭難：重大で差し迫った危険。すぐに助けが要る', '', 'PCG', '急ぐ・緊急'],
    ['Pan-pan (×3)', '緊急：安全が心配だが、すぐの助けは要らない', '', 'AIM', '急ぐ・緊急'],
    ['(Airport) traffic', '管制塔のない空港で、周りの機全員へ', '最初と最後に空港名（AIM 4-1-9）', 'AIM', '管制塔のない空港'],
    ['Traffic in the area, please advise', '（使ってはいけない言い方）', '認められた言い方ではない（AIM 4-1-9）', 'AIM', '管制塔のない空港'],
  ];

  // ---------------------------------------------------------------- drills: saying numbers and letters
  // rng: () => [0, 1). Each question: { kind, q, show, ok, opts, why, say }
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pick = (rng, a) => a[Math.floor(rng() * a.length) % a.length];
  const ri = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
  function shuffle(rng, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // four different choices: the right one and three wrong ones (fill from a spare list if two coincide)
  function four(rng, ok, wrong, spare) {
    const out = [ok]; for (const w of [...wrong, ...(spare || [])]) { if (out.length >= 4) break; if (w && !out.includes(w)) out.push(w); }
    return shuffle(rng, out);
  }
  const DRILLS = {
    alt: { t: '高度', make(rng) {
      const ft = pick(rng, [500, 1200, 2500, 3500, 4500, 5500, 6500, 7000, 8500, 9500, 10000, 10500, 11500, 12000, 13500, 15500, 17500]);
      const ok = altitude(ft), th = Math.floor(ft / 1000), hu = (ft % 1000) / 100;
      return { q: `高度 ${ft.toLocaleString('en-US')} ft の言い方は？`, ok, say: ok,
        opts: four(rng, ok, [digits(ft), th >= 10 ? `${words(th)} thousand${hu ? ' ' + words(hu) + ' hundred' : ''}` : (hu ? `${words(th * 10 + hu)} hundred` : `${words(th)} zero zero zero`), `flight level ${digits(pad(ft / 100, 3))}`], [`${digits(th || 0)} thousand ${digits(hu)}`]),
        why: '18,000 ft 未満は、千の位までを 1 桁ずつ＋thousand、百の位＋hundred（AIM 4-2-8・4-2-9）。10,000 は one zero thousand。“forty-five hundred” のような言い方はしない。' };
    } },
    fl: { t: 'フライトレベル', make(rng) {
      const fl = pick(rng, [180, 190, 230, 250, 270, 310, 350]), ok = altitude(fl * 100);
      return { q: `FL${fl} の言い方は？`, ok, say: ok, opts: four(rng, ok, [`${digits(fl / 10)} thousand`, `flight level ${words(fl)}`, `${altitude(fl * 100).replace('flight level ', '')} feet`]),
        why: '米国では 18,000 ft（FL180）以上は “flight level” ＋ 3 桁を 1 桁ずつ（AIM 4-2-9）。高度計は 29.92 に合わせて飛ぶ。' };
    } },
    hdg: { t: '針路', make(rng) {
      const d = pick(rng, [5, 20, 45, 90, 120, 155, 180, 210, 240, 270, 305, 330, 360]), ok = heading(d);
      return { q: `針路 ${pad(d, 3)}° の言い方は？`, ok, say: ok, opts: four(rng, ok, [`heading ${words(d)}`, `heading ${digits(d)}`, `heading ${digits(pad(d, 3)).split(' ').reverse().join(' ')}`], [`heading ${digits(pad((d + 180) % 360 || 360, 3))}`]),
        why: '針路・方位・風向は必ず 3 桁を 1 桁ずつ（AIM 4-2-10）。090 を “ninety”、“niner zero” と言わない。北は 360（000 ではない）。' };
    } },
    spd: { t: '速度', make(rng) {
      const kt = pick(rng, [65, 76, 90, 100, 110, 120, 135, 150, 190, 250]), ok = speed(kt);
      return { q: `速度 ${kt} kt の言い方は？`, ok, say: ok, opts: four(rng, ok, [`${words(kt)} knots`, kt >= 100 ? `${words(Math.floor(kt / 10))} ${DIGW[kt % 10]} knots` : `${digits(kt)} miles per hour`, `${digits(kt)} kilometers`]),
        why: '速度は 1 桁ずつ＋knots（AIM 4-2-11）。' };
    } },
    frq: { t: '周波数', make(rng) {
      const f = pick(rng, ['118.3', '119.75', '121.7', '122.9', '124.35', '126.7', '127.25', '133.45', '135.275']), ok = freq(f);
      const [a, b] = f.split('.');
      return { q: `周波数 ${f} の言い方は？`, ok, say: ok, opts: four(rng, ok, [`${digits(a)} ${digits(b)}`, `${words(+a)} point ${digits(b)}`, `${digits(a)} point ${words(+b)}`], [`${digits(String(+a + 1))} point ${digits(b)}`]),
        why: '1 桁ずつ。小数点は “point”（AIM 4-2-8。ICAO・英国では “decimal”）。' };
    } },
    alts: { t: '高度計', make(rng) {
      const v = pick(rng, ['29.92', '30.01', '29.87', '30.12', '29.78', '30.00']), ok = altimeter(v), [a, b] = v.split('.');
      return { q: `高度計 ${v} inHg の言い方は？`, ok, say: ok, opts: four(rng, ok, [`altimeter ${words(+a)} point ${words(+b)}`, `altimeter ${digits(a)} point ${digits(b)}`, `altimeter ${digits(v.replace('.', '').slice(0, 3))}`]),
        why: '“altimeter” ＋ 4 桁を 1 桁ずつ。小数点は言わない（JO 7110.65 の “altimeter (setting)”）。' };
    } },
    sqk: { t: 'コード', make(rng) {
      const c = pad(ri(rng, 0, 7) * 1000 + ri(rng, 0, 7) * 100 + ri(rng, 0, 7) * 10 + ri(rng, 0, 7), 4), ok = squawk(c);
      return { q: `コード ${c} の言い方は？`, ok, say: ok, opts: four(rng, ok, [`squawk ${words(+c.slice(0, 2))} ${words(+c.slice(2))}`, `squawk ${digits(c.split('').reverse().join(''))}`, `squawk ${digits(String(+c))} zero`], [`squawk ${digits(c.slice(1))}`, c === '7700' ? 'squawk one two zero zero' : 'squawk seven seven zero zero']),
        why: 'コードは 4 桁を 1 桁ずつ。トランスポンダーのコードは 0〜7 の数字だけ（8 と 9 はない）。' };
    } },
    rwy: { t: '滑走路', make(rng) {
      const r = pick(rng, ['36', '9R', '27C', '18', '9L', '27L', '22R', '13', '31']), ok = runway(r), m = /^(\d+)([LRC]?)$/.exec(r);
      const suf = m[2] ? ' ' + { L: 'left', R: 'right', C: 'center' }[m[2]] : '', recip = digits(String((+m[1] + 17) % 36 + 1)), wrong = [];
      if (+m[1] >= 10) wrong.push(`runway ${words(+m[1])}${suf}`);
      if (m[2]) wrong.push(`runway ${digits(m[1])} ${{ L: 'right', R: 'left', C: 'left' }[m[2]]}`, `runway ${digits(m[1])}`);
      else wrong.push(`runway ${digits(m[1])} center`, `runway ${recip}`);
      return { q: `滑走路 ${r} の言い方は？`, ok, say: ok, opts: four(rng, ok, wrong, [`runway ${recip}${suf}`]),
        why: '滑走路番号は 1 桁ずつ＋left / right / center（AIM 4-2-8：数字は 1 桁ずつ）。平行滑走路の L・R・C は必ず言う・聞く。' };
    } },
    wnd: { t: '風', make(rng) {
      const dir = pick(rng, [20, 90, 140, 180, 220, 270, 300, 340, 360]), kt = pick(rng, [2, 5, 8, 10, 12, 15, 18]), ok = wind(dir, kt);
      return { q: `風 ${pad(dir, 3)}° ${kt} kt（管制塔の言い方）は？`, ok, say: ok,
        opts: four(rng, ok, [`wind ${words(dir)} at ${words(kt)}`, `wind ${digits(Math.max(kt, 3))} at ${digits(pad(dir, 3))}`, kt < 3 ? `wind ${digits(pad(dir, 3))} at ${digits(kt)}` : 'wind calm'], [`wind ${digits(pad(dir, 3))}`]),
        why: '“wind (風向 3 桁) at (風速)”、3 kt 未満は “wind calm”（JO 7110.65）。風向・風速の数字も 1 桁ずつ。' };
    } },
    utc: { t: '時刻（UTC）', make(rng) {
      const h = ri(rng, 6, 19), m = pick(rng, [0, 15, 30, 45, 5, 50]), dst = rng() < 0.6, z = (h + (dst ? 4 : 5)) % 24, hhmm = pad(z, 2) + pad(m, 2), ok = time(hhmm);
      const alt = (dz) => time(pad((z + dz + 24) % 24, 2) + pad(m, 2));
      return { q: `フロリダの${dst ? '夏時間（EDT）' : '標準時（EST）'} ${h}:${pad(m, 2)} は、UTC で何と言う？`, ok, say: ok, opts: four(rng, ok, [alt(dst ? 1 : -1), alt(-(dst ? 8 : 10)), alt(dst ? -1 : 1)]),
        why: `FAA は UTC を使う（AIM 4-2-12）。東部標準時（EST）は +5 時間、夏時間は 1 時間少なく +4 時間。${h}:${pad(m, 2)} → ${hhmm}。4 桁を 1 桁ずつ、“Zulu” を付けてよい。` };
    } },
    call: { t: 'コールサイン', make(rng) {
      const L = 'ABCDEFGHJKLMNPRSTUVWXYZ', id = 'N' + ri(rng, 1, 9) + ri(rng, 0, 9) + pick(rng, L.split('')) + pick(rng, L.split('')), ok = cap(spell(id));
      const ws = ok.split(' ');
      return { q: `登録記号 ${id} のフォネティックは？`, ok, say: ok, opts: four(rng, ok, [`November ${cap(words(+id.slice(1, 3)))} ${ws.slice(3).join(' ')}`, [...ws.slice(0, 3), ws[4], ws[3]].join(' '), ws.slice(1).join(' ')], [ws.slice(0, 4).join(' ')]),
        why: '文字はフォネティック、数字は 1 桁ずつ（AIM 4-2-4・4-2-7）。機種名を言うときは N を省く（例：Archer Seven Lima Alpha）。' };
    } },
    letter: { t: 'アルファベット', make(rng) {
      const a = pick(rng, ALPHA), rev = rng() < 0.5, others = shuffle(rng, ALPHA.filter(x => x !== a)).slice(0, 3);
      if (rev) return { q: `“${a[1]}” はどの文字？`, ok: a[0], say: a[1], opts: shuffle(rng, [a[0], ...others.map(x => x[0])]), why: `${a[0]} ＝ ${a[1]}（発音 ${a[2]}、AIM 4-2-7）。` };
      return { q: `文字「${a[0]}」のフォネティックは？`, ok: a[1], say: a[1], opts: shuffle(rng, [a[1], ...others.map(x => x[1])]), why: `${a[0]} ＝ ${a[1]}（発音 ${a[2]}、AIM 4-2-7）。` };
    } },
  };
  const DRILL_SETS = [['all', 'すべて', Object.keys(DRILLS)], ['alt', '高度', ['alt', 'fl']], ['dir', '針路・速度・風', ['hdg', 'spd', 'wnd']], ['radio', '周波数・高度計・コード', ['frq', 'alts', 'sqk']], ['rwy', '滑走路・時刻', ['rwy', 'utc']], ['abc', 'アルファベット・コールサイン', ['letter', 'call']]];
  function drill(n, rng, set) {
    const kinds = shuffle(rng, (DRILL_SETS.find(s => s[0] === set) || DRILL_SETS[0])[2]), out = [];
    for (let i = 0; i < n; i++) { const kind = kinds[i % kinds.length]; out.push(Object.assign({ kind }, DRILLS[kind].make(rng))); }
    return shuffle(rng, out);
  }

  // ---------------------------------------------------------------- the listening drill: hear one call, pick what was said
  // { say (English for the speech synthesis), q, ok, opts, why }
  const LISTEN = {
    vector(rng) {
      const d = pick(rng, [30, 60, 120, 150, 210, 240, 300, 330]), lr = rng() < 0.5 ? 'left' : 'right', jl = lr === 'left' ? '左' : '右', ft = pick(rng, [3000, 3500, 4000, 4500, 5500]);
      return { say: `${CS}, turn ${lr} ${heading(d)}, climb and maintain ${altitude(ft)}.`, q: '指示された旋回の方向・針路・高度は？（計器飛行の練習の場面）',
        ok: `${jl}・${pad(d, 3)}°・${ft.toLocaleString('en-US')} ft`, opts: [`${jl}・${pad(d, 3)}°・${ft.toLocaleString('en-US')} ft`, `${jl === '左' ? '右' : '左'}・${pad(d, 3)}°・${ft.toLocaleString('en-US')} ft`, `${jl}・${pad((d + 180) % 360, 3)}°・${ft.toLocaleString('en-US')} ft`, `${jl}・${pad(d, 3)}°・${(ft + 1000).toLocaleString('en-US')} ft`],
        why: '左右 → 針路（3 桁）→ 高度の順に書き取る。' };
    },
    contact(rng) {
      const f = pick(rng, ['119.75', '124.35', '125.8', '126.45', '132.65']), c = pad(ri(rng, 1, 7) * 1000 + ri(rng, 0, 7) * 100 + ri(rng, 0, 7) * 10 + ri(rng, 0, 7), 4);
      const [a, b] = f.split('.'), swapF = `${a}.${b.length > 1 ? b[1] + b[0] : b}`, swapC = c.slice(0, 2) + c[3] + c[2];
      return { say: `${CS}, contact LAB Departure ${freq(f)}, squawk ${digits(c)}.`, q: '周波数とコードは？',
        ok: `${f}・${c}`, opts: [`${f}・${c}`, `${swapF === f ? (+a + 1) + '.' + b : swapF}・${c}`, `${f}・${swapC === c ? c.slice(0, 3) + ((+c[3] + 1) % 8) : swapC}`, `${(+a - 1)}.${b}・${c}`],
        why: '周波数は “point” の前後で区切る。コードは 4 桁。書き取ってから復唱する。' };
    },
    takeoff(rng) {
      const r = pick(rng, ['27L', '9R', '36', '18', '27R']), dir = pick(rng, [250, 270, 290, 340, 360, 180]), kt = pick(rng, [6, 8, 12, 14]), luaw = rng() < 0.4;
      const opp = r.replace(/[LR]/, x => (x === 'L' ? 'R' : 'L')), alt = opp === r ? (r === '36' ? '18' : '36') : opp;
      const what = luaw ? '入って待て（LUAW）' : '離陸許可';
      return { say: `${CS}, ${runway(r)}${luaw ? ', line up and wait' : `, ${wind(dir, kt)}, cleared for takeoff`}.`, q: '滑走路と指示は？',
        ok: `滑走路 ${r}・${what}`, opts: [`滑走路 ${r}・${what}`, `滑走路 ${alt}・${what}`, `滑走路 ${r}・${luaw ? '離陸許可' : '入って待て（LUAW）'}`, `滑走路 ${r}・手前で待て（hold short）`],
        why: 'LUAW は離陸許可ではない。平行滑走路の L / R を聞き分ける。' };
    },
    traffic(rng) {
      const o = ri(rng, 1, 12), mi = ri(rng, 2, 8), dir = pick(rng, [['northbound', '北向き'], ['southbound', '南向き'], ['eastbound', '東向き'], ['westbound', '西向き']]), ft = pick(rng, [1500, 2000, 2500, 3500, 4500]);
      const ok = `${o} 時・${mi} マイル・${dir[1]}・${ft.toLocaleString('en-US')} ft`;
      return { say: `${CS}, traffic, ${words(o)} o'clock, ${words(mi)} miles, ${dir[0]}, a Cessna, ${altitude(ft)}.`, q: '交通情報の内容は？',
        ok, opts: [ok, `${(o + 5) % 12 + 1} 時・${mi} マイル・${dir[1]}・${ft.toLocaleString('en-US')} ft`, `${o} 時・${mi + 2} マイル・${dir[1]}・${ft.toLocaleString('en-US')} ft`, `${o} 時・${mi} マイル・${dir[1]}・${(ft + 1000).toLocaleString('en-US')} ft`],
        why: '型は「時計の方位・距離・進む方向・機種・高度」（AIM 4-1-15・JO 7110.65）。' };
    },
    notme(rng) {
      const other = pick(rng, [['Cessna Four Kilo Papa', 'Cessna 4KP'], ['Archer Seven Lima Echo', 'Archer 7LE'], ['Cherokee Two Lima Alpha', 'Cherokee 2LA']]), r = pick(rng, ['36', '9R', '27L']);
      return { say: `${other[0]}, ${runway(r)}, cleared to land.`, q: `この送信は誰宛て？（あなたは ${CSS}）`,
        ok: `${other[1]} 宛て（自分ではない）`, opts: [`${other[1]} 宛て（自分ではない）`, `${CSS}（自分）宛て`, '全機宛て', '管制塔の独り言'],
        why: '似たコールサインに注意。自分宛てと確信できなければ確かめる（Verify）。' };
    },
    altim(rng) {
      const v = pick(rng, ['29.87', '30.02', '29.95', '30.14', '29.79']);
      const sw = v.slice(0, 3) + v[4] + v[3];
      return { say: `${CS}, LAB altimeter ${digits(v.replace('.', ''))}.`, q: '高度計規正値は？', ok: `${v} inHg`,
        opts: [v, ...[sw, (+v - 0.1).toFixed(2), '29.92', (+v + 0.1).toFixed(2), (+v + 0.01).toFixed(2)].filter((x, i, a) => x !== v && a.indexOf(x) === i).slice(0, 3)].map(x => x + ' inHg'),
        why: '4 桁を書き取り、2 桁目のあとに小数点を入れる。' };
    },
  };
  function listen(n, rng) {
    const kinds = Object.keys(LISTEN), out = [];
    for (let i = 0; i < n; i++) { const q = LISTEN[kinds[i % kinds.length]](rng); q.opts = shuffle(rng, [...new Set(q.opts)]); out.push(q); }
    return shuffle(rng, out);
  }
  // text for the speech synthesis: the short call sign said in full
  const tts = (s) => String(s).replace(/Archer 7LA/g, CS);

  FL.radio = { CS, CSS, WHO, ALPHA, DIGW, DIGP, SAY, FLIGHT, GROUPS, SCENES, GLOSSARY, DRILLS, DRILL_SETS, drill, LISTEN, listen, mulberry, ref, tts };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
