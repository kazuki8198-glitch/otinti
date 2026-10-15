// CADET — dialog/validate.js : checks dialogue data before it ships (node --test runs it on every conversation).
// Errors are what would break or confuse a conversation in the game (a dead end, a missing node, an undeclared flag,
// a textbook section that does not exist, a placeholder the context cannot fill); warnings are probably-unintended data
// (a declared flag nobody reads, a dialog that can never end, if-nodes that skip to each other in a ring). It never
// throws: broken data is reported, not crashed on.
import { END, CHOICES_MAX, MAX_HOPS, condKind, effectKind, fill, resolveTarget } from './engine.js';

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isFlagValue = (v) => typeof v === 'boolean' || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));
// a value for a message: strings as they are, anything else as JSON, cut short
const short = (v) => {
  let s; try { s = typeof v === 'string' ? v : String(JSON.stringify(v)); } catch (e) { s = String(v); }
  return s.length > 80 ? s.slice(0, 77) + '…' : s;
};
const NODE_KEYS = new Set(['speaker', 'text', 'if', 'else', 'effects', 'hook', 'next', 'choices', 'end']);
const CHOICE_KEYS = new Set(['text', 'next', 'if', 'effects']);
const LESSON_PATH = /(^|\.)(lesson\.id|lessonId)$/;                            // ctx conditions that name a lesson

