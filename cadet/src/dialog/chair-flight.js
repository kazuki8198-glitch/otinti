// CADET — dialog/chair-flight.js : k4's runner (content/chair-flight.js has the flight). One item after another: what
// is heard (the controllers' and the ATIS's lines, each as long as it takes to say, LINE_S), then the cadet's turn — a
// switch to set (COM1, the altimeter, the code, listening before calling) or what to say (three ways to say it, 1–3, or
// said into the microphone: dialog/readback.js) — then the reply. A wrong answer brings the controller's correction
// ("negative, …") and the turn again; no answer in time, the controller's "how do you hear?" (noted as late).
// The stages: 1 the script in view (the right words marked; no clock, not scored); 2 the script hidden (no clock;
// scored); 3 for real (the clock; scored). The clock runs only once the line before it has been heard whole: its time
// spent, and the voice (when there is one) done — hold() says it is still speaking.
// The score: the items answered right the first time, in time (at stage 3), out of all of them; 80% passes.
// summary(): every item — right the first time or not, late or not, what was said, and for a wrong call the words of
// the right one that it left out (readback.js keysOf) — for the debrief. Pure logic: no DOM.
import { keysOf, hearKeys } from './readback.js';

export const LINE_S = (en) => 1.2 + String(en).split(/\s+/).length * 0.32;      // (dialog/atc.js: a controller's pace)
// a call too long for one line of the panel (over 110 characters: the first call to Ground) in two, at the comma nearest
// its middle (it is said whole)
export function panelParts(en, max = 110) {
  const t = String(en);
  if (t.length <= max) return [t];
  const cuts = [...t.matchAll(/, /g)].map(m => m.index + 1), mid = t.length / 2;
  if (!cuts.length) return [t];
  const c = cuts.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
  return [...panelParts(t.slice(0, c).trim(), max), ...panelParts(t.slice(c).trim(), max)];
}
export const PASS = 80;
const TIME = { op: 20 };
// the clock of a turn (stage 3): the item's own time, but never less than the question and its choices read (10
// characters a second, as the measure reads) and 8 s to choose — a cadet who reads every choice is not late for it
const timeOf = (it) => {
  const base = it.kind === 'ex' ? it.ex.time || 25 : TIME.op, cs = it.kind === 'ex' ? it.ex.choices.map(c => c.en) : it.choices.map(c => c.t);
  return Math.max(base, Math.ceil(8 + [it.kind === 'ex' ? it.ex.q : it.q, ...cs].join('').length / 10));
};

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// createChairFlight(script, { stage, seed, only, hold }) → the runner. only: the items' ids to go through (practising
// the ones missed); hold(): true while the last line is still being spoken (the clock waits)
export function createChairFlight(script, { stage = 2, seed = 1, only = null, hold = () => false, call } = {}) {
  // (practising only some: a read-back — or a "say again" — is heard with the transmission it answers, the reply of the
  // item before it, so there is something to read back)
  const all = script.items, ctx = (x, k) => { const p = all[k - 1]; return x.kind === 'ex' && !(x.ex.hear && x.ex.hear.length) && p && p.kind === 'ex' && p.ex.reply && p.ex.reply.length ? { ...x, ex: { ...x.ex, hear: p.ex.reply } } : x; };
  const R = rng(seed * 7 + stage), items = only ? all.map(ctx).filter(x => only.includes(x.id)) : all.slice();
  const out = [], log = [], events = [], turns = [];
  let i = -1, cur = null, com = '', alt = '', done = false, clock = 0;
  const callSign = call || (script.radio && script.radio.call) || null;
  const station = (it) => (it.kind === 'ex' ? it.ex.station : 'OPS');
  const freqOf = (it) => (it.kind === 'ex' ? it.ex.freq : com || '—');
  const choicesOf = (it) => (it.kind === 'ex' ? it.ex.choices.map(c => ({ text: c.en, ok: !!c.ok, why: c.why || '', negative: c.negative || '' })) : it.choices.map(c => ({ text: c.t, ok: !!c.ok, why: c.why || '' })));
  function next() {
    i++;
    const it = items[i];
    if (!it) { cur = null; done = true; events.push({ type: 'done' }); return; }
    const cs = choicesOf(it), order = cs.map((_, k) => k);
    for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(R() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
    const hear = (it.kind === 'ex' ? it.ex.hear || [] : it.hear || []).slice();
    cur = { it, cs, order, phase: 'hear', queue: hear, lines: [], t: 0.4, timeLeft: timeOf(it), tries: 0, late: false, last: null, said: [], why: false };
    events.push({ type: 'item', id: it.id, part: it.part });
    pump();
  }
  // the next line heard, else the turn, else (after the reply) the next item
  function pump() {
    if (cur.queue.length) {
      // (a long transmission in two lines of the panel, its meaning under the last; said whole)
      const l = cur.queue.shift(), parts = panelParts(l.en);
      parts.forEach((p, k) => { const x = { ...l, en: p, ja: k === parts.length - 1 ? l.ja : '' }; cur.lines.push(x); log.push({ ...x, item: cur.it.id, at: clock }); });
      cur.t = Math.max(LINE_S(l.en), 0.8); events.push({ type: 'say', who: l.who, en: l.en }); return;
    }
    if (cur.phase === 'hear' || cur.phase === 'negative') { cur.phase = 'choose'; cur.t = 0; return; }
    if (cur.phase === 'reply') {
      const it = cur.it, firstOk = cur.tries === 1 && !cur.late;
      out.push({ id: it.id, part: it.part, sec: it.sec, kind: it.kind, station: station(it), exKind: it.kind === 'ex' ? it.ex.kind || '' : '', ok: firstOk, late: cur.late, tries: cur.tries, said: cur.said.slice(), right: cur.cs.find(c => c.ok).text, missing: cur.missing || [] });
      next();
    }
  }
  function update(dt) {
    // (what came before this step — the first item's line, begun with the run — given now, so the voice says it too)
    const before = events.splice(0), out = (e) => (before.length ? before.concat(e) : e);
    clock += dt;
    if (!cur) return out(events);
    if (cur.phase === 'choose') {
      if (stage < 3 || hold()) return out(events);              // (no clock at stages 1 and 2; nor while the voice goes on)
      cur.timeLeft -= dt;
      if (cur.timeLeft <= 0 && !cur.late) {
        cur.late = true; cur.timeLeft = timeOf(cur.it);
        // (the controller asks only for a reply to what was said to the cadet — a read-back — not for a call the cadet
        // has yet to make, nor for a switch or the ATIS: those are late without a word)
        if (cur.it.kind === 'ex' && cur.it.ex.station !== 'ATIS' && cur.it.ex.kind !== 'call' && cur.it.ex.kind !== 'listen') {
          const st = cur.it.ex.station, again = { who: st, en: `${callSign ? callSign.short : 'Archer'}, LAB ${st === 'GND' ? 'Ground' : 'Tower'}, how do you hear?`, ja: '聞こえていますか？（応答がない）' };
          cur.lines.push(again); log.push({ ...again, item: cur.it.id, at: clock }); events.push({ type: 'say', who: again.who, en: again.en });
        } else events.push({ type: 'late' });
      }
    // (a line's time runs while the voice says it; the next waits for both: the longer of the two, not their sum)
    } else if ((cur.t -= dt) <= 0 && !hold()) pump();
    return out(events);
  }
  // the cadet's answer: the k-th choice on screen → { ok, why, text } | null
  function answer(k) {
    if (!cur || cur.phase !== 'choose') return null;
    const c = cur.cs[cur.order[k]]; if (!c) return null;
    const it = cur.it, right = cur.cs.find(x => x.ok);
    cur.tries++; cur.said.push(c.text);
    turns.push({ at: clock, id: it.id, q: it.kind === 'ex' ? it.ex.q : it.q, ok: !!c.ok });
    if (it.kind === 'ex' && it.ex.kind !== 'listen') { for (const p of panelParts(c.text)) { const l = { who: 'P', en: p, ja: '' }; cur.lines.push(l); log.push({ ...l, item: it.id, at: clock }); } events.push({ type: 'own', en: c.text }); }
    else if (it.kind === 'op' && /^com:/.test(it.id)) { if (c.ok) com = c.text.split('（')[0]; }
    if (it.id === 'atis' && c.ok) alt = c.text;
    // (a call left short: the words of the right one it does not have)
    if (!c.ok && it.kind === 'ex' && cur.tries === 1) { const keys = keysOf(right.text, callSign), got = hearKeys(keys, c.text); cur.missing = got.missing.map(x => x.ja); }
    cur.last = { ok: c.ok, why: c.ok ? '' : c.why, en: c.text };
    if (c.ok) { cur.phase = 'reply'; cur.queue = (it.kind === 'ex' ? it.ex.reply || [] : []).slice(); cur.t = 0.5; }
    else {
      cur.phase = 'negative';
      cur.queue = it.kind === 'ex' && c.negative ? [{ who: it.ex.station, en: c.negative, ja: '（訂正）' }] : [];
      cur.t = 0.4; cur.timeLeft = timeOf(it);
    }
    return { ...cur.last };
  }
  // なぜ？ — the reason for the current turn (the right choice's note; said only when asked, or after a wrong answer).
  // At stages 2 and 3 not before the first answer: the note would give the answer away, and the score is the first try's
  function why() {
    if (!cur) return '';
    cur.why = true;
    if (stage >= 2 && cur.phase === 'choose' && cur.tries === 0) return '理由は、答えを選んだあとで言います。';
    const it = cur.it; return (it.kind === 'ex' ? it.ex.note : it.note) || '';
  }
  const rightIndex = () => (cur && cur.phase === 'choose' ? cur.order.findIndex(k => cur.cs[k].ok) : -1);
  function view() {
    if (!cur) return null;
    const it = cur.it;
    return {
      id: it.id, part: it.part, partJa: (script.parts[it.part] || {}).ja || '', sec: it.sec, n: i + 1, of: items.length, stage,
      station: station(it), freq: freqOf(it), kind: it.kind === 'ex' ? it.ex.kind : 'op', phase: cur.phase,
      lines: cur.lines.slice(-4), q: it.kind === 'ex' ? it.ex.q : it.q,
      choices: cur.phase === 'choose' ? cur.order.map((k, j) => ({ k: j, en: cur.cs[k].text })) : [],
      // (stage 1: the right one marked, the script in view)
      script: stage === 1 && cur.phase === 'choose' ? rightIndex() : -1,
      timeLeft: Math.max(0, cur.timeLeft), time: timeOf(it), clock: stage === 3,
      last: cur.last, why: cur.why ? why() : '', com, alt,
    };
  }
  function summary() {
    const n = out.length, first = out.filter(x => x.ok).length;
    return { stage, n, first, late: out.filter(x => x.late).length, wrong: out.reduce((a, x) => a + Math.max(0, x.tries - 1), 0), pct: n ? Math.round(100 * first / n) : 0,
      pass: stage >= 2 && n > 0 && Math.round(100 * first / n) >= PASS, items: out.slice(), missed: out.filter(x => !x.ok).map(x => x.id) };
  }
  next();
  return { update, answer, why, view, rightIndex, summary, log, turns, get done() { return done; }, get busy() { return !!cur; }, get clock() { return clock; }, items };
}

// a run driven to its end without a screen (the tests, the measure, the bot): pick(view) → the index (default: the
// right one), dt: the step; returns the runner and its transcript — every line heard, every turn, with its time
export function runChairFlight(script, { stage = 2, seed = 1, only = null, pick = null, dt = 0.25, maxT = 3600 } = {}) {
  const run = createChairFlight(script, { stage, seed, only });
  const turns = [];
  let t = 0, seen = new Set();
  for (; t < maxT && !run.done; t += dt) {
    const v = run.view();
    if (v && v.phase === 'choose' && !seen.has(`${v.id}:${v.last ? v.last.en : ''}:${turns.length}`)) {
      const k = pick ? pick(v, run) : run.rightIndex();
      if (k != null && k >= 0) { seen.add(`${v.id}:${v.last ? v.last.en : ''}:${turns.length}`); turns.push({ id: v.id, t, q: v.q, k }); run.answer(k); continue; }
    }
    run.update(dt);
  }
  return { run, turns, t, summary: run.summary() };
}

// a run's lines as the measure counts them (tools/measure-ch1.mjs, the brief's §7): each line heard — the transmission
// (LINE_S) and its Japanese read under it; each turn — its question read, a decision; each call the cadet made — said
// (LINE_S). readingSeconds: school.js's. In the order they came
export function chairLines(run, readingSeconds) {
  const out = [];
  for (const l of run.log) out.push({ at: l.at, k: 0, text: l.ja ? `${l.en} ${l.ja}` : l.en, t: l.who === 'P' ? LINE_S(l.en) : LINE_S(l.en) + (l.ja ? readingSeconds(l.ja) : 0), decision: false, who: l.who });
  for (const x of run.turns) out.push({ at: x.at, k: 1, text: x.q, t: readingSeconds(x.q), decision: true, who: 'Q' });
  // (at the same moment: the turn's question before the call it brings)
  return out.sort((a, b) => a.at - b.at || (a.who === 'P') - (b.who === 'P') || a.k - b.k);
}
