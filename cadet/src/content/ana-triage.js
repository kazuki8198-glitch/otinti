// CADET — content/ana-triage.js: the ANA triage — which of this game's knowledge a real airline cadet (the
// reader is becoming an ANA cadet) must know in real training, which is worth knowing, and which belongs only
// to this fictional academy. A display-and-guidance layer only: it changes no progression rule, no exam and
// no pass mark. The full table, its sources and its limits are in cadet/docs/ana-must-know.md.
//
// The yardsticks (public sources, checked 2026-11): the JCAB commercial-pilot (CPL) written examination's five
// subjects — 航空工学 (aeronautical engineering), 航空気象 (meteorology), 空中航法 (air navigation), 航空通信
// (communications), 航空法規 (aviation law) — plus the instrument rating (計器飛行証明); and ANA's own published
// cadet course: ground school in English in London (about 800 hours), then flight training at Sanford, Florida
// (about 180 hours) on the Piper Archer and then the Piper Seminole to an integrated CPL/IR, then type training
// in Japan. This textbook mirrors that course, so most of it is real; the triage is a matter of priority.
// must — needed in real training, real examinations or daily real flying from the first phase on.
// rec — real and worth knowing, but advanced detail, type-phase material, or local practice taught on site.
// game — only inside this academy (its fictional airspace, airline and game systems). No textbook section is
// wholly 'game' — the fiction lives inside sections and in the game's own systems; see the doc.
// Labels: in the world's spoken lines the third label is 校内のみ (the world's own words — a lecturer does not
// say ゲーム); menus and the doc call the same class ゲーム内のみ. English labels are kept here for the surfaces
// that speak English.

export const TRIAGE_TAGS = {
must: { ja: '必須', en: 'Must-know'},
rec: { ja: '推奨', en: 'Recommended'},
game: { ja: 'ゲーム内のみ', en: 'Game only', spoken: '校内のみ'},
};
// the small label as it appears after a title in menus: 【必須】 / 【推奨】 / 【ゲーム内のみ】
export const tagChip = (tag) => (tag && TRIAGE_TAGS[tag] ? `【${TRIAGE_TAGS[tag].ja}】` : '');
// the label inside spoken dialog lines (the lecturer's cards): the world's own words —
// 【必須】 / 【推奨】 / 【校内のみ】 (a lecturer does not say ゲーム)
export const tagChipSpoken = (tag) => (tag && TRIAGE_TAGS[tag] ? `【${TRIAGE_TAGS[tag].spoken || TRIAGE_TAGS[tag].ja}】` : '');

// ---- the textbook's sections, chapter by chapter ----

