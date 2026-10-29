// CADET — content/dialog/ch1-events.js : chapter 1's evenings — each class day's own event, with someone of the
// academy, that uses the day's class (career/career.js CH1_EVENTS): the cadet answers, they answer back. None is scored
// or kept for a gate; each ends with the hook 'done' 'event'. All fictional (content/people.js).
//   forces  (第 1 章) 大城さん, on the apron by the Archer: where its four forces come from, which way the nose goes on
//           the take-off roll, and why (left-turning tendencies, aero.left);
//   pitot   (第 2・3 章) 大城さん: the Archer's pitot tube under the left wing with its cover, the fuel sump,
//           a blocked static port (sys.g1000, sys.fuel; the walk-around's own points, content/walkaround-archer.js);
//   spell   (第 6・7 章) 佐伯さん at dispatch: today's aircraft's registration, a frequency and an altitude said aloud;
//   readback (第 8・9 章) 桐生, in the lounge, as the controller: the read-backs a hold short and a line up and wait need;
//   metar   (第 4・10 章) 佐伯さん: this morning's METAR read with her — its visibility against the class's example of a
//           trainee's minimums (wx.brief: 5 SM); the day's go / no-go and its reason told, not asked (it may rest on the
//           TAF or a crosswind limit the class did not say);
//   imsafe  (第 5・11 章) 真壁 主任教官: IMSAFE's letters, and the cadet's own today (his third promise);
//   week    (Sunday) 朝日: the week's questions, if the cadet likes (career's review: those missed first).
// fromBank: the classes' questions (content/school.js) for the week's review. Each question of the others is on a
// line its day's class says at every pace: content/answer-map.js EVENT_ANSWERS (its k-th question's), which keeps
// those lines in 要点だけ too (school.js answerWords).
import { PEOPLE } from '../people.js';
import { fit, LINE_MAX } from '../school.js';

const SPEAKERS = Object.fromEntries([...Object.entries(PEOPLE).map(([id, p]) => [id, { name_ja: p.title, color: p.color }]), ['player', { name_ja: 'あなた', color: '#f2b632' }]]);
export const EVENT_HOOKS = ['done', 'look', 'nod', 'point', 'ans'];

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffled = (a, r) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// a scene: its lines (who, text), its questions ({ who, q, opts (the right one first), ok: the reply when right, ng:
// when wrong }), its end; → the dialog's nodes from 'e0'
function scene(who, parts, end, r) {
  const N = {};
  let k = 0, open = [];
  const id = () => `e${k++}`;
  const link = (to) => { for (const n of open) n.next = to; };
  // (a reply too long for a subtitle — the week's review: a bank's reason — said over lines: → its last node)
  const said = (nid, speaker, text, more = {}) => { const l = fit(text, LINE_MAX); l.forEach((t, j) => { N[j ? `${nid}:${j}` : nid] = { speaker, text: t, ...(j ? {} : more), ...(j < l.length - 1 ? { next: `${nid}:${j + 1}` } : {}) }; }); return N[l.length > 1 ? `${nid}:${l.length - 1}` : nid]; };
  for (const p of parts) {
    if (p.q) {
      // (a question's node: e<k>:eq — school.js DECISION_NODE counts it a decision; a long one's first lines before it)
      const e = id(), q = `${e}:eq`, opts = shuffled(p.opts.map((t, i) => ({ t, ok: i === 0 })), r), l = fit(p.q, LINE_MAX);
      l.slice(0, -1).forEach((t, j) => { link(`${e}:p${j}`); N[`${e}:p${j}`] = { speaker: p.who || who, text: t, ...(j || !p.hook ? {} : { hook: p.hook }) }; open = [N[`${e}:p${j}`]]; });
      link(q);
      N[q] = { speaker: p.who || who, text: l[l.length - 1], choices: opts.map(o => ({ text: o.t, next: `${q}:${o.ok ? 'ok' : 'ng'}`, ...(p.id ? { effects: [{ hook: 'ans', arg: `${p.id}|${o.ok ? 1 : 0}` }] } : {}) })), ...(p.hook && l.length === 1 ? { hook: p.hook } : {}) };
      open = [said(`${q}:ok`, p.who || who, p.ok, { hook: { name: 'nod' } }), said(`${q}:ng`, p.who || who, p.ng)];
    } else {
      const n = id(); link(n);
      N[n] = { speaker: p.who || who, text: p.text, ...(p.hook ? { hook: p.hook } : {}), ...(p.if ? { if: p.if, else: p.else } : {}) };
      open = [N[n]];
    }
  }
  const e = id(); link(e);
  N[e] = { speaker: who, text: end, effects: [{ hook: 'done', arg: 'event' }], end: true };
  return N;
}