export function validateDialogs(data, opts = {}) {
  const { sectionExists = () => true, lessonExists = () => true, sampleCtx = {} } = isObj(opts) ? opts : {};   // null options must not throw
  const errors = [], warnings = [];
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
  const ask = (fn, arg) => { try { return !!fn(arg); } catch (e) { return false; } };
  if (!isObj(data)) { err('data: not an object'); return { errors, warnings }; }
  const speakers = isObj(data.speakers) ? data.speakers : (err('data.speakers: missing'), {});
  const flagList = Array.isArray(data.flags) ? data.flags : (err('data.flags: missing (declare every flag)'), []);
  const hookList = Array.isArray(data.hooks) ? data.hooks : (err('data.hooks: missing (declare every hook)'), []);
  const dialogs = isObj(data.dialogs) ? data.dialogs : (err('data.dialogs: missing'), {});
  const names = (list) => new Set(list.filter(x => typeof x === 'string' && x));  // the others are reported just below
  const flags = names(flagList), hooks = names(hookList), read = new Set();
  for (const [what, list] of [['flag', flagList], ['hook', hookList]]) {
    const s = new Set();
    for (const x of list) {
      if (typeof x !== 'string' || !x) err(`data.${what}s: "${short(x)}" is not a name`);
      else if (x === '__proto__') err(`data.${what}s: "__proto__" is reserved (a save cannot keep it)`);
      else if (s.has(x)) warn(`data.${what}s: "${x}" declared twice`);
      s.add(x);
    }
  }
  for (const [id, sp] of Object.entries(speakers)) if (!isObj(sp) || typeof sp.name_ja !== 'string') warn(`speaker ${id}: no name_ja`);

  // ---- the parts of a node ----
  function text(t, at) {
    if (typeof t !== 'string' || !t.trim()) { err(`${at}: empty text`); return; }
    fill(t, sampleCtx, (p) => err(`${at}: placeholder {${p}} does not resolve in the sample context`));
    // what is left once every placeholder is taken out is shown as it is: a brace there is a mistyped placeholder
    if (/[{}]/.test(fill(t, null))) warn(`${at}: a brace that is not a {dotted.name} placeholder is shown as it is: "${short(t)}"`);
  }
  function flagName(f, at, how) {
    if (typeof f !== 'string' || !f) { err(`${at}: flag ${how} without a name`); return; }
    if (!flags.has(f)) err(`${at}: flag "${f}" is ${how} but not declared`);
  }
  function cond(c, at) {
    if (c === undefined) return;
    const k = condKind(c);
    if (!k) { err(`${at}: unknown condition ${short(c)}`); return; }
    switch (k) {
      case 'all': case 'any':
        if (!Array.isArray(c[k])) err(`${at}: ${k} needs a list`);
        else c[k].forEach((x, i) => cond(x, `${at} ${k}[${i}]`));
        break;
      case 'not': if (c.not === undefined) err(`${at}: not needs a condition`); else cond(c.not, `${at} not`); break;
      case 'flag':
        read.add(c.flag); flagName(c.flag, at, 'read');
        if (own(c, 'is') && !isFlagValue(c.is)) err(`${at}: flag "${short(c.flag)}" is compared with ${short(c.is)} (only true/false, a string or a number can match)`);
        break;
      case 'trust': {
        if (typeof c.trust !== 'string' || !c.trust) err(`${at}: trust condition without a who`);
        else if (!own(speakers, c.trust)) warn(`${at}: trust in "${c.trust}", who is not a speaker`);
        const n = ['gte', 'lt'].filter(x => own(c, x));
        if (!n.length || n.some(x => typeof c[x] !== 'number' || !Number.isFinite(c[x]))) err(`${at}: trust condition needs gte or lt as a number`);
        break;
      }
      case 'seen': {
        const s = typeof c.seen === 'string' ? c.seen : '', i = s.indexOf(':');
        const d = i > 0 && own(dialogs, s.slice(0, i)) ? dialogs[s.slice(0, i)] : null;
        if (!d || !isObj(d.nodes) || !own(d.nodes, s.slice(i + 1))) err(`${at}: seen "${short(c.seen)}" is not a 'dialog:node' that exists`);
        break;
      }
      case 'ctx':
        if (typeof c.ctx !== 'string' || !c.ctx) { err(`${at}: ctx condition without a path`); break; }
        if (!own(c, 'is') && !own(c, 'exists')) err(`${at}: ctx condition needs is or exists`);
        if (own(c, 'is') && c.is !== null && (typeof c.is === 'object' || typeof c.is === 'function')) err(`${at}: ctx "${c.ctx}" is compared with an object (never equal)`);
        if (own(c, 'is') && LESSON_PATH.test(c.ctx) && !ask(lessonExists, c.is)) err(`${at}: lesson "${short(c.is)}" does not exist`);
        break;
    }
  }
  function hook(name, arg, at) {
    if (typeof name !== 'string' || !name) { err(`${at}: hook without a name`); return; }
    if (!hooks.has(name)) err(`${at}: hook "${name}" is used but not declared`);
    if ((name === 'book' || name === 'board') && !(typeof arg === 'string' && ask(sectionExists, arg)))
      err(`${at}: ${name} hook: "${short(arg)}" is not a textbook section`);
  }
  function effects(list, at) {
    if (list === undefined) return;
    if (!Array.isArray(list)) { err(`${at}: effects must be a list`); return; }
    list.forEach((e, i) => {
      const w = `${at} effect ${i + 1}`;
      switch (effectKind(e)) {
        case 'set':
          flagName(e.set, w, 'set');
          if (e.to !== undefined && !isFlagValue(e.to)) err(`${w}: set "${short(e.set)}" to ${short(e.to)} (true/false, a string or a number: what a save keeps)`);
          break;
        case 'trust':
          if (typeof e.trust !== 'string' || !e.trust) err(`${w}: trust effect without a who`);
          else if (!own(speakers, e.trust)) warn(`${w}: trust in "${e.trust}", who is not a speaker`);
          if (typeof e.add !== 'number' || !Number.isFinite(e.add)) err(`${w}: trust effect needs add as a number`);
          break;
        case 'give': if (typeof e.give !== 'string' || !e.give) err(`${w}: give without an item`); break;
        case 'hook': hook(e.hook, e.arg, w); break;
        default: err(`${w}: unknown effect ${short(e)}`);
      }
    });
  }
  function target(did, t, at, what) {
    if (resolveTarget(data, did, t) === null) err(`${at}: ${what} "${short(t)}" does not exist (a node of ${did}, 'dialog:node' or 'end')`);
  }

  // ---- every node ----
  for (const [did, d] of Object.entries(dialogs)) {
    if (did.includes(':')) err(`dialog "${did}": ids must not contain ':' (it separates dialog and node)`);
    if (!isObj(d) || !isObj(d.nodes)) { err(`dialog ${did}: no nodes`); continue; }
    const s = resolveTarget(data, did, d.start);
    if (!s || s === END) err(`dialog ${did}: start "${short(d.start)}" is not a node`);
    for (const [nid, n] of Object.entries(d.nodes)) {
      const at = `${did}:${nid}`;
      try {
        if (nid === END) err(`${at}: "end" is reserved and cannot be a node id`);
        if (!isObj(n)) { err(`${at}: not an object`); continue; }
        for (const k of Object.keys(n)) if (!NODE_KEYS.has(k)) warn(`${at}: unknown field "${k}"`);
        if (n.speaker !== 'narrator' && !(typeof n.speaker === 'string' && own(speakers, n.speaker))) err(`${at}: unknown speaker "${short(n.speaker)}"`);
        text(n.text, at);
        cond(n.if, `${at} if`);
        effects(n.effects, at);
        if (n.hook !== undefined) { if (isObj(n.hook)) hook(n.hook.name, n.hook.arg, `${at} hook`); else err(`${at}: hook must be { name, arg }`); }
        if (n.end !== undefined && n.end !== true) err(`${at}: end must be true (or left out)`);
        const ways = (n.next !== undefined) + (n.choices !== undefined) + (n.end === true);
        if (ways === 0) err(`${at}: no way on (needs next, choices or end)`);
        if (ways > 1) err(`${at}: more than one way on (next, choices and end are exclusive)`);
        if (n.next !== undefined) target(did, n.next, at, 'next');
        if (n.else !== undefined) { target(did, n.else, at, 'else'); if (n.if === undefined) warn(`${at}: else without if is never used`); }
        if (n.if !== undefined && n.else === undefined && n.next === undefined) err(`${at}: an if node needs else or next (where to go when it is skipped)`);
        if (n.choices !== undefined) {
          if (!Array.isArray(n.choices)) { err(`${at}: choices must be a list`); continue; }
          if (n.choices.length === 0 || n.choices.length > CHOICES_MAX) err(`${at}: ${n.choices.length} choices (1–${CHOICES_MAX} can be shown)`);
          const texts = new Set();
          n.choices.forEach((ch, i) => {
            const w = `${at} choice ${i + 1}`;
            if (!isObj(ch)) { err(`${w}: not an object`); return; }
            for (const k of Object.keys(ch)) if (!CHOICE_KEYS.has(k)) warn(`${w}: unknown field "${k}"`);
            text(ch.text, w);
            if (typeof ch.text === 'string') { if (texts.has(ch.text)) err(`${at}: duplicate choice text "${ch.text}"`); texts.add(ch.text); }
            cond(ch.if, `${w} if`);
            effects(ch.effects, w);
            if (ch.next === undefined) err(`${w}: no next`); else target(did, ch.next, w, 'next');
          });
        }
      } catch (e) { err(`${at}: could not be checked (${e.message})`); }
    }
  }

  // ---- reachability: through next / else / choices / cross-dialog jumps, from every dialog's start ----
  const key = (p) => `${p.dialog}:${p.node}`;
  const nodeAt = (p) => dialogs[p.dialog].nodes[p.node];
  function outs(p) {
    const n = nodeAt(p), ts = [];
    if (!isObj(n)) return { to: [], ends: false };
    if (n.next !== undefined) ts.push(n.next);
    if (n.else !== undefined) ts.push(n.else);
    if (Array.isArray(n.choices)) for (const ch of n.choices) if (isObj(ch) && ch.next !== undefined) ts.push(ch.next);
    const r = ts.map(t => resolveTarget(data, p.dialog, t));
    return { to: r.filter(x => x && x !== END), ends: n.end === true || r.includes(END) };
  }
  function walk(starts) {
    const seen = new Map(), queue = [...starts];
    for (const p of starts) seen.set(key(p), p);
    let ends = false;
    while (queue.length) {
      const o = outs(queue.shift());
      ends = ends || o.ends;
      for (const q of o.to) if (!seen.has(key(q))) { seen.set(key(q), q); queue.push(q); }
    }
    return { seen, ends };
  }
  const starts = {};
  for (const [did, d] of Object.entries(dialogs)) {
    if (!isObj(d) || !isObj(d.nodes)) continue;
    const s = resolveTarget(data, did, d.start);
    if (s && s !== END) starts[did] = s;
  }
  const all = walk(Object.values(starts));
  for (const [did, d] of Object.entries(dialogs)) {
    if (!isObj(d) || !isObj(d.nodes)) continue;
    for (const nid of Object.keys(d.nodes)) if (!all.seen.has(`${did}:${nid}`)) err(`${did}:${nid}: cannot be reached from any dialog's start`);
    if (starts[did] && !walk([starts[did]]).ends) warn(`dialog ${did}: no end can be reached (every path loops forever)`);
  }
  // a ring of if-nodes whose skip ways (else, or else next) lead back into the ring: when their conditions are all false
  // at once the runner gives up after MAX_HOPS skips (a warning: the conditions may never be false together)
  const skipTo = (p) => {
    const n = nodeAt(p);
    if (!isObj(n) || n.if === undefined) return null;
    const q = resolveTarget(data, p.dialog, n.else !== undefined ? n.else : n.next);
    return q && q !== END ? q : null;
  };
  const done = new Set();
  for (const [did, d] of Object.entries(dialogs)) {
    if (!isObj(d) || !isObj(d.nodes)) continue;
    for (const nid of Object.keys(d.nodes)) {
      const path = [], on = new Map();
      for (let q = { dialog: did, node: nid }; q && !done.has(key(q)); q = skipTo(q)) {
        if (on.has(key(q))) {
          const ring = path.slice(on.get(key(q))).join(' → ');
          warn(`${key(q)}: if-nodes skip to each other in a ring (${ring}): all false at once stops the talk after ${MAX_HOPS} skips`);
          break;
        }
        on.set(key(q), path.length); path.push(key(q));
      }
      for (const k of path) done.add(k);
    }
  }
  for (const f of flags) if (!read.has(f)) warn(`flag "${f}" is declared but never read`);
  return { errors, warnings };
}
