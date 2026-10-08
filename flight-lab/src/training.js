// FLIGHT LAB — training.js
// The flight tasks (12 tasks × 3 levels: 導入 / 基礎 / 精度), their evaluation and the learning record.
// Evaluation rule: a stage is passed when ALL its conditions stay true CONTINUOUSLY for the stage's hold time; any
// condition going out resets the hold timer to zero. Higher levels: tighter altitude / speed / heading tolerances,
// longer hold times, fewer hints. All speeds, altitudes and tolerances are TEACHING VALUES (仮想教材値) for this
// simulator's simplified aircraft — not checkride standards, not a POH, not an SOP.
// The record (localStorage) is a practice log of this teaching simulator: NOT a pilot logbook, not flight time.
// It never holds an API key, a Google token, Google terrain data or personal information.
(function (FL) {
  'use strict';
  const P = () => FL.physics, AV = () => FL.avionics;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const fin = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const r0 = v => Math.round(fin(v));

  // ---------------------------------------------------------------- the three levels (teaching values)
  const LEVELS = [
    { id: 'intro', name: '導入', en: 'Introduction', alt: 150, spd: 10, hdg: 10, bank: 10, trk: 6, xtk: 0.30, hold: 10, turnHold: 5, hintCount: 99,
      cl: 8, dots: 2.0, sink: 600, tdz: [0, 750], reachNm: 1.0, est: { hdg: 20, pct: 30 }, desc: '許容幅が広く保持時間が短い。ヒントをすべて表示。' },
    { id: 'basic', name: '基礎', en: 'Basic', alt: 100, spd: 7, hdg: 7, bank: 7, trk: 4, xtk: 0.20, hold: 20, turnHold: 8, hintCount: 2,
      cl: 5, dots: 1.5, sink: 400, tdz: [60, 600], reachNm: 0.6, est: { hdg: 15, pct: 20 }, desc: '許容幅を狭め保持時間を延長。ヒントは最初の 2 つだけ。' },
    { id: 'precision', name: '精度', en: 'Precision', alt: 50, spd: 5, hdg: 5, bank: 5, trk: 3, xtk: 0.10, hold: 30, turnHold: 10, hintCount: 0,
      cl: 3, dots: 1.0, sink: 300, tdz: [150, 450], reachNm: 0.3, est: { hdg: 10, pct: 15 }, desc: '最も狭い許容幅と長い保持時間。ヒントなし。' },
  ];
  const level = id => LEVELS.find(l => l.id === id) || LEVELS[0];

  // ---------------------------------------------------------------- condition items
  // every item: { label, ok, val (now), target (with tolerance), dev, tol } — dev / tol feed the debrief's worst deviation
  function altItem(c, tgt, tol) { const d = c.indAlt - tgt; return { label: '高度 ALT', ok: Math.abs(d) <= tol, val: `${r0(c.indAlt)} ft`, target: `${tgt} ±${tol} ft`, dev: d, tol, unit: 'ft' }; }
  function iasItem(c, tgt, tol) { const d = c.o.ias - tgt; return { label: '速度 IAS', ok: Math.abs(d) <= tol, val: `${r0(c.o.ias)} kt`, target: `${tgt} ±${tol} kt`, dev: d, tol, unit: 'kt' }; }
  function hdgItem(c, tgt, tol) { const d = AV().hdgDiff(tgt, c.hdgMag); return { label: '針路 HDG', ok: Math.abs(d) <= tol, val: `${AV().hdgFmt(c.hdgMag)}°`, target: `${AV().hdgFmt(tgt)}° ±${tol}°`, dev: d, tol, unit: '°' }; }
  function trkItem(c, tgt, tol) { const d = AV().hdgDiff(tgt, c.trkMag); return { label: '航跡 TRK', ok: Math.abs(d) <= tol, val: `${AV().hdgFmt(c.trkMag)}°`, target: `DTK ${AV().hdgFmt(tgt)}° ±${tol}°`, dev: d, tol, unit: '°' }; }
  function bankItem(c, tgt, tol) { const d = c.o.bank - tgt; return { label: tgt < 0 ? 'バンク（左）' : 'バンク（右）', ok: Math.abs(d) <= tol, val: `${r0(Math.abs(c.o.bank))}° ${c.o.bank < -0.5 ? 'L' : c.o.bank > 0.5 ? 'R' : ''}`, target: `${Math.abs(tgt)}° ${tgt < 0 ? 'L' : 'R'} ±${tol}°`, dev: d, tol, unit: '°' }; }
  function wingsLevel(c, tol = 5) { return { label: '翼水平 WINGS LEVEL', ok: Math.abs(c.o.bank) <= tol, val: `${r0(Math.abs(c.o.bank))}°`, target: `±${tol}°`, dev: c.o.bank, tol, unit: '°' }; }
  function vsiItem(c, lo, hi, label = '昇降率 VSI') { const v = c.o.vsi, ok = v >= lo && v <= hi, tol = (hi - lo) / 2, mid = (hi + lo) / 2; return { label, ok, val: `${r0(v / 10) * 10} fpm`, target: `${lo} 〜 ${hi} fpm`, dev: v - mid, tol, unit: 'fpm' }; }
  function xtkItem(c, tol) { const x = c.nav.xtk; return { label: '航路外れ XTK', ok: x != null && Math.abs(x) <= tol, val: x == null ? '—' : `${Math.abs(x).toFixed(2)} NM ${x >= 0 ? 'R' : 'L'}`, target: `±${tol.toFixed(2)} NM`, dev: fin(x), tol, unit: 'NM' }; }
  function flag(label, ok, val, target) { return { label, ok: !!ok, val, target }; }
  const noStall = c => flag('失速警報なし', !c.o.stallWarn, c.o.stallWarn ? 'STALL' : 'なし', '警報が出ない');

  // ---------------------------------------------------------------- task helpers
  const V = () => P().TRAINER.V;
  const RWY = () => P().LAB_RWY;
  const distNm = (c, id) => { const w = AV().wpt(id); return w ? AV().neDistNm({ n: c.s.pos[0], e: c.s.pos[1] }, w) : 99; };
  // the items judged at the touchdown (from the touchdown record, not from later values)
  function tdItems(td, L, sinkMax) {
    return [
      flag('滑走路上に接地', td.onRunway, td.onRunway ? '滑走路上' : '滑走路外', 'LAB RWY 36 の舗装面'),
      { label: '接地の降下率', ok: td.fpm <= sinkMax, val: `${td.fpm} fpm`, target: `${sinkMax} fpm 以下`, dev: td.fpm, tol: sinkMax, unit: 'fpm' },
      { label: '中心線からの距離', ok: Math.abs(td.cross) <= L.cl, val: `${Math.abs(td.cross).toFixed(1)} m ${td.cross >= 0 ? 'R' : 'L'}`, target: `±${L.cl} m`, dev: td.cross, tol: L.cl, unit: 'm' },
      flag('接地帯（進入端からの距離）', td.along >= L.tdz[0] && td.along <= L.tdz[1], `${td.along} m`, `${L.tdz[0]}〜${L.tdz[1]} m`),
      flag('主輪から接地', !td.noseFirst, td.noseFirst ? '前輪から' : '主輪から', '前輪から接地しない'),
    ];
  }

  // a position on the line through LAB RWY 36: along (m from the threshold, negative = before it), cross (m right)
  const rwyPt = (along, cross = 0) => P().rwyToNE(RWY(), along, cross);
  const legDtk = (a, b) => AV().trueToMag(AV().neBearing(AV().wpt(a), AV().wpt(b)), P().MAGVAR_W);
  const onLeg = (a, b, k) => { const A = AV().wpt(a), B = AV().wpt(b); return [A.n + (B.n - A.n) * k, A.e + (B.e - A.e) * k]; };
  const wind = (from, kt, gust = 0) => ({ fromDeg: from, kt, gust });
  const byLevel = (L, a, b, c) => (L.id === 'intro' ? a : L.id === 'basic' ? b : c);

  // ---------------------------------------------------------------- the 12 tasks
  // setup(L) → the starting situation; stages → conditions; hints → in order of importance
  const TASKS = [
    {
      id: 't1', no: 1, title: '直線水平飛行', en: 'Straight-and-level flight', chapter: 6, limit: 600,
      brief: '決めた高度・針路・速度を保って真っすぐ飛ぶ。姿勢（Attitude）を決め、出力（Power）を合わせ、トリムで力を抜く、の基本形。後半は出力を下げて 90 kt で同じことをする。',
      setup: L => ({ where: 'air', n: 4000, e: -44000, altFt: 3000, hdgMag: 360, kias: 100, wind: byLevel(L, wind(0, 0), wind(240, 8), wind(240, 12, 4)), hdgBug: 360, altSel: 3000 }),
      stages: [
        { label: '巡航：3,000 ft・HDG 360・100 kt を保つ', items: (c, L) => [altItem(c, 3000, L.alt), hdgItem(c, 360, L.hdg), iasItem(c, 100, L.spd)], hold: L => L.hold },
        { label: '出力を下げて 90 kt で直進水平（姿勢→出力→トリム）', items: (c, L) => [altItem(c, 3000, L.alt), hdgItem(c, 360, L.hdg), iasItem(c, 90, L.spd)], hold: L => L.hold },
      ],
      hints: ['先に機首と水平線の位置（姿勢）を決め、計器は確認に使う（Attitude → Instruments）。', '速度を変えたら [ と ] でトリムを取り、操縦の力を抜く。', '高度が増えるなら機首をわずかに下げる。大きく急に動かさない。', 'HDG バグ（水色）は目標の目印。自動操縦はないので機体は追従しない。'],
      points: ['姿勢・出力・トリムの順で整えると、少ない操作で保てる。', '風があると針路を保っても地上の航跡は流される（第 12 章）。'],
    },
    {
      id: 't2', no: 2, title: '上昇と水平移行', en: 'Climb and level-off', chapter: 6, limit: 600,
      brief: '最良上昇率速度 Vy（教材値 76 kt）で上昇し、3,000 ft で水平飛行に移る。目標高度の手前（上昇率の約 10%）から機首を下げ始めると行き過ぎない。',
      setup: L => ({ where: 'air', n: 4000, e: -44000, altFt: 2000, hdgMag: 360, kias: 100, wind: byLevel(L, wind(0, 0), wind(240, 8), wind(240, 12, 4)), hdgBug: 360, altSel: 3000 }),
      stages: [
        { label: 'Vy 76 kt で上昇（HDG 360）', items: (c, L) => [iasItem(c, 76, L.spd), vsiItem(c, 300, 2500, '上昇中 VSI'), hdgItem(c, 360, L.hdg)], hold: L => Math.max(5, L.hold / 2) },
        { label: '3,000 ft で水平移行し 95〜100 kt に加速', items: (c, L) => [altItem(c, 3000, L.alt), vsiItem(c, -250, 250, '水平 VSI'), iasItem(c, 97, L.spd + 3), hdgItem(c, 360, L.hdg)], hold: L => L.hold },
      ],
      hints: ['上昇は全開出力、機首を上げて 76 kt に合わせる（速度はピッチで合わせる）。', '目標高度の約 50 ft 手前から機首を下げ始め、水平にしてから出力を巡航に戻す。', 'ALT SEL の 3,000 は目印。自動操縦はないので機体は止まらない。', '出力を上げると機首が左に振られる。E（右ラダー）で修正。'],
      points: ['水平移行は「姿勢 → 加速を待つ → 出力 → トリム」の順。', '上昇中は前方視界が悪い。実機では左右を見回す（見張り）。'],
    },
    {
      id: 't3', no: 3, title: '左右旋回', en: 'Level turns, left and right', chapter: 8, limit: 600,
      brief: 'バンク 20° で高度を保ったまま左旋回し HDG 270 で直進に戻る。続いて右旋回で HDG 360 に戻る。旋回中は揚力の一部が横に向くので、少し引いて高度を保つ。',
      setup: L => ({ where: 'air', n: 4000, e: -44000, altFt: 3000, hdgMag: 360, kias: 100, wind: byLevel(L, wind(0, 0), wind(200, 6), wind(200, 10, 3)), hdgBug: 270, altSel: 3000 }),
      stages: [
        { label: '左旋回：バンク 20°、高度を保つ', items: (c, L) => [bankItem(c, -20, L.bank), altItem(c, 3000, L.alt)], hold: L => L.turnHold },
        { label: 'HDG 270 でロールアウトし直進水平', items: (c, L) => [hdgItem(c, 270, L.hdg), wingsLevel(c, 5), altItem(c, 3000, L.alt)], hold: L => L.hold },
        { label: '右旋回：バンク 20°、高度を保つ', items: (c, L) => [bankItem(c, 20, L.bank), altItem(c, 3000, L.alt)], hold: L => L.turnHold },
        { label: 'HDG 360 でロールアウトし直進水平', items: (c, L) => [hdgItem(c, 360, L.hdg), wingsLevel(c, 5), altItem(c, 3000, L.alt)], hold: L => L.hold },
      ],
      hints: ['ロールアウトはバンク角の半分ほど手前（20° なら約 10° 手前）から始める。', '旋回中は少し引く（↑）。戻すときは引いた分を戻す。', 'ボール（スリップ表示）が中央になるようにラダーを合わせる。', '旋回前に旋回方向の見張り（Clear the area）を口に出す習慣を。'],
      points: ['バンク 20°・100 kt の旋回率は約 4°/秒（教材の計算値）。', '高度が下がる原因の多くは、旋回中の引き不足。'],
    },
    {
      id: 't4', no: 4, title: '低速飛行と巡航への回復', en: 'Slow flight and recovery to cruise', chapter: 9, limit: 600,
      brief: '出力を絞って 65 kt まで減速し、高度と針路を保つ（失速警報を出さない）。次に出力を上げ、フラップを上げて巡航 100 kt に戻す。迎角（AOA）の感覚を身につける。',
      setup: L => ({ where: 'air', n: 4000, e: -44000, altFt: 3000, hdgMag: 360, kias: 100, wind: byLevel(L, wind(0, 0), wind(240, 6), wind(240, 10, 3)), hdgBug: 360, altSel: 3000 }),
      stages: [
        { label: '65 kt の低速で高度・針路を保つ（フラップ 10° まで可）', items: (c, L) => [iasItem(c, 65, L.spd), altItem(c, 3000, L.alt), hdgItem(c, 360, L.hdg), noStall(c)], hold: L => L.hold },
        { label: '出力を上げ 100 kt へ回復、フラップ 0°', items: (c, L) => [iasItem(c, 100, L.spd), altItem(c, 3000, L.alt), hdgItem(c, 360, L.hdg), flag('フラップ UP', c.s.ctl.flap === 0, `${P().TRAINER.flaps[c.s.ctl.flap].deg}°`, '0°')], hold: L => L.hold },
      ],
      hints: ['低速では同じ高度を保つのに大きな迎角と多めの出力が要る（後ろ側の領域）。', 'AOA 表示と STALL 警報を見る。警報が出たら機首を下げ出力を上げる。', 'フラップを上げると揚力が減り沈む。少し機首を上げて補う。', '低速では舵の効きが鈍い。ゆっくり大きめに。'],
      points: ['失速は速度ではなく迎角で起きる（第 9 章）。', '回復の基本：迎角を減らす → 出力 → 水平に戻す。'],
    },
    {
      id: 't5', no: 5, title: '離陸', en: 'Normal takeoff', chapter: 10, limit: 300, engineOut: false,
      brief: 'LAB RWY 36（架空の練習用滑走路）で離陸する。中心線を保って加速し、55 kt でローテーション、Vy 76 kt で上昇して 1,000 ft AGL へ。出力を上げると機首が左へ振られるので右ラダーで修正する。',
      setup: L => ({ where: 'runway', along: 30, wind: byLevel(L, wind(0, 0), wind(330, 6), wind(300, 10, 3)), hdgBug: 360, altSel: 1100 }),
      stages: [
        { label: '滑走：中心線を保ち 55 kt でローテーション', gate: true,
          items: (c, L) => [{ label: '中心線から', ok: Math.abs(c.o.rwyCross) <= L.cl, val: `${Math.abs(c.o.rwyCross).toFixed(1)} m ${c.o.rwyCross >= 0 ? 'R' : 'L'}`, target: `±${L.cl} m`, dev: c.o.rwyCross, tol: L.cl, unit: 'm' },
            flag('浮揚速度', c.s.onGround || c.o.ias >= V().r - 5, `${r0(c.o.ias)} kt`, `${V().r - 5} kt 以上で浮揚`)],
          reach: c => !c.s.onGround && c.o.agl > 15, hold: () => 0 },
        { label: '初期上昇：Vy 76 kt・滑走路方位 360', fail: c => (c.s.onGround ? '上昇中に再び接地しました' : null), items: (c, L) => [iasItem(c, 76, L.spd), hdgItem(c, 360, L.hdg), vsiItem(c, 200, 2500, '上昇中 VSI')], hold: L => L.hold },
        { label: '1,000 ft AGL まで上昇を続ける', fail: c => (c.s.onGround ? '上昇中に再び接地しました' : null), items: (c, L) => [iasItem(c, 76, L.spd + 4), hdgItem(c, 360, L.hdg + 3)], reach: c => c.o.agl >= 1000, hold: () => 4 },
      ],
      hints: ['W で全開。出力を上げると機首が左に振られるので E（右ラダー）で中心線を保つ。', '55 kt で ↑ を少し引いて機首を上げる。引きすぎるとテールストライク。', '浮揚後は 76 kt の姿勢を保つ。速度が落ちたら機首を下げる。', 'ヨー補助（設定）は教材の操作補助で、実機にはない。'],
      points: ['離陸中止の判断基準（どこまでに何 kt）を離陸前に決めておく（実機は教官・SOP に従う）。', '横風では風上側にエルロンを取って滑走する（第 10 章）。'],
    },
    {
      id: 't6', no: 6, title: '最終進入と着陸', en: 'Final approach and landing', chapter: 11, limit: 420,
      brief: 'LAB RWY 36 への最終進入（3° パス、フラップ 25°、66 kt）を安定させ、接地帯に主輪から静かに接地して滑走路上で停止する。PFD の LOC/GS 表示（架空の教材用電波）を使える。',
      setup: L => ({ where: 'final', along: -byLevel(L, 3000, 4000, 5000), cross: byLevel(L, 0, 40, 80), kias: 70, flap: 2, glideDeg: 3,
        wind: byLevel(L, wind(0, 0), wind(320, 6), wind(290, 10, 4)), cdi: 'NAV1', nav1: 109900, hdgBug: 360, altSel: 1000 }),
      stages: [
        { label: '安定した最終進入：66 kt・中心線・3° パス', fail: c => (c.s.onGround ? '安定した進入の条件を満たす前に接地しました' : null), items: (c, L) => [iasItem(c, V().app, L.spd),
            flag('中心線 LOC', c.nav.flag === '' && Math.abs(c.nav.dots) <= L.dots, c.nav.flag || `${Math.abs(c.nav.dots).toFixed(1)} dot`, `±${L.dots} dot`),
            flag('進入角 GS', c.nav.gsDots != null && Math.abs(c.nav.gsDots) <= L.dots, c.nav.gsDots == null ? '—' : `${Math.abs(c.nav.gsDots).toFixed(1)} dot`, `±${L.dots} dot`),
            vsiItem(c, -1000, -250, '降下率 VSI')], hold: L => L.hold },
        { label: '接地：接地帯に主輪から静かに', gate: true,
          items: (c, L) => (c.s.td ? tdItems(c.s.td, L, L.sink) : [iasItem(c, V().app, L.spd + 5), wingsLevel(c, 10)]),
          reach: c => !!c.s.td, hold: () => 0 },
        { label: '滑走路上で停止（Space でブレーキ）', items: c => [flag('滑走路上', c.o.onRunway, c.o.onRunway ? '滑走路上' : '滑走路外', '舗装面から出ない')], reach: c => c.s.onGround && c.o.gs < 3, hold: () => 0, gate: true },
      ],
      hints: ['GS の菱形が上にあれば低すぎ、下にあれば高すぎ。出力で降下率を、ピッチで速度を合わせる（逆の説明もあり、教官の方法に従う）。', '接地直前（約 15 ft）で出力をアイドルにし、機首を少し上げて沈みを止める（フレア）。', '横風では風上側の翼を少し下げ、ラダーで機首を中心線に合わせる。', '接地後は Space でブレーキ、Q/E で方向を保つ。'],
      points: ['安定進入の考え方：一定の速度・降下率・中心線・形態が決まっていなければやり直す（Go-around）。', '本タスクの接地基準（降下率・接地帯）は教材値で、機体ごとの基準は POH・教官に従う。'],
    },
    {
      id: 't7', no: 7, title: '横風下の航跡維持', en: 'Wind correction: holding a track', chapter: 12, limit: 600,
      brief: '横風の中で、架空訓練点 LAB-D → LAB-A の航路（マゼンタ線）上を飛ぶ。針路（HDG）を風上に向け、航跡（TRK）を希望航路（DTK）に合わせる（風修正角 WCA）。',
      setup: L => { const [n, e] = onLeg('LABED', 'LABEA', 0.04), dtk = legDtk('LABED', 'LABEA');
        return { where: 'air', n, e, altFt: 2500, hdgMag: dtk, kias: 100, wind: byLevel(L, wind(270, 10), wind(270, 15, 2), wind(265, 20, 5)), fpl: ['LABED', 'LABEA'], cdi: 'GPS', hdgBug: Math.round(dtk), altSel: 2500 }; },
      stages: [
        { label: '風修正角を取り TRK を DTK に合わせる', items: (c, L) => [trkItem(c, fin(c.nav.dtk), L.trk), xtkItem(c, L.xtk * 1.5), altItem(c, 2500, L.alt)], hold: L => L.hold },
        { label: '航路上を保つ（XTK）', items: (c, L) => [xtkItem(c, L.xtk), altItem(c, 2500, L.alt), iasItem(c, 100, L.spd)], hold: L => Math.round(L.hold * 1.5) },
      ],
      hints: ['PFD の TRK（航跡）と HDG（針路）の差が風修正角。左からの風なら機首を左へ。', '航路から外れたら、外れた側と反対へ少し大きめに修正してから戻す。', 'MFD の XTK は航路からのずれ（R = 右にずれている）。', 'CDI の針が右にあれば、航路は右（Fly to the needle）。'],
      points: ['風修正角 ≈ 横風成分 ÷ 真対気速度 × 60（度、概算）。', '実機の航法では計画時に風を見込み、飛行中に修正する（第 12 章）。'],
    },
    {
      id: 't8', no: 8, title: '2 地点の目視航法', en: 'Two-point visual navigation', chapter: 12, limit: 900,
      brief: '架空訓練点 LAB-A、続いて LAB-B へ飛ぶ。外の景色の目印（色付きの塔）と MFD の地図・DTK・距離・ETE を照らし合わせる。高度 2,500 ft を保つ。',
      setup: L => { const [n, e] = onLeg('LABRW', 'LABEA', 0.25), dtk = legDtk('LABRW', 'LABEA');
        return { where: 'air', n, e, altFt: 2500, hdgMag: dtk, kias: 100, wind: byLevel(L, wind(0, 0), wind(300, 8), wind(300, 12, 3)), fpl: ['LABRW', 'LABEA', 'LABEB'], cdi: 'GPS', hdgBug: Math.round(dtk), altSel: 2500 }; },
      stages: [
        { label: 'LAB-A（架空点）へ', items: (c, L) => [altItem(c, 2500, L.alt), iasItem(c, 100, L.spd + 5), flag('LAB-A までの距離', distNm(c, 'LABEA') <= L.reachNm, `${distNm(c, 'LABEA').toFixed(2)} NM`, `${L.reachNm} NM 以内で通過`)],
          reach: (c, L) => distNm(c, 'LABEA') <= L.reachNm, hold: () => 0, progressNm: 'LABEA',
          done: c => { c.av.fpl.active = 2; c.av.direct = null; } },
        { label: 'LAB-B（架空点）へ', items: (c, L) => [altItem(c, 2500, L.alt), iasItem(c, 100, L.spd + 5), flag('LAB-B までの距離', distNm(c, 'LABEB') <= L.reachNm, `${distNm(c, 'LABEB').toFixed(2)} NM`, `${L.reachNm} NM 以内で通過`)],
          reach: (c, L) => distNm(c, 'LABEB') <= L.reachNm, hold: L => Math.max(5, L.hold / 2), progressNm: 'LABEB' },
      ],
      hints: ['MFD の DTK（希望航路）と TRK を合わせると点に向かう。', '前方の塔（LAB-A は橙、LAB-B は緑）を見つけて、地図の位置と照らし合わせる。', '残り距離 DIS と ETE から到着時刻を見積もる習慣を。', 'LAB-A を過ぎたら区間は自動で LAB-B へ切り替わる（教材の簡略化）。'],
      points: ['地図・コンパス・時計で現在地を確かめる（目視航法の基本）。GPS は確認に使う。', '現在地を見失ったら、高度・針路を保ち、目立つ目標を探し、必要なら管制に助けを求める（第 14 章）。'],
    },
    {
      id: 't9', no: 9, title: '目的地変更と再計算', en: 'Diversion and recalculation', chapter: 12, limit: 900,
      brief: 'LAB-A へ向かう途中で「前方の天候悪化」を想定し、目的地を LAB-F（架空）に変更する。地図から針路・距離・所要時間を先に見積もり、D→ で確かめてから飛ぶ。',
      setup: L => { const [n, e] = onLeg('LABRW', 'LABEA', 0.4), dtk = legDtk('LABRW', 'LABEA');
        return { where: 'air', n, e, altFt: 2500, hdgMag: dtk, kias: 100, wind: byLevel(L, wind(0, 0), wind(300, 8), wind(300, 12, 3)), fpl: ['LABRW', 'LABEA', 'LABEB'], cdi: 'GPS', hdgBug: Math.round(dtk), altSel: 2500 }; },
      stages: [
        { label: '現在の区間（→ LAB-A）を保つ', items: (c, L) => [xtkItem(c, L.xtk * 2), altItem(c, 2500, L.alt), iasItem(c, 100, L.spd + 5)], hold: L => Math.max(5, L.hold / 2) },
        { label: '目的地変更：LAB-F への針路・距離・時間を見積もって入力', msg: '想定：前方の天候が悪化。目的地を LAB-F（架空）に変更します。まず地図で見積もってください（D→ はまだ使わない）。',
          items: (c, L, run) => estItems(run, L), reach: (c, L, run) => !!run.estimate && run.estimate.t >= run.stageT0, hold: () => 0 },
        { label: 'D→ LAB-F を設定して見積もりを確かめる', items: (c, L) => [altItem(c, 2500, L.alt)], reach: c => c.av.direct === 'LABEF', hold: () => 0 },
        { label: 'LAB-F へ直行', items: (c, L) => [xtkItem(c, L.xtk * 2), altItem(c, 2500, L.alt), flag('LAB-F までの距離', distNm(c, 'LABEF') <= L.reachNm, `${distNm(c, 'LABEF').toFixed(2)} NM`, `${L.reachNm} NM 以内`)],
          reach: (c, L) => distNm(c, 'LABEF') <= L.reachNm, hold: L => Math.max(5, L.hold / 2), progressNm: 'LABEF' },
      ],
      hints: ['針路は地図上の方向（真方位）に磁気偏差（教材値 6°W）を足して磁方位にする。', '距離は MFD のレンジ環（RNG の半分の輪）で測る。所要時間 = 距離 ÷ 対地速度 × 60（分）。', '先に旋回して大体の方向へ向け、見積もりは飛びながらでよい（Aviate → Navigate）。', 'D→ は MFD の D→ ボタン。'],
      points: ['目的地変更は「まず向きを変える → 見積もる → 確かめる → 伝える」。', '燃料・天候・日没など、変更の判断材料を早めに集める（第 14 章）。'],
    },
    {
      id: 't10', no: 10, title: 'フード下の計器走査', en: 'Instrument scan under the hood', chapter: 13, limit: 600, hood: true,
      brief: '外が見えない状態（フード）で、計器だけで直進水平を保ち、標準旋回（約 15°）で HDG 090 へ向けて直進に戻る。姿勢指示器を中心に、高度・速度・針路へ視線を回す（放射状走査）。',
      setup: L => ({ where: 'air', n: 4000, e: -44000, altFt: 3000, hdgMag: 360, kias: 100, hood: true, wind: byLevel(L, wind(250, 5, 1), wind(250, 10, 3), wind(250, 12, 6)), hdgBug: 90, altSel: 3000 }),
      stages: [
        { label: '計器だけで直進水平', items: (c, L) => [altItem(c, 3000, L.alt), hdgItem(c, 360, L.hdg), iasItem(c, 100, L.spd)], hold: L => Math.round(L.hold * 1.5) },
        { label: '標準旋回（右バンク約 15°）、高度を保つ', items: (c, L) => [bankItem(c, 15, L.bank), altItem(c, 3000, L.alt)], hold: L => L.turnHold },
        { label: 'HDG 090 でロールアウトし直進水平', items: (c, L) => [hdgItem(c, 90, L.hdg), wingsLevel(c, 5), altItem(c, 3000, L.alt)], hold: L => L.hold },
      ],
      hints: ['姿勢指示器 → 高度計 → 姿勢指示器 → 速度計 → 姿勢指示器 → 針路…と、中心に戻りながら回す。', '一つの計器を見つめ続けない（Fixation）。', '体の感覚は傾きを誤ることがある（空間識失調）。計器を信じる。', '標準旋回の目安：バンク ≈ 速度 kt ÷ 10 + 7（100 kt なら約 17°、概算）。'],
      points: ['走査・解釈・操作の繰り返し（Scan → Interpret → Control）。', 'フードは計器飛行の練習用の考え方を示す教材表示で、実機の視界制限具とは異なる。'],
    },
    {
      id: 't11', no: 11, title: '計器による高度・針路変更', en: 'Altitude and heading change on instruments', chapter: 13, limit: 600,
      brief: '高度計規正値（BARO）を 30.12 inHg に合わせ、ALT SEL と HDG バグを目標にセットしてから、計器を見て 4,000 ft・HDG 090 へ上昇右旋回する。自動操縦はない：バグは目標の目印。',
      setup: L => ({ where: 'air', n: 4000, e: -44000, altFt: 3000, hdgMag: 360, kias: 100, qnh: 30.12, baro: 29.92, hood: L.id !== 'intro', wind: byLevel(L, wind(0, 0), wind(240, 8), wind(240, 12, 4)), hdgBug: 360, altSel: 3000 }),
      stages: [
        { label: 'BARO を 30.12 に設定（"Altimeter three zero one two"）', msg: '情報：Altimeter three zero one two（高度計規正値 30.12 inHg）。PFD の BARO つまみで合わせてください。',
          items: c => [flag('BARO', Math.abs(c.av.baro - 30.12) < 0.005, `${c.av.baro.toFixed(2)} IN`, '30.12 IN')], reach: c => Math.abs(c.av.baro - 30.12) < 0.005, hold: () => 0 },
        { label: 'ALT SEL 4,000・HDG バグ 090 をセット', items: c => [flag('ALT SEL', c.av.altSel === 4000, `${c.av.altSel}`, '4000'), flag('HDG バグ', c.av.hdgBug === 90, AV().hdgFmt(c.av.hdgBug), '090')],
          reach: c => c.av.altSel === 4000 && c.av.hdgBug === 90, hold: () => 0 },
        { label: '上昇右旋回して 4,000 ft・HDG 090 で直進水平', items: (c, L) => [altItem(c, 4000, L.alt), hdgItem(c, 90, L.hdg), wingsLevel(c, 5), iasItem(c, 97, L.spd + 3)], hold: L => L.hold },
      ],
      hints: ['BARO が実際より低いと、高度計は実際より低く表示する（設定差 0.01 inHg ≈ 10 ft、教材近似）。', '上昇と旋回を同時にするときもバンクは 20° 以内に。', 'ALT SEL の手前 50〜100 ft から水平移行を始める。', '目標値は口に出して確認する（"Four thousand, heading zero niner zero"）。'],
      points: ['規正値の設定は高度の基準そのもの。設定後に滑走路標高などで確かめる（実機は手順に従う）。', '"Altitude, heading" のように、変更前に目標をセットしてから操作する習慣。'],
    },
    {
      id: 't12', no: 12, title: 'エンジン停止時の滑空', en: 'Engine failure: glide to the runway', chapter: 14, limit: 600, engineOut: true,
      brief: '飛行中のエンジン停止を想定する（教材の想定、再始動は未実装）。まず最良滑空速度（教材値 76 kt）を作り、LAB RWY 36 へ滑空して接地・停止する。Aviate → Navigate → Communicate の順。',
      setup: L => ({ where: 'air', rwyAlong: -byLevel(L, 4500, 6000, 7500), rwyCross: byLevel(L, 0, 700, 1400), altFt: byLevel(L, 2000, 2500, 3000), hdgMag: 360, kias: 100, engineFailAt: byLevel(L, 4, 6, 8),
        wind: byLevel(L, wind(0, 0), wind(330, 6), wind(300, 10, 3)), cdi: 'NAV1', nav1: 109900, hdgBug: 360, altSel: 2000 }),
      stages: [
        { label: 'エンジン停止：76 kt の滑空姿勢を作る', fail: c => (c.s.onGround ? '滑空の準備ができる前に接地しました' : null), items: (c, L) => [iasItem(c, V().glide, L.spd), noStall(c)], reach: c => !c.s.engine.running, hold: L => Math.max(5, L.hold / 2) },
        { label: '滑走路へ向けて滑空（速度を保つ）', soft: true, items: (c, L) => [iasItem(c, V().glide, L.spd + 4), noStall(c)], reach: c => c.o.agl < 300 || c.s.onGround, hold: () => 0 },
        { label: '接地：滑走路上に', gate: true,
          items: (c, L) => (c.s.td ? tdItems(c.s.td, L, Math.max(L.sink, 450)).slice(0, 3) : [wingsLevel(c, 10), noStall(c)]),
          reach: c => !!c.s.td, hold: () => 0 },
        { label: '停止', items: c => [flag('滑走路上', c.o.onRunway, c.o.onRunway ? '滑走路上' : '滑走路外', '舗装面から出ない')], reach: c => c.s.onGround && c.o.gs < 3, hold: () => 0, gate: true },
      ],
      hints: ['停止したら最初に機首を下げて 76 kt（滑空速度）を作る。速度が最優先。', '滑走路が遠すぎないか、高度と距離で判断（この教材機は約 10:1、1,000 ft で約 1.6 NM）。', '高すぎるならフラップで降下角を増やす。低すぎるならフラップを出さない。', '実機では緊急時の手順（チェックリスト・管制への通報）が POH・教官の指示で定められている。'],
      points: ['優先順位：Aviate（飛ばす）→ Navigate（どこへ）→ Communicate（伝える）。', '再始動の手順や不時着場の選び方は機体と地域で異なる。本教材は滑空の感覚づくりに限る。'],
    },
  ];
  const task = id => TASKS.find(t => t.id === id);

  // the diversion estimate (task t9): what the pilot entered, compared with the truth computed when it was entered
  function estimateTruth(s, av, id = 'LABEF') {
    const w = AV().wpt(id), pos = { n: s.pos[0], e: s.pos[1] }, varW = P().MAGVAR_W;
    const dist = AV().neDistNm(pos, w), brg = AV().trueToMag(AV().neBearing(pos, w), varW), gs = Math.max(60, fin(s.out.gs, 100));
    return { brg: Math.round(brg), dist: +dist.toFixed(1), eteMin: +(dist / gs * 60).toFixed(1) };
  }
  function submitEstimate(run, s, av, input) {
    const truth = estimateTruth(s, av);
    run.estimate = { hdg: fin(+input.hdg, NaN), dist: fin(+input.dist, NaN), eteMin: fin(+input.eteMin, NaN), t: run.t, truth };
    run.estimates = (run.estimates || 0) + 1;
    return run.estimate;
  }
  function estItems(run, L) {
    const e = run.estimate;
    if (!e || e.t < run.stageT0) return [flag('見積もり', false, '未入力', '針路・距離・時間を入力')];
    const dh = AV().hdgDiff(e.truth.brg, e.hdg), dd = (e.dist - e.truth.dist) / Math.max(0.1, e.truth.dist) * 100, de = (e.eteMin - e.truth.eteMin) / Math.max(0.1, e.truth.eteMin) * 100;
    return [
      { label: '針路（磁方位）', ok: Number.isFinite(dh) && Math.abs(dh) <= L.est.hdg, val: `${Number.isFinite(e.hdg) ? Math.round(e.hdg) : '—'}°（正解 ${e.truth.brg}°）`, target: `±${L.est.hdg}°`, dev: fin(dh), tol: L.est.hdg, unit: '°' },
      { label: '距離', ok: Number.isFinite(dd) && Math.abs(dd) <= L.est.pct, val: `${Number.isFinite(e.dist) ? e.dist : '—'} NM（正解 ${e.truth.dist}）`, target: `±${L.est.pct}%`, dev: fin(dd), tol: L.est.pct, unit: '%' },
      { label: '所要時間 ETE', ok: Number.isFinite(de) && Math.abs(de) <= L.est.pct, val: `${Number.isFinite(e.eteMin) ? e.eteMin : '—'} 分（正解 ${e.truth.eteMin}）`, target: `±${L.est.pct}%`, dev: fin(de), tol: L.est.pct, unit: '%' },
    ];
  }

  // ---------------------------------------------------------------- starting a task
  // returns a fresh physics state and avionics set up as the task asks
  function applySetup(spec, opt = {}) {
    const ph = P(), av = AV().createAvionics(), s = ph.newState({ seed: opt.seed || 7 });
    const varW = ph.MAGVAR_W;
    s.wind = { fromDeg: spec.wind ? spec.wind.fromDeg : 0, kt: spec.wind ? spec.wind.kt : 0, gust: spec.wind ? spec.wind.gust || 0 : 0 };
    s.qnh = spec.qnh || 29.92;
    if (spec.where === 'runway') ph.placeOnRunway(s, ph.LAB_RWY, spec.along || 30);
    else if (spec.where === 'final') {
      const R = ph.LAB_RWY, [n, e] = rwyPt(spec.along, spec.cross || 0), gam = (spec.glideDeg || 3) * ph.DEG;
      const altFt = R.elevFt + (300 - spec.along) * Math.tan(gam) * ph.FT;
      ph.placeInAir(s, n, e, altFt, R.trueHdg, spec.kias, spec.flap || 0);
      // on the glide path: descending at the path angle, the power for that descent
      const Vt = s.out.tas / ph.KT, rho = ph.isa(altFt / ph.FT).rho, w = ph.windNED(s), h = s.eul[2];
      const tr = ph.trimFor(s, Vt, altFt), Treq = tr.D - s.A.mass * ph.G * Math.sin(gam);
      let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (ph.thrustAt(s, Vt, rho, m) < Treq) lo = m; else hi = m; }
      s.ctl.thr = (lo + hi) / 2; s.eul[1] = tr.alpha - gam;
      s.vel = [Vt * Math.cos(gam) * Math.cos(h) + w[0], Vt * Math.cos(gam) * Math.sin(h) + w[1], Vt * Math.sin(gam)];
      ph.derive(s);
    } else {
      let n = spec.n, e = spec.e;
      if (spec.rwyAlong != null) [n, e] = rwyPt(spec.rwyAlong, spec.rwyCross || 0);
      ph.placeInAir(s, n, e, spec.altFt, AV().magToTrue(spec.hdgMag, varW), spec.kias, spec.flap || 0);
    }
    if (spec.fpl) { av.fpl = { wps: spec.fpl.slice(), active: 1 }; }
    if (spec.cdi) av.cdi = spec.cdi;
    if (spec.nav1) { av.nav1.act = spec.nav1; }
    if (spec.hdgBug != null) av.hdgBug = spec.hdgBug || 360;
    if (spec.altSel != null) av.altSel = spec.altSel;
    av.baro = spec.baro != null ? spec.baro : s.qnh;
    if (spec.where === 'final' || spec.cdi === 'NAV1') av.crs = 360;
    return { s, av };
  }
  function startTask(taskId, levelId = 'intro', mode = 'staged', opt = {}) {
    const T = task(taskId); if (!T) throw new Error('unknown task ' + taskId);
    const L = level(levelId), spec = T.setup(L);
    const { s, av } = applySetup(spec, opt);
    const run = {
      taskId: T.id, levelId: L.id, mode: mode === 'free' ? 'free' : 'staged', spec, t: 0, stage: 0, held: 0, inCond: 0, stageT0: 0, entered: -1,
      done: false, result: null, reason: '', items: [], need: 0, msg: '', events: [], evIdx: 0, hist: { alt: [], ias: [] }, nextSample: 0,
      stats: T.stages.map(st => ({ label: st.label, done: false, resets: 0, t: 0, worst: {} })), estimate: null, estimates: 0, d0: null,
    };
    return { s, av, run, task: T, level: L };
  }

  // ---------------------------------------------------------------- the context the conditions read
  function makeCtx(s, av) {
    const ph = P(), A = AV(), varW = ph.MAGVAR_W, o = s.out;
    const nav = A.navSolve(av, { n: s.pos[0], e: s.pos[1] }, o, varW, ph.LAB_RWY);
    return { s, o, av, nav, varW, indAlt: A.indicatedAlt(o.altTrue, s.qnh, av.baro), hdgMag: A.trueToMag(o.hdgTrue, varW), trkMag: A.trueToMag(o.trk, varW) };
  }

  // ---------------------------------------------------------------- one evaluation step
  const KEEP_EVENTS = ['touchdown', 'hard_landing', 'crash', 'off_runway_touchdown', 'tail_strike', 'runway_excursion', 'engine_stop'];
  function update(run, c, dt) {
    if (run.done) return run;
    const T = task(run.taskId), L = level(run.levelId), s = c.s;
    run.t += dt;
    // the planned engine failure (task 12)
    if (run.spec.engineFailAt != null && run.t >= run.spec.engineFailAt && !s.engine.failed) s.engine.failed = true;
    // histories (every 2 s), events from the physics
    if (run.t >= run.nextSample) { run.hist.alt.push(r0(c.indAlt)); run.hist.ias.push(r0(c.o.ias)); run.nextSample += 2; }
    while (run.evIdx < s.events.length) {
      const e = s.events[run.evIdx++];
      if (KEEP_EVENTS.includes(e.type)) run.events.push(cleanEvent(e, run.t));
    }
    // things that end any task
    if (s.crashed) return finish(run, 'fail', s.crashReason || '機体損傷');
    if (!s.engine.running && !T.engineOut && !run.spec.engineFailAt) return finish(run, 'fail', '想定外のエンジン停止（燃料など）');
    if (run.mode === 'free') { run.items = []; return run; }
    if (run.events.some(e => e.type === 'runway_excursion')) return finish(run, 'fail', '滑走路逸脱：舗装面の外へ出ました');
    if (run.t > T.limit) return finish(run, 'fail', `制限時間（${T.limit} 秒）を超えました`);
    // the current stage
    const st = T.stages[run.stage], S = run.stats[run.stage];
    if (run.entered !== run.stage) {
      run.entered = run.stage; run.stageT0 = run.t - dt; run.stageS0 = s.t - dt; run.held = 0; run.msg = st.msg || '';
      run.d0 = st.progressNm ? distNm(c, st.progressNm) : null;
      if (st.enter) st.enter(c, run, L);
    }
    const items = st.items(c, L, run), ok = items.every(i => i.ok);
    for (const it of items) if (it.tol) { const k = Math.abs(fin(it.dev)) / it.tol, w = S.worst[it.label]; if (!w || k > w.k) S.worst[it.label] = { k, dev: fin(it.dev), tol: it.tol, unit: it.unit }; }
    if (ok) { run.held += dt; run.inCond += dt; } else { if (run.held > 0.5) S.resets++; run.held = 0; }
    run.items = items; run.need = st.hold ? st.hold(L) : 0;
    const reached = st.reach ? !!st.reach(c, L, run) : true;
    const why = st.fail ? st.fail(c, L, run) : null;
    if (why) return finish(run, 'fail', why);
    if (reached && st.gate && !ok) {
      const bad = items.filter(i => !i.ok).map(i => `${i.label}（${i.val}／基準 ${i.target}）`).join('、');
      return finish(run, 'fail', `${st.label} — 条件外：${bad}`);
    }
    if (reached && (st.soft || (ok && run.held >= run.need))) {
      S.done = true; S.t = +(run.t - run.stageT0).toFixed(1);
      run.events.push({ t: +run.t.toFixed(1), type: 'stage_done', stage: run.stage + 1 });
      if (st.done) st.done(c, run, L);
      run.stage++; run.held = 0;
      if (run.stage >= T.stages.length) return finish(run, 'success', '全段階を完了');
    }
    return run;
  }
  function finish(run, result, reason) {
    run.done = true; run.result = result; run.reason = reason;
    run.events.push({ t: +run.t.toFixed(1), type: 'task_end', result });
    return run;
  }
  function cleanEvent(e, t) {
    const out = { t: +fin(t).toFixed(1), type: String(e.type) };
    for (const k of ['fpm', 'kias', 'pitch', 'bank', 'along', 'cross', 'onRunway', 'noseFirst', 'why']) if (e[k] != null) out[k] = typeof e[k] === 'string' ? e[k].slice(0, 80) : e[k];
    return out;
  }
  // progress 0..1: finished stages plus the hold timer (or the distance) of the current one
  function progress(run, c) {
    const T = task(run.taskId), n = T.stages.length;
    if (run.result === 'success') return 1;
    if (run.mode === 'free') return 0;
    const st = T.stages[run.stage]; if (!st) return run.stage / n;
    let f = run.need > 0 ? Math.min(1, run.held / run.need) : 0;
    if (st.progressNm && c && run.d0) f = Math.max(f * 0.3, clamp(1 - distNm(c, st.progressNm) / run.d0, 0, 1) * 0.9);
    return clamp((run.stage + f) / n, 0, 1);
  }
  function visibleHints(T, L) { return T.hints.slice(0, Math.min(T.hints.length, L.hintCount)); }

  // ---------------------------------------------------------------- the debrief
  function debrief(run, s) {
    const T = task(run.taskId), L = level(run.levelId), out = [];
    if (run.mode === 'free') out.push({ kind: 'info', text: `自由練習（評価なし）：${T.title}／練習時間 ${r0(run.t)} 秒（シミュレータ上の時間）` });
    else if (run.result === 'success') out.push({ kind: 'good', text: `達成：${T.title}（${L.name}）全 ${T.stages.length} 段階を完了。条件内の時間 ${r0(run.inCond)} 秒／練習時間 ${r0(run.t)} 秒。` });
    else out.push({ kind: 'warn', text: `未達成：${run.reason || '中断'}（${run.stage}/${T.stages.length} 段階まで）` });
    if (run.mode !== 'free') run.stats.forEach((S, i) => {
      if (i > run.stage) return;
      const worst = Object.entries(S.worst).sort((a, b) => b[1].k - a[1].k)[0];
      let t = `段階 ${i + 1}「${S.label}」：${S.done ? `完了（${S.t} 秒）` : '途中'}`;
      if (S.resets) t += `、条件外れによるリセット ${S.resets} 回`;
      if (worst && worst[1].k > 0) t += `、最大のずれ：${worst[0]} ${fmtDev(worst[1])}（許容 ${worst[1].tol} ${worst[1].unit || ''}）`;
      out.push({ kind: S.done && !S.resets ? 'good' : 'info', text: t });
    });
    const td = s && s.td;
    if (td) out.push({ kind: td.fpm > 600 ? 'warn' : 'info', text: `接地記録：降下率 ${td.fpm} fpm、速度 ${td.kias} kt、ピッチ ${td.pitch}°、バンク ${td.bank}°、中心線から ${Math.abs(td.cross)} m ${td.cross >= 0 ? '右' : '左'}、進入端から ${td.along} m、${td.onRunway ? '滑走路上' : '滑走路外'}${td.noseFirst ? '、前輪から接地' : ''}` });
    for (const e of run.events) {
      if (e.type === 'hard_landing') out.push({ kind: 'warn', text: `ハードランディング（${e.fpm} fpm、教材基準 600 fpm 超）` });
      if (e.type === 'runway_excursion') out.push({ kind: 'warn', text: '滑走路逸脱：舗装面の外へ出ました' });
      if (e.type === 'tail_strike') out.push({ kind: 'warn', text: '尾部接触（テールストライク）：機首の上げすぎ' });
      if (e.type === 'off_runway_touchdown') out.push({ kind: 'warn', text: '滑走路外に接地しました' });
    }
    if (run.estimates) out.push({ kind: 'info', text: `見積もりの入力 ${run.estimates} 回` });
    for (const p of T.points) out.push({ kind: 'point', text: p });
    out.push({ kind: 'info', text: '評価は本シミュレータの教材基準によるもので、技能や資格の証明ではありません。' });
    return out;
  }
  function fmtDev(w) { const v = Math.abs(w.dev); return `${w.unit === 'NM' ? v.toFixed(2) : w.unit === 'm' ? v.toFixed(1) : Math.round(v)} ${w.unit || ''}`; }

  // ---------------------------------------------------------------- the learning record (localStorage + JSON)
  const STORE_KEY = 'flightlab-records-v1', PROG_KEY = 'flightlab-progress-v1', MAX_RECORDS = 300;
  const RECORD_NOTE = '本記録は教材シミュレータの練習記録です。正式な飛行日誌（logbook）ではなく、飛行時間として扱えません。';
  // anything that looks like a key or a token is removed from free text before it is saved or exported
  const SECRET_RES = [/AIza[0-9A-Za-z_\-]{20,}/g, /sk-[A-Za-z0-9_\-]{16,}/g, /ya29\.[0-9A-Za-z_\-]+/g, /(key|token|session)\s*[=:]\s*[^\s&"']{8,}/gi];
  function scrub(str, max = 2000) {
    let t = String(str == null ? '' : str).slice(0, max);
    for (const re of SECRET_RES) t = t.replace(re, '[削除：キー・トークンらしき文字列]');
    return t;
  }
  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  const numArr = (a, max = 600) => (Array.isArray(a) ? a.filter(isNum).slice(0, max).map(v => Math.round(v)) : []);
  function downsample(a, max = 300) { if (a.length <= max) return a.slice(); const out = [], k = a.length / max; for (let i = 0; i < max; i++) out.push(a[Math.floor(i * k)]); return out; }
  function recordFromRun(run, s, memo = '') {
    const T = task(run.taskId), L = level(run.levelId);
    return sanitizeRecord({
      v: 1, id: 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
      taskId: T.id, taskTitle: T.title, level: L.id, levelName: L.name, mode: run.mode, datetime: new Date().toISOString(),
      result: run.mode === 'free' ? 'free' : (run.result || 'abort'), reason: run.reason || (run.done ? '' : '途中で終了'),
      achievementPct: Math.round(progress(run) * 100), inCondSec: Math.round(run.inCond), practiceSec: Math.round(run.t),
      stages: run.stats.map(S => ({ label: S.label, done: S.done, resets: S.resets, t: S.t })),
      sampleSec: 2 * Math.max(1, Math.ceil(run.hist.alt.length / 300)), altHist: downsample(run.hist.alt), spdHist: downsample(run.hist.ias),
      events: run.events.slice(0, 60), td: s && s.td ? cleanEvent(s.td, s.td.t) : null, memo, note: RECORD_NOTE,
    });
  }
  // the record keeps only these fields, each checked; nothing else survives (no keys, tokens, map data, personal data)
  function sanitizeRecord(r) {
    if (!r || typeof r !== 'object') return null;
    const tid = String(r.taskId || ''); if (!task(tid)) return null;
    const ev = Array.isArray(r.events) ? r.events.slice(0, 60).map(e => (e && typeof e === 'object' ? cleanEvent(e, e.t) : null)).filter(Boolean) : [];
    const stages = Array.isArray(r.stages) ? r.stages.slice(0, 10).map(S => ({ label: scrub(S && S.label, 80), done: !!(S && S.done), resets: isNum(S && S.resets) ? S.resets : 0, t: isNum(S && S.t) ? S.t : 0 })) : [];
    return {
      v: 1, id: scrub(r.id, 40).replace(/[^A-Za-z0-9_\-]/g, '') || 'r' + Math.random().toString(36).slice(2),
      taskId: tid, taskTitle: task(tid).title, level: level(r.level).id, levelName: level(r.level).name,
      mode: r.mode === 'free' ? 'free' : 'staged', datetime: isNaN(Date.parse(r.datetime)) ? new Date(0).toISOString() : new Date(Date.parse(r.datetime)).toISOString(),
      result: ['success', 'fail', 'abort', 'free'].includes(r.result) ? r.result : 'abort', reason: scrub(r.reason, 300),
      achievementPct: isNum(r.achievementPct) ? clamp(Math.round(r.achievementPct), 0, 100) : 0,
      inCondSec: isNum(r.inCondSec) ? Math.max(0, Math.round(r.inCondSec)) : 0, practiceSec: isNum(r.practiceSec) ? Math.max(0, Math.round(r.practiceSec)) : 0,
      stages, sampleSec: isNum(r.sampleSec) ? clamp(r.sampleSec, 1, 60) : 2, altHist: numArr(r.altHist, 300), spdHist: numArr(r.spdHist, 300),
      events: ev, td: r.td && typeof r.td === 'object' ? cleanEvent(r.td, r.td.t) : null, memo: scrub(r.memo, 2000), note: RECORD_NOTE,
    };
  }
  function sanitizeProgress(p) {
    const out = { quiz: {}, read: [], atc: {} };
    if (!p || typeof p !== 'object') return out;
    if (p.quiz && typeof p.quiz === 'object') for (const [k, v] of Object.entries(p.quiz)) { if (/^\d{1,2}$/.test(k) && Array.isArray(v)) out.quiz[k] = v.slice(0, 4).map(x => (x === true || x === false ? x : null)); }
    if (Array.isArray(p.read)) out.read = [...new Set(p.read.filter(n => Number.isInteger(n) && n >= 1 && n <= 40))];
    if (p.atc && typeof p.atc === 'object') for (const [k, v] of Object.entries(p.atc)) { if (/^[a-z0-9_]{1,20}$/.test(k)) out.atc[k] = v === true; }
    return out;
  }
  function safeGet(st, k) { try { return st ? st.getItem(k) : null; } catch (e) { return null; } }
  function safeSet(st, k, v) { try { if (st) st.setItem(k, v); return true; } catch (e) { return false; } }
  function loadRecords(st) { try { const a = JSON.parse(safeGet(st, STORE_KEY) || '[]'); return Array.isArray(a) ? a.map(sanitizeRecord).filter(Boolean) : []; } catch (e) { return []; } }
  function saveRecords(st, recs) { return safeSet(st, STORE_KEY, JSON.stringify(recs.map(sanitizeRecord).filter(Boolean).slice(-MAX_RECORDS))); }
  function addRecord(st, rec) { const a = loadRecords(st), r = sanitizeRecord(rec); if (r) a.push(r); saveRecords(st, a); return r; }
  function deleteRecord(st, id) { saveRecords(st, loadRecords(st).filter(r => r.id !== id)); }
  function loadProgress(st) { try { return sanitizeProgress(JSON.parse(safeGet(st, PROG_KEY) || '{}')); } catch (e) { return sanitizeProgress({}); } }
  function saveProgress(st, p) { return safeSet(st, PROG_KEY, JSON.stringify(sanitizeProgress(p))); }
  function exportJSON(records, prog) {
    return JSON.stringify({ app: 'FLIGHT LAB', kind: 'learning-record', version: 1, exported: new Date().toISOString(), note: RECORD_NOTE,
      records: (records || []).map(sanitizeRecord).filter(Boolean), progress: sanitizeProgress(prog) }, null, 1);
  }
  function importJSON(text) {
    let j; try { j = JSON.parse(String(text)); } catch (e) { throw new Error('JSON として読めません'); }
    if (!j || j.app !== 'FLIGHT LAB' || j.kind !== 'learning-record') throw new Error('FLIGHT LAB の学習記録ファイルではありません');
    return { records: (Array.isArray(j.records) ? j.records : []).map(sanitizeRecord).filter(Boolean), progress: sanitizeProgress(j.progress) };
  }
  function mergeRecords(a, b) { const m = new Map(); for (const r of [...a, ...b]) if (r) m.set(r.id, r); return [...m.values()].sort((x, y) => x.datetime.localeCompare(y.datetime)).slice(-MAX_RECORDS); }
  function mergeProgress(a, b) {
    const A = sanitizeProgress(a), B = sanitizeProgress(b);
    const quiz = { ...A.quiz }; for (const [k, v] of Object.entries(B.quiz)) quiz[k] = (quiz[k] || []).map((x, i) => x || v[i] || x).concat(v.slice((quiz[k] || []).length));
    return sanitizeProgress({ quiz, read: [...A.read, ...B.read], atc: { ...A.atc, ...B.atc } });
  }

  FL.training = { LEVELS, level, TASKS, task, startTask, applySetup, makeCtx, update, progress, visibleHints, debrief, estimateTruth, submitEstimate,
    STORE_KEY, PROG_KEY, RECORD_NOTE, scrub, recordFromRun, sanitizeRecord, sanitizeProgress, loadRecords, saveRecords, addRecord, deleteRecord,
    loadProgress, saveProgress, exportJSON, importJSON, mergeRecords, mergeProgress };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
