// CADET — dialog/atc.js : a radio exchange with a controller, as PLAN 2.8 has it: what you hear, then three things you
// could say, against the clock; the right one gets the controller's reply, a wrong one his correction ("negative, …")
// and the choice again. Late (the clock ran out) is noted and the controller asks again.
// The data is content/dialog/atc.js. A sequence (the ground call, then the read-back of the taxi instruction) runs its
// exchanges one after the other. The choices are shown in a shuffled order (seeded: the same on every run).
// The runner is driven by update(dt) (it times the lines heard and the clock) and answer(i); view() is what the radio
// panel shows; the events (say: a line to speak, done: the sequence ended) go to the game.
// Pure logic: no DOM.
const LINE_S = (en) => 1.2 + String(en).split(/\s+/).length * 0.32;      // about the pace of a controller's speech

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// createAtc(radio, { seed }) → the runner; radio: dayRadio(...)
export function createAtc(radio, { seed = 11 } = {}) {
  const R = rng(seed);
  const results = [];                                   // { id, station, tries, ok (first time), late }
  const events = [];
  let seq = null;                                       // { id, list: [exchange…], i }
  let cur = null;                                       // { ex, phase: 'hear' | 'choose' | 'reply' | 'negative', lines (heard so far), queue, t, timeLeft, order, tries, late, last }
  const log = [];                                       // everything heard and said today: { who, en, ja }
  function resolve(id, arg) { const x = radio.exchanges[id]; return typeof x === 'function' ? x(arg) : x; }
  function start(seqId, arg) {
    const ids = radio.sequences[seqId];
    if (!ids) throw new Error(`atc: no sequence "${seqId}"`);
    seq = { id: seqId, list: ids.map(id => ({ id, ex: resolve(id, arg) })), i: -1 };
    nextExchange();
    return view();
  }
  function nextExchange() {
    seq.i++;
    const it = seq.list[seq.i];
    if (!it) { const id = seq.id; seq = null; cur = null; events.push({ type: 'done', seq: id }); return; }
    const ex = it.ex, order = ex.choices.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    cur = { id: it.id, ex, phase: 'hear', queue: (ex.hear || []).slice(), lines: [], t: 0, timeLeft: ex.time || 25, order, tries: 0, late: false, last: null, wrongWhy: '' };
    pump();
  }
  // the next line heard (or the choice when there is none left)
  function pump() {
    if (cur.queue.length) { const l = cur.queue.shift(); cur.lines.push(l); log.push(l); cur.t = LINE_S(l.en); events.push({ type: 'say', who: l.who, en: l.en }); return; }
    if (cur.phase === 'hear' || cur.phase === 'negative') { cur.phase = 'choose'; cur.t = 0; return; }
    if (cur.phase === 'reply') { results.push({ id: cur.id, station: cur.ex.station, tries: cur.tries, ok: cur.tries === 1 && !cur.late, late: cur.late }); nextExchange(); }
  }
  function update(dt) {
    events.length = 0;
    if (!cur) return events;
    if (cur.phase === 'choose') {
      cur.timeLeft -= dt;
      if (cur.timeLeft <= 0 && !cur.late) {
        // no answer in time: the controller calls again (noted as late)
        cur.late = true; cur.timeLeft = cur.ex.time || 25;
        const again = { who: cur.ex.station, en: `${radio.call.short}, LAB ${cur.ex.station === 'GND' ? 'Ground' : cur.ex.station === 'TWR' ? 'Tower' : 'ATIS'}, how do you hear?`, ja: '聞こえていますか？（応答がない）' };
        if (cur.ex.station !== 'ATIS') { cur.lines.push(again); log.push(again); events.push({ type: 'say', who: again.who, en: again.en }); }
      }
    } else if ((cur.t -= dt) <= 0) pump();
    return events;
  }
  // the player's choice (the index on screen) → { ok, why, en } | null
  function answer(k) {
    if (!cur || cur.phase !== 'choose') return null;
    const c = cur.ex.choices[cur.order[k]];
    if (!c) return null;
    cur.tries++;
    const said = { who: 'P', en: c.en, ja: '' };
    if (cur.ex.kind !== 'listen') { cur.lines.push(said); log.push(said); }
    cur.last = { ok: !!c.ok, why: c.ok ? cur.ex.note || '' : c.why || '', en: c.en };
    if (c.ok) { cur.phase = 'reply'; cur.queue = (cur.ex.reply || []).slice(); cur.t = 0.6; cur.wrongWhy = ''; }
    else {
      cur.phase = 'negative'; cur.wrongWhy = c.why || '';
      cur.queue = c.negative ? [{ who: cur.ex.station, en: c.negative, ja: '（訂正）' }] : [];
      cur.t = 0.5; cur.timeLeft = cur.ex.time || 25;
    }
    return { ...cur.last };
  }
  function view() {
    if (!cur) return null;
    const ex = cur.ex;
    return {
      seq: seq ? seq.id : '', id: cur.id, station: ex.station, freq: ex.freq, kind: ex.kind, phase: cur.phase,
      lines: cur.lines.slice(-4), q: ex.q,
      choices: cur.phase === 'choose' ? cur.order.map((i, k) => ({ k, en: ex.choices[i].en })) : [],
      timeLeft: Math.max(0, cur.timeLeft), time: ex.time || 25, last: cur.last, wrongWhy: cur.wrongWhy,
    };
  }
  // the right answer's index on screen (tests, the bot)
  const rightIndex = () => (cur && cur.phase === 'choose' ? cur.order.findIndex(i => cur.ex.choices[i].ok) : -1);
  // the summary for the debrief
  function summary() {
    const n = results.length, first = results.filter(r => r.ok).length, late = results.filter(r => r.late).length;
    return { n, first, late, wrong: results.reduce((a, r) => a + Math.max(0, r.tries - 1), 0), results: results.slice() };
  }
  return { start, update, answer, view, rightIndex, summary, results, log, get busy() { return !!cur; }, get seq() { return seq ? seq.id : ''; } };
}
