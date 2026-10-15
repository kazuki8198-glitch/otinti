// CADET — dialog/engine.js : runs the conversations (pure JS: no DOM, no three).
// The data is a graph of nodes per dialog (format: the M2 spec, checked by dialog/validate.js). The state — flags, trust,
// items, nodes seen — is plain JSON so core/save.js can keep it. A node whose `if` is false is skipped (its `else`, or
// else its `next`, is followed); a chain of skips is capped so bad data cannot hang the game.
export const SAVE_VERSION = 1;
export const TRUST_START = 50;
export const MAX_HOPS = 64;
export const END = 'end';
export const CHOICES_MAX = 12;

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const clampTrust = (t) => Math.min(100, Math.max(0, t));
const isFlagValue = (v) => typeof v === 'boolean' || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));

// the value at a dotted path ('lesson.title', 'lesson.brief.0'); undefined when a step is missing. Object.prototype's
// own members ('constructor', '__proto__', 'toString') never resolve, so a typo cannot print a function.
export function getPath(obj, path) {
  let v = obj;
  for (const k of String(path).split('.')) {
    if (v === null || (typeof v !== 'object' && typeof v !== 'function')) return undefined;
    if (own(Object.prototype, k) && !own(v, k)) return undefined;
    v = v[k];
  }
  return v;
}

// '{lesson.title}' → the string, number or boolean at that path in ctx; anything else (missing, null, an object) → ''
// and onMissing(path). Braces that do not hold a dotted name are left alone.
const PLACEHOLDER = /\{([A-Za-z_$][\w$]*(?:\.[\w$]+)*)\}/g;
export function fill(text, ctx, onMissing) {
  return String(text ?? '').replace(PLACEHOLDER, (m, path) => {
    const v = getPath(ctx, path);
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (onMissing) onMissing(path);
    return '';
  });
}

// ---- state ----

// a saved state can be used when it has this version and the parts it has are of the right kind
export function isDialogState(o) {
  return isObj(o) && o.v === SAVE_VERSION && (o.flags === undefined || isObj(o.flags)) && (o.trust === undefined || isObj(o.trust)) &&
    (o.items === undefined || Array.isArray(o.items)) && (o.seen === undefined || isObj(o.seen));
}
// a fresh state, or a cleaned copy of a saved one (values of the wrong kind are dropped, trust is clamped)
export function createDialogState(saved = null) {
  const s = { v: SAVE_VERSION, flags: {}, trust: {}, items: [], seen: {} };
  if (!isDialogState(saved)) return s;
  const keys = (o) => Object.keys(o || {}).filter(k => k !== '__proto__');      // JSON.parse makes '__proto__' an own key
  for (const k of keys(saved.flags)) if (isFlagValue(saved.flags[k])) s.flags[k] = saved.flags[k];
  for (const k of keys(saved.trust)) { const t = saved.trust[k]; if (typeof t === 'number' && Number.isFinite(t)) s.trust[k] = clampTrust(t); }
  for (const it of saved.items || []) if (typeof it === 'string' && !s.items.includes(it)) s.items.push(it);
  for (const k of keys(saved.seen)) if (saved.seen[k]) s.seen[k] = true;
  return s;
}
export function trustOf(state, who) {
  const t = state && state.trust ? state.trust[who] : undefined;
  return typeof t === 'number' && Number.isFinite(t) ? t : TRUST_START;
}

// ---- conditions and effects ----

const COND_KINDS = ['all', 'any', 'not', 'flag', 'trust', 'seen', 'ctx'];
const EFFECT_KINDS = ['set', 'trust', 'give', 'hook'];
// the kind of a condition / an effect: exactly one of the kind keys, else null (the validator reports it)
export function condKind(c) { if (!isObj(c)) return null; const k = COND_KINDS.filter(x => own(c, x)); return k.length === 1 ? k[0] : null; }
export function effectKind(e) { if (!isObj(e)) return null; const k = EFFECT_KINDS.filter(x => own(e, x)); return k.length === 1 ? k[0] : null; }

