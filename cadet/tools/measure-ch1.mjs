// CADET — tools/measure-ch1.mjs : chapter 1 measured without a browser (node only), as a new cadet plays it from the
// first day to the morning of the first flight (day 10). For each pace of the classes: the time it takes and where it
// goes, each day's lines, decisions and longest stretch without one, the lines that come back day after day, every
// scored question and whether the line that answers it had been said before it, the days of the classes and of the
// training device's lessons, and k4's decisions and longest stretch without input.
//   node tools/measure-ch1.mjs [--seed N] [--seeds A-B] > out.json
// The tests (test/measure.test.mjs) judge the goals with these same functions.
// How it counts (the brief's §7):
//  - a decision: a choice of two or more where what is chosen changes what comes next (right or wrong, a reason, the
//    state); not a choice only of "go on / again", the pace, the end of a section's menu. In k4: an operation whose
//    value is checked (the frequency, the altimeter, the code) counts too;
//  - a stretch without a decision: the reading time of the lines from one decision to the next, within a talk;
//  - k4's stretch without input: the controller's transmissions (LINE_S of dialog/atc.js) plus the subtitles' reading;
//  - a pattern (型): a line with what its 「…」 hold and its numbers masked;
//  - time: reading by school.js's formula, English transmissions by LINE_S, walking at 1.45 m/s, the day's cards and
//    toasts included; the day's events are part of the way (they are not optional).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(here, '..');
const FL_SRC = path.join(ROOT, '..', 'flight-lab', 'src');
const FL_FILES = ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js', 'radio.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'];
const mod = (p) => import(pathToFileURL(path.join(ROOT, 'src', p)).href);

export const WALK_MPS = 1.45;
// the line's time (school.js: typed at 40 characters a second with pauses, read at 10 a second, a second to go on)
const TYPE_CPS = 40, READ_CPS = 10, LINE_S1 = 1;
const pauseAfter = (c) => ('。！？!?'.includes(c) ? 6 : '、，,：'.includes(c) ? 3 : c === '\n' ? 4 : '…―—'.includes(c) ? 1.5 : 0);
export const typingSeconds = (text) => Array.from(String(text ?? '')).reduce((s, c) => s + 1 + pauseAfter(c), 0) / TYPE_CPS;
export const readingSeconds = (text) => Math.max(typingSeconds(text), Array.from(String(text ?? '')).length / READ_CPS) + LINE_S1;
// an English transmission (dialog/atc.js LINE_S: about a controller's pace)
export const LINE_S = (en) => 1.2 + String(en).split(/\s+/).length * 0.32;
// a pattern: the 「…」 and “…” emptied, the numbers masked
export const patternOf = (t) => String(t ?? '').replace(/「[^」]*」/g, '「…」').replace(/『[^』]*』/g, '『…』').replace(/“[^”]*”/g, '“…”').replace(/[0-9０-９]+(?:[.,][0-9]+)*/g, '#').replace(/\s+/g, ' ').trim();

let LOADED = null;
export async function load() {
  if (LOADED) return LOADED;
  for (const m of FL_FILES) vm.runInThisContext(fs.readFileSync(path.join(FL_SRC, m), 'utf8'), { filename: m });
  const { installSorajima } = await mod('flight/sorajima.js'); installSorajima(globalThis.FL);
  const FL = globalThis.FL;
  const [school, career, engine, book, people, insc, spec, guide, answers, cast] = await Promise.all([mod('content/school.js'), mod('career/career.js'), mod('dialog/engine.js'), mod('content/book.js'),
    mod('content/dialog/people.js'), mod('content/dialog/instructor-career.js'), mod('content/academy-spec.js'), mod('career/guide.js'), mod('content/answer-map.js'), mod('content/people.js')]);
  let flow = null; try { flow = await mod('content/day-flow.js'); } catch (e) { /* (before the day's own lines) */ }
  LOADED = { FL, school, career, engine, book, people, cast, insc, spec, guide, answers, flow, BOOK: book.gameBook(FL), SPEC: spec.academySpec(FL) };
  return LOADED;
}

