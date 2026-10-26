// ledgers/src/build-rulings.mjs — W03 bootstrap of RULINGS.json: the 80 rows of DESIGN 10.4 (the 74 disagreements
// between the two books, "行は少し細かく分けた"), each with its class A/B/C (DESIGN: A = a national difference → a
// Japan/US box from FL.jur; B = one side wrong or weak → fix that side in the text; C = words/strength/style → the term
// table FL.terms and the writing rules), the treatment, the unit that closes it and status "open".
//   node build-rulings.mjs [--write [--force]]
import path from 'node:path';
import { LEDGERS, sectionText, tableRows, jurItems } from './design.mjs';
import { REPORT_FILE } from './reports.mjs';
import { DATE } from './units.mjs';
import { writeLedger } from './write.mjs';

const OUT = path.join(LEDGERS, 'RULINGS.json');
const JUR = new Set(jurItems().map(x => x.id));

// [slug, report, report place, jur item (A), term(s) (C), wrong side (B), places, unit, also units, errata ids]
// wrong side: textbook = the textbook's text is wrong → fixed in R1 (W07a-c); textbook-weak = the textbook lacks what
// the basic course has → added when the chapter is merged (R2/R3); kiso = the basic course is wrong/weak → the merged
// text uses the right version (and W11 records the basic-course errors in ERRATA-FOR-WORD.md when ERRATA has a row).
const T = [
  ['pic-meaning', 'overview', '§4', null, null, 'kiso', ['law.pic', 'kiso00.02', 'basics.crew'], 'W10', [], ['K.overview.K2']],
  ['weight-unit', 'overview', '§4', null, ['重量'], null, ['aero.forces', 'kiso00.05'], 'W04', ['W13'], ['K.overview.K5']],
  ['aoa-term', 'overview', '§4', null, ['迎角', '迎え角'], null, ['aero.aoa', 'quiz.js', 'syllabus.js'], 'W04', ['W24', 'W50'], []],
  ['pf-term', 'overview', '§4', null, ['PF'], null, ['crm.pm', 'kiso00.02', 'basics.crew'], 'W04', ['W10'], []],
  ['ifr-terms', 'overview', '§4', null, ['計器飛行方式（IFR）', '計器気象状態（IMC）', '計器飛行証明'], null, ['intro.cert', 'kiso00.14', 'basics.rules'], 'W04', ['W10'], []],
  ['pressure-unit', 'overview', '§4', 'alt.unit', null, 'kiso', ['kiso00.07', 'basics.units'], 'W08', ['W06', 'W10'], ['K.overview.K3']],
  ['critical-aoa', 'aero', '§5', null, ['臨界迎角（臨界迎え角）'], null, ['aero.aoa', 'kiso01.08'], 'W04', ['W13'], []],
  ['lift-lower-surface', 'aero', '§5', null, null, 'textbook', ['aero.lift'], 'W07a', [], ['T.aero.T-10']],
  ['load-factor-unit', 'aero', '§5', null, null, 'textbook', ['aero.turn'], 'W07a', [], ['T.aero.T-11']],
  ['dihedral', 'aero', '§5', null, null, 'textbook-weak', ['aero.stab', 'kiso01.22', 'kiso01.23'], 'W13', [], []],
  ['vn-line', 'aero', '§5', null, null, 'textbook', ['aero.vn', 'FIG.vn'], 'W07a', [], ['T.aero.T-2']],
  ['turbulence-va', 'aero', '§5', null, ['設計運動速度（Va）'], null, ['aero.vn', 'kiso01.26'], 'W04', ['W13'], []],
  ['left-turning', 'aero', '§5', null, ['左偏向傾向（left-turning tendencies）'], null, ['aero.left', 'kiso01.25'], 'W04', ['W13'], []],
  ['ground-effect-height', 'aero', '§5', null, ['地面効果'], null, ['aero.ge', 'kiso01.14'], 'W04', ['W13'], []],
  ['stall-recovery', 'aero', '§5', null, ['失速からの回復'], null, ['aero.stall', 'kiso01.16'], 'W04', ['W07a', 'W07d'], ['T.aero.T-3', 'SYNC.stall-recovery']],
  ['base-final-stall', 'aero', '§5', null, null, 'textbook', ['aero.stall'], 'W07a', [], ['T.aero.T-4']],
  ['turn-rate-constant', 'aero', '§5', null, ['旋回率'], null, ['aero.turn', 'kiso01.20'], 'W04', ['W13'], []],
  ['o360-license', 'systems', '§5', null, null, 'textbook', ['sys.engine', 'photo lycoming', 'ch03-photo1'], 'W07a', ['W22'], ['T.systems.T1']],
  ['engine-without-electric', 'systems', '§5', null, null, 'textbook', ['sys.engine', 'FIG.engineFlow'], 'W07a', [], ['T.systems.T4']],
  ['fixed-pitch-rpm', 'systems', '§5', null, null, 'textbook', ['sys.engine'], 'W07a', [], ['T.systems.T5']],
  ['feather', 'systems', '§5', null, ['フェザー（feather）'], null, ['me.basics', 'kiso03.17', 'me.prop'], 'W04', ['W31'], []],
  ['carb-ice-temp', 'systems', '§5', null, ['気化器着氷（キャブレターアイス）'], null, ['sys.carb', 'kiso03.8'], 'W04', ['W14'], ['K.systems.K2', 'T.systems.T11']],
  ['manifold-pressure', 'systems', '§5', null, ['吸気圧（MAP）'], null, ['kiso03.13', 'sys.eis'], 'W04', ['W14'], ['K.systems.K1']],
  ['cross-check', 'instruments', '§7 C-1', null, null, 'textbook', ['sys.compass', 'ifr.instr', 'kiso04.18'], 'W07a', ['W07c'], ['T.instruments.E-T2']],
  ['cas', 'instruments', '§7 C-2', null, null, 'textbook', ['sys.g1000', 'kiso04.3'], 'W07a', [], ['T.instruments.E-T1']],
  ['scan-pattern', 'instruments', '§7 C-3（ifr.md §7 C-6 も同じ）', null, ['計器の走査（スキャン）'], null, ['ifr.scan', 'kiso04.18', 'kiso12.4'], 'W04', ['W30'], []],
  ['static-block-vsi', 'instruments', '§7 C-4', null, ['昇降計'], null, ['sys.g1000', 'kiso04.5'], 'W04', ['W07a', 'W15'], []],
  ['northerly-turn-error', 'instruments', '§7 C-5', null, ['北旋誤差'], null, ['sys.compass', 'kiso04.14'], 'W04', ['W15'], []],
  ['altimeter-rule-of-thumb', 'instruments', '§7 C-6', 'alt.unit', ['高度計規正値'], null, ['wx.atm', 'kiso04.6', 'inst.alt'], 'W04', ['W08', 'W15'], []],
  ['pa-coefficient', 'wb-perf', '§5', null, ['気圧高度'], null, ['perf.da', 'kiso06.3'], 'W04', ['W16'], []],
  ['pressure-altitude-term', 'wb-perf', '§5', null, ['気圧高度'], null, ['kiso06'], 'W04', ['W16'], ['K.wb-perf.K2']],
  ['fast-landing', 'wb-perf', '§5', null, ['着陸距離'], 'kiso', ['perf.tol', 'kiso06.23'], 'W04', ['W16'], ['K.wb-perf.K3']],
  ['fuel-cg-shift', 'wb-perf', '§5', null, ['重心位置（CG）'], null, ['perf.wb', 'kiso05.17', 'wb.shift'], 'W04', ['W16'], []],
  ['planning-margin', 'wb-perf', '§5', null, ['余裕（安全係数）'], null, ['perf.tol', 'kiso06.24', 'perf.chart'], 'W04', ['W16'], []],
  ['tempo-length', 'weather', '§4', 'metar.taf', null, null, ['wx.taf', 'kiso07.22'], 'W08', ['W06'], []],
  ['taf-groups', 'weather', '§4', 'metar.taf', null, null, ['wx.taf', 'kiso07.21'], 'W08', ['W06'], ['K.weather.K1']],
  ['cell-stage-names', 'weather', '§4', null, ['積雲期・成熟期・消散期'], null, ['wx.ts', 'kiso07.12'], 'W04', ['W17'], []],
  ['windshear-term', 'weather', '§4', null, ['ウィンドシャー', '低層ウィンドシアー（気象庁の情報名）'], null, ['wx.shear', 'kiso07.13'], 'W04', ['W24'], []],
  ['ceiling-term', 'weather', '§4', null, ['雲高（シーリング）', '雲底'], null, ['wx.metar', 'kiso07.19'], 'W04', ['W24'], []],
  ['cloud-base-formula', 'weather', '§4', null, ['雲底'], null, ['wx.cloud', 'kiso07.6'], 'W04', ['W17'], []],
  ['microburst', 'weather', '§4', null, ['マイクロバースト'], 'textbook', ['wx.shear', 'kiso07.13'], 'W04', ['W07a'], ['T.weather.T2']],
  ['dissipating-stage', 'weather', '§4', null, null, 'textbook-weak', ['wx.ts', 'kiso07.12'], 'W17', [], []],
  ['metar-frequency', 'weather', '§4', 'metar.taf', null, null, ['wx.metar', 'kiso07.18'], 'W08', ['W06'], []],
  ['gust-criterion', 'weather', '§4', 'metar.taf', null, null, ['wx.metar', 'kiso07.19'], 'W08', ['W06'], []],
  ['high-pressure-weather', 'weather', '§4', null, ['高気圧'], null, ['wx.front', 'kiso07.3'], 'W04', ['W17'], []],
  ['deviation-sign', 'navigation', '§5 C1', null, ['自差'], null, ['nav.plan', 'kiso08.5', 'navb.north'], 'W04', ['W07b', 'W18'], []],
  ['lost-climb', 'navigation', '§5 C2', null, ['現在地を見失ったときの手順（lost procedures）'], 'textbook', ['nav.lost', 'kiso08.27'], 'W07b', ['W04'], []],
  ['divert-order', 'navigation', '§5 C3', null, ['目的地変更（diversion）'], null, ['nav.divert', 'kiso08.26'], 'W04', ['W07b'], []],
  ['fuel-reserve', 'navigation', '§5 C4', 'fuel.vfr', null, 'kiso', ['nav.log', 'kiso08.11', 'kiso08.q11', 'kiso08.q25'], 'W08', ['W06', 'W18', 'W23'], ['T.navigation.T1', 'K.navigation.K1', 'K.wb-perf.K4']],
  ['readback', 'law', '§5', 'readback', null, null, ['comm.readback', 'comm.icao', 'kiso09.19'], 'W08', ['W06', 'W07a'], ['T.law.comm-icao']],
  ['notam-term', 'law', '§5', null, ['ノータム（NOTAM）', '航空情報'], 'textbook', ['law.special'], 'W07a', ['W04'], ['T.law.law-special']],
  ['spelling', 'law', '§5', 'words', ['PAN-PAN／PAN PAN', 'takeoff／take-off'], null, ['comm.mayday', 'comm.words', 'kiso09'], 'W08', ['W04'], []],
  ['hold-short', 'law', '§5', 'words', null, null, ['comm.words', 'kiso09.21'], 'W08', ['W06'], []],
  ['nordo-landing', 'law', '§5', 'nordo.vfr', null, null, ['comm.nordo', 'kiso09.26', 'q_radio'], 'W08', ['W06'], ['T.law.q_radio']],
  ['vfr-fuel-law', 'law', '§5', 'fuel.vfr', null, null, ['law.rules', 'kiso09'], 'W08', ['W06'], ['K.wb-perf.K4']],
  ['right-of-way', 'law', '§5', 'row', null, null, ['law.rules', 'kiso09.13'], 'W08', ['W06'], []],
  ['photo-mod', 'law', '§5（写真の加工）', null, null, null, ['bk.photo', 'holdShort', 'ch09-photo4'], 'W22', [], ['APP.bk-photo-mod']],
  ['alcohol', 'human', '§5 C1', 'alcohol', null, null, ['hf.self', 'kiso10.12'], 'W08', ['W06', 'W20'], ['K.human.K5']],
  ['tem-words', 'human', '§5 C2', null, ['TEM の対策（脅威は予測して防ぐ・エラーは見つけて直す・望ましくない状態は立て直す）'], null, ['crm.tem', 'FIG.tem', 'q_crm', 'kiso10.23'], 'W04', ['W07c', 'W32'], ['T.human.T10']],
  ['trust-instruments', 'human', '§5 C3', null, null, 'textbook-weak', ['hf.body', 'kiso10.6'], 'W20', [], []],
  ['cold-sick', 'human', '§5 C4', null, ['飛行への適合性'], null, ['hf.altitude', 'kiso10.4'], 'W04', ['W20'], []],
  ['passenger-resource', 'human', '§5 C5', null, ['1 人で操縦するときの資源管理（SRM）'], null, ['hf.srm', 'kiso10.24'], 'W04', ['W20'], []],
  ['pitch-power', 'vfr', '§7', null, ['エネルギーの管理（energy management）'], null, ['ops.trim', 'ops.slow', 'kiso11.14', 'ops.energy'], 'W04', ['W28'], []],
  ['numeric-cues', 'vfr', '§7', null, null, 'kiso', ['ops.turns', 'ops.flare', 'kiso11'], 'W28', [], []],
  ['stabilized-approach', 'vfr', '§7', null, ['安定進入（stabilized approach）'], null, ['ops.landing', 'kiso11.22'], 'W04', ['W28'], []],
  ['crosswind-landing', 'vfr', '§7', null, null, 'kiso', ['ops.xwind', 'kiso11.18'], 'W28', [], []],
  ['turnback', 'vfr', '§7', null, ['離陸直後の引き返し'], null, ['emg.engine', 'kiso11.16'], 'W04', ['W28'], []],
  ['vfr-into-imc', 'vfr', '§7', null, null, 'textbook-weak', ['hf.body', 'emg.imc', 'kiso11.27'], 'W28', ['W36'], []],
  ['pattern', 'vfr', '§7', 'pattern', null, null, ['ops.pattern', 'kiso11.20'], 'W08', ['W06'], []],
  ['nordo-ifr', 'ifr', '§7 C-1', 'nordo.ifr', null, null, ['ifr.rules', 'kiso12.27'], 'W08', ['W06'], []],
  ['hold-numbers', 'ifr', '§7 C-2', 'hold', null, 'kiso', ['ifr.hold', 'kiso12.16'], 'W08', ['W06', 'W30', 'W41'], ['K.ifr.K-4']],
  ['ifr-fuel', 'ifr', '§7 C-3', null, null, 'kiso', ['ifr.rules', 'kiso12.3'], 'W30', ['W41'], ['K.ifr.K-5']],
  ['approach-ban', 'ifr', '§7 C-4', 'appr.ban', null, null, ['ifr.rules', 'kiso12.22'], 'W08', ['W06'], []],
  ['circling-lost-visual', 'ifr', '§7 C-5', null, null, 'kiso', ['kiso12.25', 'kiso12.q25', 'ifr.circle'], 'W30', ['W34', 'W36'], ['K.ifr.K-2']],
  ['failed-engine-id', 'multi', '§7 7-1', null, null, 'kiso', ['me.oei', 'kiso13.22', 'kiso13.3', 'kiso13.q22'], 'W31', ['W34', 'W36'], ['K.multi.K-1']],
  ['counter-rotation', 'multi', '§7 7-2', null, ['臨界発動機'], 'kiso', ['me.basics', 'oei.what', 'kiso13.7'], 'W04', ['W31'], ['K.multi.K-3']],
  ['zero-sideslip', 'multi', '§7 7-3', null, null, 'kiso', ['me.drag', 'kiso13.8'], 'W31', [], ['K.multi.K-2']],
  ['gear-timing-oei', 'multi', '§7 7-4', null, ['片発の進入'], null, ['me.land', 'kiso13.24'], 'W04', ['W31'], []],
  ['crossfeed', 'multi', '§7 7-5', null, ['クロスフィード'], null, ['me.basics', 'kiso13.17'], 'W04', ['W31'], []],
  ['me-terms', 'multi', '§7 7-6', null, ['最小操縦速度（V<sub>MC</sub>。Vmc とも書く）', '加速継続距離', '横滑りゼロ', '左右逆回転', 'フェザー', 'AFM/POH'], null, ['me.vmc', 'kiso13'], 'W04', ['W31'], []],
];
const TREAT = {
  A: '日米の囲みにする（bk.jur など）。数字は FL.jur の項目から描き、手で書いた重複の数字を置かない。囲みの節・部のまとめ・第 7 部の 3 か所で会う（DESIGN 3.4・基準 2・9）',
  B: '誤った側・弱い側を本文で直す（正しい側の言い方を本文に。DESIGN 10.4・基準 2）',
  C: '用語の表 FL.terms に 1 つの名前で入れ（通称・英語を別名に）、書き方の決まりに従って本文をそろえる（DESIGN 3.5・基準 2）',
};
const WRONG = { textbook: '教科書の文が誤り（R1 の W07 で直す）', 'textbook-weak': '教科書が弱い（基礎教材の中身を合わせるときに足す）', kiso: '基礎教材が誤り・弱い（合本の文で直す。原本は変えない）' };