export const SECTION_TAG = {
// 第 1 章 飛行の原理 — CPL 航空工学 (航空力学)
'aero.forces': 'must', 'aero.lift': 'must', 'aero.aoa': 'must', 'aero.drag': 'must', 'aero.stall': 'must',
'aero.turn': 'must', 'aero.stab': 'must', 'aero.left': 'must', 'aero.ge': 'must', 'aero.vn': 'rec',
// 第 2 章 機体と装備 — CPL 航空工学 (装備品) と機上訓練
'sys.ctl': 'must', 'sys.engine': 'must', 'sys.fuel': 'must', 'sys.elec': 'must', 'sys.g1000': 'rec',
'sys.compass': 'must', 'sys.gear': 'rec',
// 第 3 章 性能と重量・重心 — CPL 航空工学・空中航法の計算
'perf.da': 'must', 'perf.tol': 'must', 'perf.climb': 'must', 'perf.wb': 'must',
// 第 4 章 航空気象 — CPL 航空気象
'wx.atm': 'must', 'wx.ts': 'must', 'wx.fog': 'must', 'wx.metar': 'must', 'wx.brief': 'must',
// 第 5 章 規則と空域 — CPL 航空法規 (概念は日本の航空法に対応し、条文は訓練地の FAA)
'law.pic': 'must', 'law.vfr': 'must', 'law.airspace': 'must', 'law.rules': 'must', 'law.special': 'rec',
// 第 6 章 無線交信のしくみ — CPL 航空通信
'radio.why': 'must', 'radio.equip': 'rec', 'radio.technique': 'must', 'radio.listen': 'must',
// 第 7 章 言葉の決まり — CPL 航空通信 (ICAO 標準)
'comm.basic': 'must', 'comm.numbers': 'must', 'comm.callsign': 'must', 'comm.words': 'must',
// 第 8 章 交信の型 — CPL 航空通信
'comm.pattern': 'must', 'comm.readback': 'must', 'comm.clarify': 'must', 'comm.mistakes': 'rec',
// 第 9 章 1 回の飛行の交信 — CPL 航空通信・実技
'comm.atis': 'must', 'comm.dep': 'must', 'comm.tower': 'must', 'comm.radar': 'rec', 'comm.arrive': 'must', 'comm.option': 'rec',
// 第 10 章 管制塔のない空港・緊急・ICAO — CPL 航空通信
'comm.ctaf': 'must', 'comm.xpdr': 'must', 'comm.nordo': 'must', 'comm.sfb': 'rec', 'comm.icao': 'must',
// 第 11 章 人間の能力と判断 — ヒューマンファクターズ (CPL の範囲・エアライン訓練の基礎)
'hf.self': 'must', 'hf.adm': 'must', 'hf.attitude': 'must', 'hf.body': 'must', 'hf.srm': 'must',
// 第 12 章 飛行前の準備・点検 — 実技
'ground.walk': 'must', 'ground.start': 'must', 'ground.runup': 'must',
// 第 13 章 基本操縦 — 実技 (基礎課目)
'ops.trim': 'must', 'ops.sl': 'must', 'ops.climb': 'must', 'ops.turns': 'must', 'ops.slow': 'must', 'ops.ground': 'rec',
// 第 14 章 離陸・場周経路・着陸 — 実技
'ops.takeoff': 'must', 'ops.pattern': 'must', 'ops.landing': 'must', 'ops.goaround': 'must', 'ops.xwind': 'must', 'ops.short': 'rec',
// 第 15 章 緊急操作 — 実技
'emg.basic': 'must', 'emg.abort': 'must', 'emg.engine': 'must', 'emg.fire': 'must', 'emg.elec': 'rec',
// 第 16 章 ソロへの準備 — 実技 (FAA 方式の基礎訓練)
'solo.req': 'must', 'solo.check': 'rec', 'solo.first': 'must',
// 第 17 章 地図・飛行計画 — CPL 空中航法
'nav.chart': 'must', 'nav.plan': 'must', 'nav.dr': 'must',
// 第 18 章 電波航法と GPS — CPL 空中航法・計器飛行証明
'nav.vor': 'must', 'nav.dme': 'rec', 'nav.gps': 'must', 'nav.ff': 'rec',
// 第 19 章 目的地変更・迷子 — 実技・空中航法
'nav.divert': 'must', 'nav.lost': 'must', 'nav.xc': 'rec',
// 第 20 章 計器による飛行 — 計器飛行証明
'ifr.instr': 'must', 'ifr.scan': 'must', 'ifr.partial': 'must', 'ifr.upset': 'must',
// 第 21 章 計器飛行方式 — 計器飛行証明
'ifr.rules': 'must', 'ifr.hold': 'must', 'ifr.ils': 'must', 'ifr.np': 'must',
// 第 22 章 Seminole と双発の基礎 — 実技 (実際の基礎訓練機材)
'me.basics': 'must', 'me.speeds': 'must', 'me.perf': 'must',
// 第 23 章 片発停止 — 実技
'me.oei': 'must', 'me.vmc': 'must', 'me.drag': 'rec', 'me.land': 'must',
// 第 24 章 TEM と CRM — 型式・路線訓練の基礎
'crm.tem': 'must', 'crm.crm': 'must', 'crm.pm': 'must',
// 第 25 章 ジェットと自動化への準備 — 型式訓練で本格化
'crm.jet': 'rec', 'crm.auto': 'rec', 'crm.upset': 'rec',
};