export function evalCond(cond, state, ctx) {
  if (cond === undefined || cond === null) return true;
  const c = cond;
  switch (condKind(c)) {
    case 'all': if (Array.isArray(c.all)) return c.all.every(x => evalCond(x, state, ctx)); break;
    case 'any': if (Array.isArray(c.any)) return c.any.some(x => evalCond(x, state, ctx)); break;
    case 'not': if (c.not !== undefined) return !evalCond(c.not, state, ctx); break;
    case 'flag': {
      // own keys only: 'constructor' / 'toString' must not read Object.prototype's functions as a set flag
      const v = state && state.flags && own(state.flags, c.flag) ? state.flags[c.flag] : undefined;
      return own(c, 'is') ? (v ?? false) === c.is : !!v;                      // a flag never set reads as false
    }
    case 'trust': {
      if (!own(c, 'gte') && !own(c, 'lt')) break;
      const t = trustOf(state, c.trust);
      return (!own(c, 'gte') || t >= c.gte) && (!own(c, 'lt') || t < c.lt);   // both given: a range
    }
    case 'seen': return !!(state && state.seen && own(state.seen, c.seen) && state.seen[c.seen]);
    case 'ctx': {
      const v = getPath(ctx, c.ctx);
      if (own(c, 'exists')) return (v !== undefined && v !== null) === !!c.exists;
      if (own(c, 'is')) return v === c.is;
      break;
    }
  }
  throw new Error(`dialog: unknown condition ${JSON.stringify(cond)}`);
}

function callHook(hooks, name, arg) {
  if (!hooks || typeof hooks.onHook !== 'function') return;
  try { hooks.onHook(name, arg); } catch (e) { console.error(e); }            // a broken gesture must not stop the talk
}
export function applyEffects(effects, state, hooks = {}) {
  if (effects === undefined || effects === null) return state;
  for (const e of Array.isArray(effects) ? effects : [effects]) {
    switch (effectKind(e)) {
      case 'set': {
        // only what the save keeps (createDialogState drops other values and '__proto__'), so a reload changes nothing
        const to = e.to === undefined ? true : e.to;
        if (typeof e.set !== 'string' || !e.set || e.set === '__proto__' || !isFlagValue(to)) throw new Error(`dialog: bad set effect: ${JSON.stringify(e)}`);
        state.flags[e.set] = to; break;
      }
      case 'trust':
        if (typeof e.add !== 'number' || !Number.isFinite(e.add)) throw new Error(`dialog: trust effect without a number: ${JSON.stringify(e)}`);
        state.trust[e.trust] = clampTrust(trustOf(state, e.trust) + e.add); break;
      case 'give':
        if (typeof e.give !== 'string' || !e.give) throw new Error(`dialog: give without an item name: ${JSON.stringify(e)}`);
        if (!state.items.includes(e.give)) state.items.push(e.give);
        break;
      case 'hook': callHook(hooks, e.hook, e.arg); break;
      default: throw new Error(`dialog: unknown effect ${JSON.stringify(e)}`);
    }
  }
  return state;
}

// ---- targets ----

// where a `next` / `else` / choice target leads from dialog `dialogId`: END, a node of the same dialog, or another dialog's
// node as 'dialog:node'. A node of the same dialog wins, and the split is at the first colon, so node ids may hold colons
// ('sec:aero.lift' inside 'ask'; 'ask:sec:aero.lift' from elsewhere). → END | { dialog, node } | null (no such node).
export function resolveTarget(data, dialogId, target) {
  if (target === END) return END;
  if (typeof target !== 'string' || !target || !data || !isObj(data.dialogs)) return null;
  const d = own(data.dialogs, dialogId) ? data.dialogs[dialogId] : null;
  if (d && isObj(d.nodes) && own(d.nodes, target)) return { dialog: dialogId, node: target };
  const i = target.indexOf(':');
  if (i > 0) {
    const dd = target.slice(0, i), n = target.slice(i + 1), o = own(data.dialogs, dd) ? data.dialogs[dd] : null;
    if (o && isObj(o.nodes) && own(o.nodes, n)) return { dialog: dd, node: n };
  }
  return null;
}

// ---- the runner ----

