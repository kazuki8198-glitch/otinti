// CADET — aircraft/walkaround.js : the walk-around inspection of today's aircraft (M4), the logic.
// The places and their texts are content/walkaround-archer.js. Each day 0–2 anomalies are planted (seeded by the day),
// each at a place that can have it. Looking at a place (E) gives what to check and what is seen; the cadet decides:
//  - 「異常なし」: fine where nothing is wrong; where something is, it is missed (told only in the debrief);
//  - 「異常あり：報告する」: an anomaly the maintenance has to fix is reported (the mechanic fixes it); one the cadet
//    can fix is pointed out to do (the sample again, the cap closed); reporting a place that is fine costs nothing
//    but a word from the instructor;
//  - the place's own task (the control lock out, the ropes untied, the chocks and the pitot cover away), and a fix the
//    cadet can do: done on the spot.
// summary() is what the debrief reads; pending() what the instructor finds before the start (tasks left undone,
// anomalies not found).
// Pure logic: no three.js, no DOM.
import * as ARCHER from '../content/walkaround-archer.js';
import * as SEMINOLE from '../content/walkaround-seminole.js';
import { preflightHookFor } from './failures.js';
// (M6) each aircraft its own places: the Archer's, the Seminole's
export const KITS = { pa28: ARCHER, pa44: SEMINOLE };

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// how many anomalies a day has (0, 1 or 2) and where: from the seed. opts.anomalies: [place id…] (tests) instead.
export function plant(seed, opts = {}) {
  const { POINTS, ANOMALIES } = KITS[opts.aircraft] || ARCHER;
  if (Array.isArray(opts.anomalies)) return opts.anomalies.filter(id => POINTS.some(p => p.id === id && p.bad));
  const R = rng(seed), roll = R(), n = roll < 0.2 ? 0 : roll < 0.7 ? 1 : 2;
  const can = POINTS.filter(p => p.bad && ANOMALIES.includes(p.bad.id)).map(p => p.id);
  const out = [];
  while (out.length < n && can.length) { const k = Math.floor(R() * can.length); out.push(can.splice(k, 1)[0]); }
  return out;
}