// one line of reason for every section (the doc's table is generated from this)
export const SECTION_WHY = {
'aero.forces': 'CPL航空工学の基礎。4つの力のつり合いは全ての操縦の前提',
'aero.lift': '揚力の発生は航空工学の核',
'aero.aoa': '失速は迎え角で決まる——工学・実技共通の最重要概念',
'aero.drag': '抗力と滑空性能は工学の核。緊急時の滑空判断にも直結',
'aero.stall': '失速・スピンの理解は工学と安全の両面で必須',
'aero.turn': '荷重倍数はCPL航空工学の計算問題の範囲',
'aero.stab': '安定性と重心の関係は工学の基礎',
'aero.left': '単発プロペラ機の実技そのもの。Archerの訓練で毎日使う',
'aero.ge': '地面効果とフラップは離着陸の実技・工学共通',
'aero.vn': 'Vaの概念は他節でも担保される。V-n線図そのものは工学の発展',
'sys.ctl': '操縦系統とトリムは工学・実技の基礎',
'sys.engine': '発動機・点火・氷結はCPL航空工学（装備品）の範囲で、実技でも必須',
'sys.fuel': '燃料系統と切替手順は工学・緊急手順の両面で必須',
'sys.elec': '電気系統の故障対処は実技の緊急手順に直結',
'sys.g1000': 'ピトー静圧の原理は必須級だが、本節の中心はG1000の装置構成の詳細——機上訓練で身につく発展',
'sys.compass': '磁気コンパスの誤差は工学・航法の古典的な必須事項',
'sys.gear': '降着装置・灯火の詳細は機体固有の発展。Archer（固定脚）の基礎は他節で足りる',
'perf.da': '密度高度はCPL工学・航法の計算問題の範囲',
'perf.tol': 'POH性能表の読みと離着陸距離は実務必須',
'perf.climb': '上昇・巡航・燃料の計画は航法計画の基礎',
'perf.wb': '重量重心はCPLの計算問題であり、毎飛行の実務でもある',
'wx.atm': '標準大気と高度計の誤差は航空気象の基礎',
'wx.ts': '雷雨の回避は気象の最重要事項。訓練地フロリダの実情でもある',
'wx.fog': '霧・低雲とVFRの限界は気象と判断の必須事項',
'wx.metar': 'METAR/TAFは航空気象の実務そのもの。学科試験にも出る',
'wx.brief': '飛行前ブリーフィングと個人最低条件は実務の必須手順',
'law.pic': '機長の責任・権限は法規の根幹。日本の航空法にも対応する概念',
'law.vfr': 'VFR気象条件の考え方は必須。数値は訓練地（FAA）と日本で異なる点に注意',
'law.airspace': '空域の分類と入る条件は法規・通信の必須事項',
'law.rules': '速度・高度・優先順位・燃料の規則は法規の核',
'law.special': 'NOTAM確認の習慣は必須だが、TFRなど米国固有の運用細部は現地で学ぶ発展',
'radio.why': '交信の目的と局の役割は航空通信の入口',
'radio.equip': '無線機・オーディオパネルの操作の細部は、装置訓練で身につける発展',
'radio.technique': '「聞く→考える→話す」は英語の座学・実技共通の基礎',
'radio.listen': '英語のみの座学（ロンドン）に進む日本人訓練生に直結する技術',
'comm.basic': 'ICAOフォネティックアルファベットは航空通信の必須事項',
'comm.numbers': '数字の言い方はICAO標準。毎回の交信で使う',
'comm.callsign': 'コールサインの決まりは通信の基礎',
'comm.words': '標準用語の意味の取り違えは事故要因。必須',
'comm.pattern': '最初の呼び出しの型は実技交信の基礎',
'comm.readback': '復唱は安全の核。航空通信の必須事項',
'comm.clarify': 'Say again・Unableは安全のための必須表現',
'comm.mistakes': '型と復唱の原則は他節で必須。間違い事例の蓄積は強いが発展',
'comm.atis': 'ATISの聴取と書き取りは毎飛行の実務',
'comm.dep': '出発の交信手順は実技必須',
'comm.tower': '離陸の交信（LUAWと許可の区別）は安全上必須',
'comm.radar': '交通情報の型は有用だが発展。受け方の基礎は交信の型で担保される',
'comm.arrive': '到着の交信手順は実技必須',
'comm.option': 'Cleared for the optionは訓練地の慣行。有用だが発展',
'comm.ctaf': '無管制空港での自己通報は米国の訓練で日常。概念は必須',
'comm.xpdr': 'MAYDAY・PAN-PANとトランスポンダーコードは緊急通信の必須事項',
'comm.nordo': '無線故障時の手順と灯火信号は必須の緊急知識',
'comm.sfb': '実在の空港の実在の注意点だが、現地の最新のブリーフィングが正であり、本節は参考情報',
'comm.icao': 'ロンドン（ICAO式）と米国（FAA式）の両方に触れるANAの訓練では直接役立つ',
'hf.self': 'IMSAFEは毎飛行の自己点検。訓練の初日から使う',
'hf.adm': 'PAVE・DECIDE・3Pの判断の型はヒューマンファクターズの核',
'hf.attitude': '5つの危険な態度はヒューマンファクターズの古典的な必須事項',
'hf.body': '空間識失調・錯覚・低酸素は計器飛行と安全の必須知識',
'hf.srm': 'SRMとチェックリストの文化はエアライン運航の基礎',
'ground.walk': '外部点検は毎飛行の実務そのもの',
'ground.start': 'エンジン始動とタキシーは実技の基礎手順',
'ground.runup': 'ランナップと離陸前の確認は実技必須',
'ops.trim': '姿勢＋出力＝性能は操縦の土台',
'ops.sl': '直線水平飛行は全課目の基礎',
'ops.climb': '上昇・降下・レベルオフは基礎課目',
'ops.turns': '旋回と急旋回は基礎課目（実技試験の範囲）',
'ops.slow': '低速飛行と失速の練習は基礎課目',
'ops.ground': '対地目標操作は技量の発展課題。基礎の核は他節で担保される',
'ops.takeoff': '通常離陸は基礎課目',
'ops.pattern': '場周経路は基礎課目',
'ops.landing': '安定した進入は着陸の核。エアラインまで通じる必須概念',
'ops.goaround': 'ゴーアラウンドの判断と手順は安全の必須事項',
'ops.xwind': '横風の離着陸は訓練地でも日本の実務でも必須の技量',
'ops.short': '短距離・不整地は発展技量。通常の離着陸が必須の核',
'emg.basic': 'Aviate・Navigate・Communicateは緊急時の世界共通の原則',
'emg.abort': '離陸中止の判断と手順は必須',
'emg.engine': 'エンジン故障と不時着は必須の緊急課目',
'emg.fire': '火災と煙への対処は必須の緊急課目',
'emg.elec': '電気系統の故障手順の詳細はチェックリスト運用の発展。基礎はsys.elecで担保される',
'solo.req': 'ソロの要件——教官の認定と学科の確認が前提という構造は、訓練の節目そのもの',
'solo.check': 'Stage checkの慣行は実在するが、見られ方の細部は現地・学校ごとの発展情報',
'solo.first': '初めてのソロでの機体の振る舞いの変化は、安全に直結する',
'nav.chart': '航空図の読みは空中航法の基礎',
'nav.plan': '針路の計算はCPL空中航法の計算問題そのもの',
'nav.dr': '推測航法はGPSの時代でも航法の基礎',
'nav.vor': 'VORはCPL・計器飛行証明の航法の範囲',
'nav.dme': 'DMEの斜距離などの詳細は発展。VORとGPSが核',
'nav.gps': 'GPS航法は現代の航法の基礎',
'nav.ff': 'Flight followingは任意のレーダー業務。知っていると強い発展',
'nav.divert': '目的地変更の判断と手順は実技必須',
'nav.lost': '現在地を見失ったときの手順は安全の必須知識',
'nav.xc': 'クロスカントリーの組み立ては必須要素の統合＝発展。要素そのものは各節で担保される',
'ifr.instr': '計器の仕組みと故障の見分け方は計器飛行証明の基礎',
'ifr.scan': '姿勢による計器飛行とスキャンは計器飛行証明の核',
'ifr.partial': '部分パネルは計器飛行証明の必須課目',
'ifr.upset': '異常姿勢からの回復は計器飛行と安全の必須課目',
'ifr.rules': 'IFRの規則の要点は計器飛行証明の基礎',
'ifr.hold': '待機経路（ホールディング）は計器飛行証明の必須課目',
'ifr.ils': 'ILS進入は計器飛行証明の核',
'ifr.np': '非精密進入と進入復行は計器飛行証明の必須課目',
'me.basics': 'Seminoleは実際の基礎訓練の機材。その構造と操作は必須',
'me.speeds': '赤い線と青い線は双発の安全の核',
'me.perf': '双発の性能と離陸の計画は双発訓練の必須事項',
'me.oei': '片発停止の手順は双発訓練の中心課目',
'me.vmc': 'Vmcは双発の安全の核',
'me.drag': '抗力のデモンストレーションは訓練課題の詳細。結論はme.oeiとme.perfで担保される',
'me.land': '片発の進入と着陸は双発訓練の必須課目',
'crm.tem': 'TEMはエアライン運航の共通言語。型式・路線訓練の基礎',
'crm.crm': 'CRMはエアライン訓練の核',
'crm.pm': 'PFとPMの役割分担は2人運航の基礎。型式訓練から必須',
'crm.jet': 'ジェット機への移行は型式訓練で本格的に学ぶ。基礎訓練の段階では発展',
'crm.auto': '自動化の詳細は型式訓練の範囲。モード意識の概念はCRMの節で担保される',
'crm.upset': 'UPRTは型式・路線訓練の科目。基礎の段階では考え方を知れば足りる',
};