// ---------------------------------------------------------------- walking: through the academy's doors (career/guide.js's router)
export function walkMeters(L, from, to) {
  const R = L.guide.makeRouter(L.SPEC), roomAt = (p) => (L.SPEC.rooms.find(r => p.a >= r.a0 && p.a <= r.a1 && p.c >= r.c0 && p.c <= r.c1) || { id: 'outside' }).id;
  let p = from, m = 0, room = roomAt(from);
  const end = roomAt(to);
  for (let k = 0; k < 12 && room !== end; k++) {
    const d = R.next(room, end); if (!d) break;
    m += Math.hypot(d.a - p.a, d.c - p.c); p = d;
    const door = L.SPEC.doors.find(x => x.id === d.door); room = door.rooms[0] === room ? door.rooms[1] : door.rooms[0];
  }
  return m + Math.hypot(to.a - p.a, to.c - p.c);
}
export const PLACES = { entrance: { a: 655.0, c: 274.6 }, home: { a: 655.0, c: 276.2 } };
const placeOfPerson = (L, who, slot, chapter, what) => {
  if (who === 'instructor') return { a: 634.9, c: 256.7 };
  const at = L.cast.placeOf(who, slot, chapter, what) || L.cast.PLACES.classroom;
  return { a: at.a, c: at.c };
};