export function createWalkaround({ seed = 1, anomalies, aircraft = 'pa28' } = {}) {
  const { POINTS, TASK_MISSED } = KITS[aircraft] || ARCHER;
  const bad = new Set(plant(seed, { anomalies, aircraft }));
  // per place: looked (opened), verdict ('ok' | 'report' | null), the state of its anomaly ('open' | 'found' | 'fixed'),
  // its task done
  const st = new Map(POINTS.map(p => [p.id, { looked: false, verdict: null, bad: bad.has(p.id) ? 'open' : null, task: !p.task, falseReport: false, selfFixed: false }]));
  const log = [];
  const point = (id) => POINTS.find(p => p.id === id) || null;
  // what the card shows: title, what to check, what is seen now, the choices { act, text }
  function inspect(id) {
    const p = point(id), s = st.get(id); if (!p) return null;
    s.looked = true;
    const isBad = s.bad === 'open' || s.bad === 'found';
    const seen = s.bad === 'fixed' ? (p.bad.fix === 'self' ? p.bad.done : `${p.bad.mx}${p.ok}`) : isBad ? p.bad.see : p.ok;
    const choices = [];
    if (p.task && !s.task) choices.push({ act: 'task', text: p.task.verb });
    if (s.bad === 'found' && p.bad.fix === 'self') choices.push({ act: 'fix', text: p.bad.verb });
    if (s.verdict == null || s.bad === 'open') {
      choices.push({ act: 'ok', text: '異常なし' });
      choices.push({ act: 'report', text: '異常あり：報告する' });
    }
    choices.push({ act: 'close', text: 'あとで' });
    return { id, title: p.name, check: p.check, seen: p.task && s.task && !isBad ? `${seen}\n（${p.task.done}）` : seen, choices, done: isDone(id) };
  }
  // the cadet's decision → { text, mx (the maintenance is called: its line), say (the instructor's word) }
  function act(id, what) {
    const p = point(id), s = st.get(id); if (!p) return null;
    let text = '', mx = '', say = '';
    if (what === 'task' && p.task && !s.task) { s.task = true; text = p.task.done; }
    else if (what === 'fix' && s.bad === 'found' && p.bad.fix === 'self') { s.bad = 'fixed'; s.selfFixed = true; text = p.bad.done; }
    else if (what === 'ok') {
      s.verdict = 'ok';
      if (s.bad === 'open') { s.missed = true; text = '異常なしとしました。'; }
      else text = '異常なし。';
    } else if (what === 'report') {
      s.verdict = 'report';
      if (s.bad === 'open') {
        s.bad = 'found';
        if (p.bad.fix === 'mx') { mx = p.bad.mx; s.bad = 'fixed'; text = '整備に連絡しました。'; }
        else text = 'これは自分で直せます。';
      } else if (!s.bad) { s.falseReport = true; say = '見せてください。……これは大丈夫です。でも、迷ったら聞くのは正しいことです。'; text = '教官に確かめてもらいました。'; }
      else text = '報告済みです。';
    } else return { text: '' };
    log.push({ id, what });
    return { text, mx, say };
  }
  // a place is done when it has a verdict (or its anomaly was found) and its task is done
  const isDone = (id) => { const s = st.get(id); return s.task && (s.verdict != null || s.bad === 'found' || s.bad === 'fixed') && s.bad !== 'found'; };
  // the instructor's look round before the start: tasks left undone (he does them), anomalies not found (he finds
  // them; the maintenance fixes them) → [{ id, task?, say }]
  function pending() {
    const out = [];
    for (const p of POINTS) {
      const s = st.get(p.id);
      if (p.task && !s.task) out.push({ id: p.id, task: p.task.id, say: TASK_MISSED[p.task.id] });
      if (s.bad === 'open' || s.bad === 'found') out.push({ id: p.id, anomaly: p.bad.id, say: `${p.name.replace(/^.*?：/, '')}：${p.bad.see}` });
    }
    return out;
  }
  // he puts right what pending() found (the tasks done, the anomalies fixed by the maintenance)
  function settle() {
    for (const p of POINTS) {
      const s = st.get(p.id);
      if (p.task && !s.task) { s.task = true; s.taskByIns = true; }
      if (s.bad === 'open' || s.bad === 'found') { s.badByIns = s.bad === 'open'; s.bad = 'fixed'; }
    }
  }
  function summary() {
    const rows = POINTS.map(p => {
      const s = st.get(p.id), a = bad.has(p.id);
      return { id: p.id, name: p.name, looked: s.looked, done: isDone(p.id), anomaly: a ? p.bad.id : null, found: a && !s.missed && !s.badByIns,
        missed: a && (!!s.missed || !!s.badByIns), falseReport: s.falseReport, taskLeft: !!s.taskByIns };
    });
    return {
      total: POINTS.length, looked: rows.filter(r => r.looked).length, done: rows.filter(r => r.done).length,
      anomalies: rows.filter(r => r.anomaly).length, found: rows.filter(r => r.found).length, missed: rows.filter(r => r.missed),
      falseReports: rows.filter(r => r.falseReport).length, tasksLeft: POINTS.filter(p => p.task && st.get(p.id).taskByIns).map(p => p.task.id), rows,
    };
  }
  // what being left behind connects to in flight (aircraft/failures.js PREFLIGHT_HOOKS — the existing
  // hooks only): a task not done, or an anomaly still open (never found, or reported but not yet put
  // right), as it stands NOW. career/day.js captures this at boarded(), before settle() puts the
  // ground items right for the debrief's record; fly-mode seeds the flight hooks from the capture.
  function consequences() {
    const out = [];
    for (const p of POINTS) {
      const s = st.get(p.id);
      if (p.task && !s.task) out.push({ source: 'task', point: p.id, item: p.task.id, ...preflightHookFor('task', p.task.id) });
      if (p.bad && (s.bad === 'open' || s.bad === 'found')) out.push({ source: 'defect', point: p.id, item: p.bad.id, ...preflightHookFor('defect', p.bad.id) });
    }
    return out;
  }
  // what the 3D props show (the tasks' things, the anomalies one can see)
  function props() {
    // (by the task's id: each aircraft has its places where it has them)
    const task = (tid) => { const p = POINTS.find(x => x.task && x.task.id === tid); return p ? !st.get(p.id).task : false; };
    const open = (id) => { const g = st.get(id); return !!g && (g.bad === 'open' || g.bad === 'found'); };
    return { lock: task('lock'), tieR: task('tieR'), tieL: task('tieL'), tieT: task('tieT'), chocks: task('chocks'), pitot: task('pitot'),
      capOpen: open('r_cap'), tireLow: open('r_main'), brakeLeak: open('l_main') };
  }
  return { points: POINTS, inspect, act, pending, settle, summary, props, isDone, consequences, planted: [...bad], get log() { return log.slice(); } };
}
