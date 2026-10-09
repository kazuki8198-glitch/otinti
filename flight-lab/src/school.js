// FLIGHT LAB — school.js
// The flight school engine, carried over from 空島フライト's school: a lesson is a list of steps; each step says what
// to do (the instructor's words), gives the starting attitude and power as a guide computed from the flight model's own
// equations ("pitch + power = performance", the way a real instructor quotes them), watches target values with
// tolerances, gives hints as a real instructor would (which control fixes which deviation in this phase of flight),
// and grades: the share of time inside the tolerance and the largest deviation, plus the step's own checks (the
// touchdown, the altitude lost in a stall recovery, the time to full power...). FLIGHT LAB adds three levels
// (導入 / 基礎 / 精度) that scale the tolerances and the continuous hold: a step with `hold` is done only after every
// target stays inside its tolerance for that many seconds IN A ROW (the hold timer resets to 0 when any target leaves it).
// Also here: checklists, the ATC read-back questions, the practice record (sanitised: never keys, tokens or personal data).
// Pure logic (no DOM): app.js draws it, the tests drive it with a scripted pilot.
(function (FL) {
  'use strict';
  const P = () => FL.physics, AV = () => FL.avionics;
  const DEG = Math.PI / 180;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const fin = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const w180 = a => ((a % 360) + 540) % 360 - 180;
  const w360 = a => ((a % 360) + 360) % 360;
  const r5 = x => Math.round(x / 5) * 5, r50 = x => Math.round(x / 50) * 50;

  // ---------------------------------------------------------------- the three levels
  // the tolerances written in the lessons are the BASIC level (based on the FAA Private Pilot ACS where it has one);
  // 導入 widens them, 精度 narrows them (an advanced teaching target, close to some Commercial / Instrument ACS items)
  const LEVELS = [
    { id: 'intro', name: '導入', en: 'Introduction', k: 1.5, holdK: 0.5, hints: true, guide: true, desc: '許容幅を基礎の 1.5 倍に広げ、連続保持の時間を半分に。目安（姿勢と出力）と教官のヒントをすべて表示。' },
    { id: 'basic', name: '基礎', en: 'Basic', k: 1.0, holdK: 1.0, hints: true, guide: true, desc: '許容幅は FAA 自家用操縦士 ACS（実地試験基準）を参考にした値。目安とヒントを表示。' },
    { id: 'precision', name: '精度', en: 'Precision', k: 0.6, holdK: 1.5, hints: false, guide: false, desc: '許容幅を基礎の 6 割に狭め、連続保持を 1.5 倍に。目安とヒントは出さない（事業用・計器飛行の水準を意識した教材用の上級目標）。' },
  ];
  const level = id => LEVELS.find(l => l.id === id) || LEVELS[0];

  // ---------------------------------------------------------------- the instructor's guide: attitude and power
  const pitchTxt = p => { const v = Math.round(p); return v === 0 ? 'ほぼ水平（0°）' : `機首${v > 0 ? '上げ' : '下げ'} 約 ${Math.abs(v)}°`; };
  const aiRef = p => {
    const a = Math.abs(p);
    if (a < 1.5) return 'PFD の姿勢表示で、黄色い機体記号を水平線（青と茶の境）に合わせる';
    return `PFD の姿勢表示で、黄色い機体記号を水平線の${p > 0 ? '上' : '下'}へ${a < 4 ? '少しだけ（目盛り 2.5° の 1 本分くらい）' : a < 7 ? '目盛り 2 本分（約 5°）' : a < 12 ? '目盛りの「10」の手前くらい' : '目盛りの「10」より先'}`;
  };
  function pwrTxt(ss, o, A) {
    if (o.pwr === 'dead') return A && A.twin ? '片方のエンジンが停止（もう片方は全開）' : 'エンジン停止（プロペラは風で回るだけ）';
    if (o.pwr === 'full') return `スロットル全開${ss.rpm ? `（約 ${r50(ss.rpm).toLocaleString()} rpm）` : ''}`;
    if (o.pwr === 'idle') return `スロットル アイドル${ss.rpm ? `（約 ${r50(ss.rpm).toLocaleString()} rpm）` : ''}`;
    return `スロットル 約 ${r5(ss.thr * 100)}%${ss.rpm && !(A && A.cs) ? `（約 ${r50(ss.rpm).toLocaleString()} rpm）` : ''}`;
  }
  const HOW = {
    climbFull: '速度が速ければ機首を 1〜2° 上げ、遅ければ下げる。出力は全開のまま（上昇中の速度は機首で合わせる）',
    level: '高度が 50 ft ずれたら機首を 1〜2° 動かして戻す。速度のずれはスロットル（R / F）で直し、落ち着いたらトリム（T）',
    rate: '昇降率のずれは出力で、速度のずれは機首で直す。目標高度の 10% 手前からレベルオフ',
    glide: '速度が速ければ機首を上げ、遅ければ下げる。出力で直せないので速度は機首だけで保つ',
    turn: '高度が下がり始めたら機首を少し上げる。沈みが止まらなければバンクを少し浅くしてから引く',
    approach: '進入角が深い（PAPI の白が多い）ならパワーを少し絞り、浅い（赤が多い）なら足す。速度のずれは機首で直す',
    slow: '低速では速度は機首、高度はパワー。高度が下がればパワーを足し、速度が落ちれば機首を下げる',
    pattern: 'このままでは低くなりそうならパワーを足し、高くなりそうなら絞る。速度のずれは機首で直す',
    ils: 'GS の菱形が下（自分が高い）ならパワーを少し絞り、上（低い）なら足す。CDI の針の方へ 2〜5° ずつ針路を直す。速度のずれは機首で',
    oei: '速度は機首で（青線 Vyse を割らない）。生きているエンジン側へ 2〜5° バンクし、ボールは生きている側へ半分。止まった側の足は踏まない（Dead foot, dead engine）',
  };
  // o: {kt, fpm, pwr: 'full' | 'idle' | 'dead', flaps, gear, bank, how, oei}
  function guideText(s, o, L) {
    const A = s.A, opt = Object.assign({ altFt: (L && L.alt0) || 3000, gear: !A.gear.fixed ? !!o.gear : true }, o);
    if (o.pwr === 'dead' && A.twin) { opt.pwr = 'full'; opt.oei = true; }
    const ss = P().steadyState(s, o.kt, o.fpm || 0, opt);
    if (!ss.ok) return `目安：この機体では全開でも ${o.kt} kt・${o.fpm} fpm は出せません。速度を優先してください。`;
    const how = HOW[o.how || 'level'];
    const rate = o.pwr ? `（昇降率 約 ${ss.fpm >= 0 ? '+' : ''}${r50(ss.fpm).toLocaleString()} fpm）` : '';
    const flapTxt = o.flaps ? `・フラップ ${A.flapLabels[o.flaps]}` : '';
    const gearTxt = !A.gear.fixed ? `・脚 ${o.gear ? 'DOWN' : 'UP'}` : '';
    return `目安：${pwrTxt(ss, o, A)}・${pitchTxt(ss.pitch)}${rate}${o.bank ? `・バンク ${o.bank}°` : ''}${flapTxt}${gearTxt}。${aiRef(ss.pitch)}。直し方：${how}。`;
  }
  function stepGuide(S, L) {
    if (!S || !S.g) return '';
    const g = typeof S.g === 'function' ? S.g(L) : S.g;
    if (typeof g === 'string') return g;
    let t = guideText(L.s, g, L);
    if (g.pp) t = t.replace(/。PFD の姿勢表示で[^。]*。/, '。PFD の姿勢表示は故障中：右下の予備の姿勢指示器と、高度・昇降率・航跡の変化で判断。');
    return t;
  }

  // ---------------------------------------------------------------- lesson helpers (used by syllabus.js)
  // target spec: [value or function of the lesson, tolerance at the BASIC level]
  const T_ALT = (tol = 100) => [L => L.alt0, tol], T_HDG = (tol = 10) => [L => L.hdg0, tol], T_SPD = (kt, tol = 10) => [kt, tol];
  function stepSL(name, kt, hold = 20, extra = {}) {
    return Object.assign({ name, g: { kt, how: 'level' }, say: `直線水平飛行：高度 {alt0} ft・針路 {hdg0}°・${kt} kt を保つ`, tgt: { alt: T_ALT(), hdg: T_HDG(), spd: T_SPD(kt) }, hold, max: 150, grade: true, gradeWhen: (c, L, st) => st.t > 4 }, extra);
  }
  function stepTurn(dir, bank, name, extra = {}) {
    const side = dir < 0 ? '左' : '右', kt = extra.kt || 100;
    return [
      Object.assign({ name, g: { kt, bank, how: 'turn' }, keys: 'A / D でバンク、S で少し引く、R でパワー少し', say: `${side}へバンク ${bank}° で 360° 旋回。高度 {alt0} ft を保つ（少し引いてパワーを足し、沈みを防ぐ）`,
        tgt: Object.assign({ alt: T_ALT(), abank: [bank, 5] }, extra.tgt || {}), gradeWhen: (c, L, st) => Math.abs(st.turned) > 25 && Math.abs(st.turned) < 330,
        until: (c, L, st) => Math.abs(st.turned) >= 345 - bank / 2, max: 150, grade: true,
        check: (c, L, st) => { if (Math.abs(st.turned) > 20 && Math.sign(st.turned) !== dir) st.note = '旋回方向が逆です'; } }),
      { name: `${name}：ロールアウト`, g: { kt, how: 'level' }, say: '開始時の針路 {hdg0}° で翼を水平に戻す（バンク角の半分くらい手前から戻し始める）', tgt: { hdg: T_HDG(), alt: T_ALT() }, until: (c, L, st) => Math.abs(c.bank) < 5 && st.t > 2, max: 20, grade: true, gradeFinal: true },
    ];
  }

  // ---------------------------------------------------------------- checklists (teaching versions; the POH / the school's checklist governs)
  const CHECKLISTS = {
    before_takeoff: { title: '離陸前点検（BEFORE TAKEOFF・教材の簡略版）', items: [
      ['ドア・シートベルト', '閉・着用'], ['操縦舵面', '自由・正しい向きに動く（W / S / A / D / Q / E で確認）'], ['計器（G1000 型）', 'PFD・MFD 異常なし、高度計規正（BARO）'],
      ['燃料セレクター', '燃料の多い側（教材では未実装）'], ['フラップ', 'UP（通常離陸）', s => s.flapIdx === 0], ['トリム', '離陸位置（Shift+T でリセット）', s => Math.abs(s.trim) < 0.05],
      ['スロットル', 'アイドル', s => s.thr < 0.1], ['離陸の計画', s => `Vr ${s.A.v.rotate}・Vy ${s.A.v.y}。浮揚前の異常は止まる、浮揚後のエンジン故障は正面へ`] ] },
    before_landing: { title: '着陸前点検（BEFORE LANDING・教材の簡略版）', items: [
      ['燃料セレクター', '燃料の多い側（教材では未実装）'], ['ミクスチャー', 'RICH（教材では未実装）'], ['フラップ', '進入に合わせて下げる（V キー）', s => s.flapIdx >= 1],
      ['進入速度', s => `${s.A.v.appr} kt（短距離 ${s.A.v.apprShort || s.A.v.appr - 5} kt）`], ['着陸許可', '受領・復唱'] ] },
    ms_before_takeoff: { title: '離陸前点検・双発（BEFORE TAKEOFF・教材の簡略版）', items: [
      ['ドア・シートベルト', '閉・着用'], ['操縦舵面', '自由・正しい向きに動く'], ['フラップ', 'UP', s => s.flapIdx === 0], ['トリム', '離陸位置（Shift+T）', s => Math.abs(s.trim) < 0.05],
      ['燃料・ミクスチャー・プロペラ', '両方 ON・前（教材では自動）'], ['スロットル', 'アイドル', s => s.thr < 0.1],
      ['離陸ブリーフィング', s => `Vr ${s.A.v.rotate}・Vyse ${s.A.v.yse}（青線）・Vmc ${s.A.v.mc}（赤線）。浮揚前の故障は止まる。浮揚後は Vyse・脚 UP・Identify → Verify → Feather`] ] },
    ms_before_landing: { title: '着陸前点検・双発（GUMPS）', items: [
      ['G：Gas（燃料）', '両方 ON（教材では自動）'], ['U：Undercarriage（脚）', 'DOWN・緑 3 つ（G キー）', s => s.gearDown && s.gearPos > 0.98], ['M：Mixture', 'RICH（教材では自動）'],
      ['P：Props', '前（教材では自動）'], ['S：Switches / Seatbelts', '着陸灯 ON・ベルト着用'] ] },
    ms_engine_failure: { title: '片発停止の記憶操作（教材の簡略版・機体の POH が優先）', items: [
      ['ピッチ', s => `機首を下げて Vyse ${s.A.v.yse} kt（青線）を保つ`], ['出力', 'ミクスチャー・プロペラ・スロットル 前（全開）'], ['外形', 'フラップ UP・脚 UP（G）', s => s.flapIdx === 0 && !s.gearDown],
      ['Identify（特定）', '踏んでいない足の側＝止まったエンジン（Dead foot, dead engine）'], ['Verify（確認）', '止まったと思う側のスロットルを絞っても何も変わらないこと'],
      ['Feather（フェザー）', '止まった側のプロペラをフェザー（[ ＝ 左・] ＝ 右）', s => s.eng.some(e => e.failed && e.feather)] ] },
  };

  // ---------------------------------------------------------------- ATC read-back questions (LAB Tower and LAB Approach are FICTIONAL)
  const ATC_Q = {
    takeoff: L => ({ msg: `LAB Tower: "${L.call}, wind ${L.windStr}, runway 36, cleared for takeoff."`,
      opts: [`Runway 36, cleared for takeoff, ${L.callShort}.`, `Roger, ${L.callShort}.`, 'Cleared for takeoff.'], ok: 0,
      why: '離陸許可は「滑走路番号＋cleared for takeoff＋コールサイン」を復唱します（AIM 4-4-7 など）。Roger だけでは不十分です。' }),
    landing: L => ({ msg: `LAB Tower: "${L.call}, runway 36, wind ${L.windStr}, cleared to land."`,
      opts: ['Wilco.', `Runway 36, cleared to land, ${L.callShort}.`, `Landing runway 18, ${L.callShort}.`], ok: 1,
      why: '着陸許可も滑走路番号を含めて復唱します。滑走路番号の取り違えは重大な誤り（滑走路誤進入の原因）です。' }),
    pattern: L => ({ msg: `LAB Tower: "${L.call}, enter left downwind runway 36, report midfield."`,
      opts: [`Left downwind 36, report midfield, ${L.callShort}.`, `Right downwind 36, ${L.callShort}.`, `Roger, will report, ${L.callShort}.`], ok: 0,
      why: '場周経路の入り方（左・右、どの辺）と、報告の地点を復唱します。左右の取り違えは他機との接近の原因です。' }),
    climb: L => ({ msg: `LAB Approach: "${L.call}, climb and maintain ${(L.alt0 + 1000).toLocaleString('en-US')}."`,
      opts: [`Climb and maintain ${(L.alt0 + 1000).toLocaleString('en-US')}, ${L.callShort}.`, `Climbing, ${L.callShort}.`, `Maintain ${L.alt0.toLocaleString('en-US')}, ${L.callShort}.`], ok: 0,
      why: '高度の指示は必ず数字で復唱します（AIM 4-4-7：高度・針路・速度の指示は復唱）。「Climbing」だけでは管制官が聞き違いに気づけません。' }),
    ils: L => ({ msg: `LAB Approach: "${L.call}, turn left heading 330, maintain 2,000 until established on the localizer, cleared ILS runway 36 approach."`,
      opts: [`Left 330, maintain 2,000 until established, cleared ILS runway 36, ${L.callShort}.`, `Cleared ILS, ${L.callShort}.`, `Right 330, cleared ILS runway 36, ${L.callShort}.`], ok: 0,
      why: '進入許可は「針路・ローカライザーに乗るまでの高度・進入の種類と滑走路」をすべて復唱します。旋回方向（left / right）も大切です。' }),
    divert: L => ({ msg: `LAB Approach: "${L.call}, roger, proceed direct LAB-F, maintain ${L.alt0.toLocaleString('en-US')}."`,
      opts: [`Direct LAB-F, maintain ${L.alt0.toLocaleString('en-US')}, ${L.callShort}.`, `Roger, ${L.callShort}.`, `Direct LAB-A, ${L.callShort}.`], ok: 0,
      why: '目的地変更の指示は「どこへ（直行先）・高度」を復唱します。' }),
    mayday: L => ({ msg: '（エンジンが止まりました。最初に送る無線として正しいものは？）',
      opts: [`Mayday, Mayday, Mayday, LAB Tower, ${L.callShort}, engine failure, ${L.posStr || '5 miles north'}, ${L.alt0.toLocaleString('en-US')} feet, landing LAB runway 36.`,
        `LAB Tower, ${L.callShort}, request landing.`, `Pan-pan, ${L.callShort}, low fuel.`], ok: 0,
      why: '遭難（すぐに助けが必要）なら MAYDAY を 3 回、相手・コールサイン・状況・位置・高度・意図の順（AIM 6-3-1 の考え方）。ただし最優先は操縦（Aviate → Navigate → Communicate）。' }),
    lost: L => ({ msg: '（現在地がわからなくなりました。管制に助けを求める無線は？）',
      opts: [`LAB Approach, ${L.callShort}, unsure of position, ${L.alt0.toLocaleString('en-US')} feet, request assistance.`, `LAB Approach, ${L.callShort}, request flight following.`, `Mayday, Mayday, Mayday, ${L.callShort}, lost.`], ok: 0,
      why: '迷ったら早めに正直に伝える（Confess）。燃料や天候に余裕がなければ緊急の宣言もためらわない。AIM 6-2 の考え方（5C：Climb, Communicate, Confess, Comply, Conserve）。' }),
    oei: L => ({ msg: `（片発停止。管制へ伝える内容は？）`,
      opts: [`LAB Tower, ${L.callShort}, engine failure, left engine feathered, returning for landing runway 36.`, `LAB Tower, ${L.callShort}, request touch and go.`, `${L.callShort}, all normal.`], ok: 0,
      why: '状況（片発停止・どちらのエンジン）と意図（戻って着陸）を短く伝えます。双発の片発停止は多くの場合「緊急（Mayday / Pan-pan）」として扱われ、優先して着陸させてもらえます。' }),
  };

  // ---------------------------------------------------------------- the context the steps read
  function ctx(L, dt = 1 / 60) {
    const s = L.s, o = s.out, av = L.av, ph = P(), A = AV(), R = ph.LAB_RWY, varW = ph.MAGVAR_W;
    const pos = ph.ne(s), nav = A.navSolve(av, pos, o, varW, R), rc = ph.rwyCoords(R, pos.n, pos.e);
    const hdg = A.trueToMag(o.hdgTrue, varW), prev = L.prevHdg == null ? hdg : L.prevHdg; L.prevHdg = hdg;
    const rate = w180(hdg - prev) / Math.max(dt, 1e-3);
    L.rateF = L.rateF == null ? rate : L.rateF + (rate - L.rateF) * Math.min(1, dt * 3);
    const aglR = o.agl, aim = 300, gp = rc.along < aim - 50 ? Math.atan2(Math.max(aglR / ph.FT, 0), aim - rc.along) / DEG : 3;
    const h = R.trueHdg * DEG, latV = s.vel[0] * Math.cos(h) + s.vel[2] * Math.sin(h);
    const vor = A.NAVAIDS.find(x => x.type === 'VOR');
    const dmeV = A.neDistNm(vor, pos), brgV = A.trueToMag(A.neBearing(pos, vor), varW);
    return {
      dt, t: L.t, alt: A.indicatedAlt(o.altTrue, s.qnh, av.baro), altTrue: o.altTrue, agl: o.agl, aglR, kias: o.ias, tas: o.tas, gsK: o.gs,
      hdg, trk: A.trueToMag(o.trk, varW), pitch: o.pitch, bank: o.bank, vs: o.vsi, rate: L.rateF, along: rc.along, cross: rc.cross, rwyHdg: 360,
      thr: s.thr, flaps: s.flapIdx, gearDown: s.gearDown, gearPos: s.gearPos, onGround: s.onGround, paved: o.onRunway, stall: o.stallWarn, g: o.g, beta: o.beta,
      latV, gp, cl: rc.cross, cdi: nav.flag ? 2.5 : nav.dots, loc: nav.flag ? 2.5 : nav.dots, gsd: nav.flag || nav.gsDots == null ? 2.5 : nav.gsDots, navFlag: nav.flag, dmeV, brgV, dis: nav.dis, xtk: nav.xtk,
      engRun: s.eng.filter(e => e.run).length, crashed: s.crashed, td: s.td,
    };
  }
  // the value of a target in the context (deviation = value − target)
  function tgtDev(k, c, tv) {
    switch (k) {
      case 'hdg': return w180(c.hdg - tv);
      case 'rhdg': return w180(c.hdg - c.rwyHdg);
      case 'dwhdg': return w180(c.hdg - 180);
      case 'trk': return w180(c.trk - tv);
      case 'alt': return c.alt - tv; case 'spd': return c.kias - tv; case 'vs': return c.vs - tv; case 'aglR': return c.aglR - tv;
      case 'gp': return c.gp - tv; case 'cl': return c.cl - tv; case 'abank': return Math.abs(c.bank) - tv; case 'bank': return c.bank - tv;
      case 'arate': return Math.abs(c.rate) - tv; case 'cdi': return c.cdi - tv; case 'loc': return c.loc - tv; case 'gs': return c.gsd - tv;
      case 'xtk': return fin(c.xtk) - tv;
      default: return 0;
    }
  }
  const TGT_LABEL = { alt: ['高度', 'ft'], hdg: ['針路', '°'], rhdg: ['針路', '°'], dwhdg: ['針路', '°'], trk: ['航跡', '°'], spd: ['速度', 'kt'], vs: ['昇降率', 'fpm'], aglR: ['対地高度', 'ft'],
    abank: ['バンク', '°'], bank: ['バンク', '°'], arate: ['旋回率', '°/秒'], gp: ['進入角', '°'], cl: ['センターライン', 'm'], cdi: ['CDI', 'ドット'], loc: ['LOC', 'ドット'], gs: ['GS', 'ドット'], xtk: ['航路外れ', 'NM'] };
  const DP = { cdi: 1, loc: 1, gs: 1, gp: 1, arate: 1, xtk: 2 };
  function fillText(str, L) {
    return String(str).replace(/\{(\w+)\}/g, (m, k) => {
      const c = L.last;
      const v = { alt0: L.alt0, alt1: L.alt0 + 1000, hdg0: L.hdg0, hdgL: w360(L.hdg0 - 90) || 360, hdgR: w360(L.hdg0 + 90) || 360, rwyHdg: 360, dwHdg: 180,
        brgV: c ? c.brgV : 0, obs: L.av.crs, obsOut: w360(L.av.crs + 180) || 360, vr: L.V.rotate, vy: L.V.y, vx: L.V.x, glide: L.V.glide, appr: L.V.appr, yse: L.V.yse, mc: L.V.mc,
        intHdg: L.intHdg, call: L.callShort, dest: L.dest || '' }[k];
      if (v === undefined) return m;
      if (typeof v !== 'number') return v;
      if (k.startsWith('alt')) return Math.round(v).toLocaleString('en-US');
      if (/hdg|Hdg|brg|obs/.test(k)) return String(Math.round(v)).padStart(3, '0');
      return String(Math.round(v));
    });
  }

  // ---------------------------------------------------------------- where a lesson starts
  // su.at: runway | area | downwind | final | ils | away ; plus kt, flaps, thr, gear, wind {rel, kt, gust}, hood, nav, hdg, aglFt, km
  function place(L, su) {
    const ph = P(), A = AV(), s = L.s, R = ph.LAB_RWY, varW = ph.MAGVAR_W, V = L.V, magToTrue = m => A.magToTrue(m, varW);
    const ft2m = ph.FT;
    if (su.at === 'runway') {
      ph.placeOnRunway(s, R, su.along || 30); L.hdg0 = 360; L.alt0 = Math.round(R.elevFt + 1000);
    } else if (su.at === 'area') {
      const hdg = su.hdg || 90, n = su.n != null ? su.n : 7000, e = su.e != null ? su.e : -37500;
      L.alt0 = su.altFt || 3000;
      ph.placeInAir(s, n, e, L.alt0, magToTrue(hdg), su.kt || V.cruise, su.gamma || 0, su.flaps || 0, su.thr != null ? su.thr : null);
      L.hdg0 = hdg;
    } else if (su.at === 'downwind') {
      const [n, e] = ph.rwyToNE(R, R.len + 200, -1600), altFt = R.elevFt + 1000;
      ph.placeInAir(s, n, e, altFt, magToTrue(180), su.kt || 90, 0, 0, null);
      L.hdg0 = 180; L.alt0 = altFt;
    } else if (su.at === 'final') {
      const D = (su.km || 5) * 1000, along = 300 - D, [n, e] = ph.rwyToNE(R, along, su.cross || 0);
      const altFt = R.elevFt + Math.tan(3 * DEG) * D * ft2m + 0;
      const fl = su.flaps != null ? su.flaps : V.apprFlaps || 2, kt = su.kt || V.appr;
      ph.placeInAir(s, n, e, altFt, R.trueHdg, kt, -3, fl, null);
      L.hdg0 = 360; L.alt0 = Math.round(altFt);
    } else if (su.at === 'ils') {
      const D = (su.km || 14) * 1000, [n, e] = ph.rwyToNE(R, 300 - D, su.cross != null ? su.cross : 3200);
      L.intHdg = su.intHdg || 330; L.alt0 = su.altFt || 2000;
      ph.placeInAir(s, n, e, L.alt0, magToTrue(L.intHdg), su.kt || 90, 0, 0, null);
      L.hdg0 = L.intHdg;
    } else if (su.at === 'away') {
      // brg / km from the LAB VOR (or the runway): a point; heading: toward or away
      const ref = su.from === 'rwy' ? { n: R.n, e: R.e } : A.NAVAIDS.find(x => x.type === 'VOR');
      const b = magToTrue(su.brg != null ? su.brg : 90) * DEG, D = (su.km || 10) * 1000;
      const n = ref.n + Math.cos(b) * D, e = ref.e + Math.sin(b) * D;
      L.alt0 = su.altFt || 3000;
      const hdg = su.hdg != null ? su.hdg : su.toward ? w360(A.trueToMag(A.neBearing({ n, e }, ref), varW) + (su.offset || 0)) : su.brg || 90;
      ph.placeInAir(s, n, e, L.alt0, magToTrue(hdg), su.kt || V.cruise, 0, 0, null);
      L.hdg0 = Math.round(hdg) || 360;
    }
    if (su.thr != null && su.at !== 'runway') s.thr = su.thr;
    if (su.gear != null && !s.A.gear.fixed && su.at !== 'runway') { s.gearDown = !!su.gear; s.gearPos = su.gear ? 1 : 0; }
    // the avionics: altimeter set, heading bug and selected altitude on the start values, the CDI source
    L.av.baro = s.qnh; L.av.hdgBug = L.hdg0 || 360; L.av.altSel = Math.round(L.alt0 / 100) * 100;
    if (su.nav === 'VOR') { L.av.cdi = 'NAV1'; L.av.nav1.act = 113500; L.av.crs = w360((su.obs != null ? su.obs : Math.round(A.trueToMag(A.neBearing(ph.ne(s), A.NAVAIDS[0]), varW) / 5) * 5) + (su.obsOff || 0)) || 360; }
    else if (su.nav === 'ILS') { L.av.cdi = 'NAV1'; L.av.nav1.act = 109900; L.av.crs = 360; }
    if (su.fpl) { L.av.fpl = { wps: su.fpl.slice(), active: 1 }; L.av.cdi = 'GPS'; }
    P().derive(s);
  }

  // ---------------------------------------------------------------- the lesson
  // creates the physics state, the avionics and the lesson runtime; the steps live in FL.syllabus
  function lesson(id) { for (const st of FL.syllabus.STAGES) for (const l of st.lessons) if (l.id === id) return l; return null; }
  function lessonOrder() { const out = []; for (const st of FL.syllabus.STAGES) for (const l of st.lessons) out.push(l.id); return out; }
  function stageOf(id) { return FL.syllabus.STAGES.find(st => st.lessons.some(l => l.id === id)) || null; }
  const callOf = A => ({ spoken: `${A.short} Seven Lima Alpha`, short: `${A.short} 7LA` });
  function startLesson(id, levelId = 'intro', opt = {}) {
    const def = lesson(id); if (!def || !def.steps) throw new Error('unknown flight lesson ' + id);
    const ph = P(), su = def.setup || {};
    const s = ph.newState({ aircraft: def.aircraft || su.aircraft || 'pa28', seed: opt.seed || 7 });
    s.opts.sens = opt.sens || 'low'; s.opts.autoRud = opt.autoRud != null ? !!opt.autoRud : !!def.autoRud;
    // the wind (relative to the runway), the gusts
    const R = ph.LAB_RWY;
    if (su.wind) { const from = w360(R.trueHdg + su.wind.rel); s.wind = { fromDeg: from, kt: su.wind.kt, gust: su.wind.gust ?? 1 }; }
    else s.wind = { fromDeg: R.trueHdg + 10, kt: su.calm ? 0 : 5, gust: 0.5 };
    s.qnh = su.qnh || 29.92;
    const av = AV().createAvionics(), lv = level(levelId), call = callOf(s.A);
    const L = { id, def, level: lv, s, av, A: s.A, V: s.A.v, step: -1, results: [], t: 0, call: call.spoken, callShort: call.short, fail: {}, hood: !!su.hood, prevHdg: null, rateF: 0,
      hist: { alt: [], ias: [] }, nextSample: 0, done: false, passed: false, grade: '', reason: '', events: [], evSeen: 0, landings: 0 };
    const windMag = Math.round(AV().trueToMag(s.wind.fromDeg, ph.MAGVAR_W) / 10) * 10 || 360;
    L.windStr = s.wind.kt < 3 ? 'calm' : `${String(windMag).padStart(3, '0')} at ${Math.round(s.wind.kt)}`;
    place(L, su);
    if (su.onStart) su.onStart(L);
    L.last = ctx(L);
    nextStep(L, L.last);
    return L;
  }

  // ---------------------------------------------------------------- the step machine
  function nextStep(L, c) {
    L.step++;
    const S = L.def.steps[L.step];
    if (!S) { endLesson(L, true); return; }
    L.st = { t: 0, turned: 0, stats: {}, holdT: 0, holdBest: 0, lastHdg: null };
    const s = L.s;
    if (S.onStart) S.onStart(L, c, L.st);
    if (S.fail) failNow(L, S.fail);
    if (S.hoodOff) L.hood = false;
    if (S.hoodOn) L.hood = true;
    if (S.upset) setUpset(L, S.upset);
    if (S.checklist) L.check = { id: S.checklist, i: 0 };
    if (S.atc) L.atc = typeof S.atc === 'function' ? S.atc(L) : ATC_Q[S.atc](L);
    L.guideText = stepGuide(S, L);
    L.sayText = S.say ? fillText(S.say, L) : S.checklist ? CHECKLISTS[S.checklist].title + '（Enter で 1 項目ずつ確認）' : S.atc ? '管制の指示に正しく応答する（1〜3 キー）' : '';
    L.keysText = S.keys ? fillText(S.keys, L) : '';
    L.hint = '';
    L.chime = (L.chime || 0) + 1;
    s.ovr = null;
  }
  function failNow(L, kind) {
    const s = L.s;
    L.fail[kind] = L.t;
    if (kind === 'engine') { s.eng[0].failed = true; }
    else if (kind === 'engL') { s.eng[0].failed = true; }
    else if (kind === 'engR') { s.eng[s.eng.length - 1].failed = true; }
    else if (kind === 'ahrs') { L.av.fail = Object.assign({}, L.av.fail, { ahrs: true }); }
    else if (kind === 'gps') { L.av.fail = Object.assign({}, L.av.fail, { gps: true }); if (L.av.cdi === 'GPS') L.av.direct = null; }
  }
  function setUpset(L, kind) {
    const ph = P(), s = L.s, a = ph.attitude(s), h = a.hdg * DEG;
    if (kind === 'high') { s.q = ph.qFromHPB(a.hdg, 25, -35); s.vel = ph.vscale([Math.sin(h), 0.32, -Math.cos(h)], 34); s.thr = 0.45; }
    else { s.q = ph.qFromHPB(a.hdg, -20, 50); s.vel = ph.vscale([Math.sin(h), -0.34, -Math.cos(h)], 62); s.thr = 0.85; }
    s.w = [0, 0, 0]; s.pTgt = ph.attitude(s).pitch;
  }
  // one evaluation tick (after the physics step)
  function update(L, dt) {
    if (!L || L.done) return;
    const c = ctx(L, dt); L.last = c;
    L.t += dt;
    // keep the history for the record (every 2 s)
    if (L.t >= L.nextSample) { L.nextSample = L.t + 2; if (L.hist.alt.length < 1800) { L.hist.alt.push(Math.round(c.alt)); L.hist.ias.push(Math.round(c.kias)); } }
    const S = L.def.steps[L.step]; if (!S) return;
    const st = L.st; st.t += dt;
    st.turned += st.lastHdg == null ? 0 : w180(c.hdg - st.lastHdg); st.lastHdg = c.hdg;
    if (L.s.crashed) { crashed(L, L.s.crashReason); return; }
    if (S.checklist || S.atc) { if (st.done) nextStep(L, c); return; }
    if (S.check) S.check(c, L, st);
    let allIn = true;
    const lv = L.level, k = lv.k;
    if (S.tgt) for (const [key, spec] of Object.entries(S.tgt)) {
      const tv = typeof spec[0] === 'function' ? spec[0](L, c) : spec[0], tol = +(spec[1] * (spec[2] === 'fixed' ? 1 : k)).toFixed(DP[key] || 0) || spec[1] * k;
      const d = tgtDev(key, c, tv), inside = Math.abs(d) <= tol;
      if (!inside) allIn = false;
      const gradeNow = S.grade && (!S.gradeWhen || S.gradeWhen(c, L, st));
      const q = st.stats[key] || (st.stats[key] = { n: 0, inT: 0, max: 0, tol, tv });
      q.tv = tv; q.d = d; q.tol = tol; q.inside = inside;
      if (gradeNow) { q.n += dt; if (inside) q.inT += dt; q.max = Math.max(q.max, Math.abs(d)); }
    }
    // the continuous hold: every target inside, without a break (only counted while the step is being graded)
    const holding = allIn && (!S.gradeWhen || S.gradeWhen(c, L, st));
    st.holdT = holding ? st.holdT + dt : 0;
    st.holdBest = Math.max(st.holdBest, st.holdT);
    L.hintT = (L.hintT || 0) - dt;
    if (L.hintT <= 0) { L.hintT = 1.2; L.hint = lv.hints ? instructorHint(L, S, st, c) : ''; }
    let done = false, timeout = false;
    const need = S.hold ? Math.round(S.hold * lv.holdK) : 0; st.need = need;
    if (S.dur && st.t >= S.dur) done = true;
    if (need && st.holdT >= need) done = true;
    if (S.until && S.until(c, L, st)) done = true;
    if (S.max && st.t >= S.max && !done) { done = true; timeout = true; }
    if (done) finishStep(L, S, st, c, timeout);
  }
  function instructorHint(L, S, st, c) {
    if (!S.tgt) return S.hint ? S.hint(c, L, st) || '' : '';
    let worst = null;
    for (const [k, q] of Object.entries(st.stats)) { const r = Math.abs(q.d) / q.tol; if (r > 0.6 && (!worst || r > worst[1])) worst = [k, r, q.d]; }
    if (!worst) return S.hint ? S.hint(c, L, st) || '良い調子です。そのまま' : '良い調子です。そのまま';
    const [k, , d] = worst, hi = d > 0;
    const g = S.g && typeof S.g === 'object' ? S.g : null;
    // which control fixes the airspeed depends on the phase (power fixed → the nose sets the speed)
    const pitchForSpeed = !!g && (!!g.pwr || ['rate', 'approach', 'ils', 'pattern', 'slow', 'glide', 'climbFull', 'oei'].includes(g.how)), slow = g && g.how === 'slow';
    const M = {
      alt: slow ? (hi ? `高度が ${Math.round(d)} ft 高い：パワーを少し絞る` : `高度が ${Math.round(-d)} ft 低い：パワーを足す（低速では高度はパワー）`) : hi ? `高度が ${Math.round(d)} ft 高い：機首を 1〜2° 下げる（W を軽く）` : `高度が ${Math.round(-d)} ft 低い：機首を 1〜2° 上げ（S を軽く）、速度が落ちるならパワーも`,
      aglR: hi ? '高い：パワーを絞って降下率を増やす' : '低い：パワーを足して降下を浅く',
      spd: pitchForSpeed ? (hi ? `速度が ${Math.round(d)} kt 速い：機首を 1〜2° 上げる${g.pwr ? '（出力はそのまま）' : ''}` : `速度が ${Math.round(-d)} kt 遅い：機首を 1〜2° 下げる${g.pwr ? '（出力はそのまま）' : ''}`)
        : hi ? `速度が ${Math.round(d)} kt 速い：パワーを少し絞る（F）` : `速度が ${Math.round(-d)} kt 遅い：パワーを少し足す（R）`,
      hdg: hi ? `針路が右に ${Math.round(d)}° ずれ：左へ修正（A）` : `針路が左に ${Math.round(-d)}° ずれ：右へ修正（D）`,
      trk: hi ? '航跡が右へずれている：左へ修正（風上へ少し向ける）' : '航跡が左へずれている：右へ修正（風上へ少し向ける）',
      rhdg: hi ? '滑走路の方位より右：左へ' : '滑走路の方位より左：右へ', dwhdg: hi ? '滑走路と平行に：左へ' : '滑走路と平行に：右へ',
      abank: hi ? 'バンクが深い：少し浅く' : 'バンクが浅い：もう少し傾ける', bank: hi ? 'バンクが右に深い：左へ戻す' : 'バンクが左に深い：右へ戻す',
      arate: hi ? '旋回が速い：バンクを浅く' : '旋回が遅い：バンクを少し深く',
      vs: hi ? (g && g.fpm < 0 ? '降下が浅い：パワーを少し絞る' : '上昇が速すぎる：パワーを少し絞る') : (g && g.fpm < 0 ? '降下が速すぎる：パワーを少し足す' : '上昇が遅い：パワーを少し足す'),
      cl: hi ? 'センターラインの右：左へ（Q ラダー・A）' : 'センターラインの左：右へ（E ラダー・D）',
      xtk: hi ? '航路の右にずれている：左へ修正' : '航路の左にずれている：右へ修正',
    };
    if (k === 'gp') return d > 0 ? '進入が高い（PAPI の白が多い）：パワーを少し絞る' : '進入が低い（PAPI の赤が多い）：パワーを足す';
    if (k === 'cdi' || k === 'loc') return d > 0 ? 'CDI の針が右：右へ修正（針の方へ）' : 'CDI の針が左：左へ修正（針の方へ）';
    if (k === 'gs') return d > 0 ? 'グライドスロープより低い（菱形が上）：降下を浅く（パワー＋）' : 'グライドスロープより高い（菱形が下）：降下率を増やす（パワー−）';
    return M[k] || '';
  }
  function finishStep(L, S, st, c, timeout) {
    const rows = [];
    if (S.grade && S.tgt && S.gradeFinal) for (const [k, q] of Object.entries(st.stats)) {
      const lab = TGT_LABEL[k] || [k, ''], pass = Math.abs(q.d) <= q.tol;
      rows.push({ name: lab[0] + '（終了時）', val: `${q.d >= 0 ? '+' : ''}${q.d.toFixed(DP[k] || 0)} ${lab[1]}`, std: `±${q.tol} ${lab[1]}`, pass, score: pass ? 1 - Math.abs(q.d) / q.tol * 0.3 : 0 });
    }
    else if (S.grade && S.tgt) for (const [k, q] of Object.entries(st.stats)) {
      if (q.n < 0.5) continue;
      const pct = q.inT / q.n, lab = TGT_LABEL[k] || [k, ''], pass = pct >= 0.85 && q.max <= q.tol * 1.6;
      rows.push({ name: lab[0], val: `${Math.round(pct * 100)}% が基準内（最大のずれ ${q.max.toFixed(DP[k] || 0)} ${lab[1]}）`, std: `±${q.tol} ${lab[1]}`, pass, score: pct });
    }
    if (st.need) rows.push({ name: '連続保持', val: `最長 ${st.holdBest.toFixed(0)} 秒`, std: `${st.need} 秒続けて基準内`, pass: st.holdBest >= st.need - 0.05, score: clamp(st.holdBest / st.need, 0, 1) });
    if (S.result) rows.push(...S.result(L, st));
    if (timeout && S.grade && !st.need) rows.push({ name: '制限時間', val: '時間切れ', std: `${S.max} 秒以内`, pass: false });
    if (st.note) rows.push({ name: '注意', val: st.note, std: '', pass: false });
    if (rows.length) L.results.push({ step: S.name, rows });
    if (S.onEnd) S.onEnd(L, c, st);
    if (S.stopOnFail && rows.some(r => !r.pass)) { endLesson(L, false, S.stopOnFail); return; }
    nextStep(L, c);
  }
  // the checklist and ATC dialogs
  function checklistItem(L) { const K = L.check; if (!K) return null; return CHECKLISTS[K.id].items[K.i] || null; }
  function checklistText(it, s) { return typeof it[1] === 'function' ? it[1](s) : it[1]; }
  function checklistNext(L) {
    const K = L.check; if (!K || L.done) return { ok: false };
    const C = CHECKLISTS[K.id], it = C.items[K.i];
    if (it && it[2] && !it[2](L.s)) { L.hint = `${it[0]}：${checklistText(it, L.s)} にしてから確認`; return { ok: false, item: it[0] }; }
    K.i++;
    if (K.i >= C.items.length) { L.check = null; L.st.done = true; L.results.push({ step: C.title, rows: [{ name: 'チェックリスト', val: '完了', std: '全項目', pass: true }] }); }
    return { ok: true };
  }
  function answerAtc(L, i) {
    const q = L.atc; if (!q || L.done) return null;
    const ok = i === q.ok;
    L.results.push({ step: '無線（復唱）', rows: [{ name: '応答', val: ok ? '正しい' : `誤り（正解：${q.opts[q.ok]}）`, std: '正しく復唱', pass: ok }] });
    L.atc = null; L.atcResult = { ok, why: q.why, t: L.t };
    L.st.done = true;
    return { ok, why: q.why, right: q.opts[q.ok] };
  }
  // crash: a controlled, low-energy touchdown off the runway after an engine failure is a survivable forced landing
  function crashed(L, reason) {
    if (L.done) return;
    const c = L.last, S = L.def.steps[L.step] || {};
    const engineOut = L.fail.engine || L.fail.engL || L.fail.engR;
    const gentle = c && engineOut && c.vs > -800 && c.kias < (L.V.glide || 76) + 12 && Math.abs(c.bank) < 20 && !/湖/.test(reason);
    if (gentle) {
      L.results.push({ step: '不時着', rows: [{ name: '結果', val: '滑走路外へ不時着（機体は損傷・乗員は無事という想定）', std: '安全に接地', pass: true }] });
      endLesson(L, true); return;
    }
    L.results.push({ step: '事故', rows: [{ name: '結果', val: reason, std: '安全に飛行を終える', pass: false }] });
    endLesson(L, false, reason);
  }
  function endLesson(L, complete, reason = '') {
    if (L.done) return;
    L.done = true; L.reason = reason;
    const all = L.results.flatMap(r => r.rows);
    L.passed = complete && all.length > 0 && all.every(r => r.pass);
    const scores = all.map(r => (r.pass ? (r.score !== undefined ? 0.7 + 0.3 * r.score : 1) : 0.4 * (r.score || 0)));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    L.score = avg;
    L.grade = !complete ? '―' : L.passed ? (avg > 0.97 ? 'S' : avg > 0.92 ? 'A' : 'B') : 'C';
    L.passPct = all.length ? Math.round(all.filter(r => r.pass).length / all.length * 100) : 0;
  }
  function abort(L, reason = '途中で終了') { if (!L.done) { L.results.push({ step: '中断', rows: [{ name: '結果', val: reason, std: '', pass: false }] }); endLesson(L, false, reason); } }

  // ---------------------------------------------------------------- free flight (no lesson): the same starting places
  const FREE_STARTS = [
    { id: 'rwy', name: 'LAB RWY 36（滑走路上・停止）', su: { at: 'runway' } },
    { id: 'pattern', name: '場周経路のダウンウインド（1,000 ft AGL）', su: { at: 'downwind' } },
    { id: 'final', name: '最終進入 5 km（3° のパス上）', su: { at: 'final', km: 5 } },
    { id: 'area', name: '訓練空域 上空 3,000 ft', su: { at: 'area' } },
    { id: 'ils', name: 'ILS 進入の開始点（2,000 ft）', su: { at: 'ils', nav: 'ILS' } },
    { id: 'sfb', name: 'Sanford 上空 1,500 ft（Google 3D の確認用）', su: { at: 'away', from: 'sfb', n: -9000, e: -2000, altFt: 1500, hdg: 360, kt: 100 } },
  ];
  function startFree(startId = 'rwy', aircraft = 'pa28', opt = {}) {
    const st = FREE_STARTS.find(x => x.id === startId) || FREE_STARTS[0], ph = P();
    const s = ph.newState({ aircraft, seed: opt.seed || 7 });
    s.opts.sens = opt.sens || 'low'; s.opts.autoRud = !!opt.autoRud; s.opts.assist = !!opt.assist;
    const W = opt.wind || { rel: 10, kt: 5, gust: 0.5 };
    s.wind = { fromDeg: w360(ph.LAB_RWY.trueHdg + W.rel), kt: W.kt, gust: W.gust ?? 0.5 };
    const L = { id: 'free', free: true, def: { title: '自由飛行', steps: [] }, level: LEVELS[0], s, av: AV().createAvionics(), A: s.A, V: s.A.v, step: 0, results: [], t: 0, fail: {}, hood: false,
      call: callOf(s.A).spoken, callShort: callOf(s.A).short, hist: { alt: [], ias: [] }, nextSample: 0, done: false, events: [], evSeen: 0 };
    if (st.id === 'sfb') { ph.placeInAir(s, -9000, -2000, 1500, AV().magToTrue(360, ph.MAGVAR_W), 100, 0, 0, null); L.alt0 = 1500; L.hdg0 = 360; L.av.baro = s.qnh; }
    else place(L, st.su);
    L.last = ctx(L);
    return L;
  }
  function freeUpdate(L, dt) {
    const c = ctx(L, dt); L.last = c; L.t += dt;
    if (L.t >= L.nextSample) { L.nextSample = L.t + 2; if (L.hist.alt.length < 1800) { L.hist.alt.push(Math.round(c.alt)); L.hist.ias.push(Math.round(c.kias)); } }
  }

  // ---------------------------------------------------------------- the learning record (localStorage + JSON)
  const STORE_KEY = 'flightlab-records-v2', PROG_KEY = 'flightlab-progress-v2', MAX_RECORDS = 300;
  const RECORD_NOTE = '本記録は教材シミュレータの練習記録です。正式な飛行日誌（logbook）ではなく、飛行時間として扱えません。';
  // anything that looks like a key or a token is removed from free text before it is saved or exported
  const SECRET_RES = [/AIza[0-9A-Za-z_\-]{20,}/g, /sk-[A-Za-z0-9_\-]{16,}/g, /ya29\.[0-9A-Za-z_\-]+/g, /(key|token|session)\s*[=:]\s*[^\s&"']{8,}/gi];
  function scrub(str, max = 2000) { let t = String(str == null ? '' : str).slice(0, max); for (const re of SECRET_RES) t = t.replace(re, '[削除：キー・トークンらしき文字列]'); return t; }
  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  const numArr = (a, max = 600) => (Array.isArray(a) ? a.filter(isNum).slice(0, max).map(v => Math.round(v)) : []);
  function downsample(a, max = 300) { if (a.length <= max) return a.slice(); const out = [], k = a.length / max; for (let i = 0; i < max; i++) out.push(a[Math.floor(i * k)]); return out; }
  const KEEP_EVENTS = ['touchdown', 'hard_landing', 'crash', 'off_runway_touchdown', 'tail_strike', 'runway_excursion', 'engine_stop'];
  function cleanEvent(e) {
    if (!e || typeof e !== 'object' || !KEEP_EVENTS.includes(e.type)) return null;
    const o = { t: isNum(e.t) ? Math.round(e.t) : 0, type: e.type };
    for (const k of ['fpm', 'kias', 'along', 'cross', 'crab', 'latV', 'pitch', 'bank']) if (isNum(e[k])) o[k] = Math.round(e[k] * 10) / 10;
    if (typeof e.onRunway === 'boolean') o.onRunway = e.onRunway;
    if (e.why) o.why = scrub(e.why, 120);
    return o;
  }
  function recordFromLesson(L, memo = '') {
    const lessonId = L.free ? 'free' : L.id;
    return sanitizeRecord({
      v: 2, id: 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36), lessonId, level: L.level.id, aircraft: L.A.id, datetime: new Date().toISOString(),
      result: L.free ? 'free' : !L.done ? 'abort' : L.passed ? 'pass' : L.reason ? 'abort' : 'fail', grade: L.grade || '', reason: L.reason || '',
      passPct: L.passPct || 0, practiceSec: Math.round(L.t),
      steps: (L.results || []).slice(0, 40).map(r => ({ step: r.step, pass: r.rows.every(x => x.pass), rows: r.rows.slice(0, 8).map(x => ({ name: x.name, val: x.val, std: x.std, pass: !!x.pass })) })),
      sampleSec: 2 * Math.max(1, Math.ceil(L.hist.alt.length / 300)), altHist: downsample(L.hist.alt), spdHist: downsample(L.hist.ias),
      events: (L.s.events || []).slice(0, 60), td: L.s.td, memo, note: RECORD_NOTE,
    });
  }
  const lessonTitle = id => (id === 'free' ? '自由飛行' : (lesson(id) || {}).title || '');
  function sanitizeRecord(r) {
    if (!r || typeof r !== 'object') return null;
    const lid = String(r.lessonId || '');
    if (lid !== 'free' && !lesson(lid)) return null;
    const txt = (v, n) => scrub(v, n);
    const steps = Array.isArray(r.steps) ? r.steps.slice(0, 40).map(S => (S && typeof S === 'object' ? { step: txt(S.step, 80), pass: !!S.pass, rows: Array.isArray(S.rows) ? S.rows.slice(0, 8).map(x => ({ name: txt(x && x.name, 60), val: txt(x && x.val, 120), std: txt(x && x.std, 60), pass: !!(x && x.pass) })) : [] } : null)).filter(Boolean) : [];
    return {
      v: 2, id: txt(r.id, 40).replace(/[^A-Za-z0-9_\-]/g, '') || 'r' + Math.random().toString(36).slice(2),
      lessonId: lid, lessonTitle: lessonTitle(lid), level: level(r.level).id, levelName: level(r.level).name, aircraft: ['pa28', 'pa44'].includes(r.aircraft) ? r.aircraft : 'pa28',
      datetime: isNaN(Date.parse(r.datetime)) ? new Date(0).toISOString() : new Date(Date.parse(r.datetime)).toISOString(),
      result: ['pass', 'fail', 'abort', 'free'].includes(r.result) ? r.result : 'abort', grade: ['S', 'A', 'B', 'C', '―', ''].includes(r.grade) ? r.grade : '', reason: txt(r.reason, 300),
      passPct: isNum(r.passPct) ? clamp(Math.round(r.passPct), 0, 100) : 0, practiceSec: isNum(r.practiceSec) ? Math.max(0, Math.round(r.practiceSec)) : 0,
      steps, sampleSec: isNum(r.sampleSec) ? clamp(r.sampleSec, 1, 60) : 2, altHist: numArr(r.altHist, 300), spdHist: numArr(r.spdHist, 300),
      events: Array.isArray(r.events) ? r.events.slice(0, 60).map(cleanEvent).filter(Boolean) : [], td: r.td && typeof r.td === 'object' ? cleanEvent({ ...r.td, type: 'touchdown' }) : null,
      memo: txt(r.memo, 2000), note: RECORD_NOTE,
    };
  }
  // progress: lessons (tries / best grade / passed), training time, landings, read sections, quiz scores, ATC scenes
  function sanitizeProgress(p) {
    const out = { lessons: {}, time: 0, landings: 0, read: [], quiz: {}, bookQuiz: {}, atc: {} };
    if (!p || typeof p !== 'object') return out;
    if (p.lessons && typeof p.lessons === 'object') for (const [k, v] of Object.entries(p.lessons)) {
      if (!/^[a-z0-9_]{1,12}$/.test(k) || !v || typeof v !== 'object') continue;
      out.lessons[k] = { tries: isNum(v.tries) ? clamp(Math.round(v.tries), 0, 99999) : 0, best: ['S', 'A', 'B', 'C', '―'].includes(v.best) ? v.best : '', pass: !!v.pass, levels: Array.isArray(v.levels) ? v.levels.filter(x => LEVELS.some(l => l.id === x)).slice(0, 3) : [] };
    }
    if (isNum(p.time)) out.time = clamp(p.time, 0, 1e8);
    if (isNum(p.landings)) out.landings = clamp(Math.round(p.landings), 0, 1e6);
    if (Array.isArray(p.read)) out.read = [...new Set(p.read.filter(x => typeof x === 'string' && /^[a-z0-9_.\-]{1,40}$/.test(x)))].slice(0, 500);
    for (const key of ['quiz', 'bookQuiz']) if (p[key] && typeof p[key] === 'object') for (const [k, v] of Object.entries(p[key])) { if (/^[a-z0-9_.\-]{1,40}$/.test(k) && isNum(v)) out[key][k] = clamp(Math.round(v), 0, 100); }
    if (p.atc && typeof p.atc === 'object') for (const [k, v] of Object.entries(p.atc)) { if (/^[a-z0-9_]{1,20}$/.test(k)) out.atc[k] = v === true; }
    return out;
  }
  function noteLesson(prog, L) {
    if (!L || L.free || !L.done) return prog;
    const rec = prog.lessons[L.id] || { tries: 0, best: '', pass: false, levels: [] };
    rec.tries++; if (L.passed) { rec.pass = true; if (!rec.levels.includes(L.level.id)) rec.levels.push(L.level.id); }
    const rank = { S: 4, A: 3, B: 2, C: 1, '―': 0, '': -1 };
    if ((rank[L.grade] ?? -1) > (rank[rec.best] ?? -1)) rec.best = L.grade;
    prog.lessons[L.id] = rec;
    return prog;
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
    return JSON.stringify({ app: 'FLIGHT LAB', kind: 'learning-record', version: 2, exported: new Date().toISOString(), note: RECORD_NOTE,
      records: (records || []).map(sanitizeRecord).filter(Boolean), progress: sanitizeProgress(prog) }, null, 1);
  }
  function importJSON(text) {
    let j; try { j = JSON.parse(String(text)); } catch (e) { throw new Error('JSON として読めません'); }
    if (!j || j.app !== 'FLIGHT LAB' || j.kind !== 'learning-record') throw new Error('FLIGHT LAB の学習記録ファイルではありません');
    return { records: (Array.isArray(j.records) ? j.records : []).map(sanitizeRecord).filter(Boolean), progress: sanitizeProgress(j.progress) };
  }
  function mergeRecords(a, b) { const m = new Map(); for (const r of [...a, ...b]) if (r) m.set(r.id, r); return [...m.values()].sort((x, y) => x.datetime.localeCompare(y.datetime)).slice(-MAX_RECORDS); }
  function mergeProgress(a, b) {
    const A = sanitizeProgress(a), B = sanitizeProgress(b), rank = { S: 4, A: 3, B: 2, C: 1, '―': 0, '': -1 };
    const lessons = { ...A.lessons };
    for (const [k, v] of Object.entries(B.lessons)) { const x = lessons[k]; lessons[k] = x ? { tries: Math.max(x.tries, v.tries), best: rank[v.best] > rank[x.best] ? v.best : x.best, pass: x.pass || v.pass, levels: [...new Set([...x.levels, ...v.levels])] } : v; }
    const maxMap = (p, q) => { const o = { ...p }; for (const [k, v] of Object.entries(q)) o[k] = Math.max(o[k] || 0, v); return o; };
    return sanitizeProgress({ lessons, time: Math.max(A.time, B.time), landings: Math.max(A.landings, B.landings), read: [...A.read, ...B.read], quiz: maxMap(A.quiz, B.quiz), bookQuiz: maxMap(A.bookQuiz, B.bookQuiz), atc: { ...A.atc, ...B.atc } });
  }

  FL.school = {
    LEVELS, level, CHECKLISTS, ATC_Q, TGT_LABEL, DP, FREE_STARTS, HOW,
    T_ALT, T_HDG, T_SPD, stepSL, stepTurn, guideText, stepGuide, fillText,
    lesson, lessonOrder, stageOf, startLesson, startFree, freeUpdate, ctx, update, nextStep, checklistNext, checklistItem, checklistText, answerAtc, abort, endLesson, failNow,
    STORE_KEY, PROG_KEY, RECORD_NOTE, scrub, recordFromLesson, sanitizeRecord, sanitizeProgress, noteLesson, loadRecords, saveRecords, addRecord, deleteRecord,
    loadProgress, saveProgress, exportJSON, importJSON, mergeRecords, mergeProgress,
  };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