const rows = tableRows(sectionText('### 10.4')).map(({ c }, i) => {
  const [topic, textbook, kiso, cls, ruling, cf] = c;
  const t = T[i];
  if (!t) throw new Error('no table row for ' + topic);
  const [slug, report, place, jur, terms, wrong, places, unit, also, errata] = t;
  const classes = cls.split('・').map(x => x.trim());
  if (jur && !JUR.has(jur)) throw new Error(`unknown jur ${jur}`);
  if (classes.includes('A') && !jur) throw new Error(`A without jur: ${slug}`);
  if (classes.includes('C') && !terms && slug !== 'photo-mod') throw new Error(`C without term: ${slug}`);
  return {
    id: `R.${slug}`, n: i + 1, topic, textbook, kiso, class: classes[0], classes, ruling, confidence: cf, conf: { 高: 'high', 中: 'mid', 低: 'low' }[(cf.match(/[高中低]/) || [])[0]] || null,
    safety: /〔安全〕/.test(ruling + topic),
    treatment: classes.map(k => TREAT[k]).join(' ／ '),
    jur, term: terms ? terms[0] : null, terms: terms || [], termNA: slug === 'photo-mod' ? '用語ではない：写真の加工の表示の書き方の決まり（W22 が写真ごとの mod で統一）' : null,
    wrong: wrong || null, wrongNote: wrong ? WRONG[wrong] : null,
    places, source: { report: `understand/${REPORT_FILE[report]} ${place}`, design: 'DESIGN 10.4' },
    unit, alsoUnits: also, errata,
    status: 'open', where: null, by: null, checkedBy: null, reason: null, note: '',
  };
});
const by = (k, f = r => r[k]) => rows.reduce((a, r) => ((a[f(r)] = (a[f(r)] || 0) + 1), a), {});
const out = {
  ledger: 'RULINGS', version: 1, updated: DATE, by: 'W03',
  about: 'DESIGN 10.4 の 2 冊の食い違い 74 件（行は少し細かく分けて 80 行）と裁定。A＝国の違い → 日米の囲み（jur の項目）、B＝片方が誤り・弱い → その側を本文で直す（wrong）、C＝言葉・強さ・書き方 → 用語の表（term）と書き方の決まり。term は用語の表に入れる語の候補（今の教科書の用語集の語か JCAB の出題範囲の語。正式名は W04 が JCAB・航空法の表記で確かめて決める：判断 3）。閉じ方は README.md',
  treatments: TREAT,
  counts: { rows: rows.length, byClass: by('class'), mixed: rows.filter(r => r.classes.length > 1).length, safety: rows.filter(r => r.safety).length, byUnit: by('unit') },
  rows,
};
console.log(JSON.stringify(out.counts));
export const RULINGS = out;
if (import.meta.url === `file://${process.argv[1]}`) writeLedger(OUT, out);