// eventDialogs(id, { seed, weather: { metar, decision: 'go' | 'wait' | 'early' | 'cancel', why }, tired, review:
// [{ id, q, opts, ok, why }] }) → the dialog data (dialog 'ev')
export function eventDialogs(id, { seed = 1, weather = null, tired = false, review = [] } = {}) {
  const r = rng(seed * 101 + id.length * 7);
  let N = null;
  if (id === 'forces') N = scene('mechanic', [
    { text: '今日は 4 つの力の授業だったんだってな。せっかくだ、本物で見ていけ。', hook: { name: 'look', arg: 'player' } },
    { q: 'この Archer で、機体を持ち上げる揚力を生んでいるのはどこだ？', opts: ['主翼（翼が空気を押し下げる）', 'プロペラ', '車輪'], ok: 'そうだ。主翼の形と迎え角で、空気を下へ曲げている。', ng: '主翼だ。翼が空気を押し下げて、その反対に機体が持ち上がる。' },
    { q: '推力は？', opts: ['プロペラが前へ引く力', '主翼が押し上げる力', '尾翼が押す力'], ok: 'そう。エンジンがプロペラを回して、機体を前へ引っ張る。', ng: 'プロペラだ。主翼が出すのは揚力のほうだ。' },
    { q: '離陸の滑走で機首を上げていくと、機首はどっちへ向きたがる？', opts: ['左（だから右ラダーを踏む）', '右', 'どっちにも向かない'], ok: 'そのとおり。P ファクターなんかで左に向く。右ラダーだ。', ng: '左だ。プロペラの右側の羽根が強く押すから、機首は左。右ラダーで真っすぐにする。' },
  ], 'よし。初飛行からは、外部点検のたびに主翼を見てくれ。へこみや汚れでも、翼の働きは落ちる。', r);
  if (id === 'pitot') N = scene('mechanic', [
    { text: '今日はピトー静圧の話か。左の翼の下を見てみな。細い管に、赤いカバーが付いてるだろう。', hook: { name: 'point', arg: 'aircraft' } },
    { q: 'あのカバーで、ピトー管も排水穴もふさがったまま離陸したら、速度計は？', opts: ['高度計のように動く（上昇で速度が増えて見える）', '正しく動く', '高度計が止まる'], ok: 'そう。滑走では上がらず、上昇すると増えて見える。だから外部点検で、必ず外して機内にしまう。', ng: '速度計が高度計のように動くんだ。滑走では上がらず、上昇すると増えて見える。' },
    { q: '翼の下の燃料のサンプから、飛ぶ前に燃料を抜いて見る。何を確かめる？', opts: ['水・ごみ・燃料の種類', '燃料の温度', 'タンクの空気の圧力'], ok: 'それだ。水は燃料より重いから、カップの底に透明な玉になって沈む。出なくなるまで抜く。', ng: '水・ごみ・燃料の種類だ。水は燃料より重いから、カップの底に沈む。出なくなるまで抜くんだ。' },
    { q: '最後にひとつ。静圧孔が詰まったら、高度計は？', opts: ['止まる', '速く動く', '正常に動く'], ok: 'そう。昇降計も 0 だ。代替静圧に切り替える。……授業のとおりだな。', ng: '止まるんだ。昇降計も 0 になる。代替静圧に切り替える。' },
  ], '機体のことで気になったら、いつでも言ってくれ。勘違いでいい。', r);
  if (id === 'spell') N = scene('dispatcher', [
    { text: '今日はアルファベットと数字の授業でしたね。せっかくなので、ここで声に出してみましょう。', hook: { name: 'look', arg: 'player' } },
    // (the call sign as the class gave it and the first flight says it: the type's name, then the registration without
    // its N — src: AIM 4-2-4; the book's comm.callsign)
    { q: '初飛行で使う機体、Archer の N738SY を、機種名をつけて無線で言うと？', opts: ['Archer Seven Three Eight Sierra Yankee', 'Archer November Seven Three Eight Sierra Yankee', 'Archer Seventy-Three Eight SY'],
      ok: 'Perfect. 機種名を言うときは先頭の N を省いて、数字は 1 つずつ、文字はフォネティックで。', ng: '機種名を言うときは先頭の N を省きます。数字は 1 けたずつ、文字はフォネティック。Archer Seven Three Eight Sierra Yankee。' },
    { q: 'Ground の周波数、121.7 は？', opts: ['one two one point seven', 'one twenty-one seven', 'twelve one seven'], ok: 'そうです。小数点は point。', ng: '1 けたずつ、小数点は point です。one two one point seven。' },
    { q: '高度 4,500 ft は？', opts: ['four thousand five hundred', 'four five zero zero', 'forty-five hundred'], ok: 'はい。高度は千と百で言います。', ng: '高度は「千・百」で言います。four thousand five hundred。' },
  ], '数字は 1 けたずつ、文字はフォネティック。初飛行の日、管制官に言うときも、このとおりで。', r);
  if (id === 'readback') N = scene('kiryu', [
    { text: '今日の交信の型、復習しようぜ。俺が管制官をやるから、復唱してみて。', hook: { name: 'look', arg: 'player' } },
    { text: '“Archer Eight Sierra Yankee, LAB Ground, runway three six, taxi via Alpha, hold short of runway three six at Alpha One.”' },
    { q: 'さあ、復唱は？', opts: ['Runway three six, taxi via Alpha, hold short of runway three six at Alpha One, Archer Eight Sierra Yankee.', 'Roger, Archer Eight Sierra Yankee.', 'Wilco.'], ok: '……正解。hold short は、滑走路の名前まで復唱だよな。', ng: 'それじゃ駄目だ。hold short の指示は、滑走路の名前まで全部復唱する。Roger だけでは足りない。' },
    { text: '“Archer Eight Sierra Yankee, LAB Tower, runway three six, line up and wait.”' },
    { q: 'これは、離陸の許可？', opts: ['いいえ。滑走路に入って待つだけ', 'はい。そのまま離陸してよい', '滑走路を出ろという意味'], ok: 'そう。cleared for takeoff が来るまで待つ。……引っかからないか。やるな。', ng: '違う。line up and wait は、入って待つだけだ。離陸は cleared for takeoff を聞いてから。' },
  ], 'hold short は滑走路の名前まで、line up and wait は入って待つだけ。……初飛行の本物の管制官にも、それでいこうぜ。', r);
  if (id === 'metar') {
    const w = weather || { metar: 'KLAB 121353Z 36005KT 10SM FEW035 19/12 A2992', decision: 'go', why: '視程・雲・風とも基準内です。' };
    const opts = { go: '予定どおり飛ぶ', wait: '午後まで待つ（回復を待つ）', early: '早めに出て、午前のうちに戻る', cancel: '今日は飛ばない' };
    // (the visibility read off the METAR: "10SM", "1/2SM", "1 1/2SM")
    const m = /\s(?:(\d+)\s)?(\d+)(?:\/(\d+))?SM\b/.exec(` ${w.metar}`), vis = m ? (+(m[1] || 0)) + (m[3] ? +m[2] / +m[3] : +m[2]) : null, enough = vis != null && vis >= 5;
    const yes = '満たしている（5 SM 以上）', no = '満たしていない（5 SM 未満）', told = `今日の判断は「${opts[w.decision]}」です。${w.why}`;
    // (a sky hidden by fog — VV, the vertical visibility — is a ceiling too: src: 14 CFR 1.1 "ceiling")
    const vv = /\bVV\d{3}\b/.test(w.metar) ? '今朝の VV（霧で空が見えないときの垂直視程）も、雲高として扱います。' : '';
    N = scene('dispatcher', [
      { text: '天気の授業、どうでした？ 画面の今朝の METAR、一緒に読んでみましょう。', hook: { name: 'point', arg: 'weather' } },
      { text: `今朝の METAR は「${w.metar}」です。` },
      { q: 'この METAR の視程は、授業の「訓練生の最低条件」の例（視程 5 SM 以上）を満たしていますか？', opts: [enough ? yes : no, enough ? no : yes, 'METAR には視程が書かれていない'],
        ok: `そうです。視程は ${m ? m[0].trim() : '—'}。${told}`, ng: `視程は ${m ? m[0].trim() : '—'}、${enough ? '5 SM 以上あります' : '5 SM に足りません'}。${told}` },
      { q: 'METAR の BKN や OVC の雲の高さを、何と呼ぶでしょう？', opts: ['雲高（シーリング）', '視程', '露点'], ok: `そうです。BKN と OVC の一番低い層が雲高です。${vv}`, ng: `雲高（シーリング）です。BKN と OVC の一番低い層のことです。${vv}` },
    ], '初飛行の朝も、ここで同じように決めます。理由まで言えたら、早瀬教官も安心です。', r);
  }
  if (id === 'imsafe') N = scene('chief', [
    { text: '入社の日の 3 つ目の約束、覚えていますか。疲れているとき、体調がよくないときは、正直に言う。今日の授業の IMSAFE は、その約束を形にしたものです。', hook: { name: 'look', arg: 'player' } },
    { q: 'IMSAFE の M は？', opts: ['Medication（薬）', 'Mission（任務）', 'Maintenance（整備）'], ok: 'そうです。市販の薬でも、眠くなるものは飛ぶ前に確かめます。', ng: 'Medication、薬です。市販の薬でも、眠くなるものは確かめます。' },
    { q: 'F は？', opts: ['Fatigue（疲れ）', 'Fuel（燃料）', 'Flaps（フラップ）'], ok: '疲れです。いちばん自分では気づきにくい。', ng: 'Fatigue、疲れです。自分では気づきにくいものです。' },
    { text: tired ? '……今日のあなたは、少し疲れているように見えます。初飛行の前の夜は、早く寝てください。' : '今日のあなたは、顔色もいい。初飛行の朝も、正直に答えてください。' },
  ], 'わからないことは、わからないと言う。疲れているときは、そう言う。それができる人を、私は信頼します。', r);
  if (id === 'week') {
    const qs = review.slice(0, 3);
    N = scene('asahi', [
      { text: '日曜だね！ よかったら、今週の授業を少しだけ一緒に復習しない？ 間違えたところから。', hook: { name: 'look', arg: 'player' } },
      ...qs.map((x, k) => ({ who: 'asahi', q: `${k ? 'もう一つ。' : ''}${x.q}`, opts: [x.opts[x.ok], ...x.opts.filter((_, j) => j !== x.ok)], ok: `正解！ ${x.why}`.trim(), ng: `答えは「${x.opts[x.ok]}」だって。${x.why}`.trim(), id: x.id })),
      ...(qs.length ? [] : [{ text: '……と思ったけど、まだ問題がないね。じゃあ、ゆっくり休もう。' }]),
    ], 'ありがと！ 人と一緒だと覚えるね。明日からも、がんばろう。', r);
  }
  if (!N) throw new Error(`eventDialogs: no event ${id}`);
  const flags = [];
  return { speakers: SPEAKERS, flags, hooks: [...EVENT_HOOKS], dialogs: { ev: { start: 'e0', nodes: N } }, questions: [] };
}