// ctx may also be a function returning the context (read each time it is needed).
export function createRunner({ data, state, ctx = {}, hooks = {} } = {}) {
  if (!data || !isObj(data.dialogs)) throw new Error('dialog: createRunner needs data with dialogs');
  // the caller's state object itself (it saves it), with any missing part added so effects cannot fail on it
  const st = isObj(state) ? state : createDialogState();
  for (const k of ['flags', 'trust', 'seen']) if (!isObj(st[k])) st[k] = {};
  if (!Array.isArray(st.items)) st.items = [];
  if (st.v === undefined) st.v = SAVE_VERSION;
  const getCtx = typeof ctx === 'function' ? ctx : () => ctx;
  const fns = new Set();
  let cur = null;                                                              // { dialog, node } shown now, or null
  const nodeOf = (p) => data.dialogs[p.dialog].nodes[p.node];
  const visible = (n) => (Array.isArray(n.choices) ? n.choices.filter(ch => evalCond(ch.if, st, getCtx())) : []);

  // from `target` (seen from dialog `from`), skip the nodes whose `if` is false → the node to show, or END
  function settle(from, target, why) {
    let p = resolveTarget(data, from, target);
    for (let hops = 0; ; ) {
      if (p === END) return END;
      if (!p) throw new Error(`dialog: ${why} leads to "${target}", which does not exist`);
      const n = nodeOf(p);
      if (evalCond(n.if, st, getCtx())) return p;
      if (++hops > MAX_HOPS) throw new Error(`dialog: more than ${MAX_HOPS} skipped nodes in a row near ${p.dialog}:${p.node} (a loop of if → next?)`);
      const t = n.else !== undefined ? n.else : n.next;
      if (t === undefined) throw new Error(`dialog: ${p.dialog}:${p.node} is skipped but has neither else nor next`);
      why = `${p.dialog}:${p.node}`; target = t; p = resolveTarget(data, p.dialog, t);
    }
  }
  function emit() {
    const v = view();
    for (const f of [...fns]) { try { f(v); } catch (e) { console.error(e); } }
  }
  function show(p) {
    cur = p;
    const n = nodeOf(p);
    st.seen[`${p.dialog}:${p.node}`] = true;
    applyEffects(n.effects, st, hooks);
    if (isObj(n.hook)) callHook(hooks, n.hook.name, n.hook.arg);
  }
  function finish() { const was = !!cur; cur = null; if (was) emit(); }
  // a step that fails (bad data, also in the view of the new node) ends the conversation, so the game is not left stuck
  // in it, then reports the error
  function step(fn) {
    try { fn(); emit(); } catch (e) { cur = null; emit(); throw e; }
  }
  function go(from, target, why) { const p = settle(from, target, why); if (p === END) cur = null; else show(p); }

  function view() {
    if (!cur) return null;
    const n = nodeOf(cur), c = getCtx();
    const sp = isObj(data.speakers) && own(data.speakers, n.speaker) ? data.speakers[n.speaker] : null;
    const choices = visible(n).map((ch, i) => ({ i, text: fill(ch.text, c) }));
    // the conversation closes after this node: an end, a next that leads (past skipped nodes) to the end, or a choice
    // list whose choices are all hidden (next() closes it rather than leaving the player stuck)
    let ends = true;
    if (Array.isArray(n.choices)) ends = choices.length === 0;
    else if (n.end !== true && n.next !== undefined) { try { ends = settle(cur.dialog, n.next, '') === END; } catch (e) { ends = false; } }
    return { dialog: cur.dialog, node: cur.node, speaker: n.speaker, name: sp ? sp.name_ja ?? '' : '', color: sp ? sp.color ?? null : null,
      text: fill(n.text, c), choices, ends };
  }

  const runner = {
    get running() { return !!cur; },
    get state() { return st; },
    view,
    // begins `dialogId` at `nodeId` (default: its start); → false when every node on the way was skipped to the end
    start(dialogId, nodeId) {
      if (!own(data.dialogs, dialogId)) throw new Error(`dialog: unknown dialog "${dialogId}"`);
      let p;
      // a start that fails also closes a conversation that was running (like a failed step)
      try { p = settle(dialogId, nodeId ?? data.dialogs[dialogId].start, `the start of ${dialogId}`); } catch (e) { finish(); throw e; }
      if (p === END) { finish(); return false; }
      step(() => show(p));
      return true;
    },
    // advances a node without choices; at the end the conversation closes (running = false, onChange(null))
    next() {
      if (!cur) return false;
      const n = nodeOf(cur), at = `${cur.dialog}:${cur.node}`;
      if (visible(n).length) return false;                                    // waiting for a choice
      if (n.end === true || n.next === undefined) { finish(); return true; }
      step(() => go(cur.dialog, n.next, at));
      return true;
    },
    // i: index into view().choices (the visible ones)
    choose(i) {
      if (!cur) return false;
      const vis = visible(nodeOf(cur));
      if (!Number.isInteger(i) || i < 0 || i >= vis.length) return false;
      const ch = vis[i], from = cur.dialog, at = `${cur.dialog}:${cur.node} (choice ${i + 1})`;
      step(() => { applyEffects(ch.effects, st, hooks); go(from, ch.next, at); });
      return true;
    },
    stop() { finish(); },
    onChange(fn) { fns.add(fn); return () => fns.delete(fn); },
  };
  return runner;
}