// ---- the question banks (FLIGHT LAB's quiz banks, as the game draws on them) ----

export const BANK_TAG = {
q_aero: 'must', q_sys: 'must', q_perf: 'must', q_wx: 'must', q_law: 'must', q_comm: 'must', q_radio: 'must',
q_hf: 'must', q_ops: 'must', q_emg: 'must', q_nav: 'must', q_ifr: 'must', q_me: 'must', q_crm: 'must',
q_jet: 'rec', q_jperf: 'rec', q_jsys: 'rec',
};
export const BANK_WHY = {
q_aero: 'CPL航空工学（航空力学）に対応する',
q_sys: 'CPL航空工学（装備品：発動機と各系統）に対応する',
q_perf: 'CPL航空工学・空中航法の、性能と重量重心の計算に対応する',
q_wx: 'CPL航空気象に対応する',
q_law: 'CPL航空法規に対応する（条文は訓練地のFAA。日本では航空法に読み替える）',
q_comm: 'CPL航空通信（標準用語と交信の型）に対応する',
q_radio: 'CPL航空通信の実践（復唱と聴取）に対応する',
q_hf: 'ヒューマンファクターズ（CPLの範囲と、訓練の判断）に対応する',
q_ops: '飛行訓練の基礎課目に対応する',
q_emg: '緊急操作（飛行訓練の必須課目）に対応する',
q_nav: 'CPL空中航法に対応する',
q_ifr: '計器飛行証明の学科に対応する',
q_me: '双発訓練（Seminole）に対応する',
q_crm: '型式・路線訓練の基礎（CRM・TEM）に対応する',
q_jet: '型式訓練フェーズの必須科目。基礎訓練（CPL/IR）の段階では発展',
q_jperf: '型式訓練フェーズの必須科目（輸送機の性能と運航）。基礎訓練の段階では発展',
q_jsys: '型式訓練フェーズの必須科目（737級のシステムと手順）。基礎訓練の段階では発展',
};

export const tagOfSection = (id) => SECTION_TAG[id] || null;
export const tagOfBank = (id) => BANK_TAG[id] || null;
// a written test's tag, from its banks: 必須 when every bank is 必須; 推奨 when a 推奨 bank is in it;
// ゲーム内のみ only when every bank is ゲーム内のみ (no such test today)
export function examTagOf(banks) {
const ts = (banks || []).map(b => BANK_TAG[b]).filter(Boolean);
if (!ts.length) return null;
if (ts.every(t => t === 'game')) return 'game';
if (ts.some(t => t === 'rec' || t === 'game')) return 'rec';
return 'must';
}
