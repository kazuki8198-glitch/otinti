// FLIGHT LAB — syllabus.js
// The lessons, in the order of the publicly described ANA cadet basic training (London ground school in English →
// Piper Archer at Sanford up to the first solo → navigation, crosswinds, diversions → instrument flying → Piper Seminole
// with engine failures → CRM / TEM). The ORDER follows public information; the CONTENT of each lesson is this teaching
// tool's own design based on FAA public material (Airplane Flying Handbook, the ACS, AIM) — it is not ANA's syllabus,
// not Acron Aviation's syllabus and not an SOP. Speeds: the published Archer III G1000 training checklist and a published
// PA-44 maneuver guide (sources in the documents); tolerances: the FAA Private Pilot ACS where it gives one (the basic
// level), otherwise teaching values. Every step says WHAT to do, WHICH keys do it and WHY (the brief).
(function (FL) {
  'use strict';
  const SC = FL.school, ph = FL.physics;
  const { T_ALT, T_HDG, T_SPD, stepSL, stepTurn } = SC;
  const AR = ph.AIRCRAFT.find(a => a.id === 'pa28').v, SM = ph.AIRCRAFT.find(a => a.id === 'pa44').v;
  const w180 = a => ((a % 360) + 540) % 360 - 180;
  const KEYS = {
    pitch: 'S＝機首上げ・W＝機首下げ（離すとその姿勢を保つ）', roll: 'A / D＝左右に傾ける', rud: 'Q / E＝ラダー（ボールを中央へ）', thr: 'R＝スロットル増・F＝減',
    trim: 'T＝いまの速度でトリム（手放しで水平）', flaps: 'V＝フラップを 1 段下げる（最後まで行くと UP に戻る）', brake: 'B / Space＝ブレーキ', gear: 'G＝脚の上げ下げ',
    feather: '[＝左のプロペラをフェザー・]＝右', rtrim: 'Z / X＝ラダートリム 左 / 右（片発で足を楽に）',
  };
  const k = (...a) => a.map(x => KEYS[x] || x).join('　');
  const distNm = (L, id) => { const w = FL.avionics.wpt(id); return w ? FL.avionics.neDistNm(ph.ne(L.s), w) : 99; };
  const rwyNm = L => { const s = ph.ne(L.s); return Math.hypot(s.n - (ph.LAB_RWY.n + 600), s.e - ph.LAB_RWY.e) / 1852; };
  const liveSide = L => (L.s.eng[0].failed ? 1 : -1);            // +1: the right engine runs (bank right), −1: the left
  const deadName = L => (L.s.eng[0].failed ? '左' : '右');

  // ---------------------------------------------------------------- shared step groups
  // the landing: a stabilised final, then the flare and the touchdown (graded from the touchdown record, sink measured before contact)
  function landingSteps(vref, o = {}) {
    const flaps = o.flaps != null ? o.flaps : o.twin ? 2 : 3;
    return [
      { name: 'ファイナル（安定した進入）', g: { kt: vref, fpm: -Math.round(vref * 5.3), flaps, gear: true, how: 'approach' }, keys: k('thr', 'pitch', 'roll', 'rud'),
        say: `ファイナル：${vref} kt・3°（PAPI 赤 2 白 2）でセンターラインに乗る。地上 500 ft で安定していなければゴーアラウンド`,
        tgt: { spd: T_SPD(vref, 5), cl: [0, 30], gp: [3, 0.9] }, gradeWhen: c => c.aglR < 500 && c.aglR > 60 && c.along < 250, until: c => c.aglR < 40 || c.onGround, max: 360, grade: true },
      { name: o.short ? '短距離接地' : '接地', keys: k('thr', 'pitch', 'brake'),
        g: '目安：滑走路の端を越えたらアイドル（F）。地上 10〜15 ft から滑走路の先を見ながら S で少しずつ機首を上げ、最後は機首上げ 約 5〜8°。直し方：浮き上がったら引くのを止めて待つ、沈みが速ければ少し強く引く',
        say: o.short ? '目標点（端から 300 m の太い標識）に接地。すぐにアイドル・ブレーキ（B）' : '滑走路の端を越えたらアイドル、地上 10〜15 ft でフレアして主輪から接地。止まるまでセンターラインを保つ',
        until: c => c.onGround && c.gsK < 3, max: 150,
        check: (c, L, st) => {
          const td = L.s.td;
          if (td && !st.td && L.s.t - td.t < 2) { st.td = td; L.landings = (L.landings || 0) + 1; }
          if (st.td && c.onGround) st.stopAlong = c.along;
        },
        result: (L, st) => {
          const td = st.td, kk = L.level.k;
          if (!td) return [{ name: '接地', val: 'していない', std: '—', pass: false }];
          const sink = Math.round(300 * kk), du = td.along - 300, zone = o.short ? [Math.round(-60 * kk), Math.round(60 * kk)] : [Math.round(-100 * kk), Math.round(400 * kk)], cl = +(6 * kk).toFixed(1);
          const rows = [
            { name: '接地の降下率', val: `${td.fpm} fpm`, std: `${sink} fpm 以下`, pass: td.fpm <= sink },
            { name: '接地位置', val: `目標点から ${du >= 0 ? '+' : ''}${Math.round(du)} m`, std: `${zone[0]}〜+${zone[1]} m`, pass: du >= zone[0] && du <= zone[1] },
            { name: 'センターライン', val: `${Math.abs(td.cross).toFixed(1)} m`, std: `${cl} m 以内`, pass: Math.abs(td.cross) <= cl && td.onRunway },
            { name: '接地の速度', val: `${td.kias} kt`, std: `${vref - 15}〜${vref + 3} kt`, pass: td.kias >= vref - 15 && td.kias <= vref + 3 },
            { name: '主輪から接地', val: td.noseFirst ? '前輪から' : '主輪から', std: '前輪から接地しない', pass: !td.noseFirst },
          ];
          if (o.xwind) rows.push({ name: '接地時の横流れ', val: `${Math.abs(td.latV).toFixed(1)} m/s`, std: `${(1.5 * kk).toFixed(1)} m/s 以下`, pass: Math.abs(td.latV) <= 1.5 * kk },
            { name: '機首方向（滑走路と平行）', val: `${td.crab.toFixed(0)}°`, std: `±${Math.round(5 * kk)}°`, pass: td.crab <= 5 * kk });
          if (o.short) rows.push({ name: '停止距離', val: `${Math.round((st.stopAlong || td.along) - td.along)} m`, std: `${Math.round(400 * kk)} m 以内`, pass: (st.stopAlong || td.along) - td.along <= 400 * kk });
          if (td.bounces) rows.push({ name: 'バウンド', val: `${td.bounces} 回`, std: 'なし', pass: false });
          return rows;
        } },
    ];
  }
  // the takeoff roll and the lift-off
  function takeoffRoll(vr, o = {}) {
    return { name: '離陸滑走とローテーション', keys: k('thr', 'rud', 'pitch'),
      g: `目安：スロットル全開（R を押し続ける）。右へ振られにくい双発以外は、プロペラの左偏向で機首が左へ行くので E（右ラダー）で押さえる。${vr} kt で S を押して機首上げ 約 ${o.twin ? 8 : 8}〜10°（PFD の目盛り「10」の手前）にして浮揚`,
      say: `フルパワー（R 長押し）。Q / E でセンターラインを保ち、${vr} kt（Vr）でローテーション`, until: c => !c.onGround && c.agl > 3, max: 90, grade: true, tgt: { cl: [0, 8] }, gradeWhen: c => c.onGround && c.kias > 15,
      check: (c, L, st) => { if (c.onGround) st.lastKias = c.kias; },
      result: (L, st) => { const tol = Math.round(5 * L.level.k) + 2; return [{ name: '浮揚速度', val: `${Math.round(st.lastKias || 0)} kt`, std: `${vr} ±${tol} kt`, pass: Math.abs((st.lastKias || 0) - vr) <= tol }]; } };
  }
  const stallRecovery = (vMin, extra = {}) => Object.assign({ name: '失速からの回復', keys: k('pitch', 'thr', 'roll', 'rud'),
    g: '目安：W で機首を水平線付近（0〜+5°）まで下げる → R で全開 → A / D で翼を水平。速度が付いたら上昇姿勢（約 +8°）へ。直し方：失速警報がまた鳴ったら引きすぎ。少し戻す',
    say: '回復！ ①機首を下げて迎え角を減らす ②フルパワー ③翼を水平 ④速度が付いたら上昇へ', until: (c, L, st) => c.vs > 100 && c.kias > vMin && st.t > 2, max: 45, grade: true, tgt: { hdg: T_HDG(20) },
    onStart: (L, c, st) => { st.min = c.alt; st.start = c.alt; }, check: (c, L, st) => { st.min = Math.min(st.min, c.alt); if (st.t > 4 && c.stall) st.second = true; },
    result: (L, st) => { const lim = Math.round(300 * L.level.k); return [{ name: '回復で失った高度', val: `${Math.round(st.start - st.min)} ft`, std: `${lim} ft 以内`, pass: st.start - st.min <= lim }, { name: '二次失速', val: st.second ? 'あり' : 'なし', std: 'なし', pass: !st.second }]; } }, extra);

  // ---------------------------------------------------------------- the stages
  const STAGES = [
    // ======================================================================= 0
    { id: 's0', title: '第 0 段階　地上学科（ロンドン相当・英語の座学）', phase: 'p1',
      desc: '公開情報では、座学はロンドンで英語で行う。ここでは G1000 型の計器の読み方と、学科の確認テストで準備する。',
      lessons: [
        { id: 'k1', tutor: 'g1000', title: 'G1000 型 PFD の読み方（チュートリアル）', goal: '速度・姿勢・高度・昇降率・方位・CDI の位置と読み方を、実際の表示で 1 つずつ' },
        { id: 'k2', read: true, title: 'PFD の読み取り練習', goal: 'ランダムな PFD の表示を読み取る 10 問・80% で合格' },
      ] },
    // ======================================================================= 1
    { id: 's1', title: '第 1 段階　Piper Archer の基礎操縦（ソロまで）', phase: 'p2',
      desc: '公開情報では、Sanford で単発機 Piper Archer を使い、レッスン 12 回と審査を経てソロ（単独飛行）へ。ここでは基本操作・離着陸・緊急操作を練習する。',
      lessons: [
        { id: 'a1', title: '姿勢・出力・トリム', goal: 'トリムを使い、操縦から手を離しても水平飛行が続く状態を作る', aircraft: 'pa28',
          why: '飛行機は「姿勢（機首の高さ）＋出力＝性能（速度と昇降率）」で飛ぶ。トリムは操縦の力を消す装置で、トリムが取れていれば手を離しても同じ姿勢・速度で飛び続ける。すべての操作の土台。',
          brief: ['<b>姿勢＋出力＝性能</b>。機首の高さ（ピッチ）とスロットルを決めれば、速度と昇降率が決まります。', 'キーボードの W / S は「機首の角度」を動かし、離すとその角度を保ちます（空島フライトと同じピッチ保持）。<b>T キー（トリム）</b>は「いま押さえている力」を飛行機に覚えさせる装置。T のあとは何もしなくても同じ姿勢が続きます。', '手順：①PFD の姿勢表示で機首を水平線に合わせる ②昇降率（VSI）が 0 付近、速度が落ち着いたら T ③手を離して高度が保たれるか見る。'],
          std: '高度 ±100 ft を連続 20 秒（基礎レベル）', setup: { at: 'area', kt: 100, hdg: 90 }, book: ['aero.forces', 'ops.trim'],
          steps: [
            { name: '姿勢と計器の確認', say: '何も操作せず、PFD の姿勢表示・速度・高度・昇降率がどう動くか 10 秒観察', keys: '操作しない（観察）', dur: 10 },
            { name: 'トリムで手放し水平飛行', g: { kt: 100, how: 'level' }, keys: k('pitch', 'thr', 'trim'), say: 'W / S で高度 {alt0} ft を保ち、昇降率が 0 付近になったら T。手を離して保つ', tgt: { alt: T_ALT(100) }, hold: 20, max: 120, grade: true, gradeWhen: (c, L, st) => st.t > 8 },
          ] },
        { id: 'a2', title: '直線水平飛行', goal: '高度・針路・速度を同時に保つ', aircraft: 'pa28',
          why: '巡航・航法・計器飛行のすべての基本。「外 8 割・計器 2 割」で姿勢を作り、計器で確認して小さく直す習慣をつける。',
          brief: ['視線は「外の水平線 8 割、計器 2 割」。姿勢の基準は窓の外の水平線、確認は PFD。', '高度が 50 ft ずれたら機首を 1〜2° 動かして戻す。速度はスロットル（R / F）で。速度を変えたらトリム（T）を取り直す。', '計器の見方（クロスチェック）：姿勢 → 高度 → 姿勢 → 方位 → 姿勢 → 速度…と、姿勢表示を中心に目を動かす。'],
          std: '高度 ±100 ft・針路 ±10°・速度 ±10 kt を連続 20 秒（自家用 ACS の水平直線飛行の許容幅を参考）', setup: { at: 'area', kt: 100, hdg: 90 }, book: ['ops.sl'],
          steps: [stepSL('直線水平飛行', 100, 20, { keys: k('pitch', 'roll', 'thr', 'trim') })] },
        { id: 'a3', title: '上昇・降下・レベルオフ', goal: '一定の速度で上昇・降下し、目標高度で水平に戻す', aircraft: 'pa28',
          why: '上昇は速度を機首で、降下率は出力で決める——「何で何を直すか」を体で覚える。レベルオフの遅れは高度逸脱（管制の指示違反）の原因になる。',
          brief: [`上昇：スロットル全開 → 機首を上げて <b>${AR.y} kt（Vy：最良上昇率速度）</b> を保つ。上昇中の速度は<b>機首</b>で合わせる（出力は全開のまま）。`, 'レベルオフは目標高度の<b>昇降率の 10%</b> 手前から始める（700 fpm なら 70 ft 手前）。機首を下げ、速度が付いたらパワーを巡航へ、最後にトリム。', '降下：パワーを絞って 90 kt・約 500 fpm。降下率のずれは<b>出力</b>で直す。'],
          std: `上昇 ${AR.y} ±10 kt、レベルオフ後 高度 ±100 ft を連続保持、降下 500 ±200 fpm`, setup: { at: 'area', kt: 100, hdg: 90 }, book: ['ops.climb'],
          steps: [
            { name: '上昇（Vy）', g: { kt: AR.y, pwr: 'full', how: 'climbFull' }, keys: k('thr', 'pitch', 'rud'), say: `フルパワー（R）で ${AR.y} kt を保って {alt1} ft まで上昇。ボールがずれたら E（右ラダー）`, tgt: { spd: T_SPD(AR.y) }, gradeWhen: (c, L, st) => st.t > 10 && c.alt < L.alt0 + 900, until: (c, L) => c.alt >= L.alt0 + 950, max: 240, grade: true },
            { name: 'レベルオフ', g: { kt: 100, how: 'level' }, keys: k('pitch', 'thr', 'trim'), say: '{alt1} ft で水平に戻し、速度が付いたらパワーを巡航へ。トリムを取って保つ', tgt: { alt: [L => L.alt0 + 1000, 100] }, hold: 15, max: 90, grade: true, gradeWhen: (c, L, st) => st.t > 6 },
            { name: '降下', g: { kt: 90, fpm: -500, how: 'rate' }, keys: k('thr', 'pitch', 'trim'), say: 'パワーを絞って 90 kt・約 500 fpm で {alt0} ft まで降下', tgt: { spd: T_SPD(90), vs: [-500, 200] }, gradeWhen: (c, L, st) => st.t > 12 && c.alt > L.alt0 + 150, until: (c, L) => c.alt <= L.alt0 + 60, max: 240, grade: true },
            { name: 'レベルオフ（降下から）', g: { kt: 100, how: 'level' }, keys: k('pitch', 'thr', 'trim'), say: '{alt0} ft で水平に戻し、パワーを巡航へ。保つ', tgt: { alt: T_ALT(100) }, hold: 15, max: 90, grade: true, gradeWhen: (c, L, st) => st.t > 6 },
          ] },
        { id: 'a4', title: '中程度の旋回（30°）', goal: 'バンク 30° で高度を保って 360° 旋回し、元の針路で止める', aircraft: 'pa28',
          why: '旋回では揚力の一部が横向きになるので、少し引いてパワーを足さないと沈む。ボール（横滑り計）を中央に保つ釣り合い旋回は、失速・スピン事故の予防の基本。',
          brief: ['バンクを取ると揚力の一部が横向きになり沈みます。<b>S で少し引いて機首をわずかに上げ</b>、パワーを少し足す。', 'ロールアウトはバンク角の半分（30° なら約 15°）手前から始める。', 'ボール（PFD の姿勢表示上部の三角の下の台形）を中央に。ずれたらずれた側のラダー（Q / E）：「ボールを踏む」。'],
          std: 'バンク 30 ±5°・高度 ±100 ft・ロールアウト ±10°', setup: { at: 'area', kt: 100, hdg: 90 }, book: ['aero.turn'],
          steps: [...stepTurn(-1, 30, '左 360° 旋回'), ...stepTurn(1, 30, '右 360° 旋回')] },
        { id: 'a5', title: '急旋回（45°）', goal: '実地試験の定番。バンク 45° で高度と速度を保つ', aircraft: 'pa28',
          why: '荷重倍数（G）と失速速度の関係を体で知る。45° では 1.41 G で失速速度が約 19% 上がる。自家用 ACS の課目（Steep Turns）。',
          brief: ['45° では荷重 1.4 G。<b>しっかり引いて機首を上げ、パワーを足す</b>。', '高度が下がり始めたら、<b>バンクを少し浅くしてから引く</b>（深いバンクのまま引いても旋回が締まるだけ）。', `速度は Va（${AR.va} kt：設計運動速度）以下で。ロールアウトは 20° 手前から。`],
          std: 'バンク 45 ±5°・高度 ±100 ft・速度 ±10 kt・ロールアウト ±10°（自家用 ACS の Steep Turns を参考）', setup: { at: 'area', kt: 95, hdg: 90 }, book: ['aero.turn', 'aero.vn'],
          steps: [...stepTurn(-1, 45, '左急旋回', { kt: 95, tgt: { spd: T_SPD(95) } }), ...stepTurn(1, 45, '右急旋回', { kt: 95, tgt: { spd: T_SPD(95) } })] },
        { id: 'a6', title: '低速飛行', goal: '失速警報を鳴らさずに、失速に近い速度で操縦する', aircraft: 'pa28',
          why: '離着陸は失速に近い低速で行う。低速では舵の効きが鈍く、「速度は機首・高度はパワー」になる（バックサイド）。失速の兆候を知り、近づかずに操縦する力をつける。',
          brief: ['パワーを絞り、速度が Vfe（白い帯の上端）以下になったらフラップを下げる（V キー）。', '<b>失速警報が鳴らない程度の低い速度</b>を保つ。低速では<b>速度は機首、高度はパワー</b>。', '舵の効きが鈍いので大きめに・ゆっくり。プロペラの影響でボールが右に寄りやすい（E）。'],
          std: '速度 +10/−0 kt・高度 ±100 ft・針路 ±10°・失速警報なし（自家用 ACS の Slow Flight を参考）', setup: { at: 'area', kt: 90, hdg: 90 }, book: ['aero.stall', 'ops.slow'],
          steps: [
            { name: '減速と外形変更', keys: k('thr', 'pitch', 'flaps'), g: '目安：スロットルを約 1,700 rpm まで絞り（F）、速度が落ちるにつれて S で機首を少しずつ上げて高度を保つ。白い帯の中でフラップ 25°（V を 2 回）。機首が上がろうとするので押さえる', say: 'パワーを絞って減速。白い帯に入ったらフラップ 25°。高度 {alt0} ft を保ちながら 58 kt まで', tgt: { alt: T_ALT(150) }, until: c => c.kias < 62 && c.flaps >= 2, max: 120, grade: true },
            { name: '低速飛行', g: { kt: 58, flaps: 2, how: 'slow' }, keys: k('pitch', 'thr', 'rud'), say: '58 kt・高度 {alt0} ft・針路 {hdg0}° を保つ。失速警報を鳴らさない', tgt: { alt: T_ALT(), hdg: T_HDG(), spd: [58, 5] }, hold: 20, max: 120, grade: true, gradeWhen: (c, L, st) => st.t > 6,
              check: (c, L, st) => { if (c.stall) st.stallT = (st.stallT || 0) + c.dt; },
              result: (L, st) => [{ name: '失速警報', val: st.stallT ? `${st.stallT.toFixed(1)} 秒` : 'なし', std: 'なし', pass: !st.stallT || st.stallT < 1 }] },
          ] },
        { id: 'a7', title: 'パワーオフ失速と回復', goal: '着陸形態での失速を体験し、高度の損失を少なく回復する', aircraft: 'pa28',
          why: '着陸進入中の失速（ベースからファイナルの旋回など）は重大事故の典型。兆候（警報・振動・舵の軽さ）を知り、迷わず「機首を下げる」を体に覚えさせる。',
          brief: ['フラップ 25°、パワーアイドル。高度を保つように機首をゆっくり上げ続けると失速します（警報と振動）。', '<b>回復：①機首を下げて迎え角を減らす ②フルパワー ③翼を水平 ④速度が付いたら上昇へ</b>。フラップは上昇を確認してから段階的に上げる。', '回復中に引きすぎると 2 回目の失速（二次失速）。'],
          std: '回復で失う高度 300 ft 以内・二次失速なし・針路 ±20°', setup: { at: 'area', kt: 75, hdg: 90, flaps: 2, thr: 0.2 }, book: ['aero.stall'],
          steps: [
            { name: '失速への進入', keys: k('thr', 'pitch'), g: '目安：スロットル アイドル（F）。高度を保つように、1 秒に 1° くらいのペースで S を短く押して機首を上げ続ける。失速警報 → 振動（バフェット）→ 機首や片翼が落ちる、の順に来る', say: 'アイドルにし、高度を保つように機首をゆっくり上げ続けて失速させる', until: c => c.stall && c.kias < 52, max: 100 },
            stallRecovery(AR.x - 4),
          ] },
        { id: 'a8', title: 'パワーオン失速と回復', goal: '離陸・上昇中の失速を体験し回復する', aircraft: 'pa28',
          why: '離陸直後に機首を上げすぎた失速は低高度で起きるため致命的。高出力ではプロペラの影響で機首が左へ振られ、片翼から落ちやすい（ラダーの大切さ）。',
          brief: ['クリーン形態、フルパワーで機首を 15〜20° 上げ続けると失速します。高出力なので機首が左へ振られやすい → <b>E（右ラダー）でボールを中央</b>に。', '回復は同じ：<b>迎え角を減らす → 出力（すでに全開）→ 翼水平 → 上昇</b>。'],
          std: '回復で失う高度 300 ft 以内・針路 ±20°', setup: { at: 'area', kt: 75, hdg: 90, thr: 1 }, book: ['aero.stall', 'aero.left'],
          steps: [
            { name: '失速への進入', keys: k('pitch', 'rud'), g: '目安：全開のまま、機首上げ 約 15〜20°（PFD の目盛り「10」と「20」の間）で保つ。ボールが右に寄ったら E（右ラダー）', say: 'フルパワーのまま機首を 15〜20° に上げ、失速するまで保つ', until: c => c.stall && c.kias < 55, max: 100 },
            stallRecovery(AR.x),
          ] },
        { id: 't1', title: '通常離陸と上昇', goal: 'センターラインを保って加速し、Vr で浮揚、Vy で上昇', aircraft: 'pa28',
          why: '離陸は準備（チェックリスト・ブリーフィング・管制の許可）から始まる。プロペラ機は加速中に機首が左へ振れるため、右ラダーでセンターラインを保つ。',
          brief: ['離陸前点検（チェックリスト：Enter で 1 項目ずつ）→ 管制の離陸許可を正しく復唱（1〜3 キー）。', `フルパワー（R 長押し）。<b>E（右ラダー）で機首をセンターラインに</b>（プロペラの左偏向）。`, `<b>${AR.rotate} kt（Vr）</b>で S を押して機首を約 8° 上げて浮揚。<b>${AR.y} kt（Vy）</b>で上昇し、地上 1,000 ft まで（滑走路の方位を保つ）。`],
          std: `センターライン ±8 m・浮揚 ${AR.rotate} ±7 kt・上昇 ${AR.y} ±10 kt・針路 ±10°`, setup: { at: 'runway' }, book: ['ops.takeoff', 'aero.left'],
          steps: [
            { name: '離陸前点検', checklist: 'before_takeoff' },
            { name: '離陸許可の復唱', atc: 'takeoff' },
            takeoffRoll(AR.rotate),
            { name: '初期上昇', g: { kt: AR.y, pwr: 'full', how: 'climbFull' }, keys: k('pitch', 'rud', 'trim'), say: `${AR.y} kt で上昇、滑走路の方位 360° を保つ。地上 1,000 ft まで`, tgt: { spd: T_SPD(AR.y), rhdg: [0, 10] }, gradeWhen: c => c.aglR > 150, until: c => c.aglR >= 1000, max: 200, grade: true },
          ] },
        { id: 't2', title: '場周経路（トラフィックパターン）', goal: 'ダウンウインドから左場周を飛んで着陸する', aircraft: 'pa28',
          why: '空港の周りの決まった経路（場周経路）を全員が同じ高さ・同じ形で飛ぶことで、互いを見つけやすくし衝突を防ぐ（AIM 4-3-3）。高度・位置・速度・外形変更の段取りが着陸の質を決める。',
          brief: ['左場周（LAB RWY 36）。<b>ダウンウインド</b>：地上 1,000 ft、90 kt、滑走路から約 1.6 km 離れて平行に（磁方位 180°）。', '滑走路の進入端の真横（アビーム）で<b>パワーを絞り（約 1,500 rpm）、フラップ 10°</b>、降下開始。', '進入端が斜め後ろ 45° に見えたら左旋回して<b>ベース</b>（方位 090°）、フラップ 25°、75 kt。', `最終進入（<b>ファイナル</b>）はセンターラインに合わせて ${AR.appr} kt、フラップ 40°。PAPI が赤 2 白 2 なら正しい角度（3°）。`],
          std: `ダウンウインド 高度 ±100 ft・速度 ±10 kt、ファイナル ${AR.appr} ±5 kt、接地は下の着陸基準`, setup: { at: 'downwind' }, book: ['ops.pattern'],
          steps: [
            { name: '着陸許可の復唱', atc: 'landing' },
            { name: 'ダウンウインド', g: { kt: 90, how: 'level' }, keys: k('pitch', 'roll', 'thr', 'trim'), say: 'ダウンウインド：地上 1,000 ft・90 kt・滑走路と平行（方位 180°）。着陸前点検を思い出す', tgt: { aglR: [1000, 100], spd: T_SPD(90), dwhdg: [0, 10] }, until: c => c.along < 0, max: 150, grade: true },
            { name: '降下開始（アビーム）', g: { kt: 80, fpm: -500, flaps: 1, how: 'pattern' }, keys: k('thr', 'flaps', 'pitch'), say: '進入端の真横。パワーを絞り（F）、フラップ 10°（V）。80 kt で降下開始', until: c => c.along < -800, max: 100,
              check: (c, L, st) => { if (c.flaps >= 1) st.flap = true; }, result: (L, st) => [{ name: 'フラップ 10°', val: st.flap ? '操作した' : 'していない', std: 'アビームで', pass: !!st.flap }] },
            { name: 'ベース', g: { kt: 75, fpm: -500, flaps: 2, how: 'pattern' }, keys: k('roll', 'flaps', 'thr'), say: '左旋回してベース（方位 090°）。フラップ 25°、75 kt で降下。センターラインの延長に近づいたら左旋回してファイナルへ', until: c => Math.abs(c.cross) < 150 && Math.abs(w180(c.hdg - 360)) < 40 && c.along < -400, max: 180, tgt: { spd: T_SPD(75, 12) }, grade: true, gradeWhen: (c, L, st) => st.t > 10 },
            ...landingSteps(AR.appr),
          ] },
        { id: 't3', title: '通常着陸', goal: '安定した進入から、接地帯にやさしく接地する', aircraft: 'pa28',
          why: '着陸の質は進入の安定で決まる。「500 ft で安定していなければゴーアラウンド」は世界中の運航で使われる考え方（安定進入）。',
          brief: [`ファイナル（約 5 km）から。<b>${AR.appr} kt・3° の進入角</b>（PAPI 赤 2 白 2、昇降率 約 −370 fpm）、フラップ 40°。`, '<b>地上 500 ft で安定</b>（速度・進入角・センターライン）していなければゴーアラウンド。', '滑走路の端を越えたらアイドル、地上 10〜15 ft で S を少しずつ押して機首を上げる（フレア）。主輪から接地し、B でブレーキ。'],
          std: `ファイナル ${AR.appr} ±5 kt・センターライン ±30 m・進入角 3 ±0.9°、接地 300 fpm 以下・目標点の −100〜+400 m・センターライン ±6 m`, setup: { at: 'final', km: 5 }, book: ['ops.landing'],
          steps: [{ name: '着陸前点検', checklist: 'before_landing' }, ...landingSteps(AR.appr)] },
        { id: 't4', title: '着陸復行（ゴーアラウンド）', goal: '進入を中止して安全に上昇へ移る', aircraft: 'pa28',
          why: 'ゴーアラウンドは失敗ではなく、安全のための正しい判断。迷わず実行できるよう手順を体に覚えさせる。最大の危険はフラップを一度に上げて沈むこと、と機首の上げすぎ。',
          brief: [`「ゴーアラウンド」：<b>①フルパワー（R）②機首を上昇姿勢へ ③フラップを 25° に（V を押して 1 段ずつ…この教材では一周して UP に戻るので注意）④正の上昇を確認 ⑤${AR.x}〜${AR.y} kt で上昇、フラップを段階的に上げる</b>。`, '沈み込まないことが最重要です。'],
          std: '指示から 3 秒以内にフルパワー・高度損失 50 ft 以内・地上 800 ft まで上昇', setup: { at: 'final', km: 4 }, book: ['ops.goaround'],
          steps: [
            { name: '進入', g: { kt: AR.appr, fpm: -370, flaps: 3, how: 'approach' }, keys: k('thr', 'pitch'), say: `${AR.appr} kt・3° で進入を続ける`, tgt: { spd: T_SPD(AR.appr, 8), cl: [0, 40] }, until: c => c.aglR < 300, max: 180, grade: true, gradeWhen: c => c.aglR < 900 },
            { name: 'ゴーアラウンド', g: { kt: AR.x, pwr: 'full', flaps: 2, how: 'climbFull' }, keys: k('thr', 'pitch', 'flaps'), say: 'ゴーアラウンド！ フルパワー・機首上げ・フラップは段階的に', until: c => c.aglR > 800, max: 150, grade: true, tgt: { spd: [AR.x + 4, 12] }, gradeWhen: (c, L, st) => st.t > 8,
              onStart: (L, c, st) => { st.a0 = c.aglR; st.min = c.aglR; st.pwr = null; }, check: (c, L, st) => { st.min = Math.min(st.min, c.aglR); if (st.pwr === null && c.thr > 0.95) st.pwr = st.t; if (c.onGround) st.touched = true; },
              result: (L, st) => [{ name: 'フルパワーまで', val: st.pwr === null ? '—' : `${st.pwr.toFixed(1)} 秒`, std: '3 秒以内', pass: st.pwr !== null && st.pwr <= 3 }, { name: '高度損失', val: `${Math.round(st.a0 - st.min)} ft`, std: '50 ft 以内', pass: st.a0 - st.min <= 50 * L.level.k && !st.touched }] },
          ] },
        { id: 'e1', title: '離陸中止', goal: '離陸滑走中の異常で、安全に止まる', aircraft: 'pa28',
          why: '浮揚前の異常（計器の異常・エンジンの不調・何か変だ）は「止まる」が原則。判断が遅れるほど止まる距離が足りなくなる。',
          brief: ['「離陸中止（アボート）」の指示：<b>①スロットル アイドル（F を押し続ける）②ブレーキ（B）③ラダーでセンターライン</b>。', '判断は早く。迷ったら止める。'],
          std: '指示から 2 秒以内にアイドル・センターライン ±8 m・滑走路内で停止', setup: { at: 'runway' }, book: ['emg.abort'],
          steps: [
            { name: '離陸滑走', keys: k('thr', 'rud'), g: '目安：スロットル全開。異常の指示が来たら迷わず止める', say: 'フルパワーで離陸滑走を始める', until: c => c.kias > 40, max: 60 },
            { name: '離陸中止', keys: k('thr', 'brake', 'rud'), g: '目安：スロットルを一気にアイドル（F）→ ブレーキ（B）。前輪を接地させたまま、ラダー（Q / E）でまっすぐ', say: '離陸中止！ スロットル アイドル・ブレーキ・センターライン', until: c => c.onGround && c.gsK < 3, max: 60, grade: true, tgt: { cl: [0, 8] },
              onStart: (L, c, st) => { st.idle = null; }, check: (c, L, st) => { if (st.idle === null && c.thr < 0.05) st.idle = st.t; if (!c.paved && c.onGround) st.off = true; },
              result: (L, st) => [{ name: 'アイドルまで', val: st.idle === null ? '—' : `${st.idle.toFixed(1)} 秒`, std: '2 秒以内', pass: st.idle !== null && st.idle <= 2 }, { name: '停止位置', val: st.off ? '滑走路外' : '滑走路内', std: '滑走路内', pass: !st.off }] },
          ] },
        { id: 'e2', title: '離陸直後のエンジン故障', goal: '低高度のエンジン故障で、滑空速度を保ってほぼ正面に降りる', aircraft: 'pa28',
          why: '低高度で引き返そうとする旋回（いわゆる「インポッシブル・ターン」）は失速・スピンの典型事故。正面の安全な場所へ、速度を保って降りる。',
          brief: [`<b>すぐに機首を下げて ${AR.glide} kt（最良滑空速度）</b>。これが最優先（Aviate）。`, '<b>引き返さない</b>。左右 30° 以内の、できるだけ平らな場所へ。', 'フラップは降りる場所が確実になってから。接地直前にフレア。'],
          std: `5 秒以内に滑空姿勢・滑空速度 ${AR.glide} ±10 kt・針路 ±30°・安全に接地`, setup: { at: 'runway' }, book: ['emg.engine'],
          steps: [
            takeoffRoll(AR.rotate),
            { name: '上昇', g: { kt: AR.y, pwr: 'full', how: 'climbFull' }, keys: k('pitch', 'rud'), say: `${AR.y} kt で上昇`, until: c => c.aglR > 400, max: 150 },
            { name: 'エンジン故障：滑空', g: { kt: AR.glide, pwr: 'dead', how: 'glide' }, keys: k('pitch', 'roll', 'flaps'), say: `エンジン停止！ 機首を下げて ${AR.glide} kt。ほぼ正面の安全な場所へ`, fail: 'engine', until: c => c.onGround && c.gsK < 3, max: 200, grade: true, tgt: { spd: [AR.glide, 10], rhdg: [0, 30] }, gradeWhen: (c, L, st) => st.t > 5 && c.aglR > 30,
              onStart: (L, c, st) => { st.cap = null; }, check: (c, L, st) => { if (st.cap === null && c.pitch < 2 && c.kias < AR.glide + 8) st.cap = st.t; },
              result: (L, st) => [{ name: '滑空姿勢まで', val: st.cap === null ? '—' : `${st.cap.toFixed(1)} 秒`, std: '5 秒以内', pass: st.cap !== null && st.cap <= 5 }] },
          ] },
        { id: 'e3', title: '上空でのエンジン故障（滑走路へ滑空）', goal: '最良滑空速度で LAB RWY 36 まで戻り着陸する', aircraft: 'pa28',
          why: 'エンジン故障時の優先順位は Aviate（速度を保つ）→ Navigate（降りる場所へ）→ Communicate（無線）。最良滑空速度を保つことが滑空距離を最大にする。',
          brief: [`<b>${AR.glide} kt を保つ</b>（速すぎても遅すぎても届かない）。`, 'MFD の地図で LAB RWY を確認し、まっすぐ向かう。高すぎれば S 字や大きめの旋回で高度を捨てる。届かないと判断したら近くの平らな場所へ（湖は避ける）。', '無線：余裕ができたら MAYDAY（1〜3 キーで正しい通報を選ぶ）。フラップは滑走路が確実になってから。'],
          std: `滑空速度 ${AR.glide} ±8 kt・滑走路（または安全な場所）に接地`, setup: { at: 'away', from: 'rwy', brg: 70, km: 4, altFt: 3000, toward: false, hdg: 70, kt: 100 }, book: ['emg.engine'],
          steps: [
            { name: '巡航', g: { kt: 100, how: 'level' }, keys: k('pitch', 'thr'), say: '空港から離れる方向へ水平飛行。まもなくエンジンが止まります', dur: 6 },
            { name: 'エンジン故障：滑空開始', g: { kt: AR.glide, pwr: 'dead', how: 'glide' }, keys: k('pitch', 'roll'), say: `エンジン停止！ 機首を下げて ${AR.glide} kt。LAB RWY 36 へ向けて旋回`, fail: 'engine', tgt: { spd: [AR.glide, 8] }, grade: true, gradeWhen: (c, L, st) => st.t > 8, until: (c, L, st) => st.t > 25, max: 30 },
            { name: '遭難通報', atc: 'mayday' },
            { name: '滑走路へ', g: { kt: AR.glide, pwr: 'dead', how: 'glide' }, keys: k('pitch', 'roll', 'flaps'), say: `${AR.glide} kt で LAB RWY 36 へ滑空し着陸。届くと確信できてからフラップ`, tgt: { spd: [AR.glide, 8] }, until: c => c.onGround && c.gsK < 3, max: 420, grade: true, gradeWhen: c => c.aglR > 300,
              check: (c, L, st) => { if (c.onGround && !st.td) { st.td = true; st.paved = c.paved; } },
              result: (L, st) => [{ name: '着陸場所', val: st.paved ? '滑走路' : '滑走路外', std: '滑走路', pass: !!st.paved }] },
          ] },
        { id: 'c1', title: 'ソロ前の審査（模擬 Check Flight）', goal: '離陸・空中操作・失速・緊急・着陸を通しで審査', aircraft: 'pa28',
          why: '公開情報では、レッスン 12 回の後の審査に合格するとソロへ進む。ここではその「通し」の練習を、これまでの課目の基準で行う（実際の審査基準ではない）。',
          brief: ['審査官の指示に従って飛びます。<b>1 項目でも基準外なら不合格</b>。', '内容：離陸 → 直線水平 → 急旋回（左）→ パワーオフ失速 → 模擬エンジン故障（滑走路へ滑空・着陸）。', '各項目の前に目標値を声に出して確認しましょう（教官に伝えるつもりで）。'],
          std: '各課目の基準と同じ', setup: { at: 'runway' }, book: ['intro.course'],
          steps: [
            { name: '離陸前点検', checklist: 'before_takeoff' },
            { name: '離陸許可の復唱', atc: 'takeoff' },
            takeoffRoll(AR.rotate),
            { name: '上昇', g: { kt: AR.y, pwr: 'full', how: 'climbFull' }, keys: k('pitch', 'rud', 'trim'), say: `${AR.y} kt で地上 2,500 ft まで上昇（右旋回して東の訓練空域へ）`, tgt: { spd: T_SPD(AR.y) }, gradeWhen: c => c.aglR > 200, until: c => c.aglR >= 2500, max: 330, grade: true, onEnd: (L, c) => { L.alt0 = Math.round(c.alt / 100) * 100; } },
            { name: '水平へ', g: { kt: 100, how: 'level' }, keys: k('pitch', 'thr', 'trim'), say: '水平飛行に移り 100 kt へ。トリムを取る', until: (c, L, st) => st.t > 25, max: 30, onEnd: (L, c) => { L.alt0 = Math.round(c.alt / 50) * 50; L.hdg0 = Math.round(c.hdg) || 360; } },
            stepSL('直線水平飛行', 100, 20, { keys: k('pitch', 'roll', 'thr', 'trim') }),
            ...stepTurn(-1, 45, '左急旋回', { kt: 95, tgt: { spd: T_SPD(95) } }),
            { name: '失速の準備', keys: k('thr', 'flaps', 'pitch'), g: '目安：スロットル アイドル・フラップ 25°。高度を保つように機首を上げ続ける', say: 'フラップ 25°・パワーアイドル。高度を保ちながら失速させる', until: c => c.stall && c.kias < 52, max: 150 },
            stallRecovery(AR.x - 4),
            { name: '模擬エンジン故障', g: { kt: AR.glide, pwr: 'dead', how: 'glide' }, keys: k('pitch', 'roll', 'flaps'), say: `エンジン故障！ ${AR.glide} kt で滑走路へ滑空し着陸`, fail: 'engine', until: c => c.onGround && c.gsK < 3, max: 700, grade: true, tgt: { spd: [AR.glide, 8] }, gradeWhen: c => c.aglR > 300,
              check: (c, L, st) => { if (c.onGround && !st.td) { st.td = true; st.paved = c.paved; } },
              result: (L, st) => [{ name: '着陸', val: st.paved ? '滑走路' : '滑走路外', std: '滑走路（または安全な不時着）', pass: !!st.paved }] },
          ] },
      ] },
    // ======================================================================= 2
    { id: 's2', title: '第 2 段階　航法・横風・目的地変更', phase: 'p3',
      desc: '公開情報では、地図と上空の風から針路を計算して目的地へ飛ぶ Navigation 訓練、目的地変更、エンジン停止の想定、現在地を見失った場合の対処を訓練する。',
      lessons: [
        { id: 'x1', title: '横風着陸', goal: '横風の中で、機体をまっすぐ滑走路に接地させる', aircraft: 'pa28',
          why: '横風で流されたまま接地すると、脚に横向きの力がかかって滑走路を外れる（ランウェイエクスカーション）。Archer の実証横風成分は 17 kt（それ以上が禁止という意味ではないが、技量と相談）。',
          brief: ['進入中は<b>機首を風上に向けたクラブ</b>でセンターラインを保つ（航跡を合わせる）。', '接地直前に<b>風下側のラダーで機首を滑走路と平行</b>にし、<b>風上側の翼を少し下げて（エルロン）</b>流されないようにする（ウイングロー）。', '接地後もエルロンは風上側へ。速度が落ちるほど大きく。'],
          std: '通常着陸の基準＋接地時の横流れ 1.5 m/s 以下・機首方向 ±5°', setup: { at: 'final', km: 5, wind: { rel: 60, kt: 12, gust: 1.3 } }, book: ['ops.xwind'],
          steps: [...landingSteps(AR.appr, { xwind: true })] },
        { id: 'x2', title: '短距離着陸', goal: '目標点に正確に接地し、短い距離で止まる', aircraft: 'pa28',
          why: '短い滑走路・障害物のある空港で使う技術。速度と進入角の正確さがそのまま接地点の正確さになる。自家用 ACS の Short-Field Landing。',
          brief: [`フラップ 40°、<b>${AR.apprShort} kt</b> で正確に 3° の進入。`, '目標点（滑走路端から 300 m）の手前 0〜先 60 m 以内に接地（基礎レベル）。', '接地したらすぐにアイドル、ブレーキ（B を押し続ける）。'],
          std: '接地：目標点 ±60 m・接地後 400 m 以内に停止', setup: { at: 'final', km: 4.5, flaps: 3, kt: AR.apprShort }, book: ['ops.short'],
          steps: [...landingSteps(AR.apprShort, { short: true })] },
        { id: 'x3', title: '短距離離陸', goal: '最短の距離で浮揚し、Vx で障害物を越える', aircraft: 'pa28',
          why: '短い滑走路や前方の障害物を越える離陸。Vx（最良上昇角速度）は「水平距離あたり最も高く」上がれる速度。自家用 ACS の Short-Field Takeoff。',
          brief: ['ブレーキ（B）を踏んだままフルパワー（R）→ 回転が上がったらブレーキを離す。', `Vr ${AR.rotate} kt で浮揚し、<b>${AR.x} kt（Vx）</b>で障害物（地上 50 ft）を越えるまで上昇。その後 ${AR.y} kt（Vy）へ。`],
          std: `Vx ${AR.x} +5/−5 kt で地上 50〜300 ft を上昇`, setup: { at: 'runway' }, book: ['ops.short'],
          steps: [
            { name: 'ブレーキを踏んでフルパワー', keys: k('brake', 'thr'), say: 'B を押したまま R でフルパワー。回転が上がりきったら B を離す', g: '目安：B（ブレーキ）を押したまま R を長押し。エンジンの回転が安定したら B を離して滑走開始', until: c => c.thr > 0.95 && c.gsK > 5, max: 40 },
            takeoffRoll(AR.rotate),
            { name: 'Vx で上昇', g: { kt: AR.x, pwr: 'full', how: 'climbFull' }, keys: k('pitch', 'rud'), say: `${AR.x} kt（Vx）で地上 300 ft まで上昇（障害物を越える）`, tgt: { spd: [AR.x, 5], rhdg: [0, 10] }, gradeWhen: c => c.aglR > 50 && c.aglR < 300, until: c => c.aglR > 300, max: 90, grade: true },
            { name: 'Vy へ', g: { kt: AR.y, pwr: 'full', how: 'climbFull' }, keys: k('pitch', 'trim'), say: `機首を少し下げて ${AR.y} kt（Vy）、地上 1,000 ft まで`, tgt: { spd: T_SPD(AR.y) }, gradeWhen: (c, L, st) => st.t > 8, until: c => c.aglR > 1000, max: 150, grade: true },
          ] },
        { id: 'n1', title: 'VOR の追跡', goal: 'VOR 局に向かうコースに乗り、局通過まで追跡する', aircraft: 'pa28',
          why: 'VOR は GPS が使えないときの基本の電波航法（FAA の Minimum Operational Network として維持されている）。CDI の針の動きを読んで風の修正角を見つける力は、計器飛行の土台になる。',
          brief: ['PFD の <b>CDI</b>（HSI の中のコースの針）を使います。下のパネルの <b>CDI</b> ボタンで NAV1 に切り替え、CRS（−/+）でコースを合わせる。', '<b>TO 表示で針が右なら右へ修正（針の方へ飛ぶ）</b>。針が中央に戻り始めたら修正を半分戻す（ブラケッティング）。風があると、針が止まる針路＝風の修正角。', '1 ドット＝2°。局に近づくほど針は敏感に。局上空で TO が FROM に変わります。'],
          std: '追跡中 CDI ±1 ドット・高度 ±150 ft（局から 1 NM 以上の区間）', setup: { at: 'away', brg: 220, km: 22, altFt: 3000, toward: true, offset: 25, kt: 100, nav: 'VOR', obsOff: -40, wind: { rel: 80, kt: 12, gust: 0.6 } }, book: ['nav.vor'],
          steps: [
            { name: 'コースの設定と会合', g: { kt: 100, how: 'level' }, keys: 'パネルの CDI（NAV1）と CRS −/+、A / D で針路', say: 'NAV1 は LAB VOR（113.50）。CRS を局への方位 {brgV}° 付近に合わせ（CRS ボタン）、針が中央へ来るように会合する', until: (c, L) => Math.abs(c.cdi) < 1 && L.av.cdi === 'NAV1' && Math.abs(w180(L.av.crs - c.brgV)) < 12, max: 300 },
            { name: 'VOR 追跡', g: { kt: 100, how: 'level' }, keys: k('roll', 'pitch', 'trim'), say: '針を中央に保って VOR 局へ（局上空で TO→FROM）。針が止まる針路を探す', tgt: { cdi: [0, 1], alt: [L => L.alt0, 150] }, hold: 60, until: c => c.dmeV < 0.5, max: 720, grade: true, gradeWhen: c => c.dmeV > 1 },
          ] },
        { id: 'n2', title: '推測航法と目的地変更', goal: '針路と時間で目標へ飛び、途中の目的地変更で新しい針路・距離・時間を見積もる', aircraft: 'pa28',
          why: '公開情報では「地図に線を引き上空の風から針路を計算して目的地へ飛ぶ」「目的地変更に伴う再計算」を訓練する。計算（見積もり）→ 実行 → 確認、を素早く回す力。',
          brief: ['最初は LAB-A（架空の訓練点・赤い塔）へ。MFD の地図で方位と距離を確認し、風で流される分だけ風上へ針路を修正する。', '途中で「目的地変更」：LAB-F へ。<b>針路（磁方位）・距離（NM）・所要時間（分）</b>を見積もって入力し、すぐに新しい針路へ。', '見積もりのコツ：MFD の地図のレンジ環で距離、対地速度 GS で時間（距離 ÷ GS × 60）。'],
          std: '高度 ±200 ft・各目標の 1 NM 以内に到達・見積もり：針路 ±15°、距離と時間 ±20%', setup: { at: 'away', from: 'rwy', brg: 10, km: 2, altFt: 3000, hdg: 50, kt: 105, fpl: ['LABRW', 'LABEA'], wind: { rel: 270, kt: 12, gust: 0.6 } }, book: ['nav.dr', 'nav.divert'],
          steps: [
            { name: 'LAB-A へ', g: { kt: 105, how: 'level' }, keys: k('roll', 'pitch', 'thr', 'trim'), say: 'LAB-A（架空の訓練点）へ向かう。MFD の地図と GPS の DTK を見て、風上へ修正', tgt: { alt: [L => L.alt0, 200] }, until: (c, L) => distNm(L, 'LABEA') < 1.0 * L.level.k, max: 900, grade: true },
            { name: '目的地変更：見積もり', estimate: 'LABEF', keys: '下の入力欄に針路・距離・時間 → 「見積もりを確定」', say: '目的地変更！ LAB-F へ。針路（磁）・距離（NM）・所要時間（分）を見積もって入力し、すぐに旋回', until: (c, L) => !!L.estimate, max: 150,
              result: (L) => estimateRows(L) },
            { name: '管制へ連絡', atc: 'divert' },
            { name: 'LAB-F へ', g: { kt: 105, how: 'level' }, keys: k('roll', 'pitch', 'thr'), say: 'LAB-F へ向かう（MFD の D→ を使ってもよい）。到着を確認', tgt: { alt: [L => L.alt0, 200] }, until: (c, L) => distNm(L, 'LABEF') < 1.0 * L.level.k, max: 900, grade: true },
          ] },
        { id: 'n3', title: '現在地を見失ったとき（GPS 故障）', goal: 'GPS が使えない中、VOR と DME で位置を確かめて飛行場へ戻る', aircraft: 'pa28',
          why: '公開情報では「現在地を見失った場合の対処」も訓練する。慌てずに 5C（Climb・Communicate・Confess・Comply・Conserve）、使える航法装置で位置を確かめる。',
          brief: ['GPS が故障し、MFD の地図と GPS のコースが使えなくなります。', '①管制に正直に伝える（1〜3 キー）②CDI を NAV1（LAB VOR 113.50）に ③CRS を回して針が中央・TO になる方位＝局への方位 ④局へ向かい、DME の距離が減ることを確かめる ⑤局から LAB RWY へ（局の西南西 約 5.6 NM）。', '高度を上げると電波が届きやすく、地上の目標も見つけやすい（Climb）。燃料を節約（Conserve）。'],
          std: 'VOR 局の 1 NM 以内を通過・LAB RWY の 2 NM 以内に戻る・高度 ±300 ft', setup: { at: 'away', brg: 30, km: 20, altFt: 3000, hdg: 120, kt: 100 }, book: ['nav.lost', 'nav.vor'],
          steps: [
            { name: 'GPS 故障', say: 'GPS 信号を失いました（MFD の地図が使えません）。落ち着いて、まず高度と姿勢を保つ', g: { kt: 100, how: 'level' }, keys: k('pitch', 'thr'), fail: 'gps', dur: 8 },
            { name: '管制へ', atc: 'lost' },
            { name: 'VOR で位置を確かめる', g: { kt: 100, how: 'level' }, keys: 'パネルの CDI → NAV1、CRS −/+（局への方位を探す）', say: 'CDI を NAV1 に。CRS を回して針が中央・TO になる方位を探し、その方位へ旋回', until: (c, L) => L.av.cdi === 'NAV1' && Math.abs(c.cdi) < 1.5 && Math.abs(w180(c.hdg - c.brgV)) < 25, max: 300 },
            { name: 'VOR 局へ', g: { kt: 100, how: 'level' }, keys: k('roll', 'pitch'), say: '針を中央に保って局へ。DME（距離）が減ることを確かめる', tgt: { alt: [L => L.alt0, 300] }, until: c => c.dmeV < 1.0, max: 900, grade: true },
            { name: 'LAB RWY へ', g: { kt: 100, how: 'level' }, keys: k('roll', 'pitch'), say: 'LAB VOR から LAB RWY へ（局から方位 約 250°・5.6 NM）。滑走路が見えたら報告のつもりで', tgt: { alt: [L => L.alt0, 300] }, until: (c, L) => rwyNm(L) < 2, max: 600, grade: true },
          ] },
      ] },
    // ======================================================================= 3
    { id: 's3', title: '第 3 段階　計器飛行の導入', phase: 'p4',
      desc: '公開情報では、計器のみを頼りに飛ぶ計器飛行の訓練を行う。フード（外が見えない状態）で、PFD だけで飛ぶ。',
      lessons: [
        { id: 'i1', title: '基本計器飛行', goal: '計器だけで水平・標準旋回・上昇降下', aircraft: 'pa28',
          why: '雲の中では体の感覚（前庭感覚）が当てにならず、錯覚で姿勢を誤る（空間識失調）。計器を正しい順で見て、姿勢を作る（Attitude Instrument Flying）。',
          brief: ['外は見えません。<b>姿勢表示を中心に、放射状に目を動かす</b>（姿勢→高度→姿勢→方位→姿勢→速度）。', '標準旋回率（1 秒に 3°）：PFD の方位表示の上のマゼンタの線（旋回率の目安）を 3°/秒の印に合わせる。100 kt でバンク約 17°（速度 ÷ 10 ＋ 7）。', '上昇・降下は 500 fpm（VSI）。'],
          std: '水平 ±100 ft ±10°、旋回率 3 ±1 °/秒、昇降率 500 ±150 fpm（計器飛行 ACS を参考にした教材値）', setup: { at: 'area', kt: 100, hdg: 90, hood: true }, book: ['ifr.scan'],
          steps: [
            stepSL('計器による水平飛行', 100, 30, { keys: k('pitch', 'roll', 'thr', 'trim') }),
            { name: '標準旋回（左 90°）', g: { kt: 100, bank: 17, how: 'turn' }, keys: k('roll', 'pitch'), say: '標準旋回率で左へ 90° 旋回し {hdgL}° で止める', tgt: { alt: T_ALT(), arate: [3, 1] }, gradeWhen: (c, L, st) => Math.abs(st.turned) > 15 && Math.abs(st.turned) < 75, until: (c, L, st) => Math.abs(st.turned) > 80 && Math.abs(c.bank) < 5, max: 80, grade: true,
              result: (L, st) => { const d = Math.abs(w180(L.last.hdg - (L.hdg0 - 90))), tol = Math.round(10 * L.level.k); return [{ name: 'ロールアウト', val: `${Math.round(d)}° ずれ`, std: `±${tol}°`, pass: d <= tol }]; } },
            { name: '上昇 500 fpm', g: { kt: 85, fpm: 500, how: 'rate' }, keys: k('thr', 'pitch'), say: '500 fpm で {alt1} ft まで上昇（85 kt 前後）', tgt: { vs: [500, 150] }, gradeWhen: (c, L, st) => st.t > 8 && c.alt < L.alt0 + 900, until: (c, L) => c.alt > L.alt0 + 950, max: 200, grade: true },
            { name: '降下 500 fpm', g: { kt: 100, fpm: -500, how: 'rate' }, keys: k('thr', 'pitch'), say: '100 kt・500 fpm で {alt0} ft まで降下して水平に', tgt: { vs: [-500, 150] }, gradeWhen: (c, L, st) => st.t > 8 && c.alt > L.alt0 + 100, until: (c, L) => c.alt < L.alt0 + 50, max: 200, grade: true },
          ] },
        { id: 'i2', title: '異常姿勢からの回復', goal: '計器だけで、機首上げ・機首下げの異常姿勢から回復する', aircraft: 'pa28',
          why: '空間識失調や計器の見落としで、気づいたら異常な姿勢になっていることがある。どちらの状態かを速く判断し、正しい順序で回復する（順序を間違えると、構造の破壊や失速に至る）。',
          brief: ['<b>機首上げ・低速</b>：①フルパワー ②機首を下げる ③翼を水平。', '<b>機首下げ・高速（スパイラル）</b>：①パワー アイドル ②<b>先に翼を水平</b> ③それから機首を上げる（傾いたまま引くと旋回が締まるだけ）。', '速度表示・姿勢表示・高度を素早く見て、どちらの状態か判断します。'],
          std: '失速なし・Vne 超過なし・荷重 3.8 G 以下・12 秒以内に水平', setup: { at: 'area', kt: 100, hdg: 90, hood: true }, book: ['ifr.upset'],
          steps: [
            { name: '異常姿勢 1（機首上げ）', keys: k('thr', 'pitch', 'roll'), g: '目安：①全開（R）②W で機首を水平線へ ③A / D で翼を水平。速度が 75 kt を超えたら水平飛行の姿勢（ほぼ 0°）へ', say: '操縦を渡します。回復して水平に！', upset: 'high', until: c => Math.abs(c.pitch) < 5 && Math.abs(c.bank) < 10 && c.kias > 75, max: 30, grade: true,
              check: (c, L, st) => { if (c.stall) st.stall = true; }, result: (L, st) => [{ name: '回復時間', val: `${st.t.toFixed(1)} 秒`, std: '12 秒以内', pass: st.t <= 12 }, { name: '失速', val: st.stall ? 'あり' : 'なし', std: 'なし', pass: !st.stall }] },
            { name: '水平飛行', g: { kt: 100, how: 'level' }, keys: k('pitch', 'thr'), say: 'いったん水平飛行（10 秒）', dur: 10 },
            { name: '異常姿勢 2（機首下げ・スパイラル）', keys: k('thr', 'roll', 'pitch'), g: '目安：①アイドル（F）②先に A / D で翼を水平（バンク 0）③それから S で機首をゆっくり水平線まで（荷重 3.8 G 以内、速度が赤線に近ければ特にゆっくり）', say: '操縦を渡します。回復して水平に！', upset: 'low', until: c => Math.abs(c.pitch) < 5 && Math.abs(c.bank) < 10 && c.vs > -300, max: 30, grade: true,
              onStart: (L, c, st) => { st.order = null; }, check: (c, L, st) => { st.maxK = Math.max(st.maxK || 0, c.kias); st.maxG = Math.max(st.maxG || 0, c.g); if (st.order === null && c.pitch > -3) st.order = Math.abs(c.bank) < 20; if (st.idle === undefined && c.thr < 0.25) st.idle = st.t; },
              result: (L, st) => [{ name: '回復時間', val: `${st.t.toFixed(1)} 秒`, std: '12 秒以内', pass: st.t <= 12 }, { name: '最大速度', val: `${Math.round(st.maxK)} kt`, std: `${AR.ne} kt 未満`, pass: st.maxK < AR.ne }, { name: '最大荷重', val: `${(st.maxG || 0).toFixed(1)} G`, std: '3.8 G 以下', pass: (st.maxG || 0) <= 3.8 },
                { name: '手順（翼を先に水平）', val: st.order ? 'できた' : 'できていない', std: '機首上げの前に翼水平', pass: !!st.order }, { name: 'パワー アイドル', val: st.idle !== undefined ? `${st.idle.toFixed(1)} 秒` : 'なし', std: '3 秒以内', pass: st.idle !== undefined && st.idle <= 3 }] },
          ] },
        { id: 'i3', title: '部分パネル（AHRS 故障）', goal: '主の姿勢・方位表示が故障した中で、予備計器で飛ぶ', aircraft: 'pa28',
          why: 'G1000 の姿勢・方位は AHRS という装置から来る。故障すると PFD の姿勢と方位に赤い × が出る。予備の姿勢指示器・速度計・高度計（スタンバイ計器）と磁気コンパスで飛び続ける力が必要。',
          brief: ['飛行中に <b>AHRS が故障</b>し、PFD の姿勢表示と方位表示が使えなくなります（赤い ×）。', '使えるのは <b>右下の予備の姿勢・速度・高度</b>と、速度テープ・高度テープ・昇降率、GPS の航跡（TRK）。', '旋回は浅いバンク（10〜15°）で、航跡（MFD 上の TRK）を見て止める。'],
          std: '高度 ±150 ft・針路（航跡）±15°（60 秒）', setup: { at: 'area', kt: 95, hdg: 90, hood: true }, book: ['ifr.partial'],
          steps: [
            { name: '故障の発生', fail: 'ahrs', keys: k('pitch', 'roll'), say: 'AHRS 故障！ PFD の姿勢・方位が使えません。右下の予備計器に目を移す', g: { kt: 95, how: 'level', pp: true }, dur: 8 },
            { name: '予備計器で水平飛行', g: { kt: 95, how: 'level', pp: true }, keys: k('pitch', 'roll', 'thr'), say: '予備の姿勢指示器・高度・昇降率で {alt0} ft、航跡 {hdg0}° を保つ', tgt: { alt: T_ALT(150), trk: [L => L.hdg0, 15] }, hold: 40, max: 180, grade: true, gradeWhen: (c, L, st) => st.t > 6 },
            { name: '浅い旋回で右 90°', g: { kt: 95, bank: 12, how: 'turn', pp: true }, keys: k('roll', 'pitch'), say: '予備の姿勢指示器でバンク 10〜15°。航跡が {hdgR}° に近づいたら戻す', tgt: { alt: T_ALT(150) }, until: (c, L, st) => Math.abs(w180(c.trk - (L.hdg0 + 90))) < 8 && Math.abs(c.bank) < 6, max: 120, grade: true,
              result: (L) => { const d = Math.abs(w180(L.last.trk - (L.hdg0 + 90))), tol = Math.round(15 * L.level.k); return [{ name: 'ロールアウト（航跡）', val: `${Math.round(d)}° ずれ`, std: `±${tol}°`, pass: d <= tol }]; } },
          ] },
        { id: 'i4', title: '待機経路（ホールディング）', goal: 'VOR を基準に、1 分の直線と標準旋回でレーストラックを飛ぶ', aircraft: 'pa28',
          why: '管制が順番待ちや天候待ちで使う待機経路。決まった形を正確に飛ぶことで、他機との間隔が保たれる（AIM 5-3-8）。',
          brief: ['インバウンドコース 090°（局へ東向き）で VOR 局へ。局通過（TO→FROM）で<b>右へ標準旋回</b>してアウトバウンド 270° へ。', 'アウトバウンドは<b>1 分</b>（タイマーのつもりで数える）。', '右へ標準旋回してインバウンド 090° のコースに乗り直し、局へ戻る。'],
          std: '旋回率 3 ±1 °/秒・アウトバウンド 60 ±15 秒・高度 ±100 ft', setup: { at: 'away', brg: 270, km: 9, altFt: 3000, hdg: 90, kt: 100, nav: 'VOR', obs: 90 }, book: ['ifr.hold'],
          steps: [
            { name: '局へ向かう', g: { kt: 100, how: 'level' }, keys: k('roll', 'pitch'), say: 'インバウンドコース 090° で LAB VOR へ', tgt: { cdi: [0, 1.5], alt: [L => L.alt0, 100] }, until: c => c.dmeV < 0.3, max: 420, grade: true, gradeWhen: c => c.dmeV > 1 },
            { name: 'アウトバウンドへ旋回', g: { kt: 100, bank: 17, how: 'turn' }, keys: k('roll', 'pitch'), say: '局通過。右へ標準旋回でアウトバウンド 270° へ', tgt: { arate: [3, 1], alt: [L => L.alt0, 100] }, gradeWhen: (c, L, st) => st.t > 4 && Math.abs(w180(c.hdg - 270)) > 20, until: c => Math.abs(w180(c.hdg - 270)) < 8 && Math.abs(c.bank) < 8, max: 100, grade: true },
            { name: 'アウトバウンド 1 分', g: { kt: 100, how: 'level' }, keys: k('pitch', 'roll'), say: 'アウトバウンド。1 分数えて、右旋回を始める', tgt: { alt: [L => L.alt0, 100] }, until: (c, L, st) => st.t > 20 && Math.abs(c.bank) > 12, max: 120, grade: true,
              result: (L, st) => [{ name: 'アウトバウンド時間', val: `${Math.round(st.t)} 秒`, std: '60 ±15 秒', pass: Math.abs(st.t - 60) <= 15 }] },
            { name: 'インバウンドへ', g: { kt: 100, bank: 17, how: 'turn' }, keys: k('roll', 'pitch'), say: '右へ標準旋回してインバウンドコース 090° に乗り、局へ', tgt: { alt: [L => L.alt0, 100] }, until: c => Math.abs(c.cdi) < 1 && Math.abs(w180(c.hdg - 90)) < 15, max: 200, grade: true },
          ] },
        { id: 'i5', title: 'ILS 進入', goal: 'ローカライザーとグライドスロープに乗って、決心高度まで計器で進入する', aircraft: 'pa28',
          why: 'ILS は雲の下限が低いときに滑走路へ降りるための精密進入。決心高度（DA）で滑走路が見えなければ必ず進入復行（ミスト・アプローチ）する。',
          brief: ['NAV1 が I-LAB（109.90）、CDI が NAV1（LOC）。<b>CDI の針＝ローカライザー（左右）、右端の菱形＝グライドスロープ（上下）</b>。', '針が動き始めたら滑走路の方位 360° へ旋回して乗る。菱形が中央に下りてきたら、パワーを絞り 80 kt・約 −430 fpm で降下（フラップ 10°）。', '<b>決心高度（地上 200 ft）</b>でフードが外れ、滑走路が見えたら着陸。'],
          std: 'LOC・GS ±1 ドット（地上 1,000〜200 ft の 85% 以上）＋着陸', setup: { at: 'ils', km: 14, altFt: 2000, hood: true, nav: 'ILS' }, book: ['ifr.ils'],
          steps: [
            { name: '進入許可の復唱', atc: 'ils' },
            { name: 'ローカライザー会合', g: { kt: 90, how: 'level' }, keys: k('roll', 'pitch', 'thr'), say: '針路 330° で会合。CDI の針が中央に近づいたら滑走路方位 360° へ', until: c => Math.abs(c.loc) < 1 && Math.abs(w180(c.hdg - 360)) < 15, max: 420 },
            { name: 'ILS 追跡', g: { kt: 80, fpm: -430, flaps: 1, how: 'ils' }, keys: k('thr', 'pitch', 'roll', 'flaps'), say: 'グライドスロープに乗って降下。両方の針を中央に（決心高度 地上 200 ft）', tgt: { loc: [0, 1], gs: [0, 1] }, gradeWhen: c => c.aglR < 1000 && c.aglR > 200, until: c => c.aglR < 200, max: 600, grade: true },
            { name: '決心高度：滑走路視認・着陸', keys: k('thr', 'pitch', 'brake'), g: '目安：滑走路の端を越えたらアイドル。地上 10〜15 ft から S で少しずつ機首を上げ、最後は機首上げ 約 5°', say: '決心高度。滑走路が見えました。着陸', hoodOff: true, until: c => c.onGround && c.gsK < 3, max: 150,
              check: (c, L, st) => { const td = L.s.td; if (td && !st.td) { st.td = td; } },
              result: (L, st) => [{ name: '着陸', val: st.td && st.td.onRunway ? `滑走路（${st.td.fpm} fpm）` : '滑走路外', std: '滑走路に安全に（600 fpm 未満）', pass: !!st.td && st.td.onRunway && st.td.fpm < 600 }] },
          ] },
      ] },
    // ======================================================================= 4
    { id: 's4', title: '第 4 段階　Piper Seminole（双発）', phase: 'p5',
      desc: '公開情報では、双発機 Piper Seminole で片発停止や機材故障の対応を訓練し、最後の Check Flight を経てライセンスを取得する。',
      lessons: [
        { id: 'm1', title: '双発の離陸と上昇', goal: '引き込み脚の双発機で離陸し、脚を上げて Vy で上昇', aircraft: 'pa44',
          why: '双発機は速く重く、脚を格納する。離陸前に「片発停止ならどうするか」を必ずブリーフィングする（速度の赤線 Vmc と青線 Vyse を言えること）。',
          brief: [`離陸前点検とブリーフィング：<b>Vr ${SM.rotate}・Vyse ${SM.yse}（青線）・Vmc ${SM.mc}（赤線）</b>。`, `フルパワー。左右逆回転のプロペラなので、単発機ほど左に振られない。${SM.rotate} kt でローテーション。`, '<b>正の上昇率</b>（VSI がプラス・高度が増えている）を確認したら<b>脚を上げる（G）</b>。使える滑走路が残っていない高さで。', `${SM.y} kt（Vy）で上昇。`],
          std: `センターライン ±8 m・浮揚 ${SM.rotate} ±7 kt・地上 500 ft までに脚 UP・上昇 ${SM.y} ±10 kt`, setup: { at: 'runway' }, book: ['me.basics'],
          steps: [
            { name: '離陸前点検', checklist: 'ms_before_takeoff' },
            { name: '離陸許可の復唱', atc: 'takeoff' },
            takeoffRoll(SM.rotate, { twin: true }),
            { name: '正の上昇・脚上げ', g: { kt: SM.y, pwr: 'full', how: 'climbFull' }, keys: k('gear', 'pitch'), say: '正の上昇を確認して脚 UP（G）', until: (c, L) => !c.gearDown || c.aglR > 600, max: 60,
              result: (L, st) => [{ name: '脚上げ', val: !L.s.gearDown ? `地上 ${Math.round(L.last.aglR)} ft で UP` : '上げていない', std: '地上 500 ft まで', pass: !L.s.gearDown && L.last.aglR <= 600 }] },
            { name: '上昇', g: { kt: SM.y, pwr: 'full', how: 'climbFull' }, keys: k('pitch', 'trim'), say: `${SM.y} kt で地上 1,500 ft まで上昇`, tgt: { spd: T_SPD(SM.y), rhdg: [0, 10] }, gradeWhen: c => c.aglR > 300, until: c => c.aglR > 1500, max: 200, grade: true },
          ] },
        { id: 'm2', title: '上空での片発停止（Identify・Verify・Feather）', goal: '片方のエンジンが止まったとき、方向を保ち、止まった側を特定してフェザーする', aircraft: 'pa44',
          why: '片発になると、生きているエンジンの推力で機首が止まった側へ振られ（非対称推力）、止まったプロペラの抗力が加わる。ラダーで方向を保ち、正しいエンジンをフェザーしないと上昇できない。生きているエンジンを止めるのが最悪の誤り。',
          brief: [`まず<b>方向を保つ</b>：機首が振られる側と反対のラダー（機首が左へ振られたら E）。<b>速度 ${SM.yse} kt（青線 Vyse）</b>。`, '<b>Identify（特定）</b>：踏んでいない足の側のエンジンが止まっている（Dead foot, dead engine）。<b>Verify（確認）</b>：そのスロットルを絞っても何も変わらないこと（教材では説明のみ）。<b>Feather</b>：[＝左・]＝右 のキーでプロペラを止めて抗力を減らす。', '生きているエンジン側へ<b>2〜5° バンク</b>するとラダーが少なくて済み、横滑りが減る。キーボードでは Z / X のラダートリムで足を楽に。'],
          std: '針路 ±20°（故障直後）・30 秒以内に正しいエンジンをフェザー・その後 Vyse ±5 kt・針路 ±10° を連続保持', setup: { at: 'area', kt: 120, hdg: 90, altFt: 4000, gear: false }, book: ['me.oei', 'me.vmc'],
          steps: [
            { name: '巡航', g: { kt: 120, how: 'level' }, keys: k('pitch', 'thr'), say: '巡航中。まもなく片方のエンジンが止まります。フルパワー（R）で備える', dur: 10, onEnd: (L) => { L.s.opts.autoRud = false; } },
            { name: '片発停止：方向を保つ・特定・フェザー', g: { kt: SM.yse, pwr: 'dead', how: 'oei' }, keys: k('rud', 'thr', 'feather', 'rtrim'), say: 'エンジン故障！ 方向を保つ（ラダー）→ 全開 → Vyse → Dead foot, dead engine → 止まった側をフェザー',
              onStart: (L, c, st) => { const kind = (L.s.seed || 7) % 2 ? 'engL' : 'engR'; SC.failNow(L, kind); st.h0 = c.hdg; }, tgt: { hdg: [L => L.hdg0, 20] }, grade: true, until: (c, L) => L.s.eng.some(e => e.feather), max: 60,
              check: (c, L, st) => { st.dev = Math.max(st.dev || 0, Math.abs(w180(c.hdg - st.h0))); },
              result: (L, st) => { const good = L.s.eng.every(e => !e.feather || e.failed), when = st.t; return [{ name: 'フェザーした側', val: L.s.eng.some(e => e.feather) ? (good ? `止まった${deadName(L)}エンジン` : '生きているエンジン（重大な誤り）') : 'フェザーしていない', std: '止まったエンジン', pass: good && L.s.eng.some(e => e.feather) }, { name: 'フェザーまで', val: `${Math.round(when)} 秒`, std: '30 秒以内', pass: when <= 30 }]; },
              stopOnFail: '片発停止の処置が基準外でした' },
            { name: '片発で飛ぶ（Vyse）', g: { kt: SM.yse, pwr: 'dead', how: 'oei' }, keys: k('pitch', 'rud', 'roll', 'rtrim'), say: `Vyse ${SM.yse} kt、生きているエンジン側へ 2〜5° バンク、針路 {hdg0}° を保つ`, tgt: { spd: [SM.yse, 5], hdg: T_HDG(10), bank: [L => 3 * liveSide(L), 3, 'fixed'] }, hold: 30, max: 150, grade: true, gradeWhen: (c, L, st) => st.t > 8 },
            { name: '管制へ連絡', atc: 'oei' },
          ] },
        { id: 'm3', title: 'Vmc デモンストレーション', goal: '片発で速度を下げると方向が保てなくなる速度（Vmc）を知り、正しく回復する', aircraft: 'pa44',
          why: 'Vmc（赤線）より遅いと、ラダーをいっぱいに使っても方向を保てず、機体は止まった側へ横転する（Vmc ロール）。低高度では致命的。兆候が出たら「生きている側の出力を絞り、機首を下げる」で必ず回復できることを体験する（ACS の Vmc Demonstration）。',
          brief: [`左エンジンをアイドル（模擬停止）、右エンジン全開。機首を上げて<b>1 秒に約 1 kt</b> ずつ減速。ラダーで方向を保つ。`, '<b>方向が保てなくなる（ラダーいっぱいでも機首が止まった側へ回る）・失速警報・振動</b>のどれかが出たら即回復。', `<b>回復：①生きているエンジンの出力を絞る（F）②機首を下げる ③${SM.sse} kt（Vsse）以上に加速 ④方向を戻したら徐々に出力</b>。`],
          std: '兆候から 3 秒以内に出力を減らす・回復で失う高度 300 ft 以内・失速しない', setup: { at: 'area', kt: 100, hdg: 90, altFt: 5000, gear: false, thr: 0.8 }, book: ['me.vmc'],
          steps: [
            { name: '準備（左を模擬停止）', g: { kt: SM.sse + 8, how: 'level' }, keys: k('thr', 'rud', 'rtrim'), say: '左エンジンをアイドル（模擬停止）にします。右は全開（R）。ラダーで方向を保って Vsse 82 kt へ',
              onStart: (L) => { L.s.opts.autoRud = false; L.s.eng[0].thr = 0; }, until: (c, L, st) => st.t > 8 && c.thr > 0.95 && c.kias < SM.sse + 12, max: 60 },
            { name: '減速（Vmc に近づく）', g: '目安：S で機首を少しずつ上げ、1 秒に 1 kt くらいで減速。E（右ラダー）を増やして方向を保つ。ラダーがいっぱいになっても機首が左へ回り始めたら、それが Vmc', keys: k('pitch', 'rud'), say: 'ゆっくり減速。方向が保てなくなる・失速警報、のどれかで回復へ',
              onStart: (L, c, st) => { st.h0 = c.hdg; }, until: (c, L, st) => c.stall || Math.abs(w180(c.hdg - st.h0)) > 15 || c.kias < SM.mc - 4, max: 120,
              onEnd: (L, c, st) => { L.vmcAt = Math.round(c.kias); } },
            { name: '回復', g: { kt: SM.sse, how: 'level' }, keys: k('thr', 'pitch', 'rud'), say: '回復！ 右エンジンの出力を絞る（F）→ 機首を下げる → Vsse 以上へ加速 → 方向を戻す',
              onStart: (L, c, st) => { st.start = c.alt; st.min = c.alt; st.cut = null; }, check: (c, L, st) => { st.min = Math.min(st.min, c.alt); if (st.cut === null && c.thr < 0.7) st.cut = st.t; if (st.t > 3 && c.stall) st.stall = true; },
              until: (c, L, st) => c.kias > SM.sse && st.t > 3, max: 45, grade: true,
              result: (L, st) => [{ name: '方向を失った速度', val: `${L.vmcAt || '—'} kt`, std: `参考：赤線 ${SM.mc} kt（条件で変わる）`, pass: true },
                { name: '出力を減らすまで', val: st.cut === null ? '—' : `${st.cut.toFixed(1)} 秒`, std: '3 秒以内', pass: st.cut !== null && st.cut <= 3 },
                { name: '回復で失った高度', val: `${Math.round(st.start - st.min)} ft`, std: `${Math.round(300 * L.level.k)} ft 以内`, pass: st.start - st.min <= 300 * L.level.k }, { name: '失速', val: st.stall ? 'あり' : 'なし', std: 'なし', pass: !st.stall }] },
            { name: '両エンジンへ', g: { kt: SM.y + 10, how: 'level' }, keys: k('thr'), say: '左エンジンの出力を戻します。巡航へ', onStart: (L) => { L.s.eng[0].thr = null; }, dur: 8 },
          ] },
        { id: 'm4', title: '離陸直後の片発停止', goal: '浮揚直後に片方のエンジンが止まっても、Vyse で上昇を続ける', aircraft: 'pa44',
          why: '双発機の最も危険な場面。脚と止まったプロペラの抗力で、何もしなければ上昇できない。速度（Vyse）・脚 UP・フェザーを数秒で。',
          brief: [`浮揚後、片方のエンジンが止まります：<b>①方向（ラダー）②Vyse ${SM.yse} kt ③脚 UP（G）④Identify・Verify・Feather（[ / ]）</b>。`, '生きている側へ 2〜5° バンク。上昇率は小さい（数百 fpm）ので、まっすぐ・速度を守る。', '地上 1,000 ft まで上昇したら、場周経路で戻る準備（この課目はそこまで）。'],
          std: `Vyse ${SM.yse} ±5 kt・30 秒以内にフェザー・針路 ±20°・地上 1,000 ft まで上昇`, setup: { at: 'runway' }, book: ['me.oei'],
          steps: [
            { name: '離陸許可の復唱', atc: 'takeoff' },
            takeoffRoll(SM.rotate, { twin: true }),
            { name: '脚上げ', g: { kt: SM.y, pwr: 'full', how: 'climbFull' }, keys: k('gear', 'pitch'), say: '正の上昇で脚 UP（G）', until: c => c.aglR > 250, max: 60 },
            { name: '片発停止！', g: { kt: SM.yse, pwr: 'dead', how: 'oei' }, keys: k('rud', 'pitch', 'gear', 'feather', 'rtrim'), say: 'エンジン故障！ 方向 → Vyse → 脚 UP → 止まった側をフェザー',
              onStart: (L, c, st) => { SC.failNow(L, (L.s.seed || 7) % 2 ? 'engR' : 'engL'); L.s.opts.autoRud = false; st.h0 = c.hdg; }, tgt: { spd: [SM.yse, 5], rhdg: [0, 20] }, grade: true, gradeWhen: (c, L, st) => st.t > 6,
              until: (c, L, st) => L.s.eng.some(e => e.feather) && st.t > 8, max: 60,
              result: (L, st) => { const good = L.s.eng.every(e => !e.feather || e.failed) && L.s.eng.some(e => e.feather); return [{ name: 'フェザー', val: good ? `止まった${deadName(L)}エンジン（${Math.round(st.t)} 秒）` : L.s.eng.some(e => e.feather) ? '生きているエンジン（重大な誤り）' : 'していない', std: '30 秒以内・止まった側', pass: good && st.t <= 30 }, { name: '脚', val: L.s.gearDown ? 'DOWN のまま' : 'UP', std: 'UP', pass: !L.s.gearDown }]; },
              stopOnFail: '片発停止の処置が基準外でした' },
            { name: '片発で上昇', g: { kt: SM.yse, pwr: 'dead', how: 'oei' }, keys: k('pitch', 'rud', 'roll'), say: `Vyse ${SM.yse} kt で地上 1,000 ft まで上昇`, tgt: { spd: [SM.yse, 5], rhdg: [0, 15] }, until: c => c.aglR > 1000, max: 300, grade: true, gradeWhen: (c, L, st) => st.t > 5 },
          ] },
        { id: 'm5', title: '片発の進入と着陸', goal: '片発のまま安定した進入をして着陸する', aircraft: 'pa44',
          why: '片発ではゴーアラウンドの性能がほとんどない。着陸が確実になるまで脚とフラップを出しすぎず、Vyse を保つ。',
          brief: [`左エンジンはフェザー済み。<b>${SM.yse} kt（Vyse）</b>で進入し、着陸が確実（滑走路に届く）になってから脚 DOWN・フラップ。`, '生きているエンジンの出力を変えると機首が振れるので、ラダーも一緒に。', 'GUMPS（着陸前点検）を忘れずに。'],
          std: `ファイナル ${SM.yse} ±5 kt・接地は着陸の基準`, setup: { at: 'final', km: 5, kt: SM.yse, flaps: 0, gear: false, onStart: L => { L.s.eng[0].failed = true; L.s.eng[0].feather = true; L.fail.engL = 0; L.s.opts.autoRud = false; } }, book: ['me.oei'],
          steps: [
            { name: '着陸前点検（GUMPS）', checklist: 'ms_before_landing' },
            ...landingSteps(SM.yse - 4, { twin: true, flaps: 1 }),
          ] },
      ] },
    // ======================================================================= 5
    { id: 's5', title: '第 5 段階　CRM・TEM（考え方の練習）', phase: 'p6',
      desc: '基礎訓練の先（副操縦士の訓練）につながる考え方。ここでは一人で飛びながら、脅威（Threat）を予測し、エラー（Error）に気づいて管理する練習をする（教材の一般的な内容で、ANA の訓練内容の再現ではない）。',
      lessons: [
        { id: 'r1', title: 'TEM：脅威を予測して管理する', goal: '出発前に脅威を挙げ、飛行中の変化に早めに気づいて対処する', aircraft: 'pa28',
          why: 'TEM（Threat and Error Management）は、事故の多くが「予想できた脅威」や「気づけたエラー」の積み重ねで起きる、という考え方。出発前のブリーフィングで脅威を言葉にしておくと、起きたときに速く対処できる。',
          brief: ['出発前ブリーフィング：今日の脅威（突風を伴う横風、場周の他機、自分の疲れ…）を挙げ、対策を決める（1〜3 キーで答える）。', '飛行中、管制の指示と自分の理解が食い違う場面が来ます。聞き返す・確認するのが正しい対処。', '最後は横風の中で着陸。'],
          std: '各判断の正解・横風着陸の基準', setup: { at: 'downwind', wind: { rel: 70, kt: 10, gust: 1.6 } }, book: ['crm.tem'],
          steps: [
            { name: 'ブリーフィング：最大の脅威', atc: L => ({ msg: `（今日の LAB：風 ${L.windStr}、突風あり。場周には訓練機がほかに 2 機。あなたは寝不足気味。）最も対策が必要な脅威と対策の組み合わせは？`,
              opts: ['突風を伴う横風 → 進入速度に突風分の半分を足し、安定しなければ早めにゴーアラウンド', '他機 → 無線を切って集中する', '寝不足 → コーヒーを飲めば問題ない'], ok: 0,
              why: '突風を伴う横風は着陸の大きな脅威。突風成分の半分を進入速度に足すのは広く教えられている目安（POH・教官の指示が優先）。寝不足も脅威で、IMSAFE で自分を点検する（重ければ飛ばない判断も）。' }) },
            { name: '着陸許可の復唱', atc: 'landing' },
            { name: 'ダウンウインド', g: { kt: 90, how: 'level' }, keys: k('pitch', 'roll', 'thr'), say: 'ダウンウインド：地上 1,000 ft・90 kt・方位 180°', tgt: { aglR: [1000, 100], spd: T_SPD(90), dwhdg: [0, 10] }, until: c => c.along < 300, max: 150, grade: true },
            { name: '食い違いに気づく', atc: L => ({ msg: `LAB Tower: "${L.call}, extend downwind, number two, follow the Cessna on a two-mile final, cleared to land runway 18."`,
              opts: [`Say again the runway for ${L.callShort}?（使用中は 36 のはず：確認する）`, `Cleared to land runway 18, ${L.callShort}.`, '（無線は返さず、そのまま 36 へ）'], ok: 0,
              why: '先ほどの許可は 36。食い違いは「Say again」で確認する。聞き間違い・言い間違いはどちらにも起きる（エラー）。確認すればエラーは管理できる。' }) },
            { name: 'ベースへ', g: { kt: 75, fpm: -500, flaps: 2, how: 'pattern' }, keys: k('thr', 'flaps', 'roll'), say: '「Runway 36, cleared to land」と再確認できた想定。アビームからパワー・フラップ、ベース・ファイナルへ', until: c => Math.abs(c.cross) < 150 && Math.abs(w180(c.hdg - 360)) < 40 && c.along < -400, max: 300 },
            ...landingSteps(AR.appr + 4, { xwind: true }),
          ] },
      ] },
  ];
  // the diversion estimate (lesson n2): the truth, then the rows
  function estimateTruth(L, id = 'LABEF') {
    const A = FL.avionics, w = A.wpt(id), pos = ph.ne(L.s), dist = A.neDistNm(pos, w), brg = A.trueToMag(A.neBearing(pos, w), ph.MAGVAR_W), gs = Math.max(60, L.s.out.gs || 100);
    return { brg: Math.round(brg), dist: +dist.toFixed(1), eteMin: +(dist / gs * 60).toFixed(1) };
  }
  function submitEstimate(L, input) {
    const truth = estimateTruth(L), num = v => (Number.isFinite(+v) && String(v).trim() !== '' ? +v : NaN);
    L.estimate = { hdg: num(input.hdg), dist: num(input.dist), eteMin: num(input.eteMin), truth };
    return L.estimate;
  }
  function estimateRows(L) {
    const e = L.estimate, kk = L.level.k;
    if (!e) return [{ name: '見積もり', val: '未入力', std: '針路・距離・時間を入力', pass: false }];
    const dh = Number.isFinite(e.hdg) ? Math.abs(w180(e.hdg - e.truth.brg)) : 999, dd = Number.isFinite(e.dist) ? Math.abs(e.dist - e.truth.dist) / Math.max(0.1, e.truth.dist) * 100 : 999, de = Number.isFinite(e.eteMin) ? Math.abs(e.eteMin - e.truth.eteMin) / Math.max(0.1, e.truth.eteMin) * 100 : 999;
    return [
      { name: '針路（磁方位）', val: `${Number.isFinite(e.hdg) ? Math.round(e.hdg) : '—'}°（正解 ${e.truth.brg}°）`, std: `±${Math.round(15 * kk)}°`, pass: dh <= 15 * kk },
      { name: '距離', val: `${Number.isFinite(e.dist) ? e.dist : '—'} NM（正解 ${e.truth.dist}）`, std: `±${Math.round(20 * kk)}%`, pass: dd <= 20 * kk },
      { name: '所要時間', val: `${Number.isFinite(e.eteMin) ? e.eteMin : '—'} 分（正解 ${e.truth.eteMin}）`, std: `±${Math.round(20 * kk)}%`, pass: de <= 20 * kk },
    ];
  }

  // the course phases (facts from public information; the mapping of lessons and chapters is this tool's study plan)
  const PHASES = [
    { id: 'p1', no: 1, title: 'London：英語によるグラウンドスクール', fact: 'ANA の公開情報：座学は現在ロンドンで行い、授業はすべて英語。航空管制通信のシミュレーションも行う。' },
    { id: 'p2', no: 2, title: 'Sanford：Piper Archer による基礎操縦', fact: 'ANA の公開情報：フライトはフロリダ州 Sanford 空港に隣接する訓練所で単発機 Piper Archer を使用。90〜120 分のレッスン 12 回と審査（Check Flight）を経てソロへ。現地取材記事では平均 11 回目でファーストソロ。' },
    { id: 'p3', no: 3, title: '目視航法・横風・目的地変更', fact: 'ANA の公開情報：地図に線を引き上空の風から針路を計算して目的地へ飛ぶ Navigation 訓練。目的地変更に伴う再計算、エンジン停止の想定、現在地を見失った場合の対処も並行して訓練。' },
    { id: 'p4', no: 4, title: '計器飛行の導入', fact: 'ANA の公開情報：計器のみを頼りに飛ぶ計器飛行の訓練を行う。' },
    { id: 'p5', no: 5, title: 'Piper Seminole への移行', fact: 'ANA の公開情報：双発機 Piper Seminole で片発停止や機材故障の対応を訓練し、最後の Check Flight を経てライセンスを取得。' },
    { id: 'p6', no: 6, title: 'CRM・TEM・ジェット機・自動化への準備', fact: '公開情報：基礎訓練の後は副操縦士任用訓練でエアラインの大型機の免許を目指す。この段階の内容は本教材の一般的な準備学習で、ANA の訓練内容の再現ではない。' },
  ];

  FL.syllabus = { STAGES, PHASES, landingSteps, estimateTruth, submitEstimate, estimateRows, KEYS };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