// ---------------------------------------------------------------- a talk, run as the player runs it
// policy(view, step) → the index chosen (or null: the default — the first). Returns the lines shown with their times,
// the decisions, the hooks, the scored questions
export function runTalk(L, data, dialogId, { policy = () => null, ctx = {}, state = null, onHook = null, node, kind = 'talk' } = {}) {
  const st = state || L.engine.createDialogState(), hooks = [], lines = [];
  const qs = data.questions || [];
  const r = L.engine.createRunner({ data, state: st, ctx, hooks: { onHook: (n, a) => { hooks.push([n, a, lines.length]); if (onHook) onHook(n, a, ctx, st); } } });
  r.start(dialogId, node);
  const max = 4 * Object.values(data.dialogs).reduce((n, d) => n + Object.keys(d.nodes).length, 0) + 200;
  const N = data.dialogs;
  for (let k = 0; k < max && r.running; k++) {
    const v = r.view(), n = N[v.dialog].nodes[v.node];
    const say = (n.hook && n.hook.name === 'say') ? n.hook.arg : null;
    const line = { node: v.node, speaker: v.speaker, text: v.text, tag: v.tag || '', choices: v.choices.map(c => c.text), say, t: Math.max(readingSeconds(v.text), say ? LINE_S(say) : 0), decision: false, q: null, chosen: null };
    lines.push(line);
    if (v.choices.length) {
      line.decision = isDecision(v, n);
      const qi = /^q(\d+)$/.exec(v.node), x = qi ? qs[+qi[1]] : null;
      let i = policy(v, k, x);
      if (i == null) i = x ? v.choices.findIndex(c => c.text === x.opts[x.ok]) : 0;
      if (x) line.q = { k: +qi[1], id: questionId(L, x, kind), right: v.choices[i] && v.choices[i].text === x.opts[x.ok] };
      line.chosen = i;
      r.choose(i);
    } else r.next();
  }
  return { lines, hooks, state: st, ended: !r.running };
}
// a decision: see the head of this file. The node's own `kind` when it has one (the classes and k4 mark theirs),
// else by what it is: a scored question, the lecturer's check (right or wrong said)
export function isDecision(v, n) {
  if (n && n.kind) return n.kind === 'decision';
  if (/^q\d+$/.test(v.node)) return true;
  if (/:ask$/.test(v.node)) return true;
  return false;
}
// a scored question's id: its own (the classes' since the map), else found from its text
export function questionId(L, x, kind) {
  if (x.id) return x.id;
  const book = L.BOOK, fx = (t) => L.school.lectureLines ? String(t) : String(t);
  const refs = (t) => String(t || '').replace(/\{ch:([a-z0-9]+)\}/g, (m, id) => { const c = book.chapters.find(y => y.id === id); return c ? `第 ${c.n} 章` : '教科書'; });
  const our = (t) => String(t).replace(/(Archer|Seminole) Seven Lima Alpha/g, 'Archer Seven Three Eight Sierra Yankee').replace(/(Archer|Seminole) 7LA/g, 'Archer 8SY');
  for (const b of L.FL.quiz.BANKS) { const i = b.qs.findIndex(q => our(refs(q[0])) === x.q); if (i >= 0) return `${b.id}#${i}`; }
  const sc = L.FL.radio.SCENES.find(s => x.q.startsWith(`${s.title}：`)); if (sc) return `scene:${sc.id}`;
  const DR = [[/^高度 [\d,]+ ft の言い方/, 'alt'], [/^FL\d+ の言い方/, 'fl'], [/^針路 \d+° の言い方/, 'hdg'], [/^速度 \d+ kt の言い方/, 'spd'], [/^周波数 [\d.]+ の言い方/, 'frq'], [/^高度計 [\d.]+ inHg の言い方/, 'alts'],
    [/^コード \d+ の言い方/, 'sqk'], [/^滑走路 \w+ の言い方/, 'rwy'], [/^風 \d+° \d+ kt/, 'wnd'], [/^フロリダの/, 'utc'], [/^登録記号/, 'call'], [/^(“\w+” はどの文字|文字「\w」のフォネティック)/, 'letter']];
  for (const [re, k] of DR) if (re.test(x.q)) return `drill:${k}`;
  const LI = [[/旋回の方向・針路・高度/, 'vector'], [/周波数とコードは/, 'contact'], [/滑走路と指示は/, 'takeoff'], [/交通情報の内容は/, 'traffic'], [/この送信は誰宛て/, 'notme'], [/高度計規正値は/, 'altim']];
  for (const [re, k] of LI) if (re.test(x.q)) return `listen:${k}`;
  const PF = [[/^速度（/, 'ias'], [/^高度（/, 'alt'], [/^機首の方位/, 'hdg'], [/^昇降率/, 'vs'], [/^傾き/, 'bank']];
  for (const [re, k] of PF) if (re.test(x.q)) return `pfd:${k}`;
  return null;
}
// the answer's words for a question id (content/answer-map.js) → [[sec, words]] | null (not in part 1) | undefined (unknown)
export function answerOf(L, id) {
  const A = L.answers;
  if (!id) return undefined;
  let m;
  if ((m = /^(q_[a-z]+)#(\d+)$/.exec(id))) { const b = A.BANK_ANSWERS[m[1]]; return b && b[+m[2]] ? b[+m[2]].a : undefined; }
  if ((m = /^scene:(\w+)$/.exec(id))) return id.slice(6) in A.SCENE_ANSWERS ? A.SCENE_ANSWERS[m[1]] : undefined;
  if ((m = /^drill:(\w+)$/.exec(id))) return A.DRILL_ANSWERS[m[1]];
  if ((m = /^listen:(\w+)$/.exec(id))) return A.LISTEN_ANSWERS[m[1]];
  if ((m = /^pfd:(\w+)$/.exec(id))) return [['k1', A.PFD_ANSWERS[m[1]]]];
  return undefined;
}
const squash = (s) => String(s).replace(/\s+/g, '');
// was every line of the answer said before? heard: the text heard so far (squashed), k1: k1 passed (its parts said)
export function answerHeard(L, id, heard, k1Parts) {
  const a = answerOf(L, id);
  if (a === undefined) return { known: false, said: false };
  if (a === null) return { known: true, inBook: false, said: false };
  const said = a.every(([sec, w]) => (sec === 'k1' ? k1Parts.has(w) : heard.includes(squash(w))));
  return { known: true, inBook: true, said };
}

// ---------------------------------------------------------------- chapter 1, day by day
// pace: 'need' | 'full' | 'quick' (the class's choice, by its label); seed: the career's; skip: the moves skipped when
// the game offers it (the second time on)
const PACE_LABEL = { need: /^今日の訓練に要る/, full: /^じっくり/, quick: /^要点だけ/ };
export async function measureCh1({ pace = 'full', seed = 1, skip = false, wrong = 0 } = {}) {
  const L = await load(), C = L.career, S = L.school, FL = L.FL;
  const store = (() => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; })();
  const career = C.createCareer({ store, seed });
  const prog = FL.school.sanitizeProgress({});
  const talk = L.engine.createDialogState();
  const days = [], heardAll = [], k1Parts = new Set();
  let heard = '';
  const asked = [];
  const classDay = {}, ftdDay = {};
  const pacePick = (v) => { if (v.node !== 'pace' && v.node !== 'pace:2') return null; const i = v.choices.findIndex(c => PACE_LABEL[pace].test(c.text)); return i >= 0 ? i : null; };
  let wrongLeft = wrong;
  const answerPolicy = (base) => (v, k, x) => { const p = base ? base(v, k, x) : null; if (p != null) return p; if (x && wrongLeft > 0) { wrongLeft--; const ok = v.choices.findIndex(c => c.text === x.opts[x.ok]); return (ok + 1) % v.choices.length; } return null; };
  const flowOf = (day) => (L.flow && L.flow.dayFlow ? L.flow.dayFlow : null);
  while (career.state.day <= 10 && days.length < 14) {
    const st = career.state, d = st.day, w = career.weather(prog), sch = career.schedule(prog, { trust: 50, weather: w });
    const day = { day: d, date: C.dateText(d), chapter: st.chapter, plan: sch.map(x => `${x.slot}:${x.kind}:${x.id || ''}`), talks: [], fixed: [], walkS: 0, cardS: 0, toastS: 0, lines: 0, decisions: 0, longestGap: 0, time: 0 };
    days.push(day);
    const fixed = (what, text, t) => { day.fixed.push({ what, text, t }); };
    // the morning: the card (0.65 s in, its time, 0.65 s out), the day's toast
    fixed('card', `${C.CHAPTERS[st.chapter].title} ${C.dateText(d)}`, 1.3 + 1.7);
    if (d === 10) break;                                                         // (the first flight's morning: here it ends)
    const greet = st.chapter === 'prologue' ? '入社の日です。ロビーで、主任教官の話が始まります' : sch.some(x => x.kind === 'off') ? '今日は休日です。ラウンジで休むのも、自習するのもいい。正面入口から寮に帰れば、明日になります'
      : `今日の予定：${sch.map(x => `${C.SLOT_NAMES[x.slot]} ${x.title}`).join('／')}（Tab でタブレット）`;
    fixed('toast', greet, readingSeconds(greet));
    let at = PLACES.entrance, slot = st.slot;
    const walk = (to, why) => { const m = walkMeters(L, at, to); at = to; fixed('walk', why, m / WALK_MPS); };
    const guideLine = (text) => fixed('guide', text, readingSeconds(text));
    const doTalk = (label, data, id, opts = {}) => {
      const r = runTalk(L, data, id, opts);
      day.talks.push({ label, ...summarize(r.lines), lines: r.lines });
      for (const l of r.lines) { heardAll.push(l.text); heard += squash(l.text); }
      return r;
    };
    if (st.chapter === 'prologue') {
      const ctx = { career: { chapter: 'prologue', slot: 'morning', day: 1, dayMod3: 1, tired: false, solo: false, flying: false, graduated: false }, today: {}, weather: {}, imsafe: { honest: true } };
      walk(placeOfPerson(L, 'chief', 'morning', 'prologue', sch), 'ロビー：主任教官');
      doTalk('ceremony', L.people.peopleDialogs(), 'chief', { ctx, state: talk }); career.done('ceremony', 'welcome'); career.advance('am');
      const t1 = '運航管理の佐伯さんが、訓練所を案内してくれます（ロビーの北、運航管理）'; fixed('toast', t1, readingSeconds(t1));
      walk(placeOfPerson(L, 'dispatcher', 'am', 'prologue', sch), '運航管理');
      ctx.career.slot = 'am';
      doTalk('tour', L.people.peopleDialogs(), 'dispatcher', { ctx, state: talk }); career.done('tour', 'tour'); career.advance('pm');
      const t2 = '午後：ブリーフィング室 1 で、担当の早瀬 教官と顔合わせです'; fixed('toast', t2, readingSeconds(t2));
      walk(placeOfPerson(L, 'instructor'), 'ブリーフィング室 1');
      doTalk('meet', L.insc.careerInstructorDialogs(), 'meet', { ctx, state: talk, policy: (v) => { const i = v.choices.findIndex(c => /今は大丈夫/.test(c.text)); return i >= 0 ? i : null; } });
      career.done('brief', 'meet'); career.finishPrologue(); career.advance('evening');
      const t3 = '夕方です。ラウンジで同期と話してみましょう。今日を終えるときは、正面入口から寮へ'; fixed('toast', t3, readingSeconds(t3));
    } else if (!sch.some(x => x.kind === 'off')) {
      for (const it of sch) {
        if (it.kind === 'class') {
          guideLine(L.guide.nextStep({ chapter: st.chapter, slot: it.slot, plan: sch.map(x => ({ ...x, state: x === it ? 'now' : 'later' })) }).text);
          walk(placeOfPerson(L, 'lecturer', 'am', 'ch1', sch), 'ブリーフィング室 2');
          const q = { quiz: {} }, s2 = L.engine.createDialogState();
          const data = S.classDialogs(FL, +it.id, { seed: st.seed, ...(S.CLASS_OPTIONS ? S.CLASS_OPTIONS(career.state, prog) : {}) });
          const r = doTalk(`class ${it.id}`, data, 'class', { state: s2, ctx: q, policy: answerPolicy(pacePick), kind: 'class', onHook: (n, a) => { if (n === 'quizEnd') q.quiz = S.scoreOf(s2, +a); } });
          noteAsked(L, r, asked, d, `class ${it.id}`, heardBefore(heardAll, r), k1Parts);
          career.done('class', it.id); career.tire(6); career.advance('pm');
          classDay[it.id] = { day: d, chapters: S.CLASS_CHAPTERS[+it.id] };
          const tc = '午後：訓練装置室（FTD）で訓練装置の課目です'; fixed('toast', tc, readingSeconds(tc));
        } else if (it.kind === 'ftd') {
          guideLine(L.guide.nextStep({ chapter: st.chapter, slot: it.slot, plan: sch.map(x => ({ ...x, state: x === it ? 'now' : x.slot === 'am' ? 'done' : 'later' })) }).text);
          walk(placeOfPerson(L, 'lecturer', 'pm', 'ch1', sch.filter(x => x.kind === 'ftd').map(x => ({ ...x, slot: 'pm' }))), '訓練装置室');
          const q = { quiz: {} }, s2 = L.engine.createDialogState();
          let result = null;
          const data = S.ftdDialogs(FL, it.id, { seed: st.seed + st.day });
          const r = doTalk(`ftd ${it.id}`, data, 'ftd', { state: s2, ctx: q, kind: 'ftd', policy: answerPolicy(null), onHook: (n, a) => { if (n === 'quizEnd') q.quiz = S.scoreOf(s2, +a); if (n === 'done') result = a; } });
          noteAsked(L, r, asked, d, `ftd ${it.id}`, heardBefore(heardAll, r), k1Parts);
          if (it.id === 'k1') for (const h of r.hooks) { const m = /^tutor:(\w+)$/.exec(h[1] || ''); if (h[0] === 'pfd' && m) k1Parts.add(m[1]); }
          career.done('ftd', it.id); career.tire(6);
          if (result === 'pass') { prog.lessons[it.id] = { tries: 1, best: 'S', pass: true, levels: [] }; }
          ftdDay[it.id] = { day: d, result };
          career.advance(it.slot === 'am' ? 'pm' : 'evening');
          const tf = `${it.id} 合格。${career.slot === 'evening' ? '今日の予定は終わりです' : ''}`; fixed('toast', tf, readingSeconds(tf));
        } else if (it.kind === 'exam') {
          guideLine(L.guide.nextStep({ chapter: st.chapter, slot: it.slot, plan: [{ ...it, state: 'now' }] }).text);
          walk(placeOfPerson(L, 'lecturer', it.slot, 'ch1', [it]), '計画室');
          const q = { quiz: {} }, s2 = L.engine.createDialogState();
          const data = S.examDialogs(FL, it.id, { seed: st.seed + st.day });
          const r = doTalk(`exam ${it.id}`, data, 'exam', { state: s2, ctx: q, kind: 'exam', onHook: (n, a) => { if (n === 'quizEnd') q.quiz = S.scoreOf(s2, +a); } });
          noteAsked(L, r, asked, d, `exam ${it.id}`, heardBefore(heardAll, r), k1Parts);
          career.exam(it.id, q.quiz.pct); career.advance('evening');
        }
      }
    }
    // home: the guide's line, the walk to the front door, the dorm's card (read, chosen)
    const done = '今日の予定は終わり。ラウンジで同期と話せます。正面入口から寮に帰ると次の日になります';
    guideLine(done);
    walk(PLACES.home, '正面入口');
    const dorm = '寮へ帰る 今日の訓練はここまで。寮に帰って休みます。 すぐに寝る 少し自習してから寝る（疲れが残る） やっぱり残る';
    fixed('dorm', dorm, readingSeconds(dorm));
    career.sleep(); career.advanceChapter(prog, 50);
  }
  for (const day of days) {
    for (const f of day.fixed) { if (f.what === 'walk') day.walkS += f.t; else if (f.what === 'card') day.cardS += f.t; else day.toastS += f.t; }
    day.talkS = day.talks.reduce((s, t) => s + t.time, 0);
    day.lines = day.talks.reduce((s, t) => s + t.n, 0); day.decisions = day.talks.reduce((s, t) => s + t.decisions, 0);
    day.longestGap = Math.max(0, ...day.talks.map(t => t.longestGap));
    day.fixedS = day.walkS + day.cardS + day.toastS;
    day.time = day.talkS + day.fixedS;
  }
  return { pace, seed, days, asked, classDay, ftdDay };
}
// the text heard before each line of a talk: what was heard before the talk, then its own lines in order
function heardBefore(all, r) { const before = squash(all.slice(0, all.length - r.lines.length).join('')); return (k) => before + squash(r.lines.slice(0, k).map(l => l.text).join('')); }
function noteAsked(L, r, asked, day, where, upTo, k1Parts) {
  r.lines.forEach((l, k) => { if (!l.q || !l.decision) return; const h = answerHeard(L, l.q.id, upTo(k), k1Parts); asked.push({ day, where, id: l.q.id, right: l.q.right, ...h }); });
}
// a talk's lines: how many, how long, the decisions, the longest stretch without one
export function summarize(lines) {
  let gap = 0, longest = 0, decisions = 0, time = 0;
  for (const l of lines) { time += l.t; gap += l.t; if (l.decision) { decisions++; longest = Math.max(longest, gap); gap = 0; } }
  longest = Math.max(longest, gap);
  return { n: lines.length, time, decisions, longestGap: longest };
}

// ---------------------------------------------------------------- the patterns that come back
// the lines a day begins and ends with (the class's first and last, the device's first, the toasts, the guide, the
// dorm's card), as patterns: on how many days each comes back
export function dayPatterns(run) {
  const where = {}, add = (what, text, d) => { const p = `${what}｜${patternOf(text)}`; (where[p] = where[p] || new Set()).add(d); };
  for (const day of run.days) {
    for (const t of day.talks) {
      if (/^class/.test(t.label) && t.lines.length) { add('class:first', t.lines[0].text, day.day); add('class:last', t.lines[t.lines.length - 1].text, day.day); }
      if (/^ftd/.test(t.label) && t.lines.length) add('ftd:first', t.lines[0].text, day.day);
    }
    for (const f of day.fixed) if (f.what === 'toast' || f.what === 'guide' || f.what === 'dorm') add(f.what, f.text, day.day);
  }
  return Object.entries(where).map(([p, s]) => ({ pattern: p, days: [...s].sort((a, b) => a - b) })).sort((a, b) => b.days.length - a.days.length);
}
// the class's frame: every sentence the classes say, as a pattern, and how often it comes in chapter 1 (the book's own
// sentences are each said once; a pattern said 8 times or more is the frame repeating)
export function framePatterns(run) {
  const n = {};
  for (const day of run.days) for (const t of day.talks) if (/^class/.test(t.label)) for (const l of t.lines) {
    for (const s of String(l.text).split(/(?<=[。！？?])/).map(x => x.trim()).filter(Boolean)) { const p = patternOf(s); n[p] = (n[p] || 0) + 1; }
    for (const c of l.choices) { const p = `［選択］${patternOf(c)}`; n[p] = (n[p] || 0) + 1; }
  }
  return Object.entries(n).map(([pattern, count]) => ({ pattern, count })).sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------- the whole picture
export async function measureAll({ seeds = [1], paces = null } = {}) {
  const L = await load();
  const P = paces || (L.school.PACES ? L.school.PACES : ['full', 'quick']);
  const out = { built: new Date().toISOString().slice(0, 10), paces: {} };
  for (const pace of P) {
    const runs = [];
    for (const seed of seeds) runs.push(await measureCh1({ pace, seed }));
    const r = runs[0];
    const by = (f) => r.days.reduce((s, d) => s + f(d), 0);
    const talkBy = (re) => r.days.reduce((s, d) => s + d.talks.filter(t => re.test(t.label)).reduce((a, t) => a + t.time, 0), 0);
    const askedAll = runs.flatMap(x => x.asked);
    const inBook = askedAll.filter(a => a.known && a.inBook);
    out.paces[pace] = {
      totalMin: by(d => d.time) / 60,
      breakdownMin: { classes: talkBy(/^class/) / 60, ftd: talkBy(/^ftd/) / 60, k4: talkBy(/^ftd k4/) / 60, exam: talkBy(/^exam/) / 60, prologue: talkBy(/^(ceremony|tour|meet)/) / 60,
        events: talkBy(/^event/) / 60, study: talkBy(/^study/) / 60, walk: by(d => d.walkS) / 60, fixedNoWalk: by(d => d.cardS + d.toastS) / 60 },
      days: r.days.map(d => ({ day: d.day, plan: d.plan, minutes: +(d.time / 60).toFixed(1), talkMin: +(d.talkS / 60).toFixed(1), fixedS: Math.round(d.fixedS), walkS: Math.round(d.walkS), lines: d.lines, decisions: d.decisions, longestGapMin: +(d.longestGap / 60).toFixed(2),
        talks: d.talks.map(t => ({ label: t.label, lines: t.n, minutes: +(t.time / 60).toFixed(1), decisions: t.decisions, longestGapMin: +(t.longestGap / 60).toFixed(2) })) })),
      questions: { asked: askedAll.length, known: askedAll.filter(a => a.known).length, inBook: inBook.length, saidBefore: inBook.filter(a => a.said).length,
        saidBeforePct: inBook.length ? +(100 * inBook.filter(a => a.said).length / inBook.length).toFixed(1) : null, notInBook: askedAll.filter(a => a.known && !a.inBook).length,
        byWhere: Object.fromEntries([...new Set(askedAll.map(a => a.where))].map(w => { const x = askedAll.filter(a => a.where === w && a.inBook); return [w, { asked: askedAll.filter(a => a.where === w).length, saidBefore: x.filter(a => a.said).length }]; })),
        notSaid: [...new Set(inBook.filter(a => !a.said).map(a => `${a.where} ${a.id}`))].slice(0, 60) },
      classDay: r.classDay, ftdDay: r.ftdDay,
      dayPatterns: dayPatterns(r).filter(p => p.days.length >= 3),
      framePatterns: framePatterns(r).filter(p => p.count >= 8),
    };
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), arg = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const seeds = arg('--seeds') ? (([x, y]) => Array.from({ length: y - x + 1 }, (_, i) => x + i))(arg('--seeds').split('-').map(Number)) : [Number(arg('--seed') || 1)];
  const res = await measureAll({ seeds });
  process.stdout.write(JSON.stringify(res, null, 1) + '\n');
}
